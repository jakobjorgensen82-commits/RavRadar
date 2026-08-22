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
