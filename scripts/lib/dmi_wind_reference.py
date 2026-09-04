"""HARMONIE wind -> geographic east/north at the same grid cell.

Projection parameters come from each GRIB message, never from site geometry.
No spatial interpolation, acquisition or persistence occurs in this helper.
"""
from __future__ import annotations

import math
import re
from typing import Any, Callable

WIND_VECTOR_VERSION = 2
WIND_VECTOR_REFERENCE = "earth-relative-east-north"
WIND_VECTOR_TRANSFORMS = frozenset({"identity-earth-relative", "lambert-conformal-to-earth-relative"})


def _finite(value: Any) -> float:
    if isinstance(value, bool) or not isinstance(value, (int, float)) or not math.isfinite(value):
        raise ValueError("Wind reference requires finite numeric metadata")
    return float(value)


def read_wind_reference(gid: int, get: Callable) -> tuple:
    """Read the vector-frame semantics and exact grid-section identity."""
    digest = get(gid, "md5GridSection")
    if not isinstance(digest, str) or not re.fullmatch(r"[0-9a-f]{32}", digest):
        raise ValueError("Wind grid-section identity is invalid")
    relative = get(gid, "uvRelativeToGrid")
    if isinstance(relative, bool) or relative not in (0, 1):
        raise ValueError("Wind vector-frame flag is invalid")
    if relative == 0:
        return ("identity-earth-relative", digest)
    if get(gid, "gridType") != "lambert":
        raise ValueError("Unsupported grid-relative wind projection")
    # DINI is a northern Lambert cone. Other centres require a verified contract.
    if get(gid, "projectionCentreFlag") != 0:
        raise ValueError("Unsupported Lambert projection centre")
    central_meridian = _finite(get(gid, "LoVInDegrees"))
    first_parallel = _finite(get(gid, "Latin1InDegrees"))
    second_parallel = _finite(get(gid, "Latin2InDegrees"))
    if not (-360 <= central_meridian <= 360 and 0 < first_parallel < 90 and 0 < second_parallel < 90):
        raise ValueError("Unsupported Lambert projection parameters")
    return ("lambert-conformal-to-earth-relative", digest, central_meridian, first_parallel, second_parallel)


def earth_relative_wind_pair(first: dict, second: dict) -> tuple[dict, dict]:
    """Rotate an already spatially paired vector without changing its location."""
    reference = first.get("_windReference")
    if not isinstance(reference, tuple) or reference != second.get("_windReference"):
        raise ValueError("Wind components have different reference frames")
    if first.get("gridDefinitionSha256") != second.get("gridDefinitionSha256") or any(
        first.get(key) != second.get(key) for key in ("latitude", "longitude")
    ):
        raise ValueError("Wind components have different grid cells")
    u, v = _finite(first.get("value")), _finite(second.get("value"))
    if len(reference) == 2 and reference[0] == "identity-earth-relative":
        return dict(first), dict(second)
    if len(reference) != 5 or reference[0] != "lambert-conformal-to-earth-relative":
        raise ValueError("Wind reference is invalid")
    _, _, central_meridian, first_parallel, second_parallel = reference
    phi1, phi2 = math.radians(first_parallel), math.radians(second_parallel)
    if abs(phi1 - phi2) < 1e-12:
        cone = math.sin(phi1)
    else:
        cone = math.log(math.cos(phi1) / math.cos(phi2)) / math.log(
            math.tan(math.pi / 4 + phi2 / 2) / math.tan(math.pi / 4 + phi1 / 2)
        )
    longitude = _finite(first.get("longitude"))
    delta = (longitude - central_meridian + 180) % 360 - 180
    convergence = cone * math.radians(delta)
    sine, cosine = math.sin(convergence), math.cos(convergence)
    # Inverse geographic -> Lambert local rotation; speed is unchanged.
    return (
        {**first, "value": u * cosine + v * sine},
        {**second, "value": -u * sine + v * cosine},
    )
