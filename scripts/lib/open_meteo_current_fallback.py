"""Private exact-hour Open-Meteo current fallback evidence.

Open-Meteo is the final operational current source.  Callers must prove the
exact residual after DMI, Copernicus and the owner-approved regional DMI path
before this module may accept records.  Coordinates and derived U/V remain in
the private cache; public projections contain only counts and hashes.

The separate donor bank retains original validated admissions independently of
later residuals. Its planning projection is not public or historical scoring
authorization; deployment still consumes the strict current v2 projection.
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


DONOR_BANK_CONTRACT_ID = "open-meteo-private-current-donor-bank-v1"
DONOR_BANK_MAX_BYTES = 256 * 1024 * 1024
DONOR_BANK_HISTORY_HOURS = 48
_ADMISSION_FIELDS = {
    "productionReferenceAt", "checkpointedAt", "documentSha256",
    "requiredPairsSha256", "copernicusSourceStageStatus",
    "copernicusSourceStageSha256", "copernicusBoundedProgressAccepted",
    "regionalEvidenceSha256",
}
_BANK_IDENTITY_FIELDS = {
    "schemaVersion", "kind", "contractId", "recordContractId", "source", "model",
    "targetRegistrySha256", "productionReferenceAt", "checkpointedAt",
    "retentionStartAt", "retentionEndAt", "historyAdmission", "publicRuntime",
}
_BANK_FIELDS = _BANK_IDENTITY_FIELDS | {
    "identitySha256", "admissions", "entries", "entryCount", "bankSha256",
    "entryManifest", "manifestSha256", "conflictMasks", "controlSha256",
}
_MANIFEST_FIELDS = {
    "entrySha256", "recordId", "partId", "validTime", "acquiredAt",
    "source", "admissionSha256",
}


def _bank_identity(targets: list[dict[str, Any]], reference_at: str,
                   checkpoint_at: str) -> dict[str, Any]:
    reference_text, reference = _exact_hour(reference_at, "OPEN_METEO_REFERENCE_INVALID")
    checkpoint_text, _ = _exact_instant(checkpoint_at, "OPEN_METEO_CHECKPOINT_TIME_INVALID")
    fingerprint = target_fingerprint(targets)
    if fingerprint is None or len({row.get("partId") for row in targets}) != len(targets):
        _fail("OPEN_METEO_TARGETS_INVALID")
    return {
        "schemaVersion": 1,
        "kind": "RAVRADAR_PRIVATE_OPEN_METEO_CURRENT_DONOR_BANK",
        "contractId": DONOR_BANK_CONTRACT_ID,
        "recordContractId": RECORD_CONTRACT_ID,
        "source": SOURCE, "model": MODEL,
        "targetRegistrySha256": fingerprint,
        "productionReferenceAt": reference_text,
        "checkpointedAt": checkpoint_text,
        "retentionStartAt": (reference - timedelta(hours=DONOR_BANK_HISTORY_HOURS)).strftime("%Y-%m-%dT%H:00:00Z"),
        "retentionEndAt": (reference + timedelta(hours=OPERATIONAL_END_OFFSET_HOURS)).strftime("%Y-%m-%dT%H:00:00Z"),
        "historyAdmission": "STORED_ONLY_NOT_AUTHORIZED",
        "publicRuntime": False,
    }


def _bank_entry(record: dict[str, Any], admission_sha: str) -> dict[str, Any]:
    entry = {"record": record, "admissionSha256": admission_sha}
    return {**entry, "entrySha256": canonical_sha256(entry)}


def _entry_membership(entry: dict[str, Any]) -> dict[str, str]:
    """Immutable original identity, independent of the mutable leaf payload."""
    record = entry["record"]
    return {"entrySha256": entry["entrySha256"], "recordId": record["recordId"],
            "partId": record["partId"], "validTime": record["validTime"],
            "acquiredAt": record["acquiredAt"], "source": record["source"],
            "admissionSha256": entry["admissionSha256"]}


def _membership_order(row: dict[str, str]) -> tuple[str, str, str]:
    return row["validTime"], row["partId"], row["recordId"]


def _bank_control(bank: dict[str, Any]) -> dict[str, Any]:
    # Payload damage cannot rewrite membership, its proof dependencies or a
    # persisted negative barrier. The whole-file seal remains strict on write.
    return {key: value for key, value in bank.items()
            if key not in {"entries", "bankSha256", "controlSha256"}}


def _validated_bank_admission(admission_sha: Any, admission: Any,
                              checkpoint: datetime) -> dict[str, Any]:
    if not valid_sha256(admission_sha) or not isinstance(admission, dict) or set(admission) != _ADMISSION_FIELDS or canonical_sha256(admission) != admission_sha:
        _fail("OPEN_METEO_DONOR_ADMISSION_INVALID")
    _, original_reference = _exact_hour(admission["productionReferenceAt"], "OPEN_METEO_DONOR_ADMISSION_INVALID")
    _, original_checkpoint = _exact_instant(admission["checkpointedAt"], "OPEN_METEO_DONOR_ADMISSION_INVALID")
    status = admission["copernicusSourceStageStatus"]
    if (
        original_checkpoint > checkpoint
        or status not in {"READY", "IN_PROGRESS", "NOT_APPLICABLE"}
        or admission["copernicusBoundedProgressAccepted"] is not (status == "IN_PROGRESS")
        or (status == "NOT_APPLICABLE" and admission["copernicusSourceStageSha256"] is not None)
        or (status != "NOT_APPLICABLE" and not valid_sha256(admission["copernicusSourceStageSha256"]))
        or any(not valid_sha256(admission[field]) for field in ("documentSha256", "requiredPairsSha256", "regionalEvidenceSha256"))
    ):
        _fail("OPEN_METEO_DONOR_ADMISSION_INVALID")
    return {"reference": original_reference, "checkpoint": original_checkpoint}


def _validated_bank_entry(entry: Any, admissions: dict[str, Any],
                          target_map: dict[str, Any], checkpoint: datetime) -> dict[str, Any]:
    if not isinstance(entry, dict) or set(entry) != {"record", "admissionSha256", "entrySha256"}:
        _fail("OPEN_METEO_DONOR_ENTRY_INVALID")
    if entry["entrySha256"] != canonical_sha256({key: entry[key] for key in ("record", "admissionSha256")}):
        _fail("OPEN_METEO_DONOR_ENTRY_INVALID")
    admission_sha = entry["admissionSha256"]
    if not isinstance(admission_sha, str):
        _fail("OPEN_METEO_DONOR_ADMISSION_INVALID")
    proof = _validated_bank_admission(admission_sha, admissions.get(admission_sha), checkpoint)
    record = entry["record"]
    if not isinstance(record, dict):
        _fail("OPEN_METEO_RECORD_INVALID")
    # Admission remains bound to its ORIGINAL window, proof and acquisition.
    # Bank retention is not authorization for historic score/state or closure.
    _validate_record(record, target_map, {(record.get("partId"), record.get("validTime"))}, proof["reference"], proof["checkpoint"])
    return entry


def _validated_membership(row: Any, bank: dict[str, Any], target_map: dict[str, Any],
                          proofs: dict[str, dict[str, Any]]) -> dict[str, str]:
    if not isinstance(row, dict) or set(row) != _MANIFEST_FIELDS:
        _fail("OPEN_METEO_DONOR_MANIFEST_INVALID")
    if (any(not valid_sha256(row[key]) for key in ("entrySha256", "recordId", "admissionSha256"))
        or not isinstance(row["partId"], str) or row["partId"] not in target_map
        or row["source"] != SOURCE):
        _fail("OPEN_METEO_DONOR_MANIFEST_INVALID")
    _, valid_time = _exact_hour(row["validTime"], "OPEN_METEO_DONOR_MANIFEST_INVALID")
    _, acquired = _exact_instant(row["acquiredAt"], "OPEN_METEO_DONOR_MANIFEST_INVALID")
    proof = proofs.get(row["admissionSha256"])
    if (proof is None or acquired > proof["checkpoint"]
        or not proof["reference"] <= valid_time <= proof["reference"] + timedelta(hours=OPERATIONAL_END_OFFSET_HOURS)
        or not bank["retentionStartAt"] <= row["validTime"] <= bank["retentionEndAt"]):
        _fail("OPEN_METEO_DONOR_MANIFEST_INVALID")
    return row


def _merge_conflict_masks(*groups: list[dict[str, str]]) -> dict[tuple[str, str], dict[str, str]]:
    """A mask retains its original membership; acquiredAt is its inclusive barrier."""
    masks: dict[tuple[str, str], dict[str, str]] = {}
    for group in groups:
        for row in group:
            key = row["partId"], row["validTime"]
            old = masks.get(key)
            instant = _exact_instant(row["acquiredAt"], "OPEN_METEO_DONOR_MASK_INVALID")[1]
            old_instant = _exact_instant(old["acquiredAt"], "OPEN_METEO_DONOR_MASK_INVALID")[1] if old else None
            if old is None or instant > old_instant or (instant == old_instant and row["entrySha256"] < old["entrySha256"]):
                masks[key] = dict(row)
    return masks


def _read_bank_entries(bank: Any, *, targets: list[dict[str, Any]],
                       strict: bool) -> tuple[list[dict[str, Any]], dict[str, Any], int, list[dict[str, str]]]:
    if not isinstance(bank, dict) or set(bank) != _BANK_FIELDS:
        _fail("OPEN_METEO_DONOR_BANK_INVALID")
    expected = _bank_identity(targets, bank["productionReferenceAt"], bank["checkpointedAt"])
    if any(bank[key] != value for key, value in expected.items()) or bank["identitySha256"] != canonical_sha256(expected):
        _fail("OPEN_METEO_DONOR_BANK_IDENTITY_INVALID")
    entries, admissions = bank["entries"], bank["admissions"]
    manifest, masks = bank["entryManifest"], bank["conflictMasks"]
    maximum_pairs = len(targets) * (DONOR_BANK_HISTORY_HOURS + OPERATIONAL_HOUR_COUNT)
    if (
        not isinstance(entries, list) or not isinstance(admissions, dict)
        or not isinstance(manifest, list) or not isinstance(masks, list)
        or len(entries) > 2 * maximum_pairs or len(manifest) > 2 * maximum_pairs
        or len(masks) > maximum_pairs or len(admissions) > 3 * maximum_pairs
        or not isinstance(bank["entryCount"], int) or isinstance(bank["entryCount"], bool)
        or bank["entryCount"] != len(manifest)
        or not valid_sha256(bank["bankSha256"])
        or bank["manifestSha256"] != canonical_sha256(manifest)
        or bank["controlSha256"] != canonical_sha256(_bank_control(bank))
    ):
        _fail("OPEN_METEO_DONOR_CONTROL_INVALID")
    target_map = {row["partId"]: row for row in targets}
    checkpoint = _exact_instant(bank["checkpointedAt"], "OPEN_METEO_CHECKPOINT_TIME_INVALID")[1]
    # Proof/control corruption is never leaf salvage, even if another record
    # happens to be malformed too. Validate the entire independent channel.
    proofs = {key: _validated_bank_admission(key, value, checkpoint) for key, value in admissions.items()}
    for row in [*manifest, *masks]:
        _validated_membership(row, bank, target_map, proofs)
    if (manifest != sorted(manifest, key=_membership_order)
        or masks != sorted(masks, key=_membership_order)
        or len({row["entrySha256"] for row in manifest}) != len(manifest)
        or len({row["recordId"] for row in manifest}) != len(manifest)
        or len({(row["partId"], row["validTime"]) for row in masks}) != len(masks)
        or {row["admissionSha256"] for row in [*manifest, *masks]} != set(admissions)):
        _fail("OPEN_METEO_DONOR_MANIFEST_INVALID")
    by_pair: dict[tuple[str, str], list[dict[str, str]]] = {}
    for row in manifest:
        by_pair.setdefault((row["partId"], row["validTime"]), []).append(row)
    mask_by_pair = _merge_conflict_masks(masks)
    for key, members in by_pair.items():
        instants = {_exact_instant(row["acquiredAt"], "OPEN_METEO_DONOR_MANIFEST_INVALID")[1] for row in members}
        if len(members) > 2 or len(instants) != 1:
            _fail("OPEN_METEO_DONOR_MANIFEST_INVALID")
        if len(members) > 1 and (key not in mask_by_pair
            or _exact_instant(mask_by_pair[key]["acquiredAt"], "OPEN_METEO_DONOR_MASK_INVALID")[1] < next(iter(instants))):
            _fail("OPEN_METEO_DONOR_MASK_INVALID")
    membership_by_id = {row["entrySha256"]: row for row in manifest}
    payloads_by_id: dict[str, list[Any]] = {}
    unknown_count = 0
    for entry in entries:
        identity = entry.get("entrySha256") if isinstance(entry, dict) else None
        if not isinstance(identity, str) or identity not in membership_by_id:
            unknown_count += 1
        else:
            payloads_by_id.setdefault(identity, []).append(entry)
    accepted, damaged = [], []
    for original in manifest:
        try:
            payloads = payloads_by_id.get(original["entrySha256"], [])
            if len(payloads) != 1:
                _fail("OPEN_METEO_DONOR_ENTRY_MEMBERSHIP_INVALID")
            validated = _validated_bank_entry(payloads[0], admissions, target_map, checkpoint)
            if _entry_membership(validated) != original:
                _fail("OPEN_METEO_DONOR_ENTRY_MEMBERSHIP_INVALID")
            accepted.append(validated)
        except (OpenMeteoCurrentFallbackError, TypeError, ValueError):
            if strict:
                _fail("OPEN_METEO_DONOR_ENTRY_INVALID")
            # Never obtain this pair/time/barrier from the rejected payload.
            damaged.append(original)
    try:
        intact_seal = len(entries) == len(manifest) and bank["bankSha256"] == canonical_sha256({key: value for key, value in bank.items() if key != "bankSha256"})
    except (TypeError, ValueError):
        intact_seal = False
    if (strict and (unknown_count or not intact_seal)) or (not intact_seal and not damaged):
        _fail("OPEN_METEO_DONOR_BANK_INTEGRITY_UNEXPLAINED")
    # Unknown payloads can only be discarded locally when missing/invalid
    # original members independently identify every affected donor identity.
    # Unexplained extra payloads without such original damage fail closed.
    if unknown_count and not damaged:
        _fail("OPEN_METEO_DONOR_BANK_INTEGRITY_UNEXPLAINED")
    merged_masks = _merge_conflict_masks(masks, damaged)
    return accepted, admissions, len(damaged), sorted(merged_masks.values(), key=_membership_order)


def build_donor_bank(*, targets: list[dict[str, Any]], entries: list[dict[str, Any]],
                     admissions: dict[str, Any], production_reference_at: str,
                     checkpointed_at: str) -> dict[str, Any]:
    checkpoint = _exact_instant(checkpointed_at, "OPEN_METEO_CHECKPOINT_TIME_INVALID")[1]
    target_map = {row["partId"]: row for row in targets}
    for entry in entries:
        _validated_bank_entry(entry, admissions, target_map, checkpoint)
    return _build_validated_donor_bank(targets=targets, entries=entries, admissions=admissions,
                                      production_reference_at=production_reference_at, checkpointed_at=checkpointed_at)


def _build_validated_donor_bank(*, targets: list[dict[str, Any]], entries: list[dict[str, Any]],
                               admissions: dict[str, Any], production_reference_at: str,
                               checkpointed_at: str,
                               conflict_masks: list[dict[str, str]] | None = None) -> dict[str, Any]:
    """Seal already validated leaves without revalidating the whole bank per batch."""
    identity = _bank_identity(targets, production_reference_at, checkpointed_at)
    masks = _merge_conflict_masks([
        row for row in (conflict_masks or [])
        if identity["retentionStartAt"] <= row["validTime"] <= identity["retentionEndAt"]
    ])
    by_pair: dict[tuple[str, str], dict[str, dict[str, Any]]] = {}
    for entry in entries:
        record = entry["record"]
        if not identity["retentionStartAt"] <= record["validTime"] <= identity["retentionEndAt"]:
            continue
        group = by_pair.setdefault((record["partId"], record["validTime"]), {})
        old = group.get(record["recordId"])
        # Keep the earliest original admission when a v2 projection reuses it.
        if old is None or (admissions[entry["admissionSha256"]]["checkpointedAt"], entry["admissionSha256"]) < (admissions[old["admissionSha256"]]["checkpointedAt"], old["admissionSha256"]):
            group[record["recordId"]] = entry
    selected = []
    for key, group in by_pair.items():
        newest = max(_exact_instant(item["record"]["acquiredAt"], "OPEN_METEO_RECORD_INVALID")[1] for item in group.values())
        candidates = [item for item in group.values() if _exact_instant(item["record"]["acquiredAt"], "OPEN_METEO_RECORD_INVALID")[1] == newest]
        candidates.sort(key=lambda item: item["record"]["recordId"])
        if len(candidates) > 1:
            masks[key] = _merge_conflict_masks(
                [masks[key]] if key in masks else [],
                [_entry_membership(candidates[0])],
            )[key]
        elif key in masks and newest > _exact_instant(masks[key]["acquiredAt"], "OPEN_METEO_DONOR_MASK_INVALID")[1]:
            # A complete original admission and one strictly newer record are
            # required; same-time/older legacy records cannot heal the barrier.
            del masks[key]
        selected.extend(candidates[:2])
    selected.sort(key=lambda item: (item["record"]["validTime"], item["record"]["partId"], item["record"]["recordId"]))
    if len(selected) > 2 * len(targets) * (DONOR_BANK_HISTORY_HOURS + OPERATIONAL_HOUR_COUNT):
        _fail("OPEN_METEO_DONOR_BANK_INVALID")
    manifest = [_entry_membership(item) for item in selected]
    persisted_masks = sorted(masks.values(), key=_membership_order)
    used = {item["admissionSha256"] for item in [*manifest, *persisted_masks]}
    bank = {
        **identity, "identitySha256": canonical_sha256(identity),
        "admissions": {key: admissions[key] for key in sorted(used)},
        "entries": selected, "entryCount": len(selected),
        "entryManifest": manifest, "manifestSha256": canonical_sha256(manifest),
        "conflictMasks": persisted_masks,
    }
    bank["controlSha256"] = canonical_sha256(_bank_control(bank))
    bank["bankSha256"] = canonical_sha256(bank)
    return bank


def validate_donor_bank(bank: Any, *, targets: list[dict[str, Any]]) -> dict[str, Any]:
    _read_bank_entries(bank, targets=targets, strict=True)
    return bank


def merge_donor_bank(bank: Any, legacy_documents: list[dict[str, Any]], *,
                     targets: list[dict[str, Any]], production_reference_at: str,
                     checkpointed_at: str) -> tuple[dict[str, Any], dict[str, int | bool]]:
    """Import at original v2 proofs, independently of today's CP stage/residual.

    Local damage is scoped only by the independently intact original manifest.
    A v2 document without such a manifest requires its complete original seal.
    """
    identity = _bank_identity(targets, production_reference_at, checkpointed_at)
    checkpoint = _exact_instant(checkpointed_at, "OPEN_METEO_CHECKPOINT_TIME_INVALID")[1]
    entries: list[dict[str, Any]] = []
    admissions: dict[str, Any] = {}
    dropped, salvaged = 0, False
    masks: list[dict[str, str]] = []
    legacy_suppressed = False
    if bank is not None:
        entries, admissions, dropped, masks = _read_bank_entries(bank, targets=targets, strict=False)
        admissions = dict(admissions)
        if bank["productionReferenceAt"] > production_reference_at or _exact_instant(bank["checkpointedAt"], "OPEN_METEO_CHECKPOINT_TIME_INVALID")[1] > checkpoint:
            _fail("OPEN_METEO_DONOR_BANK_TIME_REGRESSION")
        salvaged = dropped > 0
        if salvaged:
            # The pre-DMI planner also calls this API directly. A damaged
            # bank pair must not be resurrected from its older v2 projection.
            legacy_documents = []
            legacy_suppressed = True
    target_map = {row["partId"]: row for row in targets}
    for document in legacy_documents:
        donor = validate_checkpoint_document(document, targets=targets)
        admission = {key: donor[key] for key in _ADMISSION_FIELDS}
        admission_sha = canonical_sha256(admission)
        admissions[admission_sha] = admission
        if len(donor["records"]) > 2 * len(targets) * OPERATIONAL_HOUR_COUNT:
            _fail("OPEN_METEO_DONOR_BANK_INVALID")
        for record in donor["records"]:
            entry = _bank_entry(record, admission_sha)
            _validated_bank_entry(entry, admissions, target_map, checkpoint)
            entries.append(entry)
    rebuilt = _build_validated_donor_bank(targets=targets, entries=entries, admissions=admissions,
                              production_reference_at=identity["productionReferenceAt"], checkpointed_at=checkpointed_at,
                              conflict_masks=masks)
    return rebuilt, {"salvaged": salvaged or dropped > 0, "droppedRecordCount": dropped,
                     "droppedPairCount": 0, "ignoredRecordCount": 0,
                     "legacySuppressed": legacy_suppressed,
                     "donorRecordCount": rebuilt["entryCount"],
                     "maskedPairCount": len(rebuilt["conflictMasks"])}


def select_donor_records(bank: Any, *, targets: list[dict[str, Any]],
                         required_pairs: list[dict[str, str]], production_reference_at: str,
                         checkpointed_at: str) -> list[dict[str, Any]]:
    """Project ONLY caller's current pairs; never authorize bank history/public data."""
    validate_donor_bank(bank, targets=targets)
    _, reference = _exact_hour(production_reference_at, "OPEN_METEO_REFERENCE_INVALID")
    _, checkpoint = _exact_instant(checkpointed_at, "OPEN_METEO_CHECKPOINT_TIME_INVALID")
    if _exact_instant(bank["checkpointedAt"], "OPEN_METEO_CHECKPOINT_TIME_INVALID")[1] > checkpoint:
        _fail("OPEN_METEO_DONOR_BANK_TIME_REGRESSION")
    pairs = _canonical_pairs(required_pairs, "OPEN_METEO_REQUIRED_PAIRS_INVALID")
    target_map = {row["partId"]: row for row in targets}
    required = {(row["partId"], row["validTime"]) for row in pairs}
    end = (reference + timedelta(hours=OPERATIONAL_END_OFFSET_HOURS)).strftime("%Y-%m-%dT%H:00:00Z")
    if any(row["partId"] not in target_map or not production_reference_at <= row["validTime"] <= end for row in pairs):
        _fail("OPEN_METEO_REQUIRED_PAIRS_OUTSIDE_OPERATIONAL_RANGE")
    masks = _merge_conflict_masks(bank["conflictMasks"])
    candidates = [entry["record"] for entry in bank["entries"]
                  if (entry["record"]["partId"], entry["record"]["validTime"]) in required
                  and ((entry["record"]["partId"], entry["record"]["validTime"]) not in masks
                       or _exact_instant(entry["record"]["acquiredAt"], "OPEN_METEO_RECORD_INVALID")[1]
                       > _exact_instant(masks[(entry["record"]["partId"], entry["record"]["validTime"])]["acquiredAt"], "OPEN_METEO_DONOR_MASK_INVALID")[1])]
    for record in candidates:
        _validate_record(record, target_map, required, reference, checkpoint)
    return merge_records(candidates)[0]


__all__ = [
    "DONOR_BANK_CONTRACT_ID", "DONOR_BANK_MAX_BYTES", "build_donor_bank",
    "merge_donor_bank", "select_donor_records", "validate_donor_bank",
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
