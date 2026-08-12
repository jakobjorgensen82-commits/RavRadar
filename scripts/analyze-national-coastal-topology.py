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
EXPECTED_ZONE_COUNT=211
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
def scalar_properties(props): return {str(k):v for k,v in props.items() if isinstance(v,(str,int,float,bool)) or v is None}
def property_profile(entries):
    keys={}
    for entry in entries:
        for key,value in entry["properties"].items():
            row=keys.setdefault(key,{"presentCount":0,"values":{}}); row["presentCount"]+=1; label=str(value); row["values"][label]=row["values"].get(label,0)+1
    return {key:{"presentCount":row["presentCount"],"topValues":[{"value":value,"count":count} for value,count in sorted(row["values"].items(),key=lambda item:(-item[1],item[0]))[:20]]} for key,row in sorted(keys.items())}
def build(zones,source_qa,source_report,waters,layers,policy):
    zone_map={f["properties"]["id"]:f for f in zones.get("features") or [] if f.get("properties",{}).get("zoneStatus")=="active"}; candidates={f["properties"]["zoneId"]:project(shape(f["geometry"])) for f in source_qa.get("features") or []}; qa_rows={r["zoneId"]:r for r in source_report.get("zones") or []}
    if len(zone_map)!=EXPECTED_ZONE_COUNT or len(candidates)!=EXPECTED_ZONE_COUNT: fail(f"National topologiaudit kræver {EXPECTED_ZONE_COUNT} effektive zoner og kandidater.")
    indexed={}; trees={}
    for name,collection in {**layers,"Water":waters}.items(): indexed[name]=prepared(collection); trees[name]=STRtree([g for g,_ in indexed[name]]) if indexed[name] else None
    output=[]; rows=[]; river_profile_entries=[]
    for zone_id in sorted(zone_map):
        zone=zone_map[zone_id]; props=zone["properties"]; candidate=candidates[zone_id]; window=candidate.buffer(300); harbours=nearby(trees["Havn"],indexed["Havn"],window); harbour_geoms=[g for g,_ in harbours if g.distance(candidate)<=policy["harbourBufferM"]]
        mouths=[]; rejected_narrow=0; rejected_short=0
        for geometry,rprops in nearby(trees["Vandloebsmidte"],indexed["Vandloebsmidte"],window):
            if rprops.get("vandloebstype")=="Rørlagt" or rprops.get("synligVandloebsmidte") is False: continue
            for line in parts(geometry):
                if str(rprops.get("midtebredde") or "") not in policy["allowedRiverMidWidthClasses"]:rejected_narrow+=1;continue
                if line.length<policy["riverMouthMinimumLineLengthM"]:rejected_short+=1;continue
                ends=[Point(line.coords[0]),Point(line.coords[-1])]; distances=[p.distance(candidate) for p in ends]; i=0 if distances[0]<=distances[1] else 1
                if distances[i]<=policy["riverMouthSearchM"] and distances[1-i]>=policy["riverMouthMinimumInlandReachM"]: mouths.append({"point":ends[i],"properties":scalar_properties(rprops),"lineLengthM":round(line.length,1),"mouthDistanceM":round(distances[i],1),"inlandEndpointDistanceM":round(distances[1-i],1)})
        clustered=[]
        for entry in sorted(mouths,key=lambda r:(r["point"].x,r["point"].y)):
            cluster=next((existing for existing in clustered if entry["point"].distance(existing["point"])<=policy["riverMouthClusterM"]),None)
            if cluster: cluster["members"].append(entry)
            else: clustered.append({"point":entry["point"],"members":[entry]})
        for cluster in clustered:
            for entry in cluster["members"]: river_profile_entries.append({"zoneId":zone_id,**{k:v for k,v in entry.items() if k!="point"}})
        waters_near=[] if props.get("coastType")==policy["limfjordCoastType"] else [g for g,_ in nearby(trees["Water"],indexed["Water"],window) if g.buffer(policy["officialInnerWaterBufferM"]).intersects(candidate)]
        river_masks_allowed=len(clustered)<=policy["maximumRiverMouthsPerZoneForMaskApplication"]
        masks=[g.buffer(policy["harbourBufferM"]) for g in harbour_geoms]+([p["point"].buffer(policy["riverMouthBufferM"]) for p in clustered] if river_masks_allowed else [])+[g.buffer(policy["officialInnerWaterBufferM"]) for g in waters_near]
        clipped=candidate.difference(unary_union(masks)) if masks else candidate; retained=[p for p in parts(clipped) if p.length>=policy["minimumRetainedFragmentM"]]; retained_union=unary_union(retained) if retained else LineString()
        dunes=[g for g,_ in nearby(trees["SandKlit"],indexed["SandKlit"],window)]; slopes=[g for g,_ in nearby(trees["Skraent"],indexed["Skraent"],window)]; groynes=[g for g,_ in nearby(trees["Hoefde"],indexed["Hoefde"],window) if g.distance(candidate)<=policy["groyneEvidenceBufferM"]]
        conflict=(qa_rows.get(zone_id) or {}).get("conflictClass") or "unknown"; flags=[]
        if retained_union.is_empty:flags.append("no-retained-source-after-topology-masks")
        if conflict!="automatic-source-analysis":flags.append(f"planned-conflict:{conflict}")
        if not waters_near and props.get("coastType")!="limfjord":flags.append("no-official-fjord-or-nor-intersection")
        if not river_masks_allowed:flags.append("river-mouth-oversegmentation-mask-withheld")
        row={"zoneId":zone_id,"currentName":props.get("name"),"coastType":props.get("coastType"),"conflictClass":conflict,"inputCandidateLengthKm":round(candidate.length/1000,3),"retainedLengthKm":round(retained_union.length/1000,3),"retainedFragmentCount":len(retained),"removedByTopologyMasksKm":round(max(0,candidate.length-retained_union.length)/1000,3),"harbourObjectCount":len(harbour_geoms),"riverMouthCount":len(clustered),"riverNarrowLinePartRejectedCount":rejected_narrow,"riverShortLinePartRejectedCount":rejected_short,"riverMouthPolicyStatus":"measured-mask-applied" if river_masks_allowed else "oversegmentation-review-required","riverMasksApplied":river_masks_allowed,"officialInnerWaterCount":len(waters_near),"sandDuneNearRatio":ratio_near(retained_union,dunes,policy["sandDuneEvidenceBufferM"]),"slopeNearRatio":ratio_near(retained_union,slopes,policy["slopeEvidenceBufferM"]),"groyneObjectCount":len(groynes),"auditStatus":"manual-review-required","qualityFlags":flags,"automaticActivationAllowed":False}
        rows.append(row); output.append({"type":"Feature","properties":{"zoneId":zone_id,"kind":"private-national-topology-audit-candidate","auditStatus":row["auditStatus"],"automaticActivationAllowed":False},"geometry":mapping(unproject(retained_union))})
    over=sum(1 for row in rows if row["riverMouthPolicyStatus"]=="oversegmentation-review-required")
    report={"schemaVersion":"1.2.0","status":"private-national-read-only-topology-audit","generatedAt":datetime.now(timezone.utc).isoformat().replace("+00:00","Z"),"zoneCount":len(rows),"nationalRiverMouthPolicyAccepted":over==0,"riverMouthOversegmentationZoneCount":over,"riverNarrowLinePartRejectedCount":sum(r["riverNarrowLinePartRejectedCount"] for r in rows),"riverShortLinePartRejectedCount":sum(r["riverShortLinePartRejectedCount"] for r in rows),"riverMouthPropertyProfile":property_profile(river_profile_entries),"riverMouthDiagnosticSamples":river_profile_entries[:200],"productionGeometryChanged":False,"adminDataChanged":False,"weatherSamplingChanged":False,"stateChanged":False,"scoreChanged":False,"automaticActivationAllowed":False,"zones":rows}
    return report,{"type":"FeatureCollection","features":output}
def self_test():
    def fc(features):return {"type":"FeatureCollection","features":features}
    zones=fc([{"type":"Feature","properties":{"id":f"Z{i}","name":f"Z{i}","zoneStatus":"active","coastType":"west"},"geometry":{"type":"Polygon","coordinates":[[[8+i*.02,56],[8.02+i*.02,56],[8.02+i*.02,56.02],[8+i*.02,56.02],[8+i*.02,56]]]}} for i in range(EXPECTED_ZONE_COUNT)])
    qa_features=[{"type":"Feature","properties":{"zoneId":f"Z{i}"},"geometry":{"type":"LineString","coordinates":[[8+i*.02,56.01],[8.01+i*.02,56.01]]}} for i in range(EXPECTED_ZONE_COUNT)]; qa=fc(qa_features); qa_report={"zones":[{"zoneId":f"Z{i}","conflictClass":"automatic-source-analysis"} for i in range(EXPECTED_ZONE_COUNT)]}
    empty=fc([]); policy=load(ROOT/"data"/"geometry-v2"/"national-topology-audit-policy.json"); report,geo=build(zones,qa,qa_report,empty,{"Havn":empty,"Vandloebsmidte":empty,"SandKlit":empty,"Skraent":empty,"Hoefde":empty},policy); assert report["zoneCount"]==EXPECTED_ZONE_COUNT and len(geo["features"])==EXPECTED_ZONE_COUNT
    print("National coastal topology audit self-test: bestået.")
def main():
    p=argparse.ArgumentParser(); p.add_argument("--zones",type=Path,default=ROOT/"data"/"zones.geojson"); p.add_argument("--source-qa",type=Path,default=ROOT/".geometry-v2-work"/"national-source-qa.geojson"); p.add_argument("--source-report",type=Path,default=ROOT/".geometry-v2-work"/"national-source-qa.json"); p.add_argument("--water",type=Path,default=ROOT/".geometry-v2-work"/"national-water-exclusions.geojson"); p.add_argument("--source-dir",type=Path,default=ROOT/".geometry-v2-work"/"national-source"); p.add_argument("--policy",type=Path,default=ROOT/"data"/"geometry-v2"/"national-topology-audit-policy.json"); p.add_argument("--report",type=Path,default=ROOT/".geometry-v2-work"/"national-topology-audit.json"); p.add_argument("--geojson",type=Path,default=ROOT/".geometry-v2-work"/"national-topology-audit.geojson"); p.add_argument("--self-test",action="store_true"); a=p.parse_args()
    if a.self_test:self_test();return
    layers={name:load(a.source_dir/f"national-{name}.geojson") for name in ("Havn","Vandloebsmidte","SandKlit","Skraent","Hoefde")}; report,geo=build(load(a.zones),load(a.source_qa),load(a.source_report),load(a.water),layers,load(a.policy)); a.report.write_text(json.dumps(report,ensure_ascii=False,indent=2)+"\n",encoding="utf-8"); a.geojson.write_text(json.dumps(geo,ensure_ascii=False,separators=(",",":"))+"\n",encoding="utf-8"); print(f"National topologiaudit: {report['zoneCount']} zoner, read-only.")
if __name__=="__main__":main()
