#!/usr/bin/env python3
"""Supervise DMI so one stalled HARMONIE asset cannot consume the whole job."""
from __future__ import annotations

from dataclasses import dataclass
import json
import math
import os
from pathlib import Path
import queue
import re
import signal
import subprocess
import sys
import threading
import time
from typing import Callable

ROOT = Path(__file__).resolve().parents[1]
PRODUCER = ROOT / "scripts/update-dmi-bulk.py"
LEGACY_ASSET_START = re.compile(
    r"\[DMI bulk \+[^]]+\]\s+harmonie_dini_sf: behandler forecast-step\s"
)
LEGACY_ASSET_END = re.compile(
    r"\[DMI bulk \+[^]]+\]\s+harmonie_dini_sf: forecast-step behandlet\s"
)
WATCHDOG_FAILURE_CODE = "HARMONIE_ASSET_WATCHDOG_TIMEOUT"
WATCHDOG_LIMIT_CODE = "ASSET_PROCESSING_WATCHDOG_LIMIT"
BUDGET_CONFLICT_CODE = "DMI_SUPERVISOR_BUDGET_CONFLICT"
ONEOFF_CONTINUATION_PROTOCOL_ENV = "DMI_BULK_ONEOFF_CONTINUATION_PROTOCOL"
ONEOFF_FINALIZED_INCOMPLETE_EXIT_CODE = 75
ASSET_MARKER_FIELDS = {
    "collection", "modelRun", "validTime", "itemId", "assetIdentitySha256",
    "assetRevisionSha256",
}
ASSET_START_MARKER = re.compile(r"DMI_ASSET_PROCESSING_START=(\{.*\})\s*$")
ASSET_END_MARKER = re.compile(r"DMI_ASSET_PROCESSING_END=(\{.*\})\s*$")


@dataclass(frozen=True)
class SupervisedResult:
    returncode: int
    watchdog_timed_out: bool
    timed_out_asset: dict[str, str] | None = None


# Only the fixed G4 guardian can supply this process-local cutoff. Ordinary
# workflow/main callers never issue it from a CLI number, environment or JSON.
_source_cutoff_ns: int | None = None
_source_control = None
_source_parent: int | None = None


class _SourceCutoffExpired(RuntimeError):
    pass


def _bind_source_guardian_control() -> None:
    import socket
    import struct
    global _source_cutoff_ns, _source_control, _source_parent
    if (sys.platform != "linux" or sys.version_info[:2] != (3, 12)
            or threading.current_thread() is not threading.main_thread()
            or time.get_clock_info("monotonic").implementation != "clock_gettime(CLOCK_MONOTONIC)"
            or _source_control is not None or _source_cutoff_ns is not None):
        raise RuntimeError("SOURCE_SUPERVISOR_CONTROL_UNAVAILABLE")
    control = socket.socket(fileno=0)
    _source_control = control  # Retain our actual descriptor even on rejection.
    if control.family != socket.AF_UNIX or control.type != socket.SOCK_STREAM:
        raise RuntimeError("SOURCE_SUPERVISOR_CONTROL_INVALID")
    parent = os.getppid()
    peer_pid, peer_uid, peer_gid = struct.unpack("3i", control.getsockopt(
        socket.SOL_SOCKET, socket.SO_PEERCRED, struct.calcsize("3i")))
    helper = str(ROOT / "scripts/lib/copernicus_component_process.py")
    expected = [b"-I", b"-B", os.fsencode(helper), b"--source-dmi-cohort"]
    parent_args = Path(f"/proc/{parent}/cmdline").read_bytes().split(b"\0")
    if (parent <= 1 or peer_pid != parent or peer_uid != os.getuid() or peer_gid != os.getgid()
            or len(parent_args) != 6 or parent_args[-1] != b"" or parent_args[1:-1] != expected
            or Path(f"/proc/{parent}/exe").resolve() != Path(sys.executable).resolve()):
        raise RuntimeError("SOURCE_SUPERVISOR_PARENT_UNPROVED")
    # Guardian preloads this entire bounded frame and half-closes BEFORE Popen.
    # Never wait for untrusted/partial input before a cutoff has been obtained.
    frame = control.recv(57, socket.MSG_DONTWAIT)
    if len(frame) != 56 or control.recv(1, socket.MSG_DONTWAIT) != b"":
        raise RuntimeError("SOURCE_SUPERVISOR_CONTROL_INVALID")
    magic, sender, run, attempt, cutoff, head = struct.unpack(">8sIQQQ20s", frame)
    if (magic != b"RRSDG401" or sender != parent or os.getppid() != parent
            or str(run) != os.environ.get("GITHUB_RUN_ID")
            or str(attempt) != os.environ.get("GITHUB_RUN_ATTEMPT")
            or head.hex() != os.environ.get("GITHUB_SHA")
            or not 0 < cutoff <= 0x7fffffffffffffff):
        raise RuntimeError("SOURCE_SUPERVISOR_CONTROL_INVALID")
    _source_parent = parent
    _source_cutoff_ns = cutoff
    _check_source_cutoff()


def _source_remaining() -> float | None:
    if _source_cutoff_ns is None:
        return None
    return (_source_cutoff_ns - time.monotonic_ns()) / 1_000_000_000


def _source_bound(deadline: float) -> float:
    if _source_cutoff_ns is None:
        return deadline
    import math
    # Python3.12 Linux uses the same CLOCK_MONOTONIC epoch as this guardian.
    return min(deadline, math.nextafter(_source_cutoff_ns / 1_000_000_000, -math.inf))


def _check_source_cutoff() -> None:
    if _source_cutoff_ns is None:
        return
    if os.getppid() != _source_parent:
        raise RuntimeError("SOURCE_SUPERVISOR_PARENT_LOST")
    if _source_remaining() <= 0:
        raise _SourceCutoffExpired("SOURCE_SUPERVISOR_CUTOFF_EXPIRED")


def _source_wait_timeout(maximum: float) -> float:
    remaining = _source_remaining()
    return maximum if remaining is None else max(0.0, min(maximum, remaining))


def bounded_seconds(environment: dict[str, str], name: str, default: int,
                    minimum: int, maximum: int) -> int:
    try:
        value = int(environment.get(name, str(default)))
    except (TypeError, ValueError):
        value = default
    return max(minimum, min(maximum, value))


def _require_owned_group_wait() -> None:
    if os.name == "posix" and (
        not all(hasattr(os, name) for name in ("waitid", "WNOWAIT", "WEXITED", "WNOHANG"))
        or signal.getsignal(signal.SIGCHLD) != signal.SIG_DFL
    ):
        raise RuntimeError("OWN_PROCESS_GROUP_WAIT_UNAVAILABLE")


class _OwnedProcess:
    """Retain the session leader until the last signal to its own POSIX group.

    A direct-child exit is not group completion. WNOWAIT prevents PID/group-id
    reuse before signalling; after reap we only observe, never signal a group.
    Escaped sessions and loss of this supervisor itself are outside this owner.
    """
    def __init__(self, process):
        self.child = process
        self.reaped = False

    @property
    def stdout(self):
        return self.child.stdout

    def _observe_leader(self):
        result = os.waitid(os.P_PID, self.child.pid, os.WEXITED | os.WNOHANG | os.WNOWAIT)
        if result is not None and result.si_pid != self.child.pid:
            raise RuntimeError("OWN_PROCESS_GROUP_LEADER_UNPROVED")
        return result

    def _signal_group(self, signum):
        if self.reaped:
            return  # No group-id signalling after our exact leader was reaped.
        self._observe_leader()  # ECHILD is a hard failure, never signalling authority.
        if (os.getpgid(self.child.pid) != self.child.pid
                or os.getsid(self.child.pid) != self.child.pid
                or self.child.pid == os.getpgrp()):
            raise RuntimeError("OWN_PROCESS_GROUP_IDENTITY_UNPROVED")
        os.killpg(self.child.pid, signum)

    def terminate(self):
        if os.name == "posix":
            self._signal_group(signal.SIGTERM)
        else:
            self.child.terminate()

    def kill(self):
        if os.name == "posix":
            self._signal_group(signal.SIGKILL)
        else:
            self.child.kill()

    def poll(self):
        if os.name != "posix":
            return self.child.poll()
        try:
            return self._wait(timeout=0)
        except subprocess.TimeoutExpired:
            return None

    def wait(self, timeout=None):
        return self._wait(timeout=timeout)

    def _wait(self, timeout=None):
        if os.name != "posix":
            return self.child.wait(timeout=timeout) if timeout is not None else self.child.wait()
        deadline = None if timeout is None else time.monotonic() + timeout
        while True:
            if not self.reaped and self._observe_leader() is not None:
                # Normal completion must not release a still-writing descendant
                # or one holding the output pipe. The unreaped leader anchors
                # this last signal even when it has already exited successfully.
                self._signal_group(signal.SIGKILL)
                self.child.wait()
                self.reaped = True
            if self.reaped:
                try:
                    os.killpg(self.child.pid, 0)
                except ProcessLookupError:
                    return self.child.returncode
            remaining = None if deadline is None else deadline - time.monotonic()
            if remaining is not None and remaining <= 0:
                raise subprocess.TimeoutExpired(self.child.args, timeout)
            time.sleep(0.01 if remaining is None else min(0.01, remaining))


# Unknown group/reader cessation retains resources; it is not a SAVE receipt.
_unclosed_supervised_processes: list[_OwnedProcess] = []
_unclosed_supervised_outputs: list[tuple[object, ...]] = []


def stop_process(process, *, grace_seconds: float = 10.0) -> None:
    if _source_cutoff_ns is not None:
        if process.poll() is not None:
            return
        if _source_remaining() > 0:
            process.terminate()
            try:
                process.wait(timeout=_source_wait_timeout(grace_seconds))
                return
            except subprocess.TimeoutExpired:
                pass
        process.kill()  # Existing unreaped-leader identity, never stale PGID.
        process.wait(timeout=_source_wait_timeout(grace_seconds))
        return
    if process.poll() is not None:
        return
    process.terminate()
    try:
        process.wait(timeout=grace_seconds)
    except subprocess.TimeoutExpired:
        process.kill()
        process.wait(timeout=grace_seconds)


def parse_asset_marker(line: str, pattern: re.Pattern[str]) -> dict[str, str] | None:
    match = pattern.search(line)
    if match is None:
        return None
    try:
        value = json.loads(match.group(1))
    except (TypeError, ValueError):
        return None
    if (
        not isinstance(value, dict)
        or set(value) != ASSET_MARKER_FIELDS
        or not all(isinstance(value.get(key), str) and value[key] for key in value)
        or not re.fullmatch(r"[a-f0-9]{64}", value["assetIdentitySha256"])
        or not re.fullmatch(r"[a-f0-9]{64}", value["assetRevisionSha256"])
    ):
        return None
    return value


def run_supervised(
    command: list[str], environment: dict[str, str], *, watchdog_seconds: float,
    popen: Callable = subprocess.Popen, clock: Callable[[], float] = time.monotonic,
    log: Callable[[str], None] = lambda line: print(line, end="", flush=True),
    total_deadline: float | None = None,
) -> SupervisedResult:
    reader: threading.Thread | None = None
    logger: threading.Thread | None = None
    events = None
    log_events = None
    asset_started_at: float | None = None
    active_asset: dict[str, str] | None = None
    timed_out = False
    stop_attempted = False
    teardown_deadline: float | None = None
    process = None
    primary_failure: BaseException | None = None
    first_failure: BaseException | None = None
    failure_lock = threading.Lock()
    pending_signal: int | None = None
    previous_handlers = []

    def request_stop(signum, _frame) -> None:
        nonlocal pending_signal
        # Never unwind Popen before its actual child reference is retained, or
        # interrupt the existing bounded cleanup with a second signal.
        if pending_signal is None:
            pending_signal = signum

    def check_interruption() -> None:
        if pending_signal is not None:
            raise SystemExit(128 + pending_signal)
        _check_source_cutoff()

    def check_total_deadline() -> None:
        # Default None preserves the normal asset-watchdog/finalizer contract.
        # The one-off restore cannot wait forever before/after an asset marker
        # or after EOF while the retained producer still owns its group.
        if total_deadline is not None and (
            isinstance(total_deadline, bool)
            or not isinstance(total_deadline, (int, float))
            or not math.isfinite(total_deadline)
            or clock() >= total_deadline
        ):
            raise RuntimeError("DMI_SUPERVISOR_TOTAL_DEADLINE")

    def retain_failure(failure: BaseException) -> BaseException:
        nonlocal first_failure
        # Only capture the exception under this lock; no logging, I/O or stop.
        with failure_lock:
            if first_failure is None:
                first_failure = failure
            return first_failure

    def check_output_failure() -> None:
        with failure_lock:
            failure = first_failure
        if failure is not None:
            raise failure

    def join_output_threads(*, cleanup: bool = False) -> None:
        nonlocal teardown_deadline
        if teardown_deadline is None:
            teardown_deadline = _source_bound(time.monotonic() + 2.0)
        for thread in (reader, logger):
            if thread is not None and thread.ident is not None:
                remaining = teardown_deadline - time.monotonic()
                if total_deadline is not None and not cleanup:
                    remaining = min(remaining, total_deadline - clock())
                thread.join(timeout=max(0.0, remaining))

    try:
        for signum in (signal.SIGTERM, signal.SIGINT):
            previous_handlers.append((signum, signal.getsignal(signum)))
            signal.signal(signum, request_stop)
        check_interruption()
        check_total_deadline()
        _require_owned_group_wait()
        process = popen(
            command, cwd=ROOT, env=environment, stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT, text=True, encoding="utf-8", errors="replace",
            bufsize=1, start_new_session=os.name == "posix",
        )
        process = _OwnedProcess(process)
        check_interruption()
        check_total_deadline()
        # Guard setup after retaining Popen too: even an output-reader start
        # failure must not abandon the already live writer.
        events: queue.Queue[tuple[str, str | None]] = queue.Queue()
        log_events: queue.Queue[str | None] = queue.Queue()

        def pump_output() -> None:
            try:
                assert process.stdout is not None
                for line in process.stdout:
                    events.put(("line", line))
                    log_events.put(line)
            except BaseException as failure:
                retain_failure(failure)
            finally:
                for destination, terminal in ((log_events, None), (events, ("eof", None))):
                    try:
                        destination.put(terminal)
                    except BaseException as failure:
                        retain_failure(failure)

        def pump_log() -> None:
            try:
                while True:
                    line = log_events.get()
                    if line is None:
                        return
                    log(line)
            except BaseException as failure:
                retain_failure(failure)

        reader = threading.Thread(target=pump_output, daemon=True)
        reader.start()
        logger = threading.Thread(target=pump_log, daemon=True)
        logger.start()
        while True:
            check_output_failure()
            check_interruption()
            check_total_deadline()
            if os.name == "posix":
                # Even continuous descendant output cannot hide leader exit.
                process.poll()
            # En fastlåst parser kan fortsætte med at skrive statuslinjer. Timeouten
            # må derfor ikke afhænge af, at outputkøen bliver tom.
            if (asset_started_at is not None
                    and clock() - asset_started_at >= watchdog_seconds):
                timed_out = True
                stop_attempted = True
                stop_process(process)
                break
            try:
                event, line = events.get(timeout=_source_wait_timeout(0.25))
            except queue.Empty:
                if process.poll() is not None and not reader.is_alive():
                    break
                continue
            check_output_failure()
            if event == "eof":
                # Closed output cannot retire an active asset's existing
                # watchdog while its retained producer is still alive.
                if asset_started_at is not None and process.poll() is None:
                    continue
                break
            assert line is not None
            started_asset = parse_asset_marker(line, ASSET_START_MARKER)
            ended_asset = parse_asset_marker(line, ASSET_END_MARKER)
            if started_asset is not None:
                active_asset = started_asset
                asset_started_at = clock()
            elif ended_asset is not None:
                if active_asset == ended_asset:
                    active_asset = None
                    asset_started_at = None
            elif LEGACY_ASSET_START.search(line):
                active_asset = None
                asset_started_at = clock()
            elif LEGACY_ASSET_END.search(line):
                active_asset = None
                asset_started_at = None
            elif "DMI_ASSET_PROCESSING_START=" in line:
                # A truncated marker must still start a generic watchdog. It may
                # terminate/finalize safely, but it may never authorize a broad skip.
                active_asset = None
                asset_started_at = clock()
        # EOF proves only that output ended, not that the retained writer did.
        # Keep completion waits inside the same interruption/stop guard, and
        # close its pipe only after actual exit and a finished reader.
        while True:
            check_output_failure()
            check_interruption()
            check_total_deadline()
            try:
                remaining = (_source_wait_timeout(0.25) if total_deadline is None
                             else min(_source_wait_timeout(0.25), max(0.0, total_deadline - clock())))
                returncode = int(process.wait(timeout=remaining))
                break
            except subprocess.TimeoutExpired:
                pass
        join_output_threads()
        check_output_failure()
        check_interruption()
        check_total_deadline()
        if reader.is_alive():
            raise RuntimeError("DMI_SUPERVISOR_OUTPUT_READER_STOP_UNPROVED")
        if logger.is_alive():
            raise RuntimeError("DMI_SUPERVISOR_LOGGER_STOP_UNPROVED")
        if process.stdout is not None:
            process.stdout.close()
        return SupervisedResult(returncode, timed_out, active_asset)
    except BaseException as failure:
        primary_failure = retain_failure(failure)
        # A failed output pipe or interruption is terminal, not permission to
        # abandon the retained writer and start a replacement/finalizer. Reuse
        # the existing bounded stop, then close only a proved stopped reader.
        # Cleanup must never replace the original exception. Unknown cessation
        # leaves the pipe owned and propagates the terminal failure, no result.
        try:
            if process is not None and not stop_attempted:
                stop_attempted = True
                stop_process(process)
        except BaseException:
            pass
        try:
            if process is not None and process.poll() is not None:
                join_output_threads(cleanup=True)
                if ((reader is None or not reader.is_alive())
                        and (logger is None or not logger.is_alive())
                        and process.stdout is not None):
                    process.stdout.close()
        except BaseException:
            pass
        if process is not None:
            _unclosed_supervised_processes.append(process)
            _unclosed_supervised_outputs.append((process, reader, logger, events, log_events, log))
        raise primary_failure
    finally:
        restore_failure: BaseException | None = None
        for signum, previous in reversed(previous_handlers):
            try:
                signal.signal(signum, previous)
            except BaseException as failure:
                if restore_failure is None:
                    restore_failure = failure
        if primary_failure is None:
            # Also reject an interruption latched during normal completion.
            check_interruption()
            if restore_failure is not None:
                raise restore_failure


def write_failure_outputs(environment: dict[str, str], code: str) -> None:
    output_path = environment.get("GITHUB_OUTPUT")
    code = code if re.fullmatch(r"[A-Z][A-Z0-9_]{2,63}", code) else "DMI_UNCLASSIFIED"
    if not output_path:
        return
    with open(output_path, "a", encoding="utf-8") as handle:
        handle.write(
            "status=failed\nfresh_collections=0\npartial_collections=0\n"
            "zone_count=0\ndownloaded_bytes=0\n"
            f"terminal_code={code}\ncollection_failure_codes={code}\n"
            "strict_current_anchor_ready=false\n"
        )


# Resource retention only: this does not lock other writers or authorize SAVE.
_unclosed_finalizer_processes: list[_OwnedProcess] = []


def finalize_checkpoint(
    environment: dict[str, str],
    *,
    reason: str = WATCHDOG_FAILURE_CODE,
) -> int:
    timeout = bounded_seconds(
        environment, "DMI_BULK_SUPERVISED_FINALIZE_TIMEOUT_SECONDS", 420, 120, 600
    )
    final_env = dict(
        environment, DMI_BULK_FINALIZE_ONLY="true",
        DMI_BULK_FINALIZE_REASON=reason,
        DMI_BULK_MAX_RUNTIME_SECONDS="600", DMI_BULK_FINALIZE_RESERVE_SECONDS="180",
    )
    process = None
    primary_failure = None
    pending_signal = None
    previous_handlers = []
    command = [sys.executable, "-u", str(PRODUCER)]

    def latch_interruption(signum, _frame):
        nonlocal pending_signal
        if pending_signal is None:
            pending_signal = signum

    def check_interruption():
        if pending_signal is not None:
            raise SystemExit(128 + pending_signal)
        _check_source_cutoff()

    try:
        for signum in (signal.SIGTERM, signal.SIGINT):
            previous_handlers.append((signum, signal.signal(signum, latch_interruption)))
        check_interruption()
        _require_owned_group_wait()
        process = subprocess.Popen(command, cwd=ROOT, env=final_env,
                                   start_new_session=os.name == "posix")
        process = _OwnedProcess(process)
        deadline = _source_bound(time.monotonic() + timeout)
        while True:
            check_interruption()
            remaining = deadline - time.monotonic()
            if remaining <= 0:
                raise subprocess.TimeoutExpired(command, timeout)
            try:
                returncode = process.wait(timeout=min(0.25, remaining))
                break
            except subprocess.TimeoutExpired:
                continue
        check_interruption()
        return 2 if returncode == ONEOFF_FINALIZED_INCOMPLETE_EXIT_CODE else returncode
    except BaseException as failure:
        primary_failure = failure
        closed = False
        if process is not None:
            try:
                try:
                    if process.poll() is None:
                        process.kill()
                finally:
                    # Legacy retains its exact kill/reap semantics. SOURCE
                    # spends only its same already-issued remaining time.
                    if _source_cutoff_ns is None:
                        process.wait()
                    else:
                        process.wait(timeout=max(0.0, _source_remaining()))
            except BaseException:
                pass  # Cleanup cannot replace the first actual failure.
            try:
                closed = process.poll() is not None
            except BaseException:
                closed = False
            if not closed:
                _unclosed_finalizer_processes.append(process)
        if (closed and pending_signal is None and isinstance(failure, subprocess.TimeoutExpired)
                and (_source_cutoff_ns is None or _source_remaining() > 0)):
            write_failure_outputs(environment, "DMI_SUPERVISED_FINALIZE_TIMEOUT")
            return 2
        raise
    finally:
        restore_failure = None
        for signum, previous in reversed(previous_handlers):
            try:
                signal.signal(signum, previous)
            except BaseException as failure:
                if restore_failure is None:
                    restore_failure = failure
        if primary_failure is None:
            check_interruption()
            if restore_failure is not None:
                raise restore_failure


def restore_exact_originals(environment: dict[str, str]) -> int:
    """One fixed acquisition, never normal-main, quarantine or finalization.

    Only a completed run_supervised return proves physical owned-group absence
    and finished output consumers. An exception emits no closure receipt, even
    when best-effort stop happened to finish: callers must retain their claim.
    """
    if sys.platform != "linux":
        raise RuntimeError("DMI_EXACT_ORIGINAL_RESTORE_PLATFORM_REFUSED")
    runtime = bounded_seconds(environment, "DMI_BULK_MAX_RUNTIME_SECONDS", 780, 60, 3600)
    asset_timeout = bounded_seconds(environment, "DMI_BULK_ASSET_PROCESSING_TIMEOUT_SECONDS",
        bounded_seconds(environment, "DMI_BULK_HARMONIE_ASSET_TIMEOUT_SECONDS", 180, 60, 600),
        60, 600)
    output: list[str] = []
    output_bytes = 0

    def collect(line: str) -> None:
        nonlocal output_bytes
        # The actual normal asset watchdog still sees these strict markers.
        # They stay inside this private process pipe, never in the receipt.
        if (parse_asset_marker(line, ASSET_START_MARKER) is not None
                or parse_asset_marker(line, ASSET_END_MARKER) is not None):
            return
        output_bytes += len(line.encode("utf-8"))
        if output_bytes > 4096:
            raise RuntimeError("DMI_EXACT_ORIGINAL_RESTORE_OUTPUT_INVALID")
        output.append(line)

    result = run_supervised(
        [sys.executable, "-B", "-u", str(PRODUCER), "--restore-exact-originals"],
        environment,
        watchdog_seconds=min(runtime, asset_timeout),
        total_deadline=time.monotonic() + runtime,
        log=collect,
    )
    if result.watchdog_timed_out:
        raise RuntimeError("DMI_EXACT_ORIGINAL_RESTORE_WATCHDOG_REFUSED")
    try:
        report = json.loads("".join(output))
    except (TypeError, ValueError):
        raise RuntimeError("DMI_EXACT_ORIGINAL_RESTORE_OUTPUT_INVALID") from None
    fields = {"schemaVersion", "contractId", "status", "code", "originalCount",
              "uniqueAssetCount", "downloadedAssetCount", "reusedAssetCount",
              "downloadedBytes", "pruningPerformed", "replayPerformed", "scorePerformed"}
    counts = {"originalCount", "uniqueAssetCount", "downloadedAssetCount",
              "reusedAssetCount", "downloadedBytes"}
    if (not isinstance(report, dict) or set(report) != fields
            or type(report["schemaVersion"]) is not int or report["schemaVersion"] != 1
            or report["contractId"] != "dmi-exact-original-restore-result-v1"
            or report["status"] not in {"RESTORED", "REJECTED"}
            or not isinstance(report["code"], str)
            or not re.fullmatch(r"[A-Z][A-Z0-9_]{2,95}", report["code"])
            or any(type(report[field]) is not int or report[field] < 0 for field in counts)
            or any(report[field] is not False for field in
                   ("pruningPerformed", "replayPerformed", "scorePerformed"))
            or (report["status"] == "RESTORED" and (
                report["code"] != "EXACT_ORIGINALS_RESTORED"
                or report["originalCount"] < 1 or report["uniqueAssetCount"] < 1
                or report["uniqueAssetCount"] != report["downloadedAssetCount"] + report["reusedAssetCount"]))
            or result.returncode != (0 if report["status"] == "RESTORED" else 2)):
        raise RuntimeError("DMI_EXACT_ORIGINAL_RESTORE_OUTPUT_INVALID")
    print(json.dumps({"schemaVersion": 1,
                      "kind": "DMI_EXACT_ORIGINAL_RESTORE_COHORT_CLOSED",
                      "contractId": "dmi-exact-original-restore-supervisor-v1",
                      "workerExitCode": result.returncode,
                      "physicalGroupClosed": True, "outputClosed": True,
                      "result": report}, separators=(",", ":")), flush=True)
    return result.returncode


def main() -> int:
    _check_source_cutoff()
    environment = dict(os.environ)
    if "--restore-exact-originals" in sys.argv[1:]:
        if sys.argv[1:] != ["--restore-exact-originals"]:
            raise RuntimeError("DMI_EXACT_ORIGINAL_RESTORE_ARGUMENTS_INVALID")
        return restore_exact_originals(environment)
    timeout = bounded_seconds(
        environment,
        "DMI_BULK_ASSET_PROCESSING_TIMEOUT_SECONDS",
        bounded_seconds(
            environment, "DMI_BULK_HARMONIE_ASSET_TIMEOUT_SECONDS", 180, 60, 600
        ),
        60,
        600,
    )
    maximum_skips = bounded_seconds(
        environment, "DMI_BULK_MAX_SUPERVISED_ASSET_SKIPS", 4, 1, 12
    )
    total_runtime = bounded_seconds(
        environment,
        "DMI_BULK_MAX_RUNTIME_SECONDS",
        900,
        60,
        3600,
    )
    finalize_reserve = bounded_seconds(
        environment, "DMI_BULK_SUPERVISED_FINALIZE_TIMEOUT_SECONDS", 420, 120, 600
    )
    if total_runtime <= finalize_reserve:
        # A reserve as large as the entire run would enter FINALIZE_ONLY
        # immediately, without giving the DMI producer a chance to advance
        # the target-bound operational ledger. Fail before consuming the
        # reserve or presenting an old ledger to downstream suppliers.
        write_failure_outputs(environment, BUDGET_CONFLICT_CODE)
        print("DMI supervisor budget conflict; no producer work started.",
              file=sys.stderr, flush=True)
        return 2
    deadline = _source_bound(time.monotonic() + total_runtime)
    skipped_assets: list[dict[str, str]] = []
    while True:
        _check_source_cutoff()
        remaining = int(deadline - time.monotonic())
        if remaining <= finalize_reserve:
            environment["DMI_BULK_SUPERVISOR_SKIPPED_ASSETS"] = json.dumps(
                skipped_assets, sort_keys=True, separators=(",", ":")
            )
            return finalize_checkpoint(environment, reason=WATCHDOG_LIMIT_CODE)
        child_environment = dict(environment)
        child_environment["DMI_BULK_MAX_RUNTIME_SECONDS"] = str(max(60, remaining))
        child_environment["DMI_BULK_SUPERVISOR_SKIPPED_ASSETS"] = json.dumps(
            skipped_assets, sort_keys=True, separators=(",", ":")
        )
        result = run_supervised(
            [sys.executable, "-u", str(PRODUCER)],
            child_environment,
            watchdog_seconds=min(timeout, max(60, remaining)),
        )
        _check_source_cutoff()
        if not result.watchdog_timed_out:
            if result.returncode == ONEOFF_FINALIZED_INCOMPLETE_EXIT_CODE:
                if (
                    environment.get(ONEOFF_CONTINUATION_PROTOCOL_ENV) != "1"
                    or skipped_assets
                ):
                    return 2
            return result.returncode
        if (
            result.timed_out_asset is None
            or result.timed_out_asset in skipped_assets
            or len(skipped_assets) >= maximum_skips
        ):
            environment["DMI_BULK_SUPERVISOR_SKIPPED_ASSETS"] = json.dumps(
                skipped_assets, sort_keys=True, separators=(",", ":")
            )
            print(
                "DMI supervisor reached its bounded asset-skip limit; "
                "finalizing the last committed checkpoint.",
                flush=True,
            )
            return finalize_checkpoint(environment, reason=WATCHDOG_LIMIT_CODE)
        skipped_assets.append(result.timed_out_asset)
        print(
            "DMI supervisor stopped one stalled asset and will restart the "
            "producer with only that exact asset quarantined.",
            flush=True,
        )


if __name__ == "__main__":
    if sys.argv[1:] == ["--source-dmi-issued-cutoff"]:
        _bind_source_guardian_control()
    raise SystemExit(main())
