#!/usr/bin/env python3
"""Fail-closed validation for the private six-zone recovery candidate."""
from __future__ import annotations

import argparse
import json
from pathlib import Path

from pyproj import Transformer
from shapely.geometry import shape
from shapely.ops import transform

ROOT = Path(__file__).resolve().parents[1]
TO_M = Transformer.from_crs(4326, 25832, always_xy=True).transform
ALLOWED = {"DK-B07-19", "DK-B10-14", "DK-B10-16"}
EXPECTED_MOVE_OWNERS = {
    "dk-b08-10-national-part-01": "DK-B08-10",
    "dk-b08-10-national-part-02": "DK-B08-10",
    "dk-b08-10-national-part-03": "DK-B08-10",
    "dk-b08-17-national-part-01": "DK-B08-17",
    "dk-b08-17-national-part-02": "DK-B08-17",
    "dk-b09-01-national-part-01": "DK-B09-01",
    "dk-b09-01-national-part-05": "DK-B09-01",
    "dk-b10-14-national-part-01-locality-01": "DK-B10-14",
    "dk-b10-14-national-part-01-locality-02": "DK-B10-14",
}
EXPECTED_REPLACED_OWNER = {
    "dk-b10-14-national-part-02-locality-01": "DK-B10-14",
    "dk-b10-14-national-part-02-locality-02": "DK-B10-14",
}


def load(path):
    return json.loads(path.read_text(encoding="utf-8"))


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--candidate", type=Path, default=ROOT / ".geometry-v2-work/fallback-zone-recovery-candidate.geojson")
    parser.add_argument("--points", type=Path, default=ROOT / ".geometry-v2-work/fallback-zone-recovery-point-pairs.json")
    parser.add_argument("--active", type=Path, default=ROOT / "data/live/coastal-parts-v2.json")
    parser.add_argument("--plan", type=Path, default=ROOT / ".geometry-v2-work/fallback-zone-recovery-report.json")
    parser.add_argument("--output", type=Path, default=ROOT / ".geometry-v2-work/fallback-zone-recovery-validation.json")
    args = parser.parse_args()

    features = load(args.candidate).get("features") or []
    point_rows = load(args.points).get("parts") or []
    active_document = load(args.active)
    plan = load(args.plan)
    ids = [feature["properties"]["partId"] for feature in features]
    zones = {feature["properties"]["zoneId"] for feature in features}
    errors = []
    if zones != ALLOWED:
        errors.append(f"Forkert zonebestand: {sorted(zones)}")
    if len(ids) != len(set(ids)):
        errors.append("Kandidat-ID'er er ikke unikke")
    if "DK-B02-14" in zones:
        errors.append("Den slettede Havnø/Mariager-zone er genoplivet")

    active_index = {}
    for owner, parts in (active_document.get("zones") or {}).items():
        for part in parts:
            active_index.setdefault(part.get("partId"), []).append(owner)
    planned_moves = {
        part_id: target
        for target, part_ids in (plan.get("ownershipMoves") or {}).items()
        for part_id in part_ids
    }
    if set(planned_moves) != set(EXPECTED_MOVE_OWNERS):
        errors.append("Ejerskabsplanen har en uventet bestand af flyttede dele")
    for part_id, source_owner in EXPECTED_MOVE_OWNERS.items():
        owners = active_index.get(part_id) or []
        if owners != [source_owner]:
            errors.append(f"{part_id} findes ikke entydigt hos forventet ejer {source_owner}: {owners}")
        if planned_moves.get(part_id) in {None, source_owner}:
            errors.append(f"{part_id} mangler en ny, anden hovedzoneejer")
    planned_replacements = set(plan.get("replacedPartsToDisableAfterDmiApproval") or [])
    if planned_replacements != set(EXPECTED_REPLACED_OWNER):
        errors.append("Erstatningsplanen har en uventet bestand af gamle dele")
    for part_id, owner in EXPECTED_REPLACED_OWNER.items():
        if active_index.get(part_id) != [owner]:
            errors.append(f"{part_id} findes ikke entydigt hos forventet ejer {owner}")

    metric = [(feature, transform(TO_M, shape(feature["geometry"]))) for feature in features]
    for feature, geometry in metric:
        if not geometry.is_valid or geometry.is_empty or geometry.length < 250:
            errors.append(f"Ugyldig eller for kort geometri: {feature['properties']['partId']}")

    points = {row.get("partId"): row for row in point_rows}
    for part_id in ids:
        row = points.get(part_id)
        if not row or row.get("status") != "private-point-pair-proposed" or not row.get("landPoint") or not row.get("waterPoint"):
            errors.append(f"Mangler fail-closed punktpar: {part_id}")

    candidate_overlaps = []
    for index, (left_feature, left) in enumerate(metric):
        for right_feature, right in metric[index + 1:]:
            if left_feature["properties"]["zoneId"] == right_feature["properties"]["zoneId"]:
                continue
            overlap = min(left.intersection(right.buffer(2)).length, right.intersection(left.buffer(2)).length)
            if overlap > 10:
                candidate_overlaps.append({"left": left_feature["properties"]["partId"], "right": right_feature["properties"]["partId"], "metres": round(overlap, 1)})
    if candidate_overlaps:
        errors.append(f"{len(candidate_overlaps)} overlap mellem kandidatens hovedzoner")

    active_overlaps = []
    for owner, parts in (active_document.get("zones") or {}).items():
        if owner in ALLOWED:
            continue
        for part in parts:
            active_geometry = transform(TO_M, shape(part["geometry"]))
            for feature, candidate_geometry in metric:
                overlap = min(candidate_geometry.intersection(active_geometry.buffer(2)).length, active_geometry.intersection(candidate_geometry.buffer(2)).length)
                if overlap > 10:
                    active_overlaps.append({"candidate": feature["properties"]["partId"], "active": part["partId"], "activeOwner": owner, "metres": round(overlap, 1)})
    if active_overlaps:
        errors.append(f"{len(active_overlaps)} overlap mod andre aktive hovedzoner")

    report = {
        "status": "passed-private-fallback-recovery-validation" if not errors else "blocked-private-fallback-recovery-validation",
        "automaticActivationAllowed": False,
        "productionChanged": False,
        "candidatePartCount": len(features),
        "pointPairCount": sum(part_id in points and points[part_id].get("status") == "private-point-pair-proposed" for part_id in ids),
        "ownershipMoveCount": len(planned_moves),
        "replacementPartCount": len(planned_replacements),
        "candidateCrossZoneOverlaps": candidate_overlaps,
        "activeOtherZoneOverlaps": active_overlaps,
        "errors": errors,
    }
    args.output.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(report, ensure_ascii=False))
    if errors:
        raise SystemExit(1)


if __name__ == "__main__":
    main()
