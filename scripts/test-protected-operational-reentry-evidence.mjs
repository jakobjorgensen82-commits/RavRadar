#!/usr/bin/env node

import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { createOperationalEvidenceR2Slots, PRIVATE_WEATHER_UPLOAD_RESERVATION_BYTES } from './lib/operational-evidence-r2-slots.mjs';
import { PROTECTED_PRIVATE_RUNTIME_POLICY } from './protected-private-production-runtime.mjs';
import { PRIVATE_WEATHER_PUBLICATION_POLICY } from './publish-private-weather-runtime.mjs';
import { RETIREMENT_MARKER_BYTES } from './lib/private-weather-runtime-retirement.mjs';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

import { ravScoreModelBinding } from '../js/core/ravscore-model-contract.js';
import { computeRavScorePublicBrowserClosure } from './lib/ravscore-public-browser-closure.mjs';
import {
  PROTECTED_OPERATIONAL_REENTRY_EVIDENCE_POLICY as policy,
  buildProtectedOperationalEvidenceArchive,
  createProtectedOperationalEvidenceClients,
  publishProtectedOperationalEvidence,
  readReentryMainHead,
  restoreProtectedOperationalEvidence,
  validateProtectedOperationalEvidencePointer,
} from './protected-operational-reentry-evidence.mjs';
import { sha256CanonicalJson } from './ravscore-operational-pages-recovery.mjs';
import { readAuthenticPagesAttemptClosure, hasAuthenticPagesAttemptClosure } from './github-pages-attempt-evidence.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const repository = 'ravradar/RavRadar';
const clone = value => structuredClone(value);

test('the exact main read recovers a transient connection and fails closed on invalid metadata or authentication', async () => {
  const token = 'fixture-token';
  const sha = 'a'.repeat(40);
  const expected = { ref: 'refs/heads/main', object: { type: 'commit', sha } };
  const waits = [];
  let reads = 0;
  const response = await readReentryMainHead({ repository, token, wait: async delay => waits.push(delay),
    fetchImpl: async (url, options) => {
      assert.equal(url, 'https://api.github.com/repos/ravradar/RavRadar/git/ref/heads/main');
      assert.equal(options.method, 'GET');
      assert.equal(options.cache, 'no-store');
      assert.equal(options.redirect, 'error');
      assert.equal(options.headers.Authorization, 'Bearer ' + token);
      if (++reads === 1) throw new TypeError('fetch failed', { cause: { code: 'UND_ERR_CONNECT_TIMEOUT' } });
      if (reads === 2) return new Response('', { status: 503 });
      return Response.json(expected);
    },
  });
  assert.equal(response, sha);
  assert.equal(reads, 3);
  assert.deepEqual(waits, [1000, 2000]);

  for (const [body, code] of [[Response.json({ ...expected, ref: 'refs/heads/other' }), 'REENTRY_MAIN_REF_INVALID'],
    [Response.json({ ...expected, object: { ...expected.object, sha: [sha] } }), 'REENTRY_MAIN_REF_INVALID'],
    [new Response('', { status: 403 }), 'REENTRY_MAIN_REF_HTTP_REFUSED']]) {
    await assert.rejects(() => readReentryMainHead({ repository, token, fetchImpl: async () => body,
      wait: async () => assert.fail('Permanent failures must not retry') }), new RegExp(code));
  }
  await assert.rejects(() => readReentryMainHead({ repository: '../archive', token,
    fetchImpl: async () => assert.fail('Invalid repository must not request') }), /REENTRY_MAIN_REF_IDENTITY_REQUIRED/);
  reads = 0;
  await assert.rejects(() => readReentryMainHead({ repository, token, wait: async () => {},
    fetchImpl: async () => { reads++; return new Response('', { status: 502 }); } }), /REENTRY_MAIN_REF_RETRY_EXHAUSTED/);
  assert.equal(reads, 3);
});

test('the ordinary preflight CLI prints only a main commit and opens no Supabase clients', () => {
  const sha = 'b'.repeat(40);
  const hook = `globalThis.fetch = async (url, options) => {
    if (url !== 'https://api.github.com/repos/ravradar/RavRadar/git/ref/heads/main' || options.method !== 'GET')
      throw new Error('unexpected network scope');
    return Response.json({ref:'refs/heads/main',object:{type:'commit',sha:'${sha}'}});
  };`;
  const args = ['--import', 'data:text/javascript,' + encodeURIComponent(hook),
    'scripts/protected-operational-reentry-evidence.mjs', '--read-live-main-head'];
  for (const [ref, status] of [['refs/heads/main', 0], ['refs/heads/other', 1]]) {
    const result = spawnSync(process.execPath, args, { cwd: root, encoding: 'utf8', timeout: 5000,
      env: { ...process.env, GITHUB_REF: ref, GITHUB_REPOSITORY: repository, GH_TOKEN: 'fixture-token',
        SUPABASE_URL: '', SUPABASE_SERVICE_ROLE_KEY: '', SUPABASE_PUBLISHABLE_KEY: '' } });
    assert.equal(result.status, status);
    assert.equal(result.stdout.trim(), status === 0 ? sha : '');
    if (status === 0) assert.equal(result.stderr, '');
    else assert.match(result.stderr, /REENTRY_MAIN_REF_IDENTITY_REQUIRED/);
  }
});

test('historical pre-POST closure refuses other owners, incomplete logs and unsafe signed redirects', async () => {
  const owner = { repository: 'jakobjorgensen82-commits/RavRadar', runId: 43216888462, runAttempt: 1,
    headSha: '8fc381d77e486f74cf34e667c9b73b528e954422', attemptId: 'pages-43216888462-1' };
  const run = { id: owner.runId, run_attempt: 1, head_sha: owner.headSha, head_branch: 'main',
    repository: { full_name: owner.repository }, path: '.github/workflows/run-current-weather-once.yml',
    status: 'completed', conclusion: 'failure', updated_at: '2026-11-12T15:00:00Z' };
  const skipped = (id, name) => ({ id, run_id: owner.runId, run_attempt: 1, head_sha: owner.headSha,
    name, status: 'completed', conclusion: 'skipped' });
  const jobs = [
    { ...skipped(131250455281, 'Deploy prepared Pages artifact through reusable workflow / Deploy prepared Pages artifact'),
      conclusion: 'failure', steps: [
        { name: 'Reserve this exact Pages writer before its first POST', number: 30, status: 'completed', conclusion: 'success' },
        { name: 'Deploy to GitHub Pages', number: 31, status: 'completed', conclusion: 'failure' },
        { name: 'Confirm scheduled Pages writes are terminal and unpublished', number: 32, status: 'completed', conclusion: 'skipped' },
      ] },
    skipped(2, 'Finish an interrupted generation before new work / resume-pre-activation-pages'),
    skipped(3, 'Finish an interrupted generation before new work / Redeploy only a helper-proven exact sealed Pages target'),
  ];
  const api = `https://api.github.com/repos/${owner.repository}/actions/jobs/131250455281/logs`;
  const signed = 'https://productionresultssa15.blob.core.windows.net/owned-log?signature=SYNTHETIC';
  const response = (url, body, options = {}) => Object.defineProperties(new Response(body, options), {
    url: { value: url }, redirected: { value: false },
  });
  const invoke = async ({ actualOwner = owner, location = signed, payload = Buffer.alloc(57470, 97), direct = false,
    logStatus = 200, alterJobs = value => value } = {}) => {
    const calls = [];
    const fetchImpl = async (url, options) => {
      calls.push({ url, options });
      if (url === api) {
        assert.equal(options.redirect, 'manual'); assert.equal(options.headers.Authorization, 'Bearer synthetic-token');
        return direct ? response(url, payload, { status: logStatus })
          : response(url, null, { status: 302, headers: { location } });
      }
      if (url === location) {
        assert.equal(options.redirect, 'error'); assert.equal(options.headers, undefined, 'Signed log receives no authorization');
        return response(url, payload, { status: logStatus });
      }
      assert.equal(options.headers.Authorization, 'Bearer synthetic-token');
      if (url.includes('/jobs?')) return { ok: true, json: async () => ({ total_count: jobs.length, jobs: alterJobs(clone(jobs)) }) };
      return { ok: true, json: async () => clone(run) };
    };
    await assert.rejects(readAuthenticPagesAttemptClosure({ owner: actualOwner, token: 'synthetic-token', fetchImpl }),
      /PAGES_OWNER_/);
    return calls;
  };
  const signedCalls = await invoke();
  assert.equal(signedCalls.filter(call => call.url === api).length, 1);
  assert.equal(signedCalls.filter(call => call.url === signed).length, 1);
  await invoke({ direct: true });
  await invoke({ payload: Buffer.alloc(57469, 97) });
  await invoke({ payload: Buffer.alloc(128 * 1024 + 1, 97) });
  await invoke({ logStatus: 403 });
  for (const location of ['http://productionresultssa15.blob.core.windows.net/log',
    'https://productionresultssa15.blob.core.windows.net.evil.invalid/log',
    'https://user@productionresultssa15.blob.core.windows.net/log',
    signed + '#untrusted']) {
    const calls = await invoke({ location });
    assert.equal(calls.some(call => call.url === location), false, 'Unsafe signed redirect must not be followed');
  }
  const otherOwner = { ...owner, runId: owner.runId + 1, attemptId: `pages-${owner.runId + 1}-1` };
  assert.equal((await invoke({ actualOwner: otherOwner })).some(call => call.url === api), false);
  await invoke({ alterJobs: rows => rows.map((job, index) => index ? job : { ...job, id: job.id + 1 }) });
  await invoke({ alterJobs: rows => rows.map((job, index) => index ? job : {
    ...job, steps: job.steps.map(step => step.number === 31 ? { ...step, conclusion: 'cancelled' } : step),
  }) });
  assert.equal(hasAuthenticPagesAttemptClosure({ owner, state: 'NO_POST' }, owner), false,
    'Caller-authored closure data never acquires admission');
  // No synthetic log can satisfy the fixed full-log digest. The positive
  // historical case is qualified separately using the actual authenticated
  // complete log; no private log is committed or invented for these tests.
});

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
  const savedPagesToken=process.env.GH_TOKEN;process.env.GH_TOKEN='synthetic-pages-test-token';
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
  const pagesGithub=async url=>{
    const u=String(url),match=u.match(/\/actions\/runs\/(\d+)(?:\/attempts\/(\d+))?/);
    if(!match)throw new Error('Unexpected authenticated fixture endpoint');
    const runId=Number(match[1]),runAttempt=Number(match[2]??1);
    const run={...terminal({runId,runAttempt,headSha:sourceHead}),path:'.github/workflows/run-current-weather-once.yml',updated_at:'2026-11-12T01:00:00Z'};
    const jobs=[{id:runId*10+1,run_id:runId,run_attempt:runAttempt,head_sha:sourceHead,name:'Deploy prepared Pages artifact',status:'completed',conclusion:'failure',
      steps:[{name:'Deploy to GitHub Pages',status:'completed',conclusion:'skipped'}]},
      {id:runId*10+2,run_id:runId,run_attempt:runAttempt,head_sha:sourceHead,name:'Finish an interrupted generation before new work / resume-pre-activation-pages',status:'completed',conclusion:'skipped'},
      {id:runId*10+3,run_id:runId,run_attempt:runAttempt,head_sha:sourceHead,name:'Redeploy only a helper-proven exact sealed Pages target',status:'completed',conclusion:'skipped'}];
    return {ok:true,json:async()=>clone(u.includes('/jobs?')?{total_count:jobs.length,jobs}:run)};
  };
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
    const common={request,storage:server.storage,repository,fetchImpl:pagesGithub};
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
    // Exercise all FIVE real reference roles with eligible original phase archives.
    // This remains the parent's synthetic metadata fixture, never B/S admission.
    {
      const phasePolicy={...policy,descriptorKind:'RAVRADAR_PRE_ACTIVATION_EDGE_TARGET_OBJECT',
        archiveKind:'RAVRADAR_PRE_ACTIVATION_EDGE_TARGET_ARCHIVE'};
      const objects=new Map(server.objects),ordinary=[];
      for(const id of ['pages-43009-1','pages-43010-1']){
        const dir=path.join(work,id);await fixture(dir,{deploymentId:id,sourceHead});
        const built=await buildProtectedOperationalEvidenceArchive({directory:dir,deploymentId:id,repository});
        ordinary.push(built.descriptor);objects.set(built.descriptor.objectPath,built.archive);
      }
      const nextPhase=path.join(work,'replica-second-phase');await fs.cp(targetDir,nextPhase,{recursive:true});
      const phaseSeal=await read(nextPhase,'pages-artifact-seal.json');
      Object.assign(phaseSeal,{attemptId:'pages-43011-1',runId:43011,runAttempt:1});
      await write(nextPhase,'pages-artifact-seal.json',phaseSeal);
      const later=await buildProtectedOperationalEvidenceArchive({directory:nextPhase,deploymentId:'pages-43011-1',repository,policy:phasePolicy});
      objects.set(later.descriptor.objectPath,later.archive);
      const ownerOf=d=>({repository,runId:d.runId,runAttempt:d.runAttempt,headSha:d.sourceHead,attemptId:d.deploymentId});
      let row={...original,version:100,payload:{...original.payload,schemaVersion:'3.0.0',previous:ordinary[0],
        preActivation:{...original.payload.preActivation,target:later.descriptor,owner:ownerOf(later.descriptor)},
        pagesWrite:{target:ordinary[1],owner:ownerOf(ordinary[1])}}};
      validateProtectedOperationalEvidencePointer(row.payload);
      const replica=slotTransportFixture({primaryMap:objects,initialRow:row});
      const request=replica.clients.documentRequest;
      assert.equal((await replica.clients.storage.prepareReplica({request,row:clone(row),incoming:null})).status,'OPERATIONAL_REPLICA_VERIFIED');
      assert.equal(replica.slots.size,5);
      const strandedDir=path.join(work,'stranded');await fixture(strandedDir,{deploymentId:'pages-43012-1',sourceHead});
      const stranded=await buildProtectedOperationalEvidenceArchive({directory:strandedDir,deploymentId:'pages-43012-1',repository});
      await replica.clients.storage.prepareReplica({request,row:clone(row),incoming:stranded});
      assert.equal(replica.slots.size,6,'one unanswered publication may occupy the sixth slot');
      const nextDir=path.join(work,'next-ordinary');await fixture(nextDir,{deploymentId:'pages-43013-1',sourceHead});
      const incoming=await buildProtectedOperationalEvidenceArchive({directory:nextDir,deploymentId:'pages-43013-1',repository});
      const before=new Map(replica.slots);
      assert.equal((await replica.clients.storage.prepareReplica({request,row:clone(row),incoming})).status,'OPERATIONAL_SLOT_CAPACITY_HOLD');
      assert.deepEqual(replica.slots,before,'a fresh GET does not retire a slot or fence an unknown primary CAS');
      assert.equal((await replica.clients.storage.settleReplica({request,row:clone(row),incoming})).status,'OPERATIONAL_REPLICA_CAS_REQUIRED');
      assert.deepEqual(replica.slots,before,'a fabricated readback/version cannot authorize replacement');
      const publication=await publishProtectedOperationalEvidence({directory:nextDir,deploymentId:'pages-43013-1',repository,
        request,storage:replica.clients.storage});
      assert.equal(publication.replica.status,'OPERATIONAL_REPLICA_VERIFIED');
      row=replica.row();assert.equal(row.version,101,'the normal actual CAS supplies the replacement frontier');
      for(const d of [row.payload.current,row.payload.previous,row.payload.preActivation.originalTarget,
        row.payload.preActivation.target,row.payload.pagesWrite.target]){
        const matches=[...replica.slots.values()].filter(wire=>replica.decode(wire).header.descriptor.objectPath===d.objectPath);
        assert(matches.length>=1,'every current/previous/original/target/PAGES role stays protected');
        assert(matches.some(wire=>replica.decode(wire).header.admittedPointerVersion===101));
      }
      assert.equal(replica.slots.size,6);assert.equal(replica.events.includes('r2-DELETE'),false);
      replica.check();
    }

    assert.equal((await (await import('./protected-operational-reentry-evidence.mjs')).retireClosedUnpublishedOrdinaryPreActivationTarget({
      ...common,sourceHead,baseUrl:'https://ravradar.dk'})).reason,'ORIGINAL_INTENTION_NOT_PROVED');
    assert.deepEqual(server.row(),original,'an old phase never acquires new retirement authority');

    // A different qualified executor may only BEGIN an already issued exact
    // ordinary target. All fixtures below are synthetic metadata, not B/S proof.
    {
      const {beginTerminalPreparedPreActivation,readProtectedPreparedTargetAdmission,verifyPreparedSource,classifyProtectedPreActivationReentry}=await import('./protected-operational-reentry-evidence.mjs');
      const recoveryServer=remote();let recoveryCentral=clone(central),atomicCount=0;
      const recoveryRequest=async(suffix,options={})=>suffix.includes('document_key=in.')
        ? clone([recoveryCentral,profileRow]) : recoveryServer.request(suffix,options);
      const recoveryCommon={request:recoveryRequest,storage:recoveryServer.storage,repository};
      await publishProtectedOperationalEvidence({...recoveryCommon,directory:sourceDir,deploymentId:sourceId});
      const initiallyStoredSource=clone(recoveryServer.row().payload.current);
      await publishProtectedPreActivationTarget({...recoveryCommon,directory:targetDir,deploymentId:targetId});
      const ordinaryDir=path.join(work,'prepared-ordinary');await fs.mkdir(ordinaryDir);
      for(const name of await fs.readdir(targetDir))if(name!=='pre-activation.json')
        await fs.copyFile(path.join(targetDir,name),path.join(ordinaryDir,name));
      const preparedReadiness=await buildIntegratedCutoverReadiness(sourceHead,{publicImplementationClosureSha256:target.seal.targetImplementationClosureSha256});
      const preparedPlan=activation.prepareIntegratedHistoricalMaintenance({currentRow:central,currentProfileRow:profileRow,sourceHead,
        publicManifest:target.manifest,publicAudit:audit,readiness:preparedReadiness,
        sourceImplementationClosureSha256:source.seal.targetImplementationClosureSha256,
        requestedImplementationClosureSha256:target.seal.targetImplementationClosureSha256,eventName:'schedule',ref:'refs/heads/main',githubSha:sourceHead});
      const d=await read(targetDir,'checkpoint-disposition.json');
      await write(ordinaryDir,'integrated-readiness.json',preparedReadiness);await write(ordinaryDir,'plan.json',preparedPlan);
      await write(ordinaryDir,'handoff.json',{schemaVersion:'ravscore-operational-deploy-handoff-v2',action:'integrated-historical-maintenance',
        sourceHead,centralVersion:central.version,legacySourceRequired:false,checkpointDisposition:d.disposition,
        checkpointDispositionSha256:d.bindingSha256,checkpointDatasetId:d.datasetId,checkpointRuntimeAuditSha256:d.runtimeAuditSha256,
        checkpointBuildOutcome:'success',checkpointSaveOutcome:'success',checkpointPublishOutcome:'success',privatePayloadIncluded:false});
      const observedSourceManifest={...source.manifest,datasetId:'rr-refreshed-historical-source-210'};
      const freshSourceDir=path.join(work,'prepared-fresh-source');await fs.mkdir(freshSourceDir);
      for(const name of await fs.readdir(sourceDir))await fs.copyFile(path.join(sourceDir,name),path.join(freshSourceDir,name));
      await write(freshSourceDir,'manifest.json',observedSourceManifest);
      await write(freshSourceDir,'pages-artifact-seal.json',{...source.seal,runId:43008,runAttempt:1,attemptId:'pages-43008-1',
        artifactId:8888,targetPublicManifestSha256:sha256CanonicalJson(observedSourceManifest)});
      await publishProtectedOperationalEvidence({...recoveryCommon,directory:freshSourceDir,deploymentId:'pages-43008-1'});
      await publishProtectedOperationalEvidence({...recoveryCommon,directory:ordinaryDir,deploymentId:targetId,
        retainPublicManifestSha256:sha256CanonicalJson(observedSourceManifest),requireRetained:true});
      assert(![recoveryServer.row().payload.current,recoveryServer.row().payload.previous].some(d=>d.deploymentId===sourceId),
        'the old central deployment archive may be retired; the exact fresh source is retained');
      await write(ordinaryDir,'source-manifest.json',observedSourceManifest);
      const sourceBytes=await fs.readFile(path.join(ordinaryDir,'source-manifest.json'));
      const crypto=await import('node:crypto');
      await fs.writeFile(path.join(ordinaryDir,'source-deployment-id.txt'),
        'public-source-'+crypto.createHash('sha256').update(sourceBytes).digest('hex').slice(0,24));
      const producer=owner(targetId),executor={...owner('pages-recovery-43009-1'),headSha:'b'.repeat(40)};
      const sourceVerification={schemaVersion:'ravscore-operational-pages-verification-v1',status:'passed',sourceHead,
        datasetId:observedSourceManifest.datasetId,productionReferenceAt:observedSourceManifest.productionReferenceAt,model:'integrated',modelBinding:oldBinding,
        implementationClosureSha256:source.seal.targetImplementationClosureSha256,publicManifestSha256:sha256CanonicalJson(observedSourceManifest),
        zoneCount:210,coastalPartCount:673,privatePayloadRead:false};
      const fetchImpl=async url=>{const u=String(url);let value;
        if(u.includes('/actions/artifacts/'))value={id:target.seal.artifactId,name:target.seal.artifactName,expired:false,
          workflow_run:{id:target.seal.runId,head_sha:target.seal.headSha},size_in_bytes:target.seal.artifactSizeBytes,digest:'sha256:'+target.seal.artifactDigestSha256};
        else if(u.includes('/actions/runs/'))return pagesGithub(url);
        else if(u.includes('/data/live/manifest.json'))value=observedSourceManifest;
        else throw new Error('unexpected synthetic endpoint');
        return {ok:true,json:async()=>clone(value)};};
      const atomicRequest=async(_suffix,options)=>{atomicCount++;const body=JSON.parse(options.body);
        assert.equal(body.p_expected_operational_version,recoveryCentral.version);
        assert.deepEqual(body.p_profile_payload,profileRow.payload);
        recoveryCentral={...recoveryCentral,version:recoveryCentral.version+1,payload:body.p_operational_payload};
        throw new Error('synthetic lost CAS reply after commit');};
      const args={...recoveryCommon,atomicRequest,executor,attempt:terminal(producer),directory:ordinaryDir,baseUrl:'https://synthetic.invalid/',fetchImpl,
        verifyExecutor:async()=>({publicClosure:target.closure,changedOwners:['scripts/protected-operational-reentry-evidence.mjs']}),
        checkReadiness:async()=>preparedReadiness,verifySource:options=>verifyPreparedSource({...options,verifyPublic:async input=>{
          assert.deepEqual(input.expectedManifest,observedSourceManifest,'verify the fresh observed public weather against its actually retained archive');
          assert.notEqual(input.expectedManifest.datasetId,source.manifest.datasetId);
          assert.deepEqual(input.expectedBinding,oldBinding,'implementation comes from the actually retained fresh source under the old binding');
          assert.equal(input.expectedContractText,await fs.readFile(path.join(sourceDir,'target-contract.js'),'utf8'));
          return sourceVerification;
        }})};
      const protectedBefore=clone(recoveryServer.row());
      for(const mutation of [{attempt:{...terminal(producer),status:'in_progress'}},
        {attempt:{...terminal(producer),conclusion:'success'}},
        {fetchImpl:async url=>String(url).includes('/jobs?')?{ok:true,json:async()=>({total_count:1,jobs:[{run_id:producer.runId,run_attempt:producer.runAttempt,head_sha:producer.headSha,
          name:'Deploy prepared Pages artifact',steps:[{name:'Deploy to GitHub Pages',conclusion:'failure'}]}]})}:fetchImpl(url)},
        {checkReadiness:async()=>({...preparedReadiness,sourceHead:executor.headSha})},
        {verifyExecutor:async()=>{throw new Error('unqualified executor');}},
        {verifyExecutor:async()=>({publicClosure:{},changedOwners:[]})},
        {verifySource:async()=>({...sourceVerification,status:'failed'})},
        {fetchImpl:async()=>({ok:true,json:async()=>({})})}]) {
        await assert.rejects(beginTerminalPreparedPreActivation({...args,...mutation}));assert.equal(atomicCount,0);
      }
      recoveryCentral={...recoveryCentral,version:recoveryCentral.version+1};
      await assert.rejects(beginTerminalPreparedPreActivation(args));assert.equal(atomicCount,0);recoveryCentral=clone(central);
      const result=await beginTerminalPreparedPreActivation(args);
      assert.equal(atomicCount,1,'ambiguous CAS is read back, never repeated');assert.equal(result.action,'PENDING_PRE_ACTIVATION');
      assert.equal(result.producerHead,sourceHead);assert.deepEqual(result.actualExecutor,executor);
      assert.equal(recoveryCentral.payload.sourceHead,sourceHead);assert.equal(recoveryCentral.payload.deploymentId,targetId);
      assert.equal(recoveryCentral.version,central.version+1);assert.deepEqual(recoveryServer.row(),protectedBefore);
      const c=activation.resolveOperationalRavScoreModel(recoveryCentral,{profileRow,allowPending:true});
      const phaseEvidence=await inspectProtectedPreActivationTarget(recoveryCommon);
      assert.throws(()=>classifyProtectedPreActivationReentry({evidence:phaseEvidence,current:c,attempt:terminal(producer),repository,sourceHead:executor.headSha}),/pending transition differs/,
        'a copied JSON pending object cannot authorize an observed-source refresh');
      assert.equal((await classifyProtectedPreActivationCurrent({...recoveryCommon,sourceHead:executor.headSha,attempt:terminal(producer)})).action,'PENDING_PRE_ACTIVATION',
        'real central rows plus the protected issued plan admit the distinct observed public source');
      const pending={schemaVersion:'ravscore-operational-pages-pending-identity-v1',repository,runId:producer.runId,runAttempt:producer.runAttempt,
        headSha:sourceHead,ref:'refs/heads/main',attemptId:targetId,requestedAt:c.requestedAt,datasetId:c.datasetId,
        productionReferenceAt:c.productionReferenceAt,sourcePublicManifestSha256:c.sourcePublicManifestSha256,
        requestedPublicManifestSha256:c.requestedPublicManifestSha256,requestedImplementationClosureSha256:c.requestedImplementationClosureSha256,
        requestedModelBinding:c.requestedModelBinding,privatePayloadIncluded:false};
      const terminalEvidence={status:'NOT_STARTED',pagesRequestAccepted:false,deployStepConclusion:'skipped'};
      const admissionArgs={...args,pending,artifactSeal:target.seal,terminalEvidence};
      assert.equal(await readProtectedPreparedTargetAdmission({...admissionArgs,executor:{...executor,headSha:sourceHead}}),null,
        'same-head callers retain the existing normal abort/resume policy');
      const a=await readProtectedPreparedTargetAdmission(admissionArgs);
      assert.equal(a.pendingSha256,sha256CanonicalJson(pending));assert.equal(a.originalAttemptId,targetId);
      // Independent calls reproduce authority from the remote phase/PENDING,
      // including after runner loss; no previously returned admission is input.
      assert.deepEqual(await readProtectedPreparedTargetAdmission(admissionArgs),a);
      await assert.rejects(readProtectedPreparedTargetAdmission({...admissionArgs,pending:{...pending,sourcePublicManifestSha256:'0'.repeat(64)}}));
      await assert.rejects(readProtectedPreparedTargetAdmission({...admissionArgs,terminalEvidence:{...terminalEvidence,status:'AMBIGUOUS'}}));
      for(const mutation of [{status:'failed'},{modelBinding:target.binding},{implementationClosureSha256:'0'.repeat(64)},
        {publicManifestSha256:'0'.repeat(64)},{sourceHead:executor.headSha},{privatePayloadRead:true}])
        await assert.rejects(readProtectedPreparedTargetAdmission({...admissionArgs,verifySource:async()=>({...sourceVerification,...mutation})}),/source verification differs/);
      assert.equal(atomicCount,1);assert.deepEqual(recoveryServer.row(),protectedBefore);
      const {readRavScoreOperationalPagesWriterClosure,classifyRavScoreOperationalPagesRecovery}=await import('./ravscore-operational-pages-recovery.mjs');
      const {registerProtectedPagesWriter,assertProtectedPagesWritesClosed}=await import('./protected-operational-reentry-evidence.mjs');
      const closure=await readRavScoreOperationalPagesWriterClosure({...recoveryCommon,pending,fetchImpl:pagesGithub});
      const identity={repository,runId:producer.runId,runAttempt:producer.runAttempt,headSha:sourceHead,ref:'refs/heads/main',attemptId:targetId};
      const checked=Date.now()+10_000;
      const recoveryInput={pending,artifactSeal:target.seal,targetManifest:target.manifest,preparedTargetAdmission:a,writerClosure:closure,
        artifactEvidence:{schemaVersion:'ravscore-operational-pages-artifact-evidence-v1',...identity,
          artifactId:target.seal.artifactId,artifactName:target.seal.artifactName,artifactDigestSha256:target.seal.artifactDigestSha256,
          artifactSizeBytes:target.seal.artifactSizeBytes,downloadedZipSha256:target.seal.artifactDigestSha256,
          zipHashedBeforeExtraction:true,expired:false,checkedAt:new Date(checked).toISOString(),privatePayloadRead:false},
        terminalEvidence:{schemaVersion:'ravscore-operational-pages-terminal-evidence-v2',...identity,...terminalEvidence,
          runStatus:'completed',runConclusion:'failure',checkedAt:new Date(checked+1000).toISOString(),
          evidenceSource:'github-actions-pages-terminal-readback',privatePayloadRead:false},
        observations:[0,1].map(index=>({schemaVersion:'ravscore-operational-pages-public-observation-v1',...identity,
          publicManifestSha256:pending.sourcePublicManifestSha256,observedAt:new Date(checked+2000+index*2000).toISOString(),
          observationNonce:'writer-closure-'+index,privatePayloadRead:false}))};
      assert.equal(classifyRavScoreOperationalPagesRecovery(recoveryInput).action,'EXACT_TARGET_REDEPLOY');
      assert.equal(classifyRavScoreOperationalPagesRecovery({...recoveryInput,writerClosure:{...closure}}).action,'FAIL_CLOSED');
      const env={GITHUB_REF:'refs/heads/main',GITHUB_REPOSITORY:repository,GITHUB_SHA:executor.headSha,
        GITHUB_RUN_ID:String(executor.runId),GITHUB_RUN_ATTEMPT:String(executor.runAttempt),GITHUB_JOB:'recover-operational-pages-target'};
      const reservationFetch=async url=>String(url).includes('/actions/runs/'+executor.runId)
        ?{ok:true,json:async()=>({...terminal(executor),status:'in_progress',conclusion:null,path:'.github/workflows/run-current-weather-once.yml'})}
        :String(url).includes('/data/live/manifest.json')?new Response(JSON.stringify(observedSourceManifest)):pagesGithub(url);
      const beforeReservation=clone(recoveryServer.row());
      const removedBeforeReservation=[...recoveryServer.removed],archivesBeforeReservation=new Map(recoveryServer.objects);
      assert.deepEqual(removedBeforeReservation,[initiallyStoredSource.objectPath],
        'the earlier normal source refresh pruned only its already unreferenced old source archive');
      await registerProtectedPagesWriter({...recoveryCommon,pending,owner:executor,writerClosure:closure,
        env,baseUrl:'https://ravradar.dk',fetchImpl:reservationFetch});
      const reserved=clone(recoveryServer.row());
      assert.equal(reserved.payload.schemaVersion,'3.0.0');assert.deepEqual(reserved.payload.pagesWrite.owner,executor);
      assert.deepEqual(reserved.payload.current,beforeReservation.payload.current);
      assert.deepEqual(reserved.payload.previous,beforeReservation.payload.previous);
      assert.deepEqual(reserved.payload.preActivation,beforeReservation.payload.preActivation);
      assert.equal(reserved.payload.pagesWrite.target.deploymentId,targetId);
      await assert.rejects(registerProtectedPagesWriter({...recoveryCommon,pending,owner:executor,writerClosure:closure,
        env,baseUrl:'https://ravradar.dk',fetchImpl:reservationFetch}),/changed or already consumed/);
      assert.deepEqual(recoveryServer.row(),reserved,'same B never consumes another POST right');
      const unknownB=async url=>{
        if(!String(url).includes('/actions/runs/'+executor.runId))return pagesGithub(url);
        const result=await pagesGithub(String(url).replace('/'+executor.runId,'/'+producer.runId));
        const value=await result.json();
        if(value.jobs){for(const job of value.jobs){job.run_id=executor.runId;job.head_sha=executor.headSha;}
          value.jobs[2].conclusion='failure';value.jobs[2].steps=[{name:'Redeploy the exact sealed Pages target',status:'completed',conclusion:'cancelled',number:9}];}
        else Object.assign(value,{id:executor.runId,head_sha:executor.headSha});
        return {ok:true,json:async()=>value};
      };
      await assert.rejects(assertProtectedPagesWritesClosed({...recoveryCommon,fetchImpl:unknownB}),/WRITE_CLOSURE_UNKNOWN/);
      await assert.rejects(readRavScoreOperationalPagesWriterClosure({...recoveryCommon,pending,fetchImpl:unknownB}),/WRITE_CLOSURE_UNKNOWN/);
      const lateTarget={...recoveryInput,writerClosure:null,observations:recoveryInput.observations.map(o=>({...o,
        publicManifestSha256:pending.requestedPublicManifestSha256}))};
      assert.equal(classifyRavScoreOperationalPagesRecovery(lateTarget).action,'TARGET_RECONCILE');
      assert.deepEqual(recoveryServer.row(),reserved,'late verification does not erase unknown B');
      const closedB=async url=>{
        if(!String(url).includes('/actions/runs/'+executor.runId))return pagesGithub(url);
        const value=await (await pagesGithub(String(url).replace('/'+executor.runId,'/'+producer.runId))).json();
        if(value.jobs)for(const job of value.jobs){job.run_id=executor.runId;job.head_sha=executor.headSha;}
        else Object.assign(value,{id:executor.runId,head_sha:executor.headSha});
        return {ok:true,json:async()=>value};
      };
      const nextOwner={...executor,runId:43010,attemptId:'pages-recovery-43010-1'};
      const nextFetch=async url=>String(url).includes('/actions/runs/'+nextOwner.runId)
        ?{ok:true,json:async()=>({...terminal(nextOwner),status:'in_progress',conclusion:null,path:'.github/workflows/run-current-weather-once.yml'})}
        :String(url).includes('/data/live/manifest.json')?new Response(JSON.stringify(observedSourceManifest)):closedB(url);
      const nextClosure=await readRavScoreOperationalPagesWriterClosure({...recoveryCommon,pending,fetchImpl:closedB});
      let reservationWrites=0;
      const lostReservationReply=async(suffix,options={})=>{
        const result=await recoveryRequest(suffix,options);
        if(options.method==='PATCH'){reservationWrites++;throw new Error('synthetic committed recovery-owner reply lost');}
        return result;
      };
      await registerProtectedPagesWriter({...recoveryCommon,request:lostReservationReply,pending,owner:nextOwner,
        writerClosure:nextClosure,env:{...env,GITHUB_RUN_ID:String(nextOwner.runId)},baseUrl:'https://ravradar.dk',fetchImpl:nextFetch});
      assert.equal(reservationWrites,1);assert.deepEqual(recoveryServer.row().payload.pagesWrite.owner,nextOwner);
      assert.deepEqual(recoveryServer.row().payload.preActivation,reserved.payload.preActivation);
      assert.deepEqual(recoveryServer.removed,removedBeforeReservation,'B/C reservation never deletes another object');
      for(const [name,bytes] of archivesBeforeReservation)assert.deepEqual(recoveryServer.objects.get(name),bytes,
        'B/C reservation retains every actual recovery-server archive');
    }

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
    const plan=activation.prepareIntegratedHistoricalMaintenance({currentRow:central,currentProfileRow:profileRow,sourceHead,
      publicManifest:target.manifest,publicAudit:audit,readiness,sourceImplementationClosureSha256:source.seal.targetImplementationClosureSha256,
      requestedImplementationClosureSha256:target.seal.targetImplementationClosureSha256,eventName:'schedule',ref:'refs/heads/main',githubSha:sourceHead});
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
    assert.equal((await classifyProtectedPreActivationCurrent({...common,sourceHead:'b'.repeat(40),attempt:terminal(secondOwner)})).action,'PENDING_PRE_ACTIVATION',
      'a new delivery executor must preserve the authentic old pending producer');
    assert.deepEqual(server.row(),published,'pending coexistence does not replace durable evidence');
    const pendingBeforeRetire=clone(central);
    assert.equal((await (await import('./protected-operational-reentry-evidence.mjs')).retireClosedUnpublishedOrdinaryPreActivationTarget({
      ...common,sourceHead,baseUrl:'https://ravradar.dk'})).retired,false,'a genuine historical model PENDING retains its original target');
    assert.deepEqual(central,pendingBeforeRetire);assert.deepEqual(server.row(),published);
    for(const [name,bytes] of originalFiles)assert.deepEqual(server.objects.get(name),bytes,'original immutable archive retained');
    assert.equal(server.removed.length,0);
    const activePhaseFetch=async(url,options)=>{
      if(String(url).includes('/data/live/manifest.json'))return new Response(JSON.stringify(source.manifest));
      const result=await pagesGithub(url,options);
      if(String(url).includes('/actions/runs/'+secondOwner.runId)&&!String(url).includes('/jobs?')){
        const value=await result.json();return {ok:true,json:async()=>({...value,status:'in_progress',conclusion:null})};
      }
      return result;
    };
    const {registerProtectedPagesWriter}=await import('./protected-operational-reentry-evidence.mjs');
    await registerProtectedPagesWriter({...common,owner:secondOwner,baseUrl:'https://ravradar.dk',fetchImpl:activePhaseFetch,
      env:{GITHUB_REPOSITORY:repository,GITHUB_REF:'refs/heads/main',GITHUB_SHA:sourceHead,GITHUB_RUN_ID:String(secondOwner.runId),
        GITHUB_RUN_ATTEMPT:String(secondOwner.runAttempt),GITHUB_JOB:'deploy-pages'}});
    assert.deepEqual(server.row().payload.pagesWrite.owner,secondOwner,'preactivation has the same one durable writer slot');
    assert.deepEqual(server.row().payload.preActivation,published.payload.preActivation,'reserving Pages never rewrites the original phase');
    assert.equal(server.removed.length,0);
  } finally {if(savedPagesToken===undefined)delete process.env.GH_TOKEN;else process.env.GH_TOKEN=savedPagesToken;
    await fs.rm(work,{recursive:true,force:true});}
});

test('closed ordinary phase retires only its authenticated unchanged-model default intention and retains every archive',async()=>{
  const savedToken=process.env.GH_TOKEN;process.env.GH_TOKEN='synthetic-pages-test-token';
  const p=await import('./protected-operational-reentry-evidence.mjs'),a=await import('./ravscore-operational-activation.mjs');
  const {CANDIDATE_G_OPERATIONAL_ROLLBACK_ID}=await import('./lib/ravscore-candidate-g-rollback-runtime.mjs');
  const work=await fs.mkdtemp(path.join(os.tmpdir(),'rr-closed-ordinary-phase-'));
  const sourceHead='a'.repeat(40),producerId=55002,consumerId=55003;
  try{
    const sourceDir=path.join(work,'source'),targetDir=path.join(work,'target');
    const source=await fixture(sourceDir,{deploymentId:'pages-55001-1',sourceHead});
    const target=await fixture(targetDir,{deploymentId:'pages-55002-1',sourceHead,hour:'11'});
    const profile={document_key:a.RAVSCORE_PROFILE_SELECTION_DOCUMENT_KEY,version:10,
      payload:JSON.parse(await fs.readFile(path.join(root,'data/admin/ravscore-profile-selection.json'),'utf8'))};
    let central={document_key:a.RAVSCORE_OPERATIONAL_ACTIVATION_DOCUMENT_KEY,version:20,payload:{
      schemaVersion:a.RAVSCORE_OPERATIONAL_ACTIVATION_SCHEMA,status:a.RAVSCORE_OPERATIONAL_STATUSES.integrated,
      transitionKind:a.RAVSCORE_OPERATIONAL_TRANSITION_KINDS.integratedReturn,sourceHead,datasetId:source.manifest.datasetId,
      productionReferenceAt:source.manifest.productionReferenceAt,rollbackId:CANDIDATE_G_OPERATIONAL_ROLLBACK_ID,
      activeModelBinding:source.binding,requestedModelBinding:source.binding,sourceModelBinding:source.binding,
      candidatePlanSha256:null,candidateFullSha256:null,privateBundleContentSha256:null,
      publicManifestSha256:sha256CanonicalJson(source.manifest),sourcePublicManifestSha256:sha256CanonicalJson(source.manifest),
      requestedPublicManifestSha256:sha256CanonicalJson(source.manifest),sourceImplementationClosureSha256:source.seal.targetImplementationClosureSha256,
      requestedImplementationClosureSha256:source.seal.targetImplementationClosureSha256,sourceDeploymentId:'pages-55001-1',deploymentId:'pages-55001-1',
      automaticActivationAllowed:false,schedulerActivationAllowed:false,calibrationEligible:false,
      requestedAt:source.seal.createdAt,activatedAt:source.seal.createdAt,failureCode:null,
      returnPlanSha256:null,integratedReadinessSha256:null,integratedPublicAuditSha256:null,integratedManifestSha256:null}};
    const resolved=a.resolveOperationalRavScoreModel(central,{profileRow:profile});
    const sourceCurrent={...resolved,bindingCurrent:a.operationalResolvedBindingCurrent(resolved)};
    assert.equal(sourceCurrent.bindingCurrent,true);
    const state=remote();let lostReply=false,phaseWrites=0,producerActive=true;
    const request=async(suffix,options={})=>{
      if(suffix.includes('document_key=in.'))return clone([central,profile]);
      const result=await state.request(suffix,options);
      if(options.method==='PATCH'&&lostReply){phaseWrites++;throw new Error('synthetic committed phase reply lost');}
      return result;
    };
    const eventFile=path.join(work,'event.json');await fs.writeFile(eventFile,JSON.stringify({inputs:{}}));
    const env=runId=>({GITHUB_REPOSITORY:repository,GITHUB_SHA:sourceHead,GITHUB_REF:'refs/heads/main',
      GITHUB_WORKFLOW_REF:repository+'/.github/workflows/run-current-weather-once.yml@refs/heads/main',GITHUB_EVENT_NAME:'workflow_dispatch',
      GITHUB_EVENT_PATH:eventFile,GITHUB_RUN_ID:String(runId),GITHUB_RUN_ATTEMPT:'1',GITHUB_JOB:'deploy-pages'});
    const fetchImpl=async url=>{
      const u=String(url),runId=Number(u.match(/\/actions\/runs\/(\d+)/)?.[1]);
      if(u.includes('/data/live/manifest.json'))return new Response(JSON.stringify(source.manifest));
      const run={id:runId,run_attempt:1,head_sha:sourceHead,head_branch:'main',repository:{full_name:repository},
        path:'.github/workflows/run-current-weather-once.yml',event:'workflow_dispatch',updated_at:'2026-11-12T01:00:00Z',
        status:runId===consumerId||(runId===producerId&&producerActive)?'in_progress':'completed',
        conclusion:runId===consumerId||(runId===producerId&&producerActive)?null:'failure'};
      const jobs=['Deploy prepared Pages artifact through reusable workflow',
        'Finish an interrupted generation before new work / resume-pre-activation-pages','Redeploy only a helper-proven exact sealed Pages target']
        .map((name,index)=>({id:runId*10+index+1,run_id:runId,run_attempt:1,head_sha:sourceHead,name,status:'completed',conclusion:'skipped'}));
      return {ok:true,json:async()=>u.includes('/jobs?')?{total_count:3,jobs}:run};
    };
    const common={request,storage:state.storage,repository,fetchImpl};
    await publishProtectedOperationalEvidence({...common,directory:sourceDir,deploymentId:'pages-55001-1'});
    const runtimeAudit={datasetId:target.manifest.datasetId,privatePayloadIncluded:false};
    const disposition={schemaVersion:'ravscore-continuation-checkpoint-disposition-v1',sourceHead,datasetId:target.manifest.datasetId,
      disposition:'READY_PUBLISHED',rollbackStatus:'READY',rollbackActivationReady:true,checkpointRequired:true,
      runtimeAuditSha256:sha256CanonicalJson(runtimeAudit),privatePayloadIncluded:false};
    await fs.writeFile(path.join(targetDir,'checkpoint-runtime-audit.json'),JSON.stringify(runtimeAudit));
    await fs.writeFile(path.join(targetDir,'checkpoint-disposition.json'),JSON.stringify({...disposition,bindingSha256:sha256CanonicalJson(disposition)}));
    await fs.unlink(path.join(targetDir,'handoff.json'));
    await fs.writeFile(path.join(targetDir,'pre-activation.json'),JSON.stringify({schemaVersion:'ravradar-current-grid-pre-activation-v1',sourceHead,
      sourceCurrent,sourceCurrentSha256:sha256CanonicalJson(sourceCurrent),checkpointOutcomes:{build:'success',save:'success',publish:'success'},privatePayloadIncluded:false}));
    await p.publishProtectedPreActivationTarget({...common,directory:targetDir,deploymentId:'pages-55002-1',env:env(producerId)});
    const beforeBootstrap=clone(state.row());
    const legacyUnknown=async(url,options)=>{
      const result=await fetchImpl(url,options);
      if(!String(url).includes('/actions/runs/'+producerId))return result;
      const value=await result.json();
      if(value.jobs)value.jobs[0]={...value.jobs[0],name:'Deploy prepared Pages artifact',conclusion:'failure',
        steps:[{name:'Deploy to GitHub Pages',status:'completed',conclusion:'failure',number:30}]};
      else Object.assign(value,{status:'completed',conclusion:'failure'});
      return {ok:true,json:async()=>value};
    };
    await assert.rejects(p.assertProtectedPagesWritesClosed({...common,fetchImpl:legacyUnknown,allowCurrentOwner:true,env:env(consumerId)}),
      /WRITE_CLOSURE_UNKNOWN/,'bootstrap rejects unresolved A before source backfill could evict it');
    assert.deepEqual(state.row(),beforeBootstrap);
    const writer={repository,runId:producerId,runAttempt:1,headSha:sourceHead,attemptId:'pages-55002-1'};
    const publicObservations=[];
    const pagesAliasFetch=async(url,options)=>{
      if(String(url).includes('/data/live/manifest.json')){
        const observed=new URL(url);
        if(observed.origin==='https://jakobjorgensen82-commits.github.io')
          throw new TypeError('fetch failed',{cause:new Error('unexpected redirect')});
        assert.equal(observed.origin,'https://ravradar.dk','the permitted Pages alias must use its fixed canonical origin');
        assert.equal(observed.pathname,'/data/live/manifest.json');
        assert.equal(options.redirect,'error','arbitrary response redirects remain forbidden');
        assert.equal(options.cache,'no-store');assert.equal(options.headers['Cache-Control'],'no-cache');
        publicObservations.push(observed.href);
      }
      return fetchImpl(url,options);
    };
    const beforePublicObservation=clone(state.row());
    for(const [baseUrl,publicResponse,error] of [
      ['https://untrusted.invalid',null,/Public source observation base differs/],
      ['https://ravradar.dk',new Response('',{status:302}),/Public source observation unavailable/],
      ['https://ravradar.dk',new Response(JSON.stringify({...source.manifest,datasetId:'rr-changed-source-210'})),/Public source changed/],
    ]){
      await assert.rejects(p.registerProtectedPagesWriter({...common,owner:writer,env:env(producerId),baseUrl,
        fetchImpl:(url,options)=>String(url).includes('/data/live/manifest.json')?Promise.resolve(publicResponse):fetchImpl(url,options)}),error);
      assert.deepEqual(state.row(),beforePublicObservation,'invalid public observations cannot reserve the writer or change its protected target');
    }
    await p.registerProtectedPagesWriter({...common,owner:writer,env:env(producerId),
      baseUrl:'https://jakobjorgensen82-commits.github.io/RavRadar',fetchImpl:pagesAliasFetch});
    assert.equal(publicObservations.length,2,'both fresh observations use the canonical public origin');
    assert.notEqual(publicObservations[0],publicObservations[1],'each observation keeps its fresh nonce');
    const firstReservation=clone(state.row());
    assert.deepEqual(firstReservation.payload.pagesWrite.owner,writer,'ordinary A has the same single durable writer slot');
    const readbackArgs={...common,owner:writer,seal:target.seal,sourceManifest:source.manifest};
    const firstReadback=await p.readProtectedPagesWriterSnapshot(readbackArgs);
    assert.deepEqual(await p.readProtectedPagesWriterSnapshot({...readbackArgs,expectedSnapshot:firstReadback.snapshotSha256}),firstReadback);
    for(const mutation of [{artifactId:target.seal.artifactId+1},{artifactDigestSha256:'8'.repeat(64)},
      {targetPublicManifestSha256:'8'.repeat(64)},{targetImplementationClosureSha256:'8'.repeat(64)},
      {targetModelBinding:{...target.binding,modelBundleSha256:'8'.repeat(64)}}])
      await assert.rejects(p.readProtectedPagesWriterSnapshot({...readbackArgs,seal:{...target.seal,...mutation}}),
        /reservation or exact target changed|original artifact seal changed/,'a correctly shaped different artifact/target is never the reserved seal');
    const changedSlotRead=async(suffix,options={})=>{
      const rows=await request(suffix,options);
      return rows.map(row=>row.document_key===policy.documentKey?{...row,version:row.version+1,payload:{...row.payload,
        pagesWrite:{...row.payload.pagesWrite,owner:{...writer,runId:consumerId,attemptId:'pages-55003-1'}}}}:row);
    };
    await assert.rejects(p.readProtectedPagesWriterSnapshot({...readbackArgs,request:changedSlotRead}),/reservation or exact target changed/,
      'the first POST cannot proceed after its durable owner changes');
    const changedVersionRead=async(suffix,options={})=>(await request(suffix,options)).map(row=>
      row.document_key===policy.documentKey?{...row,version:row.version+1}:row);
    await assert.rejects(p.readProtectedPagesWriterSnapshot({...readbackArgs,request:changedVersionRead,
      expectedSnapshot:firstReadback.snapshotSha256}),/admission snapshot changed/,'ordinal two cannot reuse a moved durable snapshot');
    const beforeCentralChange=clone(central);central={...central,version:central.version+1};
    await assert.rejects(p.readProtectedPagesWriterSnapshot({...readbackArgs,expectedSnapshot:firstReadback.snapshotSha256}),/admission snapshot changed/);
    central=beforeCentralChange;
    assert.deepEqual(state.row(),firstReservation,'per-POST readback neither reserves nor writes');
    await assert.rejects(p.registerProtectedPagesWriter({...common,owner:writer,env:env(producerId),baseUrl:'https://ravradar.dk'}),/already consumed/);
    assert.deepEqual(state.row(),firstReservation,'a restarted execution cannot reuse A\'s first reservation');
    producerActive=false;
    const unknownOrdinary=async(url,options)=>{
      const result=await fetchImpl(url,options);
      if(!String(url).includes('/actions/runs/'+producerId)||!String(url).includes('/jobs?'))return result;
      const value=await result.json();value.jobs[0]={...value.jobs[0],name:'Deploy prepared Pages artifact',conclusion:'failure',
        steps:[{name:'Deploy to GitHub Pages',status:'completed',conclusion:'failure',number:30}]};
      return {ok:true,json:async()=>value};
    };
    await assert.rejects(p.assertProtectedPagesWritesClosed({...common,fetchImpl:unknownOrdinary}),/WRITE_CLOSURE_UNKNOWN/);
    await assert.rejects(p.registerProtectedPagesWriter({...common,owner:{...writer,runId:consumerId,attemptId:'pages-55003-1'},
      env:env(consumerId),baseUrl:'https://ravradar.dk',fetchImpl:unknownOrdinary}),/WRITE_CLOSURE_UNKNOWN/);
    assert.deepEqual(state.row(),firstReservation,'another caller cannot replace an unknown ordinary A');
    const before=clone(state.row()),archives=new Map(state.objects);
    assert.equal((await p.inspectProtectedPreActivationTarget(common)).phase.ordinaryMaintenance.owner.runId,producerId);
    const verification={schemaVersion:'ravscore-operational-pages-verification-v1',status:'passed',sourceHead,model:'integrated',
      datasetId:source.manifest.datasetId,productionReferenceAt:source.manifest.productionReferenceAt,modelBinding:source.binding,
      publicManifestSha256:sha256CanonicalJson(source.manifest),implementationClosureSha256:source.seal.targetImplementationClosureSha256,
      zoneCount:210,coastalPartCount:673,privatePayloadRead:false};
    const args={...common,sourceHead,env:env(consumerId),baseUrl:'https://ravradar.dk',verifyPublic:async options=>{
      assert.deepEqual(options.expectedManifest,source.manifest);assert.deepEqual(options.expectedBinding,source.binding);return verification;}};
    await fs.writeFile(eventFile,JSON.stringify({inputs:{completed_private_runtime:true}}));
    assert.equal((await p.retireClosedUnpublishedOrdinaryPreActivationTarget(args)).retired,false,'explicit recovery cannot discard its target');
    assert.deepEqual(state.row(),before);
    await fs.writeFile(eventFile,JSON.stringify({inputs:{}}));
    const oldCentral=clone(central),oldProfile=clone(profile.payload),changedBinding={...source.binding,modelBundleSha256:'9'.repeat(64)};
    central.payload={...central.payload,activeModelBinding:changedBinding,sourceModelBinding:changedBinding,requestedModelBinding:changedBinding};
    profile.payload={...profile.payload,modelBundleSha256:changedBinding.modelBundleSha256};
    assert.equal((await p.retireClosedUnpublishedOrdinaryPreActivationTarget(args)).retired,false);
    central=oldCentral;profile.payload=oldProfile;
    assert.deepEqual(state.row(),before,'a changed model/SQL family retains the original phase');
    lostReply=true;
    assert.equal((await p.retireClosedUnpublishedOrdinaryPreActivationTarget(args)).action,'NONE');
    assert.equal(phaseWrites,1,'lost CAS response is read back without repeating the write');
    assert.equal((await p.inspectProtectedPreActivationTarget(common)).action,'NONE');
    assert.deepEqual(state.row().payload.current,before.payload.current);assert.deepEqual(state.row().payload.previous,before.payload.previous);
    assert.deepEqual(state.row().payload.pagesWrite,before.payload.pagesWrite,'phase retirement preserves the latest Pages writer');
    for(const [name,bytes]of archives)assert.deepEqual(state.objects.get(name),bytes);
    assert.equal(state.removed.length,0);
    assert.equal((await p.retireClosedUnpublishedOrdinaryPreActivationTarget(args)).retired,false);assert.equal(phaseWrites,1);
  }finally{if(savedToken===undefined)delete process.env.GH_TOKEN;else process.env.GH_TOKEN=savedToken;
    await fs.rm(work,{recursive:true,force:true});}
});


// Real normal clients and SigV4 slot transport; only the HTTP boundary is synthetic.
function slotTransportFixture({operationMs=10_000,primaryMap=new Map(),initialRow=null,isolatedRestoreTarget=null}={}) {
  const primary=primaryMap,slots=new Map(),events=[],unexpected=[],statuses=[],pending=[];
  let row=initialRow,primaryFailure=null,primaryBucketRead=null,r2Failure=false,nextPut=null,lateCas=null,nextCas=null,pointerHang=false,bucketHang=false,foreignBytes=0,archiveReservation=null;
  let archiveReservationError='NoSuchKey';
  const bucket=policy.bucketId,base='https://synthetic.supabase.co';
  const readPath='/storage/v1/object/authenticated/'+bucket+'/',writePath='/storage/v1/object/'+bucket+'/';
  const hash=b=>crypto.createHash('sha256').update(b).digest('hex');
  const fail=label=>{unexpected.push(label);throw Error('UNEXPECTED_SYNTHETIC_TRANSPORT');};
  const decode=wire=>{const at=wire.indexOf(10),end=wire.indexOf(10,at+1);
    return {header:JSON.parse(wire.subarray(at+1,end)),archive:wire.subarray(end+1)};};
  const etag=bytes=>'"'+hash(bytes)+'"';
  const fetchImpl=async(url,options={})=>{
    const u=new URL(url),method=options.method??'GET';
    if(u.host==='synthetic.supabase.co'){
      if(u.pathname==='/rest/v1/admin_documents'){
        if(method==='GET'){
          if(pointerHang&&options.signal)return new Promise((_resolve,reject)=>options.signal.addEventListener('abort',
            ()=>reject(Error('SYNTHETIC_POINTER_ABORTED')),{once:true}));
          return Response.json(row?[clone(row)]:[]);
        }
        events.push('pointer-'+method);const payload=JSON.parse(options.body).payload;
        const apply=()=>{
          if(method==='POST'&&row)return [];
          if(method==='PATCH'&&Number(u.searchParams.get('version')?.slice(3))!==row?.version)return [];
          row={document_key:policy.documentKey,version:row?row.version+1:1,payload};return [clone(row)];
        };
        if(nextCas==='before'){nextCas=null;lateCas=apply;throw Error('SYNTHETIC_UNKNOWN_CAS');}
        if(nextCas==='after'){nextCas=null;apply();throw Error('SYNTHETIC_LOST_CAS_ACK');}
        return Response.json(apply());
      }
      if(u.pathname==='/storage/v1/bucket/'+bucket&&method==='GET'){
        events.push('primary-bucket-get');
        return primaryBucketRead ? primaryBucketRead() : Response.json({id:bucket,name:bucket,
          public:false,file_size_limit:PROTECTED_PRIVATE_RUNTIME_POLICY.maximumArchiveBytes,allowed_mime_types:['application/gzip']});
      }
      if(u.pathname.startsWith(readPath)&&method==='GET'){
        events.push('primary-get');if(primaryFailure instanceof Error)throw primaryFailure;
        if(primaryFailure!==null){
          if(typeof primaryFailure==='function')return primaryFailure();
          return new Response('',{status:primaryFailure});
        }
        const key=u.pathname.slice(readPath.length);
        return primary.has(key)?new Response(primary.get(key)):new Response('',{status:404});
      }
      if(u.pathname.startsWith(writePath)&&method==='POST'){
        events.push('primary-post');assert.equal(options.headers['x-upsert'],'false');const key=u.pathname.slice(writePath.length);
        if(primary.has(key))return Response.json({code:'KeyAlreadyExists'},{status:409});
        primary.set(key,Buffer.from(options.body));return new Response('',{status:200});
      }
      if(u.pathname==='/storage/v1/object/'+bucket&&method==='DELETE'){
        events.push('primary-delete');for(const key of JSON.parse(options.body).prefixes)primary.delete(key);return new Response('',{status:200});
      }
      return fail('primary:'+method+u.pathname);
    }
    if(u.host!=='aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa.eu.r2.cloudflarestorage.com')return fail('host');
    events.push('r2-'+method);const headers=new Headers(options.headers);
    assert(headers.get('authorization').startsWith('AWS4-HMAC-SHA256 '));assert.equal(options.redirect,'manual');
    if(r2Failure)return new Response('',{status:403});
    const reservationKey='operational-evidence/weather-archive-upload/v1.json';
    if(u.pathname==='/'+bucket+'/'+reservationKey&&method==='GET'){
      assert.equal(options.cache,'no-store');
      return archiveReservation ? new Response(archiveReservation,{headers:{etag:etag(archiveReservation)}})
        : new Response('<Error><Code>'+archiveReservationError+'</Code></Error>',
          {status:404,headers:{'content-type':'application/xml'}});
    }
    if(u.pathname==='/'+bucket&&method==='HEAD')return new Response(null,{status:200});
    if(u.pathname==='/'+bucket&&method==='GET'&&u.searchParams.get('list-type')==='2'){
      if(bucketHang)return new Promise((_resolve,reject)=>options.signal.addEventListener('abort',()=>reject(Error('SYNTHETIC_BUCKET_ABORTED')),{once:true}));
      return new Response('<ListBucketResult>'+(foreignBytes?'<Contents><Key>other-preserved-data.bin</Key><Size>'+foreignBytes+'</Size></Contents>':'')+[...slots].map(([n,b])=>'<Contents><Key>operational-evidence/slots/v3/slot-'+n+'.bin</Key><Size>'+b.length+'</Size></Contents>').join('')+ (archiveReservation?'<Contents><Key>'+reservationKey+'</Key><Size>'+archiveReservation.length+'</Size></Contents>':'')+'<IsTruncated>false</IsTruncated></ListBucketResult>');
    }
    const match=u.pathname.match(new RegExp('^/'+bucket+'/operational-evidence/slots/v3/slot-([1-6])\\.bin$'));
    if(!match)return fail('R2:'+method+u.pathname);
    const slot=Number(match[1]);
    if(method==='GET')return slots.has(slot)?new Response(slots.get(slot),{headers:{etag:etag(slots.get(slot)),
      'content-length':String(slots.get(slot).length)}}):new Response('',{status:404});
    if(method!=='PUT')return fail('slot mutation:'+method);
    const body=Buffer.from(options.body),signed=headers.get('authorization').match(/SignedHeaders=([^,]+)/)[1].split(';');
    assert(signed.includes(headers.has('if-match')?'if-match':'if-none-match'),'the actual CAS condition is signed');
    const apply=()=>{
      const present=slots.get(slot);
      if(present?headers.get('if-match')!==etag(present):headers.get('if-none-match')!=='*')return 412;
      slots.set(slot,body);assert(slots.size<=6);return 200;
    };
    const mode=typeof nextPut==='function'?nextPut({slot,body,headers}):nextPut;
    if(mode){nextPut=null;
      if(mode==='before'){pending.push(apply);throw Error('SYNTHETIC_UNANSWERED_PUT');}
      if(mode==='after'){apply();throw Error('SYNTHETIC_LOST_PUT_ACK');}
      if(mode==='hang')return new Promise((_resolve,reject)=>{
        pending.push(apply);options.signal.addEventListener('abort',()=>reject(Error('SYNTHETIC_ABORTED_PUT')),{once:true});});
    }
    return new Response('',{status:apply()});
  };
  const clients=createProtectedOperationalEvidenceClients({supabaseUrl:base,serviceRoleKey:'synthetic-service-secret-only',fetchImpl,
    operationMs,isolatedRestoreTarget,onReplicaStatus:status=>statuses.push(status),slotsFactory:(fetchBound,delayImpl)=>createOperationalEvidenceR2Slots({
      accountId:'a'.repeat(32),accessKeyId:'synthetic-id',secretAccessKey:'synthetic-secret',bucketId:bucket,fetchImpl:fetchBound,delayImpl})});
  return {clients,primary,slots,events,statuses,decode,rawFetch:fetchImpl,setForeignBytes:value=>{foreignBytes=value;},setArchiveReservation:value=>{archiveReservation=value;},hangBucket:value=>{bucketHang=value;},hangReplicaPointer:value=>{pointerHang=value;},row:()=>clone(row),setRow:value=>{row=clone(value);},
    failPrimary:value=>{primaryFailure=value;},setPrimaryBucketRead:value=>{primaryBucketRead=value;},
    failR2:value=>{r2Failure=value;},setArchiveReservationError:value=>{archiveReservationError=value;},nextPut:value=>{nextPut=value;},
    nextCas:value=>{nextCas=value;},releaseCas:()=>{const apply=lateCas;lateCas=null;return apply();},
    releasePuts:()=>pending.splice(0).map(apply=>apply()),check:()=>assert.deepEqual(unexpected,[])};
}
async function slotPublication(work,t,id,{retain=null}={}) {
  const directory=path.join(work,String(id));
  await fixture(directory,{deploymentId:'pages-'+id+'-1',sourceHead:(id%2?'a':'b').repeat(40)});
  const built=await buildProtectedOperationalEvidenceArchive({directory,deploymentId:'pages-'+id+'-1',repository});
  const result=await publishProtectedOperationalEvidence({directory,deploymentId:'pages-'+id+'-1',repository,
    request:t.clients.documentRequest,storage:t.clients.storage,...(retain?{retainDeploymentId:'pages-'+retain+'-1',requireRetained:true}:{})});
  return {directory,built,result};
}
test('ordinary R2 readback verifies isolated files without additional remote work',async()=>{
  const work=await fs.mkdtemp(path.join(os.tmpdir(),'rr-r2-isolated-restore-'));
  try{
    const runnerTemp=path.join(work,'runner');
    await fs.mkdir(runnerTemp,{mode:0o700});
    const id=8100, deploymentId='pages-8100-1', sourceHead='b'.repeat(40);
    const normal=slotTransportFixture();
    const baseline=await slotPublication(work,normal,id);
    for(const [directory,status] of [
      [runnerTemp,'OPERATIONAL_REPLICA_ISOLATED_RESTORE_VERIFIED'],
      [path.join(work,'missing'),'OPERATIONAL_REPLICA_ISOLATED_RESTORE_NOT_VERIFIED'],
    ]){
      const t=slotTransportFixture({isolatedRestoreTarget:{directory,deploymentId,sourceHead}});
      const candidate=await slotPublication(work,t,id);
      const {isolatedRestore,...replica}=candidate.result.replica;
      assert.equal(candidate.result.published,true);
      assert.deepEqual(replica,baseline.result.replica);
      assert.deepEqual(t.events,normal.events);
      assert.deepEqual(isolatedRestore,directory===runnerTemp?{
        status,deploymentId,sourceHead,publicManifestSha256:candidate.built.descriptor.publicManifestSha256,
        fileCount:(await fs.readdir(candidate.directory)).length,
      }:{status});
      assert.deepEqual(await fs.readdir(runnerTemp),[]);
      t.check();
    }
  }finally{await fs.rm(work,{recursive:true,force:true});}
});
test('operational slots restore exact gzip on authenticated Storage 404 or the observed legacy missing bucket',async()=>{
  const work=await fs.mkdtemp(path.join(os.tmpdir(),'rr-slots-read-'));
  try{
    const t=slotTransportFixture(),{directory,built,result}=await slotPublication(work,t,8101);
    assert.equal(result.replica.status,'OPERATIONAL_REPLICA_VERIFIED');assert.equal(t.slots.size,1);
    assert.deepEqual(t.decode([...t.slots.values()][0]).archive,built.archive);
    const start=t.events.length;await t.clients.storage.download(built.descriptor.objectPath);
    assert.deepEqual(t.events.slice(start),['primary-get']);
    t.primary.delete(built.descriptor.objectPath);
    const legacyMissingBucket = (statusCode, code='NoSuchBucket', status=400) => () => Response.json({statusCode,code},{status});
    for(const [name,failure] of [['direct-404',null],['legacy-bucket',legacyMissingBucket('404')]]){
      t.failPrimary(failure);
      const restored=path.join(work,name);
      await restoreProtectedOperationalEvidence({directory:restored,deploymentId:built.descriptor.deploymentId,repository,
        request:t.clients.documentRequest,storage:t.clients.storage});
      for(const file of await fs.readdir(directory)){
        assert.deepEqual(await fs.readFile(path.join(restored,file)),await fs.readFile(path.join(directory,file)));
      }
    }
    const restore = name => restoreProtectedOperationalEvidence({
      directory: path.join(work, name), deploymentId: built.descriptor.deploymentId, repository,
      request: t.clients.documentRequest, storage: t.clients.storage,
    });
    const missingBucketStatus = () => new Response('', { status: 404 });
    for (const [name, metadataResponse, objectResponse] of [
      ['whole-bucket-missing', missingBucketStatus, legacyMissingBucket('404')],
      ['whole-bucket-missing-legacy', legacyMissingBucket('404'), null],
    ]) {
      t.setPrimaryBucketRead(metadataResponse);
      t.failPrimary(objectResponse);
      const beforeWholeBucketRestore = t.events.length;
      assert.equal((await restore(name)).restored, true);
      assert.equal(t.statuses.at(-1), 'OPERATIONAL_REPLICA_BUCKET_RESTORE_VERIFIED');
      assert.deepEqual(t.events.slice(beforeWholeBucketRestore),
        ['primary-bucket-get', 'primary-get', ...Array(6).fill('r2-GET')]);
      for (const file of await fs.readdir(directory)) {
        assert.deepEqual(await fs.readFile(path.join(work, name, file)),
          await fs.readFile(path.join(directory, file)));
      }
    }

    t.setPrimaryBucketRead(missingBucketStatus);
    t.failPrimary(403);
    let beforeRejected = t.events.length;
    await assert.rejects(restore('missing-bucket-denied-object'));
    assert.deepEqual(t.events.slice(beforeRejected), ['primary-bucket-get', 'primary-get']);
    t.failPrimary(null);
    t.primary.set(built.descriptor.objectPath, built.archive);
    beforeRejected = t.events.length;
    await assert.rejects(restore('contradictory-bucket'), /bucket changed during restore/);
    assert.deepEqual(t.events.slice(beforeRejected), ['primary-bucket-get', 'primary-get']);
    t.primary.delete(built.descriptor.objectPath);
    t.failPrimary(legacyMissingBucket('404'));
    const rejectedBucketReads = [
      ['bucket-authorization', () => new Response('', { status: 403 })],
      ['bucket-unknown', () => new Response('', { status: 400 })],
      ['bucket-transport', () => { throw new Error('SYNTHETIC_BUCKET_TRANSPORT'); }],
      ['bucket-public', () => Response.json({
        id: policy.bucketId, name: policy.bucketId, public: true,
        file_size_limit: PROTECTED_PRIVATE_RUNTIME_POLICY.maximumArchiveBytes,
        allowed_mime_types: ['application/gzip'],
      })],
    ];
    for (const [name, response] of rejectedBucketReads) {
      t.setPrimaryBucketRead(response);
      beforeRejected = t.events.length;
      await assert.rejects(restore(name));
      assert(t.events.slice(beforeRejected).every(event => event === 'primary-bucket-get'));
    }
    t.setPrimaryBucketRead(null);
    for(const failure of [400,401,403,500,new Error('synthetic404',{cause:{status:404}}),
      legacyMissingBucket(404),legacyMissingBucket('404','NoSuchKey'),legacyMissingBucket('403'),
      legacyMissingBucket('404','NoSuchBucket',403),legacyMissingBucket('404','AccessDenied'),
      () => new Response('malformed',{status:400,headers:{'content-type':'application/json'}}),
      () => Response.json({statusCode:'404',code:'NoSuchBucket',message:'x'.repeat(4096)},{status:400}),
      () => new Response(JSON.stringify({statusCode:'404',code:'NoSuchBucket'}),{status:400})
    ]){
      t.failPrimary(failure);const before=t.events.filter(e=>e.startsWith('r2-')).length;
      await assert.rejects(t.clients.storage.download(built.descriptor.objectPath));
      assert.equal(t.events.filter(e=>e.startsWith('r2-')).length,before,'auth/network/status-shaped errors cannot authorize fallback');
    }
    t.failPrimary(null);t.primary.set(built.descriptor.objectPath,Buffer.from('corrupt'));
    const before=t.events.filter(e=>e.startsWith('r2-')).length;
    await assert.rejects(restoreProtectedOperationalEvidence({directory:path.join(work,'bad'),deploymentId:built.descriptor.deploymentId,
      repository,request:t.clients.documentRequest,storage:t.clients.storage}),/integrity/);
    assert.equal(t.events.filter(e=>e.startsWith('r2-')).length,before);
    t.primary.delete(built.descriptor.objectPath);t.slots.set(1,Buffer.from('corrupt'));
    await assert.rejects(t.clients.storage.download(built.descriptor.objectPath),/SLOT_HEADER/);t.check();
  }finally{await fs.rm(work,{recursive:true,force:true});}
});
test('operational slots keep primary available on replica denial and stay at six keys through rotation and reintroduction',async()=>{
  const work=await fs.mkdtemp(path.join(os.tmpdir(),'rr-slots-rotate-'));
  try{
    const t=slotTransportFixture();t.failR2(true);
    const denied=await slotPublication(work,t,8200);assert.equal(denied.result.published,true);
    assert.notEqual(denied.result.replica.status,'OPERATIONAL_REPLICA_VERIFIED');
    t.failR2(false);
    let first;
    for(let i=8201;i<=8214;i++){
      const value=await slotPublication(work,t,i);if(i===8201)first=value;
      assert.equal(value.result.replica.status,'OPERATIONAL_REPLICA_VERIFIED');assert(t.slots.size<=6);
      for(const d of [t.row().payload.current,t.row().payload.previous].filter(Boolean))
        assert([...t.slots.values()].some(wire=>t.decode(wire).header.descriptor.objectPath===d.objectPath));
    }
    assert.equal(t.slots.size,6);assert.equal(t.events.includes('r2-DELETE'),false);
    const again=await publishProtectedOperationalEvidence({directory:first.directory,deploymentId:first.built.descriptor.deploymentId,
      repository,request:t.clients.documentRequest,storage:t.clients.storage});
    assert.equal(again.replica.status,'OPERATIONAL_REPLICA_VERIFIED');
    const before=t.decode([...t.slots.values()].find(wire=>t.decode(wire).header.descriptor.objectPath===first.built.descriptor.objectPath)).header.generation;
    await slotPublication(work,t,8215);await slotPublication(work,t,8216);
    await publishProtectedOperationalEvidence({directory:first.directory,deploymentId:first.built.descriptor.deploymentId,
      repository,request:t.clients.documentRequest,storage:t.clients.storage});
    const after=t.decode([...t.slots.values()].find(wire=>t.decode(wire).header.descriptor.objectPath===first.built.descriptor.objectPath)).header.generation;
    assert.notEqual(after,before,'same archive reintroduction has a new body generation');t.check();
  }finally{await fs.rm(work,{recursive:true,force:true});}
});
test('operational slots recover an absent unknown first PUT without permanent HOLD or a late resurrection',async()=>{
  const work=await fs.mkdtemp(path.join(os.tmpdir(),'rr-slots-unknown-first-'));
  try{
    const t=slotTransportFixture();t.nextPut('before');const one=await slotPublication(work,t,8301);
    assert.equal(one.result.replica.status,'OPERATIONAL_REPLICA_VERIFIED');
    const before=new Map(t.slots);assert.deepEqual(t.releasePuts(),[412],'late initial PUT loses against the never-deleted born slot');
    assert.deepEqual(t.slots,before);assert.equal(t.slots.size,1);
    t.nextPut('after');const two=await slotPublication(work,t,8302);
    assert.equal(two.result.replica.status,'OPERATIONAL_REPLICA_VERIFIED','exact readback settles a lost ACK without another wire attempt');
    assert.equal(t.events.includes('r2-DELETE'),false);t.check();
  }finally{await fs.rm(work,{recursive:true,force:true});}
});
test('operational slots fence an old same-slot replacement before an archived reference is reintroduced',async()=>{
  const work=await fs.mkdtemp(path.join(os.tmpdir(),'rr-slots-reintroduced-'));
  try{
    const t=slotTransportFixture();let first;
    for(let id=8401;id<=8406;id++){const value=await slotPublication(work,t,id);if(id===8401)first=value;}
    t.nextPut(({body,headers})=>t.decode(body).header.descriptor.deploymentId==='pages-8407-1'&&headers.has('if-match')?'before':null);
    const held=await slotPublication(work,t,8407);assert.notEqual(held.result.replica.status,'OPERATIONAL_REPLICA_VERIFIED');
    assert.equal(t.row().payload.current.deploymentId,'pages-8407-1','primary still advances');
    const result=await publishProtectedOperationalEvidence({directory:first.directory,deploymentId:first.built.descriptor.deploymentId,
      repository,request:t.clients.documentRequest,storage:t.clients.storage});
    assert.equal(result.replica.status,'OPERATIONAL_REPLICA_VERIFIED');
    const before=new Map(t.slots);assert.deepEqual(t.releasePuts(),[412],'new generation fences the unanswered obsolete PUT');
    assert.deepEqual(t.slots,before);t.primary.delete(first.built.descriptor.objectPath);
    assert.deepEqual(await t.clients.storage.download(first.built.descriptor.objectPath),first.built.archive);t.check();
  }finally{await fs.rm(work,{recursive:true,force:true});}
});
test('operational unknown primary CAS preserves original and replica for later exact readback without resending',async()=>{
  const work=await fs.mkdtemp(path.join(os.tmpdir(),'rr-slots-primary-cas-'));
  try{
    const t=slotTransportFixture();await slotPublication(work,t,8501);
    const directory=path.join(work,'pending');await fixture(directory,{deploymentId:'pages-8502-1'});
    const built=await buildProtectedOperationalEvidenceArchive({directory,deploymentId:'pages-8502-1',repository});
    t.nextCas('before');const before=t.events.filter(e=>e==='pointer-PATCH').length;
    await assert.rejects(publishProtectedOperationalEvidence({directory,deploymentId:'pages-8502-1',repository,
      request:t.clients.documentRequest,storage:t.clients.storage}),/compare-and-swap failed closed/);
    assert(t.primary.has(built.descriptor.objectPath),'unknown write cannot delete its original');
    assert.equal(t.row().payload.current.deploymentId,'pages-8501-1');
    assert.equal(t.releaseCas().length,1);assert.equal(t.row().payload.current.deploymentId,'pages-8502-1');
    assert.equal(t.events.filter(e=>e==='pointer-PATCH').length,before+1);
    t.primary.delete(built.descriptor.objectPath);
    assert.deepEqual(await t.clients.storage.download(built.descriptor.objectPath),built.archive,'pre-CAS copy covers the late committed pending target');
    // Exact retry is the same immutable object, not another unknown original.
    const retry=await publishProtectedOperationalEvidence({directory,deploymentId:'pages-8502-1',repository,
      request:t.clients.documentRequest,storage:t.clients.storage});
    assert.equal(retry.published,false);assert.equal(t.events.filter(e=>e==='pointer-PATCH').length,before+1);t.check();
  }finally{await fs.rm(work,{recursive:true,force:true});}
});
test('operational slot mutation deadline preserves primary, and an aborted old PUT cannot replace the settled slot',async()=>{
  const work=await fs.mkdtemp(path.join(os.tmpdir(),'rr-slots-deadline-'));
  try{
    const t=slotTransportFixture({operationMs:100});t.nextPut('hang');const start=Date.now();
    const value=await slotPublication(work,t,8601);assert.equal(value.result.published,true);assert(Date.now()-start<2500);
    assert.equal(value.result.replica.status,'OPERATIONAL_REPLICA_VERIFIED');
    const before=new Map(t.slots);assert.deepEqual(t.releasePuts(),[412]);assert.deepEqual(t.slots,before);t.check();
  }finally{await fs.rm(work,{recursive:true,force:true});}
});

test('operational slot transport has exactly six paths, no delete, and refuses malformed headers before body parsing',async()=>{
  const calls=[];
  const transport=createOperationalEvidenceR2Slots({accountId:'a'.repeat(32),accessKeyId:'synthetic',secretAccessKey:'synthetic',
    bucketId:policy.bucketId,fetchImpl:async(url,options)=>{calls.push({url,method:options.method});
      return new Response('x',{headers:{etag:'weak-or-unquoted','content-length':'1'}});}});
  assert.equal(transport.removeExact,undefined);assert.equal(transport.compareAndSwap.length,3);
  for(const slot of [0,7,'1',1.5])await assert.rejects(transport.read(slot),/SLOT_ID_INVALID/);
  assert.equal(calls.length,0);
  await assert.rejects(transport.compareAndSwap(1,Buffer.from('x'),'unquoted'),/SLOT_ETAG_INVALID/);
  assert.equal(calls.length,0);
  await assert.rejects(transport.read(1),/SLOT_HEADERS_INVALID/);assert.equal(calls.length,1);
});

test('operational replica pointer reads share the deadline while the original primary request remains available',async()=>{
  const work=await fs.mkdtemp(path.join(os.tmpdir(),'rr-slots-pointer-budget-'));
  try{
    const t=slotTransportFixture({operationMs:100});t.hangReplicaPointer(true);const start=Date.now();
    const value=await slotPublication(work,t,8701);
    assert.equal(value.result.published,true);assert.equal(value.result.replica.status,'OPERATIONAL_REPLICA_DEADLINE');
    assert(Date.now()-start<1500);assert.equal(t.slots.size,0);
    t.hangReplicaPointer(false);await slotPublication(work,t,8702);
    const d=t.row().payload.current;t.primary.delete(d.objectPath);t.hangReplicaPointer(true);
    const fallbackStart=Date.now();await assert.rejects(t.clients.storage.download(d.objectPath),/REPLICA_DEADLINE/);
    assert(Date.now()-fallbackStart<1000);t.hangReplicaPointer(false);t.check();
  }finally{await fs.rm(work,{recursive:true,force:true});}
});
test('operational slots fence a retained duplicate before allocating a missing descriptor under six-slot saturation',async()=>{
  const work=await fs.mkdtemp(path.join(os.tmpdir(),'rr-slots-duplicate-fence-'));
  try{
    const t=slotTransportFixture();await slotPublication(work,t,8801);
    const original=t.decode(t.slots.get(1)),wire=(slot,header=original.header,archive=original.archive)=>Buffer.concat([
      Buffer.from('RAVRADAR_OPERATIONAL_EVIDENCE_SLOT_V3\n'),Buffer.from(JSON.stringify({...header,slot,generation:crypto.randomBytes(32).toString('hex')})),Buffer.from('\n'),archive]);
    // Two delayed replacements can leave duplicate exact archives. Model the
    // complete six-key read state, not a caller-provided "safe duplicate" flag.
    for(let slot=2;slot<=6;slot++)t.slots.set(slot,wire(slot));
    const dir=path.join(work,'obsolete');await fixture(dir,{deploymentId:'pages-8803-1'});
    const obsolete=await buildProtectedOperationalEvidenceArchive({directory:dir,deploymentId:'pages-8803-1',repository});
    const normal=createOperationalEvidenceR2Slots({accountId:'a'.repeat(32),accessKeyId:'synthetic-id',secretAccessKey:'synthetic-secret',
      bucketId:policy.bucketId,fetchImpl:t.rawFetch});
    for(const slot of [1,2]){
      const before=await normal.read(slot);t.nextPut('before');
      const replacement=wire(slot,{...original.header,descriptor:obsolete.descriptor},obsolete.archive);
      await assert.rejects(normal.compareAndSwap(slot,replacement,before.etag),/UNANSWERED_PUT/);
    }
    const value=await slotPublication(work,t,8802);
    assert.equal(value.result.replica.status,'OPERATIONAL_REPLICA_VERIFIED');
    assert.equal(t.slots.size,6);assert.deepEqual(t.releasePuts(),[412,412]);
    const descriptors=[...t.slots.values()].map(bytes=>t.decode(bytes).header.descriptor.objectPath);
    assert(descriptors.includes(original.header.descriptor.objectPath));assert(descriptors.includes(value.built.descriptor.objectPath));t.check();
  }finally{await fs.rm(work,{recursive:true,force:true});}
});

test('operational replica bucket read and normal transport retry delay share the same budget',async()=>{
  const work=await fs.mkdtemp(path.join(os.tmpdir(),'rr-slots-bucket-budget-'));
  try{
    const t=slotTransportFixture({operationMs:100});t.hangBucket(true);const start=Date.now();
    const value=await slotPublication(work,t,8901);
    assert.equal(value.result.published,true);assert.equal(value.result.replica.status,'OPERATIONAL_REPLICA_DEADLINE');
    assert(Date.now()-start<1200,'normal bucket retry cannot add its default second after the deadline');
    assert.equal(t.slots.size,0);assert.equal(t.events.filter(e=>e==='r2-PUT').length,0);t.check();
  }finally{await fs.rm(work,{recursive:true,force:true});}
});

test('operational replica reserves the exact ordinary next-archive admission threshold and keeps primary on plus-one HOLD',async()=>{
  const work=await fs.mkdtemp(path.join(os.tmpdir(),'rr-slots-next-archive-budget-'));
  try{
    const threshold=PRIVATE_WEATHER_PUBLICATION_POLICY.bucketCeilingBytes-PRIVATE_WEATHER_PUBLICATION_POLICY.reserveBytes
      -PROTECTED_PRIVATE_RUNTIME_POLICY.maximumArchiveAggregateBytes-RETIREMENT_MARKER_BYTES-PRIVATE_WEATHER_UPLOAD_RESERVATION_BYTES;
    assert.equal(threshold,2_049_967_232,'leave the normal archive, marker, reserve and fixed journal within the bucket ceiling');
    const reserve=6*(policy.maximumArchiveBytes+16_384),probe=slotTransportFixture();
    await slotPublication(work,probe,9001);const exactWireBytes=probe.slots.get(1).length;
    const at=slotTransportFixture();at.setForeignBytes(threshold-reserve-exactWireBytes);
    const exact=await slotPublication(work,at,9001);
    assert.equal(at.slots.get(1).length,exactWireBytes);
    assert.equal(exact.result.replica.status,'OPERATIONAL_REPLICA_VERIFIED','projected final stock exactly at the ordinary frontier is accepted');
    const over=slotTransportFixture();over.setForeignBytes(threshold-reserve-exactWireBytes+1);
    const held=await slotPublication(work,over,9001);
    assert.equal(held.result.published,true);assert.equal(held.result.replica.status,'OPERATIONAL_SLOT_BUCKET_HOLD');
    assert(over.primary.has(held.built.descriptor.objectPath),'optional budget refusal leaves the original primary publication intact');
    assert.equal(over.row().payload.current.deploymentId,'pages-9001-1');
    assert.equal(over.events.filter(event=>event==='r2-PUT').length,1,'post-CAS plus-one refusal sends no replacement PUT');
    const deniedBeforePut=slotTransportFixture();deniedBeforePut.setForeignBytes(threshold-reserve+1);
    const primary=await slotPublication(work,deniedBeforePut,9001);
    assert.equal(primary.result.published,true);assert.equal(primary.result.replica.status,'OPERATIONAL_SLOT_BUCKET_HOLD');
    assert.equal(deniedBeforePut.events.filter(event=>event==='r2-PUT').length,0);
    const withDebt=slotTransportFixture();
    const carried=1024;
    const journal=Buffer.from(JSON.stringify({kind:'RAVRADAR_PRIVATE_WEATHER_ARCHIVE_UPLOAD_V1',
      revision:'00000000-0000-4000-8000-000000000000',
      pending:[{path:'bundles/sha256/'+'a'.repeat(64)+'.json.gz',bytes:carried}]}));
    withDebt.setArchiveReservation(journal);
    withDebt.setForeignBytes(threshold-reserve-journal.length-carried+1);
    const heldForWeather=await slotPublication(work,withDebt,9001);
    assert.equal(heldForWeather.result.published,true);
    assert.equal(heldForWeather.result.replica.status,'OPERATIONAL_SLOT_BUCKET_HOLD');
    assert.equal(withDebt.events.filter(event=>event==='r2-PUT').length,0,
      'The optional copy gives the unresolved archive bytes priority without blocking primary publication.');
    const unclear=slotTransportFixture();
    unclear.setArchiveReservation(Buffer.from('[]'));
    const heldForUnknown=await slotPublication(work,unclear,9001);
    assert.equal(heldForUnknown.result.published,true);
    assert.equal(heldForUnknown.result.replica.status,'OPERATIONAL_REPLICA_HOLD');
    assert.equal(unclear.events.filter(event=>event==='r2-PUT').length,0);
    const missingBucket=slotTransportFixture();
    missingBucket.setArchiveReservationError('NoSuchBucket');
    const heldForBucket=await slotPublication(work,missingBucket,9001);
    assert.equal(heldForBucket.result.published,true);
    assert.equal(heldForBucket.result.replica.status,'OPERATIONAL_SLOT_READ_REFUSED');
    assert.equal(missingBucket.events.filter(event=>event==='r2-PUT').length,0);
    for(const t of [probe,at,over,deniedBeforePut,withDebt,unclear,missingBucket]){assert.equal(t.events.includes('r2-DELETE'),false);t.check();}
  }finally{await fs.rm(work,{recursive:true,force:true});}
});
