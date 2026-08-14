#!/usr/bin/env python3
"""Read-only audit of active local coast orientation and land/water point pairs."""
from __future__ import annotations

import argparse
import json
import math
from datetime import datetime, timezone
from pathlib import Path

from pyproj import Transformer
from shapely.geometry import LineString, Point, shape, mapping
from shapely.ops import transform

ROOT = Path(__file__).resolve().parents[1]
TO_M = Transformer.from_crs("EPSG:4326", "EPSG:25832", always_xy=True)


def project(geometry):
    return transform(TO_M.transform, geometry)


def lines(geometry):
    if geometry.geom_type in {"LineString", "LinearRing"}:
        return [LineString(geometry.coords)]
    if geometry.geom_type in {"MultiLineString", "GeometryCollection"}:
        return [line for child in geometry.geoms for line in lines(child)]
    return []


def bearing(a: Point, b: Point) -> float:
    return (90 - math.degrees(math.atan2(b.y - a.y, b.x - a.x))) % 360


def axial_difference(a: float, b: float) -> float:
    return abs(((a - b + 270) % 180) - 90)


def audit_part(zone_id: str, part: dict, tangent_window_m: float = 50) -> dict:
    geometry = project(shape(part["geometry"]))
    land = Point(*TO_M.transform(*part["landPoint"]))
    water = Point(*TO_M.transform(*part["waterPoint"]))
    pair_midpoint = Point((land.x + water.x) / 2, (land.y + water.y) / 2)
    stored_reference = part.get("coastReferencePoint")
    reference_probe = Point(*TO_M.transform(*stored_reference)) if stored_reference else pair_midpoint
    reference_line = min(lines(geometry), key=lambda line: line.distance(reference_probe))
    reference_distance = reference_line.project(reference_probe)
    before = reference_line.interpolate(max(0, reference_distance - tangent_window_m))
    after = reference_line.interpolate(min(reference_line.length, reference_distance + tangent_window_m))
    coast_bearing = bearing(before, after)
    point_bearing = bearing(water, land)
    perpendicular_error = abs(90 - axial_difference(coast_bearing, point_bearing))
    pair_distance = reference_probe.distance(reference_line)
    return {
        "zoneId": zone_id,
        "partId": part["partId"],
        "name": part.get("name") or part["partId"],
        "coastBearingDeg": round(coast_bearing, 1),
        "pointBearingDeg": round(point_bearing, 1),
        "storedOnshoreDirectionDeg": part.get("onshoreDirectionDeg"),
        "normalErrorDeg": round(perpendicular_error, 1),
        "coastReferenceDistanceFromNearestCoastM": round(pair_distance, 1),
        "landPoint": part["landPoint"],
        "waterPoint": part["waterPoint"],
        "geometry": part["geometry"],
        "needsReview": perpendicular_error > 5 or pair_distance > 110,
        "severe": perpendicular_error > 20 or pair_distance > 250,
    }


def build(contract: dict) -> tuple[dict, dict]:
    rows = [
        audit_part(zone_id, part)
        for zone_id, parts in (contract.get("zones") or {}).items()
        for part in parts
        if part.get("geometry") and part.get("landPoint") and part.get("waterPoint")
    ]
    review = sorted(
        (row for row in rows if row["needsReview"]),
        key=lambda row: (-int(row["severe"]), -row["normalErrorDeg"], -row["coastReferenceDistanceFromNearestCoastM"], row["partId"]),
    )
    severe = [row for row in review if row["severe"]]
    report = {
        "schemaVersion": 1,
        "status": "private-read-only-local-part-point-audit",
        "generatedAt": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
        "datasetVersion": contract.get("datasetVersion"),
        "method": {
            "tangentWindowM": 50,
            "reviewNormalErrorDeg": 5,
            "severeNormalErrorDeg": 20,
            "reviewPairMidpointDistanceM": 110,
            "severePairMidpointDistanceM": 250,
            "note": "Read-only triage. No point pair or production geometry is changed.",
        },
        "auditedPartCount": len(rows),
        "reviewPartCount": len(review),
        "severePartCount": len(severe),
        "parts": review,
        "productionGeometryChanged": False,
        "adminDataChanged": False,
        "scoreChanged": False,
        "automaticActivationAllowed": False,
    }
    features = []
    for row in review:
        props = {key: value for key, value in row.items() if key not in {"geometry", "landPoint", "waterPoint"}}
        features.append({"type": "Feature", "properties": {**props, "reviewLayer": "coast"}, "geometry": row["geometry"]})
        features.append({"type": "Feature", "properties": {**props, "reviewLayer": "landPoint"}, "geometry": mapping(Point(row["landPoint"]))})
        features.append({"type": "Feature", "properties": {**props, "reviewLayer": "waterPoint"}, "geometry": mapping(Point(row["waterPoint"]))})
    return report, {"type": "FeatureCollection", "features": features}


def contract_from_bundle(bundle: Path) -> dict:
    coast = json.loads((bundle / "coastal-parts.geojson").read_text(encoding="utf-8"))
    points = json.loads((bundle / "point-pairs.json").read_text(encoding="utf-8"))
    point_by_id = {row["finalPartId"]: row for row in points.get("parts") or []}
    zones: dict[str, list[dict]] = {}
    for feature in coast.get("features") or []:
        properties = feature.get("properties") or {}
        part_id = properties.get("finalPartId") or properties.get("partId")
        point = point_by_id.get(part_id) or {}
        zones.setdefault(properties.get("zoneId"), []).append({
            "partId": part_id,
            "name": point.get("suggestedName") or part_id,
            "geometry": feature["geometry"],
            "coastReferencePoint": point.get("coastReferencePoint"),
            "landPoint": point.get("landPoint"),
            "waterPoint": point.get("waterPoint"),
            "onshoreDirectionDeg": point.get("onshoreDirectionDeg"),
        })
    manifest_path = bundle / "manifest.json"
    dataset_version = json.loads(manifest_path.read_text(encoding="utf-8")).get("sourceVersion") if manifest_path.exists() else "private-candidate"
    return {"datasetVersion": dataset_version, "zones": zones}


def coordinate_lines(geometry: dict) -> list[list[list[float]]]:
    if geometry["type"] == "LineString":
        return [geometry["coordinates"]]
    return geometry.get("coordinates") or []


def render_review(rows: list[dict], output: Path) -> None:
    from PIL import Image, ImageDraw, ImageFont

    selected = [row for row in rows if row["severe"]]
    if not selected:
        image = Image.new("RGB", (900, 140), "#f7f5ef")
        ImageDraw.Draw(image).text((30, 45), "Ingen alvorlige land-/vandpunktfejl i kandidaten.", fill="#176a3a", font=ImageFont.load_default(size=22))
        output.parent.mkdir(parents=True, exist_ok=True)
        image.save(output)
        return
    columns, cell_w, cell_h = 3, 600, 430
    image = Image.new("RGB", (columns * cell_w, math.ceil(len(selected) / columns) * cell_h), "#f7f5ef")
    draw = ImageDraw.Draw(image)
    font = ImageFont.load_default(size=18)
    small = ImageFont.load_default(size=14)
    for index, row in enumerate(selected):
        ox, oy = (index % columns) * cell_w, (index // columns) * cell_h
        lines_value = coordinate_lines(row["geometry"])
        coordinates = [point for line in lines_value for point in line] + [row["landPoint"], row["waterPoint"]]
        min_x, max_x = min(p[0] for p in coordinates), max(p[0] for p in coordinates)
        min_y, max_y = min(p[1] for p in coordinates), max(p[1] for p in coordinates)
        span_x, span_y = max(max_x - min_x, 0.0001), max(max_y - min_y, 0.0001)
        pad, header = 30, 74
        scale = min((cell_w - pad * 2) / span_x, (cell_h - header - pad) / span_y)
        def px(point):
            return (ox + pad + (point[0] - min_x) * scale, oy + cell_h - pad - (point[1] - min_y) * scale)
        draw.rectangle((ox + 4, oy + 4, ox + cell_w - 4, oy + cell_h - 4), outline="#bbb7aa", width=2)
        draw.text((ox + 18, oy + 14), f"{row['zoneId']} · {row['name']}", fill="#151515", font=font)
        draw.text((ox + 18, oy + 40), f"normalfejl {row['normalErrorDeg']}° · referenceafstand {row['coastReferenceDistanceFromNearestCoastM']} m", fill="#8b1e1e", font=small)
        for line in lines_value:
            if len(line) > 1:
                draw.line([px(point) for point in line], fill="#151515", width=6, joint="curve")
        land_px, water_px = px(row["landPoint"]), px(row["waterPoint"])
        draw.line((water_px, land_px), fill="#d83a3a", width=4)
        for point, colour, label in ((land_px, "#22a35a", "LAND"), (water_px, "#2878d0", "VAND")):
            draw.ellipse((point[0] - 9, point[1] - 9, point[0] + 9, point[1] + 9), fill=colour, outline="white", width=2)
            draw.text((point[0] + 12, point[1] - 8), label, fill=colour, font=small)
    output.parent.mkdir(parents=True, exist_ok=True)
    image.save(output)


def self_test() -> None:
    base = {
        "partId": "part-1",
        "name": "Test",
        "geometry": {"type": "LineString", "coordinates": [[10, 55], [10.03, 55]]},
        "landPoint": [10.015, 55.002],
        "waterPoint": [10.015, 54.998],
        "onshoreDirectionDeg": 0,
    }
    good = audit_part("zone", base)
    if good["normalErrorDeg"] > 1:
        raise RuntimeError(f"Perpendicular test pair was rejected: {good}")
    bad = audit_part("zone", {**base, "landPoint": [10.018, 55], "waterPoint": [10.012, 55]})
    if bad["normalErrorDeg"] < 80:
        raise RuntimeError(f"Parallel test pair was not rejected: {bad}")
    print("Local point geometry audit self-test: bestået.")


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--input", type=Path, default=ROOT / "data/live/coastal-parts-v2.json")
    parser.add_argument("--bundle", type=Path, default=ROOT / "data/geometry-v2/active-national-coastal-parts")
    parser.add_argument("--report", type=Path, default=ROOT / "data/diagnostics/local-part-point-audit-4.0.193.json")
    parser.add_argument("--geojson", type=Path, default=ROOT / ".owner-review/local-part-system-audit/point-review.geojson")
    parser.add_argument("--png", type=Path, default=ROOT / ".owner-review/local-part-system-audit/severe-point-review.png")
    parser.add_argument("--self-test", action="store_true")
    args = parser.parse_args()
    if args.self_test:
        self_test()
        return
    contract = contract_from_bundle(args.bundle) if args.bundle else json.loads(args.input.read_text(encoding="utf-8"))
    report, geojson = build(contract)
    args.report.parent.mkdir(parents=True, exist_ok=True)
    args.geojson.parent.mkdir(parents=True, exist_ok=True)
    args.report.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    args.geojson.write_text(json.dumps(geojson, ensure_ascii=False) + "\n", encoding="utf-8")
    render_review(report["parts"], args.png)
    print(json.dumps({key: report[key] for key in ("auditedPartCount", "reviewPartCount", "severePartCount")}, ensure_ascii=False))


if __name__ == "__main__":
    main()
