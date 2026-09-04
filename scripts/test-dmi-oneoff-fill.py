"""Synthetic one-off continuation tests; no production files or network."""
import importlib.util
import contextlib
import io
import json
from pathlib import Path
from types import SimpleNamespace
import unittest
from unittest.mock import MagicMock, patch

spec = importlib.util.spec_from_file_location("oneoff", Path(__file__).with_name("run-dmi-oneoff-fill.py"))
oneoff = importlib.util.module_from_spec(spec)
spec.loader.exec_module(oneoff)
REFERENCE = "2026-09-04T17:00:00Z"
ENV = {"DMI_BULK_MAX_DOWNLOAD_MB": "4096", "DMI_BULK_RAW_CACHE_MAX_MB": "4096",
       "DMI_BULK_MAX_RUNTIME_SECONDS": "3000", "DMI_BULK_FINALIZE_RESERVE_SECONDS": "180",
       "RAVRADAR_PRODUCTION_TARGET_HOUR": REFERENCE, "SYNTHETIC_SECRET": "never-print"}


class FillTests(unittest.TestCase):
    def fixture(self):
        return {"diagnostics": {
            "currentOperationalLedger": {"productionReferenceAt": REFERENCE, "ready": True},
            "errors": [{"collection": "harmonie_dini_sf", "message": "DMI bulk download budget would be exceeded", "failureCode": "RUNTIME_BUDGET_REACHED", "partialProgressPreserved": True}],
            "collectionsAttempted": ["harmonie_dini_sf"],
            "rawCache": {"maxBytes": 4 * oneoff.GIB, "after": {"bytes": 4 * oneoff.GIB}},
        }, "runs": {"harmonie_dini_sf": {"assetsProcessed": 6}}, "privateFixture": "never-print"}

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

    def test_continue_only_download_stop_and_keep_one_deadline(self):
        limited = {"onlyDownloadStops": True, "processedAssets": 6}
        done = {"onlyDownloadStops": False, "processedAssets": 14}
        self.assertEqual(self.simulate([limited, done]), 0)
        self.assertEqual(len(self.calls), 2)
        self.assertEqual([call["DMI_BULK_MAX_RUNTIME_SECONDS"] for call in self.calls], ["3000", "2600"])
        for call in self.calls:
            for key in ENV.keys() - {"DMI_BULK_MAX_RUNTIME_SECONDS"}:
                self.assertEqual(call[key], ENV[key])
        self.assertNotIn("never-print", " ".join(self.logs))

    def test_no_retries_for_failure_or_no_progress(self):
        limited = {"onlyDownloadStops": True, "processedAssets": 6}
        self.assertEqual(self.simulate([limited], codes=[2]), 2)
        self.assertEqual(len(self.calls), 1)
        self.assertEqual(self.simulate([dict(limited, processedAssets=0)]), 0)
        self.assertEqual(len(self.calls), 1)

    def test_maximum_three_passes(self):
        self.assertEqual(self.simulate([{"onlyDownloadStops": True, "processedAssets": 1}] * 3), 0)
        self.assertEqual(len(self.calls), 3)
        self.assertIn("PASS_LIMIT", self.logs[-1])

    def test_time_and_disk_reserves_stop_without_discarding_pass(self):
        limited = {"onlyDownloadStops": True, "processedAssets": 6}
        self.assertEqual(self.simulate([limited], durations=[2750]), 0)
        self.assertEqual(len(self.calls), 1)
        self.assertIn("SHARED_TIME_RESERVE", self.logs[-1])
        self.assertEqual(self.simulate([limited], free=[8 * oneoff.GIB, 4 * oneoff.GIB]), 0)
        self.assertEqual(len(self.calls), 1)
        self.assertIn("DISK_RESERVE", self.logs[-1])

    def test_no_first_pass_without_disk_reserve(self):
        self.assertEqual(self.simulate([], free=[4 * oneoff.GIB]), 2)
        self.assertEqual(self.calls, [])

    def test_configuration_and_target_are_locked(self):
        for change in [{"DMI_BULK_MAX_DOWNLOAD_MB": "8192"}, {"DMI_BULK_MAX_RUNTIME_SECONDS": "6000"},
                       {"RAVRADAR_PRODUCTION_TARGET_HOUR": "2026-09-04T17:01:00Z"}]:
            with self.assertRaises(ValueError):
                self.simulate([], env=dict(ENV, **change))
            self.assertEqual(self.calls, [])

    def test_finalized_report_is_private_and_exact(self):
        report = oneoff.summarize_progress(self.fixture(), REFERENCE)
        self.assertEqual(report, {"onlyDownloadStops": True, "processedAssets": 6})
        for mutate in [
            lambda x: x["diagnostics"]["currentOperationalLedger"].update(ready=False),
            lambda x: x["diagnostics"]["currentOperationalLedger"].update(productionReferenceAt="2026-09-04T18:00:00Z"),
            lambda x: x["diagnostics"]["rawCache"]["after"].update(bytes=4 * oneoff.GIB + 1),
            lambda x: x["runs"]["harmonie_dini_sf"].update(assetsProcessed=True),
        ]:
            document = self.fixture()
            mutate(document)
            with self.assertRaises(ValueError):
                oneoff.summarize_progress(document, REFERENCE)

    def test_mixed_errors_timeouts_or_unpreserved_data_never_trigger_retry(self):
        for mutate in [
            lambda e: e.append({"collection": "wam_dw", "message": "arbitrary failure", "partialProgressPreserved": True}),
            lambda e: e[0].update(message="bulk runtime budget reached"),
            lambda e: e[0].update(partialProgressPreserved=False),
            lambda e: e[0].update(message="private-sentinel"),
        ]:
            document = self.fixture()
            mutate(document["diagnostics"]["errors"])
            self.assertFalse(oneoff.summarize_progress(document, REFERENCE)["onlyDownloadStops"])

    def test_real_entry_point_requires_a_new_finalized_report(self):
        for changed in [False, True]:
            cache = MagicMock()
            cache.exists.return_value = True
            cache.stat.side_effect = [SimpleNamespace(st_mtime_ns=1), SimpleNamespace(st_mtime_ns=2 if changed else 1)]
            document = self.fixture()
            document["diagnostics"]["errors"] = []
            cache.read_text.return_value = json.dumps(document)
            output = io.StringIO()
            with patch.object(oneoff, "CACHE", cache), patch.dict(oneoff.os.environ, ENV, clear=True), \
                 patch.object(oneoff.time, "monotonic", return_value=0), \
                 patch.object(oneoff.shutil, "disk_usage", return_value=SimpleNamespace(free=8 * oneoff.GIB)), \
                 patch.object(oneoff.subprocess, "run", return_value=SimpleNamespace(returncode=0)) as child, \
                 contextlib.redirect_stdout(output):
                if changed:
                    self.assertEqual(oneoff.main(), 0)
                else:
                    with self.assertRaisesRegex(ValueError, "ONEOFF_FINALIZED_REPORT_MISSING"):
                        oneoff.main()
            self.assertEqual(child.call_args.args[0], [oneoff.sys.executable, "-u", str(oneoff.ROOT / "scripts/update-dmi-bulk.py")])
            self.assertEqual(child.call_args.kwargs["env"]["RAVRADAR_PRODUCTION_TARGET_HOUR"], REFERENCE)
            self.assertNotIn("never-print", output.getvalue())


if __name__ == "__main__":
    unittest.main()
