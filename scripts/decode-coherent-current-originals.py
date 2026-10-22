"""Private proof-only CURRENT RAW caller; never an admission/forecast producer.

Uses the unchanged ordinary decoder. This file is an UNISSUED proposed leaf:
the normal authenticated JS caller and its exact source/tuple reprojection are
still required before any returned native row can enter a protected proof bank.
"""
from __future__ import annotations

import copy
import errno
import hashlib
import importlib.util
import json
import math
import os
from pathlib import Path
import re
import stat
import sys
import time

ROOT = Path(__file__).resolve().parents[1]
REQUEST_RELATIVE = ".cache/coherent-current-original-requests.json"
OUTPUT_RELATIVE = ".cache/coherent-current-native-originals.json"
MANIFEST_RELATIVE = ".cache/dmi-grib/asset-manifest.json"
MAX_BYTES = 192 * 1024 * 1024
HISTORY_MAX_REFERENCES = 2 * 673 * 124
SAVED_MAX_REFERENCES = 2 * 673 * 121
HISTORY_SCOPE = "BEFORE_RETENTION_COHERENT_MISSING_ENDPOINT_METADATA_ONLY"
SAVED_SCOPE = "BEFORE_RETENTION_AND_EXACT_SAVED_PART_FORECAST_121_METADATA_ONLY"
SAVED_ROLE = "saved-private-part-forecast-121-proof-only"
MAX_CAPTURES = 4096
MAX_SECONDS = 600
SHA = re.compile(r"[a-f0-9]{64}")
IDENTITY_KEYS = {"entityId", "parentZoneId", "entityType", "samplingContext", "samplingPoint"}
BINDING_KEYS = {"datasetId", "committedReferenceAt", "targetReferenceAt",
                "bundleContentSha256", "conditionsSha256", "checkpointGenerationSha256"}
STEP_KEYS = {"itemId", "assetIdentitySha256", "nativeValidTime", "leadTimeHours",
             "acquiredAt", "optionalFieldSet", "itemCreatedAt", "itemUpdatedAt",
             "nativeGridSampling", "gridPoint", "distanceKm"}


class Refused(ValueError):
    pass


def refuse(reason):
    raise Refused("COHERENT_CURRENT_ORIGINAL_" + reason)


def check_budget(started):
    if time.monotonic() - started > MAX_SECONDS:
        refuse("RUNTIME_BOUND")


def finite(value):
    return isinstance(value, (int, float)) and not isinstance(value, bool) and math.isfinite(value)


def request_zone(request):
    identity = request["identity"]
    return {"id": identity["entityId"], "parentZoneId": identity["parentZoneId"],
            "lon": identity["samplingPoint"][0], "lat": identity["samplingPoint"][1],
            "coastalPart": True}


def wire_matches(identity, request):
    # The unchanged normal wire guard accepts the actual central point or its
    # Python-seven-place wire representation, never an arbitrary nearby point.
    from lib.dmi_legacy_current_recovery import original_wire_identity_matches_zone
    return original_wire_identity_matches_zone(identity, request_zone(request))


def json_bytes(value):
    return (json.dumps(value, ensure_ascii=False, allow_nan=False, separators=(",", ":")) + "\n").encode("utf-8")


def load_producer():
    # No path/producer/validator override and no call to ordinary main. CACHE_ONLY
    # blocks the producer's provider entrances; this caller invokes none of them.
    if os.environ.get("DMI_BULK_CACHE_ONLY") != "true":
        refuse("CACHE_ONLY_REQUIRED")
    path = ROOT / "scripts/update-dmi-bulk.py"
    if path.is_symlink() or not path.is_file():
        refuse("PRODUCER_PATH_INVALID")
    sys.path.insert(0, str(ROOT / "scripts"))
    spec = importlib.util.spec_from_file_location("coherent_current_original_normal_producer", path)
    producer = importlib.util.module_from_spec(spec)
    sys.modules[spec.name] = producer
    spec.loader.exec_module(producer)
    if producer.ROOT != ROOT or producer.RAW_DIR.absolute() != (ROOT / ".cache/dmi-grib").absolute():
        refuse("RAW_PATH_INVALID")
    if producer.WORK_DEADLINE - producer.STARTED > MAX_SECONDS:
        refuse("WORK_BUDGET_BOUND")
    return producer


def read_inputs(producer, expected_sha):
    raw = producer._legacy_current_fixed_bytes(REQUEST_RELATIVE, maximum=MAX_BYTES)
    if not SHA.fullmatch(expected_sha) or hashlib.sha256(raw).hexdigest() != expected_sha:
        refuse("REQUEST_CHANGED")
    document = json.loads(raw, object_pairs_hook=producer._exact_unique_fields,
                          parse_constant=lambda _value: refuse("REQUEST_INVALID"))
    if not isinstance(document, dict) or set(document) != {"summary", "privateBinding", "privateRequests"}:
        refuse("REQUEST_INVALID")
    summary, binding, requests = (document[key] for key in ("summary", "privateBinding", "privateRequests"))
    if not isinstance(summary, dict) or summary.get("scope") not in (HISTORY_SCOPE, SAVED_SCOPE):
        refuse("REQUEST_INVALID")
    saved_scope = summary["scope"] == SAVED_SCOPE
    maximum_references = HISTORY_MAX_REFERENCES + (SAVED_MAX_REFERENCES if saved_scope else 0)
    if not (isinstance(summary, dict) and summary.get("kind") == "COHERENT_ORIGINAL_BOOTSTRAP_METADATA"
            and summary.get("status") == "METADATA_BOUND" and summary.get("rawReadPerformed") is False
            and summary.get("decoderExecuted") is False and summary.get("nativeAdmissionPerformed") is False
            and isinstance(binding, dict) and set(binding) == BINDING_KEYS
            and all(isinstance(value, str) and value for value in binding.values())
            and isinstance(requests, list) and 0 < len(requests) <= maximum_references
            and summary.get("requestCount") == len(requests)):
        refuse("REQUEST_INVALID")
    # These supplied bindings are carried unchanged, not authenticated/issued here.
    for key in ("bundleContentSha256", "conditionsSha256", "checkpointGenerationSha256"):
        if not SHA.fullmatch(binding[key].removeprefix("sha256:")):
            refuse("REQUEST_INVALID")
    ids, identities, jobs, references = set(), {}, {}, 0
    reference_buckets = {"history": 0, "saved": 0}
    for request in requests:
        if not isinstance(request, dict) or set(request) != {
                "requestId", "partId", "sourceRole", "initialStateAt", "initialStateSha256",
                "identity", "nativeValidTime", "nativeStep", "capture", "captureOrigin", "selectionReferences"}:
            refuse("REQUEST_INVALID")
        request_id, part_id = request["requestId"], request["partId"]
        if not (isinstance(request_id, str) and SHA.fullmatch(request_id) and request_id not in ids
                and isinstance(part_id, str) and part_id and not any(ord(char) < 32 for char in part_id)):
            refuse("REQUEST_INVALID")
        saved_request = request["sourceRole"] == SAVED_ROLE
        if (saved_request and not saved_scope or not saved_request and request["sourceRole"]
                not in ("deployed-private-runtime", "progressive-private-dmi")):
            refuse("REQUEST_INVALID")
        ids.add(request_id)
        identity, step = request["identity"], request["nativeStep"]
        if not (isinstance(identity, dict) and set(identity) == IDENTITY_KEYS
                and identity.get("entityId") == "PART::" + part_id
                and identity.get("entityType") == "coastal-part"
                and identity.get("samplingContext") == "coastal-part-water-point"
                and isinstance(identity.get("parentZoneId"), str) and identity["parentZoneId"]
                and isinstance(identity.get("samplingPoint"), list) and len(identity["samplingPoint"]) == 2
                and all(finite(value) for value in identity["samplingPoint"])
                and isinstance(step, dict) and set(step) <= STEP_KEYS
                and {"itemId", "assetIdentitySha256", "nativeValidTime", "leadTimeHours", "acquiredAt",
                     "optionalFieldSet", "nativeGridSampling", "gridPoint", "distanceKm"} <= set(step)
                and step["nativeValidTime"] == request["nativeValidTime"]):
            refuse("REQUEST_INVALID")
        if part_id in identities and identities[part_id] != identity:
            refuse("IDENTITY_AMBIGUOUS")
        identities[part_id] = identity
        zone = request_zone(request)
        # Do not round/fill the central target into a new target. Apply the
        # existing exact/full-versus-Python-wire partition, not a fresh tolerance.
        if not wire_matches(producer.sampling_identity(zone), request):
            refuse("IDENTITY_MISMATCH")
        capture = producer._exact_capture(request["capture"])
        if (capture != request["capture"] or producer.iso(step["nativeValidTime"]) != capture["validTime"]
                or not producer.dmi_marine_collection_allowed_for_zone(
                    capture["collection"], identity["parentZoneId"], "current")):
            refuse("CAPTURE_INVALID")
        for key in ("itemId", "assetIdentitySha256", "acquiredAt"):
            if step.get(key) != capture[key]:
                refuse("STEP_CAPTURE_MISMATCH")
        for key in ("itemCreatedAt", "itemUpdatedAt"):
            if step.get(key) != capture[key]:
                refuse("STEP_CAPTURE_MISMATCH")
        selections = request["selectionReferences"]
        if not isinstance(selections, list) or not 0 < len(selections) <= (121 if saved_request else 124):
            refuse("REFERENCE_BOUND")
        references += len(selections)
        category = "saved" if saved_request else "history"
        reference_buckets[category] += len(selections)
        if (references > maximum_references
                or reference_buckets["history"] > HISTORY_MAX_REFERENCES
                or reference_buckets["saved"] > (SAVED_MAX_REFERENCES if saved_scope else 0)):
            refuse("REFERENCE_BOUND")
        for selection in selections:
            if (not isinstance(selection, dict) or set(selection) != {"rowTime", "sourceSha256", "tupleSha256"}
                    or not isinstance(selection["rowTime"], str)
                    or not all(isinstance(selection[key], str) and SHA.fullmatch(selection[key])
                               for key in ("sourceSha256", "tupleSha256"))):
                refuse("REQUEST_INVALID")
        key = json.dumps(capture, sort_keys=True, separators=(",", ":"))
        job = jobs.setdefault(key, {"capture": capture, "requests": [], "zones": {}})
        job["requests"].append(request)
        job["zones"][part_id] = zone
        if len(jobs) > MAX_CAPTURES:
            refuse("CAPTURE_BOUND")
    if len(identities) > 673:
        refuse("PART_BOUND")
    return raw, binding, list(jobs.values())


def raw_inventory(producer, jobs):
    # Complete strict manifest, not load_raw_cache_manifest's fallback-to-empty.
    # No manifest rewrite, eviction, request, download, or processed-cache shortcut.
    raw = producer._legacy_current_fixed_bytes(MANIFEST_RELATIVE, maximum=MAX_BYTES)
    manifest = json.loads(raw, object_pairs_hook=producer._exact_unique_fields,
                          parse_constant=lambda _value: refuse("MANIFEST_INVALID"))
    observed_names = set()
    strict, used = producer._exact_raw_state(observed_names=observed_names)
    if manifest != strict or used > producer.RAW_CACHE_MAX_BYTES:
        refuse("RAW_INVENTORY_INVALID")
    if manifest.get("schemaVersion") != producer.RAW_CACHE_MANIFEST_SCHEMA_VERSION or not isinstance(manifest.get("assets"), dict):
        refuse("MANIFEST_INVALID")
    wanted = {json.dumps(job["capture"], sort_keys=True, separators=(",", ":")): job for job in jobs}
    by_official_identity = {}
    for name, asset in manifest["assets"].items():
        if not isinstance(asset, dict):
            continue
        capture = producer.canonical_current_source_asset(asset)
        if capture is None:
            continue
        # This index distinguishes an acquisition-only mismatch. It grants no
        # historical authority to newly acquired bytes and never relabels them.
        official = json.dumps({key: value for key, value in capture.items() if key != "acquiredAt"},
                              sort_keys=True, separators=(",", ":"))
        by_official_identity.setdefault(official, []).append(capture)
        key = json.dumps(capture, sort_keys=True, separators=(",", ":"))
        if key not in wanted:
            continue
        job = wanted[key]
        href = asset.get("canonicalHref")
        if (not isinstance(name, str) or not isinstance(href, str)
                or producer.asset_identity_sha256(href) != capture["assetIdentitySha256"]
                or producer.cached_asset_path(href).name != name
                or Path(name).name != name or name in (".", "..")):
            refuse("RAW_MANIFEST_BINDING_INVALID")
        if "path" in job:
            refuse("RAW_CAPTURE_AMBIGUOUS")
        path = producer.RAW_DIR / name
        try:
            info = path.lstat()
        except FileNotFoundError:
            refuse("RAW_CAPTURE_FILE_MISSING")
        if not stat.S_ISREG(info.st_mode) or info.st_nlink != 1 or info.st_size != capture["contentLengthBytes"]:
            refuse("RAW_FILE_INVALID")
        if info.st_size > producer.MAX_DOWNLOAD_BYTES:
            refuse("RAW_FILE_BOUND")
        job["path"] = path
    for job in jobs:
        if "path" not in job:
            official = json.dumps({key: value for key, value in job["capture"].items() if key != "acquiredAt"},
                                  sort_keys=True, separators=(",", ":"))
            if official in by_official_identity:
                refuse("RAW_ACQUISITION_UNRESOLVED")
            # A prefix is only an observation of the existing regular-file
            # inventory. It cannot identify the URL/extension, full capture or
            # bytes, and MUST NOT provide job.path, decode or admission.
            prefix = job["capture"]["assetIdentitySha256"][:24] + "."
            present = any(name.startswith(prefix) for name in observed_names)
            refuse("RAW_CAPTURE_METADATA_UNMATCHED_PREFIX_" + ("PRESENT" if present else "ABSENT"))
    return raw


def decoded_row_matches(producer, request, point, row):
    if not isinstance(row, dict) or not all(finite(row.get(key)) for key in ("current-u", "current-v")):
        return False
    source = (row.get("sources") or {}).get("current")
    valid = producer.iso(request["nativeValidTime"])
    if not (isinstance(source, dict) and producer.iso(row.get("time")) == valid
            and not any(key in source for key in ("nativeSteps", "nativeValidTimes", "temporalResolution", "forecastAgeHours"))
            and producer.complete_native_source_for_hour(source, "current", request["identity"]["entityId"], point, valid)
            and producer.canonical_current_source_asset(source) == request["capture"]
            and producer.inspect_native_grid_sampling(source)["status"] == "coherent"
            and wire_matches({key: source.get(key) for key in IDENTITY_KEYS}, request)
            and wire_matches({key: point.get(key) for key in IDENTITY_KEYS}, request)):
        return False
    # Require every actual stored endpoint field, including exact grid index,
    # field-set receipt, layer's selected point/distance and acquisition. The
    # subsequent JS comparator/reprojection still checks the whole old source.
    for key, value in request["nativeStep"].items():
        if key == "nativeValidTime":
            if producer.iso(source.get(key)) != producer.iso(value):
                return False
        elif key not in source or source[key] != value:
            return False
    for key in ("itemCreatedAt", "itemUpdatedAt"):
        if (key in source) != (key in request["nativeStep"]):
            return False
    return True


def decode(producer, jobs, started):
    header = {"currentVectorSemanticsVersion": producer.CURRENT_VECTOR_SEMANTICS_VERSION,
              "currentVectorSelection": producer.CURRENT_VECTOR_SELECTION,
              "currentMaxDistanceKm": producer.CURRENT_MAX_DISTANCE_KM}
    contexts, completed = [], 0
    for job in jobs:
        check_budget(started)
        capture = job["capture"]
        collection, run, valid = (capture[key] for key in ("collection", "modelRun", "validTime"))
        zones = [job["zones"][key] for key in sorted(job["zones"])]
        document = {**header, "zones": {zone["id"]: {
            **producer.sampling_identity(zone), "hourly": {}, "gridPoints": {}, "collections": {}
        } for zone in zones}}
        diagnostics, part_outcomes = {}, {}
        reader = None

        def validate(stage, _private, outcome, outcomes):
            check_budget(started)
            ids = sorted(job["zones"])
            if not (not outcome[2] and outcome[3] > 0
                    and set(outcome[0]) == {"current-u", "current-v"}
                    and isinstance(outcomes, dict) and outcomes.get("complete") is True
                    and outcomes.get("targetPartIds") == ids
                    and outcomes.get("spatialUnavailablePartIds") == []):
                return False
            for request in job["requests"]:
                point = stage["zones"].get(request["identity"]["entityId"])
                row = (point.get("hourly") or {}).get(valid) if isinstance(point, dict) else None
                if not decoded_row_matches(producer, request, point, row):
                    return False
            return True

        with producer._grib_read_scope(job["path"], collection, run, valid) as reader:
            observed = producer.canonical_current_source_asset({
                "collection": collection, "modelRun": run, "validTime": valid, **dict(reader.capture or {})})
            if observed != capture:
                refuse("OWNED_CAPTURE_MISMATCH")
            producer._exact_original_headers(reader, capture)  # every field, full EOF
            reader.handle.seek(0)
            reader.check()
            outcome = producer.process_grib_transactionally(
                job["path"], collection, run, valid, zones, document, diagnostics,
                current_part_outcomes=part_outcomes,
                allowed_parameters={"current-u", "current-v"},
                current_stage_validator=validate,
                validation_error="COHERENT_CURRENT_ORIGINAL_DECODE_MISMATCH",
                _owned_read=reader)
            if outcome[2] or reader.handle.tell() != capture["contentLengthBytes"]:
                refuse("EOF_UNPROVED")
            reader.check()
        # The outer owner must physically close, not just leave the nested
        # borrowed scope. Its existing COW rollback remains authoritative.
        if (reader is None or reader.physically_closed is not True or reader.retained
                or producer._UNSETTLED_GRIB_READS):
            refuse("CLOSE_UNPROVED")
        check_budget(started)
        for request in job["requests"]:
            point = document["zones"][request["identity"]["entityId"]]
            row = point["hourly"][valid]
            if not decoded_row_matches(producer, request, point, row):
                refuse("DECODE_CHANGED")
            contexts.append({"requestId": request["requestId"], "partId": request["partId"],
                             "header": copy.deepcopy(header),
                             "identity": {key: copy.deepcopy(point[key]) for key in IDENTITY_KEYS},
                             "row": copy.deepcopy(row), "capture": copy.deepcopy(capture)})
        completed += 1
    return contexts, completed


def publish_private_exclusive(producer, payload):
    path = ROOT / OUTPUT_RELATIVE
    if path.parent.is_symlink() or path.parent != ROOT / ".cache":
        refuse("OUTPUT_PATH_INVALID")
    raw = json_bytes(payload)
    if len(raw) > MAX_BYTES:
        refuse("OUTPUT_BOUND")
    fd = os.open(path, os.O_WRONLY | os.O_CREAT | os.O_EXCL | os.O_NOFOLLOW | os.O_CLOEXEC, 0o600)
    primary = None
    try:
        view = memoryview(raw)
        while view:
            written = os.write(fd, view)
            if written <= 0:
                refuse("OUTPUT_WRITE_FAILED")
            view = view[written:]
        os.fsync(fd)
        info = os.fstat(fd)
        if not stat.S_ISREG(info.st_mode) or info.st_nlink != 1 or info.st_size != len(raw):
            refuse("OUTPUT_WRITE_FAILED")
    except BaseException as error:
        primary = error
    try:
        os.close(fd)  # one attempt only, never unlink an uncertain owned output
        try:
            os.fstat(fd)
        except OSError as error:
            if error.errno != errno.EBADF:
                raise
        else:
            refuse("OUTPUT_CLOSE_UNPROVED")
    except BaseException as error:
        if primary is None:
            primary = error
    if primary is not None:
        raise primary
    # A successful process exit is necessary; partial/uncertain output remains
    # private and is never an authenticated native-bank or admission receipt.
    return {"status": "DECODED_PRIVATE_NOT_ADMITTED", "requestCount": len(payload["privateOriginals"]),
            "captureCount": payload["captureCount"], "bytes": len(raw),
            "sha256": hashlib.sha256(raw).hexdigest(), "nativeAdmissionPerformed": False}


def main(argv):
    if len(argv) != 2 or argv[0] != "--request-sha256":
        refuse("ARGUMENT_INVALID")
    if sys.platform != "linux":
        refuse("LINUX_OWNED_READER_REQUIRED")
    started = time.monotonic()
    producer = load_producer()
    request_raw, binding, jobs = read_inputs(producer, argv[1])
    manifest_raw = raw_inventory(producer, jobs)
    contexts, capture_count = decode(producer, jobs, started)
    check_budget(started)
    # Whole before/after inputs, not a stat-only freshness promise. Every RAW
    # already passed its own measured read lease and physical close.
    if producer._legacy_current_fixed_bytes(REQUEST_RELATIVE, maximum=MAX_BYTES) != request_raw:
        refuse("REQUEST_CHANGED")
    if producer._legacy_current_fixed_bytes(MANIFEST_RELATIVE, maximum=MAX_BYTES) != manifest_raw:
        refuse("MANIFEST_CHANGED")
    if producer._UNSETTLED_GRIB_READS or producer._UNSETTLED_ASSET_DOWNLOADS:
        refuse("OWNERSHIP_UNPROVED")
    payload = {"schemaVersion": 1, "kind": "COHERENT_CURRENT_ORIGINAL_DECODE",
               "privateBinding": binding, "requestSha256": argv[1],
               "captureCount": capture_count, "privateOriginals": contexts,
               "nativeAdmissionPerformed": False}
    summary = publish_private_exclusive(producer, payload)
    print(json.dumps(summary, sort_keys=True))
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main(sys.argv[1:]))
    except Refused as error:
        print(json.dumps({"status": "UNRESOLVED", "code": str(error),
                          "nativeAdmissionPerformed": False}), file=sys.stderr)
        raise SystemExit(1)
    except BaseException as error:
        if isinstance(error, SystemExit) and error.code == 0:
            raise
        # Never print decoder paths, identities, coordinates, captures, U/V or
        # exception text. All scratch/uncertain files are retained for the owner.
        print(json.dumps({"status": "UNRESOLVED", "code": "COHERENT_CURRENT_ORIGINAL_DECODE_FAILED",
                          "nativeAdmissionPerformed": False}), file=sys.stderr)
        raise SystemExit(1)
