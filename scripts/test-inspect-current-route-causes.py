"""Synthetic diagnostic-only checks. No provider, cache or deployment writes."""
import ast
import argparse
import copy
from datetime import datetime, timezone
import importlib.util
import json
from pathlib import Path
import sys
import unittest

import yaml

sys.dont_write_bytecode = True
ROOT = Path(__file__).resolve().parents[1]
parser = argparse.ArgumentParser()
parser.add_argument("--source", required=True, type=Path)
args, remainder = parser.parse_known_args()
sys.argv = [sys.argv[0], *remainder]
RUNTIME_ROOT = args.source.resolve()
sys.path.insert(0, str(RUNTIME_ROOT / "scripts"))
from inspect_current_route_causes import residual_shape, dmi_routes, cp_domain_routes, om_routes, regional_routes
from lib.open_meteo_current_fallback import build_record, build_document, merge_donor_bank
from lib.copernicus_current import canonical_sha256
from lib.dmi_native_provenance import MARINE_COLLECTIONS

migration_spec = importlib.util.spec_from_file_location(
    "regional_migration_diagnostic",
    ROOT / "scripts/inspect-regional-migration-20260911.py",
)
assert migration_spec and migration_spec.loader
migration_diagnostic = importlib.util.module_from_spec(migration_spec)
migration_spec.loader.exec_module(migration_diagnostic)

AT = "2026-09-11T10:00:00Z"


def bank_fixture():
    targets = [{"partId": "SYNTHETIC", "parentZoneId": "SYNTHETIC-PARENT", "waterPoint": [10.12345674, 55.0]}]
    record = build_record(part_id="SYNTHETIC", valid_time=AT, acquired_at=AT,
                          sampling_point=targets[0]["waterPoint"], grid_point=targets[0]["waterPoint"],
                          speed_mps=0.4, toward_direction_deg=90,
                          source_response_sha256=canonical_sha256({"synthetic": True}))
    document = build_document(targets=targets, required_pairs=[{"partId": "SYNTHETIC", "validTime": AT}],
                              records=[record], production_reference_at=AT, checkpointed_at=AT,
                              copernicus_source_stage_status="READY",
                              copernicus_source_stage_sha256=canonical_sha256({"stage": True}),
                              copernicus_bounded_progress_accepted=False,
                              regional_evidence_sha256=canonical_sha256({"regional": True}))
    bank, _ = merge_donor_bank(None, [document], targets=targets, production_reference_at=AT, checkpointed_at=AT)
    return bank, targets


class DiagnosticTests(unittest.TestCase):
    def test_shape_conserves_residual(self):
        rows = {("SYNTHETIC", AT), ("SYNTHETIC", "2026-09-11T16:00:00Z")}
        shape = residual_shape(rows, datetime(2026, 9, 11, 10, tzinfo=timezone.utc))
        self.assertEqual(sum(shape["missingPairOffsetBands"].values()), 2)
        self.assertEqual(shape["missingHoursPerPartHistogram"], {2: 1})

    def test_dmi_partition(self):
        ledger = {"collections": [{"collection": name, "validTimes": [{"validTime": AT,
                  "state": "PROCESSED", "partOutcomeProof": {"spatialUnavailablePartIds": ["SYNTHETIC"]}}]}
                  for name in sorted(MARINE_COLLECTIONS)]}
        result = dmi_routes(ledger, {("SYNTHETIC", AT)})
        self.assertEqual(len(result["families"]), 3)
        self.assertEqual(sum(result["jointOutcomeCounts"].values()), 1)

    def test_cp_rectangle_is_not_wet_coverage_authority(self):
        targets = [{"partId": f"SYNTHETIC-{n}", "parentZoneId": "SYNTHETIC-PARENT", "waterPoint": [lon, 55.0]}
                   for n, lon in enumerate((8.0, 12.0, 15.0))]
        result = cp_domain_routes(targets, {(row["partId"], AT) for row in targets})
        self.assertFalse(result["productionAuthority"])
        self.assertTrue(result["rectangleDoesNotProveWetCellCoverage"])
        self.assertEqual(result["products"][1]["residualPairsCodeExcludedInsideRectangle"], 1)

    def test_om_precision_is_only_sensitivity_and_preserves_input(self):
        bank, targets = bank_fixture()
        original = copy.deepcopy(bank)
        good = om_routes(bank, targets, {("SYNTHETIC", AT)})
        self.assertEqual(good["acceptedEntryCount"], 1)
        rounded = copy.deepcopy(targets)
        rounded[0]["waterPoint"][0] = round(rounded[0]["waterPoint"][0], 7)
        result = om_routes(bank, rounded, {("SYNTHETIC", AT)})
        self.assertFalse(result["productionAuthority"])
        self.assertEqual(result["droppedEntryCount"], 1)
        self.assertEqual(result["recordCounters"]["rejectionExplainedOnlyBySubSevenDecimalPointCount"], 1)
        self.assertEqual(bank, original)

    def test_om_duplicate_payload_not_counted_accepted(self):
        bank, targets = bank_fixture()
        bank["entries"].append(copy.deepcopy(bank["entries"][0]))
        result = om_routes(bank, targets, {("SYNTHETIC", AT)})
        self.assertEqual(result["acceptedEntryCount"], 0)
        self.assertEqual(result["recordCounters"]["missingOrDuplicateOriginalPayloadCount"], 1)
        self.assertNotIn("acceptedAgainstDmiReconstructedPointCount", result["recordCounters"])

    def test_regional_classifier_smoke_not_ledger_admission_proof(self):
        spec = importlib.util.spec_from_file_location("regional_fixture", RUNTIME_ROOT / "scripts/test-regional-current-operational.py")
        module = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(module)
        bundle = module.fixture()
        missing = {(row["partId"], row["validTime"]) for row in bundle["dmi_gap_pairs"]}
        result = regional_routes(bundle["dmi_ledger"], bundle["current_shadow"], bundle["policy"], bundle["targets"], missing)
        self.assertFalse(result["productionAuthority"])
        self.assertEqual(result["lostPairsInCounterfactual"], 0)
        self.assertEqual(result["additionalPairsFromRetainedRegionalOutcome"], 0)
        self.assertGreater(result["baselineClassifierCoveredInResidual"], 0)

    def test_post_migration_cp_sparsity_is_aggregate_and_conservative(self):
        targets = [
            {"partId": "PRIVATE-A", "parentZoneId": "PRIVATE", "waterPoint": [9.2, 55.0]},
            {"partId": "PRIVATE-B", "parentZoneId": "PRIVATE", "waterPoint": [9.21, 55.01]},
        ]
        missing = {
            ("PRIVATE-A", "2026-09-11T10:00:00Z"),
            ("PRIVATE-A", "2026-09-11T11:00:00Z"),
            ("PRIVATE-A", "2026-09-11T14:00:00Z"),
            ("PRIVATE-B", "2026-09-11T14:00:00Z"),
        }
        result = migration_diagnostic.copernicus_sparse_request_summary(missing, targets)
        self.assertFalse(result["productionAuthority"])
        self.assertFalse(result["admissionOrRequestOrderChanged"])
        self.assertFalse(result["physicalGridCellOrByteWasteMeasured"])
        self.assertEqual(len(result["products"]), 2)
        for product in result["products"]:
            self.assertEqual(product["configuredEligibleTargetCount"], 2)
            self.assertEqual(product["configuredStableShardCount"], 1)
            self.assertEqual(product["affectedTargetCount"], 2)
            self.assertEqual(product["affectedShardCount"], 1)
            self.assertEqual(product["exactPairCount"], 4)
            self.assertEqual(product["uniqueNativeHourCountAcrossSource"], 3)
            self.assertEqual(product["nativeEnvelopeHourCountTotal"], 5)
            self.assertEqual(product["emptyNativeEnvelopeHourCountTotal"], 2)
            self.assertEqual(product["largestEmptyNativeGapHours"], 2)
            self.assertEqual(product["connectedNativeTimeComponentCountTotal"], 2)
            self.assertEqual(product["logicalEnvelopeTargetHourCellCount"], 10)
            self.assertEqual(product["logicalUnusedTargetHourCellCount"], 6)
            self.assertEqual(product["logicalUnusedTargetHourCellRatio"], 0.6)
            self.assertEqual(
                product["perAffectedShardHistograms"]["exactPairCount"],
                {"4": 1},
            )
        serialized = json.dumps(result, sort_keys=True)
        self.assertNotIn("PRIVATE-A", serialized)
        self.assertNotIn("PRIVATE-B", serialized)
        self.assertNotIn("9.2", serialized)

    def test_post_migration_cp_sparsity_rejects_non_hour_pair(self):
        targets = [
            {"partId": "PRIVATE", "parentZoneId": "PRIVATE", "waterPoint": [9.2, 55.0]},
        ]
        with self.assertRaisesRegex(ValueError, "exact UTC hour"):
            migration_diagnostic.copernicus_sparse_request_summary(
                {("PRIVATE", "2026-09-11T10:30:00Z")},
                targets,
            )

    def test_workflow_is_exact_read_only_single_generation(self):
        path = ROOT / ".github/workflows/validate-copernicus-current-pilot.yml"
        workflow = yaml.load(path.read_text(encoding="utf-8"), Loader=yaml.BaseLoader)
        self.assertEqual(set(workflow["on"]), {"workflow_dispatch"})
        self.assertTrue(all(value == "read" for value in workflow["permissions"].values()))
        steps = workflow["jobs"]["inspect"]["steps"]
        for step in steps:
            self.assertNotIn("continue-on-error", step)
            if "uses" in step:
                self.assertIn(step["uses"], {"actions/checkout@v7", "actions/setup-python@v7", "actions/cache/restore@v6"})
                self.assertNotIn("restore-keys", step.get("with", {}))
        runs = [s["run"] for s in steps if s.get("run", "").startswith("python -B scripts/inspect-")]
        self.assertEqual(runs, [
            "python -B scripts/inspect-current-residual-20260911.py --source runtime-source --cache .diagnostic/34588002366 --target 2026-09-11T10:00:00Z --generation 34588002366 --route-causes",
            "python -B scripts/inspect-regional-migration-20260911.py --source candidate-runtime --cache .diagnostic/34588002366",
        ])
        source_checkouts = [s for s in steps if s.get("uses") == "actions/checkout@v7" and s.get("with", {}).get("path")]
        self.assertEqual({s["with"]["path"] for s in source_checkouts}, {"runtime-source", "candidate-runtime"})
        self.assertTrue(all(s["with"]["ref"] == "5587001b45ffea056addaf6cd20084719540336a" for s in source_checkouts))
        apply_steps = [s["run"] for s in steps if "git -C candidate-runtime apply" in s.get("run", "")]
        self.assertEqual(len(apply_steps), 1)
        self.assertIn("git -C candidate-runtime apply --check ../diagnostic-regional-candidate.patch", apply_steps[0])
        self.assertIn("git -C candidate-runtime apply ../diagnostic-regional-candidate.patch", apply_steps[0])
        self.assertNotIn("secrets.", path.read_text(encoding="utf-8"))
        for script in ("inspect-current-residual-20260911.py", "inspect_current_route_causes.py", "inspect-regional-migration-20260911.py"):
            ast.parse((ROOT / "scripts" / script).read_text(encoding="utf-8"))


if __name__ == "__main__":
    unittest.main()
