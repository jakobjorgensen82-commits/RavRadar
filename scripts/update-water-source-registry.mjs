import fs from 'node:fs/promises';

const ROOT='https://opendataapi.dmi.dk/v2/oceanObs/collections';
const OUT='data/live/dmi-water-stations.json';
const SUPPLEMENT='data/dmi-official-water-stations.json';
const USER_AGENT=process.env.WEATHER_USER_AGENT??'RavRadar water-source registry';

async function fetchAll(url, pageSize=1000, maxPages=30){
  const rows=[]; let next=url+(url.includes('?')?'&':'?')+`limit=${pageSize}`;
  for(let page=0;next&&page<maxPages;page++){
    const res=await fetch(next,{headers:{Accept:'application/geo+json, application/json','User-Agent':USER_AGENT}});
    if(!res.ok)throw new Error(`${next}: HTTP ${res.status}`);
    const doc=await res.json(); rows.push(...(doc.features??[]));
    const link=(doc.links??[]).find(x=>x.rel==='next'&&x.href); next=link?.href??null;
  }
  return rows;
}
const safeJson=async(path,fallback)=>fs.readFile(path,'utf8').then(JSON.parse).catch(()=>fallback);
const key=(type,id)=>`${type}:${String(id)}`;
const point=f=>Array.isArray(f?.geometry?.coordinates)&&f.geometry.coordinates.length>=2?f.geometry.coordinates.slice(0,2).map(Number):null;
const lifecycleFields=['hasEverDelivered','firstObservationAt','lastObservationAt','lastObservationValueCm','consecutiveMissingObservationRuns','deliveryStatus','forecastCacheGeneratedAt','forecastCacheValidUntil','forecastCacheStatus','overallUsabilityStatus','forecastCacheZoneIds','sourceForecastGeneratedAt','sourceForecastValidUntil','sourceForecastStatus','sourceForecastHours','routingEligible'];

const previous=await safeJson(OUT,{stations:[],notifications:[]});
const previousByKey=new Map((previous.stations??[]).map(s=>[String(s.sourceKey??key(s.sourceType==='forecast-point'?'tidewater':'oceanobs',s.stationId)),s]));
const supplement=await safeJson(SUPPLEMENT,{stations:[]});
const now=new Date().toISOString();
let observations=[],tidewater=[];
try{observations=await fetchAll(`${ROOT}/station/items`);}catch(error){console.warn(`OceanObs stations kunne ikke opdateres: ${error.message}`)}
try{tidewater=await fetchAll(`${ROOT}/tidewaterstations/items`);}catch(error){console.warn(`Tidewater-stationer kunne ikke opdateres: ${error.message}`)}
const merged=new Map();
function add(feature,sourceType){
 const p=feature.properties??{}; const stationId=String(p.stationId??p.id??''); const coords=point(feature);
 if(!stationId||!coords||coords.some(v=>!Number.isFinite(v)))return;
 const sourceKey=key(sourceType==='forecast-point'?'tidewater':'oceanobs',stationId);
 const old=previousByKey.get(sourceKey)??{};
 const rec={...old,sourceKey,stationId,name:p.name??old.name??`DMI ${stationId}`,point:coords,sourceType,sourceTypes:sourceType==='observation-station'?['observation','forecast']:['forecast'],properties:{...(old.properties??{}),...p},registryStatus:sourceType==='forecast-point'?'active-forecast-point':(String(p.status??'').toLowerCase()==='active'?'active':'known'),firstSeenAt:old.firstSeenAt??now,lastSeenAt:now,lastActiveSeenAt:now};
 for(const field of lifecycleFields)if(old[field]!==undefined&&rec[field]===undefined)rec[field]=old[field];
 merged.set(sourceKey,rec);
}
for(const f of observations)add(f,'observation-station');
for(const f of tidewater)add(f,'forecast-point');
// Bevar tidligere poster og officielle supplementer, men klassificér Hals-supplementer som prognosepunkter.
for(const old of previous.stations??[]){
 const sourceType=old.sourceType??(old.properties?.officialSupplement?'forecast-point':'observation-station');
 const sourceKey=old.sourceKey??key(sourceType==='forecast-point'?'tidewater':'oceanobs',old.stationId);
 if(!merged.has(sourceKey))merged.set(sourceKey,{...old,sourceKey,sourceType,sourceTypes:sourceType==='forecast-point'?['forecast']:['observation','forecast'],registryStatus:old.registryStatus??'retained-not-returned-this-run'});
}
for(const s of supplement.stations??[]){
 const sourceKey=key('tidewater',s.stationId); if(merged.has(sourceKey))continue;
 const old=previousByKey.get(sourceKey)??{};
 merged.set(sourceKey,{...old,...s,sourceKey,sourceType:'forecast-point',sourceTypes:['forecast'],registryStatus:'official-forecast-point',properties:{...(old.properties??{}),...(s.properties??{}),officialSupplement:true},firstSeenAt:old.firstSeenAt??now,lastSeenAt:old.lastSeenAt??null,lastActiveSeenAt:old.lastActiveSeenAt??null});
}
const stations=[...merged.values()].filter(s=>s.stationId&&Array.isArray(s.point)&&s.point.length===2).sort((a,b)=>a.name.localeCompare(b.name,'da'));
const summary={total:stations.length,observationStations:stations.filter(s=>s.sourceType==='observation-station').length,forecastPoints:stations.filter(s=>s.sourceType==='forecast-point').length};
await fs.mkdir('data/live',{recursive:true});
await fs.writeFile(OUT,JSON.stringify({...previous,schemaVersion:4,generatedAt:now,source:'DMI OceanObs station + tidewaterstations source registry',stations,summary},null,2)+'\n');
console.log(`Vandstandskilder opdateret: ${summary.observationStations} målestationer, ${summary.forecastPoints} prognosepunkter.`);
