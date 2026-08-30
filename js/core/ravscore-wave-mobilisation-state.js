import {
  WAVE_MOBILISATION_ENERGY_POINTS,
  WAVE_MOBILISATION_RECOMMENDED_RESEARCH_PROFILE,
  waveMobilisationEnergy,
} from './ravscore-mobilisation-memory.js';
import {
  RAVSCORE_WAVE_MOBILISATION_POLICY as MODEL_WAVE_MOBILISATION_POLICY,
} from './ravscore-model-contract.js';

const HOUR_MS = 3_600_000;
const EXPLICIT_TIME_ZONE = /(?:Z|[+-]\d{2}:\d{2})$/i;
const finite = value => typeof value === 'number' && Number.isFinite(value);
const physicalWaveValue = value => finite(value) && value >= 0;
const clamp = (value, minimum = 0, maximum = 100) =>
  Math.max(minimum, Math.min(maximum, Number(value)));

export const RAVSCORE_WAVE_MOBILISATION_STATE_SCHEMA_VERSION = '1.0.0';

export const RAVSCORE_WAVE_MOBILISATION_STATUS = Object.freeze({
  READY: 'READY',
  MIGRATED_READY: 'MIGRATED_READY',
  RECOVERED_SHORT_GAP: 'RECOVERED_SHORT_GAP',
  MISSING_INPUT: 'MISSING_INPUT',
  COLD_START: 'COLD_START',
  RESTARTED_AFTER_GAP: 'RESTARTED_AFTER_GAP',
});

export const RAVSCORE_WAVE_MOBILISATION_POLICY = MODEL_WAVE_MOBILISATION_POLICY;

if (RAVSCORE_WAVE_MOBILISATION_POLICY.energyProfileId
    !== WAVE_MOBILISATION_RECOMMENDED_RESEARCH_PROFILE.id
  || RAVSCORE_WAVE_MOBILISATION_POLICY.buildHalfLifeHours
    !== WAVE_MOBILISATION_RECOMMENDED_RESEARCH_PROFILE.buildHalfLifeHours
  || RAVSCORE_WAVE_MOBILISATION_POLICY.decayHalfLifeHours
    !== WAVE_MOBILISATION_RECOMMENDED_RESEARCH_PROFILE.decayHalfLifeHours
  || JSON.stringify(RAVSCORE_WAVE_MOBILISATION_POLICY.energyPoints)
    !== JSON.stringify(WAVE_MOBILISATION_ENERGY_POINTS)) {
  throw new Error('The integrated model contract diverges from the retained wave-energy prior');
}

const VALID_STATUSES = new Set(Object.values(RAVSCORE_WAVE_MOBILISATION_STATUS));

function isoTime(value, label) {
  if (typeof value !== 'string' || !EXPLICIT_TIME_ZONE.test(value)) {
    throw new Error(`${label} must contain a valid time with an explicit timezone`);
  }
  const milliseconds = Date.parse(value);
  if (!Number.isFinite(milliseconds)) throw new Error(`${label} must contain a valid time`);
  return new Date(milliseconds).toISOString();
}

function potential(value, label) {
  if (!finite(value) || Number(value) < 0 || Number(value) > 100) {
    throw new Error(`${label} must be between zero and one hundred`);
  }
  return Number(value);
}

function approachTarget(from, target, durationHours, halfLifeHours) {
  if (!(durationHours > 0) || from === target) return clamp(from);
  const fraction = 1 - 2 ** (-durationHours / halfLifeHours);
  return clamp(from + (target - from) * fraction);
}

function transitionPotential(from, target, durationHours) {
  const transition = !(durationHours > 0) || target === from
    ? 'HOLD'
    : target > from
      ? 'BUILD'
      : 'DECAY';
  const halfLifeHours = transition === 'BUILD'
    ? RAVSCORE_WAVE_MOBILISATION_POLICY.buildHalfLifeHours
    : RAVSCORE_WAVE_MOBILISATION_POLICY.decayHalfLifeHours;
  return {
    value: approachTarget(from, target, durationHours, halfLifeHours),
    transition,
  };
}

function compactState({
  time,
  waveReferenceAt,
  migrationSeedAt = null,
  mobilisationPotential,
  rollbackCandidateGMobilisationPotential,
  waveEnergyScore,
  readiness,
  status,
  migrationSeedAwaitingReference = false,
}) {
  return {
    schemaVersion: RAVSCORE_WAVE_MOBILISATION_STATE_SCHEMA_VERSION,
    policyId: RAVSCORE_WAVE_MOBILISATION_POLICY.id,
    time,
    waveReferenceAt,
    migrationSeedAt,
    mobilisationPotential,
    rollbackCandidateGMobilisationPotential,
    waveEnergyScore,
    readiness,
    status,
    migrationSeedAwaitingReference,
  };
}

function continuationState(initialState) {
  if (initialState === null || initialState === undefined) return null;
  if (typeof initialState !== 'object' || Array.isArray(initialState)) {
    throw new Error('initialState must be a compact wave mobilisation state');
  }
  if (initialState.schemaVersion !== RAVSCORE_WAVE_MOBILISATION_STATE_SCHEMA_VERSION) {
    throw new Error('initialState wave mobilisation schema version is incompatible');
  }
  if (initialState.policyId !== RAVSCORE_WAVE_MOBILISATION_POLICY.id) {
    throw new Error('initialState wave mobilisation policy is incompatible');
  }
  const time = isoTime(initialState.time, 'initialState.time');
  const waveReferenceAt = initialState.waveReferenceAt === null
    ? null
    : isoTime(initialState.waveReferenceAt, 'initialState.waveReferenceAt');
  const migrationSeedAt = initialState.migrationSeedAt === null
    || initialState.migrationSeedAt === undefined
    ? null
    : isoTime(initialState.migrationSeedAt, 'initialState.migrationSeedAt');
  if (waveReferenceAt !== null && Date.parse(waveReferenceAt) > Date.parse(time)) {
    throw new Error('initialState.waveReferenceAt must not be after initialState.time');
  }
  if (migrationSeedAt !== null && Date.parse(migrationSeedAt) > Date.parse(time)) {
    throw new Error('initialState.migrationSeedAt must not be after initialState.time');
  }
  if (typeof initialState.readiness !== 'boolean'
    || !VALID_STATUSES.has(initialState.status)
    || typeof initialState.migrationSeedAwaitingReference !== 'boolean') {
    throw new Error('initialState wave readiness metadata is invalid');
  }
  const readyStatus = RAVSCORE_WAVE_MOBILISATION_POLICY.readyStatuses
    .includes(initialState.status);
  if (initialState.readiness !== readyStatus
    || (initialState.readiness && waveReferenceAt === null)
    || (initialState.readiness && waveReferenceAt !== time)
    || (initialState.readiness && initialState.waveEnergyScore === null)
    || (initialState.migrationSeedAwaitingReference
      && (initialState.readiness
        || initialState.status !== RAVSCORE_WAVE_MOBILISATION_STATUS.MISSING_INPUT))
    || (!initialState.migrationSeedAwaitingReference && migrationSeedAt !== null)) {
    throw new Error('initialState wave readiness and status are inconsistent');
  }
  if (initialState.waveEnergyScore !== null
    && (!finite(initialState.waveEnergyScore)
      || Number(initialState.waveEnergyScore) < 0
      || Number(initialState.waveEnergyScore) > 100)) {
    throw new Error('initialState.waveEnergyScore must be null or between zero and one hundred');
  }
  if (initialState.waveEnergyScore !== null && waveReferenceAt === null) {
    throw new Error('initialState.waveEnergyScore requires a verified wave reference');
  }
  return compactState({
    time,
    waveReferenceAt,
    migrationSeedAt,
    mobilisationPotential: potential(
      initialState.mobilisationPotential,
      'initialState.mobilisationPotential',
    ),
    rollbackCandidateGMobilisationPotential: potential(
      initialState.rollbackCandidateGMobilisationPotential,
      'initialState.rollbackCandidateGMobilisationPotential',
    ),
    waveEnergyScore: initialState.waveEnergyScore === null
      ? null
      : Number(initialState.waveEnergyScore),
    readiness: initialState.readiness,
    status: initialState.status,
    migrationSeedAwaitingReference: initialState.migrationSeedAwaitingReference,
  });
}

function migrationState(candidateGMigrationSeed) {
  if (candidateGMigrationSeed === null || candidateGMigrationSeed === undefined) return null;
  if (typeof candidateGMigrationSeed !== 'object' || Array.isArray(candidateGMigrationSeed)) {
    throw new Error('candidateGMigrationSeed must be a validated derived Candidate G seed');
  }
  const migratedPotential = potential(
    candidateGMigrationSeed.mobilisationPotential,
    'candidateGMigrationSeed.mobilisationPotential',
  );
  const rollbackPotential = candidateGMigrationSeed.rollbackCandidateGMobilisationPotential === null
    || candidateGMigrationSeed.rollbackCandidateGMobilisationPotential === undefined
    ? migratedPotential
    : potential(
      candidateGMigrationSeed.rollbackCandidateGMobilisationPotential,
      'candidateGMigrationSeed.rollbackCandidateGMobilisationPotential',
    );
  const time = candidateGMigrationSeed.time === null
    || candidateGMigrationSeed.time === undefined
    ? null
    : isoTime(candidateGMigrationSeed.time, 'candidateGMigrationSeed.time');
  return {
    time,
    waveReferenceAt: null,
    migrationSeedAt: time,
    mobilisationPotential: migratedPotential,
    rollbackCandidateGMobilisationPotential: rollbackPotential,
    waveEnergyScore: null,
    readiness: false,
    status: RAVSCORE_WAVE_MOBILISATION_STATUS.MISSING_INPUT,
    migrationSeedAwaitingReference: true,
  };
}

function rollbackTransition(previous, energy, timeMs, migrationUnbound = false) {
  const before = previous?.rollbackCandidateGMobilisationPotential
    ?? RAVSCORE_WAVE_MOBILISATION_POLICY.coldInitialPotential;
  if (!energy.available) {
    return { value: before, durationHours: 0, transition: 'ROLLBACK_MISSING_HOLD' };
  }
  const durationHours = previous === null
    ? 1
    : migrationUnbound
      ? 0
      : Math.max(0, (timeMs - Date.parse(previous.time)) / HOUR_MS);
  if (!(durationHours > 0)) {
    return { value: before, durationHours: 0, transition: 'ROLLBACK_SAME_TIME_HOLD' };
  }
  const result = transitionPotential(before, clamp(energy.energyScore), durationHours);
  return {
    value: result.value,
    durationHours,
    transition: `ROLLBACK_${result.transition}`,
  };
}

function outputRow({
  state,
  energy,
  transition,
  elapsedHours,
  gapHours,
  creditedDurationHours,
  rollback,
  migrationApplied,
}) {
  return {
    time: state.time,
    waveReferenceAt: state.waveReferenceAt,
    mobilisationPotential: state.mobilisationPotential,
    rollbackCandidateGMobilisationPotential:
      state.rollbackCandidateGMobilisationPotential,
    readiness: state.readiness,
    status: state.status,
    transition,
    elapsedHours,
    gapHours,
    creditedDurationHours,
    waveEnergyAvailable: energy.available,
    waveEnergyProxy: energy.energyProxy,
    waveEnergyScore: energy.energyScore,
    buildHalfLifeHours: RAVSCORE_WAVE_MOBILISATION_POLICY.buildHalfLifeHours,
    decayHalfLifeHours: RAVSCORE_WAVE_MOBILISATION_POLICY.decayHalfLifeHours,
    rollbackTransition: rollback.transition,
    rollbackCreditedDurationHours: rollback.durationHours,
    migrationApplied,
    continuationState: state,
  };
}

/**
 * Builds the causal wave-mobilisation substate for the integrated RavScore.
 *
 * `candidateGMigrationSeed` is deliberately only a numeric, already-validated
 * migration input. Model/schema/state-key compatibility belongs to the parent
 * model-state migration. Raw waves never cross the continuation boundary.
 */
export function buildRavScoreWaveMobilisationStateSeries(
  samples = [],
  {
    initialState = null,
    candidateGMigrationSeed = null,
    getTime = sample => sample?.time,
    getWaveHeight = sample => sample?.waveHeightM,
    getWavePeriod = sample => sample?.wavePeriodS,
  } = {},
) {
  if (!Array.isArray(samples)) throw new Error('samples must be an array');
  if (initialState !== null && initialState !== undefined
    && candidateGMigrationSeed !== null && candidateGMigrationSeed !== undefined) {
    throw new Error('Use either initialState or candidateGMigrationSeed, not both');
  }

  let previous = continuationState(initialState);
  const migrated = previous === null ? migrationState(candidateGMigrationSeed) : null;
  if (migrated !== null) previous = migrated;
  const initialStateSource = initialState !== null && initialState !== undefined
    ? 'CONTINUATION'
    : migrated !== null
      ? 'CANDIDATE_G_MIGRATION'
      : 'COLD_START';
  let migrationPending = migrated !== null;

  const rows = samples.map((sample, index) => {
    const time = isoTime(getTime(sample), `sample ${index}.time`);
    const timeMs = Date.parse(time);
    const waveHeightM = getWaveHeight(sample);
    const wavePeriodS = getWavePeriod(sample);
    const energy = physicalWaveValue(waveHeightM) && physicalWaveValue(wavePeriodS)
      ? waveMobilisationEnergy({ waveHeightM, wavePeriodS })
      : {
          available: false,
          energyProxy: null,
          energyScore: null,
          inputStatus: finite(waveHeightM) && finite(wavePeriodS) ? 'INVALID' : 'MISSING',
        };
    const migrationUnbound = previous?.migrationSeedAwaitingReference === true
      && previous?.migrationSeedAt === null;

    if (previous !== null && previous.time !== null) {
      const previousTimeMs = Date.parse(previous.time);
      if (timeMs < previousTimeMs) {
        throw new Error('Wave mobilisation samples must not move backwards in time');
      }
      if (timeMs === previousTimeMs
        && !migrationPending
        && previous.migrationSeedAwaitingReference !== true) {
        const sameVerifiedEvidence = energy.available
          && previous.waveReferenceAt === time
          && finite(previous.waveEnergyScore)
          && Math.abs(Number(previous.waveEnergyScore) - Number(energy.energyScore)) <= 1e-9;
        const sameMissingEvidence = !energy.available
          && previous.waveReferenceAt !== time;
        if (!sameVerifiedEvidence && !sameMissingEvidence) {
          throw new Error('Same-time wave evidence conflicts with persisted mobilisation state');
        }
        const stable = compactState(previous);
        const rollback = {
          value: stable.rollbackCandidateGMobilisationPotential,
          durationHours: 0,
          transition: 'ROLLBACK_SAME_TIME_HOLD',
        };
        previous = stable;
        migrationPending = false;
        return outputRow({
          state: stable,
          energy,
          transition: 'SAME_TIME_HOLD',
          elapsedHours: 0,
          gapHours: stable.waveReferenceAt === null
            ? null
            : (timeMs - Date.parse(stable.waveReferenceAt)) / HOUR_MS,
          creditedDurationHours: 0,
          rollback,
          migrationApplied: migrated !== null,
        });
      }
    }

    const elapsedHours = previous?.time === null || previous === null
      ? null
      : (timeMs - Date.parse(previous.time)) / HOUR_MS;
    const gapHours = previous?.waveReferenceAt === null || previous === null
      ? null
      : (timeMs - Date.parse(previous.waveReferenceAt)) / HOUR_MS;
    const rollback = rollbackTransition(previous, energy, timeMs, migrationUnbound);
    const before = previous?.mobilisationPotential
      ?? RAVSCORE_WAVE_MOBILISATION_POLICY.coldInitialPotential;

    let nextPotential = before;
    let readiness = false;
    let status = RAVSCORE_WAVE_MOBILISATION_STATUS.MISSING_INPUT;
    let transition = 'MISSING_INPUT_HOLD';
    let creditedDurationHours = 0;
    let waveReferenceAt = previous?.waveReferenceAt ?? null;
    let migrationSeedAt = previous?.migrationSeedAt ?? null;
    let referenceEnergyScore = previous?.waveEnergyScore ?? null;
    let migrationSeedAwaitingReference = previous?.migrationSeedAwaitingReference ?? false;

    if (energy.available) {
      const target = clamp(energy.energyScore);
      waveReferenceAt = time;
      referenceEnergyScore = target;

      const migrationGapHours = migrationSeedAt === null
        ? null
        : Math.max(0, (timeMs - Date.parse(migrationSeedAt)) / HOUR_MS);

      if (migrationUnbound
        || (migrationPending
          && migrationGapHours
            <= RAVSCORE_WAVE_MOBILISATION_POLICY.maximumContinuousIntervalHours)) {
        readiness = true;
        status = RAVSCORE_WAVE_MOBILISATION_STATUS.MIGRATED_READY;
        transition = 'MIGRATED_FROM_CANDIDATE_G';
        migrationSeedAwaitingReference = false;
        migrationSeedAt = null;
      } else if (migrationSeedAwaitingReference
        && migrationGapHours > RAVSCORE_WAVE_MOBILISATION_POLICY.maximumFreshGapHours) {
        // A verified wave after a long migration gap proves only the present
        // target. It cannot prove how long that target has acted, so the new
        // model must discard the stale seed and wait for elapsed evidence.
        nextPotential = RAVSCORE_WAVE_MOBILISATION_POLICY.coldInitialPotential;
        readiness = false;
        status = RAVSCORE_WAVE_MOBILISATION_STATUS.COLD_START;
        transition = 'MIGRATION_LONG_GAP_COLD_RESTART';
        migrationSeedAwaitingReference = false;
        migrationSeedAt = null;
      } else if (migrationSeedAwaitingReference) {
        creditedDurationHours = target > before
          ? Math.min(
            RAVSCORE_WAVE_MOBILISATION_POLICY.maximumBuildCreditAfterMissingOrGapHours,
            Math.max(0, migrationGapHours ?? 0),
          )
          : target < before
            ? Math.max(0, migrationGapHours ?? 0)
            : 0;
        const result = transitionPotential(before, target, creditedDurationHours);
        nextPotential = result.value;
        readiness = true;
        status = RAVSCORE_WAVE_MOBILISATION_STATUS.MIGRATED_READY;
        transition = `MIGRATED_FROM_CANDIDATE_G_${result.transition}`;
        migrationSeedAwaitingReference = false;
        migrationSeedAt = null;
      } else if (previous === null) {
        readiness = false;
        status = RAVSCORE_WAVE_MOBILISATION_STATUS.COLD_START;
        transition = 'COLD_START_NO_HISTORY';
      } else if (gapHours > RAVSCORE_WAVE_MOBILISATION_POLICY.maximumFreshGapHours) {
        // The first post-gap sample anchors a new causal sequence but receives
        // no unobserved duration credit, even when its target equals the stale
        // pre-gap state. The following contiguous sample may build from zero.
        nextPotential = RAVSCORE_WAVE_MOBILISATION_POLICY.coldInitialPotential;
        readiness = false;
        status = RAVSCORE_WAVE_MOBILISATION_STATUS.COLD_START;
        transition = 'LONG_GAP_COLD_RESTART';
      } else if (previous.readiness === false
        || elapsedHours > RAVSCORE_WAVE_MOBILISATION_POLICY.maximumContinuousIntervalHours) {
        if (target > before) {
          creditedDurationHours = Math.min(
            RAVSCORE_WAVE_MOBILISATION_POLICY.maximumBuildCreditAfterMissingOrGapHours,
            Math.max(0, gapHours ?? elapsedHours ?? 0),
          );
        } else if (target < before) {
          // A short missing interval may not create mobilisation, but the full
          // known interval may conservatively reduce a stale high state.
          creditedDurationHours = Math.max(0, gapHours ?? elapsedHours ?? 0);
        }
        const result = transitionPotential(before, target, creditedDurationHours);
        nextPotential = result.value;
        readiness = true;
        status = previous.status === RAVSCORE_WAVE_MOBILISATION_STATUS.COLD_START
          && elapsedHours <= RAVSCORE_WAVE_MOBILISATION_POLICY.maximumContinuousIntervalHours
          ? RAVSCORE_WAVE_MOBILISATION_STATUS.READY
          : RAVSCORE_WAVE_MOBILISATION_STATUS.RECOVERED_SHORT_GAP;
        transition = `RESUMED_AFTER_SHORT_GAP_${result.transition}`;
      } else {
        creditedDurationHours = Math.max(0, elapsedHours ?? 0);
        const result = transitionPotential(before, target, creditedDurationHours);
        nextPotential = result.value;
        readiness = true;
        status = RAVSCORE_WAVE_MOBILISATION_STATUS.READY;
        transition = result.transition;
      }
    }

    if (!energy.available && migrationSeedAwaitingReference && migrationSeedAt === null) {
      // An un-timestamped legacy seed may be bound only to the first actually
      // processed missing hour. Later recovery is then gap-limited instead of
      // silently treating an arbitrarily old seed as current.
      migrationSeedAt = time;
    }

    const state = compactState({
      time,
      waveReferenceAt,
      migrationSeedAt,
      mobilisationPotential: nextPotential,
      rollbackCandidateGMobilisationPotential: rollback.value,
      waveEnergyScore: referenceEnergyScore,
      readiness,
      status,
      migrationSeedAwaitingReference,
    });
    previous = state;
    const migrationApplied = migrationPending;
    migrationPending = false;
    return outputRow({
      state,
      energy,
      transition,
      elapsedHours,
      gapHours,
      creditedDurationHours,
      rollback,
      migrationApplied,
    });
  });

  return {
    schemaVersion: RAVSCORE_WAVE_MOBILISATION_STATE_SCHEMA_VERSION,
    policyId: RAVSCORE_WAVE_MOBILISATION_POLICY.id,
    initialStateSource,
    rows,
    continuationState: rows.at(-1)?.continuationState
      ?? (initialState === null || initialState === undefined
        ? null
        : compactState(previous)),
  };
}
