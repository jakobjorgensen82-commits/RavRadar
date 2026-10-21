#!/usr/bin/env python3
"""Fixed cache API/distribution cohort, never a caller-selected command runner.

The calling Node action retains its own opaque filesystem lease. This process
reports only physical closure of the selected fixed worker group; no success,
cache key, token or owner capability is transferred here.
"""
import json
import os
from pathlib import Path
import select
import signal
import subprocess
import sys
import time

ROOT = Path(__file__).resolve().parent.parent
ENTRY = ROOT / '.github/actions/save-owned-dmi-grib/index.cjs'
_retained_children = []


# Observation only. These fields cannot issue closure, release or SAVE.
_cohort_stage = 'PLATFORM'
_cohort_first_diagnostic = None
_COHORT_STAGES = frozenset(('PLATFORM', 'PARENT_GUARD', 'API_FD_GUARD',
    'PARENT_PIDFD', 'PARENT_LIVE', 'SIGNAL_SETUP', 'WORKER_SPAWN', 'WORKER_WAIT',
    'OWNED_GROUP_SIGNAL', 'GROUP_ABSENCE', 'SIGNAL_RESTORE', 'PARENT_FD_CLOSE',
    'API_FD_CLOSE', 'CLOSURE_WRITE'))
_COHORT_REASONS = frozenset(('DMI_RAW_SAVE_PLATFORM_REFUSED',
    'DMI_RAW_SAVE_PARENT_UNPROVED', 'DMI_RAW_SAVE_PARENT_LOST',
    'DMI_RAW_SAVE_GROUP_UNPROVED', 'DMI_RAW_SAVE_INTERRUPTED',
    'DMI_RAW_SAVE_PARENT_FD_NOT_CLOSED', 'DMI_RAW_SAVE_PIPE_NOT_CLOSED'))
_COHORT_ERRNOS = {2: 'ENOENT', 3: 'ESRCH', 4: 'EINTR', 5: 'EIO', 9: 'EBADF',
    10: 'ECHILD', 12: 'ENOMEM', 13: 'EACCES', 22: 'EINVAL', 24: 'EMFILE', 32: 'EPIPE'}


def _observe_cohort_first_failure(error):
    global _cohort_first_diagnostic
    if _cohort_first_diagnostic is not None:
        return
    reason, number = 'UNKNOWN', 'NONE'
    if type(error) is RuntimeError and str(error) in _COHORT_REASONS:
        reason = str(error)
    elif isinstance(error, OSError):
        reason = 'OS_ERROR'
        number = _COHORT_ERRNOS.get(error.errno, 'UNKNOWN')
    _cohort_first_diagnostic = (_cohort_stage if _cohort_stage in _COHORT_STAGES
        else 'UNKNOWN', reason, number)


def _cohort_first_failure_line():
    stage, reason, number = _cohort_first_diagnostic or ('UNKNOWN', 'UNKNOWN', 'UNKNOWN')
    return (f'DMI_RAW_SAVE_COHORT_DIAGNOSTIC stage={stage} reason={reason} '
            f'errno={number}')


def main():
    global _cohort_stage
    distribution = sys.argv[1:] == ['--prepare-distribution']
    ciphertext = sys.argv[1:] == ['--upload-encrypted-progress']
    cache_selection = ('checkpoint' if sys.argv[1:] == ['--source-checkpoint-cache-save'] else
                       'preflight' if sys.argv[1:] == ['--source-preflight-cache-save'] else None)
    if (sys.platform != 'linux' or (len(sys.argv) != 1 and not distribution and not ciphertext and cache_selection is None)
            or signal.getsignal(signal.SIGCHLD) != signal.SIG_DFL
            or not all(hasattr(os, name) for name in ('waitid', 'WNOWAIT', 'WEXITED', 'WNOHANG', 'pidfd_open'))):
        raise RuntimeError('DMI_RAW_SAVE_PLATFORM_REFUSED')
    # Use the actual action's executable, not PATH, a caller executable argument
    # or an assumed runner installation directory.
    _cohort_stage = 'PARENT_GUARD'
    parent_pid = os.getppid()
    parent_executable = os.readlink(f'/proc/{parent_pid}/exe')
    with open(f'/proc/{parent_pid}/cmdline', 'rb') as handle:
        parent_argv = handle.read(16385)
    parent_fields = parent_argv.split(b'\0')[:-1]
    # Local actions can spell the same absolute script with redundant /./.
    # Remove only that exact component in SCRIPT, never resolve caller paths,
    # follow a symlink alias, collapse //, accept .., or normalize other argv.
    if len(parent_fields) > 1:
        script = parent_fields[1]
        while b'/./' in script:
            script = script.replace(b'/./', b'/')
        if script == os.fsencode(str(ENTRY)):
            parent_fields[1] = script
    if (len(parent_argv) > 16384 or os.getppid() != parent_pid
            or Path(parent_executable).name != 'node'
            or os.fsencode(str(ENTRY)) not in parent_fields
            or (distribution and parent_fields[1:] != [os.fsencode(str(ENTRY)), b'--prepare-distribution'])
            or (ciphertext and (parent_fields[1:] not in (
                [os.fsencode(str(ENTRY))],
                [os.fsencode(str(ENTRY)), b'--source-fixed-cipher-upload'])
                                or os.environ.get('INPUT_OPERATION') != 'upload-encrypted-progress'))
            or (cache_selection is not None and (
                parent_fields[1:] != [os.fsencode(str(ENTRY)), f'--source-fixed-{cache_selection}-save'.encode()]
                or os.environ.get('INPUT_OPERATION') != f'source-{cache_selection}-cache-save'))):
        raise RuntimeError('DMI_RAW_SAVE_PARENT_UNPROVED')
    _cohort_stage = 'API_FD_GUARD'
    os.fstat(3)  # Own inherited private IPC pipe, never a path supplied by callers.
    pending = None
    previous = []
    child = None
    reaped = False
    first_failure = None
    parent_fd = None
    parent_poll = None

    def interrupt(signum, _frame):
        nonlocal pending
        pending = pending or signum

    def require_parent_live():
        global _cohort_stage
        _cohort_stage = 'PARENT_LIVE'
        # Observe only the already verified actual parent. No pathname, JSON
        # PID, elapsed lease or reparenting can transfer its ownership.
        if os.getppid() != parent_pid:
            raise RuntimeError('DMI_RAW_SAVE_PARENT_LOST')
        events = parent_poll.poll(0)
        if events:
            if any(fd != parent_fd or flags != select.POLLIN for fd, flags in events):
                raise RuntimeError('DMI_RAW_SAVE_PARENT_UNPROVED')
            raise RuntimeError('DMI_RAW_SAVE_PARENT_LOST')
        if os.getppid() != parent_pid:
            raise RuntimeError('DMI_RAW_SAVE_PARENT_LOST')

    def signal_owned_group(signum):
        global _cohort_stage
        _cohort_stage = 'OWNED_GROUP_SIGNAL'
        if reaped:
            return
        os.waitid(os.P_PID, child.pid, os.WEXITED | os.WNOHANG | os.WNOWAIT)
        if os.getpgid(child.pid) != child.pid or os.getsid(child.pid) != child.pid:
            raise RuntimeError('DMI_RAW_SAVE_GROUP_UNPROVED')
        os.killpg(child.pid, signum)

    def close_group():
        global _cohort_stage
        nonlocal reaped, first_failure
        while True:
            if first_failure is None:
                try:
                    require_parent_live()
                except BaseException as error:
                    _observe_cohort_first_failure(error)
                    first_failure = error
            if not reaped:
                _cohort_stage = 'WORKER_WAIT'
                observed = os.waitid(os.P_PID, child.pid, os.WEXITED | os.WNOHANG | os.WNOWAIT)
                if pending or first_failure or observed is not None:
                    signal_owned_group(signal.SIGKILL)
                if observed is not None:
                    _cohort_stage = 'WORKER_WAIT'
                    child.wait()
                    reaped = True
            if reaped:
                try:
                    _cohort_stage = 'GROUP_ABSENCE'
                    os.killpg(child.pid, 0)
                except ProcessLookupError:
                    return
            # There is deliberately no invented finite cleanup guarantee. Unknown
            # group absence never becomes a receipt or permission to release.
            time.sleep(0.01)

    try:
        _cohort_stage = 'PARENT_PIDFD'
        parent_fd = os.pidfd_open(parent_pid, 0)
        parent_poll = select.poll()
        parent_poll.register(parent_fd, select.POLLIN)
        # Close the open/parent-exit race before creating any worker.
        require_parent_live()
        _cohort_stage = 'SIGNAL_SETUP'
        for signum in (signal.SIGTERM, signal.SIGINT):
            previous.append((signum, signal.signal(signum, interrupt)))
        if pending:
            raise RuntimeError('DMI_RAW_SAVE_INTERRUPTED')
        fixed_worker = ('--fixed-distribution-worker' if distribution else
                        '--fixed-cipher-worker' if ciphertext else
                        f'--fixed-{cache_selection}-worker' if cache_selection is not None else '--fixed-api-worker')
        _cohort_stage = 'WORKER_SPAWN'
        child = subprocess.Popen([parent_executable, str(ENTRY), fixed_worker],
                                 cwd=ROOT, env=os.environ.copy(), start_new_session=True,
                                 stdin=subprocess.DEVNULL, stdout=subprocess.DEVNULL,
                                 stderr=subprocess.DEVNULL, pass_fds=(3,))
        close_group()
        if first_failure is not None:
            raise first_failure
        require_parent_live()
    except BaseException as error:
        if first_failure is None:
            _observe_cohort_first_failure(error)
            first_failure = error
        if child is not None:
            try:
                close_group()
            except BaseException:
                _retained_children.append(child)
        raise first_failure
    finally:
        _cohort_stage = 'SIGNAL_RESTORE'
        for signum, handler in reversed(previous):
            signal.signal(signum, handler)
        if parent_fd is not None:
            try:
                _cohort_stage = 'PARENT_FD_CLOSE'
                os.close(parent_fd)
                try:
                    os.fstat(parent_fd)
                except OSError as error:
                    if error.errno != 9:
                        raise
                else:
                    raise RuntimeError('DMI_RAW_SAVE_PARENT_FD_NOT_CLOSED')
            except BaseException as error:
                # Never replace the first owner/worker/closure failure.
                # A normal close failure still refuses before the fd3 ABI.
                if first_failure is None:
                    _observe_cohort_first_failure(error)
                    raise
    # Normal exit can report a failed worker as closed, not as a successful SAVE.
    # Parent still requires the independent exact typed v2 IPC and its own lease.
    _cohort_stage = 'API_FD_CLOSE'
    os.close(3)
    try:
        os.fstat(3)
    except OSError as error:
        if error.errno != 9:
            raise
    else:
        raise RuntimeError('DMI_RAW_SAVE_PIPE_NOT_CLOSED')
    _cohort_stage = 'CLOSURE_WRITE'
    print(json.dumps({'schemaVersion': 1, 'kind': 'DMI_RAW_SAVE_COHORT_CLOSED',
                      'workerExitCode': child.returncode, 'interrupted': pending is not None}), flush=True)


if __name__ == '__main__':
    try:
        main()
    except BaseException as error:
        _observe_cohort_first_failure(error)
        print('DMI_RAW_SAVE_COHORT_REFUSED', file=sys.stderr)
        try:
            print(_cohort_first_failure_line(), file=sys.stderr)
        except BaseException:
            pass  # A diagnostic stream failure cannot change the existing exit.
        sys.exit(1)
