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
def samples(line,reference,interval=250,max_samples=200):
    if line.is_empty or reference.is_empty:return []
    count=min(max_samples,max(2,int(line.length//interval)+1)); return [line.interpolate(line.length*i/(count-1)).distance(reference) for i in range(count)]
def summary(values): return {"sampleCount":len(values),"meanM":round(sum(values)/len(values),2) if values else None,"maxM":round(max(values),2) if values else None}
def source_id(feature):
    props=feature.get("properties") or {}; return str(feature.get("id") or props.get("id_lokalId") or props.get("objectid") or "unknown")
def evidence_window(feature):
    props=feature.get("properties") or {}
    windows=[]
    coast=props.get("coastLine") or []
    if len(coast)>=2:windows.append(project(LineString(coast)).buffer(2000))
    data_point=props.get("dataPoint"); pin_point=props.get("pinPoint")
    if isinstance(data_point,list) and len(data_point)>=2 and isinstance(pin_point,list) and len(pin_point)>=2:
        windows.append(project(LineString([data_point,pin_point])).buffer(1000))
    return unary_union(windows) if windows else LineString()
def build(zones,plan,kyst,recovery_zone_ids=None):
    recovery_zone_ids=set(recovery_zone_ids or [])
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
        feature=zone_features[zone_id]; props=feature["properties"]; current=project(LineString(props.get("coastLine") or [])); window=project(shape(feature["geometry"])).buffer(1000); proximity=current.buffer(2000)

        def collect(limit,clip_window=window):
            found=[]; found_refs=set()
            for index in tree.query(limit):
                clipped=source[int(index)].intersection(clip_window).intersection(limit)
                for line in parts(clipped):
                    if line.length>=5:found.append(line); found_refs.add(refs[int(index)])
            return found,found_refs

        # Keep the fast, conservative old-guide search where it is demonstrably
        # useful. If it cannot account for the guide, recover from the complete
        # bounded ownership window. This avoids both the former missing-source
        # bug and an unnecessarily expensive full-window union in every zone.
        candidates,candidate_refs=collect(proximity)
        union=unary_union(candidates) if candidates else LineString()
        measurement_union=union.simplify(5,preserve_topology=False)
        distances=samples(current,measurement_union)
        coverage=current.intersection(measurement_union.buffer(250)).length/current.length if current.length and not measurement_union.is_empty else 0
        recovered=zone_id in recovery_zone_ids or union.is_empty
        if recovered:
            candidates,candidate_refs=collect(window)
            union=unary_union(candidates) if candidates else LineString()
            if union.is_empty:
                corridor=evidence_window(feature)
                candidates,candidate_refs=collect(corridor,corridor)
                union=unary_union(candidates) if candidates else LineString()
            measurement_union=union.simplify(5,preserve_topology=False)
            distances=samples(current,measurement_union)
            coverage=current.intersection(measurement_union.buffer(250)).length/current.length if current.length and not measurement_union.is_empty else 0
        reverse=samples(measurement_union,current); flags=[]
        if coverage<0.8:flags.append("current-coast-less-than-80-percent-near-geodanmark")
        if not distances or max(distances)>1000:flags.append("current-coast-has-point-over-1000m-from-geodanmark")
        if len(parts(union))>25:flags.append("source-candidate-highly-fragmented")
        conflict=plan_rows[zone_id]["conflictClass"]
        if conflict!="automatic-source-analysis":flags.append(f"planned-conflict:{conflict}")
        rows.append({"zoneId":zone_id,"currentName":props.get("name"),"conflictClass":conflict,"analysisStatus":"flagged" if flags else "source-reference-ready","sourceSelectionBasis":"zone-ownership-window-recovery" if recovered else "old-guide-proximity-verified","currentCoastLengthKm":round(current.length/1000,3),"candidateSourceLengthKm":round(union.length/1000,3),"candidateSourcePartCount":len(parts(union)),"candidateSourceObjectCount":len(candidate_refs),"currentNearSourceRatio250m":round(coverage,6),"currentToSourceDistance":summary(distances),"sourceToCurrentDistance":summary(reverse),"qualityFlags":flags,"automaticActivationAllowed":False})
        mapped.append({"type":"Feature","properties":{"zoneId":zone_id,"kind":"national-geodanmark-source-candidate","conflictClass":conflict,"automaticActivationAllowed":False},"geometry":mapping(unproject(union))})
    counts={key:sum(1 for row in rows if row["conflictClass"]==key) for key in sorted({row["conflictClass"] for row in rows})}
    return {"schemaVersion":"1.0.0","status":"private-national-read-only-source-qa","generatedAt":datetime.now(timezone.utc).isoformat().replace("+00:00","Z"),"zoneCount":len(rows),"sourceObjectCount":len(source),"conflictClassCounts":counts,"productionGeometryChanged":False,"adminDataChanged":False,"weatherSamplingChanged":False,"scoreChanged":False,"automaticActivationAllowed":False,"zones":rows},{"type":"FeatureCollection","features":mapped}
def self_test():
    def zone(i,x):return {"type":"Feature","properties":{"id":f"Z{i}","name":f"Z{i}","zoneStatus":"active","coastLine":[[x,56],[x+.01,56]]},"geometry":{"type":"Polygon","coordinates":[[[x-.01,55.99],[x+.02,55.99],[x+.02,56.01],[x-.01,56.01],[x-.01,55.99]]]}}
    zones={"features":[zone(i,8+i*.02) for i in range(208)]}; plan={"zones":[{"zoneId":f"Z{i}","conflictClass":"automatic-source-analysis"} for i in range(208)]}; kyst={"features":[{"id":f"K{i}","geometry":{"type":"LineString","coordinates":[[8+i*.02,56],[8+i*.02+.01,56]]},"properties":{}} for i in range(208)]}; report,geo=build(zones,plan,kyst,{"Z0"}); assert report["zoneCount"]==208 and len(geo["features"])==208
    rows={row["zoneId"]:row for row in report["zones"]}; assert rows["Z0"]["sourceSelectionBasis"]=="zone-ownership-window-recovery" and rows["Z1"]["sourceSelectionBasis"]=="old-guide-proximity-verified"
    print("National indexed GeoDanmark source-QA self-test: bestået.")
def main():
    parser=argparse.ArgumentParser(); parser.add_argument("--zones",type=Path,default=ROOT/"data"/"zones.geojson"); parser.add_argument("--plan",type=Path,default=ROOT/".geometry-v2-work"/"national-work-plan.json"); parser.add_argument("--source",type=Path,default=ROOT/".geometry-v2-work"/"national-source"/"national-Kyst.geojson"); parser.add_argument("--active-parts",type=Path,default=ROOT/"data"/"live"/"coastal-parts-v2.json"); parser.add_argument("--report",type=Path,default=ROOT/".geometry-v2-work"/"national-source-qa.json"); parser.add_argument("--geojson",type=Path,default=ROOT/".geometry-v2-work"/"national-source-qa.geojson"); parser.add_argument("--self-test",action="store_true"); args=parser.parse_args()
    if args.self_test:self_test();return
    active_parts=load(args.active_parts) if args.active_parts.exists() else {}
    represented=set((active_parts.get("zones") or {}).keys())
    active_zone_ids={f.get("properties",{}).get("id") for f in load(args.zones).get("features") or [] if f.get("properties",{}).get("zoneStatus")=="active"}
    recovery_zone_ids=active_zone_ids-represented
    report,geo=build(load(args.zones),load(args.plan),load(args.source),recovery_zone_ids); args.report.write_text(json.dumps(report,ensure_ascii=False,indent=2)+"\n",encoding="utf-8"); args.geojson.write_text(json.dumps(geo,ensure_ascii=False,separators=(",",":"))+"\n",encoding="utf-8"); print(f"National source-QA: {report['zoneCount']} zoner, {report['sourceObjectCount']} kystobjekter, {len(recovery_zone_ids)} zoner med kilde-recovery.")
if __name__=="__main__":main()
