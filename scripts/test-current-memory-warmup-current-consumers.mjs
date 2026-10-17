// Normal current consumer regression; controlled local files, never hosted proof.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';
import {execFileSync} from 'node:child_process';
import test from 'node:test';
import {fileURLToPath} from 'node:url';
import {CURRENT_MEMORY_WARMUP_BINDING as NEXT,CURRENT_MEMORY_WARMUP_OUTPUT as PINS,
  CURRENT_MEMORY_WARMUP_BEFORE as OLD,currentMemoryWarmupMigration,readCurrentMemoryWarmupCanonicalSource}
  from './lib/current-memory-warmup-successor-source.mjs';
import * as readiness from './integrated-cutover-readiness.mjs';
import {synchronizeRavScoreModelBinding} from './sync-ravscore-model-binding.mjs';
import {RAVSCORE_CONTINUATION_IMPLEMENTATION_FILES as T_FILES,ravScoreContinuationImplementationSha256}
  from './lib/ravscore-continuation-implementation-contract.mjs';
import {ravScoreModelBinding} from '../js/core/ravscore-model-contract.js';
import {deferCurrentGridBindingEdges,currentGridEdgePublicationRequired,assertCurrentGridEdgeGeneration}
  from './lib/production-workflow-sources.mjs';
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const {REQUIRED_CUTOVER_MIGRATIONS:CURRENT,NATIVE0600_REQUIRED_CUTOVER_MIGRATIONS:HISTORICAL,
  LATEST_REQUIRED_CUTOVER_MIGRATION,expectedTripBindingPolicy,expectedCheckpointCasContract,
  assertSupabaseMigrationPlan,assertSupabaseMigrationsApplied,assertCurrentMemoryWarmupMigrationPlan,
  prepareTemporarySupabaseCutoverWorkdir,prepareCurrentMemoryWarmupCutoverWorkdir,
  hydrateTemporaryRemoteMigrationHistory,buildIntegratedCutoverReadiness}=readiness;
const sha=v=>crypto.createHash('sha256').update(v).digest('hex');
const descriptor=currentMemoryWarmupMigration();
const upToDate='DRY RUN: migrations will *not* be pushed to the database.\nRemote database is up to date.';
const list=(remote=CURRENT.map(m=>m.version),extra=[])=>'Local | Remote | Time (UTC)\n'+[...CURRENT.map(m=>m.version),...extra]
  .map(v=>v+' | '+(remote.includes(v)?v:'')+' | ').join('\n');
async function owned(use){
  const parent=await fs.realpath(os.tmpdir()),prefix='rr-current-memory-warmup-',dir=await fs.mkdtemp(path.join(parent,prefix));
  const stat=await fs.lstat(dir,{bigint:true}),identity=[stat.dev,stat.ino,stat.birthtimeNs];
  try{return await use(dir);}finally{
    assert.equal(await fs.realpath(dir),dir);assert.equal(path.dirname(dir),parent);assert(path.basename(dir).startsWith(prefix));
    const final=await fs.lstat(dir,{bigint:true});assert(final.isDirectory()&&!final.isSymbolicLink());
    assert.deepEqual([final.dev,final.ino,final.birthtimeNs],identity);
    async function noLinks(p){for(const leaf of await fs.readdir(p)){const file=path.join(p,leaf),s=await fs.lstat(file);
      assert(!s.isSymbolicLink());if(s.isDirectory())await noLinks(file);else assert(s.isFile()&&s.nlink===1);}}
    await noLinks(dir);await fs.rm(dir,{recursive:true,force:false});
  }
}
test('normal current is exact51/new contracts; explicit frozen50 remains historical; generic install is closed',async()=>{
  assert.equal(CURRENT.length,51);assert.equal(HISTORICAL.length,50);assert.deepEqual(CURRENT.slice(0,-1),HISTORICAL);
  assert.equal(HISTORICAL.at(-1).version,OLD.version);assert.deepEqual(LATEST_REQUIRED_CUTOVER_MIGRATION,descriptor);
  assert.equal((await expectedTripBindingPolicy()).sha256,PINS.tripBindingPolicySha256);
  assert.equal((await expectedCheckpointCasContract()).sha256,PINS.checkpointContractSha256);
  assert.equal((await expectedCheckpointCasContract({sourcePhase:'native0600'})).sha256,'7c5fca1a61300c47bc8ab6102071777314176f6ef3bfd10af44c55465b62fdfa');
  assert.equal((await expectedTripBindingPolicy({sourcePhase:'native0600'})).sha256,'dfb46e5d6c7d966d8833ff595f76dbb0f09a2af553630c6fb954ee8c17deffa9');
  assert.deepEqual((await assertSupabaseMigrationPlan({migrationListText:list(),dryRunText:upToDate})).pendingVersions,[]);
  assert.equal(assertSupabaseMigrationsApplied(list()).appliedVersions.length,51);
  const before=list(HISTORICAL.map(m=>m.version));
  const dry='DRY RUN: migrations will *not* be pushed to the database.\nWould push these migrations:\n * '+descriptor.filename+'\nFinished supabase db push.';
  await assert.rejects(assertSupabaseMigrationPlan({migrationListText:before,dryRunText:dry}),/CURRENT_MEMORY_WARMUP_PREWRITE_ROUTE_REQUIRED/);
  assert.deepEqual((await assertCurrentMemoryWarmupMigrationPlan({migrationListText:before,dryRunText:dry})).pendingVersions,[descriptor.version]);
  for(const extra of ['20261014140000','20261015030000','20261016030000','20261018000000'])
    await assert.rejects(assertSupabaseMigrationPlan({migrationListText:list([...CURRENT.map(m=>m.version),extra],[extra]),dryRunText:upToDate}));
  await owned(async dir=>{
    for(const [name,sourcePhase,count] of [['current','current-memory-warmup',51],['historical','native0600',50]]){
      const view=await prepareTemporarySupabaseCutoverWorkdir({workdir:path.join(dir,name),sourcePhase});
      const rows=sourcePhase==='native0600'?HISTORICAL:CURRENT;
      assert.equal((await fs.readdir(view.migrationsDirectory)).length,count);
      for(const row of rows)assert.deepEqual(await fs.readFile(path.join(view.migrationsDirectory,row.filename)),await fs.readFile(path.join(ROOT,'supabase/migrations',row.filename)));
      await hydrateTemporaryRemoteMigrationHistory({workdir:view.workdir,migrationListText:sourcePhase==='native0600'?list(HISTORICAL.map(m=>m.version)).split('\n').filter(l=>!l.startsWith(descriptor.version)).join('\n'):list(),sourcePhase});
    }
    const named=await prepareCurrentMemoryWarmupCutoverWorkdir({workdir:path.join(dir,'named')});
    assert.equal((await fs.readdir(named.migrationsDirectory)).length,51);
  });
});
test('normal synchronizer writes/checks all mutable paths, current readiness and preserved schema2',async()=>{
  await owned(async dir=>{
    const mutable=['knowledge/rav-assistant-public-v1.json','scripts/fixtures/rav-assistant-evals-v1.json','version.json',
      'supabase/functions/_shared/rav-assistant-contract.ts','data/admin/ravscore-profile-selection.json',
      'supabase/schema.sql','supabase/INSTALL-RAVRADAR-4.0.56-SECURITY.sql'];
    const copied=[...new Set([...mutable,...T_FILES,...CURRENT.map(m=>'supabase/migrations/'+m.filename)])];
    // Only these seven mutable fixture copies begin at the immutable native0600
    // main commit. Current normal modules, issued SQL and all T inputs stay real.
    // This makes the transition test independent of whether ROOT already synced.
    const nativeHead='be22a023085458beadd99995bb3c34051b3089b3';
    const before=new Map();
    for(const relative of copied){const bytes=mutable.includes(relative)
      ?execFileSync('git',['-C',ROOT,'show',nativeHead+':'+relative],{timeout:30000,maxBuffer:4*1024*1024})
      :await fs.readFile(path.join(ROOT,relative));before.set(relative,bytes);
      const file=path.join(dir,relative);await fs.mkdir(path.dirname(file),{recursive:true});await fs.writeFile(file,bytes,{flag:'wx'});}
    assert.equal(await ravScoreContinuationImplementationSha256({repositoryRoot:dir}),NEXT.T);
    const result=await synchronizeRavScoreModelBinding({write:true,root:dir});assert.equal(result.binding.modelBundleSha256,NEXT.I);
    assert.equal(result.changed.length,7);await synchronizeRavScoreModelBinding({root:dir});
    // File-read fixture only: the exact normal synchronizer-produced profile.
    // No product validator, binding value or readiness result is replaced.
    const read=fs.readFile,normalProfile=path.join(ROOT,'data/admin/ravscore-profile-selection.json');
    fs.readFile=async function(file,...args){return read.call(this,path.resolve(String(file))===normalProfile
      ?path.join(dir,'data/admin/ravscore-profile-selection.json'):file,...args);};
    try{
      const ready=await buildIntegratedCutoverReadiness('a'.repeat(40),{publicImplementationClosureSha256:'c'.repeat(64)});
      assert.deepEqual(ready.migrationIds,CURRENT.map(m=>m.id));assert.equal(ready.modelBundleSha256,NEXT.I);
      assert.equal(ready.tripBindingPolicySha256,PINS.tripBindingPolicySha256);
    }finally{fs.readFile=read;}
    const current=await readCurrentMemoryWarmupCanonicalSource();
    for(const relative of ['supabase/schema.sql','supabase/INSTALL-RAVRADAR-4.0.56-SECURITY.sql']){
      const sql=await fs.readFile(path.join(dir,relative),'utf8');assert(sql.includes(current.statisticsSchema2Source.trimEnd()));
      assert(sql.includes('ravradar_ravscore_checkpoint_cmw_predecessor_projection'));assert(sql.includes(NEXT.T));
    }
    for(const relative of copied.filter(p=>!mutable.includes(p)))assert.deepEqual(await fs.readFile(path.join(dir,relative)),before.get(relative),'No immutable source or migration mutation');
    assert.equal(sha(current.statisticsSchema2Source),'ee68e62d59e7d1c92ec0f0629c669f7e9c9756f30e86bc08af21cebdedbbe305');
  });
});
test('late Edge route accepts only exact native0600 predecessor/full ACTIVE contract, never older families',async()=>{
  const binding=ravScoreModelBinding(),old={...binding,modelBundleSha256:OLD.integrated};
  assert.equal(binding.modelBundleSha256,NEXT.I);assert.equal(deferCurrentGridBindingEdges(descriptor.version),true);
  assert.equal(deferCurrentGridBindingEdges(OLD.version),true);assert.equal(deferCurrentGridBindingEdges('20261013220000'),true);
  assert.equal(deferCurrentGridBindingEdges('20261016030000'),false);
  const active=b=>({model:'integrated',status:'INTEGRATED_ACTIVE',pending:false,modelBinding:structuredClone(b),
    datasetId:'synthetic-before',productionReferenceAt:'2026-10-16T10:00:00.000Z'});
  assert.equal(await currentGridEdgePublicationRequired(active(binding),'integrated'),false);
  const original=active(old),snapshot=structuredClone(original);
  assert.equal(await currentGridEdgePublicationRequired(original,'integrated-historical-maintenance'),true);assert.deepEqual(original,snapshot);
  for(const patch of [{pending:true},{status:'PENDING'},{model:'candidate'}])
    await assert.rejects(currentGridEdgePublicationRequired({...original,...patch},'integrated-historical-maintenance'),/normal active historical route/);
  await assert.rejects(currentGridEdgePublicationRequired(original,'integrated'),/normal active historical route/);
  for(const mutation of [{...old,profileId:'other'},{...old,modelContractSha256:'0'.repeat(64)},
    {...old,modelBundleSha256:'994dc3aad8ed2b92d7cb73504bf05bfce7684158ff8a22df7b9816a5adbdc7b6'}])
    await assert.rejects(currentGridEdgePublicationRequired(active(mutation),'integrated-historical-maintenance'),/unknown public original binding/);
  const target='2026-10-17T00:00:00.000Z',manifest={ravScoreModelBinding:binding,datasetId:'synthetic-after',productionReferenceAt:target};
  await assertCurrentGridEdgeGeneration(original,manifest,target);
  for(const changed of [{...manifest,datasetId:original.datasetId},{...manifest,productionReferenceAt:original.productionReferenceAt},{...manifest,ravScoreModelBinding:old}])
    await assert.rejects(assertCurrentGridEdgeGeneration(original,changed,target));
});
