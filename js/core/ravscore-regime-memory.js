const EPSILON = 1e-12;

function finiteNumber(value, fallback = 0) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
}

function clamp(value, minimum, maximum) {
  return Math.min(maximum, Math.max(minimum, value));
}

export function signedDirectionalForce({ magnitude, alignment, power = 1 } = {}) {
  const safeMagnitude = Math.max(0, finiteNumber(magnitude));
  const safeAlignment = clamp(finiteNumber(alignment), -1, 1);
  const safePower = Math.max(0, finiteNumber(power, 1));
  return (safeMagnitude ** safePower) * safeAlignment;
}

export const CURRENT_TRANSPORT_POTENTIAL_PRIOR = Object.freeze({
  deadbandNormalSpeedMps: 0.05,
  fullStrengthNormalSpeedMps: 0.20,
  inboundPointsPerEffectiveHour: 10,
  outboundPointsPerEffectiveHour: 8,
  exhaustedAfterEffectiveHours: 13,
  preExhaustionMaximumLossPoints: 96,
  neutralPassiveHalfLifeHours: null,
});

export const CURRENT_TRANSPORT_POTENTIAL_RECOMMENDED_RESEARCH_PROFILE = Object.freeze({
  deadbandNormalSpeedMps: 0.03,
  fullStrengthNormalSpeedMps: 0.15,
  inboundPointsPerEffectiveHour: 10,
  outboundPointsPerEffectiveHour: 8,
  exhaustedAfterEffectiveHours: 13,
  preExhaustionMaximumLossPoints: 96,
  neutralPassiveHalfLifeHours: null,
});

export const CURRENT_TRANSPORT_POTENTIAL_CONTINUATION_POLICY =
  'CARRY_FORWARD_BOUNDED_DERIVED_CURRENT_EVIDENCE';

export const CURRENT_TRANSPORT_BOUNDED_MEMORY_POLICY = Object.freeze({
  windowHours: 48,
  // Production advances the common verified coastal-current reference on the
  // native three-hour marine cadence. The replay already integrates by the
  // actual elapsed time, so accepting up to one native step preserves the
  // +10/-8 effective-hour physics without inventing intermediate samples.
  // A missed native step (>3 h) remains a real gap and fails closed.
  maximumGapHours: 3,
  boundaryPotential: 0,
  evidenceSemantics: 'DERIVED_COAST_NORMAL_STRENGTH_ONLY',
});

function canonicalTime(value) {
  const time = new Date(value);
  return Number.isFinite(time.getTime()) ? time.toISOString() : null;
}

/**
 * Reduces one verified current sample to a data-minimised, coast-relative
 * transport strength. Positive values are inward, negative values are outward,
 * zero is verified neutral and null is explicitly unverified/missing.
 *
 * The result deliberately contains no raw speed, direction, U/V component,
 * coordinate or coastal-part identifier and is therefore safe to retain in the
 * compact Candidate G continuation state.
 */
export function deriveCurrentTransportEvidence(
  sample,
  {
    deadbandNormalSpeedMps = CURRENT_TRANSPORT_POTENTIAL_RECOMMENDED_RESEARCH_PROFILE.deadbandNormalSpeedMps,
    fullStrengthNormalSpeedMps = CURRENT_TRANSPORT_POTENTIAL_RECOMMENDED_RESEARCH_PROFILE.fullStrengthNormalSpeedMps,
    getTime = value => value?.time,
    getSpeed = value => value?.currentSpeedMps,
    getAlignment = value => value?.currentAlignment,
    isVerified = value => value?.currentVerified === true,
  } = {},
) {
  const time = canonicalTime(getTime(sample));
  if (!time) return null;
  if (isVerified(sample) !== true) return { time, strength: null };
  const rawSpeed = getSpeed(sample);
  const rawAlignment = getAlignment(sample);
  if (rawSpeed === null || rawSpeed === undefined || rawSpeed === '' || typeof rawSpeed === 'boolean'
    || rawAlignment === null || rawAlignment === undefined || rawAlignment === '' || typeof rawAlignment === 'boolean'
    || !Number.isFinite(Number(rawSpeed)) || !Number.isFinite(Number(rawAlignment))) {
    return { time, strength: null };
  }
  const speed = Math.max(0, Number(rawSpeed));
  const alignment = clamp(Number(rawAlignment), -1, 1);
  const inboundStrength = normalCurrentStrength(speed * Math.max(0, alignment), {
    deadbandNormalSpeedMps,
    fullStrengthNormalSpeedMps,
  });
  const outboundStrength = normalCurrentStrength(speed * Math.max(0, -alignment), {
    deadbandNormalSpeedMps,
    fullStrengthNormalSpeedMps,
  });
  return {
    time,
    strength: clamp(inboundStrength - outboundStrength, -1, 1),
  };
}

function normalizedTransportEvidence(evidence, referenceTime, windowHours) {
  const referenceMs = Date.parse(referenceTime);
  const cutoffMs = referenceMs - (windowHours * 3_600_000);
  const byTime = new Map();
  for (const item of Array.isArray(evidence) ? evidence : []) {
    const time = canonicalTime(item?.time);
    if (!time) continue;
    const timeMs = Date.parse(time);
    if (timeMs < cutoffMs || timeMs > referenceMs || byTime.has(time)) continue;
    const strength = item?.strength === null
      ? null
      : clamp(finiteNumber(item?.strength, Number.NaN), -1, 1);
    if (strength === null || Number.isFinite(strength)) byTime.set(time, { time, strength });
  }
  return [...byTime.values()].sort((left, right) => Date.parse(left.time) - Date.parse(right.time));
}

function continuousVerifiedSuffix(evidence, maximumGapHours) {
  const suffix = [];
  for (let index = evidence.length - 1; index >= 0; index -= 1) {
    const item = evidence[index];
    if (!Number.isFinite(item?.strength)) break;
    if (suffix.length) {
      const next = suffix[0];
      const gapHours = (Date.parse(next.time) - Date.parse(item.time)) / 3_600_000;
      if (!(gapHours > 0 && gapHours <= maximumGapHours + EPSILON)) break;
    }
    suffix.unshift(item);
  }
  return suffix;
}

/**
 * Replays a fixed trailing window from a fixed zero boundary. The boundary is
 * "no documented inward transport before this recent-evidence window"; it is
 * not evidence of offshore removal and cannot by itself trigger the separate
 * thirteen-hour outflow gate.
 *
 * Until the window is complete the returned result is explicitly provisional.
 * Missing evidence splits the usable suffix and keeps memoryReady false, so a
 * data gap is never silently treated as neutral current.
 */
export function buildBoundedCurrentTransportMemory(
  evidence,
  {
    referenceTime,
    windowHours = CURRENT_TRANSPORT_BOUNDED_MEMORY_POLICY.windowHours,
    maximumGapHours = CURRENT_TRANSPORT_BOUNDED_MEMORY_POLICY.maximumGapHours,
    boundaryPotential = CURRENT_TRANSPORT_BOUNDED_MEMORY_POLICY.boundaryPotential,
    ...profile
  } = {},
) {
  const reference = canonicalTime(referenceTime);
  const safeWindowHours = finiteNumber(windowHours, Number.NaN);
  const safeMaximumGapHours = finiteNumber(maximumGapHours, Number.NaN);
  const safeBoundaryPotential = finiteNumber(boundaryPotential, Number.NaN);
  if (!reference) throw new Error('bounded current transport memory requires a valid referenceTime');
  if (!(safeWindowHours > 0 && safeMaximumGapHours > 0)) {
    throw new Error('bounded current transport memory requires positive window and gap hours');
  }
  if (safeBoundaryPotential !== 0) {
    throw new Error('bounded current transport memory requires the fixed zero boundary');
  }

  const transportProfile = {
    ...CURRENT_TRANSPORT_POTENTIAL_RECOMMENDED_RESEARCH_PROFILE,
    ...profile,
  };
  const bridgeEvidence = normalizedTransportEvidence(
    evidence,
    reference,
    safeWindowHours + safeMaximumGapHours,
  );
  const retainedEvidence = normalizedTransportEvidence(evidence, reference, safeWindowHours);
  const referenceMs = Date.parse(reference);
  const cutoffMs = referenceMs - (safeWindowHours * 3_600_000);
  const latestAtReference = Date.parse(retainedEvidence.at(-1)?.time ?? '') === referenceMs;
  const firstEvidenceMs = Date.parse(retainedEvidence[0]?.time ?? '');
  const precedingBoundaryEvidence = [...bridgeEvidence]
    .reverse()
    .find(item => Date.parse(item.time) < cutoffMs) ?? null;
  const precedingBoundaryMs = Date.parse(precedingBoundaryEvidence?.time ?? '');
  const boundaryGapHours = Number.isFinite(firstEvidenceMs)
    ? (firstEvidenceMs - cutoffMs) / 3_600_000
    : Number.POSITIVE_INFINITY;
  const startsAtBoundary = Math.abs(boundaryGapHours) <= EPSILON;
  const bridgedAcrossBoundary = Number.isFinite(precedingBoundaryEvidence?.strength)
    && Number.isFinite(precedingBoundaryMs)
    && Number.isFinite(firstEvidenceMs)
    && (cutoffMs - precedingBoundaryMs) / 3_600_000 <= safeMaximumGapHours + EPSILON
    && (firstEvidenceMs - precedingBoundaryMs) / 3_600_000 <= safeMaximumGapHours + EPSILON;
  const startsWithinBoundaryCadence = startsAtBoundary || bridgedAcrossBoundary;
  const containsMissing = retainedEvidence.some(item => !Number.isFinite(item.strength));
  let maximumObservedGapHours = Math.max(0, boundaryGapHours);
  for (let index = 1; index < retainedEvidence.length; index += 1) {
    maximumObservedGapHours = Math.max(
      maximumObservedGapHours,
      (Date.parse(retainedEvidence[index].time) - Date.parse(retainedEvidence[index - 1].time)) / 3_600_000,
    );
  }
  const cadenceComplete = retainedEvidence.length > 1
    && maximumObservedGapHours <= safeMaximumGapHours + EPSILON;
  const memoryReady = latestAtReference
    && startsWithinBoundaryCadence
    && cadenceComplete
    && !containsMissing;
  const suffix = latestAtReference
    ? continuousVerifiedSuffix(retainedEvidence, safeMaximumGapHours)
    : [];
  const deadband = Number(transportProfile.deadbandNormalSpeedMps);
  const fullStrength = Number(transportProfile.fullStrengthNormalSpeedMps);
  const replaySamples = suffix.map(item => {
    const magnitude = Math.abs(item.strength);
    return {
      time: item.time,
      currentSpeedMps: magnitude <= EPSILON
        ? 0
        : deadband + ((fullStrength - deadband) * magnitude),
      currentAlignment: Math.sign(item.strength),
      currentVerified: true,
    };
  });
  const rows = buildCurrentTransportPotential(replaySamples, {
    ...transportProfile,
    initialPotential: safeBoundaryPotential,
    ...(memoryReady ? {
      initialState: {
        time: new Date(cutoffMs).toISOString(),
        transportPotential: safeBoundaryPotential,
        outboundEpisodeEffectiveHours: 0,
      },
    } : {}),
    getTime: sample => sample.time,
    getSpeed: sample => sample.currentSpeedMps,
    getAlignment: sample => sample.currentAlignment,
    isVerified: sample => sample.currentVerified === true,
  });
  const result = rows.at(-1) ?? null;
  const coverageHours = memoryReady
    ? safeWindowHours
    : suffix.length > 1
    ? (Date.parse(suffix.at(-1).time) - Date.parse(suffix[0].time)) / 3_600_000
    : 0;
  let status = 'READY';
  if (!latestAtReference) status = 'LATEST_SAMPLE_MISSING';
  else if (containsMissing) status = 'WINDOW_HAS_MISSING_EVIDENCE';
  else if (!startsWithinBoundaryCadence) status = 'WINDOW_INCOMPLETE';
  else if (!cadenceComplete) status = 'WINDOW_HAS_TIME_GAP';

  return {
    memoryReady,
    status,
    windowHours: safeWindowHours,
    coverageHours,
    maximumObservedGapHours,
    evidence: retainedEvidence,
    rows,
    result,
  };
}

function normalCurrentStrength(normalSpeedMps, {
  deadbandNormalSpeedMps,
  fullStrengthNormalSpeedMps,
}) {
  const safeSpeed = Math.max(0, finiteNumber(normalSpeedMps));
  if (safeSpeed <= deadbandNormalSpeedMps) return 0;
  if (safeSpeed >= fullStrengthNormalSpeedMps) return 1;
  return (safeSpeed - deadbandNormalSpeedMps)
    / (fullStrengthNormalSpeedMps - deadbandNormalSpeedMps);
}

/**
 * Builds the score-neutral, current-led 0-100 transport-potential track.
 *
 * Only the coast-normal current component changes the reservoir. A full-strength
 * inbound hour restores ten points (the existing approximately ten-hour buildup
 * requirement), while a full-strength outbound hour removes the owner-selected
 * eight points. Outbound loss starts immediately, remains continuous for weaker
 * currents, and reaches the explicit owner-selected exhausted state after thirteen
 * effective full-strength hours. Waves are deliberately absent from this state.
 */
export function buildCurrentTransportPotential(
  samples,
  {
    initialPotential = 0,
    initialState = null,
    deadbandNormalSpeedMps = CURRENT_TRANSPORT_POTENTIAL_PRIOR.deadbandNormalSpeedMps,
    fullStrengthNormalSpeedMps = CURRENT_TRANSPORT_POTENTIAL_PRIOR.fullStrengthNormalSpeedMps,
    inboundPointsPerEffectiveHour = CURRENT_TRANSPORT_POTENTIAL_PRIOR.inboundPointsPerEffectiveHour,
    outboundPointsPerEffectiveHour = CURRENT_TRANSPORT_POTENTIAL_PRIOR.outboundPointsPerEffectiveHour,
    exhaustedAfterEffectiveHours = CURRENT_TRANSPORT_POTENTIAL_PRIOR.exhaustedAfterEffectiveHours,
    preExhaustionMaximumLossPoints = CURRENT_TRANSPORT_POTENTIAL_PRIOR.preExhaustionMaximumLossPoints,
    neutralPassiveHalfLifeHours = CURRENT_TRANSPORT_POTENTIAL_PRIOR.neutralPassiveHalfLifeHours,
    getTime = (sample) => sample?.time,
    getSpeed = (sample) => sample?.currentSpeedMps,
    getAlignment = (sample) => sample?.currentAlignment,
    isVerified = () => true,
  } = {},
) {
  const safeDeadband = finiteNumber(deadbandNormalSpeedMps, Number.NaN);
  const safeFullStrength = finiteNumber(fullStrengthNormalSpeedMps, Number.NaN);
  const safeInboundRate = finiteNumber(inboundPointsPerEffectiveHour, Number.NaN);
  const safeOutboundRate = finiteNumber(outboundPointsPerEffectiveHour, Number.NaN);
  const safeExhaustionHours = finiteNumber(exhaustedAfterEffectiveHours, Number.NaN);
  const safePreExhaustionLoss = finiteNumber(preExhaustionMaximumLossPoints, Number.NaN);
  const safeNeutralPassiveHalfLife = neutralPassiveHalfLifeHours === null
    || neutralPassiveHalfLifeHours === undefined
    ? null
    : finiteNumber(neutralPassiveHalfLifeHours, Number.NaN);
  if (!(safeDeadband >= 0 && safeFullStrength > safeDeadband)) {
    throw new Error('current transport potential requires full strength above the deadband');
  }
  if (!(safeInboundRate > 0 && safeOutboundRate > 0 && safeExhaustionHours > 0)) {
    throw new Error('current transport potential requires positive rates and exhaustion hours');
  }
  if (!(safePreExhaustionLoss >= 0 && safePreExhaustionLoss <= 100)) {
    throw new Error('preExhaustionMaximumLossPoints must be between zero and one hundred');
  }
  if (safeNeutralPassiveHalfLife !== null && !(safeNeutralPassiveHalfLife > 0)) {
    throw new Error('neutralPassiveHalfLifeHours must be null or greater than zero');
  }

  const continuation = initialState && typeof initialState === 'object'
    ? initialState
    : null;
  const continuationPotentialValue = continuation?.transportPotential;
  const continuationOutboundHoursValue = continuation?.outboundEpisodeEffectiveHours;
  const continuationPotential = continuation
    ? finiteNumber(continuationPotentialValue, Number.NaN)
    : null;
  const continuationOutboundHours = continuation
    ? finiteNumber(continuationOutboundHoursValue, Number.NaN)
    : null;
  const continuationTime = continuation?.time === null || continuation?.time === undefined
    ? null
    : new Date(continuation.time);
  if (continuation && !(
    continuationPotentialValue !== null
    && continuationPotentialValue !== undefined
    && continuationPotentialValue !== ''
    && typeof continuationPotentialValue !== 'boolean'
    && continuationOutboundHoursValue !== null
    && continuationOutboundHoursValue !== undefined
    && continuationOutboundHoursValue !== ''
    && typeof continuationOutboundHoursValue !== 'boolean'
    && Number.isFinite(continuationPotential)
    && continuationPotential >= 0
    && continuationPotential <= 100
    && Number.isFinite(continuationOutboundHours)
    && continuationOutboundHours >= 0
    && continuationTime
    && Number.isFinite(continuationTime.getTime())
  )) {
    throw new Error('initialState requires a valid time, transportPotential and outboundEpisodeEffectiveHours');
  }

  const ordered = [...(Array.isArray(samples) ? samples : [])]
    .map((sample) => ({
      sample,
      time: new Date(getTime(sample)),
      speed: Math.max(0, finiteNumber(getSpeed(sample))),
      alignment: clamp(finiteNumber(getAlignment(sample)), -1, 1),
      verified: isVerified(sample) === true,
    }))
    .filter((entry) => Number.isFinite(entry.time.getTime()))
    .sort((left, right) => left.time - right.time);
  if (continuation && ordered.some(entry => entry.time < continuationTime)) {
    throw new Error('initialState time must not be later than a continued sample');
  }

  let potential = continuation
    ? continuationPotential
    : clamp(finiteNumber(initialPotential), 0, 100);
  let previousTime = continuation ? continuationTime : null;
  let outboundEpisodeEffectiveHours = continuation ? continuationOutboundHours : 0;
  let outboundEpisodeLossPoints = outboundEpisodeEffectiveHours >= safeExhaustionHours
    ? 100
    : Math.min(safePreExhaustionLoss, safeOutboundRate * outboundEpisodeEffectiveHours);
  if (outboundEpisodeEffectiveHours >= safeExhaustionHours) potential = 0;

  return ordered.map((entry) => {
    const elapsedHours = previousTime
      ? Math.max(0, (entry.time - previousTime) / 3_600_000)
      : 0;
    const inboundNormalSpeedMps = entry.verified
      ? entry.speed * Math.max(0, entry.alignment)
      : 0;
    const outboundNormalSpeedMps = entry.verified
      ? entry.speed * Math.max(0, -entry.alignment)
      : 0;
    const inboundStrength = normalCurrentStrength(inboundNormalSpeedMps, {
      deadbandNormalSpeedMps: safeDeadband,
      fullStrengthNormalSpeedMps: safeFullStrength,
    });
    const outboundStrength = normalCurrentStrength(outboundNormalSpeedMps, {
      deadbandNormalSpeedMps: safeDeadband,
      fullStrengthNormalSpeedMps: safeFullStrength,
    });
    const previousPotential = potential;
    let neutralPassiveDecayPoints = 0;
    let phase = entry.verified ? 'RETAINED_OR_NEUTRAL' : 'UNVERIFIED_PAUSE';

    if (elapsedHours === 0) {
      phase = entry.verified ? 'SAME_TIME_HOLD' : 'UNVERIFIED_PAUSE';
    } else if (outboundStrength > 0) {
      const previousLossPoints = outboundEpisodeLossPoints;
      outboundEpisodeEffectiveHours += elapsedHours * outboundStrength;
      const actualOutboundTransport = outboundEpisodeEffectiveHours >= safeExhaustionHours;
      outboundEpisodeLossPoints = actualOutboundTransport
        ? 100
        : Math.min(safePreExhaustionLoss, safeOutboundRate * outboundEpisodeEffectiveHours);
      potential = clamp(potential - Math.max(0, outboundEpisodeLossPoints - previousLossPoints), 0, 100);
      if (actualOutboundTransport) potential = 0;
      phase = actualOutboundTransport ? 'OUTBOUND_TRANSPORT' : 'OUTBOUND_EROSION';
    } else if (inboundStrength > 0) {
      outboundEpisodeEffectiveHours = 0;
      outboundEpisodeLossPoints = 0;
      potential = clamp(potential + safeInboundRate * elapsedHours * inboundStrength, 0, 100);
      phase = 'INBOUND_BUILDUP';
    } else if (entry.verified && safeNeutralPassiveHalfLife !== null && elapsedHours > 0) {
      const retainedFraction = 2 ** (-elapsedHours / safeNeutralPassiveHalfLife);
      potential = clamp(potential * retainedFraction, 0, 100);
      neutralPassiveDecayPoints = previousPotential - potential;
      phase = neutralPassiveDecayPoints > 0 ? 'PASSIVE_NEUTRAL_DECAY' : phase;
    }

    const actualOutboundTransport = outboundEpisodeEffectiveHours >= safeExhaustionHours;
    previousTime = entry.time;
    return {
      time: entry.time.toISOString(),
      elapsedHours,
      verified: entry.verified,
      speedMps: entry.speed,
      alignment: entry.alignment,
      inboundNormalSpeedMps,
      outboundNormalSpeedMps,
      inboundStrength,
      outboundStrength,
      previousPotential,
      transportPotential: potential,
      outboundEpisodeEffectiveHours,
      outboundEpisodeLossPoints,
      actualOutboundTransport,
      neutralPassiveHalfLifeHours: safeNeutralPassiveHalfLife,
      neutralPassiveDecayPoints,
      phase,
    };
  });
}

export function buildExponentialRegimeMemory(
  samples,
  {
    halfLifeHours,
    initialState = 0,
    getTime = (sample) => sample?.time,
    getForce = (sample) => sample?.force,
  } = {},
) {
  const safeHalfLife = finiteNumber(halfLifeHours);
  if (!(safeHalfLife > 0)) {
    throw new Error("halfLifeHours must be greater than zero");
  }

  const ordered = [...(Array.isArray(samples) ? samples : [])]
    .map((sample) => ({
      sample,
      time: new Date(getTime(sample)),
      force: finiteNumber(getForce(sample)),
    }))
    .filter((entry) => Number.isFinite(entry.time.getTime()))
    .sort((left, right) => left.time - right.time);

  let state = finiteNumber(initialState);
  let previousTime = null;

  return ordered.map((entry) => {
    const elapsedHours = previousTime
      ? Math.max(0, (entry.time - previousTime) / 3_600_000)
      : 1;
    const decay = 2 ** (-elapsedHours / safeHalfLife);
    const previousState = state;
    state = (previousState * decay) + (entry.force * (1 - decay));

    const reversal = previousState * entry.force < 0;
    const reversalStrengthRatio = reversal
      ? Math.abs(entry.force) / Math.max(Math.abs(previousState), EPSILON)
      : null;
    const stateChangeFraction = Math.abs(previousState) > EPSILON
      ? Math.abs(state - previousState) / Math.abs(previousState)
      : null;
    const stateFlipped = reversal && state * previousState <= 0;

    previousTime = entry.time;
    return {
      time: entry.time.toISOString(),
      force: entry.force,
      previousState,
      state,
      elapsedHours,
      reversal,
      reversalStrengthRatio,
      stateChangeFraction,
      stateFlipped,
    };
  });
}

export function buildBlendedRegimeMemory(
  samples,
  {
    activeHalfLifeHours = 24,
    backgroundHalfLifeHours = 48,
    activeWeight = 0.5,
    getTime = (sample) => sample?.time,
    getForce = (sample) => sample?.force,
  } = {},
) {
  const safeActiveWeight = finiteNumber(activeWeight, Number.NaN);
  if (!(safeActiveWeight >= 0 && safeActiveWeight <= 1)) {
    throw new Error("activeWeight must be between zero and one");
  }

  const active = buildExponentialRegimeMemory(samples, {
    halfLifeHours: activeHalfLifeHours,
    getTime,
    getForce,
  });
  const background = buildExponentialRegimeMemory(samples, {
    halfLifeHours: backgroundHalfLifeHours,
    getTime,
    getForce,
  });

  if (active.length !== background.length) {
    throw new Error("active and background memory tracks must have equal length");
  }

  return active.map((activeRecord, index) => {
    const backgroundRecord = background[index];
    if (activeRecord.time !== backgroundRecord?.time) {
      throw new Error("active and background memory tracks must share timestamps");
    }
    const backgroundWeight = 1 - safeActiveWeight;
    return {
      time: activeRecord.time,
      force: activeRecord.force,
      elapsedHours: activeRecord.elapsedHours,
      activeHalfLifeHours,
      backgroundHalfLifeHours,
      activeWeight: safeActiveWeight,
      backgroundWeight,
      activeState: activeRecord.state,
      backgroundState: backgroundRecord.state,
      blendedState: (safeActiveWeight * activeRecord.state)
        + (backgroundWeight * backgroundRecord.state),
      trackSignDisagreement: Math.sign(activeRecord.state) !== 0
        && Math.sign(backgroundRecord.state) !== 0
        && Math.sign(activeRecord.state) !== Math.sign(backgroundRecord.state),
    };
  });
}

export function normalizeMemoryTrackCausally(
  records,
  {
    getState = (record) => record?.blendedState,
    initialScale = 1,
    minimumScale = Number.EPSILON,
  } = {},
) {
  const safeInitialScale = finiteNumber(initialScale, Number.NaN);
  if (!(safeInitialScale > 0)) {
    throw new Error("initialScale must be greater than zero");
  }
  const safeMinimumScale = finiteNumber(minimumScale, Number.NaN);
  if (!(safeMinimumScale > 0)) {
    throw new Error("minimumScale must be greater than zero");
  }
  let priorAbsoluteStateSum = 0;
  let priorStateCount = 0;

  return (Array.isArray(records) ? records : []).map((record) => {
    const state = finiteNumber(getState(record));
    const causalScale = priorStateCount > 0
      ? Math.max(priorAbsoluteStateSum / priorStateCount, safeMinimumScale)
      : Math.max(safeInitialScale, safeMinimumScale);
    const normalizedState = state / causalScale;
    const boundedState = normalizedState / (1 + Math.abs(normalizedState));

    priorAbsoluteStateSum += Math.abs(state);
    priorStateCount += 1;
    return {
      ...record,
      causalScale,
      normalizedState,
      boundedState,
    };
  });
}

export function reversalStrengthClass(ratio) {
  const safeRatio = finiteNumber(ratio, Number.POSITIVE_INFINITY);
  if (safeRatio < 0.5) return "weak-under-half";
  if (safeRatio < 1.5) return "similar-half-to-one-and-half";
  return "strong-over-one-and-half";
}

function percentile(values, probability) {
  const ordered = values.filter(Number.isFinite).sort((left, right) => left - right);
  if (ordered.length === 0) return null;
  const position = (ordered.length - 1) * clamp(probability, 0, 1);
  const lowerIndex = Math.floor(position);
  const upperIndex = Math.ceil(position);
  if (lowerIndex === upperIndex) return ordered[lowerIndex];
  const fraction = position - lowerIndex;
  return ordered[lowerIndex] + ((ordered[upperIndex] - ordered[lowerIndex]) * fraction);
}

export function summarizeRegimeReversals(records, { warmupSamples = 0 } = {}) {
  const usable = (Array.isArray(records) ? records : []).slice(Math.max(0, warmupSamples));
  const reversals = usable.filter((record) => record.reversal);
  const classes = Object.fromEntries([
    "weak-under-half",
    "similar-half-to-one-and-half",
    "strong-over-one-and-half",
  ].map((name) => [name, {
    count: 0,
    stateFlipCount: 0,
    stateChangeFractionSum: 0,
    stateChangeFractionCount: 0,
    stateChangeFractions: [],
  }]));

  for (const record of reversals) {
    const name = reversalStrengthClass(record.reversalStrengthRatio);
    const target = classes[name];
    target.count += 1;
    target.stateFlipCount += record.stateFlipped ? 1 : 0;
    if (Number.isFinite(record.stateChangeFraction)) {
      target.stateChangeFractionSum += record.stateChangeFraction;
      target.stateChangeFractionCount += 1;
      target.stateChangeFractions.push(record.stateChangeFraction);
    }
  }

  return {
    sampleCount: usable.length,
    reversalCount: reversals.length,
    stateFlipCount: reversals.filter((record) => record.stateFlipped).length,
    classes: Object.fromEntries(Object.entries(classes).map(([name, value]) => [name, {
      count: value.count,
      stateFlipCount: value.stateFlipCount,
      meanImmediateStateChangePercent: value.stateChangeFractionCount > 0
        ? (100 * value.stateChangeFractionSum / value.stateChangeFractionCount)
        : null,
      medianImmediateStateChangePercent: value.stateChangeFractionCount > 0
        ? 100 * percentile(value.stateChangeFractions, 0.5)
        : null,
      p90ImmediateStateChangePercent: value.stateChangeFractionCount > 0
        ? 100 * percentile(value.stateChangeFractions, 0.9)
        : null,
    }])),
  };
}

export function extractReversalEpisodes(records, { warmupSamples = 0 } = {}) {
  const usable = (Array.isArray(records) ? records : []).slice(Math.max(0, warmupSamples));
  const episodes = [];
  let active = null;

  function finishActive() {
    if (active) episodes.push(active);
    active = null;
  }

  for (const record of usable) {
    const forceSign = Math.sign(finiteNumber(record.force));
    if (active && forceSign !== -active.originalStateSign) {
      finishActive();
    }

    if (!active && record.reversal) {
      const originalStateSign = Math.sign(record.previousState);
      const startStateMagnitude = Math.max(Math.abs(record.previousState), EPSILON);
      active = {
        originalStateSign,
        durationHours: 0,
        startStateMagnitude,
        initialStrengthRatio: Math.abs(record.force) / startStateMagnitude,
        maximumStrengthRatio: 0,
        flipped: false,
        hoursUntilFlip: null,
      };
    }

    if (!active || forceSign !== -active.originalStateSign) continue;

    active.durationHours += Math.max(0, finiteNumber(record.elapsedHours));
    active.maximumStrengthRatio = Math.max(
      active.maximumStrengthRatio,
      Math.abs(record.force) / active.startStateMagnitude,
    );
    if (!active.flipped && Math.sign(record.state) !== 0 && Math.sign(record.state) !== active.originalStateSign) {
      active.flipped = true;
      active.hoursUntilFlip = active.durationHours;
    }
  }

  finishActive();
  return episodes;
}

export function summarizeReversalEpisodes(episodes) {
  const usable = Array.isArray(episodes) ? episodes : [];
  const classes = Object.fromEntries([
    "weak-under-half",
    "similar-half-to-one-and-half",
    "strong-over-one-and-half",
  ].map((name) => [name, []]));

  for (const episode of usable) {
    classes[reversalStrengthClass(episode.maximumStrengthRatio)].push(episode);
  }

  function summarize(items) {
    const flipped = items.filter((item) => item.flipped);
    return {
      count: items.length,
      stateFlipCount: flipped.length,
      medianDurationHours: percentile(items.map((item) => item.durationHours), 0.5),
      p90DurationHours: percentile(items.map((item) => item.durationHours), 0.9),
      medianHoursUntilFlip: percentile(flipped.map((item) => item.hoursUntilFlip), 0.5),
    };
  }

  return {
    episodeCount: usable.length,
    stateFlipCount: usable.filter((item) => item.flipped).length,
    medianDurationHours: percentile(usable.map((item) => item.durationHours), 0.5),
    p90DurationHours: percentile(usable.map((item) => item.durationHours), 0.9),
    medianHoursUntilFlip: percentile(
      usable.filter((item) => item.flipped).map((item) => item.hoursUntilFlip),
      0.5,
    ),
    classes: Object.fromEntries(Object.entries(classes).map(([name, items]) => [name, summarize(items)])),
  };
}

export function simulateReversalScenario({
  halfLifeHours,
  buildupHours = 48,
  reversalHours,
  buildupForce = 1,
  reversalForce,
} = {}) {
  const samples = [];
  const start = Date.UTC(2024, 0, 1, 0, 0, 0);
  for (let hour = 0; hour < buildupHours; hour += 1) {
    samples.push({ time: new Date(start + (hour * 3_600_000)).toISOString(), force: buildupForce });
  }
  for (let hour = 0; hour < reversalHours; hour += 1) {
    samples.push({
      time: new Date(start + ((buildupHours + hour) * 3_600_000)).toISOString(),
      force: -Math.abs(finiteNumber(reversalForce)),
    });
  }

  const records = buildExponentialRegimeMemory(samples, { halfLifeHours });
  const before = records[buildupHours - 1]?.state ?? 0;
  const after = records.at(-1)?.state ?? 0;
  const reversalRecords = records.slice(buildupHours);
  const firstFlipIndex = reversalRecords.findIndex((record) => record.state <= 0);

  return {
    halfLifeHours,
    buildupHours,
    reversalHours,
    reversalStrengthRatio: Math.abs(finiteNumber(reversalForce)) / Math.max(Math.abs(buildupForce), EPSILON),
    stateBeforeReversal: before,
    stateAfterReversal: after,
    stateChangePercent: Math.abs(before) > EPSILON ? 100 * (after - before) / Math.abs(before) : null,
    flipped: firstFlipIndex >= 0,
    hoursUntilFlip: firstFlipIndex >= 0 ? firstFlipIndex + 1 : null,
  };
}
