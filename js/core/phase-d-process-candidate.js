const finite = value => value !== null && value !== undefined && value !== '' && typeof value !== 'boolean' && Number.isFinite(Number(value));
const number = value => finite(value) ? Number(value) : null;
const clamp = (value, minimum = 0, maximum = 100) => Math.max(minimum, Math.min(maximum, Number(value)));
const rounded = value => Math.round(Number(value));

export const PHASE_D_HUNTABILITY_PROFILES = Object.freeze({
  BASELINE: 'phase-d-huntability-baseline-v1',
  WADERS_UNDER_6_PROGRESSIVE: 'waders-under-6-progressive-v1',
});

const BASELINE_WADERS_WIND_POINTS = Object.freeze([
  [0, 100], [3, 100], [6, 80], [8, 55], [13, 10], [18, 0],
]);
const WADERS_UNDER_6_PROGRESSIVE_WIND_POINTS = Object.freeze([
  [0, 100], [6, 100], [7, 80], [8, 60], [10, 35], [13, 10], [18, 0],
]);
const BEACH_WIND_POINTS = Object.freeze([
  [0, 100], [5, 100], [8, 90], [13, 60], [18, 25], [25, 0],
]);
const WADERS_WAVE_POINTS = Object.freeze([
  [0, 100], [0.25, 95], [0.7, 65], [1.2, 25], [2.5, 0],
]);
const BEACH_WAVE_POINTS = Object.freeze([
  [0, 100], [0.3, 100], [0.7, 90], [1.2, 75], [2.5, 45], [4, 20], [6, 0],
]);

function interpolate(value, points) {
  const input = number(value);
  if (input === null) return null;
  if (input <= points[0][0]) return points[0][1];
  for (let index = 1; index < points.length; index += 1) {
    const [rightX, rightY] = points[index];
    const [leftX, leftY] = points[index - 1];
    if (input <= rightX) {
      const position = (input - leftX) / (rightX - leftX);
      return leftY + (rightY - leftY) * position;
    }
  }
  return points.at(-1)[1];
}

function weightedKnown(entries) {
  const known = entries.filter(entry => finite(entry.value) && entry.weight > 0);
  if (!known.length) return { value: null, coverage: 0 };
  const knownWeight = known.reduce((sum, entry) => sum + entry.weight, 0);
  const totalWeight = entries.reduce((sum, entry) => sum + entry.weight, 0);
  return {
    value: known.reduce((sum, entry) => sum + Number(entry.value) * entry.weight, 0) / knownWeight,
    coverage: totalWeight > 0 ? knownWeight / totalWeight : 0,
  };
}

function directionAlignment(weather, zone) {
  const direct = number(weather?.currentAlignment ?? weather?.currentAlignmentScore);
  if (direct !== null) return clamp(direct, -1, 1);
  const current = number(weather?.currentDirectionDeg);
  const onshore = number(zone?.onshoreDirectionDeg);
  if (current === null || onshore === null) return null;
  const difference = ((current - onshore + 540) % 360) - 180;
  return Math.cos(difference * Math.PI / 180);
}

export function evaluatePhaseDHuntability(
  mode,
  weather,
  { profile = PHASE_D_HUNTABILITY_PROFILES.BASELINE } = {},
) {
  if (!Object.values(PHASE_D_HUNTABILITY_PROFILES).includes(profile)) {
    throw new Error(`Unknown Phase D huntability profile: ${profile}`);
  }
  const windPoints = mode === 'waders'
    ? profile === PHASE_D_HUNTABILITY_PROFILES.WADERS_UNDER_6_PROGRESSIVE
      ? WADERS_UNDER_6_PROGRESSIVE_WIND_POINTS
      : BASELINE_WADERS_WIND_POINTS
    : BEACH_WIND_POINTS;
  const wavePoints = mode === 'waders' ? WADERS_WAVE_POINTS : BEACH_WAVE_POINTS;
  const parts = [
    { id: 'wind', value: interpolate(weather?.windSpeedMps, windPoints), weight: mode === 'waders' ? 40 : 55 },
    { id: 'wave', value: interpolate(weather?.waveHeightM, wavePoints), weight: mode === 'waders' ? 60 : 45 },
  ];
  const average = weightedKnown(parts);
  const knownValues = parts.filter(part => finite(part.value)).map(part => Number(part.value));
  if (!knownValues.length || average.value === null) return average;
  return {
    value: Math.min(...knownValues) * 0.6 + average.value * 0.4,
    coverage: average.coverage,
    profile,
    windScore: parts[0].value,
    waveScore: parts[1].value,
  };
}

function mobilisation(history, weather, zone) {
  const fresh = weightedKnown([
    {
      id: 'historical-wave',
      value: interpolate(history?.maxWave24hM, [[0, 0], [0.4, 5], [0.8, 25], [1.2, 50], [2, 85], [3, 100]]),
      weight: 55,
    },
    {
      id: 'historical-wind',
      value: interpolate(history?.maxWind24hMps, [[0, 0], [5, 5], [9, 30], [14, 70], [20, 100]]),
      weight: 25,
    },
    {
      id: 'event-duration',
      value: interpolate(history?.strongEventDurationHours, [[0, 0], [1, 20], [3, 60], [6, 90], [12, 100]]),
      weight: 20,
    },
  ]);
  const eventAge = number(history?.hoursSinceStrongEventEnd ?? history?.hoursSinceHighEnergy);
  const ageFactor = interpolate(eventAge, [[0, 1], [18, 1], [36, 0.8], [72, 0.45], [120, 0.15], [240, 0]]);
  const freshEffective = fresh.value === null ? null : fresh.value * (ageFactor ?? 0.5);
  const remobilisation = weightedKnown([
    {
      id: 'current-wave',
      value: interpolate(weather?.waveHeightM, [[0, 0], [0.15, 10], [0.3, 35], [0.6, 70], [1.2, 100], [2.5, 90], [4, 70]]),
      weight: 65,
    },
    {
      id: 'current-speed',
      value: interpolate(weather?.currentSpeedMps, [[0, 0], [0.1, 15], [0.2, 40], [0.4, 75], [0.65, 100], [1, 90], [1.5, 65]]),
      weight: 25,
    },
  ]);
  const remobilisationEffective = remobilisation.value === null ? null : Math.min(80, remobilisation.value * 0.8);
  const pathways = [
    { id: 'fresh-event', value: freshEffective },
    { id: 'nearshore-remobilisation', value: remobilisationEffective },
  ].filter(pathway => finite(pathway.value));
  if (!pathways.length) return { value: null, coverage: 0, dominantPathway: null };
  pathways.sort((a, b) => b.value - a.value);
  return {
    value: pathways[0].value,
    coverage: (fresh.coverage + remobilisation.coverage) / 2,
    dominantPathway: pathways[0].id,
    freshRaw: fresh.value,
    freshEffective,
    eventAge,
    ageFactor,
    remobilisationRaw: remobilisation.value,
    remobilisationEffective,
  };
}

function currentTransport(weather, zone) {
  const alignment = directionAlignment(weather, zone);
  const direction = interpolate(alignment, [[-1, 0], [-0.35, 15], [0, 45], [0.2, 65], [0.6, 90], [1, 100]]);
  const speed = interpolate(weather?.currentSpeedMps, [[0, 0], [0.05, 15], [0.12, 40], [0.2, 70], [0.4, 100], [0.65, 90], [1, 65], [1.5, 40]]);
  if (direction === null || speed === null) return { value: null, alignment, direction, speed };
  return { value: direction * speed / 100, alignment, direction, speed };
}

function historicalTransport(history) {
  if (!history?.stateModelMode || !finite(history?.verifiedCurrentCoverageHours)) return null;
  const inbound = number(history?.inboundCurrentMomentum) ?? 0;
  const outbound = number(history?.outboundCurrentPressure) ?? 0;
  const activeDuration = number(history?.activeCurrentRegimeDurationHours) ?? 0;
  const stability = number(history?.activeCurrentRegimeStability);
  const stabilityFactor = stability === null ? 0.75 : 0.6 + clamp(stability, 0, 1) * 0.4;
  let value = 50 + inbound * 0.5 - outbound * 0.65;
  if (history.activeCurrentRegime === 'inbound') value += Math.min(18, activeDuration * 3) * stabilityFactor;
  if (history.activeCurrentRegime === 'outbound') value -= Math.min(22, activeDuration * 3.5) * stabilityFactor;
  if (history.activeCurrentRegime === 'unavailable') return null;
  return clamp(value);
}

function transport(history, weather, zone) {
  const current = currentTransport(weather, zone);
  const accumulated = historicalTransport(history);
  const combined = weightedKnown([
    { id: 'current-vector', value: current.value, weight: 60 },
    { id: 'verified-history', value: accumulated, weight: 40 },
  ]);
  return { ...combined, current, accumulated };
}

function delivery(history, weather, zone, transportResult) {
  const age = number(history?.hoursSinceStrongEventEnd ?? history?.hoursSinceHighEnergy);
  const timing = interpolate(age, [[0, 25], [3, 60], [8, 100], [18, 90], [36, 65], [72, 30], [120, 10], [240, 0]]);
  const currentWave = number(weather?.waveHeightM);
  const maximumWave = number(history?.maxWave24hM);
  const waveRatio = currentWave !== null && maximumWave !== null && maximumWave > 0 ? currentWave / maximumWave : null;
  const decliningEnergy = interpolate(waveRatio, [[0, 35], [0.15, 70], [0.35, 100], [0.65, 80], [1, 40], [1.5, 10], [3, 0]]);
  const direction = transportResult.current.direction;
  const base = weightedKnown([
    { id: 'event-timing', value: timing, weight: 40 },
    { id: 'declining-wave-energy', value: decliningEnergy, weight: 25 },
    { id: 'current-direction', value: direction, weight: 35 },
  ]);
  if (base.value === null) return { ...base, timing, waveRatio, decliningEnergy, retention: 0 };
  // Reefs, shallow water and seagrass remain explanatory uncertainty only.
  // There is not yet evidence for a universal static RavScore bonus.
  const retention = 0;
  return { value: clamp(base.value), coverage: base.coverage, timing, waveRatio, decliningEnergy, retention };
}

function confidenceLabel(coverage) {
  if (coverage >= 0.85) return 'high';
  if (coverage >= 0.65) return 'medium';
  return 'low';
}

export function evaluatePhaseDProcessCandidate({ mode = 'beach', history = {}, weather = {}, zone = {} } = {}) {
  const search = evaluatePhaseDHuntability(mode, weather);
  const mobilisationResult = mobilisation(history, weather, zone);
  const transportResult = transport(history, weather, zone);
  const deliveryResult = delivery(history, weather, zone, transportResult);
  const transportAndDelivery = weightedKnown([
    { id: 'transport', value: transportResult.value, weight: 65 },
    { id: 'delivery', value: deliveryResult.value, weight: 35 },
  ]);

  const required = [search.value, mobilisationResult.value, transportAndDelivery.value];
  if (!required.every(finite)) {
    return {
      available: false,
      score: null,
      scoreImpact: 'diagnostic-only',
      reason: 'MISSING_REQUIRED_PHASE_D_COMPONENT',
    };
  }

  const components = {
    huntability: rounded(search.value),
    transport: rounded(transportResult.value),
    delivery: rounded(deliveryResult.value),
    transportAndDelivery: rounded(transportAndDelivery.value),
    mobilisation: rounded(mobilisationResult.value),
  };
  const candidateA = rounded(components.huntability * 0.25 + components.transport * 0.4 + components.mobilisation * 0.35);
  const candidateB = rounded(components.huntability * 0.25 + components.transportAndDelivery * 0.4 + components.mobilisation * 0.35);
  const additive = components.huntability * 0.25 + components.transportAndDelivery * 0.4 + components.mobilisation * 0.35;
  const weakestStage = Math.min(components.mobilisation, components.delivery);
  const gateFactor = 0.75 + 0.25 * Math.min(1, weakestStage / 50);
  const candidateC = rounded(additive * gateFactor);
  const score = candidateC;
  const coverage = (search.coverage + mobilisationResult.coverage + transportResult.coverage + deliveryResult.coverage) / 4;
  const limitations = [];
  if (!finite(weather?.wavePeriodS)) limitations.push('wave-period-missing');
  if (!history?.stateModelMode) limitations.push('verified-transport-history-missing');
  limitations.push('current-depth-relevance-unverified');
  limitations.push('local-amber-inventory-unmodelled');
  const rawDataLabel = confidenceLabel(coverage);
  const dataLabel = limitations.includes('wave-period-missing') || limitations.includes('verified-transport-history-missing')
    ? rawDataLabel === 'low' ? 'low' : 'medium'
    : rawDataLabel;

  return {
    available: true,
    score,
    scoreImpact: 'diagnostic-only',
    modelVersion: 'phase-d-process-prior-0.2',
    components,
    candidateScores: {
      candidateA,
      candidateB,
      candidateC,
    },
    candidateDefinitions: {
      candidateA: 'glatte kurver og hændelseshukommelse uden særskilt levering eller svageste-led-gate',
      candidateB: 'candidateA plus levering og fastholdelse',
      candidateC: 'candidateB plus mild glat begrænsning fra det svageste nødvendige fysiske led: mobilisering eller levering',
    },
    additiveScore: rounded(additive),
    weakestStage,
    gateFactor: Number(gateFactor.toFixed(3)),
    confidence: {
      dataCoverage: Number(coverage.toFixed(3)),
      dataLabel,
      modelMaturity: 'research-prior-unvalidated',
      modelConfidence: 'low',
      limitations,
    },
    diagnostics: {
      huntabilityCoverage: Number(search.coverage.toFixed(3)),
      mobilisationCoverage: Number(mobilisationResult.coverage.toFixed(3)),
      mobilisationPathway: mobilisationResult.dominantPathway,
      freshMobilisationScore: mobilisationResult.freshEffective,
      remobilisationScore: mobilisationResult.remobilisationEffective,
      eventAgeFactor: mobilisationResult.ageFactor,
      transportCoverage: Number(transportResult.coverage.toFixed(3)),
      deliveryCoverage: Number(deliveryResult.coverage.toFixed(3)),
      currentAlignment: transportResult.current.alignment,
      currentDirectionScore: transportResult.current.direction,
      currentSpeedScore: transportResult.current.speed,
      accumulatedTransportScore: transportResult.accumulated,
      eventTimingScore: deliveryResult.timing,
      decliningEnergyScore: deliveryResult.decliningEnergy,
      retentionPoints: deliveryResult.retention,
    },
  };
}
