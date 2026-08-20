import { evaluatePhaseDProcessCandidate } from './phase-d-process-candidate.js';
import { evaluateWaveApproachSupport } from './wave-approach.js?v=4.0.243';

const number = value => value === null || value === undefined || value === '' || typeof value === 'boolean'
  ? null
  : Number.isFinite(Number(value)) ? Number(value) : null;
const clamp = (value, min = 0, max = 100) => Math.max(min, Math.min(max, value));
const round = value => Math.round(clamp(value));

function weakestStageGate(weakestStage) {
  if (weakestStage >= 50) return 1;
  return 0.75 + 0.25 * clamp(weakestStage / 50, 0, 1);
}

export function evaluatePhaseDWaveProcessCandidate(context = {}) {
  const base = evaluatePhaseDProcessCandidate(context);
  if (!base.available) return base;

  const wave = evaluateWaveApproachSupport({
    weather: context.weather,
    onshoreDirectionDeg: context.zone?.onshoreDirectionDeg
  });
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
