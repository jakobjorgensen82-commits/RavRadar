import { RAVSCORE_CURRENT_SUPPLY_POLICY } from './ravscore-model-contract.js';
import { canonicalRavScoreTime } from './ravscore-time.js';

const HOURS_TO_MILLISECONDS = 3_600_000;
const TIME_EPSILON_MILLISECONDS = 1;
const NUMBER_EPSILON = 1e-12;

export const CURRENT_SUPPLY_MEMORY_POLICY = RAVSCORE_CURRENT_SUPPLY_POLICY;

function clamp(value, minimum, maximum) {
  return Math.min(maximum, Math.max(minimum, value));
}

function canonicalTime(value) {
  return canonicalRavScoreTime(value);
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
    'expectedEvidenceIntervalHours',
    'maximumGapHours',
    'maximumWindowEvidencePoints',
    'maximumRetainedEvidencePoints',
  ];
  if (!finiteNumber(policy.deadbandNormalSpeedMps)
    || policy.deadbandNormalSpeedMps < 0
    || positiveFields.some(field => !finiteNumber(policy[field]) || policy[field] <= 0)
    || policy.fullStrengthNormalSpeedMps <= policy.deadbandNormalSpeedMps
    || policy.fullWeightHours >= policy.windowHours
    || policy.expectedEvidenceIntervalHours > policy.maximumGapHours
    || policy.boundaryPotential !== 0
    || !Number.isInteger(policy.maximumWindowEvidencePoints)
    || !Number.isInteger(policy.maximumRetainedEvidencePoints)
    || policy.maximumRetainedEvidencePoints < policy.maximumWindowEvidencePoints) {
    throw new Error('Invalid current-supply memory policy');
  }
  return policy;
}

function normalizeNativeHoldIntervalEnds(value, evidence, policy) {
  if (!Array.isArray(value)) return { valid: false, intervalEnds: [] };
  const canonical = value.map(canonicalTime);
  if (canonical.some((time, index) => !time || time !== value[index])) {
    return { valid: false, intervalEnds: [] };
  }
  const intervalEnds = [...new Set(canonical)]
    .sort((left, right) => Date.parse(left) - Date.parse(right));
  if (intervalEnds.length !== value.length
    || intervalEnds.some((time, index) => time !== value[index])) {
    return { valid: false, intervalEnds: [] };
  }
  const byTime = new Map(evidence.map((item, index) => [item.time, index]));
  for (const time of intervalEnds) {
    const index = byTime.get(time);
    const previous = Number.isInteger(index) && index > 0 ? evidence[index - 1] : null;
    const item = Number.isInteger(index) ? evidence[index] : null;
    const gapHours = previous && item
      ? (Date.parse(item.time) - Date.parse(previous.time)) / HOURS_TO_MILLISECONDS
      : Number.NaN;
    if (!finiteNumber(previous?.strength)
      || !finiteNumber(item?.strength)
      || !(gapHours > policy.expectedEvidenceIntervalHours + NUMBER_EPSILON)
      || gapHours > policy.maximumGapHours + NUMBER_EPSILON) {
      return { valid: false, intervalEnds: [] };
    }
  }
  return { valid: true, intervalEnds };
}

function retainedNativeHoldIntervalEnds(intervalEnds, evidence) {
  const retainedIndexByTime = new Map(
    evidence.map((item, index) => [item.time, index]),
  );
  return intervalEnds.filter(time => {
    const index = retainedIndexByTime.get(time);
    return Number.isInteger(index) && index > 0;
  });
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
  {
    referenceTime,
    nativeHoldIntervalEnds = [],
    ...policyOverrides
  } = {},
) {
  const policy = resolvePolicy(policyOverrides);
  const reference = canonicalTime(referenceTime);
  if (!reference) throw new Error('Current-supply replay requires a valid referenceTime');
  const normalized = normalizeEvidence(evidence);
  if (!normalized.valid || normalized.evidence.some(item => item.strength === null)) {
    throw new Error('Current-supply replay requires valid verified signed evidence');
  }
  const nativeIntervals = normalizeNativeHoldIntervalEnds(
    nativeHoldIntervalEnds,
    normalized.evidence,
    policy,
  );
  if (!nativeIntervals.valid) {
    throw new Error('Current-supply native-hold interval proof is invalid');
  }
  const nativeIntervalEndSet = new Set(nativeIntervals.intervalEnds);
  const referenceMs = Date.parse(reference);
  if (normalized.evidence.some(item => Date.parse(item.time) > referenceMs)) {
    throw new Error('Current-supply replay cannot use future evidence');
  }
  const boundaryMs = referenceMs - policy.windowHours * HOURS_TO_MILLISECONDS;
  const boundaryTime = new Date(boundaryMs).toISOString();
  for (let index = 0; index < normalized.evidence.length; index += 1) {
    const item = normalized.evidence[index];
    const endMs = Date.parse(item.time);
    if (endMs <= boundaryMs) continue;
    const previous = index > 0 ? normalized.evidence[index - 1] : null;
    const previousMs = Date.parse(previous?.time ?? '');
    const clippedStartMs = Math.max(
      boundaryMs,
      Number.isFinite(previousMs) ? previousMs : boundaryMs,
    );
    const unknownEndMs =
      endMs - policy.expectedEvidenceIntervalHours * HOURS_TO_MILLISECONDS;
    if (unknownEndMs > clippedStartMs + TIME_EPSILON_MILLISECONDS
      && !nativeIntervalEndSet.has(item.time)) {
      throw new Error('Current-supply replay cannot cross an unattested evidence gap');
    }
  }
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

function applyBoundedSupplyRate(value, rate, weightedDurationHours) {
  return clamp(value + rate * weightedDurationHours, 0, 100);
}

/**
 * Builds an enclosing score-time view over the unchanged 48-hour current
 * kernel. Verified intervals use the ordinary signed +10/-8 transition. An
 * interval whose evidence is missing or discontinuous is not filled: its
 * lower track receives the strongest allowed outbound rate and its upper
 * track the strongest allowed inbound rate. Both tracks start at the same
 * fixed zero boundary as the point model.
 *
 * This is deliberately a score view, not continuation state. It retains no
 * raw current values and never turns a missing score-hour current into an
 * available result. A bounded, explicitly authorised native-cadence hold may
 * use its real earlier native reference without inventing an interval.
 */
export function buildCurrentSupplyScoreBounds(
  evidence,
  {
    referenceTime,
    nativeHold = false,
    nativeHoldIntervalEnds = [],
    ...policyOverrides
  } = {},
) {
  const policy = resolvePolicy(policyOverrides);
  const requestedReference = canonicalTime(referenceTime);
  if (!requestedReference) {
    throw new Error('Current-supply score bounds require a valid referenceTime');
  }
  if (typeof nativeHold !== 'boolean') {
    throw new Error('nativeHold must be an explicit boolean');
  }
  const requestedReferenceMs = Date.parse(requestedReference);
  const normalized = normalizeEvidence(evidence);
  const baseUnavailable = (reason, fields = {}) => ({
    available: false,
    quality: 'UNAVAILABLE',
    reason,
    referenceTime: requestedReference,
    requestedReferenceTime: requestedReference,
    windowHours: policy.windowHours,
    coverageHours: 0,
    unknownHours: policy.windowHours,
    lowerPotential: null,
    upperPotential: null,
    modelUncertaintyPotentialPoints: null,
    reasonCodes: [reason],
    intervals: [],
    ...fields,
  });
  if (!normalized.valid) return baseUnavailable('CURRENT_EVIDENCE_INVALID');
  const nativeIntervals = normalizeNativeHoldIntervalEnds(
    nativeHoldIntervalEnds,
    normalized.evidence,
    policy,
  );
  if (!nativeIntervals.valid) {
    throw new Error('Current-supply native-hold interval proof is invalid');
  }
  const nativeIntervalEndSet = new Set(nativeIntervals.intervalEnds);
  if (normalized.evidence.some(item => Date.parse(item.time) > requestedReferenceMs)) {
    return baseUnavailable('CURRENT_EVIDENCE_AFTER_REFERENCE');
  }
  const latest = normalized.evidence.at(-1) ?? null;
  if (!latest || !finiteNumber(latest.strength)) {
    return baseUnavailable('CURRENT_DIRECT_INPUT_MISSING');
  }
  const latestMs = Date.parse(latest.time);
  const latestAgeHours = (requestedReferenceMs - latestMs) / HOURS_TO_MILLISECONDS;
  if (latestAgeHours > NUMBER_EPSILON
    && (nativeHold !== true
      || latestAgeHours > policy.maximumGapHours + NUMBER_EPSILON)) {
    return baseUnavailable('CURRENT_DIRECT_INPUT_MISSING', {
      latestEvidenceAgeHours: latestAgeHours,
    });
  }

  // The authorised native hold evaluates the exact native reference. It adds
  // neither movement nor kernel ageing between that reference and score time.
  const reference = latestAgeHours > NUMBER_EPSILON ? latest.time : requestedReference;
  const referenceMs = Date.parse(reference);
  const boundaryMs = referenceMs - policy.windowHours * HOURS_TO_MILLISECONDS;
  const boundaryTime = new Date(boundaryMs).toISOString();
  const causal = normalized.evidence
    .filter(item => Date.parse(item.time) <= referenceMs);
  const beforeOrAtBoundary = causal
    .filter(item => Date.parse(item.time) <= boundaryMs)
    .at(-1) ?? null;
  const inWindow = causal
    .filter(item => Date.parse(item.time) > boundaryMs);

  let lowerPotential = policy.boundaryPotential;
  let upperPotential = policy.boundaryPotential;
  let coverageHours = 0;
  let unknownHours = 0;
  let previous = beforeOrAtBoundary;
  let cursorMs = boundaryMs;
  const reasonCodes = new Set();
  const intervals = [];

  const applyInterval = ({
    intervalStart,
    intervalEnd,
    strength,
    verified,
    reasonCode = null,
    nativeHoldAttested = false,
  }) => {
    const durationHours = (
      Date.parse(intervalEnd) - Date.parse(intervalStart)
    ) / HOURS_TO_MILLISECONDS;
    if (!(durationHours > NUMBER_EPSILON)) return;
    const weightedDurationHours = currentSupplyWeightedDuration({
      intervalStart,
      intervalEnd,
      referenceTime: reference,
    }, policyOverrides);
    const lowerBefore = lowerPotential;
    const upperBefore = upperPotential;
    if (verified) {
      const rate = currentSupplyRate(strength, policyOverrides);
      lowerPotential = applyBoundedSupplyRate(lowerPotential, rate, weightedDurationHours);
      upperPotential = applyBoundedSupplyRate(upperPotential, rate, weightedDurationHours);
      coverageHours += durationHours;
    } else {
      lowerPotential = applyBoundedSupplyRate(
        lowerPotential,
        -policy.outboundPointsPerEffectiveHour,
        weightedDurationHours,
      );
      upperPotential = applyBoundedSupplyRate(
        upperPotential,
        policy.inboundPointsPerEffectiveHour,
        weightedDurationHours,
      );
      unknownHours += durationHours;
      if (reasonCode) reasonCodes.add(reasonCode);
    }
    intervals.push({
      intervalStart,
      intervalEnd,
      evidenceStatus: verified ? 'VERIFIED' : 'UNKNOWN',
      strength: verified ? strength : null,
      durationHours,
      weightedDurationHours,
      nativeHoldAttested,
      lowerPotentialBefore: lowerBefore,
      upperPotentialBefore: upperBefore,
      lowerPotential,
      upperPotential,
    });
  };

  for (const item of inWindow) {
    const endMs = Date.parse(item.time);
    if (endMs <= cursorMs) {
      previous = item;
      continue;
    }
    const intervalStart = new Date(cursorMs).toISOString();
    const intervalEnd = item.time;
    const durationHours = (endMs - cursorMs) / HOURS_TO_MILLISECONDS;
    const evidenceGapHours = previous === null
      ? Number.POSITIVE_INFINITY
      : (endMs - Date.parse(previous.time)) / HOURS_TO_MILLISECONDS;
    const nativeHoldAttested = nativeIntervalEndSet.has(item.time);
    const verified = finiteNumber(item.strength)
      && previous !== null
      && evidenceGapHours > 0
      && (evidenceGapHours <= policy.expectedEvidenceIntervalHours + NUMBER_EPSILON
        || nativeHoldAttested);
    if (verified) {
      applyInterval({
        intervalStart,
        intervalEnd,
        strength: item.strength,
        verified: true,
        nativeHoldAttested,
      });
    } else if (finiteNumber(item.strength) && previous !== null) {
      // The newer hourly sample describes at most its own expected final
      // interval. Missing expected positions before it remain unknown; the
      // newer value is never borrowed backwards across that hole.
      const verifiedStartMs = Math.max(
        cursorMs,
        endMs - policy.expectedEvidenceIntervalHours * HOURS_TO_MILLISECONDS,
      );
      const verifiedStart = new Date(verifiedStartMs).toISOString();
      applyInterval({
        intervalStart,
        intervalEnd: verifiedStart,
        strength: null,
        verified: false,
        reasonCode: 'CURRENT_HISTORY_TIME_GAP',
      });
      applyInterval({
        intervalStart: verifiedStart,
        intervalEnd,
        strength: item.strength,
        verified: true,
      });
    } else {
      let reasonCode;
      if (item.strength === null) {
        reasonCode = 'CURRENT_HISTORY_MISSING_EVIDENCE';
      } else if (previous === null) {
        reasonCode = 'CURRENT_HISTORY_BOUNDARY_UNCOVERED';
      } else {
        reasonCode = 'CURRENT_HISTORY_TIME_GAP';
      }
      applyInterval({
        intervalStart,
        intervalEnd,
        strength: null,
        verified: false,
        reasonCode,
      });
    }
    cursorMs = endMs;
    previous = item;
  }

  // With direct input present, an uncovered tail should only be reachable for
  // malformed ordering. Keep it explicit and enclosing rather than silently
  // carrying the last strength to the score time.
  if (cursorMs < referenceMs) {
    const intervalStart = new Date(cursorMs).toISOString();
    const intervalEnd = reference;
    const durationHours = (referenceMs - cursorMs) / HOURS_TO_MILLISECONDS;
    const weightedDurationHours = currentSupplyWeightedDuration({
      intervalStart,
      intervalEnd,
      referenceTime: reference,
    }, policyOverrides);
    const lowerBefore = lowerPotential;
    const upperBefore = upperPotential;
    lowerPotential = applyBoundedSupplyRate(
      lowerPotential,
      -policy.outboundPointsPerEffectiveHour,
      weightedDurationHours,
    );
    upperPotential = applyBoundedSupplyRate(
      upperPotential,
      policy.inboundPointsPerEffectiveHour,
      weightedDurationHours,
    );
    unknownHours += durationHours;
    reasonCodes.add('CURRENT_HISTORY_TAIL_UNCOVERED');
    intervals.push({
      intervalStart,
      intervalEnd,
      evidenceStatus: 'UNKNOWN',
      strength: null,
      durationHours,
      weightedDurationHours,
      lowerPotentialBefore: lowerBefore,
      upperPotentialBefore: upperBefore,
      lowerPotential,
      upperPotential,
    });
  }

  const fullHistory = unknownHours <= NUMBER_EPSILON
    && Math.abs(coverageHours - policy.windowHours) <= NUMBER_EPSILON;
  return {
    available: true,
    quality: fullHistory ? 'FULL_HISTORY' : 'HISTORY_INCOMPLETE',
    reason: null,
    referenceTime: reference,
    requestedReferenceTime: requestedReference,
    boundaryTime,
    windowHours: policy.windowHours,
    coverageHours,
    unknownHours,
    latestEvidenceAgeHours: latestAgeHours,
    nativeHoldHours: latestAgeHours > NUMBER_EPSILON ? latestAgeHours : 0,
    lowerPotential,
    upperPotential,
    modelUncertaintyPotentialPoints: upperPotential - lowerPotential,
    reasonCodes: [...reasonCodes],
    intervals,
  };
}

function unavailableResult({
  status,
  reference,
  requestedReference = reference,
  boundaryTime,
  evidence = [],
  nativeHoldIntervalEnds = [],
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
    nativeHoldIntervalEnds,
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
  {
    referenceTime,
    nativeHold = false,
    nativeHoldIntervalEnds = [],
    ...policyOverrides
  } = {},
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
  const nativeIntervals = normalizeNativeHoldIntervalEnds(
    nativeHoldIntervalEnds,
    normalized.evidence,
    policy,
  );
  if (!nativeIntervals.valid) {
    return earlyFail({ status: 'INVALID_NATIVE_HOLD_INTERVALS' });
  }
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
  const retainedIntervalEnds = retainedNativeHoldIntervalEnds(
    nativeIntervals.intervalEnds,
    retainedEvidence,
  );
  const retainedIntervalEndSet = new Set(retainedIntervalEnds);

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
  if (!first) return fail({
    status: 'WINDOW_INCOMPLETE',
    evidence: retainedEvidence,
    nativeHoldIntervalEnds: retainedIntervalEnds,
  });
  if (retainedEvidence.some(item => item.strength === null)) {
    return fail({
      status: 'WINDOW_HAS_MISSING_EVIDENCE',
      evidence: retainedEvidence,
      nativeHoldIntervalEnds: retainedIntervalEnds,
    });
  }

  const bridgeMs = Date.parse(boundaryBridge?.time ?? '');
  const bridgeGapHours = Number.isFinite(bridgeMs)
    ? (firstMs - bridgeMs) / HOURS_TO_MILLISECONDS
    : Number.POSITIVE_INFINITY;
  const boundaryUnknownHours = startsAtBoundary
    ? 0
    : Math.max(
      0,
      (firstMs - policy.expectedEvidenceIntervalHours * HOURS_TO_MILLISECONDS - boundaryMs)
        / HOURS_TO_MILLISECONDS,
    );
  const boundaryCovered = startsAtBoundary
    || (Number.isFinite(bridgeMs)
      && bridgeMs < boundaryMs
      && bridgeGapHours > 0
      && bridgeGapHours <= policy.maximumGapHours + NUMBER_EPSILON
      && (boundaryUnknownHours <= NUMBER_EPSILON
        || retainedIntervalEndSet.has(first.time)));
  if (!boundaryCovered) {
    return fail({
      status: 'WINDOW_INCOMPLETE',
      evidence: retainedEvidence,
      nativeHoldIntervalEnds: retainedIntervalEnds,
    });
  }

  let maximumObservedGapHours = startsAtBoundary ? 0 : bridgeGapHours;
  let hasUnattestedGap = false;
  for (let index = 1; index < windowEvidence.length; index += 1) {
    const gapHours = (Date.parse(windowEvidence[index].time)
      - Date.parse(windowEvidence[index - 1].time)) / HOURS_TO_MILLISECONDS;
    maximumObservedGapHours = Math.max(maximumObservedGapHours, gapHours);
    if (gapHours > policy.expectedEvidenceIntervalHours + NUMBER_EPSILON
      && !retainedIntervalEndSet.has(windowEvidence[index].time)) {
      hasUnattestedGap = true;
    }
  }
  if (maximumObservedGapHours > policy.maximumGapHours + NUMBER_EPSILON
    || hasUnattestedGap) {
    return fail({
      status: 'WINDOW_HAS_TIME_GAP',
      evidence: retainedEvidence,
      nativeHoldIntervalEnds: retainedIntervalEnds,
      maximumObservedGapHours,
    });
  }

  const latest = windowEvidence.at(-1);
  const latestMs = Date.parse(latest.time);
  if (Math.abs(referenceMs - latestMs) > TIME_EPSILON_MILLISECONDS) {
    return fail({
      status: 'LATEST_SAMPLE_MISSING',
      evidence: retainedEvidence,
      nativeHoldIntervalEnds: retainedIntervalEnds,
      maximumObservedGapHours,
    });
  }
  maximumObservedGapHours = Math.max(maximumObservedGapHours, requestedEvidenceAgeHours);

  const replay = replayCurrentSupplyEvidence(retainedEvidence, {
    referenceTime: reference,
    nativeHoldIntervalEnds: retainedIntervalEnds,
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
    nativeHoldIntervalEnds: retainedIntervalEnds,
    supplyPotential: replay.supplyPotential,
    rows: replay.rows,
  };
}
