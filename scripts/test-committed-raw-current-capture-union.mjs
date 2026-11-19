import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { collectPublishedRawCurrentCaptureUnion } from './lib/committed-raw-current-capture-union.mjs';
import { packDmiPartContinuity } from './lib/dmi-part-continuity.mjs';
import { inspectDmiForecastFile, writeDmiForecastFileAtomic } from './lib/dmi-forecast-file.mjs';
import { buildPrivateDmiRecoveryRecord } from './lib/private-dmi-recovery-record.mjs';
import { buildProtectedDmiNativeCurrentProofs } from './lib/protected-dmi-native-current-proofs.mjs';
import { dmiExpectedIdentityForPart } from './lib/ravscore-production-adapters.mjs';
import { canonicalSavedDmiOriginalCapture } from './lib/saved-dmi-original-capture.mjs';
import { selectQualifiedWeatherComponent } from './lib/weather-component-selection.mjs';

const sha = text => crypto.createHash('sha256').update(text).digest('hex');
const h0 = Date.parse('2026-10-18T00:00:00.000Z');
const at = hours => new Date(h0 + hours * 3_600_000).toISOString();

test('ordinary RAW capture union retains earlier bank-only DMI and refuses absent original coverage', async t => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'rr-raw-capture-union-'));
  const file = path.join(directory, 'forecast.json');
  t.after(async () => {
    await fs.unlink(file).catch(error => { if (error.code !== 'ENOENT') throw error; });
    await fs.rmdir(directory);
  });
  const part = { partId: 'SYNTHETIC-RAW-PART', zoneId: 'DK-B01-01',
    waterPoint: [8, 55], landPoint: [8.001, 55], onshoreDirectionDeg: 90 };
  const identity = dmiExpectedIdentityForPart(part);
  const vectorSelection = 'nearest-shared-uv-column-across-dmi-collections-then-deepest-valid-layer';
  const native = {
    provider: 'dmi', fallback: false, collection: 'dkss_nsbs', collectionFamily: 'marine',
    component: 'current', componentKind: 'ocean-current-vector', fieldSet: ['current-u', 'current-v'],
    optionalFieldSet: [], spatialSelection: 'nearest-shared-grid-cell-no-spatial-interpolation',
    vectorSemanticsVersion: 3, vectorSelection, verticalLayer: 'depth:1', verticalLayerRankM: 1,
    ...identity, modelRun: at(-24), nativeValidTime: at(2), leadTimeHours: 26,
    itemId: 'synthetic-native', assetIdentitySha256: sha('asset'), assetSizeBytes: 1234,
    acquiredAt: at(-1), contentLengthBytes: 1234, contentSha256: sha('original bytes'),
    itemCreatedAt: at(-24), itemUpdatedAt: at(-23), gridPoint: part.waterPoint,
    gridDefinitionSha256: sha('grid'), distanceKm: 0, spatialSemanticsVersion: 1,
  };
  const protectedBulk = { generatedAt: at(0), currentVectorSemanticsVersion: 3,
    currentVectorSelection: vectorSelection, currentMaxDistanceKm: 5, timeStrideHours: 3,
    zones: { [identity.entityId]: { ...identity, hourly: {} } } };
  const originalDocument = { ...protectedBulk, zones: { [identity.entityId]: { ...identity, hourly: {
    [at(2)]: { time: at(2), 'current-u': 0.1, 'current-v': 0.2, sources: { current: native } },
  } } } };
  const record = buildPrivateDmiRecoveryRecord({
    properties: { id: identity.entityId, dataPoint: part.waterPoint },
  }, originalDocument, at(0), { startAt: at(0), expectedIdentity: identity });
  const selections = record.hourly.filter(row => Number.isFinite(row.currentUMps)).map(row => ({ part, row }));
  assert(selections.some(({ row }) => row.time === at(2)));
  const bank = buildProtectedDmiNativeCurrentProofs({ selections, contexts: [originalDocument] });
  const lateReserve = { provider: 'copernicus', modelRun: at(-6), sourceResponseSha256: 'sha256:' + sha('response') };
  lateReserve.modelReference = { kind: 'response-forecast-reference-time', modelRun: lateReserve.modelRun,
    payloadSha256: lateReserve.sourceResponseSha256 };
  const contenders = [{ source: native }, { source: lateReserve }];
  const winner = offset => selectQualifiedWeatherComponent(contenders, {
    component: 'current', productionReferenceAt: at(offset), admit: candidate => candidate.source,
  }).candidate.source;
  assert.equal(winner(4), native);
  assert.equal(winner(72), lateReserve);

  const boundary = { datasetId: 'rr-synthetic', productionReferenceAt: at(0),
    bundleContentSha256: sha('B'), checkpointGenerationSha256: sha('S'), conditionsSha256: sha('conditions') };
  let verified = 0;
  const view = {
    registry: { zones: { [part.zoneId]: [part] }, partCount: 1 },
    conditions: { ...boundary, coastalParts: { parts: { [part.partId]: {} } } },
    checkpoint: { ...boundary, generationSha256: boundary.checkpointGenerationSha256,
      states: { [part.partId]: { time: boundary.productionReferenceAt } } },
    boundary, zones: { features: [{ properties: { id: part.zoneId } }] },
    protectedBulk, progressCandidate: null, progressActive: null, historicalBulk: null,
    protectedCompanionContexts: [], transportCaptures: [],
    verify: async () => { verified += 1; },
  };
  const save = async originals => {
    const partContinuity = await packDmiPartContinuity(new Map([[part.partId, record]]), [part],
      boundary.productionReferenceAt, { nativeCurrentProofsByPart: new Map([[part.partId, originals]]) });
    await writeDmiForecastFileAtomic(file, { schemaVersion: 2, zones: {}, partContinuity });
    return inspectDmiForecastFile(file);
  };
  const capture = canonicalSavedDmiOriginalCapture(native);
  const forecast = await save(bank);
  const plan = await collectPublishedRawCurrentCaptureUnion({ ...view, forecast });
  assert.deepEqual(plan, { schemaVersion: 1, kind: 'PUBLISHED_ORDINARY_RAW_CAPTURE_UNION',
    boundary, captures: [capture] });
  assert.equal(verified, 2);

  const missingBank = await save(null);
  await assert.rejects(collectPublishedRawCurrentCaptureUnion({ ...view, forecast: missingBank }),
    /RAW_CAPTURE_UNION_SAVED_ENDPOINT_UNPROVED/);
  const companion = await collectPublishedRawCurrentCaptureUnion({
    ...view, forecast: missingBank, protectedCompanionContexts: [originalDocument],
  });
  assert.deepEqual(companion.captures, [capture]);
  await assert.rejects(collectPublishedRawCurrentCaptureUnion({
    ...view, forecast: missingBank, transportCaptures: undefined,
  }), /RAW_CAPTURE_UNION_ROLE_UNPROVED/);
});
