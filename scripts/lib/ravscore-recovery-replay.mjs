import crypto from 'node:crypto';
import {
  RAVSCORE_CURRENT_SUPPLY_POLICY,
  RAVSCORE_MIGRATION_ID,
  RAVSCORE_MODEL_BUNDLE_SHA256,
  RAVSCORE_MODEL_CONTRACT_SHA256,
  RAVSCORE_MODEL_ID,
  RAVSCORE_RECOVERY_POLICY,
  RAVSCORE_STATE_SCHEMA_VERSION,
} from '../../js/core/ravscore-model-contract.js';
import {
  buildIntegratedRavScoreStateSeries,
  validateCandidateGMigrationSource,
} from '../../js/core/ravscore-integrated-state-pipeline.js';
import {
  buildCurrentSupplyMemory,
} from '../../js/core/ravscore-current-supply-memory.js';
import { classifyWavePhysicalTuple } from '../../js/core/ravscore-mobilisation-memory.js';
import {
  assertIntegratedCoastalPointContinuation,
  candidateGStateKey,
} from './coastal-point-staging-contract.mjs';
import { ravScoreSamplingContextKey } from './ravscore-sampling-context.mjs';
import {
  coastNormalSpeedMpsFromUv,
  dmiExpectedIdentityForPart,
  verifiedControlledLiveCurrentSource,
  verifiedDmiForecastComponentSource,
} from './ravscore-production-adapters.mjs';

export const RAVSCORE_RECOVERY_REPLAY_MAXIMUM_AGE_HOURS = 72;
export const RAVSCORE_COLD_START_REPLAY_HOURS =
  RAVSCORE_CURRENT_SUPPLY_POLICY.windowHours;
const DMI_CURRENT_VECTOR_SELECTION = 'nearest-shared-uv-column-across-dmi-collections-then-deepest-valid-layer';

const HOUR_MS = 3_600_000;
const CURRENT_PROVENANCE_KEYS = Object.freeze([
  'status',
  'provider',
  'source',
  'sourceClass',
  'collection',
  'modelRun',
  'leadTimeHours',
  'temporalResolution',
  'nativeValidTimes',
  'fallback',
  'controlledLivePilot',
  'vectorSemanticsVersion',
  'vectorSelection',
  'verticalLayer',
  'verticalLayerRankM',
  'distanceKm',
  'componentPair',
  'interpolation',
  'gridPoint',
  'samplingPoint',
]);
const WAVE_PROVENANCE_KEYS = Object.freeze([
  'provider',
  'collection',
  'modelRun',
  'leadTimeHours',
  'temporalResolution',
  'nativeValidTimes',
  'optionalFieldSet',
  'fallback',
]);

const finite = value => typeof value === 'number' && Number.isFinite(value);
const canonicalTime = (value, label) => {
  if (typeof value !== 'string'
    || !/(?:Z|[+-]\d{2}:\d{2})$/i.test(value)
    || !Number.isFinite(Date.parse(value))) {
    throw new Error(`${label} is not a valid time`);
  }
  return new Date(value).toISOString();
};
const canonicalHour = value => {
  const time = canonicalTime(value, 'RavScore recovery row time');
  const date = new Date(time);
  if (date.getUTCMinutes() !== 0 || date.getUTCSeconds() !== 0 || date.getUTCMilliseconds() !== 0) {
    throw new Error('RavScore recovery replay accepts only exact forecast hours');
  }
  return time;
};
const samePoint = (left, right, tolerance = 1e-7) => Array.isArray(left)
  && Array.isArray(right)
  && left.length === 2
  && right.length === 2
  && left.every((value, index) => finite(value)
    && finite(right[index])
    && Math.abs(Number(value) - Number(right[index])) <= tolerance);
const haversineKm = (left, right) => {
  if (!samePoint(left, left) || !samePoint(right, right)) return Number.POSITIVE_INFINITY;
  const radians = degrees => degrees * Math.PI / 180;
  const dLat = radians(Number(right[1]) - Number(left[1]));
  const dLon = radians(Number(right[0]) - Number(left[0]));
  const lat1 = radians(Number(left[1]));
  const lat2 = radians(Number(right[1]));
  const term = Math.sin(dLat / 2) ** 2
    + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 6371.0088 * 2 * Math.atan2(Math.sqrt(term), Math.sqrt(Math.max(0, 1 - term)));
};
const canonicalValue = value => {
  if (Array.isArray(value)) return value.map(canonicalValue);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value)
      .filter(([, nested]) => nested !== undefined)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, nested]) => [key, canonicalValue(nested)]));
  }
  return value;
};
const digest = value => crypto.createHash('sha256')
  .update(JSON.stringify(canonicalValue(value)))
  .digest('hex');
const NUMERIC_PROVENANCE_KEYS = new Set([
  'leadTimeHours',
  'verticalLayerRankM',
  'distanceKm',
  'vectorSemanticsVersion',
]);
const POINT_PROVENANCE_KEYS = new Set(['gridPoint', 'samplingPoint']);
const provenanceProjection = (value, keys) => Object.fromEntries(keys
  .filter(key => value?.[key] !== undefined)
  .map(key => {
    const nested = value[key];
    if (key === 'provider' || key === 'status' || key === 'temporalResolution') {
      return [key, String(nested).toLowerCase()];
    }
    if (key === 'modelRun') return [key, new Date(nested).toISOString()];
    if (key === 'nativeValidTimes') {
      return [key, [...new Set(nested.map(time => new Date(time).toISOString()))].sort()];
    }
    if (NUMERIC_PROVENANCE_KEYS.has(key) && finite(nested)) return [key, Number(nested)];
    if (POINT_PROVENANCE_KEYS.has(key) && Array.isArray(nested)) {
      return [key, nested.slice(0, 2).map(Number)];
    }
    return [key, nested];
  }));
const circularDistanceDeg = (left, right) => {
  const difference = Math.abs(Number(left) - Number(right)) % 360;
  return Math.min(difference, 360 - difference);
};

function failClosed(code, message) {
  const error = new Error(message);
  error.code = code;
  throw error;
}

function assertDmiCurrentProvenance(provenance, part, rowTime) {
  const expectedPoint = part?.waterPoint;
  const expectedIdentity = dmiExpectedIdentityForPart(part);
  if (provenance?.status !== 'verified'
    || !verifiedDmiForecastComponentSource(
      provenance,
      rowTime,
      'current',
      expectedIdentity,
    )
    || provenance.vectorSemanticsVersion !== 3
    || provenance.vectorSelection !== DMI_CURRENT_VECTOR_SELECTION
    || typeof provenance.verticalLayer !== 'string'
    || !provenance.verticalLayer
    || !samePoint(provenance.samplingPoint, expectedPoint)
    || !samePoint(provenance.gridPoint, provenance.gridPoint)
    || !finite(provenance.distanceKm)
    || Number(provenance.distanceKm) < 0
    || Number(provenance.distanceKm) > 5
    || haversineKm(expectedPoint, provenance.gridPoint) > 5.01
    || provenance.fallback !== false) {
    return false;
  }
  return true;
}

function compactCurrentHoldProof(provenance) {
  if (provenance?.status === 'verified'
    && provenance.sourceClass === 'owner-approved-regional-proxy'
    && provenance.source === 'dmi-dkss-lf-regional-proxy'
    && provenance.collection === 'dkss_lf'
    && finite(provenance.distanceKm)
    && provenance.distanceKm >= 0
    && provenance.distanceKm <= 15) {
    return {
      status: 'verified',
      sourceClass: provenance.sourceClass,
      source: provenance.source,
      collection: provenance.collection,
      distanceKm: provenance.distanceKm,
    };
  }
  return { status: 'verified' };
}

function currentComponent(row, part) {
  const expectedPoint = part?.waterPoint;
  if (!finite(row?.currentSpeedMps)
    || !finite(row?.currentDirectionDeg)
    || Number(row.currentSpeedMps) < 0) return null;
  const provenance = row.currentProvenance?.status === 'verified'
    ? row.currentProvenance
    : row.sources?.current;
  const livePilot = provenance?.vectorSemanticsVersion === 4;
  const verified = livePilot
    ? Boolean(verifiedControlledLiveCurrentSource(
      provenance,
      row.time,
      part,
      row.currentUMps,
      row.currentVMps,
    ))
    : assertDmiCurrentProvenance(provenance, part, row.time);
  if (!verified) return null;
  const hasU = finite(row.currentUMps);
  const hasV = finite(row.currentVMps);
  if (!hasU || !hasV) return null;
  const rawU = Number(row.currentUMps);
  const rawV = Number(row.currentVMps);
  const directionDeg = ((Number(row.currentDirectionDeg) % 360) + 360) % 360;
  const derivedSpeed = Math.hypot(rawU, rawV);
  const derivedDirection = ((Math.atan2(rawU, rawV) * 180 / Math.PI) + 360) % 360;
  const coastNormalSpeedMps = coastNormalSpeedMpsFromUv(
    rawU,
    rawV,
    part?.onshoreDirectionDeg,
  );
  if (Math.abs(derivedSpeed - Number(row.currentSpeedMps)) > 0.011
    || (Number(row.currentSpeedMps) > 0.01
      && circularDistanceDeg(derivedDirection, directionDeg) > 0.51)
    || coastNormalSpeedMps === null) return null;
  const projectedProvenance = provenanceProjection(provenance, CURRENT_PROVENANCE_KEYS);
  return {
    signature: digest({
      currentSpeedMps: Number(row.currentSpeedMps),
      currentDirectionDeg: directionDeg,
      // Raw components are compared only inside this one-way digest. They are
      // never retained in replay rows, state, errors or public output.
      rawVector: [rawU, rawV],
      provenance: projectedProvenance,
    }),
    row: {
      currentSpeedMps: Number(row.currentSpeedMps),
      currentDirectionDeg: directionDeg,
      currentCoastNormalSpeedMps: coastNormalSpeedMps,
      currentProvenance: compactCurrentHoldProof(provenance),
    },
  };
}

function waveComponent(row, part) {
  const physicalWave = classifyWavePhysicalTuple({
    waveHeightM: row?.waveHeightM,
    wavePeriodS: row?.wavePeriodS,
  });
  if (!physicalWave.available) return null;
  const waveDirectionDeg = finite(row?.waveDirectionDeg)
    && Number(row.waveDirectionDeg) >= 0
    && Number(row.waveDirectionDeg) < 360
    ? Number(row.waveDirectionDeg)
    : null;
  const provenance = row?.sources?.wave;
  const verifiedProvenance = verifiedDmiForecastComponentSource(
    provenance,
    row.time,
    'wave',
    dmiExpectedIdentityForPart(part),
  );
  if (!verifiedProvenance) return null;
  const directionAttested = Array.isArray(verifiedProvenance.optionalFieldSet)
    && verifiedProvenance.optionalFieldSet.length === 1
    && verifiedProvenance.optionalFieldSet[0] === 'mean-wave-dir';
  if (waveDirectionDeg === null) {
    if (physicalWave.active || verifiedProvenance.optionalFieldSet.length !== 0) return null;
  } else if (!directionAttested) return null;
  const projectedProvenance = provenanceProjection(provenance, WAVE_PROVENANCE_KEYS);
  return {
    signature: digest({
      waveHeightM: Number(row.waveHeightM),
      wavePeriodS: Number(row.wavePeriodS),
      waveDirectionDeg,
      provenance: projectedProvenance,
    }),
    row: {
      waveHeightM: Number(row.waveHeightM),
      wavePeriodS: Number(row.wavePeriodS),
      waveDirectionDeg,
    },
  };
}

function addComponent(target, componentName, candidate) {
  if (!candidate) return;
  const existing = target[componentName];
  if (existing && existing.signature !== candidate.signature) {
    failClosed(
      'RAVSCORE_RECOVERY_REPLAY_CONFLICT',
      `RavScore recovery replay has a conflicting ${componentName} component`,
    );
  }
  if (!existing) target[componentName] = candidate;
}

function nextExactHourAfter(value) {
  const time = canonicalTime(value, 'RavScore recovery state time');
  const date = new Date(time);
  date.setUTCMinutes(0, 0, 0);
  if (Date.parse(date.toISOString()) <= Date.parse(time)) date.setUTCHours(date.getUTCHours() + 1);
  return date.toISOString();
}

/**
 * Canonical WAM target for a validated Candidate G -> integrated migration.
 *
 * The bridge ends immediately before Candidate G's first replay hour, unless
 * the production target is already that hour. Keeping this pure and exported
 * lets pre-acquisition validation and the replay consume one target contract.
 */
export function ravScoreCandidateMigrationWaveBootstrapTargetAt(
  candidateState,
  targetReferenceAt,
) {
  if (!candidateState || typeof candidateState !== 'object' || Array.isArray(candidateState)) {
    throw new Error('RavScore Candidate G wave-bootstrap state is invalid');
  }
  const target = canonicalHour(targetReferenceAt);
  const next = nextExactHourAfter(candidateState.time);
  return Date.parse(next) < Date.parse(target) ? next : target;
}

export function ravScoreRecoveryReplayStartAt(initialState, targetReferenceAt) {
  const target = canonicalHour(targetReferenceAt);
  if (!initialState) {
    return new Date(
      Date.parse(target) - RAVSCORE_COLD_START_REPLAY_HOURS * HOUR_MS,
    ).toISOString();
  }
  const next = nextExactHourAfter(initialState.time);
  return Date.parse(next) < Date.parse(target) ? next : target;
}

/**
 * Earliest private source hour needed by recovery. Candidate G migration has
 * a separate bounded wave-approach bootstrap. The validated Candidate G signed
 * current evidence is reweighted directly and needs no raw-current lookback.
 */
export function ravScoreRecoverySourceStartAt(initialState, targetReferenceAt) {
  const replayStartAt = ravScoreRecoveryReplayStartAt(initialState, targetReferenceAt);
  const directionBootstrapTarget = initialState?.transportReferenceAt
    ? ravScoreCandidateMigrationWaveBootstrapTargetAt(initialState, targetReferenceAt)
    : canonicalHour(targetReferenceAt);
  const directionBootstrapStartAt = initialState?.transportReferenceAt
    ? new Date(
      Date.parse(directionBootstrapTarget)
        - RAVSCORE_RECOVERY_POLICY
          .candidateMigrationWaveApproachReplayHours * HOUR_MS,
    ).toISOString()
    : replayStartAt;
  return [directionBootstrapStartAt, replayStartAt]
    .sort((left, right) => Date.parse(left) - Date.parse(right))[0];
}

function verifiedNativeCadenceBoundaryReference(
  sample,
  { firstReplayTime, nativeCadenceHoldHours },
) {
  if (sample === null || sample === undefined) return null;
  const keys = Object.keys(sample).sort();
  const expectedKeys = [
    'currentAlignment','currentProvenance','currentSpeedMps','currentVerified','time',
  ].sort();
  const prototype = typeof sample === 'object' && !Array.isArray(sample)
    ? Object.getPrototypeOf(sample)
    : null;
  const validShape = (prototype === Object.prototype || prototype === null)
    && keys.length === expectedKeys.length
    && keys.every((key, index) => key === expectedKeys[index]);
  let time = null;
  try {
    time = canonicalHour(sample?.time);
  } catch {
    time = null;
  }
  const gapHours = time === null
    ? Number.NaN
    : (Date.parse(firstReplayTime) - Date.parse(time)) / HOUR_MS;
  if (!validShape
    || sample.currentVerified !== true
    || !finite(sample.currentSpeedMps)
    || Number(sample.currentSpeedMps) < 0
    || !finite(sample.currentAlignment)
    || Number(sample.currentAlignment) < -1
    || Number(sample.currentAlignment) > 1
    || Object.keys(sample.currentProvenance ?? {}).sort().join('|')
      !== ['collection','distanceKm','source','sourceClass','status'].sort().join('|')
    || sample.currentProvenance.status !== 'verified'
    || sample.currentProvenance.sourceClass !== 'owner-approved-regional-proxy'
    || sample.currentProvenance.source !== 'dmi-dkss-lf-regional-proxy'
    || sample.currentProvenance.collection !== 'dkss_lf'
    || !finite(sample.currentProvenance.distanceKm)
    || sample.currentProvenance.distanceKm < 0
    || sample.currentProvenance.distanceKm > 15
    || !finite(nativeCadenceHoldHours)
    || Number(nativeCadenceHoldHours) <= 0
    || !(gapHours > 0)
    || gapHours > Number(nativeCadenceHoldHours)) {
    failClosed(
      'RAVSCORE_RECOVERY_REPLAY_NATIVE_REFERENCE_INVALID',
      'RavScore recovery native-cadence boundary reference is invalid',
    );
  }
  return {
    time,
    currentSpeedMps: Number(sample.currentSpeedMps),
    currentAlignment: Number(sample.currentAlignment),
    currentVerified: true,
    currentProvenance: { ...sample.currentProvenance },
  };
}

function buildCandidateGCurrentMigrationBootstrap({
  part,
  candidateMigration,
}) {
  if (!candidateMigration) return null;
  const referenceAt = candidateMigration.currentReferenceAt;
  const evidence = candidateMigration.transportEvidence
    ?.map(item => ({ ...item })) ?? null;
  if (!Array.isArray(evidence)
    || evidence.some(item => !finite(item.strength))) {
    failClosed(
      'RAVSCORE_CANDIDATE_G_MIGRATION_CURRENT_INVALID',
      'Candidate G migration lacks canonical verified signed current evidence',
    );
  }
  const rebuilt = buildCurrentSupplyMemory(evidence, {
    referenceTime: referenceAt,
    nativeHold: false,
  });
  if (rebuilt.memoryReady !== true
    || rebuilt.status !== 'READY'
    || rebuilt.referenceTime !== referenceAt
    || rebuilt.evidence.at(-1)?.time !== referenceAt) {
    failClosed(
      'RAVSCORE_CANDIDATE_G_MIGRATION_CURRENT_INCOMPLETE',
      'Candidate G signed current evidence cannot be reweighted by the integrated kernel',
    );
  }
  return {
    migrationId: RAVSCORE_MIGRATION_ID,
    source: RAVSCORE_RECOVERY_POLICY.candidateMigrationCurrentEvidenceSource,
    samplingContextKey: ravScoreSamplingContextKey(part),
    sourceStateTime: candidateMigration.time,
    currentReferenceAt: referenceAt,
    currentEvidence: rebuilt.evidence.map(item => ({ ...item })),
    currentNativeHoldAuthorization: null,
  };
}

function buildCandidateGWaveApproachMigrationBootstrap({
  part,
  candidateMigration,
  targetReferenceAt,
  waveByTime,
}) {
  if (!candidateMigration) return null;
  const replayHours =
    RAVSCORE_RECOVERY_POLICY.candidateMigrationWaveApproachReplayHours;
  const targetMs = Date.parse(targetReferenceAt);
  const expectedTimes = Array.from(
    { length: replayHours },
    (_, index) => new Date(
      targetMs - (replayHours - index) * HOUR_MS,
    ).toISOString(),
  );
  const rows = expectedTimes.map(time => {
    const component = waveByTime.get(time)?.wave;
    if (!component) {
      failClosed(
        'RAVSCORE_CANDIDATE_G_MIGRATION_WAVE_DIRECTION_INCOMPLETE',
        'Candidate G migration lacks its bounded verified wave-direction bridge',
      );
    }
    return { time, ...component.row };
  });
  return {
    migrationId: RAVSCORE_MIGRATION_ID,
    source: 'VERIFIED_PRIVATE_DMI_WAVE_DIRECTION_REPLAY',
    samplingContextKey: ravScoreSamplingContextKey(part),
    sourceStateTime: candidateMigration.time,
    targetReferenceAt,
    rows,
  };
}

export function selectRavScoreInitialState({
  part,
  pointStateInjections = {},
  existingPart = null,
  checkpointStates = {},
  targetReferenceAt = null,
} = {}) {
  if (!part?.partId) throw new Error('RavScore initial-state selection requires a coastal part');
  const samplingContextKey = ravScoreSamplingContextKey(part);
  const expectedCandidateGStateKey = candidateGStateKey(part);
  const rejectedSources = [];
  const expiredSources = [];
  const selectionTargetMs = targetReferenceAt === null
    ? null
    : Date.parse(canonicalHour(targetReferenceAt));
  const integratedContinuationExpired = state => selectionTargetMs !== null
    && selectionTargetMs >= Date.parse(state.time)
    && (selectionTargetMs - Date.parse(state.time)) / HOUR_MS
      > RAVSCORE_RECOVERY_REPLAY_MAXIMUM_AGE_HOURS;
  const pointState = pointStateInjections?.[part.partId] ?? null;
  if (pointState) {
    if (pointState.schemaVersion !== RAVSCORE_STATE_SCHEMA_VERSION
      || pointState.modelId !== RAVSCORE_MODEL_ID
      || pointState.modelContractSha256 !== RAVSCORE_MODEL_CONTRACT_SHA256
      || pointState.modelBundleSha256 !== RAVSCORE_MODEL_BUNDLE_SHA256
      || pointState.samplingContextKey !== samplingContextKey) {
      failClosed(
        'RAVSCORE_POINT_ACTIVATION_CONTEXT_MISMATCH',
        'RavScore point activation does not match the exact active sampling context',
      );
    }
    assertIntegratedCoastalPointContinuation(pointState, {
      samplingContextKey,
      requireReady: true,
      label: 'RavScore exact point-activation state',
    });
    return { state: pointState, source: 'POINT_ACTIVATION', rejectedSources, expiredSources };
  }
  const existingIntegrated = existingPart?.ravScoreModel?.currentState ?? null;
  if (existingIntegrated) {
    try {
      assertIntegratedCoastalPointContinuation(existingIntegrated, {
        samplingContextKey,
        label: 'Existing integrated RavScore continuation',
      });
      if (integratedContinuationExpired(existingIntegrated)) {
        expiredSources.push('EXISTING_INTEGRATED_EXPIRED');
      } else {
        return {
          state: existingIntegrated,
          source: 'EXISTING_INTEGRATED',
          rejectedSources,
          expiredSources,
        };
      }
    } catch {
      rejectedSources.push('EXISTING_INTEGRATED_INVALID');
    }
  }
  const checkpointState = checkpointStates?.[part.partId] ?? null;
  if (checkpointState) {
    try {
      assertIntegratedCoastalPointContinuation(checkpointState, {
        samplingContextKey,
        label: 'Protected integrated RavScore checkpoint',
      });
      if (integratedContinuationExpired(checkpointState)) {
        expiredSources.push('INTEGRATED_CHECKPOINT_EXPIRED');
      } else {
        return {
          state: checkpointState,
          source: 'INTEGRATED_CHECKPOINT',
          rejectedSources,
          expiredSources,
        };
      }
    } catch {
      rejectedSources.push('INTEGRATED_CHECKPOINT_INVALID');
    }
  }
  const legacyState = existingPart?.candidateG?.currentState ?? null;
  if (legacyState) {
    try {
      const validation = validateCandidateGMigrationSource(
        legacyState,
        expectedCandidateGStateKey,
      );
      if (!validation) throw new Error('Candidate G migration validation did not accept the source');
      return {
        state: legacyState,
        source: 'CANDIDATE_G_MIGRATION',
        rejectedSources,
        expiredSources,
      };
    } catch {
      rejectedSources.push('CANDIDATE_G_MIGRATION_INVALID');
    }
  }
  if (rejectedSources.length) {
    failClosed(
      'RAVSCORE_INITIAL_STATE_SOURCES_INVALID',
      'RavScore initial-state sources are present but none validates',
    );
  }
  return { state: null, source: 'COLD_START', rejectedSources, expiredSources };
}

/**
 * Build one private causal state input. Rows before the production target are
 * reduced to verified current/wave components and never returned as scores.
 * Public target/future rows remain separate and are evaluated only through
 * scoreStartAt=targetReferenceAt by the existing integrated adapter.
 */
export function buildRavScoreRecoveryReplay({
  part,
  initialState,
  targetReferenceAt,
  sourceRecords = [],
  publicHourly = [],
  nativeCadenceHoldHours = 0,
  nativeCadenceReferenceSample = null,
} = {}) {
  const target = canonicalHour(targetReferenceAt);
  if (!finite(nativeCadenceHoldHours)
    || Number(nativeCadenceHoldHours) < 0
    || Number(nativeCadenceHoldHours) > 3) {
    throw new Error('RavScore recovery native-cadence hold is invalid');
  }
  if (!Array.isArray(publicHourly)) {
    throw new Error('RavScore recovery public rows must be an array');
  }
  const targetMs = Date.parse(target);
  const publicRows = publicHourly
    .map(row => ({ row, time: canonicalHour(row?.time) }))
    .filter(item => Date.parse(item.time) >= targetMs)
    .sort((left, right) => Date.parse(left.time) - Date.parse(right.time));
  for (let index = 1; index < publicRows.length; index += 1) {
    if (publicRows[index].time === publicRows[index - 1].time) {
      failClosed(
        'RAVSCORE_RECOVERY_REPLAY_PUBLIC_DUPLICATE',
        'RavScore recovery public rows contain a duplicate forecast hour',
      );
    }
  }
  if (!publicRows.some(item => Date.parse(item.time) === targetMs)) {
    failClosed(
      'RAVSCORE_RECOVERY_REPLAY_TARGET_MISSING',
      'RavScore recovery replay lacks the exact production target row',
    );
  }
  const canonicalPublicRows = publicRows.map(item => ({ ...item.row, time: item.time }));
  const coldStart = !initialState;
  const stateTime = coldStart
    ? new Date(targetMs - RAVSCORE_COLD_START_REPLAY_HOURS * HOUR_MS).toISOString()
    : canonicalTime(initialState.time, 'RavScore recovery state time');
  const stateMs = Date.parse(stateTime);
  if (!coldStart && stateMs > targetMs) {
    failClosed(
      'RAVSCORE_RECOVERY_REPLAY_FUTURE_STATE',
      'RavScore recovery state is newer than the production target',
    );
  }
  const ageHours = (targetMs - stateMs) / HOUR_MS;
  if (!coldStart && ageHours > RAVSCORE_RECOVERY_REPLAY_MAXIMUM_AGE_HOURS) {
    failClosed(
      'RAVSCORE_RECOVERY_REPLAY_TOO_OLD',
      'RavScore recovery state is outside the bounded continuation horizon',
    );
  }
  const expectedSamplingContextKey = ravScoreSamplingContextKey(part);
  let candidateMigration = null;
  if (!coldStart && initialState.schemaVersion === RAVSCORE_STATE_SCHEMA_VERSION) {
    try {
      assertIntegratedCoastalPointContinuation(initialState, {
        samplingContextKey: expectedSamplingContextKey,
        label: 'RavScore recovery initial continuation',
      });
    } catch {
      failClosed(
        'RAVSCORE_RECOVERY_REPLAY_CONTEXT_MISMATCH',
        'RavScore recovery state has an incompatible model or sampling context',
      );
    }
  } else if (!coldStart) {
    try {
      candidateMigration = validateCandidateGMigrationSource(
        initialState,
        candidateGStateKey(part),
        publicRows[0]?.time ?? target,
      );
      if (!candidateMigration) throw new Error('Candidate G migration source was not accepted');
    } catch {
      failClosed(
        'RAVSCORE_RECOVERY_REPLAY_CANDIDATE_G_INVALID',
        'RavScore recovery Candidate G migration source is incompatible',
      );
    }
  }

  const union = new Map();
  const migrationWaveByTime = new Map();
  const candidateWaveBootstrapTarget = candidateMigration
    ? ravScoreCandidateMigrationWaveBootstrapTargetAt(candidateMigration, target)
    : null;
  const migrationWaveStartMs = candidateMigration
    ? Date.parse(candidateWaveBootstrapTarget)
      - RAVSCORE_RECOVERY_POLICY
        .candidateMigrationWaveApproachReplayHours * HOUR_MS
    : Number.POSITIVE_INFINITY;
  const migrationWaveEndMs = candidateMigration
    ? Date.parse(candidateWaveBootstrapTarget) - HOUR_MS
    : Number.NEGATIVE_INFINITY;
  let acceptedSourceRecordCount = 0;
  for (const source of sourceRecords) {
    const record = source?.record;
    if (!record || !Array.isArray(record.hourly)) continue;
    if (!samePoint(record.point, part.waterPoint)) {
      failClosed(
        'RAVSCORE_RECOVERY_REPLAY_SAMPLING_MISMATCH',
        'RavScore recovery source has a different sampling point',
      );
    }
    acceptedSourceRecordCount += 1;
    for (const row of record.hourly) {
      const parsed = Date.parse(row?.time);
      const afterReplayBoundary = coldStart ? parsed >= stateMs : parsed > stateMs;
      const needsReplay = Number.isFinite(parsed)
        && afterReplayBoundary
        && parsed < targetMs;
      const needsMigrationWave = Number.isFinite(parsed)
        && parsed >= migrationWaveStartMs
        && parsed <= migrationWaveEndMs;
      if (!needsReplay && !needsMigrationWave) continue;
      const time = canonicalHour(row.time);
      const current = needsReplay ? currentComponent(row, part) : null;
      const hasCurrentPayload = [
        row?.currentSpeedMps,
        row?.currentDirectionDeg,
        row?.currentUMps,
        row?.currentVMps,
      ].some(finite);
      if (needsReplay && hasCurrentPayload && !current) {
        failClosed(
          'RAVSCORE_RECOVERY_REPLAY_CURRENT_UNVERIFIED',
          'RavScore recovery replay contains current without exact verified provenance',
        );
      }
      const wave = needsReplay || needsMigrationWave ? waveComponent(row, part) : null;
      const hasWavePayload = [
        row?.waveHeightM,
        row?.wavePeriodS,
        row?.waveDirectionDeg,
      ].some(finite);
      if ((needsReplay || needsMigrationWave) && hasWavePayload && !wave) {
        failClosed(
          'RAVSCORE_RECOVERY_REPLAY_WAVE_UNVERIFIED',
          'RavScore recovery replay contains waves without exact verified provenance or direction',
        );
      }
      if (needsMigrationWave) {
        const targetWave = migrationWaveByTime.get(time) ?? {};
        addComponent(targetWave, 'wave', wave);
        migrationWaveByTime.set(time, targetWave);
      }
      if (needsReplay) {
        if (current || wave) {
          const targetRow = union.get(time) ?? {};
          addComponent(targetRow, 'current', current);
          addComponent(targetRow, 'wave', wave);
          union.set(time, targetRow);
        }
      }
    }
  }
  const candidateGCurrentBootstrap = buildCandidateGCurrentMigrationBootstrap({
    part,
    candidateMigration,
  });
  const candidateGWaveApproachBootstrap =
    buildCandidateGWaveApproachMigrationBootstrap({
      part,
      candidateMigration,
      targetReferenceAt: candidateWaveBootstrapTarget,
      waveByTime: migrationWaveByTime,
    });

  let latestVerifiedCurrentAt = (() => {
    if (coldStart) return Number.NEGATIVE_INFINITY;
    const candidates = initialState.currentEvidence ?? initialState.transportEvidence ?? [];
    return [...candidates]
      .filter(item => item?.strength !== null && finite(item?.strength))
      .map(item => Date.parse(item.time))
      .filter(Number.isFinite)
      .sort((left, right) => right - left)[0] ?? Number.NEGATIVE_INFINITY;
  })();
  let nativeHoldAuthorized = initialState?.currentNativeHoldAuthorization !== null
    && initialState?.currentNativeHoldAuthorization !== undefined;
  if (candidateGCurrentBootstrap) {
    nativeHoldAuthorized =
      candidateGCurrentBootstrap.currentNativeHoldAuthorization !== null;
    latestVerifiedCurrentAt = Date.parse(candidateGCurrentBootstrap.currentReferenceAt);
  }
  const replayTimes = [...union.keys()]
    .sort((left, right) => Date.parse(left) - Date.parse(right));
  const firstReplayTime = replayTimes[0] ?? target;
  const boundaryReference = verifiedNativeCadenceBoundaryReference(
    nativeCadenceReferenceSample,
    { firstReplayTime, nativeCadenceHoldHours },
  );
  if (boundaryReference) {
    latestVerifiedCurrentAt = Date.parse(boundaryReference.time);
    nativeHoldAuthorized = true;
  }
  const replayRows = replayTimes.map(time => {
    const row = union.get(time);
    if (row.current) {
      latestVerifiedCurrentAt = Date.parse(time);
      nativeHoldAuthorized =
        row.current.row.currentProvenance?.sourceClass
          === 'owner-approved-regional-proxy';
    }
    const nativeHold = !row.current
      && Number(nativeCadenceHoldHours) > 0
      && nativeHoldAuthorized
      && Number.isFinite(latestVerifiedCurrentAt)
      && (Date.parse(time) - latestVerifiedCurrentAt) / HOUR_MS <= Number(nativeCadenceHoldHours);
    return {
      time,
      ...(row.current?.row ?? {
        currentSpeedMps: null,
        currentDirectionDeg: null,
        currentCoastNormalSpeedMps: null,
        currentProvenance: {
          status: 'unverified',
          reason: nativeHold
            ? 'native-cadence-hold-without-invented-current'
            : 'bounded-unknown-history-interval',
        },
      }),
      ...(row.wave?.row ?? {
        waveHeightM: null,
        wavePeriodS: null,
        waveDirectionDeg: null,
      }),
    };
  });
  const completeCausalPositionCount = coldStart
    ? replayTimes.filter(time => {
      const row = union.get(time);
      return Boolean(row?.current && row?.wave);
    }).length
    : null;
  const boundedUnknownPositionCount = coldStart
    ? RAVSCORE_COLD_START_REPLAY_HOURS - completeCausalPositionCount
    : null;
  const coldStartHistoryLineage = coldStart ? {
    recoveryId: RAVSCORE_RECOVERY_POLICY.id,
    expectedCausalPositionCount: RAVSCORE_COLD_START_REPLAY_HOURS,
    completeCausalPositionCount,
    boundedUnknownPositionCount,
    historyTransition: boundedUnknownPositionCount > 0
      ? RAVSCORE_RECOVERY_POLICY.unknownHistoryTransition
      : RAVSCORE_RECOVERY_POLICY.completeHistoryTransition,
    targetReferenceAt: target,
  } : null;

  return {
    hourly: [...replayRows, ...canonicalPublicRows],
    scoreStartAt: target,
    replayedHourCount: replayRows.length,
    sourceRecordCount: acceptedSourceRecordCount,
    coldStartBootstrapApplied: coldStart && boundedUnknownPositionCount === 0,
    coldStartHistoryLineage,
    candidateGCurrentBootstrap,
    candidateGWaveApproachBootstrap,
  };
}
