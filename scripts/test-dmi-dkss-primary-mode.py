"""Focused contract checks for opt-in DKSS primary-gap processing."""
from __future__ import annotations

import ast
import copy
import importlib.util
import inspect
import json
import subprocess
import runpy
import tempfile
import os
import sys
import types
from datetime import datetime, timedelta, timezone
from pathlib import Path
from unittest.mock import patch

from lib import dmi_native_provenance as native_provenance


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
    "currentUpgradePairCount": 0,
    "currentNativeDeficitCount": 0,
    "criticalPriority": 2,
    "regionalCurrentPotentialPairCount": 0,
    "missingComponentKinds": [],
}

missing_pair = classify(STRIDE_VALID, full_stride_zone, covered=False)
assert missing_pair["critical"] is True
assert missing_pair["currentMissingPairCount"] == 1
assert missing_pair["missingComponentKinds"] == ["current"]

missing_current_field = copy.deepcopy(full_stride_zone)
missing_current_field["hourly"][STRIDE_VALID].pop("current-v")
assert classify(STRIDE_VALID, missing_current_field)["missingComponentKinds"] == ["current"]

# A valid fallback tuple moves DMI work behind real holes, but does not hide
# the native DMI upgrade. The same field is urgent without union coverage.
global_covered = classify(
    STRIDE_VALID, missing_current_field, covered=False, global_covered=True,
)
assert global_covered["critical"] is True
assert global_covered["deferValidRefresh"] is False
assert global_covered["currentMissingPairCount"] == 0
assert global_covered["currentUpgradePairCount"] == 1
assert global_covered["criticalPriority"] == 1
assert global_covered["missingComponentKinds"] == ["currentUpgrade"]
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
    target_ids=[TARGET_ID], covered_pair_keys={(TARGET_ID, STRIDE_VALID)},
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
assert producer.fair_pending_critical_runtime_reserve(
    ["wam_nsb"], ["dkss_lf", "dkss_idw"], 1200.0,
    {"wam_nsb": 120.0}, {"dkss_lf": 120.0, "dkss_idw": 120.0},
) == 900.0
assert producer.fair_pending_critical_runtime_reserve(
    [], ["dkss_idw"], 300.0, {}, {"dkss_idw": 120.0},
) == 150.0
assert producer.fair_pending_critical_runtime_reserve(
    [], [], 300.0, {}, {},
) == 0.0
level_plan, level_diagnostics = producer.operational_collection_plan(
    ["dkss_idw", "dkss_nsbs", "dkss_lf", "wam_dw"], {}, True, {}, 1500.0,
    water_level_recovery_needed=True,
)
assert set(level_diagnostics["strictCurrentCollections"]) == set(producer.MARINE_COLLECTIONS)
assert level_diagnostics["waterLevelRecoveryNeeded"] is True
assert all(collection in level_plan[:3] for collection in producer.MARINE_COLLECTIONS)
stable_plan, stable_diagnostics = producer.operational_collection_plan(
    ["dkss_idw", "dkss_nsbs", "dkss_lf", "wam_dw"], {}, True, {}, 1500.0,
)
assert stable_diagnostics["strictCurrentCollections"] == []
native_plan, native_diagnostics = producer.refine_operational_collection_plan_after_prefetch(
    stable_plan,
    stable_diagnostics,
    {"dkss_lf"},
    1500.0,
    native_deficit_collections={"dkss_idw", "dkss_lf"},
)
assert native_diagnostics["strictCurrentCollections"] == ["dkss_idw"]
assert native_diagnostics["nativeDeficitCollections"] == ["dkss_idw"]
assert native_diagnostics["strictCurrentLeadAttemptLimit"] > 0
assert native_plan[0] == "dkss_idw"
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
critical_water_and_current_are_peers = producer.prioritize_marine_assets_for_current_gaps(
    [
        {"valid": NON_STRIDE_VALID, "id": "dmi-only-water-level-hole"},
        {"valid": STRIDE_VALID, "id": "global-part-current-hole"},
    ],
    [TARGET_ID], {(TARGET_ID, NON_STRIDE_VALID)},
    critical_by_time={NON_STRIDE_VALID: True, STRIDE_VALID: True},
)
assert [row["id"] for row in critical_water_and_current_are_peers] == [
    "dmi-only-water-level-hole", "global-part-current-hole",
]

# An actual critical attempt advances a durable cursor in the producer. On
# the next model run, keep the first three hours close to now but serve the
# as-yet-unreached tail before revisiting older critical native hours.
rotating_hours = [
    f"2026-09-24T{hour:02d}:00:00Z" for hour in range(8)
]
rotating_assets = [
    {"valid": valid_time, "id": f"hour-{index}"}
    for index, valid_time in enumerate(rotating_hours)
]
rotated_critical = producer.prioritize_marine_assets_for_current_gaps(
    rotating_assets, [TARGET_ID], set(),
    direct_valid_times=set(rotating_hours),
    critical_cursor_valid_time=rotating_hours[5],
)
assert [row["valid"] for row in rotated_critical] == [
    *rotating_hours[:3], *rotating_hours[6:], *rotating_hours[3:6],
]
rotated_next_reference = producer.prioritize_marine_assets_for_current_gaps(
    rotating_assets[1:], [TARGET_ID], set(),
    direct_valid_times=set(rotating_hours[1:]),
    critical_cursor_valid_time=rotating_hours[5],
)
assert [row["valid"] for row in rotated_next_reference] == [
    *rotating_hours[1:4], *rotating_hours[6:], *rotating_hours[4:6],
]
prior_processed = {
    rotating_hours[index]: {"complete": True}
    for index in range(6)
}
assert producer.critical_native_cursor_for_run(
    {}, {"processedSteps": prior_processed}, set(rotating_hours[1:]),
) == rotating_hours[5]
assert producer.critical_native_cursor_for_run(
    {"criticalNativeCursorValidTime": rotating_hours[6]},
    {"processedSteps": prior_processed}, set(rotating_hours[1:]),
) == rotating_hours[6]
assert producer.critical_native_cursor_for_run(
    {}, {"processedSteps": {rotating_hours[7]: {"complete": False}}},
    set(rotating_hours),
) is None

# The first plan and the dynamic LF suffix must agree on real holes versus
# DMI-current upgrades. A covered early current upgrade cannot outrank a
# later missing DMI-only water-level component after regional replanning.
priority_hours = [
    "2026-09-24T08:00:00Z", "2026-09-24T09:00:00Z",
]
priority_assets = [
    {"valid": priority_hours[0], "id": "current-upgrade"},
    {"valid": priority_hours[1], "id": "water-level-hole"},
]
priority_requirements = {
    priority_hours[0]: {"critical": True, "criticalPriority": 1},
    priority_hours[1]: {"critical": True, "criticalPriority": 0},
}
priority_order = producer.prioritize_dkss_primary_assets(
    priority_assets, [TARGET_ID],
    {(TARGET_ID, value) for value in priority_hours},
    priority_requirements,
    direct_valid_times=set(priority_hours),
    regional_gap_pairs_by_time={},
    verified_reusable_valid_times=set(),
    critical_cursor_valid_time=None,
)
assert [row["id"] for row in priority_order] == [
    "water-level-hole", "current-upgrade",
]

# Replanning after the first attempt must retain the cursor from turn entry;
# the latest attempt is persisted for the NEXT turn, not used as this turn's
# pivot. Otherwise repeated suffix replans walk hours 0,1,2,3... again.
long_hours = [
    f"2026-09-{24 + hour // 24:02d}T{hour % 24:02d}:00:00Z"
    for hour in range(40)
]
long_assets = [
    {"valid": value, "id": f"hour-{index}"}
    for index, value in enumerate(long_hours)
]
long_requirements = {
    value: {"critical": True, "criticalPriority": 0}
    for value in long_hours
}
long_plan_args = dict(
    direct_valid_times=set(long_hours),
    regional_gap_pairs_by_time={},
    verified_reusable_valid_times=set(),
    critical_cursor_valid_time=long_hours[30],
)
initial_long_plan = producer.prioritize_dkss_primary_assets(
    long_assets, [TARGET_ID], set(), long_requirements,
    **long_plan_args,
)
assert [row["id"] for row in initial_long_plan[:5]] == [
    "hour-0", "hour-1", "hour-2", "hour-31", "hour-32",
]
replanned_suffix = producer.prioritize_dkss_primary_assets(
    initial_long_plan[1:], [TARGET_ID], set(), long_requirements,
    **long_plan_args,
)
assert [row["id"] for row in replanned_suffix[:5]] == [
    "hour-1", "hour-2", "hour-31", "hour-32", "hour-33",
]

# Guard the production wiring too: both initial and suffix plans must use
# the shared classifier-priority adapter and the immutable entry cursor.
main_tree = ast.parse(inspect.getsource(producer.main))
dkss_plans = [
    node for node in ast.walk(main_tree)
    if isinstance(node, ast.Call)
    and isinstance(node.func, ast.Name)
    and node.func.id == "prioritize_dkss_primary_assets"
]
assert len(dkss_plans) == 2
for call in dkss_plans:
    cursor_arg = next(
        keyword.value for keyword in call.keywords
        if keyword.arg == "critical_cursor_valid_time"
    )
    assert any(
        isinstance(node, ast.Name)
        and node.id == "critical_native_cursor_at_turn_start"
        for node in ast.walk(cursor_arg)
    )
assert sum(
    isinstance(node, ast.Name)
    and isinstance(node.ctx, ast.Store)
    and node.id == "critical_native_cursor_at_turn_start"
    for node in ast.walk(main_tree)
) == 1

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

def check_single_asset_operational_attestation_scope() -> None:
    """Compare the real full-horizon oracle and exact-hour normal qualifier."""
    reference = datetime(2026, 1, 1, tzinfo=timezone.utc)
    targets = [TARGET, {**TARGET, "partId": "TEST-SECOND"}]
    document = {"zones": {}}
    for target in targets:
        own_zone = {**ZONE, "id": f"PART::{target['partId']}"}
        entity = producer.sampling_identity(own_zone)
        assert entity is not None
        hours = {}
        for offset in range(-1, producer.PUBLIC_END_OFFSET_HOURS + 2):
            valid = producer.canonical_time(reference + timedelta(hours=offset))
            model_run = producer.canonical_time(
                reference - timedelta(hours=6) if offset < 0 else reference
            )
            own_source = producer.native_component_source(
                "dkss_lf", model_run, valid, component="current", zone=own_zone,
                grid_candidate=CANDIDATE, capture=CAPTURE,
                spatial_selection=producer.COMPONENT_SPATIAL_SELECTION["current"],
                verticalLayer="depthBelowSea:1", verticalLayerRankM=1.0,
                vectorSelection=producer.CURRENT_VECTOR_SELECTION,
                vectorSemanticsVersion=producer.CURRENT_VECTOR_SEMANTICS_VERSION,
            )
            assert own_source is not None
            hours[valid] = {
                "time": valid, "current-u": 0.1, "current-v": -0.2,
                "sources": {"current": own_source},
            }
        document["zones"][own_zone["id"]] = {**entity, "hourly": hours}
    original_document = copy.deepcopy(document)
    original_qualifier = native_provenance._verified_part_current_row
    expected_full_calls = len(targets) * (producer.PUBLIC_END_OFFSET_HOURS + 1)
    scope_cases = 0
    for offset in (0, 59, producer.PUBLIC_END_OFFSET_HOURS, -1, producer.PUBLIC_END_OFFSET_HOURS + 1):
        valid = producer.canonical_time(reference + timedelta(hours=offset))
        selected = document["zones"][ZONE_ID]["hourly"][valid]["sources"]["current"]
        asset = producer.canonical_current_source_asset(selected)
        assert asset is not None
        with patch.object(native_provenance, "_verified_part_current_row", wraps=original_qualifier) as full_rows:
            expected = producer.current_operational_attestation(
                document, targets, reference, [asset], [],
            )["verifiedPairSources"]
        with patch.object(native_provenance, "_verified_part_current_row", wraps=original_qualifier) as bounded_rows:
            actual = producer.current_operational_asset_pair_sources(document, targets, reference, asset)
        assert actual == expected, "SINGLE_ASSET_FULL_PAIR_SOURCE_PROJECTION_CHANGED"
        assert full_rows.call_count == expected_full_calls
        if 0 <= offset <= producer.PUBLIC_END_OFFSET_HOURS:
            assert len(actual) == len(targets)
            assert bounded_rows.call_count == len(targets), "SINGLE_ASSET_STILL_QUALIFIES_FULL_HORIZON"
            assert full_rows.call_count > bounded_rows.call_count
        else:
            assert actual == [], "PRIVATE_SUPPORT_HOUR_BECAME_OPERATIONAL"
        scope_cases += 1
    assert document == original_document, "SINGLE_ASSET_QUALIFICATION_MUTATED_ORIGINALS"

    # Old rich sources may carry a validTime alias in addition to the native
    # time. The canonical asset key prefers the alias, while row admission
    # uses nativeValidTime. The final full attestation rejects their mismatch;
    # the optimization must not turn that refusal into partial success.
    alias_document = copy.deepcopy(original_document)
    native_time = producer.canonical_time(reference + timedelta(hours=59))
    alias_time = producer.canonical_time(reference + timedelta(hours=60))
    for own in alias_document["zones"].values():
        own["hourly"][native_time]["sources"]["current"]["validTime"] = alias_time
    alias_asset = producer.canonical_current_source_asset(
        original_document["zones"][ZONE_ID]["hourly"][alias_time]["sources"]["current"]
    )
    assert alias_asset is not None
    alias_before = copy.deepcopy(alias_document)
    for alias_caller in (
        lambda: producer.current_operational_attestation(
            alias_document, targets, reference, [alias_asset], [],
        )["verifiedPairSources"],
        lambda: producer.current_operational_asset_pair_sources(
            alias_document, targets, reference, alias_asset,
        ),
    ):
        with patch.object(native_provenance, "_verified_part_current_row", wraps=original_qualifier) as alias_rows:
            try:
                alias_caller()
            except ValueError as error:
                assert str(error) == "Verified part/source identity is invalid"
            else:
                raise AssertionError("OLD_TIME_ALIAS_REFUSAL_BECAME_SUCCESS")
        assert alias_rows.call_count == expected_full_calls, "OLD_TIME_ALIAS_LOST_NORMAL_FULL_PATH"
    assert alias_document == alias_before, "OLD_TIME_ALIAS_ORIGINAL_CHANGED"
    scope_cases += 1

    valid = producer.canonical_time(reference + timedelta(hours=59))
    old_asset = producer.canonical_current_source_asset(
        document["zones"][ZONE_ID]["hourly"][valid]["sources"]["current"]
    )
    assert old_asset is not None
    for mutation in ("wrong-row-time", "invalid-native-grid", "changed-point"):
        changed = copy.deepcopy(original_document)
        for own in changed["zones"].values():
            row = own["hourly"][valid]
            if mutation == "wrong-row-time":
                row["time"] = producer.canonical_time(reference + timedelta(hours=60))
            elif mutation == "invalid-native-grid":
                row["sources"]["current"]["gridDefinitionSha256"] = "not-a-grid-sha256"
            else:
                own["samplingPoint"] = [2.01, 1.0]
        before = copy.deepcopy(changed)
        expected = producer.current_operational_attestation(
            changed, targets, reference, [old_asset], [],
        )["verifiedPairSources"]
        assert producer.current_operational_asset_pair_sources(changed, targets, reference, old_asset) == expected == []
        assert changed == before
        scope_cases += 1
    for other_reference in (reference + timedelta(minutes=30), reference.replace(tzinfo=None)):
        outcomes = []
        for caller in (
            lambda: producer.current_operational_attestation(document, targets, other_reference, [old_asset], [])["verifiedPairSources"],
            lambda: producer.current_operational_asset_pair_sources(document, targets, other_reference, old_asset),
        ):
            try:
                outcomes.append(("value", caller()))
            except (TypeError, ValueError) as error:
                outcomes.append(("error", type(error), str(error)))
        assert outcomes[0] == outcomes[1], "NONSTANDARD_REFERENCE_REFUSAL_CHANGED"
        if other_reference.tzinfo is not None:
            assert outcomes[0][0] == "error"
        scope_cases += 1
    for own in document["zones"].values():
        winner = own["hourly"][valid]["sources"]["current"]
        winner["modelRun"] = producer.canonical_time(reference + timedelta(hours=6))
        winner["leadTimeHours"] -= 6
        winner["itemId"] = "newer-exact-stac-winner"
        winner["contentSha256"] = "e" * 64
    new_asset = producer.canonical_current_source_asset(
        document["zones"][ZONE_ID]["hourly"][valid]["sources"]["current"]
    )
    assert new_asset is not None
    newer_document = copy.deepcopy(document)
    for asset, count in ((old_asset, 0), (new_asset, len(targets))):
        expected = producer.current_operational_attestation(
            document, targets, reference, [asset], [],
        )["verifiedPairSources"]
        assert producer.current_operational_asset_pair_sources(document, targets, reference, asset) == expected
        assert len(expected) == count, "A_PARSED_LOSER_REPLACED_THE_SELECTED_ORIGINAL"
        scope_cases += 1
    malformed = {**new_asset, "contentSha256": "not-a-hash"}
    for caller in (
        lambda: producer.current_operational_attestation(document, targets, reference, [malformed], []),
        lambda: producer.current_operational_asset_pair_sources(document, targets, reference, malformed),
    ):
        try:
            caller()
        except ValueError as error:
            assert str(error) == "Selected current source asset is invalid"
        else:
            raise AssertionError("INVALID_SOURCE_ASSET_ACCEPTED")
    assert document == newer_document, "SINGLE_ASSET_QUALIFICATION_MUTATED_SELECTED_WINNER"
    # The normal caller uses the optimized projection, not an unreferenced helper.
    main_tree = ast.parse(inspect.getsource(producer.main))
    projection_calls = [node for node in ast.walk(main_tree)
                        if isinstance(node, ast.Call) and isinstance(node.func, ast.Name)
                        and node.func.id == "current_operational_asset_pair_sources"]
    assert len(projection_calls) == 1
    assert len(projection_calls[0].args) == 4
    assert isinstance(projection_calls[0].args[-1], ast.Name)
    assert projection_calls[0].args[-1].id == "step_source_asset"
    assert original_document["zones"][ZONE_ID]["hourly"][producer.canonical_time(reference - timedelta(hours=1))] == \
        document["zones"][ZONE_ID]["hourly"][producer.canonical_time(reference - timedelta(hours=1))]
    print(f"DMI selected-asset attestation scope OK: {scope_cases} projection cases; normal row qualifications {expected_full_calls}->{len(targets)}")


def check_first_turn_order_is_detached_observation():
    near, middle, tail = STRIDE_VALID, "2026-01-02T09:00:00Z", "2026-01-05T09:00:00Z"
    assets = [{"id": "PRIVATE-ASSET", "valid": valid} for valid in (near, middle, tail)]
    required = {near, middle, tail}
    covered = {(TARGET_ID, valid) for valid in required}
    requirements = {}
    for valid in required:
        zone = cached_zone(valid)
        zone["hourly"][valid].pop("sea-mean-deviation")
        requirements[valid] = classify(valid, zone, global_covered=True)
    # All are critical, but one is ONLY a native upgrade, not a value gap.
    requirements[middle]["missingComponentKinds"] = ["currentUpgrade"]
    requirements[middle]["criticalPriority"] = 1
    requirements[middle]["currentUpgradePairCount"] = 1
    ordered = producer.prioritize_dkss_primary_assets(
        assets, [TARGET_ID], covered, requirements, direct_valid_times=required,
        regional_gap_pairs_by_time={}, verified_reusable_valid_times=set(),
        critical_cursor_valid_time=None,
    )
    original_assets, original_requirements = copy.deepcopy(ordered), copy.deepcopy(requirements)
    options = dict(
        collection="dkss_lf", model_run=MODEL_RUN,
        production_reference=datetime(2026, 1, 1, tzinfo=timezone.utc),
        ordered_assets=ordered, requirements=requirements, required_valid_times=required,
        cursor=None, maintenance=False, primary_mode=True,
    )
    report = producer.dkss_first_turn_order_diagnostic(**options)
    assert report["available"] is True
    assert report["scope"] == "COLLECTION_FIRST_TURN_QUEUE_NOT_WHOLE_RUN_START"
    assert report["classifierPriorityCounts"] == {"0": 2, "1": 1, "2": 0}
    assert [row["validTime"] for row in report["orderedHours"]] == [row["valid"] for row in ordered]
    assert [row["validTime"] for row in report["orderedHours"]] == [near, tail, middle]
    assert [row["rank"] for row in report["orderedHours"]] == [1, 2, 3]
    assert report["coverageProof"] is report["skipAuthority"] is report["sourceAdmission"] is False
    assert report["cursorKind"] == "criticalNative" and report["cursorValidTime"] is None
    assert "PRIVATE-ASSET" not in str(report) and TARGET_ID not in str(report)
    assert ordered == original_assets and requirements == original_requirements
    before = copy.deepcopy(report)
    requirements[near]["missingComponentKinds"].append("regionalCurrent")
    ordered.reverse()
    assert report == before, "LATER_REPLAN_MUTATED_FIRST_TURN_OBSERVATION"
    refresh_order = producer.rotate_native_refresh_assets(original_assets, near)
    refresh_report = producer.dkss_first_turn_order_diagnostic(**{
        **options, "ordered_assets": refresh_order, "requirements": original_requirements,
        "maintenance": True, "cursor": near,
    })
    assert refresh_report["cursorKind"] == "nativeRefresh"
    assert refresh_report["cursorValidTime"] == near and refresh_report["maintenance"] is True
    assert [row["validTime"] for row in refresh_report["orderedHours"]] == [row["valid"] for row in refresh_order]
    # Unknown diagnosis cannot stop/reorder the producer or print arbitrary input.
    for change in ({"primary_mode": False}, {"ordered_assets": assets * 200},
                   {"requirements": {}}, {"collection": "unknown"}):
        refused = producer.dkss_first_turn_order_diagnostic(**{**options, **change})
        assert refused == {"available": False, "reasonCode": "DKSS_START_ORDER_UNAVAILABLE"}
    bad = copy.deepcopy(requirements)
    bad[tail]["missingComponentKinds"] = ["PRIVATE-UNEXPECTED-VALUE"]
    refused = producer.dkss_first_turn_order_diagnostic(**{**options, "requirements": bad})
    assert refused["available"] is False and "PRIVATE" not in str(refused)

    # One call in normal initial order, after maintenance rotation, not the
    # mutable LF suffix replan. The receipt is first-write-only by collection.
    tree = ast.parse(inspect.getsource(producer.main))
    calls = [node for node in ast.walk(tree) if isinstance(node, ast.Call)
             and isinstance(node.func, ast.Name) and node.func.id == "dkss_first_turn_order_diagnostic"]
    assert len(calls) == 1
    guards = [node for node in ast.walk(tree) if isinstance(node, ast.If)
              and isinstance(node.test, ast.Compare)
              and ast.unparse(node.test) == "collection not in first_turn_orders"]
    assert len(guards) == 1 and calls[0] in list(ast.walk(guards[0]))
    cursor = next(keyword.value for keyword in calls[0].keywords if keyword.arg == "cursor")
    assert isinstance(cursor, ast.IfExp) and ast.unparse(cursor.test) == "collection_is_maintenance"
    assert ast.unparse(cursor.body) == "state.get('nativeRefreshCursorValidTime')"
    assert ast.unparse(cursor.orelse) == "critical_native_cursor_at_turn_start"
    print("DMI initial-order diagnostic OK: actual order, upgrade != hole, detached, fixed safe fields")


check_single_asset_operational_attestation_scope()
check_first_turn_order_is_detached_observation()
print("DMI DKSS primary-mode contract OK")


NODE_NORMAL_SCALAR_FIXTURE = r"""
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {encodeRetainedScalarNeeds} from './scripts/plan-weather-scalar-acquisition.mjs';
import fs from 'node:fs';
import {fileURLToPath} from 'node:url';
import {buildPartDmiForecastWithProtectedRetention,haversineKm} from './scripts/lib/private-dmi-recovery-record.mjs';
import {verifiedIntegratedPartHourly,dmiExpectedIdentityForPart} from './scripts/lib/ravscore-production-adapters.mjs';
import {buildWaterSourceForecastIndex,applyVerifiedWaterSourceRoutingToPartHourly} from './scripts/lib/water-source-forecast-routing.mjs';
import {buildWeatherComponentNeeds} from './scripts/lib/weather-component-needs.mjs';
import {dmiMarineCollectionAllowedForZone} from './scripts/lib/dmi-marine-zone-exclusions.mjs';
import {dmiWaterSourceFixture} from './scripts/test-helpers/dmi-water-source-fixture.mjs';
globalThis.fetch=()=>{throw Error('REGRESSION_NETWORK_FORBIDDEN');};
const H0='2026-01-01T00:00:00.000Z',HOUR=3600000;
const time=i=>new Date(Date.parse(H0)+i*HOUR).toISOString();
const part={partId:'TEST',zoneId:'ZONE-TEST',parentZoneId:'ZONE-TEST',waterPoint:[2,1],onshoreDirectionDeg:90};
const identity=dmiExpectedIdentityForPart(part);
const fixtureText=fs.readFileSync(new URL('./scripts/test-dmi-protected-tuple-continuity.mjs',import.meta.url),'utf8');
const from=fixtureText.indexOf("const vectorSelection ="),until=fixtureText.indexOf('const options =',from);
assert(from>=0&&until>from,'EXISTING_NATIVE_FIXTURE_BOUNDARY');
const fixture=Function('part','identity','time',fixtureText.slice(from,until)+';return {row,bulk};')(part,identity,time);
const persisted=Array.from({length:121},(_,i)=>fixture.row(i));
for(const row of persisted){delete row.waterLevelCm;delete row.sources.waterLevel;}
const feature={type:'Feature',geometry:{type:'Point',coordinates:part.waterPoint},properties:{id:identity.entityId,dataPoint:part.waterPoint,onshoreDirectionDeg:90}};
const retained=buildPartDmiForecastWithProtectedRetention(feature,fixture.bulk,null,H0,{startAt:H0,expectedIdentity:identity,persistedHourly:persisted});
const qualified=verifiedIntegratedPartHourly(retained,fixture.bulk,identity.entityId,part,{requireNativeGridSampling:false});
assert.equal(qualified.length,121,'NORMAL_RETENTION_PRESERVES_PRIVATE_SUPPORT');
const station={sourceKey:'tidewater:SYNTHETIC',stationId:'SYNTHETIC',name:'Syntetisk kilde',sourceType:'forecast-point',point:[2,1],registryStatus:'active-forecast-point',properties:{status:'Active'}};
const parentFeature={properties:{id:part.zoneId,name:'Syntetisk zone',dataPoint:part.waterPoint,coastLine:[[1.9,1],[2.1,1]],onshoreDirectionDeg:90}};
const routing={zones:{[part.zoneId]:{enabled:true,requireAll:true,method:'manual-weights',stations:[{sourceKey:station.sourceKey,weight:1}]}}};
function route(offsets,hourly=qualified){const sourceRows=Object.fromEntries(offsets.map(i=>[time(i),dmiWaterSourceFixture(station,time(i),20+i,H0)]));const bulk={generatedAt:H0,timeStrideHours:1,zones:{['SOURCE::'+station.sourceKey]:{hourly:sourceRows}}};const index=buildWaterSourceForecastIndex([station],bulk,H0);assert.equal(index.size,1,'NORMAL_SOURCE_NATIVE_QUALIFICATION');return applyVerifiedWaterSourceRoutingToPartHourly({part,parentFeature,hourly,sources:[station],index,routing,haversineKm:()=>1,diagnosticReferenceAt:H0}).hourly;}
const routed=route(Array.from({length:49},(_,i)=>i));
const needs=buildWeatherComponentNeeds({parts:[part],productionReferenceAt:H0,readVerifiedHourly:()=>routed});
const gapAt=i=>needs.needs.filter(n=>n.validTime===time(i)&&n.purpose==='GAP').map(n=>[n.component,n.gapReason]);
assert.deepEqual(gapAt(4),[],'EARLY_SOURCE_AND_PART_MUST_BE_ACTUALLY_QUALIFIED');
assert.deepEqual(gapAt(96),[['waterLevel','VALUE_GAP']],'LATE_SCALAR_GAP_MUST_REMAIN_REAL');
assert.equal(routed[4].waterLevelProvenance.status,'verified');assert.equal(routed[4].waterLevelProvenance.provider,'dmi');
assert(Number.isFinite(routed[4].waterLevelTrendCm3h),'SOURCE_T_PLUS_3_MUST_BE_VERIFIED');
const tailWithSupport=route([117,120]);const tailWithoutSupport=route([117]);
const tailPlan=buildWeatherComponentNeeds({parts:[part],productionReferenceAt:H0,readVerifiedHourly:()=>tailWithoutSupport});
assert(Number.isFinite(tailWithSupport[117].waterLevelTrendCm3h),'SOURCE_EXACT_H120_SUPPORT');
assert.equal(tailWithoutSupport[117].waterLevelTrendCm3h,null);
assert(tailPlan.needs.some(n=>n.validTime===time(117)&&n.component==='waterLevel'&&n.gapReason==='TREND_GAP'));
assert(tailPlan.privateSupportNeeds.some(n=>n.validTime===time(120)&&n.component==='waterLevel'));
const seven=['DK-B01-01','DK-B01-02','DK-B02-08','DK-B02-09','DK-B02-11','DK-B03-01','DK-B03-02'];
for(const zone of seven){assert(dmiMarineCollectionAllowedForZone('dkss_lf',zone,'waterLevel'));assert(!dmiMarineCollectionAllowedForZone('dkss_lf',zone,'current'));assert(!dmiMarineCollectionAllowedForZone('dkss_lf',zone,'waterTemperature'));}
assert(dmiMarineCollectionAllowedForZone('dkss_lf','DK-B05-17','current'),'OWN_LIMFJORD_INPUT_NOT_EXCLUDED');
const currentCoveredAt=i=>routed[i].currentProvenance?.status==='verified'&&Number.isFinite(routed[i].currentSpeedMps)&&Number.isFinite(routed[i].currentDirectionDeg);
assert(currentCoveredAt(4)&&currentCoveredAt(96),'NORMAL_PART_CURRENT_ADMISSION');

const optionalPersisted=structuredClone(persisted);
for(const row of optionalPersisted.slice(90)){
  delete row.windSpeedMps;delete row.windDirectionDeg;delete row.sources.wind;
  delete row.waterTemperatureC;delete row.sources.waterTemperature;
}
const optionalRetained=buildPartDmiForecastWithProtectedRetention(feature,fixture.bulk,null,H0,
  {startAt:H0,expectedIdentity:identity,persistedHourly:optionalPersisted});
const optionalQualified=verifiedIntegratedPartHourly(optionalRetained,fixture.bulk,identity.entityId,part,
  {requireNativeGridSampling:false});
const optionalRouted=route(Array.from({length:49},(_,i)=>i),optionalQualified);
const optionalNeeds=buildWeatherComponentNeeds({parts:[part],productionReferenceAt:H0,
  readVerifiedHourly:()=>optionalRouted});
// Pure schema encoding only. These test tags cannot pass the physical snapshot
// reader; original-file admission is independently exercised in its own case.
const tag={bytes:Buffer.byteLength(fixtureText),sha256:'sha256:'+createHash('sha256').update(fixtureText).digest('hex')};
const snapshots=Object.fromEntries(['dmi','parts','zones','forecast','stations','deployed','routing',
  'selection','openMeteo','copernicus','pointState'].map(role=>[role,tag]));
const encode=plan=>encodeRetainedScalarNeeds({productionReferenceAt:H0,parts:[part],
  needs:plan.needs.filter(row=>['wind','waterLevel','waterTemperature'].includes(row.component)),
  privateSupportNeeds:plan.privateSupportNeeds,snapshotInputHashes:snapshots});

function collectionDomainFixture(){
  const H0='2026-08-05T06:00:00.000Z',time=i=>new Date(Date.parse(H0)+i*3600000).toISOString();
  const parts=[{partId:'DOMAIN-EXCLUDED',zoneId:'DK-B02-09',parentZoneId:'DK-B02-09',waterPoint:[10,56],onshoreDirectionDeg:90},
    {partId:'DOMAIN-LIMFJORD',zoneId:'DK-B05-17',parentZoneId:'DK-B05-17',waterPoint:[10,56],onshoreDirectionDeg:90}];
  const waterText=fs.readFileSync(new URL('./scripts/test-water-source-forecast-routing-4.0.100.mjs',import.meta.url),'utf8');
  const begin=waterText.indexOf('const rows=(base,collection,key,samplingPoint)=>');
  const end=waterText.indexOf('\nconst sources=[',begin);
  assert(begin>=0&&end>begin,'EXISTING_NORMAL_WATER_SOURCE_FIXTURE');
  const station={sourceKey:'tidewater:DOMAIN',stationId:'DOMAIN',name:'Syntetisk LF-kilde',sourceType:'forecast-point',
    point:[10,56],registryStatus:'active-forecast-point'};
  const sourceRows=times=>Function('times','generatedAt',waterText.slice(begin,end)+';return rows;')(times,H0)
    (0,'dkss_lf',station.sourceKey,station.point);
  const times=Array.from({length:41},(_,i)=>time(i*3));
  const build=(part,sourceTimes=times)=>{
    const identity=dmiExpectedIdentityForPart(part);
    const native=Function('part','identity','time',fixtureText.slice(from,until)+';return {row,bulk};')(part,identity,time);
    const persisted=Array.from({length:121},(_,i)=>native.row(i));
    for(const [i,row] of persisted.entries()){
      delete row.waterLevelCm;delete row.sources.waterLevel;
      if(part===parts[0]&&i>=4&&i<=40){delete row.windSpeedMps;delete row.windDirectionDeg;delete row.sources.wind;
        delete row.waterTemperatureC;delete row.sources.waterTemperature;}
      if(part===parts[1]&&i>=90){delete row.waterTemperatureC;delete row.sources.waterTemperature;}
    }
    const feature={type:'Feature',geometry:{type:'Point',coordinates:part.waterPoint},
      properties:{id:identity.entityId,dataPoint:part.waterPoint,onshoreDirectionDeg:90}};
    const retained=buildPartDmiForecastWithProtectedRetention(feature,native.bulk,null,H0,
      {startAt:H0,expectedIdentity:identity,persistedHourly:persisted});
    const qualified=verifiedIntegratedPartHourly(retained,native.bulk,identity.entityId,part,{requireNativeGridSampling:false});
    const bulk={generatedAt:H0,timeStrideHours:3,zones:{['SOURCE::'+station.sourceKey]:{hourly:sourceRows(sourceTimes)}}};
    const index=buildWaterSourceForecastIndex([station],bulk,H0);assert.equal(index.size,1);
    const parentFeature={properties:{id:part.zoneId,name:'Syntetisk zone',dataPoint:part.waterPoint,
      coastLine:[[9.9,56],[10.1,56]],onshoreDirectionDeg:90}};
    const routing={zones:{[part.zoneId]:{enabled:true,requireAll:true,method:'manual-weights',
      stations:[{sourceKey:station.sourceKey,weight:1}]}}};
    return applyVerifiedWaterSourceRoutingToPartHourly({part,parentFeature,hourly:qualified,sources:[station],
      index,routing,haversineKm,diagnosticReferenceAt:H0}).hourly;
  };
  const hourly=new Map(parts.map(part=>[part.partId,build(part)]));
  const domainNeeds=buildWeatherComponentNeeds({parts,productionReferenceAt:H0,
    readVerifiedHourly:part=>hourly.get(part.partId)});
  const encodeDomain=plan=>encodeRetainedScalarNeeds({productionReferenceAt:H0,parts,
    needs:plan.needs.filter(row=>['wind','waterLevel','waterTemperature'].includes(row.component)),
    privateSupportNeeds:plan.privateSupportNeeds,snapshotInputHashes:snapshots});
  const currentPairs=parts.flatMap(part=>hourly.get(part.partId).slice(0,118).filter(row=>
    row.currentProvenance?.status==='verified'&&Number.isFinite(row.currentSpeedMps)
      &&Number.isFinite(row.currentDirectionDeg)).map(row=>[part.partId,row.time]));
  assert.equal(currentPairs.length,236,'NORMAL_QUALIFIED_PART_CURRENT_DOMAIN');
  const sourceTail=build(parts[0],times.slice(0,-1));
  assert.equal(sourceTail[117].waterLevelProvenance.collection,'dkss_lf');
  assert.equal(sourceTail[117].waterLevelProvenance.sourceClass,'verified-dmi-water-source-routing');
  assert(Number.isFinite(sourceTail[117].waterLevelCm));assert.equal(sourceTail[117].waterLevelTrendCm3h,null);
  const sourceNeeds=buildWeatherComponentNeeds({parts,productionReferenceAt:H0,
    readVerifiedHourly:part=>part===parts[0]?sourceTail:hourly.get(part.partId)});
  assert(sourceNeeds.needs.some(row=>row.partId===parts[0].partId&&row.validTime===time(117)
    &&row.component==='waterLevel'&&row.gapReason==='TREND_GAP'));
  assert(sourceNeeds.privateSupportNeeds.some(row=>row.partId===parts[0].partId&&row.validTime===time(120)));
  return {reference:H0,targets:parts.map(part=>({partId:part.partId,parentZoneId:part.parentZoneId,waterPoint:part.waterPoint})),
    needs:encodeDomain(domainNeeds),sourceNeeds:encodeDomain(sourceNeeds),early:time(20),late:time(97),
    sourceT:time(117),sourceSupport:time(120),currentPairs};
}
console.log(JSON.stringify({domain:collectionDomainFixture(),waterOnly:encode(needs),optional:encode(optionalNeeds),trend:encode(tailPlan),
  early:time(4),late:time(96),optionalLate:time(95),currentQualified:[currentCoveredAt(4),currentCoveredAt(96)]}));
"""


def check_qualified_production_gaps_precede_native_only_deficits():
    # Run the normal PART retention, sanitizer, SOURCE routing and needs builder.
    # Neither the production classifier priorities nor qualified availability
    # are supplied by this test. Old native UNKNOWN remains UNKNOWN.
    from lib.weather_acquisition_plan import validate_scalar_needs, scalar_gap_components_at
    script = NODE_NORMAL_SCALAR_FIXTURE
    result = subprocess.run(["node", "--input-type=module", "--eval", script], cwd=ROOT,
                            capture_output=True, text=True, timeout=30, check=True)
    document = json.loads(result.stdout)
    assert document["currentQualified"] == [True, True]
    early, late, optional_late = map(producer.canonical_time,
        [document["early"], document["late"], document["optionalLate"]])
    targets = [TARGET]
    qualified = validate_scalar_needs(document["waterOnly"], targets=targets,
                                     production_reference_at=MODEL_RUN)
    optional = validate_scalar_needs(document["optional"], targets=targets,
                                    production_reference_at=MODEL_RUN)
    assert scalar_gap_components_at(qualified, early) == set()
    assert scalar_gap_components_at(qualified, late) == {"waterLevel"}
    assert scalar_gap_components_at(optional, optional_late) == {"waterLevel", "wind", "waterTemperature"}
    # The normal SOURCE value at T is present, but its normal T+3 trend is
    # missing. Encode/compile must preserve the need at BOTH T and T+3.
    trend = validate_scalar_needs(document["trend"], targets=targets,
                                  production_reference_at=MODEL_RUN)
    trend_time = "2026-01-05T21:00:00Z"  # normal fixture H0 + 117h
    support_time = "2026-01-06T00:00:00Z"  # the same normal need + 3h
    assert scalar_gap_components_at(trend, trend_time) == {"waterLevel"}
    assert scalar_gap_components_at(trend, support_time) == {"waterLevel"}
    required_trend_times = set(producer.operational_current_valid_times(
        datetime.fromisoformat(MODEL_RUN.replace("Z", "+00:00"))))
    trend_zone = cached_zone(trend_time)
    trend_zone["hourly"][trend_time]["time"] = trend_time
    assert producer._exact_validated_dmi_component_present(ZONE_ID, trend_zone,
        trend_time, "waterLevel", ("sea-mean-deviation",))
    trend_requirement = producer.classify_dkss_primary_asset(collection="dkss_lf",
        model_run=MODEL_RUN, asset={"valid": trend_time, "id": "normal-trend-gap"},
        target_ids=[TARGET_ID], covered_pair_keys=set(), cached_zones={ZONE_ID: trend_zone},
        active_zone_ids=[ZONE_ID], enabled=True,
        planning_covered_pair_keys={(TARGET_ID, trend_time)},
        required_valid_times=required_trend_times, require_native_grid_sampling=True,
        scalar_gap_plan=trend)
    assert trend_requirement["criticalPriority"] == 0
    assert "waterLevel" in trend_requirement["missingComponentKinds"]
    support_requirement = producer.classify_dkss_primary_asset(collection="dkss_lf",
        model_run=MODEL_RUN,
        asset={"valid": support_time, "id": "normal-private-support", "privateComponentSupport": True},
        target_ids=[TARGET_ID], covered_pair_keys=set(), cached_zones={},
        active_zone_ids=[ZONE_ID], enabled=True, planning_covered_pair_keys=set(),
        required_valid_times=required_trend_times, require_native_grid_sampling=True,
        scalar_gap_plan=trend)
    assert support_requirement["criticalPriority"] == 0
    assert support_requirement["currentMissingPairCount"] == 0
    assert support_requirement["currentNativeDeficitCount"] == 0
    cache = {ZONE_ID: cached_zone(early)}
    for valid in (late, optional_late): cache[ZONE_ID]["hourly"].update(cached_zone(valid)["hourly"])
    for valid in (early, late, optional_late):
        hour = cache[ZONE_ID]["hourly"][valid]; hour["time"] = valid
        hour.pop("sea-mean-deviation"); hour["sources"].pop("waterLevel")
    planning = {(TARGET_ID, value) for value in (early, late, optional_late)}
    required = set(producer.operational_current_valid_times(datetime.fromisoformat(MODEL_RUN.replace("Z", "+00:00"))))
    assets = [{"valid": early, "id": "covered-native-deficit"}, {"valid": late, "id": "genuine-gap"}]
    def classify_all(plan):
        return {asset["valid"]: producer.classify_dkss_primary_asset(collection="dkss_lf",
            model_run=MODEL_RUN, asset=asset, target_ids=[TARGET_ID], covered_pair_keys=set(),
            cached_zones=cache, active_zone_ids=[ZONE_ID], enabled=True,
            planning_covered_pair_keys=planning, required_valid_times=required,
            require_native_grid_sampling=True, scalar_gap_plan=plan) for asset in assets}
    old = classify_all(None); new = classify_all(qualified)
    assert old[early]["criticalPriority"] == old[late]["criticalPriority"] == 0
    assert new[early]["critical"] and not new[early]["deferValidRefresh"]
    assert new[early]["criticalPriority"] == 1 and new[late]["criticalPriority"] == 0
    assert new[early]["currentUpgradePairCount"] == 1
    for requirements, expected in ((old, ["covered-native-deficit", "genuine-gap"]),
                                   (new, ["genuine-gap", "covered-native-deficit"])):
        for suffix in (assets, list(assets)):
            ordered = producer.prioritize_dkss_primary_assets(suffix, [TARGET_ID], planning, requirements,
                direct_valid_times=required, regional_gap_pairs_by_time={},
                verified_reusable_valid_times=set(), critical_cursor_valid_time=None)
            assert [row["id"] for row in ordered] == expected
    # Non-stride optional fields come from the same required native hour asset.
    assert not producer.stride_selected(optional_late, MODEL_RUN)
    original_filter = producer.operational_asset_parameter_filter("dkss_lf", optional_late, MODEL_RUN, required)
    gap_filter = producer.operational_asset_parameter_filter("dkss_lf", optional_late, MODEL_RUN, required,
        scalar_gap_components=scalar_gap_components_at(optional, optional_late))
    assert original_filter == set(producer.REQUIRED_TARGETS["marine"])
    assert gap_filter == original_filter | {"water-temperature", "wind-tail-u-10m", "wind-tail-v-10m"}
    assert producer.operational_asset_parameter_filter("dkss_lf", optional_late, MODEL_RUN, required,
        scalar_gap_components=scalar_gap_components_at(qualified, early)) == original_filter
    # Actual CURRENT holes keep their class even if scalar needs are covered.
    actual_current_gap = producer.classify_dkss_primary_asset(collection="dkss_lf", model_run=MODEL_RUN,
        asset=assets[0], target_ids=[TARGET_ID], covered_pair_keys=set(), cached_zones=cache,
        active_zone_ids=[ZONE_ID], enabled=True, planning_covered_pair_keys=set(),
        required_valid_times=required, require_native_grid_sampling=True, scalar_gap_plan=qualified)
    assert actual_current_gap["criticalPriority"] == 0 and actual_current_gap["currentMissingPairCount"] == 1
    # Collection selection, both time plans and the native filter share the plan.
    calls = [node for node in ast.walk(main_tree) if isinstance(node, ast.Call)
             and isinstance(node.func, ast.Name) and node.func.id == "classify_dkss_primary_asset"]
    assert len(calls) == 4
    for call in calls:
        assert any(keyword.arg == "scalar_gap_plan" and isinstance(keyword.value, ast.Name)
                   and keyword.value.id == "qualified_scalar_gap_plan" for keyword in call.keywords)
    # Reuse the existing normal planning-file fixture for the actual DMI reader.
    # This checks fixed paths and whole file hashes, not provider-value admission.
    fixture = runpy.run_path(str(ROOT / "scripts/test-weather-acquisition-plan.py"))
    from lib.weather_acquisition_plan import build_qualified_acquisition_plan
    with tempfile.TemporaryDirectory() as root:
        scalar, _ = fixture["QualifiedScalarPlanTests"]().make_scalar(root,
            value_gaps=[(0, 96, "wind")])
        current = fixture["plan"]()
        target_rows = fixture["TARGETS"]
        reference = fixture["BASE"]
        qualified_path = Path(root) / "v2.json"
        current_path = Path(root) / "v1.json"
        current_path.write_text(json.dumps(current), encoding="utf-8")
        qualified_path.write_text(json.dumps(build_qualified_acquisition_plan(current, scalar,
            targets=target_rows, production_reference_at=reference)), encoding="utf-8")
        previous = os.getcwd()
        try:
            os.chdir(root)
            with patch.dict(os.environ, {
                "DMI_BULK_QUALIFIED_ACQUISITION_PLAN_PATH": str(qualified_path),
                "DMI_BULK_CURRENT_ACQUISITION_PLAN_PATH": str(current_path),
                "DMI_BULK_SCALAR_SNAPSHOT_PATH": str(Path(root) / "dmi.json"),
                "DMI_PART_CONTINUITY_DONOR_PATH": "",
            }):
                compiled, diagnostic = producer.load_qualified_scalar_acquisition_planning(
                    target_rows, reference, set())
                assert diagnostic["valid"] and diagnostic["sourceAdmission"] is False
                assert scalar_gap_components_at(compiled, fixture["at"](96)) == {"wind"}
        finally:
            os.chdir(previous)

    # A real scalar hole in the LF-excluded parent cannot make every LF hour
    # critical before a later, normally eligible Limfjord temperature gap.
    domain = document["domain"]
    domain_reference = datetime.fromisoformat(domain["reference"].replace("Z", "+00:00"))
    domain_targets = domain["targets"]
    domain_ids = [row["partId"] for row in domain_targets]
    domain_plan = validate_scalar_needs(domain["needs"], targets=domain_targets,
                                      production_reference_at=domain_reference)
    early_domain, late_domain = map(producer.canonical_time, [domain["early"], domain["late"]])
    domain_required = set(producer.operational_current_valid_times(domain_reference))
    domain_current = {(part_id, producer.canonical_time(valid)) for part_id, valid in domain["currentPairs"]}
    assert scalar_gap_components_at(domain_plan, early_domain) == {"wind", "waterTemperature"}
    assert scalar_gap_components_at(domain_plan, late_domain) == {"waterTemperature"}
    domain_assets = [{"valid": early_domain, "id": "ineligible-scalar-native-upgrade"},
                     {"valid": late_domain, "id": "eligible-scalar-tail"}]
    def domain_requirement(collection, asset, plan=domain_plan, ids=domain_ids):
        return producer.classify_dkss_primary_asset(collection=collection,
            model_run="2026-08-05T00:00:00Z", asset=asset, target_ids=ids,
            covered_pair_keys=set(), cached_zones={},
            active_zone_ids=["PART::"+part_id for part_id in ids], enabled=True,
            planning_covered_pair_keys=domain_current, required_valid_times=domain_required,
            require_native_grid_sampling=True, scalar_gap_plan=plan)
    requirements = {asset["valid"]: domain_requirement("dkss_lf", asset) for asset in domain_assets}
    order = producer.prioritize_dkss_primary_assets(domain_assets, domain_ids, domain_current, requirements,
        direct_valid_times=domain_required, regional_gap_pairs_by_time={},
        verified_reusable_valid_times=set(), critical_cursor_valid_time=None)
    assert [asset["id"] for asset in order] == ["eligible-scalar-tail", "ineligible-scalar-native-upgrade"], \
        "DMI_COLLECTION_SCALAR_DOMAIN_GAP_REGRESSION"
    assert requirements[early_domain]["criticalPriority"] == 1
    assert requirements[early_domain]["critical"] is True
    assert requirements[late_domain]["criticalPriority"] == 0
    assert domain_requirement("dkss_idw", domain_assets[0])["criticalPriority"] == 0
    assert domain_requirement("dkss_lf", domain_assets[0], ids=[domain_ids[1]])["criticalPriority"] == 1
    early_components = producer.qualified_scalar_gap_components_for_asset(
        domain_plan, "dkss_lf", early_domain, domain_ids)
    late_components = producer.qualified_scalar_gap_components_for_asset(
        domain_plan, "dkss_lf", late_domain, domain_ids)
    assert early_components == set()
    assert late_components == {"waterTemperature"}
    assert producer.qualified_scalar_gap_components_for_asset(
        domain_plan, "dkss_idw", early_domain, domain_ids) == {"wind", "waterTemperature"}
    for valid, components, extras in [(early_domain, early_components, set()),
                                      (late_domain, late_components, {"water-temperature"})]:
        assert not producer.stride_selected(valid, "2026-08-05T00:00:00Z")
        actual_filter = producer.operational_asset_parameter_filter("dkss_lf", valid,
            "2026-08-05T00:00:00Z", domain_required, scalar_gap_components=components)
        assert actual_filter == set(producer.REQUIRED_TARGETS["marine"]) | extras
    unknown_context = copy.deepcopy(domain_plan)
    unknown_context["parentZoneIds"].pop(domain_ids[0])
    assert producer.qualified_scalar_gap_components_for_asset(
        unknown_context, "dkss_lf", early_domain, domain_ids) is None
    assert domain_requirement("dkss_lf", domain_assets[0], unknown_context)["criticalPriority"] == 0
    source_plan = validate_scalar_needs(domain["sourceNeeds"], targets=domain_targets,
                                      production_reference_at=domain_reference)
    source_t = producer.canonical_time(domain["sourceT"])
    source_support = producer.canonical_time(domain["sourceSupport"])
    source_requirement = domain_requirement("dkss_lf", {"valid":source_t}, source_plan, [domain_ids[0]])
    support_requirement = domain_requirement("dkss_lf", {"valid":source_support,"privateComponentSupport":True},
                                            source_plan, [domain_ids[0]])
    assert source_requirement["criticalPriority"] == support_requirement["criticalPriority"] == 0
    assert support_requirement["currentMissingPairCount"] == support_requirement["currentNativeDeficitCount"] == 0
    assert producer.qualified_scalar_gap_components_for_asset(source_plan, "dkss_lf", source_t,
        [domain_ids[0]]) == {"waterLevel"}
    assert producer.qualified_scalar_gap_components_for_asset(source_plan, "dkss_lf", source_support,
        [domain_ids[0]]) == {"waterLevel"}
    filter_calls = [node for node in ast.walk(main_tree) if isinstance(node, ast.Call)
                    and isinstance(node.func, ast.Name) and node.func.id == "operational_asset_parameter_filter"]
    assert len(filter_calls) == 1
    scalar_filter = next(keyword.value for keyword in filter_calls[0].keywords
                         if keyword.arg == "scalar_gap_components")
    assert any(isinstance(node, ast.Call) and isinstance(node.func, ast.Name)
               and node.func.id == "qualified_scalar_gap_components_for_asset"
               for node in ast.walk(scalar_filter))

    print("DMI qualified scalar priority OK: normal PART/SOURCE needs, optional hourly decode, old fallback preserved")

check_qualified_production_gaps_precede_native_only_deficits()

def check_qualified_broad_tail_holes_precede_sparse_front_and_native_takeovers():
    from lib.weather_acquisition_plan import validate_scalar_needs
    fixture = runpy.run_path(str(ROOT / "scripts/test-weather-acquisition-plan.py"))
    with tempfile.TemporaryDirectory() as root:
        # These are normal scalar-needs-file fixtures with exact snapshot
        # hashes/target registry and normal T+3 support masks.
        scalar, _ = fixture["QualifiedScalarPlanTests"]().make_scalar(root,
            value_gaps=[(0, 0, "waterLevel"), (0, 1, "waterLevel"), (0, 2, "waterLevel"),
                        (0, 4, "waterLevel"), (0, 96, "waterLevel"), (1, 96, "waterLevel")])
        targets = fixture["TARGETS"]
        reference = fixture["BASE"]
        plan = validate_scalar_needs(scalar, targets=targets, production_reference_at=reference)
        times = [fixture["at"](i) for i in (0, 1, 2, 4, 96, 97)]
        assets = [{"valid": valid, "id": str(index)} for index, valid in enumerate(times)]
        ids = [row["partId"] for row in targets]
        covered = {(part_id, valid) for part_id in ids for valid in times}
        requirements = {valid: producer.classify_dkss_primary_asset(
            collection="dkss_idw", model_run=fixture["at"](), asset={"valid":valid},
            target_ids=ids, covered_pair_keys=covered, cached_zones={},
            active_zone_ids=[f"PART::{part_id}" for part_id in ids], enabled=True,
            planning_covered_pair_keys=covered, required_valid_times=set(times),
            require_native_grid_sampling=True, scalar_gap_plan=plan) for valid in times}
        sparse, broad, upgrade = fixture["at"](4), fixture["at"](96), fixture["at"](97)
        assert requirements[sparse]["criticalPriority"] == requirements[broad]["criticalPriority"] == 0
        ordered = producer.prioritize_dkss_primary_assets(assets, ids, covered, requirements,
            direct_valid_times=set(times), regional_gap_pairs_by_time={},
            verified_reusable_valid_times=set(), critical_cursor_valid_time=fixture["at"](3))
        order = [row["valid"] for row in ordered]
        assert order[:3] == times[:3], "FIRST_THREE_REAL_HOLE_HOURS_MUST_KEEP_THEIR_FOUNDATION_ORDER"
        assert order.index(broad) < order.index(sparse), "BROAD_REAL_TAIL_HOLE_STARVED_BY_UNIQUE_TIME_BEFORE_GAP_COUNT"
        assert order.index(sparse) < order.index(upgrade), "NATIVE_TAKEOVER_PRECEDED_RETAINED_WEATHER_HOLE"
        assert requirements[sparse]["retainedScalarGapPairCount"] == 1
        assert requirements[broad]["retainedScalarGapPairCount"] == 2
        assert requirements[upgrade]["retainedScalarGapPairCount"] == 0
        assert requirements[upgrade]["criticalPriority"] == 1
        assert requirements[broad]["currentMissingPairCount"] == 0
        # Neither newer original inventory nor unknown plan creates a count.
        unknown = producer.classify_dkss_primary_asset(collection="dkss_idw",
            model_run=fixture["at"](), asset={"valid":broad}, target_ids=ids,
            covered_pair_keys=covered, cached_zones={}, active_zone_ids=[f"PART::{p}" for p in ids],
            enabled=True, planning_covered_pair_keys=covered, required_valid_times=set(times),
            require_native_grid_sampling=True, scalar_gap_plan=None)
        assert unknown.get("retainedScalarPlanQualified") is not True
        assert unknown.get("retainedScalarGapPairCount") is None
    print("DMI broad qualified tail priority OK: real retained masks, sparse front, native takeover, unknown plan")


check_qualified_broad_tail_holes_precede_sparse_front_and_native_takeovers()
