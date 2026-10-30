import { classifyProductionTargetFreshness } from './check-production-target-freshness.mjs';
import { assertSavedPrivateRuntimeCheckpointReconcileRequest, privateRuntimeCheckpointReconcileFailureDiagnostic } from './reconcile-private-runtime-checkpoint.mjs';
import { ESTABLISHED_NATIVE_CURRENT_ORIGIN_BINDING as OLD_FAMILY } from './lib/established-native-current-origin-successor-source.mjs';
import { LAST_MILE_ENCLOSURE_BINDING as NEW_FAMILY } from './lib/last-mile-enclosure-successor-source.mjs';
import {ASSISTANT_LATER_H0_BINDING as ISSUED587_FAMILY,
  ASSISTANT_PUBLIC587_SUCCESSOR_BINDING as PUBLIC587_SUCCESSOR_FAMILY,
  ASSISTANT_PUBLIC588_SUCCESSOR_BINDING as PUBLIC588_SUCCESSOR_FAMILY}
  from './lib/assistant-later-h0-successor-source.mjs';
import { withFrozenEstablishedNativeCurrentOriginPostgresSource } from './run-frozen-established-native-current-origin-source-targets.mjs';
import { withFrozen584ReconcileFixture, withFrozen585ReconcileFixture } from './run-frozen584-reconcile-source.mjs';
import { pathToFileURL } from 'node:url';
import { execFileSync, spawnSync } from 'node:child_process';
// Synthetic normal B/S transport. No native/origin issuer, SQL simulation claim
// or production output. Every bundle/checkpoint is built by the normal APIs.
import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs/promises';
import fsSync from 'node:fs';
import { writeBoundedJsonAtomic, PRIVATE_CONDITIONS_MAX_BYTES } from './lib/bounded-json-writer.mjs';
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
import { publishProtectedPrivateProductionRuntime, restoreProtectedPrivateProductionRuntime, PROTECTED_PRIVATE_RUNTIME_POLICY,
  describeCurrentProtectedPrivateProductionRuntime }
  from './protected-private-production-runtime.mjs';
import { saveRavScoreContinuationCheckpoint } from './ravscore-continuation-checkpoint.mjs';
import { readCurrentPrivateRuntimeCompanionInput, readCurrentPrivateRuntimeCompanions }
  from './read-authenticated-dmi-current-companions.mjs';
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
  await t.test('normal producer conditions above legacy256MiB use the shared parseable limit and pair unchanged', async () => {
    const sourcePath = path.join(source, 'data/live/conditions.json');
    const sourceBefore = await fs.readFile(sourcePath), savedBefore = saved[1];
    try {
      const document = conditions(refs[1]);
      document.fixturePrivatePadding = Array(280).fill('x'.repeat(1024 * 1024));
      const written = await writeBoundedJsonAtomic(sourcePath, document);
      assert(written.bytes > 256 * 1024 * 1024 && written.bytes <= PRIVATE_CONDITIONS_MAX_BYTES);
      assert(written.bytes <= PROTECTED_PRIVATE_RUNTIME_POLICY.maximumFilePayloadBytes);
      const checkpointPath = path.join(own, 'large-s/.cache/ravscore-continuation-checkpoint/checkpoint.json');
      await saveRavScoreContinuationCheckpoint({ repositoryRoot: source, sourcePath, checkpointPath });
      const privateRoot = path.join(own, 'large-created'); await fs.mkdir(privateRoot);
      const bundlePath = path.join(privateRoot, 'bundle');
      const spec = await buildPrivateRuntimeCreateSpec({ repositoryRoot: source });
      await createPrivateProductionRuntimeBundle({ repositoryRoot: source, privateRoot, bundlePath, ...spec });
      const expected = await buildPrivateRuntimeExpectation({ repositoryRoot: source, targetReferenceAt: refs[1], now });
      saved[1] = { runtime: document, checkpointPath, privateRoot, bundlePath, expected };
      const backend = normalBAndSTransports(); await publishB(backend, 1);
      const options = await installed(backend, 1);
      const originalPath = path.join(options.bundlePath, 'payload/data/live/conditions.json');
      const installedPath = path.join(options.repositoryRoot, 'data/live/conditions.json');
      const wholeHash = async file => { const digest = crypto.createHash('sha256'); let bytes = 0;
        for await (const block of fsSync.createReadStream(file)) { digest.update(block); bytes += block.length; }
        return { bytes, sha256: digest.digest('hex') }; };
      const originalBefore = await wholeHash(originalPath), workingBefore = await wholeHash(installedPath);
      assert.equal(originalBefore.bytes, written.bytes); assert.deepEqual(workingBefore, originalBefore);
      const beforeB = clone(backend.documents.get(B)); assert.equal(backend.documents.has(S), false);
      const result = await reconcilePrivateRuntimeCheckpoint({ ...options, expected: undefined,
        now: '2026-10-17T09:21:00.000Z', request: backend.documentRequest, ...strictRequests(backend) });
      assert.equal(result.outcome, 'ADVANCED_READBACK_PROVED'); assert.equal(result.checkpointPublishCalls, 1);
      assert.equal(result.storageDownloads, 0); assert.equal(result.nativeAdmissionIssued, false);
      assert.deepEqual(backend.documents.get(B), beforeB);
      const local = JSON.parse(await fs.readFile(path.join(options.repositoryRoot,
        '.cache/ravscore-continuation-checkpoint/checkpoint.json'), 'utf8'));
      assert.deepEqual(local, JSON.parse(await fs.readFile(checkpointPath, 'utf8')));
      assert.deepEqual(await wholeHash(originalPath), originalBefore);
      assert.deepEqual(await wholeHash(installedPath), workingBefore);
      // Same already-produced B: exercise the real current-family file reader
      // before providers and its after-origin API, without minting an origin.
      const retainedBeforeB = clone(backend.documents.get(B)), retainedBeforeS = clone(backend.documents.get(S));
      const retainedBeforeCas = backend.events.filter(event => event === 'S_CAS').length;
      const runnerTemp = path.join(own, 'shared-retention-runner'); await fs.mkdir(runnerTemp);
      const descriptor = await describeCurrentProtectedPrivateProductionRuntime({ request: backend.documentRequest });
      await fs.writeFile(path.join(runnerTemp, 'private-runtime-current-source.json'), JSON.stringify(descriptor) + '\n',
        { flag: 'wx', mode: 0o600 });
      const envKeys = ['RUNNER_TEMP', 'RAVRADAR_PRIVATE_RUNTIME_ROOT', 'RAVRADAR_PRIVATE_RUNTIME_BUNDLE'];
      const priorEnv = Object.fromEntries(envKeys.map(key => [key, process.env[key]]));
      Object.assign(process.env, { RUNNER_TEMP: runnerTemp, RAVRADAR_PRIVATE_RUNTIME_ROOT: options.privateRoot,
        RAVRADAR_PRIVATE_RUNTIME_BUNDLE: options.bundlePath });
      const retentionTarget = new Date(Date.parse(refs[1]) + 4 * 3_600_000).toISOString();
      try {
        let view = await readCurrentPrivateRuntimeCompanionInput(retentionTarget);
        assert.equal(view.conditionsSha256, originalBefore.sha256);
        assert.equal(await fs.realpath(view.conditionsPath), await fs.realpath(originalPath));
        assert.equal(view.conditions.datasetId, document.datasetId);
        assert.equal(view.conditions.productionReferenceAt, refs[1]);
        assert.deepEqual(view.verified.modelBinding, ravScoreModelBinding());
        assert.equal(view.verified.bundleContentSha256, descriptor.bundleContentSha256);
        await view.verify(); view = null;
        // Providers may change working bytes. The second API must keep reading
        // immutable B; whitespace changes no numeric state and is restored below.
        let firstRetentionFailure;
        try {
          await fs.appendFile(installedPath, ' ');
          const contexts = await readCurrentPrivateRuntimeCompanions(retentionTarget);
          assert.deepEqual(contexts, [], 'This normal nine-file B has no component pack; no contexts may be invented.');
          assert.deepEqual(await wholeHash(originalPath), originalBefore);
        } catch (error) { firstRetentionFailure = error; throw error; }
        finally {
          try { await fs.truncate(installedPath, workingBefore.bytes); }
          catch (cleanupError) { if (!firstRetentionFailure) throw cleanupError; }
        }
      } finally {
        for (const key of envKeys) {
          if (priorEnv[key] === undefined) delete process.env[key]; else process.env[key] = priorEnv[key];
        }
      }
      assert.deepEqual(await wholeHash(originalPath), originalBefore);
      assert.deepEqual(await wholeHash(installedPath), workingBefore);
      assert.deepEqual(backend.documents.get(B), retainedBeforeB);
      assert.deepEqual(backend.documents.get(S), retainedBeforeS);
      assert.equal(backend.events.filter(event => event === 'S_CAS').length, retainedBeforeCas);
      t.diagnostic(JSON.stringify({ retentionFileReaderBeforeAndAfter: true, addedCasCalls: 0,
        sameLargeBReused: true, wholeOriginalAndWorkingPreserved: true,
        opaqueOriginOrFrozen591CapacityProvedByThisCase: false }));
      t.diagnostic(JSON.stringify({ conditionsBytes: written.bytes, maximumConditionsBytes: PRIVATE_CONDITIONS_MAX_BYTES,
        outcome: result.outcome, checkpointPublishCalls: result.checkpointPublishCalls, wholeOriginalsUnchanged: true }));
    } finally {
      saved[1] = savedBefore; await fs.writeFile(sourcePath, sourceBefore);
    }
  });
  await t.test('four-hour ordinary cadence preserves the exact authenticated old B and advances only its missing S', async () => {
    const backend = await paired(); await publishB(backend, 1);
    const oldPointer = clone(backend.documents.get(B)), oldVersion = backend.documents.get(S).version;
    const checkedAt = '2026-10-17T09:21:00.000Z';
    const freshness = classifyProductionTargetFreshness({ target: refs[1], now: checkedAt, maximumAgeMinutes: 150 });
    assert.equal(freshness.status, 'STALE_TARGET_VALID'); assert.equal(freshness.ageMinutes, 261);
    const result = await run(backend, 1, { now: checkedAt, expected: undefined });
    assert.equal(result.outcome, 'ADVANCED_READBACK_PROVED'); assert.equal(result.checkpointPublishCalls, 1);
    assert.equal(backend.documents.get(S).version, oldVersion + 1);
    assert.deepEqual(backend.documents.get(B), oldPointer);
    assert.equal(result.storageDownloads, 0); assert.equal(result.nativeAdmissionIssued, false);
    t.diagnostic(JSON.stringify({ targetAgeMinutes: freshness.ageMinutes, freshnessStatus: freshness.status,
      paired: result.paired, outcome: result.outcome, storageDownloads: result.storageDownloads,
      checkpointPublishCalls: result.checkpointPublishCalls, originalBUnchanged: true }));
  });
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
  // Historical584/585 assertions use their genuine issued factories AND callers.
  // Actual current586 B/S coverage above/below is not projected to an old family.
  await withFrozen585ReconcileFixture(t, async current585 => {
  await withFrozen584ReconcileFixture(t, async old584 => {
  const { saved, run, publishB, publishS, normalBAndSTransports, withFrozenEstablishedNativeCurrentOriginPostgresSource } = old584;
  async function withOld140000S(use, { publishOldB = true } = {}) {
    return withFrozenEstablishedNativeCurrentOriginPostgresSource(async ({ repositoryRoot: oldRoot, factory }) => {
      const backend = normalBAndSTransports(), originalPath = path.join(own, 'genuine-old-S-' + n++, 'source.json');
      const checkpointPath = path.join(path.dirname(originalPath), '.cache/ravscore-continuation-checkpoint/checkpoint.json');
      await write(originalPath, factory.sourceDocumentAt(49, 'rr-reconcile-genuine140000'));
      await factory.saveRavScoreContinuationCheckpoint({ repositoryRoot: oldRoot, sourcePath: originalPath, checkpointPath });
      const originalBytes = await fs.readFile(originalPath), checkpointBytes = await fs.readFile(checkpointPath);
      const publisher = await import(pathToFileURL(path.join(oldRoot, 'scripts/protected-ravscore-continuation-checkpoint.mjs')).href);
      await publisher.publishProtectedRavScoreContinuationCheckpoint({ checkpointPath, targetReference: factory.atHour(49),
        request: backend.documentRequest, rpcRequest: backend.checkpointRpc });
      assert.equal(backend.documents.get(S).payload.modelBinding.modelBundleSha256, OLD_FAMILY.I);
      if (publishOldB) await publishB(backend, 1);
      const result = await use(backend);
      assert.deepEqual(await fs.readFile(originalPath), originalBytes);
      assert.deepEqual(await fs.readFile(checkpointPath), checkpointBytes);
      return result;
    });
  }
  await t.test('584 B plus genuine older140000 S reconciles without installing old state or resetting H0', async () => {
    await withOld140000S(async backend => {
      const version = backend.documents.get(S).version, expected = JSON.parse(await fs.readFile(saved[1].checkpointPath));
      const result = await run(backend, 1);
      assert.equal(result.outcome, 'ADVANCED_READBACK_PROVED'); assert.equal(result.checkpointPublishCalls, 1);
      assert.equal(result.nativeAdmissionIssued, false); assert.equal(result.storageDownloads, 0);
      assert.equal(backend.documents.get(S).version, version + 1); assert.deepEqual(backend.documents.get(S).payload, expected);
      assert.equal(backend.documents.get(S).payload.modelBinding.modelBundleSha256, NEW_FAMILY.I);
    });
  });
  await t.test('584 cross-family S reply loss requires whole actual readback and never retries CAS', async () => {
    await withOld140000S(async backend => {
      let attempts = 0;
      const result = await run(backend, 1, { rpcRequest: async body => {
        attempts++; await backend.checkpointRpc(body); throw new Error('SYNTHETIC_584_S_REPLY_LOST'); } });
      assert.equal(result.outcome, 'COMMITTED_REPLY_LOST_READBACK_PROVED'); assert.equal(attempts, 1);
    });
  });
  async function current585WithOlder584S(use) {
    const backend = normalBAndSTransports();
    const oldBytes = await fs.readFile(saved[0].checkpointPath);
    await publishS(backend, 0);
    assert.equal(backend.documents.get(S).payload.modelBinding.modelBundleSha256, NEW_FAMILY.I);
    await current585.publishB(backend, 1);
    try { return await use(backend); }
    finally { assert.deepEqual(await fs.readFile(saved[0].checkpointPath), oldBytes); }
  }
  await t.test('current585 B advances genuine older584 S without installing old state', async () => {
    await current585WithOlder584S(async backend => {
      const version = backend.documents.get(S).version;
      const expected = JSON.parse(await fs.readFile(current585.saved[1].checkpointPath));
      const result = await current585.run(backend, 1);
      assert.equal(result.outcome, 'ADVANCED_READBACK_PROVED'); assert.equal(result.checkpointPublishCalls, 1);
      assert.equal(result.nativeAdmissionIssued, false); assert.equal(result.storageDownloads, 0);
      assert.equal(backend.documents.get(S).version, version + 1);
      assert.deepEqual(backend.documents.get(S).payload, expected);
    });
  });
  await t.test('current585 reply loss requires whole actual readback of its new S and one CAS', async () => {
    await current585WithOlder584S(async backend => {
      let attempts = 0;
      const result = await current585.run(backend, 1, { rpcRequest: async body => {
        attempts++; await backend.checkpointRpc(body); throw new Error('SYNTHETIC_585_S_REPLY_LOST'); } });
      assert.equal(result.outcome, 'COMMITTED_REPLY_LOST_READBACK_PROVED'); assert.equal(attempts, 1);
    });
  });
  await t.test('current585 B refuses direct older140000 S without a CAS or old state installation', async () => {
    await withOld140000S(async backend => {
      await current585.publishB(backend, 1);
      const before = clone(backend.documents.get(S));
      const calls = backend.events.filter(event => event === 'S_CAS').length;
      await assert.rejects(current585.run(backend, 1), /RavScore checkpoint continuation implementation is incompatible/);
      assert.deepEqual(backend.documents.get(S), before);
      assert.equal(backend.events.filter(event => event === 'S_CAS').length, calls);
    }, { publishOldB: false });
  });
  });
  });
  await t.test('584 version drift after whole S read refuses before CAS without changing payload', async () => {
    const backend = await paired(); await publishB(backend, 1);
    const payload = clone(backend.documents.get(S).payload), casBefore = backend.events.filter(x => x === 'S_CAS').length;
    const readers = strictRequests(backend); let changed = false;
    await assert.rejects(run(backend, 1, { checkpointVersionRequest: async (...args) => {
      if (!changed) { changed = true; backend.documents.get(S).version++; }
      return readers.checkpointVersionRequest(...args);
    } }), error => {
      assert.equal(error.code, 'PROTECTED_RAVSCORE_CHECKPOINT_REMOTE_ERROR');
      assert.equal(error.cause?.code, 'ERR_ASSERTION');
      assert.match(error.cause.message, /PAIRED_PUBLICATION_S_VERSION_CHANGED_BEFORE_PUBLISH/);
      return true;
    });
    assert.equal(changed, true); assert.deepEqual(backend.documents.get(S).payload, payload);
    assert.equal(backend.events.filter(x => x === 'S_CAS').length, casBefore);
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
  const evalIf = (block, action, required, input = {}, assistantRequired = 'false') => runInNewContext(block.match(/^        if: (.+)$/m)[1]
    .replace(/\bsteps\.([a-z][a-z0-9-]*)/g, (_, id) => 'steps[' + JSON.stringify(id) + ']'), {
      inputs: { weather_state_epoch_bootstrap: false, weather_state_epoch_checkpoint_reentry: false,
        native_sampling_identity_original_recovery: false, checkpoint_only: false, quick_confirmation: false,
        completed_private_runtime: false, ...input },
      steps: { preflight: { outputs: { should_run: 'true' } }, 'operational-action': { outputs: { action } },
        'paired-checkpoint-route': { outputs: { required } },
        'assistant-later-h0-source': { outputs: { required: assistantRequired } } } });
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
  const pairedSelector = step(raw, 'Select current-family paired checkpoint restoration before any S restore');
  const pairedReconcile = step(raw, 'Reconcile only authenticated CURRENT B to its exact protected S before providers');
  // select writes required=false normally; a skipped step exposes an empty
  // output. The later-assistant route must skip paired select and leave its
  // required output empty, so the downstream paired reconciliation cannot run.
  for (const assistantRequired of ['false', ''])
    assert.equal(evalIf(pairedSelector, 'integrated', '', {}, assistantRequired), true);
  const assertLaterAssistantExcluded = (selector, action) => {
    const selected = evalIf(selector, action, '', {}, 'true');
    assert.equal(selected, false);
    assert.equal(evalIf(pairedReconcile, action, selected ? 'true' : '', {}, 'true'), false);
  };
  for (const action of ['integrated', 'candidate-dry-run', 'candidate-maintenance', 'integrated-historical-maintenance', 'UNKNOWN'])
    assertLaterAssistantExcluded(pairedSelector, action);
  for (const required of ['', 'false'])
    assert.equal(evalIf(pairedReconcile, 'integrated', required), false);
  const missingAssistantExclusion = pairedSelector.replace("steps.assistant-later-h0-source.outputs.required != 'true' && ", '');
  assert.notEqual(missingAssistantExclusion, pairedSelector);
  assert.throws(() => assertLaterAssistantExcluded(missingAssistantExclusion, 'integrated'), { code: 'ERR_ASSERTION' });
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

test('public587 successor keeps exact paired checkpoint family and publication disposition', () => {
  // Family selection is only a route; no synthetic tuple authorizes B/S writes.
  // The new tuple is absent until normal issuance; no guessed hash fills it in.
  const families=[ISSUED587_FAMILY,PUBLIC587_SUCCESSOR_FAMILY].filter(Boolean);
  assert.equal(families.length,PUBLIC587_SUCCESSOR_FAMILY===null?1:2);
  for(const family of families){
    const descriptor={modelBinding:{modelBundleSha256:family.I},
      contractHashes:{continuationStateContractSha256:family.T}};
    assert.equal(requiresPrivateRuntimeCheckpointReconcile(descriptor),true);
    for(const disposition of ['READY_PUBLISHED','MEASURED_WARMUP_PUBLISHED'])
      assert.doesNotThrow(()=>assertPrivateRuntimeCheckpointPublicationDisposition(descriptor,disposition));
    assert.throws(()=>assertPrivateRuntimeCheckpointPublicationDisposition(descriptor,'UNKNOWN'),/S_DISPOSITION/);
    for(const key of ['I','T']){
      const wrong={...family,[key]:'0'.repeat(64)};
      assert.equal(requiresPrivateRuntimeCheckpointReconcile({modelBinding:{modelBundleSha256:wrong.I},
        contractHashes:{continuationStateContractSha256:wrong.T}}),false);
    }
  }
  if(PUBLIC587_SUCCESSOR_FAMILY!==null)for(const [I,T]of [
    [ISSUED587_FAMILY.I,PUBLIC587_SUCCESSOR_FAMILY.T],
    [PUBLIC587_SUCCESSOR_FAMILY.I,ISSUED587_FAMILY.T],
  ])assert.equal(requiresPrivateRuntimeCheckpointReconcile({modelBinding:{modelBundleSha256:I},
    contractHashes:{continuationStateContractSha256:T}}),false);
});

test('public588 successor keeps its own exact paired family and publication disposition', () => {
  // Add only the issued590 route. The CURRENT normal B/S cases above still
  // require exact original bytes, the canonical manifest and fresh whole S.
  const family=PUBLIC588_SUCCESSOR_FAMILY;
  assert.notEqual(family,null);
  const descriptor={modelBinding:{modelBundleSha256:family.I},
    contractHashes:{continuationStateContractSha256:family.T}};
  assert.equal(requiresPrivateRuntimeCheckpointReconcile(descriptor),true);
  for(const disposition of ['READY_PUBLISHED','MEASURED_WARMUP_PUBLISHED'])
    assert.doesNotThrow(()=>assertPrivateRuntimeCheckpointPublicationDisposition(descriptor,disposition));
  for(const disposition of ['', 'UNKNOWN', 'NOT_PUBLISHED', 'REJECTED', undefined])
    assert.throws(()=>assertPrivateRuntimeCheckpointPublicationDisposition(descriptor,disposition),/S_DISPOSITION/);
  for(const key of ['I','T']){
    const wrong={...family,[key]:'0'.repeat(64)};
    assert.equal(requiresPrivateRuntimeCheckpointReconcile({modelBinding:{modelBundleSha256:wrong.I},
      contractHashes:{continuationStateContractSha256:wrong.T}}),false);
  }
  for(const previous of [ISSUED587_FAMILY,PUBLIC587_SUCCESSOR_FAMILY].filter(Boolean))
    for(const [I,T]of [[family.I,previous.T],[previous.I,family.T]])
      assert.equal(requiresPrivateRuntimeCheckpointReconcile({modelBinding:{modelBundleSha256:I},
        contractHashes:{continuationStateContractSha256:T}}),false);
});

test('both fixed families and separate saved guard reject mixed tuples and colliding modes', () => {
  for (const family of [OLD_FAMILY, NEW_FAMILY]) {
    const descriptor = { modelBinding: { modelBundleSha256: family.I },
      contractHashes: { continuationStateContractSha256: family.T } };
    assert.equal(requiresPrivateRuntimeCheckpointReconcile(descriptor), true);
    for (const disposition of ['READY_PUBLISHED', 'MEASURED_WARMUP_PUBLISHED'])
      assert.doesNotThrow(() => assertPrivateRuntimeCheckpointPublicationDisposition(descriptor, disposition));
    assert.throws(() => assertPrivateRuntimeCheckpointPublicationDisposition(descriptor, 'UNKNOWN'), /S_DISPOSITION/);
  }
  for (const [I, T] of [[OLD_FAMILY.I, NEW_FAMILY.T], [NEW_FAMILY.I, OLD_FAMILY.T]])
    assert.equal(requiresPrivateRuntimeCheckpointReconcile({ modelBinding: { modelBundleSha256: I },
      contractHashes: { continuationStateContractSha256: T } }), false);
  const env = { OPERATIONAL_ACTION: 'integrated-historical-maintenance', GITHUB_WORKFLOW: 'Deploy RavRadar code-only repair',
    CONFIRMATION: 'DEPLOY-SAVED-WEATHER-REPAIR', PUBLISH_NEWEST_SAVED_WEATHER: 'true',
    RESTART_ARCHIVED_WEATHER: 'false', COMPLETED_PRIVATE_RUNTIME: 'false', CHECKPOINT_ONLY: 'false', QUICK_CONFIRMATION: 'false',
    RAVRADAR_WEATHER_STATE_EPOCH_BOOTSTRAP: 'false', RAVRADAR_WEATHER_STATE_EPOCH_CHECKPOINT_REENTRY: 'false',
    NATIVE_IDENTITY_RECOVERY: 'false', UPGRADE_LAST_MILE_ENCLOSURE: 'false', UPGRADE_ESTABLISHED_NATIVE_CURRENT_ORIGIN: 'false',
    UPGRADE_EXISTING_OWNER_EXPORT: 'false', UPGRADE_ACCOUNT_ASSISTANT: 'false', UPGRADE_STATISTICS_REVISION: 'false',
    UPGRADE_ACCOUNT_STATISTICS_ASSISTANT: 'false', UPGRADE_NATIVE_ORIGINAL_CONTINUITY: 'false' };
  assert.doesNotThrow(() => assertSavedPrivateRuntimeCheckpointReconcileRequest(env));
  assert.throws(() => assertOrdinaryPrivateRuntimeCheckpointReconcileRequest(env), /OPERATIONAL_ACTION/);
  for (const key of Object.keys(env)) for (const value of ['', undefined])
    assert.throws(() => assertSavedPrivateRuntimeCheckpointReconcileRequest({ ...env, [key]: value }));
  for (const key of Object.keys(env).filter(key => env[key] === 'false'))
    assert.throws(() => assertSavedPrivateRuntimeCheckpointReconcileRequest({ ...env, [key]: 'true' }), /SAVED_MODE_COLLISION/);
  for (const key of ['RAVRADAR_ARCHIVED_WEATHER_RESTART_CONTEXT_PATH', 'RAVRADAR_ARCHIVED_WEATHER_RESTART_CONTEXT_SHA256',
    'RAVRADAR_CURRENT_FAMILY_COLD_START_CONTEXT_PATH', 'RAVRADAR_CURRENT_FAMILY_COLD_START_CONTEXT_SHA256'])
    assert.throws(() => assertSavedPrivateRuntimeCheckpointReconcileRequest({ ...env, [key]: '' }), /SAVED_MODE_COLLISION/);
});
test('actual readonly ordinary and saved CLI select use one genuine committed source head without backend requests', async t => {
  const head = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: ROOT, encoding: 'utf8' }).trim();
  const actual = await fs.readFile(path.join(ROOT, 'scripts/reconcile-private-runtime-checkpoint.mjs'));
  const committed = execFileSync('git', ['cat-file', 'blob', head + ':scripts/reconcile-private-runtime-checkpoint.mjs'],
    { cwd: ROOT, encoding: null });
  assert.deepEqual(Buffer.from(actual.toString().replaceAll(String.fromCharCode(13,10), String.fromCharCode(10))), committed,
    'This CLI target requires real committed source, not copied working files under an old HEAD.');
  const parent = await fs.realpath(os.tmpdir()), own = await fs.mkdtemp(path.join(parent, 'rr-reconcile-cli-select-'));
  t.after(() => fs.rm(own, { recursive: true, force: true }));
  const host = path.join(own, 'source');
  execFileSync('git', ['-c', 'core.autocrlf=false', 'clone', '--shared', '--no-checkout', '--no-hardlinks', ROOT, host]);
  execFileSync('git', ['-c', 'core.autocrlf=false', '-C', host, 'checkout', '--detach', head]);
  execFileSync('git', ['-C', host, 'update-ref', 'refs/remotes/origin/main', head]);
  // Synthetic descriptor metadata selects only a route; it cannot authorize
  // reconcile, native state, transport, a numerical value or production writes.
  const descriptor = { modelBinding: { modelBundleSha256: NEW_FAMILY.I },
    contractHashes: { continuationStateContractSha256: NEW_FAMILY.T } };
  for (const name of ['private-runtime-current-source.json', 'current-private-runtime-source.json'])
    await fs.writeFile(path.join(own, name), JSON.stringify(descriptor), { flag: 'wx' });
  const baseEnv = Object.fromEntries(['PATH', 'Path', 'SystemRoot', 'WINDIR', 'TEMP', 'TMP']
    .filter(key => typeof process.env[key] === 'string').map(key => [key, process.env[key]]));
  const flags = { COMPLETED_PRIVATE_RUNTIME: 'false', CHECKPOINT_ONLY: 'false', QUICK_CONFIRMATION: 'false',
    RAVRADAR_WEATHER_STATE_EPOCH_BOOTSTRAP: 'false', RAVRADAR_WEATHER_STATE_EPOCH_CHECKPOINT_REENTRY: 'false',
    NATIVE_IDENTITY_RECOVERY: 'false' };
  for (const command of ['select', 'select-saved']) {
    const output = path.join(own, command + '.out'); await fs.writeFile(output, '', { flag: 'wx' });
    const env = { ...baseEnv, ...flags, OPERATIONAL_ACTION: 'integrated', GITHUB_REF: 'refs/heads/main',
      GITHUB_EVENT_NAME: 'workflow_dispatch', GITHUB_SHA: head, RUNNER_TEMP: own, GITHUB_OUTPUT: output };
    if (command === 'select-saved') Object.assign(env, { OPERATIONAL_ACTION: 'integrated-historical-maintenance',
      GITHUB_WORKFLOW: 'Deploy RavRadar code-only repair', CONFIRMATION: 'DEPLOY-SAVED-WEATHER-REPAIR',
      PUBLISH_NEWEST_SAVED_WEATHER: 'true', RESTART_ARCHIVED_WEATHER: 'false', UPGRADE_LAST_MILE_ENCLOSURE: 'false',
      UPGRADE_ESTABLISHED_NATIVE_CURRENT_ORIGIN: 'false', UPGRADE_EXISTING_OWNER_EXPORT: 'false',
      UPGRADE_ACCOUNT_ASSISTANT: 'false', UPGRADE_STATISTICS_REVISION: 'false',
      UPGRADE_ACCOUNT_STATISTICS_ASSISTANT: 'false', UPGRADE_NATIVE_ORIGINAL_CONTINUITY: 'false', RAVRADAR_OPERATIONAL_WORK: own });
    const child = spawnSync(process.execPath, ['scripts/reconcile-private-runtime-checkpoint.mjs', command],
      { cwd: host, env, encoding: 'utf8', timeout: 30000 });
    assert.equal(child.status, 0, child.stderr); assert.equal(child.signal, null);
    assert.equal(await fs.readFile(output, 'utf8'), 'required=true' + String.fromCharCode(10));
    if (command === 'select-saved') for (const key of ['UPGRADE_ACCOUNT_STATISTICS_ASSISTANT', 'UPGRADE_NATIVE_ORIGINAL_CONTINUITY']) for (const value of ['true', undefined]) {
      const rejectedOutput = path.join(own, 'saved-rejected-' + key + '-' + String(value) + '.out');
      await fs.writeFile(rejectedOutput, '', { flag: 'wx' });
      const rejected = spawnSync(process.execPath, ['scripts/reconcile-private-runtime-checkpoint.mjs', command],
        { cwd: host, env: { ...env, [key]: value, GITHUB_OUTPUT: rejectedOutput },
          encoding: 'utf8', timeout: 30000 });
      assert.equal(rejected.status, 1); assert.equal(rejected.signal, null);
      assert.match(rejected.stderr, /PRIVATE_B_S_RECONCILE_REFUSED/);
      assert.equal(await fs.readFile(rejectedOutput, 'utf8'), '');
    }
  }
});

test('fixed reconcile failure diagnostics preserve refusal and reveal no arbitrary data', () => {
  const sensitive = 'SYNTHETIC_PRIVATE_MARKER_DO_NOT_LOG';
  const classify = privateRuntimeCheckpointReconcileFailureDiagnostic;
  for (const code of ["B_IDENTITY","B_PATH","B_S_DIFFER","CLOSE_UNPROVED","COMMAND","CURRENT_IDENTITY","DERIVED_REFERENCE","FILE","FILE_CHANGED","GENUINE591_STRICTLY_OLDER","INSTALLED_B_CHANGED","INSTALLED_SOURCE_CHANGED","LINK","MAIN","METADATA_CURRENT_FAMILY","METADATA_INSTALLED_CURRENT_REQUEST","METADATA_OPERATIONAL_ACTION","NATIVE_METADATA_CURRENT_FAMILY","NATIVE_METADATA_INSTALLED_CURRENT_REQUEST","NATIVE_METADATA_OPERATIONAL_ACTION","NON_ORDINARY_REQUEST","OPERATIONAL_ACTION","PARENT","PARENT_CHANGED","POINTER","POINTER_CHANGED","SAME_H0_METADATA_ORIGINALS","SAME_H0_NATIVE_METADATA_ORIGINALS","SAVED_MODE_COLLISION","SAVED_OPERATIONAL_ACTION","SAVED_REQUEST","SAVED_WORK_PATH","S_CHANGED_BEFORE_PUBLISH","S_CHANGED_BEFORE_READ","S_DISPOSITION","S_NOT_BEHIND","S_READBACK_DIFFER","S_READBACK_MISSING","S_ROW","S_VERSION_CHANGED_BEFORE_PUBLISH","UNSUPPORTED_FAMILY","WORKFLOW","WORK_CHANGED"]) {
    assert.equal(classify(new Error('PAIRED_PUBLICATION_' + code), 'RESTORE_S').code, code);
  }
  assert.deepEqual(classify(new Error('PAIRED_PUBLICATION_S_NOT_BEHIND'), 'S_RELATION_GUARD'),
    { phase: 'S_RELATION_GUARD', code: 'S_NOT_BEHIND', errorClass: 'ERROR' });
  assert.equal(classify(Object.assign(new Error(sensitive), { code: 'ENOENT', path: sensitive, cause: sensitive }),
    'INSTALLED_SOURCE').code, 'FILE_NOT_FOUND');
  assert.equal(classify(new SyntaxError(sensitive), 'DERIVE_S').code, 'INPUT_JSON_INVALID');
  assert.equal(classify(new Error('PAIRED_PUBLICATION_' + sensitive), sensitive).code, 'OTHER_REFUSED');
  assert.equal(classify(new Error(sensitive), sensitive).phase, 'UNCLASSIFIED');
  let getterCalls = 0;
  const getters = Object.create(Error.prototype);
  for (const key of ['message', 'code', 'path', 'stack', 'cause']) Object.defineProperty(getters, key,
    { configurable: true, get() { getterCalls++; throw Error(sensitive); } });
  const results = [classify(getters, 'DERIVE_S'), classify(null), classify(sensitive),
    classify(new Proxy({}, { ownKeys() { throw Error(sensitive); } }))];
  assert.equal(getterCalls, 0);
  assert(!JSON.stringify(results).includes(sensitive));
  assert(results.every(row => Object.keys(row).sort().join('|') === 'code|errorClass|phase'));
  assert(results.every(row => row.code === 'OTHER_REFUSED'));
  assert(!JSON.stringify(classify(Object.assign(new Error(sensitive), { path: sensitive, stack: sensitive,
    credentials: sensitive, payload: sensitive, code: sensitive }), 'B_VERIFY')).includes(sensitive));
});

test('actual reconcile CLI retains fixed refusal with one content-free request diagnostic', () => {
  const result = spawnSync(process.execPath, [path.join(ROOT, 'scripts/reconcile-private-runtime-checkpoint.mjs'), 'reconcile'],
    { cwd: ROOT, encoding: 'utf8', env: { ...process.env, GITHUB_REF: 'refs/heads/not-main',
      GITHUB_EVENT_NAME: 'workflow_dispatch' } });
  assert.equal(result.status, 1); assert.equal(result.stdout, '');
  const lines = result.stderr.trim().split(/\r?\n/);
  assert.equal(lines[0], 'PRIVATE_B_S_RECONCILE_REFUSED');
  assert.equal(lines.length, 2);
  assert.deepEqual(JSON.parse(lines[1]), { kind: 'PRIVATE_B_S_RECONCILE_DIAGNOSTIC',
    phase: 'CLI_REQUEST', code: 'WORKFLOW', errorClass: 'ASSERTION_ERROR' });
});
