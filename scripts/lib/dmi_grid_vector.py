"""Pure helpers for DMI vector-grid integrity.

Kept independent of ecCodes so regression tests can exercise the physical
pairing rules without downloading GRIB assets.
"""
from __future__ import annotations
from typing import Any


def physical_point_key(candidate: dict[str, Any], digits: int = 7) -> tuple[float, float]:
    return (round(float(candidate["latitude"]), digits), round(float(candidate["longitude"]), digits))


def select_common_vector_candidate(
    first: list[dict[str, Any]], second: list[dict[str, Any]]
) -> tuple[dict[str, Any], dict[str, Any]] | None:
    """Choose the nearest physical grid point with valid values in both components."""
    second_by_point = {physical_point_key(row): row for row in second}
    shared: list[tuple[dict[str, Any], dict[str, Any]]] = []
    for row in first:
        other = second_by_point.get(physical_point_key(row))
        if other is not None:
            shared.append((row, other))
    if not shared:
        return None
    return min(
        shared,
        key=lambda pair: max(float(pair[0]["distanceKm"]), float(pair[1]["distanceKm"])),
    )


def same_grid_point(
    first: dict[str, Any] | None,
    second: dict[str, Any] | None,
    tolerance: float = 1e-7,
) -> bool:
    if not first or not second:
        return False
    try:
        return (
            abs(float(first["latitude"]) - float(second["latitude"])) <= tolerance
            and abs(float(first["longitude"]) - float(second["longitude"])) <= tolerance
        )
    except (KeyError, TypeError, ValueError):
        return False


def water_source_parameter_allowed(parameter: str) -> bool:
    """Water-source helper points are sampled only for DKSS water level."""
    return parameter == "sea-mean-deviation"


def water_temperature_surface_layer(level_type: Any, level: Any) -> tuple[str, float] | None:
    """Accept only DKSS' explicit sea-surface temperature layer.

    DKSS parameter 80 is present both at the surface and at many depths. The
    public field is sea-surface temperature and its fallback has the same
    meaning, so deeper layers must never overwrite the surface value.
    """
    normalized_type = str(level_type or "").strip().lower()
    try:
        numeric_level = float(level)
    except (TypeError, ValueError):
        return None
    if normalized_type != "surface" or numeric_level != 0.0:
        return None
    return ("surface:0", 0.0)


def vector_vertical_layer(family: str, level_type: Any, level: Any) -> tuple[str, float]:
    """Return stable layer identity/rank for U/V pairing.

    Current vectors must be paired within the same DMI vertical layer. The
    numeric rank is depth in metres when available; larger ranks are deeper.
    Non-current vectors use one neutral layer.
    """
    if family != "current":
        return ("default", 0.0)
    normalized_type = str(level_type or "unknown").strip().lower()
    try:
        numeric_level = float(level)
    except (TypeError, ValueError):
        numeric_level = 0.0 if normalized_type == "surface" else -1.0
    return (f"{normalized_type}:{numeric_level:g}", numeric_level)


def prefer_vector_layer(previous_rank: float | None, candidate_rank: float) -> bool:
    """Prefer the deepest valid shared current layer deterministically."""
    return previous_rank is None or float(candidate_rank) >= float(previous_rank)
