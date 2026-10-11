#!/usr/bin/env python3
"""Fixed cache API/distribution cohort, never a caller-selected command runner.

The calling Node action retains its own opaque filesystem lease. This process
reports only physical closure of the selected fixed worker group; no success,
cache key, token or owner capability is transferred here.
"""
import json
import os
from pathlib import Path
import signal
import subprocess
import sys
import time

ROOT = Path(__file__).resolve().parent.parent
ENTRY = ROOT / '.github/actions/save-owned-dmi-grib/index.cjs'
_retained_children = []


def main():
    distribution = sys.argv[1:] == ['--prepare-distribution']
    ciphertext = sys.argv[1:] == ['--upload-encrypted-progress']
    if (sys.platform != 'linux' or (len(sys.argv) != 1 and not distribution and not ciphertext)
            or signal.getsignal(signal.SIGCHLD) != signal.SIG_DFL
            or not all(hasattr(os, name) for name in ('waitid', 'WNOWAIT', 'WEXITED', 'WNOHANG'))):
        raise RuntimeError('DMI_RAW_SAVE_PLATFORM_REFUSED')
    # Use the actual action's executable, not PATH, a caller executable argument
    # or an assumed runner installation directory.
    parent_pid = os.getppid()
    parent_executable = os.readlink(f'/proc/{parent_pid}/exe')
    with open(f'/proc/{parent_pid}/cmdline', 'rb') as handle:
        parent_argv = handle.read(16385)
    parent_fields = parent_argv.split(b'\0')[:-1]
    if (len(parent_argv) > 16384 or os.getppid() != parent_pid
            or Path(parent_executable).name != 'node'
            or os.fsencode(str(ENTRY)) not in parent_fields
            or (distribution and parent_fields[1:] != [os.fsencode(str(ENTRY)), b'--prepare-distribution'])
            or (ciphertext and (parent_fields[1:] != [os.fsencode(str(ENTRY))]
                                or os.environ.get('INPUT_OPERATION') != 'upload-encrypted-progress'))):
        raise RuntimeError('DMI_RAW_SAVE_PARENT_UNPROVED')
    os.fstat(3)  # Own inherited private IPC pipe, never a path supplied by callers.
    pending = None
    previous = []
    child = None
    reaped = False
    first_failure = None

    def interrupt(signum, _frame):
        nonlocal pending
        pending = pending or signum

    def signal_owned_group(signum):
        if reaped:
            return
        os.waitid(os.P_PID, child.pid, os.WEXITED | os.WNOHANG | os.WNOWAIT)
        if os.getpgid(child.pid) != child.pid or os.getsid(child.pid) != child.pid:
            raise RuntimeError('DMI_RAW_SAVE_GROUP_UNPROVED')
        os.killpg(child.pid, signum)

    def close_group():
        nonlocal reaped
        while True:
            if not reaped:
                observed = os.waitid(os.P_PID, child.pid, os.WEXITED | os.WNOHANG | os.WNOWAIT)
                if pending or first_failure or observed is not None:
                    signal_owned_group(signal.SIGKILL)
                if observed is not None:
                    child.wait()
                    reaped = True
            if reaped:
                try:
                    os.killpg(child.pid, 0)
                except ProcessLookupError:
                    return
            # There is deliberately no invented finite cleanup guarantee. Unknown
            # group absence never becomes a receipt or permission to release.
            time.sleep(0.01)

    try:
        for signum in (signal.SIGTERM, signal.SIGINT):
            previous.append((signum, signal.signal(signum, interrupt)))
        if pending:
            raise RuntimeError('DMI_RAW_SAVE_INTERRUPTED')
        fixed_worker = ('--fixed-distribution-worker' if distribution else
                        '--fixed-cipher-worker' if ciphertext else '--fixed-api-worker')
        child = subprocess.Popen([parent_executable, str(ENTRY), fixed_worker],
                                 cwd=ROOT, env=os.environ.copy(), start_new_session=True,
                                 stdin=subprocess.DEVNULL, stdout=subprocess.DEVNULL,
                                 stderr=subprocess.DEVNULL, pass_fds=(3,))
        close_group()
    except BaseException as error:
        first_failure = error
        if child is not None:
            try:
                close_group()
            except BaseException:
                _retained_children.append(child)
        raise
    finally:
        for signum, handler in reversed(previous):
            signal.signal(signum, handler)
    # Normal exit can report a failed worker as closed, not as a successful SAVE.
    # Parent still requires the independent exact typed v2 IPC and its own lease.
    os.close(3)
    try:
        os.fstat(3)
    except OSError as error:
        if error.errno != 9:
            raise
    else:
        raise RuntimeError('DMI_RAW_SAVE_PIPE_NOT_CLOSED')
    print(json.dumps({'schemaVersion': 1, 'kind': 'DMI_RAW_SAVE_COHORT_CLOSED',
                      'workerExitCode': child.returncode, 'interrupted': pending is not None}), flush=True)


if __name__ == '__main__':
    try:
        main()
    except BaseException:
        print('DMI_RAW_SAVE_COHORT_REFUSED', file=sys.stderr)
        sys.exit(1)
