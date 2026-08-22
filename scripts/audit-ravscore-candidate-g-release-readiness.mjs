#!/usr/bin/env node
import assert from 'node:assert/strict';

import {
  CANDIDATE_G_OUTFLOW_ZERO_EXPLANATION_DA,
  evaluateRavScoreCandidateG,
} from '../js/core/ravscore-candidate-g.js';
import { buildCurrentTransportPotential } from '../js/core/ravscore-regime-memory.js';

const VARIANT_ID = 'G-CURRENT-LED-OUTFLOW-8-WADERS-WIND-LED';
const HOUR_MS = 3_600_000;
const round3 = value => Number(Number(value).toFixed(3));

function contextFor(mode, weather = {}, history = {}) {
  return {
    mode,
    zone: { id: 'synthetic-release-readiness-zone', onshoreDirectionDeg: 90 },
    weather: {
      windSpeedMps: 6,
      windDirectionDeg: 270,
      waveHeightM: 1,
      wavePeriodS: 7,
      waveDirectionDeg: 270,
      currentSpeedMps: 0.2,
      currentDirectionDeg: 270,
      currentAlignment: -1,
      ...weather,
    },
    history: {
      maxWave24hM: 2,
      maxWind24hMps: 12,
      strongEventDurationHours: 10,
      hoursSinceStrongEventEnd: 8,
      hoursSinceHighEnergy: 8,
      ...history,
    },
  };
}

function evaluate(mode, memory, weather = {}, history = {}) {
  return evaluateRavScoreCandidateG(contextFor(mode, weather, history), {
    variantId: VARIANT_ID,
    memory,
  });
}

function hourlySamples({ hours, speedMps, alignment, verified = true }) {
  const start = Date.UTC(2026, 0, 1);
  return Array.from({ length: hours + 1 }, (_, hour) => ({
    time: new Date(start + hour * HOUR_MS).toISOString(),
    currentSpeedMps: speedMps,
    currentAlignment: alignment,
    verified,
  }));
}

function compactMemory(record) {
  return {
    transportPotential: record.transportPotential,
    outboundEpisodeEffectiveHours: record.outboundEpisodeEffectiveHours,
    outboundEpisodeLossPoints: record.outboundEpisodeLossPoints,
    actualOutboundTransport: record.actualOutboundTransport,
  };
}

function runAudit() {
  const fullOutboundTrack = buildCurrentTransportPotential(hourlySamples({
    hours: 13,
    speedMps: 0.20,
    alignment: -1,
  }), { initialPotential: 100 });
  const outboundCurve = fullOutboundTrack.map((record, hour) => {
    const memory = compactMemory(record);
    const beach = evaluate('beach', memory);
    const waders = evaluate('waders', memory);
    return {
      effectiveOutboundHours: hour,
      transportPotential: round3(record.transportPotential),
      transportAndDelivery: beach.components.transportAndDelivery,
      beachScore: beach.score,
      beachScoreBeforeOutflowExhaustionGate:
        beach.scoreCalculation.scoreBeforeOutflowExhaustionGate,
      wadersScore: waders.score,
      wadersScoreBeforeOutflowExhaustionGate:
        waders.scoreCalculation.scoreBeforeOutflowExhaustionGate,
      wadersHuntability: waders.components.huntability,
      actualOutboundTransport: record.actualOutboundTransport,
    };
  });

  const fullInboundTrack = buildCurrentTransportPotential(hourlySamples({
    hours: 10,
    speedMps: 0.20,
    alignment: 1,
  }));
  const inboundCurve = fullInboundTrack.map((record, hour) => ({
    effectiveInboundHours: hour,
    transportPotential: round3(record.transportPotential),
  }));

  const halfStrengthOutbound = buildCurrentTransportPotential(hourlySamples({
    hours: 1,
    speedMps: 0.125,
    alignment: -1,
  }), { initialPotential: 100 }).at(-1);
  const deadbandOutbound = buildCurrentTransportPotential(hourlySamples({
    hours: 1,
    speedMps: 0.05,
    alignment: -1,
  }), { initialPotential: 100 }).at(-1);
  const neutralReference = buildCurrentTransportPotential(hourlySamples({
    hours: 48,
    speedMps: 0,
    alignment: 0,
  }), { initialPotential: 100 }).at(-1);
  const neutral24 = buildCurrentTransportPotential(hourlySamples({
    hours: 24,
    speedMps: 0,
    alignment: 0,
  }), { initialPotential: 100, neutralPassiveHalfLifeHours: 24 }).at(-1);
  const neutral48 = buildCurrentTransportPotential(hourlySamples({
    hours: 48,
    speedMps: 0,
    alignment: 0,
  }), { initialPotential: 100, neutralPassiveHalfLifeHours: 48 }).at(-1);
  const missingPause = buildCurrentTransportPotential(hourlySamples({
    hours: 48,
    speedMps: 0.20,
    alignment: -1,
    verified: false,
  }), { initialPotential: 100, isVerified: sample => sample.verified === true }).at(-1);

  const zeroTransportMemory = {
    transportPotential: 0,
    outboundEpisodeEffectiveHours: 13,
    outboundEpisodeLossPoints: 100,
    actualOutboundTransport: true,
  };
  const waveOnlyBeach = evaluate('beach', zeroTransportMemory, {
    waveHeightM: 4,
    wavePeriodS: 10,
    waveDirectionDeg: 270,
  });
  const waveOnlyWaders = evaluate('waders', zeroTransportMemory, {
    waveHeightM: 4,
    wavePeriodS: 10,
    waveDirectionDeg: 270,
  });
  const initialZeroWithoutOutflow = evaluate('beach', {
    transportPotential: 0,
    outboundEpisodeEffectiveHours: 0,
    outboundEpisodeLossPoints: 0,
    actualOutboundTransport: false,
  });
  const calmLanding = evaluate('beach', {
    transportPotential: 100,
    outboundEpisodeEffectiveHours: 0,
    outboundEpisodeLossPoints: 0,
    actualOutboundTransport: false,
  }, { waveHeightM: 0, wavePeriodS: 0 });
  const activeLanding = evaluate('beach', {
    transportPotential: 100,
    outboundEpisodeEffectiveHours: 0,
    outboundEpisodeLossPoints: 0,
    actualOutboundTransport: false,
  }, { waveHeightM: 3, wavePeriodS: 8 });
  const highWindWaders = evaluate('waders', {
    transportPotential: 100,
    outboundEpisodeEffectiveHours: 0,
    outboundEpisodeLossPoints: 0,
    actualOutboundTransport: false,
  }, { windSpeedMps: 15, waveHeightM: 0.4 });
  const highWindBeach = evaluate('beach', {
    transportPotential: 100,
    outboundEpisodeEffectiveHours: 0,
    outboundEpisodeLossPoints: 0,
    actualOutboundTransport: false,
  }, { windSpeedMps: 15, waveHeightM: 0.4 });

  const finalOutbound = outboundCurve.at(-1);
  const report = {
    schemaVersion: '1.1.0',
    status: 'passed-score-neutral-candidate-g-release-readiness-audit',
    variantId: VARIANT_ID,
    modelVersion: waveOnlyBeach.modelVersion,
    generatedAt: new Date().toISOString(),
    outboundCurve,
    inboundCurve,
    boundaryChecks: {
      halfStrengthOneHourPotential: round3(halfStrengthOutbound.transportPotential),
      deadbandOneHourPotential: round3(deadbandOutbound.transportPotential),
      neutralReferenceAfter48Hours: round3(neutralReference.transportPotential),
      neutral24HalfLifeAfter24Hours: round3(neutral24.transportPotential),
      neutral48HalfLifeAfter48Hours: round3(neutral48.transportPotential),
      unverifiedAfter48Hours: round3(missingPause.transportPotential),
      waveOnlyTransportAndDelivery: waveOnlyBeach.components.transportAndDelivery,
      waveOnlyBeachScore: waveOnlyBeach.score,
      waveOnlyWadersScore: waveOnlyWaders.score,
      waveOnlyBeachMobilisation: waveOnlyBeach.components.mobilisation,
      waveOnlyBeachHuntability: waveOnlyBeach.components.huntability,
      initialZeroWithoutOutflowScore: initialZeroWithoutOutflow.score,
      initialZeroWithoutOutflowGateApplied:
        initialZeroWithoutOutflow.scoreCalculation.outflowExhaustionGateApplied,
      waveLandingMaximumTransportAndDeliveryDelta:
        activeLanding.components.transportAndDelivery - calmLanding.components.transportAndDelivery,
      highWindWadersScore: highWindWaders.score,
      highWindWadersHuntability: highWindWaders.components.huntability,
      highWindBeachScore: highWindBeach.score,
      finalTransportPotentialAfter13Hours: finalOutbound.transportPotential,
      finalBeachScoreAfter13Hours: finalOutbound.beachScore,
      finalWadersScoreAfter13Hours: finalOutbound.wadersScore,
    },
    productMeaning: {
      zeroAtThirteenAppliesTo: 'CURRENT_LED_TRANSPORT_POTENTIAL_AND_FINAL_CANDIDATE_SCORE',
      totalCandidateScoreAlsoForcedToZero: true,
      componentValuesRemainVisible: true,
      triggerRequiresActualOutboundTransport: true,
      explanationDa: CANDIDATE_G_OUTFLOW_ZERO_EXPLANATION_DA,
      ownerMeaningDecisionRequiredBeforePublicActivation: false,
    },
    explanationContract: {
      currentArrowTimeMeaning: waveOnlyBeach.researchExplanation.currentArrow.timeMeaning,
      historyTimeMeaning: waveOnlyBeach.researchExplanation.directionalHistory.meaning,
      waveCanCreateTransport: waveOnlyBeach.researchExplanation.currentLedTransport.waveCanCreateTransport,
      wadersUsesVisibleHuntabilityMaximum:
        highWindWaders.scoreCalculation.modeHuntabilityPolicy === 'VISIBLE_WADERS_HUNTABILITY_MAXIMUM',
      siteSuitabilityIncluded: waveOnlyBeach.researchExplanation.siteSuitabilityIncluded,
      safetyAdviceIncluded: waveOnlyBeach.researchExplanation.safetyAdviceIncluded,
      publicActivationAllowed: waveOnlyBeach.researchExplanation.publicActivationAllowed,
      outflowExhaustionGateApplied:
        waveOnlyBeach.researchExplanation.outflowExhaustion.applied,
      outflowExplanationDa:
        waveOnlyBeach.researchExplanation.outflowExhaustion.explanationDa,
    },
    activationGatesRemaining: [
      'CALIBRATED_COAST_NORMAL_CURRENT_THRESHOLDS',
      'APPROVED_INITIAL_RESERVOIR_AND_OPTIONAL_PASSIVE_DECAY',
      'REPRESENTATIVE_COMPLETE_TRIPS_OR_EQUIVALENT_STRONG_VALIDATION',
      'FRESH_NATIONAL_SCORE_NEUTRAL_SHADOW_WITH_FINAL_INPUT_CONTRACT',
      'CENTRAL_ADMIN_ROUNDTRIP_ROLLBACK_AND_FULL_PRODUCT_GATES',
      'EXPLICIT_OWNER_GO_NO_GO',
    ],
    syntheticInputsOnly: true,
    privateCacheRead: false,
    protectedDataRead: false,
    geometryRead: false,
    rawWeatherValuesStored: false,
    scoreChanged: false,
    publicRuntimeChanged: false,
    automaticActivationAllowed: false,
  };

  assert.deepEqual(
    outboundCurve.map(row => row.transportPotential),
    [100, 92, 84, 76, 68, 60, 52, 44, 36, 28, 20, 12, 4, 0],
  );
  assert.deepEqual(
    inboundCurve.map(row => row.transportPotential),
    [0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100],
  );
  assert.ok(outboundCurve.every((row, index) => index === 0
    || row.beachScore <= outboundCurve[index - 1].beachScore));
  assert.ok(outboundCurve.every((row, index) => index === 0
    || row.wadersScore <= outboundCurve[index - 1].wadersScore));
  assert.ok(outboundCurve.every(row => row.wadersScore <= row.wadersHuntability));
  assert.equal(outboundCurve[12].transportPotential, 4);
  assert.equal(finalOutbound.transportPotential, 0);
  assert.equal(finalOutbound.actualOutboundTransport, true);
  assert.equal(finalOutbound.beachScore, 0);
  assert.equal(finalOutbound.wadersScore, 0);
  assert.equal(halfStrengthOutbound.transportPotential, 96);
  assert.equal(deadbandOutbound.transportPotential, 100);
  assert.equal(neutralReference.transportPotential, 100);
  assert.ok(Math.abs(neutral24.transportPotential - 50) < 1e-9);
  assert.ok(Math.abs(neutral48.transportPotential - 50) < 1e-9);
  assert.equal(missingPause.transportPotential, 100);
  assert.equal(waveOnlyBeach.components.transportAndDelivery, 0);
  assert.equal(waveOnlyWaders.components.transportAndDelivery, 0);
  assert.ok(waveOnlyBeach.components.mobilisation > 0);
  assert.ok(waveOnlyBeach.components.huntability > 0);
  assert.ok(waveOnlyBeach.scoreCalculation.scoreBeforeOutflowExhaustionGate > 0);
  assert.equal(waveOnlyBeach.scoreCalculation.outflowExhaustionGateApplied, true);
  assert.equal(waveOnlyBeach.score, 0);
  assert.equal(waveOnlyWaders.score, 0);
  assert.ok(initialZeroWithoutOutflow.score > 0);
  assert.equal(initialZeroWithoutOutflow.scoreCalculation.outflowExhaustionGateApplied, false);
  assert.ok(activeLanding.components.transportAndDelivery
    - calmLanding.components.transportAndDelivery <= 3);
  assert.equal(highWindWaders.score, 0);
  assert.equal(highWindWaders.components.huntability, 0);
  assert.ok(highWindBeach.score > 0);
  assert.equal(report.explanationContract.currentArrowTimeMeaning, 'NOW');
  assert.equal(report.explanationContract.waveCanCreateTransport, false);
  assert.equal(report.explanationContract.wadersUsesVisibleHuntabilityMaximum, true);
  assert.equal(report.explanationContract.siteSuitabilityIncluded, false);
  assert.equal(report.explanationContract.safetyAdviceIncluded, false);
  assert.equal(report.explanationContract.publicActivationAllowed, false);
  assert.equal(report.explanationContract.outflowExhaustionGateApplied, true);
  assert.equal(report.explanationContract.outflowExplanationDa,
    CANDIDATE_G_OUTFLOW_ZERO_EXPLANATION_DA);
  assert.equal(report.modelVersion,
    'RRS-CANDIDATE-G-CURRENT-LED-OUTFLOW-8-RESEARCH-2');
  assert.equal(report.scoreChanged, false);
  assert.equal(report.publicRuntimeChanged, false);
  assert.equal(report.automaticActivationAllowed, false);
  return report;
}

const report = runAudit();
if (process.argv.includes('--self-test')) {
  console.log('OK: Candidate G release-readiness boundaries are explicit, monotone and score-neutral; actual outbound exhaustion forces only the diagnostic Candidate G final score to zero.');
} else {
  console.log(JSON.stringify(report, null, 2));
}
