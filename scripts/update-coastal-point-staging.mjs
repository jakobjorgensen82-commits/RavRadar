#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildIntegratedRavScoreStateSeries } from '../js/core/ravscore-integrated-state-pipeline.js';
import {
  RAVSCORE_CURRENT_SUPPLY_POLICY,
  RAVSCORE_WAVE_MOBILISATION_POLICY,
  ravScoreModelBinding,
} from '../js/core/ravscore-model-contract.js';
import { buildDmiForecastHourly, createDmiForecastRecord, selectDmiForecastAt } from './lib/dmi-forecast-store.mjs';
import {
  POINT_STAGE_READY,
  POINT_STAGE_SCHEMA_VERSION,
  assertCandidateGCoastalPointMigrationInput,
  assertCoastalPointStageModelBinding,
  assertIntegratedCoastalPointContinuation,
  coastalPointStageIdentity,
} from './lib/coastal-point-staging-contract.mjs';

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const PRIVATE_DMI = path.join(ROOT, '.cache/coastal-point-staging/dmi.json');
const PRIVATE_STATE = path.join(ROOT, '.cache/coastal-point-staging/state.json');
const PRIVATE_STATUS = path.join(ROOT, '.cache/coastal-point-staging/status.json');
const PUBLIC_STATUS = path.join(ROOT, 'data/live/coastal-point-staging-status.json');
const REQUIRED_HORIZON_HOURS = 96;
const MAX_CURRENT_DISTANCE_KM = 5;
const MODEL_BINDING = ravScoreModelBinding();

const finite = value => value !== null && value !== undefined && value !== '' && Number.isFinite(Number(value));
const samePoint = (left, right, tolerance = 1e-7) => Array.isArray(left) && Array.isArray(right)
  && left.length >= 2 && right.length >= 2
  && left.slice(0, 2).every((value, index) => finite(value) && Math.abs(Number(value) - Number(right[index])) <= tolerance);
const read = async (file, fallback = {}) => {
  try { return JSON.parse(await fs.readFile(file, 'utf8')); }
  catch (error) {
    if (error?.code === 'ENOENT') return fallback;
    throw error;
  }
};
const atomicWrite = async (file, value) => {
  await fs.mkdir(path.dirname(file), { recursive: true });
  const temporary = `${file}.${process.pid}.tmp`;
  await fs.writeFile(temporary, `${JSON.stringify(value, null, 2)}\n`);
  await fs.rename(temporary, file);
};
const floorHour = value => new Date(Math.floor(Date.parse(value) / 3_600_000) * 3_600_000).toISOString();
const fromDirection = (u, v) => ((Math.atan2(-Number(u), -Number(v)) * 180 / Math.PI) + 360) % 360;

function forecastFromPrivateZone(stage, dmiDocument, referenceAt) {
  const zone = dmiDocument?.zones?.[stage.stageId];
  const rows = Object.values(zone?.hourly ?? {}).filter(row => Number.isFinite(Date.parse(row?.time)));
  const provenance = row => ({ ...(row.sources ?? {}) });
  const wind = rows.filter(row => finite(row['wind-u-10m']) && finite(row['wind-v-10m'])).map(row => ({
    step: row.time,
    'wind-speed-10m': Math.hypot(Number(row['wind-u-10m']), Number(row['wind-v-10m'])),
    'wind-dir-10m': fromDirection(row['wind-u-10m'], row['wind-v-10m']),
    provenance: { wind: provenance(row).wind },
  }));
  const windTail = rows.filter(row => finite(row['wind-tail-u-10m']) && finite(row['wind-tail-v-10m'])).map(row => ({
    step: row.time,
    'wind-speed-10m': Math.hypot(Number(row['wind-tail-u-10m']), Number(row['wind-tail-v-10m'])),
    'wind-dir-10m': fromDirection(row['wind-tail-u-10m'], row['wind-tail-v-10m']),
    provenance: { wind: provenance(row).windTail },
  }));
  const waves = rows.filter(row => ['significant-wave-height', 'mean-wave-dir', 'dominant-wave-period'].some(key => finite(row[key]))).map(row => ({
    step: row.time,
    'significant-wave-height': finite(row['significant-wave-height']) ? Number(row['significant-wave-height']) : null,
    'mean-wave-dir': finite(row['mean-wave-dir']) ? Number(row['mean-wave-dir']) : null,
    'dominant-wave-period': finite(row['dominant-wave-period']) ? Number(row['dominant-wave-period']) : null,
    provenance: { wave: provenance(row).wave },
  }));
  const ocean = rows.filter(row => ['sea-mean-deviation', 'current-u', 'current-v', 'water-temperature'].some(key => finite(row[key]))).map(row => ({
    step: row.time,
    'sea-mean-deviation': finite(row['sea-mean-deviation']) ? Number(row['sea-mean-deviation']) : null,
    'current-u': finite(row['current-u']) ? Number(row['current-u']) : null,
    'current-v': finite(row['current-v']) ? Number(row['current-v']) : null,
    'water-temperature': finite(row['water-temperature']) ? Number(row['water-temperature']) : null,
    provenance: {
      current: provenance(row).current,
      waterLevel: provenance(row).waterLevel,
      waterTemperature: provenance(row).waterTemperature,
    },
  }));
  const built = buildDmiForecastHourly({
    wind, windTail, waves, ocean,
    generatedAt: referenceAt,
    startAt: referenceAt,
    hours: 120,
    sourceCadenceMinutes: Number(dmiDocument?.timeStrideHours ?? 3) * 60,
  });
  return createDmiForecastRecord({
    zoneId: stage.partId,
    point: stage.waterPoint,
    generatedAt: referenceAt,
    hourly: built.hourly,
    model: { completeness: { forecastCadenceMinutes: 60 } },
  });
}

function componentHorizon(record, referenceAt, keys) {
  const reference = Date.parse(referenceAt);
  const times = (record?.hourly ?? [])
    .filter(row => keys.every(key => finite(row[key])))
    .map(row => Date.parse(row.time))
    .filter(time => Number.isFinite(time) && time >= reference);
  return times.length ? Math.max(0, Math.round((Math.max(...times) - reference) / 3_600_000)) : 0;
}

function verifiedCurrent(sample, stage, dmiDocument) {
  const source = sample?.sources?.current;
  return Boolean(
    finite(sample?.currentUMps)
    && finite(sample?.currentVMps)
    && source?.provider === 'dmi'
    && Number(source?.vectorSemanticsVersion) === Number(dmiDocument?.currentVectorSemanticsVersion)
    && Number(source?.vectorSemanticsVersion) === 3
    && samePoint(source?.samplingPoint, stage.waterPoint)
    && samePoint(source?.gridPoint, source?.gridPoint)
    && finite(source?.distanceKm)
    && Number(source.distanceKm) <= MAX_CURRENT_DISTANCE_KM
  );
}

function legacyMigrationReady(state) {
  return state?.transportMemoryReady === true
    && state?.transportMemoryStatus === 'READY'
    && Number(state?.transportMemoryWindowHours) === 48
    && Number(state?.transportMemoryCoverageHours) >= 48;
}

function initialStageState(previousState, stage, identity) {
  const row = previousState?.stages?.[stage.stageId];
  if (!row) return { state: null, source: 'COLD_START' };
  if (previousState.schemaVersion === 1) {
    if (row.stateKey !== identity.expectedCandidateGStateKey) {
      throw new Error(`${stage.partId}: legacy staging-state har inkompatibel samplingbinding`);
    }
    if (!row.continuationState) return { state: null, source: 'COLD_START' };
    assertCandidateGCoastalPointMigrationInput(
      row.continuationState,
      identity.expectedCandidateGStateKey,
      `${stage.partId} legacy staging-state`,
    );
    return legacyMigrationReady(row.continuationState)
      ? { state: row.continuationState, source: 'CANDIDATE_G_SCHEMA2_MIGRATION' }
      : { state: null, source: 'CANDIDATE_G_INCOMPLETE_COLD_START' };
  }
  if (previousState.schemaVersion !== POINT_STAGE_SCHEMA_VERSION) {
    throw new Error(`${stage.partId}: staging-state har ukendt schema`);
  }
  assertCoastalPointStageModelBinding(
    previousState.ravScoreModelBinding,
    'Coastal-point staging-state model binding',
  );
  assertCoastalPointStageModelBinding(
    row.ravScoreModelBinding,
    `${stage.partId} staging-state model binding`,
  );
  if (row.samplingContextKey !== identity.samplingContextKey) {
    throw new Error(`${stage.partId}: staging-state har inkompatibel sampling context`);
  }
  if (row.continuationState) {
    assertIntegratedCoastalPointContinuation(row.continuationState, {
      samplingContextKey: identity.samplingContextKey,
      label: `${stage.partId} staging-state`,
    });
    return { state: row.continuationState, source: 'INTEGRATED_CONTINUATION' };
  }
  if (row.pendingCandidateGMigrationState) {
    assertCandidateGCoastalPointMigrationInput(
      row.pendingCandidateGMigrationState,
      identity.expectedCandidateGStateKey,
      `${stage.partId} pending Candidate G migration`,
    );
    if (!legacyMigrationReady(row.pendingCandidateGMigrationState)) {
      throw new Error(`${stage.partId}: pending Candidate G migration er ikke READY`);
    }
    return { state: row.pendingCandidateGMigrationState, source: 'CANDIDATE_G_SCHEMA2_MIGRATION' };
  }
  return { state: null, source: row.initialStateSource ?? 'COLD_START' };
}

export async function updateStaging({
  now = new Date().toISOString(),
  productionReference = null,
  privateDmiPath = PRIVATE_DMI,
  privateStatePath = PRIVATE_STATE,
  privateStatusPath = PRIVATE_STATUS,
  publicStatusPath = PUBLIC_STATUS,
} = {}) {
  const referenceAt = floorHour(productionReference ?? process.env.RAVRADAR_PRODUCTION_TARGET_HOUR ?? now);
  const [dmi, previousState] = await Promise.all([
    read(privateDmiPath),
    read(privateStatePath, {
      schemaVersion: POINT_STAGE_SCHEMA_VERSION,
      ravScoreModelBinding: MODEL_BINDING,
      stages: {},
    }),
  ]);
  const stages = Object.entries(dmi?.candidates ?? {}).map(([stageId, value]) => ({ stageId, ...value }));
  if (![1, POINT_STAGE_SCHEMA_VERSION].includes(previousState?.schemaVersion)) {
    throw new Error('Coastal-point staging-state har ukendt schema');
  }
  if (previousState.schemaVersion === POINT_STAGE_SCHEMA_VERSION) {
    assertCoastalPointStageModelBinding(
      previousState.ravScoreModelBinding,
      'Coastal-point staging-state model binding',
    );
  }
  const nextState = {
    schemaVersion: POINT_STAGE_SCHEMA_VERSION,
    ravScoreModelBinding: MODEL_BINDING,
    updatedAt: now,
    stages: {},
  };
  const privateEntries = [];
  const publicEntries = [];
  for (const stage of stages) {
    const identity = coastalPointStageIdentity({
      partId: stage.partId,
      waterPoint: stage.waterPoint,
      onshoreDirectionDeg: stage.onshoreDirectionDeg,
    });
    let record = null;
    let conversionError = null;
    try { record = forecastFromPrivateZone(stage, dmi, referenceAt); }
    catch (error) { conversionError = error instanceof Error ? error.message : String(error); }
    const sample = record ? selectDmiForecastAt(record, referenceAt, { toleranceMinutes: 5 }) : null;
    const currentVerified = verifiedCurrent(sample, stage, dmi);
    const initial = initialStageState(previousState, stage, identity);
    const series = sample ? buildIntegratedRavScoreStateSeries([{
      time: sample.time,
      currentSpeedMps: currentVerified ? sample.currentSpeedMps : null,
      currentAlignment: currentVerified
        ? Math.cos((Number(sample.currentDirectionDeg) - Number(stage.onshoreDirectionDeg)) * Math.PI / 180)
        : null,
      currentVerified,
      waveHeightM: sample.waveHeightM,
      wavePeriodS: sample.wavePeriodS,
    }], {
      samplingContextKey: identity.samplingContextKey,
      initialState: initial.state,
      expectedCandidateGStateKey: identity.expectedCandidateGStateKey,
      nativeCadenceHoldHours: 3,
    }) : null;
    const continuationState = series?.continuationState
      ?? (initial.source === 'INTEGRATED_CONTINUATION' ? initial.state : null);
    if (continuationState) {
      assertIntegratedCoastalPointContinuation(continuationState, {
        samplingContextKey: identity.samplingContextKey,
        label: `${stage.partId} next staging-state`,
      });
    }
    const pendingCandidateGMigrationState = !sample
      && initial.source === 'CANDIDATE_G_SCHEMA2_MIGRATION'
      ? initial.state
      : null;
    const horizons = record ? {
      current: componentHorizon(record, referenceAt, ['currentUMps', 'currentVMps']),
      wave: componentHorizon(record, referenceAt, ['waveHeightM', 'wavePeriodS']),
      wind: componentHorizon(record, referenceAt, ['windSpeedMps', 'windDirectionDeg']),
      waterLevel: componentHorizon(record, referenceAt, ['waterLevelCm']),
    } : { current: 0, wave: 0, wind: 0, waterLevel: 0 };
    const forecastReady = Object.values(horizons).every(hours => hours >= REQUIRED_HORIZON_HOURS);
    const currentMemoryReady = continuationState?.currentMemoryReady === true
      && RAVSCORE_CURRENT_SUPPLY_POLICY.readyStatuses.includes(continuationState?.currentMemoryStatus);
    const waveMemoryReady = continuationState?.waveMemoryReady === true
      && RAVSCORE_WAVE_MOBILISATION_POLICY.readyStatuses.includes(continuationState?.waveMemoryStatus);
    const memoryReady = currentMemoryReady && waveMemoryReady;
    const reasonCodes = [];
    if (conversionError) reasonCodes.push('PRIVATE_DMI_CONVERSION_FAILED');
    if (!currentVerified) reasonCodes.push('CURRENT_GRID_NOT_VERIFIED');
    if (!forecastReady) reasonCodes.push('FORECAST_HORIZON_INCOMPLETE');
    if (!currentMemoryReady) reasonCodes.push('INTEGRATED_CURRENT_MEMORY_WARMUP');
    if (!waveMemoryReady) reasonCodes.push('INTEGRATED_WAVE_MEMORY_WARMUP');
    const status = currentVerified && forecastReady && memoryReady ? POINT_STAGE_READY : 'collecting';
    if (status === POINT_STAGE_READY) {
      assertIntegratedCoastalPointContinuation(continuationState, {
        samplingContextKey: identity.samplingContextKey,
        requireReady: true,
        label: `${stage.partId} READY staging-state`,
      });
    }
    nextState.stages[stage.stageId] = {
      revision: stage.revision,
      partId: stage.partId,
      samplingContextKey: identity.samplingContextKey,
      ravScoreModelBinding: identity.modelBinding,
      continuationState,
      ...(pendingCandidateGMigrationState ? { pendingCandidateGMigrationState } : {}),
      initialStateSource: series?.initialStateSource ?? initial.source,
      migrationApplied: series?.migrationApplied === true,
      updatedAt: now,
    };
    const safe = {
      zoneId: stage.zoneId,
      partId: stage.partId,
      revision: stage.revision,
      status,
      activationRequested: stage.activationRequested === true,
      checkedAt: now,
      currentGridVerified: currentVerified,
      forecastHorizonHours: horizons,
      currentMemoryReady,
      currentMemoryStatus: continuationState?.currentMemoryStatus ?? 'COLD_START',
      currentMemoryCoverageHours: Number(continuationState?.currentMemoryCoverageHours ?? 0),
      currentMemoryWindowHours: Number(continuationState?.currentMemoryWindowHours ?? 48),
      waveMemoryReady,
      waveMemoryStatus: continuationState?.waveMemoryStatus ?? 'COLD_START',
      reasonCodes,
    };
    publicEntries.push(safe);
    privateEntries.push({
      ...safe,
      stageId: stage.stageId,
      samplingContextKey: identity.samplingContextKey,
      ravScoreModelBinding: identity.modelBinding,
      migrationApplied: series?.migrationApplied === true,
    });
  }
  const publicDocument = {
    schemaVersion: POINT_STAGE_SCHEMA_VERSION,
    ravScoreModelBinding: MODEL_BINDING,
    generatedAt: now,
    automaticActivationAllowed: false,
    entries: publicEntries,
  };
  const privateDocument = { ...publicDocument, entries: privateEntries };
  await Promise.all([
    atomicWrite(privateStatePath, nextState),
    atomicWrite(privateStatusPath, privateDocument),
    atomicWrite(publicStatusPath, publicDocument),
  ]);
  return publicDocument;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  updateStaging().then(result => console.log(JSON.stringify({ candidates: result.entries.length, ready: result.entries.filter(entry => entry.status === POINT_STAGE_READY).length }))).catch(error => {
    console.error(error instanceof Error ? error.stack : String(error));
    process.exitCode = 1;
  });
}
