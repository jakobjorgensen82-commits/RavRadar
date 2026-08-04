import fs from 'node:fs/promises';
const url=process.env.SUPABASE_URL?.replace(/\/$/,'');
const key=process.env.SUPABASE_SERVICE_ROLE_KEY;
if(!url||!key)throw new Error('SUPABASE_URL og SUPABASE_SERVICE_ROLE_KEY kræves');
const headers={apikey:key,...(key.startsWith('sb_secret_')?{}:{Authorization:`Bearer ${key}`})};
const assets={
 'weather-health':'data/live/weather-health.json',
 'runtime-diagnostics':'data/live/ravradar-runtime-diagnostics.json',
 'dmi-water-stations':'data/live/dmi-water-stations.json',
 'water-station-routing-audit':'data/live/water-station-routing-audit.json',
 'ocean-diagnostics':'data/diagnostics/dmi-ocean-diagnostics.json',
 'cache-audit':'data/diagnostics/dmi-cache-audit.json',
 'implementation-audit':'data/diagnostics/implementation-plan-audit.json',
 'handbook':'docs/handbook/content.json'
};
const lifecycleFields=['hasEverDelivered','firstObservationAt','lastObservationAt','lastObservationValueCm','consecutiveMissingObservationRuns','deliveryStatus','forecastCacheGeneratedAt','forecastCacheValidUntil','forecastCacheStatus','overallUsabilityStatus','forecastCacheZoneIds'];
async function existingDocument(documentKey){
 const r=await fetch(`${url}/rest/v1/admin_documents?select=payload&document_key=eq.${encodeURIComponent(documentKey)}&limit=1`,{headers});
 if(!r.ok)throw new Error(`${documentKey} readback: ${r.status} ${await r.text()}`);
 return (await r.json())?.[0]?.payload??null;
}
function mergeStationDocuments(local,central){
 if(!central?.stations?.length)return local;
 const centralById=new Map(central.stations.map(st=>[String(st.stationId),st]));
 const stations=(local?.stations??[]).map(st=>{
  const old=centralById.get(String(st.stationId));
  if(!old)return st;
  const merged={...old,...st,properties:{...(old.properties??{}),...(st.properties??{})}};
  for(const field of lifecycleFields){
   const incoming=st[field];
   const missing=incoming===undefined||incoming===null||incoming==='unknown';
   if(missing&&old[field]!==undefined)merged[field]=old[field];
  }
  return merged;
 });
 for(const old of central.stations){if(!stations.some(st=>String(st.stationId)===String(old.stationId)))stations.push(old);}
 return {...central,...local,schemaVersion:Math.max(Number(local?.schemaVersion||0),Number(central?.schemaVersion||0),3),stations};
}
for(const [document_key,file] of Object.entries(assets)){
 let payload;try{payload=JSON.parse(await fs.readFile(file,'utf8'));}catch(e){if(e.code==='ENOENT'){console.warn(`Springer over ${file}`);continue;}throw e;}
 if(document_key==='dmi-water-stations')payload=mergeStationDocuments(payload,await existingDocument(document_key));
 const r=await fetch(`${url}/rest/v1/admin_documents?on_conflict=document_key`,{method:'POST',headers:{...headers,'Content-Type':'application/json',Prefer:'resolution=merge-duplicates,return=minimal'},body:JSON.stringify({document_key,payload,updated_by:null})});
 if(!r.ok)throw new Error(`${document_key}: ${r.status} ${await r.text()}`);
 console.log(`Beskyttet admin-data synkroniseret: ${document_key}`);
}
