import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { buildCandidateGDerivedStateSeries } from '../js/core/ravscore-candidate-g-state-pipeline.js';
import {
  RAVSCORE_MODEL_BUNDLE_SHA256,
  RAVSCORE_MODEL_CONTRACT_SHA256,
  RAVSCORE_MODEL_ID,
  RAVSCORE_STATE_SCHEMA_VERSION,
  ravScoreModelBinding,
} from '../js/core/ravscore-model-contract.js';
import { build } from './build-public-coastal-parts-v2.mjs';
import { prepareActivation } from './prepare-coastal-point-activation.mjs';
import { updateStaging } from './update-coastal-point-staging.mjs';
import {
  POINT_STAGE_SCHEMA_VERSION,
  assertCoastalPointActivationStateInjection,
  bearing,
  candidateGStateKey,
  coastalPointStageIdentity,
  promotedDirectionDocument,
  stagedEntries,
} from './lib/coastal-point-staging-contract.mjs';

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
  const stageId = `STAGED::${revision}::${original.partId}`;
  const componentKinds = {
    wind: 'atmospheric-wind-vector',
    windTail: 'marine-wind-tail-vector',
    wave: 'wave-mobilisation-tuple',
    current: 'ocean-current-vector',
    waterLevel: 'marine-water-level-scalar',
  };
  const componentFields = {
    wind: ['wind-u-10m', 'wind-v-10m'],
    windTail: ['wind-tail-u-10m', 'wind-tail-v-10m'],
    wave: ['significant-wave-height', 'dominant-wave-period'],
    current: ['current-u', 'current-v'],
    waterLevel: ['sea-mean-deviation'],
  };
  const nativeSource = (component, collection, time) => ({
    provider: 'dmi',
    fallback: false,
    collection,
    collectionFamily: collection === 'harmonie_dini_sf'
      ? 'wind'
      : collection.startsWith('wam_') ? 'wave' : 'marine',
    component,
    componentKind: componentKinds[component],
    fieldSet: componentFields[component],
    optionalFieldSet: component === 'wave' ? ['mean-wave-dir'] : [],
    modelRun,
    nativeValidTime: time,
    leadTimeHours: (Date.parse(time) - Date.parse(modelRun)) / 3_600_000,
    entityId: `STAGED::${original.partId}`,
    parentZoneId: zoneId,
    entityType: 'coastal-part-stage',
    samplingContext: 'coastal-part-water-point',
    samplingPoint: [...candidate.waterPoint],
    gridPoint: [...candidate.waterPoint],
    gridDefinitionSha256: 'a'.repeat(64),
    distanceKm: 0,
    spatialSelection: component === 'wave'
      ? 'nearest-shared-wave-height-period-grid-cell-no-spatial-interpolation'
      : ['waterLevel'].includes(component)
        ? 'nearest-valid-grid-cell-no-spatial-interpolation'
        : 'nearest-shared-grid-cell-no-spatial-interpolation',
    spatialSemanticsVersion: 1,
    itemId: `item-${component}-${time}`,
    assetIdentitySha256: 'b'.repeat(64),
    acquiredAt: modelRun,
    ...(['wind', 'windTail'].includes(component) ? {
      vectorSelection: 'nearest-shared-grid-cell-no-spatial-interpolation',
      vectorSemanticsVersion: 1,
    } : {}),
    ...(component === 'current' ? {
      verticalLayer: 'depthBelowSea:1',
      verticalLayerRankM: 1,
      vectorSelection: 'nearest-shared-uv-column-across-dmi-collections-then-deepest-valid-layer',
      vectorSemanticsVersion: 3,
    } : {}),
  });
  const rows = Object.fromEntries(Array.from({ length: 41 }, (_, index) => {
    const time = new Date(Date.parse(reference) + index * 3 * 3_600_000).toISOString();
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
        wind: nativeSource('wind', 'harmonie_dini_sf', time),
        windTail: nativeSource('windTail', 'dkss_idw', time),
        wave: nativeSource('wave', 'wam_dw', time),
        waterLevel: nativeSource('waterLevel', 'dkss_idw', time),
        current: nativeSource('current', 'dkss_idw', time),
      },
    }];
  }));
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
  const inheritedProductionReference = process.env.RAVRADAR_PRODUCTION_TARGET_HOUR;
  process.env.RAVRADAR_PRODUCTION_TARGET_HOUR = '2026-08-27T23:00:00.000Z';
  const status = await updateStaging({
    now: reference,
    productionReference: reference,
    privateDmiPath,
    privateStatePath,
    privateStatusPath,
    publicStatusPath,
  });
  if (inheritedProductionReference === undefined) delete process.env.RAVRADAR_PRODUCTION_TARGET_HOUR;
  else process.env.RAVRADAR_PRODUCTION_TARGET_HOUR = inheritedProductionReference;
  assert.equal(
    status.entries[0].status,
    'ready-for-activation',
    JSON.stringify(status.entries[0]),
  );
  assert.equal(status.entries[0].currentMemoryReady, true);
  assert.equal(status.entries[0].waveMemoryReady, true);
  assert.deepEqual(status.ravScoreModelBinding, ravScoreModelBinding());
  const publicStatusText = await fs.readFile(publicStatusPath, 'utf8');
  assert.equal(publicStatusText.includes(String(candidate.waterPoint[0])), false, 'Offentlig status må ikke lække kandidatkoordinater');
  assert.equal(publicStatusText.includes('current-u'), false, 'Offentlig status må ikke lække rå strømfelter');
  assert.equal(publicStatusText.includes('samplingContextKey'), false, 'Offentlig status må ikke lække privat sampling-context-hash');

  const identity = coastalPointStageIdentity(candidate);
  const migratedStateDocument = await read('private/state.json');
  const migratedStageState = migratedStateDocument.stages[stageId];
  assert.equal(migratedStateDocument.schemaVersion, POINT_STAGE_SCHEMA_VERSION);
  assert.deepEqual(migratedStateDocument.ravScoreModelBinding, ravScoreModelBinding());
  assert.equal(migratedStageState.samplingContextKey, identity.samplingContextKey);
  assert.equal(migratedStageState.initialStateSource, 'CANDIDATE_G_SCHEMA2_MIGRATION');
  assert.equal(migratedStageState.migrationApplied, true);
  assert.equal(migratedStageState.continuationState.schemaVersion, RAVSCORE_STATE_SCHEMA_VERSION);
  assert.equal(migratedStageState.continuationState.modelId, RAVSCORE_MODEL_ID);
  assert.equal(migratedStageState.continuationState.modelContractSha256, RAVSCORE_MODEL_CONTRACT_SHA256);
  assert.equal(migratedStageState.continuationState.modelBundleSha256, RAVSCORE_MODEL_BUNDLE_SHA256);
  assert.equal(migratedStageState.continuationState.samplingContextKey, identity.samplingContextKey);
  assert.equal(migratedStageState.continuationState.currentMemoryReady, true);
  assert.equal(migratedStageState.continuationState.waveMemoryReady, true);
  assert.equal(Object.hasOwn(migratedStageState, 'stateKey'), false, 'Legacy stateKey må ikke bestå efter migration');
  assert.equal(Object.hasOwn(migratedStageState, 'pendingCandidateGMigrationState'), false);

  const migratedEvidence = structuredClone(migratedStageState.continuationState.currentEvidence);
  const continuedStatus = await updateStaging({
    now: reference,
    productionReference: reference,
    privateDmiPath,
    privateStatePath,
    privateStatusPath,
    publicStatusPath,
  });
  assert.equal(continuedStatus.entries[0].status, 'ready-for-activation');
  const continuedStageState = (await read('private/state.json')).stages[stageId];
  assert.equal(continuedStageState.initialStateSource, 'INTEGRATED_CONTINUATION');
  assert.equal(continuedStageState.migrationApplied, false, 'Candidate G-state må kun migreres én gang');
  assert.deepEqual(continuedStageState.continuationState.currentEvidence, migratedEvidence,
    'Samme produktionstime må ikke dobbeltkreditere migreret strømstate');

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

  await write('private/state.json', {
    schemaVersion: 1,
    stages: { [stageId]: { stateKey, continuationState: mature } },
  });
  await write('private/status.json', { schemaVersion: 1, generatedAt: reference, entries: [] });
  const rolloutReviewsPath = await write('rollout/reviews.json', requested);
  const rolloutActivePartsPath = await write('rollout/active-parts.json', activeParts);
  const rolloutPublicDmiPath = await write('rollout/public-dmi.json', {
    schemaVersion: 2,
    currentVectorSemanticsVersion: 3,
    zones: { [`PART::${original.partId}`]: { samplingPoint: original.waterPoint, hourly: {} } },
  });
  const rolloutSyncMetaPath = await write('rollout/sync.json', { documents: { 'direction-reviews': { version: 7 } } });
  const rolloutInjectionPath = path.join(root, 'rollout/injection.json');
  const rolloutPendingPath = path.join(root, 'rollout/pending.json');
  const rolloutPublicStatusPath = path.join(root, 'rollout/status.json');
  const rolloutPrepared = await prepareActivation({
    now: reference,
    productionReference: reference,
    reviewsPath: rolloutReviewsPath,
    activePartsPath: rolloutActivePartsPath,
    publicDmiPath: rolloutPublicDmiPath,
    privateDmiPath,
    privateStatePath,
    privateStatusPath,
    publicStatusPath: rolloutPublicStatusPath,
    syncMetaPath: rolloutSyncMetaPath,
    injectionPath: rolloutInjectionPath,
    pendingPath: rolloutPendingPath,
  });
  assert.equal(rolloutPrepared.prepared, true);
  assert.equal(rolloutPrepared.stagingMigrationApplied, true,
    'Første modelrollout skal migrere en gendannet Candidate G-cache før aktivering');
  assertCoastalPointActivationStateInjection(await read('rollout/injection.json'));

  const canonicalStateDocument = await read('private/state.json');
  const tamperedStateDocument = structuredClone(canonicalStateDocument);
  tamperedStateDocument.stages[stageId].continuationState.modelBundleSha256 = 'wrong-model-bundle';
  await write('private/state.json', tamperedStateDocument);
  await assert.rejects(prepareActivation({
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
  }), /incompatible model metadata/,
  'Et ændret modelbundle skal stoppe aktivering');
  await write('private/state.json', canonicalStateDocument);

  const canonicalStatusDocument = await read('private/status.json');
  const missingWaveStatus = structuredClone(canonicalStatusDocument);
  missingWaveStatus.entries[0].waveMemoryReady = false;
  await write('private/status.json', missingWaveStatus);
  await assert.rejects(prepareActivation({
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
  }), /mangler eksakt integreret modeltilstand/,
  'READY uden wave-readiness skal stoppe aktivering');
  await write('private/status.json', canonicalStatusDocument);

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
  const injection = await read('activation/injection.json');
  const injectedStates = assertCoastalPointActivationStateInjection(injection);
  assert.equal(injection.schemaVersion, POINT_STAGE_SCHEMA_VERSION);
  assert.deepEqual(injection.ravScoreModelBinding, ravScoreModelBinding());
  assert.equal(injectedStates[original.partId].schemaVersion, RAVSCORE_STATE_SCHEMA_VERSION);
  assert.equal(injectedStates[original.partId].modelId, RAVSCORE_MODEL_ID);
  assert.equal(injectedStates[original.partId].modelContractSha256, RAVSCORE_MODEL_CONTRACT_SHA256);
  assert.equal(injectedStates[original.partId].modelBundleSha256, RAVSCORE_MODEL_BUNDLE_SHA256);
  assert.equal(injectedStates[original.partId].samplingContextKey, identity.samplingContextKey);
  assert.equal(injectedStates[original.partId].currentMemoryReady, true);
  assert.equal(injectedStates[original.partId].waveMemoryReady, true);
  assert.equal(Object.hasOwn(injectedStates[original.partId], 'stateKey'), false);
  const wrongInjectionBundle = structuredClone(injection);
  wrongInjectionBundle.ravScoreModelBinding.modelBundleSha256 = 'wrong-model-bundle';
  assert.throws(() => assertCoastalPointActivationStateInjection(wrongInjectionBundle), /incompatible modelBundleSha256/,
    'En activation-injektion fra et andet modelbundle skal afvises');
  const rawVectorInjection = structuredClone(injection);
  rawVectorInjection.states[original.partId].currentEvidence[0].currentUMps = 0.12;
  assert.throws(() => assertCoastalPointActivationStateInjection(rawVectorInjection), /forbidden field|canonical field-allowlist/,
    'Ekstra rå U/V-felter skal afvises rekursivt');
  const coordinateInjection = structuredClone(injection);
  coordinateInjection.states[original.partId].samplingPoint = candidate.waterPoint;
  assert.throws(() => assertCoastalPointActivationStateInjection(coordinateInjection), /forbidden field|canonical field-allowlist/,
    'Koordinater skal afvises rekursivt i activation-state');
  const injectionText = await fs.readFile(injectionPath, 'utf8');
  assert.doesNotMatch(injectionText, /"(?:waterPoint|landPoint|samplingPoint|gridPoint|currentUMps|currentVMps|current-u|current-v)"/,
    'Activation-state må ikke indeholde koordinater eller rå strømkomponenter');
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
  assert.deepEqual((await read('recovery/injection.json')).ravScoreModelBinding, ravScoreModelBinding());
  await assert.rejects(fs.access(recoveryPendingPath));

  const updater = await fs.readFile('scripts/update-weather.mjs', 'utf8');
  assert.match(updater, /assertCoastalPointActivationStateInjection\(document\)/,
    'update-weather skal forbruge den validerede schema-4-injektion direkte');
  assert.doesNotMatch(updater, /document\?\.schemaVersion === 1 && document\?\.states/,
    'update-weather må ikke fortsætte med legacy schema-1-injektionslæser');

  console.log('Staged coastal-point activation contract: OK');
} finally {
  await fs.rm(root, { recursive: true, force: true });
}
