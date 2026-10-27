import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { accountAssistantCatalogQuery, verifyAccountAssistantCatalogMetadata }
  from '../verify-account-assistant-schema.mjs';

const OLD_MIGRATION = '20261010130000_owner_export_origin_bound_successor.sql';
const NEW_MIGRATION = '20261012200000_checkpoint_cas_single_projection_successor.sql';
const ACCOUNT_MIGRATION = '20261013210000_account_assistant_original_bound_successor.sql';
const GRID_MIGRATION = '20261013220000_current_grid_original_bound_successor.sql';
const CAS = 'public.ravradar_ravscore_checkpoint_cas';
const KEY = 'ravscore-continuation-checkpoint';
const signatures = ['ravradar_ravscore_checkpoint_canonical_time',
  'ravradar_ravscore_checkpoint_has_forbidden_key',
  'ravradar_ravscore_checkpoint_integrated_state_valid',
  'ravradar_ravscore_checkpoint_candidate_state_valid',
  'ravradar_ravscore_checkpoint_payload_valid',
  'ravradar_ravscore_checkpoint_predecessor_payload_valid',
  'ravradar_ravscore_checkpoint_top20_predecessor_projection',
  'ravradar_ravscore_checkpoint_cp_close_predecessor_projection',
  'ravradar_ravscore_checkpoint_owner_current_predecessor_projection',
  'ravradar_ravscore_checkpoint_water_level_predecessor_projection',
  'ravradar_ravscore_checkpoint_userdata_predecessor_projection', 'version_admin_document'];
const hash = text => crypto.createHash('sha256').update(text).digest('hex');
const sqlText = text => String(text).replace(/\r\n?/g, '\n');

// Source-test diagnostic only. Raw stderr, SQL, JSON and values are never
// returned or emitted; unknown state/phase remains explicitly UNKNOWN.
const NATIVE_PSQL_PHASES = new Set(['NATIVE_SETUP', 'CAS200_MIGRATION',
  'BASELINE_FIXTURES', 'BASELINE_ADMISSION', 'BASELINE_CAS_CASES',
  'ACCOUNT213', 'CURRENT220', 'STATISTICS230', 'NATIVE_IDENTITY0600', 'CURRENT_MEMORY_WARMUP',
  'ESTABLISHED_NATIVE_CURRENT_ORIGIN', 'LAST_MILE_ENCLOSURE', 'ACCOUNT_STATISTICS_ASSISTANT', 'NATIVE_ORIGINAL_CONTINUITY', 'ASSISTANT_LATER_H0', 'ASSISTANT_PUBLIC587_SUCCESSOR', 'SOURCE_PRODUCER',
  'SOURCE_CURRENT_FULL_BOOTSTRAP', 'SOURCE_CURRENT_FULL_READBACK', 'SOURCE_CURRENT_CASE_ISOLATION', 'SOURCE_LEGACY_COMPATIBILITY',
  'SOURCE_LEGACY_FOLLOWER', 'SOURCE_LEGACY_BINDINGS', 'SOURCE_LEGACY_PROVIDERS',
  'SOURCE_LEGACY_SETUP', 'SOURCE_LEGACY_PRODUCER', 'SOURCE_LEGACY_ORIGINALS', 'SOURCE_LEGACY_RESTORE',
  'SOURCE_LEGACY_UPDATER', 'SOURCE_LEGACY_SAVE', 'SOURCE_LEGACY_READBACK',
  'SOURCE_LEGACY_PRODUCER_SETUP',
  'SOURCE_LEGACY_PRODUCER_ARCHIVE',
  'SOURCE_LEGACY_PRODUCER_UPDATER585',
  'SOURCE_LEGACY_PRODUCER_PUBLIC585',
  'SOURCE_LEGACY_PRODUCER_SAVE585',
  'SOURCE_LEGACY_PRODUCER_RESTORE585',
  'SOURCE_LEGACY_PRODUCER_FOLLOWER585',
  'SOURCE_LEGACY_PRODUCER_NATIVE586',
  'SOURCE_LEGACY_PRODUCER_FOLLOWER587',
  'SOURCE_LEGACY_PRODUCER_FOLLOWER588',
  'SOURCE_LEGACY_PRODUCER_SOURCE_METADATA',
  'SOURCE_LEGACY_PRODUCER_FINISH',
  'NATIVE_CLEANUP', 'UNKNOWN']);
const NATIVE_PSQL_STATES = Object.freeze({
  '22003':'SQL_RANGE', '22023':'SQL_PARAMETER', '22P02':'SQL_TEXT_FORMAT',
  '23502':'SQL_NOT_NULL', '23503':'SQL_FOREIGN_KEY', '23505':'SQL_UNIQUE',
  '23514':'SQL_CHECK', '28000':'SQL_AUTHENTICATION', '40001':'SQL_CAS_CONFLICT',
  '40P01':'SQL_DEADLOCK', '42501':'SQL_PERMISSION', '42601':'SQL_SYNTAX',
  '42703':'SQL_UNDEFINED_COLUMN', '42804':'SQL_DATATYPE',
  '42809':'SQL_OBJECT_TYPE', '42883':'SQL_UNDEFINED_FUNCTION',
  '42P01':'SQL_UNDEFINED_TABLE', '53200':'SQL_MEMORY',
  '54000':'SQL_LIMIT', '54001':'SQL_COMPLEXITY', '55P03':'SQL_LOCK',
  '57014':'SQL_CANCELED', 'P0001':'SQL_RAISED_EXCEPTION', 'XX000':'SQL_INTERNAL',
});
export function nativePostgresFailureDiagnostic(phase, stderr) {
  const safePhase = NATIVE_PSQL_PHASES.has(phase) ? phase : 'UNKNOWN';
  // psql VERBOSITY=sqlstate prints only the actual code for ERROR/FATAL.
  // No guessed extraction of messages, DETAIL, CONTEXT or arbitrary keys.
  const match = typeof stderr === 'string' && Buffer.byteLength(stderr) <= 16_384
    ? /(?:^|\n)[^\r\n]*\b(?:ERROR|FATAL):[ \t]+([A-Z0-9]{5})[ \t]*\r?(?:\n|$)/.exec(stderr) : null;
  const sqlState = match && Object.hasOwn(NATIVE_PSQL_STATES, match[1]) ? match[1] : 'UNKNOWN';
  return Object.freeze({ phase:safePhase, sqlState,
    category:sqlState === 'UNKNOWN' ? 'PSQL_COMMAND_FAILURE' : NATIVE_PSQL_STATES[sqlState] });
}
export function nativePostgresFailureAnnotation(phase, stderr) {
  const safe = nativePostgresFailureDiagnostic(phase, stderr);
  return '::error title=Native PostgreSQL source command::phase=' + safe.phase
    + ' sqlstate=' + safe.sqlState + ' category=' + safe.category;
}

// SOURCE-only diagnostics and child capture, copied from the reviewed v2 owner.
const NATIVE_FIXED_EXCEPTION_CODES=new Set(['NATIVE_POSTGRES_ASSERTION_FAILED','NATIVE_POSTGRES_UNKNOWN_FAILURE',
  'NATIVE_POSTGRES_SQL_COMMAND_FAILED','NATIVE_POSTGRES_SOURCE_LEGACY_COMPATIBILITY_REFUSED',
  'NATIVE_POSTGRES_UNAVAILABLE_ON_THIS_HOST','NATIVE_POSTGRES_PG_CONFIG_UNAVAILABLE',
  'NATIVE_POSTGRES_COMPLETE_EXISTING_BINARIES_UNAVAILABLE']);
// Fixed observations from actual Node code/name only. Never derive a new
// category from message, path, assertion values or caller-supplied text.
const NATIVE_NODE_EXCEPTION_CODES=Object.freeze({
  ENOENT:'NATIVE_POSTGRES_NODE_ENOENT',ENOSPC:'NATIVE_POSTGRES_NODE_ENOSPC',
  EACCES:'NATIVE_POSTGRES_NODE_EACCES',EPERM:'NATIVE_POSTGRES_NODE_EPERM',
  ENOMEM:'NATIVE_POSTGRES_NODE_ENOMEM',EMFILE:'NATIVE_POSTGRES_NODE_EMFILE',
  EPIPE:'NATIVE_POSTGRES_NODE_EPIPE',
  ERR_MODULE_NOT_FOUND:'NATIVE_POSTGRES_NODE_MODULE_NOT_FOUND',
  MODULE_NOT_FOUND:'NATIVE_POSTGRES_NODE_MODULE_NOT_FOUND',
});
const NATIVE_NODE_EXCEPTION_NAMES=Object.freeze({
  TypeError:'NATIVE_POSTGRES_NODE_TYPE_ERROR',SyntaxError:'NATIVE_POSTGRES_NODE_SYNTAX_ERROR',
  RangeError:'NATIVE_POSTGRES_NODE_RANGE_ERROR',ReferenceError:'NATIVE_POSTGRES_NODE_REFERENCE_ERROR',
});
// Exact fixed messages from the authenticated operative585 DMI file module
// e7c2e14a6403870e8a1df6c91862980640684733, whole SHA ac1cbf3909daad48e126a23c1c724e942344750c8856308c2e2a74d842a053a6.
// Observation only: no raw message, admission, guard or frozen source is changed.
const NATIVE_DMI_FORECAST_EXCEPTION_MESSAGES=Object.freeze({
  DMI_FORECAST_FILE_BOUNDS_INVALID:'NATIVE_POSTGRES_DMI_FORECAST_BOUNDS_INVALID',
  DMI_FORECAST_FILE_CHANGED:'NATIVE_POSTGRES_DMI_FORECAST_CHANGED',
  DMI_FORECAST_FILE_CLEANUP_UNPROVED:'NATIVE_POSTGRES_DMI_FORECAST_CLEANUP_UNPROVED',
  DMI_FORECAST_FILE_DUPLICATE_KEY:'NATIVE_POSTGRES_DMI_FORECAST_DUPLICATE_KEY',
  DMI_FORECAST_FILE_INVALID_FILE:'NATIVE_POSTGRES_DMI_FORECAST_INVALID_FILE',
  DMI_FORECAST_FILE_INVALID_JSON:'NATIVE_POSTGRES_DMI_FORECAST_INVALID_JSON',
  DMI_FORECAST_FILE_INVALID_KEY:'NATIVE_POSTGRES_DMI_FORECAST_INVALID_KEY',
  DMI_FORECAST_FILE_INVALID_SIZE:'NATIVE_POSTGRES_DMI_FORECAST_INVALID_SIZE',
  DMI_FORECAST_FILE_MISSING:'NATIVE_POSTGRES_DMI_FORECAST_MISSING',
  DMI_FORECAST_FILE_PUBLICATION_UNPROVED:'NATIVE_POSTGRES_DMI_FORECAST_PUBLICATION_UNPROVED',
  DMI_FORECAST_FILE_READ_UNAVAILABLE:'NATIVE_POSTGRES_DMI_FORECAST_READ_UNAVAILABLE',
  DMI_FORECAST_FILE_RECORD_DESCRIPTOR_INVALID:'NATIVE_POSTGRES_DMI_FORECAST_RECORD_DESCRIPTOR_INVALID',
  DMI_FORECAST_FILE_RECORD_SIZE_LIMIT:'NATIVE_POSTGRES_DMI_FORECAST_RECORD_SIZE_LIMIT',
  DMI_FORECAST_FILE_SHAPE_INVALID:'NATIVE_POSTGRES_DMI_FORECAST_SHAPE_INVALID',
  DMI_FORECAST_FILE_STRUCTURE_LIMIT:'NATIVE_POSTGRES_DMI_FORECAST_STRUCTURE_LIMIT',
  DMI_FORECAST_FILE_WRITE_CONTENT_CHANGED:'NATIVE_POSTGRES_DMI_FORECAST_WRITE_CONTENT_CHANGED',
  DMI_FORECAST_FILE_WRITE_INCOMPLETE:'NATIVE_POSTGRES_DMI_FORECAST_WRITE_INCOMPLETE',
});
const NATIVE_EXCEPTION_CODES=new Set([...NATIVE_FIXED_EXCEPTION_CODES,
  ...Object.values(NATIVE_NODE_EXCEPTION_CODES),...Object.values(NATIVE_NODE_EXCEPTION_NAMES),
  ...Object.values(NATIVE_DMI_FORECAST_EXCEPTION_MESSAGES)]);
export function nativePostgresExceptionCode(error) {
  try {
    // Preserve the existing fixed error messages; Node's appended assertion
    // values remain private. New Node categories require actual code/name.
    const message=error?.message;
    if(typeof message==='string'&&Object.hasOwn(NATIVE_DMI_FORECAST_EXCEPTION_MESSAGES,message))
      return NATIVE_DMI_FORECAST_EXCEPTION_MESSAGES[message];
    const first = typeof message === 'string' ? message.split(/\r?\n/, 1)[0] : '';
    if (NATIVE_FIXED_EXCEPTION_CODES.has(first)) return first;
    if(error?.code==='ERR_ASSERTION')return 'NATIVE_POSTGRES_ASSERTION_FAILED';
    const code=error?.code,name=error?.name;
    if(typeof code==='string'&&Object.hasOwn(NATIVE_NODE_EXCEPTION_CODES,code))return NATIVE_NODE_EXCEPTION_CODES[code];
    if(typeof name==='string'&&Object.hasOwn(NATIVE_NODE_EXCEPTION_NAMES,name))return NATIVE_NODE_EXCEPTION_NAMES[name];
    return 'NATIVE_POSTGRES_UNKNOWN_FAILURE';
  } catch { return 'NATIVE_POSTGRES_UNKNOWN_FAILURE'; }
}
export async function nativePostgresExceptionDiagnostic(error, phase) {
  const result = {kind:'NATIVE_POSTGRES_FIRST_FAILURE',
    phase:NATIVE_PSQL_PHASES.has(phase)?phase:'UNKNOWN',code:nativePostgresExceptionCode(error),
    frame:null,privatePayloadIncluded:false};
  try {
    const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
    const stack=error?.stack;
    if(typeof stack!=='string'||stack.length>2*1024*1024)return result;
    for(const line of stack.split(/\r?\n/)){
      const match=/^\s+at (?:[^\r\n()]* \()?((?:file:\/\/\/)[^\r\n()]+):(\d+):(\d+)\)?$/.exec(line);
      if(!match)continue;
      try{
        const url=new URL(match[1]);if(url.host||url.search||url.hash)continue;
        const file=fileURLToPath(url),relative=path.relative(root,file).split(path.sep).join('/');
        if(!/^(?:scripts|js\/core)\/[A-Za-z0-9_./-]+\.(?:mjs|js)$/.test(relative)
          ||relative.split('/').includes('..')||await fs.realpath(file)!==file)continue;
        const before=await fs.lstat(file,{bigint:true});
        if(!before.isFile()||before.isSymbolicLink()||before.nlink!==1n||before.size>2n*1024n*1024n)continue;
        const body=await fs.readFile(file),after=await fs.lstat(file,{bigint:true});
        const identity=value=>[value.dev,value.ino,value.size,value.mtimeNs,value.ctimeNs];
        if(!identity(before).every((value,index)=>value===identity(after)[index])||BigInt(body.length)!==before.size)continue;
        const at=Number(match[2]),column=Number(match[3]);
        if(!Number.isSafeInteger(at)||at<1||at>body.toString('utf8').split(/\r?\n/).length
          ||!Number.isSafeInteger(column)||column<1||column>100000)continue;
        result.frame={module:relative,sha256:hash(body),line:at,column};break;
      }catch{} // An unqualified frame stays unknown; never expose its path.
    }
  }catch{} // Diagnostic failure cannot replace the original error.
  return result;
}
export async function emitNativePostgresFirstFailure(error,phase){
  try{console.error(JSON.stringify(await nativePostgresExceptionDiagnostic(error,phase)));}catch{}
}
export function currentSourceNativeFirstFailure(stdout){
  const fixedReasons=new Set(["SOURCE_CURRENT_PROFILE_PENDING_FULL_PG_SCHEMA","SOURCE_CURRENT_PROFILE_PENDING_GENUINE_CENTRAL_PROFILE","SOURCE_CURRENT_PROFILE_PENDING_NORMAL_POST64_API","SOURCE_CURRENT_PROFILE_PENDING_LOCKED_SDK","SOURCE_CURRENT_PROFILE_PENDING_ACTUAL_GREEN_SOURCE_GATE","SOURCE_CURRENT_PROFILE_PG_CONTEXT","SOURCE_CURRENT_PROFILE_PG_OWNER_CHANGED","SOURCE_CURRENT_PROFILE_ACTUAL_PG_CALL_FAILED","CURRENT_POST64_SOURCE_UNISSUED","CURRENT_POST64_OWN_PARENT_REQUIRED","CURRENT_POST64_NORMAL_POLICY_REQUIRED","CURRENT_POST64_ORIGINAL_BYTES_CHANGED","CURRENT_POST64_OBJECT_BYTES_CHANGED","CURRENT_POST64_OBJECT_IDENTITY_CHANGED","CURRENT_POST64_OWNER_CHANGED","CURRENT_POST64_CHECKPOINT_BODY","CURRENT_POST64_POINTER_CAS","CURRENT_POST64_POINTER_VERSION","CURRENT_POST64_CENTRAL_CAS_BODY","CURRENT_POST64_DOCUMENT_INSERT","CURRENT_POST64_IMMUTABLE_HEADERS","CURRENT_POST64_OBJECT_DIGEST_KEY","CURRENT_POST64_PART_DIGEST_KEY","CURRENT_POST64_BODY_BOUND","CURRENT_POST64_BODY_TRUNCATED","CURRENT_POST64_REMOVE_NOT_CREATED","CURRENT_POST64_REMOVE_REFERENCED_OR_UNKNOWN","CURRENT_POST64_WRITE_READBACK","CURRENT_NATIVE_ACTIVATION_GENUINE_SOURCE_REQUIRED","UNKNOWN","GENUINE_SOURCE_INPUT_MISSING","SOURCE_UNISSUED","GENUINE_SOURCE_SEAL_REQUIRED","NORMAL_ACTIVATION_REFUSED","CANDIDATE_PUBLIC_PACK_REBUILD_REQUIRED","NONPUBLIC_FETCH","GENUINE_PREFIX_INPUT_MISSING","CANDIDATE_NORMAL_CONTINUATION_NOT_READY","CANDIDATE_NORMAL_NATIONAL_NOT_READY","NORMAL_INITIALIZATION_REFUSED"]);
  let firstProfileFailure=null;
  for(const line of stdout.split(/\r?\n/)){
    if(line.length>2048)continue;let value;try{value=JSON.parse(line);}catch{continue;}
    if(value?.kind!=='CURRENT_SOURCE_NATIVE_FIRST_FAILURE')continue;
    assert.deepEqual(Object.keys(value).sort(),['kind','phase','privatePayloadIncluded','reason','route','sqlstate']);
    assert(['CURRENT_CASE','PG_SQL','POST64_TRANSPORT','CENTRAL_ACTIVATION','UNKNOWN'].includes(value.phase));
    assert(['CHECKPOINT_CAS','OPERATIONAL_CAS','POINTER_CAS','STORAGE','NONE','UNKNOWN'].includes(value.route));
    assert(fixedReasons.has(value.reason));assert.equal(value.privatePayloadIncluded,false);
    assert(/^(?:[0-9A-Z]{5}|UNKNOWN)$/.test(value.sqlstate));firstProfileFailure=value;break;
  }
  return firstProfileFailure;
}
const SOURCE_PROVIDER_NEED_CODES=new Set(["CURRENT_NATIVE_PROVIDER_ABSOLUTE_PATH","CURRENT_NATIVE_PROVIDER_ADMIN_COPY_CHANGED","CURRENT_NATIVE_PROVIDER_ADMIN_INPUT_MISSING","CURRENT_NATIVE_PROVIDER_BASIS_DESTINATION_EXISTS","CURRENT_NATIVE_PROVIDER_CLEAN_NATIVE_ACQUISITION_MODE","CURRENT_NATIVE_PROVIDER_ECCODES_REQUIRED","CURRENT_NATIVE_PROVIDER_EMPTY_NORMAL_STATION_SOURCE_REQUIRED","CURRENT_NATIVE_PROVIDER_EXACT_INITIAL_PHASE","CURRENT_NATIVE_PROVIDER_EXACT_INITIAL_PHASE_ARGUMENT","CURRENT_NATIVE_PROVIDER_EXACT_NODE_TARGET_ARGUMENTS","CURRENT_NATIVE_PROVIDER_EXISTING_FIXTURE_DIRECTORY","CURRENT_NATIVE_PROVIDER_EXISTING_OWNED_HOST","CURRENT_NATIVE_PROVIDER_EXTERNAL_NETWORK_REFUSED","CURRENT_NATIVE_PROVIDER_GRID_BOUND","CURRENT_NATIVE_PROVIDER_LINUX_PYTHON312_REQUIRED","CURRENT_NATIVE_PROVIDER_NODE24_REQUIRED","CURRENT_NATIVE_PROVIDER_NORMAL_BASIS_OUTPUT_MISSING","CURRENT_NATIVE_PROVIDER_NORMAL_BULK_READBACK","CURRENT_NATIVE_PROVIDER_NORMAL_CAPTURE_MISSING","CURRENT_NATIVE_PROVIDER_NORMAL_COPERNICUS_RESIDUALS_REQUIRE_DATA","CURRENT_NATIVE_PROVIDER_NORMAL_DECODE_INCOMPLETE","CURRENT_NATIVE_PROVIDER_NORMAL_DECODE_OUTCOMES_INCOMPLETE","CURRENT_NATIVE_PROVIDER_NORMAL_LEDGER_NOT_READY","CURRENT_NATIVE_PROVIDER_NORMAL_MODULE","CURRENT_NATIVE_PROVIDER_NORMAL_NATIVE_PAIR_REJECTED","CURRENT_NATIVE_PROVIDER_NORMAL_PART_TARGETS","CURRENT_NATIVE_PROVIDER_NORMAL_REGISTRY_210_673","CURRENT_NATIVE_PROVIDER_NO_ADOPTED_OLD_BULK","CURRENT_NATIVE_PROVIDER_RAW_CHANGED_AFTER_DECODE","CURRENT_NATIVE_PROVIDER_SAME_ACTION_RUNNER_TEMP","CURRENT_NATIVE_PROVIDER_STAC_HOST","CURRENT_NATIVE_PROVIDER_STAC_PAGE_BOUND","CURRENT_NATIVE_PROVIDER_STAC_ROUTE","CURRENT_NATIVE_PROVIDER_SYMLINK","CURRENT_NATIVE_PROVIDER_TARGET_HOUR","CURRENT_NATIVE_PROVIDER_WRITE_READBACK"]);
const SOURCE_INITIAL_WEATHER_NEED_CODES=new Set(["CURRENT_NATIVE_INITIAL_WEATHER_CURRENT_LEDGER_CHANGED","CURRENT_NATIVE_INITIAL_WEATHER_ECCODES_FIELD_CLASSIFICATION","CURRENT_NATIVE_INITIAL_WEATHER_GRID_BOUND","CURRENT_NATIVE_INITIAL_WEATHER_NORMAL_FULL_WEATHER_DECODE_INCOMPLETE","CURRENT_NATIVE_INITIAL_WEATHER_NORMAL_OFFICIAL_WAVE_IDENTITY","CURRENT_NATIVE_INITIAL_WEATHER_NORMAL_TARGETS_REQUIRED","CURRENT_NATIVE_INITIAL_WEATHER_NORMAL_WAVE_NATIVE_OWNER_NOT_COMPLETE","CURRENT_NATIVE_INITIAL_WEATHER_RAW_CHANGED_AFTER_DECODE","CURRENT_NATIVE_INITIAL_WEATHER_REFERENCE"]);
const SOURCE_PROVIDER_FAILURE_CODES=new Set([...SOURCE_PROVIDER_NEED_CODES,...SOURCE_INITIAL_WEATHER_NEED_CODES]);
const SOURCE_PROVIDER_SIGNALS=new Map([[-1,'SIGHUP'],[-2,'SIGINT'],[-3,'SIGQUIT'],[-6,'SIGABRT'],[-9,'SIGKILL'],[-11,'SIGSEGV'],[-13,'SIGPIPE'],[-15,'SIGTERM']]);
function sourceInitialWamAdmissionValid(value){
  // A fixed failed-admission observation, never a SQL/native/PASS grant.
  try{
    const exact=(item,keys)=>item!==null&&typeof item==='object'&&!Array.isArray(item)
      &&Object.keys(item).sort().join(',')===[...keys].sort().join(',');
    if(!exact(value,['kind','collection','hourOffset','reason','admitted','summary','outcome','privatePayloadIncluded'])
      ||value.kind!=='SOURCE_INITIAL_WAM_ADMISSION_DIAGNOSTIC'||!['wam_nsb','wam_dw'].includes(value.collection)
      ||!Number.isSafeInteger(value.hourOffset)||value.hourOffset<0||value.hourOffset>120
      ||typeof value.admitted!=='boolean'||value.privatePayloadIncluded!==false)return false;
    const counts=['requiredCount','acceptedCount','rejectedCount','acceptedLineageCount','acceptedLineageEvidenceCount'];
    const rejected=['INVALID_WAVE_TUPLE','MISSING_WAVE_DIRECTION','INVALID_WAVE_DIRECTION','ASSET_PROVENANCE_MISMATCH','INVALID_WAVE_PROVENANCE'];
    const {summary,outcome}=value;
    if(!exact(summary,[...counts,'rejectedByCode','rejectedByCodeKnown','unknownRejectionCodeCount','coherent','complete'])
      ||!exact(summary.rejectedByCode,rejected)
      ||!['rejectedByCodeKnown','coherent','complete'].every(key=>typeof summary[key]==='boolean')
      ||!exact(outcome,['hasHeight','hasPeriod','hasDirection','parameterCount','touchedCount','interrupted','messagesSeen','zoneLookups'])
      ||!['hasHeight','hasPeriod','hasDirection','interrupted'].every(key=>typeof outcome[key]==='boolean'))return false;
    const numbers=[...counts.map(key=>summary[key]),summary.unknownRejectionCodeCount,
      ...Object.values(summary.rejectedByCode),...['parameterCount','touchedCount','messagesSeen','zoneLookups'].map(key=>outcome[key])];
    if(!numbers.every(item=>item===null||Number.isSafeInteger(item)&&item>=0&&item<=1_000_000))return false;
    return value.reason==='STAGE_ADMISSION_FALSE'&&value.admitted===false
      ||value.reason==='NATIVE_OWNER_INCOMPLETE'&&value.admitted===true&&summary.complete===false;
  }catch{return false;}
}
function sourceInitialWamCompletionValid(value){
  try{
    const exact=(item,keys)=>item!==null&&typeof item==='object'&&!Array.isArray(item)
      &&Object.keys(item).sort().join(',')===[...keys].sort().join(',');
    if(!exact(value,['kind','collection','hourOffset','callbackInvoked','admitted','outcome',
        'deadlineReached','elapsedMs','privatePayloadIncluded'])
      ||value.kind!=='SOURCE_INITIAL_WAM_COMPLETION_DIAGNOSTIC'
      ||!['wam_nsb','wam_dw'].includes(value.collection)
      ||!Number.isSafeInteger(value.hourOffset)||value.hourOffset<0||value.hourOffset>120
      ||typeof value.callbackInvoked!=='boolean'
      ||(value.callbackInvoked?typeof value.admitted!=='boolean':value.admitted!==null)
      ||typeof value.deadlineReached!=='boolean'||value.privatePayloadIncluded!==false
      ||!exact(value.outcome,['interrupted'])||typeof value.outcome.interrupted!=='boolean')return false;
    const keys=['beforeCurrent','afterCurrent','beforeWam','afterWam'];
    if(!exact(value.elapsedMs,keys))return false;
    const values=keys.map(key=>value.elapsedMs[key]);
    if(!values.every(item=>item===null||Number.isSafeInteger(item)&&item>=0&&item<=86_400_000))return false;
    const observed=values.filter(item=>item!==null);
    return observed.every((item,index)=>index===0||item>=observed[index-1]);
  }catch{return false;}
}
function sourceForecastStageValid(value){
  try{
    const exact=(item,keys)=>item!==null&&typeof item==='object'&&!Array.isArray(item)
      &&Object.keys(item).sort().join(',')===[...keys].sort().join(',');
    const stages=['READ_INPUT','QUALIFY','PACK','WRITE','READBACK','COMPLETE'];
    const bounded=(item,maximum)=>Number.isSafeInteger(item)&&item>=0&&item<=maximum;
    if(!exact(value,['kind','phase','elapsedMs','phaseElapsedMs','completedMs','parentRecords',
        'partCount','qualifiedCurrentRows','bulkZoneCount','packRawBytes','packCompressedBytes',
        'forecastBytes','privatePayloadIncluded',...(Object.hasOwn(value??{},'readback')?['readback']:[])])
      ||value.kind!=='SOURCE_FORECAST_STAGE_OBSERVATION'||!stages.includes(value.phase)
      ||value.privatePayloadIncluded!==false)return false;
    const rank=stages.indexOf(value.phase);
    if(!['elapsedMs','phaseElapsedMs'].every(key=>bounded(value[key],86_400_000))
      ||!bounded(value.parentRecords,210)||!bounded(value.partCount,673)
      ||!Number.isSafeInteger(value.qualifiedCurrentRows)||value.qualifiedCurrentRows!==value.partCount*121
      ||!exact(value.completedMs,stages.slice(0,-1)))return false;
    for(const [index,stage] of stages.slice(0,-1).entries()){
      if(index<rank?!bounded(value.completedMs[stage],86_400_000):value.completedMs[stage]!==null)return false;
    }
    const accounted=Object.values(value.completedMs).reduce((sum,item)=>sum+(item??0),0)+value.phaseElapsedMs;
    if(value.elapsedMs<accounted||value.elapsedMs>accounted+5||rank===5&&value.phaseElapsedMs!==0)return false;
    if(rank===0){
      if(['parentRecords','partCount','qualifiedCurrentRows'].some(key=>value[key]!==0)||value.bulkZoneCount!==null)return false;
    }else if(!bounded(value.bulkZoneCount,1_000_000)||value.bulkZoneCount===0)return false;
    if(rank>=2&&value.partCount!==673)return false;
    for(const [key,maximum,available] of [['packRawBytes',2147483648,rank>=3],
        ['packCompressedBytes',167772160,rank>=3],['forecastBytes',Number.MAX_SAFE_INTEGER,rank>=4]]){
      if(available?(!bounded(value[key],maximum)||value[key]===0):value[key]!==null)return false;
    }
    if(Object.hasOwn(value,'readback')){
      const readback=value.readback,stages=['INSPECT','PARENT_READ','PART_READ','UNPACK','EQUALITY','COMPLETE'];
      if(rank<4||!exact(readback,['phase','completedMs'])||!stages.includes(readback.phase)
        ||!exact(readback.completedMs,stages.slice(0,-1)))return false;
      const subrank=stages.indexOf(readback.phase);
      if((rank===5)!==(subrank===5))return false;
      for(const [index,stage] of stages.slice(0,-1).entries()){
        if(index<subrank?!bounded(readback.completedMs[stage],86_400_000):readback.completedMs[stage]!==null)return false;
      }
      const subtotal=Object.values(readback.completedMs).reduce((sum,item)=>sum+(item??0),0);
      const total=rank===5?value.completedMs.READBACK:value.phaseElapsedMs;
      if(total<subtotal||total>subtotal+5)return false;
    }
    return true;
  }catch{return false;}
}
export function nativeProviderProcessFirstFailure(value){
  try{
    const keys=value&&Object.keys(value).sort().join(',');
    if(!value||!['boundary,kind,phase,privatePayloadIncluded,returncode,signal,stderr,stdout',
        'boundary,forecastStage,kind,phase,privatePayloadIncluded,returncode,signal,stderr,stdout',
        'boundary,kind,phase,privatePayloadIncluded,returncode,signal,stderr,stdout,wamAdmission',
        'boundary,kind,phase,privatePayloadIncluded,returncode,signal,stderr,stdout,wamCompletion',
        'boundary,kind,phase,privatePayloadIncluded,returncode,signal,stderr,stdout,wamAdmission,wamCompletion'].includes(keys)
      ||value.kind!=='SOURCE_PROVIDER_PROCESS_FIRST_FAILURE'||!['PROVIDERS','PROVIDERS-H0','PROVIDERS-H1','PROVIDERS-587'].includes(value.phase)||value.privatePayloadIncluded!==false)return null;
    const code=value.returncode;
    if(code!==null&&(!Number.isSafeInteger(code)||code<-(2**31)||code>=2**31))return null;
    if(value.signal!==(code===null?'UNKNOWN':code>=0?'NONE':SOURCE_PROVIDER_SIGNALS.get(code)??'UNKNOWN'))return null;
    for(const stream of [value.stdout,value.stderr]){
      if(!stream||Object.keys(stream).sort().join(',')!=='bytes,complete,sha256'||typeof stream.complete!=='boolean'
        ||stream.bytes!==null&&(!Number.isSafeInteger(stream.bytes)||stream.bytes<0))return null;
      if(stream.complete){
        if(stream.bytes===null||stream.bytes>16*1024*1024||typeof stream.sha256!=='string'||!/^[a-f0-9]{64}$/.test(stream.sha256))return null;
      }else if(stream.sha256!==null)return null;
    }
    if(Object.hasOwn(value,'wamAdmission')&&(!['PROVIDERS-H0','PROVIDERS-H1'].includes(value.phase)
      ||code===0||!value.stderr.complete||!sourceInitialWamAdmissionValid(value.wamAdmission)))return null;
    const boundary=value.boundary;
    if(boundary!==null){
      if(!value.stderr.complete||Object.keys(boundary).sort().join(',')!=='callsite,exceptionType,helper,kind,privatePayloadIncluded,reason,timeoutSeconds'
        ||boundary.kind!=='SOURCE_PROVIDER_BOUNDARY_FIRST_FAILURE'||boundary.privatePayloadIncluded!==false
        ||!['ASSERTION_ERROR','FILE_NOT_FOUND_ERROR','PROCESS_LOOKUP_ERROR','PERMISSION_ERROR','OS_ERROR','JSON_DECODE_ERROR',
          'VALUE_ERROR','TYPE_ERROR','KEY_ERROR','INDEX_ERROR','RUNTIME_ERROR','OVERFLOW_ERROR','UNKNOWN','SUBPROCESS_TIMEOUT','SUBPROCESS_EXIT'].includes(boundary.exceptionType)
        ||boundary.reason!=='UNKNOWN'&&!SOURCE_PROVIDER_FAILURE_CODES.has(boundary.reason)
        ||!['OPEN_METEO','CLOSURE','LIVE_PILOT','FORECAST','REGISTRY','NONE','UNKNOWN'].includes(boundary.helper)
        ||boundary.timeoutSeconds!==null&&![30,120].includes(boundary.timeoutSeconds)
        ||boundary.timeoutSeconds!==null&&boundary.exceptionType!=='SUBPROCESS_TIMEOUT'
        ||boundary.reason!=='UNKNOWN'&&boundary.exceptionType!=='RUNTIME_ERROR'
        ||!['SUBPROCESS_TIMEOUT','SUBPROCESS_EXIT'].includes(boundary.exceptionType)&&boundary.helper!=='NONE')return null;
      const site=boundary.callsite;
      if(site!==null&&(!site||Object.keys(site).sort().join(',')!=='line,module,sha256'
        ||!['scripts/fixtures/source19-current-native-providers.py','scripts/update-dmi-bulk.py',
          'scripts/test-source19-terminal-failure-proof-bank-v17-observer-native.py',
          'scripts/fixtures/source19-current-initial-weather.py','scripts/lib/copernicus_current_source_stage.py'].includes(site.module)
        ||typeof site.sha256!=='string'||!/^[a-f0-9]{64}$/.test(site.sha256)
        ||!Number.isSafeInteger(site.line)||site.line<1||site.line>1000000))return null;
    }
    if(Object.hasOwn(value,'wamCompletion')&&(!['PROVIDERS-H0','PROVIDERS-H1'].includes(value.phase)
      ||code===null||code===0||!value.stderr.complete||!sourceInitialWamCompletionValid(value.wamCompletion)
      ||boundary?.reason!=='CURRENT_NATIVE_INITIAL_WEATHER_NORMAL_WAVE_NATIVE_OWNER_NOT_COMPLETE'))return null;
    if(Object.hasOwn(value,'forecastStage')&&(code===null||code===0||!value.stderr.complete
      ||boundary?.helper!=='FORECAST'||!['SUBPROCESS_TIMEOUT','SUBPROCESS_EXIT'].includes(boundary?.exceptionType)
      ||!sourceForecastStageValid(value.forecastStage)))return null;
    return value; // Diagnostic only: never process/SQL/native success proof.
  }catch{return null;}
}
export function nativeLegacyFollowerProcessFirstFailure(value){
  try{
    if(!value||Object.keys(value).sort().join(',')!=='fatalCategory,kind,lastPhase,phase,privatePayloadIncluded,returncode,signal,stderr,stdout'
      ||value.kind!=='SOURCE_LEGACY_FOLLOWER_PROCESS_FIRST_FAILURE'||value.phase!=='FOLLOWER'
      ||value.privatePayloadIncluded!==false)return null;
    const code=value.returncode;
    if(code===0||code!==null&&(!Number.isSafeInteger(code)||code<-(2**31)||code>=2**31))return null;
    if(value.signal!==(code===null?'UNKNOWN':code>=0?'NONE':SOURCE_PROVIDER_SIGNALS.get(code)??'UNKNOWN'))return null;
    for(const stream of [value.stdout,value.stderr]){
      if(!stream||Object.keys(stream).sort().join(',')!=='bytes,complete,sha256'||typeof stream.complete!=='boolean'
        ||stream.bytes!==null&&(!Number.isSafeInteger(stream.bytes)||stream.bytes<0))return null;
      if(stream.complete){
        if(stream.bytes===null||stream.bytes>16*1024*1024||typeof stream.sha256!=='string'||!/^[a-f0-9]{64}$/.test(stream.sha256))return null;
      }else if(stream.sha256!==null)return null;
    }
    if(value.lastPhase!=='UNKNOWN'&&(!NATIVE_PSQL_PHASES.has(value.lastPhase)
      ||!value.lastPhase.startsWith('SOURCE_LEGACY_')))return null;
    if(!['NONE','HEAP_OUT_OF_MEMORY','UNKNOWN'].includes(value.fatalCategory))return null;
    if(!value.stderr.complete&&(value.lastPhase!=='UNKNOWN'||value.fatalCategory!=='UNKNOWN'))return null;
    return value; // Failure observation only; no process/native/SQL/PASS authority.
  }catch{return null;}
}
export function nativePostgresChildFirstFailure(stdout,stderr){
  // Same fixed CURRENT child projection, plus the native caller's own bounded
  // exception projection. Unknown/malformed records are never printed raw.
  try{
    for(const stream of [stdout,stderr]){
      if(typeof stream!=='string'||Buffer.byteLength(stream)>2*1024*1024)continue;
      for(const line of stream.split(/\r?\n/)){
        if(line.length>2048)continue;let value;try{value=JSON.parse(line);}catch{continue;}
        if(value?.kind==='SOURCE_LEGACY_FOLLOWER_PROCESS_FIRST_FAILURE'){
          const fixed=nativeLegacyFollowerProcessFirstFailure(value);if(fixed)return fixed;continue;
        }
        if(value?.kind==='SOURCE_PROVIDER_PROCESS_FIRST_FAILURE'){
          const fixed=nativeProviderProcessFirstFailure(value);if(fixed)return fixed;continue;
        }
        if(value?.kind==='CURRENT_SOURCE_NATIVE_FIRST_FAILURE'){
          try{const fixed=currentSourceNativeFirstFailure(line);if(fixed)return fixed;}catch{}
          continue;
        }
        if(value?.kind==='NATIVE_POSTGRES_FIRST_FAILURE'){
          if(Object.keys(value).sort().join(',')!=='code,frame,kind,phase,privatePayloadIncluded'
            ||!NATIVE_PSQL_PHASES.has(value.phase)||!NATIVE_EXCEPTION_CODES.has(value.code)
            ||value.privatePayloadIncluded!==false)continue;
          const frame=value.frame;
          if(frame!==null&&(Object.keys(frame).sort().join(',')!=='column,line,module,sha256'
            ||!/^(?:scripts|js\/core)\/[A-Za-z0-9_./-]+\.(?:mjs|js)$/.test(frame.module)
            ||frame.module.split('/').includes('..')||!/^[a-f0-9]{64}$/.test(frame.sha256)
            ||!Number.isSafeInteger(frame.line)||frame.line<1||frame.line>1000000
            ||!Number.isSafeInteger(frame.column)||frame.column<1||frame.column>100000))continue;
          return value;
        }
        if(value?.kind==='SOURCE_LEGACY_CHILD_FIRST_FAILURE'){
          if(Object.keys(value).sort().join(',')!=='callsite,exceptionType,kind,osError,phase,privatePayloadIncluded'
            ||!['BINDINGS','PROVIDERS','FOLLOWER','UNKNOWN','PROVIDERS-H0','PROVIDERS-H1','PROVIDERS-587'].includes(value.phase)||value.privatePayloadIncluded!==false
            ||!['ASSERTION_ERROR','FILE_NOT_FOUND_ERROR','PROCESS_LOOKUP_ERROR','PERMISSION_ERROR','OS_ERROR',
              'JSON_DECODE_ERROR','VALUE_ERROR','TYPE_ERROR','KEY_ERROR','INDEX_ERROR','RUNTIME_ERROR','OVERFLOW_ERROR','UNKNOWN'].includes(value.exceptionType)
            ||!['NONE','UNKNOWN','EACCES','EPERM','ENOENT','ESRCH','EBADF','EMFILE','ENFILE','EIO','EINVAL','EINTR','EAGAIN','ENOMEM','ENOSPC','EPIPE'].includes(value.osError))continue;
          const site=value.callsite;
          if(site!==null&&(Object.keys(site).sort().join(',')!=='line,module,sha256'
            ||!/^scripts\/[A-Za-z0-9_/-]+\.py$/.test(site.module)||!/^[a-f0-9]{64}$/.test(site.sha256)
            ||!Number.isSafeInteger(site.line)||site.line<1||site.line>1000000))continue;
          return value;
        }
      }
    }
  }catch{}
  return null;
}

export function nativePostgresCaptureComplete(error){
  try{return !error||typeof error.code==='number'&&error.killed!==true&&!error.signal;}
  catch{return false;}
}
function nativeProcessFailureCategory(error){
  try{
    if(!error)return 'NONE';
    if(error.code==='ERR_CHILD_PROCESS_STDIO_MAXBUFFER')return 'STDIO_BOUND';
    if(error.killed===true||error.signal)return 'DEADLINE_OR_SIGNAL';
    return typeof error.code==='number'?'EXIT_NONZERO':'SPAWN_OR_UNKNOWN';
  }catch{return 'UNKNOWN';}
}
// Only the SOURCE legacy child uses capture; the ordinary command below is unchanged.
const sourceLegacyCommand = (file, args, { input, env, timeout = 20_000, privateLogsRoot = null } = {}) => new Promise(resolve => {
  const child = execFile(file, args, { env, timeout, maxBuffer: 2 * 1024 * 1024,
    ...(privateLogsRoot!==null?{encoding:'buffer'}:{}) },
    async (error, stdout, stderr) => {
      const result={code:error?(error.code??'NATIVE_EXECFILE_UNKNOWN_ERROR'):0,
        stdout:String(stdout??''),sqlState:nativePostgresFailureDiagnostic('UNKNOWN',stderr).sqlState};
      if(privateLogsRoot!==null){
        result.privateLogsPreserved=false;
        try{
          for(const [name,body]of [['stdout',stdout],['stderr',stderr]]){
            const handle=await fs.open(path.join(privateLogsRoot,'source-legacy-child-captured.'+name),'wx',0o600);
            try{await handle.writeFile(Buffer.isBuffer(body)?body:Buffer.from(String(body??'')));await handle.sync();}finally{await handle.close();}
          }
          result.privateLogsComplete=nativePostgresCaptureComplete(error);
          await fs.writeFile(path.join(privateLogsRoot,'capture.json'),JSON.stringify({
            kind:'NATIVE_POSTGRES_CHILD_CAPTURE',complete:result.privateLogsComplete,
            processFailure:nativeProcessFailureCategory(error),
            stdout:{bytes:Buffer.isBuffer(stdout)?stdout.length:Buffer.byteLength(String(stdout??'')),sha256:hash(stdout??'')},
            stderr:{bytes:Buffer.isBuffer(stderr)?stderr.length:Buffer.byteLength(String(stderr??'')),sha256:hash(stderr??'')}},null,2)+'\n',{flag:'wx',mode:0o600});
          result.privateLogsPreserved=true;result.stderr=String(stderr??'');
          if(!result.privateLogsComplete){try{console.error(JSON.stringify({kind:'NATIVE_POSTGRES_CHILD_CAPTURE',
            complete:false,processFailure:nativeProcessFailureCategory(error),privatePayloadIncluded:false}));}catch{}}
        }catch{} // Preserve the original process outcome, including capture failure.
      }
      resolve(result);
    });
  child.stdin?.on('error', () => {}); // Outcome is owned by execFile's actual close/error callback.
  child.stdin?.end(input ?? '');
});

const command = (file, args, { input, env, timeout = 20_000 } = {}) => new Promise(resolve => {
  const child = execFile(file, args, { env, timeout, maxBuffer: 2 * 1024 * 1024 },
    (error, stdout, stderr) => resolve({ code: error ? (error.code ?? 'NATIVE_EXECFILE_UNKNOWN_ERROR') : 0,
      stdout: String(stdout ?? ''), sqlState: nativePostgresFailureDiagnostic('UNKNOWN', stderr).sqlState }));
  child.stdin?.on('error', () => {}); // Outcome is owned by execFile's actual close/error callback.
  child.stdin?.end(input ?? '');
});
const definition = (source, name) => {
  const head = `create or replace function public.${name}(`;
  const start = source.indexOf(head), end = source.indexOf('\n$$;', start);
  assert.ok(start >= 0 && end > start, 'actual SQL function definition missing');
  assert.equal(source.indexOf(head, start + head.length), -1, 'ambiguous SQL function definition');
  return source.slice(start, end + 4);
};

// Historical test input, NEVER an alternative current-runtime admission root.
// Reuse the issued-source checker's fixed Git identity/regular-blob/static-import
// checks, but materialize only the 26 imports/T inputs plus their fixed policy JSON.
const ISSUED_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const ISSUED_HEAD = '044d3045fecc2e70d6f35f60010921c6bd597ecc';
const ISSUED_TREE = '4c56c3b73633bf3a5e1540e4f53e75be49f0b9da';
const ISSUED_TARGET = 'scripts/test-protected-ravscore-continuation-checkpoint.mjs';
const ISSUED_T = 'scripts/lib/ravscore-continuation-implementation-contract.mjs';
const ISSUED_I = 'c1ac9b32d6bfb6bfeda81bc10566f6906d7046ef2b1481981b3470bda4a427f5';
const ISSUED_C = '2fdc7426ea99382731c6f4d118eacf4fc271f505fcf121bc67c5349c62938af9';
const ISSUED_T_SHA = '7876390c0e99dc1926d57e3e5a51a0c88c8e72c190add1ebcfd07964e928ea3b';
const GRID_I = '994da006e4c91a1fc759d5ed58b74de80a9ccaad6753274d5abb0cb07eaed399';
const GRID_C = 'd192e060cf47fde07a1ae2faf9a8db913dbbf4e1325cbf7bf2e33c720982e8d9';
const GRID_T = '0f6c182ab2ffa7d9d0153706277aa3f7b582327be7dda02842a9c8b995568d4a';

async function issued213Factory(root) {
  const git = args => new Promise((resolve, reject) => {
    execFile('git', ['-C', ISSUED_ROOT, ...args],
      { encoding: 'buffer', timeout: 30_000, maxBuffer: 32 * 1024 * 1024 },
      (error, stdout) => error ? reject(error) : resolve(stdout));
  });
  assert.equal(String(await git(['rev-parse', ISSUED_HEAD + '^{tree}'])).trim(), ISSUED_TREE);
  const regular = new Map(String(await git(['ls-tree', '-r', '-z', ISSUED_HEAD]))
    .split('\0').filter(Boolean).map(row => {
      const match = /^(100644|100755) blob ([a-f0-9]{40})\t(.+)$/.exec(row);
      return match ? [match[3], match[2]] : [null, null];
    }).filter(([name]) => name !== null));
  const bytes = new Map();
  const read = async relative => {
    assert.match(relative, /^[A-Za-z0-9_./-]+$/);
    assert.equal(path.posix.normalize(relative), relative);
    assert(!path.posix.isAbsolute(relative) && !relative.startsWith('../'));
    assert(regular.has(relative), 'Pinned regular non-symlink source required');
    if (!bytes.has(relative)) bytes.set(relative, await git(['show', ISSUED_HEAD + ':' + relative]));
    return bytes.get(relative);
  };
  const target = String(await read(ISSUED_TARGET));
  assert.equal(hash(target), '420b2dc97c9de1ee9ce3cf658df5b8449454693d8ac33fa15f607144074eacdb');
  const slice = (start, end) => {
    assert.equal(target.split(start).length, 2); assert.equal(target.split(end).length, 2);
    assert(target.indexOf(start) < target.indexOf(end));
    return target.slice(target.indexOf(start), target.indexOf(end));
  };
  // EXACT original declarations, not a rewritten fixture or rebound new states.
  const factory = slice('const PART_COUNT =', 'const safeShape =')
    + slice('const samples =', 'const sourceDocument =');
  assert.equal(hash(factory), '71ce29ec98e43bfa02017a145c4438346f1d8a1f4323526ec58e4b1081d81e36');
  // Kun den historiske closure bruger sin hele genuine044d-scanner.
  // Den aktuelle scanner og dens rettede deklarationsgrammatik ændres ikke.
  const scannerSource = await read('scripts/lib/static-module-closure.mjs');
  assert.equal(scannerSource.length, 6790, 'Exact issued scanner byte length');
  assert.equal(hash(scannerSource), '675f91e7942143a78636e219e54bd7fa0ff25ddcd1998657dd215105054938b0',
    'Exact issued scanner whole bytes');
  const { exactRelativeModuleSpecifiers } = await import(
    'data:text/javascript;base64,' + scannerSource.toString('base64'));
  const tSource = String(await read(ISSUED_T));
  const declaration = /export const RAVSCORE_CONTINUATION_IMPLEMENTATION_FILES = Object\.freeze\(\[\n((?:  '[A-Za-z0-9_./-]+',\n)+)\]\);/.exec(tSource);
  assert(declaration, 'Exact historical T declaration required');
  const tFiles = [...declaration[1].matchAll(/  '([^']+)',/g)].map(match => match[1]);
  assert.equal(tFiles.length, 12); assert.equal(new Set(tFiles).size, 12);
  const tRows = [];
  for (const file of [...tFiles].sort()) tRows.push([file, hash(String(await read(file)).replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n'))]);
  assert.equal(hash(JSON.stringify(tRows)), ISSUED_T_SHA, 'All twelve original T bytes before import');
  const imports = [
    ['buildIntegratedRavScoreStateSeries', 'js/core/ravscore-integrated-state-pipeline.js'],
    ['buildCandidateGDerivedStateSeries', 'js/core/ravscore-candidate-g-state-pipeline.js'],
    ['ravScoreModelBinding', 'js/core/ravscore-model-contract.js'],
    ['ravScoreModelBinding as candidateGRollbackModelBinding', 'scripts/rollback-assets/ravscore-model-contract.js'],
    ['candidateGStateKey', 'scripts/lib/coastal-point-staging-contract.mjs'],
    ['CANDIDATE_G_OPERATIONAL_ROLLBACK_ID', 'scripts/lib/ravscore-candidate-g-rollback-runtime.mjs'],
    ['RAVSCORE_CONTINUATION_CHECKPOINT_POLICY, saveRavScoreContinuationCheckpoint', 'scripts/ravscore-continuation-checkpoint.mjs'],
    ['ravScoreContinuationImplementationSha256', ISSUED_T],
  ];
  const pending = [...imports.map(([, file]) => file), 'package.json'];
  const selected = new Set(tFiles), visited = new Set();
  while (pending.length) {
    const file = pending.pop(); if (visited.has(file)) continue;
    visited.add(file); selected.add(file);
    const source = String(await read(file));
    if (!/\.(?:js|mjs|ts)$/.test(file)) continue;
    for (const specifier of exactRelativeModuleSpecifiers(source, file)) {
      const base = path.posix.normalize(path.posix.join(path.posix.dirname(file), specifier.split(/[?#]/, 1)[0]));
      const candidates = path.posix.extname(base) ? [base] : [base, base + '.js', base + '.mjs', base + '.json', base + '/index.js'];
      const resolved = candidates.find(candidate => regular.has(candidate));
      assert(resolved, 'Every historical static import must resolve to its fixed regular blob');
      pending.push(resolved);
    }
  }
  const pins = [];
  for (const file of [...selected].sort()) {
    const buffer = await read(file); pins.push({ file, bytes: buffer.length, sha256: hash(buffer) });
  }
  assert.equal(pins.length, 26);
  assert.equal(hash(JSON.stringify(pins)), 'b95874fa463885112b3e9e2fa5f9963a98c4c996486994a845139494acc248f5');
  // The genuine loader uses readFileSync, not an ESM import. Admit this ONE
  // immutable data dependency explicitly; never copy a directory or relax26.
  const policyFile = 'scripts/lib/dmi-marine-zone-exclusions.json';
  assert(!selected.has(policyFile));
  const policyBytes = await read(policyFile);
  assert.equal(policyBytes.length, 416);
  assert.equal(hash(policyBytes), 'b959dee7b87cfebe9fdc7311ffd62b835c96d5c4a263bbcff5c0485f6660ef16');
  pins.push({ file: policyFile, bytes: policyBytes.length, sha256: hash(policyBytes) });
  pins.sort((a, b) => a.file < b.file ? -1 : a.file > b.file ? 1 : 0);
  assert.equal(pins.length, 27);
  assert.equal(hash(JSON.stringify(pins)), '387018040982cba1428b1b3887b476e1e6ff8fe3017b78c7a5fe2d5f6b3d1d3b');
  for (const [file, sha] of [['js/core/ravscore-model-bundle.generated.js', ISSUED_I],
    ['scripts/rollback-assets/ravscore-model-bundle.generated.js', ISSUED_C]]) {
    assert.match(String(await read(file)), new RegExp("GENERATED_RAVSCORE_MODEL_BUNDLE_SHA256 = ['\"]" + sha + "['\"]"));
  }
  // Nothing is written/evaluated until the whole fixed closure/factory/T pins pass.
  const directory = path.join(root, 'issued213');
  await fs.mkdir(directory, { mode: 0o700 });
  const canonical = await fs.realpath(directory);
  assert.equal(path.dirname(canonical), await fs.realpath(root));
  for (const row of pins) {
    const destination = path.join(directory, row.file), parent = path.dirname(destination);
    await fs.mkdir(parent, { recursive: true });
    const relative = path.relative(canonical, await fs.realpath(parent));
    assert(relative === '' || (!relative.startsWith('..') && !path.isAbsolute(relative)));
    await fs.writeFile(destination, await read(row.file), { flag: 'wx', mode: 0o600 });
    assert.equal(hash(await fs.readFile(destination)), row.sha256);
  }
  const moduleSource = "import crypto from 'node:crypto';\n"
    + imports.map(([names, file]) => 'import { ' + names + ' } from '
      + JSON.stringify(pathToFileURL(path.join(directory, file)).href) + ';').join('\n')
    + '\n' + factory
    + '\nexport { sourceDocumentAt, atHour, saveRavScoreContinuationCheckpoint, CURRENT_CONTINUATION_IMPLEMENTATION_SHA256, ravScoreModelBinding, candidateGRollbackModelBinding };';
  const loaded = await import('data:text/javascript;base64,' + Buffer.from(moduleSource).toString('base64'));
  assert.equal(loaded.ravScoreModelBinding().modelBundleSha256, ISSUED_I);
  assert.equal(loaded.candidateGRollbackModelBinding().modelBundleSha256, ISSUED_C);
  assert.equal(loaded.CURRENT_CONTINUATION_IMPLEMENTATION_SHA256, ISSUED_T_SHA);
  return { ...loaded, sourceReceipt: { head: ISSUED_HEAD, tree: ISSUED_TREE, fileCount: pins.length,
    factorySha256: hash(factory), closureSha256: hash(JSON.stringify(pins)) } };
}

// Source-only integration control; this does not run, skip, or certify PostgreSQL.
// No caller-selected historical root, binding, factory or destination is accepted.
export async function verifyIssuedNativeCheckpointFixture() {
  const parent = await fs.realpath(os.tmpdir());
  const root = await fs.mkdtemp(path.join(parent, 'rr-checkpoint-pg-'));
  const identity = await fs.lstat(root, { bigint: true });
  try {
    const issued = await issued213Factory(root);
    const sourcePath = path.join(root, 'issued-source.json'), checkpointPath = path.join(root, 'issued-checkpoint.json');
    await fs.writeFile(sourcePath, JSON.stringify(issued.sourceDocumentAt(49, 'rr-native-sql-49')), { flag: 'wx' });
    await issued.saveRavScoreContinuationCheckpoint({ sourcePath, checkpointPath });
    const payload = JSON.parse(await fs.readFile(checkpointPath, 'utf8'));
    assert.equal(payload.partCount, 673); assert.equal(Object.keys(payload.states).length, 673);
    assert.equal(Object.keys(payload.candidateGRollbackCompanion.states).length, 673);
    assert.equal(payload.modelBinding.modelBundleSha256, ISSUED_I);
    assert.equal(payload.candidateGRollbackCompanion.modelBinding.modelBundleSha256, ISSUED_C);
    assert.equal(payload.continuationStateContractSha256, ISSUED_T_SHA);
    return { kind: 'ISSUED213_NATIVE_FIXTURE_SOURCE_ONLY', ...issued.sourceReceipt,
      partCount: 673, normalSaver: true, sqlExecuted: false };
  } finally {
    const actual = await fs.lstat(root, { bigint: true });
    assert.equal(await fs.realpath(root), root); assert.equal(path.dirname(root), parent);
    assert(actual.isDirectory() && !actual.isSymbolicLink() && actual.ino > 0n);
    assert.deepEqual([actual.dev, actual.ino, actual.birthtimeNs], [identity.dev, identity.ino, identity.birthtimeNs]);
    await fs.rm(root, { recursive: true, force: false });
  }
}

async function nativePrograms() {
  if (process.platform !== 'linux') throw new Error('NATIVE_POSTGRES_UNAVAILABLE_ON_THIS_HOST');
  const configured = await command('pg_config', ['--bindir']);
  if (configured.code !== 0) throw new Error('NATIVE_POSTGRES_PG_CONFIG_UNAVAILABLE');
  const candidates = [configured.stdout.trim()];
  try {
    candidates.push(...(await fs.readdir('/usr/lib/postgresql')).filter(value => /^\d+$/.test(value))
      .sort((a, b) => Number(b) - Number(a)).slice(0, 4)
      .map(value => `/usr/lib/postgresql/${value}/bin`));
  } catch { /* No installation, package download or alternative service. */ }
  for (const directory of [...new Set(candidates)]) {
    if (!path.isAbsolute(directory)) continue;
    const programs = Object.fromEntries(['initdb', 'pg_ctl', 'psql', 'postgres']
      .map(name => [name, path.join(directory, name)]));
    try { await Promise.all(Object.values(programs).map(file => fs.access(file, fs.constants.X_OK))); }
    catch { continue; }
    const versions = await Promise.all(Object.values(programs).map(file => command(file, ['--version'])));
    const majors = versions.map(result => result.code === 0 ? result.stdout.match(/\b(\d+)\.\d+\b/)?.[1] : null);
    if (majors.every(value => value !== null && value === majors[0]) && Number(majors[0]) >= 16) {
      return { ...programs, majorVersion: Number(majors[0]) };
    }
  }
  throw new Error('NATIVE_POSTGRES_COMPLETE_EXISTING_BINARIES_UNAVAILABLE');
}


// Same native server/owner, after all thirteen old130000/200000 comparisons.
// This is a source fixture, not an installed account or production checkpoint.
async function compareAccountAssistantSuccessor({ psql, runSql, source, oldSource,
  oldFixtures, currentFixtures, cases, atHour, oldCas, newCas }) {
  assert.equal(hash(source), '80ad179bc896e9fcd62b8af103d70a2d086d3626395dd97f03e4184e52bcae5d');
  await psql("insert into supabase_migrations.schema_migrations values('20261012200000');");
  const noAccountObjects = async () => assert.equal(await psql(
    "select to_regclass('public.account_activity_journal') is null and "
    + "to_regclass('public.account_statistics_preferences') is null and "
    + "to_regprocedure('public.ravradar_ravscore_checkpoint_account_assistant_predecessor_projection(jsonb,timestamptz)') is null;"), 't');
  // Test the REAL beforeGuard, not a hand-written equivalent. Each failed
  // whole transaction must leave account objects absent and CAS body unchanged.
  for (const [drift, restore] of [
    ["alter function " + CAS + "(bigint,timestamptz,jsonb) security invoker;",
     "alter function " + CAS + "(bigint,timestamptz,jsonb) security definer;"],
    ["alter function " + CAS + "(bigint,timestamptz,jsonb) set search_path=public;",
     "alter function " + CAS + "(bigint,timestamptz,jsonb) set search_path=pg_catalog,public;"],
    ["alter function " + CAS + "(bigint,timestamptz,jsonb) set statement_timeout='54s';",
     "alter function " + CAS + "(bigint,timestamptz,jsonb) set statement_timeout='55s';"],
    ["revoke execute on function " + CAS + "(bigint,timestamptz,jsonb) from service_role;",
     "grant execute on function " + CAS + "(bigint,timestamptz,jsonb) to service_role;"],
    ["grant execute on function " + CAS + "(bigint,timestamptz,jsonb) to anon;",
     "revoke execute on function " + CAS + "(bigint,timestamptz,jsonb) from anon;"],
    ["grant execute on function " + CAS + "(bigint,timestamptz,jsonb) to authenticated;",
     "revoke execute on function " + CAS + "(bigint,timestamptz,jsonb) from authenticated;"],
  ]) {
    await psql(drift);
    assert.notEqual((await runSql(source)).code, 0, 'actual beforeGuard must reject predecessor properties/ACL drift');
    await noAccountObjects();
    await psql(restore);
    const stored = await psql("select btrim(prosrc,E' \\r\\n\\t') from pg_proc where oid='" + CAS + "(bigint,timestamptz,jsonb)'::regprocedure;");
    const expected = newCas.slice(newCas.indexOf('as $$') + 5, newCas.lastIndexOf('$$;')).trim();
    assert.equal(stored, expected, 'refused whole migration must preserve actual200000 CAS');
  }
  // Apply the WHOLE new append-only SOURCE, including transaction, BEFORE,
  // account DDL, exact projections/functions, AFTER ACL/body guards and notify.
  await psql(source);
  assert.equal(await psql("select current_setting('lock_timeout');"), '0');
  await psql("insert into supabase_migrations.schema_migrations values('20261013210000');");
  assert.notEqual((await runSql(source)).code, 0, 'already-installed migration must not replay');

  const successor = structuredClone(currentFixtures);
  successor.predecessor = structuredClone(oldFixtures.current);
  successor.unknown = structuredClone(successor.predecessor);
  successor.unknown.modelBinding.modelBundleSha256 = 'e'.repeat(64);
  successor.invalid = structuredClone(successor.current); successor.invalid.partCount = 672;
  successor.mixed = structuredClone(successor.predecessor);
  Object.values(successor.mixed.states)[0].modelBundleSha256 = successor.current.modelBinding.modelBundleSha256;
  successor.wrongCandidate = structuredClone(successor.predecessor);
  successor.wrongCandidate.candidateGRollbackCompanion.modelBinding.modelBundleSha256 = 'f'.repeat(64);
  await psql('truncate public.native_checkpoint_payloads;');
  for (const [name,payload] of Object.entries(successor)) {
    const json=JSON.stringify(payload); assert.equal(json.includes('$native_fixture$'),false);
    await psql("insert into public.native_checkpoint_payloads values('" + name + "',$native_fixture$" + json + "$native_fixture$::jsonb);");
  }
  const projection='public.ravradar_ravscore_checkpoint_account_assistant_predecessor_projection';
  const whole=JSON.parse(await psql("select jsonb_build_object("
    + "'wholeEqual'," + projection + "((select payload from native_checkpoint_payloads where name='predecessor'),'"
    + atHour(49) + "')=(select payload from native_checkpoint_payloads where name='current'),"
    + "'mixedRefused'," + projection + "((select payload from native_checkpoint_payloads where name='mixed'),'" + atHour(49) + "') is null,"
    + "'candidateRefused'," + projection + "((select payload from native_checkpoint_payloads where name='wrongCandidate'),'" + atHour(49) + "') is null);"));
  assert.deepEqual(whole,{wholeEqual:true,mixedRefused:true,candidateRefused:true},
    'whole 673 payload projection, not selected state fields, must match the normal builder output');

  const properties=JSON.parse(await psql("select jsonb_build_object("
    + "'definer',p.prosecdef,'searchPath','search_path=pg_catalog, public'=any(p.proconfig),"
    + "'timeout','statement_timeout=55s'=any(p.proconfig),"
    + "'service',has_function_privilege('service_role',p.oid,'execute'),"
    + "'anon',has_function_privilege('anon',p.oid,'execute'),"
    + "'authenticated',has_function_privilege('authenticated',p.oid,'execute'),"
    + "'bodySha',encode(extensions.digest(convert_to(btrim(p.prosrc,E' \\r\\n\\t'),'UTF8'),'sha256'),'hex'))"
    + " from pg_proc p where p.oid='" + CAS + "(bigint,timestamptz,jsonb)'::regprocedure;"));
  const successorCas=definition(source,'ravradar_ravscore_checkpoint_cas');
  assert.deepEqual(properties,{definer:true,searchPath:true,timeout:true,service:true,anon:false,
    authenticated:false,bodySha:hash(successorCas.slice(successorCas.indexOf('as $$')+5,successorCas.lastIndexOf('$$;')).trim())});
  const reports=[];
  for (const [name,central,incoming,version,expectedCode,disposition,storedVersion,
    role='service_role',claimRole=role] of cases) {
    const reset="truncate public.admin_documents;" + (central
      ? "insert into public.admin_documents(document_key,payload,version,updated_by) select '" + KEY
        + "',payload,1,'00000000-0000-0000-0000-000000000001' from native_checkpoint_payloads where name='" + central + "';" : '');
    const observed=JSON.parse(await psql(reset + "\nset statement_timeout='55s';"
      + " do $$ begin perform set_config('request.jwt.claim.role','" + claimRole + "',false); end $$; set role " + role + ";"
      + " select public.native_checkpoint_attempt(false," + version + ",(select payload from native_checkpoint_payloads where name='" + incoming + "'));"));
    assert.equal(observed.sqlstate,expectedCode,'new full-migration case ' + name);
    if (disposition) { assert.equal(observed.result.disposition,disposition); assert.equal(observed.result.centralVersion,storedVersion); }
    assert.equal(observed.stored?.version,storedVersion);
    if (expectedCode || disposition==='unchanged') {
      assert.equal(observed.stored.ownerIsNull,false);
      const {storedPayloadMatchesIncoming,...stored}=observed.stored;
      assert.deepEqual(stored,observed.previous,'new refusal/unchanged must preserve whole payload/reference/version/owner');
    } else { assert.equal(observed.stored.ownerIsNull,true); assert.equal(observed.stored.storedPayloadMatchesIncoming,true); }
    reports.push({case:name,sqlstate:expectedCode,disposition,storedVersion});
  }

  // Explicit receipt-difference oracle. Both generation receipts must remain
  // equal because the full validator requires that invariant. They therefore
  // change as a pair; no individual mismatch is admitted by the comparator.
  const receiptCases=[];
  for (const fields of [['generationPair'],['stateSha256'],['generationPair','stateSha256']]) {
    const payload=structuredClone(successor.current);
    if(fields.includes('generationPair')) {
      payload.generationSha256=hash('native successor generation receipt');
      payload.candidateGRollbackCompanion.generationSha256=payload.generationSha256;
    }
    if(fields.includes('stateSha256')) payload.stateSha256=hash('native successor state receipt');
    assert.notDeepEqual(payload,successor.current);
    const stripReceipts=value=>{
      const copy=structuredClone(value); delete copy.generationSha256; delete copy.stateSha256;
      delete copy.candidateGRollbackCompanion.generationSha256; return copy;
    };
    assert.deepEqual(stripReceipts(payload),stripReceipts(successor.current),
      'only the three already allowed receipt leaves differ in this positive fixture');
    receiptCases.push({name:'receipt-'+fields.join('-'),payload,valid:true,sqlstate:null});
  }
  const badGeneration=structuredClone(successor.current);
  badGeneration.generationSha256=hash('unpaired generation receipt');
  receiptCases.push({name:'unpaired-generation',payload:badGeneration,valid:false,sqlstate:'22023'});
  const candidateReceipt=structuredClone(successor.current);
  candidateReceipt.candidateGRollbackCompanion.stateSha256=hash('changed Candidate state receipt');
  assert.deepEqual(candidateReceipt.candidateGRollbackCompanion.states,successor.current.candidateGRollbackCompanion.states);
  receiptCases.push({name:'candidate-state-receipt',payload:candidateReceipt,valid:true,sqlstate:'23505'});
  const changedHistory=structuredClone(successor.current);
  changedHistory.candidateGRollbackCompanion.states=structuredClone(successor.changed.candidateGRollbackCompanion.states);
  assert.notDeepEqual(Object.values(changedHistory.candidateGRollbackCompanion.states)[0].transportEvidence,
    Object.values(successor.current.candidateGRollbackCompanion.states)[0].transportEvidence,
    'the existing normal Candidate builder produces genuinely different history, not a metadata-only variation');
  receiptCases.push({name:'candidate-history',payload:changedHistory,valid:true,sqlstate:'23505'});
  for(const {name,payload,valid,sqlstate} of receiptCases) {
    const json=JSON.stringify(payload);assert.equal(json.includes('$native_fixture$'),false);
    await psql("insert into public.native_checkpoint_payloads values('receipt-incoming',$native_fixture$"+json+"$native_fixture$::jsonb);");
    assert.equal(await psql("select public.ravradar_ravscore_checkpoint_payload_valid("
      + "(select payload from native_checkpoint_payloads where name='receipt-incoming'),'"+atHour(49)+"');"),valid?'t':'f',
      'receipt oracle must prove full-validator admission independently: '+name);
    const observed=JSON.parse(await psql("truncate public.admin_documents;"
      + "insert into public.admin_documents(document_key,payload,version,updated_by) select '"+KEY
      + "',payload,1,'00000000-0000-0000-0000-000000000001' from native_checkpoint_payloads where name='predecessor';"
      + " set statement_timeout='55s'; select set_config('request.jwt.claim.role','service_role',false); set role service_role;"
      + " select public.native_checkpoint_attempt(false,1,(select payload from native_checkpoint_payloads where name='receipt-incoming'));").then(output=>output.split('\n').at(-1)));
    assert.equal(observed.sqlstate,sqlstate,name);
    if(sqlstate===null) {
      assert.equal(observed.result.disposition,'updated');assert.equal(observed.result.centralVersion,2);
      assert.equal(observed.stored.storedPayloadMatchesIncoming,true);assert.equal(observed.stored.ownerIsNull,true);
    } else {
      const {storedPayloadMatchesIncoming,...stored}=observed.stored;
      assert.deepEqual(stored,observed.previous,'receipt/history refusal preserves the entire stored original');
      assert.equal(stored.ownerIsNull,false);
    }
    await psql("delete from public.native_checkpoint_payloads where name='receipt-incoming';");
  }
  const catalogMetadata=JSON.parse(await psql(accountAssistantCatalogQuery));
  const catalogReceipt=await verifyAccountAssistantCatalogMetadata(catalogMetadata);
  assert.equal(catalogReceipt.status,'ACCOUNT_ASSISTANT_SCHEMA_MATCH');
  assert.equal(catalogReceipt.accountRowsRead,false);
  for(const drift of [
    'grant execute on function public.get_own_statistics_preference() to authenticated with grant option;',
    'create role native_catalog_unexpected nologin; grant select(user_id) on public.account_statistics_preferences to native_catalog_unexpected;',
  ]) {
    const unsafe=JSON.parse(await psql('begin;'+drift+accountAssistantCatalogQuery+'rollback;'));
    await assert.rejects(verifyAccountAssistantCatalogMetadata(unsafe),
      /ACCOUNT_ASSISTANT_CATALOG_MISMATCH/,
      'the installed catalog reader must reject delegated RPC and hidden column grants');
  }
  assert.deepEqual(await verifyAccountAssistantCatalogMetadata(JSON.parse(await psql(accountAssistantCatalogQuery))),
    catalogReceipt,'transactional metadata negatives restore the exact account catalog');

  const ownerA='00000000-0000-0000-0000-000000000001';
  const ownerB='00000000-0000-0000-0000-000000000002';
  const missing='00000000-0000-0000-0000-000000000003';
  await psql("insert into public.profiles(id) values('" + ownerA + "'),('" + ownerB + "');");
  const accountSession=(uid,role='authenticated',claim=role)=>"select set_config('request.jwt.claim.sub','" + uid
    + "',false); select set_config('request.jwt.claim.role','" + claim + "',false); set role " + role + ";";
  const ownCall=async (uid,name)=>JSON.parse((await psql(accountSession(uid)
    + 'select public.' + name + '();')).split('\n').at(-1));
  assert.deepEqual(await ownCall(ownerA,'get_own_statistics_preference'),{enabled:true,source:'default'});
  assert.equal(await psql('select count(*) from public.account_statistics_preferences;'),'0',
    'default read is not a stored opt-in or statistic processing');
  assert.deepEqual(await ownCall(ownerA,'disable_own_statistics_preference'),{enabled:false,source:'stored'});
  assert.deepEqual(await ownCall(ownerB,'get_own_statistics_preference'),{enabled:true,source:'default'});
  assert.deepEqual(await ownCall(ownerA,'get_own_statistics_preference'),{enabled:false,source:'stored'});
  assert.deepEqual(await ownCall(ownerB,'enable_own_statistics_preference'),{enabled:true,source:'stored'});
  assert.deepEqual(await ownCall(ownerA,'get_own_statistics_preference'),{enabled:false,source:'stored'},
    'another owner cannot overwrite a stored false');
  assert.deepEqual(await ownCall(ownerA,'enable_own_statistics_preference'),{enabled:true,source:'stored'});
  assert.deepEqual(await ownCall(ownerA,'disable_own_statistics_preference'),{enabled:false,source:'stored'});
  assert.deepEqual(await ownCall(ownerA,'record_account_activity'),{recorded:true});
  const first=await psql("select first_observed_at::text from public.account_activity_journal where user_id='" + ownerA + "';");
  assert.deepEqual(await ownCall(ownerA,'record_account_activity'),{recorded:true});
  assert.equal(await psql("select first_observed_at::text from public.account_activity_journal where user_id='" + ownerA + "';"),first);
  assert.equal(await psql("select last_activity_at>=first_observed_at from public.account_activity_journal where user_id='" + ownerA + "';"),'t');
  assert.equal(await psql("select count(*) from public.account_activity_journal where user_id='" + ownerB + "';"),'0');

  // Use real SQL identities/ACL/RLS, not a mocked auth return or request payload.
  for (const uid of ['',missing]) for (const name of ['record_account_activity','get_own_statistics_preference','enable_own_statistics_preference','disable_own_statistics_preference']) {
    assert.notEqual((await runSql(accountSession(uid)+'select public.'+name+'();')).code,0);
  }
  for (const name of ['record_account_activity','get_own_statistics_preference','enable_own_statistics_preference','disable_own_statistics_preference']) {
    for (const role of ['anon','service_role']) assert.notEqual((await runSql(accountSession(ownerA,role)+'select public.'+name+'();')).code,0);
  }
  for (const table of ['account_activity_journal','account_statistics_preferences']) {
    assert.equal(await psql("select relrowsecurity from pg_class where oid='public."+table+"'::regclass;"),'t');
    assert.notEqual((await runSql(accountSession(ownerA)+'select * from public.'+table+';')).code,0,
      'ordinary authenticated table read must be denied, including its own rows');
    // Temporary fixture-only grant demonstrates that the actual enabled RLS
    // still denies all direct rows; rollback preserves the migration ACL.
    const rls=(await psql('begin; grant select on public.'+table+' to authenticated;'
      + accountSession(ownerA)+'select count(*) from public.'+table+'; rollback;')).split('\n').at(-1);
    assert.equal(rls,'0');
    assert.equal(await psql("select has_table_privilege('authenticated','public."+table+"','select');"),'f');
  }
  assert.equal(await psql('select count(*) from public.account_statistics_preferences;'),'2');
  return {kind:'NATIVE_ACCOUNT_ASSISTANT_SUCCESSOR',wholeMigrationExecuted:true,
    migrationSQLSha256:hash(source),normalModelPartCount:673,wholeProjectionEqual:true,
    oldSemanticsRechecked:reports.length,beforeGuardDriftCases:6,accountOwnerAclRls:true,
    receiptDifferenceCases:receiptCases.length,installedCatalog:catalogReceipt,reports};
}

// A separate phase AFTER the unchanged historical thirteen/213 cases. The
// incoming generation is built by genuine fixed37 normal code; old states stay old.
async function compareCurrentGridSuccessor({ psql, runSql, source, accountSource,
  oldFixtures, issuedFixtures, sourceDocumentAt, atHour, saveCheckpoint, root }) {
  assert.equal(hash(source), '77d5a60f22ff38fce3164c87e74d089ea56c0a18647310213cde465e95e4632b');
  assert.match(source, /\bbegin;\s+set local lock_timeout = '5s';/);
  const originalNames = ['ffc', '249', 'c1ac'].flatMap(family => ['state', 'payload']
    .map(kind => 'ravradar_ravscore_checkpoint_grid_' + family + '_' + kind + '_valid'));
  const migrationNames = [...source.matchAll(/^create or replace function public\.([a-z0-9_]+)\(/gm)].map(match => match[1]);
  assert.equal(migrationNames.length, 13);
  assert.deepEqual(migrationNames.slice(0, 6), originalNames);
  const originals = { ffc: structuredClone(oldFixtures.predecessor),
    '249': structuredClone(oldFixtures.current), c1ac: structuredClone(issuedFixtures.current) };
  const originalPins = Object.fromEntries(Object.entries(originals).map(([name, payload]) => [name, hash(JSON.stringify(payload))]));
  const put = async (name, payload) => {
    assert.match(name, /^[a-z0-9-]+$/);
    const json = JSON.stringify(payload); assert.equal(json.includes('$native_fixture$'), false);
    await psql("insert into public.native_checkpoint_payloads values('" + name + "',$native_fixture$" + json + "$native_fixture$::jsonb);");
  };
  await psql('truncate public.native_checkpoint_payloads;');
  for (const [name, payload] of Object.entries(originals)) await put('original-' + name, payload);
  const bankHash = () => psql("select md5(jsonb_agg(jsonb_build_array(name,payload) order by name)::text) from public.native_checkpoint_payloads;");
  const bankBefore = await bankHash();
  const preserved = () => psql("select md5(jsonb_build_object('checkpoint',(select jsonb_agg(to_jsonb(d) order by document_key) from public.admin_documents d),'activity',(select jsonb_agg(to_jsonb(a) order by user_id) from public.account_activity_journal a),'preference',(select jsonb_agg(to_jsonb(s) order by user_id) from public.account_statistics_preferences s))::text);");
  const rowsBefore = await preserved();
  const oldBody = definition(accountSource, 'ravradar_ravscore_checkpoint_cas');
  const body = text => text.slice(text.indexOf('as $$') + 5, text.lastIndexOf('$$;')).trim();
  for (const [drift, restore] of [
    ["delete from supabase_migrations.schema_migrations where version='20261013210000';",
     "insert into supabase_migrations.schema_migrations values('20261013210000');"],
    ['alter function ' + CAS + '(bigint,timestamptz,jsonb) security invoker;',
     'alter function ' + CAS + '(bigint,timestamptz,jsonb) security definer;'],
    ['alter function ' + CAS + '(bigint,timestamptz,jsonb) set search_path=public;',
     'alter function ' + CAS + '(bigint,timestamptz,jsonb) set search_path=pg_catalog,public;'],
    ["alter function " + CAS + "(bigint,timestamptz,jsonb) set statement_timeout='54s';",
     "alter function " + CAS + "(bigint,timestamptz,jsonb) set statement_timeout='55s';"],
    ['revoke execute on function ' + CAS + '(bigint,timestamptz,jsonb) from service_role;',
     'grant execute on function ' + CAS + '(bigint,timestamptz,jsonb) to service_role;'],
    ['grant execute on function ' + CAS + '(bigint,timestamptz,jsonb) to anon;',
     'revoke execute on function ' + CAS + '(bigint,timestamptz,jsonb) from anon;'],
    ['grant execute on function ' + CAS + '(bigint,timestamptz,jsonb) to authenticated;',
     'revoke execute on function ' + CAS + '(bigint,timestamptz,jsonb) from authenticated;'],
  ]) {
    await psql(drift);
    assert.notEqual((await runSql(source)).code, 0, 'whole220 BEFORE must reject actual predecessor/ACL drift');
    assert.equal(await psql("select count(*) from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname in (" + originalNames.map(name => "'" + name + "'").join(',') + ');'), '0');
    await psql(restore);
    assert.equal(await psql("select btrim(prosrc,E' \\r\\n\\t') from pg_proc where oid='" + CAS + "(bigint,timestamptz,jsonb)'::regprocedure;"), body(oldBody));
    assert.equal(await bankHash(), bankBefore); assert.equal(await preserved(), rowsBefore);
  }
  await psql(source); // Entire transaction/BEFORE/definitions/AFTER/ACL/notify/COMMIT.
  assert.equal(await psql("select current_setting('lock_timeout');"), '0');
  assert.equal(await bankHash(), bankBefore); assert.equal(await preserved(), rowsBefore,
    'installing220 must not rewrite an original checkpoint, account or preference row');
  await psql("insert into supabase_migrations.schema_migrations values('20261013220000');");
  assert.notEqual((await runSql(source)).code, 0, 'whole220 may not replay');
  const definitions = JSON.parse(await psql("select jsonb_object_agg(p.proname,encode(extensions.digest(convert_to(btrim(p.prosrc,E' \\r\\n\\t'),'UTF8'),'sha256'),'hex')) from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname in (" + migrationNames.map(name => "'" + name + "'").join(',') + ');'));
  assert.deepEqual(definitions, Object.fromEntries(migrationNames.map(name => [name, hash(body(definition(source, name)))])),
    'actual native bodies include all six whole original validators and seven replacements');
  const properties = JSON.parse(await psql("select jsonb_build_object('definer',p.prosecdef,'searchPath','search_path=pg_catalog, public'=any(p.proconfig),'timeout','statement_timeout=55s'=any(p.proconfig),'service',has_function_privilege('service_role',p.oid,'execute'),'anon',has_function_privilege('anon',p.oid,'execute'),'authenticated',has_function_privilege('authenticated',p.oid,'execute')) from pg_proc p where p.oid='" + CAS + "(bigint,timestamptz,jsonb)'::regprocedure;"));
  assert.deepEqual(properties, { definer: true, searchPath: true, timeout: true, service: true, anon: false, authenticated: false });
  assert.equal(await psql("select count(*) from pg_proc p join pg_namespace n on n.oid=p.pronamespace cross join lateral aclexplode(coalesce(p.proacl,acldefault('f',p.proowner))) a where n.nspname='public' and p.proname in (" + originalNames.map(name => "'" + name + "'").join(',') + ") and a.privilege_type='EXECUTE' and (a.grantee=0 or a.grantee in (select oid from pg_roles where rolname in ('anon','authenticated')));"), '0');
  for (const [family, payload] of Object.entries(originals)) {
    assert.equal(await psql('select public.ravradar_ravscore_checkpoint_grid_' + family
      + "_payload_valid((select payload from native_checkpoint_payloads where name='original-" + family + "'),'" + atHour(49) + "');"), 't',
    'all 673 original pairs must pass their OWN unchanged whole validator: ' + family);
    assert.equal(hash(JSON.stringify(payload)), originalPins[family]);
  }
  const current = {};
  for (const [name, hour, options] of [['current',49,{}],['future',50,{}],['changed',49,{ candidateCurrentSpeedMps:0.18 }]]) {
    const sourcePath = path.join(root, 'grid-' + name + '-source.json');
    const checkpointPath = path.join(root, 'grid-' + name + '-checkpoint.json');
    await fs.writeFile(sourcePath, JSON.stringify(sourceDocumentAt(hour, 'rr-native-grid-' + hour, options)), { flag: 'wx' });
    await saveCheckpoint({ sourcePath, checkpointPath });
    const payload = JSON.parse(await fs.readFile(checkpointPath, 'utf8'));
    assert.equal(payload.modelBinding.modelBundleSha256, GRID_I);
    assert.equal(payload.candidateGRollbackCompanion.modelBinding.modelBundleSha256, GRID_C);
    assert.equal(payload.continuationStateContractSha256, GRID_T);
    assert.equal(payload.partCount, 673); assert.equal(Object.keys(payload.states).length, 673);
    assert.equal(Object.keys(payload.candidateGRollbackCompanion.states).length, 673);
    current[name] = payload; await put('grid-' + name, payload);
    assert.equal(await psql("select public.ravradar_ravscore_checkpoint_payload_valid((select payload from native_checkpoint_payloads where name='grid-" + name + "'),'" + atHour(hour) + "');"), 't');
  }
  const cases = [
    ['insert',null,'grid-current',0,null,'inserted',1],
    ['equal-stale-version','grid-current','grid-current',0,null,'unchanged',1],
    ['same-reference-changed-state','grid-current','grid-changed',1,'23505',null,1],
    ['regression','grid-future','grid-current',1,'22023',null,1],
    ['wrong-version','grid-current','grid-future',0,'40001',null,1],
    ['higher-reference','grid-current','grid-future',1,null,'updated',2],
    ['negative-version','grid-current','grid-current',-1,'22023',null,1],
    ['role-rejection','grid-current','grid-current',1,'42501',null,1,'service_role','anon'],
    ['ACL-rejection','grid-current','grid-current',1,'42501',null,1,'anon','anon'],
  ];
  for (const [family, payload] of Object.entries(originals)) {
    cases.push(['newer-' + family,'original-' + family,'grid-future',1,null,'updated',2],
      ['same-reference-' + family,'original-' + family,'grid-current',1,'22023',null,1],
      ['version-' + family,'original-' + family,'grid-future',0,'40001',null,1]);
    const invalids = {
      mixed: value => { Object.values(value.states)[0].modelBundleSha256 = GRID_I; },
      candidate: value => { value.candidateGRollbackCompanion.modelBinding.modelBundleSha256 = GRID_C; },
      continuation: value => { value.continuationStateContractSha256 = GRID_T; },
      generation: value => { value.candidateGRollbackCompanion.generationSha256 = hash('unpaired old generation'); },
      sampling: value => { Object.values(value.states)[0].samplingContextKey = null; },
      missing: value => { delete value.states[Object.keys(value.states)[0]]; },
    };
    for (const [kind, mutate] of Object.entries(invalids)) {
      const invalid = structuredClone(payload); mutate(invalid);
      const name = family + '-' + kind; await put(name, invalid);
      assert.equal(await psql('select public.ravradar_ravscore_checkpoint_grid_' + family
        + "_payload_valid((select payload from native_checkpoint_payloads where name='" + name + "'),'" + atHour(49) + "');"), 'f');
      cases.push([name, name, 'grid-future', 1, '22023', null, 1]);
    }
  }
  const invalidIncoming = structuredClone(current.future); invalidIncoming.partCount = 672;
  await put('grid-invalid', invalidIncoming);
  cases.push(['invalid-incoming','original-c1ac','grid-invalid',1,'22023',null,1]);
  const reports = [];
  for (const [name, central, incoming, version, expectedCode, disposition, storedVersion,
    role = 'service_role', claimRole = role] of cases) {
    const reset = 'truncate public.admin_documents;' + (central
      ? "insert into public.admin_documents(document_key,payload,version,updated_by) select '" + KEY
        + "',payload,1,'00000000-0000-0000-0000-000000000001' from native_checkpoint_payloads where name='" + central + "';" : '');
    const observed = JSON.parse(await psql(reset + " set statement_timeout='55s'; do $$ begin perform set_config('request.jwt.claim.role','"
      + claimRole + "',false); end $$; set role " + role + '; select public.native_checkpoint_attempt(false,'
      + version + ",(select payload from native_checkpoint_payloads where name='" + incoming + "'));"));
    assert.equal(observed.sqlstate, expectedCode, 'native220 case ' + name);
    assert.equal(observed.stored?.version, storedVersion);
    if (disposition) { assert.equal(observed.result.disposition, disposition); assert.equal(observed.result.centralVersion, storedVersion); }
    if (expectedCode || disposition === 'unchanged') {
      const { storedPayloadMatchesIncoming, ...stored } = observed.stored;
      assert.deepEqual(stored, observed.previous, '220 refusal/equality preserves exact original row: ' + name);
      assert.equal(stored.ownerIsNull, false);
    } else { assert.equal(observed.stored.ownerIsNull, true); assert.equal(observed.stored.storedPayloadMatchesIncoming, true); }
    reports.push({ case: name, sqlstate: expectedCode, disposition, storedVersion });
  }
  for (const [family, payload] of Object.entries(originals)) assert.equal(hash(JSON.stringify(payload)), originalPins[family]);
  return { kind: 'NATIVE_CURRENT_GRID_SUCCESSOR', wholeMigrationExecuted: true,
    migrationSQLSha256: hash(source), currentPartCount: 673, originalFamilies: ['ffc','249','c1ac'],
    beforeGuardDriftCases: 7, actualDefinitionCount: 13, timeoutSeconds: 55,
    migrationLocalLockTimeoutSeconds: 5, accountRowsPreserved: true, reports };
}

// Called ONLY by the existing protected-checkpoint target's native-only branch.
// Its real 673 model builders and normal checkpoint saver supply the fixtures.
export async function runNativeCheckpointSqlComparison({ repositoryRoot,
  sourceDocumentAt, atHour, saveCheckpoint, includeStatisticsRevision = false,
  includeNativeIdentity = false, includeCurrentMemoryWarmup = false, includeEstablishedNativeCurrentOrigin = false,
  includeLastMileEnclosure = false, includeAccountStatisticsAssistant = false,
  includeNativeOriginalContinuity = false, includeAssistantLaterH0 = false,
  includeAssistantPublic587Successor = false, includeSourceProducer = false, includeCurrentSourceNativeProfile = false } = {}) {
  assert.equal(typeof includeCurrentSourceNativeProfile,'boolean');
  assert.equal(typeof includeSourceProducer,'boolean');
  if(includeSourceProducer){
    const {requireSourceProducerOutput}=await import('./source-producer-successor-source.mjs');
    requireSourceProducerOutput(); // UNISSUED before programs, host, fixture or SQL.
  }
  assert(!includeCurrentSourceNativeProfile || includeSourceProducer,'CURRENT profile requires the unchanged SOURCE PG phase');
  assert(!includeSourceProducer || includeAssistantPublic587Successor,
    'SOURCE requires the genuine complete588 native phase, not an alternate587 chain');
  assert.equal(typeof includeStatisticsRevision,'boolean');
  assert.equal(typeof includeNativeIdentity,'boolean');
  assert.equal(typeof includeCurrentMemoryWarmup,'boolean');
  assert.equal(typeof includeEstablishedNativeCurrentOrigin,'boolean');
  assert.equal(typeof includeLastMileEnclosure,'boolean');
  assert.equal(typeof includeAccountStatisticsAssistant,'boolean');
  assert.equal(typeof includeNativeOriginalContinuity,'boolean');
  assert.equal(typeof includeAssistantLaterH0,'boolean');
  assert.equal(typeof includeAssistantPublic587Successor,'boolean');
  assert(!includeAssistantPublic587Successor || includeAssistantLaterH0,
    'Public587 successor requires the genuine complete587 native phase');
  if(includeAssistantPublic587Successor){
    const {requireAssistantPublic587SuccessorRelease}=await import('./assistant-later-h0-successor-source.mjs');
    requireAssistantPublic587SuccessorRelease(); // UNISSUED before programs, host, factory or SQL.
  }
  assert(!includeAssistantLaterH0 || includeNativeOriginalContinuity,'Assistant later-H0 requires the genuine complete586 native phase');
  if(includeAssistantLaterH0){
    const {requireAssistantLaterH0Release}=await import('./assistant-later-h0-successor-source.mjs');
    requireAssistantLaterH0Release(); // Before programs, host, factory or SQL.
  }
  assert(!includeNativeOriginalContinuity || includeAccountStatisticsAssistant,
    'Native continuity requires the genuine complete585 native phase');
  if(includeNativeOriginalContinuity){
    const {requireNativeOriginalContinuityOutput}=await import('./native-original-continuity-successor-source.mjs');
    requireNativeOriginalContinuityOutput(); // UNISSUED before programs, host or SQL.
  }
  assert(!includeAccountStatisticsAssistant || includeLastMileEnclosure,'585 requires the genuine complete584 native phase');
  assert(!includeLastMileEnclosure || includeEstablishedNativeCurrentOrigin,'Last-mile enclosure requires every genuine historical native phase');
  assert(!includeEstablishedNativeCurrentOrigin || includeCurrentMemoryWarmup,'Established origin requires every unchanged historical native phase');
  assert(!includeCurrentMemoryWarmup || (includeNativeIdentity && includeStatisticsRevision), 'CurrentMemoryWarmup requires every unchanged historical native phase');
  assert(!includeNativeIdentity || includeStatisticsRevision, 'NEW requires the unchanged statistics230 phase');
  const programs = await nativePrograms();
  assert.ok(typeof sourceDocumentAt === 'function' && typeof atHour === 'function'
    && typeof saveCheckpoint === 'function', 'normal fixture constructors are required');
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'rr-checkpoint-pg-'));
  assert.match(root, /^[A-Za-z0-9_/-]+$/, 'private native directory cannot be passed safely to pg_ctl');
  const data = path.join(root, 'database'), socket = path.join(root, 'socket');
  await fs.mkdir(socket, { mode: 0o700 });
  const env = { PATH: process.env.PATH, LANG: 'C.UTF-8', LC_ALL: 'C.UTF-8', TZ: 'UTC',
    PGHOST: socket, PGPORT: '5432', PGDATABASE: 'postgres', PGUSER: 'rr_native_test',
    PGPASSFILE: path.join(root, 'absent-password-file'), PGSSLMODE: 'disable' };
  let nativePhase = 'NATIVE_SETUP';
  const runSql = (input, timeout = 70_000) => command(programs.psql,
    ['-X', '-qAt', '-v', 'ON_ERROR_STOP=1', '-v', 'VERBOSITY=sqlstate', '-h', socket, '-p', '5432', '-U', 'rr_native_test', '-d', 'postgres'],
    { input, env, timeout });
  const psql = async (input, timeout = 70_000) => {
    const result = await command(programs.psql,
      ['-X', '-qAt', '-v', 'ON_ERROR_STOP=1', '-v', 'VERBOSITY=sqlstate', '-h', socket, '-p', '5432', '-U', 'rr_native_test', '-d', 'postgres'],
      { input, env, timeout });
    if (result.code !== 0) {
      // Emit the FIRST failed normal psql call before cleanup, using ONLY the
      // static phase/state/category projection, never raw stderr or input.
      console.error(nativePostgresFailureAnnotation(nativePhase,
        result.sqlState === 'UNKNOWN' ? '' : 'ERROR: ' + result.sqlState));
      throw new Error('NATIVE_POSTGRES_SQL_COMMAND_FAILED');
    }
    return result.stdout.trim();
  };
  let owner = null, started = false, stopped = false, cleanupAllowed = false;
  let statisticsRevisionFailure = null;
  const readOwner = async () => {
    const pid = Number((await fs.readFile(path.join(data, 'postmaster.pid'), 'utf8')).split('\n')[0]);
    assert.ok(Number.isSafeInteger(pid) && pid > 1, 'owned server PID missing');
    const argv = (await fs.readFile(`/proc/${pid}/cmdline`, 'utf8')).split('\0');
    assert.ok(argv.includes(data), 'native PostgreSQL is not bound to its owned directory');
    const stat = await fs.readFile(`/proc/${pid}/stat`, 'utf8');
    return { pid, birth: stat.slice(stat.lastIndexOf(')') + 2).split(' ')[19] };
  };
  try {
    const initialized = await command(programs.initdb,
      ['-D', data, '-U', 'rr_native_test', '--no-locale', '--encoding=UTF8', '--auth-local=trust', '--auth-host=reject'], { env });
    assert.equal(initialized.code, 0, 'existing native initdb failed');
    // An unknown launch outcome must preserve this private directory.
    const launch = await command(programs.pg_ctl, ['-D', data, '-l', path.join(root,'server.log'), '-w', '-t', '20', 'start', '-o',
      `-k ${socket} -p 5432 -c listen_addresses='' -c unix_socket_permissions=0700 -c log_statement=none -c log_min_error_statement=panic -c log_error_verbosity=terse`], { env });
    assert.equal(launch.code, 0, 'private Unix-socket PostgreSQL failed to start');
    started = true; owner = await readOwner();
    assert.equal(await psql("select current_setting('listen_addresses');"), '', 'TCP must remain disabled');
    const oldSource = sqlText(await fs.readFile(path.join(repositoryRoot, 'supabase/migrations', OLD_MIGRATION), 'utf8'));
    const newSource = sqlText(await fs.readFile(path.join(repositoryRoot, 'supabase/migrations', NEW_MIGRATION), 'utf8'));
    const accountSource = sqlText(await fs.readFile(path.join(repositoryRoot, 'supabase/migrations', ACCOUNT_MIGRATION), 'utf8'));
    const gridSource = sqlText(await fs.readFile(path.join(repositoryRoot, 'supabase/migrations', GRID_MIGRATION), 'utf8'));
    const issued = await issued213Factory(root);
    assert.equal(issued.atHour(49), atHour(49));
    const oldCas = definition(oldSource, 'ravradar_ravscore_checkpoint_cas');
    const newCas = definition(newSource, 'ravradar_ravscore_checkpoint_cas');
    const aliasCas = oldCas.replace(`function ${CAS}(`, `function ${CAS}_baseline(`);
    const setup = `
create schema auth; create schema extensions; create schema supabase_migrations;
create table supabase_migrations.schema_migrations(version text primary key);
insert into supabase_migrations.schema_migrations values('20261010130000');
create extension pgcrypto with schema extensions;
create role service_role nologin bypassrls; create role anon nologin; create role authenticated nologin;
create function auth.role() returns text language sql stable as $$ select current_setting('request.jwt.claim.role',true) $$;
create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
create table public.profiles(id uuid primary key);
grant usage on schema public,auth to service_role,anon,authenticated;
create table public.admin_documents(document_key text primary key,payload jsonb not null,
  version bigint not null default 1,updated_by uuid,updated_at timestamptz not null default now());
create table public.admin_document_versions(document_key text,payload jsonb,version bigint,created_by uuid);
create table public.native_checkpoint_payloads(name text primary key,payload jsonb not null);
grant select on public.admin_documents,public.native_checkpoint_payloads to service_role,anon,authenticated;
${signatures.map(name => definition(oldSource, name)).join('\n')}
${definition(oldSource,'ravradar_trip_v3_calibration_truth_allowed')}
revoke all on function public.ravradar_trip_v3_calibration_truth_allowed(text,jsonb,boolean,text,text,text,text)
  from public,anon,authenticated;
grant execute on function public.ravradar_trip_v3_calibration_truth_allowed(text,jsonb,boolean,text,text,text,text)
  to service_role;
${['ravradar_ravscore_checkpoint_integrated_state_reason','ravradar_ravscore_checkpoint_payload_reason',
  'ravradar_trip_v3_binding_allowed','ravradar_ravscore_checkpoint_contract'].map(name => definition(oldSource,name)).join('\n')}
create trigger native_checkpoint_version before update on public.admin_documents
for each row execute function public.version_admin_document();
${aliasCas}\n${oldCas}
revoke all on function ${CAS}(bigint,timestamptz,jsonb) from public,anon,authenticated;
revoke all on function ${CAS}_baseline(bigint,timestamptz,jsonb) from public,anon,authenticated;
grant execute on function ${CAS}(bigint,timestamptz,jsonb),${CAS}_baseline(bigint,timestamptz,jsonb) to service_role;
alter function ${CAS}(bigint,timestamptz,jsonb) set statement_timeout='55s';
alter function ${CAS}_baseline(bigint,timestamptz,jsonb) set statement_timeout='55s';
create function public.native_checkpoint_attempt(p_baseline boolean,p_expected bigint,p_payload jsonb)
returns jsonb language plpgsql as $$
declare result jsonb; code text; stored jsonb; previous jsonb; started timestamptz:=clock_timestamp();
begin
  select jsonb_build_object('version',version,'reference',payload->>'productionReferenceAt',
    'payloadMd5',md5(payload::text),'ownerIsNull',updated_by is null) into previous
    from public.admin_documents where document_key='${KEY}';
  begin
    if p_baseline then result:=public.ravradar_ravscore_checkpoint_cas_baseline(p_expected,(p_payload->>'productionReferenceAt')::timestamptz,p_payload);
    else result:=public.ravradar_ravscore_checkpoint_cas(p_expected,(p_payload->>'productionReferenceAt')::timestamptz,p_payload); end if;
  exception when query_canceled then get stacked diagnostics code=returned_sqlstate;
    when others then get stacked diagnostics code=returned_sqlstate; end;
  select jsonb_build_object('version',version,'reference',payload->>'productionReferenceAt',
    'storedPayloadMatchesIncoming',payload=p_payload,'payloadMd5',md5(payload::text),
    'ownerIsNull',updated_by is null) into stored from public.admin_documents where document_key='${KEY}';
  return jsonb_build_object('sqlstate',code,'result',result,'stored',stored,'previous',previous,
    'elapsedMs',extract(epoch from (clock_timestamp()-started))*1000);
end $$;
grant execute on function public.native_checkpoint_attempt(boolean,bigint,jsonb) to service_role,anon,authenticated;`;
    let currentFullPostgres=null;
    if(includeCurrentSourceNativeProfile){
      nativePhase='SOURCE_CURRENT_FULL_BOOTSTRAP';
      const full=await import('./source-current-full-postgres-bootstrap.mjs');
      currentFullPostgres=await full.bootstrapSourceCurrentFullPostgres({repositoryRoot,psql,setup});
    }else{
      await psql(setup);
    }
    const calibrationSignature='public.ravradar_trip_v3_calibration_truth_allowed(text,jsonb,boolean,text,text,text,text)';
    const calibrationAcl=JSON.parse(await psql("select jsonb_build_object("
      + "'public',exists(select 1 from pg_proc p cross join lateral aclexplode(coalesce(p.proacl,acldefault('f',p.proowner))) a"
      + " where p.oid='"+calibrationSignature+"'::regprocedure and a.grantee=0 and a.privilege_type='EXECUTE'),"
      + "'anon',has_function_privilege('anon','"+calibrationSignature+"','EXECUTE'),"
      + "'authenticated',has_function_privilege('authenticated','"+calibrationSignature+"','EXECUTE'),"
      + "'service',has_function_privilege('service_role','"+calibrationSignature+"','EXECUTE'));"));
    assert.deepEqual(calibrationAcl,{public:false,anon:false,authenticated:false,service:true},
      'actual old calibration-truth definition retains its original service-only ACL');
    // Execute the ENTIRE append-only migration: registered predecessor and exact
    // installed old body, transaction, lock timeout, replacement, ACL and notify.
    // Its own precondition/permissions are not reimplemented by this fixture.
    nativePhase = 'CAS200_MIGRATION';
    await psql(newSource);
    assert.equal(await psql("select current_setting('lock_timeout');"), '0',
      'complete migration must commit/reset its transaction-local lock timeout');
    const fixtures = {}, currentFixtures = {};
    const oldTuple={integrated:'249c7720512216b10ebcbd8bb29329760170a5c610c7cdfb618c92fb74787932',
      candidate:'55fd7dfa5ee36596c729d93225a448ea5b8f1e7142c44b8b1bda5c3d4d84c957',
      continuation:'a5430dd21e3135d6efc09e22df3dd0cdcafee723f962ff1d3cb52e7765b2aaa0'};
    const newTuple={integrated:'c1ac9b32d6bfb6bfeda81bc10566f6906d7046ef2b1481981b3470bda4a427f5',
      candidate:'2fdc7426ea99382731c6f4d118eacf4fc271f505fcf121bc67c5349c62938af9',
      continuation:'7876390c0e99dc1926d57e3e5a51a0c88c8e72c190add1ebcfd07964e928ea3b'};
    function metadataFixture(payload,from,to) {
      assert.equal(payload.modelBinding.modelBundleSha256,from.integrated);
      assert.equal(payload.continuationStateContractSha256,from.continuation);
      assert.equal(payload.candidateGRollbackCompanion.modelBinding.modelBundleSha256,from.candidate);
      const copy=structuredClone(payload);
      copy.modelBinding.modelBundleSha256=to.integrated;
      copy.continuationStateContractSha256=to.continuation;
      copy.candidateGRollbackCompanion.modelBinding.modelBundleSha256=to.candidate;
      for(const state of Object.values(copy.states)) {
        assert.equal(state.modelBundleSha256,from.integrated); state.modelBundleSha256=to.integrated;
      }
      return copy;
    }
    for (const [name, hour, options] of [['current',49,{}],['future',50,{}],['changed',49,{ candidateCurrentSpeedMps:0.18 }]]) {
      const sourcePath = path.join(root, `${name}-source.json`), checkpointPath = path.join(root, `${name}-checkpoint.json`);
      await fs.writeFile(sourcePath, JSON.stringify(issued.sourceDocumentAt(hour, `rr-native-sql-${hour}`, options)));
      await issued.saveRavScoreContinuationCheckpoint({ sourcePath, checkpointPath });
      fixtures[name] = JSON.parse(await fs.readFile(checkpointPath, 'utf8'));
      assert.equal(fixtures[name].partCount, 673); assert.equal(Object.keys(fixtures[name].states).length, 673);
      currentFixtures[name]=structuredClone(fixtures[name]);
      fixtures[name]=metadataFixture(currentFixtures[name],newTuple,oldTuple);
      assert.deepEqual(metadataFixture(fixtures[name],oldTuple,newTuple),currentFixtures[name],
        'historical thirteen-case fixture differs only in exact binding metadata');
    }
    // Exact metadata-only predecessor of the normal current-builder fixture.
    // Native SQL must itself validate its unchanged 673 state values/projection.
    fixtures.predecessor = structuredClone(fixtures.current);
    fixtures.predecessor.modelBinding.modelBundleSha256 = 'ffc67b30f6018791f46e169ff039be8fba4c6935ba218d83f38340b886d2b9eb';
    fixtures.predecessor.continuationStateContractSha256 = '4115f37178ff3d8eab540f3d9355a1275a13a9dd3a896e07f06673564e76ee51';
    fixtures.predecessor.candidateGRollbackCompanion.modelBinding.modelBundleSha256 = '8d9142b5f7d9b5a3e5a0f3593e73df0c7ffaf3d80c036317967cb713f09197e3';
    Object.values(fixtures.predecessor.states).forEach(state => { state.modelBundleSha256 = fixtures.predecessor.modelBinding.modelBundleSha256; });
    fixtures.unknown = structuredClone(fixtures.predecessor); fixtures.unknown.modelBinding.modelBundleSha256 = 'e'.repeat(64);
    fixtures.invalid = structuredClone(fixtures.current); fixtures.invalid.partCount = 672;
    nativePhase = 'BASELINE_FIXTURES';
    for (const [name,payload] of Object.entries(fixtures)) {
      const json = JSON.stringify(payload); assert.equal(json.includes('$native_fixture$'),false);
      await psql(`insert into public.native_checkpoint_payloads values('${name}',$native_fixture$${json}$native_fixture$::jsonb);`);
    }
    nativePhase = 'BASELINE_ADMISSION';
    const checked = JSON.parse(await psql(`select jsonb_build_object('current',public.ravradar_ravscore_checkpoint_payload_valid((select payload from native_checkpoint_payloads where name='current'),'${atHour(49)}'),
      'predecessor',public.ravradar_ravscore_checkpoint_userdata_predecessor_projection((select payload from native_checkpoint_payloads where name='predecessor'),'${atHour(49)}') is not null,
      'definer',(select prosecdef from pg_proc where oid='${CAS}(bigint,timestamptz,jsonb)'::regprocedure),
      'timeout',(select 'statement_timeout=55s'=any(proconfig) from pg_proc where oid='${CAS}(bigint,timestamptz,jsonb)'::regprocedure),
      'searchPath',(select 'search_path=pg_catalog, public'=any(proconfig) from pg_proc where oid='${CAS}(bigint,timestamptz,jsonb)'::regprocedure),
      'anonCanExecute',has_function_privilege('anon','${CAS}(bigint,timestamptz,jsonb)','execute'),
      'newBodySha256',(select encode(extensions.digest(btrim(prosrc,E' \\r\\n\\t')::bytea,'sha256'),'hex') from pg_proc where oid='${CAS}(bigint,timestamptz,jsonb)'::regprocedure),
      'oldBodySha256',(select encode(extensions.digest(btrim(prosrc,E' \\r\\n\\t')::bytea,'sha256'),'hex') from pg_proc where oid='${CAS}_baseline(bigint,timestamptz,jsonb)'::regprocedure));`));
    const body = source => source.slice(source.indexOf('as $$')+5,source.lastIndexOf('$$;')).trim();
    assert.deepEqual(checked,{ current:true,predecessor:true,definer:true,timeout:true,
      searchPath:true,anonCanExecute:false,newBodySha256:hash(body(newCas)),oldBodySha256:hash(body(oldCas)) });
    const cases = [
      ['insert',null,'current',0,null,'inserted',1],
      ['equal-stale-version','current','current',999,null,'unchanged',1],
      ['same-reference-changed-state','current','changed',1,'23505',null,1],
      ['regression','future','current',1,'22023',null,1],
      ['wrong-version','current','future',0,'40001',null,1],
      ['higher-reference','current','future',1,null,'updated',2],
      ['negative-version','current','current',-1,'22023',null,1],
      ['role-rejection','current','current',1,'42501',null,1,'service_role','anon'],
      ['ACL-rejection','current','current',1,'42501',null,1,'anon','anon'],
      ['same-predecessor','predecessor','current',1,null,'updated',2],
      ['changed-predecessor-state','predecessor','changed',1,'23505',null,1],
      ['unknown-predecessor','unknown','current',1,'22023',null,1],
      ['invalid-incoming','current','invalid',1,'22023',null,1],
    ];
    nativePhase = 'BASELINE_CAS_CASES';
    const reports=[];
    for (const [name,central,incoming,version,expectedCode,disposition,storedVersion,
      role='service_role',claimRole=role] of cases) {
      const observations=[];
      for (const baseline of [true,false]) {
        const reset = `truncate public.admin_documents;${central ? `insert into public.admin_documents(document_key,payload,version,updated_by) select '${KEY}',payload,1,'00000000-0000-0000-0000-000000000001' from native_checkpoint_payloads where name='${central}';` : ''}`;
        const observed=JSON.parse(await psql(`${reset}
set statement_timeout='55s'; do $$ begin perform set_config('request.jwt.claim.role','${claimRole}',false); end $$; set role ${role};
select public.native_checkpoint_attempt(${baseline},${version},(select payload from native_checkpoint_payloads where name='${incoming}'));`));
        if (observed.sqlstate!==expectedCode) {
          throw new Error(`NATIVE_POSTGRES_CASE_${name.replace(/-/g,'_').toUpperCase()}_SQLSTATE_${observed.sqlstate??'OK'}`);
        }
        if (disposition) { assert.equal(observed.result.disposition,disposition); assert.equal(observed.result.centralVersion,storedVersion); }
        assert.equal(observed.stored?.version,storedVersion);
        if (expectedCode || disposition==='unchanged') {
          assert.equal(observed.stored.ownerIsNull,false,'refused/unchanged CAS must preserve stored owner');
          const { storedPayloadMatchesIncoming,...stored }=observed.stored;
          assert.deepEqual(stored,observed.previous,'refused/unchanged CAS must preserve exact native stored payload/reference/version/owner');
        } else assert.equal(observed.stored.ownerIsNull,true);
        observations.push(observed);
      }
      const withoutTiming = value => { const { elapsedMs,...semantic }=value;return semantic; };
      assert.deepEqual(withoutTiming(observations[1]),withoutTiming(observations[0]),`native old/new ${name} invariance`);
      reports.push({case:name,oldElapsedMs:observations[0].elapsedMs,newElapsedMs:observations[1].elapsedMs,sqlstate:expectedCode,disposition,storedVersion});
    }
    nativePhase = 'ACCOUNT213';
    const accountAssistant=await compareAccountAssistantSuccessor({psql,runSql,source:accountSource,oldSource,
      oldFixtures:fixtures,currentFixtures,cases,atHour,oldCas,newCas});
    nativePhase = 'CURRENT220';
    const {withNativeI71CheckpointFactory,compareNativeSamplingIdentitySuccessor}=
      await import('./native-identity-checkpoint-postgres.mjs');
    const currentGrid=await withNativeI71CheckpointFactory(async old=>{
      assert.equal(old.atHour(49),atHour(49));
      return compareCurrentGridSuccessor({psql,runSql,source:gridSource,accountSource,
        oldFixtures:fixtures,issuedFixtures:currentFixtures,sourceDocumentAt:old.sourceDocumentAt,
        atHour:old.atHour,saveCheckpoint:old.saveRavScoreContinuationCheckpoint,root});
    });
    let statisticsRevision;
    if (includeStatisticsRevision) {
      nativePhase = 'STATISTICS230';
      try {
        const adapterUrl=new URL('./statistics-preference-revision-native-postgres.mjs',import.meta.url);
        const adapterStat=await fs.lstat(adapterUrl);
        assert.ok(adapterStat.isFile()&&!adapterStat.isSymbolicLink(),'fixed normal revision adapter must be a regular file');
        assert.equal(hash(await fs.readFile(adapterUrl)),'bd763c72cf4a32b1093b7a19d324f688ae61897e9697c7cf31d33ce6b308d51a');
        const {runNativeStatisticsRevisionProposal}=await import(adapterUrl.href);
        statisticsRevision=await runNativeStatisticsRevisionProposal({
          repositoryRoot,clusterDirectory:root,psqlExecutable:programs.psql,
        });
      } catch (error) { statisticsRevisionFailure={error}; throw error; }
    }
    let nativeIdentity;
    if (includeNativeIdentity) {
      nativePhase = 'NATIVE_IDENTITY0600';
      try {
        const {withNative0600CheckpointFactory} = await import('./current-memory-warmup-postgres.mjs');
        nativeIdentity=await withNative0600CheckpointFactory(async original =>
          compareNativeSamplingIdentitySuccessor({psql,runSql,root,
            sourceDocumentAt:original.sourceDocumentAt,atHour:original.atHour,
            saveCheckpoint:original.saveRavScoreContinuationCheckpoint,oldSource}));
      } catch (error) { statisticsRevisionFailure={error}; throw error; }
    }
    let currentMemoryWarmup;
    if (includeCurrentMemoryWarmup) {
      nativePhase = 'CURRENT_MEMORY_WARMUP';
      try {
        const {withFrozenCurrentMemoryWarmupPostgresSource} = await import('../run-frozen-current-memory-warmup-source-targets.mjs');
        const frozenWarmup=await withFrozenCurrentMemoryWarmupPostgresSource(async ({adapter,repositoryRoot,factory})=>
          adapter.compareCurrentMemoryWarmupSuccessor({psql,runSql,root,repositoryRoot,
            sourceDocumentAt:factory.sourceDocumentAt,atHour:factory.atHour,
            saveCheckpoint:factory.saveRavScoreContinuationCheckpoint}));
        currentMemoryWarmup=frozenWarmup.result;
      } catch (error) { statisticsRevisionFailure={error}; throw error; }
    }
    let establishedNativeCurrentOrigin;
    if (includeEstablishedNativeCurrentOrigin) {
      nativePhase='ESTABLISHED_NATIVE_CURRENT_ORIGIN';
      const {withFrozenEstablishedNativeCurrentOriginPostgresSource}=await import('../run-frozen-established-native-current-origin-source-targets.mjs');
      establishedNativeCurrentOrigin=await withFrozenEstablishedNativeCurrentOriginPostgresSource(async({adapter,factory})=>
        adapter.compareEstablishedNativeCurrentOriginSuccessor({psql,runSql,root,
          sourceDocumentAt:factory.sourceDocumentAt,atHour:factory.atHour,
          saveCheckpoint:factory.saveRavScoreContinuationCheckpoint}));
    }
    let lastMileEnclosure;
    if (includeLastMileEnclosure) {
      nativePhase='LAST_MILE_ENCLOSURE';
      if(includeAccountStatisticsAssistant){
        const {withFrozen584CheckpointPostgresSource}=await import('../run-frozen584-checkpoint-postgres-source.mjs');
        lastMileEnclosure=await withFrozen584CheckpointPostgresSource(async({adapter,factory})=>
          adapter.compareLastMileEnclosureSuccessor({psql,runSql,root,sourceDocumentAt:factory.sourceDocumentAt,
            atHour:factory.atHour,saveCheckpoint:factory.saveRavScoreContinuationCheckpoint}));
      }else{
        const {compareLastMileEnclosureSuccessor}=await import('./last-mile-enclosure-postgres.mjs');
        lastMileEnclosure=await compareLastMileEnclosureSuccessor({
          psql,runSql,root,sourceDocumentAt,atHour,saveCheckpoint});
      }
    }
    let accountStatisticsAssistant;
    if(includeAccountStatisticsAssistant){
      nativePhase='ACCOUNT_STATISTICS_ASSISTANT';
      if(includeNativeOriginalContinuity){
        const {withFrozen585CheckpointPostgresSource}=await import('../run-frozen585-native-continuity-postgres-source.mjs');
        accountStatisticsAssistant=await withFrozen585CheckpointPostgresSource(async({adapter,factory})=>
          adapter.compareAccountStatisticsAssistantSuccessor({psql,runSql,root,sourceDocumentAt:factory.sourceDocumentAt,
            atHour:factory.atHour,saveCheckpoint:factory.saveRavScoreContinuationCheckpoint}));
      }else{
        const {compareAccountStatisticsAssistantSuccessor}=await import('./account-statistics-assistant-postgres.mjs');
        accountStatisticsAssistant=await compareAccountStatisticsAssistantSuccessor({psql,runSql,root,sourceDocumentAt,atHour,saveCheckpoint});
      }
    }
    let nativeOriginalContinuity;
    if(includeNativeOriginalContinuity){
      nativePhase='NATIVE_ORIGINAL_CONTINUITY';
      if(includeAssistantLaterH0){
        const {withFrozen586CheckpointPostgresSource}=await import('../run-frozen586-assistant-later-h0-postgres-source.mjs');
        nativeOriginalContinuity=await withFrozen586CheckpointPostgresSource(async({adapter,factory})=>
          adapter.compareNativeOriginalContinuitySuccessor({psql,runSql,root,sourceDocumentAt:factory.sourceDocumentAt,
            atHour:factory.atHour,saveCheckpoint:factory.saveRavScoreContinuationCheckpoint}));
      }else{
      const {compareNativeOriginalContinuitySuccessor}=await import('./native-original-continuity-postgres.mjs');
      nativeOriginalContinuity=await compareNativeOriginalContinuitySuccessor({psql,runSql,root,sourceDocumentAt,atHour,saveCheckpoint});
      }
    }
    let assistantLaterH0;
    if(includeAssistantLaterH0){
      nativePhase='ASSISTANT_LATER_H0';
      if(includeAssistantPublic587Successor){
        const {withFrozen587CheckpointPostgresSource}=await import('../run-frozen586-assistant-later-h0-postgres-source.mjs');
        assistantLaterH0=await withFrozen587CheckpointPostgresSource(async({adapter,factory})=>
          adapter.compareAssistantLaterH0Successor({psql,runSql,root,sourceDocumentAt:factory.sourceDocumentAt,
            atHour:factory.atHour,saveCheckpoint:factory.saveRavScoreContinuationCheckpoint}));
      }else{
        const {compareAssistantLaterH0Successor}=await import('./assistant-later-h0-postgres.mjs');
        assistantLaterH0=await compareAssistantLaterH0Successor({psql,runSql,root,sourceDocumentAt,atHour,saveCheckpoint});
      }
    }
    let assistantPublic587Successor;
    if(includeAssistantPublic587Successor){
      nativePhase='ASSISTANT_PUBLIC587_SUCCESSOR';
      if(includeSourceProducer){
        const {withFrozen588CheckpointPostgresSource}=await import('../run-frozen586-assistant-later-h0-postgres-source.mjs');
        try{
        assistantPublic587Successor=await withFrozen588CheckpointPostgresSource(async({adapter,factory})=>
          adapter.compareAssistantPublic587Successor({psql,runSql,root,sourceDocumentAt:factory.sourceDocumentAt,
            atHour:factory.atHour,saveCheckpoint:factory.saveRavScoreContinuationCheckpoint}));
        }catch(error){statisticsRevisionFailure={error};throw error;} // Preserve the first new frozen588 failure if physical cleanup also fails.
      }else{
      const {compareAssistantPublic587Successor}=await import('./assistant-later-h0-postgres.mjs');
      assistantPublic587Successor=await compareAssistantPublic587Successor({psql,runSql,root,sourceDocumentAt,atHour,saveCheckpoint});
      }
    }
    let sourceProducer;
    if(includeSourceProducer){
      nativePhase='SOURCE_PRODUCER';
      const {compareSourceProducerSuccessor}=await import('./source-producer-postgres.mjs');
      try{sourceProducer=await compareSourceProducerSuccessor({psql,runSql,root,sourceDocumentAt,atHour,saveCheckpoint});}
      catch(error){statisticsRevisionFailure={error};throw error;} // Existing same-host first-failure owner; never a retry.
    }
    let currentSourceNativeProfile;
    let sourceLegacyCompatibility;
    if(includeSourceProducer&&!includeCurrentSourceNativeProfile){
      nativePhase='SOURCE_LEGACY_COMPATIBILITY';
      // The normal pre-merge --source-producer phase, AFTER genuine585/586/587/588
      // and SOURCE SQL comparison. No GitHub/main proof or SOURCE19 activation.
      assert.deepEqual(await readOwner(),owner);
      const head=(await command('git',['-C',repositoryRoot,'rev-parse','HEAD'],{env})).stdout.trim();
      assert.match(head,/^[a-f0-9]{40}$/);
      // Source CI has restored Node22 for the unchanged native SQL matrix.
      // Only this later normal CURRENT-input child requires the ACTUAL Node24
      // executable observed in the preceding dedicated acquisition cohort.
      const node24=process.env.RAVRADAR_SOURCE_NATIVE_NODE24_PATH;
      assert(typeof node24==='string'&&path.isAbsolute(node24)&&!/[\r\n\0]/.test(node24),
        'SOURCE_LEGACY_ACTUAL_NODE24_PATH_REQUIRED');
      assert.equal(await fs.realpath(node24),node24,'SOURCE_LEGACY_NODE24_PATH_ALIASED');
      const runtime=await command(node24,['--version'],{env});
      assert.equal(runtime.code,0);assert.match(runtime.stdout.trim(),/^v24\.\d+\.\d+$/,
        'SOURCE_LEGACY_ACTUAL_NODE24_REQUIRED');
      // Private test evidence is outside the PG directory's unchanged normal
      // cleanup. Capture failure is UNKNOWN observation, not a new process result.
      let privateLogsRoot=null;
      try{
        const parent=path.join(repositoryRoot,'.cache');await fs.mkdir(parent,{recursive:true});
        privateLogsRoot=await fs.mkdtemp(path.join(parent,'native-pg-source-legacy-diagnostics-'));
      }catch{}
      const invocation=await sourceLegacyCommand(process.env.PYTHON||'python3',
        ['-I','-B',path.join(repositoryRoot,'scripts/run-source19-terminal-native-bank.py'),
          '--source-legacy-compatibility','--node24-path',node24],
        {input:JSON.stringify({kind:'SOURCE_CURRENT_SAME_NATIVE_PG',pgRoot:root,psql:programs.psql,head,server:owner}),
          env,timeout:240*60*1000,privateLogsRoot});
      if(invocation.code!==0&&invocation.privateLogsPreserved&&invocation.privateLogsComplete){
        const first=nativePostgresChildFirstFailure(invocation.stdout,invocation.stderr);
        try{if(first)console.error(JSON.stringify(first));}catch{}
      }
      assert.equal(invocation.code,0,'NATIVE_POSTGRES_SOURCE_LEGACY_COMPATIBILITY_REFUSED');
      const reports=invocation.stdout.split(/\r?\n/).flatMap(line=>{
        if(line.length>2048)return [];try{const value=JSON.parse(line);
          return value?.kind==='SOURCE_LEGACY_COMPATIBILITY_SYNTHETIC'?[value]:[];}catch{return [];}
      });
      assert.equal(reports.length,1,'Actual child must emit exactly one bounded legacy report');
      const actual=reports[0];
      assert.deepEqual(Object.keys(actual).sort(),['kind','sameH0MetadataPreserved','ordinaryFollowerCount','zoneCount',
        'partCount','hourCount','normalBThenS','wholeReadback','originalBytesRetained','actionInvoked','sdkInvoked',
        'sourceAdmission','mainProof','activeProfileIssued','sqlExecuted','productionProof','retentionCleanup','nativePayloadValidation','nativePairData'].sort());
      for(const key of ['sameH0MetadataPreserved','normalBThenS','wholeReadback','originalBytesRetained'])assert.equal(actual[key],true);
      for(const key of ['actionInvoked','sdkInvoked','sourceAdmission','mainProof','activeProfileIssued','sqlExecuted','productionProof'])
        assert.equal(actual[key],false);
      assert.equal(actual.ordinaryFollowerCount,1);assert.equal(actual.zoneCount,210);
      assert.equal(actual.partCount,673);assert.equal(actual.hourCount,118);
      assert.equal(typeof actual.retentionCleanup.complete,'boolean');
      assert(Number.isSafeInteger(actual.retentionCleanup.failureCount)&&actual.retentionCleanup.failureCount>=0);
      const native=actual.nativePayloadValidation;
      assert.deepEqual(Object.keys(native).sort(),['actualReadOnlyCallCount','sourceModel','current','follower'].sort());
      assert.equal(native.actualReadOnlyCallCount,2);
      const expectedModel=(await import('./source-producer-successor-source.mjs')).requireSourceProducerBinding();
      assert.deepEqual(native.sourceModel,{C:expectedModel.C,I:expectedModel.I,T:expectedModel.T});
      for(const name of ['current','follower']){
        const pin=native[name];
        assert.deepEqual(Object.keys(pin).sort(),['bytes','sha256','targetReferenceAt']);
        assert(Number.isSafeInteger(pin.bytes)&&pin.bytes>=2&&pin.bytes<=16*1024*1024);
        assert.match(pin.sha256,/^[a-f0-9]{64}$/);
        assert.match(pin.targetReferenceAt,/^\d{4}-\d{2}-\d{2}T\d{2}:00:00\.000Z$/);
        assert.equal(new Date(pin.targetReferenceAt).toISOString(),pin.targetReferenceAt);
      }
      assert.equal(Date.parse(native.follower.targetReferenceAt)-Date.parse(native.current.targetReferenceAt),3600000);
      assert.deepEqual(await readOwner(),owner);
      const receipt=actual.nativePairData;
      assert.deepEqual(Object.keys(receipt).sort(),['bytes','sha256','targetReferenceAt','checkpointFileSha256','bundleContentSha256'].sort());
      assert(Number.isSafeInteger(receipt.bytes)&&receipt.bytes>0&&receipt.bytes<=17*1024*1024);
      for(const key of ['sha256','checkpointFileSha256','bundleContentSha256'])assert.match(receipt[key],/^[a-f0-9]{64}$/);
      assert.equal(receipt.targetReferenceAt,native.follower.targetReferenceAt);
      const pairFile=path.join(root,'rated-source589-normal-pair.json');
      const pairStat=await fs.lstat(pairFile,{bigint:true});
      assert(pairStat.isFile()&&!pairStat.isSymbolicLink()&&pairStat.nlink===1n);
      assert.equal(pairStat.uid,BigInt(process.getuid()));assert.equal(Number(pairStat.size),receipt.bytes);
      const raw=await fs.readFile(pairFile);assert.equal(raw.length,receipt.bytes);assert.equal(hash(raw),receipt.sha256);
      const stableStat=await fs.lstat(pairFile,{bigint:true});
      for(const key of ['dev','ino','mode','nlink','size','mtimeNs','ctimeNs'])assert.equal(stableStat[key],pairStat[key]);
      const pair=JSON.parse(raw);
      assert.deepEqual(Object.keys(pair).sort(),['schemaVersion','kind','sourceHead','B','S','bundleManifest','checkpointFile'].sort());
      assert.equal(pair.schemaVersion,1);assert.equal(pair.kind,'SOURCE_NATIVE_NORMAL_B_S_DATA');assert.equal(pair.sourceHead,head);
      for(const [name,key] of [['B','ravscore-private-production-runtime-pointer'],['S','ravscore-continuation-checkpoint']]){
        assert.deepEqual(Object.keys(pair[name]).sort(),['document_key','payload','version']);
        assert.equal(pair[name].document_key,key);assert(Number.isSafeInteger(pair[name].version)&&pair[name].version>0);
      }
      const {validateProtectedPrivateRuntimePointer}=await import(pathToFileURL(path.join(repositoryRoot,'scripts/protected-private-production-runtime.mjs')).href);
      const pointer=validateProtectedPrivateRuntimePointer(pair.B.payload);
      assert.equal(pointer.current.modelBinding.modelBundleSha256,expectedModel.I);
      assert.equal(pointer.current.productionReferenceAt,receipt.targetReferenceAt);
      assert.equal(pointer.current.datasetId,pair.S.payload.datasetId);
      assert.equal(pointer.current.bundleContentSha256,receipt.bundleContentSha256);
      assert.equal(pair.S.payload.productionReferenceAt,receipt.targetReferenceAt);
      assert.equal(pair.S.payload.modelBinding.modelBundleSha256,expectedModel.I);
      assert.equal(pair.S.payload.candidateGRollbackCompanion.modelBinding.modelBundleSha256,expectedModel.C);
      assert.equal(pair.S.payload.continuationStateContractSha256,expectedModel.T);
      assert.equal(pair.checkpointFile.sha256,receipt.checkpointFileSha256);
      assert.equal(Object.keys(pair.S.payload.states).length,673);
      const dataLiteral=value=>"convert_from(decode('"+Buffer.from(JSON.stringify(value)).toString('base64')+"','base64'),'UTF8')::jsonb";
      assert.equal(await psql('select public.ravradar_ravscore_checkpoint_payload_valid('+dataLiteral(pair.S.payload)+','
        +"("+dataLiteral(receipt.targetReferenceAt)+"#>>'{}')::timestamptz);"),'t');
      assert.equal(hash(await fs.readFile(pairFile)),receipt.sha256);
      assert.deepEqual(await readOwner(),owner);
      sourceLegacyCompatibility=actual;
    }
    if(includeCurrentSourceNativeProfile){
      try{
      nativePhase='SOURCE_CURRENT_CASE_ISOLATION';
      // Only the completed SQL matrix's one reset(central) TEST row. Keep the
      // real fixture's EMPTY assertion, all history and every original-bank row.
      assert.deepEqual(await readOwner(),owner);
      assert.equal(await psql("select count(*)=1 and bool_and(a.document_key='ravscore-continuation-checkpoint' "
        +"and a.version=1 and a.updated_by='00000000-0000-0000-0000-000000000001'::uuid "
        +"and exists(select 1 from public.native_checkpoint_payloads b where b.payload=a.payload)) "
        +"from public.admin_documents a;"),'t','Only the SQL matrix seeded fixture row may be reset');
      assert.equal(await psql('select count(*) from public.admin_document_versions;'),'0');
      const bankSql="select jsonb_build_array(encode(extensions.digest(row_bytes,'sha256'),'hex'),octet_length(row_bytes))::text as fingerprint "
        +"from (select convert_to(to_jsonb(t)::text,'UTF8') as row_bytes from public.native_checkpoint_payloads t) whole_rows "
        +"order by fingerprint collate \"C\";";
      const completeBank=await psql(bankSql);
      await psql('truncate public.admin_documents;'); // Same normal per-case reset, only in this owned TEST PG.
      assert.equal(await psql('select count(*) from public.admin_documents;'),'0');
      assert.equal(await psql('select count(*) from public.admin_document_versions;'),'0');
      assert.equal(await psql(bankSql),completeBank,'WHOLE original/native bank retained across case reset');
      assert.deepEqual(await readOwner(),owner);
      nativePhase='SOURCE_CURRENT_FULL_READBACK';
      const full=await import('./source-current-full-postgres-bootstrap.mjs');
      await full.verifySourceCurrentFullPostgres({repositoryRoot,psql,bootstrap:currentFullPostgres});
      // SAME existing owned Unix-socket server AFTER every unchanged old/SOURCE
      // comparison. Its normal finally still owns actual server stop/cleanup.
      nativePhase='SOURCE_PRODUCER';
      assert.deepEqual(await readOwner(),owner);
      const head=(await command('git',['-C',repositoryRoot,'rev-parse','HEAD'],{env})).stdout.trim();
      assert.match(head,/^[a-f0-9]{40}$/);
      const profileEnvironment={...env,
        ...(process.env.GITHUB_TOKEN?{GITHUB_TOKEN:process.env.GITHUB_TOKEN}:{}),
        ...(process.env.GITHUB_REPOSITORY?{GITHUB_REPOSITORY:process.env.GITHUB_REPOSITORY}:{})};
      const invocation=await command(process.env.PYTHON||'python3',
        ['-I','-B',path.join(repositoryRoot,'scripts/run-source19-terminal-native-bank.py'),
          '--current-source-profile','--node24-path',process.execPath],
        {input:JSON.stringify({kind:'SOURCE_CURRENT_SAME_NATIVE_PG',pgRoot:root,psql:programs.psql,head,server:owner}),
          env:profileEnvironment,timeout:240*60*1000});
      const firstProfileFailure=currentSourceNativeFirstFailure(invocation.stdout);
      if(firstProfileFailure||invocation.code!==0){
        const fixed=firstProfileFailure??{kind:'CURRENT_SOURCE_NATIVE_FIRST_FAILURE',phase:'UNKNOWN',
          reason:'MISSING_CHILD_FIXED_REPORT',sqlstate:invocation.sqlState??'UNKNOWN',route:'NONE',privatePayloadIncluded:false};
        console.error(JSON.stringify(fixed));
        const error=new Error('NATIVE_POSTGRES_CURRENT_PROFILE_REFUSED phase='+fixed.phase+' reason='+fixed.reason
          +' sqlstate='+fixed.sqlstate+' route='+fixed.route);error.currentNativeFailure=Object.freeze(fixed);throw error;
      }
      assert.deepEqual(await readOwner(),owner);
      currentSourceNativeProfile={sameHost:true,actualNativeProcessCompleted:true,productionProof:false};
      }catch(error){statisticsRevisionFailure={error};throw error;}
    }
    return {kind:'NATIVE_POSTGRES_CHECKPOINT_CAS_COMPARISON',accountAssistant,currentGrid,
      ...(includeStatisticsRevision?{statisticsRevision}:{}),
      ...(includeNativeIdentity?{nativeIdentity}:{}),
      ...(includeCurrentMemoryWarmup?{currentMemoryWarmup}:{}),
      ...(includeEstablishedNativeCurrentOrigin?{establishedNativeCurrentOrigin}:{}),
      ...(includeLastMileEnclosure?{lastMileEnclosure}:{}),
      ...(includeAccountStatisticsAssistant?{accountStatisticsAssistant}:{}),
      ...(includeNativeOriginalContinuity?{nativeOriginalContinuity}:{}),
      ...(includeAssistantLaterH0?{assistantLaterH0}:{}),
      ...(includeAssistantPublic587Successor?{assistantPublic587Successor}:{}),
      ...(includeSourceProducer?{sourceProducer}:{}),
      ...(includeSourceProducer&&!includeCurrentSourceNativeProfile?{sourceLegacyCompatibility}:{}),
      ...(includeCurrentSourceNativeProfile?{currentSourceNativeProfile}:{}),
      issuedSource:issued.sourceReceipt,postgresMajorVersion:programs.majorVersion,
      tcpEnabled:false,normalModelPartCount:673,sqlExecuted:true,migrationExecuted:true,
      migrationSQLSha256:hash(newSource),caseCount:reports.length,
      oldCasDefinitionSha256:hash(oldCas),newCasDefinitionSha256:hash(newCas),reports};
  } catch(error) {
    if(includeSourceProducer){
      // Keep every genuine588/SOURCE/child first failure before unchanged PG cleanup.
      if(statisticsRevisionFailure===null)statisticsRevisionFailure={error};
      await emitNativePostgresFirstFailure(error,nativePhase);
    }
    throw error;
  } finally {
    try {
    if (started) {
      const current = await readOwner(); assert.deepEqual(current,owner,'native server ownership changed; preserve directory');
      const stop=await command(programs.pg_ctl,['-D',data,'-m','immediate','-w','-t','20','stop'],{env});
      assert.equal(stop.code,0,'native server stop was not proved; preserve directory');
      const status=await command(programs.pg_ctl,['-D',data,'status'],{env});
      assert.equal(status.code,3,'native server is not physically terminal; preserve directory');
      stopped=true;
      cleanupAllowed=true;
    }
    const resolved=path.resolve(root), temp=path.resolve(os.tmpdir());
    assert.ok(path.dirname(resolved)===temp && path.basename(resolved).startsWith('rr-checkpoint-pg-'));
    if (cleanupAllowed && (!started || stopped)) await fs.rm(resolved,{recursive:true,force:false});
    } catch (cleanupError) {
      if(includeSourceProducer)await emitNativePostgresFirstFailure(cleanupError,'NATIVE_CLEANUP');
      // Keep the first revision failure; unknown/failed stop retains the same
      // owned directory. Never turn physical cleanup failure into success.
      if (statisticsRevisionFailure!==null) throw statisticsRevisionFailure.error;
      throw cleanupError;
    }
  }
}

// Current-only normal seam. Refuse before touching caller operands or native I/O.
export async function runNativeSourceProducerSqlComparison(options){
  const {requireSourceProducerOutput}=await import('./source-producer-successor-source.mjs');
  requireSourceProducerOutput();
  assert.equal(arguments.length,1);
  return runNativeCheckpointSqlComparison({...options,includeStatisticsRevision:true,includeNativeIdentity:true,
    includeCurrentMemoryWarmup:true,includeEstablishedNativeCurrentOrigin:true,includeLastMileEnclosure:true,
    includeAccountStatisticsAssistant:true,includeNativeOriginalContinuity:true,includeAssistantLaterH0:true,
    includeAssistantPublic587Successor:true,includeSourceProducer:true});
}
