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
  buildCurrentTransportPotential,
  CURRENT_TRANSPORT_POTENTIAL_PRIOR,
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
  Object.freeze({ id: 'G-20-50-30', huntability: 0.20, transportAndDelivery: 0.50, mobilisation: 0.30 }),
  Object.freeze({ id: 'F-15-50-35', huntability: 0.15, transportAndDelivery: 0.50, mobilisation: 0.35 }),
]);
const HISTORY_GAINS = Object.freeze([0.25, 0.40, 0.55]);
const CURRENT_LED_SENSITIVITY_PROFILES = Object.freeze([
  Object.freeze({ id: 'owner-outflow-reference', options: Object.freeze({}) }),
  Object.freeze({
    id: 'normal-current-0.03-to-0.15',
    options: Object.freeze({ deadbandNormalSpeedMps: 0.03, fullStrengthNormalSpeedMps: 0.15 }),
  }),
  Object.freeze({
    id: 'normal-current-0.02-to-0.12',
    options: Object.freeze({ deadbandNormalSpeedMps: 0.02, fullStrengthNormalSpeedMps: 0.12 }),
  }),
  Object.freeze({
    id: 'warm-start-50-diagnostic-edge',
    options: Object.freeze({ initialPotential: 50 }),
  }),
  Object.freeze({
    id: 'warm-start-100-diagnostic-upper-bound',
    options: Object.freeze({ initialPotential: 100 }),
  }),
  Object.freeze({
    id: 'neutral-passive-half-life-24',
    options: Object.freeze({ neutralPassiveHalfLifeHours: 24 }),
  }),
  Object.freeze({
    id: 'neutral-passive-half-life-48',
    options: Object.freeze({ neutralPassiveHalfLifeHours: 48 }),
  }),
  Object.freeze({
    id: 'warm-start-50-neutral-passive-half-life-24',
    options: Object.freeze({ initialPotential: 50, neutralPassiveHalfLifeHours: 24 }),
  }),
  Object.freeze({
    id: 'warm-start-50-neutral-passive-half-life-48',
    options: Object.freeze({ initialPotential: 50, neutralPassiveHalfLifeHours: 48 }),
  }),
  Object.freeze({
    id: 'warm-start-100-neutral-passive-half-life-24',
    options: Object.freeze({ initialPotential: 100, neutralPassiveHalfLifeHours: 24 }),
  }),
  Object.freeze({
    id: 'warm-start-100-neutral-passive-half-life-48',
    options: Object.freeze({ initialPotential: 100, neutralPassiveHalfLifeHours: 48 }),
  }),
  Object.freeze({
    id: 'normal-current-0.02-to-0.12-neutral-passive-half-life-48',
    options: Object.freeze({
      deadbandNormalSpeedMps: 0.02,
      fullStrengthNormalSpeedMps: 0.12,
      neutralPassiveHalfLifeHours: 48,
    }),
  }),
]);
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

function summarizeNumbers(values) {
  const finiteValues = values.map(Number).filter(Number.isFinite);
  return {
    count: finiteValues.length,
    mean: round3(mean(finiteValues)),
    median: round3(percentile(finiteValues, 0.5)),
    p10: round3(percentile(finiteValues, 0.1)),
    p90: round3(percentile(finiteValues, 0.9)),
    minimum: finiteValues.length ? Math.min(...finiteValues) : null,
    maximum: finiteValues.length ? Math.max(...finiteValues) : null,
  };
}

function historyBoundaryAudit(eventCatalog, waveEvents) {
  const windows = (eventCatalog || []).map(event => {
    const waveEvent = waveEvents.get(event.eventId);
    assert.ok(waveEvent, `Missing wave event for history boundary audit: ${event.eventId}`);
    const start = utc(event.windowStart);
    const peak = utc(waveEvent.peakTime);
    const end = utc(event.windowEnd);
    assert.ok(Number.isFinite(start.getTime()) && Number.isFinite(peak.getTime())
      && Number.isFinite(end.getTime()), `Invalid history boundary for ${event.eventId}`);
    assert.ok(start <= peak && peak <= end, `Peak outside history window for ${event.eventId}`);
    return {
      preRollHours: hours(peak - start),
      postRollHours: hours(end - peak),
      totalHours: hours(end - start),
    };
  });
  const preRollHours = windows.map(window => window.preRollHours);
  const countAtLeast = threshold => preRollHours.filter(value => value >= threshold).length;
  const minimumPreRollHours = preRollHours.length ? Math.min(...preRollHours) : 0;
  const residualPercent = halfLifeHours => round3(100 * (2 ** (-minimumPreRollHours / halfLifeHours)));
  return {
    windowCount: windows.length,
    preRollHours: summarizeNumbers(preRollHours),
    postRollHours: summarizeNumbers(windows.map(window => window.postRollHours)),
    totalHours: summarizeNumbers(windows.map(window => window.totalHours)),
    preRollWindowCounts: {
      atLeast24Hours: countAtLeast(24),
      atLeast48Hours: countAtLeast(48),
      atLeast72Hours: countAtLeast(72),
    },
    publicCurrentHistoryTargetHours: 72,
    windowsCoveringPublicTargetBeforeEvaluation: countAtLeast(72),
    replayStartStateObserved: false,
    passiveDecaySensitivityOnly: true,
    hypotheticalUnknownPriorResidualAtMinimumPreRollPercent: {
      neutralHalfLife24Hours: residualPercent(24),
      neutralHalfLife48Hours: residualPercent(48),
    },
  };
}

function windHuntabilityBand(value) {
  const wind = Number(value);
  if (wind <= 6) return 'at-most-6';
  if (wind < 8) return 'over-6-under-8';
  if (wind < 10) return '8-under-10';
  if (wind < 13) return '10-under-13';
  if (wind < 15) return '13-under-15';
  return '15-plus';
}

function waveHuntabilityBand(value) {
  const wave = Number(value);
  if (wave < 0.7) return 'under-0.7';
  if (wave < 1.2) return '0.7-under-1.2';
  if (wave < 2.5) return '1.2-under-2.5';
  return '2.5-plus';
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
  const calculation = candidate.scoreCalculation;
  const components = calculation.components;
  const additiveScore = components.huntability * weights.huntability
    + components.transportAndDelivery * weights.transportAndDelivery
    + components.mobilisation * weights.mobilisation;
  const uncoupledScore = Math.round(clamp(additiveScore * calculation.gateFactor));
  const maximumScore = calculation.modeHuntabilityMaximum;
  const score = maximumScore === null || maximumScore === undefined
    ? uncoupledScore
    : Math.min(uncoupledScore, Number(maximumScore));
  return {
    score,
    uncoupledScore,
    additiveScore,
    gateFactor: Number(calculation.gateFactor),
    maximumScore: maximumScore === null || maximumScore === undefined
      ? null
      : Number(maximumScore),
    capApplied: score < uncoupledScore,
  };
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

function buildCurrentTransportMemory(samples, options = {}) {
  const records = buildCurrentTransportPotential(samples, {
    ...options,
    getTime: sample => sample.time,
    getSpeed: sample => sample.currentSpeedMps,
    getAlignment: sample => sample.currentOnshoreAlignment,
  });
  return new Map(records.map(record => [utc(record.time).getTime(), {
    transportPotential: record.transportPotential,
    outboundEpisodeEffectiveHours: record.outboundEpisodeEffectiveHours,
    outboundEpisodeLossPoints: record.outboundEpisodeLossPoints,
    actualOutboundTransport: record.actualOutboundTransport,
    inboundNormalSpeedMps: record.inboundNormalSpeedMps,
    outboundNormalSpeedMps: record.outboundNormalSpeedMps,
    inboundStrength: record.inboundStrength,
    outboundStrength: record.outboundStrength,
    neutralPassiveHalfLifeHours: record.neutralPassiveHalfLifeHours,
    neutralPassiveDecayPoints: record.neutralPassiveDecayPoints,
  }]));
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
  const transportMemory = buildCurrentTransportMemory(samples);
  return new Map(samples.map((sample, index) => [utc(sample.time).getTime(), {
    current: current[index].boundedState,
    wave: wave[index].boundedState,
    directWind: directWind[index].boundedState,
    ...transportMemory.get(utc(sample.time).getTime()),
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
    ownerApprovedWeightSensitivity: {
      variantId: 'G-50-50-NO-DIRECT-WIND-WADERS-WIND-LED',
      referencePrior: 'G-20-50-30',
      priors: Object.fromEntries(WEIGHT_PRIORS.map(weights => {
        const waders = rows.filter(row => row.mode === 'waders');
        const beach = rows.filter(row => row.mode === 'beach');
        return [weights.id, {
          weights: {
            huntability: weights.huntability,
            transportAndDelivery: weights.transportAndDelivery,
            mobilisation: weights.mobilisation,
          },
          overallVsActive: summarizeScores(
            rows,
            row => row.approvedWeightSensitivity[weights.id].score,
            row => row.active,
          ),
          beachVsActive: summarizeScores(
            beach,
            row => row.approvedWeightSensitivity[weights.id].score,
            row => row.active,
          ),
          wadersVsActive: summarizeScores(
            waders,
            row => row.approvedWeightSensitivity[weights.id].score,
            row => row.active,
          ),
          vsApprovedVariant: summarizeDifference(
            rows,
            row => row.approvedWeightSensitivity[weights.id].score,
            row => row.approvedModeScore,
          ),
          wadersCapAppliedCount: waders.filter(row =>
            row.approvedWeightSensitivity[weights.id].capApplied).length,
          wadersScoreAboveHuntabilityCount: waders.filter(row =>
            row.approvedWeightSensitivity[weights.id].score > row.approvedHuntability).length,
          lowHuntabilityFairOrGoodCount: waders.filter(row =>
            row.approvedHuntability < 35
            && row.approvedWeightSensitivity[weights.id].score >= 55).length,
        }];
      })),
      higherHuntabilityPriorMinusLowerHuntabilityPrior: {
        overall: summarizeDifference(
          rows,
          row => row.approvedWeightSensitivity['E-25-40-35'].score,
          row => row.approvedWeightSensitivity['F-15-50-35'].score,
        ),
        beach: summarizeDifference(
          rows.filter(row => row.mode === 'beach'),
          row => row.approvedWeightSensitivity['E-25-40-35'].score,
          row => row.approvedWeightSensitivity['F-15-50-35'].score,
        ),
        waders: summarizeDifference(
          rows.filter(row => row.mode === 'waders'),
          row => row.approvedWeightSensitivity['E-25-40-35'].score,
          row => row.approvedWeightSensitivity['F-15-50-35'].score,
        ),
      },
      findOutcomeCalibration: false,
      automaticActivationAllowed: false,
    },
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
      variantId: 'G-50-50-NO-DIRECT-WIND-WADERS-WIND-LED',
      overallVsPreviousPreferred: summarizeScores(rows, row => row.approvedModeScore, row => row.noDirectWind),
      overallVsPreviousWadersLimit: summarizeScores(
        rows,
        row => row.approvedModeScore,
        row => row.previousWadersLimitScore,
      ),
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
        row => row.previousWadersLimitScore,
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
    currentLedRevision: {
      variantId: 'G-CURRENT-LED-OUTFLOW-8-WADERS-WIND-LED',
      overallVsPreviousPreferred: summarizeScores(
        rows,
        row => row.currentLedScore,
        row => row.approvedModeScore,
      ),
      beachVsPreviousPreferred: summarizeScores(
        rows.filter(row => row.mode === 'beach'),
        row => row.currentLedScore,
        row => row.approvedModeScore,
      ),
      wadersVsPreviousPreferred: summarizeScores(
        rows.filter(row => row.mode === 'waders'),
        row => row.currentLedScore,
        row => row.approvedModeScore,
      ),
      transportPotential: summarizeNumbers(rows.map(row => row.currentLedTransportPotential)),
      transportAndDelivery: summarizeNumbers(rows.map(row => row.currentLedTransportAndDelivery)),
      inboundNormalCurrentMps: summarizeNumbers(rows.map(row => row.currentLedInboundNormalSpeedMps)),
      outboundNormalCurrentMps: summarizeNumbers(rows.map(row => row.currentLedOutboundNormalSpeedMps)),
      actualOutboundTransportCount: rows.filter(row => row.currentLedActualOutboundTransport).length,
      parameterSensitivity: Object.fromEntries(CURRENT_LED_SENSITIVITY_PROFILES.map(profile => [
        profile.id,
        {
          options: profile.options,
          scoreVsOwnerOutflowReference: summarizeScores(
            rows,
            row => row.currentLedSensitivity[profile.id].score,
            row => row.currentLedSensitivity['owner-outflow-reference'].score,
          ),
          transportPotential: summarizeNumbers(
            rows.map(row => row.currentLedSensitivity[profile.id].transportPotential),
          ),
          transportAndDelivery: summarizeNumbers(
            rows.map(row => row.currentLedSensitivity[profile.id].transportAndDelivery),
          ),
          actualOutboundTransportCount: rows.filter(row =>
            row.currentLedSensitivity[profile.id].actualOutboundTransport).length,
          passiveNeutralDecay: summarizeNumbers(
            rows.map(row => row.currentLedSensitivity[profile.id].neutralPassiveDecayPoints),
          ),
          positivePassiveNeutralDecayCount: rows.filter(row =>
            row.currentLedSensitivity[profile.id].neutralPassiveDecayPoints > 0).length,
          positiveInboundStrengthCount: rows.filter(row =>
            row.currentLedSensitivity[profile.id].inboundStrength > 0).length,
          fullInboundStrengthCount: rows.filter(row =>
            row.currentLedSensitivity[profile.id].inboundStrength >= 1).length,
          positiveOutboundStrengthCount: rows.filter(row =>
            row.currentLedSensitivity[profile.id].outboundStrength > 0).length,
          fullOutboundStrengthCount: rows.filter(row =>
            row.currentLedSensitivity[profile.id].outboundStrength >= 1).length,
          byEventClassification: Object.fromEntries(
            [...new Set(rows.map(row => row.classification))].sort().map(classification => {
              const selected = rows.filter(row => row.classification === classification);
              return [classification, {
                evaluations: selected.length,
                score: summarizeNumbers(
                  selected.map(row => row.currentLedSensitivity[profile.id].score),
                ),
                transportPotential: summarizeNumbers(
                  selected.map(row => row.currentLedSensitivity[profile.id].transportPotential),
                ),
                actualOutboundTransportCount: selected.filter(row =>
                  row.currentLedSensitivity[profile.id].actualOutboundTransport).length,
              }];
            }),
          ),
        },
      ])),
      waveCanCreateTransport: false,
      waveLandingMaximumShare: 0.15,
      inboundPointsPerEffectiveStrongHour: 10,
      pointsLostPerEffectiveStrongOutboundHour: 8,
      actualOutboundTransportAfterEffectiveHours: 13,
      findOutcomeCalibration: false,
      automaticActivationAllowed: false,
    },
    windLedWadersHuntability: (() => {
      const waders = rows.filter(row => row.mode === 'waders');
      const compareBand = (key, value) => {
        const selected = waders.filter(row => row[key] === value);
        return selected.length ? {
          evaluations: selected.length,
          scoreVsPreviousWadersLimit: summarizeScores(
            selected,
            row => row.approvedModeScore,
            row => row.previousWadersLimitScore,
          ),
          huntabilityVsPreviousWadersLimit: summarizeScores(
            selected,
            row => row.approvedHuntability,
            row => row.previousWadersLimitHuntability,
          ),
        } : null;
      };
      return {
        evaluations: waders.length,
        windHardStopCount: waders.filter(row => row.approvedWindHardStopApplied).length,
        positiveWavePenaltyCount: waders.filter(row => row.approvedWavePenalty > 0).length,
        wavePenaltyPoints: summarizeNumbers(waders.map(row => row.approvedWavePenalty)),
        byWindBand: Object.fromEntries([
          'at-most-6', 'over-6-under-8', '8-under-10', '10-under-13', '13-under-15', '15-plus',
        ].map(band => [band, compareBand('windHuntabilityBand', band)])),
        byWaveBand: Object.fromEntries([
          'under-0.7', '0.7-under-1.2', '1.2-under-2.5', '2.5-plus',
        ].map(band => [band, compareBand('waveHuntabilityBand', band)])),
        waveCanOnlyReduceWindScore: true,
        maximumWaveDeductionShare: 0.20,
        windHardStopMps: 15,
      };
    })(),
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
  const explanationInconsistent = rows.filter(row => {
    const explanation = row.approvedResearchExplanation;
    const contributionSum = Object.values(explanation.components)
      .reduce((sum, component) => sum + Number(component.weightedContribution), 0);
    const expectedScoreMeaning = row.mode === 'waders'
      ? 'AMBER_OPPORTUNITY_FOR_WADERS_METHOD_LIMITED_BY_CURRENT_HUNTABILITY'
      : 'AMBER_OPPORTUNITY_FOR_BEACH_SEARCH';
    return Math.abs(contributionSum - Number(explanation.additiveScore)) > 1e-9
      || explanation.finalScore !== row.approvedModeScore
      || explanation.scoreMeaning !== expectedScoreMeaning
      || explanation.currentArrow.timeMeaning !== 'NOW'
      || explanation.directionalHistory.meaning !== 'CAUSAL_DIRECTIONAL_CONTEXT_BEFORE_NOW'
      || explanation.directionalHistory.canCreateTransportFromZeroCapacity !== false
      || explanation.siteSuitabilityIncluded !== false
      || explanation.safetyAdviceIncluded !== false
      || explanation.publicActivationAllowed !== false;
  });
  return {
    comparisonBaselineVariant: 'G-50-50-NO-DIRECT-WIND',
    ownerApprovedResearchVariant: 'G-50-50-NO-DIRECT-WIND-WADERS-WIND-LED',
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
    explanationContract: {
      checkedEvaluationCount: rows.length,
      mismatchCount: explanationInconsistent.length,
      componentContributionsUseExactValues: true,
      currentArrowMeaning: 'CURRENT_LOCAL_CURRENT_VECTOR_AT_SELECTED_CONTEXT_NOW',
      historyMeaning: 'CAUSAL_DIRECTIONAL_CONTEXT_BEFORE_NOW',
      wadersLimitIsVisible: true,
      siteSuitabilityIncluded: false,
      safetyAdviceIncluded: false,
      publicActivationAllowed: false,
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
  const boundaryAudit = historyBoundaryAudit(forcing.eventCatalog, waveEvents);
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
      const currentLedSensitivityMemories = Object.fromEntries(
        CURRENT_LED_SENSITIVITY_PROFILES.map(profile => [
          profile.id,
          buildCurrentTransportMemory(samples, profile.options),
        ]),
      );
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
          const previousWadersLimitVariant = evaluateRavScoreCandidateG(context, {
            variantId: 'G-50-50-NO-DIRECT-WIND-WADERS-LIMIT', memory: primaryMemory,
          });
          const approvedModeVariant = evaluateRavScoreCandidateG(context, {
            variantId: 'G-50-50-NO-DIRECT-WIND-WADERS-WIND-LED', memory: primaryMemory,
          });
          const currentLedVariant = evaluateRavScoreCandidateG(context, {
            variantId: 'G-CURRENT-LED-OUTFLOW-8-WADERS-WIND-LED', memory: primaryMemory,
          });
          const currentLedSensitivity = Object.fromEntries(
            CURRENT_LED_SENSITIVITY_PROFILES.map(profile => {
              const transportMemory = currentLedSensitivityMemories[profile.id].get(timeKey);
              const result = evaluateRavScoreCandidateG(context, {
                variantId: 'G-CURRENT-LED-OUTFLOW-8-WADERS-WIND-LED',
                memory: { ...primaryMemory, ...transportMemory },
              });
              return [profile.id, {
                score: result.score,
                transportPotential: result.diagnostics.candidateGCurrentLedTransportPotential,
                transportAndDelivery: result.components.transportAndDelivery,
                actualOutboundTransport: result.diagnostics.candidateGActualOutboundTransport,
                neutralPassiveDecayPoints: transportMemory.neutralPassiveDecayPoints,
                inboundStrength: transportMemory.inboundStrength,
                outboundStrength: transportMemory.outboundStrength,
              }];
            }),
          );
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
            scoreWithWeights(primary, weights).score,
          ]));
          const approvedWeightSensitivity = Object.fromEntries(WEIGHT_PRIORS.map(weights => [weights.id,
            scoreWithWeights(approvedModeVariant, weights),
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
            previousWadersLimitScore: previousWadersLimitVariant.score,
            previousWadersLimitHuntability: previousWadersLimitVariant.components.huntability,
            approvedModeScore: approvedModeVariant.score,
            approvedHuntability: approvedModeVariant.components.huntability,
            approvedWavePenalty: approvedModeVariant.diagnostics.candidateGHuntabilityWavePenalty ?? 0,
            approvedWindHardStopApplied: approvedModeVariant.diagnostics.candidateGHuntabilityWindHardStopApplied,
            currentLedScore: currentLedVariant.score,
            currentLedHuntability: currentLedVariant.components.huntability,
            currentLedTransportPotential: currentLedVariant.diagnostics.candidateGCurrentLedTransportPotential,
            currentLedTransportAndDelivery: currentLedVariant.components.transportAndDelivery,
            currentLedActualOutboundTransport: currentLedVariant.diagnostics.candidateGActualOutboundTransport,
            currentLedInboundNormalSpeedMps: primaryMemory.inboundNormalSpeedMps,
            currentLedOutboundNormalSpeedMps: primaryMemory.outboundNormalSpeedMps,
            currentLedSensitivity,
            windHuntabilityBand: windHuntabilityBand(context.weather.windSpeedMps),
            waveHuntabilityBand: waveHuntabilityBand(context.weather.waveHeightM),
            approvedScoreCalculation: approvedModeVariant.scoreCalculation,
            approvedResearchExplanation: approvedModeVariant.researchExplanation,
            windStress: windStress.score,
            ablations,
            gainSensitivity,
            mixSensitivity,
            weightSensitivity,
            approvedWeightSensitivity,
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
  assert.ok(rows.every(row => row.currentLedScore >= 0 && row.currentLedScore <= 100));
  assert.ok(rows.every(row =>
    row.currentLedSensitivity['owner-outflow-reference'].score === row.currentLedScore));
  assert.ok(rows.filter(row => row.mode === 'beach')
    .every(row => row.approvedModeScore === row.noDirectWind));
  assert.ok(rows.filter(row => row.mode === 'waders')
    .every(row => row.approvedModeScore <= row.approvedHuntability));
  assert.ok(rows.filter(row => row.mode === 'waders')
    .every(row => row.currentLedScore <= row.currentLedHuntability));
  return {
    schemaVersion: '1.1.0',
    status: 'passed-private-candidate-g-decision-analysis',
    generatedAt: new Date().toISOString(),
    method: 'causal-capacity-preserving-candidate-g-replay-on-private-derived-event-windows',
    candidate: {
      publicScoreChanged: false,
      productionActivationAllowed: false,
      weights: { huntability: 0.20, transportAndDelivery: 0.50, mobilisation: 0.30 },
      historyMix: CANDIDATE_G_HISTORY_MIX,
      historyGain: 0.40,
      variants: Object.values(CANDIDATE_G_VARIANTS),
      modeCouplingPolicies: MODE_COUPLING_POLICIES,
      capacityContract: 'history-multiplies-existing-transport-and-delivery-and-cannot-create-a-zero-capacity-path',
      physicalBottleneck: 'same-mild-gate-as-candidate-e-recomputed-after-history-modulation',
      currentLedRevision: {
        variantId: 'G-CURRENT-LED-OUTFLOW-8-WADERS-WIND-LED',
        transportDriver: 'coast-normal-current-only',
        referencePrior: CURRENT_TRANSPORT_POTENTIAL_PRIOR,
        parameterSensitivityProfiles: CURRENT_LED_SENSITIVITY_PROFILES,
        inboundPointsPerEffectiveStrongHour: 10,
        outboundLossPointsPerEffectiveHour: 8,
        actualOutboundTransportAfterEffectiveHours: 13,
        waveRole: 'dependent-landing-only',
        waveCanCreateTransport: false,
      },
    },
    historicalWindowCount: forcing.enrichedEventCount,
    historyBoundaryAudit: boundaryAudit,
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
      'CURRENT_NORMAL_SPEED_THRESHOLDS_ARE_UNCALIBRATED_RESEARCH_PRIORS',
      'CURRENT_TRANSPORT_REPLAY_START_STATE_IS_NOT_OBSERVED',
      'EVENT_WINDOWS_HAVE_ONLY_TWENTY_FOUR_HOURS_BEFORE_EVALUATION',
      'PASSIVE_DECAY_PROFILES_ARE_BOUNDARY_SENSITIVITIES_NOT_SELECTED_PRODUCT_RULES',
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
    `Minimum pre-roll before evaluation: ${report.historyBoundaryAudit.preRollHours.minimum} hours`,
    `Windows with at least 72h pre-roll: ${report.historyBoundaryAudit.preRollWindowCounts.atLeast72Hours}`,
    `Regions: ${report.regionCount}`,
    `Evaluations: ${report.evaluationCount}`,
    `Candidate G 50/50 mean: ${primary.mean}`,
    `Mean delta G 50/50 minus Candidate E: ${primary.meanDeltaFromBaseline}`,
    `Mean absolute 24h minus 48h: ${aggregate.trackComparisons.h24MinusH48.meanAbsoluteDelta}`,
    `Mean direct-wind contribution: ${aggregate.directWind.primaryMinusNoDirect.meanDelta}`,
    `Mean linear minus stress-wind difference: ${aggregate.directWind.linearMinusStress.meanDelta}`,
    `Wader low-huntability evaluations: ${aggregate.waderHuntability.lowHuntabilityEvaluations}`,
    `Owner-approved waders mean delta: ${aggregate.ownerApprovedModeVariant.wadersVsPreviousPreferred.meanDeltaFromBaseline}`,
    `Current-led mean: ${aggregate.currentLedRevision.overallVsPreviousPreferred.mean}`,
    `Current-led mean transport potential: ${aggregate.currentLedRevision.transportPotential.mean}`,
    `Current-led lower-threshold mean transport potential: ${aggregate.currentLedRevision.parameterSensitivity['normal-current-0.02-to-0.12'].transportPotential.mean}`,
    `Current-led warm-start mean transport potential: ${aggregate.currentLedRevision.parameterSensitivity['warm-start-50-diagnostic-edge'].transportPotential.mean}`,
    `Current-led neutral 24h half-life mean transport potential: ${aggregate.currentLedRevision.parameterSensitivity['neutral-passive-half-life-24'].transportPotential.mean}`,
    `Current-led neutral 48h half-life mean transport potential: ${aggregate.currentLedRevision.parameterSensitivity['neutral-passive-half-life-48'].transportPotential.mean}`,
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
    assert.equal(report.historyBoundaryAudit.preRollHours.minimum, 24);
    assert.equal(report.historyBoundaryAudit.preRollHours.maximum, 24);
    assert.equal(report.historyBoundaryAudit.preRollWindowCounts.atLeast24Hours, 12);
    assert.equal(report.historyBoundaryAudit.preRollWindowCounts.atLeast48Hours, 0);
    assert.equal(report.historyBoundaryAudit.preRollWindowCounts.atLeast72Hours, 0);
    assert.equal(report.historyBoundaryAudit
      .hypotheticalUnknownPriorResidualAtMinimumPreRollPercent.neutralHalfLife24Hours, 50);
    assert.equal(report.historyBoundaryAudit
      .hypotheticalUnknownPriorResidualAtMinimumPreRollPercent.neutralHalfLife48Hours, 70.711);
    assert.ok(report.evaluationCount > 0);
    assert.equal(report.protectedGeometryRead, false);
    assert.equal(report.scoreImpact, false);
    assert.equal(report.aggregate.waderHuntability.scoreIsSafetyAdvice, false);
    assert.equal(report.aggregate.ownerApprovedModeVariant.beachChangedCount, 0);
    assert.equal(report.aggregate.ownerApprovedModeVariant.wadersScoreAboveHuntabilityCount, 0);
    assert.equal(report.aggregate.currentLedRevision.waveCanCreateTransport, false);
    assert.equal(report.aggregate.currentLedRevision.inboundPointsPerEffectiveStrongHour, 10);
    assert.equal(report.aggregate.currentLedRevision.pointsLostPerEffectiveStrongOutboundHour, 8);
    assert.equal(report.aggregate.currentLedRevision.actualOutboundTransportAfterEffectiveHours, 13);
    assert.equal(Object.keys(report.aggregate.currentLedRevision.parameterSensitivity).length,
      CURRENT_LED_SENSITIVITY_PROFILES.length);
    assert.equal(report.aggregate.productContractAudit.ownerApprovedVariantConsistency.mismatchCount, 0);
    assert.equal(report.aggregate.productContractAudit.explanationContract.mismatchCount, 0);
    assert.equal(report.aggregate.ownerApprovedWeightSensitivity
      .priors['G-20-50-30'].vsApprovedVariant.meanAbsoluteDelta, 0);
    for (const prior of Object.values(report.aggregate.ownerApprovedWeightSensitivity.priors)) {
      assert.equal(prior.wadersScoreAboveHuntabilityCount, 0);
      assert.equal(prior.lowHuntabilityFairOrGoodCount, 0);
    }
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
