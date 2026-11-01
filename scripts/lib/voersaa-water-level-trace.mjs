// Fixed private DATA observation. No origin/state/SQL/publication capability.
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import {inspectDmiForecastFile,readDmiForecastRecord,readDmiWaterSourceContinuity} from './dmi-forecast-file.mjs';
import {unpackWaterSourceForecastContinuity} from './water-source-forecast-routing.mjs';
import {readDmiBulkDocument} from './dmi-bulk-storage.mjs';
import {safeWeatherComponentSummary} from './weather-component-safe-summary.mjs';

const freeze=value=>{if(value&&typeof value==='object'){for(const v of Object.values(value))freeze(v);Object.freeze(value);}return value;};
export const VOERSAA_WATER_TRACE_TARGETS=freeze([
  {key:'original4145',readerDirectory:'4145',runId:'41231144384',runAttempt:'1',
    sourceHead:'7a08f6a8dfb2131898e7270a2429c3f4f810a842',datasetId:'rr-20261031205823-210',productionReferenceAt:'2026-10-31T18:00:00.000Z'},
  {key:'original232',readerDirectory:'232',runId:'41256251412',runAttempt:'1',
    sourceHead:'37a34703d9ae8bfb2c28056f21a7ea73944033ae',datasetId:'rr-20261101021101-210',productionReferenceAt:'2026-11-01T00:00:00.000Z'},
]);
export const VOERSAA_WATER_TRACE_CONTRACTS=freeze({
  continuationStateContractSha256:'a6c0408f76b5de70a90959e254df78317f8282cb93c0edc85a71d36b9ef8dafa',
  fullRuntimeContractSha256:'ede0b53b8ed0f3fa5d0e505ea7c07d98969dc7a38fe94ae034a85f9c5d5af7ff',
  publicProjectionContractSha256:'24e95d442450769ff233e42aa4b100842c353c8d28735defbbfef5d5457c99ec',
});
export const VOERSAA_WATER_TRACE_ZONE='DK-B02-06';
const scope='VOERSAA_WATER_LEVEL_20261101_FIXED_ORIGINALS';
const observations=['2026-10-31T23:00:00.000Z','2026-11-01T00:00:00.000Z','2026-11-01T01:00:00.000Z','2026-11-01T02:00:00.000Z'];
const support=observations.map(time=>new Date(Date.parse(time)+3*3600000).toISOString());
export const VOERSAA_WATER_TRACE_TIMES=freeze([...new Set([...observations,...support])].sort());
const number=value=>typeof value==='number'&&Number.isFinite(value)?value:null;
const cm=value=>{const v=number(value);assert(v===null||Math.abs(v)<=10000,'WATER_TRACE_CM_BOUND');return v;};
const waterCollections=new Set(['dkss_idw','dkss_nsbs','dkss_lf']);
const minimumTime=Date.parse(VOERSAA_WATER_TRACE_TARGETS[0].productionReferenceAt)-121*3600000;
const maximumTime=Date.parse(VOERSAA_WATER_TRACE_TARGETS[1].productionReferenceAt)+120*3600000;
// Project exact stored timestamp spelling; never canonicalise an original.
const timestamp=value=>typeof value==='string'&&value.length<=40&&/(?:Z|[+-]\d\d:\d\d)$/.test(value)
  &&Number.isFinite(Date.parse(value))&&Date.parse(value)>=minimumTime&&Date.parse(value)<=maximumTime?value:null;
const sameTimes=(value,maximum)=>{nativeTimes(value,maximum);return true;};
function nativeTimes(value,maximum){
  if(value===undefined)return null;
  assert(Array.isArray(value)&&value.length>0&&value.length<=maximum&&value.every(t=>timestamp(t)===t),'WATER_TRACE_NATIVE_TIMES');
  return [...value];
}
function collectionsOf(source){
  if(!source)return [];
  assert.equal(source.provider,'dmi','WATER_TRACE_PROVIDER_UNKNOWN');
  const values=Array.isArray(source.collections)?source.collections:[source.collection];
  assert(values.length>0&&values.length<=8&&values.every(c=>waterCollections.has(c)),'WATER_TRACE_COLLECTION_UNKNOWN');
  return [...values];
}
const key=value=>{assert(typeof value==='string'&&/^(?:oceanobs|tidewater):[A-Za-z0-9._-]{1,120}$/.test(value),'WATER_TRACE_SOURCE_KEY');return value;};
const name=value=>typeof value==='string'&&value.length<=160&&!/[\r\n\0]/.test(value)?value:null;
const sha=value=>crypto.createHash('sha256').update(value).digest('hex');
export function voersaaWaterTarget(value){
  assert(VOERSAA_WATER_TRACE_TARGETS.includes(value),'WATER_TRACE_FIXED_TARGET');return value;
}
export function matchesVoersaaWaterTarget(descriptor,target){
  voersaaWaterTarget(target);
  return descriptor?.sourceHead===target.sourceHead&&descriptor.datasetId===target.datasetId
    &&descriptor.productionReferenceAt===target.productionReferenceAt;
}
async function json(file,maximum){
  const before=await fs.lstat(file,{bigint:true});assert(before.isFile()&&!before.isSymbolicLink()&&before.nlink===1n
    &&before.size>1n&&before.size<=BigInt(maximum),'WATER_TRACE_LOCAL_FILE');
  const bytes=await fs.readFile(file),after=await fs.lstat(file,{bigint:true});
  assert(['dev','ino','size','mtimeNs','ctimeNs'].every(k=>before[k]===after[k])&&BigInt(bytes.length)===before.size,'WATER_TRACE_LOCAL_CHANGED');
  return JSON.parse(bytes);
}
function sourceProjection(sourceKey,registry,index,time){
  const record=index.get(sourceKey),row=record?.hourly.find(hour=>hour.time===time);
  const provenance=row?.sources?.waterLevel;
  return {sourceId:key(sourceKey),sourceName:name(registry.get(sourceKey)?.name??record?.name),
    waterLevelCm:cm(row?.waterLevelCm),modelRun:timestamp(provenance?.modelRun),
    collection:row?collectionsOf(provenance)[0]:null,nativeValidTimes:row?nativeTimes(provenance?.nativeValidTimes,2):null,
    ageHours:number(provenance?.forecastAgeHours),
    disposition:row&&timestamp(provenance?.modelRun)&&provenance.nativeValidTimes?'QUALIFIED_SAVED_SOURCE_HOUR'
      :row?'SAVED_SOURCE_METADATA_UNKNOWN':'MISSING_SAVED_SOURCE_HOUR'};
}
// Caller must first perform normal immutable B authentication. This pure
// observation has no way to issue an authenticated B/snapshot or repair it.
export async function readVoersaaWaterTrace({payloadRoot,target,inputDisposition,bundleIdentitySha256}){
  voersaaWaterTarget(target);
  assert(['EXACT_CURRENT','EXACT_PREVIOUS','EXACT_COMPLETED_STAGE'].includes(inputDisposition));
  assert.match(bundleIdentitySha256,/^[a-f0-9]{64}$/);
  const forecast=await inspectDmiForecastFile(path.join(payloadRoot,'data/live/dmi-forecast-cache.json'));
  const descriptor=forecast.zones.get(VOERSAA_WATER_TRACE_ZONE);
  const zone=descriptor?await readDmiForecastRecord(forecast,descriptor):null;
  const stations=await json(path.join(payloadRoot,'data/live/dmi-water-stations.json'),16*1024*1024);
  const registry=new Map((Array.isArray(stations.stations)?stations.stations:[])
    .filter(station=>typeof station?.sourceKey==='string').map(station=>[station.sourceKey,station]));
  const packed=await readDmiWaterSourceContinuity(forecast);
  const sourceIndex=await unpackWaterSourceForecastContinuity(packed,target.productionReferenceAt);
  const hourly=new Map((zone?.hourly??[]).map(row=>[row.time,row]));
  let savedZoneInterpolation={disposition:'UNKNOWN',method:null,stations:[]};
  const meta=zone?.waterLevelInterpolation;
  if(meta&&['single-water-source','inverse-distance-water-sources'].includes(meta.method)&&Array.isArray(meta.stations)
    &&meta.stations.length>0&&meta.stations.length<=8){
    try{const stations=meta.stations.map(s=>({sourceKey:key(s.sourceKey),weight:s.weight}));
      assert(stations.every(s=>typeof s.weight==='number'&&Number.isFinite(s.weight)&&s.weight>=0&&s.weight<=1));
      assert.equal(new Set(stations.map(s=>s.sourceKey)).size,stations.length);
      savedZoneInterpolation={disposition:'PERSISTED_ZONE_METADATA_ONLY',method:meta.method,stations};
    }catch{} // Missing/mismatched saved metadata is not reconstructed config.
  }
  const hours=VOERSAA_WATER_TRACE_TIMES.map(time=>{
    const row=hourly.get(time),source=row?.sources?.waterLevel;
    const routed=source?.provider==='dmi'&&source?.routing==='dmi-water-source-interpolation';
    const sourceIds=routed&&Array.isArray(source.sourceKeys)?source.sourceKeys.map(key):[];
    assert(sourceIds.length<=8&&new Set(sourceIds).size===sourceIds.length,'WATER_TRACE_SOURCE_BOUND');
    const runs=Array.isArray(source?.modelRuns)?[...source.modelRuns]:source?.modelRun===undefined?[]:[source.modelRun];
    assert(runs.length<=8&&runs.every(run=>timestamp(run)===run),'WATER_TRACE_RUN_BOUND');
    const collections=source?.provider==='missing'&&cm(row?.waterLevelCm)===null?[]:collectionsOf(source);
    const times=nativeTimes(source?.nativeValidTimes,16);
    if(routed&&savedZoneInterpolation.disposition!=='UNKNOWN'&&JSON.stringify(sourceIds)!==JSON.stringify(savedZoneInterpolation.stations.map(s=>s.sourceKey)))
      savedZoneInterpolation={disposition:'UNKNOWN',method:null,stations:[]};
    const outside=time<target.productionReferenceAt;
    return {time,role:observations.includes(time)?(support.includes(time)?'OBSERVATION_AND_SUPPORT':'OBSERVATION'):'SUPPORT',
      waterLevelCm:cm(row?.waterLevelCm),trendCm3h:cm(row?.waterLevelTrendCm3h),
      disposition:outside?'OUTSIDE_ORIGINAL_HORIZON':!row?'MISSING_ZONE_HOUR':routed&&sourceIds.length?'PERSISTED_ROUTED_SOURCES'
        :source?.provider==='dmi'?'PERSISTED_DIRECT_DMI':'PERSISTED_SOURCE_UNKNOWN',
      modelRuns:runs,collections,nativeValidTimes:times,ageHours:number(source?.forecastAgeHours),
      selectedSources:sourceIds.map(sourceId=>sourceProjection(sourceId,registry,sourceIndex,time))};
  });
  let bulkMetadata;try{bulkMetadata=projectVoersaaBulkMetadata(await readDmiBulkDocument(path.join(payloadRoot,'data/live/dmi-bulk-cache.json'),{expandSources:false}),target);}
  catch{bulkMetadata=projectVoersaaBulkMetadata(null,target);}
  return {generation:target.key,datasetId:target.datasetId,productionReferenceAt:target.productionReferenceAt,
    dataProducerHead:target.sourceHead,inputDisposition,bundleIdentitySha256,zoneId:VOERSAA_WATER_TRACE_ZONE,
    sourceBankPresent:packed!==null&&packed!==undefined,savedZoneInterpolation,bulkMetadata,componentFallback:null,hours,
    partReconstruction:{disposition:'UNKNOWN_MISSING_AUTHENTIC_SAVED_CONFIG',isReconstruction:true,performed:false}};
}

// Optional reduction of the SAME authenticated local B. No acquisition or
// source expansion; retained runs are not a fresh-invocation claim.
const bulkCollections=['dkss_idw','dkss_nsbs','dkss_lf'];
const allBulkCollections=new Set([...bulkCollections,'wam_dw','wam_nsb','harmonie_dini_sf']);
const bulkNumberFields=['runtimeBudgetSeconds','assetsProcessedThisInvocation','reusedAssets'];
const bulkArrayFields=['collectionsAttempted','collectionsSucceeded','collectionsPartial','zeroProgressCollections'];
const stacTimeFields=['latestRun','selectedRun'];
const stacNumberFields=['latestRunFutureHorizonHours','selectedRunFutureHorizonHours','selectedRunLagBehindLatestHours'];
const stacBooleanFields=['selectedNativeRunComplete','requiredHorizonEndCovered','incompleteLatestRunDeferred','catalogInventoryComplete'];
const object=value=>value!==null&&typeof value==='object'&&!Array.isArray(value);
const metadataNumber=value=>typeof value==='number'&&Number.isFinite(value)&&value>=0&&value<=1e9?value:null;
const metadataBoolean=value=>typeof value==='boolean'?value:null;
const metadataTime=value=>typeof value==='string'&&value.length<=40&&/(?:Z|[+-]\d\d:\d\d)$/.test(value)
  &&Number.isFinite(Date.parse(value))&&Date.parse(value)>=Date.parse('2026-01-01T00:00:00Z')&&Date.parse(value)<=maximumTime?value:null;
const metadataCollections=value=>Array.isArray(value)&&value.length<=6&&value.every(c=>allBulkCollections.has(c))
  ?value.filter(c=>bulkCollections.includes(c)):null;
function validTimeReduction(value,target){
  const empty={count:null,min:null,max:null,containsH117:null,containsH120:null};
  if(!Array.isArray(value)||value.length>20000||!value.every(t=>metadataTime(t)===t))return empty;
  let min=null,max=null;
  for(const t of value){if(min===null||Date.parse(t)<Date.parse(min))min=t;if(max===null||Date.parse(t)>Date.parse(max))max=t;}
  return {count:value.length,min,max,
    containsH117:value.some(t=>Date.parse(t)===Date.parse(target.productionReferenceAt)+117*3600000),
    containsH120:value.some(t=>Date.parse(t)===Date.parse(target.productionReferenceAt)+120*3600000)};
}
export function projectVoersaaBulkMetadata(document,target){
  voersaaWaterTarget(target);const doc=object(document)?document:{},d=object(doc.diagnostics)?doc.diagnostics:{};
  return {status:object(document)&&(doc.generatedAt!==undefined||doc.diagnostics!==undefined||doc.runs!==undefined)?'PRESENT':'UNKNOWN',
    evidence:'INVOCATION_DIAGNOSTICS_WITH_POSSIBLY_RETAINED_RUNS',freshnessClaimed:false,
    generatedAt:metadataTime(doc.generatedAt),sourceUpdatedAt:metadataTime(doc.sourceUpdatedAt),
    refreshStatus:['ok','partial','failed','fresh-bulk-cache'].includes(doc.refreshStatus)?doc.refreshStatus:null,
    diagnostics:{...Object.fromEntries(bulkNumberFields.map(k=>[k,metadataNumber(d[k])])),
      ...Object.fromEntries(bulkArrayFields.map(k=>[k,metadataCollections(d[k])]))},
    collections:Object.fromEntries(bulkCollections.map(collection=>{
      const stac=object(d.stacByCollection?.[collection])?d.stacByCollection[collection]:{},run=object(doc.runs?.[collection])?doc.runs[collection]:{};
      return [collection,{stac:{...Object.fromEntries(stacTimeFields.map(k=>[k,metadataTime(stac[k])])),
        ...Object.fromEntries(stacNumberFields.map(k=>[k,metadataNumber(stac[k])])),
        ...Object.fromEntries(stacBooleanFields.map(k=>[k,metadataBoolean(stac[k])]))},
        run:{referenceTime:metadataTime(run.referenceTime),processedValidTimes:validTimeReduction(run.processedValidTimes,target)}}];
    }))};
}
function validateBulkMetadata(meta){
  exact(meta,['status','evidence','freshnessClaimed','generatedAt','sourceUpdatedAt','refreshStatus','diagnostics','collections']);
  assert(['PRESENT','UNKNOWN'].includes(meta.status));assert.equal(meta.evidence,'INVOCATION_DIAGNOSTICS_WITH_POSSIBLY_RETAINED_RUNS');
  assert.equal(meta.freshnessClaimed,false);
  for(const k of ['generatedAt','sourceUpdatedAt'])assert(meta[k]===null||metadataTime(meta[k])===meta[k]);
  assert(meta.refreshStatus===null||['ok','partial','failed','fresh-bulk-cache'].includes(meta.refreshStatus));
  exact(meta.diagnostics,[...bulkNumberFields,...bulkArrayFields]);
  for(const k of bulkNumberFields)assert(meta.diagnostics[k]===null||metadataNumber(meta.diagnostics[k])===meta.diagnostics[k]);
  for(const k of bulkArrayFields)assert(meta.diagnostics[k]===null||Array.isArray(meta.diagnostics[k])&&meta.diagnostics[k].length<=6&&meta.diagnostics[k].every(c=>bulkCollections.includes(c)));
  exact(meta.collections,bulkCollections);
  for(const value of Object.values(meta.collections)){
    exact(value,['stac','run']);exact(value.stac,[...stacTimeFields,...stacNumberFields,...stacBooleanFields]);
    for(const k of stacTimeFields)assert(value.stac[k]===null||metadataTime(value.stac[k])===value.stac[k]);
    for(const k of stacNumberFields)assert(value.stac[k]===null||metadataNumber(value.stac[k])===value.stac[k]);
    for(const k of stacBooleanFields)assert(value.stac[k]===null||typeof value.stac[k]==='boolean');
    exact(value.run,['referenceTime','processedValidTimes']);assert(value.run.referenceTime===null||metadataTime(value.run.referenceTime)===value.run.referenceTime);
    const t=value.run.processedValidTimes;exact(t,['count','min','max','containsH117','containsH120']);
    assert(t.count===null||Number.isSafeInteger(t.count)&&t.count>=0&&t.count<=20000);
    for(const k of ['min','max'])assert(t[k]===null||metadataTime(t[k])===t[k]);
    for(const k of ['containsH117','containsH120'])assert(t[k]===null||typeof t[k]==='boolean');
  }
}
const safeSummaryShape=safeWeatherComponentSummary({copernicus:{passes:{critical:{},upgrade:{}}}});
const safeSummaryEnums=new Set(['IN_PROGRESS','CANDIDATES_READY','COMPLETED','FAILED','RECOVERED_AFTER_TRANSPORT_FAILURE',
  'CP_COMPONENT_PRODUCER_FAILED_OR_TIMED_OUT','CP_COMPONENT_REFRESH_FAILED']);
function validateSafeComponentSummary(value,shape=safeSummaryShape,at=''){
  if(value===null&&(!at||['.copernicus.passes.critical','.copernicus.passes.upgrade'].includes(at)))return;
  if(object(shape)){exact(value,Object.keys(shape));for(const k of Object.keys(shape))validateSafeComponentSummary(value[k],shape[k],at+'.'+k);return;}
  if(shape!==null){assert.equal(value,shape);return;}
  if(value===null)return;
  if(at.endsWith('.reportedCountsConsistent')||at.endsWith('.attemptCountsComplete'))assert.equal(typeof value,'boolean');
  else if(/\.(?:status|outcome|transportFailure)$/.test(at))assert(safeSummaryEnums.has(value));
  else assert(Number.isSafeInteger(value)&&value>=0,'WATER_TRACE_SAFE_SUMMARY_COUNT');
}

function exact(value,keys){assert(value&&typeof value==='object'&&!Array.isArray(value));
  assert.deepEqual(Object.keys(value).sort(),[...keys].sort(),'WATER_TRACE_OUTPUT_KEYS');}
export function validateVoersaaWaterTraceReport(report){
  exact(report,['schemaVersion','scope','currentPointerSha256','generations']);
  assert.equal(report.schemaVersion,1);assert.equal(report.scope,scope);assert.match(report.currentPointerSha256,/^[a-f0-9]{64}$/);
  assert(Array.isArray(report.generations)&&report.generations.length===2);
  for(let i=0;i<2;i++){
    const g=report.generations[i],target=VOERSAA_WATER_TRACE_TARGETS[i];
    exact(g,['generation','datasetId','productionReferenceAt','dataProducerHead','inputDisposition','bundleIdentitySha256','zoneId','sourceBankPresent','savedZoneInterpolation','bulkMetadata','componentFallback','hours','partReconstruction']);
    assert.equal(g.generation,target.key);assert.equal(g.datasetId,target.datasetId);
    assert.equal(g.productionReferenceAt,target.productionReferenceAt);assert.equal(g.dataProducerHead,target.sourceHead);
    assert.equal(g.zoneId,VOERSAA_WATER_TRACE_ZONE);assert.match(g.bundleIdentitySha256,/^[a-f0-9]{64}$/);
    assert(['EXACT_CURRENT','EXACT_PREVIOUS','EXACT_COMPLETED_STAGE'].includes(g.inputDisposition));
    assert.equal(typeof g.sourceBankPresent,'boolean');assert.equal(g.hours.length,VOERSAA_WATER_TRACE_TIMES.length);
    validateBulkMetadata(g.bulkMetadata);validateSafeComponentSummary(g.componentFallback);
    exact(g.savedZoneInterpolation,['disposition','method','stations']);
    const meta=g.savedZoneInterpolation;
    assert(['UNKNOWN','PERSISTED_ZONE_METADATA_ONLY'].includes(meta.disposition));
    if(meta.disposition==='UNKNOWN')assert(meta.method===null&&Array.isArray(meta.stations)&&meta.stations.length===0);
    else{assert(['single-water-source','inverse-distance-water-sources'].includes(meta.method)&&Array.isArray(meta.stations)&&meta.stations.length>0&&meta.stations.length<=8);
      for(const s of meta.stations){exact(s,['sourceKey','weight']);key(s.sourceKey);assert(typeof s.weight==='number'&&Number.isFinite(s.weight)&&s.weight>=0&&s.weight<=1);}}
    for(let n=0;n<g.hours.length;n++){
      const h=g.hours[n];exact(h,['time','role','waterLevelCm','trendCm3h','disposition','modelRuns','collections','nativeValidTimes','ageHours','selectedSources']);
      assert.equal(h.time,VOERSAA_WATER_TRACE_TIMES[n]);assert(['OBSERVATION','SUPPORT','OBSERVATION_AND_SUPPORT'].includes(h.role));
      assert(h.waterLevelCm===null||number(h.waterLevelCm)!==null);assert(h.trendCm3h===null||number(h.trendCm3h)!==null);
      cm(h.waterLevelCm);cm(h.trendCm3h);assert(h.ageHours===null||number(h.ageHours)!==null);
      assert(['OUTSIDE_ORIGINAL_HORIZON','MISSING_ZONE_HOUR','PERSISTED_ROUTED_SOURCES','PERSISTED_DIRECT_DMI','PERSISTED_SOURCE_UNKNOWN'].includes(h.disposition));
      assert(Array.isArray(h.modelRuns)&&h.modelRuns.length<=8&&h.modelRuns.every(t=>timestamp(t)===t));
      assert(Array.isArray(h.collections)&&h.collections.length<=8&&h.collections.every(c=>waterCollections.has(c)));
      assert(h.nativeValidTimes===null||sameTimes(h.nativeValidTimes,16));
      assert(Array.isArray(h.selectedSources)&&h.selectedSources.length<=8);
      for(const s of h.selectedSources){exact(s,['sourceId','sourceName','waterLevelCm','modelRun','collection','nativeValidTimes','ageHours','disposition']);
        key(s.sourceId);assert(s.sourceName===null||name(s.sourceName)===s.sourceName);
        assert(s.waterLevelCm===null||number(s.waterLevelCm)!==null);cm(s.waterLevelCm);
        assert(s.modelRun===null||timestamp(s.modelRun)===s.modelRun);assert(s.ageHours===null||number(s.ageHours)!==null);
        assert(s.collection===null||waterCollections.has(s.collection));assert(s.nativeValidTimes===null||sameTimes(s.nativeValidTimes,2));
        assert(['QUALIFIED_SAVED_SOURCE_HOUR','SAVED_SOURCE_METADATA_UNKNOWN','MISSING_SAVED_SOURCE_HOUR'].includes(s.disposition));}
    }
    assert.deepEqual(g.partReconstruction,{disposition:'UNKNOWN_MISSING_AUTHENTIC_SAVED_CONFIG',isReconstruction:true,performed:false});
  }
  assert(Buffer.byteLength(JSON.stringify(report))<=256*1024,'WATER_TRACE_REPORT_BOUND');return report;
}
export function voersaaWaterTraceReport(pointerSha256,generations){
  return validateVoersaaWaterTraceReport({schemaVersion:1,scope,currentPointerSha256:pointerSha256,generations});
}
// Same established Node primitive and existing secret as completed-stage
// protection; a disjoint purpose/AAD prevents any B/progress interpretation.
const MAGIC=Buffer.from('RR-PRIVATE-VOERSAA-WATER-TRACE-1\n'),PURPOSE='VOERSAA_WATER_TRACE/20261101/v1';
function encryptionContext({repository,runId,runAttempt,sourceHead,masterSecret}){
  assert(/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(repository)&&/^[1-9][0-9]*$/.test(String(runId))
    &&/^[1-9][0-9]*$/.test(String(runAttempt))&&/^[a-f0-9]{40}$/.test(sourceHead)
    &&typeof masterSecret==='string'&&masterSecret.length>=32,'WATER_TRACE_ENCRYPTION_CONTEXT');
  return {aad:Buffer.from(JSON.stringify({purpose:PURPOSE,repository,runId:String(runId),runAttempt:String(runAttempt),sourceHead})),
    key:salt=>Buffer.from(crypto.hkdfSync('sha256',Buffer.from(masterSecret),salt,Buffer.from(`RavRadar/${repository}/${PURPOSE}`),32))};
}
export function sealVoersaaWaterTrace(report,context){
  validateVoersaaWaterTraceReport(report);const cryptoContext=encryptionContext(context),salt=crypto.randomBytes(16),iv=crypto.randomBytes(12);
  const cipher=crypto.createCipheriv('aes-256-gcm',cryptoContext.key(salt),iv);cipher.setAAD(cryptoContext.aad);
  return Buffer.concat([MAGIC,salt,iv,cipher.update(JSON.stringify(report),'utf8'),cipher.final(),cipher.getAuthTag()]);
}
export function openVoersaaWaterTrace(bytes,context){
  if(Buffer.isBuffer(bytes)&&bytes.subarray(0,RECIPIENT_MAGIC.length).equals(RECIPIENT_MAGIC)){
    const envelope=recipientEnvelope(bytes,context),cryptoContext=encryptionContext(context);
    return openRecipientData(envelope,cryptoContext.key(envelope.salt));
  }
  assert(Buffer.isBuffer(bytes)&&bytes.length>MAGIC.length+44&&bytes.length<=256*1024+MAGIC.length+44
    &&bytes.subarray(0,MAGIC.length).equals(MAGIC),'WATER_TRACE_ENVELOPE_BOUND');
  const cryptoContext=encryptionContext(context),at=MAGIC.length;
  const decipher=crypto.createDecipheriv('aes-256-gcm',cryptoContext.key(bytes.subarray(at,at+16)),bytes.subarray(at+16,at+28));
  decipher.setAAD(cryptoContext.aad);decipher.setAuthTag(bytes.subarray(-16));
  const plaintext=Buffer.concat([decipher.update(bytes.subarray(at+28,-16)),decipher.final()]);
  return validateVoersaaWaterTraceReport(JSON.parse(plaintext.toString('utf8')));
}

// A fixed local diagnosis recipient, never a B/S/progress/origin credential.
// Only this public SPKI is shipped. The private key never enters CI or source.
export const VOERSAA_WATER_TRACE_RECIPIENT_SPKI_SHA256='92d0755edecec37a78ee8e0658a79873c17b67e13324711d75fce76270e8d529';
const RECIPIENT_PUBLIC_PEM=`-----BEGIN PUBLIC KEY-----
MIIBojANBgkqhkiG9w0BAQEFAAOCAY8AMIIBigKCAYEA0orSv4TDHcNLaRKyGBoV
rd2Y/Qtmuzl7ZAM3o3P0Wm/He5hOu2lZ4jHCnFODHcGZJQckgTjziXPO+2ejZinZ
KC+B3Z+TcR8z3r0vpIGqzNhs5i1AwEG9PX56fXhLLskcoomVnR7hYuJsb1lk2x31
VT+FX8DudQ+bPpS0TSGD/9TT0kZicrSSblHQZH0Bh6NsKmOSvFa5Ez9HPSCCFQBM
1MvPXsiy///ojNbBV0WRB/3dBZYNC98Kk8DIzyi9Gpd781Ar7Lsqpy59B/2P4L8C
5Xrc+hU84ZhKoTtDX2Bjw6sW1WVzN0h7QNgBmoDV2tj7ezrBWBwjnlHapNy1koqo
SpBTd9gcC4BYOcAeSi/54BuApiM5X6Ie2q0mo6mdk1Yv/GdedpSfeNmzkQAr5gTL
dPfcC7WRZWo43oyV6IJw0CIcRDOQY2MowBYdzfzcaMiaX1OJZP40wnKKWz8Bks1K
cDdYoG7qEbqESiF74xOXIsojS+O46Oj1aLhgh96+E1+9AgMBAAE=
-----END PUBLIC KEY-----
`;
const RECIPIENT_MAGIC=Buffer.from('RR-PRIVATE-VOERSAA-WATER-TRACE-2\n');
const RECIPIENT_PURPOSE='VOERSAA_WATER_TRACE/20261101/v2';
const MAX_HEADER_BYTES=2048,MAX_REPORT_BYTES=256*1024,WRAPPED_KEY_BYTES=384;
function reportIdentity(context){
  assert(object(context),'WATER_TRACE_ENCRYPTION_CONTEXT');
  const {repository,runId,runAttempt,sourceHead}=context;
  assert(typeof repository==='string'&&repository.length<=200&&/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(repository)
    &&/^[1-9][0-9]{0,31}$/.test(String(runId))&&/^[1-9][0-9]{0,31}$/.test(String(runAttempt))
    &&/^[a-f0-9]{40}$/.test(sourceHead),'WATER_TRACE_ENCRYPTION_CONTEXT');
  return {repository,runId:String(runId),runAttempt:String(runAttempt),sourceHead};
}
function recipientPublicKey(value){
  const result=value instanceof crypto.KeyObject?value:crypto.createPublicKey(value);
  assert(result.type==='public'&&result.asymmetricKeyType==='rsa'
    &&result.asymmetricKeyDetails.modulusLength===3072,'WATER_TRACE_RECIPIENT_KEY');
  return result;
}
function recipientFingerprint(key){
  return crypto.createHash('sha256').update(key.export({type:'spki',format:'der'})).digest('hex');
}
function recipientEnvelope(bytes,context){
  assert(Buffer.isBuffer(bytes)&&bytes.length>RECIPIENT_MAGIC.length+48
    &&bytes.length<=MAX_REPORT_BYTES+RECIPIENT_MAGIC.length+4+MAX_HEADER_BYTES+44
    &&bytes.subarray(0,RECIPIENT_MAGIC.length).equals(RECIPIENT_MAGIC),'WATER_TRACE_ENVELOPE_BOUND');
  const lengthAt=RECIPIENT_MAGIC.length,headerBytes=bytes.readUInt32BE(lengthAt),headerAt=lengthAt+4;
  assert(headerBytes>=2&&headerBytes<=MAX_HEADER_BYTES&&bytes.length>headerAt+headerBytes+44,'WATER_TRACE_ENVELOPE_BOUND');
  const encoded=bytes.subarray(headerAt,headerAt+headerBytes),header=JSON.parse(encoded.toString('utf8'));
  exact(header,['purpose','repository','runId','runAttempt','sourceHead','keyAlgorithm','dataAlgorithm','recipientSpkiSha256','wrappedKey']);
  assert(Buffer.from(JSON.stringify(header)).equals(encoded),'WATER_TRACE_ENVELOPE_HEADER');
  assert(header.purpose===RECIPIENT_PURPOSE&&header.keyAlgorithm==='RSA-OAEP-SHA256'&&header.dataAlgorithm==='AES-256-GCM'
    &&typeof header.recipientSpkiSha256==='string'&&/^[a-f0-9]{64}$/.test(header.recipientSpkiSha256)
    &&typeof header.wrappedKey==='string'&&/^[A-Za-z0-9+/]{512}$/.test(header.wrappedKey),'WATER_TRACE_ENVELOPE_HEADER');
  const identity=reportIdentity(context);
  for(const field of Object.keys(identity))assert.equal(header[field],identity[field],'WATER_TRACE_ENVELOPE_CONTEXT');
  const wrappedKey=Buffer.from(header.wrappedKey,'base64');
  assert(wrappedKey.length===WRAPPED_KEY_BYTES&&wrappedKey.toString('base64')===header.wrappedKey,'WATER_TRACE_ENVELOPE_HEADER');
  const saltAt=headerAt+headerBytes,ivAt=saltAt+16,cipherAt=ivAt+12;
  const ciphertext=bytes.subarray(cipherAt,-16);assert(ciphertext.length<=MAX_REPORT_BYTES,'WATER_TRACE_REPORT_BOUND');
  return {header,wrappedKey,salt:bytes.subarray(saltAt,ivAt),iv:bytes.subarray(ivAt,cipherAt),
    aad:bytes.subarray(0,cipherAt),ciphertext,tag:bytes.subarray(-16)};
}
function openRecipientData(envelope,key){
  assert(Buffer.isBuffer(key)&&key.length===32,'WATER_TRACE_DATA_KEY');
  try{
    const decipher=crypto.createDecipheriv('aes-256-gcm',key,envelope.iv);
    decipher.setAAD(envelope.aad);decipher.setAuthTag(envelope.tag);
    const plaintext=Buffer.concat([decipher.update(envelope.ciphertext),decipher.final()]);
    assert(plaintext.length<=MAX_REPORT_BYTES,'WATER_TRACE_REPORT_BOUND');
    return validateVoersaaWaterTraceReport(JSON.parse(plaintext.toString('utf8')));
  }finally{key.fill(0);}
}
export function sealVoersaaWaterTraceForRecipient(report,context,options={}){
  validateVoersaaWaterTraceReport(report);exact(options,Object.hasOwn(options,'recipientPublicKey')?['recipientPublicKey']:[]);
  const identity=reportIdentity(context),cryptoContext=encryptionContext(context);
  // Pure codec tests may select a disposable test RSA key. The audit/CLI has
  // no such option and always calls this default with its fixed public SPKI.
  const publicKey=recipientPublicKey(options.recipientPublicKey??RECIPIENT_PUBLIC_PEM);
  const fingerprint=recipientFingerprint(publicKey);
  if(!Object.hasOwn(options,'recipientPublicKey'))assert.equal(fingerprint,VOERSAA_WATER_TRACE_RECIPIENT_SPKI_SHA256);
  const salt=crypto.randomBytes(16),iv=crypto.randomBytes(12),key=cryptoContext.key(salt);
  try{
    const wrappedKey=crypto.publicEncrypt({key:publicKey,padding:crypto.constants.RSA_PKCS1_OAEP_PADDING,oaepHash:'sha256'},key);
    assert.equal(wrappedKey.length,WRAPPED_KEY_BYTES,'WATER_TRACE_RECIPIENT_KEY');
    const header=Buffer.from(JSON.stringify({purpose:RECIPIENT_PURPOSE,...identity,keyAlgorithm:'RSA-OAEP-SHA256',
      dataAlgorithm:'AES-256-GCM',recipientSpkiSha256:fingerprint,wrappedKey:wrappedKey.toString('base64')}));
    assert(header.length<=MAX_HEADER_BYTES,'WATER_TRACE_ENVELOPE_BOUND');
    const length=Buffer.alloc(4);length.writeUInt32BE(header.length);
    // Header, wrapped key, SPKI fingerprint, salt and nonce are all authenticated
    // identically by the existing master reader and the local recipient codec.
    const aad=Buffer.concat([RECIPIENT_MAGIC,length,header,salt,iv]);
    const cipher=crypto.createCipheriv('aes-256-gcm',key,iv);cipher.setAAD(aad);
    return Buffer.concat([aad,cipher.update(JSON.stringify(report),'utf8'),cipher.final(),cipher.getAuthTag()]);
  }finally{key.fill(0);}
}
export function openVoersaaWaterTraceForRecipient(bytes,context){
  exact(context,['repository','runId','runAttempt','sourceHead','recipientPrivateKey']);
  const envelope=recipientEnvelope(bytes,context),privateKey=context.recipientPrivateKey instanceof crypto.KeyObject
    ?context.recipientPrivateKey:crypto.createPrivateKey(context.recipientPrivateKey);
  assert(privateKey.type==='private'&&privateKey.asymmetricKeyType==='rsa'
    &&privateKey.asymmetricKeyDetails.modulusLength===3072,'WATER_TRACE_RECIPIENT_KEY');
  assert.equal(recipientFingerprint(crypto.createPublicKey(privateKey)),envelope.header.recipientSpkiSha256,'WATER_TRACE_RECIPIENT_KEY');
  const key=crypto.privateDecrypt({key:privateKey,padding:crypto.constants.RSA_PKCS1_OAEP_PADDING,oaepHash:'sha256'},envelope.wrappedKey);
  return openRecipientData(envelope,key);
}
