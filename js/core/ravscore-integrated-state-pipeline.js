import {
  CANDIDATE_G_STATE_MODEL_ID,
  CANDIDATE_G_STATE_PROFILE_ID,
  CANDIDATE_G_STATE_SCHEMA_VERSION,
  CANDIDATE_G_STATE_VARIANT_ID,
} from './ravscore-candidate-g-state-pipeline.js';
import {
  buildBoundedCurrentTransportMemory,
  CURRENT_TRANSPORT_BOUNDED_MEMORY_POLICY,
  CURRENT_TRANSPORT_POTENTIAL_RECOMMENDED_RESEARCH_PROFILE,
} from './ravscore-regime-memory.js';
import {
  CURRENT_SUPPLY_MEMORY_POLICY,
  buildCurrentSupplyMemory,
  deriveCurrentSupplyEvidence,
} from './ravscore-current-supply-memory.js';
import {
  RAVSCORE_WAVE_MOBILISATION_POLICY,
  RAVSCORE_WAVE_MOBILISATION_STATE_SCHEMA_VERSION,
  buildRavScoreWaveMobilisationStateSeries,
} from './ravscore-wave-mobilisation-state.js';
import {
  RAVSCORE_BEST_TIME_POLICY_ID,
  RAVSCORE_COLD_REPLAY_ID,
  RAVSCORE_COMPONENT_SCHEMA_ID,
  RAVSCORE_EXPLANATION_SCHEMA_ID,
  RAVSCORE_MIGRATION_ID,
  RAVSCORE_MODEL_BUNDLE_SHA256,
  RAVSCORE_MODEL_CONTRACT_SHA256,
  RAVSCORE_MODEL_ID,
  RAVSCORE_PROFILE_ID,
  RAVSCORE_PRESENTATION_POLICY_ID,
  RAVSCORE_RANKING_POLICY_ID,
  RAVSCORE_ROLLBACK_ID,
  RAVSCORE_RECOVERY_POLICY,
  RAVSCORE_STATE_SCHEMA_VERSION,
  RAVSCORE_VARIANT_ID,
} from './ravscore-model-contract.js';

const HOUR_MS = 3_600_000;
const EPSILON = 1e-9;
const CANDIDATE_G_MAX_CONTINUATION_EVIDENCE_POINTS = 49;
const EXPLICIT_TIME_ZONE = /(?:Z|[+-]\d{2}:\d{2})$/i;
const CANDIDATE_G_CURRENT_BOOTSTRAP_KEYS = Object.freeze([
  'migrationId',
  'source',
  'samplingContextKey',
  'sourceStateTime',
  'currentReferenceAt',
  'currentEvidence',
  'currentNativeHoldAuthorization',
]);
const NATIVE_HOLD_AUTHORIZATION_KEYS = Object.freeze([
  'sourceClass',
  'source',
  'collection',
  'distanceKm',
]);
const CANDIDATE_G_CONTINUATION_KEYS = Object.freeze([
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
const INTEGRATED_CONTINUATION_KEYS = Object.freeze([
  'schemaVersion',
  'modelId',
  'variantId',
  'profileId',
  'componentSchemaId',
  'explanationSchemaId',
  'rankingPolicyId',
  'bestTimePolicyId',
  'presentationPolicyId',
  'modelContractSha256',
  'modelBundleSha256',
  'samplingContextKey',
  'time',
  'currentReferenceAt',
  'currentMemoryReady',
  'currentMemoryStatus',
  'currentMemoryWindowHours',
  'currentMemoryCoverageHours',
  'currentEvidence',
  'currentNativeHoldAuthorization',
  'supplyPotential',
  'waveStateSchemaVersion',
  'wavePolicyId',
  'waveLastVerifiedAt',
  'waveMigrationSeedAt',
  'waveMemoryReady',
  'waveMemoryStatus',
  'waveEnergyScore',
  'waveMigrationSeedAwaitingReference',
  'mobilisationPotential',
  'rollbackCandidateGMobilisationPotential',
  'lineage',
]);
const finite = value => typeof value === 'number' && Number.isFinite(value);
const validTime = value => typeof value === 'string'
  && EXPLICIT_TIME_ZONE.test(value)
  && Number.isFinite(Date.parse(value));
const canonicalTime = value => validTime(value) ? new Date(value).toISOString() : null;
const close = (left, right) => finite(left) && finite(right)
  && Math.abs(Number(left) - Number(right)) <= EPSILON;

function currentCoastNormalSpeed(sample) {
  if (Object.prototype.hasOwnProperty.call(sample ?? {}, 'currentCoastNormalSpeedMps')) {
    return finite(sample.currentCoastNormalSpeedMps)
      ? sample.currentCoastNormalSpeedMps
      : null;
  }
  return finite(sample?.currentSpeedMps) && finite(sample?.currentAlignment)
    ? sample.currentSpeedMps * sample.currentAlignment
    : null;
}

function hasExactKeys(value, keys) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) return false;
  const actual = Object.keys(value).sort();
  const expected = [...keys].sort();
  return actual.length === expected.length
    && actual.every((key, index) => key === expected[index]);
}

function canonicalNativeHoldAuthorization(value) {
  if (value === null || value === undefined) return null;
  if (!hasExactKeys(value, NATIVE_HOLD_AUTHORIZATION_KEYS)
    || value.sourceClass !== 'owner-approved-regional-proxy'
    || value.source !== 'dmi-dkss-lf-regional-proxy'
    || value.collection !== 'dkss_lf'
    || !finite(value.distanceKm)
    || value.distanceKm < 0
    || value.distanceKm > 15) {
    throw new Error('Integrated RavScore native-hold authorization is invalid');
  }
  return {
    sourceClass: value.sourceClass,
    source: value.source,
    collection: value.collection,
    distanceKm: value.distanceKm,
  };
}

function nativeHoldAuthorizationFromProvenance(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)
    || value.status !== 'verified'
    || value.sourceClass !== 'owner-approved-regional-proxy'
    || value.source !== 'dmi-dkss-lf-regional-proxy'
    || value.collection !== 'dkss_lf'
    || !finite(value.distanceKm)
    || value.distanceKm < 0
    || value.distanceKm > 15) return null;
  return canonicalNativeHoldAuthorization({
    sourceClass: value.sourceClass,
    source: value.source,
    collection: value.collection,
    distanceKm: value.distanceKm,
  });
}

function sameNativeHoldAuthorization(left, right) {
  return JSON.stringify(left) === JSON.stringify(right);
}

function canonicalEvidence(value, { maximum = 50, allowMissing = true } = {}) {
  if (!Array.isArray(value) || value.length < 1 || value.length > maximum) return null;
  let previousMs = Number.NEGATIVE_INFINITY;
  return value.map(item => {
    const time = canonicalTime(item?.time);
    const strength = item?.strength;
    if (!time || (strength === null ? !allowMissing : !finite(strength))
      || (strength !== null && (Number(strength) < -1 || Number(strength) > 1))) {
      throw new Error('RavScore state contains invalid signed current evidence');
    }
    const timeMs = Date.parse(time);
    if (timeMs <= previousMs) throw new Error('RavScore state current evidence is not strictly ordered');
    previousMs = timeMs;
    return { time, strength: strength === null ? null : Number(strength) };
  });
}

function canonicalLineage(value, stateTime) {
  if (value === null || value === undefined) return null;
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('Integrated RavScore migration lineage is invalid');
  }
  const migrationKeys = [
    'migratedAt',
    'migrationId',
    'sourceModelId',
    'sourceStateSchemaVersion',
  ];
  if (Object.keys(value).sort().join('|') === migrationKeys.sort().join('|')) {
    if (value.migrationId !== RAVSCORE_MIGRATION_ID
      || value.sourceModelId !== CANDIDATE_G_STATE_MODEL_ID
      || value.sourceStateSchemaVersion !== CANDIDATE_G_STATE_SCHEMA_VERSION) {
      throw new Error('Integrated RavScore migration lineage is incompatible');
    }
    const migratedAt = canonicalTime(value.migratedAt);
    if (!migratedAt || (stateTime && Date.parse(migratedAt) > Date.parse(stateTime))) {
      throw new Error('Integrated RavScore migration lineage has an invalid causal time');
    }
    return {
      migrationId: RAVSCORE_MIGRATION_ID,
      sourceModelId: CANDIDATE_G_STATE_MODEL_ID,
      sourceStateSchemaVersion: CANDIDATE_G_STATE_SCHEMA_VERSION,
      migratedAt,
    };
  }
  const coldReplayKeys = ['recoveryId', 'replayedHourCount', 'source', 'targetReferenceAt'];
  const targetReferenceAt = canonicalTime(value.targetReferenceAt);
  if (Object.keys(value).sort().join('|') !== coldReplayKeys.sort().join('|')
    || value.recoveryId !== RAVSCORE_COLD_REPLAY_ID
    || value.source !== RAVSCORE_RECOVERY_POLICY.source
    || value.replayedHourCount !== RAVSCORE_RECOVERY_POLICY.coldReplayHours
    || !targetReferenceAt
    || (stateTime && Date.parse(targetReferenceAt) > Date.parse(stateTime))) {
    throw new Error('Integrated RavScore cold-replay lineage is incompatible');
  }
  return {
    recoveryId: RAVSCORE_COLD_REPLAY_ID,
    source: RAVSCORE_RECOVERY_POLICY.source,
    replayedHourCount: RAVSCORE_RECOVERY_POLICY.coldReplayHours,
    targetReferenceAt,
  };
}

function verifiedColdReplayBootstrap(value, ordered) {
  if (value === null || value === undefined) return null;
  if (!value || typeof value !== 'object' || Array.isArray(value)
    || Object.keys(value).sort().join('|')
      !== ['recoveryId', 'replayedHourCount', 'targetReferenceAt'].sort().join('|')
    || value.recoveryId !== RAVSCORE_COLD_REPLAY_ID
    || value.replayedHourCount !== RAVSCORE_RECOVERY_POLICY.coldReplayHours) {
    throw new Error('Integrated RavScore cold-replay bootstrap proof is invalid');
  }
  const targetReferenceAt = canonicalTime(value.targetReferenceAt);
  if (!targetReferenceAt) {
    throw new Error('Integrated RavScore cold-replay target is invalid');
  }
  const targetMs = Date.parse(targetReferenceAt);
  const replayHours = RAVSCORE_RECOVERY_POLICY.coldReplayHours;
  const expected = Array.from({ length: replayHours }, (_, index) =>
    new Date(targetMs - (replayHours - index) * HOUR_MS).toISOString());
  const beforeTarget = ordered
    .filter(row => Date.parse(row.time) < targetMs)
    .map(row => row.time);
  if (beforeTarget.length !== replayHours
    || beforeTarget.some((time, index) => time !== expected[index])
    || !ordered.some(row => row.time === targetReferenceAt)) {
    throw new Error('Integrated RavScore cold replay is not an exact verified 48-hour bridge');
  }
  return {
    recoveryId: RAVSCORE_COLD_REPLAY_ID,
    source: RAVSCORE_RECOVERY_POLICY.source,
    replayedHourCount: replayHours,
    targetReferenceAt,
  };
}

export function validateCandidateGMigrationSource(
  initialState,
  expectedStateKey,
  firstSampleTime = null,
) {
  if (initialState.schemaVersion !== CANDIDATE_G_STATE_SCHEMA_VERSION
    || initialState.modelId !== CANDIDATE_G_STATE_MODEL_ID
    || initialState.variantId !== CANDIDATE_G_STATE_VARIANT_ID
    || initialState.profileId !== CANDIDATE_G_STATE_PROFILE_ID) {
    return null;
  }
  const canonicalCandidateG = hasExactKeys(initialState, CANDIDATE_G_CONTINUATION_KEYS);
  const reconstructedRollback = hasExactKeys(initialState, [
    ...CANDIDATE_G_CONTINUATION_KEYS,
    'rollbackId',
  ]) && initialState.rollbackId === RAVSCORE_ROLLBACK_ID;
  if (!canonicalCandidateG && !reconstructedRollback) {
    throw new Error('Candidate G migration state has a non-canonical field set');
  }
  if (typeof expectedStateKey !== 'string' || !expectedStateKey
    || initialState.stateKey !== expectedStateKey) {
    throw new Error('Candidate G migration state has an incompatible sampling context');
  }
  const time = canonicalTime(initialState.time);
  const currentReferenceAt = canonicalTime(initialState.transportReferenceAt ?? initialState.time);
  if (!time || initialState.time !== time
    || !currentReferenceAt || initialState.transportReferenceAt !== currentReferenceAt
    || Date.parse(currentReferenceAt) > Date.parse(time)
    || (Date.parse(time) - Date.parse(currentReferenceAt)) / HOUR_MS
      > CURRENT_TRANSPORT_BOUNDED_MEMORY_POLICY.maximumGapHours + EPSILON
    || (firstSampleTime && Date.parse(time) > Date.parse(firstSampleTime))) {
    throw new Error('Candidate G migration state has an invalid causal time');
  }
  if (initialState.transportMemoryReady !== true
    || initialState.transportMemoryStatus !== 'READY'
    || !finite(initialState.transportMemoryWindowHours)
    || initialState.transportMemoryWindowHours !== 48
    || !close(initialState.transportMemoryCoverageHours, 48)
    || !finite(initialState.transportPotential)
    || Number(initialState.transportPotential) < 0
    || Number(initialState.transportPotential) > 100
    || !finite(initialState.outboundEpisodeEffectiveHours)
    || Number(initialState.outboundEpisodeEffectiveHours) < 0
    || !finite(initialState.mobilisationPotential)
    || Number(initialState.mobilisationPotential) < 0
    || Number(initialState.mobilisationPotential) > 100) {
    throw new Error('Candidate G migration requires a complete READY schema-2 state');
  }
  const evidence = canonicalEvidence(initialState.transportEvidence, {
    maximum: 49,
    allowMissing: false,
  });
  if (JSON.stringify(initialState.transportEvidence) !== JSON.stringify(evidence)) {
    throw new Error('Candidate G migration evidence is not canonical');
  }
  if (Date.parse(evidence.at(-1)?.time ?? '') !== Date.parse(currentReferenceAt)) {
    throw new Error('Candidate G migration evidence does not end at its current reference');
  }
  const rebuilt = buildBoundedCurrentTransportMemory(evidence, {
    ...CURRENT_TRANSPORT_POTENTIAL_RECOMMENDED_RESEARCH_PROFILE,
    referenceTime: currentReferenceAt,
    restartAfterVerifiedTimeGap: true,
  });
  if (!rebuilt.result
    || rebuilt.memoryReady !== true
    || rebuilt.status !== 'READY'
    || Number(rebuilt.windowHours) !== Number(initialState.transportMemoryWindowHours)
    || !close(rebuilt.coverageHours, initialState.transportMemoryCoverageHours)
    || JSON.stringify(rebuilt.evidence) !== JSON.stringify(evidence)
    || !close(rebuilt.result.transportPotential, initialState.transportPotential)
    || !close(
      rebuilt.result.outboundEpisodeEffectiveHours,
      initialState.outboundEpisodeEffectiveHours,
    )) {
    throw new Error('Candidate G migration metadata contradicts its signed evidence oracle');
  }
  return {
    time,
    currentReferenceAt,
    mobilisationPotential: Number(initialState.mobilisationPotential),
  };
}

function validateCandidateGCurrentBootstrap(
  value,
  { samplingContextKey, migrated },
) {
  if (!hasExactKeys(value, CANDIDATE_G_CURRENT_BOOTSTRAP_KEYS)
    || value.migrationId !== RAVSCORE_MIGRATION_ID
    || value.source !== 'VERIFIED_PRIVATE_RAW_UV_REBUILD'
    || value.samplingContextKey !== samplingContextKey
    || canonicalTime(value.sourceStateTime) !== migrated.time
    || value.sourceStateTime !== migrated.time
    || canonicalTime(value.currentReferenceAt) !== migrated.currentReferenceAt
    || value.currentReferenceAt !== migrated.currentReferenceAt) {
    throw new Error('Candidate G exact-current migration bootstrap is incompatible');
  }
  const evidence = canonicalEvidence(value.currentEvidence, {
    maximum: CURRENT_SUPPLY_MEMORY_POLICY.maximumRetainedEvidencePoints,
    allowMissing: false,
  });
  if (!evidence
    || JSON.stringify(value.currentEvidence) !== JSON.stringify(evidence)
    || evidence.at(-1)?.time !== migrated.currentReferenceAt) {
    throw new Error('Candidate G exact-current migration bootstrap is not canonical');
  }
  const currentNativeHoldAuthorization = canonicalNativeHoldAuthorization(
    value.currentNativeHoldAuthorization,
  );
  if (!sameNativeHoldAuthorization(
    value.currentNativeHoldAuthorization ?? null,
    currentNativeHoldAuthorization,
  )) {
    throw new Error('Candidate G exact-current migration hold proof is not canonical');
  }
  const rebuilt = buildCurrentSupplyMemory(evidence, {
    referenceTime: migrated.currentReferenceAt,
    nativeHold: false,
  });
  if (rebuilt.memoryReady !== true
    || rebuilt.status !== 'READY'
    || rebuilt.referenceTime !== migrated.currentReferenceAt
    || rebuilt.requestedReferenceTime !== migrated.currentReferenceAt
    || rebuilt.coverageHours !== CURRENT_SUPPLY_MEMORY_POLICY.windowHours
    || JSON.stringify(rebuilt.evidence) !== JSON.stringify(evidence)) {
    throw new Error('Candidate G exact-current migration bootstrap is incomplete');
  }
  return {
    currentEvidence: evidence,
    currentNativeHoldAuthorization,
  };
}

function waveContinuationFromIntegratedState(state) {
  return {
    schemaVersion: state.waveStateSchemaVersion,
    policyId: state.wavePolicyId,
    time: state.time,
    waveReferenceAt: state.waveLastVerifiedAt,
    migrationSeedAt: state.waveMigrationSeedAt,
    mobilisationPotential: state.mobilisationPotential,
    rollbackCandidateGMobilisationPotential: state.rollbackCandidateGMobilisationPotential,
    waveEnergyScore: state.waveEnergyScore,
    readiness: state.waveMemoryReady,
    status: state.waveMemoryStatus,
    migrationSeedAwaitingReference: state.waveMigrationSeedAwaitingReference,
  };
}

function validateIntegratedState(initialState, samplingContextKey, firstSampleTime) {
  if (initialState.schemaVersion !== RAVSCORE_STATE_SCHEMA_VERSION
    || initialState.modelId !== RAVSCORE_MODEL_ID
    || initialState.variantId !== RAVSCORE_VARIANT_ID
    || initialState.profileId !== RAVSCORE_PROFILE_ID
    || initialState.componentSchemaId !== RAVSCORE_COMPONENT_SCHEMA_ID
    || initialState.explanationSchemaId !== RAVSCORE_EXPLANATION_SCHEMA_ID
    || initialState.rankingPolicyId !== RAVSCORE_RANKING_POLICY_ID
    || initialState.bestTimePolicyId !== RAVSCORE_BEST_TIME_POLICY_ID
    || initialState.presentationPolicyId !== RAVSCORE_PRESENTATION_POLICY_ID
    || initialState.modelContractSha256 !== RAVSCORE_MODEL_CONTRACT_SHA256
    || initialState.modelBundleSha256 !== RAVSCORE_MODEL_BUNDLE_SHA256) {
    return null;
  }
  if (!hasExactKeys(initialState, INTEGRATED_CONTINUATION_KEYS)) {
    throw new Error('Integrated RavScore state has a non-canonical field set');
  }
  if (initialState.samplingContextKey !== samplingContextKey) {
    throw new Error('Integrated RavScore state has an incompatible sampling context');
  }
  const time = canonicalTime(initialState.time);
  const currentReferenceAt = canonicalTime(initialState.currentReferenceAt);
  if (!time || initialState.time !== time
    || !currentReferenceAt || initialState.currentReferenceAt !== currentReferenceAt
    || Date.parse(currentReferenceAt) > Date.parse(time)
    || (Date.parse(time) - Date.parse(currentReferenceAt)) / HOUR_MS
      > CURRENT_SUPPLY_MEMORY_POLICY.maximumGapHours + EPSILON
    || (firstSampleTime && Date.parse(time) > Date.parse(firstSampleTime))) {
    throw new Error('Integrated RavScore state has an invalid causal time');
  }
  const evidence = canonicalEvidence(initialState.currentEvidence, {
    maximum: CURRENT_SUPPLY_MEMORY_POLICY.maximumRetainedEvidencePoints,
    allowMissing: true,
  });
  if (!evidence) throw new Error('Integrated RavScore state lacks compact current evidence');
  const currentNativeHoldAuthorization = canonicalNativeHoldAuthorization(
    initialState.currentNativeHoldAuthorization,
  );
  if (!sameNativeHoldAuthorization(
    initialState.currentNativeHoldAuthorization ?? null,
    currentNativeHoldAuthorization,
  )) {
    throw new Error('Integrated RavScore state has a non-canonical native-hold proof');
  }
  const latestVerifiedCurrentAt = [...evidence]
    .reverse()
    .find(item => finite(item?.strength))?.time ?? null;
  if ((currentReferenceAt !== time && currentNativeHoldAuthorization === null)
    || (currentNativeHoldAuthorization !== null
      && latestVerifiedCurrentAt !== currentReferenceAt)) {
    throw new Error('Integrated RavScore state has an unbound native-hold proof');
  }
  for (const [field, value] of [
    ['waveLastVerifiedAt', initialState.waveLastVerifiedAt],
    ['waveMigrationSeedAt', initialState.waveMigrationSeedAt],
  ]) {
    if (value !== null && canonicalTime(value) !== value) {
      throw new Error(`Integrated RavScore state has non-canonical ${field}`);
    }
  }
  const nativeHold = currentReferenceAt !== time
    && currentNativeHoldAuthorization !== null;
  const rebuilt = buildCurrentSupplyMemory(evidence, {
    referenceTime: time,
    nativeHold,
  });
  const rebuiltPotentialMatches = rebuilt.supplyPotential === null
    ? initialState.supplyPotential === null
    : close(initialState.supplyPotential, rebuilt.supplyPotential);
  if (rebuilt.memoryReady !== initialState.currentMemoryReady
    || rebuilt.status !== initialState.currentMemoryStatus
    || rebuilt.referenceTime !== currentReferenceAt
    || rebuilt.requestedReferenceTime !== time
    || !finite(initialState.currentMemoryWindowHours)
    || initialState.currentMemoryWindowHours !== rebuilt.windowHours
    || !close(initialState.currentMemoryCoverageHours, rebuilt.coverageHours)
    || !rebuiltPotentialMatches
    || JSON.stringify(initialState.currentEvidence) !== JSON.stringify(evidence)) {
    throw new Error('Integrated RavScore state contradicts its signed current evidence');
  }
  const waveState = waveContinuationFromIntegratedState({
    ...initialState,
    time,
  });
  // The wave builder owns validation of its compact substate.
  buildRavScoreWaveMobilisationStateSeries([], { initialState: waveState });
  const lineage = canonicalLineage(initialState.lineage, time);
  const lineageTime = lineage?.migratedAt ?? lineage?.targetReferenceAt ?? null;
  const initialLineageTime = initialState.lineage?.migratedAt
    ?? initialState.lineage?.targetReferenceAt
    ?? null;
  if (lineageTime !== initialLineageTime) {
    throw new Error('Integrated RavScore state has non-canonical lineage time');
  }
  return {
    time,
    currentReferenceAt,
    currentEvidence: evidence,
    currentNativeHoldAuthorization,
    waveState,
    lineage,
  };
}

function integratedContext(initialState) {
  return initialState?.schemaVersion === RAVSCORE_STATE_SCHEMA_VERSION
    || initialState?.modelId === RAVSCORE_MODEL_ID;
}

function candidateGContext(initialState) {
  return initialState?.schemaVersion === CANDIDATE_G_STATE_SCHEMA_VERSION
    || initialState?.modelId === CANDIDATE_G_STATE_MODEL_ID;
}

function compactIntegratedState({ samplingContextKey, current, wave, lineage }) {
  return {
    schemaVersion: RAVSCORE_STATE_SCHEMA_VERSION,
    modelId: RAVSCORE_MODEL_ID,
    variantId: RAVSCORE_VARIANT_ID,
    profileId: RAVSCORE_PROFILE_ID,
    componentSchemaId: RAVSCORE_COMPONENT_SCHEMA_ID,
    explanationSchemaId: RAVSCORE_EXPLANATION_SCHEMA_ID,
    rankingPolicyId: RAVSCORE_RANKING_POLICY_ID,
    bestTimePolicyId: RAVSCORE_BEST_TIME_POLICY_ID,
    presentationPolicyId: RAVSCORE_PRESENTATION_POLICY_ID,
    modelContractSha256: RAVSCORE_MODEL_CONTRACT_SHA256,
    modelBundleSha256: RAVSCORE_MODEL_BUNDLE_SHA256,
    samplingContextKey,
    time: current.requestedReferenceTime,
    currentReferenceAt: current.referenceTime,
    currentMemoryReady: current.memoryReady,
    currentMemoryStatus: current.status,
    currentMemoryWindowHours: current.windowHours,
    currentMemoryCoverageHours: current.coverageHours,
    currentEvidence: current.evidence.map(item => ({ ...item })),
    currentNativeHoldAuthorization: current.currentNativeHoldAuthorization,
    supplyPotential: current.memoryReady ? current.supplyPotential : null,
    waveStateSchemaVersion: RAVSCORE_WAVE_MOBILISATION_STATE_SCHEMA_VERSION,
    wavePolicyId: RAVSCORE_WAVE_MOBILISATION_POLICY.id,
    waveLastVerifiedAt: wave.waveReferenceAt,
    waveMigrationSeedAt: wave.continuationState.migrationSeedAt,
    waveMemoryReady: wave.readiness,
    waveMemoryStatus: wave.status,
    waveEnergyScore: wave.continuationState.waveEnergyScore,
    waveMigrationSeedAwaitingReference:
      wave.continuationState.migrationSeedAwaitingReference,
    mobilisationPotential: wave.mobilisationPotential,
    rollbackCandidateGMobilisationPotential:
      wave.rollbackCandidateGMobilisationPotential,
    lineage,
  };
}

/**
 * Builds the integrated schema-4 state from existing hourly rows. It accepts
 * either the same model's compact continuation or one exact Candidate G
 * schema-2 state. All raw weather remains in the caller and never enters the
 * compact continuation.
 */
export function buildIntegratedRavScoreStateSeries(
  samples = [],
  {
    samplingContextKey,
    initialState = null,
    expectedCandidateGStateKey = null,
    candidateGCurrentBootstrap = null,
    nativeCadenceHoldHours = 0,
    nativeCadenceReferenceSample = null,
    coldReplayBootstrap = null,
  } = {},
) {
  if (typeof samplingContextKey !== 'string' || !samplingContextKey) {
    throw new Error('Integrated RavScore state requires a samplingContextKey');
  }
  if (!(finite(nativeCadenceHoldHours)
    && Number(nativeCadenceHoldHours) >= 0
    && Number(nativeCadenceHoldHours) <= CURRENT_SUPPLY_MEMORY_POLICY.maximumGapHours)) {
    throw new Error('Integrated RavScore native cadence hold is outside the bounded policy');
  }
  const ordered = [...(Array.isArray(samples) ? samples : [])]
    .map((sample, index) => ({
      ...sample,
      time: canonicalTime(sample?.time)
        ?? (() => { throw new Error(`Integrated RavScore sample ${index} has an invalid time`); })(),
    }))
    .sort((left, right) => Date.parse(left.time) - Date.parse(right.time));
  for (let index = 1; index < ordered.length; index += 1) {
    if (ordered[index].time === ordered[index - 1].time) {
      throw new Error('Integrated RavScore samples must have unique times');
    }
  }
  const firstSampleTime = ordered[0]?.time ?? null;
  let initialStateAccepted = false;
  let migrationApplied = false;
  let initialStateSource = 'COLD_START';
  let currentEvidence = [];
  let currentNativeHoldAuthorization = null;
  let initialWaveState = null;
  let waveMigrationSeed = null;
  let lineage = null;
  let initialCausalTime = null;
  let coldReplayTargetAt = null;

  if (initialState !== null && initialState !== undefined && coldReplayBootstrap !== null) {
    throw new Error('Integrated RavScore cannot combine continuation and cold replay');
  }
  if ((initialState === null || initialState === undefined)
    && candidateGCurrentBootstrap !== null) {
    throw new Error('Integrated RavScore cannot use a migration bootstrap without Candidate G state');
  }
  if (initialState === null || initialState === undefined) {
    const coldReplay = verifiedColdReplayBootstrap(coldReplayBootstrap, ordered);
    if (coldReplay) {
      initialStateSource = 'VERIFIED_PRIVATE_48H_COLD_REPLAY';
      lineage = coldReplay;
      coldReplayTargetAt = coldReplay.targetReferenceAt;
    }
  }

  if (initialState !== null && initialState !== undefined) {
    if (typeof initialState !== 'object' || Array.isArray(initialState)) {
      throw new Error('Integrated RavScore initial state is invalid');
    }
    const continued = validateIntegratedState(initialState, samplingContextKey, firstSampleTime);
    if (continued) {
      initialCausalTime = continued.time;
      initialStateAccepted = true;
      initialStateSource = 'INTEGRATED_CONTINUATION';
      currentEvidence = continued.currentEvidence.map(item => ({ ...item }));
      currentNativeHoldAuthorization = continued.currentNativeHoldAuthorization;
      initialWaveState = continued.waveState;
      lineage = continued.lineage;
    } else {
      const migrated = validateCandidateGMigrationSource(
        initialState,
        expectedCandidateGStateKey,
        firstSampleTime,
      );
      if (!migrated) {
        if (integratedContext(initialState) || candidateGContext(initialState)) {
          throw new Error('Known RavScore state has incompatible model metadata');
        }
        throw new Error('Unknown RavScore state model cannot be continued or migrated');
      }
      migrationApplied = true;
      initialCausalTime = migrated.time;
      initialStateSource = 'CANDIDATE_G_SCHEMA2_MIGRATION';
      const currentBootstrap = validateCandidateGCurrentBootstrap(
        candidateGCurrentBootstrap,
        { samplingContextKey, migrated },
      );
      currentEvidence = currentBootstrap.currentEvidence.map(item => ({ ...item }));
      currentNativeHoldAuthorization =
        currentBootstrap.currentNativeHoldAuthorization;
      waveMigrationSeed = {
        time: migrated.time,
        mobilisationPotential: migrated.mobilisationPotential,
        rollbackCandidateGMobilisationPotential: migrated.mobilisationPotential,
      };
      lineage = {
        migrationId: RAVSCORE_MIGRATION_ID,
        sourceModelId: CANDIDATE_G_STATE_MODEL_ID,
        sourceStateSchemaVersion: CANDIDATE_G_STATE_SCHEMA_VERSION,
        migratedAt: migrated.time,
      };
    }
  }

  if (nativeCadenceReferenceSample !== null && nativeCadenceReferenceSample !== undefined) {
    const referenceEvidence = deriveCurrentSupplyEvidence(nativeCadenceReferenceSample, {
      getTime: value => value?.time,
      getNormalSpeed: currentCoastNormalSpeed,
      isVerified: value => value?.currentVerified === true,
    });
    if (!referenceEvidence || !finite(referenceEvidence.strength)
      || !firstSampleTime
      || !(Date.parse(firstSampleTime) > Date.parse(referenceEvidence.time))
      || (Date.parse(firstSampleTime) - Date.parse(referenceEvidence.time)) / HOUR_MS
        > Number(nativeCadenceHoldHours) + EPSILON) {
      throw new Error('Integrated RavScore native cadence reference is invalid');
    }
    const boundaryAuthorization = nativeHoldAuthorizationFromProvenance(
      nativeCadenceReferenceSample.currentProvenance,
    );
    if (boundaryAuthorization === null) {
      throw new Error('Integrated RavScore native cadence reference lacks exact regional proof');
    }
    const lastEvidenceMs = Date.parse(currentEvidence.at(-1)?.time ?? '');
    if (!Number.isFinite(lastEvidenceMs) || Date.parse(referenceEvidence.time) > lastEvidenceMs) {
      currentEvidence.push(referenceEvidence);
      currentNativeHoldAuthorization = boundaryAuthorization;
    } else if (referenceEvidence.time === currentEvidence.at(-1)?.time
      && !sameNativeHoldAuthorization(
        currentNativeHoldAuthorization,
        boundaryAuthorization,
      )) {
      throw new Error('Integrated RavScore native cadence reference conflicts with persisted proof');
    }
  }

  const currentRows = ordered.map(sample => {
    const evidence = deriveCurrentSupplyEvidence(sample, {
      getTime: value => value.time,
      getNormalSpeed: currentCoastNormalSpeed,
      isVerified: value => value.currentVerified === true,
    });
    const verifiedEvidence = sample.currentVerified === true
      && finite(evidence?.strength);
    if (sample.currentVerified === true && !verifiedEvidence) {
      throw new Error('Integrated RavScore verified current sample lacks exact signed evidence');
    }
    const sampleNativeHoldAuthorization = verifiedEvidence
      ? nativeHoldAuthorizationFromProvenance(sample.currentProvenance)
      : null;
    const lastVerified = [...currentEvidence]
      .reverse()
      .find(item => finite(item?.strength)) ?? null;
    const ageHours = lastVerified
      ? (Date.parse(sample.time) - Date.parse(lastVerified.time)) / HOUR_MS
      : Number.POSITIVE_INFINITY;
    const samePersistedStateTime = sample.time === initialCausalTime;
    const persistedEvidenceAtTime = currentEvidence.find(item => item.time === sample.time) ?? null;
    const evidenceAlreadyAtTime = persistedEvidenceAtTime !== null;
    if (samePersistedStateTime) {
      const sameStrength = persistedEvidenceAtTime === null
        ? evidence?.strength === null
        : (persistedEvidenceAtTime.strength === null && evidence?.strength === null)
          || (finite(persistedEvidenceAtTime.strength)
            && finite(evidence?.strength)
            && close(persistedEvidenceAtTime.strength, evidence.strength));
      if (!sameStrength) {
        throw new Error('Same-time current evidence conflicts with persisted supply state');
      }
      if (verifiedEvidence
        && !sameNativeHoldAuthorization(
          sampleNativeHoldAuthorization,
          currentNativeHoldAuthorization,
        )) {
        throw new Error('Same-time current provenance conflicts with persisted hold proof');
      }
    }
    const sameTimeHold = samePersistedStateTime || evidenceAlreadyAtTime;
    const nativeHold = (sameTimeHold && ageHours > 0)
      || (!verifiedEvidence
      && Number(nativeCadenceHoldHours) > 0
      && currentNativeHoldAuthorization !== null
      && ageHours > 0
      && ageHours <= Number(nativeCadenceHoldHours) + EPSILON);
    if (!sameTimeHold && !nativeHold && evidence) {
      currentEvidence.push(evidence);
      currentNativeHoldAuthorization = verifiedEvidence
        ? sampleNativeHoldAuthorization
        : null;
    }
    const memory = buildCurrentSupplyMemory(currentEvidence, {
      referenceTime: sample.time,
      nativeHold,
    });
    if (memory.evidence.length) currentEvidence = memory.evidence.map(item => ({ ...item }));
    return {
      ...memory,
      currentNativeHoldAuthorization,
      transition: sameTimeHold ? 'SAME_TIME_HOLD'
        : nativeHold ? 'NATIVE_CADENCE_HOLD'
        : sample.currentVerified === true ? 'VERIFIED_REPLAY'
          : 'UNVERIFIED_MISSING',
      currentVerified: verifiedEvidence,
    };
  });

  const waveSeries = buildRavScoreWaveMobilisationStateSeries(ordered, {
    initialState: initialWaveState,
    candidateGMigrationSeed: waveMigrationSeed,
    getTime: sample => sample.time,
    getWaveHeight: sample => sample.waveHeightM,
    getWavePeriod: sample => sample.wavePeriodS,
  });
  if (waveSeries.rows.length !== currentRows.length) {
    throw new Error('Integrated RavScore current and wave state rows diverged');
  }

  const rows = currentRows.map((current, index) => {
    const wave = waveSeries.rows[index];
    if (wave.time !== current.requestedReferenceTime) {
      throw new Error('Integrated RavScore current and wave times diverged');
    }
    const continuationState = compactIntegratedState({
      samplingContextKey,
      current,
      wave,
      lineage: coldReplayTargetAt !== null
        && Date.parse(current.requestedReferenceTime) < Date.parse(coldReplayTargetAt)
        ? null
        : lineage,
    });
    return {
      time: current.requestedReferenceTime,
      currentReferenceAt: current.referenceTime,
      currentMemoryReady: current.memoryReady,
      currentMemoryStatus: current.status,
      currentMemoryWindowHours: current.windowHours,
      currentMemoryCoverageHours: current.coverageHours,
      currentTransition: current.transition,
      currentVerified: current.currentVerified,
      currentReferenceProvenance: current.currentNativeHoldAuthorization === null
        ? null
        : {
          status: 'verified',
          ...current.currentNativeHoldAuthorization,
        },
      currentCoastNormalSpeedMps: current.currentVerified === true
        && current.transition !== 'NATIVE_CADENCE_HOLD'
        ? currentCoastNormalSpeed(ordered[index])
        : null,
      supplyPotential: current.memoryReady ? current.supplyPotential : null,
      mobilisationPotential: wave.mobilisationPotential,
      waveLastVerifiedAt: wave.waveReferenceAt,
      waveMemoryReady: wave.readiness,
      waveMemoryStatus: wave.status,
      waveTransition: wave.transition,
      waveEnergyProxy: wave.waveEnergyProxy,
      waveEnergyScore: wave.waveEnergyScore,
      waveCreditedDurationHours: wave.creditedDurationHours,
      migrationApplied,
      continuationState,
    };
  });

  return {
    schemaVersion: RAVSCORE_STATE_SCHEMA_VERSION,
    modelId: RAVSCORE_MODEL_ID,
    variantId: RAVSCORE_VARIANT_ID,
    profileId: RAVSCORE_PROFILE_ID,
    modelContractSha256: RAVSCORE_MODEL_CONTRACT_SHA256,
    modelBundleSha256: RAVSCORE_MODEL_BUNDLE_SHA256,
    samplingContextKey,
    initialStateAccepted,
    migrationApplied,
    migrationId: migrationApplied ? RAVSCORE_MIGRATION_ID : null,
    initialStateSource,
    rows,
    continuationState: rows.at(-1)?.continuationState
      ?? (initialStateAccepted ? initialState : null),
  };
}

export function reconstructCandidateGRollbackState(
  integratedState,
  { candidateGStateKey } = {},
) {
  const validated = validateIntegratedState(
    integratedState,
    integratedState?.samplingContextKey,
    null,
  );
  if (!validated || typeof candidateGStateKey !== 'string' || !candidateGStateKey) {
    throw new Error('Candidate G rollback requires one valid integrated state and legacy state key');
  }
  if (integratedState.currentMemoryReady !== true
    || integratedState.waveMemoryReady !== true) {
    throw new Error('Candidate G rollback requires a READY integrated state');
  }
  const rebuilt = buildBoundedCurrentTransportMemory(integratedState.currentEvidence, {
    ...CURRENT_TRANSPORT_POTENTIAL_RECOMMENDED_RESEARCH_PROFILE,
    referenceTime: integratedState.currentReferenceAt,
    restartAfterVerifiedTimeGap: true,
  });
  if (!rebuilt.result || rebuilt.memoryReady !== true || rebuilt.status !== 'READY') {
    throw new Error('Integrated evidence cannot reconstruct a READY Candidate G state');
  }
  if (rebuilt.evidence.length > CANDIDATE_G_MAX_CONTINUATION_EVIDENCE_POINTS) {
    throw new Error('Integrated evidence exceeds the Candidate G rollback state limit');
  }
  return {
    schemaVersion: CANDIDATE_G_STATE_SCHEMA_VERSION,
    modelId: CANDIDATE_G_STATE_MODEL_ID,
    variantId: CANDIDATE_G_STATE_VARIANT_ID,
    profileId: CANDIDATE_G_STATE_PROFILE_ID,
    stateKey: candidateGStateKey,
    time: integratedState.time,
    transportReferenceAt: integratedState.currentReferenceAt,
    transportPotential: rebuilt.result.transportPotential,
    outboundEpisodeEffectiveHours: rebuilt.result.outboundEpisodeEffectiveHours,
    transportMemoryReady: rebuilt.memoryReady,
    transportMemoryStatus: rebuilt.status,
    transportMemoryWindowHours: rebuilt.windowHours,
    transportMemoryCoverageHours: rebuilt.coverageHours,
    transportEvidence: rebuilt.evidence.map(item => ({ ...item })),
    mobilisationPotential: integratedState.rollbackCandidateGMobilisationPotential,
    rollbackId: RAVSCORE_ROLLBACK_ID,
  };
}
