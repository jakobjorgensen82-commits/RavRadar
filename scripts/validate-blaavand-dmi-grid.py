#!/usr/bin/env python3
"""Privately validate Blåvand water-point candidates on native DMI grids.

The script deliberately produces review evidence only. It reuses the production
GRIB parser and nearest-valid-cell rules, but never writes production weather,
zone, admin, or score data.
"""
from __future__ import annotations

import argparse
import importlib.util
import json
import math
import os
import pathlib
import sys
from datetime import datetime, timezone
from typing import Any


ROOT = pathlib.Path(__file__).resolve().parents[1]
DEFAULT_PROPOSAL = ROOT / ".geometry-v2-work" / "blaavand-detail-proposal.json"
DEFAULT_REPORT = ROOT / ".geometry-v2-work" / "blaavand-dmi-grid-validation.json"
COLLECTIONS = {
    "wam_nsb": ("significant-wave-height", "mean-wave-dir", "dominant-wave-period"),
    "dkss_nsbs": ("sea-mean-deviation", "current-u", "current-v"),
}


def utc_now() -> str:
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


def same_point(first: dict[str, Any], second: dict[str, Any]) -> bool:
    return (
        round(float(first["latitude"]), 7),
        round(float(first["longitude"]), 7),
    ) == (
        round(float(second["latitude"]), 7),
        round(float(second["longitude"]), 7),
    )


def load_bulk_module():
    module_path = ROOT / "scripts" / "update-dmi-bulk.py"
    scripts_path = str(module_path.parent)
    if scripts_path not in sys.path:
        sys.path.insert(0, scripts_path)
    spec = importlib.util.spec_from_file_location("ravradar_dmi_bulk", module_path)
    if spec is None or spec.loader is None:
        raise RuntimeError("DMI-produktionsmodulet kunne ikke indlæses")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def candidate_zones(proposal: dict[str, Any]) -> list[dict[str, Any]]:
    zones = []
    for part in proposal.get("coastalParts") or []:
        coords = part.get("waterPoint")
        if not part.get("partId") or not isinstance(coords, list) or len(coords) != 2:
            raise RuntimeError("Blåvand-forslaget mangler et gyldigt privat vandpunkt")
        zones.append({
            "id": str(part["partId"]),
            "name": str(part.get("name") or part["partId"]),
            "lon": float(coords[0]),
            "lat": float(coords[1]),
            "coastType": "west",
        })
    if len(zones) != 2:
        raise RuntimeError(f"DMI-gaten kræver præcis to Blåvand-kystdele, fandt {len(zones)}")
    return zones


def compact_grid_point(point: dict[str, Any]) -> dict[str, Any]:
    result = {
        "latitude": round(float(point["latitude"]), 5),
        "longitude": round(float(point["longitude"]), 5),
        "distanceKm": round(float(point["distanceKm"]), 3),
    }
    if point.get("verticalLayer") is not None:
        result["verticalLayer"] = point["verticalLayer"]
    if point.get("verticalLayerRankM") is not None:
        result["verticalLayerRankM"] = point["verticalLayerRankM"]
    return result


def build_report(proposal: dict[str, Any], zones: list[dict[str, Any]], output: dict[str, Any],
                 collection_runs: dict[str, Any], diagnostics: dict[str, Any]) -> dict[str, Any]:
    rows = []
    for zone in zones:
        sampled = output["zones"].get(zone["id"]) or {}
        points = sampled.get("gridPoints") or {}
        components: dict[str, Any] = {}
        failures = []
        for collection, required in COLLECTIONS.items():
            missing = [key for key in required if key not in points]
            if missing:
                failures.append({"collection": collection, "reason": "MISSING_VALID_GRID_CELL", "components": missing})
                continue
            components[collection] = {
                "modelRun": collection_runs[collection]["modelRun"],
                "nativeValidTime": collection_runs[collection]["nativeValidTime"],
                "gridPoints": {key: compact_grid_point(points[key]) for key in required},
            }
        current_shared = all(key in points for key in ("current-u", "current-v")) and same_point(
            points["current-u"], points["current-v"]
        )
        if not current_shared:
            failures.append({"collection": "dkss_nsbs", "reason": "NO_SHARED_UV_GRID_POINT"})
        rows.append({
            "partId": zone["id"],
            "name": zone["name"],
            "candidateWaterPoint": [zone["lon"], zone["lat"]],
            "status": "valid-native-dmi-grid-cells" if not failures else "rejected",
            "sharedCurrentUvGridPoint": current_shared,
            "components": components,
            "failures": failures,
            "weatherSamplingEnabled": False,
            "automaticActivationAllowed": False,
            "scoreChanged": False,
        })

    independent_by_component: dict[str, bool] = {}
    for component in sorted({key for values in COLLECTIONS.values() for key in values}):
        component_points = [(output["zones"].get(zone["id"]) or {}).get("gridPoints", {}).get(component) for zone in zones]
        independent_by_component[component] = bool(
            len(component_points) == 2 and all(component_points) and not same_point(component_points[0], component_points[1])
        )
    passed = all(row["status"] == "valid-native-dmi-grid-cells" for row in rows)
    return {
        "schemaVersion": "1.0.0",
        "status": "passed-private-grid-validation" if passed else "failed-private-grid-validation",
        "generatedAt": utc_now(),
        "zoneId": proposal.get("zoneId"),
        "method": "native DMI forecast-step GRIB; production nearest-valid-cell search; shared physical U/V; no spatial interpolation",
        "collections": list(COLLECTIONS),
        "candidateCount": len(rows),
        "candidates": rows,
        "independentGridCellsByComponent": independent_by_component,
        "independentWeatherSeriesValidated": passed and all(independent_by_component.values()),
        "diagnostics": {
            "messagesSeen": diagnostics.get("messagesSeen", 0),
            "zoneLookups": diagnostics.get("zoneLookups", 0),
            "batchedGridReads": diagnostics.get("batchedGridReads", 0),
        },
        "productionGeometryChanged": False,
        "adminDataChanged": False,
        "weatherSamplingChanged": False,
        "scoreChanged": False,
        "automaticActivationAllowed": False,
    }


def run(proposal_path: pathlib.Path, report_path: pathlib.Path) -> dict[str, Any]:
    proposal = json.loads(proposal_path.read_text("utf-8"))
    zones = candidate_zones(proposal)
    bulk = load_bulk_module()
    output = {"zones": {zone["id"]: {"hourly": {}, "gridPoints": {}, "collections": {}} for zone in zones}}
    diagnostics: dict[str, Any] = {"messagesSeen": 0, "zoneLookups": 0, "batchedGridReads": 0}
    collection_runs = {}
    budget = {"bytes": 0}
    for collection in COLLECTIONS:
        model_run, assets, _stats = bulk.list_latest_assets(collection)
        if not model_run or not assets:
            raise RuntimeError(f"Ingen aktuel DMI forecast-step asset for {collection}")
        asset = assets[0]
        path, _reused = bulk.download_asset(asset["href"], asset.get("size"), budget)
        found, touched, interrupted, messages_seen, zone_lookups = bulk.process_grib(
            path, collection, model_run, asset["valid"], zones, output, diagnostics
        )
        diagnostics["messagesSeen"] += messages_seen
        diagnostics["zoneLookups"] += zone_lookups
        collection_runs[collection] = {
            "modelRun": model_run,
            "nativeValidTime": asset["valid"],
            "requiredParametersFound": sorted(set(found) & set(COLLECTIONS[collection])),
            "candidateIdsTouched": sorted(touched),
        }
        if interrupted:
            raise RuntimeError(f"DMI-gridkontrollen løb tør for sit private tidsbudget under {collection}")
    report = build_report(proposal, zones, output, collection_runs, diagnostics)
    report_path.parent.mkdir(parents=True, exist_ok=True)
    report_path.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", "utf-8")
    if report["status"] != "passed-private-grid-validation":
        raise RuntimeError("Et eller flere private Blåvand-vandpunkter mangler gyldige DMI-gridceller")
    return report


def self_test() -> None:
    proposal = {"zoneId": "DK-B03-13", "coastalParts": [
        {"partId": "north", "name": "Nord", "waterPoint": [8.08, 55.58]},
        {"partId": "south", "name": "Syd", "waterPoint": [8.14, 55.54]},
    ]}
    zones = candidate_zones(proposal)
    output = {"zones": {}}
    for index, zone in enumerate(zones):
        points = {}
        for component in COLLECTIONS["wam_nsb"]:
            points[component] = {"latitude": 55.55 + index * 0.05, "longitude": 8.0, "distanceKm": 4.0}
        for component in COLLECTIONS["dkss_nsbs"]:
            points[component] = {"latitude": 55.50 + index * 0.05, "longitude": 8.04, "distanceKm": 9.0,
                                 "verticalLayer": "depthbelowsea:1", "verticalLayerRankM": 1.0}
        output["zones"][zone["id"]] = {"gridPoints": points}
    runs = {collection: {"modelRun": "2026-08-09T00:00:00Z", "nativeValidTime": "2026-08-09T03:00:00Z"} for collection in COLLECTIONS}
    report = build_report(proposal, zones, output, runs, {})
    assert report["status"] == "passed-private-grid-validation"
    assert report["independentWeatherSeriesValidated"] is True
    output["zones"]["south"]["gridPoints"]["current-v"]["longitude"] = 8.05
    rejected = build_report(proposal, zones, output, runs, {})
    assert rejected["status"] == "failed-private-grid-validation"
    assert rejected["candidates"][1]["sharedCurrentUvGridPoint"] is False
    print("Blåvand DMI-grid self-test: bestået")


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--proposal", type=pathlib.Path, default=DEFAULT_PROPOSAL)
    parser.add_argument("--report", type=pathlib.Path, default=DEFAULT_REPORT)
    parser.add_argument("--self-test", action="store_true")
    args = parser.parse_args()
    if args.self_test:
        self_test()
        return 0
    report = run(args.proposal, args.report)
    print(json.dumps({
        "status": report["status"],
        "candidateCount": report["candidateCount"],
        "independentWeatherSeriesValidated": report["independentWeatherSeriesValidated"],
    }, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
