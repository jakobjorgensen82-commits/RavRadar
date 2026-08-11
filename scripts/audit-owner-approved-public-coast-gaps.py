#!/usr/bin/env python3
"""Separate prior owner removals from genuinely unresolved public coast gaps."""
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


def load(path):
    return json.loads(path.read_text(encoding="utf-8"))


def original_features(coastal, locality):
    replaced = {feature.get("properties", {}).get("sourcePartId") for feature in locality.get("features") or []}
    return [
        feature for feature in coastal.get("features") or []
        if feature.get("properties", {}).get("partId") not in replaced
    ] + list(locality.get("features") or [])


def runtime_geometries(payload):
    rows = []
    for value in (payload.get("zones") or {}).values():
        parts = value if isinstance(value, list) else value.get("parts", []) if isinstance(value, dict) else []
        rows.extend(transform(TO_M, shape(part["geometry"])) for part in parts if part.get("geometry"))
    return rows


def build(gaps, coastal, locality, active_parts, threshold=0.9):
    original = [transform(TO_M, shape(feature["geometry"])) for feature in original_features(coastal, locality)]
    active = runtime_geometries(active_parts)
    original_tree = STRtree(original) if original else None
    active_tree = STRtree(active) if active else None
    reviewed = []
    unresolved = []
    for feature in gaps.get("features") or []:
        geometry = transform(TO_M, shape(feature["geometry"]))
        original_near = [original[int(index)] for index in original_tree.query(geometry.buffer(5))] if original_tree is not None else []
        active_near = [active[int(index)] for index in active_tree.query(geometry.buffer(5))] if active_tree is not None else []
        original_union = unary_union(original_near) if original_near else geometry.__class__()
        active_union = unary_union(active_near) if active_near else geometry.__class__()
        removed = original_union.difference(active_union.buffer(1))
        ratio = geometry.intersection(removed.buffer(2)).length / geometry.length if geometry.length else 0
        is_prior_owner_omission = ratio >= threshold and feature.get("properties", {}).get("gapClass") != "unrepresented-main-zone"
        row = {
            **feature.get("properties", {}),
            "priorOwnerRemovedOverlapRatio": round(ratio, 4),
            "classification": "prior-owner-approved-omission" if is_prior_owner_omission else "unresolved-public-coast-gap",
            "automaticActivationAllowed": False,
        }
        reviewed.append(row)
        if not is_prior_owner_omission:
            unresolved.append({**feature, "properties": row})
    report = {
        "schemaVersion": "1.0.0",
        "status": "private-owner-approved-public-coast-gap-audit",
        "gapCount": len(reviewed),
        "priorOwnerApprovedOmissionCount": sum(row["classification"] == "prior-owner-approved-omission" for row in reviewed),
        "unresolvedGapCount": len(unresolved),
        "automaticActivationAllowed": False,
        "gaps": reviewed,
    }
    return report, {"type": "FeatureCollection", "features": unresolved}


def self_test():
    line = {"type": "LineString", "coordinates": [[8, 56], [8.01, 56]]}
    gaps = {"features": [{"type": "Feature", "properties": {"gapId": "g", "gapClass": "detached-candidate"}, "geometry": line}]}
    coastal = {"features": [{"type": "Feature", "properties": {"partId": "p"}, "geometry": line}]}
    report, unresolved = build(gaps, coastal, {"features": []}, {"zones": {}})
    assert report["priorOwnerApprovedOmissionCount"] == 1 and not unresolved["features"]
    print("Owner-approved public coast gap audit self-test: bestået.")


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--gaps", type=Path)
    parser.add_argument("--source-coastal", type=Path)
    parser.add_argument("--source-locality", type=Path)
    parser.add_argument("--active-parts", type=Path)
    parser.add_argument("--report", type=Path, default=ROOT / ".geometry-v2-work" / "owner-approved-public-coast-gap-audit.json")
    parser.add_argument("--unresolved-geojson", type=Path, default=ROOT / ".geometry-v2-work" / "unresolved-public-coast-gaps.geojson")
    parser.add_argument("--self-test", action="store_true")
    args = parser.parse_args()
    if args.self_test:
        self_test()
        return
    required = (args.gaps, args.source_coastal, args.source_locality, args.active_parts)
    if not all(required):
        parser.error("--gaps, --source-coastal, --source-locality og --active-parts er påkrævet")
    report, unresolved = build(load(args.gaps), load(args.source_coastal), load(args.source_locality), load(args.active_parts))
    args.report.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    args.unresolved_geojson.write_text(json.dumps(unresolved, ensure_ascii=False, separators=(",", ":")) + "\n", encoding="utf-8")
    print(json.dumps({key: report[key] for key in ("gapCount", "priorOwnerApprovedOmissionCount", "unresolvedGapCount")}, ensure_ascii=False))


if __name__ == "__main__":
    main()
