"""Read-only coastal-field diagnosis: road/shore context, native GEUS and WFS.

The latitude cut-offs are an explicit research selection, not find boundaries.
No network, source repairs, buffers, model changes or amber probability.
"""
import argparse
from collections import defaultdict
import gzip
import json
from pathlib import Path
import sys

import pyproj
import shapely
from shapely import line_merge, union_all
from shapely.geometry import LineString, Polygon, box, mapping
from shapely.ops import transform

from audit_stenstrup_contacts import ROOT, checked_cache, digest, geometries
from audit_stenstrup_field_context import source_features, crop_context, polygonal
from audit_profile_points import EXPECTED_MANIFEST

EXPECTED_ROAD = "be48a870fb048b1e0009816562e017c9bb7ee7d3d09210647acf7403987e7078"
EXPECTED_RULES = "655b5c50a212d43fa65c536731553399b8608ed93653665fd6f9e852e4ee9bed"
EXPECTED_MODEL = "1d7290f7adff65af5fc8b726f7f60548467ef921128c8ce74626b9f4ec1546b9"
LATITUDE_CUTS = (57.1538585, 57.2038844)


def corridor(source_dir):
    raw = gzip.decompress((source_dir / "asaa-route-coast.json.gz").read_bytes())
    import hashlib
    if hashlib.sha256(raw).hexdigest() != EXPECTED_ROAD:
        raise ValueError("Archived minimal OSM projection changed")
    data = json.loads(raw)
    lines = {}
    for key in ("road", "coast"):
        selected = [e for e in data["elements"]
                    if (e["tags"].get("ref") == "541") == (key == "road")]
        geometry = line_merge(union_all([
            LineString([(p["lon"], p["lat"]) for p in e["geometry"]])
            for e in selected], grid_size=0))
        if geometry.geom_type != "LineString" or not geometry.is_simple:
            raise ValueError("Road/coast does not form a single simple source line")
        lines[key] = geometry
    road, coast = [list(lines[key].coords) for key in ("road", "coast")]
    if road[0][1] > road[-1][1]:
        road.reverse()
    if coast[0][1] < coast[-1][1]:
        coast.reverse()
    envelope = Polygon(road + coast)
    if not envelope.is_valid:
        raise ValueError("Invalid road-to-coast envelope; no automatic repair")
    band = box(10.38, LATITUDE_CUTS[0], 10.53, LATITUDE_CUTS[1])
    selected = polygonal(envelope.intersection(band))
    project = pyproj.Transformer.from_crs(4326, 25832, always_xy=True).transform
    return transform(project, selected), data, {
        key: transform(project, line.intersection(band)) for key, line in lines.items()}


def selected_native(source_root, key, region):
    meta, path, binding = checked_cache(source_root, key)
    result = []
    for attrs, source_id, geometry in geometries(meta, path):
        if not geometry.envelope.intersects(region.envelope):
            continue
        cut = polygonal(geometry.intersection(region, grid_size=0))
        if cut.area:
            if not geometry.is_valid or not cut.is_valid:
                raise ValueError(f"Invalid native regional geometry: {key}/{source_id}")
            result.append((attrs, source_id, cut))
    return result, binding


def dissolved(parts):
    return {key: union_all(items, grid_size=0) for key, items in parts.items()}


def rows(groups, total):
    return [{"key": list(key) if isinstance(key, tuple) else key,
             "area_km2": round(geometry.area / 1e6, 9),
             "percentOfCorridor": round(100 * geometry.area / total, 6)}
            for key, geometry in sorted(groups.items(), key=lambda item: -item[1].area)]


def run(source_root, source_dir, geometry_path):
    for path, expected in ((ROOT / "data/jordrav/model-rules.json", EXPECTED_RULES),
                           (ROOT / "scripts/lib/jordrav_model.py", EXPECTED_MODEL),
                           (ROOT / "data/jordrav/prototype-0.1.0/manifest.json", EXPECTED_MANIFEST)):
        if digest(path) != expected:
            raise ValueError(f"Frozen model identity changed: {path.name}")
    sys.path.insert(0, str(ROOT / "scripts"))
    from lib.jordrav_model import classify
    region, road_data, lines = corridor(source_dir)
    soil, soil_binding = selected_native(source_root, "soil", region)
    landscape, landscape_binding = selected_native(source_root, "geomorphology", region)
    by_soil, by_landscape, by_class, by_pair = [defaultdict(list) for _ in range(4)]
    for attrs, _source_id, cut in soil:
        by_soil[(attrs["jsym1"], attrs["jsym2"])].append(cut)
    for attrs, _source_id, cut in landscape:
        by_landscape[attrs["landskab"]].append(cut)
    for attrs_s, _soil_id, cut_s in soil:
        for attrs_g, _geom_id, cut_g in landscape:
            cut = polygonal(cut_s.intersection(cut_g, grid_size=0))
            if not cut.area:
                continue
            upper, depth, label = attrs_s["jsym1"], attrs_s["jsym2"], attrs_g["landskab"]
            category = classify(upper, depth, label)["potential"]
            by_class[category].append(cut)
            by_pair[(upper, depth, label, category)].append(cut)
    soil_groups, landscape_groups, classes, pairs = map(dissolved,
        (by_soil, by_landscape, by_class, by_pair))
    soil_union = union_all([g for _a, _i, g in soil], grid_size=0)
    landscape_union = union_all([g for _a, _i, g in landscape], grid_size=0)
    common = soil_union.intersection(landscape_union, grid_size=0)
    class_union = union_all(list(classes.values()), grid_size=0)
    partition_delta = sum(g.area for g in classes.values()) - common.area
    pair_delta = sum(g.area for g in pairs.values()) - common.area
    if max(abs(partition_delta), abs(pair_delta), common.difference(class_union).area) > 1:
        raise ValueError("Classification partition does not agree with common native coverage")
    fields, field_binding = source_features(source_dir, "asaa-fields2026", ("Afgkode", "Afgroede"))
    # Server query must cover the whole selected corridor, not just town centres.
    from urllib.parse import urlsplit, parse_qs
    bounds = parse_qs(urlsplit(field_binding["url"]).query)["bbox"][0].split(",")
    if not box(*map(float, bounds[:4])).covers(region):
        raise ValueError("WFS query box does not cover the road/shore selection")
    crop_parts, crop_rows = defaultdict(list), []
    for attrs, field in fields:
        cut = polygonal(field.intersection(region, grid_size=0))
        if not cut.area:
            continue
        context = crop_context(attrs)
        crop_parts[context].append(cut)
        crop_rows.append({"cropCode": attrs["Afgkode"], "cropLabel": attrs["Afgroede"],
                          "context": context, "area_km2": round(cut.area / 1e6, 9)})
    crops = dissolved(crop_parts)
    field_union = union_all(list(crops.values()), grid_size=0)
    selected_label = "Udvalgte korn-, majs-, raps- og andre dyrkningsafgrøder"
    selected_fields = crops.get(selected_label, Polygon())
    pair_on_fields = {key: polygonal(g.intersection(selected_fields, grid_size=0))
                      for key, g in pairs.items()}
    pair_on_fields = {key: g for key, g in pair_on_fields.items() if g.area}
    features = [{"type": "Feature", "properties": {"kind": "corridor"}, "geometry": mapping(region)}]
    for kind, groups in (("soil", soil_groups), ("landscape", landscape_groups),
                         ("class", classes), ("crop", crops)):
        for key, geom in groups.items():
            features.append({"type": "Feature", "properties": {"kind": kind,
                "key": list(key) if isinstance(key, tuple) else key}, "geometry": mapping(geom)})
    for kind, geom in lines.items():
        features.append({"type": "Feature", "properties": {"kind": kind}, "geometry": mapping(geom)})
    geometry_path.write_text(json.dumps({"type": "FeatureCollection", "crs": {
        "type": "name", "properties": {"name": "EPSG:25832"}}, "features": features},
        ensure_ascii=False, separators=(",", ":")) + "\n", encoding="utf-8", newline="\n")
    return {
        "status": "PASS", "scope": "Bound public source geometry, field context and existing rule diagnosis; no amber or plough-access verification",
        "modelVersion": "0.1.0-prototype", "rulesSha256": EXPECTED_RULES,
        "modelSha256": EXPECTED_MODEL, "manifestSha256": EXPECTED_MANIFEST,
        "scriptSha256": digest(Path(__file__)), "geometrySha256": digest(geometry_path),
        "sharedScriptSha256": {name: digest(Path(__file__).with_name(name)) for name in
            ("audit_stenstrup_contacts.py", "audit_stenstrup_field_context.py", "audit_profile_points.py")},
        "software": {"shapely": shapely.__version__, "pyproj": pyproj.__version__},
        "sourceBindings": [soil_binding, landscape_binding], "fieldBinding": field_binding,
        "roadCoastBinding": {"minimalProjectionSha256": EXPECTED_ROAD,
            "request": road_data["source"], "retrievedAt": road_data["retrievedAt"],
            "license": road_data["license"], "selectedWayIds": [e["id"] for e in road_data["elements"]],
            "notAnUnmodifiedApiResponse": True},
        "selection": {"latitudeCuts": list(LATITUDE_CUTS), "area_km2": round(region.area / 1e6, 9),
            "definition": "East of route 541 (Saebyvej/Oestkystvejen), west of archived OSM coastline, within explicit latitude cuts",
            "findBoundary": False, "wholeReportedCorridorVerified": False,
            "coordinateGridIsPositionalAccuracy": False},
        "nativeCoverage": {"soil_km2": round(soil_union.area / 1e6, 9),
            "landscape_km2": round(landscape_union.area / 1e6, 9),
            "common_km2": round(common.area / 1e6, 9),
            "soilGapAgainstOsmCorridor_m2": round(region.difference(soil_union).area, 6),
            "landscapeGapAgainstOsmCorridor_m2": round(region.difference(landscape_union).area, 6),
            "soilOverlap_m2": round(sum(g.area for _a, _i, g in soil) - soil_union.area, 6),
            "landscapeOverlap_m2": round(sum(g.area for _a, _i, g in landscape) - landscape_union.area, 6),
            "classPartitionDelta_m2": round(partition_delta, 6), "pairPartitionDelta_m2": round(pair_delta, 6),
            "numericalPartitionTolerance_m2": 1, "gapsAreNotFilled": True},
        "soilSourceRecords": [{"sourceId": i, "upper": a["jsym1"], "depth": a["jsym2"],
            "area_km2": round(g.area / 1e6, 9)} for a, i, g in soil],
        "landscapeSourceRecords": [{"sourceId": i, "label": a["landskab"],
            "area_km2": round(g.area / 1e6, 9)} for a, i, g in landscape],
        "soilPairs": rows(soil_groups, region.area), "landscapes": rows(landscape_groups, region.area),
        "existingClasses": rows(classes, region.area), "existingMaterialProcessPairs": rows(pairs, region.area),
        "fieldContext": {"positiveRecords": len(crop_rows), "fieldUnion_km2": round(field_union.area / 1e6, 9),
            "sumMinusUnion_m2": round(sum(r["area_km2"] * 1e6 for r in crop_rows) - field_union.area, 6),
            "selectedCropUnion_km2": round(selected_fields.area / 1e6, 9),
            "cropGroups": rows(crops, region.area), "records": crop_rows,
            "geologicalPairsOnSelectedCrops": rows(pair_on_fields, region.area),
            "actualExposureVerified": False, "cropYearProvesPloughing": False},
        "observation": {"source": "Owner's current conversation, 2026-10-04",
            "description": "Reported much field amber between Asaa and Voersaa, on fields between connecting road and beach",
            "exactFindPoints": None, "countsIndependentlyVerified": False, "localSupportingExperience": True},
    }


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--source-root", type=Path, required=True)
    parser.add_argument("--source-dir", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument("--geometry", type=Path, required=True)
    args = parser.parse_args()
    for output in (args.output, args.geometry):
        if ROOT / "data" in output.resolve().parents:
            raise ValueError("Research output may not overwrite model data")
    result = run(args.source_root, args.source_dir, args.geometry)
    args.output.write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n", encoding="utf-8", newline="\n")
    print(json.dumps({key: result[key] for key in ("status", "selection", "nativeCoverage", "soilPairs", "landscapes", "existingClasses")}, ensure_ascii=False, indent=2))
    print(json.dumps({key: result["fieldContext"][key] for key in ("positiveRecords", "fieldUnion_km2", "selectedCropUnion_km2", "cropGroups", "geologicalPairsOnSelectedCrops")}, ensure_ascii=False, indent=2))
