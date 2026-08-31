"""Import-safe verification contract for native DMI component evidence.

The bulk producer, gap-matrix builders and audits must call this module rather
than maintaining weaker local interpretations of a verified DMI row.  It has no
ecCodes, network, filesystem or runtime-data dependencies.
"""
from __future__ import annotations

import math
import re
from datetime import datetime, timezone
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
            source.get("vectorSelection") == CURRENT_VECTOR_SELECTION
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


def verified_part_current_pair(
    document: Any,
    target: Any,
    valid_time: Any,
) -> bool:
    """Verify one finite same-row coastal-part current pair at one UTC hour."""
    if not isinstance(document, dict) or not isinstance(target, dict):
        return False
    part_id = str(target.get("partId") or "").strip()
    expected_time = canonical_time(valid_time)
    if not part_id or expected_time is None:
        return False
    zones = document.get("zones")
    if not isinstance(zones, dict):
        return False
    zone = zones.get(f"PART::{part_id}") or {}
    if not isinstance(zone, dict):
        return False
    hourly = zone.get("hourly") or {}
    if not isinstance(hourly, dict):
        return False
    for key, row in hourly.items():
        if not isinstance(row, dict) or canonical_time(row.get("time") or key) != expected_time:
            continue
        if _verified_part_current_row(row, target, expected_time):
            return True
    return False


def strict_verified_part_current_pair_count(
    document: Any,
    targets: Any,
    range_start: Any,
    range_end: Any,
) -> int:
    """Count strict part/hour pairs in one inclusive exact-hour matrix."""
    start_text, end_text = canonical_time(range_start), canonical_time(range_end)
    if start_text is None or end_text is None or not isinstance(targets, (list, tuple)):
        return 0
    start = datetime.fromisoformat(start_text.replace("Z", "+00:00"))
    end = datetime.fromisoformat(end_text.replace("Z", "+00:00"))
    if (
        start != start.replace(minute=0, second=0, microsecond=0)
        or end != end.replace(minute=0, second=0, microsecond=0)
        or end < start
    ):
        return 0
    count = 0
    zones = document.get("zones") if isinstance(document, dict) else {}
    if not isinstance(zones, dict):
        return 0
    for target in targets:
        if not isinstance(target, dict):
            continue
        part_id = str(target.get("partId") or "").strip()
        zone = zones.get(f"PART::{part_id}") or {}
        if not isinstance(zone, dict):
            continue
        hourly = zone.get("hourly") or {}
        if not isinstance(hourly, dict):
            continue
        verified_times: set[str] = set()
        for key, row in hourly.items():
            if not isinstance(row, dict):
                continue
            row_time = canonical_time(row.get("time") or key)
            if row_time is None or row_time in verified_times:
                continue
            parsed = datetime.fromisoformat(row_time.replace("Z", "+00:00"))
            if (
                parsed != parsed.replace(minute=0, second=0, microsecond=0)
                or parsed < start
                or parsed > end
            ):
                continue
            if _verified_part_current_row(row, target, row_time):
                verified_times.add(row_time)
        count += len(verified_times)
    return count


verified_native_component_source = complete_native_source_for_hour
