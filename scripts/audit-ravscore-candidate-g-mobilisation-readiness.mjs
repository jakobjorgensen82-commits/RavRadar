#!/usr/bin/env node
import assert from 'node:assert/strict';

import {
  CANDIDATE_G_VARIANTS,
  evaluateRavScoreCandidateG,
} from '../js/core/ravscore-candidate-g.js';
import {
  WAVE_MOBILISATION_RECOMMENDED_RESEARCH_PROFILE,
  buildWaveMobilisationPotential,
} from '../js/core/ravscore-mobilisation-memory.js';

const VARIANT_ID = 'G-CURRENT-LED-WAVE-MOBILISATION-WADERS-WIND-LED';
const HOUR_MS = 3_600_000;
const round3 = value => Number(Number(value).toFixed(3));

function hourly(count, waveHeightM, wavePeriodS, start = Date.UTC(2026, 0, 1)) {
  return Array.from({ length: count }, (_, index) => ({
    time: new Date(start + index * HOUR_MS).toISOString(),
    waveHeightM,
    wavePeriodS,
  }));
}

function candidateContext(mode = 'beach', weather = {}, zone = {}) {
  return {
    mode,
    zone: {
      id: 'synthetic-mobilisation-readiness-zone',
      onshoreDirectionDeg: 90,
      ...zone,
    },
    weather: {
      windSpeedMps: 6,
      windDirectionDeg: 270,
      waveHeightM: 1,
      wavePeriodS: 7,
      waveDirectionDeg: 270,
      currentSpeedMps: 0.15,
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
    },
  };
}

function candidateMemory(record, transport = {}) {
  return {
    transportPotential: 70,
    outboundEpisodeEffectiveHours: 0,
    outboundEpisodeLossPoints: 0,
    actualOutboundTransport: false,
    mobilisationPotential: record.mobilisationPotential,
    waveEnergyProxy: record.waveEnergyProxy,
    waveEnergyScore: record.waveEnergyScore,
    waveMobilisationTransition: record.transition,
    waveMobilisationBuildHalfLifeHours: record.buildHalfLifeHours,
    waveMobilisationDecayHalfLifeHours: record.decayHalfLifeHours,
    ...transport,
  };
}

function evaluate(record, { mode = 'beach', weather = {}, zone = {}, transport = {} } = {}) {
  return evaluateRavScoreCandidateG(candidateContext(mode, weather, zone), {
    variantId: VARIANT_ID,
    memory: candidateMemory(record, transport),
  });
}

function runAudit() {
  const oneHighHour = buildWaveMobilisationPotential(hourly(1, 2, 8)).at(-1);
  const fourModerateHours = buildWaveMobilisationPotential(hourly(4, 0.8, 6)).at(-1);
  const twelveHighHours = buildWaveMobilisationPotential(hourly(12, 2, 8));
  const built = twelveHighHours.at(-1);
  const quietStart = new Date(new Date(built.time).getTime() + HOUR_MS).getTime();
  const quiet48 = buildWaveMobilisationPotential(hourly(48, 0, 3, quietStart), {
    initialState: built.continuationState,
  });
  const afterQuiet = quiet48.at(-1);

  const uninterrupted = buildWaveMobilisationPotential(hourly(24, 1.5, 7));
  const firstRun = buildWaveMobilisationPotential(hourly(9, 1.5, 7));
  const continued = buildWaveMobilisationPotential(
    hourly(24, 1.5, 7).slice(9),
    { initialState: firstRun.at(-1).continuationState },
  );

  const missing = buildWaveMobilisationPotential([
    { time: '2026-01-01T00:00:00Z', waveHeightM: 1.5, wavePeriodS: 7 },
    { time: '2026-01-01T01:00:00Z', waveHeightM: null, wavePeriodS: null },
  ]);

  const base = evaluate(built);
  const changedWindAndCurrent = evaluate(built, {
    weather: { windSpeedMps: 14, currentSpeedMps: 1.2 },
  });
  const changedStaticSite = evaluate(built, {
    zone: {
      depthClass: 'synthetic-other',
      seabedClass: 'synthetic-other',
      reefClass: 'synthetic-other',
    },
  });
  const exhausted = evaluate(built, {
    transport: {
      transportPotential: 0,
      outboundEpisodeEffectiveHours: 13,
      outboundEpisodeLossPoints: 100,
      actualOutboundTransport: true,
    },
  });

  const report = {
    schemaVersion: '1.0.0',
    status: 'passed-score-neutral-candidate-g-mobilisation-readiness-audit',
    variantId: VARIANT_ID,
    modelVersion: CANDIDATE_G_VARIANTS[VARIANT_ID].modelId,
    generatedAt: new Date().toISOString(),
    profile: WAVE_MOBILISATION_RECOMMENDED_RESEARCH_PROFILE,
    canonicalChecks: {
      oneHighHourPotential: round3(oneHighHour.mobilisationPotential),
      fourModerateHoursPotential: round3(fourModerateHours.mobilisationPotential),
      twelveHighHoursPotential: round3(built.mobilisationPotential),
      afterFortyEightQuietHoursPotential: round3(afterQuiet.mobilisationPotential),
      fortyEightHourDecayRatio: round3(
        afterQuiet.mobilisationPotential / built.mobilisationPotential,
      ),
      uninterruptedFinalPotential: round3(uninterrupted.at(-1).mobilisationPotential),
      continuedFinalPotential: round3(continued.at(-1).mobilisationPotential),
      missingSampleHeldPotential: round3(missing.at(-1).mobilisationPotential),
      mobilisationComponent: base.components.mobilisation,
      mobilisationComponentAfterWindAndCurrentChange:
        changedWindAndCurrent.components.mobilisation,
      mobilisationComponentAfterStaticSiteChange: changedStaticSite.components.mobilisation,
      exhaustedTransportFinalScore: exhausted.score,
      exhaustedTransportVisibleMobilisation: exhausted.components.mobilisation,
    },
    componentContract: {
      waveHeightAndPeriodBuildOneCausalState: true,
      directWindScoreIncluded: false,
      currentSpeedScoreIncluded: false,
      additiveDurationScoreIncluded: false,
      staticSiteSuitabilityIncluded: false,
      missingWavePolicy: 'HOLD_LAST_DERIVED_STATE',
      continuationStateRequired: true,
      outflowExhaustionStillOverridesFinalScore: true,
    },
    limitations: [
      'RELATIVE_WAVE_ENERGY_PROXY_NOT_BOTTOM_SHEAR',
      'NO_NEARSHORE_DEPTH_OR_REEF_TRANSFORMATION_MODEL',
      'BUILD_AND_DECAY_HALF_LIVES_ARE_UNCALIBRATED_RESEARCH_PRIORS',
      'NO_FIND_OUTCOME_CALIBRATION',
    ],
    syntheticInputsOnly: true,
    privateCacheRead: false,
    protectedDataRead: false,
    geometryRead: false,
    scoreChanged: false,
    publicRuntimeChanged: false,
    automaticActivationAllowed: false,
  };

  assert.ok(fourModerateHours.mobilisationPotential > oneHighHour.mobilisationPotential);
  assert.ok(built.mobilisationPotential > fourModerateHours.mobilisationPotential);
  assert.ok(Math.abs(afterQuiet.mobilisationPotential / built.mobilisationPotential - 0.5) < 1e-9);
  assert.equal(continued.at(-1).mobilisationPotential, uninterrupted.at(-1).mobilisationPotential);
  assert.equal(missing.at(-1).mobilisationPotential, missing[0].mobilisationPotential);
  assert.equal(base.components.mobilisation, changedWindAndCurrent.components.mobilisation);
  assert.equal(base.components.mobilisation, changedStaticSite.components.mobilisation);
  assert.equal(base.researchExplanation.mobilisationMemory.directWindScoreIncluded, false);
  assert.equal(base.researchExplanation.mobilisationMemory.currentSpeedScoreIncluded, false);
  assert.equal(base.researchExplanation.siteSuitabilityIncluded, false);
  assert.equal(base.researchExplanation.safetyAdviceIncluded, false);
  assert.equal(base.researchExplanation.publicActivationAllowed, false);
  assert.equal(exhausted.score, 0);
  assert.ok(exhausted.components.mobilisation > 0);
  assert.equal(report.scoreChanged, false);
  assert.equal(report.publicRuntimeChanged, false);
  assert.equal(report.automaticActivationAllowed, false);
  return report;
}

const report = runAudit();
if (process.argv.includes('--self-test')) {
  console.log('OK: Candidate G mobilisering bygger én kontinuerlig bølgeenergitilstand uden vind-, strøm-, varigheds- eller sted-dobbelttælling.');
} else {
  console.log(JSON.stringify(report, null, 2));
}
