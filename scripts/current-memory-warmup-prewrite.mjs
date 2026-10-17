#!/usr/bin/env node
// Fixed native0600 -> issued current-memory warmup metadata proof, NEVER a SQL installer.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import {createReadStream} from 'node:fs';
import {execFile as callbackExec} from 'node:child_process';
import {promisify} from 'node:util';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {prepareCurrentMemoryWarmupRuntimeTransition,assertCurrentMemoryWarmupRuntimeTransitionPrepared}
  from './current-memory-warmup-runtime-transition.mjs';
import {assertExactRuntimeInventory,assertRestoredOriginalInventory,validatePredecessorIdentity,validatePredecessorManifest} from './migrate-post-cutover-private-runtime.mjs';
import {withCurrentMemoryWarmupPredecessorSource} from './check-current-memory-warmup-predecessor-source.mjs';
import {CURRENT_MEMORY_WARMUP_BEFORE as OLD,requireCurrentMemoryWarmupBinding} from './lib/current-memory-warmup-successor-source.mjs';
import {ravScoreModelBinding as integratedBinding} from '../js/core/ravscore-model-contract.js';
import {ravScoreModelBinding as candidateBinding} from './rollback-assets/ravscore-model-contract.js';
import {privateRuntimeContractHashes} from './private-production-runtime-workflow.mjs';
import {createProtectedPrivateRuntimeClients} from './protected-private-production-runtime.mjs';
import {createProtectedRavScoreCheckpointRequester} from './protected-ravscore-continuation-checkpoint.mjs';
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),execute=promisify(callbackExec);
async function digest(file){const hash=crypto.createHash('sha256');let bytes=0;for await(const chunk of createReadStream(file)){hash.update(chunk);bytes+=chunk.length;}return {bytes,sha256:hash.digest('hex')};}

export async function verifyCurrentMemoryWarmupPrewritePreservation(options){
  assert.equal(arguments.length,1);assert(options&&Object.getPrototypeOf(options)===Object.prototype);
  assert.deepEqual(Object.keys(options).sort(),['bundleManifestPath','checkpointRequest','predecessorDescriptorPath','preparedRuntimeRoot','reportPath','request','sourceRoot','targetReferenceAt','workdir']);
  const {preparedRuntimeRoot,reportPath,...source}=options;
  // Original authority is the actual normal B/S preparation, never the report.
  const token=await prepareCurrentMemoryWarmupRuntimeTransition(source);
  await assertCurrentMemoryWarmupRuntimeTransitionPrepared(token);
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
  await assertCurrentMemoryWarmupRuntimeTransitionPrepared(token);
  for(const file of expected)assert.deepEqual(await digest(path.join(prepared,file.relativePath)),await digest(path.join(token.outputRoot,file.relativePath)));
  return Object.freeze({kind:'CURRENT_MEMORY_WARMUP_ORIGINALS_AND_PREPARED_RUNTIME_VERIFIED',admission:'NO_ADMISSION',
    originalReferenceAt:token.originalReferenceAt,targetReferenceAt:token.targetReferenceAt,
    numericalChanges:0,repairedContinuationCount:0,recomputedModeCount:0,recomputedZoneCount:0,partCount:673,
    privatePayloadIncluded:false,installationPerformed:false});
}

// Route selection is not admission. The normal protected predecessor restore
// has already authenticated the source; recheck its exact sealed envelope and
// every restored byte before selecting this one fixed metadata-only bridge.
export async function selectCurrentMemoryWarmupMetadataRoute(options){
  const next=requireCurrentMemoryWarmupBinding();
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
  // it a native0600 transition merely because the current source is newer.
  const nativeCandidate=identity.modelBinding.modelBundleSha256===OLD.integrated
    || identity.contractHashes.continuationStateContractSha256===OLD.continuation;
  if(!nativeCandidate)return false;
  return withCurrentMemoryWarmupPredecessorSource(async frozenRoot=>{
    const load=p=>import(pathToFileURL(path.join(frozenRoot,p)).href);
    const [oldModel,oldWorkflow,oldBundle]=await Promise.all([load('js/core/ravscore-model-contract.js'),
      load('scripts/private-production-runtime-workflow.mjs'),load('scripts/private-production-runtime-bundle.mjs')]);
    const oldContracts=await oldWorkflow.privateRuntimeContractHashes({repositoryRoot:frozenRoot});
    assert.equal(identity.modelBinding.modelBundleSha256,OLD.integrated);
    assert.equal(identity.contractHashes.continuationStateContractSha256,OLD.continuation);
    assert.deepEqual(identity.modelBinding,oldModel.ravScoreModelBinding(),'Whole genuine native0600 source binding');
    assert.deepEqual(identity.contractHashes,oldContracts,'Whole genuine native0600 source contracts');
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

export function assertCurrentMemoryWarmupPrewriteCaller(environment){
  assert.equal(arguments.length,1);
  assert.equal(environment.GITHUB_EVENT_NAME,'workflow_dispatch');assert.equal(environment.GITHUB_REF,'refs/heads/main');
  assert.equal(environment.GITHUB_RUN_ATTEMPT,'1');assert.match(environment.GITHUB_RUN_ID??'',/^[1-9][0-9]*$/);
  assert.match(environment.GITHUB_SHA??'',/^[a-f0-9]{40}$/);
  assert.equal(environment.GITHUB_WORKFLOW,'Deploy RavRadar code-only repair');
  assert(['true','false'].includes(environment.RAVRADAR_CURRENT_MEMORY_WARMUP_UPGRADE_OPT_IN));
  if(environment.RAVRADAR_CURRENT_MEMORY_WARMUP_UPGRADE_OPT_IN==='false')assert.equal(environment.RAVRADAR_CURRENT_MEMORY_WARMUP_PHASE,'installed');
  assert.equal(environment.RAVRADAR_CURRENT_MEMORY_WARMUP_CONFIRMATION,'DEPLOY-CODE-ONLY-REPAIR');
  assert.notEqual(environment.RAVRADAR_CURRENT_MEMORY_WARMUP_SAVED_WEATHER,'true');assert.equal(environment.RAVRADAR_CURRENT_MEMORY_WARMUP_RECOVERY_RUN_ID,'');
  assert.equal(environment.RAVRADAR_CURRENT_MEMORY_WARMUP_WRITER_ACTIVE,'false');
  assert.equal(environment.RAVRADAR_CURRENT_MEMORY_WARMUP_RECOVERY_GATE_RESULT,'success');
  for(const key of ['RAVRADAR_USERDATA_UPGRADE_OPT_IN','RAVRADAR_ACCOUNT_ASSISTANT_UPGRADE_OPT_IN',
    'RAVRADAR_STATISTICS_REVISION_UPGRADE_OPT_IN','RAVRADAR_CURRENT_GRID_UPGRADE_OPT_IN','RAVRADAR_KNOWLEDGE_UPGRADE_OPT_IN'])
    assert.notEqual(environment[key],'true','Fixed current-memory warmup phase cannot combine historical grants');
}
async function main(){
  assert.deepEqual(process.argv.slice(2).slice(0,1),['--slot']);assert.equal(process.argv.length,4);
  const slot=process.argv[3];assert(['select','proof','final'].includes(slot));
  if(slot==='select'){
    const selected=await selectCurrentMemoryWarmupMetadataRoute({
      sourceRoot:process.env.RAVRADAR_PREDECESSOR_PRIVATE_RESTORE,
      bundleManifestPath:path.join(process.env.RAVRADAR_PREDECESSOR_PRIVATE_BUNDLE,'manifest.json'),
      predecessorDescriptorPath:path.join(process.env.RAVRADAR_OPERATIONAL_WORK,'target-private-runtime-source.json')});
    if(selected)assertCurrentMemoryWarmupPrewriteCaller(process.env);
    assert.equal(typeof process.env.GITHUB_ENV,'string');assert(process.env.GITHUB_ENV.length>0);
    await fs.appendFile(process.env.GITHUB_ENV,'RAVRADAR_CURRENT_MEMORY_WARMUP_METADATA_ONLY='+selected+'\n');
    console.log('Exact native0600 metadata bridge selection completed; no state admission or remote writes.');return;
  }
  assertCurrentMemoryWarmupPrewriteCaller(process.env); // Before clients, files or credential use.
  const gitEnvironment=Object.fromEntries(['PATH','Path','SystemRoot','WINDIR','TEMP','TMP','LANG','LC_ALL']
    .filter(k=>typeof process.env[k]==='string').map(k=>[k,process.env[k]]));
  const read=async args=>(await execute('git',['-C',ROOT,...args],{encoding:'utf8',timeout:30000,maxBuffer:65536,env:gitEnvironment})).stdout.trim();
  assert.equal(await read(['rev-parse','HEAD^{commit}']),process.env.GITHUB_SHA);
  assert.equal(await read(['rev-parse','origin/main^{commit}']),process.env.GITHUB_SHA);
  const temporary=await fs.realpath(process.env.RUNNER_TEMP),workdir=path.join(temporary,'ravradar-current-memory-warmup-'+process.env.GITHUB_RUN_ID+'-'+process.env.GITHUB_RUN_ATTEMPT+'-'+slot);
  assert.equal(path.dirname(workdir),temporary);assert(!workdir.startsWith(ROOT+path.sep));
  const {documentRequest}=createProtectedPrivateRuntimeClients({storageBackend:'supabase'});
  const result=await verifyCurrentMemoryWarmupPrewritePreservation({
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
  await fs.appendFile(process.env.GITHUB_ENV,'RAVRADAR_CURRENT_MEMORY_WARMUP_ORIGINALS_VERIFIED=true\nRAVRADAR_CURRENT_MEMORY_WARMUP_NOLOSS_VERIFIED=true\nRAVRADAR_CURRENT_MEMORY_WARMUP_PREWRITE_VERIFIED=true\n');
  console.log('Exact native0600 original B/S and whole prepared metadata-only successor reverified; no SQL or remote writes.');
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))await main().catch(()=>{
  // An assertion can carry complete private state; no raw error/stack/diff.
  console.error('CURRENT_MEMORY_WARMUP_PREWRITE_FAILED_DO_NOT_RETRY');process.exitCode=1;
});
