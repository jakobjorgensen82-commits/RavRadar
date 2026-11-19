#!/usr/bin/env python3
"""Read and verify the required files from the local RAW cache input to SAVE."""
import importlib.util
import json
from pathlib import Path
import sys


MAX_PLAN_BYTES = 4 * 1024 * 1024


def verify_saved_captures(producer, plan):
    if (not isinstance(plan, dict)
            or set(plan) != {"schemaVersion", "kind", "boundary", "captures"}
            or type(plan["schemaVersion"]) is not int or plan["schemaVersion"] != 1
            or plan["kind"] != "PUBLISHED_ORDINARY_RAW_CAPTURE_UNION"
            or not isinstance(plan["captures"], list)
            or producer.RAW_DIR != producer.ROOT / ".cache/dmi-grib"
            or producer.RAW_DIR.resolve(strict=True) != producer.RAW_DIR):
        raise ValueError("invalid saved RAW proof scope")
    # Reuse the normal manifest and byte checker. Its eviction flags and
    # process-local holds do not leave this process or authorize rotation.
    checked = producer.configure_raw_current_retention({
        **plan, "kind": "COMMITTED_POST_H0_UNKNOWN_RAW_RETENTION",
    })
    count = len(plan["captures"])
    if checked != {"evictionAllowed": True, "protectedFiles": count, "unavailableCaptures": 0}:
        raise ValueError("required RAW original unavailable")
    return {"verifiedCaptureCount": count}


def main():
    try:
        data = sys.stdin.buffer.read(MAX_PLAN_BYTES + 1)
        if sys.argv[1:] or not 0 < len(data) <= MAX_PLAN_BYTES:
            raise ValueError("invalid RAW plan length")
        spec = importlib.util.spec_from_file_location(
            "raw_capture_normal_producer", Path(__file__).with_name("update-dmi-bulk.py"))
        producer = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(producer)
        result = verify_saved_captures(producer, json.loads(data))
        print(json.dumps(result, separators=(",", ":")))
        return 0
    except Exception:
        print("DMI_SAVED_RAW_CAPTURE_CHECK_REFUSED", file=sys.stderr)
        return 2


if __name__ == "__main__":
    raise SystemExit(main())
