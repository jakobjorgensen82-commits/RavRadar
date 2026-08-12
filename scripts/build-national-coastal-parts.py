#!/usr/bin/env python3
"""Group retained national topology into private multipart review parts without invented links."""
from __future__ import annotations
import argparse,json
from datetime import datetime,timezone
from pathlib import Path
from pyproj import Transformer
from shapely.geometry import LineString,mapping,shape
from shapely.ops import transform,unary_union
ROOT=Path(__file__).resolve().parents[1]; TO_M=Transformer.from_crs("EPSG:4326","EPSG:25832",always_xy=True); TO_W=Transformer.from_crs("EPSG:25832","EPSG:4326",always_xy=True)
EXPECTED_ZONE_COUNT=211
def fail(m):raise SystemExit(m)
def load(p):return json.loads(p.read_text(encoding="utf-8"))
def project(g):return transform(TO_M.transform,g)
def unproject(g):return transform(TO_W.transform,g)
def lines(g):
    if g.is_empty:return []
    if g.geom_type in {"LineString","LinearRing"}:return [LineString(g.coords)]
    if g.geom_type in {"MultiLineString","GeometryCollection"}:return [p for c in g.geoms for p in lines(c)]
    return []
def group_parts(parts,gap):
    groups=[]
    for part in sorted(parts,key=lambda g:g.bounds):
        hits=[i for i,group in enumerate(groups) if unary_union(group).distance(part)<=gap]
        if not hits:groups.append([part]);continue
        target=hits[0];groups[target].append(part)
        for i in reversed(hits[1:]):groups[target].extend(groups.pop(i))
    return [unary_union(group) for group in groups]
def build(topology_report,topology_geo,policy):
    report_rows={r["zoneId"]:r for r in topology_report.get("zones") or []}; geo_rows={f["properties"]["zoneId"]:f for f in topology_geo.get("features") or []}
    if len(report_rows)!=EXPECTED_ZONE_COUNT or report_rows.keys()!=geo_rows.keys():fail(f"National delgenerator kræver samme {EXPECTED_ZONE_COUNT} zoner i topologirapport og geometri.")
    zones=[];features=[]
    for zone_id in sorted(report_rows):
        source=report_rows[zone_id]; fragments=[g for g in lines(project(shape(geo_rows[zone_id]["geometry"]))) if g.length>=policy["minimumPartLengthM"]]; groups=sorted(group_parts(fragments,policy["groupingGapM"]),key=lambda g:(-g.length,g.bounds)); status="private-review-parts-generated"
        flags=[]
        if not groups:status="blocked-no-retained-source";flags.append(status)
        if source.get("riverMouthPolicyStatus")=="oversegmentation-review-required":status="blocked-river-oversegmentation";flags.append(status)
        if source.get("conflictClass")!="automatic-source-analysis":status="blocked-planned-conflict";flags.append(f"planned-conflict:{source.get('conflictClass')}")
        if len(groups)>policy["maximumPartsPerZoneBeforeFragmentationReview"]:status="blocked-fragmentation-review";flags.append(status)
        part_rows=[]
        for index,geometry in enumerate(groups,1):
            part_id=f"{zone_id.casefold()}-national-part-{index:02d}"; length_km=round(geometry.length/1000,3); fragment_count=len(lines(geometry)); locality_flags=[]
            if length_km>policy["maximumReviewPartLengthKm"]:locality_flags.append("part-too-long-for-local-weather-review")
            if fragment_count>policy["maximumFragmentsPerReviewPart"]:locality_flags.append("part-too-fragmented-for-local-weather-review")
            row={"partId":part_id,"proposedName":None,"nameStatus":"official-place-name-required","lengthKm":length_km,"fragmentCount":fragment_count,"localityReviewFlags":locality_flags,"inventedConnectionCount":0,"landPointProposed":False,"marinePointProposed":False,"weatherSamplingEnabled":False,"stateEnabled":False,"scoreEnabled":False,"automaticActivationAllowed":False};part_rows.append(row);features.append({"type":"Feature","properties":{"zoneId":zone_id,**row,"kind":"private-national-coastal-part-review"},"geometry":mapping(unproject(geometry))})
        locality_review_count=sum(1 for row in part_rows if row["localityReviewFlags"])
        if locality_review_count:
            flags.append(f"locality-review-parts:{locality_review_count}")
            if status=="private-review-parts-generated":status="blocked-locality-review"
        zones.append({"zoneId":zone_id,"currentName":source.get("currentName"),"conflictClass":source.get("conflictClass"),"proposalStatus":status,"coastalPartCount":len(part_rows),"localityReviewPartCount":locality_review_count,"coastalParts":part_rows,"qualityFlags":flags,"officialPlaceNamesRequired":True,"landWaterPointsProposed":False,"automaticActivationAllowed":False})
    report={"schemaVersion":"1.0.0","status":"private-national-read-only-coastal-parts","generatedAt":datetime.now(timezone.utc).isoformat().replace("+00:00","Z"),"zoneCount":len(zones),"coastalPartCount":sum(r["coastalPartCount"] for r in zones),"inventedConnectionCount":0,"productionGeometryChanged":False,"adminDataChanged":False,"weatherSamplingChanged":False,"stateChanged":False,"scoreChanged":False,"automaticActivationAllowed":False,"zones":zones}
    return report,{"type":"FeatureCollection","features":features}
def self_test():
    report={"zones":[{"zoneId":f"Z{i}","currentName":f"Z{i}","conflictClass":"automatic-source-analysis","riverMouthPolicyStatus":"measured-mask-applied"} for i in range(EXPECTED_ZONE_COUNT)]};geo={"features":[{"properties":{"zoneId":f"Z{i}"},"geometry":{"type":"LineString","coordinates":[[8+i*.02,56],[8.01+i*.02,56]]}} for i in range(EXPECTED_ZONE_COUNT)]};policy=load(ROOT/"data"/"geometry-v2"/"national-coastal-parts-policy.json");out,g=build(report,geo,policy);assert out["zoneCount"]==EXPECTED_ZONE_COUNT and out["coastalPartCount"]==EXPECTED_ZONE_COUNT and all(r["proposedName"] is None for z in out["zones"] for r in z["coastalParts"]);print("National coastal parts self-test: bestået.")
def main():
    p=argparse.ArgumentParser();p.add_argument("--topology-report",type=Path,default=ROOT/".geometry-v2-work"/"national-topology-audit.json");p.add_argument("--topology-geojson",type=Path,default=ROOT/".geometry-v2-work"/"national-topology-audit.geojson");p.add_argument("--policy",type=Path,default=ROOT/"data"/"geometry-v2"/"national-coastal-parts-policy.json");p.add_argument("--report",type=Path,default=ROOT/".geometry-v2-work"/"national-coastal-parts.json");p.add_argument("--geojson",type=Path,default=ROOT/".geometry-v2-work"/"national-coastal-parts.geojson");p.add_argument("--self-test",action="store_true");a=p.parse_args()
    if a.self_test:self_test();return
    report,geo=build(load(a.topology_report),load(a.topology_geojson),load(a.policy));a.report.write_text(json.dumps(report,ensure_ascii=False,indent=2)+"\n",encoding="utf-8");a.geojson.write_text(json.dumps(geo,ensure_ascii=False,separators=(",",":"))+"\n",encoding="utf-8");print(f"Nationale private kystdele: {report['coastalPartCount']} dele i {report['zoneCount']} zoner.")
if __name__=="__main__":main()
