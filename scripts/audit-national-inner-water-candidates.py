#!/usr/bin/env python3
"""Rank final coastal parts for private open-sea/inner-water owner review."""
from __future__ import annotations
import argparse,json,re
from datetime import datetime,timezone
from pathlib import Path
from shapely.geometry import LineString,mapping,shape
from shapely.strtree import STRtree

ROOT=Path(__file__).resolve().parents[1];ROUGH_KM_PER_DEGREE=80.0
INNER_NOTE=re.compile(r"indre farvand|havn|indsejling|sø|å |ø\b|klat|zig.?zag|slet",re.I)
def load(path):return json.loads(path.read_text(encoding="utf-8"))
def line_parts(g):
    if g.is_empty:return []
    if g.geom_type in {"LineString","LinearRing"}:return [LineString(g.coords)]
    if g.geom_type in {"MultiLineString","GeometryCollection"}:return [p for c in g.geoms for p in line_parts(c)]
    return []
def final_features(coastal,partitions):
    replaced={f["properties"]["sourcePartId"] for f in partitions.get("features") or []}
    rows=[]
    for f in coastal.get("features") or []:
        if f["properties"]["partId"] not in replaced:rows.append((f["properties"]["partId"],f))
    for f in partitions.get("features") or []:rows.append((f["properties"].get("finalPartId") or f["properties"]["proposalId"],f))
    return rows
def build(coastal,partitions,names,zones,waters,harbours,owner):
    named={p["finalPartId"]:p for p in names["parts"]};zone_map={f["properties"]["id"]:f["properties"] for f in zones["features"]};decisions=(owner or {}).get("decisions") or {}
    water_rows=[(shape(f["geometry"]).simplify(0.0005,preserve_topology=True),f["properties"]) for f in waters["features"]];water_tree=STRtree([g for g,_ in water_rows]);open_geoms=[g.simplify(0.005,preserve_topology=True) for g,p in water_rows if str(p.get("subType") or "").casefold()=="hav"];open_tree=STRtree(open_geoms)
    harbour_geoms=[shape(f["geometry"]).simplify(0.0001,preserve_topology=True) for f in harbours["features"]];harbour_tree=STRtree(harbour_geoms)
    rows=[];features=[]
    for part_id,feature in final_features(coastal,partitions):
        n=named[part_id];zone=zone_map[n["zoneId"]];g=shape(feature["geometry"]);components=line_parts(g);open_index=open_tree.nearest(g) if open_geoms else None;distance_km=round(g.distance(open_geoms[int(open_index)])*ROUGH_KM_PER_DEGREE,3) if open_index is not None else None
        context=[]
        for i in water_tree.query(g.buffer(0.0032)):
            wg,wp=water_rows[int(i)]
            if wg.distance(g)<=0.0032:context.append({"officialPlaceId":wp.get("officialPlaceId"),"name":wp.get("primaryName"),"subType":wp.get("subType"),"distanceM":round(wg.distance(g)*ROUGH_KM_PER_DEGREE*1000,1)})
        closed=sum(1 for line in components if len(line.coords)>2 and LineString([line.coords[0],line.coords[-1]]).length<=0.0002)
        tiny=sum(1 for line in components if line.length*ROUGH_KM_PER_DEGREE<1);harbour_index=harbour_tree.nearest(g) if harbour_geoms else None;harbour_distance=round(g.distance(harbour_geoms[int(harbour_index)])*ROUGH_KM_PER_DEGREE*1000,1) if harbour_index is not None else None;decision=decisions.get(part_id) or {};note=str(decision.get("note") or "")
        flags=[]
        if decision.get("decision")=="needs-fix":flags.append("OWNER_NEEDS_FIX_INNER_WATER" if INNER_NOTE.search(note) else "OWNER_NEEDS_FIX_OTHER")
        if zone.get("coastType")!="limfjord" and any(str(c.get("subType") or "").casefold() in {"fjord","nor"} for c in context):flags.append("OFFICIAL_FJORD_OR_NOR_CONTEXT")
        if zone.get("coastType")!="limfjord" and distance_km is not None and distance_km>=25:flags.append("FAR_FROM_OFFICIAL_OPEN_SEA")
        if closed:flags.append("CLOSED_LOOP_OR_ISLET")
        if len(components)>1 and tiny:flags.append("SMALL_DETACHED_FRAGMENT")
        if harbour_distance is not None and harbour_distance<=80:flags.append("HARBOUR_CONTEXT")
        if re.search(r"fjord|nor|havn|sund|bredning|løb|vig|odde",str(n.get("suggestedName") or ""),re.I):flags.append("SHELTERED_WATER_NAME_CONTEXT")
        risk=100*(decision.get("decision")=="needs-fix")+35*("OFFICIAL_FJORD_OR_NOR_CONTEXT" in flags)+min(30,int((distance_km or 0)/5))+20*closed+10*tiny+8*("HARBOUR_CONTEXT" in flags)
        if flags:
            source_length=feature.get("properties",{}).get("lengthKm") or feature.get("properties",{}).get("finalLengthKm");length_km=round(float(source_length),3) if source_length is not None else round(g.length*ROUGH_KM_PER_DEGREE,3)
            row={"zoneId":n["zoneId"],"partId":part_id,"name":n["suggestedName"],"coastType":zone.get("coastType"),"lengthKm":length_km,"distanceToOfficialOpenSeaKm":distance_km,"componentCount":len(components),"closedLoopCount":closed,"smallFragmentCount":tiny,"harbourDistanceM":harbour_distance,"officialWaterContext":context,"ownerDecision":decision.get("decision"),"ownerNote":note,"flags":flags,"riskRank":risk,"reviewStatus":"owner-correction" if decision.get("decision")=="needs-fix" else "additional-inner-water-review","automaticActivationAllowed":False};rows.append(row);features.append({"type":"Feature","properties":{k:v for k,v in row.items() if k not in {"officialWaterContext","ownerNote"}},"geometry":feature["geometry"]})
    rows.sort(key=lambda r:(-r["riskRank"],r["zoneId"],r["name"]));return {"schemaVersion":"1.0.0","status":"private-national-inner-water-candidate-audit","generatedAt":datetime.now(timezone.utc).isoformat().replace("+00:00","Z"),"partCount":len(final_features(coastal,partitions)),"candidateCount":len(rows),"ownerCorrectionCount":sum(r["reviewStatus"]=="owner-correction" for r in rows),"additionalReviewCount":sum(r["reviewStatus"]=="additional-inner-water-review" for r in rows),"productionGeometryChanged":False,"adminDataChanged":False,"scoreChanged":False,"automaticActivationAllowed":False,"parts":rows},{"type":"FeatureCollection","features":features}
def self_test():
    assert INNER_NOTE.search("indre farvand skal slettes");assert not INNER_NOTE.search("ret navnet");print("National indre-farvandsaudit self-test: bestået.")
def main():
    p=argparse.ArgumentParser();w=ROOT/".geometry-v2-work";p.add_argument("--work",type=Path,default=w);p.add_argument("--zones",type=Path,default=ROOT/"data"/"zones.geojson");p.add_argument("--waters",type=Path,default=w/"national-official-waters.geojson");p.add_argument("--harbours",type=Path,default=w/"national-source"/"national-Havn.geojson");p.add_argument("--owner-review",type=Path);p.add_argument("--report",type=Path,default=w/"national-inner-water-candidate-audit.json");p.add_argument("--geojson",type=Path,default=w/"national-inner-water-candidate-audit.geojson");p.add_argument("--self-test",action="store_true");a=p.parse_args()
    if a.self_test:self_test();return
    owner=load(a.owner_review) if a.owner_review else None;report,geo=build(load(a.work/"national-coastal-parts.geojson"),load(a.work/"national-locality-partitions.geojson"),load(a.work/"national-local-part-name-suggestions.json"),load(a.zones),load(a.waters),load(a.harbours),owner);a.report.write_text(json.dumps(report,ensure_ascii=False,indent=2)+"\n",encoding="utf-8");a.geojson.write_text(json.dumps(geo,ensure_ascii=False,separators=(",",":"))+"\n",encoding="utf-8");print(json.dumps({"candidateCount":report["candidateCount"],"ownerCorrectionCount":report["ownerCorrectionCount"],"additionalReviewCount":report["additionalReviewCount"]}))
if __name__=="__main__":main()
