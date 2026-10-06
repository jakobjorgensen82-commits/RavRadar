"""Qualitative input-dependency audit, not a calibration or probability test."""
from collections import Counter
import gzip
import hashlib
import json
from pathlib import Path
import sys

ROOT=Path(__file__).resolve().parents[3]
sys.path.insert(0,str(ROOT / "scripts/lib"))
from jordrav_model import MODEL, classify, constituents


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def audit():
    base=ROOT / "data/jordrav/prototype-0.1.0"
    manifest=json.loads((base / "manifest.json").read_bytes())
    catalog_path=base / manifest["catalog"]["file"]
    assert sha(catalog_path)==manifest["catalog"]["sha256"]
    entries=json.loads(gzip.decompress(catalog_path.read_bytes()))["entries"]
    landscape_changes, depth_changes, classes=Counter(),Counter(),Counter()
    checks=Counter()
    for e in entries:
        older=e["source"]=="soil-old"
        actual=classify(e["surface"],e["depth"],e["landscape"],older)
        category=actual["potential"]
        classes[category]+=1
        no_landscape=classify(e["surface"],e["depth"],"Ikke kortlagt",older)["potential"]
        no_lower=classify(e["surface"],"X",e["landscape"],older)["potential"]
        if no_landscape!=category:landscape_changes[(category,no_landscape)]+=1
        if no_lower!=category:depth_changes[(category,no_lower)]+=1
        assert actual["confidence"]=="weak" and actual["accessibility"]!="near-surface"
        materials=constituents(e["surface"],older)
        if "unresolved" in materials:
            assert category=="unresolved";checks["unknownUpperNotSubstituted"]+=1
        if category=="coastal":
            assert materials<={"marine-coarse","marine-fine","marine-mixed"}
            checks["marineUpperMaterialRequired"]+=1
        if actual["material"]=="till" and actual["process"]=="marine":
            assert category=="possible";checks["marineLandformDoesNotConvertTill"]+=1
        if materials & {"organic-cover","aeolian-cover"}:
            assert category not in {"enhanced","coastal","basin","reworked"}
            checks["coverNotConvertedToAccessibleReceivingMaterial"]+=1
    result={"status":"PASS","modelVersion":MODEL,"scriptSha256":sha(Path(__file__)),
            "modelCodeSha256":sha(ROOT / "scripts/lib/jordrav_model.py"),
            "rulesSha256":sha(ROOT / "data/jordrav/model-rules.json"),
            "historicalCatalogueSha256":sha(catalog_path),"catalogueEntries":len(entries),
            "scope":"Input-dependency of all catalogue combinations; counts are explanations, not polygons, area or amber probability",
            "classes":dict(classes),"invariantCounts":dict(checks),
            "withoutLandscapeChanges":[{"from":a,"to":b,"entries":n} for (a,b),n in sorted(landscape_changes.items())],
            "withoutLowerSymbolChanges":[{"from":a,"to":b,"entries":n} for (a,b),n in sorted(depth_changes.items())],
            "interpretation":"Removing landscape can remove process support or a known exclusion context (water/artificial/tidal). These are counterfactual dependency checks, not replacement mapping. Missing lower symbol affects only conditional cover pathways. No field-access threshold is inferred."}
    path=Path(__file__).with_name("national-model-0.2-rule-sensitivity.json")
    path.write_text(json.dumps(result,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
    print(json.dumps({"status":"PASS","entries":len(entries),"classes":dict(classes),"lowerDependentEntries":sum(depth_changes.values()),"landscapeDependentEntries":sum(landscape_changes.values())}))


if __name__=="__main__":
    audit()
