#!/usr/bin/env python3
"""Privately fetch and merge official GeoDanmark layers for the national v2 plan."""
from __future__ import annotations
import argparse, hashlib, importlib.util, json, os
from datetime import datetime, timezone
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
LAYERS=("Kyst","Havn","Vandloebskant","Vandloebsmidte","Hoefde","SandKlit","Skraent")
def fail(message): raise SystemExit(message)
def load(path): return json.loads(path.read_text(encoding="utf-8"))
def digest(payload): return hashlib.sha256(payload).hexdigest()
def feature_key(feature):
    if feature.get("id"): return f"id:{feature['id']}"
    value=json.dumps({"geometry":feature.get("geometry"),"properties":feature.get("properties")},ensure_ascii=False,sort_keys=True,separators=(",",":")).encode()
    return f"sha256:{digest(value)}"
def merge_tiles(paths, output):
    unique={}; duplicates=0
    for path in sorted(paths):
        for feature in load(path).get("features") or []:
            key=feature_key(feature)
            if key in unique: duplicates+=1
            else: unique[key]=feature
    result={"type":"FeatureCollection","features":[unique[key] for key in sorted(unique)]}
    encoded=json.dumps(result,ensure_ascii=False,separators=(",",":")).encode()
    output.write_bytes(encoded+b"\n")
    return {"featureCount":len(unique),"duplicateTileFeaturesRemoved":duplicates,"sha256":digest(encoded),"file":output.name}
def pilot_module():
    spec=importlib.util.spec_from_file_location("ravradar_geodanmark_fetch",ROOT/"scripts"/"fetch-geodanmark-pilot.py")
    module=importlib.util.module_from_spec(spec); spec.loader.exec_module(module); return module
def validate_plan(plan):
    if plan.get("status")!="national-read-only-work-plan" or plan.get("automaticActivationAllowed") is not False: fail("Ugyldig national read-only arbejdsplan.")
    if plan.get("sourceZoneCount")!=208: fail("National kildehentning kræver præcis 208 centralt effektive zoner.")
    tiles=plan.get("tiles") or []
    if not tiles or len({t.get("id") for t in tiles})!=len(tiles): fail("Manglende eller dublerede nationale fliser.")
    planned={z.get("zoneId") for z in plan.get("zones") or []}; covered={z for t in tiles for z in t.get("zoneIds") or []}
    if planned!=covered: fail("National flisedækning matcher ikke zonebestanden.")
    return tiles
def self_test(tmp):
    tmp.mkdir(parents=True,exist_ok=True)
    values=[{"type":"FeatureCollection","features":[{"id":"a","geometry":None,"properties":{}},{"id":"shared","geometry":None,"properties":{}}]},{"type":"FeatureCollection","features":[{"id":"shared","geometry":None,"properties":{}},{"geometry":{"type":"Point","coordinates":[10,56]},"properties":{"kind":"x"}}]}]
    paths=[]
    for index,value in enumerate(values):
        path=tmp/f"{index}.json"; path.write_text(json.dumps(value),encoding="utf-8"); paths.append(path)
    result=merge_tiles(paths,tmp/"merged.geojson")
    assert result["featureCount"]==3 and result["duplicateTileFeaturesRemoved"]==1
    print("National GeoDanmark fetch/merge self-test: bestået.")
def main():
    parser=argparse.ArgumentParser(); parser.add_argument("--plan",type=Path,default=ROOT/".geometry-v2-work"/"national-work-plan.json"); parser.add_argument("--work-dir",type=Path,default=ROOT/".geometry-v2-work"/"national-source"); parser.add_argument("--report",type=Path,default=ROOT/".geometry-v2-work"/"national-source-manifest.json"); parser.add_argument("--self-test",action="store_true"); args=parser.parse_args()
    if args.self_test: self_test(ROOT/".geometry-v2-work"/"self-test-national-fetch"); return
    key=os.environ.get("DATAFORDELER_API_KEY","").strip()
    if not key: fail("DATAFORDELER_API_KEY mangler; national kildehentning blev ikke forsøgt.")
    module=pilot_module(); plan=load(args.plan.resolve()); tiles=validate_plan(plan); work=args.work_dir.resolve(); report=args.report.resolve()
    if ROOT not in work.parents or ROOT not in report.parents: fail("Nationalt kildeoutput skal ligge i workspace.")
    work.mkdir(parents=True,exist_ok=True); available=module.capability_layers(key); resolved={layer:module.find_layer(available,layer) for layer in LAYERS}
    if not resolved["Kyst"]: fail("GeoDanmark WFS eksponerer ikke det krævede Kyst-lag.")
    tile_results=[]
    for tile in tiles:
        folder=work/tile["id"]; folder.mkdir(parents=True,exist_ok=True); layers=[]
        for requested,source_layer in resolved.items():
            if not source_layer: layers.append({"requestedLayer":requested,"status":"not-exposed-by-source"}); continue
            result=module.fetch_layer(source_layer,tile["boundsWgs84"],folder/f"{requested}.geojson",key); layers.append({"requestedLayer":requested,"status":"fetched",**result})
        tile_results.append({"id":tile["id"],"boundsWgs84":tile["boundsWgs84"],"zoneIds":tile["zoneIds"],"layers":layers})
    merged={}
    for layer in LAYERS:
        paths=[work/t["id"]/f"{layer}.geojson" for t in tiles if (work/t["id"]/f"{layer}.geojson").exists()]
        if paths: merged[layer]=merge_tiles(paths,work/f"national-{layer}.geojson")
    payload={"schemaVersion":"1.0.0","status":"private-national-official-source-acquired","createdAt":datetime.now(timezone.utc).isoformat().replace("+00:00","Z"),"source":"GeoDanmark Vektor WFS","licence":"CC-BY-4.0","costClass":"free-data-only","planDigest":digest(args.plan.read_bytes()),"sourceZoneCount":plan["sourceZoneCount"],"tileCount":len(tiles),"resolvedLayers":resolved,"tiles":tile_results,"mergedLayers":merged,"productionGeometryChanged":False,"adminDataChanged":False,"weatherSamplingChanged":False,"scoreChanged":False,"automaticActivationAllowed":False,"secretHandling":"Credential and credential-bearing URLs are never persisted."}
    report.write_text(json.dumps(payload,ensure_ascii=False,indent=2)+"\n",encoding="utf-8"); print(f"National privat GeoDanmark-kilde: {len(tiles)} fliser, {len(merged)} samlede lag.")
if __name__=="__main__": main()
