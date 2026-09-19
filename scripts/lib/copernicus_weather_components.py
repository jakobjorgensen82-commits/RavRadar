"""Read private CP wave/level/surface-temperature candidates, without transport.

This is a parser, not production admission. The caller must bind the pinned
request to these bytes and qualify the central target/product/wet-cell coverage.
Neither a finite ocean value nor a file hash proves that spatial qualification.
Unknown forecast age is retained as unknown; it never acquires overwrite rights.
"""
from __future__ import annotations

import hashlib
import io
import math
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Iterable

import numpy as np
import xarray as xr

from .copernicus_current import haversine_km


# Existing wave feasibility response budget, not a new production acquisition
# allowance. Raising it (or the provisional 2 km parser cap) needs integration
# evidence; neither cap establishes SST/level spatial admission policy.
MAX_SUBSET_BYTES = 16 * 1024 * 1024


class ComponentReadError(ValueError):
    """Only fixed error codes are exposed; no private values in exceptions."""


@dataclass(frozen=True)
class ComponentContract:
    component: str
    product_id: str
    dataset_id: str
    dataset_version: str
    fields: tuple[tuple[str, str, str], ...]
    run_hours: tuple[int, ...]
    lead_hours: tuple[int, int]
    surface_depth_m: float | None = None


_WAVE_FIELDS = (
    ("VHM0", "sea_surface_wave_significant_height", "m"),
    ("VTPK", "sea_surface_wave_period_at_variance_spectral_density_maximum", "s"),
    ("VMDR", "sea_surface_wave_from_direction", "degree"),
)
_TEMP_FIELDS = (("thetao", "sea_water_potential_temperature", "degC"),)
CONTRACTS = {
    "nws-wave": ComponentContract("wave", "NWSHELF_ANALYSISFORECAST_WAV_004_014",
        "cmems_mod_nws_wav_anfc_1.5km_PT1H-i", "202511", _WAVE_FIELDS, (0,), (-48, 168)),
    "baltic-wave": ComponentContract("wave", "BALTICSEA_ANALYSISFORECAST_WAV_003_010",
        "cmems_mod_bal_wav_anfc_PT1H-i", "202311", _WAVE_FIELDS, (0, 12), (0, 216)),
    "nws-level": ComponentContract("waterLevel", "NWSHELF_ANALYSISFORECAST_PHY_004_013",
        "cmems_mod_nws_phy-ssh_anfc_1.5km-2D_PT1H-i", "202511",
        (("zos", "sea_surface_height_above_geoid", "m"),), (0,), (-48, 168)),
    "baltic-level": ComponentContract("waterLevel", "BALTICSEA_ANALYSISFORECAST_PHY_003_006",
        "cmems_mod_bal_phy_anfc_PT1H-i", "202411",
        (("sla", "sea_surface_height_above_sea_level", "m"),), (0, 12), (-12, 216)),
    "nws-temperature": ComponentContract("waterTemperature", "NWSHELF_ANALYSISFORECAST_PHY_004_013",
        "cmems_mod_nws_phy-sst_anfc_1.5km-2D_PT1H-i", "202511",
        _TEMP_FIELDS, (0,), (-48, 168)),
    "baltic-temperature": ComponentContract("waterTemperature", "BALTICSEA_ANALYSISFORECAST_PHY_003_006",
        "cmems_mod_bal_phy_anfc_PT1H-i", "202411",
        _TEMP_FIELDS, (0, 12), (-12, 216), 0.5),
}
_UNITS = {
    "m": {"m", "meter", "metre", "meters", "metres"},
    "s": {"s", "sec", "second", "seconds"},
    "degree": {"degree", "degrees"},
    "degC": {"degree_c", "degrees_c", "degree_celsius", "degrees_celsius", "degc", "celsius"},
}


def _time(value: Any, code: str) -> datetime:
    if isinstance(value, np.datetime64):
        if np.isnat(value):
            raise ComponentReadError(code)
        value = np.datetime_as_string(value, unit="us") + "Z"
    if isinstance(value, str):
        try:
            value = datetime.fromisoformat(value.replace("Z", "+00:00"))
        except ValueError:
            raise ComponentReadError(code) from None
    if not isinstance(value, datetime) or value.tzinfo is None:
        raise ComponentReadError(code)
    return value.astimezone(timezone.utc)


def _iso(value: datetime) -> str:
    return value.isoformat().replace("+00:00", "Z")


def _coordinate(dataset: xr.Dataset, names: tuple[str, ...], standard: str) -> str:
    candidates = [str(name) for name in dataset.variables
                  if name in names or dataset[name].attrs.get("standard_name") == standard]
    if len(candidates) != 1:
        raise ComponentReadError("CP_COORDINATE_MISSING_OR_AMBIGUOUS")
    name = candidates[0]
    if dataset[name].attrs.get("standard_name", standard) != standard:
        raise ComponentReadError("CP_COORDINATE_SEMANTICS_INVALID")
    return name


def _optional_forecast_coordinate(dataset: xr.Dataset, standard: str) -> str | None:
    names = [str(name) for name in dataset.variables
             if name == standard or dataset[name].attrs.get("standard_name") == standard]
    if not names:
        return None
    if len(names) != 1 or dataset[names[0]].attrs.get("standard_name", standard) != standard:
        raise ComponentReadError("CP_MODEL_REFERENCE_AMBIGUOUS")
    return names[0]


def _row_metadata(array: xr.DataArray, time_dimension: str, index: int) -> Any:
    if array.ndim == 0:
        return array.values[()]
    if array.dims == (time_dimension,):
        return array.values[index]
    raise ComponentReadError("CP_MODEL_REFERENCE_DIMENSIONS_INVALID")


def _lead_seconds(value: Any, array: xr.DataArray) -> float:
    if isinstance(value, np.timedelta64):
        if np.isnat(value):
            raise ComponentReadError("CP_FORECAST_PERIOD_INVALID")
        seconds = float(value / np.timedelta64(1, "s"))
    else:
        if isinstance(value, (bool, np.bool_)) or not isinstance(value, (int, float, np.number)):
            raise ComponentReadError("CP_FORECAST_PERIOD_INVALID")
        units = str(array.attrs.get("units", "")).lower().strip()
        factors = {"s": 1, "sec": 1, "second": 1, "seconds": 1,
                   "h": 3600, "hour": 3600, "hours": 3600}
        if units not in factors:
            raise ComponentReadError("CP_FORECAST_PERIOD_UNIT_INVALID")
        seconds = float(value) * factors[units]
    if not math.isfinite(seconds):
        raise ComponentReadError("CP_FORECAST_PERIOD_INVALID")
    return seconds


def _model_reference(dataset: xr.Dataset, contract: ComponentContract, *, index: int,
                     time_dimension: str, valid_time: datetime, subset_hash: str,
                     reference_name: str | None, period_name: str | None) -> tuple[str | None, dict]:
    if reference_name is None:
        # Lead by itself is not promoted into a fabricated reference; preserve
        # unknown age, including datasets that have only acquisition metadata.
        return None, {"kind": "unavailable", "reason": "NO_RESPONSE_FORECAST_REFERENCE_TIME"}
    run = _time(_row_metadata(dataset[reference_name], time_dimension, index), "CP_MODEL_REFERENCE_INVALID")
    if run.minute or run.second or run.microsecond or run.hour not in contract.run_hours:
        raise ComponentReadError("CP_MODEL_REFERENCE_CYCLE_INVALID")
    lead = (valid_time - run).total_seconds()
    if not contract.lead_hours[0] * 3600 <= lead <= contract.lead_hours[1] * 3600:
        raise ComponentReadError("CP_MODEL_REFERENCE_HORIZON_INVALID")
    if period_name is not None:
        actual_lead = _lead_seconds(_row_metadata(dataset[period_name], time_dimension, index), dataset[period_name])
        if abs(actual_lead - lead) > 1.0:
            raise ComponentReadError("CP_FORECAST_PERIOD_MISMATCH")
    proof = {
        "kind": "subset-forecast-reference-time", "payloadSha256": subset_hash,
        "modelRun": _iso(run), "validTime": _iso(valid_time),
        "referenceVariable": reference_name,
        "referenceIndex": index if dataset[reference_name].ndim else None,
        "forecastPeriodVariable": period_name, "forecastPeriodChecked": period_name is not None,
        "leadSeconds": lead,
    }
    return _iso(run), proof


def _field(dataset: xr.Dataset, name: str, standard: str, units: str) -> xr.DataArray:
    if name not in dataset or dataset[name].attrs.get("standard_name") != standard:
        raise ComponentReadError("CP_COMPONENT_FIELD_SEMANTICS_INVALID")
    array = dataset[name]
    if array.dtype.kind not in "fiu":
        raise ComponentReadError("CP_COMPONENT_DTYPE_INVALID")
    unit = str(array.attrs.get("units", "")).lower().strip().replace(" ", "_")
    if unit not in _UNITS[units]:
        raise ComponentReadError("CP_COMPONENT_UNIT_INVALID")
    methods = str(array.attrs.get("cell_methods", ""))
    if "time:" in methods and "time: point" not in methods:
        raise ComponentReadError("CP_COMPONENT_NOT_INSTANTANEOUS")
    # CF valid_range is expressed in the packed domain when scale/offset is
    # used. xarray decodes fill/scaling, but does not mask valid_range itself.
    bounds = array.attrs.get("valid_range")
    if bounds is None and "valid_min" in array.attrs and "valid_max" in array.attrs:
        bounds = [array.attrs["valid_min"], array.attrs["valid_max"]]
    if bounds is not None:
        try:
            bounds = np.asarray(bounds, dtype=float)
            bounds = bounds * float(array.encoding.get("scale_factor", 1)) + float(array.encoding.get("add_offset", 0))
        except (TypeError, ValueError):
            raise ComponentReadError("CP_COMPONENT_VALID_RANGE_INVALID") from None
        if bounds.shape != (2,) or not np.isfinite(bounds).all() or bounds[0] > bounds[1]:
            raise ComponentReadError("CP_COMPONENT_VALID_RANGE_INVALID")
        array = array.where((array >= bounds[0]) & (array <= bounds[1]))
    return array


def _values(component: str, values: list[float]) -> tuple[dict, dict]:
    if component == "wave":
        height, period, direction = values
        if not math.isfinite(height) or not math.isfinite(period) or height < 0 or period < 0:
            raise ComponentReadError("CP_WAVE_TUPLE_MISSING_OR_INVALID")
        if height > 0 and (period <= 0 or not math.isfinite(direction)):
            raise ComponentReadError("CP_WAVE_TUPLE_MISSING_OR_INVALID")
        if math.isinf(direction) or (math.isfinite(direction) and not 0 <= direction <= 360):
            raise ComponentReadError("CP_WAVE_DIRECTION_INVALID")
        return {"waveHeightM": height, "wavePeriodS": period,
                "waveDirectionDeg": direction % 360 if math.isfinite(direction) else None}, {
                    "waveHeightM": "m", "wavePeriodS": "s", "waveDirectionDeg": "degree-from-true-north"}
    value = values[0]
    if not math.isfinite(value):
        raise ComponentReadError("CP_COMPONENT_VALUE_MISSING")
    if component == "waterTemperature":
        if not -5 <= value <= 45:
            raise ComponentReadError("CP_SURFACE_TEMPERATURE_INVALID")
        return {"waterTemperatureC": value}, {"waterTemperatureC": "degC"}
    # Deliberately not named waterLevelCm: native datum requires explicit
    # downstream admission/transformation before entering the DMI public slot.
    return {"seaSurfaceHeightM": value}, {"seaSurfaceHeightM": "m"}


def read_component_subset(path: str | Path, *, contract_key: str, target: dict,
                          expected_times: Iterable[Any], maximum_distance_km: float = 2.0) -> dict:
    """Read exact native hourly candidates from one immutable NetCDF response.

    Select one nearest native grid cell, never interpolate or hunt another cell
    when a field is missing. Scalar/cell/row proofs stay attached to each record.
    Invalid whole-file contracts raise; missing/invalid individual hours return
    code-only ``missing`` entries while valid siblings are retained.
    """
    contract = CONTRACTS.get(contract_key)
    if contract is None:
        raise ComponentReadError("CP_COMPONENT_CONTRACT_UNKNOWN")
    point = target.get("waterPoint")
    if (not isinstance(point, (list, tuple)) or len(point) != 2
        or any(isinstance(v, bool) or not isinstance(v, (int, float)) or not math.isfinite(v) for v in point)
        or not -180 <= point[0] <= 180 or not -90 <= point[1] <= 90
        or any(not isinstance(target.get(key), str) or not target[key] for key in ("partId", "parentZoneId"))):
        raise ComponentReadError("CP_COMPONENT_TARGET_INVALID")
    if (isinstance(maximum_distance_km, bool) or not isinstance(maximum_distance_km, (int, float))
        or not math.isfinite(maximum_distance_km) or maximum_distance_km <= 0 or maximum_distance_km > 2.0):
        raise ComponentReadError("CP_COMPONENT_DISTANCE_BOUND_INVALID")
    times = [_time(value, "CP_REQUEST_TIME_INVALID") for value in expected_times]
    if not times or len(set(times)) != len(times) or any(t.minute or t.second or t.microsecond for t in times):
        raise ComponentReadError("CP_REQUEST_TIMES_INVALID")
    times.sort()
    try:
        subset_path = Path(path)
        if subset_path.stat().st_size > MAX_SUBSET_BYTES:
            raise ComponentReadError("CP_SUBSET_SIZE_BUDGET_EXCEEDED")
        with subset_path.open("rb") as handle:
            # Bound the read too: the file may grow after stat().
            payload = handle.read(MAX_SUBSET_BYTES + 1)
        if len(payload) > MAX_SUBSET_BYTES:
            raise ComponentReadError("CP_SUBSET_SIZE_BUDGET_EXCEEDED")
    except OSError:
        raise ComponentReadError("CP_SUBSET_READ_FAILED") from None
    subset_hash = "sha256:" + hashlib.sha256(payload).hexdigest()
    # Reading the same bytes we hash avoids a file-update/identity race. Backend
    # errors are code-only so a failed read cannot leak file paths or payloads.
    try:
        with xr.open_dataset(io.BytesIO(payload), decode_cf=True, mask_and_scale=True, decode_timedelta=True) as opened:
            dataset = opened.load()
    except Exception:
        raise ComponentReadError("CP_SUBSET_DECODE_FAILED") from None
    for name, expected in (("product_id", contract.product_id), ("cmems_product_id", contract.product_id),
                           ("dataset_id", contract.dataset_id), ("dataset_version", contract.dataset_version)):
        if name in dataset.attrs and str(dataset.attrs[name]) != expected:
            raise ComponentReadError("CP_COMPONENT_DATASET_IDENTITY_CONFLICT")
    time_name = _coordinate(dataset, ("time", "valid_time"), "time")
    lon_name = _coordinate(dataset, ("longitude", "lon"), "longitude")
    lat_name = _coordinate(dataset, ("latitude", "lat"), "latitude")
    for name, allowed_units in ((lon_name, {"degrees_east", "degree_east"}),
                                (lat_name, {"degrees_north", "degree_north"})):
        if dataset[name].attrs.get("units") not in allowed_units:
            raise ComponentReadError("CP_SPATIAL_COORDINATE_UNIT_INVALID")
    for name in (time_name, lon_name, lat_name):
        if dataset[name].ndim != 1 or not dataset[name].size:
            raise ComponentReadError("CP_COORDINATE_DIMENSIONS_INVALID")
    time_dim, lon_dim, lat_dim = (dataset[name].dims[0] for name in (time_name, lon_name, lat_name))
    if len({time_dim, lon_dim, lat_dim}) != 3:
        raise ComponentReadError("CP_COORDINATE_DIMENSIONS_INVALID")
    native_times = [_time(value, "CP_SUBSET_TIME_INVALID") for value in dataset[time_name].values]
    if len(set(native_times)) != len(native_times) or any(t.minute or t.second or t.microsecond for t in native_times):
        raise ComponentReadError("CP_SUBSET_TIME_AXIS_INVALID")
    time_index = {value: index for index, value in enumerate(native_times)}
    axes = []
    for name, bound in ((lon_name, 180), (lat_name, 90)):
        axis = np.asarray(dataset[name].values, dtype=float)
        if not np.isfinite(axis).all() or len(np.unique(axis)) != len(axis) or np.any(np.abs(axis) > bound):
            raise ComponentReadError("CP_SPATIAL_COORDINATE_INVALID")
        axes.append(axis)
    lons, lats = axes
    # Exact haversine ranking; bounding the axes first keeps regional subsets
    # cheap and does not change nearest-cell semantics.
    latitude_margin = maximum_distance_km / 110.0
    y_candidates = np.flatnonzero(np.abs(lats - point[1]) <= latitude_margin)
    longitude_margin = maximum_distance_km / (110.0 * max(0.001, math.cos(math.radians(point[1]))))
    x_candidates = np.flatnonzero(np.abs(lons - point[0]) <= longitude_margin)
    cells = [(haversine_km(point, [float(lons[x]), float(lats[y])]), float(lats[y]), float(lons[x]), int(y), int(x))
             for y in y_candidates for x in x_candidates]
    cells = [cell for cell in cells if cell[0] <= maximum_distance_km + 1e-9]
    if not cells:
        raise ComponentReadError("CP_NATIVE_CELL_OUTSIDE_BOUND")
    distance, lat, lon, y_index, x_index = min(cells)
    selectors = {lat_dim: y_index, lon_dim: x_index}
    surface_depth = None
    if contract.surface_depth_m is not None:
        depth_name = _coordinate(dataset, ("depth",), "depth")
        depth = dataset[depth_name]
        if (depth.ndim != 1 or not depth.size or depth.dims[0] in (time_dim, lon_dim, lat_dim)
            or depth.attrs.get("positive") != "down" or depth.attrs.get("units") != "m"):
            raise ComponentReadError("CP_SURFACE_DEPTH_CONTRACT_INVALID")
        depths = np.asarray(depth.values, dtype=float)
        if not np.isfinite(depths).all() or np.any(depths < 0) or len(np.unique(depths)) != len(depths):
            raise ComponentReadError("CP_SURFACE_DEPTH_CONTRACT_INVALID")
        indexes = np.flatnonzero(np.isclose(depths, contract.surface_depth_m, atol=1e-6, rtol=0))
        if len(indexes) != 1 or np.min(depths) < contract.surface_depth_m - 1e-6:
            raise ComponentReadError("CP_SURFACE_LAYER_MISSING")
        selectors[depth.dims[0]] = int(indexes[0])
        surface_depth = float(depths[indexes[0]])
    fields = []
    for name, standard, unit in contract.fields:
        field = _field(dataset, name, standard, unit)
        if name == "VMDR":
            direction_reference = str(field.attrs.get("direction_reference", "")).lower().replace("_", " ")
            if ((contract_key == "nws-wave" and direction_reference not in {"true north"})
                or (direction_reference and direction_reference != "true north")):
                raise ComponentReadError("CP_WAVE_DIRECTION_REFERENCE_INVALID")
        if set(field.dims) != {time_dim, *selectors} or len(field.dims) != len(selectors) + 1:
            raise ComponentReadError("CP_COMPONENT_DIMENSIONS_INVALID")
        fields.append(np.asarray(field.isel(selectors).transpose(time_dim).values, dtype=float))
    reference_name = _optional_forecast_coordinate(dataset, "forecast_reference_time")
    period_name = _optional_forecast_coordinate(dataset, "forecast_period")
    records, missing = [], []
    for valid_time in times:
        index = time_index.get(valid_time)
        if index is None:
            missing.append({"validTime": _iso(valid_time), "reason": "CP_NATIVE_HOUR_ABSENT"})
            continue
        try:
            values, units = _values(contract.component, [float(field[index]) for field in fields])
            run, evidence = _model_reference(dataset, contract, index=index, time_dimension=time_dim,
                valid_time=valid_time, subset_hash=subset_hash, reference_name=reference_name, period_name=period_name)
            record = {
                "component": contract.component, "provider": "copernicus", "contractKey": contract_key,
                "productId": contract.product_id, "datasetId": contract.dataset_id,
                "datasetVersion": contract.dataset_version, "datasetBinding": "caller-pinned-request",
                "partId": target["partId"], "parentZoneId": target["parentZoneId"],
                "samplingPoint": list(point), "gridPoint": [lon, lat], "distanceKm": distance,
                "gridIndex": {"latitude": y_index, "longitude": x_index},
                "verticalLayerM": surface_depth,
                "validTime": _iso(valid_time), "nativeTimeIndex": index,
                "values": values, "units": units,
                "nativeFields": [field[0] for field in contract.fields],
                "subsetSha256": subset_hash, "modelRun": run, "modelRunEvidence": evidence,
                "modelReference": evidence if run is not None else None,
                "interpolation": False, "admission": "reader-only-pending-spatial-and-request-binding",
            }
            if contract.component == "waterLevel":
                record["datum"] = contract.fields[0][1]
            if contract.component == "wave":
                record["wavePeriodSemantics"] = "peak"
                record["wavePeriodField"] = "VTPK"
            records.append(record)
        except ComponentReadError as error:
            missing.append({"validTime": _iso(valid_time), "reason": str(error)})
    return {"kind": "RAVRADAR_PRIVATE_COPERNICUS_COMPONENT_SUBSET_READ", "schemaVersion": 1,
            "subsetSha256": subset_hash, "contractKey": contract_key, "records": records, "missing": missing}
