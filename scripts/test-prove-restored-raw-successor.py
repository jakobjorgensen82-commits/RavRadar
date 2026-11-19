#!/usr/bin/env python3
"""Small local fixtures for the separate successor RAW verifier."""
import hashlib
import importlib.util
import json
from pathlib import Path
import sys
import tempfile
from types import ModuleType
import unittest


def load_module(name, filename):
    spec = importlib.util.spec_from_file_location(name, Path(__file__).with_name(filename))
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


proof = load_module("successor_raw_proof", "prove-restored-raw-successor.py")


def pure_file_producer():
    # The actual manifest and physical byte verifier may never call the decoder.
    def unexpected_decode(*_args, **_kwargs):
        raise AssertionError("read-only successor proof invoked ecCodes")

    eccodes = ModuleType("eccodes")
    eccodes.OutOfAreaError = type("OutOfAreaError", (Exception,), {})
    for name in ("codes_get", "codes_get_array", "codes_get_elements", "codes_grib_find_nearest",
                 "codes_grib_new_from_file", "codes_release"):
        setattr(eccodes, name, unexpected_decode)
    previous = sys.modules.get("eccodes")
    sys.modules["eccodes"] = eccodes
    try:
        return load_module("successor_raw_producer", "update-dmi-bulk.py")
    finally:
        if previous is None:
            del sys.modules["eccodes"]
        else:
            sys.modules["eccodes"] = previous


class RestoredSuccessorProof(unittest.TestCase):
    def setUp(self):
        scratch = tempfile.TemporaryDirectory()
        self.addCleanup(scratch.cleanup)
        self.root = Path(scratch.name).resolve()
        self.producer = pure_file_producer()
        self.producer.ROOT = self.root
        self.producer.RAW_DIR = self.root / ".cache/dmi-grib"
        self.producer.RAW_DIR.mkdir(parents=True)
        href = "https://dmi.example/synthetic.grib"
        content = b"synthetic raw original"
        self.asset = self.producer.cached_asset_path(href)
        self.asset.write_bytes(content)
        self.capture = {
            "collection": "dkss_nsbs", "modelRun": "2026-11-19T00:00:00Z",
            "validTime": "2026-11-19T09:00:00Z", "itemId": "synthetic",
            "assetIdentitySha256": hashlib.sha256(href.encode()).hexdigest(),
            "assetSizeBytes": len(content), "acquiredAt": "2026-11-19T01:21:30Z",
            "contentLengthBytes": len(content), "contentSha256": hashlib.sha256(content).hexdigest(),
            "itemCreatedAt": None, "itemUpdatedAt": None,
        }
        self.manifest = self.producer.raw_cache_manifest_path()
        self.manifest.write_text(json.dumps({
            "schemaVersion": self.producer.RAW_CACHE_MANIFEST_SCHEMA_VERSION,
            "assets": {self.asset.name: {**self.capture, "canonicalHref": href}},
        }), encoding="utf-8")
        self.identity_path = self.root / ".cache/dmi-restored-raw-identity.json"
        self.identity = {"id": 123, "key": "dmi-grib-v4-Linux-2026-W47-200-1", "version": "1" * 64}
        self.identity_path.write_text(json.dumps(self.identity), encoding="utf-8")
        self.plan_path = self.root / "ravradar-raw-rotation/successor-plan.json"
        self.plan_path.parent.mkdir()
        self.boundary = {
            "datasetId": "rr-synthetic", "productionReferenceAt": "2026-11-19T04:00:00.000Z",
            "bundleContentSha256": "2" * 64, "checkpointGenerationSha256": "3" * 64,
            "conditionsSha256": "4" * 64,
        }
        self.plan = {
            "schemaVersion": 1, "kind": "PUBLISHED_RAW_ROTATION_SUCCESSOR_PLAN",
            "targetReferenceAt": "2026-11-19T08:00:00.000Z",
            "retention": {"schemaVersion": 1, "kind": "COMMITTED_POST_H0_UNKNOWN_RAW_RETENTION",
                          "boundary": self.boundary, "captures": [self.capture]},
        }
        self.environment = {
            "GITHUB_RUN_ID": "300", "GITHUB_RUN_ATTEMPT": "1", "GITHUB_SHA": "a" * 40,
            "RAVRADAR_PRODUCTION_TARGET_HOUR": "2026-11-19T08:00:00Z",
            "RUNNER_TEMP": str(self.root),
        }
        self.write_plan()

    def write_plan(self):
        self.plan_path.write_text(json.dumps(self.plan), encoding="utf-8")
        digest = hashlib.sha256(self.plan_path.read_bytes()).hexdigest()
        self.environment["RAVRADAR_RAW_SUCCESSOR_PLAN_SHA256"] = digest

    def verify(self):
        return proof.prove_restored_raw_successor(self.producer, self.environment)

    def test_proves_exact_byte_set_and_refuses_corrupted_asset_of_same_size(self):
        original_manifest = self.manifest.read_bytes()
        digest = self.environment["RAVRADAR_RAW_SUCCESSOR_PLAN_SHA256"]
        self.assertEqual(self.verify(), {
            "schemaVersion": 1, "kind": "DMI_RESTORED_RAW_SUCCESSOR_COVERAGE_V1",
            "runId": "300", "runAttempt": "1", "sourceHead": "a" * 40,
            "targetReferenceAt": "2026-11-19T08:00:00Z",
            "cacheIdentitySha256": proof._digest(self.identity),
            "baselineBoundarySha256": proof._digest(self.boundary), "planSha256": digest,
            "allRequiredVerified": True, "requiredCaptures": 1, "protectedFiles": 1, "unavailableCaptures": 0,
        })
        self.assertEqual(self.manifest.read_bytes(), original_manifest)
        self.asset.write_bytes(b"x" * self.asset.stat().st_size)
        # The CLI starts a fresh process for each proof.
        self.producer._RAW_CURRENT_PROTECTED = None
        self.producer._RAW_CURRENT_IDENTITIES.clear()
        with self.assertRaisesRegex(ValueError, "missing original"):
            self.verify()

    def test_refuses_wrong_hour_empty_plan_and_identity_change_after_byte_check(self):
        self.environment["RAVRADAR_PRODUCTION_TARGET_HOUR"] = "2026-11-19T09:00:00Z"
        with self.assertRaisesRegex(ValueError, "proof input"):
            self.verify()
        self.environment["RAVRADAR_PRODUCTION_TARGET_HOUR"] = "2026-11-19T08:00:00Z"
        self.plan_path.write_bytes(self.plan_path.read_bytes() + b" ")
        with self.assertRaisesRegex(self.producer.AssetDownloadCleanupUnproven, "ARCHIVE_FILE_CHANGED"):
            self.verify()
        self.plan["retention"]["captures"] = []
        self.write_plan()
        with self.assertRaisesRegex(ValueError, "protected demand"):
            self.verify()
        self.plan["retention"]["captures"] = [self.capture]
        self.write_plan()
        verify_originals = self.producer.configure_raw_current_retention

        def move_identity(*args, **kwargs):
            result = verify_originals(*args, **kwargs)
            self.identity_path.write_text(json.dumps({**self.identity, "id": 124}), encoding="utf-8")
            return result

        self.producer.configure_raw_current_retention = move_identity
        with self.assertRaisesRegex(ValueError, "proof input moved"):
            self.verify()


if __name__ == "__main__":
    unittest.main()
