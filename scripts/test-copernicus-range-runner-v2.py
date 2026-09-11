#!/usr/bin/env python3
"""End-to-end fixture test for atomic multi-time Copernicus acquisition."""
from __future__ import annotations

import json
import runpy
import subprocess
import sys
import tempfile
from datetime import datetime, timedelta, timezone
from pathlib import Path
from unittest.mock import patch

import numpy as np
import xarray as xr

from lib.copernicus_current import (
    DMI_VERIFIER_CONTRACT_ID,
    LEGACY_HISTORY_REQUEST_CONTRACT_ID,
    OPERATIONAL_MATRIX_CONTRACT_ID,
    canonical_sha256,
    file_sha256,
    required_pairs_sha256,
    validate_shadow,
)
from lib.copernicus_target_identity import target_fingerprint
from lib.copernicus_current_donor_bank import validate_copernicus_donor_bank
from lib.copernicus_current_source_stage import validate_source_stage
from lib.current_operational_closure import (
    ADVISORY_ASSIGNMENT_CONTRACT_ID,
    ADVISORY_RECORD_REF_CONTRACT_ID,
    COPERNICUS_ADVISORY_PAST_MODEL_FIELD,
)


ROOT = Path(__file__).resolve().parents[1]
RUNNER = ROOT / "scripts/run-copernicus-current-pilot.py"
CHECKER = ROOT / "scripts/check-copernicus-current-range.py"
LIVE_CURRENT = runpy.run_path(str(ROOT / "scripts/build-live-current-pilot.py"))
OPEN_METEO_CURRENT = runpy.run_path(
    str(ROOT / "scripts/fill-open-meteo-current-fallback.py")
)
REFERENCE = datetime(2026, 8, 29, 8, tzinfo=timezone.utc)
FUTURE = REFERENCE + timedelta(hours=117)
TARGET = {"partId": "p1", "parentZoneId": "z1", "name": "P1", "waterPoint": [9.1, 57.0]}
RESUME_TARGETS = [
    {"partId": "p1", "parentZoneId": "z1", "name": "P1", "waterPoint": [10.0, 57.0]},
    {"partId": "p2", "parentZoneId": "z1", "name": "P2", "waterPoint": [12.0, 57.0]},
]


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


def operational_registry(dmi_sha: str) -> dict:
    operational_pairs = [
        {"partId": "p1", "validTime": REFERENCE.isoformat().replace("+00:00", "Z")},
        {"partId": "p1", "validTime": FUTURE.isoformat().replace("+00:00", "Z")},
    ]
    advisory_pairs = [{
        "partId": "p1",
        "validTime": (REFERENCE - timedelta(hours=1)).isoformat().replace("+00:00", "Z"),
    }]
    return {
        "schemaVersion": 3,
        "kind": "RAVRADAR_PRIVATE_COPERNICUS_CURRENT_RANGE_TARGET_REGISTRY",
        "matrixContractId": OPERATIONAL_MATRIX_CONTRACT_ID,
        "selectionMode": "dmi-gaps-only",
        "productionReferenceAt": REFERENCE.isoformat().replace("+00:00", "Z"),
        "targetHour": REFERENCE.isoformat().replace("+00:00", "Z"),
        "rangeStartAt": (REFERENCE - timedelta(hours=48)).isoformat().replace("+00:00", "Z"),
        "rangeEndAt": FUTURE.isoformat().replace("+00:00", "Z"),
        "coldBridgeHours": 48, "publicHourCount": 118, "matrixHourCount": 166,
        "operationalRangeStartAt": REFERENCE.isoformat().replace("+00:00", "Z"),
        "operationalRangeEndAt": FUTURE.isoformat().replace("+00:00", "Z"),
        "operationalHourCount": 118,
        "advisoryHistoryStartAt": (REFERENCE - timedelta(hours=48)).isoformat().replace("+00:00", "Z"),
        "advisoryHistoryEndAt": (REFERENCE - timedelta(hours=1)).isoformat().replace("+00:00", "Z"),
        "advisoryHistoryHourCount": 48,
        "targetCount": 1, "sourcePartCount": 1, "partCount": 1,
        "operationalPartCount": 1, "advisoryHistoryPartCount": 1,
        "targetRegistrySha256": target_fingerprint([TARGET]),
        "dmiCurrentInputSha256": dmi_sha,
        "dmiVerifierContractId": DMI_VERIFIER_CONTRACT_ID,
        "operationalRequiredPairsSha256": required_pairs_sha256(operational_pairs),
        "operationalRequiredPairCount": len(operational_pairs),
        "operationalDmiVerifiedPairCount": 118 - len(operational_pairs),
        "operationalTotalPairCount": 118,
        "advisoryHistoryRequiredPairsSha256": required_pairs_sha256(advisory_pairs),
        "advisoryHistoryRequiredPairCount": len(advisory_pairs),
        "advisoryHistoryDmiVerifiedPairCount": 48 - len(advisory_pairs),
        "advisoryHistoryTotalPairCount": 48,
        "dmiVerifiedPairCount": 163, "totalPairCount": 166,
        "coordinatesChanged": False,
        "targets": [TARGET],
        "operationalRequiredPairs": operational_pairs,
        "advisoryHistoryRequiredPairs": advisory_pairs,
        "zones": {"z1": [{
            "partId": "p1", "sourceZoneId": "z1", "name": "P1", "waterPoint": TARGET["waterPoint"],
        }]},
    }


def resume_registry(dmi_sha: str) -> dict:
    operational_pairs = sorted([
        {"partId": target["partId"], "validTime": valid_time.isoformat().replace("+00:00", "Z")}
        for target in RESUME_TARGETS
        for valid_time in (REFERENCE, FUTURE)
    ], key=lambda row: (row["validTime"], row["partId"]))
    advisory_pairs: list[dict[str, str]] = []
    return {
        "schemaVersion": 3,
        "kind": "RAVRADAR_PRIVATE_COPERNICUS_CURRENT_RANGE_TARGET_REGISTRY",
        "matrixContractId": OPERATIONAL_MATRIX_CONTRACT_ID,
        "selectionMode": "dmi-gaps-only",
        "productionReferenceAt": REFERENCE.isoformat().replace("+00:00", "Z"),
        "targetHour": REFERENCE.isoformat().replace("+00:00", "Z"),
        "rangeStartAt": (REFERENCE - timedelta(hours=48)).isoformat().replace("+00:00", "Z"),
        "rangeEndAt": FUTURE.isoformat().replace("+00:00", "Z"),
        "coldBridgeHours": 48, "publicHourCount": 118, "matrixHourCount": 166,
        "operationalRangeStartAt": REFERENCE.isoformat().replace("+00:00", "Z"),
        "operationalRangeEndAt": FUTURE.isoformat().replace("+00:00", "Z"),
        "operationalHourCount": 118,
        "advisoryHistoryStartAt": (REFERENCE - timedelta(hours=48)).isoformat().replace("+00:00", "Z"),
        "advisoryHistoryEndAt": (REFERENCE - timedelta(hours=1)).isoformat().replace("+00:00", "Z"),
        "advisoryHistoryHourCount": 48,
        "targetCount": 2, "sourcePartCount": 2, "partCount": 2,
        "operationalPartCount": 2, "advisoryHistoryPartCount": 0,
        "targetRegistrySha256": target_fingerprint(RESUME_TARGETS),
        "dmiCurrentInputSha256": dmi_sha,
        "dmiVerifierContractId": DMI_VERIFIER_CONTRACT_ID,
        "operationalRequiredPairsSha256": required_pairs_sha256(operational_pairs),
        "operationalRequiredPairCount": 4,
        "operationalDmiVerifiedPairCount": 232,
        "operationalTotalPairCount": 236,
        "advisoryHistoryRequiredPairsSha256": required_pairs_sha256(advisory_pairs),
        "advisoryHistoryRequiredPairCount": 0,
        "advisoryHistoryDmiVerifiedPairCount": 96,
        "advisoryHistoryTotalPairCount": 96,
        "dmiVerifiedPairCount": 328, "totalPairCount": 332,
        "coordinatesChanged": False,
        "targets": RESUME_TARGETS,
        "operationalRequiredPairs": operational_pairs,
        "advisoryHistoryRequiredPairs": advisory_pairs,
        "zones": {"z1": [
            {"partId": row["partId"], "sourceZoneId": "z1", "name": row["name"], "waterPoint": row["waterPoint"]}
            for row in RESUME_TARGETS
        ]},
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


def run(
    folder: Path,
    shadow_name: str = "cache.json",
    fixture_name: str = "fixtures",
    *,
    refresh_only: bool = False,
    acquisition_minutes: int = 10,
) -> subprocess.CompletedProcess[str]:
    command = [
        sys.executable, "-B", str(RUNNER),
        "--targets", str(folder / "registry.json"),
        "--authoritative-targets", str(folder / "targets.json"),
        "--shadow", str(folder / shadow_name),
        "--source-stage", str(folder / f"{shadow_name}.source-stage.json"),
        "--report", str(folder / f"{shadow_name}.report.json"),
        "--summary", str(folder / f"{shadow_name}.summary.txt"),
        "--at", REFERENCE.isoformat().replace("+00:00", "Z"),
        "--acquisition-at", (REFERENCE + timedelta(minutes=acquisition_minutes)).isoformat().replace("+00:00", "Z"),
        "--fixture-directory", str(folder / fixture_name),
    ]
    if refresh_only:
        command.append("--refresh-only")
    return subprocess.run(
        command, cwd=ROOT, capture_output=True, text=True, check=False,
    )


def require_complete(folder: Path, shadow_name: str) -> subprocess.CompletedProcess[str]:
    return subprocess.run([
        sys.executable, "-B", str(CHECKER),
        "--shadow", str(folder / shadow_name),
        "--source-stage", str(folder / f"{shadow_name}.source-stage.json"),
        "--registry", str(folder / "registry.json"),
        "--dmi", str(folder / "dmi.json"),
        "--targets", str(folder / "targets.json"),
        "--at", REFERENCE.isoformat().replace("+00:00", "Z"),
        "--require-complete",
        "--require-source-stage-ready",
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

    # Schema 3 must keep complete target..+117 operation deployable even when
    # bounded advisory backfill cannot recover the historical DMI gap.
    write(folder / "registry.json", operational_registry(file_sha256(folder / "dmi.json")))
    operational_run = run(folder, "operational-cache.json")
    assert operational_run.returncode == 0, operational_run.stdout + operational_run.stderr
    operational_cache = validate_shadow(
        json.loads((folder / "operational-cache.json").read_text(encoding="utf-8")),
        {"p1": TARGET},
        require_collection=True,
    )
    operational_seal = operational_cache["collections"][0]
    assert operational_seal["status"] == "OPERATIONAL_COMPLETE"
    assert len(operational_seal["operationalRecordRefs"]) == 2
    assert operational_seal["advisoryHistoryRecordRefs"] == []
    assert operational_seal["advisoryHistoryMissingPairCount"] == 1
    assert operational_seal["advisoryHistoryComplete"] is False
    operational_report = json.loads(
        (folder / "operational-cache.json.report.json").read_text(encoding="utf-8")
    )
    assert operational_report["operationalSealComplete"] is True
    assert operational_report["historySyntheticPairCount"] == 0
    assert operational_report["advisoryHistoryFill"]["status"] == "BOUNDED_INCOMPLETE"
    assert operational_report["advisoryHistoryFill"]["exhaustionAttested"] is False
    operational_gate = require_complete(folder, "operational-cache.json")
    assert operational_gate.returncode == 0, operational_gate.stdout + operational_gate.stderr

    # One past exact DMI gap is acquired from Baltic after operational closure.
    # It remains advisory: the same operational deploy gate passes, and no
    # interpolation, carry, regional source or exhaustion claim is introduced.
    advisory_fixtures = folder / "advisory-fixtures"
    advisory_fixtures.mkdir()
    advisory_data = xr.Dataset(
        data_vars={
            "uo": (("time", "depth", "latitude", "longitude"), np.array([
                [[[0.05]]], [[[0.1]]], [[[0.2]]],
            ], dtype=float)),
            "vo": (("time", "depth", "latitude", "longitude"), np.array([
                [[[0.15]]], [[[0.3]]], [[[0.4]]],
            ], dtype=float)),
        },
        coords={
            "time": np.array([
                (REFERENCE - timedelta(hours=1)).replace(tzinfo=None).isoformat(),
                REFERENCE.replace(tzinfo=None).isoformat(),
                FUTURE.replace(tzinfo=None).isoformat(),
            ], dtype="datetime64[s]"),
            "depth": [5.0], "latitude": [57.0], "longitude": [9.1],
        },
    )
    advisory_data.to_netcdf(advisory_fixtures / "copernicus-baltic-nemo.nc")
    advisory_run = run(folder, "advisory-cache.json", "advisory-fixtures")
    assert advisory_run.returncode == 0, advisory_run.stdout + advisory_run.stderr
    primary_advisory_cache = validate_shadow(
        json.loads((folder / "advisory-cache.json").read_text(encoding="utf-8")),
        {"p1": TARGET},
        require_collection=True,
    )
    primary_advisory_seal = primary_advisory_cache["collections"][0]
    assert primary_advisory_seal["advisoryHistoryRecordRefs"] == []
    assert primary_advisory_seal["advisoryHistoryMissingPairCount"] == 1
    primary_advisory_report = json.loads(
        (folder / "advisory-cache.json.report.json").read_text(encoding="utf-8")
    )
    assert primary_advisory_report["advisoryHistoryFill"]["status"] == (
        "BOUNDED_INCOMPLETE"
    )
    assert primary_advisory_report["advisoryHistoryFill"]["acquiredPairCount"] == 0
    assert primary_advisory_report["advisoryHistoryFill"]["attemptedShardCount"] == 0

    advisory_refresh = run(
        folder,
        "advisory-cache.json",
        "advisory-fixtures",
        refresh_only=True,
        acquisition_minutes=20,
    )
    assert advisory_refresh.returncode == 0, (
        advisory_refresh.stdout + advisory_refresh.stderr
    )
    refreshed_before_primary = validate_shadow(
        json.loads((folder / "advisory-cache.json").read_text(encoding="utf-8")),
        {"p1": TARGET},
        require_collection=True,
    )
    advisory_record_ids_before_primary = {
        row["recordId"] for row in refreshed_before_primary["records"]
        if row["validTime"]
        == (REFERENCE - timedelta(hours=1)).isoformat().replace("+00:00", "Z")
    }
    assert len(advisory_record_ids_before_primary) == 1

    advisory_run = run(
        folder,
        "advisory-cache.json",
        "advisory-fixtures",
        acquisition_minutes=30,
    )
    assert advisory_run.returncode == 0, advisory_run.stdout + advisory_run.stderr
    advisory_cache = validate_shadow(
        json.loads((folder / "advisory-cache.json").read_text(encoding="utf-8")),
        {"p1": TARGET},
        require_collection=True,
    )
    advisory_seal = advisory_cache["collections"][0]
    assert advisory_seal["status"] == "OPERATIONAL_COMPLETE"
    assert len(advisory_seal["operationalRecordRefs"]) == 2
    assert len(advisory_seal["advisoryHistoryRecordRefs"]) == 1
    assert advisory_seal["advisoryHistoryMissingPairCount"] == 0
    assert advisory_seal["advisoryHistoryComplete"] is True
    assert advisory_record_ids_before_primary == {
        row["recordId"] for row in advisory_cache["records"]
        if row["validTime"]
        == (REFERENCE - timedelta(hours=1)).isoformat().replace("+00:00", "Z")
    }
    advisory_report = json.loads(
        (folder / "advisory-cache.json.report.json").read_text(encoding="utf-8")
    )
    assert advisory_report["advisoryHistoryFill"] == {
        "status": "COMPLETE",
        "requiredPairCount": 1,
        "initialAvailablePairCount": 1,
        "acquiredPairCount": 0,
        "availablePairCount": 1,
        "missingPairCount": 0,
        "attemptedShardCount": 0,
        "completedShardCount": 0,
        "failedShardCount": 0,
        "boundedWorkRemaining": False,
        "budgetReached": False,
        "exhaustionAttested": False,
        "regionalHistoryUsed": False,
        "interpolationCarryOrLoanUsed": False,
        "newAcquisitionCount": 0,
    }
    advisory_gate = require_complete(folder, "advisory-cache.json")
    assert advisory_gate.returncode == 0, advisory_gate.stdout + advisory_gate.stderr
    advisory_ref = advisory_seal["advisoryHistoryRecordRefs"][0]
    advisory_identity = {
        **advisory_ref,
        "classification": COPERNICUS_ADVISORY_PAST_MODEL_FIELD,
        "recordRefSha256": canonical_sha256({
            "contractId": ADVISORY_RECORD_REF_CONTRACT_ID,
            "recordRef": advisory_ref,
        }),
    }
    advisory_assignment = {
        **advisory_identity,
        "assignmentSha256": canonical_sha256({
            "schemaVersion": 1,
            "contractId": ADVISORY_ASSIGNMENT_CONTRACT_ID,
            "assignment": advisory_identity,
        }),
    }
    selected, projected_seal, projected_advisory = LIVE_CURRENT["copernicus_entries"](
        advisory_cache,
        {"p1": TARGET},
        [],
        {
            "productionReferenceAt": REFERENCE.isoformat().replace("+00:00", "Z"),
            "closureId": "fixture-closure",
            "advisoryHistoryAssignments": [advisory_assignment],
        },
    )
    assert selected == []
    assert projected_seal["status"] == "OPERATIONAL_COMPLETE"
    assert projected_seal["targetRegistrySha256"] == target_fingerprint([TARGET])
    assert projected_seal["dmiCurrentInputSha256"] == file_sha256(folder / "dmi.json")
    assert (
        projected_seal["advisoryHistoryRecordRefsSha256"]
        == advisory_seal["advisoryHistoryRecordRefsSha256"]
    )
    assert len(projected_advisory) == 1
    assert projected_advisory[0]["recordId"] == (
        advisory_seal["advisoryHistoryRecordRefs"][0]["recordId"]
    )
    assert projected_advisory[0]["acquisitionId"] == (
        advisory_seal["advisoryHistoryRecordRefs"][0]["acquisitionId"]
    )
    assert projected_advisory[0]["collectionId"] == "fixture-closure"
    assert projected_advisory[0]["validTime"] == (
        REFERENCE - timedelta(hours=1)
    ).isoformat().replace("+00:00", "Z")
    assert projected_advisory[0]["source"] == "copernicus-baltic-nemo"
    assert (
        projected_advisory[0]["classification"]
        == COPERNICUS_ADVISORY_PAST_MODEL_FIELD
    )
    assert projected_advisory[0]["interpolation"] is False
    write(folder / "registry.json", registry(file_sha256(folder / "dmi.json")))

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

    # A raw subset may honestly omit one requested native time.  Its valid
    # sibling is checkpointed, and only the residual pair reaches AMM15.
    incomplete_dir = folder / "incomplete"
    incomplete_dir.mkdir()
    data.isel(time=[0]).to_netcdf(incomplete_dir / "copernicus-baltic-nemo.nc")
    data.isel(time=[1]).to_netcdf(incomplete_dir / "copernicus-nws-amm15.nc")
    partial_then_fallback = run(folder, "incomplete-cache.json", "incomplete")
    assert partial_then_fallback.returncode == 0, partial_then_fallback.stdout + partial_then_fallback.stderr
    partial_cache = validate_shadow(
        json.loads((folder / "incomplete-cache.json").read_text(encoding="utf-8")),
        {"p1": TARGET},
        require_collection=True,
    )
    selected_sources = {
        row["validTime"]: next(
            acquisition["source"] for acquisition in partial_cache["acquisitions"]
            if acquisition["acquisitionId"] == row["acquisitionId"]
        )
        for row in partial_cache["records"]
    }
    assert selected_sources == {
        REFERENCE.isoformat().replace("+00:00", "Z"): "copernicus-baltic-nemo",
        FUTURE.isoformat().replace("+00:00", "Z"): "copernicus-nws-amm15",
    }
    acquisition_by_source = {row["source"]: row for row in partial_cache["acquisitions"]}
    assert acquisition_by_source["copernicus-baltic-nemo"]["recordCount"] == 1
    assert acquisition_by_source["copernicus-baltic-nemo"]["nativeValidTimes"] == [
        REFERENCE.isoformat().replace("+00:00", "Z"),
    ]
    assert acquisition_by_source["copernicus-nws-amm15"]["recordCount"] == 1
    assert acquisition_by_source["copernicus-nws-amm15"]["nativeValidTimes"] == [
        FUTURE.isoformat().replace("+00:00", "Z"),
    ]
    assert not (folder / "incomplete-cache.json.tmp").exists()

    # Exercise the real schema-3 path. Baltic returns one exact sibling and
    # honestly omits the other native hour. A failed AMM15 shard leaves an
    # atomic, donor-backed IN_PROGRESS checkpoint. On resume Baltic is not
    # repeated; a structurally valid AMM15 response without the residual hour
    # completes its attempt and exposes exactly that pair at the Open-Meteo
    # source-stage boundary.
    operational_partial = folder / "operational-partial"
    operational_partial.mkdir()
    partial_fixtures = operational_partial / "partial-fixtures"
    residual_fixtures = operational_partial / "residual-fixtures"
    partial_fixtures.mkdir()
    residual_fixtures.mkdir()
    write(operational_partial / "targets.json", {"partCount": 1, "zones": {"z1": [{
        "partId": "p1", "sourceZoneId": "z1", "name": "P1", "waterPoint": TARGET["waterPoint"],
    }]}})
    write(operational_partial / "dmi.json", {"fixture": "operational-partial"})
    operational_partial_registry = operational_registry(
        file_sha256(operational_partial / "dmi.json")
    )
    write(operational_partial / "registry.json", operational_partial_registry)
    data.isel(time=[0]).to_netcdf(
        partial_fixtures / "copernicus-baltic-nemo.nc"
    )

    partial_interrupted = run(
        operational_partial, "cache.json", "partial-fixtures"
    )
    assert partial_interrupted.returncode == 75, (
        partial_interrupted.stdout + partial_interrupted.stderr
    )
    partial_checkpoint = validate_shadow(
        json.loads((operational_partial / "cache.json").read_text(encoding="utf-8")),
        {"p1": TARGET},
    )
    assert partial_checkpoint["collections"] == []
    assert len(partial_checkpoint["acquisitions"]) == 1
    assert len(partial_checkpoint["records"]) == 1
    assert partial_checkpoint["records"][0]["validTime"] == (
        REFERENCE.isoformat().replace("+00:00", "Z")
    )
    assert partial_checkpoint["acquisitions"][0]["nativeValidTimes"] == [
        REFERENCE.isoformat().replace("+00:00", "Z")
    ]
    partial_stage = json.loads(
        (operational_partial / "cache.json.source-stage.json").read_text(encoding="utf-8")
    )
    assert partial_stage["status"] == "IN_PROGRESS"
    assert partial_stage["missingPairCount"] == 1
    assert len(partial_stage["attempts"]) == 1
    assert partial_stage["attempts"][0]["source"] == "copernicus-baltic-nemo"
    assert partial_stage["attempts"][0]["requestedPairCount"] == 2
    assert partial_stage["attempts"][0]["parsedRecordCount"] == 1
    assert partial_stage["attempts"][0]["observedNativeValidTimes"] == [
        REFERENCE.isoformat().replace("+00:00", "Z")
    ]
    validate_copernicus_donor_bank(
        json.loads((operational_partial / "copernicus-current-donor-bank.json").read_text(
            encoding="utf-8"
        )),
        targets=[TARGET],
    )

    data.isel(time=[0]).to_netcdf(
        residual_fixtures / "copernicus-nws-amm15.nc"
    )
    partial_resumed = run(
        operational_partial, "cache.json", "residual-fixtures"
    )
    assert partial_resumed.returncode == 0, (
        partial_resumed.stdout + partial_resumed.stderr
    )
    assert "source=copernicus-baltic-nemo" not in partial_resumed.stderr
    residual_cache = validate_shadow(
        json.loads((operational_partial / "cache.json").read_text(encoding="utf-8")),
        {"p1": TARGET},
    )
    assert len(residual_cache["acquisitions"]) == 1
    assert len(residual_cache["records"]) == 1
    residual_stage = json.loads(
        (operational_partial / "cache.json.source-stage.json").read_text(encoding="utf-8")
    )
    assert residual_stage["status"] == "READY"
    assert residual_stage["missingPairs"] == [{
        "partId": "p1",
        "validTime": FUTURE.isoformat().replace("+00:00", "Z"),
    }]
    assert [row["source"] for row in residual_stage["attempts"]] == [
        "copernicus-baltic-nemo", "copernicus-nws-amm15",
    ]
    assert residual_stage["attempts"][1]["parsedRecordCount"] == 0
    assert residual_stage["attempts"][1]["observedNativeValidTimes"] == []
    validate_source_stage(
        residual_stage,
        registry=operational_partial_registry,
        shadow=residual_cache,
        target_identities={"p1": TARGET},
        shadow_sha256=file_sha256(operational_partial / "cache.json"),
    )
    validate_copernicus_donor_bank(
        json.loads((operational_partial / "copernicus-current-donor-bank.json").read_text(
            encoding="utf-8"
        )),
        targets=[TARGET],
    )

    # Keep the real schema-3 cache/stage validation and source-order selector
    # across the Copernicus -> Open-Meteo seam.  Only the separate DMI ledger
    # authorization and regional provider are fixtures here.  The valid Baltic
    # sibling must stay in Copernicus; exactly the absent future hour proceeds.
    captured_open_meteo_residual: list[dict[str, str]] = []

    def regional_fixture(**kwargs):
        captured_open_meteo_residual.extend(
            dict(row) for row in kwargs["residual_pairs"]
        )
        return {
            "openMeteoRequiredPairs": [
                dict(row) for row in kwargs["residual_pairs"]
            ],
            "regionalPrivate": {"fixture": "schema-3-seam"},
            "regionalDiagnostics": {},
        }

    with patch.dict(OPEN_METEO_CURRENT["residual_plan"].__globals__, {
        "current_attestation_authorization_from_operational_ledger": (
            lambda _ledger: (set(), set())
        ),
        "canonical_verified_part_current_attestation": (
            lambda *_args, **_kwargs: {"fixture": "valid-dmi-attestation"}
        ),
        "build_regional_residual_plan": regional_fixture,
    }):
        open_meteo_plan = OPEN_METEO_CURRENT["residual_plan"](
            targets=[TARGET],
            dmi={"diagnostics": {"currentOperationalLedger": {
                "fixture": "schema-3-seam-ledger",
            }}},
            registry=operational_partial_registry,
            copernicus=residual_cache,
            source_stage=residual_stage,
            regional={},
            policy={},
            reference=REFERENCE.isoformat().replace("+00:00", "Z"),
            copernicus_path=operational_partial / "cache.json",
            dmi_path=operational_partial / "dmi.json",
        )
    exact_open_meteo_residual = [{
        "partId": "p1",
        "validTime": FUTURE.isoformat().replace("+00:00", "Z"),
    }]
    assert captured_open_meteo_residual == exact_open_meteo_residual
    assert open_meteo_plan["requiredPairs"] == exact_open_meteo_residual
    assert open_meteo_plan["sourceStageStatus"] == "READY"
    assert {
        row["validTime"] for row in open_meteo_plan["requiredPairs"]
    } == {FUTURE.isoformat().replace("+00:00", "Z")}

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

    # A failed later shard must leave a valid unsealed checkpoint.  A second
    # run can finish with only the missing shard fixture, proving true resume.
    resume_folder = folder / "resume"
    resume_folder.mkdir()
    partial_fixtures = resume_folder / "partial-fixtures"
    resumed_fixtures = resume_folder / "resumed-fixtures"
    partial_fixtures.mkdir()
    resumed_fixtures.mkdir()
    write(resume_folder / "targets.json", {
        "partCount": 2,
        "zones": {"z1": [
            {"partId": row["partId"], "sourceZoneId": "z1", "name": row["name"], "waterPoint": row["waterPoint"]}
            for row in RESUME_TARGETS
        ]},
    })
    write(resume_folder / "dmi.json", {"fixture": "resume-bound-by-registry"})
    write(resume_folder / "registry.json", resume_registry(file_sha256(resume_folder / "dmi.json")))
    source = "copernicus-baltic-nemo"
    data.assign_coords(longitude=[10.0]).to_netcdf(partial_fixtures / f"{source}-000.nc")

    interrupted = run(resume_folder, "cache.json", "partial-fixtures")
    assert interrupted.returncode == 75
    assert "source=copernicus-baltic-nemo, shardIndex=1" in interrupted.stderr
    checkpoint = validate_shadow(
        json.loads((resume_folder / "cache.json").read_text(encoding="utf-8")),
        {row["partId"]: row for row in RESUME_TARGETS},
    )
    assert checkpoint["collections"] == []
    assert len(checkpoint["acquisitions"]) == 1 and len(checkpoint["records"]) == 2
    assert not (resume_folder / "cache.json.tmp").exists()

    (partial_fixtures / f"{source}-000.nc").unlink()
    data.assign_coords(longitude=[12.0]).to_netcdf(resumed_fixtures / f"{source}-001.nc")
    resumed = run(resume_folder, "cache.json", "resumed-fixtures")
    assert resumed.returncode == 0, resumed.stdout + resumed.stderr
    assert "remainingOperationalPairs=0" in resumed.stdout
    completed_checkpoint = validate_shadow(
        json.loads((resume_folder / "cache.json").read_text(encoding="utf-8")),
        {row["partId"]: row for row in RESUME_TARGETS},
        require_collection=True,
    )
    assert len(completed_checkpoint["acquisitions"]) == 2
    assert len(completed_checkpoint["records"]) == 4
    assert completed_checkpoint["collections"][0]["status"] == "OPERATIONAL_COMPLETE"

print("OK: multi-time runner seals atomically and resumes only verified shard checkpoints.")
