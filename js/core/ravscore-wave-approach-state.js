import { waveMobilisationEnergy } from './ravscore-mobilisation-memory.js';
import { RAVSCORE_LAST_MILE_POLICY } from './ravscore-model-contract.js';
import { canonicalRavScoreTime } from './ravscore-time.js';

const HOUR_MS = 3_600_000;
const EPSILON = 1e-9;
const finite = value => typeof value === 'number' && Number.isFinite(value);
const clamp = (value, minimum = 0, maximum = 1) =>
  Math.max(minimum, Math.min(maximum, Number(value)));
const close = (left, right) => finite(left) && finite(right)
  && Math.abs(Number(left) - Number(right)) <= EPSILON;

export const RAVSCORE_WAVE_APPROACH_STATE_SCHEMA_VERSION =
  RAVSCORE_LAST_MILE_POLICY.stateSchemaVersion;
export const RAVSCORE_WAVE_APPROACH_POLICY = RAVSCORE_LAST_MILE_POLICY;
export const RAVSCORE_WAVE_APPROACH_STATUS = Object.freeze({
  READY: 'READY',
  RECOVERED_SHORT_GAP: 'RECOVERED_SHORT_GAP',
  MISSING_INPUT: 'MISSING_INPUT',
  COLD_START: 'COLD_START',
});

const STATE_KEYS = Object.freeze([
  'schemaVersion',
  'policyId',
  'time',
  'waveReferenceAt',
  'waveActivityMoment',
  'waveNormalMoment',
  'waveTangentMoment',
  'latestWaveEnergyWeight',
  'latestWaveNormalAlignment',
  'latestWaveTangentAlignment',
  'readiness',
  'status',
]);
const VALID_STATUSES = new Set(Object.values(RAVSCORE_WAVE_APPROACH_STATUS));

function isoTime(value, label) {
  const canonical = canonicalRavScoreTime(value);
  if (!canonical) {
    throw new Error(`${label} must contain a valid time with an explicit timezone`);
  }
  return canonical;
}

function exactStateKeys(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  const actual = Object.keys(value).sort();
  const expected = [...STATE_KEYS].sort();
  return (prototype === Object.prototype || prototype === null)
    && actual.length === expected.length
    && actual.every((key, index) => key === expected[index]);
}

function compactState({
  time,
  waveReferenceAt,
  waveActivityMoment,
  waveNormalMoment,
  waveTangentMoment,
  latestWaveEnergyWeight,
  latestWaveNormalAlignment,
  latestWaveTangentAlignment,
  readiness,
  status,
}) {
  return {
    schemaVersion: RAVSCORE_WAVE_APPROACH_STATE_SCHEMA_VERSION,
    policyId: RAVSCORE_WAVE_APPROACH_POLICY.id,
    time,
    waveReferenceAt,
    waveActivityMoment,
    waveNormalMoment,
    waveTangentMoment,
    latestWaveEnergyWeight,
    latestWaveNormalAlignment,
    latestWaveTangentAlignment,
    readiness,
    status,
  };
}

function continuationState(value) {
  if (value === null || value === undefined) return null;
  if (!exactStateKeys(value)
    || value.schemaVersion !== RAVSCORE_WAVE_APPROACH_STATE_SCHEMA_VERSION
    || value.policyId !== RAVSCORE_WAVE_APPROACH_POLICY.id) {
    throw new Error('Wave-approach continuation has an incompatible exact schema');
  }
  const time = isoTime(value.time, 'Wave-approach continuation time');
  const waveReferenceAt = value.waveReferenceAt === null
    ? null
    : isoTime(value.waveReferenceAt, 'Wave-approach reference time');
  const activity = value.waveActivityMoment;
  const normal = value.waveNormalMoment;
  const tangent = value.waveTangentMoment;
  const latestEnergy = value.latestWaveEnergyWeight;
  const latestNormal = value.latestWaveNormalAlignment;
  const latestTangent = value.latestWaveTangentAlignment;
  const readyStatus = RAVSCORE_WAVE_APPROACH_POLICY.readyStatuses.includes(value.status);
  const latestAllNull = latestEnergy === null
    && latestNormal === null
    && latestTangent === null;
  const latestAllPresent = latestEnergy !== null
    && latestNormal !== null
    && latestTangent !== null;
  const exactZeroMoments = activity === 0 && normal === 0 && tangent === 0;
  const latestExactZeroVector = latestNormal === 0 && latestTangent === 0;
  const latestUnitVector = latestAllPresent
    && Math.abs(Math.hypot(latestNormal, latestTangent) - 1) <= EPSILON;
  const coldStart = value.status === RAVSCORE_WAVE_APPROACH_STATUS.COLD_START;
  const missingInput = value.status === RAVSCORE_WAVE_APPROACH_STATUS.MISSING_INPUT;
  if (value.time !== time
    || (waveReferenceAt !== null && value.waveReferenceAt !== waveReferenceAt)
    || (waveReferenceAt !== null && Date.parse(waveReferenceAt) > Date.parse(time))
    || !finite(activity) || activity < 0 || activity > 1
    || !finite(normal) || Math.abs(normal) > activity + EPSILON
    || !finite(tangent) || Math.abs(tangent) > activity + EPSILON
    || Math.hypot(normal, tangent) > activity + EPSILON
    || typeof value.readiness !== 'boolean'
    || !VALID_STATUSES.has(value.status)
    || value.readiness !== readyStatus
    || (readyStatus && waveReferenceAt !== time)
    || (coldStart && (waveReferenceAt !== time || !exactZeroMoments))
    || (missingInput && waveReferenceAt !== null
      && Date.parse(waveReferenceAt) >= Date.parse(time))
    || (missingInput && waveReferenceAt === null && !exactZeroMoments)
    || (waveReferenceAt === null ? !latestAllNull : !latestAllPresent)
    || (latestAllPresent && !latestExactZeroVector && !latestUnitVector)
    || (latestExactZeroVector && latestEnergy !== 0)
    || (latestEnergy !== null
      && (!finite(latestEnergy) || latestEnergy < 0 || latestEnergy > 1))
    || (latestNormal !== null
      && (!finite(latestNormal) || latestNormal < -1 || latestNormal > 1))
    || (latestTangent !== null
      && (!finite(latestTangent) || latestTangent < -1 || latestTangent > 1))) {
    throw new Error('Wave-approach continuation is internally inconsistent');
  }
  return compactState({
    time,
    waveReferenceAt,
    waveActivityMoment: activity,
    waveNormalMoment: normal,
    waveTangentMoment: tangent,
    latestWaveEnergyWeight: latestEnergy === null ? null : Number(latestEnergy),
    latestWaveNormalAlignment: latestNormal === null ? null : Number(latestNormal),
    latestWaveTangentAlignment: latestTangent === null ? null : Number(latestTangent),
    readiness: value.readiness,
    status: value.status,
  });
}

function directionalEvidence(sample, {
  onshoreDirectionDeg,
  getWaveHeight,
  getWavePeriod,
  getWaveDirection,
}) {
  const waveHeightM = getWaveHeight(sample);
  const wavePeriodS = getWavePeriod(sample);
  const energy = waveMobilisationEnergy({ waveHeightM, wavePeriodS });
  if (!energy.available) {
    return {
      available: false,
      reason: `WAVE_PHYSICS_${energy.inputStatus}`,
      energyWeight: null,
      normalAlignment: null,
      tangentAlignment: null,
    };
  }
  const energyWeight = clamp(energy.energyScore / 100);
  if (energy.exactCalm) {
    return {
      available: true,
      reason: 'EXACT_CALM_DIRECTION_NEUTRAL',
      energyWeight: 0,
      normalAlignment: 0,
      tangentAlignment: 0,
    };
  }
  const fromDirection = getWaveDirection(sample);
  if (!finite(fromDirection) || fromDirection < 0 || fromDirection >= 360) {
    return {
      available: false,
      reason: 'ACTIVE_WAVE_DIRECTION_MISSING',
      energyWeight,
      normalAlignment: null,
      tangentAlignment: null,
    };
  }
  const towardDirection = (Number(fromDirection) + 180) % 360;
  const signedDifferenceRadians = (towardDirection - onshoreDirectionDeg) * Math.PI / 180;
  return {
    available: true,
    reason: 'DIRECTIONAL_WAVE_EVIDENCE_READY',
    energyWeight,
    normalAlignment: Math.cos(signedDifferenceRadians),
    tangentAlignment: Math.sin(signedDifferenceRadians),
  };
}

export function waveApproachDeliveryContext(state) {
  const validated = continuationState(state);
  if (validated === null) return {
    available: false,
    status: 'LAST_MILE_WAVE_APPROACH_STATE_MISSING',
    activity: null,
    normalAlignment: null,
    tangentAlignment: null,
    coherence: null,
    approach: null,
    factor: null,
  };
  const activity = clamp(validated.waveActivityMoment);
  const zeroActivity = activity === 0;
  const calm = zeroActivity
    && validated.latestWaveEnergyWeight === 0
    && validated.latestWaveNormalAlignment === 0
    && validated.latestWaveTangentAlignment === 0;
  const normalAlignment = zeroActivity ? null
    : clamp(validated.waveNormalMoment / activity, -1, 1);
  const tangentAlignment = zeroActivity ? null
    : clamp(validated.waveTangentMoment / activity, -1, 1);
  const coherence = zeroActivity ? null
    : clamp(Math.hypot(validated.waveNormalMoment, validated.waveTangentMoment) / activity);
  const approach = zeroActivity ? 1 : clamp(
    (normalAlignment - RAVSCORE_WAVE_APPROACH_POLICY.approachNeutralNormalAlignment)
      / (1 - RAVSCORE_WAVE_APPROACH_POLICY.approachNeutralNormalAlignment),
  );
  const factor = clamp(
    1 - RAVSCORE_WAVE_APPROACH_POLICY.maximumAttenuationShare
      * activity * (1 - approach),
    RAVSCORE_WAVE_APPROACH_POLICY.minimumDeliveryFactor,
    RAVSCORE_WAVE_APPROACH_POLICY.maximumDeliveryFactor,
  );
  return {
    available: validated.readiness === true
      && RAVSCORE_WAVE_APPROACH_POLICY.readyStatuses.includes(validated.status),
    status: validated.status,
    calm,
    activity,
    normalAlignment,
    tangentAlignment,
    coherence,
    approach,
    factor,
  };
}

function outputRow(state, evidence, {
  transition,
  elapsedHours,
  gapHours,
  creditedDurationHours,
} = {}) {
  return {
    time: state.time,
    waveReferenceAt: state.waveReferenceAt,
    readiness: state.readiness,
    status: state.status,
    transition,
    evidenceStatus: evidence.reason,
    elapsedHours,
    gapHours,
    creditedDurationHours,
    ...waveApproachDeliveryContext(state),
    continuationState: state,
  };
}

/**
 * Compact causal 4-hour EWMA of wave approach. DMI wave direction is a
 * meteorological "from" direction and is rotated 180 degrees before it is
 * projected on the immutable onshore normal. Raw direction never enters the
 * continuation state.
 */
export function buildRavScoreWaveApproachStateSeries(
  samples = [],
  {
    initialState = null,
    onshoreDirectionDeg,
    getTime = sample => sample?.time,
    getWaveHeight = sample => sample?.waveHeightM,
    getWavePeriod = sample => sample?.wavePeriodS,
    getWaveDirection = sample => sample?.waveDirectionDeg,
  } = {},
) {
  if (!Array.isArray(samples)) throw new Error('Wave-approach samples must be an array');
  if (samples.length && (!finite(onshoreDirectionDeg)
    || onshoreDirectionDeg < 0 || onshoreDirectionDeg >= 360)) {
    throw new Error('Wave-approach state requires the immutable onshore direction');
  }
  let previous = continuationState(initialState);
  const initialStateSource = previous === null ? 'COLD_START' : 'CONTINUATION';

  const rows = samples.map((sample, index) => {
    const time = isoTime(getTime(sample), `Wave-approach sample ${index} time`);
    const timeMs = Date.parse(time);
    const evidence = directionalEvidence(sample, {
      onshoreDirectionDeg,
      getWaveHeight,
      getWavePeriod,
      getWaveDirection,
    });
    if (previous !== null && timeMs < Date.parse(previous.time)) {
      throw new Error('Wave-approach samples must not move backwards in time');
    }
    if (previous !== null && timeMs === Date.parse(previous.time)) {
      const sameMissing = !evidence.available
        && previous.status === RAVSCORE_WAVE_APPROACH_STATUS.MISSING_INPUT;
      const sameVerified = evidence.available
        && previous.waveReferenceAt === time
        && close(previous.latestWaveEnergyWeight, evidence.energyWeight)
        && close(previous.latestWaveNormalAlignment, evidence.normalAlignment)
        && close(previous.latestWaveTangentAlignment, evidence.tangentAlignment);
      if (!sameMissing && !sameVerified) {
        throw new Error('Same-time wave direction conflicts with persisted approach state');
      }
      return outputRow(previous, evidence, {
        transition: 'SAME_TIME_HOLD',
        elapsedHours: 0,
        gapHours: previous.waveReferenceAt === null
          ? null
          : (timeMs - Date.parse(previous.waveReferenceAt)) / HOUR_MS,
        creditedDurationHours: 0,
      });
    }

    const elapsedHours = previous === null
      ? null
      : (timeMs - Date.parse(previous.time)) / HOUR_MS;
    const gapHours = previous?.waveReferenceAt === null || previous === null
      ? null
      : (timeMs - Date.parse(previous.waveReferenceAt)) / HOUR_MS;
    let activity = previous?.waveActivityMoment ?? 0;
    let normal = previous?.waveNormalMoment ?? 0;
    let tangent = previous?.waveTangentMoment ?? 0;
    let waveReferenceAt = previous?.waveReferenceAt ?? null;
    let latestEnergy = previous?.latestWaveEnergyWeight ?? null;
    let latestNormal = previous?.latestWaveNormalAlignment ?? null;
    let latestTangent = previous?.latestWaveTangentAlignment ?? null;
    let readiness = false;
    let status = RAVSCORE_WAVE_APPROACH_STATUS.MISSING_INPUT;
    let transition = 'MISSING_INPUT_HOLD';
    let creditedDurationHours = 0;

    if (evidence.available) {
      waveReferenceAt = time;
      latestEnergy = evidence.energyWeight;
      latestNormal = evidence.normalAlignment;
      latestTangent = evidence.tangentAlignment;
      if (previous === null || previous.waveReferenceAt === null
        || gapHours > RAVSCORE_WAVE_APPROACH_POLICY.maximumFreshGapHours) {
        activity = 0;
        normal = 0;
        tangent = 0;
        status = RAVSCORE_WAVE_APPROACH_STATUS.COLD_START;
        transition = previous === null || previous.waveReferenceAt === null
          ? 'COLD_START_NO_HISTORY'
          : 'LONG_GAP_COLD_RESTART';
      } else {
        creditedDurationHours = previous.readiness === true
          && elapsedHours <= RAVSCORE_WAVE_APPROACH_POLICY.maximumContinuousIntervalHours
          ? Math.max(0, elapsedHours)
          : Math.min(
            RAVSCORE_WAVE_APPROACH_POLICY.maximumRecoveryCreditHours,
            Math.max(0, gapHours ?? elapsedHours ?? 0),
          );
        const retained = 2 ** (
          -creditedDurationHours / RAVSCORE_WAVE_APPROACH_POLICY.directionalHalfLifeHours
        );
        const incoming = 1 - retained;
        activity = clamp(retained * activity + incoming * evidence.energyWeight);
        normal = retained * normal
          + incoming * evidence.energyWeight * evidence.normalAlignment;
        tangent = retained * tangent
          + incoming * evidence.energyWeight * evidence.tangentAlignment;
        readiness = true;
        status = previous.readiness === true
          ? RAVSCORE_WAVE_APPROACH_STATUS.READY
          : previous.status === RAVSCORE_WAVE_APPROACH_STATUS.COLD_START
            ? RAVSCORE_WAVE_APPROACH_STATUS.READY
            : RAVSCORE_WAVE_APPROACH_STATUS.RECOVERED_SHORT_GAP;
        transition = previous.readiness === true ? 'EWMA_UPDATE' : 'RECOVERED_WITH_BOUNDED_CREDIT';
      }
    }

    const state = compactState({
      time,
      waveReferenceAt,
      waveActivityMoment: activity,
      waveNormalMoment: normal,
      waveTangentMoment: tangent,
      latestWaveEnergyWeight: latestEnergy,
      latestWaveNormalAlignment: latestNormal,
      latestWaveTangentAlignment: latestTangent,
      readiness,
      status,
    });
    previous = state;
    return outputRow(state, evidence, {
      transition,
      elapsedHours,
      gapHours,
      creditedDurationHours,
    });
  });

  return {
    schemaVersion: RAVSCORE_WAVE_APPROACH_STATE_SCHEMA_VERSION,
    policyId: RAVSCORE_WAVE_APPROACH_POLICY.id,
    initialStateSource,
    rows,
    continuationState: rows.at(-1)?.continuationState
      ?? (previous === null ? null : compactState(previous)),
  };
}
