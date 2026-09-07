"""Private exact-hour Open-Meteo current fallback evidence.

Open-Meteo is the final operational current source.  Callers must prove the
exact residual after DMI, Copernicus and the owner-approved regional DMI path
before this module may accept records.  Coordinates and derived U/V remain in
the private cache; public projections contain only counts and hashes.
"""
from __future__ import annotations

from datetime import datetime, timedelta, timezone
import math
from typing import Any

from .copernicus_current import canonical_sha256, required_pairs_sha256, valid_sha256
from .copernicus_target_identity import target_fingerprint
from .dmi_native_provenance import canonical_time


DOCUMENT_SCHEMA_VERSION = 2
RECORD_SCHEMA_VERSION = 1
# Kept as the public document-schema alias for existing imports. Record
# identity deliberately remains on v1 so a checkpoint rebase never rewrites a
# record or its acquiredAt timestamp.
SCHEMA_VERSION = DOCUMENT_SCHEMA_VERSION
KIND = "RAVRADAR_PRIVATE_OPEN_METEO_CURRENT_FALLBACK"
CONTRACT_ID = "open-meteo-current-exact-residual-v2"
SAFE_CONTRACT_ID = "open-meteo-current-exact-residual-safe-v2"
RECORD_CONTRACT_ID = "open-meteo-current-derived-uv-record-v1"
RECORD_REF_CONTRACT_ID = "open-meteo-current-record-ref-v1"
LIVE_RECORD_PROJECTION_CONTRACT_ID = "open-meteo-live-current-record-fixed-decimal-v1"
REQUEST_CONTRACT_ID = "open-meteo-marine-exact-residual-multilocation-v1"
SELECTION_POLICY_ID = "explicit-meteofrance-currents-sea-cell-v1"
SOURCE = "open-meteo-meteofrance-currents"
MODEL = "meteofrance_currents"
PHYSICAL_SCOPE = "eulerian-waves-and-tides-combined-surface-current"
SCORE_INPUT_POLICY_ID = "combined-current-single-channel-no-wave-or-tide-reprojection-v1"
VECTOR_DERIVATION = "u=speed*sin(toward_direction);v=speed*cos(toward_direction)"
OPERATIONAL_HOUR_COUNT = 118
OPERATIONAL_END_OFFSET_HOURS = 117
MAXIMUM_DISTANCE_KM = 15.0


PRIVATE_FIELDS = {
    "schemaVersion", "kind", "contractId", "status", "source", "model",
    "requestContractId", "selectionPolicyId", "physicalScope",
    "scoreInputPolicyId", "vectorDerivation", "productionReferenceAt",
    "operationalRangeEndAt",
    "operationalHourCount", "targetRegistrySha256", "requiredPairCount",
    "requiredPairsSha256", "recordCount", "recordRefsSha256",
    "recordsSha256", "records", "missingPairCount", "missingPairsSha256",
    "missingPairs", "checkpointedAt", "oldestRecordAcquiredAt",
    "newestRecordAcquiredAt", "maximumDistanceKm",
    "calibrationEligible", "coordinatesIncluded", "rawVectorsIncluded",
    "publicRuntime", "copernicusSourceStageStatus",
    "copernicusSourceStageSha256", "copernicusBoundedProgressAccepted",
    "regionalEvidenceSha256", "documentSha256",
}
SAFE_FIELDS = {
    "schemaVersion", "contractId", "status", "source", "model",
    "requestContractId", "selectionPolicyId", "physicalScope", "scoreInputPolicyId",
    "vectorDerivation", "productionReferenceAt", "operationalRangeEndAt",
    "operationalHourCount", "targetRegistrySha256", "requiredPairCount",
    "requiredPairsSha256", "recordCount", "recordRefsSha256",
    "recordsSha256", "missingPairCount", "missingPairsSha256", "checkpointedAt",
    "oldestRecordAcquiredAt", "newestRecordAcquiredAt",
    "maximumDistanceKm", "calibrationEligible", "coordinatesIncluded",
    "rawVectorsIncluded", "partIdsIncluded", "pairRefsIncluded",
    "publicRuntime", "copernicusSourceStageStatus",
    "copernicusSourceStageSha256", "copernicusBoundedProgressAccepted",
    "regionalEvidenceSha256", "documentSha256", "safeProjectionSha256",
}
RECORD_FIELDS = {
    "schemaVersion", "contractId", "partId", "validTime", "acquiredAt",
    "source", "model", "requestContractId", "selectionPolicyId",
    "physicalScope", "scoreInputPolicyId", "vectorDerivation", "samplingPoint", "gridPoint",
    "distanceKm", "speedMps", "towardDirectionDeg", "uMps", "vMps",
    "sourceResponseSha256", "interpolation", "calibrationEligible",
    "recordId",
}


class OpenMeteoCurrentFallbackError(ValueError):
    def __init__(self, code: str) -> None:
        self.code = code
        super().__init__(code)


def _fail(code: str) -> None:
    raise OpenMeteoCurrentFallbackError(code)


def _finite(value: Any) -> float | None:
    if isinstance(value, bool) or not isinstance(value, (int, float)):
        return None
    number = float(value)
    return number if math.isfinite(number) else None


def _point(value: Any) -> list[float] | None:
    if not isinstance(value, list) or len(value) != 2:
        return None
    longitude, latitude = _finite(value[0]), _finite(value[1])
    if longitude is None or latitude is None:
        return None
    if not -180 <= longitude <= 180 or not -90 <= latitude <= 90:
        return None
    return [longitude, latitude]


def _exact_hour(value: Any, code: str) -> tuple[str, datetime]:
    normalized = canonical_time(value)
    if normalized is None:
        _fail(code)
    try:
        parsed = datetime.fromisoformat(normalized.replace("Z", "+00:00"))
    except (TypeError, ValueError):
        _fail(code)
    parsed = parsed.astimezone(timezone.utc)
    if parsed.minute or parsed.second or parsed.microsecond:
        _fail(code)
    text = parsed.strftime("%Y-%m-%dT%H:00:00Z")
    if value != text:
        _fail(code)
    return text, parsed


def _exact_instant(value: Any, code: str) -> tuple[str, datetime]:
    normalized = canonical_time(value)
    if normalized is None or normalized != value:
        _fail(code)
    try:
        parsed = datetime.fromisoformat(normalized.replace("Z", "+00:00"))
    except (TypeError, ValueError):
        _fail(code)
    return normalized, parsed.astimezone(timezone.utc)


def _canonical_pairs(value: Any, code: str) -> list[dict[str, str]]:
    if not isinstance(value, list):
        _fail(code)
    result: list[dict[str, str]] = []
    for row in value:
        if not isinstance(row, dict) or set(row) != {"partId", "validTime"}:
            _fail(code)
        part_id = str(row.get("partId") or "").strip()
        valid_time, _ = _exact_hour(row.get("validTime"), code)
        if not part_id or row.get("partId") != part_id:
            _fail(code)
        result.append({"partId": part_id, "validTime": valid_time})
    canonical = sorted(result, key=lambda row: (row["validTime"], row["partId"]))
    if result != canonical or len({(row["partId"], row["validTime"]) for row in result}) != len(result):
        _fail(code)
    return result


def _haversine_km(first: list[float], second: list[float]) -> float:
    lon1, lat1, lon2, lat2 = map(math.radians, (*first, *second))
    dlat, dlon = lat2 - lat1, lon2 - lon1
    term = math.sin(dlat / 2) ** 2 + math.cos(lat1) * math.cos(lat2) * math.sin(dlon / 2) ** 2
    return 6371.0088 * 2 * math.atan2(math.sqrt(term), math.sqrt(max(0.0, 1 - term)))


def record_ref(record: dict[str, Any]) -> dict[str, str]:
    return {
        "partId": record["partId"],
        "validTime": record["validTime"],
        "recordId": record["recordId"],
        "source": SOURCE,
    }


def record_ref_sha256(ref: dict[str, str]) -> str:
    return canonical_sha256({"contractId": RECORD_REF_CONTRACT_ID, "recordRef": ref})


def build_record(*, part_id: str, valid_time: str, acquired_at: str,
                 sampling_point: list[float], grid_point: list[float],
                 speed_mps: float, toward_direction_deg: float,
                 source_response_sha256: str) -> dict[str, Any]:
    valid_time, _ = _exact_hour(valid_time, "OPEN_METEO_RECORD_TIME_INVALID")
    acquired = canonical_time(acquired_at)
    if acquired is None or acquired != acquired_at:
        _fail("OPEN_METEO_ACQUISITION_TIME_INVALID")
    sampling = _point(sampling_point)
    grid = _point(grid_point)
    speed = _finite(speed_mps)
    direction = _finite(toward_direction_deg)
    if (not part_id or sampling is None or grid is None or speed is None or speed < 0
            or direction is None or not 0 <= direction <= 360
            or not valid_sha256(source_response_sha256)):
        _fail("OPEN_METEO_RECORD_INVALID")
    direction = direction % 360
    radians = math.radians(direction)
    u_value = round(speed * math.sin(radians), 5)
    v_value = round(speed * math.cos(radians), 5)
    identity = {
        "schemaVersion": RECORD_SCHEMA_VERSION,
        "contractId": RECORD_CONTRACT_ID,
        "partId": part_id,
        "validTime": valid_time,
        "acquiredAt": acquired_at,
        "source": SOURCE,
        "model": MODEL,
        "requestContractId": REQUEST_CONTRACT_ID,
        "selectionPolicyId": SELECTION_POLICY_ID,
        "physicalScope": PHYSICAL_SCOPE,
        "scoreInputPolicyId": SCORE_INPUT_POLICY_ID,
        "vectorDerivation": VECTOR_DERIVATION,
        "samplingPoint": sampling,
        "gridPoint": grid,
        "distanceKm": round(_haversine_km(sampling, grid), 5),
        "speedMps": round(speed, 5),
        "towardDirectionDeg": round(direction, 5),
        "uMps": u_value,
        "vMps": v_value,
        "sourceResponseSha256": source_response_sha256,
        "interpolation": False,
        "calibrationEligible": False,
    }
    return {**identity, "recordId": canonical_sha256(identity)}


def _validate_record(record: Any, targets: dict[str, dict[str, Any]],
                      required: set[tuple[str, str]], reference: datetime,
                      checkpointed_at: datetime) -> dict[str, Any]:
    if not isinstance(record, dict) or set(record) != RECORD_FIELDS:
        _fail("OPEN_METEO_RECORD_INVALID")
    part_id = str(record.get("partId") or "").strip()
    valid_time, valid_dt = _exact_hour(record.get("validTime"), "OPEN_METEO_RECORD_INVALID")
    target = targets.get(part_id)
    sampling = _point(record.get("samplingPoint"))
    grid = _point(record.get("gridPoint"))
    distance = _finite(record.get("distanceKm"))
    speed = _finite(record.get("speedMps"))
    direction = _finite(record.get("towardDirectionDeg"))
    u_value = _finite(record.get("uMps"))
    v_value = _finite(record.get("vMps"))
    acquired_text = canonical_time(record.get("acquiredAt"))
    try:
        acquired = datetime.fromisoformat(acquired_text.replace("Z", "+00:00")) \
            if acquired_text == record.get("acquiredAt") else None
    except (TypeError, ValueError):
        acquired = None
    if (
        record.get("schemaVersion") != RECORD_SCHEMA_VERSION
        or record.get("contractId") != RECORD_CONTRACT_ID
        or not part_id or record.get("partId") != part_id
        or target is None or (part_id, valid_time) not in required
        or valid_dt < reference
        or valid_dt > reference + timedelta(hours=OPERATIONAL_END_OFFSET_HOURS)
        or acquired is None
        or acquired > checkpointed_at
        or record.get("source") != SOURCE or record.get("model") != MODEL
        or record.get("requestContractId") != REQUEST_CONTRACT_ID
        or record.get("selectionPolicyId") != SELECTION_POLICY_ID
        or record.get("physicalScope") != PHYSICAL_SCOPE
        or record.get("scoreInputPolicyId") != SCORE_INPUT_POLICY_ID
        or record.get("vectorDerivation") != VECTOR_DERIVATION
        or record.get("interpolation") is not False
        or record.get("calibrationEligible") is not False
        or sampling is None or sampling != _point(target.get("waterPoint"))
        or grid is None or distance is None or distance < 0
        or distance > MAXIMUM_DISTANCE_KM
        or abs(_haversine_km(sampling, grid) - distance) > 0.02
        or speed is None or speed < 0 or direction is None or not 0 <= direction < 360
        or u_value is None or v_value is None
        or abs(u_value - round(speed * math.sin(math.radians(direction)), 5)) > 1e-5
        or abs(v_value - round(speed * math.cos(math.radians(direction)), 5)) > 1e-5
        or not valid_sha256(record.get("sourceResponseSha256"))
        or not valid_sha256(record.get("recordId"))
        or canonical_sha256({key: value for key, value in record.items() if key != "recordId"})
            != record.get("recordId")
    ):
        _fail("OPEN_METEO_RECORD_INVALID")
    return record


def build_document(*, targets: list[dict[str, Any]], required_pairs: list[dict[str, str]],
                   records: list[dict[str, Any]], checkpointed_at: str,
                   production_reference_at: str,
                   copernicus_source_stage_status: str,
                   copernicus_source_stage_sha256: str | None,
                   copernicus_bounded_progress_accepted: bool,
                   regional_evidence_sha256: str) -> dict[str, Any]:
    reference_text, reference = _exact_hour(
        production_reference_at, "OPEN_METEO_REFERENCE_INVALID"
    )
    checkpoint_text, checkpoint = _exact_instant(
        checkpointed_at, "OPEN_METEO_CHECKPOINT_TIME_INVALID"
    )
    progress_accepted = copernicus_source_stage_status == "IN_PROGRESS"
    if (
        copernicus_source_stage_status
            not in {"READY", "IN_PROGRESS", "NOT_APPLICABLE"}
        or not valid_sha256(regional_evidence_sha256)
        or copernicus_bounded_progress_accepted is not progress_accepted
        or (
            copernicus_source_stage_status == "NOT_APPLICABLE"
            and copernicus_source_stage_sha256 is not None
        )
        or (
            copernicus_source_stage_status != "NOT_APPLICABLE"
            and not valid_sha256(copernicus_source_stage_sha256)
        )
    ):
        _fail("OPEN_METEO_UPSTREAM_DISPOSITION_INVALID")
    pairs = _canonical_pairs(required_pairs, "OPEN_METEO_REQUIRED_PAIRS_INVALID")
    if any(
        datetime.fromisoformat(row["validTime"].replace("Z", "+00:00")) < reference
        or datetime.fromisoformat(row["validTime"].replace("Z", "+00:00"))
            > reference + timedelta(hours=OPERATIONAL_END_OFFSET_HOURS)
        for row in pairs
    ):
        _fail("OPEN_METEO_REQUIRED_PAIRS_OUTSIDE_OPERATIONAL_RANGE")
    target_map = {row.get("partId"): row for row in targets if isinstance(row, dict)}
    if len(target_map) != len(targets) or target_fingerprint(targets) is None:
        _fail("OPEN_METEO_TARGETS_INVALID")
    required = {(row["partId"], row["validTime"]) for row in pairs}
    validated = [
        _validate_record(row, target_map, required, reference, checkpoint)
        for row in records
    ]
    validated.sort(key=lambda row: (row["validTime"], row["partId"]))
    if len({(row["partId"], row["validTime"]) for row in validated}) != len(validated):
        _fail("OPEN_METEO_RECORD_DUPLICATE")
    present = {(row["partId"], row["validTime"]) for row in validated}
    missing = [row for row in pairs if (row["partId"], row["validTime"]) not in present]
    refs = [record_ref(row) for row in validated]
    acquisition_times = sorted(row["acquiredAt"] for row in validated)
    document = {
        "schemaVersion": SCHEMA_VERSION,
        "kind": KIND,
        "contractId": CONTRACT_ID,
        "status": "COMPLETE" if not missing else "INCOMPLETE",
        "source": SOURCE,
        "model": MODEL,
        "requestContractId": REQUEST_CONTRACT_ID,
        "selectionPolicyId": SELECTION_POLICY_ID,
        "physicalScope": PHYSICAL_SCOPE,
        "scoreInputPolicyId": SCORE_INPUT_POLICY_ID,
        "vectorDerivation": VECTOR_DERIVATION,
        "productionReferenceAt": reference_text,
        "operationalRangeEndAt": (reference + timedelta(hours=OPERATIONAL_END_OFFSET_HOURS)).strftime("%Y-%m-%dT%H:00:00Z"),
        "operationalHourCount": OPERATIONAL_HOUR_COUNT,
        "targetRegistrySha256": target_fingerprint(targets),
        "requiredPairCount": len(pairs),
        "requiredPairsSha256": required_pairs_sha256(pairs),
        "recordCount": len(validated),
        "recordRefsSha256": canonical_sha256(refs),
        "recordsSha256": canonical_sha256(validated),
        "records": validated,
        "missingPairCount": len(missing),
        "missingPairsSha256": required_pairs_sha256(missing),
        "missingPairs": missing,
        "checkpointedAt": checkpoint_text,
        "oldestRecordAcquiredAt": acquisition_times[0] if acquisition_times else None,
        "newestRecordAcquiredAt": acquisition_times[-1] if acquisition_times else None,
        "maximumDistanceKm": MAXIMUM_DISTANCE_KM,
        "calibrationEligible": False,
        "coordinatesIncluded": True,
        "rawVectorsIncluded": True,
        "publicRuntime": False,
        "copernicusSourceStageStatus": copernicus_source_stage_status,
        "copernicusSourceStageSha256": copernicus_source_stage_sha256,
        "copernicusBoundedProgressAccepted": copernicus_bounded_progress_accepted,
        "regionalEvidenceSha256": regional_evidence_sha256,
    }
    document["documentSha256"] = canonical_sha256(document)
    return document


def validate_document(document: Any, *, targets: list[dict[str, Any]],
                      required_pairs: list[dict[str, str]],
                      production_reference_at: str,
                      copernicus_source_stage_status: str,
                      copernicus_source_stage_sha256: str | None,
                      copernicus_bounded_progress_accepted: bool,
                      regional_evidence_sha256: str,
                      require_complete: bool = True) -> dict[str, Any]:
    if not isinstance(document, dict) or set(document) != PRIVATE_FIELDS:
        _fail("OPEN_METEO_DOCUMENT_INVALID")
    rebuilt = build_document(
        targets=targets,
        required_pairs=required_pairs,
        records=document.get("records"),
        checkpointed_at=document.get("checkpointedAt"),
        production_reference_at=production_reference_at,
        copernicus_source_stage_status=copernicus_source_stage_status,
        copernicus_source_stage_sha256=copernicus_source_stage_sha256,
        copernicus_bounded_progress_accepted=copernicus_bounded_progress_accepted,
        regional_evidence_sha256=regional_evidence_sha256,
    )
    if rebuilt != document:
        _fail("OPEN_METEO_DOCUMENT_INVALID")
    if require_complete and (document["status"] != "COMPLETE" or document["missingPairCount"] != 0):
        _fail("OPEN_METEO_RESIDUAL_INCOMPLETE")
    return document


def checkpoint_required_pairs(document: Any) -> list[dict[str, str]]:
    """Reconstruct the exact residual sealed by a private v2 checkpoint."""
    if not isinstance(document, dict) or set(document) != PRIVATE_FIELDS:
        _fail("OPEN_METEO_DOCUMENT_INVALID")
    records = document.get("records")
    if not isinstance(records, list):
        _fail("OPEN_METEO_DOCUMENT_INVALID")
    present_pairs = []
    for record in records:
        if not isinstance(record, dict):
            _fail("OPEN_METEO_DOCUMENT_INVALID")
        present_pairs.append({
            "partId": record.get("partId"),
            "validTime": record.get("validTime"),
        })
    pairs = sorted(
        [
            *present_pairs,
            *_canonical_pairs(
                document.get("missingPairs"), "OPEN_METEO_DOCUMENT_INVALID"
            ),
        ],
        key=lambda row: (
            str(row.get("validTime") or ""),
            str(row.get("partId") or ""),
        ),
    )
    return _canonical_pairs(pairs, "OPEN_METEO_DOCUMENT_INVALID")


def validate_checkpoint_document(document: Any, *,
                                 targets: list[dict[str, Any]]) -> dict[str, Any]:
    """Validate a v2 checkpoint against its own sealed residual and bindings."""
    pairs = checkpoint_required_pairs(document)
    return validate_document(
        document,
        targets=targets,
        required_pairs=pairs,
        production_reference_at=document.get("productionReferenceAt"),
        copernicus_source_stage_status=document.get(
            "copernicusSourceStageStatus"
        ),
        copernicus_source_stage_sha256=document.get(
            "copernicusSourceStageSha256"
        ),
        copernicus_bounded_progress_accepted=document.get(
            "copernicusBoundedProgressAccepted"
        ),
        regional_evidence_sha256=document.get("regionalEvidenceSha256"),
        require_complete=False,
    )


def _validate_reusable_envelope(
    document: Any,
    *,
    targets: list[dict[str, Any]],
) -> dict[str, Any]:
    """Fail closed on cache identity/registry corruption, not leaf damage."""
    if not isinstance(document, dict) or set(document) != PRIVATE_FIELDS:
        _fail("OPEN_METEO_DOCUMENT_INVALID")
    if (
        document.get("schemaVersion") != DOCUMENT_SCHEMA_VERSION
        or document.get("kind") != KIND
        or document.get("contractId") != CONTRACT_ID
        or document.get("status") not in {"COMPLETE", "INCOMPLETE"}
        or document.get("source") != SOURCE
        or document.get("model") != MODEL
        or document.get("requestContractId") != REQUEST_CONTRACT_ID
        or document.get("selectionPolicyId") != SELECTION_POLICY_ID
        or document.get("physicalScope") != PHYSICAL_SCOPE
        or document.get("scoreInputPolicyId") != SCORE_INPUT_POLICY_ID
        or document.get("vectorDerivation") != VECTOR_DERIVATION
        or document.get("operationalHourCount") != OPERATIONAL_HOUR_COUNT
        or document.get("maximumDistanceKm") != MAXIMUM_DISTANCE_KM
        or document.get("calibrationEligible") is not False
        or document.get("coordinatesIncluded") is not True
        or document.get("rawVectorsIncluded") is not True
        or document.get("publicRuntime") is not False
        or not isinstance(document.get("records"), list)
        or not isinstance(document.get("missingPairs"), list)
    ):
        _fail("OPEN_METEO_DOCUMENT_IDENTITY_INVALID")

    _reference_text, reference = _exact_hour(
        document.get("productionReferenceAt"), "OPEN_METEO_DOCUMENT_IDENTITY_INVALID",
    )
    end_text, _end = _exact_hour(
        document.get("operationalRangeEndAt"), "OPEN_METEO_DOCUMENT_IDENTITY_INVALID",
    )
    if end_text != (
        reference + timedelta(hours=OPERATIONAL_END_OFFSET_HOURS)
    ).strftime("%Y-%m-%dT%H:00:00Z"):
        _fail("OPEN_METEO_DOCUMENT_IDENTITY_INVALID")
    _checkpoint_text, checkpoint = _exact_instant(
        document.get("checkpointedAt"), "OPEN_METEO_DOCUMENT_IDENTITY_INVALID",
    )

    target_map = {
        row.get("partId"): row for row in targets if isinstance(row, dict)
    }
    fingerprint = target_fingerprint(targets)
    if len(target_map) != len(targets) or fingerprint is None:
        _fail("OPEN_METEO_TARGETS_INVALID")
    if document.get("targetRegistrySha256") != fingerprint:
        _fail("OPEN_METEO_TARGET_BINDING_INVALID")

    for field in ("requiredPairCount", "recordCount", "missingPairCount"):
        value = document.get(field)
        if isinstance(value, bool) or not isinstance(value, int) or value < 0:
            _fail("OPEN_METEO_DOCUMENT_IDENTITY_INVALID")
    for field in (
        "requiredPairsSha256", "recordRefsSha256", "recordsSha256",
        "missingPairsSha256", "regionalEvidenceSha256", "documentSha256",
    ):
        if not valid_sha256(document.get(field)):
            _fail("OPEN_METEO_DOCUMENT_IDENTITY_INVALID")

    stage_status = document.get("copernicusSourceStageStatus")
    stage_sha = document.get("copernicusSourceStageSha256")
    bounded_progress = document.get("copernicusBoundedProgressAccepted")
    if (
        stage_status not in {"READY", "IN_PROGRESS", "NOT_APPLICABLE"}
        or bounded_progress is not (stage_status == "IN_PROGRESS")
        or (stage_status == "NOT_APPLICABLE" and stage_sha is not None)
        or (stage_status != "NOT_APPLICABLE" and not valid_sha256(stage_sha))
    ):
        _fail("OPEN_METEO_DOCUMENT_IDENTITY_INVALID")

    for field in ("oldestRecordAcquiredAt", "newestRecordAcquiredAt"):
        value = document.get(field)
        if value is not None:
            _text, instant = _exact_instant(
                value, "OPEN_METEO_DOCUMENT_IDENTITY_INVALID",
            )
            if instant > checkpoint:
                _fail("OPEN_METEO_DOCUMENT_IDENTITY_INVALID")
    return document


def reusable_records_with_salvage(
    document: Any,
    *,
    targets: list[dict[str, Any]],
    required_pairs: list[dict[str, str]],
    production_reference_at: str,
    checkpointed_at: str,
) -> tuple[list[dict[str, Any]], dict[str, int | bool]]:
    """Select independently valid donor records and expose damaged rows as gaps."""
    strict_checkpoint_valid = True
    try:
        validate_checkpoint_document(document, targets=targets)
    except OpenMeteoCurrentFallbackError:
        strict_checkpoint_valid = False
    donor = _validate_reusable_envelope(document, targets=targets)
    _reference_text, reference = _exact_hour(
        production_reference_at, "OPEN_METEO_REFERENCE_INVALID"
    )
    _checkpoint_text, checkpoint = _exact_instant(
        checkpointed_at, "OPEN_METEO_CHECKPOINT_TIME_INVALID"
    )
    pairs = _canonical_pairs(required_pairs, "OPEN_METEO_REQUIRED_PAIRS_INVALID")
    target_map = {
        row.get("partId"): row for row in targets if isinstance(row, dict)
    }
    fingerprint = target_fingerprint(targets)
    if len(target_map) != len(targets) or fingerprint is None:
        _fail("OPEN_METEO_TARGETS_INVALID")
    if donor.get("targetRegistrySha256") != fingerprint:
        _fail("OPEN_METEO_TARGET_BINDING_INVALID")
    if any(
        row["partId"] not in target_map
        or datetime.fromisoformat(row["validTime"].replace("Z", "+00:00")) < reference
        or datetime.fromisoformat(row["validTime"].replace("Z", "+00:00"))
            > reference + timedelta(hours=OPERATIONAL_END_OFFSET_HOURS)
        for row in pairs
    ):
        _fail("OPEN_METEO_REQUIRED_PAIRS_OUTSIDE_OPERATIONAL_RANGE")
    required = {(row["partId"], row["validTime"]) for row in pairs}
    candidates_by_pair: dict[tuple[str, str], list[dict[str, Any]]] = {}
    dropped_record_count = 0
    dropped_pairs: set[tuple[str, str]] = set()
    ignored_record_count = 0
    for record in donor["records"]:
        try:
            if not isinstance(record, dict):
                raise OpenMeteoCurrentFallbackError("OPEN_METEO_RECORD_INVALID")
            part_id = str(record.get("partId") or "").strip()
            valid_time, _valid_dt = _exact_hour(
                record.get("validTime"), "OPEN_METEO_RECORD_INVALID",
            )
            key = (part_id, valid_time)
        except OpenMeteoCurrentFallbackError:
            dropped_record_count += 1
            continue
        if key not in required:
            ignored_record_count += 1
            continue
        try:
            validated = _validate_record(
                record, target_map, required, reference, checkpoint,
            )
        except OpenMeteoCurrentFallbackError:
            dropped_record_count += 1
            dropped_pairs.add(key)
            continue
        candidates_by_pair.setdefault(key, []).append(validated)

    selected = []
    for key, candidates in candidates_by_pair.items():
        by_id = {row["recordId"]: row for row in candidates}
        if len(by_id) != 1:
            dropped_record_count += len(candidates)
            dropped_pairs.add(key)
            continue
        selected.append(next(iter(by_id.values())))
    selected.sort(key=lambda row: (row["validTime"], row["partId"]))
    retained_pairs = {(row["partId"], row["validTime"]) for row in selected}
    dropped_pairs.difference_update(retained_pairs)
    return selected, {
        "salvaged": not strict_checkpoint_valid or dropped_record_count > 0,
        "droppedRecordCount": dropped_record_count,
        "droppedPairCount": len(dropped_pairs),
        "ignoredRecordCount": ignored_record_count,
    }


def reusable_records(document: Any, *, targets: list[dict[str, Any]],
                     required_pairs: list[dict[str, str]],
                     production_reference_at: str,
                     checkpointed_at: str) -> list[dict[str, Any]]:
    """Select immutable donor records eligible for a newly computed residual."""
    selected, _salvage = reusable_records_with_salvage(
        document,
        targets=targets,
        required_pairs=required_pairs,
        production_reference_at=production_reference_at,
        checkpointed_at=checkpointed_at,
    )
    return selected


def merge_records(*groups: list[dict[str, Any]]) -> tuple[list[dict[str, Any]], int]:
    """Choose the newest immutable record per pair without hiding revisions."""
    by_pair: dict[tuple[str, str], list[dict[str, Any]]] = {}
    for group in groups:
        if not isinstance(group, list):
            _fail("OPEN_METEO_RECORD_INVALID")
        for record in group:
            if not isinstance(record, dict):
                _fail("OPEN_METEO_RECORD_INVALID")
            key = (
                str(record.get("partId") or ""),
                str(record.get("validTime") or ""),
            )
            by_pair.setdefault(key, []).append(record)
    selected = []
    conflicts = 0
    for candidates in by_pair.values():
        candidates_with_instants = [
            (
                _exact_instant(
                    row.get("acquiredAt"), "OPEN_METEO_RECORD_INVALID",
                )[1],
                row,
            )
            for row in candidates
        ]
        newest = max(instant for instant, _row in candidates_with_instants)
        newest_candidates = [
            row for instant, row in candidates_with_instants
            if instant == newest
        ]
        by_id = {
            str(row.get("recordId") or ""): row for row in newest_candidates
        }
        if len(by_id) != 1:
            conflicts += 1
            continue
        selected.append(next(iter(by_id.values())))
    selected.sort(key=lambda row: (row["validTime"], row["partId"]))
    return selected, conflicts


def live_record_projection_payload(entry: dict[str, Any]) -> dict[str, Any]:
    if entry.get("recordProjectionContractId") != LIVE_RECORD_PROJECTION_CONTRACT_ID:
        _fail("OPEN_METEO_LIVE_RECORD_INVALID")
    sampling = _point(entry.get("samplingPoint"))
    grid = _point(entry.get("gridPoint"))
    if sampling is None or grid is None:
        _fail("OPEN_METEO_LIVE_RECORD_INVALID")

    def fixed(value: Any, places: int) -> str:
        number = _finite(value)
        if number is None:
            _fail("OPEN_METEO_LIVE_RECORD_INVALID")
        rounded = round(number, places)
        if not math.isclose(number, rounded, rel_tol=0, abs_tol=10 ** (-(places + 3))):
            _fail("OPEN_METEO_LIVE_RECORD_INVALID")
        if rounded == 0:
            rounded = 0.0
        return f"{rounded:.{places}f}"

    return {
        "contractId": LIVE_RECORD_PROJECTION_CONTRACT_ID,
        "recordId": str(entry.get("recordId") or ""),
        "collectionId": str(entry.get("collectionId") or ""),
        "productionReferenceAt": str(entry.get("productionReferenceAt") or ""),
        "partId": str(entry.get("partId") or ""),
        "parentZoneId": str(entry.get("parentZoneId") or ""),
        "targetIdentityFingerprint": str(entry.get("targetIdentityFingerprint") or ""),
        "validTime": str(entry.get("validTime") or ""),
        "acquisitionAt": str(entry.get("acquisitionAt") or ""),
        "requestContractId": str(entry.get("requestContractId") or ""),
        "selectionPolicyId": str(entry.get("selectionPolicyId") or ""),
        "provider": str(entry.get("provider") or ""),
        "sourceClass": str(entry.get("sourceClass") or ""),
        "source": str(entry.get("source") or ""),
        "model": str(entry.get("model") or ""),
        "physicalScope": str(entry.get("physicalScope") or ""),
        "scoreInputPolicyId": str(entry.get("scoreInputPolicyId") or ""),
        "calibrationEligible": entry.get("calibrationEligible"),
        "samplingPoint": [fixed(sampling[0], 7), fixed(sampling[1], 7)],
        "gridPoint": [fixed(grid[0], 7), fixed(grid[1], 7)],
        "distanceKm": fixed(entry.get("distanceKm"), 5),
        "verticalLayer": str(entry.get("verticalLayer") or ""),
        "layerQuality": str(entry.get("layerQuality") or ""),
        "componentPair": str(entry.get("componentPair") or ""),
        "interpolation": entry.get("interpolation"),
        "vectorSemanticsVersion": str(entry.get("vectorSemanticsVersion") or ""),
        "uMps": fixed(entry.get("uMps"), 5),
        "vMps": fixed(entry.get("vMps"), 5),
    }


def live_record_projection_sha256(entry: dict[str, Any]) -> str:
    return canonical_sha256(live_record_projection_payload(entry))


def safe_projection(document: dict[str, Any]) -> dict[str, Any]:
    if not isinstance(document, dict) or set(document) != PRIVATE_FIELDS:
        _fail("OPEN_METEO_DOCUMENT_INVALID")
    safe = {
        key: document[key]
        for key in SAFE_FIELDS
        if key not in {
            "contractId", "coordinatesIncluded", "rawVectorsIncluded",
            "partIdsIncluded", "pairRefsIncluded", "safeProjectionSha256",
        }
    }
    safe.update({
        "contractId": SAFE_CONTRACT_ID,
        "coordinatesIncluded": False,
        "rawVectorsIncluded": False,
        "partIdsIncluded": False,
        "pairRefsIncluded": False,
    })
    safe["safeProjectionSha256"] = canonical_sha256(safe)
    if set(safe) != SAFE_FIELDS:
        _fail("OPEN_METEO_SAFE_PROJECTION_INVALID")
    return safe


__all__ = [
    "CONTRACT_ID", "DOCUMENT_SCHEMA_VERSION", "LIVE_RECORD_PROJECTION_CONTRACT_ID",
    "MAXIMUM_DISTANCE_KM", "MODEL",
    "OpenMeteoCurrentFallbackError", "PHYSICAL_SCOPE", "SCORE_INPUT_POLICY_ID",
    "RECORD_CONTRACT_ID", "RECORD_REF_CONTRACT_ID", "RECORD_SCHEMA_VERSION",
    "REQUEST_CONTRACT_ID", "SAFE_CONTRACT_ID", "SCHEMA_VERSION",
    "SELECTION_POLICY_ID", "SOURCE", "build_document", "build_record",
    "checkpoint_required_pairs",
    "live_record_projection_sha256", "merge_records", "record_ref", "record_ref_sha256",
    "reusable_records", "reusable_records_with_salvage", "safe_projection",
    "validate_checkpoint_document",
    "validate_document",
]
