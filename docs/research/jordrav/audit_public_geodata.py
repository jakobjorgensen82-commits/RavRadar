"""Read-only audit of the public GEUS inputs for the jordrav research report.

No download, amber score, source repair, or production-data access is performed.
The simplification experiment is a payload benchmark, not publishable geometry.
Dependencies: pyshp 2.3.1, shapely >= 2.1, pyproj. Extract the archives first.
"""

import argparse
import collections
import hashlib
import json
from pathlib import Path
import platform
import sys
import time
import zlib

import pyproj
import shapefile
import shapely
from shapely.geometry import mapping, shape


ARCHIVES = {
    "Shape_format.zip": "b186c1b92e716d07a67aa2e9a95cf260",
    "QGIS.7z": "f8e5f1480e3610dbe58de25f07f30c85",
    "Isrande.zip": "040e186e5fd9e43d15ba835b801ace90",
    "Jordart_200000_Shape.zip": "c81fd5b078bd6ed8cd352fbe31d68eda",
}


def digest(path, algorithm):
    result = hashlib.new(algorithm)
    with path.open("rb") as stream:
        for block in iter(lambda: stream.read(1024 * 1024), b""):
            result.update(block)
    return result.hexdigest()


def locate(root, filename):
    matches = list(root.rglob(filename))
    if len(matches) != 1:
        raise ValueError(f"Expected exactly one {filename}; found {len(matches)}")
    return matches[0]


def audit_layer(path, classification_fields, collect_geometry=False, encoding="utf-8"):
    reader = shapefile.Reader(str(path), encoding=encoding)
    fields = [field[0] for field in reader.fields[1:]]
    missing = set(classification_fields) - set(fields)
    if missing:
        raise ValueError(f"Missing fields in {path.name}: {sorted(missing)}")
    histogram = collections.Counter()
    pair_differences = 0
    for record in reader.iterRecords():
        values = record.as_dict()
        histogram[tuple(values[field] for field in classification_fields)] += 1
        if "jsym1" in values and values["jsym1"] != values["jsym2"]:
            pair_differences += 1
    vertices = 0
    invalid = 0
    empty = 0
    area = 0.0
    geometries = []
    for geometry in reader.iterShapes():
        vertices += len(geometry.points)
        if not geometry.points:
            empty += 1
            if collect_geometry:
                raise ValueError(f"Empty source geometry in benchmark layer: {path.name}")
            continue
        parsed = shape(geometry.__geo_interface__)
        invalid += int(not parsed.is_valid)
        area += parsed.area
        if collect_geometry:
            geometries.append(parsed)
    projection = path.with_suffix(".prj").read_text(encoding="utf-8")
    crs = pyproj.CRS.from_wkt(projection)
    result = {
        "file": path.name,
        "shp_sha256": digest(path, "sha256"),
        "dbf_sha256": digest(path.with_suffix(".dbf"), "sha256"),
        "crs_authority": crs.to_authority(),
        "records": len(reader),
        "fields": fields,
        "dbf_encoding_used": encoding,
        "bbox_native": list(reader.bbox),
        "vertices": vertices,
        "invalid_geometries": invalid,
        "empty_source_geometries": empty,
        "sum_polygon_area_km2": round(area / 1_000_000, 6),
        "classification_fields": classification_fields,
        "classifications": [
            {"values": list(key), "records": count}
            for key, count in sorted(histogram.items(), key=lambda item: str(item[0]))
        ],
    }
    if "jsym1" in fields:
        result["jsym1_jsym2_different_records"] = pair_differences
    reader.close()
    return result, geometries


def round_coordinates(value):
    if isinstance(value, (list, tuple)):
        return [round_coordinates(item) for item in value]
    return round(value, 5) if isinstance(value, float) else value


def benchmark(geometries, classes):
    to_wgs84 = pyproj.Transformer.from_crs(25832, 4326, always_xy=True).transform
    results = []
    for tolerance in [0, 25, 50, 100]:
        start = time.perf_counter()
        # Streaming compression avoids retaining the complete national GeoJSON.
        compressor = zlib.compressobj(level=9, wbits=31)
        raw_bytes = 0
        gzip_bytes = 0
        vertices = 0
        invalid = 0
        absolute_area_change = 0.0

        def consume(text):
            nonlocal raw_bytes, gzip_bytes
            encoded = text.encode("utf-8")
            raw_bytes += len(encoded)
            gzip_bytes += len(compressor.compress(encoded))

        consume('{"type":"FeatureCollection","features":[')
        for index, (original, values) in enumerate(zip(geometries, classes)):
            simplified = original if tolerance == 0 else original.simplify(
                tolerance, preserve_topology=True
            )
            invalid += int(not simplified.is_valid)
            vertices += int(shapely.get_num_coordinates(simplified))
            absolute_area_change += abs(simplified.area - original.area)
            geographic = mapping(shapely.transform(simplified, to_wgs84, interleaved=False))
            geographic["coordinates"] = round_coordinates(geographic["coordinates"])
            feature = {
                "type": "Feature",
                "properties": {"source_record": index, "code": values[0], "landscape": values[1]},
                "geometry": geographic,
            }
            if index:
                consume(",")
            consume(json.dumps(feature, ensure_ascii=False, separators=(",", ":")))
        consume("]}")
        gzip_bytes += len(compressor.flush())
        results.append({
            "tolerance_m": tolerance,
            "vertices_native": vertices,
            "invalid_native_geometries": invalid,
            "sum_absolute_area_change_km2": round(absolute_area_change / 1_000_000, 6),
            "geojson_bytes": raw_bytes,
            "gzip_bytes": gzip_bytes,
            "elapsed_seconds_local": round(time.perf_counter() - start, 3),
        })
    return {
        "scope": "All source geomorphology polygons; properties limited to record, code and English class",
        "coordinate_rounding_wgs84_decimals": 5,
        "limitations": [
            "Per-polygon topology preservation does not preserve shared borders between polygons",
            "Area change is not symmetric-difference area or a bound on positional error",
            "Validity is checked before coordinate rounding and reprojection, not after",
            "These are payload sizes, not browser/mobile loading or rendering measurements",
            "Source lake polygons are included; no land mask or amber interpretation is applied",
        ],
        "results": results,
    }


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--source-dir", required=True, type=Path)
    parser.add_argument("--output", required=True, type=Path)
    parser.add_argument("--only-older-soil", action="store_true",
                        help="Audit just the later-added national 1:200,000 input")
    arguments = parser.parse_args()
    root = arguments.source_dir.resolve(strict=True)
    report = {"research_date": "2026-10-04", "archives": [], "layers": {}}
    for filename, expected_md5 in ARCHIVES.items():
        if arguments.only_older_soil and filename != "Jordart_200000_Shape.zip":
            continue
        path = root / filename
        actual_md5 = digest(path, "md5")
        if actual_md5 != expected_md5:
            raise ValueError(f"Public archive identity mismatch: {filename}")
        report["archives"].append({
            "file": filename, "bytes": path.stat().st_size,
            "geus_md5": actual_md5, "sha256": digest(path, "sha256"),
        })
    if not arguments.only_older_soil:
        geomorph_path = locate(root, "Geomorfologi.shp")
        report["layers"]["geomorphology"], geometries = audit_layer(
            geomorph_path, ["tsym", "landskab", "landscape"], collect_geometry=True
        )
        with shapefile.Reader(str(geomorph_path), encoding="utf-8") as reader:
            classes = [(record.as_dict()["tsym"], record.as_dict()["landscape"]) for record in reader.iterRecords()]
        report["geomorphology_payload_experiment"] = benchmark(geometries, classes)
        print("Geomorphology and payload experiment complete", file=sys.stderr)
        report["layers"]["soil"], _ = audit_layer(
            locate(root, "Jordart_25000_v7_1.shp"), ["tsym", "Jordart", "Tidsalder"]
        )
        print("Soil geometry audit complete", file=sys.stderr)
        report["layers"]["ice_margins"], _ = audit_layer(
            locate(root, "Israndslinier.shp"), ["TYPE", "Version"]
        )
    report["layers"]["older_soil"], _ = audit_layer(
        locate(root, "jordart_200000.shp"), ["TSYM", "Version"], encoding="cp1252"
    )
    report["runtime"] = {
        "python": platform.python_version(), "pyshp": shapefile.__version__,
        "shapely": shapely.__version__, "geos": shapely.geos_version_string,
        "pyproj": pyproj.__version__,
    }
    report["limitations"] = [
        "Polygon area sum is not an audited country coverage percentage",
        "Source validity checks do not prove a complete nonoverlapping polygon coverage",
        "The data have no amber concentrations or field-find probabilities",
    ]
    arguments.output.parent.mkdir(parents=True, exist_ok=True)
    arguments.output.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print("Public geodata audit written", file=sys.stderr)


if __name__ == "__main__":
    main()
