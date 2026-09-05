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


SCHEMA_VERSION = 1
KIND = "RAVRADAR_PRIVATE_OPEN_METEO_CURRENT_FALLBACK"
CONTRACT_ID = "open-meteo-current-exact-residual-v1"
SAFE_CONTRACT_ID = "open-meteo-current-exact-residual-safe-v1"
RECORD_CONTRACT_ID = "open-meteo-current-derived-uv-record-v1"
RECORD_REF_CONTRACT_ID = "open-meteo-current-record-ref-v1"
REQUEST_CONTRACT_ID = "open-meteo-marine-exact-residual-multilocation-v1"
SELECTION_POLICY_ID = "explicit-meteofrance-currents-sea-cell-v1"
SOURCE = "open-meteo-meteofrance-currents"
MODEL = "meteofrance_currents"
PHYSICAL_SCOPE = "eulerian-waves-and-tides-combined-surface-current"
VECTOR_DERIVATION = "u=speed*sin(toward_direction);v=speed*cos(toward_direction)"
OPERATIONAL_HOUR_COUNT = 118
OPERATIONAL_END_OFFSET_HOURS = 117
MAXIMUM_DISTANCE_KM = 15.0
MAXIMUM_ACQUISITION_AGE_HOURS = 4


PRIVATE_FIELDS = {
    "schemaVersion", "kind", "contractId", "status", "source", "model",
    "requestContractId", "selectionPolicyId", "physicalScope",
    "vectorDerivation", "productionReferenceAt", "operationalRangeEndAt",
    "operationalHourCount", "targetRegistrySha256", "requiredPairCount",
    "requiredPairsSha256", "recordCount", "recordRefsSha256",
    "recordsSha256", "records", "missingPairCount", "missingPairsSha256",
    "missingPairs", "acquiredAt", "maximumDistanceKm",
    "calibrationEligible", "coordinatesIncluded", "rawVectorsIncluded",
    "publicRuntime", "documentSha256",
}
SAFE_FIELDS = {
    "schemaVersion", "contractId", "status", "source", "model",
    "requestContractId", "selectionPolicyId", "physicalScope",
    "vectorDerivation", "productionReferenceAt", "operationalRangeEndAt",
    "operationalHourCount", "targetRegistrySha256", "requiredPairCount",
    "requiredPairsSha256", "recordCount", "recordRefsSha256",
    "recordsSha256", "missingPairCount", "missingPairsSha256", "acquiredAt",
    "maximumDistanceKm", "calibrationEligible", "coordinatesIncluded",
    "rawVectorsIncluded", "partIdsIncluded", "pairRefsIncluded",
    "publicRuntime", "documentSha256", "safeProjectionSha256",
}
RECORD_FIELDS = {
    "schemaVersion", "contractId", "partId", "validTime", "acquiredAt",
    "source", "model", "requestContractId", "selectionPolicyId",
    "physicalScope", "vectorDerivation", "samplingPoint", "gridPoint",
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
        "schemaVersion": SCHEMA_VERSION,
        "contractId": RECORD_CONTRACT_ID,
        "partId": part_id,
        "validTime": valid_time,
        "acquiredAt": acquired_at,
        "source": SOURCE,
        "model": MODEL,
        "requestContractId": REQUEST_CONTRACT_ID,
        "selectionPolicyId": SELECTION_POLICY_ID,
        "physicalScope": PHYSICAL_SCOPE,
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
                     acquired_at: str) -> dict[str, Any]:
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
    if (
        target is None or (part_id, valid_time) not in required
        or valid_dt < reference
        or valid_dt > reference + timedelta(hours=OPERATIONAL_END_OFFSET_HOURS)
        or acquired_text != acquired_at
        or record.get("source") != SOURCE or record.get("model") != MODEL
        or record.get("requestContractId") != REQUEST_CONTRACT_ID
        or record.get("selectionPolicyId") != SELECTION_POLICY_ID
        or record.get("physicalScope") != PHYSICAL_SCOPE
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
                   records: list[dict[str, Any]], acquired_at: str,
                   production_reference_at: str) -> dict[str, Any]:
    reference_text, reference = _exact_hour(
        production_reference_at, "OPEN_METEO_REFERENCE_INVALID"
    )
    acquired = canonical_time(acquired_at)
    if acquired is None or acquired != acquired_at:
        _fail("OPEN_METEO_ACQUISITION_TIME_INVALID")
    if abs((datetime.fromisoformat(acquired.replace("Z", "+00:00")) - reference).total_seconds()) > MAXIMUM_ACQUISITION_AGE_HOURS * 3600:
        _fail("OPEN_METEO_ACQUISITION_STALE")
    pairs = _canonical_pairs(required_pairs, "OPEN_METEO_REQUIRED_PAIRS_INVALID")
    target_map = {row.get("partId"): row for row in targets if isinstance(row, dict)}
    if len(target_map) != len(targets) or target_fingerprint(targets) is None:
        _fail("OPEN_METEO_TARGETS_INVALID")
    required = {(row["partId"], row["validTime"]) for row in pairs}
    validated = [_validate_record(row, target_map, required, reference, acquired_at) for row in records]
    validated.sort(key=lambda row: (row["validTime"], row["partId"]))
    if len({(row["partId"], row["validTime"]) for row in validated}) != len(validated):
        _fail("OPEN_METEO_RECORD_DUPLICATE")
    present = {(row["partId"], row["validTime"]) for row in validated}
    missing = [row for row in pairs if (row["partId"], row["validTime"]) not in present]
    refs = [record_ref(row) for row in validated]
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
        "acquiredAt": acquired_at,
        "maximumDistanceKm": MAXIMUM_DISTANCE_KM,
        "calibrationEligible": False,
        "coordinatesIncluded": True,
        "rawVectorsIncluded": True,
        "publicRuntime": False,
    }
    document["documentSha256"] = canonical_sha256(document)
    return document


def validate_document(document: Any, *, targets: list[dict[str, Any]],
                      required_pairs: list[dict[str, str]],
                      production_reference_at: str,
                      require_complete: bool = True) -> dict[str, Any]:
    if not isinstance(document, dict) or set(document) != PRIVATE_FIELDS:
        _fail("OPEN_METEO_DOCUMENT_INVALID")
    rebuilt = build_document(
        targets=targets,
        required_pairs=required_pairs,
        records=document.get("records"),
        acquired_at=document.get("acquiredAt"),
        production_reference_at=production_reference_at,
    )
    if rebuilt != document:
        _fail("OPEN_METEO_DOCUMENT_INVALID")
    if require_complete and (document["status"] != "COMPLETE" or document["missingPairCount"] != 0):
        _fail("OPEN_METEO_RESIDUAL_INCOMPLETE")
    return document


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
    "CONTRACT_ID", "MAXIMUM_DISTANCE_KM", "MODEL", "OpenMeteoCurrentFallbackError",
    "RECORD_REF_CONTRACT_ID", "REQUEST_CONTRACT_ID", "SAFE_CONTRACT_ID",
    "SELECTION_POLICY_ID", "SOURCE", "build_document", "build_record",
    "record_ref", "record_ref_sha256", "safe_projection", "validate_document",
]
