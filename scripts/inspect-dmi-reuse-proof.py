#!/usr/bin/env python3
"""Read-only, aggregate-only forensic inspection of one private DMI cache.

Cache-derived targets are usable here only when their complete fingerprint
matches the saved ledger. This proves historical cache self-consistency, not
authority to replace today's centrally hydrated production registry.
"""
from __future__ import annotations

import argparse
import contextlib
import gc
import importlib.util
import json
import math
import pathlib
import re
import sys
import traceback
from collections import Counter
from datetime import timedelta

sys.dont_write_bytecode = True
MAX_BYTES = 2 * 1024**3
COLLECTIONS = ("dkss_idw", "dkss_nsbs", "dkss_lf")
SIGNATURE_PATTERN = r"parser:([0-9]{1,5})\|params:([0-9]{1,5})\|grid:([0-9]{1,5})\|eccodes-api:([A-Za-z0-9._+-]{1,48})\|eccodes-binding:([A-Za-z0-9._+-]{1,48})\|zones:([a-f0-9]{16})"


class DiagnosticCompatibleSignature(str):
    """Probe only the reviewed decoder transition; never patch production state.

    This object is passed solely to the retained-row inspection function, never
    to raw-asset reuse or GRIB processing. Original stored signatures and hashes
    remain ordinary strings and are never rewritten.
    """
    __hash__ = None

    def __eq__(self, other):
        if not isinstance(other, str):
            return False
        left, right = re.fullmatch(SIGNATURE_PATTERN, self), re.fullmatch(SIGNATURE_PATTERN, other)
        if not left or not right:
            return False
        return (
            left.groups()[:3] == right.groups()[:3] == ("20", "4", "9")
            and left[6] == right[6]
            and left[5] == right[5] == "2.48.0"
            and {left[4], right[4]} <= {"2.48.0", "2.48.2"}
        )

    def __ne__(self, other):
        return not self.__eq__(other)


class QuietSink:
    def write(self, value):
        return len(value)

    def flush(self):
        pass


def safe_failure(exc):
    frames = traceback.extract_tb(exc.__traceback__)
    frame = frames[-1] if frames else None
    return {
        "status": "REJECTED",
        "exceptionType": type(exc).__name__ if type(exc).__name__ in {
            "ValueError", "TypeError", "KeyError", "RuntimeError", "OSError",
            "MemoryError", "JSONDecodeError", "FileNotFoundError",
        } else "Exception",
        "location": re.sub(r"[^A-Za-z0-9_.-]", "_", pathlib.Path(frame.filename).name) if frame else "unknown",
        "line": frame.lineno if frame else 0,
    }


def emit(event, **fields):
    print(json.dumps({"event": event, **fields}, sort_keys=True, separators=(",", ":")), flush=True)


def load_runtime():
    path = pathlib.Path(__file__).with_name("update-dmi-bulk.py")
    spec = importlib.util.spec_from_file_location("dmi_reuse_forensic_runtime", path)
    module = importlib.util.module_from_spec(spec)
    with contextlib.redirect_stdout(QuietSink()), contextlib.redirect_stderr(QuietSink()):
        spec.loader.exec_module(module)
    return module


def bound_targets(document, runtime):
    ledger = document.get("diagnostics", {}).get("currentOperationalLedger", {})
    targets = []
    for key, zone in document.get("zones", {}).items():
        if not isinstance(key, str) or not key.startswith("PART::"):
            continue
        if not isinstance(zone, dict) or zone.get("entityId") != key or zone.get("entityType") != "coastal-part":
            raise ValueError("REGISTRY_IDENTITY_INVALID")
        targets.append({"partId": key[6:], "parentZoneId": zone.get("parentZoneId"), "waterPoint": zone.get("samplingPoint")})
    if len(targets) != 673 or runtime.target_fingerprint(targets) != ledger.get("targetRegistrySha256"):
        raise ValueError("REGISTRY_BINDING_INVALID")
    return targets


def proof_probe(document, targets, reference, signature, runtime):
    try:
        with contextlib.redirect_stdout(QuietSink()), contextlib.redirect_stderr(QuietSink()):
            proofs = runtime._validated_candidate_retained_current_asset_proofs(document, targets, reference, signature)
        counts = Counter()
        for proof in proofs:
            collection = proof["sourceAsset"]["collection"]
            counts[collection if collection in COLLECTIONS else "other"] += len(proof["attestedPartIds"])
        return {"status": "ACCEPTED", "proofCount": len(proofs), "pairCount": sum(counts.values()), "pairsByCollection": dict(counts)}
    except Exception as exc:
        return safe_failure(exc)
    finally:
        gc.collect()


def raw_overlap(document, targets, reference, runtime):
    """Value presence only: these counts are explicitly NOT verified coverage."""
    end = reference + timedelta(hours=117)
    counts = Counter()
    for target in targets:
        zone = document["zones"]["PART::" + target["partId"]]
        for valid, row in (zone.get("hourly") or {}).items():
            try:
                when = runtime.production_reference_hour(valid)
                if not reference <= when <= end or not isinstance(row, dict):
                    continue
                if not all(isinstance(row.get(k), (int, float)) and not isinstance(row.get(k), bool) and math.isfinite(row[k]) for k in ("current-u", "current-v")):
                    continue
                collection = ((row.get("sources") or {}).get("current") or {}).get("collection")
                counts[collection if collection in COLLECTIONS else "other"] += 1
            except (ValueError, TypeError, AttributeError):
                continue
    return {"classification": "UNVERIFIED_VALUE_PRESENCE", "pairCount": sum(counts.values()), "pairsByCollection": dict(counts)}


def inspect(path, target, compatibility_probe=False, collect_pairs=False):
    stat = path.stat()
    if path.is_symlink() or not path.is_file() or not 0 < stat.st_size <= MAX_BYTES:
        raise ValueError("INPUT_SIZE_OR_TYPE_INVALID")
    with path.open("r", encoding="utf-8") as handle:
        document = json.load(handle)
    runtime = load_runtime()
    reference = runtime.production_reference_hour(target)
    targets = bound_targets(document, runtime)
    ledger = document["diagnostics"]["currentOperationalLedger"]
    donor_reference = runtime.production_reference_hour(ledger.get("productionReferenceAt"))
    signature = runtime.current_marine_processing_signature(document.get("zoneRegistrySignature"))
    verified = ledger.get("attestation", {}).get("verifiedPairCount")
    emit("cache_identity", rawBytes=stat.st_size, targetCount=len(targets), registryBinding="MATCHED_HISTORICAL_CACHE_ONLY", referenceShiftHours=int((reference-donor_reference).total_seconds()//3600), ledgerVerifiedPairs=verified if type(verified) is int else None, retainedProofCount=len(ledger.get("retainedCurrentAssetProofs") or []))
    signature_counts = Counter()
    for row in ledger.get("collections") or []:
        signature_counts["compatible" if row.get("processingSignature") == signature else "incompatible"] += 1
    retained_signatures = Counter("compatible" if row.get("processingSignature") == signature else "incompatible" for row in ledger.get("retainedCurrentAssetProofs") or [])
    emit("processing_compatibility", collections=dict(signature_counts), retainedProofs=dict(retained_signatures))
    emit("raw_target_overlap", **raw_overlap(document, targets, reference, runtime))
    emit("donor_reference_proof", **proof_probe(document, targets, donor_reference, signature, runtime))
    emit("new_reference_proof", **proof_probe(document, targets, reference, signature, runtime))
    if compatibility_probe:
        emit("reviewed_decoder_transition_probe", classification="DIAGNOSTIC_ONLY_NO_PRODUCTION_AUTHORITY", **proof_probe(document, targets, reference, DiagnosticCompatibleSignature(signature), runtime))
    recorded_signatures = {row.get("processingSignature") for row in ledger.get("collections") or [] if isinstance(row.get("processingSignature"), str)}
    recorded_signatures.update(row.get("processingSignature") for row in ledger.get("retainedCurrentAssetProofs") or [] if isinstance(row.get("processingSignature"), str))
    for index, recorded in enumerate(sorted(recorded_signatures)[:4]):
        emit("original_processing_signature_donor_proof", signatureIndex=index, classification="HISTORICAL_SELF_CONSISTENCY_ONLY", matchesCurrentRuntime=(recorded == signature), **proof_probe(document, targets, donor_reference, recorded, runtime))
        emit("original_processing_signature_proof", signatureIndex=index, classification="HISTORICAL_SELF_CONSISTENCY_ONLY", matchesCurrentRuntime=(recorded == signature), **proof_probe(document, targets, reference, recorded, runtime))
        old = re.fullmatch(SIGNATURE_PATTERN, recorded)
        new = re.fullmatch(SIGNATURE_PATTERN, signature)
        if old and new:
            emit("processing_signature_components", signatureIndex=index, changedSegments=[label for offset, label in enumerate(("parser", "params", "grid", "eccodesApi", "eccodesBinding", "zones"), 1) if old[offset] != new[offset]])
    with contextlib.redirect_stdout(QuietSink()), contextlib.redirect_stderr(QuietSink()):
        sanitation = runtime.sanitize_reusable_cache_document_leaves(document)
    allowed = {key: value for key, value in sanitation.items() if key in {"droppedZoneCount", "resetContainerCount", "droppedHourCount", "droppedSourceComponentCount", "droppedGridPointCount", "droppedLeafCount"} and isinstance(value, int)}
    emit("in_memory_leaf_sanitation", **allowed)
    emit("sanitized_new_reference_proof", **proof_probe(document, targets, reference, signature, runtime))
    after = path.stat()
    emit("input_unchanged", unchanged=(after.st_size == stat.st_size and after.st_mtime_ns == stat.st_mtime_ns))
    if collect_pairs:
        expected = DiagnosticCompatibleSignature(signature) if compatibility_probe else signature
        with contextlib.redirect_stdout(QuietSink()), contextlib.redirect_stderr(QuietSink()):
            proofs = runtime._validated_candidate_retained_current_asset_proofs(document, targets, reference, expected)
        return {
            "pairs": {(part_id, proof["sourceAsset"]["validTime"]) for proof in proofs for part_id in proof["attestedPartIds"]},
            "targetRegistry": runtime.target_fingerprint(targets),
            "samplingRegistry": document.get("zoneRegistrySignature"),
        }
    return None


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--cache", type=pathlib.Path, required=True)
    parser.add_argument("--target", required=True)
    parser.add_argument("--compatibility-probe", action="store_true")
    parser.add_argument("--supplement", type=pathlib.Path)
    args = parser.parse_args()
    try:
        emit("input_role", role="primary")
        primary = inspect(args.cache, args.target, args.compatibility_probe, bool(args.supplement))
        if args.supplement:
            gc.collect()
            emit("input_role", role="supplement")
            supplement = inspect(args.supplement, args.target, args.compatibility_probe, True)
            if primary["targetRegistry"] != supplement["targetRegistry"] or primary["samplingRegistry"] != supplement["samplingRegistry"]:
                raise ValueError("UNION_REGISTRY_MISMATCH")
            primary_pairs, supplement_pairs = primary["pairs"], supplement["pairs"]
            emit("historical_proof_union", classification="DIAGNOSTIC_ONLY_NO_MERGE_OR_PRODUCTION_AUTHORITY", primaryPairs=len(primary_pairs), supplementPairs=len(supplement_pairs), intersectionPairs=len(primary_pairs & supplement_pairs), unionPairs=len(primary_pairs | supplement_pairs), supplementNewPairs=len(supplement_pairs-primary_pairs))
    except Exception as exc:
        emit("inspection_failed", **safe_failure(exc))
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
