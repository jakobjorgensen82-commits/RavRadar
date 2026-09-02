#!/usr/bin/env python3
"""Fail fast when the installed ecCodes Python API is incompatible."""
import eccodes as eccodes_module

from eccodes import (
    CODES_GRIB_NEAREST_SAME_GRID,
    codes_get, codes_get_elements, codes_grib_find_nearest,
    codes_grib_nearest_delete, codes_grib_nearest_find,
    codes_grib_nearest_new, codes_grib_new_from_file, codes_release,
)

required = {
    "codes_get": codes_get,
    "codes_get_elements": codes_get_elements,
    "codes_grib_find_nearest": codes_grib_find_nearest,
    "codes_grib_nearest_new": codes_grib_nearest_new,
    "codes_grib_nearest_find": codes_grib_nearest_find,
    "codes_grib_nearest_delete": codes_grib_nearest_delete,
    "codes_grib_new_from_file": codes_grib_new_from_file,
    "codes_release": codes_release,
}
missing = [name for name, value in required.items() if not callable(value)]
if missing:
    raise RuntimeError(f"ecCodes API mangler kaldbar funktion: {', '.join(missing)}")
if not isinstance(CODES_GRIB_NEAREST_SAME_GRID, int):
    raise RuntimeError("ecCodes API mangler heltalsflaget CODES_GRIB_NEAREST_SAME_GRID")

version_fields = {
    "eccodes-api": getattr(eccodes_module, "__version__", None),
    "eccodes-binding": getattr(eccodes_module, "bindings_version", None),
}
invalid_versions = [
    name
    for name, value in version_fields.items()
    if not isinstance(value, str)
    or not value.strip()
    or value.strip().lower() in {"none", "unknown"}
]
if invalid_versions:
    raise RuntimeError(
        "ecCodes API mangler brugbar versionsidentitet: "
        + ", ".join(invalid_versions)
    )

print(
    "ecCodes Python API smoke test passed: "
    + ", ".join(required)
    + "; versionsidentiteter: "
    + ", ".join(f"{name}={value}" for name, value in version_fields.items())
)
