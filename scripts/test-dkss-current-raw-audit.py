"""Offline direct-current audit tests using a tiny synthetic ecCodes interface."""
import copy
import hashlib
import json
import tempfile
import unittest

from lib.dmi_native_provenance import canonical_current_source_asset, CURRENT_VECTOR_SELECTION, haversine_point_km
from lib.dkss_current_raw_audit import (
    check_accepted_dkss_hour, check_dkss_current_original, summarize_dkss_current_outcomes,
)


PART = {"partId": "fixture", "zoneId": "fixture-zone", "waterPoint": [12.0, 55.0]}
RUN = "2026-09-19T00:00:00Z"
STEP_KEYS = ("itemId", "assetIdentitySha256", "nativeValidTime", "leadTimeHours", "acquiredAt",
             "optionalFieldSet", "nativeGridSampling", "gridPoint", "distanceKm")
GRID = {"gridType": "regular_ll", "Ni": 2, "Nj": 2, "numberOfPoints": 4,
        "latitudeOfFirstGridPointInDegrees": 55.0, "longitudeOfFirstGridPointInDegrees": 11.0,
        "latitudeOfLastGridPointInDegrees": 56.0, "longitudeOfLastGridPointInDegrees": 12.0,
        "iDirectionIncrementInDegrees": 1.0, "jDirectionIncrementInDegrees": 1.0}
GRID_SECTION = "c" * 32


def digest(fields):
    return hashlib.sha256(json.dumps(list(fields), separators=(",", ":")).encode()).hexdigest()


def endpoint(lead, u, v, raw=b"UV"):
    time = f"2026-09-19T{lead:02d}:00:00Z"
    grid_digest = digest(GRID.values())
    point = [12.0, 55.0]
    source = {
        "provider": "dmi", "fallback": False, "collection": "dkss_idw", "collectionFamily": "marine",
        "modelRun": RUN, "nativeValidTime": time, "leadTimeHours": lead, "acquiredAt": RUN,
        "itemId": f"fixture-{lead}", "contentLengthBytes": len(raw),
        "contentSha256": hashlib.sha256(raw).hexdigest(), "assetIdentitySha256": str(lead) * 64,
        "component": "current", "componentKind": "ocean-current-vector",
        "entityId": "PART::fixture", "parentZoneId": PART["zoneId"], "entityType": "coastal-part",
        "samplingContext": "coastal-part-water-point", "samplingPoint": PART["waterPoint"],
        "gridPoint": point, "distanceKm": 0.0, "gridDefinitionSha256": grid_digest,
        "spatialSemanticsVersion": 1, "spatialSelection": "nearest-shared-grid-cell-no-spatial-interpolation",
        "fieldSet": ["current-u", "current-v"], "optionalFieldSet": [],
        "vectorSelection": CURRENT_VECTOR_SELECTION, "vectorSemanticsVersion": 3,
        "verticalLayer": "depthbelowsea:1", "verticalLayerRankM": 1.0,
    }
    source["nativeGridSampling"] = {
        **{key: source[key] for key in ("gridDefinitionSha256", "gridPoint", "fieldSet", "optionalFieldSet")},
        "contractId": "dmi-native-grid-sampling-v1", "elementIndex": 1,
        "coordinateInterpretation": "dmi-dkss-grib1-header-endpoints-v1",
        "gridIndexIdentitySha256": digest(("grid-native-index-order-v1", GRID_SECTION, *GRID.values())),
    }
    return {"source": source, "time": time, "uMps": u, "vMps": v, "waterPoint": PART["waterPoint"]}


class SyntheticGrib:
    def __init__(self, lead, u, v, overrides=None):
        header = {**GRID, "edition": 1, "dataDate": 20260919, "dataTime": 0,
                  "validityDate": 20260919, "validityTime": lead * 100,
                  "md5GridSection": GRID_SECTION, "scanningMode": 64, "missingValue": 9999.0,
                  "typeOfLevel": "depthBelowSea", "level": 1}
        self.messages = {
            name: {**header, "indicatorOfParameter": parameter, "values": [9999.0, value, 99.0, 88.0],
                   **(overrides or {}).get(name, {})}
            for name, value, parameter in ((b"U", u, 49), (b"V", v, 50))
        }
        self.releases = 0

    def codes_grib_new_from_file(self, file):
        marker = file.read(1)
        return self.messages[marker] if marker else None

    def codes_get(self, message, key):
        return message[key]

    def codes_get_elements(self, message, key, indices):
        return [message[key][index] for index in indices]

    def codes_release(self, _message):
        self.releases += 1


def verify(row, reader, raw=b"UV"):
    with tempfile.TemporaryFile() as file:
        file.write(raw)
        file.flush()
        return check_dkss_current_original(file, canonical_current_source_asset(row["source"]), [row], reader)[0]


class DkssCurrentRawAuditTests(unittest.TestCase):
    def test_independent_bytes_layers_cells_and_both_components(self):
        row = endpoint(1, 0.2, -0.6)
        for name, reader, raw, expected in (
            ("original", SyntheticGrib(1, 0.2, -0.6), b"UV", "MATCH"),
            ("changed bytes", SyntheticGrib(1, 0.2, -0.6), b"VU", "ORIGINAL_BYTES_MISMATCH"),
            ("other hour", SyntheticGrib(2, 0.2, -0.6), b"UV", "ORIGINAL_HEADER_MISMATCH"),
            ("v layer", SyntheticGrib(1, 0.2, -0.6, {b"V": {"level": 2}}), b"UV", "FIELD_LAYER_OR_GRID_MISSING"),
            ("v scan", SyntheticGrib(1, 0.2, -0.6, {b"V": {"md5GridSection": "b" * 32}}), b"UV", "FIELD_LAYER_OR_GRID_MISSING"),
            ("flag interpretation", SyntheticGrib(1, 0.2, -0.6, {b"V": {"scanningMode": 96}}), b"UV", "CELL_OR_LAYER_MISMATCH"),
            ("v wet cell", SyntheticGrib(1, 0.2, 9999.0), b"UV", "CELL_MASKED"),
            ("u component", SyntheticGrib(1, 0.3, -0.6), b"UV", "NATIVE_VECTOR_MISMATCH"),
            ("v component", SyntheticGrib(1, 0.2, 0.6), b"UV", "NATIVE_VECTOR_MISMATCH"),
        ):
            with self.subTest(name=name):
                self.assertEqual(verify(row, reader, raw), expected)
        self.assertEqual(verify(endpoint(1, 0.2, -0.6, b"UUV"), SyntheticGrib(1, 0.2, -0.6), b"UUV"),
                         "FIELD_AMBIGUOUS")

    def test_distance_uses_full_registry_and_raw_cell_precision(self):
        row = endpoint(1, 0.2, -0.6)
        row["waterPoint"] = [12.003456749, 55.00000002]
        raw_longitude = 12.00000004
        raw_grid = {**GRID, "longitudeOfLastGridPointInDegrees": raw_longitude}
        row["source"]["gridDefinitionSha256"] = digest(raw_grid.values())
        sample = row["source"]["nativeGridSampling"]
        sample["gridDefinitionSha256"] = row["source"]["gridDefinitionSha256"]
        sample["gridIndexIdentitySha256"] = digest(("grid-native-index-order-v1", GRID_SECTION, *raw_grid.values()))
        row["source"]["distanceKm"] = round(haversine_point_km(row["waterPoint"], [raw_longitude, 55]), 5)
        reader = SyntheticGrib(1, 0.2, -0.6, {b"U": raw_grid, b"V": raw_grid})
        self.assertEqual(sample["gridPoint"], [12.0, 55.0])
        self.assertEqual(verify(row, reader), "MATCH")
        row["source"]["distanceKm"] += 0.00001
        self.assertEqual(verify(row, reader), "WATER_DISTANCE_MISMATCH")

    def test_original_ends_bind_the_verified_h0_water_point_and_interpolation(self):
        left = endpoint(1, 0.2, -0.6)
        right = endpoint(3, 0.6, -0.2)
        rows = [left, right]
        outcomes = [verify(row, SyntheticGrib(lead, row["uMps"], row["vMps"]))
                    for lead, row in zip((1, 3), rows)]
        source = {**left["source"], "status": "verified", "temporalResolution": "interpolated",
                  "nativeValidTimes": [row["time"] for row in rows],
                  "nativeSteps": [{key: row["source"][key] for key in STEP_KEYS} for row in rows]}
        hour = {"time": "2026-09-19T02:00:00Z", "currentUMps": 0.4, "currentVMps": -0.4,
                "currentProvenance": source}
        self.assertEqual(check_accepted_dkss_hour(PART, hour, rows, outcomes), "MATCH")
        self.assertEqual(check_accepted_dkss_hour({**PART, "waterPoint": [11.9, 55.0]}, hour, rows, outcomes),
                         "WATER_POINT_MISMATCH")
        self.assertEqual(check_accepted_dkss_hour(PART, {**hour, "currentVMps": 0.4}, rows, outcomes),
                         "ACCEPTED_VECTOR_MISMATCH")
        self.assertEqual(check_accepted_dkss_hour(PART, {**hour, "currentProvenance": {**source, "fallback": True}},
                                                  rows, outcomes), "OTHER_OR_MISSING_SOURCE")
        self.assertEqual(check_accepted_dkss_hour(PART, hour, rows, ["MATCH", "ORIGINAL_BYTES_MISMATCH"]),
                         "ORIGINAL_BYTES_MISMATCH")
        wrong_endpoint = copy.deepcopy(hour)
        wrong_endpoint["currentProvenance"]["nativeSteps"][1]["assetIdentitySha256"] = "b" * 64
        self.assertEqual(check_accepted_dkss_hour(PART, wrong_endpoint, rows, outcomes), "TEMPORAL_SOURCE_MISMATCH")
        exact = {**hour, "time": left["time"], "currentUMps": left["uMps"], "currentVMps": left["vMps"],
                 "currentProvenance": {**source, "temporalResolution": "native",
                                       "nativeValidTimes": source["nativeValidTimes"][:1],
                                       "nativeSteps": source["nativeSteps"][:1]}}
        self.assertEqual(check_accepted_dkss_hour(PART, exact, rows[:1], outcomes[:1]), "MATCH")
        self.assertEqual(summarize_dkss_current_outcomes(["MATCH", "MATCH", "private-canary"]),
                         {"MATCH": 2, "UNCLASSIFIED": 1})


if __name__ == "__main__":
    unittest.main()
