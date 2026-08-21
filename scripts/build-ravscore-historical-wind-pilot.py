#!/usr/bin/env python3
"""Build a bounded, private DMI wind artifact for historical RavScore research."""

from __future__ import annotations

import argparse
import hashlib
import json
import math
import os
import re
import time
import urllib.parse
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

from lib.copernicus_current import load_targets


DMI_OBSERVATIONS = "https://opendataapi.dmi.dk/v2/metObs/collections/observation/items"
SPEED_PARAMETER = "wind_speed_past1h"
DIRECTION_PARAMETER = "wind_dir_past1h"
MAX_STATION_DISTANCE_KM = 60.0
MAX_TIME_OFFSET_MINUTES = 10.0
MIN_EVENT_COVERAGE = 0.75


def parse_time(value: object) -> datetime | None:
    if not isinstance(value, str) or not value.strip():
        return None
    text = value.strip().replace("Z", "+00:00")
    try:
        parsed = datetime.fromisoformat(text)
    except ValueError:
        return None
    if parsed.tzinfo is None:
        parsed = parsed.replace(tzinfo=timezone.utc)
    return parsed.astimezone(timezone.utc)


def iso_z(value: datetime) -> str:
    return value.astimezone(timezone.utc).isoformat(timespec="seconds").replace("+00:00", "Z")


def extract_event_windows(document: object) -> list[dict]:
    if not isinstance(document, dict):
        raise ValueError("Historical forcing input must be an object")
    regions = {
        str(region.get("regionId")): region
        for region in document.get("regions", [])
        if isinstance(region, dict) and region.get("regionId")
    }
    events = []
    for event in document.get("eventCatalog", []):
        if not isinstance(event, dict):
            continue
        region_id = str(event.get("regionId") or "")
        event_id = str(event.get("eventId") or "")
        start = parse_time(event.get("windowStart"))
        end = parse_time(event.get("windowEnd"))
        region = regions.get(region_id)
        if not region_id or not event_id or start is None or end is None or region is None:
            raise ValueError("Historical forcing event catalog is incomplete")
        sample_times = sorted({
            parsed
            for row in region.get("samples", [])
            if isinstance(row, dict)
            and (parsed := parse_time(row.get("time"))) is not None
            and start <= parsed <= end
        })
        if len(sample_times) < 2:
            raise ValueError(f"Historical forcing event {event_id} has no bounded sample series")
        events.append({
            "sentinelRef": region_id,
            "eventId": event_id,
            "sampleTimes": sample_times,
            "windowStart": start,
            "windowEnd": end,
        })
    return events


def target_catalog(path: Path) -> dict[str, tuple[float, float]]:
    catalog = {}
    for target in load_targets(path):
        part_id = str(target.get("partId") or "")
        point = target.get("waterPoint")
        if part_id and isinstance(point, list) and len(point) >= 2:
            catalog[part_id] = (float(point[0]), float(point[1]))
    return catalog


def resolve_target(reference: str | None, catalog: dict[str, tuple[float, float]]) -> tuple[float, float]:
    target = catalog.get(str(reference or ""))
    if target is None:
        raise ValueError(f"Could not resolve the approved coastal-part water point for {reference!r}")
    return target


def haversine_km(first: tuple[float, float], second: tuple[float, float]) -> float:
    lon1, lat1 = map(math.radians, first)
    lon2, lat2 = map(math.radians, second)
    dlon, dlat = lon2 - lon1, lat2 - lat1
    a = math.sin(dlat / 2) ** 2 + math.cos(lat1) * math.cos(lat2) * math.sin(dlon / 2) ** 2
    return 6371.0088 * 2 * math.asin(math.sqrt(a))


def event_bbox(point: tuple[float, float], radius_km: float = MAX_STATION_DISTANCE_KM) -> str:
    lon, lat = point
    lat_delta = radius_km / 111.0
    lon_delta = radius_km / max(20.0, 111.0 * math.cos(math.radians(lat)))
    return ",".join(f"{value:.5f}" for value in (lon - lon_delta, lat - lat_delta, lon + lon_delta, lat + lat_delta))


def fetch_features(parameter: str, start: datetime, end: datetime, point: tuple[float, float]) -> list[dict]:
    query = urllib.parse.urlencode({
        "parameterId": parameter,
        "datetime": f"{iso_z(start)}/{iso_z(end)}",
        "bbox": event_bbox(point),
        "limit": "20000",
    })
    request = urllib.request.Request(
        f"{DMI_OBSERVATIONS}?{query}",
        headers={"Accept": "application/geo+json", "User-Agent": "RavRadar/private-historical-wind-pilot"},
    )
    last_error: Exception | None = None
    for attempt in range(3):
        try:
            with urllib.request.urlopen(request, timeout=60) as response:
                payload = json.load(response)
            return payload.get("features", []) if isinstance(payload, dict) else []
        except Exception as error:  # network failures are retried, then surfaced
            last_error = error
            if attempt < 2:
                time.sleep(2 ** attempt)
    raise RuntimeError(f"DMI metObs request failed for {parameter}: {last_error}")


def observation_index(features: list[dict]) -> dict[str, dict[datetime, dict]]:
    indexed: dict[str, dict[datetime, dict]] = {}
    for feature in features:
        properties = feature.get("properties") or {}
        station_id = str(properties.get("stationId") or "").strip()
        observed = parse_time(properties.get("observed"))
        value = properties.get("value")
        coordinates = (feature.get("geometry") or {}).get("coordinates")
        if not station_id or observed is None or not isinstance(value, (int, float)):
            continue
        if not (isinstance(coordinates, list) and len(coordinates) >= 2 and all(isinstance(item, (int, float)) for item in coordinates[:2])):
            continue
        candidate = {
            "value": float(value),
            "point": (float(coordinates[0]), float(coordinates[1])),
            "created": parse_time(properties.get("created")) or datetime.min.replace(tzinfo=timezone.utc),
        }
        existing = indexed.setdefault(station_id, {}).get(observed)
        if existing is None or candidate["created"] > existing["created"]:
            indexed[station_id][observed] = candidate
    return indexed


def paired_station_rows(speed_features: list[dict], direction_features: list[dict]) -> dict[str, list[dict]]:
    speed = observation_index(speed_features)
    direction = observation_index(direction_features)
    paired: dict[str, list[dict]] = {}
    for station_id in speed.keys() & direction.keys():
        for observed in speed[station_id].keys() & direction[station_id].keys():
            speed_row = speed[station_id][observed]
            direction_row = direction[station_id][observed]
            speed_value = speed_row["value"]
            direction_value = direction_row["value"]
            if not (0 <= speed_value <= 75 and 0 <= direction_value <= 360):
                continue
            paired.setdefault(station_id, []).append({
                "time": observed,
                "speed": speed_value,
                "direction": direction_value % 360,
                "point": speed_row["point"],
            })
    for rows in paired.values():
        rows.sort(key=lambda row: row["time"])
    return paired


def align_samples(rows: list[dict], sample_times: list[datetime]) -> tuple[list[dict], float]:
    aligned = []
    maximum_offset = 0.0
    for sample_time in sample_times:
        nearest = min(rows, key=lambda row: abs((row["time"] - sample_time).total_seconds()), default=None)
        if nearest is None:
            continue
        offset = abs((nearest["time"] - sample_time).total_seconds()) / 60
        if offset > MAX_TIME_OFFSET_MINUTES:
            continue
        maximum_offset = max(maximum_offset, offset)
        aligned.append({
            "time": iso_z(sample_time),
            "windSpeedMps": round(nearest["speed"], 2),
            "windDirectionFromDeg": round(nearest["direction"], 1),
        })
    return aligned, maximum_offset


def choose_station(speed_features: list[dict], direction_features: list[dict], target: tuple[float, float], sample_times: list[datetime]) -> dict | None:
    candidates = []
    for station_id, rows in paired_station_rows(speed_features, direction_features).items():
        distance = haversine_km(target, rows[0]["point"])
        if distance > MAX_STATION_DISTANCE_KM:
            continue
        samples, maximum_offset = align_samples(rows, sample_times)
        coverage = len(samples) / len(sample_times) if sample_times else 0.0
        candidates.append({
            "stationId": station_id,
            "distanceKm": distance,
            "samples": samples,
            "coverageRatio": coverage,
            "maxTimeOffsetMinutes": maximum_offset,
        })
    eligible = [candidate for candidate in candidates if candidate["coverageRatio"] >= MIN_EVENT_COVERAGE]
    if not eligible:
        return None
    return min(eligible, key=lambda candidate: (candidate["distanceKm"], -candidate["coverageRatio"], candidate["stationId"]))


def station_alias(station_id: str) -> str:
    return hashlib.sha256(f"ravradar-dmi-wind:{station_id}".encode("utf-8")).hexdigest()[:12]


def build(forcing_path: Path, targets_path: Path) -> dict:
    forcing = json.loads(forcing_path.read_text(encoding="utf-8"))
    events = extract_event_windows(forcing)
    if len(events) != 12:
        raise ValueError(f"Expected exactly 12 bounded historical events, found {len(events)}")
    catalog = target_catalog(targets_path)
    output_events = []
    for event in events:
        target = resolve_target(event["sentinelRef"], catalog)
        speed = fetch_features(SPEED_PARAMETER, event["windowStart"], event["windowEnd"], target)
        direction = fetch_features(DIRECTION_PARAMETER, event["windowStart"], event["windowEnd"], target)
        selected = choose_station(speed, direction, target, event["sampleTimes"])
        if selected is None:
            raise ValueError(f"No DMI wind station met the coverage and distance contract for {event['sentinelRef']} / {event['eventId']}")
        output_events.append({
            "sentinelRef": event["sentinelRef"],
            "eventId": event["eventId"],
            "windowStart": iso_z(event["windowStart"]),
            "windowEnd": iso_z(event["windowEnd"]),
            "stationAlias": station_alias(selected["stationId"]),
            "stationDistanceKm": round(selected["distanceKm"], 3),
            "expectedSamples": len(event["sampleTimes"]),
            "pairedSamples": len(selected["samples"]),
            "coverageRatio": round(selected["coverageRatio"], 4),
            "maxTimeOffsetMinutes": round(selected["maxTimeOffsetMinutes"], 2),
            "samples": selected["samples"],
        })
    return {
        "schemaVersion": 1,
        "generatedAt": iso_z(datetime.now(timezone.utc)),
        "source": {
            "provider": "DMI Open Data metObs",
            "speedParameter": SPEED_PARAMETER,
            "directionParameter": DIRECTION_PARAMETER,
            "selection": "nearest station within 60 km with at least 75% exact-or-10-minute paired coverage per event",
        },
        "eventCount": len(output_events),
        "sampleCount": sum(event["pairedSamples"] for event in output_events),
        "minimumCoverageRatio": min(event["coverageRatio"] for event in output_events),
        "maximumStationDistanceKm": max(event["stationDistanceKm"] for event in output_events),
        "maximumTimeOffsetMinutes": max(event["maxTimeOffsetMinutes"] for event in output_events),
        "scoreImpact": False,
        "publicRuntime": False,
        "coordinateValuesStored": False,
        "credentialsStored": False,
        "rawApiPayloadStored": False,
        "derivedWindValuesStored": True,
        "events": output_events,
    }


def summary_text(result: dict) -> str:
    return "\n".join((
        "RavScore historical DMI wind pilot",
        f"events={result['eventCount']}",
        f"samples={result['sampleCount']}",
        f"minimumCoverageRatio={result['minimumCoverageRatio']}",
        f"maximumStationDistanceKm={result['maximumStationDistanceKm']}",
        f"maximumTimeOffsetMinutes={result['maximumTimeOffsetMinutes']}",
        "scoreImpact=false",
        "publicRuntime=false",
        "coordinateValuesStored=false",
        "credentialsStored=false",
        "rawApiPayloadStored=false",
    )) + "\n"


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--forcing", default=".cache/ravscore-historical-forcing-features.json")
    parser.add_argument("--targets", default="data/live/coastal-parts-v2.json")
    parser.add_argument("--output", default=".cache/ravscore-historical-wind-features.json")
    parser.add_argument("--summary", default=".cache/ravscore-historical-wind-features.txt")
    args = parser.parse_args()
    result = build(Path(args.forcing), Path(args.targets))
    output = Path(args.output)
    summary = Path(args.summary)
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps(result, ensure_ascii=True, indent=2) + "\n", encoding="utf-8")
    summary.write_text(summary_text(result), encoding="utf-8")
    print(summary_text(result), end="")


if __name__ == "__main__":
    main()
