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
from datetime import datetime, timezone
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
FUNCTION_NAMES = ("candidate_cell_key", "grid_point_metadata", "select_common_grid_tuple",
                  "dkss_grib1_header_geometry", "dkss_header_grid_point", "dkss_header_grid_nearest")
U, V = "current-u", "current-v"
DEFINITION = "a" * 64  # Synthetic common grid, same scan order in both fields.
INDEX_IDENTITY = "c" * 64  # Synthetic SHA-256 of a complete order-sensitive grid.
REAL = "--real-eccodes" in sys.argv
if REAL:
    sys.argv.remove("--real-eccodes")
MAX_SYNTHETIC_BYTES = 32 * 1024 * 1024
MAX_RESULT_BYTES = 64 * 1024


def load_actual_functions(extra_names=(), source_override=None):
    source = source_override if source_override is not None else PRODUCER_PATH.read_text(encoding="utf-8")
    tree = ast.parse(source, filename=str(PRODUCER_PATH))
    definitions = {node.name: node for node in tree.body if isinstance(node, ast.FunctionDef)}
    roots = tuple(extra_names) if source_override is not None else (*FUNCTION_NAMES, *extra_names)
    if not all(name in definitions for name in roots):
        raise AssertionError("Expected exactly the current producer key/join definitions")
    # Include exact function callees if the production fix factors a private
    # node-key helper. Do not prescribe its name or copy its implementation.
    wanted = set(roots)
    pending = list(roots)
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
    namespace = {"math": math, "re": re, "os": os, "json": json,
                 "hashlib": hashlib, "__name__": "actual_producer_join_ast"}
    constants = [node for node in tree.body if isinstance(node, ast.Assign)
                 and any(isinstance(target, ast.Name) and target.id in {
                     "GRID_DEFINITION_KEYS", "LAMBERT_ABSENT_ANGULAR_KEYS",
                     "GRID_CANDIDATE_TARGET", "LIMFJORD_GRID_CANDIDATE_TARGET",
                     "ATMOSPHERIC_GRID_CANDIDATE_TARGET",
                 } for target in node.targets)]
    errors = [node for node in tree.body if isinstance(node, ast.ClassDef)
              and node.name == "DmiGridLookupError"]
    module = ast.Module(body=[*future_imports, *constants, *errors, *functions], type_ignores=[])
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
dkss_grib1_header_geometry = ACTUAL["dkss_grib1_header_geometry"]
dkss_header_grid_point = ACTUAL["dkss_header_grid_point"]
dkss_header_grid_nearest = ACTUAL["dkss_header_grid_nearest"]


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


class PersistedNativeSamplingRegression(unittest.TestCase):
    """Actual source constructor, own tuples/capture; no original/native claim."""

    def setUp(self):
        from lib import dmi_native_provenance as provenance
        self.namespace, _ = load_actual_functions(extra_names=("native_component_source",))
        self.namespace.update({"datetime": datetime, "timezone": timezone})
        for name in ("sampling_identity", "component_collection_allowed", "COMPONENT_FIELD_SET",
                     "COMPONENT_KIND", "COMPONENT_SPATIAL_SELECTION", "COLLECTION_FAMILY",
                     "SPATIAL_PROVENANCE_VERSION"):
            self.namespace[name] = getattr(provenance, name)
        self.source = self.namespace["native_component_source"]
        self.zone = {"id": "PART::OWN-001", "parentZoneId": "OWN-AREA", "lat": 57., "lon": 10.}
        self.rows = {field: {**candidate(7, 57., 10., value=0., distance=0.),
                            "_gridCoordinateInterpretation": "dmi-dkss-grib1-header-endpoints-v1"}
                     for field in (U, V)}
        self.capture = {"itemId": "own-synthetic-asset", "assetIdentitySha256": "b" * 64,
                        "assetSizeBytes": 16, "contentLengthBytes": 16, "contentSha256": "d" * 64,
                        "acquiredAt": "2026-01-01T01:00:00Z"}

    def construct(self, rows=None, *, legacy=False):
        rows = self.rows if rows is None else rows
        return self.source("dkss_lf", "2026-01-01T00:00:00Z", "2026-01-01T03:00:00Z",
            component="current", zone=self.zone, grid_candidate=self.rows[U], capture=self.capture,
            spatial_selection="nearest-shared-grid-cell-no-spatial-interpolation",
            verticalLayer="surface:0", verticalLayerRankM=0.,
            **({} if legacy else {"grid_tuple": rows}))

    def test_actual_source_persists_selected_index_and_interpretation_not_values(self):
        before = copy.deepcopy((self.rows, self.capture))
        source = self.construct()
        self.assertIsNotNone(source)
        self.assertNotIn("grid_tuple", source)
        receipt = source.get("nativeGridSampling")
        self.assertIsInstance(receipt, dict, "actual normal source loses durable native-node evidence")
        self.assertEqual(receipt["contractId"], "dmi-native-grid-sampling-v1")
        self.assertEqual(receipt["elementIndex"], 7)
        self.assertEqual(receipt["gridIndexIdentitySha256"], INDEX_IDENTITY)
        self.assertEqual(receipt["coordinateInterpretation"], "dmi-dkss-grib1-header-endpoints-v1")
        self.assertEqual(receipt["fieldSet"], [U, V])
        self.assertEqual(receipt["optionalFieldSet"], [])
        self.assertEqual(receipt["gridPoint"], source["gridPoint"])
        self.assertNotIn("value", json.dumps(receipt))
        self.assertEqual((self.rows, self.capture), before)
        self.assertEqual(json.loads(json.dumps(source)), source)

    def test_actual_source_refuses_different_node_order_rule_or_missing_field(self):
        for field, value in (("index", 8), ("index", True),
                             ("_gridIndexIdentity", "e" * 64),
                             ("_gridCoordinateInterpretation", "eccodes-native-coordinates-v1"),
                             ("_gridCoordinateInterpretation", None),
                             ("_gridCoordinateInterpretation", []),
                             ("latitude", True), ("value", float("nan")), ("value", True)):
            with self.subTest(field=field, value=str(value)):
                rows = copy.deepcopy(self.rows)
                rows[V][field] = value
                self.assertIsNone(self.construct(rows))
        self.assertIsNone(self.construct({U: self.rows[U]}))
        self.assertIsNone(self.construct({**self.rows, "unrequested-field": self.rows[U]}))

    def test_legacy_source_is_not_automatically_relabelled(self):
        source = self.construct(legacy=True)
        self.assertIsNotNone(source)
        self.assertNotIn("nativeGridSampling", source)
        self.assertNotIn("_gridIndexIdentity", source)
        self.assertNotIn("_gridCoordinateInterpretation", source)

    def test_normal_private_storage_roundtrip_preserves_distinct_hour_records(self):
        from lib.dmi_bulk_storage import read_dmi_bulk_document, write_dmi_bulk_document
        first = self.construct()
        rows = copy.deepcopy(self.rows)
        for row in rows.values():
            row["index"] = 8
        second = self.source("dkss_lf", "2026-01-01T00:00:00Z", "2026-01-01T04:00:00Z",
            component="current", zone=self.zone, grid_candidate=rows[U], grid_tuple=rows,
            capture=self.capture, spatial_selection="nearest-shared-grid-cell-no-spatial-interpolation",
            verticalLayer="surface:0", verticalLayerRankM=0.)
        document = {"schemaVersion": 2, "zones": {self.zone["id"]: {"hourly": {
            source["nativeValidTime"]: {"time": source["nativeValidTime"], "sources": {"current": source}}
            for source in (first, second)
        }}}}
        before = copy.deepcopy(document)
        with tempfile.TemporaryDirectory() as directory:
            target = Path(directory) / "own-synthetic-dmi.json"
            write_dmi_bulk_document(target, document)
            restored = read_dmi_bulk_document(target)
        self.assertEqual(document, before)
        self.assertEqual(restored, before)
        hours = restored["zones"][self.zone["id"]]["hourly"]
        receipts = [hour["sources"]["current"]["nativeGridSampling"] for hour in hours.values()]
        self.assertEqual([row["elementIndex"] for row in receipts], [7, 8])
        receipts[0]["gridPoint"][0] = 99
        self.assertEqual(receipts[1]["gridPoint"], [10., 57.])
        self.assertEqual(first["nativeGridSampling"]["gridPoint"], [10., 57.])

    def test_all_fresh_component_tuples_and_optional_wave_direction_are_checked(self):
        from lib import dmi_native_provenance as provenance
        for component, fields in provenance.COMPONENT_FIELD_SET.items():
            collection = ("harmonie_dini_sf" if component == "wind" else
                          "wam_dw" if component == "wave" else "dkss_lf")
            for optional in (((), ("mean-wave-dir",)) if component == "wave" else ((),)):
                with self.subTest(component=component, optional=optional):
                    rows = {field: {**self.rows[U], "_gridCoordinateInterpretation":
                            "eccodes-native-coordinates-v1"} for field in (*fields, *optional)}
                    source = self.source(collection, "2026-01-01T00:00:00Z", "2026-01-01T03:00:00Z",
                        component=component, zone=self.zone, grid_candidate=rows[fields[0]],
                        grid_tuple=rows, capture=self.capture, optional_field_set=optional,
                        spatial_selection=provenance.COMPONENT_SPATIAL_SELECTION[component])
                    self.assertIsNotNone(source)
                    self.assertEqual(source["nativeGridSampling"]["fieldSet"], list(fields))
                    self.assertEqual(source["nativeGridSampling"]["optionalFieldSet"], list(optional))
                    if optional:
                        rows[optional[0]]["index"] = 9
                        self.assertIsNone(self.source(collection, "2026-01-01T00:00:00Z",
                            "2026-01-01T03:00:00Z", component=component, zone=self.zone,
                            grid_candidate=rows[fields[0]], grid_tuple=rows, capture=self.capture,
                            optional_field_set=optional,
                            spatial_selection=provenance.COMPONENT_SPATIAL_SELECTION[component]))


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
        row['_gridCoordinateInterpretation'] = 'dmi-dkss-grib1-header-endpoints-v1'
        before = copy.deepcopy(row)
        for excluded in ((), ("index", "value")):
            with self.subTest(excluded=excluded):
                metadata = grid_point_metadata(row, excluded)
                self.assertNotIn("_gridIndexIdentity", metadata)
                self.assertNotIn("_gridCoordinateInterpretation", metadata)
                self.assertEqual(metadata["gridDefinitionSha256"], DEFINITION)
                self.assertEqual(metadata["latitude"], round(row["latitude"], 5))
                self.assertEqual(row, before)


class DkssHeaderGeometryRegression(unittest.TestCase):
    """Exact pure producer functions; no native import or original read claim.

    DMI's FAQ prescribes extent/(point-count-1) for DKSS GRIB1 placement.
    Its illustration uses longitude; the corresponding regular latitude-axis
    construction is tested here explicitly, not inferred from rounded spacing.
    """

    @staticmethod
    def signature(ni=5, nj=4, first_lat=10.0, last_lat=13.0,
                  first_lon=20.0, last_lon=24.0, points=None):
        return ("a" * 32, "regular_ll", ni, nj, ni * nj if points is None else points,
                first_lat, first_lon, last_lat, last_lon, .001, .001)

    def test_lf_endpoint_axis_is_unique_and_preserves_original_index(self):
        sig = self.signature(810, 390, 56.461, 57.109, 8.138, 10.385)
        geometry = dkss_grib1_header_geometry(sig, 64)
        first = dkss_header_grid_point(geometry, 262457)
        last = dkss_header_grid_point(geometry, 315107)
        self.assertEqual((first["index"], last["index"]), (262457, 315107))
        self.assertAlmostEqual(first["lat"], 56.461 + 324 * (57.109 - 56.461) / 389, places=12)
        self.assertEqual(last["lat"], 57.109)
        self.assertNotEqual(first["lat"], last["lat"])
        self.assertEqual(first["lon"], last["lon"])
        self.assertEqual(dkss_header_grid_point(geometry, 0)["lat"], 56.461)
        self.assertEqual(dkss_header_grid_point(geometry, 315899)["lon"], 10.385)

    def test_all_eight_grib1_scan_orders_bind_native_index(self):
        for scan in range(0, 256, 32):
            with self.subTest(scan=scan):
                first_lat, last_lat = (10., 13.) if scan & 64 else (13., 10.)
                first_lon, last_lon = (24., 20.) if scan & 128 else (20., 24.)
                geometry = dkss_grib1_header_geometry(
                    self.signature(first_lat=first_lat, last_lat=last_lat,
                                   first_lon=first_lon, last_lon=last_lon), scan)
                points = [dkss_header_grid_point(geometry, index) for index in range(20)]
                self.assertEqual(len({(row["lat"], row["lon"]) for row in points}), 20)
                self.assertEqual((points[0]["lat"], points[0]["lon"]), (first_lat, first_lon))
                self.assertEqual((points[-1]["lat"], points[-1]["lon"]), (last_lat, last_lon))
                index = 2 * 4 + 1 if scan & 32 else 1 * 5 + 2
                row = points[index]
                self.assertEqual(row["lat"], first_lat + (last_lat - first_lat) / 3)
                self.assertEqual(row["lon"], first_lon + (last_lon - first_lon) / 2)
                nearest = dkss_header_grid_nearest(geometry, row["lat"], row["lon"])
                self.assertEqual(len(nearest), 4)
                self.assertIn(index, {item["index"] for item in nearest})

    def test_nsbs_longitude_crossing_zero_uses_same_native_indices(self):
        geometry = dkss_grib1_header_geometry(
            self.signature(414, 348, 48.525, 65.875, 355.875, 30.292), 64)
        first = dkss_header_grid_point(geometry, 0)
        self.assertEqual(first["lon"], -4.125)
        last = dkss_header_grid_point(geometry, 414 * 348 - 1)
        self.assertAlmostEqual(last["lon"], 30.292, places=12)
        index = 200 * 414 + 100
        row = dkss_header_grid_point(geometry, index)
        self.assertAlmostEqual(row["lat"], 58.525, places=12)
        self.assertIn(index, {item["index"] for item in
                             dkss_header_grid_nearest(geometry, row["lat"], row["lon"])})

    def test_exact_corners_and_outside_domain_are_explicit(self):
        geometry = dkss_grib1_header_geometry(self.signature(), 64)
        for index in (0, 4, 15, 19):
            row = dkss_header_grid_point(geometry, index)
            nearest = dkss_header_grid_nearest(geometry, row["lat"], row["lon"])
            self.assertEqual(len({item["index"] for item in nearest}), 4)
            self.assertIn(index, {item["index"] for item in nearest})
        for lat, lon in ((9.999999, 22.), (13.000001, 22.), (11., 19.999999), (11., 24.000001)):
            self.assertEqual(dkss_header_grid_nearest(geometry, lat, lon), [])

    def test_invalid_header_never_falls_back_to_rounded_increment(self):
        mutations = ((2, True), (2, 1), (3, 0), (4, 19), (5, float('nan')),
                     (7, float('inf')), (7, 10.), (1, 'rotated_ll'))
        for position, value in mutations:
            with self.subTest(position=position, value=value):
                sig = list(self.signature())
                sig[position] = value
                with self.assertRaises(ValueError):
                    dkss_grib1_header_geometry(tuple(sig), 64)
        for scan in (True, -1, 256, 16, 65, '64', 64.0):
            with self.subTest(scan=scan), self.assertRaises(ValueError):
                dkss_grib1_header_geometry(self.signature(), scan)
        with self.assertRaises(ValueError):
            dkss_grib1_header_geometry(self.signature(), 0)
        with self.assertRaises(ValueError):
            dkss_grib1_header_geometry(self.signature(first_lon=20., last_lon=20.), 64)

    def test_invalid_target_or_index_is_not_an_empty_valid_lookup(self):
        geometry = dkss_grib1_header_geometry(self.signature(), 64)
        for index in (True, -1, 20, 2.0, '2'):
            with self.subTest(index=index), self.assertRaises(ValueError):
                dkss_header_grid_point(geometry, index)
        for lat, lon in ((float('nan'), 22.), (11., float('inf')), (True, 22.), (11., '22')):
            with self.subTest(lat=lat, lon=lon), self.assertRaises(ValueError):
                dkss_header_grid_nearest(geometry, lat, lon)


class DkssOrdinaryHeaderCallerRegression(unittest.TestCase):
    """Actual warm/batch AST callers with explicit synthetic header/value APIs.

    This is caller proof, not a native decoder import or original-file proof.
    Artificial element replies stay bound to the indices that the actual
    producer requested; no candidate union or component selection is injected.
    """

    def setUp(self):
        self.functions, self.hashes = load_actual_functions((
            "warm_marine_grid_cache", "nearest_candidates", "valid_candidates_batch", "nearest_valid_batch",
        ))
        # The supported existing family is a literal in its import-safe module.
        provenance = ast.parse((PRODUCER_PATH.parent / 'lib' / 'dmi_native_provenance.py').read_text(encoding='utf-8'))
        marine = next(node.value.args[0] for node in provenance.body if isinstance(node, ast.Assign)
                      and any(isinstance(target, ast.Name) and target.id == 'MARINE_COLLECTIONS'
                              for target in node.targets))
        self.functions.update(MARINE_COLLECTIONS=frozenset(ast.literal_eval(marine)),
                              GRID_INDEX_CACHE={}, GRID_BATCH_WARMED=set(),
                              OutOfAreaError=type('SyntheticOutOfAreaError', (Exception,), {}),
                              codes_get=self.header_get, codes_get_elements=self.elements,
                              codes_grib_nearest_new=self.native_forbidden,
                              codes_grib_nearest_find=self.native_forbidden,
                              codes_grib_nearest_delete=self.native_forbidden,
                              codes_grib_find_nearest=self.native_forbidden,
                              CODES_GRIB_NEAREST_SAME_GRID=1)
        sig = DkssHeaderGeometryRegression.signature(810, 390, 56.461, 57.109, 8.138, 10.385)
        self.gid = dict(zip(('md5GridSection', *self.functions['GRID_DEFINITION_KEYS']), sig))
        self.gid.update(edition=1, scanningMode=64, missingValue=9999., syntheticValues={})
        self.geometry = dkss_grib1_header_geometry(sig, 64)
        point = dkss_header_grid_point(self.geometry, 262457)
        self.zone = dict(id='SYNTHETIC_ONLY', coastType='limfjord', lat=point['lat'], lon=point['lon'])
        self.element_calls = []

    @staticmethod
    def native_forbidden(*_args, **_kwargs):
        raise AssertionError('Rounded native-nearest API must not resolve this regular DKSS GRIB1 header')

    @staticmethod
    def header_get(gid, key):
        return gid[key]

    def elements(self, gid, key, indices):
        self.assertEqual(key, 'values')
        self.assertEqual(len(indices), len(set(indices)))
        self.assertTrue(all(0 <= index < gid['numberOfPoints'] for index in indices))
        self.element_calls.append(tuple(indices))
        return [gid['syntheticValues'].get(index, gid['missingValue']) for index in indices]

    def test_real_warm_probe_and_both_batch_callers_keep_original_zero_index(self):
        self.gid['syntheticValues'][262457] = 0.
        before = copy.deepcopy(self.gid)
        vector = self.functions['valid_candidates_batch'](self.gid, 'dkss_lf', [self.zone])
        scalar = self.functions['nearest_valid_batch'](self.gid, 'dkss_lf', [self.zone])
        self.assertEqual([row['index'] for row in vector[self.zone['id']]], [262457])
        for row in (vector[self.zone['id']][0], scalar[self.zone['id']]):
            self.assertEqual(row['index'], 262457)
            self.assertEqual(row['value'], 0.)
            self.assertAlmostEqual(row['latitude'], self.zone['lat'], places=12)
            self.assertAlmostEqual(row['longitude'], self.zone['lon'], places=12)
            self.assertRegex(row['_gridIndexIdentity'], r'^[0-9a-f]{64}$')
            self.assertEqual(row['_gridCoordinateInterpretation'], 'dmi-dkss-grib1-header-endpoints-v1')
        self.assertEqual(len(self.element_calls), 2)
        self.assertEqual(self.gid, before)

    def test_actual_header_batch_tuple_flows_into_normal_source_constructor(self):
        from lib import dmi_native_provenance as provenance
        source_functions, _ = load_actual_functions(("native_component_source",))
        source_functions.update(datetime=datetime, timezone=timezone)
        for name in ("sampling_identity", "component_collection_allowed", "COMPONENT_FIELD_SET",
                     "COMPONENT_KIND", "COMPONENT_SPATIAL_SELECTION", "COLLECTION_FAMILY",
                     "SPATIAL_PROVENANCE_VERSION"):
            source_functions[name] = getattr(provenance, name)
        zone = {**self.zone, "id": "PART::SYNTHETIC_ONLY", "parentZoneId": "SYNTHETIC_ONLY"}
        self.gid['syntheticValues'][262457] = 0.
        u = self.functions['valid_candidates_batch'](self.gid, 'dkss_lf', [zone])[zone['id']]
        self.gid['syntheticValues'][262457] = -.5
        v = self.functions['valid_candidates_batch'](self.gid, 'dkss_lf', [zone])[zone['id']]
        selected = self.functions['select_common_grid_tuple']({U: u, V: v}, (U, V))
        self.assertIsNotNone(selected)
        source = source_functions['native_component_source']('dkss_lf',
            '2026-01-01T00:00:00Z', '2026-01-01T03:00:00Z', component='current', zone=zone,
            grid_candidate=selected[U], grid_tuple=selected,
            capture={'itemId': 'own-synthetic-header-reply', 'assetIdentitySha256': 'b' * 64,
                     'assetSizeBytes': 16, 'contentLengthBytes': 16, 'contentSha256': 'd' * 64,
                     'acquiredAt': '2026-01-01T01:00:00Z'},
            spatial_selection='nearest-shared-grid-cell-no-spatial-interpolation')
        self.assertIsNotNone(source)
        self.assertEqual(source['nativeGridSampling']['elementIndex'], 262457)
        self.assertEqual(source['nativeGridSampling']['coordinateInterpretation'],
                         'dmi-dkss-grib1-header-endpoints-v1')
        self.assertEqual(selected[U]['value'], 0.)
        self.assertEqual(len(self.element_calls), 2)

    def test_disjoint_actual_probe_nodes_do_not_form_vector_and_missing_stays_missing(self):
        signature = self.functions['grid_cache_signature'](self.gid)
        self.functions['warm_marine_grid_cache'](self.gid, 'dkss_lf', [self.zone], signature)
        union = self.functions['nearest_candidates'](self.gid, 'dkss_lf', self.zone, signature=signature)
        self.assertGreaterEqual(len(union), 2)
        first, second = union[0]['index'], union[1]['index']
        self.gid['syntheticValues'] = {first: .25}
        u = self.functions['valid_candidates_batch'](self.gid, 'dkss_lf', [self.zone])[self.zone['id']]
        self.gid['syntheticValues'] = {second: -.5}
        v = self.functions['valid_candidates_batch'](self.gid, 'dkss_lf', [self.zone])[self.zone['id']]
        self.assertEqual(({row['index'] for row in u}, {row['index'] for row in v}), ({first}, {second}))
        self.assertIsNone(self.functions['select_common_grid_tuple']({U: u, V: v}, (U, V)))
        self.gid['syntheticValues'] = {}
        self.assertEqual(self.functions['valid_candidates_batch'](self.gid, 'dkss_lf', [self.zone]), {})
        self.assertEqual(self.functions['nearest_valid_batch'](self.gid, 'dkss_lf', [self.zone]), {})

    def test_non_dkss_branch_is_not_reinterpreted(self):
        self.assertIsNone(self.functions['dkss_header_geometry_for_message'](self.gid, 'wam_dw', ()))
        self.assertIsNone(self.functions['dkss_header_geometry_for_message'](self.gid, 'harmonie_dini_sf', ()))

    def test_malformed_original_header_is_a_named_hard_failure(self):
        for signature in ((), ('a' * 32,), None):
            with self.subTest(signature=signature), self.assertRaises(self.functions['DmiGridLookupError']):
                self.functions['dkss_header_geometry_for_message'](self.gid, 'dkss_lf', signature)
        with patch.dict(self.gid, edition=True):
            with self.assertRaises(self.functions['DmiGridLookupError']):
                self.functions['dkss_header_geometry_for_message'](
                    self.gid, 'dkss_lf', self.functions['grid_cache_signature'](self.gid))

    def test_failed_warming_discards_only_its_partial_lookup_entries(self):
        signature = self.functions['grid_cache_signature'](self.gid)
        unrelated_key = ('synthetic-unrelated-grid',)
        sentinel = [{'index': 0}]
        self.functions['GRID_INDEX_CACHE'][unrelated_key] = sentinel
        malformed_zone = dict(self.zone, id='SYNTHETIC_BAD_TARGET', lat=float('nan'))
        with self.assertRaises(self.functions['DmiGridLookupError']):
            self.functions['warm_marine_grid_cache'](
                self.gid, 'dkss_lf', [self.zone, malformed_zone], signature)
        self.assertEqual(self.functions['GRID_INDEX_CACHE'], {unrelated_key: sentinel})
        self.assertEqual(self.element_calls, [])


if REAL:
    class NativeCurrentCellJoinRegression(unittest.TestCase):
        """Opt-in CI gate, UNVERIFIED locally; no injected candidate rows.

        These are artificial files/shapes, not authenticated DMI originals.
        DMI's extent rule removes the old iterator-coordinate alias; both old
        array indices must instead be reached at their distinct physical points.
        Disjoint masks are tested on two actually reached nodes in one ordinary
        union. Missing reachability still FAILS; no candidate is substituted.
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

        def bounded_synthetic_lookup_details(self, gid, zone, union):
            # Artificial coordinates/indices only; never print field values.
            try:
                direct = self.ec.codes_grib_find_nearest(gid, zone["lat"], zone["lon"], npoints=4)
                direct_summary = [{"index": row["index"], "lat": row["lat"], "lon": row["lon"]}
                                  for row in direct]
            except self.producer.OutOfAreaError:
                # Do not replace the original strict reachability failure by
                # an expected boundary error from this optional diagnostic.
                direct_summary = "OUT_OF_AREA"
            return {"syntheticTarget": [zone["lat"], zone["lon"]],
                    "syntheticDirect": direct_summary,
                    "syntheticWarmClosest": [{key: row[key] for key in ("index", "latitude", "longitude", "distanceKm")}
                                             for row in union[:4]]}

        def require_native_union(self, gid, collection, zone, indices):
            union = self.native_union(gid, collection, zone)
            actual = {row["index"] for row in union}
            self.assertTrue(
                set(indices) <= actual,
                "NATIVE_REACHABILITY_UNPROVED: actual normal probe union did not contain every required node; "
                f"syntheticExpectedIndices={list(indices)}; syntheticCandidateCount={len(actual)}; "
                f"syntheticLookup={self.bounded_synthetic_lookup_details(gid, zone, union)}",
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
                geometry = self.producer.dkss_header_geometry_for_message(
                    gid, collection, self.producer.grid_cache_signature(gid))
                if geometry is not None:
                    expected = self.producer.dkss_header_grid_point(geometry, index)
                    self.assertEqual((row["latitude"], row["longitude"]),
                                     (expected["lat"], expected["lon"]))
                    self.assertEqual(row['_gridCoordinateInterpretation'],
                                     'dmi-dkss-grib1-header-endpoints-v1')
            return rows

        def assert_native_selection_record(self, collection, zone, pair, index):
            # Capture metadata below belongs only to this artificial control.
            # Actual native index/value/coordinates above come from the normal
            # batch caller, not an inserted selected tuple.
            source = self.producer.native_component_source(collection, self.TIME, self.TIME,
                component='current', zone=zone, grid_candidate=pair[U], grid_tuple=pair,
                capture={'itemId': 'own-artificial-native-control',
                         'assetIdentitySha256': 'b' * 64, 'assetSizeBytes': 16,
                         'contentLengthBytes': 16, 'contentSha256': 'd' * 64,
                         'acquiredAt': self.TIME},
                spatial_selection='nearest-shared-grid-cell-no-spatial-interpolation',
                verticalLayer='surface:0', verticalLayerRankM=0.,
                vectorSelection=self.producer.CURRENT_VECTOR_SELECTION,
                vectorSemanticsVersion=self.producer.CURRENT_VECTOR_SEMANTICS_VERSION)
            self.assertIsNotNone(source)
            self.assertEqual(source['nativeGridSampling']['elementIndex'], index)
            self.assertEqual(source['nativeGridSampling']['gridIndexIdentitySha256'], pair[U]['_gridIndexIdentity'])
            self.assertEqual(source['nativeGridSampling']['coordinateInterpretation'],
                             'dmi-dkss-grib1-header-endpoints-v1')
            self.assertNotIn('value', json.dumps(source['nativeGridSampling']))
            self.assertTrue(self.producer.complete_native_source_for_hour(source, 'current',
                zone['id'], self.producer.sampling_identity(zone), self.TIME))
            self.assertEqual(json.loads(json.dumps(source)), source)

        def test_native_lf_disjoint_masks_do_not_pair_after_real_union(self):
            with self.grid(self.LF, self.ALIAS) as (gid, values, cells):
                # Preserve the native decoder observation, not its erroneous
                # geography. The DMI-documented header interpretation places
                # these array indices on different, uniformly spaced rows.
                self.assertAlmostEqual(cells[self.ALIAS[0]][0], cells[self.ALIAS[1]][0], places=9)
                self.assertAlmostEqual(cells[self.ALIAS[0]][1], cells[self.ALIAS[1]][1], places=9)
                geometry = self.producer.dkss_header_geometry_for_message(
                    gid, "dkss_lf", self.producer.grid_cache_signature(gid))
                physical = [self.producer.dkss_header_grid_point(geometry, index) for index in self.ALIAS]
                self.assertNotEqual(physical[0]["lat"], physical[1]["lat"])
                zone = self.zone((physical[0]["lat"], physical[0]["lon"]))
                union = self.require_native_union(gid, "dkss_lf", zone, (self.ALIAS[0],))
                second = next(row["index"] for row in union if row["index"] != self.ALIAS[0])
                u = self.masked_candidates(gid, values, "dkss_lf", zone, self.ALIAS[0], .25, 49)
                v = self.masked_candidates(gid, values, "dkss_lf", zone, second, -.5, 50)
                self.assertIsNone(self.producer.select_common_grid_tuple({U: u, V: v}, (U, V)))
                # The endpoint's original index must also be genuinely reached
                # in the ordinary lookup at that endpoint, not added to a union.
                endpoint = self.zone((physical[1]["lat"], physical[1]["lon"]))
                endpoint["id"] = "PART::SYNTHETIC_ENDPOINT"
                self.require_native_union(gid, "dkss_lf", endpoint, (self.ALIAS[1],))
                self.masked_candidates(gid, values, "dkss_lf", endpoint, self.ALIAS[1], 0., 49)

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
                self.assert_native_selection_record('dkss_lf', zone, pair, index)

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

                self.assert_native_selection_record('dkss_nsbs', zone, pair, index)

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
                        # Match normal main's initial_zone_records exactly:
                        # native provenance is checked against this identity.
                        # Omitting it is correctly rejected, not a decoder bug.
                        output, diagnostics = {"zones": {zone["id"]: {
                            **(self.producer.sampling_identity(zone) or {}),
                            "hourly": {}, "gridPoints": {}, "collections": {},
                        }}}, {}
                        found, _, interrupted, messages, _ = self.producer.process_grib(
                            path, "wam_dw", self.TIME, self.TIME, [zone], output, diagnostics,
                        )
                        self.assertFalse(interrupted)
                        self.assertEqual(messages, 3)
                        self.assertEqual(found, {"significant-wave-height", "dominant-wave-period", "mean-wave-dir"})
                        hour = output["zones"].get(zone["id"], {}).get("hourly", {}).get(self.TIME)
                        if same_node:
                            self.assertIsNotNone(
                                hour, "Normal positive wave publication did not complete; "
                                f"reason={diagnostics.get('rejectedScalarTuples', {}).get(zone['id'], {}).get('wave')}",
                            )
                            self.assertEqual(hour["mean-wave-dir"], 90.0)
                            self.assertEqual(hour["sources"]["wave"]["optionalFieldSet"], ["mean-wave-dir"])
                            self.assertNotIn("_gridIndexIdentity", json.dumps(output))
                            self.assertNotIn("_gridCoordinateInterpretation", json.dumps(output))
                            receipt = hour['sources']['wave']['nativeGridSampling']
                            self.assertEqual(receipt['elementIndex'], self.WAVE_INDEX)
                            self.assertEqual(receipt['coordinateInterpretation'], 'eccodes-native-coordinates-v1')
                            self.assertEqual(receipt['optionalFieldSet'], ['mean-wave-dir'])
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
