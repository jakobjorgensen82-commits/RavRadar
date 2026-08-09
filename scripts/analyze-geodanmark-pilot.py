#!/usr/bin/env python3
"""Build a read-only GeoDanmark source QA for coastal geometry-v2.

The output is a private pilot analysis. It never mutates active zones, admin data,
weather inputs or RavScore, and it deliberately stops short of proposing names,
land/water points or production-ready coastline replacements.
"""
from __future__ import annotations

import argparse
import hashlib
import json
from datetime import datetime, timezone
from pathlib import Path

from pyproj import Transformer
from shapely.geometry import LineString, Point, mapping, shape
from shapely.ops import transform, unary_union

ROOT = Path(__file__).resolve().parents[1]
TO_METRES = Transformer.from_crs("EPSG:4326", "EPSG:25832", always_xy=True)
TO_WGS84 = Transformer.from_crs("EPSG:25832", "EPSG:4326", always_xy=True)
SOURCE_WINDOW_METRES = 1000
CURRENT_PROXIMITY_METRES = 2000
REFERENCE_TOLERANCE_METRES = 250
MASK_NEAR_COAST_METRES = 150
RIVER_MOUTH_NEAR_COAST_METRES = 100
MAX_SOURCE_REFS_PER_ZONE_LAYER = 200
MIN_SOURCE_SEGMENT_METRES = 25


def project(geometry):
    return transform(TO_METRES.transform, geometry)


def unproject(geometry):
    return transform(TO_WGS84.transform, geometry)


def load_json(path):
    return json.loads(path.read_text(encoding="utf-8"))


def line_parts(geometry):
    if geometry.is_empty:
        return []
    if geometry.geom_type == "LineString":
        return [geometry]
    if geometry.geom_type in {"MultiLineString", "GeometryCollection"}:
        return [part for child in geometry.geoms for part in line_parts(child)]
    return []


def sample_distances(source_line, reference, interval=250):
    if source_line.is_empty or reference.is_empty or source_line.length <= 0:
        return []
    count = max(2, int(source_line.length // interval) + 1)
    return [
        source_line.interpolate(source_line.length * index / (count - 1)).distance(reference)
        for index in range(count)
    ]


def rounded_distance_summary(values):
    if not values:
        return {"sampleCount": 0, "meanM": None, "maxM": None}
    return {
        "sampleCount": len(values),
        "meanM": round(sum(values) / len(values), 2),
        "maxM": round(max(values), 2),
    }


def source_id(feature):
    props = feature.get("properties") or {}
    return str(props.get("id_lokalId") or props.get("objectid") or "unknown")


def zone_records(zones, pilot_areas):
    by_id = {
        feature.get("properties", {}).get("id"): feature
        for feature in zones.get("features", [])
        if feature.get("properties", {}).get("zoneStatus") == "active"
    }
    records = []
    for area in pilot_areas.get("areas") or []:
        for zone_id in area.get("zoneIds") or []:
            feature = by_id.get(zone_id)
            if not feature:
                raise SystemExit(f"Centralt hydreret pilotzone mangler: {zone_id}")
            props = feature.get("properties") or {}
            current_coords = props.get("coastLine") or []
            if len(current_coords) < 2:
                raise SystemExit(f"Pilotzone mangler eksisterende kystlinje: {zone_id}")
            polygon = project(shape(feature.get("geometry")))
            current = project(LineString(current_coords))
            records.append({
                "areaId": area["id"],
                "zoneId": zone_id,
                "name": props.get("name"),
                "coastType": props.get("coastType"),
                "polygon": polygon,
                "current": current,
                "properties": props,
                "window": polygon.buffer(SOURCE_WINDOW_METRES),
                "source": [],
                "masks": {},
            })
    return records


def load_area_layer(work_dir, area_id, layer):
    path = work_dir / area_id / f"{layer}.geojson"
    if not path.exists():
        raise SystemExit(f"GeoDanmark-pilotlaget mangler: {area_id}/{layer}.geojson")
    document = load_json(path)
    return path, document.get("features") or []


def collect_source_coast(records, work_dir):
    for area_id in sorted({record["areaId"] for record in records}):
        path, features = load_area_layer(work_dir, area_id, "Kyst")
        area_records = [record for record in records if record["areaId"] == area_id]
        for feature in features:
            geometry = project(shape(feature.get("geometry")))
            if geometry.is_empty:
                continue
            feature_id = source_id(feature)
            for record in area_records:
                if not geometry.intersects(record["window"]):
                    continue
                clipped = geometry.intersection(record["window"])
                clipped = clipped.intersection(record["current"].buffer(CURRENT_PROXIMITY_METRES))
                for part in line_parts(clipped):
                    if part.length >= 5:
                        record["source"].append((feature_id, part))
        for record in area_records:
            record["sourceFile"] = path.name


def raw_line_endpoints(geometry_mapping):
    geometry_type = geometry_mapping.get("type")
    coordinates = geometry_mapping.get("coordinates") or []
    lines = [coordinates] if geometry_type == "LineString" else coordinates if geometry_type == "MultiLineString" else []
    endpoints = []
    for line in lines:
        if len(line) >= 2:
            endpoints.extend((line[0], line[-1]))
    return endpoints


def bounds_intersect(left, right):
    return not (left[2] < right[0] or right[2] < left[0] or left[3] < right[1] or right[3] < left[1])


def collect_context_layers(records, work_dir):
    layer_rules = {
        "Havn": "near-physical-coast",
        "Vandloebskant": "endpoint-near-physical-coast",
        "Vandloebsmidte": "endpoint-near-physical-coast",
        "Hoefde": "near-physical-coast",
        "SandKlit": "near-physical-coast",
        "Skraent": "near-physical-coast",
    }
    for area_id in sorted({record["areaId"] for record in records}):
        area_records = [record for record in records if record["areaId"] == area_id]
        for layer, rule in layer_rules.items():
            _, features = load_area_layer(work_dir, area_id, layer)
            for record in area_records:
                record["masks"][layer] = {"featureCount": 0, "sourceRefs": []}
            for feature in features:
                feature_id = source_id(feature)
                raw_geometry = feature.get("geometry") or {}
                if rule == "endpoint-near-physical-coast":
                    projected_endpoints = [Point(*TO_METRES.transform(*point[:2])) for point in raw_line_endpoints(raw_geometry)]
                    relevant_records = [
                        record for record in area_records
                        if any(point.distance(record["sourceUnion"]) <= RIVER_MOUTH_NEAR_COAST_METRES for point in projected_endpoints)
                    ]
                else:
                    wgs_geometry = shape(raw_geometry)
                    candidate_records = [
                        record for record in area_records
                        if bounds_intersect(wgs_geometry.bounds, record["sourceWgsBounds"])
                    ]
                    if not candidate_records:
                        continue
                    geometry = project(wgs_geometry)
                    relevant_records = [
                        record for record in candidate_records
                        if geometry.distance(record["sourceUnion"]) <= MASK_NEAR_COAST_METRES
                    ]
                for record in relevant_records:
                    source_union = record.get("sourceUnion")
                    if source_union is None or source_union.is_empty:
                        continue
                    entry = record["masks"][layer]
                    entry["featureCount"] += 1
                    if len(entry["sourceRefs"]) < MAX_SOURCE_REFS_PER_ZONE_LAYER:
                        entry["sourceRefs"].append(feature_id)


def finalise_source(records):
    for record in records:
        record["sourceUnion"] = unary_union([geometry for _, geometry in record["source"]]) if record["source"] else LineString()
        record["sourceWgsBounds"] = unproject(record["sourceUnion"].buffer(MASK_NEAR_COAST_METRES)).bounds if not record["sourceUnion"].is_empty else (0, 0, 0, 0)


def build_outputs(records, report_source_hash):
    rows = []
    map_features = []
    for record in records:
        current = record["current"]
        source_union = record["sourceUnion"]
        current_distances = sample_distances(current, source_union)
        source_distances = sample_distances(source_union, current)
        covered_length = current.intersection(source_union.buffer(REFERENCE_TOLERANCE_METRES)).length if not source_union.is_empty else 0
        coverage_ratio = covered_length / current.length if current.length else 0
        source_parts = line_parts(source_union)
        source_refs = sorted({feature_id for feature_id, _ in record["source"]})
        source_segment_triage = []
        for index, (feature_id, segment) in enumerate(record["source"], start=1):
            if segment.length < MIN_SOURCE_SEGMENT_METRES:
                continue
            segment_covered = segment.intersection(current.buffer(REFERENCE_TOLERANCE_METRES)).length
            segment_ratio = segment_covered / segment.length if segment.length else 0
            if segment_ratio >= 0.8:
                review_class = "existing-alignment-reference"
            elif segment_ratio >= 0.2:
                review_class = "partial-alignment-review"
            else:
                review_class = "semantic-boundary-review"
            segment_id = f"{record['zoneId'].casefold()}-source-{len(source_segment_triage) + 1:03d}"
            source_segment_triage.append({
                "segmentId": segment_id,
                "sourceRef": feature_id,
                "lengthM": round(segment.length, 1),
                "nearCurrentRatio250m": round(segment_ratio, 6),
                "distanceToCurrent": rounded_distance_summary(sample_distances(segment, current)),
                "reviewClass": review_class,
                "automaticProposalAllowed": False,
            })
            map_features.append({
                "type": "Feature",
                "properties": {
                    "zoneId": record["zoneId"],
                    "segmentId": segment_id,
                    "kind": "geodanmark-source-segment-triage",
                    "reviewClass": review_class,
                    "automaticProposalAllowed": False,
                },
                "geometry": mapping(unproject(segment)),
            })
        props = record["properties"]
        admin_override = str(props.get("coastLineSource") or "").startswith("admin-")
        flags = []
        if coverage_ratio < 0.8:
            flags.append("current-coast-less-than-80-percent-near-geodanmark")
        if not current_distances or max(current_distances) > 1000:
            flags.append("current-coast-has-point-over-1000m-from-geodanmark")
        if len(source_parts) > 25:
            flags.append("source-candidate-highly-fragmented")
        if admin_override:
            flags.append("central-admin-coastline-requires-conflict-review")
        rows.append({
            "areaId": record["areaId"],
            "zoneId": record["zoneId"],
            "currentName": record["name"],
            "coastType": record["coastType"],
            "analysisStatus": "flagged" if flags else "source-reference-ready",
            "adminOverlayStatus": "conflict-review-required" if admin_override else "preserved",
            "currentCoastLineSource": props.get("coastLineSource"),
            "currentDirectionAnchorCount": len(props.get("directionAnchors") or []) or 1,
            "currentCoastLengthKm": round(current.length / 1000, 3),
            "candidateSourceLengthKm": round(source_union.length / 1000, 3),
            "candidateSourcePartCount": len(source_parts),
            "candidateSourceObjectCount": len(source_refs),
            "candidateSourceRefs": source_refs[:MAX_SOURCE_REFS_PER_ZONE_LAYER],
            "sourceSegmentTriage": source_segment_triage,
            "currentNearSourceRatio250m": round(coverage_ratio, 6),
            "currentToSourceDistance": rounded_distance_summary(current_distances),
            "sourceToCurrentDistance": rounded_distance_summary(source_distances),
            "nearCoastContext": record["masks"],
            "qualityFlags": flags,
            "limitations": [
                "Kandidatlinjen er kun fysisk GeoDanmark-reference nær den eksisterende kystlinje.",
                "Havne og vandløb er registreret som reviewkontekst, ikke endnu automatisk fratrukket.",
                "Der foreslås ikke nye navne, zonegrænser eller land-/vandpunkter i denne fase.",
            ],
        })
        map_features.extend([
            {
                "type": "Feature",
                "properties": {"zoneId": record["zoneId"], "kind": "current-coast", "status": "production-reference-only"},
                "geometry": mapping(unproject(current)),
            },
            {
                "type": "Feature",
                "properties": {"zoneId": record["zoneId"], "kind": "geodanmark-source-candidate", "status": "private-review-only"},
                "geometry": mapping(unproject(source_union)),
            },
        ])
    return {
        "schemaVersion": "1.0.0",
        "status": "private-read-only-source-qa",
        "generatedAt": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
        "source": "GeoDanmark Vektor WFS current entity layers",
        "sourceReportSha256": report_source_hash,
        "zoneCount": len(rows),
        "scoreChanged": False,
        "productionGeometryChanged": False,
        "zones": rows,
    }, {"type": "FeatureCollection", "features": map_features}


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--work-dir", type=Path, default=ROOT / ".geometry-v2-work")
    parser.add_argument("--pilot-areas", type=Path, default=ROOT / "data" / "geometry-v2" / "pilot-areas.json")
    parser.add_argument("--report", type=Path, default=ROOT / "data" / "diagnostics" / "geodanmark-pilot-report.json")
    parser.add_argument("--self-test", action="store_true")
    parser.add_argument("--allow-external-private-work-dir", action="store_true", help=argparse.SUPPRESS)
    args = parser.parse_args()
    if args.self_test:
        line = LineString([(0, 0), (1000, 0)])
        reference = LineString([(0, 100), (1000, 100)])
        distances = sample_distances(line, reference, interval=250)
        assert distances and all(round(value) == 100 for value in distances)
        assert len(line_parts(unary_union([line]))) == 1
        assert MIN_SOURCE_SEGMENT_METRES > 0
        print("GeoDanmark source-QA self-test: bestået.")
        return
    work_dir = args.work_dir.resolve()
    if ROOT not in work_dir.parents and not args.allow_external_private_work_dir:
        raise SystemExit("Pilotens arbejdsmappe skal ligge i workspace.")
    zones_path = work_dir / "effective-pilot-zones.geojson"
    if not zones_path.exists():
        raise SystemExit("Den centralt hydrerede pilot-zonebestand mangler.")
    report_bytes = args.report.resolve().read_bytes()
    records = zone_records(load_json(zones_path), load_json(args.pilot_areas.resolve()))
    collect_source_coast(records, work_dir)
    finalise_source(records)
    collect_context_layers(records, work_dir)
    report, map_collection = build_outputs(records, hashlib.sha256(report_bytes).hexdigest())
    (work_dir / "coastal-source-qa.json").write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    (work_dir / "coastal-source-qa.geojson").write_text(json.dumps(map_collection, ensure_ascii=False, separators=(",", ":")) + "\n", encoding="utf-8")
    print(f"GeoDanmark source-QA genereret read-only for {len(records)} centralt hydrerede pilotzoner.")


if __name__ == "__main__":
    main()
