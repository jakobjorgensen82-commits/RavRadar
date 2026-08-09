#!/usr/bin/env python3
"""Create indexed, read-only source QA for all centrally effective zones."""
from __future__ import annotations
import argparse, hashlib, json
from datetime import datetime, timezone
from pathlib import Path
from pyproj import Transformer
from shapely.geometry import LineString, mapping, shape
from shapely.ops import transform, unary_union
from shapely.strtree import STRtree

ROOT=Path(__file__).resolve().parents[1]; TO_M=Transformer.from_crs("EPSG:4326","EPSG:25832",always_xy=True); TO_W=Transformer.from_crs("EPSG:25832","EPSG:4326",always_xy=True)
def fail(message): raise SystemExit(message)
def load(path): return json.loads(path.read_text(encoding="utf-8"))
def project(g): return transform(TO_M.transform,g)
def unproject(g): return transform(TO_W.transform,g)
def parts(g):
    if g.is_empty:return []
    if g.geom_type=="LineString":return [g]
    if g.geom_type in {"MultiLineString","GeometryCollection"}:return [p for child in g.geoms for p in parts(child)]
    return []
def samples(line,reference,interval=250):
    if line.is_empty or reference.is_empty:return []
    count=max(2,int(line.length//interval)+1); return [line.interpolate(line.length*i/(count-1)).distance(reference) for i in range(count)]
def summary(values): return {"sampleCount":len(values),"meanM":round(sum(values)/len(values),2) if values else None,"maxM":round(max(values),2) if values else None}
def source_id(feature):
    props=feature.get("properties") or {}; return str(feature.get("id") or props.get("id_lokalId") or props.get("objectid") or "unknown")
def build(zones,plan,kyst):
    zone_features={f["properties"]["id"]:f for f in zones.get("features") or [] if f.get("properties",{}).get("zoneStatus")=="active"}
    plan_rows={row["zoneId"]:row for row in plan.get("zones") or []}
    if len(zone_features)!=208 or zone_features.keys()!=plan_rows.keys():fail("National source-QA kræver samme 208 zoner i hydreret register og plan.")
    source=[]; refs=[]
    for feature in kyst.get("features") or []:
        geometry=project(shape(feature.get("geometry")))
        for line in parts(geometry):
            if line.length>=5:source.append(line); refs.append(source_id(feature))
    if not source:fail("Det nationale GeoDanmark Kyst-lag er tomt.")
    tree=STRtree(source); rows=[]; mapped=[]
    for zone_id in sorted(zone_features):
        feature=zone_features[zone_id]; props=feature["properties"]; current=project(LineString(props.get("coastLine") or [])); window=project(shape(feature["geometry"])).buffer(1000); proximity=current.buffer(2000); candidates=[]; candidate_refs=set()
        for index in tree.query(window):
            clipped=source[int(index)].intersection(window).intersection(proximity)
            for line in parts(clipped):
                if line.length>=5:candidates.append(line); candidate_refs.add(refs[int(index)])
        union=unary_union(candidates) if candidates else LineString(); distances=samples(current,union); reverse=samples(union,current); coverage=current.intersection(union.buffer(250)).length/current.length if current.length and not union.is_empty else 0; flags=[]
        if coverage<0.8:flags.append("current-coast-less-than-80-percent-near-geodanmark")
        if not distances or max(distances)>1000:flags.append("current-coast-has-point-over-1000m-from-geodanmark")
        if len(parts(union))>25:flags.append("source-candidate-highly-fragmented")
        conflict=plan_rows[zone_id]["conflictClass"]
        if conflict!="automatic-source-analysis":flags.append(f"planned-conflict:{conflict}")
        rows.append({"zoneId":zone_id,"currentName":props.get("name"),"conflictClass":conflict,"analysisStatus":"flagged" if flags else "source-reference-ready","currentCoastLengthKm":round(current.length/1000,3),"candidateSourceLengthKm":round(union.length/1000,3),"candidateSourcePartCount":len(parts(union)),"candidateSourceObjectCount":len(candidate_refs),"currentNearSourceRatio250m":round(coverage,6),"currentToSourceDistance":summary(distances),"sourceToCurrentDistance":summary(reverse),"qualityFlags":flags,"automaticActivationAllowed":False})
        mapped.append({"type":"Feature","properties":{"zoneId":zone_id,"kind":"national-geodanmark-source-candidate","conflictClass":conflict,"automaticActivationAllowed":False},"geometry":mapping(unproject(union))})
    counts={key:sum(1 for row in rows if row["conflictClass"]==key) for key in sorted({row["conflictClass"] for row in rows})}
    return {"schemaVersion":"1.0.0","status":"private-national-read-only-source-qa","generatedAt":datetime.now(timezone.utc).isoformat().replace("+00:00","Z"),"zoneCount":len(rows),"sourceObjectCount":len(source),"conflictClassCounts":counts,"productionGeometryChanged":False,"adminDataChanged":False,"weatherSamplingChanged":False,"scoreChanged":False,"automaticActivationAllowed":False,"zones":rows},{"type":"FeatureCollection","features":mapped}
def self_test():
    def zone(i,x):return {"type":"Feature","properties":{"id":f"Z{i}","name":f"Z{i}","zoneStatus":"active","coastLine":[[x,56],[x+.01,56]]},"geometry":{"type":"Polygon","coordinates":[[[x-.01,55.99],[x+.02,55.99],[x+.02,56.01],[x-.01,56.01],[x-.01,55.99]]]}}
    zones={"features":[zone(i,8+i*.02) for i in range(208)]}; plan={"zones":[{"zoneId":f"Z{i}","conflictClass":"automatic-source-analysis"} for i in range(208)]}; kyst={"features":[{"id":f"K{i}","geometry":{"type":"LineString","coordinates":[[8+i*.02,56],[8+i*.02+.01,56]]},"properties":{}} for i in range(208)]}; report,geo=build(zones,plan,kyst); assert report["zoneCount"]==208 and len(geo["features"])==208
    print("National indexed GeoDanmark source-QA self-test: bestået.")
def main():
    parser=argparse.ArgumentParser(); parser.add_argument("--zones",type=Path,default=ROOT/"data"/"zones.geojson"); parser.add_argument("--plan",type=Path,default=ROOT/".geometry-v2-work"/"national-work-plan.json"); parser.add_argument("--source",type=Path,default=ROOT/".geometry-v2-work"/"national-source"/"national-Kyst.geojson"); parser.add_argument("--report",type=Path,default=ROOT/".geometry-v2-work"/"national-source-qa.json"); parser.add_argument("--geojson",type=Path,default=ROOT/".geometry-v2-work"/"national-source-qa.geojson"); parser.add_argument("--self-test",action="store_true"); args=parser.parse_args()
    if args.self_test:self_test();return
    report,geo=build(load(args.zones),load(args.plan),load(args.source)); args.report.write_text(json.dumps(report,ensure_ascii=False,indent=2)+"\n",encoding="utf-8"); args.geojson.write_text(json.dumps(geo,ensure_ascii=False,separators=(",",":"))+"\n",encoding="utf-8"); print(f"National source-QA: {report['zoneCount']} zoner, {report['sourceObjectCount']} kystobjekter.")
if __name__=="__main__":main()
