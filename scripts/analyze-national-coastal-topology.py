#!/usr/bin/env python3
"""Measure national harbour, river, inner-water and coastal evidence topology read-only."""
from __future__ import annotations
import argparse, json
from datetime import datetime, timezone
from pathlib import Path
from pyproj import Transformer
from shapely.geometry import LineString, Point, mapping, shape
from shapely.ops import transform, unary_union
from shapely.strtree import STRtree

ROOT=Path(__file__).resolve().parents[1]; TO_M=Transformer.from_crs("EPSG:4326","EPSG:25832",always_xy=True); TO_W=Transformer.from_crs("EPSG:25832","EPSG:4326",always_xy=True)
def fail(m): raise SystemExit(m)
def load(p): return json.loads(p.read_text(encoding="utf-8"))
def project(g): return transform(TO_M.transform,g)
def unproject(g): return transform(TO_W.transform,g)
def parts(g):
    if g.is_empty:return []
    if g.geom_type in {"LineString","LinearRing"}:return [LineString(g.coords)]
    if g.geom_type in {"MultiLineString","GeometryCollection"}:return [p for child in g.geoms for p in parts(child)]
    return []
def prepared(collection):
    rows=[]
    for f in collection.get("features") or []:
        g=project(shape(f["geometry"]));
        if not g.is_empty: rows.append((g,f.get("properties") or {}))
    return rows
def nearby(tree,rows,window): return [rows[int(i)] for i in tree.query(window)] if tree is not None else []
def ratio_near(line,geometries,distance): return round(line.intersection(unary_union(geometries).buffer(distance)).length/line.length,6) if line.length and geometries else 0
def build(zones,source_qa,source_report,waters,layers,policy):
    zone_map={f["properties"]["id"]:f for f in zones.get("features") or [] if f.get("properties",{}).get("zoneStatus")=="active"}; candidates={f["properties"]["zoneId"]:project(shape(f["geometry"])) for f in source_qa.get("features") or []}; qa_rows={r["zoneId"]:r for r in source_report.get("zones") or []}
    if len(zone_map)!=208 or len(candidates)!=208: fail("National topologiaudit kræver 208 effektive zoner og kandidater.")
    indexed={}; trees={}
    for name,collection in {**layers,"Water":waters}.items(): indexed[name]=prepared(collection); trees[name]=STRtree([g for g,_ in indexed[name]]) if indexed[name] else None
    output=[]; rows=[]
    for zone_id in sorted(zone_map):
        zone=zone_map[zone_id]; props=zone["properties"]; candidate=candidates[zone_id]; window=candidate.buffer(300); harbours=nearby(trees["Havn"],indexed["Havn"],window); harbour_geoms=[g for g,_ in harbours if g.distance(candidate)<=policy["harbourBufferM"]]
        mouths=[]
        for geometry,rprops in nearby(trees["Vandloebsmidte"],indexed["Vandloebsmidte"],window):
            if rprops.get("vandloebstype")=="Rørlagt" or rprops.get("synligVandloebsmidte") is False: continue
            for line in parts(geometry):
                if line.length<policy["riverMouthMinimumInlandReachM"]:continue
                ends=[Point(line.coords[0]),Point(line.coords[-1])]; distances=[p.distance(candidate) for p in ends]; i=0 if distances[0]<=distances[1] else 1
                if distances[i]<=policy["riverMouthSearchM"] and distances[1-i]>=policy["riverMouthMinimumInlandReachM"]: mouths.append(ends[i])
        clustered=[]
        for point in sorted(mouths,key=lambda p:(p.x,p.y)):
            if not any(point.distance(existing)<=policy["riverMouthClusterM"] for existing in clustered):clustered.append(point)
        waters_near=[] if props.get("coastType")==policy["limfjordCoastType"] else [g for g,_ in nearby(trees["Water"],indexed["Water"],window) if g.buffer(policy["officialInnerWaterBufferM"]).intersects(candidate)]
        masks=[g.buffer(policy["harbourBufferM"]) for g in harbour_geoms]+[p.buffer(policy["riverMouthBufferM"]) for p in clustered]+[g.buffer(policy["officialInnerWaterBufferM"]) for g in waters_near]
        clipped=candidate.difference(unary_union(masks)) if masks else candidate; retained=[p for p in parts(clipped) if p.length>=policy["minimumRetainedFragmentM"]]; retained_union=unary_union(retained) if retained else LineString()
        dunes=[g for g,_ in nearby(trees["SandKlit"],indexed["SandKlit"],window)]; slopes=[g for g,_ in nearby(trees["Skraent"],indexed["Skraent"],window)]; groynes=[g for g,_ in nearby(trees["Hoefde"],indexed["Hoefde"],window) if g.distance(candidate)<=policy["groyneEvidenceBufferM"]]
        conflict=(qa_rows.get(zone_id) or {}).get("conflictClass") or "unknown"; flags=[]
        if retained_union.is_empty:flags.append("no-retained-source-after-topology-masks")
        if conflict!="automatic-source-analysis":flags.append(f"planned-conflict:{conflict}")
        if not waters_near and props.get("coastType")!="limfjord":flags.append("no-official-fjord-or-nor-intersection")
        row={"zoneId":zone_id,"currentName":props.get("name"),"coastType":props.get("coastType"),"conflictClass":conflict,"inputCandidateLengthKm":round(candidate.length/1000,3),"retainedLengthKm":round(retained_union.length/1000,3),"retainedFragmentCount":len(retained),"removedByTopologyMasksKm":round(max(0,candidate.length-retained_union.length)/1000,3),"harbourObjectCount":len(harbour_geoms),"riverMouthCount":len(clustered),"officialInnerWaterCount":len(waters_near),"sandDuneNearRatio":ratio_near(retained_union,dunes,policy["sandDuneEvidenceBufferM"]),"slopeNearRatio":ratio_near(retained_union,slopes,policy["slopeEvidenceBufferM"]),"groyneObjectCount":len(groynes),"auditStatus":"manual-review-required","qualityFlags":flags,"automaticActivationAllowed":False}
        rows.append(row); output.append({"type":"Feature","properties":{"zoneId":zone_id,"kind":"private-national-topology-audit-candidate","auditStatus":row["auditStatus"],"automaticActivationAllowed":False},"geometry":mapping(unproject(retained_union))})
    report={"schemaVersion":"1.0.0","status":"private-national-read-only-topology-audit","generatedAt":datetime.now(timezone.utc).isoformat().replace("+00:00","Z"),"zoneCount":len(rows),"productionGeometryChanged":False,"adminDataChanged":False,"weatherSamplingChanged":False,"stateChanged":False,"scoreChanged":False,"automaticActivationAllowed":False,"zones":rows}
    return report,{"type":"FeatureCollection","features":output}
def self_test():
    def fc(features):return {"type":"FeatureCollection","features":features}
    zones=fc([{"type":"Feature","properties":{"id":f"Z{i}","name":f"Z{i}","zoneStatus":"active","coastType":"west"},"geometry":{"type":"Polygon","coordinates":[[[8+i*.02,56],[8.02+i*.02,56],[8.02+i*.02,56.02],[8+i*.02,56.02],[8+i*.02,56]]]}} for i in range(208)])
    qa_features=[{"type":"Feature","properties":{"zoneId":f"Z{i}"},"geometry":{"type":"LineString","coordinates":[[8+i*.02,56.01],[8.01+i*.02,56.01]]}} for i in range(208)]; qa=fc(qa_features); qa_report={"zones":[{"zoneId":f"Z{i}","conflictClass":"automatic-source-analysis"} for i in range(208)]}
    empty=fc([]); policy=load(ROOT/"data"/"geometry-v2"/"national-topology-audit-policy.json"); report,geo=build(zones,qa,qa_report,empty,{"Havn":empty,"Vandloebsmidte":empty,"SandKlit":empty,"Skraent":empty,"Hoefde":empty},policy); assert report["zoneCount"]==208 and len(geo["features"])==208
    print("National coastal topology audit self-test: bestået.")
def main():
    p=argparse.ArgumentParser(); p.add_argument("--zones",type=Path,default=ROOT/"data"/"zones.geojson"); p.add_argument("--source-qa",type=Path,default=ROOT/".geometry-v2-work"/"national-source-qa.geojson"); p.add_argument("--source-report",type=Path,default=ROOT/".geometry-v2-work"/"national-source-qa.json"); p.add_argument("--water",type=Path,default=ROOT/".geometry-v2-work"/"national-water-exclusions.geojson"); p.add_argument("--source-dir",type=Path,default=ROOT/".geometry-v2-work"/"national-source"); p.add_argument("--policy",type=Path,default=ROOT/"data"/"geometry-v2"/"national-topology-audit-policy.json"); p.add_argument("--report",type=Path,default=ROOT/".geometry-v2-work"/"national-topology-audit.json"); p.add_argument("--geojson",type=Path,default=ROOT/".geometry-v2-work"/"national-topology-audit.geojson"); p.add_argument("--self-test",action="store_true"); a=p.parse_args()
    if a.self_test:self_test();return
    layers={name:load(a.source_dir/f"national-{name}.geojson") for name in ("Havn","Vandloebsmidte","SandKlit","Skraent","Hoefde")}; report,geo=build(load(a.zones),load(a.source_qa),load(a.source_report),load(a.water),layers,load(a.policy)); a.report.write_text(json.dumps(report,ensure_ascii=False,indent=2)+"\n",encoding="utf-8"); a.geojson.write_text(json.dumps(geo,ensure_ascii=False,separators=(",",":"))+"\n",encoding="utf-8"); print(f"National topologiaudit: {report['zoneCount']} zoner, read-only.")
if __name__=="__main__":main()
