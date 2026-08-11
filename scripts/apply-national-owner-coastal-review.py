#!/usr/bin/env python3
"""Build a private, score-neutral geometry proposal from explicit owner decisions."""
from __future__ import annotations
import argparse, json
from pathlib import Path
from shapely.geometry import LineString, mapping, shape

ROOT = Path(__file__).resolve().parents[1]
SAFE_GEOMETRY_ACTIONS = {"delete", "retain-longest-component", "remove-detached-fragments"}

def load(path): return json.loads(path.read_text(encoding="utf-8"))

def lines(geometry):
    if geometry.is_empty: return []
    if geometry.geom_type in {"LineString", "LinearRing"}: return [LineString(geometry.coords)]
    if geometry.geom_type in {"MultiLineString", "GeometryCollection"}: return [line for item in geometry.geoms for line in lines(item)]
    return []

def final_features(coastal, partitions):
    replaced = {f["properties"]["sourcePartId"] for f in partitions.get("features", [])}
    rows = [(f["properties"]["partId"], f) for f in coastal.get("features", []) if f["properties"]["partId"] not in replaced]
    rows += [(f["properties"].get("finalPartId") or f["properties"]["proposalId"], f) for f in partitions.get("features", [])]
    return rows

def build(coastal, partitions, names, review):
    decisions = review["decisions"]
    name_by_id = {row["finalPartId"]: row for row in names["parts"]}
    proposed = []
    audit = []
    seen = set()
    for part_id, feature in final_features(coastal, partitions):
        decision = decisions.get(part_id)
        if not decision: continue
        seen.add(part_id)
        action = decision.get("action")
        geometry = shape(feature["geometry"])
        source_count = len(lines(geometry))
        output_geometry = geometry
        status = "owner-approved-unchanged" if decision["decision"] == "approved" else "blocked-needs-targeted-geometry"
        if action == "delete":
            output_geometry = None; status = "owner-approved-delete"
        elif action in {"retain-longest-component", "remove-detached-fragments"}:
            components = lines(geometry)
            output_geometry = max(components, key=lambda line: line.length) if components else None
            status = "owner-correction-proposed"
        elif action == "rename":
            status = "owner-rename-proposed"
        props = dict(feature.get("properties") or {})
        props.update({"finalPartId": part_id, "ownerReviewStatus": status, "ownerAction": action, "suggestedName": decision.get("suggestedName") or name_by_id[part_id].get("suggestedName"), "automaticActivationAllowed": False})
        if output_geometry is not None:
            proposed.append({"type": "Feature", "properties": props, "geometry": mapping(output_geometry)})
        audit.append({"partId": part_id, "zoneId": name_by_id[part_id]["zoneId"], "name": name_by_id[part_id]["suggestedName"], "decision": decision["decision"], "action": action, "status": status, "sourceComponentCount": source_count, "proposedComponentCount": len(lines(output_geometry)) if output_geometry is not None else 0, "sourceLengthDegrees": round(geometry.length, 8), "proposedLengthDegrees": round(output_geometry.length, 8) if output_geometry is not None else 0, "automaticActivationAllowed": False})
    missing = sorted(set(decisions) - seen)
    if missing: raise RuntimeError(f"Ejerreview henviser til ukendte dele: {missing}")
    counts = {status: sum(row["status"] == status for row in audit) for status in sorted({row["status"] for row in audit})}
    report = {"schemaVersion": "1.0.0", "status": "private-owner-coastal-correction-proposal", "reviewedPartCount": len(audit), "statusCounts": counts, "safeGeometryActionCount": sum(row["action"] in SAFE_GEOMETRY_ACTIONS for row in audit), "targetedGeometryReviewCount": sum(row["status"] == "blocked-needs-targeted-geometry" for row in audit), "productionGeometryChanged": False, "adminDataChanged": False, "scoreChanged": False, "automaticActivationAllowed": False, "parts": audit}
    return report, {"type": "FeatureCollection", "metadata": {k: report[k] for k in ("schemaVersion", "status", "reviewedPartCount", "productionGeometryChanged", "scoreChanged", "automaticActivationAllowed")}, "features": proposed}

def main():
    p = argparse.ArgumentParser(); p.add_argument("--work", type=Path); p.add_argument("--review", type=Path, default=ROOT / "data/geometry-v2/national-owner-coastal-review-2026-08-11.json"); p.add_argument("--output-dir", type=Path); p.add_argument("--self-test", action="store_true"); a = p.parse_args()
    if a.self_test:
        assert SAFE_GEOMETRY_ACTIONS == {"delete", "retain-longest-component", "remove-detached-fragments"}; print("National ejerkorrektion self-test: bestået."); return
    if not a.work or not a.output_dir: p.error("--work og --output-dir er påkrævet")
    report, geo = build(load(a.work / "national-coastal-parts.geojson"), load(a.work / "national-locality-partitions.geojson"), load(a.work / "national-local-part-name-suggestions.json"), load(a.review))
    a.output_dir.mkdir(parents=True, exist_ok=True); (a.output_dir / "owner-correction-proposal.json").write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"); (a.output_dir / "owner-correction-proposal.geojson").write_text(json.dumps(geo, ensure_ascii=False, separators=(",", ":")) + "\n", encoding="utf-8"); print(json.dumps({"reviewedPartCount": report["reviewedPartCount"], "statusCounts": report["statusCounts"]}, ensure_ascii=False))
if __name__ == "__main__": main()
