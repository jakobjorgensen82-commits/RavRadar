"""Read-only diagnosis of the frozen prototype's focus and surface assumptions.

No network calls, classification changes or potential estimates. Areas describe
20 m generalised DISPLAY polygons, not native source polygons or Danish land.
Run from the repository with the bundled Python (shapely >=2.1, pyproj).
"""
import argparse
from collections import defaultdict
import gzip
import hashlib
import json
from pathlib import Path

import pyproj
import shapely

ROOT = Path(__file__).resolve().parents[3]


def sha(payload):
    return hashlib.sha256(payload).hexdigest()


def checked_file(base, item):
    path = base / item["file"]
    if path.parent != base or path.name != item["file"]:
        raise ValueError("Unexpected dataset path")
    raw = path.read_bytes()
    if len(raw) != item["bytes"] or sha(raw) != item["sha256"]:
        raise ValueError(f"Dataset identity mismatch: {path.name}")
    decoded = gzip.decompress(raw) if path.suffix == ".gz" else raw
    if len(decoded) != item["decodedBytes"]:
        raise ValueError(f"Decoded size mismatch: {path.name}")
    return decoded


def diagnose(base):
    manifest_raw = (base / "manifest.json").read_bytes()
    manifest = json.loads(manifest_raw)
    catalog = json.loads(checked_file(base, manifest["catalog"]))["entries"]
    rules = json.loads(checked_file(base, manifest["rules"]))
    if rules != json.loads((ROOT / "data/jordrav/model-rules.json").read_bytes()):
        raise ValueError("Packaged rules differ from source rules")
    model = manifest["modelVersion"]
    transform = pyproj.Transformer.from_crs(4326, 25832, always_xy=True)
    # Explicit, overlapping QUESTIONS, never proposed automatic promotions.
    coarse = {"glacial-coarse", "glacial-basin-coarse", "marine-coarse", "fresh-coarse"}
    fine = {"glacial-fine", "marine-fine", "fresh-fine"}
    cover = {"aeolian-cover", "organic-cover"}

    def depth_group(entry):
        codes = entry["depth"].split("-")
        return {key for key, values in rules["newerGroups"].items()
                if any(code in values for code in codes)}

    questions = {
        "glacial_basin_coarse_outside_focus": lambda e: e["material"] == "glacial-basin-coarse"
            and e["process"] in {"basin", "meltwater", "erosion"} and e["potential"] == "possible",
        "marine_coarse_on_marine_plain_outside_focus": lambda e: e["material"] == "marine-coarse"
            and e["process"] == "marine" and e["potential"] == "possible",
        "fine_basin_receivers_outside_focus": lambda e: e["material"] in fine
            and e["process"] == "basin" and e["potential"] == "possible",
        "cover_above_any_coarse_depth_code": lambda e: e["source"] == "soil-new"
            and e["material"] in cover and bool(depth_group(e) & coarse)
            and e["potential"] == "possible",
        "enhanced_with_different_upper_and_depth_codes": lambda e: e["source"] == "soil-new"
            and e["potential"] == "enhanced" and e["surface"] != e["depth"],
    }
    flags = {name: {i for i, e in enumerate(catalog) if predicate(e)}
             for name, predicate in questions.items()}
    groups = {name: defaultdict(lambda: [0, 0.0]) for name in
              ["potential", "source", "accessibility", "materialProcess", "questions"]}
    checked_tiles = feature_count = 0
    for item in manifest["tiles"]:
        raw = checked_file(base, item)
        data = json.loads(raw)
        if data["modelVersion"] != model or len(data["features"]) != item["features"]:
            raise ValueError(f"Tile binding mismatch: {item['id']}")
        geometries = shapely.get_parts(shapely.from_geojson(raw.decode("utf-8")))
        if len(geometries) != len(data["features"]):
            raise ValueError("Feature/geometry order mismatch")
        native_display = shapely.transform(geometries, transform.transform, interleaved=False)
        areas = shapely.area(native_display) / 1_000_000
        for feature, area in zip(data["features"], areas):
            i = feature["properties"]["i"]
            e = catalog[i]
            if not area > 0:
                raise ValueError("Non-positive display area")
            labels = {"potential": e["potential"], "source": e["source"],
                      "accessibility": e["accessibility"],
                      "materialProcess": (e["material"], e["process"], e["potential"])}
            for name, key in labels.items():
                groups[name][key][0] += 1
                groups[name][key][1] += float(area)
            for name, ids in flags.items():
                if i in ids:
                    groups["questions"][name][0] += 1
                    groups["questions"][name][1] += float(area)
        feature_count += len(data["features"])
        checked_tiles += 1
        if checked_tiles % 48 == 0:
            print(json.dumps({"checkedTiles": checked_tiles, "displayFragments": feature_count}), flush=True)
    total = sum(row[1] for row in groups["potential"].values())
    for name in questions:
        groups["questions"][name]  # Retain questions with zero matching area.
    result = {
        "status": "PASS", "modelVersion": model,
        "manifestSha256": sha(manifest_raw),
        "rulesSha256": sha((ROOT / "data/jordrav/model-rules.json").read_bytes()),
        "diagnosisScriptSha256": sha(Path(__file__).read_bytes()),
        "scope": "Read-only questions about process focus and mapping depth; no classification change",
        "areaBasis": "Sum of 20 m generalised detail display polygons, inverse projected to EPSG:25832",
        "countBasis": "Exported polygon fragments; not independent sites, finds, source records or field areas",
        "questionsOverlap": True, "totalDisplayAreaKm2": total,
        "checkedTiles": checked_tiles, "displayFragments": feature_count,
        "software": {"shapely": shapely.__version__, "GEOS": shapely.geos_version_string,
                     "pyproj": pyproj.__version__},
    }
    for name, values in groups.items():
        result[name] = [{"key": list(key) if isinstance(key, tuple) else key,
                         "displayFragments": value[0], "displayAreaKm2": value[1],
                         "shareOfDisplayAreaPercent": 100 * value[1] / total}
                        for key, value in sorted(values.items())]
    # Independent published native totals remain distinct from display areas.
    build = json.loads((ROOT / "docs/research/jordrav/prototype-build-audit.json").read_bytes())
    native = build["sourceBasedAreaByPotentialKm2"]
    result["nativeVsDisplayAreaByPotential"] = [
        {"key": row["key"], "nativeSourceAreaKm2": native[row["key"]],
         "displayAreaKm2": row["displayAreaKm2"],
         "displayMinusNativeKm2": row["displayAreaKm2"] - native[row["key"]]}
        for row in result["potential"]]
    return result


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()
    result = diagnose(ROOT / "data/jordrav/prototype-0.1.0")
    args.output.write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({key: result[key] for key in ["status", "checkedTiles", "displayFragments", "questions"]}))
