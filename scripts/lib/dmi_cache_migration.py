"""Safe per-sampling-point reuse of RavRadar's progressive DMI zone cache."""
from __future__ import annotations

from typing import Any


def same_sampling_point(first: Any, second: Any, tolerance: float = 1e-7) -> bool:
    if not isinstance(first, list) or not isinstance(second, list) or len(first) < 2 or len(second) < 2:
        return False
    try:
        return all(abs(float(first[index]) - float(second[index])) <= tolerance for index in range(2))
    except (TypeError, ValueError):
        return False


def prune_previous_sampling_mismatches(previous: dict[str, Any], zones: list[dict[str, Any]]) -> list[str]:
    """Keep unchanged point caches, but never reuse data from a moved admin point."""
    configured = {
        str(zone["id"]): [round(float(zone["lon"]), 7), round(float(zone["lat"]), 7)]
        for zone in zones
        if zone.get("id") and not zone.get("researchCurrent")
    }
    removed: list[str] = []
    previous_zones = previous.get("zones") or {}
    for zone_id in list(previous_zones):
        expected = configured.get(str(zone_id))
        if expected is None or not same_sampling_point(previous_zones[zone_id].get("samplingPoint"), expected):
            previous_zones.pop(zone_id, None)
            removed.append(str(zone_id))
    return removed
