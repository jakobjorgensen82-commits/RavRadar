import fs from 'node:fs/promises';

const CONDITIONS='data/live/conditions.json';
const BULK='data/live/dmi-bulk-cache.json';
const FORECAST='data/live/dmi-forecast-cache.json';

// Number(null), Number('') og Number(false) er 0 i JavaScript. De værdier betyder
// "mangler" i vores JSON og må derfor aldrig blive til en fysisk nulstrøm.
const finite = value => {
  if (value === null || value === undefined || value === '' || typeof value === 'boolean') return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
};
const gridPoint=(grid,...keys)=>{for(const key of keys){const p=grid?.[key];const lon=finite(p?.longitude),lat=finite(p?.latitude);if(lon!==null&&lat!==null)return[lon,lat];}return null;};
const normalizedProvider = value => String(value || '').trim().toLowerCase();
const isDmiCurrentRow = row => {
  const provider = normalizedProvider(row?.sources?.current?.provider);
  // Manglende source-metadata i ældre DMI-cache må kun accepteres, når rækken
  // allerede er markeret som DMI på zoneniveau. Open-Meteo må aldrig beriges.
  return !provider || provider === 'dmi';
};

const rawRows=(hourly)=>Object.values(hourly||{}).map(row=>({
  row,
  timeMs: Date.parse(row?.time||''),
  u: finite(row?.['current-u']),
  v: finite(row?.['current-v'])
})).filter(item=>Number.isFinite(item.timeMs)&&item.u!==null&&item.v!==null).sort((a,b)=>a.timeMs-b.timeMs);

const interpolatedRaw=(hourly,time)=>{
  const target=Date.parse(time||'');
  if(!Number.isFinite(target))return null;
  const rows=rawRows(hourly);
  if(!rows.length)return null;
  const exact=rows.find(item=>item.timeMs===target);
  if(exact)return {u:exact.u,v:exact.v,method:'exact',sourceTimes:[new Date(exact.timeMs).toISOString()]};
  let before=null,after=null;
  for(const item of rows){if(item.timeMs<target)before=item;else if(item.timeMs>target){after=item;break;}}
  if(!before||!after)return null;
  const gap=after.timeMs-before.timeMs;
  if(gap<=0||gap>4*3600000)return null;
  const fraction=(target-before.timeMs)/gap;
  return {
    u: before.u+(after.u-before.u)*fraction,
    v: before.v+(after.v-before.v)*fraction,
    method:'linear-interpolation',
    sourceTimes:[new Date(before.timeMs).toISOString(),new Date(after.timeMs).toISOString()]
  };
};

function clearProvenance(row, reason='unverified'){
  if(!row||typeof row!=='object')return;
  delete row.currentUMps;
  delete row.currentVMps;
  row.currentProvenance={status:'unverified',reason};
}
function applyProvenance(row, raw, point){
  if(!row||!raw||raw.u===null||raw.v===null||!point)return false;
  row.currentUMps=raw.u;
  row.currentVMps=raw.v;
  row.currentProvenance={
    status:'verified',
    provider:'dmi',
    gridPoint:point,
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
  const current=gridPoint(bz.gridPoints,'current-u','current-v');
  const wind=gridPoint(bz.gridPoints,'wind-u-10m','wind-v-10m');
  const wave=gridPoint(bz.gridPoints,'significant-wave-height','mean-wave-dir');
  zone.flowPoints={current:current||null,wind:wind||zone.point||null,wave:wave||zone.point||null,sources:{current:current?'dmi-marine-grid':'unverified',wind:wind?'dmi-atmospheric-grid':'zone-marine-anchor',wave:wave?'dmi-wave-grid':'zone-marine-anchor'}};

  const currentProvider=normalizedProvider(zone?.current?.source?.provider||zone?.current?.provider);
  const rawNow=interpolatedRaw(bz.hourly,zone.modelSteps?.ocean||zone.current?.time||conditions.generatedAt);
  if(currentProvider && currentProvider!=='dmi') clearProvenance(zone.current,'non-dmi-current');
  else if(!applyProvenance(zone.current,rawNow,current)) clearProvenance(zone.current,current?'no-time-match':'no-marine-grid-point');

  for(const row of zone.forecast?.hourly||[]){
    if(!isDmiCurrentRow(row)){clearProvenance(row,'non-dmi-current');unverifiedHours++;continue;}
    const raw=interpolatedRaw(bz.hourly,row.time);
    if(applyProvenance(row,raw,current)) verifiedHours++;
    else {clearProvenance(row,current?'no-time-match':'no-marine-grid-point');unverifiedHours++;}
  }

  const rec=forecast?.zones?.[zoneId];
  if(rec){
    rec.model=rec.model||{};rec.model.completeness=rec.model.completeness||{};
    rec.model.completeness.gridPoints=bz.gridPoints||{};rec.model.completeness.collections=bz.collections||{};
    for(const row of rec.hourly||[]){
      if(!isDmiCurrentRow(row)){clearProvenance(row,'non-dmi-current');continue;}
      const raw=interpolatedRaw(bz.hourly,row.time);
      if(!applyProvenance(row,raw,current))clearProvenance(row,current?'no-time-match':'no-marine-grid-point');
    }
  }
  zones++;
}
await fs.writeFile(CONDITIONS,`${JSON.stringify(conditions,null,2)}\n`);
if(forecast)await fs.writeFile(FORECAST,`${JSON.stringify(forecast,null,2)}\n`);
console.log(`Berigede ${zones} zoner: ${verifiedHours} verificerede og ${unverifiedHours} ikke-verificerbare prognosetimer.`);
