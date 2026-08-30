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
  buildCurrentSupplyScoreBounds,
  deriveCurrentSupplyEvidence,
} from './ravscore-current-supply-memory.js';
import {
  RAVSCORE_WAVE_MOBILISATION_POLICY,
  RAVSCORE_WAVE_MOBILISATION_STATE_SCHEMA_VERSION,
  buildRavScoreWaveMobilisationStateSeries,
} from './ravscore-wave-mobilisation-state.js';
import {
  buildRavScoreWaveApproachStateSeries,
} from './ravscore-wave-approach-state.js';
import {
  classifyWavePhysicalTuple,
  waveMobilisationEnergy,
} from './ravscore-mobilisation-memory.js';
import { canonicalRavScoreTime } from './ravscore-time.js';
import {
  RAVSCORE_BEST_TIME_POLICY_ID,
  RAVSCORE_COLD_REPLAY_ID,
  RAVSCORE_COMPONENT_SCHEMA_ID,
  RAVSCORE_EXPLANATION_SCHEMA_ID,
  RAVSCORE_MIGRATION_ID,
  RAVSCORE_MODEL_BUNDLE_SHA256,
  RAVSCORE_MODEL_CONTRACT_SHA256,
  RAVSCORE_MODEL_ID,
  RAVSCORE_PREVIOUS_STATE_SCHEMA_VERSION,
  RAVSCORE_PROFILE_ID,
  RAVSCORE_PRESENTATION_POLICY_ID,
  RAVSCORE_RANKING_POLICY_ID,
  RAVSCORE_ROLLBACK_ID,
  RAVSCORE_RECOVERY_POLICY,
  RAVSCORE_HISTORY_UNCERTAINTY_POLICY,
  RAVSCORE_SCORE_QUALITY,
  RAVSCORE_LAST_MILE_POLICY,
  RAVSCORE_STATE_V5_MIGRATION_ID,
  RAVSCORE_STATE_V5_MODEL_BUNDLE_SHA256,
  RAVSCORE_STATE_V5_MODEL_CONTRACT_SHA256,
  RAVSCORE_STATE_SCHEMA_VERSION,
  RAVSCORE_VARIANT_ID,
} from './ravscore-model-contract.js';

const HOUR_MS = 3_600_000;
const EPSILON = 1e-9;
const CANDIDATE_G_MAX_CONTINUATION_EVIDENCE_POINTS = 49;
const CANDIDATE_G_CURRENT_BOOTSTRAP_KEYS = Object.freeze([
  'migrationId',
  'source',
  'samplingContextKey',
  'sourceStateTime',
  'currentReferenceAt',
  'currentEvidence',
  'currentNativeHoldAuthorization',
]);
const CANDIDATE_G_WAVE_APPROACH_BOOTSTRAP_KEYS = Object.freeze([
  'migrationId',
  'source',
  'samplingContextKey',
  'sourceStateTime',
  'targetReferenceAt',
  'rows',
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
  'currentNativeHoldIntervalEnds',
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
  'waveApproachState',
  'historyBounds',
  'lineage',
]);
const INTEGRATED_V5_CONTINUATION_KEYS = Object.freeze(
  INTEGRATED_CONTINUATION_KEYS.filter(key => ![
    'currentNativeHoldIntervalEnds',
    'historyBounds',
  ].includes(key)),
);
const HISTORY_BOUNDS_KEYS = Object.freeze([
  'schemaVersion',
  'current',
  'waveMobilisation',
  'lastMile',
]);
const CURRENT_HISTORY_BOUND_KEYS = Object.freeze([
  'lowerPotential',
  'upperPotential',
]);
const WAVE_HISTORY_BOUND_KEYS = Object.freeze([
  'lowerPotential',
  'upperPotential',
  'lastUnknownAt',
  'conservativeResetAt',
]);
const LAST_MILE_HISTORY_BOUND_KEYS = Object.freeze([
  'minimumFactorTrack',
  'maximumFactorTrack',
  'lastUnknownAt',
  'conservativeResetAt',
]);
const LAST_MILE_FACTOR_TRACK_KEYS = Object.freeze([
  'activityMoment',
  'normalMoment',
]);
const CURRENT_HISTORY_DEGRADABLE_STATUSES = new Set([
  'READY',
  'READY_NATIVE_HOLD',
  'WINDOW_INCOMPLETE',
  'WINDOW_HAS_MISSING_EVIDENCE',
  'WINDOW_HAS_TIME_GAP',
]);
const finite = value => typeof value === 'number' && Number.isFinite(value);
const canonicalTime = value => canonicalRavScoreTime(value);
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

const HISTORY_BOUNDS_SCHEMA_VERSION = '1.0.0';
const INTEGRATED_V5_PROFILE_ID =
  'cn-003-015-in10-out8-full24-cos48-gap3-wave4-48-coldrestart-gapcredit1-lastmileewma4-atten15-v4';
const INTEGRATED_V5_COMPONENT_SCHEMA_ID =
  'ravscore-components-huntability-delivery-mobilisation-v4';
const INTEGRATED_V5_EXPLANATION_SCHEMA_ID = 'ravscore-explanation-integrated-v4';
const INTEGRATED_V5_RANKING_POLICY_ID = 'direction-broad-19-v1';
const INTEGRATED_V5_BEST_TIME_POLICY_ID = 'score-water-tie-earliest-v2';
const INTEGRATED_V5_MIGRATION_ID =
  'candidate-g-schema2-signed-current-reweight-bounded40h-wave-approach-to-integrated-schema5-v4';

function boundedPotential(value, label, { nullable = false } = {}) {
  if (nullable && value === null) return null;
  if (!finite(value) || value < 0 || value > 100) {
    throw new Error(`${label} must be between zero and one hundred`);
  }
  return Number(value);
}

function boundedMomentTrack(value, label) {
  if (!hasExactKeys(value, LAST_MILE_FACTOR_TRACK_KEYS)
    || !finite(value.activityMoment)
    || value.activityMoment < 0 || value.activityMoment > 1
    || !finite(value.normalMoment)
    || Math.abs(value.normalMoment) > value.activityMoment + EPSILON) {
    throw new Error(`${label} is invalid`);
  }
  return {
    activityMoment: Number(value.activityMoment),
    normalMoment: Number(value.normalMoment),
  };
}

function optionalHistoricalTime(value, stateTime, label) {
  if (value === null) return null;
  const time = canonicalTime(value);
  if (!time || time !== value || Date.parse(time) > Date.parse(stateTime)) {
    throw new Error(`${label} is invalid`);
  }
  return time;
}

function historyUncertaintyOpen(lastUnknownAt, conservativeResetAt) {
  return lastUnknownAt !== null && conservativeResetAt === null;
}

function historyBoundsAreFullHistory(historyBounds) {
  const current = historyBounds?.current;
  const wave = historyBounds?.waveMobilisation;
  const lastMile = historyBounds?.lastMile;
  return current?.lowerPotential !== null
    && current?.upperPotential !== null
    && close(current?.lowerPotential, current?.upperPotential)
    && wave
    && !historyUncertaintyOpen(wave.lastUnknownAt, wave.conservativeResetAt)
    && close(wave.lowerPotential, wave.upperPotential)
    && lastMile
    && !historyUncertaintyOpen(lastMile.lastUnknownAt, lastMile.conservativeResetAt)
    && close(
      lastMile.minimumFactorTrack?.activityMoment,
      lastMile.maximumFactorTrack?.activityMoment,
    )
    && close(
      lastMile.minimumFactorTrack?.normalMoment,
      lastMile.maximumFactorTrack?.normalMoment,
    );
}

function assertCanonicalTailMarkers({
  lastUnknownAt,
  conservativeResetAt,
  stateTime,
  truncationHours,
  label,
}) {
  if (conservativeResetAt !== null) {
    if (lastUnknownAt === null
      || Date.parse(conservativeResetAt) < Date.parse(lastUnknownAt)
      || (Date.parse(conservativeResetAt) - Date.parse(lastUnknownAt)) / HOUR_MS
        + EPSILON < truncationHours) {
      throw new Error(label + ' conservativeResetAt is not bound to an expired unknown tail');
    }
    return;
  }
  if (lastUnknownAt !== null
    && (Date.parse(stateTime) - Date.parse(lastUnknownAt)) / HOUR_MS
      + EPSILON >= truncationHours) {
    throw new Error(label + ' is missing its required conservativeResetAt marker');
  }
}

function canonicalHistoryBounds(value, stateTime) {
  if (!hasExactKeys(value, HISTORY_BOUNDS_KEYS)
    || value.schemaVersion !== HISTORY_BOUNDS_SCHEMA_VERSION
    || !hasExactKeys(value.current, CURRENT_HISTORY_BOUND_KEYS)
    || !hasExactKeys(value.waveMobilisation, WAVE_HISTORY_BOUND_KEYS)
    || !hasExactKeys(value.lastMile, LAST_MILE_HISTORY_BOUND_KEYS)) {
    throw new Error('Integrated RavScore history bounds have an incompatible schema');
  }
  const currentLower = boundedPotential(
    value.current.lowerPotential,
    'Current lower history bound',
    { nullable: true },
  );
  const currentUpper = boundedPotential(
    value.current.upperPotential,
    'Current upper history bound',
    { nullable: true },
  );
  if ((currentLower === null) !== (currentUpper === null)
    || (currentLower !== null && currentLower > currentUpper + EPSILON)) {
    throw new Error('Integrated current history bounds are inconsistent');
  }
  const waveLower = boundedPotential(
    value.waveMobilisation.lowerPotential,
    'Wave mobilisation lower history bound',
  );
  const waveUpper = boundedPotential(
    value.waveMobilisation.upperPotential,
    'Wave mobilisation upper history bound',
  );
  if (waveLower > waveUpper + EPSILON) {
    throw new Error('Integrated wave mobilisation history bounds are inverted');
  }
  const canonical = {
    schemaVersion: HISTORY_BOUNDS_SCHEMA_VERSION,
    current: {
      lowerPotential: currentLower,
      upperPotential: currentUpper,
    },
    waveMobilisation: {
      lowerPotential: waveLower,
      upperPotential: waveUpper,
      lastUnknownAt: optionalHistoricalTime(
        value.waveMobilisation.lastUnknownAt,
        stateTime,
        'Wave mobilisation lastUnknownAt',
      ),
      conservativeResetAt: optionalHistoricalTime(
        value.waveMobilisation.conservativeResetAt,
        stateTime,
        'Wave mobilisation conservativeResetAt',
      ),
    },
    lastMile: {
      minimumFactorTrack: boundedMomentTrack(
        value.lastMile.minimumFactorTrack,
        'Last-mile minimum-factor track',
      ),
      maximumFactorTrack: boundedMomentTrack(
        value.lastMile.maximumFactorTrack,
        'Last-mile maximum-factor track',
      ),
      lastUnknownAt: optionalHistoricalTime(
        value.lastMile.lastUnknownAt,
        stateTime,
        'Last-mile lastUnknownAt',
      ),
      conservativeResetAt: optionalHistoricalTime(
        value.lastMile.conservativeResetAt,
        stateTime,
        'Last-mile conservativeResetAt',
      ),
    },
  };
  assertCanonicalTailMarkers({
    ...canonical.waveMobilisation,
    stateTime,
    truncationHours:
      RAVSCORE_HISTORY_UNCERTAINTY_POLICY.mobilisationUncertaintyTruncationHours,
    label: 'Wave mobilisation history',
  });
  assertCanonicalTailMarkers({
    ...canonical.lastMile,
    stateTime,
    truncationHours:
      RAVSCORE_HISTORY_UNCERTAINTY_POLICY.lastMileUncertaintyTruncationHours,
    label: 'Last-mile history',
  });
  return canonical;
}

function lastMileFactorFromTrack(track) {
  const activity = track.activityMoment;
  const penalty = Math.max(0, Math.min(
    activity,
    (activity - track.normalMoment)
      / (1 - RAVSCORE_LAST_MILE_POLICY.approachNeutralNormalAlignment),
  ));
  return Math.max(
    RAVSCORE_LAST_MILE_POLICY.minimumDeliveryFactor,
    Math.min(
      RAVSCORE_LAST_MILE_POLICY.maximumDeliveryFactor,
      1 - RAVSCORE_LAST_MILE_POLICY.maximumAttenuationShare * penalty,
    ),
  );
}

function collapsedHistoryBoundsFromPointState(state) {
  const waveApproach = state.waveApproachState;
  if (state.currentMemoryReady !== true
    || !CURRENT_SUPPLY_MEMORY_POLICY.readyStatuses.includes(state.currentMemoryStatus)
    || !finite(state.supplyPotential)
    || state.waveMemoryReady !== true
    || !RAVSCORE_WAVE_MOBILISATION_POLICY.readyStatuses.includes(state.waveMemoryStatus)
    || !finite(state.mobilisationPotential)
    || !waveApproach
    || waveApproach.readiness !== true
    || !RAVSCORE_LAST_MILE_POLICY.readyStatuses.includes(waveApproach.status)
    || !finite(waveApproach.waveActivityMoment)
    || !finite(waveApproach.waveNormalMoment)) {
    throw new Error('Schema-5 history-bound migration requires one READY point state');
  }
  return canonicalHistoryBounds({
    schemaVersion: HISTORY_BOUNDS_SCHEMA_VERSION,
    current: {
      lowerPotential: state.supplyPotential,
      upperPotential: state.supplyPotential,
    },
    waveMobilisation: {
      lowerPotential: state.mobilisationPotential,
      upperPotential: state.mobilisationPotential,
      lastUnknownAt: null,
      conservativeResetAt: null,
    },
    lastMile: {
      minimumFactorTrack: {
        activityMoment: waveApproach.waveActivityMoment,
        normalMoment: waveApproach.waveNormalMoment,
      },
      maximumFactorTrack: {
        activityMoment: waveApproach.waveActivityMoment,
        normalMoment: waveApproach.waveNormalMoment,
      },
      lastUnknownAt: null,
      conservativeResetAt: null,
    },
  }, state.time);
}

function schema5IntegratedState(value) {
  return value?.schemaVersion === RAVSCORE_PREVIOUS_STATE_SCHEMA_VERSION
    && value.modelId === RAVSCORE_MODEL_ID
    && value.variantId === RAVSCORE_VARIANT_ID
    && value.profileId === INTEGRATED_V5_PROFILE_ID
    && value.componentSchemaId === INTEGRATED_V5_COMPONENT_SCHEMA_ID
    && value.explanationSchemaId === INTEGRATED_V5_EXPLANATION_SCHEMA_ID
    && value.rankingPolicyId === INTEGRATED_V5_RANKING_POLICY_ID
    && value.bestTimePolicyId === INTEGRATED_V5_BEST_TIME_POLICY_ID
    && value.presentationPolicyId === RAVSCORE_PRESENTATION_POLICY_ID
    && value.modelContractSha256 === RAVSCORE_STATE_V5_MODEL_CONTRACT_SHA256
    && value.modelBundleSha256 === RAVSCORE_STATE_V5_MODEL_BUNDLE_SHA256
    && hasExactKeys(value, INTEGRATED_V5_CONTINUATION_KEYS);
}

function migrateIntegratedStateV5(value) {
  if (!schema5IntegratedState(value)) return null;
  const lineage = value.lineage?.migrationId === INTEGRATED_V5_MIGRATION_ID
    ? { ...value.lineage, migrationId: RAVSCORE_MIGRATION_ID }
    : value.lineage;
  return {
    ...value,
    schemaVersion: RAVSCORE_STATE_SCHEMA_VERSION,
    profileId: RAVSCORE_PROFILE_ID,
    componentSchemaId: RAVSCORE_COMPONENT_SCHEMA_ID,
    explanationSchemaId: RAVSCORE_EXPLANATION_SCHEMA_ID,
    rankingPolicyId: RAVSCORE_RANKING_POLICY_ID,
    bestTimePolicyId: RAVSCORE_BEST_TIME_POLICY_ID,
    modelContractSha256: RAVSCORE_MODEL_CONTRACT_SHA256,
    modelBundleSha256: RAVSCORE_MODEL_BUNDLE_SHA256,
    currentNativeHoldIntervalEnds: [],
    historyBounds: collapsedHistoryBoundsFromPointState(value),
    lineage,
  };
}

function waveTransitionBound(from, target, durationHours) {
  if (!(durationHours > 0) || Math.abs(from - target) <= EPSILON) return from;
  const halfLifeHours = target > from
    ? RAVSCORE_WAVE_MOBILISATION_POLICY.buildHalfLifeHours
    : RAVSCORE_WAVE_MOBILISATION_POLICY.decayHalfLifeHours;
  const fraction = 1 - 2 ** (-durationHours / halfLifeHours);
  return Math.max(0, Math.min(100, from + (target - from) * fraction));
}

function unknownWaveTransition(bounds, durationHours) {
  return {
    lowerPotential: waveTransitionBound(bounds.lowerPotential, 0, durationHours),
    upperPotential: waveTransitionBound(bounds.upperPotential, 100, durationHours),
  };
}

function knownWaveTransition(bounds, target, durationHours) {
  const lower = waveTransitionBound(bounds.lowerPotential, target, durationHours);
  const upper = waveTransitionBound(bounds.upperPotential, target, durationHours);
  return {
    lowerPotential: Math.min(lower, upper),
    upperPotential: Math.max(lower, upper),
  };
}

function advanceWaveHistoryBounds(previous, row, sample) {
  let bounds = {
    lowerPotential: previous.lowerPotential,
    upperPotential: previous.upperPotential,
  };
  let lastUnknownAt = previous.lastUnknownAt;
  let conservativeResetAt = previous.conservativeResetAt;
  const elapsedHours = Math.max(0, Number(row.elapsedHours) || 0);
  const creditedHours = Math.max(0, Number(row.creditedDurationHours) || 0);
  const energy = waveMobilisationEnergy({
    waveHeightM: sample.waveHeightM,
    wavePeriodS: sample.wavePeriodS,
  });
  if (!energy.available) {
    bounds = unknownWaveTransition(bounds, elapsedHours);
    lastUnknownAt = row.time;
    conservativeResetAt = null;
  } else {
    const migrationBinding = String(row.transition ?? '')
      .startsWith('MIGRATED_FROM_CANDIDATE_G');
    const unknownHours = migrationBinding
      ? 0
      : Math.max(0, elapsedHours - creditedHours);
    if (unknownHours > EPSILON) {
      bounds = unknownWaveTransition(bounds, unknownHours);
      lastUnknownAt = row.time;
      conservativeResetAt = null;
    }
    bounds = knownWaveTransition(bounds, energy.energyScore, creditedHours);
  }
  // Before the first declared tail reset the ordinary point track is one
  // member of the enclosing interval. After a reset, scoring intentionally
  // continues on its separate conservative lower trajectory; the diagnostic
  // point and Candidate-G rollback tracks remain untouched and must not widen
  // the reset scoring state again.
  if (conservativeResetAt === null) {
    bounds.lowerPotential = Math.min(bounds.lowerPotential, row.mobilisationPotential);
    bounds.upperPotential = Math.max(bounds.upperPotential, row.mobilisationPotential);
  }
  const unknownAgeHours = lastUnknownAt === null
    ? Number.POSITIVE_INFINITY
    : (Date.parse(row.time) - Date.parse(lastUnknownAt)) / HOUR_MS;
  if (historyUncertaintyOpen(lastUnknownAt, conservativeResetAt)
    && unknownAgeHours
      >= RAVSCORE_HISTORY_UNCERTAINTY_POLICY.mobilisationUncertaintyTruncationHours) {
    bounds = {
      lowerPotential: bounds.lowerPotential,
      upperPotential: bounds.lowerPotential,
    };
    conservativeResetAt = row.time;
  }
  return {
    ...bounds,
    lastUnknownAt,
    conservativeResetAt,
  };
}

function advanceLastMileTrack(track, weight, normalAlignment, durationHours) {
  if (!(durationHours > 0)) return { ...track };
  const retained = 2 ** (
    -durationHours / RAVSCORE_LAST_MILE_POLICY.directionalHalfLifeHours
  );
  const incoming = 1 - retained;
  return {
    activityMoment: retained * track.activityMoment + incoming * weight,
    normalMoment: retained * track.normalMoment
      + incoming * weight * normalAlignment,
  };
}

function advanceUnknownLastMile(bounds, durationHours) {
  return {
    minimumFactorTrack: advanceLastMileTrack(
      bounds.minimumFactorTrack,
      1,
      -1,
      durationHours,
    ),
    maximumFactorTrack: advanceLastMileTrack(
      bounds.maximumFactorTrack,
      0,
      0,
      durationHours,
    ),
  };
}

function lastMileEvidence(sample, onshoreDirectionDeg) {
  const energy = waveMobilisationEnergy({
    waveHeightM: sample.waveHeightM,
    wavePeriodS: sample.wavePeriodS,
  });
  if (!energy.available) return { kind: 'UNKNOWN_PHYSICS' };
  const weight = Math.max(0, Math.min(1, energy.energyScore / 100));
  if (energy.exactCalm) return { kind: 'KNOWN', weight: 0, normalAlignment: 0 };
  if (!finite(sample.waveDirectionDeg)
    || sample.waveDirectionDeg < 0 || sample.waveDirectionDeg >= 360) {
    return { kind: 'UNKNOWN_DIRECTION', weight };
  }
  const towardDirection = (Number(sample.waveDirectionDeg) + 180) % 360;
  return {
    kind: 'KNOWN',
    weight,
    normalAlignment: Math.cos(
      (towardDirection - onshoreDirectionDeg) * Math.PI / 180,
    ),
  };
}

function advanceLastMileHistoryBounds(previous, row, sample, onshoreDirectionDeg) {
  let bounds = {
    minimumFactorTrack: { ...previous.minimumFactorTrack },
    maximumFactorTrack: { ...previous.maximumFactorTrack },
  };
  let lastUnknownAt = previous.lastUnknownAt;
  let conservativeResetAt = previous.conservativeResetAt;
  const elapsedHours = Math.max(0, Number(row.elapsedHours) || 0);
  const creditedHours = Math.max(0, Number(row.creditedDurationHours) || 0);
  const evidence = lastMileEvidence(sample, onshoreDirectionDeg);
  if (evidence.kind === 'UNKNOWN_PHYSICS') {
    bounds = advanceUnknownLastMile(bounds, elapsedHours);
    lastUnknownAt = row.time;
    conservativeResetAt = null;
  } else {
    // The point-state builder cannot credit a row without direction. Bounds
    // can still use its known Hs/T energy over the same causally creditable
    // duration, with opposing -1/+1 normal tracks. A long or cold gap remains
    // wholly unknown; the first row therefore receives no invented duration.
    const directionalHours = evidence.kind === 'UNKNOWN_DIRECTION'
      ? finite(row.gapHours)
        && row.gapHours <= RAVSCORE_LAST_MILE_POLICY.maximumFreshGapHours + EPSILON
        ? elapsedHours <= RAVSCORE_LAST_MILE_POLICY.maximumContinuousIntervalHours + EPSILON
          ? elapsedHours
          : Math.min(
            RAVSCORE_LAST_MILE_POLICY.maximumRecoveryCreditHours,
            Math.max(0, row.gapHours),
          )
        : 0
      : creditedHours;
    const unknownHours = Math.max(0, elapsedHours - directionalHours);
    if (unknownHours > EPSILON) {
      bounds = advanceUnknownLastMile(bounds, unknownHours);
      lastUnknownAt = row.time;
      conservativeResetAt = null;
    }
    if (evidence.kind === 'UNKNOWN_DIRECTION') {
      bounds = {
        minimumFactorTrack: advanceLastMileTrack(
          bounds.minimumFactorTrack,
          evidence.weight,
          -1,
          directionalHours,
        ),
        maximumFactorTrack: advanceLastMileTrack(
          bounds.maximumFactorTrack,
          evidence.weight,
          1,
          directionalHours,
        ),
      };
      lastUnknownAt = row.time;
      conservativeResetAt = null;
    } else {
      bounds = {
        minimumFactorTrack: advanceLastMileTrack(
          bounds.minimumFactorTrack,
          evidence.weight,
          evidence.normalAlignment,
          creditedHours,
        ),
        maximumFactorTrack: advanceLastMileTrack(
          bounds.maximumFactorTrack,
          evidence.weight,
          evidence.normalAlignment,
          creditedHours,
        ),
      };
    }
  }
  const unknownAgeHours = lastUnknownAt === null
    ? Number.POSITIVE_INFINITY
    : (Date.parse(row.time) - Date.parse(lastUnknownAt)) / HOUR_MS;
  if (historyUncertaintyOpen(lastUnknownAt, conservativeResetAt)
    && unknownAgeHours
      >= RAVSCORE_HISTORY_UNCERTAINTY_POLICY.lastMileUncertaintyTruncationHours) {
    bounds = {
      minimumFactorTrack: { ...bounds.minimumFactorTrack },
      maximumFactorTrack: { ...bounds.minimumFactorTrack },
    };
    conservativeResetAt = row.time;
  }
  return {
    ...bounds,
    lastUnknownAt,
    conservativeResetAt,
  };
}

function buildHistoryScoreView(current, wave, lastMile) {
  const reasonCodes = new Set(current.reasonCodes ?? []);
  const factorLower = lastMileFactorFromTrack(lastMile.minimumFactorTrack);
  const factorUpper = lastMileFactorFromTrack(lastMile.maximumFactorTrack);
  if (historyUncertaintyOpen(wave.lastUnknownAt, wave.conservativeResetAt)) {
    reasonCodes.add('WAVE_MOBILISATION_HISTORY_INCOMPLETE');
  }
  if (historyUncertaintyOpen(lastMile.lastUnknownAt, lastMile.conservativeResetAt)) {
    reasonCodes.add('LAST_MILE_HISTORY_INCOMPLETE');
  }
  const available = current.available === true;
  const quality = !available
    ? RAVSCORE_SCORE_QUALITY.UNAVAILABLE
    : current.quality === RAVSCORE_SCORE_QUALITY.FULL_HISTORY
      && !historyUncertaintyOpen(wave.lastUnknownAt, wave.conservativeResetAt)
      && !historyUncertaintyOpen(lastMile.lastUnknownAt, lastMile.conservativeResetAt)
      ? RAVSCORE_SCORE_QUALITY.FULL_HISTORY
      : RAVSCORE_SCORE_QUALITY.HISTORY_INCOMPLETE;
  return {
    available,
    quality,
    calibrationEligible: quality === RAVSCORE_SCORE_QUALITY.FULL_HISTORY,
    coverageHours: current.coverageHours,
    requiredHours: current.windowHours,
    reasonCodes: [...reasonCodes],
    conservativeTailResetApplied: wave.conservativeResetAt !== null
      || lastMile.conservativeResetAt !== null,
    current: {
      lowerPotential: current.lowerPotential,
      upperPotential: current.upperPotential,
    },
    waveMobilisation: {
      lowerPotential: wave.lowerPotential,
      upperPotential: wave.upperPotential,
    },
    lastMile: {
      lowerFactor: factorLower,
      upperFactor: factorUpper,
    },
  };
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
    'currentEvidenceSource',
    'migratedAt',
    'migrationId',
    'sourceModelId',
    'sourceStateSchemaVersion',
    'waveApproachBootstrapHours',
    'waveApproachMaximumOmittedMomentShare',
    'waveApproachMaximumScoreErrorBeforeRounding',
  ];
  if (hasExactKeys(value, migrationKeys)) {
    if (value.migrationId !== RAVSCORE_MIGRATION_ID
      || value.sourceModelId !== CANDIDATE_G_STATE_MODEL_ID
      || value.sourceStateSchemaVersion !== CANDIDATE_G_STATE_SCHEMA_VERSION
      || value.currentEvidenceSource
        !== RAVSCORE_RECOVERY_POLICY.candidateMigrationCurrentEvidenceSource
      || value.waveApproachBootstrapHours
        !== RAVSCORE_RECOVERY_POLICY.candidateMigrationWaveApproachReplayHours
      || !close(
        value.waveApproachMaximumOmittedMomentShare,
        RAVSCORE_RECOVERY_POLICY
          .candidateMigrationWaveApproachMaximumOmittedMomentShare,
      )
      || !close(
        value.waveApproachMaximumScoreErrorBeforeRounding,
        RAVSCORE_RECOVERY_POLICY
          .candidateMigrationWaveApproachMaximumScoreErrorBeforeRounding,
      )) {
      throw new Error('Integrated RavScore migration lineage is incompatible');
    }
    const migratedAt = canonicalTime(value.migratedAt);
    if (!migratedAt || (stateTime && Date.parse(migratedAt) > Date.parse(stateTime))) {
      throw new Error('Integrated RavScore migration lineage has an invalid causal time');
    }
    return {
      currentEvidenceSource: value.currentEvidenceSource,
      migrationId: RAVSCORE_MIGRATION_ID,
      sourceModelId: CANDIDATE_G_STATE_MODEL_ID,
      sourceStateSchemaVersion: CANDIDATE_G_STATE_SCHEMA_VERSION,
      migratedAt,
      waveApproachBootstrapHours: value.waveApproachBootstrapHours,
      waveApproachMaximumOmittedMomentShare:
        value.waveApproachMaximumOmittedMomentShare,
      waveApproachMaximumScoreErrorBeforeRounding:
        value.waveApproachMaximumScoreErrorBeforeRounding,
    };
  }
  const coldReplayKeys = [
    'boundedUnknownPositionCount',
    'completeCausalPositionCount',
    'expectedCausalPositionCount',
    'historyTransition',
    'recoveryId',
    'source',
    'targetReferenceAt',
  ];
  const targetReferenceAt = canonicalTime(value.targetReferenceAt);
  const expected = RAVSCORE_RECOVERY_POLICY.coldReplayHours;
  const complete = Number(value.completeCausalPositionCount);
  const unknown = Number(value.boundedUnknownPositionCount);
  const expectedTransition = unknown > 0
    ? RAVSCORE_RECOVERY_POLICY.unknownHistoryTransition
    : RAVSCORE_RECOVERY_POLICY.completeHistoryTransition;
  if (!hasExactKeys(value, coldReplayKeys)
    || value.recoveryId !== RAVSCORE_COLD_REPLAY_ID
    || value.source !== RAVSCORE_RECOVERY_POLICY.source
    || value.expectedCausalPositionCount !== expected
    || !Number.isInteger(complete)
    || !Number.isInteger(unknown)
    || complete < 0
    || unknown < 0
    || complete + unknown !== expected
    || value.historyTransition !== expectedTransition
    || !targetReferenceAt
    || (stateTime && Date.parse(targetReferenceAt) > Date.parse(stateTime))) {
    throw new Error('Integrated RavScore cold-replay lineage is incompatible');
  }
  return {
    boundedUnknownPositionCount: unknown,
    completeCausalPositionCount: complete,
    expectedCausalPositionCount: expected,
    historyTransition: expectedTransition,
    recoveryId: RAVSCORE_COLD_REPLAY_ID,
    source: RAVSCORE_RECOVERY_POLICY.source,
    targetReferenceAt,
  };
}

function verifiedColdReplayBootstrap(value, ordered) {
  if (value === null || value === undefined) return null;
  const keys = [
    'boundedUnknownPositionCount',
    'completeCausalPositionCount',
    'expectedCausalPositionCount',
    'historyTransition',
    'recoveryId',
    'targetReferenceAt',
  ];
  if (!hasExactKeys(value, keys)
    || value.recoveryId !== RAVSCORE_COLD_REPLAY_ID) {
    throw new Error('Integrated RavScore cold-replay bootstrap proof is invalid');
  }
  const targetReferenceAt = canonicalTime(value.targetReferenceAt);
  if (!targetReferenceAt || value.targetReferenceAt !== targetReferenceAt) {
    throw new Error('Integrated RavScore cold-replay target is invalid');
  }
  const targetMs = Date.parse(targetReferenceAt);
  const replayHours = RAVSCORE_RECOVERY_POLICY.coldReplayHours;
  const expectedTimes = Array.from({ length: replayHours }, (_, index) =>
    new Date(targetMs - (replayHours - index) * HOUR_MS).toISOString());
  const expectedTimeSet = new Set(expectedTimes);
  const beforeTarget = ordered.filter(row => Date.parse(row.time) < targetMs);
  if (beforeTarget.some(row => !expectedTimeSet.has(row.time))
    || !ordered.some(row => row.time === targetReferenceAt)) {
    throw new Error('Integrated RavScore cold replay is outside its causal 48-hour window');
  }
  const rowsByTime = new Map(beforeTarget.map(row => [row.time, row]));
  const completeCausalPositionCount = expectedTimes.reduce((count, time) => {
    const row = rowsByTime.get(time);
    if (!row) return count;
    const currentComplete = row.currentVerified === true
      && finite(currentCoastNormalSpeed(row));
    const wave = classifyWavePhysicalTuple({
      waveHeightM: row.waveHeightM,
      wavePeriodS: row.wavePeriodS,
    });
    const waveComplete = wave.available === true
      && (wave.exactCalm === true
        || (finite(row.waveDirectionDeg)
          && row.waveDirectionDeg >= 0
          && row.waveDirectionDeg < 360));
    return count + (currentComplete && waveComplete ? 1 : 0);
  }, 0);
  const boundedUnknownPositionCount = replayHours - completeCausalPositionCount;
  const historyTransition = boundedUnknownPositionCount > 0
    ? RAVSCORE_RECOVERY_POLICY.unknownHistoryTransition
    : RAVSCORE_RECOVERY_POLICY.completeHistoryTransition;
  if (value.expectedCausalPositionCount !== replayHours
    || value.completeCausalPositionCount !== completeCausalPositionCount
    || value.boundedUnknownPositionCount !== boundedUnknownPositionCount
    || value.historyTransition !== historyTransition) {
    throw new Error('Integrated RavScore cold-replay causal-position proof is invalid');
  }
  return {
    boundedUnknownPositionCount,
    completeCausalPositionCount,
    expectedCausalPositionCount: replayHours,
    historyTransition,
    recoveryId: RAVSCORE_COLD_REPLAY_ID,
    source: RAVSCORE_RECOVERY_POLICY.source,
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
    canonicalState: initialState,
    time,
    currentReferenceAt,
    transportEvidence: evidence.map(item => ({ ...item })),
    mobilisationPotential: Number(initialState.mobilisationPotential),
  };
}

function validateCandidateGCurrentBootstrap(
  value,
  { samplingContextKey, migrated },
) {
  if (!hasExactKeys(value, CANDIDATE_G_CURRENT_BOOTSTRAP_KEYS)
    || value.migrationId !== RAVSCORE_MIGRATION_ID
    || value.source
      !== RAVSCORE_RECOVERY_POLICY.candidateMigrationCurrentEvidenceSource
    || value.samplingContextKey !== samplingContextKey
    || canonicalTime(value.sourceStateTime) !== migrated.time
    || value.sourceStateTime !== migrated.time
    || canonicalTime(value.currentReferenceAt) !== migrated.currentReferenceAt
    || value.currentReferenceAt !== migrated.currentReferenceAt) {
    throw new Error('Candidate G signed-evidence migration bootstrap is incompatible');
  }
  const evidence = canonicalEvidence(value.currentEvidence, {
    maximum: CURRENT_SUPPLY_MEMORY_POLICY.maximumRetainedEvidencePoints,
    allowMissing: false,
  });
  if (!evidence
    || JSON.stringify(value.currentEvidence) !== JSON.stringify(evidence)
    || JSON.stringify(evidence) !== JSON.stringify(migrated.transportEvidence)
    || evidence.at(-1)?.time !== migrated.currentReferenceAt) {
    throw new Error('Candidate G signed-evidence migration bootstrap is not canonical');
  }
  if (value.currentNativeHoldAuthorization !== null) {
    throw new Error('Candidate G signed evidence cannot authorize a native current hold');
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
    throw new Error('Candidate G signed-evidence reweight is incomplete');
  }
  return {
    currentEvidence: evidence,
    currentNativeHoldAuthorization: null,
  };
}

function validateCandidateGWaveApproachBootstrap(
  value,
  { samplingContextKey, migrated, targetReferenceAt, onshoreDirectionDeg },
) {
  const replayHours =
    RAVSCORE_RECOVERY_POLICY.candidateMigrationWaveApproachReplayHours;
  const omittedMomentShare = 2 ** (
    -replayHours / RAVSCORE_LAST_MILE_POLICY.directionalHalfLifeHours
  );
  if (!close(
    omittedMomentShare,
    RAVSCORE_RECOVERY_POLICY.candidateMigrationWaveApproachMaximumOmittedMomentShare,
  )) {
    throw new Error('Candidate G wave-approach tail bound contradicts the model policy');
  }
  if (!hasExactKeys(value, CANDIDATE_G_WAVE_APPROACH_BOOTSTRAP_KEYS)
    || value.migrationId !== RAVSCORE_MIGRATION_ID
    || value.source !== 'VERIFIED_PRIVATE_DMI_WAVE_DIRECTION_REPLAY'
    || value.samplingContextKey !== samplingContextKey
    || value.sourceStateTime !== migrated.time
    || canonicalTime(value.sourceStateTime) !== migrated.time
    || value.targetReferenceAt !== targetReferenceAt
    || canonicalTime(value.targetReferenceAt) !== targetReferenceAt
    || !Array.isArray(value.rows)
    || value.rows.length !== replayHours) {
    throw new Error('Candidate G bounded wave-approach migration bootstrap is incompatible');
  }
  const targetMs = Date.parse(targetReferenceAt);
  const expectedTimes = Array.from(
    { length: replayHours },
    (_, index) => new Date(
      targetMs - (replayHours - index) * HOUR_MS,
    ).toISOString(),
  );
  const rows = value.rows.map((row, index) => {
    const physicalWave = classifyWavePhysicalTuple({
      waveHeightM: row?.waveHeightM,
      wavePeriodS: row?.wavePeriodS,
    });
    if (!hasExactKeys(row, ['time', 'waveHeightM', 'wavePeriodS', 'waveDirectionDeg'])
      || canonicalTime(row.time) !== expectedTimes[index]
      || row.time !== expectedTimes[index]
      || !physicalWave.available
      || (physicalWave.active && row.waveDirectionDeg === null)
      || (row.waveDirectionDeg !== null
        && (!finite(row.waveDirectionDeg)
          || row.waveDirectionDeg < 0 || row.waveDirectionDeg >= 360))) {
      throw new Error('Candidate G wave-approach bootstrap is not a canonical bounded bridge');
    }
    return {
      time: row.time,
      waveHeightM: Number(row.waveHeightM),
      wavePeriodS: Number(row.wavePeriodS),
      waveDirectionDeg: row.waveDirectionDeg === null ? null : Number(row.waveDirectionDeg),
    };
  });
  const rebuilt = buildRavScoreWaveApproachStateSeries(rows, {
    onshoreDirectionDeg,
  });
  if (rebuilt.rows.length !== replayHours
    || rebuilt.rows.at(-1)?.readiness !== true
    || rebuilt.continuationState?.time !== expectedTimes.at(-1)) {
    throw new Error('Candidate G bounded wave-approach bootstrap did not build a READY state');
  }
  return rebuilt.continuationState;
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

function waveApproachContinuationFromIntegratedState(state) {
  return state.waveApproachState;
}

function validateIntegratedState(initialState, samplingContextKey, firstSampleTime) {
  const claimedSchema5 = initialState?.schemaVersion === RAVSCORE_PREVIOUS_STATE_SCHEMA_VERSION;
  const migratedSchema5 = migrateIntegratedStateV5(initialState);
  if (claimedSchema5 && migratedSchema5 === null) {
    throw new Error('Integrated schema-5 state is not eligible for deterministic migration');
  }
  if (migratedSchema5 !== null) initialState = migratedSchema5;
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
    nativeHoldIntervalEnds: initialState.currentNativeHoldIntervalEnds,
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
    || JSON.stringify(initialState.currentEvidence) !== JSON.stringify(evidence)
    || JSON.stringify(initialState.currentNativeHoldIntervalEnds)
      !== JSON.stringify(rebuilt.nativeHoldIntervalEnds)) {
    throw new Error('Integrated RavScore state contradicts its signed current evidence');
  }
  const historyBounds = canonicalHistoryBounds(initialState.historyBounds, time);
  const currentScoreBounds = buildCurrentSupplyScoreBounds(evidence, {
    referenceTime: time,
    nativeHold,
    nativeHoldIntervalEnds: rebuilt.nativeHoldIntervalEnds,
  });
  const expectedCurrentLower = currentScoreBounds.available
    ? currentScoreBounds.lowerPotential
    : null;
  const expectedCurrentUpper = currentScoreBounds.available
    ? currentScoreBounds.upperPotential
    : null;
  if ((expectedCurrentLower === null
      ? historyBounds.current.lowerPotential !== null
      : !close(expectedCurrentLower, historyBounds.current.lowerPotential))
    || (expectedCurrentUpper === null
      ? historyBounds.current.upperPotential !== null
      : !close(expectedCurrentUpper, historyBounds.current.upperPotential))) {
    throw new Error('Integrated RavScore current bounds contradict signed evidence');
  }
  const waveState = waveContinuationFromIntegratedState({
    ...initialState,
    time,
  });
  // The wave builder owns validation of its compact substate.
  buildRavScoreWaveMobilisationStateSeries([], { initialState: waveState });
  const waveApproachState = waveApproachContinuationFromIntegratedState(initialState);
  // The directional builder owns validation of compact W/N/T state. The
  // immutable onshore geometry is already bound by samplingContextKey.
  const waveApproachValidation = buildRavScoreWaveApproachStateSeries([], {
    initialState: waveApproachState,
  });
  if (waveApproachState === null
    || waveApproachValidation.continuationState?.time !== time) {
    throw new Error('Integrated RavScore wave-approach state is not bound to parent time');
  }
  const waveConservativeReset =
    historyBounds.waveMobilisation.conservativeResetAt !== null;
  if (!waveConservativeReset
    && (historyBounds.waveMobilisation.lowerPotential
        > initialState.mobilisationPotential + EPSILON
      || historyBounds.waveMobilisation.upperPotential
        < initialState.mobilisationPotential - EPSILON)) {
    throw new Error('Integrated RavScore wave point lies outside its history bounds');
  }
  const pointLastMileTrack = {
    activityMoment: waveApproachState.waveActivityMoment,
    normalMoment: waveApproachState.waveNormalMoment,
  };
  const pointLastMileFactor = lastMileFactorFromTrack(pointLastMileTrack);
  const lowerLastMileFactor = lastMileFactorFromTrack(
    historyBounds.lastMile.minimumFactorTrack,
  );
  const upperLastMileFactor = lastMileFactorFromTrack(
    historyBounds.lastMile.maximumFactorTrack,
  );
  const lastMileConservativeReset = historyBounds.lastMile.conservativeResetAt !== null;
  if (lowerLastMileFactor > upperLastMileFactor + EPSILON
    || (!lastMileConservativeReset
      && (pointLastMileFactor < lowerLastMileFactor - EPSILON
        || pointLastMileFactor > upperLastMileFactor + EPSILON))) {
    throw new Error('Integrated RavScore last-mile point lies outside its history bounds');
  }
  if (!historyUncertaintyOpen(
    historyBounds.waveMobilisation.lastUnknownAt,
    historyBounds.waveMobilisation.conservativeResetAt,
  )
    && (!close(
      historyBounds.waveMobilisation.lowerPotential,
      historyBounds.waveMobilisation.upperPotential,
    )
      || (!waveConservativeReset
        && !close(
          historyBounds.waveMobilisation.lowerPotential,
          initialState.mobilisationPotential,
        )))) {
    throw new Error('Integrated RavScore exact wave history must have collapsed bounds');
  }
  if (!historyUncertaintyOpen(
    historyBounds.lastMile.lastUnknownAt,
    historyBounds.lastMile.conservativeResetAt,
  )
    && (!close(
      historyBounds.lastMile.minimumFactorTrack.activityMoment,
      historyBounds.lastMile.maximumFactorTrack.activityMoment,
    )
      || !close(
        historyBounds.lastMile.minimumFactorTrack.normalMoment,
        historyBounds.lastMile.maximumFactorTrack.normalMoment,
      )
      || (!lastMileConservativeReset
        && (!close(
          historyBounds.lastMile.minimumFactorTrack.activityMoment,
          pointLastMileTrack.activityMoment,
        )
          || !close(
            historyBounds.lastMile.minimumFactorTrack.normalMoment,
            pointLastMileTrack.normalMoment,
          ))))) {
    throw new Error('Integrated RavScore exact last-mile history must have collapsed tracks');
  }
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
    currentNativeHoldIntervalEnds: rebuilt.nativeHoldIntervalEnds,
    waveState,
    waveApproachState,
    historyBounds,
    stateV5MigrationApplied: migratedSchema5 !== null,
    lineage,
    canonicalState: initialState,
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

function compactIntegratedState({
  samplingContextKey,
  current,
  wave,
  waveApproach,
  historyBounds,
  lineage,
}) {
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
    currentNativeHoldIntervalEnds: [...current.nativeHoldIntervalEnds],
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
    waveApproachState: { ...waveApproach.continuationState },
    historyBounds: canonicalHistoryBounds(
      historyBounds,
      current.requestedReferenceTime,
    ),
    lineage,
  };
}

/**
 * Builds the integrated schema-6 state from existing hourly rows. It accepts
 * the same model's compact continuation, one exact READY schema-5 point state
 * for deterministic bounds migration, or one exact Candidate G schema-2
 * state. All raw weather remains in the caller and never enters the compact
 * continuation.
 */
export function buildIntegratedRavScoreStateSeries(
  samples = [],
  {
    samplingContextKey,
    onshoreDirectionDeg,
    initialState = null,
    expectedCandidateGStateKey = null,
    candidateGCurrentBootstrap = null,
    candidateGWaveApproachBootstrap = null,
    nativeCadenceHoldHours = 0,
    nativeCadenceReferenceSample = null,
    coldReplayBootstrap = null,
  } = {},
) {
  if (typeof samplingContextKey !== 'string' || !samplingContextKey) {
    throw new Error('Integrated RavScore state requires a samplingContextKey');
  }
  if ((!finite(onshoreDirectionDeg)
    || onshoreDirectionDeg < 0 || onshoreDirectionDeg >= 360)
    && ((Array.isArray(samples) && samples.length > 0)
      || candidateGWaveApproachBootstrap !== null)) {
    throw new Error('Integrated RavScore state requires the immutable onshore direction');
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
  let currentNativeHoldIntervalEnds = [];
  let currentNativeHoldCoveredThroughAt = null;
  let initialWaveState = null;
  let initialWaveApproachState = null;
  let initialHistoryBounds = null;
  let waveMigrationSeed = null;
  let lineage = null;
  let initialCausalTime = null;
  let initialCurrentReferenceAt = null;
  let coldReplayTargetAt = null;
  let stateV5MigrationApplied = false;

  if (initialState !== null && initialState !== undefined && coldReplayBootstrap !== null) {
    throw new Error('Integrated RavScore cannot combine continuation and cold replay');
  }
  if ((initialState === null || initialState === undefined)
    && (candidateGCurrentBootstrap !== null
      || candidateGWaveApproachBootstrap !== null)) {
    throw new Error('Integrated RavScore cannot use a migration bootstrap without Candidate G state');
  }
  if (initialState === null || initialState === undefined) {
    const coldReplay = verifiedColdReplayBootstrap(coldReplayBootstrap, ordered);
    if (coldReplay) {
      initialStateSource = coldReplay.boundedUnknownPositionCount === 0
        ? 'VERIFIED_PRIVATE_48H_COLD_REPLAY'
        : 'BOUNDED_PRIVATE_PARTIAL_HISTORY_COLD_REPLAY';
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
      initialCurrentReferenceAt = continued.currentReferenceAt;
      initialStateAccepted = true;
      initialStateSource = 'INTEGRATED_CONTINUATION';
      currentEvidence = continued.currentEvidence.map(item => ({ ...item }));
      currentNativeHoldAuthorization = continued.currentNativeHoldAuthorization;
      currentNativeHoldIntervalEnds = [...continued.currentNativeHoldIntervalEnds];
      currentNativeHoldCoveredThroughAt = currentNativeHoldAuthorization === null
        ? null
        : continued.time;
      initialWaveState = continued.waveState;
      initialWaveApproachState = continued.waveApproachState;
      initialHistoryBounds = continued.historyBounds;
      stateV5MigrationApplied = continued.stateV5MigrationApplied;
      if (stateV5MigrationApplied) {
        initialStateSource = 'INTEGRATED_SCHEMA5_READY_POINT_MIGRATION';
        initialState = continued.canonicalState;
      }
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
      initialCurrentReferenceAt = migrated.currentReferenceAt;
      initialStateSource = 'CANDIDATE_G_SCHEMA2_MIGRATION';
      const currentBootstrap = validateCandidateGCurrentBootstrap(
        candidateGCurrentBootstrap,
        { samplingContextKey, migrated },
      );
      currentEvidence = currentBootstrap.currentEvidence.map(item => ({ ...item }));
      currentNativeHoldAuthorization =
        currentBootstrap.currentNativeHoldAuthorization;
      currentNativeHoldIntervalEnds = [];
      if (!firstSampleTime) {
        throw new Error('Candidate G migration requires an exact target sample');
      }
      initialWaveApproachState = validateCandidateGWaveApproachBootstrap(
        candidateGWaveApproachBootstrap,
        {
          samplingContextKey,
          migrated,
          targetReferenceAt: firstSampleTime,
          onshoreDirectionDeg,
        },
      );
      waveMigrationSeed = {
        time: migrated.time,
        mobilisationPotential: migrated.mobilisationPotential,
        rollbackCandidateGMobilisationPotential: migrated.mobilisationPotential,
      };
      lineage = {
        currentEvidenceSource:
          RAVSCORE_RECOVERY_POLICY.candidateMigrationCurrentEvidenceSource,
        migrationId: RAVSCORE_MIGRATION_ID,
        sourceModelId: CANDIDATE_G_STATE_MODEL_ID,
        sourceStateSchemaVersion: CANDIDATE_G_STATE_SCHEMA_VERSION,
        migratedAt: migrated.time,
        waveApproachBootstrapHours:
          RAVSCORE_RECOVERY_POLICY.candidateMigrationWaveApproachReplayHours,
        waveApproachMaximumOmittedMomentShare:
          RAVSCORE_RECOVERY_POLICY
            .candidateMigrationWaveApproachMaximumOmittedMomentShare,
        waveApproachMaximumScoreErrorBeforeRounding:
          RAVSCORE_RECOVERY_POLICY
            .candidateMigrationWaveApproachMaximumScoreErrorBeforeRounding,
      };
      initialHistoryBounds = {
        schemaVersion: HISTORY_BOUNDS_SCHEMA_VERSION,
        current: {
          lowerPotential: null,
          upperPotential: null,
        },
        waveMobilisation: {
          lowerPotential: migrated.mobilisationPotential,
          upperPotential: migrated.mobilisationPotential,
          lastUnknownAt: null,
          conservativeResetAt: null,
        },
        lastMile: {
          minimumFactorTrack: {
            activityMoment: initialWaveApproachState.waveActivityMoment,
            normalMoment: initialWaveApproachState.waveNormalMoment,
          },
          maximumFactorTrack: {
            activityMoment: initialWaveApproachState.waveActivityMoment,
            normalMoment: initialWaveApproachState.waveNormalMoment,
          },
          lastUnknownAt: null,
          conservativeResetAt: null,
        },
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
    const lastEvidence = currentEvidence.at(-1) ?? null;
    const lastEvidenceMs = Date.parse(lastEvidence?.time ?? '');
    const referenceEvidenceMs = Date.parse(referenceEvidence.time);
    if (!Number.isFinite(lastEvidenceMs) || referenceEvidenceMs > lastEvidenceMs) {
      currentEvidence.push(referenceEvidence);
      currentNativeHoldAuthorization = boundaryAuthorization;
    } else if (referenceEvidenceMs === lastEvidenceMs) {
      if (!finite(lastEvidence?.strength)
        || !close(lastEvidence.strength, referenceEvidence.strength)) {
        throw new Error('Integrated RavScore native cadence reference conflicts with persisted evidence');
      }
      if (currentNativeHoldAuthorization === null) {
        // Candidate G stores the exact signed evidence but not the independent
        // regional cadence authorization.  Bind a real same-time boundary
        // proof without appending or re-crediting that evidence.
        currentNativeHoldAuthorization = boundaryAuthorization;
      } else if (!sameNativeHoldAuthorization(
        currentNativeHoldAuthorization,
        boundaryAuthorization,
      )) {
        throw new Error('Integrated RavScore native cadence reference conflicts with persisted proof');
      }
    } else {
      throw new Error('Integrated RavScore native cadence reference predates persisted evidence');
    }
    currentNativeHoldCoveredThroughAt = referenceEvidence.time;
  }
  if (migrationApplied
    && initialCurrentReferenceAt !== initialCausalTime
    && currentNativeHoldAuthorization === null) {
    throw new Error('Lagged Candidate G current migration requires exact regional boundary proof');
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
    const priorNativeHoldAuthorization = currentNativeHoldAuthorization;
    const priorNativeHoldCoveredThroughAt = currentNativeHoldCoveredThroughAt;
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
        && currentNativeHoldAuthorization === null
        && sampleNativeHoldAuthorization !== null) {
        // Candidate G stores the signed strength but no regional hold proof.
        // A real, verified same-time target may add that bounded authorization
        // without changing or re-crediting the persisted current evidence.
        currentNativeHoldAuthorization = sampleNativeHoldAuthorization;
      } else if (verifiedEvidence
        && !sameNativeHoldAuthorization(
          sampleNativeHoldAuthorization,
          currentNativeHoldAuthorization,
        )) {
        throw new Error('Same-time current provenance conflicts with persisted hold proof');
      }
    }
    const sameTimeHold = evidenceAlreadyAtTime;
    const nativeHold = !verifiedEvidence
      && Number(nativeCadenceHoldHours) > 0
      && currentNativeHoldAuthorization !== null
      && ageHours > 0
      && ageHours <= Number(nativeCadenceHoldHours) + EPSILON;
    const nativeCadenceIntervalAttested = !sameTimeHold
      && verifiedEvidence
      && lastVerified !== null
      && ageHours > CURRENT_SUPPLY_MEMORY_POLICY.expectedEvidenceIntervalHours + EPSILON
      && ageHours <= CURRENT_SUPPLY_MEMORY_POLICY.maximumGapHours + EPSILON
      && sameNativeHoldAuthorization(
        priorNativeHoldAuthorization,
        sampleNativeHoldAuthorization,
      )
      && priorNativeHoldAuthorization !== null
      && priorNativeHoldCoveredThroughAt !== null
      && Date.parse(priorNativeHoldCoveredThroughAt)
        >= Date.parse(sample.time)
          - CURRENT_SUPPLY_MEMORY_POLICY.expectedEvidenceIntervalHours * HOUR_MS
          - EPSILON;
    if (!sameTimeHold && !nativeHold && evidence) {
      if (nativeCadenceIntervalAttested) {
        currentNativeHoldIntervalEnds.push(sample.time);
      }
      currentEvidence.push(evidence);
      currentNativeHoldAuthorization = verifiedEvidence
        ? sampleNativeHoldAuthorization
        : null;
      currentNativeHoldCoveredThroughAt = verifiedEvidence
        && sampleNativeHoldAuthorization !== null
        ? sample.time
        : null;
    } else if (nativeHold) {
      currentNativeHoldCoveredThroughAt = sample.time;
    } else if (sameTimeHold
      && verifiedEvidence
      && currentNativeHoldAuthorization !== null) {
      currentNativeHoldCoveredThroughAt = sample.time;
    }
    const memory = buildCurrentSupplyMemory(currentEvidence, {
      referenceTime: sample.time,
      nativeHold,
      nativeHoldIntervalEnds: currentNativeHoldIntervalEnds,
    });
    if (memory.evidence.length) currentEvidence = memory.evidence.map(item => ({ ...item }));
    currentNativeHoldIntervalEnds = [...memory.nativeHoldIntervalEnds];
    const directInputAvailable = verifiedEvidence || nativeHold;
    const scoreBounds = directInputAvailable
      && CURRENT_HISTORY_DEGRADABLE_STATUSES.has(memory.status)
      ? buildCurrentSupplyScoreBounds(currentEvidence, {
        referenceTime: sample.time,
        nativeHold,
        nativeHoldIntervalEnds: currentNativeHoldIntervalEnds,
      })
      : {
        available: false,
        quality: RAVSCORE_SCORE_QUALITY.UNAVAILABLE,
        reason: directInputAvailable
          ? 'CURRENT_HISTORY_STATE_INVALID'
          : 'CURRENT_DIRECT_INPUT_MISSING',
        windowHours: CURRENT_SUPPLY_MEMORY_POLICY.windowHours,
        coverageHours: 0,
        lowerPotential: null,
        upperPotential: null,
        reasonCodes: [directInputAvailable
          ? 'CURRENT_HISTORY_STATE_INVALID'
          : 'CURRENT_DIRECT_INPUT_MISSING'],
      };
    return {
      ...memory,
      scoreBounds,
      currentNativeHoldAuthorization,
      nativeHoldIntervalEnds: currentNativeHoldIntervalEnds,
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
  const waveApproachSeries = buildRavScoreWaveApproachStateSeries(ordered, {
    initialState: initialWaveApproachState,
    onshoreDirectionDeg,
    getTime: sample => sample.time,
    getWaveHeight: sample => sample.waveHeightM,
    getWavePeriod: sample => sample.wavePeriodS,
    getWaveDirection: sample => sample.waveDirectionDeg,
  });
  if (waveSeries.rows.length !== currentRows.length
    || waveApproachSeries.rows.length !== currentRows.length) {
    throw new Error('Integrated RavScore current, wave and last-mile state rows diverged');
  }

  let carriedHistoryBounds = initialHistoryBounds;
  if (carriedHistoryBounds === null && ordered.length) {
    carriedHistoryBounds = {
      schemaVersion: HISTORY_BOUNDS_SCHEMA_VERSION,
      current: {
        lowerPotential: null,
        upperPotential: null,
      },
      // Without a valid prior derived state, the historical mobilisation can
      // be anywhere in its physical 0..100 index range. The first verified
      // row anchors time but receives no invented duration.
      waveMobilisation: {
        lowerPotential: 0,
        upperPotential: 100,
        lastUnknownAt: ordered[0].time,
        conservativeResetAt: null,
      },
      // The extreme last-mile tracks encode the strongest possible retained
      // offshore activity versus no retained activity. They contain no raw
      // height, period or direction.
      lastMile: {
        minimumFactorTrack: {
          activityMoment: 1,
          normalMoment: -1,
        },
        maximumFactorTrack: {
          activityMoment: 0,
          normalMoment: 0,
        },
        lastUnknownAt: ordered[0].time,
        conservativeResetAt: null,
      },
    };
  }

  const rows = currentRows.map((current, index) => {
    const wave = waveSeries.rows[index];
    const waveApproach = waveApproachSeries.rows[index];
    if (wave.time !== current.requestedReferenceTime
      || waveApproach.time !== current.requestedReferenceTime) {
      throw new Error('Integrated RavScore current, wave and last-mile times diverged');
    }
    const waveHistoryBounds = advanceWaveHistoryBounds(
      carriedHistoryBounds.waveMobilisation,
      wave,
      ordered[index],
    );
    const lastMileHistoryBounds = advanceLastMileHistoryBounds(
      carriedHistoryBounds.lastMile,
      waveApproach,
      ordered[index],
      onshoreDirectionDeg,
    );
    const historyBounds = {
      schemaVersion: HISTORY_BOUNDS_SCHEMA_VERSION,
      current: {
        lowerPotential: current.scoreBounds.available
          ? current.scoreBounds.lowerPotential
          : null,
        upperPotential: current.scoreBounds.available
          ? current.scoreBounds.upperPotential
          : null,
      },
      waveMobilisation: waveHistoryBounds,
      lastMile: lastMileHistoryBounds,
    };
    const historyScoreView = buildHistoryScoreView(
      current.scoreBounds,
      waveHistoryBounds,
      lastMileHistoryBounds,
    );
    const continuationState = compactIntegratedState({
      samplingContextKey,
      current,
      wave,
      waveApproach,
      historyBounds,
      lineage: coldReplayTargetAt !== null
        && Date.parse(current.requestedReferenceTime) < Date.parse(coldReplayTargetAt)
        ? null
        : lineage,
    });
    carriedHistoryBounds = historyBounds;
    return {
      time: current.requestedReferenceTime,
      currentReferenceAt: current.referenceTime,
      currentMemoryReady: current.memoryReady,
      currentMemoryStatus: current.status,
      currentMemoryWindowHours: current.windowHours,
      currentMemoryCoverageHours: current.coverageHours,
      currentTransition: current.transition,
      currentVerified: current.currentVerified,
      currentDirectInputAvailable: current.scoreBounds.available === true,
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
      supplyPotential: current.scoreBounds.available
        ? current.scoreBounds.lowerPotential
        : null,
      supplyPotentialUpper: current.scoreBounds.available
        ? current.scoreBounds.upperPotential
        : null,
      mobilisationPotential: wave.mobilisationPotential,
      mobilisationPotentialLower: waveHistoryBounds.lowerPotential,
      mobilisationPotentialUpper: waveHistoryBounds.upperPotential,
      waveLastVerifiedAt: wave.waveReferenceAt,
      waveMemoryReady: wave.readiness,
      waveMemoryStatus: wave.status,
      waveTransition: wave.transition,
      waveEnergyProxy: wave.waveEnergyProxy,
      waveEnergyScore: wave.waveEnergyScore,
      waveCreditedDurationHours: wave.creditedDurationHours,
      lastMileWaveReferenceAt: waveApproach.waveReferenceAt,
      lastMileMemoryReady: waveApproach.readiness,
      lastMileMemoryStatus: waveApproach.status,
      lastMileTransition: waveApproach.transition,
      lastMileEvidenceStatus: waveApproach.evidenceStatus,
      lastMileWaveActivity: waveApproach.activity,
      lastMileNormalAlignment: waveApproach.normalAlignment,
      lastMileTangentAlignment: waveApproach.tangentAlignment,
      lastMileCoherence: waveApproach.coherence,
      lastMileApproach: waveApproach.approach,
      lastMileFactor: waveApproach.factor,
      lastMileFactorLower: historyScoreView.lastMile.lowerFactor,
      lastMileFactorUpper: historyScoreView.lastMile.upperFactor,
      historyScoreView,
      migrationApplied,
      stateV5MigrationApplied,
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
    stateV5MigrationApplied,
    stateV5MigrationId: stateV5MigrationApplied ? RAVSCORE_STATE_V5_MIGRATION_ID : null,
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
  if (!historyBoundsAreFullHistory(validated.historyBounds)) {
    throw new Error('Candidate G rollback reconstruction requires FULL_HISTORY integrated state');
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
