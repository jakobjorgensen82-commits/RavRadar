#!/usr/bin/env python3
"""Deterministic selection/sharding tests for Copernicus multi-time current."""
from __future__ import annotations

import importlib.util
from datetime import datetime, timedelta, timezone
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

partial_records = nearest_shared_uv_times(
    dataset().isel(time=[0]), target, source="fixture", product_id="product", dataset_id="dataset",
    dataset_version="version", expected_times=times,
)
assert len(partial_records) == 1
assert partial_records[0]["validTime"] == "2026-08-18T10:00:00Z"
assert partial_records[0]["interpolation"] is False

duplicate_time_dataset = dataset().assign_coords(time=np.array(
    ["2026-08-18T10:00:00", "2026-08-18T10:00:00"], dtype="datetime64[s]",
))
try:
    nearest_shared_uv_times(
        duplicate_time_dataset, target, source="fixture", product_id="product", dataset_id="dataset",
        dataset_version="version", expected_times=times,
    )
except RuntimeError as error:
    assert "duplicate native time" in str(error)
else:
    raise AssertionError("A duplicate provider time axis must remain fatal")

for malformed_dataset, expected_error in (
    (dataset().rename({"time": "forecast_time"}), "missing its native time axis"),
    (dataset().assign_coords(time=np.array(["NaT", "2026-08-18T11:00:00"], dtype="datetime64[s]")),
     "invalid native time"),
    (dataset().isel(time=slice(0, 0)), "native time axis is empty"),
    (dataset().assign_coords(time=np.array(
        ["2026-08-18T10:00:00.500", "2026-08-18T11:00:00.000"],
        dtype="datetime64[ms]",
    )), "non-hourly native time"),
):
    try:
        nearest_shared_uv_times(
            malformed_dataset, target, source="fixture", product_id="product", dataset_id="dataset",
            dataset_version="version", expected_times=times,
        )
    except RuntimeError as error:
        assert expected_error in str(error)
    else:
        raise AssertionError("A malformed provider time axis must remain fatal")

# Structural validation must run even when none of the provider's native hours
# intersects the request.  Otherwise a corrupt response could be attested as an
# honest no-record attempt and incorrectly authorize the next source.
disjoint_broken = xr.Dataset(coords={
    "time": np.array(["2026-08-18T09:00:00"], dtype="datetime64[s]"),
})
try:
    nearest_shared_uv_times(
        disjoint_broken, target, source="fixture", product_id="product", dataset_id="dataset",
        dataset_version="version", expected_times=times,
    )
except RuntimeError as error:
    assert "missing" in str(error) and "uo" in str(error) and "vo" in str(error)
else:
    raise AssertionError("A disjoint native time axis must not bypass structural validation")

# A component without its own time dimension would hold the same vector over
# every requested hour, so it remains a fatal structure error.
time_independent = dataset().isel(time=0, drop=True).assign_coords(time=np.array(
    ["2026-08-18T10:00:00", "2026-08-18T11:00:00"], dtype="datetime64[s]",
))
try:
    nearest_shared_uv_times(
        time_independent, target, source="fixture", product_id="product", dataset_id="dataset",
        dataset_version="version", expected_times=times,
    )
except RuntimeError as error:
    assert "uo must use time/depth/latitude/longitude dimensions" in str(error)
else:
    raise AssertionError("Time-independent current components must not be held across hours")

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

# Operational work is always interleaved across products and each product queue
# rotates independently per invocation. Provider evidence is deliberately not
# a scheduling cursor, so expired negatives and failed calls cannot pin the
# same first shard forever.
fair_targets = [
    {"partId": "amm-only-a", "parentZoneId": "z", "name": "x", "waterPoint": [8.0, 56.0]},
    {"partId": "overlap-a", "parentZoneId": "z", "name": "x", "waterPoint": [9.2, 56.0]},
    {"partId": "baltic-only-a", "parentZoneId": "z", "name": "x", "waterPoint": [10.5, 56.0]},
    {"partId": "baltic-only-b", "parentZoneId": "z", "name": "x", "waterPoint": [12.0, 57.0]},
]
cold_order = runner.operational_shard_work_order(
    targets=fair_targets,
    rotation_slot=0,
)
cold_sources = [row["product"]["source"] for row in cold_order]
assert cold_sources[:4] == [
    "copernicus-baltic-nemo",
    "copernicus-nws-amm15",
    "copernicus-baltic-nemo",
    "copernicus-nws-amm15",
]
rotated_order = runner.operational_shard_work_order(
    targets=fair_targets,
    rotation_slot=1,
)
rotated_sources = [row["product"]["source"] for row in rotated_order]
assert rotated_sources[:4] == cold_sources[:4]
for source in ("copernicus-baltic-nemo", "copernicus-nws-amm15"):
    cold_product = [
        row["shard"]["shardId"] for row in cold_order
        if row["product"]["source"] == source
    ]
    rotated_product = [
        row["shard"]["shardId"] for row in rotated_order
        if row["product"]["source"] == source
    ]
    assert rotated_product == cold_product[1:] + cold_product[:1]

# Across bounded short runs every stable product shard becomes the first shard
# for its product, regardless of missing/expired attempt history.
for source, product in ((row["source"], row) for row in runner.PRODUCTS):
    product_shards = runner.spatial_shards(
        [row for row in fair_targets if runner.eligible_target(row, product)],
        product,
    )
    first_shards = {
        next(
            row["shard"]["shardId"]
            for row in runner.operational_shard_work_order(
                targets=fair_targets,
                rotation_slot=slot,
            )
            if row["product"]["source"] == source
        )
        for slot in range(len(product_shards))
    }
    assert first_shards == {row["shardId"] for row in product_shards}

# Pair admission remains independent of that historical ordering hint.  An
# AMM15-only pair can run immediately; an overlap pair needs a Baltic attempt
# at this exact reference; a downstream-covered pair is never critical work.
reference = datetime(2026, 8, 18, 10, tzinfo=timezone.utc)
valid_time = reference.isoformat().replace("+00:00", "Z")
amm_only_pair = ("amm-only-a", valid_time)
overlap_pair = ("overlap-a", valid_time)
covered_pair = ("baltic-only-a", valid_time)
target_by_id = {row["partId"]: row for row in fair_targets}
baltic, amm15 = runner.PRODUCTS
attempted = {
    "copernicus-baltic-nemo": set(),
    "copernicus-nws-amm15": set(),
}
remaining = {amm_only_pair, overlap_pair, covered_pair}
downstream_covered = {covered_pair}
assert runner.operational_source_required_pairs(
    remaining=remaining,
    downstream_covered=downstream_covered,
    product=amm15,
    attempted_pairs_by_source=attempted,
    target_by_id=target_by_id,
    baltic_product=baltic,
) == {amm_only_pair}
attempted["copernicus-baltic-nemo"].add(overlap_pair)
assert runner.operational_source_required_pairs(
    remaining=remaining,
    downstream_covered=downstream_covered,
    product=amm15,
    attempted_pairs_by_source=attempted,
    target_by_id=target_by_id,
    baltic_product=baltic,
) == {amm_only_pair, overlap_pair}
attempted["copernicus-nws-amm15"].add(amm_only_pair)
assert runner.operational_source_required_pairs(
    remaining=remaining,
    downstream_covered=downstream_covered,
    product=amm15,
    attempted_pairs_by_source=attempted,
    target_by_id=target_by_id,
    baltic_product=baltic,
) == {overlap_pair}

old_attempt = {
    "source": "copernicus-baltic-nemo",
    "productionReferenceAt": (reference - timedelta(hours=1)).isoformat().replace("+00:00", "Z"),
    "requestedPairs": [{"partId": overlap_pair[0], "validTime": overlap_pair[1]}],
}
assert runner.current_reference_attempt_pairs(
    [old_attempt], source="copernicus-baltic-nemo", reference=reference,
) == set()

print("OK: Copernicus selection is native-time exact and spatial shards are deterministic and bounded.")
