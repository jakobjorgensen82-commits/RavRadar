#!/usr/bin/env python3
"""Apply centrally synced direction reviews to the authoritative zone registry.
Runs after sync-admin-config.py and before weather hydration/generation.
"""
import argparse,json
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
parser=argparse.ArgumentParser();parser.add_argument('--zones');parser.add_argument('--reviews');parser.add_argument('--coastlines');args=parser.parse_args()
zones_path=Path(args.zones) if args.zones else ROOT/'data/zones.geojson'
reviews_path=Path(args.reviews) if args.reviews else ROOT/'data/admin/direction-reviews.json'
coastlines_path=Path(args.coastlines) if args.coastlines else ROOT/'data/admin/coastline-overrides.json'
zones=json.loads(zones_path.read_text(encoding='utf8'))
reviews={}
if reviews_path.exists():
 doc=json.loads(reviews_path.read_text(encoding='utf8')); reviews=doc.get('zones',doc if isinstance(doc,dict) else {})
coastline_overrides={}
if coastlines_path.exists():
 coast_doc=json.loads(coastlines_path.read_text(encoding='utf8')); coastline_overrides=coast_doc.get('overrides',{})
out=[]; removed=[]; changed=[]
for feature in zones.get('features',[]):
 p=feature.get('properties') or {}; zid=p.get('id'); r=reviews.get(zid) or {}; c=coastline_overrides.get(zid) or {}
 if c.get('published') is True:
  new_name=str(c.get('zoneName') or '').strip()
  if new_name: p['name']=new_name; p['nameEditedAt']=c.get('updatedAt'); p['nameSource']='admin-coastline-editor'
  line=c.get('coastLine')
  if isinstance(line,list) and len(line)>=2:
   valid=[]
   for point in line:
    if isinstance(point,list) and len(point)>=2:
     try:
      lon=float(point[0]); lat=float(point[1])
      if 7<=lon<=16 and 54<=lat<=58.5: valid.append([lon,lat])
     except (TypeError,ValueError): pass
   if len(valid)>=2:
    p['coastLine']=valid; p['coastLineSource']='admin-manual-editor'; p['coastLineEditedAt']=c.get('updatedAt'); p['coastLineEditNote']=c.get('note',''); changed.append(zid)
 if r.get('deleted') is True or r.get('status')=='deleted':
  removed.append(zid); continue
 # Kun eksplicit godkendte retningsreviews må ændre den autoritative zonefil.
 # Kladder og poster under vurdering må aldrig påvirke produktionens score.
 anchors=(r.get('anchors') or []) if r.get('status')=='verified' else []
 if anchors:
  normalized=[]
  for a in anchors:
   if not isinstance(a,dict): continue
   x=dict(a); x['onshoreDirectionDeg']=round(float(x.get('onshoreDirectionDeg',0)))%360
   normalized.append(x)
  if normalized:
   p['directionAnchors']=normalized; primary=normalized[0]
   p['dataPoint']=primary.get('dataPoint'); p['pinPoint']=primary.get('pinPoint'); p['onshoreDirectionDeg']=primary['onshoreDirectionDeg']
   p['onshoreDirectionSource']='central admin geographic review'
   p['onshoreDirectionAuditedAt']=r.get('verifiedAt') or r.get('updatedAt')
   p['onshoreDirectionReviewStatus']='manually-verified' if r.get('status')=='verified' else 'manual-review-needed'
   if r.get('note'): p['onshoreDirectionReviewNote']=r['note']
   changed.append(zid)
 out.append(feature)
zones['features']=out
zones_path.write_text(json.dumps(zones,ensure_ascii=False,indent=2)+'\n',encoding='utf8')
print(json.dumps({'status':'ok','changed':sorted(set(changed)),'removed':removed,'activeCount':len(out)}))
