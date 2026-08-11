#!/usr/bin/env python3
"""Build fail-closed point pairs for the six owner-approved coast corrections."""

from __future__ import annotations

import argparse
import json
import math
from pathlib import Path

from pyproj import Transformer
from shapely.geometry import LineString, Point, shape
from shapely.ops import transform

ROOT = Path(__file__).resolve().parents[1]
TO_M = Transformer.from_crs(4326, 25832, always_xy=True).transform
TO_W = Transformer.from_crs(25832, 4326, always_xy=True).transform
WADDEN_WITNESSES = {
    "DK-B04-12": ([8.76, 55.10], [8.54, 55.10], "documented-mainland-east-of-wadden"),
    "DK-B04-13": ([8.76, 55.24], [8.54, 55.24], "documented-mainland-east-of-wadden"),
    "DK-B04-14": ([8.72, 55.39], [8.48, 55.39], "documented-mainland-east-of-wadden"),
}


def load(path):
    return json.loads(path.read_text(encoding="utf-8"))


def lines(geometry):
    if geometry.geom_type in {"LineString", "LinearRing"}:
        return [LineString(geometry.coords)]
    if geometry.geom_type in {"MultiLineString", "GeometryCollection"}:
        return [part for child in geometry.geoms for part in lines(child)]
    return []


def lonlat(point):
    return [round(value, 7) for value in TO_W(point.x, point.y)]


def point_pair(geometry, land_witness, water_witness, offset=120):
    line = max(lines(transform(TO_M, geometry)), key=lambda item: item.length)
    middle_distance = line.length / 2
    before = line.interpolate(max(0, middle_distance - 75))
    after = line.interpolate(min(line.length, middle_distance + 75))
    middle = line.interpolate(middle_distance)
    dx, dy = after.x - before.x, after.y - before.y
    norm = max(math.hypot(dx, dy), 0.001)
    normal = (-dy / norm, dx / norm)
    land = Point(*TO_M(*land_witness))
    water = Point(*TO_M(*water_witness))
    evidence_dx, evidence_dy = land.x - water.x, land.y - water.y
    evidence_norm = math.hypot(evidence_dx, evidence_dy)
    if evidence_norm < 50:
        return lonlat(middle), None, None, None
    alignment = normal[0] * evidence_dx / evidence_norm + normal[1] * evidence_dy / evidence_norm
    if abs(alignment) < 0.1:
        return lonlat(middle), None, None, None
    sign = 1 if alignment > 0 else -1
    land_point = Point(middle.x + sign * normal[0] * offset, middle.y + sign * normal[1] * offset)
    water_point = Point(middle.x - sign * normal[0] * offset, middle.y - sign * normal[1] * offset)
    bearing = round((90 - math.degrees(math.atan2(land_point.y - water_point.y, land_point.x - water_point.x))) % 360, 1)
    return lonlat(middle), lonlat(land_point), lonlat(water_point), bearing


def build(candidate, zones):
    zone_props = {feature["properties"]["id"]: feature["properties"] for feature in zones.get("features") or []}
    local_evidence = []
    for evidence_zone_id, evidence_parts in (candidate.get("zones") or {}).items():
        for evidence_part in evidence_parts:
            if evidence_part.get("geometry") and evidence_part.get("landPoint") and evidence_part.get("waterPoint"):
                local_evidence.append((
                    transform(TO_M, shape(evidence_part["geometry"])),
                    evidence_part["landPoint"],
                    evidence_part["waterPoint"],
                    evidence_part.get("partId"),
                ))
    rows = []
    for zone_id, parts in sorted((candidate.get("zones") or {}).items()):
      for part in parts:
        if part.get("landPoint") and part.get("waterPoint"):
            continue
        props = zone_props.get(zone_id, {})
        if zone_id in WADDEN_WITNESSES:
            land_witness, water_witness, source = WADDEN_WITNESSES[zone_id]
        else:
            land_witness, water_witness, source = props.get("pinPoint"), props.get("dataPoint"), "centrally-hydrated-parent-zone-witnesses"
        if not land_witness or not water_witness:
            raise ValueError(f"{zone_id} mangler land-/vandvidner.")
        reference, land_point, water_point, direction = point_pair(shape(part["geometry"]), land_witness, water_witness)
        if land_point is None:
            target_geometry = transform(TO_M, shape(part["geometry"]))
            for _, nearby_land, nearby_water, nearby_part_id in sorted(local_evidence, key=lambda item: target_geometry.distance(item[0])):
                reference, land_point, water_point, direction = point_pair(shape(part["geometry"]), nearby_land, nearby_water)
                if land_point is not None:
                    land_witness, water_witness = nearby_land, nearby_water
                    source = f"nearest-active-local-part-direction:{nearby_part_id}"
                    break
        blocked = land_point is None or water_point is None
        rows.append({
            "zoneId": zone_id,
            "partId": part["partId"],
            "finalPartId": part["partId"],
            "name": part.get("name"),
            "suggestedName": part.get("name") or zone_id,
            "coastType": (props.get("coastType") or "west") if zone_id in WADDEN_WITNESSES else (props.get("coastType") or "east"),
            "status": "blocked-point-pair-evidence" if blocked else "private-point-pair-proposed",
            "coastReferencePoint": reference,
            "landPoint": land_point,
            "waterPoint": water_point,
            "onshoreDirectionDeg": direction,
            "witnessSource": source,
            "landWitness": land_witness,
            "waterWitness": water_witness,
            "weatherSamplingEnabled": False,
            "scoreEnabled": False,
            "automaticActivationAllowed": False,
        })
    return {
        "schemaVersion": "1.0.0",
        "status": "private-approved-public-coast-point-pairs",
        "partCount": len(rows),
        "proposedPointPairCount": sum(row["status"] == "private-point-pair-proposed" for row in rows),
        "blockedPointPairCount": sum(row["status"] != "private-point-pair-proposed" for row in rows),
        "automaticActivationAllowed": False,
        "parts": rows,
    }


def attach(candidate, report):
    output = json.loads(json.dumps(candidate))
    points = {row["partId"]: row for row in report["parts"] if row["status"] == "private-point-pair-proposed"}
    for parts in output.get("zones", {}).values():
        for part in parts:
            row = points.get(part.get("partId"))
            if row:
                part["landPoint"] = row["landPoint"]
                part["waterPoint"] = row["waterPoint"]
                part["onshoreDirectionDeg"] = row["onshoreDirectionDeg"]
                part["pointWitnessSource"] = row["witnessSource"]
    all_parts = [part for parts in output.get("zones", {}).values() for part in parts]
    missing = [part.get("partId") for part in all_parts if not part.get("landPoint") or not part.get("waterPoint")]
    report["totalCandidatePartCount"] = len(all_parts)
    report["candidatePointPairCount"] = len(all_parts) - len(missing)
    report["candidateMissingPointPairCount"] = len(missing)
    report["candidateMissingPointPartIds"] = missing
    return output


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--candidate", type=Path, default=ROOT / ".geometry-v2-work/approved-public-coast-candidate.json")
    parser.add_argument("--zones", type=Path, default=ROOT / "data/zones.geojson")
    parser.add_argument("--output", type=Path, default=ROOT / ".geometry-v2-work/approved-public-coast-point-pairs.json")
    parser.add_argument("--candidate-output", type=Path, default=ROOT / ".geometry-v2-work/approved-public-coast-candidate-with-points.json")
    args = parser.parse_args()
    report = build(load(args.candidate), load(args.zones))
    candidate = attach(load(args.candidate), report)
    args.output.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    args.candidate_output.write_text(json.dumps(candidate, ensure_ascii=False, separators=(",", ":")) + "\n", encoding="utf-8")
    print(json.dumps({key: report[key] for key in ("partCount", "proposedPointPairCount", "blockedPointPairCount")}))


if __name__ == "__main__":
    main()
