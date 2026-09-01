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
import os
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any

from lib.copernicus_current import (
    COLD_BRIDGE_HOURS,
    DMI_VERIFIER_CONTRACT_ID,
    OPERATIONAL_MATRIX_CONTRACT_ID,
    PUBLIC_END_OFFSET_HOURS,
    PUBLIC_HOUR_COUNT,
    file_sha256,
    load_targets,
    required_pairs_sha256,
    utc_iso,
    validate_target_registry,
)
from lib.copernicus_target_identity import target_fingerprint
from lib.dmi_native_provenance import (
    canonical_verified_part_current_attestation,
    processed_source_assets_from_current_operational_ledger,
    validate_current_operational_ledger,
    verified_part_current_pair,
)


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


def has_verified_local_dmi(
    document: dict[str, Any], target: dict[str, Any], valid_time: datetime,
) -> bool:
    return verified_part_current_pair(document, target, valid_time)


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
    targets = [{
        "partId": row["partId"],
        "parentZoneId": row["parentZoneId"],
        "name": row["name"],
        "waterPoint": [round(float(row["waterPoint"][0]), 7), round(float(row["waterPoint"][1]), 7)],
    } for row in all_targets]
    registry_sha256 = target_fingerprint(targets)
    if full_coast:
        operational_required_pairs = [
            {"partId": target["partId"], "validTime": utc_iso(valid_time)}
            for valid_time in hours
            if valid_time >= reference
            for target in targets
        ]
        operational_verified_count = 0
    else:
        ledger = ((dmi.get("diagnostics") or {}).get("currentOperationalLedger"))
        allowed_source_assets = processed_source_assets_from_current_operational_ledger(
            ledger
        )
        attestation = canonical_verified_part_current_attestation(
            dmi,
            targets,
            reference,
            hours[-1],
            allowed_source_assets,
        )
        validate_current_operational_ledger(
            ledger,
            attestation,
            targets,
            reference,
            hours[-1],
            registry_sha256,
        )
        operational_required_pairs = [
            {"partId": row["partId"], "validTime": row["validTime"]}
            for row in ledger["operationalComplementPairs"]
        ]
        operational_verified_count = int(attestation["verifiedPairCount"])

    advisory_history_required_pairs: list[dict[str, str]] = []
    advisory_history_verified_count = 0
    for valid_time in hours:
        if valid_time >= reference:
            continue
        for target in targets:
            verified = False if full_coast else has_verified_local_dmi(dmi, target, valid_time)
            if verified:
                advisory_history_verified_count += 1
            else:
                advisory_history_required_pairs.append({
                    "partId": target["partId"], "validTime": utc_iso(valid_time),
                })
    operational_required_pairs.sort(key=lambda row: (row["validTime"], row["partId"]))
    advisory_history_required_pairs.sort(key=lambda row: (row["validTime"], row["partId"]))
    unique_required_ids = {
        row["partId"]
        for row in [*operational_required_pairs, *advisory_history_required_pairs]
    }
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
        "schemaVersion": 3,
        "kind": REGISTRY_KIND,
        "matrixContractId": OPERATIONAL_MATRIX_CONTRACT_ID,
        "selectionMode": "manual-full-coast" if full_coast else "dmi-gaps-only",
        "productionReferenceAt": utc_iso(reference),
        "targetHour": utc_iso(reference),
        "rangeStartAt": utc_iso(hours[0]),
        "rangeEndAt": utc_iso(hours[-1]),
        "coldBridgeHours": COLD_BRIDGE_HOURS,
        "publicHourCount": PUBLIC_HOUR_COUNT,
        "matrixHourCount": len(hours),
        "operationalRangeStartAt": utc_iso(reference),
        "operationalRangeEndAt": utc_iso(hours[-1]),
        "operationalHourCount": PUBLIC_HOUR_COUNT,
        "advisoryHistoryStartAt": utc_iso(hours[0]),
        "advisoryHistoryEndAt": utc_iso(reference - timedelta(hours=1)),
        "advisoryHistoryHourCount": COLD_BRIDGE_HOURS,
        "targetCount": len(targets),
        "sourcePartCount": len(targets),
        "partCount": len(unique_required_ids),
        "operationalPartCount": len({row["partId"] for row in operational_required_pairs}),
        "advisoryHistoryPartCount": len({
            row["partId"] for row in advisory_history_required_pairs
        }),
        "targetRegistrySha256": registry_sha256,
        "dmiCurrentInputSha256": dmi_sha256,
        "dmiVerifierContractId": DMI_VERIFIER_CONTRACT_ID,
        "operationalRequiredPairsSha256": required_pairs_sha256(operational_required_pairs),
        "operationalRequiredPairCount": len(operational_required_pairs),
        "operationalDmiVerifiedPairCount": operational_verified_count,
        "operationalTotalPairCount": len(targets) * PUBLIC_HOUR_COUNT,
        "advisoryHistoryRequiredPairsSha256": required_pairs_sha256(
            advisory_history_required_pairs,
        ),
        "advisoryHistoryRequiredPairCount": len(advisory_history_required_pairs),
        "advisoryHistoryDmiVerifiedPairCount": advisory_history_verified_count,
        "advisoryHistoryTotalPairCount": len(targets) * COLD_BRIDGE_HOURS,
        "dmiVerifiedPairCount": operational_verified_count + advisory_history_verified_count,
        "totalPairCount": len(targets) * len(hours),
        "coordinatesChanged": False,
        "targets": targets,
        "operationalRequiredPairs": operational_required_pairs,
        "advisoryHistoryRequiredPairs": advisory_history_required_pairs,
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
        handle.write(f"local_dmi_count={document['operationalDmiVerifiedPairCount']}\n")
        handle.write(f"target_part_count={document['partCount']}\n")
        handle.write(f"required_pair_count={document['operationalRequiredPairCount']}\n")
        handle.write(f"required_pairs_sha256={document['operationalRequiredPairsSha256']}\n")
        handle.write(f"operational_required_pair_count={document['operationalRequiredPairCount']}\n")
        handle.write(f"advisory_history_required_pair_count={document['advisoryHistoryRequiredPairCount']}\n")


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
    atomic_write(args.output, document)
    write_github_output(args.github_output, document)
    print(
        "Copernicus exact range targets: "
        f"{document['operationalRequiredPairCount']} operational DMI-gap pairs across "
        f"{document['operationalPartCount']} parts; "
        f"advisory history {document['advisoryHistoryRequiredPairCount']} gaps; "
        f"DMI verified operationally {document['operationalDmiVerifiedPairCount']}/"
        f"{document['operationalTotalPairCount']}; "
        f"reference={document['productionReferenceAt']}; coordinates changed: no."
    )
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except Exception as error:
        print(f"Copernicus target selection failed: {error}")
        raise SystemExit(1)
