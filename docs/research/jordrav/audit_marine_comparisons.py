"""National native marine-environment screening and independent regional windows.

Read-only comparison of the frozen rules, not a new amber classification.
Public annual crops are context; no known finds, buffers or depth assumption.
"""
import argparse
from collections import defaultdict
import json
from pathlib import Path
import sys

import pyproj
import shapely
from shapely import STRtree, union_all
from shapely.geometry import box
from shapely.ops import transform

from audit_stenstrup_contacts import ROOT, checked_cache, digest, geometries
from audit_stenstrup_field_context import source_features, crop_context, polygonal
from audit_asaa_voersaa import EXPECTED_RULES, EXPECTED_MODEL, rows, dissolved
from audit_profile_points import EXPECTED_MANIFEST

MARINE_LABELS = frozenset(("Marin flade", "Tørlagt marint forland", "Hævet senglacial flade",
                           "Strandvold", "Hævet senglacial strandvold"))
SELECTED_CROPS = "Udvalgte korn-, majs-, raps- og andre dyrkningsafgrøder"


def metric_rows(groups, total, national=False):
    result = rows(groups, total)
    for row in result:
        row["percentOfSelectedCoverage" if national else "percentOfWindow"] = row.pop("percentOfCorridor")
    return result


def run(source_root, source_dir, region_path):
    for path, expected in ((ROOT / "data/jordrav/model-rules.json", EXPECTED_RULES),
                           (ROOT / "scripts/lib/jordrav_model.py", EXPECTED_MODEL),
                           (ROOT / "data/jordrav/prototype-0.1.0/manifest.json", EXPECTED_MANIFEST)):
        if digest(path) != expected:
            raise ValueError("Frozen prototype identity differs")
    sys.path.insert(0, str(ROOT / "scripts"))
    from lib.jordrav_model import classify
    definition = json.loads(region_path.read_bytes())
    project = pyproj.Transformer.from_crs(4326, 25832, always_xy=True).transform
    regions = [(r, transform(project, box(*r["bbox"]))) for r in definition["regions"]]
    region_tree = STRtree([g for _r, g in regions])
    geom_meta, geom_path, geom_binding = checked_cache(source_root, "geomorphology")
    soil_meta, soil_path, soil_binding = checked_cache(source_root, "soil")
    landscapes = list(geometries(geom_meta, geom_path))
    marine = [(a, i, g) for a, i, g in landscapes if a["landskab"] in MARINE_LABELS]
    marine_tree = STRtree([g for _a, _i, g in marine])
    all_landscape_tree = STRtree([g for _a, _i, g in landscapes])
    nation_parts = defaultdict(list)
    regional_soils = [[] for _r in regions]
    source_record_count, overlay_count = 0, 0
    print(f"Marine source polygons: {len(marine)}; regional windows: {len(regions)}", flush=True)
    for attrs, source_id, soil in geometries(soil_meta, soil_path):
        upper, depth = attrs["jsym1"], attrs["jsym2"]
        for index in marine_tree.query(soil, predicate="intersects"):
            landscape, _geom_id, geom = marine[index]
            cut = polygonal(soil.intersection(geom, grid_size=0))
            if not cut.area:
                continue
            classification = classify(upper, depth, landscape["landskab"])
            key = (landscape["landskab"], classification["material"], classification["potential"])
            nation_parts[key].append(cut)
            overlay_count += 1
        for index in region_tree.query(soil, predicate="intersects"):
            cut = polygonal(soil.intersection(regions[index][1], grid_size=0))
            if cut.area:
                regional_soils[index].append((attrs, source_id, cut))
        source_record_count += 1
    print(f"Soil scan complete: {source_record_count}; positive marine intersections: {overlay_count}", flush=True)
    national_groups = dissolved(nation_parts)
    national_union = union_all(list(national_groups.values()), grid_size=0)
    group_delta = sum(g.area for g in national_groups.values()) - national_union.area
    source_marine_union = union_all([g for _a, _i, g in marine], grid_size=0)
    # Explicitly report any cross-group overlap; do not silently absorb it in
    # an area ranking. Sources are the previously audited centimetre cache.
    if abs(group_delta) > 1:
        raise ValueError(f"National material/process groups overlap: {group_delta} m2")
    case_results = []
    for index, (definition_row, region) in enumerate(regions):
        soil = regional_soils[index]
        landscape = []
        for gi in all_landscape_tree.query(region, predicate="intersects"):
            attrs, source_id, geom = landscapes[gi]
            cut = polygonal(geom.intersection(region, grid_size=0))
            if cut.area:
                landscape.append((attrs, source_id, cut))
        upper_parts, landscape_parts, pair_parts = [defaultdict(list) for _ in range(3)]
        for attrs, _id, cut in soil:
            upper_parts[(attrs["jsym1"], attrs["jsym2"])].append(cut)
        for attrs, _id, cut in landscape:
            landscape_parts[attrs["landskab"]].append(cut)
        for attrs_s, _id, cut_s in soil:
            for attrs_g, _gid, cut_g in landscape:
                cut = polygonal(cut_s.intersection(cut_g, grid_size=0))
                if cut.area:
                    category = classify(attrs_s["jsym1"], attrs_s["jsym2"], attrs_g["landskab"])
                    pair_parts[(attrs_s["jsym1"], attrs_s["jsym2"], attrs_g["landskab"],
                                category["potential"], category["material"])].append(cut)
        uppers, landforms, pairs = map(dissolved, (upper_parts, landscape_parts, pair_parts))
        common = union_all(list(pairs.values()), grid_size=0)
        pair_delta = sum(g.area for g in pairs.values()) - common.area
        if abs(pair_delta) > 1:
            raise ValueError(f"Regional source pairs overlap: {definition_row['id']}")
        fields, binding = source_features(source_dir, "marine-" + definition_row["id"] + "-fields2026", ("Afgkode", "Afgroede"))
        from urllib.parse import parse_qs, urlsplit
        bbox = parse_qs(urlsplit(binding["url"]).query)["bbox"][0].split(",")
        if not box(*map(float, bbox[:4])).covers(region):
            raise ValueError("WFS query does not cover complete comparison window")
        crop_parts, positive = defaultdict(list), 0
        for attrs, geom in fields:
            cut = polygonal(geom.intersection(region, grid_size=0))
            if cut.area:
                crop_parts[crop_context(attrs)].append(cut)
                positive += 1
        crops = dissolved(crop_parts)
        selected = crops.get(SELECTED_CROPS, box(0, 0, 0, 0))
        pair_on_crops = {key: polygonal(g.intersection(selected, grid_size=0)) for key, g in pairs.items()}
        pair_on_crops = {key: g for key, g in pair_on_crops.items() if g.area}
        relevant = {key: g for key, g in pair_on_crops.items() if key[2] in MARINE_LABELS}
        case_results.append({**definition_row, "windowArea_km2": region.area / 1e6,
            "scope": "Research window, including all landforms; not an amber zone or road/shore corridor",
            "soilSourceIds": [i for _a, i, _g in soil], "landscapeSourceIds": [i for _a, i, _g in landscape],
            "soilPairs": metric_rows(uppers, region.area), "landscapes": metric_rows(landforms, region.area),
            "nativePairs": metric_rows(pairs, region.area), "commonNativeCoverage_km2": common.area / 1e6,
            "pairPartitionDelta_m2": pair_delta, "fieldBinding": binding, "positiveFieldRecords": positive,
            "fieldUnion_km2": union_all(list(crops.values()), grid_size=0).area / 1e6,
            "selectedCropUnion_km2": selected.area / 1e6, "cropContext": metric_rows(crops, region.area),
            "marinePairsOnSelectedCrops": metric_rows(relevant, region.area),
            "marineSelectedCropUnion_km2": union_all(list(relevant.values()), grid_size=0).area / 1e6,
            "actualPloughAccessVerified": False, "knownAmberFindRequired": False})
        print(f"Compared {definition_row['id']}: {positive} field records", flush=True)
    return {"status": "PASS", "scope": "National existing-rule screening of newer-soil overlap with five marine/shore landforms plus five comparative windows; no new classification",
        "modelVersion": "0.1.0-prototype", "rulesSha256": EXPECTED_RULES, "modelSha256": EXPECTED_MODEL,
        "manifestSha256": EXPECTED_MANIFEST, "scriptSha256": digest(Path(__file__)), "regionDefinitionSha256": digest(region_path),
        "sharedScriptSha256": {name: digest(Path(__file__).with_name(name)) for name in
            ("audit_stenstrup_contacts.py", "audit_stenstrup_field_context.py", "audit_asaa_voersaa.py", "audit_profile_points.py")},
        "sourceBindings": [soil_binding, geom_binding], "software": {"shapely": shapely.__version__, "pyproj": pyproj.__version__},
        "national": {"selectedMarineSourcePolygons": len(marine), "scannedNewerSoilRecords": source_record_count,
            "positivePairIntersections": overlay_count, "newerSoilMarineCoverage_km2": national_union.area / 1e6,
            "marineLandformUnion_km2": source_marine_union.area / 1e6,
            "marineLandformWithoutNewerSoil_km2": source_marine_union.difference(national_union).area / 1e6,
            "groupSumMinusUnion_m2": group_delta, "numericalTolerance_m2": 1,
            "notDenmarkLandArea": True, "notAmberArea": True,
            "olderSoilSupplementIncluded": False, "groups": metric_rows(national_groups, national_union.area, national=True)},
        "regions": case_results, "currentExposureMeasured": False, "knownFindsNeeded": False}


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    for flag in ("source-root", "source-dir", "regions", "output"):
        parser.add_argument("--" + flag, type=Path, required=True)
    args = parser.parse_args()
    if ROOT / "data" in args.output.resolve().parents:
        raise ValueError("Research output cannot overwrite model data")
    result = run(args.source_root, args.source_dir, args.regions)
    args.output.write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n", encoding="utf-8", newline="\n")
    print(json.dumps({"status": result["status"], "nationalCoverage_km2": result["national"]["newerSoilMarineCoverage_km2"],
        "cases": [{"id": r["id"], "marineSelectedCropUnion_km2": r["marineSelectedCropUnion_km2"]} for r in result["regions"]]}))
