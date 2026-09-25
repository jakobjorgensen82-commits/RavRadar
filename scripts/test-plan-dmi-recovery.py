#!/usr/bin/env python3
"""Small deterministic checks for the five-component recovery budget."""

import importlib.util
from datetime import datetime, timedelta, timezone
from pathlib import Path

spec = importlib.util.spec_from_file_location("plan_dmi_recovery", Path(__file__).with_name("plan-dmi-recovery.py"))
planner = importlib.util.module_from_spec(spec)
spec.loader.exec_module(planner)

target = "2026-09-24T12:00:00Z"
registry = {"partCount": 10, "zones": {"Z": [{"partId": f"P{index}"} for index in range(10)]}}
complete = {"zones": {}}
for index in range(10):
    hourly = {}
    for offset in range(planner.HOURS):
        instant = (datetime(2026, 9, 24, 12, tzinfo=timezone.utc) + timedelta(hours=offset)).isoformat().replace("+00:00", "Z")
        hourly[instant] = {field: 1.0 for fields in planner.COMPONENT_FIELDS.values() for field in fields}
        hourly[instant]["mean-wave-dir"] = 90.0
        hourly[instant]["sources"] = {component: {
            "provider": "dmi", "fallback": False, "entityId": f"PART::P{index}",
            "nativeValidTime": instant,
        } for component in planner.COMPONENT_FIELDS}
    complete["zones"][f"PART::P{index}"] = {"hourly": hourly}

assert planner.decide(complete, registry, target)["extended"] is False
# One permanent inaccessible coastal PART is below the broad spatial threshold.
one_gap = {"zones": dict(complete["zones"])}
one_gap["zones"]["PART::P0"] = {"hourly": {}}
assert planner.decide(one_gap, registry, target)["extended"] is False

# A broad contiguous level gap is material: only DMI can repair it.
level_gap = {"zones": {key: {"hourly": {time: dict(row) for time, row in value["hourly"].items()}}
                       for key, value in complete["zones"].items()}}
for zone in level_gap["zones"].values():
    for time in list(zone["hourly"])[:16]:
        zone["hourly"][time].pop("sea-mean-deviation")
result = planner.decide(level_gap, registry, target)
assert result["extended"] is True
assert result["recoveryComponents"] == ["waterLevel"]
assert result["missingDmiPairs"]["waterLevel"] == 150
stalled = {**level_gap, "diagnostics": {"adaptiveRecovery": {
    "lastExtendedAt": "2026-09-24T12:00:00Z",
    "missingDmiPairsAtStart": result["missingDmiPairs"],
}}}
assert planner.decide(stalled, registry, target, now=datetime(2026, 9, 24, 13, tzinfo=timezone.utc))["cooldownActive"] is True
assert planner.decide(stalled, registry, target, now=datetime(2026, 9, 24, 16, tzinfo=timezone.utc))["extended"] is True
stalled["diagnostics"]["adaptiveRecovery"]["missingDmiPairsAtStart"] = {
    **result["missingDmiPairs"], "waterLevel": 300,
}
assert planner.decide(stalled, registry, target, now=datetime(2026, 9, 24, 13, tzinfo=timezone.utc))["extended"] is True

# A previous model's expired tail also needs DMI time even with good H0 data.
tail_gap = {"zones": {key: {"hourly": dict(list(value["hourly"].items())[:48])}
                      for key, value in complete["zones"].items()}}
assert set(planner.decide(tail_gap, registry, target)["recoveryComponents"]) == set(planner.COMPONENT_FIELDS)

# DMI's valid three-hour native cadence is interpolatable; off-stride raw
# blanks must not be mistaken for a permanent 2/3 missing public forecast.
stride_cache = {"zones": {key: {"hourly": {
    time: row for offset, (time, row) in enumerate(value["hourly"].items())
    if offset % 3 == 0
}} for key, value in complete["zones"].items()}}
assert planner.decide(stride_cache, registry, target)["extended"] is False

# Adjacent native steps from different grids/model identities must not
# masquerade as an interpolatable source series and suppress recovery.
seam_cache = {"zones": {key: {"hourly": {
    time: {**row, "sources": {
        **row["sources"],
        "waterLevel": {**row["sources"]["waterLevel"],
                       "gridDefinitionSha256": "old" if offset == 0 else "new"},
    }} for offset, (time, row) in enumerate(value["hourly"].items())
    if offset in (0, 3)
}} for key, value in complete["zones"].items()}}
assert planner.decide(seam_cache, registry, target)["missingDmiPairs"]["waterLevel"] > 1100

print("DMI broad-horizon recovery planner: PASS")
