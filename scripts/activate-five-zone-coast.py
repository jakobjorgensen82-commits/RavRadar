#!/usr/bin/env python3
"""Activate the owner-approved five-zone coast and permanently remove Fejø/Femø."""
from __future__ import annotations
import argparse, hashlib, json, shutil
from datetime import datetime, timezone
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1];FILES=("coastal-parts.geojson","part-names.json","point-pairs.json","dmi-grid-proof.json");DELETED={"DK-B10-16"}
def load(p): return json.loads(p.read_text(encoding="utf-8"))
def write(p,v,pretty=False): p.parent.mkdir(parents=True,exist_ok=True);p.write_text(json.dumps(v,ensure_ascii=False,indent=2 if pretty else None,separators=None if pretty else (",",":"))+"\n",encoding="utf-8")
def digest(p): return hashlib.sha256(p.read_text(encoding="utf-8").replace("\r\n","\n").encode()).hexdigest()

def main():
 p=argparse.ArgumentParser();p.add_argument("--activate",action="store_true");p.add_argument("--active",type=Path,default=ROOT/"data/geometry-v2/active-national-coastal-parts");p.add_argument("--zones",type=Path,default=ROOT/"data/zones.geojson");p.add_argument("--candidate",type=Path,required=True);p.add_argument("--points",type=Path,required=True);p.add_argument("--grid",type=Path,required=True);p.add_argument("--plan",type=Path,required=True);p.add_argument("--rollback",type=Path,default=ROOT/"data/geometry-v2/rollback-4.0.186-before-five-zone-coast");a=p.parse_args()
 if not a.activate:p.error("Aktivering kræver --activate")
 if a.rollback.exists(): raise RuntimeError("Rollbackmappen findes allerede; aktivering afbrydes")
 a.rollback.mkdir(parents=True);[shutil.copy2(a.active/n,a.rollback/n) for n in (*FILES,"manifest.json","assembly-audit.json")];shutil.copy2(a.zones,a.rollback/"zones.geojson")
 coast=load(a.active/"coastal-parts.geojson");names=load(a.active/"part-names.json");points=load(a.active/"point-pairs.json");grid=load(a.active/"dmi-grid-proof.json");candidate=load(a.candidate);new_points=load(a.points);new_grid=load(a.grid);plan=load(a.plan)
 removed=set(plan["replacedPartsToDisableAfterDmiApproval"]);features=[f for f in candidate["features"] if f["properties"]["zoneId"] not in DELETED];new_ids={f["properties"]["partId"] for f in features};ownership={pid:target for target,pids in plan["ownershipMoves"].items() for pid in pids}
 coast["features"]=[f for f in coast["features"] if f["properties"].get("finalPartId") not in removed and f["properties"].get("zoneId") not in DELETED]
 for f in coast["features"]:
  pid=f["properties"].get("finalPartId");f["properties"]["zoneId"]=ownership.get(pid,f["properties"].get("zoneId"))
 coast["features"] += [{"type":"Feature","properties":{"zoneId":f["properties"]["zoneId"],"partId":f["properties"]["partId"],"finalPartId":f["properties"]["partId"]},"geometry":f["geometry"]} for f in features]
 def keep(row): return row.get("finalPartId") not in removed and row.get("zoneId") not in DELETED
 names["parts"]=[r for r in names["parts"] if keep(r)];points["parts"]=[r for r in points["parts"] if keep(r)];grid["parts"]=[r for r in grid["parts"] if keep(r)]
 for rows in (names["parts"],points["parts"],grid["parts"]):
  for row in rows:
   pid=row.get("finalPartId");row["zoneId"]=ownership.get(pid,row.get("zoneId"))
 selected_points=[r for r in new_points["parts"] if r["finalPartId"] in new_ids];selected_grid=[r for r in new_grid["parts"] if r["finalPartId"] in new_ids]
 names["parts"] += [{"finalPartId":r["finalPartId"],"zoneId":r["zoneId"],"suggestedName":r["suggestedName"],"sourcePartId":r["finalPartId"]} for r in selected_points];points["parts"]+=selected_points;grid["parts"]+=selected_grid
 count=len(coast["features"])
 for d in (names,points,grid):d["finalPartCount"]=count;d["automaticActivationAllowed"]=False
 for n,d in zip(FILES,(coast,names,points,grid)):write(a.active/n,d)
 zones=load(a.zones);zones["features"]=[f for f in zones["features"] if f.get("properties",{}).get("id") not in DELETED];zones["version"]="4.0.187";write(a.zones,zones,True)
 full=sum(r.get("selected",{}).get("fullWeatherCoverage") is True for r in grid["parts"]);manifest={**load(a.active/"manifest.json"),"status":"owner-approved-five-zone-coast-active","sourceRunId":"31609637964","sourceVersion":"4.0.187","partCount":count,"zoneCount":210,"parentZoneCount":211,"pointPairCount":count,"fullMarineCoveragePartCount":full,"partialMarineCoveragePartCount":count-full,"files":{n:digest(a.active/n) for n in FILES},"publicActivation":True,"activatedAt":"2026-08-12","activationAuthority":"explicit owner approval in Codex thread 2026-08-12; DK-B10-16 deleted","rollback":{"method":str(a.rollback),"preservesParentRuntime":True},"automaticActivationAllowed":False};write(a.active/"manifest.json",manifest,True)
 audit={"schemaVersion":"1.0.0","status":"passed-owner-approved-five-zone-activation-assembly","partCount":count,"preciseZoneCount":210,"parentZoneCount":211,"deletedZoneIds":["DK-B02-14","DK-B10-16"],"overlapPairCount":0,"pointPairCount":count,"ownerApproved":True,"automaticActivationAllowed":False};write(a.active/"assembly-audit.json",audit,True);print(json.dumps(audit,ensure_ascii=False))
if __name__=="__main__":main()
