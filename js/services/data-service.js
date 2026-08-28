import { loadActiveZoneCollection } from './zone-registry.js?v=4.0.306';
export { createForecastSnapshotReference } from './trip-evidence-contract.js?v=4.0.306';
const DEFAULT_PUBLIC_CONDITIONS_URL='./data/live/public-conditions.json';
const DEFAULT_PUBLIC_DETAILS_URL='./data/live/public-condition-details.json';
const MANIFEST_URL='./data/live/manifest.json';
const COASTAL_PARTS_URL='./data/live/coastal-parts-v2.json';
const MAX_RECOVERY_FALLBACK_AGE_HOURS=72;
const memory=new Map();
async function fetchJson(url,{ttlMs=0,cache='default'}={}){
  const cached=memory.get(url);if(cached&&Date.now()-cached.at<ttlMs)return cached.value;
  const response=await fetch(url,{cache});if(!response.ok)throw new Error(`${url}: HTTP ${response.status}`);
  const value=await response.json();memory.set(url,{at:Date.now(),value});return value;
}
function contentAddressedUrl(base,datasetId,sha256){
  if(!datasetId)return base;
  const params=new URLSearchParams({dataset:String(datasetId)});
  if(/^[a-f0-9]{64}$/i.test(String(sha256||'')))params.set('sha',String(sha256).toLowerCase());
  return `${base}?${params}`;
}
function publicConditionsUrl(manifest){
  const path=String(manifest?.conditionsPath||DEFAULT_PUBLIC_CONDITIONS_URL).replace(/^\.\//,'./data/live/').replace('./data/live/data/live/','./data/live/');
  const base=path.startsWith('./data/')?path:`./data/live/${path.replace(/^\.\//,'')}`;
  return contentAddressedUrl(base,manifest?.datasetId,manifest?.publicConditionsSha256);
}
function publicDetailsUrl(manifest){
  const path=String(manifest?.conditionDetailsPath||DEFAULT_PUBLIC_DETAILS_URL).replace(/^\.\//,'./data/live/').replace('./data/live/data/live/','./data/live/');
  const base=path.startsWith('./data/')?path:`./data/live/${path.replace(/^\.\//,'')}`;
  return contentAddressedUrl(base,manifest?.datasetId,manifest?.publicConditionDetailsSha256);
}
function recoveryFallbackUrl(manifest,key){
  const relative=String(manifest?.recoveryFallback?.[key]||'').replace(/^\.\//,'');
  if(!relative)return null;
  const base=relative.startsWith('data/')?`./${relative}`:`./data/live/${relative}`;
  const datasetId=manifest?.recoveryFallback?.datasetId;
  const hashKey=key==='conditionsPath'?'publicConditionsSha256':'publicConditionDetailsSha256';
  return contentAddressedUrl(base,datasetId,manifest?.recoveryFallback?.[hashKey]);
}
function contentAddressedCache(url){return /[?&]dataset=[^&]+/.test(url)&&/[?&]sha=[a-f0-9]{64}(?:&|$)/i.test(url)?'force-cache':'no-store';}
function recoveryFallbackAgeLimit(manifest){
  const configured=Number(manifest?.recoveryFallback?.maximumAgeHours);
  return Number.isFinite(configured)&&configured>0
    ?Math.min(configured,MAX_RECOVERY_FALLBACK_AGE_HOURS)
    :MAX_RECOVERY_FALLBACK_AGE_HOURS;
}
export async function loadZones(){const [zones,coastalParts]=await Promise.all([loadActiveZoneCollection(),fetchJson(COASTAL_PARTS_URL,{ttlMs:24*3600*1000}).catch(()=>null)]);return{...zones,coastalParts};}
export async function loadDataManifest(){try{return await fetchJson(MANIFEST_URL,{cache:'no-store'});}catch(error){console.warn('Datamanifest kunne ikke hentes',error);return null;}}
export async function loadConditions({manifest=null}={}){try{
  const recovery=manifest?.recoveryFallback;
  if(recovery?.status==='active-last-verified'){
    try{
      const fallbackUrl=recoveryFallbackUrl(manifest,'conditionsPath');
      if(!fallbackUrl)throw new Error('Nødvisningen mangler startdatasti.');
      const fallback=await fetchJson(fallbackUrl,{ttlMs:2*60*1000,cache:contentAddressedCache(fallbackUrl)});
      if(!recovery.datasetId||fallback?.datasetId!==recovery.datasetId)throw new Error('Nødvisningens datasæt-id matcher ikke manifestet.');
      if(!recovery.generatedAt||fallback?.generatedAt!==recovery.generatedAt)throw new Error('Nødvisningens tidspunkt matcher ikke manifestet.');
      const generated=Date.parse(fallback?.generatedAt||'');
      const ageHours=(Date.now()-generated)/3600000;
      if(!Number.isFinite(generated)||ageHours<0||ageHours>recoveryFallbackAgeLimit(manifest))throw new Error('Nødvisningen er udløbet.');
      const validUntil=Date.parse(recovery?.validUntil||'');
      if(!Number.isFinite(validUntil)||Date.now()>validUntil)throw new Error('Nødvisningens prognosehorisont er udløbet.');
      return {...fallback,available:true,recoveryFallbackActive:true,recoveryFallback:{...recovery,ageHours},latestDatasetId:manifest?.datasetId||null,latestGeneratedAt:manifest?.generatedAt||null};
    }catch(error){console.warn('Senest verificerede Candidate G-nødvisning kunne ikke bruges',error);}
  }
  const url=publicConditionsUrl(manifest);const data=await fetchJson(url,{ttlMs:2*60*1000,cache:contentAddressedCache(url)});
  if(manifest?.datasetId&&data?.datasetId!==manifest.datasetId)throw new Error('Datasættet blev opdateret under indlæsningen. Prøv igen.');
  const generated=Date.parse(data?.generatedAt||'');if(!Number.isFinite(generated)||Date.now()-generated>8*3600000)throw new Error('Vejrdata er for gamle og vises derfor ikke.');
  return {...data,available:true};
}catch(error){console.warn('Aktuelle forhold kunne ikke indlæses',error);return {available:false,generatedAt:null,zones:{}};}}
export async function loadConditionDetails({manifest=null,conditions=null}={}){
  const fallbackActive=conditions?.recoveryFallbackActive===true;
  const url=fallbackActive?recoveryFallbackUrl(manifest,'conditionDetailsPath'):publicDetailsUrl(manifest);
  if(!url)throw new Error('Detaljedata mangler en gyldig sti.');
  const data=await fetchJson(url,{ttlMs:2*60*1000,cache:contentAddressedCache(url)});
  const expectedDatasetId=fallbackActive?conditions?.datasetId:manifest?.datasetId;
  if(!expectedDatasetId||data?.datasetId!==expectedDatasetId)throw new Error('Detaljedata og startdata tilhører ikke samme datasæt.');
  return data;
}
export function mergeConditionDetails(conditions,details){
  if(!conditions?.datasetId||conditions.datasetId!==details?.datasetId)throw new Error('Vejrdetaljer kan ikke blandes mellem datasæt.');
  if(conditions?.productionReferenceAt&&details?.productionReferenceAt&&Date.parse(conditions.productionReferenceAt)!==Date.parse(details.productionReferenceAt))throw new Error('Vejrdetaljer og startdata bruger ikke samme produktionstidspunkt.');
  const zones=Object.fromEntries(Object.entries(conditions.zones||{}).map(([zoneId,zone])=>[zoneId,{...zone,forecast:details.zones?.[zoneId]?.forecast||zone.forecast}]));
  return {...conditions,productionReferenceAt:details?.productionReferenceAt||conditions.productionReferenceAt||null,zones,coastalParts:details.coastalParts||conditions.coastalParts,detailsAvailable:true};
}
export function clearDataMemoryCache(){memory.clear();}
