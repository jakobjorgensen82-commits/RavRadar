"""Independent regional check: original SHP/DBF and archived WFS response bytes.

Does not load normalized WKB or call the producer's overlay/category helpers.
Numerical agreement is not evidence of amber or current soil exposure.
"""
import argparse
from collections import defaultdict
import gzip
import hashlib
import json
from pathlib import Path

import shapefile
from shapely import make_valid, union_all
from shapely.geometry import shape

SELECTED_CODES = {1, 3, 4, 5, 7, 10, 11, 13, 14, 15, 22, 30, 31,
                  152, 161, 210, 214, 216, 434, 450}


def digest(path):
    with path.open("rb") as stream:
        return hashlib.file_digest(stream, "sha256").hexdigest()


def verify(root, audit_path, geometry_path):
    audit = json.loads(audit_path.read_bytes())
    native = json.loads(audit_path.with_name("stenstrup-contact-audit-2026-10-04.json").read_bytes())
    if audit["status"] != "PASS" or native["status"] != "PASS":
        raise ValueError("Bound regional audits have not passed")
    if sorted(SELECTED_CODES) != audit["cropCodesInSelectedContext"]:
        raise ValueError("Presentation code selection differs")
    if digest(geometry_path) != audit["geometrySha256"]:
        raise ValueError("Saved regional geometry differs")
    geometry = json.loads(geometry_path.read_bytes())
    if geometry["crs"]["properties"]["name"] != "EPSG:25832":
        raise ValueError("Saved regional projection differs")
    for feature in geometry["features"]:
        if not set(feature["properties"]) <= {"kind", "key"} or not shape(feature["geometry"]).is_valid:
            raise ValueError("Saved regional geometry or minimal attribute contract differs")
    bindings = {b["source"]: b for b in audit["sourceBindings"]}
    geom_path = root / "Shape_format/Geomorfologi.shp"
    soil_path = root / "soil-qgis/QGIS/Jordart_25000_v7_1.shp"
    for key, path in (("geomorphology", geom_path), ("soil", soil_path)):
        if digest(path) != bindings[key]["shpSha256"] or digest(path.with_suffix(".dbf")) != bindings[key]["dbfSha256"]:
            raise ValueError("Original SHP/DBF identity differs")
    g, s = shapefile.Reader(str(geom_path), encoding="utf-8"), shapefile.Reader(str(soil_path), encoding="utf-8")
    lake = shape(g.shapeRecord(native["lake"]["sourceId"]).shape.__geo_interface__)
    if not lake.is_valid:
        raise ValueError("Original lake is invalid")
    fields, selected, jb = [], [], []
    source_dir = Path(__file__).with_name("sources")
    for stem, source, allowed in (
            ("stenstrup-fields2026", "Marker:Marker_2026", {"Afgkode", "Afgroede"}),
            ("stenstrup-jb2024", "Jordbunds_og_terraenforhold:Jordbundskort_2024", {"JB_kode", "Jordtype"})):
        raw = gzip.decompress((source_dir / f"{stem}.source.gz").read_bytes())
        b = bindings[source]
        if hashlib.sha256(raw).hexdigest() != b["sourceSha256"] or len(raw) != b["sourceBytes"]:
            raise ValueError("Archived WFS identity differs")
        data = json.loads(raw.decode(b["sourceEncoding"]))
        if len(data["features"]) != data["numberMatched"] or data["numberMatched"] != data["numberReturned"]:
            raise ValueError("Incomplete archived WFS region")
        for feature in data["features"]:
            if set(feature["properties"]) != allowed:
                raise ValueError("Unexpected source field")
            geom = shape(feature["geometry"])
            if not geom.is_valid:
                raise ValueError("Invalid WFS geometry")
            if source.startswith("Marker:"):
                fields.append(geom)
                if feature["properties"]["Afgkode"] in SELECTED_CODES:
                    selected.append(geom)
            else:
                jb.append(geom)
    # Union full source polygons first, then clip to original lake: different
    # order and lake coordinates from the primary normalized-cache audit.
    field_union = union_all(fields).intersection(lake)
    selected_union = union_all(selected).intersection(lake)
    jb_union = union_all(jb).intersection(lake)
    groups, repaired = defaultdict(list), []
    for row in native["soilSourceRecords"]:
        source = s.shapeRecord(row["sourceId"])
        if (source.record.as_dict()["jsym1"], source.record.as_dict()["jsym2"]) != (row["upper"], row["depth"]):
            raise ValueError("Original sediment labels differ")
        geom = shape(source.shape.__geo_interface__)
        if not geom.is_valid:
            repaired.append(row["sourceId"])
            geom = make_valid(geom)
        groups[row["upper"]].append(geom)
    groups = {code: union_all(parts) for code, parts in groups.items()}
    deltas = {"registeredFields_m2": field_union.area-audit["coverage"]["registeredFields_km2"]*1e6,
              "selectedCropContext_m2": selected_union.area-audit["cropContexts"][0]["area_km2"]*1e6,
              "publishedJBCoverage_m2": jb_union.area-audit["coverage"]["publishedJB_km2"]*1e6}
    geo_deltas = []
    for row in audit["geologyOnRegisteredFields"]:
        code = row["upper"]
        delta = groups[code].intersection(field_union).area-row["registeredFields_km2"]*1e6
        geo_deltas.append({"upper": code, "originalMinusNative_m2": delta})
    contact = groups["TS"].boundary.intersection(groups["TL"].boundary).intersection(lake).difference(lake.boundary)
    contact_delta = contact.intersection(field_union).length-audit["lateralContact"]["TS_TLOnRegisteredFields_m"]
    # Consistent with previous original/native Stenstrup verification. This is
    # a numerical cross-reader bound, never a geological accuracy statement.
    if max(abs(v) for v in deltas.values()) > 25 or max(abs(v["originalMinusNative_m2"]) for v in geo_deltas) > 25:
        raise ValueError("Original/native area agreement exceeds numerical bound")
    if abs(contact_delta) > 1:
        raise ValueError("Original/native contact agreement exceeds numerical bound")
    return {"status": "PASS", "scope": "Original coordinates, alternate overlay order, source privacy/identity and numerical agreement; no amber or huntability verification",
            "scriptSha256": digest(Path(__file__)), "auditSha256": digest(audit_path),
            "geometrySha256": digest(geometry_path), "sourceFeatures": {"fields": len(fields), "publishedJB": len(jb)},
            "originalLake_km2": lake.area/1e6, "originalRegisteredFields_km2": field_union.area/1e6,
            "originalSelectedCropContext_km2": selected_union.area/1e6,
            "originalMinusNative": deltas, "geologyFieldAreaDeltas": geo_deltas,
            "originalMinusNativeContactOnFields_m": contact_delta,
            "invalidOriginalSoilShapesRepairedInMemory": repaired,
            "numericalBounds": {"areaDelta_m2": 25, "contactDelta_m": 1},
            "ownerFieldsRequestedOrStored": False, "sourceFilesModified": False}


if __name__ == "__main__":
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("--source-root", required=True, type=Path)
    p.add_argument("--audit", required=True, type=Path)
    p.add_argument("--geometry", required=True, type=Path)
    p.add_argument("--output", required=True, type=Path)
    args = p.parse_args()
    if args.output.suffix != ".json":
        raise ValueError("Verification output must be JSON")
    if Path(__file__).resolve().parents[3]/"data" in args.output.resolve().parents or args.output.resolve() in (args.audit.resolve(), args.geometry.resolve()):
        raise ValueError("Verification requires a separate research output")
    result = verify(args.source_root.resolve(), args.audit, args.geometry)
    args.output.write_text(json.dumps(result, ensure_ascii=False, indent=2)+"\n", encoding="utf-8", newline="\n")
    print(json.dumps(result, ensure_ascii=False))
