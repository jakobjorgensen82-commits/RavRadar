#!/usr/bin/env python3
"""Build private official-place-name and migration triage for geometry-v2.

The source is Dataforsyningen's public `steder` API. Output is review evidence,
not an automatic rename, geometry proposal, or production mutation.
"""
from __future__ import annotations

import argparse
import json
import re
import sys
import unicodedata
from datetime import datetime, timezone
from pathlib import Path

import requests
from pyproj import Transformer
from shapely.geometry import LineString, Point, shape
from shapely.ops import transform

ROOT = Path(__file__).resolve().parents[1]
PLACES_URL = "https://api.dataforsyningen.dk/steder"
PLACE_TYPES = ("Bebyggelse", "Farvand", "Landskabsform", "Naturareal", "Havnebassin")
TO_METRES = Transformer.from_crs("EPSG:4326", "EPSG:25832", always_xy=True)
PAGE_SIZE = 1000
MAX_PAGES_PER_TYPE_AREA = 20
AREA_MARGIN_DEGREES = 0.05
MAX_CANDIDATE_DISTANCE_METRES = 15000
MAX_CANDIDATES_PER_ZONE = 40
NAME_STOP_WORDS = {"og", "samt", "ved", "nord", "syd", "ost", "øst", "vest", "munding"}


def fail(message):
    print(message, file=sys.stderr)
    raise SystemExit(1)


def load_json(path):
    return json.loads(path.read_text(encoding="utf-8"))


def project(geometry):
    return transform(TO_METRES.transform, geometry)


def normalise(value):
    decomposed = unicodedata.normalize("NFKD", str(value or ""))
    plain = "".join(char for char in decomposed if not unicodedata.combining(char))
    return re.sub(r"[^a-z0-9æøå]+", " ", plain.casefold()).strip()


def current_name_tokens(name):
    return [token for token in normalise(name).split() if len(token) >= 3 and token not in NAME_STOP_WORDS]


def safe_get(params):
    try:
        response = requests.get(PLACES_URL, params=params, timeout=60)
    except requests.RequestException:
        fail("Det officielle stednavnekald kunne ikke gennemføres.")
    if not response.ok:
        fail(f"Det officielle stednavnekald fejlede (HTTP {response.status_code}).")
    try:
        payload = response.json()
    except ValueError:
        fail("Stednavnekilden returnerede ikke gyldig JSON.")
    if not isinstance(payload, list):
        fail("Stednavnekilden returnerede ikke den forventede liste.")
    return payload


def polygon_parameter(bounds):
    west, south, east, north = bounds
    return json.dumps([[[west, south], [east, south], [east, north], [west, north], [west, south]]], separators=(",", ":"))


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


def compact_place(item):
    centre = item.get("visueltcenter")
    if not isinstance(centre, list) or len(centre) < 2:
        return None
    return {
        "id": str(item.get("id") or ""),
        "primaryName": item.get("primærtnavn"),
        "nameStatus": item.get("primærnavnestatus"),
        "mainType": item.get("hovedtype"),
        "subType": item.get("undertype"),
        "visualCentre": [float(centre[0]), float(centre[1])],
    }


def fetch_area_places(area, zones_by_id):
    polygon = polygon_parameter(area_bounds(area, zones_by_id))
    unique = {}
    request_count = 0
    for main_type in PLACE_TYPES:
        for page in range(1, MAX_PAGES_PER_TYPE_AREA + 1):
            items = safe_get({"polygon": polygon, "hovedtype": main_type, "per_side": PAGE_SIZE, "side": page})
            request_count += 1
            for item in items:
                compact = compact_place(item)
                if compact and compact["id"]:
                    unique[compact["id"]] = compact
            if len(items) < PAGE_SIZE:
                break
        else:
            fail(f"Stednavneudtrækket for {area['id']}/{main_type} overskred den sikre sidegrænse.")
    return list(unique.values()), request_count


def migration_classification(qa_row):
    ratio = float(qa_row.get("currentNearSourceRatio250m") or 0)
    maximum = qa_row.get("currentToSourceDistance", {}).get("maxM")
    parts = int(qa_row.get("candidateSourcePartCount") or 0)
    admin_conflict = qa_row.get("adminOverlayStatus") == "conflict-review-required"
    if ratio < 0.2 or maximum is None or float(maximum) > 1000:
        classification = "semantic-relocation"
        reason = "Den nuværende kyst ligger markant uden for den fysiske GeoDanmark-reference."
    elif parts > 25:
        classification = "boundary-adjustment"
        reason = "Kystkilden består af mange mulige bredder, øer eller delstrækninger og kræver eksplicit partition."
    else:
        classification = "geometry-correction"
        reason = "Den nuværende strækning kan vurderes som lokal geometriopretning mod kystreferencen."
    return {
        "classification": classification,
        "historyPolicy": "manual-review" if admin_conflict or classification != "geometry-correction" else "continuous",
        "reason": reason,
        "adminConflict": admin_conflict,
        "automaticActivationAllowed": False,
    }


def build_zone_row(feature, qa_row, area_places):
    props = feature.get("properties") or {}
    coast = project(LineString(props.get("coastLine") or []))
    tokens = current_name_tokens(props.get("name"))
    candidates = []
    for place in area_places:
        point = Point(*TO_METRES.transform(*place["visualCentre"]))
        distance = coast.distance(point)
        place_tokens = normalise(place["primaryName"]).split()
        matching_tokens = sorted(set(tokens).intersection(place_tokens))
        if distance <= MAX_CANDIDATE_DISTANCE_METRES or matching_tokens:
            candidates.append({
                **place,
                "distanceToCurrentCoastM": round(distance, 1),
                "matchingCurrentNameTokens": matching_tokens,
            })
    status_rank = {"suAutoriseret": 0, "officielt": 1, "uofficielt": 2}
    candidates.sort(key=lambda item: (
        0 if item["matchingCurrentNameTokens"] else 1,
        status_rank.get(item["nameStatus"], 9),
        item["distanceToCurrentCoastM"],
        normalise(item["primaryName"]),
    ))
    candidates = candidates[:MAX_CANDIDATES_PER_ZONE]
    matched = sorted({token for item in candidates for token in item["matchingCurrentNameTokens"]})
    named_place_distances = [
        {
            "token": token,
            "nearestOfficialName": min(
                (item for item in candidates if token in item["matchingCurrentNameTokens"]),
                key=lambda item: item["distanceToCurrentCoastM"],
            )["primaryName"],
            "distanceToCurrentCoastM": min(
                item["distanceToCurrentCoastM"] for item in candidates
                if token in item["matchingCurrentNameTokens"]
            ),
        }
        for token in matched
    ]
    geography_flags = [
        "named-place-over-10km-from-current-coast"
        for item in named_place_distances if item["distanceToCurrentCoastM"] > 10000
    ]
    return {
        "zoneId": props.get("id"),
        "currentName": props.get("name"),
        "reviewStatus": "human-name-and-boundary-review-required",
        "migrationTriage": migration_classification(qa_row),
        "currentNameTokenAudit": {
            "meaningfulTokens": tokens,
            "matchedInNearbyOfficialCandidates": matched,
            "unmatchedTokens": sorted(set(tokens) - set(matched)),
            "namedPlaceDistances": named_place_distances,
            "geographyFlags": sorted(set(geography_flags)),
            "interpretation": "Tokenmatch er kun sporbarhed; det godkender ikke automatisk det nuværende eller et nyt zonenavn.",
        },
        "officialPlaceCandidates": candidates,
        "proposedName": None,
    }


def build_output(zones, pilot, qa):
    zones_by_id = {feature.get("properties", {}).get("id"): feature for feature in zones.get("features") or []}
    qa_by_id = {row.get("zoneId"): row for row in qa.get("zones") or []}
    rows = []
    area_summaries = []
    for area in pilot.get("areas") or []:
        places, request_count = fetch_area_places(area, zones_by_id)
        for zone_id in area.get("zoneIds") or []:
            if zone_id not in zones_by_id or zone_id not in qa_by_id:
                fail(f"Navneaudit mangler centralt zoneinput eller source-QA for {zone_id}.")
            rows.append(build_zone_row(zones_by_id[zone_id], qa_by_id[zone_id], places))
        area_summaries.append({"areaId": area["id"], "officialPlaceCount": len(places), "requestCount": request_count})
    return {
        "schemaVersion": "1.0.0",
        "status": "private-read-only-name-and-migration-triage",
        "generatedAt": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
        "source": {
            "name": "Dataforsyningen steder API / Danmarks officielle stednavneregister",
            "endpoint": PLACES_URL,
            "authentication": "none",
            "retrieval": "bounded-pilot-polygons",
            "placeTypes": list(PLACE_TYPES),
        },
        "areaSummaries": area_summaries,
        "zoneCount": len(rows),
        "productionGeometryChanged": False,
        "scoreChanged": False,
        "automaticRenameAllowed": False,
        "zones": rows,
    }


def self_test():
    assert normalise("Rømø øst") == "rømø øst"
    assert current_name_tokens("Falster vest og Nysted Nor munding") == ["falster", "nysted", "nor"]
    assert migration_classification({"currentNearSourceRatio250m": 0, "currentToSourceDistance": {"maxM": 2000}, "candidateSourcePartCount": 2, "adminOverlayStatus": "preserved"})["classification"] == "semantic-relocation"
    assert migration_classification({"currentNearSourceRatio250m": 0.8, "currentToSourceDistance": {"maxM": 500}, "candidateSourcePartCount": 40, "adminOverlayStatus": "preserved"})["classification"] == "boundary-adjustment"
    print("Officiel stednavne- og migrationstriage self-test: bestået.")


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--work-dir", type=Path, default=ROOT / ".geometry-v2-work")
    parser.add_argument("--pilot-areas", type=Path, default=ROOT / "data" / "geometry-v2" / "pilot-areas.json")
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
    qa_path = work_dir / "coastal-source-qa.json"
    if not zones_path.exists() or not qa_path.exists():
        fail("Den centralt hydrerede zonebestand eller source-QA mangler.")
    output = build_output(load_json(zones_path), load_json(args.pilot_areas.resolve()), load_json(qa_path))
    (work_dir / "pilot-name-and-migration-audit.json").write_text(json.dumps(output, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"Officiel stednavne- og migrationstriage genereret read-only for {output['zoneCount']} pilotzoner.")


if __name__ == "__main__":
    main()
