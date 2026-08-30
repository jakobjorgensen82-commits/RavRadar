import { evaluateRavScoreIntegrated } from '../../js/core/ravscore-integrated.js';
import { buildIntegratedRavScoreStateSeries } from '../../js/core/ravscore-integrated-state-pipeline.js';
import {
  RAVSCORE_MODEL_BUNDLE_SHA256,
  RAVSCORE_MODEL_CONTRACT_SHA256,
  RAVSCORE_MODEL_ID,
  assertRavScoreModelBinding,
  ravScoreModelBinding,
} from '../../js/core/ravscore-model-contract.js';
import { candidateGStateKey } from './coastal-point-staging-contract.mjs';
import { ravScoreSamplingContextKey } from './ravscore-sampling-context.mjs';

const finite = value => typeof value === 'number' && Number.isFinite(value);

const CURRENT_PROVENANCE_FIELDS = Object.freeze([
  'status',
  'reason',
  'provider',
  'source',
  'sourceClass',
  'collection',
  'modelRun',
  'leadTimeHours',
  'forecastAgeHours',
  'temporalResolution',
  'fallback',
  'controlledLivePilot',
  'vectorSemanticsVersion',
  'vectorSelection',
  'verticalLayer',
  'verticalLayerRankM',
  'distanceKm',
  'componentPair',
  'interpolation',
]);

function compactCurrentProvenance(provenance) {
  if (!provenance || typeof provenance !== 'object' || Array.isArray(provenance)) return null;
  const compact = Object.fromEntries(CURRENT_PROVENANCE_FIELDS
    .filter(key => provenance[key] !== undefined)
    .map(key => [key, provenance[key]]));
  if (Array.isArray(provenance.nativeValidTimes)) {
    compact.nativeValidTimes = provenance.nativeValidTimes
      .filter(value => typeof value === 'string' && Number.isFinite(Date.parse(value)))
      .map(value => new Date(value).toISOString());
  }
  return Object.keys(compact).length ? compact : null;
}

export function compactIntegratedRavScoreMode(result) {
  assertRavScoreModelBinding(result?.modelBinding, 'Integrated evaluator model binding');
  const modelBinding = result.modelBinding;
  const modelVersion = result?.modelVersion ?? RAVSCORE_MODEL_ID;
  const base = {
    available: result?.available === true && finite(result?.score),
    score: result?.available === true && finite(result?.score) ? Number(result.score) : null,
    modelVersion,
    modelId: modelVersion,
    modelContractSha256: modelBinding.modelContractSha256,
    modelBundleSha256: modelBinding.modelBundleSha256,
    modelBinding,
  };
  if (!base.available) return {
    ...base,
    reason: result?.reason ?? 'INTEGRATED_RAVSCORE_NOT_AVAILABLE',
    readiness: result?.readiness ?? null,
  };
  return {
    ...base,
    components: result.components,
    scoreCalculation: result.scoreCalculation,
    diagnostics: result.diagnostics,
    explanation: result.explanation,
    confidence: result.confidence,
  };
}

function scoreWeatherProjection(weather = {}) {
  return {
    windSpeedMps: weather.windSpeedMps,
    windDirectionDeg: weather.windDirectionDeg,
    waveHeightM: weather.waveHeightM,
    wavePeriodS: weather.wavePeriodS,
    waveDirectionDeg: weather.waveDirectionDeg,
    waterLevelCm: weather.waterLevelCm,
    waterLevelTrendCm3h: weather.waterLevelTrendCm3h,
    waterTemperatureC: weather.waterTemperatureC,
    currentSpeedMps: weather.currentSpeedMps,
    currentDirectionDeg: weather.currentDirectionDeg,
    currentProvenance: compactCurrentProvenance(weather.currentProvenance),
  };
}

/**
 * Production adapter for one coastal part. Raw current vectors stay in the
 * caller's forecast record; only derived speed/direction and compact signed
 * evidence cross into RavScore state and score rows.
 */
export function buildIntegratedPartScoreSeries({
  part,
  zone,
  hourly = [],
  initialState = null,
  candidateGCurrentBootstrap = null,
  nativeCadenceHoldHours = 0,
  nativeCadenceReferenceSample = null,
  coldReplayBootstrap = null,
  scoreStartAt = null,
} = {}) {
  if (!part || typeof part !== 'object' || !Array.isArray(hourly)) {
    throw new Error('Integrated RavScore part adapter requires one part and hourly rows');
  }
  const samplingContextKey = ravScoreSamplingContextKey(part);
  const expectedCandidateGStateKey = candidateGStateKey(part);
  const ravScoreState = buildIntegratedRavScoreStateSeries(hourly.map(weather => ({
    time: weather.time,
    currentSpeedMps: weather.currentSpeedMps,
    ...(Object.prototype.hasOwnProperty.call(weather, 'currentCoastNormalSpeedMps')
      ? { currentCoastNormalSpeedMps: weather.currentCoastNormalSpeedMps }
      : {}),
    currentAlignment: finite(weather.currentSpeedMps) && finite(weather.currentDirectionDeg)
      ? Math.cos((Number(weather.currentDirectionDeg) - Number(part.onshoreDirectionDeg)) * Math.PI / 180)
      : null,
    currentVerified: weather.currentProvenance?.status === 'verified',
    currentProvenance: weather.currentProvenance ?? null,
    waveHeightM: weather.waveHeightM,
    wavePeriodS: weather.wavePeriodS,
  })), {
    samplingContextKey,
    initialState,
    expectedCandidateGStateKey,
    candidateGCurrentBootstrap,
    nativeCadenceHoldHours,
    nativeCadenceReferenceSample,
    coldReplayBootstrap,
  });
  const stateByTime = new Map(ravScoreState.rows.map(row => [row.time, row]));
  const scoreStartMs = scoreStartAt === null || scoreStartAt === undefined
    ? Number.NEGATIVE_INFINITY
    : Date.parse(scoreStartAt);
  if (!Number.isFinite(scoreStartMs) && scoreStartMs !== Number.NEGATIVE_INFINITY) {
    throw new Error('Integrated RavScore public score start must be a valid time');
  }
  const scores = hourly.flatMap(weather => {
    if (Date.parse(weather.time) < scoreStartMs) return [];
    const modelState = stateByTime.get(weather.time) ?? null;
    if (!modelState) return [];
    const effectiveCurrentProvenance = modelState.currentReferenceProvenance
      ?? weather.currentProvenance
      ?? null;
    const publicContext = {
      windSpeedMps: weather.windSpeedMps,
      waveHeightM: weather.waveHeightM,
      currentSpeedMps: weather.currentSpeedMps,
      currentCoastNormalSpeedMps: modelState.currentCoastNormalSpeedMps,
      currentAlignment: finite(weather.currentSpeedMps) && finite(weather.currentDirectionDeg)
        ? Math.cos((Number(weather.currentDirectionDeg) - Number(part.onshoreDirectionDeg)) * Math.PI / 180)
        : null,
      currentVerified: modelState.currentVerified === true,
      currentTransition: modelState.currentTransition,
      currentReferenceAt: modelState.currentReferenceAt,
      currentReferenceProvenance: effectiveCurrentProvenance,
      currentMemoryReady: modelState.currentMemoryReady,
      currentMemoryStatus: modelState.currentMemoryStatus,
      currentMemoryCoverageHours: modelState.currentMemoryCoverageHours,
      currentMemoryWindowHours: modelState.currentMemoryWindowHours,
      waveLastVerifiedAt: modelState.waveLastVerifiedAt,
      waveMemoryReady: modelState.waveMemoryReady,
      waveMemoryStatus: modelState.waveMemoryStatus,
      waveTransition: modelState.waveTransition,
    };
    const modes = Object.fromEntries(['waders', 'beach'].map(mode => [
      mode,
      compactIntegratedRavScoreMode(evaluateRavScoreIntegrated(
        { mode, zone, weather },
        { state: modelState },
      )),
    ]));
    return [{
      time: weather.time,
      weather: scoreWeatherProjection({
        ...weather,
        currentProvenance: effectiveCurrentProvenance,
      }),
      ravScoreModel: {
        ...ravScoreModelBinding(),
        referenceAt: weather.time,
        continuationState: modelState.continuationState,
        currentReferenceAt: modelState.currentReferenceAt,
        currentMemoryReady: modelState.currentMemoryReady,
        currentMemoryStatus: modelState.currentMemoryStatus,
        currentMemoryCoverageHours: modelState.currentMemoryCoverageHours,
        currentMemoryWindowHours: modelState.currentMemoryWindowHours,
        waveLastVerifiedAt: modelState.waveLastVerifiedAt,
        waveMemoryReady: modelState.waveMemoryReady,
        waveMemoryStatus: modelState.waveMemoryStatus,
        migrationApplied: modelState.migrationApplied,
        publicContext,
        modes,
      },
    }];
  });

  if (scores.some(score => score.ravScoreModel.modelId !== RAVSCORE_MODEL_ID
    || score.ravScoreModel.modelContractSha256 !== RAVSCORE_MODEL_CONTRACT_SHA256
    || score.ravScoreModel.modelBundleSha256 !== RAVSCORE_MODEL_BUNDLE_SHA256)) {
    throw new Error('Integrated RavScore generator produced an incompatible model binding');
  }
  return { ravScoreState, scores };
}
