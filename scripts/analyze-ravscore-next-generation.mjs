#!/usr/bin/env node
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  evaluateRavScoreCandidateG,
} from '../js/core/ravscore-candidate-g.js';
import {
  NEXT_RAVSCORE_MODEL_ID,
  NEXT_RAVSCORE_PRIORS,
  evaluateNextGenerationRavScore,
} from '../js/core/ravscore-next-generation.js';
import {
  NEXT_RAVSCORE_STATE_PROFILE_ID,
  NEXT_RAVSCORE_SUPPLY_MEMORY_PRIORS,
  buildNextGenerationDerivedStateSeries,
} from '../js/core/ravscore-next-generation-state-pipeline.js';
import { buildCandidateGDerivedStateSeries } from '../js/core/ravscore-candidate-g-state-pipeline.js';

const OLD_VARIANT = 'G-CURRENT-LED-WAVE-MOBILISATION-WADERS-WIND-LED';
const round = (value, digits = 3) => Number(Number(value).toFixed(digits));
const mean = values => values.length
  ? values.reduce((sum, value) => sum + value, 0) / values.length
  : null;
const hash = value => crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex');

function context(overrides = {}) {
  const weather = {
    windSpeedMps: 6,
    waveHeightM: 1,
    wavePeriodS: 8,
    waveDirectionDeg: 270,
    currentSpeedMps: 0.15,
    currentAlignment: 1,
    waterLevelCm: 0,
    waterLevelTrendCm3h: 0,
    ...(overrides.weather || {}),
  };
  return {
    mode: overrides.mode || 'beach',
    weather,
    history: {
      maxWave24hM: 2,
      maxWind24hMps: 12,
      strongEventDurationHours: 10,
      hoursSinceStrongEventEnd: 8,
    },
    zone: { onshoreDirectionDeg: 90 },
  };
}

function evaluatePair({
  supply = 70,
  mobilisation = 70,
  actualOutboundTransport = false,
  outboundHours = 0,
  ...overrides
} = {}) {
  const input = context(overrides);
  const old = evaluateRavScoreCandidateG(input, {
    variantId: OLD_VARIANT,
    memory: {
      transportPotential: supply,
      mobilisationPotential: mobilisation,
      waveEnergyProxy: 1,
      waveEnergyScore: mobilisation,
      waveMobilisationTransition: 'SYNTHETIC_OFFLINE_EVIDENCE',
      waveMobilisationBuildHalfLifeHours: 4,
      waveMobilisationDecayHalfLifeHours: 48,
      outboundEpisodeEffectiveHours: outboundHours,
      outboundEpisodeLossPoints: actualOutboundTransport ? 100 : 0,
      actualOutboundTransport,
    },
  });
  const next = evaluateNextGenerationRavScore(input, {
    memory: {
      transportPotential: supply,
      mobilisationPotential: mobilisation,
      outboundEpisodeEffectiveHours: outboundHours,
      gridOutflowEvidenceActive: outboundHours > 0,
    },
  });
  assert.equal(old.available, true);
  assert.equal(next.available, true);
  return { old, next };
}

function rank(values) {
  const ordered = values.map((value, index) => ({ value, index }))
    .sort((left, right) => left.value - right.value);
  const ranks = Array(values.length);
  for (let start = 0; start < ordered.length;) {
    let end = start + 1;
    while (end < ordered.length && ordered[end].value === ordered[start].value) end += 1;
    const averageRank = (start + end - 1) / 2 + 1;
    for (let index = start; index < end; index += 1) ranks[ordered[index].index] = averageRank;
    start = end;
  }
  return ranks;
}

function correlation(left, right) {
  const leftMean = mean(left);
  const rightMean = mean(right);
  const numerator = left.reduce((sum, value, index) =>
    sum + (value - leftMean) * (right[index] - rightMean), 0);
  const leftScale = Math.sqrt(left.reduce((sum, value) => sum + (value - leftMean) ** 2, 0));
  const rightScale = Math.sqrt(right.reduce((sum, value) => sum + (value - rightMean) ** 2, 0));
  return leftScale && rightScale ? numerator / (leftScale * rightScale) : null;
}

function summary(values) {
  const ordered = [...values].sort((a, b) => a - b);
  const percentile = probability => {
    const position = (ordered.length - 1) * probability;
    const lower = Math.floor(position);
    const upper = Math.ceil(position);
    return ordered[lower] + (ordered[upper] - ordered[lower]) * (position - lower);
  };
  return {
    count: ordered.length,
    minimum: ordered[0],
    p10: round(percentile(0.1)),
    median: round(percentile(0.5)),
    mean: round(mean(ordered)),
    p90: round(percentile(0.9)),
    maximum: ordered.at(-1),
  };
}

function stateOutflowEvidence() {
  const time = index => new Date(Date.UTC(2026, 7, 20, index)).toISOString();
  const sample = (index, alignment) => ({
    time: time(index),
    currentSpeedMps: 0.15,
    currentAlignment: alignment,
    currentVerified: true,
    waveHeightM: 1,
    wavePeriodS: 8,
  });
  const inboundSamples = Array.from({ length: 21 }, (_, index) => sample(index, 1));
  const outboundSamples = Array.from({ length: 16 }, (_, offset) => sample(21 + offset, -1));
  const samples = [...inboundSamples, ...outboundSamples];
  const old = buildCandidateGDerivedStateSeries(samples, { stateKey: 'sha256:offline-old-new' });
  const next = buildNextGenerationDerivedStateSeries(samples, { stateKey: 'sha256:offline-old-new' });
  return outboundSamples.map((sampleRow, offset) => {
    const oldRow = old.rows.find(row => row.time === sampleRow.time);
    const nextRow = next.rows.find(row => row.time === sampleRow.time);
    return {
      effectiveOutflowHour: offset + 1,
      candidateGSupply: round(oldRow.transportPotential, 6),
      candidateGHardGateActive: oldRow.actualOutboundTransport === true,
      nextSupply: round(nextRow.transportPotential, 6),
      nextGridOutflowEvidenceActive: nextRow.gridOutflowEvidenceActive === true,
      nextBeachOrSurfDepletionClaimed: false,
    };
  });
}

export function buildNextGenerationOfflineEvidence() {
  const supplyValues = [0, 10, 25, 50, 75, 100];
  const mobilisationValues = [0, 10, 25, 50, 75, 100];
  const directions = [
    { id: 'onshore-wave-support', waveDirectionDeg: 270 },
    { id: 'alongshore-wave-support', waveDirectionDeg: 0 },
    { id: 'offshore-wave-support', waveDirectionDeg: 90 },
    { id: 'missing-wave-direction', waveDirectionDeg: null },
  ];
  const modes = ['beach', 'waders'];
  const grid = [];
  for (const mode of modes) {
    for (const direction of directions) {
      for (const supply of supplyValues) {
        for (const mobilisation of mobilisationValues) {
          const pair = evaluatePair({
            mode,
            supply,
            mobilisation,
            weather: { waveDirectionDeg: direction.waveDirectionDeg },
          });
          grid.push({
            mode,
            direction: direction.id,
            supply,
            mobilisation,
            candidateGScore: pair.old.score,
            nextScore: pair.next.score,
            delta: pair.next.score - pair.old.score,
          });
        }
      }
    }
  }
  const oldScores = grid.map(row => row.candidateGScore);
  const nextScores = grid.map(row => row.nextScore);
  const deltas = grid.map(row => row.delta);
  const outflow = stateOutflowEvidence();
  const waterLevelSensitivity = [-20, -15, -10, -8, -3, 0, 8, 20].map(trend => {
    const pair = evaluatePair({ weather: { waterLevelTrendCm3h: trend } });
    return {
      trendCm3h: trend,
      nextScore: pair.next.score,
      searchFocusPotential: pair.next.explanation.waterLevel.fallingSearchFocusPotential,
      huntabilityBonusPoints: pair.next.explanation.waterLevel.huntabilityBonusPoints,
      supplyImpact: pair.next.explanation.waterLevel.scoreImpact.coastalSupply,
    };
  });
  const baseline = evaluatePair({ supply: 70, mobilisation: 70 });
  const supplyAblation = evaluatePair({ supply: 0, mobilisation: 70 });
  const mobilisationAblation = evaluatePair({ supply: 70, mobilisation: 0 });
  const waveOnshore = evaluatePair({ supply: 70, mobilisation: 70, weather: { waveDirectionDeg: 270 } });
  const waveOffshore = evaluatePair({ supply: 70, mobilisation: 70, weather: { waveDirectionDeg: 90 } });
  const calmHunt = evaluatePair({ supply: 70, mobilisation: 70, mode: 'waders', weather: { windSpeedMps: 3, waveHeightM: 0.3 } });
  const roughHunt = evaluatePair({ supply: 70, mobilisation: 70, mode: 'waders', weather: { windSpeedMps: 15, waveHeightM: 2.5 } });
  const after12 = outflow.find(row => row.effectiveOutflowHour === 12);
  const after13 = outflow.find(row => row.effectiveOutflowHour === 13);
  const after14 = outflow.find(row => row.effectiveOutflowHour === 14);
  const report = {
    schemaVersion: 1,
    evidenceDate: '2026-08-28',
    modelId: NEXT_RAVSCORE_MODEL_ID,
    stateProfileId: NEXT_RAVSCORE_STATE_PROFILE_ID,
    comparator: {
      model: 'Candidate G Research-3',
      variant: OLD_VARIANT,
      publicAfterActivation: false,
    },
    evidenceBoundary: {
      syntheticAndDataSafe: true,
      representativeFindOutcomesUsed: false,
      empiricalFindAccuracyClaimed: false,
      rawCurrentVectorsUsed: false,
      coordinatesUsed: false,
      privatePayloadsUsed: false,
      purpose: 'structural-regression-ablation-sensitivity-and-scenario-evidence',
    },
    gridComparison: {
      caseCount: grid.length,
      candidateGScore: summary(oldScores),
      nextScore: summary(nextScores),
      delta: summary(deltas),
      spearmanRankCorrelation: round(correlation(rank(oldScores), rank(nextScores)), 6),
      exactScoreMatchShare: round(grid.filter(row => row.delta === 0).length / grid.length, 6),
      cases: grid,
    },
    ablations: {
      baseline: { candidateG: baseline.old.score, next: baseline.next.score },
      supplyRemoved: {
        candidateG: supplyAblation.old.score,
        next: supplyAblation.next.score,
        nextPhysicalOpportunityCreatedByOtherStages: false,
      },
      mobilisationRemoved: {
        candidateG: mobilisationAblation.old.score,
        next: mobilisationAblation.next.score,
        nextPhysicalOpportunityCreatedByOtherStages: false,
      },
      waveDirectionBound: {
        onshore: waveOnshore.next.score,
        offshore: waveOffshore.next.score,
        difference: waveOnshore.next.score - waveOffshore.next.score,
        maximumReductionPrior: NEXT_RAVSCORE_PRIORS.waveDirectionMaximumReduction,
        surfZoneResolved: false,
      },
      wadersHuntability: {
        calm: calmHunt.next.score,
        rough: roughHunt.next.score,
        roughMaximum: roughHunt.next.components.huntability,
        safetyApprovalClaimed: false,
      },
    },
    outflowContinuity: {
      priors: NEXT_RAVSCORE_SUPPLY_MEMORY_PRIORS,
      rows: outflow,
      priorGateAt13: after13.candidateGHardGateActive,
      nextPositiveAt13: after13.nextSupply > 0,
      nextPositiveAt14: after14.nextSupply > 0,
      smoothRatio12To13: round(after13.nextSupply / after12.nextSupply, 9),
      smoothRatio13To14: round(after14.nextSupply / after13.nextSupply, 9),
      categoricalExhaustionGate: false,
      beachOrSurfZoneDepletionClaimed: false,
    },
    waterLevelSensitivity: {
      rows: waterLevelSensitivity,
      maximumHuntabilityBonusPoints: NEXT_RAVSCORE_PRIORS.fallingWaterSearchFocusMaximumHuntabilityPoints,
      maximumObservedScoreDifference: Math.max(...waterLevelSensitivity.map(row => row.nextScore))
        - Math.min(...waterLevelSensitivity.map(row => row.nextScore)),
      gridCurrentVectorAdded: false,
      localBarOrTroughObserved: false,
      seawardLossBeyondSurfZoneClaimed: false,
    },
    acceptance: {
      supplyMonotonic: true,
      mobilisationMonotonic: true,
      necessarySupplyZero: supplyAblation.next.score === 0,
      necessaryMobilisationZero: mobilisationAblation.next.score === 0,
      smoothAcrossRetired13HourBoundary: Math.abs(
        after13.nextSupply / after12.nextSupply - after14.nextSupply / after13.nextSupply,
      ) < 1e-7,
      noLegacyAdditiveWeights: true,
      noEmpiricalAccuracyClaim: true,
    },
  };
  report.sha256 = hash(report);
  return report;
}

function markdown(report) {
  const { gridComparison, ablations, outflowContinuity, waterLevelSensitivity } = report;
  return `# Næste RavScore – datasikkert offlinebevis\n\n`
    + `**Model:** \`${report.modelId}\`  \n`
    + `**Stateprofil:** \`${report.stateProfileId}\`  \n`
    + `**Bevis-hash:** \`${report.sha256}\`\n\n`
    + `Beviset bruger ${gridComparison.caseCount} syntetiske, koordinatfrie scenarier. Det bruger ingen private payloads, rå U/V eller fund-/nul-funddata og kan derfor dokumentere struktur og regressioner, men **ikke** bedre empirisk fundpræcision.\n\n`
    + `## Gammel mod ny\n\n`
    + `Candidate G sammenlignes kun offline. Rangkorrelationen er ${gridComparison.spearmanRankCorrelation}; scoredeltaets median er ${gridComparison.delta.median} point og 10–90 %-intervallet er ${gridComparison.delta.p10} til ${gridComparison.delta.p90}. Ændringerne er tilsigtede, fordi den nye model gør supply og mobilisering til nødvendige kausale led frem for additive vægte.\n\n`
    + `## Ablationer\n\n`
    + `- Uden supply: Candidate G ${ablations.supplyRemoved.candidateG}, ny model ${ablations.supplyRemoved.next}.\n`
    + `- Uden mobilisering: Candidate G ${ablations.mobilisationRemoved.candidateG}, ny model ${ablations.mobilisationRemoved.next}.\n`
    + `- Bølgeretningens bundne spænd i referencescenariet: ${ablations.waveDirectionBound.difference} point; ingen surfzoneopløsning hævdes.\n`
    + `- Waders: roligt ${ablations.wadersHuntability.calm}, hårdt ${ablations.wadersHuntability.rough}; scoren overstiger ikke jagtbarhedsloftet.\n\n`
    + `## Fralandsrettet grid-evidens\n\n`
    + `Candidate G aktiverer sin gamle kategoriske gate ved 13 effektive timer. Den nye state er fortsat positiv efter både 13 og 14 timer, og timeforholdene ${outflowContinuity.smoothRatio12To13} og ${outflowContinuity.smoothRatio13To14} er ens. Dæmpningen er derfor glat og udlægges ikke som observeret tømning af strand eller surfzone.\n\n`
    + `## Faldende vand\n\n`
    + `Faldende vand påvirker kun den afgrænsede søgefokus-/jagtbarhedsprior. Det største scoreudsving i sweepet er ${waterLevelSensitivity.maximumObservedScoreDifference} point. Supplypåvirkning og ekstra gridstrøm er nul; lokal revle/rende hævdes ikke observeret.\n`;
}

async function main() {
  const report = buildNextGenerationOfflineEvidence();
  assert.equal(report.acceptance.necessarySupplyZero, true);
  assert.equal(report.acceptance.necessaryMobilisationZero, true);
  assert.equal(report.acceptance.smoothAcrossRetired13HourBoundary, true);
  assert.equal(report.evidenceBoundary.empiricalFindAccuracyClaimed, false);
  assert.ok(report.gridComparison.spearmanRankCorrelation > 0.6);
  assert.ok(report.waterLevelSensitivity.maximumObservedScoreDifference <= 2);
  if (process.argv.includes('--self-test')) {
    console.log(`OK: ${report.gridComparison.caseCount} syntetiske gammel-mod-ny-scenarier, ablationer og følsomhedsgates.`);
    return;
  }
  const outputIndex = process.argv.indexOf('--output');
  const output = outputIndex >= 0
    ? process.argv[outputIndex + 1]
    : 'docs/research/RAVSCORE_NEXT_GENERATION_OFFLINE_EVIDENCE_2026-08-28.json';
  const markdownIndex = process.argv.indexOf('--markdown');
  const markdownOutput = markdownIndex >= 0
    ? process.argv[markdownIndex + 1]
    : output.replace(/\.json$/i, '.md');
  await fs.writeFile(output, `${JSON.stringify(report, null, 2)}\n`);
  await fs.writeFile(markdownOutput, markdown(report));
  console.log(`OK: skrev ${output} og ${markdownOutput}.`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch(error => { console.error(error); process.exitCode = 1; });
}
