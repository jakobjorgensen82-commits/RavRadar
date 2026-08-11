#!/usr/bin/env python3
"""Fetch every official Danish Farvand feature for private inner-water audit."""
from __future__ import annotations
import argparse,json,sys
from datetime import datetime,timezone
from pathlib import Path
import requests

ROOT=Path(__file__).resolve().parents[1]; URL="https://api.dataforsyningen.dk/steder"; BOUNDS=(7.5,54.4,15.3,57.9); PAGE_SIZE=1000; MAX_PAGES=20
def fail(message): print(message,file=sys.stderr); raise SystemExit(1)
def polygon(bounds):
    w,s,e,n=bounds; return json.dumps([[[w,s],[e,s],[e,n],[w,n],[w,s]]],separators=(",",":"))
def fetch():
    selected=[];seen=set()
    for page in range(1,MAX_PAGES+1):
        try:r=requests.get(URL,params={"polygon":polygon(BOUNDS),"hovedtype":"Farvand","format":"geojson","per_side":PAGE_SIZE,"side":page},timeout=90)
        except requests.RequestException:fail("Det officielle nationale farvandskald kunne ikke gennemføres.")
        if not r.ok:fail(f"Det officielle nationale farvandskald fejlede (HTTP {r.status_code}).")
        try:payload=r.json()
        except ValueError:fail("Det officielle nationale farvandskald returnerede ikke GeoJSON.")
        features=payload.get("features") or []
        for feature in features:
            props=feature.get("properties") or {};fid=str(props.get("id") or "")
            if not fid or fid in seen or not feature.get("geometry"):continue
            seen.add(fid);selected.append({"type":"Feature","properties":{"officialPlaceId":fid,"primaryName":props.get("primærtnavn"),"mainType":props.get("hovedtype"),"subType":props.get("undertype"),"kind":"official-water-audit-context","automaticActivationAllowed":False},"geometry":feature["geometry"]})
        if len(features)<PAGE_SIZE:break
    else:fail("Farvandsudtrækket overskred sidegrænsen.")
    return {"type":"FeatureCollection","metadata":{"schemaVersion":"1.0.0","status":"private-national-all-official-waters","generatedAt":datetime.now(timezone.utc).isoformat().replace("+00:00","Z"),"source":"Dataforsyningen steder API / Danmarks officielle stednavneregister","endpoint":URL,"authentication":"none","featureCount":len(selected),"productionGeometryChanged":False,"adminDataChanged":False,"scoreChanged":False,"automaticActivationAllowed":False},"features":selected}
def self_test():
    assert polygon((10,55,11,56)).startswith("[[[");print("National alle officielle farvande self-test: bestået.")
def main():
    p=argparse.ArgumentParser();p.add_argument("--output",type=Path,default=ROOT/".geometry-v2-work"/"national-official-waters.geojson");p.add_argument("--self-test",action="store_true");a=p.parse_args()
    if a.self_test:self_test();return
    out=fetch();a.output.parent.mkdir(parents=True,exist_ok=True);a.output.write_text(json.dumps(out,ensure_ascii=False,separators=(",",":"))+"\n",encoding="utf-8");print(f"Officielle farvande hentet: {len(out['features'])}.")
if __name__=="__main__":main()
