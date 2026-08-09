#!/usr/bin/env python3
"""Build private official-orthophoto overlays for the Blåvand detail proposal."""
from __future__ import annotations

import argparse
import io
import json
import math
import os
from pathlib import Path

import requests
from PIL import Image, ImageDraw, ImageFont
from pyproj import Transformer
from shapely.geometry import Point, shape
from shapely.ops import transform

ROOT = Path(__file__).resolve().parents[1]
WMTS_URL = "https://wmts.datafordeler.dk/GeoDanmarkOrto/orto_foraar_webm/1.0.0/WMTS"
ZOOM = 17
TILE_SIZE = 256
WINDOW_TILES = 6
PROJECT = Transformer.from_crs("EPSG:4326", "EPSG:3857", always_xy=True)
WORLD_HALF = 20037508.342789244


def fail(message):
    raise SystemExit(message)


def api_key():
    value = os.environ.get("DATAFORDELER_API_KEY", "").strip()
    if not value:
        fail("DATAFORDELER_API_KEY mangler; ortofoto blev ikke hentet.")
    return value


def load(path):
    return json.loads(path.read_text(encoding="utf-8"))


def projected(geometry):
    return transform(PROJECT.transform, shape(geometry))


def tile_for_xy(x, y, zoom=ZOOM):
    count = 2**zoom
    return ((x + WORLD_HALF) / (2 * WORLD_HALF) * count, (WORLD_HALF - y) / (2 * WORLD_HALF) * count)


def xy_for_tile(column, row, zoom=ZOOM):
    count = 2**zoom
    return (column / count * 2 * WORLD_HALF - WORLD_HALF, WORLD_HALF - row / count * 2 * WORLD_HALF)


def fetch_tile(column, row, key):
    params = {
        "apikey": key,
        "SERVICE": "WMTS",
        "REQUEST": "GetTile",
        "VERSION": "1.0.0",
        "STYLE": "default",
        "FORMAT": "image/jpeg",
        "TILEMATRIXSET": "DFD_GoogleMapsCompatible",
        "TILEMATRIX": str(ZOOM),
        "TILEROW": str(row),
        "TILECOL": str(column),
        "Layer": "orto_foraar_webm",
    }
    try:
        response = requests.get(WMTS_URL, params=params, timeout=45)
    except requests.RequestException:
        fail("Det officielle ortofotokald kunne ikke gennemføres; credential og request-URL logges ikke.")
    if not response.ok or not response.headers.get("content-type", "").lower().startswith("image/"):
        fail(f"Datafordeler afviste ortofotoforespørgslen (HTTP {response.status_code}); credential og request-URL logges ikke.")
    try:
        return Image.open(io.BytesIO(response.content)).convert("RGB")
    except Exception:
        fail("Datafordeler returnerede ikke en gyldig ortofototile.")


def iter_lines(geometry):
    if geometry.geom_type in {"LineString", "LinearRing"}:
        yield geometry
    elif geometry.geom_type in {"MultiLineString", "GeometryCollection"}:
        for child in geometry.geoms:
            yield from iter_lines(child)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--work-dir", type=Path, default=ROOT / ".geometry-v2-work")
    parser.add_argument("--self-test", action="store_true")
    args = parser.parse_args()
    if args.self_test:
        column, row = tile_for_xy(0, 0)
        assert abs(column - 2 ** (ZOOM - 1)) < 1e-9 and abs(row - 2 ** (ZOOM - 1)) < 1e-9
        x, y = xy_for_tile(column, row)
        assert abs(x) < 1e-6 and abs(y) < 1e-6
        print("Blåvand ortofotoreview self-test: bestået.")
        return

    work_dir = args.work_dir.resolve()
    if ROOT not in work_dir.parents:
        fail("Ortofotoarbejdsmappen skal ligge i workspace.")
    detail = load(work_dir / "blaavand-detail-proposal.geojson")
    qa = load(work_dir / "coastal-source-qa.geojson")
    detail_features = detail.get("features") or []
    lines = [feature for feature in detail_features if feature.get("properties", {}).get("kind") == "private-landward-detail-line"]
    if len(lines) != 2:
        fail("Ortofotoreview kræver præcis to private Blåvand-detaillinjer.")
    physical = [feature for feature in qa.get("features") or [] if feature.get("properties", {}).get("zoneId") == "DK-B03-13" and feature.get("properties", {}).get("kind") == "geodanmark-source-candidate"]
    all_features = physical + detail_features
    projected_features = [(feature, projected(feature["geometry"])) for feature in all_features]
    controls = []
    for feature in lines:
        geometry = projected(feature["geometry"])
        controls.append((feature["properties"]["partId"], geometry.interpolate(0.5, normalized=True)))
    endpoints = [list(projected(feature["geometry"]).boundary.geoms) for feature in lines]
    first, second = min(((a, b) for a in endpoints[0] for b in endpoints[1]), key=lambda pair: pair[0].distance(pair[1]))
    headland = Point((first.x + second.x) / 2, (first.y + second.y) / 2)
    controls.insert(1, ("blaavands-huk", headland))

    key = api_key()
    output_dir = work_dir / "maps" / "ortho"
    output_dir.mkdir(parents=True, exist_ok=True)
    font = ImageFont.load_default()
    report_controls = []
    for control_id, centre in controls:
        centre_col, centre_row = tile_for_xy(centre.x, centre.y)
        first_col = math.floor(centre_col) - WINDOW_TILES // 2
        first_row = math.floor(centre_row) - WINDOW_TILES // 2
        image = Image.new("RGB", (WINDOW_TILES * TILE_SIZE, WINDOW_TILES * TILE_SIZE))
        for dy in range(WINDOW_TILES):
            for dx in range(WINDOW_TILES):
                image.paste(fetch_tile(first_col + dx, first_row + dy, key), (dx * TILE_SIZE, dy * TILE_SIZE))
        west, north = xy_for_tile(first_col, first_row)
        east, south = xy_for_tile(first_col + WINDOW_TILES, first_row + WINDOW_TILES)

        def pixel(point):
            return ((point[0] - west) / (east - west) * image.width, (north - point[1]) / (north - south) * image.height)

        draw = ImageDraw.Draw(image, "RGBA")
        for feature, geometry in projected_features:
            kind = feature.get("properties", {}).get("kind")
            if kind == "geodanmark-source-candidate":
                colour, width = (0, 125, 255, 235), 5
            elif kind == "private-landward-detail-line":
                colour, width = (0, 230, 70, 245), 7
            elif kind == "private-land-point-candidate":
                colour, width = (0, 90, 30, 255), 0
            elif kind == "private-water-point-candidate":
                colour, width = (160, 40, 220, 255), 0
            elif kind == "private-groyne-hypothesis":
                colour, width = (230, 25, 25, 255), 0
            else:
                continue
            if width:
                for line in iter_lines(geometry):
                    points = [pixel(point) for point in line.coords]
                    if len(points) >= 2:
                        draw.line(points, fill=colour, width=width)
            elif geometry.geom_type == "Point":
                px, py = pixel((geometry.x, geometry.y))
                radius = 8 if "groyne" not in kind else 5
                draw.ellipse((px-radius, py-radius, px+radius, py+radius), fill=colour, outline=(255,255,255,255), width=2)
        draw.rectangle((8, 8, 700, 54), fill=(255,255,255,220))
        draw.text((18, 16), f"Officielt GeoDanmark Ortofoto 2025 · {control_id}", fill=(0,0,0,255), font=font)
        draw.text((18, 34), "Blå: fysisk kyst · Grøn: privat 15 m-linje · Lilla/grøn: vand/land · Rød: høfte", fill=(0,0,0,255), font=font)
        target = output_dir / f"DK-B03-13-{control_id}.jpg"
        image.convert("RGB").save(target, quality=92, optimize=True)
        report_controls.append({"id": control_id, "file": target.name, "zoom": ZOOM, "tileCount": WINDOW_TILES**2})
    report = {
        "schemaVersion": "1.0.0",
        "status": "private-manual-review-required",
        "source": "GeoDanmark Ortofoto forår Web Mercator WMTS",
        "sourceYear": 2025,
        "costClass": "free-data-only",
        "controls": report_controls,
        "automaticActivationAllowed": False,
        "weatherSamplingEnabled": False,
        "scoreChanged": False,
        "secretHandling": "DATAFORDELER_API_KEY was read only from the process environment and was not persisted.",
    }
    (work_dir / "blaavand-ortho-review.json").write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"Tre private officielle ortofoto-overlays genereret ({len(report_controls) * WINDOW_TILES**2} tiles); manuel faglig kontrol kræves.")


if __name__ == "__main__":
    main()
