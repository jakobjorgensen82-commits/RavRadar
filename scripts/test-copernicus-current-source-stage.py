#!/usr/bin/env python3
"""Focused source-stage tests: complete, exhausted residual and fail-closed interruption."""
from __future__ import annotations

import json
import copy
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

from lib.copernicus_current import (
    DMI_VERIFIER_CONTRACT_ID,
    OPERATIONAL_MATRIX_CONTRACT_ID,
    file_sha256,
    atomic_write_shadow_checkpoint,
    required_pairs_sha256,
    select_required_records,
    canonical_sha256,
    make_acquisition,
    make_record,
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
)
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
    return subprocess.run(
        command,
        cwd=ROOT,
        capture_output=True,
        text=True,
        check=False,
        env=env,
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
    # The post-closure cache-only phase accepts IN_PROGRESS. It retries the
    # missing Baltic prerequisite before any row refresh; a completed zero
    # result reactivates the physically retained AMM15 record and seals READY.
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
        requested_pairs=pairs, subset_sha256=acq["subsetSha256"], acquisition_id=acq["acquisitionId"], parsed_record_count=0)
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
        (progress_document, shifted_matrix(5)),
    ]:
        try:
            rebase(bad_document, bad_matrix)
        except (ValueError, RuntimeError):
            pass
        else:
            raise AssertionError("Tampered/stale source evidence must not survive refresh")

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
    assert len(mixed_new_stage["attempts"]) == 1
    mixed_new_attempt = mixed_new_stage["attempts"][0]
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

    # A malformed raw row that reaches the record builder cannot stop a later
    # independent Baltic shard and
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
    assert "errorType=ValueError" in isolated_run.stderr
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
