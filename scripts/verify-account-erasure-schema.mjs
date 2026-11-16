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
const need = condition => assert(condition,'ACCOUNT_ERASURE_CATALOG_MISMATCH');
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
 'checks',public.account_erasure_check_metadata(),
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
 need(keys(metadata,['format','postgresMajor','definitions']));
 return verifyAccountErasureCheckReference({...metadata,definitionsSha256:hash(JSON.stringify(metadata.definitions))});
}
export function verifyAccountErasureCatalogMetadata(input,{source=readAccountErasureSource(),expectedCheckReference}={}) {
 const rows=typeof input==='string'?JSON.parse(input):input;
 need(Array.isArray(rows)&&rows.length===1&&keys(rows[0],['metadata']));const value=rows[0].metadata;
 need(keys(value,['table','functions','triggers','checks']));const table=value.table;
 need(keys(table,['regular','rls','forceRls','owner','ownerBypassesRls','columns','foreignKeys','checks','constraintCount','primaryKey','policies','userTriggers','unexpectedAcl','unexpectedColumnAcl','directAccess','activeTargetIndex']));
 need(table.regular===true&&table.rls===true&&table.forceRls===true&&table.foreignKeys===0
  &&['postgres','rr_native_test'].includes(table.owner)&&table.ownerBypassesRls===true
  &&table.checks===28&&table.constraintCount===29&&table.primaryKey===1&&table.policies===0&&table.userTriggers===0
  &&table.unexpectedAcl===false&&table.unexpectedColumnAcl===false&&table.directAccess===false);
 need(JSON.stringify(table.columns)===JSON.stringify(columns));const index=table.activeTargetIndex;
 need(keys(index,['unique','valid','ready','keys','predicate'])&&index.unique===true&&index.valid===true&&index.ready===true&&index.keys==='2');
 need(index.predicate==="((state = 'PREPARED'::text) OR (pg_staged_at IS NOT NULL))");
 need(keys(value.functions,Object.keys(signatures)));
 for(const [name,row] of Object.entries(value.functions)) {
  need(keys(row,['present','sameNameCount','definer','owner','ownerBypassesRls','kind','language','volatility','returnsSet','argumentNames','argumentDefaults','result','configuration','bodySha256','publicExecute','anonExecute','authenticatedExecute','serviceExecute','unexpectedAcl']));
  const expectedConfig=['search_path=""',...(timed.has(name)?['lock_timeout=5s']:[]),
   ...(name==='account_erasure_check_metadata'?['standard_conforming_strings=on']:[])];
  need(row.present===true&&row.sameNameCount===1&&row.definer===true&&row.owner===table.owner&&row.ownerBypassesRls===true&&row.kind==='f'&&row.language==='plpgsql'
   &&row.volatility===(name==='account_erasure_check_metadata'?'s':'v')&&row.returnsSet===false
   &&JSON.stringify(row.argumentNames)===JSON.stringify(source.argumentNames[name])&&row.argumentDefaults===source.argumentDefaults[name]
   &&JSON.stringify(row.configuration)===JSON.stringify(expectedConfig)&&row.bodySha256===source.bodies[name]
   &&row.publicExecute===false&&row.anonExecute===false&&row.serviceExecute===server.has(name)&&row.unexpectedAcl===false
   &&row.authenticatedExecute===exposed.has(name));
  need(row.result===(['account_erasure_require_owner','account_erasure_require_service_owner'].includes(name)?'uuid':
   ['account_erasure_policy_hold','account_erasure_storage_hold'].includes(name)?'text':name.endsWith('_guard')?'trigger':'jsonb'));
 }
 need(keys(value.triggers,['account_erasure_observation_write_guard','account_erasure_profile_write_guard','account_erasure_auth_uuid_insert_guard']));
 for(const [name,row] of Object.entries(value.triggers)) {
  const [relation,events,fn]=name.includes('observation')?['observations',23,'account_erasure_observation_guard()']:
   name.includes('profile')?['profiles',23,'account_erasure_profile_guard()']:['auth.users',7,'account_erasure_auth_uuid_guard()'];
  need(keys(row,['present','sameNameCount','relation','events','enabled','internal','arguments','predicate','function']));
  need(row.present===true&&row.sameNameCount===1&&row.relation===relation&&row.events===events
   &&row.enabled==='O'&&row.internal===false&&row.arguments===0&&row.predicate===false
   &&row.function===fn);
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
 need(typeof accessToken==='string'&&accessToken.length>0&&!/[\r\n]/.test(accessToken)&&typeof fetchImpl==='function');
 const controller=new AbortController();let rejectDeadline;
 const deadline=new Promise((_,reject)=>{rejectDeadline=reject;});
 const timer=setTimeout(()=>{rejectDeadline(new Error('ACCOUNT_ERASURE_CATALOG_DEADLINE'));controller.abort();},15000);
 const bounded=promise=>Promise.race([promise,deadline]);
 try {
  const response=await bounded(fetchImpl('https://api.supabase.com/v1/projects/afqhhdrkjfjtpadntdzo/database/query',{
   method:'POST',redirect:'error',cache:'no-store',credentials:'omit',signal:controller.signal,
   headers:{authorization:'Bearer '+accessToken,'content-type':'application/json'},
   body:JSON.stringify({query:accountErasureCatalogQuery,read_only:true})}));
  need(response.status===201&&!response.redirected&&response.body);
  const length=response.headers.get('content-length');need(length===null||(/^\d+$/.test(length)&&Number(length)<=32768));
  const reader=response.body.getReader(),chunks=[];let count=0;
  try{while(true){const item=await bounded(reader.read());if(item.done)break;need(item.value instanceof Uint8Array);
   count+=item.value.byteLength;need(count<=32768);chunks.push(item.value);}}finally{reader.releaseLock();}
  const parsed=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(Buffer.concat(chunks,count)));
  const rows=Array.isArray(parsed)?parsed:keys(parsed,['result'])?parsed.result:keys(parsed,['data'])?parsed.data:null;
  return verifyAccountErasureCatalogMetadata(rows,{expectedCheckReference});
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
