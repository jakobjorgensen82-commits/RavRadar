#!/usr/bin/env python3
"""Supervise DMI so one stalled HARMONIE asset cannot consume the whole job."""
from __future__ import annotations

from dataclasses import dataclass
import json
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


def stop_process(process, *, grace_seconds: float = 10.0) -> None:
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
) -> SupervisedResult:
    reader: threading.Thread | None = None
    asset_started_at: float | None = None
    active_asset: dict[str, str] | None = None
    timed_out = False
    stop_attempted = False
    reader_join_attempted = False
    process = None
    primary_failure: BaseException | None = None
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

    try:
        for signum in (signal.SIGTERM, signal.SIGINT):
            previous_handlers.append((signum, signal.getsignal(signum)))
            signal.signal(signum, request_stop)
        check_interruption()
        _require_owned_group_wait()
        process = popen(
            command, cwd=ROOT, env=environment, stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT, text=True, encoding="utf-8", errors="replace",
            bufsize=1, start_new_session=os.name == "posix",
        )
        process = _OwnedProcess(process)
        check_interruption()
        # Guard setup after retaining Popen too: even an output-reader start
        # failure must not abandon the already live writer.
        events: queue.Queue[tuple[str, str | None]] = queue.Queue()

        def pump_output() -> None:
            try:
                assert process.stdout is not None
                for line in process.stdout:
                    events.put(("line", line))
            finally:
                events.put(("eof", None))

        reader = threading.Thread(target=pump_output, daemon=True)
        reader.start()
        while True:
            check_interruption()
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
                event, line = events.get(timeout=0.25)
            except queue.Empty:
                if process.poll() is not None and not reader.is_alive():
                    break
                continue
            if event == "eof":
                # Closed output cannot retire an active asset's existing
                # watchdog while its retained producer is still alive.
                if asset_started_at is not None and process.poll() is None:
                    continue
                break
            assert line is not None
            log(line)
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
            check_interruption()
            try:
                returncode = int(process.wait(timeout=0.25))
                break
            except subprocess.TimeoutExpired:
                pass
        reader_join_attempted = True
        reader.join(timeout=2.0)
        check_interruption()
        if reader.is_alive():
            raise RuntimeError("DMI_SUPERVISOR_OUTPUT_READER_STOP_UNPROVED")
        if process.stdout is not None:
            process.stdout.close()
        return SupervisedResult(returncode, timed_out, active_asset)
    except BaseException as failure:
        primary_failure = failure
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
                if (not reader_join_attempted and reader is not None
                        and reader.ident is not None):
                    reader_join_attempted = True
                    reader.join(timeout=2.0)
                if ((reader is None or not reader.is_alive())
                        and process.stdout is not None):
                    process.stdout.close()
        except BaseException:
            pass
        if process is not None:
            _unclosed_supervised_processes.append(process)
        raise
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

    try:
        for signum in (signal.SIGTERM, signal.SIGINT):
            previous_handlers.append((signum, signal.signal(signum, latch_interruption)))
        check_interruption()
        _require_owned_group_wait()
        process = subprocess.Popen(command, cwd=ROOT, env=final_env,
                                   start_new_session=os.name == "posix")
        process = _OwnedProcess(process)
        deadline = time.monotonic() + timeout
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
                    # Preserve the existing unbounded cleanup, now including
                    # owned group absence. No new finite stop reserve is added.
                    process.wait()
            except BaseException:
                pass  # Cleanup cannot replace the first actual failure.
            try:
                closed = process.poll() is not None
            except BaseException:
                closed = False
            if not closed:
                _unclosed_finalizer_processes.append(process)
        if closed and pending_signal is None and isinstance(failure, subprocess.TimeoutExpired):
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


def main() -> int:
    environment = dict(os.environ)
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
    deadline = time.monotonic() + total_runtime
    skipped_assets: list[dict[str, str]] = []
    while True:
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
    raise SystemExit(main())
