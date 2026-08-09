#!/usr/bin/env python3
"""Fetch official Danish fjord/nor polygons for private national topology audit."""
from __future__ import annotations
import argparse, json, sys
from datetime import datetime, timezone
from pathlib import Path
import requests
from shapely.geometry import shape

ROOT=Path(__file__).resolve().parents[1]
URL="https://api.dataforsyningen.dk/steder"
BOUNDS=(7.5,54.4,15.3,57.9); PAGE_SIZE=1000; MAX_PAGES=20
def fail(message): print(message,file=sys.stderr); raise SystemExit(1)
def polygon(bounds):
    w,s,e,n=bounds
    return json.dumps([[[w,s],[e,s],[e,n],[w,n],[w,s]]],separators=(",",":"))
def fetch(policy):
    selected=[]; seen=set(); fetched=0; excluded={x.casefold() for x in policy["excludedOfficialFarvandSubtypes"]}
    for page in range(1,MAX_PAGES+1):
        try: response=requests.get(URL,params={"polygon":polygon(BOUNDS),"hovedtype":"Farvand","format":"geojson","per_side":PAGE_SIZE,"side":page},timeout=60)
        except requests.RequestException: fail("Det nationale officielle farvandskald kunne ikke gennemføres.")
        if not response.ok: fail(f"Det nationale officielle farvandskald fejlede (HTTP {response.status_code}).")
        try: payload=response.json()
        except ValueError: fail("Det nationale officielle farvandskald returnerede ikke gyldig GeoJSON.")
        if payload.get("type")!="FeatureCollection":fail("Det nationale officielle farvandskald returnerede ikke en FeatureCollection.")
        features=payload.get("features") or []; fetched+=len(features)
        for feature in features:
            props=feature.get("properties") or {}; feature_id=str(props.get("id") or ""); subtype=str(props.get("undertype") or "").casefold()
            if not feature_id or feature_id in seen or subtype not in excluded or not feature.get("geometry"): continue
            if shape(feature["geometry"]).geom_type not in {"Polygon","MultiPolygon"}:fail(f"Officiel farvandsmaske har uventet geometri: {feature_id}")
            seen.add(feature_id); selected.append({"type":"Feature","properties":{"officialPlaceId":feature_id,"primaryName":props.get("primærtnavn"),"mainType":props.get("hovedtype"),"subType":props.get("undertype"),"kind":"official-inner-water-exclusion","automaticActivationAllowed":False},"geometry":feature["geometry"]})
        if len(features)<PAGE_SIZE: break
    else: fail("Det nationale farvandsudtræk overskred sidegrænsen.")
    return {"type":"FeatureCollection","metadata":{"schemaVersion":"1.0.0","status":"private-national-official-water-exclusions","generatedAt":datetime.now(timezone.utc).isoformat().replace("+00:00","Z"),"source":"Dataforsyningen steder API / Danmarks officielle stednavneregister","endpoint":URL,"authentication":"none","fetchedFarvandCount":fetched,"selectedExclusionCount":len(selected),"productionGeometryChanged":False,"adminDataChanged":False,"scoreChanged":False,"automaticActivationAllowed":False},"features":selected}
def self_test():
    assert polygon((10,55,11,56)).startswith("[[[")
    assert {"fjord","nor"}=={x.casefold() for x in ["fjord","nor"]}
    print("National officiel fjord-/normaske self-test: bestået.")
def main():
    p=argparse.ArgumentParser(); p.add_argument("--policy",type=Path,default=ROOT/"data"/"geometry-v2"/"national-topology-audit-policy.json"); p.add_argument("--output",type=Path,default=ROOT/".geometry-v2-work"/"national-water-exclusions.geojson"); p.add_argument("--self-test",action="store_true"); a=p.parse_args()
    if a.self_test:self_test();return
    policy=json.loads(a.policy.read_text(encoding="utf-8")); output=fetch(policy); a.output.parent.mkdir(parents=True,exist_ok=True); a.output.write_text(json.dumps(output,ensure_ascii=False,separators=(",",":"))+"\n",encoding="utf-8"); print(f"Nationale fjord-/normasker: {len(output['features'])} officielle polygoner.")
if __name__=="__main__":main()
