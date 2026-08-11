#!/usr/bin/env python3
"""Build fail-closed private land/water point pairs for final national local parts."""
from __future__ import annotations
import argparse,json,math
from datetime import datetime,timezone
from pathlib import Path
from pyproj import Transformer
from shapely.geometry import LineString,Point,shape
from shapely.ops import transform
ROOT=Path(__file__).resolve().parents[1];TO_M=Transformer.from_crs("EPSG:4326","EPSG:25832",always_xy=True);TO_W=Transformer.from_crs("EPSG:25832","EPSG:4326",always_xy=True)
def load(path):return json.loads(path.read_text(encoding="utf-8"))
def project(g):return transform(TO_M.transform,g)
def lonlat(point):return [round(v,7) for v in TO_W.transform(point.x,point.y)]
def lines(g):
    if g.geom_type in {"LineString","LinearRing"}:return [LineString([(p[0],p[1]) for p in g.coords])]
    if g.geom_type in {"MultiLineString","GeometryCollection"}:return [line for child in g.geoms for line in lines(child)]
    return []
def local_frame(geometry,window):
    line=max(lines(geometry),key=lambda item:item.length);distance=line.length*.5;before=line.interpolate(max(0,distance-window));after=line.interpolate(min(line.length,distance+window));dx,dy=after.x-before.x,after.y-before.y;length=max(math.hypot(dx,dy),.001);mid=line.interpolate(distance);return mid,(-dy/length,dx/length)
def bearing(water,land):return round((90-math.degrees(math.atan2(land.y-water.y,land.x-water.x)))%360,1)
def build(zones,parts_geo,locality_geo,names,name_audit,policy,side_review=None):
    zone_map={f["properties"]["id"]:f["properties"] for f in zones.get("features") or []};features={f["properties"].get("partId") or f["properties"].get("proposalId"):f for f in (parts_geo.get("features") or [])+(locality_geo.get("features") or [])};candidate_map={r["partId"]:r.get("officialPlaceCandidates") or [] for r in name_audit.get("parts") or []};side_decisions=(side_review or {}).get("decisions") or {};rows=[]
    for named in names.get("parts") or []:
        geometry=project(shape(features[named["finalPartId"]]["geometry"]));mid,normal=local_frame(geometry,policy["tangentWindowM"]);zone=zone_map[named["zoneId"]];marine_value=zone.get("dataPoint");marine=Point(*TO_M.transform(*marine_value)) if isinstance(marine_value,list) and len(marine_value)>=2 else None
        source_candidates=candidate_map.get(named["sourcePartId"],[]);land_options=[];water_options=[]
        for candidate in source_candidates:
            point=Point(*TO_M.transform(*candidate["visualCentre"]));distance=mid.distance(point)
            if candidate.get("mainType") in policy["landWitnessMainTypes"] and distance<=policy["maximumLandWitnessDistanceM"]:land_options.append((distance,candidate,point))
            if candidate.get("mainType")=="Farvand" and distance<=policy["maximumLandWitnessDistanceM"]:water_options.append((distance,candidate,point))
        land_options.sort(key=lambda item:(item[0],item[1]["primaryName"].casefold(),item[1]["id"]));water_options.sort(key=lambda item:(item[0],item[1]["primaryName"].casefold(),item[1]["id"]));marine_options=[(distance,candidate,point,"official-farvand-place-candidate") for distance,candidate,point in water_options]
        if marine is not None and mid.distance(marine)<=policy["maximumMarineWitnessDistanceM"]:marine_options.append((mid.distance(marine),None,marine,"centrally-hydrated-zone-dataPoint"))
        valid=[]
        for land_distance,land_candidate_option,land_point_witness in land_options:
            land_projection_option=(land_point_witness.x-mid.x)*normal[0]+(land_point_witness.y-mid.y)*normal[1]
            if abs(land_projection_option)<policy["minimumWitnessNormalSeparationM"]:continue
            for marine_distance,marine_candidate_option,marine_point_witness,marine_source_option in marine_options:
                water_projection_option=(marine_point_witness.x-mid.x)*normal[0]+(marine_point_witness.y-mid.y)*normal[1]
                if abs(water_projection_option)<policy["minimumWitnessNormalSeparationM"] or land_projection_option*water_projection_option>=0:continue
                sign=1 if land_projection_option>0 else -1;candidate_land=Point(mid.x+sign*normal[0]*policy["landPointOffsetM"],mid.y+sign*normal[1]*policy["landPointOffsetM"]);candidate_water=Point(mid.x-sign*normal[0]*policy["waterPointOffsetM"],mid.y-sign*normal[1]*policy["waterPointOffsetM"])
                if candidate_land.distance(land_point_witness)>=candidate_water.distance(land_point_witness) or candidate_water.distance(marine_point_witness)>=candidate_land.distance(marine_point_witness):continue
                valid.append((land_distance+marine_distance,land_candidate_option,land_point_witness,land_projection_option,marine_candidate_option,marine_point_witness,water_projection_option,marine_source_option,candidate_land,candidate_water))
        valid.sort(key=lambda item:(item[0],item[1]["primaryName"].casefold(),item[1]["id"],item[4]["id"] if item[4] else ""));reasons=[];land_candidate=land=land_projection=marine_candidate=water_projection=land_point=water_point=onshore=None;marine_source="centrally-hydrated-zone-dataPoint"
        if valid:
            _,land_candidate,land,land_projection,marine_candidate,marine,water_projection,marine_source,land_point,water_point=valid[0];onshore=bearing(water_point,land_point)
        else:
            if not land_options:reasons.append("NO_OFFICIAL_LAND_WITNESS")
            if not marine_options:reasons.append("NO_MARINE_WITNESS")
            reasons.append("NO_VALID_OPPOSITE_WITNESS_PAIR")
        unresolved=[] if not reasons else [{"side":side,"landCandidate":lonlat(Point(mid.x+side*normal[0]*policy["landPointOffsetM"],mid.y+side*normal[1]*policy["landPointOffsetM"])),"waterCandidate":lonlat(Point(mid.x-side*normal[0]*policy["waterPointOffsetM"],mid.y-side*normal[1]*policy["waterPointOffsetM"]))} for side in (1,-1)]
        reviewed=side_decisions.get(named["finalPartId"])
        if reasons and reviewed:
            selected=next((item for item in unresolved if item["side"]==reviewed.get("landSide")),None)
            if selected is None:raise RuntimeError(f"Ugyldig landSide-review for {named['finalPartId']}")
            land_point=Point(*TO_M.transform(*selected["landCandidate"]));water_point=Point(*TO_M.transform(*selected["waterCandidate"]));onshore=bearing(water_point,land_point);reasons=[];unresolved=[]
        rows.append({"zoneId":named["zoneId"],"coastType":zone.get("coastType") or "east","finalPartId":named["finalPartId"],"suggestedName":named["suggestedName"],"status":"private-point-pair-proposed" if not reasons else "blocked-point-pair-evidence","coastReferencePoint":lonlat(mid),"landPoint":lonlat(land_point) if not reasons else None,"waterPoint":lonlat(water_point) if not reasons else None,"onshoreDirectionDeg":onshore if not reasons else None,"landWitness":{"officialCandidateId":land_candidate["id"],"name":land_candidate["primaryName"],"distanceM":round(mid.distance(land),1),"normalProjectionM":round(land_projection,1)} if land_candidate else None,"marineWitness":{"source":marine_source,"officialCandidateId":marine_candidate["id"] if marine_candidate else None,"name":marine_candidate["primaryName"] if marine_candidate else None,"point":lonlat(marine) if marine_source.startswith("official") else marine_value,"distanceM":round(mid.distance(marine),1),"normalProjectionM":round(water_projection,1)} if marine is not None and water_projection is not None else None,"reviewedSideEvidence":reviewed,"unresolvedNormalCandidates":unresolved,"blockingReasons":sorted(set(reasons)),"weatherSamplingEnabled":False,"stateEnabled":False,"scoreEnabled":False,"automaticActivationAllowed":False})
    return {"schemaVersion":"1.0.0","status":"private-national-read-only-local-part-point-pairs","generatedAt":datetime.now(timezone.utc).isoformat().replace("+00:00","Z"),"finalPartCount":len(rows),"proposedPointPairCount":sum(r["status"]=="private-point-pair-proposed" for r in rows),"blockedPointPairCount":sum(r["status"]!="private-point-pair-proposed" for r in rows),"productionGeometryChanged":False,"adminDataChanged":False,"weatherSamplingChanged":False,"stateChanged":False,"scoreChanged":False,"automaticActivationAllowed":False,"parts":rows}
def self_test():
    mid,normal=local_frame(LineString([(0,0),(1000,0)]),50);assert abs(mid.x-500)<.1 and normal==(0,1);assert bearing(Point(0,-1),Point(0,1))==0;print("National lokal punktpar self-test: bestået.")
def main():
    p=argparse.ArgumentParser();p.add_argument("--work-dir",type=Path,default=ROOT/".geometry-v2-work");p.add_argument("--zones",type=Path,default=ROOT/"data"/"zones.geojson");p.add_argument("--policy",type=Path,default=ROOT/"data"/"geometry-v2"/"national-local-part-point-policy.json");p.add_argument("--final-coast",type=Path);p.add_argument("--final-names",type=Path);p.add_argument("--side-review",type=Path,default=ROOT/"data"/"geometry-v2"/"national-final-point-side-review-2026-08-11.json");p.add_argument("--output",type=Path);p.add_argument("--self-test",action="store_true");a=p.parse_args()
    if a.self_test:self_test();return
    parts_geo=load(a.final_coast) if a.final_coast else load(a.work_dir/"national-coastal-parts.geojson");locality_geo={"type":"FeatureCollection","features":[]} if a.final_coast else load(a.work_dir/"national-locality-partitions.geojson");names=load(a.final_names) if a.final_names else load(a.work_dir/"national-local-part-name-suggestions.json")
    report=build(load(a.zones),parts_geo,locality_geo,names,load(a.work_dir/"national-coastal-part-name-audit.json"),load(a.policy),load(a.side_review) if a.side_review.exists() else None);output=a.output or (a.work_dir/"national-local-part-point-pairs.json");output.parent.mkdir(parents=True,exist_ok=True);output.write_text(json.dumps(report,ensure_ascii=False,indent=2)+"\n",encoding="utf-8");print(f"Private nationale punktpar: {report['proposedPointPairCount']}/{report['finalPartCount']} foreslået, {report['blockedPointPairCount']} blokeret.")
if __name__=="__main__":main()
