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
import shutil
import stat
import subprocess
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
        if not hasattr(producer.os, "statvfs"):
            # Portable accounting fixture only; Linux uses actual statvfs.
            self.patches.append(patch.object(producer.os, "statvfs",
                return_value=types.SimpleNamespace(f_frsize=4096), create=True))
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

    def local_original(self, expected=None, body=BODY):
        expected = expected or capture(body)
        target = producer.cached_asset_path(HREF)
        target.write_bytes(body)
        self.manifest.write_text(json.dumps({"schemaVersion": 2, "assets": {
            target.name: {**expected, "canonicalHref": HREF}}}), encoding="utf-8")
        return target

    def make_plan(self, originals=None):
        originals = originals if originals is not None else [capture()]
        originals = sorted(originals, key=producer._exact_original_json)
        return dict(schemaVersion=1, contractId="dmi-exact-original-restore-v1", originals=originals,
            binding=dict(progressSource="38692413809-1", progressCacheKey="weather-private-progress-encrypted-v2-Linux-main-38692413809-1",
                targetReferenceAt="2026-10-14T18:00:00.000Z", sourceHead="b" * 40, executionHead=HEAD,
                protectedBundleSha256="c" * 64, protectedDatasetId="rr-exact-test", protectedProductionReferenceAt="2026-10-14T15:00:00.000Z",
                protectedGeneratedAt="2026-10-14T15:01:00.000Z", modelBindingSha256="d" * 64, historyDemandSha256="e" * 64,
                originalsSha256=hashlib.sha256(producer._exact_original_json(originals).encode()).hexdigest(), nonce="f" * 32))

    def read_plan(self, plan, *, digest=None, body=None):
        body = json.dumps(plan).encode() if body is None else body
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
        for response, code in ((Response(status=404), "METADATA_UNAVAILABLE"), (Response(status=410), "METADATA_UNAVAILABLE"),
                               (Response(b"not-json"), "METADATA_INVALID"),
                               (Response(b"x" * (2 * 1024 * 1024 + 1)), "METADATA_BOUND")):
            producer.STAC_SESSION.get.side_effect = [response]
            with self.subTest(code=code), self.expect_refusal(code):
                producer.resolve_exact_original_item(capture(), work_deadline=None)
        producer.DOWNLOAD_SESSION.get.assert_not_called()

    def test_missing_asset_is_distinct_from_missing_metadata_without_exposing_url(self):
        for status in (404, 410):
            response = Response(status=status)
            producer.DOWNLOAD_SESSION.get.side_effect = [response]
            with self.subTest(status=status), self.expect_refusal("ASSET_UNAVAILABLE"):
                with producer._exact_original_response(HREF):
                    self.fail("unavailable asset was accepted")
            self.assertTrue(response.closed)
        producer.STAC_SESSION.get.assert_not_called()

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

    def test_only_two_paired_checkpoint_scopes_are_allowed(self):
        old = self.make_plan()
        latest = copy.deepcopy(old)
        latest["binding"].update(progressSource="38768040429-1",
            progressCacheKey="weather-private-progress-encrypted-v2-Linux-main-38768040429-1",
            targetReferenceAt="2026-10-15T16:00:00.000Z")
        for plan in (old, latest):
            self.assertEqual(self.read_plan(plan), plan)
        for key, value in (("progressSource", "38692413809-1"),
                           ("progressCacheKey", "weather-private-progress-encrypted-v2-Linux-main-38692413809-1"),
                           ("targetReferenceAt", "2026-10-14T18:00:00.000Z"),
                           ("progressSource", "38768040429-2"),
                           ("targetReferenceAt", "2026-10-15T17:00:00.000Z")):
            changed = copy.deepcopy(latest)
            changed["binding"][key] = value
            with self.subTest(key=key), self.expect_refusal("PLAN_REJECTED"):
                self.read_plan(changed)
        producer.STAC_SESSION.get.assert_not_called()
        producer.DOWNLOAD_SESSION.get.assert_not_called()

    def test_forward_only_390663_restore_scope_accepts_exact_tuple_not_mixed_scopes(self):
        plan = self.make_plan()
        plan["binding"].update(progressSource="39066350748-1",
            progressCacheKey="weather-private-progress-encrypted-v2-Linux-main-39066350748-1",
            targetReferenceAt="2026-10-17T20:00:00.000Z")
        before = copy.deepcopy(plan)
        self.assertEqual(self.read_plan(plan), before)
        self.assertEqual(plan, before, "scope validation must not retag original captures")
        for key, value in (("progressSource", "38692413809-1"),
                           ("progressCacheKey", "weather-private-progress-encrypted-v2-Linux-main-38692413809-1"),
                           ("targetReferenceAt", "2026-10-14T18:00:00.000Z"),
                           ("progressSource", "39066350748-2"),
                           ("targetReferenceAt", "2026-10-17T21:00:00.000Z")):
            changed = copy.deepcopy(plan)
            changed["binding"][key] = value
            with self.subTest(key=key), self.expect_refusal("PLAN_REJECTED"):
                self.read_plan(changed)
        producer.STAC_SESSION.get.assert_not_called()
        producer.DOWNLOAD_SESSION.get.assert_not_called()

    def test_bad_plan_shape_and_extra_capture_fields_fail_before_network(self):
        for original in ({**capture(), "url": HREF}, {**capture(), "values": [1, 2]}):
            with self.subTest(extra=sorted(set(original) - set(capture()))), self.expect_refusal("CAPTURE_INVALID"):
                self.read_plan(self.make_plan([original]))
        plan = self.make_plan([capture(), capture()])
        with self.expect_refusal("PLAN_REJECTED"):
            self.read_plan(plan)
        producer.STAC_SESSION.get.assert_not_called()

    def test_capture_count_is_not_the_physical_asset_budget(self):
        # Several genuine capture timestamps can describe the same exact bytes.
        # The normal per-collection limit still applies to ONE physical asset,
        # not to its independently preserved original capture descriptions.
        count = len(producer.MARINE_COLLECTIONS) + 1
        originals = [{**capture(), "acquiredAt": f"2026-10-14T01:00:{second:02d}Z"}
                     for second in range(count)]
        plan = self.make_plan(originals)
        identity = producer.canonical_stac_item_identity(item())
        with patch.object(producer, "MAX_ASSETS_PER_COLLECTION", 1):
            self.assertEqual(self.read_plan(plan), plan)
            with patch.object(producer, "resolve_exact_original_item", return_value=identity) as resolve, \
                 patch.object(producer, "download_asset", return_value=(self.raw / "synthetic", False)) as download, \
                 redirect_stdout(io.StringIO()):
                report = producer.restore_exact_original_assets(plan["originals"])
            self.assertEqual(report["originalCount"], count)
            self.assertEqual(report["uniqueAssetCount"], 1)
            self.assertEqual(report["downloadedAssetCount"], 1)
            resolve.assert_called_once()
            download.assert_called_once()
            second_asset = {**capture(), "itemId": "other-original", "assetIdentitySha256": "f" * 64}
            with self.expect_refusal("ASSET_BOUND"):
                producer.restore_exact_original_assets([capture(), second_asset])
        producer.STAC_SESSION.get.assert_not_called()
        producer.DOWNLOAD_SESSION.get.assert_not_called()

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

    def test_restore_reuses_verified_local_original_before_retired_item_lookup(self):
        expected = capture()
        before_capture = copy.deepcopy(expected)
        target = self.local_original(expected)
        before = target.read_bytes(), self.manifest.read_bytes()
        producer.STAC_SESSION.get.side_effect = [Response(status=404)]

        def portable_verification(path, wanted, *, work_deadline, require_capture=False):
            # Portable control-flow proof only; --native below uses the real
            # owned reader, ecCodes headers, EOF, release and physical close.
            self.assertEqual(path, target)
            self.assertTrue(require_capture)
            self.assertEqual(len(path.read_bytes()), wanted["contentLengthBytes"])
            self.assertEqual(hashlib.sha256(path.read_bytes()).hexdigest(), wanted["contentSha256"])
            self.assertTrue(producer._exact_same_capture(
                json.loads(self.manifest.read_text())["assets"][target.name], wanted))

        with patch.object(producer, "_verify_exact_original_file", side_effect=portable_verification) as verify, \
             patch.object(producer, "supervised_asset_operation", wraps=producer.supervised_asset_operation) as supervise, \
             patch.object(producer, "download_asset", side_effect=AssertionError("local reuse must not download")):
            report = producer.restore_exact_original_assets([expected, expected])
        verify.assert_called_once()
        supervise.assert_called_once()
        self.assertEqual((report["uniqueAssetCount"], report["reusedAssetCount"],
                          report["downloadedAssetCount"], report["downloadedBytes"]), (1, 1, 0, 0))
        self.assertEqual(report["status"], "RESTORED")
        self.assertEqual(expected, before_capture)
        self.assertEqual((target.read_bytes(), self.manifest.read_bytes()), before)
        producer.STAC_SESSION.get.assert_not_called()
        producer.DOWNLOAD_SESSION.get.assert_not_called()

    def test_local_verification_failure_or_toctou_loss_never_falls_back_to_stac(self):
        expected = capture()
        failures = [producer.GribReadUnproven("owned refusal"),
                    producer.ExactOriginalRestoreRejected("DMI_EXACT_ORIGINAL_CONTENT_MISMATCH"),
                    producer.ExactOriginalRestoreRejected("DMI_EXACT_ORIGINAL_HEADER_MISMATCH"),
                    FileNotFoundError("file vanished after the local preflight")]
        for error in failures:
            target = self.local_original(expected)
            before = target.read_bytes(), self.manifest.read_bytes()
            with self.subTest(kind=type(error).__name__), \
                 patch.object(producer, "_verify_exact_original_file", side_effect=error) as verify, \
                 patch.object(producer, "download_asset", side_effect=AssertionError("no local fallback")):
                with self.assertRaises(type(error)) as raised:
                    producer.restore_exact_original_assets([expected])
                self.assertIs(raised.exception, error)
                verify.assert_called_once()
            self.assertEqual((target.read_bytes(), self.manifest.read_bytes()), before)
        producer.STAC_SESSION.get.assert_not_called()
        producer.DOWNLOAD_SESSION.get.assert_not_called()

    def test_unknown_local_capture_and_legacy_name_are_not_upgraded_or_downloaded(self):
        expected = capture()
        target = self.local_original(expected)
        good = {**expected, "canonicalHref": HREF}
        rows = [{}, {target.name: {**good, "contentSha256": "f" * 64}},
                {target.name: {key: value for key, value in good.items() if key != "itemId"}},
                {"legacy-original.grib": good},
                {target.name: {**good, "canonicalHref": HREF + "?token=not-canonical"}}]
        for assets in rows:
            self.manifest.write_text(json.dumps({"schemaVersion": 2, "assets": assets}), encoding="utf-8")
            before = target.read_bytes(), self.manifest.read_bytes()
            with self.subTest(fields=list(assets)), self.expect_refusal("COLLISION"):
                producer.restore_exact_original_assets([expected])
            self.assertEqual((target.read_bytes(), self.manifest.read_bytes()), before)
        producer.STAC_SESSION.get.assert_not_called()
        producer.DOWNLOAD_SESSION.get.assert_not_called()

    def test_only_initial_local_absence_may_resolve_the_exact_retired_item(self):
        expected = capture()
        target = self.local_original(expected)
        target.unlink()  # A complete manifest alone is not a physical original.
        before = self.manifest.read_bytes()
        producer.STAC_SESSION.get.side_effect = [Response(status=410)]
        with patch.object(producer, "_verify_exact_original_file", side_effect=AssertionError("no local file")):
            with self.expect_refusal("METADATA_UNAVAILABLE"):
                producer.restore_exact_original_assets([expected])
        producer.STAC_SESSION.get.assert_called_once()
        producer.DOWNLOAD_SESSION.get.assert_not_called()
        self.assertEqual(self.manifest.read_bytes(), before)
        self.assertFalse(target.exists())

    def test_file_seen_in_inventory_then_lost_at_local_preflight_never_resolves_stac(self):
        target = self.local_original()
        real_lstat, reads = Path.lstat, 0

        def lstat(path, *args, **kwargs):
            nonlocal reads
            if path == target:
                reads += 1
                # Both full inventories observed the file. The selected local
                # path then disappears before the owned verifier can open it.
                if reads == 3:
                    raise FileNotFoundError("lost after inventory")
            return real_lstat(path, *args, **kwargs)

        with patch.object(Path, "lstat", lstat), self.assertRaises(FileNotFoundError):
            producer.restore_exact_original_assets([capture()])
        self.assertEqual(reads, 3)
        producer.STAC_SESSION.get.assert_not_called()
        producer.DOWNLOAD_SESSION.get.assert_not_called()

    def test_loss_immediately_after_first_or_local_inventory_return_never_resolves_stac(self):
        for lost_after in (1, 2):
            target = self.local_original()
            original_state, reads = producer._exact_raw_state, 0
            before = self.manifest.read_bytes()

            def state(*args, **kwargs):
                nonlocal reads
                result = original_state(*args, **kwargs)
                reads += 1
                if reads == lost_after:
                    target.unlink()  # Precisely after successful lstat/inventory return.
                return result

            with self.subTest(lost_after=lost_after), patch.object(producer, "_exact_raw_state", side_effect=state):
                with self.assertRaises(FileNotFoundError):
                    producer.restore_exact_original_assets([capture()])
            self.assertEqual(self.manifest.read_bytes(), before)
            producer.STAC_SESSION.get.assert_not_called()
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

    def test_restore_all_missing_total_budgets_refuse_before_any_transport(self):
        first = capture()
        second = {**capture(), "itemId": "another-original", "assetIdentitySha256": "0" * 64}
        existing = self.raw / "unrelated-original.grib"
        existing.write_bytes(b"unrelated immutable original")
        before = existing.read_bytes(), self.manifest.read_bytes()
        manifest, used = producer._exact_raw_state()
        missing_bytes = first["contentLengthBytes"] + second["contentLengthBytes"]
        capacity = producer._exact_original_check_disk_space(manifest, [first, second], used)
        raw_total = capacity["requiredRawBytes"]
        self.assertEqual(capacity["currentManifestBytes"], len(before[1]))
        self.assertEqual(raw_total, used + missing_bytes + max(0,
            capacity["prospectiveManifestBytes"] - len(before[1])))
        self.assertGreater(raw_total, used + missing_bytes)
        for budget_name, code in (("RAW_CACHE_MAX_BYTES", "CACHE_BUDGET"),
                                  ("MAX_DOWNLOAD_BYTES", "DOWNLOAD_BUDGET")):
            with self.subTest(budget=budget_name), \
                 patch.object(producer, "RAW_CACHE_MAX_BYTES", raw_total), \
                 patch.object(producer, "MAX_DOWNLOAD_BYTES", missing_bytes), \
                 patch.object(producer, budget_name,
                     raw_total - 1 if budget_name == "RAW_CACHE_MAX_BYTES" else missing_bytes - 1), \
                 patch.object(producer, "resolve_exact_original_item", side_effect=AssertionError("metadata before total preflight")) as resolve, \
                 patch.object(producer, "download_asset", side_effect=AssertionError("download before total preflight")) as download, \
                 patch.object(producer, "prune_raw_cache", side_effect=AssertionError("pruning forbidden")) as prune:
                with self.expect_refusal(code):
                    producer.restore_exact_original_assets([first, second, first])
                resolve.assert_not_called()
                download.assert_not_called()
                prune.assert_not_called()
            self.assertEqual((existing.read_bytes(), self.manifest.read_bytes()), before)
        producer.STAC_SESSION.get.assert_not_called()
        producer.DOWNLOAD_SESSION.get.assert_not_called()


    def test_restore_physical_disk_capacity_precedes_metadata_and_body(self):
        unit = 4096
        filesystem = patch.object(producer.os, "statvfs",
            return_value=types.SimpleNamespace(f_frsize=unit), create=True)
        filesystem.start()
        self.addCleanup(filesystem.stop)
        allocated = lambda length: ((length + unit - 1) // unit) * unit
        expected = capture()
        plan = self.make_plan()
        self.read_plan(plan)  # Existing real owned-file fixture; no transport.
        original = copy.deepcopy(expected)
        before = self.manifest.read_bytes()
        manifest, used = producer._exact_raw_state()
        with patch.object(producer.shutil, "disk_usage", return_value=types.SimpleNamespace(free=10**15)):
            capacity = producer._exact_original_check_disk_space(manifest, [expected], used)
            required = capacity["requiredFreeBytes"]
        self.assertGreater(required, len(BODY) + 2 * (self.raw / ".original-recovery-plan.json").stat().st_size)
        self.assertEqual(required % unit, 0)
        many = [{**expected, "itemId": "small-" + str(index)} for index in range(7)]
        with patch.object(producer.shutil, "disk_usage", return_value=types.SimpleNamespace(free=10**15)):
            rounded_many = producer._exact_original_check_disk_space(manifest, many, used)["requiredFreeBytes"]
        self.assertGreaterEqual(rounded_many - required, 6 * allocated(len(BODY)))
        self.assertIn("DMI_EXACT_ORIGINAL_DISK_BUDGET", producer._EXACT_ORIGINAL_FAILURE_CODES)
        with patch.object(producer.shutil, "disk_usage", return_value=types.SimpleNamespace(free=required - 1)) as usage, \
             patch.object(producer, "prune_raw_cache", side_effect=AssertionError("no pruning")) as prune:
            with self.expect_refusal("DISK_BUDGET"):
                producer.restore_exact_original_assets([expected])
            usage.assert_called_once_with(self.raw)
            prune.assert_not_called()
        producer.STAC_SESSION.get.assert_not_called()
        producer.DOWNLOAD_SESSION.get.assert_not_called()
        self.assertEqual(self.manifest.read_bytes(), before)
        for observed in (OSError("private disk path must not escape"), types.SimpleNamespace(free=-1),
                         types.SimpleNamespace(free=True), types.SimpleNamespace()):
            options = {"side_effect": observed} if isinstance(observed, OSError) else {"return_value": observed}
            with self.subTest(disk=type(observed).__name__), patch.object(producer.shutil, "disk_usage", **options):
                with self.assertRaisesRegex(OSError, "^DMI_EXACT_ORIGINAL_DISK_STATE_UNAVAILABLE$"):
                    producer.restore_exact_original_assets([expected])
            self.assertEqual(self.manifest.read_bytes(), before)
        for observed in (OSError("private filesystem path must not escape"),
                         types.SimpleNamespace(f_frsize=0), types.SimpleNamespace(f_frsize=-1),
                         types.SimpleNamespace(f_frsize=True), types.SimpleNamespace()):
            options = {"side_effect": observed} if isinstance(observed, OSError) else {"return_value": observed}
            with self.subTest(filesystem=type(observed).__name__), patch.object(producer.os, "statvfs", **options):
                with self.assertRaisesRegex(OSError, "^DMI_EXACT_ORIGINAL_DISK_STATE_UNAVAILABLE$"):
                    producer.restore_exact_original_assets([expected])
        producer.STAC_SESSION.get.assert_not_called()
        producer.DOWNLOAD_SESSION.get.assert_not_called()
        producer.STAC_SESSION.get.assert_not_called()
        producer.DOWNLOAD_SESSION.get.assert_not_called()
        # Exact equality passes into the SAME normal STAC/download writer.
        # Reuse the existing portable header/lease boundary; this is not GRIB proof.
        producer.STAC_SESSION.get.side_effect = [metadata_response()]
        producer.DOWNLOAD_SESSION.get.side_effect = [Response(BODY)]
        with patch.object(producer.shutil, "disk_usage", return_value=types.SimpleNamespace(free=required)), \
             patch.object(producer, "_verify_exact_original_file", side_effect=self.portable_locator_verification), \
             patch.object(producer, "prune_raw_cache", side_effect=AssertionError("no pruning")) as prune:
            report = producer.restore_exact_original_assets([expected])
            prune.assert_not_called()
        self.assertEqual((report["status"], report["downloadedBytes"]), ("RESTORED", len(BODY)))
        producer.STAC_SESSION.get.assert_called_once()
        producer.DOWNLOAD_SESSION.get.assert_called_once()
        self.assertEqual(expected, original)
        actual_manifest = self.manifest.read_bytes()
        actual_growth = max(0, len(actual_manifest) - len(before))
        # Independently check the actual writer's physical peak is covered,
        # without treating a JSON codec/raw byte sum as the file size.
        self.assertGreaterEqual(required, allocated(len(BODY)) + actual_growth + allocated(len(actual_manifest)))
        self.assertEqual(producer.cached_asset_path(HREF).read_bytes(), BODY)

    def test_restore_mixed_plan_verifies_all_local_then_budgets_only_missing_bytes(self):
        local = capture()
        absent_href = HREF.replace("exact-original", "absent-original")
        absent = {**capture(), "itemId": "absent-original",
                  "assetIdentitySha256": hashlib.sha256(absent_href.encode()).hexdigest()}
        target = self.local_original(local)
        before = target.read_bytes(), self.manifest.read_bytes()
        manifest, used = producer._exact_raw_state()
        capacity = producer._exact_original_check_disk_space(manifest, [absent], used)
        raw_total = capacity["requiredRawBytes"]
        self.assertEqual(capacity["currentManifestBytes"], len(before[1]))
        self.assertEqual(raw_total, used + absent["contentLengthBytes"] + max(0,
            capacity["prospectiveManifestBytes"] - len(before[1])))
        self.assertGreater(raw_total, used + absent["contentLengthBytes"])
        events = []

        def verify(path, wanted, *, work_deadline, require_capture=False):
            self.assertEqual((path, wanted, require_capture), (target, local, True))
            self.assertEqual(hashlib.sha256(path.read_bytes()).hexdigest(), wanted["contentSha256"])
            events.append("local-verified")

        def resolve(wanted, *, work_deadline):
            self.assertEqual(events, ["local-verified"], "every local must precede even STAC")
            self.assertEqual(wanted, absent)
            events.append("resolve-absent")
            metadata = item(absent)
            metadata["assets"]["data"]["href"] = absent_href
            return producer.canonical_stac_item_identity(metadata)

        def download(href, declared, budget, **kwargs):
            self.assertEqual(events, ["local-verified", "resolve-absent"])
            self.assertEqual((href, declared), (absent_href, absent["assetSizeBytes"]))
            self.assertEqual(kwargs["expected_capture"], absent)
            self.assertEqual(budget, {"bytes": 0})
            budget["bytes"] += absent["contentLengthBytes"]
            events.append("download-absent")
            return self.raw / "synthetic-absent-result", False

        with patch.object(producer, "_verify_exact_original_file", side_effect=verify), \
             patch.object(producer, "resolve_exact_original_item", side_effect=resolve) as resolve_mock, \
             patch.object(producer, "download_asset", side_effect=download) as download_mock, \
             patch.object(producer, "RAW_CACHE_MAX_BYTES", raw_total), \
             patch.object(producer, "MAX_DOWNLOAD_BYTES", absent["contentLengthBytes"]), \
             patch.object(producer, "prune_raw_cache", side_effect=AssertionError("pruning forbidden")) as prune:
            report = producer.restore_exact_original_assets([absent, local, absent])
        self.assertEqual(events, ["local-verified", "resolve-absent", "download-absent"])
        self.assertEqual((report["uniqueAssetCount"], report["reusedAssetCount"],
                          report["downloadedAssetCount"], report["downloadedBytes"]),
                         (2, 1, 1, absent["contentLengthBytes"]))
        self.assertEqual(report["status"], "RESTORED")
        resolve_mock.assert_called_once()
        download_mock.assert_called_once()
        prune.assert_not_called()
        self.assertEqual((target.read_bytes(), self.manifest.read_bytes()), before)
        producer.STAC_SESSION.get.assert_not_called()
        producer.DOWNLOAD_SESSION.get.assert_not_called()

    def test_restore_missing_first_never_transports_before_later_local_failure(self):
        local = capture()
        absent = {**capture(), "itemId": "absent-original", "assetIdentitySha256": "0" * 64}
        self.assertLess(producer._exact_original_json(absent), producer._exact_original_json(local))
        target = self.local_original(local)
        before = target.read_bytes(), self.manifest.read_bytes()
        failures = [producer.ExactOriginalRestoreRejected("DMI_EXACT_ORIGINAL_CONTENT_MISMATCH"),
                    producer.GribReadUnproven("owned close unproved"),
                    FileNotFoundError("local disappeared during verification")]
        for error in failures:
            with self.subTest(kind=type(error).__name__), \
                 patch.object(producer, "_verify_exact_original_file", side_effect=error) as verify, \
                 patch.object(producer, "resolve_exact_original_item", side_effect=AssertionError("metadata before all locals verified")) as resolve, \
                 patch.object(producer, "download_asset", side_effect=AssertionError("download before all locals verified")) as download:
                with self.assertRaises(type(error)) as raised:
                    producer.restore_exact_original_assets([absent, local])
                self.assertIs(raised.exception, error)
                verify.assert_called_once()
                resolve.assert_not_called()
                download.assert_not_called()
            self.assertEqual((target.read_bytes(), self.manifest.read_bytes()), before)
        producer.STAC_SESSION.get.assert_not_called()
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
        unregistered = producer.cached_asset_path(HREF)
        original_bytes = b"old uncaptured ordinary file"
        unregistered.write_bytes(original_bytes)
        # Ordinary RAW retention now deliberately denies replacing unknown
        # existing bytes. A new path must still use the normal downloader,
        # never borrow the separately gated exact-restore transport/decoder.
        fresh_href = HREF.replace("exact-original.grib", "ordinary-new.grib")
        target = producer.cached_asset_path(fresh_href)
        self.assertNotEqual(target, unregistered)
        producer.DOWNLOAD_SESSION.get.side_effect = [Response(BODY)]
        with patch.object(producer, "_exact_raw_state", side_effect=AssertionError("optin leaked")), \
             patch.object(producer, "_verify_exact_original_file", side_effect=AssertionError("optin leaked")):
            with self.assertRaisesRegex(producer.AssetDownloadCleanupUnproven,
                                        "^DMI_RAW_CURRENT_EXISTING_UNPROVED$"):
                producer.download_asset(HREF, len(BODY), {"bytes": 0})
            self.assertEqual(unregistered.read_bytes(), original_bytes)
            producer.DOWNLOAD_SESSION.get.assert_not_called()
            actual, reused = producer.download_asset(fresh_href, len(BODY), {"bytes": 0})
        self.assertEqual(actual, target)
        self.assertFalse(reused)
        self.assertEqual(target.read_bytes(), BODY)
        self.assertEqual(unregistered.read_bytes(), original_bytes)
        self.assertEqual(producer.DOWNLOAD_SESSION.get.call_args.args, (fresh_href,))
        self.assertNotIn("allow_redirects", producer.DOWNLOAD_SESSION.get.call_args.kwargs)
        producer.STAC_SESSION.get.assert_not_called()

    def test_unknown_stac_size_reserves_actual_header_not_the_entire_download_budget(self):
        # This is the normal downloader, not exact-restore or native admission.
        # The real small file fits; reserving the whole allowance plus manifest
        # metadata does not fit even this otherwise empty, genuine RAW fixture.
        expected = capture()
        href = HREF.replace("exact-original.grib", "ordinary-unknown-size.grib")
        response = Response(BODY)
        budget = {"bytes": 0}
        producer.DOWNLOAD_SESSION.get.side_effect = [response]
        with patch.object(producer, "RAW_CACHE_MAX_BYTES", 8192), \
             patch.object(producer, "MAX_DOWNLOAD_BYTES", 8192), \
             patch.object(producer, "_RAW_CURRENT_PROTECTED", None):
            target, reused = producer.download_asset(href, None, budget,
                collection=expected["collection"], model_run=expected["modelRun"], valid_time=expected["validTime"],
                item_id="ordinary-unknown-size", item_created_at=expected["itemCreatedAt"])
        self.assertFalse(reused)
        self.assertTrue(response.closed)
        self.assertEqual(target.read_bytes(), BODY)
        self.assertEqual(budget["bytes"], len(BODY))
        row = json.loads(self.manifest.read_text())["assets"][target.name]
        self.assertIsNone(row["assetSizeBytes"], "HTTP length must never become a fabricated STAC size")
        self.assertEqual(row["contentLengthBytes"], len(BODY))
        self.assertEqual(row["contentSha256"], hashlib.sha256(BODY).hexdigest())
        self.assertEqual(row["canonicalHref"], href)
        producer.DOWNLOAD_SESSION.get.assert_called_once()
        producer.STAC_SESSION.get.assert_not_called()

    def ordinary_unknown_download(self):
        expected = capture()
        return producer.download_asset(HREF, None, {"bytes": 0},
            collection=expected["collection"], model_run=expected["modelRun"], valid_time=expected["validTime"],
            item_id=expected["itemId"], item_created_at=expected["itemCreatedAt"])

    def test_unknown_stac_headers_refuse_before_body_temp_or_registration(self):
        invalid = [None, "", "0", "-1", "+1", " 1", "1 ", "1, 1", "1.0", "1e3", "١", 1, True]
        for headers in ([{"content-length": value} for value in invalid]
                        + [{"content-encoding": ""}, {"content-encoding": "gzip"}, {"content-encoding": "br"},
                           {"transfer-encoding": "chunked"}]):
            with self.subTest(headers=headers):
                response = Response(BODY, **headers)
                response.iter_content = Mock(side_effect=AssertionError("header rejection read body"))
                before = {entry.name: entry.read_bytes() for entry in self.raw.iterdir()}
                producer.DOWNLOAD_SESSION.get.side_effect = [response]
                with patch.object(producer, "MAX_DOWNLOAD_BYTES", 8192), \
                     patch.object(producer, "RAW_CACHE_MAX_BYTES", 8192), \
                     patch.object(producer.tempfile, "NamedTemporaryFile") as temporary, \
                     patch.object(producer, "register_raw_cache_asset") as register:
                    with self.assertRaisesRegex(RuntimeError, "invalid Content-Length"):
                        self.ordinary_unknown_download()
                self.assertTrue(response.closed)
                response.iter_content.assert_not_called()
                temporary.assert_not_called()
                register.assert_not_called()
                self.assertEqual({entry.name: entry.read_bytes() for entry in self.raw.iterdir()}, before)

    def test_unknown_stac_capacity_and_download_budget_refuse_after_headers_before_body(self):
        for raw_capacity, download_capacity, error in ((4096, 8192, "DMI_RAW_CURRENT_CACHE_BUDGET"),
                                                     (8192, len(BODY) - 1, "download budget exceeded")):
            with self.subTest(raw_capacity=raw_capacity):
                response = Response(BODY)
                response.iter_content = Mock(side_effect=AssertionError("capacity rejection read body"))
                producer.DOWNLOAD_SESSION.get.side_effect = [response]
                before = {entry.name: entry.read_bytes() for entry in self.raw.iterdir()}
                with patch.object(producer, "RAW_CACHE_MAX_BYTES", raw_capacity), \
                     patch.object(producer, "MAX_DOWNLOAD_BYTES", download_capacity), \
                     patch.object(producer, "_RAW_CURRENT_PROTECTED", None), \
                     patch.object(producer.tempfile, "NamedTemporaryFile") as temporary, \
                     patch.object(producer, "register_raw_cache_asset") as register:
                    with self.assertRaisesRegex(RuntimeError, error):
                        self.ordinary_unknown_download()
                self.assertTrue(response.closed)
                response.iter_content.assert_not_called()
                temporary.assert_not_called()
                register.assert_not_called()
                self.assertEqual({entry.name: entry.read_bytes() for entry in self.raw.iterdir()}, before)
        self.assertEqual(len(producer._UNSETTLED_ASSET_DOWNLOADS), 1,
                         "Existing fatal RAW-policy refusal is not silently downgraded to recoverable")

    def test_unknown_stac_reservation_precedes_temp_body_and_preserves_real_eof_length(self):
        events = []
        response = Response(BODY)
        original_prepare = producer.prepare_raw_cache_space
        original_temp = producer.tempfile.NamedTemporaryFile
        original_body = response.iter_content
        def prepare(incoming, **kwargs):
            self.assertEqual(incoming, len(BODY))
            events.append("reserve")
            return original_prepare(incoming, **kwargs)
        def temporary(*args, **kwargs):
            self.assertEqual(events, ["reserve"])
            events.append("temp")
            return original_temp(*args, **kwargs)
        def body(size):
            self.assertEqual(events, ["reserve", "temp"])
            events.append("body")
            yield from original_body(size)
        response.iter_content = body
        producer.DOWNLOAD_SESSION.get.side_effect = [response]
        with patch.object(producer, "RAW_CACHE_MAX_BYTES", 8192), \
             patch.object(producer, "MAX_DOWNLOAD_BYTES", 8192), \
             patch.object(producer, "prepare_raw_cache_space", side_effect=prepare), \
             patch.object(producer.tempfile, "NamedTemporaryFile", side_effect=temporary):
            target, _reused = self.ordinary_unknown_download()
        self.assertEqual(events, ["reserve", "temp", "body"])
        self.assertEqual(target.read_bytes(), BODY)
        self.assertTrue(response.closed)

    def test_unknown_stac_short_or_long_body_never_publishes_or_registers(self):
        for length in (len(BODY) + 1, len(BODY) - 1):
            with self.subTest(length=length), tempfile.TemporaryDirectory() as folder:
                raw = Path(folder)
                response = Response(BODY, **{"content-length": str(length)})
                producer.DOWNLOAD_SESSION.get.side_effect = [response]
                with patch.object(producer, "RAW_DIR", raw), \
                     patch.object(producer, "RAW_CACHE_MAX_BYTES", 8192), \
                     patch.object(producer, "MAX_DOWNLOAD_BYTES", 8192), \
                     patch.object(producer, "_RAW_CURRENT_PROTECTED", None), \
                     patch.object(producer, "register_raw_cache_asset") as register:
                    with self.assertRaisesRegex(RuntimeError, "incomplete|INCOMING_LENGTH_EXCEEDED"):
                        self.ordinary_unknown_download()
                    self.assertFalse(producer.cached_asset_path(HREF).exists())
                self.assertTrue(response.closed)
                register.assert_not_called()

    def test_unknown_stac_header_failure_preserves_first_cause_and_fatal_cleanup(self):
        class FirstCause(RuntimeError):
            def __bool__(self): return False
        first = FirstCause("synthetic first capacity refusal")
        for close_fails in (False, True):
            with self.subTest(close_fails=close_fails):
                class ObservedResponse(Response):
                    def __exit__(self, _kind, error, _traceback):
                        self.closed = True
                        self.error_seen = error
                        if close_fails:
                            raise RuntimeError("synthetic close failure")
                response = ObservedResponse(BODY)
                producer.DOWNLOAD_SESSION.get.side_effect = [response]
                with patch.object(producer, "prepare_raw_cache_space", side_effect=first), \
                     patch.object(producer.tempfile, "NamedTemporaryFile") as temporary:
                    with self.assertRaises(RuntimeError) as caught:
                        self.ordinary_unknown_download()
                self.assertTrue(response.closed)
                self.assertIs(response.error_seen, first)
                temporary.assert_not_called()
                if close_fails:
                    self.assertIsInstance(caught.exception, producer.AssetDownloadCleanupUnproven)
                    self.assertIs(caught.exception.__cause__, first)
                else:
                    self.assertIs(caught.exception, first)

    def test_known_stac_capacity_and_download_budget_still_refuse_before_http(self):
        for raw_capacity, download_capacity in ((4096, 8192), (8192, len(BODY) - 1)):
            with self.subTest(raw_capacity=raw_capacity), \
                 patch.object(producer, "RAW_CACHE_MAX_BYTES", raw_capacity), \
                 patch.object(producer, "MAX_DOWNLOAD_BYTES", download_capacity), \
                 self.assertRaises(RuntimeError):
                producer.download_asset(HREF, len(BODY), {"bytes": 0})
        producer.DOWNLOAD_SESSION.get.assert_not_called()

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


    def inventory_report(self, plan, *, digest=None):
        # Same normal plan reader and existing portable identity distinction;
        # only the new metadata/lstat observer is imported from its real file.
        self.read_plan(plan)
        body = (self.raw / ".original-recovery-plan.json").read_bytes()
        spec = importlib.util.spec_from_file_location("exact_pretransport_inventory",
            Path(__file__).with_name("inspect-exact-dmi-original-plan.py"))
        inventory = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(inventory)
        identity = (patch.object(producer._OwnedGribRead, "_identity", staticmethod(
            lambda info: (info.st_dev, info.st_ino, info.st_mode, info.st_size)))
            if os.name == "nt" and not NATIVE else nullcontext())
        with identity, patch.dict(os.environ, GITHUB_SHA=HEAD,
                                  DMI_EXACT_ORIGINAL_PLAN_SHA256=digest or hashlib.sha256(body).hexdigest()), \
             patch.object(producer, "_verify_exact_original_file", side_effect=AssertionError("no GRIB read")), \
             patch.object(producer, "restore_exact_original_assets", side_effect=AssertionError("no restore")):
            return inventory.inspect_exact_original_plan(producer)

    def test_pretransport_inventory_deduplicates_captures_and_reports_only_bounded_metadata(self):
        first = capture()
        second = {**first, "acquiredAt": "2026-10-14T02:00:00Z"}
        other = {**first, "collection": "dkss_nsbs", "modelRun": "2026-10-09T06:00:00Z",
                 "validTime": "2026-10-14T01:00:00Z", "itemId": "OTHER_PRIVATE_ITEM",
                 "assetIdentitySha256": "f" * 64}
        report = self.inventory_report(self.make_plan([first, second, other]))
        self.assertEqual((report["originalCount"], report["uniqueAssetCount"]), (3, 2))
        self.assertEqual(report["requiredUniqueBytes"], 2 * len(BODY))
        self.assertEqual(report["modelRun"], {"minimum": producer.canonical_time(first["modelRun"]),
                                             "maximum": producer.canonical_time(other["modelRun"])})
        self.assertEqual(report["validTime"], {"minimum": producer.canonical_time(first["validTime"]),
                                              "maximum": producer.canonical_time(other["validTime"])})
        self.assertEqual(report["uniqueAssetCountByCollection"]["dkss_lf"], 1)
        self.assertEqual(report["uniqueAssetCountByCollection"]["dkss_nsbs"], 1)
        self.assertEqual(report["noManifestAssetCount"], 2)
        self.assertFalse(report["fileContentVerified"])
        for key in ("transportPerformed", "decodePerformed", "restorePerformed", "cacheSaved"):
            self.assertFalse(report[key])
        text = json.dumps(report)
        self.assertLess(len(text), 8192)
        for private in ("OTHER_PRIVATE_ITEM", first["itemId"], first["assetIdentitySha256"], HREF, "api-key"):
            self.assertNotIn(private, text)
        producer.STAC_SESSION.get.assert_not_called()
        producer.DOWNLOAD_SESSION.get.assert_not_called()

    def test_pretransport_inventory_distinguishes_exact_manifest_from_file_presence(self):
        expected = capture()
        target = self.local_original(expected)
        before = target.read_bytes(), self.manifest.read_bytes()
        present = self.inventory_report(self.make_plan())
        self.assertEqual((present["validatedManifestAssetCount"], present["validatedManifestFilePresentCount"],
                          present["validatedManifestFileMissingCount"]), (1, 1, 0))
        self.assertEqual((target.read_bytes(), self.manifest.read_bytes()), before)
        target.unlink()
        missing = self.inventory_report(self.make_plan())
        self.assertEqual((missing["validatedManifestAssetCount"], missing["validatedManifestFilePresentCount"],
                          missing["validatedManifestFileMissingCount"]), (1, 0, 1))
        self.assertEqual(self.manifest.read_bytes(), before[1])
        producer.STAC_SESSION.get.assert_not_called()
        producer.DOWNLOAD_SESSION.get.assert_not_called()

    def test_pretransport_inventory_refuses_unbound_plan_before_report(self):
        output = io.StringIO()
        with redirect_stdout(output), self.expect_refusal("PLAN_REJECTED"):
            self.inventory_report(self.make_plan(), digest="0" * 64)
        self.assertEqual(output.getvalue(), "")
        producer.STAC_SESSION.get.assert_not_called()
        producer.DOWNLOAD_SESSION.get.assert_not_called()

    def test_pretransport_download_candidate_comparison_is_full_hash_only_not_transport(self):
        filename = "dkss_lf_SF_20261009T000000Z_20261014T000000Z.grib"
        expected = {**capture(), "itemId": filename,
                    "assetIdentitySha256": producer.asset_identity_sha256(
                        "https://opendataapi.dmi.dk/v1/forecastdata/download/" + filename.replace("dkss_lf_SF_", "DKSS_LF_SF_"))}
        report = self.inventory_report(self.make_plan([expected]))
        comparison = report["deterministicDownloadIdentity"]
        self.assertEqual(comparison["fullIdentityMatchesByKnownHost"], {"opendataapi.dmi.dk": 1})
        self.assertFalse(comparison["remoteAvailabilityChecked"])
        self.assertFalse(comparison["usedForTransport"])
        self.assertNotIn(filename, json.dumps(report))
        changed = {**expected, "assetIdentitySha256": expected["assetIdentitySha256"][:24] + "f" * 40}
        report = self.inventory_report(self.make_plan([changed]))
        self.assertEqual(report["deterministicDownloadIdentity"]["fullIdentityMatchesByKnownHost"], {"opendataapi.dmi.dk": 0})
        producer.STAC_SESSION.get.assert_not_called()
        producer.DOWNLOAD_SESSION.get.assert_not_called()

    def test_pretransport_inventory_does_not_upgrade_unregistered_or_conflicting_originals(self):
        target = self.local_original()
        self.manifest.write_text('{"schemaVersion":2,"assets":{}}\n', encoding="utf-8")
        unknown = self.inventory_report(self.make_plan())
        self.assertEqual((unknown["noManifestAssetCount"], unknown["noManifestPrefixFilePresentCount"]), (1, 1))
        self.manifest.write_text(json.dumps({"schemaVersion": 2, "assets": {
            target.name: {**capture(), "canonicalHref": HREF + "?api-key=SECRET_MUST_NOT_LEAK"}}}), encoding="utf-8")
        before = target.read_bytes(), self.manifest.read_bytes()
        conflict = self.inventory_report(self.make_plan())
        self.assertEqual(conflict["conflictingManifestAssetCount"], 1)
        self.assertEqual(conflict["validatedManifestAssetCount"], 0)
        self.assertNotIn("SECRET_MUST_NOT_LEAK", json.dumps(conflict))
        self.assertEqual((target.read_bytes(), self.manifest.read_bytes()), before)
        producer.STAC_SESSION.get.assert_not_called()
        producer.DOWNLOAD_SESSION.get.assert_not_called()


    def locator_capture(self, body=BODY, *, collection="dkss_lf", uppercase=True):
        filename = collection + "_sf_20261009T000000Z_20261014T000000Z.grib"
        located = filename.replace(collection + "_sf_", (collection + "_sf_").upper(), 1) if uppercase else filename
        href = "https://opendataapi.dmi.dk/v1/forecastdata/download/" + located
        return {**capture(body), "collection": collection, "itemId": filename,
                "assetIdentitySha256": hashlib.sha256(href.encode()).hexdigest()}, href

    def portable_locator_verification(self, path, wanted, *, work_deadline, require_capture=False):
        # Normal download_asset still performs the actual streaming digest,
        # length, exclusive install and registration. Only ecCodes/lease proof
        # is replaced on Windows; the native case below uses the real reader.
        self.assertEqual(path.stat().st_size, wanted["contentLengthBytes"])
        self.assertEqual(hashlib.sha256(path.read_bytes()).hexdigest(), wanted["contentSha256"])
        if require_capture:
            row = json.loads(self.manifest.read_text())["assets"][path.name]
            self.assertTrue(producer._exact_same_capture(row, wanted))

    def test_locator_missing_stac_restores_only_exact_authenticated_bytes_through_normal_caller(self):
        for status, collection, uppercase in ((404, "dkss_lf", True), (410, "dkss_nsbs", True)):
            with self.subTest(status=status, collection=collection):
                expected, href = self.locator_capture(collection=collection, uppercase=uppercase)
                # Actual documented STAC spelling: lower-case collection with
                # upper-case SF. Only the two documented download spellings
                # are considered, and the full captured URL hash still decides.
                expected["itemId"] = expected["itemId"].replace("_sf_", "_SF_", 1)
                original = copy.deepcopy(expected)
                existing = self.raw / "preserved-other-original.grib"
                existing.write_bytes(b"preserved unrelated original")
                before_existing = existing.read_bytes()
                producer.STAC_SESSION.get.reset_mock()
                producer.DOWNLOAD_SESSION.get.reset_mock()
                producer.STAC_SESSION.get.side_effect = [Response(status=status)]
                producer.DOWNLOAD_SESSION.get.side_effect = [Response(BODY)]
                with patch.object(producer, "_verify_exact_original_file", side_effect=self.portable_locator_verification), \
                     patch.object(producer, "download_asset", wraps=producer.download_asset) as download, \
                     patch.object(producer, "prune_raw_cache", side_effect=AssertionError("no pruning")):
                    report = producer.restore_exact_original_assets([expected, expected])
                self.assertEqual((report["status"], report["uniqueAssetCount"], report["downloadedAssetCount"],
                                  report["downloadedBytes"]), ("RESTORED", 1, 1, len(BODY)))
                self.assertEqual(producer.DOWNLOAD_SESSION.get.call_args.args, (href,))
                self.assertFalse(producer.DOWNLOAD_SESSION.get.call_args.kwargs["allow_redirects"])
                self.assertIsNone(producer.DOWNLOAD_SESSION.get.call_args.kwargs["params"])
                self.assertEqual(download.call_args.kwargs["expected_capture"], original)
                self.assertEqual(expected, original)
                self.assertEqual(existing.read_bytes(), before_existing)
                row = json.loads(self.manifest.read_text())["assets"][producer.cached_asset_path(href).name]
                self.assertTrue(producer._exact_same_capture(row, original))
                self.assertNotEqual(row["acquiredAt"], original["acquiredAt"], "Actual new HTTP acquisition has its own truthful time")

    def test_locator_candidates_are_pure_two_spelling_full_sha_matches_only(self):
        for collection in ("dkss_lf", "dkss_nsbs"):
            for uppercase in (False, True):
                expected, href = self.locator_capture(collection=collection, uppercase=uppercase)
                before = copy.deepcopy(expected)
                self.assertEqual(producer.exact_original_download_candidates(expected), (href,))
                self.assertEqual(expected, before)
                changed = {**expected, "assetIdentitySha256": expected["assetIdentitySha256"][:24] + "f" * 40}
                self.assertEqual(producer.exact_original_download_candidates(changed), ())
            mixed, href = self.locator_capture(collection=collection)
            mixed["itemId"] = mixed["itemId"].replace("_sf_", "_SF_", 1)
            self.assertEqual(producer.exact_original_download_candidates(mixed), (href,))
        producer.STAC_SESSION.get.assert_not_called()
        producer.DOWNLOAD_SESSION.get.assert_not_called()

    def test_locator_unsafe_names_other_models_and_full_hash_mismatch_never_add_http(self):
        good, _ = self.locator_capture()
        for name in ("dkss_lf_sf_../other.grib", "dkss_lf_sf_abc%2fdef.grib", "dkss_lf_sf_abc?x=1.grib",
                     "dkss_lf_sf_abc#frag.grib", "dkss_lf_sf_abc\\def.grib", "dkss_nsbs_sf_abc.grib",
                     "harmonie_dini_sf_abc.grib", "dkss_lf_sf_abc;param.grib", "dKss_lf_SF_abc.grib",
                     "dkss_lf_sf_" + "a" * 401 + ".grib"):
            with self.subTest(name=name):
                wanted = {**good, "itemId": name, "assetIdentitySha256": producer.asset_identity_sha256(
                    "https://opendataapi.dmi.dk/v1/forecastdata/download/" + name)}
                producer.STAC_SESSION.get.side_effect = [Response(status=404)]
                with self.expect_refusal("METADATA_UNAVAILABLE"):
                    producer.restore_exact_original_assets([wanted])
        producer.STAC_SESSION.get.side_effect = [Response(status=410)]
        with self.expect_refusal("METADATA_UNAVAILABLE"):
            producer.restore_exact_original_assets([{**good, "assetIdentitySha256": "f" * 64}])
        producer.DOWNLOAD_SESSION.get.assert_not_called()

    def test_locator_other_metadata_failures_never_enter_historical_transport(self):
        expected, _ = self.locator_capture()
        bad_revision = item(expected)
        bad_revision["id"] = "wrong-official-revision"
        cases = [(Response(status=status), "HTTP_REJECTED") for status in (401, 403, 429, 500)]
        cases += [(metadata_response(bad_revision), "REVISION_MISMATCH"), (Response(b"invalid JSON"), "METADATA_INVALID")]
        for response, code in cases:
            with self.subTest(code=code), \
                 patch.object(producer, "exact_original_download_candidates", side_effect=AssertionError("fallback leaked")):
                producer.STAC_SESSION.get.side_effect = [response]
                with self.expect_refusal(code):
                    producer.restore_exact_original_assets([expected])
        producer.STAC_SESSION.get.side_effect = producer.requests.Timeout("not reportable")
        with patch.object(producer, "exact_original_download_candidates", side_effect=AssertionError("timeout fallback")), \
             self.assertRaises(producer.requests.Timeout):
            producer.restore_exact_original_assets([expected])
        producer.DOWNLOAD_SESSION.get.assert_not_called()

    def test_locator_exact_transport_rejects_wrong_content_and_wrong_headers_without_install(self):
        expected, href = self.locator_capture()
        before = self.manifest.read_bytes()
        producer.STAC_SESSION.get.side_effect = [Response(status=404)]
        producer.DOWNLOAD_SESSION.get.side_effect = [Response(b"X" * len(BODY))]
        with self.expect_refusal("CONTENT_MISMATCH"):
            producer.restore_exact_original_assets([expected])
        self.assertFalse(producer.cached_asset_path(href).exists())
        self.assertEqual(self.manifest.read_bytes(), before)
        producer.STAC_SESSION.get.side_effect = [Response(status=410)]
        producer.DOWNLOAD_SESSION.get.side_effect = [Response(BODY)]
        with patch.object(producer, "_verify_exact_original_file", side_effect=producer.ExactOriginalRestoreRejected(
                "DMI_EXACT_ORIGINAL_HEADER_MISMATCH")), self.expect_refusal("HEADER_MISMATCH"):
            producer.restore_exact_original_assets([expected])
        self.assertFalse(producer.cached_asset_path(href).exists())
        self.assertEqual(self.manifest.read_bytes(), before)
        self.assertEqual(sorted(path.name for path in self.raw.iterdir()), ["asset-manifest.json"])

    def test_locator_raced_destination_is_not_overwritten(self):
        expected, href = self.locator_capture()
        target = producer.cached_asset_path(href)
        before = self.manifest.read_bytes()
        real_link = os.link
        def occupy(source, destination, **kwargs):
            self.assertEqual(destination, target)
            target.write_bytes(b"another immutable original")
            return real_link(source, destination, **kwargs)
        producer.STAC_SESSION.get.side_effect = [Response(status=404)]
        producer.DOWNLOAD_SESSION.get.side_effect = [Response(BODY)]
        with patch.object(producer, "_verify_exact_original_file", side_effect=self.portable_locator_verification), \
             patch.object(os, "link", side_effect=occupy), self.expect_refusal("COLLISION"):
            producer.restore_exact_original_assets([expected])
        self.assertEqual(target.read_bytes(), b"another immutable original")
        self.assertEqual(self.manifest.read_bytes(), before)

    def test_locator_off_origin_redirect_is_still_rejected(self):
        expected, href = self.locator_capture()
        producer.STAC_SESSION.get.side_effect = [Response(status=404)]
        producer.DOWNLOAD_SESSION.get.side_effect = [Response(status=302, location="https://unapproved-s3.invalid/object")]
        with self.expect_refusal("URL_REJECTED"):
            producer.restore_exact_original_assets([expected])
        self.assertEqual(producer.DOWNLOAD_SESSION.get.call_count, 1)
        self.assertEqual(producer.DOWNLOAD_SESSION.get.call_args.args, (href,))
        self.assertFalse(producer.cached_asset_path(href).exists())


    def current586_plan(self, originals=None):
        old = self.make_plan(originals)
        originals = old["originals"]
        return dict(schemaVersion=1, contractId="dmi-current586-exact-original-restore-v1", originals=originals,
            binding=dict(scope="CURRENT586_EXACT_ORIGINAL_RESTORE_39666991481_1",
                failedRun="39666991481", failedAttempt=1, targetReferenceAt="2026-10-21T20:00:00.000Z",
                sourceHead="94b2b6173747b9d1f7d261c5110042a657af0cac", executionHead=HEAD,
                protectedBundleSha256="e9e7b9327df875133b7c2c00ef6440bc411ef2178a9edf9d6cb1ba1a3e7555c3",
                protectedDatasetId="rr-current586-reader-test", protectedProductionReferenceAt="2026-10-21T02:00:00.000Z",
                protectedGeneratedAt="2026-10-21T02:01:00.000Z", sourceDescriptorSha256="1" * 64,
                modelBindingSha256="2" * 64, modelBundleSha256="6d8f7cca203b5f7ee5155f3c0cdb39403a02fd0eb30fecaca5070ef9f814a805",
                conditionsSha256="3" * 64, checkpointGenerationSha256="4" * 64, remoteCheckpointSha256="5" * 64,
                remoteCheckpointVersion=7, discoverySha256="6" * 64,
                originalsSha256=old["binding"]["originalsSha256"], partCount=673, nonce="a" * 32))

    def test_current586_plan_uses_actual_normal_reader_without_progress_or_transport(self):
        plan = self.current586_plan()
        before = copy.deepcopy(plan)
        body = (producer._exact_original_json(plan) + "\n").encode()
        self.assertEqual(self.read_plan(plan, body=body), before)
        self.assertEqual(plan, before)
        self.assertNotIn("progressSource", plan["binding"])
        self.assertNotIn("progressCacheKey", plan["binding"])
        self.assertEqual(plan["originals"][0]["acquiredAt"], capture()["acquiredAt"])
        producer.STAC_SESSION.get.assert_not_called()
        producer.DOWNLOAD_SESSION.get.assert_not_called()
        if not NATIVE:
            for name in ("codes_grib_new_from_file", "codes_get_array", "codes_get_elements"):
                getattr(eccodes, name).assert_not_called()

    def test_current586_plan_rejects_fixed_binding_shape_and_types_before_transport(self):
        mutations = [
            ("scope", "CURRENT586_WRONG"), ("failedRun", "39666991482"), ("failedAttempt", True),
            ("sourceHead", "b" * 40), ("executionHead", "c" * 40),
            ("protectedBundleSha256", "d" * 64), ("modelBundleSha256", "e" * 64),
            ("targetReferenceAt", "2026-10-21T21:00:00.000Z"), ("partCount", 672),
            ("remoteCheckpointVersion", 0), ("remoteCheckpointVersion", True),
            ("checkpointGenerationSha256", "f" * 63), ("remoteCheckpointSha256", "f" * 63),
            ("sourceDescriptorSha256", None), ("conditionsSha256", True),
            ("protectedProductionReferenceAt", "2026-10-21T20:00:00.000Z"),
            ("progressCacheKey", "weather-private-progress-encrypted-v2-Linux-main-39666991481-1"),
        ]
        for key, value in mutations:
            plan = self.current586_plan()
            plan["binding"][key] = value
            with self.subTest(key=key, value=value), self.expect_refusal("PLAN_REJECTED"):
                self.read_plan(plan, body=(producer._exact_original_json(plan) + "\n").encode())
        producer.STAC_SESSION.get.assert_not_called()
        producer.DOWNLOAD_SESSION.get.assert_not_called()

    def test_current586_plan_requires_canonical_complete_unique_full_capture_bytes(self):
        plan = self.current586_plan()
        body = (producer._exact_original_json(plan) + "\n").encode()
        for invalid in (json.dumps(plan).encode(), body + b"\n",
                        body.replace(b'"schemaVersion":1', b'"schemaVersion":1,"schemaVersion":1', 1)):
            with self.subTest(kind=invalid[:32]), self.expect_refusal("PLAN_REJECTED"):
                self.read_plan(plan, body=invalid)
        with self.expect_refusal("PLAN_REJECTED"):
            self.read_plan(plan, body=body, digest="0" * 64)
        duplicate = self.current586_plan([capture(), capture()])
        with self.expect_refusal("PLAN_REJECTED"):
            self.read_plan(duplicate, body=(producer._exact_original_json(duplicate) + "\n").encode())
        extra = self.current586_plan()
        extra["originals"][0]["href"] = HREF
        extra["binding"]["originalsSha256"] = hashlib.sha256(
            producer._exact_original_json(extra["originals"]).encode()).hexdigest()
        with self.expect_refusal("CAPTURE_INVALID"):
            self.read_plan(extra, body=(producer._exact_original_json(extra) + "\n").encode())
        many = [dict(capture(), itemId="exact-original-item-" + str(index)) for index in range(4097)]
        bound = self.current586_plan(many)
        with self.expect_refusal("PLAN_REJECTED"):
            self.read_plan(bound, body=(producer._exact_original_json(bound) + "\n").encode())
        producer.STAC_SESSION.get.assert_not_called()
        producer.DOWNLOAD_SESSION.get.assert_not_called()


if NATIVE:
    class NativeExactOriginalTests(ExactOriginalTests):
        def setUp(self):
            if sys.platform != "linux":
                self.fail("--native requires Linux; no skipped ownership proof")
            super().setUp()
            # Use the REAL deadline, ownership, ecCodes and file hashing in native cases.
            self.patches[-1].stop()

        # A fresh actual CLI must retain the complete normal Linux timestamp
        # witness. Windows lstat/fstat creation/change-time semantics differ;
        # do not weaken product identity or massage fixture times to pass.
        def test_pretransport_actual_cli_imports_real_producer_and_refuses_bad_sha_without_leaks(self):
            self.read_plan(self.make_plan())
            plan_path = self.raw / ".original-recovery-plan.json"
            before = {entry.name: entry.read_bytes() for entry in self.raw.iterdir()}
            scripts = self.root / "scripts"
            scripts.mkdir()
            source_scripts = Path(__file__).parent
            for name in ("inspect-exact-dmi-original-plan.py", "update-dmi-bulk.py"):
                shutil.copyfile(source_scripts / name, scripts / name)
            shutil.copytree(source_scripts / "lib", scripts / "lib")
            if not NATIVE:
                # The existing portable ecCodes boundary, NOT a product function
                # stub. The actual CLI, import path, plan/inventory reader and
                # shared helper execute in a fresh real Python process.
                (scripts / "eccodes.py").write_text(
                    "import sys\nclass OutOfAreaError(Exception): pass\n"
                    "def forbidden(*args,**kwargs): raise AssertionError('NO_DECODER')\n"
                    "codes_get=codes_get_array=codes_get_elements=codes_grib_find_nearest=forbidden\n"
                    "codes_grib_new_from_file=codes_release=forbidden\n"
                    "def audit(event,args):\n"
                    " if event in ('socket.connect','socket.getaddrinfo'): raise AssertionError('NO_NETWORK')\n"
                    "sys.addaudithook(audit)\n", encoding="utf-8")
            environment = {**os.environ, "GITHUB_SHA": HEAD,
                           "DMI_EXACT_ORIGINAL_PLAN_SHA256": hashlib.sha256(plan_path.read_bytes()).hexdigest()}
            for bad_sha in (False, True):
                if bad_sha:
                    environment["DMI_EXACT_ORIGINAL_PLAN_SHA256"] = "0" * 64
                result = subprocess.run([sys.executable, "-B", str((scripts / "inspect-exact-dmi-original-plan.py").resolve())],
                    cwd=self.root, env=environment, capture_output=True, text=True, timeout=15)
                if bad_sha:
                    self.assertEqual(result.returncode, 2)
                    self.assertEqual(result.stdout, "")
                    self.assertEqual(result.stderr.strip(), "DMI_EXACT_ORIGINAL_PRETRANSPORT_REFUSED")
                else:
                    self.assertEqual(result.returncode, 0, result.stderr)
                    self.assertEqual(result.stderr, "")
                    report = json.loads(result.stdout)
                    self.assertEqual(report["kind"], "DMI_EXACT_ORIGINAL_PRETRANSPORT_METADATA")
                    self.assertEqual(report["uniqueAssetCount"], 1)
                    self.assertTrue(report["metadataAndLstatOnly"])
                    self.assertFalse(report["fileContentVerified"])
                    self.assertFalse(report["transportPerformed"])
                    self.assertLess(len(result.stdout.encode()), 8192)
                for private in (HREF, capture()["itemId"], capture()["contentSha256"]):
                    self.assertNotIn(private, result.stdout + result.stderr)
                self.assertEqual({entry.name: entry.read_bytes() for entry in self.raw.iterdir()}, before)

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

        def test_native_retired_stac_locator_uses_real_headers_and_owned_read(self):
            body = self.generated_grib()
            expected, href = self.locator_capture(body)
            expected["itemId"] = expected["itemId"].replace("_sf_", "_SF_", 1)
            original = copy.deepcopy(expected)
            producer.STAC_SESSION.get.side_effect = [Response(status=404)]
            producer.DOWNLOAD_SESSION.get.side_effect = [Response(body)]
            with patch.object(producer, "WORK_DEADLINE", time.monotonic() + 30), \
                 patch.object(producer, "codes_get_array", side_effect=AssertionError("numeric read forbidden")), \
                 patch.object(producer, "codes_get_elements", side_effect=AssertionError("numeric read forbidden")), \
                 patch.object(producer, "process_grib", side_effect=AssertionError("normal process forbidden")):
                report = producer.restore_exact_original_assets([expected])
            self.assertEqual((report["status"], report["downloadedAssetCount"], report["downloadedBytes"]),
                             ("RESTORED", 1, len(body)))
            self.assertEqual(producer.cached_asset_path(href).read_bytes(), body)
            self.assertEqual(expected, original)
            self.assertEqual(producer._UNSETTLED_GRIB_READS, [])
            self.assertEqual(producer._UNSETTLED_ASSET_DOWNLOADS, [])

        def test_native_retired_stac_locator_rejects_full_hash_matching_wrong_header(self):
            body = self.generated_grib(wrong_time=True)
            expected, href = self.locator_capture(body)
            expected["itemId"] = expected["itemId"].replace("_sf_", "_SF_", 1)
            before = self.manifest.read_bytes()
            producer.STAC_SESSION.get.side_effect = [Response(status=410)]
            producer.DOWNLOAD_SESSION.get.side_effect = [Response(body)]
            with patch.object(producer, "WORK_DEADLINE", time.monotonic() + 30), \
                 self.expect_refusal("HEADER_MISMATCH"):
                producer.restore_exact_original_assets([expected])
            self.assertFalse(producer.cached_asset_path(href).exists())
            self.assertEqual(self.manifest.read_bytes(), before)
            self.assertEqual(producer._UNSETTLED_GRIB_READS, [])
            self.assertEqual(producer._UNSETTLED_ASSET_DOWNLOADS, [])

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

        def test_native_owned_local_reuse_checks_every_header_and_eof_without_stac(self):
            body = self.generated_grib()
            expected = capture(body)
            original = copy.deepcopy(expected)
            target = self.local_original(expected, body)
            before = target.read_bytes(), self.manifest.read_bytes()
            producer.STAC_SESSION.get.side_effect = [Response(status=404)]
            with patch.object(producer, "WORK_DEADLINE", time.monotonic() + 30), \
                 patch.object(producer, "codes_grib_new_from_file", wraps=producer.codes_grib_new_from_file) as messages, \
                 patch.object(producer, "codes_get_array", side_effect=AssertionError("numeric read forbidden")), \
                 patch.object(producer, "codes_get_elements", side_effect=AssertionError("numeric read forbidden")), \
                 patch.object(producer, "process_grib", side_effect=AssertionError("normal process forbidden")), \
                 patch.object(producer, "download_asset", side_effect=AssertionError("local reuse must not download")):
                report = producer.restore_exact_original_assets([expected])
            self.assertEqual(messages.call_count, 3, "two actual GRIB messages followed by actual EOF")
            self.assertEqual((report["reusedAssetCount"], report["downloadedAssetCount"], report["downloadedBytes"]), (1, 0, 0))
            self.assertEqual((target.read_bytes(), self.manifest.read_bytes()), before)
            self.assertEqual(expected, original)
            self.assertEqual(producer._UNSETTLED_GRIB_READS, [])
            producer.STAC_SESSION.get.assert_not_called()
            producer.DOWNLOAD_SESSION.get.assert_not_called()

        def test_native_local_wrong_header_or_bytes_never_falls_back_or_changes_original(self):
            for wrong_time in (True, False):
                body = self.generated_grib(wrong_time=wrong_time)
                expected = capture(body)
                target = self.local_original(expected, body)
                if not wrong_time:
                    target.write_bytes(body[:-1] + bytes([body[-1] ^ 1]))
                before = target.read_bytes(), self.manifest.read_bytes()
                with self.subTest(wrong_time=wrong_time), \
                     patch.object(producer, "WORK_DEADLINE", time.monotonic() + 30), \
                     self.expect_refusal("HEADER_MISMATCH" if wrong_time else "CONTENT_MISMATCH"):
                    producer.restore_exact_original_assets([expected])
                self.assertEqual((target.read_bytes(), self.manifest.read_bytes()), before)
                self.assertEqual(producer._UNSETTLED_GRIB_READS, [])
            producer.STAC_SESSION.get.assert_not_called()
            producer.DOWNLOAD_SESSION.get.assert_not_called()


if __name__ == "__main__":
    unittest.main()
