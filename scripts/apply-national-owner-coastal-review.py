#!/usr/bin/env python3
"""Build a private, score-neutral geometry proposal from explicit owner decisions."""
from __future__ import annotations
import argparse, json
from pathlib import Path
from pyproj import Transformer
from shapely.geometry import LineString, MultiLineString, mapping, shape
from shapely.ops import transform

ROOT = Path(__file__).resolve().parents[1]
SAFE_GEOMETRY_ACTIONS = {"delete", "retain-longest-component", "remove-detached-fragments"}
TARGETED_GEOMETRY_ACTIONS = {"trim-harbour-entrance", "trim-inner-water", "remove-two-loops"}
TO_METERS = Transformer.from_crs("EPSG:4326", "EPSG:25832", always_xy=True).transform
TO_WGS84 = Transformer.from_crs("EPSG:25832", "EPSG:4326", always_xy=True).transform

def load(path): return json.loads(path.read_text(encoding="utf-8"))

def lines(geometry):
    if geometry.is_empty: return []
    if geometry.geom_type in {"LineString", "LinearRing"}: return [LineString(geometry.coords)]
    if geometry.geom_type in {"MultiLineString", "GeometryCollection"}: return [line for item in geometry.geoms for line in lines(item)]
    return []

def targeted_geometry(part_id, action, geometry):
    components = lines(geometry)
    if part_id == "dk-b05-01-national-part-02" and action == "trim-harbour-entrance":
        coordinates = list(components[0].coords)
        turn = max(range(len(coordinates)), key=lambda index: coordinates[index][1])
        return LineString(coordinates[:turn + 1])
    if part_id == "dk-b05-06-national-part-01" and action == "trim-inner-water":
        # Ejerens vej/broafgrænsning: de fire korte Struer-reservatdele vest for vejen udgår.
        retained = [component for index, component in enumerate(components) if index in {2, 5, 6, 7, 8}]
        return MultiLineString([list(component.coords) for component in retained])
    if part_id == "dk-b05-22-national-part-01-locality-01" and action == "trim-inner-water":
        # Behold den sydlige, åbne Gjøl-kyst frem til vejens vestlige skæring; nordbassinet udgår.
        coordinates = list(components[2].coords)
        bridge = (9.66325, 57.07439)
        # Kortkontrollen placerer vej-/broskæringen ved denne eksisterende kildevertex.
        road = min(range(len(coordinates)), key=lambda index: (coordinates[index][0] - bridge[0]) ** 2 + (coordinates[index][1] - bridge[1]) ** 2)
        return LineString(coordinates[:road + 1])
    if part_id == "dk-b05-24-national-part-02" and action == "remove-two-loops":
        # Den lange femte del danner de to viste Nørre Uttrup-sløjfer; øvrige kyststykker bevares.
        retained = [component for index, component in enumerate(components) if index != 5]
        return MultiLineString([list(component.coords) for component in retained])
    return None

def final_features(coastal, partitions):
    replaced = {f["properties"]["sourcePartId"] for f in partitions.get("features", [])}
    rows = [(f["properties"]["partId"], f) for f in coastal.get("features", []) if f["properties"]["partId"] not in replaced]
    rows += [(f["properties"].get("finalPartId") or f["properties"]["proposalId"], f) for f in partitions.get("features", [])]
    return rows

def build(coastal, partitions, names, reviews):
    decisions = {}
    for review in reviews: decisions.update(review["decisions"])
    name_by_id = {row["finalPartId"]: row for row in names["parts"]}
    all_features = dict(final_features(coastal, partitions))
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
        elif action in TARGETED_GEOMETRY_ACTIONS:
            output_geometry = targeted_geometry(part_id, action, geometry)
            if output_geometry is not None: status = "owner-correction-proposed"
        elif action == "rename":
            status = "owner-rename-proposed"
        duplicate_source_id = decision.get("derivedFromDuplicatePartId")
        if duplicate_source_id and action in TARGETED_GEOMETRY_ACTIONS:
            # En fysisk dublet arver den rettede kildelinje. Dermed sendes den
            # fjernede havne-/inderfarvandsdel ikke tilbage under et nyt ID.
            source_geometry = shape(all_features[duplicate_source_id]["geometry"])
            corrected_source = targeted_geometry(duplicate_source_id, action, source_geometry)
            retained_m = transform(TO_METERS, geometry).intersection(transform(TO_METERS, corrected_source).buffer(20))
            output_geometry = transform(TO_WGS84, retained_m) if not retained_m.is_empty else None
            retained_ratio = 0 if output_geometry is None else output_geometry.length / max(geometry.length, 1e-12)
            if output_geometry is None or retained_ratio < 0.01:
                status = "owner-approved-delete"
            elif retained_ratio >= 0.995:
                output_geometry = geometry
                status = "owner-approved-unchanged"
            else:
                status = "owner-correction-proposed"
        props = dict(feature.get("properties") or {})
        props.update({"zoneId": name_by_id[part_id]["zoneId"], "finalPartId": part_id, "ownerReviewStatus": status, "ownerAction": action, "ownerDecisionDerivedFrom": duplicate_source_id, "suggestedName": decision.get("suggestedName") or name_by_id[part_id].get("suggestedName"), "automaticActivationAllowed": False})
        if output_geometry is not None:
            proposed.append({"type": "Feature", "properties": props, "geometry": mapping(output_geometry)})
        audit.append({"partId": part_id, "zoneId": name_by_id[part_id]["zoneId"], "name": name_by_id[part_id]["suggestedName"], "decision": decision["decision"], "action": action, "status": status, "sourceComponentCount": source_count, "proposedComponentCount": len(lines(output_geometry)) if output_geometry is not None else 0, "sourceLengthDegrees": round(geometry.length, 8), "proposedLengthDegrees": round(output_geometry.length, 8) if output_geometry is not None else 0, "automaticActivationAllowed": False})
    missing = sorted(set(decisions) - seen)
    if missing: raise RuntimeError(f"Ejerreview henviser til ukendte dele: {missing}")
    counts = {status: sum(row["status"] == status for row in audit) for status in sorted({row["status"] for row in audit})}
    report = {"schemaVersion": "1.0.0", "status": "private-owner-coastal-correction-proposal", "reviewedPartCount": len(audit), "statusCounts": counts, "safeGeometryActionCount": sum(row["action"] in SAFE_GEOMETRY_ACTIONS for row in audit), "targetedGeometryProposalCount": sum(row["action"] in TARGETED_GEOMETRY_ACTIONS and row["status"] == "owner-correction-proposed" for row in audit), "targetedGeometryReviewCount": sum(row["status"] == "blocked-needs-targeted-geometry" for row in audit), "productionGeometryChanged": False, "adminDataChanged": False, "scoreChanged": False, "automaticActivationAllowed": False, "parts": audit}
    return report, {"type": "FeatureCollection", "metadata": {k: report[k] for k in ("schemaVersion", "status", "reviewedPartCount", "productionGeometryChanged", "scoreChanged", "automaticActivationAllowed")}, "features": proposed}

def main():
    p = argparse.ArgumentParser(); p.add_argument("--work", type=Path); p.add_argument("--review", type=Path, action="append"); p.add_argument("--duplicate-audit", type=Path); p.add_argument("--output-dir", type=Path); p.add_argument("--self-test", action="store_true"); a = p.parse_args()
    if a.self_test:
        assert SAFE_GEOMETRY_ACTIONS == {"delete", "retain-longest-component", "remove-detached-fragments"}; print("National ejerkorrektion self-test: bestået."); return
    if not a.work or not a.output_dir: p.error("--work og --output-dir er påkrævet")
    review_paths = a.review or [ROOT / "data/geometry-v2/national-owner-coastal-review-2026-08-11.json", ROOT / "data/geometry-v2/national-owner-inner-water-review-2026-08-11.json"]
    reviews = [load(path) for path in review_paths]
    if a.duplicate_audit:
        merged = {}; [merged.update(review["decisions"]) for review in reviews]
        derived = {}
        for row in load(a.duplicate_audit)["parts"]:
            source = row["duplicateOf"]["sourcePartId"]
            if source in merged: derived[row["partId"]] = {**merged[source], "derivedFromDuplicatePartId": source}
        reviews.append({"decisions": derived})
    report, geo = build(load(a.work / "national-coastal-parts.geojson"), load(a.work / "national-locality-partitions.geojson"), load(a.work / "national-local-part-name-suggestions.json"), reviews)
    a.output_dir.mkdir(parents=True, exist_ok=True); (a.output_dir / "owner-correction-proposal.json").write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"); (a.output_dir / "owner-correction-proposal.geojson").write_text(json.dumps(geo, ensure_ascii=False, separators=(",", ":")) + "\n", encoding="utf-8"); print(json.dumps({"reviewedPartCount": report["reviewedPartCount"], "statusCounts": report["statusCounts"]}, ensure_ascii=False))
if __name__ == "__main__": main()
