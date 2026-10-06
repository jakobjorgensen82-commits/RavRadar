"""Read-only native sediment/contact diagnosis of the Stenstrup lake polygon.

Uses the already verified GEUS centimetre-grid cache, never display tiles.
This verifies geometry and source identities, not amber or plough-layer access.
No network, buffers, ranking, model changes or source-cache writes.
"""
import argparse
from collections import defaultdict
import hashlib
import itertools
import json
from pathlib import Path
import struct
import sys

import pyproj
import shapely
from shapely import from_wkb, intersection, union_all

ROOT = Path(__file__).resolve().parents[3]
LAKE_SOURCE_ID = 10265
GRID_M = 0.01
EXPECTED_RULES = "655b5c50a212d43fa65c536731553399b8608ed93653665fd6f9e852e4ee9bed"
EXPECTED_MODEL = "1d7290f7adff65af5fc8b726f7f60548467ef921128c8ce74626b9f4ec1546b9"


def digest(path):
    with path.open("rb") as stream:
        return hashlib.file_digest(stream, "sha256").hexdigest()


def checked_cache(source_root, key):
    audit_path = Path(__file__).with_name("prototype-source-cache-audit.json")
    source_audit = json.loads(audit_path.read_bytes())
    if source_audit["status"] != "PASS":
        raise ValueError("Source cache has not passed its original attribute audit")
    pinned = next(item for item in source_audit["layers"] if item["source"] == key)
    stem = pinned["shpSha256"][:16] + "-cm-grid-v1"
    meta_path = source_root / ".jordrav-prototype-cache" / (stem + ".json")
    wkb_path = meta_path.with_suffix(".wkb")
    if digest(meta_path) != pinned["cacheMetadataSha256"] or digest(wkb_path) != pinned["cacheGeometrySha256"]:
        raise ValueError(f"Source cache identity changed: {key}")
    meta = json.loads(meta_path.read_bytes())
    if meta["wkbSha256"] != pinned["cacheGeometrySha256"] or meta["evidence"]["precisionGridM"] != GRID_M:
        raise ValueError("Cache geometry/grid binding mismatch")
    if len(meta["attributes"]) != pinned["attributesVerifiedAgainstOriginal"]:
        raise ValueError("Cache record count changed")
    return meta, wkb_path, pinned


def geometries(meta, wkb_path):
    with wkb_path.open("rb") as stream:
        for attributes, source_id, _area_delta in meta["attributes"]:
            prefix = stream.read(4)
            if len(prefix) != 4:
                raise ValueError("Truncated cache record")
            length = struct.unpack("<I", prefix)[0]
            raw = stream.read(length)
            if len(raw) != length:
                raise ValueError("Truncated WKB")
            geometry = from_wkb(raw)
            # Identity binding refers to the earlier complete native validity
            # audit. Precision/validity work below is only for selected records.
            yield attributes, source_id, geometry
        if stream.read(1):
            raise ValueError("Trailing cache geometry")


def area_rows(groups, total_area):
    return [{"codes": list(codes), "area_km2": round(geometry.area / 1e6, 9),
             "percentOfLake": round(100 * geometry.area / total_area, 6)}
            for codes, geometry in sorted(groups.items(), key=lambda item: (-item[1].area, item[0]))]


def dissolve(parts):
    return {key: union_all(geometries, grid_size=0) for key, geometries in parts.items()}


def linear_parts(geometry):
    if geometry.is_empty:
        return []
    if geometry.geom_type in ("LineString", "LinearRing"):
        return [geometry]
    return [line for part in getattr(geometry, "geoms", []) for line in linear_parts(part)]


def audit(source_root):
    rules_path = ROOT / "data/jordrav/model-rules.json"
    model_path = ROOT / "scripts/lib/jordrav_model.py"
    if digest(rules_path) != EXPECTED_RULES or digest(model_path) != EXPECTED_MODEL:
        raise ValueError("Frozen qualitative rules/model implementation changed")
    rules = json.loads(rules_path.read_bytes())
    sys.path.insert(0, str(ROOT / "scripts"))
    from lib.jordrav_model import classify
    geom_meta, geom_path, geom_binding = checked_cache(source_root, "geomorphology")
    lake = None
    for attributes, source_id, geometry in geometries(geom_meta, geom_path):
        if source_id == LAKE_SOURCE_ID:
            if attributes["landskab"] != "Issøflade":
                raise ValueError("Selected lake source label changed")
            if geometry.is_empty or not geometry.is_valid:
                raise ValueError("Invalid selected lake geometry")
            lake, lake_attributes = geometry, attributes
    if lake is None:
        raise ValueError("Selected lake polygon missing")
    neighbours = []
    for attributes, source_id, geometry in geometries(geom_meta, geom_path):
        if source_id == LAKE_SOURCE_ID or not geometry.envelope.intersects(lake.envelope):
            continue
        shared = intersection(geometry.boundary, lake.boundary, grid_size=0)
        if shared.length:
            neighbours.append({"sourceId": source_id, "label": attributes["landskab"],
                               "sharedLakeBoundary_m": round(shared.length, 3)})
    soil_meta, soil_path, soil_binding = checked_cache(source_root, "soil")
    by_upper, by_pair, by_class = defaultdict(list), defaultdict(list), defaultdict(list)
    source_rows, clipped_parts = [], []
    lake_bounds = lake.bounds
    for attributes, source_id, geometry in geometries(soil_meta, soil_path):
        left, bottom, right, top = geometry.bounds
        if right < lake_bounds[0] or left > lake_bounds[2] or top < lake_bounds[1] or bottom > lake_bounds[3]:
            continue
        if geometry.is_empty or not geometry.is_valid:
            raise ValueError(f"Invalid regional soil geometry: {source_id}")
        clipped = intersection(geometry, lake, grid_size=0)
        if clipped.area == 0:
            continue
        upper, depth = attributes["jsym1"], attributes["jsym2"]
        potential = classify(upper, depth, "Issøflade")["potential"]
        by_upper[(upper,)].append(clipped)
        by_pair[(upper, depth)].append(clipped)
        by_class[(potential,)].append(clipped)
        clipped_parts.append(clipped)
        source_rows.append({"sourceId": source_id, "upper": upper, "depth": depth,
                            "area_km2": round(clipped.area / 1e6, 9)})
    upper_groups, pair_groups, class_groups = map(dissolve, (by_upper, by_pair, by_class))
    coverage = union_all(clipped_parts, grid_size=0)
    missing = lake.difference(coverage, grid_size=0).area
    excess = coverage.difference(lake, grid_size=0).area
    overlaps = sum(part.area for part in clipped_parts) - coverage.area
    # One square metre is an explicit numerical audit tolerance, not map accuracy.
    if max(missing, excess, abs(overlaps)) > 1:
        raise ValueError(f"Native partition defect: {missing}, {excess}, {overlaps}")
    group_area_delta = sum(geometry.area for geometry in upper_groups.values()) - lake.area
    if abs(group_area_delta) > 1:
        raise ValueError("Dissolved sediment area sum differs from selected lake")
    contacts, contact_geometries = [], {}
    for (a, geom_a), (b, geom_b) in itertools.combinations(sorted(upper_groups.items()), 2):
        lines = linear_parts(intersection(geom_a.boundary, geom_b.boundary, grid_size=0))
        if not lines:
            continue
        shared = union_all(lines, grid_size=0).difference(lake.boundary, grid_size=0)
        if shared.length == 0:
            continue
        pair = (a[0], b[0])
        # Pair length counts each shared mapped boundary once, never point touches.
        contacts.append({"upperCodes": list(pair), "sharedLength_m": round(shared.length, 3)})
        contact_geometries[pair] = shared
    contacts.sort(key=lambda item: (-item["sharedLength_m"], item["upperCodes"]))
    different_pair_area = sum(geom.area for (upper, depth), geom in pair_groups.items() if upper != depth)
    to_geo = pyproj.Transformer.from_crs(25832, 4326, always_xy=True)
    centroids = {code[0]: [round(geometry.centroid.x, 3), round(geometry.centroid.y, 3)]
                 for code, geometry in upper_groups.items() if code[0] in ("TS", "TL")}
    result = {
        "status": "PASS",
        "scope": "Source identity, native mapped sediment areas and lateral shared boundaries only; no amber, vertical contact, field-use or plough-layer verification.",
        "researchDate": "2026-10-04",
        "scriptSha256": digest(Path(__file__)),
        # This older text report uses Git's platform newline conversion. Bind
        # its explicitly LF-normalized UTF-8 text, not platform-specific CRLF.
        "sourceAuditLfTextSha256": hashlib.sha256(Path(__file__).with_name("prototype-source-cache-audit.json").read_text(encoding="utf-8").encode("utf-8")).hexdigest(),
        "rulesSha256": digest(rules_path),
        "modelImplementationSha256": digest(model_path),
        "modelVersion": rules["modelVersion"],
        "software": {"shapely": shapely.__version__, "geos": shapely.geos_version_string, "pyproj": pyproj.__version__},
        "geometry": {"crs": "EPSG:25832", "precisionGrid_m": GRID_M,
                     "source": "Verified native normalized source cache; no display generalization, buffer or cropping window",
                     "overlayPrecision": "Full floating precision (grid_size=0); no repeated centimetre snapping of derived intersections",
                     "positionalAccuracyClaim": False, "contactLengthIsRanking": False},
        "sourceBindings": [geom_binding, soil_binding],
        "lake": {"sourceId": LAKE_SOURCE_ID, "label": lake_attributes["landskab"],
                 "sourceVersion": lake_attributes["version"], "area_km2": round(lake.area / 1e6, 9),
                 "bounds_EPSG25832": list(lake.bounds),
                 "representativePoint_lon_lat": list(to_geo.transform(lake.representative_point().x, lake.representative_point().y)),
                 "extentIsAmberBoundary": False},
        "partition": {"soilRecordsIntersecting": len(source_rows), "gap_m2": round(missing, 6),
                      "excess_m2": round(excess, 6), "overlap_m2": round(overlaps, 6),
                      "dissolvedUpperAreaMinusLake_m2": round(group_area_delta, 6), "numericalTolerance_m2": 1},
        "upperSedimentAreas": area_rows(upper_groups, lake.area),
        "upperDepthPairs": area_rows(pair_groups, lake.area),
        "differentUpperDepthArea_km2": round(different_pair_area / 1e6, 9),
        "currentQualitativeClasses": area_rows(class_groups, lake.area),
        "lateralMappedContacts": contacts,
        "areaWeightedCentroids_EPSG25832": centroids,
        "neighbouringLandscapeContacts": sorted(neighbours, key=lambda item: (-item["sharedLakeBoundary_m"], item["sourceId"])),
        "soilSourceRecords": sorted(source_rows, key=lambda item: item["sourceId"]),
    }
    return result, lake, upper_groups, contact_geometries


def figure(path, lake, upper_groups, contacts):
    import matplotlib
    matplotlib.use("Agg")
    import matplotlib.pyplot as plt
    from matplotlib.patches import Patch
    colours = {"TL": "#7a87bd", "TS": "#d1af69", "TG": "#be9757", "DS": "#f2d295",
               "DG": "#e5bb73", "ML": "#bc977f", "MS": "#ccaa8a", "FT": "#81a994",
               "FP": "#638d79", "FS": "#97beaa", "FL": "#a7c7bb", "S": "#eadcc3", "MG": "#a88b78"}
    labels = {"TL": "Smeltevandsler (proglacialt)", "TS": "Smeltevandssand (proglacialt)",
              "DS": "Smeltevandssand (glacialt)", "MG": "Morænegrus", "ML": "Moræneler",
              "FT": "Ferskvandstørv", "FP": "Ferskvandsgytje", "FS": "Ferskvandssand",
              "FL": "Ferskvandsler", "S": "Sand, uspecificeret"}
    fig, ax = plt.subplots(figsize=(10, 7))
    x0, y0, x1, y1 = lake.bounds
    # Compound paths preserve holes occupied by other mapped sediment groups.
    # GEOS precision-normalized exterior/interior rings have opposite orientation.
    from matplotlib.path import Path as PlotPath
    from matplotlib.patches import PathPatch
    for (code,), geometry in sorted(upper_groups.items()):
        polygons = geometry.geoms if geometry.geom_type == "MultiPolygon" else [geometry]
        for polygon in polygons:
            if polygon.geom_type != "Polygon":
                raise ValueError("Unexpected figure geometry")
            vertices, commands = [], []
            for ring in [polygon.exterior, *polygon.interiors]:
                xy = [((x-x0)/1000, (y-y0)/1000) for x, y in ring.coords]
                vertices.extend(xy)
                commands.extend([PlotPath.MOVETO] + [PlotPath.LINETO]*(len(xy)-2) + [PlotPath.CLOSEPOLY])
            ax.add_patch(PathPatch(PlotPath(vertices, commands), facecolor=colours.get(code, "#eeeeee"), linewidth=0))
    selected = ("TL", "TS")
    if selected in contacts:
        lines = contacts[selected].geoms if hasattr(contacts[selected], "geoms") else [contacts[selected]]
        for line in lines:
            if line.geom_type not in ("LineString", "LinearRing"):
                continue
            coords = list(line.coords)
            ax.plot([(x-x0)/1000 for x, y in coords], [(y-y0)/1000 for x, y in coords], color="#802540", linewidth=1.25)
    ax.set_xlim(-.15, (x1-x0)/1000+.15)
    ax.set_ylim(-.15, (y1-y0)/1000+.15)
    ax.set_aspect("equal")
    ax.set_xlabel("Østafstand fra kortudsnittets vestkant (km)")
    ax.set_ylabel("Nordafstand fra kortudsnittets sydkant (km)")
    ax.set_title("Stenstrup: øvre kortlagte aflejringer og lateral kontakt\nGEUS Issøflade, kildepolygon 10265 • ingen ravklasse eller markafgrænsning", fontsize=12)
    handles = [Patch(facecolor=colours.get(code, "#eeeeee"), label=f"{code}: {labels.get(code, code)}") for code, in sorted(upper_groups)]
    from matplotlib.lines import Line2D
    handles.append(Line2D([0], [0], color="#802540", label="TL–TS: kortlagt nabogrænse"))
    ax.legend(handles=handles, loc="upper left", bbox_to_anchor=(1.01, 1), fontsize=9, frameon=False)
    fig.text(.07, .02, "EPSG:25832. Native normalisering på 1 cm beregningsgitter; det angiver ikke kortets stednøjagtighed.\nJordartskortet beskriver geologiske lag under pløjelaget. Kontakten er ikke et påvist ravlag.", fontsize=8)
    fig.tight_layout(rect=(0, .06, 1, 1))
    fig.savefig(path, dpi=170)
    plt.close(fig)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--source-root", required=True, type=Path)
    parser.add_argument("--output", required=True, type=Path)
    parser.add_argument("--figure", type=Path)
    args = parser.parse_args()
    for destination in (args.output, args.figure):
        if destination and (ROOT / "data" == destination.resolve() or ROOT / "data" in destination.resolve().parents):
            raise ValueError("Research output may not overwrite model data")
    if args.output.suffix != ".json" or (args.figure and args.figure.suffix != ".png"):
        raise ValueError("Research outputs must be JSON/PNG")
    result, lake, upper_groups, contacts = audit(args.source_root.resolve())
    args.output.write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n", encoding="utf-8", newline="\n")
    if args.figure:
        figure(args.figure, lake, upper_groups, contacts)
    print(json.dumps({"status": result["status"], "lakeArea_km2": result["lake"]["area_km2"],
                      "partition": result["partition"], "internalContactPairs": len(result["lateralMappedContacts"])},
                     ensure_ascii=False))
