#!/usr/bin/env python3
"""Run the targeted Copernicus pilot with a small, hard-bounded retry budget."""
from __future__ import annotations

import argparse
import os
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


def run_timeout_recovery(
    command: Sequence[str],
    *,
    timeout_seconds: float,
) -> bool:
    """Promote only already-fsynced receipts; this command must do no network work."""
    recovery_environment = dict(os.environ)
    recovery_environment.pop(SOFT_DEADLINE_EPOCH_ENV, None)
    try:
        completed = subprocess.run(
            command,
            cwd=ROOT,
            check=False,
            timeout=timeout_seconds,
            env=recovery_environment,
        )
    except subprocess.TimeoutExpired:
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
        try:
            completed = subprocess.run(
                command,
                cwd=ROOT,
                check=False,
                timeout=provider_hard_seconds,
                env=child_environment,
            )
            if completed.returncode == 0:
                return {
                    "ok": True,
                    "attempt": attempt,
                    "reason": "completed",
                    "boundedProgress": False,
                }
            if completed.returncode == BOUNDED_PROGRESS_EXIT_CODE:
                if attempt == attempts:
                    return {
                        "ok": True,
                        "attempt": attempt,
                        "reason": "bounded-progress",
                        "boundedProgress": True,
                    }
                reason = "bounded-progress"
            else:
                reason = f"exit-{completed.returncode}"
        except subprocess.TimeoutExpired:
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
    result = run_bounded(
        [sys.executable, "-u", str(PILOT), *pilot_args],
        attempts=args.attempts,
        timeout_seconds=args.timeout_seconds,
        backoff_seconds=args.backoff_seconds,
        timeout_recovery_command=timeout_recovery_command,
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
