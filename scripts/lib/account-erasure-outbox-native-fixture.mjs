// Additive SQL/race cases for the EXISTING owned native PostgreSQL host.
// No server launcher, external connection, Auth API stub accepted as GoTrue,
// production row, SQL hard-delete or completion authority is provided here.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {readAccountErasureSource,accountErasureCatalogQuery,verifyAccountErasureCatalogMetadata}
 from '../verify-account-erasure-schema.mjs';
const DB='rr_account_erasure_native_fixture';
export const ACCOUNT_ERASURE_NATIVE_SQL_CASE_COUNT=49;
export const ACCOUNT_INACTIVITY_NOTICE_NATIVE_SQL_CASE_COUNT=13;
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
export async function exerciseAccountErasureOutbox({psql,runSql,repositoryRoot}) {
 assert.equal(await psql("select current_setting('listen_addresses');"),'','Existing owned native host only');
 assert.equal(await psql('select current_user;'),'rr_native_test','Existing native fixture owner only');
 const source=readAccountErasureSource(repositoryRoot);let created=false,firstError=null,result=null;
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
  await psql('create database '+DB+';');created=true;
  const canonical=fs.readFileSync(path.join(repositoryRoot,'supabase/schema.sql'),'utf8').replaceAll('\r\n','\n');
  const start=canonical.indexOf('-- ACCOUNT_ASSISTANT_SCHEMA_GENERATED_BEGIN'),end=canonical.indexOf('-- ACCOUNT_ASSISTANT_SCHEMA_GENERATED_END');
  assert(start>=0&&end>start);
  await pg(String.raw`create schema auth; create schema extensions; create schema storage;
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
`+canonical.slice(start,end));
  const rollback=await raw(accountErasurePrecommitFailureSql(source.sql));
  assert.equal(rollback.code,3);assert.equal(rollback.sqlState,'P0001');
  assert.equal(await pg("select to_regclass('public.account_erasure_operations') is null and not exists(select 1 from pg_catalog.pg_proc where pronamespace='public'::regnamespace and proname like '%account_erasure%');"),'t');checked++;
  await pg(source.sql);
  await pg("insert into auth.users values('"+actor+"'); insert into public.profiles values('"+actor+"','owner-synthetic@example.invalid','owner',true);");
  const metadata=JSON.parse(await pg(accountErasureCatalogQuery));
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
  const noticeSql=fs.readFileSync(path.join(repositoryRoot,'supabase/migrations/20261116230000_account_inactivity_notice_off.sql'),'utf8');
  await pg(noticeSql);let noticeChecked=0;
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
  assert.equal(noticeChecked,ACCOUNT_INACTIVITY_NOTICE_NATIVE_SQL_CASE_COUNT,'Whole notice SQL extension must execute');
  result={passed:true,cases:checked,actualPostgres:true,syntheticSqlHost:true,realGoTrue:false,checkReference,checkExpressionDriftRefused:true,
   inactivityNotice:{cases:noticeChecked,migrationVersion:'20261116230000',migrationSQLSha256:createHash('sha256').update(noticeSql).digest('hex'),
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
  if(created){const cleanup=await runSql('drop database '+DB+';',15000);if(cleanup.code!==0&&!firstError)firstError=new Error('ACCOUNT_ERASURE_NATIVE_OWNED_DATABASE_CLEANUP_FAILED');}
 }
 if(firstError)throw firstError;return result;
}
