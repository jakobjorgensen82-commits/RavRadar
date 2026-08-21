#!/usr/bin/env python3
"""Targeted fixture test for the private historical wave pilot."""
from __future__ import annotations

import json
import subprocess
import sys
import tempfile
from pathlib import Path

import numpy as np
import xarray as xr


ROOT = Path(__file__).resolve().parents[1]
SCRIPT = ROOT / "scripts/build-ravscore-historical-wave-pilot.py"
SENTINELS = [
    ("dk-b03-07-national-part-01", "DK-B03-07", "West", "copernicus-nws-wave-reanalysis", 8.2, 56.1),
    ("dk-b01-16-national-part-01", "DK-B01-16", "North", "copernicus-baltic-wave-hindcast", 10.2, 57.5),
    ("dk-b10-01-national-part-01-locality-01", "DK-B10-01", "Inner", "copernicus-baltic-wave-hindcast", 12.3, 55.0),
    ("dk-b10-21-national-part-01", "DK-B10-21", "Baltic", "copernicus-baltic-wave-hindcast", 15.0, 55.0),
]


def dataset(longitude: float, latitude: float) -> xr.Dataset:
    times = np.arange("2024-01-01T00", "2024-01-02T00", dtype="datetime64[3h]")
    longitudes = np.array([longitude - 0.02, longitude, longitude + 0.02])
    latitudes = np.array([latitude - 0.02, latitude, latitude + 0.02])
    shape = (len(times), len(latitudes), len(longitudes))
    height = np.broadcast_to(np.linspace(0.4, 3.2, len(times))[:, None, None], shape).copy()
    direction = np.broadcast_to(np.linspace(20.0, 300.0, len(times))[:, None, None], shape).copy()
    period = np.broadcast_to(np.linspace(4.0, 9.0, len(times))[:, None, None], shape).copy()
    return xr.Dataset(
        {
            "VHM0": (("time", "latitude", "longitude"), height),
            "VMDR": (("time", "latitude", "longitude"), direction),
            "VTPK": (("time", "latitude", "longitude"), period),
        },
        coords={"time": times, "latitude": latitudes, "longitude": longitudes},
    )


def main() -> int:
    temporary = Path(tempfile.mkdtemp(prefix="ravradar-historical-wave-test-"))
    targets = temporary / "targets.json"
    fixtures = temporary / "fixtures"
    output = temporary / "output.json"
    summary = temporary / "summary.txt"
    fixtures.mkdir()
    zones = {}
    for part_id, zone_id, name, source, longitude, latitude in SENTINELS:
        zones.setdefault(zone_id, []).append({
            "partId": part_id,
            "sourceZoneId": zone_id,
            "name": name,
            "waterPoint": [longitude, latitude],
        })
        dataset(longitude, latitude).to_netcdf(fixtures / f"{source}-{part_id}.nc")
    targets.write_text(json.dumps({"zones": zones}), encoding="utf-8")

    completed = subprocess.run(
        [
            sys.executable, str(SCRIPT), "--targets", str(targets),
            "--output", str(output), "--summary", str(summary),
            "--start", "2024-01-01T00:00:00Z", "--end", "2024-01-01T21:00:00Z",
            "--fixture-directory", str(fixtures),
        ],
        cwd=ROOT,
        capture_output=True,
        text=True,
        check=False,
    )
    assert completed.returncode == 0, completed.stdout + completed.stderr
    document = json.loads(output.read_text(encoding="utf-8"))
    assert document["status"] == "OK"
    assert document["sentinelCount"] == 4
    assert document["recordCount"] == 32
    assert document["eventCandidateCount"] >= 4
    assert document["scoreImpact"] is False
    assert document["publicRuntime"] is False
    assert document["productionGeometryChanged"] is False
    assert document["dmiFallbackChanged"] is False
    assert document["coordinateValuesStored"] is False
    assert document["rawNetcdfStored"] is False
    assert all(row["gridDistanceKm"] == 0 for row in document["records"])
    forbidden_keys = {"waterpoint", "landpoint", "longitude", "latitude", "geometry", "umps", "vmps"}
    def inspect(value):
        if isinstance(value, dict):
            assert not (forbidden_keys & {str(key).lower() for key in value})
            for child in value.values():
                inspect(child)
        elif isinstance(value, list):
            for child in value:
                inspect(child)
    inspect(document)

    rejected = subprocess.run(
        [
            sys.executable, str(SCRIPT), "--targets", str(targets),
            "--output", str(output), "--summary", str(summary),
            "--start", "2023-01-01T00:00:00Z", "--end", "2024-01-03T00:00:00Z",
            "--fixture-directory", str(fixtures),
        ],
        cwd=ROOT,
        capture_output=True,
        text=True,
        check=False,
    )
    assert rejected.returncode != 0
    assert "no longer than 366 days" in rejected.stdout
    print("OK: historical wave pilot is bounded, private, coordinate-free and score-neutral.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
