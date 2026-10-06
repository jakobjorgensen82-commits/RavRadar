"""Read-only comparison of selected public profiles with frozen display polygons.

This checks traceability and point lookup, not amber presence or native source
geometry. No network, dataset edits, radius interpolation or classification.
Run with bundled Python/shapely/pyproj; --output writes only an audit report.
"""
import argparse
from collections import defaultdict
import gzip
import hashlib
import json
from pathlib import Path

import pyproj
import shapely
from shapely.geometry import Point, shape
from shapely.ops import transform

ROOT = Path(__file__).resolve().parents[3]
EXPECTED_MANIFEST = "53db672df2541756d380a17bda724bbaec8e870d0e80ce9d39a6a89802447198"


def sha(raw):
    return hashlib.sha256(raw).hexdigest()


def checked_file(base, item):
    path = base / item["file"]
    if path.parent != base or path.name != item["file"]:
        raise ValueError("Unexpected dataset path")
    raw = path.read_bytes()
    if sha(raw) != item["sha256"] or len(raw) != item["bytes"]:
        raise ValueError(f"Identity mismatch: {path.name}")
    decoded = gzip.decompress(raw) if path.suffix == ".gz" else raw
    if len(decoded) != item["decodedBytes"]:
        raise ValueError(f"Decoded length mismatch: {path.name}")
    return decoded


def audit():
    base = ROOT / "data/jordrav/prototype-0.1.0"
    manifest_raw = (base / "manifest.json").read_bytes()
    if sha(manifest_raw) != EXPECTED_MANIFEST:
        raise ValueError("Frozen prototype manifest changed")
    manifest = json.loads(manifest_raw)
    catalog_data = json.loads(checked_file(base, manifest["catalog"]))
    if catalog_data["modelVersion"] != manifest["modelVersion"]:
        raise ValueError("Catalog model binding mismatch")
    catalog = catalog_data["entries"]
    rules = json.loads(checked_file(base, manifest["rules"]))
    if rules != json.loads((ROOT / "data/jordrav/model-rules.json").read_bytes()):
        raise ValueError("Packaged rules differ from source")
    observations_path = Path(__file__).with_name("profile-observations-2026-10-04.json")
    observation_raw = observations_path.read_bytes()
    observations = json.loads(observation_raw)
    to_metric = pyproj.Transformer.from_crs(4326, 25832, always_xy=True).transform
    results = []
    checked_tiles = {}
    for profile in observations["profiles"]:
        end = profile["selectedDepth_m"][0]
        thickness = defaultdict(float)
        for interval in profile["intervals"]:
            top, bottom = interval["top_m"], interval["bottom_m"]
            if top != end or not top < bottom <= profile["totalDepth_m"]:
                raise ValueError(f"Invalid selected interval: {profile['dgu']}")
            thickness[interval["code"]] += bottom - top
            end = bottom
        if end != profile["selectedDepth_m"][1]:
            raise ValueError("Selected depth is not covered")
        lon, lat = profile["location"]["longitude"], profile["location"]["latitude"]
        point = Point(lon, lat)
        hits, candidate_tiles = [], []
        for item in manifest["tiles"]:
            left, bottom, right, top = item["bbox"]
            if left <= lon <= right and bottom <= lat <= top:
                if item["id"] not in checked_tiles:
                    tile = json.loads(checked_file(base, item))
                    if tile["modelVersion"] != manifest["modelVersion"] or len(tile["features"]) != item["features"]:
                        raise ValueError("Detail tile binding mismatch")
                    checked_tiles[item["id"]] = tile
                candidate_tiles.append(item["id"])
                for feature in checked_tiles[item["id"]]["features"]:
                    geometry = shape(feature["geometry"])
                    if geometry.covers(point):
                        index = feature["properties"]["i"]
                        if type(index) is not int or not 0 <= index < len(catalog):
                            raise ValueError("Invalid catalog index")
                        hits.append({
                            "tile": item["id"],
                            "catalogIndex": index,
                            "origin": feature["properties"]["o"],
                            "displayBoundaryDistance_m": round(transform(to_metric, geometry.boundary).distance(transform(to_metric, point)), 3),
                            "classification": catalog[index],
                        })
        if not hits:
            raise ValueError(f"No displayed polygon for profile {profile['dgu']}")
        results.append({"dgu": profile["dgu"], "selectedDepth_m": profile["selectedDepth_m"],
                        "registeredThicknessByCode_m": dict(sorted(thickness.items())),
                        "candidateTiles": candidate_tiles, "displayHits": hits,
                        "amberOrPloughLayerVerified": False})
    return {
        "status": "PASS",
        "scope": "Traceability, selected interval continuity and point lookup only; not scientific validation of amber hypotheses.",
        "modelVersion": manifest["modelVersion"],
        "manifestSha256": sha(manifest_raw),
        "observationsSha256": sha(observation_raw),
        "scriptSha256": sha(Path(__file__).read_bytes()),
        "observedAt": observations["observedAt"],
        "checkedDetailTiles": len(checked_tiles),
        "geometry": "20 m generalised exported display polygons; no native source geometry or positional accuracy claim",
        "software": {"shapely": shapely.__version__, "pyproj": pyproj.__version__},
        "profiles": results,
    }


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output", type=Path)
    args = parser.parse_args()
    result = audit()
    text = json.dumps(result, ensure_ascii=False, indent=2) + "\n"
    if args.output:
        resolved = args.output.resolve()
        if resolved == ROOT / "data/jordrav/prototype-0.1.0/manifest.json" or ROOT / "data" in resolved.parents:
            raise ValueError("Audit output may not overwrite model data")
        resolved.write_text(text, encoding="utf-8")
    else:
        print(text, end="")
