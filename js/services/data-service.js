const ZONES_URL='./data/zones.geojson';
const CONDITIONS_URL='./data/live/conditions.json';
const memory=new Map();
async function fetchJson(url,{ttlMs=0,noStore=false}={}){
  const cached=memory.get(url);if(cached&&Date.now()-cached.at<ttlMs)return cached.value;
  const response=await fetch(url,{cache:noStore?'no-store':'default'});if(!response.ok)throw new Error(`${url}: HTTP ${response.status}`);
  const value=await response.json();memory.set(url,{at:Date.now(),value});return value;
}
export async function loadZones(){const collection=await fetchJson(ZONES_URL,{ttlMs:24*3600000});return {...collection,features:(collection.features||[]).filter(feature=>feature?.properties?.zoneStatus!=='legacy')};}
export async function loadConditions(){try{const data=await fetchJson(CONDITIONS_URL,{ttlMs:2*60*1000,noStore:true});return {...data,available:true};}catch(error){console.warn('Aktuelle forhold kunne ikke indlæses',error);return {available:false,generatedAt:null,zones:{}};}}
export function clearDataMemoryCache(){memory.clear();}
