#!/usr/bin/env python3
"""Choose a bounded DMI recovery turn from the actual retained PART/hour cache.

This is scheduling evidence only. It never marks a value valid or changes the
cache. A broad missing DMI horizon gets the longer existing bootstrap budget;
isolated geographic holes keep the ordinary budget and rotate normally.
"""

import argparse
import bisect
import json
import math
from datetime import datetime, timedelta, timezone
from pathlib import Path

from lib.dmi_bulk_storage import read_dmi_bulk_document
from lib.dmi_adaptive_recovery import retained_adaptive_recovery

HOURS = 118
COMPONENT_FIELDS = {
    "wind": ("wind-speed-10m", "wind-dir-10m"),
    "wave": ("significant-wave-height", "dominant-wave-period"),
    "current": ("current-u", "current-v"),
    "waterLevel": ("sea-mean-deviation",),
    "waterTemperature": ("water-temperature",),
}


def finite(row, fields):
    return all(type(row.get(field)) in (int, float) and math.isfinite(row[field]) for field in fields)


def native_source(row, component, valid_time, part_id):
    source = (row.get("sources") or {}).get(component) or {}
    try:
        same_native_hour = reference_hour(source.get("nativeValidTime")) == reference_hour(valid_time)
    except (TypeError, ValueError):
        same_native_hour = False
    if (source.get("provider") == "dmi" and source.get("fallback") is False
            and source.get("entityId") == f"PART::{part_id}"
            and same_native_hour):
        return source
    return None


def native_component_sources(row, component, fields, valid_time, part_id):
    if component == "wind":
        sources = []
        if finite(row, fields) and native_source(row, "wind", valid_time, part_id):
            sources.append(("wind", native_source(row, "wind", valid_time, part_id)))
        if finite(row, ("wind-tail-u-10m", "wind-tail-v-10m")) \
                and native_source(row, "windTail", valid_time, part_id):
            sources.append(("windTail", native_source(row, "windTail", valid_time, part_id)))
        return sources
    if not finite(row, fields) or not native_source(row, component, valid_time, part_id):
        return []
    if component == "wave":
        height, period = row["significant-wave-height"], row["dominant-wave-period"]
        direction = row.get("mean-wave-dir")
        valid = height >= 0 and period >= 0 and (height == 0 or period > 0) \
            and (height == 0 and direction is None or type(direction) in (int, float)
                 and math.isfinite(direction) and 0 <= direction < 360)
        if not valid:
            return []
    return [(component, native_source(row, component, valid_time, part_id))]


def series_key(kind, source):
    """Use the forecast consumer's same-native-identity boundary.

    This is only a budget planner, but a loose identity could count two
    incompatible endpoints as usable and suppress a needed DMI recovery.
    An over-strict grouping costs time; a loose one risks missing data.
    """
    return json.dumps([kind] + [source.get(key) for key in (
        "collection", "collectionFamily", "modelRun", "component", "componentKind",
        "entityId", "parentZoneId", "entityType", "samplingContext",
        "gridDefinitionSha256", "spatialSelection", "spatialSemanticsVersion",
        "vectorSelection", "vectorSemanticsVersion", "vectorReference",
        "vectorTransform", "fieldSet", "gridPoint", "samplingPoint",
        "distanceKm", "verticalLayer", "verticalLayerRankM",
    )], sort_keys=True, separators=(",", ":"))


def resolvable(groups, target):
    for times in groups.values():
        at = bisect.bisect_left(times, target)
        if at < len(times) and times[at] == target:
            return True
        before = times[at - 1] if at else None
        after = times[at] if at < len(times) else None
        if before is not None and after is not None:
            if after - before <= 4 * 3600:
                return True
        else:
            edge = after if before is None else before
            if edge is not None and abs(edge - target) <= 95 * 60:
                return True
    return False


def reference_hour(value):
    parsed = datetime.fromisoformat(str(value).replace("Z", "+00:00"))
    if parsed.tzinfo is None or parsed.utcoffset() != timedelta(0):
        raise ValueError("Production target must be UTC")
    if parsed.minute or parsed.second or parsed.microsecond:
        raise ValueError("Production target must be an exact hour")
    return parsed


def part_ids(document):
    zones = document.get("zones")
    if not isinstance(zones, dict):
        raise ValueError("Coastal PART registry has no zones")
    values = [part.get("partId") for parts in zones.values() for part in parts]
    if not values or any(not isinstance(value, str) or not value for value in values):
        raise ValueError("Coastal PART registry is invalid")
    if len(set(values)) != len(values) or document.get("partCount") != len(values):
        raise ValueError("Coastal PART registry count/identities disagree")
    return values


def decide(cache, registry, target, *, now=None):
    ids = part_ids(registry)
    zones = cache.get("zones")
    if not isinstance(zones, dict):
        raise ValueError("DMI cache has no zones")
    start = reference_hour(target)
    broad_limit = max(1, math.ceil(len(ids) * 0.15))
    counts = {component: 0 for component in COMPONENT_FIELDS}
    worst = {component: 0 for component in COMPONENT_FIELDS}
    missing_pairs = {component: 0 for component in COMPONENT_FIELDS}
    missing_by_hour = [{component: 0 for component in COMPONENT_FIELDS} for _ in range(HOURS)]
    start_epoch = int(start.timestamp())
    for part_id in ids:
        zone = zones.get(f"PART::{part_id}") or {}
        indexed = {component: {} for component in COMPONENT_FIELDS}
        for valid_time, row in (zone.get("hourly") or {}).items():
            try:
                instant = reference_hour(valid_time)
            except (TypeError, ValueError):
                continue
            point = int(instant.timestamp())
            if point < start_epoch - 4 * 3600 or point > start_epoch + (HOURS + 3) * 3600:
                continue
            if not isinstance(row, dict):
                continue
            for component, fields in COMPONENT_FIELDS.items():
                for kind, source in native_component_sources(row, component, fields, valid_time, part_id):
                    indexed[component].setdefault(series_key(kind, source), []).append(point)
        for groups in indexed.values():
            for times in groups.values():
                times.sort()
        for offset, missing in enumerate(missing_by_hour):
            target_epoch = start_epoch + offset * 3600
            for component, groups in indexed.items():
                if not resolvable(groups, target_epoch):
                    missing[component] += 1
    for missing in missing_by_hour:
        for component, amount in missing.items():
            missing_pairs[component] += amount
            worst[component] = max(worst[component], amount)
            if amount >= broad_limit:
                counts[component] += 1
    recovering = [component for component in COMPONENT_FIELDS if counts[component] >= 12]
    previous = retained_adaptive_recovery(cache) or {}
    last_at = previous.get("lastExtendedAt")
    last_missing = previous.get("missingDmiPairsAtStart")
    current_total = sum(missing_pairs.values())
    previous_total = (sum(last_missing.values()) if isinstance(last_missing, dict)
                      and all(type(last_missing.get(key)) is int and last_missing[key] >= 0
                              for key in COMPONENT_FIELDS) else None)
    clock = now or datetime.now(timezone.utc)
    try:
        elapsed = (clock - datetime.fromisoformat(str(last_at).replace("Z", "+00:00"))).total_seconds()
    except (TypeError, ValueError):
        elapsed = None
    # Progress merits another recovery turn. Persistent negative/spatial
    # responses cannot force a one-hour run on every 15-minute cron tick.
    cooled_down = (elapsed is not None and 0 <= elapsed < 4 * 3600
                   and (previous_total is None or current_total >= previous_total - 100))
    return {
        "extended": bool(recovering) and not cooled_down,
        "cooldownActive": bool(recovering) and cooled_down,
        "partCount": len(ids),
        "broadMissingPartThreshold": broad_limit,
        "broadMissingHourThreshold": 12,
        "recoveryComponents": recovering,
        "broadMissingHours": counts,
        "maximumMissingPartsPerHour": worst,
        "missingDmiPairs": missing_pairs,
        "missingDmiPairTotal": current_total,
    }


def load_cache(path):
    """Use the producer's validated reader for source-dictionary storage."""
    return read_dmi_bulk_document(path)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--cache", type=Path, required=True)
    parser.add_argument("--parts", type=Path, required=True)
    parser.add_argument("--at", required=True)
    parser.add_argument("--github-output", type=Path, required=True)
    args = parser.parse_args()
    result = decide(load_cache(args.cache),
                    json.loads(args.parts.read_text(encoding="utf-8")), args.at)
    with args.github_output.open("a", encoding="utf-8") as output:
        output.write(f"extended={'true' if result['extended'] else 'false'}\n")
        output.write(f"missing_pair_counts_json={json.dumps(result['missingDmiPairs'], separators=(',', ':'))}\n")
    print(json.dumps(result, sort_keys=True))


if __name__ == "__main__":
    main()
