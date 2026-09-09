#!/usr/bin/env python3
"""Focused red-team contracts for the WAM bootstrap producer integration.

The fixtures are synthetic and contain no production part ids, coordinates,
wave values or signed URLs.  The update module is imported with an ecCodes stub;
no network request is made.
"""
from __future__ import annotations

import copy
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
        stac.assert_called_once()
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
        self.assertEqual(aggregate["historyIncompleteCode"], "NO_COHERENT_RUN")
        self.assertIn("significant-wave-height", preserved_hour)
        self.assertIn("wave", preserved_hour["sources"])

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
        stac.assert_called_once()
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
    def test_wam_resume_receives_exact_selected_asset_proof(self) -> None:
        source = (SCRIPTS / "update-dmi-bulk.py").read_text(encoding="utf-8")
        self.assertRegex(
            source,
            r"required_asset_provenance=\(\s*required_asset_provenance\s*"
            r"if collection in MARINE_COLLECTIONS\s*"
            r"or collection in WAVE_BOOTSTRAP_COLLECTIONS",
        )

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
        asset = SimpleNamespace(valid_time=utc_offset(TARGET, -1))
        attempted: list[str] = []

        def fake_list(collection: str, _configuration: dict):
            attempted.append(collection)
            return fake_plan(), (asset,)

        def already_complete(
            _result: dict,
            _zone: dict,
            collection: str,
            _asset: object,
        ) -> bool:
            return collection == "wam_nsb"

        result = {"zones": {}, "diagnostics": {}}
        with (
            patch.object(
                producer,
                "list_private_wave_bootstrap_assets",
                side_effect=fake_list,
            ),
            patch.object(
                producer,
                "private_wave_bootstrap_hour_complete",
                side_effect=already_complete,
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
        self.assertEqual(locked["wam_nsb"], {asset.valid_time})
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
        fail_closed_return = source.index(
            "if producer_success_is_blocked:\n"
            "        return 2",
            success_gate_binding,
        )
        final_return = source.index(
            "return 0 if producer_productive else 2",
            fail_closed_return,
        )
        self.assertLess(validator, operational_binding)
        self.assertLess(operational_binding, success_gate_binding)
        self.assertLess(success_gate_binding, fail_closed_return)
        self.assertLess(fail_closed_return, final_return)

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
            dmi_start,
            workflow.index("- name: Save progressed DMI GRIB cache before any terminal decision"),
            workflow.index("- name: Save isolated DMI candidate progress before any terminal decision"),
            workflow.index("- name: Save private regional current evidence before any terminal decision"),
            gate_start,
            workflow.index("- name: Seal exact operational DMI gaps for target through target plus 117"),
            workflow.index("- name: Fill only the exact operational DMI gap seal"),
            workflow.index("- name: Restore shared private Open-Meteo current progress"),
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
