#!/usr/bin/env python3
"""Read-only P1 coverage/provenance matrix for a protected conditions artifact."""

from __future__ import annotations

import argparse
import json
from collections import Counter
from pathlib import Path


COMPONENTS = {
    "wind": ("windSpeedMps", "windDirectionDeg"),
    "wave": ("waveHeightM", "waveDirectionDeg", "wavePeriodS"),
    "current": ("currentSpeedMps", "currentDirectionDeg"),
    "waterLevel": ("waterLevelCm",),
    "waterTemperature": ("waterTemperatureC",),
}


def provider_group(source: dict) -> str:
    provider = str((source or {}).get("provider") or "missing").lower()
    if provider == "dmi":
        return "dmi"
    if provider == "missing":
        return "missing"
    return "fallback"


def audit(document: dict) -> dict:
    zones = document.get("zones") or {}
    result = {
        "datasetId": document.get("datasetId"),
        "generatedAt": document.get("generatedAt"),
        "zoneCount": len(zones),
        "components": {},
        "history": {},
    }
    for component, fields in COMPONENTS.items():
        valid_by_zone = {}
        providers = Counter()
        transitions = Counter()
        missing_zone_ids = []
        for zone_id, zone in zones.items():
            hours = (zone.get("forecast") or {}).get("hourly") or []
            valid = 0
            previous = None
            zone_transitions = 0
            for hour in hours:
                present = all(hour.get(field) is not None for field in fields)
                group = provider_group((hour.get("sources") or {}).get(component)) if present else "missing"
                providers[group] += 1
                valid += int(present)
                if previous is not None and group != previous:
                    zone_transitions += 1
                previous = group
            valid_by_zone[zone_id] = valid
            transitions[zone_transitions] += 1
            if valid == 0:
                missing_zone_ids.append(zone_id)
        counts = Counter(valid_by_zone.values())
        maximum = max(valid_by_zone.values(), default=0)
        result["components"][component] = {
            "zonesWithAny": sum(value > 0 for value in valid_by_zone.values()),
            "zonesWithFullDisplayedHorizon": sum(value == maximum and maximum > 0 for value in valid_by_zone.values()),
            "minimumValidHours": min(valid_by_zone.values(), default=0),
            "maximumValidHours": maximum,
            "validHoursDistribution": dict(sorted(counts.items())),
            "providerHours": dict(providers),
            "sourceTransitionsPerZone": dict(sorted(transitions.items())),
            "zonesWithNoData": missing_zone_ids,
            "zonesBelowFullDisplayedHorizon": sorted(
                zone_id for zone_id, value in valid_by_zone.items() if value < maximum
            ),
        }
    for key in ("samples24h", "samples72h"):
        result["history"][key] = dict(sorted(Counter(len(zone.get(key) or []) for zone in zones.values()).items()))
    return result


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("conditions", type=Path)
    args = parser.parse_args()
    document = json.loads(args.conditions.read_text("utf-8"))
    print(json.dumps(audit(document), ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
