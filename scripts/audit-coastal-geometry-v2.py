#!/usr/bin/env python3
"""Read-only baseline audit for RavRadar coastal geometry v2.

The script never mutates zones or admin data. Geometry is measured in EPSG:25832.
"""
from __future__ import annotations

import argparse
import json
import math
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def bearing_deg(start, end):
    lon1, lat1, lon2, lat2 = map(math.radians, (*start, *end))
    value = math.degrees(math.atan2(
        math.sin(lon2 - lon1) * math.cos(lat2),
        math.cos(lat1) * math.sin(lat2) - math.sin(lat1) * math.cos(lat2) * math.cos(lon2 - lon1),
    ))
    return value % 360


def angle_difference(a, b):
    return abs(((a - b + 540) % 360) - 180)


def bounds_intersect(left, right):
    lminx, lminy, lmaxx, lmaxy = left.bounds
    rminx, rminy, rmaxx, rmaxy = right.bounds
    return not (lmaxx < rminx or rmaxx < lminx or lmaxy < rminy or rmaxy < lminy)


def load_geometry_runtime():
    try:
        from pyproj import Transformer
        from shapely.geometry import LineString, shape
        from shapely.ops import transform
    except ImportError as exc:
        raise SystemExit(
            "Geometriaudit kræver de gratis pakker i requirements-geometry.txt "
            "(shapely og pyproj)."
        ) from exc
    transformer = Transformer.from_crs("EPSG:4326", "EPSG:25832", always_xy=True)
    return LineString, shape, lambda geometry: transform(transformer.transform, geometry)


def audit(zones_path):
    LineString, shape, project = load_geometry_runtime()
    collection = json.loads(zones_path.read_text(encoding="utf-8"))
    features = [f for f in collection.get("features", []) if f.get("properties", {}).get("zoneStatus") == "active"]
    rows = []
    polygons = []
    source_counts = Counter()
    refinement_counts = Counter()
    multi_anchor_count = 0

    for feature in features:
        props = feature.get("properties", {})
        zone_id = props.get("id")
        source_counts[str(props.get("coastLineSource") or "missing")] += 1
        refinement_counts[str(props.get("coastLineRefinementMode") or "missing")] += 1
        anchors = props.get("directionAnchors") if isinstance(props.get("directionAnchors"), list) else []
        if len(anchors) > 1:
            multi_anchor_count += 1
        flags = []
        line_coords = props.get("coastLine") or []
        polygon = project(shape(feature.get("geometry")))
        polygons.append((zone_id, polygon))
        line = project(LineString(line_coords)) if len(line_coords) >= 2 else None
        inside_ratio = None
        if line and line.length:
            inside_ratio = line.intersection(polygon).length / line.length
            if inside_ratio < 0.9:
                flags.append("coastline-less-than-90-percent-in-own-zone")
        else:
            flags.append("missing-coastline")
        point_bearing = None
        if isinstance(props.get("dataPoint"), list) and isinstance(props.get("pinPoint"), list):
            point_bearing = bearing_deg(props["dataPoint"], props["pinPoint"])
            if angle_difference(float(props.get("onshoreDirectionDeg", 0)), point_bearing) > 45:
                flags.append("direction-vs-points-over-45-deg")
        rows.append({
            "zoneId": zone_id,
            "name": props.get("name"),
            "coastType": props.get("coastType"),
            "coastLinePoints": len(line_coords),
            "coastLineLengthKm": round(line.length / 1000, 3) if line else None,
            "coastInsideOwnPolygonRatio": round(inside_ratio, 6) if inside_ratio is not None else None,
            "directionAnchorCount": len(anchors) or 1,
            "pointBearingDeg": round(point_bearing, 1) if point_bearing is not None else None,
            "qualityFlags": flags,
        })

    overlaps = []
    for index, (left_id, left) in enumerate(polygons):
        if left.is_empty or not left.is_valid:
            continue
        for right_id, right in polygons[index + 1:]:
            if right.is_empty or not right.is_valid or not bounds_intersect(left, right):
                continue
            area = left.intersection(right).area
            if area <= 10_000:
                continue
            smaller = min(left.area, right.area)
            overlaps.append({
                "leftZoneId": left_id,
                "rightZoneId": right_id,
                "areaKm2": round(area / 1_000_000, 4),
                "percentOfSmaller": round(100 * area / smaller, 2) if smaller else None,
            })
    overlaps.sort(key=lambda row: row["areaKm2"], reverse=True)
    flagged = [row for row in rows if row["qualityFlags"]]
    try:
        source_label = str(zones_path.relative_to(ROOT)).replace("\\", "/")
    except ValueError:
        source_label = f"external:{zones_path.name}"
    return {
        "schemaVersion": "1.0.0",
        "mode": "read-only-baseline",
        "source": source_label,
        "activeZoneCount": len(features),
        "multiAnchorZoneCount": multi_anchor_count,
        "coastLineSourceCounts": dict(source_counts),
        "refinementModeCounts": dict(refinement_counts),
        "flaggedZoneCount": len(flagged),
        "overlapPairCountAbove001Km2": len(overlaps),
        "largestOverlaps": overlaps[:50],
        "zones": rows,
        "limitations": [
            "Navne er ikke valideret mod Danske Stednavne i denne baseline.",
            "Fjord-, havne- og å-eksklusion kræver v2-kildelag og kan ikke udledes sikkert af de nuværende zoner alene.",
            "Auditten ændrer ingen produktions- eller administratordata.",
        ],
    }


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--zones", type=Path, default=ROOT / "data" / "zones.geojson")
    parser.add_argument("--output", type=Path)
    parser.add_argument("--self-test", action="store_true")
    args = parser.parse_args()
    if args.self_test:
        assert round(bearing_deg([10, 55], [10, 56])) == 0
        assert round(bearing_deg([10, 55], [11, 55])) == 90
        assert angle_difference(350, 10) == 20
        print("Kystgeometri-v2 audit self-test: bestået.")
        return
    result = audit(args.zones.resolve())
    payload = json.dumps(result, ensure_ascii=False, indent=2) + "\n"
    if args.output:
        target = args.output.resolve()
        if ROOT not in target.parents:
            raise SystemExit("Output skal ligge i RavRadar-workspace.")
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_text(payload, encoding="utf-8")
    else:
        print(payload, end="")


if __name__ == "__main__":
    main()
