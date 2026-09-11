#!/usr/bin/env python3
"""Targeted synthetic tests for standalone regional DMI 118h evidence."""
from __future__ import annotations

from copy import deepcopy
from datetime import datetime, timedelta, timezone
import importlib.util
import json
import math
from pathlib import Path
import sys
import types
import tempfile
from unittest.mock import patch

from lib.copernicus_target_identity import target_fingerprint
from lib.current_operational_closure import build_regional_residual_plan
from lib.dmi_native_provenance import (
    build_current_part_outcome_proof,
    build_retained_current_asset_proof,
    current_attestation_authorization_from_operational_ledger,
    current_source_asset_sha256,
    validate_current_operational_availability_ledger,
)
from lib import regional_current_operational as evidence
from lib.current_field_shadow import prune, save_document, load_document, record_profiles
from lib.regional_source_proofs import (
    FIELD, SAMPLE_REF, capture_regional_source_proof,
    migrate_regional_source_proofs,
)


REFERENCE = datetime(2026, 1, 1, 0, tzinfo=timezone.utc)
ROOT = Path(__file__).resolve().parents[1]


def load_script_module(name: str, path: Path) -> object:
    spec = importlib.util.spec_from_file_location(name, path)
    assert spec and spec.loader
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


eccodes = types.ModuleType("eccodes")
eccodes.OutOfAreaError = type("OutOfAreaError", (Exception,), {})
for eccodes_name in (
    "codes_get", "codes_get_array", "codes_get_elements",
    "codes_grib_find_nearest", "codes_grib_new_from_file", "codes_release",
):
    setattr(eccodes, eccodes_name, lambda *args, **kwargs: None)
sys.modules["eccodes"] = eccodes
producer = load_script_module(
    "ravradar_update_dmi_bulk_for_regional_test",
    ROOT / "scripts/update-dmi-bulk.py",
)
registry_builder = load_script_module(
    "ravradar_copernicus_registry_for_regional_test",
    ROOT / "scripts/build-copernicus-target-registry.py",
)


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

    with patch.object(
        evidence,
        "validate_current_operational_availability_ledger",
        side_effect=validate,
    ) as validator:
        result = evidence.build_regional_current_operational_evidence(**bundle)
    need(validator.call_count == 1, "Official ledger/attestation validation must run exactly once")
    return result


def expect_error(
    bundle: dict[str, object],
    code: str,
) -> evidence.RegionalCurrentOperationalError:
    ledger = bundle["dmi_ledger"]
    with patch.object(
        evidence,
        "validate_current_operational_availability_ledger",
        return_value=ledger,
    ):
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

    moved_runtime_target = fixture()
    moved_runtime_target["targets"][0]["waterPoint"][0] += 0.0001
    expect_error(moved_runtime_target, "POLICY_TARGET_BINDING_INVALID")
    ledger = moved_runtime_target["dmi_ledger"]
    with patch.object(
        evidence,
        "validate_current_operational_availability_ledger",
        return_value=ledger,
    ):
        fallback_result = evidence.build_regional_current_operational_evidence(
            **moved_runtime_target,
            allow_target_rebinding_as_missing=True,
        )
    moved_refs = [
        row for row in fallback_result["privateProof"]["pairRefs"]
        if row["partId"] == "SYNTHETIC-PART-00"
    ]
    need(len(moved_refs) == 5, "Every moved-target gap needs a disposition")
    need(
        all(row["classification"] == evidence.MISSING for row in moved_refs),
        "A centrally moved target must bypass stale regional evidence",
    )

    moved_anchor = fixture()
    moved_anchor["current_shadow"]["anchors"]["REGIONAL_PROXY::SYNTHETIC-PART-00"]["targetPoint"][0] += 0.0001
    moved_anchor_result = invoke(moved_anchor)
    need(
        all(
            row["classification"] == evidence.MISSING
            for row in moved_anchor_result["privateProof"]["pairRefs"]
            if row["partId"] == "SYNTHETIC-PART-00"
        ),
        "A stale optional regional anchor must be quarantined to MISSING",
    )

    missing_hash = fixture()
    missing_hash["current_shadow"]["anchors"]["REGIONAL_PROXY::SYNTHETIC-PART-00"]["samples"][0].pop("sourceAssetSha256")
    missing_hash_result = invoke(missing_hash)
    need(
        missing_hash_result["shadowDiagnostics"]["quarantineCodes"].get(
            "SHADOW_SOURCE_ASSET_HASH_MISSING"
        ) == 1,
        "A missing optional sample hash must be diagnosed without stopping fallback",
    )

    changed_hash = fixture()
    changed_sample = changed_hash["current_shadow"]["anchors"]["REGIONAL_PROXY::SYNTHETIC-PART-00"]["samples"][0]
    changed_sample["sourceAssetSha256"] = "sha256:" + "a" * 64
    changed_sample["sampleKey"] = (
        f"dkss_lf|{iso(0)}|{iso(0)}|{changed_sample['sourceAssetSha256']}"
    )
    changed_hash_result = invoke(changed_hash)
    need(
        changed_hash_result["shadowDiagnostics"]["quarantineCodes"].get(
            "SHADOW_SOURCE_ASSET_HASH_MISMATCH"
        ) == 1,
        "An unauthorized optional sample must be quarantined",
    )

    pre_target_hold = fixture()
    pre_target_run = iso(-8)
    for ledger_row in pre_target_hold["dmi_ledger"]["collections"][0]["validTimes"]:
        ledger_row["sourceAsset"]["modelRun"] = pre_target_run
    pre_target_hold["dmi_ledger"]["collections"][0]["modelRun"] = pre_target_run
    pre_target_source = source_asset(-2)
    pre_target_source["modelRun"] = pre_target_run
    pre_target_hold["current_shadow"]["anchors"][
        "REGIONAL_PROXY::SYNTHETIC-PART-00"
    ]["samples"] = [sample(0, -2, pre_target_source)]
    pre_target_result = invoke(pre_target_hold)
    need(
        pre_target_result["privateProof"]["pairRefs"][0]["classification"]
            == evidence.MISSING
        and pre_target_result["shadowDiagnostics"]["quarantineCodes"].get(
            "SHADOW_SOURCE_ASSET_HASH_MISMATCH"
        ) == 1,
        "A target-minus-two hold sample outside the ledger may not block Open-Meteo",
    )

    changed_ledger_asset = fixture()
    changed_ledger_asset["dmi_ledger"]["collections"][0]["validTimes"][0]["sourceAsset"]["contentSha256"] = "c" * 64
    changed_ledger_result = invoke(changed_ledger_asset)
    need(
        all(
            row["classification"] == evidence.MISSING
            for row in changed_ledger_result["privateProof"]["pairRefs"]
            if row["partId"] != "SYNTHETIC-PART-07"
        ),
        "A revised source may never admit old shadow bytes",
    )

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

    stale_previous_run = fixture()
    stale_source = source_asset(0)
    stale_source["modelRun"] = iso(-6)
    stale_previous_run["current_shadow"]["anchors"][
        "REGIONAL_PROXY::SYNTHETIC-PART-00"
    ]["samples"] = [sample(0, 0, stale_source)]
    stale_result = invoke(stale_previous_run)
    stale_refs = [
        row for row in stale_result["privateProof"]["pairRefs"]
        if row["partId"] == "SYNTHETIC-PART-00"
    ]
    need(
        len(stale_refs) == 5
        and all(row["classification"] == evidence.MISSING for row in stale_refs),
        "A retained prior-run sample must remain unavailable without blocking fallback",
    )

    retained_previous_run = fixture()
    retained_selected_row = next(
        row
        for row in retained_previous_run["dmi_ledger"]["collections"][0][
            "validTimes"
        ]
        if row["validTime"] == iso(0)
    )
    retained_selected_row.update({
        "state": "LOCALLY_SKIPPED",
        "sourceAsset": None,
    })
    retained_source = source_asset(0)
    retained_source["modelRun"] = iso(-6)
    retained_previous_run["current_shadow"]["anchors"][
        "REGIONAL_PROXY::SYNTHETIC-PART-00"
    ]["samples"] = [sample(0, 0, retained_source)]
    retained_previous_run["dmi_ledger"]["retainedCurrentAssetProofs"] = [{
        "sourceAsset": retained_source,
        "attestedPartIds": ["SYNTHETIC-PART-00"],
    }]
    retained_result = invoke(retained_previous_run)
    retained_refs = [
        row for row in retained_result["privateProof"]["pairRefs"]
        if row["partId"] == "SYNTHETIC-PART-00"
    ]
    need(
        retained_refs[0]["classification"] == evidence.REGIONAL_DMI_NATIVE
        and all(
            row["classification"] == evidence.REGIONAL_DMI_DERIVED_HOLD
            for row in retained_refs[1:4]
        )
        and retained_refs[4]["classification"] == evidence.MISSING,
        "An exact retained proof may authorize bounded rows when the newer tuple is unavailable",
    )

    retained_during_catalog_outage = fixture()
    outage_collection = retained_during_catalog_outage["dmi_ledger"][
        "collections"
    ][0]
    outage_collection["modelRun"] = None
    for row in outage_collection["validTimes"]:
        row.update({
            "state": "LOCALLY_SKIPPED",
            "sourceAsset": None,
        })
    retained_outage_source = source_asset(0)
    retained_outage_source["modelRun"] = iso(-6)
    retained_during_catalog_outage["current_shadow"]["anchors"][
        "REGIONAL_PROXY::SYNTHETIC-PART-00"
    ]["samples"] = [sample(0, 0, retained_outage_source)]
    retained_during_catalog_outage["dmi_ledger"][
        "retainedCurrentAssetProofs"
    ] = [{
        "sourceAsset": retained_outage_source,
        "attestedPartIds": ["SYNTHETIC-PART-00"],
    }]
    retained_outage_result = invoke(retained_during_catalog_outage)
    retained_outage_refs = [
        row for row in retained_outage_result["privateProof"]["pairRefs"]
        if row["partId"] == "SYNTHETIC-PART-00"
    ]
    need(
        retained_outage_refs[0]["classification"] == evidence.REGIONAL_DMI_NATIVE
        and all(
            row["classification"] == evidence.REGIONAL_DMI_DERIVED_HOLD
            for row in retained_outage_refs[1:4]
        )
        and retained_outage_refs[4]["classification"] == evidence.MISSING,
        "A null selected run must preserve exact retained old-run authorization",
    )

    invalid_vector = fixture()
    invalid_vector["current_shadow"]["anchors"]["REGIONAL_PROXY::SYNTHETIC-PART-00"]["samples"][0]["layers"]["bottom"]["uMps"] = math.nan
    invalid_vector_result = invoke(invalid_vector)
    need(
        invalid_vector_result["shadowDiagnostics"]["quarantineCodes"].get(
            "SHADOW_VECTOR_PROOF_INVALID"
        ) == 1,
        "An invalid optional vector must be quarantined rather than admitted",
    )

    invalid_shadow = fixture()
    invalid_shadow["current_shadow"] = {"schemaVersion": 999}
    invalid_shadow_result = invoke(invalid_shadow)
    need(
        invalid_shadow_result["shadowDiagnostics"]["shadowHeaderQuarantined"] is True
        and invalid_shadow_result["privateProof"]["missingPairCount"]
            == invalid_shadow_result["privateProof"]["fallbackEligiblePairCount"],
        "An invalid optional shadow envelope must yield an all-MISSING regional proof",
    )

    stale_wrong_phase = fixture()
    stale_phase_sample = stale_wrong_phase["current_shadow"]["anchors"]["REGIONAL_PROXY::SYNTHETIC-PART-00"]["samples"][0]
    stale_phase_sample["modelRun"] = iso(-1)
    stale_phase_sample["sampleKey"] = (
        f"dkss_lf|{iso(-1)}|{iso(0)}|{stale_phase_sample['sourceAssetSha256']}"
    )
    stale_phase_result = invoke(stale_wrong_phase)
    stale_phase_refs = [
        row for row in stale_phase_result["privateProof"]["pairRefs"]
        if row["partId"] == "SYNTHETIC-PART-00"
    ]
    need(
        all(row["classification"] == evidence.MISSING for row in stale_phase_refs),
        "A retained prior-run sample with obsolete cadence must not block fallback",
    )

    irrelevant_history = fixture()
    irrelevant_sample = irrelevant_history["current_shadow"]["anchors"]["REGIONAL_PROXY::SYNTHETIC-PART-00"]["samples"][0]
    irrelevant_sample["validTime"] = iso(-48)
    irrelevant_sample["modelRun"] = "not-a-current-run"
    irrelevant_result = invoke(irrelevant_history)
    irrelevant_refs = [
        row for row in irrelevant_result["privateProof"]["pairRefs"]
        if row["partId"] == "SYNTHETIC-PART-00"
    ]
    need(
        all(row["classification"] == evidence.MISSING for row in irrelevant_refs),
        "History outside every current hold candidate must remain irrelevant",
    )

    selected_off_phase = fixture()
    selected_off_phase_source = source_asset(1)
    selected_off_phase["current_shadow"]["anchors"][
        "REGIONAL_PROXY::SYNTHETIC-PART-00"
    ]["samples"] = [sample(0, 1, selected_off_phase_source)]
    selected_off_phase["dmi_ledger"]["collections"][0]["validTimes"].append({
        "validTime": iso(1),
        "state": "VERIFIED",
        "sourceAsset": selected_off_phase_source,
    })
    selected_off_phase_result = invoke(selected_off_phase)
    selected_off_phase_refs = [
        row for row in selected_off_phase_result["privateProof"]["pairRefs"]
        if row["partId"] == "SYNTHETIC-PART-00"
    ]
    need(
        len(selected_off_phase_refs) == 5
        and all(
            row["classification"] == evidence.MISSING
            for row in selected_off_phase_refs
        ),
        "A fully bound selected-run off-phase sample must pass to fallback",
    )

    mismatched_off_phase = fixture()
    mismatched_off_phase_source = source_asset(1)
    mismatched_off_phase_sample = sample(0, 1, mismatched_off_phase_source)
    mismatched_off_phase_sample["sourceAssetSha256"] = "sha256:" + "a" * 64
    mismatched_off_phase_sample["sampleKey"] = (
        f"dkss_lf|{iso(0)}|{iso(1)}|"
        f"{mismatched_off_phase_sample['sourceAssetSha256']}"
    )
    mismatched_off_phase["current_shadow"]["anchors"][
        "REGIONAL_PROXY::SYNTHETIC-PART-00"
    ]["samples"] = [mismatched_off_phase_sample]
    mismatched_off_phase["dmi_ledger"]["collections"][0]["validTimes"].append({
        "validTime": iso(1),
        "state": "VERIFIED",
        "sourceAsset": mismatched_off_phase_source,
    })
    mismatched_off_phase_result = invoke(mismatched_off_phase)
    mismatched_off_phase_refs = [
        row for row in mismatched_off_phase_result["privateProof"]["pairRefs"]
        if row["partId"] == "SYNTHETIC-PART-00"
    ]
    need(
        len(mismatched_off_phase_refs) == 5
        and all(
            row["classification"] == evidence.MISSING
            for row in mismatched_off_phase_refs
        ),
        "An off-phase row cannot deny fallback through irrelevant deep proof",
    )

    malformed_selected_run = fixture()
    malformed_selected_run["current_shadow"]["anchors"][
        "REGIONAL_PROXY::SYNTHETIC-PART-00"
    ]["samples"][0]["modelRun"] = "2026-01-01T00:30:00Z"
    malformed_result = invoke(malformed_selected_run)
    need(
        malformed_result["shadowDiagnostics"]["quarantineCodes"].get(
            "SHADOW_SOURCE_BINDING_INVALID"
        ) == 1,
        "A malformed optional sample identity must be quarantined",
    )


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
        "validate_current_operational_availability_ledger",
        side_effect=ValueError("synthetic private validator detail"),
    ):
        try:
            evidence.build_regional_current_operational_evidence(**rejected_attestation)
        except evidence.RegionalCurrentOperationalError as error:
            need(error.code == "LEDGER_ATTESTATION_INVALID", "Official attestation rejection must fail closed")
            need(str(error) == error.code, "Official validator details must not leak")
        else:
            raise AssertionError("Expected official ledger/attestation rejection")


def test_null_run_catalog_outage_reaches_open_meteo_residual() -> None:
    bundle = fixture()
    targets = bundle["targets"]
    document = {
        "schemaVersion": 2,
        "generatedAt": iso(0),
        "zoneRegistrySignature": "regional-null-run-test",
        "zones": {},
        "runs": {},
        "collectionState": {},
        "diagnostics": {},
    }
    ledger = producer.build_current_operational_ledger(
        document,
        targets,
        REFERENCE,
        {},
    )
    need(
        all(
            row["modelRun"] is None
            and row["stateCounts"]["LOCALLY_SKIPPED"] == 118
            and all(
                valid_row["sourceAsset"] is None
                and valid_row["state"] not in {"PROCESSED", "VERIFIED"}
                for valid_row in row["validTimes"]
            )
            for row in ledger["collections"]
        ),
        "The real empty-catalog producer fixture must remain an honest null-run ledger",
    )
    allowed_sources, retained_sources = (
        current_attestation_authorization_from_operational_ledger(ledger)
    )
    attestation = producer.current_operational_attestation(
        document,
        targets,
        REFERENCE,
        allowed_sources,
        retained_sources,
    )
    validate_current_operational_availability_ledger(
        ledger,
        attestation,
        targets,
        iso(0),
        iso(117),
        target_fingerprint(targets),
    )
    document["diagnostics"]["currentOperationalLedger"] = ledger
    registry = registry_builder.build_registry(
        targets,
        document,
        REFERENCE,
        "a" * 64,
        full_coast=False,
    )
    gaps = registry["operationalRequiredPairs"]
    need(
        gaps == ledger["operationalComplementPairs"]
        and len(gaps) == len(targets) * 118,
        "The actual registry must seal every null-run DMI tuple as one exact gap",
    )
    plan = build_regional_residual_plan(
        residual_pairs=gaps,
        regional_policy=bundle["policy"],
        targets=targets,
        regional_shadow=bundle["current_shadow"],
        dmi_ledger=ledger,
        dmi_attestation=attestation,
        locked_reference=iso(0),
    )
    need(
        plan["regionalAssignments"] == []
        and plan["openMeteoRequiredPairs"] == gaps,
        "An honest null-run catalog outage must reach the exact Open-Meteo residual",
    )

    for label, mutate in (
        (
            "positive state",
            lambda row: row.update({"state": "PROCESSED", "sourceAsset": None}),
        ),
        (
            "source-bearing negative state",
            lambda row: row.update({"sourceAsset": {"unexpected": True}}),
        ),
    ):
        tampered = deepcopy(ledger)
        row = next(
            collection for collection in tampered["collections"]
            if collection["collection"] == evidence.REQUIRED_COLLECTION
        )["validTimes"][0]
        mutate(row)
        try:
            validate_current_operational_availability_ledger(
                tampered,
                attestation,
                targets,
                iso(0),
                iso(117),
                target_fingerprint(targets),
            )
        except ValueError:
            pass
        else:
            raise AssertionError(f"Official validation accepted null-run {label}")
        tampered_bundle = fixture()
        tampered_bundle["dmi_ledger"] = tampered
        expect_error(tampered_bundle, "DMI_LEDGER_SOURCE_INDEX_INVALID")


def original_regional_proof(bundle: dict, source: dict, signature: str = "regional-test-decoder") -> dict:
    target_ids = [row["partId"] for row in bundle["targets"]]
    return {
        "sourceAsset": source,
        "processingSignature": signature,
        "partOutcomeProof": build_current_part_outcome_proof(
            target_ids, target_ids, target_fingerprint(bundle["targets"]),
            signature, source,
        ),
    }


def real_outage_bundle() -> dict:
    """Real canonical ledger and attestation: no selected/native source remains."""
    bundle = fixture()
    document = {"schemaVersion": 2, "generatedAt": iso(0),
                "zoneRegistrySignature": "regional-retention-test", "zones": {},
                "runs": {}, "collectionState": {}, "diagnostics": {}}
    ledger = producer.build_current_operational_ledger(document, bundle["targets"], REFERENCE, {})
    allowed, retained = current_attestation_authorization_from_operational_ledger(ledger)
    attestation = producer.current_operational_attestation(
        document, bundle["targets"], REFERENCE, allowed, retained,
    )
    validate_current_operational_availability_ledger(
        ledger, attestation, bundle["targets"], iso(0), iso(117),
        target_fingerprint(bundle["targets"]),
    )
    bundle.update(dmi_ledger=ledger, dmi_attestation=attestation,
                  dmi_gap_pairs=ledger["operationalComplementPairs"])
    return bundle


def bind_fixture(bundle: dict) -> list[dict]:
    originals = [original_regional_proof(bundle, source_asset(offset)) for offset in (0, 117)]
    counts = migrate_regional_source_proofs(
        bundle["current_shadow"], policy=bundle["policy"], targets=bundle["targets"],
        original_proofs=originals,
    )
    need(counts["boundSamples"] == 8 and counts["invalidProofs"] == 0,
         "Original canonical outcomes must bind all eight synthetic samples")
    return originals


def test_durable_regional_proofs_survive_native_source_removal() -> None:
    bundle = real_outage_bundle()
    untouched_ledger = deepcopy(bundle["dmi_ledger"])
    untouched_attestation = deepcopy(bundle["dmi_attestation"])
    raw_result = evidence.build_regional_current_operational_evidence(**bundle)
    need(raw_result["safeProjection"]["regionalNativePairCount"] == 0,
         "Raw samples alone must not manufacture original source authority")
    originals = bind_fixture(bundle)
    result = evidence.build_regional_current_operational_evidence(**bundle)
    safe = result["safeProjection"]
    need(safe["regionalNativePairCount"] == 8 and safe["regionalDerivedHoldPairCount"] == 21
         and safe["missingPairCount"] == 915,
         "Original regional proofs survive complete removal of native source/selected run")
    need(bundle["dmi_ledger"] == untouched_ledger and bundle["dmi_attestation"] == untouched_attestation,
         "Regional proofs must never add native DMI attestation or coverage")
    original = originals[0]
    try:
        build_retained_current_asset_proof(
            original["sourceAsset"], original["processingSignature"], original["partOutcomeProof"],
            [bundle["targets"][0]["partId"]], [row["partId"] for row in bundle["targets"]],
            target_fingerprint(bundle["targets"]),
        )
    except ValueError:
        pass
    else:
        raise AssertionError("Spatially unavailable regional part became native-attested")
    plan = build_regional_residual_plan(
        residual_pairs=bundle["dmi_gap_pairs"], regional_policy=bundle["policy"],
        targets=bundle["targets"], regional_shadow=bundle["current_shadow"],
        dmi_ledger=bundle["dmi_ledger"], dmi_attestation=bundle["dmi_attestation"],
        locked_reference=iso(0),
    )
    need(len(plan["regionalAssignments"]) == 29 and len(plan["openMeteoRequiredPairs"]) == 915,
         "Regional admission and downstream OM partition must use identical proof authority")
    with tempfile.TemporaryDirectory() as temporary:
        path = Path(temporary) / "shadow.json"
        save_document(path, bundle["current_shadow"])
        loaded = load_document(path)
        need(loaded[FIELD] == bundle["current_shadow"][FIELD],
             "Atomic shadow roundtrip must preserve original proofs with samples")
        bundle["current_shadow"] = loaded
        need(evidence.build_regional_current_operational_evidence(**bundle)["safeProjection"] == safe,
             "Proof availability must survive independent cache reload")
    shadow = bundle["current_shadow"]
    source_count = len(shadow[FIELD]["sources"])
    prune(shadow, iso(1))
    need(len(shadow[FIELD]["sources"]) == source_count, "Native removal must not prune regional proofs")
    for key in list(shadow["anchors"]):
        if key != "REGIONAL_PROXY::SYNTHETIC-PART-07":
            shadow["anchors"].pop(key)
    prune(shadow, iso(1))
    need(len(shadow[FIELD]["sources"]) == 1 and len(shadow[FIELD]["bindings"]) == 1,
         "Only the last sample reference governs source-proof pruning")
    prune(shadow, iso(169))
    need(not shadow[FIELD]["sources"] and not shadow[FIELD]["bindings"],
         "Proofs expire with their final removed sample, not as orphaned authority")


def test_durable_regional_corruption_migration_and_recovery_are_leaf_scoped() -> None:
    baseline = real_outage_bundle()
    originals = bind_fixture(baseline)
    broken = deepcopy(baseline)
    sample_zero = broken["current_shadow"]["anchors"]["REGIONAL_PROXY::SYNTHETIC-PART-00"]["samples"][0]
    broken["current_shadow"][FIELD]["bindings"][sample_zero[SAMPLE_REF]]["sampleSha256"] = "sha256:" + "0" * 64
    result = evidence.build_regional_current_operational_evidence(**broken)
    need(result["safeProjection"]["missingPairCount"] == 919,
         "One invalid binding must lose only its exact sample and three hold hours")
    before_migration = deepcopy(broken["current_shadow"])
    migrate_regional_source_proofs(broken["current_shadow"], policy=broken["policy"],
                                  targets=broken["targets"], original_proofs=originals)
    need(broken["current_shadow"] == before_migration,
         "Migration must not resurrect a known invalid positive binding")
    selected = fixture()
    selected["current_shadow"] = deepcopy(broken["current_shadow"])
    selected_result = invoke(selected)
    need(all(row["classification"] == evidence.MISSING for row in selected_result["privateProof"]["pairRefs"]
             if row["partId"] == "SYNTHETIC-PART-00"),
         "Selected ledger fallback must not resurrect a known invalid sample proof")
    changed_vector = deepcopy(baseline)
    changed_vector["current_shadow"]["anchors"]["REGIONAL_PROXY::SYNTHETIC-PART-00"]["samples"][0]["layers"]["bottom"]["uMps"] += 0.1
    need(evidence.build_regional_current_operational_evidence(**changed_vector)["safeProjection"]["missingPairCount"] == 919,
         "Finite vector edits must invalidate their stored sample binding")
    malformed = deepcopy(baseline)
    malformed["current_shadow"][FIELD] = {"corrupt": "private-original"}
    before = deepcopy(malformed["current_shadow"])
    migrate_regional_source_proofs(malformed["current_shadow"], policy=malformed["policy"],
                                  targets=malformed["targets"], original_proofs=originals)
    need(malformed["current_shadow"] == before, "Migration cannot reset a malformed envelope")
    counts = capture_regional_source_proof(
        malformed["current_shadow"], policy=malformed["policy"], targets=malformed["targets"],
        source_asset=originals[0]["sourceAsset"], part_outcome_proof=originals[0]["partOutcomeProof"],
        processing_signature=originals[0]["processingSignature"],
    )
    need(counts["boundSamples"] == 7 and malformed["current_shadow"][FIELD]["quarantinedIndexes"] == [{"corrupt": "private-original"}],
         "Fresh validated EOF may recover only its samples while preserving original corrupt metadata")
    need(evidence.build_regional_current_operational_evidence(**malformed)["safeProjection"]["missingPairCount"] == 916,
         "Envelope recovery must not silently resurrect an unrelated old sample")
    rebound = real_outage_bundle()
    rebound["targets"][0]["waterPoint"][0] += 0.0001
    rebound_original = original_regional_proof(rebound, source_asset(0))
    counts = capture_regional_source_proof(
        rebound["current_shadow"], policy=rebound["policy"], targets=rebound["targets"],
        source_asset=rebound_original["sourceAsset"], part_outcome_proof=rebound_original["partOutcomeProof"],
        processing_signature=rebound_original["processingSignature"],
    )
    need(counts["boundSamples"] == 6, "Legitimate target rebinding must isolate the moved regional part")
    conflicting = real_outage_bundle()
    conflict_originals = [original_regional_proof(conflicting, source_asset(0), value) for value in ("decoder-one", "decoder-two")]
    migrate_regional_source_proofs(conflicting["current_shadow"], policy=conflicting["policy"],
                                  targets=conflicting["targets"], original_proofs=conflict_originals)
    selected_conflict = fixture()
    selected_conflict["current_shadow"] = conflicting["current_shadow"]
    need(invoke(selected_conflict)["safeProjection"]["regionalNativePairCount"] == 1,
         "Conflicting original decoder proofs must not choose the first or revive through the ledger")
    duplicate = real_outage_bundle()
    duplicate_rows = duplicate["current_shadow"]["anchors"]["REGIONAL_PROXY::SYNTHETIC-PART-00"]["samples"]
    duplicate_rows.append(deepcopy(duplicate_rows[0]))
    migrate_regional_source_proofs(duplicate["current_shadow"], policy=duplicate["policy"],
                                  targets=duplicate["targets"], original_proofs=originals)
    need(evidence.build_regional_current_operational_evidence(**duplicate)["safeProjection"]["missingPairCount"] == 919,
         "Migration must not turn duplicate ambiguity into a first-writer winner")
    missing = real_outage_bundle()
    counts = migrate_regional_source_proofs(missing["current_shadow"], policy=missing["policy"],
        targets=missing["targets"], original_proofs=[{"sourceAsset": source_asset(0)}])
    need(counts["invalidProofs"] == 1 and FIELD not in missing["current_shadow"],
         "A source identity without original outcome proof must never authorize raw samples")


def test_rejected_regional_replacement_preserves_only_valid_previous_leaf() -> None:
    baseline = real_outage_bundle()
    bind_fixture(baseline)
    previous = baseline["current_shadow"]
    untouched = deepcopy(previous)
    part_id = "SYNTHETIC-PART-00"
    anchor_id = f"REGIONAL_PROXY::{part_id}"
    previous_sample = previous["anchors"][anchor_id]["samples"][0]
    previous_ref = previous_sample[SAMPLE_REF]
    previous_binding = deepcopy(previous[FIELD]["bindings"][previous_ref])
    original = original_regional_proof(baseline, source_asset(0), "new-decoder")

    def reread(stage: dict, distance_valid: bool) -> None:
        target = deepcopy(previous["anchors"][anchor_id])
        target.pop("samples")
        point = [target["targetPoint"][0] + (0.11 if distance_valid else 0.03), 56.0]
        choices = [{
            "pointKey": point, "distanceKm": haversine_km(target["targetPoint"], point),
            "layerKey": "depth:synthetic", "layerRank": 4.0,
            "first": {"longitude": point[0], "latitude": point[1], "value": 0.14},
            "second": {"longitude": point[0], "latitude": point[1], "value": -0.08},
        }]
        need(record_profiles(
            stage, {anchor_id: target}, {anchor_id: choices}, "dkss_lf", iso(0), iso(0),
            iso(1), current_source_asset_sha256(original["sourceAsset"]),
            locked_operational_reference=iso(0),
        ) == 1, "Genuine profile collection must stage the same-key replacement")
        need(SAMPLE_REF not in stage["anchors"][anchor_id]["samples"][0],
             "A new profile cannot inherit the previous sample's positive binding")

    def capture(stage: dict, prior: dict) -> dict:
        return capture_regional_source_proof(
            stage, policy=baseline["policy"], targets=baseline["targets"],
            source_asset=original["sourceAsset"], part_outcome_proof=original["partOutcomeProof"],
            processing_signature=original["processingSignature"], previous_shadow=prior,
        )

    for fault in ("regular-distance", "missing-bottom"):
        stage = deepcopy(previous)
        reread(stage, fault != "regular-distance")
        if fault == "missing-bottom":
            stage["anchors"][anchor_id]["samples"][0]["layers"]["bottom"] = None
        counts = capture(stage, previous)
        need(counts["preservedSamples"] == 1 and counts["boundSamples"] == 6
             and counts["invalidSamples"] == 1,
             "A rejected fresh leaf must preserve one valid old leaf, not roll back sibling progress")
        need(stage["anchors"][anchor_id]["samples"][0] == previous_sample
             and stage[FIELD]["bindings"][previous_ref] == previous_binding
             and stage[FIELD]["sources"][previous_binding["sourceProofSha256"]]
             == previous[FIELD]["sources"][previous_binding["sourceProofSha256"]],
             "Preservation must restore the exact sample, binding, and original decoder/outcome proof")
        observed = {**baseline, "current_shadow": stage}
        need(evidence.build_regional_current_operational_evidence(**observed)["safeProjection"]["missingPairCount"] == 915,
             "Rejected replacement must lose zero previously authorized native/hold pairs")
        need(previous == untouched, "Capture must never mutate the pre-stage shadow")

    broken = deepcopy(previous)
    broken[FIELD]["bindings"][previous_ref]["sampleSha256"] = "sha256:" + "0" * 64
    broken_snapshot = deepcopy(broken)
    rejected = deepcopy(broken)
    reread(rejected, False)
    need(capture(rejected, broken)["preservedSamples"] == 0,
         "Known invalid old proof must never be resurrected to rescue an invalid new sample")
    need(evidence.build_regional_current_operational_evidence(
        **{**baseline, "current_shadow": rejected},
    )["safeProjection"]["missingPairCount"] == 919,
         "Rejected corrupt leaf remains isolated; no ledger fallback can recover it")
    repaired = deepcopy(broken)
    reread(repaired, True)
    counts = capture(repaired, broken)
    need(counts["boundSamples"] == 7 and counts["preservedSamples"] == 0,
         "Valid genuine EOF still repairs a corrupt old sample binding")
    need(evidence.build_regional_current_operational_evidence(
        **{**baseline, "current_shadow": repaired},
    )["safeProjection"]["missingPairCount"] == 915,
         "Repaired positive source authority restores exact/hold coverage")
    need(broken == broken_snapshot, "Recovery must not mutate the old corrupt snapshot")


def main() -> None:
    test_native_hold_missing_offsets_and_privacy()
    test_policy_target_source_and_shadow_tamper_fail_closed()
    test_gap_domain_is_exact_bounded_and_ledger_bound()
    test_future_samples_vector_commitment_and_stored_proof_tamper()
    test_null_run_catalog_outage_reaches_open_meteo_residual()
    test_durable_regional_proofs_survive_native_source_removal()
    test_durable_regional_corruption_migration_and_recovery_are_leaf_scoped()
    test_rejected_regional_replacement_preserves_only_valid_previous_leaf()
    print("OK: standalone regional DMI 118h evidence is bounded, hash-bound, and privacy-safe")


if __name__ == "__main__":
    main()
