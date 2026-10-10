"""Synthetic supervisor tests; no production files, credentials or network."""
from __future__ import annotations

import ast
from contextlib import nullcontext
import errno
import importlib.util
import io
import json
import os
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
    def test_broken_log_pipe_stops_owned_producer_before_propagating(self):
        self.assert_log_pipe_stop()

    def test_broken_log_pipe_with_unproved_stop_keeps_original_failure(self):
        self.assert_log_pipe_stop(stop_rejected=True)

    def test_watchdog_stop_failure_is_terminal_and_not_retried(self):
        for active_eof in (False, True):
            with self.subTest(active_eof=active_eof):
                self.assert_log_pipe_stop(stop_rejected=True, watchdog=True,
                                          active_eof=active_eof)

    def test_main_interruption_preserves_failure_and_never_finalizes_live_writer(self):
        for stop_rejected in (False, True):
            with self.subTest(stop_rejected=stop_rejected):
                self.assert_log_pipe_stop(stop_rejected=stop_rejected, interruption=True)

    def test_reader_start_failure_stops_real_owned_writer_before_propagating(self):
        for stop_rejected in (False, True):
            with self.subTest(stop_rejected=stop_rejected):
                self.assert_log_pipe_stop(reader_failure_at="start", stop_rejected=stop_rejected)

    def test_reader_construction_and_queue_failures_stop_retained_writer(self):
        for stage in ("constructor", "queue"):
            for stop_rejected in (False, True):
                with self.subTest(stage=stage, stop_rejected=stop_rejected):
                    self.assert_log_pipe_stop(reader_failure_at=stage, stop_rejected=stop_rejected)

    def test_main_wait_interruption_after_real_eof_stops_retained_writer(self):
        for stop_rejected in (False, True):
            with self.subTest(stop_rejected=stop_rejected):
                self.assert_log_pipe_stop(completion_wait_failure=True,
                                          stop_rejected=stop_rejected)

    def test_main_eof_waits_for_owned_writer_to_finish_without_stopping_it(self):
        with tempfile.TemporaryDirectory(prefix="rr-supervisor-eof-finish-") as directory:
            heartbeat = Path(directory) / "heartbeat"
            original = Path(directory) / "original-BS"
            original.write_bytes(b"synthetic immutable original B/S\n")
            command = [sys.executable, "-u", "-c", (
                "import os, pathlib, time\n"
                f"heartbeat = pathlib.Path({str(heartbeat)!r})\n"
                "heartbeat.write_text('started', encoding='utf-8')\n"
                "os.close(1)\nos.close(2)\n"
                "deadline = time.monotonic() + 0.15\n"
                "while time.monotonic() < deadline:\n"
                "    with heartbeat.open('a', encoding='utf-8') as handle:\n"
                "        handle.write('.')\n"
                "    time.sleep(0.01)\n"
                "with heartbeat.open('a', encoding='utf-8') as handle:\n"
                "    handle.write('finished')\n"
                "raise SystemExit(7)\n"
            )]
            owned = []
            completion_waits = []

            def retain_popen(*args, **kwargs):
                self.assertEqual(args[0],
                                 [supervisor.sys.executable, "-u", str(supervisor.PRODUCER)])
                child = subprocess.Popen(command, **kwargs)
                owned.append(child)
                normal_wait = child.wait

                def observe_wait(*wait_args, **wait_kwargs):
                    if not wait_args and wait_kwargs == {"timeout": 0.25}:
                        self.assertIsNone(child.poll(), "EOF precedes actual writer exit")
                        completion_waits.append(child.pid)
                    return normal_wait(*wait_args, **wait_kwargs)

                child.wait = observe_wait
                return child

            normal_run = supervisor.run_supervised

            def run_owned(command, environment, *, watchdog_seconds):
                return normal_run(command, environment, watchdog_seconds=0.1,
                                  popen=retain_popen, log=lambda _line: None)

            try:
                with (
                    patch.dict(supervisor.os.environ, {}, clear=True),
                    patch.object(supervisor, "run_supervised", side_effect=run_owned) as run,
                    patch.object(supervisor, "stop_process") as stop,
                    patch.object(supervisor, "finalize_checkpoint") as finalize,
                ):
                    self.assertEqual(supervisor.main(), 7)
                self.assertEqual(run.call_count, 1)
                self.assertEqual(completion_waits, [owned[0].pid])
                stop.assert_not_called()
                finalize.assert_not_called()
                self.assertEqual(owned[0].poll(), 7)
                self.assertTrue(owned[0].stdout.closed)
                self.assertTrue(heartbeat.read_text(encoding="utf-8").endswith("finished"))
                self.assertEqual(original.read_bytes(), b"synthetic immutable original B/S\n")
            finally:
                for child in owned:
                    if child.poll() is None:
                        child.kill()
                    child.wait(timeout=5)
                    if child.stdout is not None:
                        child.stdout.close()

    def test_main_eof_keeps_asset_watchdog_and_closes_writer_before_restart(self):
        with tempfile.TemporaryDirectory(prefix="rr-supervisor-eof-watchdog-") as directory:
            heartbeat = Path(directory) / "heartbeat"
            original = Path(directory) / "original-BS"
            original.write_bytes(b"synthetic immutable original B/S\n")
            stalled_command = [sys.executable, "-u", "-c", (
                "import os, pathlib, time\n"
                f"heartbeat = pathlib.Path({str(heartbeat)!r})\n"
                "heartbeat.write_text('started', encoding='utf-8')\n"
                f"print({marker('DMI_ASSET_PROCESSING_START', ASSET_A)!r}, flush=True)\n"
                "os.close(1)\nos.close(2)\n"
                "deadline = time.monotonic() + 5\n"
                "while time.monotonic() < deadline:\n"
                "    with heartbeat.open('a', encoding='utf-8') as handle:\n"
                "        handle.write('.')\n"
                "    time.sleep(0.01)\n"
            )]
            finished_command = [sys.executable, "-u", "-c", (
                f"print({marker('DMI_ASSET_PROCESSING_START', ASSET_B)!r}, flush=True); "
                f"print({marker('DMI_ASSET_PROCESSING_END', ASSET_B)!r}, flush=True)"
            )]
            owned = []
            results = []

            def retain_popen(*args, **kwargs):
                self.assertEqual(args[0],
                                 [supervisor.sys.executable, "-u", str(supervisor.PRODUCER)])
                skips = json.loads(kwargs["env"]["DMI_BULK_SUPERVISOR_SKIPPED_ASSETS"])
                self.assertEqual(skips, [ASSET_A] if owned else [])
                if owned:
                    self.assertIsNotNone(owned[0].poll(), "no overlapping retained writers")
                    self.assertTrue(owned[0].stdout.closed)
                    before = heartbeat.read_bytes()
                    supervisor.time.sleep(0.04)
                    self.assertEqual(heartbeat.read_bytes(), before)
                child = subprocess.Popen(finished_command if owned else stalled_command, **kwargs)
                owned.append(child)
                return child

            normal_run = supervisor.run_supervised

            def run_owned(command, environment, *, watchdog_seconds):
                result = normal_run(command, environment, watchdog_seconds=0.1,
                                    popen=retain_popen, log=lambda _line: None)
                results.append(result)
                return result

            try:
                with (
                    patch.dict(supervisor.os.environ, {}, clear=True),
                    patch.object(supervisor, "run_supervised", side_effect=run_owned) as run,
                    patch.object(supervisor, "finalize_checkpoint") as finalize,
                ):
                    self.assertEqual(supervisor.main(), 0)
                self.assertEqual(run.call_count, 2, "EOF must not retire an active asset watchdog")
                finalize.assert_not_called()
                self.assertTrue(results[0].watchdog_timed_out)
                self.assertEqual(results[0].timed_out_asset, ASSET_A)
                self.assertNotEqual(results[0].returncode, 0)
                self.assertFalse(results[1].watchdog_timed_out)
                self.assertIsNone(results[1].timed_out_asset)
                for child in owned:
                    self.assertIsNotNone(child.poll())
                    self.assertTrue(child.stdout.closed)
                self.assertEqual(original.read_bytes(), b"synthetic immutable original B/S\n")
            finally:
                for child in owned:
                    if child.poll() is None:
                        child.kill()
                    child.wait(timeout=5)
                    if child.stdout is not None:
                        child.stdout.close()

    def assert_log_pipe_stop(self, *, stop_rejected=False, watchdog=False,
                             interruption=False, reader_failure_at=None,
                             completion_wait_failure=False, active_eof=False):
        # Real writer with a real broken pipe or an injected KeyboardInterrupt
        # through main -> run_supervised. This is not an OS signal/runner-loss test.
        # Only existing Popen/clock/log seams use an owned artificial producer
        # and short test deadline; no provider or new runtime seam.
        with tempfile.TemporaryDirectory(prefix="rr-supervisor-log-stop-") as directory:
            heartbeat = Path(directory) / "heartbeat"
            original = Path(directory) / "original-BS"
            original.write_bytes(b"synthetic immutable original B/S\n")
            close_output = (
                f"print({marker('DMI_ASSET_PROCESSING_END', ASSET_A)!r}, flush=True)\n"
                if completion_wait_failure else ""
            ) + (
                "os.close(1)\nos.close(2)\n"
                if completion_wait_failure or active_eof else ""
            )
            keep_writing = (
                "deadline = time.monotonic() + 5\n"
                "while time.monotonic() < deadline:\n"
                if completion_wait_failure or active_eof else "while True:\n"
            )
            command = [sys.executable, "-u", "-c", (
                "import os, pathlib, time\n"
                f"heartbeat = pathlib.Path({str(heartbeat)!r})\n"
                "heartbeat.write_text('started', encoding='utf-8')\n"
                f"print({marker('DMI_ASSET_PROCESSING_START', ASSET_A)!r}, flush=True)\n"
                f"{close_output}"
                f"{keep_writing}"
                "    with heartbeat.open('a', encoding='utf-8') as handle:\n"
                "        handle.write('.')\n"
                "    time.sleep(0.01)\n"
            )]
            owned = []
            stop_calls = []
            log_errors = []
            rejected_stop = RuntimeError("synthetic own stop rejection")
            original_interruption = KeyboardInterrupt("synthetic main interruption")
            reader_failure = RuntimeError("synthetic own reader start failure")
            wait_calls = []

            def retain_popen(*args, **kwargs):
                self.assertEqual(args[0],
                                 [supervisor.sys.executable, "-u", str(supervisor.PRODUCER)])
                child = subprocess.Popen(command, **kwargs)
                owned.append(child)
                if completion_wait_failure:
                    normal_wait = child.wait

                    def interrupt_completion_wait(*wait_args, **wait_kwargs):
                        if not wait_args and wait_kwargs == {"timeout": 0.25}:
                            # Actual pipe EOF is not process-exit evidence. The
                            # owned producer keeps writing after closing output.
                            self.assertIsNone(child.poll())
                            before = heartbeat.read_bytes()
                            supervisor.time.sleep(0.04)
                            self.assertNotEqual(heartbeat.read_bytes(), before)
                            wait_calls.append(child.pid)
                            raise original_interruption
                        return normal_wait(*wait_args, **wait_kwargs)

                    child.wait = interrupt_completion_wait
                if reader_failure_at:
                    # Establish the actual live writer before injecting the
                    # reader's start failure; no fake Popen or private source.
                    deadline = supervisor.time.monotonic() + 5
                    while not heartbeat.exists() and supervisor.time.monotonic() < deadline:
                        supervisor.time.sleep(0.005)
                    self.assertTrue(heartbeat.exists(), "owned producer started")
                if stop_rejected:
                    def reject_stop():
                        stop_calls.append(child.pid)
                        raise rejected_stop
                    child.terminate = reject_stop
                return child

            read_fd, write_fd = os.pipe()
            os.close(read_fd)
            with os.fdopen(write_fd, "wb", buffering=0) as closed_log:
                def log_line(line):
                    if watchdog or completion_wait_failure:
                        return
                    if interruption:
                        log_errors.append(original_interruption)
                        raise original_interruption
                    try:
                        closed_log.write(line.encode("utf-8"))
                    except OSError as error:
                        log_errors.append(error)
                        raise

                normal_run = supervisor.run_supervised

                def run_owned(command, environment, *, watchdog_seconds):
                    return normal_run(command, environment, watchdog_seconds=0.1,
                                      popen=retain_popen, log=log_line)

                try:
                    reader_fail_patch = (
                        patch.object(supervisor.threading.Thread, "start", side_effect=reader_failure)
                        if reader_failure_at == "start" else
                        patch.object(supervisor.threading, "Thread", side_effect=reader_failure)
                        if reader_failure_at == "constructor" else
                        patch.object(supervisor.queue, "Queue", side_effect=reader_failure)
                        if reader_failure_at == "queue" else nullcontext()
                    )
                    with (
                        patch.dict(supervisor.os.environ, {}, clear=True),
                        patch.object(supervisor, "run_supervised", side_effect=run_owned) as run,
                        patch.object(supervisor, "finalize_checkpoint") as finalize,
                        reader_fail_patch,
                    ):
                        expected_error = (KeyboardInterrupt if interruption or completion_wait_failure else
                                          RuntimeError if watchdog or reader_failure_at
                                          else OSError)
                        with self.assertRaises(expected_error) as raised:
                            supervisor.main()
                    self.assertEqual(run.call_count, 1, "no replacement producer after hard failure")
                    finalize.assert_not_called()
                    if reader_failure_at:
                        self.assertEqual(log_errors, [])
                        self.assertIs(raised.exception, reader_failure)
                    elif completion_wait_failure:
                        self.assertEqual(log_errors, [])
                        self.assertEqual(wait_calls, [owned[0].pid])
                        self.assertIs(raised.exception, original_interruption)
                    elif interruption:
                        self.assertEqual(log_errors, [original_interruption])
                        self.assertIs(raised.exception, original_interruption,
                                      "cleanup preserves the exact BaseException")
                    elif watchdog:
                        self.assertIs(raised.exception, rejected_stop)
                        self.assertEqual(log_errors, [])
                    else:
                        self.assertEqual(len(log_errors), 1)
                        self.assertIs(raised.exception, log_errors[0],
                                      "cleanup preserves the original pipe failure")
                        self.assertEqual(raised.exception.errno,
                                         errno.EINVAL if os.name == "nt" else errno.EPIPE)
                    self.assertEqual(len(owned), 1)
                    before = heartbeat.read_bytes()
                    supervisor.time.sleep(0.08)
                    if stop_rejected:
                        self.assertEqual(stop_calls, [owned[0].pid], "no second stop attempt")
                        self.assertIsNone(owned[0].poll())
                        self.assertNotEqual(heartbeat.read_bytes(), before,
                                            "unproved stop really retains a live writer")
                        self.assertFalse(owned[0].stdout.closed)
                    else:
                        self.assertIsNotNone(owned[0].poll(),
                                             "control failure must not leave a live writer")
                        self.assertEqual(heartbeat.read_bytes(), before)
                        self.assertTrue(owned[0].stdout.closed)
                    self.assertEqual(original.read_bytes(),
                                     b"synthetic immutable original B/S\n")
                finally:
                    # RED runs still stop only their retained test child before
                    # removing this own temporary directory.
                    for child in owned:
                        if child.poll() is None:
                            child.kill()
                        child.wait(timeout=5)
                        if child.stdout is not None:
                            child.stdout.close()

    def test_invalid_short_budget_fails_before_finalize_or_producer(self):
        with tempfile.TemporaryDirectory() as directory:
            output_path = Path(directory) / "github-output.txt"
            environment = {
                "DMI_BULK_MAX_RUNTIME_SECONDS": "360",
                "DMI_BULK_SUPERVISED_FINALIZE_TIMEOUT_SECONDS": "420",
                "GITHUB_OUTPUT": str(output_path),
            }
            with (
                patch.dict(supervisor.os.environ, environment, clear=True),
                patch.object(supervisor, "run_supervised") as run,
                patch.object(supervisor, "finalize_checkpoint") as finalize,
            ):
                self.assertEqual(supervisor.main(), 2)
            run.assert_not_called()
            finalize.assert_not_called()
            written = output_path.read_text(encoding="utf-8")
            self.assertIn("terminal_code=DMI_SUPERVISOR_BUDGET_CONFLICT\n", written)
            self.assertIn("strict_current_anchor_ready=false\n", written)

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
        for closed_output in (False, True):
            with self.subTest(closed_output=closed_output):
                close = "os.close(1); os.close(2); " if closed_output else ""
                command = [
                    sys.executable, "-u", "-c",
                    (
                        "import os, time; "
                        "print('DMI_ASSET_PROCESSING_START={truncated', flush=True); "
                        f"{close}time.sleep(5)"
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

    def test_main_real_finalizer_timeout_reaps_owned_writer_before_failure(self):
        # The old timeout test injects an exception. Exercise the actual
        # subprocess.run kill/wait boundary through the normal main caller,
        # retaining only this test's process and immutable synthetic B/S.
        with tempfile.TemporaryDirectory(prefix="rr-finalizer-real-timeout-") as directory:
            output_path = Path(directory) / "github-output.txt"
            heartbeat = Path(directory) / "heartbeat"
            original = Path(directory) / "original-BS"
            original_bytes = b"synthetic immutable finalizer original B/S\n"
            original.write_bytes(original_bytes)
            command = [sys.executable, "-u", "-c", (
                "import pathlib, time\n"
                f"heartbeat = pathlib.Path({str(heartbeat)!r})\n"
                "heartbeat.write_text('started', encoding='utf-8')\n"
                "while True:\n"
                "    with heartbeat.open('a', encoding='utf-8') as handle:\n"
                "        handle.write('.')\n"
                "    time.sleep(0.01)\n"
            )]
            owned = []
            actual_timeouts = []
            actual_run = subprocess.run
            actual_popen = subprocess.Popen

            def retain_popen(*args, **kwargs):
                self.assertEqual(args[0], command)
                child = actual_popen(*args, **kwargs)
                owned.append(child)
                return child

            def run_test_finalizer(args, **kwargs):
                self.assertEqual(args,
                                 [supervisor.sys.executable, "-u", str(supervisor.PRODUCER)])
                self.assertEqual(kwargs["timeout"], 420)
                self.assertFalse(kwargs["check"])
                self.assertEqual(kwargs["cwd"], supervisor.ROOT)
                environment = kwargs["env"]
                self.assertEqual(environment["DMI_BULK_FINALIZE_ONLY"], "true")
                self.assertEqual(environment["DMI_BULK_FINALIZE_REASON"],
                                 supervisor.WATCHDOG_LIMIT_CODE)
                self.assertEqual(environment["DMI_BULK_MAX_RUNTIME_SECONDS"], "600")
                self.assertEqual(environment["DMI_BULK_FINALIZE_RESERVE_SECONDS"], "180")
                self.assertEqual(json.loads(environment["DMI_BULK_SUPERVISOR_SKIPPED_ASSETS"]), [])
                # Only the fixture's transport timeout is shortened. The
                # production command, environment and 420-second budget above
                # are unmodified and verified at the existing caller seam.
                with patch.object(supervisor.subprocess, "Popen", side_effect=retain_popen):
                    try:
                        return actual_run(command, **{**kwargs, "timeout": 0.3})
                    except subprocess.TimeoutExpired as error:
                        self.assertEqual(len(owned), 1)
                        self.assertIsNotNone(owned[0].poll(),
                                             "run must reap its own writer before raising timeout")
                        self.assertTrue(heartbeat.read_bytes().startswith(b"started"))
                        self.assertEqual(original.read_bytes(), original_bytes)
                        actual_timeouts.append(error)
                        raise

            try:
                with (
                    patch.dict(supervisor.os.environ, {"GITHUB_OUTPUT": str(output_path)}, clear=True),
                    patch.object(supervisor, "run_supervised",
                                 return_value=supervisor.SupervisedResult(-9, True, None)) as producer,
                    patch.object(supervisor.subprocess, "run", side_effect=run_test_finalizer) as finalizer,
                ):
                    self.assertEqual(supervisor.main(), 2)
                self.assertEqual(producer.call_count, 1)
                self.assertEqual(finalizer.call_count, 1)
                self.assertEqual(len(actual_timeouts), 1)
                self.assertEqual(len(owned), 1)
                self.assertIsNotNone(owned[0].poll())
                written = output_path.read_text(encoding="utf-8")
                self.assertEqual(written.count("terminal_code="), 1)
                self.assertIn("terminal_code=DMI_SUPERVISED_FINALIZE_TIMEOUT\n", written)
                self.assertIn("status=failed\n", written)
                self.assertIn("strict_current_anchor_ready=false\n", written)
                self.assertNotIn("status=success", written)
                self.assertEqual(original.read_bytes(), original_bytes)
            finally:
                for child in owned:
                    if child.poll() is None:
                        child.kill()
                    child.wait(timeout=5)

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
