#!/usr/bin/env python3
"""Run the targeted Copernicus pilot with a small, hard-bounded retry budget."""
from __future__ import annotations

import argparse
import subprocess
import sys
import time
from pathlib import Path
from typing import Callable, Sequence


ROOT = Path(__file__).resolve().parents[1]
PILOT = ROOT / "scripts/run-copernicus-current-pilot.py"


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
    if timeout_seconds <= 0 or timeout_seconds > 600:
        raise ValueError("Copernicus attempt timeout must be above 0 and at most 600 seconds")
    if backoff_seconds < 0 or backoff_seconds > 120:
        raise ValueError("Copernicus retry backoff must be between 0 and 120 seconds")


def run_bounded(
    command: Sequence[str],
    *,
    attempts: int,
    timeout_seconds: float,
    backoff_seconds: float,
    sleep: Callable[[float], None] = time.sleep,
) -> dict[str, int | bool | str]:
    validate_budget(attempts, timeout_seconds, backoff_seconds)
    for attempt in range(1, attempts + 1):
        print(f"Copernicus attempt {attempt}/{attempts} started with a {timeout_seconds:g}s hard timeout.")
        try:
            completed = subprocess.run(command, cwd=ROOT, check=False, timeout=timeout_seconds)
            if completed.returncode == 0:
                return {"ok": True, "attempt": attempt, "reason": "completed"}
            reason = f"exit-{completed.returncode}"
        except subprocess.TimeoutExpired:
            reason = "timeout"
        print(f"Copernicus attempt {attempt}/{attempts} ended safely ({reason}).", file=sys.stderr)
        if attempt < attempts:
            sleep(backoff_seconds)
    return {"ok": False, "attempt": attempts, "reason": reason}


def main() -> int:
    args = arguments()
    pilot_args = list(args.pilot_args)
    if pilot_args[:1] == ["--"]:
        pilot_args = pilot_args[1:]
    if not pilot_args:
        raise ValueError("Pilot arguments are required after --")
    result = run_bounded(
        [sys.executable, "-u", str(PILOT), *pilot_args],
        attempts=args.attempts,
        timeout_seconds=args.timeout_seconds,
        backoff_seconds=args.backoff_seconds,
    )
    if result["ok"]:
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
