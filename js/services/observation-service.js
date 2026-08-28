import { PUBLIC_CONFIG } from '../../config.js?v=4.0.304';
import { authorizedFetch, currentSession, requireFreshSession } from './auth-service.js?v=4.0.304';
import { assertTripEvidencePrivacy } from './trip-evidence-contract.js?v=4.0.304';
import { ACCOUNT_TRIP_REPORT_SOURCE, HISTORICAL_SNAPSHOT_UNAVAILABLE } from './account-trip-report-contract.js?v=4.0.304';
const enabled=Boolean(PUBLIC_CONFIG.supabaseUrl&&PUBLIC_CONFIG.supabasePublishableKey);
const LOCAL_KEY='ravradar-observations-v2';
const OUTBOX_KEY='ravradar-observation-outbox-v1';
const SNAPSHOT_SCHEMA_VERSION=3;
const WEATHER_SNAPSHOT_FIELDS=Object.freeze([
  'generatedAt','time','provider','providerLabel','windSpeedMps','windDirectionDeg','waveHeightM','wavePeriodS',
  'waveDirectionDeg','currentSpeedMps','currentDirectionDeg','waterLevelCm','waterLevelTrendCm3h','waterTemperatureC'
]);
function read(key,fallback=[]){try{return JSON.parse(localStorage.getItem(key)||'null')??fallback;}catch{return fallback;}}
function write(key,value){localStorage.setItem(key,JSON.stringify(value));}
function anonymousId(){const key='ravradar-anonymous-id';let value=localStorage.getItem(key);if(!value){value=crypto.randomUUID();localStorage.setItem(key,value);}return value;}
function publicWeatherSnapshot(weather){const source=weather&&typeof weather==='object'?weather:{};return Object.fromEntries(WEATHER_SNAPSHOT_FIELDS.map(key=>[key,source[key]??null]));}
function publicPredictionSnapshot(prediction){const source=prediction&&typeof prediction==='object'?prediction:{};return {probability:source.probability??null,confidence:source.confidence??null,modelVersion:source.modelVersion??null};}
function immutableWeatherSnapshot(weather,scoreResult,prediction){return structuredClone({schemaVersion:SNAPSHOT_SCHEMA_VERSION,capturedAt:new Date().toISOString(),sourceGeneratedAt:weather?.generatedAt??null,forecastTime:weather?.time??null,provider:weather?.provider??null,current:publicWeatherSnapshot(weather),score:{baseScore:scoreResult?.baseScore??scoreResult?.score??null,finalScore:scoreResult?.score??null,level:scoreResult?.level??null},prediction:publicPredictionSnapshot(prediction||scoreResult?.prediction),matchedRuleIds:(scoreResult?.ruleEvaluation?.matches??[]).map(match=>String(match?.id??match?.ruleId??'').slice(0,120)).filter(Boolean).slice(0,40)});}
export function observationsEnabled(){return enabled;}
export function getLocalObservations(){return read(LOCAL_KEY,[]);}
export function getObservationSyncStatus(){const rows=getLocalObservations(),pending=read(OUTBOX_KEY,[]);return {local:rows.length,pending:pending.length,synced:rows.filter(x=>x.sync_status==='synced').length,lastAttemptAt:localStorage.getItem('ravradar-observation-last-sync')};}
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
function upsertLocal(row){const rows=getLocalObservations();const i=rows.findIndex(x=>x.id===row.id);if(i>=0)rows[i]=row;else rows.push(row);write(LOCAL_KEY,rows);}
function enqueue(row){const rows=read(OUTBOX_KEY,[]);if(!rows.some(x=>x.id===row.id))rows.push(row);write(OUTBOX_KEY,rows);}
export function remoteObservationPayload(row){const {id:clientObservationId,gps:localGps,route,track,position,coordinates,latitude,longitude,location,sync_status,sync_error,synced_at,...remote}=structuredClone(row||{});const publicZoneId=remote.actual_zone_id||(typeof remote.zone_id==='string'?remote.zone_id:null);return {...remote,zone_id:Number.isSafeInteger(remote.zone_id)?remote.zone_id:null,actual_zone_id:publicZoneId,client_observation_id:clientObservationId,gps:null};}
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
export async function syncPendingObservations(){if(!enabled)return getObservationSyncStatus();const queue=read(OUTBOX_KEY,[]),remaining=[];for(const row of queue){try{await postRemote({...row,sync_status:undefined,sync_error:undefined});upsertLocal({...row,sync_status:'synced',synced_at:new Date().toISOString(),sync_error:null});}catch(error){remaining.push({...row,sync_status:'pending',sync_error:error.message});upsertLocal({...row,sync_status:'pending',sync_error:error.message});}}write(OUTBOX_KEY,remaining);localStorage.setItem('ravradar-observation-last-sync',new Date().toISOString());return getObservationSyncStatus();}
export async function submitObservation({zone,huntMode,result,grams=null,scoreResult,weather,gps=null,tripId=null,observedAt=null,prediction=null}){
  const session=currentSession();const row={id:crypto.randomUUID(),zone_id:zone.id,zone_name:zone.name,coast_type:zone.coastType||null,observed_at:observedAt||new Date().toISOString(),submitted_at:new Date().toISOString(),hunt_mode:huntMode,result,grams:grams===''||grams==null?null:Number(grams),anonymous_id:anonymousId(),user_id:session?.user?.id||null,trip_id:tripId,gps,rav_score:scoreResult?.score??null,score_level:scoreResult?.level??null,ai_probability:prediction?.probability??scoreResult?.prediction?.probability??null,ai_confidence:prediction?.confidence??scoreResult?.prediction?.confidence??null,model_version:prediction?.modelVersion??null,weather_snapshot:immutableWeatherSnapshot(weather,scoreResult,prediction),wind_speed_mps:weather?.windSpeedMps??null,wind_direction_deg:weather?.windDirectionDeg??null,wave_height_m:weather?.waveHeightM??null,wave_period_s:weather?.wavePeriodS??null,water_level_cm:weather?.waterLevelCm??null,current_speed_mps:weather?.currentSpeedMps??null,current_direction_deg:weather?.currentDirectionDeg??null,water_temperature_c:weather?.waterTemperatureC??null,sync_status:enabled?'pending':'local'};
  upsertLocal(row);if(!enabled)return {stored:'local',row};enqueue(row);const status=await syncPendingObservations();const stored=status.pending?'pending':'remote';return {stored,row,status};
}
export async function submitTripEvidenceObservation(columns){
  if(columns?.schema_version!==2)throw new Error('Turen har et ugyldigt format og kan ikke gemmes.');
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
