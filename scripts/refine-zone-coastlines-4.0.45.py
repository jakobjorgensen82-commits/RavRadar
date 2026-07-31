#!/usr/bin/env python3
"""Refine every active zone's score line against RavRadar's master coastline.

The master shoreline is preserved as the geometric reference. Each resulting
zone line is pulled 15 metres landward toward the existing, audited zone line,
so the visible score segment sits on the beach rather than in the water.
The script is deterministic and safe to rerun.
"""
from __future__ import annotations
import json, math
from pathlib import Path
from shapely.geometry import LineString, MultiLineString, Point
from shapely.ops import nearest_points, unary_union, transform
from pyproj import Transformer

ROOT = Path(__file__).resolve().parents[1]
ZONES_PATH = ROOT / "data/zones.geojson"
MASTER_PATH = ROOT / "data/coastline-master.geojson"
TARGET_OFFSET_M = 8.0
MAX_VERTEX_GAP_M = 120.0
VERSION = "4.0.45"


def xy(point, lat0):
    return point[0] * 111320 * math.cos(math.radians(lat0)), point[1] * 110540


def distance_m(a, b):
    lat = (a[1] + b[1]) / 2
    ax, ay = xy(a, lat); bx, by = xy(b, lat)
    return math.hypot(ax - bx, ay - by)


def projection(point, a, b):
    lat = point[1]
    px, py = xy(point, lat); ax, ay = xy(a, lat); bx, by = xy(b, lat)
    dx, dy = bx - ax, by - ay
    denominator = dx * dx + dy * dy
    t = 0.0 if denominator == 0 else max(0.0, min(1.0, ((px - ax) * dx + (py - ay) * dy) / denominator))
    x, y = ax + t * dx, ay + t * dy
    projected = [x / (111320 * math.cos(math.radians(lat))), y / 110540]
    return projected, t, math.hypot(px - x, py - y)


def nearest_on_lines(point, lines):
    best = None
    for feature_index, line in enumerate(lines):
        for segment_index in range(len(line) - 1):
            projected, t, d = projection(point, line[segment_index], line[segment_index + 1])
            candidate = (d, feature_index, segment_index, t, projected)
            if best is None or candidate[0] < best[0]:
                best = candidate
    return best


def nearest_on_polyline(point, line):
    best = None
    for i in range(len(line) - 1):
        projected, _, d = projection(point, line[i], line[i + 1])
        if best is None or d < best[0]:
            best = (d, projected)
    return best


def line_length(line):
    return sum(distance_m(a, b) for a, b in zip(line, line[1:]))


def densify(line, max_gap=MAX_VERTEX_GAP_M):
    output = [line[0]]
    for a, b in zip(line, line[1:]):
        length = distance_m(a, b)
        steps = max(1, math.ceil(length / max_gap))
        for step in range(1, steps + 1):
            fraction = step / steps
            output.append([a[0] + (b[0] - a[0]) * fraction, a[1] + (b[1] - a[1]) * fraction])
    return output


def deduplicate(line):
    output = []
    for point in line:
        rounded = [round(point[0], 6), round(point[1], 6)]
        if not output or distance_m(output[-1], rounded) > 0.5:
            output.append(rounded)
    return output


def extract_master_path(existing, lines):
    start = nearest_on_lines(existing[0], lines)
    end = nearest_on_lines(existing[-1], lines)
    if start[1] != end[1]:
        return None
    master = lines[start[1]]
    start_i, end_i = start[2], end[2]
    if start_i <= end_i:
        path = [start[4], *master[start_i + 1:end_i + 1], end[4]]
    else:
        path = [start[4], *reversed(master[end_i + 1:start_i + 1]), end[4]]
    path = deduplicate(path)
    ratio = line_length(path) / max(1.0, line_length(existing))
    return path if len(path) >= 2 and 0.45 <= ratio <= 2.2 else None


def refine_against_master(existing, master_geometry_m, to_m, to_lonlat):
    output = []
    for point in densify(existing):
        sample_m = Point(*to_m.transform(point[0], point[1]))
        shoreline_m = nearest_points(sample_m, master_geometry_m)[1]
        dx, dy = sample_m.x - shoreline_m.x, sample_m.y - shoreline_m.y
        distance = math.hypot(dx, dy)
        fraction = min(1.0, TARGET_OFFSET_M / distance) if distance > 0 else 0.0
        beach_x = shoreline_m.x + dx * fraction
        beach_y = shoreline_m.y + dy * fraction
        lon, lat = to_lonlat.transform(beach_x, beach_y)
        output.append([lon, lat])
    result = deduplicate(output)
    if len(result) >= 2 and all(distance_m(a, b) <= 200 for a, b in zip(result, result[1:])):
        return result, "master-snapped"

    # Safety fallback for narrow islands/fjords where a global nearest-line
    # query can jump to the opposite shore. Snap only the existing audited
    # vertices, preserving their topology, then densify the safe path.
    safe = []
    for point in existing:
        sample_m = Point(*to_m.transform(point[0], point[1]))
        shoreline_m = nearest_points(sample_m, master_geometry_m)[1]
        dx, dy = sample_m.x - shoreline_m.x, sample_m.y - shoreline_m.y
        distance = math.hypot(dx, dy)
        fraction = min(1.0, TARGET_OFFSET_M / distance) if distance > 0 else 0.0
        lon, lat = to_lonlat.transform(shoreline_m.x + dx * fraction, shoreline_m.y + dy * fraction)
        safe.append([lon, lat])
    safe = deduplicate(safe)
    if len(safe) >= 2 and all(distance_m(a, b) <= 5000 for a, b in zip(safe, safe[1:])):
        return densify(safe, MAX_VERTEX_GAP_M), "audited-vertex-fallback"
    return densify(existing, MAX_VERTEX_GAP_M), "audited-existing-fallback"


def main():
    zones = json.loads(ZONES_PATH.read_text(encoding="utf-8"))
    master = json.loads(MASTER_PATH.read_text(encoding="utf-8"))
    lines = [feature["geometry"]["coordinates"] for feature in master["features"] if feature.get("geometry", {}).get("type") == "LineString"]
    to_m = Transformer.from_crs("EPSG:4326", "EPSG:25832", always_xy=True)
    to_lonlat = Transformer.from_crs("EPSG:25832", "EPSG:4326", always_xy=True)
    master_geometry = unary_union([LineString(line) for line in lines])
    master_geometry_m = transform(to_m.transform, master_geometry)
    refined = fallback = 0
    for feature in zones.get("features", []):
        properties = feature.get("properties", {})
        existing = properties.get("coastLine")
        if properties.get("zoneStatus") != "active" or not isinstance(existing, list) or len(existing) < 2:
            continue
        # Local snapping is deliberately used for every zone. It follows the
        # nearest master shoreline at short intervals and avoids selecting the
        # long way around closed island/coastline rings.
        fallback += 1
        refined_line, refinement_mode = refine_against_master(existing, master_geometry_m, to_m, to_lonlat)
        properties["coastLine"] = refined_line
        properties["coastLineRefinementMode"] = refinement_mode
        properties["coastLineSource"] = ("RavRadar master coastline; detailed shoreline path with 8 m audited landward beach offset" if refinement_mode == "master-snapped" else "Existing audited RavRadar coastline retained where master coastline coverage is insufficient")
        properties["coastLineVersion"] = VERSION
        properties["coastLineRefinedAt"] = "2026-07-31"
    ZONES_PATH.write_text(json.dumps(zones, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"Refined {fallback} zones with local master snapping.")


if __name__ == "__main__":
    main()
