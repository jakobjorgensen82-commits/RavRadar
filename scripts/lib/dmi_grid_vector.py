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
