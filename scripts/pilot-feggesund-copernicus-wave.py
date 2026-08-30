#!/usr/bin/env python3
"""Privacy-safe, non-production feasibility audit for the Feggesund wave seam.

The pilot deliberately does not create weather cache rows and does not expose
target coordinates, grid cells, timestamps or wave values.  It tests each
official product independently against every centrally hydrated coastal part
owned by DK-B05-11.  A product is acceptable only when that product alone can
provide one coherent bulletin for the complete target-40..target+117 window.
"""
from __future__ import annotations

import argparse
import contextlib
import hashlib
import io
import json
import logging
import math
import os
import shutil
import tempfile
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any

import copernicusmarine
import numpy as np
import xarray as xr

from lib.copernicus_current import haversine_km
from lib.copernicus_target_identity import target_fingerprint


ROOT = Path(__file__).resolve().parents[1]
DEFAULT_TARGETS = ROOT / "data/live/coastal-parts-v2.json"
DEFAULT_OUTPUT = ROOT / ".cache/feggesund-copernicus-wave-feasibility.json"
DEFAULT_SUMMARY = ROOT / ".cache/feggesund-copernicus-wave-feasibility.txt"

PARENT_ZONE_ID = "DK-B05-11"
WINDOW_PAST_HOURS = 40
WINDOW_FUTURE_HOURS = 117
REQUIRED_HOUR_COUNT = WINDOW_PAST_HOURS + WINDOW_FUTURE_HOURS + 1
MAX_DRY_RUN_MIB_PER_PRODUCT = 8.0
MAX_DOWNLOADED_BYTES_PER_PRODUCT = 16 * 1024 * 1024

HEIGHT_STANDARD_NAME = "sea_surface_wave_significant_height"
PERIOD_STANDARD_NAME = "sea_surface_wave_period_at_variance_spectral_density_maximum"
DIRECTION_STANDARD_NAME = "sea_surface_wave_from_direction"
MASK_STANDARD_NAME = "sea_binary_mask"
DEPTH_STANDARD_NAME = "sea_floor_depth_below_geoid"


class PilotError(RuntimeError):
    """An intentionally code-only failure that is safe to print."""


@dataclass(frozen=True)
class ProductContract:
    key: str
    product_id: str
    dynamic_dataset_id: str
    static_dataset_id: str
    dataset_version: str
    height_aliases: tuple[str, ...]
    period_aliases: tuple[str, ...]
    direction_aliases: tuple[str, ...]
    minimum_lead_hours: int
    maximum_lead_hours: int
    allowed_run_hours: tuple[int, ...]
    maximum_grid_distance_km: float
    minimum_model_depth_m: float
    require_true_north_attribute: bool


PRODUCTS = (
    ProductContract(
        key="nws",
        product_id="NWSHELF_ANALYSISFORECAST_WAV_004_014",
        dynamic_dataset_id="cmems_mod_nws_wav_anfc_1.5km_PT1H-i",
        static_dataset_id="cmems_mod_nws_wav_anfc_1.5km_static",
        dataset_version="202511",
        height_aliases=("VHM0",),
        period_aliases=("VTPK",),
        direction_aliases=("VMDR",),
        minimum_lead_hours=-48,
        maximum_lead_hours=168,
        allowed_run_hours=(0,),
        maximum_grid_distance_km=2.0,
        minimum_model_depth_m=10.0,
        require_true_north_attribute=True,
    ),
    ProductContract(
        key="baltic",
        product_id="BALTICSEA_ANALYSISFORECAST_WAV_003_010",
        dynamic_dataset_id="cmems_mod_bal_wav_anfc_PT1H-i",
        static_dataset_id="cmems_mod_bal_wav_anfc_static",
        dataset_version="202311",
        height_aliases=("VHM0", "VHMO"),
        period_aliases=("VTPK",),
        direction_aliases=("VMDR",),
        minimum_lead_hours=0,
        maximum_lead_hours=216,
        allowed_run_hours=(0, 12),
        maximum_grid_distance_km=2.0,
        minimum_model_depth_m=0.0,
        require_true_north_attribute=False,
    ),
)


def arguments() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--targets", type=Path, default=DEFAULT_TARGETS)
    parser.add_argument("--target-hour", required=True)
    parser.add_argument("--output", type=Path, default=DEFAULT_OUTPUT)
    parser.add_argument("--summary", type=Path, default=DEFAULT_SUMMARY)
    parser.add_argument("--fixture-directory", type=Path)
    parser.add_argument("--fixture-dry-run-mib", type=float, default=0.125)
    return parser.parse_args()


def sha256_text(value: str) -> str:
    return "sha256:" + hashlib.sha256(value.encode("utf-8")).hexdigest()


def sha256_json(value: Any) -> str:
    return sha256_text(json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(",", ":")))


def file_sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return "sha256:" + digest.hexdigest()


def parse_hour(value: str) -> datetime:
    try:
        parsed = datetime.fromisoformat(str(value).replace("Z", "+00:00"))
    except ValueError as error:
        raise PilotError("TARGET_HOUR_INVALID") from error
    if parsed.tzinfo is None:
        raise PilotError("TARGET_HOUR_TIMEZONE_MISSING")
    parsed = parsed.astimezone(timezone.utc)
    if parsed.minute or parsed.second or parsed.microsecond:
        raise PilotError("TARGET_HOUR_NOT_EXACT")
    return parsed


def expected_hours(target_hour: datetime) -> list[datetime]:
    start = target_hour - timedelta(hours=WINDOW_PAST_HOURS)
    return [start + timedelta(hours=index) for index in range(REQUIRED_HOUR_COUNT)]


def load_zone_targets(path: Path) -> tuple[list[dict[str, Any]], int]:
    try:
        document = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as error:
        raise PilotError("TARGET_REGISTRY_UNREADABLE") from error
    zones = document.get("zones")
    if not isinstance(zones, dict):
        raise PilotError("TARGET_REGISTRY_ZONES_MISSING")
    raw_parts = zones.get(PARENT_ZONE_ID)
    parts = raw_parts if isinstance(raw_parts, list) else []
    targets: list[dict[str, Any]] = []
    seen: set[str] = set()
    for raw in parts:
        if not isinstance(raw, dict):
            raise PilotError("TARGET_PART_MALFORMED")
        part_id = str(raw.get("partId") or "").strip()
        point = raw.get("waterPoint")
        if (
            not part_id
            or part_id in seen
            or not isinstance(point, list)
            or len(point) != 2
        ):
            raise PilotError("TARGET_PART_IDENTITY_INVALID")
        try:
            coordinate = [float(point[0]), float(point[1])]
        except (TypeError, ValueError) as error:
            raise PilotError("TARGET_POINT_INVALID") from error
        if not all(math.isfinite(value) for value in coordinate):
            raise PilotError("TARGET_POINT_NONFINITE")
        seen.add(part_id)
        targets.append({
            "partId": part_id,
            "parentZoneId": PARENT_ZONE_ID,
            "waterPoint": coordinate,
        })
    if not targets:
        raise PilotError("TARGET_ZONE_EMPTY")
    targets.sort(key=lambda row: row["partId"])
    declared_count = int(document.get("partCount") or 0)
    if declared_count < len(targets):
        raise PilotError("TARGET_REGISTRY_COUNT_INVALID")
    return targets, declared_count


def contract_hash(contract: ProductContract) -> str:
    return sha256_json({
        "productId": contract.product_id,
        "dynamicDatasetId": contract.dynamic_dataset_id,
        "staticDatasetId": contract.static_dataset_id,
        "datasetVersion": contract.dataset_version,
        "variables": [contract.height_aliases, contract.period_aliases, contract.direction_aliases],
        "leadHours": [contract.minimum_lead_hours, contract.maximum_lead_hours],
        "runHours": contract.allowed_run_hours,
        "maximumGridDistanceKm": contract.maximum_grid_distance_km,
        "minimumModelDepthM": contract.minimum_model_depth_m,
        "window": [-WINDOW_PAST_HOURS, WINDOW_FUTURE_HOURS],
        "selection": "exact-point-nearest-cell-no-wet-search",
        "merge": "single-product-only",
    })


def coordinate_name(dataset: xr.Dataset, aliases: tuple[str, ...], standard_name: str) -> str:
    for name in aliases:
        if name in dataset.coords or name in dataset.variables:
            return name
    for name, value in dataset.variables.items():
        if str(value.attrs.get("standard_name") or "") == standard_name:
            return name
    raise PilotError("COORDINATE_CONTRACT_MISSING")


def variable_name(dataset: xr.Dataset, aliases: tuple[str, ...], standard_name: str) -> str:
    for name in aliases:
        if name in dataset.variables:
            return name
    for name, value in dataset.data_vars.items():
        if str(value.attrs.get("standard_name") or "") == standard_name:
            return name
    raise PilotError("VARIABLE_CONTRACT_MISSING")


def nearest_cell(
    dataset: xr.Dataset, target: dict[str, Any]
) -> tuple[dict[str, int], tuple[float, float], float]:
    lon_name = coordinate_name(dataset, ("longitude", "lon"), "longitude")
    lat_name = coordinate_name(dataset, ("latitude", "lat"), "latitude")
    longitude = dataset[lon_name]
    latitude = dataset[lat_name]
    target_lon, target_lat = map(float, target["waterPoint"])
    if longitude.ndim == latitude.ndim == 1 and longitude.dims != latitude.dims:
        lon_values = np.asarray(longitude.values, dtype=float)
        lat_values = np.asarray(latitude.values, dtype=float)
        if not np.isfinite(lon_values).any() or not np.isfinite(lat_values).any():
            raise PilotError("GRID_COORDINATES_NONFINITE")
        lon_index = int(np.nanargmin(np.abs(lon_values - target_lon)))
        lat_index = int(np.nanargmin(np.abs(lat_values - target_lat)))
        selection = {longitude.dims[0]: lon_index, latitude.dims[0]: lat_index}
        grid_point = (float(lon_values[lon_index]), float(lat_values[lat_index]))
    else:
        lon_values, lat_values = np.broadcast_arrays(
            np.asarray(longitude.values, dtype=float), np.asarray(latitude.values, dtype=float)
        )
        finite = np.isfinite(lon_values) & np.isfinite(lat_values)
        if not finite.any():
            raise PilotError("GRID_COORDINATES_NONFINITE")
        distances = np.full(lon_values.shape, np.inf, dtype=float)
        for indexes in zip(*np.where(finite)):
            distances[indexes] = haversine_km(
                [target_lon, target_lat], [float(lon_values[indexes]), float(lat_values[indexes])]
            )
        indexes = np.unravel_index(int(np.argmin(distances)), distances.shape)
        dims = longitude.dims if longitude.ndim >= latitude.ndim else latitude.dims
        if len(dims) != len(indexes):
            raise PilotError("GRID_DIMENSION_CONTRACT_INVALID")
        selection = {dimension: int(indexes[position]) for position, dimension in enumerate(dims)}
        grid_point = (float(lon_values[indexes]), float(lat_values[indexes]))
    distance_km = float(haversine_km([target_lon, target_lat], list(grid_point)))
    if not math.isfinite(distance_km):
        raise PilotError("GRID_DISTANCE_NONFINITE")
    return selection, grid_point, distance_km


def canonical_cell(point: tuple[float, float]) -> str:
    return f"{point[0]:.7f},{point[1]:.7f}"


def selected_scalar(array: xr.DataArray, selection: dict[str, int]) -> float:
    selected = array.isel({dimension: index for dimension, index in selection.items() if dimension in array.dims})
    values = np.asarray(selected.values)
    if values.size != 1:
        raise PilotError("STATIC_CELL_NOT_UNIQUE")
    return float(values.reshape(-1)[0])


def selected_series(
    array: xr.DataArray, selection: dict[str, int], time_dimension: str
) -> np.ndarray:
    selected = array.isel({dimension: index for dimension, index in selection.items() if dimension in array.dims})
    for dimension in tuple(selected.dims):
        if dimension != time_dimension:
            if selected.sizes[dimension] != 1:
                raise PilotError("DYNAMIC_CELL_NOT_UNIQUE")
            selected = selected.isel({dimension: 0})
    if tuple(selected.dims) != (time_dimension,):
        raise PilotError("DYNAMIC_TIME_DIMENSION_INVALID")
    return np.asarray(selected.values, dtype=float)


def datetime_values(array: xr.DataArray) -> list[datetime]:
    values = np.asarray(array.values).reshape(-1)
    result: list[datetime] = []
    for value in values:
        try:
            text = np.datetime_as_string(np.datetime64(value), unit="s")
            parsed = datetime.fromisoformat(text.replace("Z", "+00:00"))
        except (TypeError, ValueError) as error:
            raise PilotError("FORECAST_TIME_INVALID") from error
        if parsed.tzinfo is None:
            parsed = parsed.replace(tzinfo=timezone.utc)
        result.append(parsed.astimezone(timezone.utc))
    return result


def forecast_period_seconds(array: xr.DataArray) -> np.ndarray:
    values = np.asarray(array.values).reshape(-1)
    if np.issubdtype(values.dtype, np.timedelta64):
        return values.astype("timedelta64[s]").astype(np.int64).astype(float)
    try:
        numeric = values.astype(float)
    except (TypeError, ValueError) as error:
        raise PilotError("FORECAST_PERIOD_INVALID") from error
    unit = str(array.attrs.get("units") or "").lower().strip()
    factors = {"s": 1.0, "sec": 1.0, "second": 1.0, "seconds": 1.0,
               "h": 3600.0, "hour": 3600.0, "hours": 3600.0}
    factor = factors.get(unit)
    if factor is None:
        raise PilotError("FORECAST_PERIOD_UNIT_INVALID")
    return numeric * factor


def exact_time_series(dataset: xr.Dataset, expected: list[datetime]) -> tuple[str, list[datetime]]:
    time_name = coordinate_name(dataset, ("time", "valid_time"), "time")
    time_array = dataset[time_name]
    if time_array.ndim != 1:
        raise PilotError("TIME_COORDINATE_NOT_ONE_DIMENSIONAL")
    times = datetime_values(time_array)
    if times != expected or len(set(times)) != REQUIRED_HOUR_COUNT:
        raise PilotError("EXACT_HOURLY_WINDOW_MISSING")
    return time_array.dims[0], times


def validate_variable_semantics(array: xr.DataArray, standard_name: str, unit_family: str) -> None:
    if str(array.attrs.get("standard_name") or "") != standard_name:
        raise PilotError("VARIABLE_STANDARD_NAME_INVALID")
    units = str(array.attrs.get("units") or "").lower().replace("_", " ").strip()
    if unit_family == "height" and units not in {"m", "meter", "metre", "meters", "metres"}:
        raise PilotError("HEIGHT_UNIT_INVALID")
    if unit_family == "period" and units not in {"s", "sec", "second", "seconds"}:
        raise PilotError("PERIOD_UNIT_INVALID")
    if unit_family == "direction" and not units.startswith("degree"):
        raise PilotError("DIRECTION_UNIT_INVALID")


def inspect_pair(
    static_path: Path,
    dynamic_path: Path,
    target: dict[str, Any],
    contract: ProductContract,
    target_hour: datetime,
    expected: list[datetime],
) -> dict[str, Any]:
    with xr.open_dataset(static_path) as static:
        static_selection, static_point, static_distance = nearest_cell(static, target)
        mask_name = variable_name(static, ("mask",), MASK_STANDARD_NAME)
        depth_name = variable_name(static, ("deptho",), DEPTH_STANDARD_NAME)
        if str(static[mask_name].attrs.get("standard_name") or "") != MASK_STANDARD_NAME:
            raise PilotError("MASK_STANDARD_NAME_INVALID")
        if str(static[depth_name].attrs.get("standard_name") or "") != DEPTH_STANDARD_NAME:
            raise PilotError("DEPTH_STANDARD_NAME_INVALID")
        mask = selected_scalar(static[mask_name], static_selection)
        depth = selected_scalar(static[depth_name], static_selection)
    wet = bool(math.isfinite(mask) and mask == 1.0)
    depth_eligible = bool(
        math.isfinite(depth)
        and depth > contract.minimum_model_depth_m
        if contract.minimum_model_depth_m == 0.0
        else math.isfinite(depth) and depth >= contract.minimum_model_depth_m
    )
    static_distance_ok = static_distance <= contract.maximum_grid_distance_km + 1e-9

    with xr.open_dataset(dynamic_path) as dynamic:
        dynamic_selection, dynamic_point, dynamic_distance = nearest_cell(dynamic, target)
        time_dimension, times = exact_time_series(dynamic, expected)
        height_name = variable_name(dynamic, contract.height_aliases, HEIGHT_STANDARD_NAME)
        period_name = variable_name(dynamic, contract.period_aliases, PERIOD_STANDARD_NAME)
        direction_name = variable_name(dynamic, contract.direction_aliases, DIRECTION_STANDARD_NAME)
        validate_variable_semantics(dynamic[height_name], HEIGHT_STANDARD_NAME, "height")
        validate_variable_semantics(dynamic[period_name], PERIOD_STANDARD_NAME, "period")
        validate_variable_semantics(dynamic[direction_name], DIRECTION_STANDARD_NAME, "direction")
        if contract.require_true_north_attribute:
            reference = str(dynamic[direction_name].attrs.get("direction_reference") or "").lower()
            if reference not in {"true north", "true_north"}:
                raise PilotError("DIRECTION_REFERENCE_INVALID")
        heights = selected_series(dynamic[height_name], dynamic_selection, time_dimension)
        periods = selected_series(dynamic[period_name], dynamic_selection, time_dimension)
        directions = selected_series(dynamic[direction_name], dynamic_selection, time_dimension)
        reference_name = coordinate_name(
            dynamic, ("forecast_reference_time",), "forecast_reference_time"
        )
        period_coordinate_name = coordinate_name(
            dynamic, ("forecast_period",), "forecast_period"
        )
        references = datetime_values(dynamic[reference_name])
        if len(set(references)) != 1:
            raise PilotError("MULTIPLE_BULLETINS_IN_PART")
        run = references[0]
        period_seconds = forecast_period_seconds(dynamic[period_coordinate_name])

    dynamic_distance_ok = dynamic_distance <= contract.maximum_grid_distance_km + 1e-9
    same_cell = canonical_cell(static_point) == canonical_cell(dynamic_point)
    if len(period_seconds) != REQUIRED_HOUR_COUNT:
        raise PilotError("FORECAST_PERIOD_COUNT_INVALID")
    if run.minute or run.second or run.microsecond or run.hour not in contract.allowed_run_hours:
        raise PilotError("BULLETIN_CYCLE_INVALID")
    if run > target_hour:
        raise PilotError("BULLETIN_AFTER_TARGET")
    for valid_time, seconds in zip(times, period_seconds):
        expected_seconds = (valid_time - run).total_seconds()
        if not math.isfinite(float(seconds)) or abs(float(seconds) - expected_seconds) > 1.0:
            raise PilotError("FORECAST_PERIOD_MISMATCH")
        lead_hours = expected_seconds / 3600.0
        if not (contract.minimum_lead_hours <= lead_hours <= contract.maximum_lead_hours):
            raise PilotError("BULLETIN_HORIZON_INSUFFICIENT")

    tuple_complete = True
    if len(heights) != REQUIRED_HOUR_COUNT or len(periods) != REQUIRED_HOUR_COUNT or len(directions) != REQUIRED_HOUR_COUNT:
        tuple_complete = False
    else:
        for height, period, direction in zip(heights, periods, directions):
            if not math.isfinite(float(height)) or float(height) < 0 or not math.isfinite(float(period)) or float(period) <= 0:
                tuple_complete = False
                break
            if float(height) > 0 and (not math.isfinite(float(direction)) or not 0 <= float(direction) <= 360):
                tuple_complete = False
                break
            if float(height) == 0 and math.isfinite(float(direction)) and not 0 <= float(direction) <= 360:
                tuple_complete = False
                break

    local_complete = bool(
        wet
        and depth_eligible
        and static_distance_ok
        and dynamic_distance_ok
        and same_cell
        and tuple_complete
    )
    return {
        "wet": wet,
        "complete": local_complete,
        "withinBound": static_distance_ok and dynamic_distance_ok,
        "sameCell": same_cell,
        "tupleComplete": tuple_complete,
        "run": run,
        "cellHash": sha256_text(canonical_cell(static_point)),
    }


def inspect_static_wet(static_path: Path, target: dict[str, Any]) -> bool:
    """Count the exact nearest wet cell even when a later run gate rejects the tuple."""
    with xr.open_dataset(static_path) as static:
        selection, _point, _distance = nearest_cell(static, target)
        mask_name = variable_name(static, ("mask",), MASK_STANDARD_NAME)
        if str(static[mask_name].attrs.get("standard_name") or "") != MASK_STANDARD_NAME:
            raise PilotError("MASK_STANDARD_NAME_INVALID")
        mask = selected_scalar(static[mask_name], selection)
    return bool(math.isfinite(mask) and mask == 1.0)


def response_transfer_mib(response: Any) -> float:
    values: list[float] = []
    for name in ("data_transfer_size", "file_size"):
        raw = getattr(response, name, None)
        if raw is None and isinstance(response, dict):
            raw = response.get(name)
        if raw is None:
            continue
        try:
            number = float(raw)
        except (TypeError, ValueError) as error:
            raise PilotError("DRY_RUN_SIZE_INVALID") from error
        if not math.isfinite(number) or number < 0:
            raise PilotError("DRY_RUN_SIZE_INVALID")
        values.append(number)
    if not values:
        raise PilotError("DRY_RUN_SIZE_MISSING")
    return max(values)


def safe_subset(**kwargs: Any) -> Any:
    previous_disable = logging.root.manager.disable
    try:
        logging.disable(logging.CRITICAL)
        with contextlib.redirect_stdout(io.StringIO()), contextlib.redirect_stderr(io.StringIO()):
            return copernicusmarine.subset(**kwargs)
    except Exception as error:
        raise PilotError("COPERNICUS_SUBSET_FAILED") from error
    finally:
        logging.disable(previous_disable)


def request_kwargs(
    contract: ProductContract,
    target: dict[str, Any],
    target_hour: datetime,
    static: bool,
) -> dict[str, Any]:
    longitude, latitude = map(float, target["waterPoint"])
    common: dict[str, Any] = {
        "dataset_id": contract.static_dataset_id if static else contract.dynamic_dataset_id,
        "dataset_version": contract.dataset_version,
        "variables": ["mask", "deptho"] if static else [
            contract.height_aliases[0], contract.period_aliases[0], contract.direction_aliases[0]
        ],
        "minimum_longitude": longitude,
        "maximum_longitude": longitude,
        "minimum_latitude": latitude,
        "maximum_latitude": latitude,
        "coordinates_selection_method": "nearest",
        "file_format": "netcdf",
        "service": "geoseries",
        "disable_progress_bar": True,
        "raise_if_updating": True,
    }
    if static:
        common["dataset_part"] = "bathy"
    else:
        hours = expected_hours(target_hour)
        common["start_datetime"] = hours[0]
        common["end_datetime"] = hours[-1]
    return common


def size_bucket(total_mib: float, execution_ok: bool) -> str:
    if not execution_ok or total_mib > MAX_DRY_RUN_MIB_PER_PRODUCT:
        return "over-cap-or-unavailable"
    if total_mib <= 1.0:
        return "at-most-1-mib"
    if total_mib <= 4.0:
        return "at-most-4-mib"
    return "at-most-8-mib"


def fixture_file(directory: Path, product_key: str, kind: str, index: int) -> Path:
    path = directory / f"{product_key}-{kind}-{index:03d}.nc"
    if not path.is_file() or path.stat().st_size <= 0:
        raise PilotError("FIXTURE_FILE_MISSING")
    return path


def acquire_product_files(
    contract: ProductContract,
    targets: list[dict[str, Any]],
    target_hour: datetime,
    temporary: Path,
    fixture_directory: Path | None,
    fixture_dry_run_mib: float,
) -> tuple[list[tuple[Path, Path]], float, int, list[str]]:
    dry_run_total = 0.0
    plans: list[tuple[dict[str, Any], dict[str, Any]]] = []
    for target in targets:
        static_request = request_kwargs(contract, target, target_hour, static=True)
        dynamic_request = request_kwargs(contract, target, target_hour, static=False)
        plans.append((static_request, dynamic_request))
        if fixture_directory:
            dry_run_total += 2 * fixture_dry_run_mib
        else:
            for request in (static_request, dynamic_request):
                response = safe_subset(**request, dry_run=True)
                dry_run_total += response_transfer_mib(response)
        if dry_run_total > MAX_DRY_RUN_MIB_PER_PRODUCT:
            raise PilotError("DRY_RUN_SIZE_CAP_EXCEEDED")

    result: list[tuple[Path, Path]] = []
    total_bytes = 0
    subset_hashes: list[str] = []
    for index, (static_request, dynamic_request) in enumerate(plans):
        paths: list[Path] = []
        for kind, request in (("static", static_request), ("dynamic", dynamic_request)):
            output_name = f"{contract.key}-{kind}-{index:03d}.nc"
            destination = temporary / output_name
            if fixture_directory:
                shutil.copy2(fixture_file(fixture_directory, contract.key, kind, index), destination)
            else:
                response = safe_subset(
                    **request,
                    output_filename=output_name,
                    output_directory=temporary,
                    overwrite=True,
                    netcdf_compression_level=1,
                )
                destination = Path(response.file_path)
            try:
                resolved = destination.resolve(strict=True)
            except OSError as error:
                raise PilotError("SUBSET_FILE_MISSING") from error
            if resolved.parent != temporary.resolve() or resolved.stat().st_size <= 0:
                raise PilotError("SUBSET_FILE_PATH_INVALID")
            total_bytes += resolved.stat().st_size
            if total_bytes > MAX_DOWNLOADED_BYTES_PER_PRODUCT:
                raise PilotError("DOWNLOADED_SIZE_CAP_EXCEEDED")
            subset_hashes.append(file_sha256(resolved))
            paths.append(resolved)
        result.append((paths[0], paths[1]))
    return result, dry_run_total, total_bytes, subset_hashes


def empty_product_result(contract: ProductContract, expected_count: int) -> dict[str, Any]:
    return {
        "contractSha256": contract_hash(contract),
        "evidenceSha256": sha256_json([]),
        "expectedPartCount": expected_count,
        "testedPartCount": 0,
        "wetPartCount": 0,
        "completePartCount": 0,
        "sourceQueriesSucceeded": False,
        "allNearestCellsWithinBound": False,
        "allStaticAndDynamicCellsMatch": False,
        "allHourlyTuplesComplete": False,
        "singleBulletinVerified": False,
        "exactHourlyWindowVerified": False,
        "oneCellRunTupleVerified": False,
        "candidateAccepted": False,
        "sizeBucket": "over-cap-or-unavailable",
    }


def evaluate_product(
    contract: ProductContract,
    targets: list[dict[str, Any]],
    target_hour: datetime,
    temporary: Path,
    fixture_directory: Path | None,
    fixture_dry_run_mib: float,
) -> dict[str, Any]:
    result = empty_product_result(contract, len(targets))
    try:
        files, estimated_mib, downloaded_bytes, subset_hashes = acquire_product_files(
            contract, targets, target_hour, temporary, fixture_directory, fixture_dry_run_mib
        )
    except PilotError:
        return result
    expected = expected_hours(target_hour)
    inspections: list[dict[str, Any]] = []
    for target, (static_path, dynamic_path) in zip(targets, files):
        result["testedPartCount"] += 1
        try:
            result["wetPartCount"] += int(inspect_static_wet(static_path, target))
        except (PilotError, OSError, ValueError, TypeError):
            pass
        try:
            inspection = inspect_pair(
                static_path, dynamic_path, target, contract, target_hour, expected
            )
        except (PilotError, OSError, ValueError, TypeError):
            continue
        inspections.append(inspection)
        result["completePartCount"] += int(inspection["complete"])

    runs = {value["run"] for value in inspections}
    all_tested = result["testedPartCount"] == len(targets)
    all_inspected = len(inspections) == len(targets)
    result.update({
        "sourceQueriesSucceeded": True,
        "allNearestCellsWithinBound": all_inspected and all(value["withinBound"] for value in inspections),
        "allStaticAndDynamicCellsMatch": all_inspected and all(value["sameCell"] for value in inspections),
        "allHourlyTuplesComplete": all_inspected and all(value["tupleComplete"] for value in inspections),
        "singleBulletinVerified": all_inspected and len(runs) == 1,
        "exactHourlyWindowVerified": all_inspected,
        "oneCellRunTupleVerified": all_inspected and all(
            value["sameCell"] and value["tupleComplete"] for value in inspections
        ),
        "sizeBucket": size_bucket(estimated_mib, True),
    })
    result["candidateAccepted"] = bool(
        all_tested
        and result["wetPartCount"] == len(targets)
        and result["completePartCount"] == len(targets)
        and result["allNearestCellsWithinBound"]
        and result["allStaticAndDynamicCellsMatch"]
        and result["allHourlyTuplesComplete"]
        and result["singleBulletinVerified"]
        and result["exactHourlyWindowVerified"]
        and result["oneCellRunTupleVerified"]
    )
    result["evidenceSha256"] = sha256_json({
        "subsets": subset_hashes,
        "cells": [value["cellHash"] for value in inspections],
        "runs": [sha256_text(value["run"].isoformat()) for value in inspections],
        "downloadedBytes": downloaded_bytes,
        "accepted": result["candidateAccepted"],
    })
    return result


PRODUCT_KEYS = {
    "contractSha256", "evidenceSha256", "expectedPartCount", "testedPartCount",
    "wetPartCount", "completePartCount", "sourceQueriesSucceeded",
    "allNearestCellsWithinBound", "allStaticAndDynamicCellsMatch",
    "allHourlyTuplesComplete", "singleBulletinVerified", "exactHourlyWindowVerified",
    "oneCellRunTupleVerified", "candidateAccepted", "sizeBucket",
}
TOP_LEVEL_KEYS = {
    "schemaVersion", "pilotExecutionComplete", "scoreImpact", "publicRuntime",
    "productionSourceChanged", "modelContractChanged", "geometryChanged", "pointsChanged",
    "coordinateValuesStored", "rawWeatherValuesStored", "rawDirectionValuesStored",
    "credentialsStored", "rawNetcdfStored", "temporaryFilesRemoved",
    "targetRegistryContractSha256", "timeWindowContractSha256", "products",
}
ALLOWED_ENUMS = {
    "at-most-1-mib", "at-most-4-mib", "at-most-8-mib", "over-cap-or-unavailable"
}


def validate_safe_report(report: dict[str, Any]) -> None:
    if set(report) != TOP_LEVEL_KEYS or set(report.get("products") or {}) != {"nws", "baltic"}:
        raise PilotError("REPORT_SCHEMA_INVALID")
    for product in report["products"].values():
        if set(product) != PRODUCT_KEYS:
            raise PilotError("REPORT_PRODUCT_SCHEMA_INVALID")
    forbidden_false_flags = (
        "scoreImpact", "publicRuntime", "productionSourceChanged", "modelContractChanged",
        "geometryChanged", "pointsChanged", "coordinateValuesStored", "rawWeatherValuesStored",
        "rawDirectionValuesStored", "credentialsStored", "rawNetcdfStored",
    )
    if any(report[name] is not False for name in forbidden_false_flags):
        raise PilotError("REPORT_ISOLATION_INVALID")

    def inspect(value: Any) -> None:
        if isinstance(value, dict):
            for child in value.values():
                inspect(child)
        elif isinstance(value, list):
            for child in value:
                inspect(child)
        elif isinstance(value, str):
            if value in ALLOWED_ENUMS:
                return
            if not value.startswith("sha256:") or len(value) != 71:
                raise PilotError("REPORT_STRING_NOT_HASH_OR_ENUM")
        elif not isinstance(value, (bool, int, float)) or isinstance(value, complex):
            raise PilotError("REPORT_VALUE_TYPE_INVALID")

    inspect(report)
    serialized = json.dumps(report, ensure_ascii=False, sort_keys=True)
    for name in ("COPERNICUSMARINE_SERVICE_USERNAME", "COPERNICUSMARINE_SERVICE_PASSWORD"):
        secret = os.getenv(name, "")
        if secret and secret in serialized:
            raise PilotError("REPORT_CREDENTIAL_LEAK")


def atomic_write(path: Path, text: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary = path.with_name(path.name + ".tmp")
    try:
        with temporary.open("w", encoding="utf-8", newline="\n") as handle:
            handle.write(text)
            handle.flush()
            os.fsync(handle.fileno())
        os.replace(temporary, path)
    finally:
        if temporary.exists():
            temporary.unlink()


def build_report(args: argparse.Namespace) -> dict[str, Any]:
    target_hour = parse_hour(args.target_hour)
    targets, registry_count = load_zone_targets(args.targets)
    if args.fixture_dry_run_mib < 0 or not math.isfinite(args.fixture_dry_run_mib):
        raise PilotError("FIXTURE_DRY_RUN_SIZE_INVALID")
    if not args.fixture_directory and (
        not os.getenv("COPERNICUSMARINE_SERVICE_USERNAME")
        or not os.getenv("COPERNICUSMARINE_SERVICE_PASSWORD")
    ):
        raise PilotError("COPERNICUS_CREDENTIALS_MISSING")

    temporary = Path(tempfile.mkdtemp(prefix="ravradar-feggesund-wave-pilot-"))
    products: dict[str, Any] = {}
    removed = False
    try:
        for contract in PRODUCTS:
            product_directory = temporary / contract.key
            product_directory.mkdir(parents=True, exist_ok=False)
            products[contract.key] = evaluate_product(
                contract,
                targets,
                target_hour,
                product_directory,
                args.fixture_directory,
                args.fixture_dry_run_mib,
            )
    finally:
        shutil.rmtree(temporary, ignore_errors=False)
        removed = not temporary.exists()
    execution_complete = all(value["sourceQueriesSucceeded"] for value in products.values())
    report = {
        "schemaVersion": 1,
        "pilotExecutionComplete": execution_complete,
        "scoreImpact": False,
        "publicRuntime": False,
        "productionSourceChanged": False,
        "modelContractChanged": False,
        "geometryChanged": False,
        "pointsChanged": False,
        "coordinateValuesStored": False,
        "rawWeatherValuesStored": False,
        "rawDirectionValuesStored": False,
        "credentialsStored": False,
        "rawNetcdfStored": False,
        "temporaryFilesRemoved": removed,
        "targetRegistryContractSha256": sha256_json({
            "registryPartCount": registry_count,
            "affectedPartCount": len(targets),
            "affectedTargets": target_fingerprint(targets),
        }),
        "timeWindowContractSha256": sha256_json({
            "targetHour": target_hour.isoformat(),
            "pastHours": WINDOW_PAST_HOURS,
            "futureHours": WINDOW_FUTURE_HOURS,
            "requiredHours": REQUIRED_HOUR_COUNT,
        }),
        "products": products,
    }
    validate_safe_report(report)
    return report


def main() -> int:
    args = arguments()
    for path in (args.output, args.summary):
        try:
            path.unlink(missing_ok=True)
        except OSError:
            pass
    try:
        report = build_report(args)
        text = json.dumps(report, ensure_ascii=False, sort_keys=True, separators=(",", ":")) + "\n"
        atomic_write(args.output, text)
        atomic_write(args.summary, json.dumps(report, ensure_ascii=False, indent=2, sort_keys=True) + "\n")
        print(json.dumps({
            "pilotExecutionComplete": report["pilotExecutionComplete"],
            "candidateCount": sum(
                int(value["candidateAccepted"]) for value in report["products"].values()
            ),
        }, sort_keys=True))
        return 0 if report["pilotExecutionComplete"] else 2
    except PilotError as error:
        print(json.dumps({"pilotExecutionComplete": False, "errorCodeSha256": sha256_text(str(error))}))
        return 2
    except Exception as error:
        # Never permit a third-party/parser exception to print a request, path,
        # coordinate or payload through Python's default traceback.
        print(json.dumps({
            "pilotExecutionComplete": False,
            "errorCodeSha256": sha256_text("UNEXPECTED_" + type(error).__name__),
        }))
        return 2


if __name__ == "__main__":
    raise SystemExit(main())
