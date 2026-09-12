#!/usr/bin/env python3
"""Focused red-team contracts for the WAM bootstrap producer integration.

The fixtures are synthetic and contain no production part ids, coordinates,
wave values or signed URLs.  The update module is imported with an ecCodes stub;
no network request is made.
"""
from __future__ import annotations

import copy
import hashlib
import importlib.util
import json
import shutil
import subprocess
import sys
import tempfile
import types
import unittest
from datetime import timedelta
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import patch


ROOT = Path(__file__).resolve().parents[1]
SCRIPTS = ROOT / "scripts"
if str(SCRIPTS) not in sys.path:
    sys.path.insert(0, str(SCRIPTS))

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
    "ravradar_update_dmi_bulk_wave_bootstrap_integration",
    SCRIPTS / "update-dmi-bulk.py",
)
assert spec and spec.loader
producer = importlib.util.module_from_spec(spec)
spec.loader.exec_module(producer)

from lib.dmi_wave_history_bootstrap import (  # noqa: E402
    COLD_START_MODE,
    COLD_START_POLICY,
    MIGRATION_MODE,
    MIGRATION_POLICY,
    StacWaveAsset,
    format_utc_hour,
    load_coastal_part_registry,
    parse_utc_hour,
    policy_utc_hours,
)
from test_dmi_wave_history_bootstrap import (  # noqa: E402
    cache_for_registry as wave_cache_for_registry,
    native_hour as wave_native_hour,
    registry_document as wave_registry_document,
)


TARGET = "2026-08-30T12:00:00Z"
OLD_RUN = "2026-08-28T18:00:00Z"


def utc_offset(base: str, hours: int) -> str:
    return format_utc_hour(parse_utc_hour(base) + timedelta(hours=hours))


def bootstrap_target_for_candidate_lag(candidate_lag_hours: int) -> str:
    # State at production-0h/-1h begins directly at production. Older state
    # begins at its next exact hour and needs a bounded operational handoff.
    return (
        TARGET
        if candidate_lag_hours <= 1
        else utc_offset(TARGET, 1 - candidate_lag_hours)
    )


def official_stac_item(valid_time: str, model_run: str, suffix: str) -> dict:
    compact = valid_time.replace("-", "").replace(":", "")
    return {
        "type": "Feature",
        "collection": "wam_dw",
        "id": f"WAM_DW_SF_{compact}_{suffix}.grib",
        "asset": {
            "data": {
                "href": f"https://example.invalid/wam/{compact}-{suffix}.grib",
                "title": "Forecast file download resource",
                "type": "application/x-grib",
                "roles": ["data"],
            },
        },
        "properties": {
            "created": model_run,
            "datetime": valid_time,
            "modelRun": model_run,
        },
    }


def feature_collection(items: list[dict]) -> dict:
    return {"type": "FeatureCollection", "features": items}


def fake_plan() -> SimpleNamespace:
    return SimpleNamespace(
        sanitized_attestation=lambda: {
            "selectionMode": "single-coherent-run",
            "historyHourCount": 40,
            "requiredHourCount": 40,
            "runCount": 1,
            "selectionSha256": "a" * 64,
        },
    )


def synthetic_parts(*, unique: bool) -> list[dict]:
    parts = []
    for index in range(673):
        west = index >= 337
        suffix = str(index) if unique else ("WEST" if west else "EAST")
        parts.append({
            "id": f"PART::SYNTHETIC-{suffix}",
            "coastalPart": True,
            "coastType": "west" if west else "east",
        })
    return parts


def complete_hour(
    *,
    asset_identity: str,
    height: object = 1.0,
    period: object = 6.0,
    direction: object = 270.0,
) -> tuple[dict, dict, SimpleNamespace]:
    valid_time = TARGET
    model_run = utc_offset(TARGET, -6)
    item_id = "synthetic-item"
    optional = [] if direction is None else ["mean-wave-dir"]
    hour = {
        "time": valid_time,
        "significant-wave-height": height,
        "dominant-wave-period": period,
        "sources": {"wave": {
            "collection": "wam_dw",
            "modelRun": model_run,
            "nativeValidTime": valid_time,
            "itemId": item_id,
            "assetIdentitySha256": asset_identity,
            "optionalFieldSet": optional,
        }},
    }
    if direction is not None:
        hour["mean-wave-dir"] = direction
    result = {"zones": {"PART::SYNTHETIC": {"hourly": {valid_time: hour}}}}
    zone = {"id": "PART::SYNTHETIC"}
    asset = SimpleNamespace(
        valid_time=valid_time,
        model_run=model_run,
        item_id=item_id,
        asset_identity_sha256="b" * 64,
    )
    return result, zone, asset


class BootstrapAcquisitionTests(unittest.TestCase):
    def test_candidate_lag_zero_to_three_never_locks_target_or_future(self) -> None:
        for candidate_lag_hours in range(4):
            with self.subTest(candidate_lag_hours=candidate_lag_hours):
                bootstrap_target = bootstrap_target_for_candidate_lag(
                    candidate_lag_hours,
                )
                production_target = TARGET
                required = policy_utc_hours(bootstrap_target, MIGRATION_POLICY)
                old_run = utc_offset(bootstrap_target, -42)
                discovery = feature_collection([
                    official_stac_item(hour, old_run, f"history-{index}")
                    for index, hour in enumerate(required)
                ])
                exact_hours = [
                    utc_offset(required[0], offset)
                    for offset in range(
                        40
                        + int(
                            (
                                parse_utc_hour(production_target)
                                - parse_utc_hour(bootstrap_target)
                            ).total_seconds()
                            / 3600
                        )
                        + 1
                    )
                ]
                exact = feature_collection([
                    official_stac_item(hour, old_run, f"exact-{index}")
                    for index, hour in enumerate(exact_hours)
                ])
                queries: list[dict] = []

                def fake_request(_url: str, query: dict) -> dict:
                    queries.append(dict(query))
                    return exact if "modelRun" in query else discovery

                configuration = {
                    "mode": MIGRATION_MODE,
                    "policy": MIGRATION_POLICY,
                    "targetHour": bootstrap_target,
                    "productionTargetHour": production_target,
                    "requiredHours": required,
                }
                with patch.object(producer, "request_json", side_effect=fake_request):
                    plan, assets = producer.list_private_wave_bootstrap_assets(
                        "wam_dw",
                        configuration,
                    )

                self.assertEqual(plan.required_hours, required)
                self.assertEqual(
                    tuple(asset.valid_time for asset in assets),
                    required,
                    "The historical lock must be exactly target-40..target-1; "
                    "target and future belong to the normal latest WAM run.",
                )
                self.assertEqual(
                    queries[0]["datetime"],
                    f"{utc_offset(required[0], -MIGRATION_POLICY.maximum_interpolation_hours)}/{required[-1]}",
                )

    def test_official_query_shape_and_48_hour_coherent_run_boundary(self) -> None:
        required = policy_utc_hours(TARGET, MIGRATION_POLICY)
        discovery = feature_collection([
            official_stac_item(hour, OLD_RUN, f"history-{index}")
            for index, hour in enumerate(required)
        ])
        exact = feature_collection([
            official_stac_item(hour, OLD_RUN, f"exact-{index}")
            for index, hour in enumerate((*required, TARGET))
        ])
        queries: list[dict] = []

        def fake_request(_url: str, query: dict) -> dict:
            queries.append(dict(query))
            return exact if "modelRun" in query else discovery

        configuration = {
            "mode": MIGRATION_MODE,
            "policy": MIGRATION_POLICY,
            "targetHour": TARGET,
            "productionTargetHour": TARGET,
            "requiredHours": required,
        }
        with patch.object(producer, "request_json", side_effect=fake_request):
            producer.list_private_wave_bootstrap_assets("wam_dw", configuration)

        self.assertEqual(queries[0]["limit"], 1_000)
        self.assertEqual(queries[0]["bbox"], "7,54,16,58")
        self.assertEqual(queries[0]["sortorder"], "datetime,DESC")
        self.assertEqual(
            queries[0]["datetime"],
            f"{utc_offset(required[0], -MIGRATION_POLICY.maximum_interpolation_hours)}/{required[-1]}",
        )
        self.assertLessEqual(parse_utc_hour(OLD_RUN), parse_utc_hour(required[0]))
        self.assertLessEqual(
            (parse_utc_hour(TARGET) - parse_utc_hour(OLD_RUN)).total_seconds(),
            48 * 3600,
        )

    def test_cold_first_exact_hour_survives_measured_only_retention(self) -> None:
        required = policy_utc_hours(TARGET, COLD_START_POLICY)
        first_required = required[0]
        after_endpoint = utc_offset(first_required, 1)
        too_old = utc_offset(first_required, -1)
        run = utc_offset(first_required, -6)
        items = [
            official_stac_item(hour, run, f"required-{index}")
            for index, hour in enumerate(required)
        ]
        queries: list[dict] = []

        def fake_request(_url: str, query: dict) -> dict:
            queries.append(dict(query))
            return feature_collection(items)

        configuration = {
            "mode": COLD_START_MODE,
            "policy": COLD_START_POLICY,
            "targetHour": TARGET,
            "productionTargetHour": TARGET,
            "requiredHours": required,
        }
        with patch.object(producer, "request_json", side_effect=fake_request):
            _plan, assets = producer.list_private_wave_bootstrap_assets(
                "wam_dw",
                configuration,
            )

        selected = {asset.valid_time for asset in assets}
        self.assertIn(first_required, selected)
        self.assertIn(after_endpoint, selected)
        retention_start = first_required
        self.assertEqual(
            queries[0]["datetime"],
            f"{retention_start}/{required[-1]}",
        )

        result = {
            "generatedAt": TARGET,
            "zones": {"PART::SYNTHETIC": {
                "gridPoints": {},
                "collections": {},
                "hourly": {
                    too_old: {"time": too_old},
                    first_required: {"time": first_required},
                    after_endpoint: {"time": after_endpoint},
                },
            }},
            "diagnostics": {},
        }
        with (
            patch.object(
                producer,
                "PRIVATE_WAVE_BOOTSTRAP_RETENTION_START_EPOCH",
                producer.epoch(retention_start),
            ),
            patch.object(producer, "PRIVATE_REPLAY_RETENTION_HOURS", 48),
            patch.object(producer.time, "time", return_value=producer.epoch(TARGET)),
        ):
            producer.clean_and_summarize(result, set(), {"bytes": 0})

        retained = result["zones"]["PART::SYNTHETIC"]["hourly"]
        self.assertNotIn(too_old, retained)
        self.assertIn(first_required, retained)
        self.assertIn(after_endpoint, retained)

    def test_operational_run_owns_handoff_and_future_for_candidate_lag_zero_to_three(self) -> None:
        operational_run = utc_offset(TARGET, -6)
        partial_latest_run = TARGET
        for candidate_lag_hours in range(4):
            with self.subTest(candidate_lag_hours=candidate_lag_hours):
                bootstrap_target = bootstrap_target_for_candidate_lag(
                    candidate_lag_hours,
                )
                exact_handoff = {
                    utc_offset(
                        bootstrap_target,
                        offset,
                    )
                    for offset in range(
                        int(
                            (
                                parse_utc_hour(TARGET)
                                - parse_utc_hour(bootstrap_target)
                            ).total_seconds()
                            / 3600
                        )
                        + 1
                    )
                }
                operational_items = [
                    official_stac_item(
                        utc_offset(bootstrap_target, offset),
                        operational_run,
                        f"operational-{candidate_lag_hours}-{offset}",
                    )
                    for offset in range(
                        int(
                            (
                                parse_utc_hour(TARGET)
                                - parse_utc_hour(bootstrap_target)
                            ).total_seconds()
                            / 3600
                        )
                        + 121
                    )
                ]
                partial_items = [
                    official_stac_item(
                        utc_offset(TARGET, offset),
                        partial_latest_run,
                        f"partial-{candidate_lag_hours}-{offset}",
                    )
                    for offset in range(4)
                ]
                document = feature_collection(operational_items + partial_items)
                with (
                    patch.object(producer, "request_json", return_value=document),
                    patch.object(producer.time, "time", return_value=producer.epoch(TARGET)),
                ):
                    selected_run, assets, stats = producer.list_latest_assets(
                        "wam_dw",
                        minimum_valid_time=bootstrap_target,
                        required_valid_times=exact_handoff,
                        required_horizon_end_time=utc_offset(TARGET, 117),
                    )

                self.assertEqual(selected_run, operational_run, stats)
                selected_times = {asset["valid"] for asset in assets}
                self.assertLessEqual(exact_handoff, selected_times)
                self.assertTrue(all(
                    parse_utc_hour(asset["valid"])
                    >= parse_utc_hour(bootstrap_target)
                    for asset in assets
                ))
                self.assertEqual(
                    {asset["modelRun"] for asset in assets},
                    {operational_run},
                )
                self.assertGreaterEqual(
                    max(parse_utc_hour(asset["valid"]) for asset in assets),
                    parse_utc_hour(utc_offset(TARGET, 117)),
                )
                self.assertEqual(
                    stats["requiredExactValidTimeCount"],
                    len(exact_handoff),
                )
                self.assertTrue(stats["requiredHorizonEndCovered"])

    def test_aged_operational_run_retains_final_public_hour_inputs(self) -> None:
        operational_run = utc_offset(TARGET, -6)
        prior_run = utc_offset(operational_run, -6)
        for run_age_hours in (8, 9):
            with self.subTest(run_age_hours=run_age_hours):
                production_target = utc_offset(operational_run, run_age_hours)
                final_public_hour = utc_offset(production_target, 117)
                operational_items = [
                    official_stac_item(
                        utc_offset(production_target, offset),
                        operational_run,
                        f"aged-{run_age_hours}-{offset}",
                    )
                    for offset in range(118)
                ]
                for item in operational_items:
                    item["properties"]["created"] = utc_offset(
                        operational_run,
                        3,
                    )
                prior_item = official_stac_item(
                    production_target,
                    prior_run,
                    f"prior-{run_age_hours}",
                )
                prior_item["properties"]["created"] = utc_offset(prior_run, 3)
                document = feature_collection([*operational_items, prior_item])
                with (
                    patch.object(producer, "request_json", return_value=document),
                    patch.object(
                        producer.time,
                        "time",
                        return_value=producer.epoch(production_target),
                    ),
                ):
                    selected_run, assets, stats = producer.list_latest_assets(
                        "wam_dw",
                        minimum_valid_time=production_target,
                        required_valid_times={production_target},
                        required_horizon_end_time=final_public_hour,
                    )

                self.assertEqual(selected_run, operational_run, stats)
                selected_times = sorted(
                    (asset["valid"] for asset in assets),
                    key=parse_utc_hour,
                )
                self.assertEqual(selected_times[0], production_target)
                self.assertEqual(selected_times[-1], final_public_hour)
                self.assertTrue(stats["requiredHorizonEndCovered"])
                self.assertTrue(all(
                    (
                        parse_utc_hour(later) - parse_utc_hour(earlier)
                    ).total_seconds() <= 3 * 3600
                    for earlier, later in zip(selected_times, selected_times[1:])
                ))
                self.assertLessEqual(
                    (
                        parse_utc_hour(selected_times[-1])
                        - parse_utc_hour(operational_run)
                    ).total_seconds(),
                    producer.WAM_MAX_FORECAST_LEAD_HOURS * 3600,
                )

    def test_late_wam_start_selects_newest_axis_resolvable_target_plus_117_run(
        self,
    ) -> None:
        preferred_run = utc_offset(TARGET, -6)
        newer_run = TARGET
        endpoint = utc_offset(TARGET, 117)
        items = [
            official_stac_item(
                utc_offset(TARGET, offset),
                model_run,
                f"{label}-{offset}",
            )
            for model_run, label in (
                (preferred_run, "preferred"),
                (newer_run, "newer"),
            )
            for offset in range(118)
        ]
        with (
            patch.object(
                producer,
                "request_json",
                return_value=feature_collection(items),
            ),
            patch.object(
                producer.time,
                "time",
                return_value=producer.epoch(utc_offset(TARGET, 7)),
            ),
        ):
            selected_run, assets, stats = producer.list_latest_assets(
                "wam_dw",
                preferred_run,
                minimum_valid_time=TARGET,
                required_valid_times={TARGET},
                required_horizon_end_time=endpoint,
            )

        self.assertEqual(selected_run, newer_run, stats)
        self.assertEqual(stats["targetWindowAxisResolvableRunCount"], 2)
        self.assertTrue(stats["targetWindowAxisResolvablePoolUsed"])
        self.assertTrue(stats["selectedTargetWindowAxisResolvable"])
        self.assertNotIn("preferredTargetWindowRunPinned", stats)
        self.assertTrue(stats["requiredHorizonEndCovered"])
        self.assertEqual(
            max((asset["valid"] for asset in assets), key=parse_utc_hour),
            endpoint,
        )
        self.assertEqual(
            (
                parse_utc_hour(endpoint) - parse_utc_hour(TARGET)
            ).total_seconds(),
            117 * 3600,
            "118 inclusive public hours are target through target+117.",
        )

    def test_gapped_preferred_run_yields_to_newer_closable_run(self) -> None:
        preferred_run = utc_offset(TARGET, -6)
        newer_run = TARGET
        endpoint = utc_offset(TARGET, 117)
        preferred_items = [
            official_stac_item(
                utc_offset(TARGET, offset),
                preferred_run,
                f"preferred-gapped-{offset}",
            )
            for offset in range(0, 118, 3)
            if offset != 60
        ]
        newer_items = [
            official_stac_item(
                utc_offset(TARGET, offset),
                newer_run,
                f"newer-closable-{offset}",
            )
            for offset in range(0, 118, 3)
        ]
        with (
            patch.object(
                producer,
                "request_json",
                return_value=feature_collection([
                    *preferred_items,
                    *newer_items,
                ]),
            ),
            patch.object(
                producer.time,
                "time",
                return_value=producer.epoch(utc_offset(TARGET, 7)),
            ),
        ):
            selected_run, assets, stats = producer.list_latest_assets(
                "wam_dw",
                preferred_run,
                minimum_valid_time=TARGET,
                required_valid_times={TARGET},
                required_horizon_end_time=endpoint,
            )

        self.assertEqual(selected_run, newer_run, stats)
        self.assertEqual(stats["targetWindowAxisResolvableRunCount"], 1)
        self.assertTrue(stats["targetWindowAxisResolvablePoolUsed"])
        self.assertTrue(stats["selectedTargetWindowAxisResolvable"])
        self.assertFalse(stats["targetWindowProgressiveFallbackUsed"])
        self.assertNotIn("preferredTargetWindowRunPinned", stats)
        selected_times = sorted(
            (asset["valid"] for asset in assets),
            key=parse_utc_hour,
        )
        self.assertEqual(selected_times[0], TARGET)
        self.assertEqual(selected_times[-1], endpoint)
        self.assertTrue(all(
            (
                parse_utc_hour(after) - parse_utc_hour(before)
            ).total_seconds() <= 3 * 3600
            for before, after in zip(selected_times, selected_times[1:])
        ))

    def test_newest_exact_end_covered_wam_run_can_progress_when_none_resolve_axis(
        self,
    ) -> None:
        preferred_run = utc_offset(TARGET, -6)
        newer_run = TARGET
        endpoint = utc_offset(TARGET, 117)
        items = [
            official_stac_item(
                utc_offset(TARGET, offset),
                model_run,
                f"{label}-gapped-{offset}",
            )
            for model_run, label in (
                (preferred_run, "preferred"),
                (newer_run, "newer"),
            )
            for offset in (*range(0, 115, 6), 117)
        ]
        with (
            patch.object(
                producer,
                "request_json",
                return_value=feature_collection(items),
            ),
            patch.object(
                producer.time,
                "time",
                return_value=producer.epoch(utc_offset(TARGET, 7)),
            ),
        ):
            selected_run, assets, stats = producer.list_latest_assets(
                "wam_dw",
                preferred_run,
                minimum_valid_time=TARGET,
                required_valid_times={TARGET},
                required_horizon_end_time=endpoint,
            )

        self.assertEqual(selected_run, newer_run, stats)
        self.assertTrue(assets)
        self.assertEqual(stats["targetWindowAxisResolvableRunCount"], 0)
        self.assertFalse(stats["targetWindowAxisResolvablePoolUsed"])
        self.assertTrue(stats["targetWindowProgressiveFallbackUsed"])
        self.assertFalse(stats["selectedTargetWindowAxisResolvable"])
        self.assertFalse(stats["requiredWindowInventoryComplete"])
        self.assertNotIn("preferredTargetWindowRunPinned", stats)

    def test_operational_selector_exposes_one_complete_older_run_phase(
        self,
    ) -> None:
        newer_run = TARGET
        older_run = utc_offset(TARGET, -6)
        endpoint = utc_offset(TARGET, 117)
        items = [
            official_stac_item(
                utc_offset(TARGET, offset),
                model_run,
                f"{label}-{offset}",
            )
            for model_run, label in (
                (newer_run, "newer"),
                (older_run, "older"),
            )
            for offset in range(0, 118, 3)
        ]
        with (
            patch.object(
                producer,
                "request_json",
                return_value=feature_collection(items),
            ),
            patch.object(
                producer.time,
                "time",
                return_value=producer.epoch(utc_offset(TARGET, 7)),
            ),
        ):
            selected_run, assets, stats = producer.list_latest_assets(
                "wam_dw",
                minimum_valid_time=TARGET,
                required_valid_times={TARGET},
                required_horizon_end_time=endpoint,
                include_operational_wave_fallback_phases=True,
            )

        self.assertEqual(selected_run, newer_run)
        self.assertTrue(stats["catalogInventoryComplete"], stats)
        self.assertTrue(stats["requiredWindowInventoryComplete"], stats)
        self.assertEqual(len(stats["officialRequiredAssets"]), 1)
        self.assertEqual(
            stats["officialRequiredAssets"][0]["collection"],
            "wam_dw",
        )
        self.assertEqual(
            stats["officialRequiredAssets"][0]["modelRun"],
            newer_run,
        )
        self.assertEqual(stats["operationalWaveRunPhaseCount"], 2)
        self.assertEqual(
            stats["operationalWaveFallbackCandidateRunCount"], 1,
        )
        phase_runs = [
            (
                asset["operationalWavePhaseRank"],
                asset["modelRun"],
            )
            for asset in assets
        ]
        self.assertTrue(phase_runs)
        self.assertEqual(
            {run for rank, run in phase_runs if rank == 0},
            {newer_run},
        )
        self.assertEqual(
            {run for rank, run in phase_runs if rank == 1},
            {older_run},
        )
        self.assertEqual(
            [rank for rank, _run in phase_runs],
            sorted(rank for rank, _run in phase_runs),
        )
        self.assertNotIn("https://", json.dumps(stats, sort_keys=True))


class OperationalWaveClosureTests(unittest.TestCase):
    @staticmethod
    def _one_part_wave_fixture() -> tuple[object, object, dict]:
        registry = load_coastal_part_registry(
            wave_registry_document(1),
            expected_part_count=1,
        )
        part = registry.parts[0]
        zone = {
            "id": part.cache_key,
            "coastalPart": True,
            "parentZoneId": part.parent_zone_id,
            "coastType": "east",
            "lon": part.water_point[0],
            "lat": part.water_point[1],
        }
        return registry, part, zone

    def test_native_gate_is_exactly_670_parts_and_defers_feggesund(self) -> None:
        native = [
            {
                "id": f"PART::NATIVE-{index:03d}",
                "coastalPart": True,
                "parentZoneId": "ZONE-NATIVE",
                "coastType": "east" if index < 335 else "west",
            }
            for index in range(670)
        ]
        feggesund = [
            {
                "id": f"PART::FEGGESUND-{index}",
                "coastalPart": True,
                "parentZoneId": "DK-B05-11",
                "coastType": "east",
            }
            for index in range(3)
        ]
        parents = [
            {"id": "ZONE-NATIVE", "coastType": "east"},
            {"id": "DK-B05-11", "coastType": "east"},
        ]
        zones = [*parents, *native, *feggesund]

        gated = [
            *producer.native_operational_wave_zones("wam_dw", zones),
            *producer.native_operational_wave_zones("wam_nsb", zones),
        ]

        self.assertEqual(len(gated), producer.OPERATIONAL_WAVE_NATIVE_PART_COUNT)
        self.assertEqual(len({zone["id"] for zone in gated}), 670)
        self.assertTrue(all(zone.get("coastalPart") is True for zone in gated))
        self.assertFalse(any(
            zone.get("parentZoneId") == "DK-B05-11" for zone in gated
        ))

    def test_producer_closure_allows_exact_multi_run_but_only_safe_brackets(self) -> None:
        registry = load_coastal_part_registry(
            wave_registry_document(1),
            expected_part_count=1,
        )
        part = registry.parts[0]
        zone = {
            "id": part.cache_key,
            "coastalPart": True,
            "parentZoneId": part.parent_zone_id,
            "coastType": "east",
            "lon": part.water_point[0],
            "lat": part.water_point[1],
        }
        older_run = utc_offset(TARGET, -6)
        rows = {
            utc_offset(TARGET, offset): wave_native_hour(
                part,
                utc_offset(TARGET, offset),
                older_run,
                collection="wam_dw",
            )
            for offset in range(0, 118, 3)
        }
        rows[utc_offset(TARGET, 1)] = wave_native_hour(
            part,
            utc_offset(TARGET, 1),
            TARGET,
            collection="wam_dw",
            grid_point=(
                part.water_point[0] + 0.001,
                part.water_point[1],
            ),
            grid_sha="d" * 64,
        )
        cache = {"zones": {part.cache_key: {"hourly": rows}}}

        closure, missing = producer.operational_wave_collection_closure(
            cache,
            [zone],
            parse_utc_hour(TARGET),
            "wam_dw",
            exact_required_times={TARGET},
        )

        self.assertEqual(closure["requiredHourCount"], 118)
        self.assertEqual(closure["rangeEnd"], utc_offset(TARGET, 117))
        self.assertEqual(closure["missingPairCount"], 0)
        self.assertEqual(missing, ())

        unsafe = copy.deepcopy(cache)
        del unsafe["zones"][part.cache_key]["hourly"][utc_offset(TARGET, 3)]
        unsafe_closure, unsafe_missing = (
            producer.operational_wave_collection_closure(
                unsafe,
                [zone],
                parse_utc_hour(TARGET),
                "wam_dw",
                exact_required_times={TARGET},
            )
        )
        self.assertGreater(unsafe_closure["missingPairCount"], 0)
        self.assertIn(utc_offset(TARGET, 2), unsafe_missing)

    def test_global_lineage_conflict_is_targeted_residual_and_final_rejection(
        self,
    ) -> None:
        registry = load_coastal_part_registry(
            wave_registry_document(2),
            expected_part_count=2,
        )
        run = utc_offset(TARGET, -6)
        native_times = [
            utc_offset(TARGET, offset) for offset in range(0, 118, 3)
        ]
        cache = wave_cache_for_registry(
            registry,
            lambda part: {
                valid_time: wave_native_hour(
                    part,
                    valid_time,
                    run,
                    collection="wam_dw",
                )
                for valid_time in native_times
            },
        )
        second_part = registry.parts[1]
        cache["zones"][second_part.cache_key]["hourly"][TARGET][
            "sources"
        ]["wave"]["assetIdentitySha256"] = "d" * 64
        zones = [
            {
                "id": part.cache_key,
                "coastalPart": True,
                "parentZoneId": part.parent_zone_id,
                "coastType": "east",
                "lon": part.water_point[0],
                "lat": part.water_point[1],
            }
            for part in registry.parts
        ]

        closure, missing = producer.operational_wave_collection_closure(
            cache,
            zones,
            parse_utc_hour(TARGET),
            "wam_dw",
            exact_required_times={TARGET},
        )

        self.assertEqual(closure["lineageConflictNativeTimeCount"], 1)
        self.assertEqual(closure["lineageConflictRequiredPairCount"], 6)
        self.assertEqual(closure["missingPairCount"], 6)
        self.assertEqual(
            missing,
            (TARGET, utc_offset(TARGET, 1), utc_offset(TARGET, 2)),
        )
        with self.assertRaises(producer.WaveBootstrapError) as raised:
            producer.validate_wave_operational_handoff_cache(
                cache,
                registry,
                bootstrap_target_hour=TARGET,
                production_target_hour=TARGET,
                forecast_hour_count=118,
                deferred_proxy_parent_zone_ids=(),
            )
        self.assertEqual(
            raised.exception.code,
            "INCONSISTENT_ASSET_PROVENANCE",
        )

    def test_complete_cache_rejects_one_asset_mixed_run_seam(self) -> None:
        _registry, part, zone = self._one_part_wave_fixture()
        older_run = utc_offset(TARGET, -6)
        newer_run = TARGET
        active = {
            "generatedAt": TARGET,
            "zones": {part.cache_key: {"hourly": {
                utc_offset(TARGET, offset): wave_native_hour(
                    part,
                    utc_offset(TARGET, offset),
                    older_run,
                    collection="wam_dw",
                )
                for offset in range(0, 118, 3)
            }}},
        }
        before = copy.deepcopy(active)
        candidate = producer.build_operational_wave_collection_candidate(
            active
        )
        candidate["zones"][part.cache_key]["hourly"][TARGET] = (
            wave_native_hour(
                part,
                TARGET,
                newer_run,
                collection="wam_dw",
            )
        )
        active_evidence = producer.operational_wave_collection_evidence(
            active,
            [zone],
            parse_utc_hour(TARGET),
            "wam_dw",
            exact_required_times={TARGET},
        )
        candidate_evidence = producer.operational_wave_collection_evidence(
            candidate,
            [zone],
            parse_utc_hour(TARGET),
            "wam_dw",
            exact_required_times={TARGET},
        )
        candidate_single_group = (
            producer.operational_wave_collection_evidence(
                candidate,
                [zone],
                parse_utc_hour(TARGET),
                "wam_dw",
                exact_required_times={TARGET},
                require_single_group=True,
            )
        )
        decision = producer.operational_wave_phase_promotion_decision(
            active_evidence,
            candidate_evidence,
            fallback_phase=False,
            candidate_changed=True,
            candidate_phase_model_run=newer_run,
            candidate_single_group=candidate_single_group,
        )

        self.assertEqual(
            active_evidence["closure"]["missingPairCount"], 0,
        )
        self.assertFalse(decision["promote"], decision)
        self.assertIn(
            decision["reasonCode"],
            {"RESOLVED_PAIR_REGRESSION", "INCOMPLETE_QUALITY_REFRESH"},
        )
        self.assertEqual(active, before)
        retained_closure, _retained_missing = (
            producer.operational_wave_collection_closure(
                active,
                [zone],
                parse_utc_hour(TARGET),
                "wam_dw",
                exact_required_times={TARGET},
            )
        )
        self.assertEqual(retained_closure["missingPairCount"], 0)

    def test_hidden_old_bracket_cannot_authorize_mixed_quality_refresh(
        self,
    ) -> None:
        _registry, part, zone = self._one_part_wave_fixture()
        older_run = utc_offset(TARGET, -6)
        newer_run = TARGET
        old_rows = {
            utc_offset(TARGET, offset): wave_native_hour(
                part,
                utc_offset(TARGET, offset),
                older_run,
                collection="wam_dw",
            )
            for offset in range(0, 118, 2)
        }
        old_rows[utc_offset(TARGET, 117)] = wave_native_hour(
            part,
            utc_offset(TARGET, 117),
            older_run,
            collection="wam_dw",
        )
        active = {
            "generatedAt": TARGET,
            "zones": {part.cache_key: {"hourly": old_rows}},
        }
        candidate = producer.build_operational_wave_collection_candidate(
            active
        )
        candidate["zones"][part.cache_key]["hourly"][
            utc_offset(TARGET, 3)
        ] = wave_native_hour(
            part,
            utc_offset(TARGET, 3),
            newer_run,
            collection="wam_dw",
        )
        active_evidence = producer.operational_wave_collection_evidence(
            active,
            [zone],
            parse_utc_hour(TARGET),
            "wam_dw",
            exact_required_times={TARGET},
        )
        candidate_evidence = producer.operational_wave_collection_evidence(
            candidate,
            [zone],
            parse_utc_hour(TARGET),
            "wam_dw",
            exact_required_times={TARGET},
        )
        candidate_single_group = (
            producer.operational_wave_collection_evidence(
                candidate,
                [zone],
                parse_utc_hour(TARGET),
                "wam_dw",
                exact_required_times={TARGET},
                require_single_group=True,
            )
        )
        decision = producer.operational_wave_phase_promotion_decision(
            active_evidence,
            candidate_evidence,
            fallback_phase=False,
            candidate_changed=True,
            candidate_phase_model_run=newer_run,
            candidate_single_group=candidate_single_group,
        )

        self.assertEqual(
            candidate_evidence["closure"]["missingPairCount"], 0,
        )
        self.assertTrue(decision["coherentCandidateComplete"])
        self.assertFalse(decision["phaseOwnedCandidateComplete"])
        self.assertFalse(decision["promote"], decision)

    def test_complete_new_run_phase_can_replace_complete_old_run(self) -> None:
        _registry, part, zone = self._one_part_wave_fixture()
        older_run = utc_offset(TARGET, -6)
        newer_run = TARGET

        def rows(model_run: str) -> dict:
            return {
                utc_offset(TARGET, offset): wave_native_hour(
                    part,
                    utc_offset(TARGET, offset),
                    model_run,
                    collection="wam_dw",
                )
                for offset in range(0, 118, 3)
            }

        active = {
            "generatedAt": TARGET,
            "zones": {part.cache_key: {"hourly": rows(older_run)}},
        }
        candidate = {
            "generatedAt": TARGET,
            "zones": {part.cache_key: {"hourly": rows(newer_run)}},
        }
        active_evidence = producer.operational_wave_collection_evidence(
            active,
            [zone],
            parse_utc_hour(TARGET),
            "wam_dw",
            exact_required_times={TARGET},
        )
        candidate_evidence = producer.operational_wave_collection_evidence(
            candidate,
            [zone],
            parse_utc_hour(TARGET),
            "wam_dw",
            exact_required_times={TARGET},
        )
        candidate_single_group = (
            producer.operational_wave_collection_evidence(
                candidate,
                [zone],
                parse_utc_hour(TARGET),
                "wam_dw",
                exact_required_times={TARGET},
                require_single_group=True,
            )
        )
        decision = producer.operational_wave_phase_promotion_decision(
            active_evidence,
            candidate_evidence,
            fallback_phase=False,
            candidate_changed=True,
            candidate_phase_model_run=newer_run,
            candidate_single_group=candidate_single_group,
        )

        self.assertTrue(decision["coherentCandidateComplete"])
        self.assertTrue(decision["phaseOwnedCandidateComplete"])
        self.assertTrue(decision["promote"], decision)

    def test_equal_count_pair_swap_is_not_monotone(self) -> None:
        target = frozenset({("A", TARGET), ("A", utc_offset(TARGET, 1))})
        active = {
            "targetPairKeys": target,
            "verifiedPairKeys": frozenset({("A", TARGET)}),
            "lineageConflictKeys": frozenset(),
        }
        candidate = {
            "targetPairKeys": target,
            "verifiedPairKeys": frozenset({
                ("A", utc_offset(TARGET, 1)),
            }),
            "lineageConflictKeys": frozenset(),
        }

        decision = producer.operational_wave_phase_promotion_decision(
            active,
            candidate,
            fallback_phase=False,
            candidate_changed=True,
        )

        self.assertFalse(decision["promote"])
        self.assertEqual(decision["reasonCode"], "RESOLVED_PAIR_REGRESSION")
        self.assertFalse(decision["resolvedPairSuperset"])

    def test_safe_tail_candidate_promotes_without_resetting_active_rows(
        self,
    ) -> None:
        _registry, part, zone = self._one_part_wave_fixture()
        run = utc_offset(TARGET, -6)
        active = {
            "generatedAt": TARGET,
            "zones": {part.cache_key: {"hourly": {
                utc_offset(TARGET, offset): wave_native_hour(
                    part,
                    utc_offset(TARGET, offset),
                    run,
                    collection="wam_dw",
                )
                for offset in range(0, 115, 3)
            }}},
        }
        candidate = producer.build_operational_wave_collection_candidate(
            active
        )
        candidate["zones"][part.cache_key]["hourly"][
            utc_offset(TARGET, 117)
        ] = wave_native_hour(
            part,
            utc_offset(TARGET, 117),
            run,
            collection="wam_dw",
        )
        active_evidence = producer.operational_wave_collection_evidence(
            active,
            [zone],
            parse_utc_hour(TARGET),
            "wam_dw",
            exact_required_times={TARGET},
        )
        candidate_evidence = producer.operational_wave_collection_evidence(
            candidate,
            [zone],
            parse_utc_hour(TARGET),
            "wam_dw",
            exact_required_times={TARGET},
        )
        decision = producer.operational_wave_phase_promotion_decision(
            active_evidence,
            candidate_evidence,
            fallback_phase=False,
            candidate_changed=True,
        )

        self.assertTrue(decision["promote"], decision)
        self.assertGreater(decision["pairImprovementCount"], 0)
        producer.commit_operational_wave_collection_candidate(
            active,
            candidate,
            {part.cache_key},
        )
        closure, missing = producer.operational_wave_collection_closure(
            active,
            [zone],
            parse_utc_hour(TARGET),
            "wam_dw",
            exact_required_times={TARGET},
        )
        self.assertEqual(closure["missingPairCount"], 0)
        self.assertEqual(missing, ())

    def test_fallback_requires_strict_pair_improvement(self) -> None:
        target = frozenset({("A", TARGET), ("A", utc_offset(TARGET, 1))})
        evidence = {
            "targetPairKeys": target,
            "verifiedPairKeys": frozenset({("A", TARGET)}),
            "lineageConflictKeys": frozenset(),
        }
        decision = producer.operational_wave_phase_promotion_decision(
            evidence,
            evidence,
            fallback_phase=True,
            candidate_changed=True,
        )
        self.assertFalse(decision["promote"])
        self.assertEqual(
            decision["reasonCode"],
            "FALLBACK_NO_PAIR_IMPROVEMENT",
        )

    def test_terminal_newest_failure_can_recover_from_older_own_run(
        self,
    ) -> None:
        _registry, part, zone = self._one_part_wave_fixture()
        older_run = utc_offset(TARGET, -6)
        active = {
            "generatedAt": TARGET,
            "zones": {part.cache_key: {"hourly": {
                utc_offset(TARGET, offset): wave_native_hour(
                    part,
                    utc_offset(TARGET, offset),
                    older_run,
                    collection="wam_dw",
                )
                for offset in range(0, 115, 3)
            }}},
        }
        candidate = producer.build_operational_wave_collection_candidate(
            active
        )
        fallback_asset = {
            "valid": utc_offset(TARGET, 117),
            "id": "synthetic-older-tail",
            "assetIdentitySha256": "b" * 64,
            "modelRun": older_run,
            "operationalWavePhaseRank": 1,
        }
        candidate["zones"][part.cache_key]["hourly"][
            fallback_asset["valid"]
        ] = wave_native_hour(
            part,
            fallback_asset["valid"],
            older_run,
            collection="wam_dw",
        )
        active_evidence = producer.operational_wave_collection_evidence(
            active,
            [zone],
            parse_utc_hour(TARGET),
            "wam_dw",
            exact_required_times={TARGET},
        )
        candidate_evidence = producer.operational_wave_collection_evidence(
            candidate,
            [zone],
            parse_utc_hour(TARGET),
            "wam_dw",
            exact_required_times={TARGET},
        )
        self.assertTrue(producer.operational_wave_fallback_phase_allowed(
            previous_phase_rank=0,
            next_phase_rank=1,
            previous_phase_fully_traversed=True,
            stop_code=None,
            active_evidence=active_evidence,
        ))
        decision = producer.operational_wave_phase_promotion_decision(
            active_evidence,
            candidate_evidence,
            fallback_phase=True,
            candidate_changed=True,
        )
        mapped = producer.MappingWaveAsset(
            fallback_asset,
            fallback_asset["modelRun"],
        )
        self.assertEqual(mapped.model_run, older_run)
        self.assertTrue(decision["promote"], decision)
        self.assertGreater(decision["pairImprovementCount"], 0)

    def test_older_phase_requires_terminal_primary_and_no_budget_stop(
        self,
    ) -> None:
        residual = {
            "closure": {"requiredPairCount": 2, "missingPairCount": 1},
        }
        self.assertTrue(producer.operational_wave_fallback_phase_allowed(
            previous_phase_rank=0,
            next_phase_rank=1,
            previous_phase_fully_traversed=True,
            stop_code=None,
            active_evidence=residual,
        ))
        self.assertFalse(producer.operational_wave_fallback_phase_allowed(
            previous_phase_rank=0,
            next_phase_rank=1,
            previous_phase_fully_traversed=False,
            stop_code=None,
            active_evidence=residual,
        ))
        self.assertFalse(producer.operational_wave_fallback_phase_allowed(
            previous_phase_rank=0,
            next_phase_rank=1,
            previous_phase_fully_traversed=True,
            stop_code="RUNTIME_BUDGET_REACHED",
            active_evidence=residual,
        ))

    def test_unpromoted_completed_stage_cannot_mask_active_residual(
        self,
    ) -> None:
        outcome = producer.operational_wave_collection_outcome(
            {"requiredPairCount": 670, "missingPairCount": 1},
            0,
        )
        self.assertFalse(outcome["activeComplete"])
        self.assertFalse(outcome["semanticProgress"])
        self.assertTrue(outcome["retryImmediately"])
        self.assertFalse(producer.collection_assets_complete_for_state(
            operational_wave=True,
            generic_assets_complete=True,
            wave_outcome=outcome,
        ))
        self.assertTrue(producer.collection_assets_complete_for_state(
            operational_wave=False,
            generic_assets_complete=True,
            wave_outcome=outcome,
        ))

        raw_download_did_not_change_outcome = (
            producer.operational_wave_collection_outcome(
                {"requiredPairCount": 670, "missingPairCount": 1},
                0,
            )
        )
        self.assertEqual(raw_download_did_not_change_outcome, outcome)

    def test_stage_orchestrator_mutates_active_state_only_on_promotion(
        self,
    ) -> None:
        class Controller:
            def __init__(self) -> None:
                self.observed = 0
                self.committed = 0

            def observe_asset_duration(self, _seconds: float) -> None:
                self.observed += 1

            def note_committed_asset(self, *, seconds: float) -> bool:
                self.committed += 1
                return seconds > 0

        target = frozenset({("A", TARGET), ("A", utc_offset(TARGET, 1))})
        active_evidence = {
            "closure": {
                "requiredPairCount": 2,
                "missingPairCount": 1,
                "lineageConflictNativeTimeCount": 0,
                "lineageConflictRequiredPairCount": 0,
            },
            "missingValidTimes": (utc_offset(TARGET, 1),),
            "targetPairKeys": target,
            "verifiedPairKeys": frozenset({("A", TARGET)}),
            "lineageConflictKeys": frozenset(),
        }
        swapped_evidence = {
            **active_evidence,
            "verifiedPairKeys": frozenset({
                ("A", utc_offset(TARGET, 1)),
            }),
        }
        active_result = {
            "zones": {"PART::A": {"sentinel": "active"}},
            "runs": {"wam_dw": {
                "referenceTime": utc_offset(TARGET, -6),
                "processedSteps": {"active": {"complete": True}},
            }},
        }
        candidate_result = {
            "zones": {"PART::A": {"sentinel": "candidate"}},
        }
        before = copy.deepcopy(active_result)
        fresh: set[str] = set()
        controller = Controller()
        run_info = {
            "referenceTime": TARGET,
            "processedSteps": {"unpromoted": {"complete": True}},
        }

        rejected = producer.promote_operational_wave_collection_stage(
            active_result=active_result,
            candidate_result=candidate_result,
            collection="wam_dw",
            phase_model_run=TARGET,
            fallback_phase=False,
            active_evidence=active_evidence,
            candidate_evidence=swapped_evidence,
            candidate_single_group=None,
            touched_zone_ids={"PART::A"},
            run_info=run_info,
            fresh_zone_ids=fresh,
            exact_required_times={TARGET},
            checkpoint_controller=controller,
            asset_processing_seconds=1.0,
        )
        self.assertFalse(rejected["promote"])
        self.assertEqual(active_result, before)
        self.assertEqual(fresh, set())
        self.assertEqual(controller.observed, 1)
        self.assertEqual(controller.committed, 0)

        older_run = utc_offset(TARGET, -6)
        completed_evidence = {
            **active_evidence,
            "closure": {
                **active_evidence["closure"],
                "missingPairCount": 0,
            },
            "missingValidTimes": (),
            "verifiedPairKeys": target,
        }
        run_info = {"referenceTime": older_run}
        promoted = producer.promote_operational_wave_collection_stage(
            active_result=active_result,
            candidate_result=candidate_result,
            collection="wam_dw",
            phase_model_run=older_run,
            fallback_phase=True,
            active_evidence=active_evidence,
            candidate_evidence=completed_evidence,
            candidate_single_group=None,
            touched_zone_ids={"PART::A"},
            run_info=run_info,
            fresh_zone_ids=fresh,
            exact_required_times={TARGET},
            checkpoint_controller=controller,
            asset_processing_seconds=2.0,
        )
        self.assertTrue(promoted["promote"], promoted)
        self.assertEqual(
            active_result["zones"]["PART::A"]["sentinel"],
            "candidate",
        )
        self.assertEqual(
            active_result["runs"]["wam_dw"]["referenceTime"],
            older_run,
        )
        self.assertEqual(fresh, {"PART::A"})
        self.assertEqual(controller.observed, 1)
        self.assertEqual(controller.committed, 1)

    def test_complete_primary_quality_phase_scans_once_at_terminal(
        self,
    ) -> None:
        _registry, part, zone = self._one_part_wave_fixture()
        older_run = utc_offset(TARGET, -6)
        newer_run = TARGET

        def rows(model_run: str) -> dict:
            return {
                utc_offset(TARGET, offset): wave_native_hour(
                    part,
                    utc_offset(TARGET, offset),
                    model_run,
                    collection="wam_dw",
                )
                for offset in range(0, 118, 3)
            }

        active_result = {
            "generatedAt": TARGET,
            "zones": {part.cache_key: {"hourly": rows(older_run)}},
            "runs": {"wam_dw": {"referenceTime": older_run}},
        }
        candidate_result = {
            "generatedAt": TARGET,
            "zones": {part.cache_key: {"hourly": rows(newer_run)}},
        }
        active_evidence = producer.operational_wave_collection_evidence(
            active_result,
            [zone],
            parse_utc_hour(TARGET),
            "wam_dw",
            exact_required_times={TARGET},
        )
        self.assertTrue(
            producer.operational_wave_phase_defers_primary_quality_promotion(
                phase_rank=0,
                active_evidence=active_evidence,
            )
        )
        self.assertFalse(
            producer.operational_wave_phase_defers_primary_quality_promotion(
                phase_rank=1,
                active_evidence=active_evidence,
            )
        )
        incomplete_evidence = copy.deepcopy(active_evidence)
        incomplete_evidence["closure"]["missingPairCount"] = 1
        self.assertFalse(
            producer.operational_wave_phase_defers_primary_quality_promotion(
                phase_rank=0,
                active_evidence=incomplete_evidence,
            )
        )
        with patch.object(
            producer,
            "operational_wave_collection_evidence",
            wraps=producer.operational_wave_collection_evidence,
        ) as evidence_scan:
            candidate_evidence, candidate_single_group = (
                producer.operational_wave_candidate_stage_evidence(
                    candidate_result,
                    [zone],
                    parse_utc_hour(TARGET),
                    "wam_dw",
                    exact_required_times={TARGET},
                    active_evidence=active_evidence,
                )
            )
        self.assertEqual(evidence_scan.call_count, 2)
        self.assertTrue(
            evidence_scan.call_args_list[1].kwargs["require_single_group"]
        )

        class Controller:
            def __init__(self) -> None:
                self.observed_seconds: list[float] = []
                self.committed_seconds: list[float | None] = []
                self.forced_flushes = 0

            def observe_asset_duration(self, seconds: float) -> None:
                self.observed_seconds.append(seconds)

            def note_committed_asset(
                self,
                *,
                seconds: float | None,
            ) -> bool:
                self.committed_seconds.append(seconds)
                return False

            def flush_if_due(self, *, force: bool = False) -> bool:
                self.forced_flushes += int(force)
                return force

        controller = Controller()
        controller.observe_asset_duration(1.25)
        controller.observe_asset_duration(2.5)
        fresh: set[str] = set()
        self.assertTrue(
            producer.operational_wave_terminal_quality_promotion_allowed(
                promotion_deferred=True,
                phase_fully_traversed=True,
                stop_code=None,
                candidate_changed=True,
            )
        )
        decision = producer.promote_operational_wave_collection_stage(
            active_result=active_result,
            candidate_result=candidate_result,
            collection="wam_dw",
            phase_model_run=newer_run,
            fallback_phase=False,
            active_evidence=active_evidence,
            candidate_evidence=candidate_evidence,
            candidate_single_group=candidate_single_group,
            touched_zone_ids={part.cache_key},
            run_info={"referenceTime": newer_run},
            fresh_zone_ids=fresh,
            exact_required_times={TARGET},
            checkpoint_controller=controller,
            asset_processing_seconds=None,
            force_checkpoint=True,
        )
        self.assertTrue(decision["promote"], decision)
        self.assertEqual(controller.observed_seconds, [1.25, 2.5])
        self.assertEqual(controller.committed_seconds, [None])
        self.assertEqual(controller.forced_flushes, 1)
        self.assertTrue(decision["checkpointWritten"])
        self.assertEqual(
            active_result["runs"]["wam_dw"]["referenceTime"],
            newer_run,
        )
        self.assertEqual(fresh, {part.cache_key})

    def test_incomplete_or_stopped_quality_phase_cannot_promote_on_restart(
        self,
    ) -> None:
        active = {
            "zones": {"PART::A": {"sentinel": "active"}},
            "runs": {
                "wam_dw": {
                    "referenceTime": utc_offset(TARGET, -6),
                    "processedSteps": {"old": {"complete": True}},
                }
            },
        }
        before = copy.deepcopy(active)
        attempt_run_info = {
            "referenceTime": TARGET,
            "processedSteps": {"new": {"complete": True}},
        }
        for fully_traversed, stop_code, candidate_changed in (
            (False, None, True),
            (True, "RUNTIME_BUDGET_REACHED", True),
            (True, "INTERRUPTED", True),
            (True, None, False),
        ):
            self.assertFalse(
                producer.operational_wave_terminal_quality_promotion_allowed(
                    promotion_deferred=True,
                    phase_fully_traversed=fully_traversed,
                    stop_code=stop_code,
                    candidate_changed=candidate_changed,
                )
            )
        self.assertEqual(active, before)
        self.assertNotEqual(
            active["runs"]["wam_dw"],
            attempt_run_info,
        )
        self.assertTrue(producer.operational_wave_phase_fully_traversed(
            selected_asset_count=2,
            proven_asset_count=2,
            stop_code=None,
            native_closure_stopped=False,
        ))
        for proven, stop_code, stopped in (
            (1, None, False),       # one selected asset failed/skipped
            (2, "RUNTIME_BUDGET_REACHED", False),
            (2, None, True),
        ):
            fully_traversed = producer.operational_wave_phase_fully_traversed(
                selected_asset_count=2,
                proven_asset_count=proven,
                stop_code=stop_code,
                native_closure_stopped=stopped,
            )
            self.assertFalse(fully_traversed)
            self.assertFalse(
                producer.operational_wave_terminal_quality_promotion_allowed(
                    promotion_deferred=True,
                    phase_fully_traversed=fully_traversed,
                    stop_code=stop_code,
                    candidate_changed=True,
                )
            )

    def test_hole_promotion_stays_immediate_before_deferred_quality_work(
        self,
    ) -> None:
        target = frozenset({("A", TARGET), ("A", utc_offset(TARGET, 1))})
        active_evidence = {
            "closure": {
                "requiredPairCount": 2,
                "missingPairCount": 1,
                "lineageConflictNativeTimeCount": 0,
                "lineageConflictRequiredPairCount": 0,
            },
            "missingValidTimes": (utc_offset(TARGET, 1),),
            "targetPairKeys": target,
            "verifiedPairKeys": frozenset({("A", TARGET)}),
            "lineageConflictKeys": frozenset(),
        }
        completed_evidence = {
            **active_evidence,
            "closure": {
                **active_evidence["closure"],
                "missingPairCount": 0,
            },
            "missingValidTimes": (),
            "verifiedPairKeys": target,
        }

        class Controller:
            def __init__(self) -> None:
                self.commits = 0

            def observe_asset_duration(self, _seconds: float) -> None:
                raise AssertionError("an improving hole must not be observation-only")

            def note_committed_asset(self, *, seconds: float | None) -> bool:
                self.commits += 1
                return True

        active_result = {
            "zones": {"PART::A": {"sentinel": "old"}},
            "runs": {},
        }
        promoted = producer.promote_operational_wave_collection_stage(
            active_result=active_result,
            candidate_result={
                "zones": {"PART::A": {"sentinel": "hole-filled"}},
            },
            collection="wam_dw",
            phase_model_run=TARGET,
            fallback_phase=False,
            active_evidence=active_evidence,
            candidate_evidence=completed_evidence,
            candidate_single_group=None,
            touched_zone_ids={"PART::A"},
            run_info={"referenceTime": TARGET},
            fresh_zone_ids=set(),
            exact_required_times={TARGET},
            checkpoint_controller=Controller(),
            asset_processing_seconds=1.0,
        )
        self.assertTrue(promoted["promote"], promoted)
        self.assertEqual(
            active_result["zones"]["PART::A"]["sentinel"],
            "hole-filled",
        )
        self.assertTrue(
            producer.operational_wave_phase_defers_primary_quality_promotion(
                phase_rank=0,
                active_evidence=completed_evidence,
            )
        )
        self.assertFalse(
            producer.operational_wave_terminal_quality_promotion_allowed(
                promotion_deferred=True,
                phase_fully_traversed=False,
                stop_code="RUNTIME_BUDGET_REACHED",
                candidate_changed=True,
            )
        )

        source = (SCRIPTS / "update-dmi-bulk.py").read_text("utf-8")
        promotion_update = source.index(
            "wave_phase_deferred_quality_promotion = (",
            source.index("wave_phase_promotion_count += 1"),
        )
        asset_defer = source.index(
            "if wave_phase_deferred_quality_promotion:",
            promotion_update,
        )
        terminal_finish = source.index(
            "finish_wave_phase(",
            asset_defer,
        )
        self.assertLess(promotion_update, asset_defer)
        self.assertLess(asset_defer, terminal_finish)

    def test_fallback_completion_stops_remaining_fallback_assets(self) -> None:
        fallback_assets = ["fills-last-hole", "quality-1", "quality-2"]
        processed = []
        for asset_id in fallback_assets:
            processed.append(asset_id)
            closure = {
                "requiredPairCount": 1,
                "missingPairCount": 0 if asset_id == "fills-last-hole" else 1,
            }
            if producer.should_stop_operational_wave_asset_loop(
                "wam_dw",
                closure,
                launch_mode=True,
            ):
                break
        self.assertEqual(processed, ["fills-last-hole"])

        source = (SCRIPTS / "update-dmi-bulk.py").read_text("utf-8")
        caller = source.index(
            "if should_stop_operational_wave_asset_loop(",
            source.index("and wave_promoted"),
        )
        fallback_stop = source.index("or wave_phase_rank > 0", caller)
        loop_break = source.index("if stop_for_native_wave_closure:", caller)
        self.assertLess(caller, fallback_stop)
        self.assertLess(fallback_stop, loop_break)

    def test_tail_closure_precedes_old_overlap_and_proof_complete_assets(self) -> None:
        assets = [
            {"valid": TARGET, "id": "old-proof"},
            {"valid": utc_offset(TARGET, 12), "id": "old-overlap"},
            {"valid": utc_offset(TARGET, 114), "id": "tail-support"},
            {"valid": utc_offset(TARGET, 117), "id": "tail-exact"},
        ]
        ordered = producer.prioritize_operational_wave_assets(
            assets,
            (utc_offset(TARGET, 117),),
            {TARGET},
        )
        self.assertEqual(
            [asset["id"] for asset in ordered],
            ["tail-exact", "tail-support", "old-overlap", "old-proof"],
        )

    def test_launch_committed_native_closure_stops_before_old_overlap(self) -> None:
        assets = producer.prioritize_operational_wave_assets(
            [
                {"valid": utc_offset(TARGET, 12), "id": "old-overlap"},
                {"valid": utc_offset(TARGET, 117), "id": "tail-exact"},
            ],
            (utc_offset(TARGET, 117),),
            set(),
        )
        incomplete = {"requiredPairCount": 1, "missingPairCount": 1}
        complete = {"requiredPairCount": 1, "missingPairCount": 0}
        self.assertFalse(
            producer.operational_wave_native_closure_complete(incomplete)
        )
        self.assertFalse(producer.operational_wave_native_closure_complete({}))
        self.assertTrue(
            producer.operational_wave_native_closure_complete(complete)
        )
        self.assertFalse(
            producer.should_stop_operational_wave_asset_loop(
                "wam_dw",
                incomplete,
                launch_mode=True,
            )
        )
        self.assertFalse(
            producer.should_stop_operational_wave_asset_loop(
                "wam_dw",
                complete,
                launch_mode=False,
            )
        )
        self.assertTrue(
            producer.should_stop_operational_wave_asset_loop(
                "wam_dw",
                complete,
                launch_mode=True,
            )
        )

        processed = []
        for asset in assets:
            processed.append(asset["id"])
            closure = complete if asset["id"] == "tail-exact" else incomplete
            if producer.should_stop_operational_wave_asset_loop(
                "wam_dw",
                closure,
                launch_mode=True,
            ):
                break
        self.assertEqual(processed, ["tail-exact"])
        self.assertNotIn("old-overlap", processed)

        source = (SCRIPTS / "update-dmi-bulk.py").read_text("utf-8")
        loop_start = source.rindex(
            "for asset_number, asset in enumerate(assets, start=1):"
        )
        loop_end = source.index(
            'result["diagnostics"]["parametersByCollection"][collection]',
            loop_start,
        )
        loop = source[loop_start:loop_end]
        promotion = loop.index("try_promote_wave_candidate(")
        promotion_guard = loop.index("and wave_promoted", promotion)
        closure = loop.index(
            'wave_closure_after_commit = wave_active_evidence[',
            promotion_guard,
        )
        stop_helper = loop.index(
            "should_stop_operational_wave_asset_loop(", closure
        )
        fallback_guard = loop.index(
            "or wave_phase_rank > 0", stop_helper
        )
        stop_metric = loop.index(
            '"operationalWaveClosureStopsByCollection"', stop_helper
        )
        checkpoint_dirty = loop.index(
            "checkpoint_controller.mark_bulk_dirty()", stop_metric
        )
        forced_checkpoint = loop.index(
            "checkpoint_controller.flush_if_due(force=True)",
            checkpoint_dirty,
        )
        normal_stop = loop.index(
            "if stop_for_native_wave_closure:", forced_checkpoint
        )
        break_after_closure = loop.index("break", normal_stop)
        self.assertLess(promotion, closure)
        self.assertLess(promotion, promotion_guard)
        self.assertLess(promotion_guard, closure)
        self.assertLess(closure, stop_helper)
        self.assertLess(stop_helper, fallback_guard)
        self.assertLess(fallback_guard, stop_metric)
        self.assertLess(stop_helper, stop_metric)
        self.assertLess(stop_metric, checkpoint_dirty)
        self.assertLess(checkpoint_dirty, forced_checkpoint)
        self.assertLess(forced_checkpoint, normal_stop)
        self.assertLess(normal_stop, break_after_closure)
        self.assertNotIn(
            "budget_stop =",
            loop[normal_stop:break_after_closure],
        )

    def test_scheduler_skips_proof_complete_wam_family(self) -> None:
        planned, diagnostics = producer.operational_collection_plan(
            ["wam_dw", "wam_nsb", "harmonie_dini_sf"],
            {},
            True,
            {
                "wam_dw": {
                    "requiredPairCount": 10,
                    "missingPairCount": 0,
                },
                "wam_nsb": {
                    "requiredPairCount": 10,
                    "missingPairCount": 2,
                },
            },
            1200.0,
            force_wam_collections={"wam_dw", "wam_nsb"},
        )
        self.assertNotIn("wam_dw", planned)
        self.assertEqual(planned[0], "wam_nsb")
        self.assertEqual(
            diagnostics["proofCompleteWamCollectionsSkipped"],
            ["wam_dw"],
        )
        self.assertEqual(
            diagnostics["proofCompleteWamCollectionsRetainedForQuality"],
            [],
        )

        normal_planned, normal_diagnostics = producer.operational_collection_plan(
            ["wam_dw", "wam_nsb", "harmonie_dini_sf"],
            {},
            True,
            {
                "wam_dw": {
                    "requiredPairCount": 10,
                    "missingPairCount": 0,
                },
                "wam_nsb": {
                    "requiredPairCount": 10,
                    "missingPairCount": 2,
                },
            },
            1200.0,
        )
        self.assertIn("wam_dw", normal_planned)
        self.assertEqual(
            normal_diagnostics["proofCompleteWamCollectionsSkipped"],
            [],
        )
        self.assertEqual(
            normal_diagnostics[
                "proofCompleteWamCollectionsRetainedForQuality"
            ],
            ["wam_dw"],
        )


class ColdCacheFirstTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        cls.registry = load_coastal_part_registry(
            wave_registry_document(673),
        )
        cls.required = policy_utc_hours(TARGET, COLD_START_POLICY)
        model_run = cls.required[0]

        def rows_for_part(part) -> dict:
            index = int(part.part_id.rsplit("-", 1)[1])
            collection = "wam_nsb" if index >= 337 else "wam_dw"
            return {
                hour: wave_native_hour(
                    part,
                    hour,
                    model_run,
                    collection=collection,
                )
                for hour in cls.required
            }

        cls.complete_cache = wave_cache_for_registry(
            cls.registry,
            rows_for_part,
        )
        cls.complete_cache["diagnostics"] = {}
        cls.parts = [
            {
                "id": part.cache_key,
                "coastalPart": True,
                "coastType": (
                    "west"
                    if int(part.part_id.rsplit("-", 1)[1]) >= 337
                    else "east"
                ),
            }
            for part in cls.registry.parts
        ]
        cls.configuration = {
            "mode": COLD_START_MODE,
            "policy": COLD_START_POLICY,
            "targetHour": TARGET,
            "productionTargetHour": TARGET,
            "requiredHours": cls.required,
            "operationalExactHours": (TARGET,),
        }

    def test_complete_exact_private_cache_skips_unavailable_live_stac(self) -> None:
        result = copy.deepcopy(self.complete_cache)
        with (
            patch.object(producer, "list_private_wave_bootstrap_assets") as stac,
            patch.object(producer, "should_stop_work", return_value=False),
            patch.object(producer, "write_checkpoint"),
        ):
            locked = producer.execute_private_wave_history_bootstrap(
                result,
                self.parts,
                {"bytes": 0},
                set(),
                self.configuration,
                registry=self.registry,
            )

        stac.assert_not_called()
        expected_locked = set(self.required[:-1])
        self.assertEqual(set(locked), {"wam_dw", "wam_nsb"})
        self.assertEqual(locked["wam_dw"], expected_locked)
        self.assertEqual(locked["wam_nsb"], expected_locked)
        aggregate = result["diagnostics"]["privateWaveHistoryBootstrap"]
        self.assertEqual(aggregate["status"], "history-complete")
        self.assertEqual(
            aggregate["cacheFirst"]["selectionMode"],
            "complete-private-cache",
        )
        self.assertEqual(aggregate["cacheFirst"]["exactTupleCount"], 673 * 49)
        self.assertEqual(aggregate["cacheFirst"]["registryPartCount"], 673)
        self.assertEqual(
            aggregate["cacheFirst"]["waveMaximumDistanceKmByCollection"],
            {"wam_dw": 2.0, "wam_nsb": 8.0},
        )
        self.assertEqual(
            sum(
                aggregate["cacheFirst"]
                ["nativeDistanceEvidenceCountByCollection"].values()
            ),
            673 * 49,
        )
        self.assertEqual(
            aggregate["cacheFirst"]["maximumNativeDistanceKmByCollection"],
            {"wam_dw": 0.0, "wam_nsb": 0.0},
        )
        serialized = json.dumps(aggregate, sort_keys=True)
        self.assertNotIn("PART::", serialized)
        self.assertNotIn("part-000", serialized)
        self.assertNotIn("gridPoint", serialized)
        self.assertNotIn("significant-wave-height", serialized)

    def test_missing_cached_first_hour_is_preserved_as_history_incomplete(self) -> None:
        result = copy.deepcopy(self.complete_cache)
        first_zone = next(iter(result["zones"].values()))
        first_zone["hourly"].pop(self.required[0])
        preserved_hour = first_zone["hourly"][self.required[1]]
        preserved_target = copy.deepcopy(first_zone["hourly"][TARGET])
        with (
            patch.object(
                producer,
                "list_private_wave_bootstrap_assets",
                side_effect=producer.WaveBootstrapError("NO_COHERENT_RUN"),
            ) as stac,
            patch.object(producer, "should_stop_work", return_value=False),
            patch.object(producer, "write_checkpoint") as checkpoint,
        ):
            locked = producer.execute_private_wave_history_bootstrap(
                result,
                self.parts,
                {"bytes": 0},
                set(),
                self.configuration,
                registry=self.registry,
            )

        self.assertEqual(locked, {})
        stac.assert_not_called()
        checkpoint.assert_called_once()
        aggregate = result["diagnostics"]["privateWaveHistoryBootstrap"]
        self.assertEqual(aggregate["cacheFirst"]["status"], "incomplete")
        self.assertEqual(
            aggregate["cacheFirst"]["failureCode"],
            "MISSING_HOUR",
        )
        self.assertNotIn("resetWaveRowCount", aggregate["cacheFirst"])
        self.assertEqual(aggregate["status"], "history-incomplete")
        self.assertTrue(aggregate["historyIncomplete"])
        self.assertEqual(aggregate["historyIncompleteCode"], "HISTORY_INCOMPLETE")
        self.assertTrue(aggregate["historyNetworkDeferred"])
        self.assertIn("significant-wave-height", preserved_hour)
        self.assertIn("wave", preserved_hour["sources"])
        self.assertEqual(first_zone["hourly"][TARGET], preserved_target)

    def test_legacy_missing_cell_salvages_only_invalid_part_hour(self) -> None:
        result = copy.deepcopy(self.complete_cache)
        first_zone = next(iter(result["zones"].values()))
        first_hour = next(iter(first_zone["hourly"].values()))
        first_hour["current-u"] = 0.125
        first_hour.setdefault("sources", {})["current"] = {"sentinel": "preserved"}
        first_hour["sources"]["wave"].pop("gridPoint")
        with (
            patch.object(
                producer,
                "list_private_wave_bootstrap_assets",
                side_effect=producer.WaveBootstrapError("NO_COHERENT_RUN"),
            ) as stac,
            patch.object(producer, "should_stop_work", return_value=False),
            patch.object(producer, "write_checkpoint") as checkpoint,
        ):
            locked = producer.execute_private_wave_history_bootstrap(
                result,
                self.parts,
                {"bytes": 0},
                set(),
                self.configuration,
                registry=self.registry,
            )

        self.assertEqual(locked, {})
        stac.assert_not_called()
        self.assertEqual(checkpoint.call_count, 2)
        aggregate = result["diagnostics"]["privateWaveHistoryBootstrap"]
        self.assertEqual(aggregate["cacheFirst"]["failureCode"], "MISSING_CELL")
        self.assertEqual(
            aggregate["cacheFirst"]["salvage"]["removedRowCount"],
            1,
        )
        self.assertEqual(
            aggregate["cacheFirst"]["salvage"]["retainedValidRowCount"],
            673 * len(self.required) - 1,
        )
        self.assertEqual(
            aggregate["cacheFirst"]["salvage"]["rejectedByCode"],
            {"MISSING_CELL": 1},
        )
        self.assertEqual(first_hour["current-u"], 0.125)
        self.assertEqual(first_hour["sources"]["current"], {"sentinel": "preserved"})
        self.assertNotIn("significant-wave-height", first_hour)
        self.assertNotIn("dominant-wave-period", first_hour)
        self.assertNotIn("mean-wave-dir", first_hour)
        self.assertNotIn("wave", first_hour.get("sources") or {})
        remaining_wave_rows = sum(
            "wave" in (hour.get("sources") or {})
            for point in result["zones"].values()
            for hour in point["hourly"].values()
        )
        self.assertEqual(remaining_wave_rows, 673 * len(self.required) - 1)

    def test_migration_still_fails_when_no_coherent_history_run_exists(self) -> None:
        result = copy.deepcopy(self.complete_cache)
        migration = {
            **self.configuration,
            "mode": MIGRATION_MODE,
            "policy": MIGRATION_POLICY,
            "requiredHours": policy_utc_hours(TARGET, MIGRATION_POLICY),
        }
        with (
            patch.object(
                producer,
                "list_private_wave_bootstrap_assets",
                side_effect=producer.WaveBootstrapError("NO_COHERENT_RUN"),
            ),
            patch.object(producer, "should_stop_work", return_value=False),
            patch.object(producer, "write_checkpoint"),
        ):
            with self.assertRaises(producer.WaveBootstrapError) as raised:
                producer.execute_private_wave_history_bootstrap(
                    result,
                    self.parts,
                    {"bytes": 0},
                    set(),
                    migration,
                    registry=self.registry,
                )

        self.assertEqual(raised.exception.code, "NO_COHERENT_RUN")


class ResumeAndFailClosedTests(unittest.TestCase):
    @staticmethod
    def _synthetic_wave_lineage() -> dict:
        return {
            "collection": "wam_dw",
            "nativeValidTime": TARGET,
            "modelRun": utc_offset(TARGET, -6),
            "itemId": "synthetic-item",
            "assetIdentitySha256": "a" * 64,
            "gridDefinitionSha256": "b" * 64,
            "contentSha256": "c" * 64,
        }

    @staticmethod
    def _wave_summary(
        zones: list[dict],
        accepted_ids: set[str],
        rejected_by_code: dict[str, int],
    ) -> dict:
        target_ids = {str(zone.get("id") or "") for zone in zones}
        lineage = producer.wave_asset_lineage_identity(
            ResumeAndFailClosedTests._synthetic_wave_lineage()
        )
        if lineage is None:
            raise AssertionError("synthetic WAM lineage must be valid")
        canonical_lineage = json.dumps(
            lineage,
            ensure_ascii=False,
            sort_keys=True,
            separators=(",", ":"),
        )
        return {
            "schemaVersion": producer.WAVE_ASSET_CACHE_PROOF_SCHEMA,
            "admissionPolicy": producer.WAVE_ASSET_ADMISSION_POLICY,
            "waveOwnerPolicyId": producer.WAVE_OWNER_POLICY_ID,
            "requiredCount": len(zones),
            "acceptedCount": len(accepted_ids),
            "rejectedCount": len(zones) - len(accepted_ids),
            "rejectedByCode": rejected_by_code,
            "targetRegistrySha256": producer.wave_target_registry_sha256(
                "wam_dw", zones,
            ),
            "acceptedTargetSetSha256": producer.wave_target_set_sha256(
                accepted_ids,
            ),
            "rejectedTargetSetSha256": producer.wave_target_set_sha256(
                target_ids - accepted_ids,
            ),
            "acceptedLineageCount": 1 if accepted_ids else 0,
            "acceptedLineageEvidenceCount": len(accepted_ids),
            "acceptedLineageSha256": (
                hashlib.sha256(canonical_lineage.encode("utf-8")).hexdigest()
                if accepted_ids
                else None
            ),
            "rawContentSha256": "c" * 64 if accepted_ids else None,
        }

    def test_real_parser_path_admits_one_part_and_preserves_rejected_sibling(
        self,
    ) -> None:
        """Exercise parser, provenance, summary and admission in one flow."""
        zones = [
            {
                "id": "PART::SYNTHETIC-ACCEPTED",
                "parentZoneId": "SYNTHETIC-PARENT",
                "coastalPart": True,
                "coastType": "east",
                "lon": 9.0,
                "lat": 56.0,
            },
            {
                "id": "PART::SYNTHETIC-REJECTED",
                "parentZoneId": "SYNTHETIC-PARENT",
                "coastalPart": True,
                "coastType": "east",
                "lon": 9.2,
                "lat": 56.0,
            },
        ]
        active = {
            "generatedAt": TARGET,
            "zones": {
                zone["id"]: {
                    **(producer.sampling_identity(zone) or {}),
                    "hourly": {},
                    "gridPoints": {},
                    "collections": {},
                    "sentinel": "unchanged",
                }
                for zone in zones
            },
        }
        before = copy.deepcopy(active)
        model_run = utc_offset(TARGET, -6)
        official_asset = {
            "valid": TARGET,
            "id": "synthetic-parser-item",
            "assetIdentitySha256": "a" * 64,
            "size": 7,
            "itemCreatedAt": utc_offset(TARGET, -7),
            "itemUpdatedAt": utc_offset(TARGET, -6),
        }
        official_identity = producer.official_wave_asset_identity(
            "wam_dw", model_run, official_asset,
        )
        self.assertIsNotNone(official_identity)
        asset = producer.MappingWaveAsset(
            official_asset,
            model_run,
            official_identity=official_identity,
        )
        capture = {
            "itemId": official_asset["id"],
            "assetIdentitySha256": official_asset["assetIdentitySha256"],
            "assetSizeBytes": official_asset["size"],
            "itemCreatedAt": official_asset["itemCreatedAt"],
            "itemUpdatedAt": official_asset["itemUpdatedAt"],
            "acquiredAt": TARGET,
            "contentLengthBytes": official_asset["size"],
            "contentSha256": "c" * 64,
        }
        parameters = {
            1: "significant-wave-height",
            2: "dominant-wave-period",
            3: "mean-wave-dir",
        }
        values = {1: 1.0, 2: 6.0, 3: 270.0}

        def candidates(gid, _collection, requested_zones):
            return {
                zone["id"]: ([{
                    "value": values[gid],
                    "latitude": zone["lat"],
                    "longitude": zone["lon"],
                    "distanceKm": 0.0,
                    "index": gid,
                    "gridDefinitionSha256": "d" * 64,
                    "_candidateCount": 1,
                }] if zone["id"] == zones[0]["id"] else [])
                for zone in requested_zones
            }

        summary: dict = {}

        def stage_validator(staged, _private, outcome):
            observed = producer.private_wave_bootstrap_asset_summary(
                staged, zones, "wam_dw", asset,
            )
            summary.update(observed)
            return producer.operational_wave_asset_stage_admissible(
                active, staged, zones, "wam_dw", asset, observed, outcome,
            )

        with tempfile.TemporaryDirectory(prefix="ravradar-wam-parser-") as raw:
            path = Path(raw) / "synthetic.grib"
            path.write_bytes(b"fixture")
            with (
                patch.object(
                    producer,
                    "codes_grib_new_from_file",
                    side_effect=[1, 2, 3, None],
                ),
                patch.object(producer, "codes_release", return_value=None),
                patch.object(
                    producer,
                    "field_signature",
                    side_effect=lambda gid: {"shortName": parameters[gid]},
                ),
                patch.object(
                    producer,
                    "classify_parameter",
                    side_effect=lambda gid, _collection: parameters[gid],
                ),
                patch.object(
                    producer,
                    "valid_candidates_batch",
                    side_effect=candidates,
                ),
                patch.object(
                    producer,
                    "raw_cache_source_capture",
                    return_value=capture,
                ),
                patch.object(producer, "should_stop_work", return_value=False),
            ):
                outcome = producer.process_grib_transactionally(
                    path,
                    "wam_dw",
                    model_run,
                    TARGET,
                    zones,
                    active,
                    {},
                    stage_validator=stage_validator,
                    validation_error="synthetic real-parser WAM admission",
                )

        self.assertEqual(outcome[0], set(parameters.values()))
        self.assertEqual(outcome[1], {zones[0]["id"]})
        self.assertFalse(outcome[2])
        self.assertEqual(outcome[3], 3)
        self.assertEqual(summary["acceptedCount"], 1)
        self.assertEqual(summary["rejectedCount"], 1)
        self.assertEqual(summary["acceptedLineageEvidenceCount"], 1)
        self.assertTrue(producer.wave_asset_cache_proof_coherent(summary))
        self.assertEqual(
            active["zones"][zones[1]["id"]],
            before["zones"][zones[1]["id"]],
        )
        accepted_hour = active["zones"][zones[0]["id"]]["hourly"][TARGET]
        self.assertEqual(accepted_hour["significant-wave-height"], 1.0)
        self.assertEqual(accepted_hour["dominant-wave-period"], 6.0)
        self.assertEqual(accepted_hour["mean-wave-dir"], 270.0)
        self.assertEqual(
            accepted_hour["sources"]["wave"]["contentSha256"],
            capture["contentSha256"],
        )

    def test_669_of_670_wave_asset_preserves_valid_parts_atomically(self) -> None:
        zones = [
            {
                "id": f"PART::SYNTHETIC-{index:03d}",
                "coastType": "east",
            }
            for index in range(670)
        ]
        active = {
            "generatedAt": TARGET,
            "zones": {
                zone["id"]: {"hourly": {}, "sentinel": "active"}
                for zone in zones
            },
        }
        before = copy.deepcopy(active)
        accepted_ids = {zone["id"] for zone in zones[:-1]}
        asset = SimpleNamespace(valid_time=TARGET)

        def fake_process(*args, **_kwargs):
            staged = args[5]
            for zone_id in accepted_ids:
                staged["zones"][zone_id]["hourly"][TARGET] = {
                    "candidate": True,
                    "sources": {"wave": self._synthetic_wave_lineage()},
                }
            return (
                {"significant-wave-height", "dominant-wave-period"},
                set(accepted_ids),
                False,
                2,
                1,
            )

        def rejection_code(document, zone, *_args):
            hour = (
                ((document.get("zones") or {}).get(zone["id"]) or {})
                .get("hourly", {})
                .get(TARGET, {})
            )
            return None if hour.get("candidate") is True else "INVALID_WAVE_TUPLE"

        summary: dict = {}

        def stage_validator(staged, _private, outcome):
            observed = producer.private_wave_bootstrap_asset_summary(
                staged, zones, "wam_dw", asset,
            )
            summary.update(observed)
            return producer.operational_wave_asset_stage_admissible(
                active,
                staged,
                zones,
                "wam_dw",
                asset,
                observed,
                outcome,
            )

        with (
            patch.object(producer, "process_grib", side_effect=fake_process),
            patch.object(
                producer,
                "private_wave_bootstrap_hour_rejection_code",
                side_effect=rejection_code,
            ),
            patch.object(
                producer,
                "complete_native_source_for_hour",
                return_value=False,
            ),
        ):
            producer.process_grib_transactionally(
                Path("synthetic.grib"),
                "wam_dw",
                utc_offset(TARGET, -6),
                TARGET,
                zones,
                active,
                {},
                stage_validator=stage_validator,
                validation_error="synthetic partial WAM asset",
            )

        self.assertEqual(summary["acceptedCount"], 669)
        self.assertEqual(summary["rejectedCount"], 1)
        for zone_id in accepted_ids:
            self.assertTrue(active["zones"][zone_id]["hourly"][TARGET]["candidate"])
        self.assertEqual(active["zones"][zones[-1]["id"]], before["zones"][zones[-1]["id"]])
        self.assertFalse(producer.operational_wave_asset_stage_complete(
            summary,
            (
                {"significant-wave-height", "dominant-wave-period"},
                accepted_ids,
                False,
                2,
                1,
            ),
        ))

    def test_zero_valid_wave_parts_still_roll_back_whole_asset(self) -> None:
        zones = [{"id": "PART::SYNTHETIC"}]
        active = {
            "generatedAt": TARGET,
            "zones": {zones[0]["id"]: {"hourly": {}, "sentinel": "active"}},
        }
        before = copy.deepcopy(active)
        asset = SimpleNamespace(valid_time=TARGET)

        def fake_process(*_args, **_kwargs):
            return (
                {"significant-wave-height", "dominant-wave-period"},
                set(),
                False,
                2,
                1,
            )

        summary = self._wave_summary(
            zones,
            set(),
            {"INVALID_WAVE_TUPLE": 1},
        )

        def stage_validator(staged, _private, outcome):
            return producer.operational_wave_asset_stage_admissible(
                active,
                staged,
                zones,
                "wam_dw",
                asset,
                summary,
                outcome,
            )

        with patch.object(producer, "process_grib", side_effect=fake_process):
            with self.assertRaises(RuntimeError):
                producer.process_grib_transactionally(
                    Path("synthetic.grib"),
                    "wam_dw",
                    utc_offset(TARGET, -6),
                    TARGET,
                    zones,
                    active,
                    {},
                    stage_validator=stage_validator,
                    validation_error="synthetic partial WAM asset",
                )

        self.assertEqual(active, before)

    def test_partial_wave_asset_cannot_mutate_a_rejected_part(self) -> None:
        zones = [{"id": "PART::ACCEPTED"}, {"id": "PART::REJECTED"}]
        active = {
            "generatedAt": TARGET,
            "zones": {
                zone["id"]: {"hourly": {}, "sentinel": "active"}
                for zone in zones
            },
        }
        before = copy.deepcopy(active)
        asset = SimpleNamespace(valid_time=TARGET)

        def fake_process(*args, **_kwargs):
            staged = args[5]
            staged["zones"]["PART::ACCEPTED"]["hourly"][TARGET] = {
                "candidate": True,
                "sources": {"wave": self._synthetic_wave_lineage()},
            }
            staged["zones"]["PART::REJECTED"]["hourly"][TARGET] = {
                "significant-wave-height": "invalid-mutation",
            }
            return (
                {"significant-wave-height", "dominant-wave-period"},
                {"PART::ACCEPTED"},
                False,
                2,
                2,
            )

        def rejection_code(document, zone, *_args):
            hour = (
                ((document.get("zones") or {}).get(zone["id"]) or {})
                .get("hourly", {})
                .get(TARGET, {})
            )
            return None if hour.get("candidate") is True else "INVALID_WAVE_TUPLE"

        def stage_validator(staged, _private, outcome):
            summary = producer.private_wave_bootstrap_asset_summary(
                staged, zones, "wam_dw", asset,
            )
            return producer.operational_wave_asset_stage_admissible(
                active, staged, zones, "wam_dw", asset, summary, outcome,
            )

        with (
            patch.object(producer, "process_grib", side_effect=fake_process),
            patch.object(
                producer,
                "private_wave_bootstrap_hour_rejection_code",
                side_effect=rejection_code,
            ),
            patch.object(
                producer,
                "complete_native_source_for_hour",
                return_value=False,
            ),
        ):
            with self.assertRaises(RuntimeError):
                producer.process_grib_transactionally(
                    Path("synthetic.grib"),
                    "wam_dw",
                    utc_offset(TARGET, -6),
                    TARGET,
                    zones,
                    active,
                    {},
                    stage_validator=stage_validator,
                    validation_error="synthetic rejected mutation",
                )

        self.assertEqual(active, before)

    def test_partial_wave_asset_cannot_mix_with_existing_valid_lineage(self) -> None:
        zones = [
            {"id": "PART::ACCEPTED", "coastType": "east"},
            {"id": "PART::OLD-LINEAGE", "coastType": "east"},
        ]
        active = {
            "zones": {
                "PART::ACCEPTED": {"hourly": {}},
                "PART::OLD-LINEAGE": {
                    "hourly": {TARGET: {
                        "significant-wave-height": 0.5,
                        "dominant-wave-period": 4.0,
                        "sources": {"wave": {"old": "lineage"}},
                    }},
                },
            },
        }
        staged = copy.deepcopy(active)
        staged["zones"]["PART::ACCEPTED"]["hourly"][TARGET] = {
            "candidate": True,
            "sources": {"wave": self._synthetic_wave_lineage()},
        }
        asset = SimpleNamespace(valid_time=TARGET)
        summary = self._wave_summary(
            zones,
            {"PART::ACCEPTED"},
            {"ASSET_PROVENANCE_MISMATCH": 1},
        )

        def rejection_code(_document, zone, *_args):
            return (
                None
                if zone["id"] == "PART::ACCEPTED"
                else "ASSET_PROVENANCE_MISMATCH"
            )

        with (
            patch.object(
                producer,
                "private_wave_bootstrap_hour_rejection_code",
                side_effect=rejection_code,
            ),
            patch.object(
                producer,
                "native_wave_row_error_code",
                return_value=None,
            ),
        ):
            admitted = producer.operational_wave_asset_stage_admissible(
                active,
                staged,
                zones,
                "wam_dw",
                asset,
                summary,
                (
                    {"significant-wave-height", "dominant-wave-period"},
                    {"PART::ACCEPTED"},
                    False,
                    2,
                    2,
                ),
            )

        self.assertFalse(admitted)
        self.assertEqual(
            active["zones"]["PART::OLD-LINEAGE"],
            staged["zones"]["PART::OLD-LINEAGE"],
        )

        # Source-shaped metadata on an invalid numeric tuple is a real gap. It
        # must remain byte-identical, but it must not discard the valid sibling.
        invalid_old_stage = copy.deepcopy(staged)
        with (
            patch.object(
                producer,
                "private_wave_bootstrap_hour_rejection_code",
                side_effect=rejection_code,
            ),
            patch.object(
                producer,
                "native_wave_row_error_code",
                return_value="INVALID_WAVE_TUPLE",
            ),
        ):
            repaired = producer.operational_wave_asset_stage_admissible(
                active,
                invalid_old_stage,
                zones,
                "wam_dw",
                asset,
                summary,
                (
                    {"significant-wave-height", "dominant-wave-period"},
                    {"PART::ACCEPTED"},
                    False,
                    2,
                    2,
                ),
            )
        self.assertTrue(repaired)
        self.assertEqual(
            invalid_old_stage["zones"]["PART::OLD-LINEAGE"],
            active["zones"]["PART::OLD-LINEAGE"],
        )

        wrong_owner_stage = copy.deepcopy(staged)
        observed_expected_owners = []

        def wrong_owner_code(**kwargs):
            observed_expected_owners.append(kwargs.get("expected_collection"))
            return "WAVE_OWNER_MISMATCH"

        with (
            patch.object(
                producer,
                "private_wave_bootstrap_hour_rejection_code",
                side_effect=rejection_code,
            ),
            patch.object(
                producer,
                "native_wave_row_error_code",
                side_effect=wrong_owner_code,
            ),
        ):
            repaired = producer.operational_wave_asset_stage_admissible(
                active,
                wrong_owner_stage,
                zones,
                "wam_dw",
                asset,
                summary,
                (
                    {"significant-wave-height", "dominant-wave-period"},
                    {"PART::ACCEPTED"},
                    False,
                    2,
                    2,
                ),
            )
        self.assertTrue(repaired)
        self.assertEqual(observed_expected_owners, ["wam_dw"])
        self.assertEqual(
            wrong_owner_stage["zones"]["PART::OLD-LINEAGE"],
            active["zones"]["PART::OLD-LINEAGE"],
        )

    def test_partial_wave_asset_requires_one_cross_part_lineage(self) -> None:
        zones = [{"id": "PART::ONE"}, {"id": "PART::TWO"}]
        active = {"zones": {zone["id"]: {"hourly": {}} for zone in zones}}
        staged = copy.deepcopy(active)
        for index, zone in enumerate(zones):
            source = self._synthetic_wave_lineage()
            source["gridDefinitionSha256"] = str(index + 1) * 64
            staged["zones"][zone["id"]]["hourly"][TARGET] = {
                "candidate": True,
                "sources": {"wave": source},
            }
        asset = SimpleNamespace(valid_time=TARGET)
        summary = self._wave_summary(
            zones,
            {zone["id"] for zone in zones},
            {},
        )
        with patch.object(
            producer,
            "private_wave_bootstrap_hour_rejection_code",
            return_value=None,
        ):
            admitted = producer.operational_wave_asset_stage_admissible(
                active,
                staged,
                zones,
                "wam_dw",
                asset,
                summary,
                (
                    {"significant-wave-height", "dominant-wave-period"},
                    {zone["id"] for zone in zones},
                    False,
                    2,
                    2,
                ),
            )
        self.assertFalse(admitted)

    def test_complete_cache_reconstruction_rejects_mixed_grid_lineage(
        self,
    ) -> None:
        model_run = utc_offset(TARGET, -6)
        expected = {
            "collection": "wam_dw",
            "modelRun": model_run,
            "validTime": TARGET,
            "itemId": "synthetic-item",
            "assetIdentitySha256": "a" * 64,
            "assetSizeBytes": None,
            "itemCreatedAt": None,
            "itemUpdatedAt": None,
        }
        zones = [{"id": "PART::ONE"}, {"id": "PART::TWO"}]
        cache = {"zones": {}}
        for index, zone in enumerate(zones, start=1):
            source = self._synthetic_wave_lineage()
            source["gridDefinitionSha256"] = str(index) * 64
            cache["zones"][zone["id"]] = {
                "hourly": {
                    TARGET: {
                        "sources": {"wave": source},
                    },
                },
            }
        previous_run = {
            "referenceTime": model_run,
            "processingSignature": "signature",
            "processedSteps": {},
        }

        with patch.object(
            producer,
            "private_wave_bootstrap_hour_rejection_code",
            return_value=None,
        ):
            reusable = producer.reusable_processed_steps(
                previous_run,
                collection="wam_dw",
                same_processing=True,
                same_run=True,
                strict_current_anchor_available=True,
                required_asset_provenance={TARGET: expected},
                wave_cache=cache,
                wave_zones=zones,
            )

        self.assertEqual(reusable, {})

    def test_complete_cache_requires_lineage_evidence_for_every_row(
        self,
    ) -> None:
        zones = [{"id": "PART::ONE"}, {"id": "PART::TWO"}]
        complete = self._wave_summary(
            zones,
            {"PART::ONE", "PART::TWO"},
            {},
        )
        one_unproven = copy.deepcopy(complete)
        one_unproven["acceptedLineageEvidenceCount"] = 1

        self.assertTrue(producer.wave_asset_cache_proof_coherent(
            complete,
            require_complete=True,
        ))
        stale_owner_policy = copy.deepcopy(complete)
        stale_owner_policy["waveOwnerPolicyId"] = "coast-type-v1"
        self.assertFalse(producer.wave_asset_cache_proof_coherent(
            stale_owner_policy,
            require_complete=True,
        ))
        self.assertFalse(producer.wave_asset_cache_proof_coherent(
            one_unproven,
            require_complete=True,
        ))

    def test_private_cache_requires_the_current_official_asset_revision(
        self,
    ) -> None:
        result, zone, _asset = complete_hour(asset_identity="b" * 64)
        source = result["zones"][zone["id"]]["hourly"][TARGET]["sources"][
            "wave"
        ]
        source.update({
            "assetSizeBytes": 100,
            "itemCreatedAt": utc_offset(TARGET, -5),
            "itemUpdatedAt": utc_offset(TARGET, -4),
            "gridDefinitionSha256": "d" * 64,
            "contentSha256": "e" * 64,
        })
        reference = {
            "valid": TARGET,
            "id": source["itemId"],
            "assetIdentitySha256": source["assetIdentitySha256"],
            "size": 101,
            "itemCreatedAt": source["itemCreatedAt"],
            "itemUpdatedAt": utc_offset(TARGET, -3),
        }
        official = producer.official_wave_asset_identity(
            "wam_dw",
            source["modelRun"],
            reference,
        )
        self.assertIsNotNone(official)
        asset = producer.MappingWaveAsset(
            reference,
            source["modelRun"],
            official_identity=official,
        )

        with patch.object(
            producer,
            "complete_native_source_for_hour",
            return_value=True,
        ):
            code = producer.private_wave_bootstrap_hour_rejection_code(
                result,
                zone,
                "wam_dw",
                asset,
            )

        self.assertEqual(code, "ASSET_PROVENANCE_MISMATCH")

    def test_partial_wave_resume_requires_exact_persisted_traversal_receipt(
        self,
    ) -> None:
        model_run = utc_offset(TARGET, -6)
        expected = {
            "collection": "wam_dw",
            "modelRun": model_run,
            "validTime": TARGET,
            "itemId": "synthetic-item",
            "assetIdentitySha256": "a" * 64,
            "assetSizeBytes": None,
            "itemCreatedAt": None,
            "itemUpdatedAt": None,
        }
        zones = [{"id": "PART::ONE"}, {"id": "PART::TWO"}]
        summary = self._wave_summary(
            zones,
            {"PART::ONE"},
            {"INVALID_WAVE_TUPLE": 1},
        )
        receipt = {
            "complete": False,
            "assetTraversalComplete": True,
            "waveAdmissionPolicy": producer.WAVE_ASSET_ADMISSION_POLICY,
            "rawContentSha256": "c" * 64,
            "recognizedParameters": [
                "significant-wave-height",
                "dominant-wave-period",
            ],
            "zonesTouched": 1,
            "acceptedNativeZoneCount": 1,
            "parserVersion": producer.PARSER_VERSION,
            "processingSignature": "signature",
            "sourceAsset": expected,
            "waveTargetProof": summary,
        }
        previous_run = {
            "referenceTime": model_run,
            "processingSignature": "signature",
            "processedSteps": {TARGET: receipt},
        }
        kwargs = {
            "collection": "wam_dw",
            "same_processing": True,
            "same_run": True,
            "strict_current_anchor_available": True,
            "required_asset_provenance": {TARGET: expected},
            "wave_cache": {"zones": {}},
            "wave_zones": zones,
        }
        with patch.object(
            producer,
            "private_wave_bootstrap_asset_summary",
            return_value=summary,
        ):
            reusable = producer.reusable_processed_steps(previous_run, **kwargs)
            without_receipt = copy.deepcopy(previous_run)
            without_receipt["processedSteps"][TARGET].pop(
                "assetTraversalComplete"
            )
            rejected = producer.reusable_processed_steps(
                without_receipt,
                **kwargs,
            )
        changed_summary = self._wave_summary(
            zones,
            {"PART::TWO"},
            {"INVALID_WAVE_TUPLE": 1},
        )
        with patch.object(
            producer,
            "private_wave_bootstrap_asset_summary",
            return_value=changed_summary,
        ):
            changed_targets = producer.reusable_processed_steps(
                previous_run,
                **kwargs,
            )
        mixed_lineage_summary = copy.deepcopy(summary)
        mixed_lineage_summary["acceptedLineageCount"] = 2
        mixed_lineage_summary["acceptedLineageSha256"] = None
        with patch.object(
            producer,
            "private_wave_bootstrap_asset_summary",
            return_value=mixed_lineage_summary,
        ):
            mixed_lineage = producer.reusable_processed_steps(
                previous_run,
                **kwargs,
            )
        legacy_proof = copy.deepcopy(previous_run)
        legacy_proof["processedSteps"][TARGET]["waveTargetProof"][
            "schemaVersion"
        ] = "dmi-wave-asset-cache-proof-v1"
        missing_raw_proof = copy.deepcopy(previous_run)
        missing_raw_proof["processedSteps"][TARGET].pop("rawContentSha256")

        self.assertIn(TARGET, reusable)
        self.assertTrue(reusable[TARGET]["assetTraversalComplete"])
        self.assertFalse(reusable[TARGET]["complete"])
        self.assertEqual(rejected, {})
        self.assertEqual(changed_targets, {})
        self.assertEqual(mixed_lineage, {})
        with patch.object(
            producer,
            "private_wave_bootstrap_asset_summary",
            return_value=summary,
        ):
            self.assertEqual(
                producer.reusable_processed_steps(legacy_proof, **kwargs),
                {},
            )
            self.assertEqual(
                producer.reusable_processed_steps(missing_raw_proof, **kwargs),
                {},
            )

    def test_wave_asset_coverage_is_aggregate_only(self) -> None:
        zones = [{"id": "PART::PRIVATE-ONE"}, {"id": "PART::PRIVATE-TWO"}]
        summary = self._wave_summary(
            zones,
            {"PART::PRIVATE-ONE"},
            {"WAM_DISTANCE_OUT_OF_BOUNDS": 1},
        )
        coverage: dict = {}
        producer.accumulate_wave_asset_coverage(
            coverage,
            summary,
            admitted=True,
        )
        serialized = json.dumps(coverage, sort_keys=True)
        self.assertEqual(coverage["partialAssetCount"], 1)
        self.assertEqual(coverage["admittedTupleCount"], 1)
        self.assertEqual(coverage["rejectedTupleCount"], 1)
        self.assertNotIn("PART::", serialized)
        self.assertNotIn("gridPoint", serialized)
        self.assertNotIn("example.invalid", serialized)

    def test_complete_wave_asset_contract_remains_strict(self) -> None:
        summary = {
            "requiredCount": 670,
            "acceptedCount": 669,
            "rejectedCount": 1,
            "rejectedByCode": {"INVALID_WAVE_PROVENANCE": 1},
        }
        self.assertTrue(producer.operational_wave_asset_stage_complete(
            {**summary, "acceptedCount": 670, "rejectedCount": 0},
            (
                {"significant-wave-height", "dominant-wave-period"},
                set(),
                False,
                2,
                1,
            ),
        ))

    def test_wam_resume_receives_exact_selected_asset_proof(self) -> None:
        source = (SCRIPTS / "update-dmi-bulk.py").read_text(encoding="utf-8")
        self.assertRegex(
            source,
            r"required_asset_provenance=\(\s*required_asset_provenance\s*"
            r"if collection in MARINE_COLLECTIONS\s*"
            r"or collection in WAVE_BOOTSTRAP_COLLECTIONS",
        )

    def test_wam_fallback_identity_cannot_replace_primary_resume_proof(
        self,
    ) -> None:
        primary_asset = {
            "valid": TARGET,
            "id": "primary",
            "assetIdentitySha256": "a" * 64,
            "operationalWavePhaseRank": 0,
        }
        fallback_asset = {
            "valid": TARGET,
            "id": "fallback",
            "assetIdentitySha256": "b" * 64,
            "operationalWavePhaseRank": 1,
        }
        primary = producer.official_wave_asset_identity(
            "wam_dw",
            TARGET,
            primary_asset,
        )
        fallback = producer.official_wave_asset_identity(
            "wam_dw",
            utc_offset(TARGET, -6),
            fallback_asset,
        )
        self.assertIsNotNone(primary)
        self.assertIsNotNone(fallback)
        required = {TARGET}
        self.assertTrue(producer.asset_identity_is_required_for_resume(
            "wam_dw",
            primary_asset,
            primary,
            required,
        ))
        self.assertFalse(producer.asset_identity_is_required_for_resume(
            "wam_dw",
            fallback_asset,
            fallback,
            required,
        ))

        current_asset = {
            "valid": TARGET,
            "id": "dkss",
            "assetIdentitySha256": "c" * 64,
            "operationalWavePhaseRank": 1,
        }
        current = producer.official_current_asset_identity(
            "dkss_idw",
            TARGET,
            current_asset,
        )
        self.assertIsNotNone(current)
        self.assertTrue(producer.asset_identity_is_required_for_resume(
            "dkss_idw",
            current_asset,
            current,
            required,
        ))

    def test_resume_requires_selected_asset_identity(self) -> None:
        result, zone, asset = complete_hour(asset_identity="c" * 64)
        with patch.object(producer, "complete_native_source_for_hour", return_value=True):
            self.assertFalse(producer.private_wave_bootstrap_hour_complete(
                result,
                zone,
                "wam_dw",
                asset,
            ))

    def test_resume_rejects_boolean_wave_values(self) -> None:
        result, zone, asset = complete_hour(
            asset_identity="b" * 64,
            height=False,
            period=6.0,
            direction=None,
        )
        with patch.object(producer, "complete_native_source_for_hour", return_value=True):
            self.assertFalse(producer.private_wave_bootstrap_hour_complete(
                result,
                zone,
                "wam_dw",
                asset,
            ))

    def test_resume_reconstructs_native_proof_without_parent_blocker(self) -> None:
        registry = load_coastal_part_registry(
            wave_registry_document(1),
            expected_part_count=1,
        )
        part = registry.parts[0]
        run = utc_offset(TARGET, -6)
        native_zone = {
            "id": part.cache_key,
            "coastalPart": True,
            "parentZoneId": part.parent_zone_id,
            "coastType": "east",
        }
        parent_zone = {
            "id": part.parent_zone_id,
            "coastType": "east",
        }
        row = wave_native_hour(
            part,
            TARGET,
            run,
            collection="wam_dw",
        )
        source = row["sources"]["wave"]
        source["contentSha256"] = "c" * 64
        expected = {
            "collection": "wam_dw",
            "modelRun": run,
            "validTime": TARGET,
            "itemId": source["itemId"],
            "assetIdentitySha256": source["assetIdentitySha256"],
            "assetSizeBytes": None,
            "itemCreatedAt": None,
            "itemUpdatedAt": None,
        }
        cache = {
            "zones": {
                part.cache_key: {"hourly": {TARGET: row}},
                part.parent_zone_id: {"hourly": {}},
            },
        }
        previous_run = {
            "referenceTime": run,
            "processingSignature": "wave-signature",
            "processedSteps": {
                TARGET: {
                    "complete": False,
                    "recognizedParameters": [
                        "significant-wave-height",
                        "dominant-wave-period",
                    ],
                    "processingSignature": "wave-signature",
                    "parserVersion": producer.PARSER_VERSION,
                    "sourceAsset": expected,
                    "waveTargetProof": {
                        "requiredCount": 2,
                        "acceptedCount": 1,
                        "rejectedCount": 1,
                        "rejectedByCode": {
                            "INVALID_WAVE_TUPLE": 1,
                        },
                    },
                },
            },
        }
        native_gate = producer.native_operational_wave_zones(
            "wam_dw",
            [parent_zone, native_zone],
        )
        metrics: dict = {}

        with patch.object(
            producer,
            "complete_native_source_for_hour",
            return_value=True,
        ):
            reusable = producer.reusable_processed_steps(
                previous_run,
                collection="wam_dw",
                same_processing=True,
                same_run=True,
                strict_current_anchor_available=True,
                required_asset_provenance={TARGET: expected},
                wave_cache=cache,
                wave_zones=native_gate,
                wave_resume_metrics=metrics,
            )

        self.assertEqual(len(native_gate), 1)
        self.assertTrue(reusable[TARGET]["complete"])
        self.assertEqual(
            reusable[TARGET]["waveTargetProof"]["requiredCount"],
            1,
        )
        self.assertTrue(
            reusable[TARGET]["reconstructedFromNativeCache"]
        )
        self.assertEqual(metrics["proofCompleteAssets"], 1)
        self.assertEqual(metrics["reconstructedProofCompleteAssets"], 1)
        self.assertEqual(metrics["rejectedByCode"], {})

    def test_strict_current_lead_limit_counts_only_one_actual_attempt(self) -> None:
        self.assertTrue(producer.strict_current_lead_attempt_available(
            "dkss_lf", "dkss_lf", 0, 1,
        ))
        self.assertFalse(producer.strict_current_lead_attempt_available(
            "dkss_lf", "dkss_lf", 1, 1,
        ))
        self.assertTrue(producer.strict_current_lead_attempt_available(
            "wam_dw", "dkss_lf", 1, 1,
        ))

        source = (SCRIPTS / "update-dmi-bulk.py").read_text("utf-8")
        loop_start = source.rindex(
            "for asset_number, asset in enumerate(assets, start=1):"
        )
        loop = source[loop_start:source.index(
            'result["diagnostics"]["parametersByCollection"][collection]',
            loop_start,
        )]
        limit_check = loop.index(
            "not strict_current_lead_attempt_available("
        )
        budget_check = loop.index(
            "checkpoint_controller.can_start_asset(",
            limit_check,
        )
        increment = loop.index("strict_current_lead_attempts += 1")
        download = loop.index(
            "path, reused = download_asset(",
            increment,
        )
        self.assertLess(limit_check, budget_check)
        self.assertLess(budget_check, increment)
        self.assertLess(increment, download)

    def test_duplicate_part_ids_cannot_satisfy_exact_673_registry(self) -> None:
        asset = SimpleNamespace(valid_time=TARGET)
        configuration = {
            "mode": MIGRATION_MODE,
            "targetHour": TARGET,
            "productionTargetHour": TARGET,
        }
        result = {"zones": {}, "diagnostics": {}}
        with (
            patch.object(
                producer,
                "list_private_wave_bootstrap_assets",
                return_value=(fake_plan(), (asset,)),
            ),
            patch.object(producer, "private_wave_bootstrap_hour_complete", return_value=True),
            patch.object(producer, "should_stop_work", return_value=False),
            patch.object(producer, "write_checkpoint"),
        ):
            with self.assertRaises(RuntimeError):
                producer.execute_private_wave_history_bootstrap(
                    result,
                    synthetic_parts(unique=False),
                    {"bytes": 0},
                    set(),
                    configuration,
                )

    def test_runtime_guard_runs_before_each_collection_stac_query(self) -> None:
        asset = SimpleNamespace(valid_time=TARGET)
        calls = 0

        def fake_list(_collection: str, _configuration: dict):
            nonlocal calls
            calls += 1
            return fake_plan(), (asset,)

        with (
            patch.object(producer, "list_private_wave_bootstrap_assets", side_effect=fake_list),
            patch.object(producer, "should_stop_work", return_value=True),
            patch.object(producer, "write_checkpoint"),
        ):
            with self.assertRaises(RuntimeError):
                producer.execute_private_wave_history_bootstrap(
                    {"zones": {}, "diagnostics": {}},
                    synthetic_parts(unique=True),
                    {"bytes": 0},
                    set(),
                    {
                        "mode": MIGRATION_MODE,
                        "targetHour": TARGET,
                        "productionTargetHour": TARGET,
                    },
                )
        self.assertEqual(calls, 0, "No retrying STAC call may consume the finalization reserve.")

    def test_tight_runtime_preserves_a_real_attempt_for_the_second_wam_family(self) -> None:
        attempted: list[str] = []

        def fake_list(collection: str, _configuration: dict):
            attempted.append(collection)
            asset = StacWaveAsset(
                valid_time=utc_offset(TARGET, -1),
                model_run=utc_offset(TARGET, -6),
                item_id=f"synthetic-{collection}",
                href=f"https://example.invalid/{collection}.grib",
                collection=collection,
            )
            return fake_plan(), (asset,)

        def asset_summary(
            _result: dict,
            zones: list[dict],
            collection: str,
            _asset: object,
        ) -> dict:
            accepted_ids = (
                {str(zone["id"]) for zone in zones}
                if collection == "wam_nsb"
                else set()
            )
            rejected = (
                {}
                if accepted_ids
                else {"INVALID_WAVE_TUPLE": len(zones)}
            )
            return self._wave_summary(zones, accepted_ids, rejected)

        result = {"zones": {}, "diagnostics": {}}
        with (
            patch.object(
                producer,
                "list_private_wave_bootstrap_assets",
                side_effect=fake_list,
            ),
            patch.object(
                producer,
                "private_wave_bootstrap_asset_summary",
                side_effect=asset_summary,
            ),
            patch.object(producer, "runtime_remaining", return_value=100.0),
            patch.object(producer, "should_stop_work", return_value=False),
            patch.object(producer, "write_checkpoint"),
        ):
            locked = producer.execute_private_wave_history_bootstrap(
                result,
                synthetic_parts(unique=True),
                {"bytes": 0},
                set(),
                {
                    "mode": MIGRATION_MODE,
                    "targetHour": TARGET,
                    "productionTargetHour": TARGET,
                },
                post_bootstrap_reserve_seconds=10.0,
            )

        self.assertEqual(attempted, ["wam_dw", "wam_nsb"])
        self.assertEqual(locked["wam_dw"], set())
        self.assertEqual(locked["wam_nsb"], {utc_offset(TARGET, -1)})
        aggregate = result["diagnostics"]["privateWaveHistoryBootstrap"]
        self.assertEqual(aggregate["postBootstrapRuntimeReserveSeconds"], 10.0)
        self.assertEqual(
            aggregate["historyIncompleteCode"],
            "CRITICAL_WAM_RUNTIME_RESERVED",
        )
        self.assertEqual(
            result["diagnostics"]["schedulerYields"][0]["reasonCode"],
            "CRITICAL_WAM_RUNTIME_RESERVED",
        )
        self.assertNotIn("errors", result["diagnostics"])

    def test_truncated_download_is_not_registered_for_resume(self) -> None:
        class Response:
            headers = {"content-length": "10"}

            def __enter__(self):
                return self

            def __exit__(self, *_args):
                return False

            def raise_for_status(self) -> None:
                return None

            def iter_content(self, _size: int):
                yield b"short"

        class Session:
            def get(self, *_args, **_kwargs):
                return Response()

        with tempfile.TemporaryDirectory() as folder:
            with (
                patch.object(producer, "RAW_DIR", Path(folder)),
                patch.object(producer, "DOWNLOAD_SESSION", Session()),
            ):
                with self.assertRaises(RuntimeError):
                    producer.download_asset(
                        "https://example.invalid/wam/synthetic.grib",
                        10,
                        {"bytes": 0},
                        collection="wam_dw",
                        model_run=utc_offset(TARGET, -6),
                        valid_time=TARGET,
                        item_id="synthetic-item",
                    )

    def test_operational_wave_replacement_has_no_broad_clear_path(self) -> None:
        source = (SCRIPTS / "update-dmi-bulk.py").read_text("utf-8")
        self.assertNotIn("def clear_operational_wave_window(", source)
        self.assertNotIn("def clear_staged_operational_wave_hour(", source)
        start = source.index(
            "# Wave height and period are the shared mobilisation/rollback tuple."
        )
        end = source.index("if (\n        current_shadow is not None", start)
        atomic = source[start:end]
        provenance = atomic.index("complete_native_source_for_hour(")
        commit = atomic.index(
            'hour = point["hourly"].setdefault(valid_time',
        )
        self.assertLess(provenance, commit)
        self.assertIn("partial or malformed new asset must never destroy", atomic)
        self.assertIn('else:\n            hour.pop("mean-wave-dir", None)', atomic)

    def test_bootstrap_completion_alone_is_not_process_success(self) -> None:
        source = (SCRIPTS / "update-dmi-bulk.py").read_text("utf-8")
        self.assertIn(
            "if not wave_distance_allowed(collection, distance):",
            source,
        )
        self.assertIn("WAM_DISTANCE_OUT_OF_BOUNDS", source)
        validator = source.index("operational = validate_wave_operational_handoff_cache(")
        operational_binding = source.index(
            "bootstrap_complete = wave_bootstrap_configuration is not None and bootstrap_operational_complete"
        )
        success_gate_binding = source.index(
            "producer_success_is_blocked = producer_success_blocked(",
            operational_binding,
        )
        exit_helper_start = source.index(
            "def producer_process_exit_code("
        )
        exit_helper_end = source.index(
            "\ndef note_asset_processed_this_invocation(",
            exit_helper_start,
        )
        exit_helper = source[exit_helper_start:exit_helper_end]
        final_exit = source.index(
            "return producer_process_exit_code(",
            success_gate_binding,
        )
        self.assertLess(validator, operational_binding)
        self.assertLess(operational_binding, success_gate_binding)
        self.assertLess(exit_helper_start, success_gate_binding)
        self.assertLess(success_gate_binding, final_exit)
        self.assertIn("if producer_success_is_blocked:", exit_helper)
        self.assertIn("return 2", exit_helper)
        self.assertIn("return 0 if producer_productive else 2", exit_helper)
        self.assertIn(
            "producer_success_is_blocked=producer_success_is_blocked",
            source[final_exit:],
        )

    def test_partial_dmi_inspects_wam_then_blocks_only_after_provider_progress(self) -> None:
        workflow = (
            ROOT / ".github" / "workflows" / "reusable-weather-build.yml"
        ).read_text("utf-8")
        gate_start = workflow.index(
            "- name: Inspect operational WAM handoff before first integrated cutover"
        )
        gate_end = workflow.index("- name: Report DMI bulk result", gate_start)
        gate = workflow[gate_start:gate_end]
        validator_call = gate.index(
            "python -B scripts/validate_dmi_wave_history_bootstrap.py"
        )
        self.assertIn("id: wam-bootstrap-readiness", gate)
        self.assertIn("if: always()", gate)
        self.assertIn("continue-on-error: true", gate)
        self.assertNotIn("steps.dmi-terminal-gate.outputs.ready == 'true'", gate)
        self.assertIn("--cache .cache/dmi-candidate-progress.json", gate)
        self.assertNotIn('producer_outcome="${{ steps.dmi-bulk.outcome }}"', gate)
        self.assertIn("validator_status=$?", gate)
        self.assertNotIn('wam_code="DMI_BULK_FAILED"', gate)
        self.assertIn('echo "code=$wam_code" >> "$GITHUB_OUTPUT"', gate)
        self.assertIn(
            'echo "history_incomplete=$history_incomplete" >> "$GITHUB_OUTPUT"',
            gate,
        )
        self.assertIn('exit "$validator_status"', gate)
        self.assertGreaterEqual(validator_call, 0)
        self.assertIn("--production-target-hour", gate)
        self.assertIn("--forecast-hour-count 118", gate)
        final_gate = workflow.index(
            "- name: Require complete operational WAM after provider progress for first cutover"
        )
        open_meteo = workflow.index(
            "- name: Fill only the exact remaining current gaps from Open-Meteo"
        )
        closure = workflow.index(
            "- name: Build exact DMI-first current operational closure"
        )
        self.assertLess(gate_start, open_meteo)
        self.assertLess(open_meteo, final_gate)
        self.assertLess(final_gate, closure)

        validator_source = (
            SCRIPTS / "validate_dmi_wave_history_bootstrap.py"
        ).read_text("utf-8")
        self.assertIn(
            "operational = validate_wave_operational_handoff_cache(",
            validator_source,
        )

    def test_oneoff_reuses_candidate_target_and_gates_wam_after_progress_save(self) -> None:
        workflow = (
            ROOT / ".github" / "workflows" / "validate-copernicus-current-pilot.yml"
        ).read_text("utf-8")

        resolver_start = workflow.index(
            "- name: Resolve one aggregate Candidate G wave-bootstrap target",
        )
        resolver_end = workflow.index("\n      - name:", resolver_start + 1)
        resolver = workflow[resolver_start:resolver_end]
        for marker in (
            "node scripts/resolve-candidate-g-wave-bootstrap-target.mjs",
            '--conditions "$RUNNER_TEMP/ravradar-118-deployed-donor/data/live/conditions.json"',
            '--source-registry "$RUNNER_TEMP/ravradar-118-deployed-donor/.cache/ravscore-legacy-candidate-g-source/coastal-parts-v2.json"',
            "--registry data/live/coastal-parts-v2.json",
            '--production-target "${{ steps.operational-target.outputs.target_hour }}"',
        ):
            self.assertIn(marker, resolver)

        dmi_start = workflow.index(
            "- name: Refresh all bounded official DMI collections for the proof",
        )
        dmi_end = workflow.index("\n      - name:", dmi_start + 1)
        dmi = workflow[dmi_start:dmi_end]
        self.assertIn(
            "DMI_BULK_PRIVATE_WAVE_BOOTSTRAP_MODE: "
            "${{ steps.ravscore-wave-bootstrap-target.outputs.mode }}",
            dmi,
        )
        self.assertIn(
            "DMI_BULK_PRIVATE_WAVE_BOOTSTRAP_TARGET_HOUR: "
            "${{ steps.ravscore-wave-bootstrap-target.outputs.target_hour }}",
            dmi,
        )

        gate_start = workflow.index(
            "- name: Inspect operational WAM handoff before one-off downstream providers",
        )
        gate_end = workflow.index("\n      - name:", gate_start + 1)
        gate = workflow[gate_start:gate_end]
        for marker in (
            "id: wam-bootstrap-readiness",
            "if: always()",
            "continue-on-error: true",
            "python -B scripts/validate_dmi_wave_history_bootstrap.py",
            '--mode "${{ steps.ravscore-wave-bootstrap-target.outputs.mode }}"',
            '--target-hour "${{ steps.ravscore-wave-bootstrap-target.outputs.target_hour }}"',
            '--production-target-hour "${{ steps.operational-target.outputs.target_hour }}"',
            "--forecast-hour-count 118",
            "--cache .cache/dmi-candidate-progress.json",
            "--registry data/live/coastal-parts-v2.json",
            'exit "$validator_status"',
        ):
            self.assertIn(marker, gate)

        ordered = (
            resolver_start,
            workflow.index("- name: Restore shared private Copernicus donor bank before DMI"),
            workflow.index("- name: Restore shared private Open-Meteo current progress"),
            workflow.index("- name: Restore shared private Open-Meteo donor bank"),
            workflow.index("- name: Plan global current acquisition before DMI"),
            dmi_start,
            workflow.index("- name: Save progressed DMI GRIB cache before any terminal decision"),
            workflow.index("- name: Save isolated DMI candidate progress before any terminal decision"),
            workflow.index("- name: Save private regional current evidence before any terminal decision"),
            gate_start,
            workflow.index("- name: Seal exact operational DMI gaps for target through target plus 117"),
            workflow.index("- name: Fill only the exact operational DMI gap seal"),
            workflow.index("- name: Require complete operational WAM after provider progress"),
            workflow.index("- name: Build the integrated runtime without release or deploy"),
        )
        self.assertEqual(ordered, tuple(sorted(ordered)))

    def test_candidate_maintenance_cannot_enable_integrated_wave_bootstrap(self) -> None:
        workflow = (
            ROOT / ".github" / "workflows" / "reusable-weather-build.yml"
        ).read_text("utf-8")
        cutover_guard = (
            "steps.operational-action.outputs.action == 'integrated-cutover' "
            "&& steps.legacy-bootstrap.outputs.required == 'true'"
        )
        resolver_start = workflow.index(
            "- name: Resolve one aggregate Candidate G wave-bootstrap target"
        )
        resolver_end = workflow.index("\n      - name:", resolver_start + 1)
        self.assertIn(f"if: {cutover_guard}", workflow[resolver_start:resolver_end])

        dmi_start = workflow.index("- name: Update DMI bulk model cache")
        dmi_end = workflow.index("\n      - name:", dmi_start + 1)
        dmi = workflow[dmi_start:dmi_end]
        for marker in (
            f"DMI_BULK_MAX_DOWNLOAD_MB: ${{{{ {cutover_guard} && '4096' || '2048' }}}}",
            f"DMI_BULK_MAX_RUNTIME_SECONDS: ${{{{ {cutover_guard} && '3000' || '900' }}}}",
            f"DMI_BULK_FINALIZE_RESERVE_SECONDS: ${{{{ {cutover_guard} && '180' || '120' }}}}",
            f"DMI_BULK_PRIVATE_WAVE_BOOTSTRAP_MODE: ${{{{ {cutover_guard} && steps.ravscore-wave-bootstrap-target.outputs.mode || 'none' }}}}",
        ):
            self.assertIn(marker, dmi)
        self.assertIn(
            "DMI_BULK_FORCE_REFRESH: ${{ steps.preflight.outputs.dmi_changed == 'true' || "
            f"({cutover_guard}) }}}}",
            dmi,
        )

        weather_start = workflow.index("- name: Update central weather cache")
        weather_end = workflow.index("\n      - name:", weather_start + 1)
        weather = workflow[weather_start:weather_end]
        self.assertIn(
            f"RAVSCORE_FIRST_CUTOVER_BOOTSTRAP_MODE: ${{{{ {cutover_guard} && steps.ravscore-wave-bootstrap-target.outputs.mode || 'auto' }}}}",
            weather,
        )
        self.assertIn(
            f"RAVSCORE_FIRST_CUTOVER_SOURCE_VALIDATED: ${{{{ {cutover_guard} && steps.ravscore-wave-bootstrap-target.outputs.source_validated || 'false' }}}}",
            weather,
        )

    def test_private_point_candidate_cannot_hide_or_block_dmi_progress(self) -> None:
        def workflow_step(source: str, name: str) -> tuple[int, str]:
            start = source.index(f"- name: {name}")
            end = source.index("\n      - name:", start + 1)
            return start, source[start:end]

        workflow = (
            ROOT / ".github" / "workflows" / "reusable-weather-build.yml"
        ).read_text("utf-8")
        _, point = workflow_step(
            workflow,
            "Advance private point-candidate readiness without public score impact",
        )
        self.assertIn("id: point-candidate-readiness", point)
        self.assertIn("steps.dmi-bulk.outcome == 'success'", point)
        self.assertIn("continue-on-error: true", point)
        for step_name in (
            "Save progressed DMI GRIB download cache",
            "Save private seven-day current-field research cache",
        ):
            start = workflow.index(f"- name: {step_name}")
            end = workflow.index("\n      - name:", start + 1)
            self.assertIn("if: always()", workflow[start:end])

        self.assertNotIn("- name: Save progressive private DMI zone cache", workflow)
        self.assertNotIn("dmi-zone-cache-v1-${{ runner.os }}", workflow)
        normal_names = (
            "Restore last complete active DMI generation",
            "Strictly bind and materialize the active DMI generation",
            "Reconfirm exact main before materialized legacy DMI cache",
            "Save materialized legacy active DMI generation",
            "Restore isolated DMI candidate progress for normal maintenance",
            "Update DMI bulk model cache",
            "Save isolated DMI candidate progress before any terminal decision",
            "Classify DMI readiness before current supplement",
            "Strictly snapshot the maintained READY active DMI generation",
            "Save the maintained complete active DMI generation",
        )
        normal = {name: workflow_step(workflow, name) for name in normal_names}
        normal_positions = [normal[name][0] for name in normal_names]
        self.assertEqual(normal_positions, sorted(normal_positions))

        active_restore = normal[normal_names[0]][1]
        self.assertIn("path: .cache/dmi-active-complete.json", active_restore)
        self.assertIn("key: dmi-zone-active-v1-", active_restore)

        active_materialize = normal[normal_names[1]][1]
        self.assertIn(
            'python scripts/materialize-dmi-bulk-storage.py '
            '--input "$source_path" --output "$materialized_path"',
            active_materialize,
        )
        self.assertIn(
            'reference="$(python scripts/check-dmi-bulk-operational-ready.py '
            '--cache "$materialized_path")"',
            active_materialize,
        )
        self.assertNotIn(".diagnostics.currentOperationalLedger.ready", active_materialize)
        self.assertIn("python scripts/build-copernicus-target-registry.py", active_materialize)
        self.assertIn("--require-strict-dmi-ledger", active_materialize)
        self.assertIn('--dmi "$materialized_path"', active_materialize)
        self.assertIn(
            'cp "$materialized_path" .cache/dmi-active-complete.json.tmp',
            active_materialize,
        )
        self.assertIn(
            "cp .cache/dmi-active-complete.json data/live/dmi-bulk-cache.json",
            active_materialize,
        )

        materialized_authority = normal[normal_names[2]][1]
        self.assertIn("steps.dmi-active-restore.outputs.cache-matched-key == ''", materialized_authority)
        self.assertIn("steps.dmi-active-legacy-bootstrap.outcome == 'success'", materialized_authority)
        self.assertIn("continue-on-error: true", materialized_authority)
        self.assertIn('test "$(git rev-parse origin/main^{commit})" = "$EXPECTED_HEAD_SHA"', materialized_authority)

        materialized_save = normal[normal_names[3]][1]
        self.assertIn("steps.dmi-legacy-materialized-write-authority.outcome == 'success'", materialized_save)
        self.assertIn("continue-on-error: true", materialized_save)
        self.assertIn("path: .cache/dmi-active-complete.json", materialized_save)
        self.assertIn("-legacy-materialized-${{ github.run_id }}-${{ github.run_attempt }}", materialized_save)
        self.assertNotIn("candidate_promoted", materialized_save)

        candidate_restore = normal[normal_names[4]][1]
        self.assertIn("path: .cache/dmi-candidate-progress.json", candidate_restore)
        self.assertIn("key: dmi-zone-candidate-v1-", candidate_restore)
        self.assertIn("restore-keys:", candidate_restore)

        self.assertNotIn(
            "Inspect isolated DMI candidate progress for normal maintenance",
            workflow,
        )

        dmi = normal[normal_names[5]][1]
        for marker in (
            "DMI_BULK_OUTPUT_PATH: .cache/dmi-candidate-progress.json",
            "DMI_BULK_PROMOTION_PATH: data/live/dmi-bulk-cache.json",
            "DMI_BULK_PREFER_OUTPUT_CACHE: true",
            "DMI_BULK_RETAIN_PREFERRED_NATIVE_RUN: false",
            "DMI_BULK_DEPLOYED_FALLBACK_PATH: .cache/dmi-active-complete.json",
        ):
            self.assertIn(marker, dmi)

        candidate = normal[normal_names[6]][1]
        self.assertIn("if: always()", candidate)
        self.assertIn("steps.dmi-bulk.outcome != 'cancelled'", candidate)
        self.assertIn("path: .cache/dmi-candidate-progress.json", candidate)
        self.assertIn("key: dmi-zone-candidate-v1-", candidate)
        self.assertNotIn("dmi-zone-cache-v1-", candidate)

        terminal = normal[normal_names[7]][1]
        self.assertIn('test "$code" = "DMI_READY"', terminal)
        self.assertIn('test "$STRICT_CURRENT_ANCHOR_READY" = "true"', terminal)

        snapshot = normal[normal_names[8]][1]
        self.assertIn("steps.dmi-terminal-gate.outputs.ready == 'true'", snapshot)
        self.assertIn("steps.dmi-bulk.outputs.candidate_promoted == 'true'", snapshot)
        self.assertIn("python scripts/check-dmi-bulk-operational-ready.py", snapshot)
        self.assertIn("--cache data/live/dmi-bulk-cache.json", snapshot)
        self.assertNotIn(".diagnostics.currentOperationalLedger.ready", snapshot)
        self.assertIn("python scripts/build-copernicus-target-registry.py", snapshot)
        self.assertIn("--require-strict-dmi-ledger", snapshot)
        self.assertIn("--at \"$RAVRADAR_PRODUCTION_TARGET_HOUR\"", snapshot)

        active = normal[normal_names[9]][1]
        self.assertNotIn("if: always()", active)
        self.assertIn("steps.dmi-terminal-gate.outputs.ready == 'true'", active)
        self.assertIn("steps.dmi-bulk.outputs.candidate_promoted == 'true'", active)
        self.assertIn("path: .cache/dmi-active-complete.json", active)
        self.assertIn("key: dmi-zone-active-v1-", active)
        self.assertNotIn("dmi-zone-cache-v1-", active)

        oneoff = (
            ROOT
            / ".github"
            / "workflows"
            / "validate-copernicus-current-pilot.yml"
        ).read_text("utf-8")
        oneoff_names = (
            "Restore last complete active DMI generation",
            "Strictly bind and materialize the active DMI generation",
            "Reconfirm exact main before materialized legacy DMI cache",
            "Save materialized legacy active DMI generation",
            "Restore isolated DMI candidate progress",
            "Isolate restored candidate and restore active working copy",
            "Refresh all bounded official DMI collections for the proof",
            "Save isolated DMI candidate progress before any terminal decision",
            "Strictly snapshot only a promoted READY DMI generation",
            "Save the promoted complete active DMI generation",
        )
        oneoff_steps = {name: workflow_step(oneoff, name) for name in oneoff_names}
        oneoff_positions = [oneoff_steps[name][0] for name in oneoff_names]
        self.assertEqual(oneoff_positions, sorted(oneoff_positions))

        oneoff_active_restore = oneoff_steps[oneoff_names[0]][1]
        self.assertIn("path: .cache/dmi-active-complete.json", oneoff_active_restore)
        self.assertIn("key: dmi-zone-active-v1-", oneoff_active_restore)

        oneoff_materialize = oneoff_steps[oneoff_names[1]][1]
        self.assertIn(
            'python scripts/materialize-dmi-bulk-storage.py '
            '--input "$source_path" --output "$materialized_path"',
            oneoff_materialize,
        )
        self.assertIn(
            'reference="$(python scripts/check-dmi-bulk-operational-ready.py '
            '--cache "$materialized_path")"',
            oneoff_materialize,
        )
        self.assertNotIn(".diagnostics.currentOperationalLedger.ready", oneoff_materialize)
        self.assertIn("python scripts/build-copernicus-target-registry.py", oneoff_materialize)
        self.assertIn("--require-strict-dmi-ledger", oneoff_materialize)
        self.assertIn('--dmi "$materialized_path"', oneoff_materialize)
        self.assertIn(
            'cp "$materialized_path" .cache/dmi-active-complete.json.tmp',
            oneoff_materialize,
        )

        oneoff_materialized_authority = oneoff_steps[oneoff_names[2]][1]
        self.assertIn("steps.dmi-active-restore.outputs.cache-matched-key == ''", oneoff_materialized_authority)
        self.assertIn("steps.dmi-active-legacy-bootstrap.outcome == 'success'", oneoff_materialized_authority)
        self.assertIn("continue-on-error: true", oneoff_materialized_authority)
        self.assertIn('test "$(git rev-parse origin/main^{commit})" = "$EXPECTED_HEAD_SHA"', oneoff_materialized_authority)

        oneoff_materialized_save = oneoff_steps[oneoff_names[3]][1]
        self.assertIn("steps.oneoff-dmi-legacy-materialized-write-authority.outcome == 'success'", oneoff_materialized_save)
        self.assertIn("continue-on-error: true", oneoff_materialized_save)
        self.assertIn("path: .cache/dmi-active-complete.json", oneoff_materialized_save)
        self.assertIn("-legacy-materialized-${{ github.run_id }}-${{ github.run_attempt }}", oneoff_materialized_save)
        self.assertNotIn("candidate_promoted", oneoff_materialized_save)

        oneoff_candidate_restore = oneoff_steps[oneoff_names[4]][1]
        self.assertIn("path: .cache/dmi-candidate-progress.json", oneoff_candidate_restore)
        self.assertIn("key: dmi-zone-candidate-v1-", oneoff_candidate_restore)

        oneoff_candidate_state = oneoff_steps[oneoff_names[5]][1]
        self.assertIn(
            "cp .cache/dmi-active-complete.json data/live/dmi-bulk-cache.json",
            oneoff_candidate_state,
        )
        self.assertNotIn("retain_preferred", oneoff_candidate_state)

        dmi = oneoff_steps[oneoff_names[6]][1]
        for marker in (
            "DMI_BULK_OUTPUT_PATH: .cache/dmi-candidate-progress.json",
            "DMI_BULK_PROMOTION_PATH: data/live/dmi-bulk-cache.json",
            "DMI_BULK_PREFER_OUTPUT_CACHE: true",
            "DMI_BULK_RETAIN_PREFERRED_NATIVE_RUN: false",
            "DMI_BULK_DEPLOYED_FALLBACK_PATH: .cache/dmi-active-complete.json",
        ):
            self.assertIn(marker, dmi)

        oneoff_candidate = oneoff_steps[oneoff_names[7]][1]
        self.assertIn("if: always()", oneoff_candidate)
        self.assertIn("steps.dmi-bulk.outcome != 'cancelled'", oneoff_candidate)
        self.assertIn("path: .cache/dmi-candidate-progress.json", oneoff_candidate)
        self.assertIn("key: dmi-zone-candidate-v1-", oneoff_candidate)
        self.assertNotIn("dmi-zone-cache-v1-", oneoff_candidate)

        oneoff_snapshot = oneoff_steps[oneoff_names[8]][1]
        self.assertIn("steps.dmi-bulk.outcome == 'success'", oneoff_snapshot)
        self.assertIn("steps.dmi-bulk.outputs.candidate_promoted == 'true'", oneoff_snapshot)
        self.assertIn("python scripts/check-dmi-bulk-operational-ready.py", oneoff_snapshot)
        self.assertIn("--cache data/live/dmi-bulk-cache.json", oneoff_snapshot)
        self.assertNotIn(".diagnostics.currentOperationalLedger.ready", oneoff_snapshot)
        self.assertIn("python scripts/build-copernicus-target-registry.py", oneoff_snapshot)
        self.assertIn("--require-strict-dmi-ledger", oneoff_snapshot)
        self.assertIn(
            '--at "${{ steps.operational-target.outputs.target_hour }}"',
            oneoff_snapshot,
        )

        promoted = oneoff_steps[oneoff_names[9]][1]
        self.assertNotIn("if: always()", promoted)
        self.assertIn("steps.dmi-bulk.outcome == 'success'", promoted)
        self.assertIn("steps.dmi-bulk.outputs.candidate_promoted == 'true'", promoted)
        self.assertIn("path: .cache/dmi-active-complete.json", promoted)
        self.assertIn("key: dmi-zone-active-v1-", promoted)
        self.assertNotIn("dmi-zone-cache-v1-", promoted)

    def test_diagnostic_errors_redact_credentials_and_url_queries(self) -> None:
        secret = "synthetic-private-key"
        with patch.object(producer, "API_KEY", secret):
            message = producer.safe_error_message(RuntimeError(
                "GET https://example.invalid/items?api-key="
                f"{secret}&signature=private failed"
            ))
        self.assertNotIn(secret, message)
        self.assertNotIn("signature=private", message)
        self.assertIn("[redacted]", message)

        source = (SCRIPTS / "update-dmi-bulk.py").read_text("utf-8")
        self.assertIn(
            "print(f\"DMI bulk downloader failed safely: {safe_error_message(exc)}\"",
            source,
        )
        handler_start = source.index('if __name__ == "__main__":')
        handler_end = source.index(
            "# 4.0.29 diagnostics placeholders",
            handler_start,
        )
        handler = source[handler_start:handler_end]
        output_start = handler.index("write_github_outputs(")
        output_end = handler.index("write_failure_summary(exc)", output_start)
        failure_output = handler[output_start:output_end]
        self.assertIn('"failed"', failure_output)
        self.assertIn("error=safe_error_message(exc)", failure_output)
        self.assertIn(
            'terminal_code="DMI_PRODUCER_EXCEPTION"',
            failure_output,
        )
        self.assertIn("strict_current_anchor_ready=False", failure_output)


class ConsumerSeamTests(unittest.TestCase):
    def test_old_target_latest_future_seam_loses_two_of_120_hours(self) -> None:
        node = shutil.which("node")
        bundled_node = (
            Path(sys.executable).resolve().parents[1] / "node" / "bin" / "node.exe"
        )
        if not node and bundled_node.is_file():
            node = str(bundled_node)
        if node is None:
            self.skipTest("Node.js is unavailable")
        module_url = (SCRIPTS / "lib/dmi-forecast-store.mjs").as_uri()
        script = r"""
import { buildDmiForecastHourly } from __MODULE__;
const target = '2026-08-30T12:00:00.000Z';
const oldRun = '2026-08-28T18:00:00.000Z';
const latestRun = '2026-08-30T06:00:00.000Z';
const at = hours => new Date(Date.parse(target) + hours * 3600000).toISOString();
const provenance = (step, modelRun) => ({ wave: {
  provider: 'dmi', fallback: false, collection: 'wam_dw', collectionFamily: 'wave',
  component: 'wave', componentKind: 'wave-mobilisation-tuple',
  fieldSet: ['significant-wave-height', 'dominant-wave-period'],
  optionalFieldSet: ['mean-wave-dir'], modelRun, nativeValidTime: step,
  leadTimeHours: (Date.parse(step) - Date.parse(modelRun)) / 3600000,
  entityId: 'PART::SYNTHETIC', parentZoneId: 'ZONE-SYNTHETIC',
  entityType: 'coastal-part', samplingContext: 'coastal-part-water-point',
  samplingPoint: [10, 56], gridPoint: [10, 56],
  gridDefinitionSha256: 'a'.repeat(64), distanceKm: 0,
  spatialSelection: 'nearest-shared-wave-height-period-grid-cell-no-spatial-interpolation',
  spatialSemanticsVersion: 1, itemId: `item-${step}`,
  assetIdentitySha256: 'b'.repeat(64), acquiredAt: target,
} });
const row = (step, run) => ({
  step, 'significant-wave-height': 1.2, 'dominant-wave-period': 6,
  'mean-wave-dir': 270, provenance: provenance(step, run),
});
const future = [];
for (let offset = 3; offset <= 120; offset += 3) future.push(row(at(offset), latestRun));
const count = waves => buildDmiForecastHourly({
  waves, generatedAt: target, startAt: target, hours: 120, sourceCadenceMinutes: 180,
}).hourly.filter(hour => Number.isFinite(hour.waveHeightM)).length;
console.log(JSON.stringify({
  mixedRunCompleteHours: count([row(target, oldRun), ...future]),
  latestRunCompleteHours: count([row(target, latestRun), ...future]),
}));
""".replace("__MODULE__", json.dumps(module_url))
        completed = subprocess.run(
            [node, "--input-type=module", "-e", script],
            cwd=ROOT,
            check=True,
            capture_output=True,
            text=True,
        )
        evidence = json.loads(completed.stdout)
        self.assertEqual(evidence["mixedRunCompleteHours"], 118)
        self.assertEqual(evidence["latestRunCompleteHours"], 120)


if __name__ == "__main__":
    unittest.main(verbosity=2)
