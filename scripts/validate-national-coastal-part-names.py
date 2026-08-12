#!/usr/bin/env python3
from __future__ import annotations
import argparse,json
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
EXPECTED_ZONE_COUNT=211
PLACE_TYPE_COUNT=5
def fail(m):raise SystemExit(m)
def validate(audit,parts,plan):
    if audit.get("status")!="private-national-read-only-official-place-name-candidates" or audit.get("zoneCount")!=EXPECTED_ZONE_COUNT or audit.get("partCount")!=parts.get("coastalPartCount"):fail("National stednavneaudit mangler komplet privat status.")
    for flag in ("productionGeometryChanged","adminDataChanged","weatherSamplingChanged","stateChanged","scoreChanged","automaticRenameAllowed","automaticActivationAllowed"):
        if audit.get(flag) is not False:fail(f"Ulovligt stednavnemutationsflag: {flag}")
    source=audit.get("source") or {}
    if source.get("endpoint")!="https://api.dataforsyningen.dk/steder" or source.get("authentication")!="none":fail("Stednavneaudit har forkert officiel kilde eller autentifikation.")
    tile_count=len(plan.get("tiles") or [])
    if tile_count<1 or source.get("tileCount")!=tile_count or int(source.get("requestCount") or 0)<tile_count*PLACE_TYPE_COUNT:fail("Stednavneaudit har ufuldstændigt flise-/requestspor.")
    maximum=float(source.get("maximumCandidateDistanceM") or 0)
    if maximum!=10000:fail("Stednavneaudit har forkert kandidatdistance.")
    expected={p["partId"] for z in parts.get("zones") or [] for p in z.get("coastalParts") or []};rows=audit.get("parts") or [];ids={r.get("partId") for r in rows}
    if len(rows)!=len(expected) or ids!=expected:fail("Stednavneaudit matcher ikke de nationale del-ID'er.")
    if any(r.get("proposedName") is not None or r.get("automaticRenameAllowed") is not False or r.get("automaticActivationAllowed") is not False for r in rows):fail("Stednavneaudit har automatisk navn eller aktivering.")
    if any(len(r.get("officialPlaceCandidates") or [])>30 for r in rows):fail("Stednavneaudit overskrider kandidatgrænsen.")
    for row in rows:
        candidates=row.get("officialPlaceCandidates") or [];candidate_ids=[c.get("id") for c in candidates]
        if len(candidate_ids)!=len(set(candidate_ids)) or any(not c.get("primaryName") or float(c.get("distanceToPartM",maximum+1))>maximum for c in candidates):fail(f"Ugyldig eller dubleret stednavnekandidat for {row.get('partId')}.")
        if any(c.get("coastalRelevance") not in {"direct-coastal","local-settlement","harbour-context","other-context"} for c in candidates):fail(f"Stednavnekandidat mangler relevansklasse for {row.get('partId')}.")
    all_candidates=[candidate for row in rows for candidate in row.get("officialPlaceCandidates") or []];classes={key:sum(1 for candidate in all_candidates if candidate.get("coastalRelevance")==key) for key in ("direct-coastal","local-settlement","harbour-context","other-context")}
    if audit.get("candidateCount")!=len(all_candidates) or audit.get("uniqueCandidateCount")!=len({c.get("id") for c in all_candidates}) or audit.get("candidateClassCounts")!=classes:fail("Stednavneaudittens kandidatresume er inkonsistent.")
    if audit.get("partAtCandidateLimitCount")!=sum(1 for row in rows if len(row.get("officialPlaceCandidates") or [])==30):fail("Stednavneaudittens kandidatloftresume er inkonsistent.")
    return {"zoneCount":EXPECTED_ZONE_COUNT,"partCount":len(rows),"partWithCandidateCount":sum(1 for r in rows if r.get("officialPlaceCandidates"))}
def self_test():
    parts={"coastalPartCount":1,"zones":[{"zoneId":"Z1","coastalParts":[{"partId":"p1"}]}]+[{"zoneId":f"Z{i}","coastalParts":[]} for i in range(2,EXPECTED_ZONE_COUNT+1)]};plan={"tiles":[{"id":f"t{i}"} for i in range(131)]};audit={"status":"private-national-read-only-official-place-name-candidates","zoneCount":EXPECTED_ZONE_COUNT,"partCount":1,"source":{"endpoint":"https://api.dataforsyningen.dk/steder","authentication":"none","tileCount":131,"requestCount":655,"maximumCandidateDistanceM":10000},"candidateCount":1,"uniqueCandidateCount":1,"partAtCandidateLimitCount":0,"candidateClassCounts":{"direct-coastal":1,"local-settlement":0,"harbour-context":0,"other-context":0},"productionGeometryChanged":False,"adminDataChanged":False,"weatherSamplingChanged":False,"stateChanged":False,"scoreChanged":False,"automaticRenameAllowed":False,"automaticActivationAllowed":False,"parts":[{"partId":"p1","proposedName":None,"automaticRenameAllowed":False,"automaticActivationAllowed":False,"officialPlaceCandidates":[{"id":"s1","primaryName":"Teststrand","distanceToPartM":50,"coastalRelevance":"direct-coastal"}]}]};assert validate(audit,parts,plan)["partWithCandidateCount"]==1;print("National officiel stednavnevalidator self-test: bestået.")
def main():
    p=argparse.ArgumentParser();p.add_argument("--work-dir",type=Path,default=ROOT/".geometry-v2-work");p.add_argument("--self-test",action="store_true");a=p.parse_args()
    if a.self_test:self_test();return
    load=lambda n:json.loads((a.work_dir/n).read_text(encoding="utf-8"));print(json.dumps(validate(load("national-coastal-part-name-audit.json"),load("national-coastal-parts.json"),load("national-work-plan.json")),sort_keys=True))
if __name__=="__main__":main()
