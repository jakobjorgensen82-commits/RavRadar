"""Independent original-shapefile check of the native Stenstrup diagnosis.

Uses pyshp/source coordinates instead of the normalized WKB loader; makes no
source edits. Only an invalid original shape's in-memory copy is made valid.
Checks identities/labels and reports normalization differences, not map accuracy.
"""
import argparse
import hashlib
import json
from pathlib import Path

import shapefile
from shapely import is_valid_reason, make_valid, union_all
from shapely.geometry import shape


def digest(path):
    with path.open("rb") as stream:
        return hashlib.file_digest(stream, "sha256").hexdigest()


def verify(root, audit_path):
    audit = json.loads(audit_path.read_bytes())
    if audit["status"] != "PASS":
        raise ValueError("Native audit has not passed")
    bindings = {item["source"]: item for item in audit["sourceBindings"]}
    geom_path = root / "Shape_format/Geomorfologi.shp"
    soil_path = root / "soil-qgis/QGIS/Jordart_25000_v7_1.shp"
    for key, path in (("geomorphology", geom_path), ("soil", soil_path)):
        if digest(path) != bindings[key]["shpSha256"] or digest(path.with_suffix(".dbf")) != bindings[key]["dbfSha256"]:
            raise ValueError("Original source identity changed")
    g = shapefile.Reader(str(geom_path), encoding="utf-8")
    s = shapefile.Reader(str(soil_path), encoding="utf-8")
    lake_record = g.shapeRecord(audit["lake"]["sourceId"])
    if lake_record.record.as_dict()["landskab"] != audit["lake"]["label"]:
        raise ValueError("Original lake label differs")
    lake = shape(lake_record.shape.__geo_interface__)
    if not lake.is_valid:
        raise ValueError("Original lake is invalid")
    parts, repairs, area_changes = [], [], []
    groups = {"TS": [], "TL": []}
    for row in audit["soilSourceRecords"]:
        raw = s.shapeRecord(row["sourceId"])
        attrs = raw.record.as_dict()
        if (attrs["jsym1"], attrs["jsym2"]) != (row["upper"], row["depth"]):
            raise ValueError("Original soil labels differ")
        geometry = shape(raw.shape.__geo_interface__)
        if not geometry.is_valid:
            repairs.append({"sourceId": row["sourceId"], "reason": is_valid_reason(geometry)})
            geometry = make_valid(geometry)
        clipped = geometry.intersection(lake)
        parts.append(clipped)
        area_changes.append(abs(clipped.area - row["area_km2"] * 1e6))
        if row["upper"] in groups:
            groups[row["upper"]].append(geometry)
    original_groups = {code: union_all(items) for code, items in groups.items()}
    shared = original_groups["TS"].boundary.intersection(original_groups["TL"].boundary).intersection(lake).difference(lake.boundary)
    native_contact = next(item["sharedLength_m"] for item in audit["lateralMappedContacts"] if item["upperCodes"] == ["TL", "TS"])
    coverage = union_all(parts)
    # Explicit numerical cross-reader bounds. They are neither geological
    # uncertainty, positional accuracy nor a calibrated amber threshold.
    if abs(lake.area - audit["lake"]["area_km2"] * 1e6) > 25 or abs(shared.length - native_contact) > 1:
        raise ValueError("Original/native metric comparison differs materially")
    if max(area_changes) > 25 or lake.difference(coverage).area > 1:
        raise ValueError("Original/native region coverage differs materially")
    return {
        "status": "PASS", "scope": "Original identity/labels and numerical cross-reader agreement only; no amber verification",
        "auditSha256": digest(audit_path), "scriptSha256": digest(Path(__file__)),
        "checkedOriginalSoilRecords": len(parts), "originalLake_km2": lake.area / 1e6,
        "originalLakeVersusNormalizedDelta_m2": audit["lake"]["area_km2"] * 1e6 - lake.area,
        "invalidOriginalRegionalShapes": repairs,
        "maxAbsoluteClippedAreaDelta_m2": max(area_changes), "sumAbsoluteClippedAreaDelta_m2": sum(area_changes),
        "originalSoilCoverageGap_m2": lake.difference(coverage).area,
        "originalTS_TLInternalContact_m": shared.length,
        "nativeMinusOriginalTS_TLContact_m": native_contact - shared.length,
        "originalTS_km2": original_groups["TS"].intersection(lake).area / 1e6,
        "originalTL_km2": original_groups["TL"].intersection(lake).area / 1e6,
        "numericalBounds": {"lakeOrSingleClippedAreaDelta_m2": 25, "contactDelta_m": 1, "coverageGap_m2": 1},
    }


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--source-root", required=True, type=Path)
    parser.add_argument("--audit", required=True, type=Path)
    parser.add_argument("--output", required=True, type=Path)
    args = parser.parse_args()
    if args.output.suffix != ".json" or args.output.resolve() == args.audit.resolve():
        raise ValueError("Independent verification needs a separate JSON output")
    if Path(__file__).resolve().parents[3] / "data" in args.output.resolve().parents:
        raise ValueError("Verification output may not overwrite model data")
    result = verify(args.source_root.resolve(), args.audit)
    args.output.write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n", encoding="utf-8", newline="\n")
    print(json.dumps(result, ensure_ascii=False, indent=2))
