import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import {readAccountErasureSource,verifyAccountErasureCatalogMetadata,accountErasureCatalogQuery,verifyInstalledAccountErasureSchema,accountErasureCheckReference}
 from './verify-account-erasure-schema.mjs';
const source=readAccountErasureSource();
// Artificial metadata only; the native fixture obtains these fields from PostgreSQL.
function metadata() {
 const names=Object.keys(source.bodies),exposed=new Set(['get_account_erasure_status','list_account_erasure_operations','find_account_erasure_operation','prepare_account_erasure','stage_account_erasure_pg']);
 const server=new Set(['get_account_erasure_service_status','claim_account_erasure_auth','acknowledge_account_erasure_auth_absent','acknowledge_account_erasure_d1']);
 const timed=new Set(['account_erasure_require_owner','account_erasure_require_service_owner','prepare_account_erasure','stage_account_erasure_pg','claim_account_erasure_auth','acknowledge_account_erasure_auth_absent','acknowledge_account_erasure_d1']);
 const functions=Object.fromEntries(names.map(name=>[name,{present:true,sameNameCount:1,definer:true,owner:'rr_native_test',ownerBypassesRls:true,kind:'f',language:'plpgsql',volatility:name==='account_erasure_check_metadata'?'s':'v',returnsSet:false,
  result:['account_erasure_require_owner','account_erasure_require_service_owner'].includes(name)?'uuid':['account_erasure_policy_hold','account_erasure_storage_hold'].includes(name)?'text':name.endsWith('_guard')?'trigger':'jsonb',
  configuration:['search_path=""',...(timed.has(name)?['lock_timeout=5s']:[]),...(name==='account_erasure_check_metadata'?['standard_conforming_strings=on']:[])],
  argumentNames:source.argumentNames[name],argumentDefaults:source.argumentDefaults[name],
  bodySha256:source.bodies[name],publicExecute:false,anonExecute:false,authenticatedExecute:exposed.has(name),serviceExecute:server.has(name),unexpectedAcl:false}]));
 return [{metadata:{table:{regular:true,rls:true,forceRls:true,owner:'rr_native_test',ownerBypassesRls:true,
  columns:[['operation_id','uuid',true,false,0],['target_user_id','uuid',true,false,0],['requested_by','uuid',true,false,0],['mode','text',true,true,0],['state','text',true,false,0],['hold_reason','text',false,false,0],['activity_first','timestamptz',false,false,0],['activity_last','timestamptz',false,false,0],['profile_was_active','bool',true,false,0],['prepared_at','timestamptz',true,false,0],['updated_at','timestamptz',true,false,0],['pg_staged_at','timestamptz',false,false,0],['pg_rows_removed','int8',true,true,0],['auth_attempt_id','uuid',false,false,0],['auth_attempt_ids','_uuid',true,true,1],['auth_user_created_at','text',false,false,0],['auth_claimed_at','timestamptz',false,false,0],['auth_absent_at','timestamptz',false,false,0],['d1_owner_subject','text',false,false,0],['d1_ack_at','timestamptz',false,false,0],['d1_deleted_count','int8',false,false,0]],
  foreignKeys:0,checks:28,constraintCount:29,primaryKey:1,policies:0,userTriggers:0,unexpectedAcl:false,unexpectedColumnAcl:false,directAccess:false,
  activeTargetIndex:{unique:true,valid:true,ready:true,keys:'2',predicate:"((state = 'PREPARED'::text) OR (pg_staged_at IS NOT NULL))"}},functions,
  triggers:Object.fromEntries([['account_erasure_observation_write_guard','observations',23,'account_erasure_observation_guard()'],['account_erasure_profile_write_guard','profiles',23,'account_erasure_profile_guard()'],['account_erasure_auth_uuid_insert_guard','auth.users',7,'account_erasure_auth_uuid_guard()']].map(([name,relation,events,fn])=>[name,{present:true,sameNameCount:1,relation,events,enabled:'O',internal:false,arguments:0,predicate:false,function:fn}])),
  checks:{format:'PG_CONSTRAINTDEF_V1',postgresMajor:17,definitions:Array.from({length:28},(_,i)=>['account_erasure_operations_check'+String(i).padStart(2,'0'),'CHECK (SYNTHETIC)'])}}}];
}
test('erasure metadata: exact artificial contract preserves every pending boundary',()=>{
 const result=verifyAccountErasureCatalogMetadata(metadata());
 assert.equal(result.catalogVerified,true);assert.equal(result.authAdminIntegrated,false);
 assert.equal(result.authDeletionProved,false);assert.equal(result.d1Acknowledged,false);
 assert.equal(result.completionAuthority,false);assert.equal(result.automaticEligibility,false);
 assert.equal(result.checkExpressionSemanticsVerified,false,'Structural metadata is not a SQL execution claim');
 assert(!/\bfrom\s+(?:public\.(profiles|observations)|auth\.users)\b/i.test(accountErasureCatalogQuery),'Metadata query does not select account/trip rows');
});
test('erasure installed readback uses one existing fixed read-only management request',async()=>{
 let calls=0;const receipt=await verifyInstalledAccountErasureSchema({accessToken:'SYNTHETIC',expectedCheckReference:accountErasureCheckReference(metadata()[0].metadata.checks),fetchImpl:async(url,options)=>{
  calls++;assert.equal(url,'https://api.supabase.com/v1/projects/afqhhdrkjfjtpadntdzo/database/query');
  assert.equal(options.method,'POST');assert.equal(options.redirect,'error');assert.equal(options.credentials,'omit');
  assert.deepEqual(JSON.parse(options.body),{query:accountErasureCatalogQuery,read_only:true});
  assert.equal(options.headers.authorization,'Bearer SYNTHETIC');return new Response(JSON.stringify(metadata()),{status:201});
 }});assert.equal(calls,1);assert.equal(receipt.completionAuthority,false);
});
for(const [label,response] of [['wrong status',()=>new Response(JSON.stringify(metadata()),{status:200})],
 ['oversized',()=>new Response(JSON.stringify(metadata()),{status:201,headers:{'content-length':'32769'}})],
 ['unknown result',()=>new Response('{"metadata":{}}',{status:201})]])
 test('erasure installed readback refuses '+label,async()=>{let calls=0;
  await assert.rejects(verifyInstalledAccountErasureSchema({accessToken:'SYNTHETIC',expectedCheckReference:accountErasureCheckReference(metadata()[0].metadata.checks),fetchImpl:async()=>{calls++;return response();}}));
  assert.equal(calls,1,'No transport retry after an unknown metadata result');
 });
test('installed readback requires the qualified native CHECK reference before transport',async()=>{
 let calls=0;await assert.rejects(verifyInstalledAccountErasureSchema({accessToken:'SYNTHETIC',fetchImpl:async()=>{calls++;}}));assert.equal(calls,0);
});
test('same CHECK count cannot hide changed semantics; exact bytes record both PostgreSQL majors',()=>{
 const original=metadata(),expectedCheckReference=accountErasureCheckReference(original[0].metadata.checks);
 for(const change of [m=>m.checks.definitions[0][1]='CHECK (true)']){
  const changed=structuredClone(original);change(changed[0].metadata);
  assert.throws(()=>verifyAccountErasureCatalogMetadata(changed,{expectedCheckReference}),/ACCOUNT_ERASURE_CHECK_SEMANTICS_MISMATCH/);
 }
 const sameBytes=structuredClone(original);sameBytes[0].metadata.checks.postgresMajor=16;
 const receipt=verifyAccountErasureCatalogMetadata(sameBytes,{expectedCheckReference});
 assert.equal(receipt.checkExpressionSemanticsVerified,true);assert.equal(receipt.nativePostgresMajor,17);
 assert.equal(receipt.checkReference.postgresMajor,16);
 assert.equal(receipt.checkReference.definitionsSha256,expectedCheckReference.definitionsSha256);
});
for(const [label,mutate] of [
 ['missing fence',m=>delete m.triggers.account_erasure_profile_write_guard],
 ['missing Auth UUID fence',m=>delete m.triggers.account_erasure_auth_uuid_insert_guard],
 ['Auth hook scope enlarged',m=>m.triggers.account_erasure_auth_uuid_insert_guard.events=23],
 ['UPDATE not covered',m=>m.triggers.account_erasure_observation_write_guard.events=7],
 ['disabled fence',m=>m.triggers.account_erasure_observation_write_guard.enabled='D'],
 ['guard predicate',m=>m.triggers.account_erasure_observation_write_guard.predicate=true],
 ['wrong guard target',m=>m.triggers.account_erasure_profile_write_guard.relation='auth.users'],
 ['unexpected account data',m=>m.privateAccountRow='SYNTHETIC'],
 ['cascade outbox',m=>m.table.foreignKeys=1],
 ['direct service access',m=>m.table.directAccess=true],
 ['hidden column grant',m=>m.table.unexpectedColumnAcl=true],
 ['policy grant',m=>m.table.policies=1],
 ['partial index weakened',m=>m.table.activeTargetIndex.predicate="(state = 'PREPARED'::text)"],
 ['body drift',m=>m.functions.stage_account_erasure_pg.bodySha256='0'.repeat(64)],
 ['unqualified function owner',m=>m.functions.account_erasure_auth_uuid_guard.owner='service_role'],
 ['public RPC',m=>m.functions.stage_account_erasure_pg.publicExecute=true],
 ['service stage',m=>m.functions.stage_account_erasure_pg.serviceExecute=true],
 ['browser Auth ACK',m=>m.functions.acknowledge_account_erasure_auth_absent.authenticatedExecute=true],
 ['service claim missing',m=>m.functions.claim_account_erasure_auth.serviceExecute=false],
 ['service helper exposed',m=>m.functions.account_erasure_require_service_owner.serviceExecute=true],
 ['UUID history dimension',m=>m.table.columns[14][4]=0],
 ['helper exposed',m=>m.functions.account_erasure_policy_hold.authenticatedExecute=true],
 ['overloaded RPC',m=>m.functions.stage_account_erasure_pg.sameNameCount=2],
 ['owner lock bound removed',m=>m.functions.account_erasure_require_owner.configuration=['search_path=""']],
 ['canonical CHECK settings removed',m=>m.functions.account_erasure_check_metadata.configuration=['search_path=""']],
 ['named RPC argument changed',m=>m.functions.list_account_erasure_operations.argumentNames=['target']],
 ['unknown counter',m=>m.table.constraintCount=null],
]) test('erasure metadata refuses '+label,()=>{const fixture=metadata();mutate(fixture[0].metadata);assert.throws(()=>verifyAccountErasureCatalogMetadata(fixture),/ACCOUNT_ERASURE_CATALOG_MISMATCH/);});
test('erasure source: manual lifecycle and strong permanent fence ordering are explicit',()=>{
 assert.equal(Object.keys(source.bodies).length,18);assert.match(source.sql,/mode = 'MANUAL_OWNER'/);
 assert.doesNotMatch(source.sql,/delete\s+from\s+auth\.users/i);
 assert.match(source.sql,/before insert on auth\.users/);assert.doesNotMatch(source.sql,/(?:after|before) (?:update|delete)[^;]*on auth\./i);
 assert.match(source.sql,/where id = actor[^;]*for share/);
 assert.match(source.sql,/order by id for share nowait/);
 assert.match(source.sql,/where id = operation\.target_user_id for update/);
 assert(source.sql.indexOf('set is_active = false')<source.sql.indexOf("set state = 'PG_STAGED_AUTH_PENDING'"));
 assert.match(source.sql,/array\[OLD\.user_id,NEW\.user_id\]/);assert.match(source.sql,/before insert or update on public\.observations/);
 assert.match(source.sql,/on conflict\(operation_id\) do nothing/);assert.match(source.sql,/ACCOUNT_ERASURE_UUID_CONFLICT/);
 assert.match(source.sql,/find_account_erasure_operation/);
 assert.match(source.sql,/profile\.role is null/);assert.match(source.sql,/\('public\.handbook_reviews','resolved_by'\)/);
 assert.match(source.sql,/p_attempt = any\(operation\.auth_attempt_ids\)/);
 assert.match(source.sql,/operation\.auth_attempt_id is distinct from p_previous_attempt/);
 assert.match(source.sql,/auth_user_created_at = p_auth_user_created_at/);
 assert.match(source.sql,/target_user_id = NEW\.id and pg_staged_at is not null/);
});
