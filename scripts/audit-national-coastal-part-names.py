#!/usr/bin/env python3
"""Attach bounded official place-name candidates to private national coastal parts."""
from __future__ import annotations
import argparse,json,sys
from concurrent.futures import ThreadPoolExecutor,as_completed
from datetime import datetime,timezone
from pathlib import Path
import requests
from pyproj import Transformer
from shapely.geometry import Point,shape
from shapely.ops import transform
from shapely.strtree import STRtree
ROOT=Path(__file__).resolve().parents[1];URL="https://api.dataforsyningen.dk/steder";TYPES=("Bebyggelse","Farvand","Landskabsform","Naturareal","Havnebassin");TO_M=Transformer.from_crs("EPSG:4326","EPSG:25832",always_xy=True);PAGE_SIZE=1000;MAX_PAGES=20;MAX_DISTANCE_M=10000;FETCH_MARGIN_DEGREES=0.12;MAX_CANDIDATES=30;WORKERS=4
DIRECT_COASTAL_SUBTYPES={"strand","pynt","ø","bugt","næs","odde","sandKlit","halvø","sund","øgruppe","klint","nor","tange","fjord","bredning","skær","hage","løb","sejlløb","skræntNaturlig","klippeIOverfladen"};SETTLEMENT_SUBTYPES={"by","bydel","spredtBebyggelse","sommerhusområde","sommerhusområdedel"};CANDIDATE_QUOTAS={"direct-coastal":16,"local-settlement":8,"harbour-context":3,"other-context":3}
def fail(m):print(m,file=sys.stderr);raise SystemExit(1)
def load(p):return json.loads(p.read_text(encoding="utf-8"))
def polygon(bounds):
    w,s,e,n=bounds;w=max(7.0,w-FETCH_MARGIN_DEGREES);s=max(54.0,s-FETCH_MARGIN_DEGREES);e=min(16.0,e+FETCH_MARGIN_DEGREES);n=min(58.5,n+FETCH_MARGIN_DEGREES);return json.dumps([[[w,s],[e,s],[e,n],[w,n],[w,s]]],separators=(",",":"))
def compact(item):
    centre=item.get("visueltcenter")
    if not isinstance(centre,list) or len(centre)<2 or not item.get("id") or not item.get("primærtnavn"):return None
    return {"id":str(item["id"]),"primaryName":item["primærtnavn"],"nameStatus":item.get("primærnavnestatus"),"mainType":item.get("hovedtype"),"subType":item.get("undertype"),"visualCentre":[float(centre[0]),float(centre[1])]}
def get(params):
    try:r=requests.get(URL,params=params,timeout=60)
    except requests.RequestException as exc:fail(f"Officiel stednavnekilde kunne ikke hentes: {exc.__class__.__name__}")
    if not r.ok:fail(f"Officiel stednavnekilde fejlede (HTTP {r.status_code}).")
    try:data=r.json()
    except ValueError:fail("Officiel stednavnekilde returnerede ikke JSON.")
    if not isinstance(data,list):fail("Officiel stednavnekilde returnerede ikke en liste.")
    return data
def fetch_tile(tile):
    unique={};calls=0;area=polygon(tile["boundsWgs84"])
    for main_type in TYPES:
        for page in range(1,MAX_PAGES+1):
            items=get({"polygon":area,"hovedtype":main_type,"per_side":PAGE_SIZE,"side":page});calls+=1
            for item in items:
                row=compact(item)
                if row:unique[row["id"]]=row
            if len(items)<PAGE_SIZE:break
        else:fail(f"Stednavnetile {tile['id']}/{main_type} overskred sidegrænsen.")
    return unique,calls
def fetch_places(plan):
    unique={};calls=0
    with ThreadPoolExecutor(max_workers=WORKERS) as pool:
        futures={pool.submit(fetch_tile,t):t["id"] for t in plan.get("tiles") or []}
        for future in as_completed(futures):
            rows,count=future.result();unique.update(rows);calls+=count
    return list(unique.values()),calls
def project(g):return transform(TO_M.transform,g)
def relevance(place):
    if place.get("subType") in DIRECT_COASTAL_SUBTYPES:return "direct-coastal"
    if place.get("subType") in SETTLEMENT_SUBTYPES:return "local-settlement"
    if place.get("mainType")=="Havnebassin":return "harbour-context"
    return "other-context"
def select_candidates(candidates,status_rank):
    order=lambda p:(p["distanceToPartM"],status_rank.get(p["nameStatus"],9),p["primaryName"].casefold(),p["id"])
    groups={key:[] for key in CANDIDATE_QUOTAS}
    for candidate in candidates:
        candidate["coastalRelevance"]=relevance(candidate);groups[candidate["coastalRelevance"]].append(candidate)
    selected=[];selected_ids=set()
    for key,limit in CANDIDATE_QUOTAS.items():
        for candidate in sorted(groups[key],key=order)[:limit]:selected.append(candidate);selected_ids.add(candidate["id"])
    for candidate in sorted(candidates,key=order):
        if len(selected)>=MAX_CANDIDATES:break
        if candidate["id"] not in selected_ids:selected.append(candidate);selected_ids.add(candidate["id"])
    return sorted(selected,key=lambda p:(list(CANDIDATE_QUOTAS).index(p["coastalRelevance"]),*order(p)))
def build(parts_report,parts_geo,places,request_count,tile_count):
    zones={z["zoneId"]:z for z in parts_report.get("zones") or []};features=parts_geo.get("features") or []
    if len(zones)!=208 or len(features)!=parts_report.get("coastalPartCount"):fail("Navneaudit kræver komplette nationale kystdele.")
    points=[Point(*TO_M.transform(*p["visualCentre"])) for p in places];tree=STRtree(points) if points else None;rows=[];status_rank={"suAutoriseret":0,"officielt":1,"uofficielt":2}
    for feature in features:
        props=feature.get("properties") or {};part_id=props.get("partId");zone_id=props.get("zoneId");coast=project(shape(feature["geometry"]));candidates=[]
        indexes=tree.query(coast.buffer(MAX_DISTANCE_M),predicate="intersects") if tree else []
        for index in indexes:
            place=places[int(index)];distance=coast.distance(points[int(index)])
            if distance<=MAX_DISTANCE_M:candidates.append({**place,"distanceToPartM":round(distance,1)})
        candidates=select_candidates(candidates,status_rank)
        rows.append({"zoneId":zone_id,"partId":part_id,"partProposalStatus":zones[zone_id]["proposalStatus"],"partLocalityReviewFlags":props.get("localityReviewFlags") or [],"candidateStatus":"official-candidates-present" if candidates else "no-nearby-official-candidate","officialPlaceCandidates":candidates,"proposedName":None,"automaticRenameAllowed":False,"automaticActivationAllowed":False})
    all_candidates=[candidate for row in rows for candidate in row["officialPlaceCandidates"]];class_counts={key:sum(1 for candidate in all_candidates if candidate["coastalRelevance"]==key) for key in CANDIDATE_QUOTAS}
    return {"schemaVersion":"1.0.0","status":"private-national-read-only-official-place-name-candidates","generatedAt":datetime.now(timezone.utc).isoformat().replace("+00:00","Z"),"source":{"name":"Dataforsyningen steder API / Danmarks officielle stednavneregister","endpoint":URL,"authentication":"none","placeTypes":list(TYPES),"tileCount":tile_count,"requestCount":request_count,"fetchMarginDegrees":FETCH_MARGIN_DEGREES,"maximumCandidateDistanceM":MAX_DISTANCE_M},"zoneCount":len(zones),"partCount":len(rows),"partWithCandidateCount":sum(1 for r in rows if r["officialPlaceCandidates"]),"candidateCount":len(all_candidates),"uniqueCandidateCount":len({candidate["id"] for candidate in all_candidates}),"partAtCandidateLimitCount":sum(1 for row in rows if len(row["officialPlaceCandidates"])==MAX_CANDIDATES),"candidateClassCounts":class_counts,"productionGeometryChanged":False,"adminDataChanged":False,"weatherSamplingChanged":False,"stateChanged":False,"scoreChanged":False,"automaticRenameAllowed":False,"automaticActivationAllowed":False,"parts":rows}
def self_test():
    report={"coastalPartCount":1,"zones":[{"zoneId":"Z1","proposalStatus":"private-review-parts-generated"}]+[{"zoneId":f"Z{i}","proposalStatus":"blocked-no-retained-source"} for i in range(2,209)]};geo={"features":[{"properties":{"zoneId":"Z1","partId":"p1","localityReviewFlags":[]},"geometry":{"type":"LineString","coordinates":[[12,56],[12.01,56]]}}]};places=[{"id":"s1","primaryName":"Teststrand","nameStatus":"officielt","mainType":"Naturareal","subType":"strand","visualCentre":[12.005,56.001]}];out=build(report,geo,places,1,100);assert out["partWithCandidateCount"]==1 and out["parts"][0]["proposedName"] is None and out["source"]["tileCount"]==100;print("National officiel stednavneaudit self-test: bestået.")
def main():
    p=argparse.ArgumentParser();p.add_argument("--work-dir",type=Path,default=ROOT/".geometry-v2-work");p.add_argument("--self-test",action="store_true");a=p.parse_args()
    if a.self_test:self_test();return
    plan=load(a.work_dir/"national-work-plan.json");tiles=plan.get("tiles") or []
    if len(tiles)!=100:fail("National stednavneaudit kræver den aktuelle 100-fliseplan.")
    places,calls=fetch_places(plan);out=build(load(a.work_dir/"national-coastal-parts.json"),load(a.work_dir/"national-coastal-parts.geojson"),places,calls,len(tiles));(a.work_dir/"national-coastal-part-name-audit.json").write_text(json.dumps(out,ensure_ascii=False,indent=2)+"\n",encoding="utf-8");print(f"Officielle nationale stednavnekandidater: {out['partWithCandidateCount']}/{out['partCount']} dele, {len(places)} unikke steder.")
if __name__=="__main__":main()
