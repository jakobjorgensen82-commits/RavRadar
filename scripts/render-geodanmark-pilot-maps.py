#!/usr/bin/env python3
"""Render private review maps for GeoDanmark coastal source QA."""
from __future__ import annotations

import argparse
import json
from pathlib import Path

from pyproj import Transformer
from shapely.geometry import shape
from shapely.ops import transform

ROOT = Path(__file__).resolve().parents[1]
PROJECT = Transformer.from_crs("EPSG:4326", "EPSG:25832", always_xy=True)
WIDTH = 1800
HEIGHT = 1200
MARGIN = 70


def load(path):
    return json.loads(path.read_text(encoding="utf-8"))


def projected(geometry):
    return transform(PROJECT.transform, shape(geometry))


def line_parts(geometry):
    if geometry.is_empty:
        return []
    if geometry.geom_type in {"LineString", "LinearRing"}:
        return [geometry]
    if geometry.geom_type in {"MultiLineString", "GeometryCollection"}:
        return [part for child in geometry.geoms for part in line_parts(child)]
    if geometry.geom_type == "Polygon":
        return [geometry.exterior, *geometry.interiors]
    if geometry.geom_type == "MultiPolygon":
        return [part for child in geometry.geoms for part in line_parts(child)]
    return []


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--work-dir", type=Path, default=ROOT / ".geometry-v2-work")
    parser.add_argument("--pilot-areas", type=Path, default=ROOT / "data" / "geometry-v2" / "pilot-areas.json")
    parser.add_argument("--self-test", action="store_true")
    args = parser.parse_args()
    if args.self_test:
        assert line_parts(shape({"type": "LineString", "coordinates": [[10, 55], [11, 55]]}))
        print("GeoDanmark pilotkort self-test: bestået.")
        return
    from PIL import Image, ImageDraw, ImageFont

    work_dir = args.work_dir.resolve()
    zones = load(work_dir / "effective-pilot-zones.geojson")
    qa_map = load(work_dir / "coastal-source-qa.geojson")
    proposal_path = work_dir / "coastal-part-proposals.geojson"
    proposals = load(proposal_path) if proposal_path.exists() else {"features": []}
    pilot_areas = load(args.pilot_areas.resolve())
    zone_by_id = {feature["properties"]["id"]: feature for feature in zones.get("features", [])}
    qa_by_zone = {}
    for feature in qa_map.get("features", []):
        qa_by_zone.setdefault(feature["properties"]["zoneId"], []).append(feature)
    proposals_by_zone = {}
    for feature in proposals.get("features", []):
        proposals_by_zone.setdefault(feature["properties"]["zoneId"], []).append(feature)
    output_dir = work_dir / "maps"
    output_dir.mkdir(parents=True, exist_ok=True)
    font = ImageFont.load_default()
    for area in pilot_areas.get("areas") or []:
        zone_ids = area.get("zoneIds") or []
        polygons = [projected(zone_by_id[zone_id]["geometry"]) for zone_id in zone_ids]
        minx = min(geometry.bounds[0] for geometry in polygons)
        miny = min(geometry.bounds[1] for geometry in polygons)
        maxx = max(geometry.bounds[2] for geometry in polygons)
        maxy = max(geometry.bounds[3] for geometry in polygons)
        scale = min((WIDTH - 2 * MARGIN) / max(maxx - minx, 1), (HEIGHT - 2 * MARGIN) / max(maxy - miny, 1))

        def pixel(point):
            x, y = point[:2]
            return (MARGIN + (x - minx) * scale, HEIGHT - MARGIN - (y - miny) * scale)

        image = Image.new("RGB", (WIDTH, HEIGHT), "white")
        draw = ImageDraw.Draw(image)
        draw.text((20, 16), f"RavRadar private GeoDanmark source-QA: {area['id']}", fill="#111111", font=font)
        draw.text((20, 34), "Grå: zone · Rød: nuværende kyst · Blå: GeoDanmark-kandidat · Grøn/lilla: land-/vandanker", fill="#333333", font=font)
        for zone_id, polygon in zip(zone_ids, polygons):
            for ring in line_parts(polygon):
                points = [pixel(point) for point in ring.coords]
                draw.polygon(points, fill="#eeeeee", outline="#777777")
            props = zone_by_id[zone_id]["properties"]
            centroid = polygon.centroid
            draw.text(pixel((centroid.x, centroid.y)), f"{zone_id} {props.get('name')}", fill="#111111", font=font, stroke_width=2, stroke_fill="white")
            for feature in qa_by_zone.get(zone_id, []):
                geometry = projected(feature["geometry"])
                kind = feature["properties"].get("kind")
                colour = "#d62728" if kind == "current-coast" else "#1769aa"
                width = 4 if kind == "current-coast" else 2
                for line in line_parts(geometry):
                    points = [pixel(point) for point in line.coords]
                    if len(points) >= 2:
                        draw.line(points, fill=colour, width=width)
            for feature in proposals_by_zone.get(zone_id, []):
                for line in line_parts(projected(feature["geometry"])):
                    points = [pixel(point) for point in line.coords]
                    if len(points) >= 2:
                        draw.line(points, fill="#ff8c00", width=4)
            anchors = props.get("directionAnchors") or [{"pinPoint": props.get("pinPoint"), "dataPoint": props.get("dataPoint")}]
            for anchor in anchors:
                for field, colour in (("pinPoint", "#2ca02c"), ("dataPoint", "#9467bd")):
                    point = anchor.get(field)
                    if not isinstance(point, list) or len(point) < 2:
                        continue
                    x, y = PROJECT.transform(point[0], point[1])
                    px, py = pixel((x, y))
                    draw.ellipse((px - 5, py - 5, px + 5, py + 5), fill=colour, outline="white", width=1)
        image.save(output_dir / f"{area['id']}.png", optimize=True)
    print(f"Private GeoDanmark-reviewkort genereret for {len(pilot_areas.get('areas') or [])} pilotområder.")


if __name__ == "__main__":
    main()
