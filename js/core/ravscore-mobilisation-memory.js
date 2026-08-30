const finite = value => typeof value === 'number' && Number.isFinite(value);
const clamp = (value, minimum = 0, maximum = 100) => Math.max(minimum, Math.min(maximum, Number(value)));

export const WAVE_MOBILISATION_ENERGY_POINTS = Object.freeze([
  Object.freeze([0, 0]),
  Object.freeze([0.25, 8]),
  Object.freeze([1, 25]),
  Object.freeze([3, 50]),
  Object.freeze([7, 75]),
  Object.freeze([14, 92]),
  Object.freeze([25, 100]),
]);

export const WAVE_MOBILISATION_RECOMMENDED_RESEARCH_PROFILE = Object.freeze({
  id: 'wave-energy-state-build-4-decay-48',
  buildHalfLifeHours: 4,
  decayHalfLifeHours: 48,
  initialPotential: 0,
  directWindScoreIncluded: false,
  currentSpeedScoreIncluded: false,
  missingSamplePolicy: 'HOLD_LAST_DERIVED_STATE',
  boundaryPolicy: 'CARRY_FORWARD_COMPACT_DERIVED_MOBILISATION_STATE',
});

function interpolate(value, points = WAVE_MOBILISATION_ENERGY_POINTS) {
  if (!finite(value)) return null;
  const input = Math.max(0, Number(value));
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

export function waveMobilisationEnergy({ waveHeightM, wavePeriodS } = {}) {
  if (!finite(waveHeightM) || !finite(wavePeriodS)) {
    return { available: false, energyProxy: null, energyScore: null };
  }
  const height = Math.max(0, Number(waveHeightM));
  const period = Math.max(0, Number(wavePeriodS));
  const energyProxy = height ** 2 * period;
  return {
    available: true,
    energyProxy,
    energyScore: interpolate(energyProxy),
  };
}

function positive(value, fallback, label) {
  const resolved = finite(value) ? Number(value) : fallback;
  if (!(resolved > 0)) throw new Error(`${label} must be greater than zero`);
  return resolved;
}

function dateMs(value, label) {
  const milliseconds = new Date(String(value)).getTime();
  if (!Number.isFinite(milliseconds)) throw new Error(`${label} must contain a valid time`);
  return milliseconds;
}

function resolveInitialState(initialState, initialPotential) {
  if (initialState === null || initialState === undefined) {
    return { timeMs: null, potential: initialPotential };
  }
  if (typeof initialState !== 'object' || Array.isArray(initialState)) {
    throw new Error('initialState must be a compact derived mobilisation state');
  }
  if (!finite(initialState.mobilisationPotential)) {
    throw new Error('initialState.mobilisationPotential must be finite');
  }
  const potential = Number(initialState.mobilisationPotential);
  if (potential < 0 || potential > 100) {
    throw new Error('initialState.mobilisationPotential must be between zero and one hundred');
  }
  return {
    timeMs: dateMs(initialState.time, 'initialState'),
    potential,
  };
}

export function buildWaveMobilisationPotential(
  samples = [],
  {
    buildHalfLifeHours = WAVE_MOBILISATION_RECOMMENDED_RESEARCH_PROFILE.buildHalfLifeHours,
    decayHalfLifeHours = WAVE_MOBILISATION_RECOMMENDED_RESEARCH_PROFILE.decayHalfLifeHours,
    initialPotential = WAVE_MOBILISATION_RECOMMENDED_RESEARCH_PROFILE.initialPotential,
    initialState = null,
    firstSampleDurationHours = 1,
    getTime = sample => sample?.time,
    getWaveHeight = sample => sample?.waveHeightM,
    getWavePeriod = sample => sample?.wavePeriodS,
  } = {},
) {
  const buildHalfLife = positive(buildHalfLifeHours, 4, 'buildHalfLifeHours');
  const decayHalfLife = positive(decayHalfLifeHours, 48, 'decayHalfLifeHours');
  const firstDuration = positive(firstSampleDurationHours, 1, 'firstSampleDurationHours');
  if (!finite(initialPotential) || Number(initialPotential) < 0 || Number(initialPotential) > 100) {
    throw new Error('initialPotential must be between zero and one hundred');
  }
  const start = resolveInitialState(initialState, Number(initialPotential));
  let previousTimeMs = start.timeMs;
  let mobilisationPotential = start.potential;

  return samples.map((sample, index) => {
    const time = getTime(sample);
    const timeMs = dateMs(time, `sample ${index}`);
    if (previousTimeMs !== null && timeMs < previousTimeMs) {
      throw new Error('Wave mobilisation samples must not move backwards in time');
    }
    const durationHours = previousTimeMs === null
      ? firstDuration
      : (timeMs - previousTimeMs) / 3_600_000;
    const energy = waveMobilisationEnergy({
      waveHeightM: getWaveHeight(sample),
      wavePeriodS: getWavePeriod(sample),
    });
    let transition = 'missing-hold';
    let stateChange = 0;
    if (energy.available && durationHours > 0) {
      const target = clamp(energy.energyScore);
      transition = target >= mobilisationPotential ? 'build' : 'decay';
      const halfLife = transition === 'build' ? buildHalfLife : decayHalfLife;
      const fraction = 1 - 2 ** (-durationHours / halfLife);
      const before = mobilisationPotential;
      mobilisationPotential = clamp(before + (target - before) * fraction);
      stateChange = mobilisationPotential - before;
    } else if (energy.available) {
      transition = 'same-time-hold';
    }
    previousTimeMs = timeMs;
    return {
      time: new Date(timeMs).toISOString(),
      mobilisationPotential,
      stateChange,
      transition,
      durationHours,
      waveEnergyAvailable: energy.available,
      waveEnergyProxy: energy.energyProxy,
      waveEnergyScore: energy.energyScore,
      buildHalfLifeHours: buildHalfLife,
      decayHalfLifeHours: decayHalfLife,
      continuationState: {
        time: new Date(timeMs).toISOString(),
        mobilisationPotential,
      },
    };
  });
}
