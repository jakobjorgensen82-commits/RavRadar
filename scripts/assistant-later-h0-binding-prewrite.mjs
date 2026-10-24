#!/usr/bin/env node
// Family-fixed SAME-ORIGINAL preservation before SQL, NOT a runtime transition.
// No grant, projection, metadata rebind, checkout install, SQL or provider call.
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {execFile as callbackExec} from 'node:child_process';
import {promisify,isDeepStrictEqual as equal} from 'node:util';
import {requireAssistantLaterH0Binding,requireAssistantLaterH0Output,readAssistantLaterH0CanonicalSource,
  assistantLaterH0Migration} from './lib/assistant-later-h0-successor-source.mjs';
import {withAuthenticated586PredecessorSource} from './check-assistant-later-h0-predecessor-source.mjs';
import {readAuthenticatedFrozen586Predecessor,assertAuthenticatedFrozen586Snapshot,
  assertAuthenticatedFrozen586SnapshotFresh} from './lib/authenticated-frozen586-predecessor.mjs';
import {assertRestoredOriginalInventory} from './migrate-post-cutover-private-runtime.mjs';
import {assertAssistantLaterH0MigrationPlan} from './integrated-cutover-readiness.mjs';
import {inspectDmiForecastFile,readDmiForecastRecord} from './lib/dmi-forecast-file.mjs';
import {unpackDmiPartContinuity,assertDmiPartContinuityTotalSize} from './lib/dmi-part-continuity.mjs';
import {createProtectedDmiNativeCurrentInspector} from './lib/protected-dmi-native-current-proofs.mjs';
import {nativeCurrentOriginalBankForPart} from './lib/ravscore-recovery-source-priority.mjs';
import {saved121DirectSelection} from './lib/coherent-original-source-views.mjs';
import {ravScoreModelBinding} from '../js/core/ravscore-model-contract.js';
import {ravScoreModelBinding as candidateBinding} from './rollback-assets/ravscore-model-contract.js';
import {privateRuntimeContractHashes} from './private-production-runtime-workflow.mjs';
import {ownFileDescriptorIdentity,ownedFileDescriptorClosed} from './lib/private-weather-component-pack.mjs';
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),exec=promisify(callbackExec);
const sha=raw=>crypto.createHash('sha256').update(raw).digest('hex');
const same=(a,b)=>assert(equal(a,b),'ASSISTANT_BINDING_ORIGINAL_CHANGED');
const positive=value=>Number.isSafeInteger(value)&&value>0;
const inside=(parent,file)=>{const relative=path.relative(parent,file);return relative!==''&&relative!=='..'
  &&!relative.startsWith('..'+path.sep)&&!path.isAbsolute(relative);};
export function assertAssistantBindingPrewriteCaller(){
  assert.equal(arguments.length,0);const e=process.env;
  assert.equal(e.GITHUB_WORKFLOW,'Apply RavRadar backend bindings without weather');
  assert.equal(e.GITHUB_EVENT_NAME,'workflow_dispatch');assert.equal(e.GITHUB_REF,'refs/heads/main');
  assert.match(e.GITHUB_SHA??'',/^[a-f0-9]{40}$/);assert.match(e.GITHUB_RUN_ID??'',/^[1-9][0-9]*$/);
  assert.equal(e.GITHUB_RUN_ATTEMPT,'1','Unknown prior write outcome requires readback, never replay');
  assert.equal(e.RAVRADAR_ASSISTANT_LATER_H0_ORIGINAL_OPT_IN,'true');
  assert.equal(e.RAVRADAR_ASSISTANT_LATER_H0_BINDING_CONFIRMATION,'APPLY-WEATHER-MODEL-BINDING');
  for(const key of ['RAVRADAR_CURRENT_GRID_UPGRADE_OPT_IN','RAVRADAR_CURRENT_GRID_DIAGNOSE_ONLY',
    'RAVRADAR_ACCOUNT_ASSISTANT_UPGRADE_OPT_IN','RAVRADAR_CURRENT_MEMORY_WARMUP_UPGRADE_OPT_IN',
    'RAVRADAR_ESTABLISHED_NATIVE_CURRENT_ORIGIN_UPGRADE_OPT_IN','RAVRADAR_NATIVE_ORIGINAL_CONTINUITY_UPGRADE_OPT_IN',
    'RAVRADAR_NATIVE_IDENTITY_RECOVERY_OPT_IN',
    'RESTART_ARCHIVED_WEATHER','PUBLISH_NEWEST_SAVED_WEATHER','CHECKPOINT_ONLY','QUICK_CONFIRMATION'])assert.notEqual(e[key],'true');
  for(const [key,value] of Object.entries(e))if(/PREWRITE_(?:VERIFIED|REQUIRED)$/.test(key))assert.notEqual(value,'true');
  requireAssistantLaterH0Output();return requireAssistantLaterH0Binding();
}
async function source(fresh=false){
  const binding=assertAssistantBindingPrewriteCaller();await readAssistantLaterH0CanonicalSource();
  assert.equal(ravScoreModelBinding().modelBundleSha256,binding.I);
  assert.equal(candidateBinding().modelBundleSha256,binding.C);
  assert.equal((await privateRuntimeContractHashes({repositoryRoot:ROOT})).continuationStateContractSha256,binding.T);
  const git=async args=>(await exec('git',['-C',ROOT,...args],{encoding:'utf8',timeout:30000,maxBuffer:128*1024,
    env:{...process.env,GIT_NO_LAZY_FETCH:'1',GIT_NO_REPLACE_OBJECTS:'1',GIT_TERMINAL_PROMPT:'0',GIT_OPTIONAL_LOCKS:'0'}})).stdout.trim();
  if(fresh)await git(['fetch','--no-tags','origin','+refs/heads/main:refs/remotes/origin/main']);
  assert.equal(await git(['rev-parse','HEAD^{commit}']),process.env.GITHUB_SHA);
  assert.equal(await git(['rev-parse','origin/main^{commit}']),process.env.GITHUB_SHA);
  await git(['diff','--exit-code','HEAD','--','scripts','js','supabase/migrations','.github/workflows']);
}
async function noLinks(file){let at=path.parse(file).root;const parents=[];
  for(const piece of path.relative(at,file).split(path.sep).filter(Boolean)){
    at=path.join(at,piece);const stat=await fs.lstat(at,{bigint:true});assert(!stat.isSymbolicLink());
    if(at!==file){assert(stat.isDirectory());parents.push({file:at,dev:stat.dev,ino:stat.ino});}
  }return parents;
}
const failedCloses=new Map();
// Same descriptor-owned discipline as the authenticated snapshot reader, using
// the NORMAL identity/physical-close helpers; no path-reopened hash/JSON read.
async function ownedRead(file,maximum,collect=false){
  assert(Number.isSafeInteger(maximum)&&maximum>0);
  const absolute=path.resolve(file);assert(!failedCloses.has(absolute),'PREVIOUS_CLOSE_UNPROVED');
  const parents=await noLinks(absolute),before=await fs.lstat(absolute,{bigint:true});
  assert(before.isFile()&&before.nlink===1n&&before.size>0n&&before.size<=BigInt(maximum));
  let handle,fd,identity,first,failed=false,bytes=0;const chunks=[],hash=crypto.createHash('sha256');
  try{
    handle=await fs.open(absolute,'r');fd=handle.fd;identity=ownFileDescriptorIdentity(fd);assert(identity);
    const opened=await handle.stat({bigint:true});
    for(const key of ['dev','ino','size','mtimeNs','ctimeNs'])assert.equal(opened[key],before[key]);
    const buffer=Buffer.allocUnsafe(64*1024);
    for(;;){const row=await handle.read(buffer,0,Math.min(buffer.length,maximum+1-bytes),null);
      assert(Number.isSafeInteger(row.bytesRead)&&row.bytesRead>=0&&row.bytesRead<=buffer.length);
      if(!row.bytesRead)break;bytes+=row.bytesRead;assert(bytes<=maximum);
      const chunk=buffer.subarray(0,row.bytesRead);hash.update(chunk);if(collect)chunks.push(Buffer.from(chunk));
    }
    for(const after of [await handle.stat({bigint:true}),await fs.lstat(absolute,{bigint:true})]){
      assert(after.isFile()&&after.nlink===1n&&!after.isSymbolicLink());
      for(const key of ['dev','ino','size','mtimeNs','ctimeNs'])assert.equal(after[key],before[key]);
    }
    assert.equal(BigInt(bytes),before.size);
    for(const parent of parents){const current=await fs.lstat(parent.file,{bigint:true});
      assert(current.isDirectory()&&!current.isSymbolicLink()&&current.dev===parent.dev&&current.ino===parent.ino);}
  }catch(error){first=error;failed=true;}
  if(handle){
    try{await handle.close();}catch(error){if(!failed){first=error;failed=true;}}
    if(!await ownedFileDescriptorClosed(fd,identity)){
      failedCloses.set(absolute,handle); // Retain own unproved lifetime; never close another fd owner.
      if(!failed){first=new Error('ASSISTANT_BINDING_ORIGINAL_CLOSE_UNPROVED');failed=true;}
    }
  }
  if(failed)throw first;
  return {bytes,sha256:hash.digest('hex'),...(collect?{raw:Buffer.concat(chunks,bytes)}:{})};
}
async function digest(file,maximum){return ownedRead(file,maximum);}
async function boundedJson(file,maximum){const {raw}=await ownedRead(file,maximum,true);assert(raw.length>1);return JSON.parse(raw);}
async function locations(prepare){
  const parent=await fs.realpath(process.env.RUNNER_TEMP);await noLinks(parent);
  const root=path.join(parent,'ravradar-assistant-binding-original-'+process.env.GITHUB_RUN_ID+'-'+process.env.GITHUB_RUN_ATTEMPT);
  assert(!inside(ROOT,root)&&!inside(root,ROOT)&&root!==ROOT);
  if(prepare)await fs.mkdir(root,{mode:0o700}); // Existing target refuses.
  await noLinks(root);const info=await fs.lstat(root);assert(info.isDirectory()&&(info.mode&0o777)===0o700);
  assert.equal(await fs.realpath(root),root);
  const p={root,bundle:path.join(root,'bundle'),originals:path.join(root,'originals'),
    originalS:path.join(root,'original-S.json'),baseline:path.join(root,'baseline.json')};
  // Locations select only the already owned originals, never family authority.
  process.env.RAVRADAR_PRIVATE_RUNTIME_ROOT=root;process.env.RAVRADAR_PRIVATE_RUNTIME_BUNDLE=p.bundle;return p;
}
async function centralProof(){
  const keys=['coastal-parts-v2-activation','direction-reviews','coastline-overrides'];
  const report=await boundedJsonText(path.join(process.env.RUNNER_TEMP,'assistant-binding-admin-sync.json'));
  const lines=report.trim().split(/\r?\n/),last=JSON.parse(lines.at(-1));
  assert.equal(last?.status,'ok');
  const metadata=await boundedJson(path.join(ROOT,'.cache/admin-config-sync.json'),128*1024);
  const result={};for(const key of keys){
    assert.equal(last.sources?.[key],'central','Fresh central registry input required; no tracked-file preservation fallback');
    assert(positive(metadata.documents?.[key]?.version));result[key]=metadata.documents[key];
  }
  return result;
}
function baseline(snapshot,central){
  assert(positive(snapshot.pointerVersion)&&positive(snapshot.checkpointVersion));
  return {kind:'ASSISTANT_BINDING_ORIGINAL_IDENTITY_ONLY',head:process.env.GITHUB_SHA,
    run:process.env.GITHUB_RUN_ID,attempt:1,descriptor:snapshot.descriptor,pointerVersion:snapshot.pointerVersion,
    checkpointVersion:snapshot.checkpointVersion,checkpointIdentity:snapshot.checkpointIdentity,
    registrySha256:sha(JSON.stringify(snapshot.centralContract)),central,manifest:snapshot.verified.manifest};
}
async function originalFiles(p,snapshot){
  await assertRestoredOriginalInventory(p.originals,snapshot.verified.manifest);
  same(await digest(p.originalS,snapshot.checkpointIdentity.bytes),snapshot.checkpointIdentity);
  same(await boundedJson(p.originalS,16*1024*1024),snapshot.checkpoint);
}
async function prepare(p){
  await withAuthenticated586PredecessorSource(async frozenRoot=>{
    const load=file=>import(pathToFileURL(path.join(frozenRoot,file)).href);
    const [b,bundle,workflow,model,s]=await Promise.all([
      load('scripts/protected-private-production-runtime.mjs'),load('scripts/private-production-runtime-bundle.mjs'),
      load('scripts/private-production-runtime-workflow.mjs'),load('js/core/ravscore-model-contract.js'),
      load('scripts/protected-ravscore-continuation-checkpoint.mjs')]);
    const clients=b.createProtectedPrivateRuntimeClients(),selected=await b.describeCurrentProtectedPrivateProductionRuntime({request:clients.documentRequest});
    same(selected.modelBinding,model.ravScoreModelBinding());same(selected.contractHashes,await workflow.privateRuntimeContractHashes({repositoryRoot:frozenRoot}));
    const expected={modelBinding:selected.modelBinding,contractHashes:selected.contractHashes,datasetId:selected.datasetId,
      productionReferenceAt:selected.productionReferenceAt,generatedAt:selected.generatedAt,bundleContentSha256:selected.bundleContentSha256,
      targetReferenceAt:selected.productionReferenceAt,minimumReferenceAt:selected.productionReferenceAt,minimumGeneratedAt:selected.generatedAt};
    const restored=await b.restoreProtectedPrivateProductionRuntime({privateRoot:p.root,bundlePath:p.bundle,repositoryRoot:frozenRoot,
      expected,request:clients.documentRequest,storage:clients.storage});assert.equal(restored.restored,true);assert.equal(restored.rollbackSelected,false);
    await bundle.restorePrivateProductionRuntimeBundle({privateRoot:p.root,bundlePath:p.bundle,repositoryRoot:frozenRoot,expected,
      outputPath:p.originals,targetReferenceAt:selected.productionReferenceAt,minimumReferenceAt:selected.productionReferenceAt,minimumGeneratedAt:selected.generatedAt});
    const saved=await s.restoreProtectedRavScoreContinuationCheckpoint({checkpointPath:p.originalS,targetReference:selected.productionReferenceAt,
      request:s.createProtectedRavScoreCheckpointRequester()});assert.equal(saved.restored,true);
  });
  const handle=await readAuthenticatedFrozen586Predecessor(),snapshot=assertAuthenticatedFrozen586Snapshot(handle);
  await originalFiles(p,snapshot);await assertAuthenticatedFrozen586SnapshotFresh(handle);
  await fs.writeFile(p.baseline,JSON.stringify(baseline(snapshot,await centralProof()))+'\n',{flag:'wx',mode:0o600});
  // Identity comparison only. This file can NEVER replace fresh authentication.
}
async function plan(){
  const migrationListText=await boundedJsonText(path.join(process.env.RUNNER_TEMP,'weather-binding-migrations-plan.txt'));
  const dryRunText=await boundedJsonText(path.join(process.env.RUNNER_TEMP,'weather-binding-migrations-dry-run.txt'));
  const directory=process.env.RAVRADAR_BINDING_MIGRATION_WORKDIR;assert(path.isAbsolute(directory??''));
  const result=await assertAssistantLaterH0MigrationPlan({migrationListText,dryRunText,migrationsDirectory:path.join(directory,'supabase/migrations')});
  same(result.pendingVersions,[assistantLaterH0Migration().version]); // Installed/uncertain outcome is NOT a replay grant.
}
async function boundedJsonText(file){const {raw}=await ownedRead(file,128*1024,true);return raw.toString('utf8');}
async function bank(p,snapshot){
  const file=path.join(p.bundle,'payload/data/live/dmi-forecast-cache.json');
  const descriptor=snapshot.verified.files.find(row=>row.relativePath==='data/live/dmi-forecast-cache.json');assert(descriptor);
  same(await digest(file,descriptor.bytes),{bytes:descriptor.bytes,sha256:descriptor.sha256});
  const index=await inspectDmiForecastFile(file),continuity=index.continuity;assert(continuity);
  const meta=continuity.metadata;assert.equal(meta.schemaVersion,2);assert.equal(meta.partCount,673);
  assert.equal(meta.productionReferenceAt,snapshot.descriptor.productionReferenceAt);assert.equal(continuity.entries.length,673);
  assertDmiPartContinuityTotalSize(meta.rawBytes,meta.compressedBytes);
  const parts=new Map(Object.entries(snapshot.centralContract.zones).flatMap(([zoneId,rows])=>rows.map(part=>[part.partId,{...part,zoneId}])));
  assert.equal(parts.size,673);const seen=new Set();let raw=0,compressed=0,selected=0,lastId=null;
  // This is the sole bank-semantic pass in prepare/plan/verify. One bounded
  // PART at a time, using the normal record reader/unpack and actual inspector.
  for(const entryDescriptor of continuity.entries){
    const entry=await readDmiForecastRecord(index,entryDescriptor),part=parts.get(entry.partId);assert(part&&!seen.has(entry.partId));seen.add(entry.partId);
    assert(lastId===null||entry.partId.localeCompare(lastId)>0);lastId=entry.partId;
    const unpacked=await unpackDmiPartContinuity({...meta,partCount:1,rawBytes:entry.rawBytes,compressedBytes:entry.compressedBytes,entries:[entry]},
      [part],snapshot.descriptor.productionReferenceAt);
    const record=unpacked.get(part.partId);assert(record&&record.nativeCurrentOriginals);
    const original=nativeCurrentOriginalBankForPart({nativeCurrentOriginals:record.nativeCurrentOriginals},part);
    const inspector=createProtectedDmiNativeCurrentInspector({contexts:[],previousBank:original});
    for(const row of record.hourly)if(saved121DirectSelection(row)){
      assert(original,'Required saved native originals are absent, not a code-only fallback');
      assert.equal(inspector.inspect({part,row}).ok,true);selected++;
    }
    raw+=entry.rawBytes;compressed+=entry.compressedBytes;
  }
  assert.equal(seen.size,673);assert.equal(raw,meta.rawBytes);assert.equal(compressed,meta.compressedBytes);
  same(await digest(file,descriptor.bytes),{bytes:descriptor.bytes,sha256:descriptor.sha256});
  return {parts:673,savedHoursPerPart:121,checkedSelectedOriginalRows:selected};
}
async function verify(p){
  await plan();const previous=await boundedJson(p.baseline,256*1024);
  const handle=await readAuthenticatedFrozen586Predecessor(),snapshot=assertAuthenticatedFrozen586Snapshot(handle);
  same(previous,baseline(snapshot,await centralProof()));await originalFiles(p,snapshot);
  const checked=await bank(p,snapshot);await originalFiles(p,snapshot);
  // No full B/S re-authentication or bank replay here: the lexical normal
  // pointer/S-version guard rechecks the authentic handle AFTER the bank pass.
  await source(true);await assertAuthenticatedFrozen586SnapshotFresh(handle);return checked;
}
async function main(){
  assert.equal(process.argv.length,3);assert(['prepare','plan','verify'].includes(process.argv[2]));
  await source();const mode=process.argv[2];
  if(mode==='plan'){await plan();console.log('ASSISTANT_BINDING_EXACT_PLAN_ONLY');return;}
  const p=await locations(mode==='prepare');
  if(mode==='prepare'){await prepare(p);console.log('ASSISTANT_BINDING_ORIGINALS_PRESERVED_NO_ADMISSION');}
  else console.log(JSON.stringify({kind:'ASSISTANT_BINDING_FRESH_ORIGINALS_VERIFIED_NO_ADMISSION',...await verify(p),privatePayloadIncluded:false}));
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))main().catch(()=>{
  console.error('ASSISTANT_BINDING_ORIGINAL_PREWRITE_REFUSED');process.exitCode=1;
});
