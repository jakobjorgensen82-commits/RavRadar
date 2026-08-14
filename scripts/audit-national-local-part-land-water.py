#!/usr/bin/env python3
"""Audit active local-part point sides against ESA WorldCover 2021 at 10 m.

This is an independent, read-only semantic side check. Place names are never
accepted as land/water evidence. Class 80 is permanent water; other non-zero
classes are land cover. Ambiguous pixels remain blocked for manual review.
"""
from __future__ import annotations

import argparse
import json
import math
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path

import rasterio
from pyproj import Transformer
from shapely.geometry import LineString, Point, shape
from shapely.ops import nearest_points, transform

ROOT = Path(__file__).resolve().parents[1]
WATER_CLASS = 80
TO_M = Transformer.from_crs("EPSG:4326", "EPSG:25832", always_xy=True)
TO_WGS84 = Transformer.from_crs("EPSG:25832", "EPSG:4326", always_xy=True)


def load(path: Path):
    return json.loads(path.read_text(encoding="utf-8"))


def tile_id(lon: float, lat: float) -> str:
    west = math.floor(lon / 3) * 3
    south = math.floor(lat / 3) * 3
    return f"{'N' if south >= 0 else 'S'}{abs(south):02d}{'E' if west >= 0 else 'W'}{abs(west):03d}"


def bearing(water, land):
    lon1, lat1, lon2, lat2 = [math.radians(value) for value in (*water, *land)]
    y = math.sin(lon2 - lon1) * math.cos(lat2)
    x = math.cos(lat1) * math.sin(lat2) - math.sin(lat1) * math.cos(lat2) * math.cos(lon2 - lon1)
    return round((math.degrees(math.atan2(y, x)) + 360) % 360, 1)


def coast_frame(part):
    coast = transform(TO_M.transform, shape(part["geometry"]))
    water = Point(*TO_M.transform(*part["waterPoint"]))
    land = Point(*TO_M.transform(*part["landPoint"]))
    pair = LineString([water, land])
    coast_point, _ = nearest_points(coast, pair)
    dx, dy = land.x - water.x, land.y - water.y
    length = math.hypot(dx, dy)
    if length < 1:
        raise RuntimeError(f"{part['partId']}: land-/vandpunktparret er kollapset")
    return coast_point, (dx / length, dy / length)


def offset_point(origin, unit, metres):
    return [round(value, 7) for value in TO_WGS84.transform(origin.x + unit[0] * metres, origin.y + unit[1] * metres)]


def sample_evidence(dataset, point):
    lon, lat = map(float, point)
    # Nine nearby 10 m-scale samples prevent one shoreline pixel from deciding
    # an otherwise clear point. The point itself remains part of the evidence.
    dx = 10 / (111_320 * max(math.cos(math.radians(lat)), 0.1))
    dy = 10 / 111_320
    locations = [(lon + x * dx, lat + y * dy) for x in (-1, 0, 1) for y in (-1, 0, 1)]
    values = [int(value[0]) for value in dataset.sample(locations)]
    valid = [value for value in values if value != 0]
    water = sum(value == WATER_CLASS for value in valid)
    land = sum(value != WATER_CLASS for value in valid)
    kind = "water" if water >= 6 else "land" if land >= 6 else "ambiguous"
    return {"classification": kind, "waterPixels": water, "landPixels": land, "noDataPixels": 9 - len(valid), "classes": dict(sorted(Counter(values).items()))}


def audit(bundle, tile_dir: Path):
    datasets = {}

    def evidence(point):
        key = tile_id(*point)
        if key not in datasets:
            path = tile_dir / f"ESA_WorldCover_10m_2021_v200_{key}_Map.tif"
            if not path.exists():
                raise RuntimeError(f"ESA WorldCover-flise mangler: {path.name}")
            datasets[key] = rasterio.open(path)
        return key, sample_evidence(datasets[key], point)

    rows = []
    try:
        for zone_id, parts in sorted((bundle.get("zones") or {}).items()):
            for part in parts:
                coast, unit = coast_frame(part)
                land_samples = [evidence(offset_point(coast, unit, distance))[1] for distance in (40, 60, 100, 150)]
                water_samples = [evidence(offset_point(coast, unit, -distance))[1] for distance in (100, 200, 300, 500)]
                land_votes = Counter(sample["classification"] for sample in land_samples)
                water_votes = Counter(sample["classification"] for sample in water_samples)
                land_tile, land = evidence(part["landPoint"])
                water_tile, water = evidence(part["waterPoint"])
                if land_votes["land"] >= 3 and water_votes["water"] >= 3:
                    status = "verified-land-water"
                elif land_votes["water"] >= 3 and water_votes["land"] >= 3:
                    status = "reversed-land-water"
                else:
                    status = "ambiguous-land-water"
                if status == "reversed-land-water":
                    corrected_land = offset_point(coast, unit, -60)
                    corrected_water = offset_point(coast, unit, 250)
                else:
                    corrected_land = corrected_water = None
                rows.append({
                    "zoneId": zone_id,
                    "partId": part["partId"],
                    "name": part.get("name"),
                    "status": status,
                    "landPoint": part["landPoint"],
                    "waterPoint": part["waterPoint"],
                    "derivedOnshoreDirectionDeg": bearing(part["waterPoint"], part["landPoint"]),
                    "landEvidence": {"tile": land_tile, **land},
                    "waterEvidence": {"tile": water_tile, **water},
                    "landSideTransect": {"offsetsM": [40, 60, 100, 150], "votes": dict(sorted(land_votes.items())), "samples": land_samples},
                    "waterSideTransect": {"offsetsM": [100, 200, 300, 500], "votes": dict(sorted(water_votes.items())), "samples": water_samples},
                    "safeAutomaticCorrection": {
                        "landPoint": corrected_land,
                        "waterPoint": corrected_water,
                        "onshoreDirectionDeg": bearing(corrected_water, corrected_land),
                    } if status == "reversed-land-water" else None,
                })
    finally:
        for dataset in datasets.values():
            dataset.close()
    counts = Counter(row["status"] for row in rows)
    return {
        "schemaVersion": "1.0.0",
        "status": "private-read-only-national-land-water-audit",
        "generatedAt": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
        "source": "ESA WorldCover 10m 2021 v200",
        "sourceLicence": "CC-BY-4.0",
        "waterClass": WATER_CLASS,
        "partCount": len(rows),
        "counts": dict(sorted(counts.items())),
        "automaticActivationAllowed": False,
        "scoreChanged": False,
        "parts": rows,
    }


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--bundle", type=Path, default=ROOT / "data/live/coastal-parts-v2.json")
    parser.add_argument("--tile-dir", type=Path, default=ROOT / ".cache/worldcover")
    parser.add_argument("--output", type=Path, default=ROOT / ".audit/national-local-part-land-water.json")
    parser.add_argument("--decisions-output", type=Path)
    args = parser.parse_args()
    report = audit(load(args.bundle), args.tile_dir)
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    if args.decisions_output:
        corrections = {row["partId"]: row["safeAutomaticCorrection"] for row in report["parts"] if row["status"] == "reversed-land-water"}
        ambiguous = [row["partId"] for row in report["parts"] if row["status"] == "ambiguous-land-water"]
        decisions = {
            "schemaVersion": "1.0.0",
            "status": "reviewed-independent-land-water-side-evidence",
            "auditDate": "2026-08-14",
            "source": report["source"],
            "sourceLicence": report["sourceLicence"],
            "method": "10 m land-cover transects on both sides of the exact local coast; place names are excluded as side evidence",
            "correctionCount": len(corrections),
            "ambiguousCount": len(ambiguous),
            "corrections": corrections,
            "ambiguousPartIds": ambiguous,
            "automaticActivationAllowed": False,
        }
        args.decisions_output.parent.mkdir(parents=True, exist_ok=True)
        args.decisions_output.write_text(json.dumps(decisions, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({"partCount": report["partCount"], **report["counts"]}, ensure_ascii=False))


if __name__ == "__main__":
    main()
