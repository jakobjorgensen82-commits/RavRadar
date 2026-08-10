#!/usr/bin/env python3
"""Validate isolated native DMI multi-step series for national coastal parts.

The persisted report contains presence, digests and provenance only. Raw values
exist transiently while validating and are never written to the QA artifact.
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
DEFAULT_CONTRACT = WORK / "national-weather-shadow-contract.json"
DEFAULT_REPORT = WORK / "national-multi-step-series-validation.json"
DEFAULT_STATE_INPUT = ROOT / ".cache" / "national-state-replay-input.json"
FAMILY_COMPONENTS = {
    "wave": ("significant-wave-height", "mean-wave-dir", "dominant-wave-period"),
    "dkss": ("sea-mean-deviation", "current-u", "current-v"),
}
COLLECTION_FAMILY = {"wam_nsb": "wave", "wam_dw": "wave", "dkss_nsbs": "dkss", "dkss_idw": "dkss", "dkss_lf": "dkss"}
FALSE_FLAGS = ("productionGeometryChanged", "adminDataChanged", "weatherSamplingChanged", "stateChanged", "publicRuntimeChanged", "scoreChanged", "automaticActivationAllowed")


def now() -> str:
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


def load_grid_module():
    path = ROOT / "scripts" / "validate-national-local-part-dmi-grid.py"
    sys.path.insert(0, str(path.parent))
    spec = importlib.util.spec_from_file_location("ravradar_national_grid", path)
    if spec is None or spec.loader is None:
        raise RuntimeError("Nationalt DMI-gridmodul kunne ikke indlæses")
    module = importlib.util.module_from_spec(spec); spec.loader.exec_module(module)
    return module


def value_digest(series_id: str, valid_time: str, component: str, value: Any) -> str:
    payload = json.dumps([series_id, valid_time, component, value], ensure_ascii=False, separators=(",", ":"))
    return hashlib.sha256(payload.encode("utf-8")).hexdigest()[:16]


def expected_families(part: dict[str, Any]) -> dict[str, str]:
    groups = part.get("validatedGrid") or {}
    selected: dict[str, str] = {}
    for collection, group in groups.items():
        family = COLLECTION_FAMILY.get(collection)
        if not family:
            raise RuntimeError(f"{part['partId']} har ukendt DMI-collection {collection}")
        available = set((group.get("gridPoints") or {}).keys())
        if set(FAMILY_COMPONENTS[family]).issubset(available):
            if family in selected:
                raise RuntimeError(f"{part['partId']} har flere valgte collections for {family}")
            selected[family] = collection
    coverage = part.get("coverage") or {}
    if ("wave" in selected) != (coverage.get("waveFamilyComplete") is True):
        raise RuntimeError(f"{part['partId']} har inkonsistent wave-dækning")
    if ("dkss" in selected) != (coverage.get("dkssFamilyComplete") is True):
        raise RuntimeError(f"{part['partId']} har inkonsistent DKSS-dækning")
    if not selected or ((len(selected) == 2) != (coverage.get("fullWeatherCoverage") is True)):
        raise RuntimeError(f"{part['partId']} har inkonsistent samlet dækning")
    return selected


def compact_provenance(source: dict[str, Any], point: dict[str, Any], valid_time: str) -> dict[str, Any]:
    grid = load_grid_module()
    result = {
        "provider": source.get("provider"), "collection": source.get("collection"),
        "modelRun": source.get("modelRun"), "nativeValidTime": source.get("nativeValidTime"),
        "gridPoint": grid.compact(point), "verticalLayer": point.get("verticalLayer"),
        "spatialInterpolation": False, "fallback": False,
    }
    if result["provider"] != "dmi" or result["nativeValidTime"] != valid_time:
        raise RuntimeError("Native DMI-provenance matcher ikke tidstrinnet")
    return result


def validate(contract: dict[str, Any], snapshots: dict[str, Any], minimum_steps: int = 2) -> dict[str, Any]:
    if contract.get("status") != "private-national-shadow-contract-ready":
        raise RuntimeError("Flertrinsgaten kræver bestået national shadow-kontrakt")
    parts = contract.get("parts") or []
    if len(parts) != contract.get("eligiblePartCount") or contract.get("blockedPartCount", 0) != len(contract.get("blockedParts") or []):
        raise RuntimeError("Shadow-kontraktens parttal er inkonsistente")
    rows, series_ids, history_keys = [], set(), set()
    for part in parts:
        part_id, series_id, history_key = part["partId"], part["seriesId"], part["historyKey"]
        if series_id in series_ids or history_key in history_keys:
            raise RuntimeError(f"{part_id} deler serie- eller historikidentitet")
        series_ids.add(series_id); history_keys.add(history_key)
        families = expected_families(part)
        family_rows = {}
        for family, collection in families.items():
            hours = []
            components = FAMILY_COMPONENTS[family]
            for valid_time, snapshot in sorted((snapshots.get(part_id) or {}).get(collection, {}).items()):
                values, sources, points = snapshot.get("values") or {}, snapshot.get("sources") or {}, snapshot.get("gridPoints") or {}
                if not all(component in values and component in points for component in components):
                    continue
                if family == "dkss":
                    grid = load_grid_module()
                    if not grid.same_point(points["current-u"], points["current-v"]):
                        raise RuntimeError(f"{part_id} har current-U/V fra forskellige fysiske celler")
                    if points["current-u"].get("verticalLayer") != points["current-v"].get("verticalLayer"):
                        raise RuntimeError(f"{part_id} har current-U/V fra forskellige vertikallag")
                component_rows = {}
                for component in components:
                    source = sources.get("wave" if family == "wave" else ("waterLevel" if component == "sea-mean-deviation" else "current")) or {}
                    prov = compact_provenance(source, points[component], valid_time)
                    if prov["collection"] != collection:
                        raise RuntimeError(f"{part_id} fik {component} fra forkert collection")
                    component_rows[component] = {"valuePresent": True, "valueDigest": value_digest(series_id, valid_time, component, values[component]), "provenance": prov}
                hours.append({"time": valid_time, "components": component_rows})
            if len(hours) < minimum_steps:
                raise RuntimeError(f"{part_id}/{family} har kun {len(hours)} komplette native trin; kræver {minimum_steps}")
            family_rows[family] = {"collection": collection, "completeNativeStepCount": len(hours), "hours": hours}
        rows.append({"zoneId": part["zoneId"], "partId": part_id, "seriesId": series_id, "historyKey": history_key,
                     "coverage": part["coverage"], "families": family_rows, "weatherSamplingEnabled": False,
                     "stateEnabled": False, "scoreEnabled": False, "publicProjectionEnabled": False,
                     "adminWriteEnabled": False, "automaticActivationAllowed": False})
    full = sum(len(row["families"]) == 2 for row in rows)
    partial = len(rows) - full
    if (full, partial) != (contract.get("fullCoveragePartCount"), contract.get("partialCoveragePartCount")):
        raise RuntimeError("Flertrinsrapportens coverage-summer matcher ikke kontrakten")
    return {"schemaVersion": "1.0.0", "status": "passed-private-national-multi-step-series-validation", "generatedAt": now(),
            "minimumCompleteStepsPerAvailableFamily": minimum_steps, "eligiblePartCount": len(rows),
            "fullCoveragePartCount": full, "partialCoveragePartCount": partial, "blockedPartCount": contract["blockedPartCount"],
            "series": rows, "parentRuntimeTruth": contract.get("parentRuntimeTruth"),
            "activationGatesRemaining": ["separate-national-state-history-validation", "score-neutral-ui-review", "central-admin-roundtrip-and-rollback", "explicit-owner-go-no-go-before-score-or-production-activation"],
            "crossPartMergeDetected": False, "parentFallbackDetected": False, "rawWeatherValuesStored": False,
            "productionGeometryChanged": False, "adminDataChanged": False, "weatherSamplingChanged": False,
            "stateChanged": False, "publicRuntimeChanged": False, "scoreChanged": False, "automaticActivationAllowed": False}


def eligible_zones(collection: str, zones: list[dict[str, Any]], parts_by_id: dict[str, dict[str, Any]]) -> list[dict[str, Any]]:
    if collection not in COLLECTION_FAMILY:
        raise RuntimeError(f"Ukendt DMI-collection {collection}")
    return [zone for zone in zones if collection in expected_families(parts_by_id[zone["id"]]).values()]


def build_state_replay(contract: dict[str, Any], report: dict[str, Any], snapshots: dict[str, Any]) -> dict[str, Any]:
    replay = {"schemaVersion": "1.0.0", "status": "private-transient-national-state-replay", "series": [], "excluded": []}
    report_by_id = {row["partId"]: row for row in report["series"]}
    for part in contract.get("parts") or []:
        dkss = (report_by_id[part["partId"]].get("families") or {}).get("dkss")
        if not dkss:
            replay["excluded"].append({"zoneId": part["zoneId"], "partId": part["partId"], "reason": "MISSING_DKSS_CURRENT_FAMILY"})
            continue
        collection = dkss["collection"]
        hours = []
        for hour in dkss["hours"]:
            raw = snapshots[part["partId"]][collection][hour["time"]]["values"]
            hours.append({"time": hour["time"], "current-u": raw["current-u"], "current-v": raw["current-v"]})
        replay["series"].append({"zoneId": part["zoneId"], "partId": part["partId"], "seriesId": part["seriesId"],
                                 "historyKey": part["historyKey"], "onshoreDirectionDeg": part["onshoreDirectionDeg"], "hours": hours})
    return replay


def run(contract_path: pathlib.Path, report_path: pathlib.Path, state_input_path: pathlib.Path) -> dict[str, Any]:
    contract = json.loads(contract_path.read_text("utf-8")); grid = load_grid_module(); bulk = grid.load_bulk()
    parts = contract.get("parts") or []
    parts_by_id = {part["partId"]: part for part in parts}
    zones = [{"id": part["partId"], "lon": float(part["samplingPoint"][0]), "lat": float(part["samplingPoint"][1]), "coastType": part["coastType"]} for part in parts]
    required = {collection for part in parts for collection in expected_families(part).values()}
    snapshots: dict[str, Any] = {part["partId"]: {} for part in parts}; diagnostics = {"messagesSeen": 0, "zoneLookups": 0, "batchedGridReads": 0}; budget = {"bytes": 0}
    limit = max(2, int(os.getenv("NATIONAL_MULTI_STEP_MAX_ASSETS", "2")))
    for collection in sorted(required):
        model_run, assets, _ = bulk.list_latest_assets(collection)
        if not model_run or len(assets) < 2:
            raise RuntimeError(f"Ingen brugbar flertidsserie for {collection}")
        eligible = eligible_zones(collection, zones, parts_by_id)
        output = {"zones": {zone["id"]: {"hourly": {}, "gridPoints": {}, "collections": {}} for zone in eligible}}
        for asset in assets[:limit]:
            path, _ = bulk.download_asset(asset["href"], asset.get("size"), budget)
            _, _, interrupted, seen, lookups = bulk.process_grib(path, collection, model_run, asset["valid"], eligible, output, diagnostics)
            diagnostics["messagesSeen"] += seen; diagnostics["zoneLookups"] += lookups
            if interrupted: raise RuntimeError(f"Flertrinsgaten løb tør for tidsbudget under {collection}")
            for zone in eligible:
                point = output["zones"][zone["id"]]; hour = (point.get("hourly") or {}).get(asset["valid"])
                if not hour: continue
                components = FAMILY_COMPONENTS[COLLECTION_FAMILY[collection]]
                snapshots[zone["id"]].setdefault(collection, {})[asset["valid"]] = {
                    "values": {key: hour[key] for key in components if key in hour}, "sources": hour.get("sources") or {},
                    "gridPoints": {key: point.get("gridPoints", {}).get(key) for key in components if key in point.get("gridPoints", {})}}
    report = validate(contract, snapshots); report["diagnostics"] = diagnostics
    report_path.parent.mkdir(parents=True, exist_ok=True); report_path.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", "utf-8")
    replay = build_state_replay(contract, report, snapshots)
    state_input_path.parent.mkdir(parents=True, exist_ok=True)
    state_input_path.write_text(json.dumps(replay, ensure_ascii=False, indent=2) + "\n", "utf-8")
    return report


def self_test() -> None:
    def point(current=False): return {"latitude": 56, "longitude": 8, "distanceKm": 1, **({"verticalLayer": "depthbelowsea:1"} if current else {})}
    parts, snapshots = [], {}
    for index, families in enumerate(({"wave": "wam_nsb", "dkss": "dkss_nsbs"}, {"wave": "wam_dw"})):
        part_id = f"p{index}"; groups = {}
        for family, collection in families.items(): groups[collection] = {"gridPoints": {key: point(key.startswith("current-")) for key in FAMILY_COMPONENTS[family]}}
        parts.append({"zoneId": f"Z{index}", "partId": part_id, "seriesId": f"Z{index}::{part_id}", "historyKey": f"coastal-part::Z{index}::{part_id}", "onshoreDirectionDeg": 90, "validatedGrid": groups,
                      "coverage": {"fullWeatherCoverage": len(families) == 2, "waveFamilyComplete": "wave" in families, "dkssFamilyComplete": "dkss" in families, "coverageGaps": []}})
        snapshots[part_id] = {}
        for family, collection in families.items():
            snapshots[part_id][collection] = {}
            for valid in ("2026-08-10T00:00:00Z", "2026-08-10T03:00:00Z"):
                components = FAMILY_COMPONENTS[family]; source_family = "wave" if family == "wave" else "current"
                sources = {source_family: {"provider": "dmi", "collection": collection, "modelRun": "run", "nativeValidTime": valid}}
                if family == "dkss": sources["waterLevel"] = dict(sources["current"])
                snapshots[part_id][collection][valid] = {"values": {key: index + len(key) for key in components}, "gridPoints": {key: point(key.startswith("current-")) for key in components}, "sources": sources}
    contract = {"status": "private-national-shadow-contract-ready", "eligiblePartCount": 2, "fullCoveragePartCount": 1, "partialCoveragePartCount": 1, "blockedPartCount": 1, "blockedParts": [{}], "parts": parts}
    zones = [{"id": part["partId"]} for part in parts]
    parts_by_id = {part["partId"]: part for part in parts}
    assert [zone["id"] for zone in eligible_zones("dkss_nsbs", zones, parts_by_id)] == ["p0"]
    assert [zone["id"] for zone in eligible_zones("wam_dw", zones, parts_by_id)] == ["p1"]
    report = validate(contract, snapshots)
    assert report["status"] == "passed-private-national-multi-step-series-validation" and not report["rawWeatherValuesStored"]
    replay = build_state_replay(contract, report, snapshots)
    assert len(replay["series"]) == 1 and replay["series"][0]["partId"] == "p0" and len(replay["series"][0]["hours"]) == 2
    assert replay["excluded"] == [{"zoneId": "Z1", "partId": "p1", "reason": "MISSING_DKSS_CURRENT_FAMILY"}]
    broken = json.loads(json.dumps(snapshots)); broken["p1"]["wam_dw"].pop("2026-08-10T03:00:00Z")
    try: validate(contract, broken)
    except RuntimeError: pass
    else: raise AssertionError("En tilgængelig familie med kun ét trin skal stoppes")
    print("National privat flertrinsserie-self-test: bestået")


def main() -> int:
    parser = argparse.ArgumentParser(); parser.add_argument("--contract", type=pathlib.Path, default=DEFAULT_CONTRACT); parser.add_argument("--report", type=pathlib.Path, default=DEFAULT_REPORT); parser.add_argument("--state-input", type=pathlib.Path, default=DEFAULT_STATE_INPUT); parser.add_argument("--self-test", action="store_true"); args = parser.parse_args()
    if args.self_test: self_test(); return 0
    report = run(args.contract, args.report, args.state_input); print(json.dumps({key: report[key] for key in ("status", "eligiblePartCount", "fullCoveragePartCount", "partialCoveragePartCount", "blockedPartCount")}, ensure_ascii=False)); return 0


if __name__ == "__main__": raise SystemExit(main())
