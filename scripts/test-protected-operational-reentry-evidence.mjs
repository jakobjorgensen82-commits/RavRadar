#!/usr/bin/env node

import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import { ravScoreModelBinding } from '../js/core/ravscore-model-contract.js';
import { computeRavScorePublicBrowserClosure } from './lib/ravscore-public-browser-closure.mjs';
import {
  PROTECTED_OPERATIONAL_REENTRY_EVIDENCE_POLICY as policy,
  buildProtectedOperationalEvidenceArchive,
  publishProtectedOperationalEvidence,
  restoreProtectedOperationalEvidence,
  validateProtectedOperationalEvidencePointer,
} from './protected-operational-reentry-evidence.mjs';
import { sha256CanonicalJson } from './ravscore-operational-pages-recovery.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const repository = 'ravradar/RavRadar';
const clone = value => structuredClone(value);

async function fixture(directory, { deploymentId, hour = '10', sourceHead = 'a'.repeat(40) }) {
  await fs.mkdir(directory, { recursive: true });
  const binding = ravScoreModelBinding();
  const closure = (await computeRavScorePublicBrowserClosure({ root })).manifest;
  const contractText = await fs.readFile(path.join(root, 'js/core/ravscore-model-contract.js'), 'utf8');
  const bundleText = await fs.readFile(path.join(root, 'js/core/ravscore-model-bundle.generated.js'), 'utf8');
  const implementation = { implementationClosureSha256: 'e'.repeat(64) };
  const [, runId, runAttempt] = deploymentId.match(/^pages-([0-9]+)-([0-9]+)$/);
  const manifest = {
    schemaVersion: 4,
    generatedAt: `2026-09-19T${hour}:05:00.000Z`,
    productionReferenceAt: `2026-09-19T${hour}:00:00.000Z`,
    datasetId: `rr-20260919${hour}0000-210`,
    complete: true,
    zoneCount: 210,
    coastalPartCount: 673,
    ravScoreModelBinding: clone(binding),
    ravScoreRuntime: { modelBinding: clone(binding) },
  };
  const seal = {
    schemaVersion: 'ravscore-operational-pages-artifact-seal-v1',
    repository,
    runId: Number(runId),
    runAttempt: Number(runAttempt),
    headSha: sourceHead,
    ref: 'refs/heads/main',
    attemptId: deploymentId,
    artifactId: Number(runId) + 1000,
    artifactName: 'github-pages',
    artifactDigestSha256: 'b'.repeat(64),
    artifactSizeBytes: 12345,
    targetPublicManifestSha256: sha256CanonicalJson(manifest),
    targetImplementationClosureSha256: implementation.implementationClosureSha256,
    targetModelBinding: clone(binding),
    createdAt: `2026-09-19T${hour}:06:00.000Z`,
    privatePayloadIncluded: false,
  };
  const handoff = {
    schemaVersion: 'ravscore-operational-deploy-handoff-v2',
    action: 'integrated',
    sourceHead,
    centralVersion: 3,
    legacySourceRequired: false,
    checkpointDisposition: 'READY_PUBLISHED',
    checkpointDispositionSha256: 'c'.repeat(64),
    checkpointDatasetId: manifest.datasetId,
    checkpointRuntimeAuditSha256: 'd'.repeat(64),
    checkpointBuildOutcome: 'success',
    checkpointSaveOutcome: 'success',
    checkpointPublishOutcome: 'success',
    privatePayloadIncluded: false,
  };
  const writes = {
    'manifest.json': JSON.stringify(manifest),
    'handoff.json': JSON.stringify(handoff),
    'pages-artifact-seal.json': JSON.stringify(seal),
    'target-binding.json': JSON.stringify(binding),
    'target-public-closure.json': JSON.stringify(closure),
    'target-contract.js': contractText,
    'target-bundle.generated.js': bundleText,
    'public-audit.json': JSON.stringify({ datasetId: manifest.datasetId, privatePayloadIncluded: false }),
    'checkpoint-disposition.json': JSON.stringify({ datasetId: manifest.datasetId, privatePayloadIncluded: false }),
    'checkpoint-runtime-audit.json': JSON.stringify({ datasetId: manifest.datasetId, privatePayloadIncluded: false }),
  };
  await Promise.all(Object.entries(writes).map(([name, text]) => fs.writeFile(path.join(directory, name), text)));
  return { binding, closure, implementation, manifest, seal };
}

function remote() {
  let row = null;
  const objects = new Map();
  const removed = [];
  const request = async (_suffix, options = {}) => {
    const method = options.method ?? 'GET';
    if (method === 'GET') return row ? [clone(row)] : [];
    const body = JSON.parse(options.body);
    if (method === 'POST') {
      if (row) return [];
      row = { document_key: policy.documentKey, payload: body.payload, version: 1 };
      return [clone(row)];
    }
    if (method === 'PATCH') {
      row = { ...row, payload: body.payload, version: row.version + 1 };
      return [clone(row)];
    }
    throw new Error('unexpected request');
  };
  const storage = {
    ensurePrivateBucket: async () => true,
    uploadImmutable: async (objectPath, bytes) => {
      if (objects.has(objectPath)) return { created: false, alreadyExists: true };
      objects.set(objectPath, Buffer.from(bytes));
      return { created: true };
    },
    download: async objectPath => Buffer.from(objects.get(objectPath)),
    removeExact: async objectPath => { removed.push(objectPath); objects.delete(objectPath); },
    anonymousStatus: async () => 404,
  };
  return { request, storage, objects, removed, row: () => clone(row) };
}

test('builds a bounded payload-free exact archive and rejects private or unknown input', async () => {
  const work = await fs.mkdtemp(path.join(os.tmpdir(), 'rr-operational-evidence-'));
  try {
    const directory = path.join(work, 'handoff');
    await fixture(directory, { deploymentId: 'pages-12345-1' });
    const built = await buildProtectedOperationalEvidenceArchive({
      directory, deploymentId: 'pages-12345-1', repository,
    });
    assert.ok(built.archive.length < policy.maximumArchiveBytes);
    assert.equal(built.descriptor.deploymentId, 'pages-12345-1');
    assert.equal(built.descriptor.publicManifestSha256.length, 64);
    await fs.writeFile(path.join(directory, 'unknown.json'), '{}');
    await assert.rejects(buildProtectedOperationalEvidenceArchive({
      directory, deploymentId: 'pages-12345-1', repository,
    }), /unknown entry/);
    await fs.rm(path.join(directory, 'unknown.json'));
    await fs.writeFile(path.join(directory, 'public-audit.json'), '{"waterPoint":[1,2]}');
    await assert.rejects(buildProtectedOperationalEvidenceArchive({
      directory, deploymentId: 'pages-12345-1', repository,
    }), /forbidden private field/);
  } finally {
    await fs.rm(work, { recursive: true, force: true });
  }
});

test('retains the exact active source across repeated failed target publications', async () => {
  const work = await fs.mkdtemp(path.join(os.tmpdir(), 'rr-operational-retention-'));
  const state = remote();
  try {
    let activeManifestSha256 = null;
    for (const [deploymentId, hour, letter] of [
      ['pages-100-1', '10', 'a'],
      ['pages-200-1', '11', 'b'],
      ['pages-300-1', '12', 'c'],
    ]) {
      const directory = path.join(work, deploymentId);
      const evidence = await fixture(directory, { deploymentId, hour, sourceHead: letter.repeat(40) });
      if (deploymentId === 'pages-100-1') {
        activeManifestSha256 = evidence.seal.targetPublicManifestSha256;
      }
      await publishProtectedOperationalEvidence({
        directory,
        deploymentId,
        retainPublicManifestSha256: deploymentId === 'pages-100-1'
          ? null : activeManifestSha256,
        requireRetained: deploymentId !== 'pages-100-1',
        repository,
        request: state.request,
        storage: state.storage,
      });
    }
    const pointer = validateProtectedOperationalEvidencePointer(state.row().payload);
    assert.equal(pointer.current.deploymentId, 'pages-300-1');
    assert.equal(pointer.previous.deploymentId, 'pages-100-1');
    assert.equal(state.objects.size, 2);
    assert.equal(state.removed.length, 1);
  } finally {
    await fs.rm(work, { recursive: true, force: true });
  }
});

test('restores one exact deployment atomically and refuses an unavailable generation', async () => {
  const work = await fs.mkdtemp(path.join(os.tmpdir(), 'rr-operational-restore-'));
  const state = remote();
  try {
    const source = path.join(work, 'source');
    await fixture(source, { deploymentId: 'pages-900-2' });
    await publishProtectedOperationalEvidence({
      directory: source,
      deploymentId: 'pages-900-2',
      repository,
      request: state.request,
      storage: state.storage,
    });
    const restored = path.join(work, 'restored');
    const result = await restoreProtectedOperationalEvidence({
      directory: restored,
      deploymentId: 'pages-900-2',
      repository,
      request: state.request,
      storage: state.storage,
    });
    assert.equal(result.restored, true);
    assert.equal(JSON.parse(await fs.readFile(path.join(restored, 'pages-artifact-seal.json'))).attemptId,
      'pages-900-2');
    const restoredByHash = path.join(work, 'restored-by-hash');
    const byHash = await restoreProtectedOperationalEvidence({
      directory: restoredByHash,
      publicManifestSha256: result.publicManifestSha256,
      repository,
      request: state.request,
      storage: state.storage,
    });
    assert.equal(byHash.deploymentId, 'pages-900-2');
    await assert.rejects(restoreProtectedOperationalEvidence({
      directory: path.join(work, 'missing'),
      deploymentId: 'pages-901-1',
      repository,
      request: state.request,
      storage: state.storage,
    }), /unavailable/);
  } finally {
    await fs.rm(work, { recursive: true, force: true });
  }
});

test('does not publish a target when exact active evidence is absent', async () => {
  const work = await fs.mkdtemp(path.join(os.tmpdir(), 'rr-operational-closed-'));
  const state = remote();
  try {
    const source = path.join(work, 'target');
    await fixture(source, { deploymentId: 'pages-400-1' });
    await assert.rejects(publishProtectedOperationalEvidence({
      directory: source,
      deploymentId: 'pages-400-1',
      retainDeploymentId: 'pages-399-1',
      requireRetained: true,
      repository,
      request: state.request,
      storage: state.storage,
    }), /exact active source/);
  } finally {
    await fs.rm(work, { recursive: true, force: true });
  }
});

test('recovers an exact committed pointer after a lost response without a second write', async () => {
  const work = await fs.mkdtemp(path.join(os.tmpdir(), 'rr-operational-lost-response-'));
  const state = remote();
  try {
    const source = path.join(work, 'source');
    const target = path.join(work, 'target');
    await fixture(source, { deploymentId: 'pages-500-1', hour: '10' });
    await fixture(target, { deploymentId: 'pages-501-1', hour: '11', sourceHead: 'b'.repeat(40) });
    await publishProtectedOperationalEvidence({
      directory: source,
      deploymentId: 'pages-500-1',
      repository,
      request: state.request,
      storage: state.storage,
    });
    let patchCount = 0;
    const requestWithLostResponse = async (suffix, options, label) => {
      if ((options?.method ?? 'GET') === 'PATCH') {
        patchCount += 1;
        const committed = await state.request(suffix, options, label);
        assert.equal(committed.length, 1);
        throw new Error('simulated response-body loss after commit');
      }
      return state.request(suffix, options, label);
    };
    const result = await publishProtectedOperationalEvidence({
      directory: target,
      deploymentId: 'pages-501-1',
      retainDeploymentId: 'pages-500-1',
      requireRetained: true,
      repository,
      request: requestWithLostResponse,
      storage: state.storage,
    });
    assert.equal(result.published, true);
    assert.equal(patchCount, 1);
    assert.equal(state.row().payload.current.deploymentId, 'pages-501-1');
    assert.equal(state.row().payload.previous.deploymentId, 'pages-500-1');
  } finally {
    await fs.rm(work, { recursive: true, force: true });
  }
});

test('removes only its new unreferenced object after a proven failed compare-and-swap', async () => {
  const work = await fs.mkdtemp(path.join(os.tmpdir(), 'rr-operational-cas-cleanup-'));
  const state = remote();
  try {
    const source = path.join(work, 'source');
    const target = path.join(work, 'target');
    await fixture(source, { deploymentId: 'pages-600-1', hour: '10' });
    await fixture(target, { deploymentId: 'pages-601-1', hour: '11', sourceHead: 'c'.repeat(40) });
    await publishProtectedOperationalEvidence({
      directory: source,
      deploymentId: 'pages-600-1',
      repository,
      request: state.request,
      storage: state.storage,
    });
    const sourcePath = state.row().payload.current.objectPath;
    const requestWithLostCas = async (suffix, options, label) => {
      if ((options?.method ?? 'GET') === 'PATCH') return [];
      return state.request(suffix, options, label);
    };
    await assert.rejects(publishProtectedOperationalEvidence({
      directory: target,
      deploymentId: 'pages-601-1',
      retainDeploymentId: 'pages-600-1',
      requireRetained: true,
      repository,
      request: requestWithLostCas,
      storage: state.storage,
    }), /lost a concurrent write/);
    assert.equal(state.objects.size, 1);
    assert.equal(state.objects.has(sourcePath), true);
    assert.equal(state.row().payload.current.deploymentId, 'pages-600-1');
    assert.equal(state.removed.length, 1);
    assert.notEqual(state.removed[0], sourcePath);
  } finally {
    await fs.rm(work, { recursive: true, force: true });
  }
});

test('pre-activation terminal takeover retains the same target through runner loss and genuine plan admission', async () => {
  const {publishProtectedPreActivationTarget,inspectProtectedPreActivationTarget,
    classifyProtectedPreActivationCurrent,claimProtectedPreActivationTarget,
    restoreProtectedPreActivationTarget,prepareProtectedPreActivationHandoff,
    clearProtectedPreActivationTarget}=await import('./protected-operational-reentry-evidence.mjs');
  const activation=await import('./ravscore-operational-activation.mjs');
  const {CANDIDATE_G_OPERATIONAL_ROLLBACK_ID}=await import('./lib/ravscore-candidate-g-rollback-runtime.mjs');
  const {buildIntegratedCutoverReadiness}=await import('./integrated-cutover-readiness.mjs');
  const {assertUploadedOperationalPagesTarget}=await import('./ravscore-operational-pages-recovery.mjs');
  const {classifyProductionTargetFreshness}=await import('./check-production-target-freshness.mjs');
  const work=await fs.mkdtemp(path.join(os.tmpdir(),'rr-operational-evidence-'));
  const sourceHead='a'.repeat(40),sourceId='pages-43001-1',targetId='pages-43002-1';
  const owner=id=>{const [,run,attempt]=id.match(/^pages-(?:recovery-)?(\d+)-(\d+)$/);return {repository,
    runId:Number(run),runAttempt:Number(attempt),headSha:sourceHead,attemptId:id};};
  const terminal=o=>({id:o.runId,run_attempt:o.runAttempt,head_sha:o.headSha,head_branch:'main',
    repository:{full_name:repository},status:'completed',conclusion:'failure'});
  const read=async(d,f)=>JSON.parse(await fs.readFile(path.join(d,f),'utf8'));
  const write=(d,f,v)=>fs.writeFile(path.join(d,f),JSON.stringify(v));
  try {
    const sourceDir=path.join(work,'source'),targetDir=path.join(work,'target');
    const source=await fixture(sourceDir,{deploymentId:sourceId,sourceHead});
    const target=await fixture(targetDir,{deploymentId:targetId,hour:'11',sourceHead});
    // Like the existing historical-maintenance target, this is a synthetic
    // metadata oracle. It is not an authenticated B/S/numerical family proof.
    const oldBinding={...source.binding,modelBundleSha256:'9'.repeat(64)};
    source.manifest.ravScoreModelBinding=oldBinding;source.manifest.ravScoreRuntime.modelBinding=oldBinding;
    source.seal.targetModelBinding=oldBinding;source.seal.targetPublicManifestSha256=sha256CanonicalJson(source.manifest);
    await write(sourceDir,'manifest.json',source.manifest);await write(sourceDir,'target-binding.json',oldBinding);
    await write(sourceDir,'pages-artifact-seal.json',source.seal);
    const now=Date.now(),reference=new Date(Math.floor(now/3600000)*3600000).toISOString();
    target.manifest.productionReferenceAt=reference;target.manifest.generatedAt=new Date(now).toISOString();
    target.manifest.datasetId='rr-phase-target-210';
    target.seal.targetPublicManifestSha256=sha256CanonicalJson(target.manifest);
    target.seal.createdAt=new Date(now).toISOString();
    await write(targetDir,'manifest.json',target.manifest);await write(targetDir,'pages-artifact-seal.json',target.seal);
    const profile=JSON.parse(await fs.readFile(path.join(root,'data/admin/ravscore-profile-selection.json'),'utf8'));
    const oldProfile={...profile,modelBundleSha256:oldBinding.modelBundleSha256};
    let central={document_key:activation.RAVSCORE_OPERATIONAL_ACTIVATION_DOCUMENT_KEY,version:30,payload:{
      schemaVersion:activation.RAVSCORE_OPERATIONAL_ACTIVATION_SCHEMA,status:activation.RAVSCORE_OPERATIONAL_STATUSES.integrated,
      transitionKind:activation.RAVSCORE_OPERATIONAL_TRANSITION_KINDS.integratedReturn,sourceHead,
      datasetId:source.manifest.datasetId,productionReferenceAt:source.manifest.productionReferenceAt,
      rollbackId:CANDIDATE_G_OPERATIONAL_ROLLBACK_ID,activeModelBinding:oldBinding,
      requestedModelBinding:oldBinding,sourceModelBinding:oldBinding,candidatePlanSha256:null,candidateFullSha256:null,
      privateBundleContentSha256:null,publicManifestSha256:sha256CanonicalJson(source.manifest),
      sourcePublicManifestSha256:sha256CanonicalJson(source.manifest),requestedPublicManifestSha256:sha256CanonicalJson(source.manifest),
      sourceImplementationClosureSha256:source.seal.targetImplementationClosureSha256,
      requestedImplementationClosureSha256:source.seal.targetImplementationClosureSha256,
      sourceDeploymentId:sourceId,deploymentId:sourceId,automaticActivationAllowed:false,schedulerActivationAllowed:false,
      calibrationEligible:false,requestedAt:source.seal.createdAt,activatedAt:source.seal.createdAt,failureCode:null,
      returnPlanSha256:null,integratedReadinessSha256:null,integratedPublicAuditSha256:null,integratedManifestSha256:null}};
    const profileRow={document_key:activation.RAVSCORE_PROFILE_SELECTION_DOCUMENT_KEY,version:20,payload:oldProfile};
    activation.assertOperationalActivationDocument(central.payload,{allowSealedHistoricalBindings:true});
    const resolved=activation.resolveOperationalRavScoreModel(central,{profileRow});
    const sourceCurrent={...resolved,bindingCurrent:activation.operationalResolvedBindingCurrent(resolved)};
    const server=remote(),requests=[];
    const request=async(suffix,options={})=>{
      requests.push({suffix,method:options.method??'GET'});
      if(suffix.includes('document_key=in.')){assert.equal(options.method??'GET','GET');return clone([central,profileRow]);}
      if(options.method==='PATCH')assert(suffix.includes('&version=eq.'+server.row().version+'&'));
      return server.request(suffix,options);
    };
    const common={request,storage:server.storage,repository};
    await publishProtectedOperationalEvidence({...common,directory:sourceDir,deploymentId:sourceId});
    const runtimeAudit={datasetId:target.manifest.datasetId,privatePayloadIncluded:false};
    const disposition={schemaVersion:'ravscore-continuation-checkpoint-disposition-v1',sourceHead,
      datasetId:target.manifest.datasetId,disposition:'READY_PUBLISHED',rollbackStatus:'READY',rollbackActivationReady:true,
      checkpointRequired:true,runtimeAuditSha256:sha256CanonicalJson(runtimeAudit),privatePayloadIncluded:false};
    await write(targetDir,'checkpoint-runtime-audit.json',runtimeAudit);
    await write(targetDir,'checkpoint-disposition.json',{...disposition,bindingSha256:sha256CanonicalJson(disposition)});
    const audit={schemaVersion:1,status:'passed',model:{modelId:target.binding.modelId,stateSchemaVersion:target.binding.stateSchemaVersion,
      modelContractSha256:target.binding.modelContractSha256,modelBundleSha256:target.binding.modelBundleSha256},
      coverage:{expectedZoneCount:210,zoneCount:210,expectedPartCount:673,partCount:673},
      history:{allCurrentScoresFullHistory:true,currentFullHistoryModeCount:420,currentHistoryIncompleteModeCount:0,currentUnavailableModeCount:0},
      rollback:{status:'READY',activationReady:true,descriptorValid:true,generationReferenceBound:true,runtimePartCount:673,readyPartCount:673,reconstructedFromIntegratedState:false},
      payload:{privacyContractPassed:true,publicStateOrEvidenceIncluded:false,publicRawVectorIncluded:false,publicUnapprovedCoordinateIncluded:false,publicShadowIncluded:false},errors:[],errorCounts:{}};
    await write(targetDir,'public-audit.json',audit);await fs.unlink(path.join(targetDir,'handoff.json'));
    const phase={schemaVersion:'ravradar-current-grid-pre-activation-v1',sourceHead,sourceCurrent,
      sourceCurrentSha256:sha256CanonicalJson(sourceCurrent),checkpointOutcomes:{build:'success',save:'success',publish:'success'},privatePayloadIncluded:false};
    await write(targetDir,'pre-activation.json',phase);
    await publishProtectedPreActivationTarget({...common,directory:targetDir,deploymentId:targetId});
    const original=clone(server.row()),originalFiles=new Map(server.objects);
    const firstOwner=owner(targetId),secondOwner=owner('pages-recovery-43003-1');
    for(const change of [{status:'in_progress',conclusion:null},{status:'queued',conclusion:null},{status:'unknown'},
      {run_attempt:2},{head_branch:'feature'},{head_sha:'f'.repeat(40)},{repository:{full_name:'other/repo'}}]){
      await assert.rejects(claimProtectedPreActivationTarget({...common,sourceHead,owner:secondOwner,attempt:{...terminal(firstOwner),...change}}));
      assert.deepEqual(server.row(),original);
    }
    await assert.rejects(claimProtectedPreActivationTarget({...common,sourceHead:'b'.repeat(40),owner:secondOwner,attempt:terminal(firstOwner)}));
    const originalCentral=clone(central);central={...central,version:central.version+1};
    await assert.rejects(claimProtectedPreActivationTarget({...common,sourceHead,owner:secondOwner,attempt:terminal(firstOwner)}),/source state changed/);
    central=originalCentral;assert.deepEqual(server.row(),original);
    let caught;
    try {await claimProtectedPreActivationTarget({...common,request:async(suffix,options={})=>{
      if(options.method==='PATCH')throw null;return request(suffix,options);
    },sourceHead,owner:secondOwner,attempt:terminal(firstOwner)});} catch(error){caught=error;}
    assert(caught instanceof Error);assert.equal(caught.cause,null,'normal first transport cause remains null');
    assert.deepEqual(server.row(),original,'failed/ambiguous CAS cannot release or adopt the slot');
    assert.throws(()=>classifyProductionTargetFreshness({target:'not-time',maximumAgeMinutes:150}));
    assert.throws(()=>classifyProductionTargetFreshness({target:new Date(Date.parse(reference)+2*3600000).toISOString(),maximumAgeMinutes:150}));
    assert.throws(()=>classifyProductionTargetFreshness({target:new Date(Date.parse(reference)-118*3600000).toISOString(),maximumAgeMinutes:150}));
    assert.doesNotThrow(()=>classifyProductionTargetFreshness({target:new Date(Date.parse(reference)-5*3600000).toISOString(),maximumAgeMinutes:150}),
      'preferred age is soft, not a new hard 150/240-minute cutoff');
    const phaseBytes=await fs.readFile(path.join(targetDir,'public-audit.json'));
    await write(targetDir,'public-audit.json',{...audit,unexpected:'substitution'});
    await assert.rejects(publishProtectedPreActivationTarget({...common,directory:targetDir,deploymentId:targetId}),/changed target bytes/);
    await fs.writeFile(path.join(targetDir,'public-audit.json'),phaseBytes);
    await claimProtectedPreActivationTarget({...common,sourceHead,owner:secondOwner,attempt:terminal(firstOwner)});
    assert.deepEqual(server.row().payload.preActivation.originalTarget,original.payload.preActivation.originalTarget);
    const claimed=clone(server.row());
    // These are real persistence/owner interruptions, not mocked remote Edge success.
    for(const boundary of ['before-first-Edge','partial-Edge','readiness-failure','plan-failure','runner-loss']){
      const found=await inspectProtectedPreActivationTarget(common);
      assert.equal(found.action,'PRE_ACTIVATION_PRESENT',boundary);assert.deepEqual(server.row(),claimed,boundary);
      await assert.rejects(claimProtectedPreActivationTarget({...common,sourceHead,owner:owner('pages-recovery-43004-1'),
        attempt:{...terminal(secondOwner),status:'in_progress',conclusion:null}}));
    }
    const restored=path.join(work,'restored');
    await restoreProtectedPreActivationTarget({...common,directory:restored,owner:secondOwner});
    const reseal={...target.seal,...{runId:secondOwner.runId,runAttempt:secondOwner.runAttempt,attemptId:secondOwner.attemptId,
      artifactName:'github-pages-preactivation-'+secondOwner.runId+'-'+secondOwner.runAttempt,artifactId:9999,
      artifactDigestSha256:'c'.repeat(64),artifactSizeBytes:12400,createdAt:new Date().toISOString()}};
    await write(restored,'pages-artifact-seal.json',reseal);
    const identity={repository,runId:secondOwner.runId,runAttempt:secondOwner.runAttempt,headSha:sourceHead,ref:'refs/heads/main',attemptId:secondOwner.attemptId};
    assertUploadedOperationalPagesTarget({seal:reseal,workflowIdentity:identity,targetManifest:target.manifest,
      targetModelBinding:target.binding,implementationClosureSha256:target.seal.targetImplementationClosureSha256});
    for(const artifactName of ['github-pages-preactivation-43002-1','arbitrary','github-pages-preactivation-43003-2'])
      assert.throws(()=>assertUploadedOperationalPagesTarget({seal:{...reseal,artifactName},workflowIdentity:identity,
        targetManifest:target.manifest,targetModelBinding:target.binding,implementationClosureSha256:target.seal.targetImplementationClosureSha256}));
    // A valid run/attempt is not authority for another sealed generation.
    for (const targetManifest of [
      {...target.manifest,datasetId:'rr-other-same-attempt-210'},
      {...target.manifest,productionReferenceAt:'2026-01-01T00:00:00.000Z'},
      {...target.manifest,ravScoreModelBinding:{...target.binding,modelBundleSha256:'7'.repeat(64)}},
    ]) assert.throws(()=>assertUploadedOperationalPagesTarget({seal:reseal,workflowIdentity:identity,
      targetManifest,targetModelBinding:target.binding,
      implementationClosureSha256:target.seal.targetImplementationClosureSha256}));
    for (const replay of [
      {...identity,runId:identity.runId+1},
      {...identity,runAttempt:identity.runAttempt+1},
      {...identity,attemptId:'pages-'+identity.runId+'-'+identity.runAttempt},
      {...identity,headSha:'6'.repeat(40)},
    ]) assert.throws(()=>assertUploadedOperationalPagesTarget({seal:reseal,workflowIdentity:replay,
      targetManifest:target.manifest,targetModelBinding:target.binding,
      implementationClosureSha256:target.seal.targetImplementationClosureSha256}));
    await publishProtectedPreActivationTarget({...common,directory:restored,deploymentId:secondOwner.attemptId});
    const published=clone(server.row());
    const readiness=await buildIntegratedCutoverReadiness(sourceHead,{publicImplementationClosureSha256:target.seal.targetImplementationClosureSha256});
    // The normal current readiness must carry every exact issued phase in order;
    // neither an old220 list nor missing230/KB, duplication or extra IDs is admitted.
    const {assistantKnowledgeRequiredMigrations}=await import('./integrated-cutover-readiness.mjs');
    const requiredIds=assistantKnowledgeRequiredMigrations().map(item=>item.id);
    assert.deepEqual(readiness.migrationIds,requiredIds);
    const prepare=observed=>activation.prepareIntegratedHistoricalMaintenance({currentRow:central,currentProfileRow:profileRow,sourceHead,
      publicManifest:target.manifest,publicAudit:audit,readiness:observed,sourceImplementationClosureSha256:source.seal.targetImplementationClosureSha256,
      requestedImplementationClosureSha256:target.seal.targetImplementationClosureSha256,eventName:'schedule',ref:'refs/heads/main',githubSha:sourceHead});
    for(const ids of [requiredIds.slice(0,-2),requiredIds.filter(id=>!id.startsWith('20261013230000_')),
      requiredIds.slice(0,-1),[...requiredIds,requiredIds.at(-1)],[...requiredIds,'20990101000000_extra'],
      [...requiredIds.slice(0,-2),requiredIds.at(-1),requiredIds.at(-2)]])
      assert.throws(()=>prepare({...readiness,migrationIds:ids}),{message:'Integrated return lacks exact backend/Edge cutover readiness'});
    const plan=prepare(readiness);
    await assert.rejects(prepareProtectedPreActivationHandoff({...common,directory:restored,owner:secondOwner,readiness:{},plan}));
    await assert.rejects(prepareProtectedPreActivationHandoff({...common,directory:restored,owner:secondOwner,readiness,plan:{...plan,centralExpectedVersion:0}}));
    assert.deepEqual(server.row(),published);await assert.rejects(fs.stat(path.join(restored,'handoff.json')),{code:'ENOENT'});
    const prepared=await prepareProtectedPreActivationHandoff({...common,directory:restored,owner:secondOwner,readiness,plan});
    assert.equal(prepared.handoff.checkpointPublishOutcome,'success');
    assert.equal(prepared.handoff.action,'integrated-historical-maintenance');
    assert.equal(prepared.handoff.centralVersion,central.version);assert.deepEqual(server.row(),published);
    await buildProtectedOperationalEvidenceArchive({directory:restored,deploymentId:secondOwner.attemptId,repository});
    await assert.rejects(clearProtectedPreActivationTarget({...common,sourceHead,baseUrl:'https://synthetic.invalid/',
      fetchImpl:()=>{throw new Error('must reject before any public request');}}),/not actually active/);
    const sourceVerification={schemaVersion:'ravscore-operational-pages-verification-v1',status:'passed',sourceHead,
      datasetId:source.manifest.datasetId,productionReferenceAt:source.manifest.productionReferenceAt,model:'integrated',modelBinding:oldBinding,
      implementationClosureSha256:source.seal.targetImplementationClosureSha256,publicManifestSha256:sha256CanonicalJson(source.manifest),
      zoneCount:210,coastalPartCount:673,privatePayloadRead:false};
    const pending=activation.operationalIntegratedHistoricalMaintenanceTransition({action:'integrated-historical-maintenance-begin',
      currentRow:central,currentProfileRow:profileRow,expectedVersion:central.version,plan,readiness,
      sourceManifest:source.manifest,publicManifest:target.manifest,publicAudit:audit,
      sourceVerification,observedSourceDeploymentId:sourceId,deploymentId:secondOwner.attemptId});
    central={...central,version:pending.nextVersion,payload:pending.document};
    assert.equal((await classifyProtectedPreActivationCurrent({...common,sourceHead,attempt:terminal(secondOwner)})).action,'PENDING_PRE_ACTIVATION');
    assert.deepEqual(server.row(),published,'pending coexistence does not replace durable evidence');
    for(const [name,bytes] of originalFiles)assert.deepEqual(server.objects.get(name),bytes,'original immutable archive retained');
    assert.equal(server.removed.length,0);
  } finally {await fs.rm(work,{recursive:true,force:true});}
});
