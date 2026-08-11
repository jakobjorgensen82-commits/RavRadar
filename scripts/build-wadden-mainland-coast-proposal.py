#!/usr/bin/env python3
"""Build a private GeoDanmark proposal for the mainland Wadden Sea coast."""
from __future__ import annotations

import argparse
import json
from pathlib import Path

from pyproj import Transformer
from shapely.geometry import LineString, box, mapping, shape
from shapely.ops import transform, unary_union
from shapely.strtree import STRtree

ROOT = Path(__file__).resolve().parents[1]
TO_M = Transformer.from_crs(4326, 25832, always_xy=True).transform
TO_W = Transformer.from_crs(25832, 4326, always_xy=True).transform
OSM_GUIDE_WAY_IDS = {347556100, 55343044, 710893865, 4119919, 1277660763, 1277660764}
SECTIONS = (
    ("wadden-mainland-01", "Emmerlev og Ballum", 54.99, 55.15),
    ("wadden-mainland-02", "Rejsby og Ribe Vesterå", 55.15, 55.32),
    ("wadden-mainland-03", "Ribe Kammersluse og Esbjerg", 55.32, 55.465),
)


def load(path):
    return json.loads(path.read_text(encoding="utf-8"))


def lines(geometry):
    if geometry.is_empty:
        return []
    if geometry.geom_type in {"LineString", "LinearRing"}:
        return [LineString(geometry.coords)]
    if geometry.geom_type in {"MultiLineString", "GeometryCollection"}:
        return [part for child in geometry.geoms for part in lines(child)]
    return []


def runtime_geometries(payload):
    output = []
    for value in (payload.get("zones") or {}).values():
        rows = value if isinstance(value, list) else value.get("parts", []) if isinstance(value, dict) else []
        output.extend(transform(TO_M, shape(row["geometry"])) for row in rows if row.get("geometry"))
    return output


def build(official, osm, active, guide_buffer_m=75):
    guide_parts = []
    for element in osm.get("elements") or []:
        if element.get("type") != "way" or element.get("id") not in OSM_GUIDE_WAY_IDS:
            continue
        coordinates = [(point["lon"], point["lat"]) for point in element.get("geometry") or []]
        if len(coordinates) >= 2:
            guide_parts.append(transform(TO_M, LineString(coordinates)))
    if len(guide_parts) != len(OSM_GUIDE_WAY_IDS):
        raise SystemExit("Vadehavsforslaget mangler en eller flere OSM-vejviserlinjer.")
    guide = unary_union(guide_parts).intersection(transform(TO_M, box(8.4, 54.99, 8.9, 55.465)))
    official_geometries = [transform(TO_M, shape(feature["geometry"])) for feature in official.get("features") or []]
    official_tree = STRtree(official_geometries)
    nearby = [official_geometries[int(index)] for index in official_tree.query(guide.buffer(guide_buffer_m))]
    selected = unary_union([
        geometry.intersection(guide.buffer(guide_buffer_m))
        for geometry in nearby
        if geometry.intersects(guide.buffer(guide_buffer_m))
    ])
    # Rømø-dæmningen er en transportforbindelse tværs over Vadehavet, ikke en
    # ravkyst. GeoDanmark registrerer dens kanter som Kyst, så den fjernes
    # eksplicit, mens fastlandets tilslutning øst for boksen bevares.
    # South of Ribe the relevant mainland shore stays east of 8.62 E.  This
    # removes Rømø and its causeway without clipping the actual mainland.  North
    # of that point the mainland naturally bends west toward Esbjerg.
    selected = unary_union([
        selected.intersection(transform(TO_M, box(8.62, 54.99, 8.95, 55.32))),
        selected.intersection(transform(TO_M, box(8.35, 55.32, 8.95, 55.465))),
    ])
    selected = selected.difference(transform(TO_M, box(8.62, 55.144, 8.668, 55.152)))
    active_geometries = runtime_geometries(active)
    active_tree = STRtree(active_geometries) if active_geometries else None
    active_union = unary_union(active_geometries) if active_geometries else None
    features = []
    rows = []
    official_outlier_length_m = 0.0
    existing_overlap_length_m = 0.0
    for proposal_id, name, south, north in SECTIONS:
        geometry = selected.intersection(transform(TO_M, box(8.35, south, 8.95, north)))
        if active_tree is not None:
            occupied = [active_geometries[int(index)] for index in active_tree.query(geometry.buffer(0.25))]
            if occupied:
                geometry = geometry.difference(unary_union(occupied).buffer(0.25))
        if proposal_id == "wadden-mainland-01":
            # Owner review 2026-08-11: connect the two documented mainland
            # shore runs across GeoDanmark's fragmented straight dike section.
            geometry = unary_union([
                geometry,
                transform(TO_M, LineString([(8.6388, 55.0604), (8.6489, 55.0893)])),
            ])
        if proposal_id == "wadden-mainland-03":
            # Owner review 2026-08-11: jump across Ribe Å instead of following
            # both river banks inland.
            ribe_aa_inlet = transform(TO_M, box(8.6635, 55.3200, 8.6768, 55.3332))
            geometry = unary_union([
                geometry.difference(ribe_aa_inlet),
                transform(TO_M, LineString([(8.6673, 55.3204), (8.6751, 55.3327)])),
            ])
        geometry = unary_union([part for part in lines(geometry) if part.length >= 10])
        if geometry.is_empty:
            raise SystemExit(f"Vadehavsforslaget blev tomt for {name}.")
        official_outlier_length_m += geometry.difference(selected.buffer(2)).length
        if active_union is not None:
            existing_overlap_length_m += geometry.intersection(active_union.buffer(0.25)).length
        row = {
            "proposalId": proposal_id,
            "proposedMainZoneName": name,
            "lengthKm": round(geometry.length / 1000, 3),
            "componentCount": len(lines(geometry)),
            "source": "GeoDanmark Kyst; OSM coastline used only as a bounded selection guide",
            "status": "private-owner-review-required",
            "automaticActivationAllowed": False,
        }
        rows.append(row)
        features.append({"type": "Feature", "properties": row, "geometry": mapping(transform(TO_W, geometry))})
    report = {
        "schemaVersion": "1.0.0",
        "status": "private-wadden-mainland-coast-proposal",
        "proposalCount": len(rows),
        "totalLengthKm": round(sum(row["lengthKm"] for row in rows), 3),
        "guideBufferM": guide_buffer_m,
        "officialSourceOutlierCount": int(official_outlier_length_m > 1),
        "officialSourceOutlierLengthM": round(official_outlier_length_m, 1),
        "documentedOwnerBridgeCount": 2,
        "existingRuntimeOverlapCount": int(existing_overlap_length_m > 1),
        "existingRuntimeOverlapLengthM": round(existing_overlap_length_m, 1),
        "scoreChanged": False,
        "automaticActivationAllowed": False,
        "proposals": rows,
    }
    return report, {"type": "FeatureCollection", "features": features}


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--official-coast", type=Path)
    parser.add_argument("--osm-guide", type=Path)
    parser.add_argument("--active-parts", type=Path, default=ROOT / "data/live/coastal-parts-v2.json")
    parser.add_argument("--report", type=Path, default=ROOT / ".geometry-v2-work/wadden-mainland-coast-proposal.json")
    parser.add_argument("--geojson", type=Path, default=ROOT / ".geometry-v2-work/wadden-mainland-coast-proposal.geojson")
    args = parser.parse_args()
    if not args.official_coast or not args.osm_guide:
        parser.error("--official-coast og --osm-guide er påkrævet")
    report, geojson = build(load(args.official_coast), load(args.osm_guide), load(args.active_parts))
    args.report.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    args.geojson.write_text(json.dumps(geojson, ensure_ascii=False, separators=(",", ":")) + "\n", encoding="utf-8")
    print(json.dumps({key: report[key] for key in ("proposalCount", "totalLengthKm", "officialSourceOutlierCount", "existingRuntimeOverlapCount")}, ensure_ascii=False))


if __name__ == "__main__":
    main()
