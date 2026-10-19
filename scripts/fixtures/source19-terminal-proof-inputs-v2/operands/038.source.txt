"""Linux-only normal-supervisor own-process regression; synthetic local processes only.

No Windows skip counts as evidence. The existing source bridge runs this target
on native Linux. Import the repository's real supervisor through its existing
test seam; do not rewrite Popen or inject a separate child session. The normal
product launch owns its producer's group/session.
This measures SIGTERM/SIGINT and normal completion of the supervisor's own
producer/reader. It does not prove hosted runner loss, all descendants, shared
writer quiescence, authenticated B/S or failure SAVE.
"""
from __future__ import annotations

import ctypes
import errno
import json
import os
from pathlib import Path
import select
import shutil
import signal
import subprocess
import sys
import tempfile
import time
import unittest


ROOT = Path(__file__).resolve().parents[1]
TEST_SEAM = ROOT / "scripts/test-dmi-bulk-supervised.py"
BODY_SECONDS = 8.0
CLEANUP_SECONDS = 3.0

# This process enters the ACTUAL main -> run_supervised -> Popen chain. Only
# the existing PRODUCER seam selects our own file instead of the DMI program.
# Its argv, cwd and environment propagation are real; no topology is injected.
SUPERVISOR = r'''
import errno, importlib.util, json, os, pathlib, runpy, sys
def no_network(event, args):
    if event.startswith("socket."):
        raise RuntimeError("SYNTHETIC_NETWORK_FORBIDDEN")
sys.addaudithook(no_network)
seam = runpy.run_path(sys.argv[1], run_name="supervisor_loss_fixture_seam")
supervisor = seam["supervisor"]
supervisor.PRODUCER = pathlib.Path(sys.argv[2])
root = pathlib.Path(os.environ["OWN_SUPERVISOR_LOSS_ROOT"])
caller = os.environ.get("OWN_PROCESS_CALLER", "supervised")
if caller == "cp":
    spec = importlib.util.spec_from_file_location("own_cp", supervisor.ROOT /
        "scripts/run-copernicus-current-pilot-with-retry.py")
    supervisor = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(supervisor)
    supervisor.PILOT = pathlib.Path(sys.argv[2])
    sys.argv = [str(spec.origin), "--attempts", "1", "--timeout-seconds", "6",
                "--backoff-seconds", "0", "--", "--refresh-only"]
normal_run = getattr(supervisor, "run_supervised", None)
normal_popen = supervisor.subprocess.Popen
normal_thread = getattr(getattr(supervisor, "threading", None), "Thread", None)
owned = []
readers = []

def retain_popen(*args, **kwargs):
    child = normal_popen(*args, **kwargs)
    if child.stdout is None:
        owned.append((child, None, None, None))
        (root / "supervisor-reader-ready").write_text(json.dumps({
            "producerPid": child.pid, "pipeDevice": None, "pipeInode": None}), encoding="ascii")
        return child
    descriptor = child.stdout.fileno()
    identity = os.fstat(descriptor)
    owned.append((child, descriptor, identity.st_dev, identity.st_ino))
    return child

def retain_reader(*args, **kwargs):
    reader = normal_thread(*args, **kwargs)
    if getattr(kwargs.get("target"), "__name__", None) == "pump_output":
        readers.append(reader)
        normal_start = reader.start
        def start_owned_reader():
            result = normal_start()
            child, descriptor, device, inode = owned[0]
            actual = os.fstat(descriptor)
            if (len(owned) != 1 or len(readers) != 1 or reader.ident is None
                    or not reader.is_alive()
                    or (actual.st_dev, actual.st_ino) != (device, inode)):
                raise RuntimeError("OWN_READER_START_OBSERVATION_FAILED")
            (root / "supervisor-reader-ready.new").write_text(json.dumps({
                "producerPid": child.pid, "pipeDevice": device,
                "pipeInode": inode}), encoding="ascii")
            (root / "supervisor-reader-ready.new").rename(root / "supervisor-reader-ready")
            return result
        reader.start = start_owned_reader
    return reader

def run_owned(command, environment, *, watchdog_seconds):
    return normal_run(command, environment, watchdog_seconds=watchdog_seconds,
                      popen=retain_popen)

if caller == "supervised":
    supervisor.run_supervised = run_owned
    supervisor.threading.Thread = retain_reader
else:
    supervisor.subprocess.Popen = retain_popen
    if caller == "finalizer":
        supervisor.run_supervised = lambda *a, **k: supervisor.SupervisedResult(-9, True, None)
failure = None
try:
    code = supervisor.main()
except BaseException as error:
    failure = error
finally:
    supervisor.subprocess.Popen = normal_popen
    if normal_run is not None:
        supervisor.run_supervised = normal_run
        supervisor.threading.Thread = normal_thread

try:
    if len(owned) != 1 or len(readers) != (1 if caller == "supervised" else 0):
        raise RuntimeError("OWN_READER_COMPLETION_OBSERVATION_FAILED")
    child, descriptor, device, inode = owned[0]
    reader = readers[0] if readers else None
    try:
        actual = os.fstat(descriptor) if descriptor is not None else None
    except OSError as error:
        pipe_state = "CLOSED_OWN_EBADF" if error.errno == errno.EBADF else "UNKNOWN_ERROR"
    else:
        pipe_state = "NOT_PIPED" if actual is None else ("OPEN_SAME_OBJECT" if
                      (actual.st_dev, actual.st_ino) == (device, inode)
                      else "OPEN_CHANGED_OBJECT")
    # Probe the original fd BEFORE opening the observation file; do not close,
    # signal or wait for any producer here. Only normal supervisor code may stop it.
    observation = {
        "producerPid": child.pid, "producerExited": child.poll() is not None,
        "readerStarted": reader.ident is not None if reader else False,
        "readerAlive": reader.is_alive() if reader else False,
        "pipeDevice": device, "pipeInode": inode,
        "pipeClosed": child.stdout.closed if child.stdout else None, "pipeState": pipe_state,
    }
    (root / "supervisor-completed").write_text(json.dumps(observation), encoding="ascii")
except BaseException:
    if failure is not None:
        raise failure
    raise
if failure is not None:
    raise failure
raise SystemExit(code)
'''

PRODUCER = r'''
import json, os, pathlib, subprocess, sys, time
def no_network(event, args):
    if event.startswith("socket."):
        raise RuntimeError("SYNTHETIC_NETWORK_FORBIDDEN")
sys.addaudithook(no_network)
root = pathlib.Path(os.environ["OWN_SUPERVISOR_LOSS_ROOT"])
state = pathlib.Path("/proc/self/stat").read_text().rsplit(")", 1)[1].split()
identity = {"pid": os.getpid(), "ppid": os.getppid(), "pgid": os.getpgrp(),
            "sid": os.getsid(0), "start": int(state[19])}
if os.environ.get("OWN_PROCESS_DESCENDANT") == "1":
    subprocess.Popen([sys.executable, "-u", str(root / "descendant.py")])
with (root / "heartbeat").open("wb", buffering=0) as output:
    output.write(b".")
    (root / "ready.new").write_text(json.dumps(identity), encoding="ascii")
    (root / "ready.new").rename(root / "ready")
    deadline = time.monotonic() + 8.0
    while time.monotonic() < deadline:
        output.write(b".")
        if (root / "finish-own-producer").exists():
            break
        time.sleep(0.01)
'''

DESCENDANT = r'''
import json, os, pathlib, signal, sys, time
def no_network(event, args):
    if event.startswith("socket."):
        raise RuntimeError("SYNTHETIC_NETWORK_FORBIDDEN")
sys.addaudithook(no_network)
signal.signal(signal.SIGTERM, signal.SIG_IGN)
root = pathlib.Path(os.environ["OWN_SUPERVISOR_LOSS_ROOT"])
state = pathlib.Path("/proc/self/stat").read_text().rsplit(")", 1)[1].split()
identity = {"pid": os.getpid(), "ppid": os.getppid(), "pgid": os.getpgrp(),
            "sid": os.getsid(0), "start": int(state[19])}
with (root / "descendant-heartbeat").open("wb", buffering=0) as output:
    output.write(b".")
    (root / "descendant-ready.new").write_text(json.dumps(identity), encoding="ascii")
    (root / "descendant-ready.new").rename(root / "descendant-ready")
    deadline = time.monotonic() + 8.0
    while time.monotonic() < deadline:
        output.write(b".")
        time.sleep(0.01)
'''


def read_small(path: Path) -> bytes:
    with path.open("rb") as stream:
        value = stream.read(4097)
    if len(value) > 4096:
        raise RuntimeError("OWN_FIXTURE_OBSERVATION_BOUND")
    return value


def process_identity(pid: int) -> dict:
    fields = read_small(Path(f"/proc/{pid}/stat")).decode("ascii").rsplit(")", 1)[1].split()
    return {"pid": pid, "ppid": int(fields[1]), "pgid": int(fields[2]),
            "sid": int(fields[3]), "start": int(fields[19])}


def exited(descriptor: int, seconds: float = 0.0) -> bool:
    poll = select.poll()
    poll.register(descriptor, select.POLLIN)
    events = poll.poll(max(0, int(seconds * 1000)))
    if not events:
        return False
    if any(fd != descriptor or flags & (select.POLLERR | select.POLLNVAL)
           or not flags & select.POLLIN for fd, flags in events):
        raise RuntimeError("OWN_PIDFD_EXIT_UNPROVED")
    return True


def assert_pidfd_identity(descriptor: int, pid: int) -> None:
    info = read_small(Path(f"/proc/self/fdinfo/{descriptor}")).decode("ascii")
    identities = [int(line.split(":", 1)[1]) for line in info.splitlines()
                  if line.startswith("Pid:")]
    if identities != [pid] or exited(descriptor):
        raise RuntimeError("OWN_PIDFD_IDENTITY_UNPROVED")


def require_no_children() -> None:
    try:
        os.waitid(os.P_ALL, 0, os.WEXITED | os.WNOHANG | os.WNOWAIT)
    except ChildProcessError:
        return
    # Never reap/signal an ambient child. Run this narrow test in its own process.
    raise RuntimeError("OWN_FIXTURE_AMBIENT_CHILD_REFUSED")


class SupervisorParentLoss(unittest.TestCase):
    def test_full_log_pipe_cannot_block_asset_watchdog_or_claim_logger_completion(self):
        self.assertEqual(sys.platform, "linux", "NATIVE_LINUX_REQUIRED; no Windows skip/proof")
        import array
        import fcntl
        import termios

        for name in ("pidfd_open", "waitid", "P_PIDFD", "WNOWAIT", "pipe2"):
            self.assertTrue(hasattr(os, name), f"NATIVE_LINUX_API_REQUIRED:{name}")
        self.assertTrue(hasattr(signal, "pidfd_send_signal"))
        self.assertEqual(signal.getsignal(signal.SIGCHLD), signal.SIG_DFL)
        self.assertEqual(signal.getitimer(signal.ITIMER_REAL), (0.0, 0.0))
        require_no_children()
        # As in the existing harness, adoption is test cleanup/reaping only;
        # it never stops the producer or satisfies the measurement below.
        libc = ctypes.CDLL(None, use_errno=True)
        libc.prctl.argtypes = [ctypes.c_int, ctypes.c_ulong, ctypes.c_ulong, ctypes.c_ulong, ctypes.c_ulong]
        libc.prctl.restype = ctypes.c_int
        previous = ctypes.c_int()
        self.assertEqual(libc.prctl(37, ctypes.addressof(previous), 0, 0, 0), 0)
        self.assertEqual(libc.prctl(36, 1, 0, 0, 0), 0)
        parent_root = Path(tempfile.gettempdir()).resolve()
        root = Path(tempfile.mkdtemp(prefix="rr-supervisor-loss-", dir=parent_root)).resolve()
        parent = None
        parent_fd = child_fd = read_fd = write_fd = None
        child_verified = False
        old_handler = signal.getsignal(signal.SIGALRM)

        def hard_deadline(_number, _frame):
            raise TimeoutError("OWN_SUPERVISOR_LOG_SINK_HARD_DEADLINE")

        def replace_once(source, before, after):
            self.assertEqual(source.count(before), 1, "Existing normal fixture anchor changed")
            return source.replace(before, after, 1)

        def queued_bytes():
            value = array.array("i", [0])
            fcntl.ioctl(read_fd, termios.FIONREAD, value, True)
            return value[0]

        started_at = time.monotonic()
        signal.signal(signal.SIGALRM, hard_deadline)
        signal.setitimer(signal.ITIMER_REAL, BODY_SECONDS)
        try:
            original = root / "original-BS"
            original.write_bytes(b"own unchanged synthetic B/S\n")
            read_fd, write_fd = os.pipe2(os.O_NONBLOCK | os.O_CLOEXEC)
            filled = 0
            while True:
                try:
                    filled += os.write(write_fd, b"f" * 4096)
                except BlockingIOError:
                    break
            self.assertGreater(filled, 0)
            self.assertEqual(queued_bytes(), filled)
            os.set_blocking(write_fd, True)
            pipe_identity = os.fstat(write_fd)

            # Reuse the existing actual main/run_supervised/Popen harness.
            # Only its already-present log/watchdog keyword seams are selected;
            # all kernel process/session/stop operations remain the product's.
            old_run = '''def run_owned(command, environment, *, watchdog_seconds):
    return normal_run(command, environment, watchdog_seconds=watchdog_seconds,
                      popen=retain_popen)
'''
            new_run = '''log_fd = int(os.environ["OWN_BLOCKED_LOG_FD"])
logged = []
def own_log(line):
    logged.append(line)
    if len(logged) == 1:
        identity = os.fstat(log_fd)
        (root / "log-entered.new").write_text(json.dumps({"device": identity.st_dev,
            "inode": identity.st_ino, "banner": line}), encoding="ascii")
        (root / "log-entered.new").rename(root / "log-entered")
    os.write(log_fd, line.encode("utf-8"))
    (root / "log-returned").write_bytes(b"own sink write returned")
def forbid_finalizer(*args, **kwargs):
    (root / "unexpected-finalizer").write_bytes(b"unexpected normal finalizer call")
    raise RuntimeError("OWN_FIXTURE_UNEXPECTED_FINALIZER")
supervisor.finalize_checkpoint = forbid_finalizer
def run_owned(command, environment, *, watchdog_seconds):
    if owned:
        (root / "unexpected-restart").write_bytes(b"unexpected normal restart")
        raise RuntimeError("OWN_FIXTURE_UNEXPECTED_RESTART")
    result = normal_run(command, environment, watchdog_seconds=0.1,
                        popen=retain_popen, log=own_log)
    (root / "unexpected-result").write_bytes(b"unexpected SupervisedResult")
    return result
'''
            supervisor_source = replace_once(SUPERVISOR, old_run, new_run)
            tail = '''if failure is not None:
    raise failure
raise SystemExit(code)
'''
            observed_tail = '''retained = supervisor._unclosed_supervised_outputs
if len(retained) != 1 or len(supervisor._unclosed_supervised_processes) != 1:
    raise RuntimeError("OWN_LOG_SINK_RETENTION_MISSING")
process, retained_reader, logger, events, log_events, log = retained[0]
observation.update({"failure": str(failure), "mainReturned": failure is None,
    "sameProcess": process.child is owned[0][0]
        and supervisor._unclosed_supervised_processes[0] is process,
    "sameReader": retained_reader is readers[0], "sameLog": log is own_log,
    "loggerAlive": logger.is_alive(), "loggerStarted": logger.ident is not None,
    "queuedLog": log_events.qsize(), "logCalls": len(logged)})
(root / "sink-unknown.new").write_text(json.dumps(observation), encoding="ascii")
(root / "sink-unknown.new").rename(root / "sink-unknown")
# The measurement is already persisted. Fixture release/join below is cleanup,
# never product quiescence or permission to return a SupervisedResult.
while not (root / "release-own-sink").exists():
    supervisor.time.sleep(0.01)
logger.join(timeout=1.0)
if logger.is_alive():
    raise RuntimeError("OWN_FIXTURE_LOGGER_CLEANUP_UNPROVED")
owned[0][0].stdout.close()
os.close(log_fd)
if failure is not None:
    raise failure
raise RuntimeError("OWN_FIXTURE_MISSING_FATAL_RESULT")
'''
            supervisor_source = replace_once(supervisor_source, tail, observed_tail)
            producer_source = replace_once(PRODUCER,
                '    deadline = time.monotonic() + 8.0\n',
                '    print("own banner before asset START", flush=True)\n    marked = False\n    deadline = time.monotonic() + 8.0\n')
            marker = json.dumps({"collection": "dkss_idw", "modelRun": "2026-08-30T06:00:00Z",
                                 "validTime": "2026-08-30T12:00:00Z", "itemId": "own-synthetic",
                                 "assetIdentitySha256": "a" * 64, "assetRevisionSha256": "b" * 64},
                                separators=(",", ":"))
            producer_source = replace_once(producer_source,
                '    while time.monotonic() < deadline:\n',
                '    while time.monotonic() < deadline:\n'
                '        if not marked and (root / "allow-own-start").exists():\n'
                f'            print({("DMI_ASSET_PROCESSING_START=" + marker)!r}, flush=True)\n'
                '            marked = True\n')
            producer = root / "synthetic-producer.py"
            producer.write_text(producer_source, encoding="utf-8")
            environment = {name: value for name, value in os.environ.items()
                           if name in {"PATH", "LD_LIBRARY_PATH", "LIBRARY_PATH", "LANG", "LC_ALL", "LC_CTYPE"}}
            environment.update({"PYTHONDONTWRITEBYTECODE": "1", "PYTHONNOUSERSITE": "1", "PYTHONUTF8": "1",
                                "OWN_SUPERVISOR_LOSS_ROOT": str(root), "OWN_BLOCKED_LOG_FD": str(write_fd)})
            parent = subprocess.Popen([sys.executable, "-u", "-c", supervisor_source,
                                       str(TEST_SEAM), str(producer)], cwd=ROOT, env=environment,
                                      stdin=subprocess.DEVNULL, stdout=subprocess.DEVNULL,
                                      stderr=subprocess.DEVNULL, pass_fds=(write_fd,))
            parent_fd = os.pidfd_open(parent.pid, 0)
            assert_pidfd_identity(parent_fd, parent.pid)
            ready_paths = [root / name for name in ("ready", "supervisor-reader-ready", "log-entered")]
            while not all(path.exists() for path in ready_paths):
                self.assertIsNone(parent.poll(), "Normal supervisor exited before actual sink blockage")
                self.assertLess(time.monotonic() - started_at, 4.0)
                time.sleep(0.01)
            announced = json.loads(read_small(root / "ready"))
            pid = announced["pid"]
            self.assertIs(type(pid), int)
            self.assertGreater(pid, 1)
            self.assertNotIn(pid, (os.getpid(), parent.pid))
            child_fd = os.pidfd_open(pid, 0)
            assert_pidfd_identity(child_fd, pid)
            identity = process_identity(pid)
            self.assertEqual(identity, announced)
            self.assertEqual((identity["ppid"], identity["pgid"], identity["sid"]), (parent.pid, pid, pid))
            self.assertEqual(process_identity(parent.pid)["ppid"], os.getpid())
            self.assertEqual(read_small(Path(f"/proc/{pid}/cmdline")).split(b"\0")[:-1],
                             [os.fsencode(sys.executable), b"-u", os.fsencode(producer)])
            self.assertEqual(Path(f"/proc/{pid}/cwd").resolve(), ROOT)
            self.assertEqual(process_identity(pid), identity)
            assert_pidfd_identity(child_fd, pid)
            child_verified = True
            log_entered = json.loads(read_small(root / "log-entered"))
            self.assertEqual(log_entered, {"device": pipe_identity.st_dev, "inode": pipe_identity.st_ino,
                                           "banner": "own banner before asset START\n"})
            self.assertEqual(queued_bytes(), filled)
            self.assertFalse((root / "log-returned").exists())
            heartbeat = root / "heartbeat"
            size = heartbeat.stat().st_size
            time.sleep(0.03)
            self.assertGreater(heartbeat.stat().st_size, size)
            self.assertFalse(exited(child_fd))
            (root / "allow-own-start").write_bytes(b"permit normal START behind blocked banner\n")
            # No test signal, stop file, sink read or release precedes this exit.
            self.assertTrue(exited(child_fd, 1.0), "Normal watchdog did not stop the actual producer")
            self.assertEqual(queued_bytes(), filled)
            while not (root / "sink-unknown").exists():
                self.assertIsNone(parent.poll())
                time.sleep(0.01)  # The unchanged eight-second body alarm bounds this wait.
            observation = json.loads(read_small(root / "sink-unknown"))
            self.assertEqual(observation["failure"], "DMI_SUPERVISOR_LOGGER_STOP_UNPROVED")
            for key in ("sameProcess", "sameReader", "sameLog", "loggerAlive", "loggerStarted", "producerExited"):
                self.assertIs(observation[key], True, key)
            for key in ("mainReturned", "readerAlive", "pipeClosed"):
                self.assertIs(observation[key], False, key)
            self.assertEqual(observation["pipeState"], "OPEN_SAME_OBJECT")
            self.assertEqual(observation["logCalls"], 1)
            self.assertGreaterEqual(observation["queuedLog"], 1)
            self.assertEqual(observation["producerPid"], pid)
            self.assertEqual(queued_bytes(), filled)
            self.assertFalse(exited(parent_fd))
            for name in ("log-returned", "unexpected-result", "unexpected-restart", "unexpected-finalizer", "finish-own-producer"):
                self.assertFalse((root / name).exists(), name)
            size = heartbeat.stat().st_size
            time.sleep(0.03)
            self.assertEqual(heartbeat.stat().st_size, size)
            self.assertEqual(original.read_bytes(), b"own unchanged synthetic B/S\n")
            self.assertLess(time.monotonic() - started_at, 7.0, "Synthetic producer expiry cannot satisfy the test")

            # Only after BOTH product-death and unknown-logger observations may
            # the fixture drain its own sink and allow fixture shutdown.
            drained = bytearray()
            (root / "release-own-sink").write_bytes(b"post-measurement fixture cleanup\n")
            while not exited(parent_fd):
                try:
                    drained.extend(os.read(read_fd, 65536))
                except BlockingIOError:
                    time.sleep(0.01)
                self.assertLessEqual(len(drained), filled + 4096)
            self.assertEqual(parent.wait(timeout=0.5), 1, "Unknown logger completion must remain fatal after fixture release")
            self.assertTrue((root / "log-returned").exists())
        finally:
            primary = sys.exc_info()[1]
            signal.setitimer(signal.ITIMER_REAL, CLEANUP_SECONDS)
            try:
                if parent_fd is not None and not exited(parent_fd):
                    signal.pidfd_send_signal(parent_fd, signal.SIGKILL)
                if parent is not None:
                    parent.wait(timeout=1.0)
                if child_fd is not None:
                    if not child_verified:
                        raise RuntimeError("OWN_CHILD_UNVERIFIED; exact root retained")
                    if not exited(child_fd):
                        signal.pidfd_send_signal(child_fd, signal.SIGKILL)
                    if not exited(child_fd, 1.0):
                        raise RuntimeError("OWN_CHILD_STOP_UNPROVED; exact root retained")
                    try:
                        os.waitid(os.P_PIDFD, child_fd, os.WEXITED | os.WNOHANG)
                    except ChildProcessError:
                        pass
                require_no_children()
                for descriptor in (child_fd, parent_fd, read_fd, write_fd):
                    if descriptor is not None:
                        os.close(descriptor)
                        try:
                            os.fstat(descriptor)
                        except OSError as error:
                            if error.errno != errno.EBADF:
                                raise
                        else:
                            raise RuntimeError("OWN_FIXTURE_FD_CLOSE_UNPROVED")
                self.assertEqual(libc.prctl(36, previous.value, 0, 0, 0), 0)
                self.assertEqual(root.parent, parent_root)
                self.assertTrue(root.name.startswith("rr-supervisor-loss-"))
                shutil.rmtree(root)
                self.assertFalse(root.exists())
            except BaseException as cleanup_error:
                if primary is None:
                    raise
                primary.add_note(f"OWN_FIXTURE_CLEANUP_UNPROVED:{type(cleanup_error).__name__}; root retained")
            finally:
                signal.setitimer(signal.ITIMER_REAL, 0)
                signal.signal(signal.SIGALRM, old_handler)

    def test_sigterm_supervisor_cannot_leave_real_producer_alive(self):
        self.assert_own_supervisor_completion(signal.SIGTERM)

    def test_sigint_supervisor_stops_own_producer_and_reader(self):
        self.assert_own_supervisor_completion(signal.SIGINT)

    def test_normal_completion_closes_own_producer_and_reader(self):
        self.assert_own_supervisor_completion(None)

    def test_normal_callers_stop_group_descendant_before_returning(self):
        for caller in ("supervised", "finalizer", "cp"):
            for interruption in (None, signal.SIGTERM):
                with self.subTest(caller=caller, interruption=interruption):
                    self.assert_own_supervisor_completion(interruption, caller=caller,
                                                         descendant=True)

    def assert_own_supervisor_completion(self, interruption, *, caller="supervised",
                                        descendant=False):
        self.assertEqual(sys.platform, "linux", "NATIVE_LINUX_REQUIRED; no Windows skip/proof")
        for name in ("pidfd_open", "waitid", "P_PIDFD", "WNOWAIT"):
            self.assertTrue(hasattr(os, name), f"NATIVE_LINUX_API_REQUIRED:{name}")
        self.assertTrue(hasattr(signal, "pidfd_send_signal"))
        self.assertEqual(signal.getsignal(signal.SIGCHLD), signal.SIG_DFL)
        require_no_children()

        # Test-only adoption lets us reap ONLY our identified orphan after loss.
        # It is NOT a product fix, and does not signal or stop any child itself.
        libc = ctypes.CDLL(None, use_errno=True)
        libc.prctl.argtypes = [ctypes.c_int, ctypes.c_ulong, ctypes.c_ulong,
                              ctypes.c_ulong, ctypes.c_ulong]
        libc.prctl.restype = ctypes.c_int
        previous = ctypes.c_int()
        self.assertEqual(libc.prctl(37, ctypes.addressof(previous), 0, 0, 0), 0)
        self.assertEqual(libc.prctl(36, 1, 0, 0, 0), 0)

        parent_root = Path(tempfile.gettempdir()).resolve()
        root = Path(tempfile.mkdtemp(prefix="rr-supervisor-loss-", dir=parent_root)).resolve()
        parent = None
        parent_fd = child_fd = descendant_fd = None
        child_verified = False
        descendant_verified = False
        old_handler = signal.getsignal(signal.SIGALRM)

        def hard_deadline(_number, _frame):
            raise TimeoutError("OWN_SUPERVISOR_LOSS_HARD_DEADLINE")

        started_at = time.monotonic()
        signal.signal(signal.SIGALRM, hard_deadline)
        signal.setitimer(signal.ITIMER_REAL, BODY_SECONDS)
        try:
            original = root / "original-BS"
            original.write_bytes(b"own unchanged synthetic B/S\n")
            producer = root / "synthetic-producer.py"
            producer.write_text(PRODUCER, encoding="utf-8")
            if descendant:
                (root / "descendant.py").write_text(DESCENDANT, encoding="utf-8")
            # Retain only runtime necessities, not provider credentials or the
            # source gate's GITHUB_OUTPUT; no DMI timing/budget overrides.
            environment = {name: value for name, value in os.environ.items()
                           if name in {"PATH", "LD_LIBRARY_PATH", "LIBRARY_PATH",
                                       "LANG", "LC_ALL", "LC_CTYPE"}}
            environment.update({"PYTHONDONTWRITEBYTECODE": "1", "PYTHONNOUSERSITE": "1",
                "PYTHONUTF8": "1", "OWN_SUPERVISOR_LOSS_ROOT": str(root),
                "OWN_PROCESS_CALLER": caller, "OWN_PROCESS_DESCENDANT": "1" if descendant else "0"})
            parent = subprocess.Popen([sys.executable, "-u", "-c", SUPERVISOR,
                str(TEST_SEAM), str(producer)], cwd=ROOT, env=environment,
                stdin=subprocess.DEVNULL, stdout=subprocess.DEVNULL,
                stderr=subprocess.DEVNULL)
            parent_fd = os.pidfd_open(parent.pid, 0)
            assert_pidfd_identity(parent_fd, parent.pid)
            ready = root / "ready"
            reader_ready = root / "supervisor-reader-ready"
            startup_deadline = time.monotonic() + 4.0
            while (not ready.exists() or not reader_ready.exists()
                   or (descendant and not (root / "descendant-ready").exists())):
                self.assertIsNone(parent.poll(), "actual supervisor exited before fixture readiness")
                self.assertLess(time.monotonic(), startup_deadline, "OWN_FIXTURE_STARTUP_TIMEOUT")
                time.sleep(0.01)
            announced = json.loads(read_small(ready))
            pid = announced["pid"]
            self.assertIs(type(pid), int)
            self.assertGreater(pid, 1)
            self.assertNotIn(pid, (os.getpid(), parent.pid))
            child_fd = os.pidfd_open(pid, 0)
            assert_pidfd_identity(child_fd, pid)
            identity = process_identity(pid)
            observed_reader = json.loads(read_small(reader_ready))
            self.assertEqual(set(observed_reader), {"producerPid", "pipeDevice", "pipeInode"})
            self.assertEqual(observed_reader["producerPid"], pid)
            if caller == "supervised":
                self.assertIs(type(observed_reader["pipeDevice"]), int)
                self.assertIs(type(observed_reader["pipeInode"]), int)
            else:
                self.assertIsNone(observed_reader["pipeDevice"])
                self.assertIsNone(observed_reader["pipeInode"])
            self.assertEqual(identity, announced)
            self.assertEqual(identity["ppid"], parent.pid, "not the actual supervisor's direct child")
            supervisor_identity = process_identity(parent.pid)
            self.assertEqual(supervisor_identity["ppid"], os.getpid())
            # Session/group creation is the actual normal Popen argument, not
            # fixture topology. The runner/supervisor group is never signalled.
            self.assertEqual((identity["pgid"], identity["sid"]),
                             (pid, pid), "actual normal launch did not own its group")
            self.assertNotEqual(identity["pgid"], supervisor_identity["pgid"])
            # A retained pidfd plus stable kernel identity brackets these reads;
            # no caller PID/readiness JSON is by itself signalling authority.
            actual_argv = read_small(Path(f"/proc/{pid}/cmdline")).split(b"\0")[:-1]
            self.assertEqual(actual_argv[:3],
                             [os.fsencode(sys.executable), b"-u", os.fsencode(producer)])
            self.assertEqual(actual_argv[3:], [b"--refresh-only"] if caller == "cp" else [])
            self.assertEqual(Path(f"/proc/{pid}/cwd").resolve(), ROOT)
            self.assertEqual(process_identity(pid), identity)
            assert_pidfd_identity(child_fd, pid)
            self.assertIsNone(parent.poll())
            child_verified = True
            if descendant:
                announced_descendant = json.loads(read_small(root / "descendant-ready"))
                descendant_pid = announced_descendant["pid"]
                self.assertNotIn(descendant_pid, (pid, parent.pid, os.getpid()))
                descendant_fd = os.pidfd_open(descendant_pid, 0)
                assert_pidfd_identity(descendant_fd, descendant_pid)
                self.assertEqual(process_identity(descendant_pid), announced_descendant)
                self.assertEqual(announced_descendant["ppid"], pid)
                self.assertEqual((announced_descendant["pgid"], announced_descendant["sid"]),
                                 (pid, pid))
                self.assertEqual(read_small(Path(f"/proc/{descendant_pid}/cmdline")).split(b"\0")[:-1],
                    [os.fsencode(sys.executable), b"-u", os.fsencode(root / "descendant.py")])
                descendant_verified = True

            heartbeat = root / "heartbeat"
            initial = heartbeat.stat().st_size
            advancing_deadline = time.monotonic() + 0.5
            while heartbeat.stat().st_size == initial and time.monotonic() < advancing_deadline:
                time.sleep(0.01)
            self.assertGreater(heartbeat.stat().st_size, initial, "producer never actually wrote")
            self.assertFalse(exited(child_fd), "producer died before the injected parent loss")
            self.assertEqual(process_identity(parent.pid), supervisor_identity)
            self.assertEqual(process_identity(pid), identity)
            assert_pidfd_identity(child_fd, pid)
            assert_pidfd_identity(parent_fd, parent.pid)
            finish = root / "finish-own-producer"
            self.assertFalse(finish.exists())
            if interruption is None:
                finish.write_bytes(b"own healthy producer completion\n")
            elif interruption == signal.SIGINT:
                signal.pidfd_send_signal(parent_fd, signal.SIGINT)
            else:
                signal.pidfd_send_signal(parent_fd, signal.SIGTERM)
            if descendant:
                # Observe death BEFORE any test kill/reap. As test subreaper we
                # must then reap our exact adopted zombie so the product can
                # observe genuine group absence; no signal is sent here.
                self.assertTrue(exited(descendant_fd, 1.0), "OWN_DESCENDANT_STILL_WRITING")
                self.assertIsNone(parent.poll(), "group zombie must not be called absent")
                self.assertFalse((root / "supervisor-completed").exists(),
                                 "no normal completion before actual group absence")
                dead_size = (root / "descendant-heartbeat").stat().st_size
                time.sleep(0.03)
                self.assertEqual((root / "descendant-heartbeat").stat().st_size, dead_size)
                # SIGKILL can finish the descendant just before its parent.
                # Wait for actual adoption, not a changed PID or a test signal.
                while True:
                    try:
                        reaped = os.waitid(os.P_PIDFD, descendant_fd, os.WEXITED | os.WNOHANG)
                        break
                    except ChildProcessError:
                        self.assertIsNone(parent.poll())
                        time.sleep(0.01)  # Enclosed by the unchanged hard test deadline.
                self.assertEqual(reaped.si_pid, descendant_pid)
            # Fast controlled fixture only; NOT the full production stop reserve.
            code = parent.wait(timeout=1.0)
            if interruption == signal.SIGTERM:
                self.assertIn(code, (-signal.SIGTERM, 128 + signal.SIGTERM),
                              "not the requested supervisor interruption")
            elif interruption == signal.SIGINT:
                self.assertIn(code, (-signal.SIGINT, 128 + signal.SIGINT),
                              "not the requested supervisor interruption")
            else:
                self.assertEqual(code, 0, "normal supervisor completion failed")
            self.assertTrue(exited(parent_fd), "actual supervisor exit unproved")

            # CRITICAL: interruption cases have no child signal/stop file
            # before this measurement; only the healthy control has a finish file.
            # A quiet heartbeat alone, supervisor exit, or later finally kill
            # MUST NOT satisfy the regression's process-exit assertion.
            size_at_parent_exit = heartbeat.stat().st_size
            child_stopped = exited(child_fd, 0.5)
            additional_bytes = heartbeat.stat().st_size - size_at_parent_exit
            self.assertLess(time.monotonic() - started_at, 6.0,
                            "measurement reached the synthetic producer's expiry window")
            self.assertEqual(original.read_bytes(), b"own unchanged synthetic B/S\n")
            print(json.dumps({"kind": "MAIN_DMI_SUPERVISOR_OWN_COMPLETION",
                              "interruption": interruption,
                              "supervisorExited": exited(parent_fd),
                              "producerExited": child_stopped,
                              "additionalOwnBytes": additional_bytes}), flush=True)
            self.assertTrue(child_stopped,
                f"SUPERVISOR_LOSS_WRITER_STILL_LIVE; own additional bytes={additional_bytes}")
            if interruption is not None:
                self.assertFalse(finish.exists(), "interruption must not stop the child by fixture file")
            observed = json.loads(read_small(root / "supervisor-completed"))
            self.assertEqual(observed["producerPid"], pid)
            self.assertIs(observed["producerExited"], True)
            self.assertIs(observed["readerStarted"], caller == "supervised")
            self.assertIs(observed["readerAlive"], False)
            self.assertEqual((observed["pipeDevice"], observed["pipeInode"]),
                             (observed_reader["pipeDevice"], observed_reader["pipeInode"]))
            self.assertIs(observed["pipeClosed"], True if caller == "supervised" else None)
            self.assertEqual(observed["pipeState"], "CLOSED_OWN_EBADF" if caller == "supervised" else "NOT_PIPED")
            with self.assertRaises(ProcessLookupError):
                os.killpg(pid, 0)
            size = heartbeat.stat().st_size
            time.sleep(0.03)
            self.assertEqual(heartbeat.stat().st_size, size)
        finally:
            primary = sys.exc_info()[1]
            signal.setitimer(signal.ITIMER_REAL, CLEANUP_SECONDS)
            try:
                # Only retained kernel handles are signalled, never a PID/group
                # from the fixture file or /proc. This cleanup is AFTER the
                # measurement and cannot turn a product RED into a pass.
                if parent_fd is not None and not exited(parent_fd):
                    signal.pidfd_send_signal(parent_fd, signal.SIGKILL)
                if parent is not None:
                    parent.wait(timeout=1.0)
                if child_fd is not None:
                    if not child_verified:
                        raise RuntimeError("OWN_CHILD_UNVERIFIED; exact root retained")
                    if not exited(child_fd):
                        signal.pidfd_send_signal(child_fd, signal.SIGKILL)
                    if not exited(child_fd, 1.0):
                        raise RuntimeError("OWN_CHILD_STOP_UNPROVED; exact root retained")
                    try:
                        os.waitid(os.P_PIDFD, child_fd, os.WEXITED | os.WNOHANG)
                    except ChildProcessError:
                        pass  # A future fixed supervisor may already reap it.
                if descendant_fd is not None:
                    if not descendant_verified:
                        raise RuntimeError("OWN_DESCENDANT_UNVERIFIED; exact root retained")
                    if not exited(descendant_fd):
                        signal.pidfd_send_signal(descendant_fd, signal.SIGKILL)
                    if not exited(descendant_fd, 1.0):
                        raise RuntimeError("OWN_DESCENDANT_STOP_UNPROVED; exact root retained")
                    try:
                        os.waitid(os.P_PIDFD, descendant_fd, os.WEXITED | os.WNOHANG)
                    except ChildProcessError:
                        pass
                require_no_children()
                for descriptor in (descendant_fd, child_fd, parent_fd):
                    if descriptor is not None:
                        os.close(descriptor)
                        try:
                            os.fstat(descriptor)
                        except OSError as error:
                            if error.errno != errno.EBADF:
                                raise
                        else:
                            raise RuntimeError("OWN_PIDFD_CLOSE_UNPROVED")
                self.assertEqual(libc.prctl(36, previous.value, 0, 0, 0), 0)
                self.assertEqual(root.parent, parent_root)
                self.assertTrue(root.name.startswith("rr-supervisor-loss-"))
                shutil.rmtree(root)
                self.assertFalse(root.exists())
            except BaseException as cleanup_error:
                if primary is None:
                    raise
                primary.add_note(f"OWN_FIXTURE_CLEANUP_UNPROVED:{type(cleanup_error).__name__}; root retained")
            finally:
                signal.setitimer(signal.ITIMER_REAL, 0)
                signal.signal(signal.SIGALRM, old_handler)



# SOURCE cutoff companions. The two copied modules are exact proposal bytes.
# The parent wire issuer and producer are disclosed offline fixtures, NOT A2
# issuance, SOURCE completion, national runtime or runner-loss evidence.
_SOURCE_CUTOFF_MODULES = {
    "scripts/run-dmi-bulk-supervised.py": "f1535c40de770f398da014908c1c42e50c985d06f744d2bf9976b4f2a5929fee",
    "scripts/lib/copernicus_component_process.py": "7d9d9bfbd113b491766578694f6d41bc6d90614bf3ab3b89492ef0da8c9fd71d",
}
# Historical bindings above are immutable evidence, not proof for this successor.
# The three actual Linux cases/assertions below are unchanged; this new exact source identity is UNRUN.
_SOURCE_CUTOFF_CURRENT_MODULES = {
    'scripts/run-dmi-bulk-supervised.py': '3572b4e8dde5a12c290999ef2b64d2c0d059a8e72a410e65270f96b318f8e877',
    'scripts/lib/copernicus_component_process.py': 'aa832d73a46efd23c8466fb685fe034ad25acac44e26fcacf7fb26dca7e22e07'
}

_SOURCE_CUTOFF_NODE = r"""
const fs = require('node:fs'), path = require('node:path');
const {spawn} = require('node:child_process');
const {performance} = require('node:perf_hooks');
function publish(name,value) { const target=path.join(root,name); fs.writeFileSync(target+'.new',JSON.stringify(value)); fs.renameSync(target+'.new',target); }
if (![22,24].includes(Number(process.versions.node.split('.')[0]))) throw Error('NODE_VERSION');
const [python, root, mode] = process.argv.slice(1);
const nonce = Buffer.from(Array.from({length:32},(_,n)=>n)), head = 'a'.repeat(40);
const issued = performance.now() + (mode === 'late' ? 3000 : 600000);
const child = spawn(python, ['-I','-B',path.join(root,'scripts/lib/copernicus_component_process.py'),
  '--source-dmi-cohort'], {cwd:root, env:process.env, stdio:['ignore','ignore','ignore','pipe']});
publish('launcher.json',{pid:process.pid, guardian:child.pid});
const control = child.stdio[3];
let state = 'anchor', pending = Buffer.alloc(0), receipt = {mode, issued, frames:[]}, failure = null;
function refuse(error) { if (failure === null) failure = String(error?.code || 'FIXTURE_PROTOCOL'); control.destroy(); }
control.on('error', refuse); child.on('error', refuse);
control.on('data', bytes => {
  try {
    pending = Buffer.concat([pending,bytes]);
    if (pending.length > 56 + 48 + 48 + 4096) throw Error('BOUND');
    if (state === 'anchor' && pending.length >= 56) {
      const anchor = pending.subarray(0,56); pending = pending.subarray(56);
      const pAfter = performance.now();
      if (!anchor.subarray(0,40).equals(Buffer.concat([Buffer.from('RRSCG4A1'),nonce]))
          || anchor.readUInt32BE(40)!==child.pid || anchor.readUInt32BE(44)!==process.pid) throw Error('IDENTITY');
      const delta = Math.floor(issued) - Math.ceil(pAfter);
      if (!Number.isSafeInteger(delta) || delta <= 0) throw Error('LATE');
      const cutoff = anchor.readBigUInt64BE(48) + BigInt(delta)*1000000n;
      const frame = Buffer.alloc(56); frame.write('RRSCG4D1'); nonce.copy(frame,8);
      frame.writeBigUInt64BE(cutoff,40); frame.writeBigUInt64BE(cutoff,48);
      Object.assign(receipt,{pAfter,anchor:String(anchor.readBigUInt64BE(48)),cutoff:String(cutoff)});
      receipt.frames.push('anchor'); state='bound'; control.write(frame);
    }
    if (state === 'bound' && pending.length >= 48) {
      const bound = pending.subarray(0,48); pending = pending.subarray(48);
      if (!bound.subarray(0,40).equals(Buffer.concat([Buffer.from('RRSCG4B1'),nonce]))
          || String(bound.readBigUInt64BE(40))!==receipt.cutoff) throw Error('BOUND');
      receipt.frames.push('bound'); state='end';
      publish('bound.json',receipt);
    }
    if (state === 'end' && pending.length >= 48) {
      const length = pending.readUInt32BE(44);
      if (length < 2 || length > 4096) throw Error('END_LENGTH');
      if (pending.length < 48 + length) return;
      const end=pending.subarray(0,48+length);pending=pending.subarray(48+length);
      if (!end.subarray(0,40).equals(Buffer.concat([Buffer.from('RRSCG4E1'),nonce]))) throw Error('END');
      const output=JSON.parse(end.subarray(48).toString('utf8'));
      if (JSON.stringify(Object.keys(output).sort()) !== JSON.stringify(
          ['kind','outputBytes','outputSha256','outputs','schemaVersion'])
          || output.schemaVersion!==1 || output.kind!=='SOURCE_DMI_PHASE_CLOSED'
          || !Number.isSafeInteger(output.outputBytes) || output.outputBytes<0 || output.outputBytes>131072
          || !/^[0-9a-f]{64}$/.test(output.outputSha256)
          || !output.outputs || Array.isArray(output.outputs) || typeof output.outputs!=='object'
          || Object.keys(output.outputs).some(k=>!['status','terminal_code','strict_current_anchor_ready','candidate_promoted'].includes(k))
          || Object.values(output.outputs).some(v=>typeof v!=='string'||v.length>256)) throw Error('END_OUTPUT');
      receipt.output=output;receipt.frames.push('end');receipt.result=end.readInt32BE(40);state='done';
    }
  } catch(error) { refuse(error); }
});
const challenge=Buffer.alloc(80);challenge.write('RRSCG4C1');nonce.copy(challenge,8);
challenge.writeUInt32BE(process.pid,40);challenge.writeBigUInt64BE(17n,44);
challenge.writeBigUInt64BE(1n,52);Buffer.from(head,'hex').copy(challenge,60);
control.write(challenge);
child.on('close',(code,signal)=>{
  Object.assign(receipt,{code,signal,state,failure,remainingBytes:pending.length});
  publish('terminal.json',receipt);control.destroy();
});
"""
_SOURCE_CUTOFF_PRODUCER = r"""
import json, os, pathlib, sys, time
def forbid(event, args):
    if event.startswith('socket.'):
        raise RuntimeError('OWN_FIXTURE_NETWORK_FORBIDDEN')
sys.addaudithook(forbid)
root=pathlib.Path(__file__).resolve().parents[1]
stat=pathlib.Path('/proc/self/stat').read_text().rsplit(')',1)[1].split()
identity={'pid':os.getpid(),'ppid':int(stat[1]),'pgid':int(stat[2]),
          'sid':int(stat[3]),'start':int(stat[19]),
          'finalizer':os.environ.get('DMI_BULK_FINALIZE_ONLY')=='true',
          'at':time.monotonic_ns()}
(root/'producer.json.new').write_text(json.dumps(identity),encoding='ascii')
(root/'producer.json.new').rename(root/'producer.json')
while not (root/'release-producer').exists():
    time.sleep(.005)
"""

class SourceGuardianCutoffNative(unittest.TestCase):
    def test_fixed_source_guardian_runs_normal_producer_under_actual_peer_control(self):
        self.assert_source_cutoff("healthy")

    def test_fixed_source_guardian_late_finalizer_does_not_reset_issued_cutoff(self):
        self.assert_source_cutoff("late")

    def test_source_supervisor_refuses_non_guardian_peer_before_producer(self):
        self.assert_source_cutoff("invalid")

    def assert_source_cutoff(self, mode):
        import hashlib
        import socket
        import struct
        self.assertEqual(sys.platform, "linux", "native Linux capability is required, not PASS by skip")
        self.assertEqual(sys.version_info[:2], (3, 12))
        self.assertTrue(hasattr(os, "pidfd_open") and hasattr(signal, "pidfd_send_signal"))
        self.assertIs(signal.getsignal(signal.SIGCHLD), signal.SIG_DFL)
        self.assertEqual(signal.getitimer(signal.ITIMER_REAL), (0.0, 0.0))
        require_no_children()
        node = shutil.which("node")
        self.assertIsNotNone(node)
        # Own native fixture only. The normal source target owns its temporary
        # root and retained pidfds; no provider or production B is loaded.
        root = Path(tempfile.mkdtemp(prefix="rr-source-cutoff-"))
        temporary_parent = root.parent
        original = b"immutable own synthetic B/S before SOURCE cutoff\n"
        paths = {}
        process, channels, descriptors, primary = None, [], [], None
        libc = ctypes.CDLL(None, use_errno=True)
        previous = ctypes.c_int()
        self.assertEqual(libc.prctl(37, ctypes.byref(previous), 0, 0, 0), 0)
        self.assertEqual(libc.prctl(36, 1, 0, 0, 0), 0)  # Fixture cleanup only.
        old_alarm = signal.getsignal(signal.SIGALRM)

        def alarm(*_):
            raise AssertionError("OWN_SOURCE_CUTOFF_BODY_WATCHDOG")

        def own_pid(pid, parent, expected_script=None, allow_exited=False):
            fd = os.pidfd_open(pid, 0)
            index = len(descriptors)
            descriptors.append((pid, fd, None))
            identity = process_identity(pid)
            if allow_exited:
                # Direct Popen child may already be a zombie: WNOWAIT proves
                # this exact pidfd belongs to us without reaping it early.
                os.waitid(os.P_PIDFD, fd, os.WEXITED | os.WNOHANG | os.WNOWAIT)
                info = read_small(Path(f"/proc/self/fdinfo/{fd}")).decode("ascii")
                self.assertIn(f"Pid:\t{pid}\n", info)
            else:
                assert_pidfd_identity(fd, pid)
            self.assertEqual(identity["ppid"], parent)
            if expected_script is not None:
                argv = Path(f"/proc/{pid}/cmdline").read_bytes().split(b"\0")
                self.assertIn(os.fsencode(expected_script), argv)
            self.assertEqual(process_identity(pid), identity)
            descriptors[index] = (pid, fd, identity)
            return fd, identity

        def await_json(name):
            while not (root/name).exists():
                self.assertIsNone(process.poll(), "fixture controller exited before observation")
                time.sleep(.005)
            return json.loads(read_small(root/name))

        try:
            signal.signal(signal.SIGALRM, alarm)
            signal.setitimer(signal.ITIMER_REAL, BODY_SECONDS)
            (root/"original-BS").write_bytes(original)
            for relative, expected in _SOURCE_CUTOFF_CURRENT_MODULES.items():
                raw = (ROOT/relative).read_bytes()
                self.assertEqual(hashlib.sha256(raw.replace(b"\r\n",b"\n")).hexdigest(), expected)
                destination = root/relative
                destination.parent.mkdir(parents=True, exist_ok=True)
                destination.write_bytes(raw)
                paths[relative] = raw
            (root/"scripts/update-dmi-bulk.py").write_text(_SOURCE_CUTOFF_PRODUCER, encoding="utf-8")
            env = {k:v for k,v in os.environ.items()
                   if k.upper() in {"PATH","LD_LIBRARY_PATH","LANG","LC_ALL","TMPDIR",
                                    "SYSTEMROOT","WINDIR","TEMP","TMP","RUNNER_TRACKING_ID"}}
            env.update(GITHUB_RUN_ID="17",GITHUB_RUN_ATTEMPT="1",GITHUB_SHA="a"*40)
            if mode == "invalid":
                sender, receiver = socket.socketpair()
                channels.extend([sender,receiver])
                # Well-formed full frame, but actual peer is this test, not fixed guardian.
                sender.sendall(struct.pack(">8sIQQQ20s",b"RRSDG401",os.getpid(),17,1,
                                           time.monotonic_ns()+3_000_000_000,bytes.fromhex("a"*40)))
                sender.shutdown(socket.SHUT_WR)
                process = subprocess.Popen([sys.executable,"-u",str(root/"scripts/run-dmi-bulk-supervised.py"),
                    "--source-dmi-issued-cutoff"],cwd=root,env=env,stdin=receiver,
                    stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
                fd, _ = own_pid(process.pid,os.getpid(),allow_exited=True)
                self.assertNotEqual(process.wait(timeout=2),0)
                self.assertTrue(exited(fd))
                self.assertFalse((root/"producer.json").exists())
                self.assertFalse((root/"release-producer").exists())
            else:
                process = subprocess.Popen([node,"-e",_SOURCE_CUTOFF_NODE,sys.executable,str(root),mode],
                    cwd=root,env=env,stdin=subprocess.DEVNULL,stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
                own_pid(process.pid,os.getpid())
                launch = await_json("launcher.json")
                self.assertEqual(launch["pid"],process.pid)
                guardian_fd, guardian_id = own_pid(launch["guardian"],process.pid,
                    root/"scripts/lib/copernicus_component_process.py")
                bound = await_json("bound.json")
                self.assertEqual(bound["frames"],["anchor","bound"])
                self.assertGreater(int(bound["cutoff"]),int(bound["anchor"]))
                record = await_json("producer.json")
                supervisor_pid = record["ppid"]
                supervisor_fd, _ = own_pid(supervisor_pid,launch["guardian"],
                    root/"scripts/run-dmi-bulk-supervised.py")
                producer_fd, actual = own_pid(record["pid"],supervisor_pid,
                    root/"scripts/update-dmi-bulk.py")
                self.assertEqual({k:record[k] for k in actual},actual)
                self.assertEqual(record["pgid"],record["pid"])
                self.assertEqual(record["sid"],record["pid"])
                self.assertEqual(record["finalizer"],mode=="late")
                self.assertLess(record["at"],int(bound["cutoff"]))
                if mode == "healthy":
                    (root/"release-producer").write_text("own fixture release",encoding="ascii")
                # First observation of physical producer exit is BEFORE any fixture signal/reap.
                while not exited(producer_fd):
                    time.sleep(.005)
                self.assertEqual((root/"original-BS").read_bytes(),original)
                terminal = await_json("terminal.json")
                self.assertEqual(terminal["remainingBytes"],0)
                self.assertIsNone(terminal["failure"])
                self.assertEqual(process.wait(timeout=1),0)
                self.assertTrue(exited(guardian_fd))
                self.assertTrue(exited(supervisor_fd))
                if mode == "healthy":
                    self.assertEqual(terminal["code"],0)
                    self.assertEqual(terminal["frames"],["anchor","bound","end"])
                    self.assertEqual(terminal["result"],0)
                    self.assertEqual(terminal["output"]["kind"],"SOURCE_DMI_PHASE_CLOSED")
                    self.assertEqual(terminal["output"]["schemaVersion"],1)
                    with self.assertRaises(ProcessLookupError):
                        os.killpg(record["pid"],0)  # Observation only, no stale signal.
                else:
                    self.assertEqual(terminal["code"],77)
                    self.assertEqual(terminal["frames"],["anchor","bound"])
                    self.assertNotIn("result",terminal)
                    self.assertFalse((root/"release-producer").exists())
                    self.assertLess(time.monotonic_ns()-int(bound["cutoff"]),2_000_000_000,
                                    "420 seconds must not restart at late finalizer entry")
                    # No group-absence/SAVE claim here: adopted zombies are only
                    # disposed by the fixture AFTER the measured refusal/exit.
            self.assertEqual((root/"original-BS").read_bytes(),original)
            for relative, raw in paths.items():
                self.assertEqual((root/relative).read_bytes(),raw)
        except BaseException as error:
            primary=error
            raise
        finally:
            try:
                signal.setitimer(signal.ITIMER_REAL,CLEANUP_SECONDS)
                # Disposition of precisely observed actual own children, not a
                # PID read from a file alone and never a post-reap group signal.
                for pid,fd,identity in reversed(descriptors):
                    if not exited(fd):
                        self.assertIsNotNone(identity, "unknown owned pidfd retained without signal")
                        self.assertEqual(process_identity(pid),identity)
                        assert_pidfd_identity(fd,pid)
                        signal.pidfd_send_signal(fd,signal.SIGKILL)
                    self.assertTrue(exited(fd,1))
                if process is not None:
                    process.wait(timeout=1)
                for pid,fd,identity in reversed(descriptors):
                    try:
                        os.waitid(os.P_PIDFD,fd,os.WEXITED|os.WNOHANG)
                    except ChildProcessError:
                        pass
                require_no_children()
                for stream in channels:
                    stream.close()
                for _,fd,_ in descriptors:
                    os.close(fd)
                    with self.assertRaises(OSError) as closed:
                        os.fstat(fd)
                    self.assertEqual(closed.exception.errno,errno.EBADF)
                self.assertEqual(libc.prctl(36,previous.value,0,0,0),0)
                self.assertEqual(root.parent,temporary_parent)
                self.assertTrue(root.name.startswith("rr-source-cutoff-"))
                shutil.rmtree(root)
            except BaseException as cleanup:
                if primary is None:
                    raise
                primary.add_note("OWN_SOURCE_CUTOFF_CLEANUP_UNPROVED; own resources retained")
            finally:
                signal.setitimer(signal.ITIMER_REAL,0)
                signal.signal(signal.SIGALRM,old_alarm)



if __name__ == "__main__":
    unittest.main()
