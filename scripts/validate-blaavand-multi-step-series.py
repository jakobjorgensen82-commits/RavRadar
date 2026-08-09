#!/usr/bin/env python3
"""Validate isolated multi-step DMI series for the two private Blåvand parts.

The report contains provenance and context-bound value digests, never raw weather
values. It is private review evidence only and cannot update runtime/admin data.
"""
from __future__ import annotations

import argparse
import hashlib
import importlib.util
import json
import os
import pathlib
import sys
from datetime import datetime, timezone
from typing import Any

ROOT = pathlib.Path(__file__).resolve().parents[1]
WORK = ROOT / ".geometry-v2-work"
DEFAULT_PROPOSAL = WORK / "blaavand-detail-proposal.json"
DEFAULT_CONTRACT = WORK / "blaavand-weather-shadow-contract.json"
DEFAULT_REPORT = WORK / "blaavand-multi-step-series-validation.json"
COMPONENT_FAMILY = {
    "significant-wave-height": "wave", "mean-wave-dir": "wave", "dominant-wave-period": "wave",
    "sea-mean-deviation": "waterLevel", "current-u": "current", "current-v": "current",
}


def load_grid_module():
    path = ROOT / "scripts" / "validate-blaavand-dmi-grid.py"
    scripts_path = str(path.parent)
    if scripts_path not in sys.path:
        sys.path.insert(0, scripts_path)
    spec = importlib.util.spec_from_file_location("ravradar_blaavand_grid", path)
    if spec is None or spec.loader is None:
        raise RuntimeError("Blåvand-gridmodulet kunne ikke indlæses")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def now() -> str:
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


def digest_value(series_id: str, valid_time: str, component: str, value: Any) -> str:
    payload = json.dumps([series_id, valid_time, component, value], ensure_ascii=False, separators=(",", ":"))
    return hashlib.sha256(payload.encode("utf-8")).hexdigest()[:16]


def provenance(source: dict[str, Any], point: dict[str, Any]) -> dict[str, Any]:
    grid = load_grid_module()
    return {
        "provider": source.get("provider"),
        "collection": source.get("collection"),
        "modelRun": source.get("modelRun"),
        "nativeValidTime": source.get("nativeValidTime"),
        "gridPoint": grid.compact_grid_point(point),
        "verticalLayer": point.get("verticalLayer"),
        "spatialInterpolation": False,
        "fallback": False,
    }


def validate_series(contract: dict[str, Any], snapshots: dict[str, dict[str, dict[str, Any]]], minimum_steps: int) -> dict[str, Any]:
    grid = load_grid_module()
    contract_parts = {part["partId"]: part for part in contract.get("parts") or []}
    if contract.get("status") != "private-shadow-contract-ready" or len(contract_parts) != 2:
        raise RuntimeError("Flertidsseriegaten kræver den beståede private shadow-kontrakt")
    rows = []
    for part_id, part in contract_parts.items():
        hours = []
        for valid_time, snapshot in sorted((snapshots.get(part_id) or {}).items()):
            values = snapshot.get("values") or {}
            sources = snapshot.get("sources") or {}
            points = snapshot.get("gridPoints") or {}
            if not all(component in values and component in points for component in COMPONENT_FAMILY):
                continue
            components = {}
            for component, family in COMPONENT_FAMILY.items():
                source = sources.get(family) or {}
                prov = provenance(source, points[component])
                if prov["nativeValidTime"] != valid_time or prov["provider"] != "dmi":
                    raise RuntimeError(f"{part_id} har ugyldig native provenance for {component} ved {valid_time}")
                components[component] = {
                    "valuePresent": True,
                    "valueDigest": digest_value(part["seriesId"], valid_time, component, values[component]),
                    "provenance": prov,
                }
            if not grid.same_point(points["current-u"], points["current-v"]):
                raise RuntimeError(f"{part_id} har current-U/V fra forskellige fysiske celler")
            if points["current-u"].get("verticalLayer") != points["current-v"].get("verticalLayer"):
                raise RuntimeError(f"{part_id} har current-U/V fra forskellige vertikallag")
            hours.append({"time": valid_time, "components": components})
        if len(hours) < minimum_steps:
            raise RuntimeError(f"{part_id} har kun {len(hours)} komplette native trin; kræver {minimum_steps}")
        rows.append({
            "partId": part_id, "seriesId": part["seriesId"], "historyKey": part["historyKey"],
            "completeNativeStepCount": len(hours), "hours": hours,
            "weatherSamplingEnabled": False, "stateEnabled": False, "scoreEnabled": False,
            "publicProjectionEnabled": False, "adminWriteEnabled": False, "automaticActivationAllowed": False,
        })
    shared_times = sorted(set.intersection(*(set(row["hours"][i]["time"] for i in range(len(row["hours"]))) for row in rows)))
    if len(shared_times) < minimum_steps:
        raise RuntimeError("Kystdelene mangler tilstrækkeligt mange fælles komplette native tidstrin")
    return {
        "schemaVersion": "1.0.0", "status": "passed-private-multi-step-series-validation",
        "generatedAt": now(), "zoneId": contract["zoneId"], "minimumCompleteSteps": minimum_steps,
        "sharedCompleteNativeTimes": shared_times, "series": rows,
        "parentRuntimeTruth": contract.get("parentRuntimeTruth"),
        "activationGatesRemaining": [
            "separate-state-history-validation", "score-neutral-ui-review",
            "central-admin-roundtrip-and-rollback",
            "explicit-owner-go-no-go-before-any-score-or-production-activation",
        ],
        "crossPartMergeDetected": False, "rawWeatherValuesStored": False,
        "productionGeometryChanged": False, "adminDataChanged": False, "weatherSamplingChanged": False,
        "stateChanged": False, "publicRuntimeChanged": False, "scoreChanged": False,
        "automaticActivationAllowed": False,
    }


def run(proposal_path: pathlib.Path, contract_path: pathlib.Path, report_path: pathlib.Path) -> dict[str, Any]:
    proposal = json.loads(proposal_path.read_text("utf-8"))
    contract = json.loads(contract_path.read_text("utf-8"))
    grid = load_grid_module()
    zones = grid.candidate_zones(proposal)
    bulk = grid.load_bulk_module()
    output = {"zones": {zone["id"]: {"hourly": {}, "gridPoints": {}, "collections": {}} for zone in zones}}
    snapshots: dict[str, dict[str, dict[str, Any]]] = {zone["id"]: {} for zone in zones}
    diagnostics: dict[str, Any] = {"messagesSeen": 0, "zoneLookups": 0, "batchedGridReads": 0}
    budget = {"bytes": 0}
    limit = max(2, int(os.getenv("BLAAVAND_MULTI_STEP_MAX_ASSETS", "6")))
    for collection in grid.COLLECTIONS:
        model_run, assets, _stats = bulk.list_latest_assets(collection)
        if not model_run or len(assets) < 2:
            raise RuntimeError(f"Ingen brugbar flertidsserie for {collection}")
        for asset in assets[:limit]:
            path, _reused = bulk.download_asset(asset["href"], asset.get("size"), budget)
            _found, _touched, interrupted, messages, lookups = bulk.process_grib(
                path, collection, model_run, asset["valid"], zones, output, diagnostics
            )
            diagnostics["messagesSeen"] += messages
            diagnostics["zoneLookups"] += lookups
            if interrupted:
                raise RuntimeError(f"Flertidsseriegaten løb tør for tidsbudget under {collection}")
            for zone in zones:
                point = output["zones"][zone["id"]]
                hour = (point.get("hourly") or {}).get(asset["valid"])
                if not hour:
                    continue
                snapshot = snapshots[zone["id"]].setdefault(asset["valid"], {"values": {}, "sources": {}, "gridPoints": {}})
                snapshot["values"].update({key: hour[key] for key in grid.COLLECTIONS[collection] if key in hour})
                snapshot["sources"].update(hour.get("sources") or {})
                snapshot["gridPoints"].update({key: point["gridPoints"][key] for key in grid.COLLECTIONS[collection] if key in point.get("gridPoints", {})})
    report = validate_series(contract, snapshots, minimum_steps=2)
    report["diagnostics"] = diagnostics
    report_path.parent.mkdir(parents=True, exist_ok=True)
    report_path.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", "utf-8")
    return report


def self_test() -> None:
    parts = []
    snapshots = {}
    for index, part_id in enumerate(("north", "southeast")):
        parts.append({"partId": part_id, "seriesId": f"Z::{part_id}", "historyKey": f"coastal-part::Z::{part_id}"})
        snapshots[part_id] = {}
        for hour in ("2026-08-09T03:00:00Z", "2026-08-09T06:00:00Z"):
            values, points = {}, {}
            for component in COMPONENT_FAMILY:
                values[component] = index + len(component)
                points[component] = {"latitude": 55 + index / 10, "longitude": 8, "distanceKm": 2,
                                     **({"verticalLayer": "depthbelowsea:17"} if component.startswith("current-") else {})}
            snapshots[part_id][hour] = {"values": values, "gridPoints": points, "sources": {
                "wave": {"provider": "dmi", "collection": "wam_nsb", "modelRun": "run", "nativeValidTime": hour},
                "waterLevel": {"provider": "dmi", "collection": "dkss_nsbs", "modelRun": "run", "nativeValidTime": hour},
                "current": {"provider": "dmi", "collection": "dkss_nsbs", "modelRun": "run", "nativeValidTime": hour},
            }}
    contract = {"status": "private-shadow-contract-ready", "zoneId": "Z", "parts": parts}
    report = validate_series(contract, snapshots, 2)
    assert report["status"] == "passed-private-multi-step-series-validation"
    assert not report["rawWeatherValuesStored"] and len(report["sharedCompleteNativeTimes"]) == 2
    broken = json.loads(json.dumps(snapshots)); del broken["north"]["2026-08-09T06:00:00Z"]["values"]["current-v"]
    try: validate_series(contract, broken, 2)
    except RuntimeError: pass
    else: raise AssertionError("Ufuldstændig partserie skal stoppes")
    print("Blåvand privat flertidsserie-self-test: bestået")


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--proposal", type=pathlib.Path, default=DEFAULT_PROPOSAL)
    parser.add_argument("--contract", type=pathlib.Path, default=DEFAULT_CONTRACT)
    parser.add_argument("--report", type=pathlib.Path, default=DEFAULT_REPORT)
    parser.add_argument("--self-test", action="store_true")
    args = parser.parse_args()
    if args.self_test: self_test(); return 0
    report = run(args.proposal, args.contract, args.report)
    print(json.dumps({"status": report["status"], "seriesCount": len(report["series"]), "sharedSteps": len(report["sharedCompleteNativeTimes"]), "scoreChanged": False}, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
