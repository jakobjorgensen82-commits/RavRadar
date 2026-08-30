import { RAVSCORE_CURRENT_SUPPLY_POLICY } from './ravscore-model-contract.js';

const HOURS_TO_MILLISECONDS = 3_600_000;
const TIME_EPSILON_MILLISECONDS = 1;
const NUMBER_EPSILON = 1e-12;
const EXPLICIT_TIME_ZONE = /(?:Z|[+-]\d{2}:\d{2})$/i;

export const CURRENT_SUPPLY_MEMORY_POLICY = RAVSCORE_CURRENT_SUPPLY_POLICY;

function clamp(value, minimum, maximum) {
  return Math.min(maximum, Math.max(minimum, value));
}

function canonicalTime(value) {
  if (typeof value !== 'string' || !EXPLICIT_TIME_ZONE.test(value)) {
    return null;
  }
  const milliseconds = new Date(value).getTime();
  return Number.isFinite(milliseconds)
    ? new Date(milliseconds).toISOString()
    : null;
}

function finiteNumber(value) {
  return typeof value === 'number' && Number.isFinite(value);
}

function resolvePolicy(overrides = {}) {
  const policy = {
    ...CURRENT_SUPPLY_MEMORY_POLICY,
    ...overrides,
  };
  const positiveFields = [
    'fullStrengthNormalSpeedMps',
    'inboundPointsPerEffectiveHour',
    'outboundPointsPerEffectiveHour',
    'fullWeightHours',
    'windowHours',
    'maximumGapHours',
    'maximumWindowEvidencePoints',
    'maximumRetainedEvidencePoints',
  ];
  if (!finiteNumber(policy.deadbandNormalSpeedMps)
    || policy.deadbandNormalSpeedMps < 0
    || positiveFields.some(field => !finiteNumber(policy[field]) || policy[field] <= 0)
    || policy.fullStrengthNormalSpeedMps <= policy.deadbandNormalSpeedMps
    || policy.fullWeightHours >= policy.windowHours
    || policy.boundaryPotential !== 0
    || !Number.isInteger(policy.maximumWindowEvidencePoints)
    || !Number.isInteger(policy.maximumRetainedEvidencePoints)
    || policy.maximumRetainedEvidencePoints < policy.maximumWindowEvidencePoints) {
    throw new Error('Invalid current-supply memory policy');
  }
  return policy;
}

function ageHours(value) {
  if (!finiteNumber(value) || value < 0) {
    throw new Error('Current-supply evidence age must be a non-negative finite number');
  }
  return value;
}

/**
 * Reduces a signed, coast-normal current speed to the retained [-1, 1]
 * evidence strength. Positive is toward land; negative is away from land.
 */
export function currentSupplyStrength(normalSpeedMps, overrides = {}) {
  const policy = resolvePolicy(overrides);
  if (!finiteNumber(normalSpeedMps)) return null;
  const magnitude = Math.abs(normalSpeedMps);
  if (magnitude <= policy.deadbandNormalSpeedMps) return 0;
  if (magnitude >= policy.fullStrengthNormalSpeedMps) return Math.sign(normalSpeedMps);
  return Math.sign(normalSpeedMps)
    * (magnitude - policy.deadbandNormalSpeedMps)
    / (policy.fullStrengthNormalSpeedMps - policy.deadbandNormalSpeedMps);
}

/**
 * Produces the only current evidence shape allowed in compact state. It never
 * carries raw vectors, speed, direction, coordinates or public scores.
 */
export function deriveCurrentSupplyEvidence(
  sample,
  {
    getTime = value => value?.time,
    getNormalSpeed = value => value?.coastNormalSpeedMps,
    isVerified = value => value?.verified === true,
    ...policyOverrides
  } = {},
) {
  const time = canonicalTime(getTime(sample));
  if (!time) return null;
  if (isVerified(sample) !== true) return { time, strength: null };
  return {
    time,
    strength: currentSupplyStrength(getNormalSpeed(sample), policyOverrides),
  };
}

export function currentSupplyAgeWeight(age, overrides = {}) {
  const policy = resolvePolicy(overrides);
  const safeAge = ageHours(age);
  if (safeAge <= policy.fullWeightHours) return 1;
  if (safeAge >= policy.windowHours) return 0;
  const taperHours = policy.windowHours - policy.fullWeightHours;
  return 0.5 * (1 + Math.cos(
    Math.PI * (safeAge - policy.fullWeightHours) / taperHours,
  ));
}

/** Exact primitive of currentSupplyAgeWeight from age zero. */
export function currentSupplyAgePrimitive(age, overrides = {}) {
  const policy = resolvePolicy(overrides);
  const safeAge = ageHours(age);
  if (safeAge <= policy.fullWeightHours) return safeAge;
  const taperHours = policy.windowHours - policy.fullWeightHours;
  if (safeAge >= policy.windowHours) {
    return policy.fullWeightHours + (taperHours / 2);
  }
  const taperAge = safeAge - policy.fullWeightHours;
  return policy.fullWeightHours
    + (taperAge / 2)
    + (taperHours / (2 * Math.PI))
      * Math.sin(Math.PI * taperAge / taperHours);
}

export function currentSupplyWeightedDuration(
  { intervalStart, intervalEnd, referenceTime },
  overrides = {},
) {
  const start = canonicalTime(intervalStart);
  const end = canonicalTime(intervalEnd);
  const reference = canonicalTime(referenceTime);
  if (!start || !end || !reference) {
    throw new Error('Weighted current-supply duration requires valid times');
  }
  const startMs = Date.parse(start);
  const endMs = Date.parse(end);
  const referenceMs = Date.parse(reference);
  if (endMs < startMs || endMs > referenceMs) {
    throw new Error('Weighted current-supply interval must be causal and ordered');
  }
  const olderAgeHours = (referenceMs - startMs) / HOURS_TO_MILLISECONDS;
  const newerAgeHours = (referenceMs - endMs) / HOURS_TO_MILLISECONDS;
  return currentSupplyAgePrimitive(olderAgeHours, overrides)
    - currentSupplyAgePrimitive(newerAgeHours, overrides);
}

export function currentSupplyRate(strength, overrides = {}) {
  const policy = resolvePolicy(overrides);
  if (!finiteNumber(strength) || strength < -1 || strength > 1) {
    throw new Error('Current-supply strength must be finite and between -1 and 1');
  }
  return policy.inboundPointsPerEffectiveHour * Math.max(strength, 0)
    - policy.outboundPointsPerEffectiveHour * Math.max(-strength, 0);
}

function normalizeEvidence(evidence) {
  if (!Array.isArray(evidence)) return { valid: false, evidence: [] };
  const byTime = new Map();
  for (const item of evidence) {
    const time = canonicalTime(item?.time);
    const strength = item?.strength;
    const validStrength = strength === null
      || (finiteNumber(strength) && strength >= -1 && strength <= 1);
    if (!time || !validStrength) return { valid: false, evidence: [] };
    if (byTime.has(time)) {
      const existing = byTime.get(time).strength;
      if (!(existing === strength || (Object.is(existing, -0) && Object.is(strength, 0))
        || (Object.is(existing, 0) && Object.is(strength, -0)))) {
        return { valid: false, evidence: [] };
      }
      continue;
    }
    byTime.set(time, { time, strength: strength === 0 ? 0 : strength });
  }
  return {
    valid: true,
    evidence: [...byTime.values()]
      .sort((left, right) => Date.parse(left.time) - Date.parse(right.time)),
  };
}

/**
 * Replays already-derived evidence chronologically from the fixed zero
 * boundary. The strength at the newer native sample describes the preceding
 * verified interval, matching the causal forecast-sample convention.
 */
export function replayCurrentSupplyEvidence(
  evidence,
  { referenceTime, ...policyOverrides } = {},
) {
  const policy = resolvePolicy(policyOverrides);
  const reference = canonicalTime(referenceTime);
  if (!reference) throw new Error('Current-supply replay requires a valid referenceTime');
  const normalized = normalizeEvidence(evidence);
  if (!normalized.valid || normalized.evidence.some(item => item.strength === null)) {
    throw new Error('Current-supply replay requires valid verified signed evidence');
  }
  const referenceMs = Date.parse(reference);
  if (normalized.evidence.some(item => Date.parse(item.time) > referenceMs)) {
    throw new Error('Current-supply replay cannot use future evidence');
  }
  const boundaryMs = referenceMs - policy.windowHours * HOURS_TO_MILLISECONDS;
  const boundaryTime = new Date(boundaryMs).toISOString();
  let supplyPotential = policy.boundaryPotential;
  let previousEndMs = boundaryMs;
  const rows = [];

  for (const item of normalized.evidence) {
    const endMs = Date.parse(item.time);
    if (endMs < boundaryMs) continue;
    const startMs = Math.max(boundaryMs, previousEndMs);
    if (endMs < startMs) continue;
    const weightedDurationHours = currentSupplyWeightedDuration({
      intervalStart: new Date(startMs).toISOString(),
      intervalEnd: item.time,
      referenceTime: reference,
    }, policyOverrides);
    const ratePointsPerWeightedHour = currentSupplyRate(item.strength, policyOverrides);
    const previousSupplyPotential = supplyPotential;
    const unclampedPotential = previousSupplyPotential
      + weightedDurationHours * ratePointsPerWeightedHour;
    supplyPotential = clamp(unclampedPotential, 0, 100);
    rows.push({
      intervalStart: new Date(startMs).toISOString(),
      time: item.time,
      strength: item.strength,
      olderAgeHours: (referenceMs - startMs) / HOURS_TO_MILLISECONDS,
      newerAgeHours: (referenceMs - endMs) / HOURS_TO_MILLISECONDS,
      weightedDurationHours,
      ratePointsPerWeightedHour,
      previousSupplyPotential,
      unclampedPotential,
      supplyPotential,
    });
    previousEndMs = endMs;
  }
  return {
    boundaryTime,
    boundaryPotential: policy.boundaryPotential,
    supplyPotential,
    rows,
  };
}

function unavailableResult({
  status,
  reference,
  requestedReference = reference,
  boundaryTime,
  evidence = [],
  maximumObservedGapHours = null,
  latestEvidenceAgeHours = null,
  coverageHours = 0,
  windowHours = CURRENT_SUPPLY_MEMORY_POLICY.windowHours,
}) {
  return {
    memoryReady: false,
    status,
    referenceTime: reference,
    requestedReferenceTime: requestedReference,
    boundaryTime,
    windowHours,
    coverageHours,
    maximumObservedGapHours,
    latestEvidenceAgeHours,
    nativeHoldHours: null,
    evidence,
    supplyPotential: null,
    rows: [],
  };
}

/**
 * Validates a complete 48-hour current-evidence chain and returns a compact,
 * replayed supply memory. `nativeHold` must be explicitly true to bridge from
 * the newest real sample to the reference, and that bridge never adds a
 * transport interval.
 */
export function buildCurrentSupplyMemory(
  evidence,
  { referenceTime, nativeHold = false, ...policyOverrides } = {},
) {
  const policy = resolvePolicy(policyOverrides);
  const requestedReference = canonicalTime(referenceTime);
  if (!requestedReference) throw new Error('Current-supply memory requires a valid referenceTime');
  if (typeof nativeHold !== 'boolean') {
    throw new Error('nativeHold must be an explicit boolean');
  }
  const requestedReferenceMs = Date.parse(requestedReference);
  const normalized = normalizeEvidence(evidence);
  const requestedBoundaryTime = new Date(
    requestedReferenceMs - policy.windowHours * HOURS_TO_MILLISECONDS,
  ).toISOString();
  const earlyFail = fields => unavailableResult({
    reference: requestedReference,
    requestedReference,
    boundaryTime: requestedBoundaryTime,
    windowHours: policy.windowHours,
    ...fields,
  });
  if (!normalized.valid) return earlyFail({ status: 'INVALID_EVIDENCE' });
  if (normalized.evidence.some(item => Date.parse(item.time) > requestedReferenceMs)) {
    return earlyFail({ status: 'EVIDENCE_AFTER_REFERENCE' });
  }
  const latestRequestedEvidence = normalized.evidence.at(-1) ?? null;
  if (!latestRequestedEvidence) return earlyFail({ status: 'WINDOW_INCOMPLETE' });
  const requestedEvidenceAgeHours = (requestedReferenceMs
    - Date.parse(latestRequestedEvidence.time)) / HOURS_TO_MILLISECONDS;
  if (requestedEvidenceAgeHours > policy.maximumGapHours + NUMBER_EPSILON) {
    return earlyFail({
      status: 'LATEST_SAMPLE_GAP',
      latestEvidenceAgeHours: requestedEvidenceAgeHours,
      maximumObservedGapHours: requestedEvidenceAgeHours,
    });
  }
  const usesNativeHold = requestedEvidenceAgeHours > NUMBER_EPSILON;
  if (usesNativeHold && nativeHold !== true) {
    return earlyFail({
      status: 'LATEST_SAMPLE_MISSING',
      latestEvidenceAgeHours: requestedEvidenceAgeHours,
      maximumObservedGapHours: requestedEvidenceAgeHours,
    });
  }

  // A documented native hold reuses the newest real reference exactly. The
  // score time may advance, but neither a movement interval nor kernel ageing
  // is invented between the native sample and the requested time.
  const reference = usesNativeHold ? latestRequestedEvidence.time : requestedReference;
  const referenceMs = Date.parse(reference);
  const boundaryMs = referenceMs - policy.windowHours * HOURS_TO_MILLISECONDS;
  const boundaryTime = new Date(boundaryMs).toISOString();
  const fail = fields => unavailableResult({
    reference,
    requestedReference,
    boundaryTime,
    windowHours: policy.windowHours,
    latestEvidenceAgeHours: requestedEvidenceAgeHours,
    ...fields,
  });

  const beforeBoundary = normalized.evidence
    .filter(item => Date.parse(item.time) < boundaryMs);
  const boundaryBridge = beforeBoundary.at(-1) ?? null;
  const windowEvidence = normalized.evidence
    .filter(item => Date.parse(item.time) >= boundaryMs
      && Date.parse(item.time) <= referenceMs);
  const first = windowEvidence[0] ?? null;
  const firstMs = Date.parse(first?.time ?? '');
  const startsAtBoundary = Number.isFinite(firstMs)
    && Math.abs(firstMs - boundaryMs) <= TIME_EPSILON_MILLISECONDS;
  const retainedEvidence = startsAtBoundary
    ? windowEvidence
    : boundaryBridge
      ? [boundaryBridge, ...windowEvidence]
      : windowEvidence;

  // The legacy rollback state can represent at most 49 signed evidence rows.
  // The bridge is a real continuity proof but contributes no transport
  // interval before the 48-hour boundary. If bridge + window needs 50 rows,
  // neither deleting an observed in-window row nor inventing an exact-boundary
  // row would preserve both evidence and the integral. Keep the evidence
  // untouched and make this state unavailable instead.
  if (windowEvidence.length > policy.maximumWindowEvidencePoints
    || retainedEvidence.length > policy.maximumRetainedEvidencePoints) {
    return fail({ status: 'EVIDENCE_LIMIT_EXCEEDED' });
  }
  if (!first) return fail({ status: 'WINDOW_INCOMPLETE', evidence: retainedEvidence });
  if (retainedEvidence.some(item => item.strength === null)) {
    return fail({ status: 'WINDOW_HAS_MISSING_EVIDENCE', evidence: retainedEvidence });
  }

  const bridgeMs = Date.parse(boundaryBridge?.time ?? '');
  const bridgeGapHours = Number.isFinite(bridgeMs)
    ? (firstMs - bridgeMs) / HOURS_TO_MILLISECONDS
    : Number.POSITIVE_INFINITY;
  const boundaryCovered = startsAtBoundary
    || (Number.isFinite(bridgeMs)
      && bridgeMs < boundaryMs
      && bridgeGapHours > 0
      && bridgeGapHours <= policy.maximumGapHours + NUMBER_EPSILON);
  if (!boundaryCovered) {
    return fail({ status: 'WINDOW_INCOMPLETE', evidence: retainedEvidence });
  }

  let maximumObservedGapHours = startsAtBoundary ? 0 : bridgeGapHours;
  for (let index = 1; index < windowEvidence.length; index += 1) {
    const gapHours = (Date.parse(windowEvidence[index].time)
      - Date.parse(windowEvidence[index - 1].time)) / HOURS_TO_MILLISECONDS;
    maximumObservedGapHours = Math.max(maximumObservedGapHours, gapHours);
  }
  if (maximumObservedGapHours > policy.maximumGapHours + NUMBER_EPSILON) {
    return fail({
      status: 'WINDOW_HAS_TIME_GAP',
      evidence: retainedEvidence,
      maximumObservedGapHours,
    });
  }

  const latest = windowEvidence.at(-1);
  const latestMs = Date.parse(latest.time);
  if (Math.abs(referenceMs - latestMs) > TIME_EPSILON_MILLISECONDS) {
    return fail({
      status: 'LATEST_SAMPLE_MISSING',
      evidence: retainedEvidence,
      maximumObservedGapHours,
    });
  }
  maximumObservedGapHours = Math.max(maximumObservedGapHours, requestedEvidenceAgeHours);

  const replay = replayCurrentSupplyEvidence(retainedEvidence, {
    referenceTime: reference,
    ...policyOverrides,
  });
  return {
    memoryReady: true,
    status: usesNativeHold ? 'READY_NATIVE_HOLD' : 'READY',
    referenceTime: reference,
    requestedReferenceTime: requestedReference,
    boundaryTime,
    windowHours: policy.windowHours,
    coverageHours: policy.windowHours,
    maximumObservedGapHours,
    latestEvidenceAgeHours: requestedEvidenceAgeHours,
    nativeHoldHours: usesNativeHold ? requestedEvidenceAgeHours : 0,
    evidence: retainedEvidence,
    supplyPotential: replay.supplyPotential,
    rows: replay.rows,
  };
}
