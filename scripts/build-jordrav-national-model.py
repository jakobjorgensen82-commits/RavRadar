"""Reclassify every audited national detail feature; preserve its geometry.

The older 0.1 artifact is the immutable source, not a source-data rebuild.
Overview precision/generalization is display-only and measured separately.
"""
import argparse
from collections import Counter, defaultdict
import gzip
import hashlib
import importlib.util
import json
from pathlib import Path
import sys
import time

import shapely
from shapely.geometry import shape, box
from shapely.ops import transform

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts/lib"))
from jordrav_model import MODEL, RULES, RULES_PATH, classify

spec = importlib.util.spec_from_file_location("legacy_geometry", ROOT / "scripts/build-jordrav-prototype.py")
geometry = importlib.util.module_from_spec(spec)
spec.loader.exec_module(geometry)
OLD_SHA = "53db672df2541756d380a17bda724bbaec8e870d0e80ce9d39a6a89802447198"
OLD = ROOT / "data/jordrav/prototype-0.1.0"
OUT = ROOT / "data/jordrav" / ("prototype-" + MODEL.split("-", 1)[0])


def sha(path):
    with path.open("rb") as stream:
        return hashlib.file_digest(stream, "sha256").hexdigest()


def load(entry):
    path = OLD / entry["file"]
    if sha(path) != entry["sha256"] or path.stat().st_size != entry["bytes"]:
        raise ValueError("Historical artifact identity changed: " + path.name)
    raw = gzip.decompress(path.read_bytes()) if path.suffix == ".gz" else path.read_bytes()
    if len(raw) != entry["decodedBytes"]:
        raise ValueError("Historical decoded length changed")
    return json.loads(raw)


def fingerprint(features):
    return hashlib.sha256(json.dumps(features, ensure_ascii=False, separators=(",", ":")).encode()).hexdigest()


def build(limit=None):
    started = time.perf_counter()
    if sha(OLD / "manifest.json") != OLD_SHA:
        raise ValueError("Historical manifest changed")
    manifest = json.loads((OLD / "manifest.json").read_bytes())
    catalog = load(manifest["catalog"])["entries"]
    old_classes = [entry["potential"] for entry in catalog]
    for entry in catalog:
        entry.update(classify(entry["surface"], entry["depth"], entry["landscape"], entry["source"] == "soil-old"))
    overview, tiles, checks = [], [], []
    counts, areas, transition, sources, matrix = Counter(), Counter(), Counter(), Counter(), Counter()
    for tile in manifest["tiles"][:limit]:
        payload = load(tile)
        features = payload["features"]
        if len(features) != tile["features"]:
            raise ValueError("Historical feature count changed")
        before = fingerprint(features)
        payload["modelVersion"] = MODEL
        meta = geometry.write_json(OUT / tile["file"], payload, True)
        meta.update({key: tile[key] for key in ("id", "bbox", "features")})
        tiles.append(meta)
        x, y = map(int, tile["id"].split("-"))
        cell = box(x*20000, y*20000, (x+1)*20000, (y+1)*20000)
        groups = defaultdict(list)
        precision_delta, precision_bound = 0, 0
        for feature in features:
            entry = catalog[feature["properties"]["i"]]
            category = entry["potential"]
            native = shapely.transform(shape(feature["geometry"]), geometry.FROM_WGS, interleaved=False)
            if not native.is_valid or native.is_empty:
                raise ValueError("Invalid inverse detail geometry")
            # The exported details have a measured <=5 mm projection envelope.
            # An explicit 1 cm display snap/clipping removes those tiny seams;
            # it never writes back to the detail geometry or source caches.
            snapped = geometry.polygonal(shapely.intersection(shapely.set_precision(native, .01), cell, grid_size=.01))
            delta = shapely.symmetric_difference(native, shapely.set_precision(snapped, 0), grid_size=.001).area
            bound = native.length * .02 + .001
            if delta > bound:
                raise ValueError("Overview display normalization exceeds perimeter envelope")
            precision_delta += delta
            precision_bound += bound
            if not snapped.is_empty:
                groups[category].append(snapped)
            counts[category] += 1
            areas[category] += native.area
            transition[(old_classes[feature["properties"]["i"]], category)] += native.area
            sources[entry["source"]] += 1
            matrix[(entry["material"], entry["process"], category)] += native.area
        classes = sorted(groups)
        dissolved = [shapely.union_all(groups[key], grid_size=.01) for key in classes]
        source, labels, source_check = geometry.overview_partition(dissolved, classes)
        simplified = shapely.coverage_simplify(source, 100, simplify_boundary=True)
        if not shapely.coverage_is_valid(simplified) or not all(shapely.is_valid(simplified)):
            raise ValueError("Invalid overview generalization")
        generalization_delta = sum(abs(a.area-b.area) for a, b in zip(source, simplified))
        projected, labels, projection_check = geometry.node_for_projection(simplified, labels)
        if projection_check["areaDeltaM2"] > 10:
            raise ValueError("Overview noding changed footprint")
        classes = sorted(set(labels))
        grouped = [shapely.union_all([shapely.set_precision(g, 0) for g, k in zip(projected, labels) if k == key]) for key in classes]
        for g in grouped:
            if not g.is_valid or g.difference(cell).area > .00001:
                raise ValueError("Overview escaped its native cell")
        local = [{"type":"Feature", "properties":{"potential":key, "tile":tile["id"]},
                  "geometry":geometry.export_geometry(g, "0.2/"+tile["id"]+"/"+key,
                      segment_max=500, decimals=6, allowed_deviation=.5)} for key, g in zip(classes, grouped)]
        export_check = geometry.check_export_coverage(grouped, [shape(f["geometry"]) for f in local], .5)
        overview.extend(local)
        if fingerprint(features) != before:
            raise ValueError("Reclassification mutated detail features")
        checks.append({"tile":tile["id"], "features":len(features), "unchangedFeaturesSha256":before,
                       "detailFeaturesUnchanged":True, "displayNormalizationSymmetricDifferenceM2":precision_delta,
                       "displayNormalizationPerimeterBoundM2":precision_bound,
                       "generalizationAbsoluteAreaDeltaM2":generalization_delta,
                       "sourcePartition":source_check, "projectionGraph":projection_check,
                       "exportCoverage":export_check, "overviewFeatures":len(local)})
        print(json.dumps({"tile":tile["id"], "completed":len(tiles), "total":len(manifest["tiles"]),
                          "seconds":round(time.perf_counter()-started)}), flush=True)
    if limit:
        return
    overview_meta = geometry.write_json(OUT / "overview.geojson.gz", {"type":"FeatureCollection", "modelVersion":MODEL, "features":overview}, True)
    catalog_meta = geometry.write_json(OUT / "catalog.json.gz", {"modelVersion":MODEL, "entries":catalog}, True)
    rules_meta = geometry.write_json(OUT / "rules.json", RULES)
    new_manifest = {**manifest, "modelVersion":MODEL, "overview":overview_meta, "catalog":catalog_meta,
                    "rules":rules_meta, "tiles":tiles}
    manifest_meta = geometry.write_json(OUT / "manifest.json", new_manifest)
    report = {"status":"PASS", "modelVersion":MODEL, "contract":"national-reclassification-preserved-detail-v1",
              "scriptSha256":sha(Path(__file__)), "modelCodeSha256":sha(ROOT / "scripts/lib/jordrav_model.py"),
              "rulesSha256":sha(RULES_PATH), "geometryHelperSha256":sha(ROOT / "scripts/build-jordrav-prototype.py"),
              "historicalManifestSha256":OLD_SHA, "manifestSha256":manifest_meta["sha256"],
              "tiles":len(tiles), "features":sum(counts.values()), "catalogEntries":len(catalog),
              "overviewFeatures":len(overview), "detailFeaturesUnchanged":True, "sourceFeatureCounts":dict(sources),
              "featureCountByClass":dict(counts), "inverseDetailDisplayAreaByClassKm2":{k:v/1e6 for k,v in sorted(areas.items())},
              "transitionsDisplayKm2":[{"from":a,"to":b,"areaKm2":v/1e6} for (a,b),v in sorted(transition.items())],
              "materialProcessClassDisplayKm2":[{"material":m,"process":p,"class":c,"areaKm2":v/1e6} for (m,p,c),v in sorted(matrix.items())],
              "areaWarning":"Inverse-projected simplified display detail areas; not native source area or verified amber area",
              "tileChecks":checks, "exportNormalizations":geometry.EXPORT_REPAIRS,
              "seconds":round(time.perf_counter()-started,2), "software":{"shapely":shapely.__version__,"GEOS":shapely.geos_version_string}}
    geometry.write_json(ROOT / "docs/research/jordrav/national-model-0.2-build-audit.json", report)
    print(json.dumps({"complete":True, "tiles":len(tiles), "features":report["features"], "counts":dict(counts),
                      "overviewBytes":overview_meta["bytes"], "seconds":report["seconds"]}), flush=True)


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--limit", type=int)
    build(parser.parse_args().limit)
