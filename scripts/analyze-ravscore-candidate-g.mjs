#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

import { calculateRavScore } from '../js/core/score-engine.js';
import { evaluateRules } from '../js/core/rule-engine.js';
import {
  CANDIDATE_G_HISTORY_MIX,
  CANDIDATE_G_VARIANTS,
  evaluateRavScoreCandidateG,
} from '../js/core/ravscore-candidate-g.js';
import {
  buildBlendedRegimeMemory,
  normalizeMemoryTrackCausally,
  signedDirectionalForce,
} from '../js/core/ravscore-regime-memory.js';
import {
  MODE_COUPLING_POLICIES,
  evaluateModeHuntabilityCoupling,
} from '../js/core/ravscore-mode-huntability-research.js';

const TRACKS = Object.freeze([
  Object.freeze({ id: 'G-24H-LIN', activeWeight: 1 }),
  Object.freeze({ id: 'G-50-50-LIN', activeWeight: 0.5 }),
  Object.freeze({ id: 'G-48H-LIN', activeWeight: 0 }),
]);
const WEIGHT_PRIORS = Object.freeze([
  Object.freeze({ id: 'E-25-40-35', huntability: 0.25, transportAndDelivery: 0.40, mobilisation: 0.35 }),
  Object.freeze({ id: 'G-20-45-35', huntability: 0.20, transportAndDelivery: 0.45, mobilisation: 0.35 }),
  Object.freeze({ id: 'F-15-50-35', huntability: 0.15, transportAndDelivery: 0.50, mobilisation: 0.35 }),
]);
const HISTORY_GAINS = Object.freeze([0.25, 0.40, 0.55]);
const HISTORY_MIXES = Object.freeze([
  Object.freeze({ id: 'direct-0-neutral-slot', mix: CANDIDATE_G_HISTORY_MIX, includeDirectWind: false }),
  Object.freeze({ id: 'direct-5', mix: Object.freeze({ current: 0.575, wave: 0.375, directWind: 0.05 }), includeDirectWind: true }),
  Object.freeze({ id: 'direct-10-primary', mix: CANDIDATE_G_HISTORY_MIX, includeDirectWind: true }),
  Object.freeze({ id: 'direct-20-edge', mix: Object.freeze({ current: 0.50, wave: 0.30, directWind: 0.20 }), includeDirectWind: true }),
]);
const MEMORY_SCALES = Object.freeze({ current: 0.30, wave: 7, directWindLinear: 8, directWindStress: 64 });
const clamp = (value, minimum = 0, maximum = 100) => Math.max(minimum, Math.min(maximum, Number(value)));
const round3 = value => Number(Number(value).toFixed(3));
const utc = value => new Date(String(value));
const hours = milliseconds => milliseconds / 3_600_000;
const scoreBand = score => score >= 75 ? 'good' : score >= 55 ? 'fair' : score >= 35 ? 'weak' : 'poor';

function currentArrowRegime(alignment) {
  const value = Number(alignment);
  if (!Number.isFinite(value)) return 'unknown';
  if (value >= 0.35) return 'onshore-delivery';
  if (value <= -0.35) return 'offshore-removal';
  return 'alongshore-passage';
}

function historyDirection(signal) {
  const value = Number(signal);
  if (!Number.isFinite(value)) return 'unknown';
  if (value > 0) return 'inbound-history';
  if (value < 0) return 'outbound-history';
  return 'neutral-history';
}

function parseArguments(args) {
  const valueAfter = flag => {
    const index = args.indexOf(flag);
    return index >= 0 ? args[index + 1] : null;
  };
  const positional = args.filter((value, index) =>
    !value.startsWith('--') && !['--output', '--summary'].includes(args[index - 1]));
  return {
    selfTest: args.includes('--self-test'),
    forcingPath: positional[0] || null,
    wavePath: positional[1] || null,
    windPath: positional[2] || null,
    outputPath: valueAfter('--output'),
    summaryPath: valueAfter('--summary'),
  };
}

function mean(values) {
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null;
}

function percentile(values, probability) {
  const ordered = values.filter(Number.isFinite).sort((left, right) => left - right);
  if (!ordered.length) return null;
  const position = (ordered.length - 1) * clamp(probability, 0, 1);
  const lower = Math.floor(position);
  const upper = Math.ceil(position);
  if (lower === upper) return ordered[lower];
  return ordered[lower] + (ordered[upper] - ordered[lower]) * (position - lower);
}

function waveFromDirection(alignment) {
  const difference = Math.acos(clamp(alignment, -1, 1)) * 180 / Math.PI;
  return (difference + 180) % 360;
}

function currentToDirection(alignment) {
  return Math.acos(clamp(alignment, -1, 1)) * 180 / Math.PI;
}

function windFromDirection(alignment) {
  return (Math.acos(clamp(alignment, -1, 1)) * 180 / Math.PI + 180) % 360;
}

function physicalBottleneckGate(weakestPhysicalStage) {
  if (weakestPhysicalStage >= 35) return 1;
  return 0.85 + 0.15 * clamp(weakestPhysicalStage / 35, 0, 1);
}

function scoreWithWeights(candidate, weights) {
  const additive = candidate.components.huntability * weights.huntability
    + candidate.components.transportAndDelivery * weights.transportAndDelivery
    + candidate.components.mobilisation * weights.mobilisation;
  return Math.round(clamp(additive * candidate.gateFactor));
}

function eventHistory(event, sampleTime, samples) {
  const at = utc(sampleTime);
  const previousDay = samples.filter(sample => {
    const time = utc(sample.time);
    return time <= at && hours(at - time) <= 24;
  });
  const maxWave24hM = previousDay.length ? Math.max(...previousDay.map(sample => sample.waveHeightM)) : null;
  const maxWind24hMps = previousDay.length ? Math.max(...previousDay.map(sample => sample.windSpeedMps)) : null;
  const duration = Math.max(0, hours(utc(event.endTime) - utc(event.startTime)));
  const age = Math.max(0, hours(at - utc(event.endTime)));
  return {
    maxWave24hM,
    maxWind24hMps,
    strongEventDurationHours: duration,
    hoursSinceStrongEventEnd: age,
    hoursSinceHighEnergy: age,
  };
}

function waterLevelTrendCm3h(sampleTime, samples) {
  const at = utc(sampleTime);
  const priorTime = at.getTime() - 3 * 3_600_000;
  const current = samples.find(sample => utc(sample.time).getTime() === at.getTime());
  const prior = samples.find(sample => utc(sample.time).getTime() === priorTime);
  return current && prior ? round3((current.seaLevelM - prior.seaLevelM) * 100) : null;
}

function movementCapacityClass(sample) {
  const currentSpeed = Math.max(0, Number(sample.currentSpeedMps));
  const waveEnergy = Math.max(0, Number(sample.waveHeightM)) ** 2 * Math.max(0, Number(sample.wavePeriodS));
  if (currentSpeed < 0.12 && waveEnergy < 1) return 'low';
  if (currentSpeed < 0.4 && waveEnergy < 7) return 'medium';
  return 'high';
}

function buildMemoryTrack(samples, getForce, activeWeight, minimumScale) {
  const records = buildBlendedRegimeMemory(samples, {
    activeHalfLifeHours: 24,
    backgroundHalfLifeHours: 48,
    activeWeight,
    getTime: sample => sample.time,
    getForce,
  });
  return normalizeMemoryTrackCausally(records, {
    initialScale: minimumScale,
    minimumScale,
  });
}

function buildMemories(samples, activeWeight, directWindPower = 1) {
  const current = buildMemoryTrack(samples, sample => signedDirectionalForce({
    magnitude: sample.currentSpeedMps,
    alignment: sample.currentOnshoreAlignment,
  }), activeWeight, MEMORY_SCALES.current);
  const wave = buildMemoryTrack(samples, sample => signedDirectionalForce({
    magnitude: Math.max(0, Number(sample.waveHeightM)) ** 2 * Math.max(0, Number(sample.wavePeriodS)),
    alignment: sample.waveOnshoreAlignment,
  }), activeWeight, MEMORY_SCALES.wave);
  const directWind = buildMemoryTrack(samples, sample => signedDirectionalForce({
    magnitude: sample.windSpeedMps,
    alignment: sample.windTowardOnshoreAlignment,
    power: directWindPower,
  }), activeWeight, directWindPower === 1 ? MEMORY_SCALES.directWindLinear : MEMORY_SCALES.directWindStress);
  return new Map(samples.map((sample, index) => [utc(sample.time).getTime(), {
    current: current[index].boundedState,
    wave: wave[index].boundedState,
    directWind: directWind[index].boundedState,
  }]));
}

function mergeEventSamples(region, catalogEvent, windEvent) {
  const windByTime = new Map((windEvent.samples || []).map(sample => [utc(sample.time).getTime(), sample]));
  return (region.samples || [])
    .filter(sample => utc(sample.time) >= utc(catalogEvent.windowStart) && utc(sample.time) <= utc(catalogEvent.windowEnd))
    .map(sample => {
      const wind = windByTime.get(utc(sample.time).getTime());
      return wind ? { ...sample, ...wind } : null;
    })
    .filter(Boolean)
    .sort((left, right) => utc(left.time) - utc(right.time));
}

function contextFor(mode, sample, history, allSamples) {
  return {
    mode,
    zone: { id: 'private-derived-research-zone', onshoreDirectionDeg: 0 },
    weather: {
      windSpeedMps: sample.windSpeedMps,
      windDirectionDeg: windFromDirection(sample.windTowardOnshoreAlignment),
      waveHeightM: sample.waveHeightM,
      wavePeriodS: sample.wavePeriodS,
      waveDirectionDeg: waveFromDirection(sample.waveOnshoreAlignment),
      currentSpeedMps: sample.currentSpeedMps,
      currentDirectionDeg: currentToDirection(sample.currentOnshoreAlignment),
      currentAlignment: sample.currentOnshoreAlignment,
      waterLevelTrendCm3h: waterLevelTrendCm3h(sample.time, allSamples),
    },
    history,
  };
}

function withAblation(context, kind) {
  if (kind === 'totalCurrent') return {
    ...context,
    weather: { ...context.weather, currentSpeedMps: 0, currentDirectionDeg: 90, currentAlignment: 0 },
  };
  if (kind === 'totalWave') return {
    ...context,
    weather: { ...context.weather, waveHeightM: 0, wavePeriodS: 0 },
    history: { ...context.history, maxWave24hM: 0 },
  };
  if (kind === 'totalWind') return {
    ...context,
    weather: { ...context.weather, windSpeedMps: 0 },
    history: { ...context.history, maxWind24hMps: 0 },
  };
  return context;
}

function ablatedMemory(memory, kind) {
  if (kind === 'currentHistory' || kind === 'totalCurrent') return { ...memory, current: 0 };
  if (kind === 'waveHistory' || kind === 'totalWave') return { ...memory, wave: 0 };
  if (kind === 'directWindHistory' || kind === 'totalWind') return { ...memory, directWind: 0 };
  return memory;
}

function summarizeScores(rows, getScore, getBaseline = row => row.candidateE) {
  const scores = rows.map(getScore);
  const baselines = rows.map(getBaseline);
  const deltas = scores.map((score, index) => score - baselines[index]);
  return {
    evaluations: rows.length,
    mean: round3(mean(scores)),
    median: round3(percentile(scores, 0.5)),
    p10: round3(percentile(scores, 0.1)),
    p90: round3(percentile(scores, 0.9)),
    meanDeltaFromBaseline: round3(mean(deltas)),
    medianDeltaFromBaseline: round3(percentile(deltas, 0.5)),
    minimumDeltaFromBaseline: Math.min(...deltas),
    maximumDeltaFromBaseline: Math.max(...deltas),
    raised: deltas.filter(value => value > 0).length,
    unchanged: deltas.filter(value => value === 0).length,
    lowered: deltas.filter(value => value < 0).length,
    changedBandFromBaseline: rows.filter((row, index) => scoreBand(scores[index]) !== scoreBand(baselines[index])).length,
  };
}

function summarizeDifference(rows, left, right) {
  const deltas = rows.map(row => left(row) - right(row));
  return {
    evaluations: rows.length,
    meanDelta: round3(mean(deltas)),
    medianDelta: round3(percentile(deltas, 0.5)),
    meanAbsoluteDelta: round3(mean(deltas.map(Math.abs))),
    p90AbsoluteDelta: round3(percentile(deltas.map(Math.abs), 0.9)),
    minimumDelta: Math.min(...deltas),
    maximumDelta: Math.max(...deltas),
    leftHigher: deltas.filter(value => value > 0).length,
    equal: deltas.filter(value => value === 0).length,
    leftLower: deltas.filter(value => value < 0).length,
    changedBand: rows.filter(row => scoreBand(left(row)) !== scoreBand(right(row))).length,
  };
}

function aggregate(rows) {
  const variants = Object.fromEntries(TRACKS.map(track => [track.id, {
    overall: summarizeScores(rows, row => row.variants[track.id]),
    overallVsActive: summarizeScores(rows, row => row.variants[track.id], row => row.active),
    byMode: Object.fromEntries(['waders', 'beach'].map(mode => [mode,
      ({
        vsCandidateE: summarizeScores(rows.filter(row => row.mode === mode), row => row.variants[track.id]),
        vsActive: summarizeScores(rows.filter(row => row.mode === mode), row => row.variants[track.id], row => row.active),
      }),
    ])),
    byClassification: Object.fromEntries([...new Set(rows.map(row => row.classification))].sort().map(classification => [classification,
      summarizeScores(rows.filter(row => row.classification === classification), row => row.variants[track.id]),
    ])),
    byCapacity: Object.fromEntries(['low', 'medium', 'high'].map(capacity => [capacity,
      summarizeScores(rows.filter(row => row.capacity === capacity), row => row.variants[track.id]),
    ])),
  }]));
  const ablationIds = ['currentHistory', 'waveHistory', 'directWindHistory', 'totalCurrent', 'totalWave', 'totalWind'];
  return {
    activeBase: summarizeScores(rows, row => row.active, row => row.active),
    candidateE: summarizeScores(rows, row => row.candidateE, row => row.active),
    variants,
    trackComparisons: {
      h24MinusH48: summarizeDifference(rows, row => row.variants['G-24H-LIN'], row => row.variants['G-48H-LIN']),
      blendMinusH24: summarizeDifference(rows, row => row.variants['G-50-50-LIN'], row => row.variants['G-24H-LIN']),
      blendMinusH48: summarizeDifference(rows, row => row.variants['G-50-50-LIN'], row => row.variants['G-48H-LIN']),
    },
    directWind: {
      primaryMinusNoDirect: summarizeDifference(rows, row => row.variants['G-50-50-LIN'], row => row.noDirectWind),
      linearMinusStress: summarizeDifference(rows, row => row.variants['G-50-50-LIN'], row => row.windStress),
    },
    ablations: Object.fromEntries(ablationIds.map(id => [id,
      summarizeDifference(rows, row => row.variants['G-50-50-LIN'], row => row.ablations[id]),
    ])),
    historyGainSensitivity: Object.fromEntries(HISTORY_GAINS.map(gain => [String(gain),
      summarizeDifference(rows, row => row.gainSensitivity[String(gain)], row => row.candidateE),
    ])),
    historyMixSensitivity: Object.fromEntries(HISTORY_MIXES.map(item => [item.id,
      summarizeDifference(rows, row => row.mixSensitivity[item.id], row => row.candidateE),
    ])),
    scoreWeightSensitivity: Object.fromEntries(WEIGHT_PRIORS.map(weights => [weights.id,
      summarizeDifference(rows, row => row.weightSensitivity[weights.id], row => row.active),
    ])),
    modeCouplingSensitivity: Object.fromEntries(MODE_COUPLING_POLICIES.map(policy => {
      const waders = rows.filter(row => row.mode === 'waders');
      const beach = rows.filter(row => row.mode === 'beach');
      const huntabilityBands = [
        { id: '0-34', matches: row => row.huntability < 35 },
        { id: '35-54', matches: row => row.huntability >= 35 && row.huntability < 55 },
        { id: '55-74', matches: row => row.huntability >= 55 && row.huntability < 75 },
        { id: '75-100', matches: row => row.huntability >= 75 },
      ];
      return [policy.id, {
        description: policy.description,
        wadersVsPreferredCandidateG: summarizeScores(
          waders,
          row => row.modeCoupling[policy.id],
          row => row.noDirectWind,
        ),
        beachVsPreferredCandidateG: summarizeDifference(
          beach,
          row => row.modeCoupling[policy.id],
          row => row.noDirectWind,
        ),
        byWadersHuntability: Object.fromEntries(huntabilityBands.map(band => {
          const selected = waders.filter(band.matches);
          return [band.id, selected.length ? summarizeScores(
            selected,
            row => row.modeCoupling[policy.id],
            row => row.noDirectWind,
          ) : null];
        })),
        lowHuntabilityFairOrGoodCount: waders.filter(row =>
          row.huntability < 35 && row.modeCoupling[policy.id] >= 55).length,
        lowHuntabilityGoodCount: waders.filter(row =>
          row.huntability < 35 && row.modeCoupling[policy.id] >= 75).length,
        zeroHuntabilityMaximumScore: Math.max(0, ...waders.filter(row => row.huntability === 0)
          .map(row => row.modeCoupling[policy.id])),
      }];
    })),
    ownerApprovedModeVariant: {
      variantId: 'G-50-50-NO-DIRECT-WIND-WADERS-LIMIT',
      overallVsPreviousPreferred: summarizeScores(rows, row => row.approvedModeScore, row => row.noDirectWind),
      beachVsPreviousPreferred: summarizeScores(
        rows.filter(row => row.mode === 'beach'),
        row => row.approvedModeScore,
        row => row.noDirectWind,
      ),
      wadersVsPreviousPreferred: summarizeScores(
        rows.filter(row => row.mode === 'waders'),
        row => row.approvedModeScore,
        row => row.noDirectWind,
      ),
      wadersVsPreviousVisibleCap: summarizeScores(
        rows.filter(row => row.mode === 'waders'),
        row => row.approvedModeScore,
        row => row.modeCoupling['W-HUNTABILITY-CAP'],
      ),
      wadersHuntability: summarizeScores(
        rows.filter(row => row.mode === 'waders'),
        row => row.approvedHuntability,
        row => row.huntability,
      ),
      wadersLowHuntabilityCount: rows.filter(row =>
        row.mode === 'waders' && row.approvedHuntability < 35).length,
      wadersLowHuntabilityFairOrGoodCount: rows.filter(row =>
        row.mode === 'waders' && row.approvedHuntability < 35 && row.approvedModeScore >= 55).length,
      beachChangedCount: rows.filter(row =>
        row.mode === 'beach' && row.approvedModeScore !== row.noDirectWind).length,
      wadersScoreAboveHuntabilityCount: rows.filter(row =>
        row.mode === 'waders' && row.approvedModeScore > row.approvedHuntability).length,
    },
    waderHuntability: {
      evaluations: rows.filter(row => row.mode === 'waders').length,
      lowHuntabilityEvaluations: rows.filter(row => row.mode === 'waders' && row.huntability < 35).length,
      lowHuntabilityButFairOrGoodCandidateG: rows.filter(row =>
        row.mode === 'waders' && row.huntability < 35 && row.variants['G-50-50-LIN'] >= 55).length,
      zeroHuntabilityEvaluations: rows.filter(row => row.mode === 'waders' && row.huntability === 0).length,
      zeroHuntabilityButFairOrGoodPreferred: rows.filter(row =>
        row.mode === 'waders' && row.huntability === 0 && row.noDirectWind >= 55).length,
      zeroHuntabilityButGoodPreferred: rows.filter(row =>
        row.mode === 'waders' && row.huntability === 0 && row.noDirectWind >= 75).length,
      beachLowHuntabilityMayCoexistWithHighAmberPotential: true,
      wadersLowHuntabilityMustLimitFinalMethodScore: true,
      siteSuitabilityIncluded: false,
      safetyAdviceIncluded: false,
      hiddenScoreCoefficientAllowed: false,
      scoreIsSafetyAdvice: false,
    },
    productContractAudit: productContractAudit(rows),
    publicRuleChain: {
      activeRuleCount: rows[0]?.activeRuleCount ?? 0,
      matchedEvaluationCount: rows.filter(row => row.publicRuleMatchCount > 0).length,
      blockedEvaluationCount: rows.filter(row => row.publicRuleBlocked).length,
      candidateGBaseToFinal: summarizeDifference(rows, row => row.finalCandidateG ?? row.variants['G-50-50-LIN'], row => row.variants['G-50-50-LIN']),
    },
  };
}

function productContractAudit(rows) {
  const directional = rows.filter(row =>
    ['onshore-delivery', 'offshore-removal'].includes(row.currentArrowRegime)
    && ['inbound-history', 'outbound-history'].includes(row.historyDirection));
  const aligned = directional.filter(row =>
    (row.currentArrowRegime === 'onshore-delivery' && row.historyDirection === 'inbound-history')
    || (row.currentArrowRegime === 'offshore-removal' && row.historyDirection === 'outbound-history'));
  const opposed = directional.filter(row =>
    (row.currentArrowRegime === 'onshore-delivery' && row.historyDirection === 'outbound-history')
    || (row.currentArrowRegime === 'offshore-removal' && row.historyDirection === 'inbound-history'));
  const waders = rows.filter(row => row.mode === 'waders');
  const inconsistent = rows.filter(row => {
    const contributionSum = Object.values(row.preferredScoreCalculation.weightedContributions)
      .reduce((sum, value) => sum + Number(value), 0);
    const reconstructed = Math.round(clamp(
      row.preferredScoreCalculation.additiveScore * row.preferredScoreCalculation.gateFactor));
    return Math.abs(contributionSum - row.preferredScoreCalculation.additiveScore) > 1e-9
      || reconstructed !== row.noDirectWind
      || row.preferredScoreCalculation.roundedScore !== row.noDirectWind;
  });
  const approvedInconsistent = rows.filter(row => {
    const calculation = row.approvedScoreCalculation;
    const reconstructedUncoupled = Math.round(clamp(calculation.additiveScore * calculation.gateFactor));
    const reconstructedFinal = row.mode === 'waders'
      ? Math.min(reconstructedUncoupled, row.approvedHuntability)
      : reconstructedUncoupled;
    return reconstructedUncoupled !== calculation.uncoupledRoundedScore
      || reconstructedFinal !== row.approvedModeScore
      || calculation.roundedScore !== row.approvedModeScore;
  });
  return {
    comparisonBaselineVariant: 'G-50-50-NO-DIRECT-WIND',
    ownerApprovedResearchVariant: 'G-50-50-NO-DIRECT-WIND-WADERS-LIMIT',
    evaluationCount: rows.length,
    componentScoreConsistency: {
      checkedEvaluationCount: rows.length,
      mismatchCount: inconsistent.length,
      sameContextRequired: true,
    },
    ownerApprovedVariantConsistency: {
      checkedEvaluationCount: rows.length,
      mismatchCount: approvedInconsistent.length,
      wadersUsesVisibleHuntabilityMaximum: true,
      beachScoreUnchanged: true,
    },
    wadersMeaning: {
      evaluationCount: waders.length,
      zeroHuntabilityCount: waders.filter(row => row.huntability === 0).length,
      zeroHuntabilityWithFairOrGoodScoreCount: waders.filter(row => row.huntability === 0 && row.noDirectWind >= 55).length,
      lowHuntabilityCount: waders.filter(row => row.huntability < 35).length,
      lowHuntabilityWithFairOrGoodScoreCount: waders.filter(row => row.huntability < 35 && row.noDirectWind >= 55).length,
      approvedLowHuntabilityCount: waders.filter(row => row.approvedHuntability < 35).length,
      approvedLowHuntabilityWithFairOrGoodScoreCount: waders.filter(row =>
        row.approvedHuntability < 35 && row.approvedModeScore >= 55).length,
      productRecommendation: 'CONTINUE_SCORE_NEUTRAL_SHADOW_WITH_OWNER_APPROVED_MODE_VARIANT',
      lowWadersHuntabilityMustLimitFinalMethodScore: true,
      siteSuitabilityIncluded: false,
      safetyAdviceIncluded: false,
      hiddenScoreCoefficientAllowed: false,
    },
    arrowAndHistory: {
      arrowMeaning: 'CURRENT_VECTOR_AT_THE_SELECTED_CONTEXT',
      historyMeaning: 'CAUSAL_PRIOR_CONTEXT_MODULATING_EXISTING_TRANSPORT_CAPACITY',
      directionalContextCount: directional.length,
      alignedContextCount: aligned.length,
      opposedContextCount: opposed.length,
      opposedContextWithRoundedScoreEffectCount: opposed.filter(row => row.historyScoreDelta !== 0).length,
      currentOnshoreHistoryOutboundCount: opposed.filter(row =>
        row.currentArrowRegime === 'onshore-delivery' && row.historyDirection === 'outbound-history').length,
      currentOffshoreHistoryInboundCount: opposed.filter(row =>
        row.currentArrowRegime === 'offshore-removal' && row.historyDirection === 'inbound-history').length,
      explicitHistoryExplanationRequiredWhenOpposed: true,
      arrowMustNotBeReinterpretedAsHistoricalNetDirection: true,
    },
    publicScoreChanged: false,
    publicUiChanged: false,
    scoreIsSafetyAdvice: false,
  };
}

function compareDocuments(forcing, wave, wind, publicRules = []) {
  assert.equal(forcing.status, 'OK');
  assert.equal(forcing.rawUvStored, false);
  assert.equal(forcing.coordinateValuesStored, false);
  assert.equal(wave.status, 'OK');
  assert.equal(wind.scoreImpact, false);
  assert.equal(wind.coordinateValuesStored, false);
  const forcingEvents = new Map((forcing.eventCatalog || []).map(event => [event.eventId, event]));
  const waveEvents = new Map((wave.selectedWaveWindows || []).map(event => [event.eventId, event]));
  const windEvents = new Map((wind.events || []).map(event => [event.eventId, event]));
  const rows = [];

  for (const region of forcing.regions || []) {
    for (const catalogEvent of forcingEvents.values()) {
      if (catalogEvent.regionId !== region.regionId) continue;
      const waveEvent = waveEvents.get(catalogEvent.eventId);
      const windEvent = windEvents.get(catalogEvent.eventId);
      assert.ok(waveEvent && windEvent, `Missing derived event inputs for ${catalogEvent.eventId}`);
      const samples = mergeEventSamples(region, catalogEvent, windEvent);
      assert.ok(samples.length > 0, `No paired samples for ${catalogEvent.eventId}`);
      const memories = Object.fromEntries(TRACKS.map(track => [track.id,
        buildMemories(samples, track.activeWeight, 1),
      ]));
      const stressMemory = buildMemories(samples, 0.5, 2);
      const evaluationSamples = samples.filter(sample => utc(sample.time) >= utc(waveEvent.peakTime));
      for (const sample of evaluationSamples) {
        const timeKey = utc(sample.time).getTime();
        for (const mode of ['waders', 'beach']) {
          const history = eventHistory(waveEvent, sample.time, samples);
          const context = contextFor(mode, sample, history, samples);
          const active = calculateRavScore(context);
          assert.equal(active.available, true);
          const variants = Object.fromEntries(TRACKS.map(track => {
            const result = evaluateRavScoreCandidateG(context, {
              variantId: track.id,
              memory: memories[track.id].get(timeKey),
            });
            assert.equal(result.available, true);
            return [track.id, result.score];
          }));
          const primaryMemory = memories['G-50-50-LIN'].get(timeKey);
          const primary = evaluateRavScoreCandidateG(context, {
            variantId: 'G-50-50-LIN', memory: primaryMemory,
          });
          const noDirectWind = evaluateRavScoreCandidateG(context, {
            variantId: 'G-50-50-NO-DIRECT-WIND', memory: primaryMemory,
          });
          const approvedModeVariant = evaluateRavScoreCandidateG(context, {
            variantId: 'G-50-50-NO-DIRECT-WIND-WADERS-LIMIT', memory: primaryMemory,
          });
          const noHistory = evaluateRavScoreCandidateG(context, {
            variantId: 'G-50-50-NO-DIRECT-WIND',
            memory: { current: 0, wave: 0, directWind: 0 },
          });
          const windStress = evaluateRavScoreCandidateG(context, {
            variantId: 'G-50-50-LIN', memory: stressMemory.get(timeKey),
          });
          const ablations = Object.fromEntries([
            'currentHistory', 'waveHistory', 'directWindHistory', 'totalCurrent', 'totalWave', 'totalWind',
          ].map(kind => [kind, evaluateRavScoreCandidateG(withAblation(context, kind), {
            variantId: 'G-50-50-LIN',
            memory: ablatedMemory(primaryMemory, kind),
            includeDirectWind: kind !== 'directWindHistory' && kind !== 'totalWind',
          }).score]));
          const gainSensitivity = Object.fromEntries(HISTORY_GAINS.map(gain => [String(gain),
            evaluateRavScoreCandidateG(context, {
              variantId: 'G-50-50-LIN', memory: primaryMemory, historyGain: gain,
            }).score,
          ]));
          const mixSensitivity = Object.fromEntries(HISTORY_MIXES.map(item => [item.id,
            evaluateRavScoreCandidateG(context, {
              variantId: 'G-50-50-LIN', memory: primaryMemory,
              historyMix: item.mix, includeDirectWind: item.includeDirectWind,
            }).score,
          ]));
          const weightSensitivity = Object.fromEntries(WEIGHT_PRIORS.map(weights => [weights.id,
            scoreWithWeights(primary, weights),
          ]));
          const activePublicRules = publicRules.filter(rule => rule.status === 'active');
          const publicRuleResult = evaluateRules({
            rules: activePublicRules,
            zone: context.zone,
            mode,
            weather: context.weather,
            history: context.history,
            baseScore: primary.score,
          });
          rows.push({
            classification: catalogEvent.classification,
            mode,
            capacity: movementCapacityClass(sample),
            active: active.baseScore,
            candidateE: primary.candidateScores.candidateE,
            variants,
            noDirectWind: noDirectWind.score,
            approvedModeScore: approvedModeVariant.score,
            approvedHuntability: approvedModeVariant.components.huntability,
            approvedScoreCalculation: approvedModeVariant.scoreCalculation,
            windStress: windStress.score,
            ablations,
            gainSensitivity,
            mixSensitivity,
            weightSensitivity,
            modeCoupling: Object.fromEntries(MODE_COUPLING_POLICIES.map(policy => [
              policy.id,
              evaluateModeHuntabilityCoupling(noDirectWind, mode, policy.id).score,
            ])),
            huntability: primary.components.huntability,
            mobilisation: noDirectWind.components.mobilisation,
            preferredTransportAndDelivery: noDirectWind.components.transportAndDelivery,
            preferredGateFactor: noDirectWind.gateFactor,
            preferredScoreCalculation: noDirectWind.scoreCalculation,
            currentArrowRegime: currentArrowRegime(sample.currentOnshoreAlignment),
            historyDirection: historyDirection(noDirectWind.diagnostics.candidateGDirectionalHistorySignal),
            historyScoreDelta: noDirectWind.score - noHistory.score,
            finalCandidateG: publicRuleResult.score,
            publicRuleBlocked: publicRuleResult.blocked,
            publicRuleMatchCount: publicRuleResult.matches.length,
            activeRuleCount: activePublicRules.length,
          });
        }
      }
    }
  }

  assert.ok(rows.length > 0);
  assert.ok(rows.every(row => Object.values(row.variants).every(score => score >= 0 && score <= 100)));
  assert.ok(rows.every(row => row.approvedModeScore >= 0 && row.approvedModeScore <= 100));
  assert.ok(rows.filter(row => row.mode === 'beach')
    .every(row => row.approvedModeScore === row.noDirectWind));
  assert.ok(rows.filter(row => row.mode === 'waders')
    .every(row => row.approvedModeScore <= row.approvedHuntability));
  return {
    schemaVersion: '1.0.0',
    status: 'passed-private-candidate-g-decision-analysis',
    generatedAt: new Date().toISOString(),
    method: 'causal-capacity-preserving-candidate-g-replay-on-private-derived-event-windows',
    candidate: {
      publicScoreChanged: false,
      productionActivationAllowed: false,
      weights: { huntability: 0.20, transportAndDelivery: 0.45, mobilisation: 0.35 },
      historyMix: CANDIDATE_G_HISTORY_MIX,
      historyGain: 0.40,
      variants: Object.values(CANDIDATE_G_VARIANTS),
      modeCouplingPolicies: MODE_COUPLING_POLICIES,
      capacityContract: 'history-multiplies-existing-transport-and-delivery-and-cannot-create-a-zero-capacity-path',
      physicalBottleneck: 'same-mild-gate-as-candidate-e-recomputed-after-history-modulation',
    },
    historicalWindowCount: forcing.enrichedEventCount,
    regionCount: forcing.regionCount,
    evaluationCount: rows.length,
    aggregate: aggregate(rows),
    evidenceScope: {
      historicalReplay: true,
      canonicalNationalScenarios: false,
      freshNationalPrivateShadow: false,
      versionedPublicExpertRulesApplied: true,
      freshCentralHydratedExpertRulesApplied: false,
      findOutcomeCalibration: false,
    },
    interpretationGuards: [
      'SCORE_IS_NOT_SAFETY_ADVICE',
      'HUNTABILITY_HAS_MODE_DEPENDENT_FINAL_SCORE_EFFECT',
      'DIRECT_WIND_IS_A_CAPPED_RESEARCH_PRIOR_AND_HAS_A_MANDATORY_NO_DIRECT_CONTROL',
      'TOTAL_WIND_ABLATION_INCLUDES_HUNTABILITY_AND_MOBILISATION_PATHS',
      'TOTAL_WAVE_ABLATION_INCLUDES_HUNTABILITY_AND_MOBILISATION_PATHS',
    ],
    limitations: [
      'FOUR_SENTINEL_COASTS_ONLY',
      'TWELVE_WAVE_SELECTED_2024_WINDOWS',
      'DMI_STATION_WIND_DOES_NOT_REPRESENT_LOCAL_MICROSCALE',
      'FRESH_CENTRAL_HYDRATED_EXPERT_RULES_NOT_AVAILABLE_LOCALLY',
      'NO_COMPLETE_TRIP_OR_FIND_OUTCOMES',
      'MODEL_COMPONENTS_AND_HISTORY_GAIN_ARE_RESEARCH_PRIORS',
      'EVENT_CLASS_IS_DIRECTIONAL_NOT_DELIVERY_STRENGTH',
      'NATIONAL_PRIVATE_SHADOW_REQUIRES_CENTRAL_HYDRATED_INPUT',
    ],
    rawUvStored: false,
    rawWeatherValuesStored: false,
    coordinateValuesStored: false,
    protectedGeometryRead: false,
    scoreImpact: false,
    publicRuntime: false,
    productionGeometryChanged: false,
    dmiFallbackChanged: false,
    automaticActivationAllowed: false,
  };
}

function fixture() {
  const classifications = ['onshore-delivery', 'offshore-removal', 'conflicting-wave-current', 'alongshore-mixed'];
  const forcing = {
    status: 'OK', rawUvStored: false, coordinateValuesStored: false,
    enrichedEventCount: 12, regionCount: 4, eventCatalog: [], regions: [],
  };
  const wave = { status: 'OK', selectedWaveWindows: [] };
  const wind = { eventCount: 12, scoreImpact: false, coordinateValuesStored: false, events: [] };
  const start = new Date('2024-01-01T00:00:00Z');
  for (let index = 0; index < 12; index += 1) {
    const classification = classifications[index % classifications.length];
    const regionIndex = index % 4;
    const regionId = `part-${regionIndex}`;
    const eventId = `event-${index}`;
    const peak = new Date(start.getTime() + index * 10 * 86_400_000 + 24 * 3_600_000);
    const outbound = classification === 'offshore-removal';
    const conflict = classification === 'conflicting-wave-current';
    const samples = [];
    for (let offset = -24; offset <= 72; offset += 1) {
      samples.push({
        time: new Date(peak.getTime() + offset * 3_600_000).toISOString(),
        waveHeightM: offset <= 0 ? 1.5 : 0.6,
        wavePeriodS: 7,
        waveOnshoreAlignment: outbound ? -0.8 : 0.8,
        currentSpeedMps: 0.3,
        currentOnshoreAlignment: outbound || conflict ? -0.8 : 0.8,
        seaLevelM: 0,
      });
    }
    forcing.eventCatalog.push({
      eventId, regionId, classification,
      windowStart: samples[0].time,
      windowEnd: samples.at(-1).time,
    });
    let region = forcing.regions.find(item => item.regionId === regionId);
    if (!region) {
      region = { regionId, samples: [] };
      forcing.regions.push(region);
    }
    region.samples.push(...samples);
    wave.selectedWaveWindows.push({
      eventId, partId: regionId,
      startTime: new Date(peak.getTime() - 6 * 3_600_000).toISOString(),
      peakTime: peak.toISOString(),
      endTime: new Date(peak.getTime() + 3 * 3_600_000).toISOString(),
    });
    wind.events.push({
      eventId,
      samples: samples.map(sample => ({
        time: sample.time,
        windSpeedMps: 8,
        windTowardOnshoreAlignment: outbound ? -0.8 : 0.8,
      })),
    });
  }
  for (const region of forcing.regions) {
    region.samples.sort((left, right) => utc(left.time) - utc(right.time));
  }
  return { forcing, wave, wind };
}

function summaryText(report) {
  const aggregate = report.aggregate;
  const primary = aggregate.variants['G-50-50-LIN'].overall;
  return [
    'Candidate G private decision analysis: OK',
    `Historical windows: ${report.historicalWindowCount}`,
    `Regions: ${report.regionCount}`,
    `Evaluations: ${report.evaluationCount}`,
    `Candidate G 50/50 mean: ${primary.mean}`,
    `Mean delta G 50/50 minus Candidate E: ${primary.meanDeltaFromBaseline}`,
    `Mean absolute 24h minus 48h: ${aggregate.trackComparisons.h24MinusH48.meanAbsoluteDelta}`,
    `Mean direct-wind contribution: ${aggregate.directWind.primaryMinusNoDirect.meanDelta}`,
    `Mean linear minus stress-wind difference: ${aggregate.directWind.linearMinusStress.meanDelta}`,
    `Wader low-huntability evaluations: ${aggregate.waderHuntability.lowHuntabilityEvaluations}`,
    `Owner-approved waders mean delta: ${aggregate.ownerApprovedModeVariant.wadersVsPreviousPreferred.meanDeltaFromBaseline}`,
    'Protected geometry read: no',
    'Coordinates/raw weather/raw U/V stored: no',
    'Public score impact: no',
  ].join('\n') + '\n';
}

function main() {
  const args = parseArguments(process.argv.slice(2));
  if (args.selfTest) {
    const sample = fixture();
    const report = compareDocuments(sample.forcing, sample.wave, sample.wind, []);
    assert.equal(report.status, 'passed-private-candidate-g-decision-analysis');
    assert.equal(report.historicalWindowCount, 12);
    assert.ok(report.evaluationCount > 0);
    assert.equal(report.protectedGeometryRead, false);
    assert.equal(report.scoreImpact, false);
    assert.equal(report.aggregate.waderHuntability.scoreIsSafetyAdvice, false);
    assert.equal(report.aggregate.ownerApprovedModeVariant.beachChangedCount, 0);
    assert.equal(report.aggregate.ownerApprovedModeVariant.wadersScoreAboveHuntabilityCount, 0);
    assert.equal(report.aggregate.productContractAudit.ownerApprovedVariantConsistency.mismatchCount, 0);
    for (const policy of MODE_COUPLING_POLICIES) {
      assert.equal(report.aggregate.modeCouplingSensitivity[policy.id]
        .beachVsPreferredCandidateG.meanAbsoluteDelta, 0);
    }
    assert.ok(report.aggregate.trackComparisons.h24MinusH48.evaluations > 0);
    const serialized = JSON.stringify(report).toLowerCase();
    for (const forbidden of ['waterpoint', 'landpoint', 'longitude', 'latitude', 'umps']) {
      assert.ok(!serialized.includes(forbidden));
    }
    console.log('OK: Candidate G decision analysis is deterministic, private, geometry-independent and score-neutral.');
    return;
  }
  if (!args.forcingPath || !args.wavePath || !args.windPath || !args.outputPath || !args.summaryPath) {
    throw new Error('Usage: analyze-ravscore-candidate-g.mjs forcing.json wave.json wind.json --output report.json --summary report.txt');
  }
  const forcing = JSON.parse(fs.readFileSync(args.forcingPath, 'utf8'));
  const wave = JSON.parse(fs.readFileSync(args.wavePath, 'utf8'));
  const wind = JSON.parse(fs.readFileSync(args.windPath, 'utf8'));
  const publicRules = [
    'rules/national-rules.json',
    'rules/local-rules.json',
    'rules/experimental-rules.json',
    'rules/admin-active-rules.json',
  ].flatMap(file => JSON.parse(fs.readFileSync(file, 'utf8')).rules || []);
  const report = compareDocuments(forcing, wave, wind, publicRules);
  fs.mkdirSync(path.dirname(args.outputPath), { recursive: true });
  fs.mkdirSync(path.dirname(args.summaryPath), { recursive: true });
  fs.writeFileSync(args.outputPath, JSON.stringify(report, null, 2) + '\n');
  fs.writeFileSync(args.summaryPath, summaryText(report));
  console.log(`Candidate G private decision analysis: ${report.evaluationCount} evaluations; score impact: no.`);
}

try {
  main();
} catch (error) {
  console.error(`Candidate G decision analysis failed: ${error.message}`);
  process.exitCode = 1;
}
