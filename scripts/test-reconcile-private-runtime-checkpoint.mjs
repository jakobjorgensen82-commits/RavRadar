// Synthetic normal B/S transport. No native/origin issuer, SQL simulation claim
// or production output. Every bundle/checkpoint is built by the normal APIs.
import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { normalBAndSTransports } from './lib/established-native-current-origin-test-transports.mjs';
import { reconcilePrivateRuntimeCheckpoint, requiresPrivateRuntimeCheckpointReconcile,
  assertPrivateRuntimeCheckpointPublicationDisposition, assertOrdinaryPrivateRuntimeCheckpointReconcileRequest }
  from './reconcile-private-runtime-checkpoint.mjs';
import { PRIVATE_RUNTIME_FILES, PRIVATE_RUNTIME_CONTRACT_FILES, buildPrivateRuntimeCreateSpec,
  buildPrivateRuntimeExpectation, installRestoredPrivateRuntime } from './private-production-runtime-workflow.mjs';
import { createPrivateProductionRuntimeBundle, restorePrivateProductionRuntimeBundle } from './private-production-runtime-bundle.mjs';
import { publishProtectedPrivateProductionRuntime, restoreProtectedPrivateProductionRuntime }
  from './protected-private-production-runtime.mjs';
import { saveRavScoreContinuationCheckpoint } from './ravscore-continuation-checkpoint.mjs';
import { publishProtectedRavScoreContinuationCheckpoint, createProtectedRavScoreCheckpointRequester,
  createProtectedRavScoreCheckpointVersionRequester, createProtectedRavScoreCheckpointRpcRequester }
  from './protected-ravscore-continuation-checkpoint.mjs';
import { inversePairedPrivateRuntimePublication, inverseCompletedRuntimeWorkflow }
  from './lib/completed-private-runtime-workflow-review.mjs';
import { runInNewContext } from 'node:vm';
import { isDeepStrictEqual } from 'node:util';
import { ravScoreModelBinding } from '../js/core/ravscore-model-contract.js';
import { ravScoreModelBinding as candidateBinding } from './rollback-assets/ravscore-model-contract.js';
import { buildIntegratedRavScoreStateSeries } from '../js/core/ravscore-integrated-state-pipeline.js';
import { buildCandidateGDerivedStateSeries } from '../js/core/ravscore-candidate-g-state-pipeline.js';
import { CANDIDATE_G_OPERATIONAL_ROLLBACK_ID } from './lib/ravscore-candidate-g-rollback-runtime.mjs';
import { candidateGStateKey } from './lib/coastal-point-staging-contract.mjs';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const sha = value => crypto.createHash('sha256').update(value).digest('hex');
const B = 'ravscore-private-production-runtime-pointer', S = 'ravscore-continuation-checkpoint';
const clone = structuredClone;
const write = async (file, value) => { await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(file, typeof value === 'string' ? value : JSON.stringify(value) + '\n'); };
function strictRequests(backend) {
  const fetchImpl = async (input, options) => {
    const url = new URL(input); assert.equal(url.origin, 'https://paired-test.invalid');
    assert.equal(new Headers(options.headers).get('apikey'), 'SYNTHETIC_TEST_ONLY');
    let value;
    if (options.method === 'GET') { assert.equal(url.pathname, '/rest/v1/admin_documents'); value = await backend.documentRequest(url.search, options); }
    else { assert.equal(options.method, 'POST'); assert.equal(url.pathname, '/rest/v1/rpc/ravradar_ravscore_checkpoint_cas');
      value = await backend.checkpointRpc(JSON.parse(options.body)); }
    return new Response(JSON.stringify(value), { status: 200, headers: { 'content-type': 'application/json' } });
  };
  const config = { supabaseUrl: 'https://paired-test.invalid', serviceRoleKey: 'SYNTHETIC_TEST_ONLY', fetchImpl };
  return { checkpointRequest: createProtectedRavScoreCheckpointRequester(config),
    checkpointVersionRequest: createProtectedRavScoreCheckpointVersionRequester(config),
    rpcRequest: createProtectedRavScoreCheckpointRpcRequester(config) };
}

test('normal CURRENT B/S interruption reconciliation preserves whole pairs and refuses ambiguity', async t => {
  const own = await fs.mkdtemp(path.join(os.tmpdir(), 'rr-paired-publication-test-'));
  t.after(() => fs.rm(own, { recursive: true, force: true }));
  const source = path.join(own, 'source'); await fs.mkdir(source);
  for (const relative of [...new Set(Object.values(PRIVATE_RUNTIME_CONTRACT_FILES).flat())]) {
    await fs.mkdir(path.dirname(path.join(source, relative)), { recursive: true });
    await fs.copyFile(path.join(ROOT, relative), path.join(source, relative));
  }
  const refs = ['2026-10-16T10:00:00.000Z', '2026-10-17T05:00:00.000Z'];
  const now = '2026-10-17T06:00:00.000Z', sourceHead = 'b'.repeat(40);
  const partFor = partId => ({ partId, zoneId: 'fixture-zone', landPoint: [10, 56], waterPoint: [10.01, 56.01], onshoreDirectionDeg: 90 });
  function conditions(reference, speed = 0.12) {
    // Exact normal 49h factory recipe from the existing normal B/S admission
    // target; no model, validator, publisher or restore function is replaced.
    const samples = Array.from({ length: 49 }, (_, i) => ({
      time: new Date(Date.parse(reference) - (48 - i) * 3600000).toISOString(),
      currentSpeedMps: speed, currentAlignment: 0.75, currentVerified: true,
      waveHeightM: 1.2, wavePeriodS: 6, waveDirectionDeg: 270 }));
    const I = buildIntegratedRavScoreStateSeries(samples, { samplingContextKey: 'sha256:' + sha('fixture'),
      onshoreDirectionDeg: 90 }).rows.at(-1).continuationState;
    const G = buildCandidateGDerivedStateSeries(samples, { stateKey: candidateGStateKey(partFor('template')) }).continuationState;
    const parts = Object.fromEntries(Array.from({ length: 673 }, (_, i) => {
      const id = 'p' + i; const { partId, ...metadata } = partFor(id);
      return [id, { ...metadata, ravScoreModel: { currentState: { ...clone(I), samplingContextKey: 'sha256:' + sha(id) } } }];
    }));
    return { datasetId: 'rr-synthetic-pair-' + reference.replace(/\D/g, '') + '-' + speed,
      generatedAt: new Date(Date.parse(reference) + 3600000).toISOString(), productionReferenceAt: reference,
      zones: Object.fromEntries(Array.from({ length: 210 }, (_, i) => ['z' + i, {}])),
      coastalParts: { modelBinding: ravScoreModelBinding(), expectedPartCount: 673, parts },
      ravScoreCandidateGRollback: { schemaVersion: '1.0.0', kind: 'PRIVATE_CANDIDATE_G_OPERATIONAL_ROLLBACK_RUNTIME',
        privacyClass: 'PRIVATE_PRODUCTION_RUNTIME', sourceModelBinding: ravScoreModelBinding(), rollbackModelBinding: candidateBinding(),
        rollbackId: CANDIDATE_G_OPERATIONAL_ROLLBACK_ID, automaticActivationAllowed: false, publicDuringNormalOperation: false,
        runtime: { modelBinding: candidateBinding(), expectedPartCount: 673, scoredPartCount: 673,
          scoreProfile: { modelCoverageReady: true, modelMemoryReady: true, modelMigrationReady: true },
          parts: Object.fromEntries(Object.keys(parts).map(id => [id, { ravScoreModel: { currentState: {
            ...clone(G), stateKey: candidateGStateKey(partFor(id)) } } }])) } } };
  }
  const saved = [];
  for (const [index, reference] of refs.entries()) {
    const runtime = conditions(reference);
    for (const descriptor of PRIVATE_RUNTIME_FILES) await write(path.join(source, descriptor.relativePath),
      descriptor.id === 'full-conditions' ? runtime : { fixtureOnly: descriptor.id });
    const checkpointPath = path.join(own, 's' + index, '.cache/ravscore-continuation-checkpoint/checkpoint.json');
    await saveRavScoreContinuationCheckpoint({ repositoryRoot: source, sourcePath: path.join(source, 'data/live/conditions.json'), checkpointPath });
    const privateRoot = path.join(own, 'b' + index); await fs.mkdir(privateRoot);
    const bundlePath = path.join(privateRoot, 'created');
    const spec = await buildPrivateRuntimeCreateSpec({ repositoryRoot: source }); assert.equal(spec.files.length, 9);
    await createPrivateProductionRuntimeBundle({ repositoryRoot: source, privateRoot, bundlePath, ...spec });
    const expected = await buildPrivateRuntimeExpectation({ repositoryRoot: source, targetReferenceAt: reference, now });
    saved.push({ runtime, checkpointPath, privateRoot, bundlePath, expected });
  }
  const publishB = (backend, index, request = backend.documentRequest) => publishProtectedPrivateProductionRuntime({
    repositoryRoot: source, ...saved[index], sourceHead, now, request, storage: backend.storage });
  const publishS = (backend, index, rpcRequest = backend.checkpointRpc) => publishProtectedRavScoreContinuationCheckpoint({
    checkpointPath: saved[index].checkpointPath, targetReference: refs[index], request: backend.documentRequest, rpcRequest });
  async function paired() {
    const backend = normalBAndSTransports(); await publishB(backend, 0); await publishS(backend, 0); return backend;
  }
  let n = 0;
  async function installed(backend, index) {
    const repositoryRoot = path.join(own, 'installed' + n++); await fs.mkdir(repositoryRoot);
    for (const relative of [...new Set(Object.values(PRIVATE_RUNTIME_CONTRACT_FILES).flat())]) {
      await fs.mkdir(path.dirname(path.join(repositoryRoot, relative)), { recursive: true });
      await fs.copyFile(path.join(ROOT, relative), path.join(repositoryRoot, relative));
    }
    const privateRoot = path.join(own, 'restored' + n); await fs.mkdir(privateRoot);
    const bundlePath = path.join(privateRoot, 'current');
    const restored = await restoreProtectedPrivateProductionRuntime({ repositoryRoot, privateRoot, bundlePath,
      expected: saved[index].expected, now, request: backend.documentRequest, storage: backend.storage });
    assert.equal(restored.restored, true); assert.equal(restored.rollbackSelected, false);
    const restoredRoot = path.join(privateRoot, 'installed');
    await restorePrivateProductionRuntimeBundle({ repositoryRoot, privateRoot, bundlePath,
      outputPath: restoredRoot, expected: saved[index].expected, targetReferenceAt: refs[index],
      minimumReferenceAt: refs[index], minimumGeneratedAt: saved[index].runtime.generatedAt, now });
    await installRestoredPrivateRuntime({ restoredRoot, repositoryRoot });
    await write(path.join(repositoryRoot, 'data/live/coastal-parts-v2.json'), { zoneCount: 210, partCount: 673,
      zones: Object.fromEntries(Array.from({ length: 210 }, (_, zone) => ['z' + zone,
        Array.from({ length: 673 }, (_, i) => i).filter(i => i % 210 === zone).map(i => ({ ...partFor('p' + i), parentZoneId: 'z' + zone }))])) });
    return { repositoryRoot, privateRoot, bundlePath, expected: saved[index].expected, now, operationalAction: 'integrated' };
  }
  async function run(backend, index, extra = {}) {
    const options = await installed(backend, index);
    const beforeConditions = await fs.readFile(path.join(options.repositoryRoot, 'data/live/conditions.json'));
    const result = await reconcilePrivateRuntimeCheckpoint({ ...options, request: backend.documentRequest,
      ...strictRequests(backend), ...extra });
    assert.deepEqual(await fs.readFile(path.join(options.repositoryRoot, 'data/live/conditions.json')), beforeConditions);
    const local = JSON.parse(await fs.readFile(path.join(options.repositoryRoot, '.cache/ravscore-continuation-checkpoint/checkpoint.json')));
    assert.deepEqual(local, JSON.parse(await fs.readFile(saved[index].checkpointPath)));
    assert.equal(result.storageDownloads, 0); assert.equal(result.nativeAdmissionIssued, false); return result;
  }
  await t.test('pre-B failure leaves exact old pair; matched S has no write or version bump', async () => {
    const backend = await paired(), version = backend.documents.get(S).version;
    const beforePointer = clone(backend.documents.get(B)), beforeS = clone(backend.documents.get(S));
    let uploadAttempts = 0;
    await assert.rejects(publishB({ ...backend, storage: { ...backend.storage,
      uploadImmutable: async () => { uploadAttempts++; throw new Error('SYNTHETIC_PRE_B_UPLOAD_FAILED'); },
    } }, 1));
    assert.equal(uploadAttempts, 1, 'The real normal B publisher must reach the injected upload fault.');
    assert.equal(isDeepStrictEqual(backend.documents.get(B), beforePointer), true);
    assert.equal(isDeepStrictEqual(backend.documents.get(S), beforeS), true);
    const result = await run(backend, 0);
    assert.equal(result.outcome, 'ALREADY_PAIRED_READBACK_PROVED'); assert.equal(result.checkpointPublishCalls, 0);
    assert.equal(backend.documents.get(S).version, version); t.diagnostic(JSON.stringify(result));
  });
  await t.test('B commit lost reply is resolved by the normal publisher; runner loss before S advances once', async () => {
    const backend = await paired(); let lost = false;
    const forwarding = async (...args) => { const result = await backend.documentRequest(...args);
      if (!lost && args[1]?.method === 'PATCH') { lost = true; throw new Error('SYNTHETIC_B_REPLY_LOST'); } return result; };
    assert.equal((await publishB(backend, 1, forwarding)).published, true);
    const derived = JSON.parse(await fs.readFile(saved[1].checkpointPath));
    assert.equal(backend.documents.get(S).payload.productionReferenceAt, refs[0]);
    assert.equal(derived.productionReferenceAt, refs[1]);
    assert.notEqual(backend.documents.get(S).payload.generationSha256, derived.generationSha256);
    assert.equal(isDeepStrictEqual(backend.documents.get(S).payload, derived), false,
      'The unchanged origin wholepair predicate must be RED before reconciliation, without formatting private payloads.');
    const version = backend.documents.get(S).version;
    const result = await run(backend, 1); assert.equal(result.outcome, 'ADVANCED_READBACK_PROVED');
    assert.equal(backend.documents.get(S).version, version + 1); t.diagnostic(JSON.stringify(result));
  });
  await t.test('authenticated CURRENT B with absent S uses the normal expected-zero insert once', async () => {
    const backend = normalBAndSTransports(); await publishB(backend, 1);
    assert.equal(backend.documents.has(S), false);
    const result = await run(backend, 1);
    assert.equal(result.outcome, 'ADVANCED_READBACK_PROVED'); assert.equal(result.checkpointPublishCalls, 1);
    assert.equal(backend.documents.get(S).version, 1);
    assert.equal(backend.events.filter(event => event === 'S_CAS').length, 1);
  });
  await t.test('S commit lost reply succeeds ONLY after independent whole normal readback', async () => {
    const backend = await paired(); await publishB(backend, 1);
    const result = await run(backend, 1, { rpcRequest: async body => {
      await backend.checkpointRpc(body); throw new Error('SYNTHETIC_S_REPLY_LOST'); } });
    assert.equal(result.outcome, 'COMMITTED_REPLY_LOST_READBACK_PROVED'); t.diagnostic(JSON.stringify(result));
  });
  await t.test('unknown uncommitted S outcome remains failure, not successful metadata', async () => {
    const backend = await paired(); await publishB(backend, 1); const before = clone(backend.documents.get(S));
    await assert.rejects(run(backend, 1, { rpcRequest: async () => { throw new Error('SYNTHETIC_UNCOMMITTED'); } }), error => {
      assert.equal(error.code, 'PROTECTED_RAVSCORE_CHECKPOINT_REMOTE_ERROR');
      assert.equal(error.cause.message, 'SYNTHETIC_UNCOMMITTED'); return true;
    });
    assert.deepEqual(backend.documents.get(S), before);
  });
  await t.test('S ahead of B and same-reference wrong whole pair never write', async () => {
    const backend = await paired(); await publishS(backend, 1);
    await assert.rejects(run(backend, 0), /future/); assert.equal(backend.events.filter(x => x === 'S_CAS').length, 2);
    const wrongBackend = await paired();
    const badPath = path.join(own, 'wrong/.cache/ravscore-continuation-checkpoint/checkpoint.json');
    await write(path.join(source, 'data/live/conditions.json'), conditions(refs[1], 0.2));
    await saveRavScoreContinuationCheckpoint({ repositoryRoot: source, sourcePath: path.join(source, 'data/live/conditions.json'), checkpointPath: badPath });
    await publishProtectedRavScoreContinuationCheckpoint({ checkpointPath: badPath, targetReference: refs[1],
      request: wrongBackend.documentRequest, rpcRequest: wrongBackend.checkpointRpc });
    await publishB(wrongBackend, 1);
    const before = clone(wrongBackend.documents.get(S));
    await assert.rejects(run(wrongBackend, 1), /S_NOT_BEHIND/); assert.deepEqual(wrongBackend.documents.get(S), before);
  });
  await t.test('changed whole pointer/version and installed conditions/registry cannot pass', async () => {
    for (const change of ['pointer', 'conditions', 'registry']) {
      const backend = await paired(); await publishB(backend, 1); const options = await installed(backend, 1);
      let reads = 0;
      const forwarding = async (...args) => {
        const result = await backend.documentRequest(...args);
        if (args[0].includes('ravscore-continuation-checkpoint') && ++reads === 1) {
          if (change === 'pointer') backend.documents.get(B).version++;
          else await fs.appendFile(path.join(options.repositoryRoot, change === 'conditions'
            ? 'data/live/conditions.json' : 'data/live/coastal-parts-v2.json'), ' ');
        } return result;
      };
      const before = clone(backend.documents.get(S));
      await assert.rejects(reconcilePrivateRuntimeCheckpoint({ ...options, request: backend.documentRequest,
        ...strictRequests(backend), checkpointRequest: forwarding }), /POINTER_CHANGED|INSTALLED_SOURCE_CHANGED/);
      assert.deepEqual(backend.documents.get(S), before);
    }
  });
  assert.equal(requiresPrivateRuntimeCheckpointReconcile({}), false);
  assert.equal(requiresPrivateRuntimeCheckpointReconcile({ modelBinding: { modelBundleSha256: '0'.repeat(64) } }), false);
  await t.test('initial/unknown family cannot reconcile or gain publication permission', async () => {
    for (const family of ['initial0200', 'unknown']) {
      const backend = await paired(), row = backend.documents.get(B), before = clone(backend.documents.get(S));
      row.payload.current.modelBinding.modelBundleSha256 = family === 'initial0200'
        ? '84217430a712fec3e78c5c3115d86520a4011a388998af030d231a8433d52bb3' : '0'.repeat(64);
      await assert.rejects(reconcilePrivateRuntimeCheckpoint({ request: backend.documentRequest,
        ...strictRequests(backend), operationalAction: 'integrated' }), /UNSUPPORTED_FAMILY/);
      assert.deepEqual(backend.documents.get(S), before);
    }
    const descriptor = JSON.parse(await fs.readFile(path.join(saved[1].bundlePath, 'manifest.json')));
    for (const disposition of ['READY_PUBLISHED', 'MEASURED_WARMUP_PUBLISHED'])
      assert.doesNotThrow(() => assertPrivateRuntimeCheckpointPublicationDisposition(descriptor, disposition));
    for (const disposition of ['', 'UNKNOWN', 'NOT_PUBLISHED', 'REJECTED', undefined])
      assert.throws(() => assertPrivateRuntimeCheckpointPublicationDisposition(descriptor, disposition), /S_DISPOSITION/);
    assert.doesNotThrow(() => assertPrivateRuntimeCheckpointPublicationDisposition({}, 'LEGACY_UNCHANGED'));
  });
  await t.test('candidate/dry-run/maintenance/unknown actions are physically read/write-free', async () => {
    for (const operationalAction of ['candidate-dry-run', 'candidate-maintenance', 'integrated-historical-maintenance', '', undefined]) {
      let calls = 0; const refuse = async () => { calls++; throw new Error('MUST_NOT_REACH_TRANSPORT'); };
      await assert.rejects(reconcilePrivateRuntimeCheckpoint({ operationalAction, request: refuse,
        checkpointRequest: refuse, checkpointVersionRequest: refuse, rpcRequest: refuse }), /OPERATIONAL_ACTION/);
      assert.equal(calls, 0);
    }
  });
  await t.test('the two real bounded S requesters refuse the other query contract', async () => {
    const backend = normalBAndSTransports(), readers = strictRequests(backend);
    await assert.rejects(readers.checkpointRequest('?document_key=eq.' + S + '&select=document_key,version&limit=2'), /non-read/);
    await assert.rejects(readers.checkpointVersionRequest('?document_key=eq.' + S + '&select=document_key,payload,version&limit=2'), /non-metadata/);
    assert.deepEqual(backend.events, []);
  });
});

test('ordinary paired publication is genuinely new, exact-invertible and cannot write through a dry run', async () => {
  const raw = (await fs.readFile(new URL('../.github/workflows/reusable-weather-build.yml', import.meta.url), 'utf8')).replaceAll('\r\n', '\n');
  const previous = inversePairedPrivateRuntimePublication(raw, 'build');
  assert.notEqual(raw, previous); assert.equal(sha(previous), '861fad7501e32d4b63c72caa598825b15fb5fb2758961a1187ed57858e5c01ce');
  assert.equal(inverseCompletedRuntimeWorkflow(raw, 'build'), inverseCompletedRuntimeWorkflow(previous, 'build'));
  const step = (text, name) => text.split(/(?=^      - name:)/m).find(block => block.startsWith('      - name: ' + name + '\n'));
  const Sstep = step(raw, 'Publish atomic RavScore checkpoint to protected admin storage');
  const evalIf = (block, action, required, input = {}) => runInNewContext(block.match(/^        if: (.+)$/m)[1]
    .replace(/\bsteps\.([a-z][a-z0-9-]*)/g, (_, id) => 'steps[' + JSON.stringify(id) + ']'), {
      inputs: { weather_state_epoch_bootstrap: false, weather_state_epoch_checkpoint_reentry: false,
        native_sampling_identity_original_recovery: false, checkpoint_only: false, quick_confirmation: false,
        completed_private_runtime: false, ...input },
      steps: { preflight: { outputs: { should_run: 'true' } }, 'operational-action': { outputs: { action } },
        'paired-checkpoint-route': { outputs: { required } } } });
  for (const action of ['candidate-dry-run', 'candidate-maintenance', 'integrated-historical-maintenance', 'UNKNOWN']) {
    assert.equal(evalIf(step(raw, 'Select current-family paired checkpoint restoration before any S restore'), action, 'true'), false);
    assert.equal(evalIf(step(raw, 'Reconcile only authenticated CURRENT B to its exact protected S before providers'), action, 'true'), false);
  }
  assert.equal(evalIf(step(raw, 'Reconcile only authenticated CURRENT B to its exact protected S before providers'), 'integrated', 'true'), true);
  for (const flag of ['weather_state_epoch_bootstrap', 'weather_state_epoch_checkpoint_reentry',
    'native_sampling_identity_original_recovery', 'checkpoint_only', 'quick_confirmation', 'completed_private_runtime'])
    for (const name of ['Select current-family paired checkpoint restoration before any S restore',
      'Reconcile only authenticated CURRENT B to its exact protected S before providers'])
      assert.equal(evalIf(step(raw, name), 'integrated', 'true', { [flag]: true }), false);
  const ordinary = { OPERATIONAL_ACTION: 'integrated', COMPLETED_PRIVATE_RUNTIME: 'false', CHECKPOINT_ONLY: 'false',
    QUICK_CONFIRMATION: 'false', RAVRADAR_WEATHER_STATE_EPOCH_BOOTSTRAP: 'false',
    RAVRADAR_WEATHER_STATE_EPOCH_CHECKPOINT_REENTRY: 'false', NATIVE_IDENTITY_RECOVERY: 'false' };
  assert.doesNotThrow(() => assertOrdinaryPrivateRuntimeCheckpointReconcileRequest(ordinary));
  for (const key of Object.keys(ordinary).filter(key => key !== 'OPERATIONAL_ACTION'))
    for (const value of ['true', '', undefined]) assert.throws(() =>
      assertOrdinaryPrivateRuntimeCheckpointReconcileRequest({ ...ordinary, [key]: value }), /NON_ORDINARY_REQUEST/);
  const install = raw.indexOf('\n        id: private-runtime-install\n'), reconcile = raw.indexOf('\n        id: paired-checkpoint-reconcile\n');
  assert(install < reconcile && reconcile < raw.indexOf('      - name: Update DMI bulk model cache\n'));
  assert(raw.indexOf('\n        id: private-runtime-publish\n') < raw.indexOf('\n        id: checkpoint-publish\n'));
  assert(previous.indexOf('\n        id: checkpoint-publish\n') < previous.indexOf('\n        id: private-runtime-publish\n'));
  assert(Sstep.includes("steps.private-runtime-publish.outcome == 'success'"));
  assert(raw.indexOf('Refuse current-family B publication without a completable checkpoint disposition') < raw.indexOf('\n        id: private-runtime-publish\n'));
  const mutations = [raw.replace("steps.private-runtime-publish.outcome == 'success' && ", ''),
    raw.replace("steps.operational-action.outputs.action == 'integrated'", 'true'),
    raw.replace('node scripts/reconcile-private-runtime-checkpoint.mjs reconcile', 'true'),
    raw.replace('assertPrivateRuntimeCheckpointPublicationDisposition(descriptor, process.env.CHECKPOINT_DISPOSITION);', 'true;')];
  for (const changed of mutations) { assert.notEqual(changed, raw); assert.throws(() => inverseCompletedRuntimeWorkflow(changed, 'build')); }
});
