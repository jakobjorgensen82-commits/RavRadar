#!/usr/bin/env python3
"""Conservatively refine audited RavRadar zone lines against generated natural coast.

The 4.0.44 audited line remains the route authority. The 4.0.47 coastline is only
used as a nearby geometric target. A zone is accepted only when nearest-point
projections stay local, ordered, and length-compatible; otherwise 4.0.44 is kept.
"""
from __future__ import annotations
import json, math, statistics
from pathlib import Path
from shapely.geometry import LineString, Point
from shapely.ops import transform
from pyproj import Transformer

ROOT=Path(__file__).resolve().parents[1]
GUIDE=ROOT/'data/geometry-snapshots/zones-4.0.44.geojson'
TARGET=ROOT/'data/geometry-snapshots/zones-4.0.47-generated.geojson'
ACTIVE=ROOT/'data/zones.geojson'
SNAPSHOT=ROOT/'data/geometry-snapshots/zones-4.0.48.geojson'
AUDIT=ROOT/'data/diagnostics/constrained-coastline-4.0.48.json'
VERSION='4.0.48'
RETIRED_ZONE_IDS={'DK-B04-09'}
MANUAL_COASTLINE_OVERRIDES={'DK-B04-08': [[8.468,55.198],[8.463,55.178],[8.458,55.155],[8.454,55.132],[8.451,55.109],[8.451,55.086],[8.454,55.062],[8.458,55.040],[8.464,55.020]]}
TO_M=Transformer.from_crs('EPSG:4326','EPSG:25832',always_xy=True)
TO_LL=Transformer.from_crs('EPSG:25832','EPSG:4326',always_xy=True)
STEP_M=70.0
MAX_AVG_M=320.0
MAX_P95_M=480.0
MAX_M=750.0
MAX_BACKTRACK_SHARE=0.03
MIN_LENGTH_RATIO=0.65
MAX_LENGTH_RATIO=1.55

def line_from_feature(f):
    coords=f.get('properties',{}).get('coastLine') or []
    return LineString(coords)

def densified_points(line, step=STEP_M):
    n=max(2, math.ceil(line.length/step)+1)
    return [line.interpolate(line.length*i/(n-1)) for i in range(n)]

def percentile(vals,p):
    s=sorted(vals)
    if not s:return 0
    i=(len(s)-1)*p
    lo=math.floor(i); hi=math.ceil(i)
    return s[lo] if lo==hi else s[lo]*(hi-i)+s[hi]*(i-lo)

def build(guide_ll,target_ll):
    g=transform(TO_M.transform,guide_ll); t=transform(TO_M.transform,target_ll)
    if g.length<50 or t.length<50:return None,{'reason':'too-short'}
    pts=densified_points(g)
    # Try both orientations and retain the most monotonic projection sequence.
    options=[]
    for cand in (t,LineString(list(t.coords)[::-1])):
        ds=[cand.project(p) for p in pts]
        back=sum(1 for a,b in zip(ds,ds[1:]) if b+15<a)
        options.append((back,ds,cand))
    back,ds,cand=min(options,key=lambda x:x[0])
    distances=[p.distance(cand) for p in pts]
    avg=statistics.fmean(distances); p95=percentile(distances,.95); mx=max(distances)
    backshare=back/max(1,len(ds)-1)
    if avg>MAX_AVG_M or p95>MAX_P95_M or mx>MAX_M or backshare>MAX_BACKTRACK_SHARE:
        return None,{'reason':'distance-or-order','averageDistanceM':round(avg,1),'p95DistanceM':round(p95,1),'maximumDistanceM':round(mx,1),'backtrackShare':round(backshare,4)}
    # Ordered nearest points. Clamp tiny numerical backtracking to preserve topology.
    ordered=[]; last=0.0
    for d in ds:
        d=max(last,d); last=d
        ordered.append(cand.interpolate(d).coords[0])
    # Remove consecutive duplicates and simplify only minimally.
    clean=[]
    for xy in ordered:
        if not clean or Point(clean[-1]).distance(Point(xy))>2.0: clean.append(xy)
    if len(clean)<2:return None,{'reason':'collapsed'}
    out=LineString(clean).simplify(4.0,preserve_topology=False)
    ratio=out.length/max(g.length,1)
    if not MIN_LENGTH_RATIO<=ratio<=MAX_LENGTH_RATIO:
        return None,{'reason':'length-ratio','lengthRatio':round(ratio,3),'averageDistanceM':round(avg,1),'p95DistanceM':round(p95,1),'maximumDistanceM':round(mx,1)}
    return transform(TO_LL.transform,out),{'averageDistanceM':round(avg,1),'p95DistanceM':round(p95,1),'maximumDistanceM':round(mx,1),'backtrackShare':round(backshare,4),'lengthRatio':round(ratio,3),'points':len(out.coords)}

def main():
    # Bevar den aktuelle RavRadar-releaseversion. GUIDE er et historisk geometrisnapshot
    # og må ikke nedgradere topniveauets app-version, når ACTIVE regenereres.
    active_release_version = None
    active_document = None
    if ACTIVE.exists():
        try:
            active_document = json.loads(ACTIVE.read_text('utf-8'))
            active_release_version = active_document.get('version')
        except (json.JSONDecodeError, OSError):
            active_release_version = None
    guide=json.loads(GUIDE.read_text('utf-8')); target=json.loads(TARGET.read_text('utf-8'))
    guide['features']=[f for f in guide['features'] if f.get('properties',{}).get('id') not in RETIRED_ZONE_IDS]
    guide_ids={f.get('properties',{}).get('id') for f in guide['features']}
    owner_approved_additions={'DK-B04-12','DK-B04-13','DK-B04-14'}
    for feature in (active_document or {}).get('features',[]):
        zid=feature.get('properties',{}).get('id')
        if zid in owner_approved_additions and zid not in guide_ids:
            guide['features'].append(feature)
            guide_ids.add(zid)
    if active_release_version:
        guide['version'] = active_release_version
    tm={f['properties']['id']:f for f in target['features']}
    report=[]; accepted=0
    for f in guide['features']:
        p=f['properties']; zid=p['id']; tf=tm.get(zid)
        if zid in owner_approved_additions:
            report.append({'zoneId':zid,'name':p.get('name'),'status':'owner-approved-precise-public-coast'})
            accepted+=1
            continue
        if zid in MANUAL_COASTLINE_OVERRIDES:
            p['coastLine']=MANUAL_COASTLINE_OVERRIDES[zid]
            p['name']='Rømø vest og Kongsmark'; p['region']='Rømø vest · hele vestkysten'
            p['dataPoint']=[8.37,55.11]; p['pinPoint']=[8.47,55.11]
            p['coastLineSource']='RavRadar controlled Rømø west shoreline; manually corrected 4.0.64'
            p['coastLineVersion']='4.0.64-manual-roemoe'; p['coastLineRefinementMode']='manual-authoritative-override'
            f['geometry']={'type':'Polygon','coordinates':[[[8.34,55.015],[8.54,55.015],[8.54,55.205],[8.34,55.205],[8.34,55.015]]]}
            report.append({'zoneId':zid,'name':p.get('name'),'status':'manual-override'}); accepted+=1; continue
        new=None; metrics={'reason':'missing-target'}
        if tf:
            new,metrics=build(line_from_feature(f),line_from_feature(tf))
        if new is not None:
            p['coastLine']=[[round(x,7),round(y,7)] for x,y in new.coords]
            p['coastLineVersion']=VERSION
            p['coastLineRefinementMode']='constrained-nearest-natural-coast'
            p['coastLineRollbackVersion']='4.0.44'
            accepted+=1; status='refined'
        else:
            p['coastLineVersion']='4.0.48-safe-fallback'
            p['coastLineRefinementMode']='audited-existing-fallback'
            p['coastLineRollbackVersion']='4.0.44'
            status='fallback'
        report.append({'zoneId':zid,'name':p.get('name'),'status':status,**metrics})
    guide['metadata']={'version':VERSION,'method':'constrained nearest-point refinement','rollback':'data/geometry-snapshots/zones-4.0.44.geojson','refinedZones':accepted,'fallbackZones':len(report)-accepted}
    text=json.dumps(guide,ensure_ascii=False,separators=(',',':'))
    ACTIVE.write_text(text,'utf-8'); SNAPSHOT.write_text(text,'utf-8')
    AUDIT.write_text(json.dumps({'version':VERSION,'refinedZones':accepted,'fallbackZones':len(report)-accepted,'thresholds':{'maxAverageM':MAX_AVG_M,'maxP95M':MAX_P95_M,'maxM':MAX_M,'maxBacktrackShare':MAX_BACKTRACK_SHARE,'lengthRatio':[MIN_LENGTH_RATIO,MAX_LENGTH_RATIO]},'zones':report},ensure_ascii=False,indent=2),'utf-8')
    print(f'4.0.48: refined {accepted}, safe fallback {len(report)-accepted}')

if __name__=='__main__':main()
