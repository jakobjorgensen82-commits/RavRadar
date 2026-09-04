#!/usr/bin/env python3
"""Bounded continuation of the existing DMI producer, for the one-off job only.

Each completed pass finalizes and prunes using the existing producer. Neither
the 4-GiB raw cache ceiling nor the shared 50-minute deadline is increased.
"""
from __future__ import annotations

import json
import os
from pathlib import Path
import shutil
import subprocess
import sys
import time
from datetime import datetime, timezone

ROOT = Path(__file__).resolve().parents[1]
CACHE = ROOT / "data/live/dmi-bulk-cache.json"
MAX_PASSES = 3
GIB = 1024 ** 3
COLLECTIONS = {"dkss_idw", "dkss_nsbs", "dkss_lf", "harmonie_dini_sf", "wam_dw", "wam_nsb"}
DOWNLOAD_MESSAGES = {
    "DMI bulk download budget would be exceeded",
    "DMI bulk download budget exceeded before next asset",
    "DMI bulk download budget exceeded during asset download",
}


def summarize_progress(document: dict, reference: str) -> dict:
    """Return only counters/booleans from the finalized private cache."""
    diagnostics = document["diagnostics"]
    ledger = diagnostics["currentOperationalLedger"]
    if ledger.get("productionReferenceAt") != reference or ledger.get("ready") is not True:
        raise ValueError("ONEOFF_REFERENCE_OR_READINESS_INVALID")
    errors = diagnostics.get("errors")
    if not isinstance(errors, list):
        raise ValueError("ONEOFF_REPORT_INVALID")
    only_download_stops = bool(errors) and all(
        isinstance(row, dict) and row.get("collection") in COLLECTIONS
        and row.get("message") in DOWNLOAD_MESSAGES
        and row.get("partialProgressPreserved") is True
        for row in errors
    )
    attempted = diagnostics.get("collectionsAttempted")
    if not isinstance(attempted, list) or not set(attempted) <= COLLECTIONS:
        raise ValueError("ONEOFF_REPORT_INVALID")
    processed = [document["runs"][collection]["assetsProcessed"] for collection in attempted]
    raw = diagnostics["rawCache"]
    numeric = [*processed, raw["after"]["bytes"], raw["maxBytes"]]
    if any(type(value) is not int or value < 0 for value in numeric):
        raise ValueError("ONEOFF_REPORT_INVALID")
    if raw["maxBytes"] != 4 * GIB or raw["after"]["bytes"] > 4 * GIB:
        raise ValueError("ONEOFF_CACHE_CEILING_NOT_RESTORED")
    return {"onlyDownloadStops": only_download_stops,
            "processedAssets": sum(processed)}


def fill(environment, *, run_pass, read_progress, clock, free_bytes, log=print):
    expected = {"DMI_BULK_MAX_DOWNLOAD_MB": "4096", "DMI_BULK_RAW_CACHE_MAX_MB": "4096",
                "DMI_BULK_MAX_RUNTIME_SECONDS": "3000", "DMI_BULK_FINALIZE_RESERVE_SECONDS": "180"}
    if any(environment.get(key) != value for key, value in expected.items()):
        raise ValueError("ONEOFF_BUDGET_CONFIGURATION_INVALID")
    reference = environment.get("RAVRADAR_PRODUCTION_TARGET_HOUR", "")
    parsed = datetime.fromisoformat(reference.replace("Z", "+00:00"))
    if parsed.tzinfo is None or parsed.astimezone(timezone.utc).strftime("%Y-%m-%dT%H:00:00Z") != reference:
        raise ValueError("ONEOFF_REFERENCE_INVALID")
    deadline = clock() + 3000
    last_code = 2
    for pass_number in range(1, MAX_PASSES + 1):
        remaining = int(deadline - clock())
        if remaining < 300:
            log(f"DMI one-off continuation stopped: SHARED_TIME_RESERVE; completedPasses={pass_number - 1}.")
            return last_code
        if free_bytes() < 5 * GIB:
            log(f"DMI one-off continuation stopped: DISK_RESERVE; completedPasses={pass_number - 1}.")
            return last_code
        child_environment = dict(environment, DMI_BULK_MAX_RUNTIME_SECONDS=str(remaining))
        log(f"DMI one-off pass {pass_number}/{MAX_PASSES}; remainingSeconds={remaining}; downloadLimitGiB=4; rawCacheLimitGiB=4.")
        last_code = run_pass(child_environment)
        if last_code != 0:
            return last_code  # No automatic retries of producer/ledger failures.
        summary = read_progress(reference)
        if not summary["onlyDownloadStops"] or summary["processedAssets"] <= 0:
            return last_code
        log(f"DMI one-off saved download-limited progress: pass={pass_number}; processedAssets={summary['processedAssets']}.")
    log("DMI one-off continuation stopped: PASS_LIMIT; completedPasses=3.")
    return last_code  # Existing final weather/closure gates still decide completeness.


def main():
    latest_cache_stamp = None

    def run_pass(environment):
        nonlocal latest_cache_stamp
        latest_cache_stamp = CACHE.stat().st_mtime_ns if CACHE.exists() else None
        return subprocess.run(
            [sys.executable, "-u", str(ROOT / "scripts/run-dmi-bulk-supervised.py")],
            cwd=ROOT, env=environment, check=False,
        ).returncode

    def read_progress(reference):
        if not CACHE.exists() or CACHE.stat().st_mtime_ns == latest_cache_stamp:
            raise ValueError("ONEOFF_FINALIZED_REPORT_MISSING")
        return summarize_progress(json.loads(CACHE.read_text(encoding="utf-8")), reference)

    return fill(dict(os.environ), run_pass=run_pass, read_progress=read_progress,
                clock=time.monotonic, free_bytes=lambda: shutil.disk_usage(ROOT).free)


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except Exception:
        print("DMI one-off continuation failed closed: CONFIGURATION_OR_FINALIZED_REPORT_INVALID.", flush=True)
        raise SystemExit(2)
