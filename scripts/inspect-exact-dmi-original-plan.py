#!/usr/bin/env python3
"""Fixed pre-transport metadata/lstat report; never original qualification."""
from __future__ import annotations

import importlib.util
import json
from pathlib import Path
import stat
import sys


def deterministic_download_identity_counts(producer, originals):
    # The same pure normal helper owns candidate spelling and FULL URL-hash
    # matching. Count only; never return a URL or use it for I/O/admission.
    matches = sum(bool(producer.exact_original_download_candidates(value)) for value in originals)
    return dict(comparedCaptureCount=len(originals),
                fullIdentityMatchesByKnownHost={"opendataapi.dmi.dk": matches},
                maximumCandidatesPerCapture=2, remoteAvailabilityChecked=False, usedForTransport=False)


def inspect_exact_original_plan(producer):
    # Reuse the normal authenticated plan, exact capture, inventory and join
    # validators. Do not open/hash/decode any GRIB or enter restore/download.
    observed = set()
    plan = producer.read_exact_original_restore_plan(observed_names=observed)
    manifest, used = producer._exact_raw_state(observed_names=observed)
    unique = {}
    for value in plan["originals"]:
        capture = producer._exact_capture(value)
        key = producer._exact_original_json({k: v for k, v in capture.items() if k != "acquiredAt"})
        unique.setdefault(key, capture)
    counts = dict(validatedManifestAssetCount=0, validatedManifestFilePresentCount=0,
                  validatedManifestFileMissingCount=0, noManifestAssetCount=0,
                  noManifestPrefixFilePresentCount=0, conflictingManifestAssetCount=0)
    by_collection = {name: 0 for name in sorted(producer.MARINE_COLLECTIONS)}
    for capture in unique.values():
        if capture["collection"] not in by_collection:
            producer._exact_original_refuse("CAPTURE_INVALID")
        by_collection[capture["collection"]] += 1
        prefix = capture["assetIdentitySha256"][:24] + "."
        local_names = {name for name in observed if name.startswith(prefix)}
        matches, conflict = [], False
        for name, row in manifest["assets"].items():
            if not isinstance(row, dict):
                conflict |= isinstance(name, str) and name.startswith(prefix)
                continue
            href = row.get("canonicalHref")
            if (row.get("assetIdentitySha256") != capture["assetIdentitySha256"]
                    and producer.asset_identity_sha256(href) != capture["assetIdentitySha256"]
                    and not (isinstance(name, str) and name.startswith(prefix))):
                continue
            valid = producer._exact_same_capture(row, capture)
            try:
                producer._exact_official_https(href)
                selected = producer.cached_asset_path(href)
                valid &= (href == href.split("?", 1)[0].split("#", 1)[0]
                          and producer.asset_identity_sha256(href) == capture["assetIdentitySha256"]
                          and name == selected.name and Path(name).name == name)
            except producer.ExactOriginalRestoreRejected:
                valid = False
            if valid:
                matches.append(selected)
            else:
                conflict = True
        if conflict or len(matches) > 1 or local_names - {item.name for item in matches}:
            if not matches and not conflict and local_names:
                counts["noManifestAssetCount"] += 1
                counts["noManifestPrefixFilePresentCount"] += 1
            else:
                counts["conflictingManifestAssetCount"] += 1
            continue
        if not matches:
            counts["noManifestAssetCount"] += 1
            continue
        counts["validatedManifestAssetCount"] += 1
        try:
            info = matches[0].lstat()
        except FileNotFoundError:
            if matches[0].name in observed:
                producer._exact_original_refuse("RAW_ENTRY_REJECTED")
            counts["validatedManifestFileMissingCount"] += 1
        else:
            if not stat.S_ISREG(info.st_mode) or info.st_nlink != 1:
                producer._exact_original_refuse("RAW_ENTRY_REJECTED")
            counts["validatedManifestFilePresentCount"] += 1
    # Read-only observations are not stable numerical/file receipts. Detect
    # known metadata changes rather than authorising transport from the report.
    after_names = set()
    after_plan = producer.read_exact_original_restore_plan(observed_names=after_names)
    after_manifest, after_used = producer._exact_raw_state(observed_names=after_names)
    if (after_plan != plan or after_manifest != manifest or after_used != used or after_names != observed):
        producer._exact_original_refuse("MANIFEST_CHANGED")
    captures = list(unique.values())
    extent = lambda key: {
        "minimum": producer.canonical_time(min(captures, key=lambda item: producer.epoch(item[key]))[key]),
        "maximum": producer.canonical_time(max(captures, key=lambda item: producer.epoch(item[key]))[key]),
    }
    return dict(schemaVersion=1, kind="DMI_EXACT_ORIGINAL_PRETRANSPORT_METADATA",
                metadataAndLstatOnly=True, originalCount=len(plan["originals"]),
                uniqueAssetCount=len(unique), requiredUniqueBytes=sum(item["contentLengthBytes"] for item in captures),
                rawInventoryBytes=used, modelRun=extent("modelRun"), validTime=extent("validTime"),
                uniqueAssetCountByCollection=by_collection,
                deterministicDownloadIdentity=deterministic_download_identity_counts(producer, plan["originals"]), **counts,
                fileContentVerified=False, transportPerformed=False, decodePerformed=False,
                restorePerformed=False, cacheSaved=False)


def main():
    try:
        if sys.argv[1:]:
            raise ValueError("fixed entry")
        spec = importlib.util.spec_from_file_location("exact_original_inventory_producer",
            Path(__file__).with_name("update-dmi-bulk.py"))
        producer = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(producer)
        report = inspect_exact_original_plan(producer)
        text = json.dumps(report, separators=(",", ":"), allow_nan=False)
        if len(text.encode("utf-8")) > 8192:
            raise ValueError("fixed report bound")
        print(text, flush=True)
        return 0
    except Exception:
        # Never print exception strings, paths, captures, identifiers or URLs.
        print("DMI_EXACT_ORIGINAL_PRETRANSPORT_REFUSED", file=sys.stderr, flush=True)
        return 2


if __name__ == "__main__":
    raise SystemExit(main())
