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
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any

from lib.copernicus_current import (
    COPERNICUS_SOURCE_CONTRACTS,
    DMI_VERIFIER_CONTRACT_ID,
    FUTURE_ACQUISITION_FRESHNESS_HOURS,
    OPERATIONAL_SEAL_CONTRACT_ID,
    PUBLIC_END_OFFSET_HOURS,
    RECORD_PROJECTION_CONTRACT_ID,
    SELECTION_POLICY_ID,
    canonical_sha256,
    file_sha256,
    live_record_projection_sha256,
    validate_shadow,
)
from lib.copernicus_target_identity import target_fingerprint, targets_from_registry
from lib.current_operational_closure import (
    CONTRACT_ID as CLOSURE_CONTRACT_ID,
    COPERNICUS_AMM15,
    COPERNICUS_ADVISORY_PAST_MODEL_FIELD,
    COPERNICUS_BALTIC,
    REGIONAL_DMI_DERIVED_HOLD,
    REGIONAL_DMI_NATIVE,
    safe_current_operational_closure,
    validate_current_operational_closure,
)
from lib.dmi_native_provenance import (
    canonical_verified_part_current_attestation,
    complete_native_source_for_hour,
    processed_source_assets_from_current_operational_ledger,
)
from lib.regional_current_operational import VECTOR_COMMITMENT_CONTRACT_ID


ROOT = Path(__file__).resolve().parents[1]
DEFAULT_TARGETS = ROOT / "data/live/coastal-parts-v2.json"
DEFAULT_DMI = ROOT / "data/live/dmi-bulk-cache.json"
DEFAULT_REGISTRY = ROOT / ".cache/copernicus-current-targets.json"
DEFAULT_COPERNICUS = ROOT / ".cache/copernicus-current-shadow.json"
DEFAULT_SOURCE_STAGE = ROOT / ".cache/copernicus-current-source-stage.json"
DEFAULT_CLOSURE = ROOT / ".cache/current-operational-closure.json"
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
    parser.add_argument("--registry", type=Path, default=DEFAULT_REGISTRY)
    parser.add_argument("--copernicus", type=Path, default=DEFAULT_COPERNICUS)
    parser.add_argument("--source-stage", type=Path, default=DEFAULT_SOURCE_STAGE)
    parser.add_argument("--closure", type=Path, default=DEFAULT_CLOSURE)
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


def regional_sample_time_valid(sample: dict[str, Any], reference: datetime) -> bool:
    try:
        captured = parse_time(sample.get("capturedAt"))
        valid = parse_time(sample.get("validTime"))
        model_run = parse_time(sample.get("modelRun"))
    except Exception:
        return False
    if model_run > valid or not in_capture_window(sample.get("capturedAt"), reference):
        return False
    if valid >= reference:
        return (
            valid <= reference + timedelta(hours=PUBLIC_END_OFFSET_HOURS)
            and abs((captured - reference).total_seconds())
                <= FUTURE_ACQUISITION_FRESHNESS_HOURS * 3600
        )
    return abs((valid - captured).total_seconds()) <= REGIONAL_CAPTURE_VALID_TOLERANCE_HOURS * 3600


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
    assignments: list[dict[str, Any]],
    closure_proof: dict[str, Any],
) -> tuple[list[dict[str, Any]], dict[str, Any] | None, list[dict[str, Any]]]:
    try:
        cache = validate_shadow(document, targets, require_collection=False)
    except (TypeError, ValueError):
        raise RuntimeError("COPERNICUS_CLOSURE_CACHE_INVALID") from None
    reference_text = closure_proof["productionReferenceAt"]
    collections = [
        row for row in cache["collections"]
        if row.get("status") in {"COMPLETE", "OPERATIONAL_COMPLETE"}
        and row.get("productionReferenceAt") == reference_text
    ]
    range_seal = None
    collection = None
    if len(collections) == 1:
        collection = collections[0]
        operational_contract = collection.get("status") == "OPERATIONAL_COMPLETE"
        seal_fields = ((
            "collectionId", "status", "sealContractId", "productionReferenceAt",
            "operationalRangeStartAt", "operationalRangeEndAt", "operationalHourCount",
            "advisoryHistoryStartAt", "advisoryHistoryEndAt", "advisoryHistoryHourCount",
            "targetRegistrySha256", "dmiCurrentInputSha256", "dmiVerifierContractId",
            "operationalRequiredPairsSha256", "operationalRequiredPairCount",
            "operationalRecordRefsSha256", "advisoryHistoryRequiredPairsSha256",
            "advisoryHistoryRequiredPairCount", "advisoryHistoryRecordRefsSha256",
            "advisoryHistoryAvailablePairCount", "advisoryHistoryMissingPairCount",
            "advisoryHistoryComplete", "selectionPolicyId", "sealedAt",
        ) if operational_contract else (
            "collectionId", "status", "productionReferenceAt", "rangeStartAt", "rangeEndAt",
            "coldBridgeHours", "publicHourCount", "targetRegistrySha256", "dmiCurrentInputSha256",
            "dmiVerifierContractId", "requiredPairsSha256", "requiredPairCount", "selectionPolicyId",
            "recordRefsSha256", "sealedAt",
        ))
        range_seal = {field: collection[field] for field in seal_fields}
    acquisition_by_id = {row["acquisitionId"]: row for row in cache["acquisitions"]}
    record_by_id = {row["recordId"]: row for row in cache["records"]}
    selected: list[dict[str, Any]] = []
    for assignment in assignments:
        row = record_by_id.get(assignment.get("recordId"))
        acquisition = acquisition_by_id.get(assignment.get("acquisitionId"))
        if (
            not isinstance(row, dict)
            or not isinstance(acquisition, dict)
            or row.get("acquisitionId") != assignment.get("acquisitionId")
            or row.get("partId") != assignment.get("partId")
            or row.get("validTime") != assignment.get("validTime")
            or acquisition.get("source") != assignment.get("source")
            or assignment.get("classification") not in {COPERNICUS_BALTIC, COPERNICUS_AMM15}
        ):
            raise RuntimeError("COPERNICUS_CLOSURE_RECORD_INVALID")
        part_id = row["partId"]
        target = targets.get(part_id)
        if target is None:
            raise RuntimeError("COPERNICUS_CLOSURE_RECORD_INVALID")
        source = acquisition["source"]
        product_id, dataset_id, dataset_version = COPERNICUS_SOURCE_CONTRACTS[source]
        grid = canonical_point(row["gridPoint"])
        distance = float(row["distanceKm"])
        depth = float(row["verticalLayerM"])
        entry = {
            "recordProjectionContractId": RECORD_PROJECTION_CONTRACT_ID,
            "recordId": row["recordId"],
            "acquisitionId": acquisition["acquisitionId"],
            "collectionId": closure_proof["closureId"],
            "productionReferenceAt": reference_text,
            "partId": part_id,
            "parentZoneId": target["parentZoneId"],
            "targetIdentityFingerprint": target_fingerprint([target]),
            "validTime": row["validTime"],
            "capturedAt": acquisition["acquisitionAt"],
            "acquisitionAt": acquisition["acquisitionAt"],
            "acquisitionStatus": acquisition["status"],
            "requestContractId": acquisition["requestContractId"],
            "selectionPolicyId": SELECTION_POLICY_ID,
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
            "closureContractId": CLOSURE_CONTRACT_ID,
            "closureId": closure_proof["closureId"],
            "closureAssignmentSha256": assignment["assignmentSha256"],
            "classification": assignment["classification"],
            "recordRefSha256": assignment["recordRefSha256"],
        }
        entry["recordProjectionSha256"] = live_record_projection_sha256(entry)
        selected.append(entry)
    advisory: list[dict[str, Any]] = []
    for assignment in closure_proof.get("advisoryHistoryAssignments") or []:
            row = record_by_id.get(assignment.get("recordId"))
            acquisition = acquisition_by_id.get(assignment.get("acquisitionId"))
            if (
                not isinstance(row, dict)
                or not isinstance(acquisition, dict)
                or row.get("partId") != assignment.get("partId")
                or row.get("validTime") != assignment.get("validTime")
                or row.get("acquisitionId") != assignment.get("acquisitionId")
                or acquisition.get("source") != assignment.get("source")
                or assignment.get("classification")
                    != COPERNICUS_ADVISORY_PAST_MODEL_FIELD
            ):
                raise RuntimeError("COPERNICUS_ADVISORY_RECORD_INVALID")
            target = targets.get(row["partId"])
            if target is None:
                raise RuntimeError("COPERNICUS_ADVISORY_RECORD_INVALID")
            source = acquisition["source"]
            product_id, dataset_id, dataset_version = COPERNICUS_SOURCE_CONTRACTS[source]
            depth = float(row["verticalLayerM"])
            entry = {
                "recordProjectionContractId": RECORD_PROJECTION_CONTRACT_ID,
                "recordId": row["recordId"],
                "acquisitionId": acquisition["acquisitionId"],
                "collectionId": closure_proof["closureId"],
                "productionReferenceAt": reference_text,
                "partId": row["partId"],
                "parentZoneId": target["parentZoneId"],
                "targetIdentityFingerprint": target_fingerprint([target]),
                "validTime": row["validTime"],
                "capturedAt": acquisition["acquisitionAt"],
                "acquisitionAt": acquisition["acquisitionAt"],
                "acquisitionStatus": acquisition["status"],
                "requestContractId": acquisition["requestContractId"],
                "selectionPolicyId": SELECTION_POLICY_ID,
                "samplingPoint": canonical_point(target["waterPoint"]),
                "provider": "copernicus",
                "sourceClass": "supplemental-local-current",
                "source": source,
                "productId": product_id,
                "datasetId": dataset_id,
                "datasetVersion": dataset_version,
                "gridPoint": canonical_point(row["gridPoint"]),
                "distanceKm": round(float(row["distanceKm"]), 5),
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
                "closureContractId": CLOSURE_CONTRACT_ID,
                "closureId": closure_proof["closureId"],
                "closureAssignmentSha256": assignment["assignmentSha256"],
                "classification": COPERNICUS_ADVISORY_PAST_MODEL_FIELD,
                "recordRefSha256": assignment["recordRefSha256"],
            }
            entry["recordProjectionSha256"] = live_record_projection_sha256(entry)
            advisory.append(entry)
    advisory.sort(key=lambda row: (row["validTime"], row["partId"]))
    return selected, range_seal, advisory


def regional_entries(
    document: dict[str, Any],
    targets: dict[str, dict[str, Any]],
    assignments: list[dict[str, Any]],
    closure_proof: dict[str, Any],
    now: datetime,
) -> list[dict[str, Any]]:
    if document.get("scoreImpact") is not False or document.get("publicRuntime") is not False:
        raise RuntimeError("REGIONAL_CLOSURE_CACHE_INVALID")
    anchors = document.get("anchors")
    if not isinstance(anchors, dict):
        raise RuntimeError("REGIONAL_CLOSURE_CACHE_INVALID")
    selected: list[dict[str, Any]] = []
    for assignment in assignments:
        classification = assignment.get("classification")
        if classification not in {REGIONAL_DMI_NATIVE, REGIONAL_DMI_DERIVED_HOLD}:
            raise RuntimeError("REGIONAL_CLOSURE_ASSIGNMENT_INVALID")
        part_id = assignment.get("partId")
        target = targets.get(part_id)
        anchor = anchors.get(f"{REGIONAL_PREFIX}{part_id}")
        if target is None or not isinstance(anchor, dict):
            raise RuntimeError("REGIONAL_CLOSURE_SAMPLE_INVALID")
        matches = [
            sample for sample in anchor.get("samples") or []
            if isinstance(sample, dict)
            and sample.get("collection") == "dkss_lf"
            and sample.get("validTime") == assignment.get("sourceValidTime")
            and sample.get("modelRun") == assignment.get("sourceModelRun")
            and sample.get("sourceAssetSha256") == assignment.get("sourceAssetSha256")
        ]
        if len(matches) != 1 or not regional_sample_time_valid(matches[0], now):
            raise RuntimeError("REGIONAL_CLOSURE_SAMPLE_INVALID")
        sample = matches[0]
        grid = canonical_point(sample.get("gridPoint"))
        distance = finite(sample.get("distanceKm"))
        bottom = ((sample.get("layers") or {}).get("bottom") or {})
        u_value, v_value = finite(bottom.get("uMps")), finite(bottom.get("vMps"))
        layer_rank = finite(bottom.get("verticalLayerRankM"))
        captured_at = utc_iso(parse_time(sample.get("capturedAt")))
        if (
            grid is None
            or distance is None
            or u_value is None
            or v_value is None
            or not isinstance(bottom.get("verticalLayer"), str)
            or not bottom.get("verticalLayer")
            or layer_rank is None
        ):
            raise RuntimeError("REGIONAL_CLOSURE_SAMPLE_INVALID")
        vector_commitment = canonical_sha256({
            "schemaVersion": 1,
            "contractId": VECTOR_COMMITMENT_CONTRACT_ID,
            "partId": part_id,
            "collection": "dkss_lf",
            "modelRun": assignment["sourceModelRun"],
            "validTime": assignment["sourceValidTime"],
            "sourceAssetSha256": assignment["sourceAssetSha256"],
            "verticalLayer": bottom["verticalLayer"],
            "verticalLayerRankM": f"{layer_rank:.3f}",
            "uMps": f"{u_value:.5f}",
            "vMps": f"{v_value:.5f}",
        })
        if vector_commitment != assignment.get("vectorCommitmentSha256"):
            raise RuntimeError("REGIONAL_CLOSURE_VECTOR_INVALID")
        entry = {
            "partId": part_id,
            "parentZoneId": target["parentZoneId"],
            "targetIdentityFingerprint": target_fingerprint([target]),
            "validTime": assignment["validTime"],
            "sourceValidTime": assignment["sourceValidTime"],
            "capturedAt": captured_at,
            "productionReferenceAt": closure_proof["productionReferenceAt"],
            "provider": "dmi",
            "sourceClass": "owner-approved-regional-proxy",
            "source": "dmi-dkss-lf-regional-proxy",
            "collection": "dkss_lf",
            "modelRun": assignment["sourceModelRun"],
            "closureContractId": CLOSURE_CONTRACT_ID,
            "closureId": closure_proof["closureId"],
            "closureAssignmentSha256": assignment["assignmentSha256"],
            "classification": classification,
            "sourceAssetSha256": assignment["sourceAssetSha256"],
            "sourceProofSha256": assignment["sourceProofSha256"],
            "vectorCommitmentSha256": assignment["vectorCommitmentSha256"],
        }
        if classification == REGIONAL_DMI_DERIVED_HOLD:
            entry.update({
                "holdAgeHours": assignment["holdAgeHours"],
                "stateOnly": True,
                "currentVectorAvailable": False,
                "arrowAvailable": False,
            })
        else:
            entry.update({
                "samplingPoint": canonical_point(target["waterPoint"]),
                "gridPoint": grid,
                "distanceKm": distance,
                "verticalLayer": bottom["verticalLayer"],
                "verticalLayerRankM": layer_rank,
                "layerQuality": "regional-proxy-bottom-layer",
                "componentPair": "same-time-cell-layer",
                "interpolation": False,
                "vectorSemanticsVersion": 4,
                "uMps": u_value,
                "vMps": v_value,
            })
        selected.append(entry)
    return selected


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
    _dmi_parts, dmi_times = valid_dmi_parts(dmi, targets)
    coverage_reference = now.replace(minute=0, second=0, microsecond=0)
    coverage_reference_iso = utc_iso(coverage_reference)
    closure_proof = None
    closure_safe = None
    copernicus: list[dict[str, Any]] = []
    advisory: list[dict[str, Any]] = []
    regional: list[dict[str, Any]] = []
    copernicus_range_seal = None
    if enabled:
        registry = read_json(args.registry)
        copernicus_cache = read_json(args.copernicus)
        source_stage = read_json(args.source_stage, optional=True)
        regional_cache = read_json(args.regional)
        policy = read_json(args.policy)
        candidate_closure = read_json(args.closure)
        ledger = ((dmi.get("diagnostics") or {}).get("currentOperationalLedger"))
        if not isinstance(ledger, dict):
            raise RuntimeError("DMI_LEDGER_MISSING")
        try:
            attestation = canonical_verified_part_current_attestation(
                dmi,
                targets_list,
                coverage_reference_iso,
                registry.get("operationalRangeEndAt"),
                processed_source_assets_from_current_operational_ledger(ledger),
            )
        except (TypeError, ValueError):
            raise RuntimeError("DMI_ATTESTATION_INVALID") from None
        closure_proof = validate_current_operational_closure(
            candidate_closure,
            targets=targets_list,
            dmi_ledger=ledger,
            dmi_attestation=attestation,
            dmi_current_input_sha256=dmi_current_input_sha256,
            copernicus_registry=registry,
            copernicus_shadow=copernicus_cache,
            copernicus_shadow_sha256=file_sha256(args.copernicus),
            copernicus_source_stage=source_stage or None,
            regional_shadow=regional_cache,
            regional_policy=policy,
            locked_reference=coverage_reference_iso,
        )
        closure_safe = safe_current_operational_closure(closure_proof)
        cop_assignments = [
            row for row in closure_proof["assignments"]
            if row["classification"] in {COPERNICUS_BALTIC, COPERNICUS_AMM15}
        ]
        regional_assignments = [
            row for row in closure_proof["assignments"]
            if row["classification"] in {REGIONAL_DMI_NATIVE, REGIONAL_DMI_DERIVED_HOLD}
        ]
        copernicus, copernicus_range_seal, advisory = copernicus_entries(
            copernicus_cache, targets, cop_assignments, closure_proof,
        )
        regional = regional_entries(
            regional_cache, targets, regional_assignments, closure_proof, coverage_reference,
        )
    entries = sorted(
        [*copernicus, *regional],
        key=lambda row: (row["validTime"], row["partId"]),
    )
    if enabled and (
        len(entries) != closure_proof["supplementalAssignmentCount"]
        or canonical_sha256([row["closureAssignmentSha256"] for row in entries])
            != closure_proof["supplementalAssignmentsSha256"]
        or len(advisory) != closure_proof["advisoryHistoryAssignmentCount"]
        or canonical_sha256([
            row["closureAssignmentSha256"] for row in advisory
        ]) != closure_proof["advisoryHistoryAssignmentsSha256"]
    ):
        raise RuntimeError("CLOSURE_ADAPTER_CARDINALITY_INVALID")

    reference_assignments = [
        row for row in (closure_proof or {}).get("assignments", [])
        if row["validTime"] == coverage_reference_iso
    ]
    score_ready_dmi_parts = {
        part_id for part_id, times in dmi_times.items()
        if coverage_reference_iso in times
    }
    selected_by_source = {
        "dmi-local": len(score_ready_dmi_parts) if not enabled else sum(
            row["classification"] == "DMI_VERIFIED" for row in reference_assignments
        ),
        "copernicus-local": sum(
            row["classification"] in {COPERNICUS_BALTIC, COPERNICUS_AMM15}
            for row in reference_assignments
        ),
        "dmi-regional-proxy": sum(
            row["classification"] in {REGIONAL_DMI_NATIVE, REGIONAL_DMI_DERIVED_HOLD}
            for row in reference_assignments
        ),
    }
    verified_part_count = sum(selected_by_source.values())
    held_at_reference = sum(
        row["classification"] == REGIONAL_DMI_DERIVED_HOLD
        for row in reference_assignments
    )

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
        "operationalClosure": closure_safe,
        "copernicusRangeSeal": copernicus_range_seal,
        "entries": entries,
        "advisoryEntries": advisory,
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
        "verifiedPartCount": verified_part_count,
        "exactVerifiedPartCount": verified_part_count - held_at_reference,
        "nativeCadenceHeldPartCount": held_at_reference,
        "nativeCadenceMaximumAgeHours": max(
            (row.get("holdAgeHours", 0) for row in reference_assignments), default=0,
        ),
        "missingPartCount": len(targets) - verified_part_count,
        "partsBySelectedSource": selected_by_source,
        "retainedHistoryPartCount": len({row["partId"] for row in entries}),
        "historyPartsBySelectedSource": selected_by_source,
        "supplementalRecordCount": len(entries),
        "copernicusRecordCount": len(copernicus),
        "copernicusAdvisoryRecordCount": len(advisory),
        "copernicusCompleteRangeSealPresent": copernicus_range_seal is not None,
        "regionalProxyRecordCount": len(regional),
        "operationalClosure": closure_safe,
        "sourceOrder": raw_projection["sourceOrder"],
        "coverageRequirement": len(targets),
        "coverageRequirementMet": verified_part_count == len(targets),
        "rollbackBehavior": control.get("rollbackBehavior"),
    }
    write_json(args.output, raw_projection)
    write_json(args.report, safe_report)
    print(
        f"Kontrolleret live-strømhistorik ({mode}): "
        f"{verified_part_count}/{len(targets)} scoreklare dele; "
        f"DMI {selected_by_source['dmi-local']}, "
        f"Copernicus {selected_by_source['copernicus-local']}, "
        f"regionalproxy {selected_by_source['dmi-regional-proxy']} "
        f"({held_at_reference} med closure-bundet native-cadence-fastholdelse)."
    )
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except Exception as error:
        print(f"Live current pilot projection failed: {error}", file=os.sys.stderr)
        raise SystemExit(1)
