"""Actual cooperative primitive on tiny owned files; NOT cohort/SAVE proof."""

import copy
import errno
import importlib.util
import os
from pathlib import Path
import queue
import shutil
import subprocess
import sys
import tempfile
import threading
import unittest
from unittest import mock


SOURCE = Path(__file__).parent / "lib" / "weather_acquisition_writer.py"
JS_SOURCE = SOURCE.with_name("weather-acquisition-writer.mjs")
RAW_OPEN, RAW_CLOSE, RAW_FSTAT = os.open, os.close, os.fstat
RAW_LSTAT, RAW_UNLINK = os.lstat, os.unlink


def load(path):
    spec = importlib.util.spec_from_file_location("weather_claim_fixture", path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


class FalsyFailure(BaseException):
    def __init__(self, payload):
        self.payload = payload

    def __bool__(self):
        return False


class Fixture:
    def __init__(self):
        self.parent = Path(tempfile.mkdtemp(prefix="rr-python-acquisition-")).resolve()
        self.root = self.parent / "checkout"
        self.cache = self.root / ".cache"
        self.file = self.cache / "weather-acquisition-writer.claim"
        self.module = self.root / "scripts" / "lib" / SOURCE.name
        self.module.parent.mkdir(parents=True)
        self.cache.mkdir()
        shutil.copyfile(SOURCE, self.module)  # Unchanged real module; no substituted root.
        self.api = load(self.module)
        self.originals = {name: f"own synthetic {name}\n".encode()
                          for name in ("original-B", "original-S", "previous-cipher")}
        for name, content in self.originals.items():
            (self.root / name).write_bytes(content)
        self.handles = []

        def opened(path, *args, **kwargs):
            fd = RAW_OPEN(path, *args, **kwargs)
            if os.fspath(path) == str(self.file):
                self.handles.append((fd, RAW_FSTAT(fd)))
            return fd

        self.patch = mock.patch.object(os, "open", side_effect=opened)
        self.patch.start()

    def intact(self, root=None):
        for name, content in self.originals.items():
            assert ((root or self.root) / name).read_bytes() == content

    def contender(self, leave=False):
        program = """import importlib.util,sys
spec=importlib.util.spec_from_file_location('claim',sys.argv[1])
m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
try:
    owner=m.acquire_weather_acquisition_writer()
    if sys.argv[2]=='release': m.release_weather_acquisition_writer(owner)
except BaseException as error:
    print(getattr(error,'code',type(error).__name__));sys.exit(2)
print('ACQUIRED')
"""
        env = {key: os.environ[key] for key in
               ("SystemRoot", "WINDIR", "TEMP", "TMP", "RUNNER_TRACKING_ID")
               if key in os.environ}
        return subprocess.run([sys.executable, "-I", "-B", "-c", program,
                               str(self.module), "leave" if leave else "release"],
                              cwd=self.root, env=env, capture_output=True, text=True,
                              timeout=5, check=False)

    def cleanup(self):
        self.patch.stop()
        # Fixture disposal only. Do not close recycled fd numbers or release an
        # uncertain product owner. Retention assertions happen before this.
        for fd, original in self.handles:
            try:
                value = RAW_FSTAT(fd)
            except OSError as error:
                if error.errno != errno.EBADF:
                    raise
            else:
                if (value.st_dev, value.st_ino) == (original.st_dev, original.st_ino):
                    RAW_CLOSE(fd)
        shutil.rmtree(self.parent)


class WeatherAcquisitionWriterTests(unittest.TestCase):
    def setUp(self):
        self.f = Fixture()
        self.addCleanup(self.f.cleanup)
        self.a = self.f.api

    def acquired(self):
        return self.a.acquire_weather_acquisition_writer()

    def blocked(self, owner):
        with self.assertRaises(self.a.WeatherAcquisitionWriterError):
            self.a.assert_weather_acquisition_writer(owner)
        with self.assertRaises(self.a.WeatherAcquisitionWriterError):
            self.a.release_weather_acquisition_writer(owner)
        with self.assertRaises(self.a.WeatherAcquisitionWriterError):
            self.acquired()
        self.assertEqual(self.f.contender().returncode, 2)
        self.f.intact()

    def assertSameFailure(self, expected, action):
        try:
            action()
        except BaseException as caught:
            self.assertIs(caught, expected)
        else:
            self.fail("must retain the exact first exception, even if falsy")

    def test_real_process_contention_release_and_successor(self):
        owner = self.acquired()
        self.assertFalse(hasattr(owner, "__dict__"))
        self.assertFalse(hasattr(owner, "__enter__"))
        self.a.assert_weather_acquisition_writer(owner)
        self.assertEqual(self.f.file.stat().st_size, 0)
        self.assertEqual(self.f.contender().returncode, 2)
        fd = self.f.handles[0][0]
        self.a.release_weather_acquisition_writer(owner)
        with self.assertRaises(OSError) as closed:
            RAW_FSTAT(fd)
        self.assertEqual(closed.exception.errno, errno.EBADF)
        self.assertFalse(self.f.file.exists())
        with self.assertRaises(self.a.WeatherAcquisitionWriterError):
            self.a.release_weather_acquisition_writer(owner)
        self.assertEqual(self.f.contender().returncode, 0)
        self.f.intact()

    def test_dead_owner_unknown_claim_is_never_adopted(self):
        result = self.f.contender(leave=True)
        self.assertEqual(result.returncode, 0, result.stderr)
        before = self.f.file.stat()
        # Actual child is closed; age/PID absence must not authorize reclamation.
        os.utime(self.f.file, (1, 1))
        with self.assertRaises(FileExistsError):
            self.acquired()
        self.assertEqual(self.f.file.stat().st_ino, before.st_ino)
        self.assertEqual(self.f.file.read_bytes(), b"")
        self.assertEqual(self.f.handles, [])
        self.f.intact()

    def test_opaque_foreign_copied_and_extra_arguments_refuse(self):
        owner = self.acquired()
        foreign = load(self.f.module)
        for fake in ({}, object(), copy.copy(owner), None):
            with self.assertRaises(self.a.WeatherAcquisitionWriterError):
                self.a.release_weather_acquisition_writer(fake)
        with self.assertRaises(foreign.WeatherAcquisitionWriterError):
            foreign.release_weather_acquisition_writer(owner)
        with self.assertRaises(TypeError):
            self.a.acquire_weather_acquisition_writer(self.f.root)
        self.a.release_weather_acquisition_writer(owner)
        self.f.intact()

    def test_thread_contender_and_irreversible_retain(self):
        owner = self.acquired()
        errors = []

        def competing():
            try:
                self.acquired()
            except BaseException as error:
                errors.append(error)

        thread = threading.Thread(target=competing)
        thread.start()
        thread.join(2)
        self.assertFalse(thread.is_alive())
        self.assertEqual(len(errors), 1)
        self.assertEqual(errors[0].code, "WEATHER_ACQUISITION_WRITER_BUSY")
        self.a.retain_weather_acquisition_writer(owner)
        self.a.retain_weather_acquisition_writer(owner)
        self.blocked(owner)
        RAW_FSTAT(self.f.handles[0][0])

    def test_modified_empty_claim_refuses_and_keeps_fd(self):
        owner = self.acquired()
        os.write(self.f.handles[0][0], b"changed")
        self.blocked(owner)
        self.assertEqual(self.f.file.read_bytes(), b"changed")
        RAW_FSTAT(self.f.handles[0][0])

    def test_recycled_fd_is_not_closed_or_unlinked(self):
        owner = self.acquired()
        fd = self.f.handles[0][0]
        RAW_CLOSE(fd)
        replacement = self.f.parent / "replacement"
        replacement.write_bytes(b"foreign fd")
        other = RAW_OPEN(replacement, os.O_RDONLY)
        try:
            if other != fd:
                os.dup2(other, fd)
            with mock.patch.object(os, "close", wraps=RAW_CLOSE) as closing:
                with self.assertRaises(self.a.WeatherAcquisitionWriterError):
                    self.a.release_weather_acquisition_writer(owner)
                self.assertEqual(closing.call_count, 0)
            self.blocked(owner)
            self.assertEqual(RAW_FSTAT(fd).st_ino, replacement.stat().st_ino)
            self.assertTrue(self.f.file.exists())
        finally:
            RAW_CLOSE(fd)
            if other != fd:
                RAW_CLOSE(other)

    def test_replaced_claim_after_close_is_never_unlinked(self):
        owner = self.acquired()

        def closing(fd):
            RAW_CLOSE(fd)
            self.f.file.rename(str(self.f.file) + ".own")
            self.f.file.write_bytes(b"replacement")

        with mock.patch.object(os, "close", side_effect=closing) as closed:
            with mock.patch.object(os, "unlink", wraps=RAW_UNLINK) as unlink:
                with self.assertRaises(self.a.WeatherAcquisitionWriterError):
                    self.a.release_weather_acquisition_writer(owner)
                self.assertEqual(closed.call_count, 1)
                self.assertEqual(unlink.call_count, 0)
        self.blocked(owner)
        self.assertEqual(self.f.file.read_bytes(), b"replacement")

    def test_replaced_cache_and_root_identities_refuse(self):
        # Windows prohibits directory moves around a CRT-open file: perform
        # each actual replacement in the close seam, before own unlink.
        for changed in ("cache", "root"):
            with self.subTest(changed=changed):
                f = Fixture()
                try:
                    owner = f.api.acquire_weather_acquisition_writer()
                    original_root = f.root

                    def closing(fd):
                        nonlocal original_root
                        RAW_CLOSE(fd)
                        old = f.parent / "old"
                        if changed == "cache":
                            f.cache.rename(old)
                            f.cache.mkdir()
                        else:
                            f.root.rename(old)
                            original_root = old
                            f.cache.mkdir(parents=True)
                        # Reuse exact claim inode: reject directory identity,
                        # not merely a different claim or missing path.
                        (old / (".cache" if changed == "root" else "") / f.file.name).rename(f.file)

                    with mock.patch.object(os, "close", side_effect=closing):
                        with mock.patch.object(os, "unlink", wraps=RAW_UNLINK) as unlink:
                            with self.assertRaises(f.api.WeatherAcquisitionWriterError):
                                f.api.release_weather_acquisition_writer(owner)
                            self.assertEqual(unlink.call_count, 0)
                    self.assertTrue(f.file.exists())
                    f.intact(original_root)
                finally:
                    f.cleanup()

    def test_noop_close_retains_one_actual_open_fd(self):
        owner = self.acquired()
        with mock.patch.object(os, "close", return_value=None) as closing:
            with self.assertRaises(self.a.WeatherAcquisitionWriterError) as failure:
                self.a.release_weather_acquisition_writer(owner)
            self.assertEqual(failure.exception.code, "WEATHER_ACQUISITION_WRITER_CLOSE_UNPROVED")
            self.assertEqual(closing.call_count, 1)
        self.blocked(owner)
        RAW_FSTAT(self.f.handles[0][0])

    def test_falsy_first_close_failure_survives_secondary_probe(self):
        for payload in (0, None):
            with self.subTest(payload=payload):
                f = Fixture()
                try:
                    owner = f.api.acquire_weather_acquisition_writer()
                    primary = FalsyFailure(payload)
                    after = False

                    def closing(fd):
                        nonlocal after
                        after = True
                        raise primary

                    def probe(fd):
                        if after:
                            raise PermissionError(errno.EACCES, "unknown close")
                        return RAW_FSTAT(fd)

                    with mock.patch.object(os, "close", side_effect=closing) as closed:
                        with mock.patch.object(os, "fstat", side_effect=probe):
                            self.assertSameFailure(primary, lambda: f.api.release_weather_acquisition_writer(owner))
                        self.assertEqual(closed.call_count, 1)
                    RAW_FSTAT(f.handles[0][0])
                    self.assertEqual(f.contender().returncode, 2)
                    f.intact()
                finally:
                    f.cleanup()

    def test_actual_close_then_falsy_error_preserves_error_and_releases(self):
        owner = self.acquired()
        primary = FalsyFailure(None)

        def closing(fd):
            RAW_CLOSE(fd)
            raise primary

        with mock.patch.object(os, "close", side_effect=closing) as closed:
            self.assertSameFailure(primary, lambda: self.a.release_weather_acquisition_writer(owner))
            self.assertEqual(closed.call_count, 1)
        self.assertFalse(self.f.file.exists())
        self.assertEqual(self.f.contender().returncode, 0)
        self.f.intact()

    def test_inherited_ebadf_does_not_prove_close(self):
        class InheritedBadFd(OSError):
            pass

        owner = self.acquired()
        after = False

        def closing(fd):
            nonlocal after
            after = True  # Deliberately no close.

        def probe(fd):
            if after:
                raise InheritedBadFd(errno.EBADF, "not a raw closure observation")
            return RAW_FSTAT(fd)

        with mock.patch.object(os, "close", side_effect=closing):
            with mock.patch.object(os, "fstat", side_effect=probe):
                with self.assertRaises(self.a.WeatherAcquisitionWriterError) as failure:
                    self.a.release_weather_acquisition_writer(owner)
        self.assertEqual(failure.exception.code, "WEATHER_ACQUISITION_WRITER_CLOSE_UNPROVED")
        RAW_FSTAT(self.f.handles[0][0])
        self.blocked(owner)

    def test_noop_unlink_retains_claim_and_refuses_repeated_release(self):
        owner = self.acquired()
        with mock.patch.object(os, "unlink", return_value=None) as unlink:
            with self.assertRaises(self.a.WeatherAcquisitionWriterError) as failure:
                self.a.release_weather_acquisition_writer(owner)
            self.assertEqual(failure.exception.code, "WEATHER_ACQUISITION_WRITER_RELEASE_UNPROVED")
            self.blocked(owner)
            self.assertEqual(unlink.call_count, 1)

    def test_actual_unlink_then_falsy_error_keeps_first_cause(self):
        owner = self.acquired()
        primary = FalsyFailure(0)

        def unlink(path):
            RAW_UNLINK(path)
            raise primary

        with mock.patch.object(os, "unlink", side_effect=unlink) as removed:
            self.assertSameFailure(primary, lambda: self.a.release_weather_acquisition_writer(owner))
            self.assertEqual(removed.call_count, 1)
        self.assertFalse(self.f.file.exists())
        self.assertEqual(self.f.contender().returncode, 0)
        self.f.intact()

    def test_missing_cache_and_preopen_error_do_not_create_or_adopt(self):
        self.f.cache.rmdir()
        with self.assertRaises(FileNotFoundError):
            self.acquired()
        self.assertFalse(self.f.cache.exists())
        self.f.cache.mkdir()
        primary = FalsyFailure(0)

        def unavailable(path, *args, **kwargs):
            if os.fspath(path) == str(self.f.cache):
                raise primary
            return RAW_LSTAT(path, *args, **kwargs)

        with mock.patch.object(os, "lstat", side_effect=unavailable):
            self.assertSameFailure(primary, self.acquired)
        self.assertEqual(self.f.handles, [])
        owner = self.acquired()
        self.a.release_weather_acquisition_writer(owner)
        self.f.intact()

    def test_postopen_error_retains_partly_verified_actual_resource(self):
        primary = FalsyFailure(None)
        with mock.patch.object(os, "fstat", side_effect=primary):
            self.assertSameFailure(primary, self.acquired)
        RAW_FSTAT(self.f.handles[0][0])
        with self.assertRaises(self.a.WeatherAcquisitionWriterError):
            self.acquired()
        self.assertEqual(self.f.contender().returncode, 2)
        self.f.intact()

    def node_command(self, mode):
        node = shutil.which("node")
        self.assertIsNotNone(node, "normal cross-language target requires Node on PATH; never skip")
        module = self.f.module.with_name(JS_SOURCE.name)
        if not module.exists():
            shutil.copyfile(JS_SOURCE, module)
        self.assertEqual(module.read_bytes(), JS_SOURCE.read_bytes())
        self.assertEqual(self.f.module.read_bytes(), SOURCE.read_bytes())
        program = """const m = await import(process.argv[1]);
try {
  const owner = await m.acquireWeatherAcquisitionWriter();
  if (process.argv[2] === 'hold') {
    process.stdout.write('OWNED\\n');
    await new Promise((resolve, reject) => {
      process.stdin.once('data', data => ['release\\n', 'release\\r\\n'].includes(data.toString())
        ? resolve() : reject(new Error('unexpected fixture command')));
      process.stdin.once('end', () => reject(new Error('fixture command missing')));
    });
  }
  await m.releaseWeatherAcquisitionWriter(owner);
  process.stdout.write('RELEASED\\n');
  process.stdin.destroy();
} catch (error) {
  process.stdout.write(String(error?.code ?? 'FAILED') + '\\n');
  process.exitCode = 2;
}
"""
        env = {key: os.environ[key] for key in
               ("SystemRoot", "WINDIR", "TEMP", "TMP", "RUNNER_TRACKING_ID")
               if key in os.environ}
        return ([node, "--input-type=module", "-e", program, module.as_uri(), mode], env)

    def node_contender(self):
        command, env = self.node_command("contend")
        return subprocess.run(command, cwd=self.f.root, env=env, capture_output=True,
                              text=True, timeout=5, check=False)

    def node_holder(self):
        command, env = self.node_command("hold")
        child = subprocess.Popen(command, cwd=self.f.root, env=env, stdin=subprocess.PIPE,
                                 stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
        lines = queue.Queue()
        reader = threading.Thread(target=lambda: lines.put(child.stdout.readline()), daemon=True)

        def cleanup():
            if child.poll() is None:
                child.kill()  # Exact test-owned direct child; it creates no descendants.
            child.wait(timeout=5)
            reader.join(timeout=5)
            self.assertFalse(reader.is_alive(), "test-owned stdout reader must stop")
            for pipe in (child.stdin, child.stdout, child.stderr):
                pipe.close()

        self.addCleanup(cleanup)  # Runs before fixture deletion, including failure paths.
        reader.start()
        self.assertEqual(lines.get(timeout=5), "OWNED\n")
        reader.join(timeout=5)
        self.assertFalse(reader.is_alive())
        self.assertIsNone(child.poll())
        return child

    def test_cross_language_live_owners_exclude_and_release_to_other_language(self):
        owner = self.acquired()
        result = self.node_contender()
        self.assertEqual((result.returncode, result.stdout), (2, "EEXIST\n"), result.stderr)
        self.a.assert_weather_acquisition_writer(owner)
        self.a.release_weather_acquisition_writer(owner)
        self.assertFalse(self.f.file.exists())
        result = self.node_contender()
        self.assertEqual((result.returncode, result.stdout), (0, "RELEASED\n"), result.stderr)
        self.assertFalse(self.f.file.exists())

        child = self.node_holder()
        result = self.f.contender()
        self.assertEqual((result.returncode, result.stdout), (2, "FileExistsError\n"), result.stderr)
        stdout, stderr = child.communicate("release\n", timeout=5)
        self.assertEqual((child.returncode, stdout), (0, "RELEASED\n"), stderr)
        self.assertFalse(self.f.file.exists())
        result = self.f.contender()
        self.assertEqual((result.returncode, result.stdout), (0, "ACQUIRED\n"), result.stderr)
        self.assertFalse(self.f.file.exists())
        self.f.intact()

    def test_cross_language_node_refuses_claim_left_by_exited_python(self):
        result = self.f.contender(leave=True)
        self.assertEqual((result.returncode, result.stdout), (0, "ACQUIRED\n"), result.stderr)
        before = self.f.file.stat()
        result = self.node_contender()
        self.assertEqual((result.returncode, result.stdout), (2, "EEXIST\n"), result.stderr)
        after = self.f.file.stat()
        self.assertEqual((after.st_dev, after.st_ino, after.st_mtime_ns),
                         (before.st_dev, before.st_ino, before.st_mtime_ns))
        self.assertEqual(self.f.file.read_bytes(), b"")
        self.f.intact()

    def test_cross_language_python_refuses_claim_left_by_killed_node(self):
        child = self.node_holder()
        before = self.f.file.stat()
        child.kill()
        child.communicate(timeout=5)  # Actual terminal child, not a PID/expiry assumption.
        self.assertNotEqual(child.returncode, 0)
        result = self.f.contender()
        self.assertEqual((result.returncode, result.stdout), (2, "FileExistsError\n"), result.stderr)
        after = self.f.file.stat()
        self.assertEqual((after.st_dev, after.st_ino, after.st_mtime_ns),
                         (before.st_dev, before.st_ino, before.st_mtime_ns))
        self.assertEqual(self.f.file.read_bytes(), b"")
        self.f.intact()


if __name__ == "__main__":
    unittest.main()
