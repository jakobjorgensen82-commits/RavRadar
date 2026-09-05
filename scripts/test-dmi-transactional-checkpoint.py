#!/usr/bin/env python3
"""Focused contracts for transactional DMI assets and light checkpoints.

All fixtures are synthetic.  The module is imported with an ecCodes stub; the
test performs no network calls and contains no production coordinates or raw
vector values.
"""
from __future__ import annotations

import copy
import importlib.util
import json
import sys
import tempfile
import types
import unittest
from pathlib import Path
from unittest.mock import Mock, patch


ROOT = Path(__file__).resolve().parents[1]
SCRIPTS = ROOT / "scripts"
if str(SCRIPTS) not in sys.path:
    sys.path.insert(0, str(SCRIPTS))

eccodes = types.ModuleType("eccodes")
eccodes.__version__ = "test-api"
eccodes.bindings_version = "test-binding"
eccodes.CODES_GRIB_NEAREST_SAME_GRID = 1
eccodes.OutOfAreaError = type("OutOfAreaError", (Exception,), {})
for name in (
    "codes_get",
    "codes_get_array",
    "codes_get_elements",
    "codes_grib_find_nearest",
    "codes_grib_nearest_delete",
    "codes_grib_nearest_find",
    "codes_grib_nearest_new",
    "codes_grib_new_from_file",
    "codes_release",
):
    setattr(eccodes, name, lambda *args, **kwargs: None)
sys.modules["eccodes"] = eccodes

spec = importlib.util.spec_from_file_location(
    "ravradar_dmi_transactional_checkpoint_test",
    SCRIPTS / "update-dmi-bulk.py",
)
assert spec and spec.loader
producer = importlib.util.module_from_spec(spec)
spec.loader.exec_module(producer)


COLLECTION = "dkss_idw"
MODEL_RUN = "2026-01-01T00:00:00Z"
FIRST_TIME = "2026-01-01T01:00:00Z"
SECOND_TIME = "2026-01-01T02:00:00Z"
PUBLIC_ID = "PUBLIC::SYNTHETIC"
PRIVATE_ID = "PRIVATE::SYNTHETIC"
RESEARCH_ID = "RESEARCH::SYNTHETIC"


def zones() -> list[dict]:
    return [
        {"id": PUBLIC_ID},
        {"id": PRIVATE_ID, "privateStage": True},
        {
            "id": RESEARCH_ID,
            "researchCurrent": True,
            "requiredCollection": COLLECTION,
        },
    ]


def durable_documents() -> tuple[dict, dict, dict, dict, dict]:
    result = {
        "generatedAt": MODEL_RUN,
        "zones": {
            PUBLIC_ID: {
                "hourly": {
                    FIRST_TIME: {"time": FIRST_TIME, "sample": "before"},
                    SECOND_TIME: {"time": SECOND_TIME, "sample": "stable"},
                },
                "gridPoints": {"sample": {"identity": "before"}},
                "collections": {"sample": COLLECTION},
                "marineSelection": {"collection": COLLECTION},
            },
        },
    }
    private = {
        "generatedAt": MODEL_RUN,
        "zones": {
            PRIVATE_ID: {
                "hourly": {
                    FIRST_TIME: {"time": FIRST_TIME, "sample": "before-private"},
                },
                "gridPoints": {"sample": {"identity": "before-private"}},
                "collections": {"sample": COLLECTION},
            },
        },
    }
    diagnostics = {"nested": {"events": ["before"]}, "messagesSeen": 1}
    shadow = {
        "anchors": {RESEARCH_ID: {"events": ["before"]}},
        "coverageAudits": {RESEARCH_ID: {"count": 1}},
        "unrelated": {"stable": True},
    }
    outcomes = {"stable": "before"}
    return result, private, diagnostics, shadow, outcomes


def mutate_stages(
    _path,
    _collection,
    _model_run,
    valid_time,
    _zones,
    staged_result,
    diagnostics,
    staged_shadow,
    staged_private,
    staged_outcomes,
    *,
    allowed_parameters=None,
):
    del allowed_parameters
    public = staged_result["zones"][PUBLIC_ID]
    public["hourly"][valid_time]["sample"] = "mutated"
    public["gridPoints"]["sample"]["identity"] = "mutated"
    public["collections"]["sample"] = "mutated"
    public["marineSelection"]["collection"] = "mutated"
    private = staged_private["zones"][PRIVATE_ID]
    private["hourly"][valid_time]["sample"] = "mutated-private"
    private["gridPoints"]["sample"]["identity"] = "mutated-private"
    diagnostics["nested"]["events"].append("mutated")
    diagnostics["new"] = "mutated"
    staged_shadow["anchors"][RESEARCH_ID]["events"].append("mutated")
    staged_shadow["coverageAudits"][RESEARCH_ID]["count"] = 2
    staged_outcomes["complete"] = True
    return {"synthetic-field"}, {PUBLIC_ID}, False, 4, 5


class TransactionalAssetTests(unittest.TestCase):
    def run_failed_asset(self, mode: str) -> None:
        result, private, diagnostics, shadow, outcomes = durable_documents()
        before = copy.deepcopy((result, private, diagnostics, shadow, outcomes))

        def assert_rollback_precedes_flush() -> None:
            self.assertEqual(
                (result, private, diagnostics, shadow, outcomes),
                before,
            )

        failure_flush = Mock(side_effect=assert_rollback_precedes_flush)

        def fake_process(*args, **kwargs):
            outcome = mutate_stages(*args, **kwargs)
            if mode == "exception":
                raise RuntimeError("synthetic asset failure")
            if mode == "interrupted":
                return outcome[0], outcome[1], True, outcome[3], outcome[4]
            return outcome

        call = lambda: producer.process_grib_transactionally(
            Path("synthetic.grib"),
            COLLECTION,
            MODEL_RUN,
            FIRST_TIME,
            zones(),
            result,
            diagnostics,
            shadow,
            private,
            outcomes,
            failure_flush=failure_flush,
            stage_validator=(
                (lambda *_args: False) if mode == "validator" else None
            ),
            validation_error="synthetic stage rejected",
        )

        with patch.object(producer, "process_grib", side_effect=fake_process):
            if mode == "interrupted":
                self.assertEqual(call(), (set(), set(), True, 0, 0))
            else:
                expected = (
                    "synthetic asset failure"
                    if mode == "exception"
                    else "synthetic stage rejected"
                )
                with self.assertRaisesRegex(RuntimeError, expected):
                    call()

        self.assertEqual((result, private, diagnostics, shadow, outcomes), before)
        failure_flush.assert_called_once_with()

    def test_interrupted_asset_rolls_back_every_staged_surface(self) -> None:
        self.run_failed_asset("interrupted")

    def test_exception_asset_rolls_back_every_staged_surface(self) -> None:
        self.run_failed_asset("exception")

    def test_validator_rejection_rolls_back_every_staged_surface(self) -> None:
        self.run_failed_asset("validator")

    def test_absent_research_target_stays_absent_after_success(self) -> None:
        result, private, diagnostics, shadow, outcomes = durable_documents()
        self.assertNotIn(RESEARCH_ID, result["zones"])

        def successful_process(
            _path,
            _collection,
            _model_run,
            _valid_time,
            _zones,
            staged_result,
            _diagnostics,
            _staged_shadow,
            _staged_private,
            _staged_outcomes,
            *,
            allowed_parameters=None,
        ):
            del allowed_parameters
            self.assertNotIn(RESEARCH_ID, staged_result["zones"])
            return {"synthetic-field"}, {PUBLIC_ID}, False, 1, 1

        with patch.object(producer, "process_grib", side_effect=successful_process):
            outcome = producer.process_grib_transactionally(
                Path("synthetic.grib"), COLLECTION, MODEL_RUN, FIRST_TIME,
                zones(), result, diagnostics, shadow, private, outcomes,
            )

        self.assertFalse(outcome[2])
        self.assertNotIn(RESEARCH_ID, result["zones"])

    def test_successful_asset_commits_every_staged_surface(self) -> None:
        result, private, diagnostics, shadow, outcomes = durable_documents()
        unrelated_shadow = copy.deepcopy(shadow["unrelated"])

        with patch.object(producer, "process_grib", side_effect=mutate_stages):
            outcome = producer.process_grib_transactionally(
                Path("synthetic.grib"),
                COLLECTION,
                MODEL_RUN,
                FIRST_TIME,
                zones(),
                result,
                diagnostics,
                shadow,
                private,
                outcomes,
            )

        self.assertEqual(
            outcome,
            ({"synthetic-field"}, {PUBLIC_ID}, False, 4, 5),
        )
        self.assertEqual(
            result["zones"][PUBLIC_ID]["hourly"][FIRST_TIME]["sample"],
            "mutated",
        )
        self.assertEqual(
            result["zones"][PUBLIC_ID]["gridPoints"]["sample"]["identity"],
            "mutated",
        )
        self.assertEqual(
            private["zones"][PRIVATE_ID]["hourly"][FIRST_TIME]["sample"],
            "mutated-private",
        )
        self.assertEqual(diagnostics["nested"]["events"], ["before", "mutated"])
        self.assertEqual(shadow["anchors"][RESEARCH_ID]["events"][-1], "mutated")
        self.assertEqual(shadow["coverageAudits"][RESEARCH_ID]["count"], 2)
        self.assertEqual(shadow["unrelated"], unrelated_shadow)
        self.assertEqual(outcomes, {"complete": True})

    def test_missing_zone_maps_are_normalized_before_successful_parse(self) -> None:
        result = {
            "zones": {
                PUBLIC_ID: {
                    "hourly": {
                        FIRST_TIME: {"time": FIRST_TIME, "sample": "before"},
                    },
                },
            },
        }
        diagnostics: dict = {}

        def process_incomplete_zone(
            _path,
            _collection,
            _model_run,
            valid_time,
            _zones,
            staged_result,
            _diagnostics,
            _staged_shadow,
            _staged_private,
            _staged_outcomes,
            *,
            allowed_parameters=None,
        ):
            del allowed_parameters
            point = staged_result["zones"][PUBLIC_ID]
            point["gridPoints"]["synthetic"] = {"identity": "committed"}
            point["collections"]["synthetic"] = COLLECTION
            point["marineSelection"]["collection"] = COLLECTION
            point["hourly"][valid_time]["sample"] = "committed"
            return {"synthetic-field"}, {PUBLIC_ID}, False, 1, 1

        with patch.object(
            producer,
            "process_grib",
            side_effect=process_incomplete_zone,
        ):
            producer.process_grib_transactionally(
                Path("synthetic.grib"),
                COLLECTION,
                MODEL_RUN,
                FIRST_TIME,
                [{"id": PUBLIC_ID}],
                result,
                diagnostics,
            )

        point = result["zones"][PUBLIC_ID]
        self.assertEqual(point["gridPoints"]["synthetic"]["identity"], "committed")
        self.assertEqual(point["collections"]["synthetic"], COLLECTION)
        self.assertEqual(point["marineSelection"]["collection"], COLLECTION)

    def test_owner_switch_detaches_other_hours_before_interrupted_rollback(
        self,
    ) -> None:
        result, private, diagnostics, shadow, outcomes = durable_documents()
        point = result["zones"][PUBLIC_ID]
        point["marineSelection"] = {
            "collection": "dkss_lf",
            "score": 1_000.0,
        }
        for hour in point["hourly"].values():
            hour["sea-mean-deviation"] = 1.0
            hour["sources"] = {
                "waterLevel": {"synthetic": {"identity": "before"}},
            }
        before = copy.deepcopy((result, private, diagnostics, shadow, outcomes))

        def switch_owner_then_interrupt(
            _path,
            collection,
            _model_run,
            _valid_time,
            _zones,
            staged_result,
            _diagnostics,
            _staged_shadow,
            _staged_private,
            _staged_outcomes,
            *,
            allowed_parameters=None,
        ):
            del allowed_parameters
            accepted = producer.accept_marine_collection(
                staged_result["zones"][PUBLIC_ID],
                {"id": PUBLIC_ID, "coastType": "east"},
                collection,
                1.0,
            )
            self.assertTrue(accepted)
            return {"synthetic-field"}, {PUBLIC_ID}, True, 1, 1

        failure_flush = Mock(
            side_effect=lambda: self.assertEqual(
                (result, private, diagnostics, shadow, outcomes),
                before,
            ),
        )
        with patch.object(
            producer,
            "process_grib",
            side_effect=switch_owner_then_interrupt,
        ):
            outcome = producer.process_grib_transactionally(
                Path("synthetic.grib"),
                COLLECTION,
                MODEL_RUN,
                FIRST_TIME,
                zones(),
                result,
                diagnostics,
                shadow,
                private,
                outcomes,
                failure_flush=failure_flush,
            )

        self.assertEqual(outcome, (set(), set(), True, 0, 0))
        self.assertEqual((result, private, diagnostics, shadow, outcomes), before)
        failure_flush.assert_called_once_with()


class CheckpointTests(unittest.TestCase):
    def test_progress_checkpoint_is_compact_atomic_and_light(self) -> None:
        result = {
            "generatedAt": MODEL_RUN,
            "zones": {PUBLIC_ID: {"hourly": {}}},
            "diagnostics": {"sentinel": "unchanged"},
        }
        with tempfile.TemporaryDirectory() as directory:
            output = Path(directory) / "checkpoint.json"
            stable_payload = '{"stable":true}\n'
            output.write_text(stable_payload, "utf-8")
            with (
                patch.object(producer, "OUTPUT_PATH", output),
                patch.object(
                    producer,
                    "clean_and_summarize",
                    side_effect=AssertionError("full clean must not run"),
                ),
                patch.object(
                    producer,
                    "build_ocean_diagnostics",
                    side_effect=AssertionError("ocean diagnostics must not run"),
                ),
                patch.object(
                    producer,
                    "write_ocean_diagnostics",
                    side_effect=AssertionError("ocean diagnostics must not run"),
                ),
            ):
                with (
                    patch.object(
                        Path,
                        "replace",
                        side_effect=OSError("synthetic replace failure"),
                    ),
                    self.assertRaisesRegex(OSError, "synthetic replace failure"),
                ):
                    producer.write_checkpoint(
                        result,
                        {PUBLIC_ID},
                        {"bytes": 0},
                    )
                self.assertEqual(output.read_text("utf-8"), stable_payload)
                producer.write_checkpoint(result, {PUBLIC_ID}, {"bytes": 0})

            serialized = output.read_text("utf-8")
            persisted = json.loads(serialized)
            self.assertEqual(serialized.count("\n"), 1)
            self.assertFalse(output.with_suffix(".json.tmp").exists())
            self.assertEqual(persisted["refreshStatus"], "partial")
            self.assertEqual(persisted["diagnostics"]["sentinel"], "unchanged")
            self.assertEqual(
                persisted["diagnostics"]["progressCheckpoint"],
                {"schemaVersion": 1, "validation": "pending-finalization"},
            )

            with patch.object(producer, "OUTPUT_PATH", output):
                producer.atomic_write_bulk_cache({"outer": {"inner": 1}})
            self.assertIn('\n  "outer": {', output.read_text("utf-8"))

    def test_shared_controller_flushes_committed_assets_and_sidecars_once(self) -> None:
        result = {"diagnostics": {}, "zones": {}}
        checkpoint_calls: list[str] = []
        sidecar_flush = Mock()

        def record_checkpoint(*_args, **_kwargs):
            checkpoint_calls.append("bulk")
            if len(checkpoint_calls) == 1:
                raise OSError("synthetic checkpoint failure")

        with (
            patch.object(producer, "CHECKPOINT_MAX_ASSETS", 2),
            patch.object(producer, "CHECKPOINT_MAX_SECONDS", 10_000),
            patch.object(producer, "write_checkpoint", side_effect=record_checkpoint),
        ):
            controller = producer.ProgressCheckpointController(
                result, set(), {"bytes": 0}, sidecar_flush,
            )
            controller.mark_sidecars_dirty()
            self.assertFalse(controller.note_committed_asset(seconds=1.0))
            with self.assertRaisesRegex(OSError, "synthetic checkpoint failure"):
                controller.note_committed_asset(seconds=2.0)
            self.assertTrue(controller.bulk_dirty)
            self.assertTrue(controller.sidecars_dirty)
            self.assertEqual(controller.committed_assets_since_write, 2)
            sidecar_flush.assert_not_called()

            self.assertTrue(controller.flush_if_due(force=True))
            self.assertEqual(checkpoint_calls, ["bulk", "bulk"])
            sidecar_flush.assert_called_once_with()
            self.assertEqual(controller.committed_assets_since_write, 0)

            controller.mark_bulk_dirty()
            self.assertTrue(controller.flush_if_due(force=True))
            self.assertEqual(checkpoint_calls, ["bulk", "bulk", "bulk"])
            self.assertFalse(controller.flush_if_due(force=True))
            self.assertEqual(checkpoint_calls, ["bulk", "bulk", "bulk"])

    def test_resume_from_progress_checkpoint_matches_uninterrupted_assets(self) -> None:
        def empty_result() -> dict:
            return {
                "schemaVersion": 2,
                "generatedAt": MODEL_RUN,
                "zoneRegistrySignature": "synthetic-signature",
                "zones": {
                    PUBLIC_ID: {
                        "hourly": {},
                        "gridPoints": {},
                        "collections": {},
                    },
                },
                "diagnostics": {},
                "runs": {
                    COLLECTION: {
                        "assetsProcessed": 0,
                        "processedValidTimes": [],
                        "processedSteps": {},
                    },
                },
                "collectionState": {
                    COLLECTION: {
                        "referenceTime": MODEL_RUN,
                        "committedValidTimes": [],
                    },
                },
            }

        def deterministic_process(
            _path,
            _collection,
            _model_run,
            valid_time,
            _zones,
            staged_result,
            _diagnostics,
            _staged_shadow,
            _staged_private,
            _staged_outcomes,
            *,
            allowed_parameters=None,
        ):
            del allowed_parameters
            point = staged_result["zones"][PUBLIC_ID]
            point["hourly"][valid_time] = {
                "time": valid_time,
                "sample": f"committed-{valid_time}",
            }
            point["gridPoints"]["sample"] = {"latest": valid_time}
            return {"synthetic-field"}, {PUBLIC_ID}, False, 1, 1

        def apply_asset(document: dict, valid_time: str) -> None:
            outcome = producer.process_grib_transactionally(
                Path("synthetic.grib"), COLLECTION, MODEL_RUN, valid_time,
                [{"id": PUBLIC_ID}], document, document["diagnostics"],
            )
            run = document["runs"][COLLECTION]
            run["processedSteps"][valid_time] = {
                "complete": True,
                "recognizedParameters": sorted(outcome[0]),
                "zonesTouched": len(outcome[1]),
            }
            run["processedValidTimes"] = sorted(run["processedSteps"])
            run["assetsProcessed"] = len(run["processedValidTimes"])
            document["collectionState"][COLLECTION]["committedValidTimes"] = list(
                run["processedValidTimes"],
            )

        uninterrupted = empty_result()
        with patch.object(producer, "process_grib", side_effect=deterministic_process):
            apply_asset(uninterrupted, FIRST_TIME)
            apply_asset(uninterrupted, SECOND_TIME)

        with tempfile.TemporaryDirectory() as directory:
            output = Path(directory) / "checkpoint.json"
            resumable = empty_result()
            with (
                patch.object(producer, "OUTPUT_PATH", output),
                patch.object(
                    producer,
                    "DEPLOYED_FALLBACK_PATH",
                    Path(directory) / "missing-fallback.json",
                ),
                patch.object(producer, "CHECKPOINT_MAX_ASSETS", 1),
                patch.object(producer, "CHECKPOINT_MAX_SECONDS", 10_000),
                patch.object(producer, "process_grib", side_effect=deterministic_process),
            ):
                apply_asset(resumable, FIRST_TIME)
                first_controller = producer.ProgressCheckpointController(
                    resumable, {PUBLIC_ID}, {"bytes": 0},
                )
                self.assertTrue(first_controller.note_committed_asset(seconds=1.0))
                resumed = producer.load_previous("synthetic-signature")
                self.assertEqual(
                    resumed["diagnostics"]["progressCheckpoint"]["validation"],
                    "pending-finalization",
                )
                loaded = resumed
                resumed = empty_result()
                resumed["runs"] = {}
                resumed["collectionState"] = copy.deepcopy(
                    loaded["collectionState"],
                )
                producer.merge_previous(
                    resumed,
                    loaded,
                    allowed_zone_ids={PUBLIC_ID},
                )
                self.assertIn(
                    FIRST_TIME,
                    resumed["runs"][COLLECTION]["processedSteps"],
                )
                apply_asset(resumed, SECOND_TIME)
                second_controller = producer.ProgressCheckpointController(
                    resumed, {PUBLIC_ID}, {"bytes": 0},
                )
                self.assertTrue(second_controller.note_committed_asset(seconds=1.0))
                persisted_resume = json.loads(output.read_text("utf-8"))

        for key in ("zones", "runs", "collectionState"):
            with self.subTest(surface=key):
                self.assertEqual(persisted_resume[key], uninterrupted[key])

    def test_partial_collection_without_strict_anchor_is_never_ready(self) -> None:
        diagnostics = {
            "collectionsAttempted": [COLLECTION],
            "collectionsPartial": [COLLECTION],
            "stacByCollection": {COLLECTION: {}},
            "errors": [],
            "currentOperationalLedger": {},
        }
        self.assertTrue(producer.producer_success_blocked(False, False, False))
        terminal = producer.producer_terminal_code(
            strict_current_anchor_available=False,
            wave_bootstrap_requested=False,
            bootstrap_complete=False,
            productive=True,
            diagnostics=diagnostics,
        )
        self.assertNotEqual(terminal, "DMI_READY")

    def test_final_writer_removes_pending_marker_and_orders_diagnostics_last(self) -> None:
        result = {
            "refreshStatus": "partial",
            "diagnostics": {
                "progressCheckpoint": {
                    "schemaVersion": 1,
                    "validation": "pending-finalization",
                },
            },
        }
        calls: list[tuple[str, object]] = []

        def record_cache(document, *, pretty=True):
            calls.append(("cache", pretty))
            self.assertNotIn("progressCheckpoint", document["diagnostics"])

        def record_diagnostics(document):
            calls.append(("diagnostics", document["refreshStatus"]))

        with (
            patch.object(producer, "atomic_write_bulk_cache", side_effect=record_cache),
            patch.object(producer, "write_ocean_diagnostics", side_effect=record_diagnostics),
        ):
            producer.write_finalized_cache(result, "ok")

        self.assertEqual(calls, [("cache", True), ("diagnostics", "ok")])

    def test_candidate_promotion_is_atomic_and_ready_only(self) -> None:
        document = {
            "refreshStatus": "ok",
            "privateReplayRetentionHours": 60,
            "zones": {
                "PART::example": {
                    "hourly": {
                        "2026-09-03T12:00:00Z": {
                            "wave-height": 0.8,
                            "current-u": 0.1,
                            "current-v": -0.2,
                        }
                    }
                }
            },
            "diagnostics": {"currentOperationalLedger": {"ready": True}},
        }
        with tempfile.TemporaryDirectory(prefix="ravradar-dmi-promote-") as raw:
            root = Path(raw)
            candidate = root / "candidate.json"
            active = root / "active.json"
            sticky = Mock()
            with (
                patch.object(producer, "OUTPUT_PATH", candidate),
                patch.object(producer, "PROMOTION_PATH", active),
                patch.object(producer, "write_sticky_github_output", sticky),
            ):
                self.assertFalse(producer.promote_ready_candidate(
                    document,
                    strict_current_anchor_available=False,
                    producer_success_is_blocked=True,
                ))
                self.assertFalse(active.exists())
                self.assertTrue(producer.promote_ready_candidate(
                    document,
                    strict_current_anchor_available=True,
                    producer_success_is_blocked=False,
                ))
            self.assertEqual(json.loads(active.read_text("utf-8")), document)
            self.assertEqual(
                len(json.loads(active.read_text("utf-8"))["zones"]["PART::example"]["hourly"]),
                1,
            )
            self.assertFalse(active.with_name(active.name + ".tmp").exists())
            sticky.assert_called_once_with("candidate_promoted", "true")


if __name__ == "__main__":
    unittest.main()
