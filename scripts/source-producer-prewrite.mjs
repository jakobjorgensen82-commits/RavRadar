// Fixed authenticated588 -> SOURCE589 SAME_H0 preparation and final preservation
// proof. Never SQL/publication authority. Keep the normal585 caller unchanged.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import {createReadStream} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {requireSourceProducerOutput} from './lib/source-producer-successor-source.mjs';
import {assertSourceProducerCodeOnlyCaller} from './select-source-producer-code-only-source.mjs';
import {prepareSourceProducerRuntimeTransition,assertSourceProducerRuntimeTransitionPrepared}
  from './source-producer-runtime-transition.mjs';
import {assertExactRuntimeInventory} from './migrate-post-cutover-private-runtime.mjs';
import {createProtectedPrivateRuntimeClients,buildProtectedPrivateRuntimeArchive,
  validateProtectedPrivateRuntimeDescriptor,PROTECTED_PRIVATE_RUNTIME_POLICY} from './protected-private-production-runtime.mjs';
import {canonicalPrivateRuntimeJson} from './private-production-runtime-bundle.mjs';
import {createProtectedRavScoreCheckpointRequester} from './protected-ravscore-continuation-checkpoint.mjs';

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
async function digest(file){const hash=crypto.createHash('sha256');let bytes=0;
  for await(const chunk of createReadStream(file)){hash.update(chunk);bytes+=chunk.length;}return {bytes,sha256:hash.digest('hex')};}
async function noLinks(file){let at=path.parse(file).root;for(const part of path.relative(at,file).split(path.sep).filter(Boolean)){
  at=path.join(at,part);assert(!(await fs.lstat(at)).isSymbolicLink(),'No aliased prepared runtime');}}
function absoluteEnvironmentPath(name){const value=process.env[name];
  assert(typeof value==='string'&&path.isAbsolute(value),name+' requires an absolute path');
  assert(!/[\r\n\0]/.test(value));return path.resolve(value);}

// Scalar evidence only, never a capacity reservation or SQL/publication token.
// The fixed final-slot caller below obtains both operands from normal owners.
export function summarizeSourceProducerPreparedCapacity(options){
  assert.equal(arguments.length,1);assert(options&&Object.getPrototypeOf(options)===Object.prototype);
  assert.deepEqual(Object.keys(options).sort(),['archiveMetrics','descriptor','measurementCompletedAt',
    'measurementStartedAt','storageBackend','usage']);
  const {archiveMetrics,measurementStartedAt,measurementCompletedAt,storageBackend,usage}=options;
  assert.equal(storageBackend,'r2','SOURCE first-install capacity requires the actual R2 backend');
  const descriptor=validateProtectedPrivateRuntimeDescriptor(options.descriptor);
  assert.equal(descriptor.schemaVersion,PROTECTED_PRIVATE_RUNTIME_POLICY.schemaVersion);
  assert.deepEqual(Object.keys(usage).sort(),['objectCount','usedBytes']);
  for(const key of ['usedBytes','objectCount'])assert(Number.isSafeInteger(usage[key])&&usage[key]>=0);
  assert.deepEqual(Object.keys(archiveMetrics).sort(),['envelopeBytes','largestObjectBytes','objectBytes','objectCount','rawPayloadBytes']);
  for(const value of Object.values(archiveMetrics))assert(Number.isSafeInteger(value)&&value>0);
  assert.equal(archiveMetrics.objectBytes,descriptor.objectBytes);
  assert.equal(archiveMetrics.objectCount,descriptor.objectCount);
  assert.equal(archiveMetrics.largestObjectBytes,Math.max(...descriptor.objects.map(value=>value.objectBytes)));
  for(const value of [measurementStartedAt,measurementCompletedAt])
    assert.equal(new Date(value).toISOString(),value,'Canonical measured UTC period');
  assert(Date.parse(measurementCompletedAt)>=Date.parse(measurementStartedAt));
  const safetyCapBytes=2_000_000_000,projectedPeakBytes=usage.usedBytes+archiveMetrics.objectBytes;
  assert(Number.isSafeInteger(projectedPeakBytes)&&projectedPeakBytes<=safetyCapBytes,
    'SOURCE prepared B exceeds the unchanged R2 safety cap before SQL');
  return Object.freeze({schemaVersion:1,kind:'SOURCE_PREPARED_B_R2_CAPACITY_OBSERVATION',
    admission:'NO_ADMISSION',storageBackend,bucketId:descriptor.bucketId,measurementStartedAt,measurementCompletedAt,
    sourceHead:descriptor.sourceHead,productionReferenceAt:descriptor.productionReferenceAt,
    bundleContentSha256:descriptor.bundleContentSha256,
    archiveSha256:descriptor.objectSha256,
    descriptorSha256:crypto.createHash('sha256').update(canonicalPrivateRuntimeJson(descriptor)).digest('hex'),
    usedBytes:usage.usedBytes,bucketObjectCount:usage.objectCount,objectBytes:archiveMetrics.objectBytes,
    archiveObjectCount:archiveMetrics.objectCount,largestObjectBytes:archiveMetrics.largestObjectBytes,
    projectedPeakBytes,safetyCapBytes,cleanupCreditBytes:0,reservation:false,remoteWrites:false,
    privatePayloadIncluded:false});
}

export async function verifySourceProducerPrewritePreservation(options){
  requireSourceProducerOutput(); // FIRST, before caller options or any I/O.
  assert.equal(arguments.length,1);assert(options&&Object.getPrototypeOf(options)===Object.prototype);
  assert.deepEqual(Object.keys(options).sort(),['bundleManifestPath','checkpointRequest','predecessorDescriptorPath',
    'preparedRuntimeRoot','reportPath','request','sourceRoot','targetReferenceAt','workdir']);
  const {preparedRuntimeRoot,reportPath,...source}=options;
  // Fresh normal authenticated B/S preparation supplies the only authority.
  // Saved JSON, flags and a previously emitted report cannot mint this token.
  const token=await prepareSourceProducerRuntimeTransition(source);
  await assertSourceProducerRuntimeTransitionPrepared(token);
  const resolved=path.resolve(preparedRuntimeRoot),prepared=await fs.realpath(resolved);
  assert.equal(prepared,resolved);
  const expected=await assertExactRuntimeInventory(token.outputRoot);
  const expectedReport=JSON.parse(await fs.readFile(token.normalBReportPath,'utf8'));
  assert.equal(expectedReport.transitionKind,'MODEL_BINDING_METADATA_ONLY');
  const reportFile=path.resolve(reportPath);
  async function compareActualPrepared(){
    await noLinks(prepared);assert.equal(await fs.realpath(prepared),resolved);
    assert.deepEqual(await assertExactRuntimeInventory(prepared),expected,'Exact whole prepared SOURCE B inventory');
    for(const file of expected)assert.deepEqual(await digest(path.join(prepared,file.relativePath)),
      await digest(path.join(token.outputRoot,file.relativePath)),'Every actual prepared B byte must equal the fresh normal producer');
    await noLinks(reportFile);assert.equal(await fs.realpath(reportFile),reportFile);
    assert((await fs.lstat(reportFile)).isFile());
    assert.deepEqual(JSON.parse(await fs.readFile(reportFile,'utf8')),expectedReport,
      'Whole combined normal metadata/origin report, not selected hashes');
  }
  await compareActualPrepared();
  await assertSourceProducerRuntimeTransitionPrepared(token);
  // The final awaited B/S check is not an exclusive lock on the other copy.
  // Re-read its actual inventory, paths, every byte AND report afterwards;
  // hashing only the earlier list would miss an added file or aliased report.
  await compareActualPrepared();
  return Object.freeze({kind:'SOURCE_PRODUCER_ORIGINALS_AND_PREPARED_RUNTIME_VERIFIED',admission:'NO_ADMISSION',
    originalReferenceAt:token.originalReferenceAt,targetReferenceAt:token.targetReferenceAt,
    numericalChanges:0,repairedContinuationCount:0,recomputedModeCount:0,recomputedZoneCount:0,
    partCount:673,privatePayloadIncluded:false,installationPerformed:false});
}

export async function runSourceProducerPrewrite(){
  requireSourceProducerOutput(); // No argument/environment/path authority while unissued.
  assert.equal(arguments.length,0);assertSourceProducerCodeOnlyCaller(process.env);
  assert.equal(process.env.RAVRADAR_SOURCE_PRODUCER_SOURCE_ACTIVE,'true');
  assert.equal(process.env.RAVRADAR_SOURCE_PRODUCER_CURRENT_FAMILY,'predecessor');
  assert.equal(process.env.RAVRADAR_SOURCE_PRODUCER_PHASE,'before');
  assert.equal(process.env.RAVRADAR_SOURCE_PRODUCER_UPGRADE_OPT_IN,'true');
  assert.equal(process.argv.length,4);assert.equal(process.argv[2],'--slot');
  const slot=process.argv[3];assert(['prepare','final'].includes(slot));
  const gitEnvironment=Object.fromEntries(['PATH','Path','SystemRoot','WINDIR','TEMP','TMP','LANG','LC_ALL']
    .filter(key=>typeof process.env[key]==='string').map(key=>[key,process.env[key]]));
  const read=args=>execFileSync('git',['-C',ROOT,...args],{encoding:'utf8',timeout:30000,maxBuffer:65536,env:gitEnvironment}).trim();
  assert.equal(read(['rev-parse','HEAD^{commit}']),process.env.GITHUB_SHA);
  assert.equal(read(['rev-parse','origin/main^{commit}']),process.env.GITHUB_SHA);
  const temporary=await fs.realpath(absoluteEnvironmentPath('RUNNER_TEMP'));
  const workdir=path.join(temporary,'ravradar-source-producer-'+process.env.GITHUB_RUN_ID+'-'+process.env.GITHUB_RUN_ATTEMPT+'-'+slot);
  assert.equal(path.dirname(workdir),temporary);assert(!workdir.startsWith(ROOT+path.sep)&&workdir!==ROOT);
  const {documentRequest:request,storage}=createProtectedPrivateRuntimeClients();
  const options={sourceRoot:absoluteEnvironmentPath('RAVRADAR_PREDECESSOR_PRIVATE_RESTORE'),
    bundleManifestPath:path.join(absoluteEnvironmentPath('RAVRADAR_PREDECESSOR_PRIVATE_BUNDLE'),'manifest.json'),
    predecessorDescriptorPath:path.join(absoluteEnvironmentPath('RAVRADAR_OPERATIONAL_WORK'),'target-private-runtime-source.json'),
    targetReferenceAt:process.env.RAVRADAR_PRODUCTION_TARGET_HOUR,workdir,request,
    checkpointRequest:createProtectedRavScoreCheckpointRequester()};
  const reportPath=path.join(ROOT,'.geometry-v2-work/post-cutover-private-runtime-migration.json');
  const envPath=absoluteEnvironmentPath('GITHUB_ENV');
  if(slot==='prepare'){
    const token=await prepareSourceProducerRuntimeTransition(options);
    await assertSourceProducerRuntimeTransitionPrepared(token);
    assert.equal(token.originalReferenceAt,token.targetReferenceAt,'Exact authenticated SAME_H0');
    await fs.mkdir(path.dirname(reportPath),{recursive:true});
    await fs.writeFile(reportPath,await fs.readFile(token.normalBReportPath),{flag:'wx',mode:0o600});
    assert(!/[\r\n\0]/.test(token.outputRoot));
    await fs.appendFile(envPath,'RAVRADAR_MIGRATED_PRIVATE_RUNTIME_RESTORE='+token.outputRoot+'\n'
      +'RAVRADAR_SOURCE_PRODUCER_METADATA_ONLY=true\n'
      +'RAVRADAR_SOURCE_PRODUCER_ORIGINALS_VERIFIED=true\n'
      +'RAVRADAR_SOURCE_PRODUCER_NOLOSS_VERIFIED=true\n'
      +'RAVRADAR_SOURCE_PRODUCER_PREWRITE_VERIFIED=true\n');
    console.log('Exact original588 B/S SOURCE metadata handoff prepared; no remote writes.');return;
  }
  // Only the first SOURCE installation's final slot: pack the ALREADY created
  // normal B bundle. No second bundle, upload, SQL, pruning or ordinary-weather step.
  const storageBackend=process.env.RAVRADAR_PRIVATE_RUNTIME_STORAGE_BACKEND;
  assert.equal(storageBackend,'r2','No Supabase/default/unknown backend estimate');
  assert.equal(typeof storage.bucketUsage,'function');
  const measurementStartedAt=new Date().toISOString();
  const packed=await buildProtectedPrivateRuntimeArchive({
    privateRoot:absoluteEnvironmentPath('RAVRADAR_PRIVATE_RUNTIME_ROOT'),
    bundlePath:absoluteEnvironmentPath('RAVRADAR_PRIVATE_RUNTIME_BUNDLE'),repositoryRoot:ROOT,
    expected:JSON.parse(await fs.readFile(path.join(ROOT,'.cache/private-production-runtime-expected.json'),'utf8')),
    sourceHead:process.env.GITHUB_SHA});
  const usage=await storage.bucketUsage(); // Metadata only; keep per-PUT fresh checks unchanged.
  const capacity=summarizeSourceProducerPreparedCapacity({descriptor:packed.descriptor,archiveMetrics:packed.archiveMetrics,
    storageBackend,usage,measurementStartedAt,measurementCompletedAt:new Date().toISOString()});
  // Release local archive buffers before the fresh full original/prepared comparison.
  packed.archive=null;packed.objects=null;
  // Exactly one fresh final comparison after artifact gates. Do not add a
  // duplicate middle proof of the same unchanged preparation.
  const result=await verifySourceProducerPrewritePreservation({...options,
    preparedRuntimeRoot:absoluteEnvironmentPath('RAVRADAR_MIGRATED_PRIVATE_RUNTIME_RESTORE'),reportPath});
  assert.equal(result.originalReferenceAt,result.targetReferenceAt);
  assert.equal(capacity.productionReferenceAt,result.targetReferenceAt,'Capacity observation is the exact SAME_H0 prepared target');
  await fs.writeFile(path.join(ROOT,'.geometry-v2-work/source-producer-pre-sql-capacity.json'),
    JSON.stringify(capacity)+'\n',{flag:'wx',mode:0o600});
  console.log(JSON.stringify(capacity)); // Only scalar counts/hashes; never archive/descriptor payload.
  await fs.appendFile(envPath,'RAVRADAR_SOURCE_PRODUCER_ORIGINALS_VERIFIED=true\n'
    +'RAVRADAR_SOURCE_PRODUCER_NOLOSS_VERIFIED=true\n'
    +'RAVRADAR_SOURCE_PRODUCER_PREWRITE_VERIFIED=true\n');
  console.log('Exact original588 B/S and complete prepared SOURCE metadata reverified; no SQL or remote writes.');
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))await runSourceProducerPrewrite().catch(()=>{
  // Assertions can contain private values. Only this fixed category is public.
  console.error('SOURCE_PRODUCER_PREWRITE_REFUSED');process.exitCode=1;
});
