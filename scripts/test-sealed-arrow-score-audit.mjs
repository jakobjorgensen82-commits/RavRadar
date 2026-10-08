import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { pathToFileURL } from 'node:url';
import test from 'node:test';
await import('./test-sealed-arrow-score-persistence.mjs');
import { spawnSync } from 'node:child_process';
import { SEALED_ARROW_SCORE_TARGET as target, validateSealedArrowScoreTarget,
  measureArrowScorePart, originalArrowScoreReaders, originalArrowScoreExpectation,
  inspectSealedArrowScores } from './audit-sealed-arrow-score.mjs';
import { withoutSavedAuditSecrets } from './audit-saved-weather-inputs.mjs';
import { PRIVATE_RUNTIME_BASE_FILES } from './lib/private-weather-component-inventory.mjs';
import * as adapters from './lib/ravscore-production-adapters.mjs';
import { buildCurrentSupplyMemory, currentSupplyStrength } from '../js/core/ravscore-current-supply-memory.js';
import { buildDmiForecastHourly, DMI_FORECAST_HOURS } from './lib/dmi-forecast-store.mjs';
import { createCurrentArrowLandMask } from '../js/map/current-arrow-land-mask.js';
import { measureSavedCurrentSelection, selectSavedCandidateRoot,
  validateSavedCandidateState } from './lib/sealed-arrow-score-selection.mjs';
import { savedPrivateScoreRows, readSavedPublicScoreRows } from './lib/sealed-arrow-score-hours.mjs';

async function checkSavedHourStorage(readers) {
  const folder = await fs.mkdtemp(path.join(os.tmpdir(), 'rr-saved-score-hours-test-'));
  try {
    const payload = path.join(folder, 'payload'), live = path.join(folder, 'live');
    await fs.mkdir(path.join(live, 'forecast'), { recursive: true });
    const { modelBinding } = await originalArrowScoreExpectation(readers);
    const datasetId = 'synthetic-saved-score-pack', productionReferenceAt = target.productionReferenceAt;
    const { RAVSCORE_PUBLIC_FORECAST_HOURS: count } = await import(pathToFileURL(path.join(readers.root, 'js/core/ravscore-model-contract.js')).href);
    const digest = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
    const sourceDetailsSha256 = 'a'.repeat(64), hours = {};
    const current = { time: productionReferenceAt, weather: { currentSpeedMps: .15, currentDirectionDeg: 90,
      currentProvenance: { status: 'verified', provider: 'dmi' } } };
    for (let i = 0; i < count; i++) {
      const time = new Date(Date.parse(productionReferenceAt) + i * 3600000).toISOString();
      const text = JSON.stringify({ datasetId, productionReferenceAt,
        delivery: { schemaVersion: 1, kind: 'hour', key: time, sourceDetailsSha256, modelBinding },
        coastalParts: { parts: {
          p1: { id: 'p1', zoneId: 'z1', current: { ...current, time }, flowPoints: { current: [8,55] } },
          p2: { id: 'p2', zoneId: 'z1', ...(i === 0 ? {} : { current: { ...current, time } }) },
        } } });
      const hash = digest(text), file = hash + '.json';
      await fs.writeFile(path.join(live, 'forecast', file), text);
      hours[time] = { path: './forecast/' + file, sha256: hash, bytes: Buffer.byteLength(text) };
    }
    const packPath = path.join(payload, '.cache/public-hour-delivery.pack');
    const packed = await readers.buildPrivatePublicHourDeliveryPack({ liveDirectory: live, outputPath: packPath,
      publicManifest: { datasetId, productionReferenceAt, publicConditionDetailsSha256: sourceDetailsSha256,
        ravScoreModelBinding: modelBinding, detailDelivery: { schemaVersion: 1, sourceDetailsSha256, hours } },
      startupNationalForecast: { schemaVersion: 2, modelBinding, dates: [], modes: { waders: [], beach: [] } } });
    const full = { datasetId, productionReferenceAt, coastalParts: { enabled: true, expectedPartCount: 2,
      modelBinding, parts: { p1: { zoneId: 'z1', current, flowPoints: { current: [8,55] }, hourly: [current] },
        p2: { zoneId: 'z1', current, hourly: [current] } } } };
    const compact = readers.compactPrivateConditionsForPersistence(full, packed.marker);
    assert.equal(compact.coastalParts.parts.p1.hourly, undefined, 'exercise the actual persistence defect');
    assert.equal(savedPrivateScoreRows(compact.coastalParts.parts.p1).length, 1);
    assert.deepEqual(savedPrivateScoreRows(compact.coastalParts.parts.p1)[0].flowPoints, { current: [8,55] });
    assert.equal(savedPrivateScoreRows(full.coastalParts.parts.p1).length, 1, 'do not duplicate current with inline row');
    const original = await fs.readFile(packPath), before = JSON.stringify(compact);
    const result = await readSavedPublicScoreRows({ conditions: compact, payload, privateRoot: folder, readers });
    assert.equal(result.summary.hours, count); assert.equal(result.summary.rows, 2 * count - 1);
    assert.equal(result.summary.absentPartHours, 1, 'never copy H0 into a missing part/hour');
    assert.equal(result.rows.get('p1').length, count); assert.equal(result.rows.get('p2').length, count - 1);
    assert.equal(result.rows.get('p1')[0].weather.currentSpeedMps, .15);
    assert.equal(result.summary.storage, 'ORIGINAL_AUTHENTICATED_PUBLIC_HOUR_PACK');
    assert.equal(JSON.stringify(compact), before); assert.deepEqual(await fs.readFile(packPath), original);
    assert.equal((await fs.readdir(folder)).some(name => name.startsWith('arrow-score-hours-')), false);
    const bad = structuredClone(compact); bad.publicHourDelivery.packSha256 = '0'.repeat(64);
    await assert.rejects(readSavedPublicScoreRows({ conditions: bad, payload, privateRoot: folder, readers }), /digest/i);
    const changedIdentity = structuredClone(compact); changedIdentity.coastalParts.parts.p1.zoneId = 'other';
    await assert.rejects(readSavedPublicScoreRows({ conditions: changedIdentity, payload, privateRoot: folder, readers }), /SAVED_HOUR_PART/);
    const missing = structuredClone(compact); delete missing.publicHourDelivery;
    await assert.rejects(readSavedPublicScoreRows({ conditions: missing, payload, privateRoot: folder, readers }), /SAVED_HOUR_PACK_MISSING/);
    const corrupt = Buffer.from(original); corrupt[corrupt.length - 1] ^= 1; await fs.writeFile(packPath, corrupt);
    await assert.rejects(readSavedPublicScoreRows({ conditions: compact, payload, privateRoot: folder, readers }), /digest/i);
    assert.equal((await fs.readdir(folder)).some(name => name.startsWith('arrow-score-hours-')), false);
  } finally { await fs.rm(folder, { recursive: true, force: true }); }
}

async function checkNormalPublicProjection(root, readers) {
  const load = name => import(pathToFileURL(path.join(root, name)).href);
  const env = { assert, ...await load('js/core/ravscore-model-contract.js'),
    ...await load('js/core/ravscore-public-model.js'), ...await load('js/core/ravscore-public-runtime-contract.js'),
    ...await load('js/core/ravscore-evidence-trust-contract.js'), ...await load('js/core/ravscore-public-weather-source-age.js') };
  const source = await fs.readFile(path.join(root, 'scripts/test-ravscore-public-runtime-contract.mjs'), 'utf8');
  const start = source.indexOf('const generatedAt ='), end = source.indexOf('assert.throws(() => buildPublicConditions(', start);
  assert.ok(start >= 0 && end > start);
  const full = Function(...Object.keys(env), source.slice(start, end) + ';return full;')(...Object.values(env));
  const data = fixture(), selected = readers.verifiedIntegratedPartHourly(data.record, data.bulk,
    'PART::' + data.part.partId, data.part)[0];
  const weather = { currentSpeedMps: selected.currentSpeedMps, currentDirectionDeg: selected.currentDirectionDeg,
    currentProvenance: readers.displayedCurrentProvenance(selected.currentProvenance) };
  full.coastalParts.parts['part-1'].current.weather = weather;
  const publicLib = await load('scripts/public-conditions-lib.mjs');
  const publicPart = publicLib.buildPublicConditionDetails(full).coastalParts.parts['part-1'];
  assert.equal(Object.hasOwn(publicPart.current.weather.currentProvenance, 'modelRun'), false);
  const stored = { time: data.part.hourly[0].time, weather: publicPart.current.weather,
    flowPoints: data.part.hourly[0].flowPoints, modeWeather: [publicPart.current.weather, publicPart.current.weather] };
  const options = { ...data, readers, storedRows: [stored], referenceAt: target.productionReferenceAt, projectionKind: 'public' };
  const result = measureSavedCurrentSelection(options).projection;
  assert.equal(result.matched, 1); assert.equal(result.mapLocation.land, 1);
  assert.equal(result.modeWeatherCompared, 2); assert.equal(result.modeWeatherMismatches, 0);
  assert.equal(result.arrowPointMatched, 1);
  const wrong = structuredClone(stored); wrong.weather.currentProvenance.collection = 'wrong';
  assert.equal(measureSavedCurrentSelection({ ...options, storedRows: [wrong] }).projection.mismatched, 1);
  const leaking = structuredClone(stored); leaking.weather.currentProvenance.gridPoint = [8,55];
  assert.equal(measureSavedCurrentSelection({ ...options, storedRows: [leaking] }).projection.mismatched, 1);
  const mode = structuredClone(stored); mode.modeWeather[0] = { ...mode.weather, currentSpeedMps: 9 };
  assert.equal(measureSavedCurrentSelection({ ...options, storedRows: [mode] }).projection.modeWeatherMismatches, 1);
  const arrow = structuredClone(stored); arrow.flowPoints.current = [9,55];
  assert.equal(measureSavedCurrentSelection({ ...options, storedRows: [arrow] }).projection.arrowPointMismatched, 1);
}
test('normal saved score compaction and full hour pack never silently become zero score rows', async () => {
  const readers = await originalArrowScoreReaders(process.cwd());
  await checkSavedHourStorage(readers);
  await checkNormalPublicProjection(readers.root, readers);
});

async function checkNormalSupplementalSelection(root, original) {
  const pilot = await import(pathToFileURL(path.join(root, 'scripts/lib/live-current-pilot.mjs')).href);
  const env = { assert, crypto, ...pilot };
  const extractFixture = async (file, first, last, returned) => {
    const source = await fs.readFile(path.join(root, file), 'utf8');
    const start = source.indexOf(first), end = source.indexOf(last, start);
    assert.ok(start >= 0 && end > start);
    // Reuse committed normal-contract fixtures, never provider data or a mock verifier.
    return Function(...Object.keys(env), source.slice(start, end) + ';return ' + returned)(...Object.values(env));
  };
  const fixture = await extractFixture('scripts/test-live-current-pilot-4.0.232.mjs',
    'const part =', 'const OLD_BUT_VALID_ACQUISITION_AT', '{part,live,REFERENCE_AT,FUTURE_AT}');
  const part = { ...fixture.part, onshoreDirectionDeg: 90 };
  const record = { point: part.waterPoint, hourly: [{ time: fixture.REFERENCE_AT }, { time: fixture.FUTURE_AT }] };
  const assembled = original.mergeActiveNativeLiveCurrentPilotIntoRecord(record, part, fixture.live, {
    activeBulk: null, bulkId: 'PART::P1', productionReferenceAt: fixture.REFERENCE_AT });
  const rows = original.verifiedIntegratedPartHourly(assembled, null, 'PART::P1', part);
  assert.equal(rows[0].currentProvenance.provider, 'copernicus');
  const toStored = row => ({ time: row.time, weather: { currentSpeedMps: row.currentSpeedMps,
    currentDirectionDeg: row.currentDirectionDeg,
    currentProvenance: original.displayedCurrentProvenance(row.currentProvenance) } });
  const storedRows = rows.map(toStored);
  const options = { part, record, bulk: null, pilot: fixture.live, referenceAt: fixture.REFERENCE_AT,
    storedRows, readers: original, mask: { classifyPoint: () => 'land' } };
  const before = JSON.stringify({ part, record, pilot: fixture.live, storedRows });
  const checked = measureSavedCurrentSelection(options);
  assert.equal(checked.projection.matched, 2); assert.equal(checked.projection.providers.copernicus, 2);
  assert.equal(checked.projection.mapLocation.land, 2, 'synthetic label, not a real geographic assertion');
  const missing = measureSavedCurrentSelection({ ...options, pilot: null });
  assert.equal(missing.projection.unavailable, 2); assert.equal(missing.projection.matched, 0);
  const badPilot = structuredClone(fixture.live); badPilot.entries[0].uMps += .123;
  assert.equal(measureSavedCurrentSelection({ ...options, pilot: badPilot,
    storedRows: [storedRows[0]] }).projection.matched, 0);
  assert.equal(measureSavedCurrentSelection({ ...options, pilot: badPilot }).projection.matched, 1,
    'preserve the independently genuine second row');
  const changed = structuredClone(storedRows); changed[0].weather.currentSpeedMps += .01;
  assert.equal(measureSavedCurrentSelection({ ...options, storedRows: changed }).projection.mismatched, 1);
  assert.equal(measureSavedCurrentSelection({ ...options, part: { ...part, waterPoint: [10.2,55] } }).projection.matched, 0);
  const integratedEvidence = rows.map(row => original.deriveCurrentSupplyEvidence(row, {
    getNormalSpeed: value => value.currentCoastNormalSpeedMps,
    isVerified: value => value.currentProvenance?.status === 'verified' }));
  const candidateEvidence = rows.map(row => original.deriveCurrentTransportEvidence(row, {
    ...original.CURRENT_TRANSPORT_POTENTIAL_RECOMMENDED_RESEARCH_PROFILE,
    getSpeed: value => value.currentSpeedMps,
    getAlignment: value => Math.cos((value.currentDirectionDeg - part.onshoreDirectionDeg) * Math.PI / 180),
    isVerified: value => value.currentProvenance?.status === 'verified' }));
  const memories = measureSavedCurrentSelection({ ...options, integratedEvidence, candidateEvidence });
  assert.equal(memories.memories.integrated.matched, 2); assert.equal(memories.memories.candidateG.matched, 2);
  assert.equal(measureSavedCurrentSelection({ ...options,
    integratedEvidence: [{ ...integratedEvidence[0], strength: .123456789 }] }).memories.integrated.mismatched, 1);
  const noPilot = measureSavedCurrentSelection({ ...options, pilot: null, integratedEvidence, candidateEvidence });
  assert.equal(noPilot.memories.integrated.unavailable, 2); assert.equal(noPilot.memories.candidateG.unavailable, 2);
  const noRecord = measureSavedCurrentSelection({ ...options, record: null, integratedEvidence, candidateEvidence });
  assert.equal(noRecord.projection.matched, 0, 'do not fabricate missing continuity from stored scores');
  assert.equal(noRecord.memories.candidateG.matched, 0);
  assert.throws(() => measureSavedCurrentSelection({ ...options, storedRows: [storedRows[0], storedRows[0]] }), /DUPLICATE_SCORE/);
  const om = await extractFixture('scripts/test-open-meteo-live-runtime.mjs',
    'const canonicalJson =', 'const oldButFutureValidAcquiredAt', '{document,part,referenceAt}');
  const omRecord = { point: om.part.waterPoint, hourly: [{ time: om.referenceAt }] };
  const omAssembly = original.mergeActiveNativeLiveCurrentPilotIntoRecord(omRecord, om.part, om.document, {
    activeBulk: null, bulkId: 'PART::P1', productionReferenceAt: om.referenceAt });
  const omRows = original.verifiedIntegratedPartHourly(omAssembly, null, 'PART::P1', om.part);
  assert.equal(measureSavedCurrentSelection({ ...options, part: om.part, record: omRecord, pilot: om.document,
    referenceAt: om.referenceAt, storedRows: omRows.map(toStored) }).projection.providers['open-meteo'], 1);
  assert.equal(JSON.stringify({ part, record, pilot: fixture.live, storedRows }), before);
  assert.doesNotMatch(JSON.stringify(memories), /gridPoint|waterPoint|current-u|current-v|uMps|recordId|P1/);
}

async function checkCandidateStateAndRoot(root, original) {
  const constants = await import(pathToFileURL(path.join(root, 'js/core/ravscore-candidate-g-state-pipeline.js')).href);
  const { candidateGStateKey } = await import(pathToFileURL(path.join(root, 'scripts/lib/coastal-point-staging-contract.mjs')).href);
  const part = { partId: 'synthetic-candidate-part', zoneId: 'synthetic-zone', waterPoint: [8,55], onshoreDirectionDeg: 90 };
  const evidence = Array.from({ length: 49 }, (_, i) => ({ time: new Date(epoch + (i - 48) * 3600000).toISOString(), strength: .5 }));
  const replay = original.buildBoundedCurrentTransportMemory(evidence, {
    ...original.CURRENT_TRANSPORT_POTENTIAL_RECOMMENDED_RESEARCH_PROFILE,
    referenceTime: reference, restartAfterVerifiedTimeGap: true });
  assert.equal(replay.memoryReady, true);
  const state = { schemaVersion: constants.CANDIDATE_G_STATE_SCHEMA_VERSION,
    modelId: constants.CANDIDATE_G_STATE_MODEL_ID, variantId: constants.CANDIDATE_G_STATE_VARIANT_ID,
    profileId: constants.CANDIDATE_G_STATE_PROFILE_ID, stateKey: candidateGStateKey(part),
    time: reference, transportReferenceAt: reference, transportPotential: replay.result.transportPotential,
    outboundEpisodeEffectiveHours: replay.result.outboundEpisodeEffectiveHours,
    transportMemoryReady: replay.memoryReady, transportMemoryStatus: replay.status,
    transportMemoryWindowHours: replay.windowHours, transportMemoryCoverageHours: replay.coverageHours,
    transportEvidence: replay.evidence, mobilisationPotential: 64 };
  assert.deepEqual(validateSavedCandidateState(state, part, original), replay.evidence);
  assert.throws(() => validateSavedCandidateState({ ...state, transportPotential: state.transportPotential - 1 }, part, original));
  assert.throws(() => validateSavedCandidateState(state, { ...part, waterPoint: [9,55] }, original));
  const binding = original.candidateModelBinding(), wrapper = { ravScoreModel: { currentState: state } };
  const parts = Object.fromEntries(Array.from({ length: 673 }, (_, i) => ['p' + i, wrapper]));
  const conditions = { productionReferenceAt: reference,
    coastalParts: { enabled: true, expectedPartCount: 673, parts, modelBinding: { synthetic: 'integrated' } } };
  assert.throws(() => selectSavedCandidateRoot(conditions, original), /ROOT_MISSING/);
  const descriptor = { schemaVersion: '1.0.0', kind: 'PRIVATE_CANDIDATE_G_OPERATIONAL_ROLLBACK_RUNTIME',
    privacyClass: 'PRIVATE_PRODUCTION_RUNTIME', sourceModelBinding: conditions.coastalParts.modelBinding,
    rollbackModelBinding: binding, rollbackId: original.CANDIDATE_G_OPERATIONAL_ROLLBACK_ID,
    automaticActivationAllowed: false, publicDuringNormalOperation: false,
    runtime: { schemaVersion: 1, enabled: true, generatedAt: reference, expectedPartCount: 673,
      scoredPartCount: 673, modelBinding: binding, parts,
      scoreProfile: { modelCoverageReady: true, modelMemoryReady: true, modelMigrationReady: true } } };
  conditions.ravScoreCandidateGRollback = descriptor;
  assert.equal(selectSavedCandidateRoot(conditions, original).kind, 'READY_ROLLBACK');
  assert.throws(() => selectSavedCandidateRoot({ ...conditions, ravScoreCandidateGWarmup: descriptor }, original), /AMBIGUOUS/);
  assert.throws(() => selectSavedCandidateRoot({ ...conditions, ravScoreCandidateGRollback: { ...descriptor, unknown: true } }, original), /ROOT_INVALID/);
  state.transportMemoryReady = false;
  assert.throws(() => selectSavedCandidateRoot(conditions, original), /READY_STATE_INVALID/);
  const warmup = { schemaVersion: '1.0.0', kind: 'PRIVATE_CANDIDATE_G_MEASURED_WARMUP_RUNTIME',
    privacyClass: 'PRIVATE_PRODUCTION_RUNTIME', status: 'BUILDING_MEASURED_ONLY', evidencePolicy: 'MEASURED_ONLY',
    syntheticHistoryAllowed: false, sourceModelBinding: conditions.coastalParts.modelBinding,
    candidateModelBinding: binding, automaticActivationAllowed: false, publicDuringNormalOperation: false,
    runtime: { schemaVersion: 1, enabled: true, generatedAt: reference, status: 'BUILDING_MEASURED_ONLY',
      expectedPartCount: 673, measuredPartCount: 673, modelBinding: binding, parts } };
  delete conditions.ravScoreCandidateGRollback; conditions.ravScoreCandidateGWarmup = warmup;
  assert.equal(selectSavedCandidateRoot(conditions, original).kind, 'MEASURED_WARMUP');
  state.transportMemoryReady = true;
  assert.throws(() => selectSavedCandidateRoot(conditions, original), /ALL_READY_WARMUP/);
}

test('normal supplemental source selection, both memories and Candidate G guards use real current readers', async () => {
  const root = process.cwd(), original = await originalArrowScoreReaders(root);
  await checkNormalSupplementalSelection(root, original);
  await checkCandidateStateAndRoot(root, original);
});

const readers = { ...adapters, buildCurrentSupplyMemory, currentSupplyStrength };
const reference = target.productionReferenceAt, epoch = Date.parse(reference);
const at = n => new Date(epoch + n * 3_600_000).toISOString().replace('.000Z', 'Z');
const mask = createCurrentArrowLandMask({ schemaVersion: 1, coverage: [7.7,54.4,15.6,57.9],
  polygons: [{ bbox: [7.9,54.9,8.1,55.1], rings: [[[7.9,54.9],[8.1,54.9],[8.1,55.1],[7.9,55.1],[7.9,54.9]]] }] });
function fixture() {
  const part = { partId: 'synthetic-arrow-part', zoneId: 'synthetic-arrow-zone',
    waterPoint: [8,55], onshoreDirectionDeg: 90 };
  const identity = adapters.dmiExpectedIdentityForPart(part);
  const vectorSelection = 'nearest-shared-uv-column-across-dmi-collections-then-deepest-valid-layer';
  const native = [-48, -3, 0, 3].map(hour => {
    const source = { provider: 'dmi', fallback: false, collection: 'dkss_idw', collectionFamily: 'marine',
      componentKind: 'ocean-current-vector', fieldSet: ['current-u','current-v'],
      spatialSelection: 'nearest-shared-grid-cell-no-spatial-interpolation', vectorSemanticsVersion: 3,
      vectorSelection, verticalLayer: 'depth:1', verticalLayerRankM: 1, ...identity, component: 'current',
      modelRun: at(-60), itemId: `synthetic-private-item-${hour}`, assetIdentitySha256: 'a'.repeat(64),
      nativeValidTime: at(hour), leadTimeHours: hour + 60, acquiredAt: at(-1), itemUpdatedAt: at(-59),
      optionalFieldSet: [], samplingPoint: [...part.waterPoint], gridPoint: [...part.waterPoint],
      gridDefinitionSha256: 'b'.repeat(64), distanceKm: 0, spatialSemanticsVersion: 1 };
    return { time: at(hour), 'current-u': .15, 'current-v': 0, sources: { current: source } };
  });
  const bulk = { currentVectorSemanticsVersion: 3, currentVectorSelection: vectorSelection,
    currentMaxDistanceKm: 5, zones: { [identity.entityId]: { ...identity,
      hourly: Object.fromEntries(native.map(row => [row.time, row])) } } };
  const hourly = buildDmiForecastHourly({ ocean: native.filter(row => Date.parse(row.time) >= epoch)
    .map(row => ({ step: row.time, 'current-u': row['current-u'], 'current-v': row['current-v'], provenance: row.sources })),
  generatedAt: at(0), startAt: at(0), hours: DMI_FORECAST_HOURS, sourceCadenceMinutes: 180 }).hourly;
  const record = { hourly };
  const selected = adapters.verifiedIntegratedPartHourly(record, bulk, identity.entityId, part)[0];
  assert.equal(selected.currentProvenance.status, 'verified', 'fixture must pass real normal source verifier');
  part.hourly = [{ time: reference, weather: { currentSpeedMps: selected.currentSpeedMps,
    currentDirectionDeg: selected.currentDirectionDeg, currentProvenance: structuredClone(selected.currentProvenance) },
  flowPoints: { current: [8,55], sources: { current: 'dmi-marine-grid' } } }];
  const evidence = native.filter(row => Date.parse(row.time) <= epoch).map(row => ({
    time: new Date(Date.parse(row.time)).toISOString(), strength: 1 }));
  const replay = buildCurrentSupplyMemory(evidence, { referenceTime: reference });
  part.ravScoreModel = { currentState: { time: reference, currentReferenceAt: reference,
    currentEvidence: replay.evidence, currentNativeHoldAuthorization: null, currentNativeHoldIntervalEnds: [],
    currentMemoryWindowHours: 48, currentMemoryReady: replay.memoryReady,
    currentMemoryStatus: replay.status, currentMemoryCoverageHours: replay.coverageHours,
    supplyPotential: replay.supplyPotential } };
  return { part, record, bulk, mask, readers };
}
test('new sealed arrow diagnosis cannot repoint older authority or change attempt/hash/repository/expiry', () => {
  const artifact = { id: target.artifactId, name: target.artifactName, size_in_bytes: target.artifactBytes,
    digest: target.artifactDigest, expired: false, expires_at: '2026-10-09T15:17:01Z', workflow_run: {
      id: target.runId, head_sha: target.sourceHead, head_branch: 'main', repository_id: target.repositoryId,
      head_repository_id: target.repositoryId } };
  const run = { id: target.runId, run_attempt: 1, status: 'completed', conclusion: 'success',
    head_sha: target.sourceHead, head_branch: 'main', event: 'workflow_dispatch',
    path: '.github/workflows/run-current-weather-once.yml', repository: { full_name: target.repository },
    head_repository: { full_name: target.repository } };
  const now = '2026-10-08T16:00:00.000Z';
  assert.equal(validateSealedArrowScoreTarget(artifact, run, now), true);
  for (const delta of [{ id: 11281483201 }, { size_in_bytes: target.artifactBytes + 1 },
    { digest: 'sha256:' + '0'.repeat(64) }, { expired: true },
    { workflow_run: { ...artifact.workflow_run, head_repository_id: 1 } }]) {
    assert.throws(() => validateSealedArrowScoreTarget({ ...artifact, ...delta }, run, now), /TARGET_REJECTED/);
  }
  for (const delta of [{ run_attempt: 2 }, { head_sha: '0'.repeat(40) }, { conclusion: 'failure' },
    { head_repository: { full_name: 'attacker/fork' } }]) {
    assert.throws(() => validateSealedArrowScoreTarget(artifact, { ...run, ...delta }, now), /TARGET_REJECTED/);
  }
  assert.throws(() => validateSealedArrowScoreTarget(artifact, run, artifact.expires_at), /TARGET_REJECTED/);
  assert.equal(Object.hasOwn(target, 'ciphertextBytes'), false, 'actual ZIP member size is not guessed');
});
test('actual normal source selection exposes land coincidence in score and memory without altering input', () => {
  const data = fixture(), before = JSON.stringify({ part: data.part, record: data.record, bulk: data.bulk });
  const report = measureArrowScorePart(data);
  assert.equal(report.projection.normalSelectionMatched.land, 1);
  assert.equal(report.projection.arrowPointMismatch, 0);
  assert.equal(report.memory.replayMatched, true);
  assert.equal(report.memory.authenticSavedInputMatches.land, 3);
  assert.equal(report.memory.eligibleSavedInputMatches.land, 3);
  assert.equal(JSON.stringify({ part: data.part, record: data.record, bulk: data.bulk }), before);
  for (const canary of ['synthetic-private-item', 'synthetic-arrow-part', 'gridPoint',
    'current-u', 'current-v', 'currentUMps', 'waterPoint', '8,55']) assert.equal(JSON.stringify(report).includes(canary), false);
});
test('different arrow, wrong score projection, missing input and different provider never become proved score grounding', () => {
  const data = fixture(); data.part.hourly[0].flowPoints.current = [8.01,55];
  assert.equal(measureArrowScorePart(data).projection.arrowPointMismatch, 1);
  data.part.hourly[0].weather.currentSpeedMps += .01;
  assert.equal(measureArrowScorePart(data).projection.normalSelectionMismatch, 1);
  data.record.hourly = [];
  assert.equal(measureArrowScorePart(data).projection.noMatchingSavedSelection, 1);
  data.part.hourly[0].weather.currentProvenance.provider = 'copernicus';
  const other = measureArrowScorePart(data).projection;
  assert.equal(other.otherProviderRows, 1); assert.equal(other.normalSelectionMatched.land, 0);
});
test('real compact-score UTC spelling and valid zero vectors do not create false mismatch or missing data', () => {
  const data = fixture(), weather = data.part.hourly[0].weather;
  weather.currentProvenance.nativeValidTimes = weather.currentProvenance.nativeValidTimes
    .map(value => new Date(Date.parse(value)).toISOString());
  weather.currentProvenance.modelRun = new Date(Date.parse(weather.currentProvenance.modelRun)).toISOString();
  assert.equal(measureArrowScorePart(data).projection.normalSelectionMatched.land, 1);
  data.record.hourly[0].currentUMps = 0; data.record.hourly[0].currentVMps = 0;
  const zero = adapters.verifiedIntegratedPartHourly(data.record, data.bulk,
    `PART::${data.part.partId}`, data.part)[0];
  assert.equal(zero.currentProvenance.status, 'verified');
  weather.currentSpeedMps = zero.currentSpeedMps;
  weather.currentDirectionDeg = zero.currentDirectionDeg;
  weather.currentProvenance = structuredClone(zero.currentProvenance);
  delete data.part.ravScoreModel;
  const report = measureArrowScorePart(data);
  assert.equal(report.projection.normalSelectionMatched.land, 1);
  assert.equal(report.projection.noMatchingSavedSelection, 0);
  assert.equal(report.memory.statePresent, false);
  assert.equal(report.memory.replayMatched, false, 'absent state is not a successful replay');
});
test('memory replay rejects changed continuation, duplicate originals and source mismatch remains unproved', () => {
  const data = fixture(); data.part.ravScoreModel.currentState.supplyPotential += 1;
  assert.throws(() => measureArrowScorePart(data), /STATE_REPLAY_MISMATCH/);
  const duplicate = fixture(), zone = Object.values(duplicate.bulk.zones)[0];
  zone.hourly.duplicate = structuredClone(Object.values(zone.hourly)[0]);
  assert.throws(() => measureArrowScorePart(duplicate), /DUPLICATE_NATIVE_TIME/);
  const wrong = fixture(); delete wrong.bulk.currentVectorSelection;
  assert.equal(measureArrowScorePart(wrong).memory.unmatched, 3);
});
test('CLI original-open failure never leaks its private path or underlying error', async t => {
  const folder = await fs.mkdtemp(path.join(os.tmpdir(), 'rr-sealed-arrow-test-'));
  t.after(() => fs.rm(folder, { recursive: true, force: true }));
  const reportPath = path.join(folder, 'safe.json');
  const result = spawnSync(process.execPath, ['scripts/audit-sealed-arrow-score.mjs', 'open',
    '--producer-root', path.join(folder, 'secret-error-canary'), '--report', reportPath],
  { encoding: 'utf8', env: { ...process.env, STAGED_PRIVATE_BUILD_MASTER_SECRET: 'synthetic-private-secret-canary' } });
  assert.equal(result.status, 1); assert.equal(result.stdout, '');
  assert.equal(result.stderr.trim(), 'SEALED_ARROW_SCORE_AUDIT_FAILED_CLOSED');
  const report = await fs.readFile(reportPath, 'utf8');
  assert.equal(JSON.parse(report).status, 'FAILED_CLOSED');
  assert.doesNotMatch(report, /secret-error-canary|synthetic-private-secret|current-u|gridPoint/);
});
test('genuine original producer archive and normal GCM/AAD open plus offline inspection, with synthetic empty weather', async t => {
  // Authentic code/crypto route; deliberately NOT real national weather/capacity evidence.
  const folder = await fs.mkdtemp(path.join(os.tmpdir(), 'rr-original-arrow-reader-'));
  t.after(() => fs.rm(folder, { recursive: true, force: true }));
  const producer = path.join(folder, 'producer'), source = path.join(folder, 'synthetic-source'),
    build = path.join(folder, 'build'), opened = path.join(folder, 'opened');
  await fs.mkdir(producer); await fs.mkdir(source); await fs.mkdir(build); await fs.mkdir(opened);
  const archivePath = path.join(folder, 'producer.tar');
  const archived = spawnSync('git', ['archive', target.sourceHead, '--output', archivePath], { encoding: 'utf8' });
  assert.equal(archived.status, 0, archived.stderr);
  const extracted = spawnSync('tar', ['-xf', archivePath, '-C', producer], { encoding: 'utf8' });
  assert.equal(extracted.status, 0, extracted.stderr);
  const readers = await originalArrowScoreReaders(producer), expected = await originalArrowScoreExpectation(readers);
  assert.equal(JSON.parse(await fs.readFile(path.join(producer, 'package.json'), 'utf8')).version, '4.0.551');
  await checkNormalSupplementalSelection(producer, readers);
  await checkCandidateStateAndRoot(producer, readers);
  await checkSavedHourStorage(readers);
  await checkNormalPublicProjection(producer, readers);
  const conditions = { datasetId: target.datasetId, productionReferenceAt: target.productionReferenceAt,
    generatedAt: target.generatedAt, zones: Object.fromEntries(Array.from({ length: 210 }, (_, i) => [`zone-${i}`, {}])),
    coastalParts: { modelBinding: expected.modelBinding, parts: Object.fromEntries(Array.from({ length: 673 }, (_, i) =>
      [`part-${i}`, { zoneId: `zone-${i % 210}`, waterPoint: [8,55], onshoreDirectionDeg: 0 }])) } };
  const files = [];
  for (const descriptor of PRIVATE_RUNTIME_BASE_FILES) {
    const value = descriptor.id === 'full-conditions' ? conditions
      : ['dmi-forecast-cache','dmi-bulk-cache'].includes(descriptor.id) ? { zones: {} } : {};
    const file = path.join(source, descriptor.relativePath);
    await fs.mkdir(path.dirname(file), { recursive: true }); await fs.writeFile(file, JSON.stringify(value));
    files.push({ ...descriptor, sourcePath: file, privacyClass: 'PRIVATE_PRODUCTION_RUNTIME' });
  }
  const bundle = path.join(build, 'bundle');
  await readers.createPrivateProductionRuntimeBundle({ repositoryRoot: producer, privateRoot: build, bundlePath: bundle,
    files, metadata: { datasetId: target.datasetId, productionReferenceAt: target.productionReferenceAt,
      generatedAt: target.generatedAt, generationId: 'synthetic-empty-arrow-diagnosis', zoneCount: 210, partCount: 673,
      modelBinding: expected.modelBinding, contractHashes: expected.contractHashes, privacyClass: 'PRIVATE_PRODUCTION_RUNTIME' } });
  const cipher = path.join(folder, 'synthetic.bin'), masterSecret = 'synthetic-private-key-never-real'.repeat(3);
  await readers.sealStagedPrivateProductionRuntime({ repositoryRoot: producer, privateRoot: build, bundlePath: bundle,
    expected, sourceHead: target.sourceHead, repository: target.repository, runId: String(target.runId),
    runAttempt: String(target.runAttempt), outputPath: cipher, masterSecret });
  const common = { repositoryRoot: producer, privateRoot: opened, bundlePath: path.join(opened, 'bundle'),
    expected, sourceHead: target.sourceHead, repository: target.repository, runId: String(target.runId),
    runAttempt: String(target.runAttempt), inputPath: cipher, masterSecret };
  await assert.rejects(readers.openStagedPrivateProductionRuntime({ ...common, sourceHead: 'a'.repeat(40) }), /authentication/i);
  await assert.rejects(readers.openStagedPrivateProductionRuntime({ ...common, expected: { ...expected,
    contractHashes: { ...expected.contractHashes, fullRuntimeContractSha256: 'f'.repeat(64) } } }));
  const result = await readers.openStagedPrivateProductionRuntime(common);
  assert.equal(result.restored, true); assert.equal(result.productionPointerUnchanged, true);
  const before = await fs.readFile(path.join(opened, 'bundle/payload/data/live/conditions.json'));
  // Use actual committed public bytes: Windows autocrlf can change a working
  // JSON file's final newline. Keep the runtime's exact checksum/size checks.
  const publicMask = spawnSync('git', ['show', 'HEAD:data/map/current-arrow-land-mask.json'], { maxBuffer: 8 * 1024 * 1024 });
  assert.equal(publicMask.status, 0);
  const maskRoot = path.join(folder, 'public-mask');
  await fs.mkdir(path.join(maskRoot, 'data/map'), { recursive: true });
  await fs.writeFile(path.join(maskRoot, 'data/map/current-arrow-land-mask.json'), publicMask.stdout);
  const report = await withoutSavedAuditSecrets(() => inspectSealedArrowScores({ producerRoot: producer,
    privateRoot: opened, bundlePath: path.join(opened, 'bundle'), maskRoot }));
  assert.equal(report.bundleIntegrityVerified, true); assert.equal(report.priorOriginalGcmOpenRequired, true);
  assert.equal(Object.hasOwn(report, 'authenticatedOriginalBundle'), false,
    'an integrity-only inspector cannot itself claim the prior GCM step took place');
  assert.equal(report.exactProducerReaders, true);
  assert.equal(report.totals.parts, 673); assert.equal(report.continuity, 'NOT_PRESENT');
  assert.equal(report.totals.storedScoreRows, 0); assert.equal(report.totals.presentStates, 0);
  assert.equal(report.selectedInputs.projection.rows, 0); assert.equal(report.candidateRoot, 'NOT_PRESENT');
  assert.equal(report.selectedInputs.memories.candidateG.finite, 0);
  assert.equal(report.scoreCorrectnessProved, false); assert.equal(report.numericCorrectionMade, false);
  assert.equal(report.providersCalled, false); assert.match(report.attribution, /NOT_PERSISTED_CAUSAL_JOIN$/);
  assert.equal(Buffer.byteLength(JSON.stringify(report)) < 32 * 1024, true);
  assert.deepEqual(await fs.readFile(path.join(opened, 'bundle/payload/data/live/conditions.json')), before);
  assert.doesNotMatch(JSON.stringify(report), /synthetic-private-key|gridPoint|current-u|current-v|waterPoint|part-0/);
});
