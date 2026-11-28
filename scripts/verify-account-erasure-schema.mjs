#!/usr/bin/env node
// App metadata only. No API call, account row, migration write or erasure authority.
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
export const ACCOUNT_ERASURE_MIGRATION = 'supabase/migrations/20261116181500_account_erasure_outbox_off.sql';
export const ACCOUNT_ERASURE_APP_MIGRATION = Object.freeze({version:'20261116181500',
 id:'20261116181500_account_erasure_outbox_off',filename:'20261116181500_account_erasure_outbox_off.sql'});
const ROOT = fileURLToPath(new URL('../',import.meta.url));
const hash = text => crypto.createHash('sha256').update(text).digest('hex');
const columns = [
 ['operation_id','uuid',true,false,0],['target_user_id','uuid',true,false,0],['requested_by','uuid',true,false,0],
 ['mode','text',true,true,0],['state','text',true,false,0],['hold_reason','text',false,false,0],
 ['activity_first','timestamptz',false,false,0],['activity_last','timestamptz',false,false,0],
 ['profile_was_active','bool',true,false,0],['prepared_at','timestamptz',true,false,0],['updated_at','timestamptz',true,false,0],
 ['pg_staged_at','timestamptz',false,false,0],['pg_rows_removed','int8',true,true,0],
 ['auth_attempt_id','uuid',false,false,0],['auth_attempt_ids','_uuid',true,true,1],
 ['auth_user_created_at','text',false,false,0],['auth_claimed_at','timestamptz',false,false,0],
 ['auth_absent_at','timestamptz',false,false,0],['d1_owner_subject','text',false,false,0],
 ['d1_ack_at','timestamptz',false,false,0],['d1_deleted_count','int8',false,false,0],
];
const signatures = Object.freeze({
 account_erasure_check_metadata:'',
 account_erasure_require_owner:'',account_erasure_require_service_owner:'uuid',account_erasure_storage_hold:'uuid',
 account_erasure_policy_hold:'uuid',account_erasure_status_json:'uuid,uuid,boolean',get_account_erasure_status:'uuid',
 list_account_erasure_operations:'uuid',
 find_account_erasure_operation:'uuid',prepare_account_erasure:'uuid,uuid',stage_account_erasure_pg:'uuid,text',
 get_account_erasure_service_status:'uuid,uuid',claim_account_erasure_auth:'uuid,uuid,uuid,uuid,text,text',
 acknowledge_account_erasure_auth_absent:'uuid,uuid,uuid,uuid,text',acknowledge_account_erasure_d1:'uuid,uuid,uuid,text,bigint',
 account_erasure_observation_guard:'',account_erasure_profile_guard:'',account_erasure_auth_uuid_guard:'',
});
const exposed = new Set(['get_account_erasure_status','list_account_erasure_operations','find_account_erasure_operation','prepare_account_erasure','stage_account_erasure_pg']);
const server = new Set(['get_account_erasure_service_status','claim_account_erasure_auth',
 'acknowledge_account_erasure_auth_absent','acknowledge_account_erasure_d1']);
const timed = new Set(['account_erasure_require_owner','account_erasure_require_service_owner','prepare_account_erasure',
 'stage_account_erasure_pg','claim_account_erasure_auth','acknowledge_account_erasure_auth_absent','acknowledge_account_erasure_d1']);
const keys = (value,names) => value && typeof value==='object' && !Array.isArray(value)
 && Object.keys(value).sort().join(',') === [...names].sort().join(',');
function need(condition, catalogCategory) {
 if(condition)return;
 try { assert(condition,'ACCOUNT_ERASURE_CATALOG_MISMATCH'); }
 catch(error) {
  if(catalogCategory) error.catalogCategory=catalogCategory;
  throw error;
 }
}
export function readAccountErasureSource(root=ROOT) {
 const sql=fs.readFileSync(path.join(root,ACCOUNT_ERASURE_MIGRATION),'utf8').replaceAll('\r\n','\n');
 const bodies=Object.fromEntries([...sql.matchAll(/create function public\.(\w+)\([^;]*?\bas \$(\w+)\$\n([\s\S]*?)\n\$\2\$;/g)]
  .map(match=>[match[1],hash(match[3].trim())]));
 assert.deepEqual(Object.keys(bodies).sort(),Object.keys(signatures).sort(),'ACCOUNT_ERASURE_SOURCE_FUNCTIONS');
 const declarations=[...sql.matchAll(/create function public\.(\w+)\(([\s\S]*?)\)\nreturns/g)];
 const argumentNames=Object.fromEntries(declarations.map(([,name,args])=>[name,args.trim()?args.split(',').map(arg=>arg.trim().split(/\s+/)[0]):null]));
 const argumentDefaults=Object.fromEntries(declarations.map(([,name,args])=>[name,(args.match(/\bdefault\b/gi)||[]).length]));
 assert.deepEqual(Object.keys(argumentNames).sort(),Object.keys(signatures).sort());
 return {sql,sha256:hash(sql),bodies,argumentNames,argumentDefaults};
}
const wanted=Object.entries(signatures).map(([name,args])=>"('"+name+"','public."+name+'('+args+")','"+(exposed.has(name)?'authenticated':server.has(name)?'service_role':'none')+"')").join(',');
export const accountErasureCatalogQuery = String.raw`with wanted(name,signature,exposure) as (values `+wanted+String.raw`),
functions as (select w.name,jsonb_build_object(
 'present',p.oid is not null,'sameNameCount',(select count(*) from pg_catalog.pg_proc where pronamespace='public'::regnamespace and proname=w.name),
 'definer',p.prosecdef,'owner',pg_catalog.pg_get_userbyid(p.proowner),
 'ownerBypassesRls',(select rolsuper or rolbypassrls from pg_catalog.pg_roles where oid=p.proowner),
 'kind',p.prokind,'language',l.lanname,'volatility',p.provolatile,'returnsSet',p.proretset,
 'argumentNames',p.proargnames,'argumentDefaults',p.pronargdefaults,
 'result',pg_catalog.pg_get_function_result(p.oid),'configuration',p.proconfig,
 'bodySha256',pg_catalog.encode(extensions.digest(pg_catalog.convert_to(pg_catalog.btrim(p.prosrc,E' \n\r\t'),'UTF8'),'sha256'),'hex'),
 'publicExecute',exists(select 1 from pg_catalog.aclexplode(coalesce(p.proacl,pg_catalog.acldefault('f',p.proowner))) a where a.grantee=0 and a.privilege_type='EXECUTE'),
 'anonExecute',pg_catalog.has_function_privilege('anon',p.oid,'EXECUTE'),
 'authenticatedExecute',pg_catalog.has_function_privilege('authenticated',p.oid,'EXECUTE'),
 'serviceExecute',pg_catalog.has_function_privilege('service_role',p.oid,'EXECUTE'),
 'unexpectedAcl',exists(select 1 from pg_catalog.aclexplode(coalesce(p.proacl,pg_catalog.acldefault('f',p.proowner))) a
   where a.grantee<>p.proowner and (w.exposure='none' or a.grantee<>coalesce((select oid from pg_catalog.pg_roles where rolname=w.exposure),0) or a.is_grantable))) metadata
 from wanted w left join pg_catalog.pg_proc p on p.oid=pg_catalog.to_regprocedure(w.signature)
 left join pg_catalog.pg_language l on l.oid=p.prolang),
target as (select * from pg_catalog.pg_class where oid=pg_catalog.to_regclass('public.account_erasure_operations'))
select jsonb_build_object('table',(
 select jsonb_build_object('regular',c.relkind='r','rls',c.relrowsecurity,'forceRls',c.relforcerowsecurity,
 'owner',pg_catalog.pg_get_userbyid(c.relowner),
 'ownerBypassesRls',(select rolsuper or rolbypassrls from pg_catalog.pg_roles where oid=c.relowner),
 'columns',(select jsonb_agg(jsonb_build_array(a.attname,t.typname,a.attnotnull,a.atthasdef,a.attndims) order by a.attnum)
   from pg_catalog.pg_attribute a join pg_catalog.pg_type t on t.oid=a.atttypid
   where a.attrelid=c.oid and a.attnum>0 and not a.attisdropped and a.attgenerated='' and a.attidentity='' and t.typnamespace='pg_catalog'::regnamespace),
 'foreignKeys',(select count(*) from pg_catalog.pg_constraint where conrelid=c.oid and contype='f'),
 'checks',(select count(*) from pg_catalog.pg_constraint where conrelid=c.oid and contype='c' and convalidated and not condeferrable),
 'constraintCount',(select count(*) from pg_catalog.pg_constraint where conrelid=c.oid),
 'primaryKey',(select count(*) from pg_catalog.pg_constraint where conrelid=c.oid and contype='p' and conkey=array[1]::smallint[] and convalidated and not condeferrable),
 'policies',(select count(*) from pg_catalog.pg_policy where polrelid=c.oid),
 'userTriggers',(select count(*) from pg_catalog.pg_trigger where tgrelid=c.oid and not tgisinternal),
 'unexpectedAcl',exists(select 1 from pg_catalog.aclexplode(coalesce(c.relacl,pg_catalog.acldefault('r',c.relowner))) a where a.grantee<>c.relowner),
 'unexpectedColumnAcl',exists(select 1 from pg_catalog.pg_attribute col cross join lateral pg_catalog.aclexplode(col.attacl) a
   where col.attrelid=c.oid and col.attnum>0 and not col.attisdropped and a.grantee<>c.relowner),
 'directAccess',pg_catalog.has_table_privilege('anon',c.oid,'SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER')
  or pg_catalog.has_any_column_privilege('anon',c.oid,'SELECT,INSERT,UPDATE,REFERENCES')
  or pg_catalog.has_table_privilege('authenticated',c.oid,'SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER')
  or pg_catalog.has_any_column_privilege('authenticated',c.oid,'SELECT,INSERT,UPDATE,REFERENCES')
  or pg_catalog.has_table_privilege('service_role',c.oid,'SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER')
  or pg_catalog.has_any_column_privilege('service_role',c.oid,'SELECT,INSERT,UPDATE,REFERENCES'),
 'activeTargetIndex',(select jsonb_build_object('unique',i.indisunique,'valid',i.indisvalid,'ready',i.indisready,
  'keys',i.indkey::text,'predicate',pg_catalog.pg_get_expr(i.indpred,i.indrelid))
  from pg_catalog.pg_index i where i.indexrelid=pg_catalog.to_regclass('public.account_erasure_one_active_target')))
 from target c),
 'functions',(select jsonb_object_agg(name,metadata) from functions),
 'checks',(select pg_catalog.jsonb_build_object('format','PG_CONSTRAINTDEF_V1',
   'postgresMajor',pg_catalog.current_setting('server_version_num')::integer / 10000,
   'definitions',pg_catalog.jsonb_agg(pg_catalog.jsonb_build_array(k.conname,pg_catalog.pg_get_constraintdef(k.oid,false))
     order by k.conname::text collate pg_catalog."C"))
   from pg_catalog.pg_constraint k where k.conrelid=(select oid from target) and k.contype='c'),
 'triggers',(select jsonb_object_agg(w.name,jsonb_build_object('present',t.oid is not null,'sameNameCount',
  (select count(*) from pg_catalog.pg_trigger where tgname=w.name),'relation',t.tgrelid::regclass::text,
  'events',t.tgtype,'enabled',t.tgenabled,'internal',t.tgisinternal,'arguments',t.tgnargs,
  'predicate',t.tgqual is not null,'function',t.tgfoid::regprocedure::text))
 from (values ('account_erasure_observation_write_guard','public.observations'),
 ('account_erasure_profile_write_guard','public.profiles'),('account_erasure_auth_uuid_insert_guard','auth.users')) w(name,relation)
 left join pg_catalog.pg_trigger t on t.tgname=w.name and t.tgrelid=pg_catalog.to_regclass(w.relation))) as metadata;`;
export function verifyAccountErasureCheckReference(value,{postgresMajor}={}) {
 need(keys(value,['format','postgresMajor','definitions','definitionsSha256']));
 need(value.format==='PG_CONSTRAINTDEF_V1'&&Number.isSafeInteger(value.postgresMajor)&&value.postgresMajor>=16);
 if(postgresMajor!==undefined)need(value.postgresMajor===postgresMajor);
 need(Array.isArray(value.definitions)&&value.definitions.length===28&&JSON.stringify(value.definitions).length<=16384);
 const names=[];
 for(const row of value.definitions){need(Array.isArray(row)&&row.length===2&&/^account_erasure_operations_[a-z0-9_]+$/.test(row[0])
   &&typeof row[1]==='string'&&row[1].startsWith('CHECK (')&&row[1].length<=4096);names.push(row[0]);}
 need(new Set(names).size===28&&JSON.stringify(names)===JSON.stringify([...names].sort()));
 need(value.definitionsSha256===hash(JSON.stringify(value.definitions)));
 return Object.freeze(structuredClone(value));
}
export function accountErasureCheckReference(metadata) {
 need(keys(metadata,['format','postgresMajor','definitions']),'CHECK_FORMAT');
 try { return verifyAccountErasureCheckReference({...metadata,definitionsSha256:hash(JSON.stringify(metadata.definitions))}); }
 catch(error) {
  if(error.message==='ACCOUNT_ERASURE_CATALOG_MISMATCH')error.catalogCategory='CHECK_FORMAT';
  throw error;
 }
}
export function verifyAccountErasureCatalogMetadata(input,{source=readAccountErasureSource(),expectedCheckReference}={}) {
 const rows=typeof input==='string'?JSON.parse(input):input;
 need(Array.isArray(rows)&&rows.length===1&&keys(rows[0],['metadata']),'CATALOG_ENVELOPE');const value=rows[0].metadata;
 need(keys(value,['table','functions','triggers','checks']),'CATALOG_ENVELOPE');const table=value.table;
 need(keys(table,['regular','rls','forceRls','owner','ownerBypassesRls','columns','foreignKeys','checks','constraintCount','primaryKey','policies','userTriggers','unexpectedAcl','unexpectedColumnAcl','directAccess','activeTargetIndex']),'TABLE_CONTRACT');
 need(table.regular===true&&table.rls===true&&table.forceRls===true&&table.foreignKeys===0
  &&['postgres','rr_native_test'].includes(table.owner)&&table.ownerBypassesRls===true
  &&table.checks===28&&table.constraintCount===29&&table.primaryKey===1&&table.policies===0&&table.userTriggers===0
  &&table.unexpectedAcl===false&&table.unexpectedColumnAcl===false&&table.directAccess===false,'TABLE_CONTRACT');
 need(JSON.stringify(table.columns)===JSON.stringify(columns),'COLUMN_CONTRACT');const index=table.activeTargetIndex;
 need(keys(index,['unique','valid','ready','keys','predicate'])&&index.unique===true&&index.valid===true&&index.ready===true&&index.keys==='2','INDEX_CONTRACT');
 need(index.predicate==="((state = 'PREPARED'::text) OR (pg_staged_at IS NOT NULL))",'INDEX_CONTRACT');
 need(keys(value.functions,Object.keys(signatures)),'FUNCTION_CONTRACT');
 for(const [name,row] of Object.entries(value.functions)) {
  need(keys(row,['present','sameNameCount','definer','owner','ownerBypassesRls','kind','language','volatility','returnsSet','argumentNames','argumentDefaults','result','configuration','bodySha256','publicExecute','anonExecute','authenticatedExecute','serviceExecute','unexpectedAcl']),'FUNCTION_CONTRACT');
  const expectedConfig=['search_path=""',...(timed.has(name)?['lock_timeout=5s']:[]),
   ...(name==='account_erasure_check_metadata'?['standard_conforming_strings=on']:[])];
  need(row.present===true&&row.sameNameCount===1&&row.definer===true&&row.owner===table.owner&&row.ownerBypassesRls===true&&row.kind==='f'&&row.language==='plpgsql'
   &&row.volatility===(name==='account_erasure_check_metadata'?'s':'v')&&row.returnsSet===false
   &&JSON.stringify(row.argumentNames)===JSON.stringify(source.argumentNames[name])&&row.argumentDefaults===source.argumentDefaults[name]
   &&JSON.stringify(row.configuration)===JSON.stringify(expectedConfig)&&row.bodySha256===source.bodies[name]
   &&row.publicExecute===false&&row.anonExecute===false&&row.serviceExecute===server.has(name)&&row.unexpectedAcl===false
   &&row.authenticatedExecute===exposed.has(name),'FUNCTION_CONTRACT');
  need(row.result===(['account_erasure_require_owner','account_erasure_require_service_owner'].includes(name)?'uuid':
   ['account_erasure_policy_hold','account_erasure_storage_hold'].includes(name)?'text':name.endsWith('_guard')?'trigger':'jsonb'),'FUNCTION_CONTRACT');
 }
 need(keys(value.triggers,['account_erasure_observation_write_guard','account_erasure_profile_write_guard','account_erasure_auth_uuid_insert_guard']),'TRIGGER_CONTRACT');
 for(const [name,row] of Object.entries(value.triggers)) {
  const [relation,events,fn]=name.includes('observation')?['observations',23,'account_erasure_observation_guard()']:
   name.includes('profile')?['profiles',23,'account_erasure_profile_guard()']:['auth.users',7,'account_erasure_auth_uuid_guard()'];
  need(keys(row,['present','sameNameCount','relation','events','enabled','internal','arguments','predicate','function']),'TRIGGER_CONTRACT');
  need(row.present===true&&row.sameNameCount===1&&row.relation===relation&&row.events===events
   &&row.enabled==='O'&&row.internal===false&&row.arguments===0&&row.predicate===false
   &&row.function===fn,'TRIGGER_CONTRACT');
 }
 const checkReference=accountErasureCheckReference(value.checks);
 if(expectedCheckReference!==undefined){
  const expected=verifyAccountErasureCheckReference(expectedCheckReference);
  // Record both majors. Exact name/definition bytes need no cross-version
  // formatter assumption or normalization; any actual difference is refused.
  assert.deepEqual(checkReference.definitions,expected.definitions,'ACCOUNT_ERASURE_CHECK_SEMANTICS_MISMATCH');
  need(checkReference.format===expected.format&&checkReference.definitionsSha256===expected.definitionsSha256);
 }
 return {schemaVersion:2,kind:'MANUAL_ACCOUNT_ERASURE_LIFECYCLE_CATALOG',migration:ACCOUNT_ERASURE_MIGRATION,
  sourceSha256:source.sha256,catalogVerified:true,scope:'FUNCTION_BODIES_ACL_TABLE_SHAPE_FENCES',
  checkExpressionSemanticsVerified:expectedCheckReference!==undefined,checkReference,
  nativePostgresMajor:expectedCheckReference?.postgresMajor??null,
  authAdminIntegrated:false,authDeletionProved:false,d1Acknowledged:false,
  automaticEligibility:false,completionAuthority:false};
}
export async function verifyInstalledAccountErasureSchema(options) {
 need(keys(options,['accessToken','expectedCheckReference'])||keys(options,['accessToken','expectedCheckReference','fetchImpl']));
 const {accessToken,expectedCheckReference,fetchImpl=globalThis.fetch}=options;
 verifyAccountErasureCheckReference(expectedCheckReference);
 const rows=await readFixedAppCatalogRows(accountErasureCatalogQuery,{accessToken,fetchImpl});
 return verifyAccountErasureCatalogMetadata(rows,{expectedCheckReference});
}

async function readFixedAppCatalogRows(query,{accessToken,fetchImpl}) {
 need(typeof accessToken==='string'&&accessToken.length>0&&!/[\r\n]/.test(accessToken)&&typeof fetchImpl==='function');
 const controller=new AbortController();let rejectDeadline;
 const deadline=new Promise((_,reject)=>{rejectDeadline=reject;});
 const timer=setTimeout(()=>{rejectDeadline(new Error('ACCOUNT_ERASURE_CATALOG_DEADLINE'));controller.abort();},15000);
 const bounded=promise=>Promise.race([promise,deadline]);
 try {
  const response=await bounded(fetchImpl('https://api.supabase.com/v1/projects/afqhhdrkjfjtpadntdzo/database/query',{
   method:'POST',redirect:'error',cache:'no-store',credentials:'omit',signal:controller.signal,
   headers:{authorization:'Bearer '+accessToken,'content-type':'application/json'},
   body:JSON.stringify({query,read_only:true})}));
  need(response.status===201&&!response.redirected&&response.body);
  const length=response.headers.get('content-length');need(length===null||(/^\d+$/.test(length)&&Number(length)<=32768));
  const reader=response.body.getReader(),chunks=[];let count=0;
  try{while(true){const item=await bounded(reader.read());if(item.done)break;need(item.value instanceof Uint8Array);
   count+=item.value.byteLength;need(count<=32768);chunks.push(item.value);}}finally{reader.releaseLock();}
  const parsed=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(Buffer.concat(chunks,count)));
  return Array.isArray(parsed)?parsed:keys(parsed,['result'])?parsed.result:keys(parsed,['data'])?parsed.data:null;
 }finally{clearTimeout(timer);controller.abort();}
}

export const tripRecoveryCatalogQuery = `
with function_scope(signature, volatility, service_execute) as (values
 ('public.guard_trip_erasure_recovery_write()', 'v', false),
 ('public.acquire_trip_erasure_recovery_hold(uuid)', 'v', true),
 ('public.read_trip_erasure_recovery_hold()', 's', true),
 ('public.record_trip_owner_erasure_intent(text,boolean)', 'v', true),
 ('public.read_trip_erasure_restore_subjects(uuid,timestamptz,timestamptz,text)', 's', true)
), table_scope(name) as (values ('public.trip_erasure_recovery_gate'), ('public.trip_owner_erasure_intents')),
trigger_scope(relation, trigger_name) as (values
 ('public.trip_owner_erasure_intents', 'trip_owner_erasure_recovery_guard'),
 ('public.account_erasure_operations', 'account_erasure_recovery_guard'),
 ('public.observations', 'trip_observation_recovery_guard')
)
select
 (select count(*) = 5 and bool_and(p.prosecdef and p.provolatile::text = s.volatility
   and coalesce(p.proconfig @> array['search_path=""'], false)
   and not pg_catalog.has_function_privilege('anon', p.oid, 'EXECUTE')
   and not pg_catalog.has_function_privilege('authenticated', p.oid, 'EXECUTE')
   and pg_catalog.has_function_privilege('service_role', p.oid, 'EXECUTE') = s.service_execute
   and not pg_catalog.has_function_privilege('service_role', p.oid, 'EXECUTE WITH GRANT OPTION')
   and not exists (select 1 from pg_catalog.aclexplode(coalesce(p.proacl, pg_catalog.acldefault('f', p.proowner))) a
     where a.grantee <> p.proowner and (not s.service_execute
       or a.grantee <> 'service_role'::regrole or a.is_grantable)))
  from function_scope s join pg_catalog.pg_proc p on p.oid = pg_catalog.to_regprocedure(s.signature)) as functions_ok,
 (select count(*) = 2 and bool_and(c.relrowsecurity and c.relforcerowsecurity
   and not exists (select 1 from pg_catalog.aclexplode(coalesce(c.relacl, pg_catalog.acldefault('r', c.relowner))) a
     where a.grantee <> c.relowner)
   and not pg_catalog.has_table_privilege('service_role', c.oid, 'SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER'))
  from table_scope s join pg_catalog.pg_class c on c.oid = pg_catalog.to_regclass(s.name)) as tables_ok,
 (select count(*) = 3 and bool_and(not t.tgisinternal and t.tgenabled = 'O' and t.tgtype = 62
   and t.tgfoid = pg_catalog.to_regprocedure('public.guard_trip_erasure_recovery_write()'))
  from trigger_scope s join pg_catalog.pg_trigger t on t.tgrelid = pg_catalog.to_regclass(s.relation)
   and t.tgname = s.trigger_name) as triggers_ok;`;

export async function verifyTripErasureRecoveryCatalog({accessToken, fetchImpl = globalThis.fetch}) {
  const rows = await readFixedAppCatalogRows(tripRecoveryCatalogQuery,{accessToken,fetchImpl});
  assert.deepEqual(rows,[{functions_ok:true,tables_ok:true,triggers_ok:true}]);
}

// Prepared, finite app append on installed601. These are not model migrations,
// historical-prefix aliases, an activation grant, or an arbitrary SQL catalogue.
export const ACCOUNT_INACTIVITY_OFF_APP_MIGRATIONS = Object.freeze([
 Object.freeze({version:'20261117180000',id:'20261117180000_account_inactivity_notice_off',filename:'20261117180000_account_inactivity_notice_off.sql'}),
 Object.freeze({version:'20261117180100',id:'20261117180100_account_native_activity_capture_off',filename:'20261117180100_account_native_activity_capture_off.sql'}),
]);
const inactivitySignatures=Object.freeze({
 record_account_lifecycle_activity:'',account_inactivity_notice_json:'uuid,uuid,boolean',account_inactivity_notice_hold:'uuid',
 prepare_account_inactivity_notice:'uuid,uuid',get_account_inactivity_notice_status:'uuid',
 get_account_inactivity_notice_service_status:'uuid,uuid',list_account_inactivity_notices:'uuid',
 claim_account_inactivity_notice:'uuid,uuid,bigint,uuid,text,text',hold_account_inactivity_notice:'uuid,uuid,bigint,text',
 acknowledge_account_inactivity_notice:'uuid,uuid,bigint,uuid,text,uuid',account_native_activity_capture:'uuid',account_native_activity_token_hook:'jsonb',
});
const inactivityExposed=new Set(['record_account_lifecycle_activity','prepare_account_inactivity_notice','get_account_inactivity_notice_status','list_account_inactivity_notices']);
const inactivityServer=new Set(['get_account_inactivity_notice_service_status','claim_account_inactivity_notice','hold_account_inactivity_notice','acknowledge_account_inactivity_notice']);
const inactivityTimed=new Set(['record_account_lifecycle_activity','prepare_account_inactivity_notice','claim_account_inactivity_notice','hold_account_inactivity_notice','acknowledge_account_inactivity_notice','account_native_activity_capture','account_native_activity_token_hook']);
const inactivityColumns=Object.freeze({
 account_inactivity_policy:[['singleton','bool',true,true,0],['notices_enabled','bool',true,true,0],['coverage_status','text',true,true,0],['coverage_epoch','uuid',true,true,0],['coverage_started_at','timestamptz',false,false,0],['delivery_qualified','bool',true,true,0]],
 account_lifecycle_activity:[['user_id','uuid',true,false,0],['revision','int8',true,false,0],['first_observed_at','timestamptz',true,false,0],['last_activity_at','timestamptz',true,false,0],['coverage_epoch','uuid',false,false,0]],
 account_inactivity_notices:[['notice_id','uuid',true,false,0],['target_user_id','uuid',true,false,0],['requested_by','uuid',true,false,0],['state','text',true,false,0],['hold_reason','text',false,false,0],['revision','int8',true,true,0],['activity_revision','int8',false,false,0],['activity_at','timestamptz',false,false,0],['coverage_epoch','uuid',false,false,0],['created_at','timestamptz',true,true,0],['attempt_id','uuid',false,false,0],['attempt_ids','_uuid',true,true,1],['recipient_digest','text',false,false,0],['auth_user_created_at','text',false,false,0],['claimed_at','timestamptz',false,false,0],['provider_id','uuid',false,false,0],['accepted_at','timestamptz',false,false,0],['delivered_at','timestamptz',false,false,0],['delete_not_before','timestamptz',false,false,0]],
});
const inactivityCheckCounts=Object.freeze({account_inactivity_policy:4,account_lifecycle_activity:2,account_inactivity_notices:11});
const inactivityNeed=condition=>assert(condition,'ACCOUNT_INACTIVITY_CATALOG_MISMATCH');
export function readAccountInactivitySource(root=ROOT){
 const migrations=ACCOUNT_INACTIVITY_OFF_APP_MIGRATIONS.map(row=>{
  const file=path.join(root,'supabase/migrations',row.filename),stat=fs.lstatSync(file);
  inactivityNeed(stat.isFile()&&!stat.isSymbolicLink()&&stat.size>0&&stat.size<=65536);
  const bytes=fs.readFileSync(file);inactivityNeed(bytes.length===stat.size);
  const sql=new TextDecoder('utf-8',{fatal:true}).decode(bytes).replaceAll('\r\n','\n');
  return {...row,sql,sha256:hash(sql)};
 });
 const sql=migrations.map(row=>row.sql).join('\n');
 const bodies=Object.fromEntries([...sql.matchAll(/create (?:or replace )?function public\.(\w+)\([^;]*?\bas \$(\w+)\$\n([\s\S]*?)\n\$\2\$;/g)]
  .map(match=>[match[1],hash(match[3].trim())]));
 const declarations=[...sql.matchAll(/create (?:or replace )?function public\.(\w+)\(([\s\S]*?)\)\nreturns/g)];
 const argumentNames=Object.fromEntries(declarations.map(([,name,args])=>[name,args.trim()?args.split(',').map(arg=>arg.trim().split(/\s+/)[0]):null]));
 const argumentDefaults=Object.fromEntries(declarations.map(([,name,args])=>[name,(args.match(/\bdefault\b/gi)||[]).length]));
 assert.deepEqual(Object.keys(bodies).sort(),Object.keys(inactivitySignatures).sort(),'ACCOUNT_INACTIVITY_SOURCE_FUNCTIONS');
 assert.deepEqual(Object.keys(argumentNames).sort(),Object.keys(inactivitySignatures).sort());
 return {migrations,bodies,argumentNames,argumentDefaults};
}
const inactivityWanted=Object.entries(inactivitySignatures).map(([name,args])=>"('"+name+"','public."+name+'('+args+")','"+(inactivityExposed.has(name)?'authenticated':inactivityServer.has(name)?'service_role':name==='account_native_activity_token_hook'?'supabase_auth_admin':'none')+"')").join(',');
export const accountInactivityCatalogQuery=String.raw`with wanted(name,signature,exposure) as (values `+inactivityWanted+String.raw`),
functions as (select w.name,jsonb_build_object(
 'present',p.oid is not null,'sameNameCount',(select count(*) from pg_catalog.pg_proc where pronamespace='public'::regnamespace and proname=w.name),
 'definer',p.prosecdef,'owner',pg_catalog.pg_get_userbyid(p.proowner),'ownerBypassesRls',(select rolsuper or rolbypassrls from pg_catalog.pg_roles where oid=p.proowner),
 'kind',p.prokind,'language',l.lanname,'volatility',p.provolatile,'returnsSet',p.proretset,'argumentNames',p.proargnames,'argumentDefaults',p.pronargdefaults,
 'result',pg_catalog.pg_get_function_result(p.oid),'configuration',p.proconfig,
 'bodySha256',pg_catalog.encode(extensions.digest(pg_catalog.convert_to(pg_catalog.btrim(p.prosrc,E' \n\r\t'),'UTF8'),'sha256'),'hex'),
 'publicExecute',exists(select 1 from pg_catalog.aclexplode(coalesce(p.proacl,pg_catalog.acldefault('f',p.proowner))) a where a.grantee=0 and a.privilege_type='EXECUTE'),
 'anonExecute',pg_catalog.has_function_privilege('anon',p.oid,'EXECUTE'),'authenticatedExecute',pg_catalog.has_function_privilege('authenticated',p.oid,'EXECUTE'),
 'serviceExecute',pg_catalog.has_function_privilege('service_role',p.oid,'EXECUTE'),'authAdminExecute',pg_catalog.has_function_privilege('supabase_auth_admin',p.oid,'EXECUTE'),
 'unexpectedAcl',exists(select 1 from pg_catalog.aclexplode(coalesce(p.proacl,pg_catalog.acldefault('f',p.proowner))) a
  where a.grantee<>p.proowner and (w.exposure='none' or a.grantee<>coalesce((select oid from pg_catalog.pg_roles where rolname=w.exposure),0) or a.is_grantable))) metadata
 from wanted w left join pg_catalog.pg_proc p on p.oid=pg_catalog.to_regprocedure(w.signature) left join pg_catalog.pg_language l on l.oid=p.prolang),
targets(name) as (values ('account_inactivity_policy'),('account_lifecycle_activity'),('account_inactivity_notices')),
tables as (select w.name,jsonb_build_object('present',c.oid is not null,'regular',c.relkind='r','rls',c.relrowsecurity,'forceRls',c.relforcerowsecurity,
 'owner',pg_catalog.pg_get_userbyid(c.relowner),'ownerBypassesRls',(select rolsuper or rolbypassrls from pg_catalog.pg_roles where oid=c.relowner),
 'columns',(select jsonb_agg(jsonb_build_array(a.attname,t.typname,a.attnotnull,a.atthasdef,a.attndims) order by a.attnum) from pg_catalog.pg_attribute a join pg_catalog.pg_type t on t.oid=a.atttypid
  where a.attrelid=c.oid and a.attnum>0 and not a.attisdropped and a.attgenerated='' and a.attidentity='' and t.typnamespace='pg_catalog'::regnamespace),
 'foreignKeys',(select jsonb_agg(pg_catalog.pg_get_constraintdef(oid,false) order by conname) from pg_catalog.pg_constraint where conrelid=c.oid and contype='f'),
 'checks',(select count(*) from pg_catalog.pg_constraint where conrelid=c.oid and contype='c' and convalidated and not condeferrable),
 'constraintCount',(select count(*) from pg_catalog.pg_constraint where conrelid=c.oid),
 'primaryKey',(select count(*) from pg_catalog.pg_constraint where conrelid=c.oid and contype='p' and conkey=array[1]::smallint[] and convalidated and not condeferrable),
 'policies',(select count(*) from pg_catalog.pg_policy where polrelid=c.oid),'userTriggers',(select count(*) from pg_catalog.pg_trigger where tgrelid=c.oid and not tgisinternal),
 'unexpectedAcl',exists(select 1 from pg_catalog.aclexplode(coalesce(c.relacl,pg_catalog.acldefault('r',c.relowner))) a where a.grantee<>c.relowner),
 'unexpectedColumnAcl',exists(select 1 from pg_catalog.pg_attribute col cross join lateral pg_catalog.aclexplode(col.attacl) a where col.attrelid=c.oid and col.attnum>0 and not col.attisdropped and a.grantee<>c.relowner),
 'directAccess',pg_catalog.has_table_privilege('anon',c.oid,'SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER') or pg_catalog.has_any_column_privilege('anon',c.oid,'SELECT,INSERT,UPDATE,REFERENCES')
  or pg_catalog.has_table_privilege('authenticated',c.oid,'SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER') or pg_catalog.has_any_column_privilege('authenticated',c.oid,'SELECT,INSERT,UPDATE,REFERENCES')
  or pg_catalog.has_table_privilege('service_role',c.oid,'SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER') or pg_catalog.has_any_column_privilege('service_role',c.oid,'SELECT,INSERT,UPDATE,REFERENCES')
  or pg_catalog.has_table_privilege('supabase_auth_admin',c.oid,'SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER') or pg_catalog.has_any_column_privilege('supabase_auth_admin',c.oid,'SELECT,INSERT,UPDATE,REFERENCES')) metadata
 from targets w left join pg_catalog.pg_class c on c.oid=pg_catalog.to_regclass('public.'||w.name)),
checks as (select c.relname||'.'||k.conname name,pg_catalog.pg_get_constraintdef(k.oid,false) definition from targets w join pg_catalog.pg_class c on c.oid=pg_catalog.to_regclass('public.'||w.name)
 join pg_catalog.pg_constraint k on k.conrelid=c.oid and k.contype='c' and k.convalidated and not k.condeferrable)
select jsonb_build_object('tables',(select jsonb_object_agg(name,metadata) from tables),
 'functions',(select jsonb_object_agg(name,metadata) from functions),
 'checks',jsonb_build_object('format','PG_CONSTRAINTDEF_V1','postgresMajor',current_setting('server_version_num')::int/10000,
  'definitions',(select jsonb_agg(jsonb_build_array(name,definition) order by name) from checks)),
 'activeIndex',(select jsonb_build_object('unique',indisunique,'valid',indisvalid,'ready',indisready,'keys',indkey::text,'predicate',pg_catalog.pg_get_expr(indpred,indrelid))
  from pg_catalog.pg_index where indexrelid=pg_catalog.to_regclass('public.account_inactivity_notice_active_target')),
 'policy',(select jsonb_build_object('rows',count(*),'noticesEnabled',bool_or(notices_enabled),'coverageStatus',min(coverage_status),
  'coverageStartedNull',bool_and(coverage_started_at is null),'deliveryQualified',bool_or(delivery_qualified)) from public.account_inactivity_policy)) as metadata;`;
export function verifyAccountInactivityCheckReference(value,{postgresMajor}={}){
 inactivityNeed(keys(value,['format','postgresMajor','definitions','definitionsSha256'])&&value.format==='PG_CONSTRAINTDEF_V1'
  &&Number.isSafeInteger(value.postgresMajor)&&value.postgresMajor>=16);
 if(postgresMajor!==undefined)inactivityNeed(value.postgresMajor===postgresMajor);
 inactivityNeed(Array.isArray(value.definitions)&&value.definitions.length===17&&JSON.stringify(value.definitions).length<=24576);
 const names=[];for(const row of value.definitions){inactivityNeed(Array.isArray(row)&&row.length===2&&typeof row[0]==='string'
  &&Object.keys(inactivityColumns).some(table=>row[0].startsWith(table+'.'+table+'_'))&&/^[a-z0-9_.]+$/.test(row[0])
  &&typeof row[1]==='string'&&row[1].startsWith('CHECK (')&&row[1].length<=4096);names.push(row[0]);}
 inactivityNeed(new Set(names).size===17&&JSON.stringify(names)===JSON.stringify([...names].sort())&&value.definitionsSha256===hash(JSON.stringify(value.definitions)));
 for(const [table,count]of Object.entries(inactivityCheckCounts))inactivityNeed(names.filter(name=>name.startsWith(table+'.')).length===count);
 return Object.freeze(structuredClone(value));
}
export function verifyAccountInactivityCatalogMetadata(input,{source=readAccountInactivitySource(),expectedCheckReference}={}){
 const rows=typeof input==='string'?JSON.parse(input):input;
 inactivityNeed(Array.isArray(rows)&&rows.length===1&&keys(rows[0],['metadata']));const value=rows[0].metadata;
 inactivityNeed(keys(value,['tables','functions','checks','activeIndex','policy'])&&keys(value.tables,Object.keys(inactivityColumns)));
 let owner;for(const [name,table]of Object.entries(value.tables)){
  inactivityNeed(keys(table,['present','regular','rls','forceRls','owner','ownerBypassesRls','columns','foreignKeys','checks','constraintCount','primaryKey','policies','userTriggers','unexpectedAcl','unexpectedColumnAcl','directAccess']));
  owner??=table.owner;const foreign=name==='account_lifecycle_activity';
  inactivityNeed(table.present===true&&table.regular===true&&table.rls===true&&table.forceRls===true&&['postgres','rr_native_test'].includes(table.owner)&&table.owner===owner&&table.ownerBypassesRls===true
   &&JSON.stringify(table.columns)===JSON.stringify(inactivityColumns[name])&&table.checks===inactivityCheckCounts[name]
   &&table.constraintCount===inactivityCheckCounts[name]+1+Number(foreign)&&table.primaryKey===1&&table.policies===0&&table.userTriggers===0
   &&table.unexpectedAcl===false&&table.unexpectedColumnAcl===false&&table.directAccess===false
   &&JSON.stringify(table.foreignKeys)===JSON.stringify(foreign?['FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE']:null));
 }
 inactivityNeed(keys(value.functions,Object.keys(inactivitySignatures)));
 for(const [name,row]of Object.entries(value.functions)){
  inactivityNeed(keys(row,['present','sameNameCount','definer','owner','ownerBypassesRls','kind','language','volatility','returnsSet','argumentNames','argumentDefaults','result','configuration','bodySha256','publicExecute','anonExecute','authenticatedExecute','serviceExecute','authAdminExecute','unexpectedAcl']));
  const timeout=['record_account_lifecycle_activity','account_native_activity_capture','account_native_activity_token_hook'].includes(name)?'250ms':'5s';
  inactivityNeed(row.present===true&&row.sameNameCount===1&&row.definer===true&&row.owner===owner&&row.ownerBypassesRls===true&&row.kind==='f'&&row.language==='plpgsql'&&row.volatility==='v'&&row.returnsSet===false
   &&JSON.stringify(row.argumentNames)===JSON.stringify(source.argumentNames[name])&&row.argumentDefaults===source.argumentDefaults[name]
   &&JSON.stringify(row.configuration)===JSON.stringify(['search_path=""',...(inactivityTimed.has(name)?['lock_timeout='+timeout]:[])])&&row.bodySha256===source.bodies[name]
   &&row.result===(name==='account_inactivity_notice_hold'?'text':'jsonb')&&row.publicExecute===false&&row.anonExecute===false&&row.authenticatedExecute===inactivityExposed.has(name)
   &&row.serviceExecute===inactivityServer.has(name)&&row.authAdminExecute===(name==='account_native_activity_token_hook')&&row.unexpectedAcl===false);
 }
 const index=value.activeIndex;inactivityNeed(keys(index,['unique','valid','ready','keys','predicate'])&&index.unique===true&&index.valid===true&&index.ready===true&&index.keys==='2'&&index.predicate==="(state <> 'CANCELLED'::text)");
 inactivityNeed(keys(value.policy,['rows','noticesEnabled','coverageStatus','coverageStartedNull','deliveryQualified'])&&value.policy.rows===1&&value.policy.noticesEnabled===false&&value.policy.coverageStatus==='UNKNOWN'&&value.policy.coverageStartedNull===true&&value.policy.deliveryQualified===false);
 inactivityNeed(keys(value.checks,['format','postgresMajor','definitions']));
 const checkReference=verifyAccountInactivityCheckReference({...value.checks,definitionsSha256:hash(JSON.stringify(value.checks.definitions))});
 if(expectedCheckReference!==undefined){const expected=verifyAccountInactivityCheckReference(expectedCheckReference);assert.deepEqual(checkReference.definitions,expected.definitions,'ACCOUNT_INACTIVITY_CHECK_SEMANTICS_MISMATCH');}
 return {schemaVersion:1,kind:'ACCOUNT_INACTIVITY_OFF_CATALOG',migrations:source.migrations.map(({sql,...row})=>row),catalogVerified:true,
  checkReference,checkExpressionSemanticsVerified:expectedCheckReference!==undefined,coverageStatus:'UNKNOWN',noticesEnabled:false,deliveryQualified:false,
  automaticDeletionEnabled:false,authHookConfigurationInspected:false,productionActivityContinuityProved:false};
}
export async function verifyInstalledAccountInactivitySchema(options){
 inactivityNeed(keys(options,['accessToken','expectedCheckReference'])||keys(options,['accessToken','expectedCheckReference','fetchImpl']));
 const {accessToken,expectedCheckReference,fetchImpl=globalThis.fetch}=options;verifyAccountInactivityCheckReference(expectedCheckReference);
 inactivityNeed(typeof accessToken==='string'&&accessToken.length>0&&!/[\r\n]/.test(accessToken)&&typeof fetchImpl==='function');
 const controller=new AbortController();let rejectDeadline;const deadline=new Promise((_,reject)=>{rejectDeadline=reject;});
 const timer=setTimeout(()=>{rejectDeadline(new Error('ACCOUNT_INACTIVITY_CATALOG_DEADLINE'));controller.abort();},15000);
 const bounded=promise=>Promise.race([promise,deadline]);
 try{const response=await bounded(fetchImpl('https://api.supabase.com/v1/projects/afqhhdrkjfjtpadntdzo/database/query',{
  method:'POST',redirect:'error',cache:'no-store',credentials:'omit',signal:controller.signal,headers:{authorization:'Bearer '+accessToken,'content-type':'application/json'},
  body:JSON.stringify({query:accountInactivityCatalogQuery,read_only:true})}));
  inactivityNeed(response.status===201&&!response.redirected&&response.body);const length=response.headers.get('content-length');
  inactivityNeed(length===null||(/^\d+$/.test(length)&&Number(length)<=65536));const reader=response.body.getReader(),chunks=[];let count=0;
  try{while(true){const item=await bounded(reader.read());if(item.done)break;inactivityNeed(item.value instanceof Uint8Array);count+=item.value.byteLength;inactivityNeed(count<=65536);chunks.push(item.value);}}finally{reader.releaseLock();}
  const parsed=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(Buffer.concat(chunks,count)));
  const rows=Array.isArray(parsed)?parsed:keys(parsed,['result'])?parsed.result:keys(parsed,['data'])?parsed.data:null;
  return verifyAccountInactivityCatalogMetadata(rows,{expectedCheckReference});
 }finally{clearTimeout(timer);controller.abort();}
}

if(process.argv[1]&&fileURLToPath(import.meta.url)===path.resolve(process.argv[1])) {
 try {
  if(process.argv.length===3&&process.argv[2]==='--print-query')console.log(accountErasureCatalogQuery);
  else if(process.argv.length===4&&process.argv[2]==='--metadata') {
   const file=fs.lstatSync(process.argv[3]);assert(file.isFile()&&!file.isSymbolicLink()&&file.size<=65536);
   console.log(JSON.stringify(verifyAccountErasureCatalogMetadata(fs.readFileSync(process.argv[3],'utf8'))));
  } else throw new Error('ACCOUNT_ERASURE_METADATA_ARGUMENTS');
 } catch {console.error('ACCOUNT_ERASURE_METADATA_REFUSED');process.exitCode=1;}
}
