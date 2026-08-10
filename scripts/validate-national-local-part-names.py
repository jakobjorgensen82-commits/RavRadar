#!/usr/bin/env python3
from __future__ import annotations
import argparse,json
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
def fail(message):raise SystemExit(message)
def validate(report):
    rows=report.get("parts") or []
    if report.get("status")!="private-national-read-only-local-part-name-suggestions" or report.get("finalPartCount")!=len(rows):fail("National navnerapport har forkert status eller antal.")
    for flag in ("productionGeometryChanged","adminDataChanged","weatherSamplingChanged","stateChanged","scoreChanged","automaticRenameAllowed","automaticActivationAllowed"):
        if report.get(flag) is not False:fail(f"Ulovligt navnemutationsflag: {flag}")
    ids=[row.get("finalPartId") for row in rows]
    if len(ids)!=len(set(ids)):fail("Nationale lokale del-ID'er er ikke unikke.")
    names=[(row.get("zoneId"),(row.get("suggestedName") or "").casefold()) for row in rows if row.get("suggestedName")]
    if len(names)!=len(set(names)):fail("Lokale navneforslag er ikke unikke inden for zonen.")
    if any(row.get("automaticRenameAllowed") is not False or row.get("automaticActivationAllowed") is not False for row in rows):fail("Et lokalt navn tillader automatisk omdøbning eller aktivering.")
    if any(bool(row.get("suggestedName")) != (row.get("nameStatus")=="private-official-name-suggestion") for row in rows):fail("Navnestatus og forslag er inkonsistente.")
    if any(row.get("suggestedName") and not row.get("chosenOfficialCandidate",{}).get("id") for row in rows):fail("Navneforslag mangler officielt kandidat-ID.")
    if report.get("suggestedNameCount")!=sum(1 for row in rows if row.get("suggestedName")) or report.get("blockedNameCount")!=sum(1 for row in rows if not row.get("suggestedName")):fail("Navnesummer er inkonsistente.")
    return {"finalPartCount":len(rows),"suggestedNameCount":report["suggestedNameCount"],"blockedNameCount":report["blockedNameCount"]}
def main():
    parser=argparse.ArgumentParser();parser.add_argument("--work-dir",type=Path,default=ROOT/".geometry-v2-work");args=parser.parse_args();report=json.loads((args.work_dir/"national-local-part-name-suggestions.json").read_text(encoding="utf-8"));print(json.dumps(validate(report),sort_keys=True))
if __name__=="__main__":main()
