"""Pure selection and retention helpers for the private Copernicus current pilot.

The public RavRadar runtime must not import this module.  It deliberately keeps
the external source behind a separate, score-neutral workflow until live
availability and provenance have been verified over several model runs.
"""
from __future__ import annotations

import json
import math
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any

import numpy as np


RETENTION_HOURS = 168
LOCAL_MAX_DISTANCE_KM = 5.0


def utc_iso(value: Any) -> str:
    """Return a stable UTC timestamp for datetime/numpy/xarray values."""
    if isinstance(value, np.datetime64):
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
    targets: list[dict[str, Any]] = []
    for parent_zone_id, raw_parts in (document.get("zones") or {}).items():
        parts = raw_parts if isinstance(raw_parts, list) else [raw_parts]
        for part in parts:
            point = part.get("waterPoint")
            if not (isinstance(point, list) and len(point) >= 2):
                continue
            lon, lat = float(point[0]), float(point[1])
            if not (math.isfinite(lon) and math.isfinite(lat)):
                continue
            targets.append({
                "partId": str(part.get("partId") or ""),
                "parentZoneId": str(part.get("sourceZoneId") or parent_zone_id),
                "name": str(part.get("name") or part.get("partId") or ""),
                "waterPoint": [lon, lat],
            })
    targets.sort(key=lambda row: (row["parentZoneId"], row["partId"]))
    expected = int(document.get("partCount") or len(targets))
    if len(targets) != expected:
        raise RuntimeError(f"Coastal-part target count mismatch: {len(targets)} != {expected}")
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


def safe_record(record: dict[str, Any]) -> dict[str, Any]:
    """Remove the raw vector while preserving auditable source geometry."""
    return {key: value for key, value in record.items() if key not in {"uMps", "vMps"}}


def safe_shadow_summary(document: dict[str, Any]) -> dict[str, Any]:
    """Aggregate multi-run stability without exposing any current vector."""
    records = list(document.get("records") or [])
    by_source: dict[str, list[dict[str, Any]]] = {}
    by_target_source: dict[tuple[str, str], list[dict[str, Any]]] = {}
    for record in records:
        source = str(record.get("source") or "unknown")
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
            "gridPointCount": len(grids),
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
    target_rows = []
    for (part_id, source), rows in sorted(by_target_source.items()):
        first = rows[0]
        target_rows.append({
            "partId": part_id,
            "parentZoneId": first.get("parentZoneId"),
            "name": first.get("name"),
            "source": source,
            **stability(rows),
        })
    valid_times = sorted({str(row.get("validTime")) for row in records if row.get("validTime")})
    return {
        "recordCount": len(records),
        "validTimeCount": len(valid_times),
        "firstValidTime": valid_times[0] if valid_times else None,
        "lastValidTime": valid_times[-1] if valid_times else None,
        "uniqueTargetCount": len({str(row.get("partId") or "") for row in records}),
        "targetSourcePairCount": len(target_rows),
        "gridUnstableTargetSourceCount": sum(row["gridPointCount"] > 1 for row in target_rows),
        "layerUnstableTargetSourceCount": sum(row["verticalLayerCount"] > 1 for row in target_rows),
        "sources": source_rows,
        "targets": target_rows,
    }


def load_shadow(path: Path) -> dict[str, Any]:
    if not path.exists():
        return {
            "schemaVersion": 1,
            "retentionHours": RETENTION_HOURS,
            "scoreImpact": False,
            "publicRuntime": False,
            "collections": [],
            "records": [],
        }
    document = json.loads(path.read_text(encoding="utf-8"))
    if int(document.get("schemaVersion") or 0) != 1:
        raise RuntimeError("Unsupported Copernicus shadow schema")
    return document


def _parse_shadow_time(value: Any) -> datetime:
    parsed = datetime.fromisoformat(str(value).replace("Z", "+00:00"))
    if parsed.tzinfo is None:
        raise ValueError("Copernicus shadow time must include a timezone")
    return parsed.astimezone(timezone.utc)


def _finite_pair(value: Any) -> bool:
    return (
        isinstance(value, (list, tuple))
        and len(value) == 2
        and all(isinstance(item, (int, float)) and math.isfinite(float(item)) for item in value)
    )


def _validate_shadow_record(record: Any) -> datetime:
    """Validate the minimum raw evidence contract before private retention."""
    if not isinstance(record, dict):
        raise ValueError("record is not an object")
    for field in ("partId", "source", "datasetId"):
        if not str(record.get(field) or "").strip():
            raise ValueError(f"record is missing {field}")
    if not _finite_pair(record.get("samplingPoint")) or not _finite_pair(record.get("gridPoint")):
        raise ValueError("record has invalid sampling or grid coordinates")
    for field in ("distanceKm", "verticalLayerM", "uMps", "vMps"):
        value = record.get(field)
        if not isinstance(value, (int, float)) or not math.isfinite(float(value)):
            raise ValueError(f"record has invalid {field}")
    if float(record["distanceKm"]) < 0 or float(record["distanceKm"]) > LOCAL_MAX_DISTANCE_KM + 1e-9:
        raise ValueError("record exceeds the local Copernicus distance limit")
    if record.get("componentPair") != "same-time-cell-layer" or record.get("interpolation") is not False:
        raise ValueError("record violates the same-time/cell/layer contract")
    return _parse_shadow_time(record.get("validTime"))


def _validate_fingerprint(value: Any) -> str:
    text = str(value or "")
    prefix = "sha256:"
    digest = text[len(prefix):] if text.startswith(prefix) else ""
    if len(digest) != 64 or any(character not in "0123456789abcdef" for character in digest):
        raise ValueError("target fingerprint is invalid")
    return text


def _validate_collection(collection: Any) -> tuple[datetime, str, int, list[str] | None]:
    if not isinstance(collection, dict):
        raise ValueError("collection is not an object")
    valid_time = _parse_shadow_time(collection.get("validTime"))
    fingerprint = _validate_fingerprint(collection.get("targetFingerprint"))
    record_count = collection.get("recordCount")
    if not isinstance(record_count, int) or record_count < 0:
        raise ValueError("collection record count must be non-negative")
    raw_part_ids = collection.get("targetPartIds")
    target_part_ids: list[str] | None = None
    if raw_part_ids is not None:
        if not isinstance(raw_part_ids, list):
            raise ValueError("collection target ids must be a list")
        target_part_ids = [str(value or "").strip() for value in raw_part_ids]
        if any(not value for value in target_part_ids) or len(target_part_ids) != len(set(target_part_ids)):
            raise ValueError("collection target ids must be non-empty and unique")
        target_part_ids.sort()
    if record_count == 0 and target_part_ids != []:
        raise ValueError("only an explicit empty target set may have no records")
    return valid_time, fingerprint, record_count, target_part_ids


def update_shadow(
    path: Path,
    records: list[dict[str, Any]],
    now: datetime,
    *,
    collection_time: datetime | None = None,
    target_fingerprint: str | None = None,
    target_points: dict[str, list[float]] | None = None,
    target_part_ids: list[str] | None = None,
) -> dict[str, Any]:
    document = load_shadow(path)
    if now.tzinfo is None:
        raise ValueError("Copernicus shadow update time must include a timezone")
    now_utc = now.astimezone(timezone.utc)
    cutoff = now_utc - timedelta(hours=RETENTION_HOURS)
    collection_metadata = (collection_time, target_fingerprint, target_points)
    if any(value is not None for value in collection_metadata) and not all(value is not None for value in collection_metadata):
        raise ValueError("Collection time, target fingerprint and target points must be supplied together")
    collection_time_utc = None
    if collection_time is not None:
        if collection_time.tzinfo is None:
            raise ValueError("Copernicus collection time must include a timezone")
        collection_time_utc = collection_time.astimezone(timezone.utc)
        _validate_fingerprint(target_fingerprint)
        if collection_time_utc < cutoff or collection_time_utc > now_utc:
            raise RuntimeError("Copernicus collection time is outside the 168-hour retention window")
        selected_part_ids = sorted(target_part_ids if target_part_ids is not None else target_points)
        if len(selected_part_ids) != len(set(selected_part_ids)) or any(part_id not in target_points for part_id in selected_part_ids):
            raise RuntimeError("Copernicus collection target ids do not match authoritative central geometry")
        if not records and selected_part_ids:
            raise RuntimeError("A completed Copernicus collection must contain verified records")
    retained: dict[tuple[Any, ...], dict[str, Any]] = {}
    existing_records = list(document.get("records") or [])
    for index, record in enumerate(existing_records + records):
        try:
            valid_time = _validate_shadow_record(record)
        except (TypeError, ValueError) as error:
            if index >= len(existing_records):
                raise RuntimeError(f"New Copernicus shadow record failed validation: {error}") from None
            continue  # damaged restored evidence is discarded rather than reused
        if valid_time < cutoff or valid_time > now_utc:
            if index >= len(existing_records):
                raise RuntimeError("New Copernicus shadow record is outside the 168-hour retention window")
            continue
        if target_points is not None:
            expected_point = target_points.get(str(record.get("partId") or ""))
            actual_point = record.get("samplingPoint")
            same_sampling_point = (
                expected_point is not None
                and _finite_pair(actual_point)
                and tuple(round(float(value), 7) for value in actual_point)
                == tuple(round(float(value), 7) for value in expected_point)
            )
            if not same_sampling_point:
                if index >= len(existing_records):
                    raise RuntimeError("New Copernicus record does not match the current central sampling point")
                continue  # a moved or removed central point invalidates its retained history
        if collection_time_utc is not None:
            if index < len(existing_records) and valid_time == collection_time_utc:
                continue  # replace the whole hour when authoritative target geometry changed
            if index >= len(existing_records) and valid_time != collection_time_utc:
                raise RuntimeError("New Copernicus record does not match the declared collection hour")
        key = (
            record.get("partId"), record.get("source"), record.get("datasetId"),
            record.get("validTime"), tuple(record.get("gridPoint") or []), record.get("verticalLayerM"),
        )
        retained[key] = record
    collections: dict[str, dict[str, Any]] = {}
    existing_collections = document.get("collections") or []
    if not isinstance(existing_collections, list):
        existing_collections = []
    for collection in existing_collections:
        try:
            valid_time, _fingerprint, record_count, _target_part_ids = _validate_collection(collection)
        except (TypeError, ValueError):
            continue
        valid_time_text = utc_iso(valid_time)
        actual_count = sum(row.get("validTime") == valid_time_text for row in retained.values())
        if cutoff <= valid_time <= now_utc and actual_count == record_count:
            collections[utc_iso(valid_time)] = collection
    if collection_time_utc is not None:
        valid_time_text = utc_iso(collection_time_utc)
        collected_records = [row for row in retained.values() if row.get("validTime") == valid_time_text]
        collected_part_ids = {str(row.get("partId") or "") for row in collected_records}
        if not collected_part_ids.issubset(set(selected_part_ids)):
            raise RuntimeError("Copernicus collection contains a record outside its selected target set")
        collections[valid_time_text] = {
            "validTime": valid_time_text,
            "targetFingerprint": target_fingerprint,
            "targetPartIds": selected_part_ids,
            "recordCount": len(collected_records),
            "uniqueTargetCount": len({str(row.get("partId") or "") for row in collected_records}),
        }
    document.update({
        "retentionHours": RETENTION_HOURS,
        "scoreImpact": False,
        "publicRuntime": False,
        "updatedAt": utc_iso(now_utc),
        "collections": [collections[key] for key in sorted(collections)],
        "records": sorted(retained.values(), key=lambda row: (row.get("validTime", ""), row.get("partId", ""), row.get("source", ""))),
    })
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(document, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    return document
