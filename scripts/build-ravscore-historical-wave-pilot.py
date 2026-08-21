#!/usr/bin/env python3
"""Build a private, coordinate-free historical wave feature pilot."""
from __future__ import annotations

import argparse
import hashlib
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
DEFAULT_TARGETS = ROOT / "data/live/coastal-parts-v2.json"
DEFAULT_OUTPUT = ROOT / ".cache/ravscore-historical-wave-features.json"
DEFAULT_SUMMARY = ROOT / ".cache/ravscore-historical-wave-features.txt"
MAX_RANGE_DAYS = 366

SENTINELS = {
    "dk-b03-07-national-part-01": "nws",
    "dk-b01-16-national-part-01": "baltic",
    "dk-b07-19-fallback-recovery-01": "baltic",
    "dk-b10-21-national-part-01": "baltic",
}

PRODUCTS = {
    "nws": {
        "source": "copernicus-nws-wave-reanalysis",
        "productId": "NWSHELF_REANALYSIS_WAV_004_015",
        "datasetId": "MetO-NWS-WAV-RAN",
        "minimumLongitude": -16.0,
        "maximumLongitude": 13.0,
        "minimumLatitude": 46.0,
        "maximumLatitude": 63.0,
    },
    "baltic": {
        "source": "copernicus-baltic-wave-hindcast",
        "productId": "BALTICSEA_MULTIYEAR_WAV_003_015",
        "datasetId": "cmems_mod_bal_wav_my_PT1H-i",
        "minimumLongitude": 9.01,
        "maximumLongitude": 30.21,
        "minimumLatitude": 53.01,
        "maximumLatitude": 65.91,
    },
}

VARIABLES = {
    "significantWaveHeightM": ("VHM0", "significant_wave_height", "hs"),
    "waveFromDirectionDeg": ("VMDR", "mean_wave_direction", "mwd"),
    "peakPeriodS": ("VTPK", "peak_wave_period", "tp"),
}

FORBIDDEN_OUTPUT_KEYS = {
    "longitude", "latitude", "lon", "lat", "samplingpoint", "gridpoint",
    "geometry", "coordinates", "waterpoint", "landpoint", "umps", "vmps", "uo", "vo",
    "password", "username", "service_password", "service_username",
}


def arguments() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--targets", type=Path, default=DEFAULT_TARGETS)
    parser.add_argument("--output", type=Path, default=DEFAULT_OUTPUT)
    parser.add_argument("--summary", type=Path, default=DEFAULT_SUMMARY)
    parser.add_argument("--year", type=int, default=2024)
    parser.add_argument("--start")
    parser.add_argument("--end")
    parser.add_argument("--fixture-directory", type=Path)
    return parser.parse_args()


def utc(value: str) -> datetime:
    parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
    if parsed.tzinfo is None:
        raise ValueError("Historical pilot timestamps must include a timezone")
    return parsed.astimezone(timezone.utc)


def selected_range(args: argparse.Namespace) -> tuple[datetime, datetime]:
    if bool(args.start) != bool(args.end):
        raise ValueError("Both --start and --end are required together")
    if args.start:
        start, end = utc(args.start), utc(args.end)
    else:
        if args.year < 1993 or args.year > datetime.now(timezone.utc).year:
            raise ValueError("Historical pilot year must be between 1993 and the current year")
        start = datetime(args.year, 1, 1, tzinfo=timezone.utc)
        end = datetime(args.year, 12, 31, 23, 59, 59, tzinfo=timezone.utc)
    if end < start or end - start > timedelta(days=MAX_RANGE_DAYS):
        raise ValueError("Historical pilot range must be positive and no longer than 366 days")
    return start, end


def iso(value: datetime) -> str:
    return value.astimezone(timezone.utc).isoformat().replace("+00:00", "Z")


def selected_targets(path: Path) -> list[dict[str, Any]]:
    targets = load_targets(path)
    by_id = {str(row["partId"]): row for row in targets}
    raw_document = json.loads(path.read_text(encoding="utf-8"))
    raw_rows = []
    for value in (raw_document.get("zones") or {}).values():
        if isinstance(value, list):
            raw_rows.extend(value)
        elif isinstance(value, dict):
            raw_rows.extend(value.get("parts") or [])
    onshore_by_id = {
        str(row.get("partId") or ""): row.get("onshoreDirectionDeg")
        for row in raw_rows if isinstance(row, dict)
    }
    missing = sorted(set(SENTINELS) - set(by_id))
    if missing:
        raise RuntimeError(f"Historical sentinel is missing from authoritative geometry: {', '.join(missing)}")
    selected = []
    for part_id, product_key in SENTINELS.items():
        target = by_id[part_id]
        point = target.get("waterPoint")
        if not isinstance(point, list) or len(point) != 2 or not all(isinstance(value, (int, float)) for value in point):
            raise RuntimeError(f"Historical sentinel has no valid water point: {part_id}")
        product = PRODUCTS[product_key]
        if not (
            product["minimumLongitude"] <= float(point[0]) <= product["maximumLongitude"]
            and product["minimumLatitude"] <= float(point[1]) <= product["maximumLatitude"]
        ):
            raise RuntimeError(f"Historical sentinel lies outside its research product: {part_id}")
        onshore_direction = onshore_by_id.get(part_id)
        if not isinstance(onshore_direction, (int, float)) or not math.isfinite(float(onshore_direction)):
            raise RuntimeError(f"Historical sentinel has no valid onshore direction: {part_id}")
        selected.append({
            **target,
            "onshoreDirectionDeg": float(onshore_direction) % 360.0,
            "historicalProductKey": product_key,
        })
    return selected


def open_remote_dataset(
    product: dict[str, Any], target: dict[str, Any], start: datetime, end: datetime
) -> xr.Dataset:
    longitude, latitude = (float(value) for value in target["waterPoint"])
    return copernicusmarine.open_dataset(
        dataset_id=product["datasetId"],
        variables=[aliases[0] for aliases in VARIABLES.values()],
        minimum_longitude=max(product["minimumLongitude"], longitude - 0.035),
        maximum_longitude=min(product["maximumLongitude"], longitude + 0.035),
        minimum_latitude=max(product["minimumLatitude"], latitude - 0.025),
        maximum_latitude=min(product["maximumLatitude"], latitude + 0.025),
        start_datetime=start,
        end_datetime=end,
        chunk_size_limit=0,
    )


def fixture_path(directory: Path, product: dict[str, Any], target: dict[str, Any]) -> Path:
    path = directory / f"{product['source']}-{target['partId']}.nc"
    if not path.exists():
        raise RuntimeError(f"Missing historical wave fixture for {target['partId']}")
    return path


def variable_name(dataset: xr.Dataset, aliases: tuple[str, ...]) -> str:
    for name in aliases:
        if name in dataset.variables:
            return name
    raise RuntimeError(f"Historical wave subset lacks required variable aliases: {', '.join(aliases)}")


def coordinate_name(dataset: xr.Dataset, aliases: tuple[str, ...]) -> str:
    for name in aliases:
        if name in dataset.coords or name in dataset.variables:
            return name
    raise RuntimeError(f"Historical wave subset lacks coordinate aliases: {', '.join(aliases)}")


def nearest_selection(dataset: xr.Dataset, target: dict[str, Any]) -> tuple[dict[str, int], float]:
    longitude_name = coordinate_name(dataset, ("longitude", "lon"))
    latitude_name = coordinate_name(dataset, ("latitude", "lat"))
    longitude = dataset[longitude_name]
    latitude = dataset[latitude_name]
    target_longitude, target_latitude = (float(value) for value in target["waterPoint"])

    if longitude.ndim == latitude.ndim == 1 and longitude.dims != latitude.dims:
        lon_index = int(np.nanargmin(np.abs(np.asarray(longitude.values, dtype=float) - target_longitude)))
        lat_index = int(np.nanargmin(np.abs(np.asarray(latitude.values, dtype=float) - target_latitude)))
        selection = {longitude.dims[0]: lon_index, latitude.dims[0]: lat_index}
        grid_point = [float(longitude.values[lon_index]), float(latitude.values[lat_index])]
    else:
        lon_values, lat_values = np.broadcast_arrays(
            np.asarray(longitude.values, dtype=float), np.asarray(latitude.values, dtype=float)
        )
        scale = max(0.1, math.cos(math.radians(target_latitude)))
        distances = ((lon_values - target_longitude) * scale) ** 2 + (lat_values - target_latitude) ** 2
        flat_index = int(np.nanargmin(distances))
        indexes = np.unravel_index(flat_index, distances.shape)
        dims = longitude.dims if longitude.ndim >= latitude.ndim else latitude.dims
        selection = {dimension: int(indexes[position]) for position, dimension in enumerate(dims)}
        grid_point = [float(lon_values[indexes]), float(lat_values[indexes])]
    return selection, round(haversine_km(target["waterPoint"], grid_point), 3)


def series(dataset: xr.Dataset, name: str, selection: dict[str, int], time_name: str) -> xr.DataArray:
    array = dataset[name].isel({dimension: index for dimension, index in selection.items() if dimension in dataset[name].dims})
    for dimension in tuple(array.dims):
        if dimension != time_name:
            array = array.isel({dimension: 0})
    if time_name not in array.dims:
        raise RuntimeError(f"Historical wave variable {name} has no time dimension")
    return array.transpose(time_name)


def time_text(value: Any) -> str:
    timestamp = np.datetime_as_string(np.datetime64(value), unit="s")
    return timestamp if timestamp.endswith("Z") else f"{timestamp}Z"


def direction_class(value: float) -> str:
    if value >= 0.2:
        return "onshore"
    if value <= -0.35:
        return "offshore"
    return "alongshore"


def wave_onshore_alignment(wave_from_direction: float, onshore_direction: float) -> float:
    propagation_direction = (wave_from_direction + 180.0) % 360.0
    difference = (propagation_direction - onshore_direction + 180.0) % 360.0 - 180.0
    return math.cos(math.radians(difference))


def extract_records(
    dataset: xr.Dataset,
    target: dict[str, Any],
    product: dict[str, Any],
    start: datetime,
    end: datetime,
) -> list[dict[str, Any]]:
    time_name = coordinate_name(dataset, ("time", "valid_time"))
    selection, distance_km = nearest_selection(dataset, target)
    names = {field: variable_name(dataset, aliases) for field, aliases in VARIABLES.items()}
    arrays = {field: series(dataset, name, selection, time_name) for field, name in names.items()}
    times = dataset[time_name].values
    records = []
    for index, value in enumerate(times):
        valid_time = utc(time_text(value))
        if valid_time < start or valid_time > end:
            continue
        height = float(arrays["significantWaveHeightM"].values[index])
        direction = float(arrays["waveFromDirectionDeg"].values[index])
        period = float(arrays["peakPeriodS"].values[index])
        if not all(math.isfinite(item) for item in (height, direction, period)):
            continue
        alignment = wave_onshore_alignment(direction, float(target["onshoreDirectionDeg"]))
        records.append({
            "partId": target["partId"],
            "sourceZoneId": target["parentZoneId"],
            "name": target["name"],
            "basin": target["historicalProductKey"],
            "source": product["source"],
            "productId": product["productId"],
            "datasetId": product["datasetId"],
            "validTime": iso(valid_time),
            "significantWaveHeightM": round(max(0.0, height), 3),
            "waveFromDirectionDeg": round(direction % 360.0, 1),
            "peakPeriodS": round(max(0.0, period), 2),
            "waveOnshoreAlignment": round(alignment, 4),
            "waveDirectionClass": direction_class(alignment),
            "gridDistanceKm": distance_km,
        })
    return records


def event_windows(records: list[dict[str, Any]]) -> list[dict[str, Any]]:
    windows = []
    for part_id in sorted({row["partId"] for row in records}):
        part_records = sorted((row for row in records if row["partId"] == part_id), key=lambda row: row["validTime"])
        if not part_records:
            continue
        threshold = max(0.5, float(np.quantile([row["significantWaveHeightM"] for row in part_records], 0.9)))
        energetic = [row for row in part_records if row["significantWaveHeightM"] >= threshold]
        groups: list[list[dict[str, Any]]] = []
        for row in energetic:
            current_time = utc(row["validTime"])
            if not groups or current_time - utc(groups[-1][-1]["validTime"]) > timedelta(hours=6):
                groups.append([row])
            else:
                groups[-1].append(row)
        for group in groups:
            peak = max(group, key=lambda row: row["significantWaveHeightM"])
            identity = f"{part_id}|{group[0]['validTime']}|{group[-1]['validTime']}"
            windows.append({
                "eventId": f"wave-{hashlib.sha256(identity.encode('utf-8')).hexdigest()[:12]}",
                "partId": part_id,
                "sourceZoneId": peak["sourceZoneId"],
                "name": peak["name"],
                "basin": peak["basin"],
                "source": peak["source"],
                "startTime": group[0]["validTime"],
                "peakTime": peak["validTime"],
                "endTime": group[-1]["validTime"],
                "peakSignificantWaveHeightM": peak["significantWaveHeightM"],
                "peakWaveFromDirectionDeg": peak["waveFromDirectionDeg"],
                "peakWaveOnshoreAlignment": peak["waveOnshoreAlignment"],
                "waveDirectionClass": peak["waveDirectionClass"],
                "peakPeriodS": peak["peakPeriodS"],
                "selectionThresholdM": round(threshold, 3),
                "peakHeightToThreshold": round(peak["significantWaveHeightM"] / max(threshold, 1e-9), 3),
                "sampleCount": len(group),
            })
    return sorted(windows, key=lambda row: (row["peakTime"], row["partId"]))


def selected_wave_windows(events: list[dict[str, Any]], requested: int = 12) -> list[dict[str, Any]]:
    selected: list[dict[str, Any]] = []
    used: set[str] = set()

    def add(event: dict[str, Any] | None) -> None:
        if event and event["eventId"] not in used and len(selected) < requested:
            used.add(event["eventId"])
            selected.append(event)

    part_ids = sorted({event["partId"] for event in events})
    for classification in ("onshore", "alongshore", "offshore"):
        for part_id in part_ids:
            candidates = sorted(
                (
                    event for event in events
                    if event["partId"] == part_id and event["waveDirectionClass"] == classification
                ),
                key=lambda event: (-event["peakHeightToThreshold"], event["peakTime"]),
            )
            add(candidates[0] if candidates else None)
    for event in sorted(
        (event for event in events if event["eventId"] not in used),
        key=lambda event: (-event["peakHeightToThreshold"], event["partId"], event["peakTime"]),
    ):
        add(event)
    return selected


def reject_sensitive_output(value: Any) -> None:
    if isinstance(value, dict):
        for key, child in value.items():
            if str(key).lower() in FORBIDDEN_OUTPUT_KEYS:
                raise RuntimeError(f"Private historical output contains forbidden field: {key}")
            reject_sensitive_output(child)
    elif isinstance(value, list):
        for child in value:
            reject_sensitive_output(child)


def reject_credentials(document: dict[str, Any]) -> None:
    text = json.dumps(document, ensure_ascii=False).lower()
    for name in ("COPERNICUSMARINE_SERVICE_USERNAME", "COPERNICUSMARINE_SERVICE_PASSWORD"):
        value = os.getenv(name, "")
        if value and value.lower() in text:
            raise RuntimeError("Copernicus credential material reached historical output")


def main() -> int:
    args = arguments()
    start, end = selected_range(args)
    targets = selected_targets(args.targets)
    if not args.fixture_directory and (
        not os.getenv("COPERNICUSMARINE_SERVICE_USERNAME")
        or not os.getenv("COPERNICUSMARINE_SERVICE_PASSWORD")
    ):
        raise RuntimeError("Copernicus credentials are required through environment secrets")

    records: list[dict[str, Any]] = []
    for target in targets:
        product = PRODUCTS[target["historicalProductKey"]]
        dataset = (
            xr.open_dataset(fixture_path(args.fixture_directory, product, target))
            if args.fixture_directory
            else open_remote_dataset(product, target, start, end)
        )
        try:
            records.extend(extract_records(dataset, target, product, start, end))
        finally:
            dataset.close()

    if not records:
        raise RuntimeError("Historical wave pilot produced no finite records")
    covered_part_ids = {row["partId"] for row in records}
    missing_part_ids = sorted(set(SENTINELS) - covered_part_ids)
    if missing_part_ids:
        raise RuntimeError(
            "Historical wave pilot has no finite coverage for required sentinels: " + ", ".join(missing_part_ids)
        )
    events = event_windows(records)
    selected_events = selected_wave_windows(events)
    document = {
        "schemaVersion": 1,
        "status": "OK",
        "generatedAt": iso(datetime.now(timezone.utc)),
        "range": {"start": iso(start), "end": iso(end)},
        "method": "four-authoritative-sentinels-wave-first-event-discovery",
        "requestedSentinelCount": len(targets),
        "coveredSentinelCount": len(covered_part_ids),
        "sentinelCount": len(covered_part_ids),
        "recordCount": len(records),
        "eventCandidateCount": len(events),
        "selectedWaveWindowCount": len(selected_events),
        "sources": sorted({row["source"] for row in records}),
        "privateDerivedWeatherFeaturesStored": True,
        "coordinateValuesStored": False,
        "rawVectorValuesStored": False,
        "rawNetcdfStored": False,
        "scoreImpact": False,
        "publicRuntime": False,
        "productionGeometryChanged": False,
        "dmiFallbackChanged": False,
        "automaticActivationAllowed": False,
        "records": sorted(records, key=lambda row: (row["validTime"], row["partId"])),
        "eventCandidates": events,
        "selectedWaveWindows": selected_events,
    }
    reject_sensitive_output(document)
    reject_credentials(document)
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(document, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    args.summary.parent.mkdir(parents=True, exist_ok=True)
    args.summary.write_text(
        "Historical RavScore wave pilot: OK\n"
        f"Range: {iso(start)} to {iso(end)}\n"
        f"Sentinels: {len(covered_part_ids)}/{len(targets)}\nRecords: {len(records)}\n"
        f"Event candidates: {len(events)}\nSelected wave windows: {len(selected_events)}\n"
        "Coordinates stored: no\nRaw NetCDF stored: no\nScore impact: no\nDMI fallback changed: no\n",
        encoding="utf-8",
    )
    print(
        f"Historical wave pilot: {len(records)} coordinate-free samples, {len(events)} event candidates, "
        f"{len(selected_events)} selected wave windows, {len(covered_part_ids)}/{len(targets)} sentinels. "
        "Score/DMI/geometri ændret: nej."
    )
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except Exception as error:
        print(f"Historical wave pilot failed: {error}")
        raise SystemExit(1)
