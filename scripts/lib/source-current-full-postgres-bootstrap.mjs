// Opt-in CURRENT native test only. Same owned PG; never an installer/issuer.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {requireSourceProducerOutput} from './source-producer-successor-source.mjs';
import {NATIVE0600_REQUIRED_CUTOVER_MIGRATIONS, verifyIntegratedDatabaseReadback}
  from '../integrated-cutover-readiness.mjs';
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const OLD='20261010130000';
const MARKER='create or replace function public.ravradar_ravscore_checkpoint_canonical_time(';
const REGISTER="insert into supabase_migrations.schema_migrations values('20261010130000');\n";
const sha=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
const EARLY=Object.freeze(['20260820_observation_remote_privacy.sql',
  '20260821_trip_evidence_contract.sql','20260823_account_trip_log_contract.sql',
  '20260823_observation_upload_contract.sql']);
// Source pin covers the WHOLE original base-table statement, not a field map.
const BASE_OBSERVATIONS_SHA256='56cca810b1d1627f08240df6fe6f69f61a6c61ae5e1236b2153d4481c7e7d024';
const completed=new WeakSet();
async function source(relative){
  const file=path.join(ROOT,relative),stat=await fs.lstat(file);
  assert(stat.isFile()&&!stat.isSymbolicLink());
  const bytes=await fs.readFile(file);assert(bytes.length===stat.size&&bytes.length>0);
  return {relative,bytes,text:bytes.toString('utf8'),sha256:sha(bytes)};
}
function guard(repositoryRoot,psql){
  requireSourceProducerOutput();
  assert.equal(process.platform,'linux');
  assert.equal(Number(process.versions.node.split('.')[0]),24);
  assert.equal(path.resolve(repositoryRoot),ROOT);assert.equal(typeof psql,'function');
}
export async function bootstrapSourceCurrentFullPostgres({repositoryRoot,psql,setup}){
  guard(repositoryRoot,psql);assert.equal(arguments.length,1);
  assert.equal(typeof setup,'string');assert.equal(setup.split(MARKER).length,2);
  const at=setup.indexOf(MARKER),prefix=setup.slice(0,at),suffix=setup.slice(at);
  assert.equal(prefix+suffix,setup,'WHOLE unchanged native setup inverse');
  assert.equal(prefix.split(REGISTER).length,2);
  const freshPrefix=prefix.replace(REGISTER,'');
  assert.equal(freshPrefix.replace('create extension pgcrypto with schema extensions;',
    REGISTER+'create extension pgcrypto with schema extensions;'),prefix,
    'Only premature synthetic OLD registration removed before chronological SQL');
  await psql(freshPrefix);
  assert.equal(await psql("select to_regclass('public.observations') is null and "
    +"to_regclass('auth.users') is null and to_regclass('storage.objects') is null "
    +"and (select count(*) from public.admin_documents)=0 "
    +"and (select count(*) from public.admin_document_versions)=0 "
    +"and (select count(*) from supabase_migrations.schema_migrations)=0;"),'t');
  // Empty platform scaffolding, like existing auth.role/uid; not app evidence.
  await psql('create table auth.users(id uuid primary key);create schema storage;'
    +'create table storage.objects(id uuid primary key,bucket_id text);'
    +'create table storage.buckets(id text primary key,name text,public boolean,'
    +'file_size_limit bigint,allowed_mime_types text[]);'
    +'alter table storage.objects enable row level security;'
    +'alter table public.admin_documents enable row level security;'
    +'alter table public.admin_document_versions enable row level security;'
    +'grant select,insert,update,delete on public.admin_documents to service_role;');
  const schema=await source('supabase/schema.sql');
  const begin='create table if not exists public.observations (',end='\n);';
  const normalized=schema.text.replace(/\r\n?/g,'\n');
  assert.equal(normalized.split(begin).length,2);
  const start=normalized.indexOf(begin),finish=normalized.indexOf(end,start)+end.length;
  assert(finish>start);const base=normalized.slice(start,finish);
  assert.equal(normalized.slice(0,start)+base+normalized.slice(finish),normalized);
  assert.equal(sha(base),BASE_OBSERVATIONS_SHA256);await psql(base);
  const old=NATIVE0600_REQUIRED_CUTOVER_MIGRATIONS.filter(row=>row.version<=OLD);
  assert.equal(old.at(-1).version,OLD);assert(old.length>3);
  for(let i=1;i<old.length;i++)assert(old[i-1].version<old[i].version);
  const inventory=[],registered=new Set();
  for(const [version,filename] of [...EARLY.map(file=>[file.split('_')[0],file]),...old.map(row=>[row.version,row.filename])]){
    assert.match(version,/^[0-9]{8,14}$/);assert.match(filename,/^[0-9]{8,14}_[a-z0-9_]+\.sql$/);
    const original=await source('supabase/migrations/'+filename);
    // Entire unchanged SQL, including its transaction/ACL/NOTIFY; no fragments.
    await psql(original.text);
    // The two genuine historical20260823 files share their original version.
    // Execute BOTH whole files; never invent a new migration/version for them.
    if(!registered.has(version)){
      await psql("insert into supabase_migrations.schema_migrations(version) values('"+version+"');");
      registered.add(version);
    }
    assert.equal(sha(await fs.readFile(path.join(ROOT,original.relative))),original.sha256);
    inventory.push({relativePath:original.relative,bytes:original.bytes.length,sha256:original.sha256});
  }
  await psql(suffix); // same OLD baseline, alias and native trigger as before.
  assert.equal(await psql('select max(version) from supabase_migrations.schema_migrations;'),OLD);
  assert.equal(await psql('select count(*) from public.observations;'),'0');
  const handle=Object.freeze({kind:'SOURCE_CURRENT_FULL_PG_BOOTSTRAPPED',inventory:Object.freeze(inventory)});
  completed.add(handle);return handle;
}
export async function verifySourceCurrentFullPostgres({repositoryRoot,psql,bootstrap}){
  guard(repositoryRoot,psql);assert.equal(arguments.length,1);assert(completed.has(bootstrap));
  const signature='public.ravradar_integrated_cutover_contract('+Array(22).fill('text').join(',')+')';
  const catalog=JSON.parse(await psql("select jsonb_build_object('integrated',to_regprocedure('"+signature+"') is not null,"
    +"'operational',to_regprocedure('public.ravradar_ravscore_operational_cas(bigint,bigint,jsonb,jsonb)') is not null,"
    +"'checkpoint',to_regprocedure('public.ravradar_ravscore_checkpoint_cas(bigint,timestamptz,jsonb)') is not null,"
    +"'constraints',(select count(*) from pg_constraint where conrelid='public.observations'::regclass "
    +"and conname=any(array['ravradar_observations_schema_version_check','ravradar_observations_data_quality_flags_check',"
    +"'ravradar_observations_nested_privacy_check','ravradar_observations_trip_v3_check'])),"
    +"'index',to_regclass('public.observations_trip_id_complete_uidx') is not null,"
    +"'trigger',exists(select 1 from pg_trigger where tgrelid='public.observations'::regclass "
    +"and tgname='ravradar_observations_active_v3_binding_trigger' and not tgisinternal and tgenabled='O'));"));
  assert.deepEqual(catalog,{integrated:true,operational:true,checkpoint:true,constraints:4,index:true,trigger:true});
  const address='https://source-current-same-pg.invalid',key='NATIVE_TEST_ONLY_NO_REMOTE_SERVICE';
  let calls=0;
  const fetchImpl=async(input,options)=>{
    assert.equal(typeof input,'string');assert.equal(options.method,'POST');
    const route=input.slice(address.length);assert(input.startsWith(address+'/rest/v1/rpc/'));
    const payload=JSON.parse(options.body);assert.equal(Object.getPrototypeOf(payload),Object.prototype);
    let name,args;
    if(route==='/rest/v1/rpc/ravradar_integrated_cutover_contract'){
      assert.equal(calls,0);assert.equal(Object.keys(payload).length,22);
      name='ravradar_integrated_cutover_contract';
      for(const [field,value]of Object.entries(payload)){
        assert.match(field,/^p_[a-z0-9_]+$/);assert.equal(typeof value,'string');
      }
      const actual=JSON.parse(await psql("select to_json(proargnames) from pg_proc where oid='"+signature+"'::regprocedure;"));
      assert.deepEqual([...actual].sort(),Object.keys(payload).sort());
      args=Object.entries(payload).map(([field,value])=>field+"=>'"+value.replaceAll("'","''")+"'").join(',');
    }else{
      assert.equal(route,'/rest/v1/rpc/ravradar_ravscore_checkpoint_contract');assert.equal(calls,1);
      assert.deepEqual(payload,{});name='ravradar_ravscore_checkpoint_contract';args='';
    }
    const text=await psql("set request.jwt.claim.role='service_role';set role service_role;select public."+name+'('+args+')::text;');
    JSON.parse(text);calls++;return new Response(text,{status:200,headers:{'content-type':'application/json'}});
  };
  await verifyIntegratedDatabaseReadback({url:address,serviceRoleKey:key,fetchImpl,sourcePhase:'source-producer'});
  assert.equal(calls,2);
  for(const row of bootstrap.inventory)
    assert.equal(sha(await fs.readFile(path.join(ROOT,row.relativePath))),row.sha256);
  return Object.freeze({kind:'SOURCE_CURRENT_FULL_PG_READBACK',sameHost:true,normalVerifier:true,
    actualIntegratedRpcParameters:22,actualCheckpointReadback:true,applicationRowsAuthored:false,productionProof:false});
}
