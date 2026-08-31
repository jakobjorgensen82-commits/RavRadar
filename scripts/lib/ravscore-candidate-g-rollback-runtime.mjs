import { evaluateRavScoreCandidateG } from '../../js/core/ravscore-candidate-g.js';
import {
  buildCandidateGDerivedStateSeries,
  CANDIDATE_G_STATE_MODEL_ID,
  CANDIDATE_G_STATE_PROFILE_ID,
  CANDIDATE_G_STATE_SCHEMA_VERSION,
  CANDIDATE_G_STATE_VARIANT_ID,
} from '../../js/core/ravscore-candidate-g-state-pipeline.js';
import {
  candidateGReferenceReadiness,
  projectCandidateGForPublic,
} from '../../js/core/ravscore-profile-switch.js';
import { applyCurrentTransportToHistory } from './current-transport-history.mjs';
import { candidateGStateKey } from './coastal-point-staging-contract.mjs';
import {
  CURRENT_TRANSPORT_POTENTIAL_RECOMMENDED_RESEARCH_PROFILE,
  deriveCurrentTransportEvidence,
} from '../../js/core/ravscore-regime-memory.js';
import {
  RAVSCORE_COMPONENT_SCHEMA_ID,
  RAVSCORE_EXPLANATION_SCHEMA_ID,
  RAVSCORE_MODEL_BUNDLE_SHA256,
  RAVSCORE_MODEL_CONTRACT_SHA256,
  RAVSCORE_BEST_TIME_POLICY_ID,
  RAVSCORE_MODEL_ID,
  RAVSCORE_PRESENTATION_POLICY_ID,
  RAVSCORE_PROFILE_ID,
  RAVSCORE_RANKING_POLICY_ID,
  RAVSCORE_ROLLBACK_ID,
  RAVSCORE_STATE_SCHEMA_VERSION,
  RAVSCORE_VARIANT_ID,
  RAVSCORE_WEIGHTS,
  assertRavScoreModelBinding,
  ravScoreModelBinding,
} from '../rollback-assets/ravscore-model-contract.js';

export const CANDIDATE_G_OPERATIONAL_ROLLBACK_ID = RAVSCORE_ROLLBACK_ID;

const finite = value => typeof value === 'number' && Number.isFinite(value);
const plain = value => value && typeof value === 'object' && !Array.isArray(value);
const inRange = (value, minimum, maximum) => finite(value)
  && value >= minimum && value <= maximum;
const LEGACY_CURRENT_SPEED_QUANTUM_MPS = 0.01;
const LEGACY_DIRECTION_QUANTUM_DEG = 1;

const WEATHER_NUMBER_RULES = Object.freeze({
  windSpeedMps: [0, Number.POSITIVE_INFINITY],
  windDirectionDeg: [0, 360],
  waveHeightM: [0, Number.POSITIVE_INFINITY],
  wavePeriodS: [0, Number.POSITIVE_INFINITY],
  waveDirectionDeg: [0, 360],
  waterLevelCm: [Number.NEGATIVE_INFINITY, Number.POSITIVE_INFINITY],
  waterLevelTrendCm3h: [Number.NEGATIVE_INFINITY, Number.POSITIVE_INFINITY],
  waterTemperatureC: [Number.NEGATIVE_INFINITY, Number.POSITIVE_INFINITY],
  currentSpeedMps: [0, Number.POSITIVE_INFINITY],
  currentDirectionDeg: [0, 360],
});

function assertStrictWeatherRows(hourly, part) {
  if (!inRange(part?.onshoreDirectionDeg, 0, 360)) {
    throw new Error('Candidate G rollback part requires a strict numeric onshore direction');
  }
  for (const [index, weather] of hourly.entries()) {
    if (!plain(weather) || typeof weather.time !== 'string'
      || !Number.isFinite(Date.parse(weather.time))) {
      throw new Error(`Candidate G rollback weather row ${index} is invalid`);
    }
    for (const [field, [minimum, maximum]] of Object.entries(WEATHER_NUMBER_RULES)) {
      const value = weather[field];
      if (value === null || value === undefined) continue;
      if (!inRange(value, minimum, maximum)) {
        throw new Error(`Candidate G rollback weather ${field} must be a strict finite JSON number in range`);
      }
    }
    const hasCurrentSpeed = finite(weather.currentSpeedMps);
    const hasCurrentDirection = finite(weather.currentDirectionDeg);
    if (hasCurrentSpeed !== hasCurrentDirection) {
      throw new Error('Candidate G rollback current speed and direction must be jointly present or missing');
    }
    if (hasCurrentSpeed && exactRegionalHoldProvenance(weather.currentProvenance)
      && (!legacyQuantizedSpeed(weather.currentSpeedMps)
        || !legacyQuantizedDirection(weather.currentDirectionDeg))) {
      throw new Error('Candidate G regional current must use the legacy-quantized speed and direction projection');
    }
  }
}

function assertStrictOracleResult(result) {
  if (!inRange(result?.score, 0, 100)
    || !plain(result.components)
    || !['huntability', 'mobilisation', 'transportAndDelivery']
      .every(key => Object.hasOwn(result.components, key))
    || !Object.values(result.components).every(value => inRange(value, 0, 100))) {
    throw new Error('Candidate G rollback oracle returned a non-numeric score or component');
  }
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

export const CANDIDATE_G_CONTINUATION_FIELDS = Object.freeze([
  'schemaVersion',
  'modelId',
  'variantId',
  'profileId',
  'stateKey',
  'time',
  'transportReferenceAt',
  'transportPotential',
  'outboundEpisodeEffectiveHours',
  'transportMemoryReady',
  'transportMemoryStatus',
  'transportMemoryWindowHours',
  'transportMemoryCoverageHours',
  'transportEvidence',
  'mobilisationPotential',
]);

const exactKeys = (value, fields) => plain(value)
  && JSON.stringify(Object.keys(value).sort()) === JSON.stringify([...fields].sort());
const canonicalTime = value => typeof value === 'string'
  && /(?:Z|[+-]\d{2}:\d{2})$/i.test(value)
  && Number.isFinite(Date.parse(value))
  && new Date(value).toISOString() === value;

export function assertCandidateGRollbackContinuationForStateKey(
  state,
  expectedStateKey,
  label = 'Candidate G rollback continuation',
) {
  if (typeof expectedStateKey !== 'string' || !/^sha256:[0-9a-f]{64}$/.test(expectedStateKey)) {
    throw new Error(`${label} has an invalid expected state key`);
  }
  if (!exactKeys(state, CANDIDATE_G_CONTINUATION_FIELDS)
    || state.schemaVersion !== CANDIDATE_G_STATE_SCHEMA_VERSION
    || state.modelId !== CANDIDATE_G_STATE_MODEL_ID
    || state.variantId !== CANDIDATE_G_STATE_VARIANT_ID
    || state.profileId !== CANDIDATE_G_STATE_PROFILE_ID
    || state.stateKey !== expectedStateKey
    || !canonicalTime(state.time)
    || !canonicalTime(state.transportReferenceAt)
    || Date.parse(state.transportReferenceAt) > Date.parse(state.time)
    || !inRange(state.transportPotential, 0, 100)
    || !inRange(state.outboundEpisodeEffectiveHours, 0, Number.POSITIVE_INFINITY)
    || typeof state.transportMemoryReady !== 'boolean'
    || typeof state.transportMemoryStatus !== 'string'
    || !state.transportMemoryStatus
    || !inRange(state.transportMemoryWindowHours, 0, 48)
    || state.transportMemoryWindowHours !== 48
    || !inRange(state.transportMemoryCoverageHours, 0, 48)
    || !inRange(state.mobilisationPotential, 0, 100)
    || !Array.isArray(state.transportEvidence)
    || state.transportEvidence.length < 1
    || state.transportEvidence.length > 49) {
    throw new Error(`${label} is not an exact Candidate G schema-2 state`);
  }
  let previous = Number.NEGATIVE_INFINITY;
  for (const evidence of state.transportEvidence) {
    if (!exactKeys(evidence, ['time', 'strength'])
      || !canonicalTime(evidence.time)
      || (evidence.strength !== null && !inRange(evidence.strength, -1, 1))
      || Date.parse(evidence.time) <= previous) {
      throw new Error(`${label} has incompatible bounded transport evidence`);
    }
    previous = Date.parse(evidence.time);
  }
  if (previous !== Date.parse(state.transportReferenceAt)) {
    throw new Error(`${label} transport reference does not close its evidence window`);
  }
  const compatibility = buildCandidateGDerivedStateSeries([], {
    stateKey: expectedStateKey,
    initialState: state,
  });
  if (!compatibility.initialStateAccepted
    || compatibility.initialStateResetReason !== null
    || compatibility.continuationState !== state) {
    throw new Error(`${label} is not accepted by the sealed Candidate G oracle`);
  }
  return true;
}

export function assertCandidateGRollbackContinuation(state, part,
  label = 'Candidate G rollback continuation') {
  return assertCandidateGRollbackContinuationForStateKey(
    state,
    candidateGStateKey(part),
    label,
  );
}

function candidateInitialState({
  previousCandidateGContinuation,
  legacyCandidateGMigrationState,
  measuredColdStart,
  part,
}) {
  if (typeof measuredColdStart !== 'boolean') {
    throw new Error('Candidate G rollback measured cold-start flag must be boolean');
  }
  if (previousCandidateGContinuation !== null
    && previousCandidateGContinuation !== undefined
    && legacyCandidateGMigrationState !== null
    && legacyCandidateGMigrationState !== undefined) {
    throw new Error('Candidate G rollback continuation sources may not be hybridized');
  }
  const previous = previousCandidateGContinuation ?? null;
  const legacy = legacyCandidateGMigrationState ?? null;
  const selected = previous ?? legacy;
  if (selected === null) {
    if (measuredColdStart) {
      return {
        state: null,
        source: 'VERIFIED_MEASURED_COLD_START',
      };
    }
    throw new Error('Candidate G rollback requires an exact previous private or one-time legacy continuation');
  }
  if (measuredColdStart) {
    throw new Error('Candidate G rollback measured cold start may not be hybridized with state');
  }
  assertCandidateGRollbackContinuation(selected, part, previous
    ? 'Previous private Candidate G rollback continuation'
    : 'One-time legacy Candidate G migration continuation');
  return {
    state: structuredClone(selected),
    source: previous ? 'PREVIOUS_PRIVATE_ROLLBACK' : 'LEGACY_SCHEMA2_MIGRATION',
  };
}

function exactRegionalHoldProvenance(value) {
  return plain(value)
    && value.status === 'verified'
    && value.sourceClass === 'owner-approved-regional-proxy'
    && value.source === 'dmi-dkss-lf-regional-proxy'
    && value.collection === 'dkss_lf'
    && inRange(value.distanceKm, 0, 15);
}

const REGIONAL_REFERENCE_FIELDS = Object.freeze([
  'time',
  'currentSpeedMps',
  'currentAlignment',
  'currentVerified',
  'currentProvenance',
]);
const REGIONAL_REFERENCE_PROVENANCE_FIELDS = Object.freeze([
  'status',
  'sourceClass',
  'source',
  'collection',
  'distanceKm',
]);

function legacyQuantizedSpeed(value) {
  if (!inRange(value, 0, Number.POSITIVE_INFINITY)) return false;
  const quantized = Math.round(value / LEGACY_CURRENT_SPEED_QUANTUM_MPS)
    * LEGACY_CURRENT_SPEED_QUANTUM_MPS;
  return Math.abs(value - quantized) <= 1e-12;
}

function legacyQuantizedDirection(value) {
  return inRange(value, 0, 360)
    && Number.isInteger(value / LEGACY_DIRECTION_QUANTUM_DEG);
}

function legacyWholeDegreeAlignment(value, part) {
  if (!inRange(value, -1, 1) || !inRange(part?.onshoreDirectionDeg, 0, 360)) return false;
  for (let direction = 0; direction <= 360; direction += LEGACY_DIRECTION_QUANTUM_DEG) {
    const expected = Math.cos((direction - part.onshoreDirectionDeg) * Math.PI / 180);
    if (Math.abs(value - expected) <= 1e-12) return true;
  }
  return false;
}

function exactRegionalReferenceEnvelope(value) {
  return exactKeys(value, REGIONAL_REFERENCE_FIELDS)
    && canonicalTime(value.time)
    && inRange(value.currentSpeedMps, 0, Number.POSITIVE_INFINITY)
    && inRange(value.currentAlignment, -1, 1)
    && value.currentVerified === true
    && exactKeys(value.currentProvenance, REGIONAL_REFERENCE_PROVENANCE_FIELDS)
    && exactRegionalHoldProvenance(value.currentProvenance);
}

function assertRegionalReferenceMatchesContinuation(reference, continuation, part) {
  if (!continuation || !exactRegionalReferenceEnvelope(reference)) {
    throw new Error('Candidate G native-cadence reference lacks exact regional source authorization');
  }
  if (!legacyQuantizedSpeed(reference.currentSpeedMps)
    || !legacyWholeDegreeAlignment(reference.currentAlignment, part)) {
    throw new Error('Candidate G native-cadence reference is not the legacy-quantized projection');
  }
  const lastEvidence = continuation.transportEvidence?.at(-1) ?? null;
  const derived = deriveCurrentTransportEvidence(reference, {
    ...CURRENT_TRANSPORT_POTENTIAL_RECOMMENDED_RESEARCH_PROFILE,
    getTime: value => value.time,
    getSpeed: value => value.currentSpeedMps,
    getAlignment: value => value.currentAlignment,
    isVerified: value => value.currentVerified === true,
  });
  if (!lastEvidence
    || reference.time !== continuation.transportReferenceAt
    || lastEvidence.time !== continuation.transportReferenceAt
    || derived?.time !== lastEvidence.time
    || derived.strength !== lastEvidence.strength) {
    throw new Error('Candidate G native-cadence reference is not the exact continuation evidence');
  }
}

function buildSourceBoundCandidateGStateSeries(samples, {
  part,
  stateKey,
  initialState,
  nativeCadenceHoldHours,
  nativeCadenceReferenceSample,
} = {}) {
  if (!samples.length) {
    return buildCandidateGDerivedStateSeries([], { stateKey, initialState });
  }
  let continuation = initialState;
  if (nativeCadenceReferenceSample !== null
    && nativeCadenceReferenceSample !== undefined) {
    assertRegionalReferenceMatchesContinuation(
      nativeCadenceReferenceSample,
      continuation,
      part,
    );
  }
  let holdAuthorized = Boolean(nativeCadenceReferenceSample)
    && !continuation.transportEvidence.some(item => item.strength === null);
  const rows = [];
  let initialStateAccepted = null;
  let initialStateResetReason = null;
  for (let index = 0; index < samples.length; index += 1) {
    const sample = samples[index];
    if (sample.currentVerified === true) {
      holdAuthorized = exactRegionalHoldProvenance(sample.currentProvenance)
        && !continuation?.transportEvidence?.some(item => item.strength === null);
    }
    const holdHours = sample.currentVerified === true || !holdAuthorized
      ? 0 : nativeCadenceHoldHours;
    const result = buildCandidateGDerivedStateSeries([sample], {
      stateKey,
      initialState: continuation,
      nativeCadenceHoldHours: holdHours,
      nativeCadenceReferenceSample: index === 0 && holdAuthorized
        ? nativeCadenceReferenceSample : null,
    });
    if (index === 0) {
      initialStateAccepted = result.initialStateAccepted;
      initialStateResetReason = result.initialStateResetReason;
    }
    const row = result.rows[0];
    if (!row) throw new Error('Candidate G source-bound state row is missing');
    rows.push(row);
    continuation = result.continuationState;
    if (row.currentTransition !== 'NATIVE_CADENCE_HOLD'
      && sample.currentVerified !== true) holdAuthorized = false;
  }
  return {
    schemaVersion: CANDIDATE_G_STATE_SCHEMA_VERSION,
    modelId: CANDIDATE_G_STATE_MODEL_ID,
    variantId: CANDIDATE_G_STATE_VARIANT_ID,
    profileId: CANDIDATE_G_STATE_PROFILE_ID,
    initialStateAccepted,
    initialStateResetReason,
    rows,
    continuationState: continuation,
  };
}

function compactCandidateGMode(result) {
  const binding = ravScoreModelBinding();
  if (!result?.available || !finite(result.score)) {
    const reason = typeof result?.reason === 'string'
      && /^[A-Z][A-Z0-9_]{0,127}$/.test(result.reason)
      ? result.reason
      : 'CANDIDATE_G_NOT_AVAILABLE';
    return {
      available: false,
      score: null,
      scoreBounds: null,
      scoreQuality: 'UNAVAILABLE',
      calibrationEligible: false,
      scoreSemantics: null,
      conservativeTailResetApplied: false,
      historyCoverageHours: null,
      historyReasonCodes: [],
      modelId: RAVSCORE_MODEL_ID,
      modelVersion: RAVSCORE_MODEL_ID,
      modelContractSha256: binding.modelContractSha256,
      modelBundleSha256: binding.modelBundleSha256,
      modelBinding: binding,
      reason,
      level: 'unavailable',
      label: 'RavScore midlertidigt utilgængelig',
      unavailability: {
        available: false,
        code: reason,
        messageDa: 'Candidate G-datagrundlaget er ikke i eksakt READY-tilstand.',
      },
      reasons: ['Candidate G-datagrundlaget er ikke i eksakt READY-tilstand.'],
    };
  }
  if (result.modelVersion !== CANDIDATE_G_STATE_MODEL_ID) {
    throw new Error('Candidate G rollback oracle returned another model');
  }
  assertStrictOracleResult(result);
  return {
    available: true,
    score: result.score,
    modelId: RAVSCORE_MODEL_ID,
    modelVersion: RAVSCORE_MODEL_ID,
    modelContractSha256: binding.modelContractSha256,
    modelBundleSha256: binding.modelBundleSha256,
    modelBinding: binding,
    components: result.components,
    weightedContributions: result.scoreCalculation?.weightedContributions ?? null,
    additiveScore: result.scoreCalculation?.additiveScore ?? null,
    physicalGateFactor: result.scoreCalculation?.gateFactor ?? null,
    wadersHuntabilityMaximum: result.scoreCalculation?.modeHuntabilityMaximum ?? null,
    wadersHuntabilityLimitApplied:
      result.scoreCalculation?.modeHuntabilityApplied === true,
    outflowExhaustionGateApplied:
      result.scoreCalculation?.outflowExhaustionGateApplied === true,
    outflowExhaustionExplanationDa:
      result.scoreCalculation?.outflowExhaustionExplanationDa ?? null,
  };
}

/**
 * Named, fail-closed quality projection for the sealed manual Candidate G
 * rollback. This is not an integrated-model fallback and never infers missing
 * history: an actual available Candidate G score plus its exact READY 48-hour
 * continuation are both required.
 */
export function projectReadyCandidateGRollbackScoreQuality(result, state) {
  assertCandidateGRollbackBinding();
  assertRavScoreModelBinding(result?.modelBinding,
    'Candidate G rollback score-quality binding');
  const diagnostics = result?.explanation?.transportDiagnostics;
  if (result?.available !== true
    || !inRange(result.score, 0, 100)
    || result.scoreProfileId !== RAVSCORE_MODEL_ID
    || state?.transportMemoryReady !== true
    || state?.transportMemoryStatus !== 'READY'
    || state?.transportMemoryWindowHours !== 48
    || state?.transportMemoryCoverageHours !== 48
    || diagnostics?.transportMemoryReady !== true
    || diagnostics?.transportMemoryStatus !== 'READY'
    || diagnostics?.transportMemoryWindowHours !== 48
    || diagnostics?.transportMemoryCoverageHours !== 48) {
    throw new Error('Candidate G rollback score quality requires exact READY 48-hour state');
  }
  const score = result.score;
  return {
    ...result,
    scoreBounds: {
      lower: score,
      upper: score,
      modelUncertaintyPoints: 0,
      rawLower: score,
      rawUpper: score,
    },
    scoreQuality: 'FULL_HISTORY',
    calibrationEligible: false,
    scoreSemantics: 'EXACT_POINT_SCORE',
    conservativeTailResetApplied: false,
    historyCoverageHours: 48,
    historyReasonCodes: [],
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

export function candidateGRollbackScoreProfile({
  modelCoverageReady = false,
  modelMemoryReady = false,
  modelMigrationReady = false,
} = {}) {
  return Object.freeze({
    schemaVersion: CANDIDATE_G_STATE_SCHEMA_VERSION,
    switchVersion: 'RAVSCORE-OPERATIONAL-ROLLBACK-DEC-0110-V2',
    requestedProfileId: RAVSCORE_MODEL_ID,
    activeProfileId: RAVSCORE_MODEL_ID,
    stateSchemaVersion: RAVSCORE_STATE_SCHEMA_VERSION,
    variantId: RAVSCORE_VARIANT_ID,
    profileId: RAVSCORE_PROFILE_ID,
    componentSchemaId: RAVSCORE_COMPONENT_SCHEMA_ID,
    explanationSchemaId: RAVSCORE_EXPLANATION_SCHEMA_ID,
    rankingPolicyId: RAVSCORE_RANKING_POLICY_ID,
    bestTimePolicyId: RAVSCORE_BEST_TIME_POLICY_ID,
    presentationPolicyId: RAVSCORE_PRESENTATION_POLICY_ID,
    modelContractSha256: RAVSCORE_MODEL_CONTRACT_SHA256,
    modelBundleSha256: RAVSCORE_MODEL_BUNDLE_SHA256,
    rollbackModelId: null,
    runtimeFallbackModelId: null,
    modelCoverageReady: modelCoverageReady === true,
    modelMemoryReady: modelMemoryReady === true,
    modelMigrationReady: modelMigrationReady === true,
    memoryReferenceScope: 'CURRENT_COMMON_ZONE_REFERENCE',
    activationState: 'manual-candidate-g-only-local-fail-closed',
    advisories: [],
    publicAvailabilityPolicy: 'candidate-g-local-fail-closed',
    crossModelRuntimeFallbackAllowed: false,
    automaticActivationAllowed: false,
  });
}

/**
 * Replays the exact Candidate G oracle from either its own schema-2 state or
 * the integrated schema-4 rollback adapter. The caller's hourly rows remain
 * private. Returned continuation state contains only bounded derived signed
 * evidence and never raw U/V, coordinates or weather history.
 */
export function buildCandidateGRollbackPartScoreSeries({
  part,
  zone,
  hourly = [],
  previousCandidateGContinuation = null,
  legacyCandidateGMigrationState = null,
  measuredColdStart = false,
  nativeCadenceHoldHours = 0,
  nativeCadenceReferenceSample = null,
  scoreStartAt = null,
} = {}) {
  if (!part || typeof part !== 'object' || !Array.isArray(hourly)) {
    throw new Error('Candidate G rollback adapter requires one part and hourly rows');
  }
  assertStrictWeatherRows(hourly, part);
  if (!inRange(nativeCadenceHoldHours, 0, Number.POSITIVE_INFINITY)) {
    throw new Error('Candidate G rollback native cadence hold must be a strict non-negative number');
  }
  const stateKey = candidateGStateKey(part);
  const rollbackInitialState = candidateInitialState({
    previousCandidateGContinuation,
    legacyCandidateGMigrationState,
    measuredColdStart,
    part,
  });
  const candidateGState = buildSourceBoundCandidateGStateSeries(hourly.map(weather => ({
    time: weather.time,
    currentSpeedMps: weather.currentSpeedMps,
    currentAlignment: finite(weather.currentSpeedMps) && finite(weather.currentDirectionDeg)
      ? Math.cos((weather.currentDirectionDeg - part.onshoreDirectionDeg)
        * Math.PI / 180)
      : null,
    currentVerified: finite(weather.currentSpeedMps)
      && finite(weather.currentDirectionDeg)
      && weather.currentProvenance?.status === 'verified',
    currentProvenance: weather.currentProvenance ?? null,
    waveHeightM: weather.waveHeightM,
    wavePeriodS: weather.wavePeriodS,
  })), {
    part,
    stateKey,
    initialState: rollbackInitialState.state,
    nativeCadenceHoldHours,
    nativeCadenceReferenceSample,
  });
  candidateGState.initialStateSource = rollbackInitialState.source;
  const stateByTime = new Map(candidateGState.rows.map(row => [row.time, row]));
  const currentSamples = hourly
    .filter(weather => finite(weather.currentSpeedMps)
      && finite(weather.currentDirectionDeg)
      && weather.currentProvenance?.status === 'verified')
    .map(weather => ({
      at: weather.time,
      currentSpeedMps: weather.currentSpeedMps,
      currentDirectionDeg: weather.currentDirectionDeg,
      currentAlignment: Math.cos((weather.currentDirectionDeg
        - part.onshoreDirectionDeg) * Math.PI / 180),
      currentVerified: true,
    }));
  const scoreStartMs = scoreStartAt === null || scoreStartAt === undefined
    ? Number.NEGATIVE_INFINITY
    : Date.parse(scoreStartAt);
  if (!Number.isFinite(scoreStartMs) && scoreStartMs !== Number.NEGATIVE_INFINITY) {
    throw new Error('Candidate G rollback score start must be a valid time');
  }
  const profile = candidateGRollbackScoreProfile({
    modelCoverageReady: true,
    modelMemoryReady: true,
    modelMigrationReady: true,
  });
  const scores = hourly.flatMap(weather => {
    if (Date.parse(weather.time) < scoreStartMs) return [];
    const derivedState = stateByTime.get(weather.time);
    if (!derivedState) return [];
    const at = Date.parse(weather.time);
    const history = applyCurrentTransportToHistory(
      {},
      currentSamples.filter(sample => Date.parse(sample.at) <= at),
    );
    const publicContext = {
      windSpeedMps: weather.windSpeedMps,
      waveHeightM: weather.waveHeightM,
      currentSpeedMps: weather.currentSpeedMps,
      currentAlignment: finite(weather.currentSpeedMps) && finite(weather.currentDirectionDeg)
        ? Math.cos((weather.currentDirectionDeg - part.onshoreDirectionDeg)
          * Math.PI / 180)
        : null,
      currentVerified: derivedState.currentVerified === true,
      currentTransition: derivedState.currentTransition,
      transportReferenceAt: derivedState.transportReferenceAt,
      transportMemoryReady: derivedState.transportMemoryReady,
      transportMemoryStatus: derivedState.transportMemoryStatus,
      transportMemoryCoverageHours: derivedState.transportMemoryCoverageHours,
      transportMemoryWindowHours: derivedState.transportMemoryWindowHours,
      outboundEpisodeEffectiveHours: derivedState.outboundEpisodeEffectiveHours,
      outboundEpisodeLossPoints: derivedState.outboundEpisodeLossPoints,
      actualOutboundTransport: derivedState.actualOutboundTransport,
      waveMobilisationTransition: derivedState.waveMobilisationTransition,
    };
    const modes = Object.fromEntries(['waders', 'beach'].map(mode => {
      const compact = compactCandidateGMode(evaluateRavScoreCandidateG(
        { mode, zone, weather, history },
        {
          variantId: CANDIDATE_G_STATE_VARIANT_ID,
          nativeCadenceHold: derivedState.currentTransition === 'NATIVE_CADENCE_HOLD'
            ? {
              transition: derivedState.currentTransition,
              evaluatedAt: weather.time,
              referenceAt: derivedState.transportReferenceAt,
              maximumHoldHours: nativeCadenceHoldHours,
              transportMemoryReady: derivedState.transportMemoryReady,
              transportMemoryStatus: derivedState.transportMemoryStatus,
            }
            : null,
          memory: {
            transportPotential: derivedState.transportPotential,
            outboundEpisodeEffectiveHours: derivedState.outboundEpisodeEffectiveHours,
            outboundEpisodeLossPoints: derivedState.outboundEpisodeLossPoints,
            actualOutboundTransport: derivedState.actualOutboundTransport,
            mobilisationPotential: derivedState.mobilisationPotential,
            waveEnergyProxy: derivedState.waveEnergyProxy,
            waveEnergyScore: derivedState.waveEnergyScore,
            waveMobilisationTransition: derivedState.waveMobilisationTransition,
            waveMobilisationBuildHalfLifeHours:
              derivedState.waveMobilisationBuildHalfLifeHours,
            waveMobilisationDecayHalfLifeHours:
              derivedState.waveMobilisationDecayHalfLifeHours,
          },
        },
      ));
      const projected = compact.available
        ? projectReadyCandidateGRollbackScoreQuality({
          ...projectCandidateGForPublic(compact, { mode, profile, context: publicContext }),
          modelBinding: ravScoreModelBinding(),
        }, derivedState)
        : compact;
      return [mode, { compact, projected }];
    }));
    return [{
      time: weather.time,
      weather: scoreWeatherProjection(weather),
      candidateG: {
        ...ravScoreModelBinding(),
        rollbackId: CANDIDATE_G_OPERATIONAL_ROLLBACK_ID,
        referenceAt: weather.time,
        continuationState: derivedState.continuationState,
        transportReferenceAt: derivedState.transportReferenceAt,
        transportMemoryReady: derivedState.transportMemoryReady,
        transportMemoryStatus: derivedState.transportMemoryStatus,
        transportMemoryCoverageHours: derivedState.transportMemoryCoverageHours,
        transportMemoryWindowHours: derivedState.transportMemoryWindowHours,
        publicContext,
        modes: Object.fromEntries(Object.entries(modes).map(([mode, value]) => [
          mode,
          value.compact,
        ])),
        publicModes: Object.fromEntries(Object.entries(modes).map(([mode, value]) => [
          mode,
          value.projected,
        ])),
      },
    }];
  });
  return { candidateGState, scores };
}

export function candidateGRollbackReferenceReadiness(partRows, referenceTime) {
  const readiness = candidateGReferenceReadiness(partRows, referenceTime);
  return Object.freeze({
    modelCoverageReady: readiness.candidateCoverageReady,
    modelMemoryReady: readiness.candidateMemoryReady,
    modelMigrationReady: readiness.candidateWarmupEligible,
    referenceZoneCount: readiness.referenceZoneCount,
    referencePartCount: readiness.referencePartCount,
  });
}

export function assertCandidateGRollbackBinding() {
  if (RAVSCORE_MODEL_ID !== CANDIDATE_G_STATE_MODEL_ID
    || RAVSCORE_STATE_SCHEMA_VERSION !== CANDIDATE_G_STATE_SCHEMA_VERSION
    || RAVSCORE_VARIANT_ID !== CANDIDATE_G_STATE_VARIANT_ID
    || RAVSCORE_PROFILE_ID !== CANDIDATE_G_STATE_PROFILE_ID) {
    throw new Error('Candidate G rollback public binding diverges from the exact state oracle');
  }
  return true;
}
