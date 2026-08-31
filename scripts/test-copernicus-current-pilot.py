#!/usr/bin/env python3
"""Deterministic selection/sharding tests for Copernicus multi-time current."""
from __future__ import annotations

import importlib.util
from datetime import datetime, timezone
from pathlib import Path

import numpy as np
import xarray as xr

from lib.copernicus_current import nearest_shared_uv, nearest_shared_uv_times, safe_record


ROOT = Path(__file__).resolve().parents[1]


def dataset() -> xr.Dataset:
    u = np.full((2, 3, 1, 3), np.nan)
    v = np.full((2, 3, 1, 3), np.nan)
    # At 10 UTC the nearest column is dry; 9.02 is chosen at deepest shared 3 m.
    u[0, :, 0, 1] = [0.1, 0.2, 0.3]
    v[0, :, 0, 1] = [0.4, 0.5, np.nan]
    # At 11 UTC the same nearest column has only its top layer; selection is
    # independently recomputed for that native time and may use 9.04 instead.
    u[1, 0, 0, 1] = 0.2
    u[1, :, 0, 2] = [0.6, 0.7, 0.8]
    v[1, :, 0, 2] = [0.9, 1.0, 1.1]
    return xr.Dataset(
        data_vars={
            "uo": (("time", "depth", "latitude", "longitude"), u),
            "vo": (("time", "depth", "latitude", "longitude"), v),
        },
        coords={
            "time": np.array(["2026-08-18T10:00:00", "2026-08-18T11:00:00"], dtype="datetime64[s]"),
            "depth": [0.0, 3.0, 5.0], "latitude": [57.0], "longitude": [9.0, 9.02, 9.04],
        },
    )


target = {"partId": "p1", "parentZoneId": "z1", "name": "test", "waterPoint": [9.0, 57.0]}
times = [datetime(2026, 8, 18, hour, tzinfo=timezone.utc) for hour in (10, 11)]
records = nearest_shared_uv_times(
    dataset(), target, source="fixture", product_id="product", dataset_id="dataset",
    dataset_version="version", expected_times=times,
)
assert len(records) == 2
assert records[0]["gridPoint"] == [9.02, 57.0] and records[0]["verticalLayerM"] == 3.0
assert records[1]["gridPoint"] == [9.04, 57.0] and records[1]["verticalLayerM"] == 5.0
assert all(row["componentPair"] == "same-time-cell-layer" and row["interpolation"] is False for row in records)
assert "uMps" not in safe_record(records[0]) and "vMps" not in safe_record(records[0])

try:
    nearest_shared_uv_times(
        dataset().isel(time=[0]), target, source="fixture", product_id="product", dataset_id="dataset",
        dataset_version="version", expected_times=times,
    )
except RuntimeError as error:
    assert "missing 1 exact requested native hour" in str(error)
else:
    raise AssertionError("Missing native time must not be interpolated or held")

try:
    nearest_shared_uv(
        dataset(), target, source="fixture", product_id="product", dataset_id="dataset", dataset_version="version",
    )
except RuntimeError as error:
    assert "exactly one time" in str(error)
else:
    raise AssertionError("Single-time selector must reject a multi-time dataset")

# Load the CLI module without executing main and prove fixed spatial shards are
# bounded and independent of input ordering.
spec = importlib.util.spec_from_file_location("copernicus_range_runner", ROOT / "scripts/run-copernicus-current-pilot.py")
assert spec and spec.loader
runner = importlib.util.module_from_spec(spec)
spec.loader.exec_module(runner)
product = runner.PRODUCTS[0]
many = [
    {"partId": f"p-{index:03d}", "parentZoneId": "z", "name": "x", "waterPoint": [9.1 + (index % 10) * 0.01, 57.0 + (index // 10) * 0.01]}
    for index in range(50)
]
forward = runner.spatial_shards(many, product)
reverse = runner.spatial_shards(list(reversed(many)), product)
assert [[row["partId"] for row in shard["targets"]] for shard in forward] == [
    [row["partId"] for row in shard["targets"]] for shard in reverse
]
assert all(1 <= len(shard["targets"]) <= runner.SPATIAL_SHARD_MAX_TARGETS for shard in forward)
for shard in forward:
    runner.request_bounds(shard["targets"], product)

print("OK: Copernicus selection is native-time exact and spatial shards are deterministic and bounded.")
