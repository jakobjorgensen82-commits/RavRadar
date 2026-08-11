#!/usr/bin/env python3
"""Assemble reviewed national coast once-only and preserve surviving part IDs."""
from __future__ import annotations
import argparse, json, math
from collections import defaultdict
from datetime import datetime, timezone
from pathlib import Path
from pyproj import Transformer
from shapely.geometry import LineString, Point, box, mapping, shape
from shapely.ops import linemerge, transform, unary_union
from shapely.strtree import STRtree

ROOT=Path(__file__).resolve().parents[1]
TO_M=Transformer.from_crs(4326,25832,always_xy=True).transform
TO_W=Transformer.from_crs(25832,4326,always_xy=True).transform
def load(p):return json.loads(p.read_text(encoding="utf-8"))
def lines(g):
    if g.is_empty:return []
    if g.geom_type in {"LineString","LinearRing"}:return [LineString(g.coords)]
    if g.geom_type in {"MultiLineString","GeometryCollection"}:return [p for c in g.geoms for p in lines(c)]
    return []
def original_features(work):
    coastal=load(work/"national-coastal-parts.geojson");parts=load(work/"national-locality-partitions.geojson")
    replaced={f["properties"]["sourcePartId"] for f in parts.get("features",[])}
    rows={f["properties"]["partId"]:f for f in coastal.get("features",[]) if f["properties"]["partId"] not in replaced}
    rows.update({f["properties"].get("finalPartId") or f["properties"]["proposalId"]:f for f in parts.get("features",[])})
    return rows
def sample_distance(line,target):
    return sum(line.interpolate(line.length*i/4).distance(target) for i in range(5))/5
def build(work,correction_dir,zones_doc):
    features=original_features(work);names=load(work/"national-local-part-name-suggestions.json")
    named={r["finalPartId"]:r for r in names["parts"]};report=load(correction_dir/"owner-correction-proposal.json");proposal=load(correction_dir/"owner-correction-proposal.geojson")
    for row in report["parts"]:
        if row["status"]=="owner-approved-delete":features.pop(row["partId"],None)
    for feature in proposal["features"]:features[feature["properties"]["finalPartId"]]=feature
    zones={f["properties"]["id"]:f["properties"] for f in zones_doc.get("features",[])}
    source={pid:transform(TO_M,shape(f["geometry"])) for pid,f in features.items()}; ids=list(source); geoms=[source[i] for i in ids];tree=STRtree(geoms)
    zone_lines={zid:transform(TO_M,LineString(p["coastLine"])) for zid,p in zones.items() if len(p.get("coastLine") or [])>=2}
    zone_points={zid:Point(*Transformer.from_crs(4326,25832,always_xy=True).transform(*p["dataPoint"])) for zid,p in zones.items() if len(p.get("dataPoint") or [])>=2}
    priority={}
    for pid,g in source.items():
        zid=named[pid]["zoneId"];coast=zone_lines.get(zid);point=zone_points.get(zid)
        priority[pid]=(sample_distance(g,coast) if coast is not None else math.inf,g.centroid.distance(point) if point is not None else math.inf,zid,pid)
    removal=defaultdict(list);ambiguous=[];overlap_input=0
    explicit_owners={
        frozenset({"dk-b10-06-national-part-05","dk-b09-15-national-part-02"}):"dk-b10-06-national-part-05",
    }
    for i,g in enumerate(geoms):
        for raw in tree.query(g.buffer(.25)):
            j=int(raw)
            if j<=i or named[ids[i]]["zoneId"]==named[ids[j]]["zoneId"]:continue
            h=geoms[j];shared=min(g.intersection(h.buffer(.25)).length,h.intersection(g.buffer(.25)).length)
            if shared<1:continue
            overlap_input+=1
            pair={ids[i],ids[j]}
            if pair=={"dk-b10-18-national-part-01","dk-b10-24-national-part-01"}:
                # Hammer Odde er den eksplicitte skillelinje: nordvestzonen
                # ejer vestsiden, mens nord-/Sandvigzonen ejer østsiden.
                shared_geometry=g.intersection(h.buffer(.25));tip=max((p for line in lines(shared_geometry) for p in line.coords),key=lambda p:p[1]);bounds=unary_union([g,h]).bounds
                west=shared_geometry.intersection(box(bounds[0]-10,bounds[1]-10,tip[0],bounds[3]+10));east=shared_geometry.intersection(box(tip[0],bounds[1]-10,bounds[2]+10,bounds[3]+10))
                removal["dk-b10-18-national-part-01"].append(west.buffer(.25));removal["dk-b10-24-national-part-01"].append(east.buffer(.25))
                continue
            explicit_winner=explicit_owners.get(frozenset(pair))
            if explicit_winner:
                # Den fælles linje ligger fysisk på Falsters nordkyst ved
                # Orehoved og tilhører derfor Falster nord/Orehoved-zonen,
                # ikke Bøgestrømmen vest. Den friske #31480089490-kørsel
                # valgte allerede samme ejer; reglen gør afgørelsen eksplicit.
                loser=next(pid for pid in pair if pid!=explicit_winner)
                removal[loser].append(source[explicit_winner].buffer(.25))
                continue
            winner,loser=sorted((ids[i],ids[j]),key=lambda pid:priority[pid])
            removal[loser].append(source[winner].buffer(.25))
            left,right=priority[winner],priority[loser]
            if abs(right[0]-left[0])<1 and abs(right[1]-left[1])<100:
                ambiguous.append({"winnerPartId":winner,"otherPartId":loser,"sharedLengthM":round(shared,1),"coastDistanceMarginM":round(right[0]-left[0],1),"dataPointDistanceMarginM":round(right[1]-left[1],1)})
    assigned={}
    for pid,g in source.items():
        retained=g.difference(unary_union(removal[pid])) if removal[pid] else g
        retained=unary_union([part for part in lines(retained) if part.length>=10])
        if not retained.is_empty:assigned[pid]=retained
    output=[];parts=[]
    for pid in sorted(assigned):
        geometry=assigned[pid]
        if geometry.is_empty:continue
        props={**features[pid].get("properties",{}),"partId":pid,"finalPartId":pid,"zoneId":named[pid]["zoneId"],"suggestedName":named[pid]["suggestedName"],"finalOwnerAssembly":True,"automaticActivationAllowed":False}
        output.append({"type":"Feature","properties":props,"geometry":mapping(transform(TO_W,geometry))});parts.append({"finalPartId":pid,"zoneId":named[pid]["zoneId"],"suggestedName":named[pid]["suggestedName"],"sourcePartId":named[pid]["sourcePartId"],"lengthM":round(geometry.length,1)})
    final_geoms=[transform(TO_M,shape(f["geometry"])) for f in output];final_tree=STRtree(final_geoms);overlaps=[]
    for i,g in enumerate(final_geoms):
        for raw in final_tree.query(g.buffer(.25)):
            j=int(raw)
            if j<=i:continue
            shared=min(g.intersection(final_geoms[j].buffer(.25)).length,final_geoms[j].intersection(g.buffer(.25)).length)
            if shared>=1:overlaps.append({"leftPartId":parts[i]["finalPartId"],"rightPartId":parts[j]["finalPartId"],"sharedLengthM":round(shared,1)})
    audit={"schemaVersion":"1.0.0","status":"passed-private-national-once-only-owner-assembly" if not overlaps else "failed-private-national-once-only-owner-assembly","generatedAt":datetime.now(timezone.utc).isoformat().replace("+00:00","Z"),"inputPartCount":len(features),"inputOverlapPairCount":overlap_input,"finalPartCount":len(output),"overlapPairCount":len(overlaps),"closeOwnershipDecisionCount":len(ambiguous),"overlaps":overlaps,"closeOwnershipDecisions":ambiguous[:100],"productionGeometryChanged":False,"adminDataChanged":False,"scoreChanged":False,"automaticActivationAllowed":False}
    final_names={**names,"status":"private-national-reviewed-once-only-part-names","finalPartCount":len(parts),"suggestedNameCount":len(parts),"blockedNameCount":0,"parts":parts}
    return audit,{"type":"FeatureCollection","metadata":{"status":audit["status"],"automaticActivationAllowed":False},"features":output},final_names
def self_test():
    assert len(lines(unary_union([LineString([(0,0),(2,0)]),LineString([(1,0),(3,0)])])))==3
    print("National once-only owner assembly self-test: bestået.")
def main():
    p=argparse.ArgumentParser();p.add_argument("--work",type=Path);p.add_argument("--corrections",type=Path);p.add_argument("--zones",type=Path,default=ROOT/"data/zones.geojson");p.add_argument("--output-dir",type=Path);p.add_argument("--self-test",action="store_true");a=p.parse_args()
    if a.self_test:self_test();return
    if not a.work or not a.corrections or not a.output_dir:p.error("--work, --corrections og --output-dir er påkrævet")
    audit,geo,names=build(a.work,a.corrections,load(a.zones));a.output_dir.mkdir(parents=True,exist_ok=True)
    (a.output_dir/"national-owner-final-coast-audit.json").write_text(json.dumps(audit,ensure_ascii=False,indent=2)+"\n",encoding="utf-8");(a.output_dir/"national-owner-final-coast.geojson").write_text(json.dumps(geo,ensure_ascii=False,separators=(",",":"))+"\n",encoding="utf-8");(a.output_dir/"national-owner-final-part-names.json").write_text(json.dumps(names,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
    print(json.dumps({k:audit[k] for k in ("status","inputPartCount","inputOverlapPairCount","finalPartCount","overlapPairCount","closeOwnershipDecisionCount")},ensure_ascii=False))
    if audit["status"].startswith("failed"):raise SystemExit(1)
if __name__=="__main__":main()
