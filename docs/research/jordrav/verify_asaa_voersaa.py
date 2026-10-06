"""Original GEUS cross-reader and frozen display check of the coastal diagnosis.

Reads original SHP/DBF instead of normalized WKB; uses the bound research
corridor as an explicit common selection. No source changes or amber claims.
"""
import argparse
import json
from pathlib import Path

import pyproj
import shapefile
from shapely import make_valid, is_valid_reason, union_all
from shapely.geometry import shape
from shapely.ops import transform

from audit_stenstrup_contacts import ROOT, digest
from audit_profile_points import EXPECTED_MANIFEST, checked_file, sha
from audit_stenstrup_field_context import source_features


def verify(source_root, source_dir, audit_path, geometry_path):
    audit = json.loads(audit_path.read_bytes())
    if audit["status"] != "PASS" or digest(geometry_path) != audit["geometrySha256"]:
        raise ValueError("Research geometry/audit binding differs")
    features = json.loads(geometry_path.read_bytes())["features"]
    corridor = shape(next(f["geometry"] for f in features if f["properties"]["kind"] == "corridor"))
    bindings = {item["source"]: item for item in audit["sourceBindings"]}
    layer_results, original_layers, repairs = {}, {}, []
    for key, source, record_key in (("soil", "soil-qgis/QGIS/Jordart_25000_v7_1.shp", "soilSourceRecords"),
                                    ("geomorphology", "Shape_format/Geomorfologi.shp", "landscapeSourceRecords")):
        path = source_root / source
        if digest(path) != bindings[key]["shpSha256"] or digest(path.with_suffix(".dbf")) != bindings[key]["dbfSha256"]:
            raise ValueError("Original GEUS identity differs")
        reader = shapefile.Reader(str(path), encoding="utf-8")
        parts, deltas = [], []
        original_layers[key] = []
        for row in audit[record_key]:
            record = reader.shapeRecord(row["sourceId"])
            attrs = record.record.as_dict()
            if key == "soil":
                if (attrs["jsym1"], attrs["jsym2"]) != (row["upper"], row["depth"]):
                    raise ValueError("Original soil symbols differ")
            elif attrs["landskab"] != row["label"]:
                raise ValueError("Original landscape label differs")
            geom = shape(record.shape.__geo_interface__)
            if not geom.is_valid:
                repairs.append({"layer": key, "sourceId": row["sourceId"], "reason": is_valid_reason(geom)})
                geom = make_valid(geom)
            clipped = geom.intersection(corridor)
            parts.append(clipped)
            original_layers[key].append((attrs, clipped))
            deltas.append(abs(clipped.area - row["area_km2"] * 1e6))
        coverage = union_all(parts).intersection(corridor)
        expected = audit["nativeCoverage"]["soil_km2" if key == "soil" else "landscape_km2"] * 1e6
        if abs(coverage.area - expected) > 25 or max(deltas) > 25:
            raise ValueError("Original/native numerical agreement exceeds explicit 25 m2 bound")
        layer_results[key] = {"checkedOriginalRecords": len(parts), "originalCoverage_km2": coverage.area / 1e6,
                              "nativeMinusOriginalCoverage_m2": expected - coverage.area,
                              "maxSingleClippedAreaDelta_m2": max(deltas)}
    fields, binding = source_features(source_dir, "asaa-fields2026", ("Afgkode", "Afgroede"))
    if binding != audit["fieldBinding"]:
        raise ValueError("Field source binding changed")
    # Union before clipping differs from the producer's per-record clipping.
    field_union = union_all([g for _a, g in fields]).intersection(corridor)
    field_delta = audit["fieldContext"]["fieldUnion_km2"] * 1e6 - field_union.area
    if abs(field_delta) > 1:
        raise ValueError("Independent union-before-clip field comparison differs")
    # Pick a demonstrative point inside HS/HS + Marin flade, on registered crops.
    # It is a software diagnostic point, never a reported amber location.
    hs = union_all([g for a, g in original_layers["soil"] if a["jsym1"] == a["jsym2"] == "HS"])
    marine = union_all([g for a, g in original_layers["geomorphology"] if a["landskab"] == "Marin flade"])
    crops = union_all([shape(f["geometry"]) for f in features if f["properties"] == {
        "kind": "crop", "key": "Udvalgte korn-, majs-, raps- og andre dyrkningsafgrøder"}])
    candidates = hs.intersection(marine).intersection(crops)
    if candidates.geom_type == "Polygon":
        largest = candidates
    else:
        largest = max((g for g in candidates.geoms if g.area), key=lambda g: g.area)
    point = largest.representative_point()
    to_geo = pyproj.Transformer.from_crs(25832, 4326, always_xy=True).transform
    point_geo = transform(to_geo, point)
    base = ROOT / "data/jordrav/prototype-0.1.0"
    manifest_raw = (base / "manifest.json").read_bytes()
    if sha(manifest_raw) != EXPECTED_MANIFEST:
        raise ValueError("Frozen display manifest differs")
    manifest = json.loads(manifest_raw)
    catalog = json.loads(checked_file(base, manifest["catalog"]))["entries"]
    hits = []
    for tile in manifest["tiles"]:
        left, bottom, right, top = tile["bbox"]
        if not left <= point_geo.x <= right or not bottom <= point_geo.y <= top:
            continue
        payload = json.loads(checked_file(base, tile))
        for feature in payload["features"]:
            geom = shape(feature["geometry"])
            if geom.covers(point_geo):
                entry = catalog[feature["properties"]["i"]]
                if (entry["surface"], entry["depth"], entry["landscape"], entry["potential"]) != ("HS", "HS", "Marin flade", "possible"):
                    raise ValueError("Frozen display differs at the native HS/marine diagnostic point")
                hits.append({"tile": tile["id"], "origin": feature["properties"]["o"],
                    "catalogIndex": feature["properties"]["i"], "classification": entry})
    if not hits:
        raise ValueError("No frozen display hit at the native diagnostic point")
    return {"status": "PASS", "scope": "Original identity/labels, cross-reader metrics and one bound display diagnosis; no amber validation",
        "auditSha256": digest(audit_path), "geometrySha256": digest(geometry_path),
        "scriptSha256": digest(Path(__file__)), "originalLayers": layer_results,
        "invalidOriginalShapesRepairedInMemoryOnly": repairs, "fieldUnionDelta_m2": field_delta,
        "diagnosticPoint": {"longitude": point_geo.x, "latitude": point_geo.y,
            "notAnAmberFind": True, "distanceInsideChosenNativeCropPiece_m": point.distance(largest.boundary),
            "displayHits": hits, "displayGeometryGeneralisation_m": 20},
        "numericalBounds": {"originalNativeArea_m2": 25, "fieldUnion_m2": 1,
            "boundsArePositionalAccuracy": False}}


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    for flag in ("source-root", "source-dir", "audit", "geometry", "output"):
        parser.add_argument("--" + flag, type=Path, required=True)
    args = parser.parse_args()
    if ROOT / "data" in args.output.resolve().parents or args.output.resolve() == args.audit.resolve():
        raise ValueError("Verification needs a separate research JSON output")
    result = verify(args.source_root, args.source_dir, args.audit, args.geometry)
    args.output.write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n", encoding="utf-8", newline="\n")
    print(json.dumps(result, ensure_ascii=False, indent=2))
