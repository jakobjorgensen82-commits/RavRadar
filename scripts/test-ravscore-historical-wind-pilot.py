#!/usr/bin/env python3
"""Targeted contract tests for the bounded DMI historical wind pilot."""

from __future__ import annotations

import importlib.util
from datetime import datetime, timedelta, timezone
from pathlib import Path


SCRIPT = Path(__file__).with_name("build-ravscore-historical-wind-pilot.py")
SPEC = importlib.util.spec_from_file_location("ravradar_historical_wind", SCRIPT)
MODULE = importlib.util.module_from_spec(SPEC)
assert SPEC and SPEC.loader
SPEC.loader.exec_module(MODULE)


def feature(station: str, observed: datetime, value: float, point: tuple[float, float], created_offset: int = 0) -> dict:
    return {
        "type": "Feature",
        "geometry": {"type": "Point", "coordinates": list(point)},
        "properties": {
            "stationId": station,
            "observed": MODULE.iso_z(observed),
            "created": MODULE.iso_z(observed + timedelta(seconds=created_offset)),
            "value": value,
        },
    }


start = datetime(2024, 1, 1, tzinfo=timezone.utc)
times = [start + timedelta(hours=index) for index in range(4)]
speed = []
direction = []
for index, observed in enumerate(times):
    speed.append(feature("complete", observed, 5 + index, (10.10, 56.0)))
    direction.append(feature("complete", observed, 250 + index, (10.10, 56.0)))
for index, observed in enumerate(times[:2]):
    speed.append(feature("near-incomplete", observed, 4 + index, (10.01, 56.0)))
    direction.append(feature("near-incomplete", observed, 240 + index, (10.01, 56.0)))

selected = MODULE.choose_station(speed, direction, (10.0, 56.0), times)
assert selected is not None
assert selected["stationId"] == "complete"
assert selected["coverageRatio"] == 1.0
assert selected["maxTimeOffsetMinutes"] == 0.0
assert len(selected["samples"]) == 4
assert set(selected["samples"][0]) == {"time", "windSpeedMps", "windDirectionFromDeg"}

synthetic = {
    "eventCatalog": [{
        "eventId": "event-1",
        "regionId": "part-a",
        "windowStart": MODULE.iso_z(times[0]),
        "windowEnd": MODULE.iso_z(times[-1]),
    }],
    "regions": [{
        "regionId": "part-a",
        "samples": [{"time": MODULE.iso_z(value), "waveHeightM": 1.0} for value in times],
    }],
}
events = MODULE.extract_event_windows(synthetic)
assert len(events) == 1
assert events[0]["sentinelRef"] == "part-a"
assert events[0]["eventId"] == "event-1"
assert events[0]["sampleTimes"] == times

assert MODULE.resolve_target("part-a", {"part-a": (10.0, 56.0)}) == (10.0, 56.0)
assert len(MODULE.station_alias("06123")) == 12
assert "06123" not in MODULE.station_alias("06123")

print("Historical DMI wind pilot contract: passed")
