"""Private staged land/water-point helpers.

The public coastal-parts contract is deliberately not an input to this module's
output.  Candidate coordinates and raw DMI values remain under ``.cache`` until
an explicit activation request has passed the exact-candidate readiness gate.
"""
from __future__ import annotations

import json
import math
import os
import pathlib
import tempfile
from typing import Any


STAGE_SCHEMA_VERSION = 1
ALLOWED_STAGE_STATUSES = {"awaiting-validation", "activation-requested"}


def _point(value: Any) -> list[float] | None:
    if not isinstance(value, list) or len(value) != 2:
        return None
    try:
        point = [float(value[0]), float(value[1])]
    except (TypeError, ValueError):
        return None
    if not all(math.isfinite(number) for number in point):
        return None
    if not (7 <= point[0] <= 16 and 54 <= point[1] <= 58.5):
        return None
    # Preserve the exact centrally saved coordinate for Candidate G's state key.
    # DMI provenance is rounded separately to seven decimals and compared with a
    # 1e-7 tolerance, so sampling identity remains stable without hash drift.
    return point


def _same_point(left: Any, right: Any, tolerance: float = 1e-7) -> bool:
    a, b = _point(left), _point(right)
    return bool(a and b and all(abs(a[index] - b[index]) <= tolerance for index in (0, 1)))


def _bearing(water: list[float], land: list[float]) -> float:
    lon1, lat1 = (number * math.pi / 180 for number in water)
    lon2, lat2 = (number * math.pi / 180 for number in land)
    value = math.degrees(math.atan2(
        math.sin(lon2 - lon1) * math.cos(lat2),
        math.cos(lat1) * math.sin(lat2)
        - math.sin(lat1) * math.cos(lat2) * math.cos(lon2 - lon1),
    ))
    return round((value % 360 + 360) % 360, 1)


def _valid_revision(value: Any) -> str | None:
    revision = str(value or "")
    if not (16 <= len(revision) <= 80):
        return None
    if not all(character.isalnum() or character in "-_" for character in revision):
        return None
    return revision


def staged_targets(
    direction_document: dict[str, Any],
    active_parts_document: dict[str, Any],
    zone_coast_types: dict[str, str],
) -> list[dict[str, Any]]:
    """Return only changed, owner-submitted candidates.

    ``active_parts_document`` is the current public sampling truth.  A full-zone
    admin snapshot therefore does not cause unchanged siblings to warm again.
    """
    active_by_id = {
        str(part.get("partId")): (zone_id, part)
        for zone_id, parts in (active_parts_document.get("zones") or {}).items()
        for part in (parts or [])
        if part.get("partId")
    }
    targets: list[dict[str, Any]] = []
    seen: set[str] = set()
    for zone_id, review in (direction_document.get("zones") or {}).items():
        stage = review.get("stagedChange") if isinstance(review, dict) else None
        if not isinstance(stage, dict) or stage.get("status") not in ALLOWED_STAGE_STATUSES:
            continue
        revision = _valid_revision(stage.get("revision"))
        overrides = stage.get("partOverrides")
        if not revision or not isinstance(overrides, dict):
            continue
        for part_id, candidate in overrides.items():
            active_entry = active_by_id.get(str(part_id))
            if not active_entry or active_entry[0] != zone_id or not isinstance(candidate, dict):
                continue
            active = active_entry[1]
            water, land = _point(candidate.get("waterPoint")), _point(candidate.get("landPoint"))
            if not water or not land:
                continue
            direction = _bearing(water, land)
            active_direction = active.get("onshoreDirectionDeg")
            changed = (
                not _same_point(water, active.get("waterPoint"))
                or not _same_point(land, active.get("landPoint"))
                or not isinstance(active_direction, (int, float))
                or abs((((direction - float(active_direction)) + 180) % 360) - 180) > 0.05
            )
            if not changed:
                continue
            stage_id = f"STAGED::{revision}::{part_id}"
            if stage_id in seen:
                raise ValueError(f"Duplicate staged coastal part: {part_id}")
            seen.add(stage_id)
            targets.append({
                "id": stage_id,
                "revision": revision,
                "partId": str(part_id),
                "parentZoneId": str(zone_id),
                "lon": water[0],
                "lat": water[1],
                "waterPoint": water,
                "landPoint": land,
                "onshoreDirectionDeg": direction,
                "coastType": zone_coast_types.get(str(zone_id), "east"),
                "privateStage": True,
                "activationRequested": stage.get("status") == "activation-requested",
            })
    return sorted(targets, key=lambda item: (item["parentZoneId"], item["partId"]))


def load_private_document(path: pathlib.Path, targets: list[dict[str, Any]]) -> dict[str, Any]:
    try:
        document = json.loads(path.read_text("utf-8"))
    except (OSError, json.JSONDecodeError):
        document = {}
    if document.get("schemaVersion") != STAGE_SCHEMA_VERSION:
        document = {}
    old_zones = document.get("zones") if isinstance(document.get("zones"), dict) else {}
    old_meta = document.get("candidates") if isinstance(document.get("candidates"), dict) else {}
    zones: dict[str, Any] = {}
    candidates: dict[str, Any] = {}
    for target in targets:
        stage_id = target["id"]
        old_zone = old_zones.get(stage_id) if isinstance(old_zones.get(stage_id), dict) else {}
        old_point = (old_meta.get(stage_id) or {}).get("waterPoint")
        if not _same_point(old_point, target["waterPoint"]):
            old_zone = {}
        zones[stage_id] = {
            "samplingPoint": target["waterPoint"],
            "hourly": dict(old_zone.get("hourly") or {}),
            "gridPoints": dict(old_zone.get("gridPoints") or {}),
            "collections": dict(old_zone.get("collections") or {}),
        }
        if old_zone.get("marineSelection"):
            zones[stage_id]["marineSelection"] = old_zone["marineSelection"]
        candidates[stage_id] = {
            "revision": target["revision"],
            "zoneId": target["parentZoneId"],
            "partId": target["partId"],
            "waterPoint": target["waterPoint"],
            "landPoint": target["landPoint"],
            "onshoreDirectionDeg": target["onshoreDirectionDeg"],
            "coastType": target["coastType"],
            "activationRequested": target["activationRequested"],
        }
    return {
        "schemaVersion": STAGE_SCHEMA_VERSION,
        "generatedAt": document.get("generatedAt"),
        "timeStrideHours": document.get("timeStrideHours"),
        "currentVectorSemanticsVersion": document.get("currentVectorSemanticsVersion"),
        "currentVectorSelection": document.get("currentVectorSelection"),
        "currentPreferredDistanceKm": document.get("currentPreferredDistanceKm"),
        "currentMaxDistanceKm": document.get("currentMaxDistanceKm"),
        "zones": zones,
        "candidates": candidates,
    }


def stage_asset_complete(document: dict[str, Any], targets: list[dict[str, Any]], collection: str, valid_time: str) -> bool:
    if collection.startswith("dkss_"):
        required = {"sea-mean-deviation", "current-u", "current-v"}
    elif collection.startswith("wam_"):
        required = {"significant-wave-height", "dominant-wave-period"}
    elif collection == "harmonie_dini_sf":
        required = {"wind-u-10m", "wind-v-10m"}
    else:
        return True
    relevant = [target for target in targets if not (
        collection == "wam_nsb" and target.get("coastType") != "west"
    ) and not (
        collection == "wam_dw" and target.get("coastType") == "west"
    )]
    if not relevant:
        return True
    for target in relevant:
        row = (((document.get("zones") or {}).get(target["id"]) or {}).get("hourly") or {}).get(valid_time) or {}
        if not required <= set(row):
            return False
    return True


def prune_hours(document: dict[str, Any], reference_iso: str, retention_hours: int = 168) -> None:
    try:
        from datetime import datetime, timezone
        reference = datetime.fromisoformat(reference_iso.replace("Z", "+00:00")).timestamp()
    except (TypeError, ValueError):
        return
    earliest = reference - retention_hours * 3600
    latest = reference + 132 * 3600
    for zone in (document.get("zones") or {}).values():
        hourly = zone.get("hourly") or {}
        kept = {}
        for key, row in hourly.items():
            try:
                stamp = datetime.fromisoformat(str(key).replace("Z", "+00:00")).timestamp()
            except ValueError:
                continue
            if earliest <= stamp <= latest:
                kept[key] = row
        zone["hourly"] = kept


def save_private_document(path: pathlib.Path, document: dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    serialized = json.dumps(document, ensure_ascii=False, indent=2) + "\n"
    descriptor, temporary = tempfile.mkstemp(prefix=path.name + ".", suffix=".tmp", dir=path.parent)
    try:
        with os.fdopen(descriptor, "w", encoding="utf-8") as handle:
            handle.write(serialized)
        pathlib.Path(temporary).replace(path)
    finally:
        pathlib.Path(temporary).unlink(missing_ok=True)
