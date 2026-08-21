#!/usr/bin/env python3
"""Build the small, geometry-preserving Copernicus target registry.

Normal runs select only coastal parts without a valid local DMI vector for the
requested UTC hour. A nationwide registry is available only through the
explicit ``--full-coast`` research switch.
"""
from __future__ import annotations

import argparse
import json
import math
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from lib.copernicus_current import haversine_km, load_targets


ROOT = Path(__file__).resolve().parents[1]
DEFAULT_TARGETS = ROOT / "data/live/coastal-parts-v2.json"
DEFAULT_DMI = ROOT / "data/live/dmi-bulk-cache.json"
DEFAULT_OUTPUT = ROOT / ".cache/copernicus-current-targets.json"


def arguments() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--targets", type=Path, default=DEFAULT_TARGETS)
    parser.add_argument("--dmi", type=Path, default=DEFAULT_DMI)
    parser.add_argument("--output", type=Path, default=DEFAULT_OUTPUT)
    parser.add_argument("--at", help="UTC hour to inspect; defaults to the current hour")
    parser.add_argument("--full-coast", action="store_true", help="Explicit manual nationwide research run")
    parser.add_argument(
        "--nearest-dmi-hour",
        action="store_true",
        help="Resolve a zero-coverage request to the best nearby verified DMI current hour",
    )
    parser.add_argument("--max-hour-offset", type=int, default=3)
    parser.add_argument("--github-output", type=Path)
    return parser.parse_args()


def utc_hour(value: str | None) -> datetime:
    parsed = datetime.now(timezone.utc) if not value else datetime.fromisoformat(value.replace("Z", "+00:00"))
    if parsed.tzinfo is None:
        raise ValueError("Copernicus target time must include a timezone")
    return parsed.astimezone(timezone.utc).replace(minute=0, second=0, microsecond=0)


def finite(value: Any) -> float | None:
    if isinstance(value, bool) or not isinstance(value, (int, float)):
        return None
    number = float(value)
    return number if math.isfinite(number) else None


def point(value: Any) -> list[float] | None:
    if not isinstance(value, (list, tuple)) or len(value) < 2:
        return None
    longitude, latitude = finite(value[0]), finite(value[1])
    return [longitude, latitude] if longitude is not None and latitude is not None else None


def same_point(first: Any, second: Any) -> bool:
    first_point, second_point = point(first), point(second)
    return bool(
        first_point is not None
        and second_point is not None
        and [round(value, 7) for value in first_point] == [round(value, 7) for value in second_point]
    )


def row_hour(value: Any) -> datetime | None:
    try:
        parsed = datetime.fromisoformat(str(value).replace("Z", "+00:00"))
    except (TypeError, ValueError):
        return None
    if parsed.tzinfo is None:
        return None
    return parsed.astimezone(timezone.utc).replace(minute=0, second=0, microsecond=0)


def has_local_dmi(document: dict[str, Any], target: dict[str, Any], target_hour: datetime) -> bool:
    if int(document.get("currentVectorSemanticsVersion") or 0) != 3:
        return False
    selection = document.get("currentVectorSelection")
    maximum = finite(document.get("currentMaxDistanceKm")) or 5.0
    zone = (document.get("zones") or {}).get(f"PART::{target['partId']}") or {}
    sampling = target["waterPoint"]
    if not same_point(zone.get("samplingPoint"), sampling):
        return False
    for row in (zone.get("hourly") or {}).values():
        source = ((row or {}).get("sources") or {}).get("current") or {}
        grid_point = point(source.get("gridPoint"))
        distance = finite(source.get("distanceKm"))
        if (
            row_hour((row or {}).get("time")) != target_hour
            or finite((row or {}).get("current-u")) is None
            or finite((row or {}).get("current-v")) is None
            or str(source.get("provider") or "").lower() != "dmi"
            or int(source.get("vectorSemanticsVersion") or 0) != 3
            or not source.get("verticalLayer")
            or source.get("vectorSelection") != selection
            or not same_point(source.get("samplingPoint"), sampling)
            or grid_point is None
            or distance is None
            or distance > maximum
            or haversine_km(sampling, grid_point) > maximum + 0.01
        ):
            continue
        return True
    return False


def local_dmi_parts(
    document: dict[str, Any], targets: list[dict[str, Any]], target_hour: datetime
) -> set[str]:
    return {target["partId"] for target in targets if has_local_dmi(document, target, target_hour)}


def available_dmi_hours(document: dict[str, Any]) -> set[datetime]:
    hours: set[datetime] = set()
    for zone in (document.get("zones") or {}).values():
        for key, row in ((zone or {}).get("hourly") or {}).items():
            parsed = row_hour((row or {}).get("time") or key)
            if parsed is not None:
                hours.add(parsed)
    return hours


def resolve_dmi_hour(
    document: dict[str, Any],
    targets: list[dict[str, Any]],
    requested_hour: datetime,
    allow_nearest: bool,
    max_hour_offset: int,
) -> tuple[datetime, set[str]]:
    exact = local_dmi_parts(document, targets, requested_hour)
    if exact or not allow_nearest:
        return requested_hour, exact
    if max_hour_offset < 0:
        raise ValueError("Copernicus DMI-hour offset must be non-negative")
    candidates: list[tuple[datetime, set[str]]] = []
    for candidate in available_dmi_hours(document):
        offset_seconds = abs((candidate - requested_hour).total_seconds())
        if candidate == requested_hour or offset_seconds > max_hour_offset * 3600:
            continue
        covered = local_dmi_parts(document, targets, candidate)
        if covered:
            candidates.append((candidate, covered))
    if not candidates:
        return requested_hour, set()
    return min(
        candidates,
        key=lambda item: (
            -len(item[1]),
            abs((item[0] - requested_hour).total_seconds()),
            0 if item[0] >= requested_hour else 1,
            item[0],
        ),
    )


def write_registry(path: Path, targets: list[dict[str, Any]], source_count: int, at: datetime, mode: str) -> None:
    zones: dict[str, list[dict[str, Any]]] = {}
    for target in targets:
        zones.setdefault(target["parentZoneId"], []).append({
            "partId": target["partId"],
            "sourceZoneId": target["parentZoneId"],
            "name": target["name"],
            "waterPoint": target["waterPoint"],
        })
    document = {
        "schemaVersion": 1,
        "selectionMode": mode,
        "targetHour": at.isoformat().replace("+00:00", "Z"),
        "sourcePartCount": source_count,
        "partCount": len(targets),
        "coordinatesChanged": False,
        "zones": zones,
    }
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary = path.with_suffix(path.suffix + ".tmp")
    temporary.write_text(json.dumps(document, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    temporary.replace(path)


def write_github_output(path: Path | None, at: datetime, dmi_count: int, target_count: int) -> None:
    if path is None:
        return
    with path.open("a", encoding="utf-8") as handle:
        handle.write(f"target_hour={at.isoformat().replace('+00:00', 'Z')}\n")
        handle.write(f"local_dmi_count={dmi_count}\n")
        handle.write(f"target_part_count={target_count}\n")


def main() -> int:
    args = arguments()
    requested_at = utc_hour(args.at)
    at = requested_at
    all_targets = load_targets(args.targets)
    if args.full_coast:
        selected = all_targets
        mode = "manual-full-coast"
        dmi_count = 0
    else:
        try:
            dmi = json.loads(args.dmi.read_text(encoding="utf-8"))
        except Exception as error:
            raise RuntimeError(f"Cannot read deployed DMI coverage: {error}") from None
        at, covered = resolve_dmi_hour(
            dmi,
            all_targets,
            requested_at,
            args.nearest_dmi_hour,
            args.max_hour_offset,
        )
        dmi_count = len(covered)
        if all_targets and dmi_count == 0:
            raise RuntimeError("No local DMI coverage found for the requested hour; refusing implicit nationwide Copernicus collection")
        selected = [target for target in all_targets if target["partId"] not in covered]
        mode = "dmi-gaps-only"
    write_registry(args.output, selected, len(all_targets), at, mode)
    write_github_output(args.github_output, at, dmi_count, len(selected))
    print(
        f"Copernicus targets ({mode}): {len(selected)}/{len(all_targets)}; "
        f"local DMI at resolved hour: {dmi_count}; "
        f"requested={requested_at.isoformat().replace('+00:00', 'Z')}; "
        f"resolved={at.isoformat().replace('+00:00', 'Z')}. Coordinates changed: no."
    )
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except Exception as error:
        print(f"Copernicus target selection failed: {error}")
        raise SystemExit(1)
