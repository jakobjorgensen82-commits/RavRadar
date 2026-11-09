// Fixed SOURCE metadata/current code-only CLI. Its normal shared core performs
// actual B-before-S authentication/CAS/readback; no alternate SOURCE operation.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {requireSourceProducerOutput,sourceProducerReferenceHour} from './lib/source-producer-after597-runtime-family.mjs';
import {reconcileSourceCodeOnlyPrivateRuntimeCheckpoint,verifySavedSourcePairPublishedPins,verifySavedSourcePairReadback}
  from './reconcile-private-runtime-checkpoint.mjs';
import {assertSourceProducerSavedWeatherCaller} from './select-source-producer-code-only-source.mjs';
import {createProtectedPrivateRuntimeClients,pinCurrentProtectedPrivateProductionRuntime,
  restoreProtectedPrivateProductionRuntime} from './protected-private-production-runtime.mjs';
import {sha256CanonicalJson} from './ravscore-operational-pages-recovery.mjs';

function savedWorkFile(name){
  const work=process.env.RAVRADAR_OPERATIONAL_WORK;
  assert(typeof work==='string'&&path.isAbsolute(work)&&!/[\r\n\0]/.test(work));
  return path.resolve(work,name);
}

async function readExactJson(file,maximumBytes){
  const stat=await fs.lstat(file);
  assert(stat.isFile()&&stat.size>0&&stat.size<=maximumBytes&&await fs.realpath(file)===file,'SOURCE_SAVED_PROOF_FILE');
  return JSON.parse(await fs.readFile(file,'utf8'));
}

async function readSavedWorkFile(name){
  return readExactJson(savedWorkFile(name),16*1024);
}

async function restoreSavedWeatherCurrent(){
  assertSourceProducerSavedWeatherCaller(process.env);
  assert.equal(process.env.RAVRADAR_SOURCE_PRODUCER_SOURCE_ACTIVE,'true');
  assert.equal(process.env.RAVRADAR_SOURCE_PRODUCER_CURRENT_FAMILY,'current');
  const pin=await readSavedWorkFile('source-saved-current-pin.json');
  const {documentRequest:request,storage}=createProtectedPrivateRuntimeClients();
  assert.deepEqual(await pinCurrentProtectedPrivateProductionRuntime({request}),pin,'SOURCE_SAVED_CURRENT_PIN_CHANGED');
  const {modelBinding,contractHashes,datasetId,productionReferenceAt,generatedAt,bundleContentSha256}=pin.descriptor;
  assert.equal(productionReferenceAt,sourceProducerReferenceHour(process.env.RAVRADAR_PRODUCTION_TARGET_HOUR));
  const restored=await restoreProtectedPrivateProductionRuntime({
    privateRoot:process.env.RAVRADAR_PRIVATE_RUNTIME_ROOT,
    bundlePath:process.env.RAVRADAR_PRIVATE_RUNTIME_BUNDLE,
    expected:{modelBinding,contractHashes,datasetId,productionReferenceAt,generatedAt,bundleContentSha256,
      targetReferenceAt:productionReferenceAt,minimumReferenceAt:productionReferenceAt,minimumGeneratedAt:generatedAt},
    request,storage,expectedCurrentPointerVersion:pin.pointerVersion,
  });
  assert(restored.restored===true&&restored.rollbackSelected===false
    &&restored.centralVersion===pin.pointerVersion
    &&restored.productionReferenceAt===productionReferenceAt
    &&restored.bundleContentSha256===bundleContentSha256,'SOURCE_SAVED_CURRENT_RESTORE_MISMATCH');
  assert.deepEqual(await pinCurrentProtectedPrivateProductionRuntime({request}),pin,'SOURCE_SAVED_CURRENT_PIN_CHANGED');
  console.log('Verified saved SOURCE CURRENT restored without a provider request.');
}

async function verifySavedPair(){
  assertSourceProducerSavedWeatherCaller(process.env);
  assert.equal(process.env.RAVRADAR_SOURCE_PRODUCER_SOURCE_ACTIVE,'true');
  assert.equal(process.env.RAVRADAR_SOURCE_PRODUCER_CURRENT_FAMILY,'current');
  const currentPin=await readSavedWorkFile('source-saved-current-pin.json');
  const savedPair=await readSavedWorkFile('source-saved-pair.json');
  assert.equal(savedPair.productionReferenceAt,sourceProducerReferenceHour(process.env.RAVRADAR_PRODUCTION_TARGET_HOUR));
  await verifySavedSourcePairReadback({currentPin,savedPair,privateRoot:process.env.RAVRADAR_PRIVATE_RUNTIME_ROOT,
    bundlePath:process.env.RAVRADAR_PRIVATE_RUNTIME_BUNDLE});
  assertSourceProducerSavedWeatherCaller(process.env);
  console.log('Verified saved SOURCE pair is still exact after private runtime packaging.');
}

async function verifySavedHandoff(){
  assertSourceProducerSavedWeatherCaller(process.env);
  assert.equal(process.env.RAVRADAR_SOURCE_PRODUCER_SOURCE_ACTIVE,'true');
  assert.equal(process.env.RAVRADAR_SOURCE_PRODUCER_CURRENT_FAMILY,'current');
  const handoffRoot=process.env.RAVRADAR_OPERATIONAL_HANDOFF;
  assert(typeof handoffRoot==='string'&&path.isAbsolute(handoffRoot));
  const readHandoff=(name,max=16*1024)=>readExactJson(path.join(handoffRoot,name),max);
  const [handoff,disposition,manifest,savedPair,publicManifest]=await Promise.all([
    readHandoff('handoff.json'),readHandoff('checkpoint-disposition.json'),readHandoff('manifest.json',1024*1024),
    readSavedWorkFile('source-saved-pair.json'),readExactJson(savedWorkFile('saved-handoff-live-manifest.json'),1024*1024),
  ]);
  assert(handoff.action==='integrated'&&handoff.codeOnlyRepair===false&&handoff.savedWeatherContinuation===true
    &&handoff.legacySourceRequired===false&&handoff.sourceRepairId===null&&handoff.sourceHead===process.env.GITHUB_SHA);
  assert(handoff.checkpointBuildOutcome==='success'&&handoff.checkpointSaveOutcome==='skipped'
    &&handoff.checkpointPublishOutcome==='skipped');
  const {bindingSha256,...binding}=disposition;
  assert.equal(sha256CanonicalJson(binding),bindingSha256);
  assert.equal(handoff.checkpointDispositionSha256,bindingSha256);
  assert.equal(handoff.checkpointDisposition,'SAVED_PAIR_READBACK_VERIFIED');
  assert.equal(disposition.disposition,handoff.checkpointDisposition);
  const expectedProof={...savedPair,sourceHead:process.env.GITHUB_SHA,runId:Number(process.env.GITHUB_RUN_ID),
    runAttempt:1,targetManifestSha256:sha256CanonicalJson(manifest)};
  assert.deepEqual(disposition.savedPairReadback,expectedProof);
  assert.equal(manifest.datasetId,savedPair.datasetId);
  assert.equal(manifest.productionReferenceAt,savedPair.productionReferenceAt);
  assert.equal(savedPair.productionReferenceAt,sourceProducerReferenceHour(process.env.RAVRADAR_PRODUCTION_TARGET_HOUR));
  assert(Date.parse(manifest.productionReferenceAt)>Date.parse(publicManifest.productionReferenceAt),
    'SOURCE_SAVED_HANDOFF_REQUIRES_NEWER_TARGET');
  const pagesManifest=await readExactJson(path.resolve('_site/data/live/manifest.json'),1024*1024);
  assert.equal(sha256CanonicalJson(pagesManifest),expectedProof.targetManifestSha256);
  await verifySavedSourcePairPublishedPins({savedPair});
  assertSourceProducerSavedWeatherCaller(process.env);
  console.log('Verified saved SOURCE pair and exact staged target before Pages upload.');
}

export async function reconcileSourceProducerCodeOnly(){
  requireSourceProducerOutput(); // FIRST before argv, environment or file/client use.
  assert.equal(arguments.length,0);
  if(process.argv.length===3&&process.argv[2]==='--saved-current-restore')return restoreSavedWeatherCurrent();
  if(process.argv.length===3&&process.argv[2]==='--saved-pair-verify-rebuilt')return verifySavedPair();
  if(process.argv.length===3&&process.argv[2]==='--saved-pair-verify-handoff')return verifySavedHandoff();
  assert.equal(process.argv.length,2);
  const output=process.env.GITHUB_OUTPUT;
  assert(typeof output==='string'&&path.isAbsolute(output)&&!/[\r\n\0]/.test(output));
  const outputPath=path.resolve(output),outputStat=await fs.lstat(outputPath);
  assert(outputStat.isFile()&&!outputStat.isSymbolicLink());assert.equal(await fs.realpath(outputPath),outputPath);
  const savedWeather=process.env.RAVRADAR_SOURCE_PRODUCER_SAVED_WEATHER==='true';
  if(savedWeather)assertSourceProducerSavedWeatherCaller(process.env);
  const {savedPair,...result}=await reconcileSourceCodeOnlyPrivateRuntimeCheckpoint({
    privateRoot:process.env.RAVRADAR_PRIVATE_RUNTIME_ROOT,bundlePath:process.env.RAVRADAR_PRIVATE_RUNTIME_BUNDLE,
    ...(savedWeather?{currentPin:await readSavedWorkFile('source-saved-current-pin.json')}:{})});
  // Preserve the bounded actual readback outcome before writing job metadata.
  // Failure of a local output file must not erase evidence of a committed CAS.
  console.log(JSON.stringify({kind:'SOURCE_CODE_ONLY_PRIVATE_B_S_RECONCILE',...result}));
  if(savedWeather){
    assert(savedPair&&result.paired===true&&result.checkpointPublishCalls===0);
    assertSourceProducerSavedWeatherCaller(process.env);
    await fs.writeFile(savedWorkFile('source-saved-pair.json'),JSON.stringify(savedPair)+'\n',{flag:'wx',mode:0o600});
  }
  await fs.appendFile(outputPath,'paired='+result.paired+'\n');
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))await reconcileSourceProducerCodeOnly().catch(()=>{
  console.error('SOURCE_CODE_ONLY_B_S_RECONCILE_REFUSED');process.exitCode=1;
});
