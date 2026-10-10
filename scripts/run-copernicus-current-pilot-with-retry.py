#!/usr/bin/env python3
"""Run the targeted Copernicus pilot with a small, hard-bounded retry budget."""
from __future__ import annotations

import argparse
import os
import signal
import subprocess
import sys
import time
from pathlib import Path
from typing import Callable, Sequence

ROOT = Path(__file__).resolve().parents[1]
PILOT = ROOT / "scripts/run-copernicus-current-pilot.py"
SOFT_DEADLINE_EPOCH_ENV = "RAVRADAR_COPERNICUS_SOFT_DEADLINE_EPOCH"
BOUNDED_PROGRESS_EXIT_CODE = 75


def arguments() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--attempts", type=int, default=2)
    parser.add_argument("--timeout-seconds", type=float, default=360)
    parser.add_argument("--backoff-seconds", type=float, default=20)
    parser.add_argument("pilot_args", nargs=argparse.REMAINDER)
    return parser.parse_args()


def validate_budget(attempts: int, timeout_seconds: float, backoff_seconds: float) -> None:
    if attempts < 1 or attempts > 3:
        raise ValueError("Copernicus retry attempts must be between 1 and 3")
    if timeout_seconds <= 0 or timeout_seconds > 3300:
        raise ValueError("Copernicus attempt timeout must be above 0 and at most 3300 seconds")
    if backoff_seconds < 0 or backoff_seconds > 120:
        raise ValueError("Copernicus retry backoff must be between 0 and 120 seconds")


def bounded_time_slices(timeout_seconds: float) -> tuple[float, float, float]:
    """Reserve bounded time for an orderly stop and a no-network recovery."""
    recovery_seconds = min(120.0, timeout_seconds / 3)
    checkpoint_grace_seconds = min(60.0, timeout_seconds / 30)
    provider_hard_seconds = timeout_seconds - recovery_seconds
    provider_soft_seconds = provider_hard_seconds - checkpoint_grace_seconds
    if not 0 < provider_soft_seconds < provider_hard_seconds < timeout_seconds:
        raise ValueError("Copernicus timeout cannot be divided into safe bounded phases")
    return provider_soft_seconds, provider_hard_seconds, recovery_seconds


def _require_owned_group_wait() -> None:
    if os.name == "posix" and (
        not all(hasattr(os, name) for name in ("waitid", "WNOWAIT", "WEXITED", "WNOHANG"))
        or signal.getsignal(signal.SIGCHLD) != signal.SIG_DFL
    ):
        raise RuntimeError("OWN_PROCESS_GROUP_WAIT_UNAVAILABLE")


class _OwnedProcess:
    """Keep the own session leader waitable until its last group signal.

    No group signal is allowed after reap. Escaped sessions and loss of this
    wrapper itself remain outside this process-group owner.
    """
    def __init__(self, process):
        self.child = process
        self.reaped = False

    def _observe_leader(self):
        result = os.waitid(os.P_PID, self.child.pid, os.WEXITED | os.WNOHANG | os.WNOWAIT)
        if result is not None and result.si_pid != self.child.pid:
            raise RuntimeError("OWN_PROCESS_GROUP_LEADER_UNPROVED")
        return result

    def _signal_group(self, signum):
        if self.reaped:
            return
        self._observe_leader()
        if (os.getpgid(self.child.pid) != self.child.pid
                or os.getsid(self.child.pid) != self.child.pid
                or self.child.pid == os.getpgrp()):
            raise RuntimeError("OWN_PROCESS_GROUP_IDENTITY_UNPROVED")
        os.killpg(self.child.pid, signum)

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


# Retain only actual owned children whose exit could not be established. This
# is resource lifetime, not shared-writer exclusion or permission for SAVE.
_unclosed_pilot_processes: list[_OwnedProcess] = []


def _run_pilot_process(
    command: Sequence[str], environment: dict[str, str], *,
    timeout_seconds: float,
) -> subprocess.CompletedProcess | None:
    """Return None for a timeout ONLY after the owned process group is absent."""
    process = None
    primary_failure = None
    pending_signal = None
    previous_handlers = []

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
        process = subprocess.Popen(command, cwd=ROOT, env=environment,
                                   start_new_session=os.name == "posix")
        process = _OwnedProcess(process)
        process_deadline = time.monotonic() + timeout_seconds
        while True:
            check_interruption()
            remaining = process_deadline - time.monotonic()
            if remaining <= 0:
                raise subprocess.TimeoutExpired(command, timeout_seconds)
            try:
                returncode = process.wait(timeout=min(0.25, remaining))
                break
            except subprocess.TimeoutExpired:
                continue
        check_interruption()
        return subprocess.CompletedProcess(command, returncode)
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
                _unclosed_pilot_processes.append(process)
        if closed and pending_signal is None and isinstance(failure, subprocess.TimeoutExpired):
            return None
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


def run_timeout_recovery(
    command: Sequence[str],
    *,
    timeout_seconds: float,
) -> bool:
    """Promote only already-fsynced receipts; this command must do no network work."""
    recovery_environment = dict(os.environ)
    recovery_environment.pop(SOFT_DEADLINE_EPOCH_ENV, None)
    completed = _run_pilot_process(
        command, recovery_environment, timeout_seconds=timeout_seconds,
    )
    if completed is None:
        print(
            "Copernicus local timeout recovery exceeded its reserved budget.",
            file=sys.stderr,
        )
        return False
    if completed.returncode != 0:
        print(
            "Copernicus local timeout recovery rejected the durable receipts "
            f"(exit-{completed.returncode}).",
            file=sys.stderr,
        )
        return False
    return True


def run_bounded(
    command: Sequence[str],
    *,
    attempts: int,
    timeout_seconds: float,
    backoff_seconds: float,
    timeout_recovery_command: Sequence[str] | None = None,
    bounded_progress_recovery_command: Sequence[str] | None = None,
    sleep: Callable[[float], None] = time.sleep,
) -> dict[str, int | bool | str]:
    validate_budget(attempts, timeout_seconds, backoff_seconds)
    provider_soft_seconds, provider_hard_seconds, recovery_seconds = (
        bounded_time_slices(timeout_seconds)
    )
    for attempt in range(1, attempts + 1):
        print(
            f"Copernicus attempt {attempt}/{attempts} started with "
            f"{provider_soft_seconds:g}s work, {provider_hard_seconds:g}s process "
            f"and {recovery_seconds:g}s local recovery inside the "
            f"{timeout_seconds:g}s total budget."
        )
        child_environment = dict(os.environ)
        child_environment[SOFT_DEADLINE_EPOCH_ENV] = str(
            time.time() + provider_soft_seconds
        )
        child_environment["RAVRADAR_COPERNICUS_ATTEMPT_ORDINAL"] = str(
            attempt - 1
        )
        completed = _run_pilot_process(
            command, child_environment, timeout_seconds=provider_hard_seconds,
        )
        if completed is None:
            reason = "timeout"
            if timeout_recovery_command is not None and run_timeout_recovery(
                timeout_recovery_command,
                timeout_seconds=recovery_seconds,
            ):
                return {
                    "ok": True,
                    "attempt": attempt,
                    "reason": "timeout-recovered-progress",
                    "boundedProgress": True,
                }
        else:
            if completed.returncode == 0:
                return {
                    "ok": True,
                    "attempt": attempt,
                    "reason": "completed",
                    "boundedProgress": False,
                }
            if completed.returncode == BOUNDED_PROGRESS_EXIT_CODE:
                # A controlled soft boundary means the producer deliberately
                # stopped after writing fsynced segment receipts.  Those
                # receipts are durable evidence, but the ordinary checker
                # must see the corresponding bank/shadow/source-stage
                # transaction, not the pre-boundary baseline plus a journal.
                # Re-enter the pilot in checkpoint-only mode without the
                # baseline shortcut so it replays and atomically consolidates
                # exactly those receipts before any retry or downstream gate.
                if bounded_progress_recovery_command is not None:
                    if run_timeout_recovery(
                        bounded_progress_recovery_command,
                        timeout_seconds=recovery_seconds,
                    ):
                        print(
                            "Copernicus bounded-progress recovery consolidated "
                            "the durable segment receipts before continuation."
                        )
                    else:
                        reason = "bounded-progress-recovery-failed"
                        print(
                            "Copernicus bounded-progress recovery could not "
                            "consolidate the durable receipts.",
                            file=sys.stderr,
                        )
                        if attempt == attempts:
                            return {
                                "ok": False,
                                "attempt": attempt,
                                "reason": reason,
                            }
                        if attempt < attempts:
                            sleep(backoff_seconds)
                        continue
                if attempt == attempts:
                    return {
                        "ok": True,
                        "attempt": attempt,
                        "reason": (
                            "bounded-progress-recovered"
                            if bounded_progress_recovery_command is not None
                            else "bounded-progress"
                        ),
                        "boundedProgress": True,
                    }
                reason = "bounded-progress"
            else:
                reason = f"exit-{completed.returncode}"
        print(f"Copernicus attempt {attempt}/{attempts} ended safely ({reason}).", file=sys.stderr)
        if attempt < attempts:
            sleep(backoff_seconds)
    return {"ok": False, "attempt": attempts, "reason": reason}


def write_github_outputs(
    result: dict[str, int | bool | str],
    *,
    refresh_mode: bool = False,
) -> None:
    output_path = os.getenv("GITHUB_OUTPUT")
    if not output_path:
        return
    bounded_progress = bool(result.get("boundedProgress"))
    with Path(output_path).open("a", encoding="utf-8", newline="\n") as handle:
        handle.write(f"bounded_progress={'true' if bounded_progress else 'false'}\n")
        if refresh_mode:
            handle.write("maintenance_completed=true\n")
            return
        handle.write(
            "source_stage_disposition="
            f"{'IN_PROGRESS' if bounded_progress else 'READY'}\n"
        )



def main() -> int:
    args = arguments()
    pilot_args = list(args.pilot_args)
    if pilot_args[:1] == ["--"]:
        pilot_args = pilot_args[1:]
    if not pilot_args:
        raise ValueError("Pilot arguments are required after --")
    refresh_mode = "--refresh-only" in pilot_args
    checkpoint_only = "--checkpoint-only" in pilot_args
    if checkpoint_only:
        raise ValueError("The retry wrapper owns Copernicus checkpoint-only recovery")
    timeout_recovery_command = None if refresh_mode else [
        sys.executable,
        "-u",
        str(PILOT),
        *pilot_args,
        "--checkpoint-only",
        "--reuse-baseline-on-checkpoint",
    ]
    bounded_progress_recovery_command = None if refresh_mode else [
        sys.executable,
        "-u",
        str(PILOT),
        *pilot_args,
        "--checkpoint-only",
    ]
    result = run_bounded(
        [sys.executable, "-u", str(PILOT), *pilot_args],
        attempts=args.attempts,
        timeout_seconds=args.timeout_seconds,
        backoff_seconds=args.backoff_seconds,
        timeout_recovery_command=timeout_recovery_command,
        bounded_progress_recovery_command=bounded_progress_recovery_command,
    )
    if result["ok"]:
        write_github_outputs(result, refresh_mode=refresh_mode)
        if refresh_mode:
            print(
                "Copernicus cache-only maintenance completed without changing "
                "the current artifact disposition."
            )
            return 0
        if result.get("boundedProgress"):
            print(
                "Copernicus pilot reached its controlled work budget after saving "
                f"validated progress on attempt {result['attempt']}."
            )
        else:
            print(f"Copernicus pilot completed on attempt {result['attempt']}.")
        return 0
    print(
        f"Copernicus pilot exhausted {result['attempt']} bounded attempts ({result['reason']}).",
        file=sys.stderr,
    )
    return 1


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except Exception as error:
        print(f"Copernicus retry wrapper failed safely: {error}", file=sys.stderr)
        raise SystemExit(1)
