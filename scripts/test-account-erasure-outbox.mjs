import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import {readAccountErasureSource,verifyAccountErasureCatalogMetadata,accountErasureCatalogQuery}
 from './verify-account-erasure-schema.mjs';
const source=readAccountErasureSource();
// Artificial metadata only; the native fixture obtains these fields from PostgreSQL.
function metadata() {
 const names=Object.keys(source.bodies),exposed=new Set(['get_account_erasure_status','find_account_erasure_operation','prepare_account_erasure','stage_account_erasure_pg']);
 const functions=Object.fromEntries(names.map(name=>[name,{present:true,sameNameCount:1,definer:true,kind:'f',language:'plpgsql',returnsSet:false,
  result:name==='account_erasure_require_owner'?'uuid':name==='account_erasure_policy_hold'?'text':name.endsWith('_guard')?'trigger':'jsonb',
  configuration:['search_path=""',...(['account_erasure_require_owner','prepare_account_erasure','stage_account_erasure_pg'].includes(name)?['lock_timeout=5s']:[])],
  bodySha256:source.bodies[name],publicExecute:false,anonExecute:false,authenticatedExecute:exposed.has(name),serviceExecute:false,unexpectedAcl:false}]));
 return [{metadata:{table:{regular:true,rls:true,forceRls:true,
  columns:[['operation_id','uuid',true,false],['target_user_id','uuid',true,false],['requested_by','uuid',true,false],['mode','text',true,true],['state','text',true,false],['hold_reason','text',false,false],['activity_first','timestamptz',false,false],['activity_last','timestamptz',false,false],['profile_was_active','bool',true,false],['prepared_at','timestamptz',true,false],['updated_at','timestamptz',true,false],['pg_staged_at','timestamptz',false,false],['pg_rows_removed','int8',true,true]],
  foreignKeys:0,checks:13,constraintCount:14,primaryKey:1,policies:0,userTriggers:0,directAccess:false,
  activeTargetIndex:{unique:true,valid:true,ready:true,keys:'2',predicate:"(state = ANY (ARRAY['PREPARED'::text, 'PG_STAGED_AUTH_PENDING'::text]))"}},functions,
  triggers:Object.fromEntries([['account_erasure_observation_write_guard','observations','account_erasure_observation_guard()'],['account_erasure_profile_write_guard','profiles','account_erasure_profile_guard()']].map(([name,relation,fn])=>[name,{present:true,sameNameCount:1,relation,events:23,enabled:'O',internal:false,arguments:0,predicate:false,function:fn}]))}}];
}
test('erasure metadata: exact artificial contract preserves every pending boundary',()=>{
 const result=verifyAccountErasureCatalogMetadata(metadata());
 assert.equal(result.catalogVerified,true);assert.equal(result.authAdminIntegrated,false);
 assert.equal(result.authDeletionProved,false);assert.equal(result.d1Acknowledged,false);
 assert.equal(result.completionAuthority,false);assert.equal(result.automaticEligibility,false);
 assert.equal(result.checkExpressionSemanticsVerified,false,'Structural metadata is not a SQL execution claim');
 assert(!/from public\.(profiles|observations)|auth\.users\b/.test(accountErasureCatalogQuery),'Metadata query does not select account/trip rows');
});
for(const [label,mutate] of [
 ['missing fence',m=>delete m.triggers.account_erasure_profile_write_guard],
 ['UPDATE not covered',m=>m.triggers.account_erasure_observation_write_guard.events=7],
 ['disabled fence',m=>m.triggers.account_erasure_observation_write_guard.enabled='D'],
 ['guard predicate',m=>m.triggers.account_erasure_observation_write_guard.predicate=true],
 ['wrong guard target',m=>m.triggers.account_erasure_profile_write_guard.relation='auth.users'],
 ['unexpected account data',m=>m.privateAccountRow='SYNTHETIC'],
 ['cascade outbox',m=>m.table.foreignKeys=1],
 ['direct service access',m=>m.table.directAccess=true],
 ['policy grant',m=>m.table.policies=1],
 ['partial index weakened',m=>m.table.activeTargetIndex.predicate="(state = 'PREPARED'::text)"],
 ['body drift',m=>m.functions.stage_account_erasure_pg.bodySha256='0'.repeat(64)],
 ['public RPC',m=>m.functions.stage_account_erasure_pg.publicExecute=true],
 ['service stage',m=>m.functions.stage_account_erasure_pg.serviceExecute=true],
 ['helper exposed',m=>m.functions.account_erasure_policy_hold.authenticatedExecute=true],
 ['overloaded RPC',m=>m.functions.stage_account_erasure_pg.sameNameCount=2],
 ['owner lock bound removed',m=>m.functions.account_erasure_require_owner.configuration=['search_path=""']],
 ['unknown counter',m=>m.table.constraintCount=null],
]) test('erasure metadata refuses '+label,()=>{const fixture=metadata();mutate(fixture[0].metadata);assert.throws(()=>verifyAccountErasureCatalogMetadata(fixture),/ACCOUNT_ERASURE_CATALOG_MISMATCH/);});
test('erasure source: manual pending-only source and strong lock ordering are explicit',()=>{
 assert.equal(Object.keys(source.bodies).length,8);assert.match(source.sql,/mode = 'MANUAL_OWNER'/);
 assert.doesNotMatch(source.sql,/delete\s+from\s+auth\.users|create\s+trigger[^;]*on\s+auth\./i);
 assert.match(source.sql,/where id = actor[^;]*for share/);
 assert.match(source.sql,/order by id for share nowait/);
 assert.match(source.sql,/where id = operation\.target_user_id for update/);
 assert(source.sql.indexOf('set is_active = false')<source.sql.indexOf("set state = 'PG_STAGED_AUTH_PENDING'"));
 assert.match(source.sql,/array\[OLD\.user_id,NEW\.user_id\]/);assert.match(source.sql,/before insert or update on public\.observations/);
 assert.match(source.sql,/on conflict\(operation_id\) do nothing/);assert.match(source.sql,/ACCOUNT_ERASURE_UUID_CONFLICT/);
 assert.match(source.sql,/find_account_erasure_operation/);
 assert.match(source.sql,/profile\.role is null/);assert.match(source.sql,/\('public\.handbook_reviews','resolved_by'\)/);
});
