#!/usr/bin/env python3
"""Build a private additive coast candidate without replacing reviewed parts."""
from __future__ import annotations

import argparse
import json
import math
from collections import defaultdict
from pathlib import Path

from pyproj import Transformer
from shapely.geometry import LineString, Point, mapping, shape
from shapely.ops import transform, unary_union
from shapely.strtree import STRtree

ROOT = Path(__file__).resolve().parents[1]
TO_M = Transformer.from_crs(4326, 25832, always_xy=True).transform
TO_W = Transformer.from_crs(25832, 4326, always_xy=True).transform
# A locality block means only that a geometry is too long or fragmented to be
# activated as a local weather/scoring unit. It does not make the official
# source line unsafe as score-neutral public geometry. Geographic conflicts,
# river over-segmentation and empty source remain excluded.
SAFE_VISUAL_STATUSES = {
    "private-review-parts-generated",
    "blocked-locality-review",
}


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


def sample_distance(line, target):
    return sum(line.interpolate(line.length * index / 4).distance(target) for index in range(5)) / 5


def deconflict_visual_features(zones, existing, features_by_zone):
    """Keep reviewed runtime first, then assign new shared coast once only."""
    existing_geometries = [
        transform(TO_M, shape(row["geometry"]))
        for value in existing.values()
        for row in (value if isinstance(value, list) else value.get("parts", []) if isinstance(value, dict) else [])
        if isinstance(row, dict) and row.get("geometry")
    ]
    occupied_tree = STRtree(existing_geometries) if existing_geometries else None
    zone_properties = {feature.get("properties", {}).get("id"): feature.get("properties", {}) for feature in zones.get("features") or []}
    candidates = []
    for zone_id, features in features_by_zone.items():
        props = zone_properties.get(zone_id, {})
        coast = props.get("coastLine") or []
        coast_reference = transform(TO_M, LineString(coast)) if len(coast) >= 2 else None
        point = props.get("dataPoint") or []
        point_reference = Point(*TO_M(*point)) if len(point) >= 2 else None
        for feature in features:
            geometry = transform(TO_M, shape(feature["geometry"]))
            if occupied_tree is not None:
                nearby = [existing_geometries[int(index)] for index in occupied_tree.query(geometry.buffer(0.25))]
                if nearby:
                    geometry = geometry.difference(unary_union(nearby).buffer(0.25))
            geometry = unary_union([part for part in lines(geometry) if part.length >= 10])
            if geometry.is_empty:
                continue
            priority = (
                sample_distance(geometry, coast_reference) if coast_reference is not None else math.inf,
                geometry.centroid.distance(point_reference) if point_reference is not None else math.inf,
                zone_id,
                feature.get("properties", {}).get("partId") or "",
            )
            candidates.append({"zoneId": zone_id, "feature": feature, "geometry": geometry, "priority": priority})

    geometries = [row["geometry"] for row in candidates]
    tree = STRtree(geometries) if geometries else None
    removals = defaultdict(list)
    input_overlap_count = 0
    if tree is not None:
        for left_index, left in enumerate(candidates):
            for raw_index in tree.query(left["geometry"].buffer(0.25)):
                right_index = int(raw_index)
                if right_index <= left_index:
                    continue
                right = candidates[right_index]
                if left["zoneId"] == right["zoneId"]:
                    continue
                shared = min(
                    left["geometry"].intersection(right["geometry"].buffer(0.25)).length,
                    right["geometry"].intersection(left["geometry"].buffer(0.25)).length,
                )
                if shared < 1:
                    continue
                input_overlap_count += 1
                winner, loser = sorted((left_index, right_index), key=lambda index: candidates[index]["priority"])
                removals[loser].append(candidates[winner]["geometry"].buffer(0.25))

    output = defaultdict(list)
    for index, row in enumerate(candidates):
        geometry = row["geometry"].difference(unary_union(removals[index])) if removals[index] else row["geometry"]
        geometry = unary_union([part for part in lines(geometry) if part.length >= 10])
        if geometry.is_empty:
            continue
        output[row["zoneId"]].append({
            "partId": row["feature"].get("properties", {}).get("partId"),
            "name": row["feature"].get("properties", {}).get("proposedName"),
            "geometry": mapping(transform(TO_W, geometry)),
            "candidateOnly": True,
            "visualGeometryOnly": True,
            "automaticActivationAllowed": False,
        })
    return output, input_overlap_count


def build(zones, active, proposal_report, proposal_geojson):
    repository_active_zone_ids = {
        feature.get("properties", {}).get("id")
        for feature in zones.get("features") or []
        if feature.get("properties", {}).get("zoneStatus") == "active"
    }
    existing = dict(active.get("zones") or {})
    proposal_rows = {row.get("zoneId"): row for row in proposal_report.get("zones") or []}
    # The proposal is built after central hydration/tombstones and is therefore
    # the effective 208-zone truth. The repository intentionally still contains
    # the centrally deleted DK-B02-14 and must not reintroduce it here.
    active_zone_ids = set(proposal_rows) or repository_active_zone_ids
    proposal_features = {}
    for feature in proposal_geojson.get("features") or []:
        proposal_features.setdefault(feature.get("properties", {}).get("zoneId"), []).append(feature)

    safe_features = {
        zone_id: features
        for zone_id, features in proposal_features.items()
        if zone_id in (active_zone_ids - set(existing))
        and proposal_rows.get(zone_id, {}).get("proposalStatus") in SAFE_VISUAL_STATUSES
        and features
    }
    deconflicted_features, candidate_overlap_count = deconflict_visual_features(zones, existing, safe_features)
    output_zones = dict(existing)
    rows = []
    for zone_id in sorted(active_zone_ids - set(existing)):
        proposal = proposal_rows.get(zone_id) or {}
        features = proposal_features.get(zone_id) or []
        retained_features = deconflicted_features.get(zone_id) or []
        safe = proposal.get("proposalStatus") in SAFE_VISUAL_STATUSES and bool(retained_features)
        if safe:
            output_zones[zone_id] = retained_features
        rows.append({
            "zoneId": zone_id,
            "currentName": proposal.get("currentName"),
            "proposalStatus": proposal.get("proposalStatus") or "missing-proposal",
            "proposalPartCount": len(features),
            "includedInPrivateCandidate": safe,
            "visualGeometryOnly": safe,
            "weatherOrScoreActivationAllowed": False,
            "qualityFlags": proposal.get("qualityFlags") or [],
        })

    payload = {
        "schemaVersion": "private-incremental-public-coast-candidate-1.0.0",
        "enabled": False,
        "status": "private-review-only",
        "sourceActiveDatasetVersion": active.get("datasetVersion"),
        "zoneCount": len(output_zones),
        "partCount": sum(len(value) if isinstance(value, list) else 1 for value in output_zones.values()),
        "automaticActivationAllowed": False,
        "zones": output_zones,
    }
    report = {
        "schemaVersion": "1.0.0",
        "status": "private-incremental-public-coast-candidate",
        "activeMainZoneCount": len(active_zone_ids),
        "repositoryActiveMainZoneCount": len(repository_active_zone_ids),
        "preservedRepresentedZoneCount": len(set(existing) & active_zone_ids),
        "candidateZoneCount": len(output_zones),
        "candidatePartCount": payload["partCount"],
        "includedRecoveryZoneCount": sum(row["includedInPrivateCandidate"] for row in rows),
        "blockedRecoveryZoneCount": sum(not row["includedInPrivateCandidate"] for row in rows),
        "candidateInputCrossZoneOverlapCount": candidate_overlap_count,
        "automaticActivationAllowed": False,
        "recoveryZones": rows,
    }
    return payload, report


def self_test():
    zones = {"features": [
        {"properties": {"id": "A", "zoneStatus": "active"}},
        {"properties": {"id": "B", "zoneStatus": "active"}},
        {"properties": {"id": "C", "zoneStatus": "active"}},
    ]}
    active = {"datasetVersion": "old", "zones": {"A": [{"partId": "a", "geometry": {"type": "LineString", "coordinates": [[8, 56], [8.1, 56]]}}]}}
    report = {"zones": [
        {"zoneId": "A", "currentName": "A", "proposalStatus": "private-review-parts-generated"},
        {"zoneId": "B", "currentName": "B", "proposalStatus": "blocked-locality-review"},
        {"zoneId": "C", "currentName": "C", "proposalStatus": "blocked-no-retained-source"},
    ]}
    geo = {"features": [{"properties": {"zoneId": "B", "partId": "b"}, "geometry": {"type": "LineString", "coordinates": [[8.2, 56], [8.3, 56]]}}]}
    payload, result = build(zones, active, report, geo)
    assert set(payload["zones"]) == {"A", "B"} and payload["zones"]["A"] == active["zones"]["A"]
    assert result["includedRecoveryZoneCount"] == 1 and result["blockedRecoveryZoneCount"] == 1
    print("Incremental public coast candidate self-test: bestået.")


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--zones", type=Path, default=ROOT / "data" / "zones.geojson")
    parser.add_argument("--active", type=Path, default=ROOT / "data" / "live" / "coastal-parts-v2.json")
    parser.add_argument("--proposal-report", type=Path, default=ROOT / ".geometry-v2-work" / "national-coastal-parts.json")
    parser.add_argument("--proposal-geojson", type=Path, default=ROOT / ".geometry-v2-work" / "national-coastal-parts.geojson")
    parser.add_argument("--output", type=Path, default=ROOT / ".geometry-v2-work" / "incremental-public-coast-candidate.json")
    parser.add_argument("--report", type=Path, default=ROOT / ".geometry-v2-work" / "incremental-public-coast-candidate-report.json")
    parser.add_argument("--self-test", action="store_true")
    args = parser.parse_args()
    if args.self_test:
        self_test()
        return
    payload, report = build(load(args.zones), load(args.active), load(args.proposal_report), load(args.proposal_geojson))
    args.output.write_text(json.dumps(payload, ensure_ascii=False, separators=(",", ":")) + "\n", encoding="utf-8")
    args.report.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({key: report[key] for key in ("candidateZoneCount", "candidatePartCount", "includedRecoveryZoneCount", "blockedRecoveryZoneCount")}, ensure_ascii=False))


if __name__ == "__main__":
    main()
