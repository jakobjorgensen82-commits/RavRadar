#!/usr/bin/env python3
"""Focused source-stage tests: complete, exhausted residual and fail-closed interruption."""
from __future__ import annotations

import json
import copy
import hashlib
import importlib.util
import os
import shutil
import subprocess
import sys
import tempfile
from datetime import datetime, timedelta, timezone
from pathlib import Path
from unittest.mock import patch

import numpy as np
import xarray as xr

import lib.copernicus_current as CURRENT_MODULE
from lib.copernicus_current import (
    DMI_VERIFIER_CONTRACT_ID,
    OPERATIONAL_MATRIX_CONTRACT_ID,
    file_sha256,
    atomic_write_shadow_checkpoint,
    required_pairs_sha256,
    select_required_records,
    canonical_sha256,
    empty_shadow,
    make_acquisition,
    make_record,
    merge_cache_evidence,
)
from lib.copernicus_current_source_stage import (
    SOURCE_STAGE_CONTRACT_ID,
    SOURCE_STAGE_PROGRESS_CONTRACT_ID,
    SOURCE_STAGE_PROGRESS_STATUS,
    SOURCE_ORDER_ATTEMPTED_EXHAUSTED,
    SOURCE_ORDER_NOT_APPLICABLE,
    CopernicusSourceStageError,
    _source_order_evidence,
    build_source_stage,
    safe_source_stage_summary,
    validate_source_stage,
    validate_source_stage_progress,
    validate_reusable_source_stage,
    build_source_stage_progress,
    make_source_attempt,
    PINNED_PRODUCTS,
    spatial_shards,
    stage_positive_evidence,
    select_source_order_admissible_records,
)
from lib.copernicus_current_donor_bank import (
    legacy_donor_bank, planning_covered_pairs, build_copernicus_donor_bank,
    validate_copernicus_donor_bank, atomic_write_copernicus_donor_bank,
    load_copernicus_donor_bank,
    recover_copernicus_donor_bank, projected_donor_shadow,
    _advance_validated_copernicus_donor_bank,
    _project_validated_donor_shadow,
)
from lib.weather_acquisition_plan import build_current_acquisition_plan
from lib.copernicus_target_identity import target_fingerprint
from lib.current_operational_closure import _copernicus_state


ROOT = Path(__file__).resolve().parents[1]
RUNNER = ROOT / "scripts/run-copernicus-current-pilot.py"
CHECKER = ROOT / "scripts/check-copernicus-current-range.py"
RUNNER_SPEC = importlib.util.spec_from_file_location(
    "copernicus_current_runner_under_test",
    RUNNER,
)
if RUNNER_SPEC is None or RUNNER_SPEC.loader is None:
    raise RuntimeError("Cannot load the Copernicus current runner for focused tests")
RUNNER_MODULE = importlib.util.module_from_spec(RUNNER_SPEC)
RUNNER_SPEC.loader.exec_module(RUNNER_MODULE)
REFERENCE = datetime(2026, 9, 2, 8, tzinfo=timezone.utc)
VALID_TIME = REFERENCE + timedelta(hours=117)
HISTORY_TIME = REFERENCE - timedelta(hours=1)
TARGET = {
    "partId": "fixture-private-part-sentinel",
    "parentZoneId": "fixture-zone",
    "name": "Fixture",
    "waterPoint": [9.123456, 57.654321],
}
OUTSIDE_BALTIC_TARGET = {
    **TARGET,
    "partId": "fixture-private-outside-baltic-sentinel",
    "waterPoint": [8.5, 57.654321],
}


def write(path: Path, value: object) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(value), encoding="utf-8")


def registry(dmi_sha256: str, target: dict = TARGET) -> dict:
    required = [{
        "partId": target["partId"],
        "validTime": VALID_TIME.isoformat().replace("+00:00", "Z"),
    }]
    advisory_required = [{
        "partId": target["partId"],
        "validTime": HISTORY_TIME.isoformat().replace("+00:00", "Z"),
    }]
    return {
        "schemaVersion": 3,
        "kind": "RAVRADAR_PRIVATE_COPERNICUS_CURRENT_RANGE_TARGET_REGISTRY",
        "matrixContractId": OPERATIONAL_MATRIX_CONTRACT_ID,
        "selectionMode": "dmi-gaps-only",
        "productionReferenceAt": REFERENCE.isoformat().replace("+00:00", "Z"),
        "targetHour": REFERENCE.isoformat().replace("+00:00", "Z"),
        "rangeStartAt": (REFERENCE - timedelta(hours=48)).isoformat().replace("+00:00", "Z"),
        "rangeEndAt": VALID_TIME.isoformat().replace("+00:00", "Z"),
        "coldBridgeHours": 48,
        "publicHourCount": 118,
        "matrixHourCount": 166,
        "operationalRangeStartAt": REFERENCE.isoformat().replace("+00:00", "Z"),
        "operationalRangeEndAt": VALID_TIME.isoformat().replace("+00:00", "Z"),
        "operationalHourCount": 118,
        "advisoryHistoryStartAt": (REFERENCE - timedelta(hours=48)).isoformat().replace("+00:00", "Z"),
        "advisoryHistoryEndAt": (REFERENCE - timedelta(hours=1)).isoformat().replace("+00:00", "Z"),
        "advisoryHistoryHourCount": 48,
        "targetCount": 1,
        "sourcePartCount": 1,
        "partCount": 1,
        "operationalPartCount": 1,
        "advisoryHistoryPartCount": 1,
        "targetRegistrySha256": target_fingerprint([target]),
        "dmiCurrentInputSha256": dmi_sha256,
        "dmiVerifierContractId": DMI_VERIFIER_CONTRACT_ID,
        "operationalRequiredPairsSha256": required_pairs_sha256(required),
        "operationalRequiredPairCount": 1,
        "operationalDmiVerifiedPairCount": 117,
        "operationalTotalPairCount": 118,
        "advisoryHistoryRequiredPairsSha256": required_pairs_sha256(advisory_required),
        "advisoryHistoryRequiredPairCount": 1,
        "advisoryHistoryDmiVerifiedPairCount": 47,
        "advisoryHistoryTotalPairCount": 48,
        "dmiVerifiedPairCount": 164,
        "totalPairCount": 166,
        "coordinatesChanged": False,
        "targets": [target],
        "operationalRequiredPairs": required,
        "advisoryHistoryRequiredPairs": advisory_required,
        "zones": {
            target["parentZoneId"]: [{
                "partId": target["partId"],
                "sourceZoneId": target["parentZoneId"],
                "name": target["name"],
                "waterPoint": target["waterPoint"],
            }],
        },
    }


def dataset(
    path: Path,
    *,
    available: bool,
    advisory_available: bool = False,
    target: dict = TARGET,
    depth_m: float = 5.0,
) -> None:
    current_value = 0.1 if available else np.nan
    history_value = 0.05 if advisory_available else np.nan
    document = xr.Dataset(
        data_vars={
            "uo": (("time", "depth", "latitude", "longitude"), np.array([
                [[[history_value]]], [[[current_value]]],
            ], dtype=float)),
            "vo": (("time", "depth", "latitude", "longitude"), np.array([
                [[[history_value]]], [[[current_value]]],
            ], dtype=float)),
        },
        coords={
            "time": np.array([
                HISTORY_TIME.replace(tzinfo=None).isoformat(),
                VALID_TIME.replace(tzinfo=None).isoformat(),
            ], dtype="datetime64[s]"),
            "depth": [depth_m],
            "latitude": [target["waterPoint"][1]],
            "longitude": [target["waterPoint"][0]],
        },
    )
    document.to_netcdf(path)


def sparse_segment_dataset(path: Path, *, target: dict = TARGET) -> None:
    """One valid fixture carrying two operational request segments."""
    valid_times = [
        HISTORY_TIME,
        REFERENCE,
        REFERENCE + timedelta(hours=2),
        VALID_TIME,
    ]
    values = np.array([[[[0.1]]]] * len(valid_times), dtype=float)
    document = xr.Dataset(
        data_vars={
            "uo": (("time", "depth", "latitude", "longitude"), values),
            "vo": (("time", "depth", "latitude", "longitude"), values),
        },
        coords={
            "time": np.array(
                [value.replace(tzinfo=None).isoformat() for value in valid_times],
                dtype="datetime64[s]",
            ),
            "depth": [5.0],
            "latitude": [target["waterPoint"][1]],
            "longitude": [target["waterPoint"][0]],
        },
    )
    document.to_netcdf(path)


def mixed_shard_dataset(
    path: Path,
    *,
    targets: list[dict],
    second_available: bool,
) -> None:
    current_second = 0.2 if second_available else np.nan
    document = xr.Dataset(
        data_vars={
            "uo": (("time", "depth", "latitude", "longitude"), np.array([
                [[[np.nan, np.nan]]],
                [[[0.1, current_second]]],
            ], dtype=float)),
            "vo": (("time", "depth", "latitude", "longitude"), np.array([
                [[[np.nan, np.nan]]],
                [[[0.1, current_second]]],
            ], dtype=float)),
        },
        coords={
            "time": np.array([
                HISTORY_TIME.replace(tzinfo=None).isoformat(),
                VALID_TIME.replace(tzinfo=None).isoformat(),
            ], dtype="datetime64[s]"),
            "depth": [5.0],
            "latitude": [targets[0]["waterPoint"][1]],
            "longitude": [row["waterPoint"][0] for row in targets],
        },
    )
    document.to_netcdf(path)


def prepare(folder: Path, target: dict = TARGET) -> None:
    write(folder / "targets.json", {
        "partCount": 1,
        "zones": {
            target["parentZoneId"]: [{
                "partId": target["partId"],
                "sourceZoneId": target["parentZoneId"],
                "name": target["name"],
                "waterPoint": target["waterPoint"],
            }],
        },
    })
    write(folder / "dmi.json", {"fixture": "source-stage"})
    write(
        folder / "registry.json",
        registry(file_sha256(folder / "dmi.json"), target),
    )


def prepare_multi(folder: Path, targets: list[dict]) -> None:
    zones = {
        "fixture-zone": [
            {
                "partId": target["partId"],
                "sourceZoneId": target["parentZoneId"],
                "name": target["name"],
                "waterPoint": target["waterPoint"],
            }
            for target in targets
        ],
    }
    write(folder / "targets.json", {"partCount": len(targets), "zones": zones})
    write(folder / "dmi.json", {"fixture": "source-stage-multi"})
    required = [
        {
            "partId": target["partId"],
            "validTime": VALID_TIME.isoformat().replace("+00:00", "Z"),
        }
        for target in targets
    ]
    advisory_required = [
        {
            "partId": target["partId"],
            "validTime": HISTORY_TIME.isoformat().replace("+00:00", "Z"),
        }
        for target in targets
    ]
    document = registry(file_sha256(folder / "dmi.json"), targets[0])
    count = len(targets)
    document.update({
        "targetCount": count,
        "sourcePartCount": count,
        "partCount": count,
        "operationalPartCount": count,
        "advisoryHistoryPartCount": count,
        "targetRegistrySha256": target_fingerprint(targets),
        "operationalRequiredPairsSha256": required_pairs_sha256(required),
        "operationalRequiredPairCount": count,
        "operationalDmiVerifiedPairCount": (118 * count) - count,
        "operationalTotalPairCount": 118 * count,
        "advisoryHistoryRequiredPairsSha256": required_pairs_sha256(advisory_required),
        "advisoryHistoryRequiredPairCount": count,
        "advisoryHistoryDmiVerifiedPairCount": (48 * count) - count,
        "advisoryHistoryTotalPairCount": 48 * count,
        "dmiVerifiedPairCount": (166 * count) - (2 * count),
        "totalPairCount": 166 * count,
        "targets": targets,
        "operationalRequiredPairs": required,
        "advisoryHistoryRequiredPairs": advisory_required,
        "zones": zones,
    })
    write(folder / "registry.json", document)


def run_runner(
    folder: Path,
    fixture_directory: Path | None,
    *,
    env: dict[str, str] | None = None,
    reference: datetime = REFERENCE,
    acquisition_at: datetime | None = None,
    refresh_only: bool = False,
) -> subprocess.CompletedProcess[str]:
    actual_acquisition_at = acquisition_at or (reference + timedelta(minutes=10))
    command = [
        sys.executable,
        "-B",
        str(RUNNER),
        "--targets",
        str(folder / "registry.json"),
        "--authoritative-targets",
        str(folder / "targets.json"),
        "--shadow",
        str(folder / "shadow.json"),
        "--source-stage",
        str(folder / "source-stage.json"),
        "--report",
        str(folder / "safe-report.json"),
        "--summary",
        str(folder / "safe-summary.txt"),
        "--at",
        reference.isoformat().replace("+00:00", "Z"),
        "--acquisition-at",
        actual_acquisition_at.isoformat().replace("+00:00", "Z"),
    ]
    if fixture_directory is not None:
        command.extend(["--fixture-directory", str(fixture_directory)])
    if refresh_only:
        command.append("--refresh-only")
    runner_env = dict(os.environ if env is None else env)
    # Fixture commits must never set outputs on the surrounding CI step.
    runner_env["GITHUB_OUTPUT"] = str(folder / "fixture-github-output.txt")
    return subprocess.run(
        command,
        cwd=ROOT,
        capture_output=True,
        text=True,
        check=False,
        env=runner_env,
    )


def run_checker(folder: Path, *extra: str) -> subprocess.CompletedProcess[str]:
    return subprocess.run([
        sys.executable,
        "-B",
        str(CHECKER),
        "--shadow",
        str(folder / "shadow.json"),
        "--source-stage",
        str(folder / "source-stage.json"),
        "--registry",
        str(folder / "registry.json"),
        "--dmi",
        str(folder / "dmi.json"),
        "--targets",
        str(folder / "targets.json"),
        "--at",
        REFERENCE.isoformat().replace("+00:00", "Z"),
        *extra,
    ], cwd=ROOT, capture_output=True, text=True, check=False)


def has_forbidden_safe_key(value: object) -> bool:
    forbidden = {
        "partid", "targetpartids", "missingpairs", "requestedpairs",
        "waterpoint", "samplingpoint", "gridpoint", "longitude", "latitude",
        "umps", "vmps",
    }
    if isinstance(value, dict):
        return any(str(key).lower() in forbidden for key in value) or any(
            has_forbidden_safe_key(item) for item in value.values()
        )
    if isinstance(value, list):
        return any(has_forbidden_safe_key(item) for item in value)
    return False


with tempfile.TemporaryDirectory(prefix="ravradar-cop-source-stage-") as raw_root:
    root = Path(raw_root)

    # A normal Baltic record produces both the OPERATIONAL_COMPLETE seal and
    # its exact source-stage binding.
    full = root / "full"
    fixtures = full / "fixtures"
    fixtures.mkdir(parents=True)
    prepare(full)
    dataset(
        fixtures / "copernicus-baltic-nemo.nc",
        available=True,
        advisory_available=True,
    )
    completed = run_runner(full, fixtures)
    assert completed.returncode == 0, completed.stdout + completed.stderr
    assert (full / "source-stage.json").exists()
    full_shadow = json.loads((full / "shadow.json").read_text(encoding="utf-8"))
    full_advisory_refs, full_advisory_missing = select_required_records(
        json.loads((full / "registry.json").read_text(encoding="utf-8"))[
            "advisoryHistoryRequiredPairs"
        ],
        full_shadow["acquisitions"],
        full_shadow["records"],
        REFERENCE,
    )
    assert full_advisory_refs == []
    assert len(full_advisory_missing) == 1
    full_report = json.loads(
        (full / "safe-report.json").read_text(encoding="utf-8")
    )
    assert full_report["advisoryHistoryFill"]["status"] == "BOUNDED_INCOMPLETE"
    assert full_report["advisoryHistoryFill"]["attemptedShardCount"] == 0
    assert full_report["advisoryHistoryFill"]["acquiredPairCount"] == 0
    full_check = run_checker(full, "--require-complete", "--require-source-stage-ready")
    assert full_check.returncode == 0 and "OPERATIONAL_COMPLETE" in full_check.stdout
    full_stage_text = (full / "source-stage.json").read_text(encoding="utf-8")
    (full / "source-stage.json").unlink()
    missing_complete_stage = run_checker(
        full,
        "--require-complete",
        "--require-source-stage-ready",
    )
    assert missing_complete_stage.returncode != 0
    (full / "source-stage.json").write_text(
        full_stage_text,
        encoding="utf-8",
    )

    # The first run after this release must be able to reuse the exact attempt
    # format written by 4.0.341.  It is validated with its historical rule
    # (requested native hours), while every newly minted attempt uses the
    # self-contained observed-time witness.
    full_stage_document = json.loads(full_stage_text)
    legacy_attempt = copy.deepcopy(full_stage_document["attempts"][0])
    for field in (
        "attemptSchemaVersion", "attemptContractId", "observedNativeValidTimes",
    ):
        legacy_attempt.pop(field)
    legacy_attempt["attemptId"] = canonical_sha256({
        key: value for key, value in legacy_attempt.items() if key != "attemptId"
    })
    legacy_attempt_progress = build_source_stage_progress(
        registry=json.loads((full / "registry.json").read_text(encoding="utf-8")),
        shadow=full_shadow,
        target_identities={TARGET["partId"]: TARGET},
        shadow_sha256=file_sha256(full / "shadow.json"),
        attempts=[legacy_attempt],
        updated_at=REFERENCE + timedelta(minutes=10),
    )
    assert legacy_attempt_progress["attempts"] == [legacy_attempt]
    validate_source_stage_progress(
        legacy_attempt_progress,
        registry=json.loads((full / "registry.json").read_text(encoding="utf-8")),
        shadow=full_shadow,
        target_identities={TARGET["partId"]: TARGET},
        shadow_sha256=file_sha256(full / "shadow.json"),
    )

    # A real runner fixture splits one sparse shard only across the large
    # 114-hour empty interval. The two-hour sparse prefix stays coalesced, the
    # later segment still runs in the next fair pass, and exact pair/shard
    # identities survive unchanged into the attempt journal.
    segmented = root / "large-native-time-gap-segments"
    segmented_fixtures = segmented / "fixtures"
    segmented_fixtures.mkdir(parents=True)
    prepare(segmented)
    segmented_registry = json.loads(
        (segmented / "registry.json").read_text(encoding="utf-8")
    )
    segmented_required = [
        {
            "partId": TARGET["partId"],
            "validTime": value.isoformat().replace("+00:00", "Z"),
        }
        for value in (REFERENCE, REFERENCE + timedelta(hours=2), VALID_TIME)
    ]
    segmented_registry.update({
        "operationalRequiredPairs": segmented_required,
        "operationalRequiredPairsSha256": required_pairs_sha256(
            segmented_required
        ),
        "operationalRequiredPairCount": 3,
        "operationalDmiVerifiedPairCount": 115,
        "dmiVerifiedPairCount": 162,
    })
    write(segmented / "registry.json", segmented_registry)
    sparse_segment_dataset(
        segmented_fixtures / "copernicus-baltic-nemo.nc"
    )
    segmented_run = run_runner(segmented, segmented_fixtures)
    assert segmented_run.returncode == 0, (
        segmented_run.stdout + segmented_run.stderr
    )
    checkpoint_lines = [
        line for line in segmented_run.stdout.splitlines()
        if line.startswith("Copernicus shard checkpoint:")
    ]
    assert len(checkpoint_lines) == 2
    assert "requestedPairCount=2" in checkpoint_lines[0]
    assert "nativeUniqueHourCount=2" in checkpoint_lines[0]
    assert "requestEnvelopeHourCount=3" in checkpoint_lines[0]
    assert "requestedPairCount=1" in checkpoint_lines[1]
    assert "nativeUniqueHourCount=1" in checkpoint_lines[1]
    assert "requestEnvelopeHourCount=1" in checkpoint_lines[1]
    assert all(
        "acquireHashParseSeconds=" in line
        and "durableJournalSeconds=" in line
        and "candidateAdmissionSeconds=" in line
        and "fullCheckpointSeconds=" in line
        and "pendingDurableSegmentCount=" in line
        and "admissionMergeCheckpointSeconds=" in line
        for line in checkpoint_lines
    )
    assert "fullCheckpoint=false" in checkpoint_lines[0]
    assert "pendingDurableSegmentCount=1" in checkpoint_lines[0]
    assert "fullCheckpoint=true" in checkpoint_lines[1]
    assert "pendingDurableSegmentCount=0" in checkpoint_lines[1]
    final_consolidation_lines = [
        line for line in segmented_run.stdout.splitlines()
        if line.startswith("Copernicus final durable segment consolidation:")
    ]
    assert final_consolidation_lines == []
    assert not (segmented / "copernicus-current-segment-journal.json").exists()
    segmented_shadow = json.loads(
        (segmented / "shadow.json").read_text(encoding="utf-8")
    )
    segmented_stage = validate_source_stage(
        json.loads(
            (segmented / "source-stage.json").read_text(encoding="utf-8")
        ),
        registry=segmented_registry,
        shadow=segmented_shadow,
        target_identities={TARGET["partId"]: TARGET},
        shadow_sha256=file_sha256(segmented / "shadow.json"),
    )
    assert len(segmented_stage["attempts"]) == 2
    assert {
        (row["partId"], row["validTime"])
        for attempt in segmented_stage["attempts"]
        for row in attempt["requestedPairs"]
    } == {
        (row["partId"], row["validTime"])
        for row in segmented_required
    }
    assert len({
        attempt["shardId"] for attempt in segmented_stage["attempts"]
    }) == 1
    assert all(
        attempt["requestStartAt"] == attempt["requestEndAt"]
        if attempt["requestedPairCount"] == 1
        else (
            RUNNER_MODULE.parse_time(attempt["requestEndAt"], "segment end")
            - RUNNER_MODULE.parse_time(
                attempt["requestStartAt"], "segment start"
            )
        ) == timedelta(hours=2)
        for attempt in segmented_stage["attempts"]
    )

    # A receipt left by a terminated process is rebound only to its exact donor
    # generation and then replayed through the normal validators on restart.
    segmented_bank_path = segmented / "copernicus-current-donor-bank.json"
    segmented_bank = load_copernicus_donor_bank(
        segmented_bank_path,
        targets=[TARGET],
    )
    assert segmented_bank is not None
    segmented_baltic_product = next(
        row for row in PINNED_PRODUCTS
        if row["source"] == "copernicus-baltic-nemo"
    )
    replay_valid_time = REFERENCE + timedelta(hours=4)
    replay_pair = {
        "partId": TARGET["partId"],
        "validTime": replay_valid_time.isoformat().replace("+00:00", "Z"),
    }
    segmented_registry["operationalRequiredPairs"].append(replay_pair)
    segmented_registry["operationalRequiredPairs"] = sorted(
        segmented_registry["operationalRequiredPairs"],
        key=lambda row: (row["validTime"], row["partId"]),
    )
    segmented_registry.update({
        "operationalRequiredPairsSha256": required_pairs_sha256(
            segmented_registry["operationalRequiredPairs"]
        ),
        "operationalRequiredPairCount": 4,
        "operationalDmiVerifiedPairCount": 114,
        "dmiVerifiedPairCount": 161,
    })
    write(segmented / "registry.json", segmented_registry)
    replay_acquired_at = REFERENCE + timedelta(minutes=20)
    replay_acquisition = make_acquisition(
        source=segmented_baltic_product["source"],
        acquisition_at=replay_acquired_at,
        request_start_at=replay_valid_time,
        request_end_at=replay_valid_time,
        targets=[TARGET],
        native_valid_times=[replay_valid_time],
        subset_sha256=canonical_sha256({"fixture": "restart-replay"}),
        record_count=1,
    )
    replay_record = make_record({
        "partId": TARGET["partId"],
        "parentZoneId": TARGET["parentZoneId"],
        "validTime": replay_valid_time,
        "samplingPoint": TARGET["waterPoint"],
        "gridPoint": TARGET["waterPoint"],
        "distanceKm": 0.0,
        "verticalLayerM": 5.0,
        "layerQuality": "full-water-column",
        "sharedLayerCount": 2,
        "uMps": 0.1,
        "vMps": 0.2,
    }, replay_acquisition, TARGET)
    replay_attempt = make_source_attempt(
        production_reference_at=REFERENCE,
        acquisition_at=replay_acquired_at,
        product=segmented_baltic_product,
        shard_id=spatial_shards([TARGET], segmented_baltic_product)[0]["shardId"],
        target_part_ids=[TARGET["partId"]],
        requested_pairs=[replay_pair],
        subset_sha256=replay_acquisition["subsetSha256"],
        acquisition_id=replay_acquisition["acquisitionId"],
        parsed_record_count=1,
        observed_native_valid_times=replay_acquisition["nativeValidTimes"],
    )
    replay_journal_path = segmented / "copernicus-current-segment-journal.json"
    RUNNER_MODULE.append_segment_journal(
        replay_journal_path,
        None,
        base_bank_sha256=segmented_bank["bankSha256"],
        production_reference_at=REFERENCE,
        targets=[TARGET],
        acquisition=replay_acquisition,
        records=[replay_record],
        attempt=replay_attempt,
    )
    replayed_run = run_runner(
        segmented,
        segmented_fixtures,
        acquisition_at=replay_acquired_at + timedelta(minutes=1),
    )
    assert replayed_run.returncode == 0, replayed_run.stdout + replayed_run.stderr
    assert "Replayed and consolidated durable Copernicus segment receipts: entryCount=1." in (
        replayed_run.stdout
    )
    assert not replay_journal_path.exists()
    replayed_shadow = json.loads(
        (segmented / "shadow.json").read_text(encoding="utf-8")
    )
    replayed_stage = validate_source_stage(
        json.loads((segmented / "source-stage.json").read_text(encoding="utf-8")),
        registry=segmented_registry,
        shadow=replayed_shadow,
        target_identities={TARGET["partId"]: TARGET},
        shadow_sha256=file_sha256(segmented / "shadow.json"),
    )
    assert replay_attempt in replayed_stage["attempts"]

    # Six independent spatial receipts take exactly one full consolidation.
    # This is the live throughput contract: five segments remain individually
    # crash-safe in the journal, then the sixth promotes the complete batch.
    batched = root / "six-segment-consolidation"
    batched_fixtures = batched / "fixtures"
    batched_fixtures.mkdir(parents=True)
    batched_targets = [
        {
            **TARGET,
            "partId": f"fixture-batched-part-{index}",
            "name": f"Batched fixture {index}",
            "waterPoint": [9.1 + (1.3 * index), TARGET["waterPoint"][1]],
        }
        for index in range(RUNNER_MODULE.SEGMENTS_PER_DONOR_CONSOLIDATION)
    ]
    prepare_multi(batched, batched_targets)
    batched_baltic = next(
        row for row in PINNED_PRODUCTS
        if row["source"] == "copernicus-baltic-nemo"
    )
    batched_shards = spatial_shards(batched_targets, batched_baltic)
    assert len(batched_shards) == RUNNER_MODULE.SEGMENTS_PER_DONOR_CONSOLIDATION
    for index, shard in enumerate(batched_shards):
        assert len(shard["targets"]) == 1
        dataset(
            batched_fixtures / f"copernicus-baltic-nemo-{index:03d}.nc",
            available=True,
            target=shard["targets"][0],
        )
    batched_run = run_runner(batched, batched_fixtures)
    assert batched_run.returncode == 0, batched_run.stdout + batched_run.stderr
    batched_checkpoints = [
        line for line in batched_run.stdout.splitlines()
        if line.startswith("Copernicus shard checkpoint:")
    ]
    assert len(batched_checkpoints) == RUNNER_MODULE.SEGMENTS_PER_DONOR_CONSOLIDATION
    assert all(
        "fullCheckpoint=false" in line
        for line in batched_checkpoints[:-1]
    )
    assert "fullCheckpoint=true" in batched_checkpoints[-1]
    assert "pendingDurableSegmentCount=0" in batched_checkpoints[-1]
    assert not (batched / "copernicus-current-segment-journal.json").exists()
    batched_stage = validate_source_stage(
        json.loads((batched / "source-stage.json").read_text(encoding="utf-8")),
        registry=json.loads((batched / "registry.json").read_text(encoding="utf-8")),
        shadow=json.loads((batched / "shadow.json").read_text(encoding="utf-8")),
        target_identities={row["partId"]: row for row in batched_targets},
        shadow_sha256=file_sha256(batched / "shadow.json"),
    )
    assert batched_stage["missingPairCount"] == 0
    assert len(batched_stage["attempts"]) == len(batched_targets)

    # In the shared product domain, AMM15 can be selected only after the same
    # exact pair has one completed Baltic attempt with no selected Baltic row.
    amm15 = root / "amm15-after-baltic"
    amm15_fixtures = amm15 / "fixtures"
    amm15_fixtures.mkdir(parents=True)
    prepare(amm15)
    dataset(amm15_fixtures / "copernicus-baltic-nemo.nc", available=False)
    dataset(amm15_fixtures / "copernicus-nws-amm15.nc", available=True)
    amm15_completed = run_runner(amm15, amm15_fixtures)
    assert amm15_completed.returncode == 0, (
        amm15_completed.stdout + amm15_completed.stderr
    )
    amm15_stage_document = json.loads(
        (amm15 / "source-stage.json").read_text(encoding="utf-8")
    )
    amm15_shadow_document = json.loads(
        (amm15 / "shadow.json").read_text(encoding="utf-8")
    )
    amm15_stage = validate_source_stage(
        amm15_stage_document,
        registry=json.loads((amm15 / "registry.json").read_text(encoding="utf-8")),
        shadow=amm15_shadow_document,
        target_identities={TARGET["partId"]: TARGET},
        shadow_sha256=file_sha256(amm15 / "shadow.json"),
    )
    assert amm15_stage["missingPairCount"] == 0
    assert len(amm15_stage["sourceOrderEvidence"]) == 1
    assert (
        amm15_stage["sourceOrderEvidence"][0]["disposition"]
        == SOURCE_ORDER_ATTEMPTED_EXHAUSTED
    )
    assert amm15_stage["sourceOrderEvidence"][0]["attemptId"] in {
        row["attemptId"] for row in amm15_stage["attempts"]
        if row["source"] == "copernicus-baltic-nemo"
    }
    try:
        build_source_stage(
            registry=json.loads(
                (amm15 / "registry.json").read_text(encoding="utf-8")
            ),
            shadow=amm15_shadow_document,
            target_identities={TARGET["partId"]: TARGET},
            shadow_sha256=file_sha256(amm15 / "shadow.json"),
            attempts=[
                row for row in amm15_stage["attempts"]
                if row["source"] != "copernicus-baltic-nemo"
            ],
            sealed_at=REFERENCE + timedelta(minutes=10),
        )
    except CopernicusSourceStageError:
        pass
    else:
        raise AssertionError(
            "In-domain AMM15 without a Baltic attempt must fail closed"
        )
    amm15_record_ids = {
        row["recordId"] for row in amm15_shadow_document["records"]
    }
    excluded_progress = build_source_stage_progress(
        registry=json.loads(
            (amm15 / "registry.json").read_text(encoding="utf-8")
        ),
        shadow=amm15_shadow_document,
        target_identities={TARGET["partId"]: TARGET},
        shadow_sha256=file_sha256(amm15 / "shadow.json"),
        attempts=[],
        updated_at=REFERENCE + timedelta(minutes=10),
    )
    assert excluded_progress["selectedRecordRefCount"] == 0
    assert excluded_progress["missingPairCount"] == 1
    assert excluded_progress["excludedRecordRefCount"] == 1
    assert amm15_record_ids == {
        row["recordId"] for row in amm15_shadow_document["records"]
    }
    assert amm15_stage["excludedRecordRefCount"] == 0
    assert amm15_stage["selectedRecordRefCount"] == 1
    excluded_state = _copernicus_state(
        registry=json.loads(
            (amm15 / "registry.json").read_text(encoding="utf-8")
        ),
        shadow=amm15_shadow_document,
        shadow_sha256=file_sha256(amm15 / "shadow.json"),
        source_stage=excluded_progress,
        target_by_id={TARGET["partId"]: TARGET},
        reference=REFERENCE,
    )
    assert excluded_state[0] == []
    assert excluded_state[1] == [{
        "partId": TARGET["partId"],
        "validTime": VALID_TIME.isoformat().replace("+00:00", "Z"),
    }]
    reactivated_state = _copernicus_state(
        registry=json.loads(
            (amm15 / "registry.json").read_text(encoding="utf-8")
        ),
        shadow=amm15_shadow_document,
        shadow_sha256=file_sha256(amm15 / "shadow.json"),
        source_stage=amm15_stage,
        target_by_id={TARGET["partId"]: TARGET},
        reference=REFERENCE,
    )
    assert len(reactivated_state[0]) == 1
    assert reactivated_state[1] == []
    # The post-closure phase accepts IN_PROGRESS. Its independent committed
    # bank still owns the original exact AMM15 proof even when the disposable
    # projection has lost it; quality work cannot re-certify arbitrary rows.
    amm15_refresh = root / "amm15-in-progress-refresh"
    shutil.copytree(amm15, amm15_refresh)
    write(amm15_refresh / "source-stage.json", excluded_progress)
    amm15_refresh_env = os.environ.copy()
    amm15_refresh_env["COPERNICUS_OPERATIONAL_REFRESH_MAX_SHARDS"] = "1"
    refreshed_exclusion = run_runner(
        amm15_refresh,
        amm15_refresh / "fixtures",
        env=amm15_refresh_env,
        acquisition_at=REFERENCE + timedelta(minutes=20),
        refresh_only=True,
    )
    assert refreshed_exclusion.returncode == 0, (
        refreshed_exclusion.stdout + refreshed_exclusion.stderr
    )
    after_exclusion_shadow = json.loads(
        (amm15_refresh / "shadow.json").read_text(encoding="utf-8")
    )
    after_exclusion_stage = validate_source_stage(
        json.loads((amm15_refresh / "source-stage.json").read_text(encoding="utf-8")),
        registry=json.loads((amm15_refresh / "registry.json").read_text(encoding="utf-8")),
        shadow=after_exclusion_shadow,
        target_identities={TARGET["partId"]: TARGET},
        shadow_sha256=file_sha256(amm15_refresh / "shadow.json"),
    )
    assert amm15_record_ids.issubset({
        row["recordId"] for row in after_exclusion_shadow["records"]
    })
    assert after_exclusion_stage["missingPairCount"] == 0
    assert after_exclusion_stage["excludedRecordRefCount"] == 0
    assert after_exclusion_stage["selectedRecordRefCount"] == 1

    # Outside Baltic's pinned domain, the exact AMM15 pair is accepted only
    # with a deterministic, target-bound NOT_APPLICABLE disposition.
    outside = root / "amm15-outside-baltic"
    outside_fixtures = outside / "fixtures"
    outside_fixtures.mkdir(parents=True)
    prepare(outside, OUTSIDE_BALTIC_TARGET)
    dataset(
        outside_fixtures / "copernicus-nws-amm15.nc",
        available=True,
        target=OUTSIDE_BALTIC_TARGET,
    )
    outside_completed = run_runner(outside, outside_fixtures)
    assert outside_completed.returncode == 0, (
        outside_completed.stdout + outside_completed.stderr
    )
    outside_stage_document = json.loads(
        (outside / "source-stage.json").read_text(encoding="utf-8")
    )
    outside_shadow_document = json.loads(
        (outside / "shadow.json").read_text(encoding="utf-8")
    )
    outside_stage = validate_source_stage(
        outside_stage_document,
        registry=json.loads((outside / "registry.json").read_text(encoding="utf-8")),
        shadow=outside_shadow_document,
        target_identities={
            OUTSIDE_BALTIC_TARGET["partId"]: OUTSIDE_BALTIC_TARGET,
        },
        shadow_sha256=file_sha256(outside / "shadow.json"),
    )
    assert len(outside_stage["sourceOrderEvidence"]) == 1
    assert (
        outside_stage["sourceOrderEvidence"][0]["disposition"]
        == SOURCE_ORDER_NOT_APPLICABLE
    )
    assert outside_stage["sourceOrderEvidence"][0]["attemptId"] is None
    outside_check = run_checker(
        outside,
        "--require-complete",
        "--require-source-stage-ready",
    )
    assert outside_check.returncode == 0

    # A NOT_APPLICABLE Baltic disposition never legitimises AMM15 outside
    # AMM15's own pinned product domain, and a Baltic record likewise cannot
    # be selected outside Baltic's pinned domain.
    outside_all_products = {
        **OUTSIDE_BALTIC_TARGET,
        "partId": "fixture-private-outside-all-products-sentinel",
        "waterPoint": [7.0, 57.654321],
    }
    for selected_source, selected_target in (
        ("copernicus-nws-amm15", outside_all_products),
        ("copernicus-baltic-nemo", OUTSIDE_BALTIC_TARGET),
    ):
        try:
            _source_order_evidence([{
                "partId": selected_target["partId"],
                "validTime": VALID_TIME.isoformat().replace("+00:00", "Z"),
                "source": selected_source,
            }], [selected_target], [], REFERENCE)
        except CopernicusSourceStageError:
            pass
        else:
            raise AssertionError(
                "A selected Copernicus pair outside its own pinned domain "
                "must fail closed"
            )

    # A valid no-record response from both geographically applicable products
    # is a READY source stage, never a false pure-Copernicus complete seal.
    residual = root / "residual"
    residual_fixtures = residual / "fixtures"
    residual_fixtures.mkdir(parents=True)
    prepare(residual)
    dataset(
        residual_fixtures / "copernicus-baltic-nemo.nc",
        available=False,
        advisory_available=True,
    )
    dataset(residual_fixtures / "copernicus-nws-amm15.nc", available=False)
    exhausted = run_runner(residual, residual_fixtures)
    assert exhausted.returncode == 0, exhausted.stdout + exhausted.stderr
    assert "Kildeled: READY" in exhausted.stdout
    stage_document = json.loads((residual / "source-stage.json").read_text(encoding="utf-8"))
    shadow_document = json.loads((residual / "shadow.json").read_text(encoding="utf-8"))
    stage = validate_source_stage(
        stage_document,
        registry=json.loads((residual / "registry.json").read_text(encoding="utf-8")),
        shadow=shadow_document,
        target_identities={TARGET["partId"]: TARGET},
        shadow_sha256=file_sha256(residual / "shadow.json"),
    )
    assert stage["contractId"] == SOURCE_STAGE_CONTRACT_ID
    assert stage["missingPairCount"] == 1 and len(stage["attempts"]) == 2
    assert stage["shadowSha256"] == file_sha256(residual / "shadow.json")
    advisory_refs, advisory_missing = select_required_records(
        json.loads((residual / "registry.json").read_text(encoding="utf-8"))[
            "advisoryHistoryRequiredPairs"
        ],
        shadow_document["acquisitions"],
        shadow_document["records"],
        REFERENCE,
    )
    assert advisory_refs == []
    assert advisory_missing == [{
        "partId": TARGET["partId"],
        "validTime": HISTORY_TIME.isoformat().replace("+00:00", "Z"),
    }]
    ready = run_checker(residual, "--require-source-stage-ready")
    assert ready.returncode == 0 and "source stage is READY" in ready.stdout
    not_complete = run_checker(residual, "--require-complete")
    assert not_complete.returncode != 0 and "complete Copernicus seal is required" in not_complete.stdout

    # The artifact-facing report is counts/hashes only.
    safe_report = json.loads((residual / "safe-report.json").read_text(encoding="utf-8"))
    assert safe_report["advisoryHistoryFill"]["status"] == "BOUNDED_INCOMPLETE"
    assert safe_report["advisoryHistoryFill"]["acquiredPairCount"] == 0
    assert safe_report["advisoryHistoryFill"]["attemptedShardCount"] == 0
    assert safe_report["advisoryHistoryFill"]["exhaustionAttested"] is False
    safe_text = json.dumps(safe_report, sort_keys=True).lower()
    assert not has_forbidden_safe_key(safe_report)
    assert TARGET["partId"].lower() not in safe_text
    assert all(str(value) not in safe_text for value in TARGET["waterPoint"])
    assert not has_forbidden_safe_key(safe_source_stage_summary(stage))

    # A missing second-product fixture models an interrupted traversal.  The
    # completed zero-result Baltic shard survives as IN_PROGRESS, is reusable,
    # and is never accepted as READY or as operational closure.
    unfinished = root / "unfinished"
    unfinished_fixtures = unfinished / "fixtures"
    unfinished_fixtures.mkdir(parents=True)
    prepare(unfinished)
    dataset(unfinished_fixtures / "copernicus-baltic-nemo.nc", available=False)
    interrupted = run_runner(unfinished, unfinished_fixtures)
    assert interrupted.returncode != 0
    progress_document = json.loads(
        (unfinished / "source-stage.json").read_text(encoding="utf-8")
    )
    progress_shadow = json.loads(
        (unfinished / "shadow.json").read_text(encoding="utf-8")
    )
    progress = validate_source_stage_progress(
        progress_document,
        registry=json.loads(
            (unfinished / "registry.json").read_text(encoding="utf-8")
        ),
        shadow=progress_shadow,
        target_identities={TARGET["partId"]: TARGET},
        shadow_sha256=file_sha256(unfinished / "shadow.json"),
    )
    assert progress["status"] == SOURCE_STAGE_PROGRESS_STATUS
    assert progress["contractId"] == SOURCE_STAGE_PROGRESS_CONTRACT_ID
    assert len(progress["attempts"]) == 1
    assert progress["attempts"][0]["parsedRecordCount"] == 0
    assert progress["shadowSha256"] == file_sha256(unfinished / "shadow.json")
    reusable = run_checker(unfinished, "--require-source-stage-reusable")
    assert reusable.returncode == 0 and "valid IN_PROGRESS" in reusable.stdout
    not_ready = run_checker(unfinished, "--require-source-stage-ready")
    assert not_ready.returncode != 0
    github_output = unfinished / "github-output.txt"
    reusable_output = run_checker(
        unfinished,
        "--github-output",
        str(github_output),
    )
    assert reusable_output.returncode == 0
    output_text = github_output.read_text(encoding="utf-8")
    assert "source_stage_reusable=true" in output_text
    assert "source_stage_ready=false" in output_text

    # Any broken binding is invalid, not silently reusable.
    write(
        unfinished / "source-stage.json",
        {**progress_document, "attemptsSha256": "sha256:" + ("0" * 64)},
    )
    invalid_output = unfinished / "invalid-github-output.txt"
    invalid = run_checker(
        unfinished,
        "--allow-nonmatching-seal",
        "--github-output",
        str(invalid_output),
    )
    assert invalid.returncode == 0
    assert "source_stage_reusable=false" in invalid_output.read_text(encoding="utf-8")
    invalid_strict = run_checker(
        unfinished,
        "--allow-nonmatching-seal",
        "--require-source-stage-reusable",
    )
    assert invalid_strict.returncode != 0
    write(unfinished / "source-stage.json", progress_document)

    # A fresh DMI file with unchanged current gaps must retain completed work.
    write(unfinished / "dmi.json", {"fixture": "fresh-build-same-currents"})
    fresh_registry = registry(file_sha256(unfinished / "dmi.json"))
    write(unfinished / "registry.json", fresh_registry)
    fresh_output = unfinished / "fresh-github-output.txt"
    fresh_check = run_checker(
        unfinished,
        "--allow-nonmatching-seal",
        "--require-source-stage-reusable",
        "--github-output",
        str(fresh_output),
    )
    assert fresh_check.returncode == 0
    assert "source_stage_reusable=true" in fresh_output.read_text(encoding="utf-8")
    assert run_checker(unfinished, "--require-source-stage-ready").returncode != 0

    def rebase(doc, matrix=fresh_registry, identities=None):
        return validate_reusable_source_stage(
            doc, registry=matrix, shadow=progress_shadow,
            target_identities=identities or {TARGET["partId"]: TARGET},
            shadow_sha256=file_sha256(unfinished / "shadow.json"), allow_rebase=True,
        )

    rebound = rebase(progress_document)
    assert rebound["status"] == "IN_PROGRESS"
    assert rebound["attempts"] == progress_document["attempts"]
    assert rebound["dmiCurrentInputSha256"] == fresh_registry["dmiCurrentInputSha256"]
    legacy = {**progress_document, "schemaVersion": 1, "contractId": "copernicus-current-source-stage-in-progress-v1"}
    legacy.pop("excludedRecordRefCount")
    legacy.pop("excludedRecordRefsSha256")
    for key in ("positiveAdmissions", "admissionAttempts", "admissionPolicySha256"):
        legacy.pop(key)
    legacy["sourceStageId"] = canonical_sha256({k: v for k, v in legacy.items() if k != "sourceStageId"})
    assert rebase(legacy)["attempts"] == progress_document["attempts"]

    def shifted_matrix(hours, matrix=fresh_registry):
        shifted = copy.deepcopy(matrix)
        for key in ("productionReferenceAt", "targetHour", "rangeStartAt", "rangeEndAt",
                    "operationalRangeStartAt", "operationalRangeEndAt", "advisoryHistoryStartAt", "advisoryHistoryEndAt"):
            shifted[key] = (datetime.fromisoformat(shifted[key].replace("Z", "+00:00"))
                            + timedelta(hours=hours)).isoformat().replace("+00:00", "Z")
        return shifted

    next_matrix = shifted_matrix(1)
    advanced = rebase(rebound, next_matrix)
    assert advanced["attempts"] == progress_document["attempts"]
    assert advanced["productionReferenceAt"] != advanced["attempts"][0]["productionReferenceAt"]
    assert advanced["attempts"][0]["acquisitionAt"] == progress_document["attempts"][0]["acquisitionAt"]
    new_pair = {"partId": TARGET["partId"], "validTime": next_matrix["operationalRangeEndAt"]}
    next_matrix["operationalRequiredPairs"].append(new_pair)
    next_matrix["operationalRequiredPairCount"] += 1
    next_matrix["operationalDmiVerifiedPairCount"] -= 1
    next_matrix["dmiVerifiedPairCount"] -= 1
    next_matrix["operationalRequiredPairsSha256"] = required_pairs_sha256(next_matrix["operationalRequiredPairs"])
    extended = rebase(rebound, next_matrix)
    assert extended["missingPairCount"] == 2
    assert extended["attempts"][0]["requestedPairCount"] == 1
    # A two-hour completed request remains immutable when DMI closes one of
    # its holes. Only the still-required hour counts in the new product matrix.
    product = PINNED_PRODUCTS[0]
    times = [VALID_TIME - timedelta(hours=1), VALID_TIME]
    pairs = [{"partId": TARGET["partId"], "validTime": at.isoformat().replace("+00:00", "Z")} for at in times]
    wide = copy.deepcopy(fresh_registry)
    wide.update(operationalRequiredPairs=pairs, operationalRequiredPairCount=2,
                operationalDmiVerifiedPairCount=116, dmiVerifiedPairCount=163,
                operationalRequiredPairsSha256=required_pairs_sha256(pairs))
    acq = make_acquisition(source=product["source"], acquisition_at=REFERENCE + timedelta(minutes=10),
        request_start_at=times[0], request_end_at=times[-1], targets=[TARGET], native_valid_times=times,
        subset_sha256="sha256:" + "a" * 64, record_count=0)
    attempt = make_source_attempt(production_reference_at=REFERENCE,
        acquisition_at=REFERENCE + timedelta(minutes=10), product=product,
        shard_id=progress_document["attempts"][0]["shardId"], target_part_ids=[TARGET["partId"]],
        requested_pairs=pairs, subset_sha256=acq["subsetSha256"], acquisition_id=acq["acquisitionId"],
        parsed_record_count=0, observed_native_valid_times=acq["nativeValidTimes"])
    wide_stage = build_source_stage_progress(registry=wide, shadow=progress_shadow,
        target_identities={TARGET["partId"]: TARGET}, shadow_sha256=file_sha256(unfinished / "shadow.json"),
        attempts=[attempt], updated_at=REFERENCE + timedelta(minutes=10))
    narrowed = rebase(wide_stage)
    assert narrowed["requiredPairCount"] == 1 and narrowed["attempts"][0]["requestedPairCount"] == 2
    assert narrowed["attempts"][0]["attemptId"] == attempt["attemptId"]
    # Positive AMM15 records and their completed Baltic prerequisite survive
    # a new DMI snapshot, but READY must be rebuilt from the current bindings.
    positive_rebased = validate_reusable_source_stage(amm15_stage, registry=fresh_registry,
        shadow=amm15_shadow_document, target_identities={TARGET["partId"]: TARGET},
        shadow_sha256=file_sha256(amm15 / "shadow.json"), allow_rebase=True)
    assert positive_rebased["status"] == "IN_PROGRESS"
    assert positive_rebased["attempts"] == amm15_stage["attempts"]
    assert positive_rebased["missingPairCount"] == 0

    # A production-reference rollover must not invalidate a still-fresh AMM15
    # row merely because its exact-pair Baltic prerequisite was completed in
    # the preceding source-stage. The immutable attempt timestamps stay honest;
    # only the journal envelope is rebound to the current DMI matrix.
    positive_rolled_registry = shifted_matrix(1)
    positive_rolled = validate_reusable_source_stage(
        amm15_stage,
        registry=positive_rolled_registry,
        shadow=amm15_shadow_document,
        target_identities={TARGET["partId"]: TARGET},
        shadow_sha256=file_sha256(amm15 / "shadow.json"),
        allow_rebase=True,
    )
    assert positive_rolled["status"] == "IN_PROGRESS"
    assert positive_rolled["attempts"] == amm15_stage["attempts"]
    assert positive_rolled["missingPairCount"] == 0
    assert positive_rolled["excludedRecordRefCount"] == 0
    positive_rolled_ready = build_source_stage(
        registry=positive_rolled_registry,
        shadow=amm15_shadow_document,
        target_identities={TARGET["partId"]: TARGET},
        shadow_sha256=file_sha256(amm15 / "shadow.json"),
        attempts=positive_rolled["attempts"],
        sealed_at=REFERENCE + timedelta(hours=1),
    )
    assert positive_rolled_ready["status"] == "READY"
    assert positive_rolled_ready["missingPairCount"] == 0
    assert positive_rolled_ready["excludedRecordRefCount"] == 0
    for bad_document, bad_matrix in [
        ({**progress_document, "attemptsSha256": "sha256:" + "0" * 64}, fresh_registry),
        ({**progress_document, "shadowSha256": "sha256:" + "0" * 64}, fresh_registry),
    ]:
        try:
            rebase(bad_document, bad_matrix)
        except (ValueError, RuntimeError):
            pass
        else:
            raise AssertionError("Tampered source evidence must not survive refresh")
    expired_negative = rebase(progress_document, shifted_matrix(5))
    assert expired_negative["attempts"] == []
    assert expired_negative["missingPairCount"] == progress_document["missingPairCount"]

    # Positive availability is horizon-bound, not four-hour-journal-bound.
    positive_after_five = validate_reusable_source_stage(
        amm15_stage, registry=shifted_matrix(5), shadow=amm15_shadow_document,
        target_identities={TARGET["partId"]: TARGET},
        shadow_sha256=file_sha256(amm15 / "shadow.json"), allow_rebase=True,
    )
    assert positive_after_five["attempts"] == []
    assert positive_after_five["missingPairCount"] == 0
    assert positive_after_five["positiveAdmissions"] == amm15_stage["positiveAdmissions"]
    assert positive_after_five["admissionAttempts"] == amm15_stage["admissionAttempts"]

    # A bank is independent of today's DMI residual, includes the exact
    # original witnesses once, and cannot authorize a replacement acquisition.
    donor_bank = legacy_donor_bank(
        amm15_shadow_document, amm15_stage, targets=[TARGET],
        shadow_sha256=file_sha256(amm15 / "shadow.json"),
    )
    bank_before = copy.deepcopy(donor_bank)
    retained_pair = (TARGET["partId"], VALID_TIME.isoformat().replace("+00:00", "Z"))

    # After one full bank -> projection -> stage transaction, an honest
    # no-record attempt cannot justify rebuilding or rewriting an identical
    # generation. The attempt journal must still advance and fully validate.
    fast_checkpoint = root / "normalized-no-record-checkpoint"
    fast_checkpoint.mkdir()
    fast_registry = json.loads((full / "registry.json").read_text(encoding="utf-8"))
    fast_state = build_copernicus_donor_bank(
        full_shadow,
        targets=[TARGET],
        attempts=[],
        production_reference_at=REFERENCE,
    )
    fast_bank_path = fast_checkpoint / "donor-bank.json"
    fast_shadow_path = fast_checkpoint / "shadow.json"
    fast_stage_path = fast_checkpoint / "source-stage.json"
    fast_updated_at = REFERENCE + timedelta(minutes=10)
    fast_initial_checkpoint = RUNNER_MODULE.persist_source_stage_progress(
        shadow_path=fast_shadow_path,
        source_stage_path=fast_stage_path,
        registry=fast_registry,
        target_identities={TARGET["partId"]: TARGET},
        acquisitions=list(fast_state["shadow"]["acquisitions"]),
        records=list(fast_state["shadow"]["records"]),
        attempts=[],
        updated_at=fast_updated_at,
        shadow_changed=True,
        donor_bank_path=fast_bank_path,
        donor_state=fast_state,
    )
    fast_bank_bytes = fast_bank_path.read_bytes()
    fast_shadow_bytes = fast_shadow_path.read_bytes()
    assert fast_bank_bytes == (
        json.dumps(
            fast_state,
            ensure_ascii=False,
            separators=(",", ":"),
            allow_nan=False,
        ) + "\n"
    ).encode("utf-8")
    assert fast_shadow_bytes == (
        json.dumps(
            fast_initial_checkpoint.shadow,
            ensure_ascii=False,
            indent=2,
            allow_nan=False,
        ) + "\n"
    ).encode("utf-8")
    baltic_product = next(
        row for row in PINNED_PRODUCTS
        if row["source"] == "copernicus-baltic-nemo"
    )
    no_record_acquisition = make_acquisition(
        source=baltic_product["source"],
        acquisition_at=fast_updated_at,
        request_start_at=VALID_TIME,
        request_end_at=VALID_TIME,
        targets=[TARGET],
        native_valid_times=[VALID_TIME],
        subset_sha256=canonical_sha256({"fixture": "normalized-no-record"}),
        record_count=0,
    )
    no_record_attempt = make_source_attempt(
        production_reference_at=REFERENCE,
        acquisition_at=fast_updated_at,
        product=baltic_product,
        shard_id=spatial_shards([TARGET], baltic_product)[0]["shardId"],
        target_part_ids=[TARGET["partId"]],
        requested_pairs=[{
            "partId": TARGET["partId"],
            "validTime": retained_pair[1],
        }],
        subset_sha256=no_record_acquisition["subsetSha256"],
        acquisition_id=no_record_acquisition["acquisitionId"],
        parsed_record_count=0,
        observed_native_valid_times=no_record_acquisition["nativeValidTimes"],
    )
    fast_attempts = [no_record_attempt]
    with (
        patch.object(
            RUNNER_MODULE,
            "_advance_validated_copernicus_donor_bank",
            side_effect=AssertionError("unchanged donor generation was rebuilt"),
        ),
        patch.object(
            RUNNER_MODULE,
            "build_copernicus_donor_bank",
            side_effect=AssertionError("unchanged donor generation was rebuilt"),
        ),
        patch.object(
            RUNNER_MODULE,
            "commit_prepared_donor_generation",
            side_effect=AssertionError("unchanged donor generation was rewritten"),
        ),
    ):
        reused_checkpoint = RUNNER_MODULE.persist_source_stage_progress(
            shadow_path=fast_shadow_path,
            source_stage_path=fast_stage_path,
            registry=fast_registry,
            target_identities={TARGET["partId"]: TARGET},
            acquisitions=list(fast_state["shadow"]["acquisitions"]),
            records=list(fast_state["shadow"]["records"]),
            attempts=fast_attempts,
            updated_at=fast_updated_at,
            shadow_changed=False,
            donor_bank_path=fast_bank_path,
            donor_state=fast_state,
        )
    reused_projection = reused_checkpoint.shadow
    assert fast_bank_path.read_bytes() == fast_bank_bytes
    assert fast_shadow_path.read_bytes() == fast_shadow_bytes
    assert reused_projection == json.loads(fast_shadow_bytes)
    fast_stage = validate_source_stage_progress(
        json.loads(fast_stage_path.read_text(encoding="utf-8")),
        registry=fast_registry,
        shadow=reused_projection,
        target_identities={TARGET["partId"]: TARGET},
        shadow_sha256=file_sha256(fast_shadow_path),
    )
    assert fast_stage["attempts"] == [no_record_attempt]

    # Every completed segment first lands in a small fsynced receipt. The
    # receipt disappears only after the unchanged strict bank -> shadow ->
    # stage transaction succeeds; a failed transaction must leave it replayable.
    segment_journal_path = fast_checkpoint / "copernicus-current-segment-journal.json"
    segment_journal = RUNNER_MODULE.append_segment_journal(
        segment_journal_path,
        None,
        base_bank_sha256=fast_state["bankSha256"],
        production_reference_at=REFERENCE,
        targets=[TARGET],
        acquisition=no_record_acquisition,
        records=[],
        attempt=no_record_attempt,
    )
    assert segment_journal_path.exists()
    assert len(segment_journal["entries"]) == 1
    consolidated_attempts = [no_record_attempt]
    consolidated = RUNNER_MODULE.consolidate_durable_segment_progress(
        shadow_path=fast_shadow_path,
        source_stage_path=fast_stage_path,
        segment_journal_path=segment_journal_path,
        registry=fast_registry,
        target_identities={TARGET["partId"]: TARGET},
        attempts=consolidated_attempts,
        updated_at=fast_updated_at,
        donor_bank_path=fast_bank_path,
        donor_state=fast_state,
        validated_donor_candidate=fast_state,
        bank_changed=False,
    )
    assert not segment_journal_path.exists()
    assert consolidated.shadow == reused_projection
    assert fast_bank_path.read_bytes() == fast_bank_bytes

    RUNNER_MODULE.append_segment_journal(
        segment_journal_path,
        None,
        base_bank_sha256=fast_state["bankSha256"],
        production_reference_at=REFERENCE,
        targets=[TARGET],
        acquisition=no_record_acquisition,
        records=[],
        attempt=no_record_attempt,
    )
    before_failed_consolidation = {
        path: path.read_bytes()
        for path in (fast_bank_path, fast_shadow_path, fast_stage_path)
    }
    with patch.object(
        RUNNER_MODULE,
        "persist_source_stage_progress",
        side_effect=OSError("fixture consolidation failure"),
    ):
        try:
            RUNNER_MODULE.consolidate_durable_segment_progress(
                shadow_path=fast_shadow_path,
                source_stage_path=fast_stage_path,
                segment_journal_path=segment_journal_path,
                registry=fast_registry,
                target_identities={TARGET["partId"]: TARGET},
                attempts=[no_record_attempt],
                updated_at=fast_updated_at,
                donor_bank_path=fast_bank_path,
                donor_state=fast_state,
                validated_donor_candidate=fast_state,
                bank_changed=False,
            )
        except OSError as error:
            assert "consolidation failure" in str(error)
        else:
            raise AssertionError("Failed consolidation must remain fatal")
    assert segment_journal_path.exists()
    assert all(
        path.read_bytes() == payload
        for path, payload in before_failed_consolidation.items()
    )
    RUNNER_MODULE.remove_segment_journal(segment_journal_path)

    # The shortcut must not hide the opposite case: a no-record Baltic witness
    # can admit a retained AMM15 tuple. Such an unresolved generation still
    # takes the complete provenance/build/atomic-commit path.
    admission_checkpoint = root / "no-record-admission-checkpoint"
    admission_checkpoint.mkdir()
    unadmitted_state = build_copernicus_donor_bank(
        amm15_shadow_document,
        targets=[TARGET],
        attempts=[],
        production_reference_at=REFERENCE,
    )
    assert unadmitted_state["positiveAdmissions"] == []
    admission_bank_path = admission_checkpoint / "donor-bank.json"
    admission_shadow_path = admission_checkpoint / "shadow.json"
    admission_stage_path = admission_checkpoint / "source-stage.json"
    RUNNER_MODULE.persist_source_stage_progress(
        shadow_path=admission_shadow_path,
        source_stage_path=admission_stage_path,
        registry=json.loads((amm15 / "registry.json").read_text(encoding="utf-8")),
        target_identities={TARGET["partId"]: TARGET},
        acquisitions=list(unadmitted_state["shadow"]["acquisitions"]),
        records=list(unadmitted_state["shadow"]["records"]),
        attempts=[],
        updated_at=fast_updated_at,
        shadow_changed=True,
        donor_bank_path=admission_bank_path,
        donor_state=unadmitted_state,
    )
    unadmitted_bank_bytes = admission_bank_path.read_bytes()
    admission_registry = json.loads(
        (amm15 / "registry.json").read_text(encoding="utf-8")
    )
    strict_previous = copy.deepcopy(unadmitted_state)
    strict_attempts = list(amm15_stage["attempts"])
    strict_input = empty_shadow(fast_updated_at)
    strict_input["acquisitions"] = list(strict_previous["shadow"]["acquisitions"])
    strict_input["records"] = list(strict_previous["shadow"]["records"])
    strict_bank = build_copernicus_donor_bank(
        strict_input,
        targets=[TARGET],
        attempts=strict_attempts,
        previous_bank=strict_previous,
        production_reference_at=REFERENCE,
        **stage_positive_evidence(strict_previous),
    )
    strict_projection = projected_donor_shadow(strict_bank, targets=[TARGET])
    strict_attempts = RUNNER_MODULE.journal_for_donor_projection(
        strict_attempts,
        bank=strict_bank,
        shadow=strict_projection,
        required_pairs=admission_registry["operationalRequiredPairs"],
        target_identities={TARGET["partId"]: TARGET},
    )
    strict_shadow = empty_shadow(fast_updated_at)
    strict_shadow["acquisitions"] = sorted(
        strict_projection["acquisitions"], key=lambda row: row["acquisitionId"]
    )
    strict_shadow["records"] = sorted(
        strict_projection["records"],
        key=lambda row: (row["validTime"], row["partId"], row["recordId"]),
    )
    strict_shadow_bytes = (
        json.dumps(strict_shadow, ensure_ascii=False, indent=2, allow_nan=False)
        + "\n"
    ).encode("utf-8")
    strict_shadow_sha256 = "sha256:" + hashlib.sha256(strict_shadow_bytes).hexdigest()
    strict_stage = build_source_stage_progress(
        registry=admission_registry,
        shadow=strict_shadow,
        target_identities={TARGET["partId"]: TARGET},
        shadow_sha256=strict_shadow_sha256,
        attempts=strict_attempts,
        updated_at=fast_updated_at,
        **stage_positive_evidence(strict_bank),
    )
    strict_bank_bytes = (
        json.dumps(
            strict_bank,
            ensure_ascii=False,
            separators=(",", ":"),
            allow_nan=False,
        ) + "\n"
    ).encode("utf-8")
    assert (
        CURRENT_MODULE._streaming_canonical_sha256(strict_bank)
        == canonical_sha256(strict_bank)
    )
    strict_stage_bytes = (
        json.dumps(strict_stage, ensure_ascii=False, indent=2, allow_nan=False)
        + "\n"
    ).encode("utf-8")

    admission_attempts = list(amm15_stage["attempts"])
    with (
        patch.object(
            RUNNER_MODULE,
            "commit_prepared_donor_generation",
            wraps=RUNNER_MODULE.commit_prepared_donor_generation,
        ) as admission_commit,
        patch.object(
            CURRENT_MODULE,
            "_validate_record",
            wraps=CURRENT_MODULE._validate_record,
        ) as record_validator,
    ):
        admission_checkpoint_result = RUNNER_MODULE.persist_source_stage_progress(
            shadow_path=admission_shadow_path,
            source_stage_path=admission_stage_path,
            registry=admission_registry,
            target_identities={TARGET["partId"]: TARGET},
            acquisitions=list(unadmitted_state["shadow"]["acquisitions"]),
            records=list(unadmitted_state["shadow"]["records"]),
            attempts=admission_attempts,
            updated_at=fast_updated_at,
            shadow_changed=False,
            donor_bank_path=admission_bank_path,
            donor_state=unadmitted_state,
        )
    assert admission_commit.call_count == 1
    assert record_validator.call_count == 2 * len(strict_bank["shadow"]["records"])
    assert admission_bank_path.read_bytes() != unadmitted_bank_bytes
    assert admission_bank_path.read_bytes() == strict_bank_bytes
    assert admission_shadow_path.read_bytes() == strict_shadow_bytes
    assert admission_stage_path.read_bytes() == strict_stage_bytes
    assert admission_checkpoint_result.shadow == strict_shadow
    assert admission_attempts == strict_attempts
    assert len(unadmitted_state["positiveAdmissions"]) == 1

    # The spooled bytes are checked against the encoder's independently
    # calculated digest, not a hash first learned from the file. Corrupting the
    # second prepared write must therefore fail before bank, shadow or stage is
    # promoted.
    precommit_bytes = {
        path: path.read_bytes()
        for path in (
            admission_bank_path,
            admission_shadow_path,
            admission_stage_path,
        )
    }
    precommit_state = copy.deepcopy(unadmitted_state)
    real_fsync = os.fsync
    fsync_calls = [0]

    def truncate_second_prepared_write(descriptor: int) -> None:
        real_fsync(descriptor)
        fsync_calls[0] += 1
        if fsync_calls[0] == 2:
            os.ftruncate(descriptor, os.fstat(descriptor).st_size - 1)

    with patch.object(
        CURRENT_MODULE.os,
        "fsync",
        side_effect=truncate_second_prepared_write,
    ):
        try:
            RUNNER_MODULE.persist_source_stage_progress(
                shadow_path=admission_shadow_path,
                source_stage_path=admission_stage_path,
                registry=admission_registry,
                target_identities={TARGET["partId"]: TARGET},
                acquisitions=list(unadmitted_state["shadow"]["acquisitions"]),
                records=list(unadmitted_state["shadow"]["records"]),
                attempts=list(admission_attempts),
                updated_at=fast_updated_at,
                shadow_changed=True,
                donor_bank_path=admission_bank_path,
                donor_state=unadmitted_state,
            )
        except RuntimeError as error:
            assert "write/readback differs" in str(error)
        else:
            raise AssertionError("Corrupt prepared write must fail precommit")
    assert fsync_calls == [2]
    assert all(path.read_bytes() == before for path, before in precommit_bytes.items())
    assert unadmitted_state == precommit_state

    retained_generation = RUNNER_MODULE.reusable_validated_donor_generation(
        shadow_path=admission_shadow_path,
        donor_bank_path=admission_bank_path,
        registry=admission_registry,
        target_identities={TARGET["partId"]: TARGET},
        donor_state=unadmitted_state,
    )
    assert retained_generation is not None
    unadmitted_state["sourceMasks"].append({"fixture": "mutated-in-place"})
    assert RUNNER_MODULE.reusable_validated_donor_generation(
        shadow_path=admission_shadow_path,
        donor_bank_path=admission_bank_path,
        registry=admission_registry,
        target_identities={TARGET["partId"]: TARGET},
        donor_state=unadmitted_state,
    ) is None
    unadmitted_state["sourceMasks"].pop()
    assert RUNNER_MODULE.reusable_validated_donor_generation(
        shadow_path=admission_shadow_path,
        donor_bank_path=admission_bank_path,
        registry=admission_registry,
        target_identities={TARGET["partId"]: TARGET},
        donor_state=unadmitted_state,
    ) is retained_generation

    # A prepared stage cannot be rebound to another shadow, journal or registry.
    stage_binding = RUNNER_MODULE.source_stage_snapshot_binding(
        bank_sha256=strict_bank["bankSha256"],
        shadow_sha256=strict_shadow_sha256,
        registry=admission_registry,
        target_identities={TARGET["partId"]: TARGET},
        attempts=strict_attempts,
    )
    prepared_stage_document = copy.deepcopy(strict_stage)
    prepared_stage_a = CURRENT_MODULE._prepare_validated_json_snapshot(
        admission_checkpoint / "prepared-stage-a.json",
        prepared_stage_document,
        binding=stage_binding,
        indent=2,
    )
    try:
        changed_registry = copy.deepcopy(admission_registry)
        changed_registry["operationalRequiredPairs"] = []
        for mixed_binding in (
            RUNNER_MODULE.source_stage_snapshot_binding(
                bank_sha256=strict_bank["bankSha256"],
                shadow_sha256="sha256:" + "0" * 64,
                registry=admission_registry,
                target_identities={TARGET["partId"]: TARGET},
                attempts=strict_attempts,
            ),
            RUNNER_MODULE.source_stage_snapshot_binding(
                bank_sha256=strict_bank["bankSha256"],
                shadow_sha256=strict_shadow_sha256,
                registry=admission_registry,
                target_identities={TARGET["partId"]: TARGET},
                attempts=[],
            ),
            RUNNER_MODULE.source_stage_snapshot_binding(
                bank_sha256=strict_bank["bankSha256"],
                shadow_sha256=strict_shadow_sha256,
                registry=changed_registry,
                target_identities={TARGET["partId"]: TARGET},
                attempts=strict_attempts,
            ),
        ):
            try:
                CURRENT_MODULE._verify_prepared_json_snapshot(
                    prepared_stage_a,
                    binding=mixed_binding,
                )
            except RuntimeError:
                pass
            else:
                raise AssertionError(
                    "Prepared stage must reject mixed shadow/attempt generations"
                )
        prepared_stage_document["attemptsSha256"] = "sha256:" + "0" * 64
        try:
            CURRENT_MODULE._verify_prepared_json_snapshot(
                prepared_stage_a,
                binding=stage_binding,
            )
        except RuntimeError:
            pass
        else:
            raise AssertionError("A mutated prepared stage must be rejected")
    finally:
        CURRENT_MODULE._discard_prepared_json_snapshot(prepared_stage_a)

    # A partial multi-hour Baltic response may be the immutable prerequisite
    # for a later AMM15 row.  When Baltic's only positive sibling ages out of
    # the 168-hour donor retention, the admitted AMM15 tuple must keep its
    # self-contained original prerequisite proof instead of making the entire
    # donor generation unreadable.
    baltic_product = next(
        row for row in PINNED_PRODUCTS
        if row["source"] == "copernicus-baltic-nemo"
    )
    amm_product = next(
        row for row in PINNED_PRODUCTS
        if row["source"] == "copernicus-nws-amm15"
    )
    baltic_at = REFERENCE + timedelta(minutes=10)
    amm_at = REFERENCE + timedelta(minutes=20)
    partial_baltic_acquisition = make_acquisition(
        source=baltic_product["source"], acquisition_at=baltic_at,
        request_start_at=REFERENCE, request_end_at=VALID_TIME,
        targets=[TARGET], native_valid_times=[REFERENCE],
        subset_sha256=canonical_sha256({"fixture": "partial-baltic-retention"}),
        record_count=1,
    )
    partial_baltic_record = make_record(
        {**full_shadow["records"][0], "validTime": REFERENCE},
        partial_baltic_acquisition,
        TARGET,
    )
    partial_baltic_pairs = [
        {"partId": TARGET["partId"], "validTime": REFERENCE.isoformat().replace("+00:00", "Z")},
        {"partId": TARGET["partId"], "validTime": VALID_TIME.isoformat().replace("+00:00", "Z")},
    ]
    partial_baltic_attempt = make_source_attempt(
        production_reference_at=REFERENCE, acquisition_at=baltic_at,
        product=baltic_product,
        shard_id=spatial_shards([TARGET], baltic_product)[0]["shardId"],
        target_part_ids=[TARGET["partId"]], requested_pairs=partial_baltic_pairs,
        subset_sha256=partial_baltic_acquisition["subsetSha256"],
        acquisition_id=partial_baltic_acquisition["acquisitionId"],
        parsed_record_count=1,
        observed_native_valid_times=partial_baltic_acquisition["nativeValidTimes"],
    )
    retained_amm_acquisition = make_acquisition(
        source=amm_product["source"], acquisition_at=amm_at,
        request_start_at=VALID_TIME, request_end_at=VALID_TIME,
        targets=[TARGET], native_valid_times=[VALID_TIME],
        subset_sha256=canonical_sha256({"fixture": "retained-amm-after-partial-baltic"}),
        record_count=1,
    )
    retained_amm_record = make_record(
        amm15_shadow_document["records"][0],
        retained_amm_acquisition,
        TARGET,
    )
    retained_amm_attempt = make_source_attempt(
        production_reference_at=REFERENCE, acquisition_at=amm_at,
        product=amm_product,
        shard_id=spatial_shards([TARGET], amm_product)[0]["shardId"],
        target_part_ids=[TARGET["partId"]],
        requested_pairs=[partial_baltic_pairs[1]],
        subset_sha256=retained_amm_acquisition["subsetSha256"],
        acquisition_id=retained_amm_acquisition["acquisitionId"],
        parsed_record_count=1,
        observed_native_valid_times=retained_amm_acquisition["nativeValidTimes"],
    )
    partial_shadow = empty_shadow(amm_at)
    partial_shadow.update(
        acquisitions=sorted(
            [partial_baltic_acquisition, retained_amm_acquisition],
            key=lambda row: row["acquisitionId"],
        ),
        records=sorted(
            [partial_baltic_record, retained_amm_record],
            key=lambda row: (row["validTime"], row["partId"], row["recordId"]),
        ),
    )
    partial_prerequisite_bank = build_copernicus_donor_bank(
        partial_shadow,
        targets=[TARGET],
        attempts=[partial_baltic_attempt, retained_amm_attempt],
        production_reference_at=REFERENCE,
    )
    assert len(partial_prerequisite_bank["positiveAdmissions"]) == 1
    assert {row["attemptId"] for row in partial_prerequisite_bank["admissionAttempts"]} == {
        partial_baltic_attempt["attemptId"], retained_amm_attempt["attemptId"],
    }
    advanced_reference = REFERENCE + timedelta(hours=169)
    aged_acquisitions, aged_records = merge_cache_evidence(
        partial_prerequisite_bank["shadow"], [], [], advanced_reference,
        {TARGET["partId"]: TARGET},
    )
    aged_shadow = empty_shadow(advanced_reference)
    aged_shadow.update(acquisitions=aged_acquisitions, records=aged_records)
    assert partial_baltic_acquisition["acquisitionId"] not in {
        row["acquisitionId"] for row in aged_acquisitions
    }
    assert retained_amm_acquisition["acquisitionId"] in {
        row["acquisitionId"] for row in aged_acquisitions
    }
    aged_bank = build_copernicus_donor_bank(
        aged_shadow,
        targets=[TARGET],
        attempts=[],
        previous_bank=partial_prerequisite_bank,
        production_reference_at=advanced_reference,
    )
    validate_copernicus_donor_bank(aged_bank, targets=[TARGET])
    assert len(aged_bank["positiveAdmissions"]) == 1
    assert {row["attemptId"] for row in aged_bank["admissionAttempts"]} == {
        partial_baltic_attempt["attemptId"], retained_amm_attempt["attemptId"],
    }
    assert partial_baltic_acquisition["acquisitionId"] not in {
        row["acquisitionId"] for row in aged_bank["shadow"]["acquisitions"]
    }

    # Tied newest acquisitions may deduplicate only exact physical equivalents.
    # A physical conflict masks this source for the pair, not other providers
    # or all cache records; older rows of that same source cannot conceal it.
    baltic_base_record = full_shadow["records"][0]
    baltic_base_acquisition = next(row for row in full_shadow["acquisitions"]
                                  if row["acquisitionId"] == baltic_base_record["acquisitionId"])
    def competing_baltic(tag: str, *, minutes: int = 10, **physical_changes: object) -> tuple[dict, dict]:
        acquisition = make_acquisition(
            source="copernicus-baltic-nemo", acquisition_at=REFERENCE + timedelta(minutes=minutes),
            request_start_at=VALID_TIME, request_end_at=VALID_TIME,
            targets=[TARGET], native_valid_times=[VALID_TIME],
            subset_sha256=canonical_sha256({"fixture": tag}), record_count=1)
        return acquisition, make_record({**baltic_base_record, **physical_changes}, acquisition, TARGET)
    identical_acquisition, identical_record = competing_baltic("identical-other-subset")
    conflicting_acquisition, conflicting_record = competing_baltic(
        "different-vector", uMps=baltic_base_record["uMps"] + 0.01)
    different_cell_acquisition, different_cell_record = competing_baltic(
        "different-layer", verticalLayerM=baltic_base_record["verticalLayerM"] + 1)
    older_acquisition, older_record = competing_baltic("older-unambiguous", minutes=5)
    newer_good_acquisition, newer_good_record = competing_baltic("newer-unambiguous", minutes=11)
    conflict_required = [{"partId": retained_pair[0], "validTime": retained_pair[1]}]
    equivalent_refs, equivalent_missing = select_required_records(
        conflict_required, [baltic_base_acquisition, identical_acquisition],
        [baltic_base_record, identical_record], REFERENCE)
    equivalent_reverse, _ = select_required_records(
        conflict_required, [identical_acquisition, baltic_base_acquisition],
        [identical_record, baltic_base_record], REFERENCE)
    assert equivalent_missing == [] and equivalent_refs == equivalent_reverse
    for other_acquisition, other_record in ((conflicting_acquisition, conflicting_record),
                                             (different_cell_acquisition, different_cell_record)):
        conflict_acquisitions = [baltic_base_acquisition, other_acquisition, older_acquisition]
        conflict_records = [baltic_base_record, other_record, older_record]
        untouched_conflict = copy.deepcopy(conflict_records)
        conflict_refs, conflict_missing = select_required_records(
            conflict_required, conflict_acquisitions, conflict_records, REFERENCE)
        assert conflict_refs == [] and conflict_missing == conflict_required
        assert conflict_records == untouched_conflict
        fallback_refs, fallback_missing, _ = select_source_order_admissible_records(
            conflict_required, [*conflict_acquisitions, *donor_bank["shadow"]["acquisitions"]],
            [*conflict_records, *donor_bank["shadow"]["records"]], REFERENCE, [TARGET], [],
            **stage_positive_evidence(donor_bank))
        assert fallback_missing == [] and fallback_refs[0]["source"] == "copernicus-nws-amm15"
        recovered_refs, recovered_missing = select_required_records(
            conflict_required, [*conflict_acquisitions, newer_good_acquisition],
            [*conflict_records, newer_good_record], REFERENCE)
        assert recovered_missing == [] and recovered_refs[0]["recordId"] == newer_good_record["recordId"]

    assert retained_pair in planning_covered_pairs(
        donor_bank, targets=[TARGET], production_reference_at=REFERENCE + timedelta(hours=5))
    masked_refs, masked_missing, _ = select_source_order_admissible_records(
        [], donor_bank["shadow"]["acquisitions"], donor_bank["shadow"]["records"],
        REFERENCE + timedelta(hours=3), [TARGET], [], **stage_positive_evidence(donor_bank))
    assert masked_refs == [] and masked_missing == [] and donor_bank == bank_before
    assert retained_pair in planning_covered_pairs(
        donor_bank, targets=[TARGET], production_reference_at=REFERENCE + timedelta(hours=6))
    assert planning_covered_pairs(donor_bank, targets=[TARGET],
                                  production_reference_at=VALID_TIME + timedelta(hours=1)) == set()

    legacy_v4 = copy.deepcopy(amm15_stage)
    legacy_v4.update(schemaVersion=4, contractId="copernicus-current-source-stage-ready-v4")
    for key in ("positiveAdmissions", "admissionAttempts", "admissionPolicySha256"):
        legacy_v4.pop(key)
    for evidence in legacy_v4["sourceOrderEvidence"]:
        for key in ("recordId", "acquisitionId", "admissionId"):
            evidence.pop(key)
        evidence["evidenceSha256"] = canonical_sha256({key: value for key, value in evidence.items()
                                                      if key != "evidenceSha256"})
    legacy_v4["sourceOrderEvidenceSha256"] = canonical_sha256(legacy_v4["sourceOrderEvidence"])
    legacy_v4["sourceStageId"] = canonical_sha256({key: value for key, value in legacy_v4.items()
                                                 if key != "sourceStageId"})
    migrated_bank = legacy_donor_bank(
        amm15_shadow_document, legacy_v4, targets=[TARGET],
        shadow_sha256=file_sha256(amm15 / "shadow.json"))
    assert migrated_bank["positiveAdmissions"] == donor_bank["positiveAdmissions"]
    assert migrated_bank["admissionAttempts"] == donor_bank["admissionAttempts"]

    original_record = next(row for row in donor_bank["shadow"]["records"] if row["recordId"] in amm15_record_ids)
    newer_acquisition = make_acquisition(
        source="copernicus-nws-amm15", acquisition_at=REFERENCE + timedelta(hours=5, minutes=10),
        request_start_at=VALID_TIME, request_end_at=VALID_TIME, targets=[TARGET],
        native_valid_times=[VALID_TIME], subset_sha256=canonical_sha256({"fixture": "new-unproved-amm15"}),
        record_count=1)
    newer_record = make_record({**original_record, "uMps": 0.2}, newer_acquisition, TARGET)
    new_source_attempt = make_source_attempt(
        production_reference_at=REFERENCE + timedelta(hours=5),
        acquisition_at=REFERENCE + timedelta(hours=5, minutes=10), product=PINNED_PRODUCTS[1],
        shard_id=next(row["shardId"] for row in amm15_stage["attempts"] if row["source"] == "copernicus-nws-amm15"),
        target_part_ids=[TARGET["partId"]], requested_pairs=[{"partId": retained_pair[0], "validTime": retained_pair[1]}],
        subset_sha256=newer_acquisition["subsetSha256"], acquisition_id=newer_acquisition["acquisitionId"],
        parsed_record_count=1, observed_native_valid_times=newer_acquisition["nativeValidTimes"])
    all_acquisitions = [*donor_bank["shadow"]["acquisitions"], newer_acquisition]
    all_records = [*donor_bank["shadow"]["records"], newer_record]
    selected_old, no_missing, rejected_new = select_source_order_admissible_records(
        [{"partId": retained_pair[0], "validTime": retained_pair[1]}], all_acquisitions, all_records,
        REFERENCE + timedelta(hours=5), [TARGET], [new_source_attempt], **stage_positive_evidence(donor_bank))
    assert no_missing == [] and selected_old[0]["recordId"] == original_record["recordId"]
    assert {row["recordId"] for row in rejected_new} == {newer_record["recordId"]}
    new_only, still_missing, _ = select_source_order_admissible_records(
        [{"partId": retained_pair[0], "validTime": retained_pair[1]}], [newer_acquisition], [newer_record],
        REFERENCE + timedelta(hours=5), [TARGET],
        [new_source_attempt, *[row for row in amm15_stage["attempts"] if row["source"] == "copernicus-baltic-nemo"]])
    assert new_only == [] and len(still_missing) == 1

    bank_path = root / "atomic-donor-bank.json"
    atomic_write_copernicus_donor_bank(bank_path, donor_bank, targets=[TARGET])
    before_bytes = bank_path.read_bytes()
    with patch("lib.copernicus_current_donor_bank.os.replace", side_effect=OSError("fixture atomic swap failure")):
        try:
            atomic_write_copernicus_donor_bank(bank_path, donor_bank, targets=[TARGET])
        except OSError:
            pass
        else:
            raise AssertionError("Injected donor-bank commit failure must propagate")
    assert bank_path.read_bytes() == before_bytes
    assert load_copernicus_donor_bank(bank_path, targets=[TARGET]) == donor_bank
    assert not bank_path.with_name(bank_path.name + ".tmp").exists()
    crash_folder = root / "bank-before-stage-crash"
    crash_folder.mkdir()
    crash_bank_path = crash_folder / "donor-bank.json"
    crash_state = copy.deepcopy(donor_bank)
    crash_output = crash_folder / "github-output.txt"
    real_prepared_commit = RUNNER_MODULE._commit_verified_json_snapshot

    def fail_stage_commit(verified):
        if verified.snapshot.destination == crash_folder / "stage.json":
            raise OSError("fixture stage crash")
        return real_prepared_commit(verified)

    with patch.dict(os.environ, {"GITHUB_OUTPUT": str(crash_output)}), patch.object(
        RUNNER_MODULE,
        "_commit_verified_json_snapshot",
        side_effect=fail_stage_commit,
    ):
        try:
            RUNNER_MODULE.persist_source_stage_progress(
                shadow_path=crash_folder / "shadow.json", source_stage_path=crash_folder / "stage.json",
                registry=shifted_matrix(5), target_identities={TARGET["partId"]: TARGET},
                acquisitions=donor_bank["shadow"]["acquisitions"], records=donor_bank["shadow"]["records"],
                attempts=[], updated_at=REFERENCE + timedelta(hours=5), shadow_changed=True,
                donor_bank_path=crash_bank_path, donor_state=crash_state)
        except OSError:
            pass
        else:
            raise AssertionError("Injected stage crash must propagate")
    recovered_bank = load_copernicus_donor_bank(crash_bank_path, targets=[TARGET])
    assert recovered_bank is not None
    assert retained_pair in planning_covered_pairs(recovered_bank, targets=[TARGET],
                                                  production_reference_at=REFERENCE + timedelta(hours=5))
    assert recovered_bank["positiveAdmissions"] == donor_bank["positiveAdmissions"]
    assert crash_output.read_text(encoding="utf-8") == "donor_bank_written=true\n"

    # A valid bank is authoritative even when a separately restored legacy
    # projection has additional, independently valid records. Do not union it
    # back in or let a stale generation override the atomic donor choice.
    bank_first = root / "bank-first-not-legacy-union"
    shutil.copytree(full, bank_first)
    atomic_write_copernicus_donor_bank(
        bank_first / "copernicus-current-donor-bank.json", donor_bank, targets=[TARGET])
    assert run_checker(bank_first, "--require-source-stage-ready").returncode != 0
    stale_bank_check_output = bank_first / "checker-output.txt"
    stale_bank_check = run_checker(bank_first, "--allow-nonmatching-seal", "--github-output", str(stale_bank_check_output))
    assert stale_bank_check.returncode == 0
    assert "source_stage_ready=false" in stale_bank_check_output.read_text(encoding="utf-8")
    assert "donor_projection_required=true" in stale_bank_check_output.read_text(encoding="utf-8")
    bank_first_run = run_runner(bank_first, bank_first / "fixtures")
    assert bank_first_run.returncode == 0, bank_first_run.stdout + bank_first_run.stderr
    bank_first_shadow = json.loads((bank_first / "shadow.json").read_text(encoding="utf-8"))
    assert {row["recordId"] for row in bank_first_shadow["records"]} == {
        row["recordId"] for row in donor_bank["shadow"]["records"]}
    assert json.loads((bank_first / "source-stage.json").read_text(encoding="utf-8"))["missingPairCount"] == 0
    assert run_checker(bank_first, "--require-source-stage-ready").returncode == 0

    # Bank header rejection quarantines that generation and both projections,
    # but fresh provider collection still gets its own honest empty checkpoint.
    invalid_bank = root / "invalid-bank-continues-collection"
    shutil.copytree(full, invalid_bank)
    write(invalid_bank / "copernicus-current-donor-bank.json", {"invalid": True})
    invalid_bank_check_output = invalid_bank / "checker-output.txt"
    invalid_bank_check = run_checker(invalid_bank, "--allow-nonmatching-seal", "--github-output", str(invalid_bank_check_output))
    assert invalid_bank_check.returncode == 0
    assert "source_stage_ready=false" in invalid_bank_check_output.read_text(encoding="utf-8")
    assert "donor_bank_invalid=true" in invalid_bank_check_output.read_text(encoding="utf-8")
    invalid_bank_run = run_runner(invalid_bank, invalid_bank / "fixtures")
    assert invalid_bank_run.returncode == 0, invalid_bank_run.stdout + invalid_bank_run.stderr
    assert list(invalid_bank.glob("copernicus-current-donor-bank.json.invalid-*"))
    assert list(invalid_bank.glob("shadow.json.invalid-*"))
    assert list(invalid_bank.glob("source-stage.json.invalid-*"))
    assert load_copernicus_donor_bank(
        invalid_bank / "copernicus-current-donor-bank.json", targets=[TARGET]) is not None

    # Quarantine is bounded and never clobbers a different generation. A full
    # archive stops this writer with the original source bytes still present.
    quarantine_fixture = root / "bounded-quarantine"
    quarantine_fixture.mkdir()
    quarantine_source = quarantine_fixture / "source.json"
    for index in range(2):
        write(quarantine_source, {"fixture": index})
        original_hash = file_sha256(quarantine_source).removeprefix("sha256:")
        RUNNER_MODULE.quarantine_invalid_private_file(quarantine_source, "fixture")
        assert not quarantine_source.exists()
        assert (quarantine_fixture / ("source.json.invalid-" + original_hash)).exists()
    write(quarantine_source, {"fixture": "third"})
    quarantine_original = quarantine_source.read_bytes()
    try:
        RUNNER_MODULE.quarantine_invalid_private_file(quarantine_source, "fixture")
    except RuntimeError:
        pass
    else:
        raise AssertionError("Full quarantine must stop before changing original bytes")
    assert quarantine_source.read_bytes() == quarantine_original
    assert len(list(quarantine_fixture.glob("source.json.invalid-*"))) == 2
    byte_limited_source = quarantine_fixture / "byte-limited.json"
    write(byte_limited_source, {"fixture": "larger than allowed"})
    with patch.object(RUNNER_MODULE, "QUARANTINE_MAX_BYTES_PER_PATH", 1):
        try:
            RUNNER_MODULE.quarantine_invalid_private_file(byte_limited_source, "fixture")
        except RuntimeError:
            pass
        else:
            raise AssertionError("Quarantine byte cap must stop before archiving")
    assert byte_limited_source.exists()

    # DMI can hide the old AMM15 pair while a bounded quality run adds history.
    # The current stage deliberately has no such admission; the bank must not
    # replace its full proof set with that empty operational projection.
    masked_quality = root / "quality-preserves-masked-reserve"
    shutil.copytree(amm15, masked_quality)
    masked_registry = json.loads((masked_quality / "registry.json").read_text(encoding="utf-8"))
    masked_registry.update(operationalRequiredPairs=[], operationalRequiredPairCount=0,
        operationalDmiVerifiedPairCount=118, dmiVerifiedPairCount=165,
        operationalPartCount=0, operationalRequiredPairsSha256=required_pairs_sha256([]))
    write(masked_quality / "registry.json", masked_registry)
    masked_run = run_runner(masked_quality, masked_quality / "fixtures")
    assert masked_run.returncode == 0, masked_run.stdout + masked_run.stderr
    masked_stage = json.loads((masked_quality / "source-stage.json").read_text(encoding="utf-8"))
    assert masked_stage["positiveAdmissions"] == []
    dataset(masked_quality / "fixtures/copernicus-baltic-nemo.nc", available=False, advisory_available=True)
    masked_refresh = run_runner(masked_quality, masked_quality / "fixtures",
        acquisition_at=REFERENCE + timedelta(minutes=20), refresh_only=True)
    assert masked_refresh.returncode == 0, masked_refresh.stdout + masked_refresh.stderr
    masked_bank = load_copernicus_donor_bank(
        masked_quality / "copernicus-current-donor-bank.json", targets=[TARGET])
    assert masked_bank["positiveAdmissions"] == donor_bank["positiveAdmissions"]
    assert masked_bank["admissionAttempts"] == donor_bank["admissionAttempts"]
    assert len(masked_bank["shadow"]["records"]) > len(donor_bank["shadow"]["records"])
    for field in ("recordId", "acquisitionId", "targetRegistrySha256", "admissionPolicySha256", "prerequisiteAttemptId"):
        tampered_bank = copy.deepcopy(donor_bank)
        certificate = tampered_bank["positiveAdmissions"][0]
        certificate[field] = "sha256:" + "0" * 64
        certificate["admissionId"] = canonical_sha256({key: value for key, value in certificate.items()
                                                       if key != "admissionId"})
        tampered_bank["bankSha256"] = canonical_sha256({key: value for key, value in tampered_bank.items()
                                                       if key != "bankSha256"})
        try:
            validate_copernicus_donor_bank(tampered_bank, targets=[TARGET])
        except (ValueError, RuntimeError):
            pass
        else:
            raise AssertionError("Rehashed false positive admission must fail closed")

    # Independent original membership localizes damaged identity fields. Keep
    # a genuine conflict sibling to prove that salvage cannot make it appear
    # uniquely selectable merely by dropping its damaged counterpart.
    other_target = {**TARGET, "partId": "fixture-independent-good-part"}
    manifest_targets = [TARGET, other_target]
    other_acquisition = make_acquisition(source="copernicus-baltic-nemo",
        acquisition_at=REFERENCE + timedelta(minutes=10), request_start_at=VALID_TIME, request_end_at=VALID_TIME,
        targets=[other_target], native_valid_times=[VALID_TIME], subset_sha256=canonical_sha256({"fixture": "disjoint"}), record_count=1)
    other_record = make_record({**baltic_base_record, "partId": other_target["partId"]}, other_acquisition, other_target)
    original_amm_record = donor_bank["shadow"]["records"][0]
    other_amm_acquisition = make_acquisition(source="copernicus-nws-amm15",
        acquisition_at=REFERENCE + timedelta(minutes=10), request_start_at=VALID_TIME, request_end_at=VALID_TIME,
        targets=[TARGET], native_valid_times=[VALID_TIME], subset_sha256=canonical_sha256({"fixture": "conflict"}), record_count=1)
    other_amm_record = make_record({**original_amm_record, "uMps": original_amm_record["uMps"] + 0.01}, other_amm_acquisition, TARGET)
    amm_product = next(row for row in PINNED_PRODUCTS if row["source"] == "copernicus-nws-amm15")
    baltic_product = next(row for row in PINNED_PRODUCTS if row["source"] == "copernicus-baltic-nemo")
    def proof_attempt(acquisition: dict, *, product: dict, reference: datetime) -> dict:
        attempt_targets = [row for row in manifest_targets
                           if row["partId"] in acquisition["targetPartIds"]]
        return make_source_attempt(product=product, production_reference_at=reference,
            acquisition_at=datetime.fromisoformat(acquisition["acquisitionAt"].replace("Z", "+00:00")),
            shard_id=spatial_shards(attempt_targets, product)[0]["shardId"],
            target_part_ids=acquisition["targetPartIds"], requested_pairs=conflict_required,
            subset_sha256=acquisition["subsetSha256"], acquisition_id=acquisition["acquisitionId"],
            parsed_record_count=acquisition["recordCount"],
            observed_native_valid_times=acquisition["nativeValidTimes"])
    conflict_manifest_shadow = {**donor_bank["shadow"],
        "acquisitions": sorted([*donor_bank["shadow"]["acquisitions"], other_acquisition, other_amm_acquisition], key=lambda row: row["acquisitionId"]),
        "records": sorted([*donor_bank["shadow"]["records"], other_record, other_amm_record], key=lambda row: (row["validTime"], row["partId"], row["recordId"]))}
    manifest_bank = build_copernicus_donor_bank(conflict_manifest_shadow, targets=manifest_targets,
        attempts=[*amm15_stage["attempts"], proof_attempt(other_amm_acquisition, product=amm_product, reference=REFERENCE)])
    other_pair = (other_target["partId"], retained_pair[1])
    assert planning_covered_pairs(manifest_bank, targets=manifest_targets, production_reference_at=REFERENCE) == {other_pair}
    for damage in ("partId", "validTime", "recordId", "acquisition-delete"):
        damaged_bank = copy.deepcopy(manifest_bank)
        damaged_row = next(row for row in damaged_bank["shadow"]["records"] if row["recordId"] == original_amm_record["recordId"])
        if damage == "acquisition-delete":
            damaged_bank["shadow"]["acquisitions"] = [row for row in damaged_bank["shadow"]["acquisitions"]
                                                       if row["acquisitionId"] != damaged_row["acquisitionId"]]
        elif damage == "partId":
            damaged_row["partId"] = other_target["partId"]
        elif damage == "validTime":
            damaged_row["validTime"] = (VALID_TIME - timedelta(hours=1)).isoformat().replace("+00:00", "Z")
        else:
            damaged_row["recordId"] = "sha256:" + "f" * 64
        recovered_manifest_bank = recover_copernicus_donor_bank(damaged_bank, targets=manifest_targets)
        assert {(row["partId"], row["validTime"], row["source"]) for row in recovered_manifest_bank["sourceMasks"]} == {
            (retained_pair[0], retained_pair[1], "copernicus-nws-amm15")}
        assert other_amm_record["recordId"] in {row["recordId"] for row in recovered_manifest_bank["shadow"]["records"]}
        assert planning_covered_pairs(recovered_manifest_bank, targets=manifest_targets, production_reference_at=REFERENCE) == {other_pair}
        for next_hour in (1, 2):
            projection = projected_donor_shadow(recovered_manifest_bank, targets=manifest_targets)
            recovered_manifest_bank = build_copernicus_donor_bank(projection, targets=manifest_targets, attempts=[],
                previous_bank=recovered_manifest_bank, production_reference_at=REFERENCE + timedelta(hours=next_hour))
            assert len(recovered_manifest_bank["sourceMasks"]) == 1
            assert other_amm_record["recordId"] in {row["recordId"] for row in recovered_manifest_bank["shadow"]["records"]}
            assert planning_covered_pairs(recovered_manifest_bank, targets=manifest_targets,
                production_reference_at=REFERENCE + timedelta(hours=next_hour)) == {other_pair}

    # The shared quality candidate helper preserves masks and reserves while
    # independently improving an unmasked source/pair.
    quality_mask_bank, quality_mask_projection = RUNNER_MODULE.donor_candidate_projection(
        acquisitions=recovered_manifest_bank["shadow"]["acquisitions"], records=recovered_manifest_bank["shadow"]["records"],
        attempts=[], donor_state=recovered_manifest_bank, targets=manifest_targets,
        reference=REFERENCE + timedelta(hours=2), updated_at=REFERENCE + timedelta(hours=2, minutes=10))
    assert quality_mask_bank["sourceMasks"] == recovered_manifest_bank["sourceMasks"]
    assert other_amm_record["recordId"] not in {row["recordId"] for row in quality_mask_projection["records"]}
    assert other_amm_record["recordId"] in {row["recordId"] for row in quality_mask_bank["shadow"]["records"]}

    healing_reference = REFERENCE + timedelta(hours=3)
    healing_acquisition = make_acquisition(source="copernicus-nws-amm15",
        acquisition_at=healing_reference + timedelta(minutes=20), request_start_at=VALID_TIME, request_end_at=VALID_TIME,
        targets=[TARGET], native_valid_times=[VALID_TIME], subset_sha256=canonical_sha256({"fixture": "healing"}), record_count=1)
    healing_record = make_record(original_amm_record, healing_acquisition, TARGET)
    healing_input = {**quality_mask_projection,
        "acquisitions": sorted([*quality_mask_projection["acquisitions"], healing_acquisition], key=lambda row: row["acquisitionId"]),
        "records": sorted([*quality_mask_projection["records"], healing_record], key=lambda row: (row["validTime"], row["partId"], row["recordId"]))}
    healing_source_attempt = proof_attempt(healing_acquisition, product=amm_product, reference=healing_reference)
    unadmitted_healing = build_copernicus_donor_bank(healing_input, targets=manifest_targets,
        attempts=[healing_source_attempt], previous_bank=quality_mask_bank, production_reference_at=healing_reference)
    assert len(unadmitted_healing["sourceMasks"]) == 1
    fresh_baltic = make_acquisition(source="copernicus-baltic-nemo",
        acquisition_at=healing_reference + timedelta(minutes=10), request_start_at=VALID_TIME, request_end_at=VALID_TIME,
        targets=[TARGET], native_valid_times=[VALID_TIME], subset_sha256=canonical_sha256({"fixture": "fresh-negative"}), record_count=0)
    healing_attempts = [
        proof_attempt(
            fresh_baltic,
            product=baltic_product,
            reference=healing_reference,
        ),
        healing_source_attempt,
    ]
    healed_bank = build_copernicus_donor_bank(healing_input, targets=manifest_targets,
        attempts=healing_attempts,
        previous_bank=unadmitted_healing, production_reference_at=healing_reference)
    assert healed_bank["sourceMasks"] == []
    assert planning_covered_pairs(healed_bank, targets=manifest_targets, production_reference_at=healing_reference) == {retained_pair, other_pair}

    # The process-local advance is exactly the strict public mask-healing result.
    # Its serialized payload is spooled, not retained as another byte copy.
    advanced_healed_bank = _advance_validated_copernicus_donor_bank(
        healing_input,
        targets=manifest_targets,
        attempts=healing_attempts,
        previous_bank=validate_copernicus_donor_bank(
            unadmitted_healing,
            targets=manifest_targets,
        ),
        production_reference_at=healing_reference,
    )
    assert advanced_healed_bank == healed_bank
    assert _project_validated_donor_shadow(advanced_healed_bank) == (
        projected_donor_shadow(healed_bank, targets=manifest_targets)
    )
    prepared_mask_path = root / "prepared-mask-bank.json"
    prepared_mask_document = copy.deepcopy(advanced_healed_bank)
    prepared_mask_binding = RUNNER_MODULE.donor_snapshot_binding(
        advanced_healed_bank["bankSha256"], manifest_targets
    )
    prepared_mask = CURRENT_MODULE._prepare_validated_json_snapshot(
        prepared_mask_path,
        prepared_mask_document,
        binding=prepared_mask_binding,
        indent=None,
    )
    try:
        assert not hasattr(prepared_mask, "payload")
        assert not any(
            isinstance(getattr(prepared_mask, name), (bytes, bytearray))
            for name in prepared_mask.__slots__
        )
        prepared_mask_document["sourceMasks"].append({"fixture": "mutation"})
        try:
            CURRENT_MODULE._verify_prepared_json_snapshot(
                prepared_mask,
                binding=prepared_mask_binding,
            )
        except RuntimeError:
            pass
        else:
            raise AssertionError("A mutated prepared donor must be rejected")
    finally:
        CURRENT_MODULE._discard_prepared_json_snapshot(prepared_mask)

    # A failed atomic promotion keeps the old valid generation, and altered
    # staged bytes cannot be promoted after the initial readback hash.
    prepared_crash_path = root / "prepared-crash-bank.json"
    atomic_write_copernicus_donor_bank(
        prepared_crash_path,
        unadmitted_healing,
        targets=manifest_targets,
    )
    prepared_crash_before = prepared_crash_path.read_bytes()
    prepared_crash = CURRENT_MODULE._prepare_validated_json_snapshot(
        prepared_crash_path,
        advanced_healed_bank,
        binding=prepared_mask_binding,
        indent=None,
    )
    try:
        verified_crash = CURRENT_MODULE._verify_prepared_json_snapshot(
            prepared_crash,
            binding=prepared_mask_binding,
        )
        with patch.object(
            CURRENT_MODULE.os,
            "replace",
            side_effect=OSError("fixture prepared swap failure"),
        ):
            try:
                RUNNER_MODULE.commit_prepared_donor_generation(
                    prepared_crash,
                    verified=verified_crash,
                )
            except OSError:
                pass
            else:
                raise AssertionError("Prepared donor swap failure must propagate")
        assert prepared_crash_path.read_bytes() == prepared_crash_before
    finally:
        CURRENT_MODULE._discard_prepared_json_snapshot(prepared_crash)

    prepared_tamper = CURRENT_MODULE._prepare_validated_json_snapshot(
        prepared_crash_path,
        advanced_healed_bank,
        binding=prepared_mask_binding,
        indent=None,
    )
    try:
        prepared_tamper.temporary.write_bytes(b"tampered\n")
        try:
            CURRENT_MODULE._verify_prepared_json_snapshot(
                prepared_tamper,
                binding=prepared_mask_binding,
            )
        except RuntimeError:
            pass
        else:
            raise AssertionError("Changed prepared donor bytes must be rejected")
        assert prepared_crash_path.read_bytes() == prepared_crash_before
    finally:
        CURRENT_MODULE._discard_prepared_json_snapshot(prepared_tamper)

    control_damage = copy.deepcopy(manifest_bank)
    control_damage["manifest"]["records"][0]["partId"] = "untrusted-original-membership"
    try:
        recover_copernicus_donor_bank(control_damage, targets=manifest_targets)
    except ValueError:
        pass
    else:
        raise AssertionError("Damaged original membership must reject the entire bank")

    # Recovery preserves the damaged authoritative pathname until the single
    # atomic replacement. A failure cannot revive a maskless legacy projection.
    recovery_folder = root / "manifest-recovery-commit-crash"
    recovery_folder.mkdir()
    recovery_path = recovery_folder / "copernicus-current-donor-bank.json"
    write(recovery_path, damaged_bank)
    recovery_bytes = recovery_path.read_bytes()
    recovery_diagnostics = {}
    recovery_candidate = load_copernicus_donor_bank(recovery_path, targets=manifest_targets, diagnostics=recovery_diagnostics)
    assert recovery_diagnostics["recovered"] is True
    assert recovery_path.read_bytes() == recovery_bytes
    RUNNER_MODULE.RECOVERED_DONOR_BANKS[recovery_path.resolve()] = recovery_diagnostics["originalFileSha256"]
    with patch.object(RUNNER_MODULE, "atomic_write_copernicus_donor_bank", side_effect=OSError("fixture bank write crash")):
        try:
            RUNNER_MODULE.commit_donor_bank(recovery_path, recovery_candidate, targets=manifest_targets)
        except OSError:
            pass
        else:
            raise AssertionError("Injected bank write failure must propagate")
    assert recovery_path.read_bytes() == recovery_bytes
    assert next(recovery_folder.glob("copernicus-current-donor-bank.json.invalid-*")).read_bytes() == recovery_bytes
    with patch.dict(os.environ, {"GITHUB_OUTPUT": str(recovery_folder / "output.txt")}):
        RUNNER_MODULE.commit_donor_bank(recovery_path, recovery_candidate, targets=manifest_targets)
    assert load_copernicus_donor_bank(recovery_path, targets=manifest_targets)["sourceMasks"] == recovery_candidate["sourceMasks"]

    # A current global availability plan defers an already-covered fallback
    # pair, while a genuine hole gets the provider budget first. The complete
    # DMI residual still reaches the honest IN_PROGRESS stage unchanged.
    planned = root / "global-critical-before-quality"
    planned_fixtures = planned / "fixtures"
    planned_fixtures.mkdir(parents=True)
    planned_targets = [TARGET, {**TARGET, "partId": "fixture-real-union-hole", "waterPoint": [9.13, 57.654321]}]
    prepare_multi(planned, planned_targets)
    plan = build_current_acquisition_plan(
        targets=planned_targets, production_reference_at=REFERENCE,
        covered_pairs=[retained_pair], source_input_hashes={"fixture-fallback": donor_bank["bankSha256"]})
    write(planned / "weather-current-acquisition-plan.json", plan)
    dataset(planned_fixtures / "copernicus-baltic-nemo.nc", available=True, target=planned_targets[1])
    planned_run = run_runner(planned, planned_fixtures)
    assert planned_run.returncode == 0, planned_run.stdout + planned_run.stderr
    planned_stage = json.loads((planned / "source-stage.json").read_text(encoding="utf-8"))
    assert planned_stage["status"] == "IN_PROGRESS"
    assert planned_stage["requiredPairCount"] == 2 and planned_stage["missingPairCount"] == 1
    assert {pair["partId"] for attempt in planned_stage["attempts"] for pair in attempt["requestedPairs"]} == {
        planned_targets[1]["partId"]}
    assert "Kildeled: IN_PROGRESS" in planned_run.stdout

    # The next run has no Baltic fixture.  Success therefore proves that only
    # the exact documented Baltic attempt was skipped before AMM15 continued.
    (unfinished_fixtures / "copernicus-baltic-nemo.nc").unlink()
    dataset(unfinished_fixtures / "copernicus-nws-amm15.nc", available=True)
    stopped_environment = dict(os.environ)
    stopped_environment["RAVRADAR_COPERNICUS_SOFT_DEADLINE_EPOCH"] = "1"
    stopped_at_boundary = run_runner(
        unfinished,
        unfinished_fixtures,
        env=stopped_environment,
    )
    assert stopped_at_boundary.returncode == 75
    assert "bounded progress was saved at a shard boundary" in stopped_at_boundary.stderr
    stopped_progress_document = json.loads(
        (unfinished / "source-stage.json").read_text(encoding="utf-8")
    )
    stopped_progress = validate_source_stage_progress(
        stopped_progress_document,
        registry=fresh_registry,
        shadow=progress_shadow,
        target_identities={TARGET["partId"]: TARGET},
        shadow_sha256=file_sha256(unfinished / "shadow.json"),
    )
    assert stopped_progress["status"] == "IN_PROGRESS"
    assert stopped_progress["attempts"] == progress_document["attempts"]
    assert (
        stopped_progress["dmiCurrentInputSha256"]
        == fresh_registry["dmiCurrentInputSha256"]
    )
    resumed = run_runner(unfinished, unfinished_fixtures)
    assert resumed.returncode == 0, resumed.stdout + resumed.stderr
    resumed_stage = json.loads(
        (unfinished / "source-stage.json").read_text(encoding="utf-8")
    )
    assert resumed_stage["status"] == "READY"
    assert len(resumed_stage["attempts"]) == 2

    # Two completed shards (one positive, one zero-result) must both survive
    # an interruption before shard three.  The positive shadow is written and
    # hash-bound before the journal; the zero attempt is equally resumable.
    monotone = root / "monotone-positive-zero"
    monotone_fixtures = monotone / "fixtures"
    monotone_fixtures.mkdir(parents=True)
    monotone_targets = [
        {
            **TARGET,
            "partId": "fixture-private-monotone-a",
            "waterPoint": [9.1, 57.2],
        },
        {
            **TARGET,
            "partId": "fixture-private-monotone-b",
            "waterPoint": [10.4, 57.2],
        },
        {
            **TARGET,
            "partId": "fixture-private-monotone-c",
            "waterPoint": [11.7, 57.2],
        },
    ]
    prepare_multi(monotone, monotone_targets)
    dataset(
        monotone_fixtures / "copernicus-baltic-nemo-000.nc",
        available=True,
        target=monotone_targets[0],
    )
    dataset(
        monotone_fixtures / "copernicus-baltic-nemo-001.nc",
        available=False,
        target=monotone_targets[1],
    )
    first_pass = run_runner(monotone, monotone_fixtures)
    assert first_pass.returncode != 0
    monotone_progress_document = json.loads(
        (monotone / "source-stage.json").read_text(encoding="utf-8")
    )
    monotone_shadow = json.loads(
        (monotone / "shadow.json").read_text(encoding="utf-8")
    )
    monotone_registry = json.loads(
        (monotone / "registry.json").read_text(encoding="utf-8")
    )
    monotone_progress = validate_source_stage_progress(
        monotone_progress_document,
        registry=monotone_registry,
        shadow=monotone_shadow,
        target_identities={row["partId"]: row for row in monotone_targets},
        shadow_sha256=file_sha256(monotone / "shadow.json"),
    )
    assert [row["parsedRecordCount"] for row in monotone_progress["attempts"]] == [1, 0]
    assert len(monotone_shadow["records"]) == 1
    assert monotone_progress["shadowSha256"] == file_sha256(monotone / "shadow.json")
    assert monotone_progress["attempts"][0]["acquisitionId"] in {
        row["acquisitionId"] for row in monotone_shadow["acquisitions"]
    }

    # A one-hour rollover may reuse the positive exact-time record under the
    # existing freshness rule, but the old zero-result attempt cannot be
    # relabelled to the new production reference.
    rolled_reference = REFERENCE + timedelta(hours=1)
    rolled_registry = {
        **monotone_registry,
        "productionReferenceAt": rolled_reference.isoformat().replace("+00:00", "Z"),
        "targetHour": rolled_reference.isoformat().replace("+00:00", "Z"),
        "rangeStartAt": (rolled_reference - timedelta(hours=48)).isoformat().replace("+00:00", "Z"),
        "rangeEndAt": (rolled_reference + timedelta(hours=117)).isoformat().replace("+00:00", "Z"),
        "operationalRangeStartAt": rolled_reference.isoformat().replace("+00:00", "Z"),
        "operationalRangeEndAt": (rolled_reference + timedelta(hours=117)).isoformat().replace("+00:00", "Z"),
        "advisoryHistoryStartAt": (rolled_reference - timedelta(hours=48)).isoformat().replace("+00:00", "Z"),
        "advisoryHistoryEndAt": (rolled_reference - timedelta(hours=1)).isoformat().replace("+00:00", "Z"),
    }
    rolled_refs, _ = select_required_records(
        [monotone_registry["operationalRequiredPairs"][0]],
        monotone_shadow["acquisitions"],
        monotone_shadow["records"],
        rolled_reference,
    )
    assert len(rolled_refs) == 1
    try:
        validate_source_stage_progress(
            monotone_progress_document,
            registry=rolled_registry,
            shadow=monotone_shadow,
            target_identities={row["partId"]: row for row in monotone_targets},
            shadow_sha256=file_sha256(monotone / "shadow.json"),
        )
    except CopernicusSourceStageError:
        pass
    else:
        raise AssertionError(
            "A zero-result attempt must not be relabelled across references"
        )

    # Remove both completed-shard fixtures.  The resumed run can succeed only
    # by skipping those two exact attempts and executing shard three.
    (monotone_fixtures / "copernicus-baltic-nemo-000.nc").unlink()
    (monotone_fixtures / "copernicus-baltic-nemo-001.nc").unlink()
    dataset(
        monotone_fixtures / "copernicus-baltic-nemo-002.nc",
        available=True,
        target=monotone_targets[2],
    )
    monotone_resumed = run_runner(monotone, monotone_fixtures)
    assert monotone_resumed.returncode == 0, (
        monotone_resumed.stdout + monotone_resumed.stderr
    )
    monotone_ready = json.loads(
        (monotone / "source-stage.json").read_text(encoding="utf-8")
    )
    assert monotone_ready["status"] == "READY"
    assert len(monotone_ready["attempts"]) == 3

    # On the next production reference, fresh records still obey the unchanged
    # four-hour acquisition window. A zero-result old attempt is audit evidence,
    # not retry suppression: the exact shard is fetched again and its immutable
    # old attempt is replaced only after the new request completes.
    before_roll_shadow = json.loads(
        (monotone / "shadow.json").read_text(encoding="utf-8")
    )
    before_roll_record_ids = {
        row["recordId"] for row in before_roll_shadow["records"]
    }
    old_zero_attempt = next(
        row for row in monotone_ready["attempts"]
        if row["parsedRecordCount"] == 0
    )
    dataset(
        monotone_fixtures / "copernicus-baltic-nemo-001.nc",
        available=True,
        target=monotone_targets[1],
    )
    write(monotone / "registry.json", rolled_registry)
    rolled_run = run_runner(
        monotone,
        monotone_fixtures,
        reference=rolled_reference,
    )
    assert rolled_run.returncode == 0, rolled_run.stdout + rolled_run.stderr
    after_roll_shadow = json.loads(
        (monotone / "shadow.json").read_text(encoding="utf-8")
    )
    after_roll_stage = json.loads(
        (monotone / "source-stage.json").read_text(encoding="utf-8")
    )
    rolled_refs, rolled_missing = select_required_records(
        rolled_registry["operationalRequiredPairs"],
        after_roll_shadow["acquisitions"],
        after_roll_shadow["records"],
        rolled_reference,
    )
    assert len(rolled_refs) == len(monotone_targets) and rolled_missing == []
    assert before_roll_record_ids.issubset({
        row["recordId"] for row in after_roll_shadow["records"]
    })
    assert old_zero_attempt["attemptId"] not in {
        row["attemptId"] for row in after_roll_stage["attempts"]
    }
    replacement = next(
        row for row in after_roll_stage["attempts"]
        if row["shardId"] == old_zero_attempt["shardId"]
    )
    assert replacement["productionReferenceAt"] == rolled_registry["productionReferenceAt"]
    assert replacement["parsedRecordCount"] == 1
    assert any(
        row["productionReferenceAt"] == monotone_registry["productionReferenceAt"]
        and row["parsedRecordCount"] > 0
        for row in after_roll_stage["attempts"]
    )

    # A single old shard attempt may contain both a positive pair and a
    # zero-result pair. After rollover only the actual current residual is
    # retried; the unrelated still-selectable row remains physically reusable.
    mixed = root / "mixed-positive-zero-rollover"
    mixed_fixtures = mixed / "fixtures"
    mixed_fixtures.mkdir(parents=True)
    mixed_targets = [
        {
            **TARGET,
            "partId": "fixture-private-mixed-a",
            "waterPoint": [9.1, 57.2],
        },
        {
            **TARGET,
            "partId": "fixture-private-mixed-b",
            "waterPoint": [10.0, 57.2],
        },
    ]
    prepare_multi(mixed, mixed_targets)
    mixed_shard_dataset(
        mixed_fixtures / "copernicus-baltic-nemo-000.nc",
        targets=mixed_targets,
        second_available=False,
    )
    mixed_first = run_runner(mixed, mixed_fixtures)
    assert mixed_first.returncode == 0, mixed_first.stdout + mixed_first.stderr
    mixed_old_stage = json.loads(
        (mixed / "source-stage.json").read_text(encoding="utf-8")
    )
    mixed_old_shadow = json.loads(
        (mixed / "shadow.json").read_text(encoding="utf-8")
    )
    mixed_old_attempt = mixed_old_stage["attempts"][0]
    assert mixed_old_attempt["requestedPairCount"] == 2
    assert mixed_old_attempt["parsedRecordCount"] == 1
    mixed_old_record_ids = {
        row["recordId"] for row in mixed_old_shadow["records"]
    }
    mixed_registry = json.loads(
        (mixed / "registry.json").read_text(encoding="utf-8")
    )
    mixed_rolled_registry = shifted_matrix(1, mixed_registry)
    write(mixed / "registry.json", mixed_rolled_registry)
    mixed_shard_dataset(
        mixed_fixtures / "copernicus-baltic-nemo-000.nc",
        targets=mixed_targets,
        second_available=True,
    )
    mixed_rolled_run = run_runner(
        mixed,
        mixed_fixtures,
        reference=rolled_reference,
    )
    assert mixed_rolled_run.returncode == 0, (
        mixed_rolled_run.stdout + mixed_rolled_run.stderr
    )
    mixed_new_stage = json.loads(
        (mixed / "source-stage.json").read_text(encoding="utf-8")
    )
    mixed_new_shadow = json.loads(
        (mixed / "shadow.json").read_text(encoding="utf-8")
    )
    assert len(mixed_new_stage["attempts"]) == 2
    assert mixed_old_attempt in mixed_new_stage["attempts"]
    mixed_new_attempt = next(row for row in mixed_new_stage["attempts"]
                             if row["productionReferenceAt"] == mixed_rolled_registry["productionReferenceAt"])
    assert mixed_new_attempt["productionReferenceAt"] == mixed_rolled_registry[
        "productionReferenceAt"
    ]
    assert mixed_new_attempt["requestedPairs"] == [{
        "partId": mixed_targets[1]["partId"],
        "validTime": mixed_rolled_registry["operationalRequiredPairs"][1][
            "validTime"
        ],
    }]
    assert mixed_new_attempt["requestedPairCount"] == 1
    assert mixed_new_attempt["parsedRecordCount"] == 1
    assert mixed_old_attempt["attemptId"] != mixed_new_attempt["attemptId"]
    assert mixed_old_record_ids.issubset({
        row["recordId"] for row in mixed_new_shadow["records"]
    })
    mixed_refs, mixed_missing = select_required_records(
        mixed_rolled_registry["operationalRequiredPairs"],
        mixed_new_shadow["acquisitions"],
        mixed_new_shadow["records"],
        rolled_reference,
    )
    assert len(mixed_refs) == 2 and mixed_missing == []

    # A separate post-closure refresh job processes the oldest still-selectable
    # acquisition first. A provider failure is non-fatal and leaves the exact
    # original READY cache/stage bytes untouched; success appends a fresh record
    # without deleting either old record.
    refresh = root / "bounded-refresh-only"
    refresh_fixtures = refresh / "fixtures"
    refresh_fixtures.mkdir(parents=True)
    refresh_targets = [
        {
            **TARGET,
            "partId": "fixture-private-refresh-a-oldest",
            "waterPoint": [9.1, 57.2],
        },
        {
            **TARGET,
            "partId": "fixture-private-refresh-b-newer",
            "waterPoint": [10.4, 57.2],
        },
    ]
    prepare_multi(refresh, refresh_targets)
    refresh_registry = json.loads(
        (refresh / "registry.json").read_text(encoding="utf-8")
    )
    refresh_acquisitions = []
    refresh_records = []
    for ordinal, target in enumerate(refresh_targets, start=1):
        acquired_at = REFERENCE + timedelta(minutes=ordinal * 3)
        acquisition = make_acquisition(
            source="copernicus-baltic-nemo",
            acquisition_at=acquired_at,
            request_start_at=VALID_TIME,
            request_end_at=VALID_TIME,
            targets=[target],
            native_valid_times=[VALID_TIME],
            subset_sha256=canonical_sha256({"refreshFixture": ordinal}),
            record_count=1,
        )
        refresh_acquisitions.append(acquisition)
        refresh_records.append(make_record({
            "partId": target["partId"],
            "parentZoneId": target["parentZoneId"],
            "validTime": VALID_TIME,
            "samplingPoint": target["waterPoint"],
            "gridPoint": target["waterPoint"],
            "distanceKm": 0.0,
            "verticalLayerM": 0.5,
            "layerQuality": "surface-only",
            "sharedLayerCount": 1,
            "uMps": 0.1 * ordinal,
            "vMps": 0.2 * ordinal,
        }, acquisition, target))
    refresh_shadow = atomic_write_shadow_checkpoint(
        refresh / "shadow.json",
        acquisitions=refresh_acquisitions,
        records=refresh_records,
        updated_at=REFERENCE + timedelta(minutes=6),
        target_identities={row["partId"]: row for row in refresh_targets},
    )
    refresh_stage = build_source_stage(
        registry=refresh_registry,
        shadow=refresh_shadow,
        target_identities={row["partId"]: row for row in refresh_targets},
        shadow_sha256=file_sha256(refresh / "shadow.json"),
        attempts=[],
        sealed_at=REFERENCE + timedelta(minutes=6),
    )
    write(refresh / "source-stage.json", refresh_stage)
    refresh_shadow_before = (refresh / "shadow.json").read_bytes()
    refresh_stage_before = (refresh / "source-stage.json").read_bytes()
    no_deadline_env = os.environ.copy()
    no_deadline_env.pop("RAVRADAR_COPERNICUS_SOFT_DEADLINE_EPOCH", None)
    no_deadline_env.pop("COPERNICUSMARINE_SERVICE_USERNAME", None)
    no_deadline_env.pop("COPERNICUSMARINE_SERVICE_PASSWORD", None)
    no_deadline_refresh = run_runner(
        refresh,
        None,
        env=no_deadline_env,
        acquisition_at=REFERENCE + timedelta(minutes=15),
        refresh_only=True,
    )
    assert no_deadline_refresh.returncode == 0, (
        no_deadline_refresh.stdout + no_deadline_refresh.stderr
    )
    assert "bounded time unavailable" in no_deadline_refresh.stdout
    assert (refresh / "shadow.json").read_bytes() == refresh_shadow_before
    assert (refresh / "source-stage.json").read_bytes() == refresh_stage_before
    refresh_env = os.environ.copy()
    refresh_env["COPERNICUS_OPERATIONAL_REFRESH_MAX_SHARDS"] = "1"
    failed_refresh = run_runner(
        refresh,
        refresh_fixtures,
        env=refresh_env,
        acquisition_at=REFERENCE + timedelta(minutes=20),
        refresh_only=True,
    )
    assert failed_refresh.returncode == 0, (
        failed_refresh.stdout + failed_refresh.stderr
    )
    assert "refresh shard failed safely" in failed_refresh.stderr
    assert (refresh / "shadow.json").read_bytes() == refresh_shadow_before
    assert (refresh / "source-stage.json").read_bytes() == refresh_stage_before

    baltic_refresh_shards = spatial_shards(refresh_targets, PINNED_PRODUCTS[0])
    oldest_shard_index = next(
        index for index, shard in enumerate(baltic_refresh_shards)
        if any(
            row["partId"] == refresh_targets[0]["partId"]
            for row in shard["targets"]
        )
    )
    dataset(
        refresh_fixtures
        / f"copernicus-baltic-nemo-{oldest_shard_index:03d}.nc",
        available=True,
        advisory_available=True,
        target=refresh_targets[0],
    )
    completed_refresh = run_runner(
        refresh,
        refresh_fixtures,
        env=refresh_env,
        acquisition_at=REFERENCE + timedelta(minutes=20),
        refresh_only=True,
    )
    assert completed_refresh.returncode == 0, (
        completed_refresh.stdout + completed_refresh.stderr
    )
    refreshed_shadow = json.loads(
        (refresh / "shadow.json").read_text(encoding="utf-8")
    )
    refreshed_stage = validate_source_stage(
        json.loads((refresh / "source-stage.json").read_text(encoding="utf-8")),
        registry=refresh_registry,
        shadow=refreshed_shadow,
        target_identities={row["partId"]: row for row in refresh_targets},
        shadow_sha256=file_sha256(refresh / "shadow.json"),
    )
    old_refresh_record_ids = {row["recordId"] for row in refresh_records}
    assert old_refresh_record_ids.issubset({
        row["recordId"] for row in refreshed_shadow["records"]
    })
    refreshed_refs, refreshed_missing = select_required_records(
        refresh_registry["operationalRequiredPairs"],
        refreshed_shadow["acquisitions"],
        refreshed_shadow["records"],
        REFERENCE,
    )
    assert refreshed_missing == []
    refreshed_acquisition_by_id = {
        row["acquisitionId"]: row for row in refreshed_shadow["acquisitions"]
    }
    selected_acquired_at = {
        row["partId"]: refreshed_acquisition_by_id[row["acquisitionId"]][
            "acquisitionAt"
        ]
        for row in refreshed_refs
    }
    assert selected_acquired_at[refresh_targets[0]["partId"]] == (
        REFERENCE + timedelta(minutes=20)
    ).isoformat().replace("+00:00", "Z")
    assert selected_acquired_at[refresh_targets[1]["partId"]] == (
        REFERENCE + timedelta(minutes=6)
    ).isoformat().replace("+00:00", "Z")
    assert refreshed_stage["status"] == "READY"
    assert refreshed_stage["missingPairCount"] == 0
    assert refreshed_stage["excludedRecordRefCount"] == 0
    advisory_refs, advisory_missing = select_required_records(
        refresh_registry["advisoryHistoryRequiredPairs"],
        refreshed_shadow["acquisitions"],
        refreshed_shadow["records"],
        REFERENCE,
    )
    assert len(advisory_refs) == 1
    assert len(advisory_missing) == 1
    assert "advisoryHistoryAcquiredPairCount=1" in completed_refresh.stdout

    # A malformed provider axis rejected by global structure preflight cannot
    # stop a later independent Baltic shard and
    # cannot authorize AMM15 for the failed in-domain pair. The valid later
    # record and its COMPLETE attempt are checkpointed; the failed shard has no
    # attempt and remains retryable IN_PROGRESS evidence.
    isolated = root / "isolated-operational-shard"
    isolated_fixtures = isolated / "fixtures"
    isolated_fixtures.mkdir(parents=True)
    isolated_targets = [
        {
            **TARGET,
            "partId": "fixture-private-isolated-a-shared",
            "waterPoint": [9.1, 57.2],
        },
        {
            **TARGET,
            "partId": "fixture-private-isolated-b-later",
            "waterPoint": [10.4, 57.2],
        },
    ]
    prepare_multi(isolated, isolated_targets)
    dataset(
        isolated_fixtures / "copernicus-baltic-nemo-000.nc",
        available=True,
        target=isolated_targets[0],
        depth_m=float("inf"),
    )
    dataset(
        isolated_fixtures / "copernicus-baltic-nemo-001.nc",
        available=True,
        target=isolated_targets[1],
    )
    dataset(
        isolated_fixtures / "copernicus-nws-amm15-000.nc",
        available=True,
        target=isolated_targets[0],
    )
    isolated_run = run_runner(isolated, isolated_fixtures)
    assert isolated_run.returncode == 75, isolated_run.stdout + isolated_run.stderr
    assert "source=copernicus-baltic-nemo, shardIndex=0" in isolated_run.stderr
    assert "errorType=RuntimeError" in isolated_run.stderr
    isolated_shadow = json.loads(
        (isolated / "shadow.json").read_text(encoding="utf-8")
    )
    isolated_stage_document = json.loads(
        (isolated / "source-stage.json").read_text(encoding="utf-8")
    )
    isolated_registry = json.loads(
        (isolated / "registry.json").read_text(encoding="utf-8")
    )
    isolated_stage = validate_source_stage_progress(
        isolated_stage_document,
        registry=isolated_registry,
        shadow=isolated_shadow,
        target_identities={row["partId"]: row for row in isolated_targets},
        shadow_sha256=file_sha256(isolated / "shadow.json"),
    )
    assert isolated_stage["selectedRecordRefCount"] == 1
    assert isolated_stage["missingPairCount"] == 1
    assert len(isolated_stage["attempts"]) == 1
    assert isolated_stage["attempts"][0]["source"] == "copernicus-baltic-nemo"
    assert isolated_stage["attempts"][0]["targetPartIds"] == [
        isolated_targets[1]["partId"]
    ]
    assert all(
        row["source"] != "copernicus-nws-amm15"
        for row in isolated_shadow["acquisitions"]
    )
    assert run_checker(
        isolated,
        "--require-source-stage-reusable",
    ).returncode == 0
    assert run_checker(
        isolated,
        "--require-source-stage-ready",
    ).returncode != 0

    # Durable checkpoint writer failures are outside the shard data-error
    # boundary. They must propagate instead of being reported as a safely
    # quarantined provider row.
    writer_failure = root / "writer-failure"
    prepare(writer_failure)
    writer_targets = {TARGET["partId"]: TARGET}
    writer_shadow = atomic_write_shadow_checkpoint(
        writer_failure / "shadow.json",
        acquisitions=[],
        records=[],
        updated_at=REFERENCE + timedelta(minutes=10),
        target_identities=writer_targets,
    )
    with patch.object(
        RUNNER_MODULE,
        "atomic_write_source_stage_progress",
        side_effect=OSError("fixture durable writer failure"),
    ):
        try:
            RUNNER_MODULE.persist_source_stage_progress(
                shadow_path=writer_failure / "shadow.json",
                source_stage_path=writer_failure / "source-stage.json",
                registry=json.loads(
                    (writer_failure / "registry.json").read_text(encoding="utf-8")
                ),
                target_identities=writer_targets,
                acquisitions=list(writer_shadow["acquisitions"]),
                records=list(writer_shadow["records"]),
                attempts=[],
                updated_at=REFERENCE + timedelta(minutes=10),
                shadow_changed=False,
            )
        except OSError as error:
            assert "durable writer failure" in str(error)
        else:
            raise AssertionError("Durable Copernicus writer failure must be fatal")

    # Provider failure occurs only after a zero-attempt, exact residual stage
    # has been committed. It is reusable partial evidence, never READY.
    timed_out = root / "timed-out"
    shim = timed_out / "shim"
    shim.mkdir(parents=True)
    prepare(timed_out)
    (shim / "copernicusmarine.py").write_text(
        "def subset(**kwargs):\n    raise TimeoutError('fixture timeout')\n",
        encoding="utf-8",
    )
    timeout_env = dict(os.environ)
    timeout_env["PYTHONPATH"] = str(shim) + os.pathsep + timeout_env.get("PYTHONPATH", "")
    timeout_env["COPERNICUSMARINE_SERVICE_USERNAME"] = "fixture-user"
    timeout_env["COPERNICUSMARINE_SERVICE_PASSWORD"] = "fixture-password"
    timeout = run_runner(timed_out, None, env=timeout_env)
    assert timeout.returncode == 75
    assert "Copernicus shard failed safely" in timeout.stderr
    assert "failedShardCount=1" in timeout.stderr
    timeout_stage_document = json.loads(
        (timed_out / "source-stage.json").read_text(encoding="utf-8")
    )
    timeout_shadow = json.loads(
        (timed_out / "shadow.json").read_text(encoding="utf-8")
    )
    timeout_stage = validate_source_stage_progress(
        timeout_stage_document,
        registry=json.loads(
            (timed_out / "registry.json").read_text(encoding="utf-8")
        ),
        shadow=timeout_shadow,
        target_identities={TARGET["partId"]: TARGET},
        shadow_sha256=file_sha256(timed_out / "shadow.json"),
    )
    assert timeout_stage["attempts"] == []
    assert timeout_stage["selectedRecordRefCount"] == 0
    assert timeout_stage["missingPairCount"] == 1
    assert run_checker(
        timed_out,
        "--require-source-stage-reusable",
    ).returncode == 0
    assert run_checker(
        timed_out,
        "--require-source-stage-ready",
    ).returncode != 0

    # Missing credentials has the same safe handoff: the complete current
    # residual is durable before any provider client is imported.
    no_credentials = root / "no-credentials"
    prepare(no_credentials)
    no_credentials_env = dict(os.environ)
    no_credentials_env.pop("COPERNICUSMARINE_SERVICE_USERNAME", None)
    no_credentials_env.pop("COPERNICUSMARINE_SERVICE_PASSWORD", None)
    missing_credentials = run_runner(
        no_credentials,
        None,
        env=no_credentials_env,
    )
    assert missing_credentials.returncode != 0
    assert "credentials are required" in missing_credentials.stderr
    no_credentials_stage = json.loads(
        (no_credentials / "source-stage.json").read_text(encoding="utf-8")
    )
    no_credentials_shadow = json.loads(
        (no_credentials / "shadow.json").read_text(encoding="utf-8")
    )
    validated_no_credentials = validate_source_stage_progress(
        no_credentials_stage,
        registry=json.loads(
            (no_credentials / "registry.json").read_text(encoding="utf-8")
        ),
        shadow=no_credentials_shadow,
        target_identities={TARGET["partId"]: TARGET},
        shadow_sha256=file_sha256(no_credentials / "shadow.json"),
    )
    assert validated_no_credentials["attempts"] == []
    assert validated_no_credentials["missingPairCount"] == 1
    assert run_checker(
        no_credentials,
        "--require-source-stage-reusable",
    ).returncode == 0
    assert run_checker(
        no_credentials,
        "--require-source-stage-ready",
    ).returncode != 0

    # A broken/stale scheduling hint cannot block the initial durable honest
    # stage. These failures must reach the ordinary missing-credentials path,
    # not stop while parsing optional downstream coverage.
    for plan_case in ("invalid-json", "wrong-reference", "wrong-registry", "wrong-hash"):
        invalid_plan_folder = root / ("optional-plan-" + plan_case)
        prepare(invalid_plan_folder)
        invalid_plan_path = invalid_plan_folder / "weather-current-acquisition-plan.json"
        if plan_case == "invalid-json":
            invalid_plan_path.write_text("{", encoding="utf-8")
        else:
            invalid_plan = build_current_acquisition_plan(
                targets=[OUTSIDE_BALTIC_TARGET] if plan_case == "wrong-registry" else [TARGET],
                production_reference_at=REFERENCE + timedelta(hours=1) if plan_case == "wrong-reference" else REFERENCE,
                covered_pairs=[], source_input_hashes={"fixture-fallback": donor_bank["bankSha256"]})
            if plan_case == "wrong-hash":
                invalid_plan["bindingSha256"] = "sha256:" + "0" * 64
            write(invalid_plan_path, invalid_plan)
        invalid_plan_run = run_runner(invalid_plan_folder, None, env=no_credentials_env)
        assert invalid_plan_run.returncode != 0
        assert "acquisition plan unavailable or invalid" in invalid_plan_run.stdout
        assert "credentials are required" in invalid_plan_run.stderr
        invalid_plan_stage = json.loads((invalid_plan_folder / "source-stage.json").read_text(encoding="utf-8"))
        assert invalid_plan_stage["status"] == "IN_PROGRESS"
        assert invalid_plan_stage["missingPairCount"] == 1
        assert "donor_bank_written=true" in (invalid_plan_folder / "fixture-github-output.txt").read_text(encoding="utf-8")

    # Rebuilding from incomplete or absent attempt evidence cannot manufacture READY.
    first_attempt_only = [row for row in stage["attempts"] if row["source"] == "copernicus-baltic-nemo"]
    for attempts in (first_attempt_only, []):
        try:
            build_source_stage(
                registry=json.loads((residual / "registry.json").read_text(encoding="utf-8")),
                shadow=shadow_document,
                target_identities={TARGET["partId"]: TARGET},
                shadow_sha256=file_sha256(residual / "shadow.json"),
                attempts=attempts,
                sealed_at=REFERENCE + timedelta(minutes=10),
            )
        except CopernicusSourceStageError:
            pass
        else:
            raise AssertionError("Incomplete Copernicus attempts must not create READY")

    # Any later cache-byte or selected-reference rebinding invalidates the sidecar.
    changed_shadow = {**shadow_document, "updatedAt": (REFERENCE + timedelta(minutes=11)).isoformat().replace("+00:00", "Z")}
    write(residual / "shadow.json", changed_shadow)
    changed_cache = run_checker(residual, "--require-source-stage-ready")
    assert changed_cache.returncode != 0
    write(residual / "shadow.json", shadow_document)
    changed_stage = {**stage_document, "selectedRecordRefsSha256": "sha256:" + ("0" * 64)}
    write(residual / "source-stage.json", changed_stage)
    changed_refs = run_checker(residual, "--require-source-stage-ready")
    assert changed_refs.returncode != 0

print("OK: Copernicus source-stage READY requires complete pinned attempts and safe exact bindings.")
