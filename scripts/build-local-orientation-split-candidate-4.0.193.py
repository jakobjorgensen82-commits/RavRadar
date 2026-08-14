#!/usr/bin/env python3
"""Build a private, conservative candidate for locally under-segmented coasts."""
from __future__ import annotations

import argparse
import json
import math
from pathlib import Path

from pyproj import Transformer
from shapely.geometry import LineString, Point, Polygon, shape, mapping
from shapely.ops import linemerge, substring, transform

ROOT = Path(__file__).resolve().parents[1]
TO_M = Transformer.from_crs(4326, 25832, always_xy=True).transform
TO_W = Transformer.from_crs(25832, 4326, always_xy=True).transform


def load(path: Path):
    return json.loads(path.read_text(encoding="utf-8"))


def write(path: Path, value, pretty=False):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(value, ensure_ascii=False, indent=2 if pretty else None, separators=None if pretty else (",", ":")) + "\n", encoding="utf-8")


def lines(geometry):
    if geometry.geom_type in {"LineString", "LinearRing"}:
        return [LineString(geometry.coords)]
    if geometry.geom_type in {"MultiLineString", "GeometryCollection"}:
        return [line for child in geometry.geoms for line in lines(child)]
    return []


def axial_difference(a, b):
    return abs(((a - b + 270) % 180) - 90)


def bearing(a: Point, b: Point):
    return (90 - math.degrees(math.atan2(b.y - a.y, b.x - a.x))) % 360


def mean_axial(values):
    x = sum(math.cos(math.radians(value * 2)) for value in values)
    y = sum(math.sin(math.radians(value * 2)) for value in values)
    return math.degrees(math.atan2(y, x)) / 2 % 180


def tangent_bearing(line, position, window=450):
    return bearing(line.interpolate(max(0, position - window)), line.interpolate(min(line.length, position + window)))


def split_regimes(line, step=300, min_length=1500, threshold=40, persistence=3):
    if line.length < min_length * 2:
        return [line]
    positions = [min(line.length, value) for value in range(step, int(line.length), step)]
    bearings = [tangent_bearing(line, position) for position in positions]
    boundaries, start_index, index = [], 0, 0
    while index < len(positions):
        baseline = mean_axial(bearings[start_index:max(start_index + 1, index)])
        run = 0
        while index + run < len(positions) and axial_difference(bearings[index + run], baseline) >= threshold:
            run += 1
        if run >= persistence:
            boundary = positions[index]
            previous = boundaries[-1] if boundaries else 0
            if boundary - previous >= min_length and line.length - boundary >= min_length:
                boundaries.append(boundary)
                start_index = index
                index += persistence
                continue
        index += 1
    cuts = [0, *boundaries, line.length]
    return [substring(line, cuts[i], cuts[i + 1]) for i in range(len(cuts) - 1) if cuts[i + 1] - cuts[i] >= min_length]


def lonlat(point: Point):
    return [round(value, 7) for value in TO_W(point.x, point.y)]


def part_polygon(line):
    coordinates = list(line.coords)
    if len(coordinates) < 3 or Point(coordinates[0]).distance(Point(coordinates[-1])) < 5:
        return None
    polygon = Polygon([*coordinates, coordinates[0]])
    return polygon if polygon.is_valid and polygon.area > 1000 else None


def local_pair(segment, old_land, old_water, parent_polygon, land_offset=60, water_offset=250):
    middle_distance = segment.length * 0.5
    middle = segment.interpolate(middle_distance)
    before = segment.interpolate(max(0, middle_distance - 50))
    after = segment.interpolate(min(segment.length, middle_distance + 50))
    dx, dy = after.x - before.x, after.y - before.y
    length = max(math.hypot(dx, dy), 0.001)
    normal = (-dy / length, dx / length)
    old_land_m, old_water_m = Point(*TO_M(*old_land)), Point(*TO_M(*old_water))
    old_land_inside = parent_polygon.contains(old_land_m) if parent_polygon else None
    old_water_inside = parent_polygon.contains(old_water_m) if parent_polygon else None
    candidates = []
    for sign in (1, -1):
        land = Point(middle.x + sign * normal[0] * land_offset, middle.y + sign * normal[1] * land_offset)
        water = Point(middle.x - sign * normal[0] * water_offset, middle.y - sign * normal[1] * water_offset)
        polygon_match = parent_polygon is not None and old_land_inside != old_water_inside and parent_polygon.contains(land) == old_land_inside and parent_polygon.contains(water) == old_water_inside
        vector = (old_land_m.x - old_water_m.x, old_land_m.y - old_water_m.y)
        alignment = sign * (vector[0] * normal[0] + vector[1] * normal[1])
        candidates.append((int(polygon_match), alignment, land, water))
    candidates.sort(key=lambda row: (row[0], row[1]), reverse=True)
    polygon_match, alignment, land, water = candidates[0]
    if not polygon_match and alignment < 30:
        return None
    onshore = round((90 - math.degrees(math.atan2(land.y - water.y, land.x - water.x))) % 360, 1)
    return lonlat(middle), lonlat(land), lonlat(water), onshore, "closed-parent-coast-land-side" if polygon_match else "existing-point-side-projection"


def direction_label(segment, parent_centroid):
    centroid = segment.centroid
    dx, dy = centroid.x - parent_centroid.x, centroid.y - parent_centroid.y
    if abs(dx) >= abs(dy):
        return "østkyst" if dx > 0 else "vestkyst"
    return "nordkyst" if dy > 0 else "sydkyst"


def build(coast, points, orientation):
    zone_counts = {}
    for feature in coast["features"]:
        zone_id = feature["properties"].get("zoneId")
        zone_counts[zone_id] = zone_counts.get(zone_id, 0) + 1
    # Multi-part zones already expose local differences. The urgent systemic
    # defect is a parent zone represented by one turning coast and therefore
    # forced to one score (for example Helgenæs). Keep this repair conservative.
    flagged = {row["partId"] for row in orientation.get("flaggedParts") or [] if row["maxAxialDifferenceDeg"] >= 45 and zone_counts.get(row["zoneId"]) == 1}
    point_by_id = {row["finalPartId"]: row for row in points["parts"]}
    output_features, output_points, replacements, blocked = [], [], [], []
    for feature in coast["features"]:
        properties = feature["properties"]
        part_id = properties.get("finalPartId") or properties.get("partId")
        point = point_by_id[part_id]
        projected = transform(TO_M, shape(feature["geometry"]))
        merged = projected if projected.geom_type in {"LineString", "LinearRing"} else linemerge(projected)
        merged_lines = lines(merged)
        segments = [segment for line in merged_lines for segment in split_regimes(line)] if part_id in flagged else []
        if len(segments) <= len(merged_lines) or len(segments) <= 1:
            output_features.append(feature)
            output_points.append(point)
            continue
        parent_line = max(merged_lines, key=lambda line: line.length)
        polygon = part_polygon(parent_line)
        new_rows, new_features = [], []
        labels = {}
        for index, segment in enumerate(segments, 1):
            pair = local_pair(segment, point["landPoint"], point["waterPoint"], polygon)
            if pair is None:
                blocked.append({"zoneId": properties["zoneId"], "partId": part_id, "reason": "AMBIGUOUS_LOCAL_LAND_SIDE", "segment": index})
                new_rows = []
                break
            reference, land, water, onshore, source = pair
            label = direction_label(segment, projected.centroid)
            labels[label] = labels.get(label, 0) + 1
            suffix = f" {labels[label]}" if labels[label] > 1 else ""
            new_id = f"{part_id}-orientation-{index:02d}"
            new_features.append({"type": "Feature", "properties": {**properties, "partId": new_id, "finalPartId": new_id, "sourcePartId": part_id, "orientationSplitCandidate": True}, "geometry": mapping(transform(TO_W, segment))})
            new_rows.append({**point, "finalPartId": new_id, "sourcePartId": part_id, "suggestedName": f"{point.get('suggestedName') or part_id} – {label}{suffix}", "coastReferencePoint": reference, "landPoint": land, "waterPoint": water, "onshoreDirectionDeg": onshore, "status": "private-orientation-split-point-proposed", "pointWitnessSource": source, "weatherSamplingEnabled": False, "scoreEnabled": False, "automaticActivationAllowed": False})
        if not new_rows:
            output_features.append(feature)
            output_points.append(point)
            continue
        output_features.extend(new_features)
        output_points.extend(new_rows)
        replacements.append({"zoneId": properties["zoneId"], "sourcePartId": part_id, "newPartIds": [row["finalPartId"] for row in new_rows], "newPartCount": len(new_rows)})
    return ({**coast, "features": output_features, "automaticActivationAllowed": False}, {**points, "parts": output_points, "finalPartCount": len(output_points), "automaticActivationAllowed": False}, replacements, blocked)


def render_zone(coast, points, zone_id, output):
    from PIL import Image, ImageDraw, ImageFont

    features = [feature for feature in coast["features"] if feature["properties"].get("zoneId") == zone_id]
    point_by_id = {row["finalPartId"]: row for row in points["parts"]}
    coordinates = [point for feature in features for line in lines(shape(feature["geometry"])) for point in line.coords]
    if not coordinates:
        return
    min_x, min_y, max_x, max_y = shape({"type": "MultiPoint", "coordinates": coordinates}).bounds
    width, height, pad = 1200, 1000, 80
    scale = min((width - pad * 2) / max(max_x - min_x, .0001), (height - pad * 2) / max(max_y - min_y, .0001))
    def px(point): return (pad + (point[0] - min_x) * scale, height - pad - (point[1] - min_y) * scale)
    image = Image.new("RGB", (width, height), "#eaf4f5")
    draw = ImageDraw.Draw(image)
    font = ImageFont.load_default(size=17)
    colours = ("#1464a0", "#d47319", "#6f42c1", "#168a50", "#bd2745", "#795548")
    for index, feature in enumerate(features):
        part_id = feature["properties"].get("finalPartId") or feature["properties"].get("partId")
        point = point_by_id[part_id]
        colour = colours[index % len(colours)]
        for line in lines(shape(feature["geometry"])):
            draw.line([px(value) for value in line.coords], fill=colour, width=8, joint="curve")
        land, water = px(point["landPoint"]), px(point["waterPoint"])
        draw.line((water, land), fill="#cf3131", width=3)
        draw.ellipse((land[0]-7,land[1]-7,land[0]+7,land[1]+7),fill="#159447")
        draw.ellipse((water[0]-7,water[1]-7,water[0]+7,water[1]+7),fill="#246ed0")
        anchor = px(list(shape(feature["geometry"]).centroid.coords)[0])
        draw.text((anchor[0]+8,anchor[1]-9), point.get("suggestedName") or part_id, fill=colour, font=font)
    draw.text((25, 20), f"Privat orienteringskandidat · {zone_id} · {len(features)} kystdele", fill="#111", font=ImageFont.load_default(size=24))
    output.parent.mkdir(parents=True, exist_ok=True)
    image.save(output)


def self_test():
    line = LineString([(0, 0), (3000, 0), (3000, 3000)])
    parts = split_regimes(line, threshold=35)
    if len(parts) < 2:
        raise RuntimeError("Sustained right-angle coast was not split")
    straight = split_regimes(LineString([(0, 0), (6000, 0)]), threshold=35)
    if len(straight) != 1:
        raise RuntimeError("Straight coast was split")
    print("Local orientation split self-test: bestået.")


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--active", type=Path, default=ROOT / "data/geometry-v2/active-national-coastal-parts")
    parser.add_argument("--orientation", type=Path, default=ROOT / "data/diagnostics/local-part-orientation-audit-4.0.193.json")
    parser.add_argument("--output", type=Path, default=ROOT / ".owner-review/local-part-system-audit/orientation-split-candidate")
    parser.add_argument("--review-zone", default="DK-B06-09")
    parser.add_argument("--self-test", action="store_true")
    args = parser.parse_args()
    if args.self_test:
        self_test()
        return
    source_points = load(args.active / "point-pairs.json")
    coast, points, replacements, blocked = build(load(args.active / "coastal-parts.geojson"), source_points, load(args.orientation))
    args.output.mkdir(parents=True, exist_ok=True)
    write(args.output / "coastal-parts.geojson", coast)
    write(args.output / "point-pairs.json", points)
    replaced_ids = {row["sourcePartId"] for row in replacements}
    new_ids = {part_id for row in replacements for part_id in row["newPartIds"]}
    changed_ids = new_ids | {row["finalPartId"] for row in points["parts"] if row.get("status") == "private-point-pair-repaired"}
    if (args.active / "part-names.json").exists():
        names = load(args.active / "part-names.json")
        names["parts"] = [row for row in names["parts"] if row.get("finalPartId") not in replaced_ids]
        names["parts"].extend({"finalPartId": row["finalPartId"], "zoneId": row["zoneId"], "suggestedName": row["suggestedName"], "sourcePartId": row["sourcePartId"]} for row in points["parts"] if row["finalPartId"] in new_ids)
        names["finalPartCount"] = len(points["parts"])
        names["automaticActivationAllowed"] = False
        write(args.output / "part-names.json", names)
    if (args.active / "dmi-grid-proof.json").exists():
        grid = load(args.active / "dmi-grid-proof.json")
        grid["parts"] = [row for row in grid["parts"] if row.get("finalPartId") not in replaced_ids and row.get("finalPartId") not in changed_ids]
        grid["finalPartCount"] = len(points["parts"])
        grid["status"] = "private-incomplete-pending-changed-point-validation"
        grid["automaticActivationAllowed"] = False
        write(args.output / "dmi-grid-proof.json", grid)
    dmi_rows = [{**row, "status": "private-point-pair-proposed", "automaticActivationAllowed": False} for row in points["parts"] if row["finalPartId"] in changed_ids]
    write(args.output / "dmi-validation-input.json", {"schemaVersion": "1.0.0", "status": "private-combined-candidate-dmi-validation-input", "parts": dmi_rows, "automaticActivationAllowed": False}, True)
    if (args.active / "manifest.json").exists():
        manifest = load(args.active / "manifest.json")
        manifest.update({"status": "private-local-orientation-and-point-repair-candidate", "sourceVersion": "4.0.193-private", "partCount": len(points["parts"]), "publicActivation": False, "automaticActivationAllowed": False, "rollback": {"method": "discard private candidate; active production bundle remains unchanged"}})
        write(args.output / "manifest.json", manifest, True)
    render_zone(coast, points, args.review_zone, args.output / f"{args.review_zone}-review.png")
    for row in replacements:
        render_zone(coast, points, row["zoneId"], args.output / "zone-reviews" / f"{row['zoneId']}.png")
    report = {"schemaVersion": 1, "status": "private-orientation-split-candidate", "sourcePartCount": 651, "candidatePartCount": len(points["parts"]), "replacementCount": len(replacements), "blockedCount": len(blocked), "replacements": replacements, "blocked": blocked, "productionGeometryChanged": False, "adminDataChanged": False, "weatherSamplingChanged": False, "scoreChanged": False, "automaticActivationAllowed": False}
    write(args.output / "report.json", report, True)
    print(json.dumps({key: report[key] for key in ("candidatePartCount", "replacementCount", "blockedCount")}))


if __name__ == "__main__":
    main()
