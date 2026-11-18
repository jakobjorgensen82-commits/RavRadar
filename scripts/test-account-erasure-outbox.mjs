import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import {accountErasurePrecommitFailureSql} from './lib/account-erasure-outbox-native-fixture.mjs';
import {readAccountErasureSource,verifyAccountErasureCatalogMetadata,accountErasureCatalogQuery,verifyInstalledAccountErasureSchema,accountErasureCheckReference,
 readAccountInactivitySource,verifyAccountInactivityCatalogMetadata,accountInactivityCatalogQuery,verifyInstalledAccountInactivitySchema,verifyAccountInactivityCheckReference,ACCOUNT_INACTIVITY_OFF_APP_MIGRATIONS}
 from './verify-account-erasure-schema.mjs';
const source=readAccountErasureSource();
test('native precommit rollback SQL preserves actual dollar delimiters before the normal runner',()=>{
 const generated=accountErasurePrecommitFailureSql(source.sql);
 const block="do $$begin raise exception 'SYNTHETIC_ERASURE_PRECOMMIT';end;$$;\ncommit;\n";
 assert.equal(generated,source.sql.replace(/commit;\s*$/,()=>block));
 assert.equal(generated.slice(-block.length),block);
 assert.equal(generated.split('SYNTHETIC_ERASURE_PRECOMMIT').length,2);
 assert.throws(()=>accountErasurePrecommitFailureSql('begin; select 1;'),/final COMMIT/);
});
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

// Current79 OFF protocol DATA only. Native SQL/Auth/installation are UNRUN here.
function inactivityMetadata(){
 const src=readAccountInactivitySource(),exposed=new Set(['record_account_lifecycle_activity','prepare_account_inactivity_notice','get_account_inactivity_notice_status','list_account_inactivity_notices']),
  server=new Set(['get_account_inactivity_notice_service_status','claim_account_inactivity_notice','hold_account_inactivity_notice','acknowledge_account_inactivity_notice']);
 const timed=new Set(['record_account_lifecycle_activity','prepare_account_inactivity_notice','claim_account_inactivity_notice','hold_account_inactivity_notice','acknowledge_account_inactivity_notice','account_native_activity_capture','account_native_activity_token_hook']);
 const functions=Object.fromEntries(Object.keys(src.bodies).map(name=>[name,{present:true,sameNameCount:1,definer:true,owner:'rr_native_test',ownerBypassesRls:true,
  kind:'f',language:'plpgsql',volatility:'v',returnsSet:false,argumentNames:src.argumentNames[name],argumentDefaults:src.argumentDefaults[name],
  result:name==='account_inactivity_notice_hold'?'text':'jsonb',configuration:['search_path=""',...(timed.has(name)?['lock_timeout='+(['record_account_lifecycle_activity','account_native_activity_capture','account_native_activity_token_hook'].includes(name)?'250ms':'5s')]:[])],
  bodySha256:src.bodies[name],publicExecute:false,anonExecute:false,authenticatedExecute:exposed.has(name),serviceExecute:server.has(name),authAdminExecute:name==='account_native_activity_token_hook',unexpectedAcl:false}]));
 const columns={
  account_inactivity_policy:[['singleton','bool',true,true,0],['notices_enabled','bool',true,true,0],['coverage_status','text',true,true,0],['coverage_epoch','uuid',true,true,0],['coverage_started_at','timestamptz',false,false,0],['delivery_qualified','bool',true,true,0]],
  account_lifecycle_activity:[['user_id','uuid',true,false,0],['revision','int8',true,false,0],['first_observed_at','timestamptz',true,false,0],['last_activity_at','timestamptz',true,false,0],['coverage_epoch','uuid',false,false,0]],
  account_inactivity_notices:[['notice_id','uuid',true,false,0],['target_user_id','uuid',true,false,0],['requested_by','uuid',true,false,0],['state','text',true,false,0],['hold_reason','text',false,false,0],['revision','int8',true,true,0],['activity_revision','int8',false,false,0],['activity_at','timestamptz',false,false,0],['coverage_epoch','uuid',false,false,0],['created_at','timestamptz',true,true,0],['attempt_id','uuid',false,false,0],['attempt_ids','_uuid',true,true,1],['recipient_digest','text',false,false,0],['auth_user_created_at','text',false,false,0],['claimed_at','timestamptz',false,false,0],['provider_id','uuid',false,false,0],['accepted_at','timestamptz',false,false,0],['delivered_at','timestamptz',false,false,0],['delete_not_before','timestamptz',false,false,0]],
 };
 const counts={account_inactivity_policy:4,account_lifecycle_activity:2,account_inactivity_notices:11};
 const tables=Object.fromEntries(Object.entries(columns).map(([name,fields])=>[name,{present:true,regular:true,rls:true,forceRls:true,owner:'rr_native_test',ownerBypassesRls:true,columns:fields,
  foreignKeys:name==='account_lifecycle_activity'?['FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE']:null,checks:counts[name],constraintCount:counts[name]+1+Number(name==='account_lifecycle_activity'),primaryKey:1,
  policies:0,userTriggers:0,unexpectedAcl:false,unexpectedColumnAcl:false,directAccess:false}]));
 const definitions=Object.entries(counts).flatMap(([name,count])=>Array.from({length:count},(_,i)=>[name+'.'+name+'_check'+String(i).padStart(2,'0'),'CHECK (SYNTHETIC_CURRENT79)'])).sort((a,b)=>a[0].localeCompare(b[0]));
 return [{metadata:{tables,functions,checks:{format:'PG_CONSTRAINTDEF_V1',postgresMajor:17,definitions},activeIndex:{unique:true,valid:true,ready:true,keys:'2',predicate:"(state <> 'CANCELLED'::text)"},
  policy:{rows:1,noticesEnabled:false,coverageStatus:'UNKNOWN',coverageStartedNull:true,deliveryQualified:false}}}];
}
test('current79 inactivity OFF metadata keeps exact source, own CHECK facit and no activation authority',()=>{
 const rows=inactivityMetadata(),result=verifyAccountInactivityCatalogMetadata(rows);
 assert.equal(result.catalogVerified,true);assert.equal(result.checkReference.definitions.length,17);
 assert.equal(result.coverageStatus,'UNKNOWN');assert.equal(result.noticesEnabled,false);assert.equal(result.deliveryQualified,false);assert.equal(result.automaticDeletionEnabled,false);
 assert.equal(result.authHookConfigurationInspected,false);assert.equal(result.productionActivityContinuityProved,false);
 assert.deepEqual(result.migrations.map(r=>r.filename),ACCOUNT_INACTIVITY_OFF_APP_MIGRATIONS.map(r=>r.filename));
 assert(result.migrations.every(r=>r.version>'20261117052301'));
 assert(!/\bfrom\s+(?:public\.(profiles|observations)|auth\.users)\b/i.test(accountInactivityCatalogQuery));
 const withReference=verifyAccountInactivityCatalogMetadata(rows,{expectedCheckReference:result.checkReference});assert.equal(withReference.checkExpressionSemanticsVerified,true);
 const changed=structuredClone(rows);changed[0].metadata.checks.definitions[0][1]='CHECK (true)';
 assert.throws(()=>verifyAccountInactivityCatalogMetadata(changed,{expectedCheckReference:result.checkReference}),/ACCOUNT_INACTIVITY_CHECK_SEMANTICS_MISMATCH/);
});
test('current79 inactivity OFF readback refuses activation ACL body shape and old manual facit',async()=>{
 const rows=inactivityMetadata(),expected=verifyAccountInactivityCatalogMetadata(rows).checkReference;
 for(const change of [m=>m.policy.noticesEnabled=true,m=>m.policy.coverageStatus='CAPTURING',m=>m.policy.deliveryQualified=true,
  m=>m.tables.account_inactivity_notices.directAccess=true,m=>m.tables.account_inactivity_policy.policies=1,
  m=>m.functions.account_native_activity_token_hook.authenticatedExecute=true,m=>m.functions.account_native_activity_token_hook.authAdminExecute=false,
  m=>m.functions.account_native_activity_capture.serviceExecute=true,m=>m.functions.record_account_lifecycle_activity.bodySha256='0'.repeat(64),
  m=>m.tables.account_lifecycle_activity.foreignKeys=null,m=>m.activeIndex.predicate=null,m=>m.private='SYNTHETIC_PRIVATE_MARKER']){
  const changed=structuredClone(rows);change(changed[0].metadata);assert.throws(()=>verifyAccountInactivityCatalogMetadata(changed,{expectedCheckReference:expected}));
 }
 assert.throws(()=>verifyAccountInactivityCheckReference(accountErasureCheckReference(metadata()[0].metadata.checks)));
 let calls=0;const receipt=await verifyInstalledAccountInactivitySchema({accessToken:'SYNTHETIC',expectedCheckReference:expected,fetchImpl:async(url,options)=>{
  calls++;assert.equal(url,'https://api.supabase.com/v1/projects/afqhhdrkjfjtpadntdzo/database/query');assert.equal(options.redirect,'error');assert.equal(options.credentials,'omit');
  assert.deepEqual(JSON.parse(options.body),{query:accountInactivityCatalogQuery,read_only:true});return new Response(JSON.stringify(rows),{status:201});
 }});assert.equal(calls,1);assert.equal(receipt.automaticDeletionEnabled,false);
 for(const response of [()=>new Response(JSON.stringify(rows),{status:200}),()=>new Response(JSON.stringify(rows),{status:201,headers:{'content-length':'65537'}}),()=>new Response('{"private":"SYNTHETIC"}',{status:201})]){
  let reads=0;await assert.rejects(verifyInstalledAccountInactivitySchema({accessToken:'SYNTHETIC',expectedCheckReference:expected,fetchImpl:async()=>{reads++;return response();}}));assert.equal(reads,1);
 }
 let unavailable=0;await assert.rejects(verifyInstalledAccountInactivitySchema({accessToken:'SYNTHETIC',fetchImpl:async()=>{unavailable++;}}));assert.equal(unavailable,0);
});
test('current79 inactivity OFF uses the existing installed601 finite app plan with exact source staging',async()=>{
 const path=await import('node:path'),os=await import('node:os');
 const cutover=await import('./integrated-cutover-readiness.mjs');
 assert.equal(cutover.DEFAULT_CUTOVER_SOURCE_PHASE,'assistant-after599-successor');
 const work=await fs.promises.mkdtemp(path.join(os.tmpdir(),'rr-notice601-app-'));
 try{
  const prepared=await cutover.prepareTemporarySupabaseCutoverWorkdir({workdir:work,includeAccountErasureSource:true});
  const required=cutover.REQUIRED_CUTOVER_MIGRATIONS,pair=ACCOUNT_INACTIVITY_OFF_APP_MIGRATIONS;
  const local=[...required,...pair],list=remote=>'Local | Remote | Time\n'+local.map(row=>row.version+' | '+(remote.has(row.version)?row.version:'')+' |').join('\n');
  const dryFor=filenames=>'DRY RUN: migrations will *not* be pushed to the database.\n'+(filenames.length?'Would push these migrations:\n'+filenames.map(name=>' • '+name).join('\n')+'\nFinished supabase db push.':'Remote database is up to date.');
  const remote=new Set(required.map(r=>r.version)),dry=dryFor(pair.map(r=>r.filename));
  assert.equal((await fs.promises.readdir(prepared.migrationsDirectory)).filter(f=>f.endsWith('.sql')).length,required.length+2);
  assert.equal(required.length,66); // 45 prior fixture +21 whole numeric SQL is unchanged.
  assert(required.some(r=>r.version==='20261116181500'));
  const plan=await cutover.assertSupabaseMigrationPlan({migrationListText:list(remote),dryRunText:dry,migrationsDirectory:prepared.migrationsDirectory,allowAccountErasurePlan:true});
  assert.deepEqual(plan.pendingVersions,pair.map(r=>r.version));
  await assert.rejects(cutover.assertSupabaseMigrationPlan({migrationListText:list(remote),dryRunText:dry,migrationsDirectory:prepared.migrationsDirectory}));
  const without601=new Set(remote);without601.delete(required.at(-1).version);
  await assert.rejects(cutover.assertSupabaseMigrationPlan({migrationListText:list(without601),dryRunText:dry,migrationsDirectory:prepared.migrationsDirectory,allowAccountErasurePlan:true}));
  remote.add(pair[0].version);
  assert.deepEqual((await cutover.assertSupabaseMigrationPlan({migrationListText:list(remote),dryRunText:dryFor([pair[1].filename]),migrationsDirectory:prepared.migrationsDirectory,allowAccountErasurePlan:true})).pendingVersions,[pair[1].version]);
  remote.add(pair[1].version);
  assert.equal(cutover.assertSupabaseMigrationsApplied(list(remote),{requireAccountErasure:true}).appliedVersions.length,66);
  const file=path.join(prepared.migrationsDirectory,pair[0].filename),original=await fs.promises.readFile(file);
  await fs.promises.appendFile(file,'-- CHANGED_SOURCE\n');
  await assert.rejects(cutover.assertSupabaseMigrationPlan({migrationListText:list(remote),dryRunText:dryFor([]),migrationsDirectory:prepared.migrationsDirectory,allowAccountErasurePlan:true}));
  await fs.promises.writeFile(file,original);
 }finally{const absolute=path.resolve(work);assert(path.dirname(absolute)===path.resolve(os.tmpdir())&&path.basename(absolute).startsWith('rr-notice601-app-'));await fs.promises.rm(absolute,{recursive:true,force:true});}
});

test('current79 app qualification CLI refuses before transport without the normal exact-main proof',async()=>{
 const {spawnSync}=await import('node:child_process');
 const env=Object.fromEntries(['PATH','Path','SystemRoot','WINDIR','TEMP','TMP'].filter(key=>typeof process.env[key]==='string').map(key=>[key,process.env[key]]));
 for(const mode of ['--qualify-account-erasure-source','--read-account-erasure-installed']){
  const result=spawnSync(process.execPath,['scripts/verify-code-only-migration-plan.mjs',mode],{encoding:'utf8',env});
  assert.equal(result.status,1);assert.equal(result.stdout,'');assert.equal(result.stderr.trim(),'ACCOUNT_ERASURE_QUALIFIED_SCHEMA_EVIDENCE_REQUIRED');
 }
});
