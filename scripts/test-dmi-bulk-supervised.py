"""Synthetic supervisor tests; no production files, credentials or network."""
from __future__ import annotations

import ast
import importlib.util
import io
import json
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


ASSET_A = {
    "collection": "dkss_idw",
    "modelRun": "2026-09-06T00:00:00Z",
    "validTime": "2026-09-06T03:00:00Z",
    "itemId": "synthetic-asset-a",
    "assetIdentitySha256": "a" * 64,
    "assetRevisionSha256": "b" * 64,
}
ASSET_B = {
    **ASSET_A,
    "validTime": "2026-09-06T04:00:00Z",
    "itemId": "synthetic-asset-b",
    "assetIdentitySha256": "c" * 64,
    "assetRevisionSha256": "d" * 64,
}


def marker(name: str, asset: dict[str, str]) -> str:
    payload = json.dumps(asset, sort_keys=True, separators=(",", ":"))
    return f"[DMI bulk + 1.0s] {name}={payload}"


class SupervisorTests(unittest.TestCase):
    def test_producer_has_fail_closed_finalize_only_contract(self):
        source = supervisor.PRODUCER.read_text(encoding="utf-8")
        self.assertIn('FINALIZE_ONLY = os.getenv("DMI_BULK_FINALIZE_ONLY"', source)
        self.assertIn('"ASSET_PROCESSING_WATCHDOG_LIMIT"', source)
        self.assertIn('"HARMONIE_ASSET_WATCHDOG_TIMEOUT"', source)
        self.assertIn('if FINALIZE_ONLY:\n        scheduled = []', source)
        self.assertIn('elif not replay_targets:', source)
        self.assertIn('and not FINALIZE_ONLY\n        and not FORCE_REFRESH', source)

    def test_every_asset_download_and_transactional_parse_is_exactly_supervised(self):
        tree = ast.parse(supervisor.PRODUCER.read_text(encoding="utf-8"))
        parents: dict[ast.AST, ast.AST] = {}
        for node in ast.walk(tree):
            for child in ast.iter_child_nodes(node):
                parents[child] = node

        guarded_calls = []
        for node in ast.walk(tree):
            if not isinstance(node, ast.Call) or not isinstance(node.func, ast.Name):
                continue
            if node.func.id not in {"download_asset", "process_grib_transactionally"}:
                continue
            guarded_calls.append(node)
            parent = parents.get(node)
            guarded = False
            while parent is not None:
                if isinstance(parent, ast.With) and any(
                    isinstance(item.context_expr, ast.Call)
                    and isinstance(item.context_expr.func, ast.Name)
                    and item.context_expr.func.id == "supervised_asset_operation"
                    for item in parent.items
                ):
                    guarded = True
                    break
                parent = parents.get(parent)
            self.assertTrue(
                guarded,
                f"{node.func.id} at line {node.lineno} is outside the exact watchdog",
            )
        self.assertEqual(len(guarded_calls), 7)

    def test_structured_asset_start_and_matching_end_clear_watchdog(self):
        start = marker("DMI_ASSET_PROCESSING_START", ASSET_A)
        end = marker("DMI_ASSET_PROCESSING_END", ASSET_A)
        command = [
            sys.executable, "-u", "-c",
            f"print({start!r}, flush=True); print({end!r}, flush=True)",
        ]
        output = io.StringIO()
        result = supervisor.run_supervised(
            command, dict(supervisor.os.environ), watchdog_seconds=1.0,
            log=output.write,
        )
        self.assertEqual(result.returncode, 0)
        self.assertFalse(result.watchdog_timed_out)
        self.assertIsNone(result.timed_out_asset)
        self.assertIn("DMI_ASSET_PROCESSING_END", output.getvalue())

    def test_structured_stalled_asset_is_stopped_with_exact_identity(self):
        start = marker("DMI_ASSET_PROCESSING_START", ASSET_A)
        command = [
            sys.executable, "-u", "-c",
            f"import time; print({start!r}, flush=True); time.sleep(5)",
        ]
        output = io.StringIO()
        environment = dict(supervisor.os.environ, SYNTHETIC_SECRET="never-print")
        result = supervisor.run_supervised(
            command, environment, watchdog_seconds=0.1, log=output.write,
        )
        self.assertTrue(result.watchdog_timed_out)
        self.assertNotEqual(result.returncode, 0)
        self.assertEqual(result.timed_out_asset, ASSET_A)
        self.assertNotIn("never-print", output.getvalue())

    def test_chatty_stalled_asset_cannot_outlive_watchdog(self):
        start = marker("DMI_ASSET_PROCESSING_START", ASSET_A)
        command = [
            sys.executable, "-u", "-c",
            (
                "import time\n"
                f"print({start!r}, flush=True)\n"
                "deadline = time.monotonic() + 2\n"
                "while time.monotonic() < deadline:\n"
                "    print('still-processing', flush=True)\n"
                "    time.sleep(0.01)\n"
            ),
        ]
        result = supervisor.run_supervised(
            command,
            dict(supervisor.os.environ),
            watchdog_seconds=0.1,
            log=lambda _line: None,
        )
        self.assertTrue(result.watchdog_timed_out)
        self.assertNotEqual(result.returncode, 0)
        self.assertEqual(result.timed_out_asset, ASSET_A)

    def test_mismatched_end_marker_cannot_clear_active_asset_watchdog(self):
        start = marker("DMI_ASSET_PROCESSING_START", ASSET_A)
        wrong_end = marker("DMI_ASSET_PROCESSING_END", ASSET_B)
        command = [
            sys.executable, "-u", "-c",
            (
                f"import time; print({start!r}, flush=True); "
                f"print({wrong_end!r}, flush=True); time.sleep(5)"
            ),
        ]
        result = supervisor.run_supervised(
            command,
            dict(supervisor.os.environ),
            watchdog_seconds=0.1,
            log=lambda _line: None,
        )
        self.assertTrue(result.watchdog_timed_out)
        self.assertEqual(result.timed_out_asset, ASSET_A)

    def test_malformed_structured_start_still_arms_generic_watchdog(self):
        command = [
            sys.executable, "-u", "-c",
            (
                "import time; "
                "print('DMI_ASSET_PROCESSING_START={truncated', flush=True); "
                "time.sleep(5)"
            ),
        ]
        result = supervisor.run_supervised(
            command,
            dict(supervisor.os.environ),
            watchdog_seconds=0.1,
            log=lambda _line: None,
        )
        self.assertTrue(result.watchdog_timed_out)
        self.assertIsNone(result.timed_out_asset)

    def test_main_restarts_once_with_only_timed_out_asset_then_succeeds(self):
        first = supervisor.SupervisedResult(143, True, ASSET_A)
        second = supervisor.SupervisedResult(0, False, None)
        with (
            patch.dict(supervisor.os.environ, {}, clear=True),
            patch.object(supervisor.time, "monotonic", return_value=100.0),
            patch.object(
                supervisor,
                "run_supervised",
                side_effect=[first, second],
            ) as run,
            patch.object(supervisor, "finalize_checkpoint") as finalize,
        ):
            self.assertEqual(supervisor.main(), 0)

        self.assertEqual(run.call_count, 2)
        first_environment = run.call_args_list[0].args[1]
        second_environment = run.call_args_list[1].args[1]
        self.assertEqual(
            json.loads(first_environment["DMI_BULK_SUPERVISOR_SKIPPED_ASSETS"]),
            [],
        )
        self.assertEqual(
            json.loads(second_environment["DMI_BULK_SUPERVISOR_SKIPPED_ASSETS"]),
            [ASSET_A],
        )
        finalize.assert_not_called()

    def test_finalized_incomplete_code_requires_opt_in_and_no_watchdog_history(self):
        partial = supervisor.SupervisedResult(
            supervisor.ONEOFF_FINALIZED_INCOMPLETE_EXIT_CODE,
            False,
            None,
        )
        for environment, expected in [
            ({}, 2),
            ({supervisor.ONEOFF_CONTINUATION_PROTOCOL_ENV: "0"}, 2),
            ({supervisor.ONEOFF_CONTINUATION_PROTOCOL_ENV: "1"},
             supervisor.ONEOFF_FINALIZED_INCOMPLETE_EXIT_CODE),
        ]:
            with (
                patch.dict(supervisor.os.environ, environment, clear=True),
                patch.object(supervisor.time, "monotonic", return_value=100.0),
                patch.object(supervisor, "run_supervised", return_value=partial),
            ):
                self.assertEqual(supervisor.main(), expected)

        timed_out = supervisor.SupervisedResult(143, True, ASSET_A)
        with (
            patch.dict(supervisor.os.environ, {
                supervisor.ONEOFF_CONTINUATION_PROTOCOL_ENV: "1",
            }, clear=True),
            patch.object(supervisor.time, "monotonic", return_value=100.0),
            patch.object(
                supervisor,
                "run_supervised",
                side_effect=[timed_out, partial],
            ) as run,
        ):
            self.assertEqual(supervisor.main(), 2)
        self.assertEqual(run.call_count, 2)

    def test_main_repeated_timeout_is_bounded_and_finalizes_checkpoint(self):
        timeout = supervisor.SupervisedResult(143, True, ASSET_A)
        with (
            patch.dict(supervisor.os.environ, {}, clear=True),
            patch.object(supervisor.time, "monotonic", return_value=100.0),
            patch.object(
                supervisor,
                "run_supervised",
                side_effect=[timeout, timeout],
            ) as run,
            patch.object(
                supervisor,
                "finalize_checkpoint",
                return_value=0,
            ) as finalize,
        ):
            self.assertEqual(supervisor.main(), 0)

        self.assertEqual(run.call_count, 2)
        final_environment = finalize.call_args.args[0]
        self.assertEqual(
            json.loads(final_environment["DMI_BULK_SUPERVISOR_SKIPPED_ASSETS"]),
            [ASSET_A],
        )
        self.assertEqual(
            finalize.call_args.kwargs["reason"],
            supervisor.WATCHDOG_LIMIT_CODE,
        )

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

        finalized_partial = subprocess.CompletedProcess(
            [], supervisor.ONEOFF_FINALIZED_INCOMPLETE_EXIT_CODE
        )
        with patch.object(
            supervisor.subprocess,
            "run",
            return_value=finalized_partial,
        ):
            self.assertEqual(supervisor.finalize_checkpoint({
                supervisor.ONEOFF_CONTINUATION_PROTOCOL_ENV: "1",
            }), 2)

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
