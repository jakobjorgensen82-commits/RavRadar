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

async function syntheticNewFactory(readSource = file => fs.readFile(file, 'utf8')) {
  // Reuse the existing actual normal synthetic weather/capture shape rather
  // than copy a fixture bank or replace any production validator. Source pins
  // bind exact Git/LF text; Windows checkout CRLF is the only normalization.
  const source = (await readSource(path.join(ROOT, 'scripts/test-ravscore-recovery-replay.mjs'))).replace(/\r\n/g, '\n');
  const start = 'const dmiContracts = {', end = 'function withoutCurrent(row) {';
  assert.equal(source.split(start).length, 2); assert.equal(source.split(end).length, 2);
  const factory = source.slice(source.indexOf(start), source.indexOf(end));
  assert.equal(hash(factory), '5156520eebeed36b729fb332d56eb885fe7543cb12b9ddb40b31e9946efef97f');
  const weather = new Function('part', 'time', 'HOUR_MS', 'vectorSelection', 'sha', factory + '\nreturn weather;');
  const samplingSource = (await readSource(path.join(ROOT, 'scripts/test-protected-dmi-native-current-proofs.mjs'))).replace(/\r\n/g, '\n');
  const samplingStart = '  const sampling = source => ({', samplingEnd = '\n  const withWeather = row =>';
  assert.equal(samplingSource.split(samplingStart).length, 2);
  assert.equal(samplingSource.split(samplingEnd).length, 2);
  const samplingFactory = samplingSource.slice(samplingSource.indexOf(samplingStart), samplingSource.indexOf(samplingEnd));
  assert.equal(hash(samplingFactory), '2d81802ce221adfe65bcb1db37c8c0071cd2ab0c089478ebe2629081cbde48fa');
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
async function ownedTemporary(t, prefix = 'rr-weather-epoch-input-') {
  const parent = await fs.realpath(os.tmpdir());
  const root = await fs.mkdtemp(path.join(parent, prefix));
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
async function archivedOldView(root, componentFixture = null, targetAt = null) {
  const epochBase = targetAt === null ? base : Date.parse(targetAt) - 10 * HOUR_MS;
  assert(Number.isFinite(epochBase));
  const time = hour => new Date(epochBase + hour * HOUR_MS).toISOString();
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
    if (componentFixture) conditions.weatherComponentInputs = componentFixture.marker;
    const oldSource = path.join(root, 'original-conditions.json'), oldCheckpoint = path.join(root, 'original-S.json');
    await exclusiveJson(oldSource, conditions);
    await checkpoint.saveRavScoreContinuationCheckpoint({ sourcePath: oldSource, checkpointPath: oldCheckpoint });
    const originalCheckpointPayload = JSON.parse(await fs.readFile(oldCheckpoint, 'utf8'));
    const originalFileDigests = [{ relativePath: 'data/live/conditions.json', bytes: (await fs.stat(oldSource)).size,
      sha256: hash(await fs.readFile(oldSource)) }, { relativePath: '.cache/public-hour-delivery.pack',
      bytes: packBytes.length, sha256: hash(packBytes) }];
    const componentBytes = componentFixture ? await fs.readFile(componentFixture.descriptor.sourcePath) : null;
    if (componentBytes) originalFileDigests.push({
      relativePath: '.cache/weather-component-inputs.pack',
      bytes: componentBytes.length, sha256: hash(componentBytes),
    });
    const raw = Buffer.from(JSON.stringify({ conditions, publicPackBase64: packBytes.toString('base64'), originalFileDigests,
      ...(componentBytes ? { componentPackBase64: componentBytes.toString('base64') } : {}) }));
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
      if (componentBytes) {
        assert.deepEqual(Buffer.from(parsed.componentPackBase64, 'base64'), componentBytes);
        assert.deepEqual(await fs.readFile(componentFixture.descriptor.sourcePath), componentBytes);
      }
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

test('normal synthetic NEW source pins accept Git LF and checkout CRLF only, retaining mutation refusals', async () => {
  const readLF = async file => (await fs.readFile(file, 'utf8')).replace(/\r\n/g, '\n');
  const part = { partId: 'SYNTHETIC-RECOVERY-PART', parentZoneId: 'SYNTHETIC-RECOVERY-ZONE',
    zoneId: 'SYNTHETIC-RECOVERY-ZONE', waterPoint: [8, 55], onshoreDirectionDeg: 90 };
  const lf = (await syntheticNewFactory(readLF))(part);
  const crlf = (await syntheticNewFactory(async file => (await readLF(file)).replace(/\n/g, '\r\n')))(part);
  assert.deepEqual(crlf, lf);
  assert.equal(lf.length, 12);
  for (const [basename, boundary] of [
    ['test-ravscore-recovery-replay.mjs', 'const dmiContracts = {'],
    ['test-protected-dmi-native-current-proofs.mjs', '  const sampling = source => ({'],
  ]) {
    await assert.rejects(syntheticNewFactory(async file => {
      const source = await readLF(file);
      return path.basename(file) === basename ? source.replace(boundary, boundary + ' ') : source;
    }), { code: 'ERR_ASSERTION' }, 'A non-line-ending source change must retain the exact hash refusal');
    await assert.rejects(syntheticNewFactory(async file => {
      const source = await readLF(file);
      return path.basename(file) === basename ? source.replace(boundary + '\n', boundary + '\r') : source;
    }), { code: 'ERR_ASSERTION' }, 'A lone CR is not a permitted checkout line ending');
  }
});

test('epoch active persistence: genuine archive-bound install, normal SAVE and ordinary restore', async t => {
  const { buildPrivateWeatherComponentPack } = await import('./lib/private-weather-component-pack.mjs');
  const { installRestoredPrivateRuntime, buildPrivateRuntimeCreateSpec, PRIVATE_RUNTIME_CONTRACT_FILES } =
    await import('./private-production-runtime-workflow.mjs');
  const { PRIVATE_RUNTIME_BASE_FILES: baseFiles, PRIVATE_WEATHER_COMPONENT_FILES: component,
    PRIVATE_WEATHER_COMPONENT_PACK_FILE: packFile } = await import('./lib/private-weather-component-inventory.mjs');
  const { execFile } = await import('node:child_process'), { promisify } = await import('node:util');
  const exec = promisify(execFile), root = await ownedTemporary(t, 'rr-progress-original-target-');
  async function write(folder, relative, bytes) {
    const file = path.join(folder, relative);
    await fs.mkdir(path.dirname(file), { recursive: true });
    await fs.writeFile(file, bytes, { flag: 'wx', mode: 0o600 });
  }
  const exists = file => fs.lstat(file).then(() => true, error => {
    if (error.code === 'ENOENT') return false; throw error;
  });
  const bytes = value => Buffer.from(JSON.stringify(value) + '\n');
  const oldActive = bytes({ syntheticNumericOriginal: 'OLD-ACTIVE', currentU: 0.04, scalar: 8 });
  const oldCandidate = bytes({ syntheticNumericOriginal: 'OLD-CANDIDATE', currentU: 0.03, scalar: 9 });
  const selection = bytes({ preservedScalarSelection: true });
  const marker = { schemaVersion: 1, kind: 'PRIVATE_WEATHER_COMPONENT_INPUTS',
    sourceSelectionApplied: true, openMeteoBankSha256: null, copernicusBankSha256: null,
    selectedComponentsSha256: hash(selection) };
  const packSource = path.join(root, 'pack-source'); await fs.mkdir(packSource);
  await write(packSource, component.selectedComponents, selection);
  await write(packSource, component.dmiActive, oldActive);
  await write(packSource, component.dmiCandidate, oldCandidate);
  const descriptor = await buildPrivateWeatherComponentPack({ repositoryRoot: packSource,
    conditions: { weatherComponentInputs: marker } });
  const originalPackBytes = await fs.readFile(descriptor.sourcePath);
  const { view } = await archivedOldView(root, { descriptor, marker });
  // Normal persistence fixture, NOT production/private-state admission. Full
  // OLD673/S are genuinely validated by archivedOldView. Fresh metadata here is
  // synthetic, matching the existing normal create-spec test's scope.
  const runtime = { datasetId: 'rr-synthetic-epoch-persistence', productionReferenceAt: time(10),
    generatedAt: time(10), weatherComponentInputs: marker,
    zones: Object.fromEntries(Array.from({ length: 210 }, (_, i) => ['ZONE-' + i, { scalar: 8 }])),
    coastalParts: { modelBinding: ravScoreModelBinding(),
      parts: Object.fromEntries(Array.from({ length: 673 }, (_, i) => ['PART-' + i, {}])) } };
  const source = path.join(root, 'restored-runtime'); await fs.mkdir(source);
  const baseBytes = new Map();
  for (const row of baseFiles) {
    const value = bytes(row.id === 'full-conditions' ? runtime : { originalWeather: row.id, scalar: 8 });
    await write(source, row.relativePath, value); baseBytes.set(row.relativePath, value);
  }
  await write(source, packFile.relativePath, originalPackBytes);
  const defaultRoot = path.join(root, 'normal-before'); await fs.mkdir(defaultRoot);
  const ordinary = await installRestoredPrivateRuntime({ restoredRoot: source, repositoryRoot: defaultRoot });
  assert.equal(Object.hasOwn(ordinary, 'stateEpochActiveOmitted'), false);
  assert.deepEqual(await fs.readFile(path.join(defaultRoot, component.dmiActive)), oldActive,
    'Normal installer without an epoch view restores OLD-active: the actual counterexample');
  const epoch = path.join(root, 'epoch'); await fs.mkdir(epoch);
  const installed = await installRestoredPrivateRuntime({ restoredRoot: source, repositoryRoot: epoch,
    stateEpochInputView: view });
  assert.equal(await exists(path.join(epoch, component.dmiActive)), false,
    'Epoch must not persist OLD-active into the next normal B/SAVE');
  assert.equal(installed.stateEpochActiveOmitted, true);
  assert.equal(installed.stateEpochViewSha256, view.viewSha256);
  for (const [relative, raw] of baseBytes) assert.deepEqual(await fs.readFile(path.join(epoch, relative)), raw);
  assert.deepEqual(await fs.readFile(path.join(epoch, component.dmiCandidate)), oldCandidate);
  assert.deepEqual(await fs.readFile(path.join(epoch, component.selectedComponents)), selection);
  assert.deepEqual(await fs.readFile(descriptor.sourcePath), originalPackBytes);
  // Actual create-spec packs files for B/SAVE. Its documented artificial
  // contract-hasher inputs are never production source or model admission.
  for (const file of new Set(Object.values(PRIVATE_RUNTIME_CONTRACT_FILES).flat())) {
    await write(epoch, file, file === 'scripts/lib/private-weather-storage-abi.json'
      ? await fs.readFile(path.join(ROOT, file)) : 'synthetic contract bytes\n');
  }
  const partial = bytes({ zones: {}, freshEpochCandidate: true });
  await fs.writeFile(path.join(epoch, component.dmiCandidate), partial);
  async function saveAndFollow(name) {
    const spec = await buildPrivateRuntimeCreateSpec({ repositoryRoot: epoch, dmiBulkPath: component.dmiCandidate });
    const restored = path.join(root, name + '-B'), follower = path.join(root, name + '-ordinary');
    await fs.mkdir(restored); await fs.mkdir(follower);
    for (const row of spec.files) await write(restored, row.relativePath, await fs.readFile(row.sourcePath));
    await installRestoredPrivateRuntime({ restoredRoot: restored, repositoryRoot: follower });
    return follower;
  }
  const noPromotion = await saveAndFollow('unpromoted');
  assert.equal(await exists(path.join(noPromotion, component.dmiActive)), false);
  assert.deepEqual(await fs.readFile(path.join(noPromotion, component.dmiCandidate)), partial);
  assert.deepEqual(await fs.readFile(path.join(noPromotion, 'data/live/dmi-bulk-cache.json')), partial);
  assert.deepEqual(await fs.readFile(path.join(noPromotion, 'data/live/dmi-forecast-cache.json')),
    baseBytes.get('data/live/dmi-forecast-cache.json'));
  // Genuine normal synthetic producer/ledger fixture; no invented READY flag.
  // This proves offline ledger/CLI persistence, NOT native GRIB/provider data.
  const prepared = path.join(root, 'ledger-stale'); await fs.mkdir(prepared);
  const python = process.env.PYTHON ?? 'python';
  const env = Object.fromEntries(Object.entries(process.env).filter(([key]) =>
    ['PATH', 'SYSTEMROOT', 'WINDIR', 'TEMP', 'TMP', 'TMPDIR', 'COMSPEC', 'PATHEXT',
      'LANG', 'LC_ALL', 'LC_CTYPE', 'TZ'].includes(key.toUpperCase())));
  Object.assign(env, { PYTHONUTF8: '1', PYTHON: python });
  const childOptions = { env, windowsHide: true, timeout: 30_000, maxBuffer: 1024 * 1024 };
  await exec(python, ['-B', path.join(ROOT, 'scripts/test-copernicus-target-registry-4.0.244.py'),
    '--prepare-progress-target-fixture', prepared, time(10).replace('.000Z', 'Z')], childOptions);
  const ready = await exec(python, ['-B', path.join(ROOT, 'scripts/check-dmi-bulk-operational-ready.py'),
    '--cache', path.join(prepared, 'dmi.json')], childOptions);
  assert.equal(ready.stdout.trim(), time(10).replace('.000Z', 'Z'));
  await exec(python, ['-B', path.join(ROOT, 'scripts/build-copernicus-target-registry.py'),
    '--require-strict-dmi-ledger', '--targets', path.join(prepared, 'targets.json'),
    '--dmi', path.join(prepared, 'dmi.json'), '--output', path.join(prepared, 'strict.json'),
    '--at', time(10)], childOptions);
  const readyBytes = await fs.readFile(path.join(prepared, 'dmi.json'));
  await fs.writeFile(path.join(epoch, component.dmiCandidate), readyBytes);
  // Same strict snapshot copy, AFTER both normal validators. No claim that the
  // synthetic fixture ran a provider's promotion; the workflow still requires it.
  await fs.copyFile(path.join(prepared, 'dmi.json'), path.join(epoch, component.dmiActive), fs.constants.COPYFILE_EXCL);
  const promoted = await saveAndFollow('ready-snapshot');
  assert.deepEqual(await fs.readFile(path.join(promoted, component.dmiActive)), readyBytes);
  assert.deepEqual(await fs.readFile(path.join(promoted, component.dmiCandidate)), readyBytes);
  assert.notDeepEqual(readyBytes, oldActive);
  const workflow = (await fs.readFile(path.join(ROOT, '.github/workflows/reusable-weather-build.yml'), 'utf8')).replaceAll('\r\n', '\n');
  assert(workflow.includes('elif test "${{ steps.dmi-active-restore.outputs.available }}" = "true"; then\n            source_kind=active'));
  assert(workflow.includes("if: steps.preflight.outputs.should_run == 'true' && steps.dmi-terminal-gate.outputs.ready == 'true' && steps.dmi-bulk.outputs.candidate_promoted == 'true'"));
  for (const [name, candidateView] of [['forged', { ...view }], ['promised', Promise.resolve(view)]]) {
    const destination = path.join(root, name); await fs.mkdir(destination);
    await assert.rejects(installRestoredPrivateRuntime({ restoredRoot: source, repositoryRoot: destination,
      stateEpochInputView: candidateView }), /UNVERIFIED_VIEW/);
    assert.deepEqual(await fs.readdir(destination), []);
  }
  for (const variant of ['existing', 'pack-missing', 'valid-different-pack']) {
    const destination = path.join(root, variant), altered = path.join(root, variant + '-source');
    await fs.mkdir(destination); await fs.mkdir(altered);
    for (const [relative, raw] of baseBytes) await write(altered, relative, raw);
    if (variant !== 'pack-missing') await write(altered, packFile.relativePath, originalPackBytes);
    if (variant === 'existing') await write(destination, component.dmiActive, oldActive);
    if (variant === 'valid-different-pack') {
      const second = path.join(root, 'different-pack-source'); await fs.mkdir(second);
      await write(second, component.selectedComponents, selection);
      await write(second, component.dmiActive, bytes({ otherOriginal: true }));
      await buildPrivateWeatherComponentPack({ repositoryRoot: second, conditions: { weatherComponentInputs: marker } });
      await fs.copyFile(path.join(second, packFile.relativePath), path.join(altered, packFile.relativePath));
    }
    await assert.rejects(installRestoredPrivateRuntime({ restoredRoot: altered, repositoryRoot: destination,
      stateEpochInputView: view }), variant === 'existing' ? /ACTIVE_DESTINATION_EXISTS/
        : variant === 'pack-missing' ? /inputs pack is missing/ : /EPOCH_ORIGINAL_CHANGED/);
    if (variant === 'existing') assert.deepEqual(await fs.readFile(path.join(destination, component.dmiActive)), oldActive);
    assert.equal(await exists(path.join(destination, 'data/live/conditions.json')), false);
  }
  assert.deepEqual(await fs.readFile(descriptor.sourcePath), originalPackBytes);
  assert.deepEqual(await fs.readFile(path.join(source, packFile.relativePath)), originalPackBytes);
  for (const [relative, raw] of baseBytes) assert.deepEqual(await fs.readFile(path.join(source, relative)), raw);
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


test('epoch checkpoint reentry: genuine archive and GCM keep OLD active out of the working union', async t => {
  const targetAt = Math.floor(Date.now() / HOUR_MS) * HOUR_MS - HOUR_MS;
  const time = hour => new Date(targetAt + (hour - 10) * HOUR_MS).toISOString();
  const { weatherComponentProgressCache, WEATHER_PROGRESS_CIPHER_PATH } = await import('./weather-component-progress-cache.mjs');
  const { buildPrivateWeatherComponentPack } = await import('./lib/private-weather-component-pack.mjs');
  const { assertWeatherStateEpochCheckpointRequest, assertWeatherStateEpochRequest, weatherStateEpochBudgetCli } = await import('./weather-state-epoch-budget.mjs');
  const { weatherStateEpochEnvironment } = await import('./weather-state-epoch.mjs');
  const component = (await import('./lib/private-weather-component-inventory.mjs')).PRIVATE_WEATHER_COMPONENT_FILES;
  const root = await ownedTemporary(t, 'rr-progress-original-target-');
  async function write(directory, relative, bytes) {
    const file = path.join(directory, relative);
    await fs.mkdir(path.dirname(file), { recursive: true });
    await fs.writeFile(file, bytes, { flag: 'wx', mode: 0o600 });
  }
  const raw = value => Buffer.from(JSON.stringify(value) + '\n');
  const selected = raw({ syntheticSelection: true }), oldActive = raw({ syntheticOldActive: true });
  const marker = { schemaVersion: 1, kind: 'PRIVATE_WEATHER_COMPONENT_INPUTS', sourceSelectionApplied: true,
    openMeteoBankSha256: null, copernicusBankSha256: null, selectedComponentsSha256: hash(selected) };
  const source = path.join(root, 'source'); await fs.mkdir(source);
  await write(source, component.selectedComponents, selected);
  await write(source, component.dmiActive, oldActive);
  const descriptor = await buildPrivateWeatherComponentPack({ repositoryRoot: source, conditions: { weatherComponentInputs: marker } });
  const originalPack = await fs.readFile(descriptor.sourcePath);
  const { view, registry } = await archivedOldView(root, { descriptor, marker }, time(10));
  const baseline = raw({ productionReferenceAt: time(9), weatherComponentInputs: marker });
  await write(source, 'data/live/conditions.json', baseline);
  await write(source, 'data/live/coastal-parts-v2.json', raw(registry));
  const registryPath = path.join(root, 'epoch-registry.json'); await exclusiveJson(registryPath, registry);
  const ledgerRoot = path.join(root, 'ledger-stale'); await fs.mkdir(ledgerRoot);
  const factoryPath = path.join(ROOT, 'scripts/test-copernicus-target-registry-4.0.244.py');
  const factory = await fs.readFile(factoryPath, 'utf8');
  const { spawn } = await import('node:child_process');
  const environment = Object.fromEntries(Object.entries(process.env).filter(([key]) =>
    ['PATH','SYSTEMROOT','WINDIR','TEMP','TMP','TMPDIR','COMSPEC','PATHEXT','LANG','LC_ALL','LC_CTYPE','TZ'].includes(key.toUpperCase())));
  environment.PYTHONUTF8 = '1';
  // Execute the actual normal factory source through stdin so a private RAM
  // source overlay is possible on Windows. No validator/provider is replaced.
  await new Promise((resolve, reject) => {
    const child = spawn(process.env.PYTHON ?? 'python', ['-B','-','--prepare-progress-target-fixture',
      ledgerRoot, time(10).replace('.000Z','Z'), registryPath], { env:environment,windowsHide:true,stdio:['pipe','pipe','pipe'] });
    let first = null, size = 0;
    const timer = setTimeout(() => { first ??= new Error('TEST_REAL_LEDGER_FACTORY_TIMEOUT');child.kill('SIGKILL'); },30000);
    for (const stream of [child.stdout, child.stderr]) stream.on('data', chunk => { size += chunk.length;
      if(size > 1024 * 1024){first ??= new Error('TEST_REAL_LEDGER_FACTORY_OUTPUT_LIMIT');child.kill('SIGKILL');} });
    child.on('error', error => { first ??= error; }); child.stdin.on('error', error => { first ??= error; });
    child.once('close', (code,signal) => { clearTimeout(timer);
      if(first !== null)reject(first);else if(code!==0||signal!==null)reject(new Error('TEST_REAL_LEDGER_FACTORY_REJECTED'));else resolve(); });
    child.stdin.end('import sys\nsys.path.insert(0,'+JSON.stringify(path.join(ROOT,'scripts'))+')\n__file__='+JSON.stringify(factoryPath)+'\nexec(compile('+JSON.stringify(factory)+',__file__,"exec"))');
  });
  const candidate = await fs.readFile(path.join(ledgerRoot, 'dmi.json'));
  assert.equal(JSON.parse(candidate).diagnostics.currentOperationalLedger.productionReferenceAt, time(10).replace('.000Z','Z'));
  await write(source, component.dmiCandidate, candidate);
  const encryptionKey = Buffer.alloc(32, 93).toString('base64'), repository = 'owner/epoch-reentry';
  const common = { repository, encryptionKey, protectedBundleSha256: view.facts.originalDescription.bundleContentSha256,
    productionReferenceAt: time(10) };
  const sourceBase = path.join(root, 'source-base.json');
  assert.equal((await weatherComponentProgressCache({ ...common, mode: 'capture-base', repositoryRoot: source, basePath: sourceBase })).captured, true);
  assert.equal((await weatherComponentProgressCache({ ...common, mode: 'save', repositoryRoot: source, basePath: sourceBase })).saved, true);
  const cipher = await fs.readFile(path.join(source, WEATHER_PROGRESS_CIPHER_PATH));
  let count = 0;
  async function destination() {
    const target = path.join(root, 'target-' + (++count)); await fs.mkdir(target);
    await write(target, 'data/live/conditions.json', baseline);
    await write(target, 'data/live/coastal-parts-v2.json', raw(registry));
    await write(target, '.cache/weather-component-inputs.pack', originalPack);
    await write(target, component.selectedComponents, selected);
    await write(target, WEATHER_PROGRESS_CIPHER_PATH, cipher);
    const basePath = path.join(root, 'target-base-' + count + '.json');
    assert.equal((await weatherComponentProgressCache({ ...common, mode: 'capture-base', repositoryRoot: target, basePath })).captured, true);
    return { target, basePath };
  }
  async function restore(f, epoch = true, changes = {}) {
    return weatherComponentProgressCache({ ...common, mode: 'restore', repositoryRoot: f.target, basePath: f.basePath,
      resumeOriginalTarget:true,
      ...(epoch ? { stateEpochInputView: view, epochOriginalRoot: source } : {}), ...changes });
  }
  const ordinary = await destination();
  assert.equal((await restore(ordinary, false)).restored, true);
  assert.deepEqual(await fs.readFile(path.join(ordinary.target, component.dmiActive)), oldActive,
    'RED counterexample: ordinary authenticated GCM reintroduces OLD-active');
  const good = await destination();
  const restored = await restore(good);
  assert.equal(restored.status, 'RESTORED'); assert.equal(restored.restored, true);
  assert.equal(restored.restoredProductionReferenceAt,time(10));
  assert.match(restored.restoredOriginalTargetSha256,/^[a-f0-9]{64}$/);
  await assert.rejects(fs.lstat(path.join(good.target, component.dmiActive)), { code: 'ENOENT' });
  assert.deepEqual(await fs.readFile(path.join(good.target, component.selectedComponents)), selected);
  assert.deepEqual(await fs.readFile(descriptor.sourcePath), originalPack);
  assert.deepEqual(await fs.readFile(path.join(source, WEATHER_PROGRESS_CIPHER_PATH)), cipher);
  const changed = await destination();
  const altered = Buffer.from(originalPack); altered[altered.length - 1] ^= 1;
  await fs.writeFile(descriptor.sourcePath, altered);
  assert.equal((await restore(changed)).code, 'EPOCH_ORIGINAL_PACK_CHANGED');
  await assert.rejects(fs.lstat(path.join(changed.target, component.dmiActive)), { code: 'ENOENT' });
  await fs.writeFile(descriptor.sourcePath, originalPack);
  const occupied = await destination(); await write(occupied.target, component.dmiActive, oldActive);
  assert.equal((await restore(occupied)).code, 'EPOCH_ACTIVE_DESTINATION_EXISTS');
  assert.deepEqual(await fs.readFile(path.join(occupied.target, component.dmiActive)), oldActive);
  const badGcm = await destination(); const damaged = Buffer.from(cipher); damaged[damaged.length - 1] ^= 1;
  await fs.writeFile(path.join(badGcm.target, WEATHER_PROGRESS_CIPHER_PATH), damaged);
  assert.equal((await restore(badGcm)).code, 'SNAPSHOT_AUTHENTICATION_FAILED');
  const forged = await destination(); assert.equal((await restore(forged, true, { stateEpochInputView: { ...view } })).restored, false);
  const wrongTarget = await destination(); assert.equal((await restore(wrongTarget, true, { productionReferenceAt: time(11) })).restored, false);
  const wrongRegistry = await destination(); const foreign = structuredClone(registry); foreign.zones['EPOCH-ZONE-0'][0].waterPoint[0] += 0.1;
  await fs.writeFile(path.join(wrongRegistry.target, 'data/live/coastal-parts-v2.json'), raw(foreign));
  assert.equal((await restore(wrongRegistry)).restored, false);
  const request = { RAVRADAR_WEATHER_STATE_EPOCH_BOOTSTRAP: 'true', RAVRADAR_WEATHER_STATE_EPOCH_CHECKPOINT_REENTRY: 'true',
    GITHUB_EVENT_NAME: 'workflow_dispatch', GITHUB_REF: 'refs/heads/main', GITHUB_RUN_ATTEMPT: '1',
    GITHUB_RUN_ID: '12345', GITHUB_SHA: 'a'.repeat(40), QUICK_CONFIRMATION: 'false', CHECKPOINT_ONLY: 'true',
    QUICK_PROGRESS_SOURCE: '12344-1', CHECKPOINT_TARGET_HOUR: time(10).replace('.000Z','Z'),
    RAVRADAR_PRODUCTION_TARGET_HOUR: time(10), NATIVE_IDENTITY_RECOVERY: 'false',
    RAVRADAR_WEATHER_STATE_EPOCH_ARCHIVE_ID: view.facts.archiveId,
    RAVRADAR_WEATHER_STATE_EPOCH_ARCHIVE_CATALOG_SHA256: view.facts.archiveCatalogSha256,
    RAVRADAR_WEATHER_STATE_EPOCH_RAW_CACHE_KEY: 'dmi-grib-v4-Linux-2026-W42-12344-1' };
  assert.doesNotThrow(() => assertWeatherStateEpochCheckpointRequest(request));
  assert.equal(weatherStateEpochEnvironment(request).targetReferenceAt, time(10));
  assert.throws(() => assertWeatherStateEpochRequest(request));
  for (const patch of [{ CHECKPOINT_ONLY: 'false' }, { QUICK_PROGRESS_SOURCE: 'protected-current' },
    { RAVRADAR_WEATHER_STATE_EPOCH_ARCHIVE_ID: '' }, { EXTENDED_BOOTSTRAP: 'true' },
    { CHECKPOINT_TARGET_HOUR: time(11).replace('.000Z','Z') },
    { RAVRADAR_WEATHER_STATE_EPOCH_RAW_CACHE_KEY: 'dmi-grib-v4-Linux-2026-W42-12343-1' }])
    assert.throws(() => assertWeatherStateEpochCheckpointRequest({ ...request, ...patch }));
  const clock = path.join(root,'weather-state-epoch-job-start-ms.txt');
  await fs.writeFile(clock,String(Date.now()-60*60000)+'\n',{flag:'wx',mode:0o600});
  for(const phase of ['dmi','copernicus','open-meteo','weather']) {
    const budget = await weatherStateEpochBudgetCli([phase],{...request,RUNNER_TEMP:root});
    assert.equal(budget.phase,phase);assert.equal(budget.requiredMinutes,180);assert.equal(budget.checkpointOnly,true);
  }
  await assert.rejects(weatherStateEpochBudgetCli(['dmi'],{...request,RUNNER_TEMP:root,RAVRADAR_WEATHER_STATE_EPOCH_CHECKPOINT_REENTRY:'false'}),/POSTPROCESSING_RESERVE_EXHAUSTED/);
  // Real GCM/pack/union and genuine synthetic archive/view above. No provider,
  // installed SQL, real producer B/S or deploy claim. The normal originaltarget
  // ledger/candidate validator subprocess DID run on the synthetic673 registry.
});
