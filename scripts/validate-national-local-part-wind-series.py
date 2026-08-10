#!/usr/bin/env python3
"""Validate two native HARMONIE wind steps for every eligible coastal part."""
from __future__ import annotations

import argparse
import hashlib
import importlib.util
import json
import pathlib
import sys
from datetime import datetime, timezone
from typing import Any

ROOT = pathlib.Path(__file__).resolve().parents[1]
WORK = ROOT / ".geometry-v2-work"
DEFAULT_CONTRACT = WORK / "national-weather-shadow-contract.json"
DEFAULT_REPORT = WORK / "national-local-part-wind-series.json"
DEFAULT_MARINE_INPUT = ROOT / ".cache" / "national-shadow-score-marine-input.json"
DEFAULT_WIND_INPUT = ROOT / ".cache" / "national-shadow-score-wind-input.json"
COLLECTION = "harmonie_dini_sf"
COMPONENTS = ("wind-u-10m", "wind-v-10m")


def now() -> str:
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


def load_grid_module():
    path = ROOT / "scripts" / "validate-national-local-part-dmi-grid.py"
    sys.path.insert(0, str(path.parent))
    spec = importlib.util.spec_from_file_location("ravradar_national_grid_for_wind", path)
    if spec is None or spec.loader is None:
        raise RuntimeError("Nationalt DMI-gridmodul kunne ikke indlæses")
    module = importlib.util.module_from_spec(spec); spec.loader.exec_module(module)
    return module


def digest(series_id: str, valid_time: str, component: str, value: Any) -> str:
    payload = json.dumps([series_id, valid_time, component, value], ensure_ascii=False, separators=(",", ":"))
    return hashlib.sha256(payload.encode("utf-8")).hexdigest()[:16]


def validate(contract: dict[str, Any], snapshots: dict[str, Any], minimum_steps: int = 2) -> dict[str, Any]:
    grid = load_grid_module()
    if contract.get("status") != "private-national-shadow-contract-ready" or len(contract.get("parts") or []) != contract.get("eligiblePartCount"):
        raise RuntimeError("Vindgaten kræver bestået national shadow-kontrakt")
    rows, series_ids = [], set()
    for part in contract["parts"]:
        part_id, series_id = part["partId"], part["seriesId"]
        if series_id in series_ids or series_id == part["zoneId"]:
            raise RuntimeError(f"{part_id} deler eller genbruger vindserieidentitet")
        series_ids.add(series_id); hours = []
        for valid_time, snapshot in sorted((snapshots.get(part_id) or {}).items()):
            values, points, source = snapshot.get("values") or {}, snapshot.get("gridPoints") or {}, snapshot.get("source") or {}
            if not all(key in values and key in points for key in COMPONENTS):
                continue
            if not grid.same_point(points[COMPONENTS[0]], points[COMPONENTS[1]]):
                raise RuntimeError(f"{part_id} har wind-U/V fra forskellige fysiske celler")
            if source.get("provider") != "dmi" or source.get("collection") != COLLECTION or source.get("nativeValidTime") != valid_time or not source.get("modelRun"):
                raise RuntimeError(f"{part_id} har ugyldig native vindprovenance ved {valid_time}")
            components = {}
            for component in COMPONENTS:
                components[component] = {"valuePresent": True, "valueDigest": digest(series_id, valid_time, component, values[component]),
                    "provenance": {"provider": "dmi", "collection": COLLECTION, "modelRun": source["modelRun"], "nativeValidTime": valid_time,
                                   "gridPoint": grid.compact(points[component]), "verticalLayer": points[component].get("verticalLayer"),
                                   "spatialInterpolation": False, "fallback": False}}
            hours.append({"time": valid_time, "components": components})
        if len(hours) < minimum_steps:
            raise RuntimeError(f"{part_id} har kun {len(hours)} komplette native vindtrin; kræver {minimum_steps}")
        rows.append({"zoneId": part["zoneId"], "partId": part_id, "seriesId": series_id, "historyKey": part["historyKey"],
                     "collection": COLLECTION, "completeNativeStepCount": len(hours), "hours": hours,
                     "weatherSamplingEnabled": False, "stateEnabled": False, "scoreEnabled": False,
                     "publicProjectionEnabled": False, "adminWriteEnabled": False, "automaticActivationAllowed": False})
    return {"schemaVersion": "1.0.0", "status": "passed-private-national-native-wind-series-validation", "generatedAt": now(),
            "eligiblePartCount": len(rows), "minimumCompleteNativeSteps": minimum_steps, "collection": COLLECTION, "series": rows,
            "parentRuntimeTruth": contract.get("parentRuntimeTruth"),
            "activationGatesRemaining": ["national-shadow-score-validation", "score-neutral-ui-review", "central-admin-roundtrip-and-rollback", "explicit-owner-go-no-go-before-score-or-production-activation"],
            "crossPartMergeDetected": False, "parentFallbackDetected": False, "rawWeatherValuesStored": False,
            "productionGeometryChanged": False, "adminDataChanged": False, "weatherSamplingChanged": False,
            "stateChanged": False, "publicRuntimeChanged": False, "scoreChanged": False, "automaticActivationAllowed": False}


def build_shadow_score_wind_input(marine_input: dict[str, Any], snapshots: dict[str, Any]) -> dict[str, Any]:
    if marine_input.get("status") != "private-transient-national-shadow-score-marine-input":
        raise RuntimeError("Vindgaten mangler transient marint shadow-input")
    rows, excluded = [], list(marine_input.get("excluded") or [])
    for marine in marine_input.get("series") or []:
        marine_hours = marine.get("hours") or []
        # The final marine step is reserved for the native +3h water-level trend.
        score_times = {hour["time"] for hour in marine_hours[:-1]}
        hours = []
        for valid_time, snapshot in sorted((snapshots.get(marine["partId"]) or {}).items()):
            if valid_time not in score_times:
                continue
            values = snapshot.get("values") or {}
            if all(component in values for component in COMPONENTS):
                hours.append({"time": valid_time, **{component: values[component] for component in COMPONENTS}})
        if not hours:
            excluded.append({"zoneId": marine["zoneId"], "partId": marine["partId"], "reason": "NO_EXACT_NATIVE_WIND_MARINE_TIME"})
            continue
        rows.append({"zoneId": marine["zoneId"], "partId": marine["partId"], "seriesId": marine["seriesId"], "hours": hours})
    return {"schemaVersion": "1.0.0", "status": "private-transient-national-shadow-score-wind-input", "series": rows, "excluded": excluded}


def run(contract_path: pathlib.Path, report_path: pathlib.Path, marine_input_path: pathlib.Path, wind_input_path: pathlib.Path) -> dict[str, Any]:
    contract = json.loads(contract_path.read_text("utf-8")); marine_input = json.loads(marine_input_path.read_text("utf-8")); grid = load_grid_module(); bulk = grid.load_bulk()
    zones = [{"id": part["partId"], "lon": float(part["samplingPoint"][0]), "lat": float(part["samplingPoint"][1]), "coastType": part["coastType"]} for part in contract.get("parts") or []]
    model_run, assets, _ = bulk.list_latest_assets(COLLECTION)
    if not model_run or len(assets) < 2:
        raise RuntimeError("Ingen brugbar HARMONIE-flertrinsserie")
    requested_times = {hour["time"] for row in marine_input.get("series") or [] for hour in (row.get("hours") or [])[:-1]}
    selected_assets = list(assets[:2])
    selected_valid = {asset["valid"] for asset in selected_assets}
    for asset in assets:
        if asset["valid"] in requested_times and asset["valid"] not in selected_valid:
            selected_assets.append(asset); selected_valid.add(asset["valid"])
    output = {"zones": {zone["id"]: {"hourly": {}, "gridPoints": {}, "collections": {}} for zone in zones}}
    diagnostics = {"messagesSeen": 0, "zoneLookups": 0, "batchedGridReads": 0}; budget = {"bytes": 0}; snapshots = {zone["id"]: {} for zone in zones}
    for asset in selected_assets:
        file_path, _ = bulk.download_asset(asset["href"], asset.get("size"), budget)
        _, _, interrupted, seen, lookups = bulk.process_grib(file_path, COLLECTION, model_run, asset["valid"], zones, output, diagnostics)
        diagnostics["messagesSeen"] += seen; diagnostics["zoneLookups"] += lookups
        if interrupted: raise RuntimeError("Vindgaten løb tør for tidsbudget")
        for zone in zones:
            point = output["zones"][zone["id"]]; hour = (point.get("hourly") or {}).get(asset["valid"])
            if not hour: continue
            snapshots[zone["id"]][asset["valid"]] = {"values": {key: hour[key] for key in COMPONENTS if key in hour},
                "gridPoints": {key: point.get("gridPoints", {}).get(key) for key in COMPONENTS if key in point.get("gridPoints", {})},
                "source": (hour.get("sources") or {}).get("wind") or {}}
    report = validate(contract, snapshots); report["diagnostics"] = diagnostics
    report_path.parent.mkdir(parents=True, exist_ok=True); report_path.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", "utf-8")
    wind_input = build_shadow_score_wind_input(marine_input, snapshots)
    wind_input_path.parent.mkdir(parents=True, exist_ok=True); wind_input_path.write_text(json.dumps(wind_input, ensure_ascii=False, indent=2) + "\n", "utf-8")
    return report


def self_test() -> None:
    point = {"latitude": 56, "longitude": 8, "distanceKm": 1, "verticalLayer": "heightaboveground:10"}
    parts = [{"zoneId": "Z", "partId": key, "seriesId": f"Z::{key}", "historyKey": f"coastal-part::Z::{key}"} for key in ("a", "b")]
    contract = {"status": "private-national-shadow-contract-ready", "eligiblePartCount": 2, "parts": parts}
    snapshots = {}
    for index, part in enumerate(parts):
        snapshots[part["partId"]] = {}
        for valid in ("2026-08-10T00:00:00Z", "2026-08-10T01:00:00Z"):
            snapshots[part["partId"]][valid] = {"values": {"wind-u-10m": index + 1, "wind-v-10m": index + 2},
                "gridPoints": {key: dict(point) for key in COMPONENTS},
                "source": {"provider": "dmi", "collection": COLLECTION, "modelRun": "run", "nativeValidTime": valid}}
    report = validate(contract, snapshots)
    assert report["eligiblePartCount"] == 2 and not report["rawWeatherValuesStored"]
    marine_input = {"status": "private-transient-national-shadow-score-marine-input", "series": [{"zoneId": "Z", "partId": "a", "seriesId": "Z::a", "hours": [{"time": "2026-08-10T00:00:00Z"}, {"time": "2026-08-10T01:00:00Z"}]}], "excluded": []}
    wind_input = build_shadow_score_wind_input(marine_input, snapshots)
    assert len(wind_input["series"]) == 1 and len(wind_input["series"][0]["hours"]) == 1
    broken = json.loads(json.dumps(snapshots)); broken["b"].pop("2026-08-10T01:00:00Z")
    try: validate(contract, broken)
    except RuntimeError: pass
    else: raise AssertionError("Vindserie med ét trin skal stoppes")
    print("National privat native vindserie-self-test: bestået")


def main() -> int:
    parser = argparse.ArgumentParser(); parser.add_argument("--contract", type=pathlib.Path, default=DEFAULT_CONTRACT); parser.add_argument("--report", type=pathlib.Path, default=DEFAULT_REPORT); parser.add_argument("--marine-input", type=pathlib.Path, default=DEFAULT_MARINE_INPUT); parser.add_argument("--wind-input", type=pathlib.Path, default=DEFAULT_WIND_INPUT); parser.add_argument("--self-test", action="store_true"); args = parser.parse_args()
    if args.self_test: self_test(); return 0
    report = run(args.contract, args.report, args.marine_input, args.wind_input); print(json.dumps({"status": report["status"], "eligiblePartCount": report["eligiblePartCount"], "minimumCompleteNativeSteps": report["minimumCompleteNativeSteps"], "scoreChanged": False}, ensure_ascii=False)); return 0


if __name__ == "__main__": raise SystemExit(main())
