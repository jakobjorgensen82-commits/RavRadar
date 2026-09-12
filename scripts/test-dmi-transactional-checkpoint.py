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
    def test_regional_observation_is_state_bound_and_only_suppresses_regional_work(self) -> None:
        source = {
            "collection": "dkss_lf", "modelRun": MODEL_RUN, "validTime": MODEL_RUN,
            "itemId": "synthetic-lf-observation", "assetIdentitySha256": "a" * 64,
            "assetSizeBytes": 128, "acquiredAt": MODEL_RUN,
            "contentLengthBytes": 128, "contentSha256": "b" * 64,
            "itemCreatedAt": MODEL_RUN, "itemUpdatedAt": MODEL_RUN,
        }
        shadow = {"schemaVersion": 1, "retentionHours": 168,
                  "scoreImpact": False, "publicRuntime": False, "anchors": {}}
        arguments = {"processing_signature": "synthetic-parser",
                     "target_registry_sha256": "sha256:" + "c" * 64,
                     "policy": {"syntheticPolicy": 1}, "regional_part_ids": ["synthetic"]}
        receipt = producer.regional_asset_observation(shadow, source_asset=source, **arguments)
        self.assertIsNotNone(receipt)
        step = {"sourceAsset": source, "regionalObservation": receipt}
        self.assertTrue(producer.reusable_regional_asset_observation(step, shadow, **arguments))
        self.assertNotIn("anchors", receipt)
        self.assertNotIn("samples", receipt)
        changed_clock = {**shadow, "generatedAt": SECOND_TIME}
        self.assertTrue(producer.reusable_regional_asset_observation(step, changed_clock, **arguments))
        self.assertFalse(producer.reusable_regional_asset_observation(
            step, shadow, **{**arguments, "policy": {"syntheticPolicy": 2}},
        ))
        self.assertFalse(producer.reusable_regional_asset_observation(
            step, shadow, **{**arguments, "processing_signature": "new-decoder"},
        ))
        changed = copy.deepcopy(shadow)
        changed["anchors"]["REGIONAL_PROXY::synthetic"] = {"samples": []}
        self.assertFalse(producer.reusable_regional_asset_observation(step, changed, **arguments))
        changed_source = {**step, "sourceAsset": {**source, "contentSha256": "d" * 64}}
        self.assertFalse(producer.reusable_regional_asset_observation(changed_source, shadow, **arguments))
        populated = copy.deepcopy(shadow)
        sample = {"sourceAssetSha256": producer.current_source_asset_sha256(source),
                  "collection": "dkss_lf", "modelRun": MODEL_RUN, "validTime": MODEL_RUN,
                  "regionalSourceProofRef": "binding", "syntheticProfile": 1}
        populated["anchors"]["REGIONAL_PROXY::synthetic"] = {"samples": [sample]}
        populated["regionalSourceProofs"] = {
            "schemaVersion": 1, "contractId": "synthetic",
            "bindings": {"binding": {"sourceProofSha256": "proof", "syntheticBinding": 1}},
            "sources": {"proof": {"syntheticSourceProof": 1}},
        }
        populated_step = {"sourceAsset": source, "regionalObservation":
                          producer.regional_asset_observation(populated, source_asset=source, **arguments)}
        for mutation in ("sample", "binding", "source-proof", "removed-sample", "same-time-revision"):
            with self.subTest(mutation=mutation):
                altered = copy.deepcopy(populated)
                if mutation == "sample":
                    altered["anchors"]["REGIONAL_PROXY::synthetic"]["samples"][0]["syntheticProfile"] = 2
                elif mutation == "binding":
                    altered["regionalSourceProofs"]["bindings"]["binding"]["syntheticBinding"] = 2
                elif mutation == "source-proof":
                    altered["regionalSourceProofs"]["sources"]["proof"]["syntheticSourceProof"] = 2
                elif mutation == "removed-sample":
                    altered["anchors"]["REGIONAL_PROXY::synthetic"]["samples"] = []
                else:
                    altered["anchors"]["REGIONAL_PROXY::synthetic"]["samples"][0]["sourceAssetSha256"] = "sha256:" + "e" * 64
                self.assertFalse(producer.reusable_regional_asset_observation(
                    populated_step, altered, **arguments,
                ))
        regional_only = {"critical": True, "missingComponentKinds": ["current", "regionalCurrent"]}
        self.assertFalse(producer.should_skip_previously_processed_asset(
            MODEL_RUN, {MODEL_RUN}, regional_only,
        ))
        self.assertTrue(producer.should_skip_previously_processed_asset(
            MODEL_RUN, {MODEL_RUN}, regional_only, regional_observation_reusable=True,
        ))
        self.assertFalse(producer.should_skip_previously_processed_asset(
            MODEL_RUN, set(), regional_only, regional_observation_reusable=True,
        ), "A scheduler receipt cannot admit a non-reusable native step")
        self.assertFalse(producer.should_skip_previously_processed_asset(
            MODEL_RUN, {MODEL_RUN}, {"critical": True, "missingComponentKinds": ["waterLevel", "regionalCurrent"]},
            regional_observation_reusable=True,
        ), "A regional observation must not suppress a missing scalar component")

    def test_regional_replan_main_requires_actual_regional_change(self) -> None:
        import ast
        tree = ast.parse((SCRIPTS / "update-dmi-bulk.py").read_text(encoding="utf-8"))
        main = next(node for node in tree.body if isinstance(node, ast.FunctionDef) and node.name == "main")
        guarded = [node for node in ast.walk(main) if isinstance(node, ast.If)
                   and isinstance(node.test, ast.Name) and node.test.id == "regional_input_changed"]
        self.assertEqual(len(guarded), 1)
        self.assertTrue(any(isinstance(node, ast.Call) and isinstance(node.func, ast.Name)
                            and node.func.id == "planning_regional_covered_pairs"
                            for node in ast.walk(guarded[0])))
        finalizer = next(node for node in ast.walk(main) if isinstance(node, ast.FunctionDef)
                         and node.name == "preserve_operational_regional_source")
        called = [node.func.id for node in ast.walk(finalizer)
                  if isinstance(node, ast.Call) and isinstance(node.func, ast.Name)]
        self.assertEqual(called.count("regional_asset_observation"), 2)
        self.assertIn("capture_regional_source_proof", called)

    def test_native_phase_and_real_main_finalizer_limit_regional_work(self) -> None:
        import ast
        import textwrap
        # A model run may start on any UTC hour; cadence is relative to it.
        shifted_run = "2026-01-01T05:00:00Z"
        for valid, expected in (("2026-01-01T05:00:00Z", True),
                                ("2026-01-01T08:00:00Z", True),
                                ("2026-01-01T06:00:00Z", False),
                                ("2026-01-01T02:00:00Z", False),
                                ("2026-01-06T05:00:00Z", True),
                                ("2026-01-06T08:00:00Z", False)):
            self.assertEqual(producer.regional_lf_is_native_source_time(shifted_run, valid), expected)
        tree = ast.parse((SCRIPTS / "update-dmi-bulk.py").read_text(encoding="utf-8"))
        main = next(node for node in tree.body if isinstance(node, ast.FunctionDef) and node.name == "main")
        finalizer = next(node for node in ast.walk(main) if isinstance(node, ast.FunctionDef)
                         and node.name == "preserve_operational_regional_source")
        # Execute the actual nested production hook, including its nonlocal flag.
        wrapper = ("def exercise():\n    regional_input_changed = False\n"
                   + textwrap.indent(ast.unparse(finalizer), "    ")
                   + "\n    preserve_operational_regional_source(shadow_stage)\n"
                   + "    return regional_input_changed\n")
        for valid, after, invalid, expected_change, expected_receipt in (
                (FIRST_TIME, {"state": "same"}, 0, False, False),
                (MODEL_RUN, {"state": "same"}, 0, False, True),
                (MODEL_RUN, {"state": "changed"}, 0, True, True),
                (MODEL_RUN, {"state": "changed"}, 1, True, False)):
            with self.subTest(valid=valid, after=after, invalid=invalid):
                observation = Mock(side_effect=[{"state": "same"}, after])
                capture = Mock(return_value={"invalidSamples": invalid, "blockedIndex": 0})
                validated = {"partOutcomeProof": {"synthetic": "validated"}}
                namespace = {**producer.__dict__,
                             "collection": "dkss_lf", "regional_proxy_configuration_status": "CONFIGURED",
                             "asset_model_run": MODEL_RUN, "asset": {"valid": valid},
                             "step_source_asset": {}, "processing_signature": "synthetic-parser",
                             "current_target_registry_sha256": "synthetic-targets",
                             "regional_proxy_policy": {}, "regional_target_part_ids": ["synthetic"],
                             "current_shadow": {"synthetic": "old"}, "shadow_stage": {"synthetic": "new"},
                             "coastal_part_targets": [], "validated_current_stage": validated,
                             "regional_asset_observation": observation, "capture_regional_source_proof": capture}
                exec(compile(wrapper, "<production-regional-finalizer>", "exec"), namespace)
                self.assertEqual(namespace["exercise"](), expected_change)
                self.assertEqual("regionalObservation" in validated, expected_receipt)
                if valid == FIRST_TIME:
                    observation.assert_not_called()
                    capture.assert_not_called()
                else:
                    self.assertEqual(observation.call_count, 2)
                    capture.assert_called_once()
                    self.assertIs(capture.call_args.kwargs["previous_shadow"], namespace["current_shadow"])

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

    def test_regional_proof_finalize_failure_cannot_escape_shadow_stage(self) -> None:
        result, private, diagnostics, shadow, outcomes = durable_documents()
        shadow["regionalSourceProofs"] = {"sources": {"synthetic": {"version": 1}}}
        before = copy.deepcopy((result, private, diagnostics, shadow, outcomes))
        failure_flush = Mock()

        def finalize(staged_shadow):
            staged_shadow["regionalSourceProofs"]["sources"]["synthetic"]["version"] = 2
            self.assertEqual(shadow, before[3])
            raise RuntimeError("synthetic regional proof failure")

        with patch.object(producer, "process_grib", side_effect=mutate_stages):
            with self.assertRaisesRegex(RuntimeError, "synthetic regional proof failure"):
                producer.process_grib_transactionally(
                    Path("synthetic.grib"), COLLECTION, MODEL_RUN, FIRST_TIME,
                    zones(), result, diagnostics, shadow, private, outcomes,
                    finalize_shadow_stage=finalize, failure_flush=failure_flush,
                )
        self.assertEqual((result, private, diagnostics, shadow, outcomes), before)
        failure_flush.assert_called_once_with()

    def test_regional_proof_finalize_runs_after_both_validators_before_commit(self) -> None:
        result, private, diagnostics, shadow, outcomes = durable_documents()
        shadow["regionalSourceProofs"] = {"sources": {"synthetic": {"version": 1}}}
        before_shadow = copy.deepcopy(shadow)
        order = []

        def validate_wave(*_args):
            order.append("wave")
            return True

        def validate_current(*_args):
            order.append("current")
            return True

        def finalize(staged_shadow):
            self.assertEqual(order, ["wave", "current"])
            self.assertEqual(shadow, before_shadow)
            staged_shadow["regionalSourceProofs"]["sources"]["synthetic"]["version"] = 2
            order.append("regional-proof")

        with patch.object(producer, "process_grib", side_effect=mutate_stages):
            producer.process_grib_transactionally(
                Path("synthetic.grib"), COLLECTION, MODEL_RUN, FIRST_TIME,
                zones(), result, diagnostics, shadow, private, outcomes,
                stage_validator=validate_wave, current_stage_validator=validate_current,
                finalize_shadow_stage=finalize,
            )
        self.assertEqual(order, ["wave", "current", "regional-proof"])
        self.assertEqual(shadow["regionalSourceProofs"]["sources"]["synthetic"]["version"], 2)

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

    def test_locked_reference_passes_unchanged_to_asset_parser(self) -> None:
        result, private, diagnostics, shadow, outcomes = durable_documents()
        def parse(*args, **kwargs):
            self.assertEqual(kwargs.pop("locked_operational_reference"), MODEL_RUN)
            return mutate_stages(*args, **kwargs)
        with patch.object(producer, "process_grib", side_effect=parse):
            producer.process_grib_transactionally(
                Path("synthetic.grib"), COLLECTION, MODEL_RUN, FIRST_TIME,
                zones(), result, diagnostics, shadow, private, outcomes,
                locked_operational_reference=MODEL_RUN,
            )

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
    def test_migration_shadow_is_durable_before_recovery_bulk_write(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            shadow_path = Path(directory) / "regional-shadow.json"
            shadow = {"schemaVersion": 1, "anchors": {},
                      "regionalSourceProofs": {"synthetic": "original-proof"}}
            previous = {"schemaVersion": 2, "zones": {}}
            pending = {"pending": True}
            def write_bulk(value):
                self.assertEqual(value, previous)
                self.assertEqual(json.loads(shadow_path.read_text("utf-8")), shadow)
            with patch.object(producer, "CURRENT_FIELD_SHADOW_PATH", shadow_path), \
                 patch.object(producer, "atomic_write_bulk_cache", side_effect=write_bulk) as bulk:
                producer.persist_regional_shadow_before_recovery(shadow, previous, pending)
                bulk.assert_called_once_with(previous)
            self.assertEqual(pending, {})

    def test_failed_migration_shadow_save_preserves_original_bulk_proof(self) -> None:
        pending = {"pending": True}
        with patch.object(producer, "save_current_field_shadow", side_effect=OSError("synthetic save failure")), \
             patch.object(producer, "atomic_write_bulk_cache") as bulk:
            with self.assertRaisesRegex(OSError, "synthetic save failure"):
                producer.persist_regional_shadow_before_recovery({}, {}, pending)
            bulk.assert_not_called()
        self.assertEqual(pending, {"pending": True})

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

    def test_oneoff_finalized_incomplete_exit_is_opt_in_and_not_finalize_only(self) -> None:
        for protocol, finalize_only, expected in [
            (False, False, 2),
            (True, True, 2),
            (True, False, producer.ONEOFF_FINALIZED_INCOMPLETE_EXIT_CODE),
        ]:
            with (
                patch.object(producer, "ONEOFF_CONTINUATION_PROTOCOL", protocol),
                patch.object(producer, "FINALIZE_ONLY", finalize_only),
            ):
                self.assertEqual(producer.producer_process_exit_code(
                    producer_success_is_blocked=True,
                    producer_productive=True,
                ), expected)
        with patch.object(producer, "ONEOFF_CONTINUATION_PROTOCOL", True):
            self.assertEqual(producer.producer_process_exit_code(
                producer_success_is_blocked=False,
                producer_productive=True,
            ), 0)
            self.assertEqual(producer.producer_process_exit_code(
                producer_success_is_blocked=False,
                producer_productive=False,
            ), 2)

    def test_per_invocation_asset_counter_ignores_historical_runs(self) -> None:
        result = {
            "runs": {COLLECTION: {"assetsProcessed": 999}},
            "diagnostics": {"assetsProcessedThisInvocation": 0},
        }
        producer.note_asset_processed_this_invocation(result)
        self.assertEqual(
            result["diagnostics"]["assetsProcessedThisInvocation"],
            1,
        )
        self.assertEqual(result["runs"][COLLECTION]["assetsProcessed"], 999)

    def test_post_cache_diagnostics_exception_is_not_a_finalized_write(self) -> None:
        result = {"diagnostics": {}, "refreshStatus": "partial"}
        calls: list[str] = []
        with (
            patch.object(
                producer,
                "atomic_write_bulk_cache",
                side_effect=lambda *_args, **_kwargs: calls.append("cache") or 123,
            ),
            patch.object(
                producer,
                "write_final_cache_size_telemetry",
                side_effect=lambda *_args: calls.append("telemetry"),
            ),
            patch.object(
                producer,
                "write_ocean_diagnostics",
                side_effect=OSError("synthetic post-cache diagnostics failure"),
            ),
            self.assertRaisesRegex(OSError, "synthetic post-cache diagnostics failure"),
        ):
            producer.write_finalized_cache(result, "failed")
        self.assertEqual(calls, ["cache", "telemetry"])

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
