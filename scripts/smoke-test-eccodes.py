#!/usr/bin/env python3
"""Fail fast when the installed ecCodes Python API is incompatible."""
from eccodes import (
    codes_get, codes_get_elements, codes_grib_find_nearest,
    codes_grib_new_from_file, codes_release,
)

required = {
    "codes_get": codes_get,
    "codes_get_elements": codes_get_elements,
    "codes_grib_find_nearest": codes_grib_find_nearest,
    "codes_grib_new_from_file": codes_grib_new_from_file,
    "codes_release": codes_release,
}
missing = [name for name, value in required.items() if not callable(value)]
if missing:
    raise RuntimeError(f"ecCodes API mangler kaldbar funktion: {', '.join(missing)}")
print("ecCodes Python API smoke test passed: " + ", ".join(required))
