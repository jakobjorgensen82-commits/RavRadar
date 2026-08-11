#!/usr/bin/env python3
"""Audit precise coast coverage under stable public parent zones.

The audit is read-only. It compares reviewed runtime parts with the official
source and the topology candidate that existed before owner exclusions. Long
uncovered candidate pieces are review items, never automatic additions.
"""
from __future__ import annotations

import argparse
import json
from pathlib import Path

from pyproj import Transformer
from shapely.geometry import LineString, Point, mapping, shape
from shapely.ops import transform, unary_union
from shapely.strtree import STRtree

ROOT = Path(__file__).resolve().parents[1]
TO_M = Transformer.from_crs("EPSG:4326", "EPSG:25832", always_xy=True)
TO_W = Transformer.from_crs("EPSG:25832", "EPSG:4326", always_xy=True)


def load(path):
    return json.loads(path.read_text(encoding="utf-8"))


def project(geometry):
    return transform(TO_M.transform, geometry)


def unproject(geometry):
    return transform(TO_W.transform, geometry)


def lines(geometry):
    if geometry.is_empty:
        return []
    if geometry.geom_type in {"LineString", "LinearRing"}:
        return [LineString(geometry.coords)]
    if geometry.geom_type in {"MultiLineString", "GeometryCollection"}:
        return [part for child in geometry.geoms for part in lines(child)]
    return []


def runtime_parts(payload):
    output = []
    for zone_id, value in (payload.get("zones") or {}).items():
        if isinstance(value, list):
            rows = value
        elif isinstance(value, dict) and isinstance(value.get("parts"), list):
            rows = value["parts"]
        else:
            rows = [value]
        for row in rows:
            if not isinstance(row, dict) or not row.get("geometry"):
                continue
            output.append((zone_id, str(row.get("partId") or f"{zone_id}-unnamed"), project(shape(row["geometry"]))))
    return output


def sampled_max_distance(line, reference_tree, reference_lines, interval=250, maximum=100):
    if line.is_empty or reference_tree is None:
        return None
    count = min(maximum, max(2, int(line.length // interval) + 1))
    distances = []
    for index in range(count):
        point = line.interpolate(line.length * index / (count - 1))
        nearest_index = int(reference_tree.nearest(point))
        distances.append(point.distance(reference_lines[nearest_index]))
    return max(distances)


def build(zones, active_parts, official_coast, expected_coast, minimum_gap_m=100):
    active_zone_ids = {
        feature.get("properties", {}).get("id")
        for feature in zones.get("features") or []
        if feature.get("properties", {}).get("zoneStatus") == "active"
    }
    parts = runtime_parts(active_parts)
    represented = {zone_id for zone_id, _, _ in parts}

    official_lines = [project(shape(feature["geometry"])) for feature in official_coast.get("features") or []]
    official_parts = [part for geometry in official_lines for part in lines(geometry)]
    official_tree = STRtree(official_parts) if official_parts else None

    source_outliers = []
    for zone_id, part_id, geometry in parts:
        distance = sampled_max_distance(geometry, official_tree, official_parts)
        if distance is None or distance > 10:
            source_outliers.append({"zoneId": zone_id, "partId": part_id, "maxOfficialSourceDistanceM": None if distance is None else round(distance, 2)})

    geometries = [geometry for _, _, geometry in parts]
    tree = STRtree(geometries) if geometries else None
    overlaps = []
    if tree is not None:
        for left_index, (left_zone, left_id, left) in enumerate(parts):
            for right_index in tree.query(left.buffer(0.25)):
                right_index = int(right_index)
                if right_index <= left_index:
                    continue
                right_zone, right_id, right = parts[right_index]
                if left_zone == right_zone:
                    continue
                shared = left.intersection(right.buffer(0.25)).length
                if shared >= 1:
                    overlaps.append({"leftZoneId": left_zone, "leftPartId": left_id, "rightZoneId": right_zone, "rightPartId": right_id, "sharedLengthM": round(shared, 2)})

    active_by_zone = {}
    for zone_id, _, geometry in parts:
        active_by_zone.setdefault(zone_id, []).append(geometry)
    expected_by_zone = {
        feature.get("properties", {}).get("zoneId"): project(shape(feature["geometry"]))
        for feature in expected_coast.get("features") or []
        if feature.get("properties", {}).get("zoneId")
    }
    gap_features = []
    detached_candidate_count = 0
    zone_rows = []
    for zone_id in sorted(active_zone_ids):
        expected = expected_by_zone.get(zone_id, LineString())
        active = unary_union(active_by_zone.get(zone_id, [])) if active_by_zone.get(zone_id) else LineString()
        uncovered = expected.difference(active.buffer(5)) if not expected.is_empty else LineString()
        gaps = [part for part in lines(uncovered) if part.length >= minimum_gap_m]
        actionable_gaps = []
        for gap in gaps:
            if active.is_empty:
                gap_class = "unrepresented-main-zone"
            else:
                endpoints = [Point(gap.coords[0]), Point(gap.coords[-1])]
                near_count = sum(point.distance(active) <= 25 for point in endpoints)
                gap_class = "between-runtime-segments" if near_count == 2 else "runtime-edge-extension" if near_count == 1 else "detached-candidate"
            if gap_class == "detached-candidate":
                detached_candidate_count += 1
                continue
            actionable_gaps.append((gap, gap_class))
        for index, (gap, gap_class) in enumerate(sorted(actionable_gaps, key=lambda item: -item[0].length), 1):
            gap_features.append({
                "type": "Feature",
                "properties": {"zoneId": zone_id, "gapId": f"{zone_id}-gap-{index:02d}", "gapClass": gap_class, "lengthM": round(gap.length, 1), "status": "owner-review-required", "automaticActivationAllowed": False},
                "geometry": mapping(unproject(gap)),
            })
        zone_rows.append({
            "zoneId": zone_id,
            "hasPreciseRuntimeCoast": zone_id in represented,
            "runtimeLengthKm": round(active.length / 1000, 3),
            "expectedCandidateLengthKm": round(expected.length / 1000, 3),
            "uncoveredReviewLengthKm": round(sum(gap.length for gap, _ in actionable_gaps) / 1000, 3),
            "uncoveredReviewPartCount": len(actionable_gaps),
        })

    # Build the owner review list once nationally. Per-zone candidates overlap
    # near administrative boundaries; a national union prevents the same
    # physical gap from appearing repeatedly under neighbouring zone IDs.
    active_national = unary_union(geometries) if geometries else LineString()
    expected_national = unary_union(list(expected_by_zone.values())) if expected_by_zone else LineString()
    expected_zone_ids = list(expected_by_zone)
    expected_zone_geometries = [expected_by_zone[zone_id] for zone_id in expected_zone_ids]
    expected_zone_tree = STRtree(expected_zone_geometries) if expected_zone_geometries else None
    national_gaps = [part for part in lines(expected_national.difference(active_national.buffer(5))) if part.length >= minimum_gap_m]
    gap_features = []
    detached_candidate_count = 0
    for index, gap in enumerate(sorted(national_gaps, key=lambda item: -item.length), 1):
        endpoints = [Point(gap.coords[0]), Point(gap.coords[-1])]
        near_count = 0 if active_national.is_empty else sum(point.distance(active_national) <= 25 for point in endpoints)
        gap_class = "between-runtime-segments" if near_count == 2 else "runtime-edge-extension" if near_count == 1 else "detached-candidate"
        if gap_class == "detached-candidate":
            detached_candidate_count += 1
        owner_scores = [
            (gap.intersection(expected_zone_geometries[int(candidate)]).length, expected_zone_ids[int(candidate)])
            for candidate in (expected_zone_tree.query(gap.buffer(5)) if expected_zone_tree is not None else [])
        ]
        owner_zone_id = max(owner_scores)[1] if owner_scores else None
        if owner_zone_id not in represented:
            gap_class = "unrepresented-main-zone"
        gap_features.append({
            "type": "Feature",
            "properties": {"zoneId": owner_zone_id, "gapId": f"national-gap-{index:03d}", "gapClass": gap_class, "lengthM": round(gap.length, 1), "status": "owner-review-required", "automaticActivationAllowed": False},
            "geometry": mapping(unproject(gap)),
        })

    missing = sorted(active_zone_ids - represented)
    report = {
        "schemaVersion": "1.0.0",
        "status": "private-national-public-coast-coverage-review",
        "activeMainZoneCount": len(active_zone_ids),
        "representedMainZoneCount": len(represented & active_zone_ids),
        "runtimePartCount": len(parts),
        "missingMainZoneIds": missing,
        "officialSourceOutlierCount": len(source_outliers),
        "officialSourceOutliers": source_outliers,
        "crossZoneOverlapCount": len(overlaps),
        "crossZoneOverlaps": overlaps,
        "uncoveredReviewPartCount": len(gap_features),
        "detachedCandidatePartCount": detached_candidate_count,
        "automaticActivationAllowed": False,
        "zones": zone_rows,
    }
    return report, {"type": "FeatureCollection", "features": gap_features}


def self_test():
    zone_features = []
    source_features = []
    expected_features = []
    active = {"zones": {}}
    for index in range(2):
        zone_id = f"Z{index}"
        x = 8 + index * 0.1
        zone_features.append({"type": "Feature", "properties": {"id": zone_id, "zoneStatus": "active"}, "geometry": {"type": "Polygon", "coordinates": [[[x, 56], [x + .05, 56], [x + .05, 56.05], [x, 56.05], [x, 56]]]}})
        geometry = {"type": "LineString", "coordinates": [[x, 56], [x + .02, 56]]}
        source_features.append({"type": "Feature", "properties": {}, "geometry": geometry})
        expected_features.append({"type": "Feature", "properties": {"zoneId": zone_id}, "geometry": geometry})
        if index == 0:
            active["zones"][zone_id] = {"partId": "p0", "geometry": geometry}
    report, gaps = build({"features": zone_features}, active, {"features": source_features}, {"features": expected_features})
    assert report["missingMainZoneIds"] == ["Z1"] and report["officialSourceOutlierCount"] == 0
    assert report["uncoveredReviewPartCount"] == 1 and len(gaps["features"]) == 1
    print("National public coast coverage audit self-test: bestået.")


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--zones", type=Path, default=ROOT / "data" / "zones.geojson")
    parser.add_argument("--active-parts", type=Path, default=ROOT / "data" / "live" / "coastal-parts-v2.json")
    parser.add_argument("--official-coast", type=Path, default=ROOT / ".geometry-v2-work" / "national-source" / "national-Kyst.geojson")
    parser.add_argument("--expected-coast", type=Path, default=ROOT / ".geometry-v2-work" / "national-topology-audit.geojson")
    parser.add_argument("--report", type=Path, default=ROOT / ".geometry-v2-work" / "national-public-coast-coverage-audit.json")
    parser.add_argument("--geojson", type=Path, default=ROOT / ".geometry-v2-work" / "national-public-coast-coverage-gaps.geojson")
    parser.add_argument("--self-test", action="store_true")
    args = parser.parse_args()
    if args.self_test:
        self_test()
        return
    report, gaps = build(load(args.zones), load(args.active_parts), load(args.official_coast), load(args.expected_coast))
    args.report.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    args.geojson.write_text(json.dumps(gaps, ensure_ascii=False, separators=(",", ":")) + "\n", encoding="utf-8")
    print(json.dumps({key: report[key] for key in ("activeMainZoneCount", "representedMainZoneCount", "runtimePartCount", "officialSourceOutlierCount", "crossZoneOverlapCount", "uncoveredReviewPartCount")}, ensure_ascii=False))


if __name__ == "__main__":
    main()
