"""Private subset lifetime barrier; no new session escapes the outer owner.

Linux child adoption and pidfds are required, not a /proc absence receipt.
The normal component CLI is sequential and must have no ambient children.
This is not an all-writer/workflow lock or a runner-loss recovery receipt.
"""
from __future__ import annotations

import ctypes
import os
import signal
import subprocess
import sys
import threading
import time
from pathlib import Path


STOP_UNPROVED_EXIT = 77
_LOCK = threading.Lock()
# Preserve the exact first exception, owner and work objects. Exception text
# is never a stop certificate, and built-in exceptions need not be weakrefable.
_UNPROVED: dict[int, tuple[BaseException, object, list]] = {}


def stop_unproved(error: BaseException) -> bool:
    value = _UNPROVED.get(id(error))
    return value is not None and value[0] is error


def _retain(error: BaseException, owner) -> None:
    _UNPROVED[id(error)] = (error, owner, [])


def retain_request(error: BaseException, temporary) -> None:
    if not stop_unproved(error):
        return
    # Strong retention alone does not prevent TemporaryDirectory's atexit
    # finalizer. Leave the exact owned request on disk on unknown cessation.
    temporary._finalizer.detach()
    _UNPROVED[id(error)][2].append(temporary)


def transfer_stop_error(original: BaseException, replacement: BaseException) -> None:
    if stop_unproved(original):
        value = _UNPROVED[id(original)]
        _UNPROVED[id(replacement)] = (replacement, value[1], value[2])


def require_closed_subset() -> None:
    if _UNPROVED:
        raise next(iter(_UNPROVED.values()))[0]


def _child_state():
    return os.waitid(os.P_ALL, 0, os.WEXITED | os.WNOHANG | os.WNOWAIT)


class _LinuxSubsetOwner:
    def __init__(self, deadline: float):
        self.deadline, self.libc, self.previous = deadline, None, None
        self.children_observed = False
        self.active = False

    def enter(self) -> None:
        if (threading.current_thread() is not threading.main_thread()
                or not all(hasattr(os, name) for name in
                           ("waitid", "P_PIDFD", "pidfd_open", "WNOWAIT"))
                or not hasattr(signal, "pidfd_send_signal")
                or signal.getsignal(signal.SIGCHLD) != signal.SIG_DFL):
            raise RuntimeError("CP_COMPONENT_SUBSET_COHORT_UNAVAILABLE")
        # CPython's sigaction setter clears SA_NOCLDWAIT. Do not accept an
        # ignored signal or an ambient reaper as an ECHILD ownership proof.
        signal.signal(signal.SIGCHLD, signal.SIG_DFL)
        try:
            _child_state()
        except ChildProcessError:
            pass
        else:
            raise RuntimeError("CP_COMPONENT_SUBSET_AMBIENT_CHILD_REFUSED")
        self.libc = ctypes.CDLL(None, use_errno=True)
        self.libc.prctl.restype = ctypes.c_int
        previous = ctypes.c_int()
        if self.libc.prctl(37, ctypes.byref(previous), 0, 0, 0) != 0:
            raise RuntimeError("CP_COMPONENT_SUBSET_COHORT_UNAVAILABLE")
        self.previous = previous.value
        if self.libc.prctl(36, 1, 0, 0, 0) != 0:
            raise RuntimeError("CP_COMPONENT_SUBSET_COHORT_UNAVAILABLE")
        self.active = True

    def drain(self) -> None:
        while True:
            try:
                state = _child_state()
            except ChildProcessError:
                return  # Kernel ECHILD, never an empty /proc snapshot.
            self.children_observed = True
            if state is not None:
                os.waitid(os.P_PID, state.si_pid, os.WEXITED | os.WNOHANG)
                continue
            if time.monotonic() >= self.deadline:
                raise RuntimeError("CP_COMPONENT_SUBSET_STOP_UNPROVED")
            # /proc children can omit live entries during exit. It only
            # supplies candidates; pidfd+waitid proves each candidate owned,
            # and the loop's P_ALL/ECHILD proves completion independently.
            tasks = Path("/proc/self/task")
            for task in tasks.iterdir():
                if not task.name.isdecimal():
                    continue
                try:
                    pids = (task / "children").read_text(encoding="ascii").split()
                except FileNotFoundError:
                    continue  # Thread ended; still require kernel ECHILD.
                for text in pids:
                    if time.monotonic() >= self.deadline:
                        raise RuntimeError("CP_COMPONENT_SUBSET_STOP_UNPROVED")
                    pid = int(text)
                    if pid <= 1 or pid == os.getpid():
                        raise RuntimeError("CP_COMPONENT_SUBSET_STOP_UNPROVED")
                    try:
                        descriptor = os.pidfd_open(pid, 0)
                    except ProcessLookupError:
                        continue
                    try:
                        try:
                            ended = os.waitid(os.P_PIDFD, descriptor,
                                os.WEXITED | os.WNOHANG | os.WNOWAIT)
                        except ChildProcessError:
                            continue  # Not this owner's child: never signal.
                        if ended is None:
                            try:
                                signal.pidfd_send_signal(descriptor, signal.SIGKILL)
                            except ProcessLookupError:
                                pass
                    finally:
                        os.close(descriptor)
            remaining = self.deadline - time.monotonic()
            if remaining <= 0:
                raise RuntimeError("CP_COMPONENT_SUBSET_STOP_UNPROVED")
            time.sleep(min(0.01, remaining))

    def leave(self) -> None:
        if self.active and self.libc.prctl(36, self.previous, 0, 0, 0) != 0:
            raise RuntimeError("CP_COMPONENT_SUBSET_STOP_UNPROVED")
        self.active = False


def run_subset(command: list[str], *, timeout: float, **kwargs):
    """Only the fixed normal transport calls this; injected test runs stay separate."""
    require_closed_subset()
    if sys.platform != "linux":
        # Existing Windows behavior is not upgraded to a subtree guarantee.
        # Its known real descendant regressions remain an explicit open gate.
        return subprocess.run(command, timeout=timeout, **kwargs)
    if not _LOCK.acquire(blocking=False):
        raise RuntimeError("CP_COMPONENT_SUBSET_CONCURRENT_OWNER_REFUSED")
    owner = _LinuxSubsetOwner(time.monotonic() + timeout)
    primary, completed, closed = None, None, False
    try:
        owner.enter()
        remaining = owner.deadline - time.monotonic()
        if remaining <= 0:
            raise subprocess.TimeoutExpired(command, timeout)
        try:
            # Inherit the outer Node cohort. No setsid/start_new_session or
            # inner PGID may escape its last-resort bounded stop.
            completed = subprocess.run(command, timeout=remaining, **kwargs)
        except BaseException as error:
            primary = error
        try:
            owner.drain()
            owner.leave()
            closed = True
        except BaseException:
            if primary is None:
                primary = RuntimeError("CP_COMPONENT_SUBSET_STOP_UNPROVED")
            _retain(primary, owner)
        if primary is not None:
            raise primary
        if owner.children_observed:
            # Do not promote bytes that were emitted before an orphan writer
            # was stopped. A later bounded attempt may obtain a new original.
            raise RuntimeError("CP_COMPONENT_SUBSET_WRITER_OUTLIVED_PARENT")
        return completed
    finally:
        if not owner.active:
            _LOCK.release()
        elif closed:
            _LOCK.release()

# Fixed SOURCE DMI child. The private control fd carries clock data, not a
# reusable stop certificate; only this invocation can consume the challenge.
def _source_read_exact(descriptor: int, size: int) -> bytes:
    result = bytearray()
    while len(result) < size:
        chunk = os.read(descriptor, size - len(result))
        if not chunk:
            raise RuntimeError("SOURCE_COHORT_CONTROL_EOF")
        result.extend(chunk)
    return bytes(result)


def _source_write_exact(descriptor: int, value: bytes) -> None:
    position = 0
    while position < len(value):
        written = os.write(descriptor, value[position:])
        if written <= 0:
            raise RuntimeError("SOURCE_COHORT_CONTROL_WRITE_FAILED")
        position += written


def _source_dmi_clock(descriptor: int):
    import struct
    import stat
    if (sys.platform != "linux" or sys.version_info[:2] != (3, 12)
            or threading.current_thread() is not threading.main_thread()
            or time.get_clock_info("monotonic").implementation != "clock_gettime(CLOCK_MONOTONIC)"
            or not stat.S_ISSOCK(os.fstat(descriptor).st_mode)):
        raise RuntimeError("SOURCE_COHORT_CLOCK_UNAVAILABLE")
    challenge = _source_read_exact(descriptor, 80)
    nonce = challenge[8:40]
    parent, run, attempt = struct.unpack(">IQQ", challenge[40:60])
    if (challenge[:8] != b"RRSCG4C1" or parent != os.getppid()
            or str(run) != os.environ.get("GITHUB_RUN_ID")
            or str(attempt) != os.environ.get("GITHUB_RUN_ATTEMPT")
            or challenge[60:80].hex() != os.environ.get("GITHUB_SHA")):
        raise RuntimeError("SOURCE_COHORT_CLOCK_IDENTITY_CHANGED")
    # The anchor is causally after the full challenge and before the full reply.
    anchor = time.monotonic_ns()
    _source_write_exact(descriptor, b"RRSCG4A1" + nonce
        + struct.pack(">IIQ", os.getpid(), parent, anchor))
    frame = _source_read_exact(descriptor, 56)
    job, stage = struct.unpack(">QQ", frame[40:56])
    if (frame[:8] != b"RRSCG4D1" or frame[8:40] != nonce
            or os.getppid() != parent or not (anchor < stage <= job <= 0x7fffffffffffffff)
            or stage <= time.monotonic_ns()):
        raise RuntimeError("SOURCE_COHORT_CLOCK_EXPIRED_OR_INVALID")
    _source_write_exact(descriptor, b"RRSCG4B1" + nonce + struct.pack(">Q", stage))
    return nonce, stage


def _source_failure_tighten_record(frame, *, nonce, phase, issued_cutoff_ns,
                                  observed_at_ns, previous=None):
    """Fixed failure clock only: never a stop, owner, SAVE or success receipt."""
    import struct
    from types import MappingProxyType
    if (type(frame) is not bytes or len(frame) != 49
            or frame[:8] != b'RRSCG4F1' or type(nonce) is not bytes or len(nonce) != 32
            or frame[8:40] != nonce or type(phase) is not int or not (0 <= phase <= 71 or phase in (72, 73, 74, 75, 76, 77, 78, 79, 80, 81, 82, 83))
            or frame[40] != phase or type(issued_cutoff_ns) is not int
            or type(observed_at_ns) is not int or observed_at_ns < 0):
        raise RuntimeError('SOURCE_FAILURE_TIGHTEN_INVALID')
    cutoff = struct.unpack('>Q', frame[41:49])[0]
    if not 0 < cutoff <= issued_cutoff_ns:
        raise RuntimeError('SOURCE_FAILURE_TIGHTEN_INVALID')
    if previous is not None:
        if (previous['kind'] != 'PARENT_FAILURE_TIGHTEN' or previous['nonce'] != nonce
                or previous['phase'] != phase or previous['cutoff_ns'] != cutoff):
            raise RuntimeError('SOURCE_FAILURE_TIGHTEN_INVALID')
        return previous  # An identical duplicate cannot reset even observation time.
    return MappingProxyType({'kind': 'PARENT_FAILURE_TIGHTEN', 'nonce': nonce,
        'phase': phase, 'cutoff_ns': cutoff, 'observed_at_ns': observed_at_ns})


def _source_failure_control(descriptor, nonce, phase, issued_cutoff_ns, owner):
    """Consume failure-only control/EOF, tighten the SAME owner, always refuse."""
    import math
    import select
    from types import MappingProxyType
    observed = time.monotonic_ns()
    raw = bytearray()
    while True:
        remaining = owner.deadline - time.monotonic()
        if remaining <= 0:
            raise RuntimeError('SOURCE_COHORT_CLOCK_EXPIRED_OR_INVALID')
        if not select.select([descriptor], [], [], remaining)[0]:
            raise RuntimeError('SOURCE_COHORT_CLOCK_EXPIRED_OR_INVALID')
        chunk = os.read(descriptor, 50 - len(raw))
        if not hasattr(owner, 'source_local_failure_record'):
            # Controller death has no parent-catch timestamp. Keep its honest
            # FIRST LOCAL observation separate, never rebrand it as parent time.
            local = MappingProxyType({'kind': 'LOCAL_CONTROLLER_EOF' if not chunk
                else 'LOCAL_CONTROLLER_FAILURE_CONTROL', 'observed_at_ns': observed,
                'cutoff_ns': min(issued_cutoff_ns, observed + 240_000_000_000)})
            owner.source_local_failure_record = local
            owner.deadline = min(owner.deadline, math.nextafter(local['cutoff_ns'] / 1_000_000_000, -math.inf))
        if not chunk:
            if raw and not hasattr(owner, 'source_failure_record'):
                record = _source_failure_tighten_record(bytes(raw), nonce=nonce,
                    phase=phase, issued_cutoff_ns=issued_cutoff_ns, observed_at_ns=observed,
                    previous=getattr(owner, 'source_failure_record', None))
                owner.source_failure_record = record
                owner.deadline = min(owner.deadline, math.nextafter(record['cutoff_ns'] / 1_000_000_000, -math.inf))
            raise RuntimeError('SOURCE_COHORT_CONTROL_EOF')  # NEVER a success ACK.
        raw.extend(chunk)
        if len(raw) > 49:
            raise RuntimeError('SOURCE_FAILURE_TIGHTEN_INVALID')
        if len(raw) == 49:
            # Apply the authenticated shorter cutoff NOW, not after a peer can
            # delay its half-close. Extra/truncated transport still refuses.
            record = _source_failure_tighten_record(bytes(raw), nonce=nonce,
                phase=phase, issued_cutoff_ns=issued_cutoff_ns, observed_at_ns=observed,
                previous=getattr(owner, 'source_failure_record', None))
            owner.source_failure_record = record
            owner.deadline = min(owner.deadline, math.nextafter(record['cutoff_ns'] / 1_000_000_000, -math.inf))


def _source_supervisor_control(stop_ns: int):
    import socket
    import struct
    sender, receiver = socket.socketpair(socket.AF_UNIX, socket.SOCK_STREAM)
    rows = [{"stream": stream, "fd": stream.fileno(), "stat": None,
             "close_attempted": False, "closed": False} for stream in (sender, receiver)]
    try:
        for row in rows:
            row["stat"] = os.fstat(row["fd"])
        frame = struct.pack(">8sIQQQ20s", b"RRSDG401", os.getpid(),
            int(os.environ["GITHUB_RUN_ID"]), int(os.environ["GITHUB_RUN_ATTEMPT"]),
            stop_ns, bytes.fromhex(os.environ["GITHUB_SHA"]))
        sender.sendall(frame, socket.MSG_DONTWAIT)
        sender.shutdown(socket.SHUT_WR)
        _close_source_supervisor_control(rows[0])
        return rows
    except BaseException as error:
        # Do not replace the first failure or retry an ambiguous close.
        _retain(error, rows)
        raise


def _close_source_supervisor_control(row) -> None:
    import errno
    if row["close_attempted"]:
        raise RuntimeError("SOURCE_SUPERVISOR_CONTROL_CLOSE_REPEATED")
    row["close_attempted"] = True
    descriptor = row["fd"]
    current = os.fstat(descriptor)
    if (row["stream"].fileno() != descriptor
            or (current.st_dev, current.st_ino) != (row["stat"].st_dev, row["stat"].st_ino)):
        raise RuntimeError("SOURCE_SUPERVISOR_CONTROL_IDENTITY_CHANGED")
    row["stream"].close()
    try:
        os.fstat(descriptor)
    except OSError as error:
        if type(error) is OSError and error.errno == errno.EBADF:
            row["closed"] = True
            return
        raise
    raise RuntimeError("SOURCE_SUPERVISOR_CONTROL_CLOSE_UNPROVED")


def _run_source_dmi_cohort() -> int:
    import fcntl
    import hashlib
    import json
    import math
    import select
    import struct
    require_closed_subset()
    nonce, stop_ns = _source_dmi_clock(3)
    if not _LOCK.acquire(blocking=False):
        raise RuntimeError("SOURCE_COHORT_CONCURRENT_OWNER_REFUSED")
    owner = _LinuxSubsetOwner(math.nextafter(stop_ns / 1_000_000_000, -math.inf))
    primary, child, result, control_rows, output_row = None, None, None, None, None
    output = bytearray()
    try:
        owner.enter()
        command = [sys.executable, "-u", str(Path(__file__).resolve().parents[1]
            / "run-dmi-bulk-supervised.py"), "--source-dmi-issued-cutoff"]
        try:
            descriptor = os.memfd_create('ravradar-source-dmi-output',
                os.MFD_CLOEXEC | os.MFD_ALLOW_SEALING)
            output_row = {'fd': descriptor, 'stream': None, 'stat': None,
                'close_attempted': False, 'closed': False}
            output_row['stat'] = os.fstat(descriptor)
            output_row['stream'] = os.fdopen(descriptor, 'a+b', buffering=0)
            environment = os.environ.copy()
            environment['GITHUB_OUTPUT'] = f'/proc/{os.getpid()}/fd/{descriptor}'
            control_rows = _source_supervisor_control(stop_ns)
            child = subprocess.Popen(command, stdin=control_rows[1]['stream'],
                env=environment, close_fds=True)
            _close_source_supervisor_control(control_rows[1])
            while result is None:
                remaining = owner.deadline - time.monotonic()
                if remaining <= 0:
                    raise RuntimeError('SOURCE_COHORT_CLOCK_EXPIRED_OR_INVALID')
                if select.select([3], [], [], min(0.05, remaining))[0]:
                    _source_failure_control(3, nonce, 0, stop_ns, owner)
                if os.fstat(descriptor).st_size > 131072:
                    raise RuntimeError('SOURCE_DMI_OUTPUT_TOO_LARGE')
                result = child.poll()
        except BaseException as error:
            primary = error
        try:
            owner.drain()
        except BaseException as error:
            if primary is None:
                primary = error
        if primary is None:
            try:
                if owner.children_observed or type(result) is not int or not 0 <= result <= 255:
                    raise RuntimeError('SOURCE_COHORT_WRITER_OUTLIVED_PARENT')
                current = os.fstat(output_row['fd'])
                if ((current.st_dev, current.st_ino) != (output_row['stat'].st_dev, output_row['stat'].st_ino)
                        or current.st_size > 131072):
                    raise RuntimeError('SOURCE_DMI_OUTPUT_CHANGED')
                seals = fcntl.F_SEAL_GROW | fcntl.F_SEAL_SHRINK | fcntl.F_SEAL_WRITE | fcntl.F_SEAL_SEAL
                fcntl.fcntl(output_row['fd'], fcntl.F_ADD_SEALS, seals)
                if fcntl.fcntl(output_row['fd'], fcntl.F_GET_SEALS) & seals != seals:
                    raise RuntimeError('SOURCE_DMI_OUTPUT_UNSEALED')
                while len(output) < current.st_size:
                    chunk = os.pread(output_row['fd'], min(65536, current.st_size - len(output)), len(output))
                    if not chunk:
                        raise RuntimeError('SOURCE_DMI_OUTPUT_TRUNCATED')
                    output.extend(chunk)
                if os.pread(output_row['fd'], 1, len(output)):
                    raise RuntimeError('SOURCE_DMI_OUTPUT_CHANGED')
                values = _source_normal_outputs(bytes(output), 0)
            except BaseException as error:
                primary = error
        # The own output and peer ends close once, before any physical-complete
        # relay. Keep the original BaseException and all actual refs on failure.
        for row in [*(control_rows or []), output_row]:
            if row is None or row['closed'] or row['close_attempted']:
                continue
            try:
                if row['stream'] is None:
                    raise RuntimeError('SOURCE_DMI_OUTPUT_OWNERSHIP_UNPROVED')
                _close_source_supervisor_control(row)
            except BaseException as error:
                if primary is None:
                    primary = error
        if primary is None:
            try:
                owner.leave()
            except BaseException as error:
                primary = error
        if primary is not None:
            if not stop_unproved(primary):
                _retain(primary, owner)
            _UNPROVED[id(primary)][2].extend([child, output_row, output, *(control_rows or [])])
            raise primary
        if time.monotonic_ns() >= stop_ns:
            raise RuntimeError('SOURCE_COHORT_CLOCK_EXPIRED_OR_INVALID')
        body = json.dumps({'schemaVersion': 1, 'kind': 'SOURCE_DMI_PHASE_CLOSED',
            'outputs': values, 'outputBytes': len(output),
            'outputSha256': hashlib.sha256(output).hexdigest()},
            sort_keys=True, separators=(',', ':')).encode('ascii')
        if len(body) > 4096:
            raise RuntimeError('SOURCE_DMI_RESULT_TOO_LARGE')
        _source_write_exact(3, b'RRSCG4E1' + nonce + struct.pack('>iI', result, len(body)) + body)
        return 0
    except BaseException as error:
        if not stop_unproved(error):
            _retain(error, owner)
        _UNPROVED[id(error)][2].extend([child, output_row, output, *(control_rows or [])])
        raise
    finally:
        if not owner.active:
            _LOCK.release()


def _run_source_normal_phase_cohort() -> int:
    import json
    import math
    import re
    import selectors
    import socket
    import struct
    require_closed_subset()
    root = Path(__file__).resolve().parents[2]
    entry = root / '.github/actions/save-owned-dmi-grib/index.cjs'
    parent = os.getppid()
    # The outer fixed Node24 action owns A2. No caller-selected executable/root.
    parent_executable = os.readlink(f'/proc/{parent}/exe')
    parent_argv = Path(f'/proc/{parent}/cmdline').read_bytes()
    fields = parent_argv.split(b'\0')
    spelling = fields[1] if len(fields) == 3 else b''
    # Same narrow spelling exception as the actual local-action parent guard.
    # Never resolve symlinks, '..', relative names or another script.
    while b'/./' in spelling:
        spelling = spelling.replace(b'/./', b'/')
    if (fields[-1:] != [b''] or len(parent_argv) > 16384
            or spelling != os.fsencode(str(entry))
            or Path(parent_executable).name != 'node' or os.getppid() != parent
            or os.environ.get('INPUT_OPERATION') != 'source'):
        raise RuntimeError('SOURCE_PHASE_PARENT_UNPROVED')
    nonce, stop_ns = _source_dmi_clock(3)
    # Same live parent channel, fixed phase enum; never a command/path array.
    selection = _source_read_exact(3, 9)
    phase, generation = selection[:1], selection[1:].decode('ascii')
    if phase not in (b'\x01', b'\x02', b'\x03', b'\x04', b'\x05'):
        raise RuntimeError('SOURCE_PHASE_NOT_FIXED')
    if re.fullmatch(r'[0-9]{4}-W(?:0[1-9]|[1-4][0-9]|5[0-3])', generation) is None:
        raise RuntimeError('SOURCE_PHASE_CACHE_GENERATION_INVALID')
    wam_selection = b''
    if phase == b'\x03':
        length = struct.unpack('>I', _source_read_exact(3, 4))[0]
        if not 2 <= length <= 4096:
            raise RuntimeError('SOURCE_WAM_SELECTION_INVALID')
        wam_selection = _source_read_exact(3, length)
    if not _LOCK.acquire(blocking=False):
        raise RuntimeError('SOURCE_COHORT_CONCURRENT_OWNER_REFUSED')
    owner = _LinuxSubsetOwner(math.nextafter(stop_ns / 1_000_000_000, -math.inf))
    primary, child, result, selector = None, None, None, None
    rows, received = [], bytearray()
    eof = False
    try:
        owner.enter()
        try:
            sender, receiver = socket.socketpair(socket.AF_UNIX, socket.SOCK_STREAM)
            rows = [{'stream': stream, 'fd': stream.fileno(), 'stat': None,
                     'close_attempted': False, 'closed': False} for stream in (sender, receiver)]
            for row in rows:
                row['stat'] = os.fstat(row['fd'])
            frame = (b'RRSSG401' + struct.pack('>IQQ', os.getpid(),
                int(os.environ['GITHUB_RUN_ID']), int(os.environ['GITHUB_RUN_ATTEMPT']))
                + nonce + bytes.fromhex(os.environ['GITHUB_SHA']) + phase
                + struct.pack('>Q', stop_ns))
            if len(frame) != 89 or time.monotonic_ns() >= stop_ns:
                raise RuntimeError('SOURCE_PHASE_CUTOFF_INVALID')
            control_bytes = frame + (struct.pack('>I', len(wam_selection)) + wam_selection
                if phase == b'\x03' else b'')
            sender.sendall(control_bytes, socket.MSG_DONTWAIT)
            sender.shutdown(socket.SHUT_WR)
            environment = os.environ.copy()
            environment['INPUT_OPERATION'] = 'save' if phase == b'\x01' else 'upload-encrypted-progress'
            # Workflow outputs may be published only by the still-live fixed
            # parent after this guardian's actual drain, never by this child.
            environment.pop('GITHUB_OUTPUT', None)
            # Parent selected this UTC ISO week once at the NORMAL generation
            # phase. It is data on the same live channel, not a new issuer.
            # No inherited/caller-supplied path or arbitrary key is forwarded.
            suffix = f"{environment['GITHUB_RUN_ID']}-{environment['GITHUB_RUN_ATTEMPT']}"
            environment['INPUT_PATH'] = '.cache/dmi-grib' if phase == b'\x01' else ''
            environment['INPUT_KEY'] = (f'dmi-grib-v4-Linux-{generation}-{suffix}'
                if phase == b'\x01' else f'weather-private-progress-encrypted-v2-Linux-main-{suffix}')
            if phase in (b'\x04', b'\x05'):
                checkpoint = phase == b'\x04'
                environment['INPUT_OPERATION'] = ('source-checkpoint-cache-save' if checkpoint else 'source-preflight-cache-save')
                environment['INPUT_PATH'] = ('.cache/ravscore-continuation-checkpoint' if checkpoint else '.cache/weather-preflight-state')
                environment['INPUT_KEY'] = (f'ravscore-continuation-schema6-v2-{suffix}' if checkpoint
                    else f'weather-preflight-state-v1-Linux-{suffix}')
            if phase == b'\x03':
                # Fixed inherited READ inputs only, held by the live P owner.
                # These fd numbers were assigned by that normal Node spawn;
                # no path/command/fd-array arrives over the control channel.
                import stat
                for descriptor in (4, 5, 6):
                    info = os.fstat(descriptor)
                    if not stat.S_ISREG(info.st_mode):
                        raise RuntimeError('SOURCE_WAM_INPUT_UNPROVED')
                    rows.append({'stream': os.fdopen(descriptor, 'rb', buffering=0),
                        'fd': descriptor, 'stat': info, 'close_attempted': False, 'closed': False})
                command = [sys.executable, '-B', str(root / 'scripts/validate_dmi_wave_history_bootstrap.py'),
                    '--source-owned-wam']
                inherited = (4, 5, 6)
            else:
                command = [parent_executable, str(entry), '--source-fixed-raw-save'
                    if phase == b'\x01' else '--source-fixed-cipher-upload' if phase == b'\x02'
                    else '--source-fixed-checkpoint-save' if phase == b'\x04' else '--source-fixed-preflight-save']
                inherited = ()
            # Popen's fixed stdin mapping makes THIS socket child fd0 without
            # modifying the guardian's parent-control fd3. No preexec_fn or
            # parent dup2; no caller fd/path/command option.
            child = subprocess.Popen(command, cwd=root, env=environment,
                stdin=receiver, close_fds=True, pass_fds=inherited)
            _close_source_supervisor_control(rows[1])
            sender.setblocking(False)
            selector = selectors.DefaultSelector()
            selector.register(sender, selectors.EVENT_READ, 'receipt')
            selector.register(3, selectors.EVENT_READ, 'parent')
            while result is None or not eof:
                remaining = owner.deadline - time.monotonic()
                if remaining <= 0:
                    raise RuntimeError('SOURCE_COHORT_CLOCK_EXPIRED_OR_INVALID')
                for key, _ in selector.select(min(0.05, remaining)):
                    if key.data == 'parent':
                        # The parent must send no second phase; EOF is a real
                        # wakeup, not permission to finish or release anything.
                        _source_failure_control(3, nonce, phase[0], stop_ns, owner)
                    try:
                        chunk = sender.recv(4096)
                    except BlockingIOError:
                        continue
                    if not chunk:
                        eof = True
                        selector.unregister(sender)
                    else:
                        received.extend(chunk)
                        if len(received) > 44 + 4096:
                            raise RuntimeError('SOURCE_PHASE_RECEIPT_TOO_LARGE')
                result = child.poll()
            selector.close()
            selector = None
            _close_source_supervisor_control(rows[0])
            for row in rows[2:]:
                _close_source_supervisor_control(row)
        except BaseException as error:
            primary = error
        try:
            owner.drain()
            owner.leave()
        except BaseException as error:
            if primary is None:
                primary = error
            if not stop_unproved(primary):
                _retain(primary, owner)
            else:
                _UNPROVED[id(primary)][2].append(owner)
        if primary is not None:
            if not stop_unproved(primary):
                _retain(primary, owner)
            _UNPROVED[id(primary)][2].extend([child, selector, rows, received])
            raise primary
        if owner.children_observed:
            raise RuntimeError('SOURCE_COHORT_WRITER_OUTLIVED_PARENT')
        if result != 0 or not eof or time.monotonic_ns() >= stop_ns:
            raise RuntimeError('SOURCE_PHASE_NOT_COMPLETED')
        if (len(received) < 44 or received[:8] != b'RRSSG4A1'
                or received[8:40] != nonce
                or struct.unpack('>I', received[40:44])[0] != len(received) - 44):
            raise RuntimeError('SOURCE_PHASE_RECEIPT_INVALID')
        receipt = json.loads(received[44:].decode('utf-8'))
        kind = ('DMI_RAW_SAVE_V2_FINALIZED' if phase == b'\x01' else
                'WEATHER_CIPHER_V2_FINALIZED' if phase == b'\x02' else
                'SOURCE_CHECKPOINT_CACHE_V2_FINALIZED' if phase == b'\x04' else
                'SOURCE_PREFLIGHT_CACHE_V2_FINALIZED' if phase == b'\x05' else 'SOURCE_WAM_CONSUMED_INPUTS')
        closed_failure = (phase in (b'\x01', b'\x02', b'\x04', b'\x05')
            and isinstance(receipt, dict) and receipt.get('kind') == 'SOURCE_SAVE_CLOSED_FAILURE')
        if (not isinstance(receipt, dict) or receipt.get('schemaVersion') != 1
                or (receipt.get('kind') != kind and not closed_failure)):
            raise RuntimeError('SOURCE_PHASE_ACK_INVALID')
        if closed_failure and (set(receipt) != {'schemaVersion', 'kind', 'operation', 'stage', 'reason', 'interrupted'}
                or receipt.get('operation') != ('save' if phase == b'\x01' else 'cipher' if phase == b'\x02'
                    else 'checkpoint' if phase == b'\x04' else 'preflight')
                or type(receipt.get('interrupted')) is not bool
                or re.fullmatch(r'[A-Z_]{1,32}', str(receipt.get('stage', ''))) is None
                or re.fullmatch(r'[A-Z0-9_]{1,96}', str(receipt.get('reason', ''))) is None):
            raise RuntimeError('SOURCE_PHASE_FAILURE_INVALID')
        if phase != b'\x03' and not closed_failure and (type(receipt.get('cacheId')) is not int or receipt['cacheId'] <= 0):
            raise RuntimeError('SOURCE_PHASE_ACK_INVALID')
        if phase == b'\x03' and (not isinstance(receipt.get('inputs'), list)
                or len(receipt['inputs']) != 3 or not isinstance(receipt.get('attestation'), dict)):
            raise RuntimeError('SOURCE_WAM_ACK_INVALID')
        # The actual API body is relayed only after this guardian's own drain,
        # exact child exit and both IPC closes. It is not an outer-owner release.
        _source_write_exact(3, b'RRSPG4E1' + nonce + phase
            + struct.pack('>I', len(received) - 44) + received[44:])
        return 0
    except BaseException as error:
        if not stop_unproved(error):
            _retain(error, owner)
        _UNPROVED[id(error)][2].extend([child, selector, rows, received])
        raise
    finally:
        if not owner.active:
            _LOCK.release()


def _source_normal_readiness_identity():
    # Fixed dependency only; the actual parent owns the closed producer output
    # and compares its retained identity/hash before and after this program.
    import errno
    import json
    import re
    import stat
    directory = Path('/tmp/ravradar-operational-model')
    file = directory / 'integrated-implementation-identity.json'
    if os.path.realpath(directory) != str(directory) or directory.is_symlink() or not directory.is_dir():
        raise RuntimeError('SOURCE_READINESS_IDENTITY_PARENT_UNPROVED')
    descriptor = os.open(file, os.O_RDONLY | os.O_NOFOLLOW | os.O_CLOEXEC)
    primary = None
    raw = None
    try:
        before = os.fstat(descriptor)
        keys = ('st_dev', 'st_ino', 'st_mode', 'st_nlink', 'st_size', 'st_mtime_ns', 'st_ctime_ns')
        if (not stat.S_ISREG(before.st_mode) or before.st_nlink != 1 or not 2 <= before.st_size <= 262144
                or any(getattr(before, key) != getattr(os.stat(file, follow_symlinks=False), key) for key in keys)):
            raise RuntimeError('SOURCE_READINESS_IDENTITY_UNPROVED')
        raw, position = bytearray(), 0
        while position < before.st_size:
            chunk = os.pread(descriptor, min(65536, before.st_size - position), position)
            if not chunk:
                raise RuntimeError('SOURCE_READINESS_IDENTITY_TRUNCATED')
            raw.extend(chunk)
            position += len(chunk)
        after, named = os.fstat(descriptor), os.stat(file, follow_symlinks=False)
        if os.pread(descriptor, 1, position) or any(getattr(before, key) != getattr(after, key)
                or getattr(before, key) != getattr(named, key) for key in keys):
            raise RuntimeError('SOURCE_READINESS_IDENTITY_CHANGED')
    except BaseException as error:
        primary = error
    finally:
        try:
            os.close(descriptor)
        except BaseException as error:
            if primary is None:
                primary = error
        try:
            os.fstat(descriptor)
        except OSError as error:
            if error.errno != errno.EBADF and primary is None:
                primary = error
        else:
            if primary is None:
                primary = RuntimeError('SOURCE_READINESS_IDENTITY_CLOSE_UNPROVED')
    if primary is not None:
        raise primary
    value = json.loads(raw.decode('utf-8'))
    selected = value.get('implementationClosureSha256') if type(value) is dict else None
    if type(selected) is not str or re.fullmatch(r'[0-9a-f]{64}', selected) is None:
        raise RuntimeError('SOURCE_READINESS_IDENTITY_HASH_UNPROVED')
    return selected


def _source_normal_program(root, phase, options, output_path):
    import re
    import shutil
    from datetime import datetime, timezone
    if (not isinstance(options, dict) or set(options) != {'target', 'quick', 'extended', 'checkpointOnly'}
            or type(options['quick']) is not bool or type(options['extended']) is not bool
            or type(options['checkpointOnly']) is not bool
            or not isinstance(options['target'], str)
            or re.fullmatch(r'[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:00:00(?:\.000)?Z', options['target']) is None):
        raise RuntimeError('SOURCE_NORMAL_SELECTION_INVALID')
    at = datetime.fromisoformat(options['target'].replace('Z', '+00:00'))
    if at.tzinfo != timezone.utc or at.minute or at.second or at.microsecond:
        raise RuntimeError('SOURCE_NORMAL_SELECTION_INVALID')
    target, quick, extended = options['target'], options['quick'], options['extended']
    checkpoint_only = options['checkpointOnly']
    if checkpoint_only and (quick or extended):
        raise RuntimeError('SOURCE_CHECKPOINT_REQUEST_INVALID')
    environment = os.environ.copy()
    environment['GITHUB_OUTPUT'] = output_path
    environment['RAVRADAR_PRODUCTION_TARGET_HOUR'] = target
    # These exact routes are the existing normal workflow's defaults. Nothing
    # received over the private channel can replace an executable or a pathname.
    python = [sys.executable, '-B']
    registry = '.cache/copernicus-current-targets.json'
    candidate = '.cache/dmi-candidate-progress.json'
    parts = 'data/live/coastal-parts-v2.json'
    range_args = ['--shadow', '.cache/copernicus-current-shadow.json',
        '--source-stage', '.cache/copernicus-current-source-stage.json',
        '--registry', registry, '--dmi', candidate, '--targets', parts, '--at', target]
    pilot_args = ['--donor-bank', '.cache/copernicus-current-donor-bank.json',
        '--segment-journal', '.cache/copernicus-current-segment-journal.json',
        '--at', target, '--targets', registry, '--authoritative-targets', parts]
    def py(name, args):
        return python + [str(root / 'scripts' / name)] + args
    if phase == 83:
        node = shutil.which('node')
        if not node:
            raise RuntimeError('SOURCE_NORMAL_NODE_UNAVAILABLE')
        return [node, str(root / 'scripts/private-production-runtime-workflow.mjs'), 'create-preflight',
            '--repository-root', str(root), '--dmi-bulk', candidate,
            '--output', '.cache/weather-preflight-state/state.json'], environment
    if phase in (80, 81, 82):
        # One fixed normal preparation sequence; no command/path is received.
        node = shutil.which('node')
        if not node:
            raise RuntimeError('SOURCE_NORMAL_NODE_UNAVAILABLE')
        script = ('prepare-coastal-point-activation.mjs' if phase == 80 else
            'build-public-coastal-parts-v2.mjs' if phase == 81 else
            'update-water-source-registry.mjs')
        if phase == 82:
            environment['WEATHER_USER_AGENT'] = ('RavRadar water-source registry (https://github.com/'
                + environment['GITHUB_REPOSITORY'] + ')')
        return [node, str(root / 'scripts' / script)], environment
    if phase == 79:
        # The same normal central-admin CAS, never a caller-selected command.
        # Its actual safely closed nonzero is reported by the parent diagnostic.
        return py('promote-coastal-point-activation.py', []), environment
    if phase in (72, 73, 74, 75, 76, 77):
        # Exact current ordinary workflow tools. No selector chooses a command,
        # path, implementation hash, environment value or runtime version.
        node = shutil.which('node')
        if not node:
            raise RuntimeError('SOURCE_NORMAL_NODE_UNAVAILABLE')
        operational = Path('/tmp/ravradar-operational-model')
        if phase == 72:
            command = [str(root / 'scripts/generate-state-reference-report-4.0.113.mjs'), '--strict']
        elif phase == 73:
            command = [str(root / 'scripts/seal-ravscore-public-browser-closure.mjs'),
                '--root', '.', '--output', str(operational / 'integrated-public-closure.json'),
                '--model', 'integrated',
                '--identity-output', str(operational / 'integrated-implementation-identity.json')]
        elif phase == 74:
            # P retains/reverifies this actual phase-73 output before and after
            # its dependent phase. The metadata value is not an owner/admission.
            identity = _source_normal_readiness_identity()
            environment['RAVRADAR_REQUIRE_INTEGRATED_BINDING'] = 'true'
            command = [str(root / 'scripts/integrated-cutover-readiness.mjs'), 'publish',
                '--public-implementation-closure-sha256', identity,
                '--output', str(operational / 'integrated-readiness.json')]
        elif phase == 75:
            # npm is a shebang JS entrypoint, not the retained native binary.
            # Invoke the SAME selected npm run through its actual Node22 host.
            npm = shutil.which('npm')
            if not npm:
                raise RuntimeError('SOURCE_NORMAL_NPM_UNAVAILABLE')
            npm = os.path.realpath(npm)
            expected_npm = str(Path(os.path.realpath(node)).parent.parent / 'lib/node_modules/npm/bin/npm-cli.js')
            if npm != expected_npm or not Path(npm).is_file() or Path(npm).is_symlink():
                raise RuntimeError('SOURCE_NORMAL_NPM_TOOLCHAIN_UNPROVED')
            command = [npm, 'run', 'validate:data']
        else:
            environment['EXPECTED_TRIP_STORAGE_MODE'] = 'd1'
            environment['RAVRADAR_REQUIRE_INTEGRATED_BINDING'] = 'true'
            script = 'verify-trip-storage-edge.mjs' if phase == 76 else 'verify-cloudflare-trip-gateway.mjs'
            command = [str(root / 'scripts' / script)]
        return [node] + command, environment
    if phase == 71:
        # The actual outer action's Node, with no provider credentials.
        node = os.path.realpath(os.readlink(f'/proc/{os.getppid()}/exe'))
        environment = {key: value for key, value in os.environ.items() if key in (
            'PATH', 'TEMP', 'TMP', 'TMPDIR', 'SystemRoot', 'WINDIR',
            'LANG', 'LC_ALL', 'LC_CTYPE', 'TZ', 'LD_LIBRARY_PATH', 'DYLD_LIBRARY_PATH')}
        environment['PYTHONUTF8'] = '1'
        return [node, str(root / 'scripts/source-progress-union-consumer.mjs'),
            '--source-owned-progress-union'], environment
    if phase == 70:
        # Fixed offline verifier; P owns the exact read-only FD4/5/6 binding.
        return py('run-copernicus-weather-components.py', [
            '--bank', f'/proc/{os.getpid()}/fd/4',
            '--cache-directory', f'/proc/{os.getpid()}/fd/5',
            '--storage-inventory', f'/proc/{os.getpid()}/fd/6/inventory.json']), environment
    if phase == 4:
        # Exactly the Node selected by the normal setup-node@v4 Node22 PATH.
        # The parent separately binds that executable; this is not Node24 from
        # the outer cache action or a caller-provided executable argument.
        node = shutil.which('node')
        if not node:
            raise RuntimeError('SOURCE_NORMAL_NODE_UNAVAILABLE')
        return [node, str(root / 'scripts/update-coastal-point-staging.mjs')], environment
    if phase == 5:
        return py('build-copernicus-target-registry.py', ['--at', target, '--dmi', candidate,
            '--output', registry, '--github-output', output_path]), environment
    if phase == 6:
        return py('check-copernicus-current-range.py', range_args + ['--allow-nonmatching-seal',
            '--persist-validated-rebase', '--allow-invalid-shadow-as-absent',
            '--github-output', output_path]), environment
    if phase == 7:
        if checkpoint_only:
            raise RuntimeError('SOURCE_CHECKPOINT_PROVIDER_FORBIDDEN')
        seconds = 120 if quick else 3300 if extended else 1500
        return py('run-copernicus-current-pilot-with-retry.py', ['--attempts', '1',
            '--timeout-seconds', str(seconds), '--backoff-seconds', '20', '--']
            + pilot_args[:4] + ['--acquisition-plan', '.cache/weather-current-acquisition-plan.json']
            + pilot_args[4:]), environment
    if phase in (8, 14):
        args = range_args + ['--require-source-stage-reusable']
        if phase == 8:
            args += ['--github-output', 'data/diagnostics/copernicus-current-source-stage-safe.env']
        return py('check-copernicus-current-range.py', args), environment
    if phase == 9:
        return py('fill-open-meteo-current-fallback.py', ['--at', target, '--dmi', candidate,
            '--timeout-seconds', '30', '--runtime-seconds', '120' if quick else '900',
            '--critical-only'] + (['--reuse-only'] if checkpoint_only else [])), environment
    if phase == 10:
        return py('build-current-operational-closure.py', ['--at', target, '--dmi', candidate]), environment
    if phase == 11:
        return py('build-live-current-pilot.py', ['--dmi', candidate]), environment
    if phase == 12:
        node = shutil.which('node')
        if not node:
            raise RuntimeError('SOURCE_NORMAL_NODE_UNAVAILABLE')
        # The full Weather environment is set lexically by P from the actual
        # restore/bootstrap/historical outcomes, before launch. No option here
        # can assert those outcomes or alter those normal budgets.
        return [node, str(root / 'scripts/update-weather.mjs')], environment
    if phase == 13:
        if checkpoint_only:
            raise RuntimeError('SOURCE_CHECKPOINT_PROVIDER_FORBIDDEN')
        if quick:
            raise RuntimeError('SOURCE_NORMAL_QUALITY_NOT_SELECTED')
        return py('run-copernicus-current-pilot-with-retry.py', ['--attempts', '1',
            '--timeout-seconds', '360', '--backoff-seconds', '0', '--', '--refresh-only']
            + pilot_args), environment
    if phase == 15:
        return py('build-weather-acquisition-plan.py', ['--at', target, '--dmi', candidate,
            '--report', 'data/diagnostics/weather-current-acquisition-plan-before-copernicus.json']), environment
    if phase == 16:
        node = shutil.which('node')
        temporary = os.environ.get('RUNNER_TEMP', '')
        if not node or not os.path.isabs(temporary) or os.path.realpath(temporary) != temporary:
            raise RuntimeError('SOURCE_NORMAL_SEAL_TEMP_UNPROVED')
        environment['WEATHER_PROGRESS_MASTER_SECRET'] = environment.get('SUPABASE_SERVICE_ROLE_KEY', '')
        return [node, str(root / 'scripts/weather-component-progress-cache.mjs'), 'save',
            '--root', str(root), '--base', str(Path(temporary) / 'weather-progress-base.json'),
            '--report', str(Path(temporary) / 'weather-progress-save-report.json')], environment
    if phase == 17:
        node = shutil.which('node')
        if not node:
            raise RuntimeError('SOURCE_NORMAL_NODE_UNAVAILABLE')
        return [node, str(root / 'scripts/check-production-target-freshness.mjs'),
            '--target', target, '--maximum-age-minutes', '90', '--github-output', output_path], environment
    if phase == 18:
        return py('check-dmi-bulk-operational-ready.py',
            ['--cache', 'data/live/dmi-bulk-cache.json']), environment
    if phase == 19:
        temporary = os.environ.get('RUNNER_TEMP', '')
        if not os.path.isabs(temporary) or os.path.realpath(temporary) != temporary:
            raise RuntimeError('SOURCE_NORMAL_ACTIVE_TEMP_UNPROVED')
        return py('build-copernicus-target-registry.py', ['--require-strict-dmi-ledger',
            '--targets', parts, '--dmi', 'data/live/dmi-bulk-cache.json',
            '--output', str(Path(temporary) / 'dmi-maintained-proof.json'), '--at', target]), environment
    if phase == 20:
        return ['/usr/bin/cp', '--', 'data/live/dmi-bulk-cache.json',
            '.cache/dmi-active-complete.json.tmp'], environment
    if phase == 21:
        return ['/usr/bin/mv', '--', '.cache/dmi-active-complete.json.tmp',
            '.cache/dmi-active-complete.json'], environment
    if phase == 22:
        return ['/usr/bin/rm', '-f', '--', '.cache/weather-current-acquisition-plan.json'], environment
    if phase == 23:
        # Normal preflight runs only against the four validated minimal files.
        # Its module-relative script and necessary stdlib-only storage helper
        # are copied byte-for-byte by the private parent, not patched at runtime.
        return [sys.executable, '-B', str(root / '.cache/weather-preflight-work/input/scripts/check-weather-update.py')], environment
    if phase == 24:
        return py('refine-coastlines-constrained-4.0.48.py', []), environment
    if phase == 25:
        return py('sync-admin-config.py', []), environment
    if phase == 26:
        return py('apply-central-zone-reviews.py', []), environment
    if phase in (27, 28):
        node = shutil.which('node')
        if not node:
            raise RuntimeError('SOURCE_NORMAL_NODE_UNAVAILABLE')
        command = ([str(root / 'scripts/build-public-coastal-parts-v2.mjs')]
            if phase == 27 else [str(root / 'scripts/integrated-cutover-readiness.mjs'), 'verify-db'])
        return [node] + command, environment
    if phase in (29, 30):
        node = os.readlink(f'/proc/{os.getppid()}/exe')
        argument = '--source-preflight-cache-read' if phase == 29 else '--prepare-distribution'
        return [node, str(root / '.github/actions/save-owned-dmi-grib/index.cjs'), argument], environment
    if phase == 31:
        repository = os.environ.get('GITHUB_REPOSITORY', '')
        if re.fullmatch(r'[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+', repository) is None:
            raise RuntimeError('SOURCE_NORMAL_REPOSITORY_INVALID')
        owner, name = repository.split('/')
        url = f'https://{owner}.github.io/{name}/data/live/manifest.json?weather-preflight={os.environ["GITHUB_RUN_ID"]}-{os.environ["GITHUB_RUN_ATTEMPT"]}'
        return ['/usr/bin/curl', '--fail', '--silent', '--show-error', '--location',
            '--connect-timeout', '10', '--max-time', '20', '--max-filesize', '131072',
            '--header', 'Cache-Control: no-cache', url,
            '--output', str(root / '.cache/weather-preflight-work/public-manifest.json')], environment
    if phase in (32, 33):
        node = os.readlink(f'/proc/{os.getppid()}/exe') if phase == 32 else shutil.which('node')
        if not node:
            raise RuntimeError('SOURCE_NORMAL_NODE_UNAVAILABLE')
        command = ([str(root / '.github/actions/save-owned-dmi-grib/index.cjs'), '--source-checkpoint-cache-read']
            if phase == 32 else [str(root / 'scripts/protected-ravscore-continuation-checkpoint.mjs'),
                '--restore', '--target-reference', target])
        return [node] + command, environment
    if phase in range(34, 42):
        git = shutil.which('git')
        if not git:
            raise RuntimeError('SOURCE_NORMAL_GIT_UNAVAILABLE')
        heads = ('4bee5b0d0909b56a6f66e0f0e961f51321f9d236',
                 'd4e8844ece6bfa46447b762a662cac0d7f1da385',
                 'b1b88e0f61b751cc91bdb09120dc895abc99cb65',
                 'cc45e97178a64406bdf3ab5401d8a3ae0f618891')
        index = (phase - 34) // 2
        if phase % 2 == 0:
            return [git, 'fetch', '--no-tags', '--depth=1', 'origin', heads[index]], environment
        temporary = Path(os.environ.get('RUNNER_TEMP', ''))
        if not temporary.is_absolute() or temporary.is_symlink() or not temporary.is_dir():
            raise RuntimeError('SOURCE_NORMAL_TEMP_INVALID')
        destination = (Path('/tmp/ravradar-historical-wave-source') if index < 2 else
            temporary / ('ravradar-exact-weather-reader' if index == 2 else 'ravradar-exact-weather-donor-source'))
        if destination.exists() or destination.is_symlink():
            raise RuntimeError('SOURCE_ARCHIVED_DESTINATION_EXISTS')
        return [git, 'worktree', 'add', '--detach', str(destination), heads[index]], environment
    if phase == 68:
        if not checkpoint_only:
            raise RuntimeError('SOURCE_ORIGINAL_TARGET_MODE_REQUIRED')
        # Three real inherited capabilities: authenticated candidate, central
        # target registry, and S's own existing temporary directory. No path is
        # accepted from the selector, environment or a claimed JSON receipt.
        return py('build-copernicus-target-registry.py', [
            '--targets', '/proc/self/fd/5', '--dmi', '/proc/self/fd/6/original-target-dmi-input.json',
            '--at', target, '--output', '/proc/self/fd/6/original-target-registry.json']), environment
    if phase == 69:
        if not checkpoint_only:
            raise RuntimeError('SOURCE_CHECKPOINT_ORIGINAL_MODE_REQUIRED')
        node = shutil.which('node')
        if not node:
            raise RuntimeError('SOURCE_NORMAL_NODE_UNAVAILABLE')
        return [node, str(root / 'scripts/plan-dmi-legacy-current-originals.mjs')], environment
    if phase in (67, 78):
        node = shutil.which('node')
        if not node:
            raise RuntimeError('SOURCE_NORMAL_NODE_UNAVAILABLE')
        # Preserve the historical 67 operand. Current ordinary weather uses
        # its actual committed-RAW retention call, not a new eviction policy.
        command = [node, str(root / 'scripts/plan-ravscore-current-history.mjs')]
        if phase == 78:
            command.append('--retain-committed-raw')
        return command, environment
    if phase == 42:
        environment['DMI_BULK_CACHE_ONLY'] = 'true' if checkpoint_only else 'false'
        environment['RAVRADAR_PRODUCTION_TARGET_HOUR'] = target
        return py('materialize-dmi-bulk-storage.py', ['--source-normal-generation-prepare']), environment
    if phase in (43, 44):
        node = os.readlink(f'/proc/{os.getppid()}/exe')
        option = '--source-progress-cache-read' if phase == 43 else '--source-raw-cache-read'
        return [node, str(root / '.github/actions/save-owned-dmi-grib/index.cjs'), option], environment
    if phase in (45, 46, 47, 48, 49, 50):
        node = os.readlink(f'/proc/{os.getppid()}/exe') if phase == 47 else shutil.which('node')
        temporary = os.environ.get('RUNNER_TEMP', '')
        if not node or not os.path.isabs(temporary) or os.path.realpath(temporary) != temporary:
            raise RuntimeError('SOURCE_HANDOFF_TEMP_INVALID')
        directory = Path(temporary) / 'ravradar-weather-source-handoff'
        script = str(root / 'scripts/verified-weather-source-handoff.mjs')
        if phase == 45:
            return [node, script, 'resolve-run', '--repository', os.environ['GITHUB_REPOSITORY'],
                '--expected-head', os.environ['GITHUB_SHA'], '--run-id', os.environ['INPUT_RAVSCORE_INTEGRATED_WEATHER_HANDOFF_RUN_ID'],
                '--runner-os', 'Linux', '--first-cutover', os.environ['INPUT_RAVSCORE_INTEGRATED_FIRST_CUTOVER'],
                '--confirmation', os.environ['INPUT_RAVSCORE_INTEGRATED_FIRST_CUTOVER_CONFIRMATION'],
                '--output-dir', str(directory), '--github-output', output_path], environment
        if phase == 46:
            return [node, script, 'extract-artifact', '--output-dir', str(directory)], environment
        if phase == 47:
            return [node, str(root / '.github/actions/save-owned-dmi-grib/index.cjs'), '--source-handoff-cache-read'], environment
        if phase == 50:
            return [node, script, 'verify-closure', '--attestation', str(directory / 'artifact/attestation.json'),
                '--closure', str(root / '.cache/current-operational-closure.json')], environment
        return [node, script, 'inspect' if phase == 48 else 'install', '--root', str(root),
            '--cache-root', str(root / '.cache/verified-weather-source-handoff-cache'),
            '--artifact-attestation', str(directory / 'artifact/attestation.json'), '--resolved', str(directory / 'resolved.json'),
            '--repository', os.environ['GITHUB_REPOSITORY'], '--expected-head', os.environ['GITHUB_SHA'],
            '--run-id', os.environ['INPUT_RAVSCORE_INTEGRATED_WEATHER_HANDOFF_RUN_ID'], '--runner-os', 'Linux',
            '--github-output', output_path], environment
    if phase == 51:
        return py('materialize-dmi-bulk-storage.py', ['--source-normal-protected-quick-prepare']), environment
    if phase in range(52, 64):
        node = shutil.which('node')
        temporary = os.environ.get('RUNNER_TEMP', '')
        if not node or not os.path.isabs(temporary) or os.path.realpath(temporary) != temporary:
            raise RuntimeError('SOURCE_ARTIFACT_TEMP_INVALID')
        environment['DMI_BULK_CACHE_PATH'] = candidate
        if phase == 52:
            command = ['scripts/enrich-current-provenance.mjs']
        elif phase == 53:
            command = ['scripts/generate-public-conditions.mjs']
        elif phase in (54, 55):
            prefix = 'previous-weather-conditions.json' if phase == 54 else 'paired-15z-conditions.json'
            pack = 'previous-public-hour-delivery.pack' if phase == 54 else 'paired-15z-public-hour-delivery.pack'
            command = ['scripts/check-public-weather-continuity.mjs', '--previous-conditions',
                str(Path(temporary) / prefix), '--previous-pack', str(Path(temporary) / pack), '--new-live', 'data/live']
        elif phase == 56:
            command = ['scripts/audit-ravscore-integrated-public-runtime.mjs', '--input', 'data/live/conditions.json',
                '--output', '.geometry-v2-work/ravscore-integrated-public-runtime-audit.json']
        elif phase in (57, 58):
            selected = 'artifact' if phase == 57 else 'release'
            command = ['scripts/run-validation-collection.mjs', '--script', 'validate:production-' + selected,
                '--output', '.geometry-v2-work/production-' + selected + '-validation-report.json']
        elif phase == 59:
            command = ['scripts/private-production-runtime-workflow.mjs', 'create-spec',
                '--repository-root', str(root), '--dmi-bulk', candidate,
                '--output', '.cache/private-production-runtime-create-spec.json']
        elif phase == 60:
            command = ['scripts/private-production-runtime-bundle.mjs', 'create',
                '--private-root', '/tmp/ravradar-private-production-runtime',
                '--bundle', '/tmp/ravradar-private-production-runtime/bundle-source-successor',
                '--spec', '.cache/private-production-runtime-create-spec.json']
        elif phase == 61:
            command = ['scripts/ravscore-continuation-checkpoint.mjs', '--save', '--source', 'data/live/conditions.json',
                '--checkpoint', '.cache/ravscore-continuation-checkpoint/checkpoint.json']
        elif phase == 62:
            command = ['scripts/check-production-target-freshness.mjs', '--target', target,
                '--maximum-age-minutes', '150', '--github-output', output_path]
        elif phase == 63:
            # Same normal local seal CLI, but T has its distinct fixed name.
            # This phase performs NO artifact upload, checkpoint CAS or B publish.
            environment['STAGED_PRIVATE_BUILD_MASTER_SECRET'] = environment.get('SUPABASE_SERVICE_ROLE_KEY', '')
            command = ['scripts/staged-private-production-runtime.mjs', 'seal',
                '--repository-root', str(root), '--private-root', '/tmp/ravradar-private-production-runtime',
                '--bundle', '/tmp/ravradar-private-production-runtime/bundle-source-successor',
                '--expected', '.cache/private-production-runtime-expected.json',
                '--source-head', environment.get('GITHUB_SHA', ''),
                '--repository', environment.get('GITHUB_REPOSITORY', ''),
                '--run-id', environment.get('GITHUB_RUN_ID', ''),
                '--run-attempt', environment.get('GITHUB_RUN_ATTEMPT', ''),
                '--output', str(Path(temporary) / 'ravradar-private-build-stage' / 'sealed.bin')]
        else:
            raise RuntimeError('SOURCE_NORMAL_PHASE_NOT_FIXED')
        return [node, str(root / command[0])] + command[1:], environment
    if phase in (64, 65, 66):
        node = os.readlink(f'/proc/{os.getppid()}/exe')
        fixed = {64: '--source-artifact-upload', 65: '--source-checkpoint-publish', 66: '--source-private-publish'}
        return [node, str(root / '.github/actions/save-owned-dmi-grib/index.cjs'), fixed[phase]], environment
    raise RuntimeError('SOURCE_NORMAL_PHASE_NOT_FIXED')



def _source_legacy_request_outputs(data, expected_target):
    # The normal CLI deliberately writes TWO lines. Consume both only here;
    # no other normal phase's 256-character/unknown-key rule is changed.
    import json
    import re
    if len(data) > 8192:
        raise RuntimeError('SOURCE_LEGACY_METADATA_BOUND')
    text = data.decode('utf-8', errors='strict')
    if '\r' in text or '\0' in text or not text.endswith('\n'):
        raise RuntimeError('SOURCE_LEGACY_OUTPUT_INVALID')
    selected = {}
    for line in text[:-1].split('\n'):
        key, separator, value = line.partition('=')
        if not separator or key not in {'requests_sha256', 'expectation_json'} or key in selected:
            raise RuntimeError('SOURCE_LEGACY_OUTPUT_INVALID')
        selected[key] = value
    if set(selected) != {'requests_sha256', 'expectation_json'}:
        raise RuntimeError('SOURCE_LEGACY_OUTPUT_INVALID')
    sha = lambda value: isinstance(value, str) and re.fullmatch(r'sha256:[a-f0-9]{64}', value) is not None
    if not sha(selected['requests_sha256']) or len(selected['expectation_json'].encode('utf-8')) > 4096:
        raise RuntimeError('SOURCE_LEGACY_METADATA_BOUND')
    def unique(pairs):
        result = {}
        for key, value in pairs:
            if key in result:
                raise RuntimeError('SOURCE_LEGACY_OUTPUT_INVALID')
            result[key] = value
        return result
    expectation = json.loads(selected['expectation_json'], object_pairs_hook=unique)
    if (not isinstance(expectation, dict) or set(expectation) != {
            'productionReferenceAt', 'modelBinding', 'historyDemandSha256',
            'registrySha256', 'sourceHashes', 'requestsSha256'}
            or not isinstance(expectation['productionReferenceAt'], str)
            or re.fullmatch(r'[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:00:00[.]000Z', expectation['productionReferenceAt']) is None
            or any(not sha(expectation[key]) for key in ('historyDemandSha256', 'registrySha256', 'requestsSha256'))
            or expectation['requestsSha256'] != selected['requests_sha256']):
        raise RuntimeError('SOURCE_LEGACY_OUTPUT_INVALID')
    from datetime import datetime, timezone
    canonical_target = datetime.fromisoformat(expected_target.replace('Z', '+00:00')).astimezone(timezone.utc).isoformat(timespec='milliseconds').replace('+00:00', 'Z')
    if expectation['productionReferenceAt'] != canonical_target:
        raise RuntimeError('SOURCE_LEGACY_TARGET_CHANGED')
    binding = expectation['modelBinding']
    fields = {'modelId', 'stateSchemaVersion', 'variantId', 'profileId', 'componentSchemaId',
        'explanationSchemaId', 'rankingPolicyId', 'bestTimePolicyId', 'presentationPolicyId',
        'modelContractSha256', 'modelBundleSha256'}
    if (not isinstance(binding, dict) or set(binding) != fields
            or any(not isinstance(value, str)
                or len(json.dumps(value, ensure_ascii=False, separators=(',', ':')).encode('utf-8')) > 256
                for value in binding.values())
            or any(re.fullmatch(r'[a-f0-9]{64}', binding[key]) is None
                for key in ('modelContractSha256', 'modelBundleSha256'))):
        raise RuntimeError('SOURCE_LEGACY_BINDING_METADATA_INVALID')
    sources = expectation['sourceHashes']
    if (not isinstance(sources, dict) or set(sources) != {'zones', 'deployedBulk', 'forecast', 'candidate', 'active'}
            or any(not sha(value) and not (role in {'candidate', 'active'} and value is None)
                for role, value in sources.items())):
        raise RuntimeError('SOURCE_LEGACY_OUTPUT_INVALID')
    # P reconstructs and checks its OWN immutable expectation from the owned
    # full request. Never forward this long JSON as generic normal output.
    return {'requests_sha256': selected['requests_sha256']}


def _source_normal_outputs(data, phase, expected_target=None):
    if phase == 69:
        return _source_legacy_request_outputs(data, expected_target)
    # Only normal routing fields cross this private channel. They remain
    # semantic child outputs, not ownership, original authentication or stop.
    allowed = {
        0: {'status', 'terminal_code', 'strict_current_anchor_ready', 'candidate_promoted'},
        5: {'target_hour', 'production_reference_at', 'local_dmi_count', 'target_part_count',
            'required_pair_count', 'required_pairs_sha256', 'operational_required_pair_count',
            'advisory_history_required_pair_count'},
        6: {'source_stage_ready', 'source_stage_reusable', 'source_stage_present',
            'source_stage_status', 'source_stage_baseline_saved', 'cache_present',
            'complete_range_present', 'operational_seal_present', 'shadow_invalid',
            'production_reference_at', 'required_pair_count', 'selected_record_ref_count',
            'missing_pair_count'},
        9: {'checkpoint_written', 'missing_pair_count'},
        42: {'strict_active_ready', 'candidate_seeded', 'extended', 'missing_pair_counts_json'},
        23: {'should_run', 'dmi_changed', 'reason', 'age_minutes'},
        29: {'cache_hit'},
        30: {'distribution_ready'},
        32: {'cache_hit'},
        43: {'cache_hit', 'cache_exact'},
        44: {'cache_hit', 'cache_exact'},
        45: {'cache_key', 'run_attempt', 'artifact_name', 'artifact_digest'},
        47: {'cache_hit', 'cache_exact'},
        48: {'target_hour', 'closure_id', 'attestation_sha256'},
        49: {'reused', 'target_hour', 'closure_id', 'attestation_sha256'},
        51: {'candidate_seeded'},
        64: {'artifact_id', 'artifact_name', 'archive_bytes', 'archive_sha', 'sealed_bytes', 'sealed_sha'},
        65: {'checkpoint_version', 'checkpoint_reference', 'checkpoint_reason', 'checkpoint_bundle', 'checkpoint_contract', 'checkpoint_continuation'},
        66: {'private_version', 'private_reference', 'private_reason', 'private_bundle', 'private_object', 'private_count', 'private_rollback', 'private_retention_failures', 'private_anonymous_denied'},
    }.get(phase, set())
    selected = {}
    for line in data.decode('utf-8').splitlines():
        if not line:
            continue
        key, separator, value = line.partition('=')
        # Unknown normal diagnostics never become selectors. Multiline output
        # syntax is not accepted as one of these fixed single-line fields.
        if key not in allowed:
            continue
        if not separator or len(value) > 256 or '\0' in value:
            raise RuntimeError('SOURCE_NORMAL_OUTPUT_INVALID')
        # The normal OM writer publishes intermediate checkpoints and then its
        # terminal values. Match the existing GITHUB_OUTPUT last-value rule.
        selected[key] = value
    return selected



_SOURCE_ORIGINAL_TARGET_DMI_LEAF = 'original-target-dmi-input.json'


def _source_original_target_copy_clock(stop_ns):
    import select
    if time.monotonic_ns() >= stop_ns:
        raise RuntimeError('SOURCE_COHORT_CLOCK_EXPIRED_OR_INVALID')
    if select.select([3], [], [], 0)[0]:
        os.read(3, 1)
        raise RuntimeError('SOURCE_COHORT_CONTROL_EOF')


def _source_original_target_copy_identity(info):
    return tuple(getattr(info, key) for key in
        ('st_dev', 'st_ino', 'st_mode', 'st_nlink', 'st_size', 'st_mtime_ns', 'st_ctime_ns'))


def _source_close_original_target_copy(row, primary):
    import errno
    if row['close_attempted']:
        raise RuntimeError('SOURCE_ORIGINAL_TARGET_COPY_CLOSE_REPEATED')
    row['close_attempted'] = True
    try:
        os.close(row['fd'])
    except BaseException as error:
        if primary is None:
            primary = error
    try:
        os.fstat(row['fd'])
    except BaseException as error:
        if type(error) is OSError and error.errno == errno.EBADF:
            row['closed'] = True
        elif primary is None:
            primary = error
    if not row['closed'] and primary is None:
        primary = RuntimeError('SOURCE_ORIGINAL_TARGET_COPY_CLOSE_UNPROVED')
    return primary


def _source_assert_original_target_dmi_input(row, stop_ns):
    import hashlib
    import stat
    _source_original_target_copy_clock(stop_ns)
    actual, named = os.fstat(row['fd']), os.stat(
        _SOURCE_ORIGINAL_TARGET_DMI_LEAF, dir_fd=6, follow_symlinks=False)
    if (not stat.S_ISREG(actual.st_mode) or not stat.S_ISREG(named.st_mode)
            or actual.st_nlink != 1 or named.st_nlink != 1
            or _source_original_target_copy_identity(actual) != row['identity']
            or _source_original_target_copy_identity(named) != row['identity']
            or _source_original_target_copy_identity(os.fstat(4)) != row['original_identity']):
        raise RuntimeError('SOURCE_ORIGINAL_TARGET_COPY_CHANGED')
    digest, position = hashlib.sha256(), 0
    while position < actual.st_size:
        _source_original_target_copy_clock(stop_ns)
        chunk = os.pread(row['fd'], min(65536, actual.st_size - position), position)
        if not chunk:
            raise RuntimeError('SOURCE_ORIGINAL_TARGET_COPY_TRUNCATED')
        position += len(chunk)
        digest.update(chunk)
    if (os.pread(row['fd'], 1, position) or digest.hexdigest() != row['sha256']
            or _source_original_target_copy_identity(os.fstat(row['fd'])) != row['identity']
            or _source_original_target_copy_identity(os.stat(_SOURCE_ORIGINAL_TARGET_DMI_LEAF,
                dir_fd=6, follow_symlinks=False)) != row['identity']
            or _source_original_target_copy_identity(os.fstat(4)) != row['original_identity']):
        raise RuntimeError('SOURCE_ORIGINAL_TARGET_COPY_CHANGED')


def _source_materialize_original_target_dmi_input(stop_ns, owned_rows):
    import hashlib
    import stat
    from lib.dmi_bulk_storage import MAX_STORED_BYTES
    _source_original_target_copy_clock(stop_ns)
    original = os.fstat(4)
    if (not stat.S_ISREG(original.st_mode) or original.st_nlink != 1
            or not 1 < original.st_size <= MAX_STORED_BYTES
            or not stat.S_ISDIR(os.fstat(6).st_mode)):
        raise RuntimeError('SOURCE_ORIGINAL_TARGET_COPY_INPUT_INVALID')
    original_identity = _source_original_target_copy_identity(original)
    descriptor = os.open(_SOURCE_ORIGINAL_TARGET_DMI_LEAF,
        os.O_RDWR | os.O_CREAT | os.O_EXCL | os.O_NOFOLLOW | os.O_CLOEXEC, 0o600, dir_fd=6)
    writer = {'fd': descriptor, 'stream': None, 'stat': None,
        'close_attempted': False, 'closed': False}
    owned_rows.append(writer)  # Retain before any subsequent stat/write can fail.
    primary, digest, position = None, hashlib.sha256(), 0
    try:
        created = os.fstat(descriptor)
        writer['stat'] = created
        if not stat.S_ISREG(created.st_mode) or created.st_nlink != 1 or created.st_size != 0:
            raise RuntimeError('SOURCE_ORIGINAL_TARGET_COPY_OUTPUT_INVALID')
        while position < original.st_size:
            _source_original_target_copy_clock(stop_ns)
            chunk = os.pread(4, min(65536, original.st_size - position), position)
            if not chunk:
                raise RuntimeError('SOURCE_ORIGINAL_TARGET_COPY_TRUNCATED')
            offset = 0
            while offset < len(chunk):
                _source_original_target_copy_clock(stop_ns)
                written = os.write(descriptor, chunk[offset:])
                if written <= 0:
                    raise RuntimeError('SOURCE_ORIGINAL_TARGET_COPY_SHORT_WRITE')
                offset += written
            digest.update(chunk)
            position += len(chunk)
        if (os.pread(4, 1, position)
                or _source_original_target_copy_identity(os.fstat(4)) != original_identity):
            raise RuntimeError('SOURCE_ORIGINAL_TARGET_COPY_INPUT_CHANGED')
        os.fsync(descriptor)
        copied = os.fstat(descriptor)
        if ((copied.st_dev, copied.st_ino) != (created.st_dev, created.st_ino)
                or copied.st_size != original.st_size or copied.st_nlink != 1):
            raise RuntimeError('SOURCE_ORIGINAL_TARGET_COPY_CHANGED')
        writer['stat'] = copied
        writer['identity'] = _source_original_target_copy_identity(copied)
        writer['original_identity'], writer['sha256'] = original_identity, digest.hexdigest()
        _source_assert_original_target_dmi_input(writer, stop_ns)
    except BaseException as error:
        primary = error
    primary = _source_close_original_target_copy(writer, primary)
    if primary is not None:
        raise primary
    # Publish no pathname before the writer is physically closed. Reopen the
    # one own regular leaf, never resolve/readlink the authenticated original.
    descriptor = os.open(_SOURCE_ORIGINAL_TARGET_DMI_LEAF,
        os.O_RDONLY | os.O_NOFOLLOW | os.O_CLOEXEC, dir_fd=6)
    reader = {'fd': descriptor, 'stream': None, 'stat': writer['stat'],
        'identity': writer['identity'], 'original_identity': original_identity,
        'sha256': writer['sha256'], 'close_attempted': False, 'closed': False}
    owned_rows.append(reader)
    _source_assert_original_target_dmi_input(reader, stop_ns)
    return reader


def _source_progress_union_birth_readback(stop_ns, owned_rows, created_row, worker_pid):
    import hashlib
    import json
    import stat
    if created_row is None or not any(row is created_row for row in owned_rows):
        raise RuntimeError('SOURCE_UNION_BIRTH_NOT_CREATED')
    descriptor, birth = created_row['fd'], created_row['birth']
    actual = os.fstat(descriptor)
    named = os.stat('union-birth.jsonl',dir_fd=6,follow_symlinks=False)
    keys = ('st_dev','st_ino','st_mode','st_nlink','st_size','st_mtime_ns','st_ctime_ns')
    if (created_row['closed'] or created_row['close_attempted']
            or not stat.S_ISREG(birth.st_mode) or birth.st_size!=0 or birth.st_nlink!=1
            or not 2 <= actual.st_size <= 32*1024*1024
            or any(getattr(actual,k)!=getattr(named,k) for k in keys)
            or any(getattr(actual,k)!=getattr(birth,k) for k in keys[:4])):
        raise RuntimeError('SOURCE_UNION_BIRTH_CHANGED')
    created_row['stat']=actual
    raw=bytearray()
    while len(raw)<actual.st_size:
        _source_original_target_copy_clock(stop_ns)
        body=os.pread(descriptor,min(65536,actual.st_size-len(raw)),len(raw))
        if not body: raise RuntimeError('SOURCE_UNION_BIRTH_TRUNCATED')
        raw.extend(body)
    if (os.pread(descriptor,1,len(raw)) or not raw.endswith(b'\n')
            or any(getattr(actual,k)!=getattr(os.fstat(descriptor),k)
                or getattr(actual,k)!=getattr(os.stat('union-birth.jsonl',dir_fd=6,follow_symlinks=False),k) for k in keys)):
        raise RuntimeError('SOURCE_UNION_BIRTH_CHANGED')
    lines=bytes(raw).splitlines()
    if not 2 <= len(lines) <= 393216 or any(not line or len(line)>8192 for line in lines):
        raise RuntimeError('SOURCE_UNION_BIRTH_FORMAT_INVALID')
    header, terminal=json.loads(lines[0]),json.loads(lines[-1])
    if (set(header)!={'schemaVersion','actor','pid','event','parent','root','journal'}
            or header['schemaVersion']!=1 or header['actor']!='node' or header['pid']!=worker_pid
            or header['event']!='header' or header['parent']!=os.getpid()
            or header['journal']!={key:str(getattr(birth,source)) for key,source in zip(
                ('dev','ino','mode','nlink','size','mtimeNs','ctimeNs'),keys)}
            or set(terminal)!={'schemaVersion','actor','pid','event'} or terminal['schemaVersion']!=1
            or terminal['actor']!='node' or terminal['pid']!=worker_pid or terminal['event']!='worker-complete'):
        raise RuntimeError('SOURCE_UNION_BIRTH_WORKER_UNPROVED')
    return {'union_birth_sha256':hashlib.sha256(raw).hexdigest(),'union_birth_bytes':str(len(raw)),
        **{'union_birth_'+key:str(getattr(birth,source)) for key,source in zip(
            ('dev','ino','mode','nlink','size'),keys[:5])}}

def _source_progress_union_readback(stop_ns, expected_target, owned_rows, created_report_row):
    # Only this fixed file in H's inherited mkdir-born FD6. JSON carries
    # semantic rows; kernel ECHILD + H's own FD close precede any ACK.
    import hashlib
    import json
    import stat
    leaf = 'union-result.json'
    before = os.stat(leaf, dir_fd=6, follow_symlinks=False)
    if (not stat.S_ISREG(before.st_mode) or before.st_nlink != 1
            or not 2 <= before.st_size <= 32 * 1024 * 1024):
        raise RuntimeError('SOURCE_PROGRESS_UNION_RESULT_INVALID')
    row = created_report_row
    if row is None or not any(item is row for item in owned_rows) or row['closed'] or row['close_attempted']:
        raise RuntimeError('SOURCE_PROGRESS_UNION_BIRTH_UNPROVED')
    birth = row['birth']
    descriptor = row['fd']
    if (not stat.S_ISREG(birth.st_mode) or birth.st_nlink != 1 or birth.st_size != 0
            or any(getattr(before, key) != getattr(birth, key) for key in ('st_dev', 'st_ino', 'st_mode', 'st_nlink'))):
        raise RuntimeError('SOURCE_PROGRESS_UNION_BIRTH_CHANGED')
    row['stat'] = before
    # Return the row on success. On any raw failure it remains with that same
    # failure, rather than being silently closed or substituted.
    try:
        keys = ('st_dev', 'st_ino', 'st_mode', 'st_nlink', 'st_size', 'st_mtime_ns', 'st_ctime_ns')
        if any(getattr(os.fstat(descriptor), k) != getattr(before, k) for k in keys):
            raise RuntimeError('SOURCE_PROGRESS_UNION_RESULT_CHANGED')
        raw = bytearray()
        while len(raw) < before.st_size:
            _source_original_target_copy_clock(stop_ns)
            chunk = os.pread(descriptor, min(65536, before.st_size - len(raw)), len(raw))
            if not chunk:
                raise RuntimeError('SOURCE_PROGRESS_UNION_RESULT_TRUNCATED')
            raw.extend(chunk)
        actual, named = os.fstat(descriptor), os.stat(leaf, dir_fd=6, follow_symlinks=False)
        if (os.pread(descriptor, 1, len(raw)) or any(getattr(before, k) != getattr(actual, k)
                or getattr(before, k) != getattr(named, k) for k in keys)):
            raise RuntimeError('SOURCE_PROGRESS_UNION_RESULT_CHANGED')
        value = json.loads(raw.decode('utf-8'))
        if (not isinstance(value, dict) or set(value) != {'schemaVersion', 'kind', 'target', 'outputs', 'catalog', 'result'}
                or value['schemaVersion'] != 1 or value['kind'] != 'SOURCE_PROGRESS_UNION_RESULT'
                or value['target'] != expected_target or not isinstance(value['outputs'], list)
                or len(value['outputs']) > 131072 or not isinstance(value['catalog'], dict)
                or set(value['catalog']) != {'files', 'directories'}
                or not isinstance(value['catalog']['files'], list)
                or len(value['catalog']['files']) > 131072 or not isinstance(value['catalog']['directories'], list)
                or len(value['catalog']['directories']) > 131072 or not isinstance(value['result'], dict)):
            raise RuntimeError('SOURCE_PROGRESS_UNION_RESULT_INVALID')
        original = os.fstat(4)
        if not stat.S_ISREG(original.st_mode) or not 2 <= original.st_size <= 32 * 1024 * 1024:
            raise RuntimeError('SOURCE_PROGRESS_UNION_INPUT_CHANGED')
        digest, position = hashlib.sha256(), 0
        while position < original.st_size:
            _source_original_target_copy_clock(stop_ns)
            chunk = os.pread(4, min(65536, original.st_size-position), position)
            if not chunk:
                raise RuntimeError('SOURCE_PROGRESS_UNION_INPUT_TRUNCATED')
            digest.update(chunk)
            position += len(chunk)
        if os.pread(4, 1, position) or any(getattr(original, k) != getattr(os.fstat(4), k) for k in keys):
            raise RuntimeError('SOURCE_PROGRESS_UNION_INPUT_CHANGED')
        return row, {'union_result_sha256': hashlib.sha256(raw).hexdigest(),
            'union_result_bytes': str(len(raw)), 'union_input_sha256': digest.hexdigest(),
            'union_output_count': str(len(value['outputs'])),
            'union_catalog_count': str(len(value['catalog']['files'])),
            'union_result_birth_dev': str(birth.st_dev), 'union_result_birth_ino': str(birth.st_ino),
            'union_result_birth_mode': str(birth.st_mode), 'union_result_birth_nlink': str(birth.st_nlink),
            'union_result_birth_size': str(birth.st_size)}
    except BaseException:
        raise  # Actual row remains in the enclosing H owner on every failure.


def _run_source_normal_program_cohort() -> int:
    import errno
    import fcntl
    import hashlib
    import json
    import math
    import selectors
    import stat
    import struct
    require_closed_subset()
    root = Path(__file__).resolve().parents[2]
    parent = os.getppid()
    entry = root / '.github/actions/save-owned-dmi-grib/index.cjs'
    argv = Path(f'/proc/{parent}/cmdline').read_bytes()
    fields = argv.split(b'\0')
    spelling = fields[1] if len(fields) == 3 else b''
    while b'/./' in spelling:
        spelling = spelling.replace(b'/./', b'/')
    if (len(argv) > 16384 or fields[-1:] != [b''] or spelling != os.fsencode(str(entry))
            or Path(os.readlink(f'/proc/{parent}/exe')).name != 'node'
            or os.getppid() != parent or os.environ.get('INPUT_OPERATION') != 'source'):
        raise RuntimeError('SOURCE_NORMAL_PARENT_UNPROVED')
    nonce, stop_ns = _source_dmi_clock(3)
    phase = _source_read_exact(3, 1)[0]
    length = struct.unpack('>I', _source_read_exact(3, 4))[0]
    if (phase not in range(4, 72) and phase not in (72, 73, 74, 75, 76, 77, 78, 79, 80, 81, 82, 83)) or not 2 <= length <= 4096:
        raise RuntimeError('SOURCE_NORMAL_SELECTION_INVALID')
    options = json.loads(_source_read_exact(3, length).decode('utf-8'))
    if not _LOCK.acquire(blocking=False):
        raise RuntimeError('SOURCE_COHORT_CONCURRENT_OWNER_REFUSED')
    owner = _LinuxSubsetOwner(math.nextafter(stop_ns / 1_000_000_000, -math.inf))
    primary, child, selector, result = None, None, None, None
    output_row, executable_row, report_row, received = None, None, None, bytearray()
    version_child, report_path, seal_result = None, None, None
    union_result_row = None
    union_birth_row = None
    target_rows = []
    target_copy_rows, target_copy = [], None
    try:
        owner.enter()
        try:
            if phase == 71:
                for descriptor in (4, 5, 6, 7):
                    row = {'fd': descriptor, 'stream': None, 'stat': None,
                        'close_attempted': False, 'closed': False}
                    target_rows.append(row)
                    row['stat'] = os.fstat(descriptor)
                    if (not (stat.S_ISREG(row['stat'].st_mode) if descriptor == 4 else stat.S_ISDIR(row['stat'].st_mode))
                            or row['stat'].st_nlink < 1
                            or (descriptor == 4 and (row['stat'].st_nlink != 1
                                or not 2 <= row['stat'].st_size <= 32 * 1024 * 1024))
                            or fcntl.fcntl(descriptor, fcntl.F_GETFL) & os.O_ACCMODE != os.O_RDONLY):
                        raise RuntimeError('SOURCE_PROGRESS_UNION_FD_UNPROVED')
                if os.listdir(6):
                    raise RuntimeError('SOURCE_PROGRESS_UNION_OUTPUT_EXISTS')
                result_fd = os.open('union-result.json', os.O_RDWR | os.O_CREAT | os.O_EXCL | os.O_NOFOLLOW | os.O_CLOEXEC, 0o600, dir_fd=6)
                union_result_row = {'fd': result_fd, 'stream': None, 'stat': None, 'birth': None,
                    'close_attempted': False, 'closed': False}
                target_rows.append(union_result_row)
                union_result_row['birth'] = union_result_row['stat'] = os.fstat(result_fd)
                born = union_result_row['birth']
                if not stat.S_ISREG(born.st_mode) or born.st_nlink != 1 or born.st_size != 0:
                    raise RuntimeError('SOURCE_PROGRESS_UNION_BIRTH_UNPROVED')
                journal_fd = os.open('union-birth.jsonl', os.O_RDWR | os.O_APPEND | os.O_CREAT | os.O_EXCL | os.O_NOFOLLOW | os.O_CLOEXEC, 0o600, dir_fd=6)
                union_birth_row = {'fd': journal_fd, 'stream': None, 'stat': None, 'birth': None, 'close_attempted': False, 'closed': False}
                target_rows.append(union_birth_row)
                union_birth_row['birth'] = union_birth_row['stat'] = os.fstat(journal_fd)
                born_journal = union_birth_row['birth']
                if not stat.S_ISREG(born_journal.st_mode) or born_journal.st_nlink != 1 or born_journal.st_size != 0:
                    raise RuntimeError('SOURCE_UNION_BIRTH_NOT_CREATED')
            if phase == 70:
                for descriptor in (4, 5, 6):
                    row = {'fd': descriptor, 'stream': None, 'stat': None,
                        'close_attempted': False, 'closed': False}
                    target_rows.append(row)
                    row['stat'] = os.fstat(descriptor)
                    if (not (stat.S_ISREG(row['stat'].st_mode) if descriptor == 4
                             else stat.S_ISDIR(row['stat'].st_mode))
                            or (descriptor == 4 and (row['stat'].st_nlink != 1
                                or not 1 <= row['stat'].st_size <= 768 * 1024 * 1024))
                            or (descriptor != 4 and row['stat'].st_nlink < 1)
                            or fcntl.fcntl(descriptor, fcntl.F_GETFL) & os.O_ACCMODE != os.O_RDONLY):
                        raise RuntimeError('SOURCE_CP_INVENTORY_FD_UNPROVED')
                try:
                    os.stat('inventory.json', dir_fd=6, follow_symlinks=False)
                except FileNotFoundError:
                    pass
                else:
                    raise RuntimeError('SOURCE_CP_INVENTORY_OUTPUT_EXISTS')
            if phase == 68:
                for descriptor in (4, 5, 6):
                    row = {'fd': descriptor, 'stream': None, 'stat': None,
                        'close_attempted': False, 'closed': False}
                    target_rows.append(row)
                    row['stat'] = os.fstat(descriptor)
                    if (not (stat.S_ISDIR(row['stat'].st_mode) if descriptor == 6
                             else stat.S_ISREG(row['stat'].st_mode))
                            or row['stat'].st_nlink < 1
                            or (descriptor != 6 and row['stat'].st_nlink != 1)
                            or fcntl.fcntl(descriptor, fcntl.F_GETFL) & os.O_ACCMODE != os.O_RDONLY):
                        raise RuntimeError('SOURCE_ORIGINAL_TARGET_FD_UNPROVED')
                target_copy = _source_materialize_original_target_dmi_input(stop_ns, target_copy_rows)
            descriptor = os.memfd_create('ravradar-source-normal-output', os.MFD_CLOEXEC | os.MFD_ALLOW_SEALING)
            output_row = {'fd': descriptor, 'stream': None, 'stat': None,
                'close_attempted': False, 'closed': False}
            output_row['stat'] = os.fstat(descriptor)
            output_row['stream'] = os.fdopen(descriptor, 'a+b', buffering=0)
            output_path = f'/proc/{os.getpid()}/fd/{descriptor}'
            command, environment = _source_normal_program(root, phase, options, output_path)
            if phase == 71:
                # An actual H-created FD, never a caller-selected descriptor.
                environment['RAVRADAR_SOURCE_UNION_RESULT_FD'] = str(union_result_row['fd'])
                environment['RAVRADAR_SOURCE_UNION_BIRTH_FD'] = str(union_birth_row['fd'])
            if phase == 16:
                temporary = Path(environment['RUNNER_TEMP'])
                temporary_info = temporary.lstat()
                if not stat.S_ISDIR(temporary_info.st_mode) or stat.S_ISLNK(temporary_info.st_mode):
                    raise RuntimeError('SOURCE_NORMAL_SEAL_TEMP_UNPROVED')
                report_path = temporary / 'weather-progress-save-report.json'
                try:
                    report_path.lstat()
                except FileNotFoundError:
                    pass
                else:
                    raise RuntimeError('SOURCE_NORMAL_SEAL_REPORT_EXISTS')
            # Bind the resolved real executable to this phase, not only PATH.
            executable = os.path.realpath(command[0])
            handle = os.open(executable, os.O_RDONLY | os.O_NOFOLLOW | os.O_CLOEXEC)
            executable_row = {'fd': handle, 'stream': None, 'stat': None,
                'close_attempted': False, 'closed': False}
            executable_row['stat'] = os.fstat(handle)
            executable_row['stream'] = os.fdopen(handle, 'rb', buffering=0)
            if not stat.S_ISREG(executable_row['stat'].st_mode):
                raise RuntimeError('SOURCE_NORMAL_EXECUTABLE_UNPROVED')
            command[0] = executable
            if phase in (4, 12, 16, 17, 27, 28, 29, 30, 32, 33, 43, 44, 45, 46, 47, 48, 49, 50, 67, 69) or phase in range(52, 67) or phase == 71 or phase in (72, 73, 74, 75, 76, 77, 78, 80, 81, 82, 83):
                # Fixed runtime check, within the SAME issued cohort cutoff.
                # No new timeout and no caller-selected executable/version.
                version_child = subprocess.Popen([executable, '--version'], cwd=root,
                    executable=f'/proc/self/fd/{handle}', pass_fds=(handle,),
                    stdin=subprocess.DEVNULL, stdout=subprocess.PIPE, stderr=subprocess.PIPE,
                    close_fds=True)
                import select
                while True:
                    remaining = owner.deadline - time.monotonic()
                    if remaining <= 0:
                        raise RuntimeError('SOURCE_COHORT_CLOCK_EXPIRED_OR_INVALID')
                    if select.select([3], [], [], 0)[0]:
                        _source_failure_control(3, nonce, phase, stop_ns, owner)
                    try:
                        out, err = version_child.communicate(timeout=min(0.05, remaining))
                        break
                    except subprocess.TimeoutExpired:
                        continue
                if version_child.returncode != 0 or err or len(out) > 64 or not out.startswith(b'v24.' if phase in (29, 30, 32, 43, 44, 47, 64, 65, 66, 71) else b'v22.'):
                    raise RuntimeError('SOURCE_NORMAL_NODE22_REQUIRED')
            # Execute the actual retained regular binary fd. Preserve argv[0]
            # as its real canonical path (Python's normal sys.executable), but
            # do not reopen that pathname or race a short-lived /proc/PID/exe.
            child = subprocess.Popen(command, cwd=root, env=environment,
                executable=f'/proc/self/fd/{handle}',
                pass_fds=(handle, 4, 5, 6, 7, union_result_row['fd'], union_birth_row['fd']) if phase == 71 else (handle, 4, 5, 6) if phase in (68, 70) else (handle,),
                stdin=subprocess.DEVNULL, close_fds=True,
                stdout=subprocess.DEVNULL if phase in (64, 65, 66, 71) else None,
                stderr=subprocess.DEVNULL if phase in (64, 65, 66, 71) else None)
            selector = selectors.DefaultSelector()
            selector.register(3, selectors.EVENT_READ)
            while result is None:
                remaining = owner.deadline - time.monotonic()
                if remaining <= 0:
                    raise RuntimeError('SOURCE_COHORT_CLOCK_EXPIRED_OR_INVALID')
                if selector.select(min(0.05, remaining)):
                    _source_failure_control(3, nonce, phase, stop_ns, owner)
                if os.fstat(descriptor).st_size > 131072:
                    raise RuntimeError('SOURCE_NORMAL_OUTPUT_TOO_LARGE')
                result = child.poll()
            selector.close()
            selector = None
        except BaseException as error:
            primary = error
        cohort_drained = False
        try:
            owner.drain()
            cohort_drained = True
        except BaseException as error:
            if primary is None:
                primary = error
            if not stop_unproved(primary):
                _retain(primary, owner)
            else:
                _UNPROVED[id(primary)][2].append(owner)
        # Nothing parses or publishes output before the actual cohort drains.
        if primary is None:
            try:
                if owner.children_observed or type(result) is not int or not 0 <= result <= 255:
                    raise RuntimeError('SOURCE_NORMAL_CHILD_STOP_UNPROVED')
                if phase == 68:
                    _source_assert_original_target_dmi_input(target_copy, stop_ns)
                current = os.fstat(output_row['fd'])
                if ((current.st_dev, current.st_ino) != (output_row['stat'].st_dev, output_row['stat'].st_ino)
                        or current.st_size > 131072):
                    raise RuntimeError('SOURCE_NORMAL_OUTPUT_CHANGED')
                seals = fcntl.F_SEAL_GROW | fcntl.F_SEAL_SHRINK | fcntl.F_SEAL_WRITE | fcntl.F_SEAL_SEAL
                fcntl.fcntl(output_row['fd'], fcntl.F_ADD_SEALS, seals)
                if fcntl.fcntl(output_row['fd'], fcntl.F_GET_SEALS) & seals != seals:
                    raise RuntimeError('SOURCE_NORMAL_OUTPUT_UNSEALED')
                while len(received) < current.st_size:
                    chunk = os.pread(output_row['fd'], min(65536, current.st_size - len(received)), len(received))
                    if not chunk:
                        raise RuntimeError('SOURCE_NORMAL_OUTPUT_TRUNCATED')
                    received.extend(chunk)
                if os.pread(output_row['fd'], 1, len(received)):
                    raise RuntimeError('SOURCE_NORMAL_OUTPUT_CHANGED')
                outputs = _source_normal_outputs(bytes(received), phase, options['target'])
                if phase == 71 and result == 0:
                    report_row, outputs = _source_progress_union_readback(stop_ns, options['target'], target_rows, union_result_row)
                    outputs.update(_source_progress_union_birth_readback(stop_ns, target_rows, union_birth_row, child.pid))
                if phase == 70 and result == 0:
                    # ECHILD has actually been observed before this readback.
                    named = os.stat('inventory.json', dir_fd=6, follow_symlinks=False)
                    if (not stat.S_ISREG(named.st_mode) or named.st_nlink != 1
                            or not 2 <= named.st_size <= 32 * 1024 * 1024):
                        raise RuntimeError('SOURCE_CP_INVENTORY_OUTPUT_INVALID')
                    descriptor = os.open('inventory.json', os.O_RDONLY | os.O_NOFOLLOW | os.O_CLOEXEC, dir_fd=6)
                    report_row = {'fd': descriptor, 'stream': None, 'stat': named,
                        'close_attempted': False, 'closed': False}
                    actual = os.fstat(descriptor)
                    keys = ('st_dev', 'st_ino', 'st_mode', 'st_nlink', 'st_size', 'st_mtime_ns', 'st_ctime_ns')
                    if any(getattr(named, key) != getattr(actual, key) for key in keys):
                        raise RuntimeError('SOURCE_CP_INVENTORY_OUTPUT_CHANGED')
                    raw, position = bytearray(), 0
                    while position < named.st_size:
                        if time.monotonic_ns() >= stop_ns:
                            raise RuntimeError('SOURCE_COHORT_CLOCK_EXPIRED_OR_INVALID')
                        chunk = os.pread(descriptor, min(65536, named.st_size - position), position)
                        if not chunk:
                            raise RuntimeError('SOURCE_CP_INVENTORY_OUTPUT_TRUNCATED')
                        raw.extend(chunk)
                        position += len(chunk)
                    if os.pread(descriptor, 1, position):
                        raise RuntimeError('SOURCE_CP_INVENTORY_OUTPUT_CHANGED')
                    actual = os.fstat(descriptor)
                    after_named = os.stat('inventory.json', dir_fd=6, follow_symlinks=False)
                    if any(getattr(named, key) != getattr(actual, key)
                           or getattr(named, key) != getattr(after_named, key) for key in keys):
                        raise RuntimeError('SOURCE_CP_INVENTORY_OUTPUT_CHANGED')
                    inventory = json.loads(raw.decode('utf-8'))
                    if (not isinstance(inventory, dict)
                            or inventory.get('kind') != 'CP_COMPONENT_STORAGE_INVENTORY'
                            or inventory.get('schemaVersion') != 1
                            or not isinstance(inventory.get('files'), list)
                            or len(inventory['files']) > 65536):
                        raise RuntimeError('SOURCE_CP_INVENTORY_OUTPUT_INVALID')
                    bank_hash, position = hashlib.sha256(), 0
                    bank_info = os.fstat(4)
                    while position < bank_info.st_size:
                        if time.monotonic_ns() >= stop_ns:
                            raise RuntimeError('SOURCE_COHORT_CLOCK_EXPIRED_OR_INVALID')
                        chunk = os.pread(4, min(65536, bank_info.st_size - position), position)
                        if not chunk:
                            raise RuntimeError('SOURCE_CP_INVENTORY_BANK_TRUNCATED')
                        bank_hash.update(chunk)
                        position += len(chunk)
                    if os.pread(4, 1, position):
                        raise RuntimeError('SOURCE_CP_INVENTORY_BANK_CHANGED')
                    outputs = {'cp_inventory_sha256': hashlib.sha256(raw).hexdigest(),
                        'cp_inventory_bytes': str(len(raw)), 'cp_bank_sha256': bank_hash.hexdigest()}
                    # The ordinary owned-row physical-close loop still precedes ACK.
                if phase == 16 and result == 0:
                    # This is the actual exclusive report created by the fixed
                    # normal seal CLI, not a caller object or previous attempt.
                    before = report_path.lstat()
                    if (not stat.S_ISREG(before.st_mode) or before.st_nlink != 1
                            or not 2 <= before.st_size <= 4096):
                        raise RuntimeError('SOURCE_NORMAL_SEAL_REPORT_INVALID')
                    descriptor = os.open(report_path, os.O_RDONLY | os.O_NOFOLLOW | os.O_CLOEXEC)
                    report_row = {'fd': descriptor, 'stream': None, 'stat': before,
                        'close_attempted': False, 'closed': False}
                    report_row['stream'] = os.fdopen(descriptor, 'rb', buffering=0)
                    raw = os.pread(descriptor, 4097, 0)
                    after = os.fstat(descriptor)
                    named = report_path.lstat()
                    fields = ('st_dev', 'st_ino', 'st_mode', 'st_nlink', 'st_size', 'st_mtime_ns', 'st_ctime_ns')
                    if (len(raw) != before.st_size or os.pread(descriptor, 1, len(raw))
                            or any(getattr(before, key) != getattr(after, key) or
                                   getattr(before, key) != getattr(named, key) for key in fields)):
                        raise RuntimeError('SOURCE_NORMAL_SEAL_REPORT_CHANGED')
                    seal_result = json.loads(raw.decode('utf-8'))
                    if (not isinstance(seal_result, dict) or seal_result.get('schemaVersion') != 1
                            or seal_result.get('kind') != 'WEATHER_COMPONENT_PROGRESS_CACHE_RESULT'
                            or type(seal_result.get('saved')) is not bool):
                        raise RuntimeError('SOURCE_NORMAL_SEAL_REPORT_INVALID')
                    outputs = {'saved': 'true' if seal_result['saved'] else 'false'}
                    if seal_result['saved']:
                        count = seal_result.get('encryptedBytes')
                        if (type(count) is not int or count <= 0
                                or seal_result.get('status') != 'SAVED'
                                or seal_result.get('code') != 'ENCRYPTED_PROGRESS_SAVED'):
                            raise RuntimeError('SOURCE_NORMAL_SEAL_REPORT_INVALID')
                        outputs['encrypted_bytes'] = str(count)
            except BaseException as error:
                primary = error
        # Own output/executable handles close once. Cleanup cannot replace an
        # earlier raw failure, and every uncertain row is retained with it.
        for row in (output_row, executable_row, report_row, *target_rows, *target_copy_rows):
            if row is None or row['closed'] or row['close_attempted']:
                continue
            try:
                actual = os.fstat(row['fd'])
                if row['stat'] is None or (actual.st_dev, actual.st_ino) != (row['stat'].st_dev, row['stat'].st_ino):
                    raise RuntimeError('SOURCE_NORMAL_OWNED_FD_CHANGED')
                if row in target_rows:
                    keys = ('st_dev', 'st_ino', 'st_mode') if phase == 71 and row['fd'] == 6 else ('st_dev', 'st_ino', 'st_mode', 'st_nlink')
                    mutable_union_output = phase == 71 and cohort_drained and (row is union_result_row or row is union_birth_row)
                    # H created these exact mutable output descriptors. After
                    # actual cohort drain, byte changes do not prevent own
                    # physical close. They NEVER attest successful readback.
                    if row['fd'] != 6 and not mutable_union_output:
                        keys += ('st_size', 'st_mtime_ns', 'st_ctime_ns')
                    if any(getattr(actual, key) != getattr(row['stat'], key) for key in keys):
                        raise RuntimeError('SOURCE_ORIGINAL_TARGET_FD_CHANGED')
                row['close_attempted'] = True
                if row['stream'] is None:
                    os.close(row['fd'])
                else:
                    row['stream'].close()
                try:
                    os.fstat(row['fd'])
                except OSError as error:
                    if type(error) is OSError and error.errno == errno.EBADF:
                        row['closed'] = True
                    else:
                        raise
                if not row['closed']:
                    raise RuntimeError('SOURCE_NORMAL_OWNED_FD_UNCLOSED')
            except BaseException as error:
                if primary is None:
                    primary = error
        try:
            if primary is None:
                owner.leave()
        except BaseException as error:
            if primary is None:
                primary = error
        if primary is not None:
            if not stop_unproved(primary):
                _retain(primary, owner)
            _UNPROVED[id(primary)][2].extend([child, version_child, selector, output_row, executable_row, report_row, received, target_rows, target_copy_rows])
            raise primary
        if time.monotonic_ns() >= stop_ns:
            raise RuntimeError('SOURCE_COHORT_CLOCK_EXPIRED_OR_INVALID')
        body = json.dumps({'schemaVersion': 1, 'kind': 'SOURCE_NORMAL_PHASE_CLOSED',
            'phase': phase, 'exitCode': result, 'outputs': outputs,
            'outputBytes': len(received), 'outputSha256': hashlib.sha256(received).hexdigest()},
            sort_keys=True, separators=(',', ':')).encode('ascii')
        if len(body) > 4096:
            raise RuntimeError('SOURCE_NORMAL_RESULT_TOO_LARGE')
        _source_write_exact(3, b'RRSPG4E1' + nonce + bytes([phase]) + struct.pack('>I', len(body)) + body)
        return 0
    except BaseException as error:
        if not stop_unproved(error):
            _retain(error, owner)
        _UNPROVED[id(error)][2].extend([child, version_child, selector, output_row, executable_row, report_row, received, target_rows, target_copy_rows])
        raise
    finally:
        if not owner.active:
            _LOCK.release()


if __name__ == "__main__":
    if sys.argv[1:] not in (["--source-dmi-cohort"], ["--source-normal-phase-cohort"], ["--source-normal-program-cohort"]):
        raise SystemExit(STOP_UNPROVED_EXIT)
    try:
        raise SystemExit(_run_source_dmi_cohort() if sys.argv[1:] == ["--source-dmi-cohort"]
            else _run_source_normal_phase_cohort() if sys.argv[1:] == ["--source-normal-phase-cohort"]
            else _run_source_normal_program_cohort())
    except Exception:
        # No raw provider/credential diagnostics. Missing full private response
        # means the same Node operation remains retained, regardless of exit.
        raise SystemExit(STOP_UNPROVED_EXIT)
