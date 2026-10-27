// Synthetic PRE-MERGE legacy compatibility only. The existing native caller
// owns this host; this file creates no host, main proof, ACTIVE profile or SDK.
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import {createReadStream} from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {isDeepStrictEqual} from 'node:util';
import {emitNativePostgresFirstFailure} from './lib/checkpoint-cas-native-postgres.mjs';
import {requireSourceProducerOutput,requireSourceProducerBinding,SOURCE_PRODUCER_BEFORE}
  from './lib/source-producer-successor-source.mjs';

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const CHECKPOINT='.cache/ravscore-continuation-checkpoint/checkpoint.json';
const CONDITIONS='data/live/conditions.json';
const REGISTRY='data/live/coastal-parts-v2.json';
const PACK='.cache/public-hour-delivery.pack';
// Private observation state only; never a source/SQL/production admission.
let sourceLegacyPhase='SOURCE_LEGACY_BINDINGS';
function observeSourceLegacyPhase(phase){
  try{console.error(JSON.stringify({kind:'SOURCE_LEGACY_PHASE_OBSERVATION',phase,privatePayloadIncluded:false}));}
  catch{} // Observation never changes the normal phase/exception/result.
}
const load=relative=>import(pathToFileURL(path.join(ROOT,relative)).href);
const json=async file=>JSON.parse(await fs.readFile(file,'utf8'));
const same=(left,right,label)=>assert(isDeepStrictEqual(left,right),label);
async function digest(file){
  const hash=crypto.createHash('sha256');let bytes=0;
  for await(const chunk of createReadStream(file)){hash.update(chunk);bytes+=chunk.length;}
  return {bytes,sha256:hash.digest('hex')};
}
async function inventory(root){
  const result=[];
  async function visit(directory,prefix=''){
    for(const name of (await fs.readdir(directory)).sort()){
      const relative=prefix?prefix+'/'+name:name,file=path.join(root,relative),stat=await fs.lstat(file);
      assert(!stat.isSymbolicLink(),'Retained original cannot be a symbolic link');
      if(stat.isDirectory())await visit(file,relative);
      else {assert(stat.isFile());result.push({relative,...await digest(file)});}
    }
  }
  await visit(root);return result;
}
function sameCheckpointExceptExactMetadata(old,next,binding){
  const inverse=structuredClone(next);
  assert.equal(old.modelBinding.modelBundleSha256,SOURCE_PRODUCER_BEFORE.I);
  assert.equal(inverse.modelBinding.modelBundleSha256,binding.I);
  assert.equal(old.candidateGRollbackCompanion.modelBinding.modelBundleSha256,SOURCE_PRODUCER_BEFORE.C);
  assert.equal(inverse.candidateGRollbackCompanion.modelBinding.modelBundleSha256,binding.C);
  assert.equal(old.continuationStateContractSha256,SOURCE_PRODUCER_BEFORE.T);
  assert.equal(inverse.continuationStateContractSha256,binding.T);
  inverse.modelBinding.modelBundleSha256=old.modelBinding.modelBundleSha256;
  inverse.candidateGRollbackCompanion.modelBinding.modelBundleSha256=old.candidateGRollbackCompanion.modelBinding.modelBundleSha256;
  inverse.continuationStateContractSha256=old.continuationStateContractSha256;
  same(Object.keys(inverse.states).sort(),Object.keys(old.states).sort(),'Exact same-H0 part identities');
  for(const [id,state]of Object.entries(inverse.states)){
    assert.equal(state.modelBundleSha256,binding.I);state.modelBundleSha256=old.states[id].modelBundleSha256;
  }
  inverse.generationSha256=old.generationSha256;inverse.stateSha256=old.stateSha256;
  inverse.candidateGRollbackCompanion.generationSha256=old.candidateGRollbackCompanion.generationSha256;
  same(inverse,old,'Whole S inverse: all numbers, evidence, history and non-metadata fields retained');
}

// The normal metadata producer itself proves the complete B metadata inverse
// and authenticates the old origin. This helper adds a genuine ordinary next
// hour, rather than treating unchanged same-H0 metadata as a follower result.
export async function runSourceProducerLegacyCompatibility(){
  sourceLegacyPhase='SOURCE_LEGACY_SETUP';
  observeSourceLegacyPhase(sourceLegacyPhase);
  requireSourceProducerOutput();const binding=requireSourceProducerBinding(); // BEFORE host/input I/O.
  assert.equal(arguments.length,0);assert.equal(process.platform,'linux');
  assert.equal(Number(process.versions.node.split('.')[0]),24);
  const own=path.dirname(ROOT);
  assert.equal(path.basename(ROOT),'current-source-native');assert.match(path.basename(own),/^rr-source19-union-native-/);
  assert.equal(await fs.realpath(process.env.RUNNER_TEMP),path.join(ROOT,'runner-temp'));
  assert.equal(await fs.realpath(ROOT),ROOT);
  const sourceHead=execFileSync('git',['rev-parse','HEAD'],{cwd:ROOT,encoding:'utf8',timeout:30000}).trim();
  assert.match(sourceHead,/^[a-f0-9]{40}$/);
  const h0=await json(path.join(own,'fixture-initial-h0/current-source-native-options.json'));
  const h1=await json(path.join(own,'fixture-initial-h1/current-source-native-options.json'));
  const successor=await json(path.join(own,'fixture/current-source-native-options.json'));
  const prior587=await json(path.join(own,'fixture-587/current-source-native-options.json'));
  same(h0.adminInputs,h1.adminInputs,'Same normal585 prefix registry');same(h0.adminInputs,successor.adminInputs,'Same normal588 registry');
  same(h0.adminInputs,prior587.adminInputs,'Same retained normal587 registry');
  assert.equal(h0.targetReferenceAt,h1.targetReferenceAt);
  assert.equal(Date.parse(prior587.targetReferenceAt)-Date.parse(h1.targetReferenceAt),3600000);
  assert.equal(Date.parse(successor.targetReferenceAt)-Date.parse(prior587.targetReferenceAt),3600000);
  const options={...h0,profile:'current-source-native',workRoot:path.join(own,'current-source-native-inputs'),
    forwardProviderInputs:h1.providerInputs,successorProviderInputs:successor.providerInputs,
    successorTargetReferenceAt:successor.targetReferenceAt,
    predecessor587ProviderInputs:prior587.providerInputs,predecessor587TargetReferenceAt:prior587.targetReferenceAt};
  sourceLegacyPhase='SOURCE_LEGACY_PRODUCER';
  observeSourceLegacyPhase(sourceLegacyPhase);
  const {produceCurrentSourceNativeInputs}=await load('scripts/fixtures/source19-current-normal-inputs.mjs');
  // Same existing normal producer, now genuine585 H0/H1 ->586 ->587 ->588 ->SOURCE.
  // No CURRENT action, handwritten pack, ACTIVE row or supplied model tuple.
  const produced=await produceCurrentSourceNativeInputs(options);
  sourceLegacyPhase='SOURCE_LEGACY_ORIGINALS';
  observeSourceLegacyPhase(sourceLegacyPhase);
  assert.equal(produced.profile,'current-source-native');assert.equal(produced.current.sourceHead,sourceHead);
  for(const key of ['actionInvoked','sdkInvoked','sourceOwnerIssued','wholeSourceIntegrationProved','productionProof'])
    assert.equal(produced[key],false);
  const oldCheckpoint=await json(produced.saved588.checkpointPath);
  const currentCheckpoint=await json(produced.current.checkpointPath);
  sameCheckpointExceptExactMetadata(oldCheckpoint,currentCheckpoint,binding);
  assert.equal(currentCheckpoint.productionReferenceAt,oldCheckpoint.productionReferenceAt);
  assert.equal(Object.keys(currentCheckpoint.states).length,673);
  const originalRoots=[produced.first585.privateRoot,produced.saved585.privateRoot,
    produced.saved586.privateRoot,produced.saved587.privateRoot,produced.saved588.privateRoot,produced.current.privateRoot];
  const originals=await Promise.all(originalRoots.map(inventory));
  const {hydratePrivateConditionsHourly}=await load('scripts/lib/private-conditions-hourly.mjs');
  const {normalBAndSTransports}=await load('scripts/lib/established-native-current-origin-test-transports.mjs');
  const backend=normalBAndSTransports();
  // Mirror only actual normal producer outputs, never author B/S/state bodies.
  for(const [name,value]of produced.documents)backend.documents.set(name,structuredClone(value));
  for(const [name,bytes]of produced.objects)backend.objects.set(name,Buffer.from(bytes));
  const objectBefore=new Map([...backend.objects].map(([name,bytes])=>[name,Buffer.from(bytes)]));
  const removeExact=backend.storage.removeExact;
  backend.storage.removeExact=async name=>{
    // Truthful retention refusal for ORIGINALS, not a claimed successful delete.
    // The normal publisher must report this; it cannot silently lose old B/S.
    assert(!objectBefore.has(name),'Synthetic compatibility retains every original object');
    return removeExact(name);
  };
  const workflow=await load('scripts/private-production-runtime-workflow.mjs');
  const bundle=await load('scripts/private-production-runtime-bundle.mjs');
  const protectedB=await load('scripts/protected-private-production-runtime.mjs');
  const normalS=await load('scripts/ravscore-continuation-checkpoint.mjs');
  const protectedS=await load('scripts/protected-ravscore-continuation-checkpoint.mjs');
  const beforeEnv={...process.env},beforeCwd=process.cwd();let restoreTransport,hasFirst=false;
  try{
    sourceLegacyPhase='SOURCE_LEGACY_RESTORE';
    observeSourceLegacyPhase(sourceLegacyPhase);
    for(const name of ['RAVRADAR_ARCHIVED_WEATHER_RESTART_CONTEXT_PATH','RAVRADAR_ARCHIVED_WEATHER_RESTART_CONTEXT_SHA256',
      'RAVRADAR_CURRENT_FAMILY_COLD_START_CONTEXT_PATH','RAVRADAR_CURRENT_FAMILY_COLD_START_CONTEXT_SHA256',
      'RAVRADAR_WEATHER_STATE_EPOCH_CONTEXT_PATH','RAVRADAR_WEATHER_STATE_EPOCH_CONTEXT_SHA256',
      'RAVRADAR_DMI_LEGACY_CURRENT_EXPECTATION','DMI_PART_CONTINUITY_DONOR_PATH',
      'RAVSCORE_FIRST_CUTOVER_BOOTSTRAP_MODE'])assert.equal(process.env[name],undefined,'No ambient exceptional mode');
    for(const name of ['CHECKPOINT_ONLY','RAVRADAR_WEATHER_STATE_EPOCH_BOOTSTRAP',
      'RAVSCORE_STATELESS_INTEGRATED_COLD_START_ALLOWED','RAVSCORE_FIRST_CUTOVER_SOURCE_VALIDATED'])
      assert([undefined,'false'].includes(process.env[name]),'No ambient bootstrap');
    const target=new Date(Date.parse(produced.current.referenceAt)+3600000).toISOString();
    restoreTransport=backend.installFixedReaderTransport();
    // Protected restore returns B's manifest+payload wrapper. The normal
    // installer accepts only the authenticated FLAT runtime inventory.
    const parentManifest=produced.current.manifest;
    const verifiedParent=await bundle.verifyPrivateProductionRuntimeBundle({
      privateRoot:produced.current.privateRoot,bundlePath:produced.current.bundlePath,repositoryRoot:ROOT,
      expected:{modelBinding:parentManifest.modelBinding,contractHashes:parentManifest.contractHashes,
        datasetId:parentManifest.datasetId,productionReferenceAt:parentManifest.productionReferenceAt,
        bundleContentSha256:parentManifest.bundleContentSha256}});
    assert.equal(verifiedParent.verified,true);
    same(verifiedParent.manifest,parentManifest,'Whole actual saved SOURCE B manifest');
    await workflow.installRestoredPrivateRuntime({restoredRoot:path.join(verifiedParent.bundlePath,'payload'),repositoryRoot:ROOT});
    const restoredS=await protectedS.restoreProtectedRavScoreContinuationCheckpoint({
      checkpointPath:path.join(ROOT,CHECKPOINT),targetReference:target,request:backend.documentRequest});
    assert.equal(restoredS.restored,true);
    same(await json(path.join(ROOT,CHECKPOINT)),currentCheckpoint,'Actual SOURCE S installed for normal continuation');
    await fs.copyFile(path.join(ROOT,'data/live/dmi-bulk-cache.json'),path.join(ROOT,'.cache/deployed-dmi-bulk-cache.json'));
    process.chdir(ROOT);process.env.PRIVATE_RUNTIME_REPOSITORY_ROOT=ROOT;process.env.GITHUB_SHA=sourceHead;
    process.env.RAVRADAR_PREDECESSOR_PRIVATE_ROOT=produced.current.privateRoot;
    process.env.RAVRADAR_PREDECESSOR_PRIVATE_BUNDLE=produced.current.bundlePath;
    process.env.RAVRADAR_WEATHER_CACHE_ONLY='true';process.env.RAVRADAR_REQUIRE_PRIVATE_WEATHER_BASELINE='true';
    process.env.RAVRADAR_PRODUCTION_TARGET_HOUR=target;
    // ONE real normal legacy updater: it already generates the complete public
    // runtime AND hour pack. Do not run generate-public-conditions a second time.
    sourceLegacyPhase='SOURCE_LEGACY_UPDATER';
    observeSourceLegacyPhase(sourceLegacyPhase);
    await load('scripts/update-weather.mjs');
    const packed=await json(path.join(ROOT,CONDITIONS)),full=hydratePrivateConditionsHourly(packed);
    assert.equal(full.productionReferenceAt,target);
    same(await json(path.join(ROOT,REGISTRY)),produced.registry,'Unchanged actual normal admin registry');
    const zoneIds=Object.keys(produced.registry.zones).sort();
    const partIds=Object.values(produced.registry.zones).flat().map(part=>part.partId).sort();
    assert.equal(zoneIds.length,210);assert.equal(partIds.length,673);
    same(Object.keys(full.coastalParts.parts).sort(),partIds,'All normal673 follower identities');
    const times=Array.from({length:118},(_,index)=>new Date(Date.parse(target)+index*3600000).toISOString());
    same(Object.keys(full.coastalParts.zones).sort(),zoneIds,'All normal210 follower zones');
    for(const zoneId of zoneIds){
      same(full.zones[zoneId].forecast.hourly.map(row=>row.time),times,'Exact normal118 weather axis');
      same(full.coastalParts.zones[zoneId].hourly.map(row=>row.time),times,'Exact normal118 mode axis');
      for(const row of full.coastalParts.zones[zoneId].hourly)for(const mode of ['waders','beach'])
        assert(row[mode]&&typeof row[mode]==='object','Both actual normal mode projections exist');
    }
    const {inspectPrivatePublicHourDeliveryPack}=await load('scripts/lib/public-hour-delivery-pack.mjs');
    const pack=await inspectPrivatePublicHourDeliveryPack({packPath:path.join(ROOT,PACK),conditions:packed});
    same(pack.manifest.entries.map(row=>row.time),times,'Actual normal public pack closes118 hours');
    assert.equal(pack.manifest.modelBinding.modelBundleSha256,binding.I);
    sourceLegacyPhase='SOURCE_LEGACY_SAVE';
    observeSourceLegacyPhase(sourceLegacyPhase);
    const followerRoot=path.join(produced.workRoot,'saved-legacy-follower');await fs.mkdir(followerRoot,{mode:0o700});
    const checkpointPath=path.join(followerRoot,CHECKPOINT);
    await normalS.saveRavScoreContinuationCheckpoint({repositoryRoot:ROOT,sourcePath:path.join(ROOT,CONDITIONS),checkpointPath});
    const follower=await json(checkpointPath);
    assert.equal(follower.productionReferenceAt,target);assert.equal(follower.modelBinding.modelBundleSha256,binding.I);
    assert.equal(follower.candidateGRollbackCompanion.modelBinding.modelBundleSha256,binding.C);
    assert.equal(follower.continuationStateContractSha256,binding.T);
    same(Object.keys(follower.states).sort(),Object.keys(currentCheckpoint.states).sort(),'673 actual follower states');
    sourceLegacyPhase='SOURCE_LEGACY_READBACK';
    observeSourceLegacyPhase(sourceLegacyPhase);
    const loaded=await normalS.loadRavScoreContinuationCheckpointForTarget({checkpointPath,targetReference:target,repositoryRoot:ROOT});
    assert.equal(loaded.loaded,true);
    sourceLegacyPhase='SOURCE_LEGACY_SAVE';
    observeSourceLegacyPhase(sourceLegacyPhase);
    const spec=await workflow.buildPrivateRuntimeCreateSpec({repositoryRoot:ROOT});
    assert(spec.files.some(row=>row.relativePath===PACK));
    const bundlePath=path.join(followerRoot,'created'),now=full.generatedAt;
    const expected=await workflow.buildPrivateRuntimeExpectation({repositoryRoot:ROOT,targetReferenceAt:target,now});
    await bundle.createPrivateProductionRuntimeBundle({repositoryRoot:ROOT,privateRoot:followerRoot,bundlePath,...spec});
    const B=await protectedB.publishProtectedPrivateProductionRuntime({repositoryRoot:ROOT,privateRoot:followerRoot,
      bundlePath,expected,now,sourceHead,request:backend.documentRequest,storage:backend.storage});
    assert.equal(B.published,true);
    const S=await protectedS.publishProtectedRavScoreContinuationCheckpoint({checkpointPath,targetReference:target,
      request:backend.documentRequest,rpcRequest:backend.checkpointRpc});
    assert.equal(S.published,true);
    same(backend.events.filter(event=>['B_CAS','S_CAS'].includes(event)),['B_CAS','S_CAS'],'Normal B-before-S');
    sourceLegacyPhase='SOURCE_LEGACY_READBACK';
    observeSourceLegacyPhase(sourceLegacyPhase);
    const restored=path.join(followerRoot,'restored');
    const BReadback=await protectedB.restoreProtectedPrivateProductionRuntime({repositoryRoot:ROOT,privateRoot:followerRoot,
      bundlePath:restored,expected,now,request:backend.documentRequest,storage:backend.storage});
    assert.equal(BReadback.restored,true);assert.equal(BReadback.rollbackSelected,false);
    for(const row of spec.files)same(await digest(path.join(bundlePath,'payload',row.relativePath)),
      await digest(path.join(restored,'payload',row.relativePath)),'Exact whole normal follower B payload');
    const sReadbackPath=path.join(followerRoot,'readback',CHECKPOINT);
    const SReadback=await protectedS.restoreProtectedRavScoreContinuationCheckpoint({
      checkpointPath:sReadbackPath,targetReference:target,request:backend.documentRequest});
    assert.equal(SReadback.restored,true);same(await json(sReadbackPath),follower,'Whole normal follower S readback');
    for(let index=0;index<originalRoots.length;index++)same(await inventory(originalRoots[index]),originals[index],'Every original585/586/587/588/SOURCE B/S file retained');
    for(const [name,bytes]of objectBefore)same(backend.objects.get(name),bytes,'Original private storage bytes retained');
    return Object.freeze({kind:'SOURCE_LEGACY_COMPATIBILITY_SYNTHETIC',sameH0MetadataPreserved:true,
      ordinaryFollowerCount:1,zoneCount:210,partCount:673,hourCount:118,normalBThenS:true,wholeReadback:true,
      originalBytesRetained:true,actionInvoked:false,sdkInvoked:false,sourceAdmission:false,
      mainProof:false,activeProfileIssued:false,sqlExecuted:false,productionProof:false,
      retentionCleanup:{complete:B.retentionCleanupComplete,failureCount:B.retentionCleanupFailureCount}});
  }catch(error){hasFirst=true;throw error;}
  finally{
    let cleanup;
    try{process.chdir(beforeCwd);restoreTransport?.();}catch(error){cleanup=error;}
    for(const name of Object.keys(process.env))if(!Object.hasOwn(beforeEnv,name))delete process.env[name];
    for(const [name,value]of Object.entries(beforeEnv))process.env[name]=value;
    // Same existing owner retains the entire fixture; no new cleanup lifecycle.
    if(cleanup&&!hasFirst)throw cleanup;
    // Never replace an actual first throw (including undefined/null/false/0)
    // with a later transport cleanup error.
    if(cleanup&&hasFirst)console.error('SOURCE_LEGACY_COMPATIBILITY_CLEANUP_REFUSED');
  }
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  try{
    requireSourceProducerOutput();requireSourceProducerBinding();
    assert.deepEqual(process.argv.slice(2),[]);
    console.log(JSON.stringify(await runSourceProducerLegacyCompatibility()));
  }
  catch(error){await emitNativePostgresFirstFailure(error,sourceLegacyPhase);throw error;}
}
