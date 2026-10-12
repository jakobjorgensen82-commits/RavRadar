#!/usr/bin/env node
// One owner-authorised metadata read; never an installer, RPC or arbitrary SQL API.
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { performance } from 'node:perf_hooks';

const ROOT = new URL('../', import.meta.url);
const QUERY = new URL('./typed-trip-catalog-read.sql', import.meta.url);
const QUERY_SHA = '825ee5c9674923c0a3601c893ba871b2518d91cb12026a513e72fc9d6893944b';
const ENDPOINT = 'https://api.supabase.com/v1/projects/afqhhdrkjfjtpadntdzo/database/query';
const REQUEST_MS = 15_000, TOTAL_MS = 30_000, BODY_BYTES = 262144, META_BYTES = 196608;
const sha = value => crypto.createHash('sha256').update(value).digest('hex');
const plain = value => value !== null && typeof value === 'object' && !Array.isArray(value);
function fail(code) { const error = new Error(code); error.code = code; throw error; }
function need(value, code) { if (!value) fail(code); }
function keys(value, expected) {
  return plain(value) && Object.keys(value).sort().join('\n') === [...expected].sort().join('\n');
}
const TYPES = Object.freeze({
  schema_version: 'int2', rav_score: 'int2',
  user_id: 'uuid', anonymous_id: 'uuid', trip_id: 'uuid', client_observation_id: 'uuid',
  trip_started_at: 'timestamptz', trip_ended_at: 'timestamptz', observed_at: 'timestamptz',
  submitted_at: 'timestamptz', forecast_issued_at: 'timestamptz', forecast_valid_at: 'timestamptz',
  forecast_captured_at: 'timestamptz', search_minutes: 'int4', found: 'bool', calibration_eligible: 'bool',
  grams: 'numeric', wind_speed_mps: 'numeric', wind_direction_deg: 'numeric',
  wave_height_m: 'numeric', wave_period_s: 'numeric', water_level_cm: 'numeric',
  current_speed_mps: 'numeric', current_direction_deg: 'numeric',
  search_coverage: 'text', hunt_mode: 'text', result: 'text', actual_zone_id: 'text',
  actual_coastal_part_id: 'text', forecast_zone_id: 'text', forecast_coastal_part_id: 'text',
  model_version: 'text', forecast_snapshot_id: 'text', calibration_features: 'jsonb',
  weather_snapshot: 'jsonb', data_quality_flags: 'jsonb', gps: 'jsonb',
});
const EXTRA_COLUMNS = new Set(['id','zone_id','zone_name','coast_type','created_at','score_level',
  'ai_probability','ai_confidence','water_temperature_c','forecast_target_at','report_accuracy']);
const ROLE_NAMES = Object.freeze(['anon','authenticated','service_role']);
const SIGNATURES = Object.freeze([
  'auth.role()', 'auth.uid()', 'public.ravradar_trip_payload_has_sensitive_key(jsonb)',
  'public.ravradar_trip_v3_score_quality_allowed(text,jsonb)',
  'public.ravradar_trip_v3_calibration_truth_allowed(text,jsonb,boolean,text,text,text,text)',
  'public.ravradar_trip_v3_binding_allowed(text,jsonb,boolean,text,text,text,text)',
  'public.ravradar_trip_v3_active_binding_admitted(text,text,text,text,text,text,text,text,text,text,text,jsonb,boolean,text,text,text,text)',
  'public.ravradar_observation_require_active_v3_binding()',
  'public.ravradar_trip_v3_js9_projection_matches(numeric,numeric,integer)',
  'public.ravradar_trip_v3_ffc_historical_original_valid(public.observations)',
  'public.ravradar_trip_v3_ffc_historical_admitted(jsonb,uuid)',
]);
const CAPS = Object.freeze({ columns:64, constraints:32, indexes:32, triggers:8, functions:11, roles:3, memberships:32 });
const COUNT_KIND = Object.freeze({ column:'columns', constraint:'constraints', index:'indexes',
  trigger:'triggers', function:'functions', role:'roles', membership:'memberships' });
const SAFE_TYPES = new Set(['int2','int4','int8','uuid','text','varchar','bpchar','numeric',
  'float4','float8','bool','jsonb','timestamp','timestamptz']);
const SAFE_PATHS = new Set([null,'search_path=pg_catalog, public','search_path=public',
  'search_path=public, pg_catalog','search_path=','search_path=auth','search_path=auth, pg_catalog']);
const OLD = 'supabase/migrations/20261005000000_owner_water_level_only_binding.sql';
const GRID = 'supabase/migrations/20261012000000_current_grid_original_bound_successor.sql';
const BASE = 'supabase/migrations/20260829020000_integrated_trip_calibration_binding.sql';
const HISTORY = 'supabase/migrations/20261012010000_owner_ffc_historical_trip_intake.sql';
const FN = Object.freeze([
  [2,BASE,'plpgsql','i',true,false], [3,OLD,'plpgsql','i',true,false],
  [3,GRID,'plpgsql','i',true,false], [4,OLD,'plpgsql','i',false,false],
  [4,GRID,'plpgsql','i',false,false], [5,OLD,'sql','i',false,false],
  [5,GRID,'sql','i',false,false], [6,BASE,'plpgsql','v',false,true],
  [7,BASE,'plpgsql','v',false,true], [7,HISTORY,'plpgsql','v',false,true],
  [8,HISTORY,'plpgsql','i',false,false], [9,HISTORY,'plpgsql','i',true,false],
  [10,HISTORY,'plpgsql','s',false,true],
]);
function body(sql, signature) {
  const name = signature.split('(')[0];
  const marker = 'create or replace function ' + name + '(';
  const at = sql.indexOf(marker), start = sql.indexOf('as $$', at), end = sql.indexOf('\n$$;', start);
  need(at >= 0 && start > at && end > start && sql.indexOf(marker, at + marker.length) < 0,
    'CATALOG_REVIEWED_SOURCE_MISSING');
  const args = /\)(?:\s*)returns\b/i.exec(sql.slice(at + marker.length,start));
  need(args, 'CATALOG_REVIEWED_SIGNATURE_MISSING');
  const parameterText = sql.slice(at + marker.length,start).slice(0,args.index);
  return {body:sql.slice(start + 5,end).replace(/\r\n?/g,'\n').trim(),
    args:normalArgs(parameterText)};
}
function normalArgs(value) {
  return typeof value === 'string' ? value.replace(/\bpublic\.observations\b/g,'observations')
    .replace(/\s+/g,' ').replace(/\s*,\s*/g,',').trim() : null;
}
async function reviewedBodies() {
  const texts = new Map();
  let successorSourceMissing = false;
  for (const filename of new Set(FN.map(item => item[1]))) {
    let bytes;
    try { bytes = await fs.readFile(new URL(filename, ROOT)); }
    catch (error) {
      if ((filename === GRID || filename === HISTORY) && error?.code === 'ENOENT') {
        successorSourceMissing = true;
        continue;
      }
      throw error;
    }
    need(bytes.length <= 1024 * 1024, 'CATALOG_SOURCE_BOUND');
    texts.set(filename, new TextDecoder('utf-8',{fatal:true}).decode(bytes).replace(/\r\n?/g,'\n'));
  }
  return {successorSourceMissing, reviewed:FN.filter(item => texts.has(item[1]))
    .map(([index,filename,language,volatility,strict,definer]) => ({
    signature:SIGNATURES[index], ...body(texts.get(filename),SIGNATURES[index]),
    result:index===7?'trigger':'boolean',searchPath:index===2?'search_path=public':'search_path=pg_catalog, public',
    language, volatility, strict, definer,
  }))};
}
function compiledBody(definition) {
  if (typeof definition !== 'string' || Buffer.byteLength(definition) > 32768) return null;
  const match = /\bAS\s+(\$(?:[A-Za-z_][A-Za-z0-9_]*)?\$)([\s\S]*)\1\s*;\s*$/i.exec(definition);
  return match ? match[2].replace(/\r\n?/g,'\n').trim() : null;
}
function projectTypedCatalogMetadata(row, reviewed, successorSourceMissing) {
  need(keys(row,['bytes','metadata']) && Number.isSafeInteger(row.bytes)
    && row.bytes >= 0 && row.bytes <= META_BYTES, 'CATALOG_DOCUMENT_BOUND');
  const doc = row.metadata;
  need(keys(doc,['schemaVersion','rows']) && doc.schemaVersion === 'ravradar-typed-trip-catalog-read-v1'
    && Array.isArray(doc.rows) && doc.rows.length <= 184
    && Buffer.byteLength(JSON.stringify(doc)) <= META_BYTES, 'CATALOG_SCHEMA');
  const seen = new Set(), counts = Object.fromEntries(Object.keys(CAPS).map(key => [key,0]));
  const refusals = new Set(['FULL_TYPED_EXECUTION_NOT_PROVED','REVIEWED_AUTH_SOURCE_MISSING','NATIVE_CHECK_ORACLE_MISSING','NATIVE_TRIGGER_ORACLE_MISSING']);
  if (successorSourceMissing) refusals.add('REVIEWED_SUCCESSOR_SOURCE_MISSING');
  const facts = [], functions = [];
  let engine, relation, tripCheckPresent = false, triggerPresent = false;
  for (const item of doc.rows) {
    need(keys(item,['kind','name','metadata']) && typeof item.kind === 'string'
      && typeof item.name === 'string' && item.name.length <= 512 && plain(item.metadata), 'CATALOG_ROW_SHAPE');
    const key = item.kind + '\n' + item.name;
    need(!seen.has(key), 'CATALOG_DUPLICATE'); seen.add(key);
    const m = item.metadata;
    if (COUNT_KIND[item.kind]) counts[COUNT_KIND[item.kind]]++;
    else need(item.kind === 'engine' || item.kind === 'relation', 'CATALOG_KIND');
    if (item.kind === 'engine') {
      need(item.name === 'server' && !engine && keys(m,['serverVersionNum','targetCount','counts'])
        && Number.isSafeInteger(m.serverVersionNum) && m.serverVersionNum >= 100000
        && m.serverVersionNum < 230000 && m.targetCount === 1 && keys(m.counts,Object.keys(CAPS)), 'CATALOG_ENGINE');
      engine=m;
    } else if (item.kind === 'relation') {
      need(item.name === 'public.observations' && !relation
        && keys(m,['kind','owner','rls','forceRls','hasInheritance']), 'CATALOG_RELATION');
      relation=m;
      if (m.kind !== 'r' || m.hasInheritance !== false || m.rls !== true) refusals.add('UNREVIEWED_RELATION');
    } else if (item.kind === 'column') {
      need(keys(m,['position','typeSchema','typeName','typeKind','formattedType','typmod','notNull',
        'identity','generated','arrayDimensions','hasMissingValue','defaultBytes','default']), 'CATALOG_COLUMN_SCHEMA');
      need(Number.isSafeInteger(m.position) && m.position > 0 && Number.isSafeInteger(m.typmod)
        && typeof m.notNull === 'boolean' && ['', 'a','d'].includes(m.identity)
        && ['', 's'].includes(m.generated), 'CATALOG_COLUMN_SHAPE');
      if (m.defaultBytes !== null && (!Number.isSafeInteger(m.defaultBytes) || m.defaultBytes < 0
        || m.defaultBytes > 2048 || typeof m.default !== 'string')) fail('CATALOG_DEFAULT_BOUND');
      if (!Object.hasOwn(TYPES,item.name) && !EXTRA_COLUMNS.has(item.name)) {
        refusals.add('UNREVIEWED_COLUMN'); continue;
      }
      const safe = m.typeSchema === 'pg_catalog' && m.typeKind === 'b'
        && SAFE_TYPES.has(m.typeName) && m.arrayDimensions === 0;
      if (!safe) refusals.add('UNREVIEWED_TYPE');
      if (Object.hasOwn(TYPES,item.name)) {
        facts.push({column:item.name,type:safe?m.typeName:'UNKNOWN',typmod:m.typmod,
          position:m.position,notNull:m.notNull,identity:m.identity,generated:m.generated,
          sourceTypeMatch:safe && m.typeName === TYPES[item.name]});
        if (!safe || m.typeName !== TYPES[item.name]) refusals.add('SOURCE_COLUMN_TYPE_DIFFERS');
      }
    } else if (item.kind === 'function') {
      need(SIGNATURES.includes(item.name) && keys(m,['present','owner','kind','language','arguments','result',
        'volatility','strict','securityDefiner','returnsSet','searchPath','otherConfiguration','definitionBytes',
        'definition','sameNameCount','aclCount','execute','acl']), 'CATALOG_FUNCTION_SCHEMA');
      need(typeof m.present === 'boolean' && Number.isSafeInteger(m.sameNameCount)
        && m.sameNameCount >= 0 && Number.isSafeInteger(m.aclCount) && m.aclCount >= 0
        && m.aclCount <= 16, 'CATALOG_FUNCTION_SHAPE');
      const bytes = m.definitionBytes;
      need(bytes === null || (Number.isSafeInteger(bytes) && bytes >= 0 && bytes <= 32768
        && typeof m.definition === 'string' && Buffer.byteLength(m.definition) === bytes), 'CATALOG_FUNCTION_BOUND');
      if (!m.present || m.sameNameCount !== 1) refusals.add('MISSING_OR_OVERLOADED_FUNCTION');
      const actual = compiledBody(m.definition);
      const source = reviewed.find(candidate => m.present === true && m.sameNameCount === 1
        && candidate.signature === item.name && actual === candidate.body
        && m.kind === 'f' && m.language === candidate.language && m.volatility === candidate.volatility
        && m.strict === candidate.strict && m.securityDefiner === candidate.definer && m.returnsSet === false
        && m.result === candidate.result && normalArgs(m.arguments) === candidate.args
        && m.searchPath === candidate.searchPath && m.otherConfiguration === false);
      const configReviewed = SAFE_PATHS.has(m.searchPath) && m.otherConfiguration === false;
      if (!configReviewed) refusals.add('UNREVIEWED_FUNCTION_CONFIGURATION');
      if (!source && !item.name.startsWith('auth.')) refusals.add('FUNCTION_SOURCE_NOT_MATCHED');
      const acl = m.acl ?? [];
      need(Array.isArray(acl) && acl.length === m.aclCount && keys(m.execute,ROLE_NAMES), 'CATALOG_ACL_SCHEMA');
      for (const grant of acl) {
        need(keys(grant,['grantee','grantorIsOwner','privilege','grantable']), 'CATALOG_ACL_SCHEMA');
        if (!['PUBLIC','OWNER',...ROLE_NAMES].includes(grant.grantee)) refusals.add('UNREVIEWED_ACL_GRANTEE');
      }
      functions.push({signature:item.name,present:m.present,bodySignatureConfigurationMatch:Boolean(source && configReviewed),
        sourceBodySha256:source && configReviewed?sha(source.body):null,
        configuration:configReviewed?m.searchPath:'UNKNOWN',serviceExecute:m.execute.service_role === true,
        anonExecute:m.execute.anon === true,authenticatedExecute:m.execute.authenticated === true});
    } else if (item.kind === 'role') {
      need(ROLE_NAMES.includes(item.name) && keys(m,['present','superuser','inherit','createRole','createDb',
        'login','replication','bypassRls','tablePrivileges']), 'CATALOG_ROLE_SCHEMA');
      need(typeof m.present === 'boolean' && ['superuser','inherit','createRole','createDb','login',
        'replication','bypassRls'].every(key=>typeof m[key] === 'boolean' || (!m.present && m[key]===null))
        && keys(m.tablePrivileges,['select','insert','update','delete','anyColumnSelect','anyColumnInsert','anyColumnUpdate'])
        && Object.values(m.tablePrivileges).every(value=>typeof value === 'boolean' || (!m.present && value===null)),
      'CATALOG_ROLE_SHAPE');
      if (m.present !== true) refusals.add('ROLE_MISSING');
      if (item.name !== 'service_role' && m.tablePrivileges?.anyColumnInsert !== false)
        refusals.add('DIRECT_CLIENT_INSERT_NOT_REJECTED');
    } else if (item.kind === 'membership') {
      need(keys(m,['grantedRole','memberRole','admin','inherit','set']), 'CATALOG_MEMBERSHIP_SCHEMA');
      if (!ROLE_NAMES.includes(m.grantedRole) && !ROLE_NAMES.includes(m.memberRole)) fail('CATALOG_MEMBERSHIP_SCOPE');
      if (![...ROLE_NAMES,'authenticator'].includes(m.grantedRole)
        || ![...ROLE_NAMES,'authenticator'].includes(m.memberRole) || m.inherit === null || m.set === null)
        refusals.add('UNREVIEWED_MEMBERSHIP');
    } else if (item.kind === 'constraint' || item.kind === 'index' || item.kind === 'trigger') {
      need(Number.isSafeInteger(m.definitionBytes) && m.definitionBytes >= 0
        && m.definitionBytes <= (item.kind === 'constraint'?32768:4096)
        && typeof m.definition === 'string' && Buffer.byteLength(m.definition) === m.definitionBytes,
      'CATALOG_DEFINITION_BOUND');
      if (item.kind === 'constraint' && item.name === 'ravradar_observations_trip_v3_check') tripCheckPresent=true;
      else if (item.kind === 'trigger' && item.name === 'ravradar_observations_active_v3_binding_trigger') {
        triggerPresent=true;
        if (!['O','A'].includes(m.enabled)) refusals.add('TRIGGER_NOT_ENABLED');
      } else refusals.add('ADDITIONAL_CATALOG_OBJECT_REVIEW_REQUIRED');
    }
  }
  need(engine && relation, 'CATALOG_REQUIRED_ROWS');
  for (const [key,cap] of Object.entries(CAPS))
    need(Number.isSafeInteger(engine.counts[key]) && engine.counts[key] === counts[key]
      && counts[key] <= cap, 'CATALOG_COUNT_BOUND');
  need(counts.functions === 11 && counts.roles === 3, 'CATALOG_FIXED_INVENTORY');
  if (facts.length !== 37) refusals.add('REQUIRED_COLUMN_MISSING');
  if (!tripCheckPresent) refusals.add('TRIP_CHECK_MISSING');
  if (!triggerPresent) refusals.add('TRIP_TRIGGER_MISSING');
  const report = {schemaVersion:'ravradar-typed-trip-catalog-report-v1',status:'READ_REVIEW_REQUIRED',
    evidenceScope:'METADATA_ONLY_BODY_SIGNATURE_CONFIGURATION',requestAttempts:1,serverVersionNum:engine.serverVersionNum,counts,
    columns:facts.sort((a,b)=>a.column.localeCompare(b.column)),
    functions:functions.sort((a,b)=>a.signature.localeCompare(b.signature)),
    completeOldOrNewCheckSourceMatch:false,authRoleUidSourceMatch:false,wholeTriggerSourceMatch:false,
    fullTypedRpcTriggerCheckProved:false,refusalCodes:[...refusals].sort()};
  need(Buffer.byteLength(JSON.stringify(report)) <= 16384, 'CATALOG_REPORT_BOUND');
  return Object.freeze(report);
}
export async function readTypedTripCatalog(options) {
  need(keys(options,['accessToken']) || keys(options,['accessToken','fetchImpl']), 'CATALOG_ARGUMENTS');
  const {accessToken,fetchImpl=globalThis.fetch}=options;
  need(typeof accessToken === 'string' && accessToken.trim() && typeof fetchImpl === 'function',
    'CATALOG_CONFIGURATION');
  const started=performance.now(), controller=new AbortController();
  let rejectTotal, rejectRequest, requestTimer;
  const totalFailure=new Promise((_,reject)=>{rejectTotal=reject;});
  const totalTimer=setTimeout(()=>{rejectTotal(new Error('CATALOG_TOTAL_DEADLINE'));controller.abort();},TOTAL_MS);
  const bounded=promise=>Promise.race([promise,totalFailure]);
  try {
    const query=await bounded(fs.readFile(QUERY));
    need(query.length === 11725 && sha(query) === QUERY_SHA,'CATALOG_QUERY_PIN');
    const {reviewed,successorSourceMissing}=await bounded(reviewedBodies());
    const requestFailure=new Promise((_,reject)=>{rejectRequest=reject;});
    requestTimer=setTimeout(()=>{rejectRequest(new Error('CATALOG_REQUEST_DEADLINE'));controller.abort();},
      Math.min(REQUEST_MS,TOTAL_MS-(performance.now()-started)));
    const requestBounded=promise=>bounded(Promise.race([promise,requestFailure]));
    const response=await requestBounded(fetchImpl(ENDPOINT,{method:'POST',redirect:'error',
      signal:controller.signal,headers:{authorization:'Bearer '+accessToken,'content-type':'application/json'},
      body:JSON.stringify({query:new TextDecoder('utf-8',{fatal:true}).decode(query),read_only:true})}));
    need(response.status === 201 && !response.redirected && response.body,'CATALOG_HTTP_STATUS');
    const declared=response.headers.get('content-length');
    if (declared !== null) need(/^\d+$/.test(declared) && Number(declared) <= BODY_BYTES,'CATALOG_BODY_BOUND');
    const reader=response.body.getReader(), chunks=[];let bytes=0;
    try {
      while (true) {
        const item=await requestBounded(reader.read()); if (item.done) break;
        need(item.value instanceof Uint8Array,'CATALOG_BODY_SHAPE');
        bytes+=item.value.byteLength;need(bytes <= BODY_BYTES,'CATALOG_BODY_BOUND');chunks.push(item.value);
      }
    } finally { reader.releaseLock(); }
    const value=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(Buffer.concat(chunks,bytes)));
    const rows=Array.isArray(value)?value:keys(value,['result'])?value.result:keys(value,['data'])?value.data:null;
    need(Array.isArray(rows) && rows.length === 1,'CATALOG_ENVELOPE');
    return projectTypedCatalogMetadata(rows[0],reviewed,successorSourceMissing);
  } finally {clearTimeout(totalTimer);clearTimeout(requestTimer);controller.abort();}
}
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  try {
    need(process.argv.length === 2 && process.env.GITHUB_EVENT_NAME === 'workflow_dispatch'
      && process.env.GITHUB_REF === 'refs/heads/main' && process.env.GITHUB_RUN_ATTEMPT === '1',
      'CATALOG_INVOCATION');
    console.log(JSON.stringify(await readTypedTripCatalog({accessToken:process.env.SUPABASE_ACCESS_TOKEN})));
  } catch(error) {
    const code=/^CATALOG_[A-Z_]+$/.test(String(error.code??error.message))?String(error.code??error.message):'CATALOG_READ_FAILED';
    console.error(JSON.stringify({schemaVersion:'ravradar-typed-trip-catalog-report-v1',status:'FAIL',code}));
    process.exitCode=1;
  }
}
