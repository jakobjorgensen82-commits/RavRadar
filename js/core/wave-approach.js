const number = value => value === null || value === undefined || value === '' || typeof value === 'boolean'
  ? null
  : Number.isFinite(Number(value)) ? Number(value) : null;
const clamp = (value, min = 0, max = 100) => Math.max(min, Math.min(max, value));

export const WAVE_APPROACH_MODEL_VERSION = 'wave-approach-prior-1.0';
export const MAX_WAVE_TRANSPORT_DELTA = 12;

function angularDifference(a, b) {
  const difference = Math.abs((((a - b) % 360) + 360) % 360);
  return Math.min(difference, 360 - difference);
}

function piecewise(value, points) {
  if (value <= points[0][0]) return points[0][1];
  for (let index = 1; index < points.length; index += 1) {
    const [x1, y1] = points[index];
    const [x0, y0] = points[index - 1];
    if (value <= x1) return y0 + ((value - x0) / (x1 - x0)) * (y1 - y0);
  }
  return points.at(-1)[1];
}

export function evaluateWaveApproachSupport({ weather = {}, onshoreDirectionDeg = null } = {}) {
  const waveHeightM = number(weather.waveHeightM);
  const wavePeriodS = number(weather.wavePeriodS);
  const waveDirectionFromDeg = number(weather.waveDirectionDeg);
  const onshore = number(onshoreDirectionDeg);
  const missing = [];

  if (waveHeightM === null) missing.push('wave-height-missing');
  if (wavePeriodS === null) missing.push('wave-period-missing');
  if (waveDirectionFromDeg === null) missing.push('wave-direction-missing');
  if (onshore === null) missing.push('onshore-direction-missing');
  if (missing.length) return { available: false, modelVersion: WAVE_APPROACH_MODEL_VERSION, missing };

  // DMI bølgeretning er "fra". Lokal pålandsretning peger fra hav mod land.
  const waveDirectionTowardDeg = (waveDirectionFromDeg + 180) % 360;
  const differenceDeg = angularDifference(waveDirectionTowardDeg, onshore);
  const alignment = Math.cos(differenceDeg * Math.PI / 180);

  // Hs^2 * T er kun en relativ energiproxy, ikke en beregning af bundforskydning.
  const energyProxy = waveHeightM ** 2 * wavePeriodS;
  const energyScore = piecewise(energyProxy, [
    [0, 0], [0.25, 8], [1, 25], [3, 50], [7, 75], [14, 92], [25, 100]
  ]);
  const directionalFactor = clamp((alignment + 0.25) / 1.25, 0, 1);
  const supportScore = energyScore * (0.2 + 0.8 * directionalFactor);

  return {
    available: true,
    modelVersion: WAVE_APPROACH_MODEL_VERSION,
    waveHeightM,
    wavePeriodS,
    waveDirectionFromDeg,
    waveDirectionTowardDeg,
    onshoreDirectionDeg: onshore,
    differenceDeg,
    alignment,
    energyProxy,
    energyScore,
    directionalFactor,
    supportScore
  };
}

export function boundedWaveTransportAdjustment({ baseTransportScore, weather = {}, onshoreDirectionDeg = null } = {}) {
  const base = number(baseTransportScore);
  const wave = evaluateWaveApproachSupport({ weather, onshoreDirectionDeg });
  if (base === null || !wave.available) {
    return {
      ...wave,
      available: false,
      adjustment: 0,
      maxAdjustment: MAX_WAVE_TRANSPORT_DELTA,
      missing: [...new Set([...(wave.missing || []), ...(base === null ? ['base-transport-missing'] : [])])]
    };
  }

  // Bølgeandelen vokser kun ved reel bølgeaktivitet. Komponenten kan højst
  // flyttes 12 point, så den samlede aktive RavScore højst flyttes ca. 4 point.
  const waveActivity = clamp((wave.energyScore - 20) / 60, 0, 1);
  const rawAdjustment = (wave.supportScore - base) * 0.3 * waveActivity;
  const adjustment = Math.round(clamp(rawAdjustment, -MAX_WAVE_TRANSPORT_DELTA, MAX_WAVE_TRANSPORT_DELTA));
  return {
    ...wave,
    waveActivity,
    rawAdjustment,
    adjustment,
    maxAdjustment: MAX_WAVE_TRANSPORT_DELTA
  };
}
