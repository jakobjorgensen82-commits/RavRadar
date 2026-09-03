#!/usr/bin/env python3
"""Focused live-builder adapter and rollback tests for operational closure."""
from __future__ import annotations

import importlib.util
import json
import subprocess
import sys
import tempfile
from datetime import datetime, timedelta, timezone
from pathlib import Path
from unittest.mock import patch

from lib.copernicus_current import canonical_sha256, file_sha256
from lib.current_operational_closure import (
    ADVISORY_RECORD_REF_CONTRACT_ID,
    CONTRACT_ID,
    COPERNICUS_ADVISORY_PAST_MODEL_FIELD,
    COPERNICUS_BALTIC,
    CurrentOperationalClosureError,
    REGIONAL_DMI_DERIVED_HOLD,
)
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
    regional_cache, {PART_ID: TARGET}, [assignment], closure_proof, REFERENCE,
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

poisoned = json.loads(json.dumps(regional_cache))
poisoned["anchors"][f"REGIONAL_PROXY::{PART_ID}"]["samples"][0]["layers"]["bottom"]["uMps"] += 0.01
try:
    builder.regional_entries(poisoned, {PART_ID: TARGET}, [assignment], closure_proof, REFERENCE)
except RuntimeError as error:
    assert str(error) == "REGIONAL_CLOSURE_VECTOR_INVALID"
else:
    raise AssertionError("Regional vector tamper must fail closed")

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
                "processed_source_assets_from_current_operational_ledger",
                return_value=[],
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

print("Current operational live builder targeted tests passed")
