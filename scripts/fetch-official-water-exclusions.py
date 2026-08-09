#!/usr/bin/env python3
"""Fetch private official fjord/nor polygons for the geometry-v2 pilot."""
from __future__ import annotations

import argparse
import json
import sys
from datetime import datetime, timezone
from pathlib import Path

import requests
from shapely.geometry import shape

ROOT = Path(__file__).resolve().parents[1]
PLACES_URL = "https://api.dataforsyningen.dk/steder"
PAGE_SIZE = 1000
MAX_PAGES = 20
AREA_MARGIN_DEGREES = 0.05


def fail(message):
    print(message, file=sys.stderr)
    raise SystemExit(1)


def load(path):
    return json.loads(path.read_text(encoding="utf-8"))


def area_bounds(area, zones_by_id):
    bounds = [shape(zones_by_id[zone_id]["geometry"]).bounds for zone_id in area.get("zoneIds") or []]
    if not bounds:
        fail(f"Pilotområdet {area.get('id')} mangler zoner.")
    return (
        max(7.0, min(item[0] for item in bounds) - AREA_MARGIN_DEGREES),
        max(54.0, min(item[1] for item in bounds) - AREA_MARGIN_DEGREES),
        min(16.0, max(item[2] for item in bounds) + AREA_MARGIN_DEGREES),
        min(58.5, max(item[3] for item in bounds) + AREA_MARGIN_DEGREES),
    )


def polygon_parameter(bounds):
    west, south, east, north = bounds
    return json.dumps([[[west, south], [east, south], [east, north], [west, north], [west, south]]], separators=(",", ":"))


def safe_page(polygon, page):
    try:
        response = requests.get(PLACES_URL, params={
            "polygon": polygon,
            "hovedtype": "Farvand",
            "format": "geojson",
            "per_side": PAGE_SIZE,
            "side": page,
        }, timeout=60)
    except requests.RequestException:
        fail("Det officielle farvandspolygon-kald kunne ikke gennemføres.")
    if not response.ok:
        fail(f"Det officielle farvandspolygon-kald fejlede (HTTP {response.status_code}).")
    try:
        payload = response.json()
    except ValueError:
        fail("Farvandspolygon-kilden returnerede ikke gyldig GeoJSON.")
    if payload.get("type") != "FeatureCollection":
        fail("Farvandspolygon-kilden returnerede ikke en FeatureCollection.")
    return payload.get("features") or []


def build_output(zones, pilot, policy):
    zones_by_id = {feature.get("properties", {}).get("id"): feature for feature in zones.get("features") or []}
    output = []
    summaries = []
    for area in pilot.get("areas") or []:
        area_id = area["id"]
        excluded = {value.casefold() for value in policy["areas"][area_id].get("excludedOfficialFarvandSubtypes") or []}
        polygon = polygon_parameter(area_bounds(area, zones_by_id))
        fetched = 0
        selected = 0
        seen = set()
        for page in range(1, MAX_PAGES + 1):
            features = safe_page(polygon, page)
            fetched += len(features)
            for feature in features:
                props = feature.get("properties") or {}
                feature_id = str(props.get("id") or "")
                subtype = str(props.get("undertype") or "").casefold()
                geometry = feature.get("geometry")
                if not feature_id or feature_id in seen or subtype not in excluded or not geometry:
                    continue
                if shape(geometry).geom_type not in {"Polygon", "MultiPolygon"}:
                    fail(f"Officiel farvandsmaske har uventet geometri: {feature_id}")
                seen.add(feature_id)
                selected += 1
                output.append({
                    "type": "Feature",
                    "properties": {
                        "areaId": area_id,
                        "officialPlaceId": feature_id,
                        "primaryName": props.get("primærtnavn"),
                        "mainType": props.get("hovedtype"),
                        "subType": props.get("undertype"),
                        "kind": "official-inner-water-exclusion",
                        "automaticActivationAllowed": False,
                    },
                    "geometry": geometry,
                })
            if len(features) < PAGE_SIZE:
                break
        else:
            fail(f"Farvandspolygonudtrækket for {area_id} overskred sidegrænsen.")
        summaries.append({"areaId": area_id, "fetchedFarvandCount": fetched, "selectedExclusionCount": selected, "excludedSubtypes": sorted(excluded)})
    return {
        "type": "FeatureCollection",
        "metadata": {
            "schemaVersion": "1.0.0",
            "status": "private-read-only-official-water-exclusions",
            "generatedAt": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
            "source": "Dataforsyningen steder API / Danmarks officielle stednavneregister",
            "endpoint": PLACES_URL,
            "authentication": "none",
            "areaSummaries": summaries,
            "productionGeometryChanged": False,
            "scoreChanged": False,
        },
        "features": output,
    }


def self_test():
    assert polygon_parameter((10, 55, 11, 56)).startswith("[[[")
    policy = {"areas": {"a": {"excludedOfficialFarvandSubtypes": []}}}
    zones = {"features": [{"type": "Feature", "properties": {"id": "z"}, "geometry": {"type": "Polygon", "coordinates": [[[10, 55], [11, 55], [11, 56], [10, 56], [10, 55]]]}}]}
    assert area_bounds({"id": "a", "zoneIds": ["z"]}, {"z": zones["features"][0]})
    assert policy["areas"]["a"]["excludedOfficialFarvandSubtypes"] == []
    print("Officielle private fjord-/normasker self-test: bestået.")


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--work-dir", type=Path, default=ROOT / ".geometry-v2-work")
    parser.add_argument("--pilot-areas", type=Path, default=ROOT / "data" / "geometry-v2" / "pilot-areas.json")
    parser.add_argument("--policy", type=Path, default=ROOT / "data" / "geometry-v2" / "pilot-exclusion-policy.json")
    parser.add_argument("--self-test", action="store_true")
    parser.add_argument("--allow-external-private-work-dir", action="store_true", help=argparse.SUPPRESS)
    args = parser.parse_args()
    if args.self_test:
        self_test()
        return
    work_dir = args.work_dir.resolve()
    if ROOT not in work_dir.parents and not args.allow_external_private_work_dir:
        fail("Pilotens arbejdsmappe skal ligge i workspace.")
    zones_path = work_dir / "effective-pilot-zones.geojson"
    if not zones_path.exists():
        fail("Den centralt hydrerede pilot-zonebestand mangler.")
    output = build_output(load(zones_path), load(args.pilot_areas.resolve()), load(args.policy.resolve()))
    (work_dir / "official-water-exclusions.geojson").write_text(json.dumps(output, ensure_ascii=False, separators=(",", ":")) + "\n", encoding="utf-8")
    print(f"Officielle fjord-/normasker hentet privat: {len(output['features'])} polygoner.")


if __name__ == "__main__":
    main()
