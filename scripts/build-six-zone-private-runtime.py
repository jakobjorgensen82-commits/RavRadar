#!/usr/bin/env python3
"""Assemble a private, non-activatable runtime bundle for the approved six-zone repair."""
from __future__ import annotations
import argparse, hashlib, json
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
def load(path): return json.loads(path.read_text(encoding="utf-8"))
def write(path,value):
    text=json.dumps(value,ensure_ascii=False,separators=(",",":"))+"\n";path.write_text(text,encoding="utf-8")
    return hashlib.sha256(text.encode()).hexdigest()

def main():
    p=argparse.ArgumentParser();p.add_argument("--active",type=Path,default=ROOT/"data/geometry-v2/active-national-coastal-parts");p.add_argument("--candidate",type=Path,required=True);p.add_argument("--points",type=Path,required=True);p.add_argument("--grid",type=Path,required=True);p.add_argument("--plan",type=Path,required=True);p.add_argument("--output",type=Path,required=True);a=p.parse_args();a.output.mkdir(parents=True,exist_ok=True)
    coast=load(a.active/"coastal-parts.geojson");names=load(a.active/"part-names.json");points=load(a.active/"point-pairs.json");grid=load(a.active/"dmi-grid-proof.json")
    candidate,new_points,new_grid,plan=load(a.candidate),load(a.points),load(a.grid),load(a.plan)
    removed=set(plan["replacedPartsToDisableAfterDmiApproval"]);features=candidate["features"]
    ids={f["properties"]["partId"] for f in features}
    if len(ids)!=22 or {r["finalPartId"] for r in new_points["parts"]}!=ids or {r["finalPartId"] for r in new_grid["parts"]}!=ids: raise RuntimeError("Kandidaten er ikke 22:22:22")
    if any(r.get("status")!="validated-selected-water-point" for r in new_grid["parts"]): raise RuntimeError("Native DMI-gridbevis mangler")
    coast["features"]=[r for r in coast["features"] if r["properties"].get("finalPartId") not in removed]+[{"type":"Feature","properties":{"zoneId":f["properties"]["zoneId"],"partId":f["properties"]["partId"],"finalPartId":f["properties"]["partId"]},"geometry":f["geometry"]} for f in features]
    names["parts"]=[r for r in names["parts"] if r.get("finalPartId") not in removed]+[{"finalPartId":r["finalPartId"],"zoneId":r["zoneId"],"suggestedName":r["suggestedName"],"sourcePartId":r["finalPartId"]} for r in new_points["parts"]]
    points["parts"]=[r for r in points["parts"] if r.get("finalPartId") not in removed]+new_points["parts"]
    grid["parts"]=[r for r in grid["parts"] if r.get("finalPartId") not in removed]+new_grid["parts"]
    for d in (names,points,grid): d["finalPartCount"]=len(coast["features"]);d["automaticActivationAllowed"]=False
    files={"coastal-parts.geojson":coast,"part-names.json":names,"point-pairs.json":points,"dmi-grid-proof.json":grid};digests={n:write(a.output/n,v) for n,v in files.items()}
    ownership={pid:{"targetZoneId":target,"published":True} for target,pids in plan["ownershipMoves"].items() for pid in pids};write(a.output/"coastline-overrides.json",{"schemaVersion":4,"partOwnership":ownership,"disabledParts":{},"automaticActivationAllowed":False})
    manifest={"schemaVersion":"1.0.0","status":"private-six-zone-runtime-candidate","sourceRunId":"six-zone-private","sourceVersion":"4.0.186-six-zone-private","partCount":len(coast["features"]),"zoneCount":211,"files":digests,"publicActivation":False,"automaticActivationAllowed":False,"activatedAt":"2026-08-12","rollback":{"method":"discard private bundle; active production bundle remains unchanged"}}
    write(a.output/"manifest.json",manifest);print(json.dumps({"status":manifest["status"],"partCount":manifest["partCount"],"publicActivation":False}))
if __name__=="__main__": main()
