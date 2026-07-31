#!/usr/bin/env python3
"""Build RavRadar zone score-lines from a real coastline source.

The generator is intentionally offline/deterministic once the source GeoJSON is
present. It keeps the existing 4.0.44 audited geometry as the guide and rollback
snapshot, but replaces the visible coastLine with a contiguous segment cut from
an external, high-resolution OSM-derived coastline.

Safety principles:
- never modify zone polygons, IDs, scoring, routing, anchors or data points;
- generate into memory, validate the whole country, then atomically replace;
- keep per-zone fallback to the audited 4.0.44 line;
- fail the release if too few active zones can be generated safely;
- remove small harbour/pier detours by geometric hairpin bridging;
- place the visible line a few metres landward (away from marine dataPoint).
"""
from __future__ import annotations

import argparse
import json
import math
import os
import shutil
import statistics
import tempfile
from dataclasses import dataclass
from pathlib import Path
from typing import Iterable, Iterator, Sequence

from pyproj import Transformer
from shapely.geometry import GeometryCollection, LineString, MultiLineString, MultiPolygon, Point, Polygon, shape
from shapely.ops import linemerge, substring, transform, unary_union
from shapely.strtree import STRtree

ROOT = Path(__file__).resolve().parents[1]
DEFAULT_ZONES = ROOT / "data/zones.geojson"
DEFAULT_GUIDE = ROOT / "data/geometry-snapshots/zones-4.0.44.geojson"
DEFAULT_AUDIT = ROOT / "data/diagnostics/production-coastline-4.0.47.json"
DEFAULT_SNAPSHOT = ROOT / "data/geometry-snapshots/zones-4.0.47.geojson"
VERSION = "4.0.47"
SOURCE_LABEL = "OSM-derived countries-coastline-100m v0.6.0"
DENMARK_BBOX = (7.5, 54.25, 15.75, 58.1)

TO_M = Transformer.from_crs("EPSG:4326", "EPSG:25832", always_xy=True)
TO_LL = Transformer.from_crs("EPSG:25832", "EPSG:4326", always_xy=True)

MIN_GENERATED_ACTIVE = 190
MAX_AVG_GUIDE_DISTANCE_M = 7000.0
MAX_ENDPOINT_DISTANCE_M = 18000.0
MAX_VERTEX_GAP_M = 140.0
LANDWARD_OFFSET_M = 5.0
SIMPLIFY_TOLERANCE_M = 12.0


@dataclass
class CandidateResult:
    line_m: LineString
    score: float
    guide_avg_m: float
    guide_max_m: float
    endpoint_start_m: float
    endpoint_end_m: float
    length_ratio: float
    component_index: int


def iter_lines(geometry) -> Iterator[LineString]:
    if geometry is None or geometry.is_empty:
        return
    if isinstance(geometry, LineString):
        if len(geometry.coords) >= 2:
            yield geometry
    elif isinstance(geometry, MultiLineString):
        for part in geometry.geoms:
            yield from iter_lines(part)
    elif isinstance(geometry, Polygon):
        yield LineString(geometry.exterior.coords)
        for ring in geometry.interiors:
            yield LineString(ring.coords)
    elif isinstance(geometry, MultiPolygon):
        for part in geometry.geoms:
            yield from iter_lines(part)
    elif isinstance(geometry, GeometryCollection):
        for part in geometry.geoms:
            yield from iter_lines(part)


def bbox_intersects(bounds, bbox=DENMARK_BBOX) -> bool:
    minx, miny, maxx, maxy = bounds
    bx1, by1, bx2, by2 = bbox
    return not (maxx < bx1 or minx > bx2 or maxy < by1 or miny > by2)


def load_source_lines(path: Path) -> list[LineString]:
    doc = json.loads(path.read_text("utf-8"))
    features = doc.get("features", []) if isinstance(doc, dict) else []
    raw: list[LineString] = []
    for feature in features:
        geom_doc = feature.get("geometry") if isinstance(feature, dict) else None
        if not geom_doc:
            continue
        geom = shape(geom_doc)
        if not bbox_intersects(geom.bounds):
            continue
        for line in iter_lines(geom):
            if bbox_intersects(line.bounds):
                raw.append(transform(TO_M.transform, line))
    if not raw:
        raise RuntimeError(f"No coastline LineStrings found for Denmark in {path}")

    # Join source chunks that share exact endpoints. OSM-derived coastline files
    # are often split into short pieces for download efficiency.
    unioned = unary_union(raw)
    merged = unioned if isinstance(unioned, LineString) else linemerge(unioned)
    lines = [line for line in iter_lines(merged) if line.length >= 100.0]
    if not lines:
        raise RuntimeError("Coastline source could not be merged into usable lines")
    return lines


def sample_line(line: LineString, count: int = 25) -> list[Point]:
    count = max(2, count)
    return [line.interpolate(line.length * i / (count - 1)) for i in range(count)]


def mean_distance(a: LineString, b: LineString, count: int = 31) -> tuple[float, float]:
    distances = [p.distance(b) for p in sample_line(a, count)]
    return statistics.fmean(distances), max(distances)


def line_between(line: LineString, start_d: float, end_d: float) -> list[LineString]:
    """Return plausible paths between projected distances, including ring complement."""
    if line.length <= 0:
        return []
    lo, hi = sorted((start_d, end_d))
    direct = substring(line, lo, hi)
    results = [direct] if isinstance(direct, LineString) and direct.length > 0 else []

    coords = list(line.coords)
    is_ring = len(coords) > 3 and Point(coords[0]).distance(Point(coords[-1])) < 2.0
    if is_ring and lo > 0 and hi < line.length:
        tail = substring(line, hi, line.length)
        head = substring(line, 0, lo)
        if isinstance(tail, LineString) and isinstance(head, LineString):
            joined = LineString([*tail.coords, *list(head.coords)[1:]])
            if joined.length > 0:
                results.append(joined)
    if start_d > end_d:
        results = [LineString(list(path.coords)[::-1]) for path in results]
    return results


def remove_harbour_hairpins(line: LineString) -> LineString:
    """Bridge compact artificial detours while preserving natural broad curvature.

    Piers and harbour basins often create a U-shaped detour: much longer travelled
    distance than the direct chord, over a relatively small spatial extent. The
    rule deliberately only bridges compact excursions; fjords and headlands are
    too large to meet the chord/window constraints.
    """
    coords = list(line.coords)
    if len(coords) < 5:
        return line
    changed = True
    while changed:
        changed = False
        cumulative = [0.0]
        for a, b in zip(coords, coords[1:]):
            cumulative.append(cumulative[-1] + Point(a).distance(Point(b)))
        n = len(coords)
        for i in range(n - 3):
            # Search up to roughly 2.5 km along the path.
            for j in range(i + 3, n):
                path_len = cumulative[j] - cumulative[i]
                if path_len > 2500:
                    break
                chord = Point(coords[i]).distance(Point(coords[j]))
                if chord < 25 or chord > 850:
                    continue
                ratio = path_len / chord
                if ratio < 2.35 or path_len - chord < 220:
                    continue
                # Do not bridge if the excursion is broad; artificial harbour
                # loops stay close to the chord endpoints compared with length.
                section = LineString(coords[i:j + 1])
                max_dev = max(Point(c).distance(LineString([coords[i], coords[j]])) for c in coords[i:j + 1])
                if max_dev <= 420:
                    coords = coords[:i + 1] + coords[j:]
                    changed = True
                    break
            if changed:
                break
    return LineString(coords)


def densify(line: LineString, max_gap: float = MAX_VERTEX_GAP_M) -> LineString:
    if line.length <= max_gap:
        return line
    count = max(2, math.ceil(line.length / max_gap) + 1)
    return LineString([line.interpolate(line.length * i / (count - 1)).coords[0] for i in range(count)])


def landward_offset(line: LineString, marine_xy: tuple[float, float] | None) -> LineString:
    if not marine_xy:
        return line
    marine = Point(marine_xy)
    output = []
    for x, y in line.coords:
        dx, dy = x - marine.x, y - marine.y
        length = math.hypot(dx, dy)
        if length < 1:
            output.append((x, y))
        else:
            output.append((x + dx / length * LANDWARD_OFFSET_M, y + dy / length * LANDWARD_OFFSET_M))
    return LineString(output)


def choose_candidate(guide_m: LineString, components: list[LineString], tree: STRtree) -> CandidateResult | None:
    corridor = guide_m.buffer(25000)
    indices = tree.query(corridor)
    best: CandidateResult | None = None
    start = Point(guide_m.coords[0]); end = Point(guide_m.coords[-1])
    guide_length = max(guide_m.length, 1.0)

    for raw_index in indices:
        # Shapely 2 returns integer indexes; Shapely 1 may return geometries.
        if isinstance(raw_index, (int,)) or hasattr(raw_index, "item"):
            idx = int(raw_index)
            component = components[idx]
        else:
            component = raw_index
            try:
                idx = components.index(component)
            except ValueError:
                idx = -1
        start_near = component.interpolate(component.project(start))
        end_near = component.interpolate(component.project(end))
        start_gap = start.distance(start_near)
        end_gap = end.distance(end_near)
        if start_gap > MAX_ENDPOINT_DISTANCE_M or end_gap > MAX_ENDPOINT_DISTANCE_M:
            continue
        start_d = component.project(start)
        end_d = component.project(end)
        for route in line_between(component, start_d, end_d):
            if route.length < 300:
                continue
            ratio = route.length / guide_length
            if not 0.35 <= ratio <= 3.4:
                continue
            avg, max_d = mean_distance(route, guide_m)
            # Symmetric measure catches routes that take the long way around an island.
            reverse_avg, _ = mean_distance(guide_m, route)
            score = (
                avg * 1.0 + reverse_avg * 1.25 + max_d * 0.22
                + (start_gap + end_gap) * 0.20
                + abs(math.log(max(ratio, 1e-6))) * 1800
            )
            result = CandidateResult(route, score, avg, max_d, start_gap, end_gap, ratio, idx)
            if best is None or result.score < best.score:
                best = result
    return best


def coords_lonlat(line_m: LineString) -> list[list[float]]:
    line_ll = transform(TO_LL.transform, line_m)
    out: list[list[float]] = []
    for x, y in line_ll.coords:
        point = [round(float(x), 6), round(float(y), 6)]
        if not out or point != out[-1]:
            out.append(point)
    return out


def active_features(doc: dict) -> list[dict]:
    return [f for f in doc.get("features", []) if f.get("properties", {}).get("zoneStatus") == "active"]


def build(zones_path: Path, guide_path: Path, source_path: Path, audit_path: Path, snapshot_path: Path,
          minimum_generated: int = MIN_GENERATED_ACTIVE) -> dict:
    zones = json.loads(zones_path.read_text("utf-8"))
    guide = json.loads(guide_path.read_text("utf-8"))
    guide_by_id = {f.get("properties", {}).get("id"): f for f in guide.get("features", [])}
    components = load_source_lines(source_path)
    tree = STRtree(components)

    records = []
    generated = fallback = 0
    for feature in zones.get("features", []):
        props = feature.get("properties", {})
        if props.get("zoneStatus") != "active":
            continue
        zone_id = props.get("id")
        guide_feature = guide_by_id.get(zone_id)
        guide_coords = (guide_feature or {}).get("properties", {}).get("coastLine")
        if not isinstance(guide_coords, list) or len(guide_coords) < 2:
            records.append({"zoneId": zone_id, "status": "fallback", "reason": "missing-audited-guide"})
            fallback += 1
            continue
        guide_m = transform(TO_M.transform, LineString(guide_coords))
        candidate = choose_candidate(guide_m, components, tree)
        reason = None
        if candidate is None:
            reason = "no-safe-source-route"
        elif candidate.guide_avg_m > MAX_AVG_GUIDE_DISTANCE_M:
            reason = "source-route-too-far-from-zone-guide"
        else:
            cleaned = remove_harbour_hairpins(candidate.line_m)
            cleaned = cleaned.simplify(SIMPLIFY_TOLERANCE_M, preserve_topology=False)
            cleaned = densify(cleaned)
            data_point = props.get("dataPoint") or props.get("pinPoint")
            marine_xy = TO_M.transform(*data_point) if isinstance(data_point, list) and len(data_point) == 2 else None
            final_m = landward_offset(cleaned, marine_xy)
            coords = coords_lonlat(final_m)
            gaps = [Point(a).distance(Point(b)) for a, b in zip(final_m.coords, list(final_m.coords)[1:])]
            if len(coords) < 2 or (gaps and max(gaps) > 220):
                reason = "unsafe-vertex-gap"
            else:
                props["coastLine"] = coords
                props["coastLineSource"] = SOURCE_LABEL
                props["coastLineVersion"] = VERSION
                props["coastLineRefinementMode"] = "source-segment-natural-coast"
                props["coastLineGeneratedAt"] = "2026-07-31"
                props["coastLineLandwardOffsetM"] = LANDWARD_OFFSET_M
                props["coastLineArtificialDetours"] = "compact harbour/pier hairpins bridged"
                generated += 1
                records.append({
                    "zoneId": zone_id, "name": props.get("name"), "status": "generated",
                    "points": len(coords), "lengthM": round(final_m.length, 1),
                    "guideAverageDistanceM": round(candidate.guide_avg_m, 1),
                    "guideMaximumDistanceM": round(candidate.guide_max_m, 1),
                    "startDistanceM": round(candidate.endpoint_start_m, 1),
                    "endDistanceM": round(candidate.endpoint_end_m, 1),
                    "lengthRatio": round(candidate.length_ratio, 3),
                    "sourceComponent": candidate.component_index,
                })
                continue
        fallback += 1
        props["coastLine"] = guide_coords
        props["coastLineSource"] = "RavRadar 4.0.44 audited rollback geometry"
        props["coastLineVersion"] = "4.0.44-fallback"
        props["coastLineRefinementMode"] = "audited-safe-fallback"
        records.append({"zoneId": zone_id, "name": props.get("name"), "status": "fallback", "reason": reason})

    active = len(active_features(zones))
    audit = {
        "version": VERSION,
        "source": SOURCE_LABEL,
        "activeZones": active,
        "generatedZones": generated,
        "fallbackZones": fallback,
        "minimumRequiredGeneratedZones": minimum_generated,
        "releaseAccepted": generated >= minimum_generated and generated + fallback == active,
        "principles": [
            "visible line is cut from source coastline, not interpolated between sparse zone anchors",
            "compact harbour and pier detours are bridged",
            "line is shifted five metres away from the marine data point",
            "all non-geometry zone properties are preserved",
            "4.0.44 audited geometry remains the per-zone and whole-release rollback",
        ],
        "zones": records,
    }
    if not audit["releaseAccepted"]:
        raise RuntimeError(
            f"Production coastline rejected: generated {generated}/{active}; "
            f"minimum is {minimum_generated}. Existing zones.geojson was not changed."
        )

    audit_path.parent.mkdir(parents=True, exist_ok=True)
    snapshot_path.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.NamedTemporaryFile("w", encoding="utf-8", delete=False, dir=zones_path.parent, suffix=".tmp") as tmp:
        json.dump(zones, tmp, ensure_ascii=False, indent=2)
        tmp.write("\n")
        tmp_path = Path(tmp.name)
    os.replace(tmp_path, zones_path)
    shutil.copy2(zones_path, snapshot_path)
    audit_path.write_text(json.dumps(audit, ensure_ascii=False, indent=2) + "\n", "utf-8")
    return audit


def self_test() -> None:
    # Synthetic coastline with a compact U-shaped harbour detour. The resulting
    # line must bridge the detour and remain continuous.
    source = LineString([(0, 0), (1000, 0), (1050, -300), (1150, -300), (1200, 0), (3000, 0)])
    cleaned = remove_harbour_hairpins(source)
    assert cleaned.length < source.length - 300, (source.length, cleaned.length)
    dense = densify(cleaned, 140)
    assert max(Point(a).distance(Point(b)) for a, b in zip(dense.coords, list(dense.coords)[1:])) <= 141

    # End-to-end fixture validates GeoJSON parsing, STRtree matching, atomic
    # generation and preservation of non-geometric properties.
    with tempfile.TemporaryDirectory() as tmp_name:
        tmp = Path(tmp_name)
        source_ll = [[10.0, 57.0], [10.01, 57.0], [10.02, 57.0], [10.03, 57.0]]
        source_doc = {"type": "FeatureCollection", "features": [{"type": "Feature", "properties": {}, "geometry": {"type": "LineString", "coordinates": source_ll}}]}
        feature = {"type": "Feature", "properties": {"id": "TEST", "name": "Test", "zoneStatus": "active", "coastLine": [[10.0, 57.0002], [10.03, 57.0002]], "dataPoint": [10.015, 56.99], "onshoreDirectionDeg": 0}, "geometry": {"type": "Polygon", "coordinates": [[[9.99,56.99],[10.04,56.99],[10.04,57.01],[9.99,57.01],[9.99,56.99]]]}}
        zones_doc = {"type": "FeatureCollection", "features": [feature]}
        source_path=tmp/'source.geojson'; zones_path=tmp/'zones.geojson'; guide_path=tmp/'guide.geojson'
        source_path.write_text(json.dumps(source_doc), 'utf-8')
        zones_path.write_text(json.dumps(zones_doc), 'utf-8')
        guide_path.write_text(json.dumps(zones_doc), 'utf-8')
        audit=build(zones_path, guide_path, source_path, tmp/'audit.json', tmp/'snapshot.geojson', minimum_generated=1)
        result=json.loads(zones_path.read_text('utf-8'))['features'][0]['properties']
        assert audit['generatedZones'] == 1
        assert result['coastLineVersion'] == VERSION
        assert result['onshoreDirectionDeg'] == 0
        assert len(result['coastLine']) >= 2
    print("Production coastline generator self-test passed")


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--source", type=Path, help="GeoJSON coastline source")
    parser.add_argument("--zones", type=Path, default=DEFAULT_ZONES)
    parser.add_argument("--guide", type=Path, default=DEFAULT_GUIDE)
    parser.add_argument("--audit", type=Path, default=DEFAULT_AUDIT)
    parser.add_argument("--snapshot", type=Path, default=DEFAULT_SNAPSHOT)
    parser.add_argument("--minimum-generated", type=int, default=MIN_GENERATED_ACTIVE)
    parser.add_argument("--self-test", action="store_true")
    args = parser.parse_args()
    if args.self_test:
        self_test()
        return
    if not args.source:
        parser.error("--source is required unless --self-test is used")
    audit = build(args.zones, args.guide, args.source, args.audit, args.snapshot, args.minimum_generated)
    print(f"Generated natural coastline for {audit['generatedZones']}/{audit['activeZones']} active zones; "
          f"{audit['fallbackZones']} safe fallbacks.")


if __name__ == "__main__":
    main()
