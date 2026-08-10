#!/usr/bin/env python3
from __future__ import annotations
import argparse,json
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
def fail(message):raise SystemExit(message)
def validate(report):
    rows=report.get("parts") or []
    if report.get("status")!="private-national-read-only-local-part-point-pairs" or report.get("finalPartCount")!=len(rows):fail("National punktparrapport har forkert status eller antal.")
    for flag in ("productionGeometryChanged","adminDataChanged","weatherSamplingChanged","stateChanged","scoreChanged","automaticActivationAllowed"):
        if report.get(flag) is not False:fail(f"Ulovligt punktmutationsflag: {flag}")
    ids=[r.get("finalPartId") for r in rows]
    if len(ids)!=len(set(ids)):fail("Punktpar-ID'er er ikke unikke.")
    for row in rows:
        proposed=row.get("status")=="private-point-pair-proposed"
        if proposed != all(isinstance(row.get(key),list) and len(row[key])==2 for key in ("landPoint","waterPoint")):fail(f"Punktstatus er inkonsistent for {row.get('finalPartId')}.")
        if proposed and (row.get("blockingReasons") or row.get("weatherSamplingEnabled") is not False or row.get("automaticActivationAllowed") is not False):fail(f"Foreslået punktpar er ikke isoleret for {row.get('finalPartId')}.")
        if not proposed and (row.get("landPoint") is not None or row.get("waterPoint") is not None or not row.get("blockingReasons") or len(row.get("unresolvedNormalCandidates") or [])!=2):fail(f"Blokeret punktpar lækker aktive punkter eller mangler to DMI-reviewkandidater for {row.get('finalPartId')}.")
    if report.get("proposedPointPairCount")!=sum(r["status"]=="private-point-pair-proposed" for r in rows) or report.get("blockedPointPairCount")!=sum(r["status"]!="private-point-pair-proposed" for r in rows):fail("Punktpars-Summer er inkonsistente.")
    return {"finalPartCount":len(rows),"proposedPointPairCount":report["proposedPointPairCount"],"blockedPointPairCount":report["blockedPointPairCount"]}
def main():
    p=argparse.ArgumentParser();p.add_argument("--work-dir",type=Path,default=ROOT/".geometry-v2-work");a=p.parse_args();print(json.dumps(validate(json.loads((a.work_dir/"national-local-part-point-pairs.json").read_text(encoding="utf-8"))),sort_keys=True))
if __name__=="__main__":main()
