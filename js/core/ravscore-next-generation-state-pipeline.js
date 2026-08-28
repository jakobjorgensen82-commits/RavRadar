import {
  CANDIDATE_G_STATE_MODEL_ID,
  CANDIDATE_G_STATE_PROFILE_ID,
  CANDIDATE_G_STATE_SCHEMA_VERSION,
  CANDIDATE_G_STATE_VARIANT_ID,
  buildCandidateGDerivedStateSeries,
} from './ravscore-candidate-g-state-pipeline.js';
import {
  NEXT_RAVSCORE_MODEL_ID,
  NEXT_RAVSCORE_STATE_SCHEMA_VERSION,
  NEXT_RAVSCORE_VARIANT_ID,
} from './ravscore-next-generation.js';

export const NEXT_RAVSCORE_STATE_PROFILE_ID =
  'coastal-supply-smooth-in6.578813-out8.312951-window48-boundary0-wave-build4-decay48';
export const NEXT_RAVSCORE_STATE_MIGRATION_ID = 'candidate-g-schema2-derived-evidence-to-coastal-chain-schema3-v2';
export const NEXT_RAVSCORE_SUPPLY_MEMORY_PRIORS = Object.freeze({
  inboundBuildHalfLifeHours: 6.578813,
  outboundAttenuationHalfLifeHours: 8.312951,
  boundaryPotential: 0,
  windowHours: 48,
  categoricalExhaustionGate: false,
  beachOrSurfZoneDepletionClaimed: false,
  calibrationMeaning: 'CONTINUITY_MATCH_TO_LEGACY_FIRST_FULL_STRENGTH_HOUR_NOT_EMPIRICAL_NATURAL_LIMIT',
});

const ALLOWED_STATE_KEYS = new Set([
  'schemaVersion', 'modelId', 'variantId', 'profileId', 'stateKey', 'time',
  'transportReferenceAt', 'transportPotential', 'outboundEpisodeEffectiveHours',
  'transportMemoryReady', 'transportMemoryStatus', 'transportMemoryWindowHours',
  'transportMemoryCoverageHours', 'transportEvidence', 'mobilisationPotential',
  'migration',
]);

function object(value) {
  return value && typeof value === 'object' && !Array.isArray(value);
}

function identity(value) {
  return object(value) ? {
    schemaVersion: value.schemaVersion,
    modelId: value.modelId,
    variantId: value.variantId,
    profileId: value.profileId,
  } : null;
}

function candidateCompatible(state) {
  return state?.schemaVersion === CANDIDATE_G_STATE_SCHEMA_VERSION
    && state?.modelId === CANDIDATE_G_STATE_MODEL_ID
    && state?.variantId === CANDIDATE_G_STATE_VARIANT_ID
    && state?.profileId === CANDIDATE_G_STATE_PROFILE_ID;
}

function nextCompatible(state) {
  return state?.schemaVersion === NEXT_RAVSCORE_STATE_SCHEMA_VERSION
    && state?.modelId === NEXT_RAVSCORE_MODEL_ID
    && state?.variantId === NEXT_RAVSCORE_VARIANT_ID
    && state?.profileId === NEXT_RAVSCORE_STATE_PROFILE_ID;
}

function rejectUnexpectedFields(state) {
  if (!object(state)) return;
  const unexpected = Object.keys(state).filter(key => !ALLOWED_STATE_KEYS.has(key));
  if (unexpected.length) {
    throw new Error(`Next RavScore state contains forbidden or unknown fields: ${unexpected.join(', ')}`);
  }
}

function asCandidateState(state) {
  if (!object(state)) return null;
  rejectUnexpectedFields(state);
  if (!(candidateCompatible(state) || nextCompatible(state))) return null;
  return {
    schemaVersion: CANDIDATE_G_STATE_SCHEMA_VERSION,
    modelId: CANDIDATE_G_STATE_MODEL_ID,
    variantId: CANDIDATE_G_STATE_VARIANT_ID,
    profileId: CANDIDATE_G_STATE_PROFILE_ID,
    stateKey: state.stateKey,
    time: state.time,
    transportReferenceAt: state.transportReferenceAt,
    transportPotential: state.transportPotential,
    // Candidate G's compatibility adapter must never re-trigger its retired
    // 13-hour categorical exhaustion gate while the new state is rebuilt from
    // the compact signed evidence window.
    outboundEpisodeEffectiveHours: Math.min(
      12,
      Math.max(0, Number(state.outboundEpisodeEffectiveHours) || 0),
    ),
    transportMemoryReady: state.transportMemoryReady,
    transportMemoryStatus: state.transportMemoryStatus,
    transportMemoryWindowHours: state.transportMemoryWindowHours,
    transportMemoryCoverageHours: state.transportMemoryCoverageHours,
    transportEvidence: state.transportEvidence,
    mobilisationPotential: state.mobilisationPotential,
  };
}

function smoothCoastalSupply(row) {
  const evidence = (Array.isArray(row?.transportEvidence) ? row.transportEvidence : [])
    .filter(item => Number.isFinite(Date.parse(item?.time)) && Number.isFinite(Number(item?.strength)))
    .sort((left, right) => Date.parse(left.time) - Date.parse(right.time));
  const referenceMs = Date.parse(row?.transportReferenceAt ?? row?.time ?? '');
  const boundaryMs = row?.transportMemoryReady === true && Number.isFinite(referenceMs)
    ? referenceMs - NEXT_RAVSCORE_SUPPLY_MEMORY_PRIORS.windowHours * 3_600_000
    : Date.parse(evidence[0]?.time ?? '');
  let previousMs = Number.isFinite(boundaryMs) ? boundaryMs : null;
  let potential = NEXT_RAVSCORE_SUPPLY_MEMORY_PRIORS.boundaryPotential;
  let outboundEpisodeEffectiveHours = 0;
  let transition = row?.currentTransition ?? 'UNVERIFIED_PAUSE';
  for (const item of evidence) {
    const timeMs = Date.parse(item.time);
    if (previousMs === null || timeMs < previousMs) continue;
    const elapsedHours = Math.max(0, (timeMs - previousMs) / 3_600_000);
    const strength = Math.max(-1, Math.min(1, Number(item.strength)));
    if (strength > 0) {
      const retainedGap = 2 ** (
        -(elapsedHours * strength) / NEXT_RAVSCORE_SUPPLY_MEMORY_PRIORS.inboundBuildHalfLifeHours
      );
      potential = 100 - (100 - potential) * retainedGap;
      outboundEpisodeEffectiveHours = 0;
      transition = 'INBOUND_SUPPLY_EVIDENCE_BUILDUP';
    } else if (strength < 0) {
      const retainedSupply = 2 ** (
        -(elapsedHours * Math.abs(strength))
          / NEXT_RAVSCORE_SUPPLY_MEMORY_PRIORS.outboundAttenuationHalfLifeHours
      );
      potential *= retainedSupply;
      outboundEpisodeEffectiveHours += elapsedHours * Math.abs(strength);
      transition = 'OUTBOUND_SUPPLY_EVIDENCE_ATTENUATION';
    } else if (elapsedHours > 0) {
      transition = 'RETAINED_OR_NEUTRAL';
    }
    previousMs = timeMs;
  }
  const outboundEvidenceAttenuationPercent = 100 * (1 - 2 ** (
    -outboundEpisodeEffectiveHours
      / NEXT_RAVSCORE_SUPPLY_MEMORY_PRIORS.outboundAttenuationHalfLifeHours
  ));
  return {
    transportPotential: Math.max(0, Math.min(100, potential)),
    outboundEpisodeEffectiveHours,
    outboundEpisodeLossPoints: outboundEvidenceAttenuationPercent,
    gridOutflowEvidenceActive: transition === 'OUTBOUND_SUPPLY_EVIDENCE_ATTENUATION',
    actualOutboundTransport: false,
    currentTransition: transition,
  };
}

function asNextState(state, sourceIdentity, migrationStatus) {
  if (!object(state)) return null;
  const next = {
    ...state,
    schemaVersion: NEXT_RAVSCORE_STATE_SCHEMA_VERSION,
    modelId: NEXT_RAVSCORE_MODEL_ID,
    variantId: NEXT_RAVSCORE_VARIANT_ID,
    profileId: NEXT_RAVSCORE_STATE_PROFILE_ID,
    migration: {
      id: NEXT_RAVSCORE_STATE_MIGRATION_ID,
      status: migrationStatus,
      sourceIdentity,
      rawWeatherCopied: false,
      rawCurrentVectorsCopied: false,
      coordinatesCopied: false,
      scoreOutputCopied: false,
    },
  };
  rejectUnexpectedFields(next);
  return next;
}

/**
 * Reuses Candidate G's verified compact transport evidence and wave state, but
 * never its score, explanation, raw weather, current vectors or coordinates.
 * All new score fields are recomputed under the new model id.
 */
export function buildNextGenerationDerivedStateSeries(samples = [], options = {}) {
  const source = options.initialState ?? null;
  const sourceIdentity = identity(source);
  const candidateInitialState = asCandidateState(source);
  const migrationStatus = source === null || source === undefined
    ? 'NO_SOURCE_STATE'
    : nextCompatible(source)
      ? 'CONTINUED_SAME_MODEL'
      : candidateCompatible(source)
        ? 'MIGRATED_COMPATIBLE_DERIVED_EVIDENCE'
        : 'REJECTED_INCOMPATIBLE_SOURCE';
  const built = buildCandidateGDerivedStateSeries(samples, {
    ...options,
    initialState: candidateInitialState,
  });
  const rows = built.rows.map(row => {
    const smoothSupply = smoothCoastalSupply(row);
    return {
      ...row,
      ...smoothSupply,
      continuationState: asNextState({
        ...row.continuationState,
        transportPotential: smoothSupply.transportPotential,
        outboundEpisodeEffectiveHours: smoothSupply.outboundEpisodeEffectiveHours,
      }, sourceIdentity, migrationStatus),
    };
  });
  return {
    schemaVersion: NEXT_RAVSCORE_STATE_SCHEMA_VERSION,
    modelId: NEXT_RAVSCORE_MODEL_ID,
    variantId: NEXT_RAVSCORE_VARIANT_ID,
    profileId: NEXT_RAVSCORE_STATE_PROFILE_ID,
    migrationId: NEXT_RAVSCORE_STATE_MIGRATION_ID,
    migrationStatus,
    sourceIdentity,
    initialStateAccepted: candidateInitialState !== null && built.initialStateAccepted,
    initialStateResetReason: candidateInitialState === null && source
      ? 'INCOMPATIBLE_SOURCE_MODEL_OR_SCHEMA'
      : built.initialStateResetReason,
    rows,
    continuationState: rows.at(-1)?.continuationState
      ?? (nextCompatible(source) ? source : null),
  };
}

export function rollbackNextGenerationState(state) {
  const candidate = asCandidateState(state);
  if (!candidate) return {
    available: false,
    reason: 'INCOMPATIBLE_NEXT_GENERATION_STATE',
    state: null,
  };
  return {
    available: true,
    reason: null,
    state: candidate,
    targetIdentity: {
      schemaVersion: CANDIDATE_G_STATE_SCHEMA_VERSION,
      modelId: CANDIDATE_G_STATE_MODEL_ID,
      variantId: CANDIDATE_G_STATE_VARIANT_ID,
      profileId: CANDIDATE_G_STATE_PROFILE_ID,
    },
    rawWeatherCopied: false,
    rawCurrentVectorsCopied: false,
    coordinatesCopied: false,
    scoreOutputCopied: false,
  };
}
