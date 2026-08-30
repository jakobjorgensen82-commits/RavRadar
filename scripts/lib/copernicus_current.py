"""Pure selection and retention helpers for the private Copernicus current pilot.

The public RavRadar runtime must not import this module.  It deliberately keeps
the external source behind a separate, score-neutral workflow until live
availability and provenance have been verified over several model runs.
"""
from __future__ import annotations

import hashlib
import json
import math
import os
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any

try:
    import numpy as np
except ModuleNotFoundError:  # Credential-free cache checks use only stdlib paths.
    np = None

from .copernicus_target_identity import target_fingerprint as geometry_fingerprint


RETENTION_HOURS = 168
COLD_BRIDGE_HOURS = 48
PUBLIC_HOUR_COUNT = 118
PUBLIC_END_OFFSET_HOURS = PUBLIC_HOUR_COUNT - 1
LOCAL_MAX_DISTANCE_KM = 5.0
FUTURE_ACQUISITION_FRESHNESS_HOURS = 4
CACHE_SCHEMA_VERSION = 2
CACHE_KIND = "RAVRADAR_PRIVATE_COPERNICUS_CURRENT_RANGE_CACHE"
TARGET_REGISTRY_KIND = "RAVRADAR_PRIVATE_COPERNICUS_CURRENT_RANGE_TARGET_REGISTRY"
MATRIX_CONTRACT_ID = "exact-dmi-gap-matrix-minus48-plus117-v1"
REQUEST_CONTRACT_ID = "copernicus-current-multitime-bounded-spatial-shards-v1"
LEGACY_HISTORY_REQUEST_CONTRACT_ID = "copernicus-current-schema1-history-migration-v1"
SELECTION_POLICY_ID = "per-native-time-nearest-shared-uv-column-then-deepest-common-layer-v1"
RECORD_PROJECTION_CONTRACT_ID = "copernicus-live-current-record-fixed-decimal-v1"
DMI_VERIFIER_CONTRACT_ID = "dmi-native-current-provenance-v1"
COMPONENT_PAIR = "same-time-cell-layer"
HASH_PREFIX = "sha256:"

COPERNICUS_SOURCE_CONTRACTS = {
    "copernicus-baltic-nemo": (
        "BALTICSEA_ANALYSISFORECAST_PHY_003_006",
        "cmems_mod_bal_phy_anfc_PT1H-i",
        "202411",
    ),
    "copernicus-nws-amm15": (
        "NWSHELF_ANALYSISFORECAST_PHY_004_013",
        "cmems_mod_nws_phy-cur_anfc_1.5km-3D_PT1H-i",
        "202511",
    ),
}


def canonical_json(value: Any) -> str:
    return json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(",", ":"), allow_nan=False)


def canonical_sha256(value: Any) -> str:
    return HASH_PREFIX + hashlib.sha256(canonical_json(value).encode("utf-8")).hexdigest()


def file_sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for block in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(block)
    return HASH_PREFIX + digest.hexdigest()


def valid_sha256(value: Any) -> bool:
    text = str(value or "")
    digest = text[len(HASH_PREFIX):] if text.startswith(HASH_PREFIX) else ""
    return len(digest) == 64 and all(character in "0123456789abcdef" for character in digest)


def fixed_decimal(value: Any, places: int) -> str:
    if isinstance(value, bool) or not isinstance(value, (int, float)) or not math.isfinite(float(value)):
        raise ValueError("Projection numeric value must be finite")
    if places < 0:
        raise ValueError("Projection decimal places must be non-negative")
    rounded = round(float(value), places)
    # Projection inputs are already canonicalized at their declared precision.
    # Reject hidden extra precision instead of letting language-specific
    # rounding rules choose the hash.
    if not math.isclose(float(value), rounded, rel_tol=0, abs_tol=10 ** (-(places + 3))):
        raise ValueError("Projection numeric value has non-canonical precision")
    if rounded == 0:
        rounded = 0.0
    return f"{rounded:.{places}f}"


def live_record_projection_payload(entry: dict[str, Any]) -> dict[str, Any]:
    """Cross-language projection whose numbers are fixed decimal strings."""
    if entry.get("recordProjectionContractId") != RECORD_PROJECTION_CONTRACT_ID:
        raise ValueError("Copernicus record projection contract id mismatch")
    sampling = entry.get("samplingPoint")
    grid = entry.get("gridPoint")
    if not _finite_pair(sampling) or not _finite_pair(grid):
        raise ValueError("Copernicus record projection points are invalid")
    shared_layers = entry.get("sharedLayerCount")
    if isinstance(shared_layers, bool) or not isinstance(shared_layers, int) or shared_layers < 1:
        raise ValueError("Copernicus record projection shared-layer count is invalid")
    return {
        "contractId": RECORD_PROJECTION_CONTRACT_ID,
        "recordId": str(entry.get("recordId") or ""),
        "acquisitionId": str(entry.get("acquisitionId") or ""),
        "collectionId": str(entry.get("collectionId") or ""),
        "productionReferenceAt": str(entry.get("productionReferenceAt") or ""),
        "partId": str(entry.get("partId") or ""),
        "parentZoneId": str(entry.get("parentZoneId") or ""),
        "targetIdentityFingerprint": str(entry.get("targetIdentityFingerprint") or ""),
        "validTime": str(entry.get("validTime") or ""),
        "acquisitionAt": str(entry.get("acquisitionAt") or ""),
        "acquisitionStatus": str(entry.get("acquisitionStatus") or ""),
        "requestContractId": str(entry.get("requestContractId") or ""),
        "selectionPolicyId": str(entry.get("selectionPolicyId") or ""),
        "provider": str(entry.get("provider") or ""),
        "sourceClass": str(entry.get("sourceClass") or ""),
        "source": str(entry.get("source") or ""),
        "productId": str(entry.get("productId") or ""),
        "datasetId": str(entry.get("datasetId") or ""),
        "datasetVersion": str(entry.get("datasetVersion") or ""),
        "samplingPoint": [fixed_decimal(sampling[0], 7), fixed_decimal(sampling[1], 7)],
        "gridPoint": [fixed_decimal(grid[0], 7), fixed_decimal(grid[1], 7)],
        "distanceKm": fixed_decimal(entry.get("distanceKm"), 5),
        "verticalLayer": str(entry.get("verticalLayer") or ""),
        "verticalLayerM": fixed_decimal(entry.get("verticalLayerM"), 5),
        "layerQuality": str(entry.get("layerQuality") or ""),
        "sharedLayerCount": str(shared_layers),
        "componentPair": str(entry.get("componentPair") or ""),
        "interpolation": entry.get("interpolation"),
        "vectorSemanticsVersion": str(entry.get("vectorSemanticsVersion") or ""),
        "uMps": fixed_decimal(entry.get("uMps"), 5),
        "vMps": fixed_decimal(entry.get("vMps"), 5),
    }


def live_record_projection_sha256(entry: dict[str, Any]) -> str:
    return canonical_sha256(live_record_projection_payload(entry))


def verified_live_record_projection(entry: Any) -> bool:
    if not isinstance(entry, dict) or not valid_sha256(entry.get("recordProjectionSha256")):
        return False
    try:
        return entry["recordProjectionSha256"] == live_record_projection_sha256(entry)
    except (TypeError, ValueError):
        return False


def utc_iso(value: Any) -> str:
    """Return a stable UTC timestamp for datetime/numpy/xarray values."""
    if np is not None and isinstance(value, np.datetime64):
        text = np.datetime_as_string(value, unit="s")
        return f"{text}Z" if not text.endswith("Z") else text
    if isinstance(value, datetime):
        parsed = value
    else:
        parsed = datetime.fromisoformat(str(value).replace("Z", "+00:00"))
    if parsed.tzinfo is None:
        parsed = parsed.replace(tzinfo=timezone.utc)
    return parsed.astimezone(timezone.utc).isoformat().replace("+00:00", "Z")


def haversine_km(point_a: list[float] | tuple[float, float], point_b: list[float] | tuple[float, float]) -> float:
    """Distance between [longitude, latitude] points."""
    lon1, lat1 = map(float, point_a)
    lon2, lat2 = map(float, point_b)
    radius_km = 6371.0088
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dp = math.radians(lat2 - lat1)
    dl = math.radians(lon2 - lon1)
    a = math.sin(dp / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dl / 2) ** 2
    return radius_km * 2 * math.atan2(math.sqrt(a), math.sqrt(max(0.0, 1 - a)))


def load_targets(path: Path) -> list[dict[str, Any]]:
    """Load every centrally generated coastal part and its current water point."""
    document = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(document, dict) or not isinstance(document.get("zones"), dict):
        raise RuntimeError("Central coastal-part target document is malformed")
    targets: list[dict[str, Any]] = []
    for parent_zone_id, raw_parts in document["zones"].items():
        if not isinstance(parent_zone_id, str) or not parent_zone_id:
            raise RuntimeError("Central coastal-part parent-zone id is invalid")
        parts = raw_parts if isinstance(raw_parts, list) else [raw_parts]
        for part in parts:
            if not isinstance(part, dict):
                raise RuntimeError("Central coastal-part target row is malformed")
            point = part.get("waterPoint")
            if not _finite_pair(point):
                raise RuntimeError("Central coastal-part target has an invalid water point")
            lon, lat = float(point[0]), float(point[1])
            part_id = part.get("partId")
            parent_id = part.get("sourceZoneId") or parent_zone_id
            if not isinstance(part_id, str) or not part_id or not isinstance(parent_id, str) or not parent_id:
                raise RuntimeError("Central coastal-part target identity is invalid")
            targets.append({
                "partId": part_id,
                "parentZoneId": parent_id,
                "name": str(part.get("name") or part.get("partId") or ""),
                "waterPoint": [lon, lat],
            })
    targets.sort(key=lambda row: (row["parentZoneId"], row["partId"]))
    expected = document.get("partCount")
    if isinstance(expected, bool) or not isinstance(expected, int) or expected < 0:
        raise RuntimeError("Central coastal-part target count is invalid")
    if len(targets) != expected:
        raise RuntimeError(f"Coastal-part target count mismatch: {len(targets)} != {expected}")
    if len({row["partId"] for row in targets}) != len(targets):
        raise RuntimeError("Central coastal-part ids are not unique")
    return targets


def nearest_shared_uv(
    dataset: Any,
    target: dict[str, Any],
    *,
    source: str,
    product_id: str,
    dataset_id: str,
    dataset_version: str,
    maximum_distance_km: float = LOCAL_MAX_DISTANCE_KM,
    expected_time: datetime | None = None,
) -> dict[str, Any] | None:
    """Choose nearest wet column first, then deepest shared U/V layer.

    No interpolation, component merge, cross-cell merge or cross-layer merge is
    permitted.  The function expects one selected forecast time.
    """
    if np is None:
        raise RuntimeError("Copernicus numerical selection requires numpy")
    required = {"uo", "vo", "longitude", "latitude", "depth", "time"}
    missing = sorted(name for name in required if name not in dataset)
    if missing:
        raise RuntimeError(f"Copernicus subset is missing {', '.join(missing)}")

    time_values = np.asarray(dataset["time"].values).reshape(-1)
    if len(time_values) != 1:
        raise RuntimeError(f"Copernicus subset must contain exactly one time, found {len(time_values)}")
    valid_time = utc_iso(time_values[0])
    if expected_time is not None and valid_time != utc_iso(expected_time):
        raise RuntimeError(f"Copernicus returned {valid_time}, expected exact hour {utc_iso(expected_time)}")

    u = dataset["uo"]
    v = dataset["vo"]
    if "time" in u.dims:
        u = u.isel(time=0)
    if "time" in v.dims:
        v = v.isel(time=0)
    u = u.transpose("depth", "latitude", "longitude")
    v = v.transpose("depth", "latitude", "longitude")

    longitudes = np.asarray(dataset["longitude"].values, dtype=float)
    latitudes = np.asarray(dataset["latitude"].values, dtype=float)
    depths = np.asarray(dataset["depth"].values, dtype=float)
    u_values = np.asarray(u.values, dtype=float)
    v_values = np.asarray(v.values, dtype=float)
    lon0, lat0 = map(float, target["waterPoint"])

    latitude_margin = maximum_distance_km / 110.5 + 0.02
    longitude_scale = max(0.2, math.cos(math.radians(lat0)))
    longitude_margin = maximum_distance_km / (111.32 * longitude_scale) + 0.02
    y_indexes = np.flatnonzero(np.abs(latitudes - lat0) <= latitude_margin)
    x_indexes = np.flatnonzero(np.abs(longitudes - lon0) <= longitude_margin)
    columns: list[tuple[float, int, int]] = []
    for y_index in y_indexes:
        for x_index in x_indexes:
            distance = haversine_km([lon0, lat0], [longitudes[x_index], latitudes[y_index]])
            if distance <= maximum_distance_km + 1e-9:
                columns.append((distance, int(y_index), int(x_index)))
    columns.sort(key=lambda row: (row[0], latitudes[row[1]], longitudes[row[2]]))

    for distance, y_index, x_index in columns:
        shared = np.isfinite(u_values[:, y_index, x_index]) & np.isfinite(v_values[:, y_index, x_index])
        shared_indexes = np.flatnonzero(shared)
        if not len(shared_indexes):
            continue
        deepest_index = int(shared_indexes[np.argmax(depths[shared_indexes])])
        depth = float(depths[deepest_index])
        surface_depth = float(np.nanmin(depths))
        return {
            "partId": target["partId"],
            "parentZoneId": target["parentZoneId"],
            "name": target["name"],
            "samplingPoint": [round(lon0, 7), round(lat0, 7)],
            "source": source,
            "productId": product_id,
            "datasetId": dataset_id,
            "datasetVersion": dataset_version,
            "validTime": valid_time,
            "gridPoint": [round(float(longitudes[x_index]), 7), round(float(latitudes[y_index]), 7)],
            "distanceKm": round(distance, 5),
            "verticalLayerM": round(depth, 5),
            "layerQuality": "surface-only" if math.isclose(depth, surface_depth, abs_tol=1e-6) else "deepest-common-layer",
            "sharedLayerCount": int(len(shared_indexes)),
            "uMps": float(u_values[deepest_index, y_index, x_index]),
            "vMps": float(v_values[deepest_index, y_index, x_index]),
            "componentPair": "same-time-cell-layer",
            "interpolation": False,
        }
    return None


def nearest_shared_uv_times(
    dataset: Any,
    target: dict[str, Any],
    *,
    source: str,
    product_id: str,
    dataset_id: str,
    dataset_version: str,
    expected_times: list[datetime],
    maximum_distance_km: float = LOCAL_MAX_DISTANCE_KM,
) -> list[dict[str, Any]]:
    """Select one independent native U/V pair for every requested time.

    The dataset may contain additional native hours because a bounded spatial
    shard is fetched as one range.  Every requested hour must nevertheless be
    present exactly; nearest-time selection, temporal interpolation and holding
    a vector across hours are forbidden.
    """
    if np is None:
        raise RuntimeError("Copernicus numerical selection requires numpy")
    raw_times = np.asarray(dataset["time"].values).reshape(-1) if "time" in dataset else np.asarray([])
    by_time: dict[str, int] = {}
    for index, raw_time in enumerate(raw_times):
        time_text = utc_iso(raw_time)
        if time_text in by_time:
            raise RuntimeError(f"Copernicus subset contains duplicate native time {time_text}")
        by_time[time_text] = index
    requested = sorted({utc_iso(value) for value in expected_times})
    if len(requested) != len(expected_times):
        raise RuntimeError("Copernicus acquisition contains duplicate requested native times")
    missing = [value for value in requested if value not in by_time]
    if missing:
        raise RuntimeError(
            f"Copernicus subset is missing {len(missing)} exact requested native hour(s); "
            "temporal interpolation is forbidden"
        )
    selected: list[dict[str, Any]] = []
    for time_text in requested:
        one_time = dataset.isel(time=[by_time[time_text]])
        record = nearest_shared_uv(
            one_time,
            target,
            source=source,
            product_id=product_id,
            dataset_id=dataset_id,
            dataset_version=dataset_version,
            maximum_distance_km=maximum_distance_km,
            expected_time=_parse_shadow_time(time_text),
        )
        if record is not None:
            selected.append(record)
    return selected


def safe_record(record: dict[str, Any]) -> dict[str, Any]:
    """Remove the raw vector while preserving auditable source geometry."""
    return {key: value for key, value in record.items() if key not in {"uMps", "vMps"}}


def safe_shadow_summary(document: dict[str, Any]) -> dict[str, Any]:
    """Aggregate cache evidence without exposing vectors or target geometry."""
    records = list(document.get("records") or [])
    acquisition_sources = {
        str(row.get("acquisitionId") or ""): str(row.get("source") or "unknown")
        for row in document.get("acquisitions") or [] if isinstance(row, dict)
    }
    by_source: dict[str, list[dict[str, Any]]] = {}
    by_target_source: dict[tuple[str, str], list[dict[str, Any]]] = {}
    for record in records:
        source = acquisition_sources.get(str(record.get("acquisitionId") or ""), "unknown")
        part_id = str(record.get("partId") or "")
        by_source.setdefault(source, []).append(record)
        by_target_source.setdefault((part_id, source), []).append(record)

    def span(rows: list[dict[str, Any]], field: str) -> tuple[float | None, float | None]:
        values = [float(row[field]) for row in rows if isinstance(row.get(field), (int, float)) and math.isfinite(float(row[field]))]
        return (round(min(values), 5), round(max(values), 5)) if values else (None, None)

    def stability(rows: list[dict[str, Any]]) -> dict[str, Any]:
        distances = span(rows, "distanceKm")
        depths = span(rows, "verticalLayerM")
        grids = {tuple(row.get("gridPoint") or []) for row in rows}
        layers = {row.get("verticalLayerM") for row in rows}
        times = {str(row.get("validTime") or "") for row in rows if row.get("validTime")}
        return {
            "observationCount": len(rows),
            "validTimeCount": len(times),
            "gridCellVariantCount": len(grids),
            "verticalLayerCount": len(layers),
            "minimumDistanceKm": distances[0],
            "maximumDistanceKm": distances[1],
            "minimumLayerM": depths[0],
            "maximumLayerM": depths[1],
            "surfaceOnlyCount": sum(row.get("layerQuality") == "surface-only" for row in rows),
        }

    source_rows = []
    for source, rows in sorted(by_source.items()):
        source_rows.append({
            "source": source,
            "uniqueTargetCount": len({str(row.get("partId") or "") for row in rows}),
            **stability(rows),
        })
    target_stability = [stability(rows) for rows in by_target_source.values()]
    valid_times = sorted({str(row.get("validTime")) for row in records if row.get("validTime")})
    return {
        "recordCount": len(records),
        "validTimeCount": len(valid_times),
        "firstValidTime": valid_times[0] if valid_times else None,
        "lastValidTime": valid_times[-1] if valid_times else None,
        "uniqueTargetCount": len({str(row.get("partId") or "") for row in records}),
        "targetSourcePairCount": len(target_stability),
        "gridUnstableTargetSourceCount": sum(row["gridCellVariantCount"] > 1 for row in target_stability),
        "layerUnstableTargetSourceCount": sum(row["verticalLayerCount"] > 1 for row in target_stability),
        "completeAcquisitionCount": sum(row.get("status") == "COMPLETE" for row in document.get("acquisitions") or []),
        "completeCoverageCollectionCount": sum(row.get("status") == "COMPLETE" for row in document.get("collections") or []),
        "sources": source_rows,
    }


def _parse_shadow_time(value: Any) -> datetime:
    parsed = datetime.fromisoformat(str(value).replace("Z", "+00:00"))
    if parsed.tzinfo is None:
        raise ValueError("Copernicus shadow time must include a timezone")
    return parsed.astimezone(timezone.utc)


def _finite_pair(value: Any) -> bool:
    return (
        isinstance(value, (list, tuple))
        and len(value) == 2
        and all(
            isinstance(item, (int, float))
            and not isinstance(item, bool)
            and math.isfinite(float(item))
            for item in value
        )
    )


TOP_LEVEL_FIELDS = {
    "schemaVersion", "kind", "retentionHours", "coldBridgeHours", "publicHourCount",
    "scoreImpact", "publicRuntime", "credentialsIncluded", "rawVectorsIncluded",
    "updatedAt", "acquisitions", "collections", "records",
}
ACQUISITION_FIELDS = {
    "acquisitionId", "status", "requestContractId", "source", "productId", "datasetId",
    "datasetVersion", "acquisitionAt", "requestStartAt", "requestEndAt", "targetFingerprint",
    "targetPartIds", "nativeValidTimes", "subsetSha256", "selectionPolicyId", "componentPair",
    "interpolation", "recordCount",
}
RECORD_FIELDS = {
    "recordId", "acquisitionId", "partId", "parentZoneId", "targetIdentityFingerprint",
    "validTime", "samplingPoint", "gridPoint", "distanceKm", "verticalLayerM", "layerQuality",
    "sharedLayerCount", "uMps", "vMps", "componentPair", "interpolation",
}
COLLECTION_FIELDS = {
    "collectionId", "status", "productionReferenceAt", "rangeStartAt", "rangeEndAt",
    "coldBridgeHours", "publicHourCount", "targetRegistrySha256", "dmiCurrentInputSha256",
    "dmiVerifierContractId", "requiredPairsSha256", "requiredPairCount", "selectionPolicyId",
    "recordRefs", "recordRefsSha256", "acquisitionIds", "sealedAt",
}
RECORD_REF_FIELDS = {"partId", "validTime", "recordId", "acquisitionId", "source"}
TARGET_REGISTRY_FIELDS = {
    "schemaVersion", "kind", "matrixContractId", "selectionMode",
    "productionReferenceAt", "targetHour", "rangeStartAt", "rangeEndAt",
    "coldBridgeHours", "publicHourCount", "matrixHourCount", "targetCount",
    "sourcePartCount", "partCount", "targetRegistrySha256", "dmiCurrentInputSha256",
    "dmiVerifierContractId", "requiredPairsSha256", "requiredPairCount",
    "dmiVerifiedPairCount", "totalPairCount", "coordinatesChanged", "targets",
    "requiredPairs", "zones",
}
TARGET_IDENTITY_FIELDS = {"partId", "parentZoneId", "name", "waterPoint"}
TARGET_ZONE_FIELDS = {"partId", "sourceZoneId", "name", "waterPoint"}
REQUIRED_PAIR_FIELDS = {"partId", "validTime"}


def _require_exact_fields(value: Any, fields: set[str], label: str) -> dict[str, Any]:
    if not isinstance(value, dict) or set(value) != fields:
        actual = set(value) if isinstance(value, dict) else set()
        raise ValueError(f"{label} fields differ: missing={sorted(fields - actual)}, extra={sorted(actual - fields)}")
    return value


def _hour(value: Any, label: str) -> datetime:
    parsed = _parse_shadow_time(value)
    if parsed != parsed.replace(minute=0, second=0, microsecond=0):
        raise ValueError(f"{label} must be an exact UTC hour")
    return parsed


def range_bounds(production_reference_at: datetime) -> tuple[datetime, datetime]:
    reference = production_reference_at.astimezone(timezone.utc)
    if reference != reference.replace(minute=0, second=0, microsecond=0):
        raise ValueError("Production reference must be an exact UTC hour")
    return (
        reference - timedelta(hours=COLD_BRIDGE_HOURS),
        reference + timedelta(hours=PUBLIC_END_OFFSET_HOURS),
    )


def required_pairs_sha256(pairs: list[dict[str, Any]]) -> str:
    normalized = sorted(
        ({"partId": str(row["partId"]), "validTime": utc_iso(_hour(row["validTime"], "required pair time"))}
         for row in pairs),
        key=lambda row: (row["validTime"], row["partId"]),
    )
    if len({(row["partId"], row["validTime"]) for row in normalized}) != len(normalized):
        raise ValueError("Required pair matrix contains duplicates")
    return canonical_sha256({"contractId": "copernicus-required-part-time-pairs-v1", "pairs": normalized})


def validate_target_registry(document: Any) -> dict[str, Any]:
    registry = _require_exact_fields(document, TARGET_REGISTRY_FIELDS, "Copernicus range target registry")
    schema_version = registry.get("schemaVersion")
    if (
        isinstance(schema_version, bool)
        or not isinstance(schema_version, int)
        or schema_version != 2
        or registry.get("kind") != TARGET_REGISTRY_KIND
    ):
        raise ValueError("Copernicus range target registry schema is invalid")
    if registry.get("matrixContractId") != MATRIX_CONTRACT_ID:
        raise ValueError("Copernicus range target registry matrix contract is invalid")
    if registry.get("selectionMode") not in {"dmi-gaps-only", "manual-full-coast"}:
        raise ValueError("Copernicus range target registry selection mode is invalid")
    reference = _hour(registry.get("productionReferenceAt"), "registry production reference")
    start, end = range_bounds(reference)
    if registry.get("targetHour") != utc_iso(reference):
        raise ValueError("Copernicus range target registry target hour is not the locked reference")
    if registry.get("rangeStartAt") != utc_iso(start) or registry.get("rangeEndAt") != utc_iso(end):
        raise ValueError("Copernicus range target registry is not exact -48..+117")
    horizon = (
        registry.get("coldBridgeHours"), registry.get("publicHourCount"), registry.get("matrixHourCount"),
    )
    if any(isinstance(value, bool) or not isinstance(value, int) for value in horizon) or horizon != (COLD_BRIDGE_HOURS, PUBLIC_HOUR_COUNT, 166):
        raise ValueError("Copernicus range target registry horizon is invalid")
    if registry.get("coordinatesChanged") is not False:
        raise ValueError("Copernicus range target registry may not change coordinates")
    targets = registry.get("targets")
    pairs = registry.get("requiredPairs")
    if not isinstance(targets, list) or not isinstance(pairs, list):
        raise ValueError("Copernicus range target registry arrays are malformed")
    for raw in targets:
        target = _require_exact_fields(raw, TARGET_IDENTITY_FIELDS, "Copernicus range target")
        if any(not isinstance(target[field], str) or not target[field] for field in ("partId", "parentZoneId", "name")):
            raise ValueError("Copernicus range target identity is invalid")
        if not _finite_pair(target["waterPoint"]):
            raise ValueError("Copernicus range target point is invalid")
    target_ids = [str(row["partId"]) for row in targets]
    if len(set(target_ids)) != len(targets):
        raise ValueError("Copernicus range target ids are not unique")
    if targets != sorted(targets, key=lambda row: (row["parentZoneId"], row["partId"])):
        raise ValueError("Copernicus range targets are not canonical")
    for field, expected in (("targetCount", len(targets)), ("sourcePartCount", len(targets))):
        value = registry.get(field)
        if isinstance(value, bool) or not isinstance(value, int) or value != expected:
            raise ValueError(f"Copernicus range target registry {field} mismatch")
    if registry.get("targetRegistrySha256") != geometry_fingerprint(targets):
        raise ValueError("Copernicus range target registry target identity mismatch")
    for raw in pairs:
        _require_exact_fields(raw, REQUIRED_PAIR_FIELDS, "Copernicus required pair")
    if pairs != sorted(pairs, key=lambda row: (row["validTime"], row["partId"])):
        raise ValueError("Copernicus required pairs are not canonical")
    required_pair_count = registry.get("requiredPairCount")
    if (
        isinstance(required_pair_count, bool)
        or not isinstance(required_pair_count, int)
        or required_pair_count != len(pairs)
        or registry.get("requiredPairsSha256") != required_pairs_sha256(pairs)
    ):
        raise ValueError("Copernicus range target registry DMI-gap identity mismatch")
    if registry.get("dmiVerifierContractId") != DMI_VERIFIER_CONTRACT_ID or not valid_sha256(registry.get("dmiCurrentInputSha256")):
        raise ValueError("Copernicus range target registry DMI binding is invalid")
    valid_times = {utc_iso(start + timedelta(hours=index)) for index in range(166)}
    target_id_set = set(target_ids)
    if any(str(row.get("partId") or "") not in target_id_set or str(row.get("validTime") or "") not in valid_times for row in pairs):
        raise ValueError("Copernicus required pair lies outside the bound matrix")
    total = registry.get("totalPairCount")
    verified = registry.get("dmiVerifiedPairCount")
    if any(isinstance(value, bool) or not isinstance(value, int) or value < 0 for value in (total, verified)):
        raise ValueError("Copernicus DMI-gap matrix counts are invalid")
    if total != len(targets) * 166 or verified + len(pairs) != total:
        raise ValueError("Copernicus DMI-gap matrix cardinality does not close")
    required_target_ids = {str(row["partId"]) for row in pairs}
    part_count = registry.get("partCount")
    if isinstance(part_count, bool) or not isinstance(part_count, int) or part_count != len(required_target_ids):
        raise ValueError("Copernicus required target count mismatch")
    if registry["selectionMode"] == "manual-full-coast":
        if verified != 0 or len(pairs) != total:
            raise ValueError("Manual full-coast Copernicus matrix is incomplete")
    elif targets and verified == 0:
        raise ValueError("Implicit full-coast Copernicus collection is forbidden")
    expected_zones: dict[str, list[dict[str, Any]]] = {}
    for target in targets:
        if target["partId"] not in required_target_ids:
            continue
        expected_zones.setdefault(target["parentZoneId"], []).append({
            "partId": target["partId"],
            "sourceZoneId": target["parentZoneId"],
            "name": target["name"],
            "waterPoint": target["waterPoint"],
        })
    zones = registry.get("zones")
    if not isinstance(zones, dict):
        raise ValueError("Copernicus range target zones are malformed")
    for rows in zones.values():
        if not isinstance(rows, list):
            raise ValueError("Copernicus range target zone rows are malformed")
        for row in rows:
            _require_exact_fields(row, TARGET_ZONE_FIELDS, "Copernicus range target zone row")
    if zones != expected_zones:
        raise ValueError("Copernicus range target zones do not match required target identities")
    return registry


def _identity_without(value: dict[str, Any], *excluded: str) -> str:
    return canonical_sha256({key: item for key, item in value.items() if key not in excluded})


def acquisition_id(value: dict[str, Any]) -> str:
    return _identity_without(value, "acquisitionId", "status")


def record_id(value: dict[str, Any]) -> str:
    return _identity_without(value, "recordId")


def collection_id(value: dict[str, Any]) -> str:
    return _identity_without(value, "collectionId", "status", "sealedAt")


def target_identity_fingerprint(target: dict[str, Any]) -> str:
    return geometry_fingerprint([target])


def _record_matches_target(record: dict[str, Any], target: dict[str, Any] | None) -> bool:
    return bool(
        target
        and str(record.get("parentZoneId") or "") == str(target.get("parentZoneId") or "")
        and tuple(round(float(value), 7) for value in record.get("samplingPoint") or [])
        == tuple(round(float(value), 7) for value in target.get("waterPoint") or [])
        and record.get("targetIdentityFingerprint") == target_identity_fingerprint(target)
    )


def make_acquisition(
    *,
    source: str,
    acquisition_at: datetime,
    request_start_at: datetime,
    request_end_at: datetime,
    targets: list[dict[str, Any]],
    native_valid_times: list[datetime],
    subset_sha256: str,
    record_count: int,
    request_contract_id: str = REQUEST_CONTRACT_ID,
) -> dict[str, Any]:
    contract = COPERNICUS_SOURCE_CONTRACTS.get(source)
    if contract is None:
        raise ValueError(f"Unsupported Copernicus source: {source}")
    target_rows = sorted(targets, key=lambda row: str(row["partId"]))
    value = {
        "status": "COMPLETE",
        "requestContractId": request_contract_id,
        "source": source,
        "productId": contract[0],
        "datasetId": contract[1],
        "datasetVersion": contract[2],
        "acquisitionAt": utc_iso(acquisition_at),
        "requestStartAt": utc_iso(request_start_at),
        "requestEndAt": utc_iso(request_end_at),
        "targetFingerprint": geometry_fingerprint(target_rows),
        "targetPartIds": [str(row["partId"]) for row in target_rows],
        "nativeValidTimes": sorted({utc_iso(value) for value in native_valid_times}),
        "subsetSha256": subset_sha256,
        "selectionPolicyId": SELECTION_POLICY_ID,
        "componentPair": COMPONENT_PAIR,
        "interpolation": False,
        "recordCount": int(record_count),
    }
    value["acquisitionId"] = acquisition_id(value)
    return value


def make_record(raw: dict[str, Any], acquisition: dict[str, Any], target: dict[str, Any]) -> dict[str, Any]:
    value = {
        "acquisitionId": acquisition["acquisitionId"],
        "partId": str(raw["partId"]),
        "parentZoneId": str(raw["parentZoneId"]),
        "targetIdentityFingerprint": target_identity_fingerprint(target),
        "validTime": utc_iso(_hour(raw["validTime"], "Copernicus record time")),
        "samplingPoint": [round(float(value), 7) for value in raw["samplingPoint"][:2]],
        "gridPoint": [round(float(value), 7) for value in raw["gridPoint"][:2]],
        "distanceKm": round(float(raw["distanceKm"]), 5),
        "verticalLayerM": round(float(raw["verticalLayerM"]), 5),
        "layerQuality": str(raw["layerQuality"]),
        "sharedLayerCount": int(raw["sharedLayerCount"]),
        "uMps": float(raw["uMps"]),
        "vMps": float(raw["vMps"]),
        "componentPair": COMPONENT_PAIR,
        "interpolation": False,
    }
    value["recordId"] = record_id(value)
    return value


def _validate_acquisition(value: Any) -> dict[str, Any]:
    acquisition = _require_exact_fields(value, ACQUISITION_FIELDS, "Copernicus acquisition")
    if acquisition["status"] != "COMPLETE":
        raise ValueError("Copernicus acquisition is not COMPLETE")
    if acquisition["requestContractId"] not in {REQUEST_CONTRACT_ID, LEGACY_HISTORY_REQUEST_CONTRACT_ID}:
        raise ValueError("Copernicus acquisition request contract is not pinned")
    expected = COPERNICUS_SOURCE_CONTRACTS.get(acquisition["source"])
    if expected is None or tuple(acquisition[key] for key in ("productId", "datasetId", "datasetVersion")) != expected:
        raise ValueError("Copernicus acquisition source product/dataset/version is not pinned")
    acquisition_at = _parse_shadow_time(acquisition["acquisitionAt"])
    start = _hour(acquisition["requestStartAt"], "Copernicus request start")
    end = _hour(acquisition["requestEndAt"], "Copernicus request end")
    if end < start:
        raise ValueError("Copernicus acquisition request range is reversed")
    target_ids = acquisition["targetPartIds"]
    if (
        not isinstance(target_ids, list)
        or any(not isinstance(value, str) or not value for value in target_ids)
        or target_ids != sorted(set(target_ids))
        or not target_ids
    ):
        raise ValueError("Copernicus acquisition target ids must be sorted, unique and non-empty")
    native_times = acquisition["nativeValidTimes"]
    if (
        not isinstance(native_times, list)
        or any(not isinstance(value, str) or not value for value in native_times)
        or native_times != sorted(set(native_times))
        or not native_times
    ):
        raise ValueError("Copernicus acquisition native times must be sorted, unique and non-empty")
    parsed_times = [_hour(value, "Copernicus native time") for value in native_times]
    if any(value < start or value > end for value in parsed_times):
        raise ValueError("Copernicus native time lies outside its request range")
    if not valid_sha256(acquisition["targetFingerprint"]) or not valid_sha256(acquisition["subsetSha256"]):
        raise ValueError("Copernicus acquisition hash is invalid")
    if acquisition["selectionPolicyId"] != SELECTION_POLICY_ID or acquisition["componentPair"] != COMPONENT_PAIR or acquisition["interpolation"] is not False:
        raise ValueError("Copernicus acquisition selection semantics are invalid")
    if isinstance(acquisition["recordCount"], bool) or not isinstance(acquisition["recordCount"], int) or acquisition["recordCount"] < 0:
        raise ValueError("Copernicus acquisition record count is invalid")
    if acquisition["acquisitionId"] != acquisition_id(acquisition):
        raise ValueError("Copernicus acquisition identity hash mismatch")
    return {**acquisition, "_acquisitionAt": acquisition_at, "_start": start, "_end": end}


def _validate_record(
    value: Any,
    acquisitions: dict[str, dict[str, Any]],
    targets: dict[str, dict[str, Any]] | None,
) -> dict[str, Any]:
    record = _require_exact_fields(value, RECORD_FIELDS, "Copernicus record")
    acquisition = acquisitions.get(str(record["acquisitionId"]))
    if acquisition is None:
        raise ValueError("Copernicus record references an unknown acquisition")
    for field in ("partId", "parentZoneId", "layerQuality"):
        if not isinstance(record[field], str) or not record[field]:
            raise ValueError(f"Copernicus record has invalid {field}")
    if record["partId"] not in acquisition["targetPartIds"]:
        raise ValueError("Copernicus record part is outside its acquisition")
    valid_time = _hour(record["validTime"], "Copernicus record time")
    if utc_iso(valid_time) not in acquisition["nativeValidTimes"]:
        raise ValueError("Copernicus record time is outside its acquisition")
    if not _finite_pair(record["samplingPoint"]) or not _finite_pair(record["gridPoint"]):
        raise ValueError("Copernicus record has invalid sampling or grid point")
    for field in ("distanceKm", "verticalLayerM", "uMps", "vMps"):
        if isinstance(record[field], bool) or not isinstance(record[field], (int, float)) or not math.isfinite(float(record[field])):
            raise ValueError(f"Copernicus record has invalid {field}")
    if not (0 <= float(record["distanceKm"]) <= LOCAL_MAX_DISTANCE_KM + 1e-9):
        raise ValueError("Copernicus record exceeds the local distance limit")
    physical_distance = haversine_km(record["samplingPoint"], record["gridPoint"])
    if abs(physical_distance - float(record["distanceKm"])) > 0.02:
        raise ValueError("Copernicus record distance does not match its exact grid point")
    if isinstance(record["sharedLayerCount"], bool) or not isinstance(record["sharedLayerCount"], int) or record["sharedLayerCount"] < 1:
        raise ValueError("Copernicus record shared-layer count is invalid")
    if record["componentPair"] != COMPONENT_PAIR or record["interpolation"] is not False:
        raise ValueError("Copernicus record violates same-time/cell/layer semantics")
    if not valid_sha256(record["targetIdentityFingerprint"]):
        raise ValueError("Copernicus record target fingerprint is invalid")
    self_identity = {
        "partId": record["partId"], "parentZoneId": record["parentZoneId"],
        "waterPoint": record["samplingPoint"],
    }
    if record["targetIdentityFingerprint"] != target_identity_fingerprint(self_identity):
        raise ValueError("Copernicus record target fingerprint does not match its sampling identity")
    if targets is not None and not _record_matches_target(record, targets.get(record["partId"])):
        raise ValueError("Copernicus record does not match current central target identity")
    if record["recordId"] != record_id(record):
        raise ValueError("Copernicus record identity hash mismatch")
    return {**record, "_validTime": valid_time}


def _validate_collection(
    value: Any,
    acquisitions: dict[str, dict[str, Any]],
    records: dict[str, dict[str, Any]],
) -> dict[str, Any]:
    collection = _require_exact_fields(value, COLLECTION_FIELDS, "Copernicus coverage collection")
    if collection["status"] != "COMPLETE":
        raise ValueError("Copernicus coverage collection is not COMPLETE")
    reference = _hour(collection["productionReferenceAt"], "production reference")
    start, end = range_bounds(reference)
    if collection["rangeStartAt"] != utc_iso(start) or collection["rangeEndAt"] != utc_iso(end):
        raise ValueError("Copernicus coverage collection range is not exact -48..+117")
    horizon = (collection["coldBridgeHours"], collection["publicHourCount"])
    if (
        any(isinstance(value, bool) or not isinstance(value, int) for value in horizon)
        or horizon != (COLD_BRIDGE_HOURS, PUBLIC_HOUR_COUNT)
    ):
        raise ValueError("Copernicus coverage collection horizon is invalid")
    for field in ("targetRegistrySha256", "dmiCurrentInputSha256", "requiredPairsSha256", "recordRefsSha256"):
        if not valid_sha256(collection[field]):
            raise ValueError(f"Copernicus coverage collection has invalid {field}")
    if collection["dmiVerifierContractId"] != DMI_VERIFIER_CONTRACT_ID or collection["selectionPolicyId"] != SELECTION_POLICY_ID:
        raise ValueError("Copernicus coverage collection verifier/selection contract is not pinned")
    refs = collection["recordRefs"]
    if not isinstance(refs, list) or any(not isinstance(row, dict) for row in refs):
        raise ValueError("Copernicus coverage record refs are malformed")
    if refs != sorted(refs, key=lambda row: (row.get("validTime", ""), row.get("partId", ""))):
        raise ValueError("Copernicus coverage record refs are not canonical")
    seen_pairs: set[tuple[str, str]] = set()
    referenced_acquisitions: set[str] = set()
    pairs: list[dict[str, str]] = []
    for ref in refs:
        _require_exact_fields(ref, RECORD_REF_FIELDS, "Copernicus coverage record ref")
        pair = (str(ref["partId"]), utc_iso(_hour(ref["validTime"], "coverage ref time")))
        if pair in seen_pairs:
            raise ValueError("Copernicus coverage record refs contain a duplicate part/time")
        seen_pairs.add(pair)
        if not (start <= _parse_shadow_time(pair[1]) <= end):
            raise ValueError("Copernicus coverage ref lies outside -48..+117")
        record = records.get(str(ref["recordId"]))
        acquisition = acquisitions.get(str(ref["acquisitionId"]))
        if record is None or acquisition is None:
            raise ValueError("Copernicus coverage ref joins to missing evidence")
        if (
            record["acquisitionId"] != ref["acquisitionId"]
            or record["partId"] != pair[0]
            or record["validTime"] != pair[1]
            or acquisition["source"] != ref["source"]
        ):
            raise ValueError("Copernicus coverage ref join is inconsistent")
        if _parse_shadow_time(pair[1]) >= reference:
            if acquisition["requestContractId"] != REQUEST_CONTRACT_ID:
                raise ValueError("Current/future Copernicus record requires the multi-time request contract")
            age = abs((acquisition["_acquisitionAt"] - reference).total_seconds()) / 3600
            if age > FUTURE_ACQUISITION_FRESHNESS_HOURS:
                raise ValueError("Current/future Copernicus acquisition is stale versus production reference")
        referenced_acquisitions.add(ref["acquisitionId"])
        pairs.append({"partId": pair[0], "validTime": pair[1]})
    if (
        isinstance(collection["requiredPairCount"], bool)
        or not isinstance(collection["requiredPairCount"], int)
        or collection["requiredPairCount"] != len(refs)
    ):
        raise ValueError("Copernicus coverage required-pair count mismatch")
    if collection["requiredPairsSha256"] != required_pairs_sha256(pairs):
        raise ValueError("Copernicus coverage required-pair hash mismatch")
    if collection["recordRefsSha256"] != canonical_sha256(refs):
        raise ValueError("Copernicus coverage record-ref hash mismatch")
    if collection["acquisitionIds"] != sorted(referenced_acquisitions):
        raise ValueError("Copernicus coverage acquisition ids are not the exact referenced set")
    sealed_at = _parse_shadow_time(collection["sealedAt"])
    if abs((sealed_at - reference).total_seconds()) > FUTURE_ACQUISITION_FRESHNESS_HOURS * 3600:
        raise ValueError("Copernicus coverage seal is stale versus production reference")
    if any(acquisitions[value]["_acquisitionAt"] > sealed_at for value in referenced_acquisitions):
        raise ValueError("Copernicus coverage seal predates one of its referenced acquisitions")
    if collection["collectionId"] != collection_id(collection):
        raise ValueError("Copernicus coverage collection identity hash mismatch")
    return {**collection, "_reference": reference}


def validate_shadow(
    document: Any,
    target_identities: dict[str, dict[str, Any]] | None = None,
    *,
    require_collection: bool = False,
) -> dict[str, Any]:
    cache = _require_exact_fields(document, TOP_LEVEL_FIELDS, "Copernicus range cache")
    integer_contract = (
        cache["schemaVersion"], cache["retentionHours"],
        cache["coldBridgeHours"], cache["publicHourCount"],
    )
    if (
        any(isinstance(value, bool) or not isinstance(value, int) for value in integer_contract)
        or cache["schemaVersion"] != CACHE_SCHEMA_VERSION
        or cache["kind"] != CACHE_KIND
        or cache["retentionHours"] != RETENTION_HOURS
        or cache["coldBridgeHours"] != COLD_BRIDGE_HOURS
        or cache["publicHourCount"] != PUBLIC_HOUR_COUNT
        or cache["scoreImpact"] is not False
        or cache["publicRuntime"] is not False
        or cache["credentialsIncluded"] is not False
        or cache["rawVectorsIncluded"] is not True
    ):
        raise ValueError("Copernicus range cache top-level contract is invalid")
    _parse_shadow_time(cache["updatedAt"])
    if not all(isinstance(cache[field], list) for field in ("acquisitions", "collections", "records")):
        raise ValueError("Copernicus range cache arrays are malformed")
    if cache["acquisitions"] != sorted(cache["acquisitions"], key=lambda row: row.get("acquisitionId", "")):
        raise ValueError("Copernicus acquisitions are not canonical")
    validated_acquisitions: dict[str, dict[str, Any]] = {}
    for raw in cache["acquisitions"]:
        acquisition = _validate_acquisition(raw)
        if acquisition["acquisitionId"] in validated_acquisitions:
            raise ValueError("Duplicate Copernicus acquisition identity")
        validated_acquisitions[acquisition["acquisitionId"]] = acquisition
        if target_identities is not None:
            try:
                acquisition_targets = [target_identities[part_id] for part_id in acquisition["targetPartIds"]]
            except KeyError:
                raise ValueError("Copernicus acquisition references an unknown central target") from None
            if acquisition["targetFingerprint"] != geometry_fingerprint(acquisition_targets):
                raise ValueError("Copernicus acquisition target fingerprint does not match central identities")
    if cache["records"] != sorted(cache["records"], key=lambda row: (row.get("validTime", ""), row.get("partId", ""), row.get("recordId", ""))):
        raise ValueError("Copernicus records are not canonical")
    validated_records: dict[str, dict[str, Any]] = {}
    count_by_acquisition: dict[str, int] = {}
    for raw in cache["records"]:
        record = _validate_record(raw, validated_acquisitions, target_identities)
        if record["recordId"] in validated_records:
            raise ValueError("Duplicate Copernicus record identity")
        validated_records[record["recordId"]] = record
        count_by_acquisition[record["acquisitionId"]] = count_by_acquisition.get(record["acquisitionId"], 0) + 1
    for acquisition in validated_acquisitions.values():
        retained_count = count_by_acquisition.get(acquisition["acquisitionId"], 0)
        # recordCount attests the complete parsed subset at acquisition time.
        # Retention may later discard only the now-expired members of a
        # multi-time acquisition without rewriting that source attestation.
        if retained_count < 1 or retained_count > acquisition["recordCount"]:
            raise ValueError("Copernicus retained record count exceeds or is detached from its acquisition")
    if cache["collections"] != sorted(cache["collections"], key=lambda row: row.get("productionReferenceAt", "")):
        raise ValueError("Copernicus coverage collections are not canonical")
    collection_ids: set[str] = set()
    for raw in cache["collections"]:
        collection = _validate_collection(raw, validated_acquisitions, validated_records)
        if collection["collectionId"] in collection_ids:
            raise ValueError("Duplicate Copernicus coverage collection identity")
        collection_ids.add(collection["collectionId"])
    if require_collection and not cache["collections"]:
        raise ValueError("Copernicus range cache has no COMPLETE coverage collection")
    return cache


def empty_shadow(updated_at: datetime) -> dict[str, Any]:
    return {
        "schemaVersion": CACHE_SCHEMA_VERSION,
        "kind": CACHE_KIND,
        "retentionHours": RETENTION_HOURS,
        "coldBridgeHours": COLD_BRIDGE_HOURS,
        "publicHourCount": PUBLIC_HOUR_COUNT,
        "scoreImpact": False,
        "publicRuntime": False,
        "credentialsIncluded": False,
        "rawVectorsIncluded": True,
        "updatedAt": utc_iso(updated_at),
        "acquisitions": [],
        "collections": [],
        "records": [],
    }


def validate_legacy_shadow_for_migration(document: Any) -> dict[str, Any]:
    """Validate only the persisted schema-1 envelope used by the one-way bridge.

    Schema 1 is never a range seal.  This validator merely establishes that an
    old private cache is safe to inspect and that its rows/collections have the
    container types the migration expects.  Individual rows are revalidated
    against the stricter schema-2 source and target contracts below.
    """
    if not isinstance(document, dict):
        raise ValueError("Legacy Copernicus cache is not an object")
    schema_version = document.get("schemaVersion")
    if isinstance(schema_version, bool) or not isinstance(schema_version, int) or schema_version != 1:
        raise ValueError("Legacy Copernicus cache schema is invalid")
    retention_hours = document.get("retentionHours")
    if (
        isinstance(retention_hours, bool)
        or not isinstance(retention_hours, int)
        or retention_hours != RETENTION_HOURS
    ):
        raise ValueError("Legacy Copernicus cache retention is invalid")
    if document.get("scoreImpact") is not False or document.get("publicRuntime") is not False:
        raise ValueError("Legacy Copernicus cache runtime metadata is unsafe")
    if document.get("credentialsIncluded") not in (None, False):
        raise ValueError("Legacy Copernicus cache credential metadata is unsafe")
    if not isinstance(document.get("records"), list):
        raise ValueError("Legacy Copernicus cache records are malformed")
    if not isinstance(document.get("collections", []), list):
        raise ValueError("Legacy Copernicus cache collections are malformed")
    return document


def _strict_legacy_record(raw: Any) -> dict[str, Any]:
    if not isinstance(raw, dict):
        raise ValueError("Legacy Copernicus record is not an object")
    for field in ("partId", "parentZoneId", "source", "productId", "datasetId", "datasetVersion", "layerQuality"):
        if not isinstance(raw.get(field), str) or not raw[field]:
            raise ValueError(f"Legacy Copernicus record has invalid {field}")
    if not _finite_pair(raw.get("samplingPoint")) or not _finite_pair(raw.get("gridPoint")):
        raise ValueError("Legacy Copernicus record has invalid sampling or grid point")
    for field in ("distanceKm", "verticalLayerM", "uMps", "vMps"):
        value = raw.get(field)
        if isinstance(value, bool) or not isinstance(value, (int, float)) or not math.isfinite(float(value)):
            raise ValueError(f"Legacy Copernicus record has invalid {field}")
    shared_layers = raw.get("sharedLayerCount")
    if isinstance(shared_layers, bool) or not isinstance(shared_layers, int) or shared_layers < 1:
        raise ValueError("Legacy Copernicus record has invalid shared-layer count")
    if raw.get("componentPair") != COMPONENT_PAIR or raw.get("interpolation") is not False:
        raise ValueError("Legacy Copernicus record violates same-time/cell/layer semantics")
    return raw


def _migrate_schema1_history(
    legacy: dict[str, Any],
    production_reference_at: datetime,
    targets: dict[str, dict[str, Any]] | None,
) -> dict[str, Any]:
    """Migrate only pre-reference rows with real capture metadata.

    Legacy caches did not retain the raw NetCDF digest.  Their canonical record
    digest is therefore explicitly bound to a legacy-only request contract and
    can never satisfy a current/future pair.
    """
    legacy = validate_legacy_shadow_for_migration(legacy)
    migrated = empty_shadow(production_reference_at)
    lower = production_reference_at - timedelta(hours=RETENTION_HOURS)
    migrated_acquisitions: dict[str, dict[str, Any]] = {}
    migrated_records: dict[str, dict[str, Any]] = {}
    for raw in legacy.get("records") or []:
        try:
            raw = _strict_legacy_record(raw)
            valid_time = _hour(raw.get("validTime"), "legacy record time")
            # Schema 1 did not always persist per-row capture time.  Its
            # cache-level updatedAt is the only persisted acquisition clock in
            # that format.  The legacy-only request contract below makes this
            # provenance limitation explicit and forbids current/future use.
            captured_at = _parse_shadow_time(raw.get("capturedAt") or legacy.get("updatedAt"))
            source = str(raw.get("source") or "")
            target = targets.get(str(raw.get("partId") or "")) if targets is not None else {
                "partId": str(raw.get("partId") or ""),
                "parentZoneId": str(raw.get("parentZoneId") or ""),
                "waterPoint": raw.get("samplingPoint"),
            }
            if (
                not (lower <= valid_time < production_reference_at)
                or captured_at > production_reference_at + timedelta(hours=FUTURE_ACQUISITION_FRESHNESS_HOURS)
                or target is None
            ):
                continue
            contract = COPERNICUS_SOURCE_CONTRACTS[source]
            if tuple(raw.get(key) for key in ("productId", "datasetId", "datasetVersion")) != contract:
                continue
            if not _finite_pair(raw.get("samplingPoint")) or not _finite_pair(raw.get("gridPoint")):
                continue
            canonical_legacy = {key: raw.get(key) for key in sorted(raw) if key != "capturedAt"}
            acquisition = make_acquisition(
                source=source,
                acquisition_at=captured_at,
                request_start_at=valid_time,
                request_end_at=valid_time,
                targets=[target],
                native_valid_times=[valid_time],
                subset_sha256=canonical_sha256({"legacySchemaVersion": 1, "record": canonical_legacy}),
                record_count=1,
                request_contract_id=LEGACY_HISTORY_REQUEST_CONTRACT_ID,
            )
            record = make_record(raw, acquisition, target)
            _validate_acquisition(acquisition)
            _validate_record(record, {acquisition["acquisitionId"]: _validate_acquisition(acquisition)}, targets)
        except (KeyError, TypeError, ValueError):
            continue
        migrated_acquisitions[acquisition["acquisitionId"]] = acquisition
        migrated_records[record["recordId"]] = record
    migrated["acquisitions"] = [migrated_acquisitions[key] for key in sorted(migrated_acquisitions)]
    migrated["records"] = sorted(
        migrated_records.values(),
        key=lambda row: (row["validTime"], row["partId"], row["recordId"]),
    )
    validate_shadow(migrated, targets)
    return migrated


def load_shadow(
    path: Path,
    production_reference_at: datetime | None = None,
    target_identities: dict[str, dict[str, Any]] | None = None,
) -> dict[str, Any]:
    reference = production_reference_at or datetime.now(timezone.utc).replace(minute=0, second=0, microsecond=0)
    if not path.exists():
        return empty_shadow(reference)
    document = json.loads(path.read_text(encoding="utf-8"))
    if (
        isinstance(document.get("schemaVersion"), int)
        and not isinstance(document.get("schemaVersion"), bool)
        and document.get("schemaVersion") == 1
    ):
        if production_reference_at is None:
            raise RuntimeError("Schema-1 Copernicus cache needs a locked production reference for safe history migration")
        try:
            return _migrate_schema1_history(document, reference, target_identities)
        except (TypeError, ValueError) as error:
            raise RuntimeError(f"Invalid legacy Copernicus cache: {error}") from None
    try:
        return validate_shadow(document, target_identities)
    except (TypeError, ValueError) as error:
        raise RuntimeError(f"Invalid schema-2 Copernicus range cache: {error}") from None


def merge_cache_evidence(
    existing: dict[str, Any],
    new_acquisitions: list[dict[str, Any]],
    new_records: list[dict[str, Any]],
    production_reference_at: datetime,
    target_identities: dict[str, dict[str, Any]],
) -> tuple[list[dict[str, Any]], list[dict[str, Any]]]:
    lower = production_reference_at - timedelta(hours=RETENTION_HOURS)
    upper = production_reference_at + timedelta(hours=PUBLIC_END_OFFSET_HOURS)
    acquisitions = {row["acquisitionId"]: row for row in existing.get("acquisitions") or []}
    acquisitions.update({row["acquisitionId"]: row for row in new_acquisitions})
    records: dict[str, dict[str, Any]] = {}
    for row in list(existing.get("records") or []) + list(new_records):
        try:
            valid_time = _hour(row["validTime"], "retained Copernicus record time")
        except (KeyError, TypeError, ValueError):
            continue
        if lower <= valid_time <= upper and _record_matches_target(row, target_identities.get(str(row.get("partId") or ""))):
            records[row["recordId"]] = row
    used_acquisition_ids = {row["acquisitionId"] for row in records.values()}
    retained_acquisitions = [acquisitions[key] for key in sorted(used_acquisition_ids) if key in acquisitions]
    retained_records = sorted(records.values(), key=lambda row: (row["validTime"], row["partId"], row["recordId"]))
    candidate = empty_shadow(production_reference_at)
    candidate["acquisitions"] = retained_acquisitions
    candidate["records"] = retained_records
    validate_shadow(candidate, target_identities)
    return retained_acquisitions, retained_records


def select_required_records(
    required_pairs: list[dict[str, Any]],
    acquisitions: list[dict[str, Any]],
    records: list[dict[str, Any]],
    production_reference_at: datetime,
) -> tuple[list[dict[str, Any]], list[dict[str, str]]]:
    acquisition_by_id = {row["acquisitionId"]: _validate_acquisition(row) for row in acquisitions}
    by_pair: dict[tuple[str, str], list[dict[str, Any]]] = {}
    for record in records:
        by_pair.setdefault((record["partId"], record["validTime"]), []).append(record)
    source_rank = {source: index for index, source in enumerate(COPERNICUS_SOURCE_CONTRACTS)}
    refs: list[dict[str, str]] = []
    missing: list[dict[str, str]] = []
    for pair in sorted(required_pairs, key=lambda row: (row["validTime"], row["partId"])):
        normalized = {"partId": str(pair["partId"]), "validTime": utc_iso(_hour(pair["validTime"], "required pair time"))}
        candidates: list[tuple[int, float, str, dict[str, Any]]] = []
        for record in by_pair.get((normalized["partId"], normalized["validTime"]), []):
            acquisition = acquisition_by_id.get(record["acquisitionId"])
            if acquisition is None:
                continue
            valid_time = _parse_shadow_time(normalized["validTime"])
            freshness = abs((acquisition["_acquisitionAt"] - production_reference_at).total_seconds()) / 3600
            if valid_time >= production_reference_at and freshness > FUTURE_ACQUISITION_FRESHNESS_HOURS:
                continue
            candidates.append((
                source_rank.get(acquisition["source"], len(source_rank)),
                -acquisition["_acquisitionAt"].timestamp(),
                record["recordId"],
                record,
            ))
        if not candidates:
            missing.append(normalized)
            continue
        record = min(candidates)[3]
        acquisition = acquisition_by_id[record["acquisitionId"]]
        refs.append({
            "partId": record["partId"],
            "validTime": record["validTime"],
            "recordId": record["recordId"],
            "acquisitionId": record["acquisitionId"],
            "source": acquisition["source"],
        })
    return refs, missing


def make_coverage_collection(
    *,
    production_reference_at: datetime,
    target_registry_sha256: str,
    dmi_current_input_sha256: str,
    required_pairs: list[dict[str, Any]],
    record_refs: list[dict[str, str]],
    sealed_at: datetime,
) -> dict[str, Any]:
    start, end = range_bounds(production_reference_at)
    canonical_refs = sorted(record_refs, key=lambda row: (row["validTime"], row["partId"]))
    if len(canonical_refs) != len(required_pairs):
        raise RuntimeError("Cannot seal incomplete Copernicus range coverage")
    required_hash = required_pairs_sha256(required_pairs)
    if required_hash != required_pairs_sha256(canonical_refs):
        raise RuntimeError("Copernicus record refs do not match the exact DMI-gap matrix")
    value = {
        "status": "COMPLETE",
        "productionReferenceAt": utc_iso(production_reference_at),
        "rangeStartAt": utc_iso(start),
        "rangeEndAt": utc_iso(end),
        "coldBridgeHours": COLD_BRIDGE_HOURS,
        "publicHourCount": PUBLIC_HOUR_COUNT,
        "targetRegistrySha256": target_registry_sha256,
        "dmiCurrentInputSha256": dmi_current_input_sha256,
        "dmiVerifierContractId": DMI_VERIFIER_CONTRACT_ID,
        "requiredPairsSha256": required_hash,
        "requiredPairCount": len(required_pairs),
        "selectionPolicyId": SELECTION_POLICY_ID,
        "recordRefs": canonical_refs,
        "recordRefsSha256": canonical_sha256(canonical_refs),
        "acquisitionIds": sorted({row["acquisitionId"] for row in canonical_refs}),
        "sealedAt": utc_iso(sealed_at),
    }
    value["collectionId"] = collection_id(value)
    return value


def atomic_write_shadow(
    path: Path,
    *,
    acquisitions: list[dict[str, Any]],
    records: list[dict[str, Any]],
    collection: dict[str, Any],
    updated_at: datetime,
    target_identities: dict[str, dict[str, Any]],
) -> dict[str, Any]:
    document = empty_shadow(updated_at)
    document["acquisitions"] = sorted(acquisitions, key=lambda row: row["acquisitionId"])
    document["collections"] = [collection]
    document["records"] = sorted(records, key=lambda row: (row["validTime"], row["partId"], row["recordId"]))
    validate_shadow(document, target_identities, require_collection=True)
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary = path.with_name(path.name + ".tmp")
    try:
        with temporary.open("w", encoding="utf-8", newline="\n") as handle:
            handle.write(json.dumps(document, ensure_ascii=False, indent=2, allow_nan=False) + "\n")
            handle.flush()
            os.fsync(handle.fileno())
        round_trip = json.loads(temporary.read_text(encoding="utf-8"))
        validate_shadow(round_trip, target_identities, require_collection=True)
        os.replace(temporary, path)
    finally:
        if temporary.exists():
            temporary.unlink()
    return document
