// Normal original-bound local S/B metadata preparation, never an installer.
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import {createReadStream} from 'node:fs';
import path from 'node:path';
import {isDeepStrictEqual} from 'node:util';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {withCurrentMemoryWarmupPredecessorSource} from './check-current-memory-warmup-predecessor-source.mjs';
import {CURRENT_MEMORY_WARMUP_BEFORE as OLD,requireCurrentMemoryWarmupBinding} from './lib/current-memory-warmup-successor-source.mjs';
import {ravScoreModelBinding as integratedBinding} from '../js/core/ravscore-model-contract.js';
import {ravScoreModelBinding as candidateBinding} from './rollback-assets/ravscore-model-contract.js';
import {privateRuntimeContractHashes} from './private-production-runtime-workflow.mjs';
import {loadRavScoreContinuationCheckpointForTarget,saveRavScoreContinuationCheckpoint} from './ravscore-continuation-checkpoint.mjs';
import {migratePostCutoverPrivateRuntime,assertMetadataOnlyMigrationResult,assertRestoredOriginalInventory,assertExactRuntimeInventory,validatePredecessorIdentity}
  from './migrate-post-cutover-private-runtime.mjs';
import {describeCurrentProtectedPrivateProductionRuntime,describeTargetProtectedPrivateProductionRuntime}
  from './protected-private-production-runtime.mjs';

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const CHECKPOINT=path.join('.cache','ravscore-continuation-checkpoint','checkpoint.json');
const contexts=new WeakMap();
const sha=v=>crypto.createHash('sha256').update(v).digest('hex');
const same=(a,b,label)=>assert(isDeepStrictEqual(a,b),label);
const json=async p=>JSON.parse(await fs.readFile(p,'utf8'));
async function fileDigest(file){const hash=crypto.createHash('sha256');let bytes=0;
  for await(const chunk of createReadStream(file)){hash.update(chunk);bytes+=chunk.length;}return {bytes,sha256:hash.digest('hex')};}
async function preparedInventory(root){const inventory=await assertExactRuntimeInventory(root),rows=[];
  for(const item of inventory)rows.push({relativePath:item.relativePath,...await fileDigest(path.join(root,item.relativePath))});return rows;}
function hour(v){assert.equal(typeof v,'string');assert.match(v,/^\d{4}-\d{2}-\d{2}T\d{2}:00:00\.000Z$/);assert.equal(new Date(v).toISOString(),v);return v;}
function inside(root,file){const r=path.relative(root,file);return r&&r!=='..'&&!r.startsWith('..'+path.sep)&&!path.isAbsolute(r);}
async function noLinks(file){let at=path.parse(file).root;for(const p of path.relative(at,file).split(path.sep).filter(Boolean)){
  at=path.join(at,p);assert(!(await fs.lstat(at)).isSymbolicLink(),'No symbolic-link path components');}}
async function absent(file){try{await fs.lstat(file);return false;}catch(e){if(e.code==='ENOENT')return true;throw e;}}
function equalExceptMetadata(original,prepared){
  // Complete inverse of the ONLY allowed S metadata changes. Never replace a
  // bare hash recursively, infer a missing field or discard an unknown field.
  const inverse=structuredClone(prepared);
  const next=requireCurrentMemoryWarmupBinding();
  assert.equal(inverse.modelBinding.modelBundleSha256,next.I);
  assert.equal(inverse.candidateGRollbackCompanion.modelBinding.modelBundleSha256,next.C);
  assert.equal(inverse.continuationStateContractSha256,next.T);
  inverse.modelBinding.modelBundleSha256=original.modelBinding.modelBundleSha256;
  inverse.candidateGRollbackCompanion.modelBinding.modelBundleSha256=original.candidateGRollbackCompanion.modelBinding.modelBundleSha256;
  inverse.continuationStateContractSha256=original.continuationStateContractSha256;
  same(Object.keys(inverse.states).sort(),Object.keys(original.states).sort(),'Same673 S identities');
  for(const [id,state] of Object.entries(inverse.states)){
    assert.equal(state.modelBundleSha256,next.I);state.modelBundleSha256=original.states[id].modelBundleSha256;
  }
  for(const key of ['generationSha256','stateSha256'])inverse[key]=original[key];
  inverse.candidateGRollbackCompanion.generationSha256=original.candidateGRollbackCompanion.generationSha256;
  same(inverse,original,'S whole inverse: every non-metadata value, array, field and original history unchanged');
}
async function readIdentity({request,identity}){
  const current=await describeCurrentProtectedPrivateProductionRuntime({request});
  const target=await describeTargetProtectedPrivateProductionRuntime({request,targetReferenceAt:identity.productionReferenceAt,
    datasetId:identity.datasetId,bundleContentSha256:identity.bundleContentSha256});
  same(target,identity,'Actual target B pointer matches restored descriptor');
  const {kind:currentKind,...currentRest}=current,{kind:targetKind,...targetRest}=target;
  assert.equal(currentKind,'RAVRADAR_PRIVATE_PRODUCTION_RUNTIME_CURRENT_SOURCE');
  assert.equal(targetKind,'RAVRADAR_PRIVATE_PRODUCTION_RUNTIME_TARGET_SOURCE');
  same(currentRest,targetRest,'Selected B is genuinely CURRENT, not an arbitrary older target');return current;
}
// Normal protected admission BEFORE the new ordinary restore sees any old S/B.
// Only existing request/storage interfaces and one owned work directory; no
// supplied descriptor, validator, producer head, repository or binding override.
export async function restoreAndPrepareCurrentMemoryWarmupRuntimeTransition(options){
  requireCurrentMemoryWarmupBinding();
  assert.equal(arguments.length,1);assert(options&&Object.getPrototypeOf(options)===Object.prototype);
  assert.deepEqual(Object.keys(options).sort(),['checkpointRequest','request','storage','targetReferenceAt','workdir']);
  const {request,checkpointRequest,storage}=options,targetReferenceAt=hour(options.targetReferenceAt);
  const workdir=path.resolve(options.workdir);assert(workdir!==ROOT&&!inside(ROOT,workdir));
  assert(await absent(workdir));await noLinks(path.dirname(workdir));
  const selected=await describeCurrentProtectedPrivateProductionRuntime({request});
  assert.equal(selected.modelBinding.modelBundleSha256,OLD.integrated);
  assert.equal(selected.contractHashes.continuationStateContractSha256,OLD.continuation);
  assert(Date.parse(targetReferenceAt)>=Date.parse(hour(selected.productionReferenceAt)));
  return withCurrentMemoryWarmupPredecessorSource(async frozenRoot=>{
    const load=p=>import(pathToFileURL(path.join(frozenRoot,p)).href);
    const [protectedB,bundle,workflow,model]=await Promise.all([
      load('scripts/protected-private-production-runtime.mjs'),load('scripts/private-production-runtime-bundle.mjs'),
      load('scripts/private-production-runtime-workflow.mjs'),load('js/core/ravscore-model-contract.js')]);
    const oldContracts=await workflow.privateRuntimeContractHashes({repositoryRoot:frozenRoot});
    same(oldContracts,selected.contractHashes,'Actual old protected contracts');
    same(model.ravScoreModelBinding(),selected.modelBinding,'Actual old protected model');
    await fs.mkdir(workdir,{recursive:false});
    const privateRoot=path.join(workdir,'original-private');await fs.mkdir(privateRoot);
    const bundlePath=path.join(privateRoot,'bundle'),sourceRoot=path.join(privateRoot,'restored');
    const expected={modelBinding:selected.modelBinding,contractHashes:selected.contractHashes,
      datasetId:selected.datasetId,productionReferenceAt:selected.productionReferenceAt,
      bundleContentSha256:selected.bundleContentSha256,targetReferenceAt,
      minimumReferenceAt:selected.productionReferenceAt,minimumGeneratedAt:selected.generatedAt};
    const original=await protectedB.restoreProtectedPrivateProductionRuntime({privateRoot,bundlePath,repositoryRoot:frozenRoot,expected,request,storage});
    assert.equal(original.restored,true);assert.equal(original.rollbackSelected,false,'No previous/older source fallback');
    assert.equal(original.bundleContentSha256,selected.bundleContentSha256);assert.equal(original.productionReferenceAt,selected.productionReferenceAt);
    await bundle.restorePrivateProductionRuntimeBundle({privateRoot,bundlePath,repositoryRoot:frozenRoot,expected,
      outputPath:sourceRoot,targetReferenceAt,minimumReferenceAt:selected.productionReferenceAt,minimumGeneratedAt:selected.generatedAt});
    const identity=await describeTargetProtectedPrivateProductionRuntime({request,targetReferenceAt:selected.productionReferenceAt,
      datasetId:selected.datasetId,bundleContentSha256:selected.bundleContentSha256});
    const {kind:_kind,...body}=identity,{kind:_currentKind,...selectedBody}=selected;same(body,selectedBody,'First protected source observation retained');
    const predecessorDescriptorPath=path.join(privateRoot,'target-description.json');
    await fs.writeFile(predecessorDescriptorPath,JSON.stringify(identity)+'\n',{flag:'wx',mode:0o600});
    return prepareCurrentMemoryWarmupRuntimeTransition({sourceRoot,bundleManifestPath:path.join(bundlePath,'manifest.json'),
      predecessorDescriptorPath,workdir:path.join(workdir,'metadata'),targetReferenceAt,request,checkpointRequest});
  });
}
export async function prepareCurrentMemoryWarmupRuntimeTransition(options){
  const next=requireCurrentMemoryWarmupBinding(); // before any I/O or clients
  assert.equal(arguments.length,1);assert(options&&Object.getPrototypeOf(options)===Object.prototype);
  assert.deepEqual(Object.keys(options).sort(),['bundleManifestPath','checkpointRequest','predecessorDescriptorPath','request','sourceRoot','targetReferenceAt','workdir']);
  const {request,checkpointRequest}=options;
  assert.equal(typeof request,'function');assert.equal(typeof checkpointRequest,'function');
  const targetReferenceAt=hour(options.targetReferenceAt);
  const currentI=integratedBinding(),currentC=candidateBinding(),contracts=await privateRuntimeContractHashes();
  assert.equal(currentI.modelBundleSha256,next.I);assert.equal(currentC.modelBundleSha256,next.C);
  assert.equal(contracts.continuationStateContractSha256,next.T);
  const sourceRoot=await fs.realpath(options.sourceRoot),bundleManifestPath=path.resolve(options.bundleManifestPath);
  assert(sourceRoot!==ROOT&&!inside(ROOT,sourceRoot),'Original runtime remains outside repository');
  await noLinks(sourceRoot);await noLinks(bundleManifestPath);await noLinks(path.resolve(options.predecessorDescriptorPath));
  const manifest=await json(bundleManifestPath),descriptorBytes=await fs.readFile(options.predecessorDescriptorPath);
  const descriptor=JSON.parse(descriptorBytes);
  const identity=validatePredecessorIdentity(descriptor,descriptor.sourceHead);
  assert.equal(identity.modelBinding.modelBundleSha256,OLD.integrated);
  assert.equal(identity.contractHashes.continuationStateContractSha256,OLD.continuation);
  same({...identity.modelBinding,modelBundleSha256:next.I},currentI,'Exact unchanged old/new physical model contract');
  assert(Date.parse(targetReferenceAt)>=Date.parse(hour(identity.productionReferenceAt)),'No target regression');
  const workdir=path.resolve(options.workdir);assert(inside(path.parse(workdir).root,workdir));
  assert(!inside(ROOT,workdir)&&workdir!==ROOT&&!inside(sourceRoot,workdir)&&!inside(workdir,sourceRoot));
  assert(await absent(workdir),'New exclusive working directory required');await noLinks(path.dirname(workdir));
  const selected=await readIdentity({request,identity}); // BEFORE creating working output
  return withCurrentMemoryWarmupPredecessorSource(async frozenRoot=>{
    const load=p=>import(pathToFileURL(path.join(frozenRoot,p)).href);
    const [oldB,oldS,oldProtectedS,oldI,oldC,oldWorkflow]=await Promise.all([
      load('scripts/private-production-runtime-bundle.mjs'),load('scripts/ravscore-continuation-checkpoint.mjs'),
      load('scripts/protected-ravscore-continuation-checkpoint.mjs'),load('js/core/ravscore-model-contract.js'),
      load('scripts/rollback-assets/ravscore-model-contract.js'),load('scripts/private-production-runtime-workflow.mjs')]);
    assert.equal(oldI.ravScoreModelBinding().modelBundleSha256,OLD.integrated);
    assert.equal(oldC.ravScoreModelBinding().modelBundleSha256,OLD.candidate);
    const oldContracts=await oldWorkflow.privateRuntimeContractHashes({repositoryRoot:frozenRoot});
    assert.equal(oldContracts.continuationStateContractSha256,OLD.continuation);
    same(identity.contractHashes,oldContracts,'Actual whole predecessor runtime contracts');
    same({...oldContracts,continuationStateContractSha256:next.T},contracts,'Only continuation binding changes');
    const bundlePath=path.dirname(bundleManifestPath),privateRoot=path.dirname(bundlePath);
    const expected={modelBinding:identity.modelBinding,contractHashes:identity.contractHashes,datasetId:identity.datasetId,
      productionReferenceAt:identity.productionReferenceAt,bundleContentSha256:identity.bundleContentSha256};
    await oldB.verifyPrivateProductionRuntimeBundle({privateRoot,bundlePath,repositoryRoot:frozenRoot,expected});
    await assertRestoredOriginalInventory(sourceRoot,manifest); // all original B bytes, not a report
    await fs.mkdir(workdir,{recursive:false});
    const originalSPath=path.join(workdir,'original-native0600',CHECKPOINT),outputRoot=path.join(workdir,'runtime');
    const checkpointPath=path.join(workdir,'prepared',CHECKPOINT),reportPath=path.join(workdir,'normal-b-metadata-report.json');
    // Real old normal protected restore, including unchanged original digests
    // and the reviewed JSONB transport-order reconstruction. No new core guard.
    const restored=await oldProtectedS.restoreProtectedRavScoreContinuationCheckpoint({checkpointPath:originalSPath,targetReference:targetReferenceAt,request:checkpointRequest});
    assert.equal(restored.restored,true,'A genuine old protected S is required');
    const originalSBytes=await fs.readFile(originalSPath),originalS=JSON.parse(originalSBytes);
    assert.equal(originalS.modelBinding.modelBundleSha256,OLD.integrated);
    assert.equal(originalS.candidateGRollbackCompanion.modelBinding.modelBundleSha256,OLD.candidate);
    assert.equal(originalS.continuationStateContractSha256,OLD.continuation);
    assert.equal(originalS.datasetId,identity.datasetId);assert.equal(originalS.productionReferenceAt,identity.productionReferenceAt);
    const originalBCheckpoint=path.join(workdir,'b-original-checkpoint.json');
    await oldS.saveRavScoreContinuationCheckpoint({sourcePath:path.join(sourceRoot,'data/live/conditions.json'),
      checkpointPath:originalBCheckpoint,repositoryRoot:frozenRoot});
    same(await json(originalBCheckpoint),originalS,'Genuine old normal B-producer/S parity, including all original digests');
    const oldLoaded=await oldS.loadRavScoreContinuationCheckpointForTarget({checkpointPath:originalSPath,targetReference:targetReferenceAt,repositoryRoot:frozenRoot});
    assert.equal(oldLoaded.loaded,true);
    const report=await migratePostCutoverPrivateRuntime({sourceRoot,outputRoot,bundleManifestPath,
      predecessorDescriptorPath:options.predecessorDescriptorPath,predecessorRoot:frozenRoot,repositoryRoot:ROOT,
      expectedSourceHead:identity.sourceHead,reportPath,metadataOnly:true});
    assertMetadataOnlyMigrationResult(report);
    await saveRavScoreContinuationCheckpoint({sourcePath:path.join(outputRoot,'data/live/conditions.json'),checkpointPath});
    const prepared=await json(checkpointPath);equalExceptMetadata(originalS,prepared);
    const loaded=await loadRavScoreContinuationCheckpointForTarget({checkpointPath,targetReference:targetReferenceAt});
    assert.equal(loaded.loaded,true);assert.equal(loaded.modelBundleSha256,next.I);
    assert.equal(loaded.continuationStateContractSha256,next.T);
    assert.equal(loaded.continuationAvailable,oldLoaded.continuationAvailable);assert.equal(loaded.ageHours,oldLoaded.ageHours);
    await assertRestoredOriginalInventory(sourceRoot,manifest);
    same(await fs.readFile(originalSPath),originalSBytes,'Retained genuine S original bytes');
    same(await fs.readFile(options.predecessorDescriptorPath),descriptorBytes,'Retained original descriptor');
    same(await readIdentity({request,identity}),selected,'B source TOCTOU guard');
    // Re-read S through the SAME old validator. A changed/newer/current S cannot
    // be silently paired with an earlier B or replaced by a matching receipt.
    const rereadPath=path.join(workdir,'rechecked-native0600',CHECKPOINT);
    await oldProtectedS.restoreProtectedRavScoreContinuationCheckpoint({checkpointPath:rereadPath,targetReference:targetReferenceAt,request:checkpointRequest});
    same(await json(rereadPath),originalS,'S source TOCTOU guard');
    const token=Object.freeze({kind:'CURRENT_MEMORY_WARMUP_NATIVE0600_PREPARED_RUNTIME',admission:'NO_ADMISSION',
      originalReferenceAt:identity.productionReferenceAt,targetReferenceAt,partCount:673,
      numericalChanges:0,repairedContinuationCount:0,recomputedModeCount:0,recomputedZoneCount:0,
      originalBContentSha256:identity.bundleContentSha256,originalSFileSha256:sha(originalSBytes),
      preparedSFileSha256:sha(await fs.readFile(checkpointPath)),outputRoot,checkpointPath,
      originalCheckpointPath:originalSPath,normalBReportPath:reportPath,installationPerformed:false,privatePayloadIncluded:false});
    contexts.set(token,{workdir,identity,selected,originalSBytes,sourceRoot,manifest,checkpointPath,originalSPath,request,checkpointRequest,
      preparedFiles:await preparedInventory(outputRoot)});
    return token;
  });
}
export async function assertCurrentMemoryWarmupRuntimeTransitionPrepared(token){
  assert.equal(arguments.length,1);const value=contexts.get(token);assert(value,'Only this actual normal preparation, never a serialized receipt');
  await assertRestoredOriginalInventory(value.sourceRoot,value.manifest);
  same(await preparedInventory(token.outputRoot),value.preparedFiles,'All actual prepared B bytes preserved until handoff');
  same(await fs.readFile(value.originalSPath),value.originalSBytes,'Retained original S');
  const loaded=await loadRavScoreContinuationCheckpointForTarget({checkpointPath:value.checkpointPath,targetReference:token.targetReferenceAt});
  assert.equal(loaded.loaded,true);assert.equal(sha(await fs.readFile(value.checkpointPath)),token.preparedSFileSha256);
  same(await readIdentity({request:value.request,identity:value.identity}),value.selected,'Fresh B prewrite source');
  await withCurrentMemoryWarmupPredecessorSource(async root=>{
    const old=await import(pathToFileURL(path.join(root,'scripts/protected-ravscore-continuation-checkpoint.mjs')).href);
    const checkpointPath=path.join(value.workdir,'rechecked-native0600',CHECKPOINT);
    await old.restoreProtectedRavScoreContinuationCheckpoint({checkpointPath,targetReference:token.targetReferenceAt,request:value.checkpointRequest});
    same(await json(checkpointPath),JSON.parse(value.originalSBytes),'Fresh S prewrite source');
  });
  return token;
}
