"""Import-safe verification contract for native DMI component evidence.

The bulk producer, gap-matrix builders and audits must call this module rather
than maintaining weaker local interpretations of a verified DMI row.  It has no
ecCodes, network, filesystem or runtime-data dependencies.
"""
from __future__ import annotations

import hashlib
import json
import math
import re
from datetime import datetime, timedelta, timezone
from typing import Any


SPATIAL_PROVENANCE_VERSION = 1
CURRENT_VECTOR_SEMANTICS_VERSION = 3
CURRENT_VECTOR_SELECTION = (
    "nearest-shared-uv-column-across-dmi-collections-then-deepest-valid-layer"
)
CURRENT_PREFERRED_DISTANCE_KM = 3.0
CURRENT_MAX_DISTANCE_KM = 5.0
# DMI documents an approximately 1 km WAM-DW grid and approximately 5 km
# WAM-NSB grid. These hard bounds allow a bounded coastal wet-cell mask margin
# without permitting the generic 24-40 km marine search radii to become
# last-mile wave provenance.
WAM_MAX_DISTANCE_KM = {
    "wam_dw": 2.0,
    "wam_nsb": 8.0,
}

MARINE_COLLECTIONS = frozenset({"dkss_idw", "dkss_nsbs", "dkss_lf"})
COLLECTION_FAMILY = {
    "dkss_idw": "marine",
    "dkss_nsbs": "marine",
    "dkss_lf": "marine",
    "harmonie_dini_sf": "wind",
    "wam_dw": "wave",
    "wam_nsb": "wave",
}
COMPONENT_COLLECTIONS = {
    "current": MARINE_COLLECTIONS,
    "windTail": MARINE_COLLECTIONS,
    "waterLevel": MARINE_COLLECTIONS,
    "waterTemperature": MARINE_COLLECTIONS,
    "wind": frozenset({"harmonie_dini_sf"}),
    "wave": frozenset({"wam_dw", "wam_nsb"}),
}
COMPONENT_FIELD_SET = {
    "current": ("current-u", "current-v"),
    "wind": ("wind-u-10m", "wind-v-10m"),
    "windTail": ("wind-tail-u-10m", "wind-tail-v-10m"),
    "wave": ("significant-wave-height", "dominant-wave-period"),
    "waterLevel": ("sea-mean-deviation",),
    "waterTemperature": ("water-temperature",),
}
COMPONENT_KIND = {
    "current": "ocean-current-vector",
    "wind": "atmospheric-wind-vector",
    "windTail": "marine-wind-tail-vector",
    "wave": "wave-mobilisation-tuple",
    "waterLevel": "marine-water-level-scalar",
    "waterTemperature": "marine-water-temperature-scalar",
}
COMPONENT_SPATIAL_SELECTION = {
    "current": "nearest-shared-grid-cell-no-spatial-interpolation",
    "wind": "nearest-shared-grid-cell-no-spatial-interpolation",
    "windTail": "nearest-shared-grid-cell-no-spatial-interpolation",
    "wave": "nearest-shared-wave-height-period-grid-cell-no-spatial-interpolation",
    "waterLevel": "nearest-valid-grid-cell-no-spatial-interpolation",
    "waterTemperature": "nearest-valid-grid-cell-no-spatial-interpolation",
}
_SHA256 = re.compile(r"[0-9a-f]{64}")
HASH_PREFIX = "sha256:"
CURRENT_ATTESTATION_CONTRACT_ID = "dmi-canonical-part-current-attestation-v2"
CURRENT_OPERATIONAL_LEDGER_CONTRACT_ID = "dmi-official-dkss-operational-current-ledger-v2"
CURRENT_OPERATIONAL_LEDGER_SCHEMA_VERSION = 2
CURRENT_OPERATIONAL_LEDGER_STATES = (
    "EXPECTED",
    "PROCESSED",
    "VERIFIED",
    "UPSTREAM_ABSENT",
    "LOCALLY_SKIPPED",
)
CURRENT_OFFICIAL_ASSET_FIELDS = frozenset({
    "collection", "modelRun", "validTime", "itemId", "assetIdentitySha256",
    "assetSizeBytes", "itemCreatedAt", "itemUpdatedAt",
})
CURRENT_SOURCE_ASSET_FIELDS = frozenset({
    *CURRENT_OFFICIAL_ASSET_FIELDS,
    "acquiredAt", "contentLengthBytes", "contentSha256",
})


def canonical_time(value: Any) -> str | None:
    if value is None:
        return None
    try:
        parsed = datetime.fromisoformat(str(value).replace("Z", "+00:00"))
    except (TypeError, ValueError):
        return None
    if parsed.tzinfo is None:
        return None
    return parsed.astimezone(timezone.utc).isoformat().replace("+00:00", "Z")


def _canonical_json(value: Any) -> str:
    return json.dumps(
        value,
        ensure_ascii=False,
        sort_keys=True,
        separators=(",", ":"),
        allow_nan=False,
    )


def _canonical_sha256(value: Any) -> str:
    return HASH_PREFIX + hashlib.sha256(_canonical_json(value).encode("utf-8")).hexdigest()


def part_time_pairs_sha256(pairs: Any) -> str:
    """Hash a sanitized part/time matrix using the Copernicus pair contract."""
    if not isinstance(pairs, (list, tuple)):
        raise ValueError("Part/time pair matrix must be an array")
    normalized: list[dict[str, str]] = []
    for raw in pairs:
        if not isinstance(raw, dict):
            raise ValueError("Part/time pair row must be an object")
        part_id = str(raw.get("partId") or "").strip()
        valid_time = canonical_time(raw.get("validTime"))
        if not part_id or valid_time is None:
            raise ValueError("Part/time pair identity is invalid")
        normalized.append({"partId": part_id, "validTime": valid_time})
    normalized.sort(key=lambda row: (row["validTime"], row["partId"]))
    identities = [(row["partId"], row["validTime"]) for row in normalized]
    if len(set(identities)) != len(identities):
        raise ValueError("Part/time pair matrix contains duplicates")
    return _canonical_sha256({
        "contractId": "copernicus-required-part-time-pairs-v1",
        "pairs": normalized,
    })


def valid_times_sha256(valid_times: Any) -> str:
    if not isinstance(valid_times, (list, tuple, set, frozenset)):
        raise ValueError("Valid-time ledger must be an array")
    canonical = [canonical_time(value) for value in valid_times]
    if any(value is None for value in canonical):
        raise ValueError("Valid-time ledger contains an invalid time")
    normalized = sorted(str(value) for value in canonical)
    if len(set(normalized)) != len(normalized):
        raise ValueError("Valid-time ledger contains duplicates")
    return _canonical_sha256({
        "contractId": "dmi-official-valid-times-v1",
        "validTimes": normalized,
    })


def verified_source_times_sha256(rows: Any) -> str:
    if not isinstance(rows, (list, tuple)):
        raise ValueError("Verified source-time evidence must be an array")
    normalized: list[dict[str, str]] = []
    for raw in rows:
        if not isinstance(raw, dict):
            raise ValueError("Verified source-time row must be an object")
        collection = str(raw.get("collection") or "").strip()
        model_run = canonical_time(raw.get("modelRun"))
        valid_time = canonical_time(raw.get("validTime"))
        if collection not in MARINE_COLLECTIONS or model_run is None or valid_time is None:
            raise ValueError("Verified source-time identity is invalid")
        normalized.append({
            "collection": collection,
            "modelRun": model_run,
            "validTime": valid_time,
        })
    normalized.sort(key=lambda row: (row["validTime"], row["collection"], row["modelRun"]))
    identities = [
        (row["collection"], row["modelRun"], row["validTime"])
        for row in normalized
    ]
    if len(set(identities)) != len(identities):
        raise ValueError("Verified source-time evidence contains duplicates")
    return _canonical_sha256({
        "contractId": "dmi-verified-source-valid-times-v1",
        "sources": normalized,
    })


def canonical_current_source_asset(source: Any) -> dict[str, Any] | None:
    """Project one native current source to its payload-free asset identity."""
    if not isinstance(source, dict):
        return None
    collection = str(source.get("collection") or "").strip()
    model_run = canonical_time(source.get("modelRun"))
    valid_time = canonical_time(
        source.get("validTime")
        if source.get("validTime") is not None
        else source.get("nativeValidTime")
    )
    item_id = str(source.get("itemId") or "").strip()
    asset_sha256 = str(source.get("assetIdentitySha256") or "")
    asset_size = source.get("assetSizeBytes")
    content_length = source.get("contentLengthBytes")
    content_sha256 = str(source.get("contentSha256") or "")
    acquired_at = canonical_time(source.get("acquiredAt"))
    item_created_at = canonical_time(source.get("itemCreatedAt"))
    item_updated_at = canonical_time(source.get("itemUpdatedAt"))
    if not (
        collection in MARINE_COLLECTIONS
        and model_run
        and valid_time
        and item_id
        and _SHA256.fullmatch(asset_sha256)
        and (
            asset_size is None
            or isinstance(asset_size, int) and not isinstance(asset_size, bool)
            and asset_size > 0
        )
        and isinstance(content_length, int)
        and not isinstance(content_length, bool)
        and content_length > 0
        and _SHA256.fullmatch(content_sha256)
        and (asset_size is None or asset_size == content_length)
        and acquired_at
        and (source.get("itemCreatedAt") is None or item_created_at)
        and (source.get("itemUpdatedAt") is None or item_updated_at)
    ):
        return None
    return {
        "collection": collection,
        "modelRun": model_run,
        "validTime": valid_time,
        "itemId": item_id,
        "assetIdentitySha256": asset_sha256,
        "assetSizeBytes": asset_size,
        "acquiredAt": acquired_at,
        "contentLengthBytes": content_length,
        "contentSha256": content_sha256,
        "itemCreatedAt": item_created_at,
        "itemUpdatedAt": item_updated_at,
    }


def current_pair_sources_sha256(rows: Any) -> str:
    """Hash exact part→selected-source identities, including acquisition."""
    if not isinstance(rows, (list, tuple)):
        raise ValueError("Verified part/source matrix must be an array")
    normalized: list[dict[str, Any]] = []
    for raw in rows:
        if not isinstance(raw, dict):
            raise ValueError("Verified part/source row must be an object")
        part_id = str(raw.get("partId") or "").strip()
        valid_time = canonical_time(raw.get("validTime"))
        source = canonical_current_source_asset(raw.get("source"))
        if not part_id or valid_time is None or source is None or source["validTime"] != valid_time:
            raise ValueError("Verified part/source identity is invalid")
        normalized.append({"partId": part_id, "validTime": valid_time, "source": source})
    normalized.sort(key=lambda row: (row["validTime"], row["partId"], _canonical_json(row["source"])))
    identities = [
        (row["partId"], row["validTime"])
        for row in normalized
    ]
    if len(set(identities)) != len(identities):
        raise ValueError("Verified part/source matrix contains duplicate part-times")
    return _canonical_sha256({
        "contractId": "dmi-verified-part-current-sources-v2",
        "pairs": normalized,
    })


def current_official_assets_sha256(rows: Any) -> str:
    """Hash a selected collection/run's sanitized official STAC identities."""
    if not isinstance(rows, (list, tuple)):
        raise ValueError("Official asset ledger must be an array")
    normalized = sorted(rows, key=lambda row: (str(row.get("validTime") or ""), str(row.get("itemId") or "")))
    return _canonical_sha256({
        "contractId": "dmi-selected-official-assets-v1",
        "assets": normalized,
    })


def _epoch(value: Any) -> float:
    canonical = canonical_time(value)
    if canonical is None:
        return 0.0
    return datetime.fromisoformat(canonical.replace("Z", "+00:00")).timestamp()


def _finite_point(value: Any) -> list[float] | None:
    if not (
        isinstance(value, (list, tuple))
        and len(value) == 2
        and all(isinstance(item, (int, float)) and not isinstance(item, bool) for item in value)
        and all(math.isfinite(float(item)) for item in value)
    ):
        return None
    return [float(value[0]), float(value[1])]


def same_point(first: Any, second: Any, tolerance: float = 1e-7) -> bool:
    left, right = _finite_point(first), _finite_point(second)
    return bool(
        left is not None
        and right is not None
        and all(abs(left[index] - right[index]) <= tolerance for index in range(2))
    )


def haversine_point_km(first: Any, second: Any) -> float | None:
    left, right = _finite_point(first), _finite_point(second)
    if left is None or right is None:
        return None
    longitude1, latitude1 = left
    longitude2, latitude2 = right
    latitude_delta = math.radians(latitude2 - latitude1)
    longitude_delta = math.radians(longitude2 - longitude1)
    a = (
        math.sin(latitude_delta / 2) ** 2
        + math.cos(math.radians(latitude1))
        * math.cos(math.radians(latitude2))
        * math.sin(longitude_delta / 2) ** 2
    )
    return 6371.0088 * 2 * math.atan2(math.sqrt(a), math.sqrt(max(0.0, 1 - a)))


def component_collection_allowed(component: str, collection: str) -> bool:
    return collection in COMPONENT_COLLECTIONS.get(component, ())


def wave_distance_allowed(collection: Any, distance_km: Any) -> bool:
    maximum = WAM_MAX_DISTANCE_KM.get(str(collection or ""))
    return bool(
        maximum is not None
        and isinstance(distance_km, (int, float))
        and not isinstance(distance_km, bool)
        and math.isfinite(float(distance_km))
        and 0 <= float(distance_km) <= maximum
    )


def sampling_identity(zone: dict[str, Any]) -> dict[str, Any] | None:
    entity_id = str(zone.get("id") or "").strip()
    sampling_point = _finite_point([zone.get("lon"), zone.get("lat")])
    if not entity_id or sampling_point is None:
        return None
    if entity_id.startswith("PART::"):
        parent_zone_id = str(zone.get("parentZoneId") or "").strip()
        if not parent_zone_id:
            return None
        entity_type = "coastal-part"
        sampling_context = "coastal-part-water-point"
    elif zone.get("waterSource"):
        parent_zone_id = entity_id
        entity_type = "water-level-source"
        sampling_context = "water-level-source-point"
    elif zone.get("privateStage"):
        parent_zone_id = str(zone.get("parentZoneId") or entity_id)
        entity_type = "private-stage"
        sampling_context = "private-stage-water-point"
    elif zone.get("researchCurrent"):
        parent_zone_id = str(zone.get("parentZoneId") or entity_id)
        entity_type = "private-research"
        sampling_context = "private-research-water-point"
    else:
        parent_zone_id = entity_id
        entity_type = "parent-zone"
        sampling_context = "parent-zone-water-point"
    return {
        "entityId": entity_id,
        "parentZoneId": parent_zone_id,
        "entityType": entity_type,
        "samplingContext": sampling_context,
        "samplingPoint": [round(sampling_point[0], 7), round(sampling_point[1], 7)],
    }


def complete_native_source_for_hour(
    source: Any,
    component: str,
    entity_id: str,
    entity: dict[str, Any],
    valid_time: str,
) -> bool:
    """Verify one component source against one exact entity/native UTC time.

    For a current gap matrix the caller must additionally require finite U and V
    on the same row whose time equals ``valid_time``.  This function verifies the
    complete source, entity, temporal, cell, distance, item and vector proof.
    """
    if not isinstance(source, dict):
        return False
    collection = str(source.get("collection") or "")
    if component not in COMPONENT_FIELD_SET or not component_collection_allowed(component, collection):
        return False
    temporal = canonical_time(valid_time)
    model_run = canonical_time(source.get("modelRun"))
    native_valid = canonical_time(source.get("nativeValidTime"))
    sampling_point = source.get("samplingPoint")
    grid_point = source.get("gridPoint")
    physical_distance = haversine_point_km(sampling_point, grid_point)
    distance = source.get("distanceKm")
    expected_optional = source.get("optionalFieldSet") in ([], ["mean-wave-dir"])
    if component != "wave":
        expected_optional = source.get("optionalFieldSet") == []
    common_valid = bool(
        temporal
        and model_run
        and native_valid == temporal
        and _epoch(native_valid) >= _epoch(model_run)
        and source.get("provider") == "dmi"
        and source.get("fallback") is False
        and source.get("component") == component
        and source.get("componentKind") == COMPONENT_KIND[component]
        and source.get("fieldSet") == list(COMPONENT_FIELD_SET[component])
        and expected_optional
        and source.get("collectionFamily") == COLLECTION_FAMILY.get(collection)
        and source.get("entityId") == entity_id
        and source.get("parentZoneId") == entity.get("parentZoneId")
        and source.get("entityType") == entity.get("entityType")
        and source.get("samplingContext") == entity.get("samplingContext")
        and same_point(sampling_point, entity.get("samplingPoint"))
        and _finite_point(grid_point) is not None
        and _SHA256.fullmatch(str(source.get("gridDefinitionSha256") or ""))
        and isinstance(distance, (int, float))
        and not isinstance(distance, bool)
        and math.isfinite(float(distance))
        and float(distance) >= 0
        and physical_distance is not None
        and math.isclose(float(distance), physical_distance, rel_tol=0, abs_tol=0.02)
        and source.get("spatialSemanticsVersion") == SPATIAL_PROVENANCE_VERSION
        and source.get("spatialSelection") == COMPONENT_SPATIAL_SELECTION[component]
        and isinstance(source.get("leadTimeHours"), (int, float))
        and not isinstance(source.get("leadTimeHours"), bool)
        and math.isfinite(float(source["leadTimeHours"]))
        and math.isclose(
            float(source["leadTimeHours"]),
            (_epoch(native_valid) - _epoch(model_run)) / 3600.0,
            rel_tol=0,
            abs_tol=0.002,
        )
        and str(source.get("itemId") or "").strip()
        and _SHA256.fullmatch(str(source.get("assetIdentitySha256") or ""))
        and canonical_time(source.get("acquiredAt"))
        and (source.get("itemCreatedAt") is None or canonical_time(source.get("itemCreatedAt")))
        and (source.get("itemUpdatedAt") is None or canonical_time(source.get("itemUpdatedAt")))
    )
    if not common_valid:
        return False
    if component == "current":
        return bool(
            canonical_current_source_asset(source) is not None
            and source.get("vectorSelection") == CURRENT_VECTOR_SELECTION
            and source.get("vectorSemanticsVersion") == CURRENT_VECTOR_SEMANTICS_VERSION
            and str(source.get("verticalLayer") or "").strip()
            and isinstance(source.get("verticalLayerRankM"), (int, float))
            and not isinstance(source.get("verticalLayerRankM"), bool)
            and math.isfinite(float(source["verticalLayerRankM"]))
            and float(distance) <= CURRENT_MAX_DISTANCE_KM
        )
    if component in {"wind", "windTail"}:
        return bool(
            source.get("vectorSelection") == "nearest-shared-grid-cell-no-spatial-interpolation"
            and source.get("vectorSemanticsVersion") == 1
        )
    if component == "wave":
        return wave_distance_allowed(collection, distance)
    return True


def _verified_part_current_row(
    row: Any,
    target: Any,
    valid_time: Any,
) -> bool:
    if not isinstance(row, dict) or not isinstance(target, dict):
        return False
    part_id = str(target.get("partId") or "").strip()
    parent_zone_id = str(target.get("parentZoneId") or "").strip()
    sampling_point = _finite_point(target.get("waterPoint"))
    expected_time = canonical_time(valid_time)
    if not part_id or not parent_zone_id or sampling_point is None or expected_time is None:
        return False
    parsed_time = datetime.fromisoformat(expected_time.replace("Z", "+00:00"))
    if parsed_time != parsed_time.replace(minute=0, second=0, microsecond=0):
        return False
    entity_id = f"PART::{part_id}"
    entity = {
        "parentZoneId": parent_zone_id,
        "entityType": "coastal-part",
        "samplingContext": "coastal-part-water-point",
        "samplingPoint": sampling_point,
    }
    current_u, current_v = row.get("current-u"), row.get("current-v")
    if not (
        isinstance(current_u, (int, float))
        and not isinstance(current_u, bool)
        and math.isfinite(float(current_u))
        and isinstance(current_v, (int, float))
        and not isinstance(current_v, bool)
        and math.isfinite(float(current_v))
    ):
        return False
    sources = row.get("sources")
    if not isinstance(sources, dict):
        return False
    source = sources.get("current") or {}
    return complete_native_source_for_hour(
        source,
        "current",
        entity_id,
        entity,
        expected_time,
    )


def _exact_hour_bounds(range_start: Any, range_end: Any) -> tuple[datetime, datetime]:
    start_text, end_text = canonical_time(range_start), canonical_time(range_end)
    if start_text is None or end_text is None:
        raise ValueError("Current attestation range must contain UTC timestamps")
    start = datetime.fromisoformat(start_text.replace("Z", "+00:00"))
    end = datetime.fromisoformat(end_text.replace("Z", "+00:00"))
    if (
        start != start.replace(minute=0, second=0, microsecond=0)
        or end != end.replace(minute=0, second=0, microsecond=0)
        or end < start
    ):
        raise ValueError("Current attestation range must contain inclusive exact UTC hours")
    return start, end


def _matching_verified_part_current_rows(
    document: Any,
    target: Any,
    range_start: Any,
    range_end: Any,
) -> list[tuple[str, dict[str, Any]]]:
    if not isinstance(document, dict) or not isinstance(target, dict):
        return []
    start, end = _exact_hour_bounds(range_start, range_end)
    part_id = str(target.get("partId") or "").strip()
    zones = document.get("zones")
    zone = zones.get(f"PART::{part_id}") if isinstance(zones, dict) else None
    hourly = zone.get("hourly") if isinstance(zone, dict) else None
    if not part_id or not isinstance(hourly, dict):
        return []
    matched: list[tuple[str, dict[str, Any]]] = []
    seen: set[str] = set()
    for key, row in hourly.items():
        if not isinstance(row, dict):
            continue
        # The cache key, public row time and native source time are three
        # independent temporal claims.  None may silently substitute for
        # another; all must canonicalize to the exact same UTC hour.
        key_time = canonical_time(key)
        row_time = canonical_time(row.get("time"))
        if key_time is None or row_time is None or key_time != row_time or row_time in seen:
            continue
        parsed = datetime.fromisoformat(row_time.replace("Z", "+00:00"))
        if (
            parsed != parsed.replace(minute=0, second=0, microsecond=0)
            or parsed < start
            or parsed > end
            or not _verified_part_current_row(row, target, row_time)
        ):
            continue
        seen.add(row_time)
        matched.append((row_time, row))
    matched.sort(key=lambda item: item[0])
    return matched


def verified_part_current_pair(
    document: Any,
    target: Any,
    valid_time: Any,
) -> bool:
    """Verify one finite same-row coastal-part current pair at one UTC hour."""
    expected_time = canonical_time(valid_time)
    if expected_time is None:
        return False
    try:
        return bool(_matching_verified_part_current_rows(
            document,
            target,
            expected_time,
            expected_time,
        ))
    except ValueError:
        return False


def verified_part_current_pair_for_collection(
    document: Any,
    target: Any,
    valid_time: Any,
    collection: Any,
    model_run: Any,
) -> bool:
    """Bind one verified pair to the selected official DKSS run."""
    expected_time = canonical_time(valid_time)
    expected_run = canonical_time(model_run)
    expected_collection = str(collection or "").strip()
    if (
        expected_time is None
        or expected_run is None
        or expected_collection not in MARINE_COLLECTIONS
    ):
        return False
    try:
        rows = _matching_verified_part_current_rows(
            document,
            target,
            expected_time,
            expected_time,
        )
    except ValueError:
        return False
    for _row_time, row in rows:
        source = ((row.get("sources") or {}).get("current") or {})
        if (
            source.get("collection") == expected_collection
            and canonical_time(source.get("modelRun")) == expected_run
        ):
            return True
    return False


def canonical_verified_part_current_attestation(
    document: Any,
    targets: Any,
    range_start: Any,
    range_end: Any,
    allowed_source_assets: Any = None,
) -> dict[str, Any]:
    """Build the one canonical, payload-free current proof used by every gate."""
    start, end = _exact_hour_bounds(range_start, range_end)
    if not isinstance(targets, (list, tuple)):
        raise ValueError("Current attestation targets must be an array")
    normalized_targets: list[tuple[str, dict[str, Any]]] = []
    for target in targets:
        if not isinstance(target, dict):
            raise ValueError("Current attestation target must be an object")
        part_id = str(target.get("partId") or "").strip()
        parent_zone_id = str(target.get("parentZoneId") or "").strip()
        if not part_id or not parent_zone_id or _finite_point(target.get("waterPoint")) is None:
            raise ValueError("Current attestation target identity is invalid")
        normalized_targets.append((part_id, target))
    normalized_targets.sort(key=lambda item: item[0])
    if len({part_id for part_id, _target in normalized_targets}) != len(normalized_targets):
        raise ValueError("Current attestation target ids must be unique")

    allowed_asset_keys: set[str] | None = None
    if allowed_source_assets is not None:
        if not isinstance(allowed_source_assets, (list, tuple)):
            raise ValueError("Selected current source assets must be an array")
        allowed_asset_keys = set()
        for raw in allowed_source_assets:
            source_asset = canonical_current_source_asset(raw)
            if source_asset is None:
                raise ValueError("Selected current source asset is invalid")
            allowed_asset_keys.add(_canonical_json(source_asset))

    verified_pairs: list[dict[str, str]] = []
    verified_pair_sources: list[dict[str, Any]] = []
    source_times: set[tuple[str, str, str]] = set()
    for part_id, target in normalized_targets:
        for valid_time, row in _matching_verified_part_current_rows(
            document,
            target,
            start,
            end,
        ):
            source = ((row.get("sources") or {}).get("current") or {})
            source_asset = canonical_current_source_asset(source)
            if source_asset is None:
                continue
            if allowed_asset_keys is not None and _canonical_json(source_asset) not in allowed_asset_keys:
                continue
            verified_pairs.append({"partId": part_id, "validTime": valid_time})
            verified_pair_sources.append({
                "partId": part_id,
                "validTime": valid_time,
                "source": source_asset,
            })
            source_times.add((source_asset["collection"], source_asset["modelRun"], valid_time))
    verified_pairs.sort(key=lambda row: (row["validTime"], row["partId"]))
    verified_pair_sources.sort(key=lambda row: (row["validTime"], row["partId"]))
    verified_sources = [
        {"collection": collection, "modelRun": model_run, "validTime": valid_time}
        for collection, model_run, valid_time in sorted(
            source_times,
            key=lambda item: (item[2], item[0], item[1]),
        )
    ]
    return {
        "schemaVersion": 2,
        "contractId": CURRENT_ATTESTATION_CONTRACT_ID,
        "rangeStartAt": canonical_time(start),
        "rangeEndAt": canonical_time(end),
        "targetCount": len(normalized_targets),
        "verifiedPairCount": len(verified_pairs),
        "verifiedPairsSha256": part_time_pairs_sha256(verified_pairs),
        "verifiedPairSourcesSha256": current_pair_sources_sha256(verified_pair_sources),
        "verifiedSourceTimeCount": len(verified_sources),
        "verifiedSourceTimesSha256": verified_source_times_sha256(verified_sources),
        "verifiedPairs": verified_pairs,
        "verifiedPairSources": verified_pair_sources,
        "verifiedSourceTimes": verified_sources,
    }


def sanitized_current_attestation(attestation: Any) -> dict[str, Any]:
    """Drop internal pair lists while retaining exact digest/count evidence."""
    if not isinstance(attestation, dict):
        raise ValueError("Current attestation must be an object")
    fields = (
        "schemaVersion",
        "contractId",
        "rangeStartAt",
        "rangeEndAt",
        "targetCount",
        "verifiedPairCount",
        "verifiedPairsSha256",
        "verifiedPairSourcesSha256",
        "verifiedSourceTimeCount",
        "verifiedSourceTimesSha256",
    )
    return {field: attestation.get(field) for field in fields}


def validate_current_attestation(
    attestation: Any,
    targets: Any,
    range_start: Any,
    range_end: Any,
) -> dict[str, Any]:
    """Recompute every v2 list/count/digest claim before ledger acceptance."""
    start, end = _exact_hour_bounds(range_start, range_end)
    if not isinstance(attestation, dict) or set(attestation) != {
        "schemaVersion", "contractId", "rangeStartAt", "rangeEndAt",
        "targetCount", "verifiedPairCount", "verifiedPairsSha256",
        "verifiedPairSourcesSha256", "verifiedSourceTimeCount",
        "verifiedSourceTimesSha256", "verifiedPairs", "verifiedPairSources",
        "verifiedSourceTimes",
    }:
        raise ValueError("DMI current attestation is malformed")
    if (
        attestation.get("schemaVersion") != 2
        or attestation.get("contractId") != CURRENT_ATTESTATION_CONTRACT_ID
        or attestation.get("rangeStartAt") != canonical_time(start)
        or attestation.get("rangeEndAt") != canonical_time(end)
    ):
        raise ValueError("DMI current attestation contract/range mismatch")
    if not isinstance(targets, (list, tuple)):
        raise ValueError("DMI current attestation targets are malformed")
    target_ids: list[str] = []
    for target in targets:
        if not isinstance(target, dict):
            raise ValueError("DMI current attestation target is malformed")
        part_id = str(target.get("partId") or "").strip()
        if (
            not part_id
            or not str(target.get("parentZoneId") or "").strip()
            or _finite_point(target.get("waterPoint")) is None
        ):
            raise ValueError("DMI current attestation target identity is invalid")
        target_ids.append(part_id)
    if len(set(target_ids)) != len(target_ids):
        raise ValueError("DMI current attestation target ids are not unique")
    if attestation.get("targetCount") != len(target_ids):
        raise ValueError("DMI current attestation target count mismatch")
    allowed_target_ids = set(target_ids)

    expected_times: set[str] = set()
    cursor = start
    while cursor <= end:
        expected_times.add(canonical_time(cursor) or "")
        cursor += timedelta(hours=1)
    pairs = attestation.get("verifiedPairs")
    if not isinstance(pairs, list):
        raise ValueError("DMI current attestation pair list is malformed")
    normalized_pairs: list[dict[str, str]] = []
    for raw in pairs:
        if not isinstance(raw, dict) or set(raw) != {"partId", "validTime"}:
            raise ValueError("DMI current attestation pair is malformed")
        part_id = str(raw.get("partId") or "").strip()
        valid_time = canonical_time(raw.get("validTime"))
        if (
            part_id not in allowed_target_ids
            or valid_time not in expected_times
            or raw.get("validTime") != valid_time
        ):
            raise ValueError("DMI current attestation pair is out of range")
        normalized_pairs.append({"partId": part_id, "validTime": valid_time})
    normalized_pairs.sort(key=lambda row: (row["validTime"], row["partId"]))
    if pairs != normalized_pairs:
        raise ValueError("DMI current attestation pair list is not canonical")

    pair_sources = attestation.get("verifiedPairSources")
    if not isinstance(pair_sources, list):
        raise ValueError("DMI current attestation pair/source list is malformed")
    normalized_pair_sources: list[dict[str, Any]] = []
    for raw in pair_sources:
        if not isinstance(raw, dict) or set(raw) != {"partId", "validTime", "source"}:
            raise ValueError("DMI current attestation pair/source row is malformed")
        source_raw = raw.get("source")
        source = canonical_current_source_asset(source_raw)
        part_id = str(raw.get("partId") or "").strip()
        valid_time = canonical_time(raw.get("validTime"))
        if (
            not isinstance(source_raw, dict)
            or set(source_raw) != CURRENT_SOURCE_ASSET_FIELDS
            or source is None
            or part_id not in allowed_target_ids
            or valid_time not in expected_times
            or raw.get("validTime") != valid_time
            or source["validTime"] != valid_time
        ):
            raise ValueError("DMI current attestation pair/source identity is invalid")
        normalized_pair_sources.append({
            "partId": part_id,
            "validTime": valid_time,
            "source": source,
        })
    normalized_pair_sources.sort(key=lambda row: (row["validTime"], row["partId"]))
    if pair_sources != normalized_pair_sources:
        raise ValueError("DMI current attestation pair/source list is not canonical")
    if [
        {"partId": row["partId"], "validTime": row["validTime"]}
        for row in normalized_pair_sources
    ] != normalized_pairs:
        raise ValueError("DMI current attestation pair/source parity mismatch")

    expected_source_times = sorted(
        {
            (
                row["source"]["collection"],
                row["source"]["modelRun"],
                row["validTime"],
            )
            for row in normalized_pair_sources
        },
        key=lambda item: (item[2], item[0], item[1]),
    )
    canonical_source_times = [
        {"collection": collection, "modelRun": model_run, "validTime": valid_time}
        for collection, model_run, valid_time in expected_source_times
    ]
    if attestation.get("verifiedSourceTimes") != canonical_source_times:
        raise ValueError("DMI current attestation source-time list mismatch")
    if (
        attestation.get("verifiedPairCount") != len(normalized_pairs)
        or attestation.get("verifiedPairsSha256")
            != part_time_pairs_sha256(normalized_pairs)
        or attestation.get("verifiedPairSourcesSha256")
            != current_pair_sources_sha256(normalized_pair_sources)
        or attestation.get("verifiedSourceTimeCount") != len(canonical_source_times)
        or attestation.get("verifiedSourceTimesSha256")
            != verified_source_times_sha256(canonical_source_times)
    ):
        raise ValueError("DMI current attestation count/digest mismatch")
    return attestation


def strict_verified_part_current_pair_count(
    document: Any,
    targets: Any,
    range_start: Any,
    range_end: Any,
) -> int:
    """Count strict part/hour pairs in one inclusive exact-hour matrix."""
    try:
        return int(canonical_verified_part_current_attestation(
            document,
            targets,
            range_start,
            range_end,
        )["verifiedPairCount"])
    except (TypeError, ValueError):
        return 0


def processed_source_assets_from_current_operational_ledger(ledger: Any) -> list[dict[str, Any]]:
    """Extract only terminal processed asset proofs for attestation filtering."""
    if not isinstance(ledger, dict):
        return []
    assets: list[dict[str, Any]] = []
    for collection_row in ledger.get("collections") or []:
        if not isinstance(collection_row, dict):
            continue
        for row in collection_row.get("validTimes") or []:
            if (
                isinstance(row, dict)
                and row.get("state") in {"PROCESSED", "VERIFIED"}
            ):
                asset = canonical_current_source_asset(row.get("sourceAsset"))
                if asset is not None:
                    assets.append(asset)
    unique = {_canonical_json(asset): asset for asset in assets}
    return [unique[key] for key in sorted(unique)]


def _canonical_official_current_asset(
    raw: Any,
    collection: str,
    model_run: str | None,
    valid_time: str,
) -> dict[str, Any] | None:
    if not isinstance(raw, dict) or model_run is None:
        return None
    raw_collection = str(raw.get("collection") or "").strip()
    raw_model_run = canonical_time(raw.get("modelRun"))
    raw_valid_time = canonical_time(raw.get("validTime"))
    item_id = str(raw.get("itemId") or "").strip()
    asset_sha256 = str(raw.get("assetIdentitySha256") or "")
    asset_size = raw.get("assetSizeBytes")
    item_created_at = canonical_time(raw.get("itemCreatedAt"))
    item_updated_at = canonical_time(raw.get("itemUpdatedAt"))
    if not (
        raw_collection == collection
        and raw_model_run == model_run
        and raw_valid_time == valid_time
        and item_id
        and _SHA256.fullmatch(asset_sha256)
        and (
            asset_size is None
            or isinstance(asset_size, int) and not isinstance(asset_size, bool)
            and asset_size > 0
        )
        and (raw.get("itemCreatedAt") is None or item_created_at)
        and (raw.get("itemUpdatedAt") is None or item_updated_at)
    ):
        return None
    return {
        "collection": collection,
        "modelRun": model_run,
        "validTime": valid_time,
        "itemId": item_id,
        "assetIdentitySha256": asset_sha256,
        "assetSizeBytes": asset_size,
        "itemCreatedAt": item_created_at,
        "itemUpdatedAt": item_updated_at,
    }


def validate_current_operational_ledger(
    ledger: Any,
    attestation: Any,
    targets: Any,
    range_start: Any,
    range_end: Any,
    target_registry_sha256: Any,
) -> dict[str, Any]:
    """Validate a complete official-DKSS ledger and its exact Cop complement."""
    start, end = _exact_hour_bounds(range_start, range_end)
    if not isinstance(ledger, dict) or not isinstance(attestation, dict):
        raise ValueError("DMI current operational ledger or attestation is missing")
    validate_current_attestation(attestation, targets, start, end)
    if ledger.get("schemaVersion") != CURRENT_OPERATIONAL_LEDGER_SCHEMA_VERSION:
        raise ValueError("DMI current operational ledger schema mismatch")
    if ledger.get("contractId") != CURRENT_OPERATIONAL_LEDGER_CONTRACT_ID:
        raise ValueError("DMI current operational ledger contract mismatch")
    if ledger.get("productionReferenceAt") != canonical_time(start):
        raise ValueError("DMI current operational ledger start mismatch")
    if ledger.get("operationalRangeEndAt") != canonical_time(end):
        raise ValueError("DMI current operational ledger end mismatch")
    expected_times: list[str] = []
    cursor = start
    while cursor <= end:
        expected_times.append(canonical_time(cursor) or "")
        cursor += timedelta(hours=1)
    if ledger.get("hourCount") != len(expected_times):
        raise ValueError("DMI current operational ledger hour count mismatch")
    if ledger.get("targetCount") != len(targets or []):
        raise ValueError("DMI current operational ledger target count mismatch")
    if ledger.get("targetRegistrySha256") != target_registry_sha256:
        raise ValueError("DMI current operational ledger registry binding mismatch")
    if ledger.get("attestation") != sanitized_current_attestation(attestation):
        raise ValueError("DMI current operational ledger attestation mismatch")

    collections = ledger.get("collections")
    if not isinstance(collections, list) or [row.get("collection") for row in collections if isinstance(row, dict)] != sorted(MARINE_COLLECTIONS):
        raise ValueError("DMI current operational collection ledger is incomplete")
    pair_source_evidence = {
        _canonical_json(source)
        for row in (attestation.get("verifiedPairSources") or [])
        if isinstance(row, dict)
        for source in [canonical_current_source_asset(row.get("source"))]
        if source is not None
    }
    state_by_collection: dict[str, dict[str, dict[str, Any]]] = {}
    for collection_row in collections:
        if not isinstance(collection_row, dict):
            raise ValueError("DMI current operational collection row is malformed")
        collection = str(collection_row.get("collection") or "")
        model_run = canonical_time(collection_row.get("modelRun"))
        rows = collection_row.get("validTimes")
        if not isinstance(rows, list) or len(rows) != len(expected_times):
            raise ValueError("DMI current operational valid-time ledger is incomplete")
        if [row.get("validTime") for row in rows if isinstance(row, dict)] != expected_times:
            raise ValueError("DMI current operational valid-time ledger is not canonical")
        states: dict[str, dict[str, Any]] = {}
        official_assets: list[dict[str, Any]] = []
        for row in rows:
            if not isinstance(row, dict) or set(row) != {
                "validTime", "state", "officialAsset", "sourceAsset",
            }:
                raise ValueError("DMI current operational valid-time row is malformed")
            state = str(row.get("state") or "")
            valid_time = str(row.get("validTime") or "")
            if state not in CURRENT_OPERATIONAL_LEDGER_STATES:
                raise ValueError("DMI current operational valid-time state is invalid")
            raw_official_asset = row.get("officialAsset")
            raw_source_asset = row.get("sourceAsset")
            if raw_official_asset is not None and (
                not isinstance(raw_official_asset, dict)
                or set(raw_official_asset) != CURRENT_OFFICIAL_ASSET_FIELDS
            ):
                raise ValueError("DMI official asset ledger is not sanitized")
            if raw_source_asset is not None and (
                not isinstance(raw_source_asset, dict)
                or set(raw_source_asset) != CURRENT_SOURCE_ASSET_FIELDS
            ):
                raise ValueError("DMI processed source ledger is not sanitized")
            official_asset = _canonical_official_current_asset(
                raw_official_asset, collection, model_run, valid_time,
            )
            source_asset = canonical_current_source_asset(raw_source_asset)
            if state == "UPSTREAM_ABSENT":
                if official_asset is not None or source_asset is not None:
                    raise ValueError("DMI upstream-absent state contains local asset evidence")
            elif state in {"PROCESSED", "VERIFIED"}:
                if official_asset is None or source_asset is None:
                    raise ValueError("DMI processed state lacks exact official/source asset evidence")
                if (
                    source_asset["collection"] != collection
                    or source_asset["modelRun"] != model_run
                    or source_asset["validTime"] != valid_time
                    or source_asset["itemId"] != official_asset["itemId"]
                    or source_asset["assetIdentitySha256"] != official_asset["assetIdentitySha256"]
                    or source_asset["assetSizeBytes"] != official_asset["assetSizeBytes"]
                    or source_asset["itemCreatedAt"] != official_asset["itemCreatedAt"]
                    or source_asset["itemUpdatedAt"] != official_asset["itemUpdatedAt"]
                ):
                    raise ValueError("DMI processed source does not match the selected official asset")
                if state == "VERIFIED" and _canonical_json(source_asset) not in pair_source_evidence:
                    raise ValueError("DMI current VERIFIED state has no canonical pair/source evidence")
            elif state == "EXPECTED" and source_asset is not None:
                raise ValueError("DMI expected state may not claim processed source evidence")
            elif state == "LOCALLY_SKIPPED" and source_asset is not None:
                raise ValueError("DMI locally-skipped state may not claim processed source evidence")
            if official_asset is not None:
                official_assets.append(official_asset)
            states[valid_time] = {
                "state": state,
                "officialAsset": official_asset,
                "sourceAsset": source_asset,
            }
        counts = {
            state: sum(value["state"] == state for value in states.values())
            for state in CURRENT_OPERATIONAL_LEDGER_STATES
        }
        if collection_row.get("stateCounts") != counts:
            raise ValueError("DMI current operational state counts mismatch")
        official_times = sorted(asset["validTime"] for asset in official_assets)
        if (
            collection_row.get("officialValidTimeCount") != len(official_times)
            or collection_row.get("officialValidTimesSha256") != valid_times_sha256(official_times)
            or collection_row.get("officialAssetsSha256")
                != current_official_assets_sha256(official_assets)
        ):
            raise ValueError("DMI current official valid-time identity mismatch")
        state_by_collection[collection] = states

    for valid_time in expected_times:
        states = [
            state_by_collection[collection][valid_time]["state"]
            for collection in sorted(MARINE_COLLECTIONS)
        ]
        if any(state in {"EXPECTED", "LOCALLY_SKIPPED"} for state in states):
            raise ValueError("DMI current ledger contains unfinished local work")
        if not all(state == "UPSTREAM_ABSENT" for state in states) and "VERIFIED" not in states:
            raise ValueError("DMI current ledger has a systemic official-time collapse")

    for raw in attestation.get("verifiedPairSources") or []:
        if not isinstance(raw, dict):
            raise ValueError("DMI canonical pair/source evidence is malformed")
        source = canonical_current_source_asset(raw.get("source"))
        if source is None:
            raise ValueError("DMI canonical pair/source identity is invalid")
        state_row = state_by_collection.get(source["collection"], {}).get(source["validTime"])
        if (
            not state_row
            or state_row["state"] != "VERIFIED"
            or state_row["sourceAsset"] != source
        ):
            raise ValueError("DMI pair/source is not bound to a selected processed ledger state")

    if not isinstance(targets, (list, tuple)):
        raise ValueError("DMI current operational targets are malformed")
    target_ids = sorted(str(target.get("partId") or "").strip() for target in targets if isinstance(target, dict))
    if (
        len(target_ids) != len(targets)
        or len(set(target_ids)) != len(target_ids)
        or any(not part_id for part_id in target_ids)
    ):
        raise ValueError("DMI current operational target ids are invalid")
    verified_identities = {
        (str(row.get("partId") or ""), canonical_time(row.get("validTime")))
        for row in (attestation.get("verifiedPairs") or [])
        if isinstance(row, dict)
    }
    expected_upstream_absence = [
        {"partId": part_id, "validTime": valid_time}
        for valid_time in expected_times
        if all(
            state_by_collection[collection][valid_time]["state"]
                == "UPSTREAM_ABSENT"
            for collection in sorted(MARINE_COLLECTIONS)
        )
        for part_id in target_ids
    ]
    upstream_absence_identities = {
        (row["partId"], row["validTime"])
        for row in expected_upstream_absence
    }
    expected_identities = {
        (part_id, valid_time)
        for valid_time in expected_times
        for part_id in target_ids
    }
    if (
        verified_identities & upstream_absence_identities
        or (verified_identities | upstream_absence_identities) != expected_identities
    ):
        raise ValueError(
            "DMI current ledger contains an unverified part/time without exact upstream absence"
        )
    if (
        ledger.get("upstreamAbsencePairs") != expected_upstream_absence
        or ledger.get("upstreamAbsencePairCount") != len(expected_upstream_absence)
        or ledger.get("upstreamAbsencePairsSha256")
            != part_time_pairs_sha256(expected_upstream_absence)
    ):
        raise ValueError("DMI current upstream-absence proof is not exact")
    complement = ledger.get("operationalComplementPairs")
    if complement != expected_upstream_absence:
        raise ValueError("DMI current operational complement is not exact")
    if (
        ledger.get("operationalComplementPairCount") != len(expected_upstream_absence)
        or ledger.get("operationalComplementPairsSha256")
            != part_time_pairs_sha256(expected_upstream_absence)
    ):
        raise ValueError("DMI current operational complement identity mismatch")
    if ledger.get("ready") is not True or ledger.get("failureCodes") != []:
        raise ValueError("DMI current operational ledger is not ready")
    return ledger


def current_operational_ledger_ready(
    ledger: Any,
    attestation: Any,
    targets: Any,
    range_start: Any,
    range_end: Any,
    target_registry_sha256: Any,
) -> bool:
    try:
        validate_current_operational_ledger(
            ledger,
            attestation,
            targets,
            range_start,
            range_end,
            target_registry_sha256,
        )
        return True
    except (TypeError, ValueError):
        return False


verified_native_component_source = complete_native_source_for_hour
