#!/usr/bin/env python3
from __future__ import annotations

import copy
import hashlib
import json
import math
import subprocess
import sys
import tempfile
import unittest
from dataclasses import replace
from datetime import timedelta
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import patch


ROOT = Path(__file__).resolve().parents[1]
SCRIPTS = ROOT / "scripts"
if str(SCRIPTS) not in sys.path:
    sys.path.insert(0, str(SCRIPTS))

from lib.dmi_wave_history_bootstrap import (  # noqa: E402
    COLD_START_MODE,
    COLD_START_POLICY,
    MIGRATION_MODE,
    MIGRATION_POLICY,
    ValidationBudget,
    WaveBootstrapError,
    WaveHistoryPolicy,
    format_utc_hour,
    load_coastal_part_registry,
    parse_utc_hour,
    policy_utc_hours,
    select_stac_wave_history_assets,
    validate_wave_history_cache,
    validate_wave_operational_handoff_cache,
)
from lib.dmi_native_provenance import (  # noqa: E402
    WAM_MAX_DISTANCE_KM,
    haversine_point_km,
    wave_distance_allowed,
)
import validate_dmi_wave_history_bootstrap as bootstrap_cli  # noqa: E402


TARGET = "2026-08-30T12:00:00Z"
COLLECTION = "wam_dw"


class _SanitizedSummary:
    def __init__(self, payload: dict) -> None:
        self.payload = payload

    def sanitized_attestation(self) -> dict:
        return dict(self.payload)


def utc_offset(base: str, hours: int) -> str:
    return format_utc_hour(parse_utc_hour(base) + timedelta(hours=hours))


def point_north_km(point: tuple[float, float], distance_km: float) -> tuple[float, float]:
    return (
        point[0],
        point[1] + math.degrees(distance_km / 6371.0088),
    )


def stac_item(
    valid_time: str,
    model_run: str,
    *,
    collection: str = COLLECTION,
    suffix: str = "a",
    token: str = "private-query-token",
) -> dict:
    compact = valid_time.replace("-", "").replace(":", "")
    return {
        "type": "Feature",
        "collection": collection,
        "id": f"wam-{compact}-{suffix}",
        "properties": {
            "forecast:reference_datetime": model_run,
            "datetime": valid_time,
            "created": model_run,
        },
        "assets": {
            "data": {
                "href": f"https://example.invalid/wam/{compact}-{suffix}.grib2?token={token}",
                "type": "application/x-grib",
                "roles": ["data"],
                "file:size": 3_000_000,
            },
        },
    }


def stac_document(items: list[dict]) -> dict:
    return {"type": "FeatureCollection", "features": items}


def registry_document(
    part_count: int,
    *,
    secret_part_id: str | None = None,
    secret_point: tuple[float, float] | None = None,
) -> dict:
    rows = []
    for index in range(part_count):
        part_id = secret_part_id if index == 0 and secret_part_id else f"part-{index:03d}"
        water_point = (
            list(secret_point)
            if index == 0 and secret_point
            else [10.0 + index / 100_000, 56.0 + index / 100_000]
        )
        rows.append({
            "partId": part_id,
            "sourceZoneId": "ZONE-1",
            "waterPoint": water_point,
        })
    return {
        "schemaVersion": 2,
        "enabled": True,
        "partCount": part_count,
        "sourcePartCount": part_count,
        "zoneCount": 1,
        "zones": {"ZONE-1": rows},
    }


def native_source(
    part,
    valid_time: str,
    model_run: str,
    *,
    collection: str = COLLECTION,
    grid_point: tuple[float, float] | None = None,
    grid_sha: str = "a" * 64,
    direction_available: bool = True,
) -> dict:
    valid = parse_utc_hour(valid_time)
    run = parse_utc_hour(model_run)
    point = tuple(grid_point or part.water_point)
    return {
        "provider": "dmi",
        "fallback": False,
        "collection": collection,
        "collectionFamily": "wave",
        "component": "wave",
        "componentKind": "wave-mobilisation-tuple",
        "fieldSet": ["significant-wave-height", "dominant-wave-period"],
        "optionalFieldSet": ["mean-wave-dir"] if direction_available else [],
        "modelRun": model_run,
        "nativeValidTime": valid_time,
        "leadTimeHours": (valid - run).total_seconds() / 3600,
        "entityId": part.cache_key,
        "parentZoneId": part.parent_zone_id,
        "entityType": "coastal-part",
        "samplingContext": "coastal-part-water-point",
        "samplingPoint": list(part.water_point),
        "gridPoint": list(point),
        "gridDefinitionSha256": grid_sha,
        "distanceKm": haversine_point_km(part.water_point, point),
        "spatialSelection":
            "nearest-shared-wave-height-period-grid-cell-no-spatial-interpolation",
        "spatialSemanticsVersion": 1,
        "itemId": f"item-{valid_time.replace(':', '').replace('-', '')}",
        "assetIdentitySha256": "b" * 64,
        "acquiredAt": TARGET,
    }


def native_hour(
    part,
    valid_time: str,
    model_run: str,
    *,
    collection: str = COLLECTION,
    height: float = 1.0,
    period: float = 6.0,
    direction: float | None = 270.0,
    grid_point: tuple[float, float] | None = None,
    grid_sha: str = "a" * 64,
) -> dict:
    row = {
        "time": valid_time,
        "significant-wave-height": height,
        "dominant-wave-period": period,
        "sources": {
            "wave": native_source(
                part,
                valid_time,
                model_run,
                collection=collection,
                grid_point=grid_point,
                grid_sha=grid_sha,
                direction_available=direction is not None,
            ),
        },
    }
    if direction is not None:
        row["mean-wave-dir"] = direction
    return row


def cache_for_registry(
    registry,
    rows_for_part,
) -> dict:
    return {
        "schemaVersion": 2,
        "zoneRegistrySignature": "c" * 16,
        "zones": {
            part.cache_key: {"hourly": rows_for_part(part)}
            for part in registry.parts
        },
    }


def expect_code(test_case: unittest.TestCase, code: str, callback) -> None:
    with test_case.assertRaises(WaveBootstrapError) as raised:
        callback()
    test_case.assertEqual(raised.exception.code, code)
    test_case.assertNotIn("PART::", str(raised.exception))


class StacSelectionTests(unittest.TestCase):
    def test_migration_profile_and_deterministic_coherent_selection(self) -> None:
        self.assertEqual(MIGRATION_POLICY.history_hours, 40)
        self.assertFalse(MIGRATION_POLICY.include_target)
        self.assertEqual(MIGRATION_POLICY.required_hour_count, 40)
        self.assertEqual(MIGRATION_POLICY.omitted_tail_bound, 1 / 1024)
        self.assertEqual(
            MIGRATION_POLICY.conservative_max_raw_ravscore_error,
            0.01171875,
        )
        required = policy_utc_hours(TARGET, MIGRATION_POLICY)
        self.assertEqual(required[0], utc_offset(TARGET, -40))
        self.assertEqual(required[-1], utc_offset(TARGET, -1))

        old_run = utc_offset(TARGET, -48)
        preferred_run = utc_offset(TARGET, -42)
        items = [
            stac_item(hour, old_run, suffix=f"old-{index}")
            for index, hour in enumerate(required)
        ]
        items += [
            stac_item(hour, preferred_run, suffix=f"new-{index}")
            for index, hour in enumerate(required)
        ]
        first = select_stac_wave_history_assets(
            stac_document(items),
            collection=COLLECTION,
            target_hour=TARGET,
            policy=MIGRATION_POLICY,
        )
        second = select_stac_wave_history_assets(
            stac_document(list(reversed(items))),
            collection=COLLECTION,
            target_hour=TARGET,
            policy=MIGRATION_POLICY,
        )
        self.assertEqual(first.assets, second.assets)
        self.assertEqual(first.selection_mode, "single-coherent-run")
        self.assertEqual(len(first.assets), 40)
        self.assertEqual({row.model_run for row in first.assets}, {preferred_run})
        attestation = json.dumps(first.sanitized_attestation(), sort_keys=True)
        self.assertNotIn("private-query-token", attestation)
        self.assertNotIn("https://", attestation)
        self.assertNotIn("wam-2026", attestation)

    def test_genuine_cold_start_exact_multi_run_seam(self) -> None:
        self.assertEqual(COLD_START_POLICY.maximum_interpolation_hours, 0)
        required = policy_utc_hours(TARGET, COLD_START_POLICY)
        self.assertEqual(len(required), 49)
        first_run = utc_offset(TARGET, -60)
        second_run = utc_offset(TARGET, -24)
        split = 25
        items = [
            stac_item(
                hour,
                first_run if index < split else second_run,
                suffix=f"seam-{index}",
            )
            for index, hour in enumerate(required)
        ]
        plan = select_stac_wave_history_assets(
            stac_document(items),
            collection=COLLECTION,
            target_hour=TARGET,
            policy=COLD_START_POLICY,
        )
        self.assertEqual(plan.selection_mode, "exact-hour-multi-run")
        self.assertEqual(len(plan.assets), 49)
        self.assertEqual(len({row.model_run for row in plan.assets}), 2)
        missing_exact = [item for index, item in enumerate(items) if index != 12]
        expect_code(
            self,
            "NO_COHERENT_RUN",
            lambda: select_stac_wave_history_assets(
                stac_document(missing_exact),
                collection=COLLECTION,
                target_hour=TARGET,
                policy=COLD_START_POLICY,
            ),
        )

    def test_asset_identity_matches_cache_contract_and_ignores_query_rotation(self) -> None:
        policy = replace(MIGRATION_POLICY, history_hours=1)
        valid = policy_utc_hours(TARGET, policy)[0]
        run = utc_offset(TARGET, -8)
        first = select_stac_wave_history_assets(
            stac_document([stac_item(valid, run, token="first-secret")]),
            collection=COLLECTION,
            target_hour=TARGET,
            policy=policy,
        )
        rotated = select_stac_wave_history_assets(
            stac_document([stac_item(valid, run, token="rotated-secret")]),
            collection=COLLECTION,
            target_hour=TARGET,
            policy=policy,
        )
        canonical_href = first.assets[0].href.split("?", 1)[0].split("#", 1)[0]
        expected_identity = hashlib.sha256(canonical_href.encode("utf-8")).hexdigest()
        self.assertEqual(first.assets[0].asset_identity_sha256, expected_identity)
        self.assertEqual(
            first.assets[0].asset_identity_sha256,
            rotated.assets[0].asset_identity_sha256,
        )
        self.assertEqual(
            first.assets[0].selection_entry_sha256,
            rotated.assets[0].selection_entry_sha256,
        )
        self.assertEqual(
            first.sanitized_attestation()["selectionSha256"],
            rotated.sanitized_attestation()["selectionSha256"],
        )

    def test_strict_run_valid_id_href_and_causality(self) -> None:
        valid = utc_offset(TARGET, -2)
        run = utc_offset(TARGET, -6)
        base = stac_item(valid, run)
        cases = []
        missing_run = copy.deepcopy(base)
        missing_run["properties"].pop("forecast:reference_datetime")
        cases.append(("MISSING_RUN", missing_run))
        missing_valid = copy.deepcopy(base)
        missing_valid["properties"].pop("datetime")
        cases.append(("MISSING_VALID", missing_valid))
        missing_id = copy.deepcopy(base)
        missing_id.pop("id")
        cases.append(("MISSING_ITEM_ID", missing_id))
        missing_href = copy.deepcopy(base)
        missing_href["assets"]["data"].pop("href")
        cases.append(("MISSING_HREF", missing_href))
        future_run = copy.deepcopy(base)
        future_run["properties"]["forecast:reference_datetime"] = utc_offset(valid, 1)
        cases.append(("FUTURE_RUN", future_run))
        unsafe_href = copy.deepcopy(base)
        unsafe_href["assets"]["data"]["href"] = "http://example.invalid/file.grib2"
        cases.append(("INVALID_HREF", unsafe_href))
        for code, item in cases:
            with self.subTest(code=code):
                expect_code(
                    self,
                    code,
                    lambda item=item: select_stac_wave_history_assets(
                        stac_document([item]),
                        collection=COLLECTION,
                        target_hour=TARGET,
                        policy=replace(
                            MIGRATION_POLICY,
                            history_hours=1,
                        ),
                    ),
                )

    def test_official_singular_plural_and_conflicting_asset_forms(self) -> None:
        policy = replace(MIGRATION_POLICY, history_hours=1)
        valid = policy_utc_hours(TARGET, policy)[0]
        run = utc_offset(TARGET, -8)

        plural = stac_item(valid, run, suffix="plural")
        plural_plan = select_stac_wave_history_assets(
            stac_document([plural]),
            collection=COLLECTION,
            target_hour=TARGET,
            policy=policy,
        )
        self.assertEqual(len(plural_plan.assets), 1)

        singular_direct = stac_item(valid, run, suffix="singular-direct")
        singular_direct["asset"] = singular_direct.pop("assets")["data"]
        direct_plan = select_stac_wave_history_assets(
            stac_document([singular_direct]),
            collection=COLLECTION,
            target_hour=TARGET,
            policy=policy,
        )
        self.assertEqual(len(direct_plan.assets), 1)

        singular_map = stac_item(valid, run, suffix="singular-map")
        singular_map["asset"] = singular_map.pop("assets")
        map_plan = select_stac_wave_history_assets(
            stac_document([singular_map]),
            collection=COLLECTION,
            target_hour=TARGET,
            policy=policy,
        )
        self.assertEqual(len(map_plan.assets), 1)

        conflict = stac_item(valid, run, suffix="conflict")
        conflict["asset"] = {
            "href": "https://example.invalid/wam/conflicting.grib2",
            "type": "application/x-grib",
            "roles": ["data"],
            "file:size": 3_000_000,
        }
        expect_code(
            self,
            "AMBIGUOUS_GRIB_ASSET",
            lambda: select_stac_wave_history_assets(
                stac_document([conflict]),
                collection=COLLECTION,
                target_hour=TARGET,
                policy=policy,
            ),
        )

    def test_catalog_and_selected_asset_budgets_fail_closed(self) -> None:
        required = policy_utc_hours(TARGET, replace(MIGRATION_POLICY, history_hours=2))
        run = utc_offset(TARGET, -8)
        items = [
            stac_item(hour, run, suffix=str(index))
            for index, hour in enumerate(required)
        ]
        expect_code(
            self,
            "ASSET_BUDGET",
            lambda: select_stac_wave_history_assets(
                stac_document(items),
                collection=COLLECTION,
                target_hour=TARGET,
                policy=replace(
                    MIGRATION_POLICY,
                    history_hours=2,
                    maximum_stac_items=1,
                ),
            ),
        )
        expect_code(
            self,
            "ASSET_BUDGET",
            lambda: select_stac_wave_history_assets(
                stac_document(items),
                collection=COLLECTION,
                target_hour=TARGET,
                policy=replace(
                    MIGRATION_POLICY,
                    history_hours=2,
                    maximum_selected_assets=1,
                ),
            ),
        )


class CacheValidationTests(unittest.TestCase):
    def setUp(self) -> None:
        self.registry = load_coastal_part_registry(
            registry_document(2),
            expected_part_count=2,
        )

    def test_migration_validates_40_exact_hours_and_one_run(self) -> None:
        required = policy_utc_hours(TARGET, MIGRATION_POLICY)
        run = utc_offset(TARGET, -48)
        cache = cache_for_registry(
            self.registry,
            lambda part: {
                hour: native_hour(part, hour, run)
                for hour in required
            },
        )
        summary = validate_wave_history_cache(
            cache,
            self.registry,
            target_hour=TARGET,
            policy=MIGRATION_POLICY,
        )
        self.assertEqual(summary.required_hour_count, 40)
        self.assertEqual(summary.verified_part_hour_count, 80)
        self.assertEqual(summary.exact_tuple_count, 80)
        self.assertEqual(summary.interpolated_tuple_count, 0)
        self.assertEqual(summary.coherent_run_count, 1)
        attestation = json.dumps(summary.sanitized_attestation(), sort_keys=True)
        for part in self.registry.parts:
            self.assertNotIn(part.part_id, attestation)
            self.assertNotIn(str(part.water_point[0]), attestation)
            self.assertNotIn(str(part.water_point[1]), attestation)
        self.assertNotIn("270.0", attestation)

    def test_genuine_cold_start_cache_requires_all_exact_native_hours(self) -> None:
        required = policy_utc_hours(TARGET, COLD_START_POLICY)
        first_run = utc_offset(TARGET, -60)
        second_run = utc_offset(TARGET, -24)
        cache = cache_for_registry(
            self.registry,
            lambda part: {
                hour: native_hour(
                    part,
                    hour,
                    first_run if index < 25 else second_run,
                )
                for index, hour in enumerate(required)
            },
        )
        summary = validate_wave_history_cache(
            cache,
            self.registry,
            target_hour=TARGET,
            policy=COLD_START_POLICY,
        )
        self.assertEqual(summary.exact_tuple_count, 98)
        self.assertEqual(summary.interpolated_tuple_count, 0)

        missing_hour = required[12]
        for part in self.registry.parts:
            del cache["zones"][part.cache_key]["hourly"][missing_hour]
        expect_code(
            self,
            "INTERPOLATION_GAP",
            lambda: validate_wave_history_cache(
                cache,
                self.registry,
                target_hour=TARGET,
                policy=COLD_START_POLICY,
            ),
        )

    def test_safe_same_run_four_hour_interpolation(self) -> None:
        policy = WaveHistoryPolicy(
            mode=MIGRATION_MODE,
            history_hours=4,
            include_target=False,
            require_single_run_per_collection=False,
            allow_exact_multi_run=True,
        )
        run = utc_offset(TARGET, -12)
        start = utc_offset(TARGET, -4)
        cache = cache_for_registry(
            self.registry,
            lambda part: {
                start: native_hour(part, start, run, direction=359.0),
                TARGET: native_hour(part, TARGET, run, direction=3.0),
            },
        )
        summary = validate_wave_history_cache(
            cache,
            self.registry,
            target_hour=TARGET,
            policy=policy,
        )
        self.assertEqual(summary.exact_tuple_count, 2)
        self.assertEqual(summary.interpolated_tuple_count, 6)

    def test_exact_multi_run_seam_is_allowed_only_without_interpolation(self) -> None:
        policy = WaveHistoryPolicy(
            mode=COLD_START_MODE,
            history_hours=4,
            include_target=False,
            require_single_run_per_collection=False,
            allow_exact_multi_run=True,
            maximum_interpolation_hours=0,
        )
        required = policy_utc_hours(TARGET, policy)
        first_run = utc_offset(TARGET, -12)
        second_run = utc_offset(TARGET, -3)
        cache = cache_for_registry(
            self.registry,
            lambda part: {
                hour: native_hour(
                    part,
                    hour,
                    first_run if index < 2 else second_run,
                )
                for index, hour in enumerate(required)
            },
        )
        summary = validate_wave_history_cache(
            cache,
            self.registry,
            target_hour=TARGET,
            policy=policy,
        )
        self.assertEqual(summary.exact_tuple_count, 8)
        self.assertEqual(summary.interpolated_tuple_count, 0)
        self.assertEqual(summary.coherent_run_count, 2)

    def test_mixed_run_interpolation_is_rejected(self) -> None:
        policy = WaveHistoryPolicy(
            mode=MIGRATION_MODE,
            history_hours=3,
            include_target=False,
            require_single_run_per_collection=False,
            allow_exact_multi_run=True,
        )
        first = utc_offset(TARGET, -3)
        last = utc_offset(TARGET, -1)
        cache = cache_for_registry(
            self.registry,
            lambda part: {
                first: native_hour(part, first, utc_offset(TARGET, -12)),
                last: native_hour(part, last, utc_offset(TARGET, -2)),
            },
        )
        expect_code(
            self,
            "MIXED_RUN_INTERPOLATION",
            lambda: validate_wave_history_cache(
                cache,
                self.registry,
                target_hour=TARGET,
                policy=policy,
            ),
        )

    def test_exact_history_requires_one_native_cell_per_part(self) -> None:
        policy = replace(MIGRATION_POLICY, history_hours=2)
        required = policy_utc_hours(TARGET, policy)
        run = utc_offset(TARGET, -8)
        for switch in ("grid-point", "grid-definition"):
            with self.subTest(switch=switch):
                def switched_rows(part) -> dict:
                    second = native_hour(
                        part,
                        required[1],
                        run,
                        grid_point=(
                            part.water_point[0] + 0.01,
                            part.water_point[1],
                        ) if switch == "grid-point" else None,
                        grid_sha=(
                            "d" * 64
                            if switch == "grid-definition"
                            else "a" * 64
                        ),
                    )
                    if switch == "grid-point":
                        source = second["sources"]["wave"]
                        source["distanceKm"] = haversine_point_km(
                            source["samplingPoint"],
                            source["gridPoint"],
                        )
                    return {
                        required[0]: native_hour(part, required[0], run),
                        required[1]: second,
                    }

                cache = cache_for_registry(
                    self.registry,
                    switched_rows,
                )
                expect_code(
                    self,
                    "MIXED_CELL_HISTORY",
                    lambda cache=cache: validate_wave_history_cache(
                        cache,
                        self.registry,
                        target_hour=TARGET,
                        policy=policy,
                    ),
                )

        same_cell_cache = cache_for_registry(
            self.registry,
            lambda part: {
                hour: native_hour(part, hour, run)
                for hour in required
            },
        )
        summary = validate_wave_history_cache(
            same_cell_cache,
            self.registry,
            target_hour=TARGET,
            policy=policy,
        )
        self.assertEqual(summary.exact_tuple_count, 4)
        self.assertEqual(summary.interpolated_tuple_count, 0)

    def test_collection_distance_policy_and_aggregate_attestation(self) -> None:
        self.assertEqual(
            WAM_MAX_DISTANCE_KM,
            {"wam_dw": 2.0, "wam_nsb": 8.0},
        )
        for collection, maximum in WAM_MAX_DISTANCE_KM.items():
            with self.subTest(collection=collection):
                self.assertTrue(wave_distance_allowed(collection, maximum))
                for invalid in (maximum + 1e-9, -1, True, str(maximum), math.nan):
                    self.assertFalse(wave_distance_allowed(collection, invalid))

                policy = replace(MIGRATION_POLICY, history_hours=1)
                required = policy_utc_hours(TARGET, policy)
                run = utc_offset(TARGET, -8)
                accepted_cache = cache_for_registry(
                    self.registry,
                    lambda part: {
                        required[0]: native_hour(
                            part,
                            required[0],
                            run,
                            collection=collection,
                            grid_point=point_north_km(
                                part.water_point,
                                maximum * (1 - 1e-10),
                            ),
                        ),
                    },
                )
                summary = validate_wave_history_cache(
                    accepted_cache,
                    self.registry,
                    target_hour=TARGET,
                    policy=policy,
                )
                attestation = summary.sanitized_attestation()
                self.assertEqual(
                    attestation["waveMaximumDistanceKmByCollection"],
                    WAM_MAX_DISTANCE_KM,
                )
                self.assertEqual(
                    attestation["nativeDistanceEvidenceCountByCollection"][collection],
                    self.registry.part_count,
                )
                self.assertLessEqual(
                    attestation["maximumNativeDistanceKmByCollection"][collection],
                    maximum,
                )

                rejected_cache = cache_for_registry(
                    self.registry,
                    lambda part: {
                        required[0]: native_hour(
                            part,
                            required[0],
                            run,
                            collection=collection,
                            grid_point=point_north_km(
                                part.water_point,
                                maximum + 0.001,
                            ),
                        ),
                    },
                )
                expect_code(
                    self,
                    "WAVE_DISTANCE_OUT_OF_BOUNDS",
                    lambda rejected_cache=rejected_cache: validate_wave_history_cache(
                        rejected_cache,
                        self.registry,
                        target_hour=TARGET,
                        policy=policy,
                    ),
                )

    def test_missing_direction_cell_and_provenance_fail_closed(self) -> None:
        policy = replace(MIGRATION_POLICY, history_hours=1)
        required = policy_utc_hours(TARGET, policy)
        run = utc_offset(TARGET, -8)
        base = cache_for_registry(
            self.registry,
            lambda part: {
                required[0]: native_hour(part, required[0], run),
            },
        )
        cases = []
        missing_direction = cache_for_registry(
            self.registry,
            lambda part: {
                required[0]: native_hour(
                    part,
                    required[0],
                    run,
                    height=1.0,
                    period=6.0,
                    direction=None,
                ),
            },
        )
        cases.append(("MISSING_DIRECTION", missing_direction))
        missing_cell = copy.deepcopy(base)
        first_zone = next(iter(missing_cell["zones"].values()))
        first_hour = next(iter(first_zone["hourly"].values()))
        first_hour["sources"]["wave"].pop("gridPoint")
        cases.append(("MISSING_CELL", missing_cell))
        missing_provenance = copy.deepcopy(base)
        first_zone = next(iter(missing_provenance["zones"].values()))
        first_hour = next(iter(first_zone["hourly"].values()))
        first_hour.pop("sources")
        cases.append(("MISSING_PROVENANCE", missing_provenance))
        for code, cache in cases:
            with self.subTest(code=code):
                expect_code(
                    self,
                    code,
                    lambda cache=cache: validate_wave_history_cache(
                        cache,
                        self.registry,
                        target_hour=TARGET,
                        policy=policy,
                    ),
                )

    def test_directionless_exact_calm_is_valid(self) -> None:
        policy = replace(MIGRATION_POLICY, history_hours=1)
        required = policy_utc_hours(TARGET, policy)
        run = utc_offset(TARGET, -8)
        cache = cache_for_registry(
            self.registry,
            lambda part: {
                required[0]: native_hour(
                    part,
                    required[0],
                    run,
                    height=0.0,
                    period=6.0,
                    direction=None,
                ),
            },
        )
        summary = validate_wave_history_cache(
            cache,
            self.registry,
            target_hour=TARGET,
            policy=policy,
        )
        self.assertEqual(summary.exact_tuple_count, 2)
        self.assertEqual(summary.interpolated_tuple_count, 0)

    def test_positive_height_with_zero_period_is_invalid(self) -> None:
        policy = replace(MIGRATION_POLICY, history_hours=1)
        required = policy_utc_hours(TARGET, policy)
        run = utc_offset(TARGET, -8)
        cache = cache_for_registry(
            self.registry,
            lambda part: {
                required[0]: native_hour(
                    part,
                    required[0],
                    run,
                    height=1.0,
                    period=0.0,
                    direction=270.0,
                ),
            },
        )
        expect_code(
            self,
            "INVALID_WAVE_TUPLE",
            lambda: validate_wave_history_cache(
                cache,
                self.registry,
                target_hour=TARGET,
                policy=policy,
            ),
        )

    def test_calm_to_active_interpolation_does_not_invent_direction(self) -> None:
        policy = WaveHistoryPolicy(
            mode=MIGRATION_MODE,
            history_hours=3,
            include_target=False,
            require_single_run_per_collection=False,
            allow_exact_multi_run=True,
        )
        run = utc_offset(TARGET, -12)
        first = utc_offset(TARGET, -3)
        last = utc_offset(TARGET, -1)
        cache = cache_for_registry(
            self.registry,
            lambda part: {
                first: native_hour(
                    part,
                    first,
                    run,
                    height=0.0,
                    period=6.0,
                    direction=None,
                ),
                last: native_hour(
                    part,
                    last,
                    run,
                    height=1.0,
                    period=6.0,
                    direction=270.0,
                ),
            },
        )
        expect_code(
            self,
            "MISSING_DIRECTION",
            lambda: validate_wave_history_cache(
                cache,
                self.registry,
                target_hour=TARGET,
                policy=policy,
            ),
        )

    def test_directionless_calm_endpoints_interpolate_neutrally(self) -> None:
        policy = WaveHistoryPolicy(
            mode=MIGRATION_MODE,
            history_hours=3,
            include_target=False,
            require_single_run_per_collection=False,
            allow_exact_multi_run=True,
        )
        run = utc_offset(TARGET, -12)
        first = utc_offset(TARGET, -3)
        last = utc_offset(TARGET, -1)
        cache = cache_for_registry(
            self.registry,
            lambda part: {
                first: native_hour(
                    part,
                    first,
                    run,
                    height=0.0,
                    period=6.0,
                    direction=None,
                ),
                last: native_hour(
                    part,
                    last,
                    run,
                    height=0.0,
                    period=8.0,
                    direction=None,
                ),
            },
        )
        summary = validate_wave_history_cache(
            cache,
            self.registry,
            target_hour=TARGET,
            policy=policy,
        )
        self.assertEqual(summary.exact_tuple_count, 4)
        self.assertEqual(summary.interpolated_tuple_count, 2)

    def test_gap_and_validation_budget_fail_closed(self) -> None:
        policy = WaveHistoryPolicy(
            mode=MIGRATION_MODE,
            history_hours=4,
            include_target=False,
            require_single_run_per_collection=False,
            allow_exact_multi_run=True,
        )
        run = utc_offset(TARGET, -12)
        before = utc_offset(TARGET, -5)
        gap_cache = cache_for_registry(
            self.registry,
            lambda part: {
                before: native_hour(part, before, run),
                TARGET: native_hour(part, TARGET, run),
            },
        )
        expect_code(
            self,
            "INTERPOLATION_GAP",
            lambda: validate_wave_history_cache(
                gap_cache,
                self.registry,
                target_hour=TARGET,
                policy=policy,
            ),
        )

        exact_policy = replace(MIGRATION_POLICY, history_hours=2)
        required = policy_utc_hours(TARGET, exact_policy)
        budget_cache = cache_for_registry(
            self.registry,
            lambda part: {
                hour: native_hour(part, hour, run)
                for hour in required
            },
        )
        expect_code(
            self,
            "VALIDATION_BUDGET",
            lambda: validate_wave_history_cache(
                budget_cache,
                self.registry,
                target_hour=TARGET,
                policy=exact_policy,
                budget=ValidationBudget(
                    maximum_rows_per_part=1,
                    maximum_total_rows=10,
                ),
            ),
        )

    def test_registry_and_cache_count_are_exact(self) -> None:
        actual = json.loads(
            (ROOT / "data" / "live" / "coastal-parts-v2.json").read_text(
                encoding="utf-8",
            ),
        )
        self.assertEqual(load_coastal_part_registry(actual).part_count, 673)
        expect_code(
            self,
            "REGISTRY_COUNT",
            lambda: load_coastal_part_registry(registry_document(672)),
        )

        policy = replace(MIGRATION_POLICY, history_hours=1)
        required = policy_utc_hours(TARGET, policy)
        run = utc_offset(TARGET, -8)
        cache = cache_for_registry(
            self.registry,
            lambda part: {
                required[0]: native_hour(part, required[0], run),
            },
        )
        cache["zones"].pop(next(iter(cache["zones"])))
        expect_code(
            self,
            "CACHE_PART_COUNT",
            lambda: validate_wave_history_cache(
                cache,
                self.registry,
                target_hour=TARGET,
                policy=policy,
            ),
        )

    def test_same_collection_hour_requires_one_asset_lineage(self) -> None:
        policy = replace(MIGRATION_POLICY, history_hours=1)
        required = policy_utc_hours(TARGET, policy)
        run = utc_offset(TARGET, -8)
        cache = cache_for_registry(
            self.registry,
            lambda part: {
                required[0]: native_hour(part, required[0], run),
            },
        )
        second_zone = list(cache["zones"].values())[1]
        second_hour = next(iter(second_zone["hourly"].values()))
        second_hour["sources"]["wave"]["assetIdentitySha256"] = "d" * 64
        expect_code(
            self,
            "INCONSISTENT_ASSET_PROVENANCE",
            lambda: validate_wave_history_cache(
                cache,
                self.registry,
                target_hour=TARGET,
                policy=policy,
            ),
        )

    def test_cli_failure_output_never_leaks_ids_coordinates_or_values(self) -> None:
        secret_part = "SECRET-PART-DO-NOT-PRINT"
        secret_point = (12.34567, 55.76543)
        registry_doc = registry_document(
            673,
            secret_part_id=secret_part,
            secret_point=secret_point,
        )
        registry = load_coastal_part_registry(registry_doc)
        cache = {
            "schemaVersion": 2,
            "zoneRegistrySignature": "c" * 16,
            "zones": {
                part.cache_key: {"hourly": {}}
                for part in registry.parts
            },
        }
        with tempfile.TemporaryDirectory() as temporary:
            folder = Path(temporary)
            registry_path = folder / "registry.json"
            cache_path = folder / "cache.json"
            registry_path.write_text(json.dumps(registry_doc), encoding="utf-8")
            cache_path.write_text(json.dumps(cache), encoding="utf-8")
            completed = subprocess.run(
                [
                    sys.executable,
                    "-B",
                    str(SCRIPTS / "validate_dmi_wave_history_bootstrap.py"),
                    "--registry",
                    str(registry_path),
                    "--cache",
                    str(cache_path),
                    "--target-hour",
                    TARGET,
                    "--production-target-hour",
                    TARGET,
                    "--mode",
                    MIGRATION_MODE,
                ],
                cwd=ROOT,
                text=True,
                capture_output=True,
                check=False,
            )
        combined = completed.stdout + completed.stderr
        self.assertEqual(completed.returncode, 1)
        self.assertEqual(
            json.loads(completed.stdout),
            {"code": "MISSING_HOUR", "status": "invalid"},
        )
        for forbidden in (
            secret_part,
            "PART::",
            str(secret_point[0]),
            str(secret_point[1]),
            '"significant-wave-height"',
            '"mean-wave-dir"',
        ):
            self.assertNotIn(forbidden, combined)


class BootstrapCliClassificationTests(unittest.TestCase):
    def setUp(self) -> None:
        self.registry = SimpleNamespace(part_count=673)
        self.operational = _SanitizedSummary({
            "status": "ok",
            "schemaVersion": "dmi-wave-history-bootstrap-v1",
            "mode": "operational-same-run-handoff",
            "registryPartCount": 673,
            "forecastHourCount": 118,
        })

    def build(self, mode: str, history_error: str) -> dict:
        with (
            patch.object(
                bootstrap_cli,
                "load_coastal_part_registry",
                return_value=self.registry,
            ),
            patch.object(
                bootstrap_cli,
                "validate_wave_operational_handoff_cache",
                return_value=self.operational,
            ) as operational,
            patch.object(
                bootstrap_cli,
                "validate_wave_history_cache",
                side_effect=WaveBootstrapError(history_error),
            ) as history,
        ):
            result = bootstrap_cli.build_attestation(
                {},
                {},
                mode=mode,
                target_hour=TARGET,
                production_target_hour=TARGET,
                forecast_hour_count=118,
            )
        operational.assert_called_once()
        history.assert_called_once()
        return result

    def test_cold_start_accepts_only_bounded_missing_history_after_handoff(self) -> None:
        for code in ("MISSING_HOUR", "INTERPOLATION_GAP", "NO_COHERENT_RUN"):
            with self.subTest(code=code):
                result = self.build(COLD_START_MODE, code)
                self.assertEqual(result["status"], "ok")
                self.assertTrue(result["historyIncomplete"])
                self.assertEqual(result["historyIncompleteCode"], code)
                self.assertEqual(
                    result["operationalHandoff"]["forecastHourCount"],
                    118,
                )

    def test_migration_remains_strict_for_missing_history(self) -> None:
        with self.assertRaises(WaveBootstrapError) as raised:
            self.build(MIGRATION_MODE, "MISSING_HOUR")
        self.assertEqual(raised.exception.code, "MISSING_HOUR")

    def test_provenance_and_cell_errors_remain_strict_for_cold_start(self) -> None:
        for code in ("MISSING_CELL", "MISSING_PROVENANCE"):
            with self.subTest(code=code):
                with self.assertRaises(WaveBootstrapError) as raised:
                    self.build(COLD_START_MODE, code)
                self.assertEqual(raised.exception.code, code)

    def test_operational_failure_stops_before_history_classification(self) -> None:
        with (
            patch.object(
                bootstrap_cli,
                "load_coastal_part_registry",
                return_value=self.registry,
            ),
            patch.object(
                bootstrap_cli,
                "validate_wave_operational_handoff_cache",
                side_effect=WaveBootstrapError("OPERATIONAL_HANDOFF_INVALID"),
            ),
            patch.object(
                bootstrap_cli,
                "validate_wave_history_cache",
            ) as history,
        ):
            with self.assertRaises(WaveBootstrapError) as raised:
                bootstrap_cli.build_attestation(
                    {},
                    {},
                    mode=COLD_START_MODE,
                    target_hour=TARGET,
                    production_target_hour=TARGET,
                    forecast_hour_count=118,
                )
        self.assertEqual(raised.exception.code, "OPERATIONAL_HANDOFF_INVALID")
        history.assert_not_called()


class OperationalHandoffTests(unittest.TestCase):
    def setUp(self) -> None:
        self.registry = load_coastal_part_registry(
            registry_document(2),
            expected_part_count=2,
        )
        self.bootstrap_target = utc_offset(TARGET, -2)
        self.operational_run = utc_offset(TARGET, -6)

    def operational_rows(self, part) -> dict:
        exact_bridge = [
            utc_offset(self.bootstrap_target, offset)
            for offset in range(3)
        ]
        forecast_stride = [
            utc_offset(TARGET, offset)
            for offset in range(0, 118, 3)
        ]
        return {
            hour: native_hour(part, hour, self.operational_run)
            for hour in sorted(set(exact_bridge + forecast_stride))
        }

    def test_lagged_exact_bridge_and_118_hour_same_run_horizon(self) -> None:
        cache = cache_for_registry(self.registry, self.operational_rows)
        summary = validate_wave_operational_handoff_cache(
            cache,
            self.registry,
            bootstrap_target_hour=self.bootstrap_target,
            production_target_hour=TARGET,
            forecast_hour_count=118,
        )
        self.assertEqual(summary.bridge_exact_hour_count, 3)
        self.assertEqual(summary.forecast_hour_count, 118)
        self.assertEqual(summary.verified_part_hour_count, 240)
        self.assertEqual(summary.coherent_run_count, 1)

    def test_interpolated_bridge_hour_is_not_exact_handoff(self) -> None:
        missing = utc_offset(self.bootstrap_target, 1)
        cache = cache_for_registry(
            self.registry,
            lambda part: {
                valid: hour
                for valid, hour in self.operational_rows(part).items()
                if valid != missing
            },
        )
        expect_code(
            self,
            "OPERATIONAL_HANDOFF_INVALID",
            lambda: validate_wave_operational_handoff_cache(
                cache,
                self.registry,
                bootstrap_target_hour=self.bootstrap_target,
                production_target_hour=TARGET,
                forecast_hour_count=118,
            ),
        )

    def test_mixed_run_forecast_seam_fails_closed(self) -> None:
        seam = utc_offset(TARGET, 3)
        newer_run = utc_offset(TARGET, -3)
        cache = cache_for_registry(self.registry, self.operational_rows)
        for part in self.registry.parts:
            point = cache["zones"][part.cache_key]
            point["hourly"][seam] = native_hour(
                part, seam, newer_run
            )
        expect_code(
            self,
            "MIXED_RUN_INTERPOLATION",
            lambda: validate_wave_operational_handoff_cache(
                cache,
                self.registry,
                bootstrap_target_hour=self.bootstrap_target,
                production_target_hour=TARGET,
                forecast_hour_count=118,
            ),
        )

    def test_operational_run_must_not_be_newer_than_first_bridge_hour(self) -> None:
        future_run = utc_offset(self.bootstrap_target, 1)
        cache = cache_for_registry(
            self.registry,
            lambda part: {
                valid: native_hour(part, valid, future_run)
                for valid in self.operational_rows(part)
            },
        )
        expect_code(
            self,
            "FUTURE_RUN",
            lambda: validate_wave_operational_handoff_cache(
                cache,
                self.registry,
                bootstrap_target_hour=self.bootstrap_target,
                production_target_hour=TARGET,
                forecast_hour_count=118,
            ),
        )


if __name__ == "__main__":
    unittest.main(verbosity=2)
