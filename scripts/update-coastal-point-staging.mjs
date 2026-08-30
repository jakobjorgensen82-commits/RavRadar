#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildCandidateGDerivedStateSeries } from '../js/core/ravscore-candidate-g-state-pipeline.js';
import { buildIntegratedRavScoreStateSeries } from '../js/core/ravscore-integrated-state-pipeline.js';
import {
  RAVSCORE_CURRENT_SUPPLY_POLICY,
  RAVSCORE_RECOVERY_POLICY,
  RAVSCORE_WAVE_MOBILISATION_POLICY,
  ravScoreModelBinding,
} from '../js/core/ravscore-model-contract.js';
import { buildDmiForecastHourly, createDmiForecastRecord, selectDmiForecastAt } from './lib/dmi-forecast-store.mjs';
import {
  POINT_STAGE_READY,
  POINT_STAGE_SCHEMA_VERSION,
  assertCandidateGCoastalPointRollbackContinuation,
  assertCoastalPointStageModelBinding,
  assertIntegratedCoastalPointContinuation,
  coastalPointStageIdentity,
} from './lib/coastal-point-staging-contract.mjs';
import { projectVerifiedPrivateStageDmiZoneToPart } from './lib/coastal-point-stage-dmi-adapter.mjs';
import {
  buildRavScoreRecoveryReplay,
  RAVSCORE_RECOVERY_REPLAY_MAXIMUM_AGE_HOURS,
  ravScoreRecoverySourceStartAt,
} from './lib/ravscore-recovery-replay.mjs';
import { verifiedIntegratedPartHourly } from './lib/ravscore-production-adapters.mjs';

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const PRIVATE_DMI = path.join(ROOT, '.cache/coastal-point-staging/dmi.json');
const PRIVATE_STATE = path.join(ROOT, '.cache/coastal-point-staging/state.json');
const PRIVATE_STATUS = path.join(ROOT, '.cache/coastal-point-staging/status.json');
const PUBLIC_STATUS = path.join(ROOT, 'data/live/coastal-point-staging-status.json');
const REQUIRED_HORIZON_HOURS = 96;
const MODEL_BINDING = ravScoreModelBinding();

const finite = value => value !== null && value !== undefined && value !== '' && Number.isFinite(Number(value));
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

function forecastFromPrivateZone(
  stage,
  dmiDocument,
  referenceAt,
  {
    projectedZone = null,
    startAt = referenceAt,
    hours = 120,
  } = {},
) {
  const zone = projectedZone ?? projectVerifiedPrivateStageDmiZoneToPart(
    dmiDocument?.zones?.[stage.stageId],
    {
      stageId: stage.stageId,
      zoneId: stage.zoneId,
      part: { ...stage, zoneId: stage.zoneId },
    },
  );
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
    startAt,
    hours,
    sourceCadenceMinutes: Number(dmiDocument?.timeStrideHours ?? 3) * 60,
  });
  return createDmiForecastRecord({
    zoneId: `PART::${stage.partId}`,
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

function legacyMigrationReady(state) {
  return state?.transportMemoryReady === true
    && state?.transportMemoryStatus === 'READY'
    && Number(state?.transportMemoryWindowHours) === 48
    && Number(state?.transportMemoryCoverageHours) >= 48;
}

function initialStageState(previousState, stage, identity) {
  const row = previousState?.stages?.[stage.stageId];
  const cold = {
    integratedState: null,
    candidateGState: null,
    integratedSource: 'COLD_START',
    candidateGSource: 'COLD_START',
  };
  if (!row) return cold;
  if (previousState.schemaVersion === 1) {
    if (row.stateKey !== identity.expectedCandidateGStateKey) {
      throw new Error(`${stage.partId}: legacy staging-state har inkompatibel samplingbinding`);
    }
    if (!row.continuationState) return cold;
    assertCandidateGCoastalPointRollbackContinuation(
      row.continuationState,
      identity.expectedCandidateGStateKey,
      { label: `${stage.partId} legacy staging-state` },
    );
    return {
      integratedState: legacyMigrationReady(row.continuationState)
        ? row.continuationState
        : null,
      candidateGState: row.continuationState,
      integratedSource: legacyMigrationReady(row.continuationState)
        ? 'CANDIDATE_G_SCHEMA2_MIGRATION'
        : 'CANDIDATE_G_INCOMPLETE_COLD_START',
      candidateGSource: 'CANDIDATE_G_SCHEMA1_CONTINUATION',
    };
  }
  if (![2, POINT_STAGE_SCHEMA_VERSION].includes(previousState.schemaVersion)) {
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
  const candidateGState = row.candidateGRollbackContinuationState
    ?? row.pendingCandidateGMigrationState
    ?? null;
  if (candidateGState) {
    assertCandidateGCoastalPointRollbackContinuation(
      candidateGState,
      identity.expectedCandidateGStateKey,
      { label: `${stage.partId} staging Candidate G companion` },
    );
  }
  if (row.continuationState) {
    assertIntegratedCoastalPointContinuation(row.continuationState, {
      samplingContextKey: identity.samplingContextKey,
      label: `${stage.partId} staging-state`,
    });
    if (!candidateGState) {
      throw new Error(`${stage.partId}: integrated staging-state mangler atomisk Candidate G companion`);
    }
    if (row.continuationState.time !== candidateGState.time) {
      throw new Error(`${stage.partId}: staging dual-state har forskellig targettid`);
    }
    return {
      integratedState: row.continuationState,
      candidateGState,
      integratedSource: 'INTEGRATED_CONTINUATION',
      candidateGSource: 'CANDIDATE_G_CONTINUATION',
    };
  }
  if (candidateGState) {
    return {
      integratedState: legacyMigrationReady(candidateGState) ? candidateGState : null,
      candidateGState,
      integratedSource: legacyMigrationReady(candidateGState)
        ? 'CANDIDATE_G_SCHEMA2_MIGRATION'
        : 'CANDIDATE_G_INCOMPLETE_COLD_START',
      candidateGSource: 'CANDIDATE_G_CONTINUATION',
    };
  }
  return { ...cold, integratedSource: row.initialStateSource ?? 'COLD_START' };
}

function integratedInput(row, stage) {
  const verified = row?.currentProvenance?.status === 'verified';
  return {
    time: row.time,
    currentSpeedMps: verified ? row.currentSpeedMps : null,
    ...(Object.hasOwn(row, 'currentCoastNormalSpeedMps')
      ? { currentCoastNormalSpeedMps: verified ? row.currentCoastNormalSpeedMps : null }
      : {}),
    currentAlignment: verified && finite(row.currentDirectionDeg)
      ? Math.cos((Number(row.currentDirectionDeg) - Number(stage.onshoreDirectionDeg))
        * Math.PI / 180)
      : null,
    currentVerified: verified,
    currentProvenance: row.currentProvenance ?? null,
    waveHeightM: row.waveHeightM,
    wavePeriodS: row.wavePeriodS,
    waveDirectionDeg: row.waveDirectionDeg,
  };
}

function candidateGInput(row, stage) {
  const verified = row?.currentProvenance?.status === 'verified';
  return {
    time: row.time,
    currentSpeedMps: verified ? row.currentSpeedMps : null,
    currentAlignment: verified && finite(row.currentDirectionDeg)
      ? Math.cos((Number(row.currentDirectionDeg) - Number(stage.onshoreDirectionDeg))
        * Math.PI / 180)
      : null,
    currentVerified: verified,
    waveHeightM: row.waveHeightM,
    wavePeriodS: row.wavePeriodS,
  };
}

function beforeOrAt(rows, referenceAt) {
  const target = Date.parse(referenceAt);
  const byTime = new Map((rows ?? [])
    .filter(row => Number.isFinite(Date.parse(row?.time)) && Date.parse(row.time) <= target)
    .map(row => [new Date(row.time).toISOString(), row]));
  return [...byTime.values()].sort((left, right) => Date.parse(left.time) - Date.parse(right.time));
}

function resetExpiredInitial(initial, referenceAt) {
  const stateTime = Date.parse(initial.integratedState?.time ?? '');
  const ageHours = (Date.parse(referenceAt) - stateTime) / 3_600_000;
  if (!Number.isFinite(stateTime) || ageHours <= RAVSCORE_RECOVERY_REPLAY_MAXIMUM_AGE_HOURS) {
    return initial;
  }
  return {
    integratedState: null,
    candidateGState: null,
    integratedSource: 'EXPIRED_TO_PRIVATE_COLD_REPLAY',
    candidateGSource: 'EXPIRED_TO_PRIVATE_COLD_REPLAY',
  };
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
  if (![1, 2, POINT_STAGE_SCHEMA_VERSION].includes(previousState?.schemaVersion)) {
    throw new Error('Coastal-point staging-state har ukendt schema');
  }
  if ([2, POINT_STAGE_SCHEMA_VERSION].includes(previousState.schemaVersion)) {
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
    const part = { ...stage, zoneId: stage.zoneId };
    const identity = coastalPointStageIdentity({
      partId: stage.partId,
      waterPoint: stage.waterPoint,
      onshoreDirectionDeg: stage.onshoreDirectionDeg,
    });
    const initial = resetExpiredInitial(
      initialStageState(previousState, stage, identity),
      referenceAt,
    );
    let record = null;
    let recovery = null;
    let series = null;
    let candidateGSeries = null;
    let conversionFailed = false;
    let migrationBootstrapIncomplete = false;
    let candidateInputRows = [];
    const rawPrivateZone = dmi?.zones?.[stage.stageId];
    let projectedZone = null;
    try {
      projectedZone = projectVerifiedPrivateStageDmiZoneToPart(rawPrivateZone, {
        stageId: stage.stageId,
        zoneId: stage.zoneId,
        part,
      });
    } catch (error) {
      throw new Error(`${stage.partId}: privat DMI-proveniens er ugyldig`, { cause: error });
    }
    try {
      const rawTargetRecord = forecastFromPrivateZone(stage, dmi, referenceAt, {
        projectedZone,
      });
      const bulkId = `PART::${stage.partId}`;
      const projectedBulk = {
        currentVectorSemanticsVersion: dmi?.currentVectorSemanticsVersion,
        currentVectorSelection: dmi?.currentVectorSelection,
        currentMaxDistanceKm: dmi?.currentMaxDistanceKm,
        zones: { [bulkId]: projectedZone },
      };
      record = {
        ...rawTargetRecord,
        hourly: verifiedIntegratedPartHourly(
          rawTargetRecord,
          projectedBulk,
          bulkId,
          part,
        ),
      };
      const sourceStartAt = ravScoreRecoverySourceStartAt(
        initial.integratedState,
        referenceAt,
      );
      const recoveryHours = Math.round(
        (Date.parse(referenceAt) - Date.parse(sourceStartAt)) / 3_600_000,
      ) + 1;
      if (!Number.isInteger(recoveryHours)
        || recoveryHours < 1
        || recoveryHours > RAVSCORE_RECOVERY_REPLAY_MAXIMUM_AGE_HOURS
          + RAVSCORE_RECOVERY_POLICY.candidateMigrationWaveApproachReplayHours
          + 1) {
        throw new Error(`${stage.partId}: privat recovery-vindue er uden for den centrale modelkontrakt`);
      }
      const rawRecoveryRecord = forecastFromPrivateZone(stage, dmi, referenceAt, {
        projectedZone,
        startAt: sourceStartAt,
        hours: recoveryHours,
      });
      const recoveryRecord = {
        ...rawRecoveryRecord,
        hourly: verifiedIntegratedPartHourly(
          rawRecoveryRecord,
          projectedBulk,
          bulkId,
          part,
        ),
      };
      candidateInputRows = beforeOrAt(
        [...recoveryRecord.hourly, ...record.hourly],
        referenceAt,
      );
      try {
        recovery = buildRavScoreRecoveryReplay({
          part,
          initialState: initial.integratedState,
          targetReferenceAt: referenceAt,
          sourceRecords: [{
            source: 'private-coastal-point-stage-cache',
            record: recoveryRecord,
          }],
          publicHourly: record.hourly,
          nativeCadenceHoldHours: 3,
        });
      } catch (error) {
        if (error?.code === 'RAVSCORE_CANDIDATE_G_MIGRATION_WAVE_DIRECTION_INCOMPLETE') {
          migrationBootstrapIncomplete = true;
        } else {
          throw error;
        }
      }
      if (recovery) {
        const causalRows = beforeOrAt(recovery.hourly, referenceAt);
        series = buildIntegratedRavScoreStateSeries(
          causalRows.map(row => integratedInput(row, stage)),
          {
            samplingContextKey: identity.samplingContextKey,
            onshoreDirectionDeg: stage.onshoreDirectionDeg,
            initialState: initial.integratedState,
            expectedCandidateGStateKey: identity.expectedCandidateGStateKey,
            candidateGCurrentBootstrap: recovery.candidateGCurrentBootstrap,
            candidateGWaveApproachBootstrap: recovery.candidateGWaveApproachBootstrap,
            nativeCadenceHoldHours: 3,
            coldReplayBootstrap: recovery.coldStartHistoryLineage,
          },
        );
        candidateInputRows = causalRows;
      }
    } catch (error) {
      if (error?.code === 'RAVSCORE_CANDIDATE_G_MIGRATION_WAVE_DIRECTION_INCOMPLETE') {
        migrationBootstrapIncomplete = true;
      } else if (error?.message?.includes('has no valid hourly values')) {
        conversionFailed = true;
      } else {
        throw error;
      }
    }
    const candidateRowsAfterState = candidateInputRows.filter(row => (
      !initial.candidateGState
      || Date.parse(row.time) > Date.parse(initial.candidateGState.time)
    ));
    if (candidateRowsAfterState.length) {
      candidateGSeries = buildCandidateGDerivedStateSeries(
        candidateRowsAfterState.map(row => candidateGInput(row, stage)),
        {
          stateKey: identity.expectedCandidateGStateKey,
          initialState: initial.candidateGState,
          nativeCadenceHoldHours: 3,
        },
      );
    }
    const sample = record ? selectDmiForecastAt(record, referenceAt, { toleranceMinutes: 5 }) : null;
    const currentVerified = sample?.currentProvenance?.status === 'verified';
    const continuationState = series?.continuationState
      ?? (initial.integratedSource === 'INTEGRATED_CONTINUATION'
        ? initial.integratedState
        : null);
    const candidateGRollbackContinuationState = candidateGSeries?.continuationState
      ?? initial.candidateGState
      ?? null;
    if (continuationState) {
      assertIntegratedCoastalPointContinuation(continuationState, {
        samplingContextKey: identity.samplingContextKey,
        label: `${stage.partId} next staging-state`,
      });
    }
    if (candidateGRollbackContinuationState) {
      assertCandidateGCoastalPointRollbackContinuation(
        candidateGRollbackContinuationState,
        identity.expectedCandidateGStateKey,
        { label: `${stage.partId} next Candidate G companion` },
      );
    }
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
    const lastMileMemoryReady = continuationState?.waveApproachState?.readiness === true;
    const candidateGRollbackReady = candidateGRollbackContinuationState?.time === referenceAt
      && legacyMigrationReady(candidateGRollbackContinuationState);
    if (candidateGRollbackReady) {
      assertCandidateGCoastalPointRollbackContinuation(
        candidateGRollbackContinuationState,
        identity.expectedCandidateGStateKey,
        { requireReady: true, label: `${stage.partId} READY Candidate G companion` },
      );
    }
    const dualStateTargetBound = continuationState?.time === referenceAt
      && candidateGRollbackContinuationState?.time === referenceAt;
    const memoryReady = currentMemoryReady && waveMemoryReady && lastMileMemoryReady;
    const reasonCodes = [];
    if (conversionFailed) reasonCodes.push('PRIVATE_DMI_CONVERSION_FAILED');
    if (migrationBootstrapIncomplete) {
      reasonCodes.push('INTEGRATED_MIGRATION_WAVE_BOOTSTRAP_INCOMPLETE');
    }
    if (!currentVerified) reasonCodes.push('CURRENT_GRID_NOT_VERIFIED');
    if (!forecastReady) reasonCodes.push('FORECAST_HORIZON_INCOMPLETE');
    if (!currentMemoryReady) reasonCodes.push('INTEGRATED_CURRENT_MEMORY_WARMUP');
    if (!waveMemoryReady) reasonCodes.push('INTEGRATED_WAVE_MEMORY_WARMUP');
    if (!lastMileMemoryReady) reasonCodes.push('INTEGRATED_LAST_MILE_MEMORY_WARMUP');
    if (!candidateGRollbackReady) reasonCodes.push('CANDIDATE_G_ROLLBACK_MEMORY_WARMUP');
    if (!dualStateTargetBound) reasonCodes.push('DUAL_STATE_TARGET_NOT_BOUND');
    const status = currentVerified
      && forecastReady
      && memoryReady
      && candidateGRollbackReady
      && dualStateTargetBound
      ? POINT_STAGE_READY
      : 'collecting';
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
      candidateGRollbackContinuationState,
      initialStateSource: series?.initialStateSource ?? initial.integratedSource,
      candidateGInitialStateSource: candidateGSeries
        ? candidateGSeries.initialStateAccepted === true
          ? initial.candidateGSource
          : initial.candidateGState ? 'CANDIDATE_G_RESET' : 'COLD_START'
        : initial.candidateGState ? initial.candidateGSource : 'COLD_START',
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
      lastMileMemoryReady,
      candidateGRollbackReady,
      dualStateTargetBound,
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
