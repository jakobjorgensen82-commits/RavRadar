// Normal authenticated585 -> SAME_H0 local metadata preparation, never an installer.
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import {createReadStream} from 'node:fs';
import path from 'node:path';
import {isDeepStrictEqual} from 'node:util';
import {writeBoundedJsonAtomic} from './lib/bounded-json-writer.mjs';
import {buildEstablishedNativeCurrent585MetadataAttestation}
  from './lib/established-native-current-origin.mjs';
import {readAuthenticatedFrozen585Predecessor,assertAuthenticatedFrozen585Snapshot}
  from './lib/authenticated-frozen585-predecessor.mjs';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {withAuthenticated585PredecessorSource} from './check-native-original-continuity-predecessor-source.mjs';
import {NATIVE_ORIGINAL_CONTINUITY_BEFORE as OLD,requireNativeOriginalContinuityBinding,requireNativeOriginalContinuityOutput} from './lib/native-original-continuity-successor-source.mjs';
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
function combinedMetadataOriginReport(original,conditionsDigest){
  same(Object.keys(conditionsDigest).sort(),['bytes','sha256'],'Actual conditions digest only');
  assert(Number.isSafeInteger(conditionsDigest.bytes)&&conditionsDigest.bytes>=2);
  assert.match(conditionsDigest.sha256,/^[a-f0-9]{64}$/);
  const combined={...original,migratedConditionsBytes:conditionsDigest.bytes,
    migratedConditionsSha256:conditionsDigest.sha256};
  const inverse={...combined,migratedConditionsBytes:original.migratedConditionsBytes,
    migratedConditionsSha256:original.migratedConditionsSha256};
  same(inverse,original,'Combined report whole inverse: ONLY actual after-conditions bytes/SHA');
  return combined;
}
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
  const next=requireNativeOriginalContinuityBinding();
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
export async function restoreAndPrepareNativeOriginalContinuityRuntimeTransition(options){
  requireNativeOriginalContinuityOutput();
  assert.equal(arguments.length,1);assert(options&&Object.getPrototypeOf(options)===Object.prototype);
  assert.deepEqual(Object.keys(options).sort(),['checkpointRequest','request','storage','targetReferenceAt','workdir']);
  const {request,checkpointRequest,storage}=options,targetReferenceAt=hour(options.targetReferenceAt);
  const workdir=path.resolve(options.workdir);assert(workdir!==ROOT&&!inside(ROOT,workdir));
  assert(await absent(workdir));await noLinks(path.dirname(workdir));
  const selected=await describeCurrentProtectedPrivateProductionRuntime({request});
  assert.equal(selected.modelBinding.modelBundleSha256,OLD.I);
  assert.equal(selected.contractHashes.continuationStateContractSha256,OLD.T);
  assert.equal(targetReferenceAt,hour(selected.productionReferenceAt),'SAME_H0 retains the exact authenticated B reference');
  return withAuthenticated585PredecessorSource(async frozenRoot=>{
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
    return prepareNativeOriginalContinuityRuntimeTransition({sourceRoot,bundleManifestPath:path.join(bundlePath,'manifest.json'),
      predecessorDescriptorPath,workdir:path.join(workdir,'metadata'),targetReferenceAt,request,checkpointRequest});
  });
}
export async function prepareNativeOriginalContinuityRuntimeTransition(options){
  requireNativeOriginalContinuityOutput();
  const next=requireNativeOriginalContinuityBinding(); // before any I/O or clients
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
  assert.equal(identity.modelBinding.modelBundleSha256,OLD.I);
  assert.equal(identity.contractHashes.continuationStateContractSha256,OLD.T);
  same({...identity.modelBinding,modelBundleSha256:next.I},currentI,'Exact unchanged old/new physical model contract');
  assert.equal(targetReferenceAt,hour(identity.productionReferenceAt),'SAME_H0 cannot advance the weather reference');
  const workdir=path.resolve(options.workdir);assert(inside(path.parse(workdir).root,workdir));
  assert(!inside(ROOT,workdir)&&workdir!==ROOT&&!inside(sourceRoot,workdir)&&!inside(workdir,sourceRoot));
  assert(await absent(workdir),'New exclusive working directory required');await noLinks(path.dirname(workdir));
  const selected=await readIdentity({request,identity}); // BEFORE creating working output
  return withAuthenticated585PredecessorSource(async frozenRoot=>{
    const load=p=>import(pathToFileURL(path.join(frozenRoot,p)).href);
    const [oldB,oldS,oldProtectedS,oldI,oldC,oldWorkflow]=await Promise.all([
      load('scripts/private-production-runtime-bundle.mjs'),load('scripts/ravscore-continuation-checkpoint.mjs'),
      load('scripts/protected-ravscore-continuation-checkpoint.mjs'),load('js/core/ravscore-model-contract.js'),
      load('scripts/rollback-assets/ravscore-model-contract.js'),load('scripts/private-production-runtime-workflow.mjs')]);
    assert.equal(oldI.ravScoreModelBinding().modelBundleSha256,OLD.I);
    assert.equal(oldC.ravScoreModelBinding().modelBundleSha256,OLD.C);
    const oldContracts=await oldWorkflow.privateRuntimeContractHashes({repositoryRoot:frozenRoot});
    assert.equal(oldContracts.continuationStateContractSha256,OLD.T);
    same(identity.contractHashes,oldContracts,'Actual whole predecessor runtime contracts');
    same({...oldContracts,continuationStateContractSha256:next.T},contracts,'Only continuation binding changes');
    const bundlePath=path.dirname(bundleManifestPath),privateRoot=path.dirname(bundlePath);
    const expected={modelBinding:identity.modelBinding,contractHashes:identity.contractHashes,datasetId:identity.datasetId,
      productionReferenceAt:identity.productionReferenceAt,bundleContentSha256:identity.bundleContentSha256};
    await oldB.verifyPrivateProductionRuntimeBundle({privateRoot,bundlePath,repositoryRoot:frozenRoot,expected});
    await assertRestoredOriginalInventory(sourceRoot,manifest); // all original B bytes, not a report
    await fs.mkdir(workdir,{recursive:false});
    const originalSPath=path.join(workdir,'original585',CHECKPOINT),outputRoot=path.join(workdir,'runtime');
    const checkpointPath=path.join(workdir,'prepared',CHECKPOINT),reportPath=path.join(workdir,'normal-b-metadata-report.json');
    // Real old normal protected restore, including unchanged original digests
    // and the reviewed JSONB transport-order reconstruction. No new core guard.
    const restored=await oldProtectedS.restoreProtectedRavScoreContinuationCheckpoint({checkpointPath:originalSPath,targetReference:targetReferenceAt,request:checkpointRequest});
    assert.equal(restored.restored,true,'A genuine old protected S is required');
    const originalSBytes=await fs.readFile(originalSPath),originalS=JSON.parse(originalSBytes);
    assert.equal(originalS.modelBinding.modelBundleSha256,OLD.I);
    assert.equal(originalS.candidateGRollbackCompanion.modelBinding.modelBundleSha256,OLD.C);
    assert.equal(originalS.continuationStateContractSha256,OLD.T);
    assert.equal(originalS.datasetId,identity.datasetId);assert.equal(originalS.productionReferenceAt,identity.productionReferenceAt);
    const originalBCheckpoint=path.join(workdir,'b-original-checkpoint.json');
    await oldS.saveRavScoreContinuationCheckpoint({sourcePath:path.join(sourceRoot,'data/live/conditions.json'),
      checkpointPath:originalBCheckpoint,repositoryRoot:frozenRoot});
    same(await json(originalBCheckpoint),originalS,'Genuine old normal B-producer/S parity, including all original digests');
    const oldLoaded=await oldS.loadRavScoreContinuationCheckpointForTarget({checkpointPath:originalSPath,targetReference:targetReferenceAt,repositoryRoot:frozenRoot});
    assert.equal(oldLoaded.loaded,true);
    // The existing fixed OLD585 reader authenticates actual B/S, producer
    // ancestry, all required blobs and the WHOLE old origin. No seed replay,
    // path/callback receipt or ForPart handle can replace this OLD snapshot.
    const oldOrigin=await readAuthenticatedFrozen585Predecessor();
    const oldSnapshot=assertAuthenticatedFrozen585Snapshot(oldOrigin);
    for(const key of ['sourceHead','datasetId','productionReferenceAt','generatedAt',
      'bundleContentSha256','modelBinding','contractHashes'])
      same(oldSnapshot.descriptor[key],identity[key],'Same actual authenticated OLD descriptor: '+key);
    same(oldSnapshot.checkpoint,originalS,'Whole authenticated OLD B/S checkpoint identity');
    same(await fileDigest(path.join(sourceRoot,'data/live/conditions.json')),oldSnapshot.conditionsIdentity,
      'The actual normal migration source is the authenticated OLD conditions');
    const centralRegistryPath=path.join(ROOT,'data/live/coastal-parts-v2.json');
    await noLinks(centralRegistryPath);
    const centralRegistryStat=await fs.lstat(centralRegistryPath);
    assert(centralRegistryStat.isFile()&&centralRegistryStat.size>=2&&centralRegistryStat.size<=16*1024*1024,
      'Actual bounded hydrated central registry required');
    const centralRegistryBytes=await fs.readFile(centralRegistryPath);
    assert.equal(centralRegistryBytes.length,centralRegistryStat.size,'Exact hydrated registry read');
    const centralContract=JSON.parse(centralRegistryBytes);
    same(centralContract,oldSnapshot.centralContract,'SAME_H0 cannot combine a registry/point change');
    const report=await migratePostCutoverPrivateRuntime({sourceRoot,outputRoot,bundleManifestPath,
      predecessorDescriptorPath:options.predecessorDescriptorPath,predecessorRoot:frozenRoot,repositoryRoot:ROOT,
      expectedSourceHead:identity.sourceHead,reportPath,metadataOnly:true});
    assertMetadataOnlyMigrationResult(report);
    const originalNormalBReportBytes=await fs.readFile(reportPath);
    const originalNormalBReport=JSON.parse(originalNormalBReportBytes);
    const normalReturnReport=structuredClone(report);
    for(const key of ['repairedContinuationCount','recomputedModeCount','recomputedZoneCount'])delete normalReturnReport[key];
    same(originalNormalBReport,normalReturnReport,'Entire actual persisted normal report, excluding ONLY return-only zero counters');
    const metadataFiles=await preparedInventory(outputRoot);
    const preparedConditionsPath=path.join(outputRoot,'data/live/conditions.json');
    const metadataConditions=await json(preparedConditionsPath);
    same(await fileDigest(preparedConditionsPath),{
      bytes:originalNormalBReport.migratedConditionsBytes,sha256:originalNormalBReport.migratedConditionsSha256},
      'Original normal report binds exact pre-attestation metadata conditions');
    same(metadataConditions.privateEstablishedNativeCurrentOrigin,oldSnapshot.attestation,
      'Normal metadata migration retains the WHOLE authenticated parent origin');
    // The fixed finalizer checks all 673 normal new pairs/contexts against
    // the authenticated OLD pair, permitting ONLY modelBundle metadata.
    // The registry is the actual hydrated ROOT file, not a nonexistent B
    // payload file; old B runtime inventory remains exactly unchanged.
    const attestation=await buildEstablishedNativeCurrent585MetadataAttestation(oldOrigin,{
      centralContract,conditions:metadataConditions});
    assert.equal(attestation.transition,'SAME_H0_MODEL_METADATA');
    await writeBoundedJsonAtomic(preparedConditionsPath,{
      ...metadataConditions,privateEstablishedNativeCurrentOrigin:attestation});
    const readbackConditions=await json(preparedConditionsPath);
    same(readbackConditions.privateEstablishedNativeCurrentOrigin,attestation,'Exact new private origin readback');
    readbackConditions.privateEstablishedNativeCurrentOrigin=structuredClone(oldSnapshot.attestation);
    same(readbackConditions,metadataConditions,'Whole B inverse: ONLY replacement of the authenticated private origin beyond normal metadata');
    same((await preparedInventory(outputRoot)).filter(row=>row.relativePath!=='data/live/conditions.json'),
      metadataFiles.filter(row=>row.relativePath!=='data/live/conditions.json'),
      'Every other metadata-prepared B byte/inventory unchanged');
    same(await fs.readFile(centralRegistryPath),centralRegistryBytes,'Hydrated registry TOCTOU guard');
    // Retain the raw normal producer report. This separate derived report
    // changes ONLY its two after-conditions fields to include the private
    // attestation; the normal late same-reference publisher remains strict.
    const combinedReport=combinedMetadataOriginReport(originalNormalBReport,await fileDigest(preparedConditionsPath));
    const combinedReportPath=path.join(workdir,'combined-b-metadata-origin-report.json');
    await fs.writeFile(combinedReportPath,JSON.stringify(combinedReport)+'\n',{flag:'wx',mode:0o600});
    const combinedReportBytes=await fs.readFile(combinedReportPath);
    same(JSON.parse(combinedReportBytes),combinedReport,'Exact derived combined report readback');
    same(await fs.readFile(reportPath),originalNormalBReportBytes,'Raw original normal report unchanged after attestation');
    // Normal S serialization ignores the private field; its entire existing
    // metadata inverse and normal load/age/availability checks still apply.
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
    const rereadPath=path.join(workdir,'rechecked585',CHECKPOINT);
    await oldProtectedS.restoreProtectedRavScoreContinuationCheckpoint({checkpointPath:rereadPath,targetReference:targetReferenceAt,request:checkpointRequest});
    same(await json(rereadPath),originalS,'S source TOCTOU guard');
    same(await fs.readFile(reportPath),originalNormalBReportBytes,'Retained original normal report before handoff');
    same(await fs.readFile(combinedReportPath),combinedReportBytes,'Retained combined report before handoff');
    const token=Object.freeze({kind:'NATIVE_ORIGINAL_CONTINUITY_585_PREPARED_RUNTIME',admission:'NO_ADMISSION',
      originalReferenceAt:identity.productionReferenceAt,targetReferenceAt,partCount:673,
      numericalChanges:0,repairedContinuationCount:0,recomputedModeCount:0,recomputedZoneCount:0,
      originalBContentSha256:identity.bundleContentSha256,originalSFileSha256:sha(originalSBytes),
      preparedSFileSha256:sha(await fs.readFile(checkpointPath)),outputRoot,checkpointPath,
      originalCheckpointPath:originalSPath,normalBReportPath:combinedReportPath,installationPerformed:false,privatePayloadIncluded:false});
    contexts.set(token,{workdir,identity,selected,originalSBytes,sourceRoot,manifest,checkpointPath,originalSPath,request,checkpointRequest,
      oldOrigin,oldSnapshot,centralRegistryPath,centralRegistryBytes,originalNormalBReportPath:reportPath,originalNormalBReportBytes,
      combinedReportPath,combinedReportBytes,
      preparedFiles:await preparedInventory(outputRoot)});
    return token;
  });
}
export async function assertNativeOriginalContinuityRuntimeTransitionPrepared(token){
  assert.equal(arguments.length,1);const value=contexts.get(token);assert(value,'Only this actual normal preparation, never a serialized receipt');
  same(assertAuthenticatedFrozen585Snapshot(value.oldOrigin),value.oldSnapshot,'Retained opaque OLD snapshot unchanged');
  await assertRestoredOriginalInventory(value.sourceRoot,value.manifest);
  same(await preparedInventory(token.outputRoot),value.preparedFiles,'All actual prepared B bytes preserved until handoff');
  same(await fs.readFile(value.originalSPath),value.originalSBytes,'Retained original S');
  same(await fs.readFile(value.centralRegistryPath),value.centralRegistryBytes,'Hydrated registry unchanged through handoff');
  same(await fs.readFile(value.originalNormalBReportPath),value.originalNormalBReportBytes,'Raw original normal report unchanged through handoff');
  same(await fs.readFile(value.combinedReportPath),value.combinedReportBytes,'Derived combined report unchanged through handoff');
  assert.equal(token.normalBReportPath,value.combinedReportPath);
  const loaded=await loadRavScoreContinuationCheckpointForTarget({checkpointPath:value.checkpointPath,targetReference:token.targetReferenceAt});
  assert.equal(loaded.loaded,true);assert.equal(sha(await fs.readFile(value.checkpointPath)),token.preparedSFileSha256);
  same(await readIdentity({request:value.request,identity:value.identity}),value.selected,'Fresh B prewrite source');
  await withAuthenticated585PredecessorSource(async root=>{
    const old=await import(pathToFileURL(path.join(root,'scripts/protected-ravscore-continuation-checkpoint.mjs')).href);
    const checkpointPath=path.join(value.workdir,'rechecked585',CHECKPOINT);
    await old.restoreProtectedRavScoreContinuationCheckpoint({checkpointPath,targetReference:token.targetReferenceAt,request:value.checkpointRequest});
    same(await json(checkpointPath),JSON.parse(value.originalSBytes),'Fresh S prewrite source');
  });
  return token;
}
