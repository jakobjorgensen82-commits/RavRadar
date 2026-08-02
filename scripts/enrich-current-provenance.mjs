import fs from 'node:fs/promises';

const CONDITIONS='data/live/conditions.json';
const BULK='data/live/dmi-bulk-cache.json';
const FORECAST='data/live/dmi-forecast-cache.json';
const finite=v=>{const n=Number(v);return Number.isFinite(n)?n:null;};
const samePoint=(a,b)=>Array.isArray(a)&&Array.isArray(b)&&Math.abs(Number(a[0])-Number(b[0]))<1e-7&&Math.abs(Number(a[1])-Number(b[1]))<1e-7;
const gridPoint=(grid,...keys)=>{for(const key of keys){const p=grid?.[key];const lon=finite(p?.longitude),lat=finite(p?.latitude);if(lon!==null&&lat!==null)return[lon,lat];}return null;};
const interpolatedRaw=(hourly,time)=>{
  const t=Date.parse(time||'');if(!Number.isFinite(t))return null;
  const rows=Object.values(hourly||{}).filter(r=>Number.isFinite(Date.parse(r?.time||''))&&finite(r?.['current-u'])!==null&&finite(r?.['current-v'])!==null).sort((a,b)=>Date.parse(a.time)-Date.parse(b.time));
  if(!rows.length)return null;
  const exact=rows.find(r=>Date.parse(r.time)===t);if(exact)return {'current-u':finite(exact['current-u']),'current-v':finite(exact['current-v'])};
  let before=null,after=null;
  for(const row of rows){const rt=Date.parse(row.time);if(rt<t)before=row;else if(rt>t){after=row;break;}}
  if(!before||!after)return null;
  const a=Date.parse(before.time),b=Date.parse(after.time);if(b-a>4*3600000)return null;
  const f=(t-a)/(b-a);
  return {'current-u':finite(before['current-u'])+(finite(after['current-u'])-finite(before['current-u']))*f,'current-v':finite(before['current-v'])+(finite(after['current-v'])-finite(before['current-v']))*f};
};

async function read(path){try{return JSON.parse(await fs.readFile(path,'utf8'));}catch{return null;}}
const conditions=await read(CONDITIONS);const bulk=await read(BULK);const forecast=await read(FORECAST);
if(!conditions?.zones||!bulk?.zones){console.log('Ingen conditions/bulk-cache at berige.');process.exit(0);}
let zones=0,hours=0;
for(const [zoneId,zone] of Object.entries(conditions.zones)){
  const bz=bulk.zones[zoneId];if(!bz)continue;
  const current=gridPoint(bz.gridPoints,'current-u','current-v');
  const wind=gridPoint(bz.gridPoints,'wind-u-10m','wind-v-10m');
  const wave=gridPoint(bz.gridPoints,'significant-wave-height','mean-wave-dir');
  zone.flowPoints={current:current||zone.point||null,wind:wind||zone.point||null,wave:wave||zone.point||null,sources:{current:current?'dmi-marine-grid':'zone-marine-anchor',wind:wind?'dmi-atmospheric-grid':'zone-marine-anchor',wave:wave?'dmi-wave-grid':'zone-marine-anchor'}};
  const rawNow=interpolatedRaw(bz.hourly,zone.modelSteps?.ocean||zone.current?.time||conditions.generatedAt);
  if(rawNow){zone.current.currentUMps=finite(rawNow['current-u']);zone.current.currentVMps=finite(rawNow['current-v']);}
  for(const row of zone.forecast?.hourly||[]){if(row?.sources?.current?.provider && row.sources.current.provider!=='dmi'){delete row.currentUMps;delete row.currentVMps;continue;}if(row?.sources?.current?.provider && row.sources.current.provider!=='dmi')continue;const raw=interpolatedRaw(bz.hourly,row.time);if(!raw)continue;row.currentUMps=finite(raw['current-u']);row.currentVMps=finite(raw['current-v']);hours++;}
  const rec=forecast?.zones?.[zoneId];
  if(rec){rec.model=rec.model||{};rec.model.completeness=rec.model.completeness||{};rec.model.completeness.gridPoints=bz.gridPoints||{};rec.model.completeness.collections=bz.collections||{};for(const row of rec.hourly||[]){const raw=interpolatedRaw(bz.hourly,row.time);if(!raw)continue;row.currentUMps=finite(raw['current-u']);row.currentVMps=finite(raw['current-v']);}}
  zones++;
}
await fs.writeFile(CONDITIONS,`${JSON.stringify(conditions,null,2)}\n`);
if(forecast)await fs.writeFile(FORECAST,`${JSON.stringify(forecast,null,2)}\n`);
console.log(`Berigede ${zones} zoner og ${hours} prognosetimer med strømproveniens.`);
