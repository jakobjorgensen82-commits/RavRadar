"""Private, score-neutral seven-day current-field research sampling.

The public product keeps one verified nearshore current per forecast entity.
This module reuses the already downloaded DKSS GRIB fields to retain a small
private comparison set along seaward transects. It never writes score input or
public runtime data.
"""
from __future__ import annotations

from datetime import datetime, timezone
import json
import math
import pathlib
from typing import Any


SCHEMA_VERSION = 1
RETENTION_HOURS = 7 * 24
DISTANCE_BANDS_KM = (0.0, 5.0, 15.0)
FORECAST_LEAD_MAX_HOURS = 12.0
MAX_GRID_DISTANCE_KM = 5.0


def _epoch(value: Any) -> float:
    try:
        return datetime.fromisoformat(str(value).replace("Z", "+00:00")).timestamp()
    except (TypeError, ValueError):
        return 0.0


def destination_point(origin: list[float], bearing_deg: float, distance_km: float) -> list[float]:
    """Move from ``origin`` on a spherical Earth."""
    radius_km = 6371.0088
    lon1, lat1 = map(math.radians, (float(origin[0]), float(origin[1])))
    bearing = math.radians(float(bearing_deg))
    angular = float(distance_km) / radius_km
    lat2 = math.asin(
        math.sin(lat1) * math.cos(angular)
        + math.cos(lat1) * math.sin(angular) * math.cos(bearing)
    )
    lon2 = lon1 + math.atan2(
        math.sin(bearing) * math.sin(angular) * math.cos(lat1),
        math.cos(angular) - math.sin(lat1) * math.sin(lat2),
    )
    return [round(math.degrees(lon2), 7), round(math.degrees(lat2), 7)]


def bearing_degrees(start: list[float], end: list[float]) -> float:
    lon1, lat1, lon2, lat2 = map(
        math.radians,
        (float(start[0]), float(start[1]), float(end[0]), float(end[1])),
    )
    delta_lon = lon2 - lon1
    y = math.sin(delta_lon) * math.cos(lat2)
    x = math.cos(lat1) * math.sin(lat2) - math.sin(lat1) * math.cos(lat2) * math.cos(delta_lon)
    return (math.degrees(math.atan2(y, x)) + 360.0) % 360.0


def haversine_km(first: list[float], second: list[float]) -> float:
    lon1, lat1, lon2, lat2 = map(
        math.radians,
        (float(first[0]), float(first[1]), float(second[0]), float(second[1])),
    )
    delta_lat = lat2 - lat1
    delta_lon = lon2 - lon1
    term = (
        math.sin(delta_lat / 2.0) ** 2
        + math.cos(lat1) * math.cos(lat2) * math.sin(delta_lon / 2.0) ** 2
    )
    return 6371.0088 * 2.0 * math.atan2(math.sqrt(term), math.sqrt(1.0 - term))


def build_rotating_targets(
    part_document: dict[str, Any],
    zone_coast_types: dict[str, str],
    cursor: int = 0,
    parts_per_run: int = 15,
) -> tuple[list[dict[str, Any]], int, list[str]]:
    """Build a bounded rotating set of near/transition/offshore targets."""
    parts: list[tuple[str, dict[str, Any]]] = []
    for parent_zone_id, rows in sorted((part_document.get("zones") or {}).items()):
        for part in rows or []:
            part_id = str(part.get("partId") or "")
            land = part.get("landPoint")
            water = part.get("waterPoint")
            if not part_id or not _valid_point(land) or not _valid_point(water):
                continue
            parts.append((str(parent_zone_id), part))
    parts.sort(key=lambda item: str(item[1].get("partId")))
    if not parts:
        return [], 0, []
    count = min(len(parts), max(1, int(parts_per_run)))
    start = int(cursor) % len(parts)
    selected = [parts[(start + offset) % len(parts)] for offset in range(count)]
    targets: list[dict[str, Any]] = []
    selected_ids: list[str] = []
    for parent_zone_id, part in selected:
        part_id = str(part["partId"])
        selected_ids.append(part_id)
        land = [float(part["landPoint"][0]), float(part["landPoint"][1])]
        water = [float(part["waterPoint"][0]), float(part["waterPoint"][1])]
        bearing = bearing_degrees(land, water)
        for band_km in DISTANCE_BANDS_KM:
            target = water if band_km == 0 else destination_point(water, bearing, band_km)
            band_label = str(int(band_km))
            targets.append({
                "id": f"RESEARCH::{part_id}::{band_label}km",
                "lon": float(target[0]),
                "lat": float(target[1]),
                "coastType": zone_coast_types.get(parent_zone_id, "east"),
                "researchCurrent": True,
                "partId": part_id,
                "parentZoneId": parent_zone_id,
                "bandKm": band_km,
                "targetPoint": [round(float(target[0]), 7), round(float(target[1]), 7)],
                "sourceWaterPoint": [round(water[0], 7), round(water[1], 7)],
                "seawardBearingDeg": round(bearing, 3),
            })
    return targets, (start + count) % len(parts), selected_ids


def eligible_replay_assets(
    assets: list[dict[str, Any]],
    captured_at: str,
    max_assets: int = 5,
) -> list[dict[str, Any]]:
    """Select cached forecast steps that can add useful research profiles.

    Ordinary workflow runs must be able to advance the geographic rotation even
    when DMI has not published a new model generation.  The caller still checks
    that the corresponding GRIB file exists locally; this helper only applies the
    same honest time window as :func:`record_profiles` and bounds replay work.
    """
    captured_epoch = _epoch(captured_at)
    if not captured_epoch:
        return []
    lower = captured_epoch - 3600
    upper = captured_epoch + FORECAST_LEAD_MAX_HOURS * 3600
    eligible = [
        asset for asset in assets
        if lower <= _epoch(asset.get("valid")) <= upper
    ]
    eligible.sort(key=lambda asset: (_epoch(asset.get("valid")), str(asset.get("href") or "")))
    limit = max(1, int(max_assets))
    if len(eligible) <= limit:
        return eligible
    if limit == 1:
        return [eligible[-1]]
    # Preserve the near-term and far edge of the honest +12 h window instead of
    # selecting only the first hourly steps.  A small evenly spaced set gives
    # better research spread and lets one retained far-edge asset remain usable
    # across many ordinary workflow runs.
    indices = [round(index * (len(eligible) - 1) / (limit - 1)) for index in range(limit)]
    return [eligible[index] for index in indices]


def _valid_point(value: Any) -> bool:
    return (
        isinstance(value, list)
        and len(value) >= 2
        and all(isinstance(number, (int, float)) and math.isfinite(float(number)) for number in value[:2])
    )


def representative_profile(choices: list[dict[str, Any]]) -> dict[str, Any] | None:
    """Return representative layers at the single nearest shared U/V column."""
    if not choices:
        return None
    nearest = min(
        choices,
        key=lambda row: (float(row["distanceKm"]), tuple(row["pointKey"])),
    )
    if float(nearest["distanceKm"]) > MAX_GRID_DISTANCE_KM:
        return None
    point_key = tuple(nearest["pointKey"])
    column = [row for row in choices if tuple(row["pointKey"]) == point_key]
    by_layer = {str(row["layerKey"]): row for row in column}
    layers = sorted(by_layer.values(), key=lambda row: (float(row["layerRank"]), str(row["layerKey"])))
    if not layers:
        return None
    surface = next((row for row in layers if str(row["layerKey"]).startswith("surface:")), None)
    top = surface or layers[0]
    bottom = layers[-1]
    middle = None
    if len(layers) >= 3:
        midpoint = (float(top["layerRank"]) + float(bottom["layerRank"])) / 2.0
        interior = [row for row in layers if row is not top and row is not bottom]
        if interior:
            middle = min(interior, key=lambda row: abs(float(row["layerRank"]) - midpoint))

    def compact(row: dict[str, Any] | None) -> dict[str, Any] | None:
        if row is None:
            return None
        return {
            "verticalLayer": row["layerKey"],
            "verticalLayerRankM": round(float(row["layerRank"]), 3),
            "uMps": round(float(row["first"]["value"]), 5),
            "vMps": round(float(row["second"]["value"]), 5),
        }

    return {
        "gridPoint": [round(float(nearest["first"]["longitude"]), 7), round(float(nearest["first"]["latitude"]), 7)],
        "distanceKm": round(float(nearest["distanceKm"]), 5),
        "layers": {
            "surface": compact(surface),
            "topAvailable": compact(top),
            "middle": compact(middle),
            "bottom": compact(bottom),
        },
        "availableLayerCount": len(layers),
    }


def empty_document() -> dict[str, Any]:
    return {
        "schemaVersion": SCHEMA_VERSION,
        "retentionHours": RETENTION_HOURS,
        "scoreImpact": False,
        "publicRuntime": False,
        "distanceBandsKm": list(DISTANCE_BANDS_KM),
        "layerPolicy": "nearest-water-column; retain surface/top-available/middle/bottom layers",
        "cursor": 0,
        "anchors": {},
    }


def load_document(path: pathlib.Path) -> dict[str, Any]:
    try:
        value = json.loads(path.read_text("utf-8"))
    except Exception:
        return empty_document()
    if value.get("schemaVersion") != SCHEMA_VERSION or not isinstance(value.get("anchors"), dict):
        return empty_document()
    value["retentionHours"] = RETENTION_HOURS
    value["scoreImpact"] = False
    value["publicRuntime"] = False
    value["distanceBandsKm"] = list(DISTANCE_BANDS_KM)
    return value


def record_profiles(
    document: dict[str, Any],
    target_by_id: dict[str, dict[str, Any]],
    choices_by_target: dict[str, list[dict[str, Any]]],
    collection: str,
    model_run: str,
    valid_time: str,
    captured_at: str,
) -> int:
    if _epoch(valid_time) < _epoch(captured_at) - 3600:
        return 0
    if _epoch(valid_time) > _epoch(captured_at) + FORECAST_LEAD_MAX_HOURS * 3600:
        return 0
    written = 0
    anchors = document.setdefault("anchors", {})
    for target_id, choices in choices_by_target.items():
        target = target_by_id.get(target_id)
        profile = representative_profile(choices)
        if not target or not profile:
            continue
        if haversine_km(target["targetPoint"], profile["gridPoint"]) > MAX_GRID_DISTANCE_KM + 0.01:
            continue
        anchor = anchors.get(target_id)
        if not anchor or anchor.get("targetPoint") != target.get("targetPoint") or anchor.get("sourceWaterPoint") != target.get("sourceWaterPoint"):
            anchor = {
                "partId": target.get("partId"),
                "parentZoneId": target.get("parentZoneId"),
                "bandKm": target.get("bandKm"),
                "targetPoint": target.get("targetPoint"),
                "sourceWaterPoint": target.get("sourceWaterPoint"),
                "seawardBearingDeg": target.get("seawardBearingDeg"),
                "samples": [],
            }
            anchors[target_id] = anchor
        sample_key = f"{collection}|{model_run}|{valid_time}"
        samples = list(anchor.get("samples") or [])
        if any(row.get("sampleKey") == sample_key for row in samples):
            continue
        samples.append({
            "sampleKey": sample_key,
            "capturedAt": captured_at,
            "collection": collection,
            "modelRun": model_run,
            "validTime": valid_time,
            **profile,
        })
        anchor["samples"] = samples
        written += 1
    document["generatedAt"] = captured_at
    return written


def prune(document: dict[str, Any], now_iso: str) -> dict[str, int]:
    cutoff = _epoch(now_iso) - RETENTION_HOURS * 3600
    removed_samples = 0
    removed_anchors = 0
    for anchor_id in list((document.get("anchors") or {}).keys()):
        anchor = document["anchors"][anchor_id]
        samples = [row for row in (anchor.get("samples") or []) if _epoch(row.get("capturedAt")) >= cutoff]
        removed_samples += len(anchor.get("samples") or []) - len(samples)
        if samples:
            anchor["samples"] = sorted(samples, key=lambda row: (_epoch(row.get("validTime")), str(row.get("sampleKey"))))
        else:
            document["anchors"].pop(anchor_id, None)
            removed_anchors += 1
    document["generatedAt"] = now_iso
    return {"removedSamples": removed_samples, "removedAnchors": removed_anchors}


def save_document(path: pathlib.Path, document: dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary = path.with_suffix(path.suffix + ".tmp")
    temporary.write_text(json.dumps(document, ensure_ascii=False, separators=(",", ":")) + "\n", "utf-8")
    temporary.replace(path)


def status(
    document: dict[str, Any],
    selected_part_ids: list[str] | None = None,
    run_metrics: dict[str, Any] | None = None,
) -> dict[str, Any]:
    samples = [sample for anchor in (document.get("anchors") or {}).values() for sample in (anchor.get("samples") or [])]
    parts = {anchor.get("partId") for anchor in (document.get("anchors") or {}).values() if anchor.get("partId")}
    captured = sorted(row.get("capturedAt") for row in samples if row.get("capturedAt"))
    metrics = run_metrics or {}
    return {
        "schemaVersion": 1,
        "generatedAt": document.get("generatedAt") or datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
        "retentionHours": RETENTION_HOURS,
        "scoreImpact": False,
        "publicRuntime": False,
        "distanceBandsKm": list(DISTANCE_BANDS_KM),
        "anchorsWithSamples": len(document.get("anchors") or {}),
        "partsWithSamples": len(parts),
        "samples": len(samples),
        "oldestCapturedAt": captured[0] if captured else None,
        "newestCapturedAt": captured[-1] if captured else None,
        "selectedPartsThisRun": len(selected_part_ids or []),
        "rotationCursor": int(document.get("cursor") or 0),
        "rotationAdvancedThisRun": bool(metrics.get("rotationAdvancedThisRun")),
        "samplesWrittenThisRun": int(metrics.get("samplesWrittenThisRun") or 0),
        "cachedReplayAssetsThisRun": int(metrics.get("cachedReplayAssetsThisRun") or 0),
    }
