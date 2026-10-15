"""Offline exact-original transport tests. No provider/network/private data.

--native additionally requires Linux, actual ecCodes and the normal owned read
lease. Generated GRIB fixtures are not provider originals or production proof.
"""
from __future__ import annotations

from contextlib import nullcontext, redirect_stdout
import copy
import hashlib
import importlib.util
import io
import json
import os
import stat
from pathlib import Path
import sys
import tempfile
import time
import types
import unittest
from unittest.mock import Mock, patch

NATIVE = "--native" in sys.argv
if NATIVE:
    sys.argv.remove("--native")
    import eccodes
else:
    eccodes = types.ModuleType("eccodes")
    eccodes.OutOfAreaError = type("OutOfAreaError", (Exception,), {})
    for name in ("codes_get", "codes_get_array", "codes_get_elements", "codes_grib_find_nearest",
                 "codes_grib_new_from_file", "codes_release"):
        setattr(eccodes, name, Mock(side_effect=AssertionError("No decoder in portable tests")))
    sys.modules["eccodes"] = eccodes

SPEC = importlib.util.spec_from_file_location("exact_original_producer", Path(__file__).with_name("update-dmi-bulk.py"))
producer = importlib.util.module_from_spec(SPEC)
assert SPEC.loader is not None
SPEC.loader.exec_module(producer)

HREF = "https://opendataapi.dmi.dk/v1/forecastdata/assets/exact-original.grib"
BODY = b"synthetic exact bytes, not GRIB/provider data\n"
HEAD = "a" * 40


def capture(body=BODY):
    return dict(collection="dkss_lf", modelRun="2026-10-09T00:00:00Z", validTime="2026-10-14T00:00:00Z",
                itemId="exact-original-item", assetIdentitySha256=hashlib.sha256(HREF.encode()).hexdigest(),
                assetSizeBytes=len(body), acquiredAt="2026-10-14T01:00:00Z", contentLengthBytes=len(body),
                contentSha256=hashlib.sha256(body).hexdigest(), itemCreatedAt="2026-10-09T01:00:00Z", itemUpdatedAt=None)


def item(expected=None):
    expected = expected or capture()
    return dict(type="Feature", id=expected["itemId"], collection=expected["collection"],
                properties={"forecast:reference_datetime": expected["modelRun"], "datetime": expected["validTime"],
                            "created": expected["itemCreatedAt"]},
                assets={"data": {"href": HREF, "type": "application/x-grib", "file:size": expected["assetSizeBytes"]}})


class Response:
    def __init__(self, body=b"", status=200, **headers):
        self.body, self.status_code = body, status
        self.headers = {"content-length": str(len(body)), **headers}
        self.closed = False

    def __enter__(self):
        return self

    def __exit__(self, *args):
        self.closed = True

    def raise_for_status(self):
        if self.status_code >= 400:
            raise AssertionError("status must be classified before this call")

    def iter_content(self, size):
        for start in range(0, len(self.body), size):
            yield self.body[start:start + size]


def metadata_response(document=None, **kwargs):
    return Response(json.dumps(document if document is not None else item()).encode(), **kwargs)


class ExactOriginalTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory(prefix="rr-exact-original-")
        self.root = Path(self.temp.name)
        self.raw = self.root / ".cache/dmi-grib"
        self.raw.mkdir(parents=True)
        self.manifest = self.raw / "asset-manifest.json"
        self.manifest.write_text('{"schemaVersion":2,"assets":{}}\n', encoding="utf-8")
        self.patches = [patch.object(producer, "ROOT", self.root), patch.object(producer, "RAW_DIR", self.raw),
                        patch.object(producer, "CACHE_ONLY", False), patch.object(producer, "FINALIZE_ONLY", False),
                        patch.object(producer, "STAC_ROOT", "https://opendataapi.dmi.dk/v1/forecastdata"),
                        patch.object(producer, "STAC_SESSION", Mock()), patch.object(producer, "DOWNLOAD_SESSION", Mock()),
                        patch.object(producer, "_UNSETTLED_ASSET_DOWNLOADS", []),
                        patch.object(producer, "_UNSETTLED_GRIB_READS", []),
                        patch.object(producer, "asset_download_work_deadline", side_effect=lambda deadline: nullcontext())]
        for value in self.patches:
            value.start()
        producer.STAC_SESSION.get.side_effect = AssertionError("No actual metadata transport")
        producer.DOWNLOAD_SESSION.get.side_effect = AssertionError("No actual asset transport")
        self.addCleanup(self.temp.cleanup)
        self.addCleanup(lambda: [value.stop() for value in reversed(self.patches)])

    def expect_refusal(self, code):
        return self.assertRaisesRegex(producer.ExactOriginalRestoreRejected, "^DMI_EXACT_ORIGINAL_" + code + "$")

    def download(self, expected=None, budget=None):
        expected = expected or capture()
        return producer.download_asset(HREF, expected["assetSizeBytes"], budget if budget is not None else {"bytes": 0},
            collection=expected["collection"], model_run=expected["modelRun"], valid_time=expected["validTime"],
            item_id=expected["itemId"], item_created_at=expected["itemCreatedAt"], item_updated_at=expected["itemUpdatedAt"],
            expected_capture=expected, work_deadline=time.monotonic() + 20)

    def make_plan(self, originals=None):
        originals = originals if originals is not None else [capture()]
        originals = sorted(originals, key=producer._exact_original_json)
        return dict(schemaVersion=1, contractId="dmi-exact-original-restore-v1", originals=originals,
            binding=dict(progressSource="38692413809-1", progressCacheKey="weather-private-progress-encrypted-v2-Linux-main-38692413809-1",
                targetReferenceAt="2026-10-14T18:00:00.000Z", sourceHead="b" * 40, executionHead=HEAD,
                protectedBundleSha256="c" * 64, protectedDatasetId="rr-exact-test", protectedProductionReferenceAt="2026-10-14T15:00:00.000Z",
                protectedGeneratedAt="2026-10-14T15:01:00.000Z", modelBindingSha256="d" * 64, historyDemandSha256="e" * 64,
                originalsSha256=hashlib.sha256(producer._exact_original_json(originals).encode()).hexdigest(), nonce="f" * 32))

    def read_plan(self, plan, *, digest=None):
        body = json.dumps(plan).encode()
        path = self.raw / ".original-recovery-plan.json"
        path.unlink(missing_ok=True)
        with path.open("xb") as handle:
            handle.write(body)
            handle.flush()
            os.fsync(handle.fileno())
        # Portable cases test plan bytes/schema, not Linux inode stability.
        # NTFS may finalize file times on open. Native CI uses the unmodified
        # full dev/ino/mode/size/mtime/ctime witness and real owned GRIB lease.
        identity = (patch.object(producer._OwnedGribRead, "_identity", staticmethod(
            lambda info: (info.st_dev, info.st_ino, info.st_mode, info.st_size)))
            if os.name == "nt" and not NATIVE else nullcontext())
        with identity, patch.dict(os.environ, GITHUB_SHA=HEAD,
                                  DMI_EXACT_ORIGINAL_PLAN_SHA256=digest or hashlib.sha256(body).hexdigest()):
            return producer.read_exact_original_restore_plan()

    def test_canonical_capture_and_originals_are_not_retagged(self):
        expected = capture()
        before = copy.deepcopy(expected)
        self.assertEqual(producer._exact_capture(expected), expected)
        self.assertEqual(expected, before)
        for change in ({"href": HREF}, {"itemId": ".."}, {"contentSha256": "0"}, {"contentLengthBytes": True},
                       {"modelRun": "2026-10-09T00:00:01Z"}, {"validTime": "2026-10-14T00:30:00Z"}):
            with self.subTest(change=change), self.expect_refusal("CAPTURE_INVALID"):
                producer._exact_capture({**expected, **change})
        reader_capture = {key: value for key, value in expected.items() if key not in ("collection", "modelRun", "validTime")}
        self.assertTrue(producer._exact_same_capture(reader_capture, expected))
        self.assertFalse(producer._exact_same_capture({**expected, "collection": "dkss_nsbs"}, expected))

    def test_official_https_policy_rejects_foreign_credential_and_ambiguous_urls(self):
        self.assertEqual(producer._exact_official_https(HREF), HREF)
        for url in (HREF.replace("https:", "http:"), HREF.replace("dmi.dk", "dmi.dk.invalid"),
                    HREF.replace("opendataapi", "user@opendataapi"), HREF + "#fragment", HREF + "\n",
                    HREF.replace(".dk/", ".dk:444/"), HREF.replace(".dk/", ".dk\\")):
            with self.subTest(url=url), self.expect_refusal("URL_REJECTED"):
                producer._exact_official_https(url)

    def test_exact_item_lookup_no_search_and_api_key_only_on_metadata(self):
        producer.STAC_SESSION.get.side_effect = [metadata_response()]
        with patch.object(producer, "API_KEY", "synthetic-secret-not-reportable"):
            found = producer.resolve_exact_original_item(capture(), work_deadline=None)
            self.assertEqual(found["href"], HREF)
            args, kwargs = producer.STAC_SESSION.get.call_args
            self.assertEqual(args, ("https://opendataapi.dmi.dk/v1/forecastdata/collections/dkss_lf/items/exact-original-item",))
            self.assertEqual(kwargs["params"], {"api-key": "synthetic-secret-not-reportable"})
            self.assertFalse(kwargs["allow_redirects"])
            producer.DOWNLOAD_SESSION.get.side_effect = [Response(BODY)]
            with producer._exact_original_response(HREF):
                pass
            self.assertIsNone(producer.DOWNLOAD_SESSION.get.call_args.kwargs["params"])
        producer.DOWNLOAD_SESSION.get.assert_called_once()

    def test_each_original_revision_field_is_required_before_asset_transport(self):
        mutations = [("id", "different"), ("collection", "dkss_nsbs"), ("modelRun", "2026-10-09T06:00:00Z"),
                     ("datetime", "2026-10-14T01:00:00Z"), ("created", "2026-10-09T02:00:00Z"),
                     ("updated", "2026-10-09T03:00:00Z"), ("size", len(BODY)+1), ("href", HREF + ".different")]
        for key, value in mutations:
            document = item()
            if key in ("id", "collection"):
                document[key] = value
            elif key in ("size", "href"):
                document["assets"]["data"]["file:size" if key == "size" else key] = value
            else:
                document["properties"]["forecast:reference_datetime" if key == "modelRun" else key] = value
            producer.STAC_SESSION.get.side_effect = [metadata_response(document)]
            with self.subTest(key=key), self.expect_refusal("REVISION_MISMATCH"):
                producer.resolve_exact_original_item(capture(), work_deadline=None)
        producer.DOWNLOAD_SESSION.get.assert_not_called()

    def test_redirects_are_manual_bounded_and_never_cross_origin(self):
        producer.DOWNLOAD_SESSION.get.side_effect = [Response(status=302, location="https://foreign.invalid/secret")]
        with self.expect_refusal("URL_REJECTED"):
            with producer._exact_original_response(HREF):
                self.fail("foreign redirect accepted")
        self.assertEqual(producer.DOWNLOAD_SESSION.get.call_count, 1)
        producer.DOWNLOAD_SESSION.get.reset_mock()
        producer.DOWNLOAD_SESSION.get.side_effect = [Response(status=302, location=HREF)] * 4
        with self.expect_refusal("REDIRECT_REJECTED"):
            with producer._exact_original_response(HREF):
                self.fail("unbounded redirect accepted")
        self.assertEqual(producer.DOWNLOAD_SESSION.get.call_count, 4)
        for call in producer.DOWNLOAD_SESSION.get.call_args_list:
            self.assertFalse(call.kwargs["allow_redirects"])

    def test_missing_metadata_invalid_json_and_bound_stop_without_fallback(self):
        for response, code in ((Response(status=404), "UNAVAILABLE"), (Response(status=410), "UNAVAILABLE"),
                               (Response(b"not-json"), "METADATA_INVALID"),
                               (Response(b"x" * (2 * 1024 * 1024 + 1)), "METADATA_BOUND")):
            producer.STAC_SESSION.get.side_effect = [response]
            with self.subTest(code=code), self.expect_refusal(code):
                producer.resolve_exact_original_item(capture(), work_deadline=None)
        producer.DOWNLOAD_SESSION.get.assert_not_called()

    def test_fixed_plan_hash_execution_and_old_source_are_distinct(self):
        plan = self.make_plan()
        self.assertNotEqual(plan["binding"]["sourceHead"], HEAD)
        self.assertEqual(self.read_plan(plan), plan)
        with self.expect_refusal("PLAN_REJECTED"):
            self.read_plan(plan, digest="0" * 64)
        for key, value in (("executionHead", "c" * 40), ("progressSource", "different"),
                           ("targetReferenceAt", "2026-10-15T18:00:00.000Z"), ("originalsSha256", "0" * 64)):
            changed = copy.deepcopy(plan)
            changed["binding"][key] = value
            with self.subTest(key=key), self.expect_refusal("PLAN_REJECTED"):
                self.read_plan(changed)
        producer.STAC_SESSION.get.assert_not_called()

    def test_bad_plan_shape_and_extra_capture_fields_fail_before_network(self):
        for original in ({**capture(), "url": HREF}, {**capture(), "values": [1, 2]}):
            with self.subTest(extra=sorted(set(original) - set(capture()))), self.expect_refusal("CAPTURE_INVALID"):
                self.read_plan(self.make_plan([original]))
        plan = self.make_plan([capture(), capture()])
        with self.expect_refusal("PLAN_REJECTED"):
            self.read_plan(plan)
        producer.STAC_SESSION.get.assert_not_called()

    def test_malformed_manifest_never_falls_back_to_empty_or_loses_existing_bytes(self):
        self.manifest.write_bytes(b"broken manifest preserved\n")
        with self.expect_refusal("MANIFEST_REJECTED"):
            self.download()
        self.assertEqual(self.manifest.read_bytes(), b"broken manifest preserved\n")
        producer.DOWNLOAD_SESSION.get.assert_not_called()

    def test_manifest_identity_collision_and_nonregular_inventory_stop_before_transport(self):
        expected = capture()
        name = producer.cached_asset_path(HREF).name
        self.manifest.write_text(json.dumps({"schemaVersion": 2, "assets": {
            name: {**expected, "canonicalHref": HREF, "contentSha256": "f" * 64}}}), encoding="utf-8")
        original_manifest = self.manifest.read_bytes()
        with self.expect_refusal("COLLISION"):
            self.download()
        self.assertEqual(self.manifest.read_bytes(), original_manifest)
        target = self.raw / "nonregular"
        target.touch()
        real_lstat = Path.lstat
        for mode in (stat.S_IFLNK, stat.S_IFDIR, stat.S_IFIFO):
            def lstat(path, *args, **kwargs):
                return types.SimpleNamespace(st_mode=mode, st_nlink=1) if path == target else real_lstat(path, *args, **kwargs)
            with self.subTest(mode=mode), patch.object(Path, "lstat", lstat), self.expect_refusal("RAW_ENTRY_REJECTED"):
                producer._exact_raw_state()
        producer.DOWNLOAD_SESSION.get.assert_not_called()

    def test_existing_file_is_never_replaced_after_failed_owned_verification(self):
        target = producer.cached_asset_path(HREF)
        target.write_bytes(b"immutable existing original")
        before = target.read_bytes(), self.manifest.read_bytes()
        with patch.object(producer, "_verify_exact_original_file", side_effect=producer.GribReadUnproven("owned refusal")):
            with self.assertRaises(producer.GribReadUnproven):
                self.download()
        self.assertEqual((target.read_bytes(), self.manifest.read_bytes()), before)
        producer.DOWNLOAD_SESSION.get.assert_not_called()

    def test_download_and_cache_budgets_stop_before_transport_without_pruning(self):
        original = self.raw / "other.grib"
        original.write_bytes(b"immutable-other-original")
        before = self.manifest.read_bytes()
        for name in ("MAX_DOWNLOAD_BYTES", "RAW_CACHE_MAX_BYTES"):
            with patch.object(producer, name, 1), self.expect_refusal("DOWNLOAD_BUDGET" if name.startswith("MAX_") else "CACHE_BUDGET"):
                self.download()
        self.assertEqual(original.read_bytes(), b"immutable-other-original")
        self.assertEqual(self.manifest.read_bytes(), before)
        producer.DOWNLOAD_SESSION.get.assert_not_called()

    def test_wrong_content_or_length_never_publishes_or_registers(self):
        path = producer.cached_asset_path(HREF)
        for response, code in ((Response(b"X" * len(BODY)), "CONTENT_MISMATCH"),
                               (Response(BODY, **{"content-length": str(len(BODY) + 1)}), "LENGTH_MISMATCH"),
                               (Response(BODY, **{"content-length": "0"}), "LENGTH_MISMATCH"),
                               (Response(BODY, **{"content-encoding": "gzip"}), "LENGTH_MISMATCH")):
            producer.DOWNLOAD_SESSION.get.side_effect = [response]
            before = self.manifest.read_bytes()
            with self.subTest(code=code), self.expect_refusal(code):
                self.download()
            self.assertFalse(path.exists())
            self.assertEqual(self.manifest.read_bytes(), before)
            self.assertEqual(sorted(p.name for p in self.raw.iterdir()), ["asset-manifest.json"])

    def test_atomic_collision_after_preflight_never_overwrites(self):
        target = producer.cached_asset_path(HREF)
        real_link = os.link

        def occupy(source, destination, **kwargs):
            target.write_bytes(b"other immutable original")
            return real_link(source, destination, **kwargs)

        producer.DOWNLOAD_SESSION.get.side_effect = [Response(BODY)]
        with patch.object(producer, "_verify_exact_original_file"), patch.object(os, "link", side_effect=occupy):
            with self.expect_refusal("COLLISION"):
                self.download()
        self.assertEqual(target.read_bytes(), b"other immutable original")
        self.assertEqual(json.loads(self.manifest.read_text())["assets"], {})

    def test_default_download_behavior_and_signature_remain_normal(self):
        target = producer.cached_asset_path(HREF)
        target.write_bytes(b"old uncaptured ordinary file")
        producer.DOWNLOAD_SESSION.get.side_effect = [Response(BODY)]
        with patch.object(producer, "_exact_raw_state", side_effect=AssertionError("optin leaked")), \
             patch.object(producer, "_verify_exact_original_file", side_effect=AssertionError("optin leaked")):
            actual, reused = producer.download_asset(HREF, len(BODY), {"bytes": 0})
        self.assertEqual(actual, target)
        self.assertFalse(reused)
        self.assertEqual(target.read_bytes(), BODY)
        self.assertNotIn("allow_redirects", producer.DOWNLOAD_SESSION.get.call_args.kwargs)
        producer.STAC_SESSION.get.assert_not_called()

    def test_report_never_prints_exception_payload_or_runs_normal_main(self):
        for error in (RuntimeError("SECRET/url?api-key=not-reportable"),
                      producer.ExactOriginalRestoreRejected("SECRET-not-allowlisted")):
            output = io.StringIO()
            with patch.object(sys, "argv", ["update-dmi-bulk.py", "--restore-exact-originals"]), \
                 patch.object(producer, "read_exact_original_restore_plan", side_effect=error), redirect_stdout(output), \
                 patch.object(producer, "main", side_effect=AssertionError("normal main called")):
                self.assertEqual(producer.exact_original_restore_main(), 2)
            result = json.loads(output.getvalue())
            self.assertEqual(result["code"], "UNCLASSIFIED")
            self.assertNotIn("SECRET", output.getvalue())
            self.assertFalse(result["pruningPerformed"])


if NATIVE:
    class NativeExactOriginalTests(ExactOriginalTests):
        def setUp(self):
            if sys.platform != "linux":
                self.fail("--native requires Linux; no skipped ownership proof")
            super().setUp()
            # Use the REAL deadline, ownership, ecCodes and file hashing in native cases.
            self.patches[-1].stop()

        def generated_grib(self, *, wrong_time=False):
            fields = []
            for sample in ("regular_ll_sfc_grib1", "regular_ll_sfc_grib2"):
                gid = eccodes.codes_grib_new_from_samples(sample)
                try:
                    eccodes.codes_set(gid, "dataDate", 20261009)
                    eccodes.codes_set(gid, "dataTime", 0)
                    eccodes.codes_set(gid, "stepRange", "119" if wrong_time else "120")
                    fields.append(eccodes.codes_get_message(gid))
                finally:
                    eccodes.codes_release(gid)
            return b"".join(fields)

        def test_native_download_register_and_reuse_are_exact_no_numeric_read(self):
            body = self.generated_grib()
            expected = capture(body)
            original = copy.deepcopy(expected)
            producer.STAC_SESSION.get.side_effect = [metadata_response(item(expected))] * 2
            producer.DOWNLOAD_SESSION.get.side_effect = [Response(body)]
            with patch.object(producer, "WORK_DEADLINE", time.monotonic() + 30), \
                 patch.object(producer, "codes_get_array", side_effect=AssertionError("numeric read forbidden")), \
                 patch.object(producer, "codes_get_elements", side_effect=AssertionError("numeric read forbidden")), \
                 patch.object(producer, "process_grib", side_effect=AssertionError("normal process forbidden")), \
                 patch.object(producer, "prune_raw_cache", side_effect=AssertionError("pruning forbidden")):
                report = producer.restore_exact_original_assets([expected, expected])
                self.assertEqual((report["downloadedAssetCount"], report["uniqueAssetCount"]), (1, 1))
                self.assertEqual(report["downloadedBytes"], len(body))
                again = producer.restore_exact_original_assets([expected])
            self.assertEqual(again["reusedAssetCount"], 1)
            self.assertEqual(again["downloadedBytes"], 0)
            self.assertEqual(producer.cached_asset_path(HREF).read_bytes(), body)
            row = json.loads(self.manifest.read_text())["assets"][producer.cached_asset_path(HREF).name]
            self.assertTrue(producer._exact_same_capture(row, expected))
            self.assertNotEqual(row["acquiredAt"], expected["acquiredAt"])
            self.assertEqual(expected, original)
            producer.DOWNLOAD_SESSION.get.assert_called_once()

        def test_native_hash_matching_wrong_time_is_still_rejected_before_install(self):
            body = self.generated_grib(wrong_time=True)
            producer.DOWNLOAD_SESSION.get.side_effect = [Response(body)]
            with self.expect_refusal("HEADER_MISMATCH"):
                self.download(capture(body))
            self.assertFalse(producer.cached_asset_path(HREF).exists())
            self.assertEqual(json.loads(self.manifest.read_text())["assets"], {})


if __name__ == "__main__":
    unittest.main()
