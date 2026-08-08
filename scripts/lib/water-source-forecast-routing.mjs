import { buildDmiForecastHourly } from './dmi-forecast-store.mjs';
import { recommendWaterStationBracket } from '../../js/core/water-station-routing.js';

const finite=v=>{if(v===null||v===undefined||v==='')return null;const n=Number(v);return Number.isFinite(n)?n:null;};
const round=(v,d=2)=>Number.isFinite(v)?Number(v.toFixed(d)):null;
const sourceKey=s=>String(s?.sourceKey??s?.stationId??'');
const routeKey=e=>String(e?.sourceKey??e?.stationId??'');

function sourceRecordFromBulk(source, bulk, generatedAt){
  const zone=bulk?.zones?.[`SOURCE::${sourceKey(source)}`];
  const rows=Object.values(zone?.hourly??{}).filter(r=>Number.isFinite(Date.parse(r?.time))&&finite(r?.['sea-mean-deviation'])!==null).sort((a,b)=>Date.parse(a.time)-Date.parse(b.time));
  if(!rows.length)return null;
  const built=buildDmiForecastHourly({ocean:rows.map(r=>({step:r.time,'sea-mean-deviation':finite(r['sea-mean-deviation'])})),generatedAt,hours:118,sourceCadenceMinutes:Number(bulk?.timeStrideHours??3)*60});
  const hourly=built.hourly.filter(r=>finite(r.waterLevelCm)!==null);
  if(!hourly.length)return null;
  return {sourceKey:sourceKey(source),stationId:String(source.stationId),name:source.name,sourceType:source.sourceType,point:source.point,hourly,generatedAt:bulk.generatedAt??generatedAt,validUntil:hourly.at(-1)?.time??null,horizonHours:Math.max(0,Math.round((Date.parse(hourly.at(-1).time)-Date.parse(generatedAt))/3600000))};
}

export function buildWaterSourceForecastIndex(sources,bulk,generatedAt){
  const index=new Map();
  for(const source of sources??[]){const rec=sourceRecordFromBulk(source,bulk,generatedAt);if(rec)index.set(sourceKey(source),rec);}
  return index;
}

export function applyWaterSourceForecastStatus(sources,index,generatedAt,{minimumHours=96}={}){
  const now=Date.parse(generatedAt);
  return (sources??[]).map(source=>{
    const rec=index.get(sourceKey(source));
    const valid=rec&&Number.isFinite(Date.parse(rec.validUntil))&&Date.parse(rec.validUntil)>=now&&rec.horizonHours>=minimumHours;
    return {...source,sourceForecastGeneratedAt:rec?.generatedAt??source.sourceForecastGeneratedAt??null,sourceForecastValidUntil:rec?.validUntil??source.sourceForecastValidUntil??null,sourceForecastHours:rec?.horizonHours??0,sourceForecastStatus:valid?'receiving':'not-receiving',routingEligible:Boolean(valid),overallUsabilityStatus:valid?'forecast-series':source.overallUsabilityStatus??'unknown'};
  });
}

function resolveSource(entry,sources){
  const exact=sources.find(s=>sourceKey(s)===routeKey(entry)); if(exact)return exact;
  const raw=sources.filter(s=>String(s.stationId)===String(entry.stationId));
  if(raw.length===1)return raw[0];
  return raw.find(s=>s.sourceType==='forecast-point')??raw[0]??null;
}
function weighted(point,selected,haversineKm,method){
  const rows=selected.map((s,i)=>({...s,distanceKm:haversineKm(point,s.point),requestedWeight:finite(s.entry?.weight),role:s.entry?.role??(i?'secondary':'primary')}));
  if(rows.length===1)return rows.map(x=>({...x,weight:1}));
  if(method==='manual-weights'&&rows.every(x=>x.requestedWeight!==null&&x.requestedWeight>=0)){
    const total=rows.reduce((a,x)=>a+x.requestedWeight,0); if(total>0)return rows.map(x=>({...x,weight:x.requestedWeight/total}));
  }
  const inv=rows.map(x=>1/Math.max(.25,x.distanceKm)),total=inv.reduce((a,b)=>a+b,0)||1;
  return rows.map((x,i)=>({...x,weight:inv[i]/total}));
}
function byTime(rec){return new Map((rec?.hourly??[]).map(r=>[r.time,r]));}

export function applyWaterSourceRouting({features,output,forecastStore,sources,index,routing,haversineKm,generatedAt}){
  const byZone=new Map(features.map(f=>[f.properties?.id,f]));
  const notifications=[]; const audit={totalZones:0,adminOverride:0,automatic:0,applied:0,incomplete:0};
  for(const [zoneId,zone] of Object.entries(output.zones??{})){
    const feature=byZone.get(zoneId); if(!feature)continue; audit.totalZones++;
    const point=feature.properties?.dataPoint??zone.point; const route=routing?.zones?.[zoneId];
    let selected=[],mode='automatic',recommendation=null;
    if(route?.enabled&&Array.isArray(route.stations)&&route.stations.length){
      selected=route.stations.map(entry=>{const source=resolveSource(entry,sources);return source?{...source,entry}:null}).filter(Boolean).filter(s=>index.has(sourceKey(s)));
      if(route.requireAll!==false&&selected.length!==route.stations.length)selected=[];
      mode='admin-override'; audit.adminOverride++;
    }else{
      recommendation=recommendWaterStationBracket({zoneId,zoneName:feature.properties?.name,point,coastLine:feature.properties?.coastLine,onshoreDirectionDeg:feature.properties?.onshoreDirectionDeg,stations:sources.filter(s=>index.has(sourceKey(s))),haversineKm});
      selected=(recommendation.stations??[]).filter(s=>index.has(sourceKey(s))).map(s=>({...s,entry:{role:s.role,weight:s.weight}}));
      audit.automatic++;
    }
    if(!selected.length){audit.incomplete++;continue;}
    const rows=weighted(point,selected,haversineKm,route?.method);
    const timeMaps=rows.map(s=>byTime(index.get(sourceKey(s))));
    const routeWaterLevels=target=>{
      const routed=target.map(row=>{
        const values=rows.map((s,i)=>finite(timeMaps[i].get(row.time)?.waterLevelCm));
        if(values.some(v=>v===null))return row;
        const value=values.reduce((sum,v,i)=>sum+v*rows[i].weight,0);
        return {...row,waterLevelCm:round(value,0),waterLevelModelCm:round(value,0),waterLevelSource:'dmi-water-source-interpolation'};
      });
      for(let i=0;i<routed.length;i++){
        const future=routed[i+3];
        routed[i].waterLevelTrendCm3h=finite(routed[i].waterLevelCm)!==null&&finite(future?.waterLevelCm)!==null?round(future.waterLevelCm-routed[i].waterLevelCm,0):null;
      }
      return routed;
    };
    // Den offentlige serie kan indeholde komponentvis fallback, som ikke findes i
    // den rene DMI-cache. Rout vandstand i begge serier uden at erstatte den
    // offentlige vind-/bÃ¸lge-/strÃ¸mserie med forecastStore-versionen.
    const publicTarget=zone.forecast?.hourly??forecastStore?.zones?.[zoneId]?.hourly??[];
    const updated=routeWaterLevels(publicTarget);
    const applied=updated.filter(row=>row.waterLevelSource==='dmi-water-source-interpolation').length;
    if(!applied){audit.incomplete++;continue;} audit.applied++;
    const meta={mode,method:rows.length===1?'single-water-source':'inverse-distance-water-sources',stations:rows.map(s=>({sourceKey:sourceKey(s),stationId:String(s.stationId),name:s.name,sourceType:s.sourceType,distanceKm:round(s.distanceKm,1),weight:round(s.weight,3),role:s.role,forecastValidUntil:index.get(sourceKey(s))?.validUntil??null})),generatedAt,validUntil:rows.map(s=>index.get(sourceKey(s))?.validUntil).filter(Boolean).sort()[0]??null,completeBracket:recommendation?.completeBracket??null};
    if(forecastStore?.zones?.[zoneId]){
      forecastStore.zones[zoneId].hourly=routeWaterLevels(forecastStore.zones[zoneId].hourly??[]);
      forecastStore.zones[zoneId].waterLevelInterpolation=meta;
    }
    if(zone.forecast?.hourly)zone.forecast.hourly=updated;
    const current=updated.find(r=>Date.parse(r.time)>=Date.parse(generatedAt)-30*60000)??updated[0];
    if(current&&finite(current.waterLevelCm)!==null)zone.current.waterLevelCm=current.waterLevelCm;
    zone.waterLevel={...(zone.waterLevel??{}),source:'dmi-water-source-interpolation',reference:'DMI DKSS-prognose ved valgte vandstandskilder',interpolation:meta,diagnostic:{...(zone.waterLevel?.diagnostic??{}),waterSourceRouting:meta,displayValueCm:current?.waterLevelCm??zone.current?.waterLevelCm}};
  }
  return {audit,notifications};
}
