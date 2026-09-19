#!/usr/bin/env python3
"""Read-only, payload-free audit of retained WAM assets and period values.

This does NOT replay the old sampler, prove historical state inputs, or change
weather/state. Numeric comparisons are at the native grid cell stored in the
candidate. Neither the candidate nor original GRIB files are ever rewritten.
"""
from __future__ import annotations

import argparse
import contextlib
import hashlib
import json
import math
import os
from pathlib import Path
import re
import stat
import time
from collections import Counter, defaultdict
from datetime import datetime, timezone

from lib.dmi_bulk_storage import read_dmi_bulk_document

SCHEMA = "dmi-wave-period-evidence-v1"
SHA = re.compile(r"^[0-9a-f]{64}$")
GRID_KEYS = (
    "gridType", "Ni", "Nj", "numberOfPoints",
    "latitudeOfFirstGridPointInDegrees", "longitudeOfFirstGridPointInDegrees",
    "latitudeOfLastGridPointInDegrees", "longitudeOfLastGridPointInDegrees",
    "iDirectionIncrementInDegrees", "jDirectionIncrementInDegrees",
)
COUNT_KEYS = (
    "entities", "rows", "periodRows", "waveSourceRows", "nativeWaveSourceRows",
    "nonNativeOrIncompleteSourceRows", "uniqueReferencedAssets",
    "manifestAssets", "invalidManifestEntries", "missingManifestAssets", "ambiguousManifestAssets",
    "sourceManifestMatchedRows", "sourceManifestMismatchRows", "missingAssetFiles",
    "unsafeAssetFiles", "assetByteMismatch", "assetHashMismatch", "verifiedAssets",
    "verifiedAssetBytes", "hashedAssetBytes", "verifiedSourceRows", "inspectedAssets", "gribReadErrors",
    "messages", "pp1dMessages", "mwpMessages", "otherPeriodMessages",
    "assetsWithPp1d", "assetsWithMwp", "assetsWithBoth", "unsupportedGridMessages",
    "unsupportedPeriodUnitMessages",
    "messageTimeMismatch", "rowsComparedAtSavedGrid", "rowsWithoutPp1dAtSavedGrid",
    "rowsWithAmbiguousPp1d", "rowsWithoutMwpAtSavedGrid", "rowsWithAmbiguousMwp",
    "rowsSavedPeriodEqualsPp1d", "rowsSavedPeriodDiffersFromPp1d",
    "rowsSavedPeriodEqualsMwpOnly", "rowsSavedPeriodEqualsBoth",
    "rowsSavedPeriodEqualsNeither", "entitiesWithSavedPeriodDifferentFromPp1d",
    "assetsSkippedByBudget", "rowsSkippedByBudget",
)


def finite(value):
    return isinstance(value, (int, float)) and not isinstance(value, bool) and math.isfinite(value)


def utc(value):
    if not isinstance(value, str):
        return None
    try:
        parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
        return parsed.astimezone(timezone.utc).isoformat() if parsed.tzinfo else None
    except (ValueError, OverflowError):
        return None


def bounded_file(path, maximum):
    info = path.lstat()
    if path.is_symlink() or not stat.S_ISREG(info.st_mode) or not 0 < info.st_size <= maximum:
        raise ValueError("UNSAFE_OR_OVERSIZED_FILE")
    return info.st_size


def digest_file(path):
    result = hashlib.sha256()
    with path.open("rb") as handle:
        while chunk := handle.read(1024 * 1024):
            result.update(chunk)
    return result.hexdigest()


def binding(source):
    return (source.get("assetIdentitySha256"), source.get("contentSha256"))


def complete_native_source(source, row_time):
    if not isinstance(source, dict):
        return False
    point = source.get("gridPoint")
    return bool(
        source.get("provider") == "dmi" and source.get("component") == "wave"
        and source.get("collection") in {"wam_dw", "wam_nsb"}
        and utc(source.get("nativeValidTime")) == utc(row_time) is not None
        and utc(source.get("modelRun")) and utc(source.get("acquiredAt"))
        and source.get("itemId")
        and all(SHA.fullmatch(str(source.get(key) or "")) for key in (
            "assetIdentitySha256", "contentSha256", "gridDefinitionSha256"))
        and isinstance(source.get("contentLengthBytes"), int)
        and not isinstance(source.get("contentLengthBytes"), bool)
        and source["contentLengthBytes"] > 0
        and isinstance(point, list) and len(point) == 2
        and all(finite(value) for value in point)
        and -180 <= point[0] <= 180 and -90 <= point[1] <= 90
    )


def source_matches_manifest(source, entry):
    canonical = str(entry.get("canonicalHref") or "").split("?", 1)[0].split("#", 1)[0]
    if not canonical or hashlib.sha256(canonical.encode()).hexdigest() != source["assetIdentitySha256"]:
        return False
    return bool(
        all(source.get(key) == entry.get(key) for key in (
            "collection", "itemId", "assetIdentitySha256", "contentSha256",
            "contentLengthBytes", "assetSizeBytes"))
        and utc(source.get("modelRun")) == utc(entry.get("modelRun"))
        and utc(source.get("nativeValidTime")) == utc(entry.get("validTime"))
        and utc(source.get("acquiredAt")) == utc(entry.get("acquiredAt"))
        and all(utc(source.get(key)) == utc(entry.get(key)) for key in ("itemCreatedAt", "itemUpdatedAt"))
    )


@contextlib.contextmanager
def quiet_native_stderr():
    """ecCodes C errors must not expose paths/message payload in public logs."""
    saved = os.dup(2)
    try:
        with open(os.devnull, "wb") as null:
            os.dup2(null.fileno(), 2)
            yield
    finally:
        os.dup2(saved, 2)
        os.close(saved)


def grid_digest(ec, gid):
    values = []
    for key in GRID_KEYS:
        values.append(None if values and values[0] == "lambert" and key in GRID_KEYS[-4:]
                      else ec.codes_get(gid, key))
    canonical = json.dumps(tuple(values), ensure_ascii=False, separators=(",", ":"), default=str)
    return hashlib.sha256(canonical.encode()).hexdigest()


def message_time(ec, gid, prefix):
    day_key, time_key = ("dataDate", "dataTime") if prefix == "run" else ("validityDate", "validityTime")
    try:
        stamp = f"{int(ec.codes_get(gid, day_key)):08d}{int(ec.codes_get(gid, time_key)):04d}"
        return datetime.strptime(stamp, "%Y%m%d%H%M").replace(tzinfo=timezone.utc).isoformat()
    except Exception:
        return None


def inspect_grib(path, entry, records, counts, deadline, max_messages=256):
    """Compare exact saved grid cells; never infer a full old sampler winner."""
    import eccodes as ec
    output = [{"pp1d": [], "mwp": []} for _ in records]
    saw = set()
    with quiet_native_stderr(), path.open("rb") as handle:
        asset_messages = 0
        while True:
            if time.monotonic() >= deadline:
                raise TimeoutError("BOUND_REACHED")
            gid = ec.codes_grib_new_from_file(handle)
            if gid is None:
                break
            try:
                asset_messages += 1
                if asset_messages > max_messages:
                    raise ValueError("MESSAGE_BOUND_REACHED")
                counts["messages"] += 1
                short = str(ec.codes_get(gid, "shortName")).strip().lower()
                if short not in {"pp1d", "mwp"}:
                    if short in {"perpw", "mp1", "mp2", "mpts", "mpww"}:
                        counts["otherPeriodMessages"] += 1
                    continue
                counts[f"{short}Messages"] += 1
                saw.add(short)
                if str(ec.codes_get(gid, "units")).lower().strip() not in {"s", "sec", "seconds"}:
                    counts["unsupportedPeriodUnitMessages"] += 1
                    continue
                if (message_time(ec, gid, "run") != utc(entry.get("modelRun"))
                        or message_time(ec, gid, "valid") != utc(entry.get("validTime"))):
                    counts["messageTimeMismatch"] += 1
                    continue
                try:
                    definition = grid_digest(ec, gid)
                    points = ec.codes_get(gid, "numberOfPoints")
                    if not isinstance(points, int) or not 0 < points <= 2_000_000:
                        raise ValueError("GRID_SIZE_BOUND")
                except Exception:
                    counts["unsupportedGridMessages"] += 1
                    continue
                interested = [(pos, record) for pos, record in enumerate(records)
                              if record["source"]["gridDefinitionSha256"] == definition]
                if not interested:
                    continue
                # Resolve the already persisted cell, not a new nearest wet cell.
                # Never interpolate and never substitute a nearby grid coordinate.
                latitudes = ec.codes_get_array(gid, "latitudes")
                longitudes = ec.codes_get_array(gid, "longitudes")
                wanted = {(round(record["source"]["gridPoint"][1], 7),
                           round(record["source"]["gridPoint"][0], 7)) for _, record in interested}
                found = defaultdict(list)
                for index, (lat, lon) in enumerate(zip(latitudes, longitudes)):
                    normal_lon = (float(lon) + 180) % 360 - 180
                    cell = (round(float(lat), 7), round(normal_lon, 7))
                    if cell in wanted:
                        found[cell].append(index)
                missing = ec.codes_get(gid, "missingValue")
                indexes = sorted({positions[0] for positions in found.values() if len(positions) == 1})
                if not indexes:
                    continue
                values = dict(zip(indexes, ec.codes_get_elements(gid, "values", indexes)))
                for pos, record in interested:
                    cell = (round(record["source"]["gridPoint"][1], 7),
                            round(record["source"]["gridPoint"][0], 7))
                    positions = found.get(cell, [])
                    if len(positions) != 1:
                        continue
                    value = float(values[positions[0]])
                    # Old valid_value returns float unchanged; only missing and
                    # non-finite/huge numbers are rejected. Cache JSON is lossless.
                    is_missing = finite(missing) and math.isclose(value, float(missing), rel_tol=0, abs_tol=1e-12)
                    if finite(value) and not is_missing and abs(value) <= 1e19 and value >= 0:
                        output[pos][short].append(value)
            finally:
                ec.codes_release(gid)
    counts["assetsWithPp1d"] += "pp1d" in saw
    counts["assetsWithMwp"] += "mwp" in saw
    counts["assetsWithBoth"] += {"pp1d", "mwp"} <= saw
    return output


def summarize_comparisons(records, comparisons, counts, changed_entities):
    for record, values in zip(records, comparisons):
        peak, mean = values["pp1d"], values["mwp"]
        if len(peak) != 1:
            counts["rowsWithoutPp1dAtSavedGrid" if not peak else "rowsWithAmbiguousPp1d"] += 1
            continue
        counts["rowsComparedAtSavedGrid"] += 1
        peak_equal = record["period"] == peak[0]
        counts["rowsSavedPeriodEqualsPp1d" if peak_equal else "rowsSavedPeriodDiffersFromPp1d"] += 1
        if not peak_equal:
            changed_entities.add(record["entity"])
        if len(mean) != 1:
            counts["rowsWithoutMwpAtSavedGrid" if not mean else "rowsWithAmbiguousMwp"] += 1
            continue
        mean_equal = record["period"] == mean[0]
        if mean_equal:
            counts["rowsSavedPeriodEqualsBoth" if peak_equal else "rowsSavedPeriodEqualsMwpOnly"] += 1
        elif not peak_equal:
            counts["rowsSavedPeriodEqualsNeither"] += 1


def audit(candidate, raw_dir, *, stage="manifest", max_assets=512,
          max_bytes=2560 * 1024 * 1024, max_seconds=600, inspector=inspect_grib):
    deadline = time.monotonic() + max_seconds
    counts = Counter({key: 0 for key in COUNT_KEYS})
    candidate_bytes = bounded_file(candidate, 256 * 1024 * 1024)
    document = read_dmi_bulk_document(candidate)
    manifest_path = raw_dir / "asset-manifest.json"
    bounded_file(manifest_path, 64 * 1024 * 1024)
    manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    assets = manifest.get("assets")
    if not isinstance(assets, dict) or len(assets) > 100_000:
        raise ValueError("INVALID_MANIFEST")
    counts["manifestAssets"] = len(assets)
    index = defaultdict(list)
    for name, entry in assets.items():
        if (isinstance(entry, dict) and isinstance(name, str)
                and all(SHA.fullmatch(str(entry.get(key) or ""))
                        for key in ("assetIdentitySha256", "contentSha256"))):
            index[binding(entry)].append((name, entry))
        else:
            counts["invalidManifestEntries"] += 1
    referenced = defaultdict(list)
    zones = document.get("zones") or {}
    counts["entities"] = len(zones)
    for entity, zone in zones.items():
        if not isinstance(zone, dict):
            continue
        hourly = zone.get("hourly") or {}
        rows = hourly.items() if isinstance(hourly, dict) else ((None, row) for row in hourly)
        for key, row in rows:
            counts["rows"] += 1
            if counts["rows"] > 2_000_000 or time.monotonic() >= deadline:
                raise ValueError("CANDIDATE_BOUND_REACHED")
            if not isinstance(row, dict) or not finite(row.get("dominant-wave-period")):
                continue
            counts["periodRows"] += 1
            source = (row.get("sources") or {}).get("wave")
            if not isinstance(source, dict):
                continue
            counts["waveSourceRows"] += 1
            if ((key and row.get("time") and utc(key) != utc(row["time"]))
                    or not complete_native_source(source, row.get("time") or key)):
                counts["nonNativeOrIncompleteSourceRows"] += 1
                continue
            counts["nativeWaveSourceRows"] += 1
            referenced[binding(source)].append({"entity": entity, "source": source,
                                               "period": float(row["dominant-wave-period"])})
    counts["uniqueReferencedAssets"] = len(referenced)
    changed_entities = set()
    partial = False
    processed = 0
    for key, records in sorted(referenced.items()):
        if processed >= max_assets or time.monotonic() >= deadline:
            counts["assetsSkippedByBudget"] += 1
            counts["rowsSkippedByBudget"] += len(records)
            partial = True
            continue
        processed += 1
        matches = index.get(key, [])
        if len(matches) != 1:
            counts["missingManifestAssets" if not matches else "ambiguousManifestAssets"] += 1
            continue
        name, entry = matches[0]
        matched = [record for record in records if source_matches_manifest(record["source"], entry)]
        counts["sourceManifestMatchedRows"] += len(matched)
        counts["sourceManifestMismatchRows"] += len(records) - len(matched)
        if not matched:
            continue
        path = raw_dir / name
        if Path(name).name != name or path.is_symlink() or path.resolve().parent != raw_dir.resolve():
            counts["unsafeAssetFiles"] += 1
            continue
        if not path.exists():
            counts["missingAssetFiles"] += 1
            continue
        try:
            size = bounded_file(path, 512 * 1024 * 1024)
        except (OSError, ValueError):
            counts["unsafeAssetFiles"] += 1
            partial = True
            continue
        if (size != entry.get("contentLengthBytes") or size != entry.get("bytes")
                or entry.get("assetSizeBytes") not in (None, size)):
            counts["assetByteMismatch"] += 1
            continue
        if counts["hashedAssetBytes"] + size > max_bytes:
            counts["assetsSkippedByBudget"] += 1
            counts["rowsSkippedByBudget"] += len(matched)
            partial = True
            continue
        counts["hashedAssetBytes"] += size
        if digest_file(path) != entry.get("contentSha256"):
            counts["assetHashMismatch"] += 1
            continue
        counts["verifiedAssets"] += 1
        counts["verifiedAssetBytes"] += size
        counts["verifiedSourceRows"] += len(matched)
        if stage == "grib":
            try:
                comparisons = inspector(path, entry, matched, counts, deadline)
                summarize_comparisons(matched, comparisons, counts, changed_entities)
                counts["inspectedAssets"] += 1
            except Exception:
                counts["gribReadErrors"] += 1
                partial = True
    counts["entitiesWithSavedPeriodDifferentFromPp1d"] = len(changed_entities)
    return {
        "schemaVersion": SCHEMA, "stage": stage, "status": "BOUNDED_PARTIAL" if partial else "AUDIT_COMPLETED",
        "candidateStoredBytes": candidate_bytes, "counts": dict(counts),
        "providerRequestsPerformed": False, "inputFilesModified": False,
        "coordinatesIncluded": False, "rawScalarsIncluded": False, "sourceIdentifiersIncluded": False,
        "numericComparisonScope": "EXACT_PERSISTED_NATIVE_GRID_CELL_ONLY",
        "numericEqualityRule": "EXACT_FLOAT_EQUALITY_OLD_VALID_VALUE_AND_LOSSLESS_JSON",
        "oldSamplerWinnerReplayed": False, "productionGenerationProved": False,
        "historicalStateImpactProved": False, "affectedStateCount": None,
    }


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--candidate", type=Path, required=True)
    parser.add_argument("--raw-dir", type=Path, required=True)
    parser.add_argument("--stage", choices=("manifest", "grib"), default="manifest")
    parser.add_argument("--max-assets", type=int, default=512)
    parser.add_argument("--max-bytes", type=int, default=2560 * 1024 * 1024)
    parser.add_argument("--max-seconds", type=int, default=600)
    parser.add_argument("--output", type=Path)
    args = parser.parse_args()
    try:
        if not (1 <= args.max_assets <= 2048 and 1 <= args.max_bytes <= 3 * 1024**3
                and 1 <= args.max_seconds <= 1200):
            raise ValueError("INVALID_BOUNDS")
        if args.output and (args.output.resolve() == args.candidate.resolve()
                            or args.raw_dir.resolve() in args.output.resolve().parents):
            raise ValueError("OUTPUT_COLLIDES_WITH_INPUT")
        report = audit(args.candidate, args.raw_dir, stage=args.stage,
                       max_assets=args.max_assets, max_bytes=args.max_bytes, max_seconds=args.max_seconds)
        encoded = json.dumps(report, ensure_ascii=True, sort_keys=True, separators=(",", ":"))
        if args.output:
            # A new report only; never overwrite an existing file.
            with args.output.open("x", encoding="utf-8") as handle:
                handle.write(encoded + "\n")
        print(encoded, flush=True)
        return 0
    except Exception:
        # Never echo exceptions: parser/native failures can contain private input.
        print(json.dumps({"schemaVersion": SCHEMA, "status": "AUDIT_FAILED_CLOSED",
                          "privatePayloadIncluded": False}), flush=True)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
