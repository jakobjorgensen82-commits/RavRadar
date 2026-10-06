"""Read-only geometry prerequisite for the public jordrav prototype."""
import argparse
import json
from pathlib import Path
import time
import shapefile
import shapely
from shapely.geometry import shape

parser = argparse.ArgumentParser()
parser.add_argument("--source-dir", type=Path, required=True)
args = parser.parse_args()
for name, encoding in [("Geomorfologi.shp", "utf-8"),
                       ("Jordart_25000_v7_1.shp", "utf-8"),
                       ("jordart_200000.shp", "cp1252")]:
    start = time.perf_counter()
    matches = list(args.source_dir.rglob(name))
    assert len(matches) == 1, matches
    with shapefile.Reader(str(matches[0]), encoding=encoding) as reader:
        geoms = [shape(item.__geo_interface__) for item in reader.iterShapes()]
    repaired = sum(not item.is_valid for item in geoms)
    geoms = [item if item.is_valid else shapely.make_valid(item) for item in geoms]
    valid = bool(shapely.coverage_is_valid(geoms))
    invalid_edges = shapely.coverage_invalid_edges(geoms) if not valid else []
    print(json.dumps({"file": name, "records": len(geoms), "repaired": repaired,
                      "coverage_valid": valid,
                      "invalid_edge_records": sum(not g.is_empty for g in invalid_edges),
                      "invalid_edge_length_m": round(sum(g.length for g in invalid_edges), 3),
                      "seconds": round(time.perf_counter() - start, 2)}), flush=True)
