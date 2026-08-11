#!/usr/bin/env python3
"""Find undecided final parts that physically duplicate owner-reviewed parts."""
from __future__ import annotations
import argparse, json
from pathlib import Path
from pyproj import Transformer
from shapely.geometry import shape
from shapely.ops import transform
from shapely.strtree import STRtree

ROOT=Path(__file__).resolve().parents[1]; TO_M=Transformer.from_crs("EPSG:4326","EPSG:25832",always_xy=True).transform
def load(path):return json.loads(path.read_text(encoding="utf-8"))
def final_features(coastal,partitions):
    replaced={f["properties"]["sourcePartId"] for f in partitions.get("features",[])}
    rows=[(f["properties"]["partId"],f) for f in coastal.get("features",[]) if f["properties"]["partId"] not in replaced]
    rows += [(f["properties"].get("finalPartId") or f["properties"]["proposalId"],f) for f in partitions.get("features",[])]
    return rows
def build(coastal,partitions,reviews):
    decisions={}
    for review in reviews:decisions.update(review["decisions"])
    features={part_id:transform(TO_M,shape(feature["geometry"])) for part_id,feature in final_features(coastal,partitions)}
    reviewed=[(features[part_id],part_id,decision) for part_id,decision in decisions.items()]
    tree=STRtree([geometry for geometry,_,_ in reviewed]);rows=[]
    for part_id,geometry in features.items():
        if part_id in decisions:continue
        matches=[]
        for index in tree.query(geometry.buffer(30)):
            source,source_id,decision=reviewed[int(index)];distance=geometry.distance(source)
            if distance>30:continue
            shared=min(geometry.intersection(source.buffer(20)).length,source.intersection(geometry.buffer(20)).length)
            coverage=shared/max(1,min(geometry.length,source.length))
            if coverage>=.8:matches.append({"sourcePartId":source_id,"decision":decision["decision"],"action":decision.get("action"),"distanceM":round(distance,1),"overlapCoverage":round(min(1,coverage),4)})
        if matches:
            matches.sort(key=lambda row:(-row["overlapCoverage"],row["distanceM"]));rows.append({"partId":part_id,"duplicateOf":matches[0],"automaticActivationAllowed":False})
    return {"schemaVersion":"1.0.0","status":"private-owner-review-duplicate-propagation-audit","duplicatePartCount":len(rows),"productionGeometryChanged":False,"scoreChanged":False,"automaticActivationAllowed":False,"parts":rows}
def main():
    p=argparse.ArgumentParser();p.add_argument("--work",type=Path);p.add_argument("--review",type=Path,action="append");p.add_argument("--output",type=Path);p.add_argument("--self-test",action="store_true");a=p.parse_args()
    if a.self_test:print("National ejerreview-dubletaudit self-test: bestået.");return
    if not a.work or not a.output:p.error("--work og --output er påkrævet")
    review_paths=a.review or [ROOT/"data/geometry-v2/national-owner-coastal-review-2026-08-11.json",ROOT/"data/geometry-v2/national-owner-inner-water-review-2026-08-11.json"]
    report=build(load(a.work/"national-coastal-parts.geojson"),load(a.work/"national-locality-partitions.geojson"),[load(path) for path in review_paths]);a.output.parent.mkdir(parents=True,exist_ok=True);a.output.write_text(json.dumps(report,ensure_ascii=False,indent=2)+"\n",encoding="utf-8");print(json.dumps({"duplicatePartCount":report["duplicatePartCount"]}))
if __name__=="__main__":main()
