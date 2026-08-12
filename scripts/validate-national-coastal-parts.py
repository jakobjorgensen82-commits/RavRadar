#!/usr/bin/env python3
from __future__ import annotations
import argparse,json
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
EXPECTED_ZONE_COUNT=211
def fail(m):raise SystemExit(m)
def load(p):return json.loads(p.read_text(encoding="utf-8"))
def validate(report,geo):
    if report.get("status")!="private-national-read-only-coastal-parts" or report.get("zoneCount")!=EXPECTED_ZONE_COUNT:fail(f"National delrapport mangler read-only status eller {EXPECTED_ZONE_COUNT} zoner.")
    for flag in ("productionGeometryChanged","adminDataChanged","weatherSamplingChanged","stateChanged","scoreChanged","automaticActivationAllowed"):
        if report.get(flag) is not False:fail(f"Ulovligt nationalt del-mutationsflag: {flag}")
    zones=report.get("zones") or [];parts=[p for z in zones for p in z.get("coastalParts") or []];features=geo.get("features") or []
    if len(zones)!=EXPECTED_ZONE_COUNT or len({z.get("zoneId") for z in zones})!=EXPECTED_ZONE_COUNT or report.get("coastalPartCount")!=len(parts) or len(features)!=len(parts):fail("Nationalt delantal er inkonsistent.")
    ids=[p.get("partId") for p in parts]
    if len(ids)!=len(set(ids)) or any(p.get("proposedName") is not None or p.get("nameStatus")!="official-place-name-required" for p in parts):fail("Nationale dele har dublet-ID eller opdigtet navn.")
    if report.get("inventedConnectionCount")!=0 or any(p.get("inventedConnectionCount")!=0 or p.get("automaticActivationAllowed") is not False for p in parts):fail("National delgenerator har opfundet forbindelse eller aktivering.")
    for zone in zones:
        flagged=sum(1 for part in zone.get("coastalParts") or [] if part.get("localityReviewFlags"))
        if zone.get("localityReviewPartCount")!=flagged:fail(f"Lokalitetsreview-antallet er inkonsistent for {zone.get('zoneId')}.")
        if flagged and zone.get("proposalStatus")=="private-review-parts-generated":fail(f"For grov kystdel er ikke blokeret for {zone.get('zoneId')}.")
    return {"zoneCount":len(zones),"partCount":len(parts),"blockedZoneCount":sum(1 for z in zones if z.get("proposalStatus","").startswith("blocked-"))}
def self_test():
    zones=[{"zoneId":f"Z{i}","proposalStatus":"private-review-parts-generated","localityReviewPartCount":0,"coastalParts":[]} for i in range(EXPECTED_ZONE_COUNT)];r={"status":"private-national-read-only-coastal-parts","zoneCount":EXPECTED_ZONE_COUNT,"coastalPartCount":0,"inventedConnectionCount":0,"zones":zones,"productionGeometryChanged":False,"adminDataChanged":False,"weatherSamplingChanged":False,"stateChanged":False,"scoreChanged":False,"automaticActivationAllowed":False};assert validate(r,{"features":[]})["zoneCount"]==EXPECTED_ZONE_COUNT;print("National coastal parts validation self-test: bestået.")
def main():
    p=argparse.ArgumentParser();p.add_argument("--report",type=Path,default=ROOT/".geometry-v2-work"/"national-coastal-parts.json");p.add_argument("--geojson",type=Path,default=ROOT/".geometry-v2-work"/"national-coastal-parts.geojson");p.add_argument("--self-test",action="store_true");a=p.parse_args();
    if a.self_test:self_test();return
    print(json.dumps(validate(load(a.report),load(a.geojson)),ensure_ascii=False,sort_keys=True))
if __name__=="__main__":main()
