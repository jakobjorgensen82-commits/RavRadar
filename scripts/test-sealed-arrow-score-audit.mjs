import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
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
  assert.equal(report.scoreCorrectnessProved, false); assert.equal(report.numericCorrectionMade, false);
  assert.equal(report.providersCalled, false); assert.match(report.attribution, /NOT_PERSISTED_CAUSAL_JOIN$/);
  assert.equal(Buffer.byteLength(JSON.stringify(report)) < 32 * 1024, true);
  assert.deepEqual(await fs.readFile(path.join(opened, 'bundle/payload/data/live/conditions.json')), before);
  assert.doesNotMatch(JSON.stringify(report), /synthetic-private-key|gridPoint|current-u|current-v|waterPoint|part-0/);
});
