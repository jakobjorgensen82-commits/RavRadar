import { buildDmiForecastHourly, canonicalForecastHour, DMI_FORECAST_HOURS, verifiedDmiForecastSource } from './dmi-forecast-store.mjs';
import { recommendWaterStationBracket } from '../../js/core/water-station-routing.js';
import { dmiMarineCollectionAllowedForZone } from './dmi-marine-zone-exclusions.mjs';
import { FUR_WATER_ROUTING_PART_ID, captureFurWaterRoutingDiagnostic }
  from './fur-water-routing-diagnostic.mjs';
import crypto from 'node:crypto';
import { promisify } from 'node:util';
import { gzip, gunzip } from 'node:zlib';
import { WATER_SOURCE_CONTINUITY_MAX_SOURCES } from './water-source-continuity-contract.mjs';

const gzipAsync = promisify(gzip), gunzipAsync = promisify(gunzip);
// This optional water-only bank uses independently bounded SOURCE records in
// the existing authenticated private file, not a new path,
// SOURCE-as-zone/PART alias or replacement for a native DMI original.
const SOURCE_CONTINUITY_RAW_LIMIT = 128 * 1024 * 1024;
const SOURCE_CONTINUITY_COMPRESSED_LIMIT = 16 * 1024 * 1024;
const SOURCE_RECORD_RAW_LIMIT = 2 * 1024 * 1024;
const SOURCE_RECORD_COMPRESSED_LIMIT = 512 * 1024;
const SOURCE_CONTINUITY_COUNT_LIMIT = WATER_SOURCE_CONTINUITY_MAX_SOURCES;
const SOURCE_CONTINUITY_KIND = 'PRIVATE_DMI_WATER_SOURCE_CONTINUITY';
const sourceDigest = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const exactKeys = (value, keys) => value && typeof value === 'object'
  && !Array.isArray(value)
  && Object.keys(value).sort().join(',') === [...keys].sort().join(',');
const exactHour = value => typeof value === 'string'
  && /^\d{4}-\d\d-\d\dT\d\d:00:00\.000Z$/.test(value)
  && Number.isFinite(Date.parse(value)) && new Date(value).toISOString() === value;
const validPoint = value => Array.isArray(value) && value.length === 2
  && value.every(n => typeof n === 'number' && Number.isFinite(n))
  && Math.abs(value[0]) <= 180 && Math.abs(value[1]) <= 90;
const safeSourceKey = value => typeof value === 'string' && value.length > 0
  && value.length < 256 && !['__proto__', 'prototype', 'constructor'].includes(value);

function qualifiedContinuityRecord(record, referenceAt) {
  if (!safeSourceKey(record?.sourceKey) || !validPoint(record?.point)
    || !Array.isArray(record?.hourly) || record.hourly.length < 1
    || record.hourly.length > DMI_FORECAST_HOURS) {
    throw new Error('DMI_WATER_SOURCE_CONTINUITY_RECORD_INVALID');
  }
  // DMI_FORECAST_HOURS already includes the private H118..H120 support for
  // the public 118-hour horizon; do not accidentally extend it again.
  const start = Date.parse(referenceAt), end = start + (DMI_FORECAST_HOURS - 1) * 3600000;
  const rows = [];
  let previous = -Infinity;
  // Admission must not trust an earlier WeakMap entry after a caller mutated
  // a record. A fresh identity rechecks the actual complete native proofs.
  const verified = verifiedDmiSourceRows({ ...record });
  for (const row of record.hourly) {
    const at = Date.parse(row?.time);
    if (!exactHour(row?.time) || at <= previous || !verified.has(row.time)) {
      throw new Error('DMI_WATER_SOURCE_CONTINUITY_ROW_INVALID');
    }
    previous = at;
    if (at >= start && at <= end) rows.push(row);
  }
  return { ...record, hourly: rows };
}

export async function packWaterSourceForecastContinuity(index, productionReferenceAt) {
  if (!(index instanceof Map) || index.size > SOURCE_CONTINUITY_COUNT_LIMIT
    || !exactHour(productionReferenceAt)) {
    throw new Error('DMI_WATER_SOURCE_CONTINUITY_INPUT_INVALID');
  }
  const entries = [];
  let rawBytes = 0, compressedBytes = 0;
  if ([...index.keys()].some(key => !safeSourceKey(key))) {
    throw new Error('DMI_WATER_SOURCE_CONTINUITY_IDENTITY_INVALID');
  }
  for (const [key, record] of [...index].sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0)) {
    if (key !== record?.sourceKey) throw new Error('DMI_WATER_SOURCE_CONTINUITY_IDENTITY_INVALID');
    const qualified = qualifiedContinuityRecord(record, productionReferenceAt);
    if (!qualified.hourly.length) continue;
    const raw = Buffer.from(JSON.stringify({ schemaVersion: 1, record: qualified }));
    if (raw.length > SOURCE_RECORD_RAW_LIMIT) throw new Error('DMI_WATER_SOURCE_CONTINUITY_RAW_LIMIT');
    const compressed = await gzipAsync(raw, { level: 6 });
    if (compressed.length > SOURCE_RECORD_COMPRESSED_LIMIT) {
      throw new Error('DMI_WATER_SOURCE_CONTINUITY_COMPRESSED_LIMIT');
    }
    rawBytes += raw.length; compressedBytes += compressed.length;
    if (rawBytes > SOURCE_CONTINUITY_RAW_LIMIT || compressedBytes > SOURCE_CONTINUITY_COMPRESSED_LIMIT) {
      throw new Error('DMI_WATER_SOURCE_CONTINUITY_TOTAL_LIMIT');
    }
    entries.push({ sourceKey: key, point: [...record.point], rawBytes: raw.length,
      rawSha256: sourceDigest(raw), compressedBytes: compressed.length,
      compressedSha256: sourceDigest(compressed), gzipBase64: compressed.toString('base64') });
  }
  return { schemaVersion: 1, kind: SOURCE_CONTINUITY_KIND, productionReferenceAt,
    sourceCount: entries.length, rawBytes, compressedBytes, entries };
}

export async function unpackWaterSourceForecastContinuity(pack, targetReferenceAt) {
  if (pack == null) return new Map(); // Older genuine snapshots remain readable.
  if (!exactHour(targetReferenceAt)
    || !exactKeys(pack, ['schemaVersion', 'kind', 'productionReferenceAt', 'sourceCount',
      'rawBytes', 'compressedBytes', 'entries'])
    || pack.schemaVersion !== 1 || pack.kind !== SOURCE_CONTINUITY_KIND
    || !exactHour(pack.productionReferenceAt)
    || Date.parse(pack.productionReferenceAt) > Date.parse(targetReferenceAt)
    || !Number.isSafeInteger(pack.sourceCount) || pack.sourceCount < 0
    || pack.sourceCount > SOURCE_CONTINUITY_COUNT_LIMIT
    || !Number.isSafeInteger(pack.rawBytes) || pack.rawBytes < 0
    || pack.rawBytes > SOURCE_CONTINUITY_RAW_LIMIT
    || !Number.isSafeInteger(pack.compressedBytes) || pack.compressedBytes < 0
    || pack.compressedBytes > SOURCE_CONTINUITY_COMPRESSED_LIMIT
    || !Array.isArray(pack.entries) || pack.entries.length !== pack.sourceCount) {
    throw new Error('DMI_WATER_SOURCE_CONTINUITY_MARKER_INVALID');
  }
  const result = new Map();
  let previous = null;
  let rawTotal = 0, compressedTotal = 0;
  for (const entry of pack.entries) {
    if (!exactKeys(entry, ['sourceKey', 'point', 'rawBytes', 'rawSha256',
      'compressedBytes', 'compressedSha256', 'gzipBase64'])
      || !safeSourceKey(entry.sourceKey) || (previous !== null && entry.sourceKey <= previous)
      || !validPoint(entry.point)
      || !Number.isSafeInteger(entry.rawBytes) || entry.rawBytes < 2 || entry.rawBytes > SOURCE_RECORD_RAW_LIMIT
      || !Number.isSafeInteger(entry.compressedBytes) || entry.compressedBytes < 2
      || entry.compressedBytes > SOURCE_RECORD_COMPRESSED_LIMIT
      || !/^[a-f0-9]{64}$/.test(entry.rawSha256 ?? '')
      || !/^[a-f0-9]{64}$/.test(entry.compressedSha256 ?? '')
      || typeof entry.gzipBase64 !== 'string'
      || entry.gzipBase64.length > Math.ceil(SOURCE_RECORD_COMPRESSED_LIMIT / 3) * 4) {
      throw new Error('DMI_WATER_SOURCE_CONTINUITY_ENTRY_INVALID');
    }
    rawTotal += entry.rawBytes; compressedTotal += entry.compressedBytes;
    if (rawTotal > pack.rawBytes || compressedTotal > pack.compressedBytes) {
      throw new Error('DMI_WATER_SOURCE_CONTINUITY_TOTAL_INVALID');
    }
    const compressed = Buffer.from(entry.gzipBase64, 'base64');
    if (compressed.toString('base64') !== entry.gzipBase64
      || compressed.length !== entry.compressedBytes || sourceDigest(compressed) !== entry.compressedSha256) {
      throw new Error('DMI_WATER_SOURCE_CONTINUITY_COMPRESSED_INVALID');
    }
    const raw = await gunzipAsync(compressed, { maxOutputLength: SOURCE_RECORD_RAW_LIMIT });
    if (raw.length !== entry.rawBytes || sourceDigest(raw) !== entry.rawSha256) {
      throw new Error('DMI_WATER_SOURCE_CONTINUITY_RAW_INVALID');
    }
    let document;
    try { document = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(raw)); }
    catch { throw new Error('DMI_WATER_SOURCE_CONTINUITY_JSON_INVALID'); }
    const record = document?.record;
    if (!exactKeys(document, ['schemaVersion', 'record']) || document.schemaVersion !== 1
      || record?.sourceKey !== entry.sourceKey || JSON.stringify(record?.point) !== JSON.stringify(entry.point)) {
      throw new Error('DMI_WATER_SOURCE_CONTINUITY_DOCUMENT_INVALID');
    }
    // First validate all original rows at the stored reference, then select the
    // still usable target hours. Do not freshen timestamps or native provenance.
    const original = qualifiedContinuityRecord(record, pack.productionReferenceAt);
    if (original.hourly.length !== record.hourly.length) {
      throw new Error('DMI_WATER_SOURCE_CONTINUITY_HORIZON_INVALID');
    }
    const qualified = qualifiedContinuityRecord(record, targetReferenceAt);
    previous = record.sourceKey;
    if (qualified.hourly.length) result.set(record.sourceKey, qualified);
  }
  if (rawTotal !== pack.rawBytes || compressedTotal !== pack.compressedBytes) {
    throw new Error('DMI_WATER_SOURCE_CONTINUITY_TOTAL_INVALID');
  }
  return result;
}

// Failed-run progress may add qualified water-only SOURCE holes. It cannot
// rewrite protected SOURCE hours or use a new point to authorise an old one.
// Normal fresh native banks retain their priority later in the actual router.
export async function mergeWaterSourceForecastContinuity(baseline, progress, targetReferenceAt) {
  const [base, candidate] = await Promise.all([
    unpackWaterSourceForecastContinuity(baseline, targetReferenceAt),
    unpackWaterSourceForecastContinuity(progress, targetReferenceAt),
  ]);
  let recoveredHours = 0;
  for (const [key, record] of candidate) {
    const previous = base.get(key);
    if (previous && JSON.stringify(previous.point) !== JSON.stringify(record.point)) continue;
    const hourly = new Map((previous?.hourly ?? []).map(row => [row.time, row]));
    for (const row of record.hourly) if (!hourly.has(row.time)) {
      hourly.set(row.time, row); recoveredHours++;
    }
    if (!previous || hourly.size > previous.hourly.length) base.set(key, {
      ...(previous ?? record), hourly: [...hourly.values()].sort((a, b) => Date.parse(a.time) - Date.parse(b.time)),
    });
  }
  return { pack: recoveredHours ? await packWaterSourceForecastContinuity(base, targetReferenceAt) : baseline,
    recoveredHours };
}

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

export function buildWaterSourceForecastIndex(sources,bulk,generatedAt,{
  protectedBulkCache=null,historicalBulkCache=null,retainedSourceIndex=new Map(),
}={}){
  const index=new Map();
  for(const source of sources??[]){
    // Derive and qualify each native bank independently: retaining native
    // timestamps alone can lose valid interpolated hours at a run seam.
    // The active bank keeps priority; donors only fill absent qualified hours.
    const records=[bulk,protectedBulkCache,historicalBulkCache]
      .filter(Boolean).map(bank=>sourceRecordFromBulk(source,bank,generatedAt)).filter(Boolean);
    const retained=retainedSourceIndex.get(sourceKey(source));
    if(retained && validPoint(source?.point)
      && JSON.stringify(retained.point)===JSON.stringify(source.point)){
      // A SOURCE record remains a SOURCE. Requalify at the actual current
      // central point and bounded horizon; it can only fill missing hours.
      const rec=qualifiedContinuityRecord({...retained,point:source.point},canonicalForecastHour(generatedAt));
      if(rec.hourly.length)records.push(rec);
    }
    if(!records.length)continue;
    const hourlyByTime=new Map();
    for(const record of records)for(const [time,row] of verifiedDmiSourceRows(record))
      if(!hourlyByTime.has(time))hourlyByTime.set(time,row);
    // Verification is memoised by record identity. Never append donor rows to
    // a record that has already been qualified; verify the complete fresh union.
    const rec={...records[0],hourly:[...hourlyByTime.values()].sort((a,b)=>Date.parse(a.time)-Date.parse(b.time))};
    const verified=verifiedDmiSourceRows(rec);
    rec.hourly=rec.hourly.filter(row=>verified.has(row.time));
    if(!rec.hourly.length)continue;
    rec.validUntil=rec.hourly.at(-1).time;
    rec.horizonHours=Math.max(0,Math.round((Date.parse(rec.validUntil)-Date.parse(generatedAt))/3600000));
    rec.verifiedForecastHours=rec.hourly.length;
    index.set(sourceKey(source),rec);
  }
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

function sourceRowsAllowedForZone(rows, zoneId) {
  return rows.every(row => row
    && dmiMarineCollectionAllowedForZone(row.sources?.waterLevel?.collection, zoneId, 'waterLevel'));
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

function verifiedWaterSourceTrendKnown(sourceRows, futureRows, zoneId) {
  // Retained hours are qualified independently. The exact T+3 support must
  // ALSO belong to the same SOURCE/collection/run/grid series for every
  // selected source; a valid scalar from a different series is not a trend.
  return sourceRows.length > 0 && sourceRows.length === futureRows.length
    && sourceRows.every((sourceRow, i) =>
      finite(sourceRow?.waterLevelTrendCm3h) !== null
      && finite(futureRows[i]?.waterLevelCm) !== null
      && sameVerifiedDmiSourceSeries(sourceRow, futureRows[i]))
    && sourceRowsAllowedForZone(futureRows, zoneId);
}

function routedWaterLevelSource(sourceRows,rows,method,referenceAt=null){
  const sources=sourceRows.map(row=>row?.sources?.waterLevel).filter(source=>source?.provider==='dmi'&&source.collection&&source.modelRun);
  if(sources.length!==sourceRows.length)return {provider:'dmi',fallback:false,routing:'dmi-water-source-interpolation',provenanceStatus:'incomplete'};
  const collections=[...new Set(sources.map(source=>source.collection))].sort();
  const modelRuns=[...new Set(sources.map(source=>source.modelRun))].sort();
  const resolutions=[...new Set(sources.map(source=>source.temporalResolution).filter(Boolean))].sort();
  const nativeValidTimes=[...new Set(sources.flatMap(source=>source.nativeValidTimes??[]).filter(Boolean))].sort();
  const leadTimes=[...new Set(sources.map(source=>finite(source.leadTimeHours)).filter(value=>value!==null))];
  // Retained SOURCE evidence keeps its original timestamps and metadata. Only
  // the new routed projection ages it against the actual locked generation.
  const referenceMs=Date.parse(referenceAt??'');
  const forecastAges=sources.flatMap(source=>{
    const stored=finite(source.forecastAgeHours),runMs=Date.parse(source.modelRun);
    const current=Number.isFinite(referenceMs)&&Number.isFinite(runMs)
      ?round(Math.max(0,(referenceMs-runMs)/3600000)):null;
    return [stored,current].filter(value=>value!==null);
  });
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
  previousRoutingDiagnostic = null,
  diagnosticReferenceAt = null,
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
  const sourceMaps = rows.map(source => verifiedDmiSourceRows(index.get(sourceKey(source))));
  const diagnostic = routedHourly => part.partId === FUR_WATER_ROUTING_PART_ID
    ? captureFurWaterRoutingDiagnostic({
      part, parentFeature, directHourly: hourly, routedHourly, sources, rows,
      method, routing, sourceMaps,
      verifiedRecordsByKey: new Map([...index].map(([key, record]) =>
        [key, { point: record.point, rows: verifiedDmiSourceRows(record) }])),
      collectionAllowed: (collection, parentZoneId) =>
        dmiMarineCollectionAllowedForZone(collection, parentZoneId, 'waterLevel'),
      previousDiagnostic: previousRoutingDiagnostic,
      productionReferenceAt: diagnosticReferenceAt,
    }) : null;
  if (!rows.length) return { hourly, appliedHours: 0, diagnostic: diagnostic(hourly) };
  let appliedHours = 0;
  const routedHourly = hourly.map(hour => {
    const timeMs = Date.parse(hour?.time ?? '');
    if (!Number.isFinite(timeMs)) return hour;
    const sourceRows = sourceMaps.map(map => map.get(hour?.time));
    if (!sourceRowsAllowedForZone(sourceRows, zoneId)) return hour;
    const values = sourceRows.map(sourceRow => finite(sourceRow?.waterLevelCm));
    if (values.some(value => value === null)) return hour;
    const value = round(values.reduce((sum, item, i) => sum + item * rows[i].weight, 0), 0);
    const futureTime = new Date(timeMs + 3 * 3_600_000).toISOString();
    const futureRows = sourceMaps.map(map => map.get(futureTime));
    const trendKnown = verifiedWaterSourceTrendKnown(sourceRows, futureRows, zoneId);
    const futureValue = trendKnown ? round(futureRows.reduce((sum, sourceRow, i) =>
      sum + sourceRow.waterLevelCm * rows[i].weight, 0), 0) : null;
    const provenance = {
      ...routedWaterLevelSource(sourceRows, rows, method, diagnosticReferenceAt),
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
  return { hourly: routedHourly, appliedHours, diagnostic: diagnostic(routedHourly) };
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
        if(!sourceRowsAllowedForZone(sourceRows,zoneId))return row;
        const values=sourceRows.map(sourceRow=>finite(sourceRow?.waterLevelCm));
        if(values.some(v=>v===null))return row;
        const value=values.reduce((sum,v,i)=>sum+v*rows[i].weight,0);
        const futureTime=new Date(Date.parse(row.time)+3*3600000).toISOString();
        const futureRows=timeMaps.map(map=>map.get(futureTime));
        const futureValues=futureRows.map(row=>finite(row?.waterLevelCm));
        const trendKnown=verifiedWaterSourceTrendKnown(sourceRows,futureRows,zoneId);
        const futureValue=trendKnown?futureValues.reduce((sum,v,i)=>sum+v*rows[i].weight,0):null;
        return {...row,waterLevelCm:round(value,0),waterLevelModelCm:round(value,0),
          waterLevelTrendCm3h:futureValue===null?null:round(futureValue,0)-round(value,0),
          waterLevelSource:'dmi-water-source-interpolation',sources:{...(row.sources??{}),waterLevel:routedWaterLevelSource(sourceRows,rows,method,generatedAt)}};
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
