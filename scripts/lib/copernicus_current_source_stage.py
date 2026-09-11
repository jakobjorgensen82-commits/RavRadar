"""Fail-closed evidence for the Copernicus part of the current source chain.

This private sidecar is deliberately separate from the vector cache.  A cache
record proves that one exact U/V pair was selected.  A source-stage attempt
proves that one pinned spatial request completed and was parsed, including the
legitimate case where no usable record existed.  Only the latter may prove
that a still-missing pair has exhausted every applicable Copernicus product.
"""
from __future__ import annotations

import json
import math
import os
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from .copernicus_current import (
    FUTURE_ACQUISITION_FRESHNESS_HOURS,
    DMI_VERIFIER_CONTRACT_ID,
    REQUEST_CONTRACT_ID,
    SELECTION_POLICY_ID,
    CANDIDATE_CONFLICT_POLICY_ID,
    canonical_sha256,
    make_acquisition,
    required_pairs_sha256,
    select_required_records,
    utc_iso,
    valid_sha256,
    validate_shadow,
    validate_target_registry,
)
from .copernicus_target_identity import target_fingerprint


SOURCE_STAGE_SCHEMA_VERSION = 5
SOURCE_STAGE_KIND = "RAVRADAR_PRIVATE_COPERNICUS_CURRENT_SOURCE_STAGE"
SOURCE_STAGE_CONTRACT_ID = "copernicus-current-source-stage-ready-v5"
SOURCE_STAGE_STATUS = "READY"
SOURCE_STAGE_PROGRESS_SCHEMA_VERSION = 4
SOURCE_STAGE_PROGRESS_CONTRACT_ID = "copernicus-current-source-stage-in-progress-v4"
SOURCE_STAGE_PROGRESS_STATUS = "IN_PROGRESS"
SOURCE_ORDER_SELECTED_SOURCE = "copernicus-nws-amm15"
SOURCE_ORDER_PREREQUISITE_SOURCE = "copernicus-baltic-nemo"
SOURCE_ORDER_ATTEMPTED_EXHAUSTED = "ATTEMPTED_EXHAUSTED"
SOURCE_ORDER_ORIGINAL_PREREQUISITE = "ORIGINAL_RECORD_PREREQUISITE_VERIFIED"
SOURCE_ORDER_NOT_APPLICABLE = "NOT_APPLICABLE"
SOURCE_ORDER_EXCLUSION_REASON = "BALTIC_PREREQUISITE_NOT_ATTESTED"
SPATIAL_SHARD_LONGITUDE_DEGREES = 1.25
SPATIAL_SHARD_LATITUDE_DEGREES = 0.75
SPATIAL_SHARD_MAX_TARGETS = 24
SPATIAL_SHARD_POLICY_ID = "fixed-grid-1.25lon-0.75lat-max24-v1"

PINNED_PRODUCTS: tuple[dict[str, Any], ...] = (
    {
        "source": "copernicus-baltic-nemo",
        "productId": "BALTICSEA_ANALYSISFORECAST_PHY_003_006",
        "datasetId": "cmems_mod_bal_phy_anfc_PT1H-i",
        "datasetVersion": "202411",
        "minimumLongitude": 9.041582107543945,
        "maximumLongitude": 30.208656311035156,
        "minimumLatitude": 53.008296966552734,
        "maximumLatitude": 65.8909912109375,
        "targetMinimumLongitude": 8.94,
        "targetMaximumLongitude": 16.0,
    },
    {
        "source": "copernicus-nws-amm15",
        "productId": "NWSHELF_ANALYSISFORECAST_PHY_004_013",
        "datasetId": "cmems_mod_nws_phy-cur_anfc_1.5km-3D_PT1H-i",
        "datasetVersion": "202511",
        "minimumLongitude": -16.0,
        "maximumLongitude": 13.0,
        "minimumLatitude": 46.0,
        "maximumLatitude": 62.74324035644531,
        "targetMinimumLongitude": 7.5,
        "targetMaximumLongitude": 9.5,
    },
)

LEGACY_ATTEMPT_FIELDS = {
    "attemptId", "status", "productionReferenceAt", "acquisitionAt",
    "source", "productId", "datasetId", "datasetVersion",
    "requestContractId", "selectionPolicyId", "spatialShardPolicyId",
    "shardId", "requestStartAt", "requestEndAt", "targetPartIds",
    "requestedPairs", "requestedPairCount", "requestedPairsSha256",
    "subsetSha256", "acquisitionId", "parsedRecordCount",
}
ATTEMPT_SCHEMA_VERSION = 2
ATTEMPT_CONTRACT_ID = "copernicus-source-attempt-observed-native-times-v2"
ATTEMPT_FIELDS = LEGACY_ATTEMPT_FIELDS | {
    "attemptSchemaVersion", "attemptContractId", "observedNativeValidTimes",
}
PRODUCT_FIELDS = {
    "source", "productId", "datasetId", "datasetVersion",
    "requestContractId", "selectionPolicyId", "spatialShardPolicyId",
    "domainRequiredPairCount", "domainRequiredPairsSha256",
    "attemptedPairCount", "attemptedPairsSha256",
    "successfulAttemptCount", "successfulAttemptsSha256",
}
SOURCE_STAGE_FIELDS = {
    "schemaVersion", "kind", "contractId", "sourceStageId", "status",
    "sealedAt", "productionReferenceAt", "targetRegistrySha256",
    "dmiCurrentInputSha256", "dmiVerifierContractId",
    "requiredPairCount", "requiredPairsSha256",
    "selectedRecordRefCount", "selectedRecordRefsSha256",
    "missingPairs", "missingPairCount", "missingPairsSha256",
    "excludedRecordRefCount", "excludedRecordRefsSha256",
    "attempts", "attemptsSha256", "products", "productsSha256",
    "sourceOrderEvidence", "sourceOrderEvidenceCount",
    "sourceOrderEvidenceSha256",
    "shadowSha256", "scoreImpact", "publicRuntime",
    "coordinatesIncluded", "rawVectorsIncluded",
}
SOURCE_STAGE_PROGRESS_FIELDS = {
    "schemaVersion", "kind", "contractId", "sourceStageId", "status",
    "updatedAt", "productionReferenceAt", "targetRegistrySha256",
    "dmiCurrentInputSha256", "dmiVerifierContractId",
    "requiredPairCount", "requiredPairsSha256",
    "selectedRecordRefCount", "selectedRecordRefsSha256",
    "missingPairCount", "missingPairsSha256",
    "excludedRecordRefCount", "excludedRecordRefsSha256",
    "attempts", "attemptsSha256", "shadowSha256",
    "scoreImpact", "publicRuntime", "coordinatesIncluded",
    "rawVectorsIncluded",
}
PAIR_FIELDS = {"partId", "validTime"}
SOURCE_ORDER_EVIDENCE_FIELDS = {
    "partId", "validTime", "selectedSource", "prerequisiteSource",
    "disposition", "attemptId", "recordId", "acquisitionId", "admissionId", "evidenceSha256",
}
SOURCE_ORDER_EXCLUSION_FIELDS = {
    "partId", "validTime", "recordId", "selectedSource",
    "prerequisiteSource", "reason",
}
POSITIVE_STAGE_FIELDS = {
    "positiveAdmissions", "admissionAttempts", "admissionPolicySha256",
}
PRE_ADMISSION_SOURCE_STAGE_FIELDS = set(SOURCE_STAGE_FIELDS)
PRE_ADMISSION_SOURCE_STAGE_PROGRESS_FIELDS = set(SOURCE_STAGE_PROGRESS_FIELDS)
SOURCE_STAGE_FIELDS |= POSITIVE_STAGE_FIELDS
SOURCE_STAGE_PROGRESS_FIELDS |= POSITIVE_STAGE_FIELDS
LEGACY_SOURCE_STAGE_FIELDS = SOURCE_STAGE_FIELDS - {
    "excludedRecordRefCount", "excludedRecordRefsSha256",
} - POSITIVE_STAGE_FIELDS
LEGACY_SOURCE_STAGE_PROGRESS_FIELDS = SOURCE_STAGE_PROGRESS_FIELDS - {
    "excludedRecordRefCount", "excludedRecordRefsSha256",
} - POSITIVE_STAGE_FIELDS
POSITIVE_ADMISSION_FIELDS = {
    "admissionId", "recordId", "acquisitionId", "partId", "validTime",
    "source", "targetRegistrySha256", "admissionPolicySha256",
    "sourceAttemptId", "prerequisiteAttemptId",
}
ADMISSION_CONTRACT_ID = "copernicus-record-bound-positive-admission-v1"


def admission_policy_sha256() -> str:
    """Donor admission policy; pinned physical provider rules are unchanged."""
    return canonical_sha256({
        "contractId": ADMISSION_CONTRACT_ID,
        "requestContractId": REQUEST_CONTRACT_ID,
        "selectionPolicyId": SELECTION_POLICY_ID,
        "candidateConflictPolicyId": CANDIDATE_CONFLICT_POLICY_ID,
        "spatialShardPolicyId": SPATIAL_SHARD_POLICY_ID,
        "products": list(PINNED_PRODUCTS),
    })


class CopernicusSourceStageError(ValueError):
    """The source-stage evidence is incomplete, stale or malformed."""


def _exact_dict(value: Any, fields: set[str], label: str) -> dict[str, Any]:
    if not isinstance(value, dict) or set(value) != fields:
        raise CopernicusSourceStageError(f"{label} fields differ")
    return value


def _time(value: Any, label: str, *, exact_hour: bool = False) -> datetime:
    try:
        parsed = datetime.fromisoformat(str(value).replace("Z", "+00:00"))
    except ValueError as error:
        raise CopernicusSourceStageError(f"{label} is not an ISO timestamp") from error
    if parsed.tzinfo is None:
        raise CopernicusSourceStageError(f"{label} lacks a timezone")
    parsed = parsed.astimezone(timezone.utc)
    if exact_hour and parsed != parsed.replace(minute=0, second=0, microsecond=0):
        raise CopernicusSourceStageError(f"{label} is not an exact UTC hour")
    return parsed


def _canonical_pairs(value: Any, label: str) -> list[dict[str, str]]:
    if not isinstance(value, list):
        raise CopernicusSourceStageError(f"{label} is not an array")
    pairs: list[dict[str, str]] = []
    for raw in value:
        pair = _exact_dict(raw, PAIR_FIELDS, f"{label} pair")
        part_id = pair.get("partId")
        if not isinstance(part_id, str) or not part_id:
            raise CopernicusSourceStageError(f"{label} contains an invalid part identity")
        pairs.append({
            "partId": part_id,
            "validTime": utc_iso(_time(pair.get("validTime"), f"{label} time", exact_hour=True)),
        })
    canonical = sorted(pairs, key=lambda row: (row["validTime"], row["partId"]))
    if pairs != canonical or len({(row["partId"], row["validTime"]) for row in pairs}) != len(pairs):
        raise CopernicusSourceStageError(f"{label} is not canonical and unique")
    return pairs


def _canonical_native_times(value: Any, label: str) -> list[str]:
    """Validate the immutable native time-axis witness on a source attempt."""
    if not isinstance(value, list):
        raise CopernicusSourceStageError(f"{label} is not an array")
    times: list[str] = []
    for raw in value:
        if not isinstance(raw, str):
            raise CopernicusSourceStageError(f"{label} contains a non-string time")
        canonical = utc_iso(_time(raw, f"{label} time", exact_hour=True))
        if raw != canonical:
            raise CopernicusSourceStageError(f"{label} contains a non-canonical time")
        times.append(canonical)
    if times != sorted(set(times)):
        raise CopernicusSourceStageError(f"{label} is not canonical and unique")
    return times


def eligible_target(target: dict[str, Any], product: dict[str, Any]) -> bool:
    point = target.get("waterPoint")
    if (
        not isinstance(point, list)
        or len(point) != 2
        or any(isinstance(item, bool) or not isinstance(item, (int, float)) or not math.isfinite(float(item)) for item in point)
    ):
        raise CopernicusSourceStageError("Target point is invalid")
    return bool(
        float(product["targetMinimumLongitude"]) <= float(point[0]) <= float(product["targetMaximumLongitude"])
        and float(product["minimumLatitude"]) <= float(point[1]) <= float(product["maximumLatitude"])
    )


def spatial_shards(targets: list[dict[str, Any]], product: dict[str, Any]) -> list[dict[str, Any]]:
    """Return the pinned, ordering-independent spatial partition."""
    buckets: dict[tuple[int, int], list[dict[str, Any]]] = {}
    for target in targets:
        longitude, latitude = map(float, target["waterPoint"])
        x = math.floor((longitude - float(product["minimumLongitude"])) / SPATIAL_SHARD_LONGITUDE_DEGREES)
        y = math.floor((latitude - float(product["minimumLatitude"])) / SPATIAL_SHARD_LATITUDE_DEGREES)
        buckets.setdefault((x, y), []).append(target)
    shards: list[dict[str, Any]] = []
    for bucket in sorted(buckets):
        rows = sorted(buckets[bucket], key=lambda row: str(row["partId"]))
        for offset in range(0, len(rows), SPATIAL_SHARD_MAX_TARGETS):
            chunk = rows[offset:offset + SPATIAL_SHARD_MAX_TARGETS]
            shards.append({
                "shardId": f"{product['source']}:{bucket[0]}:{bucket[1]}:{offset // SPATIAL_SHARD_MAX_TARGETS}",
                "targets": chunk,
            })
    return shards


def _product_contract(product: dict[str, Any]) -> dict[str, str]:
    return {
        "source": str(product["source"]),
        "productId": str(product["productId"]),
        "datasetId": str(product["datasetId"]),
        "datasetVersion": str(product["datasetVersion"]),
        "requestContractId": REQUEST_CONTRACT_ID,
        "selectionPolicyId": SELECTION_POLICY_ID,
        "spatialShardPolicyId": SPATIAL_SHARD_POLICY_ID,
    }


def make_source_attempt(
    *,
    production_reference_at: datetime,
    acquisition_at: datetime,
    product: dict[str, Any],
    shard_id: str,
    target_part_ids: list[str],
    requested_pairs: list[dict[str, str]],
    subset_sha256: str,
    acquisition_id: str,
    parsed_record_count: int,
    observed_native_valid_times: list[Any],
) -> dict[str, Any]:
    pairs = sorted(requested_pairs, key=lambda row: (row["validTime"], row["partId"]))
    pairs = _canonical_pairs(pairs, "Attempt requested pairs")
    if not pairs:
        raise CopernicusSourceStageError("A completed source attempt cannot be empty")
    start = pairs[0]["validTime"]
    end = pairs[-1]["validTime"]
    observed_times = _canonical_native_times(
        sorted({utc_iso(value) for value in observed_native_valid_times}),
        "Attempt observed native times",
    )
    value: dict[str, Any] = {
        "attemptSchemaVersion": ATTEMPT_SCHEMA_VERSION,
        "attemptContractId": ATTEMPT_CONTRACT_ID,
        "status": "COMPLETE",
        "productionReferenceAt": utc_iso(production_reference_at),
        "acquisitionAt": utc_iso(acquisition_at),
        **_product_contract(product),
        "shardId": shard_id,
        "requestStartAt": start,
        "requestEndAt": end,
        "targetPartIds": sorted(target_part_ids),
        "requestedPairs": pairs,
        "requestedPairCount": len(pairs),
        "requestedPairsSha256": required_pairs_sha256(pairs),
        "subsetSha256": subset_sha256,
        "acquisitionId": acquisition_id,
        "parsedRecordCount": parsed_record_count,
        "observedNativeValidTimes": observed_times,
    }
    value["attemptId"] = canonical_sha256(value)
    return value


def _validate_attempt(
    raw: Any,
    *,
    reference: datetime,
    required_set: set[tuple[str, str]],
    targets: list[dict[str, Any]],
    product: dict[str, Any],
    acquisitions: list[dict[str, Any]],
    allow_detached_positive_witness: bool = False,
) -> dict[str, Any]:
    if not isinstance(raw, dict):
        raise CopernicusSourceStageError("Copernicus source attempt fields differ")
    fields = set(raw)
    if fields == ATTEMPT_FIELDS:
        attempt_format = "current"
    elif fields == LEGACY_ATTEMPT_FIELDS:
        attempt_format = "legacy"
    else:
        raise CopernicusSourceStageError("Copernicus source attempt fields differ")
    attempt = raw
    if attempt_format == "current" and (
        attempt.get("attemptSchemaVersion") != ATTEMPT_SCHEMA_VERSION
        or attempt.get("attemptContractId") != ATTEMPT_CONTRACT_ID
    ):
        raise CopernicusSourceStageError("Copernicus source attempt evidence contract is invalid")
    contract = _product_contract(product)
    if attempt.get("status") != "COMPLETE" or any(attempt.get(key) != value for key, value in contract.items()):
        raise CopernicusSourceStageError("Copernicus source attempt contract is not pinned")
    original_reference = _time(attempt.get("productionReferenceAt"), "Attempt reference", exact_hour=True)
    if not 0 <= (reference - original_reference).total_seconds() <= FUTURE_ACQUISITION_FRESHNESS_HOURS * 3600:
        raise CopernicusSourceStageError("Copernicus source attempt reference mismatch")
    acquisition_at = _time(attempt.get("acquisitionAt"), "Attempt acquisition time")
    if any(abs((acquisition_at - at).total_seconds()) > FUTURE_ACQUISITION_FRESHNESS_HOURS * 3600
           for at in (reference, original_reference)):
        raise CopernicusSourceStageError("Copernicus source attempt is stale")
    pairs = _canonical_pairs(attempt.get("requestedPairs"), "Attempt requested pairs")
    if not pairs:
        raise CopernicusSourceStageError("Copernicus source attempt is empty")
    pair_set = {(row["partId"], row["validTime"]) for row in pairs}
    # Preserve the immutable original request; only its intersection with the
    # newly verified DMI gap matrix counts in this snapshot. New pairs are not
    # covered by an old attempt, and actual acquisition times are never renewed.
    if not pair_set.intersection(required_set) or any(
        not 0 <= (_time(row["validTime"], "Attempt valid time", exact_hour=True)
                  - original_reference).total_seconds() <= 117 * 3600
        for row in pairs
    ):
        raise CopernicusSourceStageError("Copernicus source attempt lies outside the DMI-gap matrix")
    if (
        attempt.get("requestedPairCount") != len(pairs)
        or attempt.get("requestedPairsSha256") != required_pairs_sha256(pairs)
        or attempt.get("requestStartAt") != pairs[0]["validTime"]
        or attempt.get("requestEndAt") != pairs[-1]["validTime"]
    ):
        raise CopernicusSourceStageError("Copernicus source attempt pair binding is invalid")
    target_ids = attempt.get("targetPartIds")
    if (
        not isinstance(target_ids, list)
        or target_ids != sorted(set(target_ids))
        or set(target_ids) != {row["partId"] for row in pairs}
    ):
        raise CopernicusSourceStageError("Copernicus source attempt target binding is invalid")
    target_by_id = {str(row["partId"]): row for row in targets}
    if any(part_id not in target_by_id or not eligible_target(target_by_id[part_id], product) for part_id in target_ids):
        raise CopernicusSourceStageError("Copernicus source attempt is outside the pinned product domain")
    eligible = [row for row in targets if eligible_target(row, product)]
    shards = {row["shardId"]: row for row in spatial_shards(eligible, product)}
    shard = shards.get(str(attempt.get("shardId") or ""))
    if shard is None or not set(target_ids).issubset({row["partId"] for row in shard["targets"]}):
        raise CopernicusSourceStageError("Copernicus source attempt spatial shard is invalid")
    parsed_count = attempt.get("parsedRecordCount")
    if (
        isinstance(parsed_count, bool)
        or not isinstance(parsed_count, int)
        or parsed_count < 0
        or parsed_count > len(pairs)
    ):
        raise CopernicusSourceStageError("Copernicus source attempt parsed count is invalid")
    if not valid_sha256(attempt.get("subsetSha256")) or not valid_sha256(attempt.get("acquisitionId")):
        raise CopernicusSourceStageError("Copernicus source attempt source identity is invalid")
    # Current attempts carry their actually observed native time axis.  This
    # keeps an immutable prerequisite witness verifiable after its last cache
    # row legitimately leaves retention.  Legacy attempts predate partial-hour
    # success, so their requested exact hours are also their observed axis.
    if attempt_format == "current":
        observed_native_time_texts = _canonical_native_times(
            attempt.get("observedNativeValidTimes"),
            "Attempt observed native times",
        )
        if any(
            not _time(attempt["requestStartAt"], "Attempt request start", exact_hour=True)
            <= _time(value, "Attempt observed native time", exact_hour=True)
            <= _time(attempt["requestEndAt"], "Attempt request end", exact_hour=True)
            for value in observed_native_time_texts
        ):
            raise CopernicusSourceStageError(
                "Copernicus source attempt observed time lies outside its request envelope"
            )
        if parsed_count > 0 and not observed_native_time_texts:
            raise CopernicusSourceStageError(
                "Positive Copernicus source attempt has no observed native time"
            )
    else:
        observed_native_time_texts = sorted({row["validTime"] for row in pairs})
    observed_native_times = [
        _time(value, "Attempt observed native time", exact_hour=True)
        for value in observed_native_time_texts
    ]
    acquisition_by_id = {
        str(row.get("acquisitionId") or ""): row
        for row in acquisitions
        if isinstance(row, dict)
    }
    persisted_acquisition = acquisition_by_id.get(str(attempt["acquisitionId"]))
    if (
        parsed_count > 0
        and persisted_acquisition is None
        and not allow_detached_positive_witness
    ):
        raise CopernicusSourceStageError(
            "Positive Copernicus source attempt is detached from its acquisition"
        )
    full_persisted_acquisition = bool(
        persisted_acquisition is not None
        and "nativeValidTimes" in persisted_acquisition
    )
    if parsed_count > 0 and persisted_acquisition is not None and not full_persisted_acquisition:
        # Donor-bank control validation deliberately supplies only its minimal
        # manifest leaf.  The complete shadow acquisition is validated in the
        # second donor-bank pass; here the manifest still binds source/time/id.
        if (
            set(persisted_acquisition) != {"acquisitionId", "source", "acquisitionAt"}
            or persisted_acquisition["source"] != product["source"]
            or persisted_acquisition["acquisitionAt"] != attempt["acquisitionAt"]
        ):
            raise CopernicusSourceStageError(
                "Copernicus source attempt has an invalid acquisition manifest"
            )
    rebuilt_acquisition = make_acquisition(
        source=product["source"],
        acquisition_at=acquisition_at,
        request_start_at=_time(attempt["requestStartAt"], "Attempt request start", exact_hour=True),
        request_end_at=_time(attempt["requestEndAt"], "Attempt request end", exact_hour=True),
        targets=[target_by_id[part_id] for part_id in target_ids],
        native_valid_times=observed_native_times,
        subset_sha256=attempt["subsetSha256"],
        record_count=parsed_count,
        request_contract_id=REQUEST_CONTRACT_ID,
    )
    if attempt["acquisitionId"] != rebuilt_acquisition["acquisitionId"]:
        raise CopernicusSourceStageError(
            f"Copernicus source attempt acquisition identity mismatch for {product['source']}"
        )
    if full_persisted_acquisition and persisted_acquisition != rebuilt_acquisition:
        raise CopernicusSourceStageError(
            "Copernicus source attempt does not match its observed acquisition"
        )
    expected_id = canonical_sha256({key: value for key, value in attempt.items() if key != "attemptId"})
    if attempt.get("attemptId") != expected_id:
        raise CopernicusSourceStageError("Copernicus source attempt identity mismatch")
    return attempt


def validate_positive_admissions(
    admissions: Any,
    witnesses: Any,
    *,
    records: list[dict[str, Any]],
    acquisitions: list[dict[str, Any]],
    targets: list[dict[str, Any]],
) -> tuple[list[dict[str, Any]], list[dict[str, Any]]]:
    """Validate immutable positive proof at acquisition, never at today's age.

    A witness's own four-hour acquisition contract remains strict. Its age
    relative to a later consumer cannot revoke the exact already-admitted
    tuple. The certificate cannot be moved to a different acquisition/record.
    """
    if not isinstance(admissions, list) or not isinstance(witnesses, list):
        raise CopernicusSourceStageError("Positive admission arrays are malformed")
    products = {row["source"]: row for row in PINNED_PRODUCTS}
    witness_by_id: dict[str, dict[str, Any]] = {}
    for raw in witnesses:
        product = products.get(raw.get("source")) if isinstance(raw, dict) else None
        if product is None:
            raise CopernicusSourceStageError("Positive witness product is unknown")
        witness = _validate_attempt(
            raw,
            reference=_time(raw.get("productionReferenceAt"), "Witness reference", exact_hour=True),
            required_set={(row["partId"], row["validTime"]) for row in
                          _canonical_pairs(raw.get("requestedPairs"), "Witness pairs")},
            targets=targets,
            product=product,
            acquisitions=acquisitions,
            allow_detached_positive_witness=True,
        )
        if witness["attemptId"] in witness_by_id:
            raise CopernicusSourceStageError("Positive witness identity is duplicated")
        witness_by_id[witness["attemptId"]] = witness
    if witnesses != sorted(witnesses, key=lambda row: row["attemptId"]):
        raise CopernicusSourceStageError("Positive witnesses are not canonical")
    witness_pairs = {key: {(pair["partId"], pair["validTime"])
                          for pair in row["requestedPairs"]}
                     for key, row in witness_by_id.items()}
    records_by_id = {row["recordId"]: row for row in records}
    acquisitions_by_id = {row["acquisitionId"]: row for row in acquisitions}
    targets_by_id = {row["partId"]: row for row in targets}
    registry_sha = target_fingerprint(targets)
    policy_sha = admission_policy_sha256()
    used_witnesses: set[str] = set()
    seen_records: set[str] = set()
    for raw in admissions:
        certificate = _exact_dict(raw, POSITIVE_ADMISSION_FIELDS, "Positive admission")
        record = records_by_id.get(certificate["recordId"])
        acquisition = acquisitions_by_id.get(certificate["acquisitionId"])
        source_witness = witness_by_id.get(certificate["sourceAttemptId"])
        if record is None or acquisition is None:
            raise CopernicusSourceStageError("Positive admission is detached from its tuple")
        pair = (certificate["partId"], certificate["validTime"])
        if (
            certificate["recordId"] in seen_records
            or certificate["acquisitionId"] != record["acquisitionId"]
            or pair != (record["partId"], record["validTime"])
            or certificate["source"] != acquisition["source"]
            or certificate["targetRegistrySha256"] != registry_sha
            or certificate["admissionPolicySha256"] != policy_sha
            or certificate["admissionId"] != canonical_sha256({
                key: value for key, value in certificate.items() if key != "admissionId"
            })
        ):
            raise CopernicusSourceStageError("Positive admission tuple/policy binding is invalid")
        target = targets_by_id.get(pair[0])
        if target is None or not eligible_target(target, products[acquisition["source"]]):
            raise CopernicusSourceStageError("Positive admission target is outside its product")
        prerequisite_id = certificate["prerequisiteAttemptId"]
        needs_baltic = (acquisition["source"] == SOURCE_ORDER_SELECTED_SOURCE
                        and eligible_target(target, products[SOURCE_ORDER_PREREQUISITE_SOURCE]))
        if source_witness is not None:
            if (source_witness["acquisitionId"] != acquisition["acquisitionId"]
                or source_witness["source"] != acquisition["source"]
                or pair not in witness_pairs[source_witness["attemptId"]]):
                raise CopernicusSourceStageError("Positive source witness is detached")
            used_witnesses.add(source_witness["attemptId"])
        elif certificate["sourceAttemptId"] is not None or needs_baltic:
            raise CopernicusSourceStageError("Positive source acquisition witness is missing")
        if needs_baltic:
            prerequisite = witness_by_id.get(prerequisite_id)
            if (
                prerequisite is None
                or prerequisite["source"] != SOURCE_ORDER_PREREQUISITE_SOURCE
                or pair not in witness_pairs[prerequisite_id]
                or prerequisite["productionReferenceAt"] != source_witness["productionReferenceAt"]
                or _time(prerequisite["acquisitionAt"], "Prerequisite acquisition")
                    > _time(source_witness["acquisitionAt"], "Source acquisition")
            ):
                raise CopernicusSourceStageError("Positive AMM15 admission lacks its original Baltic attempt")
            used_witnesses.add(prerequisite_id)
        elif prerequisite_id is not None:
            raise CopernicusSourceStageError("Positive admission has an inapplicable prerequisite")
        seen_records.add(record["recordId"])
    if admissions != sorted(admissions, key=lambda row: row["recordId"]):
        raise CopernicusSourceStageError("Positive admissions are not canonical")
    if used_witnesses != set(witness_by_id):
        raise CopernicusSourceStageError("Positive witness table contains unbound evidence")
    return admissions, witnesses


def merge_positive_admissions(
    *,
    records: list[dict[str, Any]],
    acquisitions: list[dict[str, Any]],
    targets: list[dict[str, Any]],
    attempts: list[dict[str, Any]],
    positive_admissions: list[dict[str, Any]] | None = None,
    admission_attempts: list[dict[str, Any]] | None = None,
) -> dict[str, Any]:
    """Keep exact existing certificates; mint only acquisition-bound new ones.

    Old witnesses are exclusively for their existing certificates. They are
    deliberately not candidates when admitting another/new AMM15 acquisition.
    """
    record_ids = {row["recordId"] for row in records}
    retained = [row for row in positive_admissions or [] if row["recordId"] in record_ids]
    used = {row[key] for row in retained for key in ("sourceAttemptId", "prerequisiteAttemptId")
            if row[key] is not None}
    witnesses = [row for row in admission_attempts or [] if row["attemptId"] in used]
    validate_positive_admissions(retained, witnesses, records=records,
                                 acquisitions=acquisitions, targets=targets)
    witness_by_id = {row["attemptId"]: row for row in witnesses}
    certificates = {row["recordId"]: row for row in retained}
    source_attempts: dict[str, list[dict[str, Any]]] = {}
    baltic_by_pair: dict[tuple[str, str, str], list[dict[str, Any]]] = {}
    product_by_source = {row["source"]: row for row in PINNED_PRODUCTS}
    for raw in attempts:
        product = product_by_source.get(raw.get("source"))
        if product is None:
            raise CopernicusSourceStageError("Admission attempt product is unknown")
        attempt = _validate_attempt(
            raw, reference=_time(raw["productionReferenceAt"], "Admission reference", exact_hour=True),
            required_set={(row["partId"], row["validTime"]) for row in raw["requestedPairs"]},
            targets=targets, product=product, acquisitions=acquisitions,
        )
        source_attempts.setdefault(attempt["acquisitionId"], []).append(attempt)
        if attempt["source"] == SOURCE_ORDER_PREREQUISITE_SOURCE:
            for pair in attempt["requestedPairs"]:
                baltic_by_pair.setdefault((pair["partId"], pair["validTime"],
                                          attempt["productionReferenceAt"]), []).append(attempt)
    target_by_id = {row["partId"]: row for row in targets}
    acquisition_by_id = {row["acquisitionId"]: row for row in acquisitions}
    registry_sha = target_fingerprint(targets)
    policy_sha = admission_policy_sha256()
    for record in records:
        if record["recordId"] in certificates:
            continue
        acquisition = acquisition_by_id[record["acquisitionId"]]
        # Baltic's own immutable acquisition/record already proves its source.
        # Only AMM15 needs an additional precedence certificate.
        if acquisition["source"] != SOURCE_ORDER_SELECTED_SOURCE:
            continue
        pair = (record["partId"], record["validTime"])
        candidates = [attempt for attempt in source_attempts.get(record["acquisitionId"], [])
                      if {"partId": pair[0], "validTime": pair[1]} in attempt["requestedPairs"]]
        source_attempt = min(candidates, key=lambda row: row["attemptId"]) if candidates else None
        prerequisite = None
        if (acquisition["source"] == SOURCE_ORDER_SELECTED_SOURCE and
            eligible_target(target_by_id[pair[0]], product_by_source[SOURCE_ORDER_PREREQUISITE_SOURCE])):
            if source_attempt is None:
                continue
            prior = [row for row in baltic_by_pair.get((*pair, source_attempt["productionReferenceAt"]), [])
                     if _time(row["acquisitionAt"], "Baltic acquisition") <=
                        _time(source_attempt["acquisitionAt"], "AMM15 acquisition")]
            if not prior:
                continue
            prerequisite = min(prior, key=lambda row: row["attemptId"])
        identity = {
            "recordId": record["recordId"], "acquisitionId": record["acquisitionId"],
            "partId": pair[0], "validTime": pair[1], "source": acquisition["source"],
            "targetRegistrySha256": registry_sha, "admissionPolicySha256": policy_sha,
            "sourceAttemptId": source_attempt["attemptId"] if source_attempt else None,
            "prerequisiteAttemptId": prerequisite["attemptId"] if prerequisite else None,
        }
        certificates[record["recordId"]] = {**identity, "admissionId": canonical_sha256(identity)}
        if source_attempt:
            witness_by_id[source_attempt["attemptId"]] = source_attempt
        if prerequisite:
            witness_by_id[prerequisite["attemptId"]] = prerequisite
    selected = sorted(certificates.values(), key=lambda row: row["recordId"])
    witnesses = sorted(witness_by_id.values(), key=lambda row: row["attemptId"])
    validate_positive_admissions(selected, witnesses, records=records,
                                 acquisitions=acquisitions, targets=targets)
    return {"positiveAdmissions": selected, "admissionAttempts": witnesses,
            "admissionPolicySha256": policy_sha}


def stage_positive_evidence(stage: dict[str, Any]) -> dict[str, Any]:
    """Keyword arguments shared by every operational stage consumer."""
    return {"positive_admissions": stage.get("positiveAdmissions", []),
            "admission_attempts": stage.get("admissionAttempts", [])}


def project_positive_evidence(positive: dict[str, Any], required_pairs: list[dict[str, Any]]) -> dict[str, Any]:
    """Bound the operational sidecar; the separate donor bank retains reserves."""
    required = {(row["partId"], row["validTime"]) for row in required_pairs}
    certificates = [row for row in positive["positiveAdmissions"]
                    if (row["partId"], row["validTime"]) in required]
    needed = {row[key] for row in certificates for key in ("sourceAttemptId", "prerequisiteAttemptId")
              if row[key] is not None}
    return {"positiveAdmissions": certificates,
            "admissionAttempts": [row for row in positive["admissionAttempts"] if row["attemptId"] in needed],
            "admissionPolicySha256": positive["admissionPolicySha256"]}


def _validate_stage_positive(stage: dict[str, Any], shadow: dict[str, Any],
                             targets: list[dict[str, Any]]) -> None:
    if stage.get("admissionPolicySha256") != admission_policy_sha256():
        raise CopernicusSourceStageError("Positive admission policy binding differs")
    validate_positive_admissions(stage.get("positiveAdmissions"), stage.get("admissionAttempts"),
                                 records=shadow["records"], acquisitions=shadow["acquisitions"],
                                 targets=targets)


def original_stage_positive_evidence(
    document: Any, *, shadow: dict[str, Any], targets: list[dict[str, Any]],
    shadow_sha256: str,
) -> tuple[dict[str, Any], list[dict[str, Any]]]:
    """Extract original per-record proof before projecting a new DMI residual.

    This validates the original envelope and immutable source requests. It
    grants no old READY/count/negative-disposition authority to the new target.
    """
    if not isinstance(document, dict):
        raise CopernicusSourceStageError("Original source journal is malformed")
    ready = document.get("status") == SOURCE_STAGE_STATUS
    version = (document.get("schemaVersion"), document.get("contractId"))
    current = ((SOURCE_STAGE_SCHEMA_VERSION, SOURCE_STAGE_CONTRACT_ID) if ready else
               (SOURCE_STAGE_PROGRESS_SCHEMA_VERSION, SOURCE_STAGE_PROGRESS_CONTRACT_ID))
    previous = ((4, "copernicus-current-source-stage-ready-v4") if ready else
                (3, "copernicus-current-source-stage-in-progress-v3"))
    supported_legacy = ({(2, "copernicus-current-source-stage-ready-v2"),
                         (3, "copernicus-current-source-stage-ready-v3")} if ready else
                        {(1, "copernicus-current-source-stage-in-progress-v1"),
                         (2, "copernicus-current-source-stage-in-progress-v2")})
    fields = ((SOURCE_STAGE_FIELDS if ready else SOURCE_STAGE_PROGRESS_FIELDS) if version == current
              else (PRE_ADMISSION_SOURCE_STAGE_FIELDS if ready else PRE_ADMISSION_SOURCE_STAGE_PROGRESS_FIELDS)
              if version == previous else (LEGACY_SOURCE_STAGE_FIELDS if ready else LEGACY_SOURCE_STAGE_PROGRESS_FIELDS))
    stage = _exact_dict(document, fields, "Original source journal")
    if (version not in {current, previous, *supported_legacy}
        or stage.get("status") not in {SOURCE_STAGE_STATUS, SOURCE_STAGE_PROGRESS_STATUS}
        or stage.get("kind") != SOURCE_STAGE_KIND
        or stage.get("sourceStageId") != _source_stage_id(stage)
        or stage.get("shadowSha256") != shadow_sha256 or not valid_sha256(shadow_sha256)
        or stage.get("targetRegistrySha256") != target_fingerprint(targets)
        or not valid_sha256(stage.get("dmiCurrentInputSha256"))
        or stage.get("dmiVerifierContractId") != DMI_VERIFIER_CONTRACT_ID
        or not valid_sha256(stage.get("requiredPairsSha256"))
        or any(stage.get(key) is not False for key in
               ("scoreImpact", "publicRuntime", "coordinatesIncluded", "rawVectorsIncluded"))):
        raise CopernicusSourceStageError("Original source journal integrity/binding mismatch")
    validate_shadow(shadow, {row["partId"]: row for row in targets}, require_collection=False)
    reference = _time(stage["productionReferenceAt"], "Original reference", exact_hour=True)
    recorded_at = _time(stage["sealedAt" if ready else "updatedAt"], "Original journal time")
    if abs((recorded_at - reference).total_seconds()) > FUTURE_ACQUISITION_FRESHNESS_HOURS * 3600:
        raise CopernicusSourceStageError("Original journal was not time-valid when written")
    raw_attempts = stage.get("attempts")
    if not isinstance(raw_attempts, list) or stage.get("attemptsSha256") != canonical_sha256(raw_attempts):
        raise CopernicusSourceStageError("Original journal attempt hash mismatch")
    original_pairs = {(row["partId"], row["validTime"]) for attempt in raw_attempts
                      for row in _canonical_pairs(attempt.get("requestedPairs"), "Original attempt pairs")}
    # Legacy ordering is source/shard only. Individual immutable attempts are
    # validated before migration to the new deterministic effective journal.
    product_by_source = {row["source"]: row for row in PINNED_PRODUCTS}
    attempts = [_validate_attempt(attempt, reference=reference, required_set=original_pairs,
                                  targets=targets, product=product_by_source[attempt["source"]],
                                  acquisitions=shadow["acquisitions"])
                for attempt in raw_attempts]
    if len({row["attemptId"] for row in attempts}) != len(attempts):
        raise CopernicusSourceStageError("Original attempts are duplicated")
    if version == current:
        _validate_stage_positive(stage, shadow, targets)
    positive = merge_positive_admissions(
        records=shadow["records"], acquisitions=shadow["acquisitions"], targets=targets,
        attempts=attempts, **stage_positive_evidence(stage),
    )
    return positive, attempts


def _derive_products(
    required_pairs: list[dict[str, str]],
    targets: list[dict[str, Any]],
    attempts: list[dict[str, Any]],
) -> list[dict[str, Any]]:
    rows: list[dict[str, Any]] = []
    required_set = {(row["partId"], row["validTime"]) for row in required_pairs}
    for product in PINNED_PRODUCTS:
        eligible_ids = {str(row["partId"]) for row in targets if eligible_target(row, product)}
        domain_pairs = [row for row in required_pairs if row["partId"] in eligible_ids]
        source_attempts = [row for row in attempts if row["source"] == product["source"]]
        attempted_pairs = sorted(
            [{"partId": part_id, "validTime": valid_time}
             for part_id, valid_time in {
                 (pair["partId"], pair["validTime"])
                 for attempt in source_attempts for pair in attempt["requestedPairs"]
                 if (pair["partId"], pair["validTime"]) in required_set}],
            key=lambda row: (row["validTime"], row["partId"]),
        )
        if len({(row["partId"], row["validTime"]) for row in attempted_pairs}) != len(attempted_pairs):
            raise CopernicusSourceStageError("A Copernicus source attempted one pair more than once")
        rows.append({
            **_product_contract(product),
            "domainRequiredPairCount": len(domain_pairs),
            "domainRequiredPairsSha256": required_pairs_sha256(domain_pairs),
            "attemptedPairCount": len(attempted_pairs),
            "attemptedPairsSha256": required_pairs_sha256(attempted_pairs),
            "successfulAttemptCount": len(source_attempts),
            "successfulAttemptsSha256": canonical_sha256([
                row["attemptId"] for row in source_attempts
            ]),
        })
    return rows


def _source_order_evidence(
    record_refs: list[dict[str, Any]],
    targets: list[dict[str, Any]],
    attempts: list[dict[str, Any]],
    production_reference_at: datetime,
    positive_admissions: list[dict[str, Any]] | None = None,
) -> list[dict[str, Any]]:
    """Prove the Baltic prerequisite for every selected AMM15 pair.

    The original Baltic witness belongs to the exact admitted record. It does
    not expire with today's negative journal and must never claim today's
    exhaustion. Outside-domain NOT_APPLICABLE still comes only from geometry.
    """
    target_by_id = {str(row["partId"]): row for row in targets}
    product_by_source = {row["source"]: row for row in PINNED_PRODUCTS}
    baltic = next(
        row for row in PINNED_PRODUCTS
        if row["source"] == SOURCE_ORDER_PREREQUISITE_SOURCE
    )
    admission_by_record = {row["recordId"]: row for row in positive_admissions or []}
    current_attempt_ids = {row["attemptId"] for row in attempts
                           if row["source"] == SOURCE_ORDER_PREREQUISITE_SOURCE
                           and row["productionReferenceAt"] == utc_iso(production_reference_at)}

    evidence: list[dict[str, Any]] = []
    for ref in sorted(record_refs, key=lambda row: (row["validTime"], row["partId"])):
        part_id = str(ref.get("partId") or "")
        valid_time = str(ref.get("validTime") or "")
        target = target_by_id.get(part_id)
        if target is None:
            raise CopernicusSourceStageError(
                "A selected Copernicus pair has no bound target"
            )
        selected_source = str(ref.get("source") or "")
        selected_product = product_by_source.get(selected_source)
        if selected_product is None or not eligible_target(target, selected_product):
            raise CopernicusSourceStageError(
                "A selected Copernicus pair lies outside its pinned product domain"
            )
        if selected_source != SOURCE_ORDER_SELECTED_SOURCE:
            continue
        admission = admission_by_record.get(ref["recordId"])
        if admission is None or admission["acquisitionId"] != ref["acquisitionId"]:
            raise CopernicusSourceStageError("Selected AMM15 record lacks positive admission")
        attempt_id = admission["prerequisiteAttemptId"]
        if eligible_target(target, baltic):
            if not valid_sha256(attempt_id):
                raise CopernicusSourceStageError(
                    "An in-domain AMM15 pair lacks a completed Baltic prerequisite attempt"
                )
            disposition = (SOURCE_ORDER_ATTEMPTED_EXHAUSTED if attempt_id in current_attempt_ids
                           else SOURCE_ORDER_ORIGINAL_PREREQUISITE)
        else:
            if attempt_id is not None:
                raise CopernicusSourceStageError(
                    "An out-of-domain AMM15 pair cannot claim a Baltic attempt"
                )
            disposition = SOURCE_ORDER_NOT_APPLICABLE
            attempt_id = None
        identity = {
            "partId": part_id,
            "validTime": valid_time,
            "selectedSource": SOURCE_ORDER_SELECTED_SOURCE,
            "prerequisiteSource": SOURCE_ORDER_PREREQUISITE_SOURCE,
            "disposition": disposition,
            "attemptId": attempt_id,
            "recordId": ref["recordId"],
            "acquisitionId": ref["acquisitionId"],
            "admissionId": admission["admissionId"],
        }
        evidence.append({
            **identity,
            "evidenceSha256": canonical_sha256(identity),
        })
    return evidence


def select_source_order_admissible_records(
    required_pairs: list[dict[str, Any]],
    acquisitions: list[dict[str, Any]],
    records: list[dict[str, Any]],
    production_reference_at: datetime,
    targets: list[dict[str, Any]],
    attempts: list[dict[str, Any]],
    *,
    positive_admissions: list[dict[str, Any]] | None = None,
    admission_attempts: list[dict[str, Any]] | None = None,
) -> tuple[
    list[dict[str, Any]],
    list[dict[str, str]],
    list[dict[str, str]],
]:
    """Select records while quarantining only unproved AMM15 precedence.

    Shadow bytes remain retention evidence. An in-domain AMM15 record needs
    either its retained exact admission or matching source/Baltic attempts
    from its original acquisition reference. A later/old pair-level negative
    attempt cannot authorize another record merely because the pair matches.
    """
    target_by_id = {str(row["partId"]): row for row in targets}
    baltic = next(
        row for row in PINNED_PRODUCTS
        if row["source"] == SOURCE_ORDER_PREREQUISITE_SOURCE
    )
    positive = merge_positive_admissions(
        records=records, acquisitions=acquisitions, targets=targets,
        attempts=attempts, positive_admissions=positive_admissions,
        admission_attempts=admission_attempts,
    )
    admitted_ids = {row["recordId"] for row in positive["positiveAdmissions"]}
    eligible_records = list(records)
    exclusions: list[dict[str, str]] = []
    excluded_ids: set[str] = set()
    while True:
        record_refs, missing_pairs = select_required_records(
            required_pairs,
            acquisitions,
            eligible_records,
            production_reference_at,
        )
        newly_excluded: list[dict[str, str]] = []
        for ref in record_refs:
            pair = (str(ref["partId"]), str(ref["validTime"]))
            target = target_by_id.get(pair[0])
            if target is None:
                raise CopernicusSourceStageError(
                    "A selected Copernicus pair has no bound target"
                )
            if (
                ref["source"] == SOURCE_ORDER_SELECTED_SOURCE
                and eligible_target(target, baltic)
                and ref["recordId"] not in admitted_ids
            ):
                exclusion = {
                    "partId": pair[0],
                    "validTime": pair[1],
                    "recordId": str(ref["recordId"]),
                    "selectedSource": SOURCE_ORDER_SELECTED_SOURCE,
                    "prerequisiteSource": SOURCE_ORDER_PREREQUISITE_SOURCE,
                    "reason": SOURCE_ORDER_EXCLUSION_REASON,
                }
                if set(exclusion) != SOURCE_ORDER_EXCLUSION_FIELDS:
                    raise CopernicusSourceStageError(
                        "Copernicus source-order exclusion fields differ"
                    )
                newly_excluded.append(exclusion)
        if not newly_excluded:
            return (
                sorted(record_refs, key=lambda row: (row["validTime"], row["partId"])),
                sorted(missing_pairs, key=lambda row: (row["validTime"], row["partId"])),
                sorted(
                    exclusions,
                    key=lambda row: (
                        row["validTime"], row["partId"], row["recordId"]
                    ),
                ),
            )
        for exclusion in newly_excluded:
            record_id = exclusion["recordId"]
            if record_id in excluded_ids:
                raise CopernicusSourceStageError(
                    "Copernicus source-order exclusion did not converge"
                )
            excluded_ids.add(record_id)
            exclusions.append(exclusion)
        eligible_records = [
            row for row in eligible_records
            if row.get("recordId") not in excluded_ids
        ]


def _source_stage_id(document: dict[str, Any]) -> str:
    return canonical_sha256({key: value for key, value in document.items() if key != "sourceStageId"})


def _validate_attempts(
    attempts_raw: Any,
    *,
    reference: datetime,
    required_set: set[tuple[str, str]],
    targets: list[dict[str, Any]],
    acquisitions: list[dict[str, Any]],
) -> list[dict[str, Any]]:
    if not isinstance(attempts_raw, list):
        raise CopernicusSourceStageError("Copernicus source-stage attempts are malformed")
    product_by_source = {row["source"]: row for row in PINNED_PRODUCTS}
    attempts: list[dict[str, Any]] = []
    for raw in attempts_raw:
        product = product_by_source.get(str(raw.get("source") or "")) if isinstance(raw, dict) else None
        if product is None:
            raise CopernicusSourceStageError("Copernicus source-stage contains an unknown product")
        attempts.append(_validate_attempt(
            raw,
            reference=reference,
            required_set=required_set,
            targets=targets,
            product=product,
            acquisitions=acquisitions,
        ))
    source_rank = {row["source"]: index for index, row in enumerate(PINNED_PRODUCTS)}
    canonical_attempts = sorted(
        attempts,
        key=lambda row: (source_rank[row["source"]], row["shardId"],
                         row["productionReferenceAt"], row["acquisitionAt"], row["attemptId"]),
    )
    if attempts != canonical_attempts or len({row["attemptId"] for row in attempts}) != len(attempts):
        raise CopernicusSourceStageError("Copernicus source-stage attempts are not canonical and unique")
    attempted_pairs = [
        (attempt["source"], attempt["productionReferenceAt"], pair["partId"], pair["validTime"])
        for attempt in attempts
        for pair in attempt["requestedPairs"]
    ]
    if len(set(attempted_pairs)) != len(attempted_pairs):
        raise CopernicusSourceStageError("A Copernicus source attempted one pair more than once")
    return attempts


def _validate_source_stage_progress(
    document: Any,
    *,
    registry: dict[str, Any],
    shadow: dict[str, Any],
    target_identities: dict[str, dict[str, Any]],
    shadow_sha256: str,
    shadow_prevalidated: bool,
) -> dict[str, Any]:
    """Validate private resumable evidence without granting READY or closure."""
    stage = _exact_dict(
        document,
        SOURCE_STAGE_PROGRESS_FIELDS,
        "Copernicus source-stage progress",
    )
    registry = validate_target_registry(registry)
    if registry.get("schemaVersion") != 3:
        raise CopernicusSourceStageError(
            "Source-stage IN_PROGRESS is only valid for schema-3 operation"
        )
    if not valid_sha256(shadow_sha256):
        raise CopernicusSourceStageError("Copernicus shadow file identity is invalid")
    targets = sorted(
        target_identities.values(),
        key=lambda row: (row["parentZoneId"], row["partId"]),
    )
    if target_fingerprint(targets) != registry["targetRegistrySha256"]:
        raise CopernicusSourceStageError(
            "Current central targets do not match the source-stage registry"
        )
    if not shadow_prevalidated:
        shadow = validate_shadow(
            shadow,
            target_identities,
            require_collection=False,
        )
    _validate_stage_positive(stage, shadow, targets)
    reference = _time(
        registry["productionReferenceAt"],
        "Registry reference",
        exact_hour=True,
    )
    required_pairs = _canonical_pairs(
        registry["operationalRequiredPairs"],
        "Operational required pairs",
    )
    required_set = {(row["partId"], row["validTime"]) for row in required_pairs}
    attempts = _validate_attempts(
        stage.get("attempts"),
        reference=reference,
        required_set=required_set,
        targets=targets,
        acquisitions=shadow["acquisitions"],
    )
    if stage.get("attemptsSha256") != canonical_sha256(attempts):
        raise CopernicusSourceStageError(
            "Copernicus source-stage progress attempt hash mismatch"
        )
    record_refs, missing_pairs, excluded_refs = select_source_order_admissible_records(
        required_pairs,
        list(shadow.get("acquisitions") or []),
        list(shadow.get("records") or []),
        reference,
        targets,
        attempts,
        **stage_positive_evidence(stage),
    )
    if (
        stage.get("schemaVersion") != SOURCE_STAGE_PROGRESS_SCHEMA_VERSION
        or stage.get("kind") != SOURCE_STAGE_KIND
        or stage.get("contractId") != SOURCE_STAGE_PROGRESS_CONTRACT_ID
        or stage.get("status") != SOURCE_STAGE_PROGRESS_STATUS
        or stage.get("scoreImpact") is not False
        or stage.get("publicRuntime") is not False
        or stage.get("coordinatesIncluded") is not False
        or stage.get("rawVectorsIncluded") is not False
    ):
        raise CopernicusSourceStageError(
            "Copernicus source-stage progress top-level contract is invalid"
        )
    updated_at = _time(stage.get("updatedAt"), "Source-stage progress time")
    if abs((updated_at - reference).total_seconds()) > FUTURE_ACQUISITION_FRESHNESS_HOURS * 3600:
        raise CopernicusSourceStageError("Copernicus source-stage progress is stale")
    expected_bindings = {
        "productionReferenceAt": registry["productionReferenceAt"],
        "targetRegistrySha256": registry["targetRegistrySha256"],
        "dmiCurrentInputSha256": registry["dmiCurrentInputSha256"],
        "dmiVerifierContractId": registry["dmiVerifierContractId"],
        "requiredPairCount": len(required_pairs),
        "requiredPairsSha256": required_pairs_sha256(required_pairs),
        "selectedRecordRefCount": len(record_refs),
        "selectedRecordRefsSha256": canonical_sha256(record_refs),
        "missingPairCount": len(missing_pairs),
        "missingPairsSha256": required_pairs_sha256(missing_pairs),
        "excludedRecordRefCount": len(excluded_refs),
        "excludedRecordRefsSha256": canonical_sha256(excluded_refs),
        "shadowSha256": shadow_sha256,
    }
    if any(stage.get(key) != value for key, value in expected_bindings.items()):
        raise CopernicusSourceStageError(
            "Copernicus source-stage progress registry/cache binding is invalid"
        )
    current_attempted_by_source = {
        source: {
            (pair["partId"], pair["validTime"])
            for attempt in attempts
            if attempt["source"] == source
            and attempt["productionReferenceAt"] == utc_iso(reference)
            for pair in attempt["requestedPairs"]
        }
        for source in (row["source"] for row in PINNED_PRODUCTS)
    }
    target_by_id = {str(row["partId"]): row for row in targets}
    baltic = next(
        row for row in PINNED_PRODUCTS
        if row["source"] == SOURCE_ORDER_PREREQUISITE_SOURCE
    )
    for part_id, valid_time in current_attempted_by_source[
        SOURCE_ORDER_SELECTED_SOURCE
    ]:
        if (
            (part_id, valid_time) in required_set
            and eligible_target(target_by_id[part_id], baltic)
            and (part_id, valid_time)
                not in current_attempted_by_source[
                    SOURCE_ORDER_PREREQUISITE_SOURCE
                ]
        ):
            raise CopernicusSourceStageError(
                "IN_PROGRESS AMM15 evidence lacks its exact Baltic prerequisite"
            )
    shadow_acquisition_ids = {
        row["acquisitionId"] for row in shadow.get("acquisitions") or []
    }
    if any(
        attempt["parsedRecordCount"] > 0
        and attempt["acquisitionId"] not in shadow_acquisition_ids
        for attempt in attempts
    ):
        raise CopernicusSourceStageError(
            "A positive IN_PROGRESS attempt is absent from the bound shadow"
        )
    if stage.get("sourceStageId") != _source_stage_id(stage):
        raise CopernicusSourceStageError(
            "Copernicus source-stage progress identity mismatch"
        )
    _assert_no_vector_or_coordinate_fields(stage)
    return stage


def validate_source_stage_progress(
    document: Any,
    *,
    registry: dict[str, Any],
    shadow: dict[str, Any],
    target_identities: dict[str, dict[str, Any]],
    shadow_sha256: str,
) -> dict[str, Any]:
    """Public strict validator for loaded or independently supplied files."""
    return _validate_source_stage_progress(
        document,
        registry=registry,
        shadow=shadow,
        target_identities=target_identities,
        shadow_sha256=shadow_sha256,
        shadow_prevalidated=False,
    )


def validate_reusable_source_stage(
    document: Any,
    *,
    registry: dict[str, Any],
    shadow: dict[str, Any],
    target_identities: dict[str, dict[str, Any]],
    shadow_sha256: str,
    allow_rebase: bool = False,
) -> dict[str, Any]:
    """Validate either terminal READY evidence or resumable IN_PROGRESS evidence."""
    if allow_rebase:
        try:
            return validate_reusable_source_stage(
                document, registry=registry, shadow=shadow,
                target_identities=target_identities, shadow_sha256=shadow_sha256,
            )
        except (KeyError, TypeError, ValueError, RuntimeError):
            return rebase_source_stage_progress(
                document, registry=registry, shadow=shadow,
                target_identities=target_identities, shadow_sha256=shadow_sha256,
            )
    status = document.get("status") if isinstance(document, dict) else None
    if status == SOURCE_STAGE_STATUS:
        return validate_source_stage(
            document,
            registry=registry,
            shadow=shadow,
            target_identities=target_identities,
            shadow_sha256=shadow_sha256,
        )
    if status == SOURCE_STAGE_PROGRESS_STATUS:
        return validate_source_stage_progress(
            document,
            registry=registry,
            shadow=shadow,
            target_identities=target_identities,
            shadow_sha256=shadow_sha256,
        )
    raise CopernicusSourceStageError(
        "Copernicus source-stage status is neither READY nor IN_PROGRESS"
    )


def rebase_source_stage_progress(
    document: Any,
    *,
    registry: dict[str, Any],
    shadow: dict[str, Any],
    target_identities: dict[str, dict[str, Any]],
    shadow_sha256: str,
) -> dict[str, Any]:
    """Rebuild today's negative projection without expiring positive tuples."""
    registry = validate_target_registry(registry)
    targets = sorted(target_identities.values(), key=lambda row: (row["parentZoneId"], row["partId"]))
    positive, original_attempts = original_stage_positive_evidence(
        document, shadow=shadow, targets=targets, shadow_sha256=shadow_sha256,
    )
    if document.get("dmiVerifierContractId") != registry["dmiVerifierContractId"]:
        raise CopernicusSourceStageError("Original source verifier binding differs")
    reference = _time(registry["productionReferenceAt"], "New reference", exact_hour=True)
    original_reference = _time(document["productionReferenceAt"], "Original reference", exact_hour=True)
    if reference < original_reference:
        raise CopernicusSourceStageError("Source journal cannot rebase backwards")
    current_pairs = {(row["partId"], row["validTime"]) for row in registry["operationalRequiredPairs"]}
    acquisition_ids = {row["acquisitionId"] for row in shadow["acquisitions"]}
    retained = [attempt for attempt in original_attempts if
        any((pair["partId"], pair["validTime"]) in current_pairs for pair in attempt["requestedPairs"])
        and 0 <= (reference - _time(attempt["productionReferenceAt"], "Attempt reference")).total_seconds()
            <= FUTURE_ACQUISITION_FRESHNESS_HOURS * 3600
        and abs((reference - _time(attempt["acquisitionAt"], "Attempt acquisition")).total_seconds())
            <= FUTURE_ACQUISITION_FRESHNESS_HOURS * 3600
        and (attempt["parsedRecordCount"] == 0 or attempt["acquisitionId"] in acquisition_ids)]
    # A current AMM15 retry/exhaustion claim still needs current Baltic work.
    # Positive certificates above survive independently of this short journal.
    baltic = next(row for row in PINNED_PRODUCTS if row["source"] == SOURCE_ORDER_PREREQUISITE_SOURCE)
    baltic_pairs = {(pair["partId"], pair["validTime"], attempt["productionReferenceAt"])
                    for attempt in retained if attempt["source"] == SOURCE_ORDER_PREREQUISITE_SOURCE
                    for pair in attempt["requestedPairs"]}
    retained = [attempt for attempt in retained if attempt["source"] != SOURCE_ORDER_SELECTED_SOURCE
        or all((pair["partId"], pair["validTime"]) not in current_pairs
               or not eligible_target(target_identities[pair["partId"]], baltic)
               or (pair["partId"], pair["validTime"], attempt["productionReferenceAt"]) in baltic_pairs
               for pair in attempt["requestedPairs"])]
    return build_source_stage_progress(
        registry=registry, shadow=shadow, target_identities=target_identities,
        shadow_sha256=shadow_sha256, attempts=retained, updated_at=reference,
        **stage_positive_evidence(positive),
    )


def validate_source_stage(
    document: Any,
    *,
    registry: dict[str, Any],
    shadow: dict[str, Any],
    target_identities: dict[str, dict[str, Any]],
    shadow_sha256: str,
) -> dict[str, Any]:
    stage = _exact_dict(document, SOURCE_STAGE_FIELDS, "Copernicus source stage")
    registry = validate_target_registry(registry)
    if registry.get("schemaVersion") != 3:
        raise CopernicusSourceStageError("Source-stage READY is only valid for schema-3 operation")
    if not valid_sha256(shadow_sha256):
        raise CopernicusSourceStageError("Copernicus shadow file identity is invalid")
    targets = sorted(target_identities.values(), key=lambda row: (row["parentZoneId"], row["partId"]))
    if target_fingerprint(targets) != registry["targetRegistrySha256"]:
        raise CopernicusSourceStageError("Current central targets do not match the source-stage registry")
    validate_shadow(shadow, target_identities, require_collection=False)
    _validate_stage_positive(stage, shadow, targets)
    reference = _time(registry["productionReferenceAt"], "Registry reference", exact_hour=True)
    required_pairs = _canonical_pairs(registry["operationalRequiredPairs"], "Operational required pairs")
    required_set = {(row["partId"], row["validTime"]) for row in required_pairs}
    attempts = _validate_attempts(
        stage.get("attempts"),
        reference=reference,
        required_set=required_set,
        targets=targets,
        acquisitions=shadow["acquisitions"],
    )
    if stage.get("attemptsSha256") != canonical_sha256(attempts):
        raise CopernicusSourceStageError("Copernicus source-stage attempt hash mismatch")
    record_refs, missing_pairs, excluded_refs = select_source_order_admissible_records(
        required_pairs,
        list(shadow.get("acquisitions") or []),
        list(shadow.get("records") or []),
        reference,
        targets,
        attempts,
        **stage_positive_evidence(stage),
    )
    if (
        stage.get("schemaVersion") != SOURCE_STAGE_SCHEMA_VERSION
        or stage.get("kind") != SOURCE_STAGE_KIND
        or stage.get("contractId") != SOURCE_STAGE_CONTRACT_ID
        or stage.get("status") != SOURCE_STAGE_STATUS
        or stage.get("scoreImpact") is not False
        or stage.get("publicRuntime") is not False
        or stage.get("coordinatesIncluded") is not False
        or stage.get("rawVectorsIncluded") is not False
    ):
        raise CopernicusSourceStageError("Copernicus source-stage top-level contract is invalid")
    sealed_at = _time(stage.get("sealedAt"), "Source-stage seal time")
    if abs((sealed_at - reference).total_seconds()) > FUTURE_ACQUISITION_FRESHNESS_HOURS * 3600:
        raise CopernicusSourceStageError("Copernicus source-stage seal is stale")
    expected_bindings = {
        "productionReferenceAt": registry["productionReferenceAt"],
        "targetRegistrySha256": registry["targetRegistrySha256"],
        "dmiCurrentInputSha256": registry["dmiCurrentInputSha256"],
        "dmiVerifierContractId": registry["dmiVerifierContractId"],
        "requiredPairCount": len(required_pairs),
        "requiredPairsSha256": required_pairs_sha256(required_pairs),
        "selectedRecordRefCount": len(record_refs),
        "selectedRecordRefsSha256": canonical_sha256(record_refs),
        "missingPairs": missing_pairs,
        "missingPairCount": len(missing_pairs),
        "missingPairsSha256": required_pairs_sha256(missing_pairs),
        "excludedRecordRefCount": len(excluded_refs),
        "excludedRecordRefsSha256": canonical_sha256(excluded_refs),
        "shadowSha256": shadow_sha256,
    }
    if any(stage.get(key) != value for key, value in expected_bindings.items()):
        raise CopernicusSourceStageError("Copernicus source-stage registry/cache binding is invalid")
    if excluded_refs:
        raise CopernicusSourceStageError(
            "Copernicus source-stage READY cannot retain source-order exclusions"
        )
    product_by_source = {row["source"]: row for row in PINNED_PRODUCTS}
    expected_products = _derive_products(required_pairs, targets, attempts)
    if stage.get("products") != expected_products or stage.get("productsSha256") != canonical_sha256(expected_products):
        raise CopernicusSourceStageError("Copernicus source-stage product evidence mismatch")
    expected_source_order_evidence = _source_order_evidence(
        record_refs,
        targets,
        attempts,
        reference,
        stage["positiveAdmissions"],
    )
    source_order_evidence = stage.get("sourceOrderEvidence")
    if not isinstance(source_order_evidence, list):
        raise CopernicusSourceStageError(
            "Copernicus source-order evidence is malformed"
        )
    for raw in source_order_evidence:
        evidence = _exact_dict(
            raw,
            SOURCE_ORDER_EVIDENCE_FIELDS,
            "Copernicus source-order evidence row",
        )
        identity = {
            key: value for key, value in evidence.items()
            if key != "evidenceSha256"
        }
        if evidence.get("evidenceSha256") != canonical_sha256(identity):
            raise CopernicusSourceStageError(
                "Copernicus source-order evidence identity mismatch"
            )
    if (
        source_order_evidence != expected_source_order_evidence
        or stage.get("sourceOrderEvidenceCount")
            != len(expected_source_order_evidence)
        or stage.get("sourceOrderEvidenceSha256")
            != canonical_sha256(expected_source_order_evidence)
    ):
        raise CopernicusSourceStageError(
            "Copernicus AMM15 prerequisite evidence mismatch"
        )
    attempted_by_source = {
        source: {
            (pair["partId"], pair["validTime"])
            for attempt in attempts
            if attempt["source"] == source
            and attempt["productionReferenceAt"] == utc_iso(reference)
            for pair in attempt["requestedPairs"]
        }
        for source in product_by_source
    }
    target_by_id = {str(row["partId"]): row for row in targets}
    for pair in missing_pairs:
        key = (pair["partId"], pair["validTime"])
        applicable = [
            product for product in PINNED_PRODUCTS
            if eligible_target(target_by_id[pair["partId"]], product)
        ]
        if not applicable or any(key not in attempted_by_source[product["source"]] for product in applicable):
            raise CopernicusSourceStageError(
                "A remaining Copernicus pair lacks a complete attempt for every applicable pinned product"
            )
    if stage.get("sourceStageId") != _source_stage_id(stage):
        raise CopernicusSourceStageError("Copernicus source-stage identity mismatch")
    _assert_no_vector_or_coordinate_fields(stage)
    return stage


def build_source_stage(
    *,
    registry: dict[str, Any],
    shadow: dict[str, Any],
    target_identities: dict[str, dict[str, Any]],
    shadow_sha256: str,
    attempts: list[dict[str, Any]],
    sealed_at: datetime,
    positive_admissions: list[dict[str, Any]] | None = None,
    admission_attempts: list[dict[str, Any]] | None = None,
) -> dict[str, Any]:
    registry = validate_target_registry(registry)
    reference = _time(registry["productionReferenceAt"], "Registry reference", exact_hour=True)
    required_pairs = registry["operationalRequiredPairs"]
    canonical_attempts = sorted(
        attempts,
        key=lambda row: (
            next(index for index, product in enumerate(PINNED_PRODUCTS) if product["source"] == row["source"]),
            row["shardId"],
            row["productionReferenceAt"], row["acquisitionAt"], row["attemptId"],
        ),
    )
    targets = sorted(target_identities.values(), key=lambda row: (row["parentZoneId"], row["partId"]))
    positive = merge_positive_admissions(
        records=shadow["records"], acquisitions=shadow["acquisitions"], targets=targets,
        attempts=canonical_attempts, positive_admissions=positive_admissions,
        admission_attempts=admission_attempts,
    )
    positive = project_positive_evidence(positive, required_pairs)
    record_refs, missing_pairs, excluded_refs = select_source_order_admissible_records(
        required_pairs,
        list(shadow.get("acquisitions") or []),
        list(shadow.get("records") or []),
        reference,
        targets,
        canonical_attempts,
        **stage_positive_evidence(positive),
    )
    products = _derive_products(required_pairs, targets, canonical_attempts)
    source_order_evidence = _source_order_evidence(
        record_refs,
        targets,
        canonical_attempts,
        reference,
        positive["positiveAdmissions"],
    )
    value: dict[str, Any] = {
        "schemaVersion": SOURCE_STAGE_SCHEMA_VERSION,
        "kind": SOURCE_STAGE_KIND,
        "contractId": SOURCE_STAGE_CONTRACT_ID,
        "status": SOURCE_STAGE_STATUS,
        **positive,
        "sealedAt": utc_iso(sealed_at),
        "productionReferenceAt": registry["productionReferenceAt"],
        "targetRegistrySha256": registry["targetRegistrySha256"],
        "dmiCurrentInputSha256": registry["dmiCurrentInputSha256"],
        "dmiVerifierContractId": registry["dmiVerifierContractId"],
        "requiredPairCount": len(required_pairs),
        "requiredPairsSha256": required_pairs_sha256(required_pairs),
        "selectedRecordRefCount": len(record_refs),
        "selectedRecordRefsSha256": canonical_sha256(record_refs),
        "missingPairs": missing_pairs,
        "missingPairCount": len(missing_pairs),
        "missingPairsSha256": required_pairs_sha256(missing_pairs),
        "excludedRecordRefCount": len(excluded_refs),
        "excludedRecordRefsSha256": canonical_sha256(excluded_refs),
        "attempts": canonical_attempts,
        "attemptsSha256": canonical_sha256(canonical_attempts),
        "products": products,
        "productsSha256": canonical_sha256(products),
        "sourceOrderEvidence": source_order_evidence,
        "sourceOrderEvidenceCount": len(source_order_evidence),
        "sourceOrderEvidenceSha256": canonical_sha256(source_order_evidence),
        "shadowSha256": shadow_sha256,
        "scoreImpact": False,
        "publicRuntime": False,
        "coordinatesIncluded": False,
        "rawVectorsIncluded": False,
    }
    value["sourceStageId"] = _source_stage_id(value)
    return validate_source_stage(
        value,
        registry=registry,
        shadow=shadow,
        target_identities=target_identities,
        shadow_sha256=shadow_sha256,
    )


def _build_source_stage_progress(
    *,
    registry: dict[str, Any],
    shadow: dict[str, Any],
    target_identities: dict[str, dict[str, Any]],
    shadow_sha256: str,
    attempts: list[dict[str, Any]],
    updated_at: datetime,
    positive_admissions: list[dict[str, Any]] | None = None,
    admission_attempts: list[dict[str, Any]] | None = None,
    shadow_prevalidated: bool,
) -> tuple[
    dict[str, Any],
    list[dict[str, Any]],
    list[dict[str, Any]],
    list[dict[str, Any]],
]:
    """Build resumable private evidence, including a bound zero-attempt start."""
    registry = validate_target_registry(registry)
    reference = _time(
        registry["productionReferenceAt"],
        "Registry reference",
        exact_hour=True,
    )
    required_pairs = registry["operationalRequiredPairs"]
    source_rank = {row["source"]: index for index, row in enumerate(PINNED_PRODUCTS)}
    try:
        canonical_attempts = sorted(
            attempts,
            key=lambda row: (source_rank[row["source"]], row["shardId"],
                             row["productionReferenceAt"], row["acquisitionAt"], row["attemptId"]),
        )
    except (KeyError, TypeError) as error:
        raise CopernicusSourceStageError(
            "Copernicus source-stage progress contains an unknown attempt"
        ) from error
    targets = sorted(
        target_identities.values(),
        key=lambda row: (row["parentZoneId"], row["partId"]),
    )
    positive = merge_positive_admissions(
        records=shadow["records"], acquisitions=shadow["acquisitions"], targets=targets,
        attempts=canonical_attempts, positive_admissions=positive_admissions,
        admission_attempts=admission_attempts,
    )
    positive = project_positive_evidence(positive, required_pairs)
    record_refs, missing_pairs, excluded_refs = select_source_order_admissible_records(
        required_pairs,
        list(shadow.get("acquisitions") or []),
        list(shadow.get("records") or []),
        reference,
        targets,
        canonical_attempts,
        **stage_positive_evidence(positive),
    )
    value: dict[str, Any] = {
        "schemaVersion": SOURCE_STAGE_PROGRESS_SCHEMA_VERSION,
        "kind": SOURCE_STAGE_KIND,
        "contractId": SOURCE_STAGE_PROGRESS_CONTRACT_ID,
        "status": SOURCE_STAGE_PROGRESS_STATUS,
        **positive,
        "updatedAt": utc_iso(updated_at),
        "productionReferenceAt": registry["productionReferenceAt"],
        "targetRegistrySha256": registry["targetRegistrySha256"],
        "dmiCurrentInputSha256": registry["dmiCurrentInputSha256"],
        "dmiVerifierContractId": registry["dmiVerifierContractId"],
        "requiredPairCount": len(required_pairs),
        "requiredPairsSha256": required_pairs_sha256(required_pairs),
        "selectedRecordRefCount": len(record_refs),
        "selectedRecordRefsSha256": canonical_sha256(record_refs),
        "missingPairCount": len(missing_pairs),
        "missingPairsSha256": required_pairs_sha256(missing_pairs),
        "excludedRecordRefCount": len(excluded_refs),
        "excludedRecordRefsSha256": canonical_sha256(excluded_refs),
        "attempts": canonical_attempts,
        "attemptsSha256": canonical_sha256(canonical_attempts),
        "shadowSha256": shadow_sha256,
        "scoreImpact": False,
        "publicRuntime": False,
        "coordinatesIncluded": False,
        "rawVectorsIncluded": False,
    }
    value["sourceStageId"] = _source_stage_id(value)
    validated = _validate_source_stage_progress(
        value,
        registry=registry,
        shadow=shadow,
        target_identities=target_identities,
        shadow_sha256=shadow_sha256,
        shadow_prevalidated=shadow_prevalidated,
    )
    return validated, record_refs, missing_pairs, excluded_refs


def build_source_stage_progress(
    *,
    registry: dict[str, Any],
    shadow: dict[str, Any],
    target_identities: dict[str, dict[str, Any]],
    shadow_sha256: str,
    attempts: list[dict[str, Any]],
    updated_at: datetime,
    positive_admissions: list[dict[str, Any]] | None = None,
    admission_attempts: list[dict[str, Any]] | None = None,
) -> dict[str, Any]:
    """Public strict builder for callers without a prepared shadow token."""
    document, _, _, _ = _build_source_stage_progress(
        registry=registry,
        shadow=shadow,
        target_identities=target_identities,
        shadow_sha256=shadow_sha256,
        attempts=attempts,
        updated_at=updated_at,
        positive_admissions=positive_admissions,
        admission_attempts=admission_attempts,
        shadow_prevalidated=False,
    )
    return document


def build_source_stage_progress_values(
    *,
    registry: dict[str, Any],
    shadow: dict[str, Any],
    target_identities: dict[str, dict[str, Any]],
    shadow_sha256: str,
    attempts: list[dict[str, Any]],
    updated_at: datetime,
    positive_admissions: list[dict[str, Any]] | None = None,
    admission_attempts: list[dict[str, Any]] | None = None,
) -> tuple[
    dict[str, Any],
    list[dict[str, Any]],
    list[dict[str, Any]],
    list[dict[str, Any]],
]:
    """Strict build plus its already-computed source-order partition."""
    return _build_source_stage_progress(
        registry=registry,
        shadow=shadow,
        target_identities=target_identities,
        shadow_sha256=shadow_sha256,
        attempts=attempts,
        updated_at=updated_at,
        positive_admissions=positive_admissions,
        admission_attempts=admission_attempts,
        shadow_prevalidated=False,
    )


def _build_source_stage_progress_from_validated_shadow(
    *,
    registry: dict[str, Any],
    shadow: dict[str, Any],
    target_identities: dict[str, dict[str, Any]],
    shadow_sha256: str,
    attempts: list[dict[str, Any]],
    updated_at: datetime,
    positive_admissions: list[dict[str, Any]] | None = None,
    admission_attempts: list[dict[str, Any]] | None = None,
) -> tuple[
    dict[str, Any],
    list[dict[str, Any]],
    list[dict[str, Any]],
    list[dict[str, Any]],
]:
    """Internal build for the exact shadow already validated this transaction."""
    return _build_source_stage_progress(
        registry=registry,
        shadow=shadow,
        target_identities=target_identities,
        shadow_sha256=shadow_sha256,
        attempts=attempts,
        updated_at=updated_at,
        positive_admissions=positive_admissions,
        admission_attempts=admission_attempts,
        shadow_prevalidated=True,
    )


def atomic_write_source_stage_progress(
    path: Path,
    document: dict[str, Any],
    *,
    registry: dict[str, Any],
    shadow: dict[str, Any],
    target_identities: dict[str, dict[str, Any]],
    shadow_sha256: str,
) -> dict[str, Any]:
    validated = validate_source_stage_progress(
        document,
        registry=registry,
        shadow=shadow,
        target_identities=target_identities,
        shadow_sha256=shadow_sha256,
    )
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary = path.with_name(path.name + ".tmp")
    try:
        with temporary.open("w", encoding="utf-8", newline="\n") as handle:
            handle.write(
                json.dumps(
                    validated,
                    ensure_ascii=False,
                    indent=2,
                    allow_nan=False,
                ) + "\n"
            )
            handle.flush()
            os.fsync(handle.fileno())
        round_trip = json.loads(temporary.read_text(encoding="utf-8"))
        validate_source_stage_progress(
            round_trip,
            registry=registry,
            shadow=shadow,
            target_identities=target_identities,
            shadow_sha256=shadow_sha256,
        )
        os.replace(temporary, path)
    finally:
        if temporary.exists():
            temporary.unlink()
    return validated


def atomic_write_source_stage(
    path: Path,
    document: dict[str, Any],
    *,
    registry: dict[str, Any],
    shadow: dict[str, Any],
    target_identities: dict[str, dict[str, Any]],
    shadow_sha256: str,
) -> dict[str, Any]:
    validated = validate_source_stage(
        document,
        registry=registry,
        shadow=shadow,
        target_identities=target_identities,
        shadow_sha256=shadow_sha256,
    )
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary = path.with_name(path.name + ".tmp")
    try:
        with temporary.open("w", encoding="utf-8", newline="\n") as handle:
            handle.write(json.dumps(validated, ensure_ascii=False, indent=2, allow_nan=False) + "\n")
            handle.flush()
            os.fsync(handle.fileno())
        round_trip = json.loads(temporary.read_text(encoding="utf-8"))
        validate_source_stage(
            round_trip,
            registry=registry,
            shadow=shadow,
            target_identities=target_identities,
            shadow_sha256=shadow_sha256,
        )
        os.replace(temporary, path)
    finally:
        if temporary.exists():
            temporary.unlink()
    return validated


def safe_source_stage_summary(document: dict[str, Any]) -> dict[str, Any]:
    """Counts and hashes only; no target identities, coordinates or vectors."""
    products = document.get("products", [])
    source_order_evidence = document.get("sourceOrderEvidence", [])
    summary = {
        "sourceStageReady": document["status"] == SOURCE_STAGE_STATUS,
        "targetRegistrySha256": document["targetRegistrySha256"],
        "dmiCurrentInputSha256": document["dmiCurrentInputSha256"],
        "requiredPairCount": document["requiredPairCount"],
        "requiredPairsSha256": document["requiredPairsSha256"],
        "selectedRecordRefCount": document["selectedRecordRefCount"],
        "selectedRecordRefsSha256": document["selectedRecordRefsSha256"],
        "missingPairCount": document["missingPairCount"],
        "missingPairsSha256": document["missingPairsSha256"],
        "excludedRecordRefCount": document["excludedRecordRefCount"],
        "excludedRecordRefsSha256": document["excludedRecordRefsSha256"],
        "attemptCount": len(document["attempts"]),
        "attemptsSha256": document["attemptsSha256"],
        "productCount": len(products),
        "productAttemptSummaries": [
            {
                "productOrdinal": index,
                "domainRequiredPairCount": row["domainRequiredPairCount"],
                "domainRequiredPairsSha256": row["domainRequiredPairsSha256"],
                "attemptedPairCount": row["attemptedPairCount"],
                "attemptedPairsSha256": row["attemptedPairsSha256"],
                "successfulAttemptCount": row["successfulAttemptCount"],
                "successfulAttemptsSha256": row["successfulAttemptsSha256"],
            }
            for index, row in enumerate(products, start=1)
        ],
        "productsSha256": canonical_sha256(products),
        "sourceOrderEvidenceCount": len(source_order_evidence),
        "sourceOrderEvidenceSha256": canonical_sha256(source_order_evidence),
        "positiveAdmissionCount": len(document.get("positiveAdmissions", [])),
        "sourceOrderAttemptedExhaustedCount": sum(
            row["disposition"] == SOURCE_ORDER_ATTEMPTED_EXHAUSTED
            for row in source_order_evidence
        ),
        "sourceOrderNotApplicableCount": sum(
            row["disposition"] == SOURCE_ORDER_NOT_APPLICABLE
            for row in source_order_evidence
        ),
        "sourceOrderOriginalPrerequisiteCount": sum(
            row["disposition"] == SOURCE_ORDER_ORIGINAL_PREREQUISITE
            for row in source_order_evidence
        ),
        "shadowSha256": document["shadowSha256"],
        "coordinatesIncluded": False,
        "rawVectorsIncluded": False,
    }
    _assert_no_vector_or_coordinate_fields(summary)
    return summary


def _assert_no_vector_or_coordinate_fields(value: Any) -> None:
    forbidden = {"waterpoint", "samplingpoint", "gridpoint", "longitude", "latitude", "umps", "vmps", "u", "v"}
    if isinstance(value, dict):
        if any(str(key).lower() in forbidden for key in value):
            raise CopernicusSourceStageError("Coordinate or raw-vector field reached source-stage evidence")
        for item in value.values():
            _assert_no_vector_or_coordinate_fields(item)
    elif isinstance(value, list):
        for item in value:
            _assert_no_vector_or_coordinate_fields(item)
