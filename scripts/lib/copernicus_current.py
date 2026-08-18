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
            "records": [],
        }
    document = json.loads(path.read_text(encoding="utf-8"))
    if int(document.get("schemaVersion") or 0) != 1:
        raise RuntimeError("Unsupported Copernicus shadow schema")
    return document


def update_shadow(path: Path, records: list[dict[str, Any]], now: datetime) -> dict[str, Any]:
    document = load_shadow(path)
    cutoff = now.astimezone(timezone.utc) - timedelta(hours=RETENTION_HOURS)
    retained: dict[tuple[Any, ...], dict[str, Any]] = {}
    for record in list(document.get("records") or []) + records:
        try:
            valid_time = datetime.fromisoformat(str(record["validTime"]).replace("Z", "+00:00"))
        except (KeyError, TypeError, ValueError):
            continue
        if valid_time < cutoff:
            continue
        key = (
            record.get("partId"), record.get("source"), record.get("datasetId"),
            record.get("validTime"), tuple(record.get("gridPoint") or []), record.get("verticalLayerM"),
        )
        retained[key] = record
    document.update({
        "retentionHours": RETENTION_HOURS,
        "scoreImpact": False,
        "publicRuntime": False,
        "updatedAt": utc_iso(now),
        "records": sorted(retained.values(), key=lambda row: (row.get("validTime", ""), row.get("partId", ""), row.get("source", ""))),
    })
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(document, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    return document
