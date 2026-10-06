"""Cross-reader checks of three leading marine/crop pairs in each comparison.

Uses original SHP/DBF, union before clipping and an explicit crop-code set.
Shares archived source bytes/window definition, not normalized WKB or category
helpers. The national census is not independently re-created here.
"""
import argparse
import gzip
import hashlib
import json
from pathlib import Path

import pyproj
import shapefile
from shapely import make_valid, is_valid_reason, union_all
from shapely.geometry import box, shape
from shapely.ops import transform


def digest(path):
    with path.open("rb") as stream:
        return hashlib.file_digest(stream, "sha256").hexdigest()


def verify(source_root, source_dir, audit_path, region_path):
    audit = json.loads(audit_path.read_bytes())
    if audit["status"] != "PASS" or digest(region_path) != audit["regionDefinitionSha256"]:
        raise ValueError("Comparison audit/selection binding differs")
    bindings = {item["source"]: item for item in audit["sourceBindings"]}
    readers = {}
    for key, name in (("soil", "soil-qgis/QGIS/Jordart_25000_v7_1.shp"),
                      ("geomorphology", "Shape_format/Geomorfologi.shp")):
        path = source_root / name
        if digest(path) != bindings[key]["shpSha256"] or digest(path.with_suffix(".dbf")) != bindings[key]["dbfSha256"]:
            raise ValueError("Original source identity differs")
        readers[key] = shapefile.Reader(str(path), encoding="utf-8")
    selected_codes = {1, 3, 4, 5, 7, 10, 11, 13, 14, 15, 22, 30, 31, 152, 161, 210, 214, 216, 434, 450}
    project = pyproj.Transformer.from_crs(4326, 25832, always_xy=True).transform
    results, repairs, checked = [], {}, {"soil": set(), "geomorphology": set()}
    for region in audit["regions"]:
        window = transform(project, box(*region["bbox"]))
        binding = region["fieldBinding"]
        raw = gzip.decompress((source_dir / ("marine-" + region["id"] + "-fields2026.source.gz")).read_bytes())
        if hashlib.sha256(raw).hexdigest() != binding["sourceSha256"]:
            raise ValueError("Field source identity differs")
        data = json.loads(raw.decode(binding["sourceEncoding"]))
        if len(data["features"]) != data["numberMatched"] or data["numberMatched"] != binding["numberMatched"]:
            raise ValueError("Field response incomplete")
        crop = union_all([shape(f["geometry"]) for f in data["features"]
                          if f["properties"]["Afgkode"] in selected_codes]).intersection(window)
        crop_delta = region["selectedCropUnion_km2"] * 1e6 - crop.area
        if abs(crop_delta) > 1:
            raise ValueError("Independent crop-union comparison differs")
        originals = {}
        for key, id_key in (("soil", "soilSourceIds"), ("geomorphology", "landscapeSourceIds")):
            originals[key] = []
            for source_id in region[id_key]:
                record = readers[key].shapeRecord(source_id)
                geom = shape(record.shape.__geo_interface__)
                if not geom.is_valid:
                    repairs[(key, source_id)] = is_valid_reason(geom)
                    geom = make_valid(geom)
                originals[key].append((record.record.as_dict(), geom))
                checked[key].add(source_id)
        pairs = []
        for pair in region["marinePairsOnSelectedCrops"][:3]:
            upper, depth, label, _category, _material = pair["key"]
            soil = union_all([g for a, g in originals["soil"] if (a["jsym1"], a["jsym2"]) == (upper, depth)])
            land = union_all([g for a, g in originals["geomorphology"] if a["landskab"] == label])
            cut = soil.intersection(land).intersection(crop).intersection(window)
            delta = pair["area_km2"] * 1e6 - cut.area
            if abs(delta) > 50:
                raise ValueError(f"Original/native pair exceeds 50 m2 bound: {region['id']} {pair['key']} {delta}")
            pairs.append({"key": pair["key"], "originalArea_km2": cut.area / 1e6,
                          "nativeMinusOriginal_m2": delta})
        results.append({"id": region["id"], "cropUnionDelta_m2": crop_delta, "leadingPairs": pairs})
    return {"status": "PASS", "scope": "Independent original-reader check of 15 leading regional pairs and crop unions; not an independent national census or amber validation",
        "auditSha256": digest(audit_path), "regionDefinitionSha256": digest(region_path), "scriptSha256": digest(Path(__file__)),
        "checkedOriginalRecords": {key: len(ids) for key, ids in checked.items()},
        "invalidOriginalShapesRepairedInMemoryOnly": [{"layer": key, "sourceId": source_id, "reason": reason}
            for (key, source_id), reason in sorted(repairs.items())],
        "numericalBounds": {"regionalPairAreaDelta_m2": 50, "cropUnionDelta_m2": 1, "notPositionalAccuracy": True},
        "regions": results}


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    for flag in ("source-root", "source-dir", "audit", "regions", "output"):
        parser.add_argument("--" + flag, type=Path, required=True)
    args = parser.parse_args()
    if args.output.resolve() == args.audit.resolve() or "data" in args.output.parts:
        raise ValueError("Independent verification needs a separate research output")
    result = verify(args.source_root, args.source_dir, args.audit, args.regions)
    args.output.write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n", encoding="utf-8", newline="\n")
    print(json.dumps(result, ensure_ascii=False, indent=2))
