#!/usr/bin/env node
// Fixed genuine0200 -> established-origin metadata proof, NEVER a SQL installer.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import {createReadStream} from 'node:fs';
import {execFile as callbackExec} from 'node:child_process';
import {promisify} from 'node:util';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {prepareEstablishedNativeCurrentOriginRuntimeTransition,assertEstablishedNativeCurrentOriginRuntimeTransitionPrepared}
  from './established-native-current-origin-runtime-transition.mjs';
import {assertExactRuntimeInventory,assertRestoredOriginalInventory,validatePredecessorIdentity,validatePredecessorManifest} from './migrate-post-cutover-private-runtime.mjs';
import {withNativeCurrentReanalysisPredecessorSource as withEstablishedNativeCurrentOriginPredecessorSource}
  from './check-native-current-reanalysis-predecessor-source.mjs';
import {ESTABLISHED_NATIVE_CURRENT_ORIGIN_BEFORE as OLD,requireEstablishedNativeCurrentOriginBinding} from './lib/established-native-current-origin-successor-source.mjs';
import {ravScoreModelBinding as integratedBinding} from '../js/core/ravscore-model-contract.js';
import {ravScoreModelBinding as candidateBinding} from './rollback-assets/ravscore-model-contract.js';
import {privateRuntimeContractHashes} from './private-production-runtime-workflow.mjs';
import {createProtectedPrivateRuntimeClients} from './protected-private-production-runtime.mjs';
import {createProtectedRavScoreCheckpointRequester} from './protected-ravscore-continuation-checkpoint.mjs';
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),execute=promisify(callbackExec);
async function digest(file){const hash=crypto.createHash('sha256');let bytes=0;for await(const chunk of createReadStream(file)){hash.update(chunk);bytes+=chunk.length;}return {bytes,sha256:hash.digest('hex')};}

export async function verifyEstablishedNativeCurrentOriginPrewritePreservation(options){
  assert.equal(arguments.length,1);assert(options&&Object.getPrototypeOf(options)===Object.prototype);
  assert.deepEqual(Object.keys(options).sort(),['bundleManifestPath','checkpointRequest','predecessorDescriptorPath','preparedRuntimeRoot','reportPath','request','sourceRoot','targetReferenceAt','workdir']);
  const {preparedRuntimeRoot,reportPath,...source}=options;
  // Original authority is the actual normal B/S preparation, never the report.
  const token=await prepareEstablishedNativeCurrentOriginRuntimeTransition(source);
  await assertEstablishedNativeCurrentOriginRuntimeTransitionPrepared(token);
  const resolved=path.resolve(preparedRuntimeRoot),prepared=await fs.realpath(resolved);
  assert.equal(prepared,resolved,'Prepared runtime cannot traverse a link or alias');
  let at=path.parse(resolved).root;for(const part of path.relative(at,resolved).split(path.sep).filter(Boolean)){
    at=path.join(at,part);assert(!(await fs.lstat(at)).isSymbolicLink());}
  const expected=await assertExactRuntimeInventory(token.outputRoot),actual=await assertExactRuntimeInventory(prepared);
  assert.deepEqual(actual,expected,'Exact entire prepared B inventory');
  for(const file of expected)assert.deepEqual(await digest(path.join(prepared,file.relativePath)),await digest(path.join(token.outputRoot,file.relativePath)),
    'Actual prepared successor bytes must equal this fresh original-authenticated normal migration');
  const report=JSON.parse(await fs.readFile(reportPath,'utf8'));
  // Persisted normal reports deliberately omit the return-only recompute
  // counters. Require the ENTIRE actual report to equal this fresh normal
  // producer report; the authenticated token already proves all zero counters.
  assert.deepEqual(report,JSON.parse(await fs.readFile(token.normalBReportPath,'utf8')),'Whole actual normal migration report');
  assert.equal(report.transitionKind,'MODEL_BINDING_METADATA_ONLY');
  // Fresh original pointers/S and both prepared inventories are checked again
  // after comparison. The token cannot be serialized into later permission.
  await assertEstablishedNativeCurrentOriginRuntimeTransitionPrepared(token);
  for(const file of expected)assert.deepEqual(await digest(path.join(prepared,file.relativePath)),await digest(path.join(token.outputRoot,file.relativePath)));
  return Object.freeze({kind:'ESTABLISHED_NATIVE_CURRENT_ORIGIN_ORIGINALS_AND_PREPARED_RUNTIME_VERIFIED',admission:'NO_ADMISSION',
    originalReferenceAt:token.originalReferenceAt,targetReferenceAt:token.targetReferenceAt,
    numericalChanges:0,repairedContinuationCount:0,recomputedModeCount:0,recomputedZoneCount:0,partCount:673,
    privatePayloadIncluded:false,installationPerformed:false});
}

// Route selection is not admission. The normal protected predecessor restore
// has already authenticated the source; recheck its exact sealed envelope and
// every restored byte before selecting this one fixed metadata-only bridge.
export async function selectEstablishedNativeCurrentOriginMetadataRoute(options){
  const next=requireEstablishedNativeCurrentOriginBinding();
  assert.equal(arguments.length,1);assert(options&&Object.getPrototypeOf(options)===Object.prototype);
  assert.deepEqual(Object.keys(options).sort(),['bundleManifestPath','predecessorDescriptorPath','sourceRoot']);
  async function readEnvelope(file){
    const resolved=path.resolve(file),stat=await fs.lstat(resolved);
    assert(stat.isFile()&&!stat.isSymbolicLink()&&stat.size>=2&&stat.size<=128*1024);
    assert.equal(await fs.realpath(resolved),resolved);
    return JSON.parse(await fs.readFile(resolved,'utf8'));
  }
  const description=await readEnvelope(options.predecessorDescriptorPath);
  const identity=validatePredecessorIdentity(description,description.sourceHead);
  const manifest=await readEnvelope(options.bundleManifestPath);
  validatePredecessorManifest(manifest,identity.modelBinding,identity);
  const currentI=integratedBinding(),currentC=candidateBinding(),contracts=await privateRuntimeContractHashes();
  assert.equal(currentI.modelBundleSha256,next.I);assert.equal(currentC.modelBundleSha256,next.C);
  assert.equal(contracts.continuationStateContractSha256,next.T);
  // An exact current-family contract rebind or another already approved
  // historical route retains its own existing normal validators. Never label
  // it a issued0200 transition merely because the current source is newer.
  const nativeCandidate=identity.modelBinding.modelBundleSha256===OLD.integrated
    || identity.contractHashes.continuationStateContractSha256===OLD.continuation;
  if(!nativeCandidate)return false;
  return withEstablishedNativeCurrentOriginPredecessorSource(async frozenRoot=>{
    const load=p=>import(pathToFileURL(path.join(frozenRoot,p)).href);
    const [oldModel,oldWorkflow,oldBundle]=await Promise.all([load('js/core/ravscore-model-contract.js'),
      load('scripts/private-production-runtime-workflow.mjs'),load('scripts/private-production-runtime-bundle.mjs')]);
    const oldContracts=await oldWorkflow.privateRuntimeContractHashes({repositoryRoot:frozenRoot});
    assert.equal(identity.modelBinding.modelBundleSha256,OLD.integrated);
    assert.equal(identity.contractHashes.continuationStateContractSha256,OLD.continuation);
    assert.deepEqual(identity.modelBinding,oldModel.ravScoreModelBinding(),'Whole genuine issued0200 source binding');
    assert.deepEqual(identity.contractHashes,oldContracts,'Whole genuine issued0200 source contracts');
    assert.deepEqual({...identity.modelBinding,modelBundleSha256:next.I},currentI,'Unchanged physical model contract');
    assert.deepEqual({...oldContracts,continuationStateContractSha256:next.T},contracts,'Only continuation binding changes');
    const bundlePath=path.dirname(path.resolve(options.bundleManifestPath));
    await oldBundle.verifyPrivateProductionRuntimeBundle({privateRoot:path.dirname(bundlePath),bundlePath,
      repositoryRoot:frozenRoot,expected:{modelBinding:identity.modelBinding,contractHashes:identity.contractHashes,
        datasetId:identity.datasetId,productionReferenceAt:identity.productionReferenceAt,
        generatedAt:identity.generatedAt,bundleContentSha256:identity.bundleContentSha256}});
    await assertRestoredOriginalInventory(path.resolve(options.sourceRoot),manifest);
    // A conflicting/invalid native source throws above, never falls back.
    // B/S numerical/state admission remains the unchanged normal migration
    // and later full original-authenticated proof, not this boolean.
    return true;
  });
}

export function assertEstablishedNativeCurrentOriginPrewriteCaller(environment){
  assert.equal(arguments.length,1);
  assert.equal(environment.GITHUB_EVENT_NAME,'workflow_dispatch');assert.equal(environment.GITHUB_REF,'refs/heads/main');
  assert.equal(environment.GITHUB_RUN_ATTEMPT,'1');assert.match(environment.GITHUB_RUN_ID??'',/^[1-9][0-9]*$/);
  assert.match(environment.GITHUB_SHA??'',/^[a-f0-9]{40}$/);
  assert.equal(environment.GITHUB_WORKFLOW,'Deploy RavRadar code-only repair');
  assert(['true','false'].includes(environment.RAVRADAR_ESTABLISHED_NATIVE_CURRENT_ORIGIN_UPGRADE_OPT_IN));
  assert.equal(environment.RAVRADAR_ESTABLISHED_NATIVE_CURRENT_ORIGIN_PHASE,
    environment.RAVRADAR_ESTABLISHED_NATIVE_CURRENT_ORIGIN_UPGRADE_OPT_IN==='true'?'before':'installed');
  assert.equal(environment.RAVRADAR_ESTABLISHED_NATIVE_CURRENT_ORIGIN_CONFIRMATION,'DEPLOY-CODE-ONLY-REPAIR');
  assert.notEqual(environment.RAVRADAR_ESTABLISHED_NATIVE_CURRENT_ORIGIN_SAVED_WEATHER,'true');assert.equal(environment.RAVRADAR_ESTABLISHED_NATIVE_CURRENT_ORIGIN_RECOVERY_RUN_ID,'');
  assert.equal(environment.RAVRADAR_ESTABLISHED_NATIVE_CURRENT_ORIGIN_WRITER_ACTIVE,'false');
  assert.equal(environment.RAVRADAR_ESTABLISHED_NATIVE_CURRENT_ORIGIN_RECOVERY_GATE_RESULT,'success');
  for(const key of ['RAVRADAR_USERDATA_UPGRADE_OPT_IN','RAVRADAR_ACCOUNT_ASSISTANT_UPGRADE_OPT_IN',
    'RAVRADAR_CURRENT_MEMORY_WARMUP_UPGRADE_OPT_IN',
    'RAVRADAR_STATISTICS_REVISION_UPGRADE_OPT_IN','RAVRADAR_CURRENT_GRID_UPGRADE_OPT_IN','RAVRADAR_KNOWLEDGE_UPGRADE_OPT_IN'])
    assert.notEqual(environment[key],'true','Fixed established-origin phase cannot combine historical grants');
}
async function main(){
  assert.deepEqual(process.argv.slice(2).slice(0,1),['--slot']);assert.equal(process.argv.length,4);
  const slot=process.argv[3];assert(['select','prepare','proof','final'].includes(slot));
  if(slot==='select'){
    const selected=await selectEstablishedNativeCurrentOriginMetadataRoute({
      sourceRoot:process.env.RAVRADAR_PREDECESSOR_PRIVATE_RESTORE,
      bundleManifestPath:path.join(process.env.RAVRADAR_PREDECESSOR_PRIVATE_BUNDLE,'manifest.json'),
      predecessorDescriptorPath:path.join(process.env.RAVRADAR_OPERATIONAL_WORK,'target-private-runtime-source.json')});
    if(selected)assertEstablishedNativeCurrentOriginPrewriteCaller(process.env);
    assert.equal(typeof process.env.GITHUB_ENV,'string');assert(process.env.GITHUB_ENV.length>0);
    await fs.appendFile(process.env.GITHUB_ENV,'RAVRADAR_ESTABLISHED_NATIVE_CURRENT_ORIGIN_METADATA_ONLY='+selected+'\n');
    console.log('Exact issued0200 metadata bridge selection completed; no state admission or remote writes.');return;
  }
  assertEstablishedNativeCurrentOriginPrewriteCaller(process.env); // Before clients, files or credential use.
  const gitEnvironment=Object.fromEntries(['PATH','Path','SystemRoot','WINDIR','TEMP','TMP','LANG','LC_ALL']
    .filter(k=>typeof process.env[k]==='string').map(k=>[k,process.env[k]]));
  const read=async args=>(await execute('git',['-C',ROOT,...args],{encoding:'utf8',timeout:30000,maxBuffer:65536,env:gitEnvironment})).stdout.trim();
  assert.equal(await read(['rev-parse','HEAD^{commit}']),process.env.GITHUB_SHA);
  assert.equal(await read(['rev-parse','origin/main^{commit}']),process.env.GITHUB_SHA);
  const temporary=await fs.realpath(process.env.RUNNER_TEMP),workdir=path.join(temporary,'ravradar-established-native-current-origin-'+process.env.GITHUB_RUN_ID+'-'+process.env.GITHUB_RUN_ATTEMPT+'-'+slot);
  assert.equal(path.dirname(workdir),temporary);assert(!workdir.startsWith(ROOT+path.sep));
  const {documentRequest}=createProtectedPrivateRuntimeClients({storageBackend:'supabase'});
  if(slot==='prepare'){
    const optIn=process.env.RAVRADAR_ESTABLISHED_NATIVE_CURRENT_ORIGIN_UPGRADE_OPT_IN;
    const phase=process.env.RAVRADAR_ESTABLISHED_NATIVE_CURRENT_ORIGIN_PHASE;
    assert((optIn==='true'&&phase==='before')||(optIn==='false'&&phase==='installed'));
    const token=await prepareEstablishedNativeCurrentOriginRuntimeTransition({
      sourceRoot:process.env.RAVRADAR_PREDECESSOR_PRIVATE_RESTORE,
      bundleManifestPath:path.join(process.env.RAVRADAR_PREDECESSOR_PRIVATE_BUNDLE,'manifest.json'),
      predecessorDescriptorPath:path.join(process.env.RAVRADAR_OPERATIONAL_WORK,'target-private-runtime-source.json'),
      targetReferenceAt:process.env.RAVRADAR_PRODUCTION_TARGET_HOUR,workdir,request:documentRequest,
      checkpointRequest:createProtectedRavScoreCheckpointRequester(),
    });
    await assertEstablishedNativeCurrentOriginRuntimeTransitionPrepared(token);
    assert.equal(token.originalReferenceAt,token.targetReferenceAt,'Metadata handoff retains the exact original H0');
    const reportPath=path.join(ROOT,'.geometry-v2-work/post-cutover-private-runtime-migration.json');
    await fs.mkdir(path.dirname(reportPath),{recursive:true});
    await fs.writeFile(reportPath,await fs.readFile(token.normalBReportPath),{flag:'wx',mode:0o600});
    assert.equal(typeof process.env.GITHUB_ENV,'string');assert(process.env.GITHUB_ENV.length>0);
    assert(!token.outputRoot.includes('\n')&&!token.outputRoot.includes('\r'));
    await fs.appendFile(process.env.GITHUB_ENV,
      'RAVRADAR_MIGRATED_PRIVATE_RUNTIME_RESTORE='+token.outputRoot+'\n'
      +'RAVRADAR_ESTABLISHED_NATIVE_CURRENT_ORIGIN_METADATA_ONLY=true\n'
      +'RAVRADAR_ESTABLISHED_NATIVE_CURRENT_ORIGIN_ORIGINALS_VERIFIED=true\n'
      +'RAVRADAR_ESTABLISHED_NATIVE_CURRENT_ORIGIN_NOLOSS_VERIFIED=true\n'
      +'RAVRADAR_ESTABLISHED_NATIVE_CURRENT_ORIGIN_PREWRITE_VERIFIED=true\n');
    console.log('Exact original0200 B/S metadata handoff prepared with private origin; no remote writes.');return;
  }
  const result=await verifyEstablishedNativeCurrentOriginPrewritePreservation({
    sourceRoot:process.env.RAVRADAR_PREDECESSOR_PRIVATE_RESTORE,
    preparedRuntimeRoot:process.env.RAVRADAR_MIGRATED_PRIVATE_RUNTIME_RESTORE,
    bundleManifestPath:path.join(process.env.RAVRADAR_PREDECESSOR_PRIVATE_BUNDLE,'manifest.json'),
    predecessorDescriptorPath:path.join(process.env.RAVRADAR_OPERATIONAL_WORK,'target-private-runtime-source.json'),
    reportPath:path.join(ROOT,'.geometry-v2-work/post-cutover-private-runtime-migration.json'),
    targetReferenceAt:process.env.RAVRADAR_PRODUCTION_TARGET_HOUR,workdir,request:documentRequest,
    checkpointRequest:createProtectedRavScoreCheckpointRequester(),
  });
  assert.equal(result.originalReferenceAt,result.targetReferenceAt,'Code-only upgrade must retain the same actual B/S generation');
  assert.equal(typeof process.env.GITHUB_ENV,'string');assert(process.env.GITHUB_ENV.length>0);
  await fs.appendFile(process.env.GITHUB_ENV,'RAVRADAR_ESTABLISHED_NATIVE_CURRENT_ORIGIN_ORIGINALS_VERIFIED=true\nRAVRADAR_ESTABLISHED_NATIVE_CURRENT_ORIGIN_NOLOSS_VERIFIED=true\nRAVRADAR_ESTABLISHED_NATIVE_CURRENT_ORIGIN_PREWRITE_VERIFIED=true\n');
  console.log('Exact issued0200 original B/S and whole prepared metadata-only successor reverified; no SQL or remote writes.');
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))await main().catch(()=>{
  // An assertion can carry complete private state; no raw error/stack/diff.
  console.error('ESTABLISHED_NATIVE_CURRENT_ORIGIN_PREWRITE_FAILED_DO_NOT_RETRY');process.exitCode=1;
});
