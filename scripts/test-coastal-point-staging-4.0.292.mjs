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
  selectCoastalPointCandidateGRollbackContinuation,
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
assert.equal(bearing([0, 0], [-0.00001, 1]), 0, 'Staged nordlig retning skal normaliseres fra afrundet 360 til 0 grader');

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

  const stageId = `STAGED::${revision}::${original.partId}`;
  const modelRun = new Date(Date.parse(reference) - 48 * 3_600_000).toISOString();
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
    entityId: stageId,
    parentZoneId: zoneId,
    entityType: 'private-stage',
    samplingContext: 'private-stage-water-point',
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
  const rows = Object.fromEntries(Array.from({ length: 57 }, (_, index) => {
    const time = new Date(
      Date.parse(reference) + (index * 3 - 48) * 3_600_000,
    ).toISOString();
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
    currentVectorSelection: 'nearest-shared-uv-column-across-dmi-collections-then-deepest-valid-layer',
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

  const coldStatePath = await write('cold/state.json', {
    schemaVersion: POINT_STAGE_SCHEMA_VERSION,
    ravScoreModelBinding: ravScoreModelBinding(),
    stages: {},
  });
  const coldStatus = await updateStaging({
    now: reference,
    productionReference: reference,
    privateDmiPath,
    privateStatePath: coldStatePath,
    privateStatusPath: path.join(root, 'cold/private-status.json'),
    publicStatusPath: path.join(root, 'cold/public-status.json'),
  });
  assert.equal(coldStatus.entries[0].status, 'ready-for-activation',
    'Et cold start skal genbruge den verificerede private cache og blive target-ready straks');
  const coldStageState = (await read('cold/state.json')).stages[stageId];
  assert.equal(coldStageState.initialStateSource, 'VERIFIED_PRIVATE_48H_COLD_REPLAY');
  assert.equal(coldStageState.continuationState.time, reference);
  assert.equal(coldStageState.candidateGRollbackContinuationState.time, reference);
  assert.equal(coldStageState.candidateGRollbackContinuationState.transportMemoryReady, true);

  const schemaTwoStatePath = await write('schema-two/state.json', {
    schemaVersion: 2,
    ravScoreModelBinding: ravScoreModelBinding(),
    stages: {
      [stageId]: {
        revision,
        partId: original.partId,
        samplingContextKey: identity.samplingContextKey,
        ravScoreModelBinding: ravScoreModelBinding(),
        continuationState: null,
        pendingCandidateGMigrationState: mature,
      },
    },
  });
  const schemaTwoStatus = await updateStaging({
    now: reference,
    productionReference: reference,
    privateDmiPath,
    privateStatePath: schemaTwoStatePath,
    privateStatusPath: path.join(root, 'schema-two/private-status.json'),
    publicStatusPath: path.join(root, 'schema-two/public-status.json'),
  });
  assert.equal(schemaTwoStatus.entries[0].status, 'ready-for-activation');
  assert.equal((await read('schema-two/state.json')).schemaVersion, POINT_STAGE_SCHEMA_VERSION,
    'Transitional schema-2 Candidate G-pending state skal migreres til et komplet dual-state-par');
  const orphanIntegratedStatePath = await write('orphan-integrated/state.json', {
    schemaVersion: 2,
    ravScoreModelBinding: ravScoreModelBinding(),
    stages: {
      [stageId]: {
        revision,
        partId: original.partId,
        samplingContextKey: identity.samplingContextKey,
        ravScoreModelBinding: ravScoreModelBinding(),
        continuationState: migratedStageState.continuationState,
      },
    },
  });
  await assert.rejects(updateStaging({
    now: reference,
    productionReference: reference,
    privateDmiPath,
    privateStatePath: orphanIntegratedStatePath,
    privateStatusPath: path.join(root, 'orphan-integrated/private-status.json'),
    publicStatusPath: path.join(root, 'orphan-integrated/public-status.json'),
  }), /mangler atomisk Candidate G companion/,
  'En integrated-only transitional state må aldrig aktiveres uden rollback-companion');

  const expiredTarget = new Date(
    Date.parse(reference) + 73 * 3_600_000,
  ).toISOString();
  const expiredStatePath = await write('expired/state.json', {
    schemaVersion: POINT_STAGE_SCHEMA_VERSION,
    ravScoreModelBinding: ravScoreModelBinding(),
    stages: { [stageId]: continuedStageState },
  });
  await updateStaging({
    now: expiredTarget,
    productionReference: expiredTarget,
    privateDmiPath,
    privateStatePath: expiredStatePath,
    privateStatusPath: path.join(root, 'expired/private-status.json'),
    publicStatusPath: path.join(root, 'expired/public-status.json'),
  });
  const expiredRebuilt = (await read('expired/state.json')).stages[stageId];
  assert.equal(expiredRebuilt.initialStateSource, 'VERIFIED_PRIVATE_48H_COLD_REPLAY');
  assert.equal(expiredRebuilt.continuationState.time, expiredTarget);
  assert.equal(expiredRebuilt.candidateGRollbackContinuationState.time, expiredTarget);
  assert.notEqual(expiredRebuilt.candidateGInitialStateSource, 'CANDIDATE_G_CONTINUATION',
    'En >72h gammel dual-state må ikke genaktiveres som continuation');

  const mixedWaveDmi = structuredClone(privateDmi);
  const mixedWaveTime = new Date(Date.parse(reference) - 21 * 3_600_000).toISOString();
  const mixedWaveRun = new Date(Date.parse(mixedWaveTime) - 6 * 3_600_000).toISOString();
  mixedWaveDmi.zones[stageId].hourly[mixedWaveTime].sources.wave.modelRun = mixedWaveRun;
  mixedWaveDmi.zones[stageId].hourly[mixedWaveTime].sources.wave.leadTimeHours = 6;
  mixedWaveDmi.zones[stageId].hourly[mixedWaveTime].sources.wave.acquiredAt = mixedWaveRun;
  const mixedWaveDmiPath = await write('mixed-wave/dmi.json', mixedWaveDmi);
  const mixedWaveStatePath = await write('mixed-wave/state.json', {
    schemaVersion: 1,
    stages: { [stageId]: { stateKey, continuationState: mature } },
  });
  const mixedWaveStatus = await updateStaging({
    now: reference,
    productionReference: reference,
    privateDmiPath: mixedWaveDmiPath,
    privateStatePath: mixedWaveStatePath,
    privateStatusPath: path.join(root, 'mixed-wave/private-status.json'),
    publicStatusPath: path.join(root, 'mixed-wave/public-status.json'),
  });
  assert.equal(mixedWaveStatus.entries[0].status, 'collecting');
  assert.ok(mixedWaveStatus.entries[0].reasonCodes
    .includes('INTEGRATED_MIGRATION_WAVE_BOOTSTRAP_INCOMPLETE'),
  'Mixed WAM provenance skal afvente en komplet bro uden at opfinde retning');
  const mixedWaveStageState = (await read('mixed-wave/state.json')).stages[stageId];
  assert.equal(mixedWaveStageState.continuationState, null);
  assert.equal(mixedWaveStageState.candidateGRollbackContinuationState.time, reference,
    'Candidate G companion må fortsat avanceres fra verificerede mål-data');

  const tamperedPrivateDmi = structuredClone(privateDmi);
  tamperedPrivateDmi.zones[stageId].hourly[reference].sources.current.entityId = 'STAGED::wrong';
  const tamperedPrivateDmiPath = await write('tampered-private/dmi.json', tamperedPrivateDmi);
  await assert.rejects(updateStaging({
    now: reference,
    productionReference: reference,
    privateDmiPath: tamperedPrivateDmiPath,
    privateStatePath: path.join(root, 'tampered-private/state.json'),
    privateStatusPath: path.join(root, 'tampered-private/private-status.json'),
    publicStatusPath: path.join(root, 'tampered-private/public-status.json'),
  }), /privat DMI-proveniens er ugyldig/,
  'Manipuleret private-stage-identitet skal stoppe hårdt før state-skrivning');

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
  }), /mangler eksakt dual-state modeltilstand/,
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
  assert.equal(activatedDmi.entityId, `PART::${original.partId}`);
  assert.equal(activatedDmi.parentZoneId, zoneId);
  assert.equal(activatedDmi.entityType, 'coastal-part');
  assert.equal(activatedDmi.samplingContext, 'coastal-part-water-point');
  for (const hour of Object.values(activatedDmi.hourly)) {
    for (const source of Object.values(hour.sources ?? {})) {
      if (source?.provider !== 'dmi') continue;
      assert.equal(source.entityId, `PART::${original.partId}`);
      assert.equal(source.parentZoneId, zoneId);
      assert.equal(source.entityType, 'coastal-part');
      assert.equal(source.samplingContext, 'coastal-part-water-point');
    }
  }
  const injection = await read('activation/injection.json');
  const injectedPairs = assertCoastalPointActivationStateInjection(injection);
  const injectedPair = injectedPairs[original.partId];
  const injectedState = injectedPair.integratedState;
  const injectedCandidateG = injectedPair.candidateGState;
  assert.equal(injection.schemaVersion, POINT_STAGE_SCHEMA_VERSION);
  assert.deepEqual(injection.ravScoreModelBinding, ravScoreModelBinding());
  assert.equal(injectedState.schemaVersion, RAVSCORE_STATE_SCHEMA_VERSION);
  assert.equal(injectedState.modelId, RAVSCORE_MODEL_ID);
  assert.equal(injectedState.modelContractSha256, RAVSCORE_MODEL_CONTRACT_SHA256);
  assert.equal(injectedState.modelBundleSha256, RAVSCORE_MODEL_BUNDLE_SHA256);
  assert.equal(injectedState.samplingContextKey, identity.samplingContextKey);
  assert.equal(injectedState.currentMemoryReady, true);
  assert.equal(injectedState.waveMemoryReady, true);
  assert.equal(Object.hasOwn(injectedState, 'stateKey'), false);
  assert.equal(injectedCandidateG.stateKey, stateKey);
  assert.equal(injectedCandidateG.transportMemoryReady, true);
  assert.equal(injectedPair.targetReferenceAt, reference);
  assert.equal(injectedState.time, injectedCandidateG.time);
  const wrongInjectionBundle = structuredClone(injection);
  wrongInjectionBundle.ravScoreModelBinding.modelBundleSha256 = 'wrong-model-bundle';
  assert.throws(() => assertCoastalPointActivationStateInjection(wrongInjectionBundle), /incompatible modelBundleSha256/,
    'En activation-injektion fra et andet modelbundle skal afvises');
  const rawVectorInjection = structuredClone(injection);
  rawVectorInjection.statePairs[original.partId].integratedState.currentEvidence[0].currentUMps = 0.12;
  assert.throws(() => assertCoastalPointActivationStateInjection(rawVectorInjection), /forbidden field|canonical field-allowlist/,
    'Ekstra rå U/V-felter skal afvises rekursivt');
  const coordinateInjection = structuredClone(injection);
  coordinateInjection.statePairs[original.partId].integratedState.samplingPoint = candidate.waterPoint;
  assert.throws(() => assertCoastalPointActivationStateInjection(coordinateInjection), /forbidden field|canonical field-allowlist/,
    'Koordinater skal afvises rekursivt i activation-state');
  const integratedTamper = structuredClone(injection);
  integratedTamper.statePairs[original.partId].integratedState.supplyPotential += 0.01;
  assert.throws(() => assertCoastalPointActivationStateInjection(integratedTamper), /dual-state-hashbinding|contradicts its signed current evidence/,
    'Integrated state-tamper skal bryde den atomiske hashbinding');
  const candidateTamper = structuredClone(injection);
  candidateTamper.statePairs[original.partId].candidateGState.transportPotential += 0.01;
  assert.throws(() => assertCoastalPointActivationStateInjection(candidateTamper), /dual-state-hashbinding|Candidate G-oraklet/,
    'Candidate G companion-tamper skal bryde den atomiske hashbinding');
  const crossPart = structuredClone(injection);
  crossPart.statePairs[`other-${original.partId}`] = crossPart.statePairs[original.partId];
  delete crossPart.statePairs[original.partId];
  assert.throws(() => assertCoastalPointActivationStateInjection(crossPart), /dual-state-hashbinding/,
    'En state-pair må ikke flyttes til en anden kystdel');
  const crossTarget = structuredClone(injection);
  crossTarget.statePairs[original.partId].targetReferenceAt = new Date(
    Date.parse(reference) + 3_600_000,
  ).toISOString();
  assert.throws(() => assertCoastalPointActivationStateInjection(crossTarget), /forskellig targettid/,
    'En state-pair må ikke flyttes til en anden targettime');
  const selectedCompanion = selectCoastalPointCandidateGRollbackContinuation({
    partId: original.partId,
    part: candidate,
    initialSelection: { source: 'POINT_ACTIVATION', state: injectedState },
    pointActivationStatePairs: injectedPairs,
    privateCandidateGContinuation: mature,
    checkpointCandidateGContinuation: mature,
    targetReferenceAt: reference,
  });
  assert.equal(selectedCompanion.source, 'POINT_ACTIVATION_COMPANION');
  assert.deepEqual(selectedCompanion.state, injectedCandidateG,
    'Kun den punktbundne companion må vinde over gamle private/checkpoint states');
  assert.throws(() => selectCoastalPointCandidateGRollbackContinuation({
    partId: original.partId,
    part: candidate,
    initialSelection: { source: 'POINT_ACTIVATION', state: injectedState },
    pointActivationStatePairs: injectedPairs,
    targetReferenceAt: new Date(Date.parse(reference) + 3_600_000).toISOString(),
  }), /exact atomic Candidate G companion/,
  'En old-point companion fra en anden targettime skal afvises');
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
    'update-weather skal forbruge den validerede schema-3 dual-state-injektion direkte');
  assert.doesNotMatch(updater, /document\?\.schemaVersion === 1 && document\?\.states/,
    'update-weather må ikke fortsætte med legacy schema-1-injektionslæser');

  console.log('Staged coastal-point activation contract: OK');
} finally {
  await fs.rm(root, { recursive: true, force: true });
}
