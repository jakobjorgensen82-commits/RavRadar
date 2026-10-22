"""Producer/verifier parity for native DMI component provenance."""
from __future__ import annotations

import ast
import copy
import importlib.util
import json
import os
import sys
import tempfile
import types
from datetime import datetime, timedelta, timezone
from pathlib import Path

from lib.dmi_native_provenance import (
    CURRENT_VECTOR_SELECTION,
    canonical_verified_part_current_attestation,
    complete_native_source_for_hour,
    sampling_identity,
    strict_verified_part_current_pair_count,
    validate_current_operational_availability_ledger,
    validate_current_operational_ledger,
)


ROOT = Path(__file__).resolve().parents[1]


def check_original_wire_identity():
    from lib.dmi_legacy_current_recovery import original_wire_identity_matches_zone
    central = {"id": "PART::WIRE", "parentZoneId": "PARENT", "coastalPart": True,
        "lon": 8.00000004, "lat": 55.00000004}
    wire = sampling_identity(central)
    exact = {**wire, "samplingPoint": [central["lon"], central["lat"]]}
    before = copy.deepcopy((central, wire, exact))
    assert original_wire_identity_matches_zone(wire, central)
    assert original_wire_identity_matches_zone(exact, central)
    for name in ("entityId", "parentZoneId", "entityType", "samplingContext"):
        wrong = copy.deepcopy(wire); wrong[name] += "-other"
        assert not original_wire_identity_matches_zone(wrong, central)
    for point in ([8.00000001, 55], ["8", 55], [True, 55], [8, 91], [181, 55],
                  [8, float("nan")], [8, 55, 0], (8, 55), [8.00000004, 55]):
        assert not original_wire_identity_matches_zone({**wire, "samplingPoint": point}, central)
    assert not original_wire_identity_matches_zone({**wire, "extra": True}, central)
    assert not original_wire_identity_matches_zone(wire, {**central, "parentZoneId": True})
    assert not original_wire_identity_matches_zone(wire, {**central, "id": 7})
    assert (central, wire, exact) == before
    for number in (1 / 256, 3 / 256, -1 / 256, -3 / 256, -0.0):
        own = {**central, "lon": number, "lat": number}
        assert original_wire_identity_matches_zone(sampling_identity(own), own)


check_original_wire_identity()
if sys.argv[1:] == ["--original-wire-identity-only"]:
    print("Original wire identity partition passed: exact/full versus Python-seven-place, strict identities/types/ranges, no mutation")
    raise SystemExit(0)

# The parity test exercises provenance construction only; an import-safe ecCodes
# stub keeps it independent of the platform GRIB DLL.
eccodes = types.ModuleType("eccodes")
eccodes.OutOfAreaError = type("OutOfAreaError", (Exception,), {})
for name in (
    "codes_get", "codes_get_array", "codes_get_elements", "codes_grib_find_nearest",
    "codes_grib_new_from_file", "codes_release",
):
    setattr(eccodes, name, lambda *args, **kwargs: None)
sys.modules["eccodes"] = eccodes
spec = importlib.util.spec_from_file_location("ravradar_update_dmi_bulk", ROOT / "scripts/update-dmi-bulk.py")
assert spec and spec.loader
producer = importlib.util.module_from_spec(spec)
spec.loader.exec_module(producer)


def check_coherent_raw_inventory():
    """Real normal manifest/filename boundary only; no GRIB/provider proof."""
    import hashlib
    wrapper_spec = importlib.util.spec_from_file_location(
        "coherent_inventory_boundary", ROOT / "scripts/decode-coherent-current-originals.py")
    wrapper = importlib.util.module_from_spec(wrapper_spec)
    wrapper_spec.loader.exec_module(wrapper)
    previous_root, previous_raw = producer.ROOT, producer.RAW_DIR
    previous_session = dict(producer._RAW_CURRENT_SESSION_PROTECTED)
    grib_calls = []
    previous_decoder = producer.codes_grib_new_from_file

    def forbidden_grib(*args, **kwargs):
        grib_calls.append(True)
        raise AssertionError("RAW inventory opened the decoder")

    producer.codes_grib_new_from_file = forbidden_grib
    try:
        with tempfile.TemporaryDirectory(prefix="rr-coherent-inventory-") as temporary:
            producer.ROOT = Path(temporary).resolve()
            producer.RAW_DIR = producer.ROOT / ".cache/dmi-grib"
            producer.RAW_DIR.mkdir(parents=True)
            href = "https://opendataapi.dmi.dk/synthetic-inventory-only.grib"
            raw_path = producer.cached_asset_path(href)
            payload = b"synthetic inventory bytes, never decoded\n"
            raw_path.write_bytes(payload)
            producer.save_raw_cache_manifest({"schemaVersion": 2, "assets": {}})
            producer.register_raw_cache_asset(raw_path, href, "dkss_nsbs",
                "2026-10-21T00:00:00Z", "2026-10-21T03:00:00Z",
                item_id="synthetic-inventory-item", acquired_at="2026-10-21T01:00:00Z",
                expected_size=len(payload), content_sha256=hashlib.sha256(payload).hexdigest())
            registered = producer.load_raw_cache_manifest()
            capture = producer.canonical_current_source_asset(registered["assets"][raw_path.name])
            assert capture is not None and len(capture) == 11
            original_manifest = producer.raw_cache_manifest_path().read_bytes()

            def observe(reason=None, *, capture_mode=None):
                jobs = [{"capture": copy.deepcopy(capture)}]
                if capture_mode is not None:
                    jobs[0]["captureMode"] = capture_mode
                manifest_before = producer.raw_cache_manifest_path().read_bytes()
                files_before = {file.name: file.read_bytes() for file in producer.RAW_DIR.iterdir()}
                try:
                    result = wrapper.raw_inventory(producer, jobs)
                except wrapper.Refused as error:
                    assert reason is not None
                    assert str(error) == "COHERENT_CURRENT_ORIGINAL_" + reason, str(error)
                    assert "path" not in jobs[0]
                else:
                    assert reason is None
                    assert result == manifest_before and jobs[0]["path"] == raw_path
                    if capture_mode is not None:
                        measured = producer.canonical_current_source_asset(
                            producer.load_raw_cache_manifest()["assets"][raw_path.name])
                        assert jobs[0]["transportCapture"] == measured
                assert jobs[0]["capture"] == capture
                assert producer.raw_cache_manifest_path().read_bytes() == manifest_before
                assert {file.name: file.read_bytes() for file in producer.RAW_DIR.iterdir()} == files_before
                assert not grib_calls and not producer._UNSETTLED_GRIB_READS

            observe()
            raw_path.unlink()  # Only this test's own synthetic file.
            observe("RAW_CAPTURE_FILE_MISSING")
            raw_path.write_bytes(payload)
            changed = copy.deepcopy(registered)
            changed["assets"][raw_path.name]["acquiredAt"] = "2026-10-21T01:01:00Z"
            producer.save_raw_cache_manifest(changed)
            observe("RAW_ACQUISITION_UNRESOLVED")  # DEFAULT rejection is unchanged.
            observe(capture_mode="AUTHENTICATED_ORIGINAL_WITH_DISTINCT_MEASURED_READ_CAPTURE")
            # Same existing inventory fixture, all ten non-acquisition fields.
            different_fields = {
                "collection": "dkss_lf", "modelRun": "2026-10-20T18:00:00Z",
                "validTime": "2026-10-21T06:00:00Z", "itemId": "different-own-item",
                "assetIdentitySha256": "f" * 64, "assetSizeBytes": None,
                "contentLengthBytes": len(payload) + 1, "contentSha256": "e" * 64,
                "itemCreatedAt": "2026-10-20T18:00:00Z", "itemUpdatedAt": "2026-10-20T19:00:00Z",
            }
            assert len(different_fields) == 10 and "acquiredAt" not in different_fields
            for field, value in different_fields.items():
                different = copy.deepcopy(changed)
                different["assets"][raw_path.name][field] = value
                producer.save_raw_cache_manifest(different)
                observe("RAW_CAPTURE_METADATA_UNMATCHED_PREFIX_PRESENT",
                        capture_mode="AUTHENTICATED_ORIGINAL_WITH_DISTINCT_MEASURED_READ_CAPTURE")
            for mutation in ("absent", "invalid", "different-model"):
                changed = copy.deepcopy(registered)
                if mutation == "absent":
                    changed["assets"] = {}
                elif mutation == "invalid":
                    changed["assets"][raw_path.name]["contentSha256"] = None
                else:
                    changed["assets"][raw_path.name]["modelRun"] = "2026-10-20T18:00:00Z"
                producer.save_raw_cache_manifest(changed)
                observe("RAW_CAPTURE_METADATA_UNMATCHED_PREFIX_PRESENT")
                raw_path.unlink()
                observe("RAW_CAPTURE_METADATA_UNMATCHED_PREFIX_ABSENT")
                raw_path.write_bytes(payload)
            # Same prefix is deliberately NOT proof of the expected extension,
            # full URL/hash, bytes or original. Refusal remains mandatory.
            producer.save_raw_cache_manifest({"schemaVersion": 2, "assets": {}})
            raw_path.unlink()
            collision = producer.RAW_DIR / (capture["assetIdentitySha256"][:24] + ".different")
            collision.write_bytes(b"unrelated synthetic prefix candidate")
            observe("RAW_CAPTURE_METADATA_UNMATCHED_PREFIX_PRESENT")
            collision.unlink()
            raw_path.write_bytes(payload + b"size mismatch")
            producer.save_raw_cache_manifest(registered)
            observe("RAW_FILE_INVALID")
            raw_path.write_bytes(payload)
            assert producer.raw_cache_manifest_path().read_bytes() == original_manifest
            assert not grib_calls
    finally:
        producer.ROOT, producer.RAW_DIR = previous_root, previous_raw
        producer._RAW_CURRENT_SESSION_PROTECTED.clear()
        producer._RAW_CURRENT_SESSION_PROTECTED.update(previous_session)
        producer.codes_grib_new_from_file = previous_decoder


check_coherent_raw_inventory()
if sys.argv[1:] == ["--coherent-raw-inventory-only"]:
    print("Coherent RAW inventory boundary passed: real manifest/files, missing file versus unmatched metadata, prefix is not proof, acquisition refusal and size guard preserved; zero GRIB calls")
    raise SystemExit(0)

valid_time = "2026-01-01T03:00:00Z"
zone = {
    "id": "PART::TEST",
    "parentZoneId": "ZONE-TEST",
    "coastalPart": True,
    "coastType": "limfjord",
    "lon": 2.0,
    "lat": 1.0,
}
candidate = {
    "gridDefinitionSha256": "a" * 64,
    "longitude": 2.0,
    "latitude": 1.0,
    "distanceKm": 0.0,
    "value": 0.1,
}
capture = {
    "itemId": "exact-stac-item",
    "assetIdentitySha256": "b" * 64,
    "assetSizeBytes": 1024,
    "acquiredAt": "2026-01-01T02:00:00Z",
    "contentLengthBytes": 1024,
    "contentSha256": "d" * 64,
    "itemCreatedAt": "2026-01-01T01:00:00Z",
}
source = producer.native_component_source(
    "dkss_lf",
    "2026-01-01T00:00:00Z",
    valid_time,
    component="current",
    zone=zone,
    grid_candidate=candidate,
    capture=capture,
    spatial_selection="nearest-shared-grid-cell-no-spatial-interpolation",
    verticalLayer="depthBelowSea:1",
    verticalLayerRankM=1.0,
    vectorSelection=CURRENT_VECTOR_SELECTION,
    vectorSemanticsVersion=3,
)
assert source is not None
entity = sampling_identity(zone)
assert entity is not None
assert complete_native_source_for_hour(source, "current", zone["id"], entity, valid_time)


def check_cached_current_history_capture_join():
    """Pure normal planner regression; no RAW, lease, decoder or I/O claim."""
    href = "https://owned-fixture.invalid/capture-join.grib"
    original_source = copy.deepcopy(source)
    original_source["assetIdentitySha256"] = producer.asset_identity_sha256(href)
    original = {"zoneId": zone["id"], "time": producer.canonical_time(valid_time),
        "capture": producer.canonical_current_source_asset(original_source),
        "row": {"time": producer.canonical_time(valid_time), "current-u": .1, "current-v": -.2,
                "sources": {"current": original_source}}}
    originals = [original]
    before = copy.deepcopy(originals)
    # The pure planner consumes a validated demand map, not an admission flag.
    reference_at = producer.canonical_time(valid_time)
    start_at = producer.canonical_time(datetime.fromisoformat(
        reference_at.replace("Z", "+00:00")) - timedelta(hours=48))
    demands = producer.current_history_demands([{
        "partId": "TEST", "zoneId": zone["parentZoneId"],
        "parentZoneId": zone["parentZoneId"], "entityId": zone["id"],
        "samplingPoint": [zone["lon"], zone["lat"]],
        "samplingContextKey": "sha256:" + "1" * 64,
        "initialSource": "COLD_START", "initialStateAt": None,
        "initialStateSha256": None, "startAt": start_at, "endAt": reference_at,
    }], [zone], reference_at)
    name = producer.cached_asset_path(href).name
    asset = {**original["capture"], "canonicalHref": href}
    manifest = {"schemaVersion": 2, "assets": {name: asset}}
    exact = producer.plan_cached_current_history(demands, originals, manifest)
    assert len(exact["jobs"]) == 1 and not exact["unavailable"]
    reacquired_manifest = copy.deepcopy(manifest)
    reacquired_manifest["assets"][name]["acquiredAt"] = reference_at
    replay = producer.plan_cached_current_history(demands, originals, reacquired_manifest)
    assert len(replay["jobs"]) == 1, "SAME_ORIGINAL_BYTES_REJECTED_ONLY_BY_ACQUIRED_AT"
    assert not replay["unavailable"]
    assert replay["jobs"][0]["capture"] == producer.canonical_current_source_asset(
        reacquired_manifest["assets"][name])
    assert replay["originalsByKey"] == exact["originalsByKey"]
    for changes in (
        {"itemId": "different-official-item"},
        {"itemCreatedAt": reference_at}, {"itemUpdatedAt": reference_at},
        {"modelRun": start_at}, {"contentSha256": "0" * 64},
        {"assetIdentitySha256": "0" * 64},
        {"assetSizeBytes": 1025, "contentLengthBytes": 1025},
        {"assetSizeBytes": None}, {"acquiredAt": "invalid"},
    ):
        invalid = copy.deepcopy(reacquired_manifest)
        invalid["assets"][name].update(changes)
        rejected = producer.plan_cached_current_history(demands, originals, invalid)
        assert not rejected["jobs"] and len(rejected["unavailable"]) == 1
        assert rejected["originalsByKey"] == exact["originalsByKey"]
    conflicting = copy.deepcopy(original)
    conflicting["row"]["current-u"] += .125
    try:
        producer.plan_cached_current_history(demands, [*originals, conflicting], reacquired_manifest)
    except ValueError as error:
        assert str(error) == "DMI_CURRENT_HISTORY_ORIGINAL_CONFLICT"
    else:
        raise AssertionError("ambiguous old originals reached cached replay")
    assert originals == before


check_cached_current_history_capture_join()
if sys.argv[1:] == ["--cached-current-history-plan-only"]:
    print("Cached-current-history capture join passed: exact/reacquired/9 negatives/original conflict; native UNRUN")
    raise SystemExit(0)


def check_raw_current_retention():
    """Normal download/prune across a failed score; synthetic transport only."""
    import hashlib
    from unittest.mock import patch
    p = producer
    old = (p.ROOT, p.RAW_DIR, p.RAW_CACHE_MAX_BYTES, p.DOWNLOAD_SESSION,
           getattr(p, "_RAW_CURRENT_PROTECTED", None))
    old_policies = (dict(p._RAW_CURRENT_IDENTITIES), set(p._RAW_CURRENT_UNPROVED_NAMES), dict(p._RAW_CURRENT_SESSION_PROTECTED))
    with tempfile.TemporaryDirectory(prefix="rr-raw-retention-") as directory:
        p.ROOT = Path(directory)
        p.RAW_DIR = p.ROOT / ".cache/dmi-grib"
        p.RAW_DIR.mkdir(parents=True)
        body = b"synthetic cache bytes, not a GRIB or native admission".ljust(32768, b"x")
        def seed(label, mtime):
            href = f"https://owned-fixture.invalid/{label}.grib"
            path = p.cached_asset_path(href)
            path.write_bytes(body)
            p.register_raw_cache_asset(path, href, "dkss_nsbs", valid_time, valid_time,
                item_id=label, item_created_at=valid_time, expected_size=len(body),
                acquired_at=valid_time, content_sha256=hashlib.sha256(body).hexdigest())
            os.utime(path, (mtime, mtime))
            return path, href
        required, required_href = seed("committed-unknown-required", 1)
        disposable, _ = seed("not-a-dependency", 2)
        unknown_sidefile = p.RAW_DIR / "unregistered-original.grib"
        unknown_sidefile.write_bytes(b"unregistered is not disposable")
        p._RAW_CURRENT_SESSION_PROTECTED.clear()  # These two files represent the prior run, not this session.
        required_capture = p.canonical_current_source_asset(p.load_raw_cache_manifest()["assets"][required.name])
        # Normal fixed-file loader, with explicitly ARTIFICIAL metadata here.
        # This is not a B-authentication test, native receipt or production grant.
        def write(relative, value):
            target = p.ROOT / relative
            target.parent.mkdir(parents=True, exist_ok=True)
            raw = json.dumps(value).encode()
            target.write_bytes(raw)
            return "sha256:" + hashlib.sha256(raw).hexdigest()
        h0 = "2026-01-01T02:00:00Z"
        target = "2026-01-01T04:00:00Z"
        part_doc = {"zones": {zone["parentZoneId"]: [{"partId": "TEST", "waterPoint": [2, 1]}]}}
        part_bytes = json.dumps(part_doc).encode()
        targets = [{"partId": "TEST", "parentZoneId": zone["parentZoneId"], "waterPoint": [2, 1]}]
        source_hashes = {"conditions": write("data/live/conditions.json", {"synthetic": True}),
            "checkpoint": write(".cache/ravscore-continuation-checkpoint/checkpoint.json", {"generationSha256": "3" * 64}),
            "activation": None}
        private_root = p.ROOT / "private"
        bundle = private_root / "bundle"
        boundary = {"datasetId": "rr-synthetic-boundary", "productionReferenceAt": h0,
            "bundleContentSha256": "2" * 64, "checkpointGenerationSha256": "3" * 64,
            "conditionsSha256": source_hashes["conditions"].removeprefix("sha256:")}
        write("private/bundle/manifest.json", {key: boundary[key] for key in
            ("datasetId", "productionReferenceAt", "bundleContentSha256")})
        write("private/bundle/payload/data/live/conditions.json", {"synthetic": True})
        retention = {"schemaVersion": 1, "kind": "COMMITTED_POST_H0_UNKNOWN_RAW_RETENTION",
            "boundary": boundary, "captures": [required_capture]}
        history = {"schemaVersion": 2, "kind": "RAVSCORE_CURRENT_HISTORY_ACQUISITION_DEMAND",
            "productionReferenceAt": target, "modelBinding": {},
            "registrySha256": "sha256:" + hashlib.sha256(part_bytes).hexdigest(), "sourceHashes": source_hashes,
            "demands": [{"partId": "TEST", "zoneId": zone["parentZoneId"], "parentZoneId": zone["parentZoneId"],
                "entityId": zone["id"], "samplingPoint": [2, 1], "samplingContextKey": "sha256:" + "1" * 64,
                "initialSource": "EXISTING_INTEGRATED", "initialStateAt": h0, "initialStateSha256": "sha256:" + "4" * 64,
                "startAt": "2025-12-29T23:00:00Z", "endAt": target}], "rawRetention": retention}
        demand_path = p.ROOT / ".cache/ravscore-current-history-demand.json"
        env = {"DMI_BULK_REQUIRE_COMMITTED_RAW_RETENTION": "true",
            "DMI_BULK_CURRENT_HISTORY_DEMAND_PATH": str(demand_path),
            "RAVRADAR_PRIVATE_RUNTIME_ROOT": str(private_root), "RAVRADAR_PRIVATE_RUNTIME_BUNDLE": str(bundle)}
        read = lambda: p.read_current_history_demands(part_doc, part_bytes, targets, [zone], target)
        with patch.dict(os.environ, env):
            with patch.dict(os.environ, {"DMI_BULK_CURRENT_HISTORY_DEMAND_PATH": ""}):
                try: read()
                except p.AssetDownloadCleanupUnproven as error: assert str(error) == "DMI_RAW_CURRENT_RETENTION_REQUIRED"
                else: raise AssertionError("missing normal demand flag silently bypassed protection")
            no_retention = {key: value for key, value in history.items() if key != "rawRetention"}
            no_retention["schemaVersion"] = 1
            write(".cache/ravscore-current-history-demand.json", no_retention)
            try: read()
            except p.AssetDownloadCleanupUnproven as error: assert str(error) == "DMI_RAW_CURRENT_RETENTION_REQUIRED"
            else: raise AssertionError("old unprotected demand bypassed required retention")
            # The actual provider-free caller keeps every old demand check,
            # but does not acquire new eviction permission or perform HTTP.
            with patch.object(p, "CACHE_ONLY", True):
                previous_policy = p._RAW_CURRENT_PROTECTED
                p._RAW_CURRENT_PROTECTED = None
                assert len(read()) == 1 and p._RAW_CURRENT_PROTECTED is None
                with patch.dict(os.environ, {"DMI_BULK_REQUIRE_COMMITTED_RAW_RETENTION": "unknown"}):
                    try: read()
                    except p.AssetDownloadCleanupUnproven as error: assert str(error) == "DMI_RAW_CURRENT_REQUIRED_FLAG_INVALID"
                    else: raise AssertionError("cache-only swallowed malformed orchestration flag")
                try: p.download_asset("https://owned-fixture.invalid/cache-only.grib", len(body), {"bytes": 0})
                except RuntimeError as error: assert str(error) == "DMI_CACHE_ONLY_NETWORK_DISABLED"
                else: raise AssertionError("cache-only reached transport")
                p._RAW_CURRENT_PROTECTED = previous_policy
            write(".cache/ravscore-current-history-demand.json", {**history, "rawRetention": {}})
            try: read()
            except p.AssetDownloadCleanupUnproven as error: assert str(error) == "DMI_RAW_CURRENT_B_BOUNDARY_INVALID"
            else: raise AssertionError("malformed retention was silently ignored")
            stale = copy.deepcopy(history)
            stale["rawRetention"]["boundary"]["conditionsSha256"] = "0" * 64
            write(".cache/ravscore-current-history-demand.json", stale)
            try: read()
            except p.AssetDownloadCleanupUnproven as error: assert str(error) == "DMI_RAW_CURRENT_B_BOUNDARY_CHANGED"
            else: raise AssertionError("changed immutable input was silently ignored")
            write(".cache/ravscore-current-history-demand.json", history)
            assert len(read()) == 1
            missing_href = "https://owned-fixture.invalid/unselected-missing.grib"
            missing_capture = {**required_capture, "assetIdentitySha256": p.asset_identity_sha256(missing_href),
                "itemId": "unselected-missing"}
            sparse = copy.deepcopy(history)
            sparse["rawRetention"]["captures"].append(missing_capture)
            write(".cache/ravscore-current-history-demand.json", sparse)
            assert len(read()) == 1 and p._RAW_CURRENT_PROTECTED is None, 'unselected missing RAW disables eviction, not replay'
            bad_path = p.cached_asset_path(missing_href)
            original_manifest = p.load_raw_cache_manifest()
            bad_manifest = copy.deepcopy(original_manifest)
            bad_manifest["assets"][bad_path.name] = {**missing_capture, "canonicalHref": missing_href}
            bad_path.write_bytes(b"damaged".ljust(len(body), b"x"))
            p.save_raw_cache_manifest(bad_manifest)
            assert len(read()) == 1 and p._RAW_CURRENT_PROTECTED is None, 'unselected corrupt RAW disables eviction, not the entire loader'
            bad_before = bad_path.read_bytes()
            try:
                p.download_asset(missing_href, len(body), {"bytes": 0})
            except p.AssetDownloadCleanupUnproven as error:
                assert str(error) == "DMI_RAW_CURRENT_DEPENDENCY_UNPROVED"
            else:
                raise AssertionError("corrupt optional donor was silently reused/replaced")
            assert bad_path.read_bytes() == bad_before and required.read_bytes() == body
            bad_path.unlink()  # Only this test's explicitly artificial damaged fixture.
            p.save_raw_cache_manifest(original_manifest)
            write(".cache/ravscore-current-history-demand.json", history)
            assert len(read()) == 1 and p._RAW_CURRENT_PROTECTED is not None
        p.RAW_CACHE_MAX_BYTES = 2 * len(body) + 12000
        calls = []
        class Response:
            headers = {"content-length": str(len(body))}
            def __enter__(self): return self
            def __exit__(self, *args): return False
            def raise_for_status(self): pass
            def iter_content(self, _size): yield body
        class Session:
            def get(self, href, **kwargs):
                calls.append(href)
                return Response()
        p.DOWNLOAD_SESSION = Session()
        try:
            protected = p._RAW_CURRENT_PROTECTED
            p._RAW_CURRENT_PROTECTED = None
            before_unqualified = {path.name: path.read_bytes() for path in p.RAW_DIR.iterdir()}
            try:
                p.download_asset("https://owned-fixture.invalid/unqualified.grib", len(body), {"bytes": 0})
            except p.AssetDownloadCleanupUnproven as error:
                assert str(error) == "DMI_RAW_CURRENT_CACHE_BUDGET"
            else:
                raise AssertionError("unqualified caller inherited disposable LRU authority")
            assert not calls and before_unqualified == {path.name: path.read_bytes() for path in p.RAW_DIR.iterdir()}
            p._RAW_CURRENT_PROTECTED = protected
            mtime_before_hit = required.stat().st_mtime_ns
            reused, hit = p.download_asset(required_href, len(body), {"bytes": 0}, collection="dkss_nsbs",
                model_run=valid_time, valid_time=valid_time, item_id="committed-unknown-required", item_created_at=valid_time)
            assert reused == required and hit and not calls
            assert required.stat().st_mtime_ns == mtime_before_hit, 'a hard pin is not an LRU timestamp to mutate'
            incoming, hit = p.download_asset("https://owned-fixture.invalid/new.grib", len(body), {"bytes": 0},
                collection="dkss_nsbs", model_run=valid_time, valid_time=valid_time,
                item_id="new", item_created_at=valid_time)
            assert hit is False and len(calls) == 1 and incoming.is_file()
            assert incoming.name in p._raw_current_session_files(), 'new current-run marine bytes need a session pin'
            p._raw_current_inventory()  # Latch the actual new session file identity.
            session_mtime = incoming.stat().st_mtime_ns
            for _ in range(2):
                reused, hit = p.download_asset("https://owned-fixture.invalid/new.grib", len(body), {"bytes": 0},
                    collection="dkss_nsbs", model_run=valid_time, valid_time=valid_time,
                    item_id="new", item_created_at=valid_time)
                assert reused == incoming and hit and len(calls) == 1
                assert incoming.stat().st_mtime_ns == session_mtime
                p._raw_current_inventory()  # Repeated normal hits must not create a false race.
            # The later central score failed: neither committed B nor S moved.
            try:
                raise RuntimeError("SYNTHETIC_LATER_SCORE_FAILED_S_NOT_PUBLISHED")
            except RuntimeError:
                pass
            p.prune_raw_cache(p.RAW_CACHE_MAX_BYTES)
            assert required.is_file(), "COMMITTED_UNKNOWN_RAW_WAS_EVICTED_BEFORE_SUCCESSOR_B_S"
            assert required.read_bytes() == body and not disposable.exists()
            assert unknown_sidefile.read_bytes() == b"unregistered is not disposable", 'empty/nonmatching pinset is not sidefile ownership'
            assert sum(f.stat().st_size for f in p.RAW_DIR.iterdir() if f.is_file()) <= p.RAW_CACHE_MAX_BYTES
            demand = {"PART::TEST": {"initialStateAt": "2026-01-01T00:00:00Z"}}
            own = {"zoneId": "PART::TEST", "time": valid_time, "capture": required_capture,
                "row": {"sources": {"current": required_capture}, "current-u": .1, "current-v": .2}}
            plan = p.plan_cached_current_history(demand, [own], p.load_raw_cache_manifest())
            assert len(plan["jobs"]) == 1 and not plan["unavailable"], "NEXT_RESUME_LOST_REQUIRED_RAW"
            with patch.dict(os.environ, env):
                write(".cache/ravscore-current-history-demand.json", sparse)
                assert len(read()) == 1 and p._RAW_CURRENT_PROTECTED is None
                reused, hit = p.download_asset(required_href, len(body), {"bytes": 0}, collection="dkss_nsbs",
                    model_run=valid_time, valid_time=valid_time, item_id="committed-unknown-required", item_created_at=valid_time)
                assert reused == required and hit and len(calls) == 1, 'missing unselected RAW must not block good reuse'
                p.RAW_CACHE_MAX_BYTES = 3 * len(body) + 20000  # Scaled fixture, NOT a production limit change.
                before_free = {path.name: path.read_bytes() for path in p.RAW_DIR.iterdir()}
                extra, hit = p.download_asset("https://owned-fixture.invalid/free-space.grib", len(body), {"bytes": 0},
                    collection="dkss_nsbs", model_run=valid_time, valid_time=valid_time,
                    item_id="free-space", item_created_at=valid_time)
                assert not hit and extra.is_file() and len(calls) == 2
                assert all((p.RAW_DIR / name).read_bytes() == data for name, data in before_free.items()
                    if name != p.CACHE_MANIFEST_NAME), 'no-eviction free-space download changed an old input'
                write(".cache/ravscore-current-history-demand.json", history)
                assert len(read()) == 1
            snapshot = {path.name: path.read_bytes() for path in p.RAW_DIR.iterdir()}
            # There would be room by deleting current-run data, but that would
            # lose the failed run's progress originals. Both new files stay pinned.
            p.RAW_CACHE_MAX_BYTES = 3 * len(body) + 12000
            try:
                p.download_asset("https://owned-fixture.invalid/cannot-fit.grib", len(body), {"bytes": 0})
            except p.AssetDownloadCleanupUnproven as error:
                assert str(error) == "DMI_RAW_CURRENT_CACHE_BUDGET"
            else:
                raise AssertionError("protected plus incoming capacity did not stop")
            assert len(calls) == 2, "capacity failure reached transport"
            assert snapshot == {path.name: path.read_bytes() for path in p.RAW_DIR.iterdir()}, "capacity failure deleted input"
            p.RAW_CACHE_MAX_BYTES = 2 * len(body) + 12000
            required.write_bytes(b"corrupt".ljust(len(body), b"x"))
            damaged = {path.name: path.read_bytes() for path in p.RAW_DIR.iterdir()}
            try:
                p.download_asset("https://owned-fixture.invalid/after-corruption.grib", len(body), {"bytes": 0})
            except p.AssetDownloadCleanupUnproven as error:
                assert str(error) == "DMI_RAW_CURRENT_DEPENDENCY_CHANGED"
            else:
                raise AssertionError("corrupt protected local input was not a stop")
            assert len(calls) == 2 and damaged == {path.name: path.read_bytes() for path in p.RAW_DIR.iterdir()}
        finally:
            p.ROOT, p.RAW_DIR, p.RAW_CACHE_MAX_BYTES, p.DOWNLOAD_SESSION, p._RAW_CURRENT_PROTECTED = old
            if hasattr(p, "_RAW_CURRENT_IDENTITIES"):
                p._RAW_CURRENT_IDENTITIES.clear()
                p._RAW_CURRENT_IDENTITIES.update(old_policies[0])
                p._RAW_CURRENT_UNPROVED_NAMES.clear()
                p._RAW_CURRENT_UNPROVED_NAMES.update(old_policies[1])
                p._RAW_CURRENT_SESSION_PROTECTED.clear()
                p._RAW_CURRENT_SESSION_PROTECTED.update(old_policies[2])


def check_raw_nonmarine_retention():
    """Only normal registered nonmarine transport may become unpinned LRU."""
    import hashlib
    from unittest.mock import patch
    p = producer
    body = b"synthetic normal RAW LRU body, not a provider GRIB".ljust(32768, b"x")
    cases = [(collection, "good") for collection in ("harmonie_dini_sf", "wam_dw", "wam_nsb")]
    cases += [("wam_dw", case) for case in (
        "missing-acquired", "missing-sha", "missing-length", "missing-item", "wrong-href",
        "wrong-identity", "unsupported", "changed-body", "no-boundary", "pins-only",
        "late-second-file", "late-manifest", "late-inventory-file",
    )]
    for collection, case in cases:
        with tempfile.TemporaryDirectory(prefix="rr-nonmarine-lru-") as directory, \
             patch.object(p, "ROOT", Path(directory)), \
             patch.object(p, "RAW_DIR", Path(directory) / ".cache/dmi-grib"), \
             patch.object(p, "RAW_CACHE_MAX_BYTES", 3 * len(body) + 12000), \
             patch.object(p, "_RAW_CURRENT_PROTECTED", None), \
             patch.object(p, "_RAW_CURRENT_IDENTITIES", {}), \
             patch.object(p, "_RAW_CURRENT_UNPROVED_NAMES", set()), \
             patch.object(p, "_RAW_CURRENT_SESSION_PROTECTED", {}):
            p.RAW_DIR.mkdir(parents=True)
            def seed(label, kind, mtime):
                href = f"https://owned-fixture.invalid/{label}.grib"
                path = p.cached_asset_path(href)
                path.write_bytes(body)
                p.register_raw_cache_asset(path, href, kind, valid_time, valid_time,
                    item_id=label, item_created_at=valid_time, expected_size=len(body),
                    acquired_at=valid_time, content_sha256=hashlib.sha256(body).hexdigest())
                os.utime(path, (mtime, mtime))
                return path, href
            def write(relative, value):
                path = p.ROOT / relative
                path.parent.mkdir(parents=True, exist_ok=True)
                raw = json.dumps(value).encode()
                path.write_bytes(raw)
                return "sha256:" + hashlib.sha256(raw).hexdigest()
            committed, _ = seed("committed-marine", "dkss_nsbs", 1)
            old, _ = seed("old-nonmarine", collection, 2)
            second = seed("second-nonmarine", "wam_nsb", 3)[0] if case.startswith("late-") else None
            p._RAW_CURRENT_SESSION_PROTECTED.clear()  # Prior-process fixtures, no new eviction grant.
            capture = p.canonical_current_source_asset(p.load_raw_cache_manifest()["assets"][committed.name])
            part_doc = {"zones": {zone["parentZoneId"]: [{"partId": "TEST", "waterPoint": [2, 1]}]}}
            part_bytes = json.dumps(part_doc).encode()
            targets = [{"partId": "TEST", "parentZoneId": zone["parentZoneId"], "waterPoint": [2, 1]}]
            target = "2026-01-01T04:00:00Z"
            source_hashes = {"conditions": write("data/live/conditions.json", {"synthetic": True}),
                "checkpoint": write(".cache/ravscore-continuation-checkpoint/checkpoint.json", {"generationSha256": "3" * 64}),
                "activation": None}
            boundary = {"datasetId": "rr-synthetic-nonmarine-boundary", "productionReferenceAt": "2026-01-01T02:00:00Z",
                "bundleContentSha256": "2" * 64, "checkpointGenerationSha256": "3" * 64,
                "conditionsSha256": source_hashes["conditions"].removeprefix("sha256:")}
            write("private/bundle/manifest.json", {key: boundary[key] for key in
                ("datasetId", "productionReferenceAt", "bundleContentSha256")})
            write("private/bundle/payload/data/live/conditions.json", {"synthetic": True})
            write(".cache/ravscore-current-history-demand.json", {
                "schemaVersion": 2, "kind": "RAVSCORE_CURRENT_HISTORY_ACQUISITION_DEMAND",
                "productionReferenceAt": target, "modelBinding": {},
                "registrySha256": "sha256:" + hashlib.sha256(part_bytes).hexdigest(),
                "sourceHashes": source_hashes, "demands": [],
                "rawRetention": {"schemaVersion": 1, "kind": "COMMITTED_POST_H0_UNKNOWN_RAW_RETENTION",
                    "boundary": boundary, "captures": [capture]},
            })
            with patch.dict(os.environ, {
                "DMI_BULK_REQUIRE_COMMITTED_RAW_RETENTION": "true",
                "DMI_BULK_CURRENT_HISTORY_DEMAND_PATH": str(p.ROOT / ".cache/ravscore-current-history-demand.json"),
                "RAVRADAR_PRIVATE_RUNTIME_ROOT": str(p.ROOT / "private"),
                "RAVRADAR_PRIVATE_RUNTIME_BUNDLE": str(p.ROOT / "private/bundle"),
            }):
                assert p.read_current_history_demands(part_doc, part_bytes, targets, [zone], target) == {}
            assert p._RAW_CURRENT_PROTECTED is not None and committed.name in p._RAW_CURRENT_PROTECTED
            session, _ = seed("session-marine", "dkss_lf", 4)
            unknown = p.RAW_DIR / "unregistered-original.grib"
            unknown.write_bytes(b"unregistered remains unowned")
            manifest = p.load_raw_cache_manifest()
            row = manifest["assets"][old.name]
            if case.startswith("missing-"):
                row.pop({"missing-acquired": "acquiredAt", "missing-sha": "contentSha256",
                    "missing-length": "contentLengthBytes", "missing-item": "itemId"}[case])
            elif case == "wrong-href": row["canonicalHref"] += "?not-canonical=1"
            elif case == "wrong-identity": row["assetIdentitySha256"] = "0" * 64
            elif case == "unsupported": row["collection"] = "not-an-owned-producer"
            elif case == "changed-body": old.write_bytes(b"changed".ljust(len(body), b"y"))
            elif case == "no-boundary": p._RAW_CURRENT_PROTECTED = None
            elif case == "pins-only": p.RAW_CACHE_MAX_BYTES = 2 * len(body) + 12000
            p.save_raw_cache_manifest(manifest)
            before = {path.name: path.read_bytes() for path in p.RAW_DIR.iterdir()}
            pin_identities = {path.name: p._OwnedGribRead._identity(path.lstat()) for path in (committed, session)}
            calls = []
            class Response:
                headers = {"content-length": str(len(body))}
                def __enter__(self): return self
                def __exit__(self, *args): return False
                def raise_for_status(self): pass
                def iter_content(self, _size): yield body
            class Session:
                def get(self, href, **kwargs):
                    calls.append(href)
                    return Response()
            qualified = []
            normal_capture = p.raw_cache_source_capture
            normal_inventory = p._raw_current_inventory
            late_manifest = None
            late_inventory_changed = False
            def capture_for_deletion(path, *args, **kwargs):
                nonlocal late_manifest
                qualified.append(path.name)
                actual = normal_capture(path, *args, **kwargs)
                if path == old and second is not None:
                    if case == "late-second-file": second.write_bytes(b"late-change".ljust(len(body), b"z"))
                    elif case == "late-manifest":
                        late_manifest = p.load_raw_cache_manifest()
                        late_manifest["assets"][second.name]["lastUsedAt"] = "2026-01-01T05:00:00Z"
                        p.save_raw_cache_manifest(late_manifest)
                return actual
            def final_inventory():
                nonlocal late_inventory_changed
                if case == "late-inventory-file" and len(qualified) == 2 and not late_inventory_changed:
                    second.write_bytes(b"final-inventory-change".ljust(len(body), b"z"))
                    late_inventory_changed = True
                return normal_inventory()
            with patch.object(p, "DOWNLOAD_SESSION", Session()), \
                 patch.object(p, "raw_cache_source_capture", side_effect=capture_for_deletion), \
                 patch.object(p, "_raw_current_inventory", side_effect=final_inventory):
                if case == "good":
                    incoming, reused = p.download_asset("https://owned-fixture.invalid/incoming.grib", len(body), {"bytes": 0},
                        collection="dkss_idw", model_run=valid_time, valid_time=valid_time,
                        item_id="incoming", item_created_at=valid_time)
                    assert not reused and incoming.read_bytes() == body and len(calls) == 1
                    assert not old.exists() and old.name not in p.load_raw_cache_manifest()["assets"]
                    assert qualified == [old.name], "hash only selected nonmarine deletion, not unrelated files"
                else:
                    try:
                        p.download_asset("https://owned-fixture.invalid/incoming.grib", len(body), {"bytes": 0})
                    except p.AssetDownloadCleanupUnproven:
                        pass
                    else:
                        raise AssertionError(f"nonmarine LRU refusal bypassed: {case}")
                    assert not calls, f"unproved deletion reached transport: {case}"
                    if case.startswith("late-"):
                        assert old.read_bytes() == body and second.exists(), "late refusal deleted the first planned input"
                        if late_manifest is not None:
                            assert p.load_raw_cache_manifest() == late_manifest
                        else:
                            assert p.raw_cache_manifest_path().read_bytes() == before[p.CACHE_MANIFEST_NAME]
                    else:
                        assert before == {path.name: path.read_bytes() for path in p.RAW_DIR.iterdir()}, case
            assert unknown.read_bytes() == before[unknown.name]
            for path in (committed, session):
                assert path.read_bytes() == body and p._OwnedGribRead._identity(path.lstat()) == pin_identities[path.name]
    print("RAW nonmarine LRU: 3 normal registered families, capture/identity/ownership/pin refusals and pre-delete late races passed")


def check_archive_isolated_raw_retention():
    """Real fixed loader/catalog bytes; SYNTHETIC archive, not JS authority."""
    import gzip
    import hashlib
    from unittest.mock import patch
    p = producer
    old = p.ROOT, p.RAW_DIR, p._RAW_CURRENT_PROTECTED
    policies = dict(p._RAW_CURRENT_IDENTITIES), set(p._RAW_CURRENT_UNPROVED_NAMES), dict(p._RAW_CURRENT_SESSION_PROTECTED)
    with tempfile.TemporaryDirectory(prefix="rr-archive-raw-retention-") as directory:
        p.ROOT = Path(directory)
        p.RAW_DIR = p.ROOT / ".cache/dmi-grib"
        p.RAW_DIR.mkdir(parents=True)
        p._RAW_CURRENT_PROTECTED = None
        p._RAW_CURRENT_IDENTITIES.clear()
        p._RAW_CURRENT_UNPROVED_NAMES.clear()
        p._RAW_CURRENT_SESSION_PROTECTED.clear()
        def write(relative, value):
            destination = p.ROOT / relative
            destination.parent.mkdir(parents=True, exist_ok=True)
            raw = value if isinstance(value, bytes) else json.dumps(value).encode()
            destination.write_bytes(raw)
            return raw
        h0, target = "2026-01-01T02:00:00Z", "2026-01-01T04:00:00Z"
        part_doc = {"zones": {zone["parentZoneId"]: [{"partId": "TEST", "waterPoint": [2, 1]}]}}
        part_bytes = json.dumps(part_doc).encode()
        registry_sha = "sha256:" + hashlib.sha256(part_bytes).hexdigest()
        targets = [{"partId": "TEST", "parentZoneId": zone["parentZoneId"], "waterPoint": [2, 1]}]
        checkpoint = {"datasetId": "rr-synthetic-archive", "productionReferenceAt": h0, "generationSha256": "3" * 64}
        conditions_bytes = write("data/live/conditions.json", {"synthetic": True})
        checkpoint_bytes = write(".cache/ravscore-continuation-checkpoint/checkpoint.json", checkpoint)
        source_hashes = {"conditions": "sha256:" + hashlib.sha256(conditions_bytes).hexdigest(),
            "checkpoint": "sha256:" + hashlib.sha256(checkpoint_bytes).hexdigest(), "activation": None}
        boundary = {"datasetId": checkpoint["datasetId"], "productionReferenceAt": h0,
            "bundleContentSha256": "2" * 64, "checkpointGenerationSha256": checkpoint["generationSha256"],
            "conditionsSha256": hashlib.sha256(conditions_bytes).hexdigest()}
        description = {key: boundary[key] for key in ("datasetId", "productionReferenceAt", "bundleContentSha256")}
        write("private/bundle/manifest.json", description)
        write("private/bundle/payload/data/live/conditions.json", conditions_bytes)
        write("cold/archive/original-file-000.bin", checkpoint_bytes)
        catalog = {"schemaVersion": 1, "kind": "RAVRADAR_WEATHER_STATE_EPOCH_ARCHIVE", "admission": "NO_ADMISSION",
            "targetReferenceAt": target, "source": {"originalDescription": description,
                "originalPointerRow": {"version": 7, "payload": {"current": description}}, "checkpointVersion": 9},
            "originalBObjects": [], "originalFiles": [], "files": [{"role": "checkpoint", "relativePath": "original-S.json",
                "localFile": "original-file-000.bin", "bytes": len(checkpoint_bytes),
                "sha256": hashlib.sha256(checkpoint_bytes).hexdigest()}]}
        identity = {key: catalog[key] for key in ("schemaVersion", "kind", "admission", "targetReferenceAt", "source", "originalBObjects", "originalFiles")}
        catalog["archiveId"] = hashlib.sha256(p._current_history_json(identity).encode()).hexdigest()
        catalog_bytes = gzip.compress(p._current_history_json(catalog).encode())
        catalog_path = p.ROOT / "cold/archive/catalog.json.gz"
        write("cold/archive/catalog.json.gz", catalog_bytes)
        retention = {"schemaVersion": 1, "kind": "ARCHIVE_ISOLATED_COLD_RAW_RETENTION", "boundary": boundary,
            "archive": {"archiveId": catalog["archiveId"], "archiveCatalogSha256": hashlib.sha256(catalog_bytes).hexdigest(),
                "catalogPath": str(catalog_path), "pointerVersion": 7, "checkpointVersion": 9,
                "targetReferenceAt": target, "registrySha256": registry_sha,
                "selection": "MEASURED_COLD_WITHOUT_OLD_CURRENT_STATE"}, "captures": []}
        history = {"schemaVersion": 2, "kind": "RAVSCORE_CURRENT_HISTORY_ACQUISITION_DEMAND", "productionReferenceAt": target,
            "modelBinding": {}, "registrySha256": registry_sha, "sourceHashes": source_hashes, "demands": [], "rawRetention": retention}
        env = {"RUNNER_TEMP": str(p.ROOT), "DMI_BULK_REQUIRE_COMMITTED_RAW_RETENTION": "true",
            "DMI_BULK_CURRENT_HISTORY_DEMAND_PATH": str(p.ROOT / ".cache/ravscore-current-history-demand.json"),
            "RAVRADAR_PRIVATE_RUNTIME_ROOT": str(p.ROOT / "private"), "RAVRADAR_PRIVATE_RUNTIME_BUNDLE": str(p.ROOT / "private/bundle")}
        read = lambda: p.read_current_history_demands(part_doc, part_bytes, targets, [zone], target)
        try:
            with patch.dict(os.environ, env):
                write(".cache/ravscore-current-history-demand.json", history)
                assert read() == {} and p._RAW_CURRENT_PROTECTED == {}, "validated local archive scope did not enable bounded LRU"
                assert not p._RAW_CURRENT_SESSION_PROTECTED, "policy must not invent a marine receipt"
                negatives = []
                for key, value in (("archiveId", "0" * 64), ("archiveCatalogSha256", "0" * 64),
                                   ("pointerVersion", 8), ("pointerVersion", True), ("checkpointVersion", 10),
                                   ("targetReferenceAt", h0), ("registrySha256", "sha256:" + "0" * 64),
                                   ("selection", "COMMITTED_OLD_S"), ("catalogPath", str(catalog_path.parent / "missing.gz"))):
                    changed = copy.deepcopy(history); changed["rawRetention"]["archive"][key] = value; negatives.append(changed)
                changed = copy.deepcopy(history); changed["rawRetention"]["captures"] = [{"not": "an empty archived-current scope"}]; negatives.append(changed)
                changed = copy.deepcopy(history); changed["rawRetention"]["kind"] = "COMMITTED_POST_H0_UNKNOWN_RAW_RETENTION"; negatives.append(changed)
                changed = copy.deepcopy(history); changed["rawRetention"]["archive"]["extra"] = True; negatives.append(changed)
                for changed in negatives:
                    p._RAW_CURRENT_PROTECTED = None
                    write(".cache/ravscore-current-history-demand.json", changed)
                    try: read()
                    except (p.AssetDownloadCleanupUnproven, ValueError, OSError): pass
                    else: raise AssertionError("false archive retention was accepted")
                    assert p._RAW_CURRENT_PROTECTED is None, "a refused policy changed eviction authority"
                write(".cache/ravscore-current-history-demand.json", history)
                write("cold/archive/original-file-000.bin", {**checkpoint, "generationSha256": "0" * 64})
                try: read()
                except (p.AssetDownloadCleanupUnproven, ValueError, OSError): pass
                else: raise AssertionError("changed archived S was accepted")
                assert p._RAW_CURRENT_PROTECTED is None
                write("cold/archive/original-file-000.bin", checkpoint_bytes)
                accepted_boolean_cases = []
                for label in ("catalog-schema", "catalog-pointer-version", "catalog-checkpoint-version", "retention-schema"):
                    altered_catalog, altered_history = copy.deepcopy(catalog), copy.deepcopy(history)
                    if label == "catalog-schema": altered_catalog["schemaVersion"] = True
                    if label == "catalog-pointer-version":
                        altered_catalog["source"]["originalPointerRow"]["version"] = True
                        altered_history["rawRetention"]["archive"]["pointerVersion"] = 1
                    if label == "catalog-checkpoint-version":
                        altered_catalog["source"]["checkpointVersion"] = True
                        altered_history["rawRetention"]["archive"]["checkpointVersion"] = 1
                    if label == "retention-schema": altered_history["rawRetention"]["schemaVersion"] = True
                    altered_catalog["archiveId"] = hashlib.sha256(p._current_history_json(
                        {key: altered_catalog[key] for key in identity}).encode()).hexdigest()
                    altered_bytes = gzip.compress(p._current_history_json(altered_catalog).encode())
                    altered_history["rawRetention"]["archive"].update(archiveId=altered_catalog["archiveId"],
                        archiveCatalogSha256=hashlib.sha256(altered_bytes).hexdigest())
                    write("cold/archive/catalog.json.gz", altered_bytes)
                    write(".cache/ravscore-current-history-demand.json", altered_history)
                    p._RAW_CURRENT_PROTECTED = None
                    try: read()
                    except (p.AssetDownloadCleanupUnproven, ValueError, OSError): pass
                    else: accepted_boolean_cases.append(label)
                assert not accepted_boolean_cases, "archive booleans accepted as integer versions: " + str(accepted_boolean_cases)
                write("cold/archive/catalog.json.gz", catalog_bytes)
                write(".cache/ravscore-current-history-demand.json", history)
                assert read() == {} and p._RAW_CURRENT_PROTECTED == {}
                inner = p.ROOT / "inside"
                inner.mkdir()
                escaped = copy.deepcopy(history)
                escaped["rawRetention"]["archive"]["catalogPath"] = str(inner / ".." / "cold/archive/catalog.json.gz")
                write(".cache/ravscore-current-history-demand.json", escaped)
                p._RAW_CURRENT_PROTECTED = None
                with patch.dict(os.environ, {"RUNNER_TEMP": str(inner)}):
                    try: read()
                    except (p.AssetDownloadCleanupUnproven, ValueError, OSError): pass
                    else: raise AssertionError("lexical temp-parent escape was accepted")
                assert p._RAW_CURRENT_PROTECTED is None

                # The new archive scope must exercise the actual common disk
                # lifecycle too, not merely report an empty committed pin set.
                write(".cache/ravscore-current-history-demand.json", history)
                body = b"synthetic archive-scope RAW bytes, not provider GRIB".ljust(32768, b"x")
                def seed_raw(label, mtime):
                    href = f"https://owned-fixture.invalid/{label}.grib"
                    destination = p.cached_asset_path(href)
                    destination.write_bytes(body)
                    p.register_raw_cache_asset(destination, href, "dkss_nsbs", valid_time, valid_time,
                        item_id=label, item_created_at=valid_time, expected_size=len(body),
                        acquired_at=valid_time, content_sha256=hashlib.sha256(body).hexdigest())
                    os.utime(destination, (mtime, mtime))
                    return destination
                disposable = seed_raw("archived-prior-process-cache", 1)
                p._RAW_CURRENT_SESSION_PROTECTED.clear()  # Only the simulated prior process ends here.
                session = seed_raw("new-process-marine-hard-pin", 2)
                unknown = p.RAW_DIR / "unregistered-private-original.grib"
                unknown.write_bytes(b"unregistered remains unowned")
                retained = {file: (file.read_bytes(), p._OwnedGribRead._identity(file.lstat()))
                    for file in (session, unknown)}
                assert read() == {} and p._RAW_CURRENT_PROTECTED == {}
                assert session.name in p._raw_current_session_files()
                freed = p.prepare_raw_cache_space(len(body), metadata_reserve=4096,
                    max_bytes=2 * len(body) + 12000)
                assert freed == {"removedFiles": 1, "removedBytes": len(body)}
                assert not disposable.exists() and disposable.name not in p.load_raw_cache_manifest()["assets"]
                for file, (raw, identity) in retained.items():
                    assert file.read_bytes() == raw and p._OwnedGribRead._identity(file.lstat()) == identity
                assert (p.ROOT / "cold/archive/original-file-000.bin").read_bytes() == checkpoint_bytes
                assert catalog_path.read_bytes() == catalog_bytes
        finally:
            p.ROOT, p.RAW_DIR, p._RAW_CURRENT_PROTECTED = old
            p._RAW_CURRENT_IDENTITIES.clear(); p._RAW_CURRENT_IDENTITIES.update(policies[0])
            p._RAW_CURRENT_UNPROVED_NAMES.clear(); p._RAW_CURRENT_UNPROVED_NAMES.update(policies[1])
            p._RAW_CURRENT_SESSION_PROTECTED.clear(); p._RAW_CURRENT_SESSION_PROTECTED.update(policies[2])
    print("Archive-isolated RAW retention: actual fixed catalog/S reads, 18 false-boundary cases and actual bounded LRU preserving session/unknown/archive bytes; no numeric admission")


if sys.argv[1:] == ["--archive-isolated-raw-retention-only"]:
    check_archive_isolated_raw_retention()
    raise SystemExit(0)
check_raw_current_retention()
check_raw_nonmarine_retention()
check_archive_isolated_raw_retention()
if sys.argv[1:] == ["--raw-current-retention-only"]:
    print("RAW current retention: normal download -> later score failure -> unchanged B/S -> next replay plan passed")
    raise SystemExit(0)


def check_current_history_native_bracket_boundaries():
    """Normal capture/clean callers; demanded CURRENT only, not blanket retention."""
    from unittest.mock import patch
    now = datetime(2026, 10, 16, 12, tzinfo=timezone.utc)
    at = lambda offset: (now + timedelta(hours=offset)).isoformat().replace("+00:00", "Z")
    requests = producer.current_history_demands([{
        "partId": "TEST", "zoneId": zone["parentZoneId"],
        "parentZoneId": zone["parentZoneId"], "entityId": zone["id"],
        "samplingPoint": [zone["lon"], zone["lat"]], "samplingContextKey": "sha256:" + "1" * 64,
        "initialSource": "EXISTING_INTEGRATED", "initialStateAt": at(-10),
        "initialStateSha256": "sha256:" + "2" * 64, "startAt": at(-61), "endAt": at(0),
    }], [zone], at(0))
    registry = "0123456789abcdef"
    def native(offset):
        return producer.native_component_source("dkss_lf", at(-72), at(offset),
            component="current", zone=zone, grid_candidate=candidate,
            capture={**capture, "acquiredAt": at(-70)},
            spatial_selection="nearest-shared-grid-cell-no-spatial-interpolation",
            verticalLayer="depthbelowsea:1", verticalLayerRankM=1.,
            vectorSelection=CURRENT_VECTOR_SELECTION, vectorSemanticsVersion=3)
    rows = {at(offset): {"time": at(offset), "current-u": .123456789,
        "current-v": -.234567891, "sea-mean-deviation": .5,
        "sources": {"current": native(offset)}} for offset in (-65, -64, -62, -61, -59, 3, 4)}
    doc = {"schemaVersion": 2, "generatedAt": at(0), "zoneRegistrySignature": registry,
        "currentVectorSemanticsVersion": 3, "currentVectorSelection": CURRENT_VECTOR_SELECTION,
        "currentMaxDistanceKm": 5., "timeStrideHours": 3, "diagnostics": {},
        "zones": {zone["id"]: {**sampling_identity(zone), "gridPoints": {}, "collections": {}, "hourly": rows}}}
    original = copy.deepcopy(doc)
    captured = producer.capture_current_history_originals(doc, requests, registry)
    assert {item["time"] for item in captured} == {at(x) for x in (-64, -62, -61, -59, 3)}, "DEMANDED_NATIVE_BRACKET_CAPTURE_DROPPED"
    working = copy.deepcopy(doc)
    with patch.object(producer.time, "time", return_value=now.timestamp()), \
            patch.object(producer, "PRIVATE_REPLAY_RETENTION_HOURS", 60):
        producer.clean_and_summarize(working, set(), {"bytes": 0}, current_history_requests=requests)
    kept = working["zones"][zone["id"]]["hourly"]
    assert at(-64) in kept and at(-62) in kept and at(-65) not in kept, "DEMANDED_NATIVE_BRACKET_CLEAN_DROPPED"
    for time_key in (at(-64), at(-62), at(-61)):
        assert kept[time_key] == {key: copy.deepcopy(rows[time_key][key]) for key in ("time", "current-u", "current-v", "sources")}
        assert "sea-mean-deviation" not in kept[time_key]
    for kind in ("wrong-part", "excluded", "invalid", "non-current"):
        bad = copy.deepcopy(doc)
        point = bad["zones"][zone["id"]]
        point["hourly"] = {at(-62): copy.deepcopy(rows[at(-62)])}
        row = point["hourly"][at(-62)]
        if kind == "wrong-part":
            row["sources"]["current"]["entityId"] = "PART::OTHER"
        elif kind == "excluded":
            point["parentZoneId"] = "DK-B01-01"
            row["sources"]["current"]["parentZoneId"] = "DK-B01-01"
            scoped = copy.deepcopy(requests);scoped[zone["id"]]["identity"]["parentZoneId"] = "DK-B01-01"
        elif kind == "invalid":
            row["sources"]["current"].pop("contentSha256")
        else:
            for field in ("current-u", "current-v"):
                row.pop(field)
            row["sources"].pop("current")
        scoped = scoped if kind == "excluded" else requests
        assert not producer.capture_current_history_originals(bad, scoped, registry), kind
        with patch.object(producer.time, "time", return_value=now.timestamp()), \
                patch.object(producer, "PRIVATE_REPLAY_RETENTION_HOURS", 60):
            producer.clean_and_summarize(bad, set(), {"bytes": 0}, current_history_requests=scoped)
        assert at(-62) not in bad["zones"][zone["id"]]["hourly"], kind
    assert doc == original


check_current_history_native_bracket_boundaries()
if sys.argv[1:] == ["--current-history-bracket-boundaries-only"]:
    print("Normal demanded native bracket capture/clean passed: fixed +/-3h, own CURRENT/identity/exclusion/invalid/noncurrent negatives; originals unchanged")
    raise SystemExit(0)


def check_legacy_current_original_decoder():
    """Controlled operations only; not a native ecCodes/lease/production proof."""
    import hashlib
    import io
    from lib.dmi_legacy_current_originals import decode_legacy_current_originals

    when = "2026-10-09T00:00:00Z"
    own_zone = {**zone, "lat": 56.15, "lon": 8.3}
    old_point = {"latitude": 56.149, "longitude": 8.299,
        "distanceKm": producer.haversine_km(56.15, 8.3, 56.149, 8.299)}
    grid = ("regular_ll", 3, 3, 9, 56., 8., 56.3, 8.6, .299, .149)
    old_point["gridDefinitionSha256"] = producer.grid_definition_sha256_from_signature(grid)
    payload = b"controlled two-field input"
    own_capture = {**capture, "acquiredAt": when, "contentLengthBytes": len(payload),
        "assetSizeBytes": len(payload), "contentSha256": hashlib.sha256(payload).hexdigest()}
    own_source = producer.native_component_source("dkss_lf", when, when,
        component="current", zone=own_zone, grid_candidate=old_point, capture=own_capture,
        spatial_selection="nearest-shared-grid-cell-no-spatial-interpolation",
        verticalLayer="depthbelowsea:1", verticalLayerRankM=1.,
        vectorSelection=CURRENT_VECTOR_SELECTION, vectorSemanticsVersion=3)
    assert own_source is not None and "nativeGridSampling" not in own_source
    signature = "parser:20|params:4|grid:9|eccodes-api:2.48.2|eccodes-binding:2.48.0|zones:0123456789abcdef"
    request = {"zone": own_zone, "expectedSource": own_source,
        "capture": producer.canonical_current_source_asset(own_source), "processingSignature": signature}
    originals = copy.deepcopy(request)
    values = {"current-u": .123456789012345, "current-v": -.876543210987654}
    header = dict(zip(producer.GRID_DEFINITION_KEYS, grid))
    header.update(md5GridSection="a" * 32, edition=1, scanningMode=64,
        dataDate=20261009, dataTime=0, validityDate=20261009, validityTime=0,
        typeOfLevel="depthBelowSea", level=1, missingValue=9999.)
    messages = [{**header, "parameter": field} for field in values]

    class Reader:
        def __init__(self):
            self.binding = ("dkss_lf", when, when)
            self.capture = copy.deepcopy(own_capture)
            self.handle = io.BytesIO(payload)
            self.checks = 0
            self.eof = False
        def check(self):
            self.checks += 1

    def run(requests=None, *, rows=None, capture_change=None, callbacks=None):
        reader = Reader()
        if capture_change:
            reader.capture.update(capture_change)
        iterator = iter(copy.deepcopy(messages if rows is None else rows))
        released = []
        def next_message(handle):
            assert handle is reader.handle
            item = next(iterator, None)
            if item is None:
                handle.seek(len(payload));reader.eof = True
            return item
        def nearest(_gid, _lat, _lon, *args, **kwargs):
            return [{"index": 4, "lat": old_point["latitude"], "lon": old_point["longitude"]}]
        ops = {"new_message": next_message,
            "release_message": lambda gid, first: released.append((gid["parameter"], first)),
            "get": lambda gid, key: gid[key],
            "get_elements": lambda gid, key, indices: [values[gid["parameter"]] for _ in indices],
            "find_nearest": nearest, "nearest_new": None, "nearest_find": None,
            "nearest_delete": None, "same_grid": None,
            "out_of_area_error": eccodes.OutOfAreaError,
            "classify_parameter": lambda gid, collection: gid["parameter"],
            "candidate_target": producer.grid_candidate_target,
            "stop_requested": lambda: False, "processing_signature": signature}
        ops.update(callbacks or {})
        result = decode_legacy_current_originals(reader,
            copy.deepcopy([request] if requests is None else requests), operations=ops)
        assert reader.eof and reader.checks > 4 and len(released) == len(messages if rows is None else rows)
        return result

    decoded = run()
    assert len(decoded) == 1 and decoded[0]["zoneId"] == own_zone["id"]
    row = decoded[0]["row"]
    assert row["current-u"] == values["current-u"] and row["current-v"] == values["current-v"]
    assert row["current-u"] != round(row["current-u"], 5)
    assert row["sources"]["current"] == own_source and "nativeGridSampling" not in row["sources"]["current"]
    assert request == originals
    geometry = producer.dkss_grib1_header_geometry(("a" * 32, *grid), 64)
    new_point = producer.dkss_header_grid_point(geometry, 4)
    assert [new_point["lon"], new_point["lat"]] != own_source["gridPoint"], "OLD/NEW mismatch fixture collapsed"
    assert run(capture_change={"acquiredAt": "2026-10-09T01:00:00Z"}) == decoded
    null_request = copy.deepcopy(request)
    null_request["expectedSource"]["nativeGridSampling"] = None
    null_before = copy.deepcopy(null_request)
    null_decoded = run([null_request])
    assert null_decoded[0]["row"]["sources"]["current"] == null_request["expectedSource"]
    assert null_decoded[0]["row"]["sources"]["current"]["nativeGridSampling"] is None
    assert all(null_decoded[0]["row"][field] == values[field] for field in values)
    assert null_request == null_before

    def rejected(callback, code):
        try:
            callback()
        except ValueError as error:
            assert str(error) == "DMI_LEGACY_CURRENT_" + code, str(error)
        else:
            raise AssertionError("legacy decoder accepted " + code)
    wrong_part = copy.deepcopy(request);wrong_part["zone"]["id"] = "PART::OTHER"
    rejected(lambda: run([wrong_part]), "REQUEST_INVALID")
    wrong_point = copy.deepcopy(request);wrong_point["expectedSource"]["gridPoint"][0] += .0001
    rejected(lambda: run([wrong_point]), "SOURCE_PROJECTION_MISMATCH")
    wrong_layer = copy.deepcopy(request);wrong_layer["expectedSource"]["verticalLayer"] = "depthbelowsea:2"
    rejected(lambda: run([wrong_layer]), "SOURCE_PROJECTION_MISMATCH")
    new_receipt = copy.deepcopy(request);new_receipt["expectedSource"]["nativeGridSampling"] = {}
    rejected(lambda: run([new_receipt]), "REQUEST_INVALID")
    partial_receipt = copy.deepcopy(request);partial_receipt["expectedSource"]["nativeGridSampling"] = {"schemaVersion": 1}
    rejected(lambda: run([partial_receipt]), "REQUEST_INVALID")
    wrong_header = copy.deepcopy(messages);wrong_header[-1]["validityTime"] = 100
    rejected(lambda: run(rows=wrong_header), "HEADER_MISMATCH")
    rejected(lambda: run(capture_change={"contentSha256": "0" * 64}), "CAPTURE_MISMATCH")
    rejected(lambda: run(rows=messages[:1]), "NATIVE_TUPLE_UNAVAILABLE")
    rejected(lambda: run(callbacks={"get_elements": lambda *args: {1.}}), "VALUES_INVALID")
    rejected(lambda: run(callbacks={"stop_requested": lambda: True}), "DEFERRED")
    unknown_decoder = copy.deepcopy(request);unknown_decoder["processingSignature"] = signature.replace("parser:20", "parser:21")
    rejected(lambda: run([unknown_decoder]), "PROCESSING_CONTEXT_UNKNOWN")
    # The supported low-level ecCodes nearest route must have the SAME result.
    nearest_ids, flags, deleted = [], [], []
    assert run(callbacks={"nearest_new": lambda gid: nearest_ids.append(gid) or 12,
        "nearest_find": lambda ident, gid, lat, lon, flag, lsm, npoints:
            flags.append(flag) or [{"index": 4, "lat": old_point["latitude"], "lon": old_point["longitude"]}],
        "nearest_delete": lambda ident: deleted.append(ident), "same_grid": 1}) == decoded
    assert nearest_ids and deleted == [12] and flags[0] == 0 and set(flags[1:]) == {1}
    resource_failures = []
    lookup_failure = RuntimeError("controlled original nearest failure")
    delete_failure = RuntimeError("controlled native nearest release failure")
    def fail_lookup(*args):
        raise lookup_failure
    def fail_delete(*args):
        raise delete_failure
    try:
        run(callbacks={"nearest_new": lambda gid: 12, "nearest_find": fail_lookup,
            "nearest_delete": fail_delete, "same_grid": 1})
    except BaseException as error:
        if error is not delete_failure or error.__cause__ is not lookup_failure:
            resource_failures.append("NEAREST_DELETE_LOST_FIRST_CAUSE")
    else:
        resource_failures.append("NEAREST_FAILURE_ACCEPTED")
    high_level_fallback = []
    def unexpected_high(*args, **kwargs):
        high_level_fallback.append(True)
        return [{"index": 4, "lat": old_point["latitude"], "lon": old_point["longitude"]}]
    try:
        run(callbacks={"nearest_new": lambda gid: None, "nearest_find": fail_lookup,
            "nearest_delete": fail_delete, "same_grid": 1, "find_nearest": unexpected_high})
    except ValueError as error:
        if str(error) != "DMI_LEGACY_CURRENT_NEAREST_HANDLE_UNAVAILABLE":
            resource_failures.append("NONE_HANDLE_WRONG_FAILURE")
    else:
        resource_failures.append("NONE_HANDLE_FELL_BACK")
    if high_level_fallback:
        resource_failures.append("NONE_HANDLE_CALLED_HIGH_LEVEL")
    assert not resource_failures, resource_failures


check_legacy_current_original_decoder()
if sys.argv[1:] == ["--legacy-current-originals-only"]:
    print("Legacy OLD decoder controlled partition passed: own PART/capture/header/layer/fullprecision/OLD-vs-NEW; native ecCodes+lease UNRUN")
    raise SystemExit(0)


def check_legacy_current_recovery_normal_callers():
    """Real request reader/planners/decoder caller with controlled native ownership.

    The small on-disk source/capture fixture proves caller contracts, not an
    authenticated production generation, JavaScript projection or Linux lease.
    """
    import contextlib
    import hashlib
    from unittest.mock import patch
    from lib.dmi_legacy_current_recovery import REQUEST_PATH, OUTPUT_PATH, SOURCE_PATHS, _js_digest

    when = producer.canonical_time("2026-10-09T00:00:00Z")
    # Actual normal producer preserves these full central coordinates for
    # sampling while its original identity/source stores Python-round-seven.
    own_zone = {**zone, "lat": 56.15000004, "lon": 8.30000004}
    registry = "0123456789abcdef"
    signature = f"parser:20|params:4|grid:9|eccodes-api:2.48.2|eccodes-binding:2.48.0|zones:{registry}"
    payload = b"controlled normal OLD recovery input"
    href = "https://owned-fixture.invalid/normal-legacy-recovery.grib"
    digest = lambda value: "sha256:" + hashlib.sha256(value).hexdigest()
    encode = lambda value: (json.dumps(value, separators=(",", ":"), ensure_ascii=False) + "\n").encode()
    grid = ("regular_ll", 3, 3, 9, 56., 8., 56.3, 8.6, .299, .149)
    candidate = {"latitude": 56.149, "longitude": 8.299,
        "distanceKm": producer.haversine_km(own_zone["lat"], own_zone["lon"], 56.149, 8.299),
        "gridDefinitionSha256": producer.grid_definition_sha256_from_signature(grid)}
    captured = {**capture, "itemId": "controlled-normal-legacy",
        "assetIdentitySha256": producer.asset_identity_sha256(href), "acquiredAt": when,
        "contentLengthBytes": len(payload), "assetSizeBytes": len(payload),
        "contentSha256": hashlib.sha256(payload).hexdigest()}
    native = producer.native_component_source("dkss_lf", when, when, component="current",
        zone=own_zone, grid_candidate=candidate, capture=captured,
        spatial_selection=producer.COMPONENT_SPATIAL_SELECTION["current"],
        verticalLayer="depthbelowsea:1", verticalLayerRankM=1.,
        vectorSelection=CURRENT_VECTOR_SELECTION, vectorSemanticsVersion=3)
    assert native is not None
    canonical_capture = producer.canonical_current_source_asset(native)
    identity = sampling_identity(own_zone)
    header = {"generatedAt": when, "currentVectorSemanticsVersion": 3,
        "currentVectorSelection": CURRENT_VECTOR_SELECTION, "currentMaxDistanceKm": 5,
        "timeStrideHours": 3}
    processing = {"complete": True, "parserVersion": 20, "processingSignature": signature,
        "recognizedParameters": ["current-u", "current-v"], "zonesTouched": 1,
        "sourceAsset": canonical_capture}
    document = {**header, "zones": {own_zone["id"]: {**identity, "hourly": {}}},
        "runs": {"dkss_lf": {"referenceTime": when, "parserVersion": 20,
            "parameterMapVersion": 4, "gridLookupVersion": 9, "processingSignature": signature,
            "processedSteps": {when: processing}}}}
    step = {key: copy.deepcopy(native[key]) for key in ("itemId", "assetIdentitySha256",
        "nativeValidTime", "leadTimeHours", "acquiredAt", "optionalFieldSet")}
    step.update({key: copy.deepcopy(native[key]) for key in ("itemCreatedAt", "itemUpdatedAt") if key in native})
    forecast_source = {**copy.deepcopy(native), "nativeSteps": [step]}
    witness_id, request_id = "sha256:" + "1" * 64, "sha256:" + "2" * 64
    witness = {"witnessId": witness_id, "partId": "TEST", "documentRole": "deployedBulk",
        "row": {"time": when, "currentUMps": .123456789012345, "currentVMps": -.876543210987654,
            "sources": {"current": forecast_source}},
        "sourceSha256": "sha256:" + "3" * 64, "tupleSha256": "sha256:" + "4" * 64}
    request = {"requestId": request_id, "partId": "TEST", "entityId": own_zone["id"],
        "documentRole": "deployedBulk", "nativeValidTime": when,
        "reconstructionRequest": {"zone": own_zone, "expectedSource": native,
            "capture": canonical_capture, "processingSignature": signature},
        "processingEvidence": {"kind": "RUN_PROCESSED_STEP",
            "path": ["runs", "dkss_lf", "processedSteps", when], "sha256": "sha256:" + "5" * 64},
        "projectionWitnessRefs": [witness_id]}
    start_at = producer.canonical_time(datetime.fromisoformat(when.replace("Z", "+00:00")) - timedelta(hours=48))
    demand_row = {"partId": "TEST", "zoneId": own_zone["parentZoneId"],
        "parentZoneId": own_zone["parentZoneId"], "entityId": own_zone["id"],
        "samplingPoint": [own_zone["lon"], own_zone["lat"]], "samplingContextKey": "sha256:" + "6" * 64,
        "initialSource": "COLD_START", "initialStateAt": None, "initialStateSha256": None,
        "startAt": start_at, "endAt": when}
    assert len(producer.current_history_demands([demand_row], [own_zone], when)) == 1
    demand = {"productionReferenceAt": when, "modelBinding": {"controlled": "not-production-proof"},
        "demands": [demand_row]}
    part_bytes = b'{"zones":{"ZONE-TEST":[]}}\n'
    with tempfile.TemporaryDirectory(prefix="ravradar-legacy-normal-") as directory:
        local = Path(directory)
        def write(relative, data):
            path = local / relative; path.parent.mkdir(parents=True, exist_ok=True)
            path.write_bytes(data); return path
        fixed = {"zones": b'{"features":[]}\n', "deployedBulk": encode(document),
            "forecast": b'{"zones":{}}\n', "candidate": None, "active": None}
        for role, data in fixed.items():
            if data is not None:
                write(SOURCE_PATHS[role], data)
        write(".cache/ravscore-current-history-demand.json", encode(demand))
        envelope = {"schemaVersion": 1, "kind": "DMI_LEGACY_CURRENT_ORIGINAL_RECONSTRUCTION_REQUESTS",
            "productionReferenceAt": when, "modelBinding": demand["modelBinding"],
            "historyDemandSha256": digest(encode(demand)), "registrySha256": digest(part_bytes),
            "sourceHashes": {key: digest(value) if value is not None else None for key, value in fixed.items()},
            "sourcePaths": SOURCE_PATHS,
            "documentContexts": [{"documentRole": "deployedBulk", "header": header,
                "zones": [{"partId": "TEST", "zone": identity}]}],
            "projectionWitnesses": [witness], "reconstructionRequests": [request]}
        request_path = write(REQUEST_PATH, encode(envelope))
        with patch.object(producer, "ROOT", local), patch.object(producer, "RAW_DIR", local / ".cache/dmi-grib"), \
                patch.dict(os.environ, {"DMI_BULK_LEGACY_CURRENT_ORIGINAL_REQUEST_PATH": REQUEST_PATH,
                    "DMI_BULK_LEGACY_CURRENT_ORIGINAL_REQUEST_SHA256": digest(request_path.read_bytes())}):
            # The normal JS stage includes sourcePaths. Removing it in this
            # fixture to satisfy an incompatible parser would hide the defect.
            bound = producer.read_legacy_current_original_requests(part_bytes, [own_zone], when)
            assert len(bound["requests"]) == 1 and bound["requestsSha256"] == digest(request_path.read_bytes())
            # Schema2's existing NEW bracket is read from the SAME measured
            # own source document. It is never decoded by the OLD helper.
            mixed_at = producer.canonical_time(datetime.fromisoformat(when.replace("Z", "+00:00")) + timedelta(hours=1))
            new_at = producer.canonical_time(datetime.fromisoformat(when.replace("Z", "+00:00")) + timedelta(hours=3))
            existing_source = producer.native_component_source("dkss_lf", when, new_at, component="current",
                zone=own_zone, grid_candidate=candidate, capture={**captured, "itemId": "controlled-existing-new",
                    "assetIdentitySha256": "9" * 64}, spatial_selection=producer.COMPONENT_SPATIAL_SELECTION["current"],
                verticalLayer="depthbelowsea:1", verticalLayerRankM=1.,
                vectorSelection=CURRENT_VECTOR_SELECTION, vectorSemanticsVersion=3)
            assert existing_source is not None
            existing_source["nativeGridSampling"] = {"contractId": "dmi-native-grid-sampling-v1", "elementIndex": 4,
                "gridIndexIdentitySha256": "8" * 64, "coordinateInterpretation": "dmi-dkss-grib1-header-endpoints-v1",
                "gridDefinitionSha256": existing_source["gridDefinitionSha256"], "gridPoint": existing_source["gridPoint"],
                "fieldSet": ["current-u", "current-v"], "optionalFieldSet": []}
            existing_row = {"time": new_at, "current-u": .223456789012345, "current-v": -.776543210987654,
                "sources": {"current": existing_source}}
            mixed_source_document = copy.deepcopy(document)
            mixed_source_document["zones"][own_zone["id"]]["hourly"][new_at] = copy.deepcopy(existing_row)
            mixed_demand = copy.deepcopy(demand); mixed_demand["productionReferenceAt"] = mixed_at
            mixed_demand["demands"][0].update(endAt=mixed_at, startAt=producer.canonical_time(
                datetime.fromisoformat(mixed_at.replace("Z", "+00:00")) - timedelta(hours=48)))
            assert len(producer.current_history_demands(mixed_demand["demands"], [own_zone], mixed_at)) == 1
            mixed_envelope = copy.deepcopy(envelope)
            mixed_envelope.update(schemaVersion=2, productionReferenceAt=mixed_at,
                historyDemandSha256=digest(encode(mixed_demand)))
            mixed_envelope["sourceHashes"]["deployedBulk"] = digest(encode(mixed_source_document))
            own_step = {key: copy.deepcopy(existing_source[key]) for key in (
                "itemId", "assetIdentitySha256", "nativeValidTime", "leadTimeHours", "acquiredAt", "optionalFieldSet",
                "nativeGridSampling", "gridPoint", "distanceKm", "itemCreatedAt") if key in existing_source}
            mixed_witness = mixed_envelope["projectionWitnesses"][0]["row"]
            mixed_witness["time"] = mixed_at
            mixed_witness["sources"]["current"].update(nativeSteps=[copy.deepcopy(step), own_step],
                nativeValidTimes=[when, new_at], temporalResolution="interpolated", leadTimeHours=1., forecastAgeHours=0.)
            mixed_envelope["existingNativeOriginals"] = [{"originalId": "sha256:" + "7" * 64,
                "partId": "TEST", "documentRole": "deployedBulk",
                "documentSha256": mixed_envelope["sourceHashes"]["deployedBulk"], "contextSha256": "sha256:" + "8" * 64,
                "rowPath": ["zones", own_zone["id"], "hourly", new_at], "row": copy.deepcopy(existing_row),
                "projectionWitnessRefs": [witness_id]}]
            original = mixed_envelope["existingNativeOriginals"][0]
            original["contextSha256"] = _js_digest({"header": header, "zone": identity})
            def reissue_original_id(value):
                original = value["existingNativeOriginals"][0]
                original["originalId"] = _js_digest({key: item for key, item in original.items()
                    if key not in ("originalId", "projectionWitnessRefs")})
            reissue_original_id(mixed_envelope)
            def read_mixed_inputs(value):
                write(SOURCE_PATHS["deployedBulk"], encode(mixed_source_document))
                write(".cache/ravscore-current-history-demand.json", encode(mixed_demand))
                request_path.write_bytes(encode(value))
                with patch.dict(os.environ, {"DMI_BULK_LEGACY_CURRENT_ORIGINAL_REQUEST_SHA256": digest(request_path.read_bytes())}):
                    return producer.read_legacy_current_original_requests(part_bytes, [own_zone], mixed_at)
            mixed_bound = read_mixed_inputs(mixed_envelope)
            assert len(mixed_bound["requests"]) == 1 and len(mixed_bound["existingNativeOriginals"]) == 1
            assert mixed_bound["existingNativeOriginals"][0]["row"] == existing_row
            hash_failures = []
            for field in ("originalId", "contextSha256"):
                wrong = copy.deepcopy(mixed_envelope)
                wrong["existingNativeOriginals"][0][field] = "sha256:" + "a" * 64
                try:
                    read_mixed_inputs(wrong)
                except ValueError as error:
                    assert str(error) == "DMI_LEGACY_CURRENT_EXISTING_ORIGINAL_ID_MISMATCH", str(error)
                else:
                    hash_failures.append(field)
            assert not hash_failures, "Prewrite accepted changed own descriptor hashes: " + repr(hash_failures)
            wrong_context = copy.deepcopy(mixed_envelope)
            wrong_context["existingNativeOriginals"][0]["contextSha256"] = "sha256:" + "a" * 64
            reissue_original_id(wrong_context)
            try:
                read_mixed_inputs(wrong_context)
            except ValueError as error:
                assert str(error) == "DMI_LEGACY_CURRENT_EXISTING_ORIGINAL_ID_MISMATCH", str(error)
            else:
                raise AssertionError("A reissued originalId hid the wrong measured own context digest")
            for change, code in (
                (lambda value: value["existingNativeOriginals"][0]["row"].update({"current-u": 99.}), "EXISTING_ORIGINAL_CHANGED"),
                (lambda value: value["existingNativeOriginals"][0]["row"]["sources"]["current"].update(itemId="forged"), "EXISTING_ORIGINAL_CHANGED"),
                (lambda value: value["documentContexts"][0]["header"].update(currentVectorSelection="forged"), "REQUEST_CONTEXT_INVALID"),
                (lambda value: value["existingNativeOriginals"][0]["rowPath"].__setitem__(1, "PART::FOREIGN"), "EXISTING_ORIGINAL_INVALID"),
                (lambda value: value["existingNativeOriginals"][0].update(documentRole="candidate"), "EXISTING_ORIGINAL_INVALID"),
                (lambda value: value["existingNativeOriginals"][0].update(documentSha256="sha256:" + "f" * 64), "EXISTING_ORIGINAL_INVALID"),
            ):
                wrong = copy.deepcopy(mixed_envelope); change(wrong)
                reissue_original_id(wrong)
                try:
                    read_mixed_inputs(wrong)
                except ValueError as error:
                    assert str(error) == "DMI_LEGACY_CURRENT_" + code, str(error)
                else:
                    raise AssertionError("reauthorized request SHA bypassed actual same-document native validation")
            write(SOURCE_PATHS["deployedBulk"], fixed["deployedBulk"])
            write(".cache/ravscore-current-history-demand.json", encode(demand))
            request_path.write_bytes(encode(envelope))
            # A genuine capture/processing locator outside the exact collector
            # support window may not authorize unrelated materialization.
            outside = producer.canonical_time(datetime.fromisoformat(when.replace("Z", "+00:00")) + timedelta(hours=4))
            outside_plan, outside_doc = copy.deepcopy(envelope), copy.deepcopy(document)
            outside_request = outside_plan["reconstructionRequests"][0]
            outside_request["nativeValidTime"] = outside
            outside_native = outside_request["reconstructionRequest"]["expectedSource"]
            outside_native.update(nativeValidTime=outside, leadTimeHours=4.)
            outside_capture = producer.canonical_current_source_asset(outside_native)
            outside_request["reconstructionRequest"]["capture"] = outside_capture
            outside_request["processingEvidence"]["path"][-1] = outside
            outside_witness = outside_plan["projectionWitnesses"][0]["row"]
            outside_witness["time"] = outside
            outside_witness["sources"]["current"] = {**copy.deepcopy(outside_native),
                "nativeSteps": [{**copy.deepcopy(step), "nativeValidTime": outside, "leadTimeHours": 4.}]}
            outside_doc["runs"]["dkss_lf"]["processedSteps"][outside] = {**copy.deepcopy(processing),
                "sourceAsset": outside_capture}
            write(SOURCE_PATHS["deployedBulk"], encode(outside_doc))
            outside_plan["sourceHashes"]["deployedBulk"] = digest(encode(outside_doc))
            request_path.write_bytes(encode(outside_plan))
            with patch.dict(os.environ, {"DMI_BULK_LEGACY_CURRENT_ORIGINAL_REQUEST_SHA256": digest(request_path.read_bytes())}):
                try:
                    producer.read_legacy_current_original_requests(part_bytes, [own_zone], when)
                except ValueError as error:
                    assert str(error) == "DMI_LEGACY_CURRENT_REQUEST_OUTSIDE_DEMAND", str(error)
                else:
                    raise AssertionError("OUTSIDE_DEMAND_NATIVE_CAPTURE_ACCEPTED")
            write(SOURCE_PATHS["deployedBulk"], encode(document))
            request_path.write_bytes(encode(envelope))
            def rejected_request(changed, code):
                request_path.write_bytes(encode(changed))
                try:
                    with patch.dict(os.environ, {"DMI_BULK_LEGACY_CURRENT_ORIGINAL_REQUEST_SHA256": digest(request_path.read_bytes())}):
                        producer.read_legacy_current_original_requests(part_bytes, [own_zone], when)
                except ValueError as error:
                    assert str(error) == "DMI_LEGACY_CURRENT_" + code, str(error)
                else:
                    raise AssertionError("normal request reader accepted " + code)
                finally:
                    request_path.write_bytes(encode(envelope))
            wrong = copy.deepcopy(envelope); wrong["sourcePaths"]["forecast"] = ".cache/not-the-normal-forecast.json"
            rejected_request(wrong, "REQUEST_ENVELOPE_INVALID")
            wrong = copy.deepcopy(envelope); wrong["modelBinding"] = {"controlled": "other-model"}
            rejected_request(wrong, "REQUEST_ENVELOPE_INVALID")
            wrong = copy.deepcopy(envelope); wrong["reconstructionRequests"][0]["reconstructionRequest"]["processingSignature"] = signature.replace("parser:20", "parser:21")
            rejected_request(wrong, "PROCESSING_CONTEXT_UNKNOWN")
            wrong = copy.deepcopy(envelope); wrong["projectionWitnesses"][0]["partId"] = "OTHER"
            rejected_request(wrong, "WITNESS_INVALID")
            # Null belongs to the endpoint that actually recorded it. A top
            # marker must not silently become another endpoint's marker.
            null_envelope = copy.deepcopy(envelope)
            null_envelope["reconstructionRequests"][0]["reconstructionRequest"]["expectedSource"]["nativeGridSampling"] = None
            null_witness_source = null_envelope["projectionWitnesses"][0]["row"]["sources"]["current"]
            null_witness_source["nativeGridSampling"] = None
            null_witness_source["nativeSteps"][0]["nativeGridSampling"] = None
            wrong = copy.deepcopy(null_envelope)
            del wrong["projectionWitnesses"][0]["row"]["sources"]["current"]["nativeSteps"][0]["nativeGridSampling"]
            rejected_request(wrong, "WITNESS_INVALID")
            wrong = copy.deepcopy(null_envelope)
            del wrong["reconstructionRequests"][0]["reconstructionRequest"]["expectedSource"]["nativeGridSampling"]
            rejected_request(wrong, "WITNESS_INVALID")
            with patch.dict(os.environ, {"DMI_BULK_LEGACY_CURRENT_ORIGINAL_REQUEST_SHA256": "sha256:" + "0" * 64}):
                try:
                    producer.read_legacy_current_original_requests(part_bytes, [own_zone], when)
                except ValueError as error:
                    assert str(error) == "DMI_LEGACY_CURRENT_REQUEST_CHANGED"
                else:
                    raise AssertionError("request-stage SHA handshake was ignored")
            raw_path = producer.cached_asset_path(href); raw_path.parent.mkdir(parents=True, exist_ok=True)
            raw_path.write_bytes(payload)
            manifest = {"assets": {raw_path.name: {**canonical_capture, "canonicalHref": href}}}
            assert len(producer.plan_legacy_current_original_jobs(bound, manifest)) == 1
            inputs_before = {role: (local / SOURCE_PATHS[role]).read_bytes()
                for role, data in fixed.items() if data is not None}
            readers, events = [], []
            class Controller:
                def can_start_asset(self, **kwargs):
                    events.append(("budget", kwargs)); return True
                def observe_asset_duration(self, duration, **kwargs):
                    assert duration >= 0; events.append(("duration", kwargs))
            class Reader:
                def __init__(self, *, close_failure=False):
                    self.binding = ("dkss_lf", when, when); self.capture = copy.deepcopy(canonical_capture)
                    self.handle = raw_path.open("rb"); self.active = True; self.retained = False
                    self.physically_closed = False; self.native_handles = []; self.close_failure = close_failure
                    readers.append(self)
                def check(self):
                    assert self.active and not self.retained
                def measure(self):
                    data = self.handle.read(); self.handle.seek(0)
                    return len(data), hashlib.sha256(data).hexdigest()
                def _retain(self, error):
                    self.retained = True; producer._UNSETTLED_GRIB_READS.append(self)
                def _refuse(self, code, cause=None):
                    raise producer.GribReadUnproven(code) from cause
                def __enter__(self):
                    return self
                def __exit__(self, kind, failure, traceback):
                    self.handle.close(); self.active = False
                    events.append(("closed", failure))
                    if self.close_failure:
                        self._retain(RuntimeError("controlled close unproved"))
                        raise producer.GribReadUnproven("CONTROLLED_CLOSE_UNPROVED") from failure
                    self.physically_closed = True
                    return False
            fields = {"current-u": witness["row"]["currentUMps"], "current-v": witness["row"]["currentVMps"]}
            message_header = dict(zip(producer.GRID_DEFINITION_KEYS, grid))
            message_header.update(md5GridSection="a" * 32, edition=1, dataDate=20261009, dataTime=0,
                validityDate=20261009, validityTime=0, typeOfLevel="depthBelowSea", level=1, missingValue=9999.)
            messages = [{**message_header, "parameter": field} for field in fields]
            def new_message(handle):
                position = handle.tell()
                if position >= len(messages):
                    handle.seek(len(payload)); return None
                handle.seek(position + 1); return messages[position]
            def nearest(*args, **kwargs):
                return [{"index": 4, "lat": candidate["latitude"], "lon": candidate["longitude"]}]
            options = {"registry_signature": registry, "reserve_seconds": 0, "supervisor_skipped_assets": set()}
            with contextlib.ExitStack() as stack:
                replacements = {"load_raw_cache_manifest": lambda: manifest,
                    "_grib_read_scope": lambda *args: Reader(), "_UNSETTLED_GRIB_READS": [],
                    "codes_grib_new_from_file": new_message, "codes_get": lambda gid, key: gid[key],
                    "codes_release": lambda gid: events.append(("released", gid["parameter"])),
                    "codes_get_elements": lambda gid, key, indices: [fields[gid["parameter"]] for _ in indices],
                    "codes_grib_find_nearest": nearest, "codes_grib_nearest_new": None,
                    "codes_grib_nearest_find": None, "codes_grib_nearest_delete": None,
                    "classify_parameter": lambda gid, collection: gid["parameter"],
                    "should_stop_work": lambda: False, "progress": lambda *args: None,
                    "ECCODES_API_VERSION": "2.48.2", "ECCODES_BINDING_VERSION": "2.48.0"}
                for key, value in replacements.items():
                    stack.enter_context(patch.object(producer, key, value))
                originals = producer.reconstruct_legacy_current_originals(bound, Controller(), **options)
                assert len(originals) == 1 and readers[-1].physically_closed and not producer._UNSETTLED_GRIB_READS
                assert originals[0]["row"]["current-u"] == fields["current-u"]
                assert originals[0]["row"]["sources"]["current"] == native
                output_path = local / OUTPUT_PATH
                assert json.loads(output_path.read_bytes())["requestsSha256"] == bound["requestsSha256"]
                output_path.unlink()
                # Derived OLD tuples join the actual existing NEW replay plan.
                demands = {own_zone["id"]: {"startAt": when, "endAt": when}}
                planned = producer.plan_cached_current_history(demands, originals, manifest)
                assert len(planned["jobs"]) == 1 and not planned["unavailable"]
                assert list(planned["originalsByKey"].values()) == [[originals[0]]]
                mixed_bound = read_mixed_inputs(mixed_envelope)
                mixed_durations = []
                class MixedController(Controller):
                    def observe_asset_duration(self, duration, **kwargs):
                        assert duration >= 0; mixed_durations.append(kwargs)
                read_count = len(readers)
                mixed_originals = producer.reconstruct_legacy_current_originals(mixed_bound, MixedController(), **options)
                assert len(readers) == read_count + 1 and readers[-1].physically_closed
                assert len(mixed_durations) == 1, "Only the actual missing OLD file is decoded"
                assert len(mixed_originals) == 2
                retained_new = next(row for row in mixed_originals if row["time"] == new_at)
                assert retained_new["row"] == existing_row and retained_new["row"]["sources"]["current"] == existing_source
                sidecar = json.loads(output_path.read_bytes())
                assert sidecar["requestsSha256"] == mixed_bound["requestsSha256"]
                assert len(sidecar["document"]["zones"][own_zone["id"]]["hourly"]) == 1
                assert "nativeGridSampling" not in next(iter(sidecar["document"]["zones"][own_zone["id"]]["hourly"].values()))["sources"]["current"]
                mixed_plan = producer.plan_cached_current_history({own_zone["id"]: mixed_demand["demands"][0]},
                    mixed_originals, manifest)
                assert len(mixed_plan["originalsByKey"]) == 2 and len(mixed_plan["jobs"]) == 1 and not mixed_plan["unavailable"]
                output_path.unlink()
                write(SOURCE_PATHS["deployedBulk"], fixed["deployedBulk"])
                write(".cache/ravscore-current-history-demand.json", encode(demand))
                request_path.write_bytes(encode(envelope))
                # One authentic own endpoint can be needed by both document
                # roles: decode once, preserve both contexts without guessing.
                shared = copy.deepcopy(bound)
                shared["contexts"]["candidate"] = copy.deepcopy(shared["contexts"]["deployedBulk"])
                second = copy.deepcopy(shared["requests"][0]); second["documentRole"] = "candidate"
                second["requestId"] = "sha256:" + "7" * 64; shared["requests"].append(second)
                previous_reads = len(readers)
                shared_originals = producer.reconstruct_legacy_current_originals(shared, Controller(), **options)
                assert len(readers) == previous_reads + 1 and len(shared_originals) == 2
                assert shared_originals[0] == shared_originals[1]
                output_path.unlink()
                # Actual disagreement for the same own endpoint must fail
                # before acquisition, even if the shared request is well formed.
                conflict = copy.deepcopy(shared)
                conflict["requests"][1]["reconstructionRequest"]["expectedSource"]["distanceKm"] += .001
                try:
                    producer.reconstruct_legacy_current_originals(conflict, Controller(), **options)
                except ValueError as error:
                    assert str(error) == "DMI_LEGACY_CURRENT_NATIVE_CONFLICT"
                else:
                    raise AssertionError("conflicting same-PART reconstruction requests were merged")
                assert not output_path.exists() and len(readers) == previous_reads + 1
                # First job can finish and populate only a private in-memory
                # candidate. A second job's wrong owned capture must prevent
                # publication of that partial candidate as well.
                later_href = next(f"https://owned-fixture.invalid/late-{index}.grib" for index in range(100)
                    if str(producer.cached_asset_path(f"https://owned-fixture.invalid/late-{index}.grib")) > str(raw_path))
                later_path = producer.cached_asset_path(later_href); later_path.write_bytes(payload)
                partial = copy.deepcopy(bound); later_request = copy.deepcopy(partial["requests"][0])
                later_request["requestId"] = "sha256:" + "8" * 64
                later_source = later_request["reconstructionRequest"]["expectedSource"]
                later_source.update(itemId="controlled-later-original", assetIdentitySha256=producer.asset_identity_sha256(later_href))
                later_capture = producer.canonical_current_source_asset(later_source)
                later_request["reconstructionRequest"]["capture"] = later_capture
                partial["requests"].append(later_request)
                later_manifest = copy.deepcopy(manifest)
                later_manifest["assets"][later_path.name] = {**later_capture, "canonicalHref": later_href}
                read_start = len(readers)
                with patch.object(producer, "load_raw_cache_manifest", lambda: later_manifest):
                    try:
                        producer.reconstruct_legacy_current_originals(partial, Controller(), **options)
                    except ValueError as error:
                        assert str(error) == "DMI_LEGACY_CURRENT_RAW_CAPTURE_MISMATCH"
                    else:
                        raise AssertionError("partial earlier job escaped after a later owned capture failed")
                assert len(readers) == read_start + 2 and all(reader.physically_closed for reader in readers[-2:])
                assert not output_path.exists() and later_path.read_bytes() == payload
                # A late value failure after the complete header traversal
                # drains its message and closes the input, but publishes none.
                lookup_error = RuntimeError("controlled own values lookup failed")
                def broken_values(*args):
                    raise lookup_error
                release_start = sum(event[0] == "released" for event in events)
                with patch.object(producer, "codes_get_elements", broken_values):
                    try:
                        producer.reconstruct_legacy_current_originals(bound, Controller(), **options)
                    except RuntimeError as error:
                        assert error is lookup_error
                    else:
                        raise AssertionError("partial native traversal published an OLD context")
                assert readers[-1].physically_closed and not output_path.exists()
                assert sum(event[0] == "released" for event in events) - release_start == 3
                # Normal caller must retain the actual nearest object and the
                # first lookup cause when native nearest cleanup also fails.
                cleanup_error = RuntimeError("controlled nearest release failed")
                def broken_nearest(*args):
                    raise lookup_error
                def broken_nearest_delete(*args):
                    raise cleanup_error
                with patch.object(producer, "codes_grib_nearest_new", lambda gid: 12), \
                        patch.object(producer, "codes_grib_nearest_find", broken_nearest), \
                        patch.object(producer, "codes_grib_nearest_delete", broken_nearest_delete), \
                        patch.object(producer, "CODES_GRIB_NEAREST_SAME_GRID", 1):
                    try:
                        producer.reconstruct_legacy_current_originals(bound, Controller(), **options)
                    except producer.GribReadUnproven as error:
                        assert str(error) == "DMI_GRIB_NEAREST_RELEASE_UNPROVED" and error.__cause__ is lookup_error
                    else:
                        raise AssertionError("unsettled nearest object published an OLD context")
                assert readers[-1].retained and readers[-1].unsettled_legacy_nearest == 12
                assert producer._UNSETTLED_GRIB_READS and not output_path.exists()
                producer._UNSETTLED_GRIB_READS.clear()
                # Physical-close uncertainty must stop before any sidecar.
                with patch.object(producer, "_grib_read_scope", lambda *args: Reader(close_failure=True)):
                    try:
                        producer.reconstruct_legacy_current_originals(bound, Controller(), **options)
                    except producer.GribReadUnproven as error:
                        assert str(error) == "CONTROLLED_CLOSE_UNPROVED"
                    else:
                        raise AssertionError("unproved RAW close published an OLD context")
                assert not output_path.exists() and producer._UNSETTLED_GRIB_READS
                producer._UNSETTLED_GRIB_READS.clear()
                assert sum(event[0] == "duration" for event in events) == 7
                # Read the literal-null own-step request through the actual
                # fixed-file/SHA/parser caller, then decode without removing or
                # inventing a marker. Both request and witness stay exact.
                request_path.write_bytes(encode(null_envelope))
                null_request_bytes = request_path.read_bytes()
                with patch.dict(os.environ, {"DMI_BULK_LEGACY_CURRENT_ORIGINAL_REQUEST_SHA256": digest(null_request_bytes)}):
                    null_bound = producer.read_legacy_current_original_requests(part_bytes, [own_zone], when)
                null_requests_before = copy.deepcopy(null_bound["requests"])
                null_originals = producer.reconstruct_legacy_current_originals(null_bound, Controller(), **options)
                assert len(null_originals) == 1 and null_originals[0]["row"]["sources"]["current"] == null_requests_before[0]["reconstructionRequest"]["expectedSource"]
                assert null_originals[0]["row"]["sources"]["current"]["nativeGridSampling"] is None
                assert all(null_originals[0]["row"][field] == value for field, value in fields.items())
                assert null_bound["requests"] == null_requests_before and request_path.read_bytes() == null_request_bytes
                assert json.loads(null_request_bytes)["projectionWitnesses"] == null_envelope["projectionWitnesses"]
                assert readers[-1].physically_closed and not producer._UNSETTLED_GRIB_READS
                output_path.unlink()
                request_path.write_bytes(encode(envelope))
            assert {role: (local / SOURCE_PATHS[role]).read_bytes() for role in inputs_before} == inputs_before
            assert raw_path.read_bytes() == payload and request_path.read_bytes() == encode(envelope)


check_legacy_current_recovery_normal_callers()
if sys.argv[1:] == ["--legacy-current-recovery-callers-only"]:
    print("Legacy normal callers passed with controlled ownership: fixed-file parser/sourcePaths/capture plan/full decoder/close refusal/NEW plan; native lease and JS projection UNRUN")
    raise SystemExit(0)

target = {
    "partId": "TEST",
    "parentZoneId": "ZONE-TEST",
    "name": "Test",
    "waterPoint": [2.0, 1.0],
}
targets = [target]
reference = datetime(2026, 1, 1, 3, tzinfo=timezone.utc)
document = {
    "zones": {
        "PART::TEST": {
            "samplingPoint": [2.0, 1.0],
            "hourly": {
                valid_time: {
                    "time": valid_time,
                    "current-u": 0.1,
                    "current-v": -0.2,
                    "sources": {"current": source},
                },
            },
        },
    },
}
assert strict_verified_part_current_pair_count(
    document,
    targets,
    reference - timedelta(hours=48),
    reference + timedelta(hours=117),
) == 1
attestation = canonical_verified_part_current_attestation(
    document,
    targets,
    reference,
    reference + timedelta(hours=117),
)
assert attestation["verifiedPairCount"] == 1
assert attestation["verifiedSourceTimeCount"] == 1
assert producer.coastal_part_current_cache_reusable(document, targets, reference)

# A cache-map key may never borrow the public row/source time.  All three
# temporal claims must independently canonicalize to the same exact hour.
key_time_mismatch = json.loads(json.dumps(document))
key_time_mismatch["zones"]["PART::TEST"]["hourly"] = {
    "2026-01-01T04:00:00Z": key_time_mismatch["zones"]["PART::TEST"]["hourly"][valid_time],
}
assert strict_verified_part_current_pair_count(
    key_time_mismatch,
    targets,
    reference,
    reference + timedelta(hours=117),
) == 0
assert not producer.coastal_part_current_cache_reusable(
    key_time_mismatch,
    targets,
    reference,
)

matching_summary = json.loads(json.dumps(document))
matching_summary["zones"]["PART::TEST"]["gridPoints"] = {
    "current-u": {"longitude": 2.0, "latitude": 1.0},
    "current-v": {"longitude": 2.0, "latitude": 1.0},
}
assert producer.coastal_part_current_cache_reusable(
    matching_summary,
    targets,
    reference,
)

mismatched_summary = json.loads(json.dumps(matching_summary))
mismatched_summary["zones"]["PART::TEST"]["gridPoints"]["current-v"] = {
    "longitude": 2.1,
    "latitude": 1.0,
}
assert not producer.coastal_part_current_cache_reusable(
    mismatched_summary,
    targets,
    reference,
)

partial_summary = json.loads(json.dumps(matching_summary))
partial_summary["zones"]["PART::TEST"]["gridPoints"].pop("current-v")
assert not producer.coastal_part_current_cache_reusable(
    partial_summary,
    targets,
    reference,
)

missing_sampling_point = json.loads(json.dumps(document))
missing_sampling_point["zones"]["PART::TEST"].pop("samplingPoint")
assert not producer.coastal_part_current_cache_reusable(
    missing_sampling_point,
    targets,
    reference,
)

wrong_sampling_point = json.loads(json.dumps(document))
wrong_sampling_point["zones"]["PART::TEST"]["samplingPoint"] = [2.1, 1.0]
assert not producer.coastal_part_current_cache_reusable(
    wrong_sampling_point,
    targets,
    reference,
)

stale_positive_diagnostics = {
    "diagnostics": {
        "coastalPartCount": 1,
        "coastalPartComponentHorizonCoverage": {
            "marine": {"zonesWithAnyData": 1},
        },
    },
    "zones": {},
}
assert not producer.coastal_part_current_cache_reusable(
    stale_positive_diagnostics,
    targets,
    reference,
)

wrong_source = json.loads(json.dumps(document))
wrong_source["zones"]["PART::TEST"]["hourly"][valid_time]["sources"]["current"][
    "entityId"
] = "PART::OTHER"
assert not producer.coastal_part_current_cache_reusable(
    wrong_source,
    targets,
    reference,
)

outside_matrix_reference = datetime(2026, 1, 10, 3, tzinfo=timezone.utc)
assert not producer.coastal_part_current_cache_reusable(
    document,
    targets,
    outside_matrix_reference,
)

wrong_part_set = {
    "zones": {
        "PART::OTHER": document["zones"]["PART::TEST"],
    },
}
assert not producer.coastal_part_current_cache_reusable(
    wrong_part_set,
    targets,
    reference,
)

extra_part = json.loads(json.dumps(document))
extra_part["zones"]["PART::EXTRA"] = json.loads(
    json.dumps(document["zones"]["PART::TEST"])
)
assert not producer.coastal_part_current_cache_reusable(
    extra_part,
    targets,
    reference,
)

missing_vector_component = json.loads(json.dumps(document))
missing_vector_component["zones"]["PART::TEST"]["hourly"][valid_time].pop(
    "current-v"
)
assert not producer.coastal_part_current_cache_reusable(
    missing_vector_component,
    targets,
    reference,
)

for component, nonfinite in (
    ("current-u", float("nan")),
    ("current-v", float("inf")),
):
    nonfinite_vector = json.loads(json.dumps(document))
    nonfinite_vector["zones"]["PART::TEST"]["hourly"][valid_time][
        component
    ] = nonfinite
    assert not producer.coastal_part_current_cache_reusable(
        nonfinite_vector,
        targets,
        reference,
    )

split_vector_rows = json.loads(json.dumps(document))
first_row = split_vector_rows["zones"]["PART::TEST"]["hourly"][valid_time]
first_row.pop("current-v")
second_valid_time = "2026-01-01T04:00:00Z"
second_source = json.loads(json.dumps(source))
second_source["nativeValidTime"] = second_valid_time
split_vector_rows["zones"]["PART::TEST"]["hourly"][second_valid_time] = {
    "time": second_valid_time,
    "current-v": -0.2,
    "sources": {"current": second_source},
}
assert not producer.coastal_part_current_cache_reusable(
    split_vector_rows,
    targets,
    reference,
)

malformed_documents = (
    {"zones": 1},
    {"zones": ["PART::TEST"]},
    {"zones": {"PART::TEST": []}},
    {"zones": {"PART::TEST": {"hourly": []}}},
    {"zones": {"PART::TEST": {"hourly": {valid_time: []}}}},
    {
        "zones": {
            "PART::TEST": {
                "hourly": {
                    valid_time: {
                        "time": valid_time,
                        "current-u": 0.1,
                        "current-v": -0.2,
                        "sources": [],
                    },
                },
            },
        },
    },
)
for malformed_document in malformed_documents:
    assert not producer.coastal_part_current_cache_reusable(
        malformed_document,
        targets,
        reference,
    )
assert not producer.coastal_part_current_cache_reusable(
    document,
    [None],
    reference,
)

for strict_anchor, bootstrap_requested, bootstrap_complete, expected in (
    (False, False, False, True),
    (False, True, True, True),
    (True, True, False, True),
    (True, False, False, False),
    (True, True, True, False),
):
    assert producer.producer_success_blocked(
        strict_anchor,
        bootstrap_requested,
        bootstrap_complete,
    ) is expected

all_stale = {
    "collectionsAttempted": ["dkss_idw", "wam_dw"],
    "stacByCollection": {
        "dkss_idw": {"rejectedStaleRun": True},
        "wam_dw": {"rejectedStaleRun": True},
    },
}
assert producer.producer_terminal_code(
    strict_current_anchor_available=False,
    wave_bootstrap_requested=False,
    bootstrap_complete=False,
    productive=False,
    diagnostics=all_stale,
) == "DMI_CURRENT_LEDGER_INCOMPLETE"
assert producer.producer_terminal_code(
    strict_current_anchor_available=False,
    wave_bootstrap_requested=False,
    bootstrap_complete=False,
    productive=False,
    diagnostics={"collectionsAttempted": ["dkss_idw"], "stacByCollection": {}},
) == "DMI_CURRENT_LEDGER_INCOMPLETE"
assert producer.producer_terminal_code(
    strict_current_anchor_available=False,
    wave_bootstrap_requested=False,
    bootstrap_complete=False,
    productive=False,
    diagnostics={
        "collectionsAttempted": ["dkss_idw"],
        "stacByCollection": {
            "dkss_idw": {
                "catalogInventoryFailureCodes": ["UNPARSEABLE_STAC_ITEM"],
            },
        },
    },
) == "DMI_UNPARSEABLE_STAC_ITEM"
assert producer.producer_terminal_code(
    strict_current_anchor_available=False,
    wave_bootstrap_requested=False,
    bootstrap_complete=False,
    productive=False,
    diagnostics={
        "collectionsAttempted": ["dkss_idw"],
        "stacByCollection": {},
        "currentOperationalLedger": {
            "failureCodes": ["LOCALLY_SKIPPED_DKSS_ASSET"],
        },
    },
) == "DMI_LOCALLY_SKIPPED_DKSS_ASSET"
assert producer.producer_terminal_code(
    strict_current_anchor_available=False,
    wave_bootstrap_requested=False,
    bootstrap_complete=False,
    productive=False,
    diagnostics={
        "collectionsAttempted": ["dkss_idw"],
        "stacByCollection": {"dkss_idw": {"prefetchFailed": True}},
    },
) == "DMI_DKSS_PREFETCH_FAILED"
assert producer.producer_terminal_code(
    strict_current_anchor_available=True,
    wave_bootstrap_requested=True,
    bootstrap_complete=False,
    productive=True,
    diagnostics={},
) == "DMI_WAVE_BOOTSTRAP_INCOMPLETE"
assert producer.producer_terminal_code(
    strict_current_anchor_available=True,
    wave_bootstrap_requested=False,
    bootstrap_complete=False,
    productive=False,
    diagnostics={},
) == "DMI_READY"
assert producer.producer_terminal_code(
    strict_current_anchor_available=True,
    wave_bootstrap_requested=False,
    bootstrap_complete=False,
    productive=True,
    diagnostics={},
) == "DMI_READY"

# One strict DKSS pair plus productive HARMONIE is not an official-current
# ledger and must never become DMI_READY.
assert producer.producer_terminal_code(
    strict_current_anchor_available=False,
    wave_bootstrap_requested=False,
    bootstrap_complete=False,
    productive=True,
    diagnostics={
        "collectionsAttempted": ["dkss_idw", "harmonie_dini_sf"],
        "collectionsSucceeded": ["harmonie_dini_sf"],
        "stacByCollection": {},
    },
) == "DMI_CURRENT_LEDGER_INCOMPLETE"

assert producer.diagnostic_collection_failure_codes({
    "errors": [
        {"collection": "harmonie_dini_sf", "failureCode": "PARSER_TYPE_ERROR"},
        {"collection": "dkss_lf", "failureCode": "BATCHED_SCALAR_LOOKUP_FAILED"},
        {"collection": "dkss_idw", "failureCode": "BATCHED_VECTOR_LOOKUP_FAILED"},
        {"collection": "dkss_idw", "failureCode": "BATCHED_VECTOR_LOOKUP_FAILED"},
        {"collection": "dkss_idw", "failureCode": "unsafe payload"},
    ],
}) == ["BATCHED_SCALAR_LOOKUP_FAILED", "BATCHED_VECTOR_LOOKUP_FAILED"]

original_github_output = os.environ.get("GITHUB_OUTPUT")
try:
    with tempfile.TemporaryDirectory() as output_dir:
        output_path = Path(output_dir) / "github-output.txt"
        os.environ["GITHUB_OUTPUT"] = str(output_path)
        producer.write_github_outputs(
            "failed",
            terminal_code="DMI_READY\nUNSAFE",
            collection_failure_codes=[
                "BATCHED_VECTOR_LOOKUP_FAILED",
                "unsafe payload",
                "BATCHED_SCALAR_LOOKUP_FAILED",
                "BATCHED_VECTOR_LOOKUP_FAILED",
            ],
        )
        output_lines = output_path.read_text(encoding="utf-8").splitlines()
        assert "terminal_code=DMI_UNCLASSIFIED" in output_lines
        assert (
            "collection_failure_codes="
            "BATCHED_SCALAR_LOOKUP_FAILED,BATCHED_VECTOR_LOOKUP_FAILED"
        ) in output_lines
        output_path.unlink()
        producer.write_github_outputs("failed", collection_failure_codes=[])
        assert "collection_failure_codes=NONE" in output_path.read_text(
            encoding="utf-8"
        ).splitlines()
finally:
    if original_github_output is None:
        os.environ.pop("GITHUB_OUTPUT", None)
    else:
        os.environ["GITHUB_OUTPUT"] = original_github_output

# A fully processed official asset axis with only one surviving DKSS pair is a
# systemic collapse, not 117 legitimate Copernicus target hours.
required_hours = producer.operational_current_valid_times(reference)
ledger_document = json.loads(json.dumps(document))
ledger_document["runs"] = {}
ledger_document["zoneRegistrySignature"] = "test-registry"
official_catalogs = {}


def ledger_asset(collection: str, hour: str) -> tuple[dict, dict]:
    exact_fixture_source = collection == "dkss_lf" and hour == valid_time
    official = {
        "collection": collection,
        "modelRun": "2026-01-01T00:00:00Z",
        "validTime": hour,
        "itemId": "exact-stac-item" if exact_fixture_source else f"item-{collection}-{hour}",
        "assetIdentitySha256": "b" * 64 if exact_fixture_source else "c" * 64,
        "assetSizeBytes": 1024,
        "itemCreatedAt": "2026-01-01T01:00:00Z",
        "itemUpdatedAt": None,
    }
    return official, {
        **official,
        "acquiredAt": "2026-01-01T02:00:00Z",
        "contentLengthBytes": 1024,
        "contentSha256": "d" * 64,
    }


for collection in sorted(producer.MARINE_COLLECTIONS):
    processing_signature = producer.current_marine_processing_signature(
        "test-registry"
    )
    official_assets = []
    processed_steps = {
        hour: {
            "complete": True,
            "recognizedParameters": [
                "sea-mean-deviation",
                "current-u",
                "current-v",
            ],
            "zonesTouched": 1,
            "parserVersion": producer.PARSER_VERSION,
            "processingSignature": processing_signature,
            "sourceAsset": ledger_asset(collection, hour)[1],
        }
        for hour in required_hours
    }
    for step in processed_steps.values():
        step["currentPartOutcomeProof"] = producer.build_current_part_outcome_proof(
            (
                []
                if collection == "dkss_lf"
                and step["sourceAsset"]["validTime"] == valid_time
                else [target["partId"]]
            ),
            [target["partId"]],
            producer.target_fingerprint(targets),
            processing_signature,
            step["sourceAsset"],
        )
    official_assets = [ledger_asset(collection, hour)[0] for hour in required_hours]
    ledger_document["runs"][collection] = {
        "referenceTime": "2026-01-01T00:00:00Z",
        "parserVersion": producer.PARSER_VERSION,
        "parameterMapVersion": producer.PARAMETER_MAP_VERSION,
        "gridLookupVersion": producer.GRID_LOOKUP_VERSION,
        "processingSignature": processing_signature,
        "processedSteps": processed_steps,
    }
    official_catalogs[collection] = (
        "2026-01-01T00:00:00Z",
        official_assets,
        {
            "catalogInventoryComplete": True,
            "requiredHorizonEndCovered": True,
            "requiredRowsTruncatedByAssetLimit": 0,
            "officialRequiredValidTimeCount": len(required_hours),
            "officialRequiredValidTimes": required_hours,
            "officialRequiredAssets": official_assets,
        },
    )
collapsed_ledger = producer.build_current_operational_ledger(
    ledger_document,
    targets,
    reference,
    official_catalogs,
)
assert collapsed_ledger["ready"] is False
assert "SYSTEMIC_CURRENT_TIME_COLLAPSE" in collapsed_ledger["failureCodes"]
assert collapsed_ledger["attestation"]["verifiedPairCount"] == 1
assert collapsed_ledger["operationalComplementPairCount"] == 117
ledger_document.setdefault("diagnostics", {})["currentOperationalLedger"] = collapsed_ledger
assert not producer.current_operational_cache_ready(
    ledger_document,
    targets,
    reference,
)
collapsed_allowed_assets = (
    producer.processed_source_assets_from_current_operational_ledger(
        collapsed_ledger
    )
)
collapsed_attestation = producer.current_operational_attestation(
    ledger_document,
    targets,
    reference,
    collapsed_allowed_assets,
)
validate_current_operational_availability_ledger(
    collapsed_ledger,
    collapsed_attestation,
    targets,
    reference,
    reference + timedelta(hours=117),
    producer.target_fingerprint(targets),
)
try:
    validate_current_operational_ledger(
        collapsed_ledger,
        collapsed_attestation,
        targets,
        reference,
        reference + timedelta(hours=117),
        producer.target_fingerprint(targets),
    )
except ValueError as error:
    assert "systemic official-time collapse" in str(error)
else:
    raise AssertionError("Partial availability must never satisfy strict DMI READY")

# Even internally self-consistent count/hash tampering cannot shrink the exact
# fallback complement derived from the per-collection outcome matrix.
tampered_collapsed_ledger = json.loads(json.dumps(collapsed_ledger))
tampered_collapsed_ledger["operationalComplementPairs"] = (
    tampered_collapsed_ledger["operationalComplementPairs"][:-1]
)
tampered_collapsed_ledger["operationalComplementPairCount"] = len(
    tampered_collapsed_ledger["operationalComplementPairs"]
)
tampered_collapsed_ledger["operationalComplementPairsSha256"] = (
    producer.part_time_pairs_sha256(
        tampered_collapsed_ledger["operationalComplementPairs"]
    )
)
try:
    validate_current_operational_availability_ledger(
        tampered_collapsed_ledger,
        collapsed_attestation,
        targets,
        reference,
        reference + timedelta(hours=117),
        producer.target_fingerprint(targets),
    )
except ValueError as error:
    assert "complement is not exact" in str(error)
else:
    raise AssertionError("A reduced partial-DMI complement must fail closed")

# Cache continuity is pair-exact. An older fully proven row remains usable in
# availability mode, while unrelated local failures still keep DMI non-READY.
continuity_signature = producer.current_marine_processing_signature(
    "test-registry"
)
continuity_catalogs = {}
continuity_runs = {}
for continuity_collection in sorted(producer.MARINE_COLLECTIONS):
    continuity_assets = [
        ledger_asset(continuity_collection, hour)[0]
        for hour in required_hours
    ]
    continuity_catalogs[continuity_collection] = (
        "2026-01-01T00:00:00Z",
        continuity_assets,
        {
            "catalogInventoryComplete": True,
            "requiredHorizonEndCovered": True,
            "requiredRowsTruncatedByAssetLimit": 0,
            "officialRequiredValidTimeCount": len(required_hours),
            "officialRequiredValidTimes": required_hours,
            "officialRequiredAssets": continuity_assets,
        },
    )
    continuity_runs[continuity_collection] = {
        "referenceTime": "2026-01-01T00:00:00Z",
        "parserVersion": producer.PARSER_VERSION,
        "parameterMapVersion": producer.PARAMETER_MAP_VERSION,
        "gridLookupVersion": producer.GRID_LOOKUP_VERSION,
        "processingSignature": continuity_signature,
        "processedSteps": {},
    }


def continuity_document(actual_source: dict) -> dict:
    return {
        "schemaVersion": 2,
        "generatedAt": valid_time,
        "zoneRegistrySignature": "test-registry",
        "zones": {
            "PART::TEST": {
                "samplingPoint": [2.0, 1.0],
                "parentZoneId": "ZONE-TEST",
                "entityType": "coastal-part",
                "samplingContext": "coastal-part-water-point",
                "hourly": {
                    valid_time: {
                        "time": valid_time,
                        "current-u": 0.1,
                        "current-v": -0.2,
                        "sources": {"current": actual_source},
                    },
                },
                "gridPoints": {},
                "collections": {},
            },
        },
        "runs": json.loads(json.dumps(continuity_runs)),
        "collectionState": {},
        "diagnostics": {},
    }


def retained_proof(actual_source: dict) -> dict:
    outcome = producer.build_current_part_outcome_proof(
        [],
        [target["partId"]],
        producer.target_fingerprint(targets),
        continuity_signature,
        actual_source,
    )
    return producer.build_retained_current_asset_proof(
        actual_source,
        continuity_signature,
        outcome,
        [target["partId"]],
        [target["partId"]],
        producer.target_fingerprint(targets),
    )


def assert_retained_availability(actual_source: dict) -> tuple[dict, dict]:
    continuity = continuity_document(actual_source)
    ledger = producer.build_current_operational_ledger(
        continuity,
        targets,
        reference,
        continuity_catalogs,
        [retained_proof(actual_source)],
    )
    allowed, retained = (
        producer.current_attestation_authorization_from_operational_ledger(
            ledger
        )
    )
    actual = producer.current_operational_attestation(
        continuity, targets, reference, allowed, retained,
    )
    validate_current_operational_availability_ledger(
        ledger,
        actual,
        targets,
        reference,
        reference + timedelta(hours=117),
        producer.target_fingerprint(targets),
    )
    assert ledger["ready"] is False
    assert "RETAINED_CURRENT_PART_TIME" in ledger["failureCodes"]
    assert ledger["attestation"]["verifiedPairCount"] == 1
    assert ledger["operationalComplementPairCount"] == 117
    try:
        validate_current_operational_ledger(
            ledger,
            actual,
            targets,
            reference,
            reference + timedelta(hours=117),
            producer.target_fingerprint(targets),
        )
    except ValueError:
        pass
    else:
        raise AssertionError("Unfinished local DMI work must remain non-READY")
    return continuity, ledger


older_retained_source = producer.native_component_source(
    "dkss_lf",
    "2025-12-31T18:00:00Z",
    valid_time,
    component="current",
    zone=zone,
    grid_candidate=candidate,
    capture=capture,
    spatial_selection="nearest-shared-grid-cell-no-spatial-interpolation",
    verticalLayer="depthBelowSea:1",
    verticalLayerRankM=1.0,
    vectorSelection=CURRENT_VECTOR_SELECTION,
    vectorSemanticsVersion=3,
)
assert older_retained_source is not None
older_continuity, older_ledger = assert_retained_availability(
    older_retained_source
)

# Cache-only continuation retains the actual incomplete ledger; it does not
# turn missing acquisition into official absence or READY.
cache_only_document = copy.deepcopy(older_continuity)
cache_only_saved_ledger = copy.deepcopy(older_ledger)
cache_only_document["diagnostics"]["currentOperationalLedger"] = copy.deepcopy(
    cache_only_saved_ledger
)
cache_only_original = copy.deepcopy(cache_only_document)
cache_only_actual = producer.revalidate_cache_only_current_ledger(
    cache_only_document, targets, reference, "test-registry",
    cache_only_saved_ledger,
)
assert cache_only_actual == cache_only_saved_ledger["attestation"]
assert cache_only_document == cache_only_original
assert cache_only_saved_ledger == older_ledger
assert cache_only_saved_ledger["ready"] is False
assert not producer.current_operational_cache_ready(
    cache_only_document, targets, reference,
)
cache_only_mismatch = copy.deepcopy(cache_only_document)
cache_only_mismatch["zones"]["PART::TEST"]["hourly"][valid_time][
    "sources"]["current"]["contentSha256"] = "e" * 64
cache_only_forged = copy.deepcopy(cache_only_document)
cache_only_forged_ledger = {**cache_only_saved_ledger, "ready": True, "failureCodes": []}
cache_only_forged["diagnostics"]["currentOperationalLedger"] = cache_only_forged_ledger
for cache_only_case_index, (bad_document, bad_targets, bad_reference, bad_signature, bad_ledger) in enumerate((
    (cache_only_document, targets, reference + timedelta(hours=1),
     "test-registry", cache_only_saved_ledger),
    (cache_only_document, targets, reference, "other-registry", cache_only_saved_ledger),
    (cache_only_document, [{**target, "waterPoint": [2.1, 1.0]}],
     reference, "test-registry", cache_only_saved_ledger),
    (cache_only_document, targets, reference, "test-registry", None),
    (cache_only_document, targets, reference, "test-registry",
     {**cache_only_saved_ledger, "ready": True, "failureCodes": []}),
    (cache_only_mismatch, targets, reference, "test-registry", cache_only_saved_ledger),
    (cache_only_forged, targets, reference, "test-registry", cache_only_forged_ledger),
)):
    before_bad_document = copy.deepcopy(bad_document)
    before_bad_ledger = copy.deepcopy(bad_ledger)
    try:
        producer.revalidate_cache_only_current_ledger(
            bad_document, bad_targets, bad_reference, bad_signature, bad_ledger,
        )
    except (TypeError, ValueError):
        pass
    else:
        raise AssertionError(f"Cache-only must retain exact ledger/source/reference gates: case {cache_only_case_index}")
    assert bad_document == before_bad_document
    assert bad_ledger == before_bad_ledger

# The same normal controller must refuse changed current evidence before write.
cache_only_writes = []
cache_only_writer = producer.write_checkpoint
try:
    producer.write_checkpoint = lambda *args: cache_only_writes.append(args)
    cache_only_controller = producer.ProgressCheckpointController(
        cache_only_mismatch, set(), {"bytes": 0}, None,
        lambda: producer.revalidate_cache_only_current_ledger(
            cache_only_mismatch, targets, reference, "test-registry",
            cache_only_saved_ledger,
        ),
    )
    cache_only_controller.bulk_dirty = True
    try:
        cache_only_controller.flush_if_due(force=True)
    except (TypeError, ValueError):
        pass
    else:
        raise AssertionError("Changed cached evidence must refuse the checkpoint")
    assert cache_only_controller.bulk_dirty
    assert cache_only_writes == []
finally:
    producer.write_checkpoint = cache_only_writer
assert cache_only_document == cache_only_original
assert older_ledger == cache_only_saved_ledger

# Both actual HTTP entrances refuse before query work, session calls or mkdir.
cache_only_network_state = (
    producer.CACHE_ONLY, producer.STAC_SESSION, producer.DOWNLOAD_SESSION, producer.RAW_DIR,
)
cache_only_network_calls = []
def forbidden_cache_only_http(*args, **kwargs):
    cache_only_network_calls.append((args, kwargs))
    raise AssertionError("cache-only reached HTTP")
class CacheOnlyForbiddenQuery:
    def __iter__(self):
        raise AssertionError("cache-only evaluated query before refusal")
try:
    producer.CACHE_ONLY = True
    producer.STAC_SESSION = types.SimpleNamespace(get=forbidden_cache_only_http)
    producer.DOWNLOAD_SESSION = types.SimpleNamespace(get=forbidden_cache_only_http)
    with tempfile.TemporaryDirectory(prefix="ravradar-cache-only-") as directory:
        producer.RAW_DIR = Path(directory) / "must-remain-absent"
        cache_only_download_budget = {"bytes": 0}
        for operation in (
            lambda: producer.request_json(
                "https://cache-only.invalid/metadata", CacheOnlyForbiddenQuery(),
            ),
            lambda: producer.download_asset(
                "https://cache-only.invalid/asset.grib", 1, cache_only_download_budget,
            ),
        ):
            try:
                operation()
            except RuntimeError as error:
                assert str(error) == "DMI_CACHE_ONLY_NETWORK_DISABLED"
            else:
                raise AssertionError("Cache-only HTTP entrance did not refuse")
            assert not producer.RAW_DIR.exists()
            assert list(Path(directory).iterdir()) == []
            assert cache_only_download_budget == {"bytes": 0}
            assert cache_only_network_calls == []
        # The default-false path still uses the ordinary metadata caller.
        producer.CACHE_ONLY = False
        cache_only_response = types.SimpleNamespace(
            raise_for_status=lambda: None, json=lambda: {"normal": True},
        )
        def synthetic_normal_metadata(*args, **kwargs):
            cache_only_network_calls.append((args, kwargs))
            return cache_only_response
        producer.STAC_SESSION = types.SimpleNamespace(get=synthetic_normal_metadata)
        assert producer.request_json(
            "https://cache-only.invalid/metadata", {"fixture": 1},
        ) == {"normal": True}
        assert cache_only_network_calls == [
            (("https://cache-only.invalid/metadata",),
             {"params": {"fixture": 1}, "timeout": producer.REQUEST_TIMEOUT}),
        ]
        assert not producer.RAW_DIR.exists()
finally:
    (producer.CACHE_ONLY, producer.STAC_SESSION,
     producer.DOWNLOAD_SESSION, producer.RAW_DIR) = cache_only_network_state


# Exercise the actual main entry, before any paths/logs/acquisition are touched.
cache_only_mode, cache_only_finalize = producer.CACHE_ONLY, producer.FINALIZE_ONLY
cache_only_inventory = producer.raw_cache_inventory
cache_only_bootstrap_keys = (
    "DMI_BULK_PRIVATE_WAVE_BOOTSTRAP_MODE",
    "DMI_BULK_PRIVATE_WAVE_BOOTSTRAP_TARGET_HOUR",
    "RAVRADAR_PRODUCTION_TARGET_HOUR",
)
cache_only_bootstrap_environment = {
    key: os.environ.get(key) for key in cache_only_bootstrap_keys
}
try:
    producer.CACHE_ONLY = True
    producer.FINALIZE_ONLY = True
    def forbidden_cache_only_inventory():
        raise AssertionError("conflicting mode entered main I/O")
    producer.raw_cache_inventory = forbidden_cache_only_inventory
    try:
        producer.main()
    except ValueError as error:
        assert str(error) == "DMI_CACHE_ONLY_FINALIZE_CONFLICT"
    else:
        raise AssertionError("Cache-only cannot become finalize-only")
    producer.FINALIZE_ONLY = False
    os.environ.update({
        "DMI_BULK_PRIVATE_WAVE_BOOTSTRAP_MODE": producer.WAVE_BOOTSTRAP_COLD_START_MODE,
        "DMI_BULK_PRIVATE_WAVE_BOOTSTRAP_TARGET_HOUR": valid_time,
        "RAVRADAR_PRODUCTION_TARGET_HOUR": valid_time,
    })
    try:
        producer.main()
    except ValueError as error:
        assert str(error) == "DMI_CACHE_ONLY_BOOTSTRAP_CONFLICT"
    else:
        raise AssertionError("Cache-only cannot bypass a required bootstrap")
finally:
    producer.CACHE_ONLY, producer.FINALIZE_ONLY = cache_only_mode, cache_only_finalize
    producer.raw_cache_inventory = cache_only_inventory
    for key, value in cache_only_bootstrap_environment.items():
        if value is None:
            os.environ.pop(key, None)
        else:
            os.environ[key] = value


# Execute the actual main terminal with a genuine incomplete ledger and the
# normal physical finalized writer. This is terminal proof, not native replay.
cache_only_terminal_tree = ast.parse(
    (ROOT / "scripts/update-dmi-bulk.py").read_text(encoding="utf-8")
)
cache_only_terminal_main = next(
    node for node in cache_only_terminal_tree.body
    if isinstance(node, ast.FunctionDef) and node.name == "main"
)
cache_only_terminal_start = next(
    index for index, node in enumerate(cache_only_terminal_main.body)
    if isinstance(node, ast.Assign)
    and any(isinstance(target_node, ast.Name) and target_node.id == "diag"
            for target_node in node.targets)
)
cache_only_terminal_main.name = "_cache_only_terminal"
cache_only_terminal_main.body = cache_only_terminal_main.body[cache_only_terminal_start:]
cache_only_terminal_paths = {
    name: getattr(producer, name) for name in (
        "OUTPUT_PATH", "PROMOTION_PATH", "RAW_DIR", "CACHE_AUDIT_PATH",
        "DIAGNOSTICS_JSON_PATH", "DIAGNOSTICS_TEXT_PATH",
    )
}
try:
    with tempfile.TemporaryDirectory(prefix="ravradar-cache-only-terminal-") as directory:
        owned = Path(directory)
        for name, filename in (
            ("OUTPUT_PATH", "candidate.json"), ("PROMOTION_PATH", "active.json"),
            ("RAW_DIR", "raw"), ("CACHE_AUDIT_PATH", "audit.json"),
            ("DIAGNOSTICS_JSON_PATH", "ocean.json"),
            ("DIAGNOSTICS_TEXT_PATH", "ocean.txt"),
        ):
            setattr(producer, name, owned / filename)
        producer.PROMOTION_PATH.write_bytes(b"owned active must remain unchanged")
        before_active = producer.PROMOTION_PATH.read_bytes()
        terminal_document = copy.deepcopy(cache_only_original)
        terminal_document["sourceUpdatedAt"] = valid_time
        terminal_document["diagnostics"].update({
            "collectionsSucceeded": [], "collectionsPartial": [],
            "collectionsAttempted": [], "zeroProgressCollections": [], "errors": [],
        })
        assert producer.revalidate_cache_only_current_ledger(
            terminal_document, targets, reference, "test-registry", cache_only_saved_ledger,
        ) == cache_only_saved_ledger["attestation"]
        terminal_events = []
        def observe_cache_only_terminal(*args, **kwargs):
            persisted = producer.load_bulk_document(producer.OUTPUT_PATH)
            assert persisted["refreshStatus"] == "partial"
            assert persisted["diagnostics"]["currentOperationalLedger"] == cache_only_saved_ledger
            assert persisted["sourceUpdatedAt"] == valid_time
            assert persisted["diagnostics"]["collectionsSucceeded"] == []
            assert producer.PROMOTION_PATH.read_bytes() == before_active
            terminal_events.append((args, kwargs))
        terminal_context = {
            **vars(producer), "CACHE_ONLY": True, "result": terminal_document,
            "strict_current_anchor_available": False,
            "wave_bootstrap_configuration": None, "bootstrap_operational_complete": False,
            "generated": "2026-01-01T04:00:00Z", "fresh_zone_ids": set(),
            "budget": {"bytes": 0}, "scheduled": [],
            "cache_before": producer.raw_cache_inventory(),
            "prune_raw_cache": forbidden_cache_only_http,
            "write_github_outputs": observe_cache_only_terminal,
            "write_step_summary": lambda *args: None, "print": lambda *args, **kwargs: None,
        }
        exec(compile(ast.Module(body=[cache_only_terminal_main], type_ignores=[]),
                     str(ROOT / "scripts/update-dmi-bulk.py"), "exec"), terminal_context)
        assert terminal_context["_cache_only_terminal"]() == 0
        assert len(terminal_events) == 1
        assert terminal_events[0][0][:3] == ("partial", 0, 0)
        assert terminal_events[0][1]["terminal_code"] == "DMI_CACHE_ONLY_PARTIAL"
        assert terminal_events[0][1]["strict_current_anchor_ready"] is False
        assert terminal_document["diagnostics"]["currentOperationalLedger"]["ready"] is False
        assert terminal_document["diagnostics"]["currentOperationalLedger"] == older_ledger
        assert producer.PROMOTION_PATH.read_bytes() == before_active
        before_saved = producer.OUTPUT_PATH.read_bytes()
        save_failure = OSError("owned finalized save failure")
        def fail_cache_only_finalized_save(*args):
            raise save_failure
        terminal_context["write_finalized_cache"] = fail_cache_only_finalized_save
        terminal_events.clear()
        try:
            terminal_context["_cache_only_terminal"]()
        except OSError as caught:
            assert caught is save_failure
        else:
            raise AssertionError("Failed finalized save became successful PARTIAL")
        assert terminal_events == []
        assert producer.OUTPUT_PATH.read_bytes() == before_saved
        assert producer.PROMOTION_PATH.read_bytes() == before_active
finally:
    for name, value in cache_only_terminal_paths.items():
        setattr(producer, name, value)
assert older_ledger == cache_only_saved_ledger


# Proof donors may aggregate one exact asset over different part subsets. The
# selector must union those candidate authorizations and then derive the final
# subset only from rows that are actually present in the merged document.
overlap_target = {
    "partId": "TEST-B",
    "parentZoneId": "ZONE-TEST",
    "name": "Test B",
    "waterPoint": [2.0, 1.0],
}
overlap_targets = [target, overlap_target]
overlap_target_ids = sorted(row["partId"] for row in overlap_targets)
overlap_zone = {
    **zone,
    "id": "PART::TEST-B",
}
overlap_source = producer.native_component_source(
    "dkss_lf",
    "2025-12-31T18:00:00Z",
    valid_time,
    component="current",
    zone=overlap_zone,
    grid_candidate=candidate,
    capture=capture,
    spatial_selection="nearest-shared-grid-cell-no-spatial-interpolation",
    verticalLayer="depthBelowSea:1",
    verticalLayerRankM=1.0,
    vectorSelection=CURRENT_VECTOR_SELECTION,
    vectorSemanticsVersion=3,
)
assert overlap_source is not None
assert producer.canonical_current_source_asset(overlap_source) == (
    producer.canonical_current_source_asset(older_retained_source)
)
overlap_registry_sha256 = producer.target_fingerprint(overlap_targets)
overlap_outcome = producer.build_current_part_outcome_proof(
    [],
    overlap_target_ids,
    overlap_registry_sha256,
    continuity_signature,
    older_retained_source,
)
overlap_proof_ab = producer.build_retained_current_asset_proof(
    older_retained_source,
    continuity_signature,
    overlap_outcome,
    overlap_target_ids,
    overlap_target_ids,
    overlap_registry_sha256,
)
overlap_proof_a = producer.build_retained_current_asset_proof(
    older_retained_source,
    continuity_signature,
    overlap_outcome,
    [target["partId"]],
    overlap_target_ids,
    overlap_registry_sha256,
)
overlap_document = continuity_document(older_retained_source)
overlap_document["zones"]["PART::TEST-B"] = {
    "samplingPoint": [2.0, 1.0],
    "parentZoneId": "ZONE-TEST",
    "entityType": "coastal-part",
    "samplingContext": "coastal-part-water-point",
    "hourly": {
        valid_time: {
            "time": valid_time,
            "current-u": 0.1,
            "current-v": -0.2,
            "sources": {"current": overlap_source},
        },
    },
    "gridPoints": {},
    "collections": {},
}
selected_overlap = producer._select_retained_current_asset_proofs_for_document(
    overlap_document,
    overlap_targets,
    reference,
    [overlap_proof_ab, overlap_proof_a],
)
assert len(selected_overlap) == 1
assert selected_overlap[0]["attestedPartIds"] == overlap_target_ids

overlap_subset_document = json.loads(json.dumps(overlap_document))
overlap_subset_document["zones"]["PART::TEST-B"]["hourly"] = {}
selected_overlap_subset = (
    producer._select_retained_current_asset_proofs_for_document(
        overlap_subset_document,
        overlap_targets,
        reference,
        [overlap_proof_ab, overlap_proof_a],
    )
)
assert len(selected_overlap_subset) == 1
assert selected_overlap_subset[0]["attestedPartIds"] == [target["partId"]]

# The audited ecCodes patch transition may yield two signature-bound proofs
# for the same immutable asset. They may be united only when their complete
# outcome semantics agree; the exact current signature wins the final proof.
overlap_zone_signature = "0123456789abcdef"
decoder_signature_480 = (
    f"parser:{producer.PARSER_VERSION}|params:{producer.PARAMETER_MAP_VERSION}"
    f"|grid:{producer.GRID_LOOKUP_VERSION}|eccodes-api:2.48.0"
    f"|eccodes-binding:2.48.0|zones:{overlap_zone_signature}"
)
decoder_signature_482 = decoder_signature_480.replace(
    "eccodes-api:2.48.0", "eccodes-api:2.48.2"
)
decoder_outcome_480 = producer.build_current_part_outcome_proof(
    [],
    overlap_target_ids,
    overlap_registry_sha256,
    decoder_signature_480,
    older_retained_source,
)
decoder_proof_480 = producer.build_retained_current_asset_proof(
    older_retained_source,
    decoder_signature_480,
    decoder_outcome_480,
    overlap_target_ids,
    overlap_target_ids,
    overlap_registry_sha256,
)
decoder_outcome_482 = producer.build_current_part_outcome_proof(
    [],
    overlap_target_ids,
    overlap_registry_sha256,
    decoder_signature_482,
    older_retained_source,
)
decoder_proof_482 = producer.build_retained_current_asset_proof(
    older_retained_source,
    decoder_signature_482,
    decoder_outcome_482,
    [target["partId"]],
    overlap_target_ids,
    overlap_registry_sha256,
)
selected_compatible_overlap = (
    producer._select_retained_current_asset_proofs_for_document(
        overlap_document,
        overlap_targets,
        reference,
        [decoder_proof_480, decoder_proof_482],
        decoder_signature_482,
    )
)
assert len(selected_compatible_overlap) == 1
assert selected_compatible_overlap[0]["attestedPartIds"] == overlap_target_ids
assert (
    selected_compatible_overlap[0]["processingSignature"]
    == decoder_signature_482
)

conflicting_overlap_signature = f"{continuity_signature}|conflict"
conflicting_overlap_outcome = producer.build_current_part_outcome_proof(
    [],
    overlap_target_ids,
    overlap_registry_sha256,
    conflicting_overlap_signature,
    older_retained_source,
)
conflicting_overlap_proof = producer.build_retained_current_asset_proof(
    older_retained_source,
    conflicting_overlap_signature,
    conflicting_overlap_outcome,
    [target["partId"]],
    overlap_target_ids,
    overlap_registry_sha256,
)
try:
    producer._select_retained_current_asset_proofs_for_document(
        overlap_document,
        overlap_targets,
        reference,
        [overlap_proof_ab, conflicting_overlap_proof],
    )
except ValueError as error:
    assert "Conflicting retained current asset proof" in str(error)
else:
    raise AssertionError("Conflicting retained asset evidence must fail closed")

# A newer candidate hour can already contain unrelated wave/wind fields while
# still lacking current. An unproved or half-vector donor cannot add anything;
# a proved donor adds U/V/source as one current tuple while preserving all other
# independently proven components. A proof-backed primary current tuple wins.
partial_primary = continuity_document(older_retained_source)
partial_hour = partial_primary["zones"]["PART::TEST"]["hourly"][valid_time]
partial_hour.pop("current-u")
partial_hour.pop("current-v")
partial_hour.pop("sources")
partial_hour.update({
    "wind-u-10m": 1.25,
    "wind-v-10m": -0.75,
    "significant-wave-height": 0.8,
    "sources": {"wave": {"fixture": "preserved-wave-source"}},
})
partial_zone = partial_primary["zones"]["PART::TEST"]
partial_zone["gridPoints"].update({
    "current-u": {"longitude": 2.0, "latitude": 1.0},
    "current-v": {"longitude": 2.5, "latitude": 1.0},
    "significant-wave-height": {"fixture": "preserved-wave-summary"},
})
partial_zone["collections"].update({
    "current-u": "dkss_idw",
    "current-v": "dkss_nsbs",
    "significant-wave-height": "wam_nsb",
})
donor_current = continuity_document(older_retained_source)
unproved_merge = json.loads(json.dumps(partial_primary))
producer.backfill_compatible_cache_data(unproved_merge, donor_current, [])
unproved_hour = unproved_merge["zones"]["PART::TEST"]["hourly"][valid_time]
assert "current-u" not in unproved_hour
assert "current-v" not in unproved_hour
half_vector_donor = json.loads(json.dumps(donor_current))
half_vector_donor["zones"]["PART::TEST"]["hourly"][valid_time].pop(
    "current-v"
)
half_vector_merge = json.loads(json.dumps(partial_primary))
producer.backfill_compatible_cache_data(
    half_vector_merge,
    half_vector_donor,
    [retained_proof(older_retained_source)],
)
half_vector_hour = half_vector_merge["zones"]["PART::TEST"]["hourly"][
    valid_time
]
assert "current-u" not in half_vector_hour
assert "current-v" not in half_vector_hour
proved_merge = json.loads(json.dumps(partial_primary))
producer.backfill_compatible_cache_data(
    proved_merge,
    donor_current,
    [retained_proof(older_retained_source)],
)
proved_hour = proved_merge["zones"]["PART::TEST"]["hourly"][valid_time]
assert proved_hour["wind-u-10m"] == partial_hour["wind-u-10m"]
assert proved_hour["wind-v-10m"] == partial_hour["wind-v-10m"]
assert proved_hour["significant-wave-height"] == partial_hour[
    "significant-wave-height"
]
assert proved_hour["sources"]["wave"] == partial_hour["sources"]["wave"]
assert proved_hour["current-u"] == donor_current["zones"]["PART::TEST"][
    "hourly"
][valid_time]["current-u"]
assert proved_hour["current-v"] == donor_current["zones"]["PART::TEST"][
    "hourly"
][valid_time]["current-v"]
assert producer.canonical_current_source_asset(
    proved_hour["sources"]["current"]
) == producer.canonical_current_source_asset(older_retained_source)
proved_zone = proved_merge["zones"]["PART::TEST"]
assert "current-u" not in proved_zone["gridPoints"]
assert "current-v" not in proved_zone["gridPoints"]
assert proved_zone["gridPoints"]["significant-wave-height"] == (
    partial_zone["gridPoints"]["significant-wave-height"]
)
assert "current-u" not in proved_zone["collections"]
assert "current-v" not in proved_zone["collections"]
assert proved_zone["collections"]["significant-wave-height"] == "wam_nsb"
assert producer.sanitize_vector_integrity(proved_zone) == []
assert "current-u" in proved_hour and "current-v" in proved_hour
complete_summary_primary = json.loads(json.dumps(partial_primary))
complete_summary_zone = complete_summary_primary["zones"]["PART::TEST"]
complete_summary_zone["gridPoints"]["current-v"] = copy.deepcopy(
    complete_summary_zone["gridPoints"]["current-u"]
)
complete_summary_zone["collections"]["current-v"] = (
    complete_summary_zone["collections"]["current-u"]
)
expected_primary_current_summary = {
    field: copy.deepcopy(complete_summary_zone["gridPoints"][field])
    for field in ("current-u", "current-v")
}
producer.backfill_compatible_cache_data(
    complete_summary_primary,
    donor_current,
    [retained_proof(older_retained_source)],
)
for field in ("current-u", "current-v"):
    assert complete_summary_zone["gridPoints"][field] == (
        expected_primary_current_summary[field]
    )
    assert complete_summary_zone["collections"][field] == "dkss_idw"
assert producer.sanitize_vector_integrity(complete_summary_zone) == []
assert "current-u" in complete_summary_zone["hourly"][valid_time]
assert "current-v" in complete_summary_zone["hourly"][valid_time]
proof_backed_primary = continuity_document(source)
producer.backfill_compatible_cache_data(
    proof_backed_primary,
    donor_current,
    [retained_proof(older_retained_source)],
    [retained_proof(source)],
)
assert producer.canonical_current_source_asset(
    proof_backed_primary["zones"]["PART::TEST"]["hourly"][valid_time][
        "sources"
    ]["current"]
) == producer.canonical_current_source_asset(source)

# Every independently native-proven component is reusable from a partially
# filled row. The complete tuple and source move together; a partial tuple is
# ignored, and an already valid primary tuple remains authoritative.
wind_source = producer.native_component_source(
    "harmonie_dini_sf",
    "2026-01-01T00:00:00Z",
    valid_time,
    component="wind",
    zone=zone,
    grid_candidate=candidate,
    capture=capture,
    spatial_selection="nearest-shared-grid-cell-no-spatial-interpolation",
    vectorSelection="nearest-shared-grid-cell-no-spatial-interpolation",
    vectorSemanticsVersion=2,
    vectorReference="earth-relative-east-north",
    vectorTransform="identity-earth-relative",
)
assert wind_source is not None
component_donor = continuity_document(source)
component_donor_zone = component_donor["zones"]["PART::TEST"]
component_donor_hour = component_donor_zone["hourly"][valid_time]
component_donor_hour.update({
    "wind-u-10m": 3.25,
    "wind-v-10m": -1.75,
})
component_donor_hour["sources"]["wind"] = wind_source
for field in ("wind-u-10m", "wind-v-10m"):
    component_donor_zone["gridPoints"][field] = {
        "longitude": 2.0,
        "latitude": 1.0,
    }
    component_donor_zone["collections"][field] = "harmonie_dini_sf"

component_primary = continuity_document(source)
component_primary_hour = component_primary["zones"]["PART::TEST"]["hourly"][
    valid_time
]
component_primary_hour["preserved-marker"] = "newer-primary"
producer.backfill_compatible_cache_data(
    component_primary,
    component_donor,
    [retained_proof(source)],
    [retained_proof(source)],
)
component_result = component_primary["zones"]["PART::TEST"]
component_result_hour = component_result["hourly"][valid_time]
assert component_result_hour["preserved-marker"] == "newer-primary"
assert component_result_hour["wind-u-10m"] == 3.25
assert component_result_hour["wind-v-10m"] == -1.75
assert component_result_hour["sources"]["wind"] == wind_source
assert producer.sanitize_component_provenance(
    "PART::TEST", component_result,
) == []
assert producer.sanitize_vector_integrity(component_result) == []

partial_component_donor = json.loads(json.dumps(component_donor))
partial_component_donor["zones"]["PART::TEST"]["hourly"][valid_time].pop(
    "wind-v-10m"
)
partial_component_primary = continuity_document(source)
producer.backfill_compatible_cache_data(
    partial_component_primary,
    partial_component_donor,
    [retained_proof(source)],
    [retained_proof(source)],
)
assert "wind-u-10m" not in partial_component_primary[
    "zones"
]["PART::TEST"]["hourly"][valid_time]

valid_component_primary = json.loads(json.dumps(component_donor))
valid_component_primary["zones"]["PART::TEST"]["hourly"][valid_time][
    "wind-u-10m"
] = 9.5
producer.backfill_compatible_cache_data(
    valid_component_primary,
    component_donor,
    [retained_proof(source)],
    [retained_proof(source)],
)
assert valid_component_primary["zones"]["PART::TEST"]["hourly"][valid_time][
    "wind-u-10m"
] == 9.5

# Same-run carry is safe only for the exact currently selected official asset.
same_run_continuity, same_run_ledger = assert_retained_availability(source)
revised_catalogs = json.loads(json.dumps(continuity_catalogs))
for asset_surface in (
    revised_catalogs["dkss_lf"][1],
    revised_catalogs["dkss_lf"][2]["officialRequiredAssets"],
):
    selected = next(row for row in asset_surface if row["validTime"] == valid_time)
    selected["itemId"] = "revised-official-item"
    selected["assetIdentitySha256"] = "e" * 64
revised_ledger = producer.build_current_operational_ledger(
    same_run_continuity,
    targets,
    reference,
    revised_catalogs,
    [retained_proof(source)],
)
assert revised_ledger["retainedCurrentAssetProofCount"] == 0
assert revised_ledger["attestation"]["verifiedPairCount"] == 0
assert revised_ledger["operationalComplementPairCount"] == 118

# An unscheduled collection cannot smuggle old parser/eccodes/zone semantics
# into a newly sealed checkpoint merely by keeping current version fields.
stale_signature_document = continuity_document(source)
stale_signature = "stale-processing-signature"
stale_source_asset = producer.canonical_current_source_asset(source)
assert stale_source_asset is not None
stale_signature_step = {
    "complete": True,
    "recognizedParameters": ["current-u", "current-v"],
    "zonesTouched": 1,
    "parserVersion": producer.PARSER_VERSION,
    "processingSignature": stale_signature,
    "sourceAsset": stale_source_asset,
}
stale_signature_step["currentPartOutcomeProof"] = (
    producer.build_current_part_outcome_proof(
        [],
        [target["partId"]],
        producer.target_fingerprint(targets),
        stale_signature,
        stale_source_asset,
    )
)
stale_signature_document["runs"]["dkss_lf"]["processingSignature"] = (
    stale_signature
)
stale_signature_document["runs"]["dkss_lf"]["processedSteps"] = {
    valid_time: stale_signature_step,
}
stale_signature_ledger = producer.build_current_operational_ledger(
    stale_signature_document,
    targets,
    reference,
    continuity_catalogs,
)
assert stale_signature_ledger["attestation"]["verifiedPairCount"] == 0
assert stale_signature_ledger["operationalComplementPairCount"] == 118
assert stale_signature_ledger["ready"] is False

# A donor ledger is proof-bearing only for its exact 118-hour window.
short_donor = json.loads(json.dumps(older_continuity))
short_donor.setdefault("diagnostics", {})["currentOperationalLedger"] = (
    json.loads(json.dumps(older_ledger))
)
short_donor["diagnostics"]["currentOperationalLedger"][
    "operationalRangeEndAt"
] = (reference + timedelta(hours=116)).isoformat().replace("+00:00", "Z")
assert producer._validated_candidate_retained_current_asset_proofs(
    short_donor,
    targets,
    reference,
    continuity_signature,
) == []

# Original regional source evidence must survive the new window independently
# of the native tuple filter, without granting any retained native identity.
regional_original = json.loads(json.dumps(older_continuity))
regional_original.setdefault("diagnostics", {})["currentOperationalLedger"] = (
    json.loads(json.dumps(older_ledger))
)
regional_before = json.loads(json.dumps(regional_original))
regional_candidates = []
producer._validated_candidate_retained_current_asset_proofs(
    regional_original, targets, reference + timedelta(hours=1), continuity_signature,
    regional_source_proof_candidates=regional_candidates,
)
assert regional_candidates
assert all(set(item) == {"sourceAsset", "processingSignature", "partOutcomeProof"}
           for item in regional_candidates)
assert all(item["sourceAsset"]["collection"] == "dkss_lf" for item in regional_candidates)
assert any(item["sourceAsset"]["validTime"] == valid_time for item in regional_candidates)
assert regional_original == regional_before
invalid_regional_candidates = []
assert producer._validated_candidate_retained_current_asset_proofs(
    short_donor, targets, reference, continuity_signature,
    regional_source_proof_candidates=invalid_regional_candidates,
) == []
assert invalid_regional_candidates == []

# Native metadata sanitation may remove the final tuple without invalidating
# its independently authenticated original asset outcome for regional samples.
regional_last_native_invalid = copy.deepcopy(regional_original)
regional_last_native_invalid["zones"]["PART::TEST"]["hourly"][valid_time]["sources"]["current"]["gridPoint"] = "invalid"
regional_sanitized_candidates = []
regional_sanitized_native = producer._validated_candidate_retained_current_asset_proofs(
    regional_last_native_invalid, targets, reference, continuity_signature,
    regional_source_proof_candidates=regional_sanitized_candidates,
)
assert regional_sanitized_native == [], "Invalid native metadata must not gain native admission"
assert any(row["sourceAsset"] == producer.canonical_current_source_asset(older_retained_source)
           for row in regional_sanitized_candidates), (
    "Full original validation must preserve regional outcome before last native tuple pruning"
)
regional_bad_original = copy.deepcopy(regional_last_native_invalid)
regional_bad_original["diagnostics"]["currentOperationalLedger"]["retainedCurrentAssetProofs"][0]["partOutcomeProof"]["targetCount"] = 999
regional_bad_candidates = []
try:
    producer._validated_candidate_retained_current_asset_proofs(
        regional_bad_original, targets, reference, continuity_signature,
        regional_source_proof_candidates=regional_bad_candidates,
    )
except (TypeError, ValueError):
    pass
assert regional_bad_candidates == [], "Invalid original outcome cannot escape through regional recovery"

# The extraction helper preserves distinct canonical decoder/outcome originals
# for later conflict checks; unlike native selection it must not flatten them.
regional_duplicate_sources = producer._regional_sources_from_validated_ledger({
    "collections": [{"processingSignature": decoder_signature_480, "validTimes": [{
        "state": "PROCESSED", "sourceAsset": decoder_proof_480["sourceAsset"],
        "partOutcomeProof": decoder_proof_480["partOutcomeProof"],
    }]}],
    "retainedCurrentAssetProofs": [decoder_proof_482],
}, decoder_signature_482)
assert len(regional_duplicate_sources) == 2
assert {row["processingSignature"] for row in regional_duplicate_sources} == {
    decoder_signature_480, decoder_signature_482,
}
assert all("attestedPartIds" not in row for row in regional_duplicate_sources)

# Every persisted progress checkpoint is sealed with an availability-valid
# ledger before its atomic write; restart recovers the exact retained row.
with tempfile.TemporaryDirectory() as continuity_directory:
    continuity_output = Path(continuity_directory) / "checkpoint.json"
    continuity_fallback = Path(continuity_directory) / "missing.json"
    progress_document = continuity_document(older_retained_source)

    def seal_continuity_checkpoint() -> None:
        sealed = producer.build_current_operational_ledger(
            progress_document,
            targets,
            reference,
            continuity_catalogs,
            [retained_proof(older_retained_source)],
        )
        allowed, retained = (
            producer.current_attestation_authorization_from_operational_ledger(
                sealed
            )
        )
        sealed_actual = producer.current_operational_attestation(
            progress_document, targets, reference, allowed, retained,
        )
        validate_current_operational_availability_ledger(
            sealed,
            sealed_actual,
            targets,
            reference,
            reference + timedelta(hours=117),
            producer.target_fingerprint(targets),
        )
        progress_document["diagnostics"]["currentOperationalLedger"] = sealed
        progress_document["diagnostics"]["currentOperationalAttestation"] = (
            sealed["attestation"]
        )

    original_output = producer.OUTPUT_PATH
    original_fallback = producer.DEPLOYED_FALLBACK_PATH
    producer.OUTPUT_PATH = continuity_output
    producer.DEPLOYED_FALLBACK_PATH = continuity_fallback
    try:
        controller = producer.ProgressCheckpointController(
            progress_document,
            set(),
            {"bytes": 0},
            prepare_bulk_checkpoint=seal_continuity_checkpoint,
        )
        controller.mark_bulk_dirty()
        assert controller.flush_if_due(force=True)
        persisted = producer.load_bulk_document(continuity_output)
        assert persisted["diagnostics"]["currentOperationalLedger"][
            "attestation"
        ]["verifiedPairCount"] == 1
        recovered_proofs = []
        producer.load_previous(
            "test-registry",
            coastal_part_targets=targets,
            production_reference=reference,
            retained_current_asset_proofs=recovered_proofs,
        )
        assert sum(
            proof["attestedPartCount"] for proof in recovered_proofs
        ) == 1
    finally:
        producer.OUTPUT_PATH = original_output
        producer.DEPLOYED_FALLBACK_PATH = original_fallback

# The full 673 x 118 matrix has no hidden threshold or truncation.
matrix_part_ids = [f"P{index:03d}" for index in range(673)]
full_inverse = producer.exact_current_operational_complement(
    matrix_part_ids, required_hours, [],
)
assert len(full_inverse) == 79_414
assert len({(row["partId"], row["validTime"]) for row in full_inverse}) == 79_414
assert producer.exact_current_operational_complement(
    matrix_part_ids, required_hours, full_inverse,
) == []

# Exact-official same-run rows count as covered refresh work. A revised STAC
# identity is untrusted and cannot rank ahead of real internal/tail gaps.
exact_same_run_official = next(
    row for row in continuity_catalogs["dkss_lf"][1]
    if row["validTime"] == valid_time
)
same_run_sources, same_run_pairs = (
    producer.current_pair_evidence_from_retained_proofs(
        [retained_proof(source)],
        {"dkss_lf": "2026-01-01T00:00:00Z"},
        {"dkss_lf": {valid_time: exact_same_run_official}},
    )
)
assert len(same_run_sources) == 1
assert same_run_pairs == {(target["partId"], valid_time)}
revised_official = {
    **exact_same_run_official,
    "itemId": "revised-official-item",
    "assetIdentitySha256": "e" * 64,
}
assert producer.current_pair_evidence_from_retained_proofs(
    [retained_proof(source)],
    {"dkss_lf": "2026-01-01T00:00:00Z"},
    {"dkss_lf": {valid_time: revised_official}},
) == (set(), set())

priority_assets = [
    {"valid": required_hours[index], "id": f"asset-{index}"}
    for index in (0, 10, 117)
]
priority_covered = {
    (part_id, required_hours[0]) for part_id in ("A", "B")
} | {("A", required_hours[10])}
ordered_priority_assets = producer.prioritize_marine_assets_for_current_gaps(
    priority_assets,
    ["A", "B"],
    priority_covered,
)
assert [row["valid"] for row in ordered_priority_assets] == [
    required_hours[10],
    required_hours[117],
    required_hours[0],
]

untrusted_existing_point = {
    "hourly": {
        valid_time: {
            "current-u": 0.1,
            "current-v": -0.2,
            "sources": {"current": source},
        },
    },
}
assert producer.prefer_current_hour_candidate(
    untrusted_existing_point,
    valid_time,
    "dkss_lf",
    "2026-01-01T00:00:00Z",
    {
        "distanceKm": 1.0,
        "pointKey": (1.0, 2.01),
        "layerRank": 1.0,
    },
    capture,
    False,
)

# A checkpoint is reusable only with the current parser/signature and the exact
# selected official asset capture. Unsigned legacy rows are always reprocessed.
reuse_hour = required_hours[0]
reuse_official, reuse_source = ledger_asset("dkss_idw", reuse_hour)
reuse_signature = "test-reuse-signature"
signed_step = {
    "complete": True,
    "recognizedParameters": ["current-u", "current-v"],
    "zonesTouched": 1,
    "parserVersion": producer.PARSER_VERSION,
    "processingSignature": reuse_signature,
    "sourceAsset": reuse_source,
}
signed_step["currentPartOutcomeProof"] = producer.build_current_part_outcome_proof(
    [],
    [target["partId"]],
    producer.target_fingerprint(targets),
    reuse_signature,
    reuse_source,
)
reuse_run = {
    "referenceTime": "2026-01-01T00:00:00Z",
    "processingSignature": reuse_signature,
    "processedSteps": {reuse_hour: signed_step},
}
reuse_args = {
    "collection": "dkss_idw",
    "same_processing": True,
    "same_run": True,
    "strict_current_anchor_available": True,
    "required_valid_times": {reuse_hour},
    "required_asset_provenance": {reuse_hour: reuse_official},
    "current_target_ids": [target["partId"]],
    "current_target_registry_sha256": producer.target_fingerprint(targets),
    "actual_pair_source_keys": {(
        target["partId"],
        reuse_hour,
        json.dumps(
            reuse_source,
            sort_keys=True,
            separators=(",", ":"),
            ensure_ascii=False,
        ),
    )},
    "covered_pair_keys": set(),
}
assert producer.reusable_processed_steps(reuse_run, **reuse_args) == {
    reuse_hour: signed_step,
}
# DMI's STAC schema may omit a declared byte size. The exact local capture still
# binds content length/digest, acquisition and the complete item revision, so the
# signed checkpoint remains reusable without inventing a size claim.
size_less_official = {**reuse_official, "assetSizeBytes": None}
size_less_source = {**reuse_source, "assetSizeBytes": None}
size_less_step = {**signed_step, "sourceAsset": size_less_source}
size_less_step["currentPartOutcomeProof"] = producer.build_current_part_outcome_proof(
    [],
    [target["partId"]],
    producer.target_fingerprint(targets),
    reuse_signature,
    size_less_source,
)
size_less_run = {
    **reuse_run,
    "processedSteps": {reuse_hour: size_less_step},
}
size_less_args = {
    **reuse_args,
    "required_asset_provenance": {reuse_hour: size_less_official},
    "actual_pair_source_keys": {(
        target["partId"],
        reuse_hour,
        json.dumps(
            size_less_source,
            sort_keys=True,
            separators=(",", ":"),
            ensure_ascii=False,
        ),
    )},
}
assert producer.reusable_processed_steps(size_less_run, **size_less_args) == {
    reuse_hour: size_less_step,
}
outcome_overclaim_args = {**reuse_args, "actual_pair_source_keys": set()}
assert producer.reusable_processed_steps(
    reuse_run, **outcome_overclaim_args
) == {}
unsigned_run = json.loads(json.dumps(reuse_run))
unsigned_run["processedSteps"][reuse_hour].pop("processingSignature")
assert producer.reusable_processed_steps(unsigned_run, **reuse_args) == {}
signalless_source_run = json.loads(json.dumps(reuse_run))
signalless_source_run["processedSteps"][reuse_hour].pop("sourceAsset")
assert producer.reusable_processed_steps(signalless_source_run, **reuse_args) == {}
tampered_outcome_run = json.loads(json.dumps(reuse_run))
tampered_outcome_run["processedSteps"][reuse_hour]["currentPartOutcomeProof"][
    "outcomesSha256"
] = "sha256:" + "0" * 64
assert producer.reusable_processed_steps(tampered_outcome_run, **reuse_args) == {}

# Exact native current hours remain complete while optional marine fields retain
# the established non-ledger stride. Progress checkpoints are bounded by both
# work count and wall time and can always be forced at a safe boundary.
filter_run = "2026-01-01T00:00:00Z"
filter_non_stride = "2026-01-01T07:00:00Z"
filter_stride = "2026-01-01T09:00:00Z"
filter_required = {filter_non_stride, filter_stride}
assert producer.operational_asset_parameter_filter(
    "dkss_lf", filter_non_stride, filter_run, filter_required
) == set(producer.REQUIRED_TARGETS["marine"])
assert producer.operational_asset_parameter_filter(
    "dkss_lf", filter_stride, filter_run, filter_required
) is None
assert producer.operational_asset_parameter_filter(
    "dkss_lf", "2026-01-01T08:00:00Z", filter_run, filter_required
) is None
assert producer.operational_asset_parameter_filter(
    "wam_dw", filter_non_stride, filter_run, filter_required
) is None

checkpoint_at = 100.0
assert not producer.progress_checkpoint_due(0, checkpoint_at, force=True)
assert not producer.progress_checkpoint_due(
    producer.CHECKPOINT_MAX_ASSETS - 1,
    checkpoint_at,
    now_monotonic=checkpoint_at + producer.CHECKPOINT_MAX_SECONDS - 1,
)
assert producer.progress_checkpoint_due(
    producer.CHECKPOINT_MAX_ASSETS,
    checkpoint_at,
    now_monotonic=checkpoint_at,
)
assert producer.progress_checkpoint_due(
    1,
    checkpoint_at,
    now_monotonic=checkpoint_at + producer.CHECKPOINT_MAX_SECONDS,
)
assert producer.progress_checkpoint_due(
    1,
    checkpoint_at,
    force=True,
    now_monotonic=checkpoint_at,
)

# One low-level SAME_GRID context must return the exact same canonical marine
# candidate union as the legacy high-level helper using the unchanged probes.
original_low_new = producer.codes_grib_nearest_new
original_low_find = producer.codes_grib_nearest_find
original_low_delete = producer.codes_grib_nearest_delete
original_same_grid_flag = producer.CODES_GRIB_NEAREST_SAME_GRID
original_high_find = producer.codes_grib_find_nearest
try:
    signature = ("synthetic-grid",)
    low_new_calls = []
    low_find_flags = []
    low_delete_calls = []

    def deterministic_four(_gid, latitude, longitude, *args, **kwargs):
        del args, kwargs
        base = abs(
            int(round((float(latitude) + 90.0) * 1_000_000)) * 1_000_003
            + int(round((float(longitude) + 180.0) * 1_000_000))
        )
        return [
            {
                "index": base + offset,
                "lat": float(latitude) + offset * 0.00001,
                "lon": float(longitude) - offset * 0.00001,
            }
            for offset in range(4)
        ]

    producer.GRID_INDEX_CACHE.clear()
    producer.codes_grib_find_nearest = deterministic_four
    legacy_candidates = producer.nearest_candidates(
        996,
        "dkss_lf",
        zone,
        signature=signature,
    )

    producer.GRID_INDEX_CACHE.clear()
    producer.CODES_GRIB_NEAREST_SAME_GRID = 1
    producer.codes_grib_nearest_new = lambda gid: low_new_calls.append(gid) or 4242

    def low_find(nearest_id, gid, latitude, longitude, flags, is_lsm, npoints):
        assert nearest_id == 4242 and is_lsm is False and npoints == 4
        low_find_flags.append(flags)
        return deterministic_four(gid, latitude, longitude)

    producer.codes_grib_nearest_find = low_find
    producer.codes_grib_nearest_delete = lambda nearest_id: low_delete_calls.append(nearest_id)
    producer.warm_marine_grid_cache(996, "dkss_lf", [zone], signature)
    warmed_candidates = producer.nearest_candidates(
        996,
        "dkss_lf",
        zone,
        signature=signature,
    )
    assert warmed_candidates == legacy_candidates
    assert low_new_calls == [996]
    assert low_delete_calls == [4242]
    assert low_find_flags[0] == 0
    assert set(low_find_flags[1:]) == {producer.CODES_GRIB_NEAREST_SAME_GRID}
    completed_find_count = len(low_find_flags)
    producer.warm_marine_grid_cache(996, "dkss_lf", [zone], signature)
    assert len(low_find_flags) == completed_find_count
    assert low_new_calls == [996]

    # A rejected first probe must not enable SAME_GRID before ecCodes has
    # successfully initialized the reusable nearest geometry.
    producer.GRID_INDEX_CACHE.clear()
    low_find_flags.clear()
    low_delete_calls.clear()
    first_boundary = [True]

    def boundary_low_find(nearest_id, gid, latitude, longitude, flags, is_lsm, npoints):
        assert nearest_id == 4242 and is_lsm is False and npoints == 4
        low_find_flags.append(flags)
        if first_boundary[0]:
            first_boundary[0] = False
            raise producer.OutOfAreaError("synthetic first probe outside grid")
        return deterministic_four(gid, latitude, longitude)

    producer.codes_grib_nearest_find = boundary_low_find
    producer.warm_marine_grid_cache(996, "dkss_lf", [zone], signature)
    assert low_find_flags[:2] == [0, 0]
    assert set(low_find_flags[2:]) == {producer.CODES_GRIB_NEAREST_SAME_GRID}
    assert low_delete_calls == [4242]

    # A low-level failure is fail-closed, deletes the nearest object and leaves
    # no partially warmed candidate map behind.
    producer.GRID_INDEX_CACHE.clear()
    low_delete_calls.clear()

    def fail_low_find(*_args, **_kwargs):
        raise RuntimeError("synthetic low-level nearest failure")

    producer.codes_grib_nearest_find = fail_low_find
    try:
        producer.warm_marine_grid_cache(997, "dkss_lf", [zone], signature)
    except producer.DmiGridLookupError as exc:
        assert exc.failure_code == "NEAREST_GRID_LOOKUP_FAILED"
    else:
        raise AssertionError("Low-level nearest failure must fail closed")
    assert low_delete_calls == [4242]
    assert producer.GRID_INDEX_CACHE == {}
finally:
    producer.codes_grib_nearest_new = original_low_new
    producer.codes_grib_nearest_find = original_low_find
    producer.codes_grib_nearest_delete = original_low_delete
    producer.CODES_GRIB_NEAREST_SAME_GRID = original_same_grid_flag
    producer.codes_grib_find_nearest = original_high_find
    producer.GRID_INDEX_CACHE.clear()

# ecCodes/grid failures are local processing failures. They must propagate and
# must never be cached or reclassified as a terminal spatial DMI gap.
original_find_nearest = producer.codes_grib_find_nearest
original_codes_get = producer.codes_get
original_get_elements = producer.codes_get_elements
original_nearest_candidates = producer.nearest_candidates
original_nearest_for_message = producer._nearest_candidates_for_message
original_metadata_classify = producer.classify_parameter
try:
    producer.GRID_INDEX_CACHE.clear()

    def fail_nearest(*_args, **_kwargs):
        raise RuntimeError("synthetic grid failure")

    producer.codes_get = fail_nearest
    try:
        producer.grid_signature(990)
    except producer.DmiGridLookupError as exc:
        assert exc.failure_code == "GRID_IDENTITY_READ_FAILED"
    else:
        raise AssertionError("Unreadable grid identity must fail closed")
    producer.codes_get = original_codes_get

    producer.codes_grib_find_nearest = fail_nearest
    try:
        producer.nearest_candidates(991, "dkss_idw", zone)
    except producer.DmiGridLookupError as exc:
        assert exc.failure_code == "NEAREST_GRID_LOOKUP_FAILED"
    else:
        raise AssertionError("Nearest-grid exception must fail closed")
    assert producer.GRID_INDEX_CACHE == {}

    # A bounded-grid result is not a decoder failure. Skip an out-of-area probe
    # while the remaining redundant probes still return actual grid candidates.
    probe_calls = [0]

    def boundary_then_candidate(_gid, lat, lon, *args, **kwargs):
        del args, kwargs
        probe_calls[0] += 1
        if probe_calls[0] == 1:
            raise producer.OutOfAreaError("synthetic grid boundary")
        return [{"index": 17, "lat": lat, "lon": lon}]

    producer.GRID_INDEX_CACHE.clear()
    producer.codes_grib_find_nearest = boundary_then_candidate
    boundary_candidates = producer.nearest_candidates(993, "dkss_idw", zone)
    assert boundary_candidates
    assert boundary_candidates[0]["index"] == 17
    completed_probe_calls = probe_calls[0]
    assert producer.nearest_candidates(993, "dkss_idw", zone) == boundary_candidates
    assert probe_calls[0] == completed_probe_calls

    # A complete set of explicit out-of-area results is an attested spatial
    # outcome, not an unknown local processing error.
    def outside_grid(*_args, **_kwargs):
        raise producer.OutOfAreaError("synthetic grid boundary")

    producer.GRID_INDEX_CACHE.clear()
    producer.codes_grib_find_nearest = outside_grid
    assert producer.nearest_candidates(994, "dkss_idw", zone) == []
    producer.GRID_INDEX_CACHE.clear()
    try:
        producer.nearest_candidates(995, "wam_dw", zone)
    except producer.DmiGridLookupError as exc:
        assert exc.failure_code == "NEAREST_GRID_OUT_OF_AREA"
    else:
        raise AssertionError("Non-DKSS out-of-area lookup must remain fail-closed")

    producer._nearest_candidates_for_message = lambda *_args, **_kwargs: [{
        "index": 7,
        "latitude": 1.0,
        "longitude": 2.0,
        "distanceKm": 0.0,
    }]
    batch_nearest_for_message = producer._nearest_candidates_for_message

    class NumpyArrayLike:
        """Exercise the documented ecCodes ndarray protocol without NumPy."""

        __module__ = "numpy"
        ndim = 1

        def __init__(self, values):
            self.values = list(values)

        def __iter__(self):
            return iter(self.values)

        def tolist(self):
            return list(self.values)

    producer.codes_get_elements = lambda *_args, **_kwargs: [0.25]
    assert producer.batched_element_values(992, [7], "vector") == [0.25]

    producer.codes_get_elements = lambda *_args, **_kwargs: NumpyArrayLike([0.25])
    vector_rows = producer.valid_candidates_batch(992, "dkss_idw", [zone])
    scalar_rows = producer.nearest_valid_batch(992, "dkss_idw", [zone])
    assert vector_rows[zone["id"]][0]["value"] == 0.25
    assert scalar_rows[zone["id"]]["value"] == 0.25

    # Grid identity and its digest are message-local work. Adding more zones
    # must not multiply ecCodes metadata calls before a cache hit can be read.
    metadata_calls = []
    field_metadata_calls = []
    reading_field_metadata = [False]

    def counting_classify(gid, collection):
        reading_field_metadata[0] = True
        try:
            return original_metadata_classify(gid, collection)
        finally:
            reading_field_metadata[0] = False

    def counting_codes_get(_gid, key):
        (field_metadata_calls if reading_field_metadata[0] else metadata_calls).append(key)
        return 9999.0 if key == "missingValue" else f"grid-{key}"

    second_zone = {**zone, "id": "PART::TEST-2"}
    producer.codes_get = counting_codes_get
    producer.classify_parameter = counting_classify
    producer.codes_get_elements = lambda *_args, **_kwargs: [0.25]
    counted_rows = producer.valid_candidates_batch(
        998,
        "dkss_idw",
        [zone, second_zone],
    )
    assert set(counted_rows) == {zone["id"], second_zone["id"]}
    assert metadata_calls.count("md5GridSection") == 1
    assert metadata_calls.count("missingValue") == 1
    assert len(metadata_calls) == 12
    assert field_metadata_calls == [key for key in producer._FIELD_SIGNATURE_KEYS
                                    if key not in producer._FIELD_STATISTIC_KEYS]
    legacy_definition_signature = tuple(
        f"grid-{key}" for key in producer.GRID_DEFINITION_KEYS
    )
    assert counted_rows[zone["id"]][0]["gridDefinitionSha256"] == (
        producer.grid_definition_sha256_from_signature(
            legacy_definition_signature
        )
    )
    assert counted_rows[zone["id"]][0]["gridDefinitionSha256"] != (
        producer.grid_definition_sha256_from_signature(
            ("grid-md5GridSection", *legacy_definition_signature)
        )
    )

    # Grid v9 keeps the public legacy digest stable, but two GRIB grids with
    # identical dimensions and different grid-section md5 must never share the
    # internal nearest-index cache.
    def grid_identity_codes_get(gid, key):
        if key == "md5GridSection":
            return f"grid-section-{gid}"
        return f"grid-{key}"

    producer.codes_get = grid_identity_codes_get
    first_cache_signature = producer.grid_cache_signature(1001)
    second_cache_signature = producer.grid_cache_signature(1002)
    assert first_cache_signature[1:] == second_cache_signature[1:]
    assert first_cache_signature != second_cache_signature
    producer.GRID_INDEX_CACHE.clear()

    def one_grid_candidate(index):
        def lookup(_latitude, _longitude):
            return [{"index": index, "lat": 1.0, "lon": 2.0}]

        return lookup

    # This subcase exercises the real nearest/cache helper, not the
    # array-protocol stub retained for the batch checks on either side.
    producer._nearest_candidates_for_message = original_nearest_for_message
    first_grid_rows = original_nearest_candidates(
        1001,
        "dkss_idw",
        zone,
        signature=first_cache_signature,
        nearest_lookup=one_grid_candidate(71),
    )
    second_grid_rows = original_nearest_candidates(
        1002,
        "dkss_idw",
        zone,
        signature=second_cache_signature,
        nearest_lookup=one_grid_candidate(72),
    )
    assert first_grid_rows[0]["index"] == 71
    assert second_grid_rows[0]["index"] == 72
    assert len(producer.GRID_INDEX_CACHE) == 2
    producer.GRID_INDEX_CACHE.clear()
    producer._nearest_candidates_for_message = batch_nearest_for_message

    # An unordered iterable can silently detach values from their requested
    # grid indexes even when its length happens to match.
    producer.codes_get_elements = lambda *_args, **_kwargs: {0.25}
    try:
        producer.batched_element_values(992, [7], "vector")
    except producer.DmiGridLookupError as exc:
        assert exc.failure_code == "BATCHED_VECTOR_RESULT_INVALID"
    else:
        raise AssertionError("An unordered ecCodes result must fail closed")

    producer.codes_get_elements = lambda *_args, **_kwargs: NumpyArrayLike([])
    for helper, expected_code in (
        (producer.valid_candidates_batch, "BATCHED_VECTOR_RESULT_INVALID"),
        (producer.nearest_valid_batch, "BATCHED_SCALAR_RESULT_INVALID"),
    ):
        try:
            helper(992, "dkss_idw", [zone])
        except producer.DmiGridLookupError as exc:
            assert exc.failure_code == expected_code
        else:
            raise AssertionError("A wrong-length ecCodes array must fail closed")

    producer.codes_get_elements = fail_nearest
    for helper, expected_code in (
        (producer.valid_candidates_batch, "BATCHED_VECTOR_LOOKUP_FAILED"),
        (producer.nearest_valid_batch, "BATCHED_SCALAR_LOOKUP_FAILED"),
    ):
        try:
            helper(992, "dkss_idw", [zone])
        except producer.DmiGridLookupError as exc:
            assert exc.failure_code == expected_code
        else:
            raise AssertionError("Batched grid exception must fail closed")
finally:
    producer.codes_grib_find_nearest = original_find_nearest
    producer.codes_get = original_codes_get
    producer.codes_get_elements = original_get_elements
    producer.nearest_candidates = original_nearest_candidates
    producer._nearest_candidates_for_message = original_nearest_for_message
    producer.classify_parameter = original_metadata_classify
    producer.GRID_INDEX_CACHE.clear()

# Message-local classification/geometry must stay constant at national scale.
# This is the existing import-safe ecCodes seam, NOT native ecCodes evidence.
_message_saved = {name: getattr(producer, name) for name in (
    "codes_get", "codes_get_elements", "codes_grib_find_nearest",
    "codes_grib_nearest_new", "codes_grib_nearest_find", "codes_grib_nearest_delete",
    "CODES_GRIB_NEAREST_SAME_GRID",
)}
try:
    from collections import Counter
    _field_keys = [key for key in producer._FIELD_SIGNATURE_KEYS
                   if key not in producer._FIELD_STATISTIC_KEYS]
    _grid_keys = ["md5GridSection", *producer.GRID_DEFINITION_KEYS]
    _field = {"parameter": 82}
    _reads, _element_reads, _nearest_opens, _nearest_closes = [], [], [], []
    _grid = dict(zip(_grid_keys, (
        "1" * 32, "regular_ll", 2, 2, 4, 1., 2., 2., 3., .999, .999,
    )))

    def _message_get(gid, key):
        assert gid == 1998
        _reads.append(key)
        if key in _grid:
            return _grid[key]
        if key in {"paramId", "indicatorOfParameter"}:
            return _field["parameter"]
        return {"edition": 1, "scanningMode": 64, "missingValue": 9999.}.get(key, "")

    def _message_elements(gid, key, indices):
        assert gid == 1998 and key == "values"
        _element_reads.append(tuple(indices))
        return [float(index) for index in indices]

    def _message_native(gid, latitude, longitude, *args, **kwargs):
        assert gid == 1998
        return [{"index": 3, "lat": 1.999, "lon": 2.999}]

    producer.codes_get = _message_get
    producer.codes_get_elements = _message_elements
    producer.codes_grib_find_nearest = _message_native
    producer.CODES_GRIB_NEAREST_SAME_GRID = 1
    producer.codes_grib_nearest_new = lambda gid: _nearest_opens.append(gid) or 4242
    producer.codes_grib_nearest_find = lambda handle, gid, lat, lon, *_: _message_native(gid, lat, lon)
    producer.codes_grib_nearest_delete = lambda handle: _nearest_closes.append(handle)
    _wanted_zone = {**zone, "lat": 1.5, "lon": 2.5}
    for _batch in (producer.valid_candidates_batch, producer.nearest_valid_batch):
        for _parameter in (82, 49, 50, 33):
            _field["parameter"] = _parameter
            _current = _parameter in (49, 50)
            for _count in (1, 2, 673):
                _wanted = [{**_wanted_zone, "id": f"PART::MESSAGE-{n}"} for n in range(_count)]
                producer.GRID_INDEX_CACHE.clear()
                for _pass in ("cold", "warm"):
                    _reads.clear(); _element_reads.clear()
                    _nearest_opens.clear(); _nearest_closes.clear()
                    _rows = _batch(1998, "dkss_idw", _wanted)
                    assert set(_rows) == {item["id"] for item in _wanted}
                    assert Counter(_reads) == Counter(
                        _grid_keys + _field_keys + ["missingValue"]
                        + (["edition", "scanningMode"] if _current else [])
                    ), (_batch.__name__, _parameter, _count, _pass, Counter(_reads))
                    assert len(_element_reads) == 1
                    assert _nearest_opens == ([1998] if not _current and _pass == "cold" else [])
                    assert _nearest_closes == ([4242] if _nearest_opens else [])
                    for _key in producer.GRID_INDEX_CACHE:
                        assert (_key[0] == "current-native-grid-sampling-v1") == _current
                    _row = _rows[_wanted[0]["id"]]
                    _row = _row[0] if isinstance(_row, list) else _row
                    assert _row["value"] == float(_row["index"])
                    if not _current:
                        assert (_row["latitude"], _row["longitude"]) == (1.999, 2.999)
                        assert "_gridIndexIdentity" not in _row
                    elif _batch is producer.valid_candidates_batch:
                        assert _row["_gridCoordinateInterpretation"] == "dmi-dkss-grib1-header-endpoints-v1"
                        assert _row["_gridIndexIdentity"] == producer.grid_index_identity_sha256_from_cache(tuple(_grid.values()))
    # SAME numeric gid and SAME grid are reused for another field. No context
    # survives a batch/standalone call; scalar and current entries coexist.
    producer.GRID_INDEX_CACHE.clear()
    _standalone_signature = tuple(_grid.values())
    for _parameter, _namespace in ((49, True), (82, False), (50, True), (34, False)):
        _field["parameter"] = _parameter
        _reads.clear()
        _key = producer.current_grid_cache_key(1998, "dkss_idw", _standalone_signature, _wanted_zone)
        assert (_key[0] == "current-native-grid-sampling-v1") == _namespace
        assert Counter(_reads) == Counter(_field_keys + (["edition", "scanningMode"] if _namespace else []))
        _reads.clear()
        producer.warm_marine_grid_cache(1998, "dkss_idw", [_wanted_zone], _standalone_signature)
        assert Counter(_reads) == Counter(_field_keys + (["edition", "scanningMode"] if _namespace else []))
        _reads.clear()
        _standalone = producer.nearest_candidates(1998, "dkss_idw", _wanted_zone, signature=_standalone_signature)
        assert Counter(_reads) == Counter(_field_keys + (["edition", "scanningMode"] if _namespace else []))
        assert bool(_standalone[0].get("_gridCoordinateInterpretation")) == _namespace
    assert len(producer.GRID_INDEX_CACHE) == 2
    # An invalid next current message cannot borrow the previous geometry,
    # even when its numeric gid and grid signature are unchanged.
    _field["parameter"] = 49
    producer.codes_get = lambda gid, key: 63 if key == "scanningMode" else _message_get(gid, key)
    try:
        producer.valid_candidates_batch(1998, "dkss_idw", [_wanted_zone])
    except producer.DmiGridLookupError as exc:
        assert exc.failure_code == "DKSS_HEADER_GEOMETRY_INVALID"
    else:
        raise AssertionError("Reused gid must validate its current message, including warm cache hits")
    # Regional/parameter routing may legitimately select no target zones.
    # Preserve the former empty result without looking up geometry or values;
    # this never emits a sample, a proof, a key, or a replacement cache entry.
    for _batch in (producer.valid_candidates_batch, producer.nearest_valid_batch):
        _element_reads.clear(); _nearest_opens.clear(); _nearest_closes.clear()
        _empty_cache = dict(producer.GRID_INDEX_CACHE)
        assert _batch(1998, "dkss_idw", []) == {}
        assert _element_reads == _nearest_opens == _nearest_closes == []
        assert producer.GRID_INDEX_CACHE == _empty_cache
finally:
    for _name, _value in _message_saved.items():
        setattr(producer, _name, _value)
    producer.GRID_INDEX_CACHE.clear()

# A grid-definition digest is string metadata, not a number. Both the shared
# vector path and the scalar path must preserve it without passing it to round().
original_codes_grib_new_from_file = producer.codes_grib_new_from_file
original_codes_release = producer.codes_release
original_classify_parameter = producer.classify_parameter
original_valid_candidates_batch = producer.valid_candidates_batch
original_nearest_valid_batch = producer.nearest_valid_batch
original_nearest_candidates = producer.nearest_candidates
original_should_stop_work = producer.should_stop_work
original_raw_cache_source_capture = producer.raw_cache_source_capture
try:
    with tempfile.TemporaryDirectory() as directory:
        asset_path = Path(directory) / "synthetic-dkss.grib"
        asset_path.write_bytes(b"synthetic")
        handles = iter((1, 2, 3, 4, 5, None))
        producer.codes_grib_new_from_file = lambda _handle: next(handles)
        producer.codes_release = lambda _gid: None
        parameters = {
            1: "current-u",
            2: "current-v",
            3: "sea-mean-deviation",
            4: "wind-tail-u-10m",
            5: "wind-tail-v-10m",
        }
        producer.classify_parameter = lambda gid, _collection: parameters[gid]
        # Synthetic lookup rows must obey the SAME normal node/frame contract.
        # They are not decoder/provider evidence. Derive both digests and the
        # returned coordinate from one finite header, never an accept marker.
        metadata_definition = ("regular_ll", 32, 2, 64, 1., 1.93, 1.01, 2.24, .01, .01)
        farther_metadata_definition = ("regular_ll", 32, 2, 64, 1., 1.70, 1.01, 2.01, .01, .01)

        def qualified_metadata_candidate(point, index, definition=metadata_definition):
            assert isinstance(index, int) and not isinstance(index, bool) and 0 <= index < 64
            latitude = float(point["latitude"])
            longitude = float(point["longitude"])
            section = producer.hashlib.md5(producer.json.dumps(definition,
                separators=(",", ":")).encode("utf-8")).hexdigest()
            signature = (section, *definition)
            geometry = producer.dkss_grib1_header_geometry(signature, 64)
            selected = producer.dkss_header_grid_point(geometry, index)
            assert abs(selected["lat"] - latitude) < 1e-12
            assert abs(selected["lon"] - longitude) < 1e-12
            return {**point, "index": selected["index"],
                "latitude": selected["lat"], "longitude": selected["lon"],
                "distanceKm": producer.haversine_km(zone["lat"], zone["lon"],
                    selected["lat"], selected["lon"]),
                "gridDefinitionSha256": producer.grid_definition_sha256_from_signature(definition),
                "_gridIndexIdentity": producer.grid_index_identity_sha256_from_cache(signature),
                "_gridCoordinateInterpretation": "dmi-dkss-grib1-header-endpoints-v1"}

        grid_metadata_candidate = qualified_metadata_candidate(candidate, 7)
        expected_grid_definition = grid_metadata_candidate["gridDefinitionSha256"]
        assert isinstance(expected_grid_definition, str) and len(expected_grid_definition) == 64
        assert producer.candidate_node_key(grid_metadata_candidate) is not None
        producer.valid_candidates_batch = lambda _gid, _collection, wanted: {
            item["id"]: [dict(grid_metadata_candidate)] for item in wanted
        }
        producer.nearest_valid_batch = lambda _gid, _collection, wanted: {
            item["id"]: dict(grid_metadata_candidate, _candidateCount=4)
            for item in wanted
        }
        producer.nearest_candidates = lambda *_args, **_kwargs: [dict(grid_metadata_candidate)]
        producer.should_stop_work = lambda: False
        # Native component admission now requires an original STAC asset
        # identity. Keep this grid-metadata test on the real proved path.
        producer.raw_cache_source_capture = lambda *_args: dict(capture)
        output = {
            "generatedAt": "2026-01-01T02:00:00Z",
            "zones": {
                zone["id"]: {
                    "hourly": {},
                    "gridPoints": {},
                    "collections": {},
                },
            },
        }
        unfiltered_found, _, _, _, _ = producer.process_grib(
            asset_path,
            "dkss_lf",
            "2026-01-01T00:00:00Z",
            valid_time,
            [zone],
            output,
            {},
        )
        grid_points = output["zones"][zone["id"]]["gridPoints"]
        assert grid_points["current-u"]["gridDefinitionSha256"] == expected_grid_definition
        assert grid_points["sea-mean-deviation"]["gridDefinitionSha256"] == expected_grid_definition
        assert all("_candidateCount" not in point for point in grid_points.values())
        hour = output["zones"][zone["id"]]["hourly"][valid_time]
        assert "current-u" in hour and "sea-mean-deviation" in hour
        assert {"wind-tail-u-10m", "wind-tail-v-10m"} <= set(hour)
        assert {"wind-tail-u-10m", "wind-tail-v-10m"} <= unfiltered_found

        # Exact native-current hours between optional-field stride positions
        # still decode all required marine fields, but skip both optional wind
        # messages before any grid lookup or output projection.
        handles = iter((1, 2, 3, 4, 5, None))
        filtered_output = {
            "generatedAt": "2026-01-01T02:00:00Z",
            "zones": {
                zone["id"]: {
                    "hourly": {},
                    "gridPoints": {},
                    "collections": {},
                },
            },
        }
        filtered_found, filtered_touched, _, _, _ = producer.process_grib(
            asset_path,
            "dkss_lf",
            "2026-01-01T00:00:00Z",
            valid_time,
            [zone],
            filtered_output,
            {},
            allowed_parameters=set(producer.REQUIRED_TARGETS["marine"]),
        )
        filtered_hour = filtered_output["zones"][zone["id"]]["hourly"][valid_time]
        assert filtered_found == set(producer.REQUIRED_TARGETS["marine"])
        assert filtered_touched == {zone["id"]}
        assert {"current-u", "current-v", "sea-mean-deviation"} <= set(filtered_hour)
        assert "wind-tail-u-10m" not in filtered_hour
        assert "wind-tail-v-10m" not in filtered_hour
        assert "wind-tail-u-10m" not in filtered_output["zones"][zone["id"]]["gridPoints"]
        assert "wind-tail-v-10m" not in filtered_output["zones"][zone["id"]]["gridPoints"]

        # Spatial outcome is collection-local. A valid farther DKSS candidate
        # must not be labelled unavailable merely because an already selected
        # DMI collection remains the closer global winner.
        losing_candidate = {
            **grid_metadata_candidate,
            "longitude": 2.02,
            "distanceKm": 1.0,
            "index": 9,
        }
        existing_source = producer.native_component_source(
            "dkss_idw",
            "2026-01-01T00:00:00Z",
            valid_time,
            component="current",
            zone=zone,
            grid_candidate=grid_metadata_candidate,
            capture=capture,
            spatial_selection="nearest-shared-grid-cell-no-spatial-interpolation",
            verticalLayer="depthBelowSea:1",
            verticalLayerRankM=1.0,
            vectorSelection=producer.CURRENT_VECTOR_SELECTION,
            vectorSemanticsVersion=producer.CURRENT_VECTOR_SEMANTICS_VERSION,
        )
        assert existing_source is not None
        handles = iter((11, 12, None))
        producer.codes_grib_new_from_file = lambda _handle: next(handles)
        producer.classify_parameter = lambda gid, _collection: {
            11: "current-u",
            12: "current-v",
        }[gid]
        producer.valid_candidates_batch = lambda _gid, _collection, wanted: {
            item["id"]: [qualified_metadata_candidate(losing_candidate, 9)] for item in wanted
        }
        losing_output = {
            "generatedAt": "2026-01-01T02:00:00Z",
            "zones": {
                zone["id"]: {
                    "hourly": {
                        valid_time: {
                            "time": valid_time,
                            "current-u": 0.4,
                            "current-v": -0.3,
                            "sources": {"current": existing_source},
                        },
                    },
                    "gridPoints": {},
                    "collections": {},
                },
            },
        }
        part_outcome = {}
        producer.process_grib(
            asset_path,
            "dkss_lf",
            "2026-01-01T00:00:00Z",
            valid_time,
            [zone],
            losing_output,
            {},
            current_part_outcomes=part_outcome,
        )
        assert part_outcome["complete"] is True
        assert part_outcome["targetPartIds"] == ["TEST"]
        assert part_outcome["spatialUnavailablePartIds"] == []
        retained = losing_output["zones"][zone["id"]]["hourly"][valid_time]
        assert retained["current-u"] == 0.4 and retained["current-v"] == -0.3

        # A superseded same-run A row stays physically intact when revised A
        # is spatially unavailable, but it is not trusted as a winner. A valid
        # slightly farther B asset can therefore replace it in the next stage.
        revised_output = json.loads(json.dumps(losing_output))
        handles = iter((21, 22, None))
        producer.codes_grib_new_from_file = lambda _handle: next(handles)
        producer.classify_parameter = lambda gid, _collection: {
            21: "current-u",
            22: "current-v",
        }[gid]
        producer.valid_candidates_batch = lambda _gid, _collection, wanted: {
            item["id"]: [] for item in wanted
        }
        producer.raw_cache_source_capture = lambda *_args: {
            **capture,
            "itemId": "revised-a",
            "assetIdentitySha256": "e" * 64,
            "contentSha256": "f" * 64,
        }
        revised_a_outcome = {}
        producer.process_grib(
            asset_path,
            "dkss_idw",
            "2026-01-01T00:00:00Z",
            valid_time,
            [zone],
            revised_output,
            {},
            current_part_outcomes=revised_a_outcome,
            trusted_current_pair_source_keys=set(),
        )
        assert revised_a_outcome["spatialUnavailablePartIds"] == ["TEST"]
        unchanged_after_a = revised_output["zones"][zone["id"]]["hourly"][
            valid_time
        ]
        assert unchanged_after_a["sources"]["current"] == existing_source

        farther_candidate = {
            **grid_metadata_candidate,
            "longitude": 2.01,
            "distanceKm": producer.haversine_km(1.0, 2.0, 1.0, 2.01),
            "index": 31,
        }
        handles = iter((31, 32, None))
        producer.codes_grib_new_from_file = lambda _handle: next(handles)
        producer.classify_parameter = lambda gid, _collection: {
            31: "current-u",
            32: "current-v",
        }[gid]
        producer.valid_candidates_batch = lambda _gid, _collection, wanted: {
            item["id"]: [qualified_metadata_candidate(farther_candidate, 31, farther_metadata_definition)] for item in wanted
        }
        producer.raw_cache_source_capture = lambda *_args: {
            **capture,
            "itemId": "official-b",
            "assetIdentitySha256": "9" * 64,
            "contentSha256": "8" * 64,
        }
        producer.process_grib(
            asset_path,
            "dkss_lf",
            "2026-01-01T00:00:00Z",
            valid_time,
            [zone],
            revised_output,
            {},
            current_part_outcomes={},
            trusted_current_pair_source_keys=set(),
        )
        selected_after_b = revised_output["zones"][zone["id"]]["hourly"][
            valid_time
        ]
        assert selected_after_b["sources"]["current"]["collection"] == "dkss_lf"
finally:
    producer.codes_grib_new_from_file = original_codes_grib_new_from_file
    producer.codes_release = original_codes_release
    producer.classify_parameter = original_classify_parameter
    producer.valid_candidates_batch = original_valid_candidates_batch
    producer.nearest_valid_batch = original_nearest_valid_batch
    producer.nearest_candidates = original_nearest_candidates
    producer.should_stop_work = original_should_stop_work
    producer.raw_cache_source_capture = original_raw_cache_source_capture

# DKSS native cadence is hourly. A newer run whose tail is still publishing is
# deferred in favour of the preceding mature run, and every official hour in
# +0..+117 is selected. An internal STAC absence remains an explicit exact gap.
selection_reference = datetime(2026, 1, 1, 3, tzinfo=timezone.utc)
older_run = datetime(2026, 1, 1, 0, tzinfo=timezone.utc)
latest_run = datetime(2026, 1, 1, 3, tzinfo=timezone.utc)


def stac_item(model_run: datetime, lead: int) -> dict:
    valid = model_run + timedelta(hours=lead)
    item_id = f"{model_run.hour:02d}-{lead:03d}"
    return {
        "id": item_id,
        "properties": {
            "forecast:reference_datetime": model_run.isoformat().replace("+00:00", "Z"),
            "datetime": valid.isoformat().replace("+00:00", "Z"),
            "created": (model_run + timedelta(hours=1)).isoformat().replace("+00:00", "Z"),
        },
        "assets": {
            "data": {
                "href": f"https://example.invalid/{item_id}.grib",
                "type": "application/x-grib",
                "file:size": 1024,
            },
        },
    }


older_items = [stac_item(older_run, lead) for lead in range(121)]
latest_partial_items = [stac_item(latest_run, lead) for lead in range(108)]
original_request_json = producer.request_json
original_time = producer.time.time
# The catalog fixture must obey the actual datetime filter. A complete new
# run at age 0..2 h has its +120 endpoint beyond target+117, unlike the older
# fixtures below which returned every item regardless of the query window.
terminal_model_run = datetime(2026, 1, 5, 11, tzinfo=timezone.utc)
terminal_previous_run = terminal_model_run - timedelta(hours=5)
terminal_catalogs = {}
try:
    for collection in sorted(producer.MARINE_COLLECTIONS):
        for age_hours in (0, 1, 2):
            terminal_reference = terminal_model_run + timedelta(hours=age_hours)
            producer.time.time = lambda: terminal_reference.timestamp()
            terminal_required = set(producer.operational_current_valid_times(terminal_reference))
            terminal_end = max(terminal_required, key=producer.epoch)
            terminal_items = [
                stac_item(model_run, lead)
                for model_run in (terminal_previous_run, terminal_model_run)
                for lead in range(121)
            ]
            query_windows = []

            def filtered_catalog(_url, params=None):
                start_at, end_at = params["datetime"].split("/")
                query_windows.append((start_at, end_at))
                filtered = [item for item in terminal_items if
                    producer.epoch(start_at) <= producer.epoch(item["properties"]["datetime"])
                    <= producer.epoch(end_at)]
                return {"features": filtered, "numberMatched": len(filtered),
                        "numberReturned": len(filtered), "links": []}

            producer.request_json = filtered_catalog
            terminal_selected = producer.list_latest_assets(
                collection,
                minimum_valid_time=producer.canonical_time(terminal_reference - timedelta(
                    hours=3 if collection == "dkss_lf" else 0)),
                required_valid_times=terminal_required,
                required_horizon_end_time=terminal_end,
                allow_documented_required_gaps=True,
            )
            selected_native_run, native_assets, native_stats = terminal_selected
            assert selected_native_run == producer.canonical_time(terminal_model_run)
            assert query_windows[0][1] == producer.canonical_time(
                terminal_reference + timedelta(hours=120))
            assert native_stats["selectedNativeRunComplete"] is True
            assert native_stats["nativeTerminalAsset"]["validTime"] == producer.canonical_time(
                terminal_model_run + timedelta(hours=120))
            assert native_stats["nativeTerminalAsset"]["validTime"] not in terminal_required
            assert {row["valid"] for row in native_assets if row["valid"] in terminal_required} == terminal_required
            assert all(producer.epoch(row["valid"]) <= producer.epoch(terminal_end) for row in native_assets)
            assert native_stats["officialRequiredValidTimeCount"] == 118
            if age_hours == 1:
                terminal_catalogs[collection] = terminal_selected
    # Removing the genuine endpoint must still reject the new run. Expanding
    # the observation window does not synthesize publication evidence.
    terminal_items = [item for item in terminal_items if not (
        item["properties"]["forecast:reference_datetime"] == producer.canonical_time(terminal_model_run)
        and item["properties"]["datetime"] == producer.canonical_time(terminal_model_run + timedelta(hours=120)))]
    partial_selected, _, _ = producer.list_latest_assets(
        "dkss_idw", minimum_valid_time=producer.canonical_time(terminal_reference),
        required_valid_times=terminal_required, required_horizon_end_time=terminal_end,
        allow_documented_required_gaps=True,
    )
    assert partial_selected == producer.canonical_time(terminal_previous_run)
finally:
    producer.request_json = original_request_json
    producer.time.time = original_time

# Exercise the real ledger builder and strict reader with terminal evidence
# outside its immutable 118-hour axis, not just the catalog selector helper.
terminal_reference = terminal_model_run + timedelta(hours=1)
terminal_document = {"zoneRegistrySignature": "test-registry", "runs": {},
    "zones": {"PART::TEST": {"samplingPoint": [2.0, 1.0], "hourly": {}}}}
for collection, (model_run, assets, stats) in terminal_catalogs.items():
    signature = producer.current_marine_processing_signature("test-registry")
    steps = {}
    for asset in assets:
        hour = asset["valid"]
        if hour not in set(producer.operational_current_valid_times(terminal_reference)):
            continue
        official = producer.official_current_asset_identity(collection, model_run, asset)
        captured = {**official, "acquiredAt": producer.canonical_time(terminal_reference),
                    "contentLengthBytes": 1024, "contentSha256": "d" * 64}
        steps[hour] = {"complete": True, "recognizedParameters": ["current-u", "current-v"],
            "zonesTouched": 1, "parserVersion": producer.PARSER_VERSION,
            "processingSignature": signature, "sourceAsset": captured,
            "currentPartOutcomeProof": producer.build_current_part_outcome_proof(
                [] if collection == "dkss_lf" else [target["partId"]],
                [target["partId"]], producer.target_fingerprint(targets), signature, captured)}
        if collection == "dkss_lf":
            native_source = producer.native_component_source(
                collection, model_run, hour, component="current", zone=zone,
                grid_candidate=candidate, capture=captured,
                spatial_selection="nearest-shared-grid-cell-no-spatial-interpolation",
                verticalLayer="depthBelowSea:1", verticalLayerRankM=1.0,
                vectorSelection=CURRENT_VECTOR_SELECTION, vectorSemanticsVersion=3)
            assert native_source is not None
            terminal_document["zones"]["PART::TEST"]["hourly"][hour] = {
                "time": hour, "current-u": 0.1, "current-v": -0.2,
                "sources": {"current": native_source}}
    terminal_document["runs"][collection] = {"referenceTime": model_run,
        "parserVersion": producer.PARSER_VERSION, "parameterMapVersion": producer.PARAMETER_MAP_VERSION,
        "gridLookupVersion": producer.GRID_LOOKUP_VERSION, "processingSignature": signature,
        "processedSteps": steps}
terminal_result = producer.build_current_operational_ledger_result(
    terminal_document, targets, terminal_reference, terminal_catalogs)
assert terminal_result.validated and terminal_result.ledger["ready"]
assert terminal_result.attestation["verifiedPairCount"] == 118
assert all(row["officialValidTimeCount"] == 118 and len(row["validTimes"]) == 118
           for row in terminal_result.ledger["collections"])
assert producer.current_operational_ledger_ready(
    json.loads(json.dumps(terminal_result.ledger)), terminal_result.attestation,
    targets, terminal_reference, terminal_reference + timedelta(hours=117),
    producer.target_fingerprint(targets))
for mutation in ("missing", "time", "model", "collection", "extra"):
    mutated = copy.deepcopy(terminal_result.ledger)
    row = mutated["collections"][0]
    if mutation == "missing":
        row.pop("nativeTerminalAsset")
    elif mutation == "time":
        row["nativeTerminalAsset"]["validTime"] = producer.canonical_time(terminal_reference)
    elif mutation == "model":
        row["nativeTerminalAsset"]["modelRun"] = producer.canonical_time(terminal_previous_run)
    elif mutation == "collection":
        row["nativeTerminalAsset"]["collection"] = "other"
    else:
        row["nativeTerminalAsset"]["href"] = "https://example.invalid/not-sanitized"
    assert not producer.current_operational_ledger_ready(
        mutated, terminal_result.attestation, targets, terminal_reference,
        terminal_reference + timedelta(hours=117), producer.target_fingerprint(targets)), mutation
    if mutation != "missing":
        try:
            validate_current_operational_availability_ledger(
                mutated, terminal_result.attestation, targets, terminal_reference,
                terminal_reference + timedelta(hours=117), producer.target_fingerprint(targets))
            raise AssertionError(f"Malformed terminal passed availability: {mutation}")
        except ValueError:
            pass

try:
    producer.time.time = lambda: selection_reference.timestamp()
    catalog_items = [*latest_partial_items, *older_items]
    producer.request_json = lambda *_args, **_kwargs: {"features": catalog_items}
    selection_hours = set(producer.operational_current_valid_times(selection_reference))
    selection_end = max(selection_hours, key=producer.epoch)
    selected_run, selected_assets, selected_stats = producer.list_latest_assets(
        "dkss_idw",
        minimum_valid_time=selection_reference.isoformat().replace("+00:00", "Z"),
        required_valid_times=selection_hours,
        required_horizon_end_time=selection_end,
        allow_documented_required_gaps=True,
    )
    assert selected_run == older_run.isoformat().replace("+00:00", "Z")
    assert len(selected_assets) == 118
    assert {row["valid"] for row in selected_assets} == selection_hours
    assert selected_stats["incompleteLatestRunDeferred"] is True
    assert selected_stats["officialNativeCadenceHours"] == 1
    assert selected_stats["catalogInventoryComplete"] is True
    assert len(selected_stats["officialRequiredAssets"]) == 118
    assert selected_stats["nativeCompleteRunCount"] == 1
    assert selected_stats["selectedNativeRunComplete"] is True
    assert selected_stats["requiredHorizonEndCovered"] is True
    assert selected_stats["requiredWindowInventoryComplete"] is True

    # The same inventory remains complete when STAC requires a two-page chain.
    page_one = catalog_items[:100]
    page_two = catalog_items[100:]
    pagination_requests = []

    def paged_request(url: str, _params=None) -> dict:
        pagination_requests.append((url, _params))
        features = page_two if "page=2" in url else page_one
        return {
            "features": features,
            "numberMatched": len(catalog_items),
            "numberReturned": len(features),
            "links": [] if "page=2" in url else [{
                "rel": "next",
                "href": (
                    f"{producer.STAC_ROOT}/collections/dkss_idw/items?page=2"
                ),
            }],
        }

    producer.request_json = paged_request
    paged_run, paged_assets, paged_stats = producer.list_latest_assets(
        "dkss_idw",
        minimum_valid_time=selection_reference.isoformat().replace("+00:00", "Z"),
        required_valid_times=selection_hours,
        required_horizon_end_time=selection_end,
        allow_documented_required_gaps=True,
    )
    assert paged_run == selected_run
    assert len(paged_assets) == 118
    assert paged_stats["paginationPagesFetched"] == 2
    assert paged_stats["catalogInventoryComplete"] is True
    assert pagination_requests[0][1]["datetime"] == (
        f"{min(selection_hours, key=producer.epoch)}/"
        f"{producer.canonical_time(selection_reference + timedelta(hours=120))}"
    )
    assert pagination_requests[1][1] is None

    # An overlapping/replayed item identity across pages makes unique-item
    # exhaustion unprovable, even when numberMatched would otherwise balance.
    overlap_page_two = [page_one[-1], *page_two]

    def overlap_request(url: str, _params=None) -> dict:
        features = overlap_page_two if "page=2" in url else page_one
        return {
            "features": features,
            "numberMatched": len(catalog_items),
            "numberReturned": len(features),
            "links": [] if "page=2" in url else [{
                "rel": "next",
                "href": (
                    f"{producer.STAC_ROOT}/collections/dkss_idw/items?page=2"
                ),
            }],
        }

    producer.request_json = overlap_request
    _overlap_run, overlap_assets, overlap_stats = producer.list_latest_assets(
        "dkss_idw",
        minimum_valid_time=selection_reference.isoformat().replace("+00:00", "Z"),
        required_valid_times=selection_hours,
        required_horizon_end_time=selection_end,
        allow_documented_required_gaps=True,
    )
    assert overlap_stats["catalogInventoryComplete"] is False
    assert "STAC_DUPLICATE_ITEM_IDENTITY" in overlap_stats["catalogInventoryFailureCodes"]
    assert overlap_stats["paginationItemsFetched"] == len(catalog_items) + 1
    assert overlap_stats["paginationUniqueItems"] == len(catalog_items)

    # A full terminal page without next/total evidence is truncated and may
    # never turn unseen official hours into upstream absence.
    truncated_items = (catalog_items * 5)[:producer.STAC_PAGE_LIMIT]
    producer.request_json = lambda *_args, **_kwargs: {
        "features": truncated_items,
        "numberReturned": len(truncated_items),
        "links": [],
    }
    _truncated_run, _truncated_assets, truncated_stats = producer.list_latest_assets(
        "dkss_idw",
        minimum_valid_time=selection_reference.isoformat().replace("+00:00", "Z"),
        required_valid_times=selection_hours,
        required_horizon_end_time=selection_end,
        allow_documented_required_gaps=True,
    )
    assert truncated_stats["catalogInventoryComplete"] is False
    assert "STAC_PAGINATION_UNPROVEN" in truncated_stats["catalogInventoryFailureCodes"]

    # One locally unparseable STAC item invalidates the catalog proof even when
    # every required official asset is otherwise present.
    producer.request_json = lambda *_args, **_kwargs: {
        "features": [*catalog_items, {"id": "bad", "properties": {}, "assets": {}}],
    }
    _bad_run, _bad_assets, bad_stats = producer.list_latest_assets(
        "dkss_idw",
        minimum_valid_time=selection_reference.isoformat().replace("+00:00", "Z"),
        required_valid_times=selection_hours,
        required_horizon_end_time=selection_end,
        allow_documented_required_gaps=True,
    )
    assert bad_stats["catalogInventoryComplete"] is False
    assert "UNPARSEABLE_STAC_ITEM" in bad_stats["catalogInventoryFailureCodes"]
    invalid_catalog_results = []
    invalid_identity_cases = (
        (
            "malformed secondary run alias",
            lambda item: item["properties"].update({"reference_datetime": "not-a-time"}),
            "UNPARSEABLE_STAC_ITEM",
        ),
        (
            "conflicting secondary run alias",
            lambda item: item["properties"].update({
                "modelRun": older_run.isoformat().replace("+00:00", "Z"),
            }),
            "UNPARSEABLE_STAC_ITEM",
        ),
        (
            "malformed secondary valid-time alias",
            lambda item: item["properties"].update({"forecast:valid_time": "not-a-time"}),
            "UNPARSEABLE_STAC_ITEM",
        ),
        (
            "conflicting secondary valid-time alias",
            lambda item: item["properties"].update({
                "valid_time": older_run.isoformat().replace("+00:00", "Z"),
            }),
            "UNPARSEABLE_STAC_ITEM",
        ),
        (
            "timezone-naive explicit run",
            lambda item: item["properties"].update({"model_run": "2026-01-01T03:00:00"}),
            "UNPARSEABLE_STAC_ITEM",
        ),
        (
            "malformed created timestamp",
            lambda item: item["properties"].update({"created": "not-a-time"}),
            "UNPARSEABLE_STAC_ITEM",
        ),
        (
            "timezone-naive updated timestamp",
            lambda item: item["properties"].update({"updated": "2026-01-01T04:00:00"}),
            "UNPARSEABLE_STAC_ITEM",
        ),
        (
            "numeric item id",
            lambda item: item.update({"id": 42}),
            "STAC_ITEM_IDENTITY_INVALID",
        ),
        (
            "blank item id",
            lambda item: item.update({"id": "   "}),
            "STAC_ITEM_IDENTITY_INVALID",
        ),
        (
            "boolean asset size",
            lambda item: item["assets"]["data"].update({"file:size": True}),
            "UNPARSEABLE_STAC_ITEM",
        ),
        (
            "zero asset size",
            lambda item: item["assets"]["data"].update({"file:size": 0}),
            "UNPARSEABLE_STAC_ITEM",
        ),
        (
            "string asset size",
            lambda item: item["assets"]["data"].update({"file:size": "1024"}),
            "UNPARSEABLE_STAC_ITEM",
        ),
        (
            "conflicting asset-size aliases",
            lambda item: item["assets"]["data"].update({"size": 2048}),
            "UNPARSEABLE_STAC_ITEM",
        ),
    )
    for label, mutate, expected_failure_code in invalid_identity_cases:
        invalid_catalog = json.loads(json.dumps(catalog_items))
        mutate(invalid_catalog[0])
        producer.request_json = (
            lambda *_args, _catalog=invalid_catalog, **_kwargs: {
                "features": _catalog,
            }
        )
        _invalid_run, invalid_assets, invalid_stats = producer.list_latest_assets(
            "dkss_idw",
            minimum_valid_time=selection_reference.isoformat().replace("+00:00", "Z"),
            required_valid_times=selection_hours,
            required_horizon_end_time=selection_end,
            allow_documented_required_gaps=True,
        )
        assert invalid_stats["catalogInventoryComplete"] is False, label
        assert expected_failure_code in invalid_stats["catalogInventoryFailureCodes"], label
        invalid_catalog_results.append((invalid_assets, invalid_stats))

    # Distinct STAC items may not compete for one collection/run/validTime.
    duplicate_catalog = json.loads(json.dumps(catalog_items))
    duplicate_item = json.loads(json.dumps(older_items[50]))
    duplicate_item["id"] = "duplicate-run-valid-time"
    duplicate_item["assets"]["data"]["href"] = (
        "https://example.invalid/duplicate-run-valid-time.grib"
    )
    duplicate_catalog.append(duplicate_item)
    producer.request_json = lambda *_args, **_kwargs: {"features": duplicate_catalog}
    _duplicate_run, duplicate_assets, duplicate_stats = producer.list_latest_assets(
        "dkss_idw",
        minimum_valid_time=selection_reference.isoformat().replace("+00:00", "Z"),
        required_valid_times=selection_hours,
        required_horizon_end_time=selection_end,
        allow_documented_required_gaps=True,
    )
    assert duplicate_stats["catalogInventoryComplete"] is False
    assert duplicate_stats["duplicateValidTimes"] == 1
    assert (
        "STAC_DUPLICATE_COLLECTION_RUN_VALID_TIME"
        in duplicate_stats["catalogInventoryFailureCodes"]
    )
    for incomplete_assets, incomplete_stats in (
        (overlap_assets, overlap_stats),
        (_truncated_assets, truncated_stats),
        (_bad_assets, bad_stats),
        *invalid_catalog_results,
        (duplicate_assets, duplicate_stats),
    ):
        incomplete_catalogs = dict(official_catalogs)
        incomplete_catalogs["dkss_idw"] = (
            selected_run,
            incomplete_assets,
            incomplete_stats,
        )
        incomplete_ledger = producer.build_current_operational_ledger(
            ledger_document,
            targets,
            reference,
            incomplete_catalogs,
        )
        idw_ledger = next(
            row for row in incomplete_ledger["collections"]
            if row["collection"] == "dkss_idw"
        )
        assert idw_ledger["stateCounts"]["LOCALLY_SKIPPED"] == 118
        assert idw_ledger["stateCounts"]["UPSTREAM_ABSENT"] == 0
        assert incomplete_ledger["ready"] is False

    missing_hour = (older_run + timedelta(hours=50)).isoformat().replace("+00:00", "Z")
    catalog_items = [
        *latest_partial_items,
        *(item for item in older_items if item["properties"]["datetime"] != missing_hour),
    ]
    producer.request_json = lambda *_args, **_kwargs: {"features": catalog_items}
    _run, gap_assets, gap_stats = producer.list_latest_assets(
        "dkss_idw",
        minimum_valid_time=selection_reference.isoformat().replace("+00:00", "Z"),
        required_valid_times=selection_hours,
        required_horizon_end_time=selection_end,
        allow_documented_required_gaps=True,
    )
    assert len(gap_assets) == 117
    assert missing_hour not in {row["valid"] for row in gap_assets}
    assert gap_stats["officialRequiredGapCount"] == 1

    # At a target seven hours after the preceding complete DKSS run, DMI's
    # native +120 h endpoint resolves target..+113.  The exact four-hour public
    # tail is an upstream absence for the supplement, while a newer partial run
    # remains ineligible.
    tail_reference = older_run + timedelta(hours=7)
    tail_latest_run = older_run + timedelta(hours=6)
    tail_latest_partial_items = [
        stac_item(tail_latest_run, lead) for lead in range(31)
    ]
    producer.time.time = lambda: tail_reference.timestamp()
    producer.request_json = lambda *_args, **_kwargs: {
        "features": [*tail_latest_partial_items, *older_items],
    }
    tail_hours = set(producer.operational_current_valid_times(tail_reference))
    tail_end = max(tail_hours, key=producer.epoch)
    tail_run, tail_assets, tail_stats = producer.list_latest_assets(
        "dkss_idw",
        minimum_valid_time=tail_reference.isoformat().replace("+00:00", "Z"),
        required_valid_times=tail_hours,
        required_horizon_end_time=tail_end,
        allow_documented_required_gaps=True,
    )
    assert tail_run == older_run.isoformat().replace("+00:00", "Z")
    assert len(tail_assets) == 114
    assert tail_stats["nativeCompleteRunCount"] == 1
    assert tail_stats["selectedNativeRunComplete"] is True
    assert tail_stats["requiredHorizonEndCovered"] is False
    assert tail_stats["requiredWindowInventoryComplete"] is True
    assert tail_stats["officialRequiredGapCount"] == 4

    # A partial run must never turn its unpublished native tail into a large
    # apparent DMI gap, even when the STAC page itself is exhaustive.
    producer.request_json = lambda *_args, **_kwargs: {
        "features": tail_latest_partial_items,
    }
    partial_run, partial_assets, partial_stats = producer.list_latest_assets(
        "dkss_idw",
        minimum_valid_time=tail_reference.isoformat().replace("+00:00", "Z"),
        required_valid_times=tail_hours,
        required_horizon_end_time=tail_end,
        allow_documented_required_gaps=True,
    )
    assert partial_run is None
    assert partial_assets == []
    assert partial_stats["catalogInventoryComplete"] is True
    assert partial_stats["nativeCompleteRunCount"] == 0
    assert partial_stats["selectedNativeRunComplete"] is False
    assert partial_stats["requiredWindowInventoryComplete"] is False

    # A later row cannot stand in for the documented exact +120 endpoint.
    endpoint_missing_items = [
        stac_item(older_run, lead) for lead in [*range(120), 121]
    ]
    producer.request_json = lambda *_args, **_kwargs: {
        "features": endpoint_missing_items,
    }
    endpoint_run, endpoint_assets, endpoint_stats = producer.list_latest_assets(
        "dkss_idw",
        minimum_valid_time=tail_reference.isoformat().replace("+00:00", "Z"),
        required_valid_times=tail_hours,
        required_horizon_end_time=tail_end,
        allow_documented_required_gaps=True,
    )
    assert endpoint_run is None
    assert endpoint_assets == []
    assert endpoint_stats["nativeCompleteRunCount"] == 0

    # Operational DMI-first selection always uses the newest complete native
    # cycle, even when the retained cache is intentionally non-READY. Exact
    # pair/source continuity makes the switch lossless; pinning the old cycle
    # would instead create a larger fallback tail.
    assert older_ledger["ready"] is False
    assert "RETAINED_CURRENT_PART_TIME" in older_ledger["failureCodes"]
    preferred_reference = older_run + timedelta(hours=13)
    middle_run = older_run + timedelta(hours=6)
    newest_run = older_run + timedelta(hours=12)
    middle_complete_items = [stac_item(middle_run, lead) for lead in range(121)]
    newest_partial_items = [stac_item(newest_run, lead) for lead in range(31)]
    producer.time.time = lambda: preferred_reference.timestamp()
    producer.request_json = lambda *_args, **_kwargs: {
        "features": [*newest_partial_items, *middle_complete_items, *older_items],
    }
    preferred_hours = set(
        producer.operational_current_valid_times(preferred_reference)
    )
    preferred_end = max(preferred_hours, key=producer.epoch)
    preferred_selected_run, _, preferred_stats = producer.list_latest_assets(
        "dkss_idw",
        older_run.isoformat().replace("+00:00", "Z"),
        minimum_valid_time=preferred_reference.isoformat().replace("+00:00", "Z"),
        required_valid_times=preferred_hours,
        required_horizon_end_time=preferred_end,
        allow_documented_required_gaps=True,
    )
    assert preferred_selected_run == middle_run.isoformat().replace("+00:00", "Z")
    assert preferred_stats["nativeCompleteRunCount"] == 2
    assert preferred_stats["officialRequiredGapCount"] == 4

    pinned_selected_run, _, pinned_stats = producer.list_latest_assets(
        "dkss_idw",
        older_run.isoformat().replace("+00:00", "Z"),
        minimum_valid_time=preferred_reference.isoformat().replace("+00:00", "Z"),
        required_valid_times=preferred_hours,
        required_horizon_end_time=preferred_end,
        allow_documented_required_gaps=True,
        retain_preferred_native_run=True,
    )
    assert pinned_selected_run == older_run.isoformat().replace("+00:00", "Z")
    assert pinned_stats["preferredNativeRunPinned"] is True
    assert pinned_stats["officialRequiredGapCount"] == 10
    assert pinned_stats.get("rejectedStaleRun") is not True

    # Candidate retention has its own 96-hour bound.  Tightening ordinary
    # run maturity to 118 hours must not reset a partially processed preferred
    # candidate that still has 107 valid future hours.
    stricter_selected_run, stricter_stats = producer.select_forecast_run(
        {
            older_run.isoformat().replace("+00:00", "Z"): [{
                "valid": (older_run + timedelta(hours=120))
                .isoformat().replace("+00:00", "Z"),
            }],
            middle_run.isoformat().replace("+00:00", "Z"): [{
                "valid": (middle_run + timedelta(hours=120))
                .isoformat().replace("+00:00", "Z"),
            }],
            newest_run.isoformat().replace("+00:00", "Z"): [{
                "valid": (newest_run + timedelta(hours=30))
                .isoformat().replace("+00:00", "Z"),
            }],
        },
        older_run.isoformat().replace("+00:00", "Z"),
        now_epoch=preferred_reference.timestamp(),
        retention_horizon_hours=118,
        retain_preferred_run=True,
    )
    assert stricter_selected_run == older_run.isoformat().replace("+00:00", "Z")
    assert stricter_stats["runRetentionHorizonHours"] == 118
    assert stricter_stats["selectedRunFutureHorizonHours"] == 107.0
    assert stricter_stats["preferredProgressiveRunPinned"] is True

    # Schedule/publication lag is diagnostic only. The older complete official
    # run remains available behind a newer incomplete generation; exact asset
    # identity and remaining valid-time coverage are still enforced.
    stale_catalog_reference = older_run + timedelta(hours=20)
    producer.time.time = lambda: stale_catalog_reference.timestamp()
    stale_catalog_hours = set(
        producer.operational_current_valid_times(stale_catalog_reference)
    )
    stale_catalog_end = max(stale_catalog_hours, key=producer.epoch)
    stale_selected_run, stale_assets, stale_stats = producer.list_latest_assets(
        "dkss_idw",
        older_run.isoformat().replace("+00:00", "Z"),
        minimum_valid_time=stale_catalog_reference.isoformat().replace(
            "+00:00", "Z"
        ),
        required_valid_times=stale_catalog_hours,
        required_horizon_end_time=stale_catalog_end,
        allow_documented_required_gaps=True,
        retain_preferred_native_run=True,
    )
    assert stale_selected_run == older_run.isoformat().replace("+00:00", "Z")
    assert stale_assets
    assert stale_stats["preferredNativeRunPinned"] is True
    assert stale_stats["catalogScheduleFresh"] is False
    assert stale_stats["selectedWithinObservedSchedule"] is True
    assert stale_stats["scheduleFreshnessWarning"] is True
    assert stale_stats["scheduleFreshnessWarningCodes"] == [
        "CATALOG_PUBLICATION_LAG"
    ]
    assert stale_stats["rejectedStaleRun"] is False

    # Retention is bounded by the configured complete horizon.  A preferred
    # native run can still expose its exact +120 endpoint while having less
    # than 96 future hours left; it must then yield to a newer mature run.
    expired_preferred_reference = older_run + timedelta(hours=25)
    newer_mature_run = older_run + timedelta(hours=18)
    newer_mature_items = [
        stac_item(newer_mature_run, lead) for lead in range(121)
    ]
    producer.time.time = lambda: expired_preferred_reference.timestamp()
    producer.request_json = lambda *_args, **_kwargs: {
        "features": [*newer_mature_items, *older_items],
    }
    expired_preferred_hours = set(
        producer.operational_current_valid_times(expired_preferred_reference)
    )
    expired_preferred_end = max(expired_preferred_hours, key=producer.epoch)
    bounded_selected_run, _, bounded_stats = producer.list_latest_assets(
        "dkss_idw",
        older_run.isoformat().replace("+00:00", "Z"),
        minimum_valid_time=expired_preferred_reference.isoformat().replace(
            "+00:00", "Z"
        ),
        required_valid_times=expired_preferred_hours,
        required_horizon_end_time=expired_preferred_end,
        allow_documented_required_gaps=True,
        retain_preferred_native_run=True,
    )
    assert bounded_selected_run == newer_mature_run.isoformat().replace(
        "+00:00", "Z"
    )
    assert bounded_stats["selectedRunFutureHorizonHours"] == 113.0
    assert bounded_stats["preferredProgressiveRunPinned"] is False
    assert bounded_stats["preferredProgressiveRunDiscardedAsStale"] is True
    assert bounded_stats["preferredNativeRunPinned"] is False
finally:
    producer.request_json = original_request_json
    producer.time.time = original_time

# The same target+113 native endpoint must pass the complete operational ledger
# and expose exactly four tail pairs—not a national Copernicus substitution.
tail_direct_hours = sorted(tail_hours, key=producer.epoch)[:-4]
tail_ledger_document = {
    "zoneRegistrySignature": "test-registry",
    "zones": {
        "PART::TEST": {
            "samplingPoint": [2.0, 1.0],
            "hourly": {},
        },
    },
    "runs": {},
}
tail_official_catalogs = {}
for collection in sorted(producer.MARINE_COLLECTIONS):
    processing_signature = producer.current_marine_processing_signature(
        "test-registry"
    )
    official_assets = []
    processed_steps = {}
    for hour in tail_direct_hours:
        official_asset, source_asset = ledger_asset(collection, hour)
        official_assets.append(official_asset)
        processed_steps[hour] = {
            "complete": True,
            "recognizedParameters": ["current-u", "current-v"],
            "zonesTouched": 1,
            "parserVersion": producer.PARSER_VERSION,
            "processingSignature": processing_signature,
            "sourceAsset": source_asset,
            "currentPartOutcomeProof": producer.build_current_part_outcome_proof(
                [] if collection == "dkss_lf" else [target["partId"]],
                [target["partId"]],
                producer.target_fingerprint(targets),
                processing_signature,
                source_asset,
            ),
        }
        if collection == "dkss_lf":
            native_source = producer.native_component_source(
                collection,
                "2026-01-01T00:00:00Z",
                hour,
                component="current",
                zone=zone,
                grid_candidate=candidate,
                capture={
                    "itemId": source_asset["itemId"],
                    "assetIdentitySha256": source_asset["assetIdentitySha256"],
                    "assetSizeBytes": source_asset["assetSizeBytes"],
                    "acquiredAt": source_asset["acquiredAt"],
                    "contentLengthBytes": source_asset["contentLengthBytes"],
                    "contentSha256": source_asset["contentSha256"],
                    "itemCreatedAt": source_asset["itemCreatedAt"],
                    "itemUpdatedAt": source_asset["itemUpdatedAt"],
                },
                spatial_selection="nearest-shared-grid-cell-no-spatial-interpolation",
                verticalLayer="depthBelowSea:1",
                verticalLayerRankM=1.0,
                vectorSelection=CURRENT_VECTOR_SELECTION,
                vectorSemanticsVersion=3,
            )
            assert native_source is not None
            tail_ledger_document["zones"]["PART::TEST"]["hourly"][hour] = {
                "time": hour,
                "current-u": 0.1,
                "current-v": -0.2,
                "sources": {"current": native_source},
            }
    tail_ledger_document["runs"][collection] = {
        "referenceTime": "2026-01-01T00:00:00Z",
        "parserVersion": producer.PARSER_VERSION,
        "parameterMapVersion": producer.PARAMETER_MAP_VERSION,
        "gridLookupVersion": producer.GRID_LOOKUP_VERSION,
        "processingSignature": processing_signature,
        "processedSteps": processed_steps,
    }
    tail_official_catalogs[collection] = (
        "2026-01-01T00:00:00Z",
        official_assets,
        {
            "catalogInventoryComplete": True,
            "requiredHorizonEndCovered": False,
            "documentedRequiredGapsAllowed": True,
            "selectedNativeRunComplete": True,
            "requiredWindowInventoryComplete": True,
            "requiredRowsTruncatedByAssetLimit": 0,
            "officialRequiredValidTimeCount": len(official_assets),
            "officialRequiredValidTimes": tail_direct_hours,
            "officialRequiredAssets": official_assets,
        },
    )
tail_ledger = producer.build_current_operational_ledger(
    tail_ledger_document,
    targets,
    tail_reference,
    tail_official_catalogs,
)
assert tail_ledger["ready"] is True
assert tail_ledger["failureCodes"] == []
assert tail_ledger["attestation"]["verifiedPairCount"] == 114
assert tail_ledger["upstreamAbsencePairCount"] == 4
assert tail_ledger["operationalComplementPairCount"] == 4
cache_only_ready_document = copy.deepcopy(tail_ledger_document)
cache_only_ready_document.setdefault("diagnostics", {})[
    "currentOperationalLedger"] = copy.deepcopy(tail_ledger)
cache_only_ready_original = copy.deepcopy(cache_only_ready_document)
assert producer.revalidate_cache_only_current_ledger(
    cache_only_ready_document, targets, tail_reference, "test-registry", tail_ledger,
) == tail_ledger["attestation"]
assert producer.current_operational_cache_ready(
    cache_only_ready_document, targets, tail_reference,
)
assert cache_only_ready_document == cache_only_ready_original
tail_sealed_result = producer.build_current_operational_ledger_result(
    tail_ledger_document, targets, tail_reference, tail_official_catalogs,
)
assert tail_sealed_result.validated is True
assert tail_sealed_result.ledger == tail_ledger
assert tail_sealed_result.attestation["verifiedPairCount"] == 114
assert len(tail_sealed_result.attestation["verifiedPairSources"]) == 114
assert all(
    row["stateCounts"]["UPSTREAM_ABSENT"] == 4
    for row in tail_ledger["collections"]
)
tail_ledger_document.setdefault("diagnostics", {})[
    "currentOperationalLedger"
] = tail_ledger
assert producer.current_operational_cache_ready(
    tail_ledger_document,
    targets,
    tail_reference,
)

# A separate terminal observation inside the required axis must agree with
# that exact official row; it cannot override a revised or removed asset.
inside_terminal_ledger = copy.deepcopy(tail_ledger)
inside_terminal_collection = inside_terminal_ledger["collections"][0]
inside_terminal_time = producer.canonical_time(older_run + timedelta(hours=120))
inside_terminal_collection["nativeTerminalAsset"] = copy.deepcopy(next(
    row["officialAsset"] for row in inside_terminal_collection["validTimes"]
    if row["validTime"] == inside_terminal_time))
assert producer.current_operational_ledger_ready(
    inside_terminal_ledger, tail_sealed_result.attestation, targets, tail_reference,
    tail_reference + timedelta(hours=117), producer.target_fingerprint(targets))
inside_terminal_collection["nativeTerminalAsset"]["itemId"] = "different-terminal-item"
assert not producer.current_operational_ledger_ready(
    inside_terminal_ledger, tail_sealed_result.attestation, targets, tail_reference,
    tail_reference + timedelta(hours=117), producer.target_fingerprint(targets))

# A structurally valid row remains usable until its actual replacement is
# admitted. A newer processed outcome without the new cached tuple is metadata,
# not grounds to remove the older row and create a fallback gap.
retained_tail_document = copy.deepcopy(tail_ledger_document)
retained_tail_hour = tail_direct_hours[0]
retained_tail_source = producer.native_component_source(
    "dkss_lf",
    "2025-12-31T18:00:00Z",
    retained_tail_hour,
    component="current",
    zone=zone,
    grid_candidate=candidate,
    capture={
        "itemId": "retained-old-stac-item",
        "assetIdentitySha256": "e" * 64,
        "assetSizeBytes": 1024,
        "acquiredAt": "2026-01-01T02:00:00Z",
        "contentLengthBytes": 1024,
        "contentSha256": "f" * 64,
        "itemCreatedAt": "2025-12-31T19:00:00Z",
    },
    spatial_selection="nearest-shared-grid-cell-no-spatial-interpolation",
    verticalLayer="depthBelowSea:1",
    verticalLayerRankM=1.0,
    vectorSelection=CURRENT_VECTOR_SELECTION,
    vectorSemanticsVersion=3,
)
assert retained_tail_source is not None
retained_tail_document["zones"]["PART::TEST"]["hourly"][retained_tail_hour][
    "sources"
]["current"] = retained_tail_source
priority_inversion_ledger = producer.build_current_operational_ledger(
    retained_tail_document,
    targets,
    tail_reference,
    tail_official_catalogs,
    [retained_proof(retained_tail_source)],
)
assert priority_inversion_ledger["ready"] is True
assert priority_inversion_ledger["failureCodes"] == ["RETAINED_CURRENT_PART_TIME"]
assert priority_inversion_ledger["retainedCurrentAssetProofCount"] == 1
assert priority_inversion_ledger["attestation"]["verifiedPairCount"] == 114
assert priority_inversion_ledger["operationalComplementPairCount"] == 4

# Once the exact newer tuple is present, the old proof is no longer persisted.
# An unused proof cannot be used to claim coverage of any other tuple.
replacement_document = copy.deepcopy(tail_ledger_document)
replacement_ledger = producer.build_current_operational_ledger(
    replacement_document, targets, tail_reference, tail_official_catalogs,
    [retained_proof(retained_tail_source)],
)
assert replacement_ledger["ready"] is True
assert replacement_ledger["retainedCurrentAssetProofCount"] == 0
assert replacement_ledger["attestation"]["verifiedPairCount"] == 114

# With neither a valid old tuple nor an admitted new tuple, metadata alone
# still cannot authorize the pair.
invalid_retained_document = copy.deepcopy(retained_tail_document)
invalid_retained_document["zones"]["PART::TEST"]["hourly"][retained_tail_hour].pop(
    "current-v"
)
invalid_retained_ledger = producer.build_current_operational_ledger(
    invalid_retained_document, targets, tail_reference, tail_official_catalogs,
    [retained_proof(retained_tail_source)],
)
assert invalid_retained_ledger["ready"] is False
assert invalid_retained_ledger["retainedCurrentAssetProofCount"] == 0
assert invalid_retained_ledger["attestation"]["verifiedPairCount"] == 113

selected_newer_step = retained_tail_document["runs"]["dkss_lf"][
    "processedSteps"
][retained_tail_hour]
selected_newer_source = selected_newer_step["sourceAsset"]
selected_newer_step["currentPartOutcomeProof"] = (
    producer.build_current_part_outcome_proof(
        [target["partId"]],
        [target["partId"]],
        producer.target_fingerprint(targets),
        selected_newer_step["processingSignature"],
        selected_newer_source,
    )
)
retained_tail_ledger = producer.build_current_operational_ledger(
    retained_tail_document,
    targets,
    tail_reference,
    tail_official_catalogs,
    [retained_proof(retained_tail_source)],
)
retained_allowed, retained_authorization = (
    producer.current_attestation_authorization_from_operational_ledger(
        retained_tail_ledger
    )
)
retained_tail_attestation = producer.current_operational_attestation(
    retained_tail_document,
    targets,
    tail_reference,
    retained_allowed,
    retained_authorization,
)
assert retained_tail_ledger["ready"] is True
assert retained_tail_ledger["failureCodes"] == ["RETAINED_CURRENT_PART_TIME"]
validate_current_operational_ledger(
    retained_tail_ledger,
    retained_tail_attestation,
    targets,
    tail_reference,
    tail_reference + timedelta(hours=117),
    producer.target_fingerprint(targets),
)

# Recomputed counts and hashes cannot make a v4 ledger valid after one
# collection's exact native +120 endpoint has been removed.
tampered_terminal_ledger = json.loads(json.dumps(tail_ledger))
tampered_collection = next(
    row for row in tampered_terminal_ledger["collections"]
    if row["collection"] == "dkss_idw"
)
native_terminal_time = (
    older_run + timedelta(hours=producer.DKSS_MAX_FORECAST_LEAD_HOURS)
).isoformat().replace("+00:00", "Z")
tampered_row = next(
    row for row in tampered_collection["validTimes"]
    if row["validTime"] == native_terminal_time
)
tampered_row.update({
    "state": "UPSTREAM_ABSENT",
    "officialAsset": None,
    "sourceAsset": None,
    "partOutcomeProof": None,
})
tampered_assets = [
    row["officialAsset"]
    for row in tampered_collection["validTimes"]
    if row["officialAsset"] is not None
]
tampered_times = sorted(asset["validTime"] for asset in tampered_assets)
tampered_collection["officialValidTimeCount"] = len(tampered_assets)
tampered_collection["officialValidTimesSha256"] = producer.valid_times_sha256(
    tampered_times
)
tampered_collection["officialAssetsSha256"] = (
    producer.current_official_assets_sha256(tampered_assets)
)
tampered_collection["stateCounts"] = {
    state: sum(
        row["state"] == state for row in tampered_collection["validTimes"]
    )
    for state in producer.CURRENT_OPERATIONAL_LEDGER_STATES
}
assert not producer.current_operational_ledger_ready(
    tampered_terminal_ledger,
    tail_ledger["attestation"],
    targets,
    tail_reference,
    tail_reference + timedelta(hours=117),
    producer.target_fingerprint(targets),
)

with tempfile.TemporaryDirectory() as temporary_directory:
    original_output = producer.OUTPUT_PATH
    original_fallback = producer.DEPLOYED_FALLBACK_PATH
    temporary_root = Path(temporary_directory)
    producer.OUTPUT_PATH = temporary_root / "live" / "dmi-bulk-cache.json"
    producer.DEPLOYED_FALLBACK_PATH = temporary_root / "deployed.json"
    fallback_document = {
        **document,
        "zoneRegistrySignature": "test-registry",
        "generatedAt": valid_time,
    }
    producer.DEPLOYED_FALLBACK_PATH.write_text(
        json.dumps(fallback_document),
        encoding="utf-8",
    )
    try:
        selected = producer.load_previous("test-registry")
        producer.atomic_write_bulk_cache(selected)
        assert producer.load_bulk_document(producer.OUTPUT_PATH) == fallback_document

        progressive_document = {
            "schemaVersion": 2,
            "zoneRegistrySignature": "test-registry",
            "generatedAt": "2026-01-01T05:00:00Z",
            "checkpointedAt": "2026-01-01T06:00:00Z",
            "sourceUpdatedAt": "2026-01-01T04:00:00Z",
            "collectionState": {
                "dkss_lf": {"lastAttemptAt": "2026-01-01T05:30:00Z"},
            },
            "runs": {
                "dkss_lf": {"referenceTime": "2026-01-01T00:00:00Z"},
            },
            "zones": {
                "PART::TEST": {
                    "hourly": {},
                    "gridPoints": {},
                    "collections": {},
                },
            },
        }
        producer.OUTPUT_PATH.write_text(
            json.dumps(progressive_document),
            encoding="utf-8",
        )
        selected = producer.load_previous(
            "test-registry",
            coastal_part_targets=targets,
            production_reference=reference,
        )
        assert selected["generatedAt"] == progressive_document["generatedAt"]
        assert selected["checkpointedAt"] == progressive_document["checkpointedAt"]
        assert selected["collectionState"] == progressive_document["collectionState"]
        assert selected["runs"] == progressive_document["runs"]
        assert strict_verified_part_current_pair_count(
            selected,
            targets,
            reference - timedelta(hours=48),
            reference + timedelta(hours=117),
        ) == 0
        producer.atomic_write_bulk_cache(selected)
        materialized = producer.load_bulk_document(producer.OUTPUT_PATH)
        assert strict_verified_part_current_pair_count(
            materialized,
            targets,
            reference - timedelta(hours=48),
            reference + timedelta(hours=117),
        ) == 0

        partial_primary = json.loads(json.dumps(progressive_document))
        mismatched_source = json.loads(json.dumps(source))
        mismatched_source["modelRun"] = "2025-12-31T18:00:00Z"
        partial_primary["zones"]["PART::TEST"]["hourly"][valid_time] = {
            "time": valid_time,
            "current-u": 0.9,
            "sources": {"current": mismatched_source},
        }
        producer.OUTPUT_PATH.write_text(
            json.dumps(partial_primary),
            encoding="utf-8",
        )
        producer.DEPLOYED_FALLBACK_PATH.write_text(
            json.dumps(fallback_document),
            encoding="utf-8",
        )
        atomic_selected = producer.load_previous(
            "test-registry",
            coastal_part_targets=targets,
            production_reference=reference,
        )
        atomic_row = atomic_selected["zones"]["PART::TEST"]["hourly"][valid_time]
        assert atomic_row["current-u"] == 0.9
        assert "current-v" not in atomic_row
        assert strict_verified_part_current_pair_count(
            atomic_selected,
            targets,
            reference - timedelta(hours=48),
            reference + timedelta(hours=117),
        ) == 0

        # Positive load_previous integration: a genuinely strict READY donor
        # restores an attested current row even when a newer candidate already
        # has a nonempty partial weather row at that time. U/V/source are copied
        # atomically, unrelated fields survive, and retained selection carries
        # the exact proof.
        strict_donor_hour = tail_direct_hours[0]
        strict_partial_primary = json.loads(json.dumps(progressive_document))
        strict_partial_primary["generatedAt"] = producer.canonical_time(
            tail_reference + timedelta(hours=1)
        )
        strict_partial_primary["checkpointedAt"] = producer.canonical_time(
            tail_reference + timedelta(hours=2)
        )
        strict_partial_primary["zones"]["PART::TEST"].update({
            "samplingPoint": [2.0, 1.0],
            "parentZoneId": "TEST",
            "entityType": "coastal-part",
            "samplingContext": "coastal-part-water-point",
        })
        strict_partial_primary["zones"]["PART::TEST"]["hourly"] = {
            strict_donor_hour: {
                "time": strict_donor_hour,
                "wind-u-10m": 1.25,
                "wind-v-10m": -0.75,
            },
        }
        strict_partial_primary["zones"]["PART::TEST"]["gridPoints"].update({
            "current-u": {"longitude": 2.0, "latitude": 1.0},
            "current-v": {"longitude": 2.5, "latitude": 1.0},
            "wind-u-10m": {"longitude": 2.0, "latitude": 1.0},
            "wind-v-10m": {"longitude": 2.0, "latitude": 1.0},
        })
        strict_partial_primary["zones"]["PART::TEST"]["collections"].update({
            "current-u": "dkss_idw",
            "current-v": "dkss_nsbs",
            "wind-u-10m": "harmonie_dini_sf",
            "wind-v-10m": "harmonie_dini_sf",
        })
        producer.OUTPUT_PATH.write_text(
            json.dumps(strict_partial_primary),
            encoding="utf-8",
        )
        producer.DEPLOYED_FALLBACK_PATH.write_text(
            json.dumps(tail_ledger_document),
            encoding="utf-8",
        )
        strict_selected_proofs: list[dict] = []
        strict_selected = producer.load_previous(
            "test-registry",
            coastal_part_targets=targets,
            production_reference=tail_reference,
            retained_current_asset_proofs=strict_selected_proofs,
        )
        strict_selected_row = strict_selected["zones"]["PART::TEST"][
            "hourly"
        ][strict_donor_hour]
        strict_donor_row = tail_ledger_document["zones"]["PART::TEST"][
            "hourly"
        ][strict_donor_hour]
        assert strict_selected_row["wind-u-10m"] == 1.25
        assert strict_selected_row["wind-v-10m"] == -0.75
        assert strict_selected_row["current-u"] == strict_donor_row["current-u"]
        assert strict_selected_row["current-v"] == strict_donor_row["current-v"]
        strict_selected_source = producer.canonical_current_source_asset(
            strict_selected_row["sources"]["current"]
        )
        assert strict_selected_source is not None
        assert any(
            proof["sourceAsset"] == strict_selected_source
            and target["partId"] in proof["attestedPartIds"]
            for proof in strict_selected_proofs
        )
        strict_selected_zone = strict_selected["zones"]["PART::TEST"]
        assert "current-u" not in strict_selected_zone["gridPoints"]
        assert "current-v" not in strict_selected_zone["gridPoints"]
        assert strict_selected_zone["gridPoints"]["wind-u-10m"] == {
            "longitude": 2.0,
            "latitude": 1.0,
        }
        assert strict_selected_zone["gridPoints"]["wind-v-10m"] == {
            "longitude": 2.0,
            "latitude": 1.0,
        }
        assert producer.sanitize_vector_integrity(strict_selected_zone) == []
        assert "current-u" in strict_selected_row
        assert "current-v" in strict_selected_row

        # A current row whose primary ledger already supplies the same exact
        # validated pair/source proof remains authoritative during donor merge.
        proof_backed_primary = json.loads(json.dumps(tail_ledger_document))
        proof_backed_primary["checkpointedAt"] = producer.canonical_time(
            tail_reference + timedelta(hours=2)
        )
        proof_backed_primary["zones"]["PART::TEST"]["hourly"][
            strict_donor_hour
        ]["primaryProofBackedMarker"] = True
        proof_backed_donor = json.loads(json.dumps(tail_ledger_document))
        proof_backed_donor["zones"]["PART::TEST"]["hourly"][
            strict_donor_hour
        ]["donorReplacementMarker"] = True
        producer.OUTPUT_PATH.write_text(
            json.dumps(proof_backed_primary),
            encoding="utf-8",
        )
        producer.DEPLOYED_FALLBACK_PATH.write_text(
            json.dumps(proof_backed_donor),
            encoding="utf-8",
        )
        preserved_primary = producer.load_previous(
            "test-registry",
            coastal_part_targets=targets,
            production_reference=tail_reference,
        )
        preserved_row = preserved_primary["zones"]["PART::TEST"]["hourly"][
            strict_donor_hour
        ]
        assert preserved_row["primaryProofBackedMarker"] is True
        assert "donorReplacementMarker" not in preserved_row

        incompatible_fallback = {
            **fallback_document,
            "zoneRegistrySignature": "other-registry",
        }
        producer.DEPLOYED_FALLBACK_PATH.write_text(
            json.dumps(incompatible_fallback),
            encoding="utf-8",
        )
        producer.OUTPUT_PATH.write_text(
            json.dumps(progressive_document),
            encoding="utf-8",
        )
        incompatible_selected = producer.load_previous(
            "test-registry",
            coastal_part_targets=targets,
            production_reference=reference,
        )
        assert strict_verified_part_current_pair_count(
            incompatible_selected,
            targets,
            reference - timedelta(hours=48),
            reference + timedelta(hours=117),
        ) == 0

        # A parseable cache with isolated malformed leaves is salvaged in
        # place. The invalid current tuple becomes a real gap, while another
        # valid current hour and unrelated components remain reusable. The
        # aggregate diagnostic contains no zone/time/source payload.
        granular = json.loads(json.dumps(tail_ledger_document))
        granular_hours = list(granular["zones"]["PART::TEST"]["hourly"])
        invalid_current_hour, preserved_current_hour = granular_hours[:2]
        granular_invalid_row = granular["zones"]["PART::TEST"]["hourly"][
            invalid_current_hour
        ]
        granular_invalid_row["sources"]["current"]["gridPoint"] = "invalid"
        granular_preserved_row = granular["zones"]["PART::TEST"]["hourly"][
            preserved_current_hour
        ]
        granular_preserved_row["significant-wave-height"] = 1.2
        granular_preserved_row["sources"]["wave"] = "invalid"
        granular["zones"]["PART::TEST"]["hourly"][
            "2030-01-01T00:00:00Z"
        ] = "invalid"
        granular["zones"]["PART::TEST"].setdefault("gridPoints", {})[
            "water-temperature"
        ] = "invalid"
        producer.OUTPUT_PATH.write_text(json.dumps(granular), encoding="utf-8")
        producer.DEPLOYED_FALLBACK_PATH.write_text("{}", encoding="utf-8")
        granular_proofs: list[dict] = []
        deferred_granular: dict[str, bool] = {}
        original_granular_bytes = producer.OUTPUT_PATH.read_bytes()
        deferred_selected = producer.load_previous(
            "test-registry", coastal_part_targets=targets,
            production_reference=tail_reference,
            deferred_recovery_checkpoint=deferred_granular,
        )
        assert deferred_granular == {"pending": True}
        assert producer.OUTPUT_PATH.read_bytes() == original_granular_bytes, (
            "Deferred sanitation cannot retire bulk proofs before shadow migration persists"
        )
        assert "current-u" not in deferred_selected["zones"]["PART::TEST"]["hourly"][invalid_current_hour]
        granular_selected = producer.load_previous(
            "test-registry",
            coastal_part_targets=targets,
            production_reference=tail_reference,
            retained_current_asset_proofs=granular_proofs,
        )
        granular_zone = granular_selected["zones"]["PART::TEST"]
        assert "current-u" not in granular_zone["hourly"][invalid_current_hour]
        assert "current-v" not in granular_zone["hourly"][invalid_current_hour]
        assert "current" not in granular_zone["hourly"][invalid_current_hour].get(
            "sources", {}
        )
        assert "current-u" in granular_zone["hourly"][preserved_current_hour]
        assert "current-v" in granular_zone["hourly"][preserved_current_hour]
        assert "significant-wave-height" not in granular_zone["hourly"][
            preserved_current_hour
        ]
        assert "2030-01-01T00:00:00Z" not in granular_zone["hourly"]
        assert "water-temperature" not in granular_zone["gridPoints"]
        granular_report = granular_selected["diagnostics"][
            "cacheLeafSanitization"
        ]
        assert granular_report["code"] == "DMI_CACHE_INVALID_LEAVES_DROPPED"
        assert granular_report["droppedHourCount"] == 1
        assert granular_report["droppedSourceComponentCount"] == 2
        assert granular_report["droppedGridPointCount"] == 1
        report_text = json.dumps(granular_report)
        assert "PART::TEST" not in report_text
        assert invalid_current_hour not in report_text
        assert "gridPoint" not in report_text
        assert strict_verified_part_current_pair_count(
            granular_selected,
            targets,
            tail_reference,
            tail_reference + timedelta(hours=117),
        ) == len(granular_hours) - 1
        assert granular_proofs, (
            "independently proven rows must survive one malformed cache leaf"
        )
        granular_proof_pairs = {
            (part_id, proof["sourceAsset"]["validTime"])
            for proof in granular_proofs
            for part_id in proof["attestedPartIds"]
        }
        assert (target["partId"], preserved_current_hour) in granular_proof_pairs
        assert (target["partId"], invalid_current_hour) not in granular_proof_pairs

        # Truncated/unparseable bytes are still document-level corruption:
        # quarantine and fail closed when no strict READY donor exists.
        producer.OUTPUT_PATH.write_text('{"schemaVersion":2,', encoding="utf-8")
        producer.DEPLOYED_FALLBACK_PATH.write_text("{}", encoding="utf-8")
        try:
            producer.load_previous("test-registry")
            raise AssertionError("truncated cache unexpectedly survived")
        except RuntimeError as exc:
            assert "no strict READY active recovery donor" in str(exc)
        assert list(producer.OUTPUT_PATH.parent.glob(
            f"{producer.OUTPUT_PATH.name}.invalid-*"
        ))
    finally:
        producer.OUTPUT_PATH = original_output
        producer.DEPLOYED_FALLBACK_PATH = original_fallback

for field, wrong in (
    ("entityId", "PART::OTHER"),
    ("parentZoneId", "ZONE-OTHER"),
    ("gridDefinitionSha256", "c" * 63),
    ("distanceKm", 1.0),
    ("modelRun", "2026-01-02T00:00:00Z"),
    ("nativeValidTime", "2026-01-01T06:00:00Z"),
    ("collection", "wam_dw"),
    ("vectorSelection", "nearest-shared-grid-cell-no-spatial-interpolation"),
    ("itemId", ""),
    ("acquiredAt", "invalid"),
):
    altered = {**source, field: wrong}
    assert not complete_native_source_for_hour(altered, "current", zone["id"], entity, valid_time), field

for field in ("modelRun", "nativeValidTime", "acquiredAt"):
    altered = {**source, field: str(source[field]).removesuffix("Z")}
    assert not complete_native_source_for_hour(altered, "current", zone["id"], entity, valid_time), field

assert producer.native_component_source(
    "wam_dw",
    "2026-01-01T00:00:00Z",
    valid_time,
    component="current",
    zone=zone,
    grid_candidate=candidate,
    capture=capture,
    spatial_selection="nearest-shared-grid-cell-no-spatial-interpolation",
) is None
assert producer.native_component_source(
    "dkss_lf",
    "2026-01-01T00:00:00Z",
    valid_time,
    component="current",
    zone=zone,
    grid_candidate=candidate,
    capture=None,
    spatial_selection="nearest-shared-grid-cell-no-spatial-interpolation",
) is None

print("OK: DMI producer and import-safe native provenance verifier have exact parity.")


# One normal-caller Linux lease regression. The existing tests above keep their
# decoder stubs; this child imports the actual pinned ecCodes in a fresh process.
# No provider, received/private original, kernel mock or new product executor.
if sys.platform == "linux":
    import os as _lease_os
    import select as _lease_select
    import shutil as _lease_shutil
    import signal as _lease_signal
    import subprocess as _lease_subprocess
    import time as _lease_time

    _lease_native = r"""
import copy, errno, fcntl, hashlib, importlib.util, json, os, pathlib, signal, sys
if sys.stdin.buffer.read(1) != b"G":
    raise SystemExit(78)
import eccodes as ec
assert ec.codes_get_api_version() == "2.48.2"
source, directory, scenario = pathlib.Path(sys.argv[1]), pathlib.Path(sys.argv[2]), sys.argv[3]
os.environ["DMI_BULK_RAW_DIR"] = str(directory)
sys.path.insert(0, str(source.parent))
spec = importlib.util.spec_from_file_location("lease_native_producer", source)
p = importlib.util.module_from_spec(spec)
sys.modules[spec.name] = p
spec.loader.exec_module(p)
assert p.RAW_DIR.resolve() == directory.resolve()
path = directory / "own-two-message.grib"
gid = ec.codes_grib_new_from_samples("regular_ll_sfc_grib1")
try:
    for key, value in (("Ni", 3), ("Nj", 3),
            ("latitudeOfFirstGridPointInDegrees", 56.5),
            ("latitudeOfLastGridPointInDegrees", 56.7),
            ("longitudeOfFirstGridPointInDegrees", 9.),
            ("longitudeOfLastGridPointInDegrees", 9.2),
            ("iDirectionIncrementInDegrees", .1), ("jDirectionIncrementInDegrees", .1),
            ("scanningMode", 64), ("resolutionAndComponentFlags", 128),
            ("dataDate", 20261009), ("dataTime", 0), ("stepRange", "0")):
        ec.codes_set(gid, key, value)
    with path.open("xb") as writer:
        for parameter, value in ((49, .25), (50, -.5)):
            ec.codes_set(gid, "indicatorOfParameter", parameter)
            ec.codes_set_values(gid, [value] * 9)
            writer.write(ec.codes_get_message(gid))
finally:
    ec.codes_release(gid)
original = path.read_bytes()
assert 0 < len(original) < 1024 * 1024
initial = path.stat()
when = "2026-10-09T00:00:00Z"
capture = {"collection": "dkss_lf", "modelRun": when, "validTime": when,
    "itemId": "own-lease-native", "acquiredAt": when,
    "assetIdentitySha256": hashlib.sha256(b"own-lease-native").hexdigest(),
    "assetSizeBytes": len(original), "contentLengthBytes": len(original),
    "contentSha256": hashlib.sha256(original).hexdigest()}
manifest = p.load_raw_cache_manifest()
manifest.setdefault("assets", {})[path.name] = capture
p.save_raw_cache_manifest(manifest)
manifest_bytes = p.raw_cache_manifest_path().read_bytes()
sentinel = directory / "original-bank.sentinel"
sentinel.write_bytes(b"old B/S history - never rewritten")
sentinel_bytes = sentinel.read_bytes()
zone = {"id": "PART::SYNTHETIC", "parentZoneId": "SYNTHETIC", "coastalPart": True,
    "coastType": "limfjord", "lat": 56.6, "lon": 9.1}
output = {"generatedAt": when, "zones": {zone["id"]: {
    **p.sampling_identity(zone), "hourly": {}, "gridPoints": {}, "collections": {}}}}
diagnostics, outcomes = {}, {}
if scenario == "header-statistics":
    # This normal stage slot exists even for unsupported fields. Keep the
    # complete output-equality oracle, without changing the four lease cases.
    output["zones"][zone["id"]]["marineSelection"] = {}
before = copy.deepcopy((output, diagnostics, outcomes))
seen, flushes = [], []

if scenario in {"current-only", "cached-current-history"}:
    # Same actual pinned decoder, parser, read lease and COW transaction as the
    # existing lease cases. Own generated fixtures only; never provider data.
    current_zone = {**zone, "lat": 56.15, "lon": 8.3}
    expected_point = [8.3, 56.15]  # midpoint of fixture endpoints, NOT ecCodes coordinates
    snapshots, current_rows, scalar_rows = [], [], []

    def own_bitmap_fixture(name, parameters, split_pair=False):
        fixture_path = directory / name
        assert not fixture_path.exists()
        handle = ec.codes_grib_new_from_samples("regular_ll_sfc_grib1")
        scalar_reference = None
        try:
            for key, value in (("Ni", 3), ("Nj", 3),
                    ("latitudeOfFirstGridPointInDegrees", 56.),
                    ("latitudeOfLastGridPointInDegrees", 56.3),
                    ("longitudeOfFirstGridPointInDegrees", 8.),
                    ("longitudeOfLastGridPointInDegrees", 8.6),
                    ("iDirectionIncrementInDegrees", .299),
                    ("jDirectionIncrementInDegrees", .149),
                    ("scanningMode", 64), ("resolutionAndComponentFlags", 128),
                    ("dataDate", 20261009), ("dataTime", 0), ("stepRange", "0"),
                    ("bitmapPresent", 1)):
                ec.codes_set(handle, key, value)
            assert ec.codes_get(handle, "edition") == 1
            assert ec.codes_get(handle, "Ni") == ec.codes_get(handle, "Nj") == 3
            missing = ec.codes_get(handle, "missingValue")
            with fixture_path.open("xb") as writer:
                for parameter in parameters:
                    ec.codes_set(handle, "indicatorOfParameter", parameter)
                    center_value = {49: 0., 50: -.5, 82: 7.}[parameter]
                    values = [missing] * 9 if split_pair else [center_value + n + 1 for n in range(9)]
                    values[0] = missing
                    selected_index = 5 if split_pair and parameter == 50 else 4
                    values[selected_index] = center_value
                    ec.codes_set_values(handle, values)
                    bitmap = list(ec.codes_get_array(handle, "bitmap"))
                    assert bitmap[0] == 0 and bitmap[selected_index] == 1
                    native = ec.codes_get_elements(handle, "values", [0, selected_index])
                    assert native[0] == missing and native[1] == center_value
                    if parameter == 82:
                        nearest = ec.codes_grib_find_nearest(handle, current_zone["lat"], current_zone["lon"], npoints=4)
                        scalar_reference = min(nearest, key=lambda row: row["distance"])
                        assert int(scalar_reference["index"]) == 4
                        scalar_reference = {"point": [round(float(scalar_reference["lon"]), 5),
                            round(float(scalar_reference["lat"]), 5)], "value": center_value}
                        # Ensure this fixture actually distinguishes rounded native
                        # scalar coordinates from the current endpoint construction.
                        assert max(abs(a - b) for a, b in zip(scalar_reference["point"], expected_point)) > .0001
                    writer.write(ec.codes_get_message(handle))
        finally:
            ec.codes_release(handle)
        payload = fixture_path.read_bytes()
        assert 0 < len(payload) < 1024 * 1024
        fixture_capture = {**capture, "itemId": name,
            "assetIdentitySha256": hashlib.sha256(name.encode()).hexdigest(),
            "assetSizeBytes": len(payload), "contentLengthBytes": len(payload),
            "contentSha256": hashlib.sha256(payload).hexdigest()}
        fixture_manifest = p.load_raw_cache_manifest()
        fixture_manifest.setdefault("assets", {})[fixture_path.name] = fixture_capture
        p.save_raw_cache_manifest(fixture_manifest)
        return fixture_path, payload, fixture_capture, scalar_reference


    if scenario == "cached-current-history":
        import contextlib, io
        fixture_path, payload, _, _ = own_bitmap_fixture(
            "own-current-history.grib", (49, 50, 82))
        href = "https://owned-fixture.invalid/current-history.grib"
        raw_path = p.cached_asset_path(href)
        with raw_path.open("xb") as writer:
            writer.write(payload)
        p.register_raw_cache_asset(
            raw_path, href, "dkss_lf", when, when,
            item_id="own-current-history", acquired_at=when,
            expected_size=len(payload), content_sha256=hashlib.sha256(payload).hexdigest(),
        )
        immutable_manifest = p.raw_cache_manifest_path().read_bytes()
        history_zones = [current_zone, {**current_zone, "id": "PART::SYNTHETIC-2"}]
        target = p.canonical_time(p.datetime.fromisoformat(when.replace("Z", "+00:00"))
            + p.timedelta(hours=79))
        initial_state = p.canonical_time(p.datetime.fromisoformat(target.replace("Z", "+00:00"))
            - p.timedelta(hours=28))
        rows = [{
            "partId": z["id"].removeprefix("PART::"), "zoneId": "SYNTHETIC",
            "parentZoneId": z["parentZoneId"], "entityId": z["id"],
            "samplingPoint": [z["lon"], z["lat"]], "samplingContextKey": "sha256:" + "1" * 64,
            "initialSource": "EXISTING_INTEGRATED", "initialStateAt": initial_state,
            "initialStateSha256": "sha256:" + "2" * 64, "startAt": when, "endAt": target,
        } for z in history_zones]
        demands = p.current_history_demands(rows, history_zones, target)
        assert len(demands) == 2 and all(d["startAt"] == when for d in demands.values())
        wrong_activation = copy.deepcopy(rows)
        wrong_activation[0]["initialSource"] = "POINT_ACTIVATION"
        try:
            p.current_history_demands(wrong_activation, history_zones, target)
        except ValueError as error:
            assert str(error) == "DMI_CURRENT_HISTORY_DEMAND_INVALID"
        else:
            raise AssertionError("activation prior to the locked target was admitted")

        # Build genuine OLD-format provenance from actual ecCodes coordinates,
        # not by stripping a new receipt or inventing captured byte metadata.
        old_fields = {}
        with p._grib_read_scope(raw_path, "dkss_lf", when, when) as original_reader:
            original_capture = dict(original_reader.capture)
            while True:
                gid = ec.codes_grib_new_from_file(original_reader.handle)
                if gid is None:
                    original_reader.check()
                    break
                try:
                    parameter = p.classify_parameter(gid, "dkss_lf")
                    nearest = min(ec.codes_grib_find_nearest(
                        gid, current_zone["lat"], current_zone["lon"], npoints=4),
                        key=lambda value: value["distance"])
                    assert int(nearest["index"]) == 4
                    lat, lon = float(nearest["lat"]), float(nearest["lon"])
                    old_fields[parameter] = (
                        float(ec.codes_get_elements(gid, "values", [4])[0]),
                        {"latitude": lat, "longitude": lon,
                         "distanceKm": p.haversine_km(current_zone["lat"], current_zone["lon"], lat, lon),
                         "gridDefinitionSha256": p.grid_definition_sha256(gid)},
                        p.vector_vertical_layer("current", p.safe_get(gid, "typeOfLevel"), p.safe_get(gid, "level")),
                    )
                finally:
                    ec.codes_release(gid)
        assert set(old_fields) == {"current-u", "current-v", "sea-mean-deviation"}
        assert old_fields["current-u"][1:] == old_fields["current-v"][1:]
        registry = p.sampling_registry_signature()
        document = {"schemaVersion": 2, "generatedAt": when, "zoneRegistrySignature": registry,
            "currentVectorSemanticsVersion": p.CURRENT_VECTOR_SEMANTICS_VERSION,
            "currentVectorSelection": p.CURRENT_VECTOR_SELECTION,
            "currentMaxDistanceKm": p.CURRENT_MAX_DISTANCE_KM, "timeStrideHours": 3,
            "zones": {}}
        for z in history_zones:
            candidate, layer = old_fields["current-u"][1:]
            native = p.native_component_source("dkss_lf", when, when,
                component="current", zone=z, grid_candidate=candidate, capture=original_capture,
                spatial_selection=p.COMPONENT_SPATIAL_SELECTION["current"],
                vectorSelection=p.CURRENT_VECTOR_SELECTION,
                vectorSemanticsVersion=p.CURRENT_VECTOR_SEMANTICS_VERSION,
                verticalLayer=layer[0], verticalLayerRankM=layer[1])
            water = p.native_component_source("dkss_lf", when, when,
                component="waterLevel", zone=z, grid_candidate=old_fields["sea-mean-deviation"][1],
                capture=original_capture, spatial_selection=p.COMPONENT_SPATIAL_SELECTION["waterLevel"])
            assert native is not None and water is not None and "nativeGridSampling" not in native
            document["zones"][z["id"]] = {**p.sampling_identity(z), "gridPoints": {}, "collections": {},
                "hourly": {when: {"time": when,
                    "current-u": old_fields["current-u"][0], "current-v": old_fields["current-v"][0],
                    "sea-mean-deviation": old_fields["sea-mean-deviation"][0],
                    "sources": {"current": native, "waterLevel": water}}}}
        original_document = copy.deepcopy(document)
        # Recreate OLD native values from the SAME owned RAW bytes. This runs
        # the new helper, not an archived producer or a NEW receipt stripped off.
        from lib.dmi_legacy_current_originals import decode_legacy_current_originals
        # This actual OLD decoder has its own fixed20/4/9 algorithm identity;
        # never label it with a later normal NEW parser/grid signature.
        legacy_signature = (f"parser:20|params:4|grid:9|eccodes-api:{p.ECCODES_API_VERSION}"
            f"|eccodes-binding:{p.ECCODES_BINDING_VERSION}|zones:{registry}")
        legacy_requests = [{"zone": copy.deepcopy(z),
            "expectedSource": copy.deepcopy(document["zones"][z["id"]]["hourly"][when]["sources"]["current"]),
            "capture": p.canonical_current_source_asset(document["zones"][z["id"]]["hourly"][when]["sources"]["current"]),
            "processingSignature": legacy_signature} for z in history_zones]
        with p._grib_read_scope(raw_path, "dkss_lf", when, when) as legacy_reader:
            p._exact_original_headers(legacy_reader, legacy_requests[0]["capture"])
            def release_legacy_message(gid, first):
                try:
                    ec.codes_release(gid)
                except BaseException as release_error:
                    legacy_reader.native_handles.append(gid)
                    legacy_reader._retain(release_error)
                    legacy_reader._refuse("DMI_GRIB_NATIVE_RELEASE_UNPROVED",
                        first if first is not None else release_error)
            legacy_ops = {"new_message": ec.codes_grib_new_from_file,
                "release_message": release_legacy_message, "get": ec.codes_get,
                "get_elements": ec.codes_get_elements, "find_nearest": ec.codes_grib_find_nearest,
                "nearest_new": p.codes_grib_nearest_new, "nearest_find": p.codes_grib_nearest_find,
                "nearest_delete": p.codes_grib_nearest_delete, "same_grid": p.CODES_GRIB_NEAREST_SAME_GRID,
                "out_of_area_error": ec.OutOfAreaError, "classify_parameter": p.classify_parameter,
                "candidate_target": p.grid_candidate_target, "stop_requested": p.should_stop_work,
                "processing_signature": legacy_signature}
            reconstructed_old = decode_legacy_current_originals(legacy_reader, legacy_requests, operations=legacy_ops)
            assert legacy_reader.handle.tell() == len(payload)
        assert legacy_reader.physically_closed and not p._UNSETTLED_GRIB_READS
        for item in reconstructed_old:
            expected_row = document["zones"][item["zoneId"]]["hourly"][when]
            assert item["row"] == {"time": when, "current-u": expected_row["current-u"],
                "current-v": expected_row["current-v"], "sources": {"current": expected_row["sources"]["current"]}}
            assert "nativeGridSampling" not in item["row"]["sources"]["current"]
        assert document == original_document
        assert raw_path.read_bytes() == payload and p.raw_cache_manifest_path().read_bytes() == immutable_manifest
        # Exercise the actual normal producer caller too, not merely its pure
        # helper. Only the destination ROOT and a transparent scope observer
        # change; real owned leases/ecCodes/EOF/close remain in charge.
        legacy_header = {key: document[key] for key in ("currentVectorSemanticsVersion",
            "currentVectorSelection", "currentMaxDistanceKm", "timeStrideHours", "generatedAt")}
        bound_legacy = {"requestsSha256": "sha256:" + hashlib.sha256(b"own native caller requests").hexdigest(),
            "contexts": {"deployedBulk": {"header": legacy_header, "zones": {
                z["id"].removeprefix("PART::"): p.sampling_identity(z) for z in history_zones}}},
            "requests": [{"requestId": "sha256:" + hashlib.sha256(z["id"].encode()).hexdigest(),
                "entityId": z["id"], "partId": z["id"].removeprefix("PART::"),
                "documentRole": "deployedBulk", "reconstructionRequest": request}
                for z, request in zip(history_zones, legacy_requests)]}
        native_legacy_readers = []
        saved_root, saved_scope = p.ROOT, p._grib_read_scope
        @contextlib.contextmanager
        def observed_legacy_scope(*args, **kwargs):
            with saved_scope(*args, **kwargs) as owned:
                native_legacy_readers.append(owned)
                yield owned
        try:
            p.ROOT, p._grib_read_scope = directory, observed_legacy_scope
            (directory / ".cache").mkdir(exist_ok=True)
            legacy_controller = p.ProgressCheckpointController(copy.deepcopy(document), set(), {"bytes": 0})
            with contextlib.redirect_stdout(io.StringIO()):
                native_legacy_originals = p.reconstruct_legacy_current_originals(bound_legacy,
                    legacy_controller, registry_signature=registry, reserve_seconds=0,
                    supervisor_skipped_assets=set())
            assert len(native_legacy_originals) == 2 and len(native_legacy_readers) == 1
            assert native_legacy_readers[0].physically_closed and not p._UNSETTLED_GRIB_READS
            try:
                os.fstat(native_legacy_readers[0].fd)
            except OSError as error:
                assert error.errno == errno.EBADF
            else:
                raise AssertionError("normal OLD caller returned before physical RAW close")
            native_sidecar = directory / p.LEGACY_CURRENT_OUTPUT_PATH
            assert json.loads(native_sidecar.read_bytes())["requestsSha256"] == bound_legacy["requestsSha256"]
            native_sidecar.unlink()
        finally:
            p.ROOT, p._grib_read_scope = saved_root, saved_scope
        native_legacy_plan = p.plan_cached_current_history(demands, native_legacy_originals, p.load_raw_cache_manifest())
        assert len(native_legacy_plan["jobs"]) == 1 and not native_legacy_plan["unavailable"]
        assert len(native_legacy_plan["originalsByKey"]) == 2
        assert document == original_document and raw_path.read_bytes() == payload
        assert p.raw_cache_manifest_path().read_bytes() == immutable_manifest
        originals = p.capture_current_history_originals(document, demands, registry)
        immutable_originals = copy.deepcopy(originals)
        plan = p.plan_cached_current_history(demands, originals, p.load_raw_cache_manifest())
        assert len(originals) == 2 and len(plan["jobs"]) == 1
        assert not plan["unavailable"]
        empty = p.plan_cached_current_history({}, [], {"assets": {}})
        assert not empty["jobs"] and not empty["originalsByKey"]

        # Same own bytes/official revision, captured again at another valid
        # acquisition time. Keep the old original and its full capture exact.
        exact_plan = plan
        original_manifest = p.load_raw_cache_manifest()
        reacquired_at = p.canonical_time(
            p.datetime.fromisoformat(when.replace("Z", "+00:00"))
            + p.timedelta(minutes=1))
        reacquired_manifest = copy.deepcopy(original_manifest)
        reacquired_manifest["assets"][raw_path.name]["acquiredAt"] = reacquired_at
        old_asset = p.canonical_current_source_asset(originals[0]["capture"])
        new_asset = p.canonical_current_source_asset(
            reacquired_manifest["assets"][raw_path.name])
        assert old_asset["acquiredAt"] != new_asset["acquiredAt"]
        assert {key: value for key, value in old_asset.items() if key != "acquiredAt"} == {
            key: value for key, value in new_asset.items() if key != "acquiredAt"}
        reacquired_plan = p.plan_cached_current_history(
            demands, originals, reacquired_manifest)
        assert len(reacquired_plan["jobs"]) == 1, "same exact original bytes must survive reacquisition"
        assert not reacquired_plan["unavailable"]
        assert reacquired_plan["jobs"][0]["capture"] == new_asset
        assert reacquired_plan["originalsByKey"] == plan["originalsByKey"]
        assert originals == immutable_originals

        # No other official identity, revision, declared size or byte hash may
        # inherit this exception. Each input is only a detached manifest copy.
        for changes in (
            {"itemId": "different-official-item"},
            {"itemCreatedAt": reacquired_at},
            {"itemUpdatedAt": reacquired_at},
            {"modelRun": p.canonical_time(p.datetime.fromisoformat(
                when.replace("Z", "+00:00")) - p.timedelta(hours=1))},
            {"contentSha256": "0" * 64},
            {"assetIdentitySha256": "0" * 64},
            {"contentLengthBytes": len(payload) + 1, "assetSizeBytes": len(payload) + 1},
            {"assetSizeBytes": None},
            {"acquiredAt": "invalid"},
        ):
            invalid_manifest = copy.deepcopy(reacquired_manifest)
            invalid_manifest["assets"][raw_path.name].update(changes)
            invalid_plan = p.plan_cached_current_history(
                demands, originals, invalid_manifest)
            assert not invalid_plan["jobs"]
            assert len(invalid_plan["unavailable"]) == len(originals)
            assert invalid_plan["originalsByKey"] == plan["originalsByKey"]
        # The genuine original-conflict seam must never choose one ambiguous
        # legacy tuple under the same complete capture. No href/hash is faked.
        conflicting_original = copy.deepcopy(originals[0])
        conflicting_original["row"]["current-u"] += .125
        try:
            p.plan_cached_current_history(
                demands, [*originals, conflicting_original], reacquired_manifest)
        except ValueError as error:
            assert str(error) == "DMI_CURRENT_HISTORY_ORIGINAL_CONFLICT"
        else:
            raise AssertionError("ambiguous old originals reached cached replay")
        assert originals == immutable_originals
        assert p.raw_cache_manifest_path().read_bytes() == immutable_manifest
        # Publish the second synthetic capture through normal registration.
        # The actual owned reader must measure these unchanged fixture bytes.
        p.register_raw_cache_asset(
            raw_path, href, "dkss_lf", when, when,
            item_id="own-current-history", acquired_at=reacquired_at,
            expected_size=len(payload), content_sha256=hashlib.sha256(payload).hexdigest())
        plan = p.plan_cached_current_history(demands, originals, p.load_raw_cache_manifest())
        assert len(plan["jobs"]) == 1 and not plan["unavailable"]
        assert plan["jobs"][0]["capture"] == new_asset
        working = copy.deepcopy(document)
        working["diagnostics"] = {}
        original_decode = p.codes_grib_new_from_file
        original_transition = p._same_original_current_decoder_transition
        original_write = p.write_checkpoint
        decoded, transition_results, flush_calls = [], [], []

        def forbidden_checkpoint(*args, **kwargs):
            raise AssertionError("this bounded fixture must not write a production checkpoint")

        def observe_decode(handle):
            assert fcntl.fcntl(handle.fileno(), fcntl.F_GETLEASE) == fcntl.F_RDLCK
            value = original_decode(handle)
            decoded.append((handle.fileno(), value is None))
            return value

        def observe_transition(*args, **kwargs):
            value = original_transition(*args, **kwargs)
            transition_results.append(value)
            return value

        p.codes_grib_new_from_file = observe_decode
        p._same_original_current_decoder_transition = observe_transition
        p.write_checkpoint = forbidden_checkpoint
        controller = p.ProgressCheckpointController(working, set(), {"bytes": 0})
        normal_flush = controller.flush_if_due

        def observe_flush(*args, **kwargs):
            for fd in {item[0] for item in decoded}:
                try:
                    os.fstat(fd)
                except OSError as error:
                    assert error.errno == errno.EBADF
                else:
                    raise AssertionError("checkpoint preceded actual owned-reader close")
            flush_calls.append(True)
            return normal_flush(*args, **kwargs)

        controller.flush_if_due = observe_flush
        options = {"processing_signature": p.current_marine_processing_signature(registry),
            "reserve_seconds": 0, "supervisor_skipped_assets": set()}
        with contextlib.redirect_stdout(io.StringIO()) as reported:
            summary = p.replay_cached_current_history(plan, working, controller, **options)
        assert "DMI_ASSET_PROCESSING_START=" in reported.getvalue()
        assert "DMI_ASSET_PROCESSING_END=" in reported.getvalue()
        assert summary["rawAssetCount"] == summary["traversedAssetCount"] == 1
        assert summary["qualifiedPartCount"] == 2 and summary["changedAssetCount"] == 1
        assert len(decoded) == 4 and decoded[-1][1] and len({item[0] for item in decoded}) == 1
        assert transition_results == [True, True] and flush_calls == [True]
        assert controller.committed_assets_since_write == 1 and controller.bulk_dirty
        for z in history_zones:
            hour = working["zones"][z["id"]]["hourly"][when]
            old = original_document["zones"][z["id"]]["hourly"][when]
            assert hour["sea-mean-deviation"] == old["sea-mean-deviation"]
            assert hour["sources"]["waterLevel"] == old["sources"]["waterLevel"]
            assert p.inspect_native_grid_sampling(hour["sources"]["current"])["status"] == "coherent"
            assert hour["sources"]["current"]["gridDefinitionSha256"] == old["sources"]["current"]["gridDefinitionSha256"]
            assert hour["sources"]["current"]["contentSha256"] == hashlib.sha256(payload).hexdigest()
            assert hour["sources"]["current"]["acquiredAt"] == reacquired_at
            assert old["sources"]["current"]["acquiredAt"] == old_asset["acquiredAt"]
            assert hour["sources"]["current"]["gridPoint"] == expected_point
        retained = copy.deepcopy(working)
        p.clean_and_summarize(retained, set(), {"bytes": 0}, current_history_requests=demands)
        assert all(when in retained["zones"][z["id"]]["hourly"] for z in history_zones)
        assert document == original_document and originals == immutable_originals

        # Repeat the actual owned RAW job against its own committed capture.
        # This new acquisition is deliberately absent from originalsByKey;
        # only the exact tuple already qualified by this plan can authorize it.
        for z in history_zones:
            committed_hour = working["zones"][z["id"]]["hourly"][when]
            committed_source = committed_hour["sources"]["current"]
            committed_capture = p.canonical_current_source_asset(committed_source)
            committed_key = (z["id"].removeprefix("PART::"), when,
                             p._current_history_json(committed_capture))
            assert committed_key not in plan["originalsByKey"]
            assert plan["derivedByKey"][committed_key] == (
                committed_hour["current-u"], committed_hour["current-v"], committed_source)
        before_repeat = copy.deepcopy(working)
        committed_assets_before_repeat = controller.committed_assets_since_write
        decoded.clear()
        with contextlib.redirect_stdout(io.StringIO()):
            repeated = p.replay_cached_current_history_job(
                plan["jobs"][0], plan, working, controller, **options)
        assert repeated == {"status": "TRAVERSED", "qualifiedPartCount": 0, "changed": False}
        assert len(decoded) == 4 and decoded[-1][1] and len({item[0] for item in decoded}) == 1
        for fd in {item[0] for item in decoded}:
            try:
                os.fstat(fd)
            except OSError as error:
                assert error.errno == errno.EBADF
            else:
                raise AssertionError("repeated RAW job retained its owned reader")
        assert controller.committed_assets_since_write == committed_assets_before_repeat
        # Parser observation counters may advance on a real second traversal;
        # every data row and all non-diagnostic state must remain exact.
        assert {key: value for key, value in working.items() if key != "diagnostics"} == {
            key: value for key, value in before_repeat.items() if key != "diagnostics"}
        assert document == original_document and originals == immutable_originals

        # All owned reads are now closed. Restore the exact first manifest and
        # plan before the unchanged original mismatch/EOF/lease-break cases.
        p.save_raw_cache_manifest(original_manifest)
        assert p.raw_cache_manifest_path().read_bytes() == immutable_manifest
        plan = exact_plan

        # The same real helper must refuse a mismatched full capture without
        # decoding, flushing, committing or modifying any previous working row.
        refused = copy.deepcopy(original_document)
        refused["diagnostics"] = {}
        refused_before = copy.deepcopy(refused)
        refused_controller = p.ProgressCheckpointController(refused, set(), {"bytes": 0})
        refused_controller.flush_if_due = lambda **kwargs: (_ for _ in ()).throw(
            AssertionError("failed history reached checkpoint flush"))
        mismatch = copy.deepcopy(plan["jobs"][0])
        mismatch["capture"]["contentSha256"] = "0" * 64
        decoded.clear()
        with contextlib.redirect_stdout(io.StringIO()):
            outcome = p.replay_cached_current_history_job(
                mismatch, plan, refused, refused_controller, **options)
        assert outcome == {"status": "UNAVAILABLE", "reason": "RAW_CAPTURE_MISMATCH"}
        assert not decoded and not refused_controller.bulk_dirty and refused == refused_before
        missing = copy.deepcopy(plan["jobs"][0])
        missing["path"] = directory / "never-created-history.grib"
        with contextlib.redirect_stdout(io.StringIO()):
            outcome = p.replay_cached_current_history_job(
                missing, plan, refused, refused_controller, **options)
        assert outcome == {"status": "UNAVAILABLE", "reason": "RAW_CAPTURE_UNAVAILABLE"}

        # Actual decoder EOF is reached first; the original failure then occurs
        # before the normal transaction can commit. No kernel/EOF success fake.
        eof_failure = RuntimeError("own failure after actual decoder EOF")
        def fail_after_eof(handle):
            value = observe_decode(handle)
            if value is None:
                raise eof_failure
            return value
        p.codes_grib_new_from_file = fail_after_eof
        with contextlib.redirect_stdout(io.StringIO()):
            try:
                p.replay_cached_current_history_job(
                    plan["jobs"][0], plan, refused, refused_controller, **options)
            except RuntimeError as error:
                assert error is eof_failure
            else:
                raise AssertionError("EOF failure reached history commit")
        assert decoded[-1][1] and refused == refused_before and not refused_controller.bulk_dirty
        assert not p._UNSETTLED_GRIB_READS

        # Real lease break, last in this child. Keep unknown ownership retained
        # until the outer parent's existing pidfd/reap proof permits cleanup.
        def break_owned_lease(handle):
            value = original_decode(handle)
            if value is not None:
                try:
                    fd = os.open(raw_path, os.O_WRONLY | os.O_NONBLOCK)
                except BlockingIOError:
                    pass
                else:
                    os.close(fd)
                    raise AssertionError("kernel admitted a writer while history held its read lease")
            return value
        p.codes_grib_new_from_file = break_owned_lease
        with contextlib.redirect_stdout(io.StringIO()):
            try:
                p.replay_cached_current_history_job(
                    plan["jobs"][0], plan, refused, refused_controller, **options)
            except p.GribReadUnproven:
                assert p._UNSETTLED_GRIB_READS
                held = p._UNSETTLED_GRIB_READS[-1]
                assert held.retained and not held.close_attempted
                assert held.handle.fileno() == held.fd
            else:
                raise AssertionError("unknown lease break admitted history")
        assert refused == refused_before and not refused_controller.bulk_dirty
        assert raw_path.read_bytes() == payload and fixture_path.read_bytes() == payload
        assert p.raw_cache_manifest_path().read_bytes() == immutable_manifest
        assert document == original_document and originals == immutable_originals
        assert path.read_bytes() == original and sentinel.read_bytes() == sentinel_bytes
        print(json.dumps({"case": scenario, "cachedAssetsDecoded": 1, "qualifiedParts": 2,
            "legacyOldNativeReconstruction": True,
            "legacyNormalOwnedCaller": True,
            "sameOwnedReadEOF": True, "originalsAndScalarsPreserved": True,
            "demandedRetention": True, "captureAndMissingRefused": True,
            "sameBytesDifferentAcquisition": True, "nonAcquisitionDifferencesRefused": True,
            "conflictingOriginalsRefused": True,
            "committedCaptureReplay": True,
            "lateEOFRollback": True, "actualLeaseBreakRetained": True}), flush=True)
        raise SystemExit(0)

    for label, parameters in (("scalar-first", (82, 49, 50)), ("current-first", (49, 50, 82))):
        fixture_path, payload, fixture_capture, scalar_reference = own_bitmap_fixture(
            "own-current-only-" + label + ".grib", parameters)
        fixture_manifest_bytes = p.raw_cache_manifest_path().read_bytes()
        stage = {"generatedAt": when, "zones": {current_zone["id"]: {
            **p.sampling_identity(current_zone), "hourly": {}, "gridPoints": {}, "collections": {}}}}
        stage_diagnostics, stage_outcomes = {}, {}
        p.GRID_INDEX_CACHE.clear()
        with p._grib_read_scope(fixture_path, "dkss_lf", when, when) as reader:
            owned_fd = reader.fd
            assert fcntl.fcntl(owned_fd, fcntl.F_GETLEASE) == fcntl.F_RDLCK
            result = p.process_grib_transactionally(fixture_path, "dkss_lf", when, when,
                [current_zone], stage, stage_diagnostics, current_part_outcomes=stage_outcomes,
                _owned_read=reader)
            assert result[0] == {"sea-mean-deviation", "current-u", "current-v"}
            assert result[3] == 3 and not result[2] and stage_outcomes["complete"] is True
            hour = stage["zones"][current_zone["id"]]["hourly"][when]
            assert (hour["current-u"], hour["current-v"]) == (0., -.5)
            source_current = hour["sources"]["current"]
            record = source_current["nativeGridSampling"]
            assert record["elementIndex"] == 4 and record["fieldSet"] == ["current-u", "current-v"]
            assert record["coordinateInterpretation"] == "dmi-dkss-grib1-header-endpoints-v1"
            assert record["gridPoint"] == source_current["gridPoint"] == expected_point
            assert source_current["contentSha256"] == fixture_capture["contentSha256"]
            assert p.complete_native_source_for_hour(source_current, "current", current_zone["id"],
                p.sampling_identity(current_zone), when)
            scalar = hour["sources"]["waterLevel"]
            assert scalar["gridPoint"] == scalar_reference["point"]
            assert hour["sea-mean-deviation"] == scalar_reference["value"]
            assert "nativeGridSampling" not in scalar
            keys = list(p.GRID_INDEX_CACHE)
            assert len(keys) == 2
            assert sum(key[0] == "current-native-grid-sampling-v1" for key in keys) == 1
            assert sum(key[0] == "dkss_lf" for key in keys) == 1
            current_rows.append((hour["current-u"], hour["current-v"], copy.deepcopy(record)))
            scalar_rows.append((hour["sea-mean-deviation"], copy.deepcopy(scalar["gridPoint"])))
        try:
            os.fstat(owned_fd)
        except OSError as exc:
            assert exc.errno == errno.EBADF
        else:
            raise AssertionError("current-only actual decoder fd remained open")
        assert not p._UNSETTLED_GRIB_READS
        assert fixture_path.read_bytes() == payload
        assert p.raw_cache_manifest_path().read_bytes() == fixture_manifest_bytes
        # Add ONLY inside the existing native current-only fixture's two-order
        # loop, after normal fd/manifest/bytes assertions and BEFORE snapshots.
        # The actual file and native source above are the test's existing owned
        # ecCodes fixture. No new test bank, fixture file, provider or decoder stub.
        import time
        wrapper_spec = importlib.util.spec_from_file_location(
            "coherent_current_native_wrapper", source.with_name("decode-coherent-current-originals.py"))
        wrapper = importlib.util.module_from_spec(wrapper_spec)
        wrapper_spec.loader.exec_module(wrapper)
        step_names = ("itemId", "assetIdentitySha256", "nativeValidTime", "leadTimeHours",
                      "acquiredAt", "optionalFieldSet", "itemCreatedAt", "itemUpdatedAt",
                      "nativeGridSampling", "gridPoint", "distanceKm")
        # A RAW manifest row may omit the two optional item timestamps. The
        # normal request boundary still requires the complete eleven-field
        # canonical asset, including both absent timestamps as None.
        wrapper_capture = p.canonical_current_source_asset(fixture_capture)
        assert wrapper_capture is not None
        assert set(wrapper_capture) == set(fixture_capture) | {"itemCreatedAt", "itemUpdatedAt"}
        assert len(wrapper_capture) == 11
        assert all(wrapper_capture[key] == value for key, value in fixture_capture.items())
        assert wrapper_capture["itemCreatedAt"] is None and wrapper_capture["itemUpdatedAt"] is None
        request = {"requestId": "a" * 64, "partId": current_zone["id"].removeprefix("PART::"),
                   "identity": p.sampling_identity(current_zone), "nativeValidTime": when,
                   "nativeStep": {key: copy.deepcopy(source_current[key]) for key in step_names if key in source_current},
                   "capture": copy.deepcopy(wrapper_capture)}
        job = {"capture": copy.deepcopy(wrapper_capture), "path": fixture_path,
               "requests": [request], "zones": {request["partId"]: current_zone}}
        before_inputs = copy.deepcopy((request, job, stage, stage_diagnostics, stage_outcomes))
        decoded, completed = wrapper.decode(p, [job], time.monotonic())
        assert completed == 1 and len(decoded) == 1
        assert decoded[0]["row"]["sources"]["current"] == source_current
        assert (decoded[0]["row"]["current-u"], decoded[0]["row"]["current-v"]) == (0., -.5)
        assert set(decoded[0]["row"]) == {"time", "current-u", "current-v", "sources"}
        assert set(decoded[0]["row"]["sources"]) == {"current"}
        assert "generatedAt" not in decoded[0]["header"]
        assert "forecastAgeHours" not in decoded[0]["row"]["sources"]["current"]
        assert (request, job, stage, stage_diagnostics, stage_outcomes) == before_inputs
        assert not p._UNSETTLED_GRIB_READS and fixture_path.read_bytes() == payload
        assert p.raw_cache_manifest_path().read_bytes() == fixture_manifest_bytes
        # The malformed nine-field fixture must remain refused; correcting the
        # test request does not loosen the unchanged full capture comparison.
        raw_manifest_job = copy.deepcopy(job)
        raw_manifest_job["capture"] = copy.deepcopy(fixture_capture)
        try:
            wrapper.decode(p, [raw_manifest_job], time.monotonic())
        except wrapper.Refused as error:
            assert str(error) == "COHERENT_CURRENT_ORIGINAL_OWNED_CAPTURE_MISMATCH"
        else:
            raise AssertionError("coherent CURRENT wrapper admitted a noncanonical RAW manifest row")
        assert fixture_path.read_bytes() == payload and not p._UNSETTLED_GRIB_READS
        assert p.raw_cache_manifest_path().read_bytes() == fixture_manifest_bytes
        # Existing full versus Python-seven-place identity guard; do not require
        # exact central==wire point or introduce an independent nearby tolerance.
        central_request = {**request, "identity": {**request["identity"], "samplingPoint": [8.00000004, 55.00000004]}}
        rounded_wire = {**central_request["identity"], "samplingPoint": [8., 55.]}
        assert wrapper.wire_matches(rounded_wire, central_request)
        assert not wrapper.wire_matches({**rounded_wire, "samplingPoint": [8.00000001, 55.]}, central_request)
        # A changed recorded native index must not be accepted just because the
        # same file and valid time can be decoded. No output escapes on refusal.
        wrong_job = copy.deepcopy(job)
        wrong_job["requests"][0]["nativeStep"]["nativeGridSampling"]["elementIndex"] += 1
        try:
            wrapper.decode(p, [wrong_job], time.monotonic())
        except RuntimeError as error:
            assert str(error) == "COHERENT_CURRENT_ORIGINAL_DECODE_MISMATCH"
        else:
            raise AssertionError("coherent CURRENT wrapper admitted a different native element")
        # All eleven capture fields remain authoritative; OLD's byte-identity
        # bridge does not grant CURRENT an acquiredAt relabelling authority.
        acquired_job = copy.deepcopy(job)
        acquired_job["capture"]["acquiredAt"] = "2026-01-01T00:00:01Z"
        if acquired_job["capture"]["acquiredAt"] == fixture_capture["acquiredAt"]:
            acquired_job["capture"]["acquiredAt"] = "2026-01-01T00:00:02Z"
        try:
            wrapper.decode(p, [acquired_job], time.monotonic())
        except wrapper.Refused as error:
            assert str(error) == "COHERENT_CURRENT_ORIGINAL_OWNED_CAPTURE_MISMATCH"
        else:
            raise AssertionError("coherent CURRENT wrapper relabelled acquisition time")
        assert fixture_path.read_bytes() == payload and not p._UNSETTLED_GRIB_READS
        assert p.raw_cache_manifest_path().read_bytes() == fixture_manifest_bytes
        # Reuse THESE actual GRIB bytes through normal manifest registration.
        # Original source is obtained by the CURRENT decoder, never hand-built.
        # A distinct local transport acquisition is not a restore-completed claim.
        old_root, old_raw = p.ROOT, p.RAW_DIR
        old_session = dict(p._RAW_CURRENT_SESSION_PROTECTED)
        normal_root = directory / ("coherent-distinct-" + label)
        (normal_root / ".cache/dmi-grib").mkdir(parents=True)
        try:
            p.ROOT, p.RAW_DIR = normal_root, normal_root / ".cache/dmi-grib"
            p.save_raw_cache_manifest({"schemaVersion": 2, "assets": {}})
            href = "https://opendataapi.dmi.dk/own-current-distinct-" + label + ".grib"
            normal_path = p.cached_asset_path(href)
            normal_path.write_bytes(payload)
            p.register_raw_cache_asset(normal_path, href, "dkss_lf", when, when,
                item_id="own-current-distinct-" + label, acquired_at=when,
                expected_size=len(payload), content_sha256=hashlib.sha256(payload).hexdigest())
            old_capture = p.canonical_current_source_asset(
                p.load_raw_cache_manifest()["assets"][normal_path.name])
            original_stage = {**decoded[0]["header"], "zones": {current_zone["id"]: {
                **p.sampling_identity(current_zone), "hourly": {}, "gridPoints": {}, "collections": {}}}}
            original_outcomes = {}
            with p._grib_read_scope(normal_path, "dkss_lf", when, when) as original_reader:
                normal_result = p.process_grib_transactionally(normal_path, "dkss_lf", when, when,
                    [current_zone], original_stage, {}, current_part_outcomes=original_outcomes,
                    allowed_parameters={"current-u", "current-v"}, _owned_read=original_reader)
                assert normal_result[0] == {"current-u", "current-v"} and not normal_result[2]
                assert original_outcomes["complete"] is True
            assert original_reader.physically_closed and not p._UNSETTLED_GRIB_READS
            original_row = copy.deepcopy(original_stage["zones"][current_zone["id"]]["hourly"][when])
            original_source = original_row["sources"]["current"]
            assert p.canonical_current_source_asset(original_source) == old_capture
            new_acquired = "2026-01-01T00:00:01Z" if old_capture["acquiredAt"] != "2026-01-01T00:00:01Z" else "2026-01-01T00:00:02Z"
            p.register_raw_cache_asset(normal_path, href, "dkss_lf", when, when,
                item_id="own-current-distinct-" + label, acquired_at=new_acquired,
                expected_size=len(payload), content_sha256=hashlib.sha256(payload).hexdigest())
            read_capture = p.canonical_current_source_asset(
                p.load_raw_cache_manifest()["assets"][normal_path.name])
            assert read_capture["acquiredAt"] != old_capture["acquiredAt"]
            assert all(read_capture[key] == value for key, value in old_capture.items() if key != "acquiredAt")
            actual_manifest = p.raw_cache_manifest_path().read_bytes()
            dual_request = {**request, "capture": copy.deepcopy(old_capture),
                "nativeStep": {key: copy.deepcopy(original_source[key]) for key in step_names if key in original_source}}
            strict_job = {"capture": copy.deepcopy(old_capture)}
            try:
                wrapper.raw_inventory(p, [strict_job])
            except wrapper.Refused as error:
                assert str(error) == "COHERENT_CURRENT_ORIGINAL_RAW_ACQUISITION_UNRESOLVED"
            else:
                raise AssertionError("DEFAULT acquisition-only refusal was weakened")
            dual_job = {"capture": copy.deepcopy(old_capture), "captureMode": "AUTHENTICATED_ORIGINAL_WITH_DISTINCT_MEASURED_READ_CAPTURE",
                "requests": [dual_request], "zones": {dual_request["partId"]: current_zone}}
            wrapper.raw_inventory(p, [dual_job])
            assert dual_job["transportCapture"] == read_capture and dual_job["capture"] == old_capture
            dual_before = copy.deepcopy((dual_job, dual_request))
            dual_rows, dual_completed = wrapper.decode(p, [dual_job], time.monotonic())
            assert dual_completed == 1 and len(dual_rows) == 1
            assert dual_rows[0]["row"] == original_row
            assert dual_rows[0]["capture"] == old_capture and dual_rows[0]["transportCapture"] == read_capture
            assert (dual_rows[0]["row"]["current-u"], dual_rows[0]["row"]["current-v"]) == (0., -.5)
            assert (dual_job, dual_request) == dual_before
            wrong_step = copy.deepcopy(dual_job)
            wrong_step["requests"][0]["nativeStep"]["nativeGridSampling"]["elementIndex"] += 1
            try:
                wrapper.decode(p, [wrong_step], time.monotonic())
            except RuntimeError as error:
                assert str(error) == "COHERENT_CURRENT_ORIGINAL_DECODE_MISMATCH"
            else:
                raise AssertionError("distinct capture bypassed the actual old native step")
            assert not p._UNSETTLED_GRIB_READS
            changed_bytes = payload[:-1] + bytes([payload[-1] ^ 1])
            assert len(changed_bytes) == len(payload)
            normal_path.write_bytes(changed_bytes)
            try:
                try:
                    wrapper.decode(p, [dual_job], time.monotonic())
                except wrapper.Refused as error:
                    assert str(error) == "COHERENT_CURRENT_ORIGINAL_OWNED_CAPTURE_MISMATCH"
                else:
                    raise AssertionError("distinct capture skipped full measured content SHA")
            finally:
                normal_path.write_bytes(payload)
            assert normal_path.read_bytes() == payload
            assert p.raw_cache_manifest_path().read_bytes() == actual_manifest
            assert not p._UNSETTLED_GRIB_READS and not p._UNSETTLED_ASSET_DOWNLOADS
        finally:
            p.ROOT, p.RAW_DIR = old_root, old_raw
            p._RAW_CURRENT_SESSION_PROTECTED.clear()
            p._RAW_CURRENT_SESSION_PROTECTED.update(old_session)
        snapshots.append((fixture_path, payload))
    assert current_rows[0] == current_rows[1] and scalar_rows[0] == scalar_rows[1]

    # Genuine bitmap-separated U and V cannot borrow a value from a different
    # native element. The real parser must finish but publish no synthetic pair.
    split_path, split_bytes, _, _ = own_bitmap_fixture("own-current-only-split.grib", (49, 50), True)
    split_manifest_bytes = p.raw_cache_manifest_path().read_bytes()
    split_output = {"generatedAt": when, "zones": {current_zone["id"]: {
        **p.sampling_identity(current_zone), "hourly": {}, "gridPoints": {}, "collections": {}}}}
    split_outcomes = {}
    split_result = p.process_grib_transactionally(split_path, "dkss_lf", when, when,
        [current_zone], split_output, {}, current_part_outcomes=split_outcomes)
    assert split_result[0] == {"current-u", "current-v"} and split_result[3] == 2 and not split_result[2]
    assert split_outcomes["complete"] is True
    assert all(not any(field in row for field in ("current-u", "current-v"))
        and "current" not in (row.get("sources") or {})
        for row in split_output["zones"][current_zone["id"]]["hourly"].values())
    assert split_path.read_bytes() == split_bytes and p.raw_cache_manifest_path().read_bytes() == split_manifest_bytes
    assert all(file.read_bytes() == payload for file, payload in snapshots)
    assert path.read_bytes() == original and sentinel.read_bytes() == sentinel_bytes
    assert not p._UNSETTLED_GRIB_READS
    print(json.dumps({"case": scenario, "actualMessages": 8, "fieldOrdersChecked": 2,
        "actualHeaderIndex": True, "bitmapZeroPreserved": True, "scalarNamespaceUnchanged": True,
        "differentNativeElementsRefused": True, "originalsPreserved": True}), flush=True)
    raise SystemExit(0)
if scenario == "header-statistics":
    # Controlled unknown-field metadata only; the existing native child still
    # owns the real reader, original capture, decoder messages, EOF and release.
    # This is a call-count regression, not a timing or received-DMI data proof.
    signature_keys = (
        "shortName", "name", "cfName", "parameterName", "units", "typeOfLevel",
        "level", "paramId", "discipline", "parameterCategory", "parameterNumber",
        "numberOfPoints", "numberOfMissing", "minimum", "maximum",
        "indicatorOfParameter", "table2Version", "centre", "subCentre",
        "generatingProcessIdentifier", "scaledValueOfFirstFixedSurface",
        "typeOfFirstFixedSurface",
    )
    statistic_keys = ("numberOfMissing", "minimum", "maximum")
    first_metadata = {key: None for key in signature_keys}
    first_metadata.update({
        "shortName": "synthetic-999", "name": "synthetic-field",
        "units": "synthetic-unit", "typeOfLevel": "depthBelowSea", "level": 1,
        "paramId": 999, "indicatorOfParameter": 999, "numberOfPoints": 9,
        "numberOfMissing": 2, "minimum": -0.25, "maximum": 0.5,
    })
    message_metadata = (
        first_metadata,
        {**first_metadata, "numberOfMissing": 7, "minimum": -99., "maximum": 99.},
    )
    original_decode = p.codes_grib_new_from_file
    original_release = p.codes_release
    message_handles, released_handles, key_reads = [], [], []

    def counted_decode(handle):
        fd = handle.fileno()
        identity = os.fstat(fd)
        assert (identity.st_dev, identity.st_ino) == (initial.st_dev, initial.st_ino)
        assert fcntl.fcntl(fd, fcntl.F_GETLEASE) == fcntl.F_RDLCK
        seen.append((id(handle), fd, identity.st_dev, identity.st_ino))
        message = original_decode(handle)
        if message is not None:
            assert len(message_handles) < 2
            message_handles.append(message)
            key_reads.append([])
        return message

    def counted_metadata(gid, key):
        assert message_handles and gid == message_handles[-1]
        key_reads[-1].append(key)
        return message_metadata[len(message_handles) - 1].get(key)

    def counted_release(gid):
        released_handles.append(gid)
        return original_release(gid)

    p.codes_grib_new_from_file = counted_decode
    p.codes_get = counted_metadata
    p.codes_release = counted_release
    old_handler = signal.getsignal(signal.SIGIO)
    result = p.process_grib(path, "dkss_lf", when, when, [zone], output, diagnostics,
        current_part_outcomes=outcomes)
    assert result == (set(), set(), False, 2, 0), result
    assert len(seen) == 3 and len(set(seen)) == 1
    assert len(message_handles) == 2 and released_handles == message_handles
    assert output == before[0] and outcomes == before[2]
    inventory_key = "|".join(str(first_metadata.get(key) or "") for key in (
        "shortName", "name", "units", "typeOfLevel", "level", "paramId",
    ))
    expected_inventory = {inventory_key: {**first_metadata, "messagesSeen": 2}}
    inventory = diagnostics["gribFieldInventory"]["dkss_lf"]
    persistent = diagnostics["persistentFieldInventory"]["dkss_lf"]
    assert inventory == expected_inventory
    assert persistent["fields"] == expected_inventory
    assert persistent["parserVersion"] == p.PARSER_VERSION
    assert p.iso(persistent["capturedAt"]) is not None
    assert list(inventory[inventory_key]) == [*signature_keys, "messagesSeen"]
    assert list(persistent["fields"][inventory_key]) == [*signature_keys, "messagesSeen"]
    assert signal.getsignal(signal.SIGIO) == old_handler and not p._UNSETTLED_GRIB_READS
    assert sentinel.read_bytes() == sentinel_bytes
    assert p.raw_cache_manifest_path().read_bytes() == manifest_bytes
    assert path.read_bytes() == original
    statistic_reads = [
        {key: reads.count(key) for key in statistic_keys}
        for reads in key_reads
    ]
    # OLD ordinary process: two statistics reads/key/message (6 then 6).
    # NEW ordinary process: first inventory only (3 then 0), same old records.
    expected_reads = [
        {key: 1 for key in statistic_keys}, {key: 0 for key in statistic_keys},
    ]
    assert statistic_reads == expected_reads, (
        "ordinary process_grib statistics regression: " + json.dumps(statistic_reads)
    )
    print(json.dumps({"case": scenario, "controlledMetadata": True,
        "ordinaryDecoderMessages": 2, "sameOwnedFd": True, "actualEOF": True,
        "statisticsReads": [3, 0], "inventoriesExact": True,
        "unsupportedNoOutput": True, "originalsPreserved": True}), flush=True)
    raise SystemExit(0)

if scenario == "foreign-pending":
    # A real thread-directed kernel signal arrives AFTER the product preflight,
    # BEFORE its first open has acquired any descriptor/handler/read lease.
    # Only the launch/open observation is wrapped; signal and filesystem APIs
    # remain real. The dedicated child exits with the foreign signal pending.
    import threading
    missing = directory / "own-absent-before-acquisition.grib"
    assert not missing.exists()
    original_open = p.os.open
    original_decode = p.codes_grib_new_from_file
    observed_errors, decode_calls, validator_calls = [], [], []
    entry_mask = signal.pthread_sigmask(signal.SIG_BLOCK, set())
    entry_handler = signal.getsignal(signal.SIGIO)
    assert signal.SIGIO not in entry_mask and signal.SIGIO not in signal.sigpending()
    assert entry_handler == signal.SIG_DFL

    def open_with_foreign_signal(file, flags, *args, **kwargs):
        if file == missing:
            assert not observed_errors
            assert signal.SIGIO in signal.pthread_sigmask(signal.SIG_BLOCK, set())
            assert signal.getsignal(signal.SIGIO) == entry_handler
            assert signal.SIGIO not in signal.sigpending()
            signal.pthread_kill(threading.get_ident(), signal.SIGIO)
            assert signal.SIGIO in signal.sigpending()
            try:
                return original_open(file, flags, *args, **kwargs)
            except BaseException as exc:
                observed_errors.append(exc)
                raise
        return original_open(file, flags, *args, **kwargs)

    def observe_decode(handle):
        decode_calls.append(handle)
        return original_decode(handle)

    def observe_validator(*args):
        validator_calls.append(args)
        raise AssertionError("foreign pending signal reached the normal validator")

    p.os.open = open_with_foreign_signal
    p.codes_grib_new_from_file = observe_decode
    try:
        try:
            p.process_grib_transactionally(missing, "dkss_lf", when, when, [zone],
                output, diagnostics, current_part_outcomes=outcomes,
                current_stage_validator=observe_validator,
                failure_flush=lambda: flushes.append(True))
        except p.GribReadUnproven as failure:
            assert len(observed_errors) == 1
            assert type(observed_errors[0]) is FileNotFoundError
            assert observed_errors[0].errno == errno.ENOENT
            assert failure.__cause__ is observed_errors[0]
        else:
            raise AssertionError("foreign pending signal was consumed or accepted")
        assert len(p._UNSETTLED_GRIB_READS) == 1
        retained = p._UNSETTLED_GRIB_READS[0]
        assert retained.retained and not retained.active and not retained.lease_acquired
        assert not retained.handler_installed and not retained.close_attempted
        assert retained.fd is None and retained.handle is None and retained.capture is None
        assert retained.primary is observed_errors[0]
        assert isinstance(retained.secondary, p.GribReadUnproven)
        assert str(retained.secondary) == "DMI_GRIB_READ_SIGNAL_RESTORE_UNPROVED"
        assert set(retained.old_mask) == set(entry_mask)
        assert signal.SIGIO in signal.sigpending()
        assert signal.SIGIO in signal.pthread_sigmask(signal.SIG_BLOCK, set())
        assert signal.getsignal(signal.SIGIO) == entry_handler
        assert not decode_calls and not validator_calls and not flushes
        assert (output, diagnostics, outcomes) == before
        try:
            p.process_grib_transactionally(path, "dkss_lf", when, when, [zone],
                output, diagnostics, current_part_outcomes=outcomes,
                current_stage_validator=observe_validator,
                failure_flush=lambda: flushes.append(True))
        except p.GribReadUnproven as failure:
            assert str(failure) == "DMI_GRIB_PREVIOUS_READ_UNSETTLED"
        else:
            raise AssertionError("retained signal state allowed a later normal reader")
        assert len(observed_errors) == 1 and not decode_calls and not validator_calls and not flushes
        assert (output, diagnostics, outcomes) == before
        assert signal.SIGIO in signal.sigpending()
        assert signal.SIGIO in signal.pthread_sigmask(signal.SIG_BLOCK, set())
        assert signal.getsignal(signal.SIGIO) == entry_handler
        assert sentinel.read_bytes() == sentinel_bytes
        assert p.raw_cache_manifest_path().read_bytes() == manifest_bytes
        assert path.read_bytes() == original and not missing.exists()
    finally:
        p.os.open = original_open
        p.codes_grib_new_from_file = original_decode
    print(json.dumps({"case": scenario, "foreignSignalPending": True,
        "preOwnership": True, "maskRetained": True, "handlerUnchanged": True,
        "firstCauseExact": True, "noDecodeValidatorFlushCommit": True,
        "nextReaderRefused": True, "originalsPreserved": True}), flush=True)
    raise SystemExit(0)  # no sigwait/unmask/handler substitution during own teardown
actual_read = p.codes_grib_new_from_file
def observe(handle):
    fd = handle.fileno()
    identity = os.fstat(fd)
    assert (identity.st_dev, identity.st_ino) == (initial.st_dev, initial.st_ino)
    assert fcntl.fcntl(fd, fcntl.F_GETLEASE) == fcntl.F_RDLCK
    seen.append((id(handle), fd, identity.st_dev, identity.st_ino))
    message = actual_read(handle)
    if scenario == "replace" and len(seen) == 1:
        # Same native file object was read; mutate only this fixture's namespace
        # before the normal decoder can accept the returned first message.
        path.rename(directory / "preserved-original.grib")
        path.write_bytes(b"a different own fixture must never be adopted")
    return message
p.codes_grib_new_from_file = observe  # observer delegates every native call unchanged
old_handler = signal.getsignal(signal.SIGIO)
owned = None
if scenario == "healthy":
    result = p.process_grib(path, "dkss_lf", when, when, [zone], output, diagnostics,
        current_part_outcomes=outcomes)
    assert result[0] == {"current-u", "current-v"} and result[3] == 2 and not result[2]
    assert len(seen) == 3 and len(set(seen)) == 1  # two messages and real EOF
    hour = output["zones"][zone["id"]]["hourly"][when]
    assert (hour["current-u"], hour["current-v"]) == (.25, -.5)
    assert hour["sources"]["current"]["contentSha256"] == capture["contentSha256"]
    try:
        os.fstat(seen[0][1])
    except OSError as exc:
        assert type(exc) is OSError and exc.errno == errno.EBADF
    else:
        raise AssertionError("the actual decoder fd is still open")
    assert signal.getsignal(signal.SIGIO) == old_handler and not p._UNSETTLED_GRIB_READS
else:
    try:
        with p._grib_read_scope(path, "dkss_lf", when, when) as reader:
            owned = reader
            shared_capture = reader.capture
            source_asset = p.canonical_current_source_asset({
                "collection": "dkss_lf", "modelRun": when, "validTime": when,
                **shared_capture})
            def validate(stage, _private, result, part_outcomes):
                assert reader.capture is shared_capture
                assert source_asset["contentSha256"] == capture["contentSha256"]
                assert result[3] == 2 and part_outcomes["complete"] is True
                assert fcntl.fcntl(reader.fd, fcntl.F_GETLEASE) == fcntl.F_RDLCK
                assert stage["zones"][zone["id"]]["hourly"][when]["sources"]["current"]["contentSha256"] == source_asset["contentSha256"]
                # This normal proof builder uses the same captured source object
                # as the caller; it is not a fixture-created trust flag.
                proof = p.build_current_part_outcome_proof(part_outcomes["spatialUnavailablePartIds"],
                    ["SYNTHETIC"], "sha256:" + "a" * 64, "sha256:" + "b" * 64, source_asset)
                assert proof is not None
                if scenario == "break":
                    try:
                        writer = os.open(path, os.O_WRONLY | os.O_NONBLOCK)
                    except OSError as exc:
                        assert exc.errno in (errno.EAGAIN, errno.EWOULDBLOCK)
                    else:
                        os.close(writer)
                        raise AssertionError("kernel admitted a writer during the read lease")
                    assert fcntl.fcntl(reader.fd, fcntl.F_GETLEASE) == fcntl.F_UNLCK
                else:
                    raise AssertionError("unknown fixed native scenario")
                return True
            p.process_grib_transactionally(path, "dkss_lf", when, when, [zone],
                output, diagnostics, current_part_outcomes=outcomes, _owned_read=reader,
                current_stage_validator=validate, failure_flush=lambda: flushes.append(True))
    except p.GribReadUnproven:
        assert owned is not None and owned in p._UNSETTLED_GRIB_READS
        assert owned.retained and not owned.close_attempted
        assert owned.handle.fileno() == owned.fd
        actual = os.fstat(owned.fd)
        assert (actual.st_dev, actual.st_ino) == (initial.st_dev, initial.st_ino)
        assert owned.capture is shared_capture and not flushes
        assert (output, diagnostics, outcomes) == before
        assert len(seen) == (1 if scenario == "replace" else 3) and len(set(seen)) == 1
    else:
        raise AssertionError("uncertain input reached a successful transaction")
    # Disposal is by this dedicated process's actual exit, AFTER the retention
    # assertions. The parent proves pidfd exit/reap before removing own files.
assert sentinel.read_bytes() == sentinel_bytes
assert p.raw_cache_manifest_path().read_bytes() == manifest_bytes
if scenario == "replace":
    assert (directory / "preserved-original.grib").read_bytes() == original
    assert path.read_bytes() == b"a different own fixture must never be adopted"
else:
    assert path.read_bytes() == original
print(json.dumps({"case": scenario, "actualMessages": 1 if scenario == "replace" else 2,
    "sameOwnedFd": True, "actualEOF": scenario != "replace",
    "originalsPreserved": True, "unknownRefused": scenario != "healthy"}), flush=True)
"""
    compile(_lease_native, "<own-native-grib-lease>", "exec")
    for _lease_case in ("healthy", "break", "replace", "foreign-pending", "header-statistics", "current-only", "cached-current-history"):
        _lease_directory = tempfile.mkdtemp(prefix="rr-native-grib-lease-")
        _lease_process, _lease_pidfd, _lease_settled = None, None, False
        try:
            _lease_started = _lease_time.monotonic()
            _lease_process = _lease_subprocess.Popen(
                [sys.executable, "-I", "-B", "-c", _lease_native,
                 str(Path(__file__).with_name("update-dmi-bulk.py")), _lease_directory, _lease_case],
                stdin=_lease_subprocess.PIPE, stdout=_lease_subprocess.PIPE,
                stderr=_lease_subprocess.PIPE,
            )
            _lease_pidfd = _lease_os.pidfd_open(_lease_process.pid)
            _lease_process.stdin.write(b"G")
            _lease_process.stdin.close()
            _lease_process.stdin = None
            _lease_stdout, _lease_stderr = _lease_process.communicate(
                timeout=max(0, 8 - (_lease_time.monotonic() - _lease_started)))
            _lease_poll = _lease_select.poll()
            _lease_poll.register(_lease_pidfd, _lease_select.POLLIN)
            assert _lease_poll.poll(0), "the held child pidfd must prove physical exit"
            _lease_settled = True
            assert _lease_process.returncode == 0, _lease_stderr.decode("utf-8", "replace")[:2000]
            _lease_receipt = json.loads(_lease_stdout.decode("utf-8"))
            if _lease_case == "cached-current-history":
                assert _lease_receipt == {"case": _lease_case,
                    "legacyOldNativeReconstruction": True,
                    "legacyNormalOwnedCaller": True,
                    "cachedAssetsDecoded": 1, "qualifiedParts": 2,
                    "sameOwnedReadEOF": True, "originalsAndScalarsPreserved": True,
                    "demandedRetention": True, "captureAndMissingRefused": True,
                    "sameBytesDifferentAcquisition": True, "nonAcquisitionDifferencesRefused": True,
                    "conflictingOriginalsRefused": True,
                    "committedCaptureReplay": True,
                    "lateEOFRollback": True, "actualLeaseBreakRetained": True}
            elif _lease_case == "current-only":
                assert _lease_receipt == {"case": _lease_case, "actualMessages": 8, "fieldOrdersChecked": 2,
                    "actualHeaderIndex": True, "bitmapZeroPreserved": True, "scalarNamespaceUnchanged": True,
                    "differentNativeElementsRefused": True, "originalsPreserved": True}
            elif _lease_case == "foreign-pending":
                assert _lease_receipt == {"case": _lease_case, "foreignSignalPending": True,
                    "preOwnership": True, "maskRetained": True, "handlerUnchanged": True,
                    "firstCauseExact": True, "noDecodeValidatorFlushCommit": True,
                    "nextReaderRefused": True, "originalsPreserved": True}
            elif _lease_case == "header-statistics":
                assert _lease_receipt == {"case": _lease_case,
                    "controlledMetadata": True, "ordinaryDecoderMessages": 2,
                    "sameOwnedFd": True, "actualEOF": True, "statisticsReads": [3, 0],
                    "inventoriesExact": True, "unsupportedNoOutput": True,
                    "originalsPreserved": True}
            else:
                assert _lease_receipt == {"case": _lease_case,
                    "actualMessages": 1 if _lease_case == "replace" else 2,
                    "sameOwnedFd": True, "actualEOF": _lease_case != "replace", "originalsPreserved": True,
                    "unknownRefused": _lease_case != "healthy"}
        finally:
            if _lease_process is not None and not _lease_settled:
                if _lease_pidfd is not None:
                    try:
                        _lease_signal.pidfd_send_signal(_lease_pidfd, _lease_signal.SIGKILL)
                    except ProcessLookupError:
                        pass
                    _lease_process.communicate(timeout=3)
                    _lease_poll = _lease_select.poll()
                    _lease_poll.register(_lease_pidfd, _lease_select.POLLIN)
                    _lease_settled = bool(_lease_poll.poll(0))
                else:
                    # The launch barrier precedes every native import/call.
                    # Without a pidfd, EOF tells only our unreleased child to
                    # exit; actual wait is required before any fixture cleanup.
                    if _lease_process.stdin is not None:
                        _lease_process.stdin.close()
                        _lease_process.stdin = None
                    _lease_process.communicate(timeout=3)
                    _lease_settled = _lease_process.returncode is not None
                # No numeric PID fallback, broad pkill or unknown child cleanup.
            if _lease_pidfd is not None:
                _lease_os.close(_lease_pidfd)
            if _lease_settled:
                _lease_shutil.rmtree(_lease_directory)
    print("OK: own Linux GRIB lease, normal decoder/EOF/commit and refusal controls.")
else:
    print("Linux GRIB read-lease contracts not executed on this platform")
