#!/usr/bin/env python3
import json,os,pathlib,urllib.request
ROOT=pathlib.Path(__file__).resolve().parents[1]
URL=os.getenv('SUPABASE_URL','').rstrip('/'); KEY=os.getenv('SUPABASE_SERVICE_ROLE_KEY','')
MAP={'water-level-station-routing':'data/water-level-station-routing.json','direction-reviews':'data/admin/direction-reviews.json','rules':'data/admin/admin-rules.json','coastline-overrides':'data/admin/coastline-overrides.json','dmi-water-stations':'data/live/dmi-water-stations.json','water-station-routing-audit':'data/live/water-station-routing-audit.json'}
if not URL or not KEY:
 print(json.dumps({'status':'fallback','reason':'missing-supabase-secrets'})); raise SystemExit(0)
req=urllib.request.Request(URL+'/rest/v1/admin_documents?select=document_key,payload,updated_at',headers=({'apikey':KEY} if KEY.startswith('sb_secret_') else {'apikey':KEY,'Authorization':'Bearer '+KEY}))
try:
 rows=json.load(urllib.request.urlopen(req,timeout=20))
 for row in rows:
  path=MAP.get(row.get('document_key'))
  if not path: continue
  target=ROOT/pathlib.Path(path); target.parent.mkdir(parents=True,exist_ok=True); target.write_text(json.dumps(row['payload'],ensure_ascii=False,indent=2)+'\n',encoding='utf8')
 print(json.dumps({'status':'ok','documents':[r.get('document_key') for r in rows]}))
except Exception as e: print(json.dumps({'status':'fallback','error':str(e)}))
