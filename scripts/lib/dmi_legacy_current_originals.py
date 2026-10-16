"""Bounded OLD-only current reconstruction from an already owned GRIB reader.

Algorithm source: fixed044d3045fecc2e70d6f35f60010921c6bd597ecc,
update-dmi-bulk.py SHA256 57466ba524a75d04024a83fbd14527c741c3fcf3a8a3d84ffdb3b24669f0bc77.
The old ecCodes probe union, coordinate-cell pairing and layer preference are
deliberately NOT the new DKSS-header/index decoder. No archived module executes.

Requests contain EXPECTATIONS reconstructed from authenticated forecast/step
witnesses plus each endpoint's separately complete capture, not existing native
proof. The caller must retain those witnesses and require the normal JavaScript
inspector's exact source/tuple projection afterwards. Returned rows confer no
authentication, sampling receipt, ledger, NEW-use admission or save authority.
The normal caller owns reader acquisition/type, SHA measurement, rollback and
physical close BEFORE committing any returned candidate context. No file opens,
network, cache writes, global decoder switches or original mutation occur here.
"""
from __future__ import annotations

import copy
import hashlib
import json
import math
import re
from datetime import datetime

from .dmi_grid_vector import vector_choice, vector_vertical_layer, prefer_vector_choice
from .dmi_native_provenance import canonical_current_source_asset, canonical_time, complete_native_source_for_hour, sampling_identity
from .dmi_current_processing_compatibility import retained_current_processing_signature_compatible


LEGACY_SOURCE_COMMIT = "044d3045fecc2e70d6f35f60010921c6bd597ecc"
LEGACY_SOURCE_SHA256 = "57466ba524a75d04024a83fbd14527c741c3fcf3a8a3d84ffdb3b24669f0bc77"
_GRID_KEYS = ("gridType", "Ni", "Nj", "numberOfPoints",
    "latitudeOfFirstGridPointInDegrees", "longitudeOfFirstGridPointInDegrees",
    "latitudeOfLastGridPointInDegrees", "longitudeOfLastGridPointInDegrees",
    "iDirectionIncrementInDegrees", "jDirectionIncrementInDegrees")
_FIELDS = ("current-u", "current-v")
_SIGNATURE = re.compile(r"parser:20\|params:4\|grid:9\|eccodes-api:2\.48\.(?:0|2)"
    r"\|eccodes-binding:2\.48\.0\|zones:[a-f0-9]{16}")
_OPS = frozenset({"new_message", "release_message", "get", "get_elements", "find_nearest",
    "nearest_new", "nearest_find", "nearest_delete", "same_grid", "out_of_area_error",
    "classify_parameter", "candidate_target", "stop_requested", "processing_signature"})


def _refuse(code):
    raise ValueError("DMI_LEGACY_CURRENT_" + code)


def _distance(lat1, lon1, lat2, lon2):
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dp, dl = math.radians(lat2 - lat1), math.radians(lon2 - lon1)
    a = math.sin(dp / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dl / 2) ** 2
    return 6371.0088 * 2 * math.atan2(math.sqrt(a), math.sqrt(max(0., 1 - a)))


def _valid_value(value, missing):
    try:
        number = float(value)
    except (TypeError, ValueError):
        return None
    if not math.isfinite(number) or abs(number) > 1e19:
        return None
    try:
        if missing is not None and math.isclose(number, float(missing), rel_tol=0, abs_tol=1e-12):
            return None
    except (TypeError, ValueError):
        pass
    return number


def _cell(candidate):
    return (candidate["gridDefinitionSha256"], round(candidate["latitude"], 7),
        round(candidate["longitude"], 7))


def _pair(candidates):
    # Exact OLD definition/cell semantics; never substitute the NEW node key.
    indexed = {}
    for field in _FIELDS:
        rows = {}
        for candidate in candidates.get(field, []):
            key = _cell(candidate)
            if key not in rows or candidate["distanceKm"] < rows[key]["distanceKm"]:
                rows[key] = candidate
        if not rows:
            return None
        indexed[field] = rows
    common = set.intersection(*(set(indexed[field]) for field in _FIELDS))
    if not common:
        return None
    key = min(common, key=lambda key: (max(indexed[field][key]["distanceKm"] for field in _FIELDS), key))
    return {field: indexed[field][key] for field in _FIELDS}


class _LegacyGrid:
    """Per-invocation private cache; OLD and NEW can never share entries."""
    def __init__(self, operations, reader):
        self.ops, self.reader, self.cache = operations, reader, {}

    def check(self):
        self.reader.check()
        if self.ops["stop_requested"]():
            _refuse("DEFERRED")

    def nearest(self, gid, collection, signature, zone, lookup):
        target = self.ops["candidate_target"](collection, zone)
        if type(target) is not int or not 4 <= target <= 1024:
            _refuse("CANDIDATE_BOUND")
        cache_key = (collection, signature, zone["id"], target)
        if cache_key in self.cache:
            return self.cache[cache_key]
        radii = (.025, .05, .09, .14, .20, .26) if zone.get("coastType") == "limfjord" else (.025, .05, .09, .14)
        probes = [(0., 0.)]
        for radius in radii:
            probes.extend((dlat * radius, dlon * radius) for dlat, dlon in (
                (1, 0), (-1, 0), (0, 1), (0, -1),
                (.707, .707), (.707, -.707), (-.707, .707), (-.707, -.707)))
        by_index = {}
        for dlat, dlon in probes:
            self.check()
            try:
                candidates = lookup(zone["lat"] + dlat, zone["lon"] + dlon)
            except self.ops["out_of_area_error"]:
                continue
            if isinstance(candidates, dict):
                candidates = [candidates]
            for candidate in candidates or []:
                try:
                    index, lat, lon = int(candidate.get("index")), float(candidate.get("lat")), float(candidate.get("lon"))
                    distance = _distance(zone["lat"], zone["lon"], lat, lon)
                except (TypeError, ValueError):
                    continue
                if index not in by_index or distance < by_index[index]["distanceKm"]:
                    by_index[index] = {"index": index, "latitude": lat, "longitude": lon, "distanceKm": distance}
        result = sorted(by_index.values(), key=lambda item: item["distanceKm"])[:target]
        self.cache[cache_key] = result
        return result

    def candidates(self, gid, collection, zones):
        self.check()
        get = self.ops["get"]
        signature = []
        for key in ("md5GridSection", *_GRID_KEYS):
            signature.append(None if len(signature) >= 2 and signature[1] == "lambert" and key in _GRID_KEYS[-4:]
                else get(gid, key))
        signature = tuple(signature)
        definition = hashlib.sha256(json.dumps(signature[1:], ensure_ascii=False,
            separators=(",", ":"), default=str).encode("utf-8")).hexdigest()
        nearest_id, first, primary = None, True, None
        use_low = all(callable(self.ops[key]) for key in ("nearest_new", "nearest_find", "nearest_delete")) and isinstance(self.ops["same_grid"], int)
        try:
            if use_low and any((collection, signature, zone["id"], self.ops["candidate_target"](collection, zone)) not in self.cache for zone in zones):
                nearest_id = self.ops["nearest_new"](gid)
                if nearest_id is None:
                    # OLD low-level lookup would use the failed handle, not
                    # silently switch to a different nearest API/geometry.
                    _refuse("NEAREST_HANDLE_UNAVAILABLE")
            def lookup(lat, lon):
                nonlocal first
                if nearest_id is not None:
                    result = self.ops["nearest_find"](nearest_id, gid, lat, lon,
                        0 if first else self.ops["same_grid"], False, 4)
                    first = False
                    return result
                try:
                    return self.ops["find_nearest"](gid, lat, lon, npoints=4)
                except TypeError:
                    return self.ops["find_nearest"](gid, lat, lon, False, 4)
            by_zone = {zone["id"]: self.nearest(gid, collection, signature, zone, lookup) for zone in zones}
        except BaseException as error:
            primary = error
            raise
        finally:
            if nearest_id is not None:
                try:
                    self.ops["nearest_delete"](nearest_id)
                except BaseException as cleanup:
                    # The normal callback retains unknown native ownership.
                    # Keep its refusal AND the actual first traversal failure.
                    if primary is not None:
                        raise cleanup from primary
                    raise
        indices = list(dict.fromkeys(candidate["index"] for rows in by_zone.values() for candidate in rows))
        if not indices:
            return {}
        raw = self.ops["get_elements"](gid, "values", indices)
        if isinstance(raw, (list, tuple)):
            values = list(raw)
        elif type(raw).__module__.split(".")[0] == "numpy" and getattr(raw, "ndim", None) == 1 and callable(getattr(raw, "tolist", None)):
            values = raw.tolist()
        else:
            _refuse("VALUES_INVALID")
        if not isinstance(values, list) or len(values) != len(indices):
            _refuse("VALUES_INVALID")
        by_index = dict(zip(indices, values))
        missing = get(gid, "missingValue")
        result = {}
        for zone_id, candidates in by_zone.items():
            result[zone_id] = [{**candidate, "value": value, "gridDefinitionSha256": definition}
                for candidate in candidates
                for value in [_valid_value(by_index[candidate["index"]], missing)] if value is not None]
        self.check()
        return result


def decode_legacy_current_originals(reader, requests, *, operations):
    """Return OLD-only candidate rows; caller still owes exact JS projection.

    Each request is {zone, expectedSource, capture, processingSignature}. The
    expected source is NOT an authentication token. Complete capture is supplied
    independently for this endpoint; the selected top endpoint's byte metadata
    cannot stand in for another bracket. Capture reacquisition time may differ,
    while BOTH complete original/read captures remain separately unchanged.
    """
    if not isinstance(operations, dict) or set(operations) != _OPS:
        _refuse("OPERATIONS_INVALID")
    for key in _OPS - {"nearest_new", "nearest_find", "nearest_delete", "same_grid", "out_of_area_error", "processing_signature"}:
        if not callable(operations[key]):
            _refuse("OPERATIONS_INVALID")
    if not isinstance(operations["out_of_area_error"], type) or not issubclass(operations["out_of_area_error"], Exception):
        _refuse("OPERATIONS_INVALID")
    current_signature = operations["processing_signature"]
    if not isinstance(current_signature, str) or not _SIGNATURE.fullmatch(current_signature):
        _refuse("PROCESSING_CONTEXT_UNKNOWN")
    if not isinstance(requests, list) or not 1 <= len(requests) <= 673:
        _refuse("REQUEST_INVALID")
    reader.check()
    collection, model_run, valid_time = reader.binding
    if collection not in {"dkss_idw", "dkss_nsbs", "dkss_lf"}:
        _refuse("REQUEST_INVALID")
    observed = canonical_current_source_asset({"collection": collection,
        "modelRun": model_run, "validTime": valid_time, **dict(reader.capture or {})})
    if observed is None:
        _refuse("CAPTURE_MISMATCH")
    seen, zones = set(), []
    for request in requests:
        if not isinstance(request, dict) or set(request) != {"zone", "expectedSource", "capture", "processingSignature"}:
            _refuse("REQUEST_INVALID")
        zone, source, capture = request["zone"], request["expectedSource"], request["capture"]
        signature = request["processingSignature"]
        if not isinstance(signature, str) or not _SIGNATURE.fullmatch(signature) or not retained_current_processing_signature_compatible(signature, current_signature):
            _refuse("PROCESSING_CONTEXT_UNKNOWN")
        if not isinstance(zone, dict) or not str(zone.get("id", "")).startswith("PART::") or zone["id"] in seen:
            _refuse("REQUEST_INVALID")
        identity = sampling_identity(zone)
        if (not identity or not isinstance(source, dict) or source.get("nativeGridSampling") is not None
                or any(key in source for key in ("nativeSteps", "nativeValidTimes", "temporalResolution", "forecastAgeHours"))
                or not complete_native_source_for_hour(source, "current", zone["id"], identity, valid_time)):
            _refuse("REQUEST_INVALID")
        expected = canonical_current_source_asset(capture)
        if (expected is None or not isinstance(capture, dict) or set(capture) != set(expected)
                or canonical_current_source_asset(source) != expected
                or any(expected[key] != observed[key] for key in expected if key != "acquiredAt")):
            _refuse("CAPTURE_MISMATCH")
        seen.add(zone["id"]);zones.append(copy.deepcopy(zone))
    run, valid = (datetime.fromisoformat(canonical_time(value).replace("Z", "+00:00")) for value in (model_run, valid_time))
    headers = (int(run.strftime("%Y%m%d")), int(run.strftime("%H%M")), int(valid.strftime("%Y%m%d")), int(valid.strftime("%H%M")))
    grid, candidates, winners = _LegacyGrid(operations, reader), {}, {}
    reader.handle.seek(0)
    count = 0
    while True:
        grid.check()
        gid = operations["new_message"](reader.handle)
        if gid is None:
            break
        count += 1
        failure = None
        try:
            if count > 4096:
                _refuse("MESSAGE_BOUND")
            get = operations["get"]
            if get(gid, "edition") not in (1, 2) or tuple(get(gid, key) for key in ("dataDate", "dataTime", "validityDate", "validityTime")) != headers:
                _refuse("HEADER_MISMATCH")
            parameter = operations["classify_parameter"](gid, collection)
            if parameter not in _FIELDS:
                continue
            layer, rank = vector_vertical_layer("current", get(gid, "typeOfLevel"), get(gid, "level"))
            by_zone = grid.candidates(gid, collection, zones)
            for zone in zones:
                key = (zone["id"], layer)
                fields = candidates.setdefault(key, {})
                fields[parameter] = by_zone.get(zone["id"], [])
                pair = _pair(fields)
                if pair is not None:
                    choice = vector_choice(pair[_FIELDS[0]], pair[_FIELDS[1]], layer, rank)
                    if prefer_vector_choice(winners.get(zone["id"]), choice):
                        winners[zone["id"]] = choice
            grid.check()
        except BaseException as error:
            failure = error
            raise
        finally:
            operations["release_message"](gid, failure)
    if count == 0 or reader.handle.tell() != observed["contentLengthBytes"]:
        _refuse("EOF_UNPROVED")
    grid.check()
    output = []
    for request in requests:
        zone, expected = request["zone"], request["expectedSource"]
        choice = winners.get(zone["id"])
        if choice is None:
            _refuse("NATIVE_TUPLE_UNAVAILABLE")
        first, second = choice["first"], choice["second"]
        measured = copy.deepcopy(expected)
        definition, latitude, longitude = _cell(first)
        measured.update(gridPoint=[longitude, latitude], gridDefinitionSha256=definition,
            distanceKm=round(first["distanceKm"], 5), verticalLayer=choice["layerKey"],
            verticalLayerRankM=round(choice["layerRank"], 3))
        if measured != expected:
            _refuse("SOURCE_PROJECTION_MISMATCH")
        output.append({"zoneId": zone["id"], "row": {"time": expected["nativeValidTime"],
            "current-u": first["value"], "current-v": second["value"],
            "sources": {"current": measured}}})
    reader.check()
    return output
