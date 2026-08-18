#!/usr/bin/env python3
"""Deterministic tests for the private Copernicus current selection contract."""
from __future__ import annotations

import json
import tempfile
from datetime import datetime, timedelta, timezone
from pathlib import Path

import numpy as np
import xarray as xr

from lib.copernicus_current import load_targets, nearest_shared_uv, safe_record, safe_shadow_summary, update_shadow


ROOT = Path(__file__).resolve().parents[1]


def need(condition: bool, message: str) -> None:
    if not condition:
        raise AssertionError(message)


def synthetic_dataset() -> xr.Dataset:
    # Nearest column (9.000, 57.000) is dry.  The next column has U/V at
    # different individual levels but only one deepest shared level (3 m).
    u = np.full((1, 3, 2, 3), np.nan)
    v = np.full((1, 3, 2, 3), np.nan)
    u[0, :, 0, 1] = [0.1, 0.2, 0.3]
    v[0, :, 0, 1] = [0.4, 0.5, np.nan]
    u[0, :, 0, 2] = [0.6, 0.7, 0.8]
    v[0, :, 0, 2] = [0.9, 1.0, 1.1]
    return xr.Dataset(
        data_vars={
            "uo": (("time", "depth", "latitude", "longitude"), u),
            "vo": (("time", "depth", "latitude", "longitude"), v),
        },
        coords={
            "time": np.array(["2026-08-18T10:00:00"], dtype="datetime64[s]"),
            "depth": [0.0, 3.0, 5.0],
            "latitude": [57.0, 57.02],
            "longitude": [9.0, 9.02, 9.04],
        },
    )


def main() -> None:
    targets = load_targets(ROOT / "data/live/coastal-parts-v2.json")
    need(len(targets) == 673, "Pilot must use every centrally generated coastal part")
    target = {"partId": "p1", "parentZoneId": "z1", "name": "test", "waterPoint": [9.0, 57.0]}
    record = nearest_shared_uv(
        synthetic_dataset(), target,
        source="fixture", product_id="product", dataset_id="dataset", dataset_version="version",
    )
    need(record is not None, "Expected a shared U/V column")
    need(record["gridPoint"] == [9.02, 57.0], "Selection must skip the nearer dry cell")
    need(record["verticalLayerM"] == 3.0, "Selection must use the deepest shared layer in the chosen column")
    need(record["uMps"] == 0.2 and record["vMps"] == 0.5, "U/V must come from the same cell and layer")
    need(record["interpolation"] is False, "Interpolation must remain disabled")
    need("uMps" not in safe_record(record) and "vMps" not in safe_record(record), "Safe report must omit raw vectors")

    surface_dataset = synthetic_dataset().sel(depth=[0.0]).assign_coords(depth=[0.5016462])
    surface_record = nearest_shared_uv(
        surface_dataset, target,
        source="fixture", product_id="product", dataset_id="dataset", dataset_version="version",
        expected_time=datetime(2026, 8, 18, 10, tzinfo=timezone.utc),
    )
    need(surface_record is not None and surface_record["layerQuality"] == "surface-only", "A non-zero top model layer must still be reported as surface-only")

    try:
        nearest_shared_uv(
            synthetic_dataset(), target,
            source="fixture", product_id="product", dataset_id="dataset", dataset_version="version",
            expected_time=datetime(2026, 8, 18, 11, tzinfo=timezone.utc),
        )
    except RuntimeError as error:
        need("expected exact hour" in str(error), "Wrong-time rejection must explain the exact-hour contract")
    else:
        raise AssertionError("The pilot must reject a nearest-but-not-exact model hour")

    far_target = {**target, "partId": "far", "waterPoint": [8.5, 57.0]}
    need(nearest_shared_uv(
        synthetic_dataset(), far_target,
        source="fixture", product_id="product", dataset_id="dataset", dataset_version="version",
    ) is None, "The Copernicus local pilot must remain capped at 5 km")

    with tempfile.TemporaryDirectory() as directory:
        path = Path(directory) / "shadow.json"
        now = datetime(2026, 8, 18, 12, tzinfo=timezone.utc)
        old = {**record, "validTime": (now - timedelta(hours=169)).isoformat().replace("+00:00", "Z")}
        fresh = {**record, "validTime": (now - timedelta(hours=2)).isoformat().replace("+00:00", "Z")}
        path.write_text(json.dumps({"schemaVersion": 1, "records": [old]}), encoding="utf-8")
        shadow = update_shadow(path, [fresh], now)
        need(len(shadow["records"]) == 1, "Shadow cache must prune records older than seven days")
        need(shadow["scoreImpact"] is False and shadow["publicRuntime"] is False, "Pilot must stay private and score-neutral")
        evidence = safe_shadow_summary(shadow)
        need(evidence["recordCount"] == 1 and evidence["validTimeCount"] == 1, "Safe evidence must summarize retained times")
        need(evidence["gridUnstableTargetSourceCount"] == 0 and evidence["layerUnstableTargetSourceCount"] == 0, "One observation must be stable")
        serialized = json.dumps(evidence)
        need("uMps" not in serialized and "vMps" not in serialized, "Multi-run evidence must omit raw vectors")

        next_hour = {**record, "validTime": (now - timedelta(hours=1)).isoformat().replace("+00:00", "Z")}
        two_times = update_shadow(path, [next_hour], now)
        two_time_evidence = safe_shadow_summary(two_times)
        need(len(two_times["records"]) == 2, "A restored shadow must retain both different valid times")
        need(two_time_evidence["validTimeCount"] == 2, "Safe evidence must prove multi-time aggregation")

    pilot_workflow = (ROOT / ".github/workflows/validate-copernicus-current-pilot.yml").read_text(encoding="utf-8")
    keepalive_workflow = (ROOT / ".github/workflows/preserve-copernicus-current-shadow.yml").read_text(encoding="utf-8")
    need("sample_time:" in pilot_workflow and '--at "$PILOT_SAMPLE_TIME"' in pilot_workflow,
         "Manual pilot runs must support a quoted exact-hour backfill")
    need("7,17,27,37,47,57 * * * *" in keepalive_workflow,
         "The small private cache must be refreshed more often than DMI cache churn can evict it")
    need("actions/cache/restore@v4" in keepalive_workflow and "actions/cache/save@v4" not in keepalive_workflow,
         "Keepalive must only refresh the existing private cache, not create redundant copies")
    need("actions/upload-artifact" not in keepalive_workflow,
         "Keepalive must never export the raw shadow to an artifact")
    need("private-copernicus-current-pilot" in keepalive_workflow,
         "Pilot and keepalive must serialize access to the same cache")
    need("python3 scripts/check-copernicus-current-hour.py" in keepalive_workflow
         and "uMps" not in keepalive_workflow and "vMps" not in keepalive_workflow,
         "Keepalive must inspect presence without logging raw record contents")
    need('workflows: ["Update weather and deploy RavRadar"]' in keepalive_workflow
         and "validate-copernicus-current-pilot.yml/dispatches" in keepalive_workflow,
         "The reliable external production heartbeat must dispatch a missing current hour")

    print("OK: private Copernicus current selection, provenance safety and 168-hour retention")


if __name__ == "__main__":
    main()
