#!/usr/bin/env python3
"""Diagnostic-only lossless DMI source dictionary roundtrip; never writes cache.

Stdout is a fixed aggregate report, not the encoded or decoded document. The
prototype measures feasibility; it is not a production cache admission check.
"""
from __future__ import annotations

import argparse
import copy
import hashlib
import importlib.util
import json
import pathlib
import stat
import sys
import time
import zlib
from typing import Any

_spec = importlib.util.spec_from_file_location(
    "dmi_aggregate_inspector", pathlib.Path(__file__).with_name("inspect-dmi-cache-aggregate.py"))
assert _spec and _spec.loader
_aggregate = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(_aggregate)
ASSET_FIELDS = _aggregate.ASSET_FIELDS
SPATIAL_FIELDS = _aggregate.SPATIAL_FIELDS
MAX_INPUT_BYTES = 2 * 1024 * 1024 * 1024
MAX_ENCODED_BYTES = 256 * 1024 * 1024
MAX_SOURCE_RECORDS = 2_000_000
SCHEMA = "dmi-bulk-source-dictionary-prototype-v1"
GROUPS = ("asset", "spatial", "semantics")
ENCODER = json.JSONEncoder(ensure_ascii=False, sort_keys=True,
                           separators=(",", ":"), allow_nan=False)


def canonical_measure(document: Any, gzip_sizes: list[int] | None = None) -> tuple[bytes, int]:
    digest = hashlib.sha256()
    total = 0
    compressor = zlib.compressobj(level=9, wbits=31) if gzip_sizes is not None else None
    compressed_bytes = 0
    compression_buffer = bytearray()
    for text in ENCODER.iterencode(document):
        chunk = text.encode("utf-8")
        digest.update(chunk)
        total += len(chunk)
        if compressor is not None:
            compression_buffer.extend(chunk)
            if len(compression_buffer) >= 64 * 1024:
                compressed_bytes += len(compressor.compress(compression_buffer))
                compression_buffer.clear()
    if compressor is not None:
        compressed_bytes += len(compressor.compress(compression_buffer))
        compressed_bytes += len(compressor.flush())
        gzip_sizes.append(compressed_bytes)
    return digest.digest(), total


def source_containers(document: Any):
    if not isinstance(document, dict) or not isinstance(document.get("zones"), dict):
        raise ValueError("invalid document")
    for zone in document["zones"].values():
        if not isinstance(zone, dict):
            continue
        hourly = zone.get("hourly")
        rows = hourly.values() if isinstance(hourly, dict) else hourly if isinstance(hourly, list) else ()
        for row in rows:
            if isinstance(row, dict) and isinstance(row.get("sources"), dict):
                yield row["sources"]


def encode_in_memory(document: dict[str, Any]) -> tuple[dict[str, Any], int]:
    """Mutate only this private in-memory document, never the input file."""
    if ASSET_FIELDS & SPATIAL_FIELDS:
        raise ValueError("partition overlap")
    tables: dict[str, list[dict[str, Any]]] = {group: [] for group in GROUPS}
    indexes: dict[str, dict[bytes, int]] = {group: {} for group in GROUPS}
    count = 0
    for sources in source_containers(document):
        for component in tuple(sources):
            source = sources[component]
            if not isinstance(source, dict):
                continue
            if set(source) == {"$dmiSource"}:
                raise ValueError("reserved reference collision")
            count += 1
            if count > MAX_SOURCE_RECORDS:
                raise ValueError("source bound")
            partition = {
                "asset": {k: v for k, v in source.items() if k in ASSET_FIELDS},
                "spatial": {k: v for k, v in source.items() if k in SPATIAL_FIELDS},
                "semantics": {k: v for k, v in source.items()
                              if k not in ASSET_FIELDS and k not in SPATIAL_FIELDS},
            }
            references = []
            for group in GROUPS:
                value = partition[group]
                key = json.dumps(value, ensure_ascii=False, sort_keys=True,
                                 separators=(",", ":"), allow_nan=False).encode("utf-8")
                index = indexes[group].get(key)
                if index is None:
                    index = len(tables[group])
                    indexes[group][key] = index
                    tables[group].append(value)
                references.append(index)
            sources[component] = {"$dmiSource": references}
    return {"storageSchema": SCHEMA, "sourceTables": tables, "document": document}, count


def decode_in_memory(wrapper: dict[str, Any]) -> tuple[dict[str, Any], int]:
    if not isinstance(wrapper, dict) or set(wrapper) != {"storageSchema", "sourceTables", "document"}:
        raise ValueError("wrapper shape")
    if wrapper["storageSchema"] != SCHEMA:
        raise ValueError("wrapper schema")
    tables = wrapper["sourceTables"]
    if not isinstance(tables, dict) or set(tables) != set(GROUPS):
        raise ValueError("table shape")
    for group in GROUPS:
        if not isinstance(tables[group], list) or len(tables[group]) > MAX_SOURCE_RECORDS:
            raise ValueError("table bound")
        for value in tables[group]:
            if not isinstance(value, dict):
                raise ValueError("table entry shape")
            keys = set(value)
            if ((group == "asset" and not keys <= ASSET_FIELDS)
                    or (group == "spatial" and not keys <= SPATIAL_FIELDS)
                    or (group == "semantics" and keys & (ASSET_FIELDS | SPATIAL_FIELDS))):
                raise ValueError("partition collision")
    count = 0
    for sources in source_containers(wrapper["document"]):
        for component in tuple(sources):
            reference = sources[component]
            if not isinstance(reference, dict):
                continue
            if set(reference) != {"$dmiSource"}:
                raise ValueError("reference shape")
            refs = reference["$dmiSource"]
            if not isinstance(refs, list) or len(refs) != len(GROUPS):
                raise ValueError("reference tuple")
            decoded = {}
            for group, index in zip(GROUPS, refs):
                if isinstance(index, bool) or not isinstance(index, int) or not 0 <= index < len(tables[group]):
                    raise ValueError("reference index")
                value = tables[group][index]
                if decoded.keys() & value.keys():
                    raise ValueError("duplicate source field")
                decoded.update(value)
            # Preserve value semantics: later edits to one tuple may not mutate
            # another tuple through a shared gridPoint/fieldSet object.
            sources[component] = copy.deepcopy(decoded)
            count += 1
            if count > MAX_SOURCE_RECORDS:
                raise ValueError("decoded source bound")
    return wrapper["document"], count


def self_test() -> None:
    source = {"itemId": "PRIVATE_SENTINEL", "gridPoint": [1.2, 3.4], "provider": "dmi",
              "unknownFutureField": {"nested": [True, None, "ø"]}}
    original = {"schemaVersion": 2, "zones": {"PART::PRIVATE_SENTINEL": {"hourly": {
        "t1": {"sources": {"current": source}},
        "t2": {"sources": {"current": copy.deepcopy(source)}}}}}}
    expected = copy.deepcopy(original)
    wrapper, count = encode_in_memory(original)
    malformed = copy.deepcopy(wrapper)
    next(source_containers(malformed["document"]))["current"]["$dmiSource"][0] = True
    try:
        decode_in_memory(malformed)
        raise AssertionError("boolean reference admitted")
    except ValueError:
        pass
    malformed = copy.deepcopy(wrapper)
    malformed["sourceTables"]["semantics"][0]["gridPoint"] = [5, 6]
    try:
        decode_in_memory(malformed)
        raise AssertionError("overlap admitted")
    except ValueError:
        pass
    decoded, decoded_count = decode_in_memory(wrapper)
    assert count == decoded_count == 2 and decoded == expected
    rows = list(next(iter(decoded["zones"].values()))["hourly"].values())
    rows[0]["sources"]["current"]["gridPoint"][0] = 999
    assert rows[1]["sources"]["current"]["gridPoint"][0] == 1.2
    print('{"status":"SELF_TEST_PASSED","privatePayloadIncluded":false}')


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--cache")
    parser.add_argument("--self-test", action="store_true")
    args = parser.parse_args()
    started = time.monotonic()
    try:
        if args.self_test:
            self_test()
            return 0
        if not args.cache:
            raise ValueError("input missing")
        path = pathlib.Path(args.cache)
        info = path.lstat()
        if not stat.S_ISREG(info.st_mode) or not 2 <= info.st_size <= MAX_INPUT_BYTES:
            raise ValueError("input bound")
        with path.open("r", encoding="utf-8") as handle:
            document = json.load(handle)
        before_digest, before_bytes = canonical_measure(document)
        wrapper, source_count = encode_in_memory(document)
        gzip_sizes: list[int] = []
        _encoded_digest, encoded_bytes = canonical_measure(wrapper, gzip_sizes)
        table_sizes = {group: {"entries": len(wrapper["sourceTables"][group]),
                              "bytes": canonical_measure(wrapper["sourceTables"][group])[1]}
                       for group in GROUPS}
        decoded, decoded_count = decode_in_memory(wrapper)
        after_digest, after_bytes = canonical_measure(decoded)
        unchanged = before_digest == after_digest and before_bytes == after_bytes
        current_info = path.stat()
        input_unchanged = current_info.st_size == info.st_size and current_info.st_mtime_ns == info.st_mtime_ns
        report = {
            "contract": "DMI_SOURCE_DICTIONARY_DIAGNOSTIC_V1",
            "status": "LOSSLESS_PROTOTYPE_VERIFIED" if unchanged and input_unchanged else "ROUNDTRIP_FAILED",
            "fileBytes": info.st_size, "originalCanonicalBytes": before_bytes,
            "encodedCanonicalBytes": encoded_bytes, "maximumEncodedBytes": MAX_ENCODED_BYTES,
            "encodedFileGzipBytes": gzip_sizes[0],
            "encodedFileOnlyMonthlyRollbackReadBytes": gzip_sizes[0] * 60 * 31 * 3,
            "fullPrivateArchiveMeasured": False,
            "withinEncodedBound": encoded_bytes <= MAX_ENCODED_BYTES,
            "decodedCanonicalBytes": after_bytes, "sourceCount": source_count,
            "decodedSourceCount": decoded_count, "tables": table_sizes,
            "logicalCanonicalSha256Unchanged": unchanged,
            "inputFileUnchanged": input_unchanged,
            "elapsedSeconds": round(time.monotonic() - started, 2),
            "productionReadinessValidated": False, "cacheWritten": False,
            "privatePayloadIncluded": False,
        }
        print(json.dumps(report, sort_keys=True, separators=(",", ":")))
        return 0 if unchanged and input_unchanged and source_count == decoded_count else 1
    except Exception:
        print('{"status":"CODEC_INSPECTION_FAILED","cacheWritten":false,"privatePayloadIncluded":false}')
        return 1


if __name__ == "__main__":
    sys.exit(main())
