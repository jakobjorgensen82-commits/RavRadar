#!/usr/bin/env python3
"""Reconcile two sealed, private current-source generations without public values."""
from __future__ import annotations

import argparse
from datetime import datetime, timezone
import json
from pathlib import Path

from lib.copernicus_current import load_targets
from lib.copernicus_current_donor_bank import backfill_verified_copernicus_donor_banks
from lib.open_meteo_current_fallback import backfill_verified_donor_banks


def exact_hour(value: str) -> datetime:
    parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
    if parsed.tzinfo is None or parsed.minute or parsed.second or parsed.microsecond:
        raise ValueError("CURRENT_DONOR_TARGET_HOUR_INVALID")
    return parsed.astimezone(timezone.utc)


def read_bank(path: Path) -> dict:
    if path.is_symlink() or not path.is_file() or not 0 < path.stat().st_size <= 256 * 1024 * 1024:
        raise ValueError("CURRENT_DONOR_FILE_INVALID")
    document = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(document, dict):
        raise ValueError("CURRENT_DONOR_FILE_INVALID")
    return document


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--kind", choices=("copernicus", "open-meteo"), required=True)
    parser.add_argument("--latest", type=Path, required=True)
    parser.add_argument("--complete", type=Path, required=True)
    parser.add_argument("--targets", type=Path, required=True)
    parser.add_argument("--target-reference", required=True)
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument("--report", type=Path, required=True)
    args = parser.parse_args()
    reference = exact_hour(args.target_reference)
    targets = load_targets(args.targets)
    latest = read_bank(args.latest)
    complete = read_bank(args.complete)
    if args.kind == "copernicus":
        merged = backfill_verified_copernicus_donor_banks(
            latest, complete, targets=targets, production_reference_at=reference,
        )
        count = len(merged["shadow"]["records"])
        kind = "COPERNICUS_CURRENT_DONOR_GENERATION_UNION"
    else:
        now = datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")
        # An exceptional protected pair may be restored oldest-first even
        # when its donor generation has the later reference. Native conflict
        # policy still decides records; the API requires chronological order.
        if complete["productionReferenceAt"] > latest["productionReferenceAt"]:
            latest, complete = complete, latest
        merged = backfill_verified_donor_banks(
            latest, complete, targets=targets,
            production_reference_at=reference.isoformat().replace("+00:00", "Z"),
            checkpointed_at=now,
        )
        count = merged["entryCount"]
        kind = "OPEN_METEO_CURRENT_DONOR_GENERATION_UNION"
    # The caller owns a private, newly created staging directory. Never print
    # weather values, coordinates, source bytes, or validation exceptions.
    with args.output.open("x", encoding="utf-8") as handle:
        json.dump(merged, handle, separators=(",", ":"), ensure_ascii=False)
        handle.write("\n")
    with args.report.open("x", encoding="utf-8") as handle:
        json.dump({"schemaVersion": 1, "kind": kind, "recordCount": count}, handle)
        handle.write("\n")


if __name__ == "__main__":
    try:
        main()
    except Exception:
        raise SystemExit("CURRENT_DONOR_GENERATION_UNION_REJECTED") from None
