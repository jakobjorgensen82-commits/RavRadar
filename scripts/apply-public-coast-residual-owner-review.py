#!/usr/bin/env python3
"""Apply the owner's final eight-zone public-coast review, privately."""

from __future__ import annotations

import argparse
import json
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
REQUIRED_DECISIONS = {
    "residual-dk-b05-20",
    "residual-dk-b08-19",
    "residual-dk-b10-13",
    "residual-dk-b10-16",
    "residual-dk-b12-07",
    "residual-wadden-mainland-01",
    "residual-wadden-mainland-02",
    "residual-wadden-mainland-03",
}
DISCARD_PROPOSALS = {"DK-B08-19", "DK-B10-16"}
RENAME_ZONES = {"DK-B10-13": "Bredfjed", "DK-B12-07": "Mommark & Pøl Huk"}


def load(path: Path):
    return json.loads(path.read_text(encoding="utf-8"))


def apply(review, residual, wadden):
    decisions = review.get("decisions") or {}
    if set(decisions) != REQUIRED_DECISIONS:
        raise ValueError("Ejerfilen skal indeholde præcis de otte forventede afgørelser.")
    if decisions["residual-wadden-mainland-02"].get("decision") != "approved":
        raise ValueError("Rejsby og Ribe Vesterå mangler ejerens godkendelse.")

    output = []
    audit = []
    for zone_id in sorted(DISCARD_PROPOSALS):
        audit.append({"zoneId": zone_id, "action": "discard-precision-proposal", "status": "owner-applied"})

    for feature in residual.get("features") or []:
        props = feature.get("properties") or {}
        zone_id = props.get("zoneId")
        if zone_id in DISCARD_PROPOSALS or zone_id not in {"DK-B05-20", *RENAME_ZONES}:
            continue
        if zone_id == "DK-B05-20" and props.get("partId") != "dk-b05-20-national-part-01":
            continue
        copied = json.loads(json.dumps(feature))
        copied_props = copied.setdefault("properties", {})
        copied_props["ownerReviewStatus"] = "owner-correction-applied"
        if zone_id in RENAME_ZONES:
            copied_props["proposedMainZoneName"] = RENAME_ZONES[zone_id]
        output.append(copied)

    for feature in wadden.get("features") or []:
        copied = json.loads(json.dumps(feature))
        copied.setdefault("properties", {})["ownerReviewStatus"] = "owner-correction-applied"
        output.append(copied)

    counts = {}
    for feature in output:
        props = feature.get("properties") or {}
        zone_id = props.get("zoneId") or props.get("proposalId")
        counts[zone_id] = counts.get(zone_id, 0) + 1
    expected = {"DK-B05-20", "DK-B10-13", "DK-B12-07", "wadden-mainland-01", "wadden-mainland-02", "wadden-mainland-03"}
    if set(counts) != expected:
        raise ValueError(f"Rettet kandidat har uventede zoner: {sorted(counts)}")

    for zone_id in sorted(counts):
        action = "retain"
        if zone_id == "DK-B05-20":
            action = "remove-two-northern-runs"
        elif zone_id in RENAME_ZONES:
            action = "rename"
        elif zone_id == "wadden-mainland-01":
            action = "connect-mainland-runs"
        elif zone_id == "wadden-mainland-03":
            action = "bridge-ribe-aa-mouth"
        audit.append({"zoneId": zone_id, "action": action, "status": "owner-applied", "featureCount": counts[zone_id]})

    report = {
        "schemaVersion": "1.0.0",
        "status": "private-public-coast-residual-owner-corrections-applied",
        "generatedAt": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
        "sourceExportedAt": review.get("exportedAt"),
        "reviewedDecisionCount": len(decisions),
        "retainedZoneCount": len(counts),
        "discardedProposalCount": len(DISCARD_PROPOSALS),
        "automaticActivationAllowed": False,
        "productionGeometryChanged": False,
        "scoreChanged": False,
        "actions": audit,
    }
    return report, {"type": "FeatureCollection", "features": output}


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--review", type=Path, default=ROOT / "data/geometry-v2/public-coast-residual-review-2026-08-11.json")
    parser.add_argument("--residual", type=Path, required=True)
    parser.add_argument("--wadden", type=Path, required=True)
    parser.add_argument("--report", type=Path, default=ROOT / ".geometry-v2-work/public-coast-owner-corrections.json")
    parser.add_argument("--geojson", type=Path, default=ROOT / ".geometry-v2-work/public-coast-owner-corrections.geojson")
    args = parser.parse_args()
    report, geojson = apply(load(args.review), load(args.residual), load(args.wadden))
    args.report.parent.mkdir(parents=True, exist_ok=True)
    args.geojson.parent.mkdir(parents=True, exist_ok=True)
    args.report.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    args.geojson.write_text(json.dumps(geojson, ensure_ascii=False, separators=(",", ":")) + "\n", encoding="utf-8")
    print(json.dumps({"reviewedDecisionCount": report["reviewedDecisionCount"], "retainedZoneCount": report["retainedZoneCount"], "discardedProposalCount": report["discardedProposalCount"]}))


if __name__ == "__main__":
    main()
