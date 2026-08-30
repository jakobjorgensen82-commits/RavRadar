#!/usr/bin/env python3
"""Inspect the private Copernicus cache without printing retained raw vectors."""
from __future__ import annotations

import argparse
import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from lib.copernicus_current import (
    TARGET_REGISTRY_KIND,
    validate_legacy_shadow_for_migration,
    validate_shadow,
    validate_target_registry,
)
from lib.copernicus_target_identity import target_fingerprint, targets_from_registry


DEFAULT_SHADOW = Path(".cache/copernicus-current-shadow.json")


def arguments() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--shadow", type=Path, default=DEFAULT_SHADOW)
    parser.add_argument("--at", help="UTC time used by deterministic tests; defaults to now")
    parser.add_argument("--targets", type=Path, help="Require the collection to match this central target registry")
    parser.add_argument("--github-output", type=Path, help="Optional GitHub Actions output file")
    return parser.parse_args()


def utc_hour(value: str | None) -> datetime:
    parsed = datetime.now(timezone.utc) if not value else datetime.fromisoformat(value.replace("Z", "+00:00"))
    if parsed.tzinfo is None:
        raise ValueError("Inspection time must include a timezone")
    return parsed.astimezone(timezone.utc).replace(minute=0, second=0, microsecond=0)


def parse_valid_time(value: Any) -> datetime:
    parsed = datetime.fromisoformat(str(value).replace("Z", "+00:00"))
    if parsed.tzinfo is None:
        raise ValueError("Cache record time must include a timezone")
    return parsed.astimezone(timezone.utc)


def valid_target_fingerprint(value: Any) -> bool:
    text = str(value or "")
    digest = text[7:] if text.startswith("sha256:") else ""
    return len(digest) == 64 and all(character in "0123456789abcdef" for character in digest)


def inspect(
    path: Path,
    target_hour: datetime,
    expected_fingerprint: str | None = None,
    expected_points: dict[str, tuple[float, float]] | None = None,
    range_registry: dict[str, Any] | None = None,
) -> dict[str, Any]:
    if not path.exists() or path.stat().st_size <= 0:
        return {"cachePresent": False, "currentHourPresent": False, "targetFingerprintMatch": False, "recordCount": 0}

    document = json.loads(path.read_text(encoding="utf-8"))
    if document.get("schemaVersion") == 2 and not isinstance(document.get("schemaVersion"), bool):
        target_identities = {
            row["partId"]: row for row in range_registry["targets"]
        } if range_registry is not None else None
        try:
            cache = validate_shadow(document, target_identities)
        except (TypeError, ValueError) as error:
            raise RuntimeError(f"Private Copernicus schema-2 cache is invalid: {error}") from None
        target_text = target_hour.isoformat().replace("+00:00", "Z")
        matches = [
            row for row in cache["collections"]
            if row["status"] == "COMPLETE" and row["productionReferenceAt"] == target_text
        ]
        exact_match = len(matches) == 1
        if exact_match and range_registry is not None:
            collection = matches[0]
            expected = {
                "rangeStartAt": range_registry["rangeStartAt"],
                "rangeEndAt": range_registry["rangeEndAt"],
                "coldBridgeHours": range_registry["coldBridgeHours"],
                "publicHourCount": range_registry["publicHourCount"],
                "targetRegistrySha256": range_registry["targetRegistrySha256"],
                "dmiCurrentInputSha256": range_registry["dmiCurrentInputSha256"],
                "dmiVerifierContractId": range_registry["dmiVerifierContractId"],
                "requiredPairsSha256": range_registry["requiredPairsSha256"],
                "requiredPairCount": range_registry["requiredPairCount"],
            }
            exact_match = all(collection.get(key) == value for key, value in expected.items())
        elif exact_match and expected_fingerprint is not None:
            exact_match = matches[0].get("targetRegistrySha256") == expected_fingerprint
        return {
            "cachePresent": True,
            "currentHourPresent": exact_match,
            "targetFingerprintMatch": exact_match,
            "recordCount": len(cache["records"]),
        }

    try:
        validate_legacy_shadow_for_migration(document)
    except (TypeError, ValueError) as error:
        raise RuntimeError(f"Private Copernicus legacy cache is invalid: {error}") from None
    if range_registry is not None:
        # A schema-1 hour collection cannot attest the new target/DMI-bound
        # -48..+117 matrix.  Force the one-way range acquisition/migration.
        return {
            "cachePresent": True,
            "currentHourPresent": False,
            "targetFingerprintMatch": False,
            "recordCount": len(document["records"]),
        }
    if document.get("schemaVersion") != 1:
        raise RuntimeError("Private Copernicus cache has an unsupported schema")
    records = document.get("records")

    record_times: list[datetime] = []
    for record in records:
        if not isinstance(record, dict):
            raise RuntimeError("Private Copernicus cache contains a malformed record")
        try:
            record_times.append(parse_valid_time(record.get("validTime")))
        except (TypeError, ValueError) as error:
            raise RuntimeError("Private Copernicus cache contains an invalid timestamp") from error
    collections = document.get("collections") or []
    if not isinstance(collections, list):
        raise RuntimeError("Private Copernicus cache collection metadata is malformed")
    matching_collection: dict[str, Any] | None = None
    for collection in collections:
        if not isinstance(collection, dict):
            raise RuntimeError("Private Copernicus cache contains malformed collection metadata")
        try:
            valid_time = parse_valid_time(collection.get("validTime"))
        except (TypeError, ValueError) as error:
            raise RuntimeError("Private Copernicus collection has an invalid timestamp") from error
        if valid_time == target_hour:
            matching_collection = collection
    matching_records = [record for record, value in zip(records, record_times) if value == target_hour]
    matching_record_count = len(matching_records)
    sampling_identity_match = True
    if expected_points is not None:
        for record in matching_records:
            expected_point = expected_points.get(str(record.get("partId") or ""))
            actual_point = record.get("samplingPoint")
            if not (
                expected_point is not None
                and isinstance(actual_point, (list, tuple))
                and len(actual_point) == 2
                and tuple(round(float(value), 7) for value in actual_point) == expected_point
            ):
                sampling_identity_match = False
                break
    declared_record_count = matching_collection.get("recordCount") if matching_collection else None
    declared_target_ids = matching_collection.get("targetPartIds") if matching_collection else None
    target_ids_match = bool(
        expected_points is None
        or declared_target_ids is None
        or (isinstance(declared_target_ids, list) and set(map(str, declared_target_ids)) == set(expected_points))
    )
    empty_target_collection = declared_record_count == 0 and declared_target_ids == []
    structurally_complete = (
        matching_collection is not None
        and isinstance(declared_record_count, int)
        and (declared_record_count > 0 or empty_target_collection)
        and declared_record_count == matching_record_count
        and valid_target_fingerprint(matching_collection.get("targetFingerprint"))
        and sampling_identity_match
        and target_ids_match
    )
    fingerprint_match = bool(
        structurally_complete
        and (expected_fingerprint is None or matching_collection.get("targetFingerprint") == expected_fingerprint)
    )
    return {
        "cachePresent": True,
        "currentHourPresent": fingerprint_match,
        "targetFingerprintMatch": fingerprint_match,
        "recordCount": len(records),
    }


def write_outputs(path: Path | None, state: dict[str, Any], target_hour: datetime) -> None:
    if path is None:
        return
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("a", encoding="utf-8") as handle:
        handle.write(f"cache_present={'true' if state['cachePresent'] else 'false'}\n")
        handle.write(f"current_hour_present={'true' if state['currentHourPresent'] else 'false'}\n")
        handle.write(f"target_fingerprint_match={'true' if state['targetFingerprintMatch'] else 'false'}\n")
        handle.write(f"target_hour={target_hour.isoformat().replace('+00:00', 'Z')}\n")


def main() -> int:
    args = arguments()
    target_hour = utc_hour(args.at)
    range_registry = None
    target_rows = None
    if args.targets:
        target_document = json.loads(args.targets.read_text(encoding="utf-8"))
        if target_document.get("kind") == TARGET_REGISTRY_KIND:
            range_registry = validate_target_registry(target_document)
            target_rows = range_registry["targets"]
        else:
            target_rows = targets_from_registry(args.targets)
    expected_fingerprint = (
        range_registry["targetRegistrySha256"] if range_registry is not None
        else target_fingerprint(target_rows) if target_rows is not None
        else None
    )
    expected_points = {
        row["partId"]: (round(float(row["waterPoint"][0]), 7), round(float(row["waterPoint"][1]), 7))
        for row in target_rows
    } if target_rows is not None else None
    state = inspect(
        args.shadow,
        target_hour,
        expected_fingerprint,
        expected_points,
        range_registry,
    )
    write_outputs(args.github_output, state, target_hour)
    if not state["cachePresent"]:
        print("Private Copernicus cache is absent; current-hour collection is required")
    elif state["currentHourPresent"]:
        print("Private Copernicus cache already contains the requested UTC hour for the current target geometry")
    else:
        print("Private Copernicus cache lacks a complete requested-hour collection for the current target geometry")
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except Exception as error:
        print(f"Private Copernicus cache inspection failed: {error}")
        raise SystemExit(1)
