#!/usr/bin/env python3
"""Fail closed on incomplete or mutating national topology audit output."""
from __future__ import annotations
import argparse, json
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
def fail(m):raise SystemExit(m)
def load(p):return json.loads(p.read_text(encoding="utf-8"))
def validate(report,geo,waters):
    if report.get("status")!="private-national-read-only-topology-audit" or report.get("zoneCount")!=208:fail("Topologiaudit kræver read-only status og 208 zoner.")
    for flag in ("productionGeometryChanged","adminDataChanged","weatherSamplingChanged","stateChanged","scoreChanged","automaticActivationAllowed"):
        if report.get(flag) is not False:fail(f"Ulovligt topologi-mutationsflag: {flag}")
    zones=report.get("zones") or []; zone_ids={r.get("zoneId") for r in zones}; features=geo.get("features") or []; feature_ids={f.get("properties",{}).get("zoneId") for f in features}
    if len(zones)!=208 or len(zone_ids)!=208 or feature_ids!=zone_ids or len(features)!=208:fail("Topologiaudit mangler entydig geometri for alle 208 zoner.")
    if any(r.get("automaticActivationAllowed") is not False or r.get("auditStatus")!="manual-review-required" for r in zones):fail("Topologiaudit forsøger automatisk aktivering eller mangler reviewgate.")
    water_meta=waters.get("metadata") or {}; water_features=waters.get("features") or []
    if water_meta.get("status")!="private-national-official-water-exclusions" or not water_features or water_meta.get("selectedExclusionCount")!=len(water_features):fail("Officielle nationale fjord-/normasker er tomme eller inkonsistente.")
    if any(r.get("retainedLengthKm",-1)<0 or r.get("removedByTopologyMasksKm",-1)<0 for r in zones):fail("Topologilængder er ugyldige.")
    return {"zoneCount":len(zones),"waterExclusionCount":len(water_features),"retainedZoneCount":sum(1 for r in zones if r.get("retainedLengthKm",0)>0),"harbourHitZones":sum(1 for r in zones if r.get("harbourObjectCount",0)>0),"riverMouthHitZones":sum(1 for r in zones if r.get("riverMouthCount",0)>0),"innerWaterHitZones":sum(1 for r in zones if r.get("officialInnerWaterCount",0)>0)}
def self_test():
    zones=[{"zoneId":f"Z{i}","auditStatus":"manual-review-required","retainedLengthKm":1,"removedByTopologyMasksKm":0,"automaticActivationAllowed":False} for i in range(208)]; report={"status":"private-national-read-only-topology-audit","zoneCount":208,"zones":zones,"productionGeometryChanged":False,"adminDataChanged":False,"weatherSamplingChanged":False,"stateChanged":False,"scoreChanged":False,"automaticActivationAllowed":False}; geo={"features":[{"properties":{"zoneId":f"Z{i}"}} for i in range(208)]}; waters={"metadata":{"status":"private-national-official-water-exclusions","selectedExclusionCount":1},"features":[{}]}; assert validate(report,geo,waters)["zoneCount"]==208; print("National topologiaudit-validering self-test: bestået.")
def main():
    p=argparse.ArgumentParser(); p.add_argument("--report",type=Path,default=ROOT/".geometry-v2-work"/"national-topology-audit.json"); p.add_argument("--geojson",type=Path,default=ROOT/".geometry-v2-work"/"national-topology-audit.geojson"); p.add_argument("--water",type=Path,default=ROOT/".geometry-v2-work"/"national-water-exclusions.geojson"); p.add_argument("--self-test",action="store_true"); a=p.parse_args()
    if a.self_test:self_test();return
    print(json.dumps(validate(load(a.report),load(a.geojson),load(a.water)),ensure_ascii=False,sort_keys=True))
if __name__=="__main__":main()
