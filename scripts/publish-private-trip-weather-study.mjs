// Fixed existing GitHub operator operation -> existing protected admin document.
import {execFileSync} from 'node:child_process';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {readTripWeatherAggregate} from './lib/trip-weather-aggregate-client.mjs';
import {publishPrivateTripStudyAdmin} from './lib/private-trip-study-admin-transport.mjs';

// Fixed diagnostic vocabulary only. Never retain child output, headers, causes,
// report rows, credentials or arbitrary provider error strings in this receipt.
const OPERATOR_PHASES = new Set(['AUTHORITY','MAIN_FETCH','MAIN_IDENTITY','SOURCE_PROOF',
  'PRIVATE_ACTIVATION','AGGREGATE','ADMIN_PUBLISH','UNKNOWN']);
const COMMAND_PHASES = new Set(['MAIN_FETCH','MAIN_IDENTITY','SOURCE_PROOF','PRIVATE_ACTIVATION']);
const OPERATOR_ERROR_CODES = new Set([
  'PRIVATE_STUDY_OPERATOR_AUTHORITY','PRIVATE_STUDY_OPERATOR_SOURCE','PRIVATE_STUDY_ACTIVATION_UNVERIFIED',
  'PRIVATE_STUDY_EXPORT_MODE_INVALID','AGGREGATE_FROZEN_REPLAY_INVALID','AGGREGATE_FROZEN_IDENTITY_MISMATCH',
  'AGGREGATE_CONFIGURATION_INVALID','AGGREGATE_READ_TIMEOUT','AGGREGATE_READ_REJECTED',
  'AGGREGATE_RESPONSE_TOO_LARGE','AGGREGATE_RESPONSE_INVALID','AGGREGATE_ACCOUNT_INVENTORY_INCOMPLETE',
  'AGGREGATE_ACCOUNT_CAP_REACHED','AGGREGATE_ACCOUNT_METADATA_INVALID','AGGREGATE_PREFERENCE_METADATA_INVALID',
  'AGGREGATE_PREFERENCES_CHANGED','AGGREGATE_JOB_SELECTION_CHANGED','AGGREGATE_PROGRESS_NOT_ADVANCED',
  'AGGREGATE_PROGRESS_INCOMPLETE','AGGREGATE_CALLER_TIMEOUT',
  'PRIVATE_STUDY_ACCESS_UNVERIFIED','PRIVATE_STUDY_TRANSPORT_REJECTED','PRIVATE_STUDY_TRANSPORT_INVALID',
  'PRIVATE_STUDY_TRANSPORT_BOUND','PRIVATE_STUDY_TRANSPORT_TIMEOUT','PRIVATE_STUDY_CONFIGURATION',
  'PRIVATE_STUDY_DOCUMENT_INVALID','PRIVATE_STUDY_DOCUMENT_CONFLICT','PRIVATE_STUDY_DOCUMENT_WRITE_OUTCOME_UNKNOWN',
]);
function operatorFailureReport(error, phase = 'UNKNOWN') {
  phase = OPERATOR_PHASES.has(phase) ? phase : 'UNKNOWN';
  let message, code;
  try { message = error?.message; code = error?.code; } catch { /* Unknown getters are not diagnostics. */ }
  let errorCode = OPERATOR_ERROR_CODES.has(message) ? message : 'PRIVATE_STUDY_OPERATOR_UNCLASSIFIED';
  if (errorCode === 'PRIVATE_STUDY_OPERATOR_UNCLASSIFIED' && COMMAND_PHASES.has(phase)) {
    errorCode = code === 'ETIMEDOUT' ? 'PRIVATE_STUDY_OPERATOR_COMMAND_TIMEOUT'
      : code === 'ENOBUFS' ? 'PRIVATE_STUDY_OPERATOR_COMMAND_OUTPUT_LIMIT'
      : code === 'ENOENT' ? 'PRIVATE_STUDY_OPERATOR_PROGRAM_UNAVAILABLE'
      : 'PRIVATE_STUDY_OPERATOR_COMMAND_FAILED';
  }
  return Object.freeze({kind:'PRIVATE_STUDY_OPERATOR_FAILED', phase, errorCode,
    writeOutcome:['AUTHORITY','MAIN_FETCH','MAIN_IDENTITY','SOURCE_PROOF','PRIVATE_ACTIVATION'].includes(phase)
      ? 'NOT_STARTED' : 'UNKNOWN_NO_RETRY'});
}
class PrivateStudyOperatorFailure extends Error {
  constructor(error, phase) {
    super('PRIVATE_STUDY_OPERATOR_FAILED');
    this.report = operatorFailureReport(error, phase);
  }
}
export async function publishOwnerPrivateTripStudy(){
  let phase = 'AUTHORITY';
  try {
  const env=process.env;
  const manual=env.GITHUB_EVENT_NAME==='workflow_dispatch'&&!env.PRIVATE_STUDY_EVENT_SCHEDULE;
  const scheduled=env.GITHUB_EVENT_NAME==='schedule'&&env.PRIVATE_STUDY_EVENT_SCHEDULE==='47 6 1 * *'
    &&(env.PRIVATE_STUDY_EXPORT_MODE||'ordinary')==='ordinary'
    &&['PRIVATE_STUDY_FROZEN_MONTH','PRIVATE_STUDY_FROZEN_BINDING_SHA256','PRIVATE_STUDY_FROZEN_REPORT_SHA256'].every(key=>!env[key]);
  if(process.argv.length!==2||(!manual&&!scheduled)||env.GITHUB_WORKFLOW!=='Private RavRadar trip weather study'
    ||env.GITHUB_REF!=='refs/heads/main'||env.GITHUB_RUN_ATTEMPT!=='1'||env.TRIP_STORAGE_OPERATION!=='private-study-export'
    ||!/^[a-f0-9]{40}$/.test(env.GITHUB_SHA||''))throw Error('PRIVATE_STUDY_OPERATOR_AUTHORITY');
  const exportMode = env.PRIVATE_STUDY_EXPORT_MODE || 'ordinary';
  const frozenValues = [env.PRIVATE_STUDY_FROZEN_MONTH, env.PRIVATE_STUDY_FROZEN_BINDING_SHA256, env.PRIVATE_STUDY_FROZEN_REPORT_SHA256];
  if (!['ordinary','frozen-replay'].includes(exportMode)
    || exportMode === 'ordinary' && frozenValues.some(value => value !== undefined && value !== '')
    || exportMode === 'frozen-replay' && (!/^\d{4}-(0[1-9]|1[0-2])$/.test(frozenValues[0] || '')
      || !frozenValues.slice(1).every(value => typeof value === 'string' && /^[a-f0-9]{64}$/.test(value)))) throw Error('PRIVATE_STUDY_EXPORT_MODE_INVALID');
  const frozenReplay = exportMode === 'frozen-replay' ? {month:frozenValues[0], modelBindingSha256:frozenValues[1], reportSha256:frozenValues[2]} : undefined;
  const childEnv={...env};for(const key of ['SUPABASE_ACCESS_TOKEN','SUPABASE_SERVICE_ROLE_KEY','TRIP_GATEWAY_SHARED_SECRET','TRIP_PSEUDONYM_SECRET_V1','CLOUDFLARE_API_TOKEN'])delete childEnv[key];
  const read=(command,args)=>execFileSync(command,args,{env:childEnv,encoding:'utf8',stdio:['ignore','pipe','pipe'],timeout:60000,maxBuffer:65536});
  phase = 'MAIN_FETCH';
  read('git',['fetch','--no-tags','origin','+refs/heads/main:refs/remotes/origin/main']);
  phase = 'MAIN_IDENTITY';
  for(const ref of ['HEAD^{commit}','origin/main^{commit}'])if(read('git',['rev-parse',ref]).trim()!==env.GITHUB_SHA)throw Error('PRIVATE_STUDY_OPERATOR_SOURCE');
  phase = 'SOURCE_PROOF';
  if(!/^Source gate: required=false; reason=[^\r\n]+$/m.test(read('node',['scripts/weather-source-gate.mjs','check'])))throw Error('PRIVATE_STUDY_OPERATOR_SOURCE');
  if(scheduled){
    phase = 'PRIVATE_ACTIVATION';
    const planEnv={...env,SUPABASE_PROJECT_ID:'afqhhdrkjfjtpadntdzo',TRIP_STORAGE_OPERATION:'existing-private-study-upgrade',
      TRIP_STORAGE_PRIVATE_STUDY:'1',TRIP_PRIVATE_STUDY_MODE:'plan',TRIP_PRIVATE_STUDY_ENABLE_CONFIRMATION:'',
      TRIP_PRIVATE_STUDY_APPLY_ALLOWED:'false',TRIP_PRIVATE_STUDY_JOBS_APPLY_ALLOWED:'false',
      TRIP_PRIVATE_STUDY_JOB_BINDING_APPLY_ALLOWED:'false',TRIP_PRIVATE_STUDY_CATEGORICAL_APPLY_ALLOWED:'false'};
    for(const key of ['SUPABASE_SERVICE_ROLE_KEY','SUPABASE_DB_PASSWORD','TRIP_PSEUDONYM_SECRET_V1','TRIP_GATEWAY_SHARED_SECRET'])delete planEnv[key];
    const activation=JSON.parse(execFileSync('node',['scripts/deploy-private-trip-study.mjs'],{
      env:planEnv,encoding:'utf8',stdio:['ignore','pipe','pipe'],timeout:60000,maxBuffer:65536}));
    if(activation?.kind!=='PRIVATE_TRIP_STUDY_CONTROL0_PLAN'||activation.operation!=='READ_ONLY_PLAN'
      ||activation.sourceSha!==env.GITHUB_SHA||!/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/.test(activation.workerVersionId||'')
      ||activation.schemaApplied!==false||activation.workerUpdated!==false
      ||typeof activation.privateAggregationEnabled!=='boolean'||activation.aggregateOffAttested!==!activation.privateAggregationEnabled)
      throw Error('PRIVATE_STUDY_ACTIVATION_UNVERIFIED');
    if(!activation.privateAggregationEnabled)return{kind:'PRIVATE_STUDY_MONTHLY_SKIPPED',
      status:'SKIPPED_PRIVATE_AGGREGATION_OFF',sourceSha:env.GITHUB_SHA,reportExported:false};
    if(activation.state!=='EXACT_004_005_006_007'||activation.originalJobBindingReady!==true||activation.categoricalPolicyReady!==true)
      throw Error('PRIVATE_STUDY_ACTIVATION_UNVERIFIED');
  }
  phase = 'AGGREGATE';
  const report=await readTripWeatherAggregate({supabaseUrl:'https://afqhhdrkjfjtpadntdzo.supabase.co',
    serviceRoleKey:env.SUPABASE_SERVICE_ROLE_KEY,gatewayUrl:env.CLOUDFLARE_TRIP_GATEWAY_URL,
    sharedSecret:env.TRIP_GATEWAY_SHARED_SECRET,pseudonymSecret:env.TRIP_PSEUDONYM_SECRET_V1,
    ...(frozenReplay ? {frozenReplay} : {})});
  phase = 'ADMIN_PUBLISH';
  return await publishPrivateTripStudyAdmin(report,{serviceRoleKey:env.SUPABASE_SERVICE_ROLE_KEY,accessToken:env.SUPABASE_ACCESS_TOKEN});
  } catch (error) {
    throw new PrivateStudyOperatorFailure(error, phase);
  }
}
if(process.argv[1]&&pathToFileURL(path.resolve(process.argv[1])).href===import.meta.url){
  publishOwnerPrivateTripStudy().then(receipt=>console.log(JSON.stringify(receipt))).catch(error=>{
    let failure=operatorFailureReport(null);
    try { if(error instanceof PrivateStudyOperatorFailure)failure=error.report; } catch { /* Unknown error objects stay redacted. */ }
    console.error(JSON.stringify(failure));process.exitCode=1;
  });
}
