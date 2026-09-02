#!/usr/bin/env python3
"""Focused source-stage tests: complete, exhausted residual and fail-closed interruption."""
from __future__ import annotations

import json
import os
import subprocess
import sys
import tempfile
from datetime import datetime, timedelta, timezone
from pathlib import Path

import numpy as np
import xarray as xr

from lib.copernicus_current import (
    DMI_VERIFIER_CONTRACT_ID,
    OPERATIONAL_MATRIX_CONTRACT_ID,
    file_sha256,
    required_pairs_sha256,
)
from lib.copernicus_current_source_stage import (
    SOURCE_STAGE_CONTRACT_ID,
    CopernicusSourceStageError,
    build_source_stage,
    safe_source_stage_summary,
    validate_source_stage,
)
from lib.copernicus_target_identity import target_fingerprint


ROOT = Path(__file__).resolve().parents[1]
RUNNER = ROOT / "scripts/run-copernicus-current-pilot.py"
CHECKER = ROOT / "scripts/check-copernicus-current-range.py"
REFERENCE = datetime(2026, 9, 2, 8, tzinfo=timezone.utc)
VALID_TIME = REFERENCE + timedelta(hours=117)
TARGET = {
    "partId": "fixture-private-part-sentinel",
    "parentZoneId": "fixture-zone",
    "name": "Fixture",
    "waterPoint": [9.123456, 57.654321],
}


def write(path: Path, value: object) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(value), encoding="utf-8")


def registry(dmi_sha256: str) -> dict:
    required = [{
        "partId": TARGET["partId"],
        "validTime": VALID_TIME.isoformat().replace("+00:00", "Z"),
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
        "advisoryHistoryPartCount": 0,
        "targetRegistrySha256": target_fingerprint([TARGET]),
        "dmiCurrentInputSha256": dmi_sha256,
        "dmiVerifierContractId": DMI_VERIFIER_CONTRACT_ID,
        "operationalRequiredPairsSha256": required_pairs_sha256(required),
        "operationalRequiredPairCount": 1,
        "operationalDmiVerifiedPairCount": 117,
        "operationalTotalPairCount": 118,
        "advisoryHistoryRequiredPairsSha256": required_pairs_sha256([]),
        "advisoryHistoryRequiredPairCount": 0,
        "advisoryHistoryDmiVerifiedPairCount": 48,
        "advisoryHistoryTotalPairCount": 48,
        "dmiVerifiedPairCount": 165,
        "totalPairCount": 166,
        "coordinatesChanged": False,
        "targets": [TARGET],
        "operationalRequiredPairs": required,
        "advisoryHistoryRequiredPairs": [],
        "zones": {
            TARGET["parentZoneId"]: [{
                "partId": TARGET["partId"],
                "sourceZoneId": TARGET["parentZoneId"],
                "name": TARGET["name"],
                "waterPoint": TARGET["waterPoint"],
            }],
        },
    }


def dataset(path: Path, *, available: bool) -> None:
    value = 0.1 if available else np.nan
    document = xr.Dataset(
        data_vars={
            "uo": (("time", "depth", "latitude", "longitude"), np.array([[[[value]]]], dtype=float)),
            "vo": (("time", "depth", "latitude", "longitude"), np.array([[[[value]]]], dtype=float)),
        },
        coords={
            "time": np.array([VALID_TIME.replace(tzinfo=None).isoformat()], dtype="datetime64[s]"),
            "depth": [5.0],
            "latitude": [TARGET["waterPoint"][1]],
            "longitude": [TARGET["waterPoint"][0]],
        },
    )
    document.to_netcdf(path)


def prepare(folder: Path) -> None:
    write(folder / "targets.json", {
        "partCount": 1,
        "zones": {
            TARGET["parentZoneId"]: [{
                "partId": TARGET["partId"],
                "sourceZoneId": TARGET["parentZoneId"],
                "name": TARGET["name"],
                "waterPoint": TARGET["waterPoint"],
            }],
        },
    })
    write(folder / "dmi.json", {"fixture": "source-stage"})
    write(folder / "registry.json", registry(file_sha256(folder / "dmi.json")))


def run_runner(
    folder: Path,
    fixture_directory: Path | None,
    *,
    env: dict[str, str] | None = None,
) -> subprocess.CompletedProcess[str]:
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
        REFERENCE.isoformat().replace("+00:00", "Z"),
        "--acquisition-at",
        (REFERENCE + timedelta(minutes=10)).isoformat().replace("+00:00", "Z"),
    ]
    if fixture_directory is not None:
        command.extend(["--fixture-directory", str(fixture_directory)])
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

    # A normal Baltic record still produces only the pure OPERATIONAL_COMPLETE seal.
    full = root / "full"
    fixtures = full / "fixtures"
    fixtures.mkdir(parents=True)
    prepare(full)
    dataset(fixtures / "copernicus-baltic-nemo.nc", available=True)
    completed = run_runner(full, fixtures)
    assert completed.returncode == 0, completed.stdout + completed.stderr
    assert not (full / "source-stage.json").exists()
    full_check = run_checker(full, "--require-complete", "--require-source-stage-ready")
    assert full_check.returncode == 0 and "OPERATIONAL_COMPLETE" in full_check.stdout

    # A valid no-record response from both geographically applicable products
    # is a READY source stage, never a false pure-Copernicus complete seal.
    residual = root / "residual"
    residual_fixtures = residual / "fixtures"
    residual_fixtures.mkdir(parents=True)
    prepare(residual)
    dataset(residual_fixtures / "copernicus-baltic-nemo.nc", available=False)
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
    ready = run_checker(residual, "--require-source-stage-ready")
    assert ready.returncode == 0 and "source stage is READY" in ready.stdout
    not_complete = run_checker(residual, "--require-complete")
    assert not_complete.returncode != 0 and "complete Copernicus seal is required" in not_complete.stdout

    # The artifact-facing report is counts/hashes only.
    safe_report = json.loads((residual / "safe-report.json").read_text(encoding="utf-8"))
    safe_text = json.dumps(safe_report, sort_keys=True).lower()
    assert not has_forbidden_safe_key(safe_report)
    assert TARGET["partId"].lower() not in safe_text
    assert all(str(value) not in safe_text for value in TARGET["waterPoint"])
    assert not has_forbidden_safe_key(safe_source_stage_summary(stage))

    # A missing second-product fixture models an interrupted traversal: the
    # first successful attempt/checkpoint may survive, but READY must not.
    unfinished = root / "unfinished"
    unfinished_fixtures = unfinished / "fixtures"
    unfinished_fixtures.mkdir(parents=True)
    prepare(unfinished)
    dataset(unfinished_fixtures / "copernicus-baltic-nemo.nc", available=False)
    interrupted = run_runner(unfinished, unfinished_fixtures)
    assert interrupted.returncode != 0
    assert not (unfinished / "source-stage.json").exists()

    # A real TimeoutError follows the same pre-sidecar exception path.
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
    assert timeout.returncode != 0 and "fixture timeout" in timeout.stderr
    assert not (timed_out / "source-stage.json").exists()

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
