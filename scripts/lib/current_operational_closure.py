"""Exact private closure for the 673 x 118 operational current matrix.

The source order is fixed and non-negotiable: verified local DMI, Baltic
Copernicus, AMM15 Copernicus, and finally one of the two explicitly evidenced
regional DMI dispositions.  This module neither downloads data nor changes
geometry.  It only validates existing evidence and emits reference-only
assignments; coordinates and raw U/V never enter the closure document.
"""
from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Any

from .copernicus_current import (
    canonical_sha256,
    required_pairs_sha256,
    select_required_records,
    validate_shadow,
    validate_target_registry,
    valid_sha256,
)
from .copernicus_current_source_stage import validate_source_stage
from .copernicus_target_identity import target_fingerprint
from .dmi_native_provenance import (
    canonical_time,
    current_source_asset_sha256,
    validate_current_operational_ledger,
)
from .regional_current_operational import (
    MISSING,
    REGIONAL_DMI_DERIVED_HOLD,
    REGIONAL_DMI_NATIVE,
    build_regional_current_operational_evidence,
)


SCHEMA_VERSION = 1
KIND = "RAVRADAR_PRIVATE_CURRENT_OPERATIONAL_CLOSURE"
CONTRACT_ID = "current-operational-673x118-closure-ready-v1"
SAFE_CONTRACT_ID = "current-operational-673x118-closure-safe-v1"
ASSIGNMENT_CONTRACT_ID = "current-operational-source-assignment-v1"
ADVISORY_ASSIGNMENT_CONTRACT_ID = (
    "current-advisory-past-model-field-source-assignment-v1"
)
ADVISORY_RECORD_REF_CONTRACT_ID = "current-advisory-copernicus-record-ref-v1"
EXPECTED_TARGET_COUNT = 673
OPERATIONAL_HOUR_COUNT = 118
OPERATIONAL_END_OFFSET_HOURS = 117
ADVISORY_HISTORY_HOUR_COUNT = 48
EXPECTED_TOTAL_PAIR_COUNT = EXPECTED_TARGET_COUNT * OPERATIONAL_HOUR_COUNT

DMI_VERIFIED = "DMI_VERIFIED"
COPERNICUS_BALTIC = "COPERNICUS_BALTIC"
COPERNICUS_AMM15 = "COPERNICUS_AMM15"
COPERNICUS_ADVISORY_PAST_MODEL_FIELD = (
    "COPERNICUS_ADVISORY_PAST_MODEL_FIELD"
)
SOURCE_TO_CLASSIFICATION = {
    "copernicus-baltic-nemo": COPERNICUS_BALTIC,
    "copernicus-nws-amm15": COPERNICUS_AMM15,
}
SOURCE_ORDER_CONTRACT_ID = (
    "dmi-verified-then-copernicus-baltic-then-amm15-then-regional-dmi-v1"
)

_DMI_FIELDS = {
    "partId", "validTime", "classification", "sourceCollection",
    "sourceModelRun", "sourceAssetSha256", "sourceProofSha256",
    "assignmentSha256",
}
_COP_FIELDS = {
    "partId", "validTime", "classification", "source", "recordId",
    "acquisitionId", "recordRefSha256", "assignmentSha256",
}
_ADVISORY_FIELDS = _COP_FIELDS
_REGIONAL_NATIVE_FIELDS = {
    "partId", "validTime", "classification", "sourceValidTime",
    "sourceModelRun", "sourceAssetSha256", "sourceProofSha256",
    "vectorCommitmentSha256", "assignmentSha256",
}
_REGIONAL_HOLD_FIELDS = _REGIONAL_NATIVE_FIELDS | {"holdAgeHours"}

PRIVATE_FIELDS = {
    "schemaVersion", "kind", "contractId", "closureId", "status",
    "productionReferenceAt", "operationalRangeEndAt", "targetCount",
    "operationalHourCount", "totalPairCount", "sourceOrderContractId",
    "dmiVerifiedPairCount", "copernicusBalticPairCount",
    "copernicusAmm15PairCount", "regionalNativePairCount",
    "regionalDerivedHoldPairCount", "regionalResidualPairCount",
    "supplementalAssignmentCount", "supplementalAssignmentsSha256",
    "missingPairCount", "copernicusCompleteWithoutSourceStage",
    "targetRegistrySha256", "dmiCurrentInputSha256", "dmiLedgerSha256",
    "dmiAttestationSha256", "copernicusRegistrySha256",
    "copernicusShadowSha256", "copernicusSourceStageId",
    "copernicusSourceStageSha256", "copernicusRecordRefsSha256",
    "regionalEvidenceSha256", "regionalPolicySha256",
    "regionalPairRefsSha256", "assignmentsSha256", "assignments",
    "advisoryHistoryRequiredPairCount", "advisoryHistoryRequiredPairsSha256",
    "advisoryHistoryAvailablePairCount", "advisoryHistoryMissingPairCount",
    "advisoryHistoryRecordRefsSha256", "advisoryHistoryAssignmentCount",
    "advisoryHistoryAssignmentsSha256", "advisoryHistoryAssignments",
    "coordinatesIncluded", "rawVectorsIncluded", "publicRuntime",
}

SAFE_FIELDS = {
    "schemaVersion", "contractId", "closureId", "safeProjectionSha256", "status",
    "productionReferenceAt", "operationalRangeEndAt", "targetCount",
    "operationalHourCount", "totalPairCount", "sourceOrderContractId",
    "dmiVerifiedPairCount", "copernicusBalticPairCount",
    "copernicusAmm15PairCount", "regionalNativePairCount",
    "regionalDerivedHoldPairCount", "regionalResidualPairCount",
    "supplementalAssignmentCount", "supplementalAssignmentsSha256",
    "missingPairCount", "copernicusCompleteWithoutSourceStage",
    "targetRegistrySha256", "dmiCurrentInputSha256", "dmiLedgerSha256",
    "dmiAttestationSha256", "copernicusRegistrySha256",
    "copernicusShadowSha256", "copernicusSourceStageSha256",
    "copernicusRecordRefsSha256", "regionalEvidenceSha256",
    "regionalPolicySha256", "regionalPairRefsSha256", "assignmentsSha256",
    "advisoryHistoryRequiredPairCount", "advisoryHistoryRequiredPairsSha256",
    "advisoryHistoryAvailablePairCount", "advisoryHistoryMissingPairCount",
    "advisoryHistoryRecordRefsSha256", "advisoryHistoryAssignmentCount",
    "advisoryHistoryAssignmentsSha256",
    "coordinatesIncluded", "rawVectorsIncluded", "partIdsIncluded",
    "pairRefsIncluded",
}


class CurrentOperationalClosureError(ValueError):
    """Privacy-safe fail-closed error."""

    def __init__(self, code: str) -> None:
        self.code = code
        super().__init__(code)


def _fail(code: str) -> None:
    raise CurrentOperationalClosureError(code)


def _exact_hour(value: Any, code: str) -> tuple[str, datetime]:
    normalized = canonical_time(value)
    if normalized is None:
        _fail(code)
    try:
        parsed = datetime.fromisoformat(normalized.replace("Z", "+00:00"))
    except (TypeError, ValueError):
        _fail(code)
    parsed = parsed.astimezone(timezone.utc)
    if parsed.minute or parsed.second or parsed.microsecond:
        _fail(code)
    text = parsed.strftime("%Y-%m-%dT%H:00:00Z")
    if not isinstance(value, datetime) and value != text:
        _fail(code)
    return text, parsed


def _canonical_pair_rows(value: Any, code: str) -> list[dict[str, str]]:
    if not isinstance(value, list):
        _fail(code)
    rows: list[dict[str, str]] = []
    for raw in value:
        if not isinstance(raw, dict) or set(raw) != {"partId", "validTime"}:
            _fail(code)
        part_id = str(raw.get("partId") or "").strip()
        valid_time, _ = _exact_hour(raw.get("validTime"), code)
        if not part_id or raw.get("partId") != part_id:
            _fail(code)
        rows.append({"partId": part_id, "validTime": valid_time})
    canonical = sorted(rows, key=lambda row: (row["validTime"], row["partId"]))
    if rows != canonical or len({(row["partId"], row["validTime"]) for row in rows}) != len(rows):
        _fail(code)
    return rows


def _target_binding(targets: Any) -> tuple[list[dict[str, Any]], dict[str, dict[str, Any]], str]:
    if not isinstance(targets, list) or len(targets) != EXPECTED_TARGET_COUNT:
        _fail("TARGET_MATRIX_INVALID")
    try:
        fingerprint = target_fingerprint(targets)
    except (TypeError, ValueError):
        _fail("TARGET_MATRIX_INVALID")
    by_id: dict[str, dict[str, Any]] = {}
    for target in targets:
        if not isinstance(target, dict):
            _fail("TARGET_MATRIX_INVALID")
        part_id = str(target.get("partId") or "").strip()
        if not part_id or part_id in by_id:
            _fail("TARGET_MATRIX_INVALID")
        by_id[part_id] = target
    return targets, by_id, fingerprint


def _matrix_keys(
    target_ids: set[str],
    reference: datetime,
) -> set[tuple[str, str]]:
    return {
        (part_id, (reference + timedelta(hours=offset)).strftime("%Y-%m-%dT%H:00:00Z"))
        for offset in range(OPERATIONAL_HOUR_COUNT)
        for part_id in target_ids
    }


def _source_asset_sha256(source: Any) -> str:
    try:
        return current_source_asset_sha256(source)
    except (TypeError, ValueError):
        _fail("DMI_PAIR_SOURCE_INVALID")
    raise AssertionError("unreachable")


def _assignment_sha256(identity: dict[str, Any]) -> str:
    return canonical_sha256({
        "schemaVersion": 1,
        "contractId": ASSIGNMENT_CONTRACT_ID,
        "assignment": identity,
    })


def _advisory_assignment_sha256(identity: dict[str, Any]) -> str:
    return canonical_sha256({
        "schemaVersion": 1,
        "contractId": ADVISORY_ASSIGNMENT_CONTRACT_ID,
        "assignment": identity,
    })


def assignment_identity_sha256(assignment: Any) -> str:
    """Return the exact public adapter authorization for one private row."""
    if not isinstance(assignment, dict) or "assignmentSha256" not in assignment:
        _fail("ASSIGNMENT_INVALID")
    identity = {key: value for key, value in assignment.items() if key != "assignmentSha256"}
    expected = _assignment_sha256(identity)
    if assignment.get("assignmentSha256") != expected:
        _fail("ASSIGNMENT_INVALID")
    return expected


def _dmi_assignments(attestation: dict[str, Any]) -> list[dict[str, Any]]:
    pairs = attestation.get("verifiedPairs")
    sources = attestation.get("verifiedPairSources")
    if not isinstance(pairs, list) or not isinstance(sources, list):
        _fail("DMI_ATTESTATION_INVALID")
    source_by_pair: dict[tuple[str, str], dict[str, Any]] = {}
    for raw in sources:
        if not isinstance(raw, dict) or set(raw) != {"partId", "validTime", "source"}:
            _fail("DMI_ATTESTATION_INVALID")
        part_id = str(raw.get("partId") or "").strip()
        valid_time, _ = _exact_hour(raw.get("validTime"), "DMI_ATTESTATION_INVALID")
        source = raw.get("source")
        source_sha256 = _source_asset_sha256(source)
        if not isinstance(source, dict):
            _fail("DMI_PAIR_SOURCE_INVALID")
        key = (part_id, valid_time)
        if key in source_by_pair:
            _fail("DMI_ATTESTATION_INVALID")
        source_by_pair[key] = source
    canonical_pairs = _canonical_pair_rows(pairs, "DMI_ATTESTATION_INVALID")
    if set(source_by_pair) != {(row["partId"], row["validTime"]) for row in canonical_pairs}:
        _fail("DMI_ATTESTATION_INVALID")
    assignments: list[dict[str, Any]] = []
    for pair in canonical_pairs:
        source = source_by_pair[(pair["partId"], pair["validTime"])]
        identity = {
            **pair,
            "classification": DMI_VERIFIED,
            "sourceCollection": source["collection"],
            "sourceModelRun": source["modelRun"],
            "sourceAssetSha256": _source_asset_sha256(source),
            "sourceProofSha256": canonical_sha256({
                "contractId": "current-operational-dmi-pair-source-v1",
                "partId": pair["partId"],
                "validTime": pair["validTime"],
                "sourceAssetSha256": _source_asset_sha256(source),
            }),
        }
        assignments.append({**identity, "assignmentSha256": _assignment_sha256(identity)})
    return assignments


def _copernicus_state(
    *,
    registry: dict[str, Any],
    shadow: dict[str, Any],
    shadow_sha256: str,
    source_stage: dict[str, Any] | None,
    target_by_id: dict[str, dict[str, Any]],
    reference: datetime,
) -> tuple[
    list[dict[str, Any]],
    list[dict[str, str]],
    list[dict[str, Any]],
    list[dict[str, str]],
    dict[str, Any] | None,
    bool,
]:
    try:
        cache = validate_shadow(shadow, target_by_id, require_collection=False)
        record_refs, missing_pairs = select_required_records(
            registry["operationalRequiredPairs"],
            list(cache.get("acquisitions") or []),
            list(cache.get("records") or []),
            reference,
        )
        advisory_refs, advisory_missing_pairs = select_required_records(
            registry["advisoryHistoryRequiredPairs"],
            list(cache.get("acquisitions") or []),
            list(cache.get("records") or []),
            reference,
        )
    except (TypeError, ValueError):
        _fail("COPERNICUS_SHADOW_INVALID")
    record_refs = sorted(record_refs, key=lambda row: (row["validTime"], row["partId"]))
    missing_pairs = sorted(missing_pairs, key=lambda row: (row["validTime"], row["partId"]))
    advisory_refs = sorted(advisory_refs, key=lambda row: (row["validTime"], row["partId"]))
    advisory_missing_pairs = sorted(
        advisory_missing_pairs,
        key=lambda row: (row["validTime"], row["partId"]),
    )
    if not missing_pairs:
        if not registry["operationalRequiredPairs"]:
            if source_stage in (None, {}):
                return (
                    record_refs,
                    missing_pairs,
                    advisory_refs,
                    advisory_missing_pairs,
                    None,
                    True,
                )
        if not isinstance(source_stage, dict) or not source_stage:
            _fail("SOURCE_STAGE_REQUIRED")
        try:
            validated_stage = validate_source_stage(
                source_stage,
                registry=registry,
                shadow=cache,
                target_identities=target_by_id,
                shadow_sha256=shadow_sha256,
            )
        except (TypeError, ValueError):
            _fail("SOURCE_STAGE_INVALID")
        if validated_stage.get("missingPairs") != missing_pairs:
            _fail("SOURCE_STAGE_RESIDUAL_INVALID")
        if (
            validated_stage.get("selectedRecordRefCount") != len(record_refs)
            or validated_stage.get("selectedRecordRefsSha256")
                != canonical_sha256(record_refs)
        ):
            _fail("SOURCE_STAGE_COPERNICUS_REFS_INVALID")
        try:
            validate_shadow(shadow, target_by_id, require_collection=True)
        except (TypeError, ValueError):
            _fail("COPERNICUS_COMPLETE_SEAL_INVALID")
        seals = [
            row for row in cache.get("collections") or []
            if row.get("status") == "OPERATIONAL_COMPLETE"
            and row.get("productionReferenceAt") == registry["productionReferenceAt"]
        ]
        if (
            len(seals) != 1
            or seals[0].get("operationalRecordRefs") != record_refs
            or seals[0].get("advisoryHistoryRecordRefs") != advisory_refs
            or seals[0].get("advisoryHistoryAvailablePairCount") != len(advisory_refs)
            or seals[0].get("advisoryHistoryMissingPairCount") != len(advisory_missing_pairs)
        ):
            _fail("COPERNICUS_COMPLETE_SEAL_INVALID")
        return (
            record_refs,
            missing_pairs,
            advisory_refs,
            advisory_missing_pairs,
            validated_stage,
            False,
        )
    if not isinstance(source_stage, dict) or not source_stage:
        _fail("SOURCE_STAGE_REQUIRED")
    try:
        validated_stage = validate_source_stage(
            source_stage,
            registry=registry,
            shadow=cache,
            target_identities=target_by_id,
            shadow_sha256=shadow_sha256,
        )
    except (TypeError, ValueError):
        _fail("SOURCE_STAGE_INVALID")
    if validated_stage.get("missingPairs") != missing_pairs:
        _fail("SOURCE_STAGE_RESIDUAL_INVALID")
    if (
        validated_stage.get("selectedRecordRefCount") != len(record_refs)
        or validated_stage.get("selectedRecordRefsSha256") != canonical_sha256(record_refs)
    ):
        _fail("SOURCE_STAGE_COPERNICUS_REFS_INVALID")
    return (
        record_refs,
        missing_pairs,
        advisory_refs,
        advisory_missing_pairs,
        validated_stage,
        False,
    )


def _copernicus_assignments(record_refs: list[dict[str, Any]]) -> list[dict[str, Any]]:
    assignments: list[dict[str, Any]] = []
    for ref in record_refs:
        if not isinstance(ref, dict) or set(ref) != {
            "partId", "validTime", "recordId", "acquisitionId", "source",
        }:
            _fail("COPERNICUS_REF_INVALID")
        classification = SOURCE_TO_CLASSIFICATION.get(ref.get("source"))
        if classification is None:
            _fail("COPERNICUS_SOURCE_ORDER_INVALID")
        identity = {
            "partId": ref["partId"],
            "validTime": ref["validTime"],
            "classification": classification,
            "source": ref["source"],
            "recordId": ref["recordId"],
            "acquisitionId": ref["acquisitionId"],
            "recordRefSha256": canonical_sha256({
                "contractId": "current-operational-copernicus-record-ref-v1",
                "recordRef": ref,
            }),
        }
        assignments.append({**identity, "assignmentSha256": _assignment_sha256(identity)})
    return assignments


def _advisory_assignments(record_refs: list[dict[str, Any]]) -> list[dict[str, Any]]:
    assignments: list[dict[str, Any]] = []
    for ref in record_refs:
        if not isinstance(ref, dict) or set(ref) != {
            "partId", "validTime", "recordId", "acquisitionId", "source",
        }:
            _fail("COPERNICUS_ADVISORY_REF_INVALID")
        if ref.get("source") not in SOURCE_TO_CLASSIFICATION:
            _fail("COPERNICUS_SOURCE_ORDER_INVALID")
        identity = {
            "partId": ref["partId"],
            "validTime": ref["validTime"],
            "classification": COPERNICUS_ADVISORY_PAST_MODEL_FIELD,
            "source": ref["source"],
            "recordId": ref["recordId"],
            "acquisitionId": ref["acquisitionId"],
            "recordRefSha256": canonical_sha256({
                "contractId": ADVISORY_RECORD_REF_CONTRACT_ID,
                "recordRef": ref,
            }),
        }
        assignments.append({
            **identity,
            "assignmentSha256": _advisory_assignment_sha256(identity),
        })
    return assignments


def _regional_assignments(private_proof: dict[str, Any]) -> list[dict[str, Any]]:
    rows = private_proof.get("pairRefs")
    if not isinstance(rows, list):
        _fail("REGIONAL_EVIDENCE_INVALID")
    assignments: list[dict[str, Any]] = []
    for row in rows:
        if not isinstance(row, dict):
            _fail("REGIONAL_EVIDENCE_INVALID")
        classification = row.get("classification")
        if classification == MISSING:
            _fail("REGIONAL_RESIDUAL_MISSING")
        if classification not in {REGIONAL_DMI_NATIVE, REGIONAL_DMI_DERIVED_HOLD}:
            _fail("REGIONAL_EVIDENCE_INVALID")
        fields = _REGIONAL_HOLD_FIELDS if classification == REGIONAL_DMI_DERIVED_HOLD else _REGIONAL_NATIVE_FIELDS
        identity = {key: row[key] for key in fields if key != "assignmentSha256"}
        if set(identity) != fields - {"assignmentSha256"}:
            _fail("REGIONAL_EVIDENCE_INVALID")
        assignments.append({**identity, "assignmentSha256": _assignment_sha256(identity)})
    return assignments


def _validate_assignment_shape(assignment: Any) -> tuple[str, str]:
    if not isinstance(assignment, dict):
        _fail("ASSIGNMENT_INVALID")
    classification = assignment.get("classification")
    expected_fields = {
        DMI_VERIFIED: _DMI_FIELDS,
        COPERNICUS_BALTIC: _COP_FIELDS,
        COPERNICUS_AMM15: _COP_FIELDS,
        REGIONAL_DMI_NATIVE: _REGIONAL_NATIVE_FIELDS,
        REGIONAL_DMI_DERIVED_HOLD: _REGIONAL_HOLD_FIELDS,
    }.get(classification)
    if expected_fields is None or set(assignment) != expected_fields:
        _fail("ASSIGNMENT_INVALID")
    part_id = str(assignment.get("partId") or "").strip()
    valid_time, valid_dt = _exact_hour(assignment.get("validTime"), "ASSIGNMENT_INVALID")
    if not part_id or assignment.get("partId") != part_id:
        _fail("ASSIGNMENT_INVALID")
    if not valid_sha256(assignment.get("assignmentSha256")):
        _fail("ASSIGNMENT_INVALID")
    assignment_identity_sha256(assignment)
    if classification in {DMI_VERIFIED, REGIONAL_DMI_NATIVE, REGIONAL_DMI_DERIVED_HOLD}:
        source_model_run, source_model_dt = _exact_hour(
            assignment.get("sourceModelRun"), "ASSIGNMENT_INVALID"
        )
        if (
            source_model_run != assignment.get("sourceModelRun")
            or source_model_dt > valid_dt
            or not valid_sha256(assignment.get("sourceAssetSha256"))
            or not valid_sha256(assignment.get("sourceProofSha256"))
        ):
            _fail("ASSIGNMENT_INVALID")
        if (
            classification != DMI_VERIFIED
            and not valid_sha256(assignment.get("vectorCommitmentSha256"))
        ):
            _fail("ASSIGNMENT_INVALID")
        if classification == DMI_VERIFIED:
            source_collection = str(assignment.get("sourceCollection") or "").strip()
            if not source_collection or assignment.get("sourceCollection") != source_collection:
                _fail("ASSIGNMENT_INVALID")
    if classification in {COPERNICUS_BALTIC, COPERNICUS_AMM15}:
        expected_source = {
            COPERNICUS_BALTIC: "copernicus-baltic-nemo",
            COPERNICUS_AMM15: "copernicus-nws-amm15",
        }[classification]
        if (
            assignment.get("source") != expected_source
            or not str(assignment.get("recordId") or "").strip()
            or not str(assignment.get("acquisitionId") or "").strip()
            or not valid_sha256(assignment.get("recordRefSha256"))
        ):
            _fail("ASSIGNMENT_INVALID")
        ref = {
            "partId": part_id,
            "validTime": valid_time,
            "recordId": assignment["recordId"],
            "acquisitionId": assignment["acquisitionId"],
            "source": assignment["source"],
        }
        if assignment["recordRefSha256"] != canonical_sha256({
            "contractId": "current-operational-copernicus-record-ref-v1",
            "recordRef": ref,
        }):
            _fail("ASSIGNMENT_INVALID")
    if classification == REGIONAL_DMI_NATIVE:
        source_time, source_dt = _exact_hour(
            assignment.get("sourceValidTime"), "ASSIGNMENT_INVALID"
        )
        if source_time != valid_time or source_model_dt > source_dt:
            _fail("ASSIGNMENT_INVALID")
    elif classification == REGIONAL_DMI_DERIVED_HOLD:
        source_time, source_dt = _exact_hour(assignment.get("sourceValidTime"), "ASSIGNMENT_INVALID")
        age = assignment.get("holdAgeHours")
        if isinstance(age, bool) or not isinstance(age, int) or age not in {1, 2, 3}:
            _fail("ASSIGNMENT_INVALID")
        if (
            source_model_dt > source_dt
            or valid_dt - source_dt != timedelta(hours=age)
            or source_time >= valid_time
        ):
            _fail("ASSIGNMENT_INVALID")
    return part_id, valid_time


def _validate_advisory_assignment_shape(
    assignment: Any,
    reference: datetime,
) -> tuple[str, str, dict[str, str]]:
    if (
        not isinstance(assignment, dict)
        or set(assignment) != _ADVISORY_FIELDS
        or assignment.get("classification")
            != COPERNICUS_ADVISORY_PAST_MODEL_FIELD
    ):
        _fail("ADVISORY_ASSIGNMENT_INVALID")
    part_id = str(assignment.get("partId") or "").strip()
    valid_time, valid_dt = _exact_hour(
        assignment.get("validTime"), "ADVISORY_ASSIGNMENT_INVALID"
    )
    if (
        not part_id
        or assignment.get("partId") != part_id
        or not reference - timedelta(hours=ADVISORY_HISTORY_HOUR_COUNT)
            <= valid_dt
            <= reference - timedelta(hours=1)
        or assignment.get("source") not in SOURCE_TO_CLASSIFICATION
        or not str(assignment.get("recordId") or "").strip()
        or not str(assignment.get("acquisitionId") or "").strip()
        or not valid_sha256(assignment.get("recordRefSha256"))
        or not valid_sha256(assignment.get("assignmentSha256"))
    ):
        _fail("ADVISORY_ASSIGNMENT_INVALID")
    ref = {
        "partId": part_id,
        "validTime": valid_time,
        "recordId": assignment["recordId"],
        "acquisitionId": assignment["acquisitionId"],
        "source": assignment["source"],
    }
    if (
        assignment["recordRefSha256"] != canonical_sha256({
            "contractId": ADVISORY_RECORD_REF_CONTRACT_ID,
            "recordRef": ref,
        })
        or assignment["assignmentSha256"] != _advisory_assignment_sha256({
            key: item for key, item in assignment.items() if key != "assignmentSha256"
        })
    ):
        _fail("ADVISORY_ASSIGNMENT_INVALID")
    return part_id, valid_time, ref


def _private_without_id(value: dict[str, Any]) -> dict[str, Any]:
    return {key: item for key, item in value.items() if key != "closureId"}


def _validate_private_structure(value: Any) -> dict[str, Any]:
    if not isinstance(value, dict) or set(value) != PRIVATE_FIELDS:
        _fail("CLOSURE_INVALID")
    if (
        value.get("schemaVersion") != SCHEMA_VERSION
        or value.get("kind") != KIND
        or value.get("contractId") != CONTRACT_ID
        or value.get("status") != "READY"
        or value.get("targetCount") != EXPECTED_TARGET_COUNT
        or value.get("operationalHourCount") != OPERATIONAL_HOUR_COUNT
        or value.get("totalPairCount") != EXPECTED_TOTAL_PAIR_COUNT
        or value.get("sourceOrderContractId") != SOURCE_ORDER_CONTRACT_ID
        or value.get("missingPairCount") != 0
        or value.get("coordinatesIncluded") is not False
        or value.get("rawVectorsIncluded") is not False
        or value.get("publicRuntime") is not False
    ):
        _fail("CLOSURE_INVALID")
    reference_text, reference = _exact_hour(value.get("productionReferenceAt"), "CLOSURE_INVALID")
    end_text, end = _exact_hour(value.get("operationalRangeEndAt"), "CLOSURE_INVALID")
    if end - reference != timedelta(hours=OPERATIONAL_END_OFFSET_HOURS):
        _fail("CLOSURE_INVALID")
    count_fields = (
        "dmiVerifiedPairCount", "copernicusBalticPairCount",
        "copernicusAmm15PairCount", "regionalNativePairCount",
        "regionalDerivedHoldPairCount", "regionalResidualPairCount",
        "supplementalAssignmentCount", "missingPairCount",
        "advisoryHistoryRequiredPairCount", "advisoryHistoryAvailablePairCount",
        "advisoryHistoryMissingPairCount", "advisoryHistoryAssignmentCount",
    )
    if any(
        isinstance(value.get(key), bool)
        or not isinstance(value.get(key), int)
        or value[key] < 0
        for key in count_fields
    ):
        _fail("CLOSURE_INVALID")
    if (
        value["regionalResidualPairCount"]
        != value["regionalNativePairCount"] + value["regionalDerivedHoldPairCount"]
        or sum(value[key] for key in (
            "dmiVerifiedPairCount", "copernicusBalticPairCount",
            "copernicusAmm15PairCount", "regionalNativePairCount",
            "regionalDerivedHoldPairCount", "missingPairCount",
        )) != EXPECTED_TOTAL_PAIR_COUNT
        or value["advisoryHistoryAvailablePairCount"]
            + value["advisoryHistoryMissingPairCount"]
            != value["advisoryHistoryRequiredPairCount"]
        or value["advisoryHistoryAssignmentCount"]
            != value["advisoryHistoryAvailablePairCount"]
    ):
        _fail("CLOSURE_CARDINALITY_INVALID")
    for key in (
        "closureId", "targetRegistrySha256", "dmiCurrentInputSha256",
        "dmiLedgerSha256", "dmiAttestationSha256",
        "copernicusRegistrySha256", "copernicusShadowSha256",
        "copernicusRecordRefsSha256", "regionalEvidenceSha256",
        "regionalPolicySha256", "regionalPairRefsSha256",
        "supplementalAssignmentsSha256", "assignmentsSha256",
        "advisoryHistoryRequiredPairsSha256",
        "advisoryHistoryRecordRefsSha256",
        "advisoryHistoryAssignmentsSha256",
    ):
        if not valid_sha256(value.get(key)):
            _fail("CLOSURE_BINDING_INVALID")
    stage_id = value.get("copernicusSourceStageId")
    stage_sha = value.get("copernicusSourceStageSha256")
    if value.get("copernicusCompleteWithoutSourceStage") is True:
        if (
            stage_id is not None
            or stage_sha is not None
            or value["regionalResidualPairCount"] != 0
            or value["copernicusBalticPairCount"] != 0
            or value["copernicusAmm15PairCount"] != 0
        ):
            _fail("CLOSURE_BINDING_INVALID")
    elif (
        value.get("copernicusCompleteWithoutSourceStage") is not False
        or not valid_sha256(stage_id)
        or not valid_sha256(stage_sha)
    ):
        _fail("CLOSURE_BINDING_INVALID")
    assignments = value.get("assignments")
    if not isinstance(assignments, list) or len(assignments) != EXPECTED_TOTAL_PAIR_COUNT:
        _fail("CLOSURE_CARDINALITY_INVALID")
    seen: set[tuple[str, str]] = set()
    times_by_part: dict[str, set[str]] = {}
    previous: tuple[str, str] | None = None
    counts = {
        DMI_VERIFIED: 0,
        COPERNICUS_BALTIC: 0,
        COPERNICUS_AMM15: 0,
        REGIONAL_DMI_NATIVE: 0,
        REGIONAL_DMI_DERIVED_HOLD: 0,
    }
    for assignment in assignments:
        part_id, valid_time = _validate_assignment_shape(assignment)
        sort_key = (valid_time, part_id)
        if sort_key in seen or (previous is not None and sort_key <= previous):
            _fail("CLOSURE_OVERLAP_INVALID")
        previous = sort_key
        seen.add(sort_key)
        times_by_part.setdefault(part_id, set()).add(valid_time)
        counts[assignment["classification"]] += 1
    expected_times = {
        (reference + timedelta(hours=offset)).strftime("%Y-%m-%dT%H:00:00Z")
        for offset in range(OPERATIONAL_HOUR_COUNT)
    }
    if (
        len(times_by_part) != EXPECTED_TARGET_COUNT
        or any(times != expected_times for times in times_by_part.values())
    ):
        _fail("CLOSURE_CARDINALITY_INVALID")
    if (
        counts[DMI_VERIFIED] != value["dmiVerifiedPairCount"]
        or counts[COPERNICUS_BALTIC] != value["copernicusBalticPairCount"]
        or counts[COPERNICUS_AMM15] != value["copernicusAmm15PairCount"]
        or counts[REGIONAL_DMI_NATIVE] != value["regionalNativePairCount"]
        or counts[REGIONAL_DMI_DERIVED_HOLD] != value["regionalDerivedHoldPairCount"]
        or value["supplementalAssignmentCount"] != len(assignments) - counts[DMI_VERIFIED]
        or canonical_sha256([
            row["assignmentSha256"]
            for row in assignments
            if row["classification"] != DMI_VERIFIED
        ]) != value["supplementalAssignmentsSha256"]
        or canonical_sha256(assignments) != value["assignmentsSha256"]
        or reference_text != value["productionReferenceAt"]
        or end_text != value["operationalRangeEndAt"]
    ):
        _fail("CLOSURE_BINDING_INVALID")
    advisory_assignments = value.get("advisoryHistoryAssignments")
    if (
        not isinstance(advisory_assignments, list)
        or len(advisory_assignments) != value["advisoryHistoryAssignmentCount"]
    ):
        _fail("ADVISORY_CARDINALITY_INVALID")
    advisory_seen: set[tuple[str, str]] = set()
    advisory_previous: tuple[str, str] | None = None
    advisory_refs: list[dict[str, str]] = []
    advisory_assignment_hashes: list[str] = []
    for assignment in advisory_assignments:
        part_id, valid_time, ref = _validate_advisory_assignment_shape(
            assignment, reference
        )
        sort_key = (valid_time, part_id)
        if (
            sort_key in advisory_seen
            or (advisory_previous is not None and sort_key <= advisory_previous)
        ):
            _fail("ADVISORY_OVERLAP_INVALID")
        advisory_previous = sort_key
        advisory_seen.add(sort_key)
        advisory_refs.append(ref)
        advisory_assignment_hashes.append(assignment["assignmentSha256"])
    if (
        canonical_sha256(advisory_refs)
            != value["advisoryHistoryRecordRefsSha256"]
        or canonical_sha256(advisory_assignment_hashes)
            != value["advisoryHistoryAssignmentsSha256"]
        or canonical_sha256(_private_without_id(value)) != value["closureId"]
    ):
        _fail("ADVISORY_BINDING_INVALID")
    return value


def safe_current_operational_closure(private_proof: Any) -> dict[str, Any]:
    proof = _validate_private_structure(private_proof)
    safe = {
        key: proof[key]
        for key in SAFE_FIELDS
        if key not in {
            "contractId", "safeProjectionSha256", "coordinatesIncluded",
            "rawVectorsIncluded", "partIdsIncluded", "pairRefsIncluded",
        }
    }
    safe.update({
        "contractId": SAFE_CONTRACT_ID,
        "coordinatesIncluded": False,
        "rawVectorsIncluded": False,
        "partIdsIncluded": False,
        "pairRefsIncluded": False,
    })
    safe["safeProjectionSha256"] = canonical_sha256(safe)
    if set(safe) != SAFE_FIELDS:
        _fail("SAFE_CLOSURE_INVALID")
    return safe


def build_current_operational_closure(
    *,
    targets: list[dict[str, Any]],
    dmi_ledger: dict[str, Any],
    dmi_attestation: dict[str, Any],
    dmi_current_input_sha256: str,
    copernicus_registry: dict[str, Any],
    copernicus_shadow: dict[str, Any],
    copernicus_shadow_sha256: str,
    copernicus_source_stage: dict[str, Any] | None,
    regional_shadow: dict[str, Any],
    regional_policy: dict[str, Any],
    locked_reference: Any,
) -> dict[str, dict[str, Any]]:
    reference_text, reference = _exact_hour(locked_reference, "LOCKED_REFERENCE_INVALID")
    end_text = (reference + timedelta(hours=OPERATIONAL_END_OFFSET_HOURS)).strftime(
        "%Y-%m-%dT%H:00:00Z"
    )
    targets, target_by_id, target_sha256 = _target_binding(targets)
    if not valid_sha256(dmi_current_input_sha256) or not valid_sha256(copernicus_shadow_sha256):
        _fail("INPUT_FILE_BINDING_INVALID")
    try:
        ledger = validate_current_operational_ledger(
            dmi_ledger,
            dmi_attestation,
            targets,
            reference_text,
            end_text,
            target_sha256,
        )
    except (TypeError, ValueError):
        _fail("DMI_LEDGER_ATTESTATION_INVALID")
    try:
        registry = validate_target_registry(copernicus_registry)
    except (TypeError, ValueError):
        _fail("COPERNICUS_REGISTRY_INVALID")
    if (
        registry.get("schemaVersion") != 3
        or registry.get("selectionMode") != "dmi-gaps-only"
        or registry.get("productionReferenceAt") != reference_text
        or registry.get("operationalRangeEndAt") != end_text
        or registry.get("operationalHourCount") != OPERATIONAL_HOUR_COUNT
        or registry.get("targetRegistrySha256") != target_sha256
        or registry.get("dmiCurrentInputSha256") != dmi_current_input_sha256
        or registry.get("targetCount") != EXPECTED_TARGET_COUNT
    ):
        _fail("COPERNICUS_REGISTRY_BINDING_INVALID")
    complement = _canonical_pair_rows(
        ledger.get("operationalComplementPairs"), "DMI_COMPLEMENT_INVALID"
    )
    required = _canonical_pair_rows(
        registry.get("operationalRequiredPairs"), "COPERNICUS_REQUIRED_MATRIX_INVALID"
    )
    advisory_required = _canonical_pair_rows(
        registry.get("advisoryHistoryRequiredPairs"),
        "COPERNICUS_ADVISORY_REQUIRED_MATRIX_INVALID",
    )
    if complement != required or required_pairs_sha256(required) != registry.get("operationalRequiredPairsSha256"):
        _fail("DMI_COPERNICUS_PARTITION_INVALID")
    if (
        len(advisory_required) != registry.get("advisoryHistoryRequiredPairCount")
        or required_pairs_sha256(advisory_required)
            != registry.get("advisoryHistoryRequiredPairsSha256")
    ):
        _fail("COPERNICUS_ADVISORY_REQUIRED_MATRIX_INVALID")

    dmi_assignments = _dmi_assignments(dmi_attestation)
    matrix = _matrix_keys(set(target_by_id), reference)
    dmi_keys = {(row["partId"], row["validTime"]) for row in dmi_assignments}
    complement_keys = {(row["partId"], row["validTime"]) for row in complement}
    if dmi_keys & complement_keys or dmi_keys | complement_keys != matrix:
        _fail("DMI_MATRIX_CLOSURE_INVALID")

    (
        cop_refs,
        residual_pairs,
        advisory_refs,
        advisory_missing_pairs,
        source_stage,
        complete_without_stage,
    ) = _copernicus_state(
        registry=registry,
        shadow=copernicus_shadow,
        shadow_sha256=copernicus_shadow_sha256,
        source_stage=copernicus_source_stage,
        target_by_id=target_by_id,
        reference=reference,
    )
    cop_assignments = _copernicus_assignments(cop_refs)
    advisory_assignments = _advisory_assignments(advisory_refs)
    regional_result = build_regional_current_operational_evidence(
        policy=regional_policy,
        targets=targets,
        current_shadow=regional_shadow,
        dmi_ledger=ledger,
        dmi_attestation=dmi_attestation,
        locked_reference=reference_text,
        dmi_gap_pairs=residual_pairs,
    )
    regional_private = regional_result["privateProof"]
    if regional_private.get("missingPairCount") != 0:
        _fail("REGIONAL_RESIDUAL_MISSING")
    regional_assignments = _regional_assignments(regional_private)

    cop_keys = {(row["partId"], row["validTime"]) for row in cop_assignments}
    regional_keys = {(row["partId"], row["validTime"]) for row in regional_assignments}
    residual_keys = {(row["partId"], row["validTime"]) for row in residual_pairs}
    advisory_required_keys = {
        (row["partId"], row["validTime"]) for row in advisory_required
    }
    advisory_keys = {
        (row["partId"], row["validTime"]) for row in advisory_assignments
    }
    advisory_missing_keys = {
        (row["partId"], row["validTime"]) for row in advisory_missing_pairs
    }
    if (
        cop_keys & regional_keys
        or cop_keys | regional_keys != complement_keys
        or regional_keys != residual_keys
    ):
        _fail("SUPPLEMENTAL_PARTITION_INVALID")
    if (
        advisory_keys & advisory_missing_keys
        or advisory_keys | advisory_missing_keys != advisory_required_keys
        or len(advisory_keys) != len(advisory_assignments)
    ):
        _fail("ADVISORY_PARTITION_INVALID")
    assignments = sorted(
        [*dmi_assignments, *cop_assignments, *regional_assignments],
        key=lambda row: (row["validTime"], row["partId"]),
    )
    if len(assignments) != EXPECTED_TOTAL_PAIR_COUNT:
        _fail("CLOSURE_CARDINALITY_INVALID")

    counts = {
        classification: sum(row["classification"] == classification for row in assignments)
        for classification in (
            DMI_VERIFIED,
            COPERNICUS_BALTIC,
            COPERNICUS_AMM15,
            REGIONAL_DMI_NATIVE,
            REGIONAL_DMI_DERIVED_HOLD,
        )
    }
    proof: dict[str, Any] = {
        "schemaVersion": SCHEMA_VERSION,
        "kind": KIND,
        "contractId": CONTRACT_ID,
        "status": "READY",
        "productionReferenceAt": reference_text,
        "operationalRangeEndAt": end_text,
        "targetCount": EXPECTED_TARGET_COUNT,
        "operationalHourCount": OPERATIONAL_HOUR_COUNT,
        "totalPairCount": EXPECTED_TOTAL_PAIR_COUNT,
        "sourceOrderContractId": SOURCE_ORDER_CONTRACT_ID,
        "dmiVerifiedPairCount": counts[DMI_VERIFIED],
        "copernicusBalticPairCount": counts[COPERNICUS_BALTIC],
        "copernicusAmm15PairCount": counts[COPERNICUS_AMM15],
        "regionalNativePairCount": counts[REGIONAL_DMI_NATIVE],
        "regionalDerivedHoldPairCount": counts[REGIONAL_DMI_DERIVED_HOLD],
        "regionalResidualPairCount": len(regional_assignments),
        "supplementalAssignmentCount": len(cop_assignments) + len(regional_assignments),
        "missingPairCount": 0,
        "copernicusCompleteWithoutSourceStage": complete_without_stage,
        "targetRegistrySha256": target_sha256,
        "dmiCurrentInputSha256": dmi_current_input_sha256,
        "dmiLedgerSha256": canonical_sha256(ledger),
        "dmiAttestationSha256": canonical_sha256(dmi_attestation),
        "copernicusRegistrySha256": canonical_sha256(registry),
        "copernicusShadowSha256": copernicus_shadow_sha256,
        "copernicusSourceStageId": source_stage.get("sourceStageId") if source_stage else None,
        "copernicusSourceStageSha256": canonical_sha256(source_stage) if source_stage else None,
        "copernicusRecordRefsSha256": canonical_sha256(cop_refs),
        "regionalEvidenceSha256": canonical_sha256(regional_private),
        "regionalPolicySha256": regional_private["policySha256"],
        "regionalPairRefsSha256": regional_private["pairRefsSha256"],
        "advisoryHistoryRequiredPairCount": len(advisory_required),
        "advisoryHistoryRequiredPairsSha256": required_pairs_sha256(
            advisory_required
        ),
        "advisoryHistoryAvailablePairCount": len(advisory_assignments),
        "advisoryHistoryMissingPairCount": len(advisory_missing_pairs),
        "advisoryHistoryRecordRefsSha256": canonical_sha256(advisory_refs),
        "advisoryHistoryAssignmentCount": len(advisory_assignments),
        "advisoryHistoryAssignmentsSha256": canonical_sha256([
            row["assignmentSha256"] for row in advisory_assignments
        ]),
        "advisoryHistoryAssignments": advisory_assignments,
        "supplementalAssignmentsSha256": canonical_sha256([
            row["assignmentSha256"]
            for row in assignments
            if row["classification"] != DMI_VERIFIED
        ]),
        "assignmentsSha256": canonical_sha256(assignments),
        "assignments": assignments,
        "coordinatesIncluded": False,
        "rawVectorsIncluded": False,
        "publicRuntime": False,
    }
    proof["closureId"] = canonical_sha256(proof)
    proof = _validate_private_structure(proof)
    return {
        "privateProof": proof,
        "safeProjection": safe_current_operational_closure(proof),
    }


def validate_current_operational_closure(
    private_proof: dict[str, Any],
    **inputs: Any,
) -> dict[str, Any]:
    """Rebuild all inputs and require an exact deterministic sidecar match."""
    candidate = _validate_private_structure(private_proof)
    rebuilt = build_current_operational_closure(**inputs)["privateProof"]
    if candidate != rebuilt:
        _fail("CLOSURE_INPUT_BINDING_INVALID")
    return candidate


__all__ = [
    "ADVISORY_ASSIGNMENT_CONTRACT_ID",
    "ADVISORY_RECORD_REF_CONTRACT_ID",
    "ASSIGNMENT_CONTRACT_ID",
    "CONTRACT_ID",
    "CurrentOperationalClosureError",
    "COPERNICUS_ADVISORY_PAST_MODEL_FIELD",
    "SAFE_CONTRACT_ID",
    "assignment_identity_sha256",
    "build_current_operational_closure",
    "safe_current_operational_closure",
    "validate_current_operational_closure",
]
