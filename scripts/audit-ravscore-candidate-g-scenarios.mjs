#!/usr/bin/env node
import assert from 'node:assert/strict';

import { evaluateRavScoreCandidateG } from '../js/core/ravscore-candidate-g.js';
import { buildBlendedRegimeMemory, normalizeMemoryTrackCausally } from '../js/core/ravscore-regime-memory.js';
import {
  MODE_COUPLING_POLICIES,
  evaluateModeHuntabilityCoupling,
} from '../js/core/ravscore-mode-huntability-research.js';

const TRACKS = Object.freeze({
  candidateG24: Object.freeze({ variantId: 'G-24H-LIN', activeWeight: 1 }),
  candidateG5050: Object.freeze({ variantId: 'G-50-50-LIN', activeWeight: 0.5 }),
  candidateG48: Object.freeze({ variantId: 'G-48H-LIN', activeWeight: 0 }),
});
const ROTATIONS = Object.freeze([0, 45, 90, 135, 180, 225, 270, 315]);
const normalise = value => (Number(value) % 360 + 360) % 360;
const round3 = value => Number(Number(value).toFixed(3));
const mean = values => values.reduce((sum, value) => sum + value, 0) / values.length;

const scenarios = Object.freeze([
  Object.freeze({ id: 'sustained-inbound', current: 0.3, wave: 1, period: 7, wind: 8, currentOffset: 0, waveOffset: 0, windOffset: 0, history: [[72, 1, 1, 1]], maxWave: 2, maxWind: 14, duration: 8, age: 8 }),
  Object.freeze({ id: 'sustained-outbound', current: 0.3, wave: 1, period: 7, wind: 8, currentOffset: 180, waveOffset: 180, windOffset: 180, history: [[72, -1, -1, -1]], maxWave: 2, maxWind: 14, duration: 8, age: 8 }),
  Object.freeze({ id: 'weak-short-reversal', current: 0.15, wave: 0.5, period: 6, wind: 4, currentOffset: 180, waveOffset: 180, windOffset: 180, history: [[48, 1, 1, 1], [1, -0.25, -0.25, -0.25]], maxWave: 2, maxWind: 14, duration: 8, age: 9 }),
  Object.freeze({ id: 'strong-sustained-reversal', current: 0.45, wave: 1.5, period: 7, wind: 12, currentOffset: 180, waveOffset: 180, windOffset: 180, history: [[48, 1, 1, 1], [24, -2, -2, -2]], maxWave: 2, maxWind: 14, duration: 8, age: 9 }),
  Object.freeze({ id: 'current-inbound-wave-outbound', current: 0.35, wave: 1.2, period: 7, wind: 7, currentOffset: 0, waveOffset: 180, windOffset: 90, history: [[48, 1, -1, 0]], maxWave: 2, maxWind: 14, duration: 8, age: 8 }),
  Object.freeze({ id: 'wave-inbound-current-outbound', current: 0.35, wave: 1.2, period: 7, wind: 7, currentOffset: 180, waveOffset: 0, windOffset: 90, history: [[48, -1, 1, 0]], maxWave: 2, maxWind: 14, duration: 8, age: 8 }),
  Object.freeze({ id: 'alongshore-left', current: 0.3, wave: 0.8, period: 6, wind: 6, currentOffset: -90, waveOffset: -90, windOffset: -90, history: [[48, 0, 0, 0]], maxWave: 2, maxWind: 14, duration: 8, age: 8 }),
  Object.freeze({ id: 'alongshore-right', current: 0.3, wave: 0.8, period: 6, wind: 6, currentOffset: 90, waveOffset: 90, windOffset: 90, history: [[48, 0, 0, 0]], maxWave: 2, maxWind: 14, duration: 8, age: 8 }),
  Object.freeze({ id: 'inbound-memory-zero-capacity', current: 0, wave: 0, period: 0, wind: 3, currentOffset: 0, waveOffset: 0, windOffset: 0, history: [[72, 1, 1, 1]], maxWave: 2, maxWind: 14, duration: 8, age: 8 }),
  Object.freeze({ id: 'high-energy-wader-warning', current: 0.45, wave: 3, period: 8, wind: 18, currentOffset: 0, waveOffset: 0, windOffset: 0, history: [[48, 1, 1, 1]], maxWave: 3, maxWind: 18, duration: 10, age: 0 }),
  Object.freeze({ id: 'post-storm-huntable', current: 0.25, wave: 0.4, period: 6, wind: 4, currentOffset: 0, waveOffset: 0, windOffset: 0, history: [[48, 1, 1, 1]], maxWave: 3, maxWind: 18, duration: 10, age: 10 }),
]);

function memoryFor(scenario, activeWeight) {
  const samples = [];
  const start = Date.UTC(2026, 0, 1);
  let offset = 0;
  for (const [duration, current, wave, directWind] of scenario.history) {
    for (let hour = 0; hour < duration; hour += 1) {
      samples.push({
        time: new Date(start + offset * 3_600_000).toISOString(),
        current: current * 0.3,
        wave: wave * 7,
        directWind: directWind * 8,
      });
      offset += 1;
    }
  }
  const track = (key, scale) => normalizeMemoryTrackCausally(buildBlendedRegimeMemory(samples, {
    activeHalfLifeHours: 24,
    backgroundHalfLifeHours: 48,
    activeWeight,
    getTime: sample => sample.time,
    getForce: sample => sample[key],
  }), { initialScale: scale, minimumScale: scale }).at(-1).boundedState;
  return { current: track('current', 0.3), wave: track('wave', 7), directWind: track('directWind', 8) };
}

function contextFor(scenario, mode, onshore) {
  return {
    mode,
    zone: { id: 'rotation-invariant-canonical-zone', onshoreDirectionDeg: onshore },
    weather: {
      windSpeedMps: scenario.wind,
      windDirectionDeg: normalise(onshore + 180 + scenario.windOffset),
      waveHeightM: scenario.wave,
      wavePeriodS: scenario.period,
      waveDirectionDeg: normalise(onshore + 180 + scenario.waveOffset),
      currentSpeedMps: scenario.current,
      currentDirectionDeg: normalise(onshore + scenario.currentOffset),
      currentAlignment: Math.cos(scenario.currentOffset * Math.PI / 180),
    },
    history: {
      maxWave24hM: scenario.maxWave,
      maxWind24hMps: scenario.maxWind,
      strongEventDurationHours: scenario.duration,
      hoursSinceStrongEventEnd: scenario.age,
      hoursSinceHighEnergy: scenario.age,
    },
  };
}

function runAudit() {
  const rows = [];
  for (const scenario of scenarios) {
    const memories = Object.fromEntries(Object.entries(TRACKS).map(([key, track]) => [key,
      memoryFor(scenario, track.activeWeight),
    ]));
    for (const mode of ['waders', 'beach']) {
      for (const onshore of ROTATIONS) {
        const context = contextFor(scenario, mode, onshore);
        const results = Object.fromEntries(Object.entries(TRACKS).map(([key, track]) => [key,
          evaluateRavScoreCandidateG(context, { variantId: track.variantId, memory: memories[key] }),
        ]));
        const noDirect = evaluateRavScoreCandidateG(context, {
          variantId: 'G-50-50-NO-DIRECT-WIND', memory: memories.candidateG5050,
        });
        const ownerApproved = evaluateRavScoreCandidateG(context, {
          variantId: 'G-50-50-NO-DIRECT-WIND-WADERS-LIMIT', memory: memories.candidateG5050,
        });
        assert.ok(Object.values(results).every(result => result.available));
        rows.push({
          scenarioId: scenario.id,
          mode,
          onshore,
          candidateE: results.candidateG5050.candidateScores.candidateE,
          candidateG24: results.candidateG24.score,
          candidateG5050: results.candidateG5050.score,
          candidateG48: results.candidateG48.score,
          candidateGNoDirectWind: noDirect.score,
          ownerApprovedModeScore: ownerApproved.score,
          ownerApprovedHuntability: ownerApproved.components.huntability,
          modeCoupling: Object.fromEntries(MODE_COUPLING_POLICIES.map(policy => [
            policy.id,
            evaluateModeHuntabilityCoupling(noDirect, mode, policy.id).score,
          ])),
          huntability: results.candidateG5050.components.huntability,
          transportAndDelivery: results.candidateG5050.components.transportAndDelivery,
          scoreIsSafetyAdvice: results.candidateG5050.diagnostics.scoreIsSafetyAdvice,
        });
      }
    }
  }

  const summaries = scenarios.flatMap(scenario => ['waders', 'beach'].map(mode => {
    const selected = rows.filter(row => row.scenarioId === scenario.id && row.mode === mode);
    const value = key => round3(mean(selected.map(row => row[key])));
    return {
      scenarioId: scenario.id,
      mode,
      rotations: selected.length,
      candidateEMean: value('candidateE'),
      candidateG24Mean: value('candidateG24'),
      candidateG5050Mean: value('candidateG5050'),
      candidateG48Mean: value('candidateG48'),
      candidateGNoDirectWindMean: value('candidateGNoDirectWind'),
      ownerApprovedModeScoreMean: value('ownerApprovedModeScore'),
      ownerApprovedHuntabilityMean: value('ownerApprovedHuntability'),
      wadersHuntabilityCapMean: round3(mean(selected.map(row => row.modeCoupling['W-HUNTABILITY-CAP']))),
      huntabilityMean: value('huntability'),
      transportAndDeliveryMean: value('transportAndDelivery'),
      rotationInvariant: ['candidateG24', 'candidateG5050', 'candidateG48'].every(key =>
        new Set(selected.map(row => row[key])).size === 1),
    };
  }));
  const summary = (scenarioId, mode = 'beach') => summaries.find(row => row.scenarioId === scenarioId && row.mode === mode);
  const delta = (left, right, key = 'candidateG5050Mean', mode = 'beach') =>
    round3(summary(left, mode)[key] - summary(right, mode)[key]);
  const pairChecks = {
    inboundMinusOutboundBeach: delta('sustained-inbound', 'sustained-outbound'),
    inboundMinusOutboundWaders: delta('sustained-inbound', 'sustained-outbound', 'candidateG5050Mean', 'waders'),
    weakMinusStrongReversalBeach: delta('weak-short-reversal', 'strong-sustained-reversal'),
    alongshoreLeftMinusRightBeach: delta('alongshore-left', 'alongshore-right'),
    highEnergyWaderHuntabilityMinusPostStorm: delta('high-energy-wader-warning', 'post-storm-huntable', 'huntabilityMean', 'waders'),
    zeroCapacityTransportAndDelivery: summary('inbound-memory-zero-capacity').transportAndDeliveryMean,
    strongReversal24Minus48: round3(summary('strong-sustained-reversal').candidateG24Mean - summary('strong-sustained-reversal').candidateG48Mean),
    weakReversal24Minus48: round3(summary('weak-short-reversal').candidateG24Mean - summary('weak-short-reversal').candidateG48Mean),
    maximumDirectWindDelta: Math.max(...rows.map(row => Math.abs(row.candidateG5050 - row.candidateGNoDirectWind))),
    highEnergyWaderHuntability: summary('high-energy-wader-warning', 'waders').huntabilityMean,
    highEnergyWaderPreferredScore: summary('high-energy-wader-warning', 'waders').candidateGNoDirectWindMean,
    highEnergyWaderHuntabilityCappedScore: summary('high-energy-wader-warning', 'waders').wadersHuntabilityCapMean,
    highEnergyWaderOwnerApprovedScore: summary('high-energy-wader-warning', 'waders').ownerApprovedModeScoreMean,
    postStormWaderOwnerApprovedScore: summary('post-storm-huntable', 'waders').ownerApprovedModeScoreMean,
    postStormWaderHuntabilityCappedScore: summary('post-storm-huntable', 'waders').wadersHuntabilityCapMean,
    highEnergyWaderRequiresModeSpecificLimit:
      summary('high-energy-wader-warning', 'waders').huntabilityMean === 0
      && summary('high-energy-wader-warning', 'waders').candidateGNoDirectWindMean >= 55,
  };
  const report = {
    schemaVersion: '1.0.0',
    status: 'passed-score-neutral-candidate-g-canonical-national-scenarios',
    generatedAt: new Date().toISOString(),
    method: 'onshore-relative-canonical-coastal-archetypes-rotated-through-eight-national-direction-axes',
    scenarioCount: scenarios.length,
    rotationCount: ROTATIONS.length,
    modeCount: 2,
    evaluationCount: rows.length,
    scenarioDefinitions: scenarios.map(scenario => ({ id: scenario.id })),
    summaries,
    pairChecks,
    limitations: [
      'SYNTHETIC_SCENARIOS_ARE_CONTRACT_TESTS_NOT_OBSERVATIONAL_CALIBRATION',
      'ROTATIONS_VERIFY_DIRECTION_INVARIANCE_BUT_DO_NOT_REPRESENT_LOCAL_BATHYMETRY',
      'SCORE_IS_NOT_SAFETY_ADVICE',
    ],
    protectedGeometryRead: false,
    rawWeatherValuesStored: false,
    coordinateValuesStored: false,
    scoreChanged: false,
    publicRuntimeChanged: false,
    automaticActivationAllowed: false,
  };
  assert.equal(report.evaluationCount, scenarios.length * ROTATIONS.length * 2);
  assert.ok(summaries.every(item => item.rotationInvariant));
  assert.ok(pairChecks.inboundMinusOutboundBeach > 10 && pairChecks.inboundMinusOutboundWaders > 10);
  assert.ok(pairChecks.weakMinusStrongReversalBeach > 0, 'Weak short reversal must retain more prior delivery support than a strong sustained reversal');
  assert.equal(pairChecks.alongshoreLeftMinusRightBeach, 0);
  assert.equal(pairChecks.zeroCapacityTransportAndDelivery, 0, 'Inbound memory must not create transport at zero capacity');
  assert.ok(pairChecks.strongReversal24Minus48 <= 0, 'The 24h track must react at least as fast as the 48h track to a strong reversal');
  assert.ok(pairChecks.highEnergyWaderHuntabilityMinusPostStorm < 0, 'High energy must remain visibly less huntable for waders');
  assert.equal(pairChecks.highEnergyWaderRequiresModeSpecificLimit, true, 'High physical opportunity with zero wader huntability must require a mode-specific score limit');
  assert.equal(pairChecks.highEnergyWaderHuntabilityCappedScore, 0, 'Zero wader huntability must cap the experimental waders score at zero');
  assert.equal(pairChecks.highEnergyWaderOwnerApprovedScore, 0, 'The owner-approved mode variant must cap zero-huntability waders at zero');
  assert.ok(rows.filter(row => row.mode === 'waders')
    .every(row => row.ownerApprovedModeScore <= row.ownerApprovedHuntability));
  assert.ok(rows.filter(row => row.mode === 'beach')
    .every(row => row.ownerApprovedModeScore === row.candidateGNoDirectWind));
  assert.ok(rows.filter(row => row.mode === 'beach').every(row =>
    Object.values(row.modeCoupling).every(score => score === row.candidateGNoDirectWind)));
  assert.ok(rows.every(row => row.scoreIsSafetyAdvice === false));
  assert.ok(pairChecks.maximumDirectWindDelta <= 2, 'The capped direct-wind prior must remain minor in canonical scenarios');
  return report;
}

const report = runAudit();
if (process.argv.includes('--self-test')) {
  console.log('OK: Candidate G canonical national scenario contracts are rotation-invariant, capacity-preserving and score-neutral.');
} else {
  console.log(JSON.stringify(report, null, 2));
}
