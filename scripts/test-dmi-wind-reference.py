"""Synthetic regression coverage; --real-eccodes also checks actual GRIB keys."""
from __future__ import annotations

import copy
import importlib.util
import math
from pathlib import Path
import sys
import types
import tempfile
import unittest
from unittest.mock import patch

from lib.dmi_wind_reference import read_wind_reference, earth_relative_wind_pair

REAL = "--real-eccodes" in sys.argv
if REAL:
    sys.argv.remove("--real-eccodes")
    import eccodes
else:
    eccodes = types.ModuleType("eccodes")
    eccodes.OutOfAreaError = type("OutOfAreaError", (Exception,), {})
    for name in ("codes_get", "codes_get_array", "codes_get_elements", "codes_grib_find_nearest", "codes_grib_new_from_file", "codes_release"):
        setattr(eccodes, name, lambda *args, **kwargs: None)
    sys.modules["eccodes"] = eccodes

spec = importlib.util.spec_from_file_location("wind_test_producer", Path(__file__).with_name("update-dmi-bulk.py"))
producer = importlib.util.module_from_spec(spec)
spec.loader.exec_module(producer)


def metadata(**changes):
    return {
        "md5GridSection": "a" * 32, "gridType": "lambert", "uvRelativeToGrid": 1,
        "projectionCentreFlag": 0, "LoVInDegrees": 0.0,
        "Latin1InDegrees": 30.0, "Latin2InDegrees": 30.0, **changes,
    }


def reference(**changes):
    data = metadata(**changes)
    return read_wind_reference(1, lambda _gid, key: data[key])


def pair(frame=None, longitude=30.0):
    base = {"latitude": 40.0, "longitude": longitude, "distanceKm": 0.0,
            "gridDefinitionSha256": "b" * 64, "_windReference": frame or reference()}
    return ({**base, "value": 1.0}, {**base, "value": 0.0})


class WindReferenceTest(unittest.TestCase):
    def test_rotation_sign_and_speed(self):
        # Tangent cone at 30 degrees -> n=1/2. Synthetic east/west longitude
        # offsets of 30 degrees have independently known +/-15-degree angles.
        for longitude, angle in [(30, 15), (-30, -15), (0, 0), (390, 15)]:
            first, second = pair(longitude=longitude)
            saved = copy.deepcopy((first, second))
            east, north = earth_relative_wind_pair(first, second)
            self.assertAlmostEqual(east["value"], math.cos(math.radians(angle)))
            self.assertAlmostEqual(north["value"], -math.sin(math.radians(angle)))
            self.assertAlmostEqual(math.hypot(east["value"], north["value"]), 1)
            self.assertEqual((first, second), saved)
            self.assertEqual(east["longitude"], first["longitude"])

    def test_northward_grid_vector_and_calm(self):
        first, second = pair()
        first["value"], second["value"] = 0, 1
        east, north = earth_relative_wind_pair(first, second)
        self.assertAlmostEqual(east["value"], math.sin(math.radians(15)))
        self.assertAlmostEqual(north["value"], math.cos(math.radians(15)))
        first["value"], second["value"] = 0, 0
        east, north = earth_relative_wind_pair(first, second)
        self.assertEqual((east["value"], north["value"]), (0, 0))

    def test_already_earth_relative_is_not_rotated(self):
        first, second = pair(reference(uvRelativeToGrid=0))
        self.assertEqual(earth_relative_wind_pair(first, second), (first, second))

    def test_bad_metadata_is_not_a_default_direction(self):
        for key, value in [("uvRelativeToGrid", None), ("uvRelativeToGrid", True),
                           ("gridType", "rotated_ll"), ("projectionCentreFlag", 128),
                           ("Latin1InDegrees", 90), ("Latin2InDegrees", float("nan")),
                           ("LoVInDegrees", 9999), ("md5GridSection", "invalid")]:
            with self.subTest(key=key, value=value), self.assertRaises(ValueError):
                reference(**{key: value})
        data = metadata()
        del data["Latin1InDegrees"]
        with self.assertRaises(KeyError):
            read_wind_reference(1, lambda _gid, key: data[key])

    def test_cross_frame_or_cell_pair_is_rejected(self):
        for delta in [{"_windReference": reference(LoVInDegrees=1)},
                      {"_windReference": reference(md5GridSection="c" * 32)},
                      {"longitude": 31}, {"gridDefinitionSha256": "d" * 64},
                      {"value": float("nan")}]:
            first, second = pair()
            with self.assertRaises(ValueError):
                earth_relative_wind_pair(first, {**second, **delta})

    def test_lambert_only_omits_non_applicable_angular_keys(self):
        data = {key: 1 for key in producer.GRID_DEFINITION_KEYS}
        data.update(gridType="lambert", md5GridSection="a" * 32)
        for key in producer.LAMBERT_ABSENT_ANGULAR_KEYS:
            del data[key]
        with patch.object(producer, "codes_get", side_effect=lambda _gid, key: data[key]):
            identity = producer.grid_cache_signature(1)
            self.assertEqual(identity[-4:], (None,) * 4)
            self.assertEqual(producer.grid_signature(1), tuple(data.get(key) for key in producer.GRID_DEFINITION_KEYS))
        for bad_key in ("Ni", "md5GridSection", "latitudeOfFirstGridPointInDegrees"):
            damaged = {key: value for key, value in data.items() if key != bad_key}
            with patch.object(producer, "codes_get", side_effect=lambda _gid, key: damaged[key]):
                with self.assertRaises(producer.DmiGridLookupError):
                    producer.grid_cache_signature(1)
        data["gridType"] = "regular_ll"
        with patch.object(producer, "codes_get", side_effect=lambda _gid, key: data[key]):
            with self.assertRaises(producer.DmiGridLookupError):
                producer.grid_cache_signature(1)

    def test_wind_provenance_rejects_legacy_but_marine_is_unchanged(self):
        from lib.dmi_native_provenance import complete_native_source_for_hour, sampling_identity
        zone = {"id": "PART::TEST", "parentZoneId": "TEST", "coastalPart": True, "lon": 2.0, "lat": 1.0}
        candidate = {"longitude": 2.0, "latitude": 1.0, "distanceKm": 0.0, "gridDefinitionSha256": "b" * 64}
        time = "2026-01-01T00:00:00Z"
        source = producer.native_component_source("harmonie_dini_sf", time, time, component="wind", zone=zone,
            grid_candidate=candidate, capture={"itemId": "test", "assetIdentitySha256": "a" * 64,
            "assetSizeBytes": 10, "contentLengthBytes": 10, "contentSha256": "c" * 64, "acquiredAt": time},
            spatial_selection="nearest-shared-grid-cell-no-spatial-interpolation",
            vectorSelection="nearest-shared-grid-cell-no-spatial-interpolation", vectorSemanticsVersion=2,
            vectorReference="earth-relative-east-north", vectorTransform="lambert-conformal-to-earth-relative")
        self.assertIsNotNone(source)
        entity = sampling_identity(zone)
        self.assertTrue(complete_native_source_for_hour(source, "wind", zone["id"], entity, time))
        for delta in [{"vectorSemanticsVersion": 1}, {"vectorReference": None}, {"vectorTransform": "unknown"}, {"vectorTransform": []}]:
            self.assertFalse(complete_native_source_for_hour({**source, **delta}, "wind", zone["id"], entity, time))

    def test_producer_rotates_once_and_emits_verified_native_source(self):
        from contextlib import ExitStack
        from lib.dmi_native_provenance import complete_native_source_for_hour, sampling_identity
        time = "2026-01-01T00:00:00Z"
        zone = {"id": "PART::TEST", "parentZoneId": "TEST", "coastalPart": True,
                "coastType": "east", "lon": 30.0, "lat": 40.0}
        first, second = pair()
        first.pop("_windReference")
        second.pop("_windReference")
        output = {"zones": {}}
        capture = {"itemId": "synthetic-wind", "assetIdentitySha256": "a" * 64,
                   "assetSizeBytes": 10, "contentLengthBytes": 10,
                   "contentSha256": "c" * 64, "acquiredAt": time}
        data = metadata()
        with tempfile.TemporaryDirectory(prefix="rr-wind-test-") as tmp, ExitStack() as stack:
            path = Path(tmp) / "synthetic.grib"
            path.touch()
            stack.enter_context(patch.object(producer, "codes_grib_new_from_file", side_effect=[1, 2, None]))
            stack.enter_context(patch.object(producer, "codes_release"))
            stack.enter_context(patch.object(producer, "codes_get", side_effect=lambda _gid, key: data[key]))
            stack.enter_context(patch.object(producer, "should_stop_work", return_value=False))
            stack.enter_context(patch.object(producer, "raw_cache_source_capture", return_value=capture))
            stack.enter_context(patch.object(producer, "field_signature", return_value={}))
            stack.enter_context(patch.object(producer, "classify_parameter",
                side_effect=lambda gid, _collection: "wind-u-10m" if gid == 1 else "wind-v-10m"))
            stack.enter_context(patch.object(producer, "valid_candidates_batch",
                side_effect=lambda gid, _collection, _zones: {zone["id"]: [first if gid == 1 else second]}))
            producer.process_grib(path, "harmonie_dini_sf", time, time, [zone], output, {})
        hour = output["zones"][zone["id"]]["hourly"][time]
        self.assertAlmostEqual(hour["wind-u-10m"], math.cos(math.radians(15)))
        self.assertAlmostEqual(hour["wind-v-10m"], -math.sin(math.radians(15)))
        source = hour["sources"]["wind"]
        self.assertTrue(complete_native_source_for_hour(source, "wind", zone["id"], sampling_identity(zone), time))
        for point in output["zones"][zone["id"]]["gridPoints"].values():
            self.assertNotIn("_windReference", point)
        producer.wind_from_uv(hour)
        saved = copy.deepcopy(hour)
        producer.wind_from_uv(hour)
        self.assertEqual(hour, saved)
        self.assertAlmostEqual(hour["wind-speed-10m"], 1)
        self.assertAlmostEqual(hour["wind-dir-10m"], 285)

    @unittest.skipUnless(REAL, "actual ecCodes verification requested separately")
    def test_real_eccodes_grid_identity(self):
        for grid_type in ("regular_ll", "lambert"):
            gid = eccodes.codes_grib_new_from_samples("GRIB2")
            try:
                eccodes.codes_set(gid, "gridType", grid_type)
                legacy = tuple(producer.safe_get(gid, key) for key in producer.GRID_DEFINITION_KEYS)
                self.assertEqual(producer.grid_signature(gid), legacy)
                first = producer.grid_cache_signature(gid)
                if grid_type == "lambert":
                    self.assertEqual(first[-4:], (None,) * 4)
                    eccodes.codes_set(gid, "LoVInDegrees", 15)
                    second = producer.grid_cache_signature(gid)
                    self.assertEqual(first[1:], second[1:])
                    self.assertNotEqual(first[0], second[0])
            finally:
                eccodes.codes_release(gid)


if __name__ == "__main__":
    unittest.main()
