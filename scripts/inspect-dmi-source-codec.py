#!/usr/bin/env python3
"""Run the production DMI storage codec on one bounded cache without replacing it.

Only aggregate sizes, counts, hashes of implementation files and booleans are
printed. The private input is never modified or uploaded.
"""
from __future__ import annotations

import argparse
import gc
import hashlib
import json
import pathlib
import stat
import sys
import time
from typing import Any

from lib.dmi_bulk_storage import (
    MAX_LEGACY_BYTES,
    MAX_STORED_BYTES,
    STORAGE_SCHEMA,
    read_dmi_bulk_document,
    write_dmi_bulk_document,
)


ENCODER = json.JSONEncoder(
    ensure_ascii=False,
    sort_keys=True,
    separators=(",", ":"),
    allow_nan=False,
)


def canonical_measure(document: Any) -> tuple[str, int]:
    digest = hashlib.sha256()
    total = 0
    for text in ENCODER.iterencode(document):
        chunk = text.encode("utf-8")
        digest.update(chunk)
        total += len(chunk)
    return digest.hexdigest(), total


def file_sha256(path: pathlib.Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        while chunk := handle.read(1024 * 1024):
            digest.update(chunk)
    return digest.hexdigest()


def source_count(document: Any) -> int:
    count = 0
    zones = document.get("zones") if isinstance(document, dict) else None
    if not isinstance(zones, dict):
        raise ValueError("DMI document lacks zones")
    for zone in zones.values():
        hourly = zone.get("hourly") if isinstance(zone, dict) else None
        rows = hourly.values() if isinstance(hourly, dict) else hourly if isinstance(hourly, list) else ()
        for row in rows:
            sources = row.get("sources") if isinstance(row, dict) else None
            if isinstance(sources, dict):
                count += sum(isinstance(source, dict) for source in sources.values())
    return count


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--cache", required=True)
    parser.add_argument("--encoded-output", required=True)
    parser.add_argument("--retain-encoded", action="store_true")
    args = parser.parse_args()
    source = pathlib.Path(args.cache).resolve()
    encoded = pathlib.Path(args.encoded_output).resolve()
    started = time.monotonic()
    try:
        if source == encoded:
            raise ValueError("diagnostic output must differ from input")
        info = source.lstat()
        if not stat.S_ISREG(info.st_mode) or source.is_symlink() \
                or not 1 < info.st_size <= MAX_LEGACY_BYTES:
            raise ValueError("input is not a bounded regular file")
        input_sha256 = file_sha256(source)
        document = read_dmi_bulk_document(
            source,
            allow_large_legacy=True,
            expand_sources=True,
        )
        before_sha256, before_bytes = canonical_measure(document)
        before_sources = source_count(document)
        encoded_bytes = write_dmi_bulk_document(encoded, document)
        if not 1 < encoded_bytes <= MAX_STORED_BYTES:
            raise ValueError("encoded output exceeds production bound")
        del document
        gc.collect()
        decoded = read_dmi_bulk_document(encoded, expand_sources=True)
        after_sha256, after_bytes = canonical_measure(decoded)
        after_sources = source_count(decoded)
        del decoded
        gc.collect()
        wrapper = read_dmi_bulk_document(encoded, expand_sources=False)
        if not isinstance(wrapper, dict) or not isinstance(wrapper.get("zones"), dict):
            raise ValueError("non-expanded production validation failed")
        del wrapper
        gc.collect()
        current = source.lstat()
        input_unchanged = (
            current.st_size == info.st_size
            and current.st_mtime_ns == info.st_mtime_ns
            and file_sha256(source) == input_sha256
        )
        logical_unchanged = (
            before_sha256 == after_sha256
            and before_bytes == after_bytes
            and before_sources == after_sources
        )
        codec_path = pathlib.Path(__file__).with_name("lib") / "dmi_bulk_storage.py"
        report = {
            "contract": "DMI_PRODUCTION_STORAGE_CODEC_SCALE_PROOF_V1",
            "storageSchema": STORAGE_SCHEMA,
            "status": "PRODUCTION_CODEC_SCALE_VERIFIED"
            if logical_unchanged and input_unchanged
            else "PRODUCTION_CODEC_SCALE_FAILED",
            "inputFileBytes": info.st_size,
            "logicalCanonicalBytes": before_bytes,
            "encodedFileBytes": encoded_bytes,
            "maximumEncodedBytes": MAX_STORED_BYTES,
            "sourceCount": before_sources,
            "decodedSourceCount": after_sources,
            "logicalCanonicalSha256Unchanged": logical_unchanged,
            "inputFileUnchanged": input_unchanged,
            "pythonCodecSha256": file_sha256(codec_path),
            "elapsedSeconds": round(time.monotonic() - started, 2),
            "productionCodecUsed": True,
            "privatePayloadIncluded": False,
            "cacheReplaced": False,
            "encodedTemporaryRetained": bool(args.retain_encoded),
        }
        print(json.dumps(report, sort_keys=True, separators=(",", ":")))
        return 0 if logical_unchanged and input_unchanged else 1
    except Exception:
        print(json.dumps({
            "contract": "DMI_PRODUCTION_STORAGE_CODEC_SCALE_PROOF_V1",
            "status": "PRODUCTION_CODEC_SCALE_FAILED",
            "privatePayloadIncluded": False,
            "cacheReplaced": False,
        }, sort_keys=True, separators=(",", ":")))
        return 1
    finally:
        if not args.retain_encoded and encoded.exists():
            encoded.unlink()


if __name__ == "__main__":
    sys.exit(main())
