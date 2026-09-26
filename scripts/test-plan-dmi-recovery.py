#!/usr/bin/env python3
"""Small deterministic checks for the five-component recovery budget."""

import importlib.util
import copy
from datetime import datetime, timedelta, timezone
from pathlib import Path
from tempfile import TemporaryDirectory

from lib.dmi_bulk_storage import write_dmi_bulk_document
from lib.dmi_adaptive_recovery import next_adaptive_recovery, retained_adaptive_recovery

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
with TemporaryDirectory() as directory:
    encoded = Path(directory) / "dmi-source-dictionary.json"
    write_dmi_bulk_document(encoded, level_gap)
    # Production preserves the compact source-dictionary wrapper. The budget
    # must inspect its validated logical zones, not the wrapper's top level.
    assert planner.decide(planner.load_cache(encoded), registry, target) == result
stalled = {**level_gap, "diagnostics": {"adaptiveRecovery": {
    "lastExtendedAt": "2026-09-24T12:00:00Z",
    "missingDmiPairsAtStart": result["missingDmiPairs"],
}}}
assert planner.decide(stalled, registry, target, now=datetime(2026, 9, 24, 13, tzinfo=timezone.utc))["cooldownActive"] is True
assert planner.decide(stalled, registry, target, now=datetime(2026, 9, 24, 16, tzinfo=timezone.utc))["extended"] is True

# A 4.0.492 quick turn could incorrectly claim an extended recovery. Match
# instants, not spelling: production used both Z and .000Z UTC forms.
short = copy.deepcopy(stalled)
short["generatedAt"] = "2026-09-24T12:00:00.000Z"
short["diagnostics"]["runtimeBudgetSeconds"] = 360
assert retained_adaptive_recovery(short) is None
assert planner.decide(short, registry, target, now=datetime(2026, 9, 24, 13, tzinfo=timezone.utc))["extended"] is True

# A real long marker copied through a newer short invocation must survive.
carried = copy.deepcopy(short)
carried["generatedAt"] = "2026-09-24T12:30:00Z"
assert planner.decide(carried, registry, target, now=datetime(2026, 9, 24, 13, tzinfo=timezone.utc))["cooldownActive"] is True
for budget in (None, "360", True):
    unknown = copy.deepcopy(short)
    unknown["diagnostics"]["runtimeBudgetSeconds"] = budget
    assert retained_adaptive_recovery(unknown) is not None
long = copy.deepcopy(short)
long["diagnostics"]["runtimeBudgetSeconds"] = 3600
assert retained_adaptive_recovery(long) is not None
assert next_adaptive_recovery(short, requested=True, runtime_budget_seconds=360,
    generated_at="2026-09-24T13:00:00Z", before_counts=None) is None
kept = next_adaptive_recovery(carried, requested=True, runtime_budget_seconds=360,
    generated_at="2026-09-24T13:00:00Z", before_counts=None)
assert kept == carried["diagnostics"]["adaptiveRecovery"]
assert kept is not carried["diagnostics"]["adaptiveRecovery"]
fresh = next_adaptive_recovery(short, requested=True, runtime_budget_seconds=3600,
    generated_at="2026-09-24T13:00:00Z", before_counts=result["missingDmiPairs"])
assert fresh["runtimeBudgetSeconds"] == 3600
assert fresh["lastExtendedAt"] == "2026-09-24T13:00:00Z"
assert fresh["missingDmiPairsAtStart"] == result["missingDmiPairs"]
assert next_adaptive_recovery(short, requested=False, runtime_budget_seconds=3600,
    generated_at="2026-09-24T13:00:00Z", before_counts=None) is None
try:
    next_adaptive_recovery(short, requested=True, runtime_budget_seconds=3600,
        generated_at="2026-09-24T13:00:00Z", before_counts={"current": 1})
except ValueError:
    pass
else:
    raise AssertionError("A long marker requires all five measured component counts")
explicit = copy.deepcopy(carried)
explicit["diagnostics"]["adaptiveRecovery"]["runtimeBudgetSeconds"] = 360
assert retained_adaptive_recovery(explicit) is None
explicit["diagnostics"]["adaptiveRecovery"]["runtimeBudgetSeconds"] = 3600
assert retained_adaptive_recovery(explicit) is not None

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
