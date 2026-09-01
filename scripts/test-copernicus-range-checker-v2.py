#!/usr/bin/env python3
"""Focused positive/negative tests for the safe Copernicus range checker."""
from __future__ import annotations

import json
import subprocess
import sys
import tempfile
from datetime import datetime, timedelta, timezone
from pathlib import Path

from lib.copernicus_current import (
    DMI_VERIFIER_CONTRACT_ID,
    OPERATIONAL_MATRIX_CONTRACT_ID,
    atomic_write_shadow,
    canonical_sha256,
    file_sha256,
    make_acquisition,
    make_coverage_collection,
    make_record,
    merge_cache_evidence,
    required_pairs_sha256,
    select_required_records,
)
from lib.copernicus_target_identity import target_fingerprint


ROOT = Path(__file__).resolve().parents[1]
CHECKER = ROOT / "scripts/check-copernicus-current-range.py"
CURRENT_CHECKER = ROOT / "scripts/check-copernicus-current-hour.py"
REFERENCE = datetime(2026, 8, 29, 8, tzinfo=timezone.utc)
TARGET = {"partId": "p1", "parentZoneId": "z1", "name": "P1", "waterPoint": [9.0, 57.0]}


def write(path: Path, value: object) -> None:
    path.write_text(json.dumps(value), encoding="utf-8")


def run(
    folder: Path,
    *,
    require_complete: bool = False,
    allow_nonmatching_seal: bool = False,
    stdlib_only: bool = False,
) -> subprocess.CompletedProcess[str]:
    command = [
        sys.executable, *(["-S"] if stdlib_only else []), "-B", str(CHECKER),
        "--shadow", str(folder / "cache.json"),
        "--registry", str(folder / "registry.json"),
        "--dmi", str(folder / "dmi.json"),
        "--targets", str(folder / "targets.json"),
        "--at", REFERENCE.isoformat().replace("+00:00", "Z"),
    ]
    if require_complete:
        command.append("--require-complete")
    if allow_nonmatching_seal:
        command.append("--allow-nonmatching-seal")
    return subprocess.run(command, cwd=ROOT, capture_output=True, text=True, check=False)


def run_current(folder: Path, *, stdlib_only: bool = False) -> subprocess.CompletedProcess[str]:
    return subprocess.run([
        sys.executable, *(["-S"] if stdlib_only else []), "-B", str(CURRENT_CHECKER),
        "--shadow", str(folder / "cache.json"),
        "--targets", str(folder / "registry.json"),
        "--at", REFERENCE.isoformat().replace("+00:00", "Z"),
    ], cwd=ROOT, capture_output=True, text=True, check=False)


with tempfile.TemporaryDirectory(prefix="ravradar-copernicus-range-check-") as raw_folder:
    folder = Path(raw_folder)
    write(folder / "targets.json", {"partCount": 1, "zones": {"z1": [{
        "partId": "p1", "sourceZoneId": "z1", "name": "P1", "waterPoint": TARGET["waterPoint"],
    }]}})
    write(folder / "dmi.json", {"fixture": True})
    valid_time = REFERENCE + timedelta(hours=117)
    required = [{"partId": "p1", "validTime": valid_time.isoformat().replace("+00:00", "Z")}]
    registry = {
        "schemaVersion": 2, "kind": "RAVRADAR_PRIVATE_COPERNICUS_CURRENT_RANGE_TARGET_REGISTRY",
        "matrixContractId": "exact-dmi-gap-matrix-minus48-plus117-v1",
        "selectionMode": "dmi-gaps-only",
        "productionReferenceAt": REFERENCE.isoformat().replace("+00:00", "Z"),
        "targetHour": REFERENCE.isoformat().replace("+00:00", "Z"),
        "rangeStartAt": (REFERENCE - timedelta(hours=48)).isoformat().replace("+00:00", "Z"),
        "rangeEndAt": valid_time.isoformat().replace("+00:00", "Z"),
        "coldBridgeHours": 48, "publicHourCount": 118, "matrixHourCount": 166,
        "targetCount": 1, "sourcePartCount": 1, "partCount": 1,
        "targetRegistrySha256": target_fingerprint([TARGET]),
        "dmiCurrentInputSha256": file_sha256(folder / "dmi.json"),
        "dmiVerifierContractId": DMI_VERIFIER_CONTRACT_ID,
        "requiredPairsSha256": required_pairs_sha256(required), "requiredPairCount": 1,
        "dmiVerifiedPairCount": 165, "totalPairCount": 166,
        "coordinatesChanged": False,
        "targets": [TARGET], "requiredPairs": required,
        "zones": {"z1": [{
            "partId": "p1", "sourceZoneId": "z1", "name": "P1", "waterPoint": TARGET["waterPoint"],
        }]},
    }
    write(folder / "registry.json", registry)
    raw_record = {
        "partId": "p1", "parentZoneId": "z1", "name": "P1", "samplingPoint": TARGET["waterPoint"],
        "source": "copernicus-baltic-nemo", "productId": "BALTICSEA_ANALYSISFORECAST_PHY_003_006",
        "datasetId": "cmems_mod_bal_phy_anfc_PT1H-i", "datasetVersion": "202411",
        "validTime": required[0]["validTime"], "gridPoint": TARGET["waterPoint"], "distanceKm": 0.0,
        "verticalLayerM": 5.0, "layerQuality": "deepest-common-layer", "sharedLayerCount": 2,
        "uMps": 0.1, "vMps": 0.2, "componentPair": "same-time-cell-layer", "interpolation": False,
    }
    acquisition_at = REFERENCE + timedelta(minutes=10)
    acquisition = make_acquisition(
        source="copernicus-baltic-nemo", acquisition_at=acquisition_at,
        request_start_at=valid_time, request_end_at=valid_time, targets=[TARGET],
        native_valid_times=[valid_time], subset_sha256=canonical_sha256({"fixture": 1}), record_count=1,
    )
    record = make_record(raw_record, acquisition, TARGET)
    acquisitions, records = merge_cache_evidence(
        {
            "schemaVersion": 2, "kind": "RAVRADAR_PRIVATE_COPERNICUS_CURRENT_RANGE_CACHE",
            "retentionHours": 168, "coldBridgeHours": 48, "publicHourCount": 118,
            "scoreImpact": False, "publicRuntime": False, "credentialsIncluded": False,
            "rawVectorsIncluded": True, "updatedAt": registry["productionReferenceAt"],
            "acquisitions": [], "collections": [], "records": [],
        }, [acquisition], [record], REFERENCE, {"p1": TARGET},
    )
    refs, missing = select_required_records(required, acquisitions, records, REFERENCE)
    assert not missing
    collection = make_coverage_collection(
        production_reference_at=REFERENCE,
        target_registry_sha256=registry["targetRegistrySha256"],
        dmi_current_input_sha256=registry["dmiCurrentInputSha256"],
        required_pairs=required, record_refs=refs, sealed_at=acquisition_at,
    )
    atomic_write_shadow(
        folder / "cache.json", acquisitions=acquisitions, records=records, collection=collection,
        updated_at=acquisition_at, target_identities={"p1": TARGET},
    )
    good = run(folder)
    assert good.returncode == 0 and "COMPLETE" in good.stdout, good.stdout + good.stderr
    stdlib_good = run(folder, stdlib_only=True)
    assert stdlib_good.returncode == 0 and "COMPLETE" in stdlib_good.stdout, stdlib_good.stdout + stdlib_good.stderr
    current = run_current(folder)
    assert current.returncode == 0 and "already contains" in current.stdout, current.stdout + current.stderr
    stdlib_current = run_current(folder, stdlib_only=True)
    assert stdlib_current.returncode == 0 and "already contains" in stdlib_current.stdout, stdlib_current.stdout + stdlib_current.stderr

    # Current-hour duplicate suppression must bind the full schema-2 seal, not
    # merely observe a row at the same hour.
    original_registry = json.loads((folder / "registry.json").read_text(encoding="utf-8"))
    changed_registry = {**original_registry, "dmiCurrentInputSha256": canonical_sha256({"other": "dmi"})}
    write(folder / "registry.json", changed_registry)
    rebound = run_current(folder)
    assert rebound.returncode == 0 and "lacks a complete" in rebound.stdout, rebound.stdout + rebound.stderr
    write(folder / "registry.json", original_registry)

    # A coherent new DMI-gap matrix for the same reference, DMI bytes and
    # targets is a different generation. The old COMPLETE seal must not
    # suppress acquisition merely because its reference hour still matches.
    additional_required = {
        "partId": "p1",
        "validTime": (valid_time - timedelta(hours=1)).isoformat().replace("+00:00", "Z"),
    }
    changed_required = sorted(
        [*required, additional_required],
        key=lambda row: (row["validTime"], row["partId"]),
    )
    changed_matrix_registry = {
        **original_registry,
        "requiredPairs": changed_required,
        "requiredPairsSha256": required_pairs_sha256(changed_required),
        "requiredPairCount": 2,
        "dmiVerifiedPairCount": 164,
    }
    write(folder / "registry.json", changed_matrix_registry)
    changed_matrix = run_current(folder)
    assert changed_matrix.returncode == 0 and "lacks a complete" in changed_matrix.stdout, (
        changed_matrix.stdout + changed_matrix.stderr
    )
    write(folder / "registry.json", original_registry)

    (folder / "cache.json").unlink()
    optional_absent = run(folder)
    assert optional_absent.returncode == 0 and "absent" in optional_absent.stdout
    required_absent = run(folder, require_complete=True)
    assert required_absent.returncode != 0 and "required but absent" in required_absent.stdout
    write(folder / "cache.json", {
        "schemaVersion": 1, "retentionHours": 168,
        "scoreImpact": False, "publicRuntime": False,
        "updatedAt": REFERENCE.isoformat().replace("+00:00", "Z"),
        "collections": [], "records": [],
    })
    legacy = run(folder)
    assert legacy.returncode == 0 and "complete acquisition is required" in legacy.stdout
    legacy_required = run(folder, require_complete=True)
    assert legacy_required.returncode != 0 and "required but absent" in legacy_required.stdout
    (folder / "cache.json").unlink()
    atomic_write_shadow(
        folder / "cache.json", acquisitions=acquisitions, records=records, collection=collection,
        updated_at=acquisition_at, target_identities={"p1": TARGET},
    )

    # The schema-3 operation seal is green with the exact +117 operational
    # record even when a declared -1h advisory pair is unavailable.
    advisory_required = [{
        "partId": "p1",
        "validTime": (REFERENCE - timedelta(hours=1)).isoformat().replace("+00:00", "Z"),
    }]
    operational_registry = {
        "schemaVersion": 3,
        "kind": "RAVRADAR_PRIVATE_COPERNICUS_CURRENT_RANGE_TARGET_REGISTRY",
        "matrixContractId": OPERATIONAL_MATRIX_CONTRACT_ID,
        "selectionMode": "dmi-gaps-only",
        "productionReferenceAt": REFERENCE.isoformat().replace("+00:00", "Z"),
        "targetHour": REFERENCE.isoformat().replace("+00:00", "Z"),
        "rangeStartAt": (REFERENCE - timedelta(hours=48)).isoformat().replace("+00:00", "Z"),
        "rangeEndAt": valid_time.isoformat().replace("+00:00", "Z"),
        "coldBridgeHours": 48, "publicHourCount": 118, "matrixHourCount": 166,
        "operationalRangeStartAt": REFERENCE.isoformat().replace("+00:00", "Z"),
        "operationalRangeEndAt": valid_time.isoformat().replace("+00:00", "Z"),
        "operationalHourCount": 118,
        "advisoryHistoryStartAt": (REFERENCE - timedelta(hours=48)).isoformat().replace("+00:00", "Z"),
        "advisoryHistoryEndAt": (REFERENCE - timedelta(hours=1)).isoformat().replace("+00:00", "Z"),
        "advisoryHistoryHourCount": 48,
        "targetCount": 1, "sourcePartCount": 1, "partCount": 1,
        "operationalPartCount": 1, "advisoryHistoryPartCount": 1,
        "targetRegistrySha256": target_fingerprint([TARGET]),
        "dmiCurrentInputSha256": file_sha256(folder / "dmi.json"),
        "dmiVerifierContractId": DMI_VERIFIER_CONTRACT_ID,
        "operationalRequiredPairsSha256": required_pairs_sha256(required),
        "operationalRequiredPairCount": 1,
        "operationalDmiVerifiedPairCount": 117,
        "operationalTotalPairCount": 118,
        "advisoryHistoryRequiredPairsSha256": required_pairs_sha256(advisory_required),
        "advisoryHistoryRequiredPairCount": 1,
        "advisoryHistoryDmiVerifiedPairCount": 47,
        "advisoryHistoryTotalPairCount": 48,
        "dmiVerifiedPairCount": 164, "totalPairCount": 166,
        "coordinatesChanged": False,
        "targets": [TARGET], "operationalRequiredPairs": required,
        "advisoryHistoryRequiredPairs": advisory_required,
        "zones": {"z1": [{
            "partId": "p1", "sourceZoneId": "z1", "name": "P1", "waterPoint": TARGET["waterPoint"],
        }]},
    }
    operational_collection = make_coverage_collection(
        production_reference_at=REFERENCE,
        target_registry_sha256=operational_registry["targetRegistrySha256"],
        dmi_current_input_sha256=operational_registry["dmiCurrentInputSha256"],
        required_pairs=required,
        record_refs=refs,
        advisory_history_required_pairs=advisory_required,
        advisory_history_record_refs=[],
        sealed_at=acquisition_at,
    )
    write(folder / "registry.json", operational_registry)
    atomic_write_shadow(
        folder / "cache.json", acquisitions=acquisitions, records=records,
        collection=operational_collection, updated_at=acquisition_at,
        target_identities={"p1": TARGET},
    )
    operational_good = run(folder, require_complete=True)
    assert operational_good.returncode == 0, operational_good.stdout + operational_good.stderr
    operational_current = run_current(folder)
    assert operational_current.returncode == 0 and "already contains" in operational_current.stdout

    # A valid cache restored from the preceding reference is useful retained
    # evidence, but it is not the locked seal for this preflight.  The initial
    # inspection may classify that precise miss as incomplete so the bounded
    # acquisition can replace it; the terminal --require-complete check stays
    # strict.
    previous_reference = REFERENCE - timedelta(hours=1)
    previous_valid_time = previous_reference + timedelta(hours=117)
    previous_acquisition = make_acquisition(
        source="copernicus-baltic-nemo",
        acquisition_at=previous_reference + timedelta(minutes=10),
        request_start_at=previous_valid_time,
        request_end_at=previous_valid_time,
        targets=[TARGET],
        native_valid_times=[previous_valid_time],
        subset_sha256=canonical_sha256({"fixture": "previous-reference"}),
        record_count=1,
    )
    previous_record = make_record(
        {
            **raw_record,
            "validTime": previous_valid_time.isoformat().replace("+00:00", "Z"),
        },
        previous_acquisition,
        TARGET,
    )
    previous_required = [{
        "partId": "p1",
        "validTime": previous_valid_time.isoformat().replace("+00:00", "Z"),
    }]
    previous_collection = make_coverage_collection(
        production_reference_at=previous_reference,
        target_registry_sha256=operational_registry["targetRegistrySha256"],
        dmi_current_input_sha256=operational_registry["dmiCurrentInputSha256"],
        required_pairs=previous_required,
        record_refs=[{
            "partId": previous_record["partId"],
            "validTime": previous_record["validTime"],
            "recordId": previous_record["recordId"],
            "acquisitionId": previous_record["acquisitionId"],
            "source": previous_acquisition["source"],
        }],
        sealed_at=previous_reference + timedelta(minutes=10),
    )
    atomic_write_shadow(
        folder / "cache.json",
        acquisitions=[previous_acquisition],
        records=[previous_record],
        collection=previous_collection,
        updated_at=previous_reference + timedelta(minutes=10),
        target_identities={"p1": TARGET},
    )
    strict_previous = run(folder)
    assert strict_previous.returncode != 0 and "exactly one" in strict_previous.stdout
    refreshable_previous = run(folder, allow_nonmatching_seal=True)
    assert refreshable_previous.returncode == 0 and "complete acquisition is required" in refreshable_previous.stdout
    still_required = run(folder, allow_nonmatching_seal=True, require_complete=True)
    assert still_required.returncode != 0 and "required but absent" in still_required.stdout
    atomic_write_shadow(
        folder / "cache.json",
        acquisitions=acquisitions,
        records=records,
        collection=operational_collection,
        updated_at=acquisition_at,
        target_identities={"p1": TARGET},
    )

    damaged_cache = json.loads((folder / "cache.json").read_text(encoding="utf-8"))
    damaged_cache["collections"][0]["advisoryHistoryMissingPairCount"] = 0
    write(folder / "cache.json", damaged_cache)
    damaged = run(folder, require_complete=True)
    assert damaged.returncode != 0, damaged.stdout + damaged.stderr
    atomic_write_shadow(
        folder / "cache.json", acquisitions=acquisitions, records=records,
        collection=operational_collection, updated_at=acquisition_at,
        target_identities={"p1": TARGET},
    )

    write(folder / "dmi.json", {"fixture": "changed"})
    changed = run(folder)
    assert changed.returncode != 0 and "DMI input bytes" in changed.stdout

print("OK: Copernicus range checker binds COMPLETE coverage to exact target/DMI inputs.")
