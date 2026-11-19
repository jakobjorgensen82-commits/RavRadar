#!/usr/bin/env python3
"""Read-only proof that one exact restored cache covers a locked successor hour."""
from __future__ import annotations

import hashlib
import importlib.util
import json
import os
from pathlib import Path
import re
import stat
import sys


SHA256 = re.compile(r"[0-9a-f]{64}")
RUN_NUMBER = re.compile(r"[1-9][0-9]{0,19}")
HOUR = re.compile(r"[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:00:00Z")
CACHE_KEY = re.compile(r"dmi-grib-v4-Linux-[0-9]{4}-W(?:0[1-9]|[1-4][0-9]|5[0-3])-[1-9][0-9]*-[1-9][0-9]*")
PLAN_MAX_BYTES = 4 * 1024 * 1024


def _digest(value):
    encoded = json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(",", ":")).encode("utf-8")
    return hashlib.sha256(encoded).hexdigest()


def prove_restored_raw_successor(producer, environment):
    # The protected reader owns the actual checkout, writer, B/S and exact
    # matched-cache metadata. This process measures only the restored bytes.
    run_id = environment.get("GITHUB_RUN_ID", "")
    attempt = environment.get("GITHUB_RUN_ATTEMPT", "")
    head = environment.get("GITHUB_SHA", "")
    target = environment.get("RAVRADAR_PRODUCTION_TARGET_HOUR", "")
    plan_digest = environment.get("RAVRADAR_RAW_SUCCESSOR_PLAN_SHA256", "")
    temporary = Path(environment.get("RUNNER_TEMP", ""))
    if (not RUN_NUMBER.fullmatch(run_id) or not RUN_NUMBER.fullmatch(attempt)
            or not re.fullmatch(r"[0-9a-f]{40}", head) or not HOUR.fullmatch(target)
            or producer.canonical_time(target) != target or not SHA256.fullmatch(plan_digest)
            or not temporary.is_absolute() or ".." in temporary.parts):
        raise ValueError("proof scope")

    root = producer.ROOT
    raw = root / ".cache/dmi-grib"
    if producer.RAW_DIR != raw:
        raise ValueError("restore path")
    for directory in (root, raw.parent, raw):
        info = directory.lstat()
        if not stat.S_ISDIR(info.st_mode) or directory.is_symlink():
            raise ValueError("restore directory")
    plan_path = temporary / "ravradar-raw-rotation/successor-plan.json"
    identity_path = root / ".cache/dmi-restored-raw-identity.json"
    read = producer._archive_raw_retention_json
    plan = read(plan_path, PLAN_MAX_BYTES, plan_digest)
    identity_stat = producer._OwnedGribRead._identity(identity_path.lstat())
    identity = read(identity_path, 512)
    if (not isinstance(plan, dict) or set(plan) != {"schemaVersion", "kind", "targetReferenceAt", "retention"}
            or type(plan["schemaVersion"]) is not int or plan["schemaVersion"] != 1
            or plan["kind"] != "PUBLISHED_RAW_ROTATION_SUCCESSOR_PLAN"
            or plan["targetReferenceAt"] != target[:-1] + ".000Z"
            or not isinstance(identity, dict) or set(identity) != {"id", "key", "version"}
            or type(identity["id"]) is not int or not 0 < identity["id"] < 2**53
            or not isinstance(identity["key"], str) or not CACHE_KEY.fullmatch(identity["key"])
            or not isinstance(identity["version"], str) or not SHA256.fullmatch(identity["version"])):
        raise ValueError("proof input")
    retention = plan["retention"]
    if (not isinstance(retention, dict) or type(retention.get("schemaVersion")) is not int
            or retention.get("kind") != "COMMITTED_POST_H0_UNKNOWN_RAW_RETENTION"
            or not isinstance(retention.get("captures"), list) or not 0 < len(retention["captures"]) <= 4096
            or not isinstance(retention.get("boundary"), dict)
            or not producer.canonical_time(retention["boundary"].get("productionReferenceAt"))
            or producer.epoch(retention["boundary"]["productionReferenceAt"]) >= producer.epoch(target)):
        raise ValueError("protected demand")
    required = len(retention["captures"])
    verified = producer.configure_raw_current_retention(retention, require_existing=True)
    if verified != {"evictionAllowed": True, "protectedFiles": required, "unavailableCaptures": 0}:
        raise ValueError("missing original")
    if (read(plan_path, PLAN_MAX_BYTES, plan_digest) != plan or read(identity_path, 512) != identity
            or producer._OwnedGribRead._identity(identity_path.lstat()) != identity_stat):
        raise ValueError("proof input moved")
    return {
        "schemaVersion": 1, "kind": "DMI_RESTORED_RAW_SUCCESSOR_COVERAGE_V1",
        "runId": run_id, "runAttempt": attempt, "sourceHead": head, "targetReferenceAt": target,
        "cacheIdentitySha256": _digest(identity), "baselineBoundarySha256": _digest(retention["boundary"]),
        "planSha256": plan_digest, "allRequiredVerified": True, "requiredCaptures": required,
        "protectedFiles": verified["protectedFiles"], "unavailableCaptures": 0,
    }


def main():
    try:
        if sys.argv[1:]:
            raise ValueError("fixed entry")
        spec = importlib.util.spec_from_file_location(
            "raw_successor_normal_producer", Path(__file__).with_name("update-dmi-bulk.py")
        )
        producer = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(producer)
        report = prove_restored_raw_successor(producer, os.environ)
        print(json.dumps(report, separators=(",", ":")), flush=True)
        return 0
    except Exception:
        print("DMI_RESTORED_RAW_SUCCESSOR_COVERAGE_REFUSED", file=sys.stderr, flush=True)
        return 2


if __name__ == "__main__":
    raise SystemExit(main())
