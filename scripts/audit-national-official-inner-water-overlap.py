#!/usr/bin/env python3
"""Measure exact final-part overlap with official fjord/nor masks."""
from __future__ import annotations
import argparse, json
from pathlib import Path
from shapely.geometry import shape
from shapely.ops import transform
from shapely.strtree import STRtree
from pyproj import Transformer

ROOT = Path(__file__).resolve().parents[1]
TO_M = Transformer.from_crs("EPSG:4326", "EPSG:25832", always_xy=True).transform

def load(path): return json.loads(path.read_text(encoding="utf-8"))

def final_features(coastal, partitions):
    replaced = {f["properties"]["sourcePartId"] for f in partitions.get("features", [])}
    rows = [(f["properties"]["partId"], f) for f in coastal.get("features", []) if f["properties"]["partId"] not in replaced]
    rows += [(f["properties"].get("finalPartId") or f["properties"]["proposalId"], f) for f in partitions.get("features", [])]
    return rows

def build(work, zones_path, review_path):
    coastal = load(work / "national-coastal-parts.geojson")
    partitions = load(work / "national-locality-partitions.geojson")
    masks = load(work / "national-water-exclusions.geojson")
    names = {p["finalPartId"]: p for p in load(work / "national-local-part-name-suggestions.json")["parts"]}
    zones = {f["properties"]["id"]: f["properties"] for f in load(zones_path)["features"]}
    decisions = load(review_path)["decisions"]
    mask_rows = [(transform(TO_M, shape(f["geometry"])), f["properties"]) for f in masks["features"]]
    tree = STRtree([g for g, _ in mask_rows])
    rows = []
    for part_id, feature in final_features(coastal, partitions):
        named = names[part_id]
        if zones[named["zoneId"]].get("coastType") == "limfjord": continue
        geometry = transform(TO_M, shape(feature["geometry"]))
        overlaps = []
        total = 0.0
        for index in tree.query(geometry):
            mask, props = mask_rows[int(index)]
            length = geometry.intersection(mask).length
            if length > 0.5:
                total += length
                overlaps.append({"name": props.get("primaryName"), "subType": props.get("subType"), "overlapM": round(length, 1)})
        if total > 0.5:
            rows.append({"zoneId": named["zoneId"], "partId": part_id, "name": named["suggestedName"], "lengthM": round(geometry.length, 1), "officialInnerWaterOverlapM": round(total, 1), "overlapShare": round(min(1, total / geometry.length), 4), "officialWaters": overlaps, "ownerDecision": decisions.get(part_id), "automaticActivationAllowed": False})
    rows.sort(key=lambda row: (-row["officialInnerWaterOverlapM"], row["partId"]))
    return {"schemaVersion": "1.0.0", "status": "private-exact-official-inner-water-overlap-audit", "partCount": len(final_features(coastal, partitions)), "overlapPartCount": len(rows), "productionGeometryChanged": False, "automaticActivationAllowed": False, "parts": rows}

def main():
    p = argparse.ArgumentParser(); p.add_argument("--work", type=Path); p.add_argument("--zones", type=Path, default=ROOT / "data/zones.geojson"); p.add_argument("--review", type=Path, default=ROOT / "data/geometry-v2/national-owner-coastal-review-2026-08-11.json"); p.add_argument("--output", type=Path); p.add_argument("--self-test", action="store_true"); a = p.parse_args()
    if a.self_test:
        assert round(transform(TO_M, shape({"type":"LineString","coordinates":[[10,56],[10.01,56]]})).length) > 500
        print("National officiel indre-farvandsoverlap self-test: bestået."); return
    if not a.work or not a.output: p.error("--work og --output er påkrævet")
    report = build(a.work, a.zones, a.review); a.output.parent.mkdir(parents=True, exist_ok=True); a.output.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"); print(json.dumps({"overlapPartCount": report["overlapPartCount"]}))
if __name__ == "__main__": main()
