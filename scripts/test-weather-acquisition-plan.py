#!/usr/bin/env python3
"""Synthetic exact-window planning contracts. No network or production data."""
from __future__ import annotations

import copy
from datetime import datetime, timedelta, timezone
import json
from pathlib import Path
import runpy
import tempfile
from types import SimpleNamespace
import unittest
from unittest.mock import Mock, patch

from lib.weather_acquisition_plan import (
    CurrentAcquisitionPlanError, build_current_acquisition_plan, exact_hour,
    read_current_acquisition_plan, validate_current_acquisition_plan,
)

BASE = datetime(2026, 9, 9, 18, tzinfo=timezone.utc)
TARGETS = [{"partId": "P1", "parentZoneId": "Z1", "waterPoint": [10.0, 55.0]},
           {"partId": "P2", "parentZoneId": "Z1", "waterPoint": [10.1, 55.0]}]
HASHES = {"synthetic-donor": "sha256:" + "a" * 64}
BUILDER = runpy.run_path(str(Path(__file__).with_name("build-weather-acquisition-plan.py")))


def at(offset=0):
    return (BASE + timedelta(hours=offset)).strftime("%Y-%m-%dT%H:00:00Z")


def plan(pairs=()):
    return build_current_acquisition_plan(
        targets=TARGETS, production_reference_at=at(), covered_pairs=pairs,
        source_input_hashes=HASHES,
    )


class AcquisitionPlanTests(unittest.TestCase):
    def test_union_covers_internal_and_tail_pairs_without_source_admission(self):
        keys = {("P1", at(0)), ("P2", at(19)), ("P1", at(117))}
        document = plan(keys)
        before = copy.deepcopy(document)
        self.assertEqual(validate_current_acquisition_plan(
            document, production_reference_at=at(), targets=TARGETS), keys)
        self.assertEqual(document["forecastHourCount"], 118)
        self.assertNotIn("records", document)
        self.assertNotIn("ready", document)
        self.assertEqual(document, before)

    def test_empty_advisory_coverage_is_valid_and_does_not_claim_completeness(self):
        self.assertEqual(validate_current_acquisition_plan(
            plan(), production_reference_at=at(), targets=TARGETS), set())

    def test_history_and_hour_118_are_not_operationally_covered(self):
        for offset in [-48, -1, 118]:
            with self.subTest(offset=offset), self.assertRaises(CurrentAcquisitionPlanError):
                plan([("P1", at(offset))])

    def test_hour_rollover_requires_a_fresh_exact_reference(self):
        document = plan([("P1", at(4))])
        with self.assertRaises(CurrentAcquisitionPlanError):
            validate_current_acquisition_plan(document, production_reference_at=at(1), targets=TARGETS)

    def test_changed_sampling_identity_invalidates_only_the_plan(self):
        changed = copy.deepcopy(TARGETS)
        changed[0]["waterPoint"][0] += 0.01
        document = plan([("P1", at(4))])
        before = copy.deepcopy(document)
        with self.assertRaises(CurrentAcquisitionPlanError):
            validate_current_acquisition_plan(document, production_reference_at=at(), targets=changed)
        self.assertEqual(document, before)

    def test_unknown_or_duplicate_pair_is_not_coverage(self):
        for pairs in [[("P3", at())], [("P1", at()), ("P1", at())]]:
            with self.subTest(pairs=pairs), self.assertRaises(CurrentAcquisitionPlanError):
                plan(pairs)

    def test_pair_time_must_be_exact_utc_not_a_rounded_or_shifted_label(self):
        for timestamp in ["2026-09-09T18:01:00Z", "2026-09-09T18:00:00",
                          "2026-09-09T20:00:00+02:00"]:
            with self.subTest(timestamp=timestamp), self.assertRaises(CurrentAcquisitionPlanError):
                plan([("P1", timestamp)])
        self.assertEqual(exact_hour("2026-09-09T20:00:00+02:00")[0], at())

    def test_binding_detects_changed_pairs_and_source_inputs(self):
        original = plan([("P1", at(4))])
        for field in ["coveredPairs", "sourceInputHashes", "bindingSha256"]:
            changed = copy.deepcopy(original)
            if field == "coveredPairs":
                changed[field][0]["validTime"] = at(5)
            elif field == "sourceInputHashes":
                changed[field]["synthetic-donor"] = "sha256:" + "b" * 64
            else:
                changed[field] = "sha256:" + "b" * 64
            with self.subTest(field=field), self.assertRaises(CurrentAcquisitionPlanError):
                validate_current_acquisition_plan(changed, production_reference_at=at(), targets=TARGETS)

    def test_no_unknown_contract_fields_or_boolean_schema(self):
        for field, value in [('ready', True), ('schemaVersion', True), ('forecastHourCount', True)]:
            changed = plan()
            changed[field] = value
            with self.subTest(field=field), self.assertRaises(CurrentAcquisitionPlanError):
                validate_current_acquisition_plan(changed, production_reference_at=at(), targets=TARGETS)

    def test_file_roundtrip_and_duplicate_json_fields(self):
        document = plan([("P1", at(4))])
        with tempfile.TemporaryDirectory() as directory:
            source = Path(directory) / "synthetic-plan.json"
            source.write_text(json.dumps(document), encoding="utf-8")
            self.assertEqual(read_current_acquisition_plan(
                source, production_reference_at=at(), targets=TARGETS), {("P1", at(4))})
            duplicate = json.dumps(document)[:-1] + ', "schemaVersion": 1}'
            source.write_text(duplicate, encoding="utf-8")
            with self.assertRaises(CurrentAcquisitionPlanError):
                read_current_acquisition_plan(source, production_reference_at=at(), targets=TARGETS)

    def test_reader_budget_and_missing_input_are_safe_failures(self):
        with tempfile.TemporaryDirectory() as directory:
            source = Path(directory) / "synthetic-plan.json"
            with self.assertRaises(CurrentAcquisitionPlanError):
                read_current_acquisition_plan(source, production_reference_at=at(), targets=TARGETS)
            source.write_text(json.dumps(plan()), encoding="utf-8")
            with patch("lib.weather_acquisition_plan.MAX_PLAN_BYTES", 16):
                with self.assertRaises(CurrentAcquisitionPlanError):
                    read_current_acquisition_plan(source, production_reference_at=at(), targets=TARGETS)


class AcquisitionBuilderBoundaryTests(unittest.TestCase):
    """Test orchestration only; donor cryptography has its own provider tests."""

    def build_with_sources(self, *, cp_error=False, om_error=False, dmi=False):
        args = SimpleNamespace(
            at=at(), targets=Path("synthetic-targets"),
            copernicus_bank=Path("synthetic-cp-bank"),
            copernicus_shadow=Path("synthetic-cp-shadow"),
            copernicus_stage=Path("synthetic-cp-stage"),
            open_meteo_bank=Path("synthetic-om-bank"),
            open_meteo_legacy=Path("synthetic-om-legacy"),
            dmi=Path("synthetic-dmi") if dmi else None,
            regional_shadow=Path("synthetic-regional"),
            regional_policy=Path("synthetic-policy"),
            output=Path("synthetic-plan"), report=Path("synthetic-report"),
        )
        ledger = {
            "productionReferenceAt": at(), "ready": False,
            "operationalComplementPairCount": 233,
            "upstreamAbsencePairCount": 100, "spatialUnavailablePairCount": 50,
        }
        native = [{"partId": "P1", "validTime": at()},
                  {"partId": "P2", "validTime": at(1)},
                  {"partId": "P1", "validTime": at(4)}]
        cp_loader = Mock(side_effect=ValueError("synthetic invalid bank")) if cp_error else Mock(return_value={})
        legacy_loader = Mock(side_effect=AssertionError("A present rejected bank must not revive legacy"))
        original_om = {"synthetic": "original-with-damaged-leaf"}
        repaired_om = {"synthetic": "manifest-recovered-healthy-pairs"}
        om_merger = (
            Mock(side_effect=ValueError("synthetic broken control manifest"))
            if om_error else Mock(return_value=(repaired_om, {}))
        )

        def select_repaired(bank, **kwargs):
            self.assertIs(bank, repaired_om, "Selection must use manifest-recovered bank")
            return [{"partId": "P2", "validTime": at(5)}]

        def optional_source(path):
            if path == args.open_meteo_legacy:
                raise AssertionError("Present OM bank must never revive unmasked legacy")
            return original_om if path == args.open_meteo_bank else None

        dmi_validator = Mock()
        writes = Mock()
        namespace = BUILDER["build"].__globals__
        with patch.dict(namespace, {
            "load_targets": lambda _: copy.deepcopy(TARGETS),
            "load_copernicus_donor_bank": cp_loader,
            "legacy_donor_bank": legacy_loader,
            "planning_covered_pairs": lambda *a, **k: {("P1", at(4))},
            "optional_json": optional_source,
            "merge_donor_bank": om_merger,
            "select_donor_records": select_repaired,
            "file_sha256": lambda _: HASHES["synthetic-donor"],
            "read_dmi_bulk_document": lambda _: {"diagnostics": {"currentOperationalLedger": ledger}},
            "current_attestation_authorization_from_operational_ledger": lambda _: ([], []),
            "canonical_verified_part_current_attestation": lambda *a: {"verifiedPairs": native},
            "validate_current_operational_availability_ledger": dmi_validator,
            "atomic_json": writes,
        }):
            document, report = BUILDER["build"](args)
        legacy_loader.assert_not_called()
        om_merger.assert_called_once()
        self.assertIs(om_merger.call_args.args[0], original_om)
        self.assertEqual(om_merger.call_args.args[1], [])
        self.assertEqual(om_merger.call_args.kwargs["production_reference_at"], at())
        return document, report, dmi_validator, writes

    def test_before_dmi_does_not_confuse_fallback_coverage_with_native_or_complete(self):
        document, report, validator, writes = self.build_with_sources()
        self.assertEqual(len(document["coveredPairs"]), 2)
        self.assertEqual(report["validatedFallbackPairCount"], 2)
        self.assertIsNone(report["validatedUnionPairCount"])
        self.assertIsNone(report["realMissingPairCount"])
        self.assertFalse(report["sourceAdmission"])
        self.assertFalse(report["releaseProof"])
        validator.assert_not_called()
        self.assertEqual(writes.call_count, 2)

    def test_invalid_optional_cp_does_not_stop_independent_om_or_revive_legacy(self):
        document, report, _, _ = self.build_with_sources(cp_error=True)
        self.assertEqual(document["coveredPairs"], [{"partId": "P2", "validTime": at(5)}])
        self.assertEqual(report["sources"]["copernicus"]["status"], "rejected-optional-donor")
        self.assertNotIn("copernicus-bank", document["sourceInputHashes"])
        self.assertEqual(report["sources"]["open-meteo"]["coveredPairCount"], 1)

    def test_after_dmi_reports_true_union_not_sum_or_dmi_own_residual(self):
        document, report, validator, _ = self.build_with_sources(dmi=True)
        validator.assert_called_once()
        self.assertEqual(report["requiredPairCount"], 236)
        self.assertEqual(report["sources"]["dmi"]["ownResidualPairCount"], 233)
        self.assertEqual(report["validatedFallbackPairCount"], 2)
        self.assertEqual(report["validatedUnionPairCount"], 4)
        self.assertEqual(report["realMissingPairCount"], 232)
        self.assertEqual(len(document["coveredPairs"]), 2, "Native DMI is not re-labelled as fallback")
        self.assertEqual(report["sources"]["regional"]["status"], "absent")

    def test_recoverable_om_bank_is_used_in_memory_without_rewriting_original(self):
        document, report, _, writes = self.build_with_sources()
        self.assertEqual(report["sources"]["open-meteo"]["coveredPairCount"], 1)
        self.assertEqual(document["sourceInputHashes"]["open-meteo-bank"], HASHES["synthetic-donor"])
        self.assertEqual([call.args[0] for call in writes.call_args_list],
                         [Path("synthetic-plan"), Path("synthetic-report")])

    def test_broken_om_manifest_does_not_revive_legacy_or_remove_cp_coverage(self):
        document, report, _, _ = self.build_with_sources(om_error=True)
        self.assertEqual(document["coveredPairs"], [{"partId": "P1", "validTime": at(4)}])
        self.assertEqual(report["sources"]["open-meteo"]["status"], "rejected-optional-donor")
        self.assertNotIn("open-meteo-bank", document["sourceInputHashes"])


if __name__ == "__main__":
    unittest.main()
