import { RAVSCORE_HUNTABILITY_POLICY } from './ravscore-model-contract.js';

const finite = value => typeof value === 'number' && Number.isFinite(value);
const number = value => finite(value) ? value : null;

const INPUT_REASON_PARTS = Object.freeze({
  windSpeedMps: 'WIND',
  waveHeightM: 'WAVE_HEIGHT',
});

function requiredNonNegativeInput(mode, input, value) {
  const modeReason = mode.toUpperCase();
  const inputReason = INPUT_REASON_PARTS[input];
  const missing = value === null
    || value === undefined
    || (typeof value === 'string' && value.trim() === '');
  if (missing) return {
    available: false,
    value: null,
    reason: `${modeReason}_${inputReason}_INPUT_MISSING`,
    requiredInput: input,
    inputStatus: 'MISSING',
    policyId: RAVSCORE_HUNTABILITY_POLICY.id,
  };

  const parsed = typeof value === 'number' ? value : Number.NaN;
  if (!Number.isFinite(parsed) || parsed < 0) return {
    available: false,
    value: null,
    reason: `${modeReason}_${inputReason}_INPUT_INVALID`,
    requiredInput: input,
    inputStatus: 'INVALID',
    policyId: RAVSCORE_HUNTABILITY_POLICY.id,
  };

  return { available: true, value: parsed };
}

const WADERS_WIND_POINTS = RAVSCORE_HUNTABILITY_POLICY.wadersWindPoints;
const BEACH_WIND_POINTS = RAVSCORE_HUNTABILITY_POLICY.beachWindPoints;
const WADERS_WAVE_POINTS = RAVSCORE_HUNTABILITY_POLICY.wadersWavePoints;
const BEACH_WAVE_POINTS = RAVSCORE_HUNTABILITY_POLICY.beachWavePoints;

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

export function evaluateIntegratedHuntability(mode = 'beach', weather = {}) {
  if (!['beach', 'waders'].includes(mode)) throw new Error(`Unknown hunting mode: ${mode}`);
  const windInput = requiredNonNegativeInput(mode, 'windSpeedMps', weather?.windSpeedMps);
  if (!windInput.available) return windInput;
  const waveInput = requiredNonNegativeInput(mode, 'waveHeightM', weather?.waveHeightM);
  if (!waveInput.available) return waveInput;

  const windScore = interpolate(
    windInput.value,
    mode === 'waders' ? WADERS_WIND_POINTS : BEACH_WIND_POINTS,
  );
  const waveScore = interpolate(
    waveInput.value,
    mode === 'waders' ? WADERS_WAVE_POINTS : BEACH_WAVE_POINTS,
  );

  if (mode === 'waders') {
    const wavePenalty = Math.max(0, windScore - waveScore)
      * RAVSCORE_HUNTABILITY_POLICY.wadersWavePenaltyMaximumShare;
    return {
      available: true,
      value: windScore - wavePenalty,
      windScore,
      waveScore,
      wavePenalty,
      windHardStopApplied: windScore === 0,
      inputCoverage: 1,
      policyId: RAVSCORE_HUNTABILITY_POLICY.id,
    };
  }

  const known = [windScore, waveScore];
  const weighted = [
    { value: windScore, weight: RAVSCORE_HUNTABILITY_POLICY.beachWindWeight },
    { value: waveScore, weight: RAVSCORE_HUNTABILITY_POLICY.beachWaveWeight },
  ];
  const knownWeight = weighted.reduce((sum, entry) => sum + entry.weight, 0);
  const average = weighted.reduce((sum, entry) => sum + Number(entry.value) * entry.weight, 0)
    / knownWeight;
  return {
    available: true,
    value: Math.min(...known) * RAVSCORE_HUNTABILITY_POLICY.beachMinimumWeight
      + average * RAVSCORE_HUNTABILITY_POLICY.beachWeightedAverageWeight,
    windScore,
    waveScore,
    wavePenalty: 0,
    windHardStopApplied: false,
    inputCoverage: knownWeight,
    policyId: RAVSCORE_HUNTABILITY_POLICY.id,
  };
}

export const RAVSCORE_HUNTABILITY_CURVES = Object.freeze({
  wadersWind: WADERS_WIND_POINTS,
  beachWind: BEACH_WIND_POINTS,
  wadersWave: WADERS_WAVE_POINTS,
  beachWave: BEACH_WAVE_POINTS,
});
