#!/usr/bin/env python3
"""Focused live-builder adapter and rollback tests for operational closure."""
from __future__ import annotations

import importlib.util
import json
import math
import os
import shutil
import subprocess
import sys
import tempfile
from datetime import datetime, timedelta, timezone
from pathlib import Path
from unittest.mock import patch

from lib.copernicus_current import canonical_sha256, file_sha256
from lib import current_operational_closure as closure_module
from lib import regional_current_operational as regional_module
from lib.regional_source_proofs import _sample_sha
from lib.current_field_shadow import representative_profile
from lib.current_operational_closure import (
    ADVISORY_RECORD_REF_CONTRACT_ID,
    CONTRACT_ID,
    COPERNICUS_ADVISORY_PAST_MODEL_FIELD,
    COPERNICUS_BALTIC,
    CurrentOperationalClosureError,
    MISSING,
    OPEN_METEO_COMBINED_CURRENT,
    REGIONAL_DMI_DERIVED_HOLD,
)
from lib.open_meteo_current_fallback import build_document, build_record
from lib.regional_current_operational import VECTOR_COMMITMENT_CONTRACT_ID


ROOT = Path(__file__).resolve().parents[1]
SCRIPT = ROOT / "scripts/build-live-current-pilot.py"
SPEC = importlib.util.spec_from_file_location("build_live_current_pilot", SCRIPT)
assert SPEC and SPEC.loader
builder = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(builder)

REFERENCE = datetime(2026, 9, 2, 8, tzinfo=timezone.utc)
REFERENCE_TEXT = REFERENCE.strftime("%Y-%m-%dT%H:00:00Z")
SOURCE_TEXT = (REFERENCE - timedelta(hours=1)).strftime("%Y-%m-%dT%H:00:00Z")
MODEL_RUN = (REFERENCE - timedelta(hours=3)).strftime("%Y-%m-%dT%H:00:00Z")
HASH_A = canonical_sha256({"fixture": "a"})
HASH_B = canonical_sha256({"fixture": "b"})
PART_ID = "FIXTURE-REGIONAL"
TARGET = {
    "partId": PART_ID,
    "parentZoneId": "FIXTURE-ZONE",
    "name": "Fixture",
    "waterPoint": [0.0, 0.0],
}


def vector_commitment(u_value: float, v_value: float) -> str:
    return canonical_sha256({
        "schemaVersion": 1,
        "contractId": VECTOR_COMMITMENT_CONTRACT_ID,
        "partId": PART_ID,
        "collection": "dkss_lf",
        "modelRun": MODEL_RUN,
        "validTime": SOURCE_TEXT,
        "sourceAssetSha256": HASH_A,
        "verticalLayer": "depthbelowsea:5",
        "verticalLayerRankM": "5.000",
        "uMps": f"{u_value:.5f}",
        "vMps": f"{v_value:.5f}",
    })


u_value, v_value = 0.12345, -0.23456
assignment = {
    "partId": PART_ID,
    "validTime": REFERENCE_TEXT,
    "classification": REGIONAL_DMI_DERIVED_HOLD,
    "sourceValidTime": SOURCE_TEXT,
    "sourceModelRun": MODEL_RUN,
    "holdAgeHours": 1,
    "sourceAssetSha256": HASH_A,
    "sourceProofSha256": HASH_B,
    "vectorCommitmentSha256": vector_commitment(u_value, v_value),
    "assignmentSha256": canonical_sha256({"fixture": "assignment"}),
}
sample = {
    "collection": "dkss_lf",
    "modelRun": MODEL_RUN,
    "validTime": SOURCE_TEXT,
    "capturedAt": REFERENCE_TEXT,
    "sourceAssetSha256": HASH_A,
    "gridPoint": [0.1, 0.0],
    "distanceKm": 11.11949,
    "layers": {"bottom": {
        "verticalLayer": "depthbelowsea:5",
        "verticalLayerRankM": 5.0,
        "uMps": u_value,
        "vMps": v_value,
    }},
}
regional_cache = {
    "scoreImpact": False,
    "publicRuntime": False,
    "anchors": {f"REGIONAL_PROXY::{PART_ID}": {"samples": [sample]}},
}
closure_proof = {"closureId": HASH_B, "productionReferenceAt": REFERENCE_TEXT}
regional = builder.regional_entries(
    regional_cache, {PART_ID: TARGET}, [assignment], closure_proof,
)
regional_references = builder.regional_reference_entries(
    regional_cache, {PART_ID: TARGET}, [assignment], closure_proof,
)
assert len(regional) == 1
assert regional[0]["validTime"] == REFERENCE_TEXT
assert regional[0]["sourceValidTime"] == SOURCE_TEXT
assert regional[0]["holdAgeHours"] == 1
assert regional[0]["classification"] == REGIONAL_DMI_DERIVED_HOLD
assert regional[0]["stateOnly"] is True
assert regional[0]["currentVectorAvailable"] is False
assert regional[0]["arrowAvailable"] is False
for forbidden in (
    "uMps", "vMps", "currentUMps", "currentVMps", "currentSpeedMps",
    "currentDirectionDeg", "currentCoastNormalSpeedMps", "gridPoint", "arrow",
    "arrowSource",
):
    assert forbidden not in regional[0], f"Regional state-only hold leaked {forbidden}"
assert len(regional_references) == 1
assert regional_references[0]["referenceContractId"] == (
    "regional-dmi-private-native-cadence-reference-v1"
)
assert regional_references[0]["validTime"] == SOURCE_TEXT
assert regional_references[0]["sourceValidTime"] == SOURCE_TEXT
assert regional_references[0]["classification"] == "REGIONAL_DMI_NATIVE"
assert regional_references[0]["uMps"] == u_value
assert regional_references[0]["vMps"] == v_value
assert regional_references[0]["vectorCommitmentSha256"] == assignment["vectorCommitmentSha256"]
assert regional_references[0]["authorizedHoldAssignmentSha256s"] == [
    assignment["assignmentSha256"]
]

# The closure may retain a valid long-lead forecast. Its capture time is not a
# second validity contract: the exact source identity and vector commitment are.
long_lead_model_run = (
    REFERENCE - timedelta(hours=30)
).isoformat().replace("+00:00", "Z")
long_lead_capture = (
    REFERENCE - timedelta(hours=29)
).isoformat().replace("+00:00", "Z")
long_lead_sample = json.loads(json.dumps(sample))
long_lead_sample.update({
    "modelRun": long_lead_model_run.replace("Z", "+00:00"),
    "validTime": SOURCE_TEXT.replace("Z", "+00:00"),
    "capturedAt": long_lead_capture,
})
long_lead_assignment = {
    **assignment,
    "sourceModelRun": long_lead_model_run,
}
long_lead_assignment["vectorCommitmentSha256"] = canonical_sha256({
    "schemaVersion": 1,
    "contractId": VECTOR_COMMITMENT_CONTRACT_ID,
    "partId": PART_ID,
    "collection": "dkss_lf",
    "modelRun": long_lead_model_run,
    "validTime": SOURCE_TEXT,
    "sourceAssetSha256": HASH_A,
    "verticalLayer": "depthbelowsea:5",
    "verticalLayerRankM": "5.000",
    "uMps": f"{u_value:.5f}",
    "vMps": f"{v_value:.5f}",
})
long_lead_cache = {
    **regional_cache,
    "anchors": {
        f"REGIONAL_PROXY::{PART_ID}": {"samples": [long_lead_sample]},
    },
}
long_lead_result = builder.regional_entries(
    long_lead_cache,
    {PART_ID: TARGET},
    [long_lead_assignment],
    closure_proof,
)
assert len(long_lead_result) == 1
assert long_lead_result[0]["modelRun"] == long_lead_model_run
assert long_lead_result[0]["sourceValidTime"] == SOURCE_TEXT

# Equivalent UTC spellings must not make the adapter reject a sample that the
# closure has already canonicalized and admitted.
assert builder.regional_closure_sample(
    long_lead_cache["anchors"][f"REGIONAL_PROXY::{PART_ID}"],
    source_valid_time=SOURCE_TEXT,
    source_model_run=long_lead_model_run,
    source_asset_sha256=HASH_A,
) is long_lead_sample

duplicate_cache = json.loads(json.dumps(long_lead_cache))
duplicate_cache["anchors"][f"REGIONAL_PROXY::{PART_ID}"]["samples"].append(
    json.loads(json.dumps(long_lead_sample))
)
try:
    builder.regional_entries(
        duplicate_cache,
        {PART_ID: TARGET},
        [long_lead_assignment],
        closure_proof,
    )
except RuntimeError as error:
    assert str(error) == "REGIONAL_CLOSURE_SAMPLE_INVALID"
else:
    raise AssertionError("Ambiguous regional samples must remain fail closed")

poisoned = json.loads(json.dumps(regional_cache))
poisoned["anchors"][f"REGIONAL_PROXY::{PART_ID}"]["samples"][0]["layers"]["bottom"]["uMps"] += 0.01
try:
    builder.regional_entries(poisoned, {PART_ID: TARGET}, [assignment], closure_proof)
except RuntimeError as error:
    assert str(error) == "REGIONAL_CLOSURE_VECTOR_INVALID"
else:
    raise AssertionError("Regional vector tamper must fail closed")
try:
    builder.regional_reference_entries(
        poisoned, {PART_ID: TARGET}, [assignment], closure_proof,
    )
except RuntimeError as error:
    assert str(error) == "REGIONAL_CLOSURE_VECTOR_INVALID"
else:
    raise AssertionError("Regional reference vector tamper must fail closed")

# Closure-selected operational and past model-field advisory records remain separate,
# including the READY-stage path with no OPERATIONAL_COMPLETE collection.
cop_target = {
    "partId": "FIXTURE-COP",
    "parentZoneId": "FIXTURE-COP-ZONE",
    "name": "Fixture Cop",
    "waterPoint": [0.0, 0.0],
}
record_id = canonical_sha256({"fixture": "record"})
advisory_record_id = canonical_sha256({"fixture": "advisory-record"})
acquisition_id = canonical_sha256({"fixture": "acquisition"})
cop_assignment = {
    "partId": cop_target["partId"],
    "validTime": REFERENCE_TEXT,
    "classification": COPERNICUS_BALTIC,
    "source": "copernicus-baltic-nemo",
    "recordId": record_id,
    "acquisitionId": acquisition_id,
    "recordRefSha256": HASH_A,
    "assignmentSha256": HASH_B,
}
acquisition = {
    "acquisitionId": acquisition_id,
    "source": "copernicus-baltic-nemo",
    "acquisitionAt": REFERENCE_TEXT,
    "status": "COMPLETE",
    "requestContractId": "copernicus-current-multitime-bounded-spatial-shards-v1",
}


def record(record_identity: str, valid_time: str) -> dict:
    return {
        "recordId": record_identity,
        "acquisitionId": acquisition_id,
        "partId": cop_target["partId"],
        "validTime": valid_time,
        "gridPoint": [0.0, 0.0],
        "distanceKm": 0.0,
        "verticalLayerM": 5.0,
        "layerQuality": "deepest-common-layer",
        "sharedLayerCount": 1,
        "uMps": 0.1,
        "vMps": 0.2,
    }


advisory_ref = {
    "partId": cop_target["partId"],
    "validTime": SOURCE_TEXT,
    "recordId": advisory_record_id,
    "acquisitionId": acquisition_id,
    "source": "copernicus-baltic-nemo",
}
advisory_assignment = {
    **advisory_ref,
    "classification": COPERNICUS_ADVISORY_PAST_MODEL_FIELD,
    "recordRefSha256": canonical_sha256({
        "contractId": ADVISORY_RECORD_REF_CONTRACT_ID,
        "recordRef": advisory_ref,
    }),
    "assignmentSha256": canonical_sha256({"fixture": "advisory-assignment"}),
}
cache = {
    "collections": [],
    "acquisitions": [acquisition],
    "records": [record(record_id, REFERENCE_TEXT), record(advisory_record_id, SOURCE_TEXT)],
}
cop_closure_proof = {
    **closure_proof,
    "advisoryHistoryAssignments": [advisory_assignment],
}
with patch.object(builder, "validate_shadow", return_value=cache):
    operational, seal, advisory = builder.copernicus_entries(
        cache,
        {cop_target["partId"]: cop_target},
        [cop_assignment],
        cop_closure_proof,
    )
assert len(operational) == 1 and operational[0]["closureAssignmentSha256"] == HASH_B
assert seal is None
assert (
    len(advisory) == 1
    and advisory[0]["classification"] == "COPERNICUS_ADVISORY_PAST_MODEL_FIELD"
)
assert advisory[0]["closureAssignmentSha256"] == advisory_assignment["assignmentSha256"]
assert advisory[0]["collectionId"] == cop_closure_proof["closureId"]
assert advisory[0]["validTime"] == SOURCE_TEXT
assert advisory[0]["source"] == "copernicus-baltic-nemo"
assert advisory[0]["interpolation"] is False

# An honest partial Open-Meteo checkpoint is sealed over both its successful
# records and its exact missing pairs.  The public adapter must validate that
# full residual while projecting only the successful records.
open_target = {
    "partId": "FIXTURE-OPEN-METEO",
    "parentZoneId": "FIXTURE-OPEN-METEO-ZONE",
    "name": "Fixture Open-Meteo",
    "waterPoint": [10.0, 55.0],
}
open_record_time = (REFERENCE + timedelta(hours=1)).strftime(
    "%Y-%m-%dT%H:00:00Z"
)
open_missing_time = REFERENCE_TEXT
open_required = [
    {"partId": open_target["partId"], "validTime": open_missing_time},
    {"partId": open_target["partId"], "validTime": open_record_time},
]
open_stage_sha = canonical_sha256({"fixture": "open-stage"})
open_regional_sha = canonical_sha256({"fixture": "open-regional"})
open_record = build_record(
    part_id=open_target["partId"],
    valid_time=open_record_time,
    acquired_at=REFERENCE_TEXT,
    sampling_point=open_target["waterPoint"],
    grid_point=open_target["waterPoint"],
    speed_mps=0.3,
    toward_direction_deg=90,
    source_response_sha256=canonical_sha256({"fixture": "open-response"}),
)
open_document = build_document(
    targets=[open_target],
    required_pairs=open_required,
    records=[open_record],
    checkpointed_at=REFERENCE_TEXT,
    production_reference_at=REFERENCE_TEXT,
    copernicus_source_stage_status="READY",
    copernicus_source_stage_sha256=open_stage_sha,
    copernicus_bounded_progress_accepted=False,
    regional_evidence_sha256=open_regional_sha,
)
open_ref = {
    "partId": open_target["partId"],
    "validTime": open_record_time,
    "recordId": open_record["recordId"],
    "source": builder.OPEN_METEO_SOURCE,
}
open_assignment_identity = {
    "partId": open_target["partId"],
    "validTime": open_record_time,
    "classification": OPEN_METEO_COMBINED_CURRENT,
    "source": builder.OPEN_METEO_SOURCE,
    "model": builder.OPEN_METEO_MODEL,
    "recordId": open_record["recordId"],
    "acquiredAt": REFERENCE_TEXT,
    "recordRefSha256": builder.open_meteo_record_ref_sha256(open_ref),
    "physicalScope": builder.OPEN_METEO_PHYSICAL_SCOPE,
    "scoreInputPolicyId": builder.OPEN_METEO_SCORE_INPUT_POLICY_ID,
    "calibrationEligible": False,
}
open_assignment = {
    **open_assignment_identity,
    "assignmentSha256": canonical_sha256(open_assignment_identity),
}
missing_identity = {
    "partId": open_target["partId"],
    "validTime": open_missing_time,
    "classification": MISSING,
}
missing_assignment = {
    **missing_identity,
    "assignmentSha256": canonical_sha256(missing_identity),
}
open_closure = {
    "closureId": HASH_B,
    "productionReferenceAt": REFERENCE_TEXT,
    "copernicusSourceStageStatus": "READY",
    "copernicusSourceStageSha256": open_stage_sha,
    "copernicusBoundedProgressAccepted": False,
    "regionalEvidenceSha256": open_regional_sha,
    "openMeteoDocumentSha256": canonical_sha256(open_document),
    "openMeteoRecordRefsSha256": open_document["recordRefsSha256"],
    "openMeteoRequiredPairCount": 2,
    "openMeteoPairCount": 1,
    "missingPairCount": 1,
    "assignments": [open_assignment, missing_assignment],
}
open_entries = builder.open_meteo_entries(
    open_document,
    [open_target],
    {open_target["partId"]: open_target},
    [open_assignment],
    open_closure,
)
assert len(open_entries) == 1
assert open_entries[0]["classification"] == OPEN_METEO_COMBINED_CURRENT
assert open_entries[0]["closureAssignmentSha256"] == open_assignment["assignmentSha256"]

wrong_missing = json.loads(json.dumps(open_closure))
wrong_missing["assignments"][1]["validTime"] = (
    REFERENCE + timedelta(hours=2)
).strftime("%Y-%m-%dT%H:00:00Z")
try:
    builder.open_meteo_entries(
        open_document,
        [open_target],
        {open_target["partId"]: open_target},
        [open_assignment],
        wrong_missing,
    )
except RuntimeError as error:
    assert str(error) == "OPEN_METEO_CLOSURE_CACHE_INVALID"
else:
    raise AssertionError("A different missing residual must remain fail closed")

# Port the still-valid controlled-live CLI coverage from the retired legacy
# fixture: the entrypoint accepts one synthetic closure bound to the exact DMI
# file bytes, then fails closed after those bytes change post-seal.
with tempfile.TemporaryDirectory(prefix="ravradar-current-controlled-cli-") as raw:
    folder = Path(raw)
    target_file = folder / "targets.json"
    dmi_file = folder / "dmi.json"
    registry_file = folder / "registry.json"
    copernicus_file = folder / "copernicus.json"
    source_stage_file = folder / "source-stage.json"
    closure_file = folder / "closure.json"
    regional_file = folder / "regional.json"
    open_meteo_file = folder / "open-meteo.json"
    policy_file = folder / "policy.json"
    control_file = folder / "control.json"
    output_file = folder / "output.json"
    report_file = folder / "report.json"
    cli_target = {
        "partId": "FIXTURE-CONTROLLED",
        "parentZoneId": "FIXTURE-CONTROLLED-ZONE",
        "name": "Fixture controlled",
        "waterPoint": [0.0, 0.0],
    }
    target_file.write_text(json.dumps({
        "partCount": 1,
        "zones": {cli_target["parentZoneId"]: [{
            **cli_target,
            "sourceZoneId": cli_target["parentZoneId"],
        }]},
    }), encoding="utf-8")
    dmi_file.write_text(json.dumps({
        "zones": {},
        "diagnostics": {"currentOperationalLedger": {}},
    }), encoding="utf-8")
    sealed_dmi_sha256 = file_sha256(dmi_file)
    for path, value in (
        (registry_file, {"operationalRangeEndAt": REFERENCE_TEXT}),
        (copernicus_file, {}),
        (source_stage_file, {}),
        (regional_file, {}),
        (open_meteo_file, {}),
        (policy_file, {}),
        (control_file, {
            "schemaVersion": 1,
            "mode": "controlled-live",
            "credentialsPublic": False,
            "currentDataPublic": True,
            "rollbackBehavior": "missing",
        }),
    ):
        path.write_text(json.dumps(value), encoding="utf-8")
    cli_assignment = {
        "partId": cli_target["partId"],
        "validTime": REFERENCE_TEXT,
        "classification": "DMI_VERIFIED",
    }
    cli_proof = {
        "closureId": HASH_B,
        "productionReferenceAt": REFERENCE_TEXT,
        "supplementalAssignmentCount": 0,
        "supplementalAssignmentsSha256": canonical_sha256([]),
        "advisoryHistoryAssignmentCount": 0,
        "advisoryHistoryAssignmentsSha256": canonical_sha256([]),
        "assignments": [cli_assignment],
    }
    closure_file.write_text(json.dumps({
        **cli_proof,
        "dmiCurrentInputSha256": sealed_dmi_sha256,
    }), encoding="utf-8")

    cli_args = [
        str(SCRIPT),
        "--targets", str(target_file),
        "--dmi", str(dmi_file),
        "--registry", str(registry_file),
        "--copernicus", str(copernicus_file),
        "--source-stage", str(source_stage_file),
        "--closure", str(closure_file),
        "--regional", str(regional_file),
        "--open-meteo", str(open_meteo_file),
        "--policy", str(policy_file),
        "--control", str(control_file),
        "--output", str(output_file),
        "--report", str(report_file),
        "--at", REFERENCE_TEXT,
    ]

    def validate_bound_cli_closure(candidate, **inputs):
        if (
            candidate.get("dmiCurrentInputSha256")
            != inputs.get("dmi_current_input_sha256")
        ):
            raise CurrentOperationalClosureError(
                "CLOSURE_INPUT_BINDING_INVALID"
            )
        return cli_proof

    def run_controlled_cli() -> int:
        with (
            patch.object(sys, "argv", cli_args),
            patch.object(
                builder,
                "current_attestation_authorization_from_operational_ledger",
                return_value=([], []),
            ),
            patch.object(
                builder,
                "canonical_verified_part_current_attestation",
                return_value={"fixture": "attestation"},
            ),
            patch.object(
                builder,
                "validate_current_operational_closure",
                side_effect=validate_bound_cli_closure,
            ),
            patch.object(
                builder,
                "safe_current_operational_closure",
                return_value={"closureId": HASH_B},
            ),
            patch.object(
                builder,
                "copernicus_entries",
                return_value=([], None, []),
            ),
            patch.object(builder, "regional_entries", return_value=[]),
            patch.object(builder, "open_meteo_entries", return_value=[]),
            patch.object(
                builder,
                "valid_dmi_parts",
                return_value=(
                    {cli_target["partId"]},
                    {cli_target["partId"]: {REFERENCE_TEXT}},
                ),
            ),
        ):
            return builder.main()

    assert run_controlled_cli() == 0
    cli_output = json.loads(output_file.read_text(encoding="utf-8"))
    assert cli_output["enabled"] is True
    assert cli_output["operationalClosure"]["closureId"] == HASH_B

    changed_dmi = json.loads(dmi_file.read_text(encoding="utf-8"))
    changed_dmi["postSealByteMutation"] = True
    dmi_file.write_text(json.dumps(changed_dmi), encoding="utf-8")
    try:
        run_controlled_cli()
    except CurrentOperationalClosureError as error:
        assert error.code == "CLOSURE_INPUT_BINDING_INVALID"
    else:
        raise AssertionError(
            "Controlled-live must reject DMI bytes changed after closure seal"
        )

# Rollback must not read or validate any missing/corrupt supplemental sidecar.
with tempfile.TemporaryDirectory(prefix="ravradar-current-closure-rollback-") as raw:
    folder = Path(raw)
    target_file = folder / "targets.json"
    dmi_file = folder / "dmi.json"
    control_file = folder / "control.json"
    output_file = folder / "output.json"
    report_file = folder / "report.json"
    target_file.write_text(json.dumps({
        "partCount": 1,
        "zones": {"FIXTURE-ZONE": [{
            "partId": "FIXTURE-ROLLBACK",
            "sourceZoneId": "FIXTURE-ZONE",
            "name": "Fixture rollback",
            "waterPoint": [0.0, 0.0],
        }]},
    }), encoding="utf-8")
    dmi_file.write_text(json.dumps({"zones": {}}), encoding="utf-8")
    control_file.write_text(json.dumps({
        "schemaVersion": 1,
        "mode": "dmi-only-rollback",
        "credentialsPublic": False,
        "currentDataPublic": True,
        "rollbackBehavior": "ignore-supplemental",
    }), encoding="utf-8")
    completed = subprocess.run([
        sys.executable, "-B", str(SCRIPT),
        "--targets", str(target_file),
        "--dmi", str(dmi_file),
        "--registry", str(folder / "missing-registry.json"),
        "--copernicus", str(folder / "missing-copernicus.json"),
        "--source-stage", str(folder / "missing-source-stage.json"),
        "--closure", str(folder / "missing-closure.json"),
        "--regional", str(folder / "missing-regional.json"),
        "--policy", str(folder / "missing-policy.json"),
        "--control", str(control_file),
        "--output", str(output_file),
        "--report", str(report_file),
        "--at", REFERENCE_TEXT,
    ], cwd=ROOT, capture_output=True, text=True, check=False)
    assert completed.returncode == 0, completed.stdout + completed.stderr
    output = json.loads(output_file.read_text(encoding="utf-8"))
    report = json.loads(report_file.read_text(encoding="utf-8"))
    assert output["enabled"] is False
    assert output["entries"] == [] and output["advisoryEntries"] == []
    assert output["operationalClosure"] is None and output["copernicusRangeSeal"] is None
    assert "missingPartIds" not in report

# Cross-language regression: exercise the actual shadow rounding, regional
# validation/commitment, closure assignment and live-entry producers. The safe
# national ledger below is explicit aggregate fixture metadata, not 673 raw
# weather records or a claim of a full provider/closure integration. No vector
# commitment or assignment hash is manufactured in this test.
def regional_signed_zero_document(
    raw_u: float, raw_v: float = -0.23456, *, layer_rank: float = 5.0,
    held_reference: bool = False, extra_precision: bool = False,
) -> dict:
    targets = []
    pair_refs = []
    anchors = {}
    for index in range(2):
        part_id = f"SYNTHETIC-SIGNED-ZERO-{index}"
        target = {**TARGET, "partId": part_id}
        targets.append(target)
        profile = representative_profile([{
            "first": {"longitude": 0.1, "latitude": 0.0, "value": raw_u if index == 0 else 0.12345},
            "second": {"longitude": 0.1, "latitude": 0.0, "value": raw_v if index == 0 else -0.23456},
            "pointKey": (0.0, 0.1), "distanceKm": 11.11949,
            "layerKey": "depthbelowsea:5", "layerRank": layer_rank,
        }], maximum_distance_km=15.0)
        assert profile is not None
        if index == 0 and abs(raw_u) < 0.000001:
            rounded_u = profile["layers"]["bottom"]["uMps"]
            assert rounded_u == 0.0
            assert math.copysign(1.0, rounded_u) == math.copysign(1.0, raw_u)
            if abs(raw_v) < 0.000001:
                rounded_v = profile["layers"]["bottom"]["vMps"]
                assert rounded_v == 0.0
                assert math.copysign(1.0, rounded_v) == math.copysign(1.0, raw_v)
        if index == 0 and extra_precision:
            # A malformed unrounded sample is not repaired by the exact-zero
            # spelling fix. The unchanged JS precision check must reject it.
            profile["layers"]["bottom"]["uMps"] = raw_u
        native_sample = {
            **profile, "collection": "dkss_lf", "modelRun": MODEL_RUN,
            "validTime": REFERENCE_TEXT, "capturedAt": REFERENCE_TEXT,
            "sourceAssetSha256": HASH_A,
            "sampleKey": f"dkss_lf|{MODEL_RUN}|{REFERENCE_TEXT}|{HASH_A}",
        }
        # The source authorization and owner policy are artificial trusted
        # boundaries; exact sample, cadence, spatial and vector checks are real.
        original_sample_bytes = json.dumps(native_sample, sort_keys=True).encode("utf-8")
        original_sample_binding = _sample_sha(native_sample)
        evidence = regional_module._validated_sample(
            native_sample, part_id=part_id,
            part={"parentZoneId": target["parentZoneId"], "targetPoint": (0.0, 0.0),
                  "targetPointIdentity": ("0.0000000", "0.0000000")},
            policy_sha256=HASH_A, target_registry_sha256=HASH_B,
            ledger_sources={(MODEL_RUN, REFERENCE_TEXT, HASH_A): {"synthetic": True}},
            retained_sources={},
        )
        assert evidence is not None
        assert json.dumps(native_sample, sort_keys=True).encode("utf-8") == original_sample_bytes
        assert _sample_sha(native_sample) == original_sample_binding
        pair_refs.append({
            "partId": part_id, "validTime": REFERENCE_TEXT,
            "classification": "REGIONAL_DMI_NATIVE",
            "sourceValidTime": evidence["validTime"],
            "sourceModelRun": evidence["modelRun"],
            "sourceAssetSha256": evidence["sourceAssetSha256"],
            "sourceProofSha256": evidence["sourceProofSha256"],
            "vectorCommitmentSha256": evidence["vectorCommitmentSha256"],
        })
        anchors[f"REGIONAL_PROXY::{part_id}"] = {"samples": [native_sample]}
    reference = REFERENCE + timedelta(hours=1) if held_reference else REFERENCE
    reference_text = reference.strftime("%Y-%m-%dT%H:00:00Z")
    if held_reference:
        for row in pair_refs:
            row.update(validTime=reference_text, classification=REGIONAL_DMI_DERIVED_HOLD,
                       holdAgeHours=1)
    assignments = closure_module._regional_assignments({"pairRefs": pair_refs})
    shadow = {"scoreImpact": False, "publicRuntime": False, "anchors": anchors}
    original_shadow_bytes = json.dumps(shadow, sort_keys=True).encode("utf-8")
    original_bindings = [_sample_sha(row["samples"][0]) for row in anchors.values()]
    targets_by_id = {row["partId"]: row for row in targets}
    closure = {"closureId": HASH_B, "productionReferenceAt": reference_text}
    entries = builder.regional_entries(
        shadow, targets_by_id, assignments, closure,
    )
    references = builder.regional_reference_entries(shadow, targets_by_id, assignments, closure)
    assert len(references) == (2 if held_reference else 0)
    first_sample = anchors[f"REGIONAL_PROXY::{targets[0]['partId']}"]["samples"][0]
    first_bottom = first_sample["layers"]["bottom"]
    if any(first_bottom[field] == 0.0 and math.copysign(1.0, first_bottom[field]) < 0
           for field in ("uMps", "vMps", "verticalLayerRankM")):
        # Negative compatibility control only: reproduce the old decimal
        # spelling, not a new authorization. Old sealed derived hashes must be
        # rejected, never silently rewritten; regenerate evidence from originals.
        old_assignment = dict(assignments[0])
        old_assignment["vectorCommitmentSha256"] = canonical_sha256({
            "schemaVersion": 1, "contractId": VECTOR_COMMITMENT_CONTRACT_ID,
            "partId": targets[0]["partId"], "collection": "dkss_lf",
            "modelRun": MODEL_RUN, "validTime": REFERENCE_TEXT,
            "sourceAssetSha256": HASH_A, "verticalLayer": first_bottom["verticalLayer"],
            "verticalLayerRankM": f"{float(first_bottom['verticalLayerRankM']):.3f}",
            "uMps": f"{float(first_bottom['uMps']):.5f}",
            "vMps": f"{float(first_bottom['vMps']):.5f}",
        })
        assert old_assignment["vectorCommitmentSha256"] != assignments[0]["vectorCommitmentSha256"]
        old_assignments = [old_assignment, *assignments[1:]]
        adapters = [builder.regional_entries]
        if held_reference:
            adapters.append(builder.regional_reference_entries)
        for adapter in adapters:
            try:
                adapter(shadow, targets_by_id, old_assignments, closure)
            except RuntimeError as error:
                assert str(error) == "REGIONAL_CLOSURE_VECTOR_INVALID"
            else:
                raise AssertionError("Legacy signed-zero commitment must require a derived-proof rebuild")
    assert json.dumps(shadow, sort_keys=True).encode("utf-8") == original_shadow_bytes
    assert [_sample_sha(row["samples"][0]) for row in anchors.values()] == original_bindings
    assert len(entries) == 2
    total = 673 * 118
    safe = {field: HASH_B for field in closure_module.SAFE_FIELDS if field.endswith("Sha256")}
    safe.update({
        "schemaVersion": 3, "contractId": "current-operational-673x118-closure-safe-v3",
        "closureId": HASH_B, "status": "READY_WITH_MISSING",
        "productionReferenceAt": reference_text,
        "operationalRangeEndAt": (reference + timedelta(hours=117)).strftime("%Y-%m-%dT%H:00:00Z"),
        "targetCount": 673, "operationalHourCount": 118, "totalPairCount": total,
        "sourceOrderContractId": "dmi-verified-then-copernicus-baltic-then-amm15-then-regional-dmi-then-open-meteo-v2",
        "dmiVerifiedPairCount": total - 3, "copernicusBalticPairCount": 0,
        "copernicusAmm15PairCount": 0, "regionalNativePairCount": 0 if held_reference else 2,
        "regionalDerivedHoldPairCount": 2 if held_reference else 0, "regionalResidualPairCount": 2,
        "openMeteoRequiredPairCount": 1, "openMeteoPairCount": 0,
        "assignedPairCount": total - 1, "supplementalAssignmentCount": 2,
        "missingPairCount": 1, "copernicusCompleteWithoutSourceStage": False,
        "copernicusSourceStageStatus": "READY", "copernicusBoundedProgressAccepted": False,
        "openMeteoPhysicalScope": "eulerian-waves-and-tides-combined-surface-current",
        "openMeteoScoreInputPolicyId": "combined-current-single-channel-no-wave-or-tide-reprojection-v1",
        "openMeteoCalibrationEligible": False,
        "advisoryHistoryRequiredPairCount": 0, "advisoryHistoryAvailablePairCount": 0,
        "advisoryHistoryMissingPairCount": 0, "advisoryHistoryAssignmentCount": 0,
        "supplementalAssignmentsSha256": canonical_sha256([row["assignmentSha256"] for row in assignments]),
        "coordinatesIncluded": False, "rawVectorsIncluded": False,
        "partIdsIncluded": False, "pairRefsIncluded": False,
    })
    safe["safeProjectionSha256"] = canonical_sha256({
        key: value for key, value in safe.items() if key != "safeProjectionSha256"
    })
    assert set(safe) == closure_module.SAFE_FIELDS
    return {"parts": targets, "document": {
        "schemaVersion": 1, "controlledLivePilot": True, "mode": "controlled-live",
        "enabled": True, "credentialsIncluded": False, "targetFingerprint": HASH_B,
        "operationalClosure": safe, "entries": entries, "advisoryEntries": [],
        **({"regionalReferenceEntries": references} if held_reference else {}),
    }}


positive_zero = regional_signed_zero_document(0.0)
negative_zero = regional_signed_zero_document(-0.0000001)
negative_zero_v = regional_signed_zero_document(0.0, -0.0000001)
ordinary_nonzero = regional_signed_zero_document(0.12345)
negative_zero_rank = regional_signed_zero_document(0.0, layer_rank=-0.0)
unrounded_nonzero = regional_signed_zero_document(-0.0000001, extra_precision=True)
positive_references = regional_signed_zero_document(0.0, 0.0, held_reference=True)
negative_references = regional_signed_zero_document(-0.0000001, -0.0000001,
                                                   layer_rank=-0.0, held_reference=True)
# Formatting changes exact zero only; even tiny nonzero and halfway values keep
# their existing decimal strings, so this helper grants no precision admission.
for precision in (3, 5):
    assert regional_module.regional_vector_commitment_decimal(-0.0, precision) == f"{0.0:.{precision}f}"
    for value in (0.0, 0.12345, -0.23456, -0.0000001, 0.0000001, 1.234565):
        assert regional_module.regional_vector_commitment_decimal(value, precision) == f"{value:.{precision}f}"
tampered_zero = json.loads(json.dumps(positive_zero))
tampered_zero["document"]["entries"][0]["vectorCommitmentSha256"] = HASH_B
node = shutil.which("node")
assert node is not None, "Synthetic cross-language test requires Node"
probe = subprocess.run([
    node, "--input-type=module", "-e", """
import {controlledLiveCurrentProofStatus, mergeLiveCurrentPilotIntoRecord,
  verifiedNativeCadenceReferenceForPart}
  from './scripts/lib/live-current-pilot.mjs';
let input = ''; for await (const chunk of process.stdin) input += chunk;
const cases = JSON.parse(input);
if (!Object.is(cases[1].document.entries[0].uMps, -0)
  || !Object.is(cases[2].document.entries[0].vMps, -0)) {
  throw new Error('SYNTHETIC_JSON_SIGNED_ZERO_LOST');
}
const results = cases.map(({document, parts}) => {
  const status = controlledLiveCurrentProofStatus(document);
  const operational = status.operationalClosureValid;
  const accepted = parts.map(part => {
    const source = {hourly: [{time: document.operationalClosure.productionReferenceAt}]};
    const result = mergeLiveCurrentPilotIntoRecord(source, part, document);
    if (Object.hasOwn(source.hourly[0], 'currentUMps')) throw new Error('SYNTHETIC_INPUT_MUTATED');
    return result !== source && Number.isFinite(result.hourly[0].currentUMps)
      && Number.isFinite(result.hourly[0].currentVMps);
  });
  return {operational, accepted, ...(document.regionalReferenceEntries ? {
    regionalReferenceValid: status.regionalReferenceValid,
    nativeReferences: parts.map(part => verifiedNativeCadenceReferenceForPart(
      part, document, document.regionalReferenceEntries[0].sourceValidTime)),
  } : {})};
});
process.stdout.write(JSON.stringify(results));
""",
], input=json.dumps([positive_zero, negative_zero, negative_zero_v, tampered_zero,
                    ordinary_nonzero, negative_zero_rank, unrounded_nonzero,
                    positive_references, negative_references]),
    # Windows Node requires this OS bootstrap field for its CSPRNG. No provider,
    # application, credential, NODE_OPTIONS or proxy environment is inherited.
    cwd=ROOT, env={"SystemRoot": os.environ["SystemRoot"]} if sys.platform == "win32" else {},
    text=True, capture_output=True, check=False, timeout=30)
assert probe.returncode == 0, "Synthetic regional JS probe failed: " + probe.stderr
zero_results = json.loads(probe.stdout)
assert zero_results[0] == {"operational": True, "accepted": [True, True]}, "Positive-zero control must prove the real closure/merge path"
assert zero_results[3] == {"operational": False, "accepted": [False, False]}, "One tampered regional entry must reject the whole closure"
print("Synthetic regional signed-zero controls: positive=accepted; tamper=rejected; tiny-negative="
      + ("accepted" if zero_results[1]["operational"] else "rejected")
      + "; tiny-negative-v=" + ("accepted" if zero_results[2]["operational"] else "rejected"))
assert all(result == {"operational": True, "accepted": [True, True]}
           for result in zero_results[1:3]), (
    "REGIONAL_SIGNED_ZERO_CROSS_LANGUAGE_REGRESSION: actual Python-rounded tiny-negative "
    "must retain both valid regional entries in the JS closure"
)
assert all(result == {"operational": True, "accepted": [True, True]} for result in zero_results[4:6])
assert zero_results[6] == {"operational": False, "accepted": [False, False]}, "Nonzero precision-invalid input must remain rejected"
assert all(result == {"operational": True, "accepted": [False, False],
                      "regionalReferenceValid": True, "nativeReferences": [True, True]}
           for result in zero_results[7:9]), "Private native references must share the exact zero commitment contract"

print("Current operational live builder targeted tests passed")
