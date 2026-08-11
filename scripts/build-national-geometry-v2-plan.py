#!/usr/bin/env python3
"""Build a deterministic national work plan for coastal geometry-v2.

The plan is derived from the centrally hydrated active zone registry.  It does
not alter geometry.  Its purpose is to bound official-source acquisition and
route exceptions into explicit conflict classes before any national proposal
can be generated.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import math
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DEFAULT_POLICY = ROOT / "data" / "geometry-v2" / "national-conflict-policy.json"


def fail(message: str) -> None:
    raise SystemExit(message)


def load(path: Path):
    return json.loads(path.read_text(encoding="utf-8"))


def canonical_hash(value) -> str:
    encoded = json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(",", ":")).encode("utf-8")
    return hashlib.sha256(encoded).hexdigest()


def coastline_points(feature):
    properties = feature.get("properties") or {}
    points = properties.get("coastLine") or []
    if len(points) < 2:
        fail(f"Aktiv zone mangler brugbar coastLine: {properties.get('id')}")
    result = []
    for point in points:
        if not isinstance(point, list) or len(point) < 2:
            fail(f"Aktiv zone har ugyldigt coastLine-punkt: {properties.get('id')}")
        lon, lat = float(point[0]), float(point[1])
        if not (7.0 <= lon <= 16.0 and 54.0 <= lat <= 58.5):
            fail(f"Aktiv zone har coastLine-punkt uden for Danmark: {properties.get('id')}")
        result.append((lon, lat))
    return result


def geometry_points(feature):
    """Return every coordinate used by the zone's geographic ownership window."""
    coordinates = (feature.get("geometry") or {}).get("coordinates")
    result = []

    def visit(value):
        if (
            isinstance(value, list)
            and len(value) >= 2
            and isinstance(value[0], (int, float))
            and isinstance(value[1], (int, float))
        ):
            lon, lat = float(value[0]), float(value[1])
            if not (7.0 <= lon <= 16.0 and 54.0 <= lat <= 58.5):
                fail(f"Aktiv zone har geometri uden for Danmark: {feature.get('properties', {}).get('id')}")
            result.append((lon, lat))
            return
        if isinstance(value, list):
            for child in value:
                visit(child)

    visit(coordinates)
    if not result:
        fail(f"Aktiv zone mangler brugbar ejerskabsgeometri: {feature.get('properties', {}).get('id')}")
    return result


def changed_fields(feature, baseline_by_id):
    zone_id = feature["properties"]["id"]
    baseline = baseline_by_id.get(zone_id)
    if baseline is None:
        return ["zone-created-centrally"]
    current = feature.get("properties") or {}
    previous = baseline.get("properties") or {}
    protected = ("name", "coastLine", "dataPoint", "pinPoint", "onshoreDirectionDeg", "zoneStatus")
    return [field for field in protected if current.get(field) != previous.get(field)]


def classify(zone_id, changes, policy):
    explicit = (policy.get("zones") or {}).get(zone_id)
    if explicit:
        return explicit["conflictClass"], explicit.get("reason", "explicit-national-policy")
    if changes:
        return "central-admin-conflict-review", "centrally-hydrated-fields-differ-from-repository-baseline"
    return "automatic-source-analysis", "no-known-semantic-or-central-admin-conflict"


def tile_key(lon, lat, width, height):
    x = math.floor((lon - 7.0) / width)
    y = math.floor((lat - 54.0) / height)
    return x, y


def build_plan(zones, baseline, policy):
    active = [f for f in zones.get("features", []) if (f.get("properties") or {}).get("zoneStatus") == "active"]
    ids = [f["properties"].get("id") for f in active]
    if any(not zone_id for zone_id in ids) or len(ids) != len(set(ids)):
        fail("Den centralt effektive bestand har manglende eller dublerede aktive zone-ID'er.")
    expected = policy.get("expectedEffectiveZoneCount")
    if expected is not None and len(active) != int(expected):
        fail(f"Forventede {expected} centralt effektive zoner, fandt {len(active)}.")

    baseline_by_id = {
        f.get("properties", {}).get("id"): f
        for f in (baseline or {}).get("features", [])
        if f.get("properties", {}).get("id")
    }
    width = float(policy["tiling"]["widthDegrees"])
    height = float(policy["tiling"]["heightDegrees"])
    margin = float(policy["tiling"]["marginDegrees"])
    tiles = {}
    zone_rows = []

    for feature in sorted(active, key=lambda f: f["properties"]["id"]):
        props = feature["properties"]
        zone_id = props["id"]
        points = coastline_points(feature)
        changes = changed_fields(feature, baseline_by_id) if baseline is not None else []
        conflict_class, reason = classify(zone_id, changes, policy)
        # The old coastLine is only a guide and can be kilometres away from the
        # real shore. Fetch every tile covered by the zone's ownership window.
        ownership_points = geometry_points(feature)
        min_lon = min(point[0] for point in ownership_points)
        max_lon = max(point[0] for point in ownership_points)
        min_lat = min(point[1] for point in ownership_points)
        max_lat = max(point[1] for point in ownership_points)
        min_x, min_y = tile_key(min_lon, min_lat, width, height)
        max_x, max_y = tile_key(max_lon, max_lat, width, height)
        touched = {
            (x, y)
            for x in range(min_x, max_x + 1)
            for y in range(min_y, max_y + 1)
        }
        tile_ids = []
        for x, y in sorted(touched):
            tile_id = f"dk-{x:02d}-{y:02d}"
            tile_ids.append(tile_id)
            west, south = 7.0 + x * width, 54.0 + y * height
            tile = tiles.setdefault(tile_id, {
                "id": tile_id,
                "boundsWgs84": [
                    round(max(7.0, west - margin), 6),
                    round(max(54.0, south - margin), 6),
                    round(min(16.0, west + width + margin), 6),
                    round(min(58.5, south + height + margin), 6),
                ],
                "zoneIds": set(),
            })
            tile["zoneIds"].add(zone_id)
        zone_rows.append({
            "zoneId": zone_id,
            "name": props.get("name"),
            "batch": props.get("batch"),
            "conflictClass": conflict_class,
            "reason": reason,
            "centralChangedFields": changes,
            "sourceTileIds": tile_ids,
            "sourceCoverageBasis": "zone-ownership-geometry-bounds",
            "migrationRequired": conflict_class in {"semantic-migration-review", "partition-redesign-review"},
        })

    tile_rows = []
    for tile in tiles.values():
        tile["zoneIds"] = sorted(tile["zoneIds"])
        tile_rows.append(tile)
    tile_rows.sort(key=lambda row: row["id"])
    counts = Counter(row["conflictClass"] for row in zone_rows)
    return {
        "schemaVersion": "1.0.0-national-plan",
        "status": "national-read-only-work-plan",
        "centralHydrationRequired": True,
        "automaticActivationAllowed": False,
        "source": "centrally-hydrated-active-zone-registry",
        "sourceZoneCount": len(active),
        "sourceZoneDigest": canonical_hash(active),
        "tileCount": len(tile_rows),
        "conflictClassCounts": dict(sorted(counts.items())),
        "tiles": tile_rows,
        "zones": zone_rows,
        "gates": policy.get("gates") or [],
    }


def self_test():
    def feature(zone_id, coast, name="Test"):
        lons = [point[0] for point in coast]
        lats = [point[1] for point in coast]
        west, east = min(lons) - 0.01, max(lons) + 0.01
        south, north = min(lats) - 0.01, max(lats) + 0.01
        return {
            "type": "Feature",
            "properties": {"id": zone_id, "name": name, "batch": "B01", "zoneStatus": "active", "coastLine": coast},
            "geometry": {"type": "Polygon", "coordinates": [[[west, south], [east, south], [east, north], [west, north], [west, south]]]},
        }

    zones = {"features": [feature("Z-1", [[8.0, 56.0], [8.2, 56.1]]), feature("Z-2", [[9.0, 56.0], [9.1, 56.1]])]}
    baseline = {"features": [feature("Z-1", [[8.0, 56.0], [8.2, 56.1]]), feature("Z-2", [[9.0, 56.0], [9.1, 56.1]], "Old name")]}
    policy = {"expectedEffectiveZoneCount": 2, "tiling": {"widthDegrees": 0.5, "heightDegrees": 0.5, "marginDegrees": 0.03}, "zones": {"Z-1": {"conflictClass": "semantic-migration-review", "reason": "test"}}, "gates": ["central-hydration"]}
    plan = build_plan(zones, baseline, policy)
    rows = {row["zoneId"]: row for row in plan["zones"]}
    assert rows["Z-1"]["conflictClass"] == "semantic-migration-review"
    assert rows["Z-2"]["conflictClass"] == "central-admin-conflict-review"
    assert plan["sourceZoneCount"] == 2 and plan["tileCount"] >= 2
    assert all(row["sourceCoverageBasis"] == "zone-ownership-geometry-bounds" for row in plan["zones"])
    print("National geometry-v2-plan self-test: bestået.")


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--zones", type=Path, default=ROOT / "data" / "zones.geojson")
    parser.add_argument("--baseline-zones", type=Path)
    parser.add_argument("--policy", type=Path, default=DEFAULT_POLICY)
    parser.add_argument("--output", type=Path, default=ROOT / ".geometry-v2-work" / "national-work-plan.json")
    parser.add_argument("--self-test", action="store_true")
    args = parser.parse_args()
    if args.self_test:
        self_test()
        return
    output = args.output.resolve()
    if ROOT not in output.parents:
        fail("Den nationale arbejdsplan skal ligge i workspace.")
    plan = build_plan(load(args.zones.resolve()), load(args.baseline_zones.resolve()) if args.baseline_zones else None, load(args.policy.resolve()))
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps(plan, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"National geometry-v2-plan: {plan['sourceZoneCount']} zoner, {plan['tileCount']} fliser, {plan['conflictClassCounts']}")


if __name__ == "__main__":
    main()
