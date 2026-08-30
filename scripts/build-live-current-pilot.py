#!/usr/bin/env python3
"""Build the fail-closed online current history for the controlled live pilot.

Credentials never enter the document.  Geometry-bound Copernicus and approved
regional-proxy U/V records may be published below ``data/live`` and are consumed
by the weather build only when the versioned control is in ``controlled-live``
mode.  The script never changes the source caches and never prints vector values.
"""
from __future__ import annotations

import argparse
import json
import math
import os
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from lib.copernicus_current import (
    COPERNICUS_SOURCE_CONTRACTS,
    DMI_VERIFIER_CONTRACT_ID,
    RECORD_PROJECTION_CONTRACT_ID,
    file_sha256,
    live_record_projection_sha256,
    validate_shadow,
)
from lib.copernicus_target_identity import target_fingerprint, targets_from_registry
from lib.dmi_native_provenance import complete_native_source_for_hour


ROOT = Path(__file__).resolve().parents[1]
DEFAULT_TARGETS = ROOT / "data/live/coastal-parts-v2.json"
DEFAULT_DMI = ROOT / "data/live/dmi-bulk-cache.json"
DEFAULT_COPERNICUS = ROOT / ".cache/copernicus-current-shadow.json"
DEFAULT_REGIONAL = ROOT / ".cache/current-field-shadow.json"
DEFAULT_POLICY = ROOT / "data/current-regional-proxy-policy.json"
DEFAULT_CONTROL = ROOT / "data/current-live-pilot-control.json"
DEFAULT_OUTPUT = ROOT / "data/live/current-pilot-history.json"
DEFAULT_REPORT = ROOT / "data/diagnostics/live-current-pilot.json"
RETENTION_HOURS = 168
COPERNICUS_MAX_KM = 5.0
REGIONAL_MAX_KM = 15.0
COPERNICUS_SOURCES = ("copernicus-baltic-nemo", "copernicus-nws-amm15")
REGIONAL_PREFIX = "REGIONAL_PROXY::"
REGIONAL_CAPTURE_VALID_TOLERANCE_HOURS = 12


def arguments() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--targets", type=Path, default=DEFAULT_TARGETS)
    parser.add_argument("--dmi", type=Path, default=DEFAULT_DMI)
    parser.add_argument("--copernicus", type=Path, default=DEFAULT_COPERNICUS)
    parser.add_argument("--regional", type=Path, default=DEFAULT_REGIONAL)
    parser.add_argument("--policy", type=Path, default=DEFAULT_POLICY)
    parser.add_argument("--control", type=Path, default=DEFAULT_CONTROL)
    parser.add_argument("--output", type=Path, default=DEFAULT_OUTPUT)
    parser.add_argument("--report", type=Path, default=DEFAULT_REPORT)
    parser.add_argument(
        "--at",
        default=os.getenv("RAVRADAR_PRODUCTION_TARGET_HOUR"),
        help="UTC build time; defaults to the workflow-approved production hour or now",
    )
    return parser.parse_args()


def read_json(path: Path, *, optional: bool = False) -> dict[str, Any]:
    try:
        value = json.loads(path.read_text("utf-8"))
    except FileNotFoundError:
        if optional:
            return {}
        raise RuntimeError(f"Required live-pilot input is missing: {path.name}") from None
    except Exception as error:
        raise RuntimeError(f"Invalid live-pilot JSON in {path.name}: {error}") from None
    if not isinstance(value, dict):
        raise RuntimeError(f"Live-pilot input must be an object: {path.name}")
    return value


def parse_time(value: Any) -> datetime:
    parsed = datetime.fromisoformat(str(value).replace("Z", "+00:00"))
    if parsed.tzinfo is None:
        raise ValueError("timestamp has no timezone")
    return parsed.astimezone(timezone.utc)


def utc_iso(value: datetime) -> str:
    return value.astimezone(timezone.utc).isoformat().replace("+00:00", "Z")


def finite(value: Any) -> float | None:
    if isinstance(value, bool) or not isinstance(value, (int, float)):
        return None
    number = float(value)
    return number if math.isfinite(number) else None


def valid_point(value: Any) -> list[float] | None:
    if not isinstance(value, (list, tuple)) or len(value) != 2:
        return None
    first, second = finite(value[0]), finite(value[1])
    return [first, second] if first is not None and second is not None else None


def canonical_point(value: Any) -> list[float] | None:
    point = valid_point(value)
    return [round(point[0], 7), round(point[1], 7)] if point else None


def same_point(first: Any, second: Any) -> bool:
    return canonical_point(first) == canonical_point(second) and canonical_point(first) is not None


def haversine_km(first: list[float], second: list[float]) -> float:
    lon1, lat1 = map(math.radians, first)
    lon2, lat2 = map(math.radians, second)
    dlon, dlat = lon2 - lon1, lat2 - lat1
    value = math.sin(dlat / 2) ** 2 + math.cos(lat1) * math.cos(lat2) * math.sin(dlon / 2) ** 2
    return 6371.0088 * 2 * math.atan2(math.sqrt(value), math.sqrt(max(0.0, 1 - value)))


def in_capture_window(value: Any, now: datetime) -> bool:
    try:
        captured = parse_time(value)
    except Exception:
        return False
    age_hours = (now - captured).total_seconds() / 3600
    return -1 <= age_hours <= RETENTION_HOURS


def capture_matches_valid_time(captured_value: Any, valid_value: Any, maximum_hours: float) -> bool:
    try:
        captured = parse_time(captured_value)
        valid = parse_time(valid_value)
    except Exception:
        return False
    return abs((valid - captured).total_seconds()) <= maximum_hours * 3600


def valid_dmi_parts(document: dict[str, Any], targets: dict[str, dict[str, Any]]) -> tuple[set[str], dict[str, set[str]]]:
    covered: set[str] = set()
    times: dict[str, set[str]] = {}
    for part_id, target in targets.items():
        entity_id = f"PART::{part_id}"
        zone = (document.get("zones") or {}).get(entity_id) or {}
        sampling = target["waterPoint"]
        if not same_point(zone.get("samplingPoint"), sampling):
            continue
        entity = {
            "parentZoneId": target["parentZoneId"],
            "entityType": "coastal-part",
            "samplingContext": "coastal-part-water-point",
            "samplingPoint": sampling,
        }
        for key, row in (zone.get("hourly") or {}).items():
            source = ((row or {}).get("sources") or {}).get("current") or {}
            try:
                valid_time = utc_iso(parse_time((row or {}).get("time") or key))
            except Exception:
                continue
            if (
                finite((row or {}).get("current-u")) is None
                or finite((row or {}).get("current-v")) is None
                or not complete_native_source_for_hour(source, "current", entity_id, entity, valid_time)
            ):
                continue
            covered.add(part_id)
            times.setdefault(part_id, set()).add(valid_time)
    return covered, times


def runtime_times_by_part(
    document: dict[str, Any],
    targets: dict[str, dict[str, Any]],
    reference: datetime,
) -> dict[str, set[str]]:
    times: dict[str, set[str]] = {}
    for part_id, target in targets.items():
        zone = (document.get("zones") or {}).get(f"PART::{part_id}") or {}
        if not same_point(zone.get("samplingPoint"), target["waterPoint"]):
            continue
        for row in (zone.get("hourly") or {}).values():
            try:
                parsed = parse_time((row or {}).get("time"))
            except Exception:
                continue
            if parsed >= reference:
                times.setdefault(part_id, set()).add(utc_iso(parsed))
    return times


def copernicus_entries(
    document: dict[str, Any],
    targets: dict[str, dict[str, Any]],
    fingerprint: str,
    production_reference: datetime,
    dmi_current_input_sha256: str,
) -> tuple[list[dict[str, Any]], dict[str, Any] | None]:
    if not document:
        return [], None
    try:
        cache = validate_shadow(document, targets, require_collection=True)
    except (TypeError, ValueError) as error:
        raise RuntimeError(f"Copernicus range cache is invalid: {error}") from None
    reference_text = utc_iso(production_reference)
    collections = [
        row for row in cache["collections"]
        if row.get("status") == "COMPLETE" and row.get("productionReferenceAt") == reference_text
    ]
    if len(collections) != 1:
        raise RuntimeError("Copernicus projection requires exactly one COMPLETE seal for productionReferenceAt")
    collection = collections[0]
    if (
        collection.get("targetRegistrySha256") != fingerprint
        or collection.get("dmiCurrentInputSha256") != dmi_current_input_sha256
        or collection.get("dmiVerifierContractId") != DMI_VERIFIER_CONTRACT_ID
    ):
        raise RuntimeError("Copernicus COMPLETE seal does not match current target/DMI input identity")
    seal_fields = (
        "collectionId", "status", "productionReferenceAt", "rangeStartAt", "rangeEndAt",
        "coldBridgeHours", "publicHourCount", "targetRegistrySha256", "dmiCurrentInputSha256",
        "dmiVerifierContractId", "requiredPairsSha256", "requiredPairCount", "selectionPolicyId",
        "recordRefsSha256", "sealedAt",
    )
    range_seal = {field: collection[field] for field in seal_fields}
    acquisition_by_id = {row["acquisitionId"]: row for row in cache["acquisitions"]}
    record_by_id = {row["recordId"]: row for row in cache["records"]}
    selected: list[dict[str, Any]] = []
    for ref in collection["recordRefs"]:
        row = record_by_id[ref["recordId"]]
        acquisition = acquisition_by_id[ref["acquisitionId"]]
        part_id = row["partId"]
        target = targets[part_id]
        source = acquisition["source"]
        product_id, dataset_id, dataset_version = COPERNICUS_SOURCE_CONTRACTS[source]
        grid = canonical_point(row["gridPoint"])
        distance = float(row["distanceKm"])
        depth = float(row["verticalLayerM"])
        entry = {
            "recordProjectionContractId": RECORD_PROJECTION_CONTRACT_ID,
            "recordId": row["recordId"],
            "acquisitionId": acquisition["acquisitionId"],
            "collectionId": collection["collectionId"],
            "productionReferenceAt": collection["productionReferenceAt"],
            "partId": part_id,
            "parentZoneId": target["parentZoneId"],
            "targetIdentityFingerprint": target_fingerprint([target]),
            "validTime": row["validTime"],
            "capturedAt": acquisition["acquisitionAt"],
            "acquisitionAt": acquisition["acquisitionAt"],
            "acquisitionStatus": acquisition["status"],
            "requestContractId": acquisition["requestContractId"],
            "selectionPolicyId": collection["selectionPolicyId"],
            "samplingPoint": canonical_point(target["waterPoint"]),
            "provider": "copernicus",
            "sourceClass": "supplemental-local-current",
            "source": source,
            "productId": product_id,
            "datasetId": dataset_id,
            "datasetVersion": dataset_version,
            "gridPoint": grid,
            "distanceKm": round(distance, 5),
            "verticalLayer": f"depth:{depth:g}",
            "verticalLayerM": depth,
            "verticalLayerRankM": depth,
            "layerQuality": row["layerQuality"],
            "sharedLayerCount": row["sharedLayerCount"],
            "componentPair": "same-time-cell-layer",
            "interpolation": False,
            "vectorSemanticsVersion": 4,
            "uMps": round(float(row["uMps"]), 5),
            "vMps": round(float(row["vMps"]), 5),
        }
        entry["recordProjectionSha256"] = live_record_projection_sha256(entry)
        selected.append(entry)
    return selected, range_seal


def regional_entries(
    document: dict[str, Any],
    policy: dict[str, Any],
    targets: dict[str, dict[str, Any]],
    now: datetime,
) -> list[dict[str, Any]]:
    if not document:
        return []
    if document.get("scoreImpact") is not False or document.get("publicRuntime") is not False:
        raise RuntimeError("Regional raw cache lost its private/score-neutral contract")
    if policy.get("controlledLivePilotAllowed") is not True:
        raise RuntimeError("Regional policy does not permit the controlled live projection")
    policy_rows = list(policy.get("parts") or [])
    if len(policy_rows) != 8 or len({str(row.get("partId") or "") for row in policy_rows}) != 8:
        raise RuntimeError("Regional policy must contain exactly eight unique parts")
    selected: dict[tuple[str, str], tuple[datetime, dict[str, Any]]] = {}
    for policy_row in policy_rows:
        part_id = str(policy_row.get("partId") or "")
        target = targets.get(part_id)
        approved = canonical_point(policy_row.get("approvedSamplingPoint"))
        if target is None or not same_point(approved, target["waterPoint"]):
            raise RuntimeError(f"Regional proxy point requires renewed owner approval: {part_id}")
        anchor = (document.get("anchors") or {}).get(f"{REGIONAL_PREFIX}{part_id}") or {}
        if (
            not anchor.get("regionalProxyCandidate")
            or anchor.get("requiredCollection") != "dkss_lf"
            or not same_point(anchor.get("targetPoint"), approved)
            or not same_point(anchor.get("sourceWaterPoint"), approved)
            or anchor.get("partId") != part_id
            or anchor.get("parentZoneId") != target["parentZoneId"]
            or anchor.get("researchClass") != "owner-approved-regional-proxy"
            or anchor.get("sameConnectedWaterBody") != "Limfjorden"
            or finite(anchor.get("maximumDistanceKm")) != REGIONAL_MAX_KM
        ):
            continue
        for sample in anchor.get("samples") or []:
            if (
                sample.get("collection") != "dkss_lf"
                or not in_capture_window(sample.get("capturedAt"), now)
                or not capture_matches_valid_time(
                    sample.get("capturedAt"),
                    sample.get("validTime"),
                    REGIONAL_CAPTURE_VALID_TOLERANCE_HOURS,
                )
            ):
                continue
            grid = canonical_point(sample.get("gridPoint"))
            distance = finite(sample.get("distanceKm"))
            bottom = ((sample.get("layers") or {}).get("bottom") or {})
            u_value, v_value = finite(bottom.get("uMps")), finite(bottom.get("vMps"))
            layer_rank = finite(bottom.get("verticalLayerRankM"))
            try:
                valid_time = utc_iso(parse_time(sample.get("validTime")))
                captured_at = parse_time(sample.get("capturedAt"))
                model_run = parse_time(sample.get("modelRun"))
            except Exception:
                continue
            physical_distance = haversine_km(approved, grid) if grid is not None else math.inf
            if (
                grid is None
                or distance is None
                or distance <= COPERNICUS_MAX_KM
                or distance > REGIONAL_MAX_KM
                or physical_distance > REGIONAL_MAX_KM + 0.01
                or abs(physical_distance - distance) > 0.02
                or u_value is None
                or v_value is None
                or not bottom.get("verticalLayer")
                or layer_rank is None
                or model_run > parse_time(valid_time)
            ):
                continue
            entry = {
                "partId": part_id,
                "parentZoneId": target["parentZoneId"],
                "targetIdentityFingerprint": target_fingerprint([target]),
                "validTime": valid_time,
                "capturedAt": utc_iso(captured_at),
                "samplingPoint": approved,
                "provider": "dmi",
                "sourceClass": "owner-approved-regional-proxy",
                "source": "dmi-dkss-lf-regional-proxy",
                "collection": "dkss_lf",
                "modelRun": utc_iso(model_run),
                "gridPoint": grid,
                "distanceKm": round(distance, 5),
                "verticalLayer": bottom.get("verticalLayer"),
                "verticalLayerRankM": layer_rank,
                "layerQuality": "regional-proxy-bottom-layer",
                "componentPair": "same-time-cell-layer",
                "interpolation": False,
                "vectorSemanticsVersion": 4,
                "uMps": round(u_value, 5),
                "vMps": round(v_value, 5),
            }
            key = (part_id, valid_time)
            previous = selected.get(key)
            if previous is None or captured_at > previous[0]:
                selected[key] = (captured_at, entry)
    return [row[1] for row in selected.values()]


def write_json(path: Path, value: dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary = path.with_suffix(path.suffix + ".tmp")
    temporary.write_text(json.dumps(value, ensure_ascii=False, separators=(",", ":")) + "\n", "utf-8")
    temporary.replace(path)


def main() -> int:
    args = arguments()
    now = parse_time(args.at) if args.at else datetime.now(timezone.utc)
    if args.at and now != now.replace(minute=0, second=0, microsecond=0):
        raise RuntimeError("Live-pilot production reference must be an exact UTC hour")
    control = read_json(args.control)
    mode = str(control.get("mode") or "")
    control_schema = control.get("schemaVersion")
    if isinstance(control_schema, bool) or control_schema != 1 or mode not in ("controlled-live", "dmi-only-rollback"):
        raise RuntimeError("Live-pilot control must select controlled-live or dmi-only-rollback")
    if control.get("credentialsPublic") is not False or control.get("currentDataPublic") is not True:
        raise RuntimeError("Live-pilot publication contract is invalid")
    enabled = mode == "controlled-live"
    targets_list = targets_from_registry(args.targets)
    targets = {row["partId"]: row for row in targets_list}
    fingerprint = target_fingerprint(targets_list)
    dmi = read_json(args.dmi)
    dmi_current_input_sha256 = file_sha256(args.dmi)
    dmi_parts, dmi_times = valid_dmi_parts(dmi, targets)
    coverage_reference = now.replace(minute=0, second=0, microsecond=0)
    runtime_times = runtime_times_by_part(dmi, targets, coverage_reference)

    # The history remains available for live diagnosis in rollback mode.  Only
    # its use in score and arrows is disabled by ``enabled`` below.
    copernicus, copernicus_range_seal = copernicus_entries(
        read_json(args.copernicus, optional=True),
        targets,
        fingerprint,
        coverage_reference,
        dmi_current_input_sha256,
    )
    if enabled and copernicus_range_seal is None:
        raise RuntimeError(
            "Controlled-live current requires an exact COMPLETE Copernicus range seal, "
            "including when the sealed DMI-gap matrix is empty"
        )
    policy = read_json(args.policy)
    regional = regional_entries(read_json(args.regional, optional=True), policy, targets, now)
    entries = sorted(copernicus + regional, key=lambda row: (row["validTime"], row["partId"], row["sourceClass"]))

    historical_supplemental_parts = {row["partId"] for row in copernicus}
    historical_regional_parts = {row["partId"] for row in regional}
    coverage_reference_iso = utc_iso(coverage_reference)
    parts_with_reference_row = {
        part_id for part_id, times in runtime_times.items()
        if coverage_reference_iso in times
    }
    supplemental_parts = {
        row["partId"] for row in copernicus
        if row["partId"] in parts_with_reference_row
        and row["validTime"] == coverage_reference_iso
    }
    regional_latest_at_or_before: dict[str, datetime] = {}
    for row in regional:
        valid_time = parse_time(row["validTime"])
        part_id = row["partId"]
        if valid_time > coverage_reference or part_id not in parts_with_reference_row:
            continue
        previous = regional_latest_at_or_before.get(part_id)
        if previous is None or valid_time > previous:
            regional_latest_at_or_before[part_id] = valid_time
    regional_age_hours = {
        part_id: (coverage_reference - valid_time).total_seconds() / 3600
        for part_id, valid_time in regional_latest_at_or_before.items()
    }
    regional_parts = {
        part_id for part_id, age_hours in regional_age_hours.items()
        if 0 <= age_hours <= 3
    }
    regional_held_parts = {
        part_id for part_id in regional_parts
        if regional_age_hours[part_id] > 0
    }
    score_ready_dmi_parts = {
        part_id for part_id, times in dmi_times.items()
        if part_id in parts_with_reference_row and coverage_reference_iso in times
    }
    history_source_by_part: dict[str, str] = {}
    for part_id in targets:
        if part_id in dmi_parts:
            history_source_by_part[part_id] = "dmi-local"
        elif part_id in historical_supplemental_parts:
            history_source_by_part[part_id] = "copernicus-local"
        elif part_id in historical_regional_parts:
            history_source_by_part[part_id] = "dmi-regional-proxy"
    source_by_part: dict[str, str] = {}
    for part_id in targets:
        if part_id in score_ready_dmi_parts:
            source_by_part[part_id] = "dmi-local"
        elif part_id in supplemental_parts:
            source_by_part[part_id] = "copernicus-local"
        elif part_id in regional_parts:
            source_by_part[part_id] = "dmi-regional-proxy"
    counts = {source: sum(value == source for value in source_by_part.values()) for source in ("dmi-local", "copernicus-local", "dmi-regional-proxy")}
    selected_regional_held_parts = {
        part_id for part_id in regional_held_parts
        if source_by_part.get(part_id) == "dmi-regional-proxy"
    }
    history_counts = {source: sum(value == source for value in history_source_by_part.values()) for source in ("dmi-local", "copernicus-local", "dmi-regional-proxy")}
    missing = sorted(set(targets) - set(source_by_part))

    raw_projection = {
        "schemaVersion": 1,
        "generatedAt": utc_iso(now),
        "mode": mode,
        "enabled": enabled,
        "controlledLivePilot": True,
        "credentialsIncluded": False,
        "historyPublic": True,
        "retentionHours": RETENTION_HOURS,
        "vectorSemanticsVersion": 4,
        "targetFingerprint": fingerprint,
        "expectedPartCount": len(targets),
        "sourceOrder": ["dmi-local", "copernicus-baltic-nemo", "copernicus-nws-amm15", "dmi-dkss-lf-regional-proxy"],
        "copernicusRangeSeal": copernicus_range_seal,
        "entries": entries,
    }
    safe_report = {
        "schemaVersion": 1,
        "generatedAt": utc_iso(now),
        "mode": mode,
        "enabled": enabled,
        "controlledLivePilot": True,
        "rawVectorsIncluded": False,
        "currentHistoryPublic": True,
        "retentionHours": RETENTION_HOURS,
        "credentialsIncluded": False,
        "targetFingerprint": fingerprint,
        "expectedPartCount": len(targets),
        "coverageReferenceAt": utc_iso(coverage_reference),
        "verifiedPartCount": len(source_by_part),
        "exactVerifiedPartCount": len(source_by_part) - len(selected_regional_held_parts),
        "nativeCadenceHeldPartCount": len(selected_regional_held_parts),
        "nativeCadenceMaximumAgeHours": max(
            (regional_age_hours[part_id] for part_id in selected_regional_held_parts),
            default=0,
        ),
        "missingPartCount": len(missing),
        "partsBySelectedSource": counts,
        "retainedHistoryPartCount": len(history_source_by_part),
        "historyPartsBySelectedSource": history_counts,
        "supplementalRecordCount": len(entries),
        "copernicusRecordCount": len(copernicus),
        "copernicusCompleteRangeSealPresent": copernicus_range_seal is not None,
        "regionalProxyRecordCount": len(regional),
        "sourceOrder": raw_projection["sourceOrder"],
        "coverageRequirement": len(targets),
        "coverageRequirementMet": len(source_by_part) == len(targets),
        "missingPartIds": missing,
        "rollbackBehavior": control.get("rollbackBehavior"),
    }
    write_json(args.output, raw_projection)
    write_json(args.report, safe_report)
    print(
        f"Kontrolleret live-strømhistorik ({mode}): "
        f"{len(source_by_part)}/{len(targets)} scoreklare dele fra {utc_iso(coverage_reference)}; "
        f"DMI {counts['dmi-local']}, Copernicus {counts['copernicus-local']}, "
        f"regionalproxy {counts['dmi-regional-proxy']} "
        f"({len(selected_regional_held_parts)} med dokumenteret native-cadence-fastholdelse)."
    )
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except Exception as error:
        print(f"Live current pilot projection failed: {error}", file=os.sys.stderr)
        raise SystemExit(1)
