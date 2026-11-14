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


# One normal regression spans the selected profile, its supervised countdown,
# the real qualified-plan reader, budget choice and unchanged four-hour guard.
import ast
import contextlib
import hashlib
import io
import json
import os
import sys
from unittest.mock import patch
from lib.weather_acquisition_plan import (
    build_current_acquisition_plan, build_qualified_acquisition_plan,
    read_qualified_acquisition_plan, scalar_snapshot_paths,
)
from lib.copernicus_target_identity import targets_from_registry

supervisor_spec = importlib.util.spec_from_file_location(
    "budget_regression_supervisor", Path(__file__).with_name("run-dmi-bulk-supervised.py"))
supervisor = importlib.util.module_from_spec(supervisor_spec)
sys.modules[supervisor_spec.name] = supervisor
supervisor_spec.loader.exec_module(supervisor)

# Execute the actual normal updater's metadata branch in isolation. This is
# scheduling metadata only: no updater import, GRIB, factory, provider or SQL.
from lib import dmi_adaptive_recovery as recovery
updater_path = Path(__file__).with_name("update-dmi-bulk.py")
updater_ast = ast.parse(updater_path.read_text(encoding="utf-8"))
normal_main = next(node for node in updater_ast.body if isinstance(node, ast.FunctionDef) and node.name == "main")
def stores(node, name):
    return isinstance(node, ast.Assign) and any(isinstance(t, ast.Name) and t.id == name for t in node.targets)
start = next(index for index, node in enumerate(normal_main.body) if stores(node, "extended_recovery"))
selected_assignments = [index for index, node in enumerate(normal_main.body)
                        if stores(node, "selected_runtime_budget")]
if selected_assignments:
    start = min(selected_assignments)
end = next(index for index, node in enumerate(normal_main.body[start:], start)
           if isinstance(node, ast.If) and ast.unparse(node.test) == "adaptive_recovery is not None")
branch = compile(ast.Module(body=normal_main.body[start:end + 1], type_ignores=[]), str(updater_path), "exec")
def actual_normal_marker(selected, remaining, *, finalize=False, cache_only=False):
    scope = {"previous": short, "generated": target, "result": {"diagnostics": {}}, "os": os, "json": json,
             "MAX_RUNTIME_SECONDS": remaining, "EXTENDED_RUNTIME_SECONDS": 3600,
             "FINALIZE_ONLY": finalize, "CACHE_ONLY": cache_only,
             "next_adaptive_recovery": next_adaptive_recovery,
             "extended_runtime_profile_selected": getattr(recovery, "extended_runtime_profile_selected", None)}
    with patch.dict(os.environ, {"DMI_BULK_ADAPTIVE_RECOVERY": "true",
                                "DMI_BULK_SUPERVISOR_TOTAL_RUNTIME_SECONDS": str(selected),
                                "DMI_BULK_RECOVERY_BEFORE_COUNTS": json.dumps(result["missingDmiPairs"])}, clear=True):
        exec(branch, scope)
    return scope["result"]["diagnostics"].get("adaptiveRecovery")
assert actual_normal_marker(3600, 3599) is not None, "Selected long profile lost at rounded child3599"
assert actual_normal_marker(900, 899) is None
assert actual_normal_marker(3600, 600, finalize=True) is None
assert actual_normal_marker(3600, 600, cache_only=True) is None

for selected in (900, 3600):
    captured = []
    def finished(_command, environment, **options):
        captured.append((dict(environment), options))
        return supervisor.SupervisedResult(0, False)
    with patch.dict(os.environ, {"DMI_BULK_MAX_RUNTIME_SECONDS": str(selected),
                                "DMI_BULK_SUPERVISOR_TOTAL_RUNTIME_SECONDS": "3600"}, clear=True), \
         patch.object(sys, "argv", ["run-dmi-bulk-supervised.py"]), \
         patch.object(supervisor.time, "monotonic", side_effect=[1000.0, 1000.25]), \
         patch.object(supervisor, "run_supervised", side_effect=finished):
        assert supervisor.main() == 0
    child, options = captured[0]
    assert int(child["DMI_BULK_MAX_RUNTIME_SECONDS"]) == selected - 1
    assert int(child["DMI_BULK_SUPERVISOR_TOTAL_RUNTIME_SECONDS"]) == selected
    assert options["watchdog_seconds"] == 180
    marked = next_adaptive_recovery(short, requested=True,
        runtime_budget_seconds=int(child["DMI_BULK_MAX_RUNTIME_SECONDS"]),
        selected_runtime_budget_seconds=int(child["DMI_BULK_SUPERVISOR_TOTAL_RUNTIME_SECONDS"]),
        generated_at=target, before_counts=result["missingDmiPairs"])
    if selected == 900:
        assert marked is None, "A genuinely short selected profile cannot claim extended"
    else:
        assert marked["runtimeBudgetSeconds"] == 3599, "Keep the real child countdown"
        assert marked["selectedRuntimeBudgetSeconds"] == 3600, "Record selection, not consumption"
        rounded_marker = marked
        assert retained_adaptive_recovery({"diagnostics": {"adaptiveRecovery": marked}}) == marked

with TemporaryDirectory() as directory:
    root = Path(directory)
    previous_cwd = Path.cwd()
    try:
        os.chdir(root)
        snapshot = root / "snapshot.json"
        paths = scalar_snapshot_paths(root, snapshot)
        qualified_registry = copy.deepcopy(registry)
        for index, part in enumerate(qualified_registry["zones"]["Z"]):
            part["waterPoint"] = [1.0 + index / 100.0, 56.0]  # Synthetic only.
        short_gap = copy.deepcopy(complete)
        for zone in short_gap["zones"].values():
            for time in list(zone["hourly"])[-6:]:
                zone["hourly"][time].pop("sea-mean-deviation")
        assert planner.decide(short_gap, registry, target)["extended"] is False
        for role, filename in paths.items():
            filename.parent.mkdir(parents=True, exist_ok=True)
            data = qualified_registry if role == "parts" else short_gap if role == "dmi" else {}
            filename.write_text(json.dumps(data), encoding="utf-8")
        targets = targets_from_registry(paths["parts"])
        ids = sorted(part["partId"] for part in targets)
        masks = {component: bytearray((len(ids) * 118 + 7) // 8)
                 for component in ("wind", "waterLevel", "waterTemperature")}
        trend = bytearray((len(ids) * 118 + 7) // 8)
        support = bytearray((len(ids) * 121 + 7) // 8)
        def set_bit(mask, bit):
            mask[bit // 8] |= 1 << (bit % 8)
        for index in range(len(ids)):
            set_bit(masks["waterLevel"], index * 118 + 116)
            set_bit(trend, index * 118 + 117)
            for offset in (119, 120):
                set_bit(support, index * 121 + offset)
        scalar = {"schemaVersion": 1, "kind": "retained-part-scalar-needs-v1",
                  "productionReferenceAt": target, "partIds": ids, "forecastHourCount": 118,
                  "supportHourCount": 121, "encoding": "hex-lsb0-v1",
                  "valueGapMasks": {key: value.hex() for key, value in masks.items()},
                  "waterTrendGapMask": trend.hex(), "waterSupportMask": support.hex(),
                  "snapshotInputHashes": {key: {"bytes": filename.stat().st_size,
                      "sha256": "sha256:" + hashlib.sha256(filename.read_bytes()).hexdigest()}
                      for key, filename in paths.items()}}
        current = build_current_acquisition_plan(targets=targets, production_reference_at=target,
                                                covered_pairs=[], source_input_hashes={})
        current_path, qualified_path = root / "current.json", root / "qualified.json"
        current_path.write_text(json.dumps(current), encoding="utf-8")
        qualified_path.write_text(json.dumps(build_qualified_acquisition_plan(current, scalar,
            targets=targets, production_reference_at=target)), encoding="utf-8")
        compiled = read_qualified_acquisition_plan(qualified_path, current_plan_path=current_path,
            targets=targets, production_reference_at=target, snapshot_paths=paths)
        chosen = planner.decide(short_gap, qualified_registry, target, qualified_scalar_plan=compiled)
        assert chosen["extended"] is True
        assert chosen["recoveryComponents"] == ["waterLevel"]
        assert chosen["qualifiedWaterGaps"]["broadGapHours"] == 2
        assert chosen["qualifiedWaterGaps"]["gapPairCount"] == 20
        assert chosen["qualifiedWaterGaps"]["firstBroadGapAt"] == "2026-09-29T08:00:00Z"
        assert chosen["qualifiedWaterGaps"]["upstreamOfferProved"] is False
        assert chosen["qualifiedWaterGaps"]["sourceAdmission"] is False
        no_water = {**compiled, "valueGapMasks": {**compiled["valueGapMasks"], "waterLevel": bytes(len(trend))},
                    "waterTrendGapMask": bytes(len(trend))}
        assert planner.decide(short_gap, qualified_registry, target,
                              qualified_scalar_plan=no_water)["extended"] is False
        isolated = copy.deepcopy(compiled)
        isolated["valueGapMasks"]["waterLevel"] = bytes(len(trend))
        isolated["waterTrendGapMask"] = bytes([1]) + bytes(len(trend) - 1)
        assert planner.decide(short_gap, qualified_registry, target,
                              qualified_scalar_plan=isolated)["extended"] is False
        cooled = {**short_gap, "diagnostics": {"adaptiveRecovery": {
            **rounded_marker, "missingDmiPairsAtStart": chosen["missingDmiPairs"]}}}
        assert planner.decide(cooled, qualified_registry, target, qualified_scalar_plan=compiled,
            now=datetime(2026, 9, 24, 13, tzinfo=timezone.utc))["cooldownActive"] is True
        assert planner.decide(cooled, qualified_registry, target, qualified_scalar_plan=compiled,
            now=datetime(2026, 9, 24, 16, tzinfo=timezone.utc))["extended"] is True
        assert planner.decide(cooled, qualified_registry, target, qualified_scalar_plan=compiled,
            now=datetime(2026, 9, 24, 11, tzinfo=timezone.utc))["cooldownActive"] is False
        for key in cooled["diagnostics"]["adaptiveRecovery"]["missingDmiPairsAtStart"]:
            cooled["diagnostics"]["adaptiveRecovery"]["missingDmiPairsAtStart"][key] += 100
        assert planner.decide(cooled, qualified_registry, target, qualified_scalar_plan=compiled,
            now=datetime(2026, 9, 24, 13, tzinfo=timezone.utc))["extended"] is True
        github_output = root / "github-output.txt"
        argv = ["plan-dmi-recovery.py", "--cache", str(snapshot), "--parts", str(paths["parts"]),
                "--at", target, "--github-output", str(github_output), "--qualified-plan", str(qualified_path),
                "--current-plan", str(current_path), "--scalar-snapshot", str(snapshot)]
        with patch.object(sys, "argv", argv), contextlib.redirect_stdout(io.StringIO()):
            planner.main()
        assert github_output.read_text().startswith("extended=true\n")
        paths["selection"].write_text("changed", encoding="utf-8")
        github_output.unlink()
        with patch.object(sys, "argv", argv), contextlib.redirect_stdout(io.StringIO()):
            planner.main()
        assert github_output.read_text().startswith("extended=false\n"), "Changed snapshot keeps native fallback"
    finally:
        os.chdir(previous_cwd)

print("DMI broad-horizon recovery planner: PASS")
