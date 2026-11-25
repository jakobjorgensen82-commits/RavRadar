"""Private comparison of accepted direct DKSS currents with exact local GRIB.

The caller authenticates the registered water point and accepted row, resolves
the local manifest entry and groups native endpoints by capture. This module
does not choose a new source or use the production grid sampler.
"""
from __future__ import annotations

from collections import Counter, defaultdict
from datetime import datetime
from decimal import Decimal, ROUND_HALF_UP
import hashlib
import json
import math
import os
import stat

from .dmi_grid_vector import vector_vertical_layer
from .dmi_native_provenance import (
    CURRENT_VECTOR_SEMANTICS_VERSION, canonical_current_source_asset, canonical_time,
    complete_native_source_for_hour, inspect_native_grid_sampling, same_point, sampling_identity,
)

GRID_KEYS = (
    "gridType", "Ni", "Nj", "numberOfPoints",
    "latitudeOfFirstGridPointInDegrees", "longitudeOfFirstGridPointInDegrees",
    "latitudeOfLastGridPointInDegrees", "longitudeOfLastGridPointInDegrees",
    "iDirectionIncrementInDegrees", "jDirectionIncrementInDegrees",
)
TIME_KEYS = ("dataDate", "dataTime", "validityDate", "validityTime")
COMPONENT_IDS = {49: "u", 300049: "u", 50: "v", 300050: "v"}
MAX_MESSAGES = 4096  # Same bound as the owned current-original decoders.
ORIGINAL_OUTCOMES = frozenset({
    "CAPTURE_UNPROVED", "NATIVE_GRID_UNPROVED", "ORIGINAL_BYTES_MISMATCH", "MESSAGE_BOUND",
    "ORIGINAL_HEADER_MISMATCH", "RAW_DECODE_INVALID", "ORIGINAL_EOF_UNPROVED", "ORIGINAL_CHANGED",
    "FIELD_LAYER_OR_GRID_MISSING", "FIELD_AMBIGUOUS", "CELL_MASKED", "CELL_OR_LAYER_MISMATCH",
    "NATIVE_VECTOR_MISMATCH", "MATCH",
})
HOUR_OUTCOMES = ORIGINAL_OUTCOMES | {
    "OTHER_OR_MISSING_SOURCE", "ORIGINAL_UNAVAILABLE", "WATER_POINT_MISMATCH",
    "TEMPORAL_SOURCE_MISMATCH", "NATIVE_SOURCE_MISMATCH", "ACCEPTED_CAPTURE_MISMATCH",
    "ACCEPTED_VECTOR_MISMATCH",
}


def _digest(fields):
    return hashlib.sha256(json.dumps(fields, separators=(",", ":"), default=str).encode()).hexdigest()


def _utc(value):
    canonical = canonical_time(value)
    return datetime.fromisoformat(canonical) if canonical else None


def _coordinates(grid, scan, index):
    grid_type, ni, nj, size, lat0, lon0, lat1, lon1, _, _ = grid
    if (grid_type != "regular_ll" or not all(type(n) is int for n in (ni, nj, size, scan))
            or min(ni, nj) < 2 or ni * nj != size or not 0 <= index < size
            or not 0 <= scan <= 255 or scan & 31
            or not all(math.isfinite(n) for n in (lat0, lon0, lat1, lon1))
            or not -90 <= lat0 <= 90 or not -90 <= lat1 <= 90
            or lat1 == lat0 or (lat1 > lat0) != bool(scan & 64)):
        return None
    if scan & 32:
        column, row = divmod(index, nj)
    else:
        row, column = divmod(index, ni)
    span = (lon1 - lon0) % 360 if not scan & 128 else -((lon0 - lon1) % 360)
    if not 0 < abs(span) < 180:
        return None
    longitude = lon1 if column == ni - 1 else lon0 + column * span / (ni - 1)
    latitude = lat1 if row == nj - 1 else lat0 + row * (lat1 - lat0) / (nj - 1)
    longitude %= 360
    return [longitude - 360 if longitude > 180 else longitude, latitude]


def _cell(row):
    source = row["source"]
    grid = source["nativeGridSampling"]
    return (grid["gridDefinitionSha256"], grid["gridIndexIdentitySha256"], source["verticalLayer"],
            grid["elementIndex"])


def _read_fields(handle, capture, rows, eccodes):
    run, valid = (_utc(capture[key]) for key in ("modelRun", "validTime"))
    headers = tuple(int(t.strftime(pattern)) for t in (run, valid) for pattern in ("%Y%m%d", "%H%M"))
    wanted = defaultdict(set)
    for row in rows:
        definition, order, layer, index = _cell(row)
        wanted[definition, order, layer].add(index)
    values = defaultdict(list)
    read = 0
    while (message := eccodes.codes_grib_new_from_file(handle)) is not None:
        read += 1
        try:
            if read > MAX_MESSAGES:
                return "MESSAGE_BOUND", {}
            get = lambda name: eccodes.codes_get(message, name)
            if get("edition") != 1 or tuple(get(key) for key in TIME_KEYS) != headers:
                return "ORIGINAL_HEADER_MISMATCH", {}
            component = COMPONENT_IDS.get(get("indicatorOfParameter")) or COMPONENT_IDS.get(get("paramId"))
            if component is None:
                continue
            grid = tuple(get(key) for key in GRID_KEYS)
            order = get("md5GridSection")
            layer, rank = vector_vertical_layer("current", get("typeOfLevel"), get("level"))
            key = _digest(grid), _digest(("grid-native-index-order-v1", order, *grid)), layer
            if key not in wanted:
                continue
            scan = get("scanningMode")
            points = {index: _coordinates(grid, scan, int(index)) for index in wanted[key]}
            indices = sorted(index for index, point in points.items() if point is not None)
            if not indices:
                continue
            elements = eccodes.codes_get_elements(message, "values", [int(index) for index in indices])
            if len(elements) != len(indices):
                return "RAW_DECODE_INVALID", {}
            missing = float(get("missingValue"))
            for index, element in zip(indices, elements):
                value = float(element)
                # Keep missing occurrences so a second field cannot hide ambiguity.
                value = value if math.isfinite(value) and abs(value) <= 1e19 and value != missing else None
                values[(*key, index), component].append((points[index], round(rank, 3), value))
        finally:
            eccodes.codes_release(message)
    if not read or handle.tell() != capture["contentLengthBytes"]:
        return "ORIGINAL_EOF_UNPROVED", {}
    return None, values


def check_dkss_current_original(handle, capture, native_rows, eccodes):
    """Inspect a borrowed local GRIB file once. Return only typed outcomes in input order."""
    def refuse(reason):
        return (reason,) * len(native_rows)

    if capture is None or canonical_current_source_asset(capture) != capture:
        return refuse("CAPTURE_UNPROVED")
    if any(canonical_current_source_asset(row["source"]) != capture for row in native_rows):
        return refuse("CAPTURE_UNPROVED")
    if any(inspect_native_grid_sampling(row["source"])["status"] != "coherent"
           or row["source"]["nativeGridSampling"]["coordinateInterpretation"] != "dmi-dkss-grib1-header-endpoints-v1"
           for row in native_rows):
        return refuse("NATIVE_GRID_UNPROVED")
    try:
        before = os.fstat(handle.fileno())
        if not stat.S_ISREG(before.st_mode) or before.st_size != capture["contentLengthBytes"]:
            return refuse("ORIGINAL_BYTES_MISMATCH")
        handle.seek(0)
        if hashlib.file_digest(handle, "sha256").hexdigest() != capture["contentSha256"]:
            return refuse("ORIGINAL_BYTES_MISMATCH")
        handle.seek(0)
        reason, values = _read_fields(handle, capture, native_rows, eccodes)
        after = os.fstat(handle.fileno())
        if (before.st_size, before.st_mtime_ns, before.st_ctime_ns) != (
                after.st_size, after.st_mtime_ns, after.st_ctime_ns):
            return refuse("ORIGINAL_CHANGED")
    except Exception:
        return refuse("RAW_DECODE_INVALID")
    if reason:
        return refuse(reason)
    outcomes = []
    for row in native_rows:
        source = row["source"]
        u, v = (values[_cell(row), component] for component in ("u", "v"))
        if not u or not v:
            outcomes.append("FIELD_LAYER_OR_GRID_MISSING")
        elif len(u) != 1 or len(v) != 1:
            outcomes.append("FIELD_AMBIGUOUS")
        elif u[0][2] is None or v[0][2] is None:
            outcomes.append("CELL_MASKED")
        elif any(rank != source["verticalLayerRankM"]
                 or any(not math.isclose(a, b, rel_tol=0, abs_tol=1e-9)
                        for a, b in zip(point, source["gridPoint"]))
                 for point, rank, _ in (u[0], v[0])):
            outcomes.append("CELL_OR_LAYER_MISMATCH")
        elif (u[0][2], v[0][2]) != (row["uMps"], row["vMps"]):
            outcomes.append("NATIVE_VECTOR_MISMATCH")
        else:
            outcomes.append("MATCH")
    return tuple(outcomes)


def check_accepted_dkss_hour(part, hour, native_rows, original_outcomes):
    """Bind prior original comparisons to the exact accepted hour and central point."""
    source = hour.get("currentProvenance") or {}
    if (source.get("status") != "verified" or source.get("provider") != "dmi" or source.get("fallback") is not False
            or source.get("vectorSemanticsVersion") != CURRENT_VECTOR_SEMANTICS_VERSION):
        return "OTHER_OR_MISSING_SOURCE"
    if not native_rows or len(native_rows) != len(original_outcomes):
        return "ORIGINAL_UNAVAILABLE"
    identity = sampling_identity({"id": "PART::" + part["partId"], "parentZoneId": part["zoneId"],
                                  "lon": part["waterPoint"][0], "lat": part["waterPoint"][1]})
    if (not identity or not same_point(source.get("samplingPoint"), identity["samplingPoint"])
            or any(source.get(key) != value for key, value in identity.items() if key != "samplingPoint")):
        return "WATER_POINT_MISMATCH"
    times = [_utc(row["time"]) for row in native_rows]
    actual = _utc(hour.get("time"))
    steps = source.get("nativeSteps") or []
    if (not actual or not all(times) or not 1 <= len(steps) == len(times) <= 2
            or [canonical_time(row["time"]) for row in native_rows]
            != [canonical_time(step) for step in source.get("nativeValidTimes", ())]):
        return "TEMPORAL_SOURCE_MISMATCH"
    step_fields = ("itemId", "assetIdentitySha256", "nativeValidTime", "leadTimeHours", "acquiredAt",
                   "optionalFieldSet", "nativeGridSampling", "gridPoint", "distanceKm", "itemCreatedAt", "itemUpdatedAt")
    shared_fields = ("collection", "modelRun", "provider", "verticalLayer", "verticalLayerRankM",
                     "gridDefinitionSha256", "vectorSelection", "vectorSemanticsVersion")
    for native, step in zip(native_rows, steps):
        endpoint = native["source"]
        if not complete_native_source_for_hour(endpoint, "current", identity["entityId"], identity, native["time"]):
            return "NATIVE_SOURCE_MISMATCH"
        if (not isinstance(step, dict) or any(step.get(key) != endpoint.get(key) for key in step_fields)
                or any(source.get(key) != endpoint.get(key) for key in shared_fields)
                or not same_point(source.get("gridPoint"), endpoint["gridPoint"])
                or not math.isclose(source["distanceKm"], endpoint["distanceKm"], rel_tol=0, abs_tol=0.001)):
            return "TEMPORAL_SOURCE_MISMATCH"
    first_endpoint = native_rows[0]["source"]
    if (canonical_current_source_asset(source) != canonical_current_source_asset(first_endpoint)
            or any(source.get(key) != first_endpoint.get(key)
                   for key in ("nativeGridSampling", "gridPoint", "distanceKm"))):
        return "ACCEPTED_CAPTURE_MISMATCH"
    for outcome in original_outcomes:
        if outcome != "MATCH":
            return outcome if isinstance(outcome, str) and outcome in ORIGINAL_OUTCOMES else "ORIGINAL_UNAVAILABLE"
    mode = source.get("temporalResolution")
    if mode == "native" and times == [actual]:
        ratio = 0.0
    elif mode == "nearest-edge" and len(times) == 1 and abs((times[0] - actual).total_seconds()) <= 95 * 60:
        ratio = 0.0
    elif (mode == "interpolated" and len(times) == 2 and times[0] < actual < times[1]
          and (times[1] - times[0]).total_seconds() <= 4 * 3600):
        ratio = (actual - times[0]).total_seconds() / (times[1] - times[0]).total_seconds()
    else:
        return "TEMPORAL_SOURCE_MISMATCH"
    for component, key in (("uMps", "currentUMps"), ("vMps", "currentVMps")):
        first, last = native_rows[0][component], native_rows[-1][component]
        expected = first + (last - first) * ratio
        # JS toFixed rounds the exact binary float, with decimal ties away from zero.
        if float(Decimal(expected).quantize(Decimal("0.00001"), rounding=ROUND_HALF_UP)) != hour.get(key):
            return "ACCEPTED_VECTOR_MISMATCH"
    return "MATCH"


def summarize_dkss_current_outcomes(outcomes):
    """Only aggregate result codes leave the private reader."""
    return dict(sorted(Counter(outcome if isinstance(outcome, str) and outcome in HOUR_OUTCOMES else "UNCLASSIFIED"
                               for outcome in outcomes).items()))
