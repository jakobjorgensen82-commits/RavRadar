import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import nativeFs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createWeatherStateEpochInputView, assertWeatherStateEpochInputView,
  assertWeatherStateEpochInputViewForTarget, weatherStateEpochInputViewFacts } from './lib/weather-state-epoch-input-view.mjs';
import { buildRavScoreProductionPartSeries, selectRavScoreProductionInitialState }
  from './lib/ravscore-production-part-pipeline.mjs';
import { RAVSCORE_FIRST_CUTOVER_BOOTSTRAP_MODES } from './lib/ravscore-recovery-replay.mjs';
import { selectCoastalPointCandidateGRollbackContinuation }
  from './lib/coastal-point-staging-contract.mjs';
import { dmiExpectedIdentityForPart } from './lib/ravscore-production-adapters.mjs';
import { inspectDmiForecastGridSampling } from './lib/dmi-forecast-store.mjs';
import { saveRavScoreContinuationCheckpoint, loadRavScoreContinuationCheckpointForTarget }
  from './ravscore-continuation-checkpoint.mjs';
import { ravScoreModelBinding } from '../js/core/ravscore-model-contract.js';
import { ravScoreModelBinding as candidateBinding } from './rollback-assets/ravscore-model-contract.js';
import { withIssuedAccountAssistantSource } from './check-account-assistant-issued-source.mjs';
import { CURRENT_GRID_SAMPLING_SELECTED_PREDECESSOR_POLICY as OLD }
  from './lib/bounded-conditions-predecessor-transition.mjs';
import { createWeatherStateEpochCaptureStorage, saveWeatherStateEpochArchive,
  rehydrateLocalWeatherStateEpochArchive, assertVerifiedWeatherStateEpochArchive,
  WEATHER_STATE_EPOCH_PUBLIC_FILES } from './lib/weather-state-epoch-archive.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const hash = value => crypto.createHash('sha256').update(value).digest('hex');
const HOUR_MS = 3_600_000;
const base = Date.parse('2026-08-29T00:00:00.000Z');
const time = hour => new Date(base + hour * HOUR_MS).toISOString();
const vectorSelection = 'nearest-shared-uv-column-across-dmi-collections-then-deepest-valid-layer';

async function syntheticNewFactory() {
  // Reuse the existing actual normal synthetic weather/capture shape rather
  // than copy a fixture bank or replace any production validator.
  const source = await fs.readFile(path.join(ROOT, 'scripts/test-ravscore-recovery-replay.mjs'), 'utf8');
  const start = 'const dmiContracts = {', end = 'function withoutCurrent(row) {';
  assert.equal(source.split(start).length, 2); assert.equal(source.split(end).length, 2);
  const factory = source.slice(source.indexOf(start), source.indexOf(end));
  assert.equal(hash(factory), '7de8bf6808231719933e85a4a52e7bde8de6a46f8fe204357369b65bdf4f3b53');
  const weather = new Function('part', 'time', 'HOUR_MS', 'vectorSelection', 'sha', factory + '\nreturn weather;');
  const samplingSource = await fs.readFile(path.join(ROOT, 'scripts/test-protected-dmi-native-current-proofs.mjs'), 'utf8');
  const samplingStart = '  const sampling = source => ({', samplingEnd = '\n  const withWeather = row =>';
  assert.equal(samplingSource.split(samplingStart).length, 2);
  assert.equal(samplingSource.split(samplingEnd).length, 2);
  const samplingFactory = samplingSource.slice(samplingSource.indexOf(samplingStart), samplingSource.indexOf(samplingEnd));
  assert.equal(hash(samplingFactory), '2f7666d6fa4eb5aaadf3e88970c36e3d8c7f68b3619645284ec5ba6b51e1935b');
  const sampling = new Function('hash', samplingFactory + '\nreturn sampling;')(hash);
  return part => {
    const oldFactory = weather(part, time, HOUR_MS, vectorSelection, hash);
    return Array.from({ length: 12 }, (_, hour) => {
      const row = oldFactory(hour);
      // Synthetic NEW metadata only, not a claim of RAW/ecCodes execution.
      row.currentProvenance.nativeGridSampling = sampling(row.currentProvenance);
      row.currentProvenance.nativeSteps[0].nativeGridSampling = structuredClone(row.currentProvenance.nativeGridSampling);
      assert.equal(inspectDmiForecastGridSampling(row.currentProvenance, 'current', row.time,
        dmiExpectedIdentityForPart(part)).status, 'coherent');
      return row;
    });
  };
}
async function ownedTemporary(t) {
  const parent = await fs.realpath(os.tmpdir());
  const root = await fs.mkdtemp(path.join(parent, 'rr-weather-epoch-input-'));
  const identity = await fs.lstat(root, { bigint: true });
  t.after(async () => {
    assert.equal(path.dirname(await fs.realpath(root)), parent);
    const after = await fs.lstat(root, { bigint: true });
    assert.equal(after.dev, identity.dev); assert.equal(after.ino, identity.ino);
    // Only these own, known synthetic files; no recursive deletion.
    async function removeOwned(directory) {
      for (const entry of await fs.readdir(directory, { withFileTypes: true })) {
        const file = path.join(directory, entry.name), stat = await fs.lstat(file);
        assert(!stat.isSymbolicLink());
        if (stat.isDirectory()) await removeOwned(file);
        else { assert(stat.isFile() && stat.nlink === 1); await fs.unlink(file); }
      }
      await fs.rmdir(directory);
    }
    await removeOwned(root);
  });
  return root;
}
async function exclusiveJson(file, value) {
  const handle = await fs.open(file, 'wx', 0o600), fd = handle.fd;
  let first;
  try { await handle.writeFile(JSON.stringify(value) + '\n'); await handle.sync(); }
  catch (error) { first = error; }
  try { await handle.close(); } catch (error) { first ??= error; }
  try { await new Promise((resolve, reject) => nativeFs.fstat(fd, error => error ? reject(error) : resolve()));
    first ??= new Error('TEST_OWNED_CLOSE_NOT_PROVED'); }
  catch (error) { if (error?.code !== 'EBADF') first ??= error; }
  if (first) throw first;
}

// Controlled storage exercises actual capture/SAVE/readback/local rehydration.
// The callback uses the genuine fixed044d OLD producer and normal state/S
// validators, not a caller-provided boolean, current-state retag or fake brand.
// This is not a claim of authentic production B/S or remote archive delivery.
async function archivedOldView(root) {
  return withIssuedAccountAssistantSource(async oldRoot => {
    const load = relative => import(pathToFileURL(path.join(oldRoot, relative)).href);
    const [pipeline, candidatePipeline, staging, integrated, candidate, checkpoint, candidateRuntime] = await Promise.all([
      load('js/core/ravscore-integrated-state-pipeline.js'), load('js/core/ravscore-candidate-g-state-pipeline.js'),
      load('scripts/lib/coastal-point-staging-contract.mjs'), load('js/core/ravscore-model-contract.js'),
      load('scripts/rollback-assets/ravscore-model-contract.js'), load('scripts/ravscore-continuation-checkpoint.mjs'),
      load('scripts/lib/ravscore-candidate-g-rollback-runtime.mjs'),
    ]);
    const ib = integrated.ravScoreModelBinding(), cb = candidate.ravScoreModelBinding();
    assert.deepEqual(ib, OLD.sourceModelBinding); assert.deepEqual(cb, OLD.sourceCandidateModelBinding);
    const reference = time(9), registry = { schemaVersion: 2, enabled: true, zoneCount: 210, partCount: 673, zones: {} };
    const conditions = { datasetId: 'rr-controlled-epoch-old-673', productionReferenceAt: reference,
      zones: {}, coastalParts: { modelBinding: ib, parts: {} }, ravScoreCandidateGRollback: {
        schemaVersion: '1.0.0', kind: 'PRIVATE_CANDIDATE_G_OPERATIONAL_ROLLBACK_RUNTIME',
        privacyClass: 'PRIVATE_PRODUCTION_RUNTIME', sourceModelBinding: ib, rollbackModelBinding: cb,
        rollbackId: candidateRuntime.CANDIDATE_G_OPERATIONAL_ROLLBACK_ID, automaticActivationAllowed: false,
        publicDuringNormalOperation: false, runtime: { modelBinding: cb, expectedPartCount: 673,
          scoredPartCount: 673, scoreProfile: { modelCoverageReady: true, modelMemoryReady: true,
            modelMigrationReady: true }, parts: {} } } };
    const samples = Array.from({ length: 49 }, (_, index) => ({ time: time(9 - 48 + index),
      currentSpeedMps: 0.054, currentAlignment: 1, currentVerified: true,
      waveHeightM: 1, wavePeriodS: 6, waveDirectionDeg: 270 }));
    let number = 0;
    for (let zoneIndex = 0; zoneIndex < 210; zoneIndex++) {
      const zoneId = `EPOCH-ZONE-${zoneIndex}`, count = zoneIndex < 43 ? 4 : 3;
      registry.zones[zoneId] = []; conditions.zones[zoneId] = { untouchedOldWeather: true };
      for (let index = 0; index < count; index++) {
        const part = { partId: `EPOCH-PART-${String(++number).padStart(3, '0')}`, zoneId, parentZoneId: zoneId,
          landPoint: [7.99, 55], waterPoint: [8, 55], onshoreDirectionDeg: 90 };
        registry.zones[zoneId].push(structuredClone(part));
        const identity = staging.coastalPointStageIdentity(part);
        const state = pipeline.buildIntegratedRavScoreStateSeries(samples, {
          samplingContextKey: identity.samplingContextKey, onshoreDirectionDeg: 90 }).continuationState;
        const companion = candidatePipeline.buildCandidateGDerivedStateSeries(samples, {
          stateKey: identity.expectedCandidateGStateKey }).continuationState;
        conditions.coastalParts.parts[part.partId] = { ...part, ravScoreModel: { currentState: state } };
        conditions.ravScoreCandidateGRollback.runtime.parts[part.partId] = { ravScoreModel: { currentState: companion } };
      }
    }
    assert.equal(number, 673);
    const detailsBytes = Buffer.from(JSON.stringify({ controlledOldPublicFile: 'public-condition-details.json' }) + '\n');
    const packBytes = Buffer.from('Controlled unchanged old public pack bytes'), marker = { schemaVersion: 1,
      datasetId: conditions.datasetId, productionReferenceAt: reference, publicWeatherUnchanged: true,
      sourceDetailsSha256: hash(detailsBytes), modelBinding: ib };
    conditions.publicHourDelivery = marker;
    const oldSource = path.join(root, 'original-conditions.json'), oldCheckpoint = path.join(root, 'original-S.json');
    await exclusiveJson(oldSource, conditions);
    await checkpoint.saveRavScoreContinuationCheckpoint({ sourcePath: oldSource, checkpointPath: oldCheckpoint });
    const originalCheckpointPayload = JSON.parse(await fs.readFile(oldCheckpoint, 'utf8'));
    const originalFileDigests = [{ relativePath: 'data/live/conditions.json', bytes: (await fs.stat(oldSource)).size,
      sha256: hash(await fs.readFile(oldSource)) }, { relativePath: '.cache/public-hour-delivery.pack',
      bytes: packBytes.length, sha256: hash(packBytes) }];
    const raw = Buffer.from(JSON.stringify({ conditions, publicPackBase64: packBytes.toString('base64'), originalFileDigests }));
    const object = { index: 0, objectPath: `bundles/sha256/${hash(raw)}/part-000-${hash(raw)}.json.gz.part`,
      objectBytes: raw.length, objectSha256: hash(raw) };
    const description = { kind: OLD.sourceDescriptionKind, schemaVersion: OLD.sourceDescriptionSchemaVersion,
      sourceHead: '044d3045fecc2e70d6f35f60010921c6bd597ecc', datasetId: conditions.datasetId,
      productionReferenceAt: reference, generatedAt: reference, bundleContentSha256: hash(raw),
      modelBinding: ib, contractHashes: OLD.sourceContractHashes, expectedZoneCount: 210, expectedPartCount: 673 };
    const publicPackReference = { archivedWithinOriginalBundle: true, relativePath: '.cache/public-hour-delivery.pack',
      fileSha256: hash(packBytes), bytes: packBytes.length, marker };
    const files = [{ role: 'checkpoint', relativePath: 'original-S.json', sourcePath: oldCheckpoint }];
    for (const relativePath of WEATHER_STATE_EPOCH_PUBLIC_FILES) {
      const sourcePath = path.join(root, relativePath);
      await exclusiveJson(sourcePath, relativePath === 'manifest.json'
        ? { datasetId: conditions.datasetId, productionReferenceAt: reference,
          publicConditionDetailsSha256: hash(detailsBytes), publicConditionDetailsBytes: detailsBytes.length,
          ravScoreModelBinding: ib } : { controlledOldPublicFile: relativePath });
      files.push({ role: 'public-snapshot', relativePath, sourcePath });
    }
    const originals = { originalConditions: conditions, originalCheckpointPayload, originalDescription: description,
      checkpointVersion: 9, publicPackReference, originalFileDigests, files,
      originalPointerRow: { document_key: 'ravscore-private-production-runtime-pointer', version: 7,
        payload: { current: { ...description, objects: [object], objectBytes: raw.length, objectSha256: hash(raw) }, previous: null } },
      originalCheckpointRow: { document_key: 'ravscore-continuation-checkpoint', version: 9, payload: originalCheckpointPayload } };
    const originalHashes = await Promise.all([oldSource, ...files.map(row => row.sourcePath)].map(async file => [file, hash(await fs.readFile(file))]));
    let validated = 0, sourceReads = 0;
    const verifyOriginalSnapshot = async ({ captureFiles, archivedFiles }) => {
      assert.equal(captureFiles.length, 1);
      const bytes = await fs.readFile(captureFiles[0].sourcePath);
      assert.deepEqual(bytes, raw);
      const parsed = JSON.parse(bytes);
      assert.deepEqual(parsed.conditions, conditions);
      assert.deepEqual(Buffer.from(parsed.publicPackBase64, 'base64'), packBytes);
      const source = archivedFiles?.find(row => row.relativePath === 'original-S.json')?.sourcePath ?? oldCheckpoint;
      const loaded = await checkpoint.loadRavScoreContinuationCheckpointForTarget({ checkpointPath: source, targetReference: time(10) });
      assert.equal(loaded.loaded, true); assert.equal(loaded.partCount, 673);
      for (const [partId, part] of Object.entries(parsed.conditions.coastalParts.parts)) {
        const identity = staging.coastalPointStageIdentity(part);
        staging.assertIntegratedCoastalPointContinuation(part.ravScoreModel.currentState, {
          samplingContextKey: identity.samplingContextKey });
        staging.assertCandidateGCoastalPointRollbackContinuation(
          parsed.conditions.ravScoreCandidateGRollback.runtime.parts[partId].ravScoreModel.currentState,
          identity.expectedCandidateGStateKey);
        assert.deepEqual(loaded.states[partId], part.ravScoreModel.currentState);
      }
      validated++;
      return { ...originals, files: archivedFiles ?? files };
    };
    const stored = new Map([[object.objectPath, raw]]), storage = {
      async ensurePrivateBucket() {},
      async uploadImmutable(name, bytes) { assert(!stored.has(name)); stored.set(name, Buffer.from(bytes)); },
      async download(name) { if (name === object.objectPath) sourceReads++;
        assert(stored.has(name)); return Buffer.from(stored.get(name)); },
      async anonymousStatus() { return 403; },
    };
    const archiveRoot = path.join(root, 'owned-archive');
    const capture = await createWeatherStateEpochCaptureStorage({ storage, captureRoot: archiveRoot, objects: [object] });
    assert.deepEqual(await capture.storage.download(object.objectPath), raw);
    const archive = await saveWeatherStateEpochArchive({ capture: capture.capture, storage,
      targetReferenceAt: time(10), verifyOriginalSnapshot });
    const archived = assertVerifiedWeatherStateEpochArchive(archive);
    const view = await createWeatherStateEpochInputView({ archive, registry, targetReferenceAt: time(10) });
    const freshArchive = await rehydrateLocalWeatherStateEpochArchive({ archiveRoot,
      archiveId: archived.archiveId, archiveCatalogSha256: archived.archiveCatalogSha256,
      targetReferenceAt: time(10), verifyOriginalSnapshot });
    const freshView = await createWeatherStateEpochInputView({ archive: freshArchive, registry, targetReferenceAt: time(10) });
    assert.equal(assertWeatherStateEpochInputViewForTarget(view, { registry, targetReferenceAt: time(10) }), view);
    assert.throws(() => assertWeatherStateEpochInputViewForTarget(view, { registry, targetReferenceAt: time(11) }), /TARGET_MISMATCH/);
    assert.throws(() => assertWeatherStateEpochInputViewForTarget(view, { registry,
      targetReferenceAt: time(10).replace('.000Z', 'Z') }), /TARGET_INVALID/);
    const callerRegistry = structuredClone(registry);
    callerRegistry.zones['EPOCH-ZONE-0'][0].waterPoint[0] += 0.001;
    assert.throws(() => assertWeatherStateEpochInputViewForTarget(view, {
      registry: callerRegistry, targetReferenceAt: time(10) }), /REGISTRY_MISMATCH/);
    assert.throws(() => assertWeatherStateEpochInputViewForTarget(view, {
      registry, targetReferenceAt: time(10), admission: true }), /ARGUMENTS_INVALID/);
    assert.notEqual(freshArchive, archive); assert.notEqual(freshView, view);
    assert.deepEqual(weatherStateEpochInputViewFacts(freshView), weatherStateEpochInputViewFacts(view));
    assert.equal(view.weatherContinuityBaseline, conditions);
    assert.equal(view.publicPackReference, archived.publicPackReference);
    assert.deepEqual(view.weatherContinuityBaseline, parsedJson(raw).conditions);
    assert.equal(Object.keys(view.plannerConditions.coastalParts.parts).length, 0);
    assert.deepEqual(view.plannerConditions.coastalParts.modelBinding, ravScoreModelBinding());
    assert.equal(view.scoringPreviousCoastalParts, null); assert.equal(view.scoringCandidateRuntime, null);
    assert.equal(view.scoringDeployedBulkCache, null); assert.equal(view.scoringHistoricalDmiBulkCache, null);
    assert.equal(view.scoringArchivedRecoverySources.length, 0);
    assert.equal(view.facts.initialIntegratedStateCount, 0); assert.equal(view.facts.initialCandidateStateCount, 0);
    assert.equal(view.facts.syntheticHistoryAllowed, false); assert.equal(view.facts.weatherNoLossRequired, true);
    assert.equal(view.facts.oldDecoderAllowed, false); assert.equal(view.admission, 'NO_ADMISSION');
    assert.throws(() => view.scoringPersistedDmiPartRows.set('old', {}), /VIEW_MUTATION/);
    assert.throws(() => { view.weatherContinuityBaseline.coastalParts.parts = {}; }, TypeError);
    assert.throws(() => assertWeatherStateEpochInputView(structuredClone({ ...view,
      scoringPersistedDmiPartRows: new Map() })), /UNVERIFIED_VIEW/);
    await assert.rejects(createWeatherStateEpochInputView({ archive, registry, targetReferenceAt: time(11) }), /TARGET_MISMATCH/);
    await assert.rejects(createWeatherStateEpochInputView({ archive, registry,
      targetReferenceAt: time(10).replace('.000Z', 'Z') }), /TARGET_INVALID/);
    const changed = structuredClone(registry); changed.zones['EPOCH-ZONE-0'][0].partId = 'OTHER-PART';
    await assert.rejects(createWeatherStateEpochInputView({ archive, registry: changed, targetReferenceAt: time(10) }), /INPUT_MISMATCH/);
    const remembered = registry.zones['EPOCH-ZONE-0'][0].waterPoint[0];
    registry.zones['EPOCH-ZONE-0'][0].waterPoint[0] = remembered + 0.001;
    assert.throws(() => assertWeatherStateEpochInputView(view), /VIEW_CHANGED/);
    registry.zones['EPOCH-ZONE-0'][0].waterPoint[0] = remembered;
    assert.equal(assertWeatherStateEpochInputView(view), view);
    assert.equal(validated, 4); assert.equal(sourceReads, 1);
    for (const [file, original] of originalHashes) assert.equal(hash(await fs.readFile(file)), original);
    return { view, registry };
  });
}
const parsedJson = bytes => JSON.parse(bytes.toString('utf8'));

test('a JSON archive marker or a serialized view cannot omit actual old initialization', async () => {
  await assert.rejects(createWeatherStateEpochInputView({ archive: { verified: true,
    kind: 'VERIFIED_WEATHER_STATE_EPOCH_ARCHIVE' }, targetReferenceAt: time(10), registry: {} }));
  await assert.rejects(createWeatherStateEpochInputView({ archive: {}, targetReferenceAt: time(10),
    registry: {}, verifyArchive: () => true }), /WEATHER_STATE_EPOCH_ARGUMENTS_INVALID/);
  assert.throws(() => assertWeatherStateEpochInputView({ kind: 'WEATHER_STATE_EPOCH_INPUT_VIEW',
    admission: 'NO_ADMISSION' }), /WEATHER_STATE_EPOCH_UNVERIFIED_VIEW/);
  assert.throws(() => weatherStateEpochInputViewFacts({ viewSha256: 'a'.repeat(64) }),
    /WEATHER_STATE_EPOCH_UNVERIFIED_VIEW/);
  assert.throws(() => assertWeatherStateEpochInputViewForTarget({}, { registry: {}, targetReferenceAt: time(10) }),
    /WEATHER_STATE_EPOCH_UNVERIFIED_VIEW/);
});

test('normal strict NEW673 cold warmup saves and loads, then673 ordinary followers continue without a cold flag', async t => {
  const root = await ownedTemporary(t), { view, registry } = await archivedOldView(root);
  const makeRows = await syntheticNewFactory();
  const count = 673, inputs = new Map();
  const document = { datasetId: 'rr-synthetic-epoch-first', productionReferenceAt: time(10),
    coastalParts: { parts: {} }, ravScoreCandidateGWarmup: {
      schemaVersion: '1.0.0', kind: 'PRIVATE_CANDIDATE_G_MEASURED_WARMUP_RUNTIME',
      privacyClass: 'PRIVATE_PRODUCTION_RUNTIME', status: 'BUILDING_MEASURED_ONLY', evidencePolicy: 'MEASURED_ONLY',
      syntheticHistoryAllowed: false, sourceModelBinding: ravScoreModelBinding(), candidateModelBinding: candidateBinding(),
      automaticActivationAllowed: false, publicDuringNormalOperation: false,
      runtime: { schemaVersion: 1, enabled: true, status: 'BUILDING_MEASURED_ONLY', generatedAt: time(10),
        modelBinding: candidateBinding(), expectedPartCount: count, measuredPartCount: count, parts: {} },
    } };
  for (const part of Object.values(registry.zones).flat()) {
    const zone = { id: part.zoneId, onshoreDirectionDeg: 90 }, rows = makeRows(part);
    const initialSelection = selectRavScoreProductionInitialState({ part, existingPart: null,
      checkpointStates: view.checkpointStates, pointStateInjections: {}, targetReferenceAt: view.targetReferenceAt,
      candidateGBootstrapMode: view.candidateGBootstrapMode,
      candidateGSourceValidated: view.candidateGSourceValidated });
    assert.equal(initialSelection.source, 'COLD_START');
    const initial = buildRavScoreProductionPartSeries({ part, zone, initialSelection,
      targetReferenceAt: time(10), recoverySources: [{ source: 'synthetic-own-new-native',
        record: { point: part.waterPoint, hourly: rows.slice(0, 10) } }],
      publicHourly: [rows[10]], requireNativeGridSampling: true, candidateGRollbackMeasuredColdStart: true });
    assert.equal(initial.recovery.coldStartBootstrapApplied, false, 'Ten hours must never pretend a complete48h replay');
    assert.equal(initial.recovery.coldStartHistoryLineage.completeCausalPositionCount, 10);
    assert.equal(initial.recovery.coldStartHistoryLineage.boundedUnknownPositionCount, 38);
    assert.equal(initial.candidateGState.initialStateSource, 'VERIFIED_MEASURED_COLD_START');
    assert.equal(initial.candidateGState.continuationState.transportMemoryReady, false);
    document.coastalParts.parts[part.partId] = { ...part,
      ravScoreModel: { currentState: initial.ravScoreState.continuationState } };
    document.ravScoreCandidateGWarmup.runtime.parts[part.partId] = {
      ravScoreModel: { currentState: initial.candidateGState.continuationState } };
    inputs.set(part.partId, { part, zone, rows });
  }
  const sourcePath = path.join(root, 'source.json'), checkpointPath = path.join(root, 'checkpoint.json');
  await exclusiveJson(sourcePath, document);
  const sourceHash = hash(await fs.readFile(sourcePath));
  const saved = await saveRavScoreContinuationCheckpoint({ sourcePath, checkpointPath });
  assert.equal(saved.partCount, count);
  const checkpointHash = hash(await fs.readFile(checkpointPath));
  const loaded = await loadRavScoreContinuationCheckpointForTarget({ checkpointPath, targetReference: time(11) });
  assert.equal(loaded.loaded, true); assert.equal(loaded.continuationAvailable, true); assert.equal(loaded.partCount, count);
  let followed = 0;
  for (const [partId, { part, zone, rows }] of inputs) {
    // Actual normally loaded NEW states, ordinary selector defaults, no cold
    // flag/OLD decoder/archive. This is a kernel proof, not a protected B restore.
    const initialSelection = selectRavScoreProductionInitialState({ part, existingPart: null,
      checkpointStates: loaded.states, pointStateInjections: {}, targetReferenceAt: time(11) });
    assert.equal(initialSelection.source, 'INTEGRATED_CHECKPOINT');
    assert.deepEqual(initialSelection.state, loaded.states[partId]);
    const companion = selectCoastalPointCandidateGRollbackContinuation({ partId, part, initialSelection,
      checkpointCandidateGContinuation: loaded.candidateGRollbackStates[partId], targetReferenceAt: time(11) });
    assert.equal(companion.source, 'CHECKPOINT_COMPANION');
    const next = buildRavScoreProductionPartSeries({ part, zone, initialSelection,
      previousCandidateGContinuation: companion.state,
      candidateGRollbackMeasuredWarmupContinuation: companion.state.transportMemoryReady === false,
      targetReferenceAt: time(11), recoverySources: [{ source: 'synthetic-own-new-native',
        record: { point: part.waterPoint, hourly: rows.slice(0, 11) } }],
      publicHourly: [rows[11]], requireNativeGridSampling: true });
    assert.equal(next.recovery.coldStartBootstrapApplied, false);
    assert.equal(next.recovery.coldStartHistoryLineage, null);
    assert.equal(next.ravScoreState.initialStateAccepted, true);
    assert.equal(next.candidateGState.initialStateAccepted, true);
    assert.equal(next.candidateGState.initialStateResetReason, null);
    assert.equal(next.candidateGState.initialStateSource, 'PREVIOUS_PRIVATE_ROLLBACK');
    assert.equal(next.ravScoreState.continuationState.time, time(11));
    assert.equal(next.candidateGState.continuationState.time, time(11));
    assert.equal(next.candidateGState.continuationState.transportMemoryReady, false);
    followed++;
  }
  assert.equal(followed, count);
  assert.equal(hash(await fs.readFile(sourcePath)), sourceHash);
  assert.equal(hash(await fs.readFile(checkpointPath)), checkpointHash);
});
