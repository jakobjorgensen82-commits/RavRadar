#!/usr/bin/env python3
"""Read-only cache sizing; stdout contains fixed labels and aggregate numbers only.

No cache records, identifiers, locations, values, hashes, paths or exception text
are emitted. JSON serialization of the full document uses iterencode, never a
second whole-document string. This diagnostic does not certify data readiness.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import pathlib
import stat
import sys
from collections import Counter
from typing import Any

MAX_INPUT_BYTES = 2 * 1024 * 1024 * 1024
ENCODER = json.JSONEncoder(ensure_ascii=False, separators=(",", ":"), allow_nan=False)
TOP_FIELDS = frozenset({
    "schemaVersion", "generatedAt", "refreshStatus", "runs", "zones", "diagnostics",
    "processingSignature", "processingSignatures", "waveHistoryBootstrap",
    "currentVectorSemanticsVersion", "currentMaxDistanceKm", "currentPreferredDistanceKm",
    "spatialProvenanceVersion", "version", "errors", "currentPartAttestation",
    "currentOperationalLedger", "sourceContract", "forecastHours", "historyHours",
})
DIAGNOSTIC_FIELDS = frozenset({
    "currentOperationalLedger", "currentPartAttestation", "collections", "errors",
    "processedSteps", "marineGridSearch", "rejectedScalarTuples", "waveHistoryBootstrap",
    "currentOperationalReady", "invalidatedIncompleteComponentProvenance",
    "invalidatedMarineGridZones", "currentAttestation", "sourceLedger",
})
LEDGER_FIELDS = frozenset({
    "attestation", "retainedCurrentAssetProofs", "collections", "upstreamAbsencePairs",
    "spatialUnavailablePairs", "operationalComplementPairs", "failureCodes", "ready",
    "retainedCurrentAssetProofCount", "upstreamAbsencePairCount",
    "spatialUnavailablePairCount", "operationalComplementPairCount", "hourCount", "targetCount",
})
ATTESTATION_FIELDS = frozenset({
    "verifiedPairs", "verifiedPairSources", "verifiedSourceTimes", "verifiedPairCount",
    "targetCount", "missingPairs", "retainedCurrentAssetProofs",
})
ZONE_FIELDS = frozenset({
    "hourly", "gridPoints", "collections", "processedSteps", "samplingPoint",
    "samplingIdentity", "processingSignature", "currentPartAttestation", "name",
})
COMPONENTS = frozenset({"current", "wave", "wind", "windTail", "waterLevel", "waterTemperature"})
ASSET_FIELDS = frozenset({
    "collection", "modelRun", "itemId", "assetIdentitySha256", "assetSizeBytes",
    "acquiredAt", "contentLengthBytes", "contentSha256", "itemCreatedAt", "itemUpdatedAt",
    "nativeValidTime",
})
SPATIAL_FIELDS = frozenset({
    "gridPoint", "gridDefinitionSha256", "distanceKm", "samplingPoint", "samplingPointSha256",
    "samplingIdentitySha256", "sourceRegistrySha256", "coastalPartId", "partId", "zoneId",
    "entityId", "entityType", "parentZoneId", "samplingContext", "physicalPointSha256",
    "verticalLayer", "verticalLayerRankM",
})


def serialized_bytes(value: Any) -> int:
    return sum(len(chunk.encode("utf-8")) for chunk in ENCODER.iterencode(value))


def shape(value: Any) -> dict[str, Any]:
    kind = ("object" if isinstance(value, dict) else "array" if isinstance(value, list)
            else "null" if value is None else "boolean" if isinstance(value, bool)
            else "number" if isinstance(value, (int, float)) else "string")
    return {"type": kind, "entries": len(value) if isinstance(value, (dict, list)) else 0,
            "compactBytes": serialized_bytes(value)}


def field_sizes(document: Any, allowed: frozenset[str]) -> dict[str, Any]:
    if not isinstance(document, dict):
        return {"shape": shape(document)}
    result = {}
    other_count = other_bytes = 0
    for key, value in document.items():
        if key in allowed:
            result[key] = shape(value)
        else:
            other_count += 1
            other_bytes += serialized_bytes(value)
    result["unlistedFields"] = {"entries": other_count, "compactBytes": other_bytes}
    return result


class DuplicateSizer:
    def __init__(self) -> None:
        self.count = self.total = self.unique_bytes = 0
        self.seen: set[bytes] = set()

    def add(self, value: Any) -> None:
        # Each input is one small component/provenance record, never a cache.
        encoded = json.dumps(value, ensure_ascii=False, sort_keys=True,
                             separators=(",", ":"), allow_nan=False).encode("utf-8")
        digest = hashlib.sha256(encoded).digest()
        self.count += 1
        self.total += len(encoded)
        if digest not in self.seen:
            self.seen.add(digest)
            self.unique_bytes += len(encoded)

    def summary(self) -> dict[str, int]:
        return {"occurrences": self.count, "compactBytes": self.total,
                "uniqueObjects": len(self.seen), "uniqueCompactBytes": self.unique_bytes,
                "duplicateCompactBytes": self.total - self.unique_bytes}


def inspect(document: dict[str, Any], file_bytes: int) -> dict[str, Any]:
    diagnostics = document.get("diagnostics", {})
    ledger = diagnostics.get("currentOperationalLedger", {}) if isinstance(diagnostics, dict) else {}
    attestation = ledger.get("attestation", {}) if isinstance(ledger, dict) else {}
    result: dict[str, Any] = {
        "contract": "DMI_CACHE_AGGREGATE_INSPECTION_V1", "status": "INSPECTED_NOT_VALIDATED",
        "fileBytes": file_bytes, "maximumInputBytes": MAX_INPUT_BYTES,
        "topFields": field_sizes(document, TOP_FIELDS),
        "diagnosticFields": field_sizes(diagnostics, DIAGNOSTIC_FIELDS),
        "ledgerFields": field_sizes(ledger, LEDGER_FIELDS),
        "attestationFields": field_sizes(attestation, ATTESTATION_FIELDS),
        "privatePayloadIncluded": False,
    }
    zones = document.get("zones", {})
    if not isinstance(zones, dict):
        result["zonesInvalid"] = True
        return result
    counts = Counter()
    zone_field_bytes = Counter()
    row_counts = Counter()
    source_fields = Counter()
    duplicates = {name: DuplicateSizer() for name in (
        "wholeSource", "assetIdentity", "spatialIdentity", "otherSemantics")}
    components = {name: {"count": 0, "compactBytes": 0} for name in (*sorted(COMPONENTS), "other")}
    for zone_key, zone in zones.items():
        counts["partZones" if str(zone_key).startswith("PART:") else "otherZones"] += 1
        if not isinstance(zone, dict):
            counts["invalidZones"] += 1
            continue
        for key, value in zone.items():
            zone_field_bytes[key if key in ZONE_FIELDS else "other"] += serialized_bytes(value)
        hourly = zone.get("hourly", {})
        rows = hourly.values() if isinstance(hourly, dict) else hourly if isinstance(hourly, list) else ()
        for row in rows:
            row_counts["total"] += 1
            if not isinstance(row, dict):
                row_counts["invalid"] += 1
                continue
            sources = row.get("sources", {})
            row_counts["sourceContainers"] += isinstance(sources, dict)
            for key, value in row.items():
                row_counts["sourcesBytes" if key == "sources" else "otherFieldBytes"] += serialized_bytes(value)
            if not isinstance(sources, dict):
                continue
            for component, source in sources.items():
                group = component if component in COMPONENTS else "other"
                components[group]["count"] += 1
                components[group]["compactBytes"] += serialized_bytes(source)
                if not isinstance(source, dict):
                    row_counts["invalidSources"] += 1
                    continue
                duplicates["wholeSource"].add(source)
                duplicates["assetIdentity"].add({k: v for k, v in source.items() if k in ASSET_FIELDS})
                duplicates["spatialIdentity"].add({k: v for k, v in source.items() if k in SPATIAL_FIELDS})
                duplicates["otherSemantics"].add({k: v for k, v in source.items()
                    if k not in ASSET_FIELDS and k not in SPATIAL_FIELDS})
                for key, value in source.items():
                    category = "assetIdentity" if key in ASSET_FIELDS else "spatialIdentity" if key in SPATIAL_FIELDS else "otherSemantics"
                    source_fields[category] += serialized_bytes(value)
    result.update({"zoneCounts": dict(counts), "zoneFieldValueBytes": dict(zone_field_bytes),
                   "rowCounts": dict(row_counts), "sourceComponents": components,
                   "sourceFieldValueBytes": dict(source_fields),
                   "sourceDuplicateSizing": {k: v.summary() for k, v in duplicates.items()}})
    return result


def self_test() -> None:
    secret = "PRIVATE_COORDINATE_ID_VALUE_SENTINEL"
    source = {"itemId": secret, "gridPoint": [12.5, 55.5], "provider": "dmi"}
    fixture = {"zones": {"PART:" + secret: {"hourly": {secret: {"sources": {"current": source}}}},
                         secret: {"hourly": {secret: {"sources": {"current": source}}}}},
               secret: secret, "diagnostics": {secret: secret}}
    report = inspect(fixture, serialized_bytes(fixture))
    encoded = json.dumps(report)
    assert secret not in encoded and "12.5" not in encoded and "55.5" not in encoded
    assert report["zoneCounts"]["partZones"] == 1
    assert report["sourceDuplicateSizing"]["wholeSource"]["uniqueObjects"] == 1
    assert report["sourceDuplicateSizing"]["wholeSource"]["occurrences"] == 2
    assert serialized_bytes({"unicode": "ø"}) == len('{"unicode":"ø"}'.encode("utf-8"))
    print('{"status":"SELF_TEST_PASSED","privatePayloadIncluded":false}')


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--cache")
    parser.add_argument("--self-test", action="store_true")
    args = parser.parse_args()
    try:
        if args.self_test:
            self_test()
            return 0
        if not args.cache:
            raise ValueError("missing argument")
        cache = pathlib.Path(args.cache)
        info = cache.lstat()
        if not stat.S_ISREG(info.st_mode) or not 2 <= info.st_size <= MAX_INPUT_BYTES:
            raise ValueError("input rejected")
        with cache.open("r", encoding="utf-8") as handle:
            document = json.load(handle)
        if not isinstance(document, dict):
            raise ValueError("document rejected")
        report = inspect(document, info.st_size)
        print(json.dumps(report, ensure_ascii=True, sort_keys=True, separators=(",", ":")))
        return 0
    except Exception:
        # Never include exception text: parsers and paths may contain private data.
        print('{"status":"INSPECTION_FAILED","privatePayloadIncluded":false}')
        return 1


if __name__ == "__main__":
    sys.exit(main())

