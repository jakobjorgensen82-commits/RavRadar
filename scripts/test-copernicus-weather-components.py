"""Offline file→reader tests, using synthetic xarray/NetCDF subsets only."""
from __future__ import annotations

import hashlib
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

import numpy as np
import xarray as xr

from lib.copernicus_weather_components import CONTRACTS, ComponentReadError, read_component_subset


TIMES = np.array(["2026-09-19T00:00", "2026-09-19T01:00", "2026-09-19T02:00"], dtype="datetime64[ns]")
EXPECTED = ["2026-09-19T00:00:00Z", "2026-09-19T01:00:00Z", "2026-09-19T02:00:00Z"]
TARGET = {"partId": "PART::SYNTHETIC", "parentZoneId": "SYNTHETIC", "waterPoint": [2.0, 1.0]}


def fixture(key="nws-wave", *, reference=True):
    contract = CONTRACTS[key]
    coords = {
        "time": ("time", TIMES, {"standard_name": "time"}),
        "latitude": ("latitude", [1.0], {"standard_name": "latitude", "units": "degrees_north"}),
        "longitude": ("longitude", [2.0], {"standard_name": "longitude", "units": "degrees_east"}),
    }
    if contract.surface_depth_m is not None:
        coords["depth"] = ("depth", [4.0, 0.5], {"standard_name": "depth", "units": "m", "positive": "down"})
    dataset = xr.Dataset(coords=coords)
    for name, standard, unit in contract.fields:
        dimensions = ("time", "depth", "latitude", "longitude") if "depth" in coords else ("time", "latitude", "longitude")
        values = np.ones((3, 2, 1, 1) if "depth" in coords else (3, 1, 1))
        if name == "VTPK":
            values *= 5
        elif name == "VMDR":
            values *= 90
        elif name == "thetao":
            values *= 10
            if "depth" in coords:
                values[:, 0] = 3  # Bottom is intentionally colder than surface.
        dataset[name] = xr.DataArray(values, dims=dimensions, attrs={"standard_name": standard, "units": unit})
        if name == "VMDR":
            dataset[name].attrs["direction_reference"] = "True North"
    if reference:
        dataset["forecast_reference_time"] = xr.DataArray(TIMES[0], attrs={"standard_name": "forecast_reference_time"})
        dataset["forecast_period"] = xr.DataArray([0.0, 1.0, 2.0], dims="time",
            attrs={"standard_name": "forecast_period", "units": "hours"})
    dataset.attrs.update({"dataset_id": contract.dataset_id, "dataset_version": contract.dataset_version})
    return dataset


class ComponentReaderTests(unittest.TestCase):
    def read(self, dataset, *, key="nws-wave", expected=EXPECTED, target=TARGET, **kwargs):
        with tempfile.TemporaryDirectory(prefix="rr-cp-component-reader-") as folder:
            path = Path(folder) / "synthetic.nc"
            dataset.to_netcdf(path, engine="h5netcdf")
            result = read_component_subset(path, contract_key=key, target=target, expected_times=expected, **kwargs)
            self.assertEqual(result["subsetSha256"], "sha256:" + hashlib.sha256(path.read_bytes()).hexdigest())
            return result

    def assertRejected(self, dataset, code, **kwargs):
        with self.assertRaisesRegex(ComponentReadError, "^" + code + "$"):
            self.read(dataset, **kwargs)

    def test_scalar_reference_bound_to_actual_file_and_native_wave_tuple(self):
        result = self.read(fixture())
        self.assertEqual(result["missing"], [])
        self.assertEqual(len(result["records"]), 3)
        row = result["records"][1]
        self.assertEqual(row["values"], {"waveHeightM": 1, "wavePeriodS": 5, "waveDirectionDeg": 90})
        self.assertEqual(row["modelRun"], EXPECTED[0])
        self.assertEqual(row["modelReference"]["payloadSha256"], result["subsetSha256"])
        self.assertEqual(row["modelRunEvidence"]["forecastPeriodChecked"], True)
        self.assertEqual(row["modelRunEvidence"]["leadSeconds"], 3600)
        self.assertEqual(row["gridPoint"], [2.0, 1.0])
        self.assertEqual(row["nativeTimeIndex"], 1)
        self.assertEqual(row["wavePeriodSemantics"], "peak")
        self.assertIn("reader-only", row["admission"])

    def test_time_indexed_references_allow_different_bulletins_between_rows(self):
        dataset = fixture()
        dataset["forecast_reference_time"] = xr.DataArray(
            np.array(["2026-09-18T00:00", "2026-09-19T00:00", "2026-09-19T00:00"], dtype="datetime64[ns]"),
            dims="time", attrs={"standard_name": "forecast_reference_time"})
        dataset["forecast_period"].values[:] = [24, 1, 2]
        result = self.read(dataset)
        self.assertEqual(len(result["records"]), 3)
        self.assertEqual(result["records"][0]["modelRun"], "2026-09-18T00:00:00Z")
        self.assertEqual(result["records"][1]["modelRunEvidence"]["referenceIndex"], 1)

    def test_missing_age_stays_unknown_despite_creation_and_download_metadata(self):
        dataset = fixture(reference=False)
        dataset.attrs.update({"creation_date": EXPECTED[0], "acquisitionAt": EXPECTED[0], "arco_updated_date": EXPECTED[0]})
        result = self.read(dataset)
        self.assertEqual(len(result["records"]), 3)
        for row in result["records"]:
            self.assertIsNone(row["modelRun"])
            self.assertIsNone(row["modelReference"])
            self.assertEqual(row["modelRunEvidence"]["kind"], "unavailable")

    def test_bad_lead_only_rejects_affected_hour(self):
        dataset = fixture()
        dataset["forecast_period"].values[1] = 7
        result = self.read(dataset)
        self.assertEqual([row["validTime"] for row in result["records"]], [EXPECTED[0], EXPECTED[2]])
        self.assertEqual(result["missing"], [{"validTime": EXPECTED[1], "reason": "CP_FORECAST_PERIOD_MISMATCH"}])

    def test_nat_reference_only_rejects_affected_hour(self):
        dataset = fixture()
        dataset["forecast_reference_time"] = xr.DataArray(
            np.array([TIMES[0], np.datetime64("NaT"), TIMES[0]], dtype="datetime64[ns]"), dims="time",
            attrs={"standard_name": "forecast_reference_time"})
        result = self.read(dataset)
        self.assertEqual(len(result["records"]), 2)
        self.assertEqual(result["missing"][0]["reason"], "CP_MODEL_REFERENCE_INVALID")

    def test_metadata_dimensions_and_duplicate_reference_are_not_guessed(self):
        dataset = fixture()
        dataset["forecast_reference_time"] = xr.DataArray([TIMES[0]], dims="other",
            attrs={"standard_name": "forecast_reference_time"})
        result = self.read(dataset)
        self.assertEqual(result["records"], [])
        self.assertEqual({row["reason"] for row in result["missing"]}, {"CP_MODEL_REFERENCE_DIMENSIONS_INVALID"})
        dataset["other_reference"] = xr.DataArray(TIMES[0], attrs={"standard_name": "forecast_reference_time"})
        self.assertRejected(dataset, "CP_MODEL_REFERENCE_AMBIGUOUS")

    def test_missing_wave_value_and_absent_time_keep_siblings(self):
        dataset = fixture()
        dataset["VTPK"].values[1, 0, 0] = np.nan
        result = self.read(dataset, expected=EXPECTED + ["2026-09-19T03:00:00Z"])
        self.assertEqual([row["validTime"] for row in result["records"]], [EXPECTED[0], EXPECTED[2]])
        self.assertEqual([row["reason"] for row in result["missing"]],
            ["CP_WAVE_TUPLE_MISSING_OR_INVALID", "CP_NATIVE_HOUR_ABSENT"])

    def test_peak_is_not_mean_period_and_units_are_not_assumed(self):
        dataset = fixture()
        dataset["VTPK"].attrs["standard_name"] = "sea_surface_wave_mean_period"
        self.assertRejected(dataset, "CP_COMPONENT_FIELD_SEMANTICS_INVALID")
        dataset = fixture()
        dataset["VHM0"].attrs["units"] = "cm"
        self.assertRejected(dataset, "CP_COMPONENT_UNIT_INVALID")

    def test_calm_and_direction_normalization_do_not_invent_noncalm_direction(self):
        dataset = fixture()
        dataset["VMDR"].values[:, 0, 0] = [360, np.nan, np.nan]
        dataset["VHM0"].values[1, 0, 0] = 0
        dataset["VTPK"].values[1, 0, 0] = 0
        result = self.read(dataset)
        self.assertEqual([row["values"]["waveDirectionDeg"] for row in result["records"]], [0, None])
        self.assertEqual(result["missing"][0]["validTime"], EXPECTED[2])

    def test_surface_temperature_selects_half_meter_not_array_zero(self):
        result = self.read(fixture("baltic-temperature"), key="baltic-temperature")
        self.assertEqual({row["values"]["waterTemperatureC"] for row in result["records"]}, {10})
        self.assertEqual({row["component"] for row in result["records"]}, {"waterTemperature"})
        self.assertEqual({row["verticalLayerM"] for row in result["records"]}, {0.5})
        dataset = fixture("baltic-temperature").isel(depth=[0])
        self.assertRejected(dataset, "CP_SURFACE_LAYER_MISSING", key="baltic-temperature")

    def test_nws_surface_product_does_not_accept_deep_temperature(self):
        result = self.read(fixture("nws-temperature"), key="nws-temperature")
        self.assertEqual(result["records"][0]["values"], {"waterTemperatureC": 10})
        dataset = fixture("nws-temperature")
        dataset["thetao"].attrs["standard_name"] = "sea_water_potential_temperature_at_sea_floor"
        self.assertRejected(dataset, "CP_COMPONENT_FIELD_SEMANTICS_INVALID", key="nws-temperature")

    def test_native_level_datum_is_preserved_without_dmi_slot_or_trend(self):
        for key, datum in [("nws-level", "sea_surface_height_above_geoid"),
                           ("baltic-level", "sea_surface_height_above_sea_level")]:
            with self.subTest(key=key):
                row = self.read(fixture(key), key=key)["records"][0]
                self.assertEqual(row["values"], {"seaSurfaceHeightM": 1})
                self.assertEqual(row["datum"], datum)
                self.assertNotIn("waterLevelCm", row["values"])
                self.assertNotIn("waterLevelTrendCm3h", row["values"])

    def test_packed_fill_scale_and_valid_range_are_decoded_once(self):
        dataset = fixture("nws-level")
        dataset["zos"].values[:, 0, 0] = [1.23, np.nan, 2.5]
        dataset["zos"].encoding.update({"dtype": "int16", "scale_factor": 0.01, "_FillValue": -32768})
        dataset["zos"].attrs["valid_range"] = np.array([-200, 200], dtype="int16")
        result = self.read(dataset, key="nws-level")
        self.assertEqual(len(result["records"]), 1)
        self.assertAlmostEqual(result["records"][0]["values"]["seaSurfaceHeightM"], 1.23)
        self.assertEqual(len(result["missing"]), 2)

    def test_invalid_global_contracts_fail_closed(self):
        dataset = fixture()
        dataset.attrs["dataset_id"] = "unrelated-product"
        self.assertRejected(dataset, "CP_COMPONENT_DATASET_IDENTITY_CONFLICT")
        dataset = fixture()
        dataset["VHM0"].attrs["cell_methods"] = "time: mean"
        self.assertRejected(dataset, "CP_COMPONENT_NOT_INSTANTANEOUS")
        self.assertRejected(fixture().assign_coords(time=[TIMES[0], TIMES[0], TIMES[2]]), "CP_SUBSET_TIME_AXIS_INVALID")
        self.assertRejected(fixture(), "CP_COMPONENT_DISTANCE_BOUND_INVALID", maximum_distance_km=5)

    def test_spatial_and_direction_units_cannot_be_silently_relabelled(self):
        dataset = fixture()
        dataset["longitude"].attrs["units"] = "radians"
        self.assertRejected(dataset, "CP_SPATIAL_COORDINATE_UNIT_INVALID")
        dataset = fixture()
        dataset["VMDR"].attrs["direction_reference"] = "magnetic north"
        self.assertRejected(dataset, "CP_WAVE_DIRECTION_REFERENCE_INVALID")
        dataset = fixture()
        del dataset["VMDR"].attrs["direction_reference"]
        self.assertRejected(dataset, "CP_WAVE_DIRECTION_REFERENCE_INVALID")

    def test_baltic_wave_missing_reference_can_fill_holes_without_claiming_age(self):
        dataset = fixture("baltic-wave", reference=False)
        del dataset["VMDR"].attrs["direction_reference"]
        result = self.read(dataset, key="baltic-wave")
        self.assertEqual(len(result["records"]), 3)
        self.assertIsNone(result["records"][0]["modelRun"])

    def test_file_budget_is_enforced_before_decoding(self):
        with patch("lib.copernicus_weather_components.MAX_SUBSET_BYTES", 1), \
             patch("lib.copernicus_weather_components.xr.open_dataset") as decoder:
            self.assertRejected(fixture(), "CP_SUBSET_SIZE_BUDGET_EXCEEDED")
            decoder.assert_not_called()

    def test_no_nearest_wet_cell_hop_when_selected_cell_has_a_hole(self):
        dataset = fixture().reindex(longitude=[2.0, 2.001])
        for name in ("VHM0", "VTPK", "VMDR"):
            dataset[name].values[:, 0, 1] = dataset[name].values[:, 0, 0]
        dataset["VTPK"].values[1, 0, 0] = np.nan
        result = self.read(dataset)
        self.assertEqual(len(result["records"]), 2)
        self.assertEqual({tuple(row["gridPoint"]) for row in result["records"]}, {(2, 1)})


if __name__ == "__main__":
    unittest.main(verbosity=2)
