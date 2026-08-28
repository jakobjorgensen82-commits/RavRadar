import { evaluatePhaseDProcessCandidate } from './phase-d-process-candidate.js';
import { evaluateWaveApproachSupport } from './wave-approach.js?v=4.0.307';

const number = value => value === null || value === undefined || value === '' || typeof value === 'boolean'
  ? null
  : Number.isFinite(Number(value)) ? Number(value) : null;
const clamp = (value, min = 0, max = 100) => Math.max(min, Math.min(max, value));
const round = value => Math.round(clamp(value));

function physicalBottleneckGate(weakestPhysicalStage) {
  if (weakestPhysicalStage >= 35) return 1;
  return 0.85 + 0.15 * clamp(weakestPhysicalStage / 35, 0, 1);
}

export function evaluatePhaseDWaveProcessCandidate(context = {}) {
  const base = evaluatePhaseDProcessCandidate(context);
  if (!base.available) return base;

  const wave = evaluateWaveApproachSupport({
    weather: context.weather,
    onshoreDirectionDeg: context.zone?.onshoreDirectionDeg
  });
  const limitations = new Set(base.confidence?.limitations || []);

  if (!wave.available) for (const limitation of wave.missing) limitations.add(limitation);

  const huntability = number(base.components?.huntability) ?? 0;
  const mobilisation = number(base.components?.mobilisation) ?? 0;
  const baseTransport = number(base.components?.transport) ?? 0;
  const baseDelivery = number(base.components?.delivery) ?? 0;
  const eventTiming = number(base.diagnostics?.eventTimingScore);
  const decliningEnergy = number(base.diagnostics?.decliningEnergyScore);

  // Current/history remains dominant until the wave proxy is validated for
  // Danish coasts. Near-calm waves must not erase delivery from a recent
  // event, so the minority wave share grows only with current wave activity.
  const waveActivity = wave.available ? clamp((wave.energyScore - 20) / 60, 0, 1) : 0;
  const transportWaveShare = 0.3 * waveActivity;
  const waveSupport = wave.available ? wave.supportScore : baseTransport;
  const transport = (1 - transportWaveShare) * baseTransport + transportWaveShare * waveSupport;

  // Timing and declining energy can improve an existing delivery path, but
  // they cannot create delivery when both current and waves lead away.
  const phaseValues = [
    eventTiming === null ? null : { value: eventTiming, weight: 60 },
    decliningEnergy === null ? null : { value: decliningEnergy, weight: 40 },
  ].filter(Boolean);
  const phaseWeight = phaseValues.reduce((sum, item) => sum + item.weight, 0);
  const phaseReadiness = phaseWeight
    ? phaseValues.reduce((sum, item) => sum + item.value * item.weight, 0) / phaseWeight
    : 50;
  const delivery = transport * (0.55 + 0.45 * clamp(phaseReadiness, 0, 100) / 100);
  const transportAndDelivery = 0.65 * transport + 0.35 * delivery;
  const additiveScore = 0.25 * huntability + 0.4 * transportAndDelivery + 0.35 * mobilisation;
  const candidateD = round(additiveScore);
  const weakestPhysicalStage = Math.min(transportAndDelivery, mobilisation);
  const gateFactor = physicalBottleneckGate(weakestPhysicalStage);
  const candidateE = round(additiveScore * gateFactor);

  if (wave.available) {
    limitations.add('wave-energy-is-relative-proxy');
    limitations.add('nearshore-wave-transformation-unmodelled');
  }
  limitations.add('local-retention-feature-unmodelled');

  return {
    ...base,
    score: wave.available ? candidateE : base.score,
    modelVersion: 'phase-d-wave-delivery-prior-0.3',
    components: {
      ...base.components,
      transport: round(transport),
      delivery: round(delivery),
      transportAndDelivery: round(transportAndDelivery)
    },
    candidateScores: {
      ...base.candidateScores,
      candidateD,
      candidateE,
    },
    candidateDefinitions: {
      ...base.candidateDefinitions,
      candidateD: 'candidate A plus wave/current delivery path; timing cannot create delivery by itself',
      candidateE: 'candidate D plus at most 15 percent reduction below physical stage 35',
    },
    additiveScore,
    weakestStage: weakestPhysicalStage,
    weakestPhysicalStage,
    gateFactor,
    confidence: {
      ...base.confidence,
      dataCoverage: wave.available
        ? base.confidence?.dataCoverage
        : Math.min(number(base.confidence?.dataCoverage) ?? 1, 0.75),
      dataLabel: wave.available ? base.confidence?.dataLabel : 'medium',
      modelMaturity: 'research-prior-unvalidated',
      modelConfidence: 'low',
      limitations: [...limitations]
    },
    diagnostics: {
      ...base.diagnostics,
      waveApproachAvailable: wave.available,
      waveApproachMissing: wave.missing || [],
      waveDirectionFromDeg: wave.waveDirectionFromDeg ?? null,
      waveDirectionTowardDeg: wave.waveDirectionTowardDeg ?? null,
      waveOnshoreDifferenceDeg: wave.differenceDeg ?? null,
      waveOnshoreAlignment: wave.alignment ?? null,
      waveEnergyProxy: wave.energyProxy ?? null,
      waveEnergyScore: wave.energyScore ?? null,
      waveActivity,
      waveApproachSupportScore: wave.available ? wave.supportScore : null,
      baseTransportScore: baseTransport,
      baseDeliveryScore: baseDelivery,
      phaseReadinessScore: phaseReadiness,
      deliveryPathScore: transport,
      staticRetentionScoreImpact: false,
    }
  };
}
