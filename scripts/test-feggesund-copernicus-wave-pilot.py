#!/usr/bin/env python3
"""Fixture contracts for the private Feggesund Copernicus wave pilot."""
from __future__ import annotations

import json
import os
import subprocess
import sys
import tempfile
import unittest
from datetime import datetime, timedelta, timezone
from pathlib import Path

import numpy as np
import xarray as xr


ROOT = Path(__file__).resolve().parents[1]
SCRIPT = ROOT / "scripts/pilot-feggesund-copernicus-wave.py"
TARGET_HOUR = datetime(2026, 8, 30, 0, tzinfo=timezone.utc)
TARGET_TEXT = "2026-08-30T00:00:00Z"
SYNTHETIC_TARGETS = (
    ("synthetic-feggesund-part-a", 10.1111111, 56.1111111),
    ("synthetic-feggesund-part-b", 10.2222222, 56.2222222),
    ("synthetic-feggesund-part-c", 10.3333333, 56.3333333),
)


def naive64(value: datetime) -> np.datetime64:
    return np.datetime64(value.astimezone(timezone.utc).replace(tzinfo=None), "s")


def write_registry(path: Path) -> None:
    affected = [
        {
            "partId": part_id,
            "sourceZoneId": "DK-B05-11",
            "name": f"Synthetic {index}",
            "waterPoint": [longitude, latitude],
        }
        for index, (part_id, longitude, latitude) in enumerate(SYNTHETIC_TARGETS)
    ]
    document = {
        "schemaVersion": 2,
        "partCount": 4,
        "zoneCount": 2,
        "zones": {
            "DK-B05-11": affected,
            "DK-TEST": [{
                "partId": "synthetic-unrelated",
                "sourceZoneId": "DK-TEST",
                "name": "Synthetic unrelated",
                "waterPoint": [11.0, 57.0],
            }],
        },
    }
    path.write_text(json.dumps(document), encoding="utf-8")


def write_static(
    path: Path,
    longitude: float,
    latitude: float,
    *,
    nearest_wet: bool = True,
    nearest_depth: float = 12.0,
    shift_longitude: float = 0.0,
) -> None:
    longitudes = np.array([
        longitude + shift_longitude,
        longitude + shift_longitude + 0.03,
    ], dtype=float)
    latitudes = np.array([latitude, latitude + 0.02], dtype=float)
    mask = np.ones((2, 2), dtype=np.int16)
    mask[0, 0] = 1 if nearest_wet else 0
    depth = np.full((2, 2), 15.0, dtype=float)
    depth[0, 0] = nearest_depth
    dataset = xr.Dataset(
        data_vars={
            "mask": (("lat", "lon"), mask, {"standard_name": "sea_binary_mask", "units": "1"}),
            "deptho": (("lat", "lon"), depth, {
                "standard_name": "sea_floor_depth_below_geoid", "units": "m"
            }),
        },
        coords={
            "lon": ("lon", longitudes, {"standard_name": "longitude", "units": "degrees_east"}),
            "lat": ("lat", latitudes, {"standard_name": "latitude", "units": "degrees_north"}),
        },
    )
    dataset.to_netcdf(path)


def write_dynamic(
    path: Path,
    longitude: float,
    latitude: float,
    product: str,
    *,
    run: datetime,
    missing_hour: bool = False,
    omit_run_contract: bool = False,
    shift_longitude: float = 0.0,
    active_direction_missing: bool = False,
    calm_directionless: bool = False,
) -> None:
    times = [
        TARGET_HOUR - timedelta(hours=40) + timedelta(hours=index)
        for index in range(158)
    ]
    if missing_hour:
        del times[53]
    shape = (len(times), 2, 2)
    height = np.full(shape, 0.7, dtype=float)
    period = np.full(shape, 5.5, dtype=float)
    direction = np.full(shape, 245.0, dtype=float)
    if active_direction_missing:
        direction[10, 0, 0] = np.nan
    if calm_directionless:
        height[10, 0, 0] = 0.0
        direction[10, 0, 0] = np.nan
    direction_attrs = {
        "standard_name": "sea_surface_wave_from_direction",
        "units": "degree",
    }
    if product == "nws":
        direction_attrs["direction_reference"] = "True North"
    coords = {
        "time": ("time", np.array([naive64(value) for value in times]), {
            "standard_name": "time"
        }),
        "lon": ("lon", np.array([
            longitude + shift_longitude,
            longitude + shift_longitude + 0.03,
        ]), {
            "standard_name": "longitude", "units": "degrees_east"
        }),
        "lat": ("lat", np.array([latitude, latitude + 0.02]), {
            "standard_name": "latitude", "units": "degrees_north"
        }),
    }
    if not omit_run_contract:
        coords["forecast_reference_time"] = (
            (), naive64(run), {"standard_name": "forecast_reference_time"}
        )
        coords["forecast_period"] = (
            "time",
            np.array([
                np.timedelta64(int((value - run).total_seconds()), "s") for value in times
            ]),
            {"standard_name": "forecast_period"},
        )
    dataset = xr.Dataset(
        data_vars={
            "VHM0": (("time", "lat", "lon"), height, {
                "standard_name": "sea_surface_wave_significant_height", "units": "m"
            }),
            "VTPK": (("time", "lat", "lon"), period, {
                "standard_name": "sea_surface_wave_period_at_variance_spectral_density_maximum",
                "units": "s",
            }),
            "VMDR": (("time", "lat", "lon"), direction, direction_attrs),
        },
        coords=coords,
    )
    dataset.to_netcdf(path)


def write_fixtures(
    directory: Path,
    *,
    masked: tuple[str, int] | None = None,
    missing_hour: tuple[str, int] | None = None,
    mixed_run: tuple[str, int] | None = None,
    missing_run_contract: tuple[str, int] | None = None,
    shifted_dynamic: tuple[str, int] | None = None,
    active_direction_missing: tuple[str, int] | None = None,
    far_cell: tuple[str, int] | None = None,
    shallow: tuple[str, int] | None = None,
    calm_directionless: tuple[str, int] | None = None,
) -> None:
    for product in ("nws", "baltic"):
        default_run = TARGET_HOUR if product == "nws" else TARGET_HOUR - timedelta(hours=48)
        for index, (_part_id, longitude, latitude) in enumerate(SYNTHETIC_TARGETS):
            base_shift = 0.04 if far_cell == (product, index) else 0.0
            write_static(
                directory / f"{product}-static-{index:03d}.nc",
                longitude,
                latitude,
                nearest_wet=masked != (product, index),
                nearest_depth=5.0 if shallow == (product, index) else 12.0,
                shift_longitude=base_shift,
            )
            run = default_run
            if mixed_run == (product, index):
                run = default_run - timedelta(hours=24 if product == "nws" else 12)
            write_dynamic(
                directory / f"{product}-dynamic-{index:03d}.nc",
                longitude,
                latitude,
                product,
                run=run,
                missing_hour=missing_hour == (product, index),
                omit_run_contract=missing_run_contract == (product, index),
                shift_longitude=base_shift + (0.01 if shifted_dynamic == (product, index) else 0.0),
                active_direction_missing=active_direction_missing == (product, index),
                calm_directionless=calm_directionless == (product, index),
            )


def run_pilot(
    root: Path,
    *,
    dry_run_mib: float = 0.125,
) -> tuple[subprocess.CompletedProcess[str], dict]:
    output = root / "safe-result.json"
    summary = root / "safe-result.txt"
    env = os.environ.copy()
    env["PYTHONDONTWRITEBYTECODE"] = "1"
    completed = subprocess.run(
        [
            sys.executable,
            str(SCRIPT),
            "--targets", str(root / "targets.json"),
            "--target-hour", TARGET_TEXT,
            "--fixture-directory", str(root / "fixtures"),
            "--fixture-dry-run-mib", str(dry_run_mib),
            "--output", str(output),
            "--summary", str(summary),
        ],
        cwd=ROOT,
        env=env,
        capture_output=True,
        text=True,
        timeout=90,
        check=False,
    )
    report = json.loads(output.read_text(encoding="utf-8"))
    assert json.loads(summary.read_text(encoding="utf-8")) == report
    return completed, report


class FeggesundCopernicusWavePilotTests(unittest.TestCase):
    def make_case(self, **fixture_options):
        temporary = tempfile.TemporaryDirectory(prefix="rr-feggesund-wave-test-")
        root = Path(temporary.name)
        (root / "fixtures").mkdir()
        write_registry(root / "targets.json")
        write_fixtures(root / "fixtures", **fixture_options)
        self.addCleanup(temporary.cleanup)
        return root

    def test_both_products_can_pass_only_as_independent_complete_candidates(self):
        root = self.make_case()
        completed, report = run_pilot(root)
        self.assertEqual(completed.returncode, 0, completed.stdout + completed.stderr)
        self.assertTrue(report["pilotExecutionComplete"])
        for product in report["products"].values():
            self.assertEqual(product["expectedPartCount"], 3)
            self.assertEqual(product["testedPartCount"], 3)
            self.assertEqual(product["wetPartCount"], 3)
            self.assertEqual(product["completePartCount"], 3)
            self.assertTrue(product["singleBulletinVerified"])
            self.assertTrue(product["candidateAccepted"])
        self.assertTrue(report["temporaryFilesRemoved"])

    def test_exact_nearest_masked_cell_is_not_replaced_by_farther_wet_cell(self):
        root = self.make_case(masked=("nws", 1))
        _completed, report = run_pilot(root)
        nws = report["products"]["nws"]
        self.assertEqual(nws["wetPartCount"], 2)
        self.assertEqual(nws["completePartCount"], 2)
        self.assertFalse(nws["candidateAccepted"])
        self.assertTrue(report["products"]["baltic"]["candidateAccepted"])

    def test_products_are_never_cross_merged_to_hide_a_gap(self):
        root = self.make_case(masked=("nws", 0), missing_hour=("baltic", 1))
        _completed, report = run_pilot(root)
        self.assertFalse(report["products"]["nws"]["candidateAccepted"])
        self.assertFalse(report["products"]["baltic"]["candidateAccepted"])
        self.assertNotIn("combined", report["products"])

    def test_mixed_bulletins_fail_even_when_each_local_tuple_is_complete(self):
        root = self.make_case(mixed_run=("nws", 2))
        _completed, report = run_pilot(root)
        nws = report["products"]["nws"]
        self.assertEqual(nws["completePartCount"], 3)
        self.assertFalse(nws["singleBulletinVerified"])
        self.assertFalse(nws["candidateAccepted"])

    def test_missing_hour_and_missing_run_contract_fail_closed(self):
        root = self.make_case(
            missing_hour=("nws", 1), missing_run_contract=("baltic", 2)
        )
        _completed, report = run_pilot(root)
        self.assertEqual(report["products"]["nws"]["wetPartCount"], 3)
        self.assertEqual(report["products"]["nws"]["completePartCount"], 2)
        self.assertFalse(report["products"]["nws"]["candidateAccepted"])
        self.assertEqual(report["products"]["baltic"]["wetPartCount"], 3)
        self.assertEqual(report["products"]["baltic"]["completePartCount"], 2)
        self.assertFalse(report["products"]["baltic"]["candidateAccepted"])

    def test_same_cell_and_active_direction_contracts_fail_closed(self):
        root = self.make_case(
            shifted_dynamic=("nws", 0), active_direction_missing=("baltic", 1)
        )
        _completed, report = run_pilot(root)
        self.assertFalse(report["products"]["nws"]["allStaticAndDynamicCellsMatch"])
        self.assertFalse(report["products"]["nws"]["candidateAccepted"])
        self.assertFalse(report["products"]["baltic"]["allHourlyTuplesComplete"])
        self.assertFalse(report["products"]["baltic"]["candidateAccepted"])

    def test_distance_and_product_specific_depth_gates_fail_closed(self):
        root = self.make_case(far_cell=("baltic", 0), shallow=("nws", 1))
        _completed, report = run_pilot(root)
        self.assertFalse(report["products"]["baltic"]["allNearestCellsWithinBound"])
        self.assertEqual(report["products"]["baltic"]["completePartCount"], 2)
        self.assertFalse(report["products"]["baltic"]["candidateAccepted"])
        self.assertEqual(report["products"]["nws"]["completePartCount"], 2)
        self.assertFalse(report["products"]["nws"]["candidateAccepted"])

    def test_exact_calm_may_be_directionless_when_period_remains_finite(self):
        root = self.make_case(calm_directionless=("nws", 1))
        _completed, report = run_pilot(root)
        self.assertTrue(report["products"]["nws"]["allHourlyTuplesComplete"])
        self.assertTrue(report["products"]["nws"]["candidateAccepted"])

    def test_dry_run_cap_prevents_download_and_fails_execution(self):
        root = self.make_case()
        completed, report = run_pilot(root, dry_run_mib=2.0)
        self.assertEqual(completed.returncode, 2)
        self.assertFalse(report["pilotExecutionComplete"])
        for product in report["products"].values():
            self.assertEqual(product["testedPartCount"], 0)
            self.assertFalse(product["sourceQueriesSucceeded"])
            self.assertEqual(product["sizeBucket"], "over-cap-or-unavailable")

    def test_artifacts_contain_only_aggregates_hashes_booleans_and_size_buckets(self):
        root = self.make_case()
        completed, report = run_pilot(root)
        text = json.dumps(report, ensure_ascii=False, sort_keys=True)
        self.assertEqual(completed.returncode, 0)
        for part_id, longitude, latitude in SYNTHETIC_TARGETS:
            self.assertNotIn(part_id, text)
            self.assertNotIn(f"{longitude:.7f}", text)
            self.assertNotIn(f"{latitude:.7f}", text)
        for forbidden in (
            "Synthetic 0", "VHM0", "VTPK", "VMDR", "245.0", TARGET_TEXT,
            "NWSHELF_ANALYSISFORECAST_WAV_004_014",
            "BALTICSEA_ANALYSISFORECAST_WAV_003_010",
        ):
            self.assertNotIn(forbidden, text)
        self.assertFalse(report["coordinateValuesStored"])
        self.assertFalse(report["rawWeatherValuesStored"])
        self.assertFalse(report["rawDirectionValuesStored"])
        self.assertFalse(report["rawNetcdfStored"])


if __name__ == "__main__":
    unittest.main(verbosity=2)
