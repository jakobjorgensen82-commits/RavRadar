"""Native Linux test of the fixed action -> Python cohort -> API worker.

The original process cases use an explicitly synthetic @actions/cache package.
The additional SDK cases use the installed, locked official 6.1.0 distribution
unchanged: only its HTTP service is a test-owned loopback protocol fixture.
Product sources and the claim module are copied byte-for-byte into an own
temporary checkout. No hosted cache, real credentials, preload or process
interceptor is used. CI must supply an actual Node24 executable with
--node24-path; missing Linux/Node24/tools is failure, never a passing skip.
The distribution cases run the actual runtime npm against only the fixed own
offline cache; a missing warm cache is a prerequisite failure, never a skip.
None proves hosted durability, runner loss or all-writer exclusion.
"""
from __future__ import annotations

import argparse
import ctypes
import errno
import json
import os
from pathlib import Path
import select
import shutil
import signal
import stat
import subprocess
import sys
import tempfile
import time
import unittest


ROOT = Path(__file__).resolve().parents[1]
ENTRY = Path('.github/actions/save-owned-dmi-grib/index.cjs')
COHORT = Path('scripts/run-owned-dmi-grib-save.py')
CLAIM_MODULE = Path('scripts/lib/weather-acquisition-writer.mjs')
CLAIM = Path('.cache/weather-acquisition-writer.claim')
NODE24 = None
BODY_SECONDS = 8.0  # Own fixture observer, not a new product deadline.
CLEANUP_SECONDS = 3.0

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


class OwnedRawSaveNative(unittest.TestCase):
    def test_healthy_actual_action_cohort_and_claim_close_before_saved(self):
        self.actual_chain(interrupt=False)

    def test_interrupt_stops_term_ignoring_descendant_before_reap_and_never_saves(self):
        self.actual_chain(interrupt=True)

    def actual_chain(self, *, interrupt):
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
            if interrupt:
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
            parent = subprocess.Popen([str(NODE24), str(root / ENTRY)], cwd=root, env=environment,
                stdin=subprocess.DEVNULL, stdout=logs[0], stderr=logs[1])
            fds['action'] = retain_pidfd(parent.pid)
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
            self.assertEqual(small(root / 'stderr'), b'DMI_RAW_SAVE_REFUSED\n' if interrupt else b'')
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

    def test_official_sdk_finalize_http_200_false_never_saves(self):
        self.official_chain(finalize_ok=False)

    def official_chain(self, *, finalize_ok):
        import hashlib
        from http.server import BaseHTTPRequestHandler, HTTPServer

        self.assertEqual(sys.platform, 'linux', 'NATIVE_LINUX_REQUIRED; not a skip')
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
        parent = server = None
        fds, observed, logs, calls = {}, {}, [], []
        claim_fd = None
        claim_identity = None
        archive_bytes = None
        archive_version = None
        finished = False
        server_failure = []
        old_alarm = signal.getsignal(signal.SIGALRM)
        own_raw = b'synthetic raw original\n'
        key = 'dmi-grib-v4-Linux-2026-W41-17-1'
        service = '/twirp/github.actions.results.api.v1.CacheService/'
        case = self

        def deadline(_number, _frame):
            raise TimeoutError('OWN_OFFICIAL_SDK_OBSERVER_DEADLINE')

        def observe_chain():
            nonlocal claim_fd, claim_identity
            ancestor = parent.pid
            for role in ('cohort', 'worker'):
                children = small(f'/proc/{ancestor}/task/{ancestor}/children').split()
                case.assertEqual(len(children), 1, 'Only the fixed direct child may qualify')
                pid = int(children[0])
                fds[role] = retain_pidfd(pid)
                observed[role] = identity(pid)
                case.assertEqual(observed[role]['ppid'], ancestor)
                ancestor = pid
            worker, cohort = observed['worker'], observed['cohort']
            case.assertEqual((worker['pgid'], worker['sid']), (worker['pid'], worker['pid']))
            case.assertNotEqual(cohort['pgid'], worker['pgid'])
            case.assertEqual(small(f"/proc/{worker['pid']}/cmdline").split(b'\0')[:-1],
                [os.fsencode(NODE24), os.fsencode(root / ENTRY), b'--fixed-api-worker'])
            case.assertEqual(small(f"/proc/{cohort['pid']}/cmdline").split(b'\0')[1:-1],
                [b'-B', os.fsencode(root / COHORT)])
            claim_fd = os.open(root / CLAIM, os.O_RDONLY | os.O_NOFOLLOW)
            stat = os.fstat(claim_fd)
            claim_identity = (stat.st_dev, stat.st_ino)
            case.assertEqual(os.read(claim_fd, 1), b'')

        def assert_pending():
            for role in ('action', 'cohort', 'worker'):
                case.assertFalse(exited(fds[role]), f'{role} exited before finalization')
            for role, value in observed.items():
                case.assertEqual(identity(value['pid']), value)
            own_stat, current = os.fstat(claim_fd), (root / CLAIM).lstat()
            case.assertEqual((own_stat.st_dev, own_stat.st_ino), claim_identity)
            case.assertEqual((current.st_dev, current.st_ino), claim_identity)
            case.assertEqual(small(root / CLAIM), b'')
            case.assertEqual(small(root / 'action-output'), b'')
            case.assertEqual((root / '.cache/dmi-grib/own.grib').read_bytes(), own_raw)
            os.killpg(observed['worker']['pid'], 0)  # Observation, not a signal.

        class Transport(HTTPServer):
            allow_reuse_address = False

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
                    calls.append('finalize')
                    self.reply(200, {'ok': finalize_ok, 'entry_id': '17' if finalize_ok else '0'})
                    finished = True
                else:
                    raise AssertionError('Unexpected official SDK endpoint')

            def do_PUT(self):
                nonlocal archive_bytes
                case.assertEqual(self.path, '/ownaccount/cache/archive')
                case.assertEqual(calls, ['create'])
                case.assertEqual(self.headers.get('x-ms-blob-type'), 'BlockBlob')
                archive_bytes = self.body(1024 * 1024)
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
                case.assertEqual(sorted(names), ['.cache/dmi-grib/', '.cache/dmi-grib/own.grib'])
                extracted = subprocess.run([tar, '-xOf', str(archive), '.cache/dmi-grib/own.grib'],
                    cwd=root, env=runtime_environment(), stdin=subprocess.DEVNULL,
                    capture_output=True, timeout=1, check=True)
                case.assertEqual(extracted.stdout, own_raw)
                case.assertEqual(listing.stderr + extracted.stderr, b'')
                calls.append('put')
                self.reply(201)

        signal.signal(signal.SIGALRM, deadline)
        signal.setitimer(signal.ITIMER_REAL, BODY_SECONDS)
        try:
            for relative in (ENTRY, COHORT, CLAIM_MODULE, ENTRY.parent / 'package.json',
                             ENTRY.parent / 'package-lock.json'):
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
            # Read-only dependency reference; no npm, SDK rewrite or package shim.
            (root / ENTRY.parent / 'node_modules').symlink_to(dependency, target_is_directory=True)
            raw = root / '.cache/dmi-grib/own.grib'
            raw.parent.mkdir(parents=True)
            raw.write_bytes(own_raw)
            (root / 'sdk-temp').mkdir()
            output = root / 'action-output'
            output.write_bytes(b'')
            server = Transport(('127.0.0.1', 0), Handler)
            server.timeout = 0.02
            environment = runtime_environment()
            environment.update({'PYTHONDONTWRITEBYTECODE': '1', 'PYTHONNOUSERSITE': '1',
                'INPUT_PATH': '.cache/dmi-grib', 'INPUT_KEY': key,
                'GITHUB_REF': 'refs/heads/main', 'GITHUB_EVENT_NAME': 'workflow_dispatch',
                'GITHUB_RUN_ID': '17', 'GITHUB_RUN_ATTEMPT': '1', 'RUNNER_OS': 'Linux',
                'GITHUB_SERVER_URL': 'https://github.com', 'ACTIONS_CACHE_SERVICE_V2': '1',
                'GITHUB_WORKSPACE': str(root), 'RUNNER_TEMP': str(root / 'sdk-temp'),
                'ACTIONS_RESULTS_URL': f'http://127.0.0.1:{server.server_port}',
                'ACTIONS_RUNTIME_TOKEN': 'own-synthetic-token', 'GITHUB_OUTPUT': str(output)})
            for name in ('stdout', 'stderr'):
                logs.append((root / name).open('wb'))
            parent = subprocess.Popen([str(NODE24), str(root / ENTRY)], cwd=root, env=environment,
                stdin=subprocess.DEVNULL, stdout=logs[0], stderr=logs[1])
            fds['action'] = retain_pidfd(parent.pid)
            while not finished:
                self.assertFalse(exited(fds['action']), 'Official SDK exited before complete protocol')
                server.handle_request()
                if server_failure:
                    raise server_failure[0]
            self.assertEqual(parent.wait(timeout=1.0), 0 if finalize_ok else 1)
            for role in ('action', 'cohort', 'worker'):
                self.assertTrue(exited(fds[role]), f'{role} actual exit required')
            with self.assertRaises(ProcessLookupError):
                os.killpg(observed['worker']['pid'], 0)
            self.assertEqual(calls, ['create', 'put', 'finalize'])
            self.assertFalse((root / CLAIM).exists())
            self.assertEqual(small(output), b'saved=true\n' if finalize_ok else b'')
            self.assertEqual(small(root / 'stdout'), b'')
            self.assertEqual(small(root / 'stderr'), b'' if finalize_ok else b'DMI_RAW_SAVE_REFUSED\n')
            self.assertEqual(raw.read_bytes(), own_raw)
            self.assertFalse(any(p.name in {'cache.tgz', 'cache.tzst'}
                                 for p in (root / 'sdk-temp').rglob('*')), 'SDK archive still present')
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
                except (FileNotFoundError, ProcessLookupError):
                    self.assertTrue(exited(fds['action']), 'Process disappearance needs actual pidfd exit')
                    descriptors = []
                remaining = set()
                for item in descriptors:
                    try:
                        remaining.add(os.readlink(item))
                    except FileNotFoundError:
                        pass  # Closed during this inventory; never qualifies an open pipe.
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
            npm_command = small(f'/proc/{npm_pid}/cmdline').split(b'\0')[0]
            self.assertTrue(npm_command in (os.fsencode(NODE24), b'npm ci'),
                            'Actual npm may set its process title; no alternate executable')
            worker = observed['worker']
            self.assertEqual((worker['pgid'], worker['sid']), (worker_pid, worker_pid))
            self.assertEqual((observed['npm']['pgid'], observed['npm']['sid']),
                             (worker_pid, worker_pid))
            self.assertNotEqual(observed['cohort']['pgid'], worker_pid)
            # Pause only our already kernel-identified npm object to observe
            # the real pending interval; this does not replace npm or SDK code.
            signal.pidfd_send_signal(fds['npm'], signal.SIGSTOP)
            while small(f'/proc/{npm_pid}/stat').decode('ascii').rsplit(')', 1)[1].split()[0] != 'T':
                self.assertFalse(exited(fds['npm']))
                time.sleep(0.001)
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
            self.assertEqual(small(root / 'stderr'), b'' if warm else b'DMI_RAW_SAVE_REFUSED\n')
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
                        help='Only the two real-SDK loopback cases; default runs all native cases')
    parser.add_argument('--distribution-only', action='store_true',
                        help='Only real npm prepare cases; requires the fixed warm offline cache')
    args = parser.parse_args()
    if args.official_sdk_only and args.distribution_only:
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
        ['OwnedRawSaveOfficialSdkNative'] if args.official_sdk_only else [])
    unittest.main(argv=[sys.argv[0], *selected])
