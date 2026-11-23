// Additive SQL/race cases for the EXISTING owned native PostgreSQL host.
// No server launcher, external connection, Auth API stub accepted as GoTrue,
// production row, SQL hard-delete or completion authority is provided here.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { readFixedNativeActivityReceiptSource, fixedNativeActivityReceiptArmQuery, buildFixedNativeActivityReceiptQuery } from './account-native-activity-receipt-source.mjs';
import {readAccountErasureSource,accountErasureCatalogQuery,verifyAccountErasureCatalogMetadata,
 readAccountInactivitySource,accountInactivityCatalogQuery,verifyAccountInactivityCatalogMetadata}
 from '../verify-account-erasure-schema.mjs';
const DB='rr_account_erasure_native_fixture';
export const ACCOUNT_ERASURE_NATIVE_SQL_CASE_COUNT=49;
export const ACCOUNT_INACTIVITY_NOTICE_NATIVE_SQL_CASE_COUNT=17;
const actor='10000000-0000-4000-8000-000000000001';
const id=n=>'20000000-0000-4000-8000-'+String(n).padStart(12,'0');
const op=n=>'30000000-0000-4000-8000-'+String(n).padStart(12,'0');
const auth=(user=actor,role='authenticated')=>"do $$ begin perform set_config('request.jwt.claim.sub','"+user+"',false); perform set_config('request.jwt.claim.role','"+role+"',false); end $$; set role "+role+';';
const jsonLast=text=>JSON.parse(String(text).trim().split('\n').filter(x=>x.startsWith('{')).at(-1));
export function accountErasurePrecommitFailureSql(sourceSql) {
 const injected=sourceSql.replace(/commit;\s*$/,()=>"do $$begin raise exception 'SYNTHETIC_ERASURE_PRECOMMIT';end;$$;\ncommit;\n");
 assert.notEqual(injected,sourceSql,'Account erasure transaction must have a final COMMIT');
 return injected;
}
// Shared app scaffolding only. Native Auth mode never creates/replaces Auth
// users, sessions, auth.uid/role or SCIM; the existing owned B supplies them.
export function accountErasureNativeFixtureSql(repositoryRoot,{nativeAuth=false}={}) {
 assert.equal(typeof nativeAuth,'boolean');
 const canonical=fs.readFileSync(path.join(repositoryRoot,'supabase/schema.sql'),'utf8').replaceAll('\r\n','\n');
 const start=canonical.indexOf('-- ACCOUNT_ASSISTANT_SCHEMA_GENERATED_BEGIN'),end=canonical.indexOf('-- ACCOUNT_ASSISTANT_SCHEMA_GENERATED_END');
 assert(start>=0&&end>start);
 let fixture=String.raw`create schema auth; create schema extensions; create schema storage;
create extension pgcrypto with schema extensions;
create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
create function auth.role() returns text language sql stable as $$ select current_setting('request.jwt.claim.role',true) $$;
grant usage on schema public,auth to authenticated,anon,service_role;
create table auth.users(id uuid primary key);
create table public.profiles(id uuid primary key references auth.users(id) on delete cascade,email text,role text not null,is_active boolean not null default true);
create table public.user_permissions(user_id uuid references public.profiles(id) on delete cascade,enabled boolean not null);
create table public.observations(id bigint primary key,user_id uuid references auth.users(id) on delete set null,payload text default 'SYNTHETIC');
grant select,insert,update,delete on public.observations to service_role;
create table public.app_user_roles(user_id uuid references auth.users(id) on delete restrict);
create table public.handbook_reviews(created_by uuid references auth.users(id) on delete restrict,resolved_by uuid references auth.users(id) on delete set null);
create table public.handbook_review_versions(changed_by uuid references auth.users(id) on delete set null);
create table public.admin_documents(updated_by uuid references auth.users(id) on delete set null);
create table public.admin_document_versions(created_by uuid references auth.users(id) on delete set null);
create table public.admin_audit_log(actor_id uuid references auth.users(id) on delete set null);
create table auth.scim_users(user_id uuid references auth.users(id) on delete set null);
create table storage.objects(owner uuid,owner_id text);
create table storage.buckets(owner uuid,owner_id text);
create table storage.s3_multipart_uploads(owner_id text);
create table storage.s3_multipart_uploads_parts(owner_id text);
alter table storage.objects enable row level security;
alter table storage.buckets enable row level security;
alter table storage.s3_multipart_uploads enable row level security;
alter table storage.s3_multipart_uploads_parts enable row level security;
`;
 if(nativeAuth){
  // The genuine Supabase host already owns its vendor schemas and privileges.
  // Only the public app scaffolding belongs to this native capture fixture.
  for(const line of [
   'create schema auth; ',
   'create schema extensions; ',
   'create schema storage;\n',
   'create extension pgcrypto with schema extensions;\n',
   "create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;\n",
   "create function auth.role() returns text language sql stable as $$ select current_setting('request.jwt.claim.role',true) $$;\n",
   'grant usage on schema public,auth to authenticated,anon,service_role;\n',
   'create table auth.users(id uuid primary key);\n',
   'create table auth.scim_users(user_id uuid references auth.users(id) on delete set null);\n',
   'create table storage.objects(owner uuid,owner_id text);\n',
   'create table storage.buckets(owner uuid,owner_id text);\n',
   'create table storage.s3_multipart_uploads(owner_id text);\n',
   'create table storage.s3_multipart_uploads_parts(owner_id text);\n',
   'alter table storage.objects enable row level security;\n',
   'alter table storage.buckets enable row level security;\n',
   'alter table storage.s3_multipart_uploads enable row level security;\n',
   'alter table storage.s3_multipart_uploads_parts enable row level security;\n',
  ]){assert(fixture.includes(line));fixture=fixture.replace(line,'');}
  fixture="do $$begin if to_regclass('auth.users') is null or to_regclass('auth.sessions') is null or to_regclass('auth.scim_users') is null then raise exception 'GENUINE_AUTH_SCHEMA_REQUIRED';end if;end;$$;\n"+fixture;
 }
 return fixture+canonical.slice(start,end);
}
export async function exerciseAccountErasureOutbox({psql,runSql,repositoryRoot}) {
 assert.equal(await psql("select current_setting('listen_addresses');"),'','Existing owned native host only');
 assert.equal(await psql('select current_user;'),'rr_native_test','Existing native fixture owner only');
 const source=readAccountErasureSource(repositoryRoot);let databaseCreated=false,firstError=null,result=null;
 const sql=text=>'\\connect '+DB+'\n'+text;
 const pg=text=>psql(sql(text));
 const pending=[];
 const raw=(text,timeout=15000)=>{const promise=runSql(sql(text),timeout);pending.push(promise);return promise;};
 const owner=text=>pg(auth()+text);
 const service=text=>pg(auth(actor,'service_role')+text).then(jsonLast);
 const prepare=n=>owner("select public.prepare_account_erasure('"+op(n)+"','"+id(n)+"');").then(jsonLast);
 const stage=n=>owner("select public.stage_account_erasure_pg('"+op(n)+"','STAGE-MANUAL-ACCOUNT-PG-ERASURE');").then(jsonLast);
 let checked=0;
 async function stateFailure(text,state){const r=await raw(text);assert.equal(r.code,3);assert.equal(r.sqlState,state);checked++;}
 async function waitApplication(name,event='PgSleep') {
  for(let i=0;i<80;i++){
   if(await pg("select exists(select 1 from pg_catalog.pg_stat_activity where datname='"+DB+"' and application_name='"+name+"' and "+(event==='Lock'?"wait_event_type='Lock'":"wait_event='PgSleep'")+");")==='t')return;
   await new Promise(resolve=>setTimeout(resolve,25));
  }
  throw new Error('ACCOUNT_ERASURE_NATIVE_RACE_NOT_OBSERVED');
 }
 async function seed(n,activity=true) {
  await pg("insert into auth.users values('"+id(n)+"'); insert into public.profiles(id,email,role) values('"+id(n)+"','synthetic@example.invalid','expert');"
   +(activity?"insert into public.account_activity_journal values('"+id(n)+"','2026-01-01T00:00:00Z','2026-01-01T00:00:00Z');":'')
   +"insert into public.observations(id,user_id) values("+n+",'"+id(n)+"');");
 }
 try {
  await psql('create database '+DB+';');databaseCreated=true;
  await pg(accountErasureNativeFixtureSql(repositoryRoot));
  const rollback=await raw(accountErasurePrecommitFailureSql(source.sql));
  assert.equal(rollback.code,3);assert.equal(rollback.sqlState,'P0001');
  assert.equal(await pg("select to_regclass('public.account_erasure_operations') is null and not exists(select 1 from pg_catalog.pg_proc where pronamespace='public'::regnamespace and proname like '%account_erasure%');"),'t');checked++;
  await pg(source.sql);
  await pg("insert into auth.users values('"+actor+"'); insert into public.profiles values('"+actor+"','owner-synthetic@example.invalid','owner',true);");
  const metadata=JSON.parse(await pg(accountErasureCatalogQuery));
  const ownerChecks=JSON.parse(await pg('select public.account_erasure_check_metadata();'));
  assert.deepEqual(metadata.checks,ownerChecks,'Catalog projection preserves the canonical CHECK definitions');
  const restrictedCatalog=jsonLast(await pg('begin;grant usage on schema extensions to service_role;'
   +'set local role service_role;'+accountErasureCatalogQuery+'rollback;'));
  assert.deepEqual(restrictedCatalog,metadata,'Read-only catalog query works with the private function still denied');
  const checkReference=verifyAccountErasureCatalogMetadata([{metadata}],{source}).checkReference;checked++;
  const checkName=checkReference.definitions[0][0];assert(/^account_erasure_operations_[a-z0-9_]+$/.test(checkName));
  const checkDrift=JSON.parse(await pg('begin;alter table public.account_erasure_operations drop constraint "'+checkName+'";alter table public.account_erasure_operations add constraint "'+checkName+'" check(true);'+accountErasureCatalogQuery+'rollback;'));
  assert.equal(checkDrift.table.checks,28);
  assert.throws(()=>verifyAccountErasureCatalogMetadata([{metadata:checkDrift}],{source,expectedCheckReference:checkReference}),/ACCOUNT_ERASURE_CHECK_SEMANTICS_MISMATCH/);checked++;
  const aclDrift=JSON.parse(await pg('begin;grant execute on function public.account_erasure_require_service_owner(uuid) to service_role;'+accountErasureCatalogQuery+'rollback;'));
  assert.throws(()=>verifyAccountErasureCatalogMetadata([{metadata:aclDrift}],{source}),/ACCOUNT_ERASURE_CATALOG_MISMATCH/);checked++;
  await seed(1);const ready=await prepare(1);assert.equal(ready.state,'PREPARED');assert.equal(ready.complete,false);checked++;
  assert.deepEqual(await prepare(1),ready);checked++;
  const found=jsonLast(await owner("select public.find_account_erasure_operation('"+id(1)+"');"));assert.equal(found.operationId,op(1));checked++;
  await seed(2);await stateFailure(auth()+"select public.prepare_account_erasure('"+op(1)+"','"+id(2)+"');",'40001');
  await stateFailure(auth(id(1))+"select public.get_account_erasure_status('"+op(1)+"');",'42501');
  await stateFailure(auth(actor,'service_role')+"select public.stage_account_erasure_pg('"+op(1)+"','STAGE-MANUAL-ACCOUNT-PG-ERASURE');",'42501');
  await stateFailure(auth()+"select public.stage_account_erasure_pg('"+op(1)+"','wrong');",'22023');
  await pg("update public.account_activity_journal set last_activity_at='2026-01-02T00:00:00Z' where user_id='"+id(1)+"';");
  assert.equal((await stage(1)).state,'HOLD_ACTIVITY_CHANGED');assert.equal(await pg('select count(*) from public.observations where id=1;'),'1');checked++;
  await seed(3,false);await prepare(3);const staged=await stage(3);assert.equal(staged.state,'PG_STAGED_AUTH_PENDING');assert.equal(staged.pgRowsRemoved,1);assert.equal(staged.complete,false);assert.equal(staged.authAbsent,false);checked++;
  assert.deepEqual(await stage(3),staged);checked++;
  assert.equal(await pg("select exists(select 1 from auth.users where id='"+id(3)+"');"),'t');checked++;
  await stateFailure(auth(actor,'service_role')+"insert into public.observations(id,user_id) values(303,'"+id(3)+"');",'42501');
  await pg("insert into public.observations(id,user_id) values(304,null);");checked++;
  await stateFailure(auth(actor,'service_role')+"update public.observations set user_id='"+id(3)+"' where id=304;",'42501');
  // The actual guard also checks OLD ownership, including owner->NULL.
  await pg("alter table public.observations disable trigger account_erasure_observation_write_guard; insert into public.observations(id,user_id) values(305,'"+id(3)+"'); alter table public.observations enable trigger account_erasure_observation_write_guard;");
  await stateFailure(auth(actor,'service_role')+"update public.observations set user_id=null where id=305;",'42501');
  await stateFailure("update public.profiles set email='changed@example.invalid' where id='"+id(3)+"';",'42501');
  await stateFailure("insert into public.profiles(id,email,role) values('"+id(3)+"','changed@example.invalid','expert') on conflict(id) do update set email=excluded.email;",'42501');
  await pg("delete from public.observations where id=305; delete from public.profiles where id='"+id(3)+"';");
  assert.equal(jsonLast(await owner("select public.get_account_erasure_status('"+op(3)+"');")).state,'PG_STAGED_AUTH_PENDING');checked++;
  await stateFailure("insert into auth.users values('"+id(3)+"');",'42501');
  // SQL phase/ACL tests use explicitly synthetic service attestations here.
  // Only the existing genuine GoTrue fixture can qualify their HTTP evidence.
  const subject='usr_v1_'+'A'.repeat(43),created='2026-01-01T00:00:00.123456Z',attemptA=op(100),attemptB=op(101),attemptC=op(102);
  const claim=(previous,attempt,generation=created)=>"select public.claim_account_erasure_auth('"+op(3)+"','"+actor+"',"+(previous?"'"+previous+"'":'null')+",'"+attempt+"','"+generation+"','"+subject+"');";
  await stateFailure(auth()+claim(null,attemptA),'42501');
  const claimed=await service(claim(null,attemptA));assert.equal(claimed.shouldIssueDelete,true);assert.equal(claimed.authUserCreatedAt,created);checked++;
  assert.equal((await service(claim(null,attemptA))).shouldIssueDelete,false);checked++;
  assert.equal((await service(claim(attemptA,attemptB))).shouldIssueDelete,true);checked++;
  assert.equal((await service(claim(attemptB,attemptA))).shouldIssueDelete,false);checked++;
  await stateFailure(auth(actor,'service_role')+claim(null,attemptC),'40001');
  const changed=await service(claim(attemptB,attemptC,'2026-01-01T00:00:00.123457Z'));
  assert.equal(changed.shouldIssueDelete,false);assert.equal(changed.holdReason,'AUTH_GENERATION_CHANGED');checked++;
  await stateFailure(auth(actor,'service_role')+"select public.acknowledge_account_erasure_d1('"+op(3)+"','"+actor+"','"+attemptB+"','"+subject+"',0);",'22023');
  const absent=await service("select public.acknowledge_account_erasure_auth_absent('"+op(3)+"','"+actor+"','"+attemptB+"','"+attemptB+"','"+subject+"');");
  assert.equal(absent.authAbsent,true);assert.equal(absent.complete,false);checked++;
  // A false service attestation cannot complete while the Auth row remains.
  await stateFailure(auth(actor,'service_role')+"select public.acknowledge_account_erasure_d1('"+op(3)+"','"+actor+"','"+attemptB+"','"+subject+"',0);",'P0001');
  await seed(10);await prepare(10);await stage(10);
  const initialAbsent=await service("select public.acknowledge_account_erasure_auth_absent('"+op(10)+"','"+actor+"',null,'"+op(103)+"','"+subject+"');");
  assert.equal(initialAbsent.authUserCreatedAt,null);assert.equal(initialAbsent.authAbsent,true);assert.equal(initialAbsent.complete,false);checked++;
  assert.equal(await pg("select auth_claimed_at is null from public.account_erasure_operations where operation_id='"+op(10)+"';"),'t');checked++;
  await seed(11);await pg('create policy synthetic_unknown_upload on storage.objects for insert to authenticated with check(false);');
  assert.equal((await prepare(11)).holdReason,'STORAGE_POLICY_UNQUALIFIED');checked++;
  await pg('drop policy synthetic_unknown_upload on storage.objects;');
  await seed(12);await pg("insert into storage.objects(owner_id) values('"+id(12)+"');");
  assert.equal((await prepare(12)).holdReason,'STORAGE_OWNERSHIP');checked++;
  await seed(13);await pg('alter table storage.s3_multipart_uploads_parts drop column owner_id;');
  assert.equal((await prepare(13)).holdReason,'STORAGE_CATALOG_UNKNOWN');checked++;
  await pg('alter table storage.s3_multipart_uploads_parts add column owner_id text;');
  // Storage can change AFTER PG-stage. A synthetic service claim must still
  // stop before Auth authority, then freshly qualify policy on explicit resume.
  await seed(14);await prepare(14);await stage(14);
  await pg('create policy synthetic_post_pg_upload on storage.objects for insert to authenticated with check(false);');
  const postPgClaim="select public.claim_account_erasure_auth('"+op(14)+"','"+actor+"',null,'"+op(104)+"','"+created+"','"+subject+"');";
  const storageHeld=await service(postPgClaim);
  assert.equal(storageHeld.pgStageCommitted,true);assert.equal(storageHeld.shouldIssueDelete,false);
  assert.equal(storageHeld.holdReason,'STORAGE_POLICY_UNQUALIFIED');assert.equal(storageHeld.authAttemptId,null);
  assert.equal(storageHeld.authAbsent,false);assert.equal(storageHeld.complete,false);
  await pg('drop policy synthetic_post_pg_upload on storage.objects;');
  const storageQualified=await service(postPgClaim);
  assert.equal(storageQualified.shouldIssueDelete,true);assert.equal(storageQualified.holdReason,null);
  assert.equal(storageQualified.authAttemptId,op(104));assert.equal(storageQualified.authAbsent,false);
  assert.equal(storageQualified.complete,false);checked++;
  await seed(4);await pg("insert into public.app_user_roles values('"+id(4)+"');");assert.equal((await prepare(4)).holdReason,'REFERENCE_POLICY');checked++;
  await seed(5);await pg("update public.profiles set email='expert@ravradar.dk' where id='"+id(5)+"';");assert.equal((await prepare(5)).holdReason,'PRIVILEGED_TARGET');checked++;
  // READ COMMITTED must re-read positive journal after a waited profile lock.
  await seed(6);await prepare(6);
  const fresh=raw("begin;set application_name='rr_erasure_freshness';update public.profiles set email=email where id='"+id(6)+"';update public.account_activity_journal set last_activity_at='2026-01-03T00:00:00Z' where user_id='"+id(6)+"';select pg_sleep(1.5);commit;");
  await waitApplication('rr_erasure_freshness');const freshStage=await stage(6);assert.equal((await fresh).code,0);assert.equal(freshStage.state,'HOLD_ACTIVITY_CHANGED');checked++;
  // Existing UPDATE tuple lock -> profile conflict must fail writer NOWAIT,
  // not form a cycle with stage's profile -> DELETE tuple lock.
  await seed(7);await prepare(7);
  const oldWriter=raw("begin;set application_name='rr_erasure_old_update';select id from public.observations where id=7 for update;select pg_sleep(1.5);"+auth(actor,'service_role')+"update public.observations set payload='LATE_SYNTHETIC' where id=7;commit;");
  await waitApplication('rr_erasure_old_update');
  const pendingStage=raw("set application_name='rr_erasure_waiting_stage';"+auth()+"select public.stage_account_erasure_pg('"+op(7)+"','STAGE-MANUAL-ACCOUNT-PG-ERASURE');");
  await waitApplication('rr_erasure_waiting_stage','Lock');
  const oldOutcome=await oldWriter;assert.equal(oldOutcome.code,3);assert.equal(oldOutcome.sqlState,'55P03');
  const stageOutcome=await pendingStage;assert.equal(stageOutcome.code,0);assert.equal(jsonLast(stageOutcome.stdout).state,'PG_STAGED_AUTH_PENDING');checked++;
  for(const [n,isolation] of [[8,'repeatable read'],[9,'serializable']]){
   await seed(n);await prepare(n);
   const name='rr_erasure_snapshot_'+n;
   const writer=raw('begin isolation level '+isolation+";set application_name='"+name+"';select id from public.profiles where id='"+id(n)+"';select pg_sleep(1.5);"+auth(actor,'service_role')+"insert into public.observations(id,user_id) values("+(n+1000)+",'"+id(n)+"');commit;");
   await waitApplication(name);assert.equal((await stage(n)).state,'PG_STAGED_AUTH_PENDING');
   const outcome=await writer;assert.equal(outcome.code,3);assert(['40001','55P03','42501'].includes(outcome.sqlState),'No stale-snapshot COMMIT accepted');
   assert.equal(await pg('select count(*) from public.observations where id='+(n+1000)+';'),'0');checked++;
  }
  // Actor authorization lock must survive a non-key role/is_active update.
  const ownerRead=raw("begin;set application_name='rr_erasure_actor_lifetime';"+auth()+"select public.get_account_erasure_status('"+op(3)+"');select pg_sleep(1.5);commit;");
  await waitApplication('rr_erasure_actor_lifetime');
  const revoke=await raw("set lock_timeout='100ms';update public.profiles set is_active=false where id='"+actor+"';");
  assert.equal(revoke.code,3);assert.equal(revoke.sqlState,'55P03');assert.equal((await ownerRead).code,0);checked++;
  // Durable server discovery, including profile-gone and all HOLD operations.
  await pg('insert into public.account_erasure_operations(operation_id,target_user_id,requested_by,profile_was_active,state,hold_reason,prepared_at,updated_at) values '+
   Array.from({length:65},(_,i)=>"('"+op(2001+i)+"','"+id(5001+i)+"','"+actor+"',true,'HOLD_POLICY','REFERENCE_POLICY',now(),now())").join(',')+';');
  const page1=jsonLast(await owner('select public.list_account_erasure_operations();'));
  assert.equal(page1.scope,'own-account-erasure-operations');assert.equal(page1.rows.length,64);assert.equal(page1.truncated,true);
  assert(page1.rows.some(row=>row.operationId===op(3)),'A removed profile must not hide its durable operation');
  for(const row of page1.rows)assert.deepEqual(Object.keys(row).sort(),Object.keys(staged).sort());
  const page2=jsonLast(await owner("select public.list_account_erasure_operations(p_after=>'"+page1.rows.at(-1).operationId+"');"));
  assert.equal(page2.truncated,false);assert(page2.rows.length>0&&page2.rows.length<=64);
  assert.equal(new Set([...page1.rows,...page2.rows].map(row=>row.operationId)).size,page1.rows.length+page2.rows.length);
  assert.equal(Number(await pg("select count(*) from public.account_erasure_operations where requested_by='"+actor+"' and state<>'COMPLETE';")),page1.rows.length+page2.rows.length);checked++;
  await stateFailure(auth(id(1))+'select public.list_account_erasure_operations();','42501');
  await stateFailure(auth(actor,'service_role')+'select public.list_account_erasure_operations();','42501');
  assert.equal(checked,ACCOUNT_ERASURE_NATIVE_SQL_CASE_COUNT,'Whole app SQL/race case inventory must execute');
  // Notice-only extension on the SAME already-owned host/database. Backdated
  // rows and enabled policy below are synthetic prerequisites, not real history.
  const noticeSql=fs.readFileSync(path.join(repositoryRoot,'supabase/migrations/20261117180000_account_inactivity_notice_off.sql'),'utf8');
  const manualBeforeNoticeInstall=jsonLast(await owner("select public.get_account_erasure_status('"+op(3)+"');"));
  // This existing owned PG-only fixture has no real Auth service. The one
  // named NOLOGIN grantee is catalogue scaffolding, never native Auth evidence.
  await psql("create role supabase_auth_admin nologin noinherit;");
  await pg(noticeSql);
  const inactivitySource=readAccountInactivitySource(repositoryRoot);
  const capture=inactivitySource.migrations[1];await pg(capture.sql);
  const offMetadata=JSON.parse(await pg(accountInactivityCatalogQuery));
  const offCatalog=verifyAccountInactivityCatalogMetadata([{metadata:offMetadata}],{source:inactivitySource});
  let noticeChecked=0;
  const afterNoticeMetadata=JSON.parse(await pg(accountErasureCatalogQuery));
  verifyAccountErasureCatalogMetadata([{metadata:afterNoticeMetadata}],{source,expectedCheckReference:checkReference});
  assert.deepEqual(jsonLast(await owner("select public.get_account_erasure_status('"+op(3)+"');")),manualBeforeNoticeInstall);
  assert.deepEqual(jsonLast(await owner('select public.list_account_erasure_operations();')),page1);
  noticeChecked++; // The new installation must preserve the qualified manual API/catalogue.

  const notice=n=>'40000000-0000-4000-8000-'+String(n).padStart(12,'0');
  const attempt=n=>'50000000-0000-4000-8000-'+String(n).padStart(12,'0');
  const prepareNotice=n=>owner("select public.prepare_account_inactivity_notice('"+notice(n)+"','"+id(n)+"');").then(jsonLast);
  const noticeStatus=n=>owner("select public.get_account_inactivity_notice_status('"+notice(n)+"');").then(jsonLast);
  const positive=n=>pg(auth(id(n))+"select public.record_account_lifecycle_activity();").then(jsonLast);
  const claimNotice=(n,revision,tryId)=>"select public.claim_account_inactivity_notice('"+notice(n)+"','"+actor+"',"+revision+",'"+tryId+"','"+'a'.repeat(64)+"','2020-01-01T00:00:00.123456789Z');";
  const expectState=async(text,state)=>{const r=await raw(text);assert.equal(r.code,3);assert.equal(r.sqlState,state);noticeChecked++;};
  await seed(101);const off=await prepareNotice(101);assert.equal(off.state,'HELD');assert.equal(off.holdReason,'POLICY_OFF');
  assert.equal(off.automaticDeletionEnabled,false);noticeChecked++;
  assert.equal((await positive(101)).recorded,true);const cancelled=await noticeStatus(101);
  assert.equal(cancelled.state,'CANCELLED');assert(BigInt(cancelled.revision)>BigInt(off.revision));
  assert.equal(cancelled.deleteNotBefore,null);noticeChecked++;
  await expectState(auth(id(101),'anon')+'select public.record_account_lifecycle_activity();','42501');
  await expectState(auth(id(101))+"select public.prepare_account_inactivity_notice('"+notice(102)+"','"+id(101)+"');",'42501');
  await expectState(auth(actor,'service_role')+"insert into public.account_inactivity_policy(singleton) values(false);",'42501');
  await pg("update public.account_inactivity_policy set notices_enabled=true,coverage_status='CAPTURING',coverage_started_at=clock_timestamp()-interval '3 years',delivery_qualified=true;");
  const qualified=async n=>{
   await seed(n);await positive(n);
   await pg("update public.account_activity_journal set first_observed_at=clock_timestamp()-interval '4 years',last_activity_at=clock_timestamp()-interval '3 years' where user_id='"+id(n)+"';"
    +"update public.account_lifecycle_activity set first_observed_at=clock_timestamp()-interval '4 years',last_activity_at=clock_timestamp()-interval '3 years',coverage_epoch=(select coverage_epoch from public.account_inactivity_policy) where user_id='"+id(n)+"';");
   return prepareNotice(n);
  };
  const readyNotice=await qualified(102);assert.equal(readyNotice.state,'READY');noticeChecked++;
  const nullCas=await service(claimNotice(102,'null',attempt(1)));assert.equal(nullCas.shouldSend,false);assert.equal(nullCas.state,'READY');noticeChecked++;
  const noticeClaimed=await service(claimNotice(102,readyNotice.revision,attempt(1)));assert.equal(noticeClaimed.shouldSend,true);
  assert.equal(noticeClaimed.authUserCreatedAt,'2020-01-01T00:00:00.123456789Z');noticeChecked++;
  const ack=(n,version,tryId,outcome)=>service("select public.acknowledge_account_inactivity_notice('"+notice(n)+"','"+actor+"',"+version+",'"+tryId+"','"+outcome+"','60000000-0000-4000-8000-000000000001');");
  const noticeAccepted=await ack(102,noticeClaimed.revision,attempt(1),'accepted');assert.equal(noticeAccepted.accepted,true);
  assert.equal(noticeAccepted.delivered,false);assert.equal(noticeAccepted.deleteNotBefore,null);noticeChecked++;
  const noticeDelivered=await ack(102,noticeAccepted.revision,attempt(1),'delivered');assert.equal(noticeDelivered.delivered,true);
  assert.equal(await pg("select delete_not_before=delivered_at+interval '720 hours' from public.account_inactivity_notices where notice_id='"+notice(102)+"';"),'t');
  assert.equal(noticeDelivered.automaticDeletionEnabled,false);noticeChecked++;
  await positive(102);const noticeRetained=await noticeStatus(102);assert.equal(noticeRetained.state,'CANCELLED');assert.equal(noticeRetained.deleteNotBefore,null);
  assert.equal(await pg("select exists(select 1 from auth.users where id='"+id(102)+"');"),'t');
  assert.equal(await pg('select count(*) from public.observations where id=102;'),'1');noticeChecked++;
  const racing=await qualified(103);
  const activity=raw("set application_name='rr_notice_positive_activity';"+auth(id(103))+"begin;select public.record_account_lifecycle_activity();select pg_sleep(0.3);commit;");
  await waitApplication('rr_notice_positive_activity');
  const competing=raw(auth(actor,'service_role')+claimNotice(103,racing.revision,attempt(2)));
  const activityResult=await activity,claimResult=await competing;assert.equal(activityResult.code,0);assert.equal(claimResult.code,0);
  const afterLogin=jsonLast(claimResult.stdout);assert.equal(afterLogin.state,'CANCELLED');assert.equal(afterLogin.shouldSend,false);noticeChecked++;
  const replayReady=await qualified(104);
  const firstNoticeAttempt=await service(claimNotice(104,replayReady.revision,attempt(3)));
  const unknownFirst=await ack(104,firstNoticeAttempt.revision,attempt(3),'unknown');
  const secondNoticeAttempt=await service(claimNotice(104,unknownFirst.revision,attempt(4)));
  const unknownSecond=await ack(104,secondNoticeAttempt.revision,attempt(4),'unknown');
  const replayFirst=await service(claimNotice(104,unknownSecond.revision,attempt(3)));
  assert.equal(replayFirst.shouldSend,false);assert.equal(replayFirst.attemptId,attempt(4));noticeChecked++;
  for(const [n,reason] of [[105,'AUTH_UNAVAILABLE'],[106,'DELIVERY_UNAVAILABLE']]){
   const prepared=await qualified(n),tryId=attempt(n);
   const claimed=await service(claimNotice(n,prepared.revision,tryId));
   const accepted=await ack(n,claimed.revision,tryId,'accepted');
   const identitySql="select jsonb_build_array(attempt_id,provider_id,recipient_digest,auth_user_created_at,claimed_at,accepted_at,attempt_ids) from public.account_inactivity_notices where notice_id='"+notice(n)+"';";
   const identity=await pg(identitySql);
   const held=await service("select public.hold_account_inactivity_notice('"+notice(n)+"','"+actor+"',"+accepted.revision+",'"+reason+"');");
   assert.equal(held.state,'HELD');assert.equal(held.accepted,true);assert.equal(held.deleteNotBefore,null);
   assert.equal((await service(claimNotice(n,held.revision,attempt(n+100)))).shouldSend,false);
   assert.deepEqual(await ack(n,accepted.revision,tryId,'delivered'),held,'Stale CAS cannot acknowledge delivery');
   assert.deepEqual(await ack(n,held.revision,attempt(n+100),'delivered'),held,'Changed attempt cannot acknowledge delivery');
   const wrongProvider=await raw(auth(actor,'service_role')+"select public.acknowledge_account_inactivity_notice('"+notice(n)+"','"+actor+"',"+held.revision+",'"+tryId+"','delivered','60000000-0000-4000-8000-000000000099');");
   assert.equal(wrongProvider.code,3);assert.equal(wrongProvider.sqlState,'22023');
   const recovered=await ack(n,held.revision,tryId,'delivered');
   assert.equal(recovered.state,'DELIVERED');assert.equal(recovered.automaticDeletionEnabled,false);
   assert.equal(await pg(identitySql),identity,'Readback must retain original receipt/body/generation/send-attempt');
   assert.equal(await pg("select delete_not_before=delivered_at+interval '720 hours' from public.account_inactivity_notices where notice_id='"+notice(n)+"';"),'t');
   noticeChecked++;
  }
  // A transient readback recovery must still recheck fresh policy/activity.
  const guardPrepared=await qualified(107),guardAttempt=attempt(107);
  const guardClaimed=await service(claimNotice(107,guardPrepared.revision,guardAttempt));
  const guardAccepted=await ack(107,guardClaimed.revision,guardAttempt,'accepted');
  const guardHeld=await service("select public.hold_account_inactivity_notice('"+notice(107)+"','"+actor+"',"+guardAccepted.revision+",'DELIVERY_UNAVAILABLE');");
  await pg('update public.account_inactivity_policy set delivery_qualified=false;');
  const stillHeld=await ack(107,guardHeld.revision,guardAttempt,'delivered');
  assert.equal(stillHeld.state,'HELD');assert.equal(stillHeld.holdReason,'DELIVERY_UNQUALIFIED');assert.equal(stillHeld.deleteNotBefore,null);
  await pg('update public.account_inactivity_policy set delivery_qualified=true;');
  await positive(107);const guardCancelled=await noticeStatus(107);
  const cancelledDelivery=await raw(auth(actor,'service_role')+"select public.acknowledge_account_inactivity_notice('"+notice(107)+"','"+actor+"',"+guardCancelled.revision+",'"+guardAttempt+"','delivered','60000000-0000-4000-8000-000000000001');");
  assert.equal(cancelledDelivery.code,3);assert.equal(cancelledDelivery.sqlState,'22023');
  assert.deepEqual(await noticeStatus(107),guardCancelled);noticeChecked++;
  assert.equal(noticeChecked,ACCOUNT_INACTIVITY_NOTICE_NATIVE_SQL_CASE_COUNT,'Whole notice SQL extension must execute');
  result={passed:true,cases:checked,actualPostgres:true,syntheticSqlHost:true,realGoTrue:false,checkReference,checkExpressionDriftRefused:true,
   inactivityNotice:{cases:noticeChecked,migrations:inactivitySource.migrations.map(({sql,id,...row})=>row),
    checkReference:offCatalog.checkReference,catalogVerified:offCatalog.catalogVerified,
    captureSqlExecuted:true,hookConfigured:false,syntheticSqlHost:true,
    actualPostgres:true,coverageSynthetic:true,providerDeliverySynthetic:true,
    positiveRpcCancellation:true,defaultOff:true,automaticDeletion:false,realAuth:false,realMail:false},
   serviceEvidenceSynthetic:true,failedTransactionRolledBack:true,aclMutationRefused:true,ownerPendingDiscoveryAndPagination:true,
   authAttemptReplayAndGeneration:true,initialAbsenceWithoutDeleteClaim:true,
   authUuidFenceSqlOnly:true,storageDefaultDenyAndOwnership:true,postPgStorageClaimHeld:true,
   observationsAndBootstrapFence:true,readCommittedFreshness:true,repeatableReadNoLateCommit:true,
   serializableNoLateCommit:true,actorNonKeyPrivilegeLock:true,authDeletion:false,d1Ack:false,completionAuthority:false};
 } catch(error){firstError=error;}
 finally {
  await Promise.allSettled(pending); // Observe every owned psql child before database cleanup.
  if(databaseCreated){const cleanup=await runSql('drop database '+DB+';',15000);if(cleanup.code!==0&&!firstError)firstError=new Error('ACCOUNT_ERASURE_NATIVE_OWNED_DATABASE_CLEANUP_FAILED');}
 }
 if(firstError)throw firstError;return result;
}

// Separate proposed current append on the SAME owned native PG host. The old
// 49/17 cases and their original SQL/default meaning remain unchanged.
export async function exerciseAccountNativeReceipt({ psql, runSql, repositoryRoot }) {
 assert.equal(await psql("select current_setting('listen_addresses');"), '', 'Existing owned native host only');
 assert.equal(await psql('select current_user;'), 'rr_native_test', 'Existing native fixture owner only');
 assert.equal(fs.realpathSync(repositoryRoot), fs.realpathSync(new URL('../..', import.meta.url)), 'Current source root only');
 const database = 'rr_account_native_receipt_fixture';
 const append = readFixedNativeActivityReceiptSource(), original = readAccountInactivitySource(repositoryRoot);
 const pg = text => psql('\\connect ' + database + '\n' + text);
 const pending = [];
 const raw = text => { const promise = runSql('\\connect ' + database + '\n' + text, 15000); pending.push(promise); return promise; };
 const receipt = () => pg('select row_to_json(r) from public.account_native_activity_receipt r;');
 const hook = user => auth(user, 'supabase_auth_admin') + "select public.account_native_activity_token_hook('" + JSON.stringify({user_id:user,claims:{sub:user}}) + "'::jsonb);";
 const target = id(800), missing = id(801);
 let created = false, firstError = null, cases = 0;
 try {
  assert.equal(await psql("select exists(select 1 from pg_roles where rolname='supabase_auth_admin');"), 't', 'Existing normal native grantee required');
  await psql('create database ' + database + ';'); created = true;
  await pg(accountErasureNativeFixtureSql(repositoryRoot));
  await pg(readAccountErasureSource(repositoryRoot).sql);
  for (const migration of original.migrations) await pg(migration.sql);
  const before = JSON.parse(await pg(accountInactivityCatalogQuery));
  verifyAccountInactivityCatalogMetadata([{metadata:before}], {source:original});
  await pg(append.sql);
  const current = JSON.parse(await pg(accountInactivityCatalogQuery));
  assert.throws(() => verifyAccountInactivityCatalogMetadata([{metadata:current}], {source:original}));
  verifyAccountInactivityCatalogMetadata([{metadata:current}], {source:{...original,bodies:{...original.bodies,account_native_activity_token_hook:append.hookBodySha256}}});
  // Execute the very same query the normal HTTP reader sends. Keep the real
  // fixture owner; this is SQL/row-shape evidence, never hosted admission.
  const normalQuery = buildFixedNativeActivityReceiptQuery(accountInactivityCatalogQuery);
  const normalMetadata = JSON.parse(await pg('select row_to_json(fixed_receipt) from ('
    + normalQuery.trim().replace(/;$/, '') + ') fixed_receipt;'));
  assert.deepEqual(Object.keys(normalMetadata).sort(), ['metadata','authAdminPublicUsage','policyEpoch','observedAt','receipt'].sort());
  const {account_native_activity_receipt:receiptTable,...legacyTables} = normalMetadata.metadata.tables;
  assert.deepEqual({...normalMetadata.metadata,tables:legacyTables}, current);
  assert.equal(normalMetadata.metadata.checks.definitions.length, 17, 'Receipt CHECKs must not enter the legacy facit');
  assert.equal(receiptTable.owner, 'rr_native_test', 'Actual fixture owner is never rewritten as postgres');
  assert.equal(receiptTable.present, true); assert.equal(receiptTable.checks, 7); assert.equal(receiptTable.constraintCount, 8);
  assert.equal(receiptTable.rls, true); assert.equal(receiptTable.forceRls, true); assert.equal(receiptTable.directAccess, false);
  assert.equal(normalMetadata.authAdminPublicUsage, true);
  assert.equal(normalMetadata.receipt.length, 1);
  assert.equal(normalMetadata.receipt[0].armedAt, null); assert.equal(normalMetadata.receipt[0].nativeStartedAt, null);
  assert.equal(normalMetadata.receipt[0].nativeCapturedAt, null); cases++;
  await pg("insert into auth.users values('" + target + "');insert into public.profiles(id,email,role) values('" + target + "','native-synthetic@example.invalid','expert');");
  const policy = await pg('select row_to_json(p) from public.account_inactivity_policy p;');
  const unarmed = JSON.parse(await receipt());
  assert.equal(unarmed.armed_at, null); assert.equal(unarmed.native_captured_at, null);
  assert.deepEqual(jsonLast(await pg(hook(target))).claims, {sub:target});
  assert.deepEqual(JSON.parse(await receipt()), unarmed); cases++;
  for (const role of ['anon','authenticated','service_role','supabase_auth_admin']) {
   const denied = await raw('set role ' + role + ';select * from public.account_native_activity_receipt;');
   assert.equal(denied.code,3); assert.equal(denied.sqlState,'42501');
   const writeDenied = await raw('set role ' + role + ';update public.account_native_activity_receipt set armed_at=clock_timestamp();');
   assert.equal(writeDenied.code,3); assert.equal(writeDenied.sqlState,'42501');
  }
  for (const role of ['anon','authenticated','service_role']) {
   const denied = await raw(auth(target,role) + "select public.account_native_activity_token_hook('" + JSON.stringify({user_id:target,claims:{sub:target}}) + "'::jsonb);");
   assert.equal(denied.code,3); assert.equal(denied.sqlState,'42501');
  } cases++;
  // Fixture-only gate lets the real unchanged capture wait without a timer race.
  // Arm is committed while the native hook is already inside its journal write.
  await pg(`create table public.rr_native_receipt_gate(released boolean not null);insert into public.rr_native_receipt_gate values(false);
create function public.rr_native_receipt_gate_wait() returns trigger language plpgsql as $gate$
declare until_at timestamptz := clock_timestamp()+interval '5 seconds';
begin
 perform set_config('application_name','rr_native_receipt_prearm',true);
 while not (select released from public.rr_native_receipt_gate) loop
  if clock_timestamp()>until_at then raise exception 'NATIVE_RECEIPT_FIXTURE_GATE_EXPIRED';end if;
  perform pg_sleep(0.01);
 end loop;
 return new;
end;
$gate$;
create trigger rr_native_receipt_gate before insert or update on public.account_activity_journal
 for each row execute function public.rr_native_receipt_gate_wait();`);
  const prearm = raw('begin isolation level read committed;' + hook(target) + 'commit;');
  let entered = false;
  try {
   for(let i=0;i<80;i++) {
    if(await pg("select exists(select 1 from pg_stat_activity where datname='"+database+"' and application_name='rr_native_receipt_prearm' and wait_event='PgSleep');")==='t'){entered=true;break;}
    await new Promise(resolve=>setTimeout(resolve,25));
   }
   assert(entered,'Actual native hook must enter capture before arm');
   await pg(fixedNativeActivityReceiptArmQuery);
  } finally { await pg('update public.rr_native_receipt_gate set released=true;'); }
  const prearmResult=await prearm;assert.equal(prearmResult.code,0);
  assert.deepEqual(jsonLast(prearmResult.stdout).claims,{sub:target});
  await pg('drop trigger rr_native_receipt_gate on public.account_activity_journal;drop function public.rr_native_receipt_gate_wait();drop table public.rr_native_receipt_gate;');
  const armed = await receipt(); const armedRow = JSON.parse(armed);
  assert.equal(armedRow.native_captured_at,null,'Earlier in-flight native capture must not consume the later arm');
  assert.equal(armedRow.arm_epoch, unarmed.arm_epoch); assert(armedRow.armed_at);
  assert.equal(armedRow.coverage_epoch, JSON.parse(policy).coverage_epoch);
  await pg(fixedNativeActivityReceiptArmQuery); assert.equal(await receipt(),armed); cases++;
  const rpc = jsonLast(await pg(auth(target) + 'select public.record_account_lifecycle_activity();'));
  assert.equal(rpc.recorded,true); assert.equal(await receipt(),armed); cases++;
  await pg('begin;' + hook(target) + 'rollback;'); assert.equal(await receipt(),armed); cases++;
  await pg('begin;' + hook(missing) + 'rollback;'); assert.equal(await receipt(),armed);
  assert.equal(await pg('select row_to_json(p) from public.account_inactivity_policy p;'),policy); cases++;
  const lock = raw("begin;set application_name='rr_native_receipt_owned_lock';select 1 from public.account_native_activity_receipt for update;select pg_sleep(10);rollback;");
  let ready = false;
  for (let i=0;i<80;i++) {
   if (await pg("select exists(select 1 from pg_stat_activity where datname='"+database+"' and application_name='rr_native_receipt_owned_lock' and wait_event='PgSleep');") === 't') {ready=true;break;}
   await new Promise(resolve=>setTimeout(resolve,25));
  }
  assert(ready,'Owned receipt lock must be observed');
  try { assert.deepEqual(jsonLast(await pg(hook(target))).claims,{sub:target}); }
  finally { await pg("select pg_cancel_backend(pid) from pg_stat_activity where datname='"+database+"' and application_name='rr_native_receipt_owned_lock';"); }
  const cancelled = await lock; assert.equal(cancelled.code,3); assert.equal(cancelled.sqlState,'57014');
  assert.equal(await receipt(),armed); cases++;
  assert.deepEqual(jsonLast(await pg(hook(target))).claims,{sub:target});
  const captured = await receipt(); const capturedRow = JSON.parse(captured);
  assert.equal(capturedRow.arm_epoch,armedRow.arm_epoch); assert.equal(capturedRow.coverage_epoch,armedRow.coverage_epoch);
  assert(capturedRow.native_started_at >= capturedRow.armed_at);
  assert(capturedRow.native_captured_at >= capturedRow.native_started_at);
  await pg(hook(target)); assert.equal(await receipt(),captured);
  assert.equal(await pg('select count(*) from public.account_native_activity_receipt;'),'1');
  assert.equal(await pg('select row_to_json(p) from public.account_inactivity_policy p;'),policy); cases++;
  assert.equal(cases,9,'Whole small native receipt inventory must execute');
 } catch(error) { firstError=error; }
 finally {
  await Promise.allSettled(pending);
  if(created) { const cleanup=await runSql('drop database '+database+';',15000); if(cleanup.code!==0&&!firstError)firstError=new Error('NATIVE_RECEIPT_OWNED_DATABASE_CLEANUP_FAILED'); }
 }
 if(firstError)throw firstError;
 return {cases,appendSha256:append.sha256,actualPostgres:true,syntheticSqlHost:true,realGoTrue:false,realAuthResponse:false,
  exclusiveHookOnly:true,browserRpcCannotWitness:true,outerTransactionRollback:true,oneReceipt:true,
  policyActivated:false,notices:false,deletion:false,userDataReported:false};
}
