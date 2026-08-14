#!/usr/bin/env python3
"""Build a private active-bundle candidate with audited local point-pair repairs."""
from __future__ import annotations

import argparse
import copy
import hashlib
import json
import math
from pathlib import Path

from pyproj import Transformer
from shapely.geometry import LineString, Point, shape
from shapely.ops import transform

ROOT = Path(__file__).resolve().parents[1]
TO_M = Transformer.from_crs(4326, 25832, always_xy=True).transform
TO_W = Transformer.from_crs(25832, 4326, always_xy=True).transform
FILES = ("coastal-parts.geojson", "part-names.json", "point-pairs.json", "dmi-grid-proof.json")


def load(path: Path):
    return json.loads(path.read_text(encoding="utf-8"))


def write(path: Path, value, pretty=False):
    text = json.dumps(value, ensure_ascii=False, indent=2 if pretty else None, separators=None if pretty else (",", ":")) + "\n"
    path.write_text(text, encoding="utf-8")
    return hashlib.sha256(text.encode()).hexdigest()


def lines(geometry):
    if geometry.geom_type in {"LineString", "LinearRing"}:
        return [LineString(geometry.coords)]
    if geometry.geom_type in {"MultiLineString", "GeometryCollection"}:
        return [line for child in geometry.geoms for line in lines(child)]
    return []


def lonlat(point: Point):
    return [round(value, 7) for value in TO_W(point.x, point.y)]


def repaired_pair(geometry, old_land, old_water, land_offset=60, water_offset=250, window=50):
    projected = transform(TO_M, geometry)
    old_land_m = Point(*TO_M(*old_land))
    old_water_m = Point(*TO_M(*old_water))
    old_mid = Point((old_land_m.x + old_water_m.x) / 2, (old_land_m.y + old_water_m.y) / 2)
    line = min(lines(projected), key=lambda candidate: candidate.distance(old_mid))
    distance = line.project(old_mid)
    middle = line.interpolate(distance)
    before = line.interpolate(max(0, distance - window))
    after = line.interpolate(min(line.length, distance + window))
    dx, dy = after.x - before.x, after.y - before.y
    length = max(math.hypot(dx, dy), 0.001)
    normal = (-dy / length, dx / length)
    old_vector = (old_land_m.x - old_water_m.x, old_land_m.y - old_water_m.y)
    alignment = old_vector[0] * normal[0] + old_vector[1] * normal[1]
    if abs(alignment) < 1:
        raise RuntimeError("Existing land/water evidence is perpendicular-ambiguous")
    sign = 1 if alignment > 0 else -1
    land = Point(middle.x + sign * normal[0] * land_offset, middle.y + sign * normal[1] * land_offset)
    water = Point(middle.x - sign * normal[0] * water_offset, middle.y - sign * normal[1] * water_offset)
    direction = round((90 - math.degrees(math.atan2(land.y - water.y, land.x - water.x))) % 360, 1)
    return lonlat(middle), lonlat(land), lonlat(water), direction, round(old_mid.distance(middle), 1)


def build(active: Path, audit: dict, output: Path):
    output.mkdir(parents=True, exist_ok=True)
    coast = load(active / "coastal-parts.geojson")
    names = load(active / "part-names.json")
    points = load(active / "point-pairs.json")
    grid = load(active / "dmi-grid-proof.json")
    coast_by_id = {feature["properties"].get("finalPartId") or feature["properties"].get("partId"): feature for feature in coast["features"]}
    point_by_id = {row["finalPartId"]: row for row in points["parts"]}
    repairs = []
    for issue in audit["parts"]:
        part_id = issue["partId"]
        row = point_by_id[part_id]
        reference, land, water, direction, moved = repaired_pair(shape(coast_by_id[part_id]["geometry"]), row["landPoint"], row["waterPoint"])
        row.update({
            "coastReferencePoint": reference,
            "landPoint": land,
            "waterPoint": water,
            "onshoreDirectionDeg": direction,
            "status": "private-point-pair-repaired",
            "repairReason": "local-tangent-and-nearest-fragment-audit-4.0.193",
            "previousPointMidpointMovedM": moved,
            "weatherSamplingEnabled": False,
            "scoreEnabled": False,
            "automaticActivationAllowed": False,
        })
        repairs.append({"zoneId": issue["zoneId"], "finalPartId": part_id, "name": issue["name"], "normalErrorBeforeDeg": issue["normalErrorDeg"], "oldCoastReferenceDistanceM": issue["coastReferenceDistanceFromNearestCoastM"], "newOnshoreDirectionDeg": direction, "coastReferencePoint": reference, "landPoint": land, "waterPoint": water})
    manifest = copy.deepcopy(load(active / "manifest.json"))
    documents = {"coastal-parts.geojson": coast, "part-names.json": names, "point-pairs.json": points, "dmi-grid-proof.json": grid}
    digests = {name: write(output / name, value) for name, value in documents.items()}
    manifest.update({
        "status": "private-local-part-point-repair-candidate",
        "sourceVersion": "4.0.193-private",
        "files": digests,
        "publicActivation": False,
        "automaticActivationAllowed": False,
        "rollback": {"method": "discard private candidate; active package remains unchanged"},
    })
    write(output / "manifest.json", manifest, True)
    repaired_ids = {row["finalPartId"] for row in repairs}
    dmi_rows = []
    for row in points["parts"]:
        if row["finalPartId"] not in repaired_ids:
            continue
        dmi_rows.append({**row, "status": "private-point-pair-proposed", "automaticActivationAllowed": False})
    write(output / "dmi-validation-input.json", {"schemaVersion": "1.0.0", "status": "private-point-repair-dmi-validation-input", "parts": dmi_rows, "automaticActivationAllowed": False}, True)
    report = {"schemaVersion": 1, "status": "private-local-part-point-repair-candidate", "repairCount": len(repairs), "repairs": repairs, "productionGeometryChanged": False, "adminDataChanged": False, "weatherSamplingChanged": False, "scoreChanged": False, "automaticActivationAllowed": False}
    write(output / "repair-report.json", report, True)
    return report


def self_test():
    geometry = shape({"type": "LineString", "coordinates": [[10, 55], [10.03, 55]]})
    _, land, water, direction, _ = repaired_pair(geometry, [10.015, 55.002], [10.015, 54.998])
    if not (land[1] > water[1] and min(direction, 360 - direction) < 1):
        raise RuntimeError("Repair did not preserve documented land side")
    print("Local point repair candidate self-test: bestået.")


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--active", type=Path, default=ROOT / "data/geometry-v2/active-national-coastal-parts")
    parser.add_argument("--audit", type=Path, default=ROOT / "data/diagnostics/local-part-point-audit-4.0.193.json")
    parser.add_argument("--output", type=Path, default=ROOT / ".owner-review/local-part-system-audit/point-repair-candidate")
    parser.add_argument("--self-test", action="store_true")
    args = parser.parse_args()
    if args.self_test:
        self_test()
        return
    report = build(args.active, load(args.audit), args.output)
    print(json.dumps({"repairCount": report["repairCount"], "publicActivation": False}))


if __name__ == "__main__":
    main()
