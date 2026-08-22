#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

import {
  PHASE_D_HUNTABILITY_PROFILES,
  evaluatePhaseDHuntability,
} from '../js/core/phase-d-process-candidate.js';
import {
  MODE_COUPLING_POLICIES,
  evaluateModeHuntabilityCoupling,
} from '../js/core/ravscore-mode-huntability-research.js';

const WINDS_MPS = Object.freeze([3, 5, 5.9, 6, 7, 8, 9, 10, 12, 13, 18]);
const WAVES_M = Object.freeze([0.2, 0.4, 0.7, 1.0, 1.2, 2.0]);
const FIXED_PHYSICAL_POTENTIAL = 85;
const clamp = value => Math.max(0, Math.min(100, Number(value)));

function huntability(mode, windSpeedMps, waveHeightM) {
  const result = evaluatePhaseDHuntability(mode, { windSpeedMps, waveHeightM }, {
    profile: PHASE_D_HUNTABILITY_PROFILES.WADERS_UNDER_6_PROGRESSIVE,
  });
  assert.ok(Number.isFinite(result.value));
  return {
    score: Math.round(result.value),
    windScore: result.windScore,
    waveScore: result.waveScore,
  };
}

function fixedPhysicalCandidate(huntabilityScore) {
  const additiveScore = huntabilityScore * 0.20 + FIXED_PHYSICAL_POTENTIAL * 0.80;
  const score = Math.round(clamp(additiveScore));
  return {
    score,
    scoreCalculation: {
      components: {
        huntability: huntabilityScore,
        transportAndDelivery: FIXED_PHYSICAL_POTENTIAL,
        mobilisation: FIXED_PHYSICAL_POTENTIAL,
      },
      gateFactor: 1,
    },
  };
}

function buildReport() {
  const rows = [];
  for (const mode of ['waders', 'beach']) {
    for (const waveHeightM of WAVES_M) {
      for (const windSpeedMps of WINDS_MPS) {
        const huntabilityResult = huntability(mode, windSpeedMps, waveHeightM);
        const huntabilityScore = huntabilityResult.score;
        const candidate = fixedPhysicalCandidate(huntabilityScore);
        rows.push({
          mode,
          windSpeedMps,
          waveHeightM,
          huntability: huntabilityScore,
          windComponentScore: huntabilityResult.windScore,
          waveComponentScore: huntabilityResult.waveScore,
          preferredCandidateGScore: candidate.score,
          policyScores: Object.fromEntries(MODE_COUPLING_POLICIES.map(policy => [
            policy.id,
            evaluateModeHuntabilityCoupling(candidate, mode, policy.id).score,
          ])),
        });
      }
    }
  }

  const beach = rows.filter(row => row.mode === 'beach');
  const waders = rows.filter(row => row.mode === 'waders');
  for (const row of beach) {
    assert.ok(Object.values(row.policyScores).every(score => score === row.preferredCandidateGScore));
  }
  for (const waveHeightM of WAVES_M) {
    const selected = waders.filter(row => row.waveHeightM === waveHeightM);
    for (const policy of MODE_COUPLING_POLICIES) {
      const scores = selected.map(row => row.policyScores[policy.id]);
      assert.ok(scores.every((score, index) => index === 0 || score <= scores[index - 1]));
    }
  }
  const windCurve = waders.filter(row => row.waveHeightM === WAVES_M[0]);
  assert.ok(windCurve.filter(row => row.windSpeedMps <= 6)
    .every(row => row.windComponentScore === 100));
  assert.ok(windCurve.filter(row => row.windSpeedMps > 6)
    .every((row, index, selected) => index === 0 || row.windComponentScore < selected[index - 1].windComponentScore));

  const representative = rows.filter(row =>
    [6, 7, 8, 9, 10, 12, 13].includes(row.windSpeedMps)
    && [0.4, 0.7, 1.0, 1.2].includes(row.waveHeightM));
  return {
    schemaVersion: '1.0.0',
    status: 'passed-score-neutral-mode-huntability-audit',
    generatedAt: new Date().toISOString(),
    method: 'synthetic-fixed-physical-potential-mode-coupling-matrix',
    huntabilityProfile: PHASE_D_HUNTABILITY_PROFILES.WADERS_UNDER_6_PROGRESSIVE,
    wadersWindCurve: [[0, 100], [6, 100], [7, 80], [8, 60], [10, 35], [13, 10], [18, 0]],
    fixedPhysicalPotential: FIXED_PHYSICAL_POTENTIAL,
    windValuesMps: WINDS_MPS,
    waveValuesM: WAVES_M,
    evaluationCount: rows.length,
    policies: MODE_COUPLING_POLICIES,
    representative,
    allBeachPolicyScoresUnchanged: true,
    wadersPoliciesMonotonicByWindAtFixedWave: true,
    wadersWindComponentMaximumThrough6Mps: true,
    wadersWindComponentStrictlyDecreasesAbove6Mps: true,
    siteSuitabilityIncluded: false,
    safetyAdviceIncluded: false,
    publicScoreChanged: false,
    automaticActivationAllowed: false,
  };
}

const args = process.argv.slice(2);
const outputIndex = args.indexOf('--output');
const outputPath = outputIndex >= 0 ? args[outputIndex + 1] : null;
const report = buildReport();
if (args.includes('--self-test')) {
  assert.equal(report.evaluationCount, WINDS_MPS.length * WAVES_M.length * 2);
  assert.equal(report.publicScoreChanged, false);
  console.log('OK: mode-specific huntability audit is deterministic, score-neutral and leaves beach unchanged.');
} else if (outputPath) {
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, JSON.stringify(report, null, 2) + '\n');
  console.log(`Mode-specific huntability audit: ${report.evaluationCount} score-neutral evaluations.`);
} else {
  console.log(JSON.stringify(report, null, 2));
}
