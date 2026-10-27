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


# SOURCE normal-program lifetime, using the SAME normal subset owner and
# failure-control reader. This is a native ownership unit boundary, NOT a
# forged SOURCE entry, issued C/I/T, argv/JSON admission or successful phase.
SOURCE_PROGRAM_CPU_FIXTURE = r'''
'use strict';
const fs = require('node:fs'), cp = require('node:child_process'), zlib = require('node:zlib');
const root = process.env.OWN_SOURCE_PROGRAM_ROOT;
const file = name => root + '/' + name;
const role = process.argv[2] || 'worker';
const identity = () => {
  const raw = fs.readFileSync('/proc/self/stat', 'utf8');
  const fields = raw.slice(raw.lastIndexOf(')') + 1).trim().split(/\s+/);
  return {pid: process.pid, ppid: process.ppid, pgid: Number(fields[2]),
    sid: Number(fields[3]), start: Number(fields[19])};
};
const announce = name => {
  fs.writeFileSync(file(name + '.new'), JSON.stringify(identity()), {flag:'wx',mode:0o600});
  fs.renameSync(file(name + '.new'), file(name));
};
if (role === 'descendant') {
  process.on('SIGTERM', () => {});
  fs.appendFileSync(file('descendant-heartbeat'), '.');
  announce('descendant-ready');
  setInterval(() => fs.appendFileSync(file('descendant-heartbeat'), '.'), 10);
  setTimeout(() => process.exit(0), 12000);
} else {
  if (process.env.OWN_SOURCE_PROGRAM_DESCENDANT === '1') {
    cp.spawn(process.execPath, [__filename, 'descendant'], {stdio:'ignore'});
  }
  const original = Buffer.alloc(16 * 1024 * 1024, 120);
  const compressed = zlib.gzipSync(original);
  fs.appendFileSync(file('heartbeat'), '.');
  announce('ready');
  setTimeout(() => fs.writeFileSync(file('js-timer-fired'), 'timer'), 5);
  const end = Date.now() + 12000;
  // An actual synchronous gzip/CPU loop: a JavaScript timer cannot stop it.
  // Only the product's external Python kernel owner may end this child.
  while (Date.now() < end && !fs.existsSync(file('finish-own-worker'))) {
    zlib.gunzipSync(compressed, {maxOutputLength:16 * 1024 * 1024});
    fs.appendFileSync(file('heartbeat'), '.');
  }
}
'''


class SourceNormalProgramDeadline(unittest.TestCase):
    def load_helper(self):
        import importlib.util
        self.assertEqual(sys.platform, "linux", "NATIVE_LINUX_REQUIRED; no Windows skip/proof")
        self.assertEqual(signal.getsignal(signal.SIGCHLD), signal.SIG_DFL)
        self.assertEqual(signal.getitimer(signal.ITIMER_REAL), (0.0, 0.0))
        for name in ("pidfd_open", "waitid", "P_PIDFD", "WNOWAIT"):
            self.assertTrue(hasattr(os, name), "NATIVE_LINUX_API_REQUIRED:" + name)
        self.assertTrue(hasattr(signal, "pidfd_send_signal"))
        require_no_children()
        source = ROOT / "scripts/lib/copernicus_component_process.py"
        spec = importlib.util.spec_from_file_location("source_program_deadline_" + str(id(self)), source)
        helper = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(helper)
        return helper

    def test_normal_program_reserve_is_once_inside_same_long_or_short_cutoff(self):
        import inspect
        helper = self.load_helper()
        for duration in (80 * 60.0, 4 * 60.0, 2.0):
            owner = helper._LinuxSubsetOwner(time.monotonic() + duration)
            owner.enter()
            try:
                issued = owner.deadline
                owner.reserve_source_program_work()
                reserve = owner._source_program_drain_reserve
                self.assertGreater(reserve, 0)
                self.assertLessEqual(reserve, 240.0)
                self.assertLessEqual(reserve, duration / 2.0)
                self.assertEqual(owner.deadline, issued, "no fresh/extended stop allowance")
                self.assertGreater(owner.source_work_remaining(), 0)
                with self.assertRaisesRegex(RuntimeError, "^SOURCE_COHORT_CLOCK_EXPIRED_OR_INVALID$"):
                    owner.reserve_source_program_work()
                # Failure-control may shrink the original cutoff, never renew
                # work or spend the reserved lifetime on a delayed peer.
                owner.deadline = min(owner.deadline, time.monotonic() + reserve / 2.0)
                self.assertLess(owner.source_work_remaining(), 0)
            finally:
                require_no_children()
                owner.leave()
        program = inspect.getsource(helper._run_source_normal_program_cohort)
        control = inspect.getsource(helper._source_failure_control)
        self.assertEqual(program.count("owner.reserve_source_program_work()"), 1)
        self.assertLess(program.index("owner.reserve_source_program_work()"), program.index("version_child = subprocess.Popen"))
        self.assertEqual(program.count("remaining = owner.source_work_remaining()"), 2)
        self.assertNotIn("remaining = owner.deadline - time.monotonic()", program)
        self.assertIn("remaining = owner.source_work_remaining()", control)
        self.assertIn("owner.drain()", program)
        self.assertIn("if primary is not None:", program)

    def test_real_expired_unreserved_control_is_not_a_stop_or_success(self):
        self.run_source_program_case("expired")

    def test_reserved_control_stops_busy_node_and_adopted_writer_inside_same_cutoff(self):
        self.run_source_program_case("reserved")

    def test_unknown_pidfd_close_preserves_first_failure_and_keeps_owner_poisoned(self):
        self.run_source_program_case("fd-close-unknown")

    def test_reserved_owner_keeps_normal_healthy_completion(self):
        self.run_source_program_case("healthy")

    def run_source_program_case(self, mode):
        from unittest.mock import patch
        helper = self.load_helper()
        node = shutil.which("node")
        self.assertIsNotNone(node, "NATIVE_NODE_REQUIRED")
        node = Path(node).resolve()
        parent_root = Path(tempfile.gettempdir()).resolve()
        root = Path(tempfile.mkdtemp(prefix="rr-source-program-deadline-", dir=parent_root)).resolve()
        root_pin = root.stat()
        original = root / "original-BS"
        original.write_bytes(b"own unchanged synthetic B/S\n")
        script = root / "worker.cjs"
        script.write_text(SOURCE_PROGRAM_CPU_FIXTURE, encoding="utf-8")
        fixtures = []
        child = owner = None
        child_fd = descendant_fd = read_fd = write_fd = None
        product_fds = []
        suppressed = []
        primary = drain_failure = None
        drained = False
        started = time.monotonic()
        old_handler = signal.getsignal(signal.SIGALRM)
        original_close, original_fstat = os.close, os.fstat
        original_pidfd_open = os.pidfd_open

        def hard_deadline(_number, _frame):
            raise TimeoutError("OWN_SOURCE_PROGRAM_HARD_DEADLINE")

        def own_fixture_fd(fd):
            identity = original_fstat(fd)
            fixtures.append((fd, identity.st_dev, identity.st_ino))
            return fd

        def observed_pidfd(pid, flags=0):
            fd = original_pidfd_open(pid, flags)
            identity = original_fstat(fd)
            product_fds.append((fd, identity.st_dev, identity.st_ino))
            return fd

        def observed_close(fd):
            if mode == "fd-close-unknown" and not suppressed and any(row[0] == fd for row in product_fds):
                suppressed.append(fd)  # Actual still-open fd, no synthetic close proof.
                return
            return original_close(fd)

        signal.signal(signal.SIGALRM, hard_deadline)
        signal.setitimer(signal.ITIMER_REAL, BODY_SECONDS)
        try:
            stop_ns = time.monotonic_ns() + (1_800_000_000 if mode == "expired" else 5_000_000_000)
            import math
            owner = helper._LinuxSubsetOwner(math.nextafter(stop_ns / 1_000_000_000, -math.inf))
            issued = owner.deadline
            owner.enter()
            if mode != "expired":
                owner.reserve_source_program_work()
            # The negative control intentionally uses the old unreserved
            # normal wait: actual cutoff expires with an actual live child.
            # Its expected refusal is NOT a product-stop/PASS claim.
            environment = {name: value for name, value in os.environ.items() if name in {
                "PATH", "LD_LIBRARY_PATH", "LIBRARY_PATH", "LANG", "LC_ALL", "LC_CTYPE"}}
            environment.update({"OWN_SOURCE_PROGRAM_ROOT": str(root),
                "OWN_SOURCE_PROGRAM_DESCENDANT": "0" if mode == "healthy" else "1"})
            child = subprocess.Popen([str(node), str(script)], cwd=ROOT, env=environment,
                stdin=subprocess.DEVNULL, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
            child_fd = own_fixture_fd(original_pidfd_open(child.pid, 0))
            assert_pidfd_identity(child_fd, child.pid)
            self.assertEqual(process_identity(child.pid)["ppid"], os.getpid())
            startup = min(time.monotonic() + 1.5, issued)
            while not (root / "ready").exists() or (mode != "healthy" and not (root / "descendant-ready").exists()):
                self.assertIsNone(child.poll(), "own busy worker exited before readiness")
                self.assertLess(time.monotonic(), startup, "OWN_SOURCE_PROGRAM_STARTUP_TIMEOUT")
                time.sleep(0.005)
            identity = process_identity(child.pid)
            self.assertEqual(identity, json.loads(read_small(root / "ready")))
            self.assertEqual(read_small(Path(f"/proc/{child.pid}/cmdline")).split(b"\0")[:-1],
                             [os.fsencode(node), os.fsencode(script)])
            self.assertFalse(exited(child_fd))
            if mode != "healthy":
                announced = json.loads(read_small(root / "descendant-ready"))
                descendant_fd = own_fixture_fd(original_pidfd_open(announced["pid"], 0))
                assert_pidfd_identity(descendant_fd, announced["pid"])
                self.assertEqual(process_identity(announced["pid"]), announced)
                self.assertEqual(announced["ppid"], child.pid)
                self.assertEqual(read_small(Path(f"/proc/{announced['pid']}/cmdline")).split(b"\0")[:-1],
                                 [os.fsencode(node), os.fsencode(script), b"descendant"])
            read_fd, write_fd = os.pipe()
            own_fixture_fd(read_fd); own_fixture_fd(write_fd)
            if mode == "healthy":
                (root / "finish-own-worker").write_bytes(b"own healthy completion\n")
                self.assertEqual(child.wait(timeout=min(1.0, owner.source_work_remaining())), 0)
                owner.drain()
                drained = True
                self.assertFalse(owner.children_observed)
                owner.leave()
                require_no_children()
            else:
                self.assertFalse((root / "js-timer-fired").exists(), "JS must actually be CPU-blocked")
                os.write(write_fd, b"R")
                # Real readable, incomplete control frame with the writer kept
                # open. The ACTUAL normal failure reader must stop waiting at
                # its work boundary, without depending on a JS timer or EOF.
                try:
                    helper._source_failure_control(read_fd, b"n" * 32, 12, stop_ns, owner)
                except BaseException as error:
                    primary = error
                self.assertIsNotNone(primary)
                self.assertEqual(str(primary), "SOURCE_COHORT_CLOCK_EXPIRED_OR_INVALID")
                self.assertFalse(exited(child_fd), "the fixture must not expire/stop its own CPU child")
                self.assertFalse((root / "js-timer-fired").exists())
                self.assertEqual(owner.deadline, issued, "control cannot renew the issued stop cutoff")
                if mode == "expired":
                    self.assertGreaterEqual(time.monotonic(), issued)
                else:
                    self.assertLess(time.monotonic(), issued)
                with patch.object(helper.os, "pidfd_open", observed_pidfd), patch.object(helper.os, "close", observed_close):
                    try:
                        owner.drain()
                        drained = True
                    except BaseException as error:
                        drain_failure = error
                # This is the same first-error retention order as the normal
                # cohort. A known timeout is never converted into phase0/PASS.
                helper._retain(primary, owner)
                with self.assertRaises(RuntimeError) as repeated:
                    helper.require_closed_subset()
                self.assertIs(repeated.exception, primary)
                self.assertIs(helper._UNPROVED[id(primary)][1], owner)
                self.assertTrue(owner.active, "failed owner is not released by a unit result")
                if mode == "reserved":
                    self.assertTrue(drained)
                    self.assertIsNone(drain_failure)
                    self.assertTrue(exited(child_fd))
                    self.assertTrue(exited(descendant_fd))
                    require_no_children()  # Kernel ECHILD, not /proc emptiness.
                    self.assertLess(time.monotonic(), issued, "stop/drain must fit the same absolute cutoff")
                    self.assertGreater(len(product_fds), 0)
                    for fd, _device, _inode in product_fds:
                        with self.assertRaises(OSError) as closed:
                            original_fstat(fd)
                        self.assertEqual(closed.exception.errno, errno.EBADF)
                elif mode == "expired":
                    self.assertFalse(drained)
                    self.assertIsInstance(drain_failure, RuntimeError)
                    self.assertEqual(str(drain_failure), "CP_COMPONENT_SUBSET_STOP_UNPROVED")
                    self.assertEqual(product_fds, [], "reproduce deadline-before-pidfd-kill, not an invented stop")
                    self.assertFalse(exited(child_fd))
                    self.assertFalse(exited(descendant_fd))
                else:
                    self.assertFalse(drained)
                    self.assertIsInstance(drain_failure, RuntimeError)
                    self.assertEqual(str(drain_failure), "CP_COMPONENT_SUBSET_STOP_UNPROVED")
                    self.assertEqual(len(suppressed), 1)
                    self.assertIsNotNone(original_fstat(suppressed[0]))
                    self.assertTrue(owner.active)
            self.assertEqual(original.read_bytes(), b"own unchanged synthetic B/S\n")
            self.assertTrue(root.exists(), "no product cleanup of an unresolved owned root")
            self.assertLess(time.monotonic() - started, 7.0, "fixture natural12s expiry cannot satisfy stop")
            print(json.dumps({"kind": "SOURCE_NORMAL_PROGRAM_OWNER_UNIT", "mode": mode,
                "controlFailed": primary is not None, "cohortDrained": drained,
                "drainFailed": drain_failure is not None, "productPidfdCount": len(product_fds),
                "suppressedCloseCount": len(suppressed), "issuedCutoffUnchanged": owner.deadline == issued,
                "sourceAdmission": False, "productionActivation": False,
                "measurementBeforeFixtureCleanup": True}), flush=True)
        finally:
            failure = sys.exc_info()[1]
            signal.setitimer(signal.ITIMER_REAL, CLEANUP_SECONDS)
            try:
                # Exact fixture-only cleanup AFTER all measurements. None of
                # these signals, reaps or closes may satisfy the product test.
                for fd in (descendant_fd, child_fd):
                    if fd is not None and not exited(fd):
                        signal.pidfd_send_signal(fd, signal.SIGKILL)
                if child is not None:
                    child.wait(timeout=1.0)
                for fd in (descendant_fd, child_fd):
                    if fd is None:
                        continue
                    if not exited(fd, 0.5):
                        raise RuntimeError("OWN_SOURCE_PROGRAM_CHILD_STOP_UNPROVED")
                    try:
                        os.waitid(os.P_PIDFD, fd, os.WEXITED | os.WNOHANG)
                    except ChildProcessError:
                        pass  # The real product may already have reaped it.
                require_no_children()
                for fd, device, inode in [*product_fds, *fixtures]:
                    try:
                        current = original_fstat(fd)
                    except OSError as error:
                        if error.errno == errno.EBADF:
                            continue
                        raise
                    if (current.st_dev, current.st_ino) != (device, inode):
                        raise RuntimeError("OWN_SOURCE_PROGRAM_FD_CHANGED")
                    original_close(fd)
                    try:
                        original_fstat(fd)
                    except OSError as error:
                        if type(error) is not OSError or error.errno != errno.EBADF:
                            raise
                    else:
                        raise RuntimeError("OWN_SOURCE_PROGRAM_FD_CLOSE_UNPROVED")
                if owner is not None and owner.active:
                    owner.leave()
                self.assertEqual(root.parent, parent_root)
                self.assertTrue(root.name.startswith("rr-source-program-deadline-"))
                self.assertEqual((root.lstat().st_dev, root.lstat().st_ino), (root_pin.st_dev, root_pin.st_ino))
                shutil.rmtree(root)
                self.assertFalse(root.exists())
            except BaseException as cleanup_error:
                if failure is None:
                    raise
                failure.add_note("OWN_SOURCE_PROGRAM_CLEANUP_UNPROVED:" + type(cleanup_error).__name__ + "; root retained")
            finally:
                signal.setitimer(signal.ITIMER_REAL, 0)
                signal.signal(signal.SIGALRM, old_handler)



if __name__ == "__main__":
    unittest.main()
