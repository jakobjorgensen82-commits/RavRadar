// Actual issued53 SOURCE/CLI/route tests, never database or B/S authority.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import test from 'node:test';
import * as ready from './integrated-cutover-readiness.mjs';
import {selectAssistantSameH0Route,verifyAssistantSameH0Plan} from './verify-assistant-same-h0-plan.mjs';
import {requireAssistantSameH0Binding,requireAssistantSameH0Output,assistantSameH0Migration,
  readAssistantSameH0CanonicalSource} from './lib/assistant-same-h0-successor-source.mjs';
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),sha=x=>crypto.createHash('sha256').update(x).digest('hex');
const NEXT=requireAssistantSameH0Binding(),PINS=requireAssistantSameH0Output(),migration=assistantSameH0Migration();
const rows=ready.REQUIRED_CUTOVER_MIGRATIONS.map(row=>({local:row.version,remote:row.version}));
const table=values=>'Local | Remote | Time (UTC)\n'+values.map(row=>(row.local??'')+' | '+(row.remote??'')+' | source fixture').join('\n');
const before=rows.map(row=>row.local===NEXT.version?{...row,remote:null}:row);
const env={...process.env,GITHUB_EVENT_NAME:'workflow_dispatch',GITHUB_REF:'refs/heads/main',GITHUB_RUN_ATTEMPT:'1',
 RAVRADAR_ASSISTANT_SAME_H0_UPGRADE_OPT_IN:'true',RAVRADAR_ASSISTANT_SAME_H0_CONFIRMATION:'DEPLOY-CODE-ONLY-REPAIR',
 RAVRADAR_ASSISTANT_SAME_H0_WRITER_ACTIVE:'false',RAVRADAR_ASSISTANT_SAME_H0_ORIGINALS_VERIFIED:'true',
 RAVRADAR_ASSISTANT_SAME_H0_NOLOSS_VERIFIED:'true',RAVRADAR_ASSISTANT_SAME_H0_PREWRITE_VERIFIED:'true',
 RAVRADAR_ASSISTANT_SAME_H0_SAVED_WEATHER:'false',RAVRADAR_ASSISTANT_SAME_H0_RECOVERY_RUN_ID:'',
 SUPABASE_URL:'',SUPABASE_SERVICE_ROLE_KEY:'',SUPABASE_ACCESS_TOKEN:'',SUPABASE_DB_PASSWORD:''};
const dry=pending=>'DRY RUN: migrations will *not* be pushed to the database.\n'+(pending?
 'Would push these migrations:\n * '+migration.filename+'\nFinished supabase db push.\n':'Remote database is up to date.\n');
const invoke=(file,args,environment=env)=>spawnSync(process.execPath,[path.join(ROOT,'scripts',file),...args],{
 cwd:ROOT,env:environment,encoding:'utf8',timeout:120000,maxBuffer:2*1024*1024});

test('issued SAME_H0: actual generic applied CLI requires all53; historical52 is retained not retagged',async t=>{
 assert.equal(rows.length,53);assert.equal(rows.at(-1).local,NEXT.version);
 assert.equal(ready.establishedNativeCurrentOriginRequiredMigrations().length,52);
 assert.equal(ready.establishedNativeCurrentOriginRequiredMigrations().at(-1).version,'20261017140000');
 const directory=await fs.mkdtemp(path.join(os.tmpdir(),'rr-issued-same-h0-applied-'));
 t.after(()=>fs.rm(directory,{recursive:true,force:true}));const file=path.join(directory,'list.txt');
 await fs.writeFile(file,table(rows));const result=invoke('integrated-cutover-readiness.mjs',['applied','--migration-list',file]);
 assert.equal(result.status,0,result.stderr);assert(result.stdout.includes(rows.map(r=>r.local).join(', ')));
 assert.deepEqual(ready.assertSupabaseMigrationsApplied(table(rows)).appliedVersions,rows.map(r=>r.local));
 for(const row of rows)for(const side of ['local','remote'])assert.throws(()=>ready.assertSupabaseMigrationsApplied(
  table(rows.map(r=>r===row?{...r,[side]:null}:r))));
 for(const version of ['20261018000000','20261014140000','20261015030000','20261016030000'])
  assert.throws(()=>ready.assertSupabaseMigrationsApplied(table([...rows,{local:version,remote:version}])));
 assert.throws(()=>ready.assertSupabaseMigrationsApplied(table([...rows,rows.at(-1)])));
 await fs.writeFile(file,table(before));const rejected=invoke('integrated-cutover-readiness.mjs',['applied','--migration-list',file]);
 assert.equal(rejected.status,1);assert.equal(rejected.stdout,'');
 assert.throws(()=>ready.assertSupabaseMigrationsApplied(table(rows.slice(0,-1))));
});

test('issued SAME_H0: actual current canonical/default contracts retain whole old originals',async()=>{
 const current=await readAssistantSameH0CanonicalSource();assert.equal(current.admission,'NO_ADMISSION');
 assert.equal(sha(current.canonicalSource),PINS.canonicalSha256);assert.equal(current.originalDefinitions.length,8);
 assert.equal((await ready.expectedCheckpointCasContract()).sha256,PINS.checkpointContractSha256);
 assert.equal((await ready.expectedTripBindingPolicy()).sha256,PINS.tripBindingPolicySha256);
 const file=path.join(ROOT,'supabase/migrations',migration.filename);assert.equal(sha(await fs.readFile(file)),PINS.migrationSha256);
 const {requiresPrivateRuntimeCheckpointReconcile:select}=await import('./reconcile-private-runtime-checkpoint.mjs');
 const old=await import('./lib/established-native-current-origin-successor-source.mjs');
 const descriptor=(I,T)=>({modelBinding:{modelBundleSha256:I},contractHashes:{continuationStateContractSha256:T}});
 assert.equal(select(descriptor(NEXT.I,NEXT.T)),true);assert.equal(select(descriptor(old.ESTABLISHED_NATIVE_CURRENT_ORIGIN_BINDING.I,old.ESTABLISHED_NATIVE_CURRENT_ORIGIN_BINDING.T)),true);
 for(const d of [descriptor(NEXT.I,old.ESTABLISHED_NATIVE_CURRENT_ORIGIN_BINDING.T),descriptor('0'.repeat(64),NEXT.T),{},null])assert.equal(select(d),false);
});

test('issued SAME_H0: actual physical workdir and before/installed plan CLI preserve freshproof routes',async t=>{
 const directory=await fs.mkdtemp(path.join(os.tmpdir(),'rr-issued-same-h0-plan-'));
 t.after(()=>fs.rm(directory,{recursive:true,force:true}));
 const workdir=path.join(directory,'view');const prepared=invoke('integrated-cutover-readiness.mjs',['prepare-workdir','--output',workdir]);
 assert.equal(prepared.status,0,prepared.stderr);assert(prepared.stdout.includes('53 exact source migrations'));
 const migrationsDirectory=path.join(workdir,'supabase/migrations');
 const physical=(await fs.readdir(migrationsDirectory)).filter(f=>f.endsWith('.sql'));assert.equal(physical.length,53);
 assert.equal(physical.filter(f=>f===migration.filename).length,1);
 for(const archived of ['20261014140000','20261015030000','20261016030000'])assert(!physical.some(f=>f.startsWith(archived+'_')));
 const listFile=path.join(directory,'list.txt'),dryFile=path.join(directory,'dry.txt'),environmentFile=path.join(directory,'github-env.txt');
 for(const installed of [false,true]){
  const environment={...env,GITHUB_ENV:environmentFile,RAVRADAR_ASSISTANT_SAME_H0_UPGRADE_OPT_IN:installed?'false':'true'};
  await fs.writeFile(listFile,table(installed?rows:before));await fs.writeFile(dryFile,dry(!installed));await fs.writeFile(environmentFile,'');
  const phase=installed?'installed':'before';
  assert.equal(selectAssistantSameH0Route({migrationListText:table(installed?rows:before),environment}),phase);
  const selected=invoke('verify-assistant-same-h0-plan.mjs',['--select','--migration-list',listFile],environment);
  assert.equal(selected.status,0,selected.stderr);
  assert.equal(await fs.readFile(environmentFile,'utf8'),'RAVRADAR_ASSISTANT_SAME_H0_PHASE='+phase+'\nRAVRADAR_ASSISTANT_SAME_H0_EDGE_REQUIRED=true\n');
  const checked=invoke('verify-assistant-same-h0-plan.mjs',['--phase',phase,'--migration-list',listFile,'--dry-run',dryFile,'--migrations-directory',migrationsDirectory],environment);
  assert.equal(checked.status,0,checked.stderr);
 }
 const installedEnv={...env,RAVRADAR_ASSISTANT_SAME_H0_UPGRADE_OPT_IN:'false'};
 assert.throws(()=>selectAssistantSameH0Route({migrationListText:table(rows),environment:env}),/consumed-grant/);
 for(const[key,value]of [['GITHUB_RUN_ATTEMPT','2'],['GITHUB_REF','refs/heads/other'],['RAVRADAR_ASSISTANT_SAME_H0_ORIGINALS_VERIFIED','false'],
  ['RAVRADAR_ASSISTANT_SAME_H0_NOLOSS_VERIFIED','false'],['RAVRADAR_ASSISTANT_SAME_H0_WRITER_ACTIVE','true'],['RAVRADAR_ESTABLISHED_NATIVE_CURRENT_ORIGIN_UPGRADE_OPT_IN','true']])
  assert.throws(()=>selectAssistantSameH0Route({migrationListText:table(before),environment:{...env,[key]:value}}));
 for(const text of [table(before.slice(1)),table([...rows,{local:'20261018000000',remote:'20261018000000'}]),table([...rows,rows.at(-1)])])
  assert.throws(()=>selectAssistantSameH0Route({migrationListText:text,environment:installedEnv}));
 await assert.rejects(verifyAssistantSameH0Plan({phase:'before',migrationListText:table(before),dryRunText:dry(false),migrationsDirectory,environment:env}));
 const original=await fs.readFile(path.join(migrationsDirectory,migration.filename));
 await fs.appendFile(path.join(migrationsDirectory,migration.filename),'-- altered\n');
 await assert.rejects(readAssistantSameH0CanonicalSource({migrationsDirectory}));
 assert.equal(sha(original),PINS.migrationSha256);
});
