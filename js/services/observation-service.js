import { PUBLIC_CONFIG } from '../../config.js?v=4.0.316';
import { authorizedFetch, currentSession, requireFreshSession } from './auth-service.js?v=4.0.316';
import { assertObservationTripQualityBinding, assertTripEvidencePrivacy, migrateLegacyUnattestedObservationColumns } from './trip-evidence-contract.js?v=4.0.316';
import { ACCOUNT_TRIP_REPORT_SOURCE, HISTORICAL_SNAPSHOT_UNAVAILABLE } from './account-trip-report-contract.js?v=4.0.316';
const enabled=Boolean(PUBLIC_CONFIG.supabaseUrl&&PUBLIC_CONFIG.supabasePublishableKey);
const LOCAL_KEY='ravradar-observations-v2';
const OUTBOX_KEY='ravradar-observation-outbox-v1';
const SNAPSHOT_SCHEMA_VERSION=3;
const WEATHER_SNAPSHOT_FIELDS=Object.freeze([
  'generatedAt','time','provider','providerLabel','windSpeedMps','windDirectionDeg','waveHeightM','wavePeriodS',
  'waveDirectionDeg','currentSpeedMps','currentDirectionDeg','waterLevelCm','waterLevelTrendCm3h','waterTemperatureC'
]);
const LEGACY_CURRENT_RANGES=Object.freeze({windSpeedMps:[0,100],windDirectionDeg:[0,360],waveHeightM:[0,30],wavePeriodS:[0,40],waveDirectionDeg:[0,360],currentSpeedMps:[0,10],currentDirectionDeg:[0,360],waterLevelCm:[-2000,2000],waterLevelTrendCm3h:[-1000,1000],waterTemperatureC:[-10,50]});
const LEGACY_CALIBRATION_FIELDS=Object.freeze(['modelVersion','appVersion','totalScore','huntabilityScore','transportScore','mobilisationScore','windSpeedMs','windDirectionDeg','waveHeightM','wavePeriodS','waveDirectionDeg','currentSpeedMs','currentDirectionDeg','waterLevelM','waterLevelTrendM3h','maxWaveHeight24hM','hoursSinceEnergyPeak','sustainedOnshoreHours','reasonCodes']);
const LEGACY_CALIBRATION_RANGES=Object.freeze({totalScore:[0,100],huntabilityScore:[0,100],transportScore:[0,100],mobilisationScore:[0,100],windSpeedMs:[0,100],windDirectionDeg:[0,360],waveHeightM:[0,30],wavePeriodS:[0,40],waveDirectionDeg:[0,360],currentSpeedMs:[0,10],currentDirectionDeg:[0,360],waterLevelM:[-20,20],waterLevelTrendM3h:[-10,10],maxWaveHeight24hM:[0,30],hoursSinceEnergyPeak:[0,168],sustainedOnshoreHours:[0,168]});
function read(key,fallback=[]){try{return JSON.parse(localStorage.getItem(key)||'null')??fallback;}catch{return fallback;}}
function write(key,value){localStorage.setItem(key,JSON.stringify(value));}
function anonymousId(){const key='ravradar-anonymous-id';let value=localStorage.getItem(key);if(!value){value=crypto.randomUUID();localStorage.setItem(key,value);}return value;}
function publicWeatherSnapshot(weather){const source=weather&&typeof weather==='object'?weather:{};return Object.fromEntries(WEATHER_SNAPSHOT_FIELDS.map(key=>[key,source[key]??null]));}
function publicPredictionSnapshot(prediction){const source=prediction&&typeof prediction==='object'?prediction:{};return {probability:source.probability??null,confidence:source.confidence??null,modelVersion:source.modelVersion??null};}
function immutableWeatherSnapshot(weather,scoreResult,prediction){return structuredClone({schemaVersion:SNAPSHOT_SCHEMA_VERSION,capturedAt:new Date().toISOString(),sourceGeneratedAt:weather?.generatedAt??null,forecastTime:weather?.time??null,provider:weather?.provider??null,current:publicWeatherSnapshot(weather),score:{baseScore:scoreResult?.baseScore??scoreResult?.score??null,finalScore:scoreResult?.score??null,level:scoreResult?.level??null},prediction:publicPredictionSnapshot(prediction||scoreResult?.prediction),matchedRuleIds:(scoreResult?.ruleEvaluation?.matches??[]).map(match=>String(match?.id??match?.ruleId??'').slice(0,120)).filter(Boolean).slice(0,40)});}
function record(value){return Boolean(value)&&typeof value==='object'&&!Array.isArray(value);}
function assignProjected(output,key,value){if(value!==undefined)output[key]=value;}
function projectedText(value,maximum){if(value===null)return null;return typeof value==='string'&&value.length<=maximum?value:undefined;}
function projectedNumber(value,range){if(value===null)return null;return typeof value==='number'&&Number.isFinite(value)&&value>=range[0]&&value<=range[1]?value:undefined;}
function projectLegacyCurrent(value){if(!record(value))return undefined;const projected={};for(const key of WEATHER_SNAPSHOT_FIELDS){assignProjected(projected,key,Object.hasOwn(LEGACY_CURRENT_RANGES,key)?projectedNumber(value[key],LEGACY_CURRENT_RANGES[key]):projectedText(value[key],160));}return projected;}
function projectLegacyScore(value){if(!record(value))return undefined;const projected={};assignProjected(projected,'baseScore',projectedNumber(value.baseScore,[0,100]));assignProjected(projected,'finalScore',projectedNumber(value.finalScore,[0,100]));assignProjected(projected,'level',projectedText(value.level,40));return projected;}
function projectLegacyPrediction(value){if(!record(value))return undefined;const projected={};assignProjected(projected,'probability',projectedNumber(value.probability,[0,1]));assignProjected(projected,'confidence',projectedNumber(value.confidence,[0,1]));assignProjected(projected,'modelVersion',projectedText(value.modelVersion,128));return projected;}
function projectLegacyCalibration(value){if(!record(value))return undefined;const projected={};for(const key of LEGACY_CALIBRATION_FIELDS){if(key==='reasonCodes'){if(Array.isArray(value[key]))projected[key]=value[key].filter(item=>typeof item==='string'&&item.length<=128).slice(0,12);}else assignProjected(projected,key,Object.hasOwn(LEGACY_CALIBRATION_RANGES,key)?projectedNumber(value[key],LEGACY_CALIBRATION_RANGES[key]):projectedText(value[key],128));}return projected;}
function projectLegacyRuleIds(value){const sources=[];if(Array.isArray(value.matchedRuleIds))sources.push(...value.matchedRuleIds);if(Array.isArray(value.matchedRules))sources.push(...value.matchedRules.map(rule=>typeof rule==='string'?rule:record(rule)?rule.id??rule.ruleId??null:null));if(!Array.isArray(value.matchedRuleIds)&&!Array.isArray(value.matchedRules))return undefined;return [...new Set(sources.filter(item=>typeof item==='string'&&item.length<=120))].slice(0,40);}
export function projectLegacyObservationWeatherSnapshot(value){if(!record(value))return undefined;const projected={};if(value.schemaVersion===null||(Number.isSafeInteger(value.schemaVersion)&&[2,3,4,5].includes(value.schemaVersion)))projected.schemaVersion=value.schemaVersion;for(const key of ['capturedAt','sourceGeneratedAt','forecastTime','provider','forecastSnapshotId','forecastIssuedAt','forecastValidAt','reportSource','selectedAt','historicalSnapshotStatus'])assignProjected(projected,key,projectedText(value[key],200));assignProjected(projected,'current',projectLegacyCurrent(value.current));assignProjected(projected,'score',projectLegacyScore(value.score));assignProjected(projected,'prediction',projectLegacyPrediction(value.prediction));assignProjected(projected,'matchedRuleIds',projectLegacyRuleIds(value));assignProjected(projected,'calibrationFeatures',projectLegacyCalibration(value.calibrationFeatures));return projected;}
function projectLegacyObservationRow(row){if(!record(row)||Number(row.schema_version??1)!==1||!Object.hasOwn(row,'weather_snapshot'))return row;const snapshot=projectLegacyObservationWeatherSnapshot(row.weather_snapshot),projected={...row};if(snapshot===undefined)delete projected.weather_snapshot;else projected.weather_snapshot=snapshot;return JSON.stringify(projected)===JSON.stringify(row)?row:projected;}
export function observationsEnabled(){return enabled;}
function migrateLegacyTripObservationRow(row){
  const migrated=migrateLegacyUnattestedObservationColumns(row);
  let normalized=migrated;
  if(migrated!==row){
    const calibrationFeatures=migrated.calibration_features;
    const weatherSnapshot=row?.weather_snapshot&&typeof row.weather_snapshot==='object'
      ?{...row.weather_snapshot,calibrationFeatures}
      :row?.weather_snapshot;
    normalized={...migrated,weather_snapshot:weatherSnapshot};
  }
  return projectLegacyObservationRow(normalized);
}
function readMigratedRows(key){const rows=read(key,[]);if(!Array.isArray(rows))return [];const migrated=rows.map(migrateLegacyTripObservationRow);if(migrated.some((row,index)=>row!==rows[index]))write(key,migrated);return migrated;}
export function getLocalObservations(){return readMigratedRows(LOCAL_KEY);}
export function getObservationSyncStatus(){const rows=getLocalObservations(),pending=readMigratedRows(OUTBOX_KEY);return {local:rows.length,pending:pending.length,synced:rows.filter(x=>x.sync_status==='synced').length,lastAttemptAt:localStorage.getItem('ravradar-observation-last-sync')};}
export async function getOwnTripObservations({ limit = 100 } = {}) {
  if (!enabled) throw new Error('Login og turlog er ikke aktiveret endnu.');
  const active = await requireFreshSession();
  const userId = active?.user?.id;
  if (!userId) throw new Error('Din konto kunne ikke knyttes sikkert til turloggen. Log ind igen.');
  const safeLimit = Math.max(1, Math.min(200, Math.round(Number(limit) || 100)));
  const url = `${PUBLIC_CONFIG.supabaseUrl}/functions/v1/trip-log`;
  const response = await authorizedFetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ limit: safeLimit })
  });
  if (!response.ok) throw new Error(`Dine ture kunne ikke hentes (${response.status}).`);
  const body = await response.json();
  if (!Array.isArray(body?.rows)) throw new Error('Dine ture kunne ikke hentes sikkert.');
  return body.rows;
}
function upsertLocal(row){const safe=migrateLegacyTripObservationRow(row),rows=getLocalObservations();const i=rows.findIndex(x=>x.id===safe.id);if(i>=0)rows[i]=safe;else rows.push(safe);write(LOCAL_KEY,rows);}
function enqueue(row){const safe=migrateLegacyTripObservationRow(row),rows=readMigratedRows(OUTBOX_KEY);if(!rows.some(x=>x.id===safe.id))rows.push(safe);write(OUTBOX_KEY,rows);}
export function remoteObservationPayload(row){const normalized=migrateLegacyTripObservationRow(structuredClone(row||{}));const {id:clientObservationId,gps:localGps,route,track,position,coordinates,latitude,longitude,location,sync_status,sync_error,synced_at,...remote}=normalized;const publicZoneId=remote.actual_zone_id||(typeof remote.zone_id==='string'?remote.zone_id:null);return {...remote,zone_id:Number.isSafeInteger(remote.zone_id)?remote.zone_id:null,actual_zone_id:publicZoneId,client_observation_id:clientObservationId,gps:null};}
async function postRemote(row){
  const url=`${PUBLIC_CONFIG.supabaseUrl}/functions/v1/submit-observation`;
  const payload=remoteObservationPayload(row);
  const options={method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)};
  let response;
  if(payload.user_id){
    const active=await requireFreshSession();
    if(active?.user?.id!==payload.user_id)throw new Error('Log ind med den konto, som turen tilhører, før den kan sendes.');
    response=await authorizedFetch(url,options);
  }else{
    response=await fetch(url,{...options,headers:{apikey:PUBLIC_CONFIG.supabasePublishableKey,Authorization:`Bearer ${PUBLIC_CONFIG.supabasePublishableKey}`,...options.headers}});
  }
  if(!response.ok)throw new Error('Turen kunne ikke sendes lige nu. Den bliver liggende på enheden, så du kan prøve igen.');
}
export async function syncPendingObservations(){if(!enabled)return getObservationSyncStatus();const queue=readMigratedRows(OUTBOX_KEY),remaining=[];for(const row of queue){try{await postRemote({...row,sync_status:undefined,sync_error:undefined});upsertLocal({...row,sync_status:'synced',synced_at:new Date().toISOString(),sync_error:null});}catch(error){remaining.push({...row,sync_status:'pending',sync_error:error.message});upsertLocal({...row,sync_status:'pending',sync_error:error.message});}}write(OUTBOX_KEY,remaining);localStorage.setItem('ravradar-observation-last-sync',new Date().toISOString());return getObservationSyncStatus();}
export async function submitObservation({zone,huntMode,result,grams=null,scoreResult,weather,gps=null,tripId=null,observedAt=null,prediction=null}){
  const session=currentSession();const row={id:crypto.randomUUID(),zone_id:zone.id,zone_name:zone.name,coast_type:zone.coastType||null,observed_at:observedAt||new Date().toISOString(),submitted_at:new Date().toISOString(),hunt_mode:huntMode,result,grams:grams===''||grams==null?null:Number(grams),anonymous_id:anonymousId(),user_id:session?.user?.id||null,trip_id:tripId,gps,rav_score:scoreResult?.score??null,score_level:scoreResult?.level??null,ai_probability:prediction?.probability??scoreResult?.prediction?.probability??null,ai_confidence:prediction?.confidence??scoreResult?.prediction?.confidence??null,model_version:prediction?.modelVersion??null,weather_snapshot:immutableWeatherSnapshot(weather,scoreResult,prediction),wind_speed_mps:weather?.windSpeedMps??null,wind_direction_deg:weather?.windDirectionDeg??null,wave_height_m:weather?.waveHeightM??null,wave_period_s:weather?.wavePeriodS??null,water_level_cm:weather?.waterLevelCm??null,current_speed_mps:weather?.currentSpeedMps??null,current_direction_deg:weather?.currentDirectionDeg??null,water_temperature_c:weather?.waterTemperatureC??null,sync_status:enabled?'pending':'local'};
  upsertLocal(row);if(!enabled)return {stored:'local',row};enqueue(row);const status=await syncPendingObservations();const stored=status.pending?'pending':'remote';return {stored,row,status};
}
export async function submitTripEvidenceObservation(columns){
  if(columns?.schema_version!==2)throw new Error('Turen har et ugyldigt format og kan ikke gemmes.');
  assertObservationTripQualityBinding(columns);
  assertTripEvidencePrivacy(columns);
  const existing=getLocalObservations().find(row=>row.trip_id===columns.trip_id);
  let session=currentSession();
  if(session?.access_token&&!session?.user?.id)session=await requireFreshSession();
  const features=columns.calibration_features||{};
  const row={
    id:existing?.id||columns.trip_id,
    zone_id:columns.actual_zone_id,
    zone_name:columns.zone_name||columns.actual_zone_id,
    coast_type:null,
    observed_at:columns.observed_at,
    submitted_at:new Date().toISOString(),
    hunt_mode:columns.hunt_mode,
    result:columns.result,
    grams:columns.grams,
    anonymous_id:existing?.anonymous_id||anonymousId(),
    user_id:session?.user?.id||null,
    trip_id:columns.trip_id,
    gps:null,
    rav_score:features.totalScore??null,
    score_level:null,
    ai_probability:null,
    ai_confidence:null,
    model_version:features.modelVersion??null,
    weather_snapshot:{schemaVersion:4,capturedAt:columns.forecast_captured_at,forecastSnapshotId:columns.forecast_snapshot_id,forecastIssuedAt:columns.forecast_issued_at,forecastValidAt:columns.forecast_valid_at,calibrationFeatures:features},
    wind_speed_mps:features.windSpeedMs??null,
    wind_direction_deg:features.windDirectionDeg??null,
    wave_height_m:features.waveHeightM??null,
    wave_period_s:features.wavePeriodS??null,
    water_level_cm:features.waterLevelM==null?null:features.waterLevelM*100,
    current_speed_mps:features.currentSpeedMs??null,
    current_direction_deg:features.currentDirectionDeg??null,
    water_temperature_c:null,
    schema_version:columns.schema_version,
    trip_started_at:columns.trip_started_at,
    trip_ended_at:columns.trip_ended_at,
    search_minutes:columns.search_minutes,
    search_coverage:columns.search_coverage,
    actual_zone_id:columns.actual_zone_id,
    actual_coastal_part_id:columns.actual_coastal_part_id,
    forecast_zone_id:columns.forecast_zone_id,
    forecast_coastal_part_id:columns.forecast_coastal_part_id,
    calibration_eligible:columns.calibration_eligible,
    found:columns.found,
    forecast_snapshot_id:columns.forecast_snapshot_id,
    forecast_issued_at:columns.forecast_issued_at,
    forecast_valid_at:columns.forecast_valid_at,
    forecast_captured_at:columns.forecast_captured_at,
    calibration_features:features,
    data_quality_flags:columns.data_quality_flags,
    sync_status:enabled?'pending':'local'
  };
  assertTripEvidencePrivacy(row);
  upsertLocal(row);if(!enabled)return {stored:'local',row};enqueue(row);const status=await syncPendingObservations();const stored=status.pending?'pending':'remote';return {stored,row,status};
}

export async function submitAccountTripReportObservation(columns){
  if(columns?.schema_version!==1||!columns?.data_quality_flags?.includes(ACCOUNT_TRIP_REPORT_SOURCE))throw new Error('Efterregistreringen har et ugyldigt format og kan ikke gemmes.');
  if(columns.calibration_eligible!==false)throw new Error('Efterregistreringen mangler de nødvendige historiske oplysninger og kan ikke gemmes som en almindelig RavRadar-tur.');
  assertTripEvidencePrivacy(columns);
  let session=currentSession();
  if(session?.access_token&&!session?.user?.id)session=await requireFreshSession();
  if(!session?.user?.id)throw new Error('Log ind, før du indberetter en tur fra din konto.');
  const existing=getLocalObservations().find(row=>row.trip_id===columns.trip_id);
  const submittedAt=new Date().toISOString();
  const row={
    id:existing?.id||columns.trip_id,
    zone_id:columns.actual_zone_id,
    zone_name:columns.zone_name||columns.actual_zone_id,
    coast_type:null,
    observed_at:columns.observed_at,
    submitted_at:submittedAt,
    hunt_mode:columns.hunt_mode,
    result:columns.result,
    grams:columns.grams,
    anonymous_id:existing?.anonymous_id||anonymousId(),
    user_id:session.user.id,
    trip_id:columns.trip_id,
    gps:null,
    rav_score:null,
    score_level:null,
    ai_probability:null,
    ai_confidence:null,
    model_version:null,
    weather_snapshot:{schemaVersion:5,capturedAt:submittedAt,reportSource:ACCOUNT_TRIP_REPORT_SOURCE,selectedAt:columns.observed_at,historicalSnapshotStatus:HISTORICAL_SNAPSHOT_UNAVAILABLE},
    wind_speed_mps:null,
    wind_direction_deg:null,
    wave_height_m:null,
    wave_period_s:null,
    water_level_cm:null,
    current_speed_mps:null,
    current_direction_deg:null,
    water_temperature_c:null,
    ...columns,
    sync_status:enabled?'pending':'local'
  };
  assertTripEvidencePrivacy(row);
  upsertLocal(row);if(!enabled)return {stored:'local',row};enqueue(row);const status=await syncPendingObservations();const stored=status.pending?'pending':'remote';return {stored,row,status};
}
if(typeof window!=='undefined'){window.addEventListener('online',()=>syncPendingObservations().catch(()=>{}));}
