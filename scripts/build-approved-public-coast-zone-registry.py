#!/usr/bin/env python3
"""Build a private parent-zone registry for the owner-approved coast candidate."""
from __future__ import annotations

import argparse
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
NEW_ZONE_IDS = ("DK-B04-12", "DK-B04-13", "DK-B04-14")
RENAMES = {"DK-B10-13": "Bredfjed", "DK-B12-07": "Mommark & Pøl Huk"}


def load(path: Path):
    return json.loads(path.read_text(encoding="utf-8"))


def geometry_lines(geometry):
    if geometry.get("type") == "LineString":
        return [geometry.get("coordinates") or []]
    if geometry.get("type") == "MultiLineString":
        return geometry.get("coordinates") or []
    raise RuntimeError(f"Ikke-understøttet geometri: {geometry.get('type')}")


def build(registry, candidate):
    output = json.loads(json.dumps(registry))
    existing = {feature["properties"]["id"]: feature for feature in output.get("features") or []}
    for zone_id, name in RENAMES.items():
        if zone_id not in existing:
            raise RuntimeError(f"Navnerettelsen mangler hovedzone {zone_id}")
        existing[zone_id]["properties"]["name"] = name

    for zone_id in NEW_ZONE_IDS:
        if zone_id in existing:
            raise RuntimeError(f"Ny hovedzone findes allerede: {zone_id}")
        parts = candidate.get("zones", {}).get(zone_id) or []
        if len(parts) != 1:
            raise RuntimeError(f"{zone_id} skal have præcis én ejer-godkendt kystdel")
        part = parts[0]
        coordinates = [point for line in geometry_lines(part["geometry"]) for point in line]
        if len(coordinates) < 2:
            raise RuntimeError(f"{zone_id} mangler kystkoordinater")
        south = min(coordinates, key=lambda point: (point[1], point[0]))
        north = max(coordinates, key=lambda point: (point[1], -point[0]))
        min_lon = min(point[0] for point in coordinates) - 0.025
        max_lon = max(point[0] for point in coordinates) + 0.045
        min_lat = min(point[1] for point in coordinates) - 0.003
        max_lat = max(point[1] for point in coordinates) + 0.003
        properties = {
            "id": zone_id,
            "name": part["name"],
            "region": "Vadehavets fastlandskyst",
            "coastType": "west",
            "onshoreDirectionDeg": part["onshoreDirectionDeg"],
            "shallowWater": True,
            "reefs": False,
            "seagrass": True,
            "dataPoint": part["waterPoint"],
            "pinPoint": part["landPoint"],
            "batch": "B04",
            "zoneStatus": "private-owner-approved",
            "coastLine": [south, north],
            "coastLineSource": "Owner-approved precise public coast candidate 2026-08-11",
            "coastLineVersion": "private-approved-public-coast-2026-08-11",
            "onshoreDirectionSource": "owner-approved land/water point pair",
            "onshoreDirectionReviewStatus": "native-dmi-grid-validated",
            "coastLineRefinementMode": "private-owner-approved-not-active",
        }
        feature = {
            "type": "Feature",
            "properties": properties,
            "geometry": {"type": "Polygon", "coordinates": [[
                [min_lon, min_lat], [max_lon, min_lat], [max_lon, max_lat],
                [min_lon, max_lat], [min_lon, min_lat],
            ]]},
        }
        output["features"].append(feature)
        existing[zone_id] = feature

    ids = [feature.get("properties", {}).get("id") for feature in output.get("features") or []]
    if len(ids) != 212 or len(set(ids)) != 212:
        raise RuntimeError(f"Privat zoneregister skal have 212 unikke hovedzoner, fik {len(ids)}/{len(set(ids))}")
    output["version"] = "private-approved-public-coast-2026-08-11"
    output["status"] = "private-owner-approved-not-active"
    output["automaticActivationAllowed"] = False
    return output


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--zones", type=Path, default=ROOT / "data/zones.geojson")
    parser.add_argument("--candidate", type=Path, default=ROOT / "data/geometry-v2/approved-public-coast-candidate-2026-08-11.json")
    parser.add_argument("--output", type=Path, default=ROOT / "data/geometry-v2/approved-public-coast-zone-registry-2026-08-11.geojson")
    args = parser.parse_args()
    result = build(load(args.zones), load(args.candidate))
    args.output.write_text(json.dumps(result, ensure_ascii=False, separators=(",", ":")) + "\n", encoding="utf-8")
    print(json.dumps({"status": result["status"], "zoneCount": len(result["features"]), "automaticActivationAllowed": False}))


if __name__ == "__main__":
    main()
