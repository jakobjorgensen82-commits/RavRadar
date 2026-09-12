"""Synthetic one-off continuation tests; no production files or network."""
import importlib.util
import contextlib
import io
from pathlib import Path
import tempfile
from types import SimpleNamespace
import unittest
from unittest.mock import MagicMock, patch

from lib.dmi_bulk_storage import write_dmi_bulk_document

spec = importlib.util.spec_from_file_location("oneoff", Path(__file__).with_name("run-dmi-oneoff-fill.py"))
oneoff = importlib.util.module_from_spec(spec)
spec.loader.exec_module(oneoff)
REFERENCE = "2026-09-04T17:00:00Z"
ENV = {"DMI_BULK_MAX_DOWNLOAD_MB": "4096", "DMI_BULK_RAW_CACHE_MAX_MB": "4096",
       "DMI_BULK_MAX_RUNTIME_SECONDS": "3000", "DMI_BULK_FINALIZE_RESERVE_SECONDS": "180",
       "RAVRADAR_PRODUCTION_TARGET_HOUR": REFERENCE, "SYNTHETIC_SECRET": "never-print"}


class FillTests(unittest.TestCase):
    def fixture(self, *, ready=True, verified_pairs=118, runtime_limited=False):
        ledger_codes = [] if ready else ["LOCALLY_SKIPPED_DKSS_ASSET"]
        errors = [{
            "collection": "harmonie_dini_sf",
            "message": "DMI bulk download budget would be exceeded",
            "failureCode": "RUNTIME_BUDGET_REACHED",
            "partialProgressPreserved": True,
        }]
        attempted = ["harmonie_dini_sf"]
        runs = {"harmonie_dini_sf": {"assetsProcessed": 6}}
        if runtime_limited:
            errors = [
                {"collection": "dkss_lf", "message": "bulk runtime budget reached",
                 "failureCode": "RUNTIME_BUDGET_REACHED", "partialProgressPreserved": True},
                {"collection": "dmi-current-ledger-gate",
                 "message": "current ledger incomplete", "failureCodes": ledger_codes},
            ]
            attempted = ["dkss_lf"]
            runs = {"dkss_lf": {"assetsProcessed": 6}}
        return {"diagnostics": {
            "currentOperationalLedger": {
                "productionReferenceAt": REFERENCE, "ready": ready,
                "failureCodes": ledger_codes, "targetCount": 1, "hourCount": 118,
                "attestation": {"verifiedPairCount": verified_pairs},
            },
            "errors": errors,
            "collectionsAttempted": attempted,
            "assetsProcessedThisInvocation": 6,
            "rawCache": {"maxBytes": 4 * oneoff.GIB, "after": {"bytes": 4 * oneoff.GIB}},
        }, "zones": {}, "runs": runs, "privateFixture": "never-print"}

    def progress(self, reason, verified_pairs=118, processed_assets=6):
        return {
            "continuationReason": reason,
            "currentReady": reason != "strict-current-runtime",
            "onlyDownloadStops": reason == "download-budget",
            "processedAssets": processed_assets,
            "requiredPairCount": 118,
            "verifiedPairCount": verified_pairs,
        }

    def simulate(self, summaries, codes=None, durations=None, free=None, env=None):
        self.calls, self.logs, elapsed = [], [], [0]
        codes = codes or [0] * 3
        durations = durations or [400] * 3
        free = free or [8 * oneoff.GIB] * 3
        def run(environment):
            index = len(self.calls)
            self.calls.append(environment)
            elapsed[0] += durations[index]
            return codes[index]
        return oneoff.fill(ENV if env is None else env, run_pass=run,
                           read_progress=lambda ref: summaries[len(self.calls) - 1],
                           clock=lambda: elapsed[0], free_bytes=lambda: free[len(self.calls)],
                           log=self.logs.append)

    def test_download_stop_gets_a_new_bounded_pass(self):
        limited = self.progress("download-budget")
        done = self.progress(None, processed_assets=14)
        self.assertEqual(self.simulate([limited, done]), 0)
        self.assertEqual(len(self.calls), 2)
        self.assertEqual(
            [call["DMI_BULK_MAX_RUNTIME_SECONDS"] for call in self.calls],
            ["3000", "3000"],
        )
        for call in self.calls:
            self.assertEqual(call[oneoff.ONEOFF_CONTINUATION_PROTOCOL_ENV], "1")
            for key in ENV.keys() - {"DMI_BULK_MAX_RUNTIME_SECONDS"}:
                self.assertEqual(call[key], ENV[key])
        self.assertNotIn("never-print", " ".join(self.logs))

    def test_runtime_limited_exit_two_continues_when_verified_pairs_grow(self):
        first = self.progress("strict-current-runtime", verified_pairs=80)
        second = self.progress("strict-current-runtime", verified_pairs=90)
        done = self.progress(None, verified_pairs=118)
        self.assertEqual(self.simulate(
            [first, second, done],
            codes=[oneoff.FINALIZED_INCOMPLETE_EXIT_CODE] * 2 + [0],
        ), 0)
        self.assertEqual(len(self.calls), 3)
        self.assertIn("reason=strict-current-runtime", " ".join(self.logs))

    def test_no_retries_for_unclassified_failure_or_no_progress(self):
        limited = self.progress("download-budget")
        self.assertEqual(self.simulate([], codes=[2]), 2)
        self.assertEqual(len(self.calls), 1)
        self.assertEqual(self.simulate([dict(limited, processedAssets=0)]), 0)
        self.assertEqual(len(self.calls), 1)

    def test_runtime_continuation_stops_after_no_verified_pair_gain(self):
        limited = self.progress("strict-current-runtime", verified_pairs=80)
        self.assertEqual(self.simulate(
            [limited, limited],
            codes=[oneoff.FINALIZED_INCOMPLETE_EXIT_CODE] * 2,
        ), 2)
        self.assertEqual(len(self.calls), 2)
        self.assertIn("NO_VERIFIED_PAIR_GAIN", self.logs[-1])

    def test_maximum_three_passes(self):
        limited = self.progress("download-budget", processed_assets=1)
        self.assertEqual(self.simulate([limited] * 3), 0)
        self.assertEqual(len(self.calls), 3)
        self.assertIn("PASS_LIMIT", self.logs[-1])

    def test_completion_first_configuration_stops_after_one_pass(self):
        limited = self.progress("download-budget", processed_assets=1)
        self.assertEqual(self.simulate(
            [limited],
            env=dict(ENV, **{oneoff.MAX_PASSES_ENV: "1"}),
        ), 0)
        self.assertEqual(len(self.calls), 1)
        self.assertIn("completedPasses=1", self.logs[-1])

    def test_disk_reserve_stops_without_discarding_pass(self):
        limited = self.progress("download-budget")
        self.assertEqual(self.simulate([limited], free=[8 * oneoff.GIB, 4 * oneoff.GIB]), 0)
        self.assertEqual(len(self.calls), 1)
        self.assertIn("DISK_RESERVE", self.logs[-1])

    def test_no_first_pass_without_disk_reserve(self):
        self.assertEqual(self.simulate([], free=[4 * oneoff.GIB]), 2)
        self.assertEqual(self.calls, [])

    def test_configuration_and_target_are_locked(self):
        for change in [{"DMI_BULK_MAX_DOWNLOAD_MB": "8192"}, {"DMI_BULK_MAX_RUNTIME_SECONDS": "6000"},
                       {"RAVRADAR_PRODUCTION_TARGET_HOUR": "2026-09-04T17:01:00Z"},
                       {oneoff.MAX_PASSES_ENV: "0"}, {oneoff.MAX_PASSES_ENV: "4"},
                       {oneoff.MAX_PASSES_ENV: "01"}]:
            with self.assertRaises(ValueError):
                self.simulate([], env=dict(ENV, **change))
            self.assertEqual(self.calls, [])

    def test_finalized_report_is_private_and_exact(self):
        report = oneoff.summarize_progress(self.fixture(), REFERENCE)
        self.assertEqual(report, self.progress("download-budget"))
        for mutate in [
            lambda x: x["diagnostics"]["currentOperationalLedger"].update(ready="false"),
            lambda x: x["diagnostics"]["currentOperationalLedger"].update(productionReferenceAt="2026-09-04T18:00:00Z"),
            lambda x: x["diagnostics"]["rawCache"]["after"].update(bytes=4 * oneoff.GIB + 1),
            lambda x: x["diagnostics"].update(assetsProcessedThisInvocation=True),
            lambda x: x["diagnostics"].update(progressCheckpoint={
                "schemaVersion": 1, "validation": "pending-finalization",
            }),
        ]:
            document = self.fixture()
            mutate(document)
            with self.assertRaises(ValueError):
                oneoff.summarize_progress(document, REFERENCE)

    def test_finalized_runtime_limited_report_is_the_only_exit_two_retry(self):
        report = oneoff.summarize_progress(
            self.fixture(ready=False, verified_pairs=80, runtime_limited=True),
            REFERENCE,
        )
        self.assertEqual(
            report,
            self.progress("strict-current-runtime", verified_pairs=80),
        )
        for mutate in [
            lambda x: x["diagnostics"]["currentOperationalLedger"]["failureCodes"].append("UNATTESTED_CURRENT_PART_TIME"),
            lambda x: x["diagnostics"]["errors"][0].update(failureCode="ASSET_REQUEST_FAILED"),
            lambda x: x["diagnostics"]["errors"][0].update(partialProgressPreserved=False),
            lambda x: x["diagnostics"]["errors"].append({
                "collection": "wam_dw",
                "message": "bulk runtime budget reached inside GRIB processing",
                "failureCode": "RUNTIME_BUDGET_REACHED",
                "partialProgressPreserved": True,
            }),
        ]:
            document = self.fixture(ready=False, verified_pairs=80, runtime_limited=True)
            mutate(document)
            self.assertIsNone(
                oneoff.summarize_progress(document, REFERENCE)["continuationReason"]
            )

    def test_preserved_harmonie_runtime_boundary_does_not_block_dkss_continuation(self):
        document = self.fixture(
            ready=False,
            verified_pairs=80,
            runtime_limited=True,
        )
        document["diagnostics"]["errors"].insert(1, {
            "collection": "harmonie_dini_sf",
            "message": "bulk runtime budget reached inside GRIB processing",
            "failureCode": "RUNTIME_BUDGET_REACHED",
            "partialProgressPreserved": True,
        })
        document["diagnostics"]["collectionsAttempted"].append(
            "harmonie_dini_sf"
        )
        document["runs"]["harmonie_dini_sf"] = {"assetsProcessed": 0}
        self.assertEqual(
            oneoff.summarize_progress(document, REFERENCE)["continuationReason"],
            "strict-current-runtime",
        )

        outer_boundary = self.fixture(
            ready=False,
            verified_pairs=80,
            runtime_limited=True,
        )
        outer_boundary["diagnostics"]["errors"].insert(1, {
            "collection": "harmonie_dini_sf",
            "message": "bulk runtime budget reached",
            "failureCode": "RUNTIME_BUDGET_REACHED",
        })
        self.assertEqual(
            oneoff.summarize_progress(outer_boundary, REFERENCE)[
                "continuationReason"
            ],
            "strict-current-runtime",
        )

        without_dkss_runtime = self.fixture(
            ready=False,
            verified_pairs=80,
            runtime_limited=True,
        )
        without_dkss_runtime["diagnostics"]["errors"][0] = {
            "collection": "harmonie_dini_sf",
            "message": "bulk runtime budget reached inside GRIB processing",
            "failureCode": "RUNTIME_BUDGET_REACHED",
            "partialProgressPreserved": True,
        }
        without_dkss_runtime["diagnostics"]["collectionsAttempted"] = [
            "harmonie_dini_sf"
        ]
        without_dkss_runtime["runs"] = {
            "harmonie_dini_sf": {"assetsProcessed": 6}
        }
        self.assertIsNone(
            oneoff.summarize_progress(without_dkss_runtime, REFERENCE)[
                "continuationReason"
            ]
        )

        for mutate in [
            lambda row: row.update(partialProgressPreserved=False),
            lambda row: row.pop("partialProgressPreserved"),
            lambda row: row.update(failureCode="ASSET_REQUEST_FAILED"),
            lambda row: row.update(unclassifiedDetail="unknown"),
        ]:
            rejected = self.fixture(
                ready=False,
                verified_pairs=80,
                runtime_limited=True,
            )
            harmonie_error = {
                "collection": "harmonie_dini_sf",
                "message": "bulk runtime budget reached inside GRIB processing",
                "failureCode": "RUNTIME_BUDGET_REACHED",
                "partialProgressPreserved": True,
            }
            mutate(harmonie_error)
            rejected["diagnostics"]["errors"].insert(1, harmonie_error)
            rejected["diagnostics"]["collectionsAttempted"].append(
                "harmonie_dini_sf"
            )
            rejected["runs"]["harmonie_dini_sf"] = {"assetsProcessed": 0}
            self.assertIsNone(
                oneoff.summarize_progress(rejected, REFERENCE)[
                    "continuationReason"
                ]
            )

        for collection in ["dkss_lf", "harmonie_dini_sf"]:
            download_collision = self.fixture(
                ready=False,
                verified_pairs=80,
                runtime_limited=True,
            )
            row = download_collision["diagnostics"]["errors"][0]
            row.update({
                "collection": collection,
                "message": "DMI bulk download budget exceeded during asset download",
                "failureCode": "RUNTIME_BUDGET_REACHED",
                "partialProgressPreserved": True,
            })
            self.assertIsNone(
                oneoff.summarize_progress(download_collision, REFERENCE)[
                    "continuationReason"
                ]
            )

        outer_with_unknown_field = self.fixture(
            ready=False, verified_pairs=80, runtime_limited=True,
        )
        outer_with_unknown_field["diagnostics"]["errors"].insert(1, {
            "collection": "harmonie_dini_sf",
            "message": "bulk runtime budget reached",
            "failureCode": "RUNTIME_BUDGET_REACHED",
            "unclassifiedDetail": "unknown",
        })
        self.assertIsNone(
            oneoff.summarize_progress(outer_with_unknown_field, REFERENCE)[
                "continuationReason"
            ]
        )

    def test_historical_run_counts_never_substitute_for_this_invocation(self):
        document = self.fixture(
            ready=False,
            verified_pairs=80,
            runtime_limited=True,
        )
        document["runs"]["dkss_lf"]["assetsProcessed"] = 999
        document["diagnostics"]["assetsProcessedThisInvocation"] = 0
        report = oneoff.summarize_progress(document, REFERENCE)
        self.assertEqual(report["processedAssets"], 0)
        self.assertEqual(
            self.simulate(
                [report],
                codes=[oneoff.FINALIZED_INCOMPLETE_EXIT_CODE],
            ),
            2,
        )
        self.assertEqual(len(self.calls), 1)

    def test_serialized_final_cache_seam_keeps_target_across_clock_boundaries(self):
        first = self.fixture(
            ready=False, verified_pairs=80, runtime_limited=True,
        )
        second = self.fixture(
            ready=False, verified_pairs=90, runtime_limited=True,
        )
        complete = self.fixture(ready=True, verified_pairs=118)
        complete["diagnostics"]["errors"] = []
        documents = [first, second, complete]
        codes = [oneoff.FINALIZED_INCOMPLETE_EXIT_CODE] * 2 + [0]
        observed_references = []
        with tempfile.TemporaryDirectory(prefix="ravradar-oneoff-seam-") as raw:
            cache = Path(raw) / "candidate.json"
            calls = []

            def run_pass(environment):
                index = len(calls)
                calls.append(dict(environment))
                observed_references.append(
                    environment["RAVRADAR_PRODUCTION_TARGET_HOUR"]
                )
                write_dmi_bulk_document(cache, documents[index])
                return codes[index]

            def read_progress(reference):
                return oneoff.summarize_progress(
                    oneoff.read_dmi_bulk_document(cache), reference,
                )

            self.assertEqual(oneoff.fill(
                ENV,
                run_pass=run_pass,
                read_progress=read_progress,
                clock=iter([0, 3700, 7400]).__next__,
                free_bytes=lambda: 8 * oneoff.GIB,
                log=lambda _line: None,
            ), 0)

        self.assertEqual(len(calls), 3)
        self.assertEqual(observed_references, [REFERENCE] * 3)
        self.assertTrue(all(
            call[oneoff.ONEOFF_CONTINUATION_PROTOCOL_ENV] == "1"
            for call in calls
        ))

    def test_mixed_errors_timeouts_or_unpreserved_data_never_trigger_retry(self):
        for mutate in [
            lambda e: e.append({"collection": "wam_dw", "message": "arbitrary failure", "partialProgressPreserved": True}),
            lambda e: e[0].update(message="bulk runtime budget reached"),
            lambda e: e[0].update(partialProgressPreserved=False),
            lambda e: e[0].update(message="private-sentinel"),
        ]:
            document = self.fixture()
            mutate(document["diagnostics"]["errors"])
            report = oneoff.summarize_progress(document, REFERENCE)
            self.assertFalse(report["onlyDownloadStops"])
            self.assertIsNone(report["continuationReason"])

    def test_real_entry_point_requires_a_new_finalized_report(self):
        for changed in [False, True]:
            cache = MagicMock()
            cache.exists.return_value = True
            cache.stat.side_effect = [SimpleNamespace(st_mtime_ns=1), SimpleNamespace(st_mtime_ns=2 if changed else 1)]
            document = self.fixture()
            document["diagnostics"]["errors"] = []
            output = io.StringIO()
            with patch.object(oneoff, "CACHE", cache), patch.dict(oneoff.os.environ, ENV, clear=True), \
                 patch.object(oneoff, "read_dmi_bulk_document", return_value=document) as read_cache, \
                 patch.object(oneoff.time, "monotonic", return_value=0), \
                 patch.object(oneoff.shutil, "disk_usage", return_value=SimpleNamespace(free=8 * oneoff.GIB)), \
                 patch.object(oneoff.subprocess, "run", return_value=SimpleNamespace(returncode=0)) as child, \
                 contextlib.redirect_stdout(output):
                if changed:
                    self.assertEqual(oneoff.main(), 0)
                else:
                    with self.assertRaisesRegex(ValueError, "ONEOFF_FINALIZED_REPORT_MISSING"):
                        oneoff.main()
            self.assertEqual(child.call_args.args[0], [oneoff.sys.executable, "-u", str(oneoff.ROOT / "scripts/run-dmi-bulk-supervised.py")])
            if changed:
                read_cache.assert_called_once_with(cache)
            else:
                read_cache.assert_not_called()
            self.assertEqual(child.call_args.kwargs["env"]["RAVRADAR_PRODUCTION_TARGET_HOUR"], REFERENCE)
            self.assertEqual(
                child.call_args.kwargs["env"][oneoff.ONEOFF_CONTINUATION_PROTOCOL_ENV],
                "1",
            )
            self.assertNotIn("never-print", output.getvalue())


if __name__ == "__main__":
    unittest.main()
