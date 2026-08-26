import { loadActiveZoneCollection } from './zone-registry.js?v=4.0.283';
export { createForecastSnapshotReference } from './trip-evidence-contract.js?v=4.0.283';
const DEFAULT_PUBLIC_CONDITIONS_URL='./data/live/public-conditions.json';
const DEFAULT_PUBLIC_DETAILS_URL='./data/live/public-condition-details.json';
const MANIFEST_URL='./data/live/manifest.json';
const COASTAL_PARTS_URL='./data/live/coastal-parts-v2.json';
const memory=new Map();
async function fetchJson(url,{ttlMs=0,noStore=false}={}){
  const cached=memory.get(url);if(cached&&Date.now()-cached.at<ttlMs)return cached.value;
  const response=await fetch(url,{cache:noStore?'no-store':'default'});if(!response.ok)throw new Error(`${url}: HTTP ${response.status}`);
  const value=await response.json();memory.set(url,{at:Date.now(),value});return value;
}
function publicConditionsUrl(manifest){
  const path=String(manifest?.conditionsPath||DEFAULT_PUBLIC_CONDITIONS_URL).replace(/^\.\//,'./data/live/').replace('./data/live/data/live/','./data/live/');
  const base=path.startsWith('./data/')?path:`./data/live/${path.replace(/^\.\//,'')}`;
  return manifest?.datasetId?`${base}?dataset=${encodeURIComponent(manifest.datasetId)}`:base;
}
function publicDetailsUrl(manifest){
  const path=String(manifest?.conditionDetailsPath||DEFAULT_PUBLIC_DETAILS_URL).replace(/^\.\//,'./data/live/').replace('./data/live/data/live/','./data/live/');
  const base=path.startsWith('./data/')?path:`./data/live/${path.replace(/^\.\//,'')}`;
  return manifest?.datasetId?`${base}?dataset=${encodeURIComponent(manifest.datasetId)}`:base;
}
export async function loadZones(){const [zones,coastalParts]=await Promise.all([loadActiveZoneCollection(),fetchJson(COASTAL_PARTS_URL,{ttlMs:24*3600*1000}).catch(()=>null)]);return{...zones,coastalParts};}
export async function loadDataManifest(){try{return await fetchJson(MANIFEST_URL,{noStore:true});}catch(error){console.warn('Datamanifest kunne ikke hentes',error);return null;}}
export async function loadConditions({manifest=null}={}){try{
  const url=publicConditionsUrl(manifest);const data=await fetchJson(url,{ttlMs:2*60*1000,noStore:true});
  if(manifest?.datasetId&&data?.datasetId!==manifest.datasetId)throw new Error('Datasættet blev opdateret under indlæsningen. Prøv igen.');
  const generated=Date.parse(data?.generatedAt||'');if(!Number.isFinite(generated)||Date.now()-generated>8*3600000)throw new Error('Vejrdata er for gamle og vises derfor ikke.');
  return {...data,available:true};
}catch(error){console.warn('Aktuelle forhold kunne ikke indlæses',error);return {available:false,generatedAt:null,zones:{}};}}
export async function loadConditionDetails({manifest=null}={}){
  const data=await fetchJson(publicDetailsUrl(manifest),{ttlMs:2*60*1000,noStore:true});
  if(!manifest?.datasetId||data?.datasetId!==manifest.datasetId)throw new Error('Detaljedata og startdata tilhører ikke samme datasæt.');
  return data;
}
export function mergeConditionDetails(conditions,details){
  if(!conditions?.datasetId||conditions.datasetId!==details?.datasetId)throw new Error('Vejrdetaljer kan ikke blandes mellem datasæt.');
  if(conditions?.productionReferenceAt&&details?.productionReferenceAt&&Date.parse(conditions.productionReferenceAt)!==Date.parse(details.productionReferenceAt))throw new Error('Vejrdetaljer og startdata bruger ikke samme produktionstidspunkt.');
  const zones=Object.fromEntries(Object.entries(conditions.zones||{}).map(([zoneId,zone])=>[zoneId,{...zone,forecast:details.zones?.[zoneId]?.forecast||zone.forecast}]));
  return {...conditions,productionReferenceAt:details?.productionReferenceAt||conditions.productionReferenceAt||null,zones,coastalParts:details.coastalParts||conditions.coastalParts,detailsAvailable:true};
}
export function clearDataMemoryCache(){memory.clear();}
