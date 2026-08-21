#!/usr/bin/env python3
"""Validate private national coastal water candidates on native DMI grids."""
from __future__ import annotations

import argparse
import importlib.util
import json
import pathlib
import sys
from datetime import datetime, timezone
from typing import Any

ROOT = pathlib.Path(__file__).resolve().parents[1]
DEFAULT_INPUT = ROOT / ".geometry-v2-work" / "national-local-part-point-pairs.json"
DEFAULT_REPORT = ROOT / ".geometry-v2-work" / "national-local-part-dmi-grid.json"
COLLECTIONS = {
    "wam_nsb": ("significant-wave-height", "mean-wave-dir", "dominant-wave-period"),
    "wam_dw": ("significant-wave-height", "mean-wave-dir", "dominant-wave-period"),
    "dkss_nsbs": ("sea-mean-deviation", "current-u", "current-v"),
    "dkss_idw": ("sea-mean-deviation", "current-u", "current-v"),
    "dkss_lf": ("sea-mean-deviation", "current-u", "current-v"),
}
REQUIRED_COMPONENTS = ("significant-wave-height", "mean-wave-dir", "dominant-wave-period", "sea-mean-deviation", "current-u", "current-v")


def now() -> str:
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


def load_bulk():
    path = ROOT / "scripts" / "update-dmi-bulk.py"
    sys.path.insert(0, str(path.parent))
    spec = importlib.util.spec_from_file_location("ravradar_dmi_bulk", path)
    if spec is None or spec.loader is None:
        raise RuntimeError("DMI-produktionsmodulet kunne ikke indlæses")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def candidates(document: dict[str, Any]) -> tuple[list[dict[str, Any]], dict[str, dict[str, Any]]]:
    rows, metadata = [], {}
    for part in document.get("parts") or []:
        part_id = str(part.get("finalPartId") or "")
        if not part_id:
            raise RuntimeError("Punktdokumentet indeholder en del uden finalPartId")
        if part.get("status") == "private-point-pair-proposed":
            points = [("selected", part.get("waterPoint"))]
        elif part.get("status") == "blocked-point-pair-evidence":
            normals = part.get("unresolvedNormalCandidates") or []
            if len(normals) != 2:
                raise RuntimeError(f"{part_id} skal have præcis to uløste normalalternativer")
            points = [(f"normal-{row['side']}", row.get("waterCandidate")) for row in normals]
        else:
            raise RuntimeError(f"{part_id} har ukendt punktstatus")
        metadata[part_id] = part
        for variant, point in points:
            if not isinstance(point, list) or len(point) != 2:
                raise RuntimeError(f"{part_id}/{variant} mangler gyldigt vandpunkt")
            candidate_id = f"{part_id}::{variant}"
            coast_type = str(part.get("coastType") or "")
            if coast_type not in {"west", "east", "limfjord"}:
                raise RuntimeError(f"{part_id} mangler gyldig coastType")
            rows.append({"id": candidate_id, "lon": float(point[0]), "lat": float(point[1]), "coastType": coast_type})
    return rows, metadata


def same_point(a: dict[str, Any], b: dict[str, Any]) -> bool:
    return (round(float(a["latitude"]), 7), round(float(a["longitude"]), 7)) == (
        round(float(b["latitude"]), 7), round(float(b["longitude"]), 7)
    )


def compact(point: dict[str, Any]) -> dict[str, Any]:
    result = {"latitude": round(float(point["latitude"]), 5), "longitude": round(float(point["longitude"]), 5),
              "distanceKm": round(float(point["distanceKm"]), 3)}
    for key in ("verticalLayer", "verticalLayerRankM"):
        if point.get(key) is not None:
            result[key] = point[key]
    return result


def candidate_result(candidate: dict[str, Any], output: dict[str, Any], runs: dict[str, Any]) -> dict[str, Any]:
    points = (output.get("zones", {}).get(candidate["id"]) or {}).get("gridPoints") or {}
    gaps, components = [], {}
    missing = [key for key in REQUIRED_COMPONENTS if key not in points]
    if missing:
        gaps.append({"reason": "MISSING_VALID_GRID_CELL", "components": missing})
    for component in REQUIRED_COMPONENTS:
        if component not in points:
            continue
        collection = (output.get("zones", {}).get(candidate["id"]) or {}).get("collections", {}).get(component)
        if collection not in runs:
            gaps.append({"reason": "MISSING_COLLECTION_PROVENANCE", "components": [component]})
            continue
        group = components.setdefault(collection, {"modelRun": runs[collection]["modelRun"], "nativeValidTime": runs[collection]["nativeValidTime"], "gridPoints": {}})
        group["gridPoints"][component] = compact(points[component])
    point_collections = (output.get("zones", {}).get(candidate["id"]) or {}).get("collections", {})
    shared_uv = (all(key in points for key in ("current-u", "current-v"))
                 and same_point(points["current-u"], points["current-v"])
                 and point_collections.get("current-u") == point_collections.get("current-v"))
    wave_complete = any(set(REQUIRED_COMPONENTS[:3]).issubset(set(group["gridPoints"])) for group in components.values())
    dkss_complete = shared_uv and any(set(REQUIRED_COMPONENTS[3:]).issubset(set(group["gridPoints"])) for group in components.values())
    if not shared_uv:
        gaps.append({"reason": "NO_SHARED_UV_GRID_POINT"})
    valid = wave_complete or dkss_complete
    return {"candidateId": candidate["id"], "candidateWaterPoint": [candidate["lon"], candidate["lat"]],
            "status": "valid-native-marine-grid-evidence" if valid else "rejected", "fullWeatherCoverage": wave_complete and dkss_complete,
            "waveFamilyComplete": wave_complete, "dkssFamilyComplete": dkss_complete, "sharedCurrentUvGridPoint": shared_uv,
            "components": components, "coverageGaps": gaps}


def build_report(document: dict[str, Any], zones: list[dict[str, Any]], metadata: dict[str, dict[str, Any]],
                 output: dict[str, Any], runs: dict[str, Any], diagnostics: dict[str, Any]) -> dict[str, Any]:
    results = {row["id"]: candidate_result(row, output, runs) for row in zones}
    parts, invalid_selected, partial_selected, resolved, unresolved = [], 0, 0, 0, 0
    for part_id, source in metadata.items():
        if source["status"] == "private-point-pair-proposed":
            chosen = results[f"{part_id}::selected"]
            status = "validated-selected-water-point" if chosen["status"].startswith("valid") else "blocked-selected-water-point"
            invalid_selected += status.startswith("blocked")
            partial_selected += chosen["status"].startswith("valid") and not chosen["fullWeatherCoverage"]
            row = {"zoneId": source["zoneId"], "finalPartId": part_id, "suggestedName": source.get("suggestedName"),
                   "status": status, "selected": chosen}
        else:
            alternatives = [results[f"{part_id}::normal-{normal['side']}"] for normal in source["unresolvedNormalCandidates"]]
            valid = [item for item in alternatives if item["status"].startswith("valid")]
            status = "resolved-unique-native-water-side" if len(valid) == 1 else "blocked-ambiguous-native-water-side"
            resolved += len(valid) == 1
            unresolved += len(valid) != 1
            row = {"zoneId": source["zoneId"], "finalPartId": part_id, "suggestedName": source.get("suggestedName"),
                   "status": status, "resolvedCandidateId": valid[0]["candidateId"] if len(valid) == 1 else None,
                   "alternatives": alternatives}
        parts.append(row)
    passed = invalid_selected == 0
    return {"schemaVersion": "1.0.0", "status": "passed-private-national-dmi-grid-validation" if passed else "failed-private-national-dmi-grid-validation",
            "generatedAt": now(), "method": "native DMI forecast-step GRIB; production nearest-valid-cell search; shared physical U/V; no interpolation",
            "candidateCount": len(zones), "selectedPointCount": sum(1 for row in metadata.values() if row["status"] == "private-point-pair-proposed"), "invalidSelectedPointCount": invalid_selected,
            "fullCoverageSelectedPointCount": sum(1 for row in parts if row.get("selected", {}).get("fullWeatherCoverage") is True),
            "partialCoverageSelectedPointCount": partial_selected,
            "ambiguousPartCount": sum(1 for row in metadata.values() if row["status"] == "blocked-point-pair-evidence"),
            "uniquelyResolvedAmbiguousPartCount": resolved, "stillBlockedAmbiguousPartCount": unresolved,
            "parts": parts, "diagnostics": {key: diagnostics.get(key, 0) for key in ("messagesSeen", "zoneLookups", "batchedGridReads")},
            "productionGeometryChanged": False, "adminDataChanged": False, "weatherSamplingChanged": False,
            "stateChanged": False, "scoreChanged": False, "automaticActivationAllowed": False}


def run(input_path: pathlib.Path, report_path: pathlib.Path) -> dict[str, Any]:
    document = json.loads(input_path.read_text("utf-8"))
    zones, metadata = candidates(document)
    bulk = load_bulk()
    output = {"zones": {row["id"]: {"hourly": {}, "gridPoints": {}, "collections": {}} for row in zones}}
    diagnostics = {"messagesSeen": 0, "zoneLookups": 0, "batchedGridReads": 0}
    runs, budget = {}, {"bytes": 0}
    for collection in COLLECTIONS:
        model_run, assets, _ = bulk.list_latest_assets(collection)
        if not model_run or not assets:
            raise RuntimeError(f"Ingen aktuel DMI forecast-step asset for {collection}")
        asset = assets[0]
        path, _ = bulk.download_asset(asset["href"], asset.get("size"), budget)
        found, touched, interrupted, seen, lookups = bulk.process_grib(path, collection, model_run, asset["valid"], zones, output, diagnostics)
        diagnostics["messagesSeen"] += seen
        diagnostics["zoneLookups"] += lookups
        runs[collection] = {"modelRun": model_run, "nativeValidTime": asset["valid"], "requiredParametersFound": sorted(set(found) & set(COLLECTIONS[collection])), "candidateIdsTouched": len(touched)}
        if interrupted:
            raise RuntimeError(f"DMI-gridkontrollen overskred sit private tidsbudget under {collection}")
    report = build_report(document, zones, metadata, output, runs, diagnostics)
    report_path.parent.mkdir(parents=True, exist_ok=True)
    report_path.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", "utf-8")
    if report["status"].startswith("failed"):
        raise RuntimeError("Et eller flere valgte nationale vandpunkter mangler gyldige native DMI-celler")
    return report


def self_test() -> None:
    document = {"parts": [{"zoneId": "A", "coastType": "west", "finalPartId": "a", "suggestedName": "A", "status": "private-point-pair-proposed", "waterPoint": [8, 56]},
                           {"zoneId": "B", "coastType": "east", "finalPartId": "b", "suggestedName": "B", "status": "blocked-point-pair-evidence", "unresolvedNormalCandidates": [{"side": 1, "waterCandidate": [9, 56]}, {"side": -1, "waterCandidate": [8.9, 56]}]}]}
    zones, meta = candidates(document)
    output = {"zones": {}}
    for index, zone in enumerate(zones):
        points = {}
        if index != 2:
            for key in REQUIRED_COMPONENTS:
                points[key] = {"latitude": 56, "longitude": zone["lon"], "distanceKm": 1, "verticalLayer": "surface:0"}
        output["zones"][zone["id"]] = {"gridPoints": points, "collections": {key: ("wam_nsb" if key.startswith(("significant", "mean", "dominant")) else "dkss_nsbs") for key in points}}
    runs = {key: {"modelRun": "run", "nativeValidTime": "valid"} for key in COLLECTIONS}
    for key in REQUIRED_COMPONENTS[:3]:
        output["zones"]["a::selected"]["gridPoints"].pop(key)
        output["zones"]["a::selected"]["collections"].pop(key)
    report = build_report(document, zones, meta, output, runs, {})
    assert report["status"].startswith("passed") and report["uniquelyResolvedAmbiguousPartCount"] == 1
    assert report["partialCoverageSelectedPointCount"] == 1 and report["invalidSelectedPointCount"] == 0
    assert report["automaticActivationAllowed"] is False
    mixed_output = json.loads(json.dumps(output))
    mixed_output["zones"]["a::selected"]["collections"]["current-v"] = "dkss_idw"
    mixed_report = build_report(document, zones, meta, mixed_output, runs, {})
    assert mixed_report["status"].startswith("failed") and mixed_report["invalidSelectedPointCount"] == 1
    print("National local part DMI-grid self-test: bestået")


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--input", type=pathlib.Path, default=DEFAULT_INPUT)
    parser.add_argument("--report", type=pathlib.Path, default=DEFAULT_REPORT)
    parser.add_argument("--self-test", action="store_true")
    args = parser.parse_args()
    if args.self_test:
        self_test(); return 0
    report = run(args.input, args.report)
    print(json.dumps({key: report[key] for key in ("status", "candidateCount", "invalidSelectedPointCount", "uniquelyResolvedAmbiguousPartCount", "stillBlockedAmbiguousPartCount")}, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
