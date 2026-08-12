#!/usr/bin/env python3
"""Fail-closed validation of the private national GeoDanmark source artifact."""
from __future__ import annotations
import argparse, hashlib, json, os
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
LAYERS=("Kyst","Havn","Vandloebskant","Vandloebsmidte","Hoefde","SandKlit","Skraent")
def fail(message): raise SystemExit(message)
def load(path): return json.loads(path.read_text(encoding="utf-8"))
def sha(path): return hashlib.sha256(path.read_bytes().rstrip(b"\n")).hexdigest()
def validate(plan, report, work, secret=""):
    expected=plan.get("sourceZoneCount")
    if not isinstance(expected,int) or expected<=0 or report.get("sourceZoneCount")!=expected: fail("National kildevalidering kræver samme positive zonebestand i plan og kildemanifest.")
    if report.get("status")!="private-national-official-source-acquired": fail("Nationalt kildemanifest har forkert status.")
    for flag in ("productionGeometryChanged","adminDataChanged","weatherSamplingChanged","scoreChanged","automaticActivationAllowed"):
        if report.get(flag) is not False: fail(f"Nationalt kildemanifest har ulovligt mutationsflag: {flag}")
    plan_tiles={t["id"]:t for t in plan.get("tiles") or []}; report_tiles={t["id"]:t for t in report.get("tiles") or []}
    if plan_tiles.keys()!=report_tiles.keys(): fail("Rapportens fliser matcher ikke planen.")
    planned_zones={row["zoneId"] for row in plan.get("zones") or []}; covered=set()
    for tile_id,tile in report_tiles.items():
        if tile.get("zoneIds")!=plan_tiles[tile_id].get("zoneIds"): fail(f"Zonebinding ændret for flise {tile_id}.")
        covered.update(tile.get("zoneIds") or [])
        rows={row["requestedLayer"]:row for row in tile.get("layers") or []}
        for layer in LAYERS:
            resolved=(report.get("resolvedLayers") or {}).get(layer)
            row=rows.get(layer)
            if resolved and (not row or row.get("status")!="fetched" or row.get("complete") is not True): fail(f"Ufuldstændigt lag {layer} i {tile_id}.")
            if row and row.get("status")=="fetched":
                path=work/tile_id/row["file"]
                if not path.is_file() or sha(path)!=row.get("sha256"): fail(f"Fil/hash-fejl for {tile_id}/{layer}.")
    if covered!=planned_zones or len(covered)!=expected: fail(f"Fliserne dækker ikke alle {expected} planzoner.")
    merged=report.get("mergedLayers") or {}
    if "Kyst" not in merged or merged["Kyst"].get("featureCount",0)<=0: fail("Det samlede nationale Kyst-lag mangler.")
    for layer,row in merged.items():
        path=work/row["file"]
        if not path.is_file() or sha(path)!=row.get("sha256"): fail(f"Samlet lag/hash-fejl: {layer}.")
        if row.get("duplicateTileFeaturesRemoved",-1)<0: fail(f"Deduplikeringsmåling mangler: {layer}.")
    forbidden=[b"apikey="]
    if secret: forbidden.append(secret.encode())
    for path in [work/p["file"] for p in merged.values()]:
        content=path.read_bytes()
        if any(value and value in content for value in forbidden): fail(f"Credential fundet i {path.name}.")
    return {"zoneCount":len(covered),"tileCount":len(report_tiles),"layerCount":len(merged),"featureCounts":{key:value["featureCount"] for key,value in merged.items()},"duplicatesRemoved":{key:value["duplicateTileFeaturesRemoved"] for key,value in merged.items()}}
def self_test(tmp):
    tmp.mkdir(parents=True,exist_ok=True); zones=[f"Z-{i:03d}" for i in range(208)]; tile={"id":"dk-00-00","zoneIds":zones}; plan={"sourceZoneCount":208,"tiles":[tile],"zones":[{"zoneId":z} for z in zones]}
    folder=tmp/tile["id"]; folder.mkdir(exist_ok=True); layer_rows=[]; merged={}; resolved={}
    for layer in LAYERS:
        path=folder/f"{layer}.geojson"; path.write_text('{"type":"FeatureCollection","features":[{"id":"x"}]}\n',encoding="utf-8"); row={"requestedLayer":layer,"status":"fetched","complete":True,"file":path.name,"sha256":sha(path)}; layer_rows.append(row); resolved[layer]=layer
        target=tmp/f"national-{layer}.geojson"; target.write_bytes(path.read_bytes()); merged[layer]={"file":target.name,"sha256":sha(target),"featureCount":1,"duplicateTileFeaturesRemoved":0}
    report={"sourceZoneCount":208,"status":"private-national-official-source-acquired","tiles":[{"id":tile["id"],"zoneIds":zones,"layers":layer_rows}],"resolvedLayers":resolved,"mergedLayers":merged,"productionGeometryChanged":False,"adminDataChanged":False,"weatherSamplingChanged":False,"scoreChanged":False,"automaticActivationAllowed":False}
    result=validate(plan,report,tmp); assert result["zoneCount"]==208 and result["layerCount"]==7
    print("National GeoDanmark source validation self-test: bestået.")
def main():
    parser=argparse.ArgumentParser(); parser.add_argument("--plan",type=Path,default=ROOT/".geometry-v2-work"/"national-work-plan.json"); parser.add_argument("--report",type=Path,default=ROOT/".geometry-v2-work"/"national-source-manifest.json"); parser.add_argument("--work-dir",type=Path,default=ROOT/".geometry-v2-work"/"national-source"); parser.add_argument("--self-test",action="store_true"); args=parser.parse_args()
    if args.self_test: self_test(ROOT/".geometry-v2-work"/"self-test-national-source-validation"); return
    result=validate(load(args.plan),load(args.report),args.work_dir.resolve(),os.environ.get("DATAFORDELER_API_KEY","")); print(json.dumps(result,ensure_ascii=False,sort_keys=True))
if __name__=="__main__": main()
