#!/usr/bin/env python3
"""Fixed cache API/distribution cohort, never a caller-selected command runner.

The calling Node action retains its own opaque filesystem lease. This process
reports only physical closure of the selected fixed worker group; no success,
cache key, token or owner capability is transferred here.
"""
import json
import os
from pathlib import Path
import re
import select
import shlex
import shutil
import signal
import stat
import subprocess
import sys
import tempfile
import time

ROOT = Path(__file__).resolve().parent.parent
ENTRY = ROOT / '.github/actions/save-owned-dmi-grib/index.cjs'
SYSTEM_ZSTDMT = ('/usr/local/bin/zstdmt', '/usr/bin/zstdmt')
ARCHIVE_OBSERVER = 'RAVRADAR_DMI_RAW_ARCHIVE_OBSERVER'
ARCHIVE_REFUSAL = 'raw-archive-budget-exceeded'
_retained_children = []


def constrain_raw_archive_bytes():
    value = os.environ.get('RAVRADAR_DMI_RAW_ARCHIVE_MAX_BYTES')
    if value is None:
        return
    if not re.fullmatch(r'[1-9][0-9]{0,15}', value) or not 1024 <= int(value) < 2 ** 53:
        raise RuntimeError('DMI_RAW_SAVE_ARCHIVE_LIMIT_REFUSED')

    import resource
    inherited = resource.getrlimit(resource.RLIMIT_FSIZE)
    limit = min([int(value), *(bound for bound in inherited if bound != resource.RLIM_INFINITY)])
    resource.setrlimit(resource.RLIMIT_FSIZE, (limit, limit))
    return limit == int(value)


def install_archive_observer(scope, environment, codec):
    # Only the SDK's fixed Linux zstdmt command resolves differently, and only
    # within this owned worker. The genuine system compressor produces the bytes.
    shim = scope / 'zstdmt'
    python = shlex.quote(sys.executable)
    script = shlex.quote(str(Path(__file__).resolve()))
    shim.write_text(f'#!/bin/sh\nexec {python} -B {script} --fixed-zstdmt {shlex.quote(codec)} "$@"\n',
                    encoding='utf-8')
    shim.chmod(0o700)
    environment['RUNNER_TEMP'] = str(scope)
    environment[ARCHIVE_OBSERVER] = '1'
    environment['PATH'] = str(scope) + os.pathsep + environment['PATH']


def compress_owned_archive(codec, arguments):
    import resource

    scope = Path(os.environ['RUNNER_TEMP'])
    directory = Path.cwd()
    output = os.fstat(1)
    remaining = int(os.environ['RAVRADAR_DMI_RAW_ARCHIVE_MAX_BYTES'])
    with open(f'/proc/{os.getsid(0)}/cmdline', 'rb') as worker:
        worker_arguments = worker.read(16385).split(b'\0')
    if (codec not in SYSTEM_ZSTDMT or not os.access(codec, os.X_OK)
            or os.environ.get(ARCHIVE_OBSERVER) != '1' or arguments not in ([], ['--long=30'])
            or worker_arguments[1:] != [os.fsencode(ENTRY), b'--fixed-api-worker', b'']
            or directory.parent != scope or not stat.S_ISREG(output.st_mode) or output.st_size != 0
            or not os.path.samestat(output, (directory / 'cache.tzst').lstat())
            or resource.getrlimit(resource.RLIMIT_FSIZE) != (remaining, remaining)):
        raise RuntimeError('DMI_RAW_SAVE_ARCHIVE_OBSERVER_REFUSED')

    with subprocess.Popen([codec, *arguments], stdout=subprocess.PIPE) as compressor:
        while chunk := os.read(compressor.stdout.fileno(), 65536):
            if len(chunk) > remaining:
                compressor.kill()
                compressor.wait()
                (scope / ARCHIVE_REFUSAL).touch(mode=0o600, exist_ok=False)
                # GNU tar must fail before the pinned SDK can reserve a cache.
                return 1
            sys.stdout.buffer.write(chunk)
            remaining -= len(chunk)
        sys.stdout.buffer.flush()
        return 0 if compressor.wait() == 0 else 1


def main():
    distribution = sys.argv[1:] == ['--prepare-distribution']
    ciphertext = sys.argv[1:] == ['--upload-encrypted-progress']
    if (sys.platform != 'linux' or (len(sys.argv) != 1 and not distribution and not ciphertext)
            or signal.getsignal(signal.SIGCHLD) != signal.SIG_DFL
            or not all(hasattr(os, name) for name in ('waitid', 'WNOWAIT', 'WEXITED', 'WNOHANG', 'pidfd_open'))):
        raise RuntimeError('DMI_RAW_SAVE_PLATFORM_REFUSED')
    # Use the actual action's executable, not PATH, a caller executable argument
    # or an assumed runner installation directory.
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
            or (ciphertext and (parent_fields[1:] != [os.fsencode(str(ENTRY))]
                                or os.environ.get('INPUT_OPERATION') != 'upload-encrypted-progress'))):
        raise RuntimeError('DMI_RAW_SAVE_PARENT_UNPROVED')
    os.fstat(3)  # Own inherited private IPC pipe, never a path supplied by callers.
    pending = None
    previous = []
    child = None
    reaped = False
    group_closed = False
    archive_scope = None
    first_failure = None
    parent_fd = None
    parent_poll = None

    def interrupt(signum, _frame):
        nonlocal pending
        pending = pending or signum

    def require_parent_live():
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
        if reaped:
            return
        os.waitid(os.P_PID, child.pid, os.WEXITED | os.WNOHANG | os.WNOWAIT)
        if os.getpgid(child.pid) != child.pid or os.getsid(child.pid) != child.pid:
            raise RuntimeError('DMI_RAW_SAVE_GROUP_UNPROVED')
        os.killpg(child.pid, signum)

    def close_group():
        nonlocal reaped, first_failure, group_closed
        while True:
            if first_failure is None:
                try:
                    require_parent_live()
                except BaseException as error:
                    first_failure = error
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
                    group_closed = True
                    return
            # There is deliberately no invented finite cleanup guarantee. Unknown
            # group absence never becomes a receipt or permission to release.
            time.sleep(0.01)

    try:
        parent_fd = os.pidfd_open(parent_pid, 0)
        parent_poll = select.poll()
        parent_poll.register(parent_fd, select.POLLIN)
        # Close the open/parent-exit race before creating any worker.
        require_parent_live()
        for signum in (signal.SIGTERM, signal.SIGINT):
            previous.append((signum, signal.signal(signum, interrupt)))
        if pending:
            raise RuntimeError('DMI_RAW_SAVE_INTERRUPTED')
        fixed_worker = ('--fixed-distribution-worker' if distribution else
                        '--fixed-cipher-worker' if ciphertext else '--fixed-api-worker')
        environment = os.environ.copy()
        environment.pop(ARCHIVE_OBSERVER, None)
        # Only this owned RAW SAVE cohort and its archive subprocesses
        # inherit the limit. It does not alter the acquisition directory.
        if not distribution and not ciphertext and constrain_raw_archive_bytes():
            codec = shutil.which('zstdmt', path=environment.get('PATH'))
            if codec and environment.get('RUNNER_TEMP'):
                # GitHub's Ubuntu image uses /usr/local/bin; distro packages use /usr/bin.
                for system_codec in SYSTEM_ZSTDMT:
                    if os.access(system_codec, os.X_OK) and os.path.samefile(codec, system_codec):
                        temp = Path(environment['RUNNER_TEMP']).resolve(strict=True)
                        archive_scope = Path(tempfile.mkdtemp(prefix='rr-dmi-raw-archive-', dir=temp))
                        install_archive_observer(archive_scope, environment, system_codec)
                        break
        child = subprocess.Popen([parent_executable, str(ENTRY), fixed_worker],
                                 cwd=ROOT, env=environment, start_new_session=True,
                                 stdin=subprocess.DEVNULL, stdout=subprocess.DEVNULL,
                                 stderr=subprocess.DEVNULL, pass_fds=(3,))
        close_group()
        if first_failure is not None:
            raise first_failure
        require_parent_live()
    except BaseException as error:
        if first_failure is None:
            first_failure = error
        if child is not None:
            try:
                close_group()
            except BaseException:
                _retained_children.append(child)
        raise first_failure
    finally:
        for signum, handler in reversed(previous):
            signal.signal(signum, handler)
        if parent_fd is not None:
            try:
                os.close(parent_fd)
                try:
                    os.fstat(parent_fd)
                except OSError as error:
                    if error.errno != 9:
                        raise
                else:
                    raise RuntimeError('DMI_RAW_SAVE_PARENT_FD_NOT_CLOSED')
            except BaseException:
                # Never replace the first owner/worker/closure failure.
                # A normal close failure still refuses before the fd3 ABI.
                if first_failure is None:
                    raise
        if archive_scope is not None and (child is None or group_closed):
            try:
                shutil.rmtree(archive_scope)
            except OSError:
                if first_failure is None:
                    raise
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
        if sys.argv[1:2] == ['--fixed-zstdmt']:
            result = compress_owned_archive(sys.argv[2], sys.argv[3:])
        else:
            main()
            result = 0
    except BaseException:
        print('DMI_RAW_SAVE_COHORT_REFUSED', file=sys.stderr)
        sys.exit(1)
    sys.exit(result)
