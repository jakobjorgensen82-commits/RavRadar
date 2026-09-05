import { evaluateRavScoreIntegrated } from '../../js/core/ravscore-integrated.js';
import {
  buildIntegratedRavScoreStateSeries,
  canonicalRavScoreStateOnlyCurrentHold,
} from '../../js/core/ravscore-integrated-state-pipeline.js';
import {
  RAVSCORE_MODEL_BUNDLE_SHA256,
  RAVSCORE_MODEL_CONTRACT_SHA256,
  RAVSCORE_MODEL_ID,
  assertRavScoreModelBinding,
  ravScoreModelBinding,
} from '../../js/core/ravscore-model-contract.js';
import { candidateGStateKey } from './coastal-point-staging-contract.mjs';
import { stateOnlyCurrentRowForbiddenFields } from './live-current-pilot.mjs';
import { ravScoreSamplingContextKey } from './ravscore-sampling-context.mjs';

const finite = value => typeof value === 'number' && Number.isFinite(value);
const SCORE_QUALITIES = new Set(['FULL_HISTORY', 'HISTORY_INCOMPLETE', 'UNAVAILABLE']);
const FULL_SCORE_SEMANTICS = new Set([
  'EXACT_POINT_SCORE', 'CONSERVATIVE_TAIL_RESET_POINT_SCORE',
]);
const SCORE_BOUND_FIELDS = Object.freeze([
  'lower', 'upper', 'modelUncertaintyPoints', 'rawLower', 'rawUpper',
]);
const WAVE_INPUT_QUALITY_FIELDS = Object.freeze([
  'waveInputSource', 'waveInputUncertainty', 'waveInputNoticeId',
]);
const FEGGESUND_WAVE_PROXY_SOURCE = 'FEGGESUND_TWO_NEIGHBOR_WAVE_INTERPOLATION';
const FEGGESUND_WAVE_PROXY_NOTICE_ID = 'FEGGESUND_NEIGHBOR_WAVE_PROXY';

function compactWaveInputQuality(weather = {}) {
  const present = WAVE_INPUT_QUALITY_FIELDS
    .filter(field => Object.hasOwn(weather, field));
  if (present.length === 0) return {};
  if (present.length !== WAVE_INPUT_QUALITY_FIELDS.length) {
    throw new Error('Integrated wave input quality contract is incomplete');
  }
  const compact = Object.fromEntries(WAVE_INPUT_QUALITY_FIELDS
    .map(field => [field, weather[field]]));
  const nullQuality = compact.waveInputSource === null
    && compact.waveInputUncertainty === null
    && compact.waveInputNoticeId === null;
  const directQuality = compact.waveInputSource === 'DIRECT_OFFICIAL'
    && compact.waveInputUncertainty === 'LOW'
    && compact.waveInputNoticeId === null;
  const proxyQuality = compact.waveInputSource === FEGGESUND_WAVE_PROXY_SOURCE
    && ['LOW', 'MODERATE', 'HIGH'].includes(compact.waveInputUncertainty)
    && compact.waveInputNoticeId === FEGGESUND_WAVE_PROXY_NOTICE_ID;
  if (!nullQuality && !directQuality && !proxyQuality) {
    throw new Error('Integrated wave input quality contract is invalid');
  }
  return compact;
}

export function integratedInputCalibrationEligible(weather = {}) {
  const quality = compactWaveInputQuality(weather);
  const current = weather?.currentProvenance;
  const openMeteoCurrent = current?.source === 'open-meteo-meteofrance-currents';
  if (openMeteoCurrent && (
    current.provider !== 'open-meteo'
    || current.physicalScope !== 'eulerian-waves-and-tides-combined-surface-current'
    || current.scoreInputPolicyId
      !== 'combined-current-single-channel-no-wave-or-tide-reprojection-v1'
    || current.calibrationEligible !== false
  )) {
    throw new Error('Open-Meteo combined-current calibration contract is invalid');
  }
  return quality.waveInputSource !== FEGGESUND_WAVE_PROXY_SOURCE
    && current?.calibrationEligible !== false
    && !openMeteoCurrent;
}

function compactScoreBounds(result = {}) {
  if (result.available !== true) {
    if (result.scoreBounds !== null) {
      throw new Error('Unavailable integrated RavScore must carry null scoreBounds');
    }
    return null;
  }
  const bounds = result.scoreBounds;
  if (!bounds || typeof bounds !== 'object' || Array.isArray(bounds)
    || JSON.stringify(Object.keys(bounds).sort())
      !== JSON.stringify([...SCORE_BOUND_FIELDS].sort())
    || !SCORE_BOUND_FIELDS.every(field => finite(bounds[field]))
    || bounds.lower < 0 || bounds.upper > 100 || bounds.lower > bounds.upper
    || bounds.rawLower < 0 || bounds.rawUpper > 100 || bounds.rawLower > bounds.rawUpper
    || Math.abs(bounds.modelUncertaintyPoints - (bounds.upper - bounds.lower)) > 1e-9
    || result.score !== bounds.lower) {
    throw new Error('Integrated RavScore scoreBounds are invalid');
  }
  if (result.scoreQuality === 'FULL_HISTORY'
    && (bounds.lower !== bounds.upper || bounds.rawLower !== bounds.rawUpper)) {
    throw new Error('FULL_HISTORY integrated RavScore bounds must be collapsed');
  }
  return Object.fromEntries(SCORE_BOUND_FIELDS.map(field => [field, Number(bounds[field])]));
}

function compactScoreQuality(result = {}) {
  const scoreQuality = SCORE_QUALITIES.has(result.scoreQuality)
    ? result.scoreQuality
    : null;
  const calibrationEligible = typeof result.calibrationEligible === 'boolean'
    ? result.calibrationEligible
    : null;
  const historyCoverageHours = finite(result.historyCoverageHours)
    ? Number(result.historyCoverageHours)
    : finite(result?.history?.coverageHours)
      ? Number(result.history.coverageHours)
      : null;
  const historyReasonCodes = Array.isArray(result.historyReasonCodes)
    ? result.historyReasonCodes
    : Array.isArray(result?.history?.reasonCodes)
      ? result.history.reasonCodes
      : [];
  const compactReasonCodes = [...new Set(historyReasonCodes
    .filter(code => typeof code === 'string' && /^[A-Z][A-Z0-9_]{0,127}$/.test(code)))];
  const coverageValid = scoreQuality === 'UNAVAILABLE'
    ? historyCoverageHours === null
    : finite(historyCoverageHours)
      && historyCoverageHours >= 0
      && historyCoverageHours <= 48;
  if (!scoreQuality
    || calibrationEligible === null
    || !coverageValid
    || compactReasonCodes.length !== historyReasonCodes.length
    || typeof result.conservativeTailResetApplied !== 'boolean') {
    throw new Error('Integrated RavScore quality contract is invalid');
  }
  if (scoreQuality === 'FULL_HISTORY'
    && (historyCoverageHours !== 48
      || compactReasonCodes.length !== 0
      || !FULL_SCORE_SEMANTICS.has(result.scoreSemantics)
      || result.conservativeTailResetApplied
        !== (result.scoreSemantics === 'CONSERVATIVE_TAIL_RESET_POINT_SCORE'))) {
    throw new Error('Integrated FULL_HISTORY semantics are invalid');
  }
  if (scoreQuality === 'HISTORY_INCOMPLETE'
    && (calibrationEligible !== false
      || compactReasonCodes.length === 0
      || result.scoreSemantics !== 'CONSERVATIVE_ENCLOSING_LOWER_BOUND')) {
    throw new Error('Integrated HISTORY_INCOMPLETE semantics are invalid');
  }
  if (scoreQuality === 'UNAVAILABLE'
    && (calibrationEligible !== false
      || result.scoreSemantics !== null
      || result.conservativeTailResetApplied !== false
      || compactReasonCodes.length !== 0)) {
    throw new Error('Integrated UNAVAILABLE semantics are invalid');
  }
  return {
    scoreQuality,
    calibrationEligible,
    scoreSemantics: result.scoreSemantics,
    conservativeTailResetApplied: result.conservativeTailResetApplied,
    historyCoverageHours,
    historyReasonCodes: compactReasonCodes,
  };
}

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
  'physicalScope',
  'scoreInputPolicyId',
  'calibrationEligible',
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

export function compactIntegratedRavScoreMode(result, {
  inputCalibrationEligible = true,
} = {}) {
  assertRavScoreModelBinding(result?.modelBinding, 'Integrated evaluator model binding');
  const modelBinding = result.modelBinding;
  const modelVersion = result?.modelVersion ?? RAVSCORE_MODEL_ID;
  if (typeof inputCalibrationEligible !== 'boolean') {
    throw new Error('Integrated RavScore input calibration ceiling must be boolean');
  }
  const effectiveResult = {
    ...result,
    calibrationEligible: result?.calibrationEligible === true
      && inputCalibrationEligible,
  };
  const base = {
    available: effectiveResult.available === true && finite(effectiveResult.score),
    score: effectiveResult.available === true && finite(effectiveResult.score)
      ? Number(effectiveResult.score) : null,
    modelVersion,
    modelId: modelVersion,
    modelContractSha256: modelBinding.modelContractSha256,
    modelBundleSha256: modelBinding.modelBundleSha256,
    modelBinding,
    ...compactScoreQuality(effectiveResult),
    scoreBounds: compactScoreBounds(effectiveResult),
  };
  if (!base.available) return {
    ...base,
    reason: effectiveResult.reason ?? 'INTEGRATED_RAVSCORE_NOT_AVAILABLE',
    readiness: effectiveResult.readiness ?? null,
  };
  return {
    ...base,
    components: effectiveResult.components,
    scoreCalculation: effectiveResult.scoreCalculation,
    diagnostics: effectiveResult.diagnostics,
    explanation: effectiveResult.explanation,
    confidence: effectiveResult.confidence,
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
    ...compactWaveInputQuality(weather),
    currentProvenance: compactCurrentProvenance(weather.currentProvenance),
  };
}

function stateOnlyCurrentHoldForPart(weather, part, zone) {
  const marker = canonicalRavScoreStateOnlyCurrentHold(
    weather?.currentStateOnlyHold,
    weather?.time,
  );
  if (marker === null) return null;
  const parentZoneId = part?.zoneId ?? part?.parentZoneId ?? zone?.id ?? null;
  if (marker.partId !== part?.partId
    || typeof parentZoneId !== 'string'
    || marker.parentZoneId !== parentZoneId
    || stateOnlyCurrentRowForbiddenFields(weather)
      .some(field => weather[field] !== null && weather[field] !== undefined)) {
    throw new Error('Integrated state-only current hold is not bound to the exact part/hour');
  }
  return marker;
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
  candidateGWaveApproachBootstrap = null,
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
    currentStateOnlyHold: stateOnlyCurrentHoldForPart(weather, part, zone),
    waveHeightM: weather.waveHeightM,
    wavePeriodS: weather.wavePeriodS,
    waveDirectionDeg: weather.waveDirectionDeg,
  })), {
    samplingContextKey,
    onshoreDirectionDeg: part.onshoreDirectionDeg,
    initialState,
    expectedCandidateGStateKey,
    candidateGCurrentBootstrap,
    candidateGWaveApproachBootstrap,
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
    const effectiveCurrentProvenance = compactCurrentProvenance(
      modelState.currentReferenceProvenance
        ?? weather.currentProvenance
        ?? null,
    );
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
      lastMileWaveReferenceAt: modelState.lastMileWaveReferenceAt,
      lastMileMemoryReady: modelState.lastMileMemoryReady,
      lastMileMemoryStatus: modelState.lastMileMemoryStatus,
      lastMileTransition: modelState.lastMileTransition,
    };
    const inputCalibrationEligible = integratedInputCalibrationEligible(weather);
    const modes = Object.fromEntries(['waders', 'beach'].map(mode => [
      mode,
      compactIntegratedRavScoreMode(evaluateRavScoreIntegrated(
        { mode, zone, weather },
        { state: modelState },
      ), { inputCalibrationEligible }),
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
        lastMileWaveReferenceAt: modelState.lastMileWaveReferenceAt,
        lastMileMemoryReady: modelState.lastMileMemoryReady,
        lastMileMemoryStatus: modelState.lastMileMemoryStatus,
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
