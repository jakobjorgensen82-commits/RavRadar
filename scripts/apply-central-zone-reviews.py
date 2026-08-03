#!/usr/bin/env python3
"""Apply centrally synced direction reviews to the authoritative zone registry.
Runs after sync-admin-config.py and before weather hydration/generation.
"""
import argparse,json
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
parser=argparse.ArgumentParser();parser.add_argument('--zones');parser.add_argument('--reviews');args=parser.parse_args()
zones_path=Path(args.zones) if args.zones else ROOT/'data/zones.geojson'
reviews_path=Path(args.reviews) if args.reviews else ROOT/'data/admin/direction-reviews.json'
if not reviews_path.exists():
 print(json.dumps({'status':'skipped','reason':'no-direction-reviews'})); raise SystemExit(0)
zones=json.loads(zones_path.read_text(encoding='utf8'))
doc=json.loads(reviews_path.read_text(encoding='utf8'))
reviews=doc.get('zones',doc if isinstance(doc,dict) else {})
out=[]; removed=[]; changed=[]
for feature in zones.get('features',[]):
 p=feature.get('properties') or {}; zid=p.get('id'); r=reviews.get(zid) or {}
 if r.get('deleted') is True or r.get('status')=='deleted':
  removed.append(zid); continue
 anchors=r.get('anchors') or []
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
print(json.dumps({'status':'ok','changed':changed,'removed':removed,'activeCount':len(out)}))
