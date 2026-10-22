"""One cache-only CURRENT proof worker, under the existing process owner.

No ordinary producer main, provider requests, finalizer, save or retry. A failed
owner has no closure receipt and none of its private files may be admitted.
"""
from __future__ import annotations

import importlib.util
import json
import os
from pathlib import Path
import re
import sys
import time


ROOT = Path(__file__).resolve().parents[1]
SHA = re.compile(r"[a-f0-9]{64}")
PREFIX = "COHERENT_CURRENT_ORIGINAL_"


def main(argv):
    if (sys.platform != "linux" or len(argv) != 2
            or argv[0] != "--request-sha256" or not SHA.fullmatch(argv[1])):
        raise ValueError(PREFIX + "SUPERVISOR_ARGUMENT_INVALID")
    supervisor_path = ROOT / "scripts/run-dmi-bulk-supervised.py"
    worker = ROOT / "scripts/decode-coherent-current-originals.py"
    if any(path.is_symlink() or not path.is_file() for path in (supervisor_path, worker)):
        raise ValueError(PREFIX + "SUPERVISOR_SOURCE_INVALID")
    spec = importlib.util.spec_from_file_location("coherent_current_normal_owner", supervisor_path)
    owner = importlib.util.module_from_spec(spec)
    sys.modules[spec.name] = owner
    spec.loader.exec_module(owner)
    if owner.ROOT != ROOT:
        raise ValueError(PREFIX + "SUPERVISOR_SOURCE_INVALID")
    environment = dict(os.environ)
    for key in list(environment):
        if (re.search(r"SECRET|TOKEN|PASSWORD|API_KEY|ACCESS_KEY", key, re.I)
                or re.match(r"SUPABASE_|RAVRADAR_R2_|WEATHER_PROGRESS_|DMI_|COPERNICUS|CMEMS_|OPEN_METEO_|MET_NORWAY_", key, re.I)):
            environment.pop(key)
    environment.update({"DMI_BULK_CACHE_ONLY": "true",
                        "DMI_BULK_MAX_RUNTIME_SECONDS": "600",
                        "DMI_BULK_FINALIZE_RESERVE_SECONDS": "60"})
    output, output_bytes = [], 0

    def collect(line):
        nonlocal output_bytes
        # Known ordinary asset markers remain private to the owner. The worker
        # emits only its final fixed-schema receipt (or bounded refusal).
        if (owner.parse_asset_marker(line, owner.ASSET_START_MARKER) is not None
                or owner.parse_asset_marker(line, owner.ASSET_END_MARKER) is not None):
            return
        output_bytes += len(line.encode("utf-8"))
        if output_bytes > 8192:
            raise ValueError(PREFIX + "SUPERVISOR_OUTPUT_BOUND")
        output.append(line)

    # Reserve both existing10s stop windows and output-reader cleanup within600s;
    # this does not claim runner-loss/escaped-group protection or SOURCE closure.
    result = owner.run_supervised(
        [sys.executable, "-B", "-u", str(worker), "--request-sha256", argv[1]],
        environment, watchdog_seconds=180,
        total_deadline=time.monotonic() + 570, log=collect)
    if result.watchdog_timed_out or result.returncode != 0:
        # Preserve a known fixed worker refusal, never raw decoder text.
        code = PREFIX + "WORKER_REFUSED"
        try:
            refused = json.loads("".join(output))
            candidate = refused.get("code") if isinstance(refused, dict) else None
            if isinstance(candidate, str) and re.fullmatch(PREFIX + r"[A-Z_]{1,80}", candidate):
                code = candidate
        except (TypeError, ValueError):
            pass
        raise ValueError(code)
    try:
        receipt = json.loads("".join(output))
    except (TypeError, ValueError):
        raise ValueError(PREFIX + "SUPERVISOR_OUTPUT_INVALID") from None
    if (not isinstance(receipt, dict) or set(receipt) != {
            "status", "requestCount", "captureCount", "bytes", "sha256", "nativeAdmissionPerformed"}
            or receipt["status"] != "DECODED_PRIVATE_NOT_ADMITTED"
            or receipt["nativeAdmissionPerformed"] is not False
            or any(type(receipt[key]) is not int or receipt[key] <= 0
                   for key in ("requestCount", "captureCount", "bytes"))
            or receipt["bytes"] > 192 * 1024 * 1024
            or not isinstance(receipt["sha256"], str) or not SHA.fullmatch(receipt["sha256"])):
        raise ValueError(PREFIX + "SUPERVISOR_OUTPUT_INVALID")
    print(json.dumps({"schemaVersion": 1, "kind": "COHERENT_CURRENT_ORIGINAL_COHORT_CLOSED",
                      "workerExitCode": 0, "physicalGroupClosed": True,
                      "outputClosed": True, "result": receipt}, separators=(",", ":")), flush=True)
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main(sys.argv[1:]))
    except BaseException as error:
        if isinstance(error, SystemExit) and error.code == 0:
            raise
        message = str(error)
        code = message if re.fullmatch(PREFIX + r"[A-Z_]{1,80}", message) else PREFIX + "SUPERVISOR_FAILED"
        print(json.dumps({"status": "UNRESOLVED", "code": code,
                          "nativeAdmissionPerformed": False}), file=sys.stderr, flush=True)
        raise SystemExit(1)
