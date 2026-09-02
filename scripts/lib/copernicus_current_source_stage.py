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
    REQUEST_CONTRACT_ID,
    SELECTION_POLICY_ID,
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


SOURCE_STAGE_SCHEMA_VERSION = 2
SOURCE_STAGE_KIND = "RAVRADAR_PRIVATE_COPERNICUS_CURRENT_SOURCE_STAGE"
SOURCE_STAGE_CONTRACT_ID = "copernicus-current-source-stage-ready-v2"
SOURCE_STAGE_STATUS = "READY"
SOURCE_ORDER_SELECTED_SOURCE = "copernicus-nws-amm15"
SOURCE_ORDER_PREREQUISITE_SOURCE = "copernicus-baltic-nemo"
SOURCE_ORDER_ATTEMPTED_EXHAUSTED = "ATTEMPTED_EXHAUSTED"
SOURCE_ORDER_NOT_APPLICABLE = "NOT_APPLICABLE"
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

ATTEMPT_FIELDS = {
    "attemptId", "status", "productionReferenceAt", "acquisitionAt",
    "source", "productId", "datasetId", "datasetVersion",
    "requestContractId", "selectionPolicyId", "spatialShardPolicyId",
    "shardId", "requestStartAt", "requestEndAt", "targetPartIds",
    "requestedPairs", "requestedPairCount", "requestedPairsSha256",
    "subsetSha256", "acquisitionId", "parsedRecordCount",
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
    "attempts", "attemptsSha256", "products", "productsSha256",
    "sourceOrderEvidence", "sourceOrderEvidenceCount",
    "sourceOrderEvidenceSha256",
    "shadowSha256", "scoreImpact", "publicRuntime",
    "coordinatesIncluded", "rawVectorsIncluded",
}
PAIR_FIELDS = {"partId", "validTime"}
SOURCE_ORDER_EVIDENCE_FIELDS = {
    "partId", "validTime", "selectedSource", "prerequisiteSource",
    "disposition", "attemptId", "evidenceSha256",
}


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
) -> dict[str, Any]:
    pairs = sorted(requested_pairs, key=lambda row: (row["validTime"], row["partId"]))
    pairs = _canonical_pairs(pairs, "Attempt requested pairs")
    if not pairs:
        raise CopernicusSourceStageError("A completed source attempt cannot be empty")
    start = pairs[0]["validTime"]
    end = pairs[-1]["validTime"]
    value: dict[str, Any] = {
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
) -> dict[str, Any]:
    attempt = _exact_dict(raw, ATTEMPT_FIELDS, "Copernicus source attempt")
    contract = _product_contract(product)
    if attempt.get("status") != "COMPLETE" or any(attempt.get(key) != value for key, value in contract.items()):
        raise CopernicusSourceStageError("Copernicus source attempt contract is not pinned")
    if utc_iso(_time(attempt.get("productionReferenceAt"), "Attempt reference", exact_hour=True)) != utc_iso(reference):
        raise CopernicusSourceStageError("Copernicus source attempt reference mismatch")
    acquisition_at = _time(attempt.get("acquisitionAt"), "Attempt acquisition time")
    if abs((acquisition_at - reference).total_seconds()) > FUTURE_ACQUISITION_FRESHNESS_HOURS * 3600:
        raise CopernicusSourceStageError("Copernicus source attempt is stale")
    pairs = _canonical_pairs(attempt.get("requestedPairs"), "Attempt requested pairs")
    if not pairs:
        raise CopernicusSourceStageError("Copernicus source attempt is empty")
    pair_set = {(row["partId"], row["validTime"]) for row in pairs}
    if not pair_set.issubset(required_set):
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
    rebuilt_acquisition = make_acquisition(
        source=product["source"],
        acquisition_at=acquisition_at,
        request_start_at=_time(attempt["requestStartAt"], "Attempt request start", exact_hour=True),
        request_end_at=_time(attempt["requestEndAt"], "Attempt request end", exact_hour=True),
        targets=[target_by_id[part_id] for part_id in target_ids],
        native_valid_times=sorted({
            _time(row["validTime"], "Attempt native time", exact_hour=True) for row in pairs
        }),
        subset_sha256=attempt["subsetSha256"],
        record_count=parsed_count,
        request_contract_id=REQUEST_CONTRACT_ID,
    )
    if attempt["acquisitionId"] != rebuilt_acquisition["acquisitionId"]:
        raise CopernicusSourceStageError("Copernicus source attempt acquisition identity mismatch")
    expected_id = canonical_sha256({key: value for key, value in attempt.items() if key != "attemptId"})
    if attempt.get("attemptId") != expected_id:
        raise CopernicusSourceStageError("Copernicus source attempt identity mismatch")
    return attempt


def _derive_products(
    required_pairs: list[dict[str, str]],
    targets: list[dict[str, Any]],
    attempts: list[dict[str, Any]],
) -> list[dict[str, Any]]:
    rows: list[dict[str, Any]] = []
    for product in PINNED_PRODUCTS:
        eligible_ids = {str(row["partId"]) for row in targets if eligible_target(row, product)}
        domain_pairs = [row for row in required_pairs if row["partId"] in eligible_ids]
        source_attempts = [row for row in attempts if row["source"] == product["source"]]
        attempted_pairs = sorted(
            [pair for attempt in source_attempts for pair in attempt["requestedPairs"]],
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
) -> list[dict[str, Any]]:
    """Prove the Baltic prerequisite for every selected AMM15 pair.

    An in-domain pair needs one completed Baltic attempt and no selected
    Baltic record.  An out-of-domain pair gets an explicit NOT_APPLICABLE
    disposition derived only from the pinned Baltic domain; a timeout or
    failed request can never produce that disposition.
    """
    target_by_id = {str(row["partId"]): row for row in targets}
    product_by_source = {row["source"]: row for row in PINNED_PRODUCTS}
    baltic = next(
        row for row in PINNED_PRODUCTS
        if row["source"] == SOURCE_ORDER_PREREQUISITE_SOURCE
    )
    attempt_by_pair: dict[tuple[str, str], str] = {}
    for attempt in attempts:
        if attempt.get("source") != SOURCE_ORDER_PREREQUISITE_SOURCE:
            continue
        for pair in attempt.get("requestedPairs") or []:
            key = (str(pair.get("partId") or ""), str(pair.get("validTime") or ""))
            if key in attempt_by_pair:
                raise CopernicusSourceStageError(
                    "A Baltic pair has more than one prerequisite attempt"
                )
            attempt_by_pair[key] = str(attempt.get("attemptId") or "")

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
        attempt_id = attempt_by_pair.get((part_id, valid_time))
        if eligible_target(target, baltic):
            if not valid_sha256(attempt_id):
                raise CopernicusSourceStageError(
                    "An in-domain AMM15 pair lacks a completed Baltic prerequisite attempt"
                )
            disposition = SOURCE_ORDER_ATTEMPTED_EXHAUSTED
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
        }
        evidence.append({
            **identity,
            "evidenceSha256": canonical_sha256(identity),
        })
    return evidence


def _source_stage_id(document: dict[str, Any]) -> str:
    return canonical_sha256({key: value for key, value in document.items() if key != "sourceStageId"})


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
    reference = _time(registry["productionReferenceAt"], "Registry reference", exact_hour=True)
    required_pairs = _canonical_pairs(registry["operationalRequiredPairs"], "Operational required pairs")
    required_set = {(row["partId"], row["validTime"]) for row in required_pairs}
    record_refs, missing_pairs = select_required_records(
        required_pairs,
        list(shadow.get("acquisitions") or []),
        list(shadow.get("records") or []),
        reference,
    )
    missing_pairs = sorted(missing_pairs, key=lambda row: (row["validTime"], row["partId"]))
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
        "shadowSha256": shadow_sha256,
    }
    if any(stage.get(key) != value for key, value in expected_bindings.items()):
        raise CopernicusSourceStageError("Copernicus source-stage registry/cache binding is invalid")
    attempts_raw = stage.get("attempts")
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
        ))
    source_rank = {row["source"]: index for index, row in enumerate(PINNED_PRODUCTS)}
    canonical_attempts = sorted(attempts, key=lambda row: (source_rank[row["source"]], row["shardId"]))
    if attempts != canonical_attempts or len({row["attemptId"] for row in attempts}) != len(attempts):
        raise CopernicusSourceStageError("Copernicus source-stage attempts are not canonical and unique")
    if stage.get("attemptsSha256") != canonical_sha256(attempts):
        raise CopernicusSourceStageError("Copernicus source-stage attempt hash mismatch")
    expected_products = _derive_products(required_pairs, targets, attempts)
    if stage.get("products") != expected_products or stage.get("productsSha256") != canonical_sha256(expected_products):
        raise CopernicusSourceStageError("Copernicus source-stage product evidence mismatch")
    expected_source_order_evidence = _source_order_evidence(
        record_refs,
        targets,
        attempts,
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
            for attempt in attempts if attempt["source"] == source
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
) -> dict[str, Any]:
    registry = validate_target_registry(registry)
    reference = _time(registry["productionReferenceAt"], "Registry reference", exact_hour=True)
    required_pairs = registry["operationalRequiredPairs"]
    record_refs, missing_pairs = select_required_records(
        required_pairs,
        list(shadow.get("acquisitions") or []),
        list(shadow.get("records") or []),
        reference,
    )
    canonical_attempts = sorted(
        attempts,
        key=lambda row: (
            next(index for index, product in enumerate(PINNED_PRODUCTS) if product["source"] == row["source"]),
            row["shardId"],
        ),
    )
    targets = sorted(target_identities.values(), key=lambda row: (row["parentZoneId"], row["partId"]))
    products = _derive_products(required_pairs, targets, canonical_attempts)
    source_order_evidence = _source_order_evidence(
        record_refs,
        targets,
        canonical_attempts,
    )
    value: dict[str, Any] = {
        "schemaVersion": SOURCE_STAGE_SCHEMA_VERSION,
        "kind": SOURCE_STAGE_KIND,
        "contractId": SOURCE_STAGE_CONTRACT_ID,
        "status": SOURCE_STAGE_STATUS,
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
        "attemptCount": len(document["attempts"]),
        "attemptsSha256": document["attemptsSha256"],
        "productCount": len(document["products"]),
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
            for index, row in enumerate(document["products"], start=1)
        ],
        "productsSha256": document["productsSha256"],
        "sourceOrderEvidenceCount": document["sourceOrderEvidenceCount"],
        "sourceOrderEvidenceSha256": document["sourceOrderEvidenceSha256"],
        "sourceOrderAttemptedExhaustedCount": sum(
            row["disposition"] == SOURCE_ORDER_ATTEMPTED_EXHAUSTED
            for row in document["sourceOrderEvidence"]
        ),
        "sourceOrderNotApplicableCount": sum(
            row["disposition"] == SOURCE_ORDER_NOT_APPLICABLE
            for row in document["sourceOrderEvidence"]
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
