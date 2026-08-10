#!/usr/bin/env python3
"""Build evidence-backed, private name suggestions for the final national local parts."""
from __future__ import annotations
import argparse,json,math
from datetime import datetime,timezone
from pathlib import Path
from pyproj import Transformer
from shapely.geometry import Point,shape
from shapely.ops import transform
ROOT=Path(__file__).resolve().parents[1]
TO_M=Transformer.from_crs("EPSG:4326","EPSG:25832",always_xy=True)
def load(path):return json.loads(path.read_text(encoding="utf-8"))
def fail(message):raise SystemExit(message)
def project(geometry):return transform(TO_M.transform,geometry)
def direction(dx,dy):
    angle=(math.degrees(math.atan2(dx,dy))+360)%360
    return ("nord","nordøst","øst","sydøst","syd","sydvest","vest","nordvest")[round(angle/45)%8]
def candidates_for(geometry,candidates,policy):
    priority={name:index for index,name in enumerate(policy["subTypePriority"])};rows=[]
    for candidate in candidates:
        relevance=candidate["coastalRelevance"];point=Point(*TO_M.transform(*candidate["visualCentre"]));distance=geometry.distance(point)
        maximum=policy["maximumCandidateDistanceM"].get(relevance,0)
        if distance<=maximum:
            rank=priority.get(candidate.get("subType"),len(priority)+({"direct-coastal":0,"local-settlement":10,"other-context":20,"harbour-context":30}.get(relevance,40)))
            rows.append({**candidate,"distanceToFinalPartM":round(distance,1),"selectionPriority":rank,"selectionScore":round(distance+rank*250,1)})
    if not rows:
        for candidate in candidates:
            point=Point(*TO_M.transform(*candidate["visualCentre"]));distance=geometry.distance(point)
            if distance<=policy["fallbackMaximumDistanceM"]:rows.append({**candidate,"distanceToFinalPartM":round(distance,1),"selectionPriority":100,"selectionScore":round(distance+25000,1),"fallbackContext":True})
    return sorted(rows,key=lambda row:(row["selectionScore"],row["distanceToFinalPartM"],row["primaryName"].casefold(),row["id"]))
def build(parts_report,parts_geo,locality_report,locality_geo,name_audit,policy):
    source_features={f["properties"]["partId"]:f for f in parts_geo.get("features") or []};locality_features={f["properties"]["proposalId"]:f for f in locality_geo.get("features") or []};names={row["partId"]:row for row in name_audit.get("parts") or []};replaced={row["sourcePartId"] for row in locality_report.get("sourceParts") or []}
    final=[]
    for zone in parts_report.get("zones") or []:
        for part in zone.get("coastalParts") or []:
            part_id=part["partId"]
            if part_id not in replaced:final.append({"zoneId":zone["zoneId"],"finalPartId":part_id,"sourcePartId":part_id,"partitionKind":"source-part","feature":source_features[part_id]})
    for source in locality_report.get("sourceParts") or []:
        zone_id=source["sourcePartId"].split("-national-part-")[0].upper()
        for proposal in source.get("proposals") or []:final.append({"zoneId":zone_id,"finalPartId":proposal["proposalId"],"sourcePartId":source["sourcePartId"],"partitionKind":"locality-partition","feature":locality_features[proposal["proposalId"]]})
    for row in final:
        geometry=project(shape(row["feature"]["geometry"]));row["geometry"]=geometry;row["centroid"]=geometry.centroid;row["eligibleCandidates"]=candidates_for(geometry,names[row["sourcePartId"]].get("officialPlaceCandidates") or [],policy)
    zone_centres={zone_id:Point(sum(r["centroid"].x for r in rows)/len(rows),sum(r["centroid"].y for r in rows)/len(rows)) for zone_id in {r["zoneId"] for r in final} for rows in [[r for r in final if r["zoneId"]==zone_id]]}
    chosen_names={}
    for zone_id in sorted({row["zoneId"] for row in final}):
        used=set();zone_rows=sorted((row for row in final if row["zoneId"]==zone_id),key=lambda row:(len(row["eligibleCandidates"]),row["finalPartId"]))
        for row in zone_rows:
            chosen=next((candidate for candidate in row["eligibleCandidates"] if candidate["primaryName"].casefold() not in used),None)
            if chosen is None and row["eligibleCandidates"]:chosen=row["eligibleCandidates"][0]
            row["chosen"]=chosen
            if chosen:used.add(chosen["primaryName"].casefold());chosen_names.setdefault((zone_id,chosen["primaryName"]),[]).append(row)
    used_suggestions=set()
    output=[]
    for row in sorted(final,key=lambda r:(r["zoneId"],r["finalPartId"])):
        chosen=row["chosen"];suggested=None;qualifier=None
        if chosen:
            duplicate=len(chosen_names[(row["zoneId"],chosen["primaryName"])])>1
            if duplicate:
                point=Point(*TO_M.transform(*chosen["visualCentre"]));qualifier=direction(row["centroid"].x-point.x,row["centroid"].y-point.y);suggested=f"{qualifier.capitalize()} for {chosen['primaryName']}"
            else:suggested=chosen["primaryName"]
            base=suggested;index=2
            while (row["zoneId"],suggested.casefold()) in used_suggestions:suggested=f"{base} – kystafsnit {index}";index+=1
            used_suggestions.add((row["zoneId"],suggested.casefold()))
        output.append({"zoneId":row["zoneId"],"finalPartId":row["finalPartId"],"sourcePartId":row["sourcePartId"],"partitionKind":row["partitionKind"],"nameStatus":"private-official-name-suggestion" if suggested else "blocked-no-suitable-official-name","suggestedName":suggested,"directionalQualifier":qualifier,"chosenOfficialCandidate":chosen,"alternativeOfficialCandidates":row["eligibleCandidates"][1:6],"automaticRenameAllowed":False,"automaticActivationAllowed":False})
    return {"schemaVersion":"1.0.0","status":"private-national-read-only-local-part-name-suggestions","generatedAt":datetime.now(timezone.utc).isoformat().replace("+00:00","Z"),"sourceCoastalPartCount":parts_report["coastalPartCount"],"replacedSourcePartCount":len(replaced),"finalPartCount":len(output),"suggestedNameCount":sum(1 for row in output if row["suggestedName"]),"blockedNameCount":sum(1 for row in output if not row["suggestedName"]),"productionGeometryChanged":False,"adminDataChanged":False,"weatherSamplingChanged":False,"stateChanged":False,"scoreChanged":False,"automaticRenameAllowed":False,"automaticActivationAllowed":False,"parts":output}
def self_test():
    policy=load(ROOT/"data"/"geometry-v2"/"national-local-part-name-policy.json");geometry=project(shape({"type":"LineString","coordinates":[[10,57],[10.01,57]]}));rows=candidates_for(geometry,[{"id":"x","primaryName":"Teststrand","subType":"strand","coastalRelevance":"direct-coastal","visualCentre":[10.005,57.001]}],policy);assert rows[0]["primaryName"]=="Teststrand";print("National lokal kystdelsnavn self-test: bestået.")
def main():
    parser=argparse.ArgumentParser();parser.add_argument("--work-dir",type=Path,default=ROOT/".geometry-v2-work");parser.add_argument("--policy",type=Path,default=ROOT/"data"/"geometry-v2"/"national-local-part-name-policy.json");parser.add_argument("--self-test",action="store_true");args=parser.parse_args()
    if args.self_test:self_test();return
    report=build(load(args.work_dir/"national-coastal-parts.json"),load(args.work_dir/"national-coastal-parts.geojson"),load(args.work_dir/"national-locality-partitions.json"),load(args.work_dir/"national-locality-partitions.geojson"),load(args.work_dir/"national-coastal-part-name-audit.json"),load(args.policy));(args.work_dir/"national-local-part-name-suggestions.json").write_text(json.dumps(report,ensure_ascii=False,indent=2)+"\n",encoding="utf-8");print(f"Private nationale delnavne: {report['suggestedNameCount']}/{report['finalPartCount']} forslag, {report['blockedNameCount']} blokeret.")
if __name__=="__main__":main()
