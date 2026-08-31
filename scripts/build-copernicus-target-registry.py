#!/usr/bin/env python3
"""Build the exact -48..+117 Copernicus DMI-gap matrix.

The production reference is immutable. DMI coverage is verified independently
for every central coastal part and native UTC hour; a nearby DMI hour can never
move or fill the matrix. The output remains private because it contains the
centrally approved sampling points needed by the authenticated downloader.
"""
from __future__ import annotations

import argparse
import json
import math
import os
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any

from lib.copernicus_current import (
    COLD_BRIDGE_HOURS,
    DMI_VERIFIER_CONTRACT_ID,
    MATRIX_CONTRACT_ID,
    PUBLIC_END_OFFSET_HOURS,
    PUBLIC_HOUR_COUNT,
    file_sha256,
    load_targets,
    required_pairs_sha256,
    utc_iso,
    validate_target_registry,
)
from lib.copernicus_target_identity import target_fingerprint
from lib.dmi_native_provenance import complete_native_source_for_hour


ROOT = Path(__file__).resolve().parents[1]
DEFAULT_TARGETS = ROOT / "data/live/coastal-parts-v2.json"
DEFAULT_DMI = ROOT / "data/live/dmi-bulk-cache.json"
DEFAULT_OUTPUT = ROOT / ".cache/copernicus-current-targets.json"
REGISTRY_KIND = "RAVRADAR_PRIVATE_COPERNICUS_CURRENT_RANGE_TARGET_REGISTRY"


def arguments() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--targets", type=Path, default=DEFAULT_TARGETS)
    parser.add_argument("--dmi", type=Path, default=DEFAULT_DMI)
    parser.add_argument("--output", type=Path, default=DEFAULT_OUTPUT)
    parser.add_argument("--at", help="Locked productionReferenceAt; defaults to current UTC hour")
    parser.add_argument("--full-coast", action="store_true", help="Explicit manual full-coast research matrix")
    # Compatibility-only flags. They intentionally cannot rebind the reference.
    parser.add_argument("--nearest-dmi-hour", action="store_true", help=argparse.SUPPRESS)
    parser.add_argument("--max-hour-offset", type=int, default=3, help=argparse.SUPPRESS)
    parser.add_argument("--github-output", type=Path)
    return parser.parse_args()


def utc_hour(value: str | None) -> datetime:
    parsed = datetime.now(timezone.utc) if not value else datetime.fromisoformat(value.replace("Z", "+00:00"))
    if parsed.tzinfo is None:
        raise ValueError("Copernicus production reference must include a timezone")
    parsed = parsed.astimezone(timezone.utc)
    if value and parsed != parsed.replace(minute=0, second=0, microsecond=0):
        raise ValueError("Copernicus production reference must be an exact UTC hour")
    return parsed.replace(minute=0, second=0, microsecond=0)


def finite(value: Any) -> bool:
    return isinstance(value, (int, float)) and not isinstance(value, bool) and math.isfinite(float(value))


def canonical_row_time(value: Any) -> str | None:
    try:
        parsed = datetime.fromisoformat(str(value).replace("Z", "+00:00"))
    except (TypeError, ValueError):
        return None
    if parsed.tzinfo is None:
        return None
    parsed = parsed.astimezone(timezone.utc)
    if parsed != parsed.replace(minute=0, second=0, microsecond=0):
        return None
    return utc_iso(parsed)


def has_verified_local_dmi(
    document: dict[str, Any], target: dict[str, Any], valid_time: datetime,
) -> bool:
    entity_id = f"PART::{target['partId']}"
    zone = (document.get("zones") or {}).get(entity_id) or {}
    entity = {
        "parentZoneId": target["parentZoneId"],
        "entityType": "coastal-part",
        "samplingContext": "coastal-part-water-point",
        "samplingPoint": target["waterPoint"],
    }
    expected_time = utc_iso(valid_time)
    for key, row in ((zone.get("hourly") or {}).items()):
        if not isinstance(row, dict) or canonical_row_time(row.get("time") or key) != expected_time:
            continue
        if not finite(row.get("current-u")) or not finite(row.get("current-v")):
            continue
        source = ((row.get("sources") or {}).get("current") or {})
        if complete_native_source_for_hour(source, "current", entity_id, entity, expected_time):
            return True
    return False


def matrix_hours(reference: datetime) -> list[datetime]:
    start = reference - timedelta(hours=COLD_BRIDGE_HOURS)
    end = reference + timedelta(hours=PUBLIC_END_OFFSET_HOURS)
    hours: list[datetime] = []
    cursor = start
    while cursor <= end:
        hours.append(cursor)
        cursor += timedelta(hours=1)
    if len(hours) != COLD_BRIDGE_HOURS + PUBLIC_HOUR_COUNT:
        raise RuntimeError("Internal Copernicus range length is not 166 hours")
    return hours


def build_registry(
    all_targets: list[dict[str, Any]],
    dmi: dict[str, Any],
    reference: datetime,
    dmi_sha256: str,
    *,
    full_coast: bool,
) -> dict[str, Any]:
    hours = matrix_hours(reference)
    required_pairs: list[dict[str, str]] = []
    verified_count = 0
    for valid_time in hours:
        for target in all_targets:
            verified = False if full_coast else has_verified_local_dmi(dmi, target, valid_time)
            if verified:
                verified_count += 1
            else:
                required_pairs.append({"partId": target["partId"], "validTime": utc_iso(valid_time)})
    required_pairs.sort(key=lambda row: (row["validTime"], row["partId"]))
    unique_required_ids = {row["partId"] for row in required_pairs}
    targets = [{
        "partId": row["partId"],
        "parentZoneId": row["parentZoneId"],
        "name": row["name"],
        "waterPoint": [round(float(row["waterPoint"][0]), 7), round(float(row["waterPoint"][1]), 7)],
    } for row in all_targets]
    target_by_id = {row["partId"]: row for row in targets}
    zones: dict[str, list[dict[str, Any]]] = {}
    for part_id in sorted(unique_required_ids):
        target = target_by_id[part_id]
        zones.setdefault(target["parentZoneId"], []).append({
            "partId": target["partId"],
            "sourceZoneId": target["parentZoneId"],
            "name": target["name"],
            "waterPoint": target["waterPoint"],
        })
    return {
        "schemaVersion": 2,
        "kind": REGISTRY_KIND,
        "matrixContractId": MATRIX_CONTRACT_ID,
        "selectionMode": "manual-full-coast" if full_coast else "dmi-gaps-only",
        "productionReferenceAt": utc_iso(reference),
        "targetHour": utc_iso(reference),
        "rangeStartAt": utc_iso(hours[0]),
        "rangeEndAt": utc_iso(hours[-1]),
        "coldBridgeHours": COLD_BRIDGE_HOURS,
        "publicHourCount": PUBLIC_HOUR_COUNT,
        "matrixHourCount": len(hours),
        "targetCount": len(targets),
        "sourcePartCount": len(targets),
        "partCount": len(unique_required_ids),
        "targetRegistrySha256": target_fingerprint(targets),
        "dmiCurrentInputSha256": dmi_sha256,
        "dmiVerifierContractId": DMI_VERIFIER_CONTRACT_ID,
        "requiredPairsSha256": required_pairs_sha256(required_pairs),
        "requiredPairCount": len(required_pairs),
        "dmiVerifiedPairCount": verified_count,
        "totalPairCount": len(targets) * len(hours),
        "coordinatesChanged": False,
        "targets": targets,
        "requiredPairs": required_pairs,
        "zones": zones,
    }


def validate_registry(document: dict[str, Any]) -> None:
    validate_target_registry(document)


def atomic_write(path: Path, document: dict[str, Any]) -> None:
    validate_registry(document)
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary = path.with_name(path.name + ".tmp")
    try:
        with temporary.open("w", encoding="utf-8", newline="\n") as handle:
            handle.write(json.dumps(document, ensure_ascii=False, indent=2, allow_nan=False) + "\n")
            handle.flush()
            os.fsync(handle.fileno())
        validate_registry(json.loads(temporary.read_text(encoding="utf-8")))
        os.replace(temporary, path)
    finally:
        if temporary.exists():
            temporary.unlink()


def write_github_output(path: Path | None, document: dict[str, Any]) -> None:
    if path is None:
        return
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("a", encoding="utf-8") as handle:
        handle.write(f"target_hour={document['productionReferenceAt']}\n")
        handle.write(f"production_reference_at={document['productionReferenceAt']}\n")
        handle.write(f"local_dmi_count={document['dmiVerifiedPairCount']}\n")
        handle.write(f"target_part_count={document['partCount']}\n")
        handle.write(f"required_pair_count={document['requiredPairCount']}\n")
        handle.write(f"required_pairs_sha256={document['requiredPairsSha256']}\n")


def main() -> int:
    args = arguments()
    reference = utc_hour(args.at)
    all_targets = load_targets(args.targets)
    try:
        dmi = json.loads(args.dmi.read_text(encoding="utf-8"))
    except Exception as error:
        raise RuntimeError(f"Cannot read deployed DMI coverage: {error}") from None
    if not isinstance(dmi, dict):
        raise RuntimeError("DMI coverage input must be an object")
    document = build_registry(
        all_targets, dmi, reference, file_sha256(args.dmi), full_coast=args.full_coast,
    )
    if not args.full_coast and document["dmiVerifiedPairCount"] == 0 and all_targets:
        raise RuntimeError("No strictly provenance-verified DMI current pair exists in the locked range; refusing implicit full-coast Copernicus collection")
    atomic_write(args.output, document)
    write_github_output(args.github_output, document)
    print(
        "Copernicus exact range targets: "
        f"{document['requiredPairCount']} DMI-gap pairs across {document['partCount']} parts; "
        f"DMI verified {document['dmiVerifiedPairCount']}/{document['totalPairCount']}; "
        f"reference={document['productionReferenceAt']}; coordinates changed: no."
    )
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except Exception as error:
        print(f"Copernicus target selection failed: {error}")
        raise SystemExit(1)
