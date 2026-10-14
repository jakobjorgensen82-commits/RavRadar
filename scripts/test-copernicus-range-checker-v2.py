#!/usr/bin/env python3
"""Focused positive/negative tests for the safe Copernicus range checker."""
from __future__ import annotations

import json
import importlib.util
import subprocess
import sys
import tempfile
from datetime import datetime, timedelta, timezone
from pathlib import Path

from lib.copernicus_current import (
    DMI_VERIFIER_CONTRACT_ID,
    OPERATIONAL_MATRIX_CONTRACT_ID,
    atomic_write_shadow,
    atomic_write_shadow_checkpoint,
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

    # A valid unsealed per-shard checkpoint must be refreshable during the
    # initial inspection, but it remains invalid for every terminal proof.
    atomic_write_shadow_checkpoint(
        folder / "cache.json",
        acquisitions=acquisitions,
        records=records,
        updated_at=acquisition_at,
        target_identities={"p1": TARGET},
    )
    strict_partial = run(folder)
    assert strict_partial.returncode != 0 and "no activation-complete" in strict_partial.stdout
    refreshable_partial = run(folder, allow_nonmatching_seal=True)
    assert refreshable_partial.returncode == 0 and "complete acquisition is required" in refreshable_partial.stdout
    required_partial = run(folder, allow_nonmatching_seal=True, require_complete=True)
    assert required_partial.returncode != 0 and "required but absent" in required_partial.stdout
    atomic_write_shadow(
        folder / "cache.json",
        acquisitions=acquisitions,
        records=records,
        collection=operational_collection,
        updated_at=acquisition_at,
        target_identities={"p1": TARGET},
    )

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

# The operational stage and the donor projection must be recomputed with the
# same aged-DMI challenge plan.  This is a wiring regression: omitting that
# keyword makes a valid partial stage look like a donor-generation mismatch
# precisely when DMI has an old-but-still-usable model run under challenge.
checker_spec = importlib.util.spec_from_file_location("copernicus_range_checker", CHECKER)
checker_module = importlib.util.module_from_spec(checker_spec)
assert checker_spec.loader is not None
checker_spec.loader.exec_module(checker_module)
with tempfile.TemporaryDirectory(prefix="ravradar-copernicus-range-stage-") as raw_stage_folder:
    stage_folder = Path(raw_stage_folder)
    (stage_folder / "cache.json").write_text("{}", encoding="utf-8")
    (stage_folder / "source-stage.json").write_text("{}", encoding="utf-8")
    (stage_folder / "donor-bank.json").write_text("{}", encoding="utf-8")
    (stage_folder / "dmi.json").write_text("dmi", encoding="utf-8")
    (stage_folder / "targets.json").write_text("{}", encoding="utf-8")
    reference_text = REFERENCE.isoformat().replace("+00:00", "Z")
    challenge = {"challengePairCount": 1, "challengePairs": [{"partId": "p1"}]}
    registry = {
        "schemaVersion": 3,
        "productionReferenceAt": reference_text,
        "operationalRequiredPairCount": 0,
        "operationalRequiredPairs": [],
        "targetRegistrySha256": "target-fingerprint",
        "dmiCurrentInputSha256": "dmi-input",
        "agedDmiChallengePlan": challenge,
    }
    write(stage_folder / "registry.json", registry)
    stage = {
        "status": "IN_PROGRESS",
        "attempts": [],
        "selectedRecordRefsSha256": canonical_sha256([]),
        "missingPairsSha256": required_pairs_sha256([]),
        "selectedRecordRefCount": 0,
        "missingPairCount": 0,
    }
    calls = []
    original = {
        name: getattr(checker_module, name)
        for name in (
            "validate_target_registry", "file_sha256", "load_targets",
            "target_fingerprint", "load_copernicus_donor_bank", "validate_shadow",
            "projected_donor_shadow", "validate_reusable_source_stage",
            "stage_positive_evidence", "select_source_order_admissible_records",
        )
    }
    try:
        checker_module.validate_target_registry = lambda value: registry
        checker_module.file_sha256 = lambda path: "dmi-input"
        checker_module.load_targets = lambda path: [TARGET]
        checker_module.target_fingerprint = lambda targets: "target-fingerprint"
        checker_module.load_copernicus_donor_bank = lambda path, targets: {"bank": "valid"}
        checker_module.validate_shadow = lambda value, target_identities, require_collection: {
            "collections": [], "acquisitions": [], "records": [],
        }
        checker_module.projected_donor_shadow = lambda bank, targets: {
            "acquisitions": [], "records": [],
        }
        checker_module.validate_reusable_source_stage = lambda value, **kwargs: stage
        checker_module.stage_positive_evidence = lambda value: {}

        def record_selection(*args, **kwargs):
            calls.append(kwargs)
            return [], [], []

        checker_module.select_source_order_admissible_records = record_selection
        state = checker_module.inspect(
            stage_folder / "cache.json", stage_folder / "registry.json",
            stage_folder / "dmi.json", stage_folder / "targets.json", reference_text,
            source_stage_path=stage_folder / "source-stage.json",
            donor_bank_path=stage_folder / "donor-bank.json",
        )
        assert state["sourceStageReusable"] is True
        assert calls and calls[0].get("aged_dmi_challenge_plan") == challenge
    finally:
        for name, value in original.items():
            setattr(checker_module, name, value)


# The normal checker must rebuild new-use truth from the actual native file,
# even when a forged sibling has internally consistent counts and all hashes.
import copy
import runpy
from lib.copernicus_current import validate_target_registry

def _new_use_native_fixture(reference):
    """One genuine retained original at age 96 h; its grid receipt is UNKNOWN.

    Reuse only the existing gated regional fixture's targets/policy and producer.
    Its main/test functions are not invoked. Synthetic acquisition/outcome inputs
    are trusted fixture boundaries, never real GRIB/provider evidence.
    """
    fixture_root = Path(__file__).resolve().parents[1]
    regional_fixture = runpy.run_path(str(fixture_root / "scripts/test-regional-current-operational.py"))
    native_producer = regional_fixture["producer"]
    registry_builder = regional_fixture["registry_builder"]
    bundle = regional_fixture["fixture"]()
    native_targets = bundle["targets"]
    target = native_targets[0]
    at = reference.isoformat().replace("+00:00", "Z")
    run_at = (reference - timedelta(hours=96)).isoformat().replace("+00:00", "Z")
    part_ids = [row["partId"] for row in native_targets]
    target_sha = native_producer.target_fingerprint(native_targets)
    signature = native_producer.current_marine_processing_signature("new-use-caller-fixture")

    def forbidden_external(*_args, **_kwargs):
        raise AssertionError("NEW_USE_FIXTURE_EXTERNAL_CALL_FORBIDDEN")

    native_producer.STAC_SESSION.request = forbidden_external
    native_producer.DOWNLOAD_SESSION.request = forbidden_external
    for name in ("codes_get", "codes_get_array", "codes_get_elements",
                 "codes_grib_find_nearest", "codes_grib_new_from_file", "codes_release"):
        setattr(native_producer, name, forbidden_external)
    source = {
        "provider": "dmi", "fallback": False, "collection": "dkss_nsbs",
        "collectionFamily": "marine", "component": "current",
        "componentKind": "ocean-current-vector",
        "fieldSet": ["current-u", "current-v"], "optionalFieldSet": [],
        "modelRun": run_at, "nativeValidTime": at, "leadTimeHours": 96,
        "entityId": f"PART::{target['partId']}", "parentZoneId": target["parentZoneId"],
        "entityType": "coastal-part", "samplingContext": "coastal-part-water-point",
        "samplingPoint": list(target["waterPoint"]), "gridPoint": list(target["waterPoint"]),
        "gridDefinitionSha256": "a" * 64, "distanceKm": 0.0,
        "spatialSemanticsVersion": 1,
        "spatialSelection": "nearest-shared-grid-cell-no-spatial-interpolation",
        "itemId": "synthetic-new-use-original", "assetIdentitySha256": "b" * 64,
        "assetSizeBytes": 10, "contentLengthBytes": 10, "contentSha256": "c" * 64,
        "acquiredAt": at, "itemCreatedAt": run_at, "itemUpdatedAt": None,
        "verticalLayer": "depthbelowsea:5", "verticalLayerRankM": 5.0,
        "vectorSelection": "nearest-shared-uv-column-across-dmi-collections-then-deepest-valid-layer",
        "vectorSemanticsVersion": 3,
    }
    assert native_producer.inspect_native_grid_sampling(source)["status"] == "unknown"
    outcome = native_producer.build_current_part_outcome_proof(
        part_ids[1:], part_ids, target_sha, signature, source)
    retained = native_producer.build_retained_current_asset_proof(
        source, signature, outcome, [target["partId"]], part_ids, target_sha)
    native = {
        "schemaVersion": 2, "generatedAt": at, "zoneRegistrySignature": "new-use-caller-fixture",
        "zones": {f"PART::{target['partId']}": {
            "samplingPoint": list(target["waterPoint"]), "gridPoints": {},
            "hourly": {at: {"time": at, "current-u": .01, "current-v": .02,
                             "sources": {"current": source}}}}},
        "runs": {"dkss_nsbs": {
            "referenceTime": run_at, "parserVersion": native_producer.PARSER_VERSION,
            "parameterMapVersion": native_producer.PARAMETER_MAP_VERSION,
            "gridLookupVersion": native_producer.GRID_LOOKUP_VERSION,
            "processingSignature": signature, "processedSteps": {}}},
        "collectionState": {}, "diagnostics": {},
    }
    for empty_target in native_targets[1:]:
        native["zones"][f"PART::{empty_target['partId']}"] = {
            "samplingPoint": list(empty_target["waterPoint"]),
            "gridPoints": {}, "hourly": {},
        }
    ledger = native_producer.build_current_operational_ledger(
        native, native_targets, reference, {}, [retained])
    native["diagnostics"]["currentOperationalLedger"] = ledger
    allowed, retained_sources = native_producer.current_attestation_authorization_from_operational_ledger(ledger)
    attestation = native_producer.current_operational_attestation(
        native, native_targets, reference, allowed, retained_sources)
    native_producer.validate_current_operational_availability_ledger(
        ledger, attestation, native_targets, reference, reference + timedelta(hours=117), target_sha)
    unknown_pair = {"partId": target["partId"], "validTime": at}
    assert attestation["verifiedPairs"] == [unknown_pair]
    assert unknown_pair not in ledger["operationalComplementPairs"]
    assert len(ledger["operationalComplementPairs"]) == 8 * 118 - 1
    return native, native_targets, bundle["policy"], registry_builder, unknown_pair

with tempfile.TemporaryDirectory(prefix="ravradar-new-use-range-") as raw_new_use:
    new_use_dir = Path(raw_new_use)
    native, native_targets, _policy, registry_builder, unknown_pair = _new_use_native_fixture(REFERENCE)
    write(new_use_dir / "targets.json", {"partCount": len(native_targets), "zones": {
        row["parentZoneId"]: [{"partId": row["partId"], "sourceZoneId": row["parentZoneId"],
                               "name": row["name"], "waterPoint": row["waterPoint"]}]
        for row in native_targets}})
    dmi_path = new_use_dir / "dmi.json"
    write(dmi_path, native)
    native_bytes = dmi_path.read_bytes()
    original_native = copy.deepcopy(native)
    matrix = registry_builder.build_registry(
        native_targets, native, REFERENCE, file_sha256(dmi_path), full_coast=False)
    assert matrix["dmiNewUseProjection"]["unknownPairs"] == [unknown_pair]
    assert matrix.get("agedDmiChallengePlan") is None
    write(new_use_dir / "registry.json", matrix)
    sealed_registry_bytes = (new_use_dir / "registry.json").read_bytes()
    for stdlib_only in (False, True):
        accepted = run(new_use_dir, stdlib_only=stdlib_only)
        assert accepted.returncode == 0, accepted.stdout + accepted.stderr
        assert dmi_path.read_bytes() == native_bytes
        assert (new_use_dir / "registry.json").read_bytes() == sealed_registry_bytes

    # Build an internally valid E=1/U=0 sibling against a different rich
    # document, while claiming the actual UNKNOWN file hash. The original
    # ledger and asset attestation remain identical; only native context can
    # refute this forged new-use claim. At age 96 it also fabricates a challenge.
    invented = copy.deepcopy(native)
    source = invented["zones"][f"PART::{unknown_pair['partId']}"]["hourly"][unknown_pair["validTime"]]["sources"]["current"]
    source["nativeGridSampling"] = {
        "contractId": "dmi-native-grid-sampling-v1", "elementIndex": 0,
        "gridIndexIdentitySha256": "9" * 64,
        "coordinateInterpretation": "dmi-dkss-grib1-header-endpoints-v1",
        "gridDefinitionSha256": source["gridDefinitionSha256"],
        "gridPoint": list(source["gridPoint"]),
        "fieldSet": ["current-u", "current-v"], "optionalFieldSet": [],
    }
    forged = registry_builder.build_registry(
        native_targets, invented, REFERENCE, file_sha256(dmi_path), full_coast=False)
    validate_target_registry(forged)
    assert forged["dmiNewUseProjection"]["unknownPairs"] == []
    assert forged["dmiNewUseProjection"]["eligiblePairCount"] == 1
    assert forged["dmiNewUseProjection"]["dmiLedgerSha256"] == matrix["dmiNewUseProjection"]["dmiLedgerSha256"]
    assert forged["dmiNewUseProjection"]["dmiAttestationSha256"] == matrix["dmiNewUseProjection"]["dmiAttestationSha256"]
    assert forged["agedDmiChallengePlan"]["challengePairCount"] == 1
    write(new_use_dir / "registry.json", forged)
    refused = run(new_use_dir)
    assert refused.returncode != 0
    assert "DMI_CURRENT_NEW_USE_NATIVE_BINDING_INVALID" in refused.stdout + refused.stderr
    assert dmi_path.read_bytes() == native_bytes and native == original_native

    # The usual raw-file pin must still reject bytes changed after sealing.
    write(new_use_dir / "registry.json", matrix)
    changed_native = copy.deepcopy(native)
    changed_native["generatedAt"] = (REFERENCE + timedelta(hours=1)).isoformat().replace("+00:00", "Z")
    write(dmi_path, changed_native)
    changed_bytes = dmi_path.read_bytes()
    refused_changed = run(new_use_dir)
    assert refused_changed.returncode != 0
    assert "DMI input bytes" in refused_changed.stdout + refused_changed.stderr
    assert dmi_path.read_bytes() == changed_bytes

print("OK: Copernicus range checker carries the aged-DMI challenge plan into donor-stage comparison.")
