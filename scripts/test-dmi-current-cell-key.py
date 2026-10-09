#!/usr/bin/env python3
"""Small producer-join regression; synthetic candidates, NOT native end-to-end.

The permitted local runtime lacks requests/eccodes. By default execute exact
FunctionDef nodes from update-dmi-bulk.py, without replacing their algorithms
or pretending the producer/native decoder was imported. Candidate lists here
represent already-filtered field inputs; this test does not establish which
indices a native nearest-probe union actually returns for an original file.
"""

from __future__ import annotations

import ast
import copy
from contextlib import contextmanager, redirect_stderr, redirect_stdout
import hashlib
import importlib.util
import io
import json
import math
import os
from pathlib import Path
import re
import sys
import tempfile
import unittest
from unittest.mock import patch


PRODUCER_PATH = Path(__file__).with_name("update-dmi-bulk.py")
FUNCTION_NAMES = ("candidate_cell_key", "grid_point_metadata", "select_common_grid_tuple")
U, V = "current-u", "current-v"
DEFINITION = "a" * 64  # Synthetic common grid, same scan order in both fields.
INDEX_IDENTITY = "c" * 64  # Synthetic SHA-256 of a complete order-sensitive grid.
REAL = "--real-eccodes" in sys.argv
if REAL:
    sys.argv.remove("--real-eccodes")
MAX_SYNTHETIC_BYTES = 32 * 1024 * 1024
MAX_RESULT_BYTES = 64 * 1024


def load_actual_functions():
    source = PRODUCER_PATH.read_text(encoding="utf-8")
    tree = ast.parse(source, filename=str(PRODUCER_PATH))
    definitions = {node.name: node for node in tree.body if isinstance(node, ast.FunctionDef)}
    if not all(name in definitions for name in FUNCTION_NAMES):
        raise AssertionError("Expected exactly the current producer key/join definitions")
    # Include exact function callees if the production fix factors a private
    # node-key helper. Do not prescribe its name or copy its implementation.
    wanted = set(FUNCTION_NAMES)
    pending = list(FUNCTION_NAMES)
    while pending:
        for node in ast.walk(definitions[pending.pop()]):
            if (isinstance(node, ast.Call) and isinstance(node.func, ast.Name)
                    and node.func.id in definitions and node.func.id not in wanted):
                wanted.add(node.func.id)
                pending.append(node.func.id)
    functions = [node for node in tree.body if isinstance(node, ast.FunctionDef) and node.name in wanted]
    # Retain the producer's annotation semantics and unmodified function nodes.
    future_imports = [
        node for node in tree.body
        if isinstance(node, ast.ImportFrom) and node.module == "__future__"
    ]
    namespace = {"math": math, "re": re, "__name__": "actual_producer_join_ast"}
    module = ast.Module(body=[*future_imports, *functions], type_ignores=[])
    exec(compile(module, str(PRODUCER_PATH), "exec"), namespace)
    hashes = {
        node.name: hashlib.sha256(ast.get_source_segment(source, node).encode("utf-8")).hexdigest()
        for node in functions
    }
    return namespace, hashes


ACTUAL, FUNCTION_SHA256 = load_actual_functions()
candidate_cell_key = ACTUAL["candidate_cell_key"]
select_common_grid_tuple = ACTUAL["select_common_grid_tuple"]
grid_point_metadata = ACTUAL["grid_point_metadata"]


def candidate(index, latitude, longitude=10.034, *, value=0.25, distance=1.0,
              definition=DEFINITION, index_identity=INDEX_IDENTITY):
    return {
        "index": index,
        "latitude": latitude,
        "longitude": longitude,
        "value": value,
        "distanceKm": distance,
        "gridDefinitionSha256": definition,
        "_gridIndexIdentity": index_identity,
    }


def synthetic_lf_row(row, *, value=0.25):
    # Synthetic origin; the 810x390 layout, 0.002 increment, 0.648 endpoint
    # span and row indices reproduce the diagnosed alias arithmetic only.
    # This is NOT an implementation or approval of corrected physical spacing.
    latitude = 40.648 if row == 389 else 40.0 + row * 0.002
    return candidate(row * 810 + 17, latitude, value=value)


def synthetic_masked_lf_field(missing_rows, *, value):
    # Test inputs after a field's own missing-mask filtering, not a substitute
    # for valid_candidates_batch or a claim that native lookup reached both.
    return [synthetic_lf_row(row, value=value) for row in (324, 389)
            if row not in missing_rows]


class CurrentCellJoinRegression(unittest.TestCase):
    def select(self, u, v):
        fields = {U: u, V: v}
        before = copy.deepcopy(fields)
        result = select_common_grid_tuple(fields, (U, V))
        self.assertEqual(fields, before, "The selection must not rewrite its input candidates")
        return result

    def assert_same_node(self, pair, index):
        self.assertIsNotNone(pair)
        self.assertEqual((pair[U]["index"], pair[V]["index"]), (index, index))

    def test_lf_alias_with_disjoint_missing_masks_must_not_pair(self):
        u = synthetic_masked_lf_field({389}, value=0.25)
        v = synthetic_masked_lf_field({324}, value=-0.5)
        self.assertEqual([row["index"] for row in u], [262457])
        self.assertEqual([row["index"] for row in v], [315107])
        self.assertFalse({row["index"] for row in u} & {row["index"] for row in v})
        pair = self.select(u, v)
        # The key's present coordinate alias is observational, not a prescribed
        # API change: an internal index-aware join may preserve the 3-tuple key.
        alias = candidate_cell_key(u[0]) == candidate_cell_key(v[0])
        self.assertIsNone(
            pair,
            f"Disjoint same-order native nodes must not form U/V; coordinate_key_alias={alias}",
        )

    def test_same_interior_index_pairs_and_preserves_valid_zero(self):
        pair = self.select([synthetic_lf_row(324, value=0.0)], [synthetic_lf_row(324, value=-0.5)])
        self.assert_same_node(pair, 262457)
        self.assertEqual(pair[U]["value"], 0.0)

    def test_same_endpoint_index_remains_valid(self):
        pair = self.select([synthetic_lf_row(389)], [synthetic_lf_row(389, value=-0.5)])
        self.assert_same_node(pair, 315107)

    def test_regular_grid_different_masks_choose_real_common_index(self):
        # Parallel U/V fields on an ordinary non-aliasing grid. Their closest
        # valid nodes differ; the farther node really is common to both.
        u = [candidate(10, 40.0, distance=0.2), candidate(12, 40.004, distance=1.0)]
        v = [candidate(11, 40.002, distance=0.4), candidate(12, 40.004, value=-0.5, distance=1.0)]
        self.assert_same_node(self.select(u, v), 12)

    def test_regular_grid_without_common_node_rejects(self):
        self.assertIsNone(self.select([candidate(10, 40.0)], [candidate(11, 40.002)]))

    def test_equal_index_and_coordinates_on_different_grids_reject(self):
        self.assertIsNone(self.select(
            [candidate(10, 40.0)], [candidate(10, 40.0, definition="b" * 64)],
        ))

    def test_duplicate_reports_of_same_node_do_not_destroy_valid_pair(self):
        u = [candidate(10, 40.0), candidate(10, 40.0)]
        self.assert_same_node(self.select(u, [candidate(10, 40.0, value=-0.5)]), 10)

    def test_missing_component_cannot_form_pair(self):
        self.assertIsNone(self.select([candidate(10, 40.0)], []))

    def test_different_order_identity_cannot_pair_equal_public_cell_and_index(self):
        self.assertIsNone(self.select(
            [candidate(10, 40.0)], [candidate(10, 40.0, index_identity="d" * 64)],
        ))

    def test_missing_or_invalid_order_identity_cannot_pair(self):
        for identity in (None, "", "bad", "C" * 64):
            with self.subTest(identity=identity):
                row = candidate(10, 40.0, index_identity=identity)
                if identity is None:
                    row.pop("_gridIndexIdentity")
                self.assertIsNone(self.select([candidate(10, 40.0)], [row]))

    def test_invalid_index_cannot_pair(self):
        for index in (True, False, -1, 10.0, None, "10"):
            with self.subTest(index=index):
                self.assertIsNone(self.select(
                    [candidate(10, 40.0)], [candidate(index, 40.0)],
                ))

    def test_grid_point_metadata_never_leaks_private_order_identity(self):
        row = candidate(10, 40.000001)
        before = copy.deepcopy(row)
        for excluded in ((), ("index", "value")):
            with self.subTest(excluded=excluded):
                metadata = grid_point_metadata(row, excluded)
                self.assertNotIn("_gridIndexIdentity", metadata)
                self.assertEqual(metadata["gridDefinitionSha256"], DEFINITION)
                self.assertEqual(metadata["latitude"], round(row["latitude"], 5))
                self.assertEqual(row, before)


if REAL:
    class NativeCurrentCellJoinRegression(unittest.TestCase):
        """Opt-in CI gate, UNVERIFIED locally; no injected candidate rows.

        These are artificial files/shapes, not authenticated DMI originals or
        a proof of physical grid spacing. A missing native alias in the actual
        nearest union FAILS explicitly instead of substituting that candidate.
        """

        LF = (810, 390, 56.461, 57.109, 8.138, 10.385, .003, .002)
        NSBS = (414, 348, 48.525, 65.875, 355.875, 30.292, .083, .05)
        WAVE = (201, 201, 56.4, 56.8, 10.0, 10.4, .002, .002)
        WAVE_INDEX = 100 * 201 + 100
        ALIAS = (262457, 315107)
        TIME = "2026-10-09T00:00:00Z"
        allocated_fixture_bytes = 0

        @classmethod
        def setUpClass(cls):
            # The same real import seam as test-dmi-wind-reference.py --real-eccodes.
            # Missing pinned libraries are an error, never a skip/fake import.
            import eccodes
            import numpy
            cls.ec, cls.np = eccodes, numpy
            if eccodes.codes_get_api_version() != "2.48.2":
                raise AssertionError("This native gate requires the existing pinned ecCodes 2.48.2")
            cls.temp = tempfile.TemporaryDirectory(prefix="rr-cell-key-synthetic-")
            cls.addClassCleanup(cls.temp.cleanup)
            cls.directory = Path(cls.temp.name)
            with patch.dict(os.environ, {"DMI_BULK_RAW_DIR": str(cls.directory)}):
                spec = importlib.util.spec_from_file_location("cell_key_real_producer", PRODUCER_PATH)
                cls.producer = importlib.util.module_from_spec(spec)
                spec.loader.exec_module(cls.producer)
            if cls.producer.RAW_DIR.resolve() != cls.directory.resolve():
                raise AssertionError("Synthetic capture directory was not isolated")

        @classmethod
        def charge_fixture(cls, count):
            cls.allocated_fixture_bytes += count
            if cls.allocated_fixture_bytes > MAX_SYNTHETIC_BYTES:
                raise AssertionError("Synthetic numeric arrays/messages exceeded 32 MiB")

        @contextmanager
        def grid(self, shape, indices):
            ec, producer = self.ec, self.producer
            ni, nj, first_lat, last_lat, first_lon, last_lon, di, dj = shape
            gid = ec.codes_grib_new_from_samples("regular_ll_sfc_grib1")
            try:
                for key, value in (
                    ("Ni", ni), ("Nj", nj),
                    ("latitudeOfFirstGridPointInDegrees", first_lat),
                    ("latitudeOfLastGridPointInDegrees", last_lat),
                    ("longitudeOfFirstGridPointInDegrees", first_lon),
                    ("longitudeOfLastGridPointInDegrees", last_lon),
                    ("iDirectionIncrementInDegrees", di), ("jDirectionIncrementInDegrees", dj),
                    ("scanningMode", 64), ("resolutionAndComponentFlags", 128),
                    ("dataDate", 20261009), ("dataTime", 0), ("stepRange", "0"),
                    ("indicatorOfParameter", 49), ("missingValue", 9999.0), ("bitmapPresent", 1),
                ):
                    ec.codes_set(gid, key, value)
                values = self.np.zeros(ni * nj, dtype=self.np.float64)
                self.charge_fixture(values.nbytes)
                ec.codes_set_values(gid, values)
                self.assertEqual(int(ec.codes_get(gid, "numberOfPoints")), ni * nj)
                latitudes = ec.codes_get_array(gid, "latitudes")
                longitudes = ec.codes_get_array(gid, "longitudes")
                self.charge_fixture(latitudes.nbytes + longitudes.nbytes)
                cells = {index: (float(latitudes[index]), float(longitudes[index])) for index in indices}
                del latitudes, longitudes
                producer.GRID_INDEX_CACHE.clear()
                yield gid, values, cells
            finally:
                ec.codes_release(gid)
                producer.GRID_INDEX_CACHE.clear()

        def zone(self, coordinate, coast_type="limfjord"):
            return {"id": "PART::SYNTHETIC", "parentZoneId": "SYNTHETIC",
                    "coastalPart": True, "coastType": coast_type,
                    "lat": coordinate[0], "lon": coordinate[1]}

        def native_union(self, gid, collection, zone):
            producer = self.producer
            signature = producer.grid_cache_signature(gid)
            producer.warm_marine_grid_cache(gid, collection, [zone], signature)
            union = producer.nearest_candidates(gid, collection, zone, signature=signature)
            self.assertLessEqual(len(union), producer.grid_candidate_target(collection, zone))
            return union

        def require_native_union(self, gid, collection, zone, indices):
            union = self.native_union(gid, collection, zone)
            actual = {row["index"] for row in union}
            self.assertTrue(
                set(indices) <= actual,
                "NATIVE_REACHABILITY_UNPROVED: actual normal probe union did not contain every required node; "
                f"syntheticExpectedIndices={list(indices)}; syntheticActualIndices={sorted(actual)}",
            )
            return union

        def masked_candidates(self, gid, values, collection, zone, index, value, parameter):
            self.ec.codes_set(gid, "indicatorOfParameter", parameter)
            values.fill(9999.0)
            values[index] = value
            self.ec.codes_set_values(gid, values)
            self.assertEqual(int(self.ec.codes_get(gid, "numberOfMissing")), len(values) - 1)
            rows = self.producer.valid_candidates_batch(gid, collection, [zone]).get(zone["id"], [])
            self.assertEqual({row["index"] for row in rows}, {index}, "Real field-mask lookup lost the intended node")
            identity = self.producer.grid_index_identity_sha256_from_cache(
                self.producer.grid_cache_signature(gid),
            )
            for row in rows:
                self.assertRegex(row.get("_gridIndexIdentity", ""), r"^[0-9a-f]{64}$")
                self.assertEqual(row["_gridIndexIdentity"], identity)
            return rows

        def test_native_lf_disjoint_masks_do_not_pair_after_real_union(self):
            with self.grid(self.LF, self.ALIAS) as (gid, values, cells):
                self.assertAlmostEqual(cells[self.ALIAS[0]][0], cells[self.ALIAS[1]][0], places=9)
                self.assertAlmostEqual(cells[self.ALIAS[0]][1], cells[self.ALIAS[1]][1], places=9)
                zone = self.zone(cells[self.ALIAS[0]])
                self.require_native_union(gid, "dkss_lf", zone, self.ALIAS)
                u = self.masked_candidates(gid, values, "dkss_lf", zone, self.ALIAS[0], .25, 49)
                v = self.masked_candidates(gid, values, "dkss_lf", zone, self.ALIAS[1], -.5, 50)
                self.assertIsNone(self.producer.select_common_grid_tuple({U: u, V: v}, (U, V)))

        def test_native_lf_same_index_and_zero_remain_valid(self):
            with self.grid(self.LF, self.ALIAS) as (gid, values, cells):
                zone = self.zone(cells[self.ALIAS[0]])
                # Positive caller proof must use a node the real lookup reaches,
                # not assume that the independently derived alias is reachable.
                union = self.native_union(gid, "dkss_lf", zone)
                self.assertTrue(union, "Real LF lookup returned no positive control node")
                index = union[0]["index"]
                u = self.masked_candidates(gid, values, "dkss_lf", zone, index, 0.0, 49)
                v = self.masked_candidates(gid, values, "dkss_lf", zone, index, -.5, 50)
                pair = self.producer.select_common_grid_tuple({U: u, V: v}, (U, V))
                self.assertIsNotNone(pair)
                self.assertEqual((pair[U]["index"], pair[V]["index"]), (index, index))
                self.assertEqual(pair[U]["value"], 0.0)

        def test_native_nsbs_normal_grid_same_index_remains_valid(self):
            index = 200 * 414 + 100
            with self.grid(self.NSBS, (index,)) as (gid, values, cells):
                zone = self.zone(cells[index], "west")
                self.require_native_union(gid, "dkss_nsbs", zone, (index,))
                u = self.masked_candidates(gid, values, "dkss_nsbs", zone, index, .25, 49)
                v = self.masked_candidates(gid, values, "dkss_nsbs", zone, index, -.5, 50)
                pair = self.producer.select_common_grid_tuple({U: u, V: v}, (U, V))
                self.assertIsNotNone(pair)
                self.assertEqual((pair[U]["index"], pair[V]["index"]), (index, index))

        def wave_file(self, gid, values, path, direction_index):
            # Real artificial WAM fields on a regular synthetic grid. The
            # native classifier must confirm every shortName; no stubbed field
            # identity or source-capture return value is permitted.
            fields = (("swh", "significant-wave-height", self.WAVE_INDEX, 1.0),
                      ("pp1d", "dominant-wave-period", self.WAVE_INDEX, 8.0),
                      ("mwd", "mean-wave-dir", direction_index, 90.0))
            with path.open("wb") as output:
                for short_name, expected, index, value in fields:
                    self.ec.codes_set(gid, "shortName", short_name)
                    self.assertEqual(self.producer.classify_parameter(gid, "wam_dw"), expected)
                    values.fill(9999.0)
                    values[index] = value
                    self.ec.codes_set_values(gid, values)
                    message = self.ec.codes_get_message(gid)
                    self.charge_fixture(len(message))
                    output.write(message)
            digest = hashlib.sha256(path.read_bytes()).hexdigest()
            row = {"collection": "wam_dw", "modelRun": self.TIME, "validTime": self.TIME,
                   "itemId": "synthetic-wave-only", "acquiredAt": self.TIME,
                   "assetIdentitySha256": hashlib.sha256(b"synthetic-wave-only").hexdigest(),
                   "assetSizeBytes": path.stat().st_size, "contentLengthBytes": path.stat().st_size,
                   "contentSha256": digest}
            self.producer.save_raw_cache_manifest({"schemaVersion": 2, "assets": {path.name: row}})
            self.assertIsNotNone(self.producer.raw_cache_source_capture(path, "wam_dw", self.TIME, self.TIME))
            return digest

        def test_native_optional_wave_direction_requires_same_node(self):
            # The old LF-shaped wave fixture placed the target at a domain
            # boundary: ordinary WAM probing correctly failed OutOfAreaError.
            # Keep this control well inside its own artificial WAM domain;
            # the separate LF alias reachability gate remains strict and OPEN.
            indices = (self.WAVE_INDEX, self.WAVE_INDEX + 1)
            with self.grid(self.WAVE, indices) as (gid, values, cells):
                zone = self.zone(cells[self.WAVE_INDEX], "east")
                self.require_native_union(gid, "wam_dw", zone, indices)
                path = self.directory / "synthetic-wave.grib"
                for same_node in (False, True):
                    with self.subTest(same_node=same_node):
                        digest = self.wave_file(gid, values, path, indices[0 if same_node else 1])
                        output, diagnostics = {"zones": {}}, {}
                        found, _, interrupted, messages, _ = self.producer.process_grib(
                            path, "wam_dw", self.TIME, self.TIME, [zone], output, diagnostics,
                        )
                        self.assertFalse(interrupted)
                        self.assertEqual(messages, 3)
                        self.assertEqual(found, {"significant-wave-height", "dominant-wave-period", "mean-wave-dir"})
                        hour = output["zones"].get(zone["id"], {}).get("hourly", {}).get(self.TIME)
                        if same_node:
                            self.assertIsNotNone(hour, "Normal positive wave publication did not complete")
                            self.assertEqual(hour["mean-wave-dir"], 90.0)
                            self.assertEqual(hour["sources"]["wave"]["optionalFieldSet"], ["mean-wave-dir"])
                            self.assertNotIn("_gridIndexIdentity", json.dumps(output))
                        else:
                            self.assertIsNone(hour)
                            self.assertEqual(diagnostics["rejectedScalarTuples"][zone["id"]]["wave"],
                                             "MISSING_WAVE_DIRECTION")
                        self.assertEqual(hashlib.sha256(path.read_bytes()).hexdigest(), digest)


class BoundedResult(io.StringIO):
    """Cap the Python test result, not a claim about total native process RSS."""
    def __init__(self):
        super().__init__()
        self.byte_count = 0

    def write(self, value):
        self.byte_count += len(value.encode("utf-8"))
        if self.byte_count > MAX_RESULT_BYTES:
            raise AssertionError("Synthetic test result exceeded 64 KiB")
        return super().write(value)


if __name__ == "__main__":
    if REAL:
        # Test-process-local, before importing the real producer. No socket
        # operation, DNS/provider request or replacement downloader is allowed.
        def reject_network(event, _args):
            if event.startswith("socket."):
                raise RuntimeError("NETWORK_FORBIDDEN_IN_SYNTHETIC_CELL_KEY_TEST")
        sys.addaudithook(reject_network)
    result = BoundedResult()
    with redirect_stdout(result), redirect_stderr(result):
        print("SCOPE: exact producer AST functions; synthetic post-mask candidates; NOT full import/native proof")
        if REAL:
            print("OPT-IN: real pinned native producer, own synthetic GRIB only; native gate UNVERIFIED until this run passes")
        for name, digest in FUNCTION_SHA256.items():
            print(f"FUNCTION_SHA256 {name} {digest}")
        program = unittest.main(verbosity=2, exit=False)
    sys.stdout.write(result.getvalue())
    raise SystemExit(0 if program.result.wasSuccessful() else 1)
