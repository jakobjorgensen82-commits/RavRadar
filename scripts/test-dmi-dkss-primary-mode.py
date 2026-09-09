"""Focused contract checks for opt-in DKSS primary-gap processing."""
from __future__ import annotations

import copy
import importlib.util
import os
import sys
import types
from pathlib import Path
from unittest.mock import patch


ROOT = Path(__file__).resolve().parents[1]
os.environ.pop("DMI_BULK_DKSS_PRIMARY_MODE", None)
os.environ.pop("DMI_BULK_DKSS_PRIMARY_REFRESH_MAX_ASSETS", None)

# The classifier is pure Python; keep this test independent of the platform
# ecCodes DLL while importing the production module that owns the contract.
eccodes = types.ModuleType("eccodes")
eccodes.OutOfAreaError = type("OutOfAreaError", (Exception,), {})
for name in (
    "codes_get",
    "codes_get_array",
    "codes_get_elements",
    "codes_grib_find_nearest",
    "codes_grib_new_from_file",
    "codes_release",
):
    setattr(eccodes, name, lambda *args, **kwargs: None)
sys.modules["eccodes"] = eccodes

spec = importlib.util.spec_from_file_location(
    "ravradar_update_dmi_bulk_primary_mode",
    ROOT / "scripts/update-dmi-bulk.py",
)
assert spec and spec.loader
producer = importlib.util.module_from_spec(spec)
spec.loader.exec_module(producer)


MODEL_RUN = "2026-01-01T00:00:00Z"
STRIDE_VALID = "2026-01-01T09:00:00Z"
NON_STRIDE_VALID = "2026-01-01T08:00:00Z"
ZONE_ID = "PART::TEST"
TARGET_ID = "TEST"
TARGET = {
    "partId": TARGET_ID,
    "parentZoneId": "ZONE-TEST",
    "waterPoint": [2.0, 1.0],
}
ZONE = {
    "id": ZONE_ID,
    "parentZoneId": "ZONE-TEST",
    "coastalPart": True,
    "coastType": "limfjord",
    "lon": 2.0,
    "lat": 1.0,
}
CANDIDATE = {
    "gridDefinitionSha256": "a" * 64,
    "longitude": 2.0,
    "latitude": 1.0,
    "distanceKm": 0.0,
    "value": 0.1,
}
CAPTURE = {
    "itemId": "exact-stac-item",
    "assetIdentitySha256": "b" * 64,
    "assetSizeBytes": 1024,
    "acquiredAt": "2026-01-01T01:00:00Z",
    "contentLengthBytes": 1024,
    "contentSha256": "d" * 64,
    "itemCreatedAt": "2026-01-01T00:30:00Z",
}


def native_source(component: str, valid_time: str, *, zone: dict = ZONE) -> dict:
    extras = {}
    if component == "current":
        extras = {
            "verticalLayer": "depthBelowSea:1",
            "verticalLayerRankM": 1.0,
            "vectorSelection": producer.CURRENT_VECTOR_SELECTION,
            "vectorSemanticsVersion": producer.CURRENT_VECTOR_SEMANTICS_VERSION,
        }
    elif component == "windTail":
        extras = {
            "vectorSelection": "nearest-shared-grid-cell-no-spatial-interpolation",
            "vectorSemanticsVersion": 1,
        }
    source = producer.native_component_source(
        "dkss_lf",
        MODEL_RUN,
        valid_time,
        component=component,
        zone=zone,
        grid_candidate=CANDIDATE,
        capture=CAPTURE,
        spatial_selection=producer.COMPONENT_SPATIAL_SELECTION[component],
        **extras,
    )
    assert source is not None
    return source


def cached_zone(valid_time: str, *, optional: bool = True, zone: dict = ZONE) -> dict:
    entity = producer.sampling_identity(zone)
    assert entity is not None
    hour = {
        "sea-mean-deviation": 0.15,
        "current-u": 0.1,
        "current-v": -0.2,
        "sources": {
            "waterLevel": native_source("waterLevel", valid_time, zone=zone),
            "current": native_source("current", valid_time, zone=zone),
        },
    }
    if optional:
        hour.update({
            "water-temperature": 8.2,
            "wind-tail-u-10m": 4.0,
            "wind-tail-v-10m": -1.0,
        })
        hour["sources"].update({
            "waterTemperature": native_source("waterTemperature", valid_time, zone=zone),
            "windTail": native_source("windTail", valid_time, zone=zone),
        })
    return {**entity, "hourly": {valid_time: hour}}


def classify(
    valid_time: str,
    zone: dict,
    *,
    covered: bool = True,
    enabled: bool = True,
    collection: str = "dkss_lf",
    global_covered: bool | None = None,
) -> dict:
    return producer.classify_dkss_primary_asset(
        collection=collection,
        model_run=MODEL_RUN,
        asset={"valid": valid_time, "id": "asset"},
        target_ids=[TARGET_ID],
        covered_pair_keys={(TARGET_ID, valid_time)} if covered else set(),
        cached_zones={ZONE_ID: zone},
        active_zone_ids=[ZONE_ID],
        enabled=enabled,
        planning_covered_pair_keys=(
            {(TARGET_ID, valid_time)} if global_covered
            else set() if global_covered is False else None
        ),
    )


def reusable_processed_step(spatial_unavailable_part_ids: list[str]) -> dict:
    """Return the production-filtered checkpoint for one exact DKSS asset."""
    source_asset = producer.canonical_current_source_asset(
        native_source("current", STRIDE_VALID)
    )
    assert source_asset is not None
    official_asset = producer.official_current_asset_identity(
        "dkss_lf",
        MODEL_RUN,
        {
            "valid": STRIDE_VALID,
            "id": CAPTURE["itemId"],
            "assetIdentitySha256": CAPTURE["assetIdentitySha256"],
            "assetSizeBytes": CAPTURE["assetSizeBytes"],
            "itemCreatedAt": CAPTURE["itemCreatedAt"],
        },
    )
    assert official_asset is not None
    processing_signature = "test-primary-processed-signature"
    target_registry_sha256 = producer.target_fingerprint([TARGET])
    step = {
        "complete": True,
        "recognizedParameters": ["current-u", "current-v"],
        "zonesTouched": 1,
        "parserVersion": producer.PARSER_VERSION,
        "processingSignature": processing_signature,
        "sourceAsset": source_asset,
        "currentPartOutcomeProof": producer.build_current_part_outcome_proof(
            spatial_unavailable_part_ids,
            [TARGET_ID],
            target_registry_sha256,
            processing_signature,
            source_asset,
        ),
    }
    return producer.reusable_processed_steps(
        {
            "referenceTime": MODEL_RUN,
            "processingSignature": processing_signature,
            "processedSteps": {STRIDE_VALID: step},
        },
        collection="dkss_lf",
        same_processing=True,
        same_run=True,
        strict_current_anchor_available=True,
        required_valid_times={STRIDE_VALID},
        required_asset_provenance={STRIDE_VALID: official_asset},
        current_target_ids=[TARGET_ID],
        current_target_registry_sha256=target_registry_sha256,
        actual_pair_source_keys=set(),
        covered_pair_keys=set(),
    )


assert producer.DKSS_PRIMARY_MODE is False
assert producer.DKSS_PRIMARY_REFRESH_MAX_ASSETS == 2

full_stride_zone = cached_zone(STRIDE_VALID)
full = classify(STRIDE_VALID, full_stride_zone)
assert full == {
    "critical": False,
    "deferValidRefresh": True,
    "currentMissingPairCount": 0,
    "missingComponentKinds": [],
}

missing_pair = classify(STRIDE_VALID, full_stride_zone, covered=False)
assert missing_pair["critical"] is True
assert missing_pair["currentMissingPairCount"] == 1
assert missing_pair["missingComponentKinds"] == ["current"]

missing_current_field = copy.deepcopy(full_stride_zone)
missing_current_field["hourly"][STRIDE_VALID].pop("current-v")
assert classify(STRIDE_VALID, missing_current_field)["missingComponentKinds"] == ["current"]

# A valid fallback tuple affects acquisition priority, never native DMI proof.
# Removing the native part-current field does not make an already union-covered
# pair critical. The same field is still critical without valid union coverage.
global_covered = classify(
    STRIDE_VALID, missing_current_field, covered=False, global_covered=True,
)
assert global_covered["deferValidRefresh"] is True
assert global_covered["currentMissingPairCount"] == 0
assert global_covered["optionalParentCurrentCount"] == 0
assert classify(
    STRIDE_VALID, missing_current_field, covered=False, global_covered=False,
)["missingComponentKinds"] == ["current"]

# Parent U/V is optional overview weather; the integrated score and detailed
# weather use exact PART inputs. A parent without a native marine grid point
# must not turn globally complete PART current into endless critical work.
parent_zone = {
    "id": "ZONE-TEST", "coastType": "limfjord", "lon": 2.0, "lat": 1.0,
}
parent_cache = cached_zone(STRIDE_VALID, zone=parent_zone)
parent_cache["hourly"][STRIDE_VALID].pop("current-v")
parent_requirement = producer.classify_dkss_primary_asset(
    collection="dkss_lf", model_run=MODEL_RUN,
    asset={"valid": STRIDE_VALID, "id": "parent-only-current-hole"},
    target_ids=[TARGET_ID], covered_pair_keys=set(),
    cached_zones={ZONE_ID: full_stride_zone, "ZONE-TEST": parent_cache},
    active_zone_ids=[ZONE_ID, "ZONE-TEST"], enabled=True,
    planning_covered_pair_keys={(TARGET_ID, STRIDE_VALID)},
)
assert parent_requirement["critical"] is False
assert parent_requirement["currentMissingPairCount"] == 0
assert parent_requirement["optionalParentCurrentCount"] == 1
assert parent_requirement["optionalParentCurrentMissingCount"] == 1
assert parent_requirement["missingComponentKinds"] == []
assert parent_requirement["deferValidRefresh"] is True

invalid_water_level_source = copy.deepcopy(full_stride_zone)
invalid_water_level_source["hourly"][STRIDE_VALID]["sources"]["waterLevel"]["nativeValidTime"] = NON_STRIDE_VALID
assert classify(STRIDE_VALID, invalid_water_level_source)["missingComponentKinds"] == ["waterLevel"]
assert classify(
    STRIDE_VALID, invalid_water_level_source, global_covered=True,
)["missingComponentKinds"] == ["waterLevel"]

missing_temperature = copy.deepcopy(full_stride_zone)
missing_temperature["hourly"][STRIDE_VALID]["water-temperature"] = float("nan")
missing_temperature_requirement = classify(STRIDE_VALID, missing_temperature)
assert missing_temperature_requirement["missingComponentKinds"] == ["waterTemperature"]
assert classify(
    STRIDE_VALID, missing_temperature, global_covered=True,
)["missingComponentKinds"] == ["waterTemperature"]

missing_wind_tail = copy.deepcopy(full_stride_zone)
missing_wind_tail["hourly"][STRIDE_VALID].pop("wind-tail-v-10m")
assert classify(STRIDE_VALID, missing_wind_tail)["missingComponentKinds"] == ["windTail"]
assert classify(
    STRIDE_VALID, missing_wind_tail, global_covered=True,
)["missingComponentKinds"] == ["windTail"]

# Optional marine fields are intentionally not demanded on non-stride hours.
non_stride = classify(
    NON_STRIDE_VALID,
    cached_zone(NON_STRIDE_VALID, optional=False),
)
assert non_stride["deferValidRefresh"] is True
assert non_stride["missingComponentKinds"] == []

# The mode is opt-in and cannot suppress WAM/HARMONIE or any non-DKSS work.
assert classify(STRIDE_VALID, full_stride_zone, enabled=False)["deferValidRefresh"] is False
assert classify(STRIDE_VALID, full_stride_zone, collection="wam_dw")["deferValidRefresh"] is False

# Maintenance-only DKSS collections are deterministically moved behind every
# potentially critical collection. Within the maintenance group the existing
# collection order is preserved, and covered hours remain oldest-first.
assert producer.order_dkss_primary_refresh_collections(
    ["dkss_idw", "harmonie_dini_sf", "dkss_lf", "wam_dw"],
    {"dkss_idw", "dkss_lf"},
) == ["harmonie_dini_sf", "wam_dw", "dkss_idw", "dkss_lf"]
ordered_refresh_assets = producer.prioritize_marine_assets_for_current_gaps(
    [
        {"valid": STRIDE_VALID, "id": "later", "assetIdentitySha256": "2" * 64},
        {"valid": NON_STRIDE_VALID, "id": "older", "assetIdentitySha256": "1" * 64},
    ],
    [TARGET_ID],
    {(TARGET_ID, STRIDE_VALID), (TARGET_ID, NON_STRIDE_VALID)},
)
assert [row["valid"] for row in ordered_refresh_assets] == [
    NON_STRIDE_VALID,
    STRIDE_VALID,
]
other_component_critical = producer.prioritize_marine_assets_for_current_gaps(
    [
        {"valid": NON_STRIDE_VALID, "id": "covered-refresh"},
        {"valid": STRIDE_VALID, "id": "covered-current-missing-water"},
    ],
    [TARGET_ID],
    {(TARGET_ID, STRIDE_VALID), (TARGET_ID, NON_STRIDE_VALID)},
    critical_by_time={STRIDE_VALID: True, NON_STRIDE_VALID: False},
)
assert [row["id"] for row in other_component_critical] == [
    "covered-current-missing-water", "covered-refresh",
]
part_gap_before_parent_only = producer.prioritize_marine_assets_for_current_gaps(
    [
        {"valid": NON_STRIDE_VALID, "id": "parent-only-current-hole"},
        {"valid": STRIDE_VALID, "id": "global-part-current-hole"},
    ],
    [TARGET_ID], {(TARGET_ID, NON_STRIDE_VALID)},
    critical_by_time={NON_STRIDE_VALID: True, STRIDE_VALID: True},
)
assert [row["id"] for row in part_gap_before_parent_only] == [
    "global-part-current-hole", "parent-only-current-hole",
]

# No configured plan preserves old callers; invalid planning input cannot
# confer coverage or interrupt native cache preservation.
planning_reference = producer.datetime(2026, 1, 1, tzinfo=producer.timezone.utc)
with patch.dict(os.environ, {}, clear=True):
    planned_pairs, plan_diagnostics = producer.load_current_acquisition_planning_pairs(
        [TARGET], planning_reference,
    )
assert planned_pairs is None
assert plan_diagnostics == {"present": False, "valid": False, "scope": "dmi-only"}
with (
    patch.dict(os.environ, {"DMI_BULK_CURRENT_ACQUISITION_PLAN_PATH": "synthetic-plan.json"}),
    patch.object(producer, "read_current_acquisition_plan", side_effect=ValueError("invalid binding")),
    patch.object(producer, "progress") as warning,
):
    planned_pairs, plan_diagnostics = producer.load_current_acquisition_planning_pairs(
        [TARGET], planning_reference,
    )
assert planned_pairs is None
assert plan_diagnostics["present"] is True
assert plan_diagnostics["valid"] is False
warning.assert_called_once()
expected_pairs = {(TARGET_ID, STRIDE_VALID)}
with (
    patch.dict(os.environ, {"DMI_BULK_CURRENT_ACQUISITION_PLAN_PATH": "synthetic-plan.json"}),
    patch.object(producer, "read_current_acquisition_plan", return_value=expected_pairs) as read_plan,
):
    planned_pairs, plan_diagnostics = producer.load_current_acquisition_planning_pairs(
        [TARGET], planning_reference,
    )
read_plan.assert_called_once_with(
    "synthetic-plan.json", production_reference_at=MODEL_RUN, targets=[TARGET],
)
assert planned_pairs == expected_pairs
assert plan_diagnostics["valid"] is True
assert plan_diagnostics["coveredPairCount"] == 1

# Bounded refresh is admitted only for an unprocessed asset after the complete
# critical phase, and never when the per-run maintenance budget is exhausted.
assert producer.should_attempt_dkss_primary_refresh(
    valid_time=NON_STRIDE_VALID,
    previously_processed=set(),
    collection_refresh_only=True,
    critical_work_observed=False,
    remaining_asset_budget=2,
)
for blocked in (
    {"collection_refresh_only": False},
    {"critical_work_observed": True},
    {"remaining_asset_budget": 0},
    {"previously_processed": {NON_STRIDE_VALID}},
):
    arguments = {
        "valid_time": NON_STRIDE_VALID,
        "previously_processed": set(),
        "collection_refresh_only": True,
        "critical_work_observed": False,
        "remaining_asset_budget": 2,
        **blocked,
    }
    assert not producer.should_attempt_dkss_primary_refresh(**arguments)

failed_refresh_run = {
    "assetsBoundedRefreshAttempted": 1,
    "assetsBoundedRefreshCompleted": 0,
}
assert producer.dkss_bounded_refresh_failed_only(
    failed_refresh_run,
    collection_refresh_only=True,
)
assert not producer.dkss_bounded_refresh_failed_only(
    {**failed_refresh_run, "assetsBoundedRefreshCompleted": 1},
    collection_refresh_only=True,
)

# An exact processed-step proof closes a terminal spatial-unavailable current
# outcome. Primary mode must not turn that proven terminal outcome into an
# endless asset retry merely because no current pair exists in the cache.
terminal_reusable = reusable_processed_step([TARGET_ID])
assert STRIDE_VALID in terminal_reusable
assert producer.should_skip_previously_processed_asset(
    STRIDE_VALID,
    set(terminal_reusable),
    missing_pair,
)

# Parent current remains unproven, but is not a required component. Its absence
# neither reopens a valid processed asset nor disables a bounded new-asset
# quality refresh once all critical PART/current and other component holes close.
assert producer.should_skip_previously_processed_asset(
    STRIDE_VALID,
    set(terminal_reusable),
    parent_requirement,
)
for planning_pairs in (None, {(TARGET_ID, STRIDE_VALID)}):
    for parent_complete in (False, True):
        requirement = producer.classify_dkss_primary_asset(
            collection="dkss_lf", model_run=MODEL_RUN,
            asset={"valid": STRIDE_VALID, "id": "processed-parent-current"},
            target_ids=[TARGET_ID],
            covered_pair_keys={(TARGET_ID, STRIDE_VALID)},
            cached_zones={
                ZONE_ID: full_stride_zone,
                "ZONE-TEST": (
                    cached_zone(STRIDE_VALID, zone=parent_zone)
                    if parent_complete else parent_cache
                ),
            },
            active_zone_ids=[ZONE_ID, "ZONE-TEST"], enabled=True,
            planning_covered_pair_keys=planning_pairs,
        )
        assert requirement["optionalParentCurrentMissingCount"] == int(not parent_complete)
        assert requirement["critical"] is False
        assert requirement["deferValidRefresh"] is True
        assert producer.should_skip_previously_processed_asset(
            STRIDE_VALID, set(terminal_reusable), requirement,
        )
        assert producer.should_attempt_dkss_primary_refresh(
            valid_time=STRIDE_VALID,
            previously_processed=set(),
            collection_refresh_only=requirement["deferValidRefresh"],
            critical_work_observed=requirement["critical"],
            remaining_asset_budget=2,
        )

# Ignoring optional parent U/V must not hide a real PART gap. No union proof
# still requires native PART fields; an explicitly missing union pair remains
# critical even if a native row exists in the separate cache argument.
for planning_pairs, part_cache, covered_pairs in (
    (None, missing_current_field, {(TARGET_ID, STRIDE_VALID)}),
    (set(), full_stride_zone, {(TARGET_ID, STRIDE_VALID)}),
    (None, full_stride_zone, set()),
):
    requirement = producer.classify_dkss_primary_asset(
        collection="dkss_lf", model_run=MODEL_RUN,
        asset={"valid": STRIDE_VALID, "id": "real-part-current-hole"},
        target_ids=[TARGET_ID], covered_pair_keys=covered_pairs,
        cached_zones={ZONE_ID: part_cache, "ZONE-TEST": parent_cache},
        active_zone_ids=[ZONE_ID, "ZONE-TEST"], enabled=True,
        planning_covered_pair_keys=planning_pairs,
    )
    assert requirement["critical"] is True
    assert requirement["missingComponentKinds"] == ["current"]
    assert requirement["optionalParentCurrentMissingCount"] == 1
    assert not producer.should_skip_previously_processed_asset(
        STRIDE_VALID, set(), requirement,
    )

# Parent water level is unchanged by this current-only scope correction and
# can still reopen an otherwise reusable exact PART-current outcome.
parent_missing_water = copy.deepcopy(parent_cache)
parent_missing_water["hourly"][STRIDE_VALID].pop("sea-mean-deviation")
requirement = producer.classify_dkss_primary_asset(
    collection="dkss_lf", model_run=MODEL_RUN,
    asset={"valid": STRIDE_VALID, "id": "parent-water-level-hole"},
    target_ids=[TARGET_ID], covered_pair_keys={(TARGET_ID, STRIDE_VALID)},
    cached_zones={ZONE_ID: full_stride_zone, "ZONE-TEST": parent_missing_water},
    active_zone_ids=[ZONE_ID, "ZONE-TEST"], enabled=True,
    planning_covered_pair_keys={(TARGET_ID, STRIDE_VALID)},
)
assert requirement["missingComponentKinds"] == ["waterLevel"]
assert producer.should_skip_previously_processed_asset(
    STRIDE_VALID, set(terminal_reusable), requirement,
) is False

# The same exact step is deliberately not reusable when its outcome says that
# the part was positive but the corresponding pair is absent. It must reopen.
positive_missing_reusable = reusable_processed_step([])
assert positive_missing_reusable == {}
assert not producer.should_skip_previously_processed_asset(
    STRIDE_VALID,
    set(positive_missing_reusable),
    missing_pair,
)

# A reusable current outcome cannot suppress an independently missing DKSS
# component; required water/temperature/wind work remains actionable.
assert not producer.should_skip_previously_processed_asset(
    STRIDE_VALID,
    {STRIDE_VALID},
    missing_temperature_requirement,
)
assert producer.should_skip_previously_processed_asset(
    STRIDE_VALID,
    {STRIDE_VALID},
    None,
)

deferred_run = {
    "assetsDeferredValidRefresh": 3,
    "assetsProcessed": 0,
    "assetsReused": 0,
    "assetsSkippedBySupervisor": 0,
    "assetsSkippedPreviouslyProcessed": 0,
}
assert producer.dkss_collection_deferred_only(deferred_run, 3)
assert not producer.dkss_collection_deferred_only({**deferred_run, "assetsProcessed": 1}, 3)
assert not producer.dkss_collection_deferred_only(deferred_run, 4)

print("DMI DKSS primary-mode contract OK")
