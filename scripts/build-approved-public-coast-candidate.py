#!/usr/bin/env python3
"""Merge the owner-approved residual corrections into the private coast candidate."""

from __future__ import annotations

import argparse
import json
from pathlib import Path

from pyproj import Transformer
from shapely.geometry import shape
from shapely.ops import transform, unary_union
from shapely.strtree import STRtree

ROOT = Path(__file__).resolve().parents[1]
TO_M = Transformer.from_crs(4326, 25832, always_xy=True).transform
WADDEN_ZONE_IDS = {
    "wadden-mainland-01": "DK-B04-12",
    "wadden-mainland-02": "DK-B04-13",
    "wadden-mainland-03": "DK-B04-14",
}


def load(path):
    return json.loads(path.read_text(encoding="utf-8"))


def geometry_rows(zones):
    rows = []
    for zone_id, parts in zones.items():
        for part in parts if isinstance(parts, list) else []:
            if part.get("geometry"):
                rows.append((zone_id, transform(TO_M, shape(part["geometry"]))))
    return rows


def build(base, corrections, approval):
    if approval.get("productionActivationApproved") or approval.get("scoreActivationApproved"):
        raise ValueError("Den private korrektionsgodkendelse må ikke være en aktiveringsgodkendelse.")
    if len(approval.get("approvedParts") or []) != 6:
        raise ValueError("Der kræves præcis seks godkendte korrektionsdele.")

    zones = json.loads(json.dumps(base.get("zones") or {}))
    discarded_tiny_closed_parts = []
    for zone_id, parts in list(zones.items()):
        retained = []
        for part in parts:
            geometry = shape(part["geometry"]) if part.get("geometry") else None
            metric = transform(TO_M, geometry) if geometry is not None else None
            if part.get("visualGeometryOnly") and geometry is not None and geometry.is_closed and metric.length < 200:
                discarded_tiny_closed_parts.append(part.get("partId"))
            else:
                retained.append(part)
        zones[zone_id] = retained
    # The owner assigned Pøl Huk to the corrected DK-B12-07 main zone.  Remove
    # the former internal Pølshuk part from DK-B12-08 before inserting the new
    # owner-approved geometry; this is an ownership transfer, not a deletion of
    # coastline.
    transferred_part_ids = {"dk-b12-08-national-part-02"}
    zones["DK-B12-08"] = [
        part for part in zones.get("DK-B12-08", [])
        if part.get("partId") not in transferred_part_ids
    ]
    corrected_zone_ids = set()
    for feature in corrections.get("features") or []:
        props = feature.get("properties") or {}
        source_id = props.get("zoneId") or props.get("proposalId")
        zone_id = WADDEN_ZONE_IDS.get(source_id, source_id)
        name = props.get("proposedMainZoneName") or props.get("name") or zone_id
        corrected_zone_ids.add(zone_id)
        zones[zone_id] = [{
            "partId": f"{zone_id.lower()}-owner-approved-01",
            "name": name,
            "geometry": feature["geometry"],
            "candidateOnly": True,
            "visualGeometryOnly": True,
            "ownerApproved": True,
            "weatherOrScoreActivationAllowed": False,
            "automaticActivationAllowed": False,
        }]

    if corrected_zone_ids != {"DK-B05-20", "DK-B10-13", "DK-B12-07", "DK-B04-12", "DK-B04-13", "DK-B04-14"}:
        raise ValueError(f"Uventet korrektionssæt: {sorted(corrected_zone_ids)}")

    all_rows = geometry_rows(zones)
    all_geometries = [geometry for _, geometry in all_rows]
    tree = STRtree(all_geometries)
    overlaps = []
    for index, (zone_id, geometry) in enumerate(all_rows):
        if zone_id not in corrected_zone_ids:
            continue
        for other_index in tree.query(geometry.buffer(0.5)):
            other_index = int(other_index)
            if other_index <= index:
                continue
            other_zone_id, other = all_rows[other_index]
            if other_zone_id == zone_id:
                continue
            shared_length = geometry.intersection(other.buffer(0.5)).length
            if shared_length > 5:
                overlaps.append({
                    "zoneId": zone_id,
                    "otherZoneId": other_zone_id,
                    "overlapLengthM": round(shared_length, 1),
                })

    payload = {
        "schemaVersion": "private-approved-public-coast-candidate-1.0.0",
        "enabled": False,
        "status": "private-owner-approved-awaiting-points-and-gates",
        "sourceActiveDatasetVersion": base.get("sourceActiveDatasetVersion"),
        "zoneCount": len(zones),
        "partCount": sum(len(parts) for parts in zones.values()),
        "automaticActivationAllowed": False,
        "zones": zones,
    }
    report = {
        "schemaVersion": "1.0.0",
        "status": "private-approved-public-coast-candidate-audit",
        "baseZoneCount": base.get("zoneCount"),
        "basePartCount": base.get("partCount"),
        "candidateZoneCount": payload["zoneCount"],
        "candidatePartCount": payload["partCount"],
        "ownerCorrectedZoneCount": len(corrected_zone_ids),
        "newMainZoneCount": len(WADDEN_ZONE_IDS),
        "ownershipTransferCount": len(transferred_part_ids),
        "ownershipTransferredPartIds": sorted(transferred_part_ids),
        "discardedTinyClosedPartCount": len(discarded_tiny_closed_parts),
        "discardedTinyClosedPartIds": sorted(discarded_tiny_closed_parts),
        "crossZoneOverlapCount": len(overlaps),
        "crossZoneOverlaps": overlaps,
        "pointsPendingZoneCount": len(corrected_zone_ids),
        "weatherOrScoreActivationAllowed": False,
        "automaticActivationAllowed": False,
    }
    return payload, report


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--base", type=Path, default=ROOT / ".geometry-v2-work/incremental-public-coast-candidate.json")
    parser.add_argument("--corrections", type=Path, default=ROOT / ".geometry-v2-work/public-coast-owner-corrections.geojson")
    parser.add_argument("--approval", type=Path, default=ROOT / "data/geometry-v2/public-coast-owner-correction-approval-2026-08-11.json")
    parser.add_argument("--output", type=Path, default=ROOT / ".geometry-v2-work/approved-public-coast-candidate.json")
    parser.add_argument("--report", type=Path, default=ROOT / ".geometry-v2-work/approved-public-coast-candidate-report.json")
    args = parser.parse_args()
    payload, report = build(load(args.base), load(args.corrections), load(args.approval))
    args.output.write_text(json.dumps(payload, ensure_ascii=False, separators=(",", ":")) + "\n", encoding="utf-8")
    args.report.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({key: report[key] for key in ("candidateZoneCount", "candidatePartCount", "crossZoneOverlapCount", "pointsPendingZoneCount")}))


if __name__ == "__main__":
    main()
