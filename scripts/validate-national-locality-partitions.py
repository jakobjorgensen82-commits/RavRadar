#!/usr/bin/env python3
from __future__ import annotations
import argparse,json
from pathlib import Path
from pyproj import Transformer
from shapely.geometry import shape
from shapely.ops import transform,unary_union
ROOT=Path(__file__).resolve().parents[1];TO_M=Transformer.from_crs("EPSG:4326","EPSG:25832",always_xy=True)
def fail(m):raise SystemExit(m)
def load(p):return json.loads(p.read_text(encoding="utf-8"))
def project(g):return transform(TO_M.transform,g)
def validate(report,geo,source_geo,policy):
    if report.get("status")!="private-national-read-only-locality-partitions" or report.get("sourcePartCount")!=len(report.get("sourceParts") or []) or report.get("sourcePartCount",0)<1:fail("Lokalitetsrapport mangler privat status eller konsistent kildeantal.")
    for flag in ("productionGeometryChanged","adminDataChanged","weatherSamplingChanged","stateChanged","scoreChanged","automaticNamingAllowed","automaticActivationAllowed"):
        if report.get(flag) is not False:fail(f"Ulovligt lokalitetsmutationsflag: {flag}")
    source={f["properties"]["partId"]:project(shape(f["geometry"])) for f in source_geo.get("features") or []};features=geo.get("features") or [];rows=[p for s in report.get("sourceParts") or [] for p in s.get("proposals") or []]
    if len(features)!=len(rows) or report.get("proposalCount")!=len(rows):fail("Lokalitetsforslagets antal er inkonsistent.")
    ids=[r.get("proposalId") for r in rows]
    if len(ids)!=len(set(ids)) or any(r.get("proposedName") is not None or r.get("inventedConnectionCount")!=0 or r.get("automaticActivationAllowed") is not False for r in rows):fail("Lokalitetsforslag har dublet-ID, navn, forbindelse eller aktivering.")
    grouped={}
    for feature in features:
        props=feature.get("properties") or {};geometry=project(shape(feature["geometry"]));source_id=props.get("sourcePartId")
        if geometry.geom_type not in {"LineString","MultiLineString"} or geometry.length>policy["maximumLocalPartLengthM"]+1 or geometry.difference(source[source_id].buffer(.5)).length>.5:fail(f"Lokalitetsforslag forlader kildelinjen eller er for langt: {props.get('proposalId')}")
        grouped.setdefault(source_id,[]).append(geometry)
    for source_id,parts in grouped.items():
        union=unary_union(parts)
        if abs(union.length-source[source_id].length)>1:fail(f"Lokalitetsforslag dækker ikke kildedelen én gang: {source_id}")
    return {"sourcePartCount":report["sourcePartCount"],"proposalCount":len(rows)}
def main():
    p=argparse.ArgumentParser();p.add_argument("--work-dir",type=Path,default=ROOT/".geometry-v2-work");p.add_argument("--policy",type=Path,default=ROOT/"data"/"geometry-v2"/"national-locality-partition-policy.json");a=p.parse_args();print(json.dumps(validate(load(a.work_dir/"national-locality-partitions.json"),load(a.work_dir/"national-locality-partitions.geojson"),load(a.work_dir/"national-coastal-parts.geojson"),load(a.policy)),sort_keys=True))
if __name__=="__main__":main()
