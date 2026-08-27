import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { buildCandidateGDerivedStateSeries } from '../js/core/ravscore-candidate-g-state-pipeline.js';
import { build } from './build-public-coastal-parts-v2.mjs';
import { prepareActivation } from './prepare-coastal-point-activation.mjs';
import { updateStaging } from './update-coastal-point-staging.mjs';
import { bearing, candidateGStateKey, promotedDirectionDocument, stagedEntries } from './lib/coastal-point-staging-contract.mjs';

const root = await fs.mkdtemp(path.join(os.tmpdir(), 'ravradar-point-stage-'));
const write = async (name, value) => {
  const file = path.join(root, name);
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(file, `${JSON.stringify(value, null, 2)}\n`);
  return file;
};
const read = async name => JSON.parse(await fs.readFile(path.join(root, name), 'utf8'));

try {
  const activeParts = JSON.parse(await fs.readFile('data/live/coastal-parts-v2.json', 'utf8'));
  const [zoneId, original] = Object.entries(activeParts.zones)
    .flatMap(([id, parts]) => parts.map(part => [id, part]))
    .find(([, part]) => part.partId === 'dk-b02-06-national-part-02')
    ?? Object.entries(activeParts.zones).flatMap(([id, parts]) => parts.map(part => [id, part]))[0];
  assert.ok(original?.partId, 'Testen kræver mindst én aktiv kystdel');
  const candidate = {
    partId: original.partId,
    name: original.name,
    waterPoint: [Number((original.waterPoint[0] + 0.0001).toFixed(7)), original.waterPoint[1]],
    landPoint: original.landPoint,
    verified: true,
  };
  candidate.onshoreDirectionDeg = bearing(candidate.waterPoint, candidate.landPoint);
  const revision = 'stage-contract-00000001';
  const awaiting = {
    schemaVersion: 3,
    zones: {
      [zoneId]: {
        status: 'verified',
        partOverrides: { [original.partId]: { ...original, verified: true } },
        stagedChange: { revision, status: 'awaiting-validation', partOverrides: { [original.partId]: candidate } },
      },
    },
  };

  const directionPath = await write('direction.json', awaiting);
  const builtPath = path.join(root, 'coastal-parts.json');
  const built = await build({ directionReviews: directionPath, output: builtPath });
  const stillActive = built.zones[zoneId].find(part => part.partId === original.partId);
  assert.deepEqual(stillActive.waterPoint, original.waterPoint, 'En staged kandidat må ikke ændre offentlig sampling');
  assert.equal(stagedEntries(awaiting, activeParts).length, 1);

  const requested = structuredClone(awaiting);
  requested.zones[zoneId].stagedChange.status = 'activation-requested';
  const promoted = promotedDirectionDocument(requested, stagedEntries(requested, activeParts), '2026-08-28T13:00:00.000Z');
  assert.deepEqual(promoted.zones[zoneId].activePartOverrides[original.partId].waterPoint, candidate.waterPoint);
  assert.deepEqual(promoted.zones[zoneId].rollbackPartOverrides[original.partId].waterPoint, original.waterPoint);
  assert.equal(promoted.zones[zoneId].stagedChange, null);

  const reference = '2026-08-28T13:00:00.000Z';
  const stateKey = candidateGStateKey(candidate);
  const historical = Array.from({ length: 50 }, (_, index) => ({
    time: new Date(Date.parse(reference) - (50 - index) * 3_600_000).toISOString(),
    currentSpeedMps: 0.2,
    currentAlignment: 0.8,
    currentVerified: true,
    waveHeightM: 0.7,
    wavePeriodS: 5,
  }));
  const mature = buildCandidateGDerivedStateSeries(historical, { stateKey }).continuationState;
  assert.equal(mature.transportMemoryReady, true);

  const modelRun = '2026-08-28T12:00:00.000Z';
  const rows = Object.fromEntries(Array.from({ length: 41 }, (_, index) => {
    const time = new Date(Date.parse(reference) + index * 3 * 3_600_000).toISOString();
    const common = { provider: 'dmi', modelRun, nativeValidTime: time, fallback: false };
    return [time, {
      time,
      'wind-u-10m': 2,
      'wind-v-10m': 3,
      'wind-tail-u-10m': 2,
      'wind-tail-v-10m': 3,
      'significant-wave-height': 0.7,
      'mean-wave-dir': 250,
      'dominant-wave-period': 5,
      'sea-mean-deviation': 0.1,
      'current-u': 0.12,
      'current-v': 0.16,
      sources: {
        wind: { ...common, collection: 'harmonie_dini_sf' },
        windTail: { ...common, collection: 'dkss_idw' },
        wave: { ...common, collection: 'wam_dw' },
        waterLevel: { ...common, collection: 'dkss_idw' },
        current: {
          ...common,
          collection: 'dkss_idw',
          gridPoint: [candidate.waterPoint[0] + 0.001, candidate.waterPoint[1]],
          samplingPoint: candidate.waterPoint,
          distanceKm: 0.2,
          verticalLayer: 'depthBelowSea:1',
          verticalLayerRankM: 1,
          vectorSemanticsVersion: 3,
        },
      },
    }];
  }));
  const stageId = `STAGED::${revision}::${original.partId}`;
  const privateDmi = {
    schemaVersion: 1,
    generatedAt: reference,
    timeStrideHours: 3,
    currentVectorSemanticsVersion: 3,
    currentVectorSelection: 'test-shared-grid',
    currentPreferredDistanceKm: 3,
    currentMaxDistanceKm: 5,
    candidates: {
      [stageId]: { revision, zoneId, partId: original.partId, waterPoint: candidate.waterPoint, landPoint: candidate.landPoint, onshoreDirectionDeg: candidate.onshoreDirectionDeg, activationRequested: true },
    },
    zones: { [stageId]: { samplingPoint: candidate.waterPoint, hourly: rows, gridPoints: {}, collections: {} } },
  };
  const privateDmiPath = await write('private/dmi.json', privateDmi);
  const privateStatePath = await write('private/state.json', { schemaVersion: 1, stages: { [stageId]: { stateKey, continuationState: mature } } });
  const privateStatusPath = path.join(root, 'private/status.json');
  const publicStatusPath = path.join(root, 'public/status.json');
  const status = await updateStaging({ now: reference, privateDmiPath, privateStatePath, privateStatusPath, publicStatusPath });
  assert.equal(status.entries[0].status, 'ready-for-activation');
  const publicStatusText = await fs.readFile(publicStatusPath, 'utf8');
  assert.equal(publicStatusText.includes(String(candidate.waterPoint[0])), false, 'Offentlig status må ikke lække kandidatkoordinater');
  assert.equal(publicStatusText.includes('current-u'), false, 'Offentlig status må ikke lække rå strømfelter');

  const reviewsPath = await write('activation/reviews.json', requested);
  const activePartsPath = await write('activation/active-parts.json', activeParts);
  const publicDmiPath = await write('activation/public-dmi.json', {
    schemaVersion: 2,
    currentVectorSemanticsVersion: 3,
    zones: { [`PART::${original.partId}`]: { samplingPoint: original.waterPoint, hourly: {} } },
  });
  const syncMetaPath = await write('activation/sync.json', { documents: { 'direction-reviews': { version: 7 } } });
  const injectionPath = path.join(root, 'activation/injection.json');
  const pendingPath = path.join(root, 'activation/pending.json');
  const prepared = await prepareActivation({
    now: reference,
    reviewsPath,
    activePartsPath,
    publicDmiPath,
    privateDmiPath,
    privateStatePath,
    privateStatusPath,
    syncMetaPath,
    injectionPath,
    pendingPath,
  });
  assert.equal(prepared.prepared, true);
  const activatedDmi = (await read('activation/public-dmi.json')).zones[`PART::${original.partId}`];
  assert.deepEqual(activatedDmi.samplingPoint, candidate.waterPoint);
  assert.equal(Number.isFinite(activatedDmi.hourly[reference]['wind-speed-10m']), true);
  assert.equal(Number.isFinite(activatedDmi.hourly[reference]['wind-dir-10m']), true);
  assert.equal(Number.isFinite(activatedDmi.hourly[reference]['wind-tail-speed-10m']), true);
  assert.equal(Number.isFinite(activatedDmi.hourly[reference]['wind-tail-dir-10m']), true);
  assert.equal((await read('activation/injection.json')).states[original.partId].stateKey, stateKey);
  assert.equal((await read('activation/pending.json')).expectedVersion, 7);
  assert.equal((await read('activation/reviews.json')).zones[zoneId].stagedChange, null);

  const recoveryPublicDmiPath = await write('recovery/public-dmi.json', {
    schemaVersion: 2,
    currentVectorSemanticsVersion: 3,
    zones: { [`PART::${original.partId}`]: { samplingPoint: original.waterPoint, hourly: {} } },
  });
  const recoveryInjectionPath = path.join(root, 'recovery/injection.json');
  const recoveryPendingPath = path.join(root, 'recovery/pending.json');
  const recovered = await prepareActivation({
    now: reference,
    reviewsPath,
    activePartsPath,
    publicDmiPath: recoveryPublicDmiPath,
    privateDmiPath,
    privateStatePath,
    privateStatusPath,
    syncMetaPath,
    injectionPath: recoveryInjectionPath,
    pendingPath: recoveryPendingPath,
  });
  assert.equal(recovered.prepared, true);
  assert.equal(recovered.recoveryOnly, true);
  assert.deepEqual((await read('recovery/public-dmi.json')).zones[`PART::${original.partId}`].samplingPoint, candidate.waterPoint);
  await assert.rejects(fs.access(recoveryPendingPath));

  console.log('Staged coastal-point activation contract: OK');
} finally {
  await fs.rm(root, { recursive: true, force: true });
}
