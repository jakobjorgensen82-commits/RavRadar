#!/usr/bin/env python3
"""Focused synthetic tests for the exact 673 x 118 current closure."""
from __future__ import annotations

import copy
import json
import runpy
import unittest
from pathlib import Path
from datetime import datetime, timedelta, timezone
from unittest.mock import patch

from lib import current_operational_closure as closure
from lib.copernicus_current import (
    canonical_sha256,
    empty_shadow,
    make_acquisition,
    make_record,
    required_pairs_sha256,
    select_required_records,
)
from lib.copernicus_target_identity import target_fingerprint
from lib.regional_current_operational import (
    REGIONAL_DMI_DERIVED_HOLD,
    REGIONAL_DMI_NATIVE,
)


REFERENCE = datetime(2026, 9, 2, 8, tzinfo=timezone.utc)
REFERENCE_TEXT = REFERENCE.strftime("%Y-%m-%dT%H:00:00Z")
END_TEXT = (REFERENCE + timedelta(hours=117)).strftime("%Y-%m-%dT%H:00:00Z")
HASH_A = canonical_sha256({"fixture": "a"})
HASH_B = canonical_sha256({"fixture": "b"})
HASH_C = canonical_sha256({"fixture": "c"})
TARGETS = [
    {
        "partId": f"fixture-part-{index:03d}",
        "parentZoneId": f"fixture-zone-{index // 10:03d}",
        "name": f"Fixture {index:03d}",
        "waterPoint": [0.0, 0.0],
    }
    for index in range(673)
]
TARGET_SHA256 = target_fingerprint(TARGETS)


def pair(part_index: int, offset: int) -> dict[str, str]:
    return {
        "partId": TARGETS[part_index]["partId"],
        "validTime": (REFERENCE + timedelta(hours=offset)).strftime("%Y-%m-%dT%H:00:00Z"),
    }


COMPLEMENT = sorted(
    [pair(0, 0), pair(1, 0), pair(2, 0), pair(3, 1)],
    key=lambda row: (row["validTime"], row["partId"]),
)
COMPLEMENT_KEYS = {(row["partId"], row["validTime"]) for row in COMPLEMENT}
ADVISORY_REQUIRED = sorted([
    {
        "partId": TARGETS[0]["partId"],
        "validTime": (REFERENCE - timedelta(hours=1)).strftime("%Y-%m-%dT%H:00:00Z"),
    },
    {
        "partId": TARGETS[1]["partId"],
        "validTime": (REFERENCE - timedelta(hours=2)).strftime("%Y-%m-%dT%H:00:00Z"),
    },
], key=lambda row: (row["validTime"], row["partId"]))


def assignment(identity: dict) -> dict:
    return {**identity, "assignmentSha256": closure._assignment_sha256(identity)}


DMI_ASSIGNMENTS = []
for offset in range(118):
    valid_time = (REFERENCE + timedelta(hours=offset)).strftime("%Y-%m-%dT%H:00:00Z")
    for target in TARGETS:
        if (target["partId"], valid_time) in COMPLEMENT_KEYS:
            continue
        DMI_ASSIGNMENTS.append(assignment({
            "partId": target["partId"],
            "validTime": valid_time,
            "classification": closure.DMI_VERIFIED,
            "sourceCollection": "fixture-dmi-current",
            "sourceModelRun": REFERENCE_TEXT,
            "sourceAssetSha256": HASH_A,
            "sourceProofSha256": HASH_B,
        }))

ALL_DMI_ASSIGNMENTS = [*DMI_ASSIGNMENTS]
for value in COMPLEMENT:
    ALL_DMI_ASSIGNMENTS.append(assignment({
        "partId": value["partId"],
        "validTime": value["validTime"],
        "classification": closure.DMI_VERIFIED,
        "sourceCollection": "fixture-dmi-current",
        "sourceModelRun": REFERENCE_TEXT,
        "sourceAssetSha256": HASH_A,
        "sourceProofSha256": HASH_B,
    }))
ALL_DMI_ASSIGNMENTS.sort(key=lambda row: (row["validTime"], row["partId"]))


def cop_ref(source: str, value: dict[str, str], suffix: str) -> dict[str, str]:
    return {
        **value,
        "recordId": f"fixture-record-{suffix}",
        "acquisitionId": f"fixture-acquisition-{suffix}",
        "source": source,
    }


def regional_ref(value: dict[str, str], classification: str) -> dict:
    result = {
        **value,
        "classification": classification,
        "sourceValidTime": value["validTime"],
        "sourceModelRun": REFERENCE_TEXT,
        "sourceAssetSha256": HASH_B,
        "sourceProofSha256": HASH_C,
        "vectorCommitmentSha256": HASH_A,
    }
    if classification == REGIONAL_DMI_DERIVED_HOLD:
        source = datetime.fromisoformat(value["validTime"].replace("Z", "+00:00")) - timedelta(hours=1)
        result["sourceValidTime"] = source.strftime("%Y-%m-%dT%H:00:00Z")
        result["holdAgeHours"] = 1
    return result


def registry(
    *,
    operational_required: list[dict[str, str]] = COMPLEMENT,
    advisory_required: list[dict[str, str]] = ADVISORY_REQUIRED,
) -> dict:
    return {
        "schemaVersion": 3,
        "selectionMode": "dmi-gaps-only",
        "productionReferenceAt": REFERENCE_TEXT,
        "operationalRangeEndAt": END_TEXT,
        "operationalHourCount": 118,
        "targetRegistrySha256": TARGET_SHA256,
        "dmiCurrentInputSha256": HASH_A,
        "targetCount": 673,
        "operationalRequiredPairs": copy.deepcopy(operational_required),
        "operationalRequiredPairsSha256": required_pairs_sha256(operational_required),
        "advisoryHistoryRequiredPairs": copy.deepcopy(advisory_required),
        "advisoryHistoryRequiredPairCount": len(advisory_required),
        "advisoryHistoryRequiredPairsSha256": required_pairs_sha256(advisory_required),
    }


def build_fixture(
    *,
    pure_copernicus: bool = False,
    pure_dmi: bool = False,
    omit_source_stage: bool = False,
    registry_override: dict | None = None,
):
    assert not (pure_copernicus and pure_dmi)
    selected = [
        cop_ref("copernicus-baltic-nemo", COMPLEMENT[0], "baltic"),
        cop_ref("copernicus-nws-amm15", COMPLEMENT[1], "amm15"),
    ]
    residual = COMPLEMENT[2:]
    advisory_selected = [
        cop_ref("copernicus-baltic-nemo", ADVISORY_REQUIRED[0], "advisory"),
    ]
    advisory_missing = ADVISORY_REQUIRED[1:]
    stage = {"sourceStageId": HASH_C, "status": "READY"}
    if pure_dmi:
        selected = []
        residual = []
        advisory_selected = []
        advisory_missing = []
        stage = None
    elif pure_copernicus:
        selected.extend([
            cop_ref("copernicus-baltic-nemo", COMPLEMENT[2], "baltic-two"),
            cop_ref("copernicus-nws-amm15", COMPLEMENT[3], "amm15-two"),
        ])
        residual = []
        if omit_source_stage:
            stage = None
    captured: dict[str, object] = {}

    def regional_builder(**kwargs):
        captured["regionalPairs"] = copy.deepcopy(kwargs["dmi_gap_pairs"])
        refs = [] if (pure_copernicus or pure_dmi) else [
            regional_ref(residual[0], REGIONAL_DMI_NATIVE),
            regional_ref(residual[1], REGIONAL_DMI_DERIVED_HOLD),
        ]
        return {"privateProof": {
            "missingPairCount": 0,
            "policySha256": HASH_A,
            "pairRefsSha256": canonical_sha256(refs),
            "pairRefs": refs,
        }}

    operational_required = [] if pure_dmi else COMPLEMENT
    advisory_required = [] if pure_dmi else ADVISORY_REQUIRED
    ledger = {"operationalComplementPairs": copy.deepcopy(operational_required)}
    document_registry = registry_override or registry(
        operational_required=operational_required,
        advisory_required=advisory_required,
    )
    with (
        patch.object(closure, "validate_current_operational_ledger", return_value=ledger),
        patch.object(closure, "validate_target_registry", return_value=document_registry),
        patch.object(
            closure,
            "_dmi_assignments",
            return_value=ALL_DMI_ASSIGNMENTS if pure_dmi else DMI_ASSIGNMENTS,
        ),
        patch.object(
            closure,
            "_copernicus_state",
            return_value=(
                selected,
                residual,
                advisory_selected,
                advisory_missing,
                stage,
                stage is None,
            ),
        ),
        patch.object(
            closure,
            "build_regional_current_operational_evidence",
            side_effect=regional_builder,
        ),
    ):
        result = closure.build_current_operational_closure(
            targets=TARGETS,
            dmi_ledger=ledger,
            dmi_attestation={"fixture": "attestation"},
            dmi_current_input_sha256=HASH_A,
            copernicus_registry=document_registry,
            copernicus_shadow={"fixture": "shadow"},
            copernicus_shadow_sha256=HASH_B,
            copernicus_source_stage=stage,
            regional_shadow={"fixture": "regional"},
            regional_policy={"fixture": "policy"},
            locked_reference=REFERENCE_TEXT,
        )
    return result, captured


def assert_error(code: str, callback) -> None:
    try:
        callback()
    except closure.CurrentOperationalClosureError as error:
        assert error.code == code, error.code
    else:
        raise AssertionError(f"Expected {code}")


# Full mixed-source closure: every exact target..+117 pair is assigned once.
mixed, captured = build_fixture()
private = mixed["privateProof"]
safe = mixed["safeProjection"]
assert private["totalPairCount"] == 673 * 118 == len(private["assignments"])
assert private["dmiVerifiedPairCount"] == 673 * 118 - 4
assert private["copernicusBalticPairCount"] == 1
assert private["copernicusAmm15PairCount"] == 1
assert private["regionalNativePairCount"] == 1
assert private["regionalDerivedHoldPairCount"] == 1
assert private["missingPairCount"] == 0
assert private["advisoryHistoryRequiredPairCount"] == 2
assert private["advisoryHistoryAvailablePairCount"] == 1
assert private["advisoryHistoryMissingPairCount"] == 1
assert private["advisoryHistoryAssignmentCount"] == 1
assert len(private["advisoryHistoryAssignments"]) == 1
assert private["totalPairCount"] == len(private["assignments"])
assert captured["regionalPairs"] == COMPLEMENT[2:]
assert {row["validTime"] for row in private["assignments"]} == {
    (REFERENCE + timedelta(hours=offset)).strftime("%Y-%m-%dT%H:00:00Z")
    for offset in range(118)
}

# The safe projection is counts/hashes only and cannot reveal pair refs or vectors.
safe_text = json.dumps(safe, sort_keys=True).lower()
assert set(safe) == closure.SAFE_FIELDS
assert all(target["partId"].lower() not in safe_text for target in TARGETS)
assert not any(token in safe_text for token in (
    "recordid", "acquisitionid", "sourcevalidtime", "umps", "vmps",
    "waterpoint", "gridpoint",
))
assert safe["advisoryHistoryMissingPairCount"] == 1
assert not any(isinstance(value, (dict, list)) for value in safe.values())

# A pure Copernicus-complete complement still carries READY source-stage
# evidence; COMPLETE is not a shortcut around the Baltic→AMM15 proof.
pure, pure_capture = build_fixture(pure_copernicus=True)
assert pure["privateProof"]["copernicusCompleteWithoutSourceStage"] is False
assert pure["privateProof"]["copernicusSourceStageId"] == HASH_C
assert pure["privateProof"]["regionalResidualPairCount"] == 0
assert pure_capture["regionalPairs"] == []
assert_error(
    "CLOSURE_BINDING_INVALID",
    lambda: build_fixture(
        pure_copernicus=True,
        omit_source_stage=True,
    ),
)

# Full DMI coverage remains a valid closure without supplemental entries or
# advisory history; the closure, not a legacy zero-gap seal, is the proof.
pure_dmi, pure_dmi_capture = build_fixture(pure_dmi=True)
pure_dmi_private = pure_dmi["privateProof"]
assert pure_dmi_private["dmiVerifiedPairCount"] == 673 * 118
assert pure_dmi_private["supplementalAssignmentCount"] == 0
assert pure_dmi_private["regionalResidualPairCount"] == 0
assert pure_dmi_private["advisoryHistoryRequiredPairCount"] == 0
assert pure_dmi_private["advisoryHistoryAssignmentCount"] == 0
assert pure_dmi_private["copernicusCompleteWithoutSourceStage"] is True
assert pure_dmi_private["copernicusSourceStageId"] is None
assert pure_dmi_capture["regionalPairs"] == []

# Assignment, overlap, missing-row and registry-binding tampering all fail closed.
original_hash = private["assignments"][0]["assignmentSha256"]
private["assignments"][0]["assignmentSha256"] = "0" * 64
assert_error("ASSIGNMENT_INVALID", lambda: closure.safe_current_operational_closure(private))
private["assignments"][0]["assignmentSha256"] = original_hash

original_second = private["assignments"][1]
private["assignments"][1] = copy.deepcopy(private["assignments"][0])
assert_error("CLOSURE_OVERLAP_INVALID", lambda: closure.safe_current_operational_closure(private))
private["assignments"][1] = original_second

removed = private["assignments"].pop()
assert_error("CLOSURE_CARDINALITY_INVALID", lambda: closure.safe_current_operational_closure(private))
private["assignments"].append(removed)

bad_advisory = private["advisoryHistoryAssignments"][0]["validTime"]
private["advisoryHistoryAssignments"][0]["validTime"] = REFERENCE_TEXT
assert_error(
    "ADVISORY_ASSIGNMENT_INVALID",
    lambda: closure.safe_current_operational_closure(private),
)
private["advisoryHistoryAssignments"][0]["validTime"] = bad_advisory

bad_advisory_classification = private["advisoryHistoryAssignments"][0]["classification"]
private["advisoryHistoryAssignments"][0]["classification"] = REGIONAL_DMI_NATIVE
assert_error(
    "ADVISORY_ASSIGNMENT_INVALID",
    lambda: closure.safe_current_operational_closure(private),
)
private["advisoryHistoryAssignments"][0]["classification"] = bad_advisory_classification

bad_registry = registry()
bad_registry["targetRegistrySha256"] = HASH_C
assert_error(
    "COPERNICUS_REGISTRY_BINDING_INVALID",
    lambda: build_fixture(registry_override=bad_registry),
)

# The actual selector pins Baltic ahead of AMM15 even when AMM15 is newer.
target = TARGETS[0]
valid_time = REFERENCE + timedelta(hours=2)
acquisitions = []
records = []
for index, (source, acquired_at) in enumerate((
    ("copernicus-baltic-nemo", REFERENCE),
    ("copernicus-nws-amm15", REFERENCE + timedelta(hours=1)),
)):
    acquisition = make_acquisition(
        source=source,
        acquisition_at=acquired_at,
        request_start_at=valid_time,
        request_end_at=valid_time,
        targets=[target],
        native_valid_times=[valid_time],
        subset_sha256=canonical_sha256({"source": source}),
        record_count=1,
    )
    record = make_record({
        "partId": target["partId"],
        "parentZoneId": target["parentZoneId"],
        "validTime": valid_time,
        "samplingPoint": target["waterPoint"],
        "gridPoint": target["waterPoint"],
        "distanceKm": 0.0,
        "verticalLayerM": 1.0,
        "layerQuality": "fixture",
        "sharedLayerCount": 1,
        "uMps": 0.0,
        "vMps": 0.0,
    }, acquisition, target)
    acquisitions.append(acquisition)
    records.append(record)
selected, missing = select_required_records(
    [{"partId": target["partId"], "validTime": valid_time}],
    acquisitions,
    records,
    REFERENCE,
)
assert not missing and selected[0]["source"] == "copernicus-baltic-nemo"

# Exercise the real final Copernicus consumer: a non-empty, fully covered
# complement cannot bypass the durable source-stage requirement merely because
# every pair has a selected record.
complete_shadow = empty_shadow(REFERENCE)
complete_shadow["acquisitions"] = sorted(
    acquisitions,
    key=lambda row: row["acquisitionId"],
)
complete_shadow["records"] = sorted(
    records,
    key=lambda row: (row["validTime"], row["partId"], row["recordId"]),
)
assert_error(
    "SOURCE_STAGE_REQUIRED",
    lambda: closure._copernicus_state(
        registry={
            "productionReferenceAt": REFERENCE_TEXT,
            "operationalRequiredPairs": [{
                "partId": target["partId"],
                "validTime": valid_time.strftime("%Y-%m-%dT%H:00:00Z"),
            }],
            "advisoryHistoryRequiredPairs": [],
        },
        shadow=complete_shadow,
        shadow_sha256=HASH_C,
        source_stage=None,
        target_by_id={target["partId"]: target},
        reference=REFERENCE,
    ),
)

# Keep the CLI diagnostic's focused checks in this existing CI entry point.
# It is also independently runnable while developing the diagnostic only.
diagnostic_tests = runpy.run_path(str(Path(__file__).with_name("test-current-closure-diagnostics.py")))
diagnostic_result = unittest.TextTestRunner().run(
    unittest.defaultTestLoader.loadTestsFromTestCase(diagnostic_tests["DiagnosticTests"])
)
assert diagnostic_result.wasSuccessful(), "Current closure diagnostic checks failed"
print("Current operational closure targeted tests passed")
