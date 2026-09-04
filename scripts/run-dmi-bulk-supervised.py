#!/usr/bin/env python3
"""Supervise DMI so one stalled HARMONIE asset cannot consume the whole job."""
from __future__ import annotations

from dataclasses import dataclass
import os
from pathlib import Path
import queue
import re
import subprocess
import sys
import threading
import time
from typing import Callable

ROOT = Path(__file__).resolve().parents[1]
PRODUCER = ROOT / "scripts/update-dmi-bulk.py"
HARMONIE_ASSET_START = re.compile(
    r"\[DMI bulk \+[^]]+\]\s+harmonie_dini_sf: behandler forecast-step\s"
)
HARMONIE_ASSET_END = re.compile(
    r"\[DMI bulk \+[^]]+\]\s+harmonie_dini_sf: forecast-step behandlet\s"
)
WATCHDOG_FAILURE_CODE = "HARMONIE_ASSET_WATCHDOG_TIMEOUT"


@dataclass(frozen=True)
class SupervisedResult:
    returncode: int
    watchdog_timed_out: bool


def bounded_seconds(environment: dict[str, str], name: str, default: int,
                    minimum: int, maximum: int) -> int:
    try:
        value = int(environment.get(name, str(default)))
    except (TypeError, ValueError):
        value = default
    return max(minimum, min(maximum, value))


def stop_process(process: subprocess.Popen, *, grace_seconds: float = 10.0) -> None:
    if process.poll() is not None:
        return
    process.terminate()
    try:
        process.wait(timeout=grace_seconds)
    except subprocess.TimeoutExpired:
        process.kill()
        process.wait(timeout=grace_seconds)


def run_supervised(
    command: list[str], environment: dict[str, str], *, watchdog_seconds: float,
    popen: Callable = subprocess.Popen, clock: Callable[[], float] = time.monotonic,
    log: Callable[[str], None] = lambda line: print(line, end="", flush=True),
) -> SupervisedResult:
    process = popen(
        command, cwd=ROOT, env=environment, stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT, text=True, encoding="utf-8", errors="replace",
        bufsize=1,
    )
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
    harmonie_started_at: float | None = None
    timed_out = False
    while True:
        try:
            event, line = events.get(timeout=0.25)
        except queue.Empty:
            if (harmonie_started_at is not None
                    and clock() - harmonie_started_at >= watchdog_seconds):
                timed_out = True
                stop_process(process)
                break
            if process.poll() is not None and not reader.is_alive():
                break
            continue
        if event == "eof":
            break
        assert line is not None
        log(line)
        if HARMONIE_ASSET_START.search(line):
            harmonie_started_at = clock()
        elif HARMONIE_ASSET_END.search(line):
            harmonie_started_at = None
    reader.join(timeout=2.0)
    if process.stdout is not None:
        process.stdout.close()
    return SupervisedResult(int(process.wait()), timed_out)


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


def finalize_checkpoint(environment: dict[str, str]) -> int:
    timeout = bounded_seconds(
        environment, "DMI_BULK_SUPERVISED_FINALIZE_TIMEOUT_SECONDS", 420, 120, 600
    )
    final_env = dict(
        environment, DMI_BULK_FINALIZE_ONLY="true",
        DMI_BULK_FINALIZE_REASON=WATCHDOG_FAILURE_CODE,
        DMI_BULK_MAX_RUNTIME_SECONDS="600", DMI_BULK_FINALIZE_RESERVE_SECONDS="180",
    )
    try:
        completed = subprocess.run(
            [sys.executable, "-u", str(PRODUCER)], cwd=ROOT, env=final_env,
            check=False, timeout=timeout,
        )
    except subprocess.TimeoutExpired:
        write_failure_outputs(environment, "DMI_SUPERVISED_FINALIZE_TIMEOUT")
        return 2
    return int(completed.returncode)


def main() -> int:
    environment = dict(os.environ)
    timeout = bounded_seconds(
        environment, "DMI_BULK_HARMONIE_ASSET_TIMEOUT_SECONDS", 180, 60, 600
    )
    result = run_supervised(
        [sys.executable, "-u", str(PRODUCER)], environment,
        watchdog_seconds=timeout,
    )
    if not result.watchdog_timed_out:
        return result.returncode
    print(
        "DMI supervisor stopped one stalled HARMONIE asset; "
        "finalizing the last committed checkpoint.", flush=True,
    )
    return finalize_checkpoint(environment)


if __name__ == "__main__":
    raise SystemExit(main())
