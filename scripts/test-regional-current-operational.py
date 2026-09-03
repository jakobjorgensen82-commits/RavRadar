#!/usr/bin/env python3
"""Targeted synthetic tests for standalone regional DMI 118h evidence."""
from __future__ import annotations

from copy import deepcopy
from datetime import datetime, timedelta, timezone
import json
import math
from unittest.mock import patch

from lib.copernicus_target_identity import target_fingerprint
from lib.dmi_native_provenance import current_source_asset_sha256
from lib import regional_current_operational as evidence


REFERENCE = datetime(2026, 1, 1, 0, tzinfo=timezone.utc)


def need(condition: bool, message: str) -> None:
    if not condition:
        raise AssertionError(message)


def iso(offset: int) -> str:
    return (REFERENCE + timedelta(hours=offset)).strftime("%Y-%m-%dT%H:00:00Z")


def haversine_km(first: list[float], second: list[float]) -> float:
    lon1, lat1, lon2, lat2 = map(math.radians, (*first, *second))
    delta_lat = lat2 - lat1
    delta_lon = lon2 - lon1
    term = (
        math.sin(delta_lat / 2.0) ** 2
        + math.cos(lat1) * math.cos(lat2) * math.sin(delta_lon / 2.0) ** 2
    )
    return 6371.0088 * 2.0 * math.atan2(
        math.sqrt(term), math.sqrt(max(0.0, 1.0 - term))
    )


def source_asset(valid_offset: int) -> dict[str, object]:
    marker = f"{valid_offset % 16:x}"
    return {
        "collection": "dkss_lf",
        "modelRun": iso(0),
        "validTime": iso(valid_offset),
        "itemId": f"synthetic-asset-{valid_offset}",
        "assetIdentitySha256": marker * 64,
        "assetSizeBytes": 2048 + valid_offset,
        "acquiredAt": iso(0),
        "contentLengthBytes": 2048 + valid_offset,
        "contentSha256": ("f" if marker == "0" else marker) * 64,
        "itemCreatedAt": iso(0),
        "itemUpdatedAt": iso(0),
    }


def sample(part_index: int, valid_offset: int, source: dict[str, object]) -> dict[str, object]:
    target = [12.0 + part_index * 0.01, 56.0]
    grid = [target[0] + 0.1, target[1]]
    source_sha256 = current_source_asset_sha256(source)
    return {
        "sampleKey": (
            f"dkss_lf|{source['modelRun']}|{source['validTime']}|{source_sha256}"
        ),
        "capturedAt": iso(0),
        "collection": "dkss_lf",
        "modelRun": source["modelRun"],
        "validTime": source["validTime"],
        "sourceAssetSha256": source_sha256,
        "gridPoint": grid,
        "distanceKm": round(haversine_km(target, grid), 5),
        "layers": {
            "surface": None,
            "topAvailable": {
                "verticalLayer": "depth:synthetic",
                "verticalLayerRankM": 4.0,
                "uMps": 0.12,
                "vMps": -0.07,
            },
            "middle": None,
            "bottom": {
                "verticalLayer": "depth:synthetic",
                "verticalLayerRankM": 4.0,
                "uMps": 0.12,
                "vMps": -0.07,
            },
        },
        "availableLayerCount": 1,
    }


def fixture() -> dict[str, object]:
    targets: list[dict[str, object]] = []
    policy_parts: list[dict[str, object]] = []
    anchors: dict[str, dict[str, object]] = {}
    source_zero = source_asset(0)
    source_tail = source_asset(117)
    for index in range(8):
        part_id = f"SYNTHETIC-PART-{index:02d}"
        parent_id = f"SYNTHETIC-ZONE-{index:02d}"
        point = [12.0 + index * 0.01, 56.0]
        targets.append({
            "partId": part_id,
            "parentZoneId": parent_id,
            "name": f"Synthetic {index}",
            "waterPoint": list(point),
        })
        policy_parts.append({
            "partId": part_id,
            "name": f"Synthetic {index}",
            "approvedSamplingPoint": list(point),
            "auditDistanceKm": 8.0,
        })
        chosen_source = source_tail if index == 7 else source_zero
        chosen_offset = 117 if index == 7 else 0
        anchors[f"REGIONAL_PROXY::{part_id}"] = {
            "partId": part_id,
            "parentZoneId": parent_id,
            "name": f"Synthetic {index}",
            "bandKm": 0.0,
            "targetPoint": list(point),
            "sourceWaterPoint": list(point),
            "researchClass": "owner-approved-regional-proxy",
            "regionalProxyCandidate": True,
            "requiredCollection": "dkss_lf",
            "maximumDistanceKm": 15.0,
            "sameConnectedWaterBody": "Limfjorden",
            "scoreImpact": False,
            "publicRuntime": False,
            "samples": [sample(index, chosen_offset, chosen_source)],
        }

    policy = {
        "schemaVersion": 1,
        "status": "private-collection-enabled-public-activation-gated",
        "decidedAt": "2026-01-01T00:00:00Z",
        "regularMaximumDistanceKm": 5,
        "regionalProxyMaximumDistanceKm": 15,
        "selectionRule": "nearest-exact-shared-uv-column-then-deepest-common-layer",
        "requiredCollection": "dkss_lf",
        "sameConnectedWaterBody": "Limfjorden",
        "interpolation": False,
        "globalOverrideAllowed": False,
        "scoreImpact": False,
        "publicRuntime": False,
        "controlledLivePilotAllowed": True,
        "rawRetentionHours": 168,
        "supportReportRawVectors": False,
        "activationRequires": [
            "fresh-dmi-and-copernicus-pilot",
            "same-time-cell-layer-provenance",
            "full-project-validation",
            "release-gate",
            "fresh-production-workflow",
        ],
        "parts": policy_parts,
    }
    gaps = [
        {"partId": "SYNTHETIC-PART-00", "validTime": iso(offset)}
        for offset in range(5)
    ]
    gaps.extend(
        {"partId": f"SYNTHETIC-PART-{index:02d}", "validTime": iso(0)}
        for index in range(1, 7)
    )
    gaps.append({"partId": "SYNTHETIC-PART-07", "validTime": iso(117)})
    ledger = {
        "schemaVersion": 5,
        "contractId": "synthetic-dmi-operational-ledger-v5",
        "productionReferenceAt": iso(0),
        "operationalRangeEndAt": iso(117),
        "operationalComplementPairs": deepcopy(gaps),
        "collections": [{
            "collection": "dkss_lf",
            "modelRun": iso(0),
            "validTimes": [
                {"validTime": iso(0), "state": "VERIFIED", "sourceAsset": source_zero},
                {"validTime": iso(117), "state": "VERIFIED", "sourceAsset": source_tail},
            ],
        }],
    }
    return {
        "policy": policy,
        "targets": targets,
        "current_shadow": {
            "schemaVersion": 1,
            "retentionHours": 168,
            "scoreImpact": False,
            "publicRuntime": False,
            "anchors": anchors,
        },
        "dmi_ledger": ledger,
        "dmi_attestation": {"contractId": "synthetic-attestation"},
        "locked_reference": iso(0),
        "dmi_gap_pairs": gaps,
    }


def invoke(bundle: dict[str, object]) -> dict[str, dict[str, object]]:
    ledger = bundle["dmi_ledger"]

    def validate(*args: object) -> object:
        need(args[0] is ledger, "Core must validate the exact supplied ledger")
        need(args[1] is bundle["dmi_attestation"], "Core must validate the exact attestation")
        need(args[2] is bundle["targets"], "Core must validate the exact target registry")
        need(args[3] == iso(0) and args[4] == iso(117), "Core must validate offsets 0 through 117")
        need(args[5] == target_fingerprint(bundle["targets"]), "Core must bind the target registry hash")
        return ledger

    with patch.object(evidence, "validate_current_operational_ledger", side_effect=validate) as validator:
        result = evidence.build_regional_current_operational_evidence(**bundle)
    need(validator.call_count == 1, "Official ledger/attestation validation must run exactly once")
    return result


def expect_error(
    bundle: dict[str, object],
    code: str,
) -> evidence.RegionalCurrentOperationalError:
    ledger = bundle["dmi_ledger"]
    with patch.object(evidence, "validate_current_operational_ledger", return_value=ledger):
        try:
            evidence.build_regional_current_operational_evidence(**bundle)
        except evidence.RegionalCurrentOperationalError as error:
            need(error.code == code, "Fail-closed error code changed")
            need(str(error) == code, "Rendered errors must contain only the safe code")
            return error
    raise AssertionError("Expected the regional evidence core to fail closed")


def expect_projection_error(private_proof: dict[str, object]) -> None:
    try:
        evidence.safe_regional_current_operational_projection(private_proof)
    except evidence.RegionalCurrentOperationalError as error:
        need(error.code == "PRIVATE_PROOF_INVALID", "Stored proof tamper must fail closed")
        need(str(error) == error.code, "Stored proof errors must remain privacy-safe")
        return
    raise AssertionError("Expected stored private proof tamper to fail closed")


def test_native_hold_missing_offsets_and_privacy() -> None:
    bundle = fixture()
    result = invoke(bundle)
    private = result["privateProof"]
    safe = result["safeProjection"]
    need(private["operationalHourCount"] == 118, "Operational axis must contain 118 hours")
    need(private["productionReferenceAt"] == iso(0), "Offset zero must be bound")
    need(private["operationalRangeEndAt"] == iso(117), "Offset 117 must be bound")
    need(private["configuredPartCount"] == 8, "Policy must bind exactly eight parts")
    need(private["fallbackEligiblePairCount"] == 12, "Every requested gap needs one disposition")
    need(private["regionalNativePairCount"] == 8, "Exact native disposition count changed")
    need(private["regionalDerivedHoldPairCount"] == 3, "Only ages one through three may hold")
    need(private["missingPairCount"] == 1, "Age four must remain missing")
    need(private["status"] == "REGIONAL_EVIDENCE_INCOMPLETE", "Any missing pair must keep evidence incomplete")

    refs = private["pairRefs"]
    by_key = {(row["partId"], row["validTime"]): row for row in refs}
    for offset in (1, 2, 3):
        held = by_key[("SYNTHETIC-PART-00", iso(offset))]
        need(held["classification"] == evidence.REGIONAL_DMI_DERIVED_HOLD, "Bounded hold classification changed")
        need(held["holdAgeHours"] == offset, "Hold must point causally to the native source")
        need(held["sourceValidTime"] == iso(0), "Hold may not use a future sample")
    need(by_key[("SYNTHETIC-PART-00", iso(4))]["classification"] == evidence.MISSING, "Four-hour hold must fail closed")
    need(by_key[("SYNTHETIC-PART-07", iso(117))]["classification"] == evidence.REGIONAL_DMI_NATIVE, "Tail offset must accept exact native evidence")

    need(set(safe) == evidence.SAFE_PROJECTION_FIELDS, "Safe projection must have an exact allowlist")
    need(safe["combinedSealRequired"] is True, "Standalone evidence must never replace the combined seal")
    safe_text = json.dumps(safe, sort_keys=True)
    private_text = json.dumps(private, sort_keys=True)
    for index in range(8):
        need(f"SYNTHETIC-PART-{index:02d}" not in safe_text, "Safe projection exposed a part identity")
        need(f"SYNTHETIC-ZONE-{index:02d}" not in safe_text, "Safe projection exposed a parent identity")
    for forbidden_key in (
        "pairRefs",
        "sourceAssetSha256",
        "sourceModelRun",
        "sourceValidTime",
        "targetPoint",
        "gridPoint",
        "approvedSamplingPoint",
        "uMps",
        "vMps",
    ):
        need(f'"{forbidden_key}":' not in safe_text, "Safe projection exposed a private field")
    for forbidden_key in ("targetPoint", "gridPoint", "uMps", "vMps"):
        need(f'"{forbidden_key}":' not in private_text, "Private pair refs must not copy points or raw vectors")


def test_policy_target_source_and_shadow_tamper_fail_closed() -> None:
    wrong_count = fixture()
    wrong_count["policy"]["parts"].pop()
    expect_error(wrong_count, "POLICY_SCOPE_INVALID")

    moved_policy = fixture()
    moved_policy["policy"]["parts"][0]["approvedSamplingPoint"][0] += 0.0001
    expect_error(moved_policy, "POLICY_TARGET_BINDING_INVALID")

    moved_anchor = fixture()
    moved_anchor["current_shadow"]["anchors"]["REGIONAL_PROXY::SYNTHETIC-PART-00"]["targetPoint"][0] += 0.0001
    expect_error(moved_anchor, "SHADOW_TARGET_BINDING_INVALID")

    missing_hash = fixture()
    missing_hash["current_shadow"]["anchors"]["REGIONAL_PROXY::SYNTHETIC-PART-00"]["samples"][0].pop("sourceAssetSha256")
    error = expect_error(missing_hash, "SHADOW_SOURCE_ASSET_HASH_MISSING")
    need(error.required_hook == evidence.REQUIRED_SOURCE_ASSET_HOOK, "Missing source hash must name the exact later producer hook")

    changed_hash = fixture()
    changed_sample = changed_hash["current_shadow"]["anchors"]["REGIONAL_PROXY::SYNTHETIC-PART-00"]["samples"][0]
    changed_sample["sourceAssetSha256"] = "sha256:" + "a" * 64
    changed_sample["sampleKey"] = (
        f"dkss_lf|{iso(0)}|{iso(0)}|{changed_sample['sourceAssetSha256']}"
    )
    expect_error(changed_hash, "SHADOW_SOURCE_ASSET_HASH_MISMATCH")

    changed_ledger_asset = fixture()
    changed_ledger_asset["dmi_ledger"]["collections"][0]["validTimes"][0]["sourceAsset"]["contentSha256"] = "c" * 64
    expect_error(changed_ledger_asset, "SHADOW_SOURCE_ASSET_HASH_MISMATCH")

    revised_asset = fixture()
    revised_source = deepcopy(
        revised_asset["dmi_ledger"]["collections"][0]["validTimes"][0]["sourceAsset"]
    )
    revised_source["contentSha256"] = "c" * 64
    revised_asset["dmi_ledger"]["collections"][0]["validTimes"][0]["sourceAsset"] = revised_source
    for index in range(7):
        revised_asset["current_shadow"]["anchors"][f"REGIONAL_PROXY::SYNTHETIC-PART-{index:02d}"]["samples"].append(
            sample(index, 0, revised_source)
        )
    revised_result = invoke(revised_asset)
    need(
        revised_result["privateProof"]["regionalNativePairCount"] == 8,
        "A ledger-selected byte revision must supersede its older shadow sample",
    )

    invalid_vector = fixture()
    invalid_vector["current_shadow"]["anchors"]["REGIONAL_PROXY::SYNTHETIC-PART-00"]["samples"][0]["layers"]["bottom"]["uMps"] = math.nan
    expect_error(invalid_vector, "SHADOW_VECTOR_PROOF_INVALID")

    wrong_phase = fixture()
    phase_sample = wrong_phase["current_shadow"]["anchors"]["REGIONAL_PROXY::SYNTHETIC-PART-00"]["samples"][0]
    phase_sample["modelRun"] = iso(-1)
    phase_sample["sampleKey"] = (
        f"dkss_lf|{iso(-1)}|{iso(0)}|{phase_sample['sourceAssetSha256']}"
    )
    expect_error(wrong_phase, "SHADOW_NATIVE_CADENCE_INVALID")


def test_gap_domain_is_exact_bounded_and_ledger_bound() -> None:
    before_start = fixture()
    extra = {"partId": "SYNTHETIC-PART-00", "validTime": iso(-1)}
    before_start["dmi_gap_pairs"].append(extra)
    before_start["dmi_ledger"]["operationalComplementPairs"].append(deepcopy(extra))
    expect_error(before_start, "DMI_GAP_OFFSET_INVALID")

    after_end = fixture()
    extra = {"partId": "SYNTHETIC-PART-00", "validTime": iso(118)}
    after_end["dmi_gap_pairs"].append(extra)
    after_end["dmi_ledger"]["operationalComplementPairs"].append(deepcopy(extra))
    expect_error(after_end, "DMI_GAP_OFFSET_INVALID")

    duplicate = fixture()
    duplicate["dmi_gap_pairs"].append(deepcopy(duplicate["dmi_gap_pairs"][0]))
    expect_error(duplicate, "DMI_GAP_DUPLICATE")

    outside_policy = fixture()
    extra = {"partId": "SYNTHETIC-NOT-APPROVED", "validTime": iso(0)}
    outside_policy["dmi_gap_pairs"].append(extra)
    outside_policy["dmi_ledger"]["operationalComplementPairs"].append(deepcopy(extra))
    expect_error(outside_policy, "DMI_GAP_NOT_FALLBACK_ELIGIBLE")

    not_a_dmi_gap = fixture()
    not_a_dmi_gap["dmi_ledger"]["operationalComplementPairs"].pop(0)
    expect_error(not_a_dmi_gap, "DMI_GAP_NOT_FALLBACK_ELIGIBLE")


def test_future_samples_vector_commitment_and_stored_proof_tamper() -> None:
    future_only = fixture()
    future_source = source_asset(3)
    future_only["current_shadow"]["anchors"]["REGIONAL_PROXY::SYNTHETIC-PART-00"]["samples"] = [
        sample(0, 3, future_source)
    ]
    future_only["dmi_ledger"]["collections"][0]["validTimes"].append({
        "validTime": iso(3),
        "state": "VERIFIED",
        "sourceAsset": future_source,
    })
    single_gap = {"partId": "SYNTHETIC-PART-00", "validTime": iso(0)}
    future_only["dmi_gap_pairs"] = [single_gap]
    future_only["dmi_ledger"]["operationalComplementPairs"] = [deepcopy(single_gap)]
    future_result = invoke(future_only)
    need(
        future_result["privateProof"]["pairRefs"][0]["classification"] == evidence.MISSING,
        "A future native sample must never seed an earlier hold",
    )

    baseline = invoke(fixture())
    changed_vector = fixture()
    changed_vector["current_shadow"]["anchors"]["REGIONAL_PROXY::SYNTHETIC-PART-00"]["samples"][0]["layers"]["bottom"]["uMps"] = 0.13
    changed_result = invoke(changed_vector)
    baseline_ref = next(
        row for row in baseline["privateProof"]["pairRefs"]
        if row["partId"] == "SYNTHETIC-PART-00" and row["validTime"] == iso(0)
    )
    changed_ref = next(
        row for row in changed_result["privateProof"]["pairRefs"]
        if row["partId"] == "SYNTHETIC-PART-00" and row["validTime"] == iso(0)
    )
    need(
        baseline_ref["sourceProofSha256"] != changed_ref["sourceProofSha256"],
        "Finite vector tamper must change the private source commitment",
    )
    need(
        baseline["safeProjection"]["pairRefsSha256"]
        != changed_result["safeProjection"]["pairRefsSha256"],
        "Finite vector tamper must change the safe aggregate commitment",
    )

    count_tamper = deepcopy(baseline["privateProof"])
    count_tamper["configuredPartCount"] = 999
    expect_projection_error(count_tamper)
    causal_tamper = deepcopy(baseline["privateProof"])
    held = next(
        row for row in causal_tamper["pairRefs"]
        if row["classification"] == evidence.REGIONAL_DMI_DERIVED_HOLD
    )
    held["holdAgeHours"] = 4
    expect_projection_error(causal_tamper)

    rejected_attestation = fixture()
    with patch.object(
        evidence,
        "validate_current_operational_ledger",
        side_effect=ValueError("synthetic private validator detail"),
    ):
        try:
            evidence.build_regional_current_operational_evidence(**rejected_attestation)
        except evidence.RegionalCurrentOperationalError as error:
            need(error.code == "LEDGER_ATTESTATION_INVALID", "Official attestation rejection must fail closed")
            need(str(error) == error.code, "Official validator details must not leak")
        else:
            raise AssertionError("Expected official ledger/attestation rejection")


def main() -> None:
    test_native_hold_missing_offsets_and_privacy()
    test_policy_target_source_and_shadow_tamper_fail_closed()
    test_gap_domain_is_exact_bounded_and_ledger_bound()
    test_future_samples_vector_commitment_and_stored_proof_tamper()
    print("OK: standalone regional DMI 118h evidence is bounded, hash-bound, and privacy-safe")


if __name__ == "__main__":
    main()
