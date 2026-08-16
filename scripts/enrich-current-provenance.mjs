import fs from 'node:fs/promises';
import { applyCurrentTransportToHistory } from './lib/current-transport-history.mjs';
import { attachVerifiedCurrentToSample } from './lib/weather-history-retention.mjs';

const CONDITIONS='data/live/conditions.json';
const BULK='data/live/dmi-bulk-cache.json';
const FORECAST='data/live/dmi-forecast-cache.json';
const CURRENT_VECTOR_SEMANTICS_VERSION=3;
const CURRENT_MAX_DISTANCE_KM=5;

// Number(null), Number('') og Number(false) er 0 i JavaScript. De værdier betyder
// "mangler" i vores JSON og må derfor aldrig blive til en fysisk nulstrøm.
const finite = value => {
  if (value === null || value === undefined || value === '' || typeof value === 'boolean') return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
};
const gridPoint=(grid,...keys)=>{const points=keys.map(key=>{const p=grid?.[key];const lon=finite(p?.longitude),lat=finite(p?.latitude);return lon!==null&&lat!==null?[lon,lat]:null;});if(!points.length||points.some(point=>!point))return null;const [lon,lat]=points[0];return points.every(point=>Math.abs(point[0]-lon)<=1e-7&&Math.abs(point[1]-lat)<=1e-7)?[lon,lat]:null;};
const samePoint=(first,second)=>Array.isArray(first)&&Array.isArray(second)&&first.length>=2&&second.length>=2&&Math.abs(Number(first[0])-Number(second[0]))<=1e-7&&Math.abs(Number(first[1])-Number(second[1]))<=1e-7;
const haversineKm=(first,second)=>{if(!Array.isArray(first)||!Array.isArray(second))return Infinity;const rad=value=>Number(value)*Math.PI/180;const dLat=rad(Number(second[1])-Number(first[1])),dLon=rad(Number(second[0])-Number(first[0])),lat1=rad(first[1]),lat2=rad(second[1]);const term=Math.sin(dLat/2)**2+Math.cos(lat1)*Math.cos(lat2)*Math.sin(dLon/2)**2;return 6371.0088*2*Math.atan2(Math.sqrt(term),Math.sqrt(1-term));};
const normalizedProvider = value => String(value || '').trim().toLowerCase();
const round=(value,digits=0)=>{const number=finite(value);return number===null?null:Number(number.toFixed(digits));};
const directionFromComponents=(u,v)=>{const east=finite(u),north=finite(v);if(east===null||north===null)return null;if(Math.hypot(east,north)<1e-12)return 0;return (Math.atan2(east,north)*180/Math.PI+360)%360;};
const isDmiCurrentRow = row => {
  const provider = normalizedProvider(row?.sources?.current?.provider);
  // Manglende source-metadata i ældre DMI-cache må kun accepteres, når rækken
  // allerede er markeret som DMI på zoneniveau. Open-Meteo må aldrig beriges.
  return !provider || provider === 'dmi';
};

function verifiedCurrentPoint(bulkDocument,bulkZone,expectedSamplingPoint,source){
  if(Number(bulkDocument?.currentVectorSemanticsVersion)!==CURRENT_VECTOR_SEMANTICS_VERSION)return null;
  if(!samePoint(bulkZone?.samplingPoint,expectedSamplingPoint))return null;
  if(normalizedProvider(source?.provider)!=='dmi')return null;
  if(Number(source?.vectorSemanticsVersion)!==CURRENT_VECTOR_SEMANTICS_VERSION||!source?.verticalLayer)return null;
  if(!samePoint(source?.samplingPoint,expectedSamplingPoint))return null;
  if(source?.vectorSelection!==bulkDocument?.currentVectorSelection)return null;
  const point=Array.isArray(source?.gridPoint)?source.gridPoint.slice(0,2).map(Number):null;
  const distance=finite(source?.distanceKm);
  const maximum=finite(bulkDocument?.currentMaxDistanceKm)??CURRENT_MAX_DISTANCE_KM;
  if(!point||point.some(value=>!Number.isFinite(value))||distance===null||distance>maximum)return null;
  if(haversineKm(expectedSamplingPoint,point)>maximum+0.01)return null;
  return {
    point,
    samplingPoint:source.samplingPoint,
    verticalLayer:source.verticalLayer,
    verticalLayerRankM:finite(source.verticalLayerRankM),
    distanceKm:distance,
    selection:source.vectorSelection,
    semanticsVersion:CURRENT_VECTOR_SEMANTICS_VERSION,
    collection:source.collection??null,
    modelRun:source.modelRun??null
  };
}

const rawRows=(hourly,bulkDocument,bulkZone,expectedSamplingPoint)=>Object.values(hourly||{}).map(row=>{
  const current=verifiedCurrentPoint(bulkDocument,bulkZone,expectedSamplingPoint,row?.sources?.current);
  return {
    row,
    timeMs:Date.parse(row?.time||''),
    u:finite(row?.['current-u']),
    v:finite(row?.['current-v']),
    current
  };
}).filter(item=>Number.isFinite(item.timeMs)&&item.u!==null&&item.v!==null&&item.current).sort((a,b)=>a.timeMs-b.timeMs);

const sameCurrentIdentity=(first,second)=>Boolean(first&&second
  && first.verticalLayer===second.verticalLayer
  && first.collection===second.collection
  && first.modelRun===second.modelRun
  && samePoint(first.point,second.point)
  && samePoint(first.samplingPoint,second.samplingPoint));

const interpolatedRaw=(rows,time)=>{
  const target=Date.parse(time||'');
  if(!Number.isFinite(target))return null;
  if(!rows.length)return null;
  const exact=rows.find(item=>item.timeMs===target);
  if(exact)return {u:exact.u,v:exact.v,current:exact.current,method:'exact',sourceTimes:[new Date(exact.timeMs).toISOString()]};
  let before=null,after=null;
  for(const item of rows){if(item.timeMs<target)before=item;else if(item.timeMs>target){after=item;break;}}
  if(before&&after){
    const gap=after.timeMs-before.timeMs;
    if(gap<=0||gap>4*3600000||!sameCurrentIdentity(before.current,after.current))return null;
    const fraction=(target-before.timeMs)/gap;
    return {
      u: before.u+(after.u-before.u)*fraction,
      v: before.v+(after.v-before.v)*fraction,
      current:before.current,
      method:'linear-interpolation',
      sourceTimes:[new Date(before.timeMs).toISOString(),new Date(after.timeMs).toISOString()]
    };
  }
  const edge=before||after;
  if(edge&&Math.abs(edge.timeMs-target)<=95*60000)return {
    u:edge.u,v:edge.v,current:edge.current,method:'nearest-edge',
    sourceTimes:[new Date(edge.timeMs).toISOString()]
  };
  return null;
};

function clearProvenance(row, reason='unverified'){
  if(!row||typeof row!=='object')return;
  delete row.currentUMps;
  delete row.currentVMps;
  row.currentProvenance={status:'unverified',reason};
}
function applyProvenance(row, raw){
  const point=raw?.current;
  if(!row||!raw||raw.u===null||raw.v===null||!point)return false;
  // Gem først den kanoniske vektor. Alle afledte felter skal beregnes fra
  // præcis de samme lagrede komponenter, som audit, scoremotor og debug senere
  // læser. Ellers kan afrunding af især meget svag strøm ændre vinklen mærkbart.
  const storedU=round(raw.u,5);
  const storedV=round(raw.v,5);
  row.currentUMps=storedU;
  row.currentVMps=storedV;
  row.currentSpeedMps=round(Math.hypot(storedU,storedV),2);
  row.currentDirectionDeg=round(directionFromComponents(storedU,storedV),0);
  row.currentProvenance={
    status:'verified',
    provider:'dmi',
    gridPoint:point.point,
    samplingPoint:point.samplingPoint,
    verticalLayer:point.verticalLayer,
    verticalLayerRankM:point.verticalLayerRankM,
    distanceKm:round(point.distanceKm,5),
    vectorSelection:point.selection,
    vectorSemanticsVersion:point.semanticsVersion,
    method:raw.method,
    sourceTimes:raw.sourceTimes
  };
  return true;
}

async function read(path){try{return JSON.parse(await fs.readFile(path,'utf8'));}catch{return null;}}
const conditions=await read(CONDITIONS);const bulk=await read(BULK);const forecast=await read(FORECAST);
if(!conditions?.zones||!bulk?.zones){console.log('Ingen conditions/bulk-cache at berige.');process.exit(0);}
let zones=0,verifiedHours=0,unverifiedHours=0;
for(const [zoneId,zone] of Object.entries(conditions.zones)){
  const bz=bulk.zones[zoneId];if(!bz)continue;
  const currentRows=rawRows(bz.hourly,bulk,bz,zone.point);
  const wind=gridPoint(bz.gridPoints,'wind-u-10m','wind-v-10m');
  const wave=gridPoint(bz.gridPoints,'significant-wave-height','mean-wave-dir');

  const currentProvider=normalizedProvider(zone?.current?.source?.provider||zone?.current?.provider);
  const rawNow=interpolatedRaw(currentRows,zone.modelSteps?.ocean||zone.current?.time||conditions.generatedAt);
  zone.flowPoints={current:rawNow?.current?.point||null,wind:wind||zone.point||null,wave:wave||zone.point||null,sources:{current:rawNow?'dmi-marine-grid':'unverified',wind:wind?'dmi-atmospheric-grid':'zone-marine-anchor',wave:wave?'dmi-wave-grid':'zone-marine-anchor'}};
  if(currentProvider && currentProvider!=='dmi') clearProvenance(zone.current,'non-dmi-current');
  else if(!applyProvenance(zone.current,rawNow)) clearProvenance(zone.current,currentRows.length?'no-time-match':'no-marine-grid-point');

  zone.samples24h=attachVerifiedCurrentToSample(Array.isArray(zone.samples24h)?zone.samples24h:[],zone.current,conditions.generatedAt);
  zone.samples72h=attachVerifiedCurrentToSample(Array.isArray(zone.samples72h)?zone.samples72h:[],zone.current,conditions.generatedAt);
  zone.history=applyCurrentTransportToHistory(zone.history||{},zone.samples24h);

  for(const row of zone.forecast?.hourly||[]){
    if(!isDmiCurrentRow(row)){clearProvenance(row,'non-dmi-current');unverifiedHours++;continue;}
    const raw=interpolatedRaw(currentRows,row.time);
    if(applyProvenance(row,raw)) verifiedHours++;
    else {clearProvenance(row,currentRows.length?'no-time-match':'no-marine-grid-point');unverifiedHours++;}
  }

  const rec=forecast?.zones?.[zoneId];
  if(rec){
    rec.model=rec.model||{};rec.model.completeness=rec.model.completeness||{};
    rec.model.completeness.gridPoints=bz.gridPoints||{};rec.model.completeness.collections=bz.collections||{};
    for(const row of rec.hourly||[]){
      if(!isDmiCurrentRow(row)){clearProvenance(row,'non-dmi-current');continue;}
      const raw=interpolatedRaw(currentRows,row.time);
      if(!applyProvenance(row,raw))clearProvenance(row,currentRows.length?'no-time-match':'no-marine-grid-point');
    }
  }
  zones++;
}
await fs.writeFile(CONDITIONS,`${JSON.stringify(conditions,null,2)}\n`);
if(forecast)await fs.writeFile(FORECAST,`${JSON.stringify(forecast,null,2)}\n`);
console.log(`Berigede ${zones} zoner: ${verifiedHours} verificerede og ${unverifiedHours} ikke-verificerbare prognosetimer.`);
