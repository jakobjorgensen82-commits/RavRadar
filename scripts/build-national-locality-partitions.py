#!/usr/bin/env python3
"""Split locality-flagged coastal parts on source lines using official anchors and bounded safeguards."""
from __future__ import annotations
import argparse,json,math
from datetime import datetime,timezone
from pathlib import Path
from pyproj import Transformer
from shapely.geometry import LineString,MultiLineString,Point,mapping,shape
from shapely.ops import linemerge,substring,transform,unary_union
ROOT=Path(__file__).resolve().parents[1];TO_M=Transformer.from_crs("EPSG:4326","EPSG:25832",always_xy=True);TO_W=Transformer.from_crs("EPSG:25832","EPSG:4326",always_xy=True)
def fail(m):raise SystemExit(m)
def load(p):return json.loads(p.read_text(encoding="utf-8"))
def project(g):return transform(TO_M.transform,g)
def unproject(g):return transform(TO_W.transform,g)
def lines(g):
    if g.is_empty:return []
    if g.geom_type=="LineString":return [g]
    if g.geom_type in {"MultiLineString","GeometryCollection"}:return [line for part in g.geoms for line in lines(part)]
    return []
def merged_lines(g):
    source=unary_union(lines(g));merged=linemerge(source) if source.geom_type=="MultiLineString" else source;return lines(merged)
def anchors_for_line(line,candidates,policy):
    rows=[]
    for candidate in candidates:
        if candidate.get("coastalRelevance") not in policy["allowedAnchorRelevance"]:continue
        point=Point(*TO_M.transform(*candidate["visualCentre"]));distance=line.distance(point)
        if distance<=policy["maximumOfficialAnchorDistanceM"]:rows.append({"id":candidate["id"],"name":candidate["primaryName"],"nameStatus":candidate.get("nameStatus"),"subType":candidate.get("subType"),"distanceM":round(distance,1),"positionM":line.project(point)})
    rows.sort(key=lambda r:(r["distanceM"],r["name"].casefold(),r["id"]));selected=[]
    for row in rows:
        if all(abs(row["positionM"]-other["positionM"])>=policy["minimumOfficialAnchorSpacingM"] for other in selected):selected.append(row)
    return sorted(selected,key=lambda r:r["positionM"])
def split_positions(line,anchors,policy):
    positions=[0.0,line.length];anchor_boundaries=[(a["positionM"]+b["positionM"])/2 for a,b in zip(anchors,anchors[1:])];positions.extend(anchor_boundaries);positions=sorted(set(positions));out=[positions[0]];evidence=[]
    for end in positions[1:]:
        start=out[-1];distance=end-start
        if distance>policy["maximumLocalPartLengthM"]:
            count=math.ceil(distance/policy["targetSafeguardLengthM"])
            for i in range(1,count):out.append(start+distance*i/count);evidence.append("maximum-length-safeguard")
        out.append(end)
        if end in anchor_boundaries:evidence.append("official-anchor-midpoint")
    return out,sorted(set(evidence))
def group_fragments(units,policy):
    """Group nearby source fragments without adding geometry between them."""
    groups=[{"geometries":[u["geometry"]],"boundaryEvidence":set(u["boundaryEvidence"]),"officialAnchorCandidates":list(u["officialAnchorCandidates"])} for u in units]
    while True:
        best=None
        for i,left in enumerate(groups):
            left_geometry=unary_union(left["geometries"])
            for j in range(i+1,len(groups)):
                right=groups[j]
                if sum(g.length for g in left["geometries"]+right["geometries"])>policy["maximumLocalPartLengthM"]+1:continue
                distance=left_geometry.distance(unary_union(right["geometries"]))
                if distance<=policy["maximumFragmentGroupingGapM"] and (best is None or distance<best[0]):best=(distance,i,j)
        if best is None:return groups
        _,i,j=best;left,right=groups[i],groups[j]
        left["geometries"].extend(right["geometries"]);left["boundaryEvidence"].update(right["boundaryEvidence"]);left["boundaryEvidence"].add("nearby-source-fragment-group");left["officialAnchorCandidates"].extend(right["officialAnchorCandidates"]);groups.pop(j)
def build(parts_report,parts_geo,name_audit,policy):
    features={f["properties"]["partId"]:f for f in parts_geo.get("features") or []};names={r["partId"]:r for r in name_audit.get("parts") or []};flagged=[p for z in parts_report.get("zones") or [] for p in z.get("coastalParts") or [] if p.get("localityReviewFlags")]
    if parts_report.get("zoneCount")!=208 or len(features)!=parts_report.get("coastalPartCount") or len(names)!=len(features):fail("Lokalitetsopdeling kræver komplette dele og officiel navneaudit.")
    reports=[];output=[]
    for source in sorted(flagged,key=lambda p:p["partId"]):
        part_id=source["partId"];geometry=project(shape(features[part_id]["geometry"]));units=[]
        for chain_index,line in enumerate(sorted(merged_lines(geometry),key=lambda g:g.bounds),1):
            anchors=anchors_for_line(line,names[part_id].get("officialPlaceCandidates") or [],policy);positions,evidence=split_positions(line,anchors,policy)
            for start,end in zip(positions,positions[1:]):
                segment=substring(line,start,end)
                nearby=[a for a in anchors if start<=a["positionM"]<=end];units.append({"geometry":segment,"chainIndex":chain_index,"boundaryEvidence":evidence or ["physical-source-chain"],"officialAnchorCandidates":[{k:v for k,v in a.items() if k!="positionM"} for a in nearby]})
        proposals=[]
        for group in group_fragments(units,policy):
            geometry=unary_union(group["geometries"]);anchors=sorted({a["id"]:a for a in group["officialAnchorCandidates"]}.values(),key=lambda a:(a["distanceM"],a["name"].casefold(),a["id"]));proposals.append({"geometry":geometry,"boundaryEvidence":sorted(group["boundaryEvidence"]),"officialAnchorCandidates":anchors})
        proposals.sort(key=lambda p:(p["geometry"].bounds,-p["geometry"].length));rows=[]
        for index,proposal in enumerate(proposals,1):
            proposal_id=f"{part_id}-locality-{index:02d}";row={"proposalId":proposal_id,"sourcePartId":part_id,"lengthKm":round(proposal["geometry"].length/1000,3),"fragmentCount":len(lines(proposal["geometry"])),"boundaryEvidence":proposal["boundaryEvidence"],"officialAnchorCandidates":proposal["officialAnchorCandidates"],"proposedName":None,"inventedConnectionCount":0,"landPointProposed":False,"marinePointProposed":False,"weatherSamplingEnabled":False,"stateEnabled":False,"scoreEnabled":False,"automaticActivationAllowed":False};rows.append(row);output.append({"type":"Feature","properties":row,"geometry":mapping(unproject(proposal["geometry"]))})
        reports.append({"sourcePartId":part_id,"sourceLocalityReviewFlags":source["localityReviewFlags"],"proposalStatus":"private-locality-partitions-generated" if rows else "blocked-no-locality-partition","proposalCount":len(rows),"proposals":rows,"automaticActivationAllowed":False})
    report={"schemaVersion":"1.0.0","status":"private-national-read-only-locality-partitions","generatedAt":datetime.now(timezone.utc).isoformat().replace("+00:00","Z"),"sourcePartCount":len(flagged),"proposalCount":len(output),"productionGeometryChanged":False,"adminDataChanged":False,"weatherSamplingChanged":False,"stateChanged":False,"scoreChanged":False,"automaticNamingAllowed":False,"automaticActivationAllowed":False,"sourceParts":reports}
    return report,{"type":"FeatureCollection","features":output}
def self_test():
    policy=load(ROOT/"data"/"geometry-v2"/"national-locality-partition-policy.json");line=LineString([(0,0),(25000,0)]);positions,evidence=split_positions(line,[],policy);assert len(positions)==4 and "maximum-length-safeguard" in evidence;anchors=[{"positionM":5000},{"positionM":15000}];positions,evidence=split_positions(LineString([(0,0),(20000,0)]),anchors,policy);assert 10000 in positions and "official-anchor-midpoint" in evidence;print("National lokalitetsopdeling self-test: bestået.")
def main():
    p=argparse.ArgumentParser();p.add_argument("--work-dir",type=Path,default=ROOT/".geometry-v2-work");p.add_argument("--policy",type=Path,default=ROOT/"data"/"geometry-v2"/"national-locality-partition-policy.json");p.add_argument("--self-test",action="store_true");a=p.parse_args()
    if a.self_test:self_test();return
    report,geo=build(load(a.work_dir/"national-coastal-parts.json"),load(a.work_dir/"national-coastal-parts.geojson"),load(a.work_dir/"national-coastal-part-name-audit.json"),load(a.policy));(a.work_dir/"national-locality-partitions.json").write_text(json.dumps(report,ensure_ascii=False,indent=2)+"\n",encoding="utf-8");(a.work_dir/"national-locality-partitions.geojson").write_text(json.dumps(geo,ensure_ascii=False,separators=(",",":"))+"\n",encoding="utf-8");print(f"Private lokalitetsopdelinger: {report['proposalCount']} forslag fra {report['sourcePartCount']} flaggede dele.")
if __name__=="__main__":main()
