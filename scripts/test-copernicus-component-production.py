"""Offline real NetCDF -> immutable originals -> authority / transport tests."""
from __future__ import annotations
import copy
import hashlib
import json
import runpy
import subprocess
import sys
import tempfile
import unittest
from unittest.mock import patch
from pathlib import Path
from types import SimpleNamespace

import numpy as np
import xarray as xr

from lib.copernicus_weather_component_bank import _request, _sealed, empty_component_bank, merge_component_read, produce_component_bank, save_component_bank
from lib.copernicus_weather_components import CONTRACTS, MAX_SUBSET_BYTES, read_component_subset
from lib import copernicus_component_spatial as spatial
from lib import copernicus_component_transport as transport_module
from lib.copernicus_current import canonical_sha256
from lib.copernicus_component_spatial import POLICY, static_request, eligible_static_cell
from lib.copernicus_component_transport import ComponentSubsetCache, BoundedComponentTransport, ComponentTransportDeferred, atomic_json, subset_arguments

RUNNER = runpy.run_path(str(Path(__file__).with_name("run-copernicus-weather-components.py")))
FIXTURE = runpy.run_path(str(Path(__file__).with_name("test-copernicus-weather-components.py")))["fixture"]
TARGET = {"partId": "SYNTHETIC-ø-PART", "parentZoneId": "DK-B05-11", "waterPoint": [10.0, 58.0]}
TIMES = [f"2026-09-19T0{h}:00:00Z" for h in range(3)]


def dynamic_fixture(key):
    dataset = FIXTURE(key)
    dataset.coords["longitude"] = ("longitude", [10.0], dict(dataset.longitude.attrs))
    dataset.coords["latitude"] = ("latitude", [58.0], dict(dataset.latitude.attrs))
    return dataset


def static_fixture(key="nws-wave", mask=1, depth=20, lon=10.0):
    dataset = xr.Dataset(coords={
        "latitude": ("latitude", [58.0], {"standard_name": "latitude", "units": "degrees_north"}),
        "longitude": ("longitude", [lon], {"standard_name": "longitude", "units": "degrees_east"}),
    })
    dataset["mask"] = xr.DataArray([[float(mask)]], dims=("latitude", "longitude"), attrs={"standard_name": "sea_binary_mask", "units": "1"})
    dataset["deptho"] = xr.DataArray([[float(depth)]], dims=("latitude", "longitude"), attrs={"standard_name": "sea_floor_depth_below_geoid", "units": "m"})
    dataset.attrs.update(dataset_id=POLICY["contracts"][key]["staticDatasetId"], dataset_version=POLICY["contracts"][key]["staticVersion"])
    return dataset


def nws_metadata_fixture(key="nws-wave"):
    """Public NWS 202511 headers, synthetic values, after SDK depth normalization.

    Both phy/wav static.zarr/.zmetadata omit deptho.units and have
    mask(elevation,latitude,longitude). Copernicus Marine 2.4.1 writes that
    coordinate as depth, positive down, in the downloaded NetCDF. PUMs
    CMEMS-NWS-PUM-004-013 p14 and 004-014 p12 document deptho in metres.
    """
    dataset = static_fixture(key)
    dataset.attrs.clear()  # Public static headers need not repeat the pinned dataset id.
    dataset["deptho"].attrs = {"grid": "amm15rT", "long_name": "Bathymetry",
                                "standard_name": "sea_floor_depth_below_geoid"}
    dataset.coords["depth"] = ("depth", [3.0, 0.0],
        {"standard_name": "depth", "units": "m", "positive": "down", "axis": "Z"})
    dataset["mask"] = xr.DataArray([[[0.0]], [[1.0]]], dims=("depth", "latitude", "longitude"),
        attrs={"long_name": "Land-sea mask: 1 = sea ; 0 = land", "missing_value": 0,
               "standard_name": "sea_binary_mask"})
    return dataset


def prepare(folder, all_components=False, static_factory=static_fixture):
    folder = Path(folder)
    folder.mkdir(parents=True, exist_ok=True)
    cache = ComponentSubsetCache(folder / "cache")
    needs = [{"partId": TARGET["partId"], "component": "wave", "purpose": "GAP", "validTime": t} for t in TIMES]
    if all_components:
        needs.extend({"partId": TARGET["partId"], "component": c, "purpose": "GAP", "validTime": TIMES[0]}
                     for c in ["waterTemperature", "waterLevel"])
    raw = {"parts": [TARGET], "productionReferenceAt": TIMES[0], "needs": needs,
           "retentionStartAt": "2026-09-17T00:00:00Z", "retentionEndAt": "2026-09-24T00:00:00Z"}
    plan = RUNNER["pinned_plan"](raw)
    # Restrict the fixture's plan, not production routing, to one dataset.
    from lib.copernicus_weather_component_bank import build_component_plan
    plan = build_component_plan(targets=[TARGET], production_reference_at=raw["productionReferenceAt"], needs=needs,
        product_routes={TARGET["partId"]: {"wave": ["nws-wave"], "waterTemperature": ["nws-temperature"], "waterLevel": ["nws-level"]}}, routing_policy=plan["routingPolicy"],
        retention_start_at=raw["retentionStartAt"], retention_end_at=raw["retentionEndAt"])
    static_path = folder / "static.nc"
    for key in (["nws-wave", "nws-temperature", "nws-level"] if all_components else ["nws-wave"]):
        static_factory(key).to_netcdf(static_path, engine="h5netcdf")
        cache.store(static_request(key, TARGET), static_path)
    receipt = None
    def acquire(request):
        nonlocal receipt
        dataset = dynamic_fixture(request["contractKey"])
        if request["contractKey"] == "nws-wave":
            dataset["VTPK"].values[1] = np.nan
        path = folder / "dynamic.nc"
        dataset.to_netcdf(path, engine="h5netcdf")
        path, receipt = cache.store(request, path)
        return path
    result = produce_component_bank(plan, empty_component_bank([TARGET]), acquire_subset=acquire,
        acquisition_at=lambda: receipt["acquisitionAt"], checkpoint=lambda *a: None)
    bank = result["bank"]
    if all_components:
        # Genuine old native-level bank bytes must remain stored but never be
        # projected or fetched again under the owner's DMI-only level policy.
        from lib.copernicus_weather_components import read_component_subset
        from lib.copernicus_weather_component_bank import merge_component_read
        request = _request(plan, TARGET["partId"], "nws-level", [TIMES[0]])
        path = acquire(request)
        read = read_component_subset(path, contract_key="nws-level", target=TARGET, expected_times=[TIMES[0]])
        bank = merge_component_read(bank, plan=plan, request=request, read=read, acquisition_at=receipt["acquisitionAt"])
    atomic_json(folder / "plan.json", plan)
    atomic_json(folder / "input.json", raw)
    save_component_bank(folder / "bank.json", bank, targets=[TARGET])
    return {"plan": plan, "bank": bank, "cache": cache, "folder": folder, "raw": raw}


class ComponentProductionTests(unittest.TestCase):
    def setUp(self):
        self.temporary = tempfile.TemporaryDirectory(prefix="rr-cp-component-production-")
        self.addCleanup(self.temporary.cleanup)
        self.case = prepare(self.temporary.name)

    def authority(self):
        return RUNNER["verify_original_components"](self.case["plan"], self.case["bank"], self.case["cache"])

    def store_static(self, key="nws-wave", **kwargs):
        path = self.case["folder"] / "new-static.nc"
        static_fixture(key, **kwargs).to_netcdf(path, engine="h5netcdf")
        self.case["cache"].store(static_request(key, TARGET), path)

    def test_actual_byte_admission_preserves_good_sibling_and_missing_hour(self):
        result = self.authority()
        self.assertEqual([r["time"] for r in result["stage"]["candidates"]], [TIMES[0], TIMES[2]])
        self.assertEqual(result["stage"]["status"], "IN_PROGRESS")
        self.assertEqual(result["stage"]["remainingNeeds"][0]["validTime"], TIMES[1])
        source = result["stage"]["candidates"][0]["source"]
        self.assertEqual(source["spatialAdmission"]["witness"]["static"]["mask"], 1)
        self.assertEqual(source["spatialAdmission"]["witness"]["dynamicReceipt"]["subsetSha256"], source["subsetSha256"])

    def test_pinned_runtime_routes_and_authority_exclude_legacy_level(self):
        self.case = prepare(self.case["folder"] / "legacy", all_components=True)
        result = self.authority()
        self.assertTrue(any(e["native"]["component"] == "waterLevel" for e in self.case["bank"]["records"]))
        self.assertFalse(any(n["component"] == "waterLevel" for n in self.case["plan"]["needs"]))
        self.assertTrue(all(c["component"] in {"wave", "waterTemperature"} for c in result["stage"]["candidates"]))
        self.assertEqual(result["stage"]["privateSupportCandidates"], [])

    def test_static_land_shallow_wrong_cell_and_radian_axis_never_admit(self):
        for kwargs in ({"mask": 0}, {"depth": 9}):
            with self.subTest(kwargs=kwargs):
                self.store_static(**kwargs)
                self.assertEqual(self.authority()["stage"]["candidates"], [])
        self.case = prepare(self.case["folder"] / "pointer-shift")
        # A changed latest pointer does not erase a different, still valid
        # historical cell: the original receipt and bytes remain independent.
        self.store_static(lon=10.001)
        self.assertEqual([r["time"] for r in self.authority()["stage"]["candidates"]],
                         [TIMES[0], TIMES[2]])
        dataset = static_fixture()
        dataset.longitude.attrs["units"] = "radians"
        path = self.case["folder"] / "radians.nc"
        dataset.to_netcdf(path, engine="h5netcdf")
        self.case["cache"].store(static_request("nws-wave", TARGET), path)
        self.assertEqual([r["time"] for r in self.authority()["stage"]["candidates"]],
                         [TIMES[0], TIMES[2]])

    def test_pack_keeps_original_static_cell_when_latest_pointer_moves(self):
        self.store_static(lon=10.001)
        result = self.authority()
        self.assertEqual([r["time"] for r in result["stage"]["candidates"]],
                         [TIMES[0], TIMES[2]])
        inventory = RUNNER["storage_inventory"](self.case["bank"], self.case["cache"])
        request_hash = static_request("nws-wave", TARGET)["requestSha256"][7:]
        retained_receipts = [row for row in inventory["files"]
                             if row["relativePath"].startswith("receipts/" + request_hash + "-")]
        self.assertEqual(len(retained_receipts), 2)
        self.assertEqual(len(inventory["files"]), 7)

    def test_all_six_pinned_static_fields_and_surface_mask_layer(self):
        for key in CONTRACTS:
            with self.subTest(key=key):
                self.store_static(key)
                self.assertTrue(eligible_static_cell(self.case["cache"].load_static(key, TARGET)))
        dataset = static_fixture("baltic-temperature")
        dataset.coords["depth"] = ("depth", [4.0, 0.5], {"standard_name": "depth", "units": "m", "positive": "down"})
        dataset["mask"] = xr.DataArray([[[0.0]], [[1.0]]], dims=("depth", "latitude", "longitude"), attrs={"standard_name": "sea_binary_mask", "units": "1"})
        path = self.case["folder"] / "layers.nc"
        dataset.to_netcdf(path, engine="h5netcdf")
        self.case["cache"].store(static_request("baltic-temperature", TARGET), path)
        evidence = self.case["cache"].load_static("baltic-temperature", TARGET)
        self.assertEqual(evidence["maskSurfaceDepthM"], 0.5)
        self.assertTrue(eligible_static_cell(evidence))

    def inspect_fixture(self, dataset, key="nws-wave"):
        # Isolated immutable originals: an older good file cannot mask a
        # deliberately malformed fixture at the same target.
        with tempfile.TemporaryDirectory(dir=self.case["folder"], prefix="metadata-") as folder:
            path = Path(folder) / "static.nc"
            dataset.to_netcdf(path, engine="h5netcdf")
            cache = ComponentSubsetCache(Path(folder) / "cache")
            cache.store(static_request(key, TARGET), path)
            return cache.load_static(key, TARGET)

    def test_actual_nws_202511_metadata_admits_surface_wave_and_temperature(self):
        for key in ("nws-wave", "nws-temperature", "nws-level"):
            with self.subTest(key=key):
                evidence = self.inspect_fixture(nws_metadata_fixture(key), key)
                self.assertEqual(evidence["maskSurfaceDepthM"], 0.0)
                self.assertEqual(evidence["depthM"], 20.0)
                self.assertTrue(eligible_static_cell(evidence))
        # All the way through original-byte revalidation, not just the parser.
        self.case = prepare(self.case["folder"] / "actual-headers", all_components=True,
                            static_factory=nws_metadata_fixture)
        result = self.authority()
        self.assertEqual(len(result["stage"]["candidates"]), 3)
        self.assertEqual(result["recordFailures"], [])
        self.assertEqual({row["component"] for row in result["stage"]["candidates"]},
                         {"wave", "waterTemperature"})
        self.assertTrue(all(row["source"]["spatialAdmission"]["witness"]["static"]["maskSurfaceDepthM"] == 0.0
                            for row in result["stage"]["candidates"]))

    def test_documented_missing_unit_never_overrides_explicit_units_or_other_products(self):
        for unit in ("km", "cm", "", "metres"):
            with self.subTest(unit=unit):
                dataset = nws_metadata_fixture()
                dataset["deptho"].attrs["units"] = unit
                with self.assertRaisesRegex(ValueError, "^CP_STATIC_FIELD_UNIT_INVALID$"):
                    self.inspect_fixture(dataset)
        for key in ("baltic-wave", "baltic-temperature", "baltic-level"):
            with self.subTest(key=key):
                dataset = static_fixture(key)
                del dataset["deptho"].attrs["units"]
                with self.assertRaisesRegex(ValueError, "^CP_STATIC_FIELD_UNIT_INVALID$"):
                    self.inspect_fixture(dataset, key)
        for attribute, value in (("dataset_id", "wrong-dataset"), ("dataset_version", "202612"),
                                 ("product_id", "wrong-product")):
            with self.subTest(attribute=attribute):
                dataset = nws_metadata_fixture()
                dataset.attrs[attribute] = value
                with self.assertRaisesRegex(ValueError, "^CP_STATIC_DATASET_IDENTITY_CONFLICT$"):
                    self.inspect_fixture(dataset)
        # Even a future pinned request must acquire its own documented unit
        # policy. The present fallback is not inherited by name/prefix.
        for changed in ({"staticVersion": "202612"}, {"staticDatasetId": "unreviewed_static"}):
            with self.subTest(changed=changed), patch.dict(POLICY["contracts"]["nws-wave"], changed):
                with self.assertRaisesRegex(ValueError, "^CP_STATIC_FIELD_UNIT_INVALID$"):
                    self.inspect_fixture(nws_metadata_fixture())

    def test_nws_metadata_still_requires_surface_and_exact_semantics(self):
        dataset = nws_metadata_fixture()
        dataset.coords["depth"] = ("depth", [3.0, 0.51], dict(dataset.depth.attrs))
        with self.assertRaisesRegex(ValueError, "^CP_STATIC_MASK_SURFACE_MISSING$"):
            self.inspect_fixture(dataset)
        for mutation, reason in (
            (lambda ds: ds.depth.attrs.update(positive="up"), "CP_STATIC_MASK_SURFACE_INVALID"),
            (lambda ds: ds.depth.attrs.update(units="cm"), "CP_STATIC_MASK_SURFACE_INVALID"),
            (lambda ds: ds.deptho.attrs.update(standard_name="sea_floor_depth_below_sea_surface"),
             "CP_STATIC_FIELD_SEMANTICS_INVALID"),
        ):
            with self.subTest(reason=reason):
                dataset = nws_metadata_fixture()
                mutation(dataset)
                with self.assertRaisesRegex(ValueError, "^" + reason + "$"):
                    self.inspect_fixture(dataset)
        dataset = nws_metadata_fixture()
        dataset["mask"].values[:] = np.array([[[1.0]], [[0.0]]])
        with self.assertRaisesRegex(ValueError, "^CP_STATIC_FIELD_VALUE_MISSING$"):
            self.inspect_fixture(dataset)  # Deep wet cell must not replace a dry surface.
        dataset = nws_metadata_fixture()
        dataset["deptho"] = xr.DataArray([[[20.0]], [[20.0]]], dims=("depth", "latitude", "longitude"),
                                         attrs=dict(dataset.deptho.attrs))
        with self.assertRaisesRegex(ValueError, "^CP_STATIC_FIELD_DIMENSIONS_INVALID$"):
            self.inspect_fixture(dataset)

    def test_policy_upgrade_revalidates_old_nws_and_baltic_without_rewriting_originals(self):
        old_policy = copy.deepcopy(POLICY)
        old_policy.pop("documentedMissingDepthUnits")
        old_policy["contracts"]["nws-wave"]["surfaceMaskDepth"] = None
        old_hash = canonical_sha256(old_policy)
        current_hash = spatial.POLICY_SHA256
        self.assertNotEqual(old_hash, current_hash)
        with patch.dict(POLICY, old_policy, clear=True), patch.object(spatial, "POLICY_SHA256", old_hash):
            legacy = prepare(self.case["folder"] / "old-policy", all_components=True)
            old_request = static_request("nws-wave", TARGET)
            old_result = RUNNER["verify_original_components"](legacy["plan"], legacy["bank"], legacy["cache"])
            self.assertEqual(len(old_result["stage"]["candidates"]), 3)
            # Store actual Baltic native records under the old global hash as
            # well: the NWS-only correction must not cold-reset Baltic banks.
            for key in ("baltic-wave", "baltic-temperature"):
                path = legacy["folder"] / "baltic-static.nc"
                static_fixture(key).to_netcdf(path, engine="h5netcdf")
                legacy["cache"].store(static_request(key, TARGET), path)
                request = _request(legacy["plan"], TARGET["partId"], key, [TIMES[0]])
                path = legacy["folder"] / "baltic-dynamic.nc"
                dynamic_fixture(key).to_netcdf(path, engine="h5netcdf")
                path, receipt = legacy["cache"].store(request, path)
                read = read_component_subset(path, contract_key=key, target=TARGET, expected_times=[TIMES[0]])
                legacy["bank"] = merge_component_read(legacy["bank"], plan=legacy["plan"], request=request,
                                                       read=read, acquisition_at=receipt["acquisitionAt"])
        original_bank = copy.deepcopy(legacy["bank"])
        inventory_before = RUNNER["storage_inventory"](legacy["bank"], legacy["cache"])
        originals_before = {p.relative_to(legacy["cache"].directory).as_posix(): hashlib.sha256(p.read_bytes()).hexdigest()
                            for p in legacy["cache"].directory.rglob("*") if p.is_file()}
        fresh_plan = RUNNER["pinned_plan"](legacy["raw"])
        self.assertEqual(static_request("nws-wave", TARGET), old_request)
        self.assertEqual(fresh_plan["routingPolicy"]["policySha256"], current_hash)
        result = RUNNER["verify_original_components"](fresh_plan, legacy["bank"], legacy["cache"])
        self.assertEqual(result["recordFailures"], [])
        rows = result["stage"]["candidates"]
        self.assertEqual(len(rows), 5)
        self.assertEqual(sum(row["source"]["datasetId"].startswith("cmems_mod_nws") for row in rows), 3)
        self.assertEqual(sum(row["source"]["datasetId"].startswith("cmems_mod_bal") for row in rows), 2)
        self.assertTrue(all(row["source"]["spatialAdmission"]["policySha256"] == current_hash for row in rows))
        self.assertEqual(legacy["bank"], original_bank)
        self.assertEqual(RUNNER["storage_inventory"](legacy["bank"], legacy["cache"]), inventory_before)
        self.assertEqual({p.relative_to(legacy["cache"].directory).as_posix(): hashlib.sha256(p.read_bytes()).hexdigest()
                          for p in legacy["cache"].directory.rglob("*") if p.is_file()}, originals_before)

    def test_static_validation_reports_only_allowlisted_codes_during_fetch_and_refresh(self):
        request = _request(self.case["plan"], TARGET["partId"], "nws-wave", TIMES)
        for refresh in (False, True):
            for error, expected in (
                ("CP_STATIC_FIELD_UNIT_INVALID", "CP_COMPONENT_STATIC_FIELD_UNIT_INVALID"),
                ("CP_STATIC_MASK_SURFACE_MISSING", "CP_COMPONENT_STATIC_MASK_SURFACE_MISSING"),
                ("CP_STATIC_FIELD_UNIT_INVALID private-payload", "CP_COMPONENT_STATIC_EVIDENCE_UNAVAILABLE"),
                ("CP_STATIC_PRIVATE_SECRET", "CP_COMPONENT_STATIC_EVIDENCE_UNAVAILABLE"),
                ("private filename or token", "CP_COMPONENT_STATIC_EVIDENCE_UNAVAILABLE"),
            ):
                with self.subTest(refresh=refresh, error=error):
                    cache = ComponentSubsetCache(self.case["folder"] / "empty-code-cache")
                    transport = BoundedComponentTransport(cache, deadline_epoch=200, request_timeout_seconds=30,
                        maximum_requests=4, maximum_download_bytes=MAX_SUBSET_BYTES, clock=lambda: 100)
                    with patch.object(transport, "download", return_value=(Path("unused.nc"), {})), \
                         patch.object(transport_module, "inspect_static_subset", side_effect=ValueError(error)):
                        with self.assertRaisesRegex(ComponentTransportDeferred, "^" + expected + "$"):
                            if refresh:
                                transport.refresh_static("nws-wave", TARGET)
                            else:
                                transport.acquire_subset(request)
        # Real malformed bytes must reach the same safe classification and
        # survive the bank's attempt-summary sanitizer (no live API call).
        def run(args, **_kwargs):
            dataset = nws_metadata_fixture()
            dataset.deptho.attrs["units"] = "km"
            dataset.to_netcdf(Path(args[-1]) / "subset.nc", engine="h5netcdf")
            return SimpleNamespace(returncode=0)
        transport = BoundedComponentTransport(ComponentSubsetCache(self.case["folder"] / "bad-unit-cache"),
            deadline_epoch=200, request_timeout_seconds=30, maximum_requests=4,
            maximum_download_bytes=MAX_SUBSET_BYTES, run=run, clock=lambda: 100)
        result = produce_component_bank(self.case["plan"], empty_component_bank([TARGET]),
            acquire_subset=transport.acquire_subset, acquisition_at=lambda: TIMES[0], checkpoint=lambda *args: None)
        self.assertEqual(result["attempts"][0]["reason"], "CP_COMPONENT_STATIC_FIELD_UNIT_INVALID")

    def test_dynamic_original_tamper_is_not_authorized_by_self_consistent_bank(self):
        row = self.case["bank"]["records"][0]["native"]
        path = self.case["cache"].object_path(row["subsetSha256"])
        with path.open("ab") as handle:
            handle.write(b"synthetic corruption")
        admit, _, _ = RUNNER["original_component_admitter"](self.case["plan"], self.case["cache"])
        entry = self.case["bank"]["records"][0]
        request = next(request for request in self.case["bank"]["requests"]
                       if request["requestSha256"] == entry["requestSha256"])
        self.assertIsNone(admit(entry, request, request["target"]))
        result = self.authority()
        self.assertEqual(result["stage"]["candidates"], [])
        self.assertEqual(len(result["recordFailures"]), 2)

    def test_storage_inventory_exact_references_and_static_no_positive_results(self):
        self.store_static("baltic-wave", mask=0)
        inventory = RUNNER["storage_inventory"](self.case["bank"], self.case["cache"])
        self.assertEqual(inventory["bankSha256"], self.case["bank"]["bankSha256"])
        self.assertEqual(len(inventory["files"]), 8)
        self.assertEqual(len({row["relativePath"] for row in inventory["files"]}), 8)
        self.assertTrue(all(row["bytes"] <= MAX_SUBSET_BYTES for row in inventory["files"]))

    def test_plan_uses_current_parent_and_leaves_wind_explicitly_unrouted(self):
        raw = copy.deepcopy(self.case["raw"])
        raw["parts"][0].update(zoneId="NEW-CENTRAL-ZONE", sourceZoneId="OLD-SOURCE-ZONE")
        raw["needs"].append({"partId": TARGET["partId"], "component": "wind", "purpose": "GAP", "validTime": TIMES[0]})
        plan = RUNNER["pinned_plan"](raw)
        self.assertEqual(plan["targets"][0]["parentZoneId"], "NEW-CENTRAL-ZONE")
        self.assertEqual(plan["productRoutes"][TARGET["partId"]]["wind"], [])
        self.assertEqual(plan["productRoutes"][TARGET["partId"]]["wave"], ["nws-wave", "baltic-wave"])

    def test_dataset_updating_retries_once_other_failures_do_not_retry(self):
        request = _request(self.case["plan"], TARGET["partId"], "nws-wave", TIMES)
        for responses, expected in (([76, 0], 2), ([76, 76], 2), ([1], 1)):
            calls, sleeps = [], []
            def run(args, **kwargs):
                calls.append(kwargs)
                code = responses[len(calls) - 1]
                if code == 0:
                    dynamic_fixture("nws-wave").to_netcdf(Path(args[-1]) / "subset.nc", engine="h5netcdf")
                return SimpleNamespace(returncode=code)
            transport = BoundedComponentTransport(self.case["cache"], deadline_epoch=200, request_timeout_seconds=30,
                maximum_requests=4, maximum_download_bytes=MAX_SUBSET_BYTES, run=run, clock=lambda: 100, sleep=sleeps.append)
            if responses[-1] == 0:
                path, _ = transport.download(request, "nws-wave")
                self.assertTrue(path.exists())
            else:
                with self.assertRaises(ComponentTransportDeferred):
                    transport.download(request, "nws-wave")
            self.assertEqual(len(calls), expected)
            self.assertEqual(sleeps, [5] if responses[0] == 76 else [])
            self.assertTrue(all(c["timeout"] == 30 for c in calls))
        dynamic_arguments = subset_arguments(request, "nws-wave", self.case["folder"])
        static_arguments = subset_arguments(static_request("nws-wave", TARGET), "nws-wave", self.case["folder"])
        self.assertIs(dynamic_arguments["raise_if_updating"], True)
        self.assertEqual(dynamic_arguments["service"], "geoseries")
        self.assertNotIn("dataset_part", dynamic_arguments)
        self.assertEqual(static_arguments["service"], "static-arco")
        self.assertEqual(static_arguments["dataset_part"], "bathy")
        self.assertNotIn("start_datetime", static_arguments)

    def test_static_request_keeps_its_retryable_provider_reason(self):
        # A missing static original must not turn a failed provider call into
        # the generic "static evidence unavailable" classification. That
        # obscured the cause of zero admitted component values in normal runs.
        empty_cache = ComponentSubsetCache(self.case["folder"] / "empty-static-cache")
        transport = BoundedComponentTransport(
            empty_cache, deadline_epoch=200, request_timeout_seconds=30,
            maximum_requests=4, maximum_download_bytes=MAX_SUBSET_BYTES,
            run=lambda *args, **kwargs: SimpleNamespace(returncode=76),
            clock=lambda: 100, sleep=lambda seconds: None,
        )
        with self.assertRaisesRegex(ComponentTransportDeferred, "CP_COMPONENT_DATASET_UPDATING"):
            transport.evidence_for("nws-wave", TARGET)
        def unavailable(*args):
            raise ComponentTransportDeferred("CP_COMPONENT_DATASET_UPDATING")
        result = produce_component_bank(
            self.case["plan"], self.case["bank"], acquire_subset=unavailable,
            acquisition_at=lambda: TIMES[0], checkpoint=lambda *args: None,
            admit_spatial=lambda *args: None,
            prepare_reusable_group=unavailable,
        )
        self.assertEqual(result["attempts"][0]["reason"], "CP_COMPONENT_DATASET_UPDATING")

    def test_explicit_static_refresh_uses_bounded_transport_and_keeps_old_original(self):
        previous = self.case["cache"].load_static_for_grid("nws-wave", TARGET, [10.0, 58.0])
        self.assertIsNotNone(previous)
        calls = []
        def run(args, **_kwargs):
            calls.append(args)
            static_fixture(lon=10.001).to_netcdf(Path(args[-1]) / "subset.nc", engine="h5netcdf")
            return SimpleNamespace(returncode=0)
        transport = BoundedComponentTransport(self.case["cache"], deadline_epoch=200,
            request_timeout_seconds=30, maximum_requests=1,
            maximum_download_bytes=MAX_SUBSET_BYTES, run=run, clock=lambda: 100)
        refreshed = transport.refresh_static("nws-wave", TARGET)
        self.assertEqual(refreshed["gridPoint"], [10.001, 58.0])
        self.assertEqual(len(calls), 1)
        self.assertEqual(transport.request_count, 1)
        self.assertEqual(self.case["cache"].load_static_for_grid("nws-wave", TARGET, [10.0, 58.0]), previous)
        self.assertIsNotNone(self.case["cache"].load_static_for_grid("nws-wave", TARGET, [10.001, 58.0]))

    def test_two_private_generations_stage_only_originally_verified_union(self):
        complete = self.case
        latest = prepare(self.case["folder"] / "latest")
        request = latest["bank"]["requests"][0]
        changed = dynamic_fixture("nws-wave")
        changed["VHM0"].values[:] = 2.0
        changed["VTPK"].values[1] = np.nan
        path = self.case["folder"] / "latest-changed.nc"
        changed.to_netcdf(path, engine="h5netcdf")
        new_path, receipt = latest["cache"].store(request, path)
        read = read_component_subset(new_path, contract_key="nws-wave", target=TARGET,
            expected_times=request["expectedTimes"])
        latest_bank = merge_component_read(empty_component_bank([TARGET]), plan=latest["plan"],
            request=request, read=read, acquisition_at=receipt["acquisitionAt"])
        def retain(bank, time):
            body = {key: value for key, value in bank.items() if key != "bankSha256"}
            body["records"] = [entry for entry in bank["records"] if entry["native"]["validTime"] == time]
            return _sealed(body, "bankSha256")
        latest_bank = retain(latest_bank, TIMES[2])
        complete_bank = retain(complete["bank"], TIMES[0])
        output = self.case["folder"] / "dual-stage"
        summary = RUNNER["merge_original_component_generations"](
            latest_bank, latest["cache"], complete_bank, complete["cache"],
            targets=[TARGET], retention_start_at="2026-09-17T00:00:00Z",
            retention_end_at="2026-09-24T00:00:00Z", output_root=output)
        merged = json.loads((output / "bank.json").read_text(encoding="utf-8"))
        self.assertEqual(summary["recordCount"], 2)
        self.assertEqual({row["native"]["validTime"] for row in merged["records"]}, {TIMES[0], TIMES[2]})
        self.assertEqual(len(RUNNER["storage_inventory"](merged, ComponentSubsetCache(output / "cache"))["files"]), 7)
        self.assertEqual(len(RUNNER["verify_original_components"](latest["plan"], merged,
            ComponentSubsetCache(output / "cache"))["stage"]["candidates"]), 2)
        collision_output = self.case["folder"] / "receipt-collision"
        RUNNER["merge_original_component_generations"](
            retain(latest["bank"], TIMES[2]), latest["cache"],
            complete_bank, complete["cache"], targets=[TARGET],
            retention_start_at="2026-09-17T00:00:00Z",
            retention_end_at="2026-09-24T00:00:00Z", output_root=collision_output)
        normalized = json.loads((collision_output / "bank.json").read_text(encoding="utf-8"))
        self.assertEqual(len(normalized["records"]), 2)
        self.assertEqual(len({entry["acquisitionAt"] for entry in normalized["records"]}), 1)
        self.assertEqual(len(RUNNER["verify_original_components"](latest["plan"], normalized,
            ComponentSubsetCache(collision_output / "cache"))["stage"]["candidates"]), 2)
        latest_file = self.case["folder"] / "latest-filtered.json"
        complete_file = self.case["folder"] / "complete-filtered.json"
        save_component_bank(latest_file, latest_bank, targets=[TARGET])
        save_component_bank(complete_file, complete_bank, targets=[TARGET])
        registry_file = self.case["folder"] / "central-targets.json"
        atomic_json(registry_file, {"partCount": 1,
            "zones": {TARGET["parentZoneId"]: [{**TARGET, "sourceZoneId": TARGET["parentZoneId"]}]}})
        report = self.case["folder"] / "cli-report.json"
        cli_output = self.case["folder"] / "cli-stage"
        self.assertEqual(RUNNER["main"](["--merge-generations", "--bank", str(latest_file),
            "--cache-directory", str(latest["cache"].directory),
            "--complete-bank", str(complete_file),
            "--complete-cache-directory", str(complete["cache"].directory),
            "--merge-output-root", str(cli_output), "--target-registry", str(registry_file),
            "--target-reference", "2026-09-19T00:00:00Z", "--output", str(report)]), 0)
        self.assertEqual(json.loads(report.read_text(encoding="utf-8"))["recordCount"], 2)

    def test_walltime_budget_and_timeout_are_bounded_without_provider_call(self):
        request = _request(self.case["plan"], TARGET["partId"], "nws-wave", TIMES)
        calls = []
        def timeout(args, **kwargs):
            calls.append(kwargs["timeout"])
            raise subprocess.TimeoutExpired(args, kwargs["timeout"])
        transport = BoundedComponentTransport(self.case["cache"], deadline_epoch=116, request_timeout_seconds=30,
            maximum_requests=4, maximum_download_bytes=MAX_SUBSET_BYTES, run=timeout, clock=lambda: 100, sleep=lambda _: None)
        with self.assertRaisesRegex(ComponentTransportDeferred, "TIMEOUT"):
            transport.download(request, "nws-wave")
        self.assertEqual(calls, [11])

    def test_missing_original_releases_only_affected_slots_and_retry_restores_them(self):
        self.case = prepare(self.case["folder"] / "recovery", all_components=True)
        bank, cache = self.case["bank"], self.case["cache"]
        affected = next(e for e in bank["records"] if e["native"]["component"] == "waterTemperature")
        path = cache.object_path(affected["native"]["subsetSha256"])
        original = path.read_bytes()
        with path.open("ab") as handle:
            handle.write(b"corrupt")
        filtered, removed = RUNNER["exclude_unverifiable_originals"](bank, cache)
        self.assertEqual(removed, 1)
        self.assertEqual([e for e in filtered["records"]], [e for e in bank["records"] if e != affected])
        # Same original content address can be repaired; the corrupt bytes are
        # quarantined, not mistaken for a permanent immutable-key conflict.
        replacement = self.case["folder"] / "replacement.nc"
        replacement.write_bytes(original)
        request = next(r for r in bank["requests"] if r["requestSha256"] == affected["requestSha256"])
        restored_path, receipt = cache.store(request, replacement)
        self.assertEqual(restored_path.read_bytes(), original)
        self.assertEqual(receipt["acquisitionAt"], affected["acquisitionAt"])
        from lib.copernicus_weather_components import read_component_subset
        from lib.copernicus_weather_component_bank import merge_component_read
        read = read_component_subset(restored_path, contract_key="nws-temperature", target=TARGET, expected_times=request["expectedTimes"])
        restored = merge_component_read(filtered, plan=self.case["plan"], request=request, read=read, acquisition_at=receipt["acquisitionAt"])
        self.assertEqual(restored, bank)
        self.assertEqual(len(list((cache.directory / "quarantine").iterdir())), 1)
        receipt_path = cache.receipt_path(request["requestSha256"], affected["native"]["subsetSha256"])
        receipt_path.write_text("invalid synthetic receipt", encoding="utf-8")
        broken, removed = RUNNER["exclude_unverifiable_originals"](bank, cache)
        self.assertEqual(removed, 1)
        replacement.write_bytes(original)
        _, new_receipt = cache.store(request, replacement)
        self.assertEqual(new_receipt["subsetSha256"], affected["native"]["subsetSha256"])
        self.assertEqual(len(list((cache.directory / "quarantine").iterdir())), 2)

    def test_cached_dynamic_with_missing_static_is_repaired_without_dynamic_redownload(self):
        plan = copy.deepcopy(self.case["raw"])
        plan["needs"] = [n for n in plan["needs"] if n["validTime"] != TIMES[1]]
        plan = RUNNER["pinned_plan"](plan)
        # Only NWS is present; do not invoke unrelated Baltic fixture transport.
        from lib.copernicus_weather_component_bank import build_component_plan
        plan = build_component_plan(targets=[TARGET], production_reference_at=plan["productionReferenceAt"], needs=plan["needs"],
            product_routes={TARGET["partId"]: {"wave": ["nws-wave"]}}, routing_policy=plan["routingPolicy"],
            retention_start_at=plan["retentionStartAt"], retention_end_at=plan["retentionEndAt"])
        cache = self.case["cache"]
        req = static_request("nws-wave", TARGET)
        (cache.directory / "static" / (req["requestSha256"][7:] + ".json")).unlink()
        calls = []
        def prepare_static(key, target):
            calls.append((key, target))
            self.store_static(key)
            return True
        result = produce_component_bank(plan, self.case["bank"], acquire_subset=lambda _: self.fail("unexpected dynamic request"),
            acquisition_at=lambda: self.fail("unexpected acquisition"), checkpoint=lambda *a: None,
            prepare_reusable_group=prepare_static)
        self.assertEqual(result["bank"], self.case["bank"])
        self.assertEqual(len(calls), 1)
        self.assertEqual(len(self.authority()["stage"]["candidates"]), 2)


if __name__ == "__main__":
    if len(sys.argv) == 3 and sys.argv[1] in {"--prepare-fixture", "--prepare-adapter-fixture"}:
        prepare(sys.argv[2], all_components=sys.argv[1] == "--prepare-adapter-fixture")
    else:
        unittest.main(verbosity=2)
