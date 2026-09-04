"""Small synthetic checks for privacy-safe failure diagnostics; no live files."""
import contextlib
import copy
import importlib.util
import io
import json
from pathlib import Path
import unittest
from unittest.mock import patch

spec = importlib.util.spec_from_file_location(
    "closure_cli", Path(__file__).with_name("build-current-operational-closure.py"),
)
cli = importlib.util.module_from_spec(spec)
spec.loader.exec_module(cli)
REFERENCE = "2026-09-04T15:00:00Z"
TAIL = "2026-09-09T12:00:00Z"


class DiagnosticTests(unittest.TestCase):
    def setUp(self):
        self.rows = [
            {"partId": "fixture-regional-0", "validTime": REFERENCE},
            {"partId": "fixture-feggesund", "validTime": TAIL},
            {"partId": "fixture-other", "validTime": TAIL},
        ]
        self.inputs = {
            "ledger": {"productionReferenceAt": REFERENCE,
                       "operationalComplementPairs": self.rows,
                       "upstreamAbsencePairs": self.rows[1:],
                       "spatialUnavailablePairs": self.rows[:1]},
            "source_stage": {"status": "READY", "productionReferenceAt": REFERENCE,
                             "missingPairs": self.rows},
            "policy": {"parts": [{"partId": f"fixture-regional-{n}"} for n in range(8)]},
            "targets": [{"partId": row["partId"],
                         "parentZoneId": "B05-11" if n == 1 else "fixture-zone",
                         "privateTestSentinel": "NEVER_EMIT_THIS"}
                        for n, row in enumerate(self.rows)],
            "reference": REFERENCE,
        }

    def test_exact_aggregate_and_privacy(self):
        report = cli.residual_diagnostic(**self.inputs)
        self.assertEqual(report["missingPairCount"], 3)
        first, tail = report["byForecastOffset"]
        self.assertEqual((first["forecastOffsetHours"], first["regionalPolicyPairCount"],
                          first["dmiSpatialUnavailablePairCount"]), (0, 1, 1))
        self.assertEqual((tail["forecastOffsetHours"], tail["outsideRegionalPolicyPairCount"],
                          tail["dmiUpstreamAbsentPairCount"], tail["feggesundPairCount"]), (117, 2, 2, 1))
        text = json.dumps(report)
        for forbidden in ["fixture-", "B05-11", "NEVER_EMIT_THIS", "validTime", "waterPoint", "uMps", "vMps"]:
            self.assertNotIn(forbidden, text)
        self.assertNotIn("READY", text)

    def test_invalid_or_stale_rows_rejected(self):
        for mutate in [
            lambda x: x["source_stage"].update(productionReferenceAt=TAIL),
            lambda x: x["source_stage"].update(status="IN_PROGRESS"),
            lambda x: x["source_stage"]["missingPairs"].append(x["source_stage"]["missingPairs"][0]),
            lambda x: x["source_stage"]["missingPairs"][0].update(validTime="2026-09-04T15:01:00Z"),
            lambda x: x["source_stage"]["missingPairs"][0].update(partId="unknown-part"),
            lambda x: x["policy"]["parts"].pop(),
        ]:
            values = copy.deepcopy(self.inputs)
            mutate(values)
            with self.assertRaises((RuntimeError, ValueError)):
                cli.residual_diagnostic(**values)

    def test_failure_stays_failure_with_or_without_diagnostic(self):
        class Failure(Exception):
            code = "DMI_GAP_NOT_FALLBACK_ELIGIBLE"
        kwargs = dict(dmi_ledger=self.inputs["ledger"],
                      copernicus_source_stage=self.inputs["source_stage"],
                      regional_policy=self.inputs["policy"], targets=self.inputs["targets"],
                      locked_reference=REFERENCE)
        for damaged in [False, True]:
            if damaged:
                kwargs["copernicus_source_stage"] = None
            output = io.StringIO()
            with patch.object(cli, "build_current_operational_closure", side_effect=Failure()), contextlib.redirect_stdout(output):
                with self.assertRaises(Failure):
                    cli.build_with_residual_diagnostic(**kwargs)
            self.assertIn("UNAVAILABLE" if damaged else "CURRENT_RESIDUAL_DIAGNOSTIC_ONLY", output.getvalue())
            self.assertNotIn("fixture-", output.getvalue())

    def test_success_and_unrelated_failure_unchanged(self):
        output = io.StringIO()
        proof = object()
        with patch.object(cli, "build_current_operational_closure", return_value=proof), contextlib.redirect_stdout(output):
            self.assertIs(cli.build_with_residual_diagnostic(), proof)
        with patch.object(cli, "build_current_operational_closure", side_effect=RuntimeError("private-sentinel")), contextlib.redirect_stdout(output):
            with self.assertRaises(RuntimeError):
                cli.build_with_residual_diagnostic()
        self.assertEqual(output.getvalue(), "")

    def test_error_text_cannot_leak_payload(self):
        self.assertEqual(cli.safe_error_code(RuntimeError("DMI_LEDGER_MISSING")), "DMI_LEDGER_MISSING")
        for message in ["private-sentinel", "SECRET\nPASSWORD", "A" * 81]:
            self.assertEqual(cli.safe_error_code(RuntimeError(message)), "UNEXPECTED_CLOSURE_ERROR")


if __name__ == "__main__":
    unittest.main()
