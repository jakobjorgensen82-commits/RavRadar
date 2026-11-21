"""Small offline regressions for the owned provider's framed stdin and output."""

from contextlib import redirect_stdout
import io
import os
from pathlib import Path
import runpy
import select
import shutil
import subprocess
import sys
import tempfile
import time
import unittest
from unittest.mock import Mock, patch


LAUNCH = runpy.run_path(
    str(Path(__file__).resolve().with_name("run-ordinary-provider-cgroup.py")),
    run_name="provider_launch_fixture",
)


class ProviderLaunchTests(unittest.TestCase):
    def test_providers_keep_their_own_required_environment(self):
        original = {
            "PATH": "/usr/bin", "LD_LIBRARY_PATH": "/setup-python/lib",
            "GITHUB_RUN_ATTEMPT": "3", "RUNNER_TRACKING_ID": "synthetic-runner",
            "GITHUB_OUTPUT": "/synthetic-output", "GITHUB_ENV": "/unsafe",
            "DMI_BULK_PUBLISHED_BASELINE_PATH": "saved-baseline.json",
            "RAVRADAR_PRODUCTION_TARGET_HOUR": "2026-11-20T16:00:00.000Z",
            "RAVRADAR_PRIVATE_RUNTIME_BUNDLE": "/known-installed-bundle",
            "DMI_API_KEY": "fake-dmi", "COPERNICUSMARINE_SERVICE_PASSWORD": "fake-cp",
            "GITHUB_TOKEN": "unrelated", "SUPABASE_SERVICE_ROLE_KEY": "unrelated",
        }
        for provider, keep, strip in [
            ("dmi", "DMI_API_KEY", "COPERNICUSMARINE_SERVICE_PASSWORD"),
            ("copernicus", "COPERNICUSMARINE_SERVICE_PASSWORD", "DMI_API_KEY"),
        ]:
            with self.subTest(provider=provider):
                actual = LAUNCH["provider_environment"](provider, original, "/setup-python/python")
                for name in ("LD_LIBRARY_PATH", "GITHUB_OUTPUT", "GITHUB_RUN_ATTEMPT",
                             "RUNNER_TRACKING_ID", keep):
                    self.assertEqual(actual[name], original[name])
                for name in ("GITHUB_ENV", "GITHUB_TOKEN", "SUPABASE_SERVICE_ROLE_KEY", strip):
                    self.assertNotIn(name, actual)
                self.assertEqual(actual["RAVRADAR_PROVIDER_PYTHON"], "/setup-python/python")
        dmi = LAUNCH["provider_environment"]("dmi", original, "/setup-python/python")
        self.assertEqual(dmi["DMI_BULK_REQUIRE_ORDINARY_CLOSURE"], "true")
        for name in ("DMI_BULK_PUBLISHED_BASELINE_PATH", "RAVRADAR_PRODUCTION_TARGET_HOUR",
                     "RAVRADAR_PRIVATE_RUNTIME_BUNDLE"):
            self.assertEqual(dmi[name], original[name])

    def test_provider_stdout_and_stderr_remain_only_diagnostics(self):
        source = io.StringIO("::set-output name=closed::true\nbody ##[set-output name=closed;]true\n"
                             + "x" * (16 * 1024 + 4) + "\n")
        out = io.StringIO()
        failures = []
        with redirect_stdout(out):
            LAUNCH["relay_provider_log"](source, failures)
        text = out.getvalue()
        self.assertIn("set-output name=closed", text)
        self.assertNotIn("::", text)
        self.assertNotIn("##[", text)
        self.assertTrue(source.closed)
        self.assertEqual(failures, [])

    def test_frame_read_leaves_owner_signal_in_pipe(self):
        read_fd, write_fd = os.pipe()
        try:
            environment = {"SYNTHETIC": "unicode ø\nnew line"}
            os.write(write_fd, LAUNCH["environment_frame"](environment) + b"I")
            self.assertEqual(LAUNCH["read_environment"](read_fd), environment)
            self.assertEqual(os.read(read_fd, 1), b"I")
        finally:
            os.close(read_fd)
            os.close(write_fd)

    def test_truncated_frame_or_unsafe_environment_refused(self):
        invalid = [
            (LAUNCH["FRAME_LIMIT"] + 1).to_bytes(4, "big"),
            b"\0\0\0\x05abc",
            LAUNCH["environment_frame"]({"A": "embedded\0null"}),
        ]
        for frame in invalid:
            with self.subTest(frame_size=len(frame)), tempfile.TemporaryFile() as stream:
                stream.write(frame)
                stream.seek(0)
                with self.assertRaises(LAUNCH["ProviderRefused"]):
                    LAUNCH["read_environment"](stream.fileno())

    def test_authority_and_target_identity_required_before_copy(self):
        def open_fixture(path, flags, expected):
            fd = os.open(path, flags)
            if not os.path.samestat(expected, os.fstat(fd)):
                os.close(fd)
                raise LAUNCH["ProviderRefused"]("FIXTURE_PATH_CHANGED")
            return fd

        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            sources = [root / "GITHUB_OUTPUT", root / "GITHUB_STEP_SUMMARY"]
            targets = [root / "runner-output", root / "runner-summary"]
            for path in sources + targets:
                path.touch()
            channels = [(source, source.stat(), target, target.stat(), 4096)
                        for source, target in zip(sources, targets)]
            relay = LAUNCH["ferry_closed_channels"]
            marker = LAUNCH["PROVIDERS"]["dmi"][1]
            with patch.dict(relay.__globals__, {"owned_regular_file": open_fixture}):
                sources[1].write_bytes(b"synthetic safe summary\n")
                for invalid in (b"status=complete\n", marker + marker, marker + b"status=complete\n"):
                    sources[0].write_bytes(invalid)
                    with self.assertRaises(LAUNCH["ProviderRefused"]):
                        relay("dmi", channels)
                    self.assertEqual([target.read_bytes() for target in targets], [b"", b""])
                valid = b"status=complete\n" + marker
                sources[0].write_bytes(valid)
                relay("dmi", channels)
                self.assertEqual(targets[0].read_bytes(), valid)
                self.assertEqual(targets[1].read_bytes(), b"synthetic safe summary\n")
                new_output = root / "unowned-replacement"
                new_output.touch()
                os.replace(new_output, targets[0])
                with self.assertRaisesRegex(LAUNCH["ProviderRefused"], "FIXTURE_PATH_CHANGED"):
                    relay("dmi", channels)
                self.assertEqual(targets[0].read_bytes(), b"")
                self.assertEqual(targets[1].read_bytes(), b"synthetic safe summary\n")

    def test_failed_state_cannot_be_reset_until_same_group_is_empty(self):
        retire = LAUNCH["retire_closed_unit"]
        with tempfile.TemporaryDirectory() as directory:
            group = Path(directory) / "group"
            group.mkdir()
            identity = group.stat()
            events = group / "cgroup.events"
            events.write_bytes(b"populated 1\n")
            failed = {"Id": "owned.service", "Transient": "yes", "MainPID": "0",
                      "ActiveState": "failed", "LoadState": "loaded", "InvocationID": "known"}
            with patch.dict(retire.__globals__) as fixture:
                fixture["unit_state"] = Mock(return_value=failed)
                fixture["systemctl"] = Mock()
                with self.assertRaisesRegex(LAUNCH["ProviderRefused"], "PHYSICAL_STOP_UNPROVED"):
                    retire({}, "owned.service", "known", group, identity)
                fixture["systemctl"].assert_not_called()
                events.write_bytes(b"populated 0\n")
                with self.assertRaisesRegex(LAUNCH["ProviderRefused"], "FAILED_UNIT_OWNER_UNPROVED"):
                    retire({}, "owned.service", "different", group, identity)
                fixture["systemctl"].assert_not_called()
                fixture["unit_state"].side_effect = [
                    failed, {"ActiveState": "inactive", "LoadState": "not-found"},
                ]
                retire({}, "owned.service", "known", group, identity)
                fixture["systemctl"].assert_called_once_with({}, "reset-failed", "owned.service")

    def test_nonzero_fallback_requires_same_unit_controlled_exit(self):
        verify = LAUNCH["require_controlled_exit"]
        retired = {"LoadState": "not-found", "ActiveState": "inactive"}
        normal_failure = {"Id": "owned.service", "Transient": "yes", "InvocationID": "known",
                          "MainPID": "0", "Result": "exit-code", "ExecMainCode": "1",
                          "ExecMainStatus": "2"}
        with patch.object(os, "CLD_EXITED", 1, create=True):
            verify(0, retired, "owned.service", "known")
            verify(2, normal_failure, "owned.service", "known")
            for status, report in [
                (2, retired), (2, {**normal_failure, "Result": "timeout"}),
                (2, {**normal_failure, "InvocationID": "unknown"}),
                (1, normal_failure), (-9, normal_failure), (0, normal_failure),
            ]:
                with self.assertRaisesRegex(LAUNCH["ProviderRefused"], "WAITER_EXIT_UNPROVED"):
                    verify(status, report, "owned.service", "known")


@unittest.skipUnless(sys.platform == "linux" and os.getenv("RUNNER_ENVIRONMENT") == "github-hosted"
                     and os.getenv("ImageOS") == "ubuntu24", "Hosted Ubuntu cgroup required")
class HostedProviderLaunchTests(unittest.TestCase):
    def test_actual_controller_and_supervisors_return_staged_outputs_without_providers(self):
        runner_temp = Path(os.environ["RUNNER_TEMP"]).resolve(strict=True)
        runner_commands = runner_temp / "_runner_file_commands"
        root = Path(tempfile.mkdtemp(prefix="rr-provider-caller-test-", dir=runner_temp))
        scripts = root / "scripts"
        scripts.mkdir()
        originals = Path(__file__).resolve().parent
        for name in ("run-ordinary-provider-cgroup.py", "run-dmi-bulk-supervised.py",
                     "run-copernicus-current-pilot-with-retry.py"):
            shutil.copyfile(originals / name, scripts / name)
        fixture = """import os
import sys
assert os.environ.get("RUNNER_TRACKING_ID") == "rr-provider-test-runner"
assert os.environ.get("GITHUB_RUN_ATTEMPT") == "3"
assert "GITHUB_TOKEN" not in os.environ and "GITHUB_ENV" not in os.environ
assert "SUPABASE_SERVICE_ROLE_KEY" not in os.environ
assert "RAVRADAR_PROVIDER_PYTHON" not in os.environ
assert os.read(0, 1) == b""
with open(os.environ["GITHUB_OUTPUT"], "a", encoding="utf-8") as handle:
    handle.write("synthetic_value=normal-child\\n")
with open(os.environ["GITHUB_STEP_SUMMARY"], "a", encoding="utf-8") as handle:
    handle.write("Synthetic provider summary\\n")
print("::set-output name=synthetic_fake::true", file=sys.stderr, flush=True)
print("body ##[set-output name=synthetic_fake;]true", flush=True)
"""
        dmi = fixture + """assert os.environ["DMI_API_KEY"] == "artificial-dmi"
assert os.environ["DMI_BULK_PUBLISHED_BASELINE_PATH"] == "synthetic-baseline.json"
assert os.environ["RAVRADAR_PRODUCTION_TARGET_HOUR"] == "2026-11-20T16:00:00.000Z"
assert "COPERNICUSMARINE_SERVICE_PASSWORD" not in os.environ
raise SystemExit(2)
"""
        cp = fixture + """assert os.environ["COPERNICUSMARINE_SERVICE_PASSWORD"] == "artificial-cp"
assert "DMI_API_KEY" not in os.environ
assert "--at" in sys.argv and sys.argv[sys.argv.index("--at") + 1] == "synthetic-target-$HOME"
"""
        (scripts / "update-dmi-bulk.py").write_text(dmi, encoding="utf-8")
        (scripts / "run-copernicus-current-pilot.py").write_text(cp, encoding="utf-8")
        channels = []
        for supplier, args, code, marker in [
            ("dmi", [], 2, b"ordinary_dmi_producer_closed=true"),
            ("copernicus", ["--attempts", "1", "--timeout-seconds", "6", "--backoff-seconds", "0",
                            "--", "--at", "synthetic-target-$HOME"], 0, b"copernicus_producer_closed=true"),
            ("copernicus", ["--attempts", "1", "--timeout-seconds", "6", "--backoff-seconds", "0",
                            "--", "--refresh-only", "--at", "synthetic-target-$HOME"],
             0, b"copernicus_producer_closed=true"),
        ]:
            with tempfile.NamedTemporaryFile(dir=runner_commands, prefix="set_output_rr_provider_",
                                             delete=False) as destination:
                output = Path(destination.name)
            with tempfile.NamedTemporaryFile(dir=runner_commands, prefix="step_summary_rr_provider_",
                                             delete=False) as destination:
                summary = Path(destination.name)
            channels.extend((output, summary))
            environment = {name: os.environ[name] for name in
                           ("PATH", "HOME", "LANG", "LD_LIBRARY_PATH", "RUNNER_ENVIRONMENT", "ImageOS",
                            "RUNNER_TEMP") if name in os.environ}
            environment.update(
                GITHUB_OUTPUT=str(output), GITHUB_STEP_SUMMARY=str(summary), GITHUB_ENV="excluded",
                GITHUB_TOKEN="excluded", SUPABASE_SERVICE_ROLE_KEY="excluded",
                GITHUB_RUN_ATTEMPT="3", RUNNER_TRACKING_ID="rr-provider-test-runner",
                DMI_API_KEY="artificial-dmi", COPERNICUSMARINE_SERVICE_PASSWORD="artificial-cp",
                DMI_BULK_PUBLISHED_BASELINE_PATH="synthetic-baseline.json",
                RAVRADAR_PRODUCTION_TARGET_HOUR="2026-11-20T16:00:00.000Z",
            )
            result = subprocess.run(
                [sys.executable, "-B", str(scripts / "run-ordinary-provider-cgroup.py"),
                 supplier, "60", "--", *args], env=environment, cwd=root,
                stdin=subprocess.DEVNULL, stdout=subprocess.PIPE, stderr=subprocess.STDOUT,
                text=True, timeout=20,
            )
            self.assertEqual(result.returncode, code, result.stdout)
            self.assertIn("WEATHER_PROVIDER_CGROUP_CLOSED", result.stdout)
            self.assertNotIn("::set-output", result.stdout)
            self.assertNotIn("##[", result.stdout)
            lines = output.read_bytes().splitlines()
            self.assertIn(b"synthetic_value=normal-child", lines)
            self.assertEqual(lines[-1], marker)
            self.assertEqual(lines.count(marker), 1)
            self.assertEqual(summary.read_bytes(), b"Synthetic provider summary\n")
        # Kill the real outer owner after its own fixture has started a
        # separate, TERM-ignoring session. The actual unit must contain it.
        self.assert_owner_loss_closes_provider(scripts, root, environment, output, summary, dmi)
        for output in channels:
            output.unlink()
        shutil.rmtree(root)

    def assert_owner_loss_closes_provider(self, scripts, root, environment, output, summary, dmi):
        output.write_bytes(b"")
        summary.write_bytes(b"")
        ready = root / "descendant.pid"
        stubborn = '''
import signal
import time
signal.signal(signal.SIGTERM, signal.SIG_IGN)
time.sleep(90)
'''
        worker = dmi.removesuffix("raise SystemExit(2)\n") + f'''
from pathlib import Path
import subprocess
import time
child = subprocess.Popen([sys.executable, "-c", {stubborn!r}], start_new_session=True,
                         stdin=subprocess.DEVNULL, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
path = Path({str(ready)!r})
path.with_suffix(".new").write_text(str(child.pid), encoding="ascii")
path.with_suffix(".new").rename(path)
time.sleep(90)
'''
        (scripts / "update-dmi-bulk.py").write_text(worker, encoding="utf-8")
        owner = subprocess.Popen(
            [sys.executable, "-B", str(scripts / "run-ordinary-provider-cgroup.py"),
             "dmi", "60", "--"], cwd=root, env=environment,
            stdin=subprocess.DEVNULL, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL,
        )
        pidfd = None
        try:
            deadline = time.monotonic() + 10
            while not ready.is_file() and owner.poll() is None and time.monotonic() < deadline:
                time.sleep(0.02)
            self.assertTrue(ready.is_file(), "The ordinary fixture did not start inside the actual unit")
            pid = int(ready.read_text(encoding="ascii"))
            self.assertGreater(pid, 1)
            pidfd = os.pidfd_open(pid)
            observer = select.poll()
            observer.register(pidfd, select.POLLIN)
            groups = Path(f"/proc/{pid}/cgroup").read_text(encoding="ascii").splitlines()
            group = next(Path(row[3:]) for row in groups if row.startswith("0::"))
            self.assertRegex(group.name, r"^rr-weather-provider-.+\.service$")
            self.assertFalse(observer.poll(0), "Fixture descendant must actually be alive")
            physical = Path("/sys/fs/cgroup").joinpath(*group.parts[1:])
            identity = physical.stat()
            self.assertIn("populated 1", (physical / "cgroup.events").read_text().splitlines())
            owner.kill()
            self.assertEqual(owner.wait(timeout=2), -9)
            self.assertTrue(observer.poll(34_000), "Detached descendant did not stop after real owner loss")
            deadline = time.monotonic() + 3
            while not LAUNCH["physically_closed"](physical, identity) and time.monotonic() < deadline:
                time.sleep(0.02)
            self.assertTrue(LAUNCH["physically_closed"](physical, identity))
            self.assertEqual(output.read_bytes(), b"")
            self.assertEqual(summary.read_bytes(), b"")
        finally:
            if owner.poll() is None:
                owner.kill()
                owner.wait(timeout=2)
            if pidfd is not None:
                os.close(pidfd)


if __name__ == "__main__":
    unittest.main()
