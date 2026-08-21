#!/usr/bin/env python3
"""Enrich selected private wave windows with coordinate-free current and sea-level features."""
from __future__ import annotations

import argparse
from bisect import bisect_left
import json
import math
import os
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any

import copernicusmarine
import numpy as np
import xarray as xr

from lib.copernicus_current import haversine_km, load_targets


ROOT = Path(__file__).resolve().parents[1]
DEFAULT_WAVE_INPUT = ROOT / ".cache/ravscore-historical-wave-features.json"
DEFAULT_TARGETS = ROOT / "data/live/coastal-parts-v2.json"
DEFAULT_OUTPUT = ROOT / ".cache/ravscore-historical-forcing-features.json"
DEFAULT_SUMMARY = ROOT / ".cache/ravscore-historical-forcing-features.txt"
WINDOW_BEFORE_HOURS = 24
WINDOW_AFTER_HOURS = 72
EXPECTED_WINDOWS = 12
MINIMUM_EVENT_SAMPLES = 24

PRODUCTS = {
    "nws": {
        "source": "copernicus-nws-physics-reanalysis",
        "productId": "NWSHELF_MULTIYEAR_PHY_004_009",
        "currentDatasetId": "cmems_mod_nws_phy-uv_my_7km-2D_PT1H-i",
        "seaLevelDatasetId": "cmems_mod_nws_phy-ssh_my_7km-2D_PT1H-i",
        "minimumLongitude": -16.0,
        "maximumLongitude": 13.0,
        "minimumLatitude": 46.0,
        "maximumLatitude": 63.0,
        "maximumTimeOffsetMinutes": 0.0,
        "longitudePadding": 0.15,
        "latitudePadding": 0.10,
        "maximumGridDistanceKm": 12.0,
    },
    "baltic": {
        "source": "copernicus-baltic-physics-analysis-forecast",
        "productId": "BALTICSEA_ANALYSISFORECAST_PHY_003_006",
        "currentDatasetId": "cmems_mod_bal_phy_anfc_PT1H-i",
        "seaLevelDatasetId": "cmems_mod_bal_phy_anfc_PT1H-i",
        "minimumLongitude": 9.01,
        "maximumLongitude": 30.21,
        "minimumLatitude": 53.01,
        "maximumLatitude": 65.91,
        "maximumTimeOffsetMinutes": 0.0,
        "longitudePadding": 0.05,
        "latitudePadding": 0.04,
        "maximumGridDistanceKm": 5.0,
    },
}

VARIABLES = {
    "u": ("uo", "eastward_sea_water_velocity"),
    "v": ("vo", "northward_sea_water_velocity"),
    "seaLevel": ("zos", "sla", "ssh", "sea_surface_height_above_geoid"),
}

FORBIDDEN_OUTPUT_KEYS = {
    "u", "v", "uo", "vo", "umps", "vmps", "longitude", "latitude", "lon", "lat",
    "samplingpoint", "gridpoint", "geometry", "coordinates", "waterpoint", "landpoint",
    "password", "username", "service_password", "service_username",
}


def arguments() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--wave-input", type=Path, default=DEFAULT_WAVE_INPUT)
    parser.add_argument("--targets", type=Path, default=DEFAULT_TARGETS)
    parser.add_argument("--output", type=Path, default=DEFAULT_OUTPUT)
    parser.add_argument("--summary", type=Path, default=DEFAULT_SUMMARY)
    parser.add_argument("--fixture-directory", type=Path)
    return parser.parse_args()


def utc(value: Any) -> datetime:
    parsed = datetime.fromisoformat(str(value).replace("Z", "+00:00"))
    if parsed.tzinfo is None:
        raise ValueError("Historical forcing timestamps must include a timezone")
    return parsed.astimezone(timezone.utc)


def iso(value: datetime) -> str:
    return value.astimezone(timezone.utc).isoformat().replace("+00:00", "Z")


def time_text(value: Any) -> str:
    timestamp = np.datetime_as_string(np.datetime64(value), unit="s")
    return timestamp if timestamp.endswith("Z") else f"{timestamp}Z"


def coordinate_name(dataset: xr.Dataset, aliases: tuple[str, ...]) -> str:
    for name in aliases:
        if name in dataset.coords or name in dataset.variables:
            return name
    raise RuntimeError(f"Historical physics subset lacks coordinate aliases: {', '.join(aliases)}")


def variable_name(dataset: xr.Dataset, aliases: tuple[str, ...]) -> str:
    for name in aliases:
        if name in dataset.variables:
            return name
    raise RuntimeError(f"Historical physics subset lacks variable aliases: {', '.join(aliases)}")


def spatial_candidates(
    dataset: xr.Dataset, target: dict[str, Any], maximum_distance_km: float
) -> list[tuple[dict[str, int], float]]:
    longitude_name = coordinate_name(dataset, ("longitude", "lon"))
    latitude_name = coordinate_name(dataset, ("latitude", "lat"))
    longitude = dataset[longitude_name]
    latitude = dataset[latitude_name]
    target_longitude, target_latitude = (float(value) for value in target["waterPoint"])
    candidates: list[tuple[dict[str, int], float]] = []
    if longitude.ndim == latitude.ndim == 1 and longitude.dims != latitude.dims:
        for lat_index, latitude_value in enumerate(np.asarray(latitude.values, dtype=float)):
            for lon_index, longitude_value in enumerate(np.asarray(longitude.values, dtype=float)):
                grid_point = [float(longitude_value), float(latitude_value)]
                distance = haversine_km(target["waterPoint"], grid_point)
                if distance <= maximum_distance_km + 1e-9:
                    candidates.append((
                        {longitude.dims[0]: lon_index, latitude.dims[0]: lat_index}, round(distance, 3)
                    ))
    else:
        lon_values, lat_values = np.broadcast_arrays(
            np.asarray(longitude.values, dtype=float), np.asarray(latitude.values, dtype=float)
        )
        dims = longitude.dims if longitude.ndim >= latitude.ndim else latitude.dims
        for indexes in np.ndindex(lon_values.shape):
            grid_point = [float(lon_values[indexes]), float(lat_values[indexes])]
            distance = haversine_km(target["waterPoint"], grid_point)
            if distance <= maximum_distance_km + 1e-9:
                candidates.append((
                    {dimension: int(indexes[position]) for position, dimension in enumerate(dims)},
                    round(distance, 3),
                ))
    candidates.sort(key=lambda row: row[1])
    if not candidates:
        raise RuntimeError(
            f"Historical physics has no model cell within {maximum_distance_km:g} km for {target['partId']}"
        )
    return candidates


def series(dataset: xr.Dataset, name: str, selection: dict[str, int], time_name: str) -> xr.DataArray:
    array = dataset[name].isel({dimension: index for dimension, index in selection.items() if dimension in dataset[name].dims})
    for dimension in tuple(array.dims):
        if dimension != time_name:
            array = array.isel({dimension: 0})
    if time_name not in array.dims:
        raise RuntimeError(f"Historical physics variable {name} has no time dimension")
    return array.transpose(time_name)


def nearest_finite_selection(
    dataset: xr.Dataset,
    target: dict[str, Any],
    variable_names: tuple[str, ...],
    maximum_distance_km: float,
) -> tuple[dict[str, int], float]:
    time_name = coordinate_name(dataset, ("time", "valid_time"))
    for selection, distance_km in spatial_candidates(dataset, target, maximum_distance_km):
        shared: np.ndarray | None = None
        for name in variable_names:
            finite = np.isfinite(np.asarray(series(dataset, name, selection, time_name).values, dtype=float))
            shared = finite if shared is None else shared & finite
        if shared is not None and int(np.count_nonzero(shared)) >= MINIMUM_EVENT_SAMPLES:
            return selection, distance_km
    raise RuntimeError(
        f"Historical physics has no sufficiently covered wet model cell within "
        f"{maximum_distance_km:g} km for {target['partId']}"
    )


def indexed_series(
    dataset: xr.Dataset, name: str, selection: dict[str, int]
) -> tuple[list[datetime], list[float]]:
    time_name = coordinate_name(dataset, ("time", "valid_time"))
    values = np.asarray(series(dataset, name, selection, time_name).values, dtype=float)
    times = [utc(time_text(value)) for value in dataset[time_name].values]
    if len(times) != len(values) or len(times) != len(set(times)):
        raise RuntimeError("Historical physics subset has mismatched or duplicate times")
    ordered = sorted(zip(times, (float(value) for value in values)), key=lambda row: row[0])
    return [row[0] for row in ordered], [row[1] for row in ordered]


def nearest_value(
    indexed: tuple[list[datetime], list[float]],
    target_time: datetime,
    maximum_offset_minutes: float,
) -> tuple[datetime, float, float] | None:
    times, values = indexed
    position = bisect_left(times, target_time)
    indexes = [index for index in (position - 1, position) if 0 <= index < len(times)]
    if not indexes:
        return None
    selected = min(indexes, key=lambda index: (abs((times[index] - target_time).total_seconds()), times[index]))
    offset_minutes = abs((times[selected] - target_time).total_seconds()) / 60.0
    value = values[selected]
    if offset_minutes > maximum_offset_minutes + 1e-9 or not math.isfinite(value):
        return None
    return times[selected], value, offset_minutes


def raw_onshore_directions(path: Path) -> dict[str, float]:
    document = json.loads(path.read_text(encoding="utf-8"))
    rows: list[dict[str, Any]] = []
    for value in (document.get("zones") or {}).values():
        if isinstance(value, list):
            rows.extend(row for row in value if isinstance(row, dict))
        elif isinstance(value, dict):
            rows.extend(row for row in (value.get("parts") or []) if isinstance(row, dict))
    return {
        str(row.get("partId") or ""): float(row["onshoreDirectionDeg"]) % 360.0
        for row in rows
        if isinstance(row.get("onshoreDirectionDeg"), (int, float))
        and math.isfinite(float(row["onshoreDirectionDeg"]))
    }


def selected_targets(path: Path, part_ids: set[str]) -> dict[str, dict[str, Any]]:
    directions = raw_onshore_directions(path)
    targets = {str(row["partId"]): row for row in load_targets(path) if str(row["partId"]) in part_ids}
    missing = sorted(part_ids - set(targets))
    if missing:
        raise RuntimeError("Historical forcing target is missing: " + ", ".join(missing))
    for part_id, target in targets.items():
        if part_id not in directions:
            raise RuntimeError(f"Historical forcing target lacks onshore direction: {part_id}")
        target["onshoreDirectionDeg"] = directions[part_id]
    return targets


def load_wave_document(path: Path) -> dict[str, Any]:
    document = json.loads(path.read_text(encoding="utf-8"))
    if document.get("status") != "OK" or document.get("scoreImpact") is not False:
        raise RuntimeError("Historical wave input is not a passed score-neutral pilot")
    if document.get("coordinateValuesStored") is not False or document.get("rawVectorValuesStored") is not False:
        raise RuntimeError("Historical wave input violates the private derived-feature contract")
    windows = document.get("selectedWaveWindows") or []
    if len(windows) != EXPECTED_WINDOWS:
        raise RuntimeError(f"Historical forcing requires exactly {EXPECTED_WINDOWS} selected wave windows")
    if len({str(row.get("eventId") or "") for row in windows}) != EXPECTED_WINDOWS:
        raise RuntimeError("Historical wave window ids must be non-empty and unique")
    return document


def event_bounds(event: dict[str, Any]) -> tuple[datetime, datetime]:
    peak = utc(event["peakTime"])
    return peak - timedelta(hours=WINDOW_BEFORE_HOURS), peak + timedelta(hours=WINDOW_AFTER_HOURS)


def open_remote_dataset(dataset_id: str, product: dict[str, Any], target: dict[str, Any], start: datetime, end: datetime) -> xr.Dataset:
    longitude, latitude = (float(value) for value in target["waterPoint"])
    return copernicusmarine.open_dataset(
        dataset_id=dataset_id,
        minimum_longitude=max(product["minimumLongitude"], longitude - product["longitudePadding"]),
        maximum_longitude=min(product["maximumLongitude"], longitude + product["longitudePadding"]),
        minimum_latitude=max(product["minimumLatitude"], latitude - product["latitudePadding"]),
        maximum_latitude=min(product["maximumLatitude"], latitude + product["latitudePadding"]),
        start_datetime=start,
        end_datetime=end,
        chunk_size_limit=0,
    )


def fixture_path(directory: Path, target: dict[str, Any]) -> Path:
    path = directory / f"historical-forcing-{target['partId']}.nc"
    if not path.exists():
        raise RuntimeError(f"Missing historical forcing fixture for {target['partId']}")
    return path


def alignment(u_value: float, v_value: float, onshore_direction: float) -> tuple[float, float]:
    speed = math.hypot(u_value, v_value)
    if speed <= 1e-12:
        return 0.0, 0.0
    radians = math.radians(onshore_direction)
    onshore_component = u_value * math.sin(radians) + v_value * math.cos(radians)
    return speed, max(-1.0, min(1.0, onshore_component / speed))


def direction_class(value: float) -> str:
    if value >= 0.2:
        return "onshore"
    if value <= -0.35:
        return "offshore"
    return "alongshore"


def event_class(wave_value: float, current_value: float) -> str:
    wave = direction_class(wave_value)
    current = direction_class(current_value)
    if wave == "onshore" and current == "onshore":
        return "onshore-delivery"
    if wave == "offshore" and current == "offshore":
        return "offshore-removal"
    if {wave, current} == {"onshore", "offshore"}:
        return "conflicting-wave-current"
    return "alongshore-mixed"


def weighted_average(rows: list[dict[str, Any]], field: str, weight_field: str) -> float:
    weights = [max(float(row[weight_field]), 1e-9) for row in rows]
    return sum(float(row[field]) * weight for row, weight in zip(rows, weights)) / sum(weights)


def water_phase(rows: list[dict[str, Any]], peak: datetime) -> str:
    before = [row for row in rows if peak - timedelta(hours=12) <= utc(row["time"]) <= peak]
    after = [row for row in rows if peak <= utc(row["time"]) <= peak + timedelta(hours=18)]
    if not before or not after:
        return "unknown"
    change = float(after[-1]["seaLevelM"]) - float(before[0]["seaLevelM"])
    if change >= 0.08:
        return "rising"
    if change <= -0.08:
        return "falling"
    return "near-level"


def wave_rows_for_event(records: list[dict[str, Any]], event: dict[str, Any]) -> list[dict[str, Any]]:
    start, end = event_bounds(event)
    return sorted(
        (
            row for row in records
            if row.get("partId") == event.get("partId") and start <= utc(row["validTime"]) <= end
        ),
        key=lambda row: row["validTime"],
    )


def event_samples(
    wave_rows: list[dict[str, Any]],
    current_u: tuple[list[datetime], list[float]],
    current_v: tuple[list[datetime], list[float]],
    sea_level: tuple[list[datetime], list[float]],
    onshore_direction: float,
    maximum_time_offset_minutes: float,
) -> list[dict[str, Any]]:
    samples = []
    for row in wave_rows:
        wave_time = utc(row["validTime"])
        u_match = nearest_value(current_u, wave_time, maximum_time_offset_minutes)
        v_match = nearest_value(current_v, wave_time, maximum_time_offset_minutes)
        sea_match = nearest_value(sea_level, wave_time, maximum_time_offset_minutes)
        if not u_match or not v_match or not sea_match or u_match[0] != v_match[0]:
            continue
        speed, current_alignment = alignment(u_match[1], v_match[1], onshore_direction)
        samples.append({
            "time": iso(wave_time),
            "waveHeightM": round(max(0.0, float(row["significantWaveHeightM"])), 3),
            "wavePeriodS": round(max(0.0, float(row["peakPeriodS"])), 2),
            "waveOnshoreAlignment": round(max(-1.0, min(1.0, float(row["waveOnshoreAlignment"]))), 4),
            "currentSpeedMps": round(speed, 4),
            "currentOnshoreAlignment": round(current_alignment, 4),
            "seaLevelM": round(sea_match[1], 4),
            "currentTimeOffsetMinutes": round(u_match[2], 2),
            "seaLevelTimeOffsetMinutes": round(sea_match[2], 2),
        })
    return samples


def finite_match_count(
    indexed: tuple[list[datetime], list[float]],
    wave_rows: list[dict[str, Any]],
    maximum_time_offset_minutes: float,
) -> int:
    return sum(
        nearest_value(indexed, utc(row["validTime"]), maximum_time_offset_minutes) is not None
        for row in wave_rows
    )


def summarize_event(event: dict[str, Any], samples: list[dict[str, Any]]) -> dict[str, Any]:
    energy_rows = [{**row, "waveEnergy": row["waveHeightM"] ** 2 * row["wavePeriodS"]} for row in samples]
    wave_alignment = weighted_average(energy_rows, "waveOnshoreAlignment", "waveEnergy")
    current_alignment = weighted_average(energy_rows, "currentOnshoreAlignment", "currentSpeedMps")
    peak = utc(event["peakTime"])
    start, end = event_bounds(event)
    return {
        "eventId": event["eventId"],
        "regionId": event["partId"],
        "peakTime": iso(peak),
        "windowStart": iso(start),
        "windowEnd": iso(end),
        "sampleCount": len(samples),
        "classification": event_class(wave_alignment, current_alignment),
        "waveDirectionClass": direction_class(wave_alignment),
        "currentDirectionClass": direction_class(current_alignment),
        "waterLevelPhase": water_phase(samples, peak),
    }


def reject_sensitive_output(value: Any) -> None:
    if isinstance(value, dict):
        for key, child in value.items():
            if str(key).lower() in FORBIDDEN_OUTPUT_KEYS:
                raise RuntimeError(f"Private historical forcing output contains forbidden field: {key}")
            reject_sensitive_output(child)
    elif isinstance(value, list):
        for child in value:
            reject_sensitive_output(child)


def reject_credentials(document: dict[str, Any]) -> None:
    text = json.dumps(document, ensure_ascii=False).lower()
    for name in ("COPERNICUSMARINE_SERVICE_USERNAME", "COPERNICUSMARINE_SERVICE_PASSWORD"):
        value = os.getenv(name, "")
        if value and value.lower() in text:
            raise RuntimeError("Copernicus credential material reached historical forcing output")


def main() -> int:
    args = arguments()
    wave_document = load_wave_document(args.wave_input)
    windows = list(wave_document["selectedWaveWindows"])
    records = list(wave_document.get("records") or [])
    part_ids = {str(row["partId"]) for row in windows}
    targets = selected_targets(args.targets, part_ids)
    if not args.fixture_directory and (
        not os.getenv("COPERNICUSMARINE_SERVICE_USERNAME")
        or not os.getenv("COPERNICUSMARINE_SERVICE_PASSWORD")
    ):
        raise RuntimeError("Copernicus credentials are required through environment secrets")

    regions = []
    event_catalog = []
    for part_id in sorted(part_ids):
        target = targets[part_id]
        part_windows = [row for row in windows if row["partId"] == part_id]
        basins = {str(row.get("basin") or "") for row in part_windows}
        if len(basins) != 1 or next(iter(basins)) not in PRODUCTS:
            raise RuntimeError(f"Historical forcing window has unsupported basin for {part_id}")
        product = PRODUCTS[next(iter(basins))]
        starts, ends = zip(*(event_bounds(event) for event in part_windows))
        if args.fixture_directory:
            current_dataset = xr.open_dataset(fixture_path(args.fixture_directory, target))
            sea_dataset = xr.open_dataset(fixture_path(args.fixture_directory, target))
        else:
            current_dataset = open_remote_dataset(
                product["currentDatasetId"], product, target, min(starts), max(ends)
            )
            sea_dataset = (
                current_dataset
                if product["seaLevelDatasetId"] == product["currentDatasetId"]
                else open_remote_dataset(product["seaLevelDatasetId"], product, target, min(starts), max(ends))
            )
        try:
            u_name = variable_name(current_dataset, VARIABLES["u"])
            v_name = variable_name(current_dataset, VARIABLES["v"])
            sea_name = variable_name(sea_dataset, VARIABLES["seaLevel"])
            current_selection, current_distance = nearest_finite_selection(
                current_dataset, target, (u_name, v_name), float(product["maximumGridDistanceKm"])
            )
            sea_selection, sea_distance = nearest_finite_selection(
                sea_dataset, target, (sea_name,), float(product["maximumGridDistanceKm"])
            )
            current_u = indexed_series(current_dataset, u_name, current_selection)
            current_v = indexed_series(current_dataset, v_name, current_selection)
            sea_level = indexed_series(sea_dataset, sea_name, sea_selection)
            region_samples: dict[str, dict[str, Any]] = {}
            for event in sorted(part_windows, key=lambda row: row["peakTime"]):
                wave_rows = wave_rows_for_event(records, event)
                samples = event_samples(
                    wave_rows, current_u, current_v, sea_level,
                    float(target["onshoreDirectionDeg"]), float(product["maximumTimeOffsetMinutes"]),
                )
                if len(samples) < MINIMUM_EVENT_SAMPLES:
                    raise RuntimeError(
                        f"Historical forcing event {event['eventId']} has {len(samples)} paired samples; "
                        f"wave={len(wave_rows)}, "
                        f"u={finite_match_count(current_u, wave_rows, product['maximumTimeOffsetMinutes'])}, "
                        f"v={finite_match_count(current_v, wave_rows, product['maximumTimeOffsetMinutes'])}, "
                        f"sea={finite_match_count(sea_level, wave_rows, product['maximumTimeOffsetMinutes'])}, "
                        f"currentGridDistanceKm={current_distance}, seaLevelGridDistanceKm={sea_distance}, "
                        f"maximumTimeOffsetMinutes={product['maximumTimeOffsetMinutes']}"
                    )
                event_catalog.append(summarize_event(event, samples))
                for sample in samples:
                    region_samples[sample["time"]] = sample
            regions.append({
                "regionId": part_id,
                "sourceProductIds": sorted({
                    product["productId"], product["currentDatasetId"], product["seaLevelDatasetId"]
                }),
                "eventWindowCount": len(part_windows),
                "sampleCount": len(region_samples),
                "currentGridDistanceKm": current_distance,
                "seaLevelGridDistanceKm": sea_distance,
                "maximumCurrentTimeOffsetMinutes": max(
                    sample["currentTimeOffsetMinutes"] for sample in region_samples.values()
                ),
                "maximumSeaLevelTimeOffsetMinutes": max(
                    sample["seaLevelTimeOffsetMinutes"] for sample in region_samples.values()
                ),
                "samples": [region_samples[key] for key in sorted(region_samples)],
            })
        finally:
            if sea_dataset is not current_dataset:
                sea_dataset.close()
            current_dataset.close()

    if len(event_catalog) != EXPECTED_WINDOWS or len(regions) != len(part_ids):
        raise RuntimeError("Historical forcing did not preserve all selected windows and sentinel regions")
    document = {
        "schemaVersion": "1.0.0",
        "status": "OK",
        "generatedAt": iso(datetime.now(timezone.utc)),
        "method": "wave-selected-96-hour-current-and-sea-level-enrichment",
        "windowBeforeHours": WINDOW_BEFORE_HOURS,
        "windowAfterHours": WINDOW_AFTER_HOURS,
        "timePairingMethod": "nearest-provider-time-with-explicit-product-bound-no-interpolation",
        "selectedWaveWindowCount": len(windows),
        "enrichedEventCount": len(event_catalog),
        "regionCount": len(regions),
        "sampleCount": sum(region["sampleCount"] for region in regions),
        "eventClassificationCounts": {
            classification: sum(event["classification"] == classification for event in event_catalog)
            for classification in (
                "onshore-delivery", "offshore-removal", "conflicting-wave-current", "alongshore-mixed"
            )
        },
        "eventCatalog": sorted(event_catalog, key=lambda row: (row["peakTime"], row["regionId"])),
        "regions": regions,
        "privateDerivedWeatherFeaturesStored": True,
        "rawUvStored": False,
        "coordinateValuesStored": False,
        "rawNetcdfStored": False,
        "rawWeatherSeriesStored": False,
        "scoreImpact": False,
        "publicRuntime": False,
        "productionGeometryChanged": False,
        "dmiFallbackChanged": False,
        "automaticActivationAllowed": False,
    }
    reject_sensitive_output(document)
    reject_credentials(document)
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(document, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    args.summary.parent.mkdir(parents=True, exist_ok=True)
    args.summary.write_text(
        "Historical RavScore forcing pilot: OK\n"
        f"Regions: {document['regionCount']}\nEvents: {document['enrichedEventCount']}\n"
        f"Derived samples: {document['sampleCount']}\n"
        f"Classes: {json.dumps(document['eventClassificationCounts'], sort_keys=True)}\n"
        "Coordinates stored: no\nRaw U/V stored: no\nScore impact: no\nDMI fallback changed: no\n",
        encoding="utf-8",
    )
    print(
        f"Historical forcing pilot: {document['enrichedEventCount']} events across "
        f"{document['regionCount']} regions and {document['sampleCount']} derived samples. "
        "Score/DMI/geometri ændret: nej."
    )
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except Exception as error:
        print(f"Historical forcing pilot failed: {error}")
        raise SystemExit(1)
