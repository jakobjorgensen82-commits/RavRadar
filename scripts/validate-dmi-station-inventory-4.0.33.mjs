import fs from 'node:fs/promises';
const endpoint='https://opendataapi.dmi.dk/v2/oceanObs/collections/station/items?limit=10000';
const response=await fetch(endpoint,{headers:{accept:'application/geo+json'}}); if(!response.ok)throw new Error(`DMI station API ${response.status}`);
const official=await response.json(); const features=official.features||[];
let local=[]; try{const x=JSON.parse(await fs.readFile('data/dmi-water-stations.json','utf8'));local=x.features||x.stations||[]}catch{}
const sid=x=>String(x?.properties?.stationId||x?.stationId||x?.id||'');
const officialIds=new Set(features.map(sid).filter(Boolean)),localIds=new Set(local.map(sid).filter(Boolean));
const missing=[...officialIds].filter(x=>!localIds.has(x)),unknown=[...localIds].filter(x=>!officialIds.has(x));
const report={generatedAt:new Date().toISOString(),endpoint,officialFeatures:features.length,officialUniqueStations:officialIds.size,localStations:localIds.size,missingFromLocal:missing,notInCurrentOfficialResponse:unknown};
await fs.mkdir('data/diagnostics',{recursive:true});await fs.writeFile('data/diagnostics/dmi-station-inventory-validation.json',JSON.stringify(report,null,2));
console.log(`DMI register: ${officialIds.size} officielle, ${localIds.size} lokale, ${missing.length} mangler lokalt.`);
if(missing.length)process.exitCode=2;
