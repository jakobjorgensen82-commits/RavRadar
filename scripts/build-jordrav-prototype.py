"""Build static public geology only; no downloads, weather, DB or production calls.

Python: pyshp 2.3.1, shapely >= 2.1, pyproj. Input identity is pinned to the
research audit. All overlay operations occur in EPSG:25832. Each 20 km tile is
a checked partition, simplified with shared boundaries, then exported WGS84.
"""
import argparse
from collections import Counter, defaultdict
import gzip
import hashlib
import json
import math
from pathlib import Path
import struct
import tempfile
import time

import pyproj
import shapefile
import shapely
from shapely.geometry import box, mapping, shape
from shapely.ops import transform
from lib.jordrav_model import RULES_PATH, RULES, MODEL, group, landscape_group, classify

ROOT = Path(__file__).resolve().parents[1]
BUILD_CONTRACT = "public-overlay-cm-grid-v1"
SIZE = 20000
TO_WGS = pyproj.Transformer.from_crs(25832, 4326, always_xy=True).transform
FROM_WGS = pyproj.Transformer.from_crs(4326, 25832, always_xy=True).transform
EXPORT_REPAIRS = []


def digest(path):
    h = hashlib.sha256()
    with path.open("rb") as f:
        for chunk in iter(lambda: f.read(1024 * 1024), b""):
            h.update(chunk)
    return h.hexdigest()


def polygonal(g):
    if g.is_empty:
        return g
    if g.geom_type in ("Polygon", "MultiPolygon"):
        return g
    pieces = [part for part in shapely.get_parts(g)
              if part.geom_type in ("Polygon", "MultiPolygon")]
    return shapely.union_all(pieces)


def load_layer(root, audit, key, filename, encoding):
    paths = list(root.rglob(filename))
    if len(paths) != 1:
        raise ValueError(f"Expected one {filename}")
    path = paths[0]
    for extension, field in [(".shp", "shp_sha256"), (".dbf", "dbf_sha256")]:
        if digest(path.with_suffix(extension)) != audit["layers"][key][field]:
            raise ValueError(f"Source identity mismatch: {filename}{extension}")
    if pyproj.CRS.from_wkt(path.with_suffix(".prj").read_text()).to_epsg() != 25832:
        raise ValueError("Unexpected CRS")
    cache_dir = root / ".jordrav-prototype-cache"
    cache_key = audit["layers"][key]["shp_sha256"][:16] + "-cm-grid-v1"
    cache_meta = cache_dir / f"{cache_key}.json"
    cache_wkb = cache_dir / f"{cache_key}.wkb"
    if cache_meta.exists() and cache_wkb.exists():
        cached = json.loads(cache_meta.read_text(encoding="utf-8"))
        if digest(cache_wkb) == cached["wkbSha256"]:
            items = []
            with cache_wkb.open("rb") as stream:
                for attributes, source_id, area_delta in cached["attributes"]:
                    length = struct.unpack("<I", stream.read(4))[0]
                    items.append((shapely.from_wkb(stream.read(length)), attributes, source_id, area_delta))
                if stream.read(1):
                    raise ValueError("Cache trailing bytes")
            print(json.dumps({"loaded": key, "records": len(items), "normalizedCache": True}), flush=True)
            return items, cached["evidence"]
    items, repairs, collapsed = [], [], []
    with shapefile.Reader(str(path), encoding=encoding) as reader:
        for index, item in enumerate(reader.iterShapeRecords()):
            original = shape(item.shape.__geo_interface__)
            fixed = original if original.is_valid else polygonal(shapely.make_valid(original))
            delta = abs(fixed.area - original.area)
            if not original.is_valid:
                repairs.append({"id": index, "reason": shapely.is_valid_reason(original),
                                "areaDeltaM2": delta, "resultType": fixed.geom_type})
            if not fixed.is_valid or delta > 1:
                raise ValueError(f"Uncontrolled normalization: {filename}/{index}")
            # A centimetre grid prevents numerical slivers during overlay. Its
            # measured area effect is recorded separately from source repair.
            snapped = shapely.set_precision(fixed, 0.01)
            if snapped.is_empty and fixed.area <= 1:
                collapsed.append({"id": index, "areaM2": fixed.area,
                                  "reason": "Sub-centimetre source sliver collapses on 0.01 m grid"})
                continue
            if snapped.is_empty or not snapped.is_valid:
                raise ValueError(f"Precision loss: {filename}/{index}")
            items.append((snapped, item.record.as_dict(), index,
                          abs(snapped.area - fixed.area)))
    print(json.dumps({"loaded": key, "records": len(items), "repairs": len(repairs)}), flush=True)
    evidence = {"source": key, "records": len(items), "repairs": repairs,
                   "collapsedSourceSlivers": collapsed,
                   "precisionGridM": 0.01,
                   "precisionAbsoluteAreaDeltaM2": sum(v[3] for v in items),
                   "precisionMaxAreaDeltaM2": max(v[3] for v in items)}
    cache_dir.mkdir(exist_ok=True)
    with cache_wkb.open("wb") as stream:
        for geometry, _, _, _ in items:
            payload = shapely.to_wkb(geometry)
            stream.write(struct.pack("<I", len(payload)))
            stream.write(payload)
    cache_meta.write_text(json.dumps({"wkbSha256": digest(cache_wkb), "evidence": evidence,
                                    "attributes": [[a, i, d] for _, a, i, d in items]}, ensure_ascii=False,
                                    default=lambda value: value.isoformat()), encoding="utf-8")
    return items, evidence


def rounded(value, decimals=8):
    if isinstance(value, (tuple, list)):
        return [rounded(v, decimals) for v in value]
    return round(value, decimals) if isinstance(value, float) else value


def export_geometry(g, source_id="overview", segment_max=50, decimals=8, allowed_deviation=0.005):
    # Densify long straight UTM edges before nonlinear coordinate conversion.
    # Clear the GEOS grid model before inserting points: otherwise segmentize
    # snaps new points and can erase a long, narrow but valid source fragment.
    native_mapping = mapping(transform(TO_WGS, shapely.segmentize(shapely.set_precision(g, 0), segment_max)))
    result = {"type": native_mapping["type"], "coordinates": rounded(native_mapping["coordinates"], decimals)}
    final = shape(result)
    if not final.is_valid:
        reason = shapely.is_valid_reason(final)
        try:
            fixed = polygonal(shapely.make_valid(final))
        except shapely.errors.GEOSException:
            # A rounded narrow ring can become mixed-dimensional. Keep the
            # original geometry through the exact-export fallback below.
            fixed = shapely.GeometryCollection()
        back = transform(FROM_WGS, fixed)
        deviation = g.hausdorff_distance(back) if not fixed.is_empty and fixed.is_valid else math.inf
        area_delta = abs(g.area - back.area)
        if deviation > allowed_deviation or area_delta > g.length * allowed_deviation:
            # Retain exact coordinates for a narrow fragment rather than
            # turning a rounding artefact into a source-geometry edit.
            for segment_length in (segment_max, max(1, segment_max // 5), 1):
                exact = transform(TO_WGS, shapely.segmentize(shapely.set_precision(g, 0), segment_length))
                if exact.is_valid:
                    EXPORT_REPAIRS.append({"id":source_id,"reason":"Full precision export for narrow geometry",
                                           "segmentMaxM":segment_length,"roundedCandidateDeviationM":deviation if math.isfinite(deviation) else None})
                    return mapping(exact)
            Path(tempfile.gettempdir(), "RavRadar-jordrav-export-failure.json").write_text(json.dumps({"id":source_id,"geometry":mapping(g)}),encoding="utf-8")
            raise ValueError(f"Unbounded rounded WGS84 normalization: {source_id}; distance={deviation}; area={area_delta}; bound={g.length * allowed_deviation}; isolated diagnostic saved")
        EXPORT_REPAIRS.append({"id":source_id,"reason":reason,"deviationM":deviation,"areaDeltaM2":area_delta})
        result = mapping(fixed)
    if final.is_empty:
        raise ValueError("Empty rounded WGS84 export")
    return result


def check_export_coverage(native, exported, allowed_deviation=0.005):
    valid = bool(shapely.coverage_is_valid(exported))
    bad = [] if valid else shapely.coverage_invalid_edges(exported)
    indices = [i for i,g in enumerate(bad) if not g.is_empty]
    deviations = [native[i].hausdorff_distance(transform(FROM_WGS, exported[i])) for i in indices]
    maximum = max(deviations, default=0)
    # Shared native boundaries remain authoritative. Sub-millimetre coordinate
    # rounding can make GEOS flag a display seam. Accept only a measured <=5 mm
    # envelope, half the recorded native precision grid; never call it an exact
    # exported coverage or resolve source conflicts through this exception.
    if maximum > allowed_deviation:
        idx=indices[deviations.index(maximum)]
        back=transform(FROM_WGS,exported[idx])
        raise ValueError(f"Unbounded export seam: {maximum} m; id={idx}; native={native[idx].bounds}/{native[idx].area}; inverse={back.bounds}/{back.area}; nativeKind={native[idx].geom_type}; exportKind={exported[idx].geom_type}")
    return {"exactCoverageValid":valid, "numericSeamRecords":len(indices),
            "maxInverseProjectionDeviationM":maximum, "allowedDeviationM":allowed_deviation}


def write_json(path, value, compressed=False):
    raw = json.dumps(value, ensure_ascii=False, separators=(",", ":")).encode("utf-8")
    payload = gzip.compress(raw, mtime=0) if compressed else raw
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_bytes(payload)
    return {"file": path.name, "sha256": hashlib.sha256(payload).hexdigest(),
            "bytes": len(payload), "decodedBytes": len(raw)}


def clip_candidates(items, tree, region):
    clipped = []
    for index in sorted(tree.query(region, predicate="intersects")):
        geometry, attributes, source_id, _ = items[index]
        part = polygonal(shapely.intersection(geometry, region, grid_size=0.01))
        if not part.is_empty and part.area > 0:
            clipped.append((part, attributes, source_id))
    return clipped


def node_for_projection(geometries, properties):
    """Insert every shared-edge junction before a nonlinear CRS transform.

    Native coverage validity permits collinear segmented edges. Transforming
    a two-vertex edge separately from its three-vertex neighbour breaks that
    relation. A common planar graph supplies identical vertices to both sides.
    """
    snapped = [shapely.set_precision(g, 0.01) for g in geometries]
    removed = sum(g.area for g in snapped if g.is_empty)
    tree = shapely.STRtree(snapped)
    shapely.prepare(snapped)
    lines = shapely.node(shapely.union_all([g.boundary for g in snapped if not g.is_empty], grid_size=0.01))
    faces, props = [], []
    for face in shapely.get_parts(shapely.polygonize(shapely.get_parts(lines))):
        point = face.representative_point()
        members = [i for i in tree.query(point) if snapped[i].contains(point)]
        if not members:
            continue
        if len(members) != 1:
            raise ValueError("Projection graph has an ambiguous interior")
        cleaned = shapely.set_precision(face, 0.01)
        if cleaned.is_empty:
            removed += face.area
            continue
        faces.append(cleaned)
        props.append(properties[members[0]])
    return faces, props, {"collapsed":sum(g.is_empty for g in snapped),
                          "areaDeltaM2":abs(sum(g.area for g in geometries) - sum(g.area for g in faces)),
                          "removedAreaM2":removed}


def overview_partition(geometries, categories):
    """A checked local class partition, retaining the audited tile extent."""
    parts, keys = [], []
    for geometry, category in zip(geometries, categories):
        for part in shapely.get_parts(geometry):
            parts.append(part); keys.append(category)
    source_area = sum(g.area for g in parts)
    conflicts = 0
    if not shapely.coverage_is_valid(parts):
        tree = shapely.STRtree(parts)
        lines = shapely.node(shapely.union_all([g.boundary for g in parts], grid_size=0.01))
        faces, face_keys = [], []
        for face in shapely.get_parts(shapely.polygonize(shapely.get_parts(lines))):
            members = tree.query(face.representative_point(), predicate="within")
            labels = {keys[i] for i in members}
            if not labels: continue
            if len(labels)>1: conflicts += 1
            faces.append(face); face_keys.append(next(iter(labels)) if len(labels)==1 else "unresolved")
        parts, keys = faces, face_keys
    subdivisions = 0
    if not shapely.coverage_is_valid(parts):
        edges = shapely.union_all([g for g in shapely.coverage_invalid_edges(parts) if not g.is_empty])
        nearby = set(shapely.STRtree(parts).query(edges.buffer(0.01), predicate="intersects"))
        faces, face_keys = [], []
        for i,(geometry,key) in enumerate(zip(parts,keys)):
            if i in nearby and geometry.interiors:
                triangles = list(shapely.get_parts(shapely.constrained_delaunay_triangles(geometry)))
                if geometry.symmetric_difference(shapely.union_all(triangles)).area > 0.00001:
                    raise ValueError("Overview subdivision changed footprint")
                faces.extend(triangles); face_keys.extend([key]*len(triangles)); subdivisions += 1
            else: faces.append(geometry); face_keys.append(key)
        parts, keys = faces, face_keys
    delta=abs(source_area-sum(g.area for g in parts))
    if delta>10 or not shapely.coverage_is_valid(parts) or not all(shapely.is_valid(parts)):
        raise ValueError("Overview local source partition failed")
    return parts, keys, {"coverageValidBeforeGeneralization":True,"areaDeltaM2":delta,
                         "unresolvedConflictFaces":conflicts,"touchingHoleSubdivisions":subdivisions}


def build(source_dir, output):
    started = time.perf_counter()
    audit = json.loads((ROOT / "docs/research/jordrav/public-geodata-audit-2026-10-04.json").read_text())
    layers, normalization = {}, []
    for key, name, encoding in [("soil", "Jordart_25000_v7_1.shp", "utf-8"),
                                ("older_soil", "jordart_200000.shp", "cp1252"),
                                ("geomorphology", "Geomorfologi.shp", "utf-8")]:
        layers[key], evidence = load_layer(source_dir, audit, key, name, encoding)
        normalization.append(evidence)
    trees = {key: shapely.STRtree([v[0] for v in values]) for key, values in layers.items()}
    bounds = [v[0].bounds for values in layers.values() for v in values]
    xmin, ymin = min(b[0] for b in bounds), min(b[1] for b in bounds)
    xmax, ymax = max(b[2] for b in bounds), max(b[3] for b in bounds)
    catalog, catalog_ids = [], {}
    soil_labels = {v["values"][0]: v["values"][1] for v in audit["layers"]["soil"]["classifications"]}
    overview_native, tiles, checks = defaultdict(list), [], []
    area_by_potential = Counter()
    supplement_area = 0
    progress_dir = source_dir / ".jordrav-prototype-cache" / ("progress-" + digest(RULES_PATH)[:16])
    progress_dir.mkdir(exist_ok=True)
    progress_path = progress_dir / "checkpoint.json"
    completed = set()
    resumed_scripts = set()
    if progress_path.exists():
        saved = json.loads(progress_path.read_text(encoding="utf-8"))
        if saved["contract"] != BUILD_CONTRACT or saved["rulesSha256"] != digest(RULES_PATH):
            raise ValueError("Checkpoint contract mismatch")
        for tile in saved["tiles"]:
            if digest(output / tile["file"]) != tile["sha256"]:
                raise ValueError("Checkpoint output identity mismatch")
            binary = progress_dir / f"{tile['id']}.wkb"
            if digest(binary) != saved["overviewHashes"][tile["id"]]:
                raise ValueError("Checkpoint overview identity mismatch")
            with binary.open("rb") as stream:
                for category in saved["overviewClasses"][tile["id"]]:
                    length=struct.unpack("<I",stream.read(4))[0]
                    overview_native[category].append(shapely.from_wkb(stream.read(length)))
        tiles, checks, catalog = saved["tiles"], saved["checks"], saved["catalog"]
        catalog_ids = {tuple(k):v for k,v in saved["catalogIds"]}
        area_by_potential=Counter(saved["areaByPotential"])
        supplement_area=saved["supplementArea"]
        completed={tile["id"] for tile in tiles}
        resumed_scripts=set(saved["producerScripts"])
        EXPORT_REPAIRS.extend(saved["exportRepairs"])
        print(json.dumps({"resumedVerifiedTiles":len(completed)}),flush=True)
    overview_hashes = saved["overviewHashes"] if completed else {}
    overview_classes = saved["overviewClasses"] if completed else {}

    def catalog_id(attrs, geo_attrs, source):
        surface = attrs.get("jsym1", attrs.get("TSYM", "X"))
        depth = attrs.get("jsym2", "")
        symbol = attrs.get("tsym", attrs.get("TSYM", "X"))
        landscape = geo_attrs.get("landskab", "Ikke kortlagt")
        conflict = attrs.get("conflictSymbols", "")
        key = (source, surface, depth, symbol, landscape, str(geo_attrs.get("tsym", "")), conflict)
        if key not in catalog_ids:
            catalog_ids[key] = len(catalog)
            entry = {"source": source, "surface": surface, "depth": depth,
                     "symbol": symbol, "soilLabel": soil_labels.get(symbol, symbol),
                     "landscape": landscape, "landscapeCode": geo_attrs.get("tsym"),
                     "landscapeEnglish": geo_attrs.get("landscape", ""), "conflictSymbols": conflict,
                     **classify(surface, depth, landscape, source == "soil-old")}
            catalog.append(entry)
        return catalog_ids[key]

    for x in range(math.floor(xmin / SIZE), math.ceil(xmax / SIZE)):
        for y in range(math.floor(ymin / SIZE), math.ceil(ymax / SIZE)):
            if f"{x}-{y}" in completed:
                continue
            region = box(x * SIZE, y * SIZE, (x + 1) * SIZE, (y + 1) * SIZE)
            new = clip_candidates(layers["soil"], trees["soil"], region)
            geo = clip_candidates(layers["geomorphology"], trees["geomorphology"], region)
            old = clip_candidates(layers["older_soil"], trees["older_soil"], region)
            if not (new or geo or old):
                continue
            known = [v for v in new if v[1]["tsym"] != "X"]
            unknown = [v for v in new if v[1]["tsym"] == "X"]
            known_union = shapely.union_all([v[0] for v in known], grid_size=0.01)
            soils = [(g, a, i, "soil-new") for g, a, i in known]
            extras, extra_attrs = [], []
            for g, a, i in old:
                extra = polygonal(shapely.difference(g, known_union, grid_size=0.01))
                if not extra.is_empty:
                    extras.append(extra)
                    extra_attrs.append((a, i))
            # Node and polygonize legacy boundaries. Overlapping categories
            # become explicit unresolved conflicts; same-category overlap is
            # one face with all contributing source IDs. This also aligns old
            # T-junctions without moving boundaries beyond the recorded grid.
            if extras:
                extra_tree = shapely.STRtree(extras)
                lines = shapely.node(shapely.union_all([g.boundary for g in extras], grid_size=0.01))
                for face in shapely.get_parts(shapely.polygonize(shapely.get_parts(lines))):
                    indices = sorted(extra_tree.query(face.representative_point(), predicate="within"))
                    if not indices:
                        continue
                    symbols = sorted({extra_attrs[j][0]["TSYM"] for j in indices})
                    attrs = extra_attrs[indices[0]][0] if len(symbols) == 1 else {"TSYM": "X", "conflictSymbols": "/".join(symbols)}
                    ids = "+".join(str(extra_attrs[j][1]) for j in indices)
                    soils.append((face, attrs, ids, "soil-old"))
                    supplement_area += face.area
            extras_union = shapely.union_all(extras, grid_size=0.01)
            for g, a, i in unknown:
                remainder = polygonal(shapely.difference(g, extras_union, grid_size=0.01))
                if not remainder.is_empty:
                    soils.append((remainder, a, i, "soil-new"))
            geo_tree = shapely.STRtree([v[0] for v in geo])
            pieces, properties = [], []
            for g, a, i, source in soils:
                intersections = []
                for j in sorted(geo_tree.query(g, predicate="intersects")):
                    gg, ga, gi = geo[j]
                    cut = polygonal(shapely.intersection(g, gg, grid_size=0.01))
                    if cut.is_empty:
                        continue
                    intersections.append(cut)
                    pieces.append(cut)
                    properties.append({"i": catalog_id(a, ga, source),
                                       "o": f"{'n' if source == 'soil-new' else 's'}{i}:g{gi}"})
                left = polygonal(shapely.difference(g, shapely.union_all(intersections, grid_size=0.01), grid_size=0.01))
                if not left.is_empty:
                    pieces.append(left)
                    properties.append({"i": catalog_id(a, {}, source),
                                       "o": f"{'n' if source == 'soil-new' else 's'}{i}:g?"})
            soil_union = shapely.union_all([v[0] for v in soils], grid_size=0.01)
            for g, a, i in geo:
                remainder = polygonal(shapely.difference(g, soil_union, grid_size=0.01))
                if not remainder.is_empty:
                    pieces.append(remainder)
                    properties.append({"i": catalog_id({"jsym1": "X", "jsym2": "X", "tsym": "X"}, a, "soil-new"), "o": f"gap:g{i}"})
            if not pieces:
                continue
            # Both layers must form a partition. Refuse to conceal overlaps by
            # painting later features over earlier features.
            aligned = False
            conflicts = 0
            touching_hole_subdivisions = []
            union_area = shapely.union_all(pieces, grid_size=0.01).area
            input_overlap = max(0, sum(g.area for g in pieces) - union_area)
            if not shapely.coverage_is_valid(pieces):
                aligned = True
                face_tree = shapely.STRtree(pieces)
                lines = shapely.node(shapely.union_all([g.boundary for g in pieces], grid_size=0.01))
                faces, face_props = [], []
                for face in shapely.get_parts(shapely.polygonize(shapely.get_parts(lines))):
                    members = sorted(face_tree.query(face.representative_point(), predicate="within"))
                    if not members:
                        continue
                    indices = {properties[j]["i"] for j in members}
                    ids = "+".join(properties[j]["o"] for j in members)
                    if len(indices) == 1:
                        ci = indices.pop()
                    else:
                        conflicts += 1
                        symbols = "/".join(sorted({catalog[j]["symbol"] for j in indices}))
                        source = "soil-new" if any(catalog[j]["source"] == "soil-new" for j in indices) else "soil-old"
                        ci = catalog_id({"jsym1":"X", "jsym2":"X", "TSYM":"X", "tsym":"X", "conflictSymbols":symbols}, {}, source)
                    faces.append(face)
                    face_props.append({"i":ci, "o":ids})
                partition_area_delta=abs(sum(g.area for g in faces) - union_area)
                # The noded intersection graph is also centimetre-snapped.
                # Record this additional area effect; reject >10 square metres
                # per 400 square-kilometre tile rather than pretending exact
                # floating point area equality after two grid operations.
                if partition_area_delta > 10:
                    raise ValueError(f"Partition area changed: {x}-{y}; delta={partition_area_delta}")
                pieces, properties = faces, face_props
                if not shapely.coverage_is_valid(pieces):
                    # GEOS coverage validation rejects this point-touching
                    # shell/hole arrangement even though its intersections
                    # have zero area. Subdivide only nearby polygons with
                    # holes into constrained triangles: no boundary moves,
                    # added land, category changes or discarded fragments.
                    bad = shapely.coverage_invalid_edges(pieces)
                    edges = shapely.union_all([g for g in bad if not g.is_empty])
                    nearby = set(shapely.STRtree(pieces).query(edges.buffer(0.01), predicate="intersects"))
                    divided, divided_props = [], []
                    for i, (geometry, prop) in enumerate(zip(pieces, properties)):
                        holes = sum(len(part.interiors) for part in shapely.get_parts(geometry))
                        if i in nearby and holes:
                            triangles = list(shapely.get_parts(shapely.constrained_delaunay_triangles(geometry)))
                            reconstructed = shapely.union_all(triangles)
                            if geometry.symmetric_difference(reconstructed).area > 0.00001:
                                raise ValueError("Touching-hole subdivision changed the source footprint")
                            touching_hole_subdivisions.append({"id":prop["o"],"triangles":len(triangles),
                                "absoluteAreaDeltaM2":abs(geometry.area-sum(g.area for g in triangles))})
                            divided.extend(triangles)
                            divided_props.extend([prop] * len(triangles))
                        else:
                            divided.append(geometry); divided_props.append(prop)
                    pieces, properties = divided, divided_props
                if not shapely.coverage_is_valid(pieces):
                    diagnostic = Path(tempfile.gettempdir(), "RavRadar-jordrav-alignment-failure.json")
                    bad = shapely.coverage_invalid_edges(pieces)
                    diagnostic.write_text(json.dumps({"tile":f"{x}-{y}","geometries":[shapely.to_wkb(g).hex() for g in pieces],
                        "properties":properties,"invalidEdges":[shapely.to_wkb(g).hex() for g in bad],
                        "unionArea":union_area,"partitionAreaDeltaM2":partition_area_delta}),encoding="utf-8")
                    raise ValueError(f"Boundary alignment failed: {x}-{y}; isolated diagnostic saved")
            detailed = shapely.coverage_simplify(pieces, 20, simplify_boundary=False)
            if not shapely.coverage_is_valid(detailed) or not all(shapely.is_valid(detailed)):
                raise ValueError(f"Shared boundary simplification failed: {x}-{y}")
            projection_geoms, projection_props, projection_audit = node_for_projection(detailed, properties)
            if projection_audit["areaDeltaM2"] > 10:
                raise ValueError(f"Projection graph area changed: {x}-{y}; delta={projection_audit['areaDeltaM2']}")
            features = [{"type": "Feature", "properties": p, "geometry": export_geometry(g, f"{x}-{y}/{p['o']}")}
                        for g, p in zip(projection_geoms, projection_props)]
            exported = [shape(f["geometry"]) for f in features]
            export_check = check_export_coverage(projection_geoms, exported)
            tile_id = f"{x}-{y}"
            meta = write_json(output / f"tile-{tile_id}.geojson.gz",
                              {"type": "FeatureCollection", "modelVersion": MODEL, "features": features}, True)
            # Envelope sampled on all sides avoids curved UTM-edge misses.
            boundary = shapely.segmentize(region.boundary, 1000)
            meta.update({"id": tile_id, "bbox": list(transform(TO_WGS, boundary).bounds),
                         "features": len(features)})
            tiles.append(meta)
            groups = defaultdict(list)
            for g, p in zip(pieces, properties):
                category = catalog[p["i"]]["potential"]
                groups[category].append(g)
                area_by_potential[category] += g.area
            classes = sorted(groups)
            dissolved = [shapely.union_all(groups[k], grid_size=0.01) for k in classes]
            for category, geometry in zip(classes, dissolved):
                overview_native[category].append(geometry)
            checks.append({"tile": tile_id, "features": len(pieces),
                           "boundaryNodingRequired": aligned, "inputOverlapM2": input_overlap,
                           "partitionAreaDeltaM2":partition_area_delta if aligned else 0,
                           "projectionGraph":projection_audit,
                           "unresolvedConflictFaces": conflicts,
                           "touchingHoleSubdivisions":touching_hole_subdivisions,
                           "coverageValidNative": True, "exportCoverage":export_check,
                           "simplificationAbsoluteAreaDeltaM2": float(sum(abs(a.area-b.area) for a,b in zip(pieces,detailed)))})
            binary=progress_dir / f"{tile_id}.wkb"
            with binary.open("wb") as stream:
                for geometry in dissolved:
                    payload=shapely.to_wkb(geometry)
                    stream.write(struct.pack("<I",len(payload)));stream.write(payload)
            overview_hashes[tile_id]=digest(binary)
            overview_classes[tile_id]=classes
            resumed_scripts.add(digest(Path(__file__)))
            progress_path.write_text(json.dumps({"contract":BUILD_CONTRACT,"rulesSha256":digest(RULES_PATH),
                "tiles":tiles,"checks":checks,"catalog":catalog,"catalogIds":list(catalog_ids.items()),
                "areaByPotential":dict(area_by_potential),"supplementArea":supplement_area,
                "overviewHashes":overview_hashes,"overviewClasses":overview_classes,
                "producerScripts":sorted(resumed_scripts),"exportRepairs":EXPORT_REPAIRS},ensure_ascii=False),encoding="utf-8")
            print(json.dumps({"tile": tile_id, "features": len(features), "gzip": meta["bytes"],
                              "elapsedSeconds": round(time.perf_counter() - started)}), flush=True)
    # Keep national overview cells separate. A country-wide boolean dissolve
    # creates giant point-touching polygons and expensive global diagnostics.
    # Every cell has its own checked source partition and disjoint UTM extent.
    overview, overview_checks = [], []
    for tile in tiles:
        tile_id=tile["id"]
        local=[]
        with (progress_dir / f"{tile_id}.wkb").open("rb") as stream:
            for category in overview_classes[tile_id]:
                length=struct.unpack("<I",stream.read(4))[0]
                local.append(shapely.from_wkb(stream.read(length)))
        source, labels, source_check=overview_partition(local,overview_classes[tile_id])
        simplified=shapely.coverage_simplify(source,100,simplify_boundary=True)
        if not shapely.coverage_is_valid(simplified) or not all(shapely.is_valid(simplified)):
            raise ValueError(f"Overview generalization failed: {tile_id}")
        projected, labels, projection_check=node_for_projection(simplified,labels)
        if projection_check["areaDeltaM2"]>10:
            raise ValueError(f"Overview projection graph changed: {tile_id}")
        # Union only faces of the same class within one small cell, without
        # another precision snap. This preserves their already checked class
        # boundary; shell/hole point contacts may change the GEOS grouping flag.
        categories=sorted(set(labels))
        grouped=[shapely.union_all([shapely.set_precision(g,0) for g,k in zip(projected,labels) if k==category]) for category in categories]
        group_delta=abs(sum(g.area for g in projected)-sum(g.area for g in grouped))
        if group_delta>0.01 or not all(shapely.is_valid(grouped)):
            raise ValueError(f"Overview class grouping changed footprint: {tile_id}")
        x,y=map(int,tile_id.split("-"))
        if any(g.bounds[0]<x*SIZE-0.00001 or g.bounds[1]<y*SIZE-0.00001 or g.bounds[2]>(x+1)*SIZE+0.00001 or g.bounds[3]>(y+1)*SIZE+0.00001 for g in grouped):
            raise ValueError(f"Overview escaped its disjoint cell: {tile_id}")
        features=[{"type":"Feature","properties":{"potential":category,"tile":tile_id},"geometry":export_geometry(g,f"overview/{tile_id}/{category}",segment_max=500,decimals=6,allowed_deviation=0.5)} for category,g in zip(categories,grouped)]
        export_check=check_export_coverage(grouped,[shape(f["geometry"]) for f in features],allowed_deviation=0.5)
        overview.extend(features)
        overview_checks.append({"tile":tile_id,**source_check,"coverageValidAfterGeneralization":True,
            "projectionGraph":projection_check,"classGroupingAreaDeltaM2":group_delta,
            "classGroupingExactCoverageValid":bool(shapely.coverage_is_valid(grouped)),
            "insideDisjointNativeTile":True,"exportCoverage":export_check})
        print(json.dumps({"overviewTile":tile_id,"features":len(features)}),flush=True)
    national_projection_audit={"scope":"Disjoint checked UTM cells", "cells":len(overview_checks),
        "maxAreaDeltaM2":max(c["projectionGraph"]["areaDeltaM2"] for c in overview_checks)}
    national_export_audit={"scope":"Per-cell export checks; no exact country-wide coverage claim",
        "maxInverseProjectionDeviationM":max(c["exportCoverage"]["maxInverseProjectionDeviationM"] for c in overview_checks)}
    overview_meta = write_json(output / "overview.geojson.gz",
                               {"type": "FeatureCollection", "modelVersion": MODEL, "features": overview}, True)
    catalog_meta = write_json(output / "catalog.json.gz", {"modelVersion": MODEL, "entries": catalog}, True)
    rules_meta = write_json(output / "rules.json", RULES)
    report = {"modelVersion": MODEL, "scriptSha256": digest(Path(__file__)),
              "modelCodeSha256":digest(ROOT / "scripts/lib/jordrav_model.py"),
              "checkpointProducerScripts":sorted(resumed_scripts), "buildContract":BUILD_CONTRACT,
              "rulesSha256": digest(RULES_PATH), "sources": audit["layers"],
              "normalization": normalization, "tileChecks": checks,
              "sourceBasedAreaByPotentialKm2": {k: v / 1e6 for k,v in sorted(area_by_potential.items())},
              "olderSupplementAreaKm2": supplement_area / 1e6,
              "tiles": len(tiles), "catalogEntries": len(catalog), "overviewFeatures": len(overview),
              "detailCompressedBytes": sum(t["bytes"] for t in tiles),
              "maxTileCompressedBytes": max(t["bytes"] for t in tiles),
              "detailToleranceM": 20, "overviewToleranceM": 100,
              "exportDecimals": {"detail":8,"overview":6}, "projectionSegmentMaxM":{"detail":50,"overview":500},
              "exportAllowedDeviationM":{"detail":0.005,"overview":0.5},
              "overviewCellChecks":overview_checks,
              "nationalProjectionGraph":national_projection_audit, "nationalExportCoverage":national_export_audit,
              "exportNormalizations":EXPORT_REPAIRS,
              "secondsThisInvocation": round(time.perf_counter()-started, 2), "resumedTiles":len(completed),
              "software": {"shapely": shapely.__version__, "GEOS": shapely.geos_version_string,
                           "pyproj": pyproj.__version__, "pyshp": shapefile.__version__}}
    write_json(ROOT / "docs/research/jordrav/prototype-build-audit.json", report)
    write_json(output / "manifest.json", {"schemaVersion": 1, "modelVersion": MODEL,
               "status": "prototype", "overview": overview_meta, "catalog": catalog_meta,
               "rules": rules_meta, "tiles": tiles, "detailZoom": 11,
               "maxVisibleTiles": 12, "maxTileCache": 18})
    print(json.dumps({"complete": True, "tiles": len(tiles),
                      "detailCompressedBytes": report["detailCompressedBytes"],
                      "overviewCompressedBytes": overview_meta["bytes"],
                      "secondsThisInvocation": report["secondsThisInvocation"]}), flush=True)


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--source-dir", type=Path, required=True)
    parser.add_argument("--output-dir", type=Path,
                        default=ROOT / "data/jordrav/prototype-0.1.0")
    args = parser.parse_args()
    build(args.source_dir, args.output_dir)
