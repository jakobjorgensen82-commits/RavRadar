"""Linux-only normal-supervisor own-process regression; synthetic local processes only.

No Windows skip counts as evidence. The existing source bridge runs this target
on native Linux. Import the repository's real supervisor through its existing
test seam; do not rewrite Popen or create a separate child session. The direct
producer inherits the supervisor's process group/session on the main launch path.
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
import errno, json, os, pathlib, runpy, sys
def no_network(event, args):
    if event.startswith("socket."):
        raise RuntimeError("SYNTHETIC_NETWORK_FORBIDDEN")
sys.addaudithook(no_network)
seam = runpy.run_path(sys.argv[1], run_name="supervisor_loss_fixture_seam")
supervisor = seam["supervisor"]
supervisor.PRODUCER = pathlib.Path(sys.argv[2])
root = pathlib.Path(os.environ["OWN_SUPERVISOR_LOSS_ROOT"])
normal_run = supervisor.run_supervised
normal_popen = supervisor.subprocess.Popen
normal_thread = supervisor.threading.Thread
owned = []
readers = []

def retain_popen(*args, **kwargs):
    child = normal_popen(*args, **kwargs)
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

supervisor.run_supervised = run_owned
supervisor.threading.Thread = retain_reader
failure = None
try:
    code = supervisor.main()
except BaseException as error:
    failure = error
finally:
    supervisor.run_supervised = normal_run
    supervisor.threading.Thread = normal_thread

try:
    if len(owned) != 1 or len(readers) != 1:
        raise RuntimeError("OWN_READER_COMPLETION_OBSERVATION_FAILED")
    child, descriptor, device, inode = owned[0]
    reader = readers[0]
    try:
        actual = os.fstat(descriptor)
    except OSError as error:
        pipe_state = "CLOSED_OWN_EBADF" if error.errno == errno.EBADF else "UNKNOWN_ERROR"
    else:
        pipe_state = ("OPEN_SAME_OBJECT" if
                      (actual.st_dev, actual.st_ino) == (device, inode)
                      else "OPEN_CHANGED_OBJECT")
    # Probe the original fd BEFORE opening the observation file; do not close,
    # signal or wait for any producer here. Only normal supervisor code may stop it.
    observation = {
        "producerPid": child.pid, "producerExited": child.poll() is not None,
        "readerStarted": reader.ident is not None, "readerAlive": reader.is_alive(),
        "pipeDevice": device, "pipeInode": inode,
        "pipeClosed": child.stdout.closed, "pipeState": pipe_state,
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
import json, os, pathlib, sys, time
def no_network(event, args):
    if event.startswith("socket."):
        raise RuntimeError("SYNTHETIC_NETWORK_FORBIDDEN")
sys.addaudithook(no_network)
root = pathlib.Path(os.environ["OWN_SUPERVISOR_LOSS_ROOT"])
state = pathlib.Path("/proc/self/stat").read_text().rsplit(")", 1)[1].split()
identity = {"pid": os.getpid(), "ppid": os.getppid(), "pgid": os.getpgrp(),
            "sid": os.getsid(0), "start": int(state[19])}
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
    def test_sigterm_supervisor_cannot_leave_real_producer_alive(self):
        self.assert_own_supervisor_completion(signal.SIGTERM)

    def test_sigint_supervisor_stops_own_producer_and_reader(self):
        self.assert_own_supervisor_completion(signal.SIGINT)

    def test_normal_completion_closes_own_producer_and_reader(self):
        self.assert_own_supervisor_completion(None)

    def assert_own_supervisor_completion(self, interruption):
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
        parent_fd = child_fd = None
        child_verified = False
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
            # Retain only runtime necessities, not provider credentials or the
            # source gate's GITHUB_OUTPUT; no DMI timing/budget overrides.
            environment = {name: value for name, value in os.environ.items()
                           if name in {"PATH", "LD_LIBRARY_PATH", "LIBRARY_PATH",
                                       "LANG", "LC_ALL", "LC_CTYPE"}}
            environment.update({"PYTHONDONTWRITEBYTECODE": "1", "PYTHONNOUSERSITE": "1",
                "PYTHONUTF8": "1", "OWN_SUPERVISOR_LOSS_ROOT": str(root)})
            parent = subprocess.Popen([sys.executable, "-u", "-c", SUPERVISOR,
                str(TEST_SEAM), str(producer)], cwd=ROOT, env=environment,
                stdin=subprocess.DEVNULL, stdout=subprocess.DEVNULL,
                stderr=subprocess.DEVNULL)
            parent_fd = os.pidfd_open(parent.pid, 0)
            assert_pidfd_identity(parent_fd, parent.pid)
            ready = root / "ready"
            reader_ready = root / "supervisor-reader-ready"
            startup_deadline = time.monotonic() + 4.0
            while not ready.exists() or not reader_ready.exists():
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
            self.assertIs(type(observed_reader["pipeDevice"]), int)
            self.assertIs(type(observed_reader["pipeInode"]), int)
            self.assertEqual(identity, announced)
            self.assertEqual(identity["ppid"], parent.pid, "not the actual supervisor's direct child")
            supervisor_identity = process_identity(parent.pid)
            self.assertEqual(supervisor_identity["ppid"], os.getpid())
            # Main's unchanged Popen inherits its supervisor's group/session.
            # No isolated-revision start_new_session prerequisite is imported.
            self.assertEqual((identity["pgid"], identity["sid"]),
                             (supervisor_identity["pgid"], supervisor_identity["sid"]),
                             "actual main producer did not inherit supervisor topology")
            self.assertNotEqual(identity["pgid"], pid)
            # A retained pidfd plus stable kernel identity brackets these reads;
            # no caller PID/readiness JSON is by itself signalling authority.
            self.assertEqual(read_small(Path(f"/proc/{pid}/cmdline")).split(b"\0")[:-1],
                             [os.fsencode(sys.executable), b"-u", os.fsencode(producer)])
            self.assertEqual(Path(f"/proc/{pid}/cwd").resolve(), ROOT)
            self.assertEqual(process_identity(pid), identity)
            assert_pidfd_identity(child_fd, pid)
            self.assertIsNone(parent.poll())
            child_verified = True

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
            self.assertIs(observed["readerStarted"], True)
            self.assertIs(observed["readerAlive"], False)
            self.assertEqual((observed["pipeDevice"], observed["pipeInode"]),
                             (observed_reader["pipeDevice"], observed_reader["pipeInode"]))
            self.assertIs(observed["pipeClosed"], True)
            self.assertEqual(observed["pipeState"], "CLOSED_OWN_EBADF")
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
                require_no_children()
                for descriptor in (child_fd, parent_fd):
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


if __name__ == "__main__":
    unittest.main()
