#!/usr/bin/env python3
"""Regression for normal DMI-gap targeting and explicit full-coast mode."""
from __future__ import annotations

import json
import subprocess
import sys
import tempfile
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
SCRIPT = ROOT / "scripts/build-copernicus-target-registry.py"
AT = "2026-08-21T06:00:00Z"
SELECTION = "nearest-shared-uv-column-across-dmi-collections-then-deepest-valid-layer"


def write(path: Path, value: dict) -> None:
    path.write_text(json.dumps(value), encoding="utf-8")


def run(folder: Path, *extra: str) -> subprocess.CompletedProcess[str]:
    return subprocess.run([
        sys.executable, "-B", str(SCRIPT),
        "--targets", str(folder / "targets.json"),
        "--dmi", str(folder / "dmi.json"),
        "--output", str(folder / "selected.json"),
        "--at", AT,
        *extra,
    ], cwd=ROOT, capture_output=True, text=True, check=False)


with tempfile.TemporaryDirectory(prefix="ravradar-copernicus-targets-") as raw:
    folder = Path(raw)
    parts = [
        {"partId": "dmi-ok", "sourceZoneId": "Z1", "name": "DMI", "waterPoint": [9.0, 57.0]},
        {"partId": "dmi-far", "sourceZoneId": "Z1", "name": "Far", "waterPoint": [9.1, 57.0]},
        {"partId": "dmi-missing", "sourceZoneId": "Z2", "name": "Missing", "waterPoint": [10.0, 56.0]},
    ]
    write(folder / "targets.json", {"partCount": 3, "zones": {"Z1": parts[:2], "Z2": parts[2:]}})
    source = {
        "provider": "dmi", "vectorSemanticsVersion": 3, "verticalLayer": "depthbelowsea:5",
        "vectorSelection": SELECTION, "samplingPoint": [9.0, 57.0], "gridPoint": [9.01, 57.0],
        "distanceKm": 0.6,
    }
    write(folder / "dmi.json", {
        "currentVectorSemanticsVersion": 3, "currentVectorSelection": SELECTION, "currentMaxDistanceKm": 5,
        "zones": {
            "PART::dmi-ok": {"samplingPoint": [9.0, 57.0], "hourly": {AT: {
                "time": AT, "current-u": 0.1, "current-v": 0.2, "sources": {"current": source},
            }}},
            "PART::dmi-far": {"samplingPoint": [9.1, 57.0], "hourly": {AT: {
                "time": AT, "current-u": 0.1, "current-v": 0.2,
                "sources": {"current": {**source, "samplingPoint": [9.1, 57.0], "gridPoint": [9.3, 57.0], "distanceKm": 12}},
            }}},
        },
    })

    targeted = run(folder)
    assert targeted.returncode == 0, targeted.stdout + targeted.stderr
    selected = json.loads((folder / "selected.json").read_text(encoding="utf-8"))
    selected_parts = [part for rows in selected["zones"].values() for part in rows]
    assert selected["selectionMode"] == "dmi-gaps-only" and selected["partCount"] == 2
    assert {part["partId"] for part in selected_parts} == {"dmi-far", "dmi-missing"}
    original_points = {part["partId"]: part["waterPoint"] for part in parts}
    assert all(part["waterPoint"] == original_points[part["partId"]] for part in selected_parts)
    assert selected["coordinatesChanged"] is False

    full = run(folder, "--full-coast")
    assert full.returncode == 0, full.stdout + full.stderr
    nationwide = json.loads((folder / "selected.json").read_text(encoding="utf-8"))
    assert nationwide["selectionMode"] == "manual-full-coast" and nationwide["partCount"] == 3

    write(folder / "dmi.json", {"currentVectorSemanticsVersion": 3, "currentVectorSelection": SELECTION, "zones": {}})
    refused = run(folder)
    assert refused.returncode != 0 and "refusing implicit nationwide" in refused.stdout

workflow = (ROOT / ".github/workflows/validate-copernicus-current-pilot.yml").read_text(encoding="utf-8")
for marker in (
    "full_coast:",
    "dmi-zone-cache-v1-${{ runner.os }}-",
    "build-copernicus-target-registry.py",
    "--targets .cache/copernicus-current-targets.json",
    "--authoritative-targets data/live/coastal-parts-v2.json",
):
    assert marker in workflow, f"Copernicus workflow is missing {marker}"

production = (ROOT / ".github/workflows/update-and-deploy.yml").read_text(encoding="utf-8")
for marker in (
    "Select exact-hour DMI gaps for targeted Copernicus supplement",
    'build-copernicus-target-registry.py\n          --at "$RAVRADAR_PRODUCTION_TARGET_HOUR"',
    "Inspect targeted Copernicus coverage after fresh DMI",
    "Fill only exact-hour DMI gaps from Copernicus",
    "--targets .cache/copernicus-current-targets.json",
    "Save targeted private Copernicus supplement",
):
    assert marker in production, f"Production workflow is missing {marker}"
assert production.index("Update DMI bulk model cache") < production.index("Select exact-hour DMI gaps for targeted Copernicus supplement")
assert production.index("Save targeted private Copernicus supplement") < production.index("Build public seven-day current history and controlled live selection")

print("OK: normal Copernicus collection targets only exact-hour DMI gaps; full coast is explicit and points are unchanged.")
