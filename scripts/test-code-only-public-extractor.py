"""Thirteen small actual-CLI contracts for the sealed public-source extractor.

Run with the normal Linux Python 3.12 source-validation runtime:
  python -I -B scripts/test-code-only-public-extractor.py --extractor PATH --extractor-sha256 SHA
No imports from or substitutions into the extractor; no network or external packages.
"""

import argparse
import hashlib
import io
import json
import pathlib
import struct
import subprocess
import sys
import tarfile
import tempfile
import time
import unittest
import warnings
import zipfile


EXTRACTOR = None
EXTRACTOR_SHA256 = None
LONG_PUBLIC_NAME = "public/" + "ordinary-public-asset-" * 7 + "tail.txt"
OUTPUT_NAMES = (
    "manifest.json",
    "public-conditions.json",
    "public-condition-details.json",
    "coastal-parts-v2.json",
    "zones.geojson",
    "water-level-station-routing.json",
)
PUBLIC_PATHS = (
    "data/live/manifest.json",
    "data/live/public-conditions.json",
    "data/live/public-condition-details.json",
    "data/live/coastal-parts-v2.json",
    "data/zones.geojson",
    "data/water-level-station-routing.json",
)


def digest(value):
    return hashlib.sha256(value).hexdigest()


def public_payloads():
    details = b'{"synthetic":true}\n'
    manifest = json.dumps(
        {"publicConditionDetailsBytes": len(details)},
        separators=(",", ":"),
    ).encode("utf-8") + b"\n"
    return dict(zip(OUTPUT_NAMES, (
        manifest,
        b'{"synthetic":"startup"}\n',
        details,
        b'{"synthetic":"coastal"}\n',
        b'{"synthetic":"zones"}\n',
        b'{"synthetic":"routing"}\n',
    )))


def make_tar(format_id=tarfile.GNU_FORMAT, tail=None, details_oversize=False):
    payloads = public_payloads()
    if details_oversize:
        # Keep both archive and expected raw manifest byte-identical. Only the
        # actual details member exceeds its manifest-declared size by one byte.
        payloads["public-condition-details.json"] += b" "
    output = io.BytesIO()
    with tarfile.open(fileobj=output, mode="w", format=format_id) as archive:
        entries = [(LONG_PUBLIC_NAME, b"ignored public content\n")]
        entries.extend(zip(PUBLIC_PATHS, payloads.values()))
        entries.append(("public/after-six.txt", b"ignored after selected files\n"))
        if tail is not None:
            entries.append(tail)
        for name, content in entries:
            info = tarfile.TarInfo("./" + name if not name.startswith("..") else name)
            info.size = len(content)
            info.mode = 0o644
            info.mtime = 1
            if format_id == tarfile.PAX_FORMAT:
                info.pax_headers = {"mtime": "1.25"}
            archive.addfile(info, io.BytesIO(content))
    raw = output.getvalue()
    if len(raw) > 40 * 1024:
        raise AssertionError("Fixture unexpectedly exceeded its tiny byte budget")
    return raw, payloads


def make_zip(tar_bytes, corrupt_crc=False):
    output = io.BytesIO()
    with zipfile.ZipFile(output, "w", compression=zipfile.ZIP_STORED) as archive:
        info = zipfile.ZipInfo("artifact.tar", (2020, 1, 1, 0, 0, 0))
        info.create_system = 3
        info.external_attr = (0o100644 << 16)
        archive.writestr(info, tar_bytes)
    raw = output.getvalue()
    if corrupt_crc:
        # The tar remains valid. Both ZIP header CRC fields agree but are wrong;
        # the caller recomputes the correct SHA of THIS altered ZIP, so only
        # actual member consumption/CRC checking can reject the corruption.
        changed = bytearray(raw)
        central = changed.index(b"PK\x01\x02")
        wrong_crc = struct.unpack_from("<I", changed, 14)[0] ^ 1
        struct.pack_into("<I", changed, 14, wrong_crc)
        struct.pack_into("<I", changed, central + 16, wrong_crc)
        raw = bytes(changed)
    if len(raw) > 42 * 1024:
        raise AssertionError("Fixture ZIP exceeded its tiny byte budget")
    return raw


def make_handoff_zip(*, duplicate=False, traversal=False, corrupt_crc=False):
    selected = {
        "manifest.json": b'{"synthetic":"manifest"}\n',
        "pages-artifact-seal.json": b'{"synthetic":"seal"}\n',
        "handoff.json": b'{"synthetic":"handoff"}\n',
        "target-binding.json": b'{"synthetic":"binding"}\n',
    }
    entries = list(selected.items()) + [
        ("target-public-closure.json", b'{"synthetic":"ignored closure"}\n'),
        ("target-bundle.generated.js", b"export const synthetic = true;\n"),
        ("checkpoint-disposition.json", b'{"synthetic":"ignored disposition"}\n'),
    ]
    if duplicate:
        entries.append(("manifest.json", selected["manifest.json"]))
    if traversal:
        entries.append(("../escape.json", b"{}\n"))
    output = io.BytesIO()
    with zipfile.ZipFile(output, "w", compression=zipfile.ZIP_STORED) as archive:
        for name, content in entries:
            info = zipfile.ZipInfo(name, (2020, 1, 1, 0, 0, 0))
            info.create_system = 3
            info.external_attr = (0o100644 << 16)
            # A deliberately duplicated standard ZIP entry is the test input;
            # suppress only the writer's expected warning for this fixture.
            with warnings.catch_warnings():
                if duplicate and name == "manifest.json":
                    warnings.filterwarnings("ignore", message="Duplicate name:.*", category=UserWarning)
                archive.writestr(info, content)
    raw = output.getvalue()
    if corrupt_crc:
        changed = bytearray(raw)
        central = changed.index(b"PK\x01\x02")
        wrong_crc = struct.unpack_from("<I", changed, 14)[0] ^ 1
        struct.pack_into("<I", changed, 14, wrong_crc)
        struct.pack_into("<I", changed, central + 16, wrong_crc)
        raw = bytes(changed)
    if len(raw) > 8 * 1024:
        raise AssertionError("Handoff fixture exceeded its tiny byte budget")
    return raw, selected


class ActualExtractorCli(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        if sys.version_info[:2] != (3, 12):
            raise AssertionError("Use the existing Python 3.12 runtime")
        if sys.platform != "linux":
            raise AssertionError("Linux prerequisite unmet; no extractor contract has been executed")
        if digest(EXTRACTOR.read_bytes()) != EXTRACTOR_SHA256:
            raise AssertionError("Extractor differs from the exact ROOT-reviewed SHA")

    def invoke(self, *, format_id=tarfile.GNU_FORMAT, tail=None,
               wrong_manifest=False, wrong_zip_hash=False, corrupt_crc=False,
               succeeds=False, details_oversize=False):
        self.assertEqual(digest(EXTRACTOR.read_bytes()), EXTRACTOR_SHA256)
        tar_bytes, payloads = make_tar(format_id, tail, details_oversize)
        zip_bytes = make_zip(tar_bytes, corrupt_crc)
        with tempfile.TemporaryDirectory(prefix="rr-extractor-contract-") as bank_name:
            bank = pathlib.Path(bank_name)
            archive = bank / "owned.zip"
            expected_manifest = bank / "expected-manifest.json"
            destination = bank / "selected"
            archive.write_bytes(zip_bytes)
            expected_bytes = payloads["manifest.json"] + (b" " if wrong_manifest else b"")
            expected_manifest.write_bytes(expected_bytes)
            expected_hash = "0" * 64 if wrong_zip_hash else digest(zip_bytes)
            command = [
                sys.executable, "-I", "-B", str(EXTRACTOR),
                "--mode", "public", "--archive", str(archive),
                "--expected-zip-bytes", str(len(zip_bytes)),
                "--expected-zip-sha256", expected_hash,
                "--output-directory", str(destination),
                "--deadline-epoch-ms", str(int(time.time() * 1000) + 4000),
                "--expected-manifest", str(expected_manifest),
            ]
            # subprocess.run waits for the real fixed CLI process and its pipes.
            # On TimeoutExpired it kills and waits for that process before raising;
            # no shell, provider, nested fixture executable, or test-source rewrite.
            result = subprocess.run(command, capture_output=True, timeout=10, check=False)
            self.assertEqual(digest(EXTRACTOR.read_bytes()), EXTRACTOR_SHA256)
            self.assertEqual(archive.read_bytes(), zip_bytes, "Input ZIP is immutable")
            self.assertEqual(expected_manifest.read_bytes(), expected_bytes)
            self.assertFalse((bank / "escape.json").exists(), "No traversal write")
            self.assertLessEqual(len(result.stdout), 65536)
            self.assertLessEqual(len(result.stderr), 65536)
            if not succeeds:
                self.assertNotEqual(result.returncode, 0, result.stdout.decode("utf-8", "replace"))
                self.assertEqual(result.stdout, b"", "Failure must not emit a completed receipt")
                return
            self.assertEqual(result.returncode, 0, result.stderr.decode("utf-8", "replace"))
            self.assertEqual(result.stderr, b"")
            receipt = json.loads(result.stdout)
            self.assertEqual(receipt["schemaVersion"], 1)
            self.assertEqual(receipt["mode"], "public")
            self.assertEqual(receipt["zipBytes"], len(zip_bytes))
            self.assertEqual(receipt["zipSha256"], digest(zip_bytes))
            self.assertEqual(receipt["tarBytesScanned"], len(tar_bytes), "Whole tar including tail consumed")
            files = receipt["selectedFiles"]
            self.assertEqual(len(files), 6)
            self.assertEqual({item["name"] for item in files}, set(OUTPUT_NAMES))
            self.assertEqual({item.name for item in destination.iterdir()}, set(OUTPUT_NAMES))
            for item in files:
                expected = payloads[item["name"]]
                selected = destination / item["name"]
                self.assertTrue(selected.is_file())
                self.assertFalse(selected.is_symlink())
                self.assertEqual(selected.read_bytes(), expected)
                self.assertEqual(item["bytes"], len(expected))
                self.assertEqual(item["sha256"], digest(expected))

    def test_gnu_long_public_name_and_six_selected_files(self):
        self.invoke(format_id=tarfile.GNU_FORMAT, succeeds=True)

    def test_pax_long_public_name_and_six_selected_files(self):
        self.invoke(format_id=tarfile.PAX_FORMAT, succeeds=True)

    def test_raw_manifest_mismatch_even_with_equal_json(self):
        self.invoke(wrong_manifest=True)

    def test_wrong_zip_hash(self):
        self.invoke(wrong_zip_hash=True)

    def test_crc_failure_after_valid_hash_and_selected_payloads(self):
        self.invoke(corrupt_crc=True)

    def test_duplicate_selected_member_after_six(self):
        self.invoke(tail=(PUBLIC_PATHS[0], public_payloads()["manifest.json"]))

    def test_traversal_member_after_six(self):
        self.invoke(tail=("../escape.json", b"{}\n"))

    def test_details_member_exceeds_unchanged_manifest_size(self):
        self.invoke(details_oversize=True)

    def invoke_handoff(self, *, duplicate=False, traversal=False, wrong_zip_hash=False,
                       corrupt_crc=False, succeeds=False):
        self.assertEqual(digest(EXTRACTOR.read_bytes()), EXTRACTOR_SHA256)
        zip_bytes, selected_payloads = make_handoff_zip(
            duplicate=duplicate, traversal=traversal, corrupt_crc=corrupt_crc,
        )
        with tempfile.TemporaryDirectory(prefix="rr-extractor-handoff-") as bank_name:
            bank = pathlib.Path(bank_name)
            archive = bank / "owned.zip"
            destination = bank / "selected"
            archive.write_bytes(zip_bytes)
            expected_hash = "0" * 64 if wrong_zip_hash else digest(zip_bytes)
            command = [
                sys.executable, "-I", "-B", str(EXTRACTOR),
                "--mode", "handoff", "--archive", str(archive),
                "--expected-zip-bytes", str(len(zip_bytes)),
                "--expected-zip-sha256", expected_hash,
                "--output-directory", str(destination),
                "--deadline-epoch-ms", str(int(time.time() * 1000) + 4000),
            ]
            result = subprocess.run(command, capture_output=True, timeout=10, check=False)
            self.assertEqual(digest(EXTRACTOR.read_bytes()), EXTRACTOR_SHA256)
            self.assertEqual(archive.read_bytes(), zip_bytes, "Input ZIP is immutable")
            self.assertFalse((bank / "escape.json").exists(), "No traversal write")
            self.assertLessEqual(len(result.stdout), 65536)
            self.assertLessEqual(len(result.stderr), 65536)
            if not succeeds:
                self.assertNotEqual(result.returncode, 0, result.stdout.decode("utf-8", "replace"))
                self.assertEqual(result.stdout, b"", "Failure must not emit a completed receipt")
                return
            self.assertEqual(result.returncode, 0, result.stderr.decode("utf-8", "replace"))
            self.assertEqual(result.stderr, b"")
            receipt = json.loads(result.stdout)
            self.assertEqual(receipt["schemaVersion"], 1)
            self.assertEqual(receipt["mode"], "handoff")
            self.assertEqual(receipt["zipBytes"], len(zip_bytes))
            self.assertEqual(receipt["zipSha256"], digest(zip_bytes))
            self.assertNotIn("tarBytesScanned", receipt)
            files = receipt["selectedFiles"]
            self.assertEqual(len(files), 4)
            self.assertEqual({item["name"] for item in files}, set(selected_payloads))
            self.assertEqual({item.name for item in destination.iterdir()}, set(selected_payloads))
            for item in files:
                expected = selected_payloads[item["name"]]
                selected = destination / item["name"]
                self.assertTrue(selected.is_file())
                self.assertFalse(selected.is_symlink())
                self.assertEqual(selected.read_bytes(), expected)
                self.assertEqual(item["bytes"], len(expected))
                self.assertEqual(item["sha256"], digest(expected))

    def test_handoff_four_selected_plus_other_regular_metadata(self):
        self.invoke_handoff(succeeds=True)

    def test_handoff_traversal(self):
        self.invoke_handoff(traversal=True)

    def test_handoff_duplicate(self):
        self.invoke_handoff(duplicate=True)

    def test_handoff_wrong_zip_hash(self):
        self.invoke_handoff(wrong_zip_hash=True)

    def test_handoff_crc_failure_with_valid_outer_hash(self):
        self.invoke_handoff(corrupt_crc=True)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--extractor", type=pathlib.Path, required=True)
    parser.add_argument("--extractor-sha256", required=True)
    options = parser.parse_args()
    EXTRACTOR = options.extractor.resolve(strict=True)
    EXTRACTOR_SHA256 = options.extractor_sha256.lower()
    if len(EXTRACTOR_SHA256) != 64 or any(c not in "0123456789abcdef" for c in EXTRACTOR_SHA256):
        parser.error("--extractor-sha256 must be the exact reviewed SHA-256")
    unittest.main(argv=[sys.argv[0]], verbosity=2)
