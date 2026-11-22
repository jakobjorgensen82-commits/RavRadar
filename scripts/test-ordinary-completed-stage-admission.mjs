// Synthetic transport/caller-seam proof. This is NOT a genuine origin-reader
// admission or a production resume. Those remain separate normal-flow gates.
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { assertOrdinaryCompletedStageRequest, bindOrdinaryStagePublicationRequest, materializeOrdinaryStageCandidate, readOrdinaryStageParentCheckpoint }
  from './ordinary-completed-stage-admission.mjs';
import { PRIVATE_RUNTIME_FILES, PRIVATE_RUNTIME_CONTRACT_FILES, buildPrivateRuntimeCreateSpec,
  buildPrivateRuntimeExpectation, installRestoredPrivateRuntime } from './private-production-runtime-workflow.mjs';
import { createPrivateProductionRuntimeBundle, restorePrivateProductionRuntimeBundle }
  from './private-production-runtime-bundle.mjs';
import { sealStagedPrivateProductionRuntime, openStagedPrivateProductionRuntime }
  from './staged-private-production-runtime.mjs';
import { publishProtectedPrivateProductionRuntime } from './protected-private-production-runtime.mjs';
import { appendPrivateWeatherPublicationSummary, checkCodeOnlyPrivateWeatherRebind, publishPrivateWeatherRuntime }
  from './publish-private-weather-runtime.mjs';
import { readCompletedPrivateRuntimePin } from './completed-private-runtime-admission.mjs';
import { ravScoreModelBinding } from '../js/core/ravscore-model-contract.js';
import { normalBAndSTransports } from './lib/established-native-current-origin-test-transports.mjs';
import { saveRavScoreContinuationCheckpoint } from './ravscore-continuation-checkpoint.mjs';
import { restoreProtectedRavScoreContinuationCheckpoint } from './protected-ravscore-continuation-checkpoint.mjs';
import { buildIntegratedRavScoreStateSeries } from '../js/core/ravscore-integrated-state-pipeline.js';
import { buildCandidateGDerivedStateSeries } from '../js/core/ravscore-candidate-g-state-pipeline.js';
import { candidateGStateKey } from './lib/coastal-point-staging-contract.mjs';
import { ravScoreSamplingContextKey } from './lib/ravscore-sampling-context.mjs';
import { ravScoreModelBinding as candidateBinding } from './rollback-assets/ravscore-model-contract.js';
import { CANDIDATE_G_OPERATIONAL_ROLLBACK_ID } from './lib/ravscore-candidate-g-rollback-runtime.mjs';

test('explicit stage request keeps the old completed mode separate and rejects mixed requests before I/O', () => {
  const env = { COMPLETED_STAGE_SOURCE: '123-1-' + 'a'.repeat(40), COMPLETED_PRIVATE_RUNTIME: 'true',
    GITHUB_REF: 'refs/heads/main', GITHUB_EVENT_NAME: 'workflow_dispatch', GITHUB_RUN_ATTEMPT: '1',
    GITHUB_SHA: 'b'.repeat(40), GITHUB_REPOSITORY: 'owner/RavRadar',
    CHECKPOINT_TARGET_HOUR: '', RAVRADAR_PRODUCTION_TARGET_HOUR: '2026-10-19T11:00:00Z',
    QUICK_PROGRESS_SOURCE: '', QUICK_CONFIRMATION: 'false', CHECKPOINT_ONLY: 'false',
    EPOCH_BOOTSTRAP: 'false', EPOCH_REENTRY: 'false', NATIVE_IDENTITY_RECOVERY: 'false',
    EXTENDED_PROVIDER_BOOTSTRAP: 'false', PRODUCE_HANDOFF: 'false', CURRENT_FAMILY_COLD_START: 'false' };
  assert.equal(assertOrdinaryCompletedStageRequest(env).runId, '123');
  assert.equal(assertOrdinaryCompletedStageRequest({ ...env,
    CHECKPOINT_TARGET_HOUR: env.RAVRADAR_PRODUCTION_TARGET_HOUR }, { pin: true }).sourceHead, 'a'.repeat(40));
  let refused = 0;
  for (const [key, value] of [
    ['COMPLETED_STAGE_SOURCE', ''], ['COMPLETED_STAGE_SOURCE', 'https://example.invalid/stage'],
    ['COMPLETED_STAGE_SOURCE', '123-1-' + 'a'.repeat(39)], ['COMPLETED_STAGE_SOURCE', '0123-1-' + 'a'.repeat(40)],
    ['COMPLETED_STAGE_SOURCE', '9007199254740992-1-' + 'a'.repeat(40)],
    ['COMPLETED_PRIVATE_RUNTIME', 'false'], ['GITHUB_REF', 'refs/heads/other'],
    ['GITHUB_EVENT_NAME', 'pull_request'], ['GITHUB_RUN_ATTEMPT', '2'],
    ['GITHUB_SHA', 'unknown'], ['GITHUB_REPOSITORY', '../owner/repository'],
    ['RAVRADAR_PRODUCTION_TARGET_HOUR', '2026-02-30T11:00:00Z'],
    ['RAVRADAR_PRODUCTION_TARGET_HOUR', '2026-10-19T11:01:00Z'],
    ['CHECKPOINT_TARGET_HOUR', '2026-10-19T11:00:00Z'], ['QUICK_PROGRESS_SOURCE', '123-1'],
    ...['QUICK_CONFIRMATION', 'CHECKPOINT_ONLY', 'EPOCH_BOOTSTRAP', 'EPOCH_REENTRY',
      'NATIVE_IDENTITY_RECOVERY', 'EXTENDED_PROVIDER_BOOTSTRAP', 'PRODUCE_HANDOFF', 'CURRENT_FAMILY_COLD_START']
      .map(key => [key, 'true']),
  ]) {
    assert.throws(() => assertOrdinaryCompletedStageRequest({ ...env, [key]: value }),
      error => /^ORDINARY_STAGE_REQUEST_/.test(error.code));
    refused++;
  }
  assert.throws(() => assertOrdinaryCompletedStageRequest(env, { pin: true }),
    { code: 'ORDINARY_STAGE_REQUEST_TARGET' });
  console.log(JSON.stringify({ requestPositive: 2, refused: refused + 1, networkPerformed: false }));
});

export async function assertNormalStagePublication(t) {
  const parent = await fs.realpath(os.tmpdir());
  const own = await fs.mkdtemp(path.join(parent, 'rr-ordinary-stage-normal-seams-'));
  t.after(async () => {
    const stat = await fs.lstat(own);
    assert.equal(path.dirname(own), parent); assert(stat.isDirectory() && !stat.isSymbolicLink());
    await fs.rm(own, { recursive: true, force: false });
  });
  const root = path.join(own, 'repository'), installedRoot = path.join(own, 'installed');
  const privateRoot = path.join(own, 'private'), openedRoot = path.join(own, 'opened');
  for (const directory of [root, installedRoot, privateRoot, openedRoot]) await fs.mkdir(directory);
  const write = async (base, name, value) => {
    const file = path.join(base, name); await fs.mkdir(path.dirname(file), { recursive: true });
    await fs.writeFile(file, typeof value === 'string' || Buffer.isBuffer(value) ? value : JSON.stringify(value));
  };
  for (const name of new Set(Object.values(PRIVATE_RUNTIME_CONTRACT_FILES).flat())) {
    const content = await fs.readFile(new URL('../' + name, import.meta.url));
    await write(root, name, content); await write(installedRoot, name, content);
  }
  const binding = ravScoreModelBinding(), transport = normalBAndSTransports();
  const identity = { repository: 'owner/RavRadar', runId: '123', runAttempt: '1', sourceHead: 'a'.repeat(40) };
  const now = '2026-10-19T12:00:00.000Z', target = '2026-10-19T11:00:00.000Z';
  const expected = await buildPrivateRuntimeExpectation({ repositoryRoot: root, targetReferenceAt: target, now });
  const create = async (reference, suffix, generatedAt = '2026-10-19T11:05:00.000Z') => {
    const value = { datasetId: 'rr-synthetic-stage-seam-' + suffix, productionReferenceAt: reference,
      generatedAt,
      zones: Object.fromEntries(Array.from({ length: 210 }, (_, i) => ['z' + i, {}])),
      coastalParts: { modelBinding: binding, parts: Object.fromEntries(Array.from({ length: 673 }, (_, i) => ['p' + i, {}])) } };
    for (const file of PRIVATE_RUNTIME_FILES) await write(root, file.relativePath,
      file.id === 'full-conditions' ? value : { synthetic: file.id });
    const spec = await buildPrivateRuntimeCreateSpec({ repositoryRoot: root });
    const bundle = path.join(privateRoot, suffix);
    await createPrivateProductionRuntimeBundle({ privateRoot, bundlePath: bundle, repositoryRoot: root, ...spec });
    return bundle;
  };
  const old = await create('2026-10-19T10:00:00.000Z', 'parent');
  const publish = bundlePath => ({ privateRoot, bundlePath, repositoryRoot: root, expected, now,
    sourceHead: identity.sourceHead, request: transport.documentRequest, storage: transport.storage });
  await publishProtectedPrivateProductionRuntime(publish(old));
  const pin = await readCompletedPrivateRuntimePin(transport.documentRequest);
  const child = await create(target, 'child');
  const cipher = path.join(own, 'original-sealed.bin');
  const secret = 'SYNTHETIC_ONLY_NOT_A_SERVICE_CREDENTIAL_123456';
  await sealStagedPrivateProductionRuntime({ ...identity, repositoryRoot: root, privateRoot,
    bundlePath: child, expected, now, outputPath: cipher, masterSecret: secret });
  const originalCipher = await fs.readFile(cipher);
  const opened = path.join(openedRoot, 'bundle');
  await assert.rejects(openStagedPrivateProductionRuntime({ ...identity, runId: '124',
    repositoryRoot: root, privateRoot: openedRoot, bundlePath: opened, expected, now,
    inputPath: cipher, masterSecret: secret }), /authentication failed/);
  await openStagedPrivateProductionRuntime({ ...identity, repositoryRoot: root, privateRoot: openedRoot,
    bundlePath: opened, expected, now, inputPath: cipher, masterSecret: secret });
  const restored = path.join(openedRoot, 'restored');
  await restorePrivateProductionRuntimeBundle({ privateRoot: openedRoot, bundlePath: opened,
    outputPath: restored, repositoryRoot: installedRoot, expected, now, targetReferenceAt: target,
    minimumReferenceAt: expected.minimumReferenceAt, minimumGeneratedAt: expected.minimumGeneratedAt });
  await installRestoredPrivateRuntime({ restoredRoot: restored, repositoryRoot: installedRoot });
  const candidate = path.join(installedRoot, '.cache/dmi-candidate-progress.json');
  await materializeOrdinaryStageCandidate(installedRoot);
  const exactCandidate = await fs.readFile(candidate);
  await materializeOrdinaryStageCandidate(installedRoot);
  assert.deepEqual(await fs.readFile(candidate), exactCandidate, 'An installed exact candidate is retained.');
  await fs.writeFile(candidate, 'SYNTHETIC mismatched candidate\n');
  await assert.rejects(materializeOrdinaryStageCandidate(installedRoot), { code: 'ORDINARY_STAGE_CANDIDATE_CHANGED' });
  assert.equal(await fs.readFile(candidate, 'utf8'), 'SYNTHETIC mismatched candidate\n', 'Refusal never overwrites it.');
  await fs.writeFile(candidate, exactCandidate);
  const rebuilt = path.join(openedRoot, 'rebuilt');
  await createPrivateProductionRuntimeBundle({ privateRoot: openedRoot, bundlePath: rebuilt,
    repositoryRoot: installedRoot, ...await buildPrivateRuntimeCreateSpec({ repositoryRoot: installedRoot }) });
  assert.deepEqual(await fs.readFile(path.join(child, 'manifest.json')),
    await fs.readFile(path.join(rebuilt, 'manifest.json')), 'Whole rebuilt B, not a subset.');
  assert.deepEqual(await fs.readFile(cipher), originalCipher, 'Original GCM/AAD remains unchanged.');
  const parentReceipt = { parentPin: pin.pin, parentDescriptor: pin.descriptor };
  let virtualUsed = 2_050_000_001;
  const r2Calls = [];
  const r2OptionsFor = (remote, calls, listPositions) => ({ storageBackend: 'r2', accountId: 'a'.repeat(32), accessKeyId: 'synthetic-id',
    secretAccessKey: 'synthetic-secret', delayImpl: async () => {}, fetchImpl: async (url, request) => {
      const address = new URL(url);
      calls.push(request.method);
      if (request.method === 'GET' && address.searchParams.has('list-type')) {
        listPositions?.push(calls.length - 1);
        return new Response(`<ListBucketResult><Contents><Key>preserved</Key><Size>${virtualUsed}</Size></Contents><KeyCount>1</KeyCount><IsTruncated>false</IsTruncated></ListBucketResult>`);
      }
      if (request.method === 'HEAD' && address.pathname === '/ravradar-private-production-runtime') return new Response(null);
      const key = decodeURIComponent(address.pathname.slice('/ravradar-private-production-runtime/'.length));
      if (request.method === 'HEAD') return new Response(null, { status: remote.objects.has(key) ? 200 : 404 });
      if (request.method === 'PUT') {
        const result = await remote.storage.uploadImmutable(key, request.body);
        return new Response(null, { status: result.created ? 200 : 412 });
      }
      if (request.method === 'GET') {
        if (!remote.objects.has(key)) return new Response(null, { status: 404 });
        const bytes = await remote.storage.download(key);
        return new Response(bytes, { headers: { 'content-length': String(bytes.length) } });
      }
      if (request.method === 'DELETE') { await remote.storage.removeExact(key); return new Response(null, { status: 204 }); }
      throw new Error('unexpected normal publisher storage method');
    } });
  const r2ListPositions = [];
  const r2Options = r2OptionsFor(transport, r2Calls, r2ListPositions);
  const { storage: _syntheticOriginalStorage, ...normalPublication } = publish(child);
  const publishChild = () => publishPrivateWeatherRuntime({ ...normalPublication,
    request: bindOrdinaryStagePublicationRequest(transport.documentRequest, parentReceipt) }, r2Options);
  const heldParent = structuredClone(transport.documents.get('ravscore-private-production-runtime-pointer'));
  await assert.rejects(publishChild(), error => error.cause?.code === 'PRIVATE_WEATHER_PUBLICATION_GENERATION_CAPACITY');
  assert.deepEqual(transport.documents.get('ravscore-private-production-runtime-pointer'), heldParent,
    'Capacity refusal never reaches parent CAS.');
  assert.equal(r2Calls.includes('PUT'), false, 'Capacity refusal reaches no actual PUT.');
  virtualUsed = 1_734_856_529;
  const late = normalBAndSTransports();
  const pointerKey = 'ravscore-private-production-runtime-pointer';
  late.documents.set(pointerKey, structuredClone(heldParent));
  for (const [key, value] of transport.objects) late.objects.set(key, Buffer.from(value));
  let finishDelayedCas;
  const lostRequest = async (query, options, phase) => {
    if (phase === 'compare-and-swap') {
      assert.equal(finishDelayedCas, undefined, 'No blind retry of the pointer write.');
      finishDelayedCas = () => late.documentRequest(query, options, phase);
      throw new Error('synthetic lost response while the write is still pending');
    }
    return late.documentRequest(query, options, phase);
  };
  const lateCalls = [];
  await assert.rejects(publishPrivateWeatherRuntime({ ...normalPublication,
    request: bindOrdinaryStagePublicationRequest(lostRequest, parentReceipt) }, r2OptionsFor(late, lateCalls)),
  /Private runtime pointer compare-and-swap failed closed/);
  assert.deepEqual(late.documents.get(pointerKey), heldParent, 'Both recovery reads still saw the exact old pointer.');
  assert.equal(lateCalls.includes('DELETE'), false, 'Ambiguous pointer write protects the candidate on the wire.');
  assert.equal(typeof finishDelayedCas, 'function');
  await finishDelayedCas();
  const lateRow = late.documents.get(pointerKey);
  assert.equal(lateRow.version, 2);
  assert.deepEqual(lateRow.payload.previous, pin.descriptor);
  for (const part of lateRow.payload.current.objects) {
    assert.equal(crypto.createHash('sha256').update(await late.storage.download(part.objectPath)).digest('hex'),
      part.objectSha256, 'The late authoritative CAS still points at every verified candidate byte.');
  }
  const beforeSuccessfulPublicationCalls = r2Calls.length;
  const publication = await publishChild();
  assert.equal(publication.published, true);
  assert.deepEqual(publication.bucketUsageBeforeArchiveUpload, { usedBytes: virtualUsed, objectCount: 1 });
  assert.deepEqual(publication.bucketUsageBeforeRetirementMarker, { usedBytes: virtualUsed, objectCount: 1 });
  const successfulListPositions = r2ListPositions.filter(position => position >= beforeSuccessfulPublicationCalls);
  const successfulPuts = r2Calls.slice(beforeSuccessfulPublicationCalls).filter(method => method === 'PUT');
  const firstArchivePut = r2Calls.indexOf('PUT', beforeSuccessfulPublicationCalls);
  assert.equal(successfulListPositions[1], firstArchivePut - 1,
    'The initial stock is sampled at the existing first archive PUT admission.');
  assert.equal(successfulListPositions.length, successfulPuts.length + 2,
    'The observation adds no R2 listing to archive or retirement marker admission.');
  assert.deepEqual(r2Calls.slice(successfulListPositions.at(-2), successfulListPositions.at(-1) + 2),
    ['GET', 'HEAD', 'GET', 'PUT'], 'The sampled listing stays before the retirement marker upload.');
  const summaryPath = path.join(own, 'weather-r2-summary');
  const summaryEnvironment = { GITHUB_ACTIONS: 'true', GITHUB_STEP_SUMMARY: summaryPath };
  const stockNotice = t.mock.method(console, 'log', () => {});
  const noticePrefix = '::notice title=RavRadar R2 archive stock::';
  await appendPrivateWeatherPublicationSummary(publication, { GITHUB_STEP_SUMMARY: summaryPath });
  await assert.rejects(fs.stat(summaryPath), { code: 'ENOENT' });
  assert.equal(stockNotice.mock.callCount(), 0);
  await appendPrivateWeatherPublicationSummary({
    ...publication,
    bucketUsageBeforeArchiveUpload: { ...publication.bucketUsageBeforeArchiveUpload, extra: 'private' },
  }, summaryEnvironment);
  assert.deepEqual(stockNotice.mock.calls.at(-1).arguments, [noticePrefix + JSON.stringify({
    bucketUsageBeforeArchiveUpload: { usedBytes: virtualUsed, objectCount: 1 },
    bucketUsageBeforeRetirementMarker: { usedBytes: virtualUsed, objectCount: 1 },
  })]);
  const publicationSummary = await fs.readFile(summaryPath, 'utf8');
  assert.match(publicationSummary,
    /R2 reported 1734856529 bytes after archive verification and before the retirement marker upload\. The object count was 1\./);
  assert.match(publicationSummary,
    /R2 reported 1734856529 bytes before the first new archive object, following any retirement from earlier runs\. The object count was 1\./);
  assert.match(publicationSummary, /The retirement check completed\./);
  await assert.doesNotReject(() => appendPrivateWeatherPublicationSummary(publication,
    { ...summaryEnvironment, GITHUB_STEP_SUMMARY: path.join(own, 'missing', 'summary') }));
  const row = transport.documents.get('ravscore-private-production-runtime-pointer');
  assert.equal(row.version, 2);
  assert.equal(row.payload.current.sourceHead, identity.sourceHead);
  assert.deepEqual(row.payload.previous, pin.descriptor);
  const saves = transport.events.filter(value => value === 'OBJECT_SAVE').length;
  const beforeChangedParentCalls = r2Calls.length;
  await assert.rejects(publishChild(),
  error => error.message === 'Private runtime pointer read failed closed'
    && error.cause?.code === 'ORDINARY_STAGE_PARENT_PUBLISH_READ');
  assert.equal(transport.events.filter(value => value === 'OBJECT_SAVE').length, saves,
    'Changed parent rejected before any new immutable upload.');
  assert.equal(r2Calls.length, beforeChangedParentCalls);
  virtualUsed = 2_490_000_000;
  const beforeCodeOnlyCalls = r2Calls.length;
  const codeOnly = await publishPrivateWeatherRuntime({ ...normalPublication,
    sourceHead: 'c'.repeat(40), request: transport.documentRequest }, r2Options);
  assert.equal(codeOnly.published, false);
  assert.equal(codeOnly.reason, 'protected-private-runtime-content-already-current');
  assert.equal(r2Calls.slice(beforeCodeOnlyCalls).includes('PUT'), false);
  assert.equal(transport.documents.get('ravscore-private-production-runtime-pointer').version, 2);
  assert.equal(transport.documents.get('ravscore-private-production-runtime-pointer').payload.current.sourceHead, identity.sourceHead);

  const missingCurrentObject = row.payload.current.objects[0].objectPath;
  const expectedCurrentBytes = Buffer.from(transport.objects.get(missingCurrentObject));
  assert.equal(transport.objects.delete(missingCurrentObject), true);
  virtualUsed = 1_734_856_529;
  const repairCalls = [];
  const repairedCurrent = await publishPrivateWeatherRuntime({
    ...normalPublication, request: transport.documentRequest,
  }, r2OptionsFor(transport, repairCalls));
  assert.equal(repairedCurrent.published, false);
  assert.ok(repairCalls.includes('PUT'), 'The existing repair restores the missing current archive object.');
  assert.deepEqual(transport.objects.get(missingCurrentObject), expectedCurrentBytes);
  assert.equal(repairedCurrent.bucketUsageBeforeArchiveUpload, undefined,
    'Repair of an already-referenced object does not prove prior retirement happened before its PUT.');
  const nextHour = '2026-10-19T12:00:00.000Z', nextNow = '2026-10-19T13:00:00.000Z';
  const third = await create(nextHour, 'third', '2026-10-19T12:05:00.000Z');
  const nextExpected = await buildPrivateRuntimeExpectation({
    repositoryRoot: root, targetReferenceAt: nextHour, now: nextNow,
  });
  const { storage: _thirdStorage, ...thirdPublication } = {
    ...publish(third), expected: nextExpected, now: nextNow,
  };
  virtualUsed = 1_734_856_529;
  let thirdCasWritten = false;
  const thirdRequest = async (query, options, phase) => {
    const result = await transport.documentRequest(query, options, phase);
    if (phase === 'compare-and-swap') thirdCasWritten = true;
    return result;
  };
  const interruptedLists = [];
  const interrupted = r2OptionsFor(transport, [], interruptedLists);
  const interruptedFetch = interrupted.fetchImpl;
  interrupted.fetchImpl = async (url, request) => {
    if (thirdCasWritten) throw new Error('synthetic runner loss after central B CAS');
    return interruptedFetch(url, request);
  };
  const mustRetire = heldParent.payload.current.objects.map(part => part.objectPath);
  const beforeThird = structuredClone(transport.documents.get(pointerKey));
  const sameReference = structuredClone(beforeThird);
  sameReference.payload.previous.productionReferenceAt = sameReference.payload.current.productionReferenceAt;
  await assert.rejects(checkCodeOnlyPrivateWeatherRebind(async () => [sameReference], {
    ...r2OptionsFor(transport, []),
    fetchImpl: async () => assert.fail('Block a second same-hour write before any bucket access'),
  }), { code: 'PRIVATE_WEATHER_PUBLICATION_WAIT_FOR_LATER_REFERENCE' });

  const prepared = new Set(transport.objects.keys());
  const beforeCasCalls = [];
  await assert.rejects(publishPrivateWeatherRuntime({
    ...thirdPublication,
    request: async (query, options, phase) => {
      if (phase === 'compare-and-swap') {
        assert(transport.objects.size >= prepared.size + 2, 'Both candidate and marker have been read back.');
        throw new Error('synthetic runner loss before the CAS request is delivered');
      }
      return transport.documentRequest(query, options, phase);
    },
  }, r2OptionsFor(transport, beforeCasCalls)), /Private runtime pointer compare-and-swap failed closed/);
  assert.deepEqual(transport.documents.get(pointerKey), beforeThird);
  assert.equal(beforeCasCalls.includes('DELETE'), false);
  const afterPrepared = new Set(transport.objects.keys());
  await assert.rejects(checkCodeOnlyPrivateWeatherRebind(transport.documentRequest, r2OptionsFor(transport, [])),
    { code: 'PRIVATE_WEATHER_PUBLICATION_PENDING_POINTER_ADVANCE' });
  const thirdResult = await publishPrivateWeatherRuntime({ ...thirdPublication, request: thirdRequest }, interrupted);
  assert.equal(thirdResult.published, true);
  assert.equal(thirdResult.retentionCleanupComplete, false);
  assert.equal(thirdResult.bucketUsageBeforeArchiveUpload, undefined);
  assert.equal(thirdResult.bucketUsageBeforeRetirementMarker, undefined);
  assert.deepEqual(interruptedLists, [], 'Reusing the verified marker does not measure the bucket.');
  await appendPrivateWeatherPublicationSummary(thirdResult, summaryEnvironment);
  assert.deepEqual(stockNotice.mock.calls.at(-1).arguments, [noticePrefix + JSON.stringify({
    bucketUsageBeforeArchiveUpload: null,
    bucketUsageBeforeRetirementMarker: null,
  })]);
  assert.match(await fs.readFile(summaryPath, 'utf8'),
    /was not measured\.\n\nRetirement cleanup remains unresolved\./);
  assert.deepEqual(new Set(transport.objects.keys()), afterPrepared, 'The same immutable intent was reused.');
  const thirdRow = transport.documents.get(pointerKey);
  assert.equal(thirdRow.version, 3);
  const codeOnlyReadCalls = [];
  await assert.rejects(checkCodeOnlyPrivateWeatherRebind(
    transport.documentRequest, r2OptionsFor(transport, codeOnlyReadCalls), target),
  { code: 'PRIVATE_WEATHER_PUBLICATION_REBIND_TARGET_CHANGED' });
  assert.equal(codeOnlyReadCalls.length, 0);
  await assert.rejects(checkCodeOnlyPrivateWeatherRebind(
    transport.documentRequest, r2OptionsFor(transport, codeOnlyReadCalls)),
  { code: 'PRIVATE_WEATHER_PUBLICATION_RETIREMENT_PENDING' });
  assert.deepEqual(codeOnlyReadCalls, ['GET'], 'The early admission never deletes a verified pending retirement.');
  const protectedPaths = [...thirdRow.payload.current.objects, ...thirdRow.payload.previous.objects]
    .map(part => part.objectPath);
  for (const key of [...mustRetire, ...protectedPaths]) assert.equal(transport.objects.has(key), true);
  const stillOwned = new Set(transport.objects.keys());
  const beforeRecoveryEvents = transport.events.length;
  let reads = 0;
  const changedOwnerCalls = [];
  const changedOwner = await publishPrivateWeatherRuntime({
    ...thirdPublication,
    request: async (query, options, phase) => {
      if (phase === 'read' && ++reads === 2) return [{ ...thirdRow, version: 4 }];
      return transport.documentRequest(query, options, phase);
    },
  }, r2OptionsFor(transport, changedOwnerCalls));
  assert.equal(changedOwner.published, false);
  assert.equal(changedOwner.retentionCleanupComplete, false);
  assert.equal(changedOwnerCalls.includes('DELETE'), false);
  assert.deepEqual(new Set(transport.objects.keys()), stillOwned);

  // The old object is removed but the marker deletion is interrupted. The
  // existing exact recovery must recognize actual absence on the next replay.
  const partial = r2OptionsFor(transport, []);
  const partialFetch = partial.fetchImpl;
  partial.fetchImpl = async (url, request) => {
    const key = decodeURIComponent(new URL(url).pathname.slice('/ravradar-private-production-runtime/'.length));
    if (request.method === 'DELETE' && !mustRetire.includes(key)) {
      assert.equal(protectedPaths.includes(key), false, 'Never target either authoritative generation.');
      throw new Error('synthetic lost marker deletion');
    }
    return partialFetch(url, request);
  };
  const partialResult = await publishPrivateWeatherRuntime(thirdPublication, partial);
  assert.equal(partialResult.published, false);
  assert.equal(partialResult.retentionCleanupComplete, false);
  for (const key of mustRetire) assert.equal(transport.objects.has(key), false);
  for (const key of protectedPaths) assert.equal(transport.objects.has(key), true);
  assert.equal(transport.objects.size, stillOwned.size - mustRetire.length);

  const resume = await publishPrivateWeatherRuntime(thirdPublication, r2OptionsFor(transport, []));
  assert.equal(resume.published, false);
  assert.equal(transport.documents.get(pointerKey).version, 3);
  assert.equal(transport.objects.size, protectedPaths.length);
  for (const key of protectedPaths) assert.equal(transport.objects.has(key), true);
  assert.equal(transport.events.slice(beforeRecoveryEvents).includes('OBJECT_SAVE'), false);
  const settledCodeOnlyCalls = [];
  await checkCodeOnlyPrivateWeatherRebind(
    transport.documentRequest, r2OptionsFor(transport, settledCodeOnlyCalls), nextHour,
  );
  assert.ok(settledCodeOnlyCalls.length > 0);
  assert.ok(settledCodeOnlyCalls.every(method => method === 'GET'),
    'A clear admission with a verified rollback and capacity stays read-only.');
  assert.deepEqual(transport.documents.get(pointerKey), thirdRow);
  const fresh = bindOrdinaryStagePublicationRequest(async () => { throw new Error('No request should occur'); }, parentReceipt);
  await assert.rejects(fresh('?ignored', {}, 'insert'), /PARENT_INSERT_FORBIDDEN/);
  await assert.rejects(fresh('?ignored', { body: '{}' }, 'compare-and-swap'), /PARENT_CAS_CHANGED/);
  console.log(JSON.stringify({ normalGcm: true, originalCipherSha256: crypto.createHash('sha256').update(originalCipher).digest('hex'),
    atomicNormalRestoreAndInstall: true, wholeManifestIdentical: true, realPublisherParentCas: true,
    changedParentRefusedBeforeUpload: true, durableRetirementReplay: true, externalNetwork: false,
    ordinaryOriginAdmissionProved: false,
    scoringPerformed: false, providerRequestsPerformed: false }));
}
test('normal GCM/B/atomic install/recreated B and real publisher bind the original producer to exact parent CAS', assertNormalStagePublication);

test('normal protected parent checkpoint uses isolated reads and preserves a newer working child', async t => {
  const temp = await fs.realpath(os.tmpdir());
  const own = await fs.mkdtemp(path.join(temp, 'rr-ordinary-parent-s-'));
  const identity = await fs.lstat(own, { bigint: true });
  t.after(async () => {
    const current = await fs.lstat(own, { bigint: true });
    assert.equal(path.dirname(own), temp); assert(path.basename(own).startsWith('rr-ordinary-parent-s-'));
    assert.equal(current.isSymbolicLink(), false); assert.equal(current.ino, identity.ino); assert.equal(current.dev, identity.dev);
    await fs.rm(own, { recursive: true, force: false });
  });
  const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
  const I = ravScoreModelBinding(), C = candidateBinding();
  const conditionsFor = reference => {
    // Same current 49-hour/673-part state recipe as the normal lineage case.
    // This constructs valid S values, not an origin attestation or admission.
    const samples = Array.from({ length: 49 }, (_, i) => ({
      time: new Date(Date.parse(reference) - (48 - i) * 3_600_000).toISOString(),
      currentSpeedMps: 0.12, currentAlignment: 0.75, currentVerified: true,
      waveHeightM: 1.2, wavePeriodS: 6, waveDirectionDeg: 270,
    }));
    const partFor = i => ({ partId: 'p' + i, zoneId: 'fixture-zone', landPoint: [10, 56],
      waterPoint: [10.01, 56.01], onshoreDirectionDeg: 90 });
    const first = partFor(0), parts = {}, candidateParts = {};
    const integrated = buildIntegratedRavScoreStateSeries(samples, {
      samplingContextKey: ravScoreSamplingContextKey(first), onshoreDirectionDeg: 90 }).rows.at(-1).continuationState;
    const candidate = buildCandidateGDerivedStateSeries(samples, { stateKey: candidateGStateKey(first) }).continuationState;
    for (let i = 0; i < 673; i++) {
      const part = partFor(i);
      parts[part.partId] = { ...part, ravScoreModel: { currentState: {
        ...structuredClone(integrated), samplingContextKey: ravScoreSamplingContextKey(part) } } };
      candidateParts[part.partId] = { ravScoreModel: { currentState: {
        ...structuredClone(candidate), stateKey: candidateGStateKey(part) } } };
    }
    return { datasetId: 'rr-parent-s-' + reference.slice(11, 13), productionReferenceAt: reference,
      coastalParts: { modelBinding: I, expectedPartCount: 673, parts },
      ravScoreCandidateGRollback: { schemaVersion: '1.0.0', kind: 'PRIVATE_CANDIDATE_G_OPERATIONAL_ROLLBACK_RUNTIME',
        privacyClass: 'PRIVATE_PRODUCTION_RUNTIME', sourceModelBinding: I, rollbackModelBinding: C,
        rollbackId: CANDIDATE_G_OPERATIONAL_ROLLBACK_ID, automaticActivationAllowed: false, publicDuringNormalOperation: false,
        runtime: { modelBinding: C, expectedPartCount: 673, scoredPartCount: 673,
          scoreProfile: { modelCoverageReady: true, modelMemoryReady: true, modelMigrationReady: true }, parts: candidateParts } } };
  };
  const parentAt = '2026-10-19T10:00:00.000Z', childAt = '2026-10-19T11:00:00.000Z';
  const checkpoints = [];
  for (const [label, reference] of [['parent', parentAt], ['child', childAt]]) {
    const sourcePath = path.join(own, label + '-conditions.json'), checkpointPath = path.join(own, label + '-checkpoint.json');
    await fs.writeFile(sourcePath, JSON.stringify(conditionsFor(reference)));
    await saveRavScoreContinuationCheckpoint({ sourcePath, checkpointPath, repositoryRoot });
    checkpoints.push(JSON.parse(await fs.readFile(checkpointPath, 'utf8')));
  }
  const [parent, child] = checkpoints, transport = normalBAndSTransports();
  const row = { document_key: 'ravscore-continuation-checkpoint', version: 7, payload: structuredClone(parent) };
  transport.documents.set(row.document_key, structuredClone(row));
  const restoreTransport = transport.installFixedReaderTransport();
  t.after(restoreTransport);
  const working = path.join(own, 'working', '.cache/ravscore-continuation-checkpoint/checkpoint.json');
  await fs.mkdir(path.dirname(working), { recursive: true });
  await fs.writeFile(working, JSON.stringify(child) + '\n');
  const workingBytes = await fs.readFile(working);
  const oldRestore = await restoreProtectedRavScoreContinuationCheckpoint({ checkpointPath: working, targetReference: childAt,
    request: transport.documentRequest });
  assert.equal(oldRestore.restored, false); assert.equal(oldRestore.reason, 'local-checkpoint-newer');
  const descriptor = { datasetId: parent.datasetId, productionReferenceAt: parentAt };
  const first = await readOrdinaryStageParentCheckpoint(descriptor, path.join(own, 'parent-before-lineage'));
  const second = await readOrdinaryStageParentCheckpoint(descriptor, path.join(own, 'parent-after-lineage'));
  assert.deepEqual(first, parent); assert.deepEqual(second, parent);
  assert.notEqual(first.generationSha256, child.generationSha256);
  assert.deepEqual(await fs.readFile(working), workingBytes);
  assert.deepEqual(transport.documents.get(row.document_key), row);
  transport.documents.delete(row.document_key);
  await assert.rejects(readOrdinaryStageParentCheckpoint(descriptor, path.join(own, 'missing-parent')),
    { code: 'ORDINARY_STAGE_PARENT_CHECKPOINT_MISSING' });
  transport.documents.set(row.document_key, { ...structuredClone(row), payload: { ...structuredClone(parent), generationSha256: '0'.repeat(64) } });
  await assert.rejects(readOrdinaryStageParentCheckpoint(descriptor, path.join(own, 'corrupt-parent')));
  assert.deepEqual(await fs.readFile(working), workingBytes);
  assert(transport.events.every(event => event === 'S_READ'), 'The protected parent reads perform no SAVE/CAS.');
  console.log(JSON.stringify({ currentProtectedParentRead: true, workingChildUnchanged: true,
    twoFreshAuthenticatedReads: true, missingOrCorruptParentRefused: true, fullAdmissionProved: false,
    providerOrProductionRequests: false }));
});

test('actual completed-stage consumer admits genuine normal parent/child through the lexical origin reader', () => {
  // Existing archive/origin fixture, not a detached JSON attestation or a
  // second recovery platform. Only the new explicit branch produces 673 H0
  // pairs; the old default and full national/two-follower cases stay intact.
  const target = fileURLToPath(new URL('./test-last-mile-enclosure-restart-archive-origin.mjs', import.meta.url));
  const root = path.resolve(path.dirname(target), '..');
  const output = execFileSync(process.execPath, [target, '--completed-stage-admit'], {
    cwd: root, encoding: 'utf8', timeout: 900_000, maxBuffer: 4 * 1024 * 1024,
    stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true,
  });
  assert.match(output, /Owned genuine673-H0 parent\/child actual-admit receipt retained/);
  console.log(JSON.stringify({ actualLexicalOriginAdmission: true, genuineParts: 673,
    source: 'EXISTING_ARCHIVE_ORIGIN_FIXTURE', externalNetwork: false, productionProof: false }));
});
