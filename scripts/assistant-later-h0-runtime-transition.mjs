// Ordinary strictly-later-H0 working-view controller. NO B/S publication or origin handle.
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import {createReadStream} from 'node:fs';
import path from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {isDeepStrictEqual as equal} from 'node:util';
import {ACTIVE_ASSISTANT_SUCCESSOR as ACTIVE} from './lib/assistant-later-h0-successor-source.mjs';
const {before:OLD,requireBinding:requireActiveAssistantBinding,requireOutput:requireActiveAssistantOutput,
  assertTarget:assertActiveAssistantTarget,assertCaller:assertActiveAssistantCaller}=ACTIVE;
import {withAuthenticated587PredecessorSource,withAuthenticated588PredecessorSource,withAuthenticated590PredecessorSource,withAuthenticated591PredecessorSource,FROZEN591_CODE_SOURCE_PROVENANCE} from './check-assistant-later-h0-predecessor-source.mjs';
import {readAuthenticatedFrozen587Predecessor,assertAuthenticatedFrozen587Snapshot,
  readAuthenticatedFrozen588Predecessor,assertAuthenticatedFrozen588Snapshot,
  readAuthenticatedFrozen590Predecessor,assertAuthenticatedFrozen590Snapshot,
  readAuthenticatedFrozen591Predecessor,assertAuthenticatedFrozen591Snapshot} from './lib/authenticated-frozen586-predecessor.mjs';
import {describeCurrentProtectedPrivateProductionRuntime,describeTargetProtectedPrivateProductionRuntime,createProtectedPrivateRuntimeClients} from './protected-private-production-runtime.mjs';
import {migratePostCutoverPrivateRuntime,assertMetadataOnlyMigrationResult,assertRestoredOriginalInventory,
  assertExactRuntimeInventory,validatePredecessorIdentity} from './migrate-post-cutover-private-runtime.mjs';
import {privateRuntimeContractHashes,installRestoredPrivateRuntime} from './private-production-runtime-workflow.mjs';
import {saveRavScoreContinuationCheckpoint,loadRavScoreContinuationCheckpointForTarget} from './ravscore-continuation-checkpoint.mjs';
import {ravScoreModelBinding} from '../js/core/ravscore-model-contract.js';
import {ravScoreModelBinding as candidateBinding} from './rollback-assets/ravscore-model-contract.js';
import {assertFrozen591CompactRuntimeContracts} from './lib/assistant-public591-runtime-contracts.mjs';
// Ingen caller-/miljøvalgt familie. Begge profiler beholder deres egne opaque handles.
assert(['assistant-public587-successor','assistant-public588-successor','assistant-public590-successor','assistant-public591-successor','assistant-installed593-origin591-successor'].includes(ACTIVE.sourcePhase));
const ACTIVE_PREDECESSOR=['assistant-public591-successor','assistant-installed593-origin591-successor'].includes(ACTIVE.sourcePhase)?Object.freeze({
  withSource:withAuthenticated591PredecessorSource,read:readAuthenticatedFrozen591Predecessor,
  snapshot:assertAuthenticatedFrozen591Snapshot
}):ACTIVE.sourcePhase==='assistant-public590-successor'?Object.freeze({  withSource:withAuthenticated590PredecessorSource,read:readAuthenticatedFrozen590Predecessor,
  snapshot:assertAuthenticatedFrozen590Snapshot
}):ACTIVE.sourcePhase==='assistant-public588-successor'?Object.freeze({
  withSource:withAuthenticated588PredecessorSource,read:readAuthenticatedFrozen588Predecessor,
  snapshot:assertAuthenticatedFrozen588Snapshot
}):Object.freeze({
  withSource:withAuthenticated587PredecessorSource,read:readAuthenticatedFrozen587Predecessor,
  snapshot:assertAuthenticatedFrozen587Snapshot
});
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),CP='.cache/ravscore-continuation-checkpoint/checkpoint.json';
const sha=v=>crypto.createHash('sha256').update(v).digest('hex');
const same=(a,b,label)=>assert(equal(a,b),label);
// Pure comparison only: the normal frozen reader authenticates the original
// descriptor before this assertion; this export creates no admission/handle.
export function assertAssistantOriginalRuntimeContracts(previous,current){
  assert.equal(arguments.length,2);
  const next=requireActiveAssistantBinding();
  if((ACTIVE.sourcePhase==='assistant-public591-successor'&&ACTIVE.requireRelease()==='4.0.593')
    ||ACTIVE.sourcePhase==='assistant-installed593-origin591-successor'){
    // Whole-file reviewed delta: only copy-public-delivery-shards gains the
    // compact share copy. Persisted ABI, original values and all downstream
    // metadata-only/inverse checks remain mandatory. No blanket projection skip.
    assert.equal(previous?.continuationStateContractSha256,OLD.T);
    assert.equal(current?.continuationStateContractSha256,next.T);
    return assertFrozen591CompactRuntimeContracts(previous,current);
  }
  same({...previous,continuationStateContractSha256:next.T},current,
    'Only T changes in existing runtime-storage/public projection contracts');
  return true;
}
const json=async p=>JSON.parse(await fs.readFile(p,'utf8'));
async function noLinks(file){let at=path.parse(file).root;
  for(const p of path.relative(at,file).split(path.sep).filter(Boolean)){at=path.join(at,p);assert(!(await fs.lstat(at)).isSymbolicLink());}}
async function absent(file){try{await fs.lstat(file);return false;}catch(e){if(e.code==='ENOENT')return true;throw e;}}
function paths(){
  const privateRoot=process.env.RAVRADAR_PRIVATE_RUNTIME_ROOT,bundlePath=process.env.RAVRADAR_PRIVATE_RUNTIME_BUNDLE;
  assert(path.isAbsolute(privateRoot??'')&&path.isAbsolute(bundlePath??'')&&path.dirname(bundlePath)===privateRoot);
  const rel=path.relative(ROOT,privateRoot);assert(rel==='..'||rel.startsWith('..'+path.sep)||path.isAbsolute(rel));
  return {privateRoot,bundlePath,sourceRoot:path.join(privateRoot,'assistant587-original'),
    workRoot:path.join(privateRoot,'assistant587-working'),originalSPath:path.join(privateRoot,CP),descriptorPath:path.join(privateRoot,'assistant587-original-descriptor.json')};
}
async function inventory(root){const rows=[];
  for(const file of await assertExactRuntimeInventory(root)){
    const hash=crypto.createHash('sha256');let bytes=0;
    for await(const chunk of createReadStream(path.join(root,file.relativePath))){hash.update(chunk);bytes+=chunk.length;}
    rows.push({...file,bytes,sha256:hash.digest('hex')});
  }return rows;
}
const identityKeys=['sourceHead','datasetId','productionReferenceAt','generatedAt','bundleContentSha256','modelBinding','contractHashes'];
function sameIdentity(a,b){for(const key of identityKeys)same(a[key],b[key],'Same authenticated original identity: '+key);}
function targetHour(){const text=process.env.RAVRADAR_PRODUCTION_TARGET_HOUR;assert.equal(typeof text,'string');
  const time=Date.parse(text);assert(Number.isFinite(time)&&time%3600000===0);return new Date(time).toISOString();}

function checkpointInverse(original,prepared,next){
  const inverse=structuredClone(prepared);
  assert.equal(inverse.modelBinding.modelBundleSha256,next.I);
  assert.equal(inverse.candidateGRollbackCompanion.modelBinding.modelBundleSha256,next.C);
  assert.equal(inverse.continuationStateContractSha256,next.T);
  inverse.modelBinding.modelBundleSha256=original.modelBinding.modelBundleSha256;
  inverse.candidateGRollbackCompanion.modelBinding.modelBundleSha256=original.candidateGRollbackCompanion.modelBinding.modelBundleSha256;
  inverse.continuationStateContractSha256=original.continuationStateContractSha256;
  same(Object.keys(inverse.states).sort(),Object.keys(original.states).sort(),'All old S part keys');
  for(const [id,state] of Object.entries(inverse.states)){
    assert.equal(state.modelBundleSha256,next.I);state.modelBundleSha256=original.states[id].modelBundleSha256;
  }
  // Normal S derives these digests from metadata. NO other scalar/array/key is omitted.
  for(const key of ['generationSha256','stateSha256'])inverse[key]=original[key];
  inverse.candidateGRollbackCompanion.generationSha256=original.candidateGRollbackCompanion.generationSha256;
  same(inverse,original,'Whole S inverse including every value/history/unknown field');
}
async function projectOriginal(p,snapshot,frozenRoot,outputRoot,reportPath,checkpointPath){
  const next=requireActiveAssistantBinding(),contracts=await privateRuntimeContractHashes();
  assert.equal(ravScoreModelBinding().modelBundleSha256,next.I);
  assert.equal(candidateBinding().modelBundleSha256,next.C);
  assert.equal(contracts.continuationStateContractSha256,next.T);
  assertAssistantOriginalRuntimeContracts(snapshot.descriptor.contractHashes,contracts);
  await assertRestoredOriginalInventory(p.sourceRoot,snapshot.verified.manifest);
  const originalSRaw=await fs.readFile(p.originalSPath);
  same({bytes:originalSRaw.length,sha256:sha(originalSRaw)},snapshot.checkpointIdentity,'Actual normal restored original S bytes');
  same(JSON.parse(originalSRaw),snapshot.checkpoint,'Whole retained genuine original S');
  const report=await migratePostCutoverPrivateRuntime({sourceRoot:p.sourceRoot,outputRoot,
    bundleManifestPath:path.join(p.bundlePath,'manifest.json'),predecessorDescriptorPath:p.descriptorPath,
    predecessorRoot:frozenRoot,repositoryRoot:ROOT,expectedSourceHead:snapshot.descriptor.sourceHead,
    reportPath,metadataOnly:true});
  assertMetadataOnlyMigrationResult(report);
  const original=await json(snapshot.conditionsPath),prepared=await json(path.join(outputRoot,'data/live/conditions.json'));
  same(prepared.privateEstablishedNativeCurrentOrigin,snapshot.attestation,'WHOLE old attestation remains unchanged');
  same(original.privateEstablishedNativeCurrentOrigin,snapshot.attestation,'Actual original parent retained');
  // Normal migration has already validated its exact FULL conditions diff,
  // normal hourly/public-pack rebind and exact unchanged other-file inventory.
  await saveRavScoreContinuationCheckpoint({sourcePath:path.join(outputRoot,'data/live/conditions.json'),checkpointPath});
  const checkpoint=await json(checkpointPath);checkpointInverse(snapshot.checkpoint,checkpoint,next);
  await assertRestoredOriginalInventory(p.sourceRoot,snapshot.verified.manifest);
  return {checkpoint,report,conditions:prepared};
}
export async function selectAssistantLaterH0Source(){
  assert.equal(arguments.length,0);requireActiveAssistantOutput();
  assert.equal(ravScoreModelBinding().modelBundleSha256,requireActiveAssistantBinding().I);
  const descriptor=await json(path.join(process.env.RUNNER_TEMP,'private-runtime-current-source.json'));
  if(descriptor?.modelBinding?.modelBundleSha256!==OLD.I||ravScoreModelBinding().modelBundleSha256===OLD.I)return false;
  requireActiveAssistantOutput();assertActiveAssistantCaller(process.env);
  assertActiveAssistantTarget(descriptor,targetHour());return true;
}
export async function prepareAssistantLaterH0Runtime(){
  assert.equal(arguments.length,0);requireActiveAssistantOutput();assertActiveAssistantCaller(process.env);
  const p=paths(),target=targetHour();
  const clients=createProtectedPrivateRuntimeClients();
  const selected=await describeCurrentProtectedPrivateProductionRuntime({request:clients.documentRequest});
  assertActiveAssistantTarget(selected,target);
  await noLinks(p.privateRoot);assert(await absent(p.bundlePath)&&await absent(p.sourceRoot)&&await absent(p.workRoot)
    &&await absent(p.originalSPath)&&await absent(p.descriptorPath));
  await ACTIVE_PREDECESSOR.withSource(async frozenRoot=>{
    const load=file=>import(pathToFileURL(path.join(frozenRoot,file)).href);
    const old=await load('scripts/protected-private-production-runtime.mjs'),bundle=await load('scripts/private-production-runtime-bundle.mjs');
    const oldWorkflow=await load('scripts/private-production-runtime-workflow.mjs'),oldModel=await load('js/core/ravscore-model-contract.js');
    same(selected.modelBinding,oldModel.ravScoreModelBinding(),'Actual old model');
    same(selected.contractHashes,await oldWorkflow.privateRuntimeContractHashes({repositoryRoot:frozenRoot}),'Actual old contracts');
    const expected={modelBinding:selected.modelBinding,contractHashes:selected.contractHashes,datasetId:selected.datasetId,
      productionReferenceAt:selected.productionReferenceAt,generatedAt:selected.generatedAt,bundleContentSha256:selected.bundleContentSha256,
      targetReferenceAt:target,minimumReferenceAt:selected.productionReferenceAt,minimumGeneratedAt:selected.generatedAt};
    const restored=await old.restoreProtectedPrivateProductionRuntime({privateRoot:p.privateRoot,bundlePath:p.bundlePath,
      repositoryRoot:frozenRoot,expected,request:clients.documentRequest,storage:clients.storage});
    assert.equal(restored.restored,true);assert.equal(restored.rollbackSelected,false);
    await bundle.restorePrivateProductionRuntimeBundle({privateRoot:p.privateRoot,bundlePath:p.bundlePath,
      repositoryRoot:frozenRoot,expected,outputPath:p.sourceRoot,targetReferenceAt:target,
      minimumReferenceAt:selected.productionReferenceAt,minimumGeneratedAt:selected.generatedAt});
    const oldProtectedS=await load('scripts/protected-ravscore-continuation-checkpoint.mjs');
    const originalSRestore=await oldProtectedS.restoreProtectedRavScoreContinuationCheckpoint({checkpointPath:p.originalSPath,
      targetReference:selected.productionReferenceAt,request:oldProtectedS.createProtectedRavScoreCheckpointRequester()});
    assert.equal(originalSRestore.restored,true,'Actual old normal protected S restore, no reconstruction receipt');
    const handle=await ACTIVE_PREDECESSOR.read(),snapshot=ACTIVE_PREDECESSOR.snapshot(handle);
    sameIdentity(snapshot.descriptor,selected);
    const targetDescriptor=await describeTargetProtectedPrivateProductionRuntime({request:clients.documentRequest,
      targetReferenceAt:selected.productionReferenceAt,datasetId:selected.datasetId,bundleContentSha256:selected.bundleContentSha256});
    sameIdentity(targetDescriptor,snapshot.descriptor);validatePredecessorIdentity(targetDescriptor,selected.sourceHead);
    await fs.writeFile(p.descriptorPath,JSON.stringify(targetDescriptor)+'\n',{flag:'wx',mode:0o600});
    const checkpointPath=path.join(p.privateRoot,'assistant587-working-checkpoint.json');
    const result=await projectOriginal(p,snapshot,frozenRoot,p.workRoot,path.join(p.privateRoot,'assistant587-working-report.json'),checkpointPath);
    const loaded=await loadRavScoreContinuationCheckpointForTarget({checkpointPath,targetReference:target});
    assert.equal(loaded.loaded,true);
    same(await describeCurrentProtectedPrivateProductionRuntime({request:clients.documentRequest}),selected,'Pointer unchanged after preparation');
  });
  return {prepared:true,admission:'NO_ADMISSION',sameH0Capability:false,originalsPreserved:true};
}
async function readWorking(targetReferenceAt,installing){
  requireActiveAssistantOutput();assertActiveAssistantCaller(process.env);
  const p=paths(),handle=await ACTIVE_PREDECESSOR.read(),snapshot=ACTIVE_PREDECESSOR.snapshot(handle);
  assertActiveAssistantTarget(snapshot.descriptor,targetReferenceAt);
  const descriptorBytes=await fs.readFile(p.descriptorPath);const retainedDescriptor=validatePredecessorIdentity(JSON.parse(descriptorBytes),snapshot.descriptor.sourceHead);
  sameIdentity(retainedDescriptor,snapshot.descriptor);
  const parent=await fs.realpath(p.privateRoot),work=await fs.mkdtemp(path.join(parent,'assistant587-reproject-'));
  // Retain private scratch on an unknown failure. No recursive guessed cleanup.
  const firstInventory=await inventory(p.workRoot);
  const result=await ACTIVE_PREDECESSOR.withSource(async frozenRoot=>{
    const projected=path.join(work,'runtime'),checkpointPath=path.join(work,'checkpoint.json');
    const result=await projectOriginal(p,snapshot,frozenRoot,projected,path.join(work,'report.json'),checkpointPath);
    same(await inventory(projected),firstInventory,'Whole normal migration reproduction, ALL runtime bytes');
    if(installing){
      const destination=path.join(ROOT,CP);assert(await absent(destination),'No checkpoint/cache overwrite');
      await installRestoredPrivateRuntime({restoredRoot:p.workRoot,repositoryRoot:ROOT});
      await fs.mkdir(path.dirname(destination),{recursive:true});
      await fs.writeFile(destination,await fs.readFile(checkpointPath),{flag:'wx',mode:0o600});
    }
    same(await json(path.join(ROOT,CP)),result.checkpoint,'Prepared local S and fresh B projection parity');
    same(await json(path.join(ROOT,'data/live/conditions.json')),result.conditions,'Actual pre-provider working conditions');
    return result;
  });
  const conditionsPath=path.join(p.workRoot,'data/live/conditions.json'),bytes=await fs.readFile(conditionsPath);
  const verify=async()=>{
    same(await inventory(p.workRoot),firstInventory,'Prepared full runtime unchanged');
    same(await fs.readFile(p.descriptorPath),descriptorBytes,'Original descriptor unchanged');
    const fresh=ACTIVE_PREDECESSOR.snapshot(await ACTIVE_PREDECESSOR.read());
    same(fresh,snapshot,'Fresh authenticated original B/S/source unchanged');
    return snapshot.verified;
  };
  // Retention protects the ORIGINAL B bytes, separately from the migrated
  // working conditions used to derive the actual installed working S.
  const originalBytes=await fs.readFile(snapshot.conditionsPath),originalConditionsSha256=sha(originalBytes);
  const originalEntry=snapshot.verified.files.find(row=>row.relativePath==='data/live/conditions.json');
  assert(originalEntry,'Original B conditions inventory');
  same({bytes:originalBytes.length,sha256:originalConditionsSha256},
    {bytes:originalEntry.bytes,sha256:originalEntry.sha256},'Original B conditions bytes');
  await verify();
  return {verified:snapshot.verified,conditions:result.conditions,originalConditions:JSON.parse(originalBytes),
    originalConditionsSha256,conditionsPath,conditionsSha256:sha(bytes),verify};
}
export async function readAssistantLaterH0RetentionInput(targetReferenceAt){
  assert.equal(arguments.length,1);return readWorking(targetReferenceAt,false);
}
export async function installAssistantLaterH0Runtime(){
  assert.equal(arguments.length,0);requireActiveAssistantOutput();await readWorking(targetHour(),true);
  return {installedWorkingView:true,admission:'NO_ADMISSION',originalsPreserved:true,sameH0Capability:false};
}
async function main(){
  assert.equal(process.argv.length,3);
  if(process.argv[2]==='select')await fs.appendFile(process.env.GITHUB_OUTPUT,'required='+await selectAssistantLaterH0Source()+'\n');
  else if(process.argv[2]==='prepare')console.log(JSON.stringify(await prepareAssistantLaterH0Runtime()));
  else {assert.equal(process.argv[2],'install');console.log(JSON.stringify(await installAssistantLaterH0Runtime()));}
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))await main();
