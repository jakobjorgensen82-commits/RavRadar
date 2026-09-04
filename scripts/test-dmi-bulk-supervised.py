"""Synthetic supervisor tests; no production files, credentials or network."""
from __future__ import annotations

import importlib.util
import io
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest
from unittest.mock import patch

MODULE_PATH = Path(__file__).with_name("run-dmi-bulk-supervised.py")
SPEC = importlib.util.spec_from_file_location("dmi_supervisor", MODULE_PATH)
supervisor = importlib.util.module_from_spec(SPEC)
assert SPEC.loader is not None
sys.modules[SPEC.name] = supervisor
SPEC.loader.exec_module(supervisor)


class SupervisorTests(unittest.TestCase):
    def test_producer_has_fail_closed_finalize_only_contract(self):
        source = supervisor.PRODUCER.read_text(encoding="utf-8")
        self.assertIn('FINALIZE_ONLY = os.getenv("DMI_BULK_FINALIZE_ONLY"', source)
        self.assertIn('ALLOWED_FINALIZE_REASONS = frozenset({"HARMONIE_ASSET_WATCHDOG_TIMEOUT"})', source)
        self.assertIn('if FINALIZE_ONLY:\n        scheduled = []', source)
        self.assertIn('elif not replay_targets:', source)
        self.assertIn('and not FINALIZE_ONLY\n        and not FORCE_REFRESH', source)

    def test_successful_harmonie_asset_is_not_stopped(self):
        command = [
            sys.executable, "-u", "-c",
            "print('[DMI bulk + 1.0s] harmonie_dini_sf: behandler forecast-step 1/1 now (downloadet)', flush=True); "
            "print('[DMI bulk + 1.1s] harmonie_dini_sf: forecast-step behandlet på 0.1s; checkpoint gemt', flush=True)",
        ]
        output = io.StringIO()
        result = supervisor.run_supervised(
            command, dict(supervisor.os.environ), watchdog_seconds=1.0,
            log=output.write,
        )
        self.assertEqual(result.returncode, 0)
        self.assertFalse(result.watchdog_timed_out)
        self.assertIn("checkpoint gemt", output.getvalue())

    def test_stalled_harmonie_asset_is_stopped_without_printing_environment(self):
        command = [
            sys.executable, "-u", "-c",
            "import time; print('[DMI bulk + 1.0s] harmonie_dini_sf: behandler forecast-step 1/1 now (downloadet)', flush=True); time.sleep(5)",
        ]
        output = io.StringIO()
        environment = dict(supervisor.os.environ, SYNTHETIC_SECRET="never-print")
        result = supervisor.run_supervised(
            command, environment, watchdog_seconds=0.1, log=output.write,
        )
        self.assertTrue(result.watchdog_timed_out)
        self.assertNotEqual(result.returncode, 0)
        self.assertNotIn("never-print", output.getvalue())

    def test_finalize_checkpoint_is_bounded_and_uses_existing_producer(self):
        completed = subprocess.CompletedProcess([], 0)
        with patch.object(supervisor.subprocess, "run", return_value=completed) as child:
            self.assertEqual(supervisor.finalize_checkpoint({}), 0)
        self.assertEqual(
            child.call_args.args[0],
            [supervisor.sys.executable, "-u", str(supervisor.PRODUCER)],
        )
        child_environment = child.call_args.kwargs["env"]
        self.assertEqual(child_environment["DMI_BULK_FINALIZE_ONLY"], "true")
        self.assertEqual(
            child_environment["DMI_BULK_FINALIZE_REASON"],
            supervisor.WATCHDOG_FAILURE_CODE,
        )
        self.assertLessEqual(child.call_args.kwargs["timeout"], 600)

    def test_failed_finalizer_writes_bounded_nonempty_outputs(self):
        with tempfile.TemporaryDirectory() as directory:
            output_path = Path(directory) / "github-output.txt"
            with patch.object(
                supervisor.subprocess, "run",
                side_effect=subprocess.TimeoutExpired(["producer"], 420),
            ):
                code = supervisor.finalize_checkpoint({"GITHUB_OUTPUT": str(output_path)})
            self.assertEqual(code, 2)
            written = output_path.read_text(encoding="utf-8")
            self.assertIn("status=failed\n", written)
            self.assertIn("terminal_code=DMI_SUPERVISED_FINALIZE_TIMEOUT\n", written)
            self.assertIn("strict_current_anchor_ready=false\n", written)


if __name__ == "__main__":
    unittest.main()
