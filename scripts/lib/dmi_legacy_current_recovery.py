"""Pure validation of normal, source-bound OLD reconstruction requests.

This is acquisition metadata, not numeric/native admission. The caller measures
the fixed input files before changing working caches, owns every RAW lease and
requires the unchanged JavaScript source/tuple projection after physical close.
"""
from __future__ import annotations

import copy
import datetime as dt
import hashlib
import json
import math
import re

from .dmi_native_provenance import canonical_current_source_asset, canonical_time, sampling_identity


REQUEST_PATH = ".cache/dmi-legacy-current-original-requests.json"
OUTPUT_PATH = ".cache/dmi-legacy-current-originals.json"
SOURCE_PATHS = {
    "zones": "data/zones.geojson",
    "deployedBulk": ".cache/deployed-dmi-bulk-cache.json",
    "forecast": "data/live/dmi-forecast-cache.json",
    "candidate": ".cache/dmi-candidate-progress.json",
    "active": ".cache/dmi-active-complete.json",
}
_ROLES = ("deployedBulk", "candidate", "active")
_HEADER = ("currentVectorSemanticsVersion", "currentVectorSelection", "currentMaxDistanceKm", "timeStrideHours", "generatedAt")
_DERIVED = ("nativeSteps", "nativeValidTimes", "temporalResolution", "forecastAgeHours")
_CLOCKS = ("itemCreatedAt", "itemUpdatedAt")
_SIGNATURE = re.compile(r"parser:20\|params:4\|grid:9\|eccodes-api:2\.48\.(?:0|2)"
    r"\|eccodes-binding:2\.48\.0\|zones:[a-f0-9]{16}")
_SHA = re.compile(r"sha256:[a-f0-9]{64}")


def refuse(code):
    raise ValueError("DMI_LEGACY_CURRENT_" + code)


def canonical(value):
    return json.dumps(value, sort_keys=True, separators=(",", ":"), ensure_ascii=False, allow_nan=False)


def digest(value):
    return "sha256:" + hashlib.sha256(canonical(value).encode("utf-8")).hexdigest()


def _at(document, path):
    if not isinstance(path, list) or not 1 <= len(path) <= 8:
        refuse("PROCESSING_CONTEXT_UNKNOWN")
    value = document
    for key in path:
        if isinstance(value, dict) and isinstance(key, str) and key in value:
            value = value[key]
        elif isinstance(value, list) and type(key) is int and 0 <= key < len(value):
            value = value[key]
        else:
            refuse("PROCESSING_CONTEXT_UNKNOWN")
    return value


def _processing(document, evidence, capture, part_id, signature):
    if (not isinstance(signature, str) or not _SIGNATURE.fullmatch(signature)
            or not isinstance(evidence, dict) or set(evidence) != {"kind", "path", "sha256"}):
        refuse("PROCESSING_CONTEXT_UNKNOWN")
    path = evidence["path"]
    value = _at(document, path)
    # The normal JS verifier checks JS-canonical record IDs/hashes. Do not
    # pretend Python's 0.0/1e-07 formatting has the same byte representation.
    # Here authority is the measured whole original file plus this exact
    # locator, capture and processing relation, not an attacker-supplied hash.
    if not isinstance(value, dict) or not _SHA.fullmatch(str(evidence["sha256"])):
        refuse("PROCESSING_CONTEXT_UNKNOWN")
    kind = evidence["kind"]
    if kind == "RUN_PROCESSED_STEP":
        if (len(path) != 4 or path[:3] != ["runs", capture["collection"], "processedSteps"]
                or canonical_time(path[3]) != capture["validTime"]):
            refuse("PROCESSING_CONTEXT_UNKNOWN")
        run = document["runs"][capture["collection"]]
        if (canonical_time(run.get("referenceTime")) != capture["modelRun"]
                or any(run.get(key) != wanted for key, wanted in (
                    ("parserVersion", 20), ("parameterMapVersion", 4), ("gridLookupVersion", 9)))
                or run.get("processingSignature") != signature
                or value.get("complete") is not True or value.get("parserVersion") != 20
                or value.get("processingSignature") != signature
                or not {"current-u", "current-v"} <= set(value.get("recognizedParameters") or [])
                or not isinstance(value.get("zonesTouched"), (int, float))
                or isinstance(value.get("zonesTouched"), bool) or value["zonesTouched"] <= 0):
            refuse("PROCESSING_CONTEXT_UNKNOWN")
    elif kind == "LEDGER_COLLECTION_ASSET":
        if (len(path) != 6 or path[:3] != ["diagnostics", "currentOperationalLedger", "collections"]
                or type(path[3]) is not int or path[4] != "validTimes" or type(path[5]) is not int):
            refuse("PROCESSING_CONTEXT_UNKNOWN")
        collection = _at(document, path[:4])
        if (collection.get("collection") != capture["collection"]
                or canonical_time(collection.get("modelRun")) != capture["modelRun"]
                or collection.get("processingSignature") != signature
                or value.get("state") not in {"PROCESSED", "VERIFIED"}
                or canonical_time(value.get("validTime")) != capture["validTime"]):
            refuse("PROCESSING_CONTEXT_UNKNOWN")
    elif kind == "RETAINED_CURRENT_ASSET_PROOF":
        if (len(path) != 4 or path[:3] != ["diagnostics", "currentOperationalLedger", "retainedCurrentAssetProofs"]
                or type(path[3]) is not int or value.get("processingSignature") != signature
                or part_id not in (value.get("attestedPartIds") or [])):
            refuse("PROCESSING_CONTEXT_UNKNOWN")
    else:
        refuse("PROCESSING_CONTEXT_UNKNOWN")
    if canonical_current_source_asset(value.get("sourceAsset")) != capture:
        refuse("PROCESSING_CONTEXT_UNKNOWN")


def validate_requests(document, *, demand_document, demand_sha256, registry_sha256,
                      source_hashes, documents, zones, reference):
    """Validate exact own requests against measured, pre-write normal inputs."""
    if (not isinstance(document, dict) or set(document) != {
            "schemaVersion", "kind", "productionReferenceAt", "modelBinding", "historyDemandSha256",
            "registrySha256", "sourceHashes", "sourcePaths", "documentContexts", "projectionWitnesses", "reconstructionRequests"}
            or document["schemaVersion"] != 1
            or document["kind"] != "DMI_LEGACY_CURRENT_ORIGINAL_RECONSTRUCTION_REQUESTS"
            or document["productionReferenceAt"] != demand_document.get("productionReferenceAt")
            or canonical_time(document["productionReferenceAt"]) != canonical_time(reference)
            or document["modelBinding"] != demand_document.get("modelBinding")
            or document["historyDemandSha256"] != demand_sha256
            or document["registrySha256"] != registry_sha256
            or document["sourceHashes"] != source_hashes
            or document["sourcePaths"] != SOURCE_PATHS
            or set(source_hashes) != set(SOURCE_PATHS)):
        refuse("REQUEST_ENVELOPE_INVALID")
    demands = {"PART::" + row["partId"]: row for row in demand_document["demands"]}
    by_zone = {zone["id"]: zone for zone in zones}
    contexts = {}
    if not isinstance(document["documentContexts"], list) or len(document["documentContexts"]) > 3:
        refuse("REQUEST_CONTEXT_INVALID")
    for context in document["documentContexts"]:
        if not isinstance(context, dict) or set(context) != {"documentRole", "header", "zones"}:
            refuse("REQUEST_CONTEXT_INVALID")
        role = context["documentRole"]
        original = documents.get(role)
        if role not in _ROLES or role in contexts or not isinstance(original, dict):
            refuse("REQUEST_CONTEXT_INVALID")
        if context["header"] != {key: original[key] for key in _HEADER if key in original}:
            refuse("REQUEST_CONTEXT_INVALID")
        identities = {}
        for entry in context["zones"]:
            part_id, identity = entry.get("partId"), entry.get("zone")
            zone = by_zone.get("PART::" + str(part_id))
            original_zone = (original.get("zones") or {}).get("PART::" + str(part_id))
            if (set(entry) != {"partId", "zone"} or not zone or part_id in identities
                    or not isinstance(original_zone, dict) or identity != sampling_identity(zone)
                    or any(original_zone.get(key) != value for key, value in identity.items())):
                refuse("REQUEST_CONTEXT_INVALID")
            identities[part_id] = identity
        contexts[role] = {"header": context["header"], "zones": identities}
    witnesses = {}
    rows = document["projectionWitnesses"]
    if not isinstance(rows, list) or len(rows) > 673 * 127:
        refuse("REQUEST_BOUND")
    for witness in rows:
        if not isinstance(witness, dict) or set(witness) != {"witnessId", "partId", "documentRole", "row", "sourceSha256", "tupleSha256"}:
            refuse("WITNESS_INVALID")
        row, part_id, role = witness["row"], witness["partId"], witness["documentRole"]
        identity = contexts.get(role, {}).get("zones", {}).get(part_id)
        if (not identity or witness["witnessId"] in witnesses
                or not _SHA.fullmatch(str(witness["witnessId"]))
                or not isinstance(row, dict) or set(row) != {"time", "currentUMps", "currentVMps", "sources"}
                or not isinstance(row["sources"], dict) or set(row["sources"]) != {"current"}
                or not isinstance(row["sources"]["current"], dict)
                or not _SHA.fullmatch(str(witness["sourceSha256"]))
                or not _SHA.fullmatch(str(witness["tupleSha256"]))
                or any(type(row[key]) not in (int, float) or not math.isfinite(row[key]) for key in ("currentUMps", "currentVMps"))
                or any(row["sources"]["current"].get(key) != value for key, value in identity.items())):
            refuse("WITNESS_INVALID")
        witnesses[witness["witnessId"]] = witness
    requests, seen, referenced = document["reconstructionRequests"], set(), set()
    if not isinstance(requests, list) or len(requests) > 2 * 673 * 127:
        refuse("REQUEST_BOUND")
    for request in requests:
        if not isinstance(request, dict) or set(request) != {"requestId", "partId", "entityId", "documentRole", "nativeValidTime", "reconstructionRequest", "processingEvidence", "projectionWitnessRefs"}:
            refuse("REQUEST_INVALID")
        if not _SHA.fullmatch(str(request["requestId"])) or request["requestId"] in seen:
            refuse("REQUEST_INVALID")
        seen.add(request["requestId"])
        entity, part_id, role = request["entityId"], request["partId"], request["documentRole"]
        zone, demand = by_zone.get(entity), demands.get(entity)
        reconstruction = request["reconstructionRequest"]
        if (not zone or not demand or entity != "PART::" + str(part_id)
                or not isinstance(reconstruction, dict)
                or set(reconstruction) != {"zone", "expectedSource", "capture", "processingSignature"}
                or reconstruction["zone"] != {key: zone[key] for key in ("id", "parentZoneId", "coastalPart", "coastType", "lon", "lat")}
                or part_id not in contexts.get(role, {}).get("zones", {})):
            refuse("REQUEST_INVALID")
        source, capture = reconstruction["expectedSource"], reconstruction["capture"]
        valid = canonical_time(request["nativeValidTime"])
        if (not isinstance(capture, dict) or not isinstance(source, dict)
                or canonical_current_source_asset(capture) is None
                or canonical_current_source_asset(capture) != capture
                or canonical_current_source_asset(source) != capture or capture["validTime"] != valid
                or any(key in source for key in _DERIVED)
                or source.get("nativeGridSampling") is not None):
            refuse("CAPTURE_MISMATCH")
        # The endpoint may support interpolation immediately outside the own
        # demand, but an authentic capture must not extend the acquisition
        # request beyond that existing three-hour native bracket allowance.
        try:
            native_at = dt.datetime.fromisoformat(valid).timestamp()
            start_at = dt.datetime.fromisoformat(canonical_time(demand.get("startAt"))).timestamp()
            end_at = dt.datetime.fromisoformat(canonical_time(demand.get("endAt"))).timestamp()
        except (TypeError, ValueError, OverflowError):
            refuse("REQUEST_OUTSIDE_DEMAND")
        if not start_at - 3 * 3600 <= native_at <= end_at + 3 * 3600:
            refuse("REQUEST_OUTSIDE_DEMAND")
        _processing(documents[role], request["processingEvidence"], capture, part_id, reconstruction["processingSignature"])
        refs = request["projectionWitnessRefs"]
        if not isinstance(refs, list) or not refs or len(refs) > 127 or len(set(refs)) != len(refs):
            refuse("WITNESS_INVALID")
        for key in refs:
            witness = witnesses.get(key)
            if not witness or witness["partId"] != part_id or witness["documentRole"] != role:
                refuse("WITNESS_INVALID")
            original = witness["row"]["sources"]["current"]
            steps = [step for step in original.get("nativeSteps", []) if canonical_time(step.get("nativeValidTime")) == valid]
            if len(steps) != 1:
                refuse("WITNESS_INVALID")
            step = steps[0]
            expected = {name: copy.deepcopy(value) for name, value in original.items() if name not in _DERIVED}
            for name in ("itemId", "assetIdentitySha256", "nativeValidTime", "leadTimeHours", "acquiredAt", "optionalFieldSet"):
                expected[name] = copy.deepcopy(step.get(name))
            for name in ("gridPoint", "distanceKm", *_CLOCKS):
                if name in step:
                    expected[name] = copy.deepcopy(step[name])
                elif name in _CLOCKS:
                    expected.pop(name, None)
            expected.pop("nativeGridSampling", None)
            # Explicit null is authentic UNKNOWN metadata, not a receipt.
            # Preserve only this endpoint's own recorded shape; a top marker
            # may never be copied to a different bracket.
            if "nativeGridSampling" in step:
                expected["nativeGridSampling"] = copy.deepcopy(step["nativeGridSampling"])
            for name in ("contentLengthBytes", "contentSha256"):
                expected[name] = capture[name]
            if capture["assetSizeBytes"] is not None or "assetSizeBytes" in expected:
                expected["assetSizeBytes"] = capture["assetSizeBytes"]
            if expected != source:
                refuse("WITNESS_INVALID")
            referenced.add(key)
    if set(witnesses) != referenced:
        refuse("WITNESS_INVALID")
    # Requests were parsed from the caller's one owned fixed file, not borrowed
    # from an original document. Decoding copies each candidate, never these
    # expectations. Avoid a second national-sized deep copy here.
    return {"requests": requests, "contexts": copy.deepcopy(contexts)}
