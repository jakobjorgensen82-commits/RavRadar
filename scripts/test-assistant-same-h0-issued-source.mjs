// Actual issued53 SOURCE/CLI/route tests, never database or B/S authority.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import test from 'node:test';
import {computeCandidateGRollbackBundle,renderCandidateGRollbackGeneratedModule} from './build-candidate-g-rollback-bundle.mjs';
import {computeRavScoreModelBundle,renderGeneratedBundleModule} from './build-ravscore-model-bundle.mjs';
import {ravScoreModelBinding,assertRavScoreModelBinding} from '../js/core/ravscore-model-contract.js';
import {ravScoreModelBinding as candidateBinding} from './rollback-assets/ravscore-model-contract.js';
import {ravScoreContinuationImplementationSha256} from './lib/ravscore-continuation-implementation-contract.mjs';
import {checkpointMetadataCasBlock,synchronizeRavScoreModelBinding} from './sync-ravscore-model-binding.mjs';
import {assistantSameH0Definition as definition,ASSISTANT_SAME_H0_ALIASES} from './lib/assistant-same-h0-successor-source.mjs';
import {selectAssistantSameH0CodeOnlySource} from './select-assistant-same-h0-code-only-source.mjs';
import {buildEstablishedNativeCurrentSameH0MetadataAttestation,assertEstablishedNativeCurrentOriginForPart}
 from './lib/established-native-current-origin.mjs';
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

test('issued583: actual ordered physical C/I/T and normal model mutations, no TESTONLY retag',async()=>{
 const C=await computeCandidateGRollbackBundle(),I=await computeRavScoreModelBundle();
 assert.equal(C.modelBundleSha256,NEXT.C);assert.equal(I.modelBundleSha256,NEXT.I);
 assert.equal(await ravScoreContinuationImplementationSha256(),NEXT.T);
 assert.equal(C.manifest.files.length,94);assert.equal(I.manifest.files.length,93);
 assert.equal((await fs.readFile(path.join(ROOT,'scripts/rollback-assets/ravscore-model-bundle.generated.js'),'utf8')).replace(/\r\n/g,'\n'),renderCandidateGRollbackGeneratedModule(C));
 assert.equal((await fs.readFile(path.join(ROOT,'js/core/ravscore-model-bundle.generated.js'),'utf8')).replace(/\r\n/g,'\n'),renderGeneratedBundleModule(I));
 for(const manifest of [C.manifest,I.manifest])assert(!manifest.files.some(row=>(row.path??row.file)==='scripts/lib/assistant-same-h0-successor-source.mjs'),'No self-referential NEXT source closure');
 const source=await fs.readFile(path.join(ROOT,'js/services/rav-assistant.js'),'utf8');
 const sourceOverrides=new Map([['js/services/rav-assistant.js',source+'\n// actual source mutation\n']]);
 const badC=await computeCandidateGRollbackBundle({sourceOverrides}),badI=await computeRavScoreModelBundle({sourceOverrides});
 assert.notEqual(badC.modelBundleSha256,NEXT.C);assert.notEqual(badI.modelBundleSha256,NEXT.I);
 assert.throws(()=>assertRavScoreModelBinding({...ravScoreModelBinding(),modelBundleSha256:badI.modelBundleSha256}),/incompatible modelBundleSha256/u);
});

test('issued583: normal synchronizer actually reaches frozen aliases before rejecting their mutations',async()=>{
 const source=await readAssistantSameH0CanonicalSource(),I=ravScoreModelBinding(),C=candidateBinding();
 const before=checkpointMetadataCasBlock(source.canonicalSource,I,C,NEXT.T);assert(before.includes('origin140000_state_valid'));
 for(const alias of ASSISTANT_SAME_H0_ALIASES.slice(0,2)){
  const whole=definition(source.canonicalSource,alias.name);
  const changed=source.canonicalSource.replace(whole,()=>whole.replace('as $$','as $$\n-- changed alias body'));
  assert.throws(()=>checkpointMetadataCasBlock(changed,I,C,NEXT.T),/Whole original0200 alias changed/u);
  assert.throws(()=>checkpointMetadataCasBlock(source.canonicalSource.replace(whole,''),I,C,NEXT.T));
 }
 const result=await synchronizeRavScoreModelBinding({write:false});assert.deepEqual(result.changed,[]);
 assert.equal(result.binding.modelBundleSha256,NEXT.I);assert.equal(result.candidateBinding.modelBundleSha256,NEXT.C);
});

test('issued583: source routing is not B/S authority; opaque origin cannot be forged by flags or tuples',async()=>{
 let network=0;const originalFetch=globalThis.fetch;globalThis.fetch=async()=>{network++;throw Error('NO_NETWORK_IN_SOURCE_TEST');};
 try{
  for(const opt of ['false','true'])assert.equal(await selectAssistantSameH0CodeOnlySource({
   RAVRADAR_ASSISTANT_SAME_H0_UPGRADE_OPT_IN:opt,RAVRADAR_ESTABLISHED_NATIVE_CURRENT_ORIGIN_UPGRADE_OPT_IN:'false'}),true);
  await assert.rejects(selectAssistantSameH0CodeOnlySource({RAVRADAR_ASSISTANT_SAME_H0_UPGRADE_OPT_IN:'true',
   RAVRADAR_ESTABLISHED_NATIVE_CURRENT_ORIGIN_UPGRADE_OPT_IN:'true'}));
  for(const handle of [{},{published:true},{allowed:true,modelBinding:ravScoreModelBinding(),tuple:NEXT}]){
   await assert.rejects(buildEstablishedNativeCurrentSameH0MetadataAttestation(handle,{centralContract:{},conditions:{}}),
    {code:'FROZEN140000_PREDECESSOR_HANDLE'});
   assert.throws(()=>assertEstablishedNativeCurrentOriginForPart(handle,{part:{},integrated:{},candidate:{}}),
    {code:'ESTABLISHED_CURRENT_ORIGIN_HANDLE'});
  }
  assert.equal(network,0);
 }finally{globalThis.fetch=originalFetch;}
});

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
 const unknownLater=String(BigInt(NEXT.version)+1n);
 for(const text of [table(before.slice(1)),table([...rows,{local:unknownLater,remote:unknownLater}]),table([...rows,rows.at(-1)])])
  assert.throws(()=>selectAssistantSameH0Route({migrationListText:text,environment:installedEnv}));
 // Preserve the historical PR662 input too: it is now earlier than issued583,
 // so the complete normal plan (not route selection) must still reject it.
 await assert.rejects(verifyAssistantSameH0Plan({phase:'installed',
  migrationListText:table([...rows,{local:'20261018000000',remote:'20261018000000'}]),
  dryRunText:dry(false),migrationsDirectory,environment:installedEnv}));
 await assert.rejects(verifyAssistantSameH0Plan({phase:'before',migrationListText:table(before),dryRunText:dry(false),migrationsDirectory,environment:env}));
 const original=await fs.readFile(path.join(migrationsDirectory,migration.filename));
 await fs.appendFile(path.join(migrationsDirectory,migration.filename),'-- altered\n');
 await assert.rejects(readAssistantSameH0CanonicalSource({migrationsDirectory}));
 assert.equal(sha(original),PINS.migrationSha256);
});
