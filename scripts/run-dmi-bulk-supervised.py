#!/usr/bin/env python3
"""Supervise DMI so one stalled HARMONIE asset cannot consume the whole job."""
from __future__ import annotations

from dataclasses import dataclass
import json
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
LEGACY_ASSET_START = re.compile(
    r"\[DMI bulk \+[^]]+\]\s+harmonie_dini_sf: behandler forecast-step\s"
)
LEGACY_ASSET_END = re.compile(
    r"\[DMI bulk \+[^]]+\]\s+harmonie_dini_sf: forecast-step behandlet\s"
)
WATCHDOG_FAILURE_CODE = "HARMONIE_ASSET_WATCHDOG_TIMEOUT"
WATCHDOG_LIMIT_CODE = "ASSET_PROCESSING_WATCHDOG_LIMIT"
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


def stop_process(process: subprocess.Popen, *, grace_seconds: float = 10.0) -> None:
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
    asset_started_at: float | None = None
    active_asset: dict[str, str] | None = None
    timed_out = False
    while True:
        # En fastlåst parser kan fortsætte med at skrive statuslinjer. Timeouten
        # må derfor ikke afhænge af, at outputkøen bliver tom.
        if (asset_started_at is not None
                and clock() - asset_started_at >= watchdog_seconds):
            timed_out = True
            stop_process(process)
            break
        try:
            event, line = events.get(timeout=0.25)
        except queue.Empty:
            if process.poll() is not None and not reader.is_alive():
                break
            continue
        if event == "eof":
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
    reader.join(timeout=2.0)
    if process.stdout is not None:
        process.stdout.close()
    return SupervisedResult(int(process.wait()), timed_out, active_asset)


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
    try:
        completed = subprocess.run(
            [sys.executable, "-u", str(PRODUCER)], cwd=ROOT, env=final_env,
            check=False, timeout=timeout,
        )
    except subprocess.TimeoutExpired:
        write_failure_outputs(environment, "DMI_SUPERVISED_FINALIZE_TIMEOUT")
        return 2
    return (
        2
        if int(completed.returncode) == ONEOFF_FINALIZED_INCOMPLETE_EXIT_CODE
        else int(completed.returncode)
    )


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
