import { evaluatePhaseDProcessCandidate } from './phase-d-process-candidate.js';

const number = value => value === null || value === undefined || value === '' || typeof value === 'boolean'
  ? null
  : Number.isFinite(Number(value)) ? Number(value) : null;
const clamp = (value, min = 0, max = 100) => Math.max(min, Math.min(max, value));
const round = value => Math.round(clamp(value));

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

function waveApproachSupport(weather, zone) {
  const waveHeightM = number(weather?.waveHeightM);
  const wavePeriodS = number(weather?.wavePeriodS);
  const waveDirectionFromDeg = number(weather?.waveDirectionDeg);
  const onshoreDirectionDeg = number(zone?.onshoreDirectionDeg);
  const missing = [];

  if (waveHeightM === null) missing.push('wave-height-missing');
  if (wavePeriodS === null) missing.push('wave-period-missing');
  if (waveDirectionFromDeg === null) missing.push('wave-direction-missing');
  if (onshoreDirectionDeg === null) missing.push('onshore-direction-missing');
  if (missing.length) return { available: false, missing };

  // DMI wave direction is "from". RavRadar's onshore direction points from sea to land.
  const waveDirectionTowardDeg = (waveDirectionFromDeg + 180) % 360;
  const differenceDeg = angularDifference(waveDirectionTowardDeg, onshoreDirectionDeg);
  const alignment = Math.cos(differenceDeg * Math.PI / 180);

  // Hs^2 * T is a deliberately simple relative energy proxy. It is not a
  // near-bed shear-stress calculation and must not be presented as one.
  const energyProxy = waveHeightM ** 2 * wavePeriodS;
  const energyScore = piecewise(energyProxy, [
    [0, 0],
    [0.25, 8],
    [1, 25],
    [3, 50],
    [7, 75],
    [14, 92],
    [25, 100]
  ]);

  // Alongshore and locally refracted waves can still contribute, so the
  // directional factor has a small floor rather than acting as a hard zero.
  const directionalFactor = clamp((alignment + 0.25) / 1.25, 0, 1);
  const supportScore = energyScore * (0.2 + 0.8 * directionalFactor);

  return {
    available: true,
    waveHeightM,
    wavePeriodS,
    waveDirectionFromDeg,
    waveDirectionTowardDeg,
    onshoreDirectionDeg,
    differenceDeg,
    alignment,
    energyProxy,
    energyScore,
    directionalFactor,
    supportScore
  };
}

function weakestStageGate(weakestStage) {
  if (weakestStage >= 50) return 1;
  return 0.75 + 0.25 * clamp(weakestStage / 50, 0, 1);
}

export function evaluatePhaseDWaveProcessCandidate(context = {}) {
  const base = evaluatePhaseDProcessCandidate(context);
  if (!base.available) return base;

  const wave = waveApproachSupport(context.weather, context.zone);
  const limitations = new Set(base.confidence?.limitations || []);

  if (!wave.available) {
    for (const limitation of wave.missing) limitations.add(limitation);
    return {
      ...base,
      modelVersion: 'phase-d-wave-process-prior-0.2',
      confidence: {
        ...base.confidence,
        dataCoverage: Math.min(number(base.confidence?.dataCoverage) ?? 1, 0.75),
        dataLabel: 'medium',
        limitations: [...limitations]
      },
      diagnostics: {
        ...base.diagnostics,
        waveApproachAvailable: false,
        waveApproachMissing: wave.missing
      }
    };
  }

  const huntability = number(base.components?.huntability) ?? 0;
  const mobilisation = number(base.components?.mobilisation) ?? 0;
  const baseTransport = number(base.components?.transport) ?? 0;
  const baseDelivery = number(base.components?.delivery) ?? 0;

  // Current/history remains dominant until the wave proxy is validated for
  // Danish coasts. Near-calm waves must not erase delivery from a recent
  // event, so the minority wave share grows only with current wave activity.
  const waveActivity = clamp((wave.energyScore - 20) / 60, 0, 1);
  const transportWaveShare = 0.3 * waveActivity;
  const deliveryWaveShare = 0.25 * waveActivity;
  const transport = (1 - transportWaveShare) * baseTransport + transportWaveShare * wave.supportScore;
  const delivery = (1 - deliveryWaveShare) * baseDelivery + deliveryWaveShare * wave.supportScore;
  const transportAndDelivery = 0.65 * transport + 0.35 * delivery;
  const additiveScore = 0.25 * huntability + 0.4 * transportAndDelivery + 0.35 * mobilisation;
  const weakestStage = Math.min(huntability, transportAndDelivery, mobilisation);
  const gateFactor = weakestStageGate(weakestStage);

  limitations.add('wave-energy-is-relative-proxy');
  limitations.add('nearshore-wave-transformation-unmodelled');

  return {
    ...base,
    score: round(additiveScore * gateFactor),
    modelVersion: 'phase-d-wave-process-prior-0.2',
    components: {
      ...base.components,
      transport: round(transport),
      delivery: round(delivery),
      transportAndDelivery: round(transportAndDelivery)
    },
    additiveScore,
    weakestStage,
    gateFactor,
    confidence: {
      ...base.confidence,
      modelMaturity: 'research-prior-unvalidated',
      modelConfidence: 'low',
      limitations: [...limitations]
    },
    diagnostics: {
      ...base.diagnostics,
      waveApproachAvailable: true,
      waveDirectionFromDeg: wave.waveDirectionFromDeg,
      waveDirectionTowardDeg: wave.waveDirectionTowardDeg,
      waveOnshoreDifferenceDeg: wave.differenceDeg,
      waveOnshoreAlignment: wave.alignment,
      waveEnergyProxy: wave.energyProxy,
      waveEnergyScore: wave.energyScore,
      waveActivity,
      waveApproachSupportScore: wave.supportScore,
      baseTransportScore: baseTransport,
      baseDeliveryScore: baseDelivery
    }
  };
}
