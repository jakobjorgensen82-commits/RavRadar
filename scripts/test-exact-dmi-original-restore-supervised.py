"""Bounded original-restore process tests; synthetic children, no DMI/network."""
from contextlib import redirect_stdout
import importlib.util
import io
import json
from pathlib import Path
import subprocess
import sys
import time
import unittest
from unittest.mock import patch

MODULE = Path(__file__).with_name("run-dmi-bulk-supervised.py")
SPEC = importlib.util.spec_from_file_location("exact_original_supervisor", MODULE)
supervisor = importlib.util.module_from_spec(SPEC)
sys.modules[SPEC.name] = supervisor
SPEC.loader.exec_module(supervisor)


def report(status="RESTORED"):
    return {"schemaVersion": 1, "contractId": "dmi-exact-original-restore-result-v1",
            "status": status, "code": "EXACT_ORIGINALS_RESTORED" if status == "RESTORED" else "CONTENT_MISMATCH",
            "originalCount": 1, "uniqueAssetCount": 1, "downloadedAssetCount": 1,
            "reusedAssetCount": 0, "downloadedBytes": 8, "pruningPerformed": False,
            "replayPerformed": False, "scorePerformed": False}


class ExactOriginalSupervisorTests(unittest.TestCase):
    def test_fixed_restore_once_has_no_retry_quarantine_or_finalizer(self):
        output = io.StringIO()
        expected = report()

        def finished(command, environment, **kwargs):
            self.assertEqual(command, [sys.executable, "-B", "-u", str(supervisor.PRODUCER),
                                       "--restore-exact-originals"])
            self.assertNotIn("DMI_BULK_SUPERVISOR_SKIPPED_ASSETS", environment)
            self.assertEqual(kwargs["watchdog_seconds"], 180)
            self.assertGreater(kwargs["total_deadline"], time.monotonic() + 778)
            asset = {"collection": "dkss_nsbs", "modelRun": "2026-10-10T00:00:00.000Z",
                     "validTime": "2026-10-10T01:00:00.000Z", "itemId": "private-synthetic-item",
                     "assetIdentitySha256": "a" * 64, "assetRevisionSha256": "b" * 64}
            for marker in ("START", "END"):
                kwargs["log"]("[DMI bulk + 1.0s] DMI_ASSET_PROCESSING_" + marker + "="
                              + json.dumps(asset) + "\n")
            kwargs["log"](json.dumps(expected) + "\n")
            return supervisor.SupervisedResult(0, False)

        with (patch.object(sys, "argv", [str(MODULE), "--restore-exact-originals"]),
              patch.object(sys, "platform", "linux"),
              patch.dict(supervisor.os.environ, {}, clear=True),
              patch.object(supervisor, "run_supervised", side_effect=finished) as run,
              patch.object(supervisor, "finalize_checkpoint") as finalize,
              redirect_stdout(output)):
            self.assertEqual(supervisor.main(), 0)
        self.assertEqual(run.call_count, 1)
        finalize.assert_not_called()
        receipt = json.loads(output.getvalue())
        self.assertEqual(receipt["result"], expected)
        self.assertTrue(receipt["physicalGroupClosed"])
        self.assertTrue(receipt["outputClosed"])

    def test_mixed_restore_arguments_never_start_normal_main(self):
        with (patch.object(sys, "argv", [str(MODULE), "--restore-exact-originals", "other"]),
              patch.object(supervisor, "run_supervised") as run,
              patch.object(supervisor, "finalize_checkpoint") as finalize):
            with self.assertRaisesRegex(RuntimeError, "ARGUMENTS_INVALID"):
                supervisor.main()
        run.assert_not_called()
        finalize.assert_not_called()

    def test_rejected_worker_can_prove_closure_but_never_success(self):
        output = io.StringIO()

        def rejected(*_args, **kwargs):
            kwargs["log"](json.dumps(report("REJECTED")))
            return supervisor.SupervisedResult(2, False)

        with (patch.object(sys, "platform", "linux"),
              patch.object(supervisor, "run_supervised", side_effect=rejected),
              patch.object(supervisor, "finalize_checkpoint") as finalize,
              redirect_stdout(output)):
            self.assertEqual(supervisor.restore_exact_originals({}), 2)
        self.assertEqual(json.loads(output.getvalue())["result"]["status"], "REJECTED")
        finalize.assert_not_called()

    def test_unproved_stop_or_malformed_or_overflow_output_emits_no_receipt(self):
        for kind in ("unproved", "malformed", "overflow", "wrong-exit", "boolean-count"):
            with self.subTest(kind=kind):
                output = io.StringIO()

                def failed(*_args, **kwargs):
                    if kind == "unproved":
                        raise RuntimeError("OWN_PROCESS_GROUP_IDENTITY_UNPROVED")
                    body = report()
                    if kind == "boolean-count":
                        body["originalCount"] = True
                    kwargs["log"]("not JSON" if kind == "malformed" else
                                  "X" * 4097 if kind == "overflow" else json.dumps(body))
                    return supervisor.SupervisedResult(7 if kind == "wrong-exit" else 0, False)

                with (patch.object(sys, "platform", "linux"),
                      patch.object(supervisor, "run_supervised", side_effect=failed) as run,
                      patch.object(supervisor, "finalize_checkpoint") as finalize,
                      redirect_stdout(output)):
                    with self.assertRaises(RuntimeError):
                        supervisor.restore_exact_originals({})
                self.assertEqual(run.call_count, 1)
                self.assertEqual(output.getvalue(), "")
                finalize.assert_not_called()

    def test_total_deadline_stops_real_child_before_assets_and_after_eof(self):
        for early_eof in (False, True):
            with self.subTest(early_eof=early_eof):
                children = []
                original_popen = subprocess.Popen

                def capture(*args, **kwargs):
                    child = original_popen(*args, **kwargs)
                    children.append(child)
                    return child

                source = "import os,time\n"
                if early_eof:
                    source += "os.close(1)\nos.close(2)\n"
                source += "time.sleep(30)\n"
                started = time.monotonic()
                try:
                    with self.assertRaisesRegex(RuntimeError, "DMI_SUPERVISOR_TOTAL_DEADLINE"):
                        supervisor.run_supervised([sys.executable, "-u", "-c", source],
                            dict(supervisor.os.environ), watchdog_seconds=20,
                            total_deadline=started + 0.15, popen=capture, log=lambda _line: None)
                    self.assertLess(time.monotonic() - started, 5)
                    self.assertEqual(len(children), 1)
                    self.assertIsNotNone(children[0].poll())
                    self.assertTrue(children[0].stdout.closed)
                finally:
                    for child in children:
                        if child.poll() is None:
                            child.kill()
                        child.wait(timeout=5)
                        if child.stdout is not None:
                            child.stdout.close()

    def test_default_none_deadline_preserves_normal_real_child_exit(self):
        result = supervisor.run_supervised([sys.executable, "-u", "-c", "raise SystemExit(7)"],
            dict(supervisor.os.environ), watchdog_seconds=0.1, log=lambda _line: None)
        self.assertEqual(result.returncode, 7)
        self.assertFalse(result.watchdog_timed_out)


if __name__ == "__main__":
    unittest.main()
