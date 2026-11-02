// Fixed existing GitHub operator operation -> existing protected admin document.
import {execFileSync} from 'node:child_process';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {readTripWeatherAggregate} from './lib/trip-weather-aggregate-client.mjs';
import {publishPrivateTripStudyAdmin} from './lib/private-trip-study-admin-transport.mjs';

// Fixed diagnostic vocabulary only. Never retain child output, headers, causes,
// report rows, credentials or arbitrary provider error strings in this receipt.
const OPERATOR_PHASES = new Set(['AUTHORITY','MAIN_FETCH','MAIN_IDENTITY','SOURCE_PROOF',
  'AGGREGATE','ADMIN_PUBLISH','UNKNOWN']);
const COMMAND_PHASES = new Set(['MAIN_FETCH','MAIN_IDENTITY','SOURCE_PROOF']);
const OPERATOR_ERROR_CODES = new Set([
  'PRIVATE_STUDY_OPERATOR_AUTHORITY','PRIVATE_STUDY_OPERATOR_SOURCE',
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
    writeOutcome:['AUTHORITY','MAIN_FETCH','MAIN_IDENTITY','SOURCE_PROOF'].includes(phase)
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
  if(process.argv.length!==2||env.GITHUB_EVENT_NAME!=='workflow_dispatch'||env.GITHUB_WORKFLOW!=='Private RavRadar trip weather study'
    ||env.GITHUB_REF!=='refs/heads/main'||env.GITHUB_RUN_ATTEMPT!=='1'||env.TRIP_STORAGE_OPERATION!=='private-study-export'
    ||!/^[a-f0-9]{40}$/.test(env.GITHUB_SHA||''))throw Error('PRIVATE_STUDY_OPERATOR_AUTHORITY');
  const childEnv={...env};for(const key of ['SUPABASE_ACCESS_TOKEN','SUPABASE_SERVICE_ROLE_KEY','TRIP_GATEWAY_SHARED_SECRET','TRIP_PSEUDONYM_SECRET_V1','CLOUDFLARE_API_TOKEN'])delete childEnv[key];
  const read=(command,args)=>execFileSync(command,args,{env:childEnv,encoding:'utf8',stdio:['ignore','pipe','pipe'],timeout:60000,maxBuffer:65536});
  phase = 'MAIN_FETCH';
  read('git',['fetch','--no-tags','origin','+refs/heads/main:refs/remotes/origin/main']);
  phase = 'MAIN_IDENTITY';
  for(const ref of ['HEAD^{commit}','origin/main^{commit}'])if(read('git',['rev-parse',ref]).trim()!==env.GITHUB_SHA)throw Error('PRIVATE_STUDY_OPERATOR_SOURCE');
  phase = 'SOURCE_PROOF';
  if(!/^Source gate: required=false; reason=[^\r\n]+$/m.test(read('node',['scripts/weather-source-gate.mjs','check'])))throw Error('PRIVATE_STUDY_OPERATOR_SOURCE');
  phase = 'AGGREGATE';
  const report=await readTripWeatherAggregate({supabaseUrl:'https://afqhhdrkjfjtpadntdzo.supabase.co',
    serviceRoleKey:env.SUPABASE_SERVICE_ROLE_KEY,gatewayUrl:env.CLOUDFLARE_TRIP_GATEWAY_URL,
    sharedSecret:env.TRIP_GATEWAY_SHARED_SECRET,pseudonymSecret:env.TRIP_PSEUDONYM_SECRET_V1});
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
