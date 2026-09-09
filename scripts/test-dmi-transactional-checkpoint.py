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
    def test_supervised_identity_ignores_query_rotation_but_binds_revision(self) -> None:
        asset = {
            "valid": FIRST_TIME,
            "id": "synthetic-stac-item",
            "href": (
                "https://opendata.dmi.dk/file/synthetic.grib"
                "?token=must-not-leak"
            ),
            "size": 1024,
            "itemCreatedAt": MODEL_RUN,
            "itemUpdatedAt": None,
        }
        original = producer.supervised_asset_identity(
            COLLECTION,
            MODEL_RUN,
            asset,
        )
        rotated_query = producer.supervised_asset_identity(
            COLLECTION,
            MODEL_RUN,
            {
                **asset,
                "href": (
                    "https://opendata.dmi.dk/file/synthetic.grib"
                    "?token=rotated-secret#fragment"
                ),
            },
        )
        self.assertEqual(rotated_query, original)
        self.assertNotIn("token", json.dumps(original))
        self.assertNotIn("secret", json.dumps(original))

        changed_revision = producer.supervised_asset_identity(
            COLLECTION,
            MODEL_RUN,
            {**asset, "size": 2048},
        )
        self.assertEqual(
            changed_revision["assetIdentitySha256"],
            original["assetIdentitySha256"],
        )
        self.assertNotEqual(
            changed_revision["assetRevisionSha256"],
            original["assetRevisionSha256"],
        )

        changed_path = producer.supervised_asset_identity(
            COLLECTION,
            MODEL_RUN,
            {
                **asset,
                "href": "https://opendata.dmi.dk/file/replaced.grib",
            },
        )
        self.assertNotEqual(
            changed_path["assetIdentitySha256"],
            original["assetIdentitySha256"],
        )
        self.assertNotEqual(
            changed_path["assetRevisionSha256"],
            original["assetRevisionSha256"],
        )

        encoded = json.dumps([original], sort_keys=True, separators=(",", ":"))
        with patch.dict(
            producer.os.environ,
            {"DMI_BULK_SUPERVISOR_SKIPPED_ASSETS": encoded},
        ):
            parsed = producer.supervised_skipped_asset_identities()
        self.assertEqual(
            parsed,
            {json.dumps(original, sort_keys=True, separators=(",", ":"))},
        )

        with (
            patch.dict(
                producer.os.environ,
                {"DMI_BULK_SUPERVISOR_SKIPPED_ASSETS": json.dumps(
                    [original, original]
                )},
            ),
            self.assertRaisesRegex(ValueError, "duplicates"),
        ):
            producer.supervised_skipped_asset_identities()

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

    def test_current_provenance_rejection_rolls_back_every_staged_surface(
        self,
    ) -> None:
        result, private, diagnostics, shadow, outcomes = durable_documents()
        before = copy.deepcopy((result, private, diagnostics, shadow, outcomes))
        failure_flush = Mock()
        with patch.object(producer, "process_grib", side_effect=mutate_stages):
            with self.assertRaisesRegex(RuntimeError, "current proof rejected"):
                producer.process_grib_transactionally(
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
                    current_stage_validator=lambda *_args: False,
                    validation_error="current proof rejected",
                )
        self.assertEqual((result, private, diagnostics, shadow, outcomes), before)
        failure_flush.assert_called_once_with()

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
    def test_structurally_invalid_preferred_candidate_is_quarantined_and_recovered(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            output = Path(directory) / "candidate.json"
            fallback = Path(directory) / "active.json"
            invalid = {
                "schemaVersion": 2,
                "zoneRegistrySignature": "synthetic-signature",
                "zones": "broken",
            }
            active = {
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
                "runs": {},
                "collectionState": {},
                "diagnostics": {},
            }
            invalid_bytes = json.dumps(invalid, sort_keys=True).encode("utf-8")
            output.write_bytes(invalid_bytes)
            fallback.write_text(json.dumps(active), "utf-8")

            with (
                patch.object(producer, "OUTPUT_PATH", output),
                patch.object(producer, "DEPLOYED_FALLBACK_PATH", fallback),
                patch.object(producer, "PREFER_OUTPUT_CACHE", True),
                patch.object(
                    producer, "_strict_current_donor_ready", return_value=True,
                ) as strict_ready,
            ):
                recovered = producer.load_previous(
                    "synthetic-signature",
                    coastal_part_targets=[],
                    production_reference=Mock(),
                )

            self.assertEqual(recovered, active)
            strict_ready.assert_called_once()
            self.assertEqual(producer.load_bulk_document(output), active)
            quarantines = list(Path(directory).glob("candidate.json.invalid-*"))
            self.assertEqual(len(quarantines), 1)
            self.assertEqual(quarantines[0].read_bytes(), invalid_bytes)

    def test_nested_precheckpoint_shape_poisons_are_quarantined(self) -> None:
        def valid_document() -> dict:
            return {
                "schemaVersion": 2,
                "generatedAt": MODEL_RUN,
                "zoneRegistrySignature": "synthetic-signature",
                "privateReplayRetentionHours": 54,
                "zones": {
                    PUBLIC_ID: {
                        "hourly": {}, "gridPoints": {}, "collections": {},
                    },
                },
                "runs": {},
                "collectionState": {},
                "diagnostics": {
                    "errors": [],
                    "zoneCount": 1,
                    "componentHorizonCoverage": {
                        "wind": {"zonesWith96Hours": 1},
                        "marine": {"zonesWith96Hours": 1},
                    },
                    "persistentFieldInventory": {},
                },
            }

        poisons = {
            "errors-container": lambda document: document["diagnostics"].update(errors="x"),
            "errors-row": lambda document: document["diagnostics"].update(errors=["x"]),
            "horizon-container": lambda document: document["diagnostics"].update(
                componentHorizonCoverage="x"
            ),
            "horizon-family": lambda document: document["diagnostics"][
                "componentHorizonCoverage"
            ].update(wind="x"),
            "horizon-count": lambda document: document["diagnostics"][
                "componentHorizonCoverage"
            ]["wind"].update(zonesWith96Hours="x"),
            "zone-count": lambda document: document["diagnostics"].update(zoneCount="x"),
            "inventory": lambda document: document["diagnostics"].update(
                persistentFieldInventory="x"
            ),
            "retention": lambda document: document.update(privateReplayRetentionHours="x"),
        }
        for label, poison in poisons.items():
            with self.subTest(label=label), tempfile.TemporaryDirectory() as directory:
                output = Path(directory) / "candidate.json"
                fallback = Path(directory) / "active.json"
                candidate = valid_document()
                poison(candidate)
                active = valid_document()
                candidate_bytes = json.dumps(candidate, sort_keys=True).encode("utf-8")
                output.write_bytes(candidate_bytes)
                fallback.write_text(json.dumps(active), "utf-8")
                with (
                    patch.object(producer, "OUTPUT_PATH", output),
                    patch.object(producer, "DEPLOYED_FALLBACK_PATH", fallback),
                    patch.object(
                        producer, "_strict_current_donor_ready", return_value=True,
                    ),
                ):
                    recovered = producer.load_previous(
                        "synthetic-signature",
                        coastal_part_targets=[],
                        production_reference=Mock(),
                    )
                self.assertEqual(recovered, active)
                quarantines = list(Path(directory).glob("candidate.json.invalid-*"))
                self.assertEqual(len(quarantines), 1)
                self.assertEqual(quarantines[0].read_bytes(), candidate_bytes)

    def test_quarantined_candidate_without_strict_ready_active_stops(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            output = Path(directory) / "candidate.json"
            fallback = Path(directory) / "active.json"
            output.write_text(json.dumps({"zones": "broken"}), "utf-8")
            fallback.write_text(json.dumps({
                "schemaVersion": 2,
                "zoneRegistrySignature": "synthetic-signature",
                "zones": {PUBLIC_ID: {"hourly": {}, "gridPoints": {}, "collections": {}}},
                "diagnostics": {},
            }), "utf-8")
            with (
                patch.object(producer, "OUTPUT_PATH", output),
                patch.object(producer, "DEPLOYED_FALLBACK_PATH", fallback),
                patch.object(
                    producer, "_strict_current_donor_ready", return_value=False,
                ),
                self.assertRaisesRegex(RuntimeError, "strict READY active recovery donor"),
            ):
                producer.load_previous(
                    "synthetic-signature",
                    coastal_part_targets=[],
                    production_reference=Mock(),
                )
            self.assertFalse(output.exists())
            self.assertEqual(len(list(Path(directory).glob("candidate.json.invalid-*"))), 1)

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
            persisted = producer.load_bulk_document(output)
            self.assertEqual(serialized.count("\n"), 1)
            self.assertFalse(output.with_suffix(".json.tmp").exists())
            self.assertEqual(persisted["refreshStatus"], "partial")
            self.assertEqual(persisted["diagnostics"]["sentinel"], "unchanged")
            self.assertEqual(
                persisted["diagnostics"]["progressCheckpoint"],
                {"schemaVersion": 1, "validation": "pending-finalization"},
            )

            with patch.object(producer, "OUTPUT_PATH", output):
                logical = {"zones": {}, "outer": {"inner": 1}}
                raw_bytes = producer.atomic_write_bulk_cache(logical)
            self.assertEqual(producer.load_bulk_document(output), logical)
            self.assertEqual(raw_bytes, output.stat().st_size)

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

    def test_checkpoint_prepare_seals_before_write_and_failure_preserves_last(
        self,
    ) -> None:
        result = {"diagnostics": {}, "zones": {}}
        with tempfile.TemporaryDirectory() as directory:
            output = Path(directory) / "checkpoint.json"
            with (
                patch.object(producer, "OUTPUT_PATH", output),
                patch.object(producer, "CHECKPOINT_MAX_ASSETS", 1),
                patch.object(producer, "CHECKPOINT_MAX_SECONDS", 10_000),
            ):
                def seal() -> None:
                    result["diagnostics"]["sealed"] = True

                controller = producer.ProgressCheckpointController(
                    result,
                    set(),
                    {"bytes": 0},
                    prepare_bulk_checkpoint=seal,
                )
                self.assertTrue(controller.note_committed_asset(seconds=1.0))
                persisted = output.read_bytes()
                self.assertTrue(
                    producer.load_bulk_document(output)["diagnostics"]["sealed"]
                )

                failing = producer.ProgressCheckpointController(
                    result,
                    set(),
                    {"bytes": 0},
                    prepare_bulk_checkpoint=lambda: (_ for _ in ()).throw(
                        ValueError("synthetic ledger invalid")
                    ),
                )
                failing.mark_bulk_dirty()
                with self.assertRaisesRegex(ValueError, "ledger invalid"):
                    failing.flush_if_due(force=True)
                self.assertEqual(output.read_bytes(), persisted)
                self.assertTrue(failing.bulk_dirty)

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
                persisted_resume = producer.load_bulk_document(output)

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

        def record_cache(document, *, path=None):
            calls.append(("cache", path))
            self.assertNotIn("progressCheckpoint", document["diagnostics"])
            return 123

        def record_telemetry(raw_bytes):
            calls.append(("telemetry", raw_bytes))

        def record_diagnostics(document):
            calls.append(("diagnostics", document["refreshStatus"]))

        with (
            patch.object(producer, "atomic_write_bulk_cache", side_effect=record_cache),
            patch.object(
                producer,
                "write_final_cache_size_telemetry",
                side_effect=record_telemetry,
            ),
            patch.object(producer, "write_ocean_diagnostics", side_effect=record_diagnostics),
        ):
            raw_bytes = producer.write_finalized_cache(result, "ok")

        self.assertEqual(
            calls,
            [("cache", None), ("telemetry", 123), ("diagnostics", "ok")],
        )
        self.assertEqual(raw_bytes, 123)

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
            self.assertEqual(producer.load_bulk_document(active), document)
            self.assertEqual(
                len(producer.load_bulk_document(active)["zones"]["PART::example"]["hourly"]),
                1,
            )
            self.assertFalse(active.with_name(active.name + ".tmp").exists())
            sticky.assert_called_once_with("candidate_promoted", "true")


class CurrentLedgerCheckpointTests(unittest.TestCase):
    def test_one_validated_result_is_consumed_without_another_attestation(self):
        document = {"zones": {}, "diagnostics": {}}
        ledger = {"ready": False, "failureCodes": ["LOCALLY_SKIPPED_DKSS_ASSET"]}
        full_attestation = {"sentinel": "same-input-full-attestation"}
        summary = {"verifiedPairCount": 1}
        sealed = producer.CurrentOperationalLedgerResult(
            ledger, full_attestation, True,
        )
        with (
            patch.object(producer, "build_current_operational_ledger_result", return_value=sealed) as build,
            patch.object(producer, "current_operational_attestation") as reattest,
            patch.object(producer, "validate_current_operational_availability_ledger") as revalidate,
            patch.object(producer, "sanitized_current_attestation", return_value=summary) as sanitize,
        ):
            producer.seal_current_operational_checkpoint(
                document, [], MODEL_RUN, {}, [],
            )
        build.assert_called_once_with(document, [], MODEL_RUN, {}, [])
        reattest.assert_not_called()
        revalidate.assert_not_called()
        sanitize.assert_called_once_with(full_attestation)
        self.assertIs(document["diagnostics"]["currentOperationalLedger"], ledger)
        self.assertIs(document["diagnostics"]["currentOperationalAttestation"], summary)

    def test_invalid_result_cannot_replace_the_previous_checkpoint_evidence(self):
        document = {"zones": {}, "diagnostics": {"sentinel": "preserve"}}
        before = copy.deepcopy(document)
        invalid = producer.CurrentOperationalLedgerResult({}, {}, False)
        with patch.object(producer, "build_current_operational_ledger_result", return_value=invalid):
            with self.assertRaisesRegex(ValueError, "ledger validation failed"):
                producer.seal_current_operational_checkpoint(
                    document, [], MODEL_RUN, {}, [],
                )
        self.assertEqual(document, before)


if __name__ == "__main__":
    unittest.main()
