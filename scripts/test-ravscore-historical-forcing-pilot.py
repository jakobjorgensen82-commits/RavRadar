#!/usr/bin/env python3
"""Fixture contract for bounded historical current and sea-level enrichment."""
from __future__ import annotations

import json
import math
import subprocess
import sys
import tempfile
from datetime import datetime, timedelta, timezone
from pathlib import Path

import numpy as np
import xarray as xr


ROOT = Path(__file__).resolve().parents[1]
SCRIPT = ROOT / "scripts/build-ravscore-historical-forcing-pilot.py"
PARTS = (
    ("dk-b01-16-national-part-01", "baltic", 10.0, 57.0),
    ("dk-b03-07-national-part-01", "nws", 8.2, 56.0),
    ("dk-b07-19-fallback-recovery-01", "baltic", 10.8, 54.8),
    ("dk-b10-21-national-part-01", "baltic", 15.1, 55.0),
)


def iso(value: datetime) -> str:
    return value.astimezone(timezone.utc).isoformat().replace("+00:00", "Z")


def main() -> int:
    with tempfile.TemporaryDirectory() as temporary:
        directory = Path(temporary)
        fixtures = directory / "fixtures"
        fixtures.mkdir()
        targets_path = directory / "targets.json"
        wave_path = directory / "wave.json"
        output_path = directory / "forcing.json"
        summary_path = directory / "forcing.txt"
        target_rows = []
        wave_records = []
        windows = []
        all_times_by_part: dict[str, set[datetime]] = {}
        alignments = (0.8, -0.8, 0.8)
        peaks = (
            datetime(2024, 1, 10, 12, tzinfo=timezone.utc),
            datetime(2024, 4, 10, 12, tzinfo=timezone.utc),
            datetime(2024, 10, 10, 12, tzinfo=timezone.utc),
        )
        for part_index, (part_id, basin, longitude, latitude) in enumerate(PARTS):
            target_rows.append({
                "partId": part_id,
                "sourceZoneId": f"zone-{part_index}",
                "name": f"Fixture {part_index}",
                "waterPoint": [longitude, latitude],
                "onshoreDirectionDeg": 0.0,
            })
            all_times_by_part[part_id] = set()
            cadence = 3 if basin == "nws" else 1
            for event_index, peak in enumerate(peaks):
                event_id = f"wave-fixture-{part_index}-{event_index}"
                windows.append({
                    "eventId": event_id,
                    "partId": part_id,
                    "sourceZoneId": f"zone-{part_index}",
                    "name": f"Fixture {part_index}",
                    "basin": basin,
                    "peakTime": iso(peak),
                })
                start, end = peak - timedelta(hours=24), peak + timedelta(hours=72)
                at = start
                while at <= end:
                    distance = abs((at - peak).total_seconds()) / 3600
                    height = 0.7 + max(0.0, 1.8 * (1 - distance / 24))
                    wave_records.append({
                        "partId": part_id,
                        "validTime": iso(at),
                        "significantWaveHeightM": round(height, 3),
                        "peakPeriodS": 6.0,
                        "waveOnshoreAlignment": alignments[event_index],
                    })
                    at += timedelta(hours=cadence)
                physics_at = start
                while physics_at <= end:
                    all_times_by_part[part_id].add(physics_at)
                    physics_at += timedelta(hours=1)

        targets_path.write_text(json.dumps({
            "partCount": len(target_rows),
            "zones": {"fixture-zone": target_rows},
        }), encoding="utf-8")
        wave_path.write_text(json.dumps({
            "status": "OK",
            "scoreImpact": False,
            "coordinateValuesStored": False,
            "rawVectorValuesStored": False,
            "selectedWaveWindows": windows,
            "records": wave_records,
        }), encoding="utf-8")

        for part_index, (part_id, _basin, longitude, latitude) in enumerate(PARTS):
            times = sorted(all_times_by_part[part_id])
            time_values = np.asarray([np.datetime64(value.replace(tzinfo=None), "ns") for value in times])
            shape_4d = (len(times), 1, 1, 1)
            shape_3d = (len(times), 1, 1)
            u_values = np.zeros(shape_4d, dtype=float)
            v_values = np.zeros(shape_4d, dtype=float)
            sea_values = np.zeros(shape_3d, dtype=float)
            for index, at in enumerate(times):
                current_sign = (1.0, -1.0, -1.0)[peaks.index(min(peaks, key=lambda peak: abs((peak - at).total_seconds())))]
                u_values[index, 0, 0, 0] = 0.0
                v_values[index, 0, 0, 0] = 0.2 * current_sign
                sea_values[index, 0, 0] = 0.001 * ((at - peaks[0]).total_seconds() / 3600 % 48)
            dataset = xr.Dataset(
                data_vars={
                    "uo": (("time", "depth", "latitude", "longitude"), u_values),
                    "vo": (("time", "depth", "latitude", "longitude"), v_values),
                    "zos": (("time", "latitude", "longitude"), sea_values),
                },
                coords={
                    "time": time_values,
                    "depth": [0.5],
                    "latitude": [latitude],
                    "longitude": [longitude],
                },
            )
            dataset.to_netcdf(fixtures / f"historical-forcing-{part_id}.nc")

        result = subprocess.run(
            [
                sys.executable, str(SCRIPT), "--wave-input", str(wave_path), "--targets", str(targets_path),
                "--output", str(output_path), "--summary", str(summary_path),
                "--fixture-directory", str(fixtures),
            ],
            cwd=ROOT,
            capture_output=True,
            text=True,
            check=False,
        )
        if result.returncode:
            raise AssertionError(result.stdout + result.stderr)
        document = json.loads(output_path.read_text(encoding="utf-8"))
        assert document["status"] == "OK"
        assert document["regionCount"] == 4 and document["enrichedEventCount"] == 12
        assert all(event["sampleCount"] >= 24 for event in document["eventCatalog"])
        assert document["rawUvStored"] is False and document["coordinateValuesStored"] is False
        assert document["scoreImpact"] is False and document["publicRuntime"] is False
        assert set(document["eventClassificationCounts"]) == {
            "onshore-delivery", "offshore-removal", "conflicting-wave-current", "alongshore-mixed"
        }
        forbidden = {"u", "v", "uo", "vo", "waterpoint", "landpoint", "longitude", "latitude", "geometry"}

        def inspect(value):
            if isinstance(value, dict):
                assert not (forbidden & {str(key).lower() for key in value})
                for child in value.values():
                    inspect(child)
            elif isinstance(value, list):
                for child in value:
                    inspect(child)

        inspect(document)
        assert math.isfinite(float(document["regions"][0]["currentGridDistanceKm"]))
        print("OK: historical forcing pilot is bounded, coordinate-free, vector-free and score-neutral.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
