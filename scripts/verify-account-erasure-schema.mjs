#!/usr/bin/env node
// App metadata only. No API call, account row, migration write or erasure authority.
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
export const ACCOUNT_ERASURE_MIGRATION = 'supabase/migrations/20261116181500_account_erasure_outbox_off.sql';
const ROOT = fileURLToPath(new URL('../',import.meta.url));
const hash = text => crypto.createHash('sha256').update(text).digest('hex');
const columns = [
 ['operation_id','uuid',true,false],['target_user_id','uuid',true,false],['requested_by','uuid',true,false],
 ['mode','text',true,true],['state','text',true,false],['hold_reason','text',false,false],
 ['activity_first','timestamptz',false,false],['activity_last','timestamptz',false,false],
 ['profile_was_active','bool',true,false],['prepared_at','timestamptz',true,false],['updated_at','timestamptz',true,false],
 ['pg_staged_at','timestamptz',false,false],['pg_rows_removed','int8',true,true],
];
const signatures = Object.freeze({
 account_erasure_require_owner:'',account_erasure_policy_hold:'uuid',get_account_erasure_status:'uuid',
 find_account_erasure_operation:'uuid',prepare_account_erasure:'uuid,uuid',stage_account_erasure_pg:'uuid,text',
 account_erasure_observation_guard:'',account_erasure_profile_guard:'',
});
const exposed = new Set(['get_account_erasure_status','find_account_erasure_operation','prepare_account_erasure','stage_account_erasure_pg']);
const keys = (value,names) => value && typeof value==='object' && !Array.isArray(value)
 && Object.keys(value).sort().join(',') === [...names].sort().join(',');
const need = condition => assert(condition,'ACCOUNT_ERASURE_CATALOG_MISMATCH');
export function readAccountErasureSource(root=ROOT) {
 const sql=fs.readFileSync(path.join(root,ACCOUNT_ERASURE_MIGRATION),'utf8').replaceAll('\r\n','\n');
 const bodies=Object.fromEntries([...sql.matchAll(/create function public\.(\w+)\([^;]*?\bas \$(\w+)\$\n([\s\S]*?)\n\$\2\$;/g)]
  .map(match=>[match[1],hash(match[3].trim())]));
 assert.deepEqual(Object.keys(bodies).sort(),Object.keys(signatures).sort(),'ACCOUNT_ERASURE_SOURCE_FUNCTIONS');
 return {sql,sha256:hash(sql),bodies};
}
const wanted=Object.entries(signatures).map(([name,args])=>"('"+name+"','public."+name+'('+args+")')").join(',');
export const accountErasureCatalogQuery = String.raw`with wanted(name,signature) as (values `+wanted+String.raw`),
functions as (select w.name,jsonb_build_object(
 'present',p.oid is not null,'sameNameCount',(select count(*) from pg_catalog.pg_proc where pronamespace='public'::regnamespace and proname=w.name),
 'definer',p.prosecdef,'kind',p.prokind,'language',l.lanname,'returnsSet',p.proretset,
 'result',pg_catalog.pg_get_function_result(p.oid),'configuration',p.proconfig,
 'bodySha256',pg_catalog.encode(extensions.digest(pg_catalog.convert_to(pg_catalog.btrim(p.prosrc,E' \n\r\t'),'UTF8'),'sha256'),'hex'),
 'publicExecute',exists(select 1 from pg_catalog.aclexplode(coalesce(p.proacl,pg_catalog.acldefault('f',p.proowner))) a where a.grantee=0 and a.privilege_type='EXECUTE'),
 'anonExecute',pg_catalog.has_function_privilege('anon',p.oid,'EXECUTE'),
 'authenticatedExecute',pg_catalog.has_function_privilege('authenticated',p.oid,'EXECUTE'),
 'serviceExecute',pg_catalog.has_function_privilege('service_role',p.oid,'EXECUTE'),
 'unexpectedAcl',exists(select 1 from pg_catalog.aclexplode(coalesce(p.proacl,pg_catalog.acldefault('f',p.proowner))) a
   where a.grantee<>p.proowner and (a.grantee<>coalesce((select oid from pg_catalog.pg_roles where rolname='authenticated'),0) or a.is_grantable))) metadata
 from wanted w left join pg_catalog.pg_proc p on p.oid=pg_catalog.to_regprocedure(w.signature)
 left join pg_catalog.pg_language l on l.oid=p.prolang),
target as (select * from pg_catalog.pg_class where oid=pg_catalog.to_regclass('public.account_erasure_operations'))
select jsonb_build_object('table',(
 select jsonb_build_object('regular',c.relkind='r','rls',c.relrowsecurity,'forceRls',c.relforcerowsecurity,
 'columns',(select jsonb_agg(jsonb_build_array(a.attname,t.typname,a.attnotnull,a.atthasdef) order by a.attnum)
   from pg_catalog.pg_attribute a join pg_catalog.pg_type t on t.oid=a.atttypid
   where a.attrelid=c.oid and a.attnum>0 and not a.attisdropped and a.attgenerated='' and a.attidentity='' and a.attndims=0 and t.typnamespace='pg_catalog'::regnamespace),
 'foreignKeys',(select count(*) from pg_catalog.pg_constraint where conrelid=c.oid and contype='f'),
 'checks',(select count(*) from pg_catalog.pg_constraint where conrelid=c.oid and contype='c' and convalidated and not condeferrable),
 'constraintCount',(select count(*) from pg_catalog.pg_constraint where conrelid=c.oid),
 'primaryKey',(select count(*) from pg_catalog.pg_constraint where conrelid=c.oid and contype='p' and conkey=array[1]::smallint[] and convalidated and not condeferrable),
 'policies',(select count(*) from pg_catalog.pg_policy where polrelid=c.oid),
 'userTriggers',(select count(*) from pg_catalog.pg_trigger where tgrelid=c.oid and not tgisinternal),
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
 'triggers',(select jsonb_object_agg(w.name,jsonb_build_object('present',t.oid is not null,'sameNameCount',
  (select count(*) from pg_catalog.pg_trigger where tgname=w.name),'relation',t.tgrelid::regclass::text,
  'events',t.tgtype,'enabled',t.tgenabled,'internal',t.tgisinternal,'arguments',t.tgnargs,
  'predicate',t.tgqual is not null,'function',t.tgfoid::regprocedure::text))
 from (values ('account_erasure_observation_write_guard','public.observations'),
 ('account_erasure_profile_write_guard','public.profiles')) w(name,relation)
 left join pg_catalog.pg_trigger t on t.tgname=w.name and t.tgrelid=pg_catalog.to_regclass(w.relation))) as metadata;`;
export function verifyAccountErasureCatalogMetadata(input,{source=readAccountErasureSource()}={}) {
 const rows=typeof input==='string'?JSON.parse(input):input;
 need(Array.isArray(rows)&&rows.length===1&&keys(rows[0],['metadata']));const value=rows[0].metadata;
 need(keys(value,['table','functions','triggers']));const table=value.table;
 need(keys(table,['regular','rls','forceRls','columns','foreignKeys','checks','constraintCount','primaryKey','policies','userTriggers','directAccess','activeTargetIndex']));
 need(table.regular===true&&table.rls===true&&table.forceRls===true&&table.foreignKeys===0
  &&table.checks===13&&table.constraintCount===14&&table.primaryKey===1&&table.policies===0&&table.userTriggers===0&&table.directAccess===false);
 need(JSON.stringify(table.columns)===JSON.stringify(columns));const index=table.activeTargetIndex;
 need(keys(index,['unique','valid','ready','keys','predicate'])&&index.unique===true&&index.valid===true&&index.ready===true&&index.keys==='2');
 need(index.predicate==="(state = ANY (ARRAY['PREPARED'::text, 'PG_STAGED_AUTH_PENDING'::text]))");
 need(keys(value.functions,Object.keys(signatures)));
 for(const [name,row] of Object.entries(value.functions)) {
  need(keys(row,['present','sameNameCount','definer','kind','language','returnsSet','result','configuration','bodySha256','publicExecute','anonExecute','authenticatedExecute','serviceExecute','unexpectedAcl']));
  const expectedConfig=['search_path=""',...(['account_erasure_require_owner','prepare_account_erasure','stage_account_erasure_pg'].includes(name)?['lock_timeout=5s']:[])];
  need(row.present===true&&row.sameNameCount===1&&row.definer===true&&row.kind==='f'&&row.language==='plpgsql'
   &&row.returnsSet===false&&JSON.stringify(row.configuration)===JSON.stringify(expectedConfig)&&row.bodySha256===source.bodies[name]
   &&row.publicExecute===false&&row.anonExecute===false&&row.serviceExecute===false&&row.unexpectedAcl===false
   &&row.authenticatedExecute===exposed.has(name));
  need(row.result===(name==='account_erasure_require_owner'?'uuid':name==='account_erasure_policy_hold'?'text':name.endsWith('_guard')?'trigger':'jsonb'));
 }
 need(keys(value.triggers,['account_erasure_observation_write_guard','account_erasure_profile_write_guard']));
 for(const [name,row] of Object.entries(value.triggers)) {
  const observation=name.includes('observation');need(keys(row,['present','sameNameCount','relation','events','enabled','internal','arguments','predicate','function']));
  need(row.present===true&&row.sameNameCount===1&&row.relation===(observation?'observations':'profiles')&&row.events===23
   &&row.enabled==='O'&&row.internal===false&&row.arguments===0&&row.predicate===false
   &&row.function===(observation?'account_erasure_observation_guard()':'account_erasure_profile_guard()'));
 }
 return {schemaVersion:1,kind:'MANUAL_ACCOUNT_ERASURE_PG_STAGE_CATALOG',migration:ACCOUNT_ERASURE_MIGRATION,
  sourceSha256:source.sha256,catalogVerified:true,scope:'FUNCTION_BODIES_ACL_TABLE_SHAPE_FENCES',
  checkExpressionSemanticsVerified:false,authAdminIntegrated:false,authDeletionProved:false,d1Acknowledged:false,
  automaticEligibility:false,completionAuthority:false};
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
