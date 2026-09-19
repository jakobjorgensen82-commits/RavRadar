"""Offline real NetCDF -> immutable originals -> authority / transport tests."""
from __future__ import annotations
import copy
import json
import runpy
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path
from types import SimpleNamespace

import numpy as np
import xarray as xr

from lib.copernicus_weather_component_bank import _request, empty_component_bank, produce_component_bank, save_component_bank
from lib.copernicus_weather_components import CONTRACTS, MAX_SUBSET_BYTES
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


def prepare(folder, all_components=False):
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
        static_fixture(key).to_netcdf(static_path, engine="h5netcdf")
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
        for kwargs in ({"mask": 0}, {"depth": 9}, {"lon": 10.001}):
            with self.subTest(kwargs=kwargs):
                self.store_static(**kwargs)
                self.assertEqual(self.authority()["stage"]["candidates"], [])
        dataset = static_fixture()
        dataset.longitude.attrs["units"] = "radians"
        path = self.case["folder"] / "radians.nc"
        dataset.to_netcdf(path, engine="h5netcdf")
        self.case["cache"].store(static_request("nws-wave", TARGET), path)
        self.assertEqual(self.authority()["stage"]["candidates"], [])

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

    def test_dynamic_original_tamper_is_not_authorized_by_self_consistent_bank(self):
        row = self.case["bank"]["records"][0]["native"]
        path = self.case["cache"].object_path(row["subsetSha256"])
        with path.open("ab") as handle:
            handle.write(b"synthetic corruption")
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
        self.assertIs(subset_arguments(request, "nws-wave", self.case["folder"])["raise_if_updating"], True)

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
