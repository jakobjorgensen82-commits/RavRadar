#!/usr/bin/env python3
"""End-to-end fixture test for atomic multi-time Copernicus acquisition."""
from __future__ import annotations

import json
import subprocess
import sys
import tempfile
from datetime import datetime, timedelta, timezone
from pathlib import Path

import numpy as np
import xarray as xr

from lib.copernicus_current import (
    DMI_VERIFIER_CONTRACT_ID,
    LEGACY_HISTORY_REQUEST_CONTRACT_ID,
    file_sha256,
    required_pairs_sha256,
    validate_shadow,
)
from lib.copernicus_target_identity import target_fingerprint


ROOT = Path(__file__).resolve().parents[1]
RUNNER = ROOT / "scripts/run-copernicus-current-pilot.py"
REFERENCE = datetime(2026, 8, 29, 8, tzinfo=timezone.utc)
FUTURE = REFERENCE + timedelta(hours=117)
TARGET = {"partId": "p1", "parentZoneId": "z1", "name": "P1", "waterPoint": [9.1, 57.0]}


def write(path: Path, value: object) -> None:
    path.write_text(json.dumps(value), encoding="utf-8")


def registry(dmi_sha: str, *, include_legacy_history: bool = False) -> dict:
    pairs = [
        {"partId": "p1", "validTime": REFERENCE.isoformat().replace("+00:00", "Z")},
        {"partId": "p1", "validTime": FUTURE.isoformat().replace("+00:00", "Z")},
    ]
    if include_legacy_history:
        pairs.append({
            "partId": "p1",
            "validTime": (REFERENCE - timedelta(hours=1)).isoformat().replace("+00:00", "Z"),
        })
        pairs.sort(key=lambda row: (row["validTime"], row["partId"]))
    return {
        "schemaVersion": 2, "kind": "RAVRADAR_PRIVATE_COPERNICUS_CURRENT_RANGE_TARGET_REGISTRY",
        "matrixContractId": "exact-dmi-gap-matrix-minus48-plus117-v1",
        "selectionMode": "dmi-gaps-only",
        "productionReferenceAt": REFERENCE.isoformat().replace("+00:00", "Z"),
        "targetHour": REFERENCE.isoformat().replace("+00:00", "Z"),
        "rangeStartAt": (REFERENCE - timedelta(hours=48)).isoformat().replace("+00:00", "Z"),
        "rangeEndAt": FUTURE.isoformat().replace("+00:00", "Z"),
        "coldBridgeHours": 48, "publicHourCount": 118, "matrixHourCount": 166,
        "targetCount": 1, "sourcePartCount": 1, "partCount": 1,
        "targetRegistrySha256": target_fingerprint([TARGET]),
        "dmiCurrentInputSha256": dmi_sha, "dmiVerifierContractId": DMI_VERIFIER_CONTRACT_ID,
        "requiredPairsSha256": required_pairs_sha256(pairs), "requiredPairCount": len(pairs),
        "dmiVerifiedPairCount": 166 - len(pairs), "totalPairCount": 166,
        "coordinatesChanged": False,
        "targets": [TARGET], "requiredPairs": pairs,
        "zones": {"z1": [{
            "partId": "p1", "sourceZoneId": "z1", "name": "P1", "waterPoint": TARGET["waterPoint"],
        }]},
    }


def legacy_record(valid_time: datetime) -> dict:
    return {
        "partId": "p1", "parentZoneId": "z1", "name": "P1",
        "samplingPoint": TARGET["waterPoint"], "source": "copernicus-baltic-nemo",
        "productId": "BALTICSEA_ANALYSISFORECAST_PHY_003_006",
        "datasetId": "cmems_mod_bal_phy_anfc_PT1H-i", "datasetVersion": "202411",
        "validTime": valid_time.isoformat().replace("+00:00", "Z"),
        "gridPoint": TARGET["waterPoint"], "distanceKm": 0.0,
        "verticalLayerM": 5.0, "layerQuality": "deepest-common-layer", "sharedLayerCount": 1,
        "uMps": 0.05, "vMps": 0.02,
        "componentPair": "same-time-cell-layer", "interpolation": False,
    }


def run(folder: Path, shadow_name: str = "cache.json", fixture_name: str = "fixtures") -> subprocess.CompletedProcess[str]:
    return subprocess.run([
        sys.executable, "-B", str(RUNNER),
        "--targets", str(folder / "registry.json"),
        "--authoritative-targets", str(folder / "targets.json"),
        "--shadow", str(folder / shadow_name),
        "--report", str(folder / f"{shadow_name}.report.json"),
        "--summary", str(folder / f"{shadow_name}.summary.txt"),
        "--at", REFERENCE.isoformat().replace("+00:00", "Z"),
        "--acquisition-at", (REFERENCE + timedelta(minutes=10)).isoformat().replace("+00:00", "Z"),
        "--fixture-directory", str(folder / fixture_name),
    ], cwd=ROOT, capture_output=True, text=True, check=False)


with tempfile.TemporaryDirectory(prefix="ravradar-copernicus-range-runner-") as raw_folder:
    folder = Path(raw_folder)
    fixtures = folder / "fixtures"
    fixtures.mkdir()
    write(folder / "targets.json", {"partCount": 1, "zones": {"z1": [{
        "partId": "p1", "sourceZoneId": "z1", "name": "P1", "waterPoint": TARGET["waterPoint"],
    }]}})
    write(folder / "dmi.json", {"fixture": "bound-by-registry"})
    write(folder / "registry.json", registry(file_sha256(folder / "dmi.json")))
    values_u = np.array([[[[0.1]]], [[[0.2]]]], dtype=float)
    values_v = np.array([[[[0.3]]], [[[0.4]]]], dtype=float)
    data = xr.Dataset(
        data_vars={
            "uo": (("time", "depth", "latitude", "longitude"), values_u),
            "vo": (("time", "depth", "latitude", "longitude"), values_v),
        },
        coords={
            "time": np.array([
                REFERENCE.replace(tzinfo=None).isoformat(), FUTURE.replace(tzinfo=None).isoformat(),
            ], dtype="datetime64[s]"),
            "depth": [5.0], "latitude": [57.0], "longitude": [9.1],
        },
    )
    fixture = fixtures / "copernicus-baltic-nemo.nc"
    data.to_netcdf(fixture)
    raw_subset_sha = file_sha256(fixture)

    completed = run(folder)
    assert completed.returncode == 0, completed.stdout + completed.stderr
    cache = validate_shadow(json.loads((folder / "cache.json").read_text(encoding="utf-8")), {"p1": TARGET}, require_collection=True)
    assert len(cache["records"]) == 2 and len(cache["collections"][0]["recordRefs"]) == 2
    assert cache["acquisitions"][0]["subsetSha256"] == raw_subset_sha
    assert cache["acquisitions"][0]["requestStartAt"] == REFERENCE.isoformat().replace("+00:00", "Z")
    assert cache["acquisitions"][0]["requestEndAt"] == FUTURE.isoformat().replace("+00:00", "Z")
    report_text = (folder / "cache.json.report.json").read_text(encoding="utf-8").lower()
    assert all(token not in report_text for token in ("samplingpoint", "gridpoint", "umps", "vmps"))

    # The real schema-1 cache had a cache-level updatedAt but no guaranteed
    # per-row capturedAt.  It may contribute historical rows once, never the
    # target/future range.  A second identical run must read schema 2 directly
    # and create neither another migration acquisition nor changed cache bytes.
    write(folder / "registry.json", registry(
        file_sha256(folder / "dmi.json"),
        include_legacy_history=True,
    ))
    legacy_path = folder / "legacy-cache.json"
    write(legacy_path, {
        "schemaVersion": 1, "retentionHours": 168,
        "scoreImpact": False, "publicRuntime": False,
        "updatedAt": (REFERENCE - timedelta(minutes=10)).isoformat().replace("+00:00", "Z"),
        "collections": [],
        "records": [
            legacy_record(REFERENCE - timedelta(hours=1)),
            legacy_record(REFERENCE),
        ],
    })
    migrated_run = run(folder, "legacy-cache.json")
    assert migrated_run.returncode == 0, migrated_run.stdout + migrated_run.stderr
    assert all(token not in (migrated_run.stdout + migrated_run.stderr).lower()
               for token in ("samplingpoint", "gridpoint", "umps", "vmps"))
    migrated_cache = validate_shadow(
        json.loads(legacy_path.read_text(encoding="utf-8")),
        {"p1": TARGET},
        require_collection=True,
    )
    migrated_acquisitions = [
        row for row in migrated_cache["acquisitions"]
        if row["requestContractId"] == LEGACY_HISTORY_REQUEST_CONTRACT_ID
    ]
    assert len(migrated_acquisitions) == 1
    assert [row["validTime"] for row in migrated_cache["records"]
            if row["acquisitionId"] == migrated_acquisitions[0]["acquisitionId"]] == [
                (REFERENCE - timedelta(hours=1)).isoformat().replace("+00:00", "Z")
            ]
    migrated_bytes = legacy_path.read_bytes()
    migrated_again = run(folder, "legacy-cache.json")
    assert migrated_again.returncode == 0, migrated_again.stdout + migrated_again.stderr
    assert legacy_path.read_bytes() == migrated_bytes
    second_report = json.loads((folder / "legacy-cache.json.report.json").read_text(encoding="utf-8"))
    assert second_report["newAcquisitionCount"] == 0
    assert migrated_cache["collections"][0]["requiredPairCount"] == 3
    write(folder / "registry.json", registry(file_sha256(folder / "dmi.json")))

    # A raw subset without every requested native time must fail before any
    # cache replace or COMPLETE seal is created.
    incomplete_dir = folder / "incomplete"
    incomplete_dir.mkdir()
    data.isel(time=[0]).to_netcdf(incomplete_dir / "copernicus-baltic-nemo.nc")
    failed = run(folder, "incomplete-cache.json", "incomplete")
    assert failed.returncode != 0 and "missing 1 exact requested native hour" in failed.stderr
    assert not (folder / "incomplete-cache.json").exists()
    assert not (folder / "incomplete-cache.json.tmp").exists()

    # Full verified DMI coverage still needs a COMPLETE zero-gap seal.  It must
    # require neither credentials nor a synthetic Copernicus record.
    zero_gap = registry(file_sha256(folder / "dmi.json"))
    zero_gap.update({
        "partCount": 0,
        "requiredPairs": [],
        "requiredPairCount": 0,
        "requiredPairsSha256": required_pairs_sha256([]),
        "dmiVerifiedPairCount": 166,
        "zones": {},
    })
    write(folder / "registry.json", zero_gap)
    zero_completed = run(folder, "zero-gap-cache.json")
    assert zero_completed.returncode == 0, zero_completed.stdout + zero_completed.stderr
    zero_cache = validate_shadow(
        json.loads((folder / "zero-gap-cache.json").read_text(encoding="utf-8")),
        {"p1": TARGET},
        require_collection=True,
    )
    assert zero_cache["acquisitions"] == [] and zero_cache["records"] == []
    assert zero_cache["collections"][0]["requiredPairCount"] == 0

print("OK: multi-time runner hashes raw subset before parse and seals only complete atomic coverage.")
