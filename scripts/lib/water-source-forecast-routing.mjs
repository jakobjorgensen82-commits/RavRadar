import { buildDmiForecastHourly, canonicalForecastHour, DMI_FORECAST_HOURS, verifiedDmiForecastSource } from './dmi-forecast-store.mjs';
import { recommendWaterStationBracket } from '../../js/core/water-station-routing.js';

const finite=v=>{if(v===null||v===undefined||v==='')return null;const n=Number(v);return Number.isFinite(n)?n:null;};
const round=(v,d=2)=>Number.isFinite(v)?Number(v.toFixed(d)):null;
const sourceKey=s=>String(s?.sourceKey??s?.stationId??'');
const routeKey=e=>String(e?.sourceKey??e?.stationId??'');

function sourceRecordFromBulk(source, bulk, generatedAt){
  const zone=bulk?.zones?.[`SOURCE::${sourceKey(source)}`];
  const rows=Object.values(zone?.hourly??{}).filter(r=>Number.isFinite(Date.parse(r?.time))&&finite(r?.['sea-mean-deviation'])!==null).sort((a,b)=>Date.parse(a.time)-Date.parse(b.time));
  if(!rows.length)return null;
  const built=buildDmiForecastHourly({ocean:rows.map(r=>({
    step:r.time,
    'sea-mean-deviation':finite(r['sea-mean-deviation']),
    provenance:{waterLevel:r?.sources?.waterLevel??null}
  })),generatedAt,startAt:canonicalForecastHour(generatedAt),hours:DMI_FORECAST_HOURS,sourceCadenceMinutes:Number(bulk?.timeStrideHours??3)*60});
  const hourly=built.hourly.filter(r=>finite(r.waterLevelCm)!==null);
  if(!hourly.length)return null;
  const record={sourceKey:sourceKey(source),stationId:String(source.stationId),name:source.name,
    sourceType:source.sourceType,point:source.point,hourly,
    generatedAt:bulk.generatedAt??generatedAt};
  const verified=verifiedDmiSourceRows(record);
  record.hourly=hourly.filter(row=>verified.has(row.time));
  if(!record.hourly.length)return null;
  record.validUntil=record.hourly.at(-1).time;
  record.horizonHours=Math.max(0,Math.round((Date.parse(record.validUntil)-Date.parse(generatedAt))/3600000));
  record.verifiedForecastHours=record.hourly.length;
  return record;
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
    const valid=rec&&Number.isFinite(Date.parse(rec.validUntil))&&Date.parse(rec.validUntil)>=now
      &&rec.horizonHours>=minimumHours&&rec.verifiedForecastHours>=minimumHours;
    return {...source,sourceForecastGeneratedAt:rec?.generatedAt??source.sourceForecastGeneratedAt??null,sourceForecastValidUntil:rec?.validUntil??source.sourceForecastValidUntil??null,sourceForecastHours:rec?.horizonHours??0,sourceForecastVerifiedHours:rec?.verifiedForecastHours??0,sourceForecastStatus:valid?'receiving':'not-receiving',routingEligible:Boolean(valid),overallUsabilityStatus:valid?'forecast-series':source.overallUsabilityStatus??'unknown'};
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

const verifiedSourceRows = new WeakMap();
function verifiedDmiSourceRows(rec) {
  if (!rec || typeof rec !== 'object') return new Map();
  if (verifiedSourceRows.has(rec)) return verifiedSourceRows.get(rec);
  const entityId = `SOURCE::${rec.sourceKey}`;
  const identity = {
    entityId, parentZoneId: entityId, entityType: 'water-level-source',
    samplingContext: 'water-level-source-point', samplingPoint: rec.point,
  };
  const result = new Map();
  for (const row of rec.hourly ?? []) {
    if (finite(row?.waterLevelCm) === null || !verifiedDmiForecastSource(
      row?.sources?.waterLevel, 'waterLevel', row?.time, identity,
    )) continue;
    result.set(row.time, row);
  }
  verifiedSourceRows.set(rec, result);
  return result;
}

function selectWaterSources({ zoneId, zoneName, point, coastLine, onshoreDirectionDeg,
  sources, index, routing, haversineKm }) {
  const route = routing?.zones?.[zoneId];
  let selected = [], mode = 'automatic', recommendation = null;
  if (route?.enabled && Array.isArray(route.stations) && route.stations.length) {
    selected = route.stations.map(entry => {
      const source = resolveSource(entry, sources);
      return source ? { ...source, entry } : null;
    }).filter(Boolean).filter(source => index.has(sourceKey(source)));
    if (route.requireAll !== false && selected.length !== route.stations.length) selected = [];
    mode = 'admin-override';
  } else {
    recommendation = recommendWaterStationBracket({ zoneId, zoneName, point,
      coastLine, onshoreDirectionDeg, stations: sources.filter(source => index.has(sourceKey(source))),
      haversineKm });
    selected = (recommendation.stations ?? []).filter(source => index.has(sourceKey(source)))
      .map(source => ({ ...source, entry: { role: source.role, weight: source.weight } }));
  }
  return { rows: selected.length ? weighted(point, selected, haversineKm, route?.method) : [],
    mode, recommendation, method: route?.method };
}

function sameVerifiedDmiSourceSeries(before, after) {
  const left = before?.sources?.waterLevel;
  const right = after?.sources?.waterLevel;
  return Boolean(left && right
    && left.provider === 'dmi' && right.provider === 'dmi'
    && left.entityId === right.entityId
    && left.collection === right.collection
    && left.modelRun === right.modelRun
    && left.gridDefinitionSha256 === right.gridDefinitionSha256
    && JSON.stringify(left.gridPoint) === JSON.stringify(right.gridPoint));
}

function routedWaterLevelSource(sourceRows,rows,method){
  const sources=sourceRows.map(row=>row?.sources?.waterLevel).filter(source=>source?.provider==='dmi'&&source.collection&&source.modelRun);
  if(sources.length!==sourceRows.length)return {provider:'dmi',fallback:false,routing:'dmi-water-source-interpolation',provenanceStatus:'incomplete'};
  const collections=[...new Set(sources.map(source=>source.collection))].sort();
  const modelRuns=[...new Set(sources.map(source=>source.modelRun))].sort();
  const resolutions=[...new Set(sources.map(source=>source.temporalResolution).filter(Boolean))].sort();
  const nativeValidTimes=[...new Set(sources.flatMap(source=>source.nativeValidTimes??[]).filter(Boolean))].sort();
  const leadTimes=[...new Set(sources.map(source=>finite(source.leadTimeHours)).filter(value=>value!==null))];
  const forecastAges=[...new Set(sources.map(source=>finite(source.forecastAgeHours)).filter(value=>value!==null))];
  return {
    provider:'dmi',
    collection:collections.join('+'),
    collections,
    // The oldest participating run is the conservative comparable source
    // reference. Keep the full list separately; a joined string is not a time.
    modelRun:modelRuns[0]??null,
    modelRuns,
    leadTimeHours:leadTimes.length===1?leadTimes[0]:null,
    forecastAgeHours:forecastAges.length?Math.max(...forecastAges):null,
    temporalResolution:resolutions.length===1?resolutions[0]:'mixed',
    nativeValidTimes,
    fallback:false,
    routing:'dmi-water-source-interpolation',
    routingMethod:rows.length===1?'single-water-source':(method==='manual-weights'?'manual-weights':'inverse-distance-water-sources'),
    sourceKeys:rows.map(sourceKey)
  };
}

/**
 * Admin-selected DMI water sources are independent SOURCE entities, not
 * direct PART-grid observations. Apply them only after the strict PART adapter
 * has admitted any direct value. The routed value is score-neutral water
 * context and an equal-score waders time tie-break, never direct RavScore
 * points. Incomplete or unverified SOURCE hours retain the direct PART value.
 */
export function applyVerifiedWaterSourceRoutingToPartHourly({
  part, parentFeature, hourly, sources, index, routing, haversineKm,
} = {}) {
  if (!Array.isArray(hourly)) throw new TypeError('PART water-source routing requires hourly rows');
  const zoneId = part?.sourceZoneId ?? part?.parentZoneId ?? part?.zoneId;
  const point = part?.waterPoint;
  if (!zoneId || !Array.isArray(point) || point.length !== 2 || !parentFeature) {
    return { hourly, appliedHours: 0 };
  }
  const { rows, method } = selectWaterSources({ zoneId,
    zoneName: parentFeature.properties?.name, point,
    coastLine: parentFeature.properties?.coastLine,
    onshoreDirectionDeg: parentFeature.properties?.onshoreDirectionDeg,
    sources, index, routing, haversineKm });
  if (!rows.length) return { hourly, appliedHours: 0 };
  const sourceMaps = rows.map(source => verifiedDmiSourceRows(index.get(sourceKey(source))));
  let appliedHours = 0;
  const routedHourly = hourly.map(hour => {
    const timeMs = Date.parse(hour?.time ?? '');
    if (!Number.isFinite(timeMs)) return hour;
    const sourceRows = sourceMaps.map(map => map.get(hour?.time));
    const values = sourceRows.map(sourceRow => finite(sourceRow?.waterLevelCm));
    if (values.some(value => value === null)) return hour;
    const value = round(values.reduce((sum, item, i) => sum + item * rows[i].weight, 0), 0);
    const futureTime = new Date(timeMs + 3 * 3_600_000).toISOString();
    const futureRows = sourceMaps.map(map => map.get(futureTime));
    const trendKnown = sourceRows.every((sourceRow, i) =>
      finite(sourceRow?.waterLevelTrendCm3h) !== null
      && finite(futureRows[i]?.waterLevelCm) !== null
      && sameVerifiedDmiSourceSeries(sourceRow, futureRows[i]));
    const futureValue = trendKnown ? round(futureRows.reduce((sum, sourceRow, i) =>
      sum + sourceRow.waterLevelCm * rows[i].weight, 0), 0) : null;
    const provenance = {
      ...routedWaterLevelSource(sourceRows, rows, method),
      status: 'verified',
      sourceClass: 'verified-dmi-water-source-routing',
      targetPartId: part.partId,
      targetSamplingPoint: [...point],
    };
    appliedHours += 1;
    return {
      ...hour,
      waterLevelCm: value,
      waterLevelTrendCm3h: futureValue === null ? null : futureValue - value,
      waterLevelSource: 'dmi-water-source-interpolation',
      waterLevelProvenance: provenance,
      sources: { ...(hour.sources ?? {}), waterLevel: provenance },
    };
  });
  return { hourly: routedHourly, appliedHours };
}

export function applyWaterSourceRouting({features,output,forecastStore,sources,index,routing,haversineKm,generatedAt}){
  const byZone=new Map(features.map(f=>[f.properties?.id,f]));
  const notifications=[]; const audit={totalZones:0,adminOverride:0,automatic:0,applied:0,incomplete:0};
  for(const [zoneId,zone] of Object.entries(output.zones??{})){
    const feature=byZone.get(zoneId); if(!feature)continue; audit.totalZones++;
    const point=feature.properties?.dataPoint??zone.point;
    const {rows,mode,recommendation,method}=selectWaterSources({zoneId,
      zoneName:feature.properties?.name,point,coastLine:feature.properties?.coastLine,
      onshoreDirectionDeg:feature.properties?.onshoreDirectionDeg,sources,index,routing,haversineKm});
    if(mode==='admin-override')audit.adminOverride++;else audit.automatic++;
    if(!rows.length){audit.incomplete++;continue;}
    const timeMaps=rows.map(s=>verifiedDmiSourceRows(index.get(sourceKey(s))));
    const routeWaterLevels=target=>{
      const routed=target.map(row=>{
        const sourceRows=rows.map((s,i)=>timeMaps[i].get(row.time));
        const values=sourceRows.map(sourceRow=>finite(sourceRow?.waterLevelCm));
        if(values.some(v=>v===null))return row;
        const value=values.reduce((sum,v,i)=>sum+v*rows[i].weight,0);
        const futureTime=new Date(Date.parse(row.time)+3*3600000).toISOString();
        const futureValues=timeMaps.map(map=>finite(map.get(futureTime)?.waterLevelCm));
        // The source builder already requires comparable DMI series for T+3.
        // Use its proof plus the exact private support hour, not row position
        // or a neighbouring public row from a different retained source.
        const trendKnown=sourceRows.every(sourceRow=>finite(sourceRow?.waterLevelTrendCm3h)!==null)
          &&futureValues.every(v=>v!==null);
        const futureValue=trendKnown?futureValues.reduce((sum,v,i)=>sum+v*rows[i].weight,0):null;
        return {...row,waterLevelCm:round(value,0),waterLevelModelCm:round(value,0),
          waterLevelTrendCm3h:futureValue===null?null:round(futureValue,0)-round(value,0),
          waterLevelSource:'dmi-water-source-interpolation',sources:{...(row.sources??{}),waterLevel:routedWaterLevelSource(sourceRows,rows,method)}};
      });
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
    if(current&&finite(current.waterLevelCm)!==null){
      zone.current.waterLevelCm=current.waterLevelCm;
      zone.current.waterLevelTrendCm3h=current.waterLevelTrendCm3h;
      zone.current.waterLevelSource=current.waterLevelSource;
      zone.current.sources={...(zone.current.sources??{}),waterLevel:current.sources?.waterLevel};
    }
    const currentRouted=current?.waterLevelSource==='dmi-water-source-interpolation';
    zone.waterLevel={...(zone.waterLevel??{}),
      source:currentRouted?'dmi-water-source-interpolation':(current?.waterLevelSource??zone.waterLevel?.source??'missing'),
      reference:currentRouted?'DMI DKSS-prognose ved valgte vandstandskilder':(zone.waterLevel?.reference??null),
      interpolation:meta,diagnostic:{...(zone.waterLevel?.diagnostic??{}),waterSourceRouting:meta,displayValueCm:current?.waterLevelCm??zone.current?.waterLevelCm}};
  }
  return {audit,notifications};
}
