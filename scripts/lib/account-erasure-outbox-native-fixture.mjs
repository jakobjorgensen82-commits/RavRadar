// Additive SQL/race cases for the EXISTING owned native PostgreSQL host.
// No server launcher, external connection, Auth API stub accepted as GoTrue,
// production row, SQL hard-delete or completion authority is provided here.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {readAccountErasureSource,accountErasureCatalogQuery,verifyAccountErasureCatalogMetadata}
 from '../verify-account-erasure-schema.mjs';
const DB='rr_account_erasure_native_fixture';
const actor='10000000-0000-4000-8000-000000000001';
const id=n=>'20000000-0000-4000-8000-'+String(n).padStart(12,'0');
const op=n=>'30000000-0000-4000-8000-'+String(n).padStart(12,'0');
const auth=(user=actor,role='authenticated')=>"do $$ begin perform set_config('request.jwt.claim.sub','"+user+"',false); perform set_config('request.jwt.claim.role','"+role+"',false); end $$; set role "+role+';';
const jsonLast=text=>JSON.parse(String(text).trim().split('\n').filter(x=>x.startsWith('{')).at(-1));
export async function exerciseAccountErasureOutbox({psql,runSql,repositoryRoot}) {
 assert.equal(await psql("select current_setting('listen_addresses');"),'','Existing owned native host only');
 assert.equal(await psql('select current_user;'),'rr_native_test','Existing native fixture owner only');
 const source=readAccountErasureSource(repositoryRoot);let created=false,firstError=null,result=null;
 const sql=text=>'\\connect '+DB+'\n'+text;
 const pg=text=>psql(sql(text));
 const pending=[];
 const raw=(text,timeout=15000)=>{const promise=runSql(sql(text),timeout);pending.push(promise);return promise;};
 const owner=text=>pg(auth()+text);
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
  await pg(String.raw`create schema auth; create schema extensions;
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
`+canonical.slice(start,end));
  await pg(source.sql);
  await pg("insert into auth.users values('"+actor+"'); insert into public.profiles values('"+actor+"','owner-synthetic@example.invalid','owner',true);");
  const metadata=JSON.parse(await pg(accountErasureCatalogQuery));
  verifyAccountErasureCatalogMetadata([{metadata}],{source});checked++;
  await seed(1);const ready=await prepare(1);assert.equal(ready.state,'PREPARED');assert.equal(ready.complete,false);checked++;
  assert.deepEqual(await prepare(1),ready);checked++;
  const found=jsonLast(await owner("select public.find_account_erasure_operation('"+id(1)+"');"));assert.equal(found.operationId,op(1));checked++;
  await seed(2);await stateFailure(auth()+"select public.prepare_account_erasure('"+op(1)+"','"+id(2)+"');",'40001');
  await stateFailure(auth(id(1))+"select public.get_account_erasure_status('"+op(1)+"');",'42501');
  await stateFailure(auth(actor,'service_role')+"select public.stage_account_erasure_pg('"+op(1)+"','STAGE-MANUAL-ACCOUNT-PG-ERASURE');",'42501');
  await stateFailure(auth()+"select public.stage_account_erasure_pg('"+op(1)+"','wrong');",'22023');
  await pg("update public.account_activity_journal set last_activity_at='2026-01-02T00:00:00Z' where user_id='"+id(1)+"';");
  assert.equal((await stage(1)).state,'HOLD_ACTIVITY_CHANGED');assert.equal(await pg('select count(*) from public.observations where id=1;'),'1');checked++;
  await seed(3,false);await prepare(3);const staged=await stage(3);assert.equal(staged.state,'PG_STAGED_AUTH_PENDING');assert.equal(staged.pgRowsRemoved,1);assert.equal(staged.complete,false);assert.equal(staged.authDeleted,false);checked++;
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
  result={passed:true,cases:checked,actualPostgres:true,syntheticSqlHost:true,realGoTrue:false,
   observationsAndBootstrapFence:true,readCommittedFreshness:true,repeatableReadNoLateCommit:true,
   serializableNoLateCommit:true,actorNonKeyPrivilegeLock:true,authDeletion:false,d1Ack:false,completionAuthority:false};
 } catch(error){firstError=error;}
 finally {
  await Promise.allSettled(pending); // Observe every owned psql child before database cleanup.
  if(created){const cleanup=await runSql('drop database '+DB+';',15000);if(cleanup.code!==0&&!firstError)firstError=new Error('ACCOUNT_ERASURE_NATIVE_OWNED_DATABASE_CLEANUP_FAILED');}
 }
 if(firstError)throw firstError;return result;
}
