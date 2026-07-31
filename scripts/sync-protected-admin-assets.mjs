import fs from 'node:fs/promises';
const url=process.env.SUPABASE_URL?.replace(/\/$/,'');
const key=process.env.SUPABASE_SERVICE_ROLE_KEY;
if(!url||!key)throw new Error('SUPABASE_URL og SUPABASE_SERVICE_ROLE_KEY kræves');
const assets={
 'weather-health':'data/live/weather-health.json',
 'runtime-diagnostics':'data/live/ravradar-runtime-diagnostics.json',
 'dmi-water-stations':'data/live/dmi-water-stations.json',
 'water-station-routing-audit':'data/live/water-station-routing-audit.json',
 'ocean-diagnostics':'data/diagnostics/dmi-ocean-diagnostics.json',
 'cache-audit':'data/diagnostics/dmi-cache-audit.json',
 'implementation-audit':'data/diagnostics/implementation-plan-audit.json'
};
for(const [document_key,file] of Object.entries(assets)){
 let payload;try{payload=JSON.parse(await fs.readFile(file,'utf8'));}catch(e){if(e.code==='ENOENT'){console.warn(`Springer over ${file}`);continue;}throw e;}
 const r=await fetch(`${url}/rest/v1/admin_documents?on_conflict=document_key`,{method:'POST',headers:{apikey:key,Authorization:`Bearer ${key}`,'Content-Type':'application/json',Prefer:'resolution=merge-duplicates,return=minimal'},body:JSON.stringify({document_key,payload,updated_by:null})});
 if(!r.ok)throw new Error(`${document_key}: ${r.status} ${await r.text()}`);
 console.log(`Beskyttet admin-data synkroniseret: ${document_key}`);
}
