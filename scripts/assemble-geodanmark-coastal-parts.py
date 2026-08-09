#!/usr/bin/env python3
"""Assemble conservative, private coastal-part review proposals.

The script consumes the centrally hydrated pilot and classified GeoDanmark
source pieces. It excludes harbour edges and coastal river mouths, but never
activates geometry, renames a zone, creates weather sampling points or changes
RavScore. Semantic/boundary-review source pieces are deliberately not assembled.
"""
from __future__ import annotations

import argparse
import hashlib
import json
from datetime import datetime, timezone
from pathlib import Path

from pyproj import Transformer
from shapely import snap
from shapely.geometry import LineString, Point, mapping, shape
from shapely.ops import linemerge, transform, unary_union

ROOT = Path(__file__).resolve().parents[1]
TO_METRES = Transformer.from_crs("EPSG:4326", "EPSG:25832", always_xy=True)
TO_WGS84 = Transformer.from_crs("EPSG:25832", "EPSG:4326", always_xy=True)


def load_json(path):
    return json.loads(path.read_text(encoding="utf-8"))


def project(geometry):
    return transform(TO_METRES.transform, geometry)


def unproject(geometry):
    return transform(TO_WGS84.transform, geometry)


def line_parts(geometry):
    if geometry.is_empty:
        return []
    if geometry.geom_type in {"LineString", "LinearRing"}:
        return [LineString(geometry.coords)]
    if geometry.geom_type in {"MultiLineString", "GeometryCollection"}:
        return [part for child in geometry.geoms for part in line_parts(child)]
    return []


def source_ref(feature):
    props = feature.get("properties") or {}
    return str(props.get("id_lokalId") or props.get("objectid") or "unknown")


def load_layer(work_dir, area_id, layer):
    path = work_dir / area_id / f"{layer}.geojson"
    if not path.exists():
        raise SystemExit(f"Pilotlaget mangler: {area_id}/{layer}.geojson")
    return load_json(path).get("features") or []


def prepare_linear_features(features):
    prepared = []
    for feature in features:
        geometry = project(shape(feature.get("geometry")))
        if not geometry.is_empty:
            prepared.append((source_ref(feature), geometry, feature.get("properties") or {}))
    return prepared


def nearby_bounds(left, right, margin):
    return not (left[2] + margin < right[0] or right[2] + margin < left[0] or left[3] + margin < right[1] or right[3] + margin < left[1])


def build_exclusion_mask(candidate, harbour_features, river_features, official_water_features, settings):
    harbour_hits = []
    for feature_id, geometry, _ in harbour_features:
        if not nearby_bounds(candidate.bounds, geometry.bounds, settings["harbourBufferM"]):
            continue
        if geometry.distance(candidate) <= settings["harbourBufferM"]:
            harbour_hits.append((feature_id, geometry))
    mouth_candidates = []
    for feature_id, geometry, props in river_features:
        if props.get("vandloebstype") == "Rørlagt" or props.get("synligVandloebsmidte") is False:
            continue
        if geometry.length < settings["riverMouthMinimumInlandReachM"]:
            continue
        if not nearby_bounds(candidate.bounds, geometry.bounds, settings["riverMouthSearchM"]):
            continue
        for line in line_parts(geometry):
            endpoints = [Point(line.coords[0]), Point(line.coords[-1])]
            distances = [point.distance(candidate) for point in endpoints]
            mouth_index = 0 if distances[0] <= distances[1] else 1
            if distances[mouth_index] <= settings["riverMouthSearchM"] and distances[1 - mouth_index] >= settings["riverMouthMinimumInlandReachM"]:
                mouth_candidates.append((feature_id, endpoints[mouth_index]))
    clusters = []
    for feature_id, point in sorted(mouth_candidates, key=lambda item: (item[1].x, item[1].y, item[0])):
        cluster = next((item for item in clusters if item["point"].distance(point) <= settings["riverMouthClusterM"]), None)
        if cluster:
            cluster["refs"].append(feature_id)
        else:
            clusters.append({"point": point, "refs": [feature_id]})
    river_hits = [(ref, cluster["point"]) for cluster in clusters for ref in sorted(set(cluster["refs"]))]
    official_hits = []
    for feature_id, geometry, props in official_water_features:
        if not nearby_bounds(candidate.bounds, geometry.bounds, settings["officialWaterMaskBufferM"]):
            continue
        buffered = geometry.buffer(settings["officialWaterMaskBufferM"])
        if buffered.intersects(candidate):
            official_hits.append((feature_id, buffered, props))
    masks = [geometry.buffer(settings["harbourBufferM"]) for _, geometry in harbour_hits]
    masks += [cluster["point"].buffer(settings["riverMouthBufferM"]) for cluster in clusters]
    masks += [geometry for _, geometry, _ in official_hits]
    return unary_union(masks) if masks else None, harbour_hits, river_hits, official_hits


def assemble_zone(zone_id, area_id, triage_features, policy, harbour_features, river_features, official_water_features):
    allowed = set(policy["allowedSourceReviewClasses"])
    eligible = [
        (feature, project(shape(feature["geometry"])))
        for feature in triage_features
        if feature.get("properties", {}).get("zoneId") == zone_id
        and feature.get("properties", {}).get("reviewClass") in allowed
    ]
    excluded_semantic_count = sum(
        1 for feature in triage_features
        if feature.get("properties", {}).get("zoneId") == zone_id
        and feature.get("properties", {}).get("reviewClass") not in allowed
    )
    if not eligible:
        return [], {
            "eligibleSourceSegmentCount": 0,
            "excludedSemanticSegmentCount": excluded_semantic_count,
            "removedByMasksM": 0,
            "harbourFeatureRefs": [],
            "riverMouthFeatureRefs": [],
            "officialInnerWaterRefs": [],
            "officialInnerWaterNames": [],
        }, None
    candidate = unary_union([geometry for _, geometry in eligible])
    mask, harbour_hits, river_hits, official_hits = build_exclusion_mask(candidate, harbour_features, river_features, official_water_features, policy)
    clipped = candidate.difference(mask) if mask is not None else candidate
    removed = max(0.0, candidate.length - clipped.length)
    merged = linemerge(snap(clipped, clipped, policy["assemblySnapToleranceM"]))
    fragments = [part for part in line_parts(merged) if part.length >= policy["minimumCoastalPartLengthM"]]
    groups = []
    for fragment in sorted(fragments, key=lambda item: item.bounds):
        touching = [index for index, group in enumerate(groups) if unary_union(group).distance(fragment) <= policy["coastalPartGroupingGapM"]]
        if not touching:
            groups.append([fragment])
            continue
        target = touching[0]
        groups[target].append(fragment)
        for index in reversed(touching[1:]):
            groups[target].extend(groups.pop(index))
    parts = []
    grouped_geometries = [unary_union(group) for group in groups]
    for geometry in sorted(grouped_geometries, key=lambda item: (-item.length, item.bounds)):
        supporting = [
            feature.get("properties", {}) for feature, source_geometry in eligible
            if source_geometry.distance(geometry) <= policy["assemblySnapToleranceM"]
        ]
        classes = sorted({item.get("reviewClass") for item in supporting})
        parts.append({
            "geometry": geometry,
            "sourceSegmentIds": sorted({item.get("segmentId") for item in supporting}),
            "sourceReviewClasses": classes,
            "reviewClass": "mixed-alignment-review" if "partial-alignment-review" in classes else "alignment-supported-review",
            "fragmentCount": len(line_parts(geometry)),
        })
    audit = {
        "eligibleSourceSegmentCount": len(eligible),
        "excludedSemanticSegmentCount": excluded_semantic_count,
        "sourceLengthBeforeMasksM": round(candidate.length, 1),
        "removedByMasksM": round(removed, 1),
        "harbourFeatureRefs": sorted({ref for ref, _ in harbour_hits}),
        "riverMouthFeatureRefs": sorted({ref for ref, _ in river_hits}),
        "officialInnerWaterRefs": sorted({ref for ref, _, _ in official_hits}),
        "officialInnerWaterNames": sorted({str(props.get("primaryName")) for _, _, props in official_hits}),
    }
    return parts, audit, mask


def build_output(work_dir, pilot, policy_document):
    zones = load_json(work_dir / "effective-pilot-zones.geojson")
    qa_geojson = load_json(work_dir / "coastal-source-qa.geojson")
    qa_json = load_json(work_dir / "coastal-source-qa.json")
    water_exclusions = load_json(work_dir / "official-water-exclusions.geojson")
    geographic_review = load_json(ROOT / "data" / "geometry-v2" / "pilot-geographic-review.json")
    zone_features = {feature.get("properties", {}).get("id"): feature for feature in zones.get("features") or []}
    triage = [feature for feature in qa_geojson.get("features") or [] if feature.get("properties", {}).get("kind") == "geodanmark-source-segment-triage"]
    defaults = policy_document["defaults"]
    output_features = []
    rows = []
    for area in pilot.get("areas") or []:
        area_id = area["id"]
        area_policy = {**defaults, **policy_document["areas"][area_id]}
        harbours = prepare_linear_features(load_layer(work_dir, area_id, "Havn"))
        # Midterlinjen giver én revisionsbar munding pr. vandløb. Vandløbskanter
        # er ofte to parallelle bredder og må ikke skabe dobbelte udskæringer.
        rivers = prepare_linear_features(load_layer(work_dir, area_id, "Vandloebsmidte"))
        official_waters = [
            (str(feature.get("properties", {}).get("officialPlaceId") or "unknown"), project(shape(feature["geometry"])), feature.get("properties") or {})
            for feature in water_exclusions.get("features") or []
            if feature.get("properties", {}).get("areaId") == area_id
        ]
        for zone_id in area.get("zoneIds") or []:
            if zone_id not in zone_features:
                raise SystemExit(f"Centralt hydreret pilotzone mangler: {zone_id}")
            parts, audit, exclusion_mask = assemble_zone(zone_id, area_id, triage, area_policy, harbours, rivers, official_waters)
            part_rows = []
            for index, part in enumerate(parts, start=1):
                part_id = f"{zone_id.casefold()}-coastal-part-{index:02d}"
                properties = {
                    "zoneId": zone_id,
                    "partId": part_id,
                    "kind": "private-coastal-part-proposal",
                    "reviewClass": part["reviewClass"],
                    "sourceSegmentIds": part["sourceSegmentIds"],
                    "sourceReviewClasses": part["sourceReviewClasses"],
                    "fragmentCount": part["fragmentCount"],
                    "geometryMayBeMultipart": part["fragmentCount"] > 1,
                    "automaticActivationAllowed": False,
                    "weatherSamplingEnabled": False,
                    "scoreChanged": False,
                }
                output_features.append({"type": "Feature", "properties": properties, "geometry": mapping(unproject(part["geometry"]))})
                part_rows.append({**properties, "lengthM": round(part["geometry"].length, 1)})
            if exclusion_mask is not None and not exclusion_mask.is_empty:
                review_mask = exclusion_mask.intersection(unary_union([
                    project(shape(feature["geometry"])) for feature in triage
                    if feature.get("properties", {}).get("zoneId") == zone_id
                ]).buffer(300))
                output_features.append({
                    "type": "Feature",
                    "properties": {
                        "zoneId": zone_id,
                        "kind": "private-exclusion-mask",
                        "harbourRefCount": len(audit["harbourFeatureRefs"]),
                        "riverMouthRefCount": len(audit["riverMouthFeatureRefs"]),
                        "officialInnerWaterRefs": audit["officialInnerWaterRefs"],
                        "automaticActivationAllowed": False,
                    },
                    "geometry": mapping(unproject(review_mask)),
                })
            rows.append({
                "areaId": area_id,
                "zoneId": zone_id,
                "currentName": zone_features[zone_id].get("properties", {}).get("name"),
                "fjordPolicy": area_policy["fjordPolicy"],
                "policyNote": area_policy["note"],
                "proposalStatus": "manual-geographic-review-required",
                "geographicReview": geographic_review["zones"][zone_id],
                "coastalPartCount": len(part_rows),
                "coastalParts": part_rows,
                "exclusionAudit": audit,
                "landWaterPointsProposed": False,
                "automaticActivationAllowed": False,
            })
    source_hash = hashlib.sha256((work_dir / "coastal-source-qa.geojson").read_bytes()).hexdigest()
    report = {
        "schemaVersion": "1.0.0",
        "status": "private-read-only-coastal-part-proposals",
        "generatedAt": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
        "sourceQaSha256": source_hash,
        "sourceQaSchemaVersion": qa_json.get("schemaVersion"),
        "zoneCount": len(rows),
        "coastalPartCount": sum(row["coastalPartCount"] for row in rows),
        "nextStageAllowedZoneCount": sum(1 for row in rows if row["geographicReview"].get("nextStageAllowed")),
        "productionGeometryChanged": False,
        "adminDataChanged": False,
        "scoreChanged": False,
        "weatherSamplingChanged": False,
        "automaticActivationAllowed": False,
        "zones": rows,
    }
    return report, {"type": "FeatureCollection", "features": output_features}


def self_test():
    settings = {
        "harbourBufferM": 30,
        "riverMouthBufferM": 40,
        "riverMouthSearchM": 100,
        "riverMouthMinimumInlandReachM": 30,
        "riverMouthClusterM": 80,
        "officialWaterMaskBufferM": 10,
        "assemblySnapToleranceM": 15,
        "coastalPartGroupingGapM": 120,
        "minimumCoastalPartLengthM": 50,
        "allowedSourceReviewClasses": ["existing-alignment-reference", "partial-alignment-review"],
    }
    feature = lambda segment_id, review_class, coords: {"type": "Feature", "properties": {"zoneId": "Z", "segmentId": segment_id, "reviewClass": review_class}, "geometry": {"type": "LineString", "coordinates": coords}}
    global TO_METRES, TO_WGS84
    original_to_metres, original_to_wgs84 = TO_METRES, TO_WGS84
    TO_METRES = Transformer.from_crs("EPSG:25832", "EPSG:25832", always_xy=True)
    TO_WGS84 = TO_METRES
    try:
        triage = [feature("keep", "existing-alignment-reference", [(0, 0), (200, 0)]), feature("reject", "semantic-boundary-review", [(0, 20), (200, 20)])]
        harbour = prepare_linear_features([{"type": "Feature", "properties": {"id_lokalId": "h1"}, "geometry": {"type": "LineString", "coordinates": [(90, 0), (110, 0)]}}])
        parts, audit, mask = assemble_zone("Z", "A", triage, settings, harbour, [], [])
        assert audit["eligibleSourceSegmentCount"] == 1 and audit["excludedSemanticSegmentCount"] == 1
        assert audit["removedByMasksM"] > 0 and audit["harbourFeatureRefs"] == ["h1"]
        assert mask is not None and audit["officialInnerWaterRefs"] == []
        assert len(parts) == 1 and parts[0]["fragmentCount"] == 2
        assert parts[0]["reviewClass"] == "alignment-supported-review"
        review = load_json(ROOT / "data" / "geometry-v2" / "pilot-geographic-review.json")
        assert len(review["zones"]) == 9
        assert sum(1 for row in review["zones"].values() if row.get("nextStageAllowed")) == 1
    finally:
        TO_METRES, TO_WGS84 = original_to_metres, original_to_wgs84
    print("Kontrolleret samling af private kystdele self-test: bestået.")


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--work-dir", type=Path, default=ROOT / ".geometry-v2-work")
    parser.add_argument("--pilot-areas", type=Path, default=ROOT / "data" / "geometry-v2" / "pilot-areas.json")
    parser.add_argument("--policy", type=Path, default=ROOT / "data" / "geometry-v2" / "pilot-exclusion-policy.json")
    parser.add_argument("--self-test", action="store_true")
    parser.add_argument("--allow-external-private-work-dir", action="store_true", help=argparse.SUPPRESS)
    args = parser.parse_args()
    if args.self_test:
        self_test()
        return
    work_dir = args.work_dir.resolve()
    if ROOT not in work_dir.parents and not args.allow_external_private_work_dir:
        raise SystemExit("Pilotens arbejdsmappe skal ligge i workspace.")
    required = ("effective-pilot-zones.geojson", "coastal-source-qa.json", "coastal-source-qa.geojson", "official-water-exclusions.geojson")
    if any(not (work_dir / name).exists() for name in required):
        raise SystemExit("Den centralt hydrerede zonebestand eller source-QA mangler.")
    report, geojson = build_output(work_dir, load_json(args.pilot_areas.resolve()), load_json(args.policy.resolve()))
    (work_dir / "coastal-part-proposals.json").write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    (work_dir / "coastal-part-proposals.geojson").write_text(json.dumps(geojson, ensure_ascii=False, separators=(",", ":")) + "\n", encoding="utf-8")
    print(f"Private kystdelsforslag genereret for {report['zoneCount']} zoner / {report['coastalPartCount']} dele; manuel review kræves.")


if __name__ == "__main__":
    main()
