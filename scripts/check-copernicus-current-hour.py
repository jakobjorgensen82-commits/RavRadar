#!/usr/bin/env python3
"""Inspect the private Copernicus cache without printing retained raw vectors."""
from __future__ import annotations

import argparse
import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Any


DEFAULT_SHADOW = Path(".cache/copernicus-current-shadow.json")


def arguments() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--shadow", type=Path, default=DEFAULT_SHADOW)
    parser.add_argument("--at", help="UTC time used by deterministic tests; defaults to now")
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


def inspect(path: Path, target_hour: datetime) -> dict[str, Any]:
    if not path.exists() or path.stat().st_size <= 0:
        return {"cachePresent": False, "currentHourPresent": False, "recordCount": 0}

    document = json.loads(path.read_text(encoding="utf-8"))
    if document.get("schemaVersion") != 1:
        raise RuntimeError("Private Copernicus cache has an unsupported schema")
    if document.get("retentionHours") != 168:
        raise RuntimeError("Private Copernicus cache has an unsafe retention value")
    if document.get("scoreImpact") is not False or document.get("publicRuntime") is not False:
        raise RuntimeError("Private Copernicus cache has unsafe runtime metadata")
    records = document.get("records")
    if not isinstance(records, list):
        raise RuntimeError("Private Copernicus cache records are malformed")

    valid_times: list[datetime] = []
    for record in records:
        if not isinstance(record, dict):
            raise RuntimeError("Private Copernicus cache contains a malformed record")
        try:
            valid_times.append(parse_valid_time(record.get("validTime")))
        except (TypeError, ValueError) as error:
            raise RuntimeError("Private Copernicus cache contains an invalid timestamp") from error
    return {
        "cachePresent": True,
        "currentHourPresent": target_hour in valid_times,
        "recordCount": len(records),
    }


def write_outputs(path: Path | None, state: dict[str, Any], target_hour: datetime) -> None:
    if path is None:
        return
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("a", encoding="utf-8") as handle:
        handle.write(f"cache_present={'true' if state['cachePresent'] else 'false'}\n")
        handle.write(f"current_hour_present={'true' if state['currentHourPresent'] else 'false'}\n")
        handle.write(f"target_hour={target_hour.isoformat().replace('+00:00', 'Z')}\n")


def main() -> int:
    args = arguments()
    target_hour = utc_hour(args.at)
    state = inspect(args.shadow, target_hour)
    write_outputs(args.github_output, state, target_hour)
    if not state["cachePresent"]:
        print("Private Copernicus cache is absent; current-hour collection is required")
    elif state["currentHourPresent"]:
        print("Private Copernicus cache already contains the current UTC hour")
    else:
        print("Private Copernicus cache is valid but lacks the current UTC hour")
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except Exception as error:
        print(f"Private Copernicus cache inspection failed: {error}")
        raise SystemExit(1)
