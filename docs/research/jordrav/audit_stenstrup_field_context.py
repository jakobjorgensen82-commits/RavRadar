"""Read-only Stenstrup field/JB context against verified native GEUS geology.

No network, model writes, plough-depth assumptions, amber ranking or owner data.
Published JB classes are kept as published; JB6 is not treated as pure topsoil.
"""
import argparse
from collections import defaultdict
from itertools import combinations
import gzip
import hashlib
import json
from pathlib import Path
import struct

import shapely
from shapely import from_wkb, union_all
from shapely.geometry import mapping, shape

from audit_stenstrup_contacts import ROOT, LAKE_SOURCE_ID, checked_cache, digest

NUMERICAL_M2 = 1.0  # Computation tolerance, never geological accuracy.
SELECTED_CROP_CODES = frozenset((1, 3, 4, 5, 7, 10, 11, 13, 14, 15, 22,
                               30, 31, 152, 161, 210, 214, 216, 434, 450))


def selected_geometries(meta, path, ids):
    with path.open("rb") as stream:
        for attributes, source_id, _delta in meta["attributes"]:
            prefix = stream.read(4)
            if len(prefix) != 4:
                raise ValueError("Truncated verified cache")
            length = struct.unpack("<I", prefix)[0]
            if source_id in ids:
                raw = stream.read(length)
                if len(raw) != length:
                    raise ValueError("Truncated selected geometry")
                yield attributes, source_id, from_wkb(raw)
            else:
                stream.seek(length, 1)
        if stream.tell() != path.stat().st_size:
            raise ValueError("Cache framing differs from verified file")


def source_features(source_root, stem, allowed):
    binding = json.loads((source_root / f"{stem}-binding.json").read_bytes())
    raw = source_root / f"{stem}.source"
    decoded = source_root / f"{stem}.geojson"
    raw_bytes = raw.read_bytes() if raw.exists() else gzip.decompress(raw.with_suffix(".source.gz").read_bytes())
    normalized = raw_bytes.decode(binding["sourceEncoding"]).encode("utf-8")
    if (hashlib.sha256(raw_bytes).hexdigest() != binding["sourceSha256"] or
            hashlib.sha256(normalized).hexdigest() != binding["decodedUtf8Sha256"]):
        raise ValueError("Regional WFS source identity changed")
    original = json.loads(normalized)
    data = json.loads(decoded.read_bytes()) if decoded.exists() else original
    if data != original:
        raise ValueError("Declared charset normalization changed source content")
    count = len(data["features"])
    if not (count == binding["numberMatched"] == binding["numberReturned"] ==
            data["numberMatched"] == data["numberReturned"]):
        raise ValueError("Incomplete WFS region")
    if data["crs"]["properties"]["name"] != "urn:ogc:def:crs:EPSG::25832":
        raise ValueError("Unexpected WFS projection")
    if len({feature["id"] for feature in data["features"]}) != count:
        raise ValueError("Duplicate WFS features")
    rows = []
    for feature in data["features"]:
        if set(feature["properties"]) != set(allowed):
            raise ValueError("Unexpected field, including possible owner data")
        geometry = shape(feature["geometry"])
        if not geometry.is_valid or geometry.geom_type not in ("Polygon", "MultiPolygon"):
            raise ValueError("Invalid regional WFS polygon")
        rows.append((feature["properties"], geometry))
    return rows, {**binding, "responseTimeStamp": data["timeStamp"]}


def dissolve(groups):
    return {key: union_all(parts, grid_size=0) for key, parts in groups.items()}


def polygonal(geometry):
    """Keep areal members; boundary-only lines/points have no class area."""
    if geometry.geom_type in ("Polygon", "MultiPolygon"):
        return geometry
    return union_all([polygonal(part) for part in getattr(geometry, "geoms", ())
                      if part.area > 0], grid_size=0)


def area_rows(groups, total):
    return [{"key": list(key) if isinstance(key, tuple) else key,
             "area_km2": round(geometry.area / 1e6, 9),
             "percentOfLake": round(100 * geometry.area / total, 6)}
            for key, geometry in sorted(groups.items(), key=lambda row: -row[1].area)]


def crop_context(properties):
    code, label = properties["Afgkode"], properties["Afgroede"]
    if code in SELECTED_CROP_CODES:
        return "Udvalgte korn-, majs-, raps- og andre dyrkningsafgrøder"
    if "omdrift" in label.lower():
        return "Græs i omdrift"
    if "permanent" in label.lower():
        return "Permanent græs"
    if "brak" in label.lower():
        return "Brak"
    if any(word in label.lower() for word in ("skov", "juletræ", "poppel")):
        return "Træer og skov"
    return "Andre registrerede anvendelser"


def audit(source_root, field_source_root):
    previous_path = Path(__file__).with_name("stenstrup-contact-audit-2026-10-04.json")
    previous = json.loads(previous_path.read_bytes())
    if previous["status"] != "PASS":
        raise ValueError("Native geology audit has not passed")
    geom_meta, geom_path, geom_binding = checked_cache(source_root, "geomorphology")
    lake_rows = list(selected_geometries(geom_meta, geom_path, {LAKE_SOURCE_ID}))
    if len(lake_rows) != 1 or lake_rows[0][0]["landskab"] != "Issøflade":
        raise ValueError("Selected lake differs")
    lake = lake_rows[0][2]
    if not lake.is_valid or abs(lake.area - previous["lake"]["area_km2"] * 1e6) > NUMERICAL_M2:
        raise ValueError("Native lake geometry changed")
    soil_meta, soil_path, soil_binding = checked_cache(source_root, "soil")
    expected = {row["sourceId"]: row for row in previous["soilSourceRecords"]}
    geological_parts, pair_parts = defaultdict(list), defaultdict(list)
    selected = list(selected_geometries(soil_meta, soil_path, set(expected)))
    if len(selected) != len(expected):
        raise ValueError("Selected native soil records missing")
    for attributes, source_id, geometry in selected:
        row = expected[source_id]
        if [attributes["jsym1"], attributes["jsym2"]] != [row["upper"], row["depth"]]:
            raise ValueError("Native sediment pair changed")
        clipped = geometry.intersection(lake, grid_size=0)
        if abs(clipped.area - row["area_km2"] * 1e6) > NUMERICAL_M2:
            raise ValueError("Selected geological area changed")
        geological_parts[row["upper"]].append(clipped)
        pair_parts[(row["upper"], row["depth"])].append(clipped)
    geology = dissolve(geological_parts)
    pairs = dissolve(pair_parts)
    geological_coverage = union_all(list(geology.values()), grid_size=0)
    if lake.symmetric_difference(geological_coverage).area > NUMERICAL_M2:
        raise ValueError("Geological region has a coverage defect")

    fields, field_binding = source_features(field_source_root, "stenstrup-fields2026", ("Afgkode", "Afgroede"))
    jb, jb_binding = source_features(field_source_root, "stenstrup-jb2024", ("JB_kode", "Jordtype"))
    crops, context, jb_parts = defaultdict(list), defaultdict(list), defaultdict(list)
    field_parts, positive_count, positive_jb_count = [], 0, 0
    for properties, geometry in fields:
        clipped = geometry.intersection(lake, grid_size=0)
        if clipped.area <= 0:
            continue
        positive_count += 1
        crops[(properties["Afgkode"], properties["Afgroede"])].append(clipped)
        context[crop_context(properties)].append(clipped)
        field_parts.append(clipped)
    for properties, geometry in jb:
        clipped = geometry.intersection(lake, grid_size=0)
        if clipped.area <= 0:
            continue
        positive_jb_count += 1
        jb_parts[(properties["JB_kode"], properties["Jordtype"])].append(clipped)
    crops, context, jb_groups = map(dissolve, (crops, context, jb_parts))
    field_union = union_all(field_parts, grid_size=0)
    jb_union = union_all(list(jb_groups.values()), grid_size=0)
    field_overlap = sum(part.area for part in field_parts) - field_union.area
    cross_crop_overlap = sum(part.area for part in crops.values()) - field_union.area
    jb_overlap = sum(part.area for part in jb_groups.values()) - jb_union.area
    if max(abs(field_overlap), abs(cross_crop_overlap)) > NUMERICAL_M2:
        raise ValueError(f"Ambiguous overlapping crop categories: {field_overlap}, {cross_crop_overlap}")
    # Keep source boundary overlaps explicit. Never pick a winning soil class,
    # snap away the overlap, or enlarge the numerical tolerance to hide it.
    overlap_parts, overlap_pairs = [], []
    for (a, ga), (b, gb) in combinations(sorted(jb_groups.items()), 2):
        overlap = polygonal(ga.intersection(gb, grid_size=0))
        if overlap.area <= 0:
            continue
        overlap_parts.append(overlap)
        pieces = list(getattr(overlap, "geoms", (overlap,)))
        overlap_pairs.append({"codes": [a[0], b[0]], "area_m2": overlap.area,
                              "positiveParts": sum(part.area > 0 for part in pieces),
                              "largestPart_m2": max(part.area for part in pieces)})
    jb_conflict = union_all(overlap_parts, grid_size=0)
    jb_clean = {key: geometry.difference(jb_conflict, grid_size=0)
                for key, geometry in jb_groups.items()}
    jb_partition = {**jb_clean, ("ambiguous", "Overlappende kildegrænser"): jb_conflict}
    partition_union = union_all(list(jb_partition.values()), grid_size=0)
    partition_overlap = sum(part.area for part in jb_partition.values()) - partition_union.area
    if (abs(partition_overlap) > NUMERICAL_M2 or
            partition_union.symmetric_difference(jb_union).area > NUMERICAL_M2):
        raise ValueError("Published JB conflict partition has a coverage or overlap defect")

    matrix, geology_crop, triple = [], [], []
    for upper, geological in sorted(geology.items()):
        on_fields = geological.intersection(field_union, grid_size=0)
        matrix.append({"upper": upper, "geologicalArea_km2": geological.area / 1e6,
                       "registeredFields_km2": on_fields.area / 1e6,
                       "percentOfSedimentOnFields": 100 * on_fields.area / geological.area})
        for label, crop_geometry in sorted(context.items()):
            intersection = geological.intersection(crop_geometry, grid_size=0)
            if intersection.area == 0:
                continue
            geology_crop.append({"upper": upper, "cropContext": label,
                                 "area_km2": intersection.area / 1e6})
            for (code, jb_label), jb_geometry in jb_partition.items():
                part = intersection.intersection(jb_geometry, grid_size=0)
                if part.area:
                    triple.append({"upper": upper, "cropContext": label, "publishedJB": code,
                                   "publishedJBLabel": jb_label, "area_km2": part.area / 1e6})
    triple_area = sum(row["area_km2"] * 1e6 for row in triple)
    joint = field_union.intersection(jb_union, grid_size=0)
    if abs(triple_area - joint.area) > NUMERICAL_M2:
        raise ValueError("Three-way category area sum differs from joint union")
    geology_crop_delta = sum(row["area_km2"] * 1e6 for row in geology_crop) - field_union.area
    if abs(geology_crop_delta) > NUMERICAL_M2:
        raise ValueError("Geology/crop area sum differs from field union")
    paired_fields = []
    for (upper, depth), geometry in sorted(pairs.items()):
        registered = geometry.intersection(field_union, grid_size=0)
        selected_crop = geometry.intersection(context[
            "Udvalgte korn-, majs-, raps- og andre dyrkningsafgrøder"], grid_size=0)
        paired_fields.append({"upper": upper, "depth": depth,
                              "area_km2": geometry.area / 1e6,
                              "registeredFields_km2": registered.area / 1e6,
                              "selectedCropContext_km2": selected_crop.area / 1e6})
    contact = geology["TS"].boundary.intersection(geology["TL"].boundary, grid_size=0).difference(lake.boundary, grid_size=0)
    contact_on_fields = contact.intersection(field_union, grid_size=0)
    result = {
        "status": "PASS", "researchDate": "2026-10-04",
        "scope": "Published field-use/JB context and native geological overlaps; no pure-topsoil, current ploughing, amber or huntability verification",
        "scriptSha256": digest(Path(__file__)), "previousNativeAuditSha256": digest(previous_path),
        "sourceBindings": [geom_binding, soil_binding, field_binding, jb_binding],
        "software": {"shapely": shapely.__version__, "geos": shapely.geos_version_string},
        "lake": previous["lake"],
        "counts": {"receivedFieldFeatures": len(fields), "positiveFieldFeatures": positive_count,
                   "receivedJBFeatures": len(jb), "positiveJBFeatures": positive_jb_count},
        "coverage": {"registeredFields_km2": field_union.area / 1e6,
                     "percentOfLakeRegisteredFields": 100 * field_union.area / lake.area,
                     "noFieldRegistration_km2": lake.difference(field_union, grid_size=0).area / 1e6,
                     "publishedJB_km2": jb_union.area / 1e6,
                     "publishedJBMissing_km2": lake.difference(jb_union, grid_size=0).area / 1e6,
                     "publishedJBAmbiguous_m2": jb_conflict.area,
                     "fieldsWithAmbiguousJB_m2": field_union.intersection(jb_conflict, grid_size=0).area,
                     "fieldsAndPublishedJB_km2": joint.area / 1e6,
                     "fieldsWithoutPublishedJB_km2": field_union.difference(jb_union, grid_size=0).area / 1e6},
        "checks": {"numericalTolerance_m2": NUMERICAL_M2, "fieldOverlap_m2": field_overlap,
                   "crossCropOverlap_m2": cross_crop_overlap, "JBClassOverlap_m2": jb_overlap,
                   "JBPartitionOverlap_m2": partition_overlap,
                   "threeWaySumMinusUnion_m2": triple_area - joint.area,
                   "geologyCropSumMinusFields_m2": geology_crop_delta,
                   "ownerFieldsRequestedOrStored": False, "pureTopsoilInterpretation": False,
                   "currentPloughingVerified": False, "huntabilityClassChanged": False},
        "cropCodesInSelectedContext": sorted(SELECTED_CROP_CODES),
        "cropContexts": area_rows(context, lake.area), "cropClasses": area_rows(crops, lake.area),
        "publishedJBClasses": area_rows(jb_groups, lake.area),
        "publishedJBPartition": area_rows(jb_partition, lake.area),
        "publishedJBOverlapPairs": overlap_pairs,
        "geologyOnRegisteredFields": matrix, "geologyCropContexts": geology_crop,
        "upperDepthPairsOnFields": paired_fields, "threeWayContexts": triple,
        "lateralContact": {"TS_TLInsideLake_m": contact.length,
                           "TS_TLOnRegisteredFields_m": contact_on_fields.length,
                           "TS_TLOnSelectedCropContext_m": contact.intersection(context[
                               "Udvalgte korn-, majs-, raps- og andre dyrkningsafgrøder"], grid_size=0).length,
                           "isVerticalContactOrSearchLine": False},
    }
    features = [{"type": "Feature", "properties": {"kind": "lake"}, "geometry": mapping(lake)}]
    for kind, groups in (("geology", geology), ("cropContext", context), ("publishedJB", jb_partition)):
        for key, geometry in groups.items():
            features.append({"type": "Feature", "properties": {"kind": kind, "key": key}, "geometry": mapping(geometry)})
    return result, {"type": "FeatureCollection", "crs": {"type": "name", "properties": {"name": "EPSG:25832"}}, "features": features}


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--source-root", required=True, type=Path)
    parser.add_argument("--field-source-root", type=Path, default=Path(__file__).with_name("sources"))
    parser.add_argument("--output", required=True, type=Path)
    parser.add_argument("--geometry", required=True, type=Path)
    args = parser.parse_args()
    if args.output.suffix != ".json" or args.geometry.suffix != ".geojson":
        raise ValueError("Research outputs must be separate JSON/GeoJSON files")
    for destination in (args.output, args.geometry):
        if (ROOT / "data") == destination.resolve() or (ROOT / "data") in destination.resolve().parents:
            raise ValueError("Research output may not overwrite model data")
    result, geometry = audit(args.source_root.resolve(), args.field_source_root.resolve())
    payload = (json.dumps(geometry, ensure_ascii=False, separators=(",", ":")) + "\n").encode("utf-8")
    result["geometrySha256"] = hashlib.sha256(payload).hexdigest()
    args.geometry.write_bytes(payload)
    args.output.write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n", encoding="utf-8", newline="\n")
    print(json.dumps({"status": result["status"], "counts": result["counts"], "coverage": result["coverage"], "checks": result["checks"]}, ensure_ascii=False))
