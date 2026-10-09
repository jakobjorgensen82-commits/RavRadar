// Additional offline seam check only: synthetic 673-part saved input, no real weather.
import crypto from 'node:crypto';
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';

test('original GCM bundle preserves nonempty 673-part current and separately packed forecast scores', async () => {
const checkout = process.cwd();
const audit = await import(pathToFileURL(path.join(checkout, 'scripts/audit-sealed-arrow-score.mjs')));
const { SEALED_ARROW_SCORE_TARGET: target, originalArrowScoreReaders,
  originalArrowScoreExpectation, inspectSealedArrowScores } = audit;
const { PRIVATE_RUNTIME_BASE_FILES } = await import(pathToFileURL(
  path.join(checkout, 'scripts/lib/private-weather-component-inventory.mjs')));
const { withoutSavedAuditSecrets } = await import(pathToFileURL(
  path.join(checkout, 'scripts/audit-saved-weather-inputs.mjs')));
const folder = await fs.mkdtemp(path.join(os.tmpdir(), 'rr-arrow-original-nonempty-'));
assert.equal(path.dirname(folder), path.resolve(os.tmpdir()));
try {
  const producer = path.join(folder, 'producer'), source = path.join(folder, 'synthetic-source'),
    privateRoot = path.join(folder, 'synthetic-private'), opened = path.join(folder, 'opened'),
    maskRoot = path.join(folder, 'mask');
  for (const root of [producer, source, privateRoot, opened, path.join(maskRoot, 'data/map')]) {
    await fs.mkdir(root, { recursive: true });
  }
  const archivePath = path.join(folder, 'producer.tar');
  let result = spawnSync('git', ['archive', target.sourceHead, '--output', archivePath], { encoding: 'utf8' });
  assert.equal(result.status, 0);
  result = spawnSync('tar', ['-xf', archivePath, '-C', producer], { encoding: 'utf8' });
  assert.equal(result.status, 0);
  const r = await originalArrowScoreReaders(producer);
  const { buildDmiForecastHourly, DMI_FORECAST_HOURS } = await import(pathToFileURL(
    path.join(producer, 'scripts/lib/dmi-forecast-store.mjs')));
  const expected = await originalArrowScoreExpectation(r);
  const epoch = Date.parse(target.productionReferenceAt);
  const at = hours => new Date(epoch + hours * 3600000).toISOString();
  const point = [9.5, 56]; // Deliberately synthetic map-land input, NOT a real marine cell.
  const vectorSelection = 'nearest-shared-uv-column-across-dmi-collections-then-deepest-valid-layer';
  const parts = [], records = new Map(), zones = {}, bulkZones = {};
  for (let i = 0; i < 673; i++) {
    const part = { partId: `synthetic-part-${String(i).padStart(3, '0')}`,
      zoneId: `synthetic-zone-${i % 210}`, waterPoint: [...point], onshoreDirectionDeg: 90 };
    zones[part.zoneId] = {};
    const identity = r.dmiExpectedIdentityForPart(part);
    const native = [-48, -3, 0, 3].map(hour => ({ time: at(hour), 'current-u': .15, 'current-v': 0,
      sources: { current: { provider: 'dmi', fallback: false, collection: 'dkss_idw', collectionFamily: 'marine',
        componentKind: 'ocean-current-vector', fieldSet: ['current-u', 'current-v'],
        spatialSelection: 'nearest-shared-grid-cell-no-spatial-interpolation', vectorSemanticsVersion: 3,
        vectorSelection, verticalLayer: 'depth:1', verticalLayerRankM: 1, ...identity, component: 'current',
        modelRun: at(-60), itemId: `synthetic-item-${hour}`, assetIdentitySha256: 'a'.repeat(64),
        nativeValidTime: at(hour), leadTimeHours: hour + 60, acquiredAt: at(-1), itemUpdatedAt: at(-59),
        optionalFieldSet: [], samplingPoint: [...point], gridPoint: [...point],
        gridDefinitionSha256: 'b'.repeat(64), distanceKm: 0, spatialSemanticsVersion: 1 } } }));
    bulkZones[identity.entityId] = { ...identity, hourly: Object.fromEntries(native.map(row => [row.time, row])) };
    const record = { zoneId: identity.entityId, point: [...point], hourly: buildDmiForecastHourly({
      ocean: native.filter(row => Date.parse(row.time) >= epoch).map(row => ({ step: row.time,
        'current-u': row['current-u'], 'current-v': row['current-v'], provenance: row.sources })),
      generatedAt: at(0), startAt: at(0), hours: DMI_FORECAST_HOURS, sourceCadenceMinutes: 180 }).hourly };
    records.set(part.partId, record);
    parts.push(part);
  }
  const bulk = { currentVectorSemanticsVersion: 3, currentVectorSelection: vectorSelection,
    currentMaxDistanceKm: 5, zones: bulkZones };
  for (const part of parts) {
    const selected = r.verifiedIntegratedPartHourly(records.get(part.partId), bulk, `PART::${part.partId}`, part);
    part.hourly = selected.filter(row => [at(0), at(3)].includes(row.time)).map(row => {
      assert.equal(row.currentProvenance.status, 'verified');
      return { time: row.time, weather: { currentSpeedMps: row.currentSpeedMps,
        currentDirectionDeg: row.currentDirectionDeg, currentProvenance: row.currentProvenance },
      flowPoints: { current: [...point], sources: { current: 'dmi-marine-grid' } } };
    });
    assert.equal(part.hourly.length, 2);
    const replay = r.buildCurrentSupplyMemory([-48, -3, 0].map(hour => ({ time: at(hour), strength: 1 })),
      { referenceTime: at(0) });
    part.ravScoreModel = { currentState: { time: at(0), currentReferenceAt: at(0),
      currentEvidence: replay.evidence, currentNativeHoldAuthorization: null, currentNativeHoldIntervalEnds: [],
      currentMemoryWindowHours: 48, currentMemoryReady: replay.memoryReady,
      currentMemoryStatus: replay.status, currentMemoryCoverageHours: replay.coverageHours,
      supplyPotential: replay.supplyPotential } };
  }
  const continuity = await r.packDmiPartContinuity(records, parts, at(0));
  let conditions = { datasetId: target.datasetId, productionReferenceAt: at(0), generatedAt: target.generatedAt,
    zones, coastalParts: { expectedPartCount: 673, modelBinding: expected.modelBinding,
      parts: Object.fromEntries(parts.map(({ partId, ...part }) => [partId, part])) } };
  const publicLive = path.join(folder, 'public-live'), packPath = path.join(source, '.cache/public-hour-delivery.pack');
  await fs.mkdir(path.join(publicLive, 'forecast'), { recursive: true });
  const { RAVSCORE_PUBLIC_FORECAST_HOURS: forecastHours } = await import(pathToFileURL(path.join(producer, 'js/core/ravscore-model-contract.js')));
  const publicFields = ['status','reason','provider','collection','source','sourceClass','controlledLivePilot',
    'temporalResolution','verticalLayer','vectorSelection','vectorSemanticsVersion','method','fallback','distanceKm'];
  const sourceDetailsSha256 = 'c'.repeat(64), hourDescriptors = {};
  for (let index = 0; index < forecastHours; index++) {
    const time = at(index), publishedParts = {};
    for (const part of parts) {
      const stored = part.hourly.find(row => row.time === time);
      const weather = stored && { ...stored.weather, currentProvenance: Object.fromEntries(publicFields
        .filter(key => stored.weather.currentProvenance[key] !== undefined)
        .map(key => [key, stored.weather.currentProvenance[key]])) };
      publishedParts[part.partId] = { id: part.partId, zoneId: part.zoneId, ...(stored ? {
        flowPoints: stored.flowPoints, current: { time, weather, waders: { weather }, beach: { weather } },
      } : {}) };
    }
    const text = JSON.stringify({ datasetId: target.datasetId, productionReferenceAt: at(0),
      delivery: { schemaVersion: 1, kind: 'hour', key: time, sourceDetailsSha256, modelBinding: expected.modelBinding },
      coastalParts: { parts: publishedParts } });
    const sha256 = crypto.createHash('sha256').update(text).digest('hex');
    await fs.writeFile(path.join(publicLive, 'forecast', sha256 + '.json'), text);
    hourDescriptors[time] = { path: './forecast/' + sha256 + '.json', sha256, bytes: Buffer.byteLength(text) };
  }
  const pack = await r.buildPrivatePublicHourDeliveryPack({ liveDirectory: publicLive, outputPath: packPath,
    publicManifest: { datasetId: target.datasetId, productionReferenceAt: at(0),
      publicConditionDetailsSha256: sourceDetailsSha256, ravScoreModelBinding: expected.modelBinding,
      detailDelivery: { schemaVersion: 1, sourceDetailsSha256, hours: hourDescriptors } },
    startupNationalForecast: { schemaVersion: 2, modelBinding: expected.modelBinding, dates: [], modes: { waders: [], beach: [] } } });
  for (const part of Object.values(conditions.coastalParts.parts)) {
    part.current = part.hourly[0]; part.flowPoints = part.hourly[0].flowPoints;
  }
  conditions = r.compactPrivateConditionsForPersistence(conditions, pack.marker);
  assert.equal(Object.hasOwn(Object.values(conditions.coastalParts.parts)[0], 'hourly'), false);
  const files = [{ id: 'public-hour-delivery', relativePath: '.cache/public-hour-delivery.pack',
    sourcePath: packPath, privacyClass: 'PRIVATE_PRODUCTION_RUNTIME' }];
  for (const descriptor of PRIVATE_RUNTIME_BASE_FILES) {
    const value = descriptor.id === 'full-conditions' ? conditions
      : descriptor.id === 'dmi-bulk-cache' ? bulk
      : descriptor.id === 'dmi-forecast-cache' ? { zones: {}, partContinuity: continuity } : {};
    const file = path.join(source, descriptor.relativePath);
    await fs.mkdir(path.dirname(file), { recursive: true });
    await fs.writeFile(file, JSON.stringify(value));
    files.push({ ...descriptor, sourcePath: file, privacyClass: 'PRIVATE_PRODUCTION_RUNTIME' });
  }
  const bundlePath = path.join(privateRoot, 'bundle'), cipher = path.join(folder, 'synthetic.bin');
  await r.createPrivateProductionRuntimeBundle({ repositoryRoot: producer, privateRoot, bundlePath, files,
    metadata: { datasetId: target.datasetId, productionReferenceAt: at(0), generatedAt: target.generatedAt,
      generationId: 'synthetic-nonempty-arrow-diagnosis', zoneCount: 210, partCount: 673,
      modelBinding: expected.modelBinding, contractHashes: expected.contractHashes, privacyClass: 'PRIVATE_PRODUCTION_RUNTIME' } });
  const context = { repositoryRoot: producer, expected, sourceHead: target.sourceHead,
    repository: target.repository, runId: String(target.runId), runAttempt: String(target.runAttempt),
    masterSecret: 'synthetic-test-key-never-real'.repeat(3) };
  await r.sealStagedPrivateProductionRuntime({ ...context, privateRoot, bundlePath, outputPath: cipher });
  const openedBundle = path.join(opened, 'bundle');
  assert.equal((await r.openStagedPrivateProductionRuntime({ ...context,
    privateRoot: opened, bundlePath: openedBundle, inputPath: cipher })).restored, true);
  const before = await fs.readFile(path.join(openedBundle, 'payload/data/live/conditions.json'));
  result = spawnSync('git', ['show', 'HEAD:data/map/current-arrow-land-mask.json'], { maxBuffer: 8 * 1024 * 1024 });
  assert.equal(result.status, 0);
  await fs.writeFile(path.join(maskRoot, 'data/map/current-arrow-land-mask.json'), result.stdout);
  const report = await withoutSavedAuditSecrets(() => inspectSealedArrowScores({ producerRoot: producer,
    privateRoot: opened, bundlePath: openedBundle, maskRoot }));
  assert.equal(report.continuity, 'ORIGINAL_DMI_ONLY');
  assert.equal(report.totals.parts, 673);
  assert.equal(report.totals.storedDmiScoreRows, 673);
  assert.equal(report.totals.dmiScoreSelectionMatches.land, 673);
  assert.equal(report.totals.dmiScoreSelectionMismatches, 0);
  assert.equal(report.totals.arrowPointMismatches, 0);
  assert.equal(report.totals.replayedStates, 673);
  assert.equal(report.totals.authenticNativeMemoryMatches.land, 2019);
  assert.equal(report.totals.unmatchedNativeMemoryEvidence, 0);
  assert.equal(report.scoreCorrectnessProved, false);
  assert.deepEqual(await fs.readFile(path.join(openedBundle, 'payload/data/live/conditions.json')), before);
  assert.doesNotMatch(JSON.stringify(report), /synthetic-item|current-u|waterPoint|synthetic-part|9\.5,56/);
  assert.equal(report.savedScoreStorage.hours, forecastHours);
  assert.equal(report.savedScoreStorage.rows, 1346);
  assert.equal(report.savedScoreStorage.absentPartHours, (forecastHours - 2) * 673);
  assert.equal(report.publicProjection.matched, 1346);
  assert.equal(report.publicProjection.mapLocation.land, 1346);
  assert.equal(report.publicProjection.mismatched, 0);
  assert.equal(report.publicProjection.modeWeatherCompared, 2692);
  assert.equal(report.publicProjection.modeWeatherMismatches, 0);
  assert.equal(report.publicProjection.arrowPointMatched, 1346);
  console.log(JSON.stringify({ kind: 'SYNTHETIC_NONEMPTY_ORIGINAL_ARROW_SEAM', status: 'PASS',
    producerVersion: '4.0.551', parts: 673, matchedProjectionRows: 1346, replayedStates: 673,
    rawVectorsIncluded: false, actualWeatherMeasured: false, nationalCapacityProved: false,
    scoreGenerated: false, sourceCandidateChanged: false }));
} finally {
  // Only the owned fresh temporary directory; never the checkout or a broad root.
  assert.equal(path.dirname(folder), path.resolve(os.tmpdir()));
  assert.equal(path.basename(folder).startsWith('rr-arrow-original-nonempty-'), true);
  await fs.rm(folder, { recursive: true, force: true });
}

});
