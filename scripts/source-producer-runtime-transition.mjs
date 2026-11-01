// Normal authenticated593 -> SOURCE SAME_H0 preparation; UNISSUED until the complete next source is frozen.
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import {createReadStream} from 'node:fs';
import path from 'node:path';
import {isDeepStrictEqual} from 'node:util';
import {writeBoundedJsonAtomic} from './lib/bounded-json-writer.mjs';
import {buildEstablishedNativeCurrent590MetadataAttestation,buildEstablishedNativeCurrent591MetadataAttestation,
  buildEstablishedNativeCurrent593MetadataAttestation,assertSource593MetadataCheckpointInverse,
  buildEstablishedNativeCurrent594MetadataAttestation,assertSource594MetadataCheckpointInverse}
  from './lib/established-native-current-origin.mjs';
import {readAuthenticatedSourceStaged590Predecessor,assertAuthenticatedSourceStaged590Snapshot,
  assertAuthenticatedSourceStaged590SnapshotFresh,readAuthenticatedSourceStaged591Predecessor,
  assertAuthenticatedSourceStaged591Snapshot,assertAuthenticatedSourceStaged591SnapshotFresh,
  readAuthenticatedSourceStaged593Predecessor,assertAuthenticatedSourceStaged593Snapshot,assertAuthenticatedSourceStaged593SnapshotFresh,
  readAuthenticatedSourceStaged594Predecessor,assertAuthenticatedSourceStaged594Snapshot,assertAuthenticatedSourceStaged594SnapshotFresh}
  from './lib/authenticated-frozen586-predecessor.mjs';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {withAuthenticated590PredecessorSource,withSource591OriginalDataSource,withSource593OriginalDataSource,withSource594OriginalDataSource} from './check-assistant-later-h0-predecessor-source.mjs';
import {SOURCE_PRODUCER_BEFORE,SOURCE_PRODUCER_LEGACY593_BEFORE,SOURCE_PRODUCER_LEGACY591_BEFORE as SOURCE591_BEFORE,SOURCE_PRODUCER_LEGACY590_BEFORE,
  requireSourceProducerBinding,requireSourceProducerOutput} from './lib/source-producer-successor-source.mjs';
import {ravScoreModelBinding as integratedBinding} from '../js/core/ravscore-model-contract.js';
import {ravScoreModelBinding as candidateBinding} from './rollback-assets/ravscore-model-contract.js';
import {privateRuntimeContractHashes} from './private-production-runtime-workflow.mjs';
import {loadRavScoreContinuationCheckpointForTarget,saveRavScoreContinuationCheckpoint} from './ravscore-continuation-checkpoint.mjs';
import {migratePostCutoverPrivateRuntime,assertMetadataOnlyMigrationResult,assertRestoredOriginalInventory,assertExactRuntimeInventory,validatePredecessorIdentity}
  from './migrate-post-cutover-private-runtime.mjs';
import {describeCurrentProtectedPrivateProductionRuntime,describeTargetProtectedPrivateProductionRuntime}
  from './protected-private-production-runtime.mjs';
import {assertSourceProducerCodeOnlyCaller} from './select-source-producer-code-only-source.mjs';

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const CHECKPOINT=path.join('.cache','ravscore-continuation-checkpoint','checkpoint.json');
const contexts=new WeakMap();
// Closed genuine original domains. A descriptor chooses its own exact reader;
// no supplied tuple, callback or old handle can rename a590 original as591.
const predecessors=Object.freeze([
  Object.freeze({label:'590',binding:SOURCE_PRODUCER_LEGACY590_BEFORE,
    withSource:withAuthenticated590PredecessorSource,readOriginal:readAuthenticatedSourceStaged590Predecessor,
    snapshot:assertAuthenticatedSourceStaged590Snapshot,fresh:assertAuthenticatedSourceStaged590SnapshotFresh,
    metadata:buildEstablishedNativeCurrent590MetadataAttestation}),
  Object.freeze({label:'591',binding:SOURCE591_BEFORE,
    withSource:withSource591OriginalDataSource,readOriginal:readAuthenticatedSourceStaged591Predecessor,
    snapshot:assertAuthenticatedSourceStaged591Snapshot,fresh:assertAuthenticatedSourceStaged591SnapshotFresh,
    metadata:buildEstablishedNativeCurrent591MetadataAttestation}),
  Object.freeze({label:'593',binding:SOURCE_PRODUCER_LEGACY593_BEFORE,
    withSource:withSource593OriginalDataSource,readOriginal:readAuthenticatedSourceStaged593Predecessor,
    snapshot:assertAuthenticatedSourceStaged593Snapshot,fresh:assertAuthenticatedSourceStaged593SnapshotFresh,
    metadata:buildEstablishedNativeCurrent593MetadataAttestation}),
  Object.freeze({label:'594',binding:SOURCE_PRODUCER_BEFORE,
    withSource:withSource594OriginalDataSource,readOriginal:readAuthenticatedSourceStaged594Predecessor,
    snapshot:assertAuthenticatedSourceStaged594Snapshot,fresh:assertAuthenticatedSourceStaged594SnapshotFresh,
    metadata:buildEstablishedNativeCurrent594MetadataAttestation})
]);
function predecessorFor(descriptor){
  const matches=predecessors.filter(value=>descriptor.modelBinding?.modelBundleSha256===value.binding.I
    &&descriptor.contractHashes?.continuationStateContractSha256===value.binding.T);
  assert.equal(matches.length,1,'Exactly one genuine590/591/593/594 original domain');
  // Historiske rækker beholder egne domæner; kun den præcise tilsigtede forgænger vælges.
  assert.deepEqual(matches[0].binding,SOURCE_PRODUCER_BEFORE,'SOURCE_ORIGINAL_DATA_PARENT_UNAVAILABLE');
  return matches[0];
}
// Ren familiebetegnelse fra den samme lukkede tabel; ingen læser eller kapabilitet udleveres.
export function sourceProducerRuntimePredecessorFamily(descriptor){
  assert.equal(arguments.length,1);return predecessorFor(descriptor).label;
}
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
  if(original.modelBinding?.modelBundleSha256===SOURCE_PRODUCER_BEFORE.I
    &&original.continuationStateContractSha256===SOURCE_PRODUCER_BEFORE.T){
    const next=requireSourceProducerBinding();
    // Den samme prøvede594-inverse; de historiske inverteringer nedenfor ændres ikke.
    assertSource594MetadataCheckpointInverse({previousCheckpoint:original,incomingCheckpoint:prepared,
      currentSource:{integrated:next.I,candidate:next.C,continuation:next.T}});
    return;
  }
  if(original.modelBinding?.modelBundleSha256===SOURCE_PRODUCER_LEGACY593_BEFORE.I
    &&original.continuationStateContractSha256===SOURCE_PRODUCER_LEGACY593_BEFORE.T){
    const next=requireSourceProducerBinding();
    // Den samme prøvede593-inverse; de historiske inverteringer nedenfor ændres ikke.
    assertSource593MetadataCheckpointInverse({previousCheckpoint:original,incomingCheckpoint:prepared,
      currentSource:{integrated:next.I,candidate:next.C,continuation:next.T}});
    return;
  }
  // Complete inverse of the ONLY allowed S metadata changes. Never replace a
  // bare hash recursively, infer a missing field or discard an unknown field.
  const inverse=structuredClone(prepared);
  const next=requireSourceProducerBinding();
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
export async function restoreAndPrepareSourceProducerRuntimeTransition(options){
  requireSourceProducerOutput();
  assert.equal(arguments.length,1);assert(options&&Object.getPrototypeOf(options)===Object.prototype);
  assert.deepEqual(Object.keys(options).sort(),['checkpointRequest','request','storage','targetReferenceAt','workdir']);
  const {request,checkpointRequest,storage}=options,targetReferenceAt=hour(options.targetReferenceAt);
  const workdir=path.resolve(options.workdir);assert(workdir!==ROOT&&!inside(ROOT,workdir));
  assert(await absent(workdir));await noLinks(path.dirname(workdir));
  const selected=await describeCurrentProtectedPrivateProductionRuntime({request});
  const predecessor=predecessorFor(selected),OLD=predecessor.binding;
  assert.equal(selected.modelBinding.modelBundleSha256,OLD.I);
  assert.equal(selected.contractHashes.continuationStateContractSha256,OLD.T);
  assert.equal(targetReferenceAt,hour(selected.productionReferenceAt),'SAME_H0 retains the exact authenticated B reference');
  return predecessor.withSource(async frozenRoot=>{
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
    return prepareSourceProducerRuntimeTransition({sourceRoot,bundleManifestPath:path.join(bundlePath,'manifest.json'),
      predecessorDescriptorPath,workdir:path.join(workdir,'metadata'),targetReferenceAt,request,checkpointRequest});
  });
}
export async function prepareSourceProducerRuntimeTransition(options){
  requireSourceProducerOutput();
  const next=requireSourceProducerBinding(); // before any I/O or clients
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
  const predecessor=predecessorFor(identity),OLD=predecessor.binding;
  assert.equal(identity.modelBinding.modelBundleSha256,OLD.I);
  assert.equal(identity.contractHashes.continuationStateContractSha256,OLD.T);
  same({...identity.modelBinding,modelBundleSha256:next.I},currentI,'Exact unchanged old/new physical model contract');
  assert.equal(targetReferenceAt,hour(identity.productionReferenceAt),'SAME_H0 cannot advance the weather reference');
  const workdir=path.resolve(options.workdir);assert(inside(path.parse(workdir).root,workdir));
  assert(!inside(ROOT,workdir)&&workdir!==ROOT&&!inside(sourceRoot,workdir)&&!inside(workdir,sourceRoot));
  assert(await absent(workdir),'New exclusive working directory required');await noLinks(path.dirname(workdir));
  const selected=await readIdentity({request,identity}); // BEFORE creating working output
  return predecessor.withSource(async frozenRoot=>{
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
    const originalSPath=path.join(workdir,'original'+predecessor.label,CHECKPOINT),outputRoot=path.join(workdir,'runtime');
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
    // The selected fixed original reader authenticates actual B/S, producer
    // ancestry, all required blobs and the WHOLE old origin. No seed replay,
    // path/callback receipt or ForPart handle can replace this OLD snapshot.
    const oldOrigin=await predecessor.readOriginal();
    const oldSnapshot=predecessor.snapshot(oldOrigin);
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
    // The selected normal metadata seam checks all673 new pairs/contexts against
    // the authenticated OLD pair, permitting ONLY modelBundle metadata.
    // The registry is the actual hydrated ROOT file, not a nonexistent B
    // payload file; old B runtime inventory remains exactly unchanged.
    const attestation=await predecessor.metadata(oldOrigin,{
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
    const rereadPath=path.join(workdir,'rechecked'+predecessor.label,CHECKPOINT);
    await oldProtectedS.restoreProtectedRavScoreContinuationCheckpoint({checkpointPath:rereadPath,targetReference:targetReferenceAt,request:checkpointRequest});
    same(await json(rereadPath),originalS,'S source TOCTOU guard');
    same(await fs.readFile(reportPath),originalNormalBReportBytes,'Retained original normal report before handoff');
    same(await fs.readFile(combinedReportPath),combinedReportBytes,'Retained combined report before handoff');
    const token=Object.freeze({kind:'SOURCE_PRODUCER_'+predecessor.label+'_PREPARED_RUNTIME',admission:'NO_ADMISSION',
      originalReferenceAt:identity.productionReferenceAt,targetReferenceAt,partCount:673,
      numericalChanges:0,repairedContinuationCount:0,recomputedModeCount:0,recomputedZoneCount:0,
      originalBContentSha256:identity.bundleContentSha256,originalSFileSha256:sha(originalSBytes),
      preparedSFileSha256:sha(await fs.readFile(checkpointPath)),outputRoot,checkpointPath,
      originalCheckpointPath:originalSPath,normalBReportPath:combinedReportPath,installationPerformed:false,privatePayloadIncluded:false});
    contexts.set(token,{predecessor,workdir,identity,selected,originalSBytes,sourceRoot,manifest,checkpointPath,originalSPath,request,checkpointRequest,
      oldOrigin,oldSnapshot,centralRegistryPath,centralRegistryBytes,originalNormalBReportPath:reportPath,originalNormalBReportBytes,
      combinedReportPath,combinedReportBytes,
      preparedFiles:await preparedInventory(outputRoot)});
    return token;
  });
}
export async function assertSourceProducerRuntimeTransitionPrepared(token){
  requireSourceProducerOutput();
  assert.equal(arguments.length,1);const value=contexts.get(token);assert(value,'Only this actual normal preparation, never a serialized receipt');
  const predecessor=value.predecessor;
  same(predecessor.snapshot(value.oldOrigin),value.oldSnapshot,'Retained opaque OLD snapshot unchanged');
  await predecessor.fresh(value.oldOrigin); // Keep actual pointer/S-version freshness, including ABA refusal.
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
  await predecessor.withSource(async root=>{
    const old=await import(pathToFileURL(path.join(root,'scripts/protected-ravscore-continuation-checkpoint.mjs')).href);
    const checkpointPath=path.join(value.workdir,'rechecked'+predecessor.label,CHECKPOINT);
    await old.restoreProtectedRavScoreContinuationCheckpoint({checkpointPath,targetReference:token.targetReferenceAt,request:value.checkpointRequest});
    same(await json(checkpointPath),JSON.parse(value.originalSBytes),'Fresh S prewrite source');
  });
  return token;
}

// A local whole-artifact comparison after the existing fresh final prewrite.
// No token is serialized or reconstructed here: the reviewed prewrite leaf
// must first have compared this initial prepared view with its real producer.
// This additional read then binds the actual created B and installed working
// files to that exact view BEFORE the caller executes its sole SQL mutation.
export async function assertSourceProducerPrivateBootstrapArtifact(){
  requireSourceProducerOutput(); // FIRST, before arguments, environment or paths.
  assert.equal(arguments.length,0);assertSourceProducerCodeOnlyCaller(process.env);
  assert.equal(process.env.GITHUB_JOB,'prepare-source-private');
  assert.equal(process.env.RAVRADAR_SOURCE_PRODUCER_PHASE,'before');
  assert.equal(process.env.RAVRADAR_SOURCE_PRODUCER_CURRENT_FAMILY,'predecessor');
  for(const key of ['RAVRADAR_SOURCE_PRODUCER_ORIGINALS_VERIFIED','RAVRADAR_SOURCE_PRODUCER_NOLOSS_VERIFIED',
    'RAVRADAR_SOURCE_PRODUCER_PREWRITE_VERIFIED'])assert.equal(process.env[key],'true');
  const locations={};
  for(const key of ['RAVRADAR_MIGRATED_PRIVATE_RUNTIME_RESTORE','RAVRADAR_PRIVATE_RUNTIME_ROOT',
    'RAVRADAR_PRIVATE_RUNTIME_BUNDLE']){
    const value=process.env[key];assert(typeof value==='string'&&path.isAbsolute(value)&&!/[\r\n\0]/.test(value));
    const resolved=path.resolve(value);await noLinks(resolved);assert.equal(await fs.realpath(resolved),resolved);
    assert((await fs.lstat(resolved)).isDirectory());assert(!inside(ROOT,resolved)&&resolved!==ROOT);locations[key]=resolved;
  }
  const prepared=locations.RAVRADAR_MIGRATED_PRIVATE_RUNTIME_RESTORE;
  const privateRoot=locations.RAVRADAR_PRIVATE_RUNTIME_ROOT,bundlePath=locations.RAVRADAR_PRIVATE_RUNTIME_BUNDLE;
  assert.equal(path.dirname(bundlePath),privateRoot);assert.equal(path.basename(bundlePath),'bundle-source-successor');
  const {verifyPrivateProductionRuntimeBundle}=await import('./private-production-runtime-bundle.mjs');
  const {buildPrivateRuntimeExpectation}=await import('./private-production-runtime-workflow.mjs');
  const expected=await buildPrivateRuntimeExpectation({repositoryRoot:ROOT,targetReferenceAt:process.env.RAVRADAR_PRODUCTION_TARGET_HOUR});
  const verified=await verifyPrivateProductionRuntimeBundle({privateRoot,bundlePath,repositoryRoot:ROOT,expected});
  const inventory=await preparedInventory(prepared);
  const sorted=value=>[...value].sort((a,b)=>a.relativePath.localeCompare(b.relativePath));
  same(sorted(verified.files.map(({id,relativePath})=>({id,relativePath}))),
    sorted((await assertExactRuntimeInventory(prepared)).map(({id,relativePath})=>({id,relativePath}))),
    'Whole actual B inventory equals the original-preserving prepared view');
  for(const row of inventory){
    const original={bytes:row.bytes,sha256:row.sha256};
    const payload=path.join(bundlePath,'payload',row.relativePath),installed=path.join(ROOT,row.relativePath);
    await noLinks(payload);await noLinks(installed);
    same(await fileDigest(payload),original,'Every created B payload byte equals the prepared view');
    same(await fileDigest(installed),original,'Every installed private input byte equals the prepared view');
  }
  same(await preparedInventory(prepared),inventory,'Initial prepared view unchanged throughout artifact comparison');
  return Object.freeze({kind:'SOURCE_PRIVATE_BOOTSTRAP_ARTIFACT_MATCHED',admission:'NO_ADMISSION',
    fileCount:inventory.length,privatePayloadIncluded:false,installationPerformed:false});
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  try{
    requireSourceProducerOutput();assert.equal(process.argv.length,3);
    assert.equal(process.argv[2],'--verify-private-bootstrap-artifact');
    await assertSourceProducerPrivateBootstrapArtifact();
    console.log('SOURCE_PRIVATE_BOOTSTRAP_ARTIFACT_MATCHED');
  }catch{console.error('SOURCE_PRIVATE_BOOTSTRAP_ARTIFACT_REFUSED');process.exitCode=1;}
}
