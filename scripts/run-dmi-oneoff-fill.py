#!/usr/bin/env python3
"""Bounded continuation of the existing DMI producer, for the one-off job only.

Each completed pass finalizes and prunes using the existing producer. Every
pass keeps the producer's 50-minute bound and 4-GiB raw-cache ceiling. The
workflow defaults to one completion-first pass and may explicitly request at
most three passes when native-DMI diagnosis requires more bounded progress.
"""
from __future__ import annotations

import os
from pathlib import Path
import shutil
import subprocess
import sys
import time
from datetime import datetime, timezone

from lib.dmi_bulk_storage import read_dmi_bulk_document

ROOT = Path(__file__).resolve().parents[1]
CACHE = Path(os.getenv(
    "DMI_BULK_OUTPUT_PATH",
    str(ROOT / "data/live/dmi-bulk-cache.json"),
))
MAX_PASSES = 3
MAX_PASSES_ENV = "DMI_BULK_ONEOFF_MAX_PASSES"
GIB = 1024 ** 3
COLLECTIONS = {"dkss_idw", "dkss_nsbs", "dkss_lf", "harmonie_dini_sf", "wam_dw", "wam_nsb"}
MARINE_COLLECTIONS = {"dkss_idw", "dkss_nsbs", "dkss_lf"}
# HARMONIE may be reached after the strict-current work has consumed the pass.
# Its inner runtime-stop paths explicitly attest that all accepted progress was
# preserved.  That auxiliary stop must not veto another DKSS pass, but it never
# justifies a pass by itself and no other HARMONIE failure is continuable.
AUXILIARY_CHECKPOINTED_RUNTIME_COLLECTIONS = {"harmonie_dini_sf"}
ONEOFF_CONTINUATION_PROTOCOL_ENV = "DMI_BULK_ONEOFF_CONTINUATION_PROTOCOL"
FINALIZED_INCOMPLETE_EXIT_CODE = 75
PASS_RUNTIME_SECONDS = 3000
MIN_FREE_BYTES = 5 * GIB
CURRENT_RUNTIME_LEDGER_CODES = {
    "LOCALLY_SKIPPED_DKSS_ASSET",
    "RETAINED_CURRENT_PART_TIME",
    "SYSTEMIC_CURRENT_TIME_COLLAPSE",
}
DOWNLOAD_MESSAGES = {
    "DMI bulk download budget would be exceeded",
    "DMI bulk download budget exceeded before next asset",
    "DMI bulk download budget exceeded during asset download",
}
RUNTIME_MESSAGES = {
    "bulk runtime budget reached",
    "bulk runtime budget reached inside GRIB processing",
}


def summarize_progress(document: dict, reference: str) -> dict:
    """Return only counters/booleans from the finalized private cache."""
    diagnostics = document["diagnostics"]
    if "progressCheckpoint" in diagnostics:
        raise ValueError("ONEOFF_REPORT_NOT_FINALIZED")
    ledger = diagnostics["currentOperationalLedger"]
    if ledger.get("productionReferenceAt") != reference or type(ledger.get("ready")) is not bool:
        raise ValueError("ONEOFF_REFERENCE_OR_READINESS_INVALID")
    ready = ledger["ready"]
    failure_codes = ledger.get("failureCodes")
    attestation = ledger.get("attestation")
    counts = [ledger.get("targetCount"), ledger.get("hourCount")]
    if (
        not isinstance(failure_codes, list)
        or any(not isinstance(code, str) for code in failure_codes)
        or not isinstance(attestation, dict)
        or type(attestation.get("verifiedPairCount")) is not int
        or any(type(value) is not int or value <= 0 for value in counts)
    ):
        raise ValueError("ONEOFF_REPORT_INVALID")
    verified_pairs = attestation["verifiedPairCount"]
    required_pairs = counts[0] * counts[1]
    if verified_pairs < 0 or verified_pairs > required_pairs:
        raise ValueError("ONEOFF_REPORT_INVALID")
    errors = diagnostics.get("errors")
    if not isinstance(errors, list):
        raise ValueError("ONEOFF_REPORT_INVALID")
    only_download_stops = bool(errors) and all(
        isinstance(row, dict) and row.get("collection") in COLLECTIONS
        and row.get("message") in DOWNLOAD_MESSAGES
        and row.get("partialProgressPreserved") is True
        for row in errors
    )
    ledger_code_set = set(failure_codes)

    def safe_runtime_error(row: object) -> bool:
        if not isinstance(row, dict):
            return False
        collection = row.get("collection")
        if collection == "dmi-current-ledger-gate":
            codes = row.get("failureCodes")
            return (
                isinstance(codes, list)
                and all(isinstance(code, str) for code in codes)
                and set(codes) == ledger_code_set
            )
        if collection not in MARINE_COLLECTIONS | AUXILIARY_CHECKPOINTED_RUNTIME_COLLECTIONS:
            return False
        message = row.get("message")
        if row.get("failureCode") != "RUNTIME_BUDGET_REACHED" or message not in RUNTIME_MESSAGES:
            return False
        marker = row.get("partialProgressPreserved")
        base_fields = {"collection", "message", "failureCode"}
        # The outer boundary is reached before collection work begins and may
        # therefore omit the marker. Once GRIB work began, explicit preservation
        # is mandatory. The dedicated child exit proves normal finalization.
        return bool(
            (
                marker is True
                and set(row) == base_fields | {"partialProgressPreserved"}
            )
            or (
                message == "bulk runtime budget reached"
                and "partialProgressPreserved" not in row
                and set(row) == base_fields
            )
        )

    strict_current_runtime_limited = bool(
        not ready
        and "LOCALLY_SKIPPED_DKSS_ASSET" in ledger_code_set
        and ledger_code_set <= CURRENT_RUNTIME_LEDGER_CODES
        and errors
        and all(safe_runtime_error(row) for row in errors)
        and any(
            isinstance(row, dict)
            and row.get("collection") in MARINE_COLLECTIONS
            and row.get("failureCode") == "RUNTIME_BUDGET_REACHED"
            and row.get("message") in RUNTIME_MESSAGES
            for row in errors
        )
    )
    attempted = diagnostics.get("collectionsAttempted")
    if not isinstance(attempted, list) or not set(attempted) <= COLLECTIONS:
        raise ValueError("ONEOFF_REPORT_INVALID")
    processed_assets = diagnostics.get("assetsProcessedThisInvocation")
    raw = diagnostics["rawCache"]
    numeric = [processed_assets, raw["after"]["bytes"], raw["maxBytes"]]
    if any(type(value) is not int or value < 0 for value in numeric):
        raise ValueError("ONEOFF_REPORT_INVALID")
    if raw["maxBytes"] != 4 * GIB or raw["after"]["bytes"] > 4 * GIB:
        raise ValueError("ONEOFF_CACHE_CEILING_NOT_RESTORED")
    continuation_reason = None
    if ready and only_download_stops:
        continuation_reason = "download-budget"
    elif strict_current_runtime_limited:
        continuation_reason = "strict-current-runtime"
    return {
        "continuationReason": continuation_reason,
        "currentReady": ready,
        "onlyDownloadStops": only_download_stops,
        "processedAssets": processed_assets,
        "requiredPairCount": required_pairs,
        "verifiedPairCount": verified_pairs,
    }


def fill(environment, *, run_pass, read_progress, clock, free_bytes, log=print):
    expected = {"DMI_BULK_MAX_DOWNLOAD_MB": "4096", "DMI_BULK_RAW_CACHE_MAX_MB": "4096",
                "DMI_BULK_MAX_RUNTIME_SECONDS": "3000", "DMI_BULK_FINALIZE_RESERVE_SECONDS": "180"}
    if any(environment.get(key) != value for key, value in expected.items()):
        raise ValueError("ONEOFF_BUDGET_CONFIGURATION_INVALID")
    configured_passes = environment.get(MAX_PASSES_ENV, "3")
    if configured_passes not in {str(value) for value in range(1, MAX_PASSES + 1)}:
        raise ValueError("ONEOFF_PASS_CONFIGURATION_INVALID")
    pass_limit = int(configured_passes)
    reference = environment.get("RAVRADAR_PRODUCTION_TARGET_HOUR", "")
    parsed = datetime.fromisoformat(reference.replace("Z", "+00:00"))
    if parsed.tzinfo is None or parsed.astimezone(timezone.utc).strftime("%Y-%m-%dT%H:00:00Z") != reference:
        raise ValueError("ONEOFF_REFERENCE_INVALID")
    _ = clock  # Dependency retained for deterministic callers; child bounds are authoritative.
    last_code = 2
    previous_runtime_verified_pairs = None
    for pass_number in range(1, pass_limit + 1):
        if free_bytes() < MIN_FREE_BYTES:
            log(f"DMI one-off continuation stopped: DISK_RESERVE; completedPasses={pass_number - 1}.")
            return last_code
        child_environment = dict(
            environment,
            DMI_BULK_MAX_RUNTIME_SECONDS=str(PASS_RUNTIME_SECONDS),
            **{ONEOFF_CONTINUATION_PROTOCOL_ENV: "1"},
        )
        log(
            f"DMI one-off pass {pass_number}/{pass_limit}; "
            f"passRuntimeSeconds={PASS_RUNTIME_SECONDS}; "
            "downloadLimitGiB=4; rawCacheLimitGiB=4."
        )
        child_code = run_pass(child_environment)
        last_code = 2 if child_code == FINALIZED_INCOMPLETE_EXIT_CODE else child_code
        if child_code not in {0, FINALIZED_INCOMPLETE_EXIT_CODE}:
            return child_code
        summary = read_progress(reference)
        reason = summary["continuationReason"]
        expected_reason = (
            "download-budget" if child_code == 0
            else "strict-current-runtime"
        )
        if reason != expected_reason or summary["processedAssets"] <= 0:
            return last_code
        if reason == "strict-current-runtime":
            verified_pairs = summary["verifiedPairCount"]
            if (
                previous_runtime_verified_pairs is not None
                and verified_pairs <= previous_runtime_verified_pairs
            ):
                log(
                    "DMI one-off continuation stopped: NO_VERIFIED_PAIR_GAIN; "
                    f"completedPasses={pass_number}; "
                    f"verifiedPairCount={verified_pairs}."
                )
                return last_code
            previous_runtime_verified_pairs = verified_pairs
        log(
            "DMI one-off saved bounded progress: "
            f"pass={pass_number}; reason={reason}; "
            f"processedAssets={summary['processedAssets']}; "
            f"verifiedPairCount={summary['verifiedPairCount']}."
        )
    log(
        "DMI one-off continuation stopped: PASS_LIMIT; "
        f"completedPasses={pass_limit}."
    )
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
        return summarize_progress(read_dmi_bulk_document(CACHE), reference)

    return fill(dict(os.environ), run_pass=run_pass, read_progress=read_progress,
                clock=time.monotonic, free_bytes=lambda: shutil.disk_usage(ROOT).free)


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except Exception:
        print("DMI one-off continuation failed closed: CONFIGURATION_OR_FINALIZED_REPORT_INVALID.", flush=True)
        raise SystemExit(2)
