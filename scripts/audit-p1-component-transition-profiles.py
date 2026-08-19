#!/usr/bin/env python3
"""Supplementær P1-transitionanalyse for DEC-0030: per-zone frontprofiler.

Formål:
- afrunde transitionanalyse med tydelige tidsklynger for hver zone
- uden at ændre runtime- eller scorekode
"""

from __future__ import annotations

import argparse
import json
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path


COMPONENTS = {
    "wind": ("windSpeedMps", "windDirectionDeg"),
    "wave": ("waveHeightM", "waveDirectionDeg", "wavePeriodS"),
    "current": ("currentSpeedMps", "currentDirectionDeg"),
    "waterLevel": ("waterLevelCm",),
    "waterTemperature": ("waterTemperatureC",),
}

DMI_EXTENDED = {"open-meteo"}


def parse_time(value: object) -> datetime | None:
    try:
        return datetime.fromisoformat(str(value).replace("Z", "+00:00"))
    except (TypeError, ValueError):
        return None


def source_group(source: dict, present: bool) -> str:
    if not present:
        return "missing"
    provider = str((source or {}).get("provider") or "").lower()
    fallback = bool((source or {}).get("fallback"))
    if provider == "dmi":
        return "dmi-fallback" if fallback else "dmi"
    if provider in DMI_EXTENDED:
        return "dmi-extended" if fallback else "external"
    return "fallback" if fallback else "external"


def first_non_missing_zone(hourly: list[dict], fields: tuple[str, ...]) -> str | None:
    for hour in hourly:
        if all(hour.get(field) is not None for field in fields):
            return hour.get("time")
    return None


def audit(conditions: dict) -> dict:
    zones = conditions.get("zones") or {}
    result = {
        "generatedAt": datetime.now(timezone.utc).isoformat(timespec="seconds").replace("+00:00", "Z"),
        "datasetId": conditions.get("datasetId"),
        "zoneCount": len(zones),
        "components": {},
    }

    for component, fields in COMPONENTS.items():
        providers = Counter()
        transition_profiles = []
        transition_count_by_zone = Counter()
        leading_dmi_hours_by_zone: list[int] = []
        zone_violation_count = 0

        for zone_id, zone in zones.items():
            hourly = (zone.get("forecast") or {}).get("hourly") or []
            previous_group = None
            leading_dmi = 0
            saw_external = False
            saw_dmi_return = False
            first_time: datetime | None = None
            previous_time: datetime | None = None
            non_monotone = False
            first_non_missing = first_non_missing_zone(hourly, fields)
            first_fallback = None
            first_external = None
            first_missing_after_dmi = None
            last_non_missing = None

            dmi_still_prefix = False

            for hour in hourly:
                current_time = parse_time(hour.get("time"))
                if current_time is not None:
                    if previous_time is not None and current_time <= previous_time:
                        non_monotone = True
                    previous_time = current_time

                present = all(hour.get(field) is not None for field in fields)
                group = source_group((hour.get("sources") or {}).get(component), present)
                providers[group] += 1

                if present:
                    last_non_missing = hour.get("time")
                if group in {"dmi-fallback", "dmi-extended", "fallback", "external"} and first_fallback is None:
                    first_fallback = hour.get("time")
                if group in {"external", "fallback", "dmi-extended"} and first_external is None:
                    first_external = hour.get("time")

                if dmi_still_prefix:
                    if group in {"dmi", "dmi-fallback"}:
                        leading_dmi += 1
                    else:
                        dmi_still_prefix = False
                elif not dmi_still_prefix and leading_dmi == 0 and group in {"dmi", "dmi-fallback"}:
                    dmi_still_prefix = True
                    leading_dmi += 1

                if group not in {"dmi", "dmi-fallback", "missing"} and leading_dmi > 0:
                    saw_external = True
                if leading_dmi > 0 and saw_external and group in {"dmi", "dmi-fallback"}:
                    saw_dmi_return = True

                if previous_group is not None and previous_group != group:
                    transition_count_by_zone[zone_id] += 1

                if first_non_missing is not None and group == "missing" and first_missing_after_dmi is None and leading_dmi > 0:
                    first_missing_after_dmi = hour.get("time")

                previous_group = group

            if saw_dmi_return:
                zone_violation_count += 1

            leading_dmi_hours_by_zone.append(leading_dmi)
            transition_profiles.append({
                "zoneId": zone_id,
                "firstNonMissingAt": first_non_missing,
                "lastNonMissingAt": last_non_missing,
                "firstFallbackAt": first_fallback,
                "firstExternalAt": first_external,
                "firstMissingAfterDmiAt": first_missing_after_dmi,
                "leadingDmiHours": leading_dmi,
                "zoneTransitionCount": transition_count_by_zone.get(zone_id, 0),
                "sawDmiReturn": saw_dmi_return,
                "sawExternalAfterDmi": saw_external,
                "nonMonotoneForecastTime": non_monotone,
            })

        result["components"][component] = {
            "providerHours": dict(providers),
            "leadingDmiHoursDistribution": dict(sorted(Counter(leading_dmi_hours_by_zone).items())),
            "zonesWithLeadingDmiShortfall": sum(1 for hours in leading_dmi_hours_by_zone if hours < 96),
            "dmiReturnViolations": zone_violation_count,
            "transitionProfiles": sorted(transition_profiles, key=lambda row: row["zoneId"]),
        }

    return result


def self_test() -> None:
    fixture = {
        "datasetId": "self-test",
        "zones": {
            "z1": {
                "forecast": {
                    "hourly": [
                        {
                            "time": "2026-08-19T00:00:00Z",
                            "windSpeedMps": 5,
                            "windDirectionDeg": 90,
                            "sources": {"wind": {"provider": "dmi", "fallback": False}},
                        },
                        {
                            "time": "2026-08-19T01:00:00Z",
                            "windSpeedMps": 5,
                            "windDirectionDeg": 95,
                            "sources": {"wind": {"provider": "open-meteo", "fallback": True}},
                        },
                    ]
                }
            }
        },
    }
    output = audit(fixture)
    wind = output["components"]["wind"]
    first = wind["transitionProfiles"][0]
    assert first["leadingDmiHours"] == 1
    assert first["zoneTransitionCount"] == 1
    assert first["firstMissingAfterDmiAt"] is None


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("conditions", type=Path, nargs="?")
    parser.add_argument("--output", type=Path, default=None)
    parser.add_argument("--self-test", action="store_true")
    args = parser.parse_args()

    if args.self_test:
        self_test()
        print("OK: transition profile script self-test passed")
        return 0

    if args.conditions is None:
        raise SystemExit("conditions er påkrævet uden --self-test")

    conditions = json.loads(args.conditions.read_text(encoding="utf-8"))
    data = audit(conditions)

    if args.output is None:
        timestamp = datetime.now(timezone.utc).strftime("%Y%m%d-%H%M%S")
        out = Path("data/diagnostics") / f"p1-component-transition-profile-{timestamp}.json"
    else:
        out = args.output
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")
    print(out.as_posix())
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
