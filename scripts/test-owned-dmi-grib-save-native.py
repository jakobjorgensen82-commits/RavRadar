"""Native Linux test of the fixed action -> Python cohort -> API worker.

The original process cases use an explicitly synthetic @actions/cache package.
The additional SDK cases use the installed, locked official 6.1.0 distribution
unchanged: only its HTTP service is a test-owned loopback protocol fixture.
Product sources and the claim module are copied byte-for-byte into an own
temporary checkout. There is no hosted cache or real credential. Only the
terminal lease cases preload a delay in the actual claim file operation in a
separate fixture-owned systemd service. The staged SDK cases use the actual
action and its systemd controller. CI must supply an actual Node24 executable with
--node24-path; missing Linux/Node24/tools is failure, never a passing skip.
The distribution cases run the actual runtime npm against only the fixed own
offline cache; a missing warm cache is a prerequisite failure, never a skip.
The owner-SIGKILL case covers action-process loss only, not runner destruction.
The staged cipher case proves local sealing, SDK transport and normal restore.
None proves hosted durability, full runner loss or all-writer exclusion.
"""
from __future__ import annotations

import argparse
import ctypes
import errno
import json
import os
from pathlib import Path
import re
import select
import shutil
import signal
import stat
import subprocess
import sys
import tempfile
import time
import unittest
from unittest import mock


ROOT = Path(__file__).resolve().parents[1]
ENTRY = Path('.github/actions/save-owned-dmi-grib/index.cjs')
COHORT = Path('scripts/run-owned-dmi-grib-save.py')
CONTROLLER = Path('scripts/run-ordinary-provider-cgroup.py')
CLAIM_MODULE = Path('scripts/lib/weather-acquisition-writer.mjs')
CLAIM = Path('.cache/weather-acquisition-writer.claim')
NODE24 = None
BODY_SECONDS = 8.0  # Own fixture observer, not a new product deadline.
CLEANUP_SECONDS = 3.0
TERMINAL_NEAR_EXPIRY_MS = 25_000
TERMINAL_SDK_OBSERVER_SECONDS = 30.0
# Leave 12 seconds after simulated elapsed work so the normal seal and SDK
# upload can reach the held lease on a slow runner. The file wait lasts 15 s.
TERMINAL_LEASE_FIXTURE_ELAPSED_MS = 228_000
TERMINAL_LEASE_FIXTURE_OBSERVER_SECONDS = 14.0

TERMINAL_LEASE_WAIT = r'''
const fs = require('node:fs');
const promises = require('node:fs/promises');
if (process.argv.length !== 3 || process.argv[1] !== fixture.entry
    || process.argv[2] !== '--managed-terminal-upload' || process.cwd() !== fixture.root) {
  throw new Error('OWN_TERMINAL_LEASE_FIXTURE_SCOPE');
}
// The actual Python cohort and Node SDK worker never load this fixture.
delete process.env.NODE_OPTIONS;
// The stage initially validates real BOOTTIME. Advance only the action
// observer once its real file operation is held. The SDK uses the real clock.
const read = fs.readFileSync;
let held = false;
fs.readFileSync = (file, ...args) => {
  const value = read(file, ...args);
  if (!held || file !== '/proc/uptime' || args[0] !== 'ascii') return value;
  return value.replace(/^[0-9]+/, seconds => String(Number(seconds) + fixture.elapsedSeconds));
};
async function waitForFixture() {
  held = true;
  fs.writeFileSync(fixture.marker, 'waiting\n', { flag: 'wx' });
  await new Promise(resolve => setTimeout(resolve, 15_000));
  fs.appendFileSync(fixture.marker, 'continued\n');
}
if (fixture.mode === 'acquire') {
  const open = promises.open;
  promises.open = async (file, ...args) => {
    const handle = await open(file, ...args);
    if (file === fixture.claim) await waitForFixture();
    return handle;
  };
} else {
  const unlink = promises.unlink;
  promises.unlink = async file => {
    if (file === fixture.claim && fixture.mode === 'release') await waitForFixture();
    await unlink(file);
    if (file === fixture.claim && fixture.mode === 'after-unlink') await waitForFixture();
  };
}
'''

SYNTHETIC_CACHE = r'''
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const root = process.cwd();
function identity(pid) {
  const fields = fs.readFileSync(`/proc/${pid}/stat`, 'utf8').split(')').pop().trim().split(/\s+/);
  return {pid, ppid: Number(fields[1]), pgid: Number(fields[2]), sid: Number(fields[3]), start: fields[19]};
}
function publish(name, value) {
  fs.writeFileSync(path.join(root, name + '.new'), JSON.stringify(value));
  fs.renameSync(path.join(root, name + '.new'), path.join(root, name));
}
export function isFeatureAvailable() { return true; } // SYNTHETIC, never official.
export async function saveCache(paths, key, options, crossOS) {
  if (JSON.stringify(paths) !== '[".cache/dmi-grib"]'
      || key !== 'dmi-grib-v4-Linux-2026-W41-17-1'
      || options !== undefined || crossOS !== false
      || fs.readFileSync(path.join(root, '.cache/dmi-grib/own.grib'), 'utf8') !== 'synthetic raw original\n'
      || fs.readFileSync(path.join(root, '.cache/weather-acquisition-writer.claim')).length !== 0) {
    throw new Error('SYNTHETIC_FIXED_INPUT_MISMATCH');
  }
  fs.appendFileSync(path.join(root, 'synthetic-api-call'), '.');
  const ipc = fs.fstatSync(3);
  if (!ipc.isFIFO() && !ipc.isSocket()) throw new Error('SYNTHETIC_REAL_IPC_REQUIRED');
  if (fs.existsSync(path.join(root, 'with-descendant'))) {
    spawn(process.execPath, [fileURLToPath(new URL('./descendant.cjs', import.meta.url))],
      {cwd: root, env: process.env, stdio: 'ignore'}); // Same actual worker group.
  }
  publish('worker-ready', {worker: identity(process.pid), cohort: identity(process.ppid)});
  const deadline = Date.now() + 15000; // Later than every measured test assertion.
  while (!fs.existsSync(path.join(root, 'finish-api'))) {
    if (Date.now() >= deadline) throw new Error('SYNTHETIC_FIXTURE_EXPIRED');
    await new Promise(resolve => setTimeout(resolve, 10));
  }
  return 17; // Synthetic typed ID; not evidence of any hosted finalization.
}
'''

SYNTHETIC_DESCENDANT = r'''
const fs = require('node:fs');
process.on('SIGTERM', () => {});
const fields = fs.readFileSync('/proc/self/stat', 'utf8').split(')').pop().trim().split(/\s+/);
const identity = {pid: process.pid, ppid: process.ppid, pgid: Number(fields[2]),
  sid: Number(fields[3]), start: fields[19]};
fs.writeFileSync('descendant-ready.new', JSON.stringify(identity));
fs.renameSync('descendant-ready.new', 'descendant-ready');
const timer = setInterval(() => fs.appendFileSync('descendant-heartbeat', '.'), 10);
setTimeout(() => { clearInterval(timer); process.exitCode = 2; }, 15000);
'''


def small(path):
    with Path(path).open('rb') as handle:
        data = handle.read(4097)
    if len(data) > 4096:
        raise RuntimeError('OWN_OBSERVATION_BOUND')
    return data


def identity(pid):
    fields = small(f'/proc/{pid}/stat').decode('ascii').rsplit(')', 1)[1].split()
    return {'pid': pid, 'ppid': int(fields[1]), 'pgid': int(fields[2]),
            'sid': int(fields[3]), 'start': fields[19]}


def exited(fd, seconds=0):
    poll = select.poll()
    poll.register(fd, select.POLLIN)
    events = poll.poll(max(0, int(seconds * 1000)))
    if not events:
        return False
    if any(number != fd or flags & (select.POLLERR | select.POLLNVAL)
           or not flags & select.POLLIN for number, flags in events):
        raise RuntimeError('OWN_PIDFD_EXIT_UNPROVED')
    return True


def require_action_exit_after_proc_race(fd, error, remaining):
    # An inaccessible/disappearing /proc tree is not itself exit evidence.
    # Wait on the already retained kernel object within the existing observer
    # alarm only; a live/unknown process must still fail this test.
    if error.errno not in (errno.ENOENT, errno.ESRCH, errno.EACCES, errno.EPERM):
        raise error
    if remaining <= 0 or not exited(fd, remaining):
        raise error


def fixed_npm_observation_title(command, node24):
    # Recognition only: argv0 is never sufficient for the stopped npm proof.
    return command in (os.fsencode(node24), b'npm', b'npm ci')


def fixed_npm_observation_cmdline(command, node24, npm_cli):
    startup = [os.fsencode(node24), os.fsencode(npm_cli), b'ci',
               b'--ignore-scripts', b'--no-audit', b'--no-fund']
    if command == b'\0'.join(startup) + b'\0':
        return True
    # libuv copies the new title before clearing the old argv tail. A read
    # between those writes is not a completed npm title. Nor does argv0 alone
    # distinguish the worker's pre-exec child from the actual fixed npm CLI.
    title = command.split(b'\0', 1)[0]
    return (command.endswith(b'\0') and title in (b'npm', b'npm ci')
            and not command[len(title):].strip(b'\0'))


def stop_fixed_npm_observation(pid, fd, node24, npm_cli, expected_identity):
    # The caller's existing SIGALRM remains the sole observer deadline. This
    # loop neither restarts the action nor changes npm, its inputs or budget.
    def require_same_runtime():
        if exited(fd) or identity(pid) != expected_identity:
            raise RuntimeError('OWN_NPM_PROCESS_CHANGED_OR_EXITED')
        if Path(os.readlink(f'/proc/{pid}/exe')).resolve() != node24:
            raise RuntimeError('OWN_NPM_EXECUTABLE_CHANGED')
        if exited(fd):
            raise RuntimeError('OWN_NPM_PROCESS_EXITED_DURING_OBSERVATION')

    while True:
        require_same_runtime()
        if not fixed_npm_observation_cmdline(small(f'/proc/{pid}/cmdline'), node24, npm_cli):
            time.sleep(0.001)
            continue
        signal.pidfd_send_signal(fd, signal.SIGSTOP)
        while True:
            require_same_runtime()
            if small(f'/proc/{pid}/stat').decode('ascii').rsplit(')', 1)[1].split()[0] == 'T':
                break
            time.sleep(0.001)
        first = small(f'/proc/{pid}/cmdline')
        second = small(f'/proc/{pid}/cmdline')
        require_same_runtime()
        if first == second and fixed_npm_observation_cmdline(first, node24, npm_cli):
            return
        # A title write may have started after the first read. Resume only
        # this retained, unchanged kernel object; incomplete/foreign titles
        # never qualify, and a persistent refusal reaches the original alarm.
        signal.pidfd_send_signal(fd, signal.SIGCONT)
        time.sleep(0.001)


class OwnedProcExitObservation(unittest.TestCase):
    def test_fixed_npm_title_accepts_only_runtime_and_both_actual_cli_phases(self):
        node24 = Path('/own/runtime/bin/node')
        for command in (os.fsencode(node24), b'npm', b'npm ci'):
            with self.subTest(command=command):
                self.assertTrue(fixed_npm_observation_title(command, node24))
        for command in (b'', b'node', b'npm install', b'npm ci extra',
                        b'npm-foreign', b'/foreign/bin/node'):
            with self.subTest(command=command):
                self.assertFalse(fixed_npm_observation_title(command, node24))

    def test_fixed_npm_cmdline_requires_exact_cli_or_completed_actual_title(self):
        node24 = Path('/own/runtime/bin/node')
        npm_cli = Path('/own/runtime/lib/node_modules/npm/bin/npm-cli.js')
        startup = b'\0'.join([os.fsencode(node24), os.fsencode(npm_cli), b'ci',
                              b'--ignore-scripts', b'--no-audit', b'--no-fund']) + b'\0'
        for command in (startup, b'npm\0', b'npm\0\0', b'npm ci\0', b'npm ci\0\0'):
            with self.subTest(command=command):
                self.assertTrue(fixed_npm_observation_cmdline(command, node24, npm_cli))
        for command in (b'', b'node', b'npm install', b'npm ci extra',
                        b'npm-foreign', b'/foreign/bin/node', os.fsencode(node24), b'npm', b'npm ci',
                        b'nnpm/old-argv-tail\0', b'npm\0old-argv-tail\0',
                        startup.replace(b'ci\0', b'install\0'),
                        startup.replace(os.fsencode(npm_cli), b'/foreign/npm-cli.js'),
                        os.fsencode(node24) + b'\0/own/worker.cjs\0--fixed-distribution-worker\0'):
            with self.subTest(command=command):
                self.assertFalse(fixed_npm_observation_cmdline(command, node24, npm_cli))

    def test_fixed_npm_observation_rechecks_stopped_title_on_same_kernel_object(self):
        node24 = Path('/own/runtime/bin/node').resolve()
        npm_cli = Path('/own/runtime/lib/node_modules/npm/bin/npm-cli.js')
        expected = {'pid': 29, 'ppid': 23, 'pgid': 23, 'sid': 23, 'start': '17'}
        commands = iter((b'npm/old-argv-tail\0', b'npm\0', b'npm/old-argv-tail\0', b'npm\0',
                         b'npm ci\0', b'npm ci\0', b'npm ci\0'))

        def observe(path):
            if path == '/proc/29/cmdline':
                return next(commands)
            self.assertEqual(path, '/proc/29/stat')
            return b'29 (own) T 23 23 23\n'

        with mock.patch.multiple(signal, SIGSTOP=19, SIGCONT=18, create=True), \
                mock.patch(__name__ + '.small', side_effect=observe), \
                mock.patch(__name__ + '.exited', return_value=False) as physical, \
                mock.patch(__name__ + '.identity', return_value=expected) as identities, \
                mock.patch(__name__ + '.os.readlink', return_value=str(node24)) as executable, \
                mock.patch(__name__ + '.signal.pidfd_send_signal', create=True) as signals, \
                mock.patch(__name__ + '.time.sleep') as sleeps:
            stop_fixed_npm_observation(29, 17, node24, npm_cli, expected)
            self.assertEqual(signals.call_args_list, [mock.call(17, signal.SIGSTOP),
                             mock.call(17, signal.SIGCONT), mock.call(17, signal.SIGSTOP)])
            self.assertEqual(sleeps.call_args_list, [mock.call(0.001), mock.call(0.001)])
            self.assertEqual(physical.call_args_list, [mock.call(17)] * 14)
            self.assertEqual(identities.call_args_list, [mock.call(29)] * 7)
            self.assertEqual(executable.call_args_list, [mock.call('/proc/29/exe')] * 7)

    def test_fixed_npm_observation_never_stops_unknown_title_or_restarts_deadline(self):
        node24 = Path('/own/runtime/bin/node').resolve()
        expected = {'pid': 29, 'ppid': 23, 'pgid': 23, 'sid': 23, 'start': '17'}
        with mock.patch(__name__ + '.small', return_value=b'npm install\0'), \
                mock.patch(__name__ + '.exited', return_value=False), \
                mock.patch(__name__ + '.identity', return_value=expected), \
                mock.patch(__name__ + '.os.readlink', return_value=str(node24)), \
                mock.patch(__name__ + '.signal.pidfd_send_signal', create=True) as signals, \
                mock.patch(__name__ + '.signal.setitimer', create=True) as timer, \
                mock.patch(__name__ + '.time.sleep', side_effect=TimeoutError('own alarm')):
            with self.assertRaisesRegex(TimeoutError, 'own alarm'):
                stop_fixed_npm_observation(29, 17, node24, Path('/own/npm-cli.js'), expected)
            signals.assert_not_called()
            timer.assert_not_called()

    def test_fixed_npm_observation_refuses_exit_identity_or_executable_change(self):
        node24 = Path('/own/runtime/bin/node').resolve()
        expected = {'pid': 29, 'ppid': 23, 'pgid': 23, 'sid': 23, 'start': '17'}
        changed = {**expected, 'start': '18'}
        foreign = str(Path('/foreign/bin/node').resolve())
        for physical, identities, runtimes, stops in (
                ([True], [expected], [str(node24)], 0),
                ([False], [changed], [str(node24)], 0),
                ([False], [expected], [foreign], 0),
                ([False, False, True], [expected], [str(node24)], 1),
                ([False, False, False], [expected, changed], [str(node24)], 1),
                ([False, False, False], [expected, expected], [str(node24), foreign], 1)):
            with self.subTest(physical=physical, identities=identities, runtimes=runtimes), \
                    mock.patch.multiple(signal, SIGSTOP=19, SIGCONT=18, create=True), \
                    mock.patch(__name__ + '.small', return_value=b'npm\0'), \
                    mock.patch(__name__ + '.exited', side_effect=physical), \
                    mock.patch(__name__ + '.identity', side_effect=identities), \
                    mock.patch(__name__ + '.os.readlink', side_effect=runtimes), \
                    mock.patch(__name__ + '.signal.pidfd_send_signal', create=True) as signals:
                with self.assertRaises(RuntimeError):
                    stop_fixed_npm_observation(29, 17, node24, Path('/own/npm-cli.js'), expected)
                self.assertEqual(signals.call_args_list, [mock.call(17, signal.SIGSTOP)] * stops)

    def test_proc_exit_observation_requires_same_retained_pidfd_and_existing_budget(self):
        for code in (errno.ENOENT, errno.ESRCH, errno.EACCES, errno.EPERM):
            with self.subTest(code=code), mock.patch(
                    __name__ + '.exited', return_value=True) as physical:
                require_action_exit_after_proc_race(17, OSError(code, 'own proc race'), 0.125)
                physical.assert_called_once_with(17, 0.125)

    def test_proc_exit_observation_never_accepts_live_unknown_or_expired(self):
        for code, budget, physical_exit in (
                (errno.EACCES, 0.125, False), (errno.ENOENT, 0.125, False),
                (errno.EPERM, 0, True), (errno.EIO, 0.125, True)):
            error = OSError(code, 'own refusal')
            with self.subTest(code=code), mock.patch(
                    __name__ + '.exited', return_value=physical_exit) as physical:
                with self.assertRaises(OSError) as refused:
                    require_action_exit_after_proc_race(17, error, budget)
                self.assertIs(refused.exception, error)
                if code == errno.EIO or budget <= 0:
                    physical.assert_not_called()
                else:
                    physical.assert_called_once_with(17, budget)



def require_owned_npm_command(fd, expected, npm_cli):
    # npm 11.19.0 sets 'npm' in cli/entry.js before load, then 'npm ci'
    # in npm.js. process.title rewrites argv memory; it is not identity.
    pid = expected['pid']
    for phase in ('before', 'after'):
        retained = [int(line.split(':', 1)[1])
                    for line in small(f'/proc/self/fdinfo/{fd}').decode('ascii').splitlines()
                    if line.startswith('Pid:')]
        if retained != [pid] or exited(fd) or identity(pid) != expected:
            raise RuntimeError('OWN_NPM_IDENTITY_UNPROVED')
        if Path(os.readlink(f'/proc/{pid}/exe')).resolve() != NODE24:
            raise RuntimeError('OWN_NPM_EXECUTABLE_UNPROVED')
        if phase == 'before':
            command = small(f'/proc/{pid}/cmdline')
    original = b'\0'.join((os.fsencode(NODE24), os.fsencode(npm_cli), b'ci',
                            b'--ignore-scripts', b'--no-audit', b'--no-fund')) + b'\0'
    if (command != original
            and not (command.endswith(b'\0')
                     and command.rstrip(b'\0') in (b'npm', b'npm ci'))):
        raise RuntimeError('OWN_NPM_COMMAND_UNPROVED')


class OwnedNpmCommandObservation(unittest.TestCase):
    def test_fixed_command_and_documented_titles_require_same_owned_identity(self):
        node = Path(sys.executable).resolve()
        npm_cli = node.parent / 'npm/bin/npm-cli.js'
        expected = {'pid': 73, 'ppid': 72, 'pgid': 72, 'sid': 72, 'start': '71'}
        original = b'\0'.join((os.fsencode(node), os.fsencode(npm_cli), b'ci',
                               b'--ignore-scripts', b'--no-audit', b'--no-fund')) + b'\0'
        cases = [(original, None), (b'npm\0\0', None), (b'npm ci\0', None),
                 (b'npm install\0', 'command'), (b'npm\0extra\0', 'command'),
                 (b'npm', 'command'), (b'', 'command'),
                 (original.replace(b'ci\0', b'install\0'), 'command'),
                 (original.replace(b'npm-cli.js', b'other-cli.js'), 'command')]
        cases += [(b'npm\0', field) for field in
                  ('pidfd', 'exited', 'exe', *expected)]
        for command, failure in cases:
            changed = dict(expected)
            if failure in expected:
                changed[failure] = 'changed' if failure == 'start' else 99
            reads = lambda path: (command if path.endswith('/cmdline') else
                                  b'Pid:\t99\n' if failure == 'pidfd' else b'Pid:\t73\n')
            with self.subTest(failure=failure, command=command), \
                    mock.patch(__name__ + '.NODE24', node), \
                    mock.patch(__name__ + '.small', side_effect=reads), \
                    mock.patch(__name__ + '.exited', side_effect=[False, failure == 'exited']), \
                    mock.patch(__name__ + '.identity', side_effect=[expected, changed]), \
                    mock.patch(__name__ + '.os.readlink', return_value=str(
                        node.with_name('foreign-executable') if failure == 'exe' else node)):
                if failure:
                    with self.assertRaises(RuntimeError):
                        require_owned_npm_command(17, expected, npm_cli)
                else:
                    require_owned_npm_command(17, expected, npm_cli)


def retain_pidfd(pid):
    fd = os.pidfd_open(pid, 0)
    try:
        observed = [int(line.split(':', 1)[1])
                    for line in small(f'/proc/self/fdinfo/{fd}').decode('ascii').splitlines()
                    if line.startswith('Pid:')]
        if observed != [pid] or exited(fd):
            raise RuntimeError('OWN_PIDFD_IDENTITY_UNPROVED')
        return fd
    except BaseException:
        os.close(fd)
        raise


def no_children():
    try:
        os.waitid(os.P_ALL, 0, os.WEXITED | os.WNOHANG | os.WNOWAIT)
    except ChildProcessError:
        return
    raise RuntimeError('OWN_AMBIENT_OR_UNCLOSED_CHILD_REFUSED')


def runtime_environment():
    # Do not inherit NODE_OPTIONS, GITHUB_OUTPUT, cache URLs or runtime tokens.
    return {key: value for key, value in os.environ.items()
            if key in {'PATH', 'LD_LIBRARY_PATH', 'LIBRARY_PATH', 'LANG', 'LC_ALL', 'LC_CTYPE'}}


def fixture_control_environment():
    uid = os.geteuid()
    bus = Path(f'/run/user/{uid}/bus')
    info = bus.stat()
    if info.st_uid != uid or not stat.S_ISSOCK(info.st_mode):
        raise RuntimeError('OWN_SYSTEMD_USER_BUS_UNPROVED')
    return {'XDG_RUNTIME_DIR': str(bus.parent), 'PATH': '/usr/bin:/bin', 'LANG': 'C.UTF-8'}


class OwnedRawSaveNative(unittest.TestCase):
    def test_healthy_actual_action_cohort_and_claim_close_before_saved(self):
        self.actual_chain(interrupt=False)

    def test_interrupt_stops_term_ignoring_descendant_before_reap_and_never_saves(self):
        self.actual_chain(interrupt=True)

    def test_local_action_dot_script_spelling_uses_same_fixed_cohort_before_saved(self):
        self.actual_chain(interrupt=False, dot_script=True)

    def test_action_sigkill_stops_owned_group_without_releasing_claim(self):
        self.actual_chain(interrupt=False, owner_loss=True)

    def actual_chain(self, *, interrupt, dot_script=False, owner_loss=False):
        self.assertEqual(sys.platform, 'linux', 'NATIVE_LINUX_REQUIRED; not a skip')
        for name in ('pidfd_open', 'waitid', 'P_PIDFD', 'WNOWAIT'):
            self.assertTrue(hasattr(os, name), f'NATIVE_LINUX_REQUIRED:{name}')
        self.assertTrue(hasattr(signal, 'pidfd_send_signal'))
        self.assertEqual(signal.getsignal(signal.SIGCHLD), signal.SIG_DFL)
        no_children()
        libc = ctypes.CDLL(None, use_errno=True)
        libc.prctl.argtypes = [ctypes.c_int, ctypes.c_ulong, ctypes.c_ulong,
                              ctypes.c_ulong, ctypes.c_ulong]
        libc.prctl.restype = ctypes.c_int
        previous = ctypes.c_int()
        self.assertEqual(libc.prctl(37, ctypes.addressof(previous), 0, 0, 0), 0)
        self.assertEqual(libc.prctl(36, 1, 0, 0, 0), 0)

        temp_parent = Path(tempfile.gettempdir()).resolve()
        root = Path(tempfile.mkdtemp(prefix='rr-owned-raw-save-', dir=temp_parent)).resolve()
        parent = None
        fds = {}  # Only actual live, identified kernel handles, never signal JSON PIDs.
        logs = []
        old_alarm = signal.getsignal(signal.SIGALRM)

        def deadline(_number, _frame):
            raise TimeoutError('OWN_RAW_SAVE_OBSERVER_DEADLINE')

        def wait_until(predicate):
            while not predicate():
                self.assertFalse(exited(fds['action']), 'actual action exited before observation')
                time.sleep(0.01)  # Enclosed by the single test observer deadline.

        signal.signal(signal.SIGALRM, deadline)
        signal.setitimer(signal.ITIMER_REAL, BODY_SECONDS)
        try:
            for relative in (ENTRY, COHORT, CLAIM_MODULE, ENTRY.parent / 'package.json',
                             ENTRY.parent / 'package-lock.json'):
                source = (ROOT / relative).read_bytes()
                destination = root / relative
                destination.parent.mkdir(parents=True, exist_ok=True)
                destination.write_bytes(source)
                self.assertEqual(destination.read_bytes(), source, 'product fixture bytes changed')
            raw = root / '.cache/dmi-grib/own.grib'
            raw.parent.mkdir(parents=True)
            raw.write_bytes(b'synthetic raw original\n')
            package = root / ENTRY.parent / 'node_modules/@actions/cache'
            package.mkdir(parents=True)
            (package / 'package.json').write_text(json.dumps({'name': '@actions/cache',
                'version': '6.1.0', 'type': 'module', 'exports': {'import': './index.mjs'}}), encoding='utf-8')
            (package / 'index.mjs').write_text(SYNTHETIC_CACHE, encoding='utf-8')
            (package / 'descendant.cjs').write_text(SYNTHETIC_DESCENDANT, encoding='utf-8')
            if interrupt or owner_loss:
                (root / 'with-descendant').write_bytes(b'own synthetic descendant\n')
            output = root / 'action-output'
            output.write_bytes(b'')
            environment = runtime_environment()
            environment.update({'PYTHONDONTWRITEBYTECODE': '1', 'PYTHONNOUSERSITE': '1',
                'INPUT_PATH': '.cache/dmi-grib', 'INPUT_KEY': 'dmi-grib-v4-Linux-2026-W41-17-1',
                'GITHUB_REF': 'refs/heads/main', 'GITHUB_EVENT_NAME': 'workflow_dispatch',
                'GITHUB_RUN_ID': '17', 'GITHUB_RUN_ATTEMPT': '1', 'RUNNER_OS': 'Linux',
                'GITHUB_SERVER_URL': 'https://github.com', 'ACTIONS_CACHE_SERVICE_V2': '1',
                'GITHUB_OUTPUT': str(output)})
            for name in ('stdout', 'stderr'):
                logs.append((root / name).open('wb'))
            action_script = str(root) + '/./' + ENTRY.as_posix() if dot_script else str(root / ENTRY)
            parent = subprocess.Popen([str(NODE24), action_script], cwd=root, env=environment,
                stdin=subprocess.DEVNULL, stdout=logs[0], stderr=logs[1])
            fds['action'] = retain_pidfd(parent.pid)
            if dot_script:
                self.assertIn('/./', action_script)
                self.assertEqual(small(f'/proc/{parent.pid}/cmdline').split(b'\0')[:-1],
                                 [os.fsencode(NODE24), os.fsencode(action_script)])
            wait_until(lambda: (root / 'worker-ready').exists())
            ready = json.loads(small(root / 'worker-ready'))
            for role in ('cohort', 'worker'):
                announced = ready[role]
                self.assertIs(type(announced['pid']), int)
                self.assertGreater(announced['pid'], 1)
                fds[role] = retain_pidfd(announced['pid'])
                self.assertEqual(identity(announced['pid']), announced)
            worker, cohort = ready['worker'], ready['cohort']
            self.assertEqual(cohort['ppid'], parent.pid)
            self.assertEqual(worker['ppid'], cohort['pid'])
            self.assertEqual((worker['pgid'], worker['sid']), (worker['pid'], worker['pid']))
            self.assertNotEqual(cohort['pgid'], worker['pgid'])
            self.assertEqual(small(f"/proc/{worker['pid']}/cmdline").split(b'\0')[:-1],
                [os.fsencode(NODE24), os.fsencode(root / ENTRY), b'--fixed-api-worker'])
            self.assertEqual(small(f"/proc/{cohort['pid']}/cmdline").split(b'\0')[1:-1],
                [b'-B', os.fsencode(root / COHORT)])
            claim = root / CLAIM
            original_claim = claim.stat()
            self.assertEqual(small(claim), b'')
            self.assertEqual(small(output), b'')
            self.assertEqual(small(root / 'synthetic-api-call'), b'.')
            if owner_loss:
                wait_until(lambda: (root / 'descendant-ready').exists()
                           and (root / 'descendant-heartbeat').exists())
                descendant = json.loads(small(root / 'descendant-ready'))
                fds['descendant'] = retain_pidfd(descendant['pid'])
                self.assertEqual(identity(descendant['pid']), descendant)
                self.assertEqual(descendant['ppid'], worker['pid'])
                self.assertEqual((descendant['pgid'], descendant['sid']),
                                 (worker['pid'], worker['pid']))
                heartbeat = root / 'descendant-heartbeat'
                before_term = heartbeat.stat().st_size
                signal.pidfd_send_signal(fds['descendant'], signal.SIGTERM)
                wait_until(lambda: heartbeat.stat().st_size > before_term)
                self.assertFalse(exited(fds['descendant']), 'fixture did not actually ignore TERM')
                # Kill only the actual action. Product, not test cleanup, must
                # stop its worker/descendant after this owner-process loss.
                signal.pidfd_send_signal(fds['action'], signal.SIGKILL)
                self.assertEqual(parent.wait(timeout=1.0), -signal.SIGKILL)
                self.assertTrue(exited(fds['action']))
                self.assertTrue(exited(fds['descendant'], 1.0), 'product left descendant live')
                observed = None
                while observed is None:
                    try:
                        observed = os.waitid(os.P_PIDFD, fds['descendant'],
                            os.WEXITED | os.WNOHANG | os.WNOWAIT)
                    except ChildProcessError:
                        pass
                    if observed is None:
                        time.sleep(0.01)
                self.assertEqual(observed.si_pid, descendant['pid'])
                self.assertEqual(observed.si_code, os.CLD_KILLED)
                self.assertEqual(observed.si_status, signal.SIGKILL)
                stopped_bytes = heartbeat.stat().st_size
                time.sleep(0.05)
                self.assertEqual(heartbeat.stat().st_size, stopped_bytes)
                self.assertTrue(exited(fds['worker'], 1.0))
                self.assertFalse(exited(fds['cohort']), 'cohort exited while owned group still exists')
                self.assertEqual(small(output), b'', 'owner loss cannot publish SAVE')
                self.assertEqual((claim.stat().st_dev, claim.stat().st_ino),
                                 (original_claim.st_dev, original_claim.st_ino))
                self.assertEqual(small(claim), b'')
                os.killpg(worker['pid'], 0)
                reaped = os.waitid(os.P_PIDFD, fds['descendant'], os.WEXITED | os.WNOHANG)
                self.assertEqual(reaped.si_pid, descendant['pid'])
                self.assertTrue(exited(fds['cohort'], 1.0), 'cohort did not finish after group absence')
                terminal = os.waitid(os.P_PIDFD, fds['cohort'],
                    os.WEXITED | os.WNOHANG | os.WNOWAIT)
                self.assertEqual(terminal.si_pid, cohort['pid'])
                self.assertEqual(terminal.si_code, os.CLD_EXITED)
                self.assertNotEqual(terminal.si_status, 0, 'unknown owner cannot emit a successful closure')
                with self.assertRaises(ProcessLookupError):
                    os.killpg(worker['pid'], 0)
                self.assertEqual((claim.stat().st_dev, claim.stat().st_ino),
                                 (original_claim.st_dev, original_claim.st_ino))
                self.assertEqual(small(claim), b'', 'dead owner claim must not be adopted/released')
                self.assertEqual(small(output), b'')
                self.assertEqual(small(root / 'synthetic-api-call'), b'.')
                self.assertEqual(raw.read_bytes(), b'synthetic raw original\n')
                self.assertFalse((root / 'finish-api').exists())
                self.assertEqual(heartbeat.stat().st_size, stopped_bytes)
                return
            if interrupt:
                wait_until(lambda: (root / 'descendant-ready').exists()
                           and (root / 'descendant-heartbeat').exists())
                descendant = json.loads(small(root / 'descendant-ready'))
                fds['descendant'] = retain_pidfd(descendant['pid'])
                self.assertEqual(identity(descendant['pid']), descendant)
                self.assertEqual(descendant['ppid'], worker['pid'])
                self.assertEqual((descendant['pgid'], descendant['sid']),
                                 (worker['pid'], worker['pid']))
                heartbeat = root / 'descendant-heartbeat'
                before_term = heartbeat.stat().st_size
                signal.pidfd_send_signal(fds['descendant'], signal.SIGTERM)
                wait_until(lambda: heartbeat.stat().st_size > before_term)
                self.assertFalse(exited(fds['descendant']), 'fixture did not actually ignore TERM')
                signal.pidfd_send_signal(fds['action'], signal.SIGTERM)
                self.assertTrue(exited(fds['descendant'], 1.0), 'product left descendant live')
                # Product must stop it BEFORE any test kill/reap/cleanup. Keep
                # the adopted zombie so group existence cannot be called closed.
                observed = None
                while observed is None:
                    try:
                        observed = os.waitid(os.P_PIDFD, fds['descendant'],
                            os.WEXITED | os.WNOHANG | os.WNOWAIT)
                    except ChildProcessError:
                        pass
                    if observed is None:
                        time.sleep(0.01)
                self.assertEqual(observed.si_pid, descendant['pid'])
                self.assertEqual(observed.si_code, os.CLD_KILLED)
                self.assertEqual(observed.si_status, signal.SIGKILL)
                stopped_bytes = heartbeat.stat().st_size
                time.sleep(0.05)
                self.assertEqual(heartbeat.stat().st_size, stopped_bytes)
                self.assertFalse(exited(fds['action']), 'action completed before actual group absence')
                self.assertFalse(exited(fds['cohort']), 'cohort completed before actual group absence')
                self.assertEqual(small(output), b'', 'saved while group still exists')
                self.assertEqual((claim.stat().st_dev, claim.stat().st_ino),
                                 (original_claim.st_dev, original_claim.st_ino))
                os.killpg(worker['pid'], 0)  # Read-only group-existence observation.
                reaped = os.waitid(os.P_PIDFD, fds['descendant'], os.WEXITED | os.WNOHANG)
                self.assertEqual(reaped.si_pid, descendant['pid'])
            else:
                (root / 'finish-api').write_bytes(b'own healthy API completion\n')

            self.assertEqual(parent.wait(timeout=1.0), 1 if interrupt else 0)
            for role in ('action', 'cohort', 'worker'):
                self.assertTrue(exited(fds[role]), f'{role} physical exit not observed')
            with self.assertRaises(ProcessLookupError):
                os.killpg(worker['pid'], 0)
            self.assertFalse(claim.exists(), 'claim was not released after proved group closure')
            self.assertEqual(small(output), b'' if interrupt else b'saved=true\n')
            self.assertEqual(small(root / 'stdout'), b'')
            self.assertEqual(small(root / 'stderr'), (b'DMI_RAW_SAVE_REFUSED\n'
                b'DMI_RAW_SAVE_DIAGNOSTIC stage=CLOSURE reason=DMI_RAW_SAVE_INTERRUPTED\n') if interrupt else b'')
            self.assertEqual(small(root / 'synthetic-api-call'), b'.')
            self.assertEqual(raw.read_bytes(), b'synthetic raw original\n')
            if interrupt:
                self.assertFalse((root / 'finish-api').exists())
                self.assertEqual(heartbeat.stat().st_size, stopped_bytes)
        finally:
            primary = sys.exc_info()[1]
            signal.setitimer(signal.ITIMER_REAL, CLEANUP_SECONDS)
            try:
                # Failure cleanup only: never contributes to a passing stop
                # observation. Signal only retained exact kernel handles.
                for fd in fds.values():
                    if not exited(fd):
                        signal.pidfd_send_signal(fd, signal.SIGKILL)
                if parent is not None:
                    parent.wait(timeout=1.0)
                for fd in fds.values():
                    if not exited(fd, 1.0):
                        raise RuntimeError('OWN_STOP_UNPROVED; fixture retained')
                    try:
                        os.waitid(os.P_PIDFD, fd, os.WEXITED | os.WNOHANG)
                    except ChildProcessError:
                        pass  # Normal product may already have reaped it.
                no_children()  # Unknown early-start child => retain, not false cleanup.
                for fd in fds.values():
                    os.close(fd)
                    try:
                        os.fstat(fd)
                    except OSError as error:
                        if error.errno != errno.EBADF:
                            raise
                    else:
                        raise RuntimeError('OWN_PIDFD_CLOSE_UNPROVED')
                for handle in logs:
                    handle.close()
                    self.assertTrue(handle.closed)
                self.assertEqual(libc.prctl(36, previous.value, 0, 0, 0), 0)
                self.assertEqual(root.parent, temp_parent)
                self.assertTrue(root.name.startswith('rr-owned-raw-save-'))
                shutil.rmtree(root)
                self.assertFalse(root.exists())
            except BaseException as cleanup_error:
                if primary is None:
                    raise
                primary.add_note(f'OWN_CLEANUP_UNPROVED:{type(cleanup_error).__name__}; fixture retained')
            finally:
                signal.setitimer(signal.ITIMER_REAL, 0)
                signal.signal(signal.SIGALRM, old_alarm)


class OwnedRawSaveOfficialSdkNative(unittest.TestCase):
    def test_official_sdk_archive_finalize_17_closes_cohort_before_saved(self):
        self.official_chain(finalize_ok=True)

    def test_official_sdk_archive_file_limit_closes_before_cache_reservation(self):
        # One identical incompressible input and the real SDK for both limits.
        self.official_chain(finalize_ok=True, archive_limit=64 * 1024)
        self.official_chain(finalize_ok=True, archive_limit=1024, archive_capacity_skipped=True)
        self.official_chain(finalize_ok=True, archive_limit='01024',
            archive_refusal=b'stage=INPUT reason=DMI_RAW_SAVE_ARCHIVE_LIMIT_REFUSED\n')

    def test_official_sdk_finalize_http_200_false_never_saves(self):
        self.official_chain(finalize_ok=False, archive_limit=64 * 1024)

    def test_official_sdk_fixed_cipher_finalize_17_closes_before_uploaded(self):
        self.official_chain(finalize_ok=True, ciphertext=True)

    def test_official_sdk_fixed_cipher_http_200_false_never_uploads(self):
        self.official_chain(finalize_ok=False, ciphertext=True)

    def test_official_sdk_cipher_parent_sigkill_stops_before_cleanup_without_uploaded(self):
        self._cipher_sdk_parent_loss = []
        self.official_chain(finalize_ok=True, ciphertext=True)
        self.assertEqual(self._cipher_sdk_parent_loss,
                         ['ACTUAL_CIPHER_SDK_PARENT_LOSS_CLOSED_BEFORE_CLEANUP'])

    def test_official_sdk_staged_cipher_restores_in_normal_workspace(self):
        self.official_chain(finalize_ok=True, ciphertext=True, staged_roundtrip=True)

    def test_terminal_lease_wait_exits_before_or_after_claim_removal(self):
        for lease_wait in ('acquire', 'release', 'after-unlink'):
            with self.subTest(lease_wait=lease_wait):
                self.official_chain(finalize_ok=True, ciphertext=True, staged_roundtrip=True,
                                    lease_wait=lease_wait)

    def terminal_deadline_evidence(self):
        self.assertEqual(sys.platform, 'linux', 'NATIVE_LINUX_REQUIRED; not a skip')
        self.assertGreaterEqual(time.clock_gettime_ns(time.CLOCK_BOOTTIME) // 1_000_000,
            240_000 - TERMINAL_NEAR_EXPIRY_MS,
            'Run the selected deadline case after the other hosted source checks; no near-expiry proof on a young boot')
        for blocked_cohort in (False, True):
            with self.subTest(blocked_cohort=blocked_cohort):
                self.official_chain(finalize_ok=False, ciphertext=True, staged_roundtrip=True,
                                    staged_hold_cohort=blocked_cohort)

    def official_chain(self, *, finalize_ok, ciphertext=False, archive_limit=None,
                       archive_refusal=None, archive_capacity_skipped=False, staged_roundtrip=False,
                       staged_hold_cohort=False, lease_wait=None):
        import hashlib
        import random
        import resource
        from http.server import BaseHTTPRequestHandler, HTTPServer

        self.assertEqual(sys.platform, 'linux', 'NATIVE_LINUX_REQUIRED; not a skip')
        self.assertFalse(ciphertext and archive_limit is not None)
        if staged_roundtrip:
            self.assertTrue(ciphertext and getattr(self, '_cipher_sdk_parent_loss', None) is None)
        self.assertFalse(staged_hold_cohort and (not staged_roundtrip or finalize_ok))
        if lease_wait is not None:
            self.assertIn(lease_wait, ('acquire', 'release', 'after-unlink'))
            self.assertTrue(staged_roundtrip and finalize_ok and not staged_hold_cohort)
        for name in ('pidfd_open', 'waitid', 'P_PIDFD', 'WNOWAIT'):
            self.assertTrue(hasattr(os, name), f'NATIVE_LINUX_REQUIRED:{name}')
        self.assertTrue(hasattr(signal, 'pidfd_send_signal'))
        self.assertEqual(signal.getsignal(signal.SIGCHLD), signal.SIG_DFL)
        no_children()
        tar = shutil.which('tar')
        self.assertIsNotNone(tar, 'Actual tar/codec required; no substitute')
        libc = ctypes.CDLL(None, use_errno=True)
        libc.prctl.argtypes = [ctypes.c_int, ctypes.c_ulong, ctypes.c_ulong,
                              ctypes.c_ulong, ctypes.c_ulong]
        libc.prctl.restype = ctypes.c_int
        previous = ctypes.c_int()
        self.assertEqual(libc.prctl(37, ctypes.addressof(previous), 0, 0, 0), 0)
        self.assertEqual(libc.prctl(36, 1, 0, 0, 0), 0)
        temp_parent = Path(tempfile.gettempdir()).resolve()
        root = Path(tempfile.mkdtemp(prefix='rr-owned-sdk-save-', dir=temp_parent)).resolve()
        parent = server = downloader = None
        fds, observed, logs, calls = {}, {}, [], []
        fixture_unit = None
        managed_group = managed_group_identity = None
        claim_fd = None
        claim_identity = None
        archive_bytes = None
        archive_version = None
        connections = 0
        finished = False
        server_failure = []
        old_alarm = signal.getsignal(signal.SIGALRM)
        own_raw = (b'synthetic raw original\n' if archive_limit is None
                   else random.Random(349).randbytes(16 * 1024))
        key = ('weather-private-progress-encrypted-v2-Linux-main-17-1'
               if ciphertext else 'dmi-grib-v4-Linux-2026-W41-17-1')
        cipher_path = '.cache/weather-private-progress.encrypted'
        # Opaque own bytes test the transport only. This is NOT a fabricated
        # authenticated SAVE, GCM result or proof of the upstream seal caller.
        own_cipher = b'own opaque synthetic encrypted-progress transport bytes\\n'
        staged_cipher = None
        stage_root = root / 'sdk-temp' / 'ravradar-terminal-weather-progress-17-1'
        restore_root = root / 'normal-restore-workspace'
        cipher_identity = None
        stage_identity = None
        terminal_deadline = None
        service = '/twirp/github.actions.results.api.v1.CacheService/'
        blob_path = '/ownaccount/cache/archive'
        case = self

        def deadline(_number, _frame):
            raise TimeoutError('OWN_OFFICIAL_SDK_OBSERVER_DEADLINE')

        def direct_children(pid):
            return [int(child) for child in small(f'/proc/{pid}/task/{pid}/children').split()]

        def command(pid):
            return small(f'/proc/{pid}/cmdline').split(b'\0')[:-1]

        def retain_role(role, pid):
            fds[role] = retain_pidfd(pid)
            observed[role] = identity(pid)

        def observe_managed_action():
            nonlocal managed_group, managed_group_identity
            uid = os.geteuid()
            if lease_wait is None:
                controller, = direct_children(parent.pid)
                retain_role('controller', controller)
                case.assertEqual(observed['controller']['ppid'], parent.pid)
                case.assertEqual(command(controller)[1:], [
                    b'-B', os.fsencode(root / CONTROLLER), b'terminal-progress-upload', b'240', b'--'])
                launcher, = direct_children(controller)
                retain_role('launcher', launcher)
                case.assertEqual(observed['launcher']['ppid'], controller)
            else:
                launcher = parent.pid
            launcher_argv = command(launcher)
            case.assertEqual(Path(os.readlink(f'/proc/{launcher}/exe')),
                             Path('/usr/bin/systemd-run').resolve(strict=True))
            case.assertIn(b'--user', launcher_argv)
            case.assertIn(b'--wait', launcher_argv)
            unit, = (arg.split(b'=', 1)[1].decode('ascii') for arg in launcher_argv
                     if arg.startswith(b'--unit='))
            case.assertRegex(unit, r'^rr-weather-provider-[a-z0-9_]{8}\.service$')
            if lease_wait is None:
                scope = root / 'sdk-temp' / unit.removesuffix('.service')
                case.assertEqual(scope.resolve(strict=True), scope)
                case.assertEqual(stat.S_IMODE(scope.stat().st_mode), 0o700)
            else:
                case.assertEqual(unit, fixture_unit)
            fields = ('Id', 'Transient', 'InvocationID', 'ActiveState', 'MainPID', 'ControlGroup')
            result = subprocess.run(['/usr/bin/systemctl', '--user', 'show', '--no-pager',
                '--property=' + ','.join(fields), unit], env=fixture_control_environment(),
                stdin=subprocess.DEVNULL, capture_output=True, timeout=2, check=True)
            case.assertEqual(result.stderr, b'')
            state = dict(line.split('=', 1) for line in result.stdout.decode('ascii').splitlines())
            case.assertEqual(set(state), set(fields))
            case.assertEqual((state['Id'], state['Transient'], state['ActiveState']), (unit, 'yes', 'active'))
            case.assertRegex(state['InvocationID'], r'^(?!0{32}$)[0-9a-f]{32}$')
            cgroup = Path(state['ControlGroup'])
            case.assertTrue(cgroup.is_relative_to(f'/user.slice/user-{uid}.slice/user@{uid}.service'))
            case.assertNotIn('..', cgroup.parts)
            case.assertEqual(cgroup.name, unit)
            main = int(state['MainPID'])
            retain_role('managed', main)
            case.assertEqual(command(main),
                [os.fsencode(NODE24), os.fsencode(root / ENTRY), b'--managed-terminal-upload'])
            case.assertEqual(Path(os.readlink(f'/proc/{main}/exe')), NODE24)
            case.assertIn(os.fsencode(f'0::{cgroup}'), small(f'/proc/{main}/cgroup').splitlines())
            managed_group = Path('/sys/fs/cgroup').joinpath(*cgroup.parts[1:])
            managed_group_identity = managed_group.stat()
            case.assertIn(b'populated 1', small(managed_group / 'cgroup.events').splitlines())
            if lease_wait is None:
                names = {entry.partition(b'=')[0] for entry in small(f'/proc/{main}/environ').split(b'\0')}
                for name in (b'GITHUB_OUTPUT', b'GITHUB_STEP_SUMMARY', b'NODE_OPTIONS',
                             b'WEATHER_PROGRESS_MASTER_SECRET'):
                    case.assertNotIn(name, names)
            return main

        def assert_managed_closed():
            case.assertIsNotNone(managed_group)
            try:
                current = managed_group.stat()
            except FileNotFoundError:
                return
            case.assertTrue(os.path.samestat(current, managed_group_identity))
            case.assertIn(b'populated 0', small(managed_group / 'cgroup.events').splitlines())

        def observe_chain():
            nonlocal claim_fd, claim_identity
            action = observe_managed_action() if staged_roundtrip else parent.pid
            cohort_children = direct_children(action)
            if staged_roundtrip and lease_wait is None:
                watcher, = (pid for pid in cohort_children if b'--watch-terminal-upload' in command(pid))
                retain_role('watcher', watcher)
                case.assertEqual(observed['watcher']['ppid'], action)
                watcher_argv = command(watcher)
                case.assertEqual(len(watcher_argv), 6)
                case.assertEqual(watcher_argv[1:4], [b'-B', os.fsencode(root / CONTROLLER),
                                                   b'--watch-terminal-upload'])
                case.assertLess(int(watcher_argv[4]), terminal_deadline)
                cohort_children.remove(watcher)
            cohort_pid, = cohort_children
            worker_pid, = direct_children(cohort_pid)
            retain_role('cohort', cohort_pid)
            retain_role('worker', worker_pid)
            case.assertEqual(observed['cohort']['ppid'], action)
            case.assertEqual(observed['worker']['ppid'], cohort_pid)
            worker, cohort = observed['worker'], observed['cohort']
            expected_limit = 420_000_000 if ciphertext else archive_limit
            if expected_limit is not None:
                limit = (expected_limit, expected_limit)
                for role in ('cohort', 'worker'):
                    case.assertEqual(resource.prlimit(observed[role]['pid'], resource.RLIMIT_FSIZE), limit)
            case.assertEqual((worker['pgid'], worker['sid']), (worker['pid'], worker['pid']))
            case.assertNotEqual(cohort['pgid'], worker['pgid'])
            case.assertEqual(small(f"/proc/{worker['pid']}/cmdline").split(b'\0')[:-1],
                [os.fsencode(NODE24), os.fsencode(root / ENTRY),
                 b'--fixed-cipher-worker' if ciphertext else b'--fixed-api-worker'])
            case.assertEqual(small(f"/proc/{cohort['pid']}/cmdline").split(b'\0')[1:-1],
                [b'-B', os.fsencode(root / COHORT)]
                + ([b'--upload-encrypted-progress'] if ciphertext else []))
            if staged_roundtrip:
                membership, = small(f'/proc/{action}/cgroup').splitlines()
                for role in ('cohort', 'worker', *(['watcher'] if lease_wait is None else [])):
                    case.assertIn(membership, small(f"/proc/{observed[role]['pid']}/cgroup").splitlines())
            claim_fd = os.open(root / CLAIM, os.O_RDONLY | os.O_NOFOLLOW)
            stat = os.fstat(claim_fd)
            claim_identity = (stat.st_dev, stat.st_ino)
            case.assertEqual(os.read(claim_fd, 1), b'')

        def assert_pending():
            for role, fd in fds.items():
                case.assertFalse(exited(fd), f'{role} exited before finalization')
            for role, value in observed.items():
                case.assertEqual(identity(value['pid']), value)
            own_stat, current = os.fstat(claim_fd), (root / CLAIM).lstat()
            case.assertEqual((own_stat.st_dev, own_stat.st_ino), claim_identity)
            case.assertEqual((current.st_dev, current.st_ino), claim_identity)
            case.assertEqual(small(root / CLAIM), b'')
            case.assertEqual(small(root / 'action-output'), b'')
            case.assertEqual((root / '.cache/dmi-grib/own.grib').read_bytes(), own_raw)
            if ciphertext:
                case.assertEqual((root / cipher_path).read_bytes(), own_cipher)
                current_cipher = (root / cipher_path).lstat()
                case.assertEqual((current_cipher.st_dev, current_cipher.st_ino), cipher_identity)
                matched = []
                for entry in Path(f"/proc/{observed['worker']['pid']}/fd").iterdir():
                    try:
                        value = entry.stat()
                    except FileNotFoundError:
                        continue
                    if (value.st_dev, value.st_ino) == (stage_identity if staged_roundtrip else cipher_identity):
                        matched.append(int(entry.name))
                case.assertEqual(len(matched), 1, 'The actual fixed worker owns one selected cipher fd')
            os.killpg(observed['worker']['pid'], 0)  # Observation, not a signal.

        class Transport(HTTPServer):
            allow_reuse_address = False

            def get_request(self):
                nonlocal connections
                connection = super().get_request()
                connections += 1
                return connection

            def handle_error(self, _request, _client_address):
                server_failure.append(sys.exc_info()[1])

        class Handler(BaseHTTPRequestHandler):
            def log_message(self, *_args):
                pass  # Never log even synthetic authorization/body data.

            def body(self, maximum):
                case.assertEqual(self.client_address[0], '127.0.0.1')
                case.assertIsNone(self.headers.get('Transfer-Encoding'))
                length = int(self.headers.get('Content-Length', '-1'))
                case.assertGreaterEqual(length, 0)
                case.assertLessEqual(length, maximum)
                data = self.rfile.read(length)
                case.assertEqual(len(data), length)
                return data

            def reply(self, status, value=None):
                data = b'' if value is None else json.dumps(value).encode('utf-8')
                self.send_response(status)
                self.send_header('Content-Type', 'application/json')
                self.send_header('Content-Length', str(len(data)))
                self.send_header('Connection', 'close')
                if status == 201:
                    self.send_header('ETag', '"own-synthetic-blob"')
                    self.send_header('x-ms-request-id', 'own-synthetic-request')
                self.end_headers()
                self.wfile.write(data)
                self.wfile.flush()

            def do_POST(self):
                nonlocal archive_version, finished
                value = json.loads(self.body(4096))
                case.assertEqual(self.headers.get('Authorization'), 'Bearer own-synthetic-token')
                case.assertEqual(value['key'], key)
                if self.path == service + 'CreateCacheEntry':
                    case.assertEqual(calls, [])
                    case.assertEqual(set(value), {'key', 'version'})
                    case.assertRegex(value['version'], r'^[0-9a-f]{64}$')
                    archive_version = value['version']
                    observe_chain()
                    assert_pending()
                    calls.append('create')
                    self.reply(200, {'ok': True, 'signed_upload_url':
                        f'http://127.0.0.1:{server.server_port}/ownaccount/cache/archive'})
                elif self.path == service + 'FinalizeCacheEntryUpload':
                    case.assertEqual(calls, ['create', 'put'])
                    case.assertEqual(set(value), {'key', 'version', 'size_bytes'})
                    case.assertEqual(value['version'], archive_version)
                    case.assertEqual(value['size_bytes'], str(len(archive_bytes)))
                    assert_pending()  # Real SDK blocked on this exact response.
                    if getattr(case, '_cipher_sdk_parent_loss', None) is not None:
                        # Only the NEW case interrupts the real official SDK
                        # after its genuine archive PUT, before any finalize ACK.
                        case.assertTrue(ciphertext)
                        case.assertEqual(case._cipher_sdk_parent_loss, [])
                        original_raw = raw.lstat()
                        original_cipher = (root / cipher_path).lstat()
                        calls.append('finalize-owner-loss')
                        signal.pidfd_send_signal(fds['action'], signal.SIGKILL)
                        case.assertEqual(parent.wait(timeout=1.0), -signal.SIGKILL)
                        case.assertTrue(exited(fds['action']))
                        # No test signal is sent to cohort/worker here. The
                        # product must detect its lost parent and stop itself.
                        case.assertTrue(exited(fds['cohort'], 1.0),
                                        'product cohort did not close after cipher parent loss')
                        case.assertTrue(exited(fds['worker']),
                                        'product left the cipher SDK worker live')
                        terminal = os.waitid(os.P_PIDFD, fds['cohort'],
                            os.WEXITED | os.WNOHANG | os.WNOWAIT)
                        case.assertEqual(terminal.si_pid, observed['cohort']['pid'])
                        case.assertEqual(terminal.si_code, os.CLD_EXITED)
                        case.assertNotEqual(terminal.si_status, 0,
                                            'lost owner cannot produce a successful cohort')
                        with case.assertRaises(ProcessLookupError):
                            os.killpg(observed['worker']['pid'], 0)
                        reaped = os.waitid(os.P_PIDFD, fds['cohort'], os.WEXITED | os.WNOHANG)
                        case.assertEqual(reaped.si_pid, observed['cohort']['pid'])
                        no_children()  # Product drainer, not fixture cleanup, reaped the worker.
                        for value in (os.fstat(claim_fd), (root / CLAIM).lstat()):
                            case.assertEqual((value.st_dev, value.st_ino), claim_identity)
                            case.assertTrue(stat.S_ISREG(value.st_mode))
                            case.assertEqual(value.st_nlink, 1)
                        case.assertEqual(small(root / CLAIM), b'', 'dead owner claim stays retained')
                        case.assertEqual((root / cipher_path).read_bytes(), own_cipher)
                        current_cipher = (root / cipher_path).lstat()
                        case.assertEqual((current_cipher.st_dev, current_cipher.st_ino), cipher_identity)
                        case.assertEqual((current_cipher.st_size, current_cipher.st_mtime_ns,
                                          current_cipher.st_ctime_ns),
                                         (original_cipher.st_size, original_cipher.st_mtime_ns,
                                          original_cipher.st_ctime_ns))
                        case.assertTrue(stat.S_ISREG(current_cipher.st_mode))
                        case.assertEqual(current_cipher.st_nlink, 1)
                        case.assertEqual(raw.read_bytes(), own_raw)
                        current_raw = raw.lstat()
                        case.assertEqual((current_raw.st_dev, current_raw.st_ino,
                                          current_raw.st_size, current_raw.st_mtime_ns,
                                          current_raw.st_ctime_ns),
                                         (original_raw.st_dev, original_raw.st_ino,
                                          original_raw.st_size, original_raw.st_mtime_ns,
                                          original_raw.st_ctime_ns))
                        case.assertTrue(stat.S_ISREG(current_raw.st_mode))
                        case.assertEqual(current_raw.st_nlink, 1)
                        case.assertEqual(small(root / 'action-output'), b'',
                                         'parent loss must not publish uploaded=true or saved=true')
                        case._cipher_sdk_parent_loss.append(
                            'ACTUAL_CIPHER_SDK_PARENT_LOSS_CLOSED_BEFORE_CLEANUP')
                        finished = True
                        return  # Deliberately no successful Finalize response.
                    if staged_roundtrip and not finalize_ok:
                        calls.append('finalize-unanswered')
                        # The second case stops the uploader's immediate
                        # supervisor while the real SDK is waiting on Finalize.
                        if staged_hold_cohort:
                            signal.pidfd_send_signal(fds['cohort'], signal.SIGSTOP)
                            proc_stat = f"/proc/{observed['cohort']['pid']}/stat"
                            stop_observation = time.monotonic() + 1.0
                            while small(proc_stat).rsplit(b')', 1)[1].split()[0] != b'T':
                                case.assertLess(time.monotonic(), stop_observation, 'Own cohort did not stop')
                                time.sleep(0.001)
                        # No Finalize response or test signal releasing the
                        # hold. The independently owned unit must stop the
                        # SDK and its supervisor within the same deadline.
                        remaining = (terminal_deadline - time.clock_gettime_ns(time.CLOCK_BOOTTIME)
                                     // 1_000_000) / 1_000
                        case.assertGreater(remaining, 0)
                        case.assertTrue(exited(fds['action'], remaining),
                                        'The terminal SDK observer did not exit in the real terminal window')
                        for role, fd in fds.items():
                            case.assertTrue(exited(fd), f'{role} survived the managed terminal exit')
                        assert_managed_closed()
                        case.assertLess(time.clock_gettime_ns(time.CLOCK_BOOTTIME) // 1_000_000,
                                        terminal_deadline)
                        case.assertEqual(small(root / 'action-output'), b'')
                        if staged_hold_cohort:
                            claim = (root / CLAIM).lstat()
                            case.assertEqual((claim.st_dev, claim.st_ino), claim_identity)
                        finished = True
                        return
                    calls.append('finalize')
                    self.reply(200, {'ok': finalize_ok, 'entry_id': '17' if finalize_ok else '0'})
                    finished = True
                elif staged_roundtrip and self.path == service + 'GetCacheEntryDownloadURL':
                    case.assertEqual(calls, ['create', 'put', 'finalize'])
                    case.assertEqual(set(value) - {'restore_keys'}, {'key', 'version'})
                    case.assertEqual(value.get('restore_keys', []), [])
                    case.assertEqual(value['version'], archive_version, 'Only the normal exact cache version is readable')
                    calls.append('lookup')
                    self.reply(200, {'ok': True, 'matched_key': key, 'signed_download_url':
                        f'http://127.0.0.1:{server.server_port}{blob_path}'})
                else:
                    raise AssertionError('Unexpected official SDK endpoint')

            def do_HEAD(self):
                raise AssertionError('Cache SDK 6.1.0 uses direct GET for non-Azure archive hosts')

            def do_GET(self):
                nonlocal finished
                case.assertTrue(staged_roundtrip)
                case.assertEqual(self.path, blob_path)
                case.assertEqual(calls, ['create', 'put', 'finalize', 'lookup'])
                case.assertIsNone(self.headers.get('Authorization'))
                case.assertIsNone(self.headers.get('Range'))
                case.assertIsNone(self.headers.get('x-ms-range'))
                self.send_response(200)
                self.send_header('Content-Length', str(len(archive_bytes)))
                self.send_header('Connection', 'close')
                self.end_headers()
                self.wfile.write(archive_bytes)
                self.wfile.flush()
                calls.append('download')
                finished = True

            def do_PUT(self):
                nonlocal archive_bytes
                case.assertEqual(self.path, '/ownaccount/cache/archive')
                case.assertEqual(calls, ['create'])
                case.assertEqual(self.headers.get('x-ms-blob-type'), 'BlockBlob')
                archive_bytes = self.body(1024 * 1024)
                if archive_limit is not None:
                    case.assertGreater(len(archive_bytes), 1024)
                    case.assertLessEqual(len(archive_bytes), archive_limit)
                case.assertTrue(archive_bytes.startswith(b'\x1f\x8b')
                                or archive_bytes.startswith(b'\x28\xb5\x2f\xfd'),
                                'Actual official gzip/zstd archive required')
                archive = root / 'received-own-archive'
                archive.write_bytes(archive_bytes)
                # Decode only the bounded own upload, never extract paths to disk.
                # subprocess.run reaps these test-owned verification children;
                # the enclosing unchanged 8s alarm also covers both commands.
                listing = subprocess.run([tar, '-tf', str(archive)], cwd=root,
                    env=runtime_environment(), stdin=subprocess.DEVNULL,
                    capture_output=True, timeout=1, check=True)
                names = listing.stdout.decode('utf-8').splitlines()
                if ciphertext:
                    case.assertEqual(sorted(names), [cipher_path])
                else:
                    case.assertEqual(sorted(names), ['.cache/dmi-grib/', '.cache/dmi-grib/own.grib'])
                extracted = subprocess.run([tar, '-xOf', str(archive),
                    cipher_path if ciphertext else '.cache/dmi-grib/own.grib'],
                    cwd=root, env=runtime_environment(), stdin=subprocess.DEVNULL,
                    capture_output=True, timeout=1, check=True)
                if ciphertext:
                    case.assertEqual(extracted.stdout, staged_cipher if staged_roundtrip else own_cipher)
                else:
                    case.assertEqual(extracted.stdout, own_raw)
                case.assertEqual(listing.stderr + extracted.stderr, b'')
                calls.append('put')
                self.reply(201)

        signal.signal(signal.SIGALRM, deadline)
        signal.setitimer(signal.ITIMER_REAL, TERMINAL_SDK_OBSERVER_SECONDS if staged_roundtrip else BODY_SECONDS)
        try:
            sources = (ENTRY, COHORT, CLAIM_MODULE, ENTRY.parent / 'package.json',
                       ENTRY.parent / 'package-lock.json')
            for relative in sources + ((CONTROLLER,) if staged_roundtrip else ()):
                source = (ROOT / relative).read_bytes()
                destination = root / relative
                destination.parent.mkdir(parents=True, exist_ok=True)
                destination.write_bytes(source)
                self.assertEqual(destination.read_bytes(), source)
            action = ROOT / ENTRY.parent
            lock_bytes = (action / 'package-lock.json').read_bytes().replace(b'\r\n', b'\n')
            self.assertEqual(hashlib.sha256(lock_bytes).hexdigest(),
                '9bd935a0c94f605ab28b4cc1ea543173bb06e213ba779e6e9855e31a4dd6a9a5')
            dependency = (action / 'node_modules').resolve(strict=True)
            package = dependency / '@actions/cache'
            self.assertEqual(json.loads((package / 'package.json').read_bytes())['version'], '6.1.0')
            for relative, digest in (
                ('lib/cache.js', '258ab7dcfe2424ab849ebe42cba42f7d5ee586bc077c894cd5e45803c5b2ba11'),
                ('lib/internal/tar.js', '7fdb340eb93cedfb97e27c1a9599969cbbE3512ba63baf940da0a6ed5c92e029'),
                ('lib/internal/uploadUtils.js', 'ea761d1c70ce503be0eb5c4cd7accda773d74c6fa8bd63af03b19d75d6646b03')):
                self.assertEqual(hashlib.sha256((package / relative).read_bytes()).hexdigest(), digest.lower())
            if staged_roundtrip:
                self.assertEqual(hashlib.sha256((package / 'lib/internal/cacheUtils.js').read_bytes()).hexdigest(),
                    'ba1b2de90f5abc0475065f0eb3017db727dd548b53cd6e4053fd70bf223ab75a')
            # Read-only dependency reference; no npm, SDK rewrite or package shim.
            (root / ENTRY.parent / 'node_modules').symlink_to(dependency, target_is_directory=True)
            raw = root / '.cache/dmi-grib/own.grib'
            raw.parent.mkdir(parents=True)
            raw.write_bytes(own_raw)
            if ciphertext:
                (root / cipher_path).write_bytes(own_cipher)
                value = (root / cipher_path).lstat()
                cipher_identity = (value.st_dev, value.st_ino)
            (root / 'sdk-temp').mkdir()
            output = root / 'action-output'
            output.write_bytes(b'')
            server = Transport(('127.0.0.1', 0), Handler)
            server.timeout = 0.02
            environment = runtime_environment()
            environment.update({'PYTHONDONTWRITEBYTECODE': '1', 'PYTHONNOUSERSITE': '1',
                'INPUT_PATH': '' if ciphertext else '.cache/dmi-grib', 'INPUT_KEY': key,
                'INPUT_OPERATION': 'upload-encrypted-progress' if ciphertext else 'save',
                'GITHUB_REF': 'refs/heads/main', 'GITHUB_EVENT_NAME': 'workflow_dispatch',
                'GITHUB_RUN_ID': '17', 'GITHUB_RUN_ATTEMPT': '1', 'RUNNER_OS': 'Linux',
                'GITHUB_SERVER_URL': 'https://github.com', 'ACTIONS_CACHE_SERVICE_V2': '1',
                'GITHUB_WORKSPACE': str(root), 'RUNNER_TEMP': str(root / 'sdk-temp'),
                'ACTIONS_RESULTS_URL': f'http://127.0.0.1:{server.server_port}',
                'ACTIONS_RUNTIME_TOKEN': 'own-synthetic-token', 'GITHUB_OUTPUT': str(output)})
            for name in ('stdout', 'stderr'):
                logs.append((root / name).open('wb'))
            if archive_limit is not None:
                environment['RAVRADAR_DMI_RAW_ARCHIVE_MAX_BYTES'] = str(archive_limit)
            if staged_roundtrip:
                self.assertEqual((os.environ.get('RUNNER_ENVIRONMENT'), os.environ.get('ImageOS')),
                                 ('github-hosted', 'ubuntu24'), 'Actual managed terminal Ubuntu runner required')
                environment.update({name: os.environ[name] for name in ('RUNNER_ENVIRONMENT', 'ImageOS')})
                environment['GITHUB_STEP_SUMMARY'] = str(root / 'fixture-summary')
                environment['WEATHER_PROGRESS_MASTER_SECRET'] = 'unused-synthetic-fixture-secret'
                environment['NODE_OPTIONS'] = '--no-warnings'
                source_root = root / 'authenticated-stage-source'
                progress_script = ROOT / 'scripts/weather-component-progress-cache.mjs'
                seal_environment = runtime_environment()
                seal_environment.update({
                    'RUNNER_TEMP': environment['RUNNER_TEMP'], 'GITHUB_RUN_ID': '17', 'GITHUB_RUN_ATTEMPT': '1',
                    'GITHUB_REPOSITORY': 'owner/stage-fixture',
                    'WEATHER_PROGRESS_ENCRYPTION_KEY': 'Q0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0M=',
                })
                seal_base = root / 'stage-source-base.json'
                restore_base = root / 'stage-restore-base.json'
                stage_program = r'''
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
const [sourceRoot, script, restoreRoot, sourceBase, restoreBase] = process.argv.slice(1);
const { weatherComponentProgressCache, sealTerminalWeatherProgressStage } = await import(pathToFileURL(script));
for (const [repositoryRoot, basePath] of [[sourceRoot, sourceBase], [restoreRoot, restoreBase]]) {
  await fs.mkdir(path.join(repositoryRoot, 'data/live'), { recursive: true });
  await fs.writeFile(path.join(repositoryRoot, 'data/live/conditions.json'), '{"fixture":true}\n');
  assert.equal((await weatherComponentProgressCache({ mode: 'capture-base', repositoryRoot,
    basePath, protectedBundleSha256: 'a'.repeat(64) })).captured, true);
}
await fs.mkdir(path.join(sourceRoot, '.cache'));
await fs.writeFile(path.join(sourceRoot, '.cache/weather-component-fallback-cursor.json'), '{"staged":true}');
const result = await sealTerminalWeatherProgressStage({ repositoryRoot: sourceRoot, basePath: sourceBase });
assert.equal(result.staged, true, JSON.stringify(result));
assert.equal(result.saved, false);
assert.equal(result.productionAuthority, false);
console.log(result.sha256);
'''
                started = time.clock_gettime_ns(time.CLOCK_BOOTTIME) // 1_000_000
                boot = Path('/proc/sys/kernel/random/boot_id').read_text('ascii').strip()
                sealed = subprocess.run([str(NODE24), '--input-type=module', '-e', stage_program,
                    str(source_root), str(progress_script), str(restore_root), str(seal_base), str(restore_base)],
                    cwd=root, env=seal_environment, stdin=subprocess.DEVNULL, capture_output=True,
                    timeout=2.0, check=True)
                staged_cipher = (stage_root / cipher_path).read_bytes()
                digest = hashlib.sha256(staged_cipher).hexdigest()
                self.assertEqual(sealed.stdout.decode('ascii').strip(), digest)
                self.assertEqual(sealed.stderr, b'')
                member_stat, root_stat, cache_stat = [(stage_root / leaf).lstat()
                    for leaf in (cipher_path, '.', '.cache')]
                stage_identity = (member_stat.st_dev, member_stat.st_ino)
                if not finalize_ok:
                    # This fixture represents a seal following earlier elapsed
                    # work. No clock or production deadline is substituted.
                    started -= 240_000 - TERMINAL_NEAR_EXPIRY_MS
                terminal_deadline = started + 240_000
                environment['RAVRADAR_TERMINAL_CIPHER_HANDOFF'] = json.dumps({
                    'schemaVersion': 1, 'runId': '17', 'runAttempt': '1', 'bootId': boot,
                    'startedAt': started, 'deadline': terminal_deadline,
                    'bytes': len(staged_cipher), 'sha256': digest,
                    'device': str(member_stat.st_dev), 'inode': str(member_stat.st_ino),
                    'mtimeNs': str(member_stat.st_mtime_ns), 'ctimeNs': str(member_stat.st_ctime_ns),
                    'stageDevice': str(root_stat.st_dev), 'stageInode': str(root_stat.st_ino),
                    'cacheDevice': str(cache_stat.st_dev), 'cacheInode': str(cache_stat.st_ino),
                })
            action_command = [str(NODE24), str(root / ENTRY)]
            if lease_wait is not None:
                lease_marker = root / 'lease-waiting'
                fixture = {'root': str(root), 'entry': str(root / ENTRY), 'claim': str(root / CLAIM),
                           'marker': str(lease_marker), 'mode': lease_wait,
                           'elapsedSeconds': TERMINAL_LEASE_FIXTURE_ELAPSED_MS // 1_000}
                preload = root / 'fixture-lease-wait.cjs'
                preload.write_text('const fixture = ' + json.dumps(fixture) + '\n' + TERMINAL_LEASE_WAIT,
                                   encoding='ascii')
                environment['NODE_OPTIONS'] = '--require=' + json.dumps(str(preload))
                # Widen only this fixture's watchdog after setup. The actual
                # bounded pidfd wait below still uses the shared stage deadline.
                signal.setitimer(signal.ITIMER_REAL, TERMINAL_LEASE_FIXTURE_OBSERVER_SECONDS)
                fixture_unit = f"rr-weather-provider-{root.name.removeprefix('rr-owned-sdk-save-')}.service"
                environment['RAVRADAR_TERMINAL_UPLOAD_UNIT'] = fixture_unit
                for name in ('GITHUB_OUTPUT', 'GITHUB_STEP_SUMMARY', 'WEATHER_PROGRESS_MASTER_SECRET'):
                    del environment[name]
                # Only this synthetic service receives the existing preload.
                # The production controller never receives or relays it.
                action_command = ['/usr/bin/systemd-run', '--user', '--quiet', '--wait', '--pipe',
                    '--service-type=exec', '--expand-environment=no', f'--unit={fixture_unit}',
                    f'--property=WorkingDirectory={root}', '--property=RuntimeMaxSec=18s',
                    '--property=TimeoutStopSec=2s', '--property=KillMode=control-group',
                    *[f'--setenv={name}={value}' for name, value in environment.items()],
                    '--', *action_command, '--managed-terminal-upload']
                environment = fixture_control_environment()
            parent = subprocess.Popen(action_command, cwd=root, env=environment,
                stdin=subprocess.DEVNULL, stdout=logs[0], stderr=logs[1])
            fds['action'] = retain_pidfd(parent.pid)
            while not finished:
                if lease_wait == 'acquire' and lease_marker.exists():
                    observe_managed_action()
                    break
                if exited(fds['action']):
                    self.assertTrue(archive_capacity_skipped or archive_refusal is not None,
                                    'Official SDK exited before complete protocol')
                    break
                server.handle_request()
                if server_failure:
                    raise server_failure[0]
            if archive_capacity_skipped or archive_refusal is not None:
                # Drain a queued connection as well as requests observed before exit.
                server.handle_request()
                if server_failure:
                    raise server_failure[0]
                self.assertEqual(calls, [])
                self.assertEqual(connections, 0)
                diagnostics = small(root / 'stderr')
                fixed_diagnostic = re.search(
                    rb'(?m)^DMI_RAW_SAVE_DIAGNOSTIC stage=[A-Z_]{1,32} reason=[A-Z_]{1,80}$',
                    diagnostics)
                self.assertEqual(parent.wait(timeout=1.0), 0 if archive_capacity_skipped else 1,
                                 fixed_diagnostic.group(0).decode('ascii') if fixed_diagnostic else
                                 'No fixed diagnostic from the owned RAW action')
                self.assertEqual(small(output),
                                 b'archive_capacity_skipped=true\n' if archive_capacity_skipped else b'')
                self.assertEqual(diagnostics, b'' if archive_capacity_skipped else (
                    b'DMI_RAW_SAVE_REFUSED\nDMI_RAW_SAVE_DIAGNOSTIC ' + archive_refusal))
                self.assertFalse((root / CLAIM).exists())
                self.assertFalse(any((root / 'sdk-temp').glob('rr-dmi-raw-archive-*')))
                self.assertEqual(raw.read_bytes(), own_raw)
                no_children()
                return
            if lease_wait is not None:
                remaining = (terminal_deadline - TERMINAL_LEASE_FIXTURE_ELAPSED_MS
                             - time.clock_gettime_ns(time.CLOCK_BOOTTIME) // 1_000_000) / 1_000
                self.assertGreater(remaining, 0)
                self.assertTrue(exited(fds['action'], remaining),
                                'Held lease I/O kept the actual terminal action alive past its deadline')
                self.assertEqual(parent.wait(timeout=1.0), 1)
                self.assertEqual(small(lease_marker), b'waiting\n')
                self.assertEqual(small(output), b'')
                for role, fd in fds.items():
                    self.assertTrue(exited(fd), f'{role} actual exit required')
                assert_managed_closed()
                if lease_wait == 'acquire':
                    server.handle_request()
                    if server_failure:
                        raise server_failure[0]
                    self.assertEqual(calls, [])
                    self.assertEqual(connections, 0)
                    self.assertEqual(set(fds), {'action', 'managed'})
                    no_children()
                else:
                    self.assertEqual(calls, ['create', 'put', 'finalize'])
                    for role in ('cohort', 'worker'):
                        self.assertTrue(exited(fds[role]), f'{role} actual exit required')
                    with self.assertRaises(ProcessLookupError):
                        os.killpg(observed['worker']['pid'], 0)
                self.assertEqual((root / CLAIM).exists(), lease_wait != 'after-unlink')
                if lease_wait != 'after-unlink':
                    self.assertEqual(small(root / CLAIM), b'')
                    if claim_identity is not None:
                        current_claim = (root / CLAIM).lstat()
                        self.assertEqual((current_claim.st_dev, current_claim.st_ino), claim_identity)
                self.assertEqual((root / cipher_path).read_bytes(), own_cipher)
                self.assertEqual((stage_root / cipher_path).read_bytes(), staged_cipher)
                self.assertEqual(raw.read_bytes(), own_raw)
                return
            if staged_roundtrip:
                self.assertEqual(parent.wait(timeout=8.0), 0 if finalize_ok else 1,
                                 small(root / 'stderr').decode('utf-8'))
                for role, fd in fds.items():
                    self.assertTrue(exited(fd), f'{role} actual exit required')
                assert_managed_closed()
                with self.assertRaises(ProcessLookupError):
                    os.killpg(observed['worker']['pid'], 0)
                self.assertEqual((root / CLAIM).exists(), staged_hold_cohort)
                if staged_hold_cohort:
                    self.assertEqual(small(root / CLAIM), b'')
                self.assertEqual(small(output), b'', 'Terminal success is the action exit status only')
                self.assertEqual((root / cipher_path).read_bytes(), own_cipher)
                old = (root / cipher_path).lstat()
                self.assertEqual((old.st_dev, old.st_ino), cipher_identity)
                self.assertEqual((stage_root / cipher_path).read_bytes(), staged_cipher)
                self.assertEqual(raw.read_bytes(), own_raw)
                if not finalize_ok:
                    self.assertEqual(calls, ['create', 'put', 'finalize-unanswered'])
                    self.assertIn(b'reason=WEATHER_CIPHER_TERMINAL_CONTROLLER_REFUSED\n',
                                  small(root / 'stderr'))
                    return
                download_env = {name: environment[name] for name in ('RUNNER_TEMP', 'INPUT_KEY',
                    'ACTIONS_CACHE_SERVICE_V2', 'ACTIONS_RESULTS_URL', 'ACTIONS_RUNTIME_TOKEN')}
                download_env.update(runtime_environment(), GITHUB_WORKSPACE=str(restore_root),
                                    GITHUB_REF='refs/heads/main')
                program = r'''
import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';
const { restoreCache } = await import(pathToFileURL(process.argv[1]));
const key = process.env.INPUT_KEY;
assert.equal(await restoreCache(['.cache/weather-private-progress.encrypted'], key, [], undefined, false), key);
'''
                downloader = subprocess.Popen([str(NODE24), '--input-type=module', '-e', program,
                    str(package / 'lib/cache.js')], cwd=restore_root, env=download_env,
                    stdin=subprocess.DEVNULL, stdout=logs[0], stderr=logs[1])
                fds['downloader'] = retain_pidfd(downloader.pid)
                finished = False
                while not finished:
                    self.assertFalse(exited(fds['downloader']), 'Normal SDK exited before restore response')
                    server.handle_request()
                    if server_failure:
                        raise server_failure[0]
                self.assertEqual(downloader.wait(timeout=2.0), 0, small(root / 'stderr').decode('utf-8'))
                self.assertEqual(calls, ['create', 'put', 'finalize', 'lookup', 'download'])
                self.assertEqual((restore_root / cipher_path).read_bytes(), staged_cipher)
                self.assertEqual((stage_root / cipher_path).read_bytes(), staged_cipher)
                report = root / 'stage-restore-report.json'
                restored = subprocess.run([str(NODE24), str(progress_script), 'restore', '--root', str(restore_root),
                    '--base', str(restore_base), '--report', str(report)], cwd=root, env=seal_environment,
                    stdin=subprocess.DEVNULL, capture_output=True, timeout=2.0, check=True)
                self.assertEqual(restored.stderr, b'')
                self.assertTrue(json.loads(report.read_bytes())['restored'])
                self.assertEqual((restore_root / '.cache/weather-component-fallback-cursor.json').read_bytes(),
                                 b'{"staged":true}')
                return
            if getattr(self, '_cipher_sdk_parent_loss', None) is not None:
                self.assertEqual(self._cipher_sdk_parent_loss,
                                 ['ACTUAL_CIPHER_SDK_PARENT_LOSS_CLOSED_BEFORE_CLEANUP'])
                self.assertEqual(calls, ['create', 'put', 'finalize-owner-loss'])
                return  # The unchanged finally now closes only already stopped own processes.
            self.assertEqual(parent.wait(timeout=1.0), 0 if finalize_ok else 1)
            for role in ('action', 'cohort', 'worker'):
                self.assertTrue(exited(fds[role]), f'{role} actual exit required')
            with self.assertRaises(ProcessLookupError):
                os.killpg(observed['worker']['pid'], 0)
            self.assertEqual(calls, ['create', 'put', 'finalize'])
            self.assertFalse((root / CLAIM).exists())
            if ciphertext:
                self.assertEqual(small(output), b'uploaded=true\n' if finalize_ok else b'')
                self.assertNotIn(b'saved=', small(output))
                self.assertEqual((root / cipher_path).read_bytes(), own_cipher)
                value = (root / cipher_path).lstat()
                self.assertEqual((value.st_dev, value.st_ino), cipher_identity)
            else:
                self.assertEqual(small(output), b'saved=true\n' if finalize_ok else b'')
            self.assertEqual(small(root / 'stdout'), b'')
            self.assertEqual(small(root / 'stderr'), b'' if finalize_ok else (b'DMI_RAW_SAVE_REFUSED\n'
                b'DMI_RAW_SAVE_DIAGNOSTIC stage=API reason=DMI_RAW_SAVE_API_FAILED\n'))
            self.assertEqual(raw.read_bytes(), own_raw)
            self.assertFalse(any(p.name in {'cache.tgz', 'cache.tzst'}
                                 for p in (root / 'sdk-temp').rglob('*')), 'SDK archive still present')
            self.assertFalse(any((root / 'sdk-temp').glob('rr-dmi-raw-archive-*')))
        finally:
            primary = sys.exc_info()[1]
            signal.setitimer(signal.ITIMER_REAL, CLEANUP_SECONDS)
            try:
                if server is not None:
                    server_fd = server.fileno()
                    server.server_close()
                    with self.assertRaises(OSError) as closed:
                        os.fstat(server_fd)
                    self.assertEqual(closed.exception.errno, errno.EBADF)
                for fd in fds.values():
                    if not exited(fd):
                        signal.pidfd_send_signal(fd, signal.SIGKILL)
                if parent is not None:
                    parent.wait(timeout=1.0)
                if downloader is not None:
                    downloader.wait(timeout=1.0)
                for fd in fds.values():
                    if not exited(fd, 1.0):
                        raise RuntimeError('OWN_SDK_STOP_UNPROVED; fixture retained')
                    try:
                        os.waitid(os.P_PIDFD, fd, os.WEXITED | os.WNOHANG)
                    except ChildProcessError:
                        pass
                no_children()
                for fd in [*fds.values(), *([] if claim_fd is None else [claim_fd])]:
                    os.close(fd)
                    with self.assertRaises(OSError) as closed:
                        os.fstat(fd)
                    self.assertEqual(closed.exception.errno, errno.EBADF)
                for handle in logs:
                    handle.close()
                    self.assertTrue(handle.closed)
                self.assertEqual(libc.prctl(36, previous.value, 0, 0, 0), 0)
                if staged_roundtrip and parent is not None:
                    assert_managed_closed()
                self.assertEqual(root.parent, temp_parent)
                self.assertTrue(root.name.startswith('rr-owned-sdk-save-'))
                shutil.rmtree(root)
                self.assertFalse(root.exists())
            except BaseException as cleanup_error:
                if primary is None:
                    raise
                primary.add_note(f'OWN_SDK_CLEANUP_UNPROVED:{type(cleanup_error).__name__}; fixture retained')
            finally:
                signal.setitimer(signal.ITIMER_REAL, 0)
                signal.signal(signal.SIGALRM, old_alarm)



class OwnedRawDistributionNative(unittest.TestCase):
    def test_warm_locked_offline_cache_prepares_after_cohort_and_claim_close(self):
        self.distribution_chain(warm=True)

    def test_empty_owned_offline_cache_refuses_without_ready_or_saved(self):
        self.distribution_chain(warm=False)

    def distribution_chain(self, *, warm):
        import hashlib

        self.assertEqual(sys.platform, 'linux', 'NATIVE_LINUX_REQUIRED; not a skip')
        for name in ('pidfd_open', 'waitid', 'P_PIDFD', 'WNOWAIT'):
            self.assertTrue(hasattr(os, name), f'NATIVE_LINUX_REQUIRED:{name}')
        self.assertTrue(hasattr(signal, 'pidfd_send_signal'))
        self.assertEqual(signal.getsignal(signal.SIGCHLD), signal.SIG_DFL)
        no_children()
        action_source = ROOT / ENTRY.parent
        lock_bytes = (action_source / 'package-lock.json').read_bytes()
        self.assertEqual(hashlib.sha256(lock_bytes.replace(b'\r\n', b'\n')).hexdigest(),
                         '9bd935a0c94f605ab28b4cc1ea543173bb06e213ba779e6e9855e31a4dd6a9a5')
        official = action_source / 'node_modules/@actions/cache'
        self.assertEqual(json.loads((official / 'package.json').read_text())['version'], '6.1.0')
        self.assertEqual(hashlib.sha256((official / 'lib/cache.js').read_bytes()).hexdigest(),
                         '258ab7dcfe2424ab849ebe42cba42f7d5ee586bc077c894cd5e45803c5b2ba11')
        npm_cli = (NODE24.parent / 'npm').resolve(strict=True)
        self.assertTrue(npm_cli.is_relative_to(NODE24.parent.parent.resolve()))
        self.assertEqual(npm_cli.name, 'npm-cli.js')
        self.assertEqual(json.loads((npm_cli.parent.parent / 'package.json').read_text())['name'], 'npm')
        # No fallback to a user's cache: normal CI must seed precisely this
        # action-owned cache with its existing locked npm ci, not a fake SDK.
        source_cache = action_source / '.npm-cache/_cacache'
        if warm:
            self.assertTrue(source_cache.is_dir(), 'FIXED_LOCKED_WARM_CACHE_REQUIRED; not a skip')
            self.assertEqual(source_cache.resolve(), source_cache)
            self.assertFalse(source_cache.is_symlink())
        libc = ctypes.CDLL(None, use_errno=True)
        libc.prctl.argtypes = [ctypes.c_int, ctypes.c_ulong, ctypes.c_ulong,
                              ctypes.c_ulong, ctypes.c_ulong]
        libc.prctl.restype = ctypes.c_int
        previous = ctypes.c_int()
        self.assertEqual(libc.prctl(37, ctypes.addressof(previous), 0, 0, 0), 0)
        self.assertEqual(libc.prctl(36, 1, 0, 0, 0), 0)
        temp_parent = Path(tempfile.gettempdir()).resolve()
        root = Path(tempfile.mkdtemp(prefix='rr-owned-distribution-', dir=temp_parent)).resolve()
        parent = None
        fds, observed, logs = {}, {}, []
        claim_fd = None
        claim_identity = None
        pipe_targets = set()
        old_alarm = signal.getsignal(signal.SIGALRM)
        own_raw = b'synthetic raw original\n'
        config_paths = (root / ENTRY.parent / '.npm-cache/.ravradar-user.npmrc',
                        root / ENTRY.parent / '.npm-cache/.ravradar-global.npmrc')

        def deadline(_number, _frame):
            raise TimeoutError('OWN_DISTRIBUTION_OBSERVER_DEADLINE')

        def assert_pending():
            self.assertEqual(small(root / 'action-output'), b'')
            current, opened = (root / CLAIM).lstat(), os.fstat(claim_fd)
            self.assertEqual((current.st_dev, current.st_ino), claim_identity)
            self.assertEqual((opened.st_dev, opened.st_ino), claim_identity)
            self.assertEqual(os.read(claim_fd, 1), b'')
            for role in ('action', 'cohort', 'worker', 'npm'):
                self.assertFalse(exited(fds[role]), f'{role} must still be physically alive')
                self.assertEqual(identity(observed[role]['pid']), observed[role])

        def observe_child(role, ancestor):
            while True:
                self.assertFalse(exited(fds['action']), 'Actual entry exited before own child observation')
                children = small(f'/proc/{ancestor}/task/{ancestor}/children').split()
                if children:
                    self.assertEqual(len(children), 1, 'Only the fixed actual direct child may qualify')
                    pid = int(children[0])
                    fd = retain_pidfd(pid)
                    fds[role] = fd
                    observed[role] = identity(pid)
                    self.assertEqual(observed[role]['ppid'], ancestor)
                    self.assertFalse(exited(fd))
                    return pid
                time.sleep(0.001)

        def assert_closed_boundary():
            for role in ('cohort', 'worker', 'npm'):
                self.assertTrue(exited(fds[role]), f'{role} physical exit before ready')
            with self.assertRaises(ProcessLookupError):
                os.killpg(observed['worker']['pid'], 0)
            self.assertFalse((root / CLAIM).exists(), 'Same claim must be released before ready')
            # The action's direct-child stdout/stderr/private IPC endpoints
            # must be gone as real descriptors, not just a Boolean receipt.
            if not exited(fds['action']):
                try:
                    self.assertEqual(identity(parent.pid), observed['action'])
                    descriptors = list(Path(f'/proc/{parent.pid}/fd').iterdir())
                except OSError as error:
                    require_action_exit_after_proc_race(fds['action'], error,
                                                       signal.getitimer(signal.ITIMER_REAL)[0])
                    descriptors = []
                remaining = set()
                for item in descriptors:
                    try:
                        remaining.add(os.readlink(item))
                    except FileNotFoundError:
                        pass  # Closed during this inventory; never qualifies an open pipe.
                    except OSError as error:
                        require_action_exit_after_proc_race(fds['action'], error,
                                                           signal.getitimer(signal.ITIMER_REAL)[0])
                        remaining.clear()  # Earlier observations predate the proved exit.
                        break  # Kernel-proved exit closed all of its descriptors.
                self.assertTrue(pipe_targets.isdisjoint(remaining))
            self.assertEqual((root / '.cache/dmi-grib/own.grib').read_bytes(), own_raw)
            for config_path in config_paths:
                self.assertFalse(config_path.exists(), 'Only closed own npm configs may be removed before ready')
                self.assertFalse(config_path.is_symlink())

        signal.signal(signal.SIGALRM, deadline)
        signal.setitimer(signal.ITIMER_REAL, BODY_SECONDS)
        try:
            for relative in (ENTRY, COHORT, CLAIM_MODULE, ENTRY.parent / 'package.json',
                             ENTRY.parent / 'package-lock.json'):
                destination = root / relative
                destination.parent.mkdir(parents=True, exist_ok=True)
                shutil.copyfile(ROOT / relative, destination)
                self.assertEqual(destination.read_bytes(), (ROOT / relative).read_bytes())
            action = root / ENTRY.parent
            own_cache = action / '.npm-cache'
            own_cache.mkdir()
            self.assertFalse((action / 'node_modules').exists(), 'No preinstalled SDK can fake npm success')
            if warm:
                # Copy only the already fixed, installation-owned content/index
                # cache, never logs or a general user/npm cache.
                for directory, directories, files in os.walk(source_cache, followlinks=False):
                    for name in [*directories, *files]:
                        entry = Path(directory) / name
                        self.assertFalse(entry.is_symlink(), 'Warm cache must not escape its own root')
                        self.assertTrue(entry.is_dir() or entry.is_file())
                shutil.copytree(source_cache, own_cache / '_cacache')
            else:
                self.assertEqual(list(own_cache.iterdir()), [])
            originals = {name: (action / name).read_bytes()
                         for name in ('package.json', 'package-lock.json')}
            raw = root / '.cache/dmi-grib/own.grib'
            raw.parent.mkdir(parents=True)
            raw.write_bytes(own_raw)
            output = root / 'action-output'
            output.write_bytes(b'')
            env = runtime_environment()
            env.update({'GITHUB_REF': 'refs/heads/main', 'GITHUB_EVENT_NAME': 'workflow_dispatch',
                        'GITHUB_SERVER_URL': 'https://github.com', 'RUNNER_OS': 'Linux',
                        'GITHUB_OUTPUT': str(output), 'npm_config_offline': 'true'})
            # No API service URL, runtime token, INPUT_KEY or SDK substitution.
            logs = [(root / name).open('wb') for name in ('stdout', 'stderr')]
            parent = subprocess.Popen([str(NODE24), str(root / ENTRY), '--prepare-distribution'],
                                      cwd=root, env=env, stdin=subprocess.DEVNULL,
                                      stdout=logs[0], stderr=logs[1], start_new_session=True)
            fds['action'] = retain_pidfd(parent.pid)
            observed['action'] = identity(parent.pid)
            self.assertEqual(observed['action']['ppid'], os.getpid())
            cohort_pid = observe_child('cohort', parent.pid)
            worker_pid = observe_child('worker', cohort_pid)
            npm_pid = observe_child('npm', worker_pid)
            self.assertEqual(small(f'/proc/{cohort_pid}/cmdline').split(b'\0')[1:-1],
                             [b'-B', os.fsencode(root / COHORT), b'--prepare-distribution'])
            self.assertEqual(small(f'/proc/{worker_pid}/cmdline').split(b'\0')[:-1],
                             [os.fsencode(NODE24), os.fsencode(root / ENTRY), b'--fixed-distribution-worker'])
            self.assertEqual(Path(os.readlink(f'/proc/{npm_pid}/exe')).resolve(), NODE24)
            # Pause only our already kernel-identified npm object to observe
            # the real pending interval; this does not replace npm or SDK code.
            stop_fixed_npm_observation(npm_pid, fds['npm'], NODE24, npm_cli, observed['npm'])
            # The fork observation can precede setsid. The actual npm child
            # proves the worker has exec'd; keep its original pidfd and start.
            started_worker = identity(worker_pid)
            self.assertFalse(exited(fds['worker']), 'Worker exited before its session was proved')
            self.assertEqual(started_worker, {**observed['worker'],
                                            'pgid': worker_pid, 'sid': worker_pid})
            observed['worker'] = started_worker
            self.assertEqual((observed['npm']['pgid'], observed['npm']['sid']),
                             (worker_pid, worker_pid))
            self.assertNotEqual(observed['cohort']['pgid'], worker_pid)
            claim_fd = os.open(root / CLAIM, os.O_RDONLY | os.O_NOFOLLOW)
            claim_stat = os.fstat(claim_fd)
            claim_identity = (claim_stat.st_dev, claim_stat.st_ino)
            pipe_targets = {os.readlink(f'/proc/{cohort_pid}/fd/{fd}') for fd in (1, 2, 3)}
            self.assertEqual(len(pipe_targets), 3)
            self.assertTrue(all(value.startswith(('pipe:[', 'socket:[')) for value in pipe_targets))
            action_descriptors = {os.readlink(p) for p in Path(f'/proc/{parent.pid}/fd').iterdir()}
            # libuv socketpair endpoints have distinct inodes. This fixed
            # action opens no other sockets: require exactly the child cohort's
            # count, rather than accidentally counting Node's internal pipes.
            action_sockets = {value for value in action_descriptors if value.startswith('socket:[')}
            self.assertEqual(len(action_sockets),
                             len([value for value in pipe_targets if value.startswith('socket:[')]))
            action_child_pipes = {value for value in pipe_targets if value.startswith('pipe:[')}
            self.assertTrue(action_child_pipes.issubset(action_descriptors))
            pipe_targets = action_sockets | action_child_pipes
            self.assertEqual(len(pipe_targets), 3)
            assert_pending()
            # Observe the actual npm process while our retained pidfd has it
            # stopped. Distinct empty private files must replace the duplicate
            # /dev/null configuration, without borrowing any host npmrc.
            npm_environment = dict(item.split(b'=', 1) for item in
                                   small(f'/proc/{npm_pid}/environ').split(b'\0') if item)
            self.assertEqual(npm_environment[b'npm_config_cache'], os.fsencode(own_cache))
            self.assertEqual(npm_environment[b'npm_config_userconfig'], os.fsencode(config_paths[0]))
            self.assertEqual(npm_environment[b'npm_config_globalconfig'], os.fsencode(config_paths[1]))
            self.assertNotEqual(config_paths[0], config_paths[1])
            config_identities = []
            for config_path in config_paths:
                config_stat = config_path.lstat()
                self.assertEqual(config_path.resolve(strict=True), config_path)
                self.assertTrue(stat.S_ISREG(config_stat.st_mode))
                self.assertEqual((config_stat.st_size, config_stat.st_nlink,
                                  stat.S_IMODE(config_stat.st_mode)), (0, 1, 0o400))
                config_fd = os.open(config_path, os.O_RDONLY | os.O_NOFOLLOW)
                try:
                    opened_config = os.fstat(config_fd)
                    self.assertEqual((opened_config.st_dev, opened_config.st_ino),
                                     (config_stat.st_dev, config_stat.st_ino))
                    self.assertEqual(os.read(config_fd, 1), b'')
                    config_identities.append((opened_config.st_dev, opened_config.st_ino))
                finally:
                    os.close(config_fd)
                with self.assertRaises(OSError) as closed_config:
                    os.fstat(config_fd)
                self.assertEqual(closed_config.exception.errno, errno.EBADF)
            self.assertNotEqual(config_identities[0], config_identities[1])
            signal.pidfd_send_signal(fds['npm'], signal.SIGCONT)
            while not exited(fds['action']):
                if small(output):
                    self.assertTrue(warm, 'Failed offline installation cannot report ready')
                    self.assertEqual(small(output), b'distribution_ready=true\n')
                    assert_closed_boundary()
                time.sleep(0.001)
            parent.wait(timeout=1.0)
            assert_closed_boundary()
            self.assertEqual(parent.returncode, 0 if warm else 1)
            self.assertEqual(small(output), b'distribution_ready=true\n' if warm else b'')
            self.assertNotIn(b'saved=', small(output))
            self.assertEqual(small(root / 'stdout'), b'')
            self.assertEqual(small(root / 'stderr'), b'' if warm else (b'DMI_RAW_SAVE_REFUSED\n'
                b'DMI_RAW_SAVE_DIAGNOSTIC stage=API reason=DMI_RAW_SAVE_API_FAILED\n'))
            for name, contents in originals.items():
                self.assertEqual((action / name).read_bytes(), contents)
            if warm:
                # The unchanged normal prepare body reached its Node24
                # findPackageJSON resolver only AFTER this real npm ci.
                installed = action / 'node_modules/@actions/cache'
                metadata = json.loads((installed / 'package.json').read_text())
                self.assertEqual((metadata['name'], metadata['version']), ('@actions/cache', '6.1.0'))
                self.assertEqual(metadata['exports']['.']['import'], './lib/cache.js')
                self.assertEqual((installed / 'lib/cache.js').read_bytes(), (official / 'lib/cache.js').read_bytes())
                self.assertFalse((installed / 'lib/cache.js').is_symlink())
            else:
                # A generic setup failure is not the negative npm-cache proof.
                debug_logs = list((own_cache / '_logs').glob('*-debug-0.log'))
                self.assertEqual(len(debug_logs), 1)
                with debug_logs[0].open('rb') as handle:
                    debug = handle.read(65537)
                self.assertLessEqual(len(debug), 65536)
                self.assertTrue(any(line.endswith(b' error code ENOTCACHED')
                                    for line in debug.splitlines()),
                                'Actual npm must refuse the missing offline cache')
        finally:
            primary = sys.exc_info()[1]
            signal.setitimer(signal.ITIMER_REAL, CLEANUP_SECONDS)
            try:
                if 'npm' in fds and not exited(fds['npm']):
                    signal.pidfd_send_signal(fds['npm'], signal.SIGCONT)
                if 'action' in fds and not exited(fds['action']):
                    signal.pidfd_send_signal(fds['action'], signal.SIGTERM)
                    exited(fds['action'], 1.0)  # Request normal cohort shutdown first.
                for fd in fds.values():
                    if not exited(fd):
                        signal.pidfd_send_signal(fd, signal.SIGKILL)
                if parent is not None:
                    parent.wait(timeout=1.0)
                for fd in fds.values():
                    if not exited(fd, 1.0):
                        raise RuntimeError('OWN_DISTRIBUTION_STOP_UNPROVED; fixture retained')
                    try:
                        os.waitid(os.P_PIDFD, fd, os.WEXITED | os.WNOHANG)
                    except ChildProcessError:
                        pass
                no_children()
                for fd in [*fds.values(), *([] if claim_fd is None else [claim_fd])]:
                    os.close(fd)
                    with self.assertRaises(OSError) as closed:
                        os.fstat(fd)
                    self.assertEqual(closed.exception.errno, errno.EBADF)
                for handle in logs:
                    handle.close()
                    self.assertTrue(handle.closed)
                self.assertEqual(libc.prctl(36, previous.value, 0, 0, 0), 0)
                self.assertEqual(root.parent, temp_parent)
                self.assertTrue(root.name.startswith('rr-owned-distribution-'))
                shutil.rmtree(root)
                self.assertFalse(root.exists())
            except BaseException as cleanup_error:
                if primary is None:
                    raise
                primary.add_note(f'OWN_DISTRIBUTION_CLEANUP_UNPROVED:{type(cleanup_error).__name__}; fixture retained')
            finally:
                signal.setitimer(signal.ITIMER_REAL, 0)
                signal.signal(signal.SIGALRM, old_alarm)


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--node24-path', required=True,
                        help='Actual Node24 executable supplied by normal CI setup')
    parser.add_argument('--official-sdk-only', action='store_true',
                        help='Only real-SDK raw/cipher loopback cases; default runs all native cases')
    parser.add_argument('--distribution-only', action='store_true',
                        help='Only real npm prepare cases; requires the fixed warm offline cache')
    parser.add_argument('--terminal-deadline-only', action='store_true',
                        help='Only the held-Finalize deadline case on a genuinely aged Linux boot')
    args = parser.parse_args()
    if sum((args.official_sdk_only, args.distribution_only, args.terminal_deadline_only)) > 1:
        parser.error('Select at most one native class')
    if sys.platform != 'linux':
        raise SystemExit('NATIVE_LINUX_REQUIRED; syntax-only on other platforms, never PASS')
    NODE24 = Path(args.node24_path).resolve(strict=True)
    if NODE24.name != 'node' or not NODE24.is_file():
        raise SystemExit('EXPLICIT_NODE24_EXECUTABLE_REQUIRED')
    version = subprocess.run([str(NODE24), '--version'], env=runtime_environment(),
        stdin=subprocess.DEVNULL, capture_output=True, timeout=5, check=True)
    if not version.stdout.startswith(b'v24.') or version.stderr:
        raise SystemExit('ACTUAL_NODE24_REQUIRED; PATH Node22 is not evidence')
    selected = ['OwnedRawDistributionNative'] if args.distribution_only else (
        ['OwnedRawSaveOfficialSdkNative'] if args.official_sdk_only else (
            ['OwnedRawSaveOfficialSdkNative.terminal_deadline_evidence'] if args.terminal_deadline_only else []))
    unittest.main(argv=[sys.argv[0], *selected])
