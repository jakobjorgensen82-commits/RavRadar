#!/usr/bin/env python3
"""Build a private national per-part weather identity/provenance contract."""
from __future__ import annotations

import argparse
import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[1]
WORK = ROOT / ".geometry-v2-work"
DEFAULT_POINTS = WORK / "national-local-part-point-pairs.json"
DEFAULT_GRID = WORK / "national-local-part-dmi-grid.json"
DEFAULT_PLAN = WORK / "national-work-plan.json"
DEFAULT_POLICY = ROOT / "data" / "geometry-v2" / "national-weather-shadow-policy.json"
DEFAULT_OUTPUT = WORK / "national-weather-shadow-contract.json"
FALSE_FLAGS = ("productionGeometryChanged", "adminDataChanged", "weatherSamplingChanged", "stateChanged", "scoreChanged", "automaticActivationAllowed")


def now() -> str:
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


def require_false(document: dict[str, Any], label: str) -> None:
    for key in FALSE_FLAGS:
        if document.get(key) is not False:
            raise RuntimeError(f"{label} skal have {key}=false")


def build(points: dict[str, Any], grid: dict[str, Any], plan: dict[str, Any], policy: dict[str, Any]) -> dict[str, Any]:
    if points.get("status") != "private-national-read-only-local-part-point-pairs":
        raise RuntimeError("Shadow-kontrakten kræver den private nationale punktparrapport")
    if grid.get("status") != "passed-private-national-dmi-grid-validation":
        raise RuntimeError("Shadow-kontrakten kræver en bestået national DMI-gridrapport")
    require_false(points, "Punktparrapporten")
    require_false(grid, "DMI-gridrapporten")
    point_rows = {row["finalPartId"]: row for row in points.get("parts") or []}
    grid_rows = {row["finalPartId"]: row for row in grid.get("parts") or []}
    if set(point_rows) != set(grid_rows) or len(point_rows) != points.get("finalPartCount"):
        raise RuntimeError("Punkt- og gridrapport beskriver ikke samme endelige kystbestand")

    parts, blocked = [], []
    series_ids, history_keys = set(), set()
    for part_id in sorted(point_rows):
        point = point_rows[part_id]
        evidence = grid_rows[part_id]
        if point.get("status") == "blocked-point-pair-evidence":
            if evidence.get("status") != "blocked-ambiguous-native-water-side":
                raise RuntimeError(f"{part_id} har inkonsistent blokering")
            blocked.append({"zoneId": point["zoneId"], "partId": part_id, "name": point.get("suggestedName"),
                            "reason": "AMBIGUOUS_LAND_WATER_SIDE", "weatherSamplingEnabled": False,
                            "automaticActivationAllowed": False})
            continue
        selected = evidence.get("selected") or {}
        if point.get("status") != "private-point-pair-proposed" or evidence.get("status") != "validated-selected-water-point":
            raise RuntimeError(f"{part_id} mangler valideret punkt-/gridbevis")
        if selected.get("status") != "valid-native-marine-grid-evidence":
            raise RuntimeError(f"{part_id} mangler native havgridbevis")
        zone_id = point["zoneId"]
        series_id = policy["seriesIdentityFormat"].format(zoneId=zone_id, partId=part_id)
        history_key = policy["historyIdentityFormat"].format(zoneId=zone_id, partId=part_id)
        if series_id in series_ids or history_key in history_keys or series_id == zone_id or history_key == zone_id:
            raise RuntimeError(f"{part_id} deler eller genbruger serie-/historikidentitet")
        series_ids.add(series_id); history_keys.add(history_key)
        parts.append({
            "zoneId": zone_id, "partId": part_id, "name": point.get("suggestedName"), "coastType": point.get("coastType"),
            "seriesId": series_id, "historyKey": history_key, "samplingPoint": point.get("waterPoint"),
            "onshoreDirectionDeg": point.get("onshoreDirectionDeg"), "validatedGrid": selected.get("components"),
            "coverage": {"fullWeatherCoverage": selected.get("fullWeatherCoverage") is True,
                         "waveFamilyComplete": selected.get("waveFamilyComplete") is True,
                         "dkssFamilyComplete": selected.get("dkssFamilyComplete") is True,
                         "coverageGaps": selected.get("coverageGaps") or []},
            "requiredHourlyProvenance": ["provider", "collection", "modelRun", "nativeValidTime", "gridPoint", "verticalLayer", "spatialInterpolation", "fallback"],
            "weatherSamplingEnabled": False, "stateEnabled": False, "scoreEnabled": False,
            "publicProjectionEnabled": False, "adminWriteEnabled": False, "automaticActivationAllowed": False,
        })
    full = sum(row["coverage"]["fullWeatherCoverage"] for row in parts)
    partial = len(parts) - full
    if (len(parts), full, partial, len(blocked)) != (grid.get("selectedPointCount"), grid.get("fullCoverageSelectedPointCount"), grid.get("partialCoverageSelectedPointCount"), grid.get("stillBlockedAmbiguousPartCount")):
        raise RuntimeError("Shadow-kontraktens summer matcher ikke DMI-gridrapporten")
    zone_ids = sorted({str(row.get("zoneId")) for row in plan.get("zones") or [] if row.get("zoneId")})
    part_zone_ids = sorted({row["zoneId"] for row in parts + blocked})
    if len(zone_ids) != plan.get("sourceZoneCount") or not set(part_zone_ids).issubset(zone_ids):
        raise RuntimeError("Shadow-kontrakten mangler en komplet national parent-zonebestand")
    unchanged_zone_ids = sorted(set(zone_ids) - set(part_zone_ids))
    return {
        "schemaVersion": "1.0.0", "status": "private-national-shadow-contract-ready", "generatedAt": now(),
        "zoneCount": len(zone_ids), "zonesWithCoastalPartsCount": len(part_zone_ids), "unchangedParentZoneCount": len(unchanged_zone_ids),
        "unchangedParentZoneIds": unchanged_zone_ids, "eligiblePartCount": len(parts), "fullCoveragePartCount": full,
        "partialCoveragePartCount": partial, "blockedPartCount": len(blocked), "parts": parts, "blockedParts": blocked,
        "parentRuntimeTruth": {"zoneIds": zone_ids, "remainsAuthoritative": True, "scoreRemainsAuthoritative": True, "historyRemainsAuthoritative": True},
        "mergePolicy": policy["mergePolicy"], "statePolicy": policy["statePolicy"], "scorePolicy": policy["scorePolicy"], "runtimePolicy": policy["runtimePolicy"],
        "activationGatesRemaining": ["private-national-multi-step-series-acquisition", "hourly-provenance-and-component-gap-validation", "separate-state-history-validation", "score-neutral-ui-review", "central-admin-roundtrip-and-rollback", "national-integrity-and-release-gate"],
        "crossPartMergeDetected": False, "parentFallbackDetected": False, "rawWeatherValuesStored": False,
        "productionGeometryChanged": False, "adminDataChanged": False, "weatherSamplingChanged": False,
        "stateChanged": False, "publicRuntimeChanged": False, "scoreChanged": False, "automaticActivationAllowed": False,
    }


def self_test() -> None:
    policy = json.loads(DEFAULT_POLICY.read_text("utf-8"))
    points = {"status": "private-national-read-only-local-part-point-pairs", "finalPartCount": 2, "parts": [
        {"zoneId": "Z", "coastType": "west", "finalPartId": "a", "suggestedName": "A", "status": "private-point-pair-proposed", "waterPoint": [8, 56], "onshoreDirectionDeg": 90},
        {"zoneId": "Z", "coastType": "west", "finalPartId": "b", "suggestedName": "B", "status": "blocked-point-pair-evidence"}],
        **{key: False for key in FALSE_FLAGS}}
    selected = {"status": "valid-native-marine-grid-evidence", "fullWeatherCoverage": False, "waveFamilyComplete": True, "dkssFamilyComplete": False, "coverageGaps": [{"reason": "missing"}], "components": {"wam_nsb": {}}}
    grid = {"status": "passed-private-national-dmi-grid-validation", "selectedPointCount": 1, "fullCoverageSelectedPointCount": 0, "partialCoverageSelectedPointCount": 1, "stillBlockedAmbiguousPartCount": 1,
            "parts": [{"finalPartId": "a", "status": "validated-selected-water-point", "selected": selected}, {"finalPartId": "b", "status": "blocked-ambiguous-native-water-side"}], **{key: False for key in FALSE_FLAGS}}
    plan = {"sourceZoneCount": 2, "zones": [{"zoneId": "Z"}, {"zoneId": "UNCHANGED"}]}
    result = build(points, grid, plan, policy)
    assert result["zoneCount"] == 2 and result["unchangedParentZoneIds"] == ["UNCHANGED"]
    assert result["eligiblePartCount"] == 1 and result["partialCoveragePartCount"] == 1 and result["blockedPartCount"] == 1
    assert not result["weatherSamplingChanged"] and not result["parts"][0]["scoreEnabled"]
    print("National weather-shadow-kontrakt self-test: bestået")


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--points", type=Path, default=DEFAULT_POINTS); parser.add_argument("--grid", type=Path, default=DEFAULT_GRID)
    parser.add_argument("--plan", type=Path, default=DEFAULT_PLAN)
    parser.add_argument("--policy", type=Path, default=DEFAULT_POLICY); parser.add_argument("--output", type=Path, default=DEFAULT_OUTPUT)
    parser.add_argument("--self-test", action="store_true"); args = parser.parse_args()
    if args.self_test: self_test(); return 0
    result = build(json.loads(args.points.read_text("utf-8")), json.loads(args.grid.read_text("utf-8")), json.loads(args.plan.read_text("utf-8")), json.loads(args.policy.read_text("utf-8")))
    args.output.parent.mkdir(parents=True, exist_ok=True); args.output.write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n", "utf-8")
    print(json.dumps({key: result[key] for key in ("status", "zoneCount", "eligiblePartCount", "fullCoveragePartCount", "partialCoveragePartCount", "blockedPartCount")}, ensure_ascii=False))
    return 0


if __name__ == "__main__": raise SystemExit(main())
