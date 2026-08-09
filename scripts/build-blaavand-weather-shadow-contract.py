#!/usr/bin/env python3
"""Build a private, score-neutral contract for future Blåvand part weather.

This consumes the approved detail proposal and DMI-grid evidence. It does not
sample weather or alter production/admin data. Its purpose is to prevent a
future implementation from mixing one part's weather, history, or score with
the other part or with the authoritative parent-zone series.
"""
from __future__ import annotations

import argparse
import json
import pathlib
from datetime import datetime, timezone
from typing import Any


ROOT = pathlib.Path(__file__).resolve().parents[1]
WORK = ROOT / ".geometry-v2-work"
DEFAULT_PROPOSAL = WORK / "blaavand-detail-proposal.json"
DEFAULT_GRID = WORK / "blaavand-dmi-grid-validation.json"
DEFAULT_POLICY = ROOT / "data" / "geometry-v2" / "blaavand-weather-shadow-policy.json"
DEFAULT_OUTPUT = WORK / "blaavand-weather-shadow-contract.json"


def now() -> str:
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


def require_false(document: dict[str, Any], keys: list[str], label: str) -> None:
    for key in keys:
        if document.get(key) is not False:
            raise RuntimeError(f"{label} skal have {key}=false")


def build(proposal: dict[str, Any], grid: dict[str, Any], policy: dict[str, Any]) -> dict[str, Any]:
    if proposal.get("zoneId") != policy.get("zoneId") or grid.get("zoneId") != policy.get("zoneId"):
        raise RuntimeError("Forslag, DMI-gridrapport og shadow-policy beskriver ikke samme zone")
    if grid.get("status") != "passed-private-grid-validation":
        raise RuntimeError("Shadow-kontrakten kræver en bestået privat DMI-gridrapport")
    if grid.get("independentWeatherSeriesValidated") is not True:
        raise RuntimeError("De private punkter rammer ikke dokumenteret uafhængige DMI-celler")
    require_false(proposal, ["productionGeometryChanged", "adminDataChanged", "weatherSamplingChanged", "scoreChanged", "automaticActivationAllowed"], "Detailforslaget")
    require_false(grid, ["productionGeometryChanged", "adminDataChanged", "weatherSamplingChanged", "scoreChanged", "automaticActivationAllowed"], "DMI-gridrapporten")

    proposal_parts = {part["partId"]: part for part in proposal.get("coastalParts") or []}
    grid_parts = {part["partId"]: part for part in grid.get("candidates") or []}
    required_ids = policy.get("requiredPartIds") or []
    if sorted(proposal_parts) != sorted(required_ids) or sorted(grid_parts) != sorted(required_ids):
        raise RuntimeError("Shadow-kontrakten kræver præcis de to godkendte Blåvand-kystdele")

    parts = []
    for part_id in required_ids:
        proposed = proposal_parts[part_id]
        validated = grid_parts[part_id]
        if validated.get("status") != "valid-native-dmi-grid-cells" or validated.get("sharedCurrentUvGridPoint") is not True:
            raise RuntimeError(f"{part_id} mangler gyldig fælles DMI-gridkontrol")
        parts.append({
            "partId": part_id,
            "seriesId": policy["seriesIdentityFormat"].format(zoneId=policy["zoneId"], partId=part_id),
            "parentZoneId": policy["zoneId"],
            "name": proposed.get("name"),
            "anchorId": proposed.get("anchorId"),
            "samplingPoint": proposed.get("waterPoint"),
            "onshoreDirectionDeg": proposed.get("onshoreDirectionDeg"),
            "validatedGrid": validated.get("components"),
            "requiredHourlyProvenance": [
                "provider", "collection", "modelRun", "nativeValidTime",
                "gridPoint", "verticalLayer", "spatialInterpolation", "fallback"
            ],
            "historyKey": f"coastal-part::{policy['zoneId']}::{part_id}",
            "weatherSamplingEnabled": False,
            "stateEnabled": False,
            "scoreEnabled": False,
            "publicProjectionEnabled": False,
            "adminWriteEnabled": False,
            "automaticActivationAllowed": False,
        })

    return {
        "schemaVersion": "1.0.0",
        "status": "private-shadow-contract-ready",
        "generatedAt": now(),
        "zoneId": policy["zoneId"],
        "parentRuntimeTruth": {
            "seriesId": policy["zoneId"],
            "remainsAuthoritative": True,
            "scoreRemainsAuthoritative": True,
            "historyRemainsAuthoritative": True,
        },
        "parts": parts,
        "mergePolicy": policy["mergePolicy"],
        "statePolicy": policy["statePolicy"],
        "scorePolicy": policy["scorePolicy"],
        "runtimePolicy": policy["runtimePolicy"],
        "activationGatesRemaining": [
            "private-multi-step-series-acquisition",
            "hourly-provenance-and-component-merge-validation",
            "separate-state-history-validation",
            "score-neutral-ui-review",
            "central-admin-roundtrip-and-rollback",
            "explicit-owner-go-no-go-before-any-score-or-production-activation"
        ],
        "productionGeometryChanged": False,
        "adminDataChanged": False,
        "weatherSamplingChanged": False,
        "publicRuntimeChanged": False,
        "scoreChanged": False,
        "automaticActivationAllowed": False,
    }


def self_test() -> None:
    policy = json.loads(DEFAULT_POLICY.read_text("utf-8"))
    parts = []
    candidates = []
    for index, part_id in enumerate(policy["requiredPartIds"]):
        parts.append({"partId": part_id, "name": part_id, "anchorId": f"a{index}", "waterPoint": [8 + index, 55], "onshoreDirectionDeg": 90})
        candidates.append({"partId": part_id, "status": "valid-native-dmi-grid-cells", "sharedCurrentUvGridPoint": True, "components": {"wam_nsb": {}, "dkss_nsbs": {}}})
    proposal = {"zoneId": policy["zoneId"], "coastalParts": parts, "productionGeometryChanged": False, "adminDataChanged": False, "weatherSamplingChanged": False, "scoreChanged": False, "automaticActivationAllowed": False}
    grid = {"zoneId": policy["zoneId"], "status": "passed-private-grid-validation", "independentWeatherSeriesValidated": True, "candidates": candidates, "productionGeometryChanged": False, "adminDataChanged": False, "weatherSamplingChanged": False, "scoreChanged": False, "automaticActivationAllowed": False}
    result = build(proposal, grid, policy)
    assert result["status"] == "private-shadow-contract-ready"
    assert len({part["seriesId"] for part in result["parts"]}) == 2
    assert all(not part["scoreEnabled"] and not part["weatherSamplingEnabled"] for part in result["parts"])
    broken = json.loads(json.dumps(grid))
    broken["independentWeatherSeriesValidated"] = False
    try:
        build(proposal, broken, policy)
    except RuntimeError:
        pass
    else:
        raise AssertionError("Manglende griduafhængighed skal stoppe kontrakten")
    print("Blåvand weather-shadow-kontrakt self-test: bestået")


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--proposal", type=pathlib.Path, default=DEFAULT_PROPOSAL)
    parser.add_argument("--grid", type=pathlib.Path, default=DEFAULT_GRID)
    parser.add_argument("--policy", type=pathlib.Path, default=DEFAULT_POLICY)
    parser.add_argument("--output", type=pathlib.Path, default=DEFAULT_OUTPUT)
    parser.add_argument("--self-test", action="store_true")
    args = parser.parse_args()
    if args.self_test:
        self_test()
        return 0
    result = build(
        json.loads(args.proposal.read_text("utf-8")),
        json.loads(args.grid.read_text("utf-8")),
        json.loads(args.policy.read_text("utf-8")),
    )
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n", "utf-8")
    print(json.dumps({"status": result["status"], "partCount": len(result["parts"]), "scoreChanged": result["scoreChanged"]}, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
