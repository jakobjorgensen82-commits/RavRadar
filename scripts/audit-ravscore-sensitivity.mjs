import assert from 'node:assert/strict';
import { calculateRavScore, SCORE_WEIGHTS } from '../js/core/score-engine.js';
import { compareScoreCandidates, SCORE_CANDIDATE_WEIGHTS } from '../js/core/score-candidates.js';

const selfTest = process.argv.includes('--self-test');
const clone = value => structuredClone(value);
const round = (value, digits = 3) => Number(Number(value).toFixed(digits));

const baseContext = mode => ({
  mode,
  zone: {
    id: 'SYNTHETIC-COAST',
    coastType: 'east',
    onshoreDirectionDeg: 90,
    shallowWater: false,
    reefs: false,
    seagrass: false,
  },
  weather: {
    windSpeedMps: 5,
    windDirectionDeg: 270,
    waveHeightM: 0.5,
    currentSpeedMps: 0.3,
    currentDirectionDeg: 90,
    waterLevelTrendCm3h: 4,
  },
  history: {
    maxWind24hMps: 10,
    maxWave24hM: 1,
    hoursSinceHighEnergy: 8,
  },
});

function setPath(context, path, value) {
  const parts = path.split('.');
  const target = parts.slice(0, -1).reduce((current, part) => current[part], context);
  target[parts.at(-1)] = value;
  return context;
}

function calculate(context) {
  const result = calculateRavScore(context);
  const candidates = compareScoreCandidates(result);
  return {
    available: result.available,
    score: result.score,
    level: result.level,
    components: result.available ? result.components : null,
    candidateScores: candidates.available ? candidates.scores : null,
    dominantPathway: result.explanation?.mobilisationDiagnostics?.dominantPathway || null,
    caps: result.explanation?.transportDiagnostics?.capsApplied?.map(cap => cap.reason) || [],
  };
}

const thresholdDefinitions = [
  { path: 'weather.windSpeedMps', values: [3, 6, 8, 13], epsilon: 0.001 },
  { path: 'weather.waveHeightM', values: [0.25, 0.3, 0.7, 1.2, 2.5], epsilon: 0.001 },
  { path: 'weather.currentSpeedMps', values: [0.12, 0.15, 0.65], epsilon: 0.001 },
  { path: 'weather.waterLevelTrendCm3h', values: [-8, -2, 2, 6, 8], epsilon: 0.001 },
  { path: 'history.maxWind24hMps', values: [9, 14], epsilon: 0.001 },
  { path: 'history.maxWave24hM', values: [1.5], epsilon: 0.001 },
  { path: 'history.hoursSinceHighEnergy', values: [3, 18, 48], epsilon: 0.001 },
  { path: 'weather.currentDirectionDifferenceDeg', values: [25, 55, 90, 130], epsilon: 0.001, directional: true },
];

function thresholdAudit(mode) {
  const rows = [];
  for (const definition of thresholdDefinitions) {
    for (const threshold of definition.values) {
      const values = [threshold - definition.epsilon, threshold, threshold + definition.epsilon];
      const results = values.map(value => {
        const context = baseContext(mode);
        if (definition.directional) context.weather.currentDirectionDeg = (context.zone.onshoreDirectionDeg + value) % 360;
        else setPath(context, definition.path, value);
        return calculate(context);
      });
      const componentJump = component => ({
        intoThreshold: results[1].components?.[component] - results[0].components?.[component] || 0,
        outOfThreshold: results[2].components?.[component] - results[1].components?.[component] || 0,
      });
      rows.push({
        mode,
        input: definition.path,
        threshold,
        scores: results.map(result => result.score),
        scoreJumpIntoThreshold: results[1].score - results[0].score,
        scoreJumpOutOfThreshold: results[2].score - results[1].score,
        componentJumps: Object.fromEntries(['huntability', 'transport', 'release'].map(component => [component, componentJump(component)])),
      });
    }
  }
  return rows;
}

const missingDefinitions = [
  { id: 'wind', paths: ['weather.windSpeedMps'] },
  { id: 'wave', paths: ['weather.waveHeightM'] },
  { id: 'current-speed', paths: ['weather.currentSpeedMps'] },
  { id: 'current-direction', paths: ['weather.currentDirectionDeg'] },
  { id: 'current-pair', paths: ['weather.currentSpeedMps', 'weather.currentDirectionDeg'] },
  { id: 'water-level-trend', paths: ['weather.waterLevelTrendCm3h'] },
  { id: 'historical-wind', paths: ['history.maxWind24hMps'] },
  { id: 'historical-wave', paths: ['history.maxWave24hM'] },
  { id: 'event-age', paths: ['history.hoursSinceHighEnergy'] },
];

function missingAudit(mode) {
  const baseline = calculate(baseContext(mode));
  return missingDefinitions.map(definition => {
    const context = baseContext(mode);
    for (const path of definition.paths) setPath(context, path, null);
    const result = calculate(context);
    return {
      mode,
      input: definition.id,
      available: result.available,
      score: result.score,
      deltaFromBaseline: result.available ? result.score - baseline.score : null,
      components: result.components,
      caps: result.caps,
    };
  });
}

const overlapDefinitions = [
  {
    id: 'current-wind-and-historical-wind',
    paths: ['weather.windSpeedMps', 'history.maxWind24hMps'],
    lows: [5, 5],
    highs: [10, 15],
    sharedRoutes: ['huntability', 'transport-via-wind-direction-is-separate', 'release'],
  },
  {
    id: 'current-wave-and-historical-wave',
    paths: ['weather.waveHeightM', 'history.maxWave24hM'],
    lows: [0.1, 0.5],
    highs: [1.6, 2],
    sharedRoutes: ['huntability', 'release-fresh', 'release-remobilisation'],
  },
  {
    id: 'current-speed-and-current-direction',
    paths: ['weather.currentSpeedMps', 'weather.currentDirectionDeg'],
    lows: [0.05, 270],
    highs: [0.3, 90],
    sharedRoutes: ['transport', 'release-remobilisation'],
  },
  {
    id: 'shallow-water-and-reef',
    paths: ['zone.shallowWater', 'zone.reefs'],
    lows: [false, false],
    highs: [true, true],
    sharedRoutes: ['transport', 'release-retention'],
  },
];

function overlapAudit(mode) {
  return overlapDefinitions.map(definition => {
    const low = baseContext(mode);
    definition.paths.forEach((path, index) => setPath(low, path, definition.lows[index]));
    const baseline = calculate(low);
    const onlyA = clone(low);
    const onlyB = clone(low);
    const both = clone(low);
    setPath(onlyA, definition.paths[0], definition.highs[0]);
    setPath(onlyB, definition.paths[1], definition.highs[1]);
    definition.paths.forEach((path, index) => setPath(both, path, definition.highs[index]));
    const a = calculate(onlyA);
    const b = calculate(onlyB);
    const joint = calculate(both);
    const deltaA = a.score - baseline.score;
    const deltaB = b.score - baseline.score;
    const jointDelta = joint.score - baseline.score;
    return {
      mode,
      id: definition.id,
      sharedRoutes: definition.sharedRoutes,
      baselineScore: baseline.score,
      deltaA,
      deltaB,
      jointDelta,
      nonAdditivity: jointDelta - deltaA - deltaB,
      componentDeltaJoint: Object.fromEntries(Object.keys(joint.components).map(key => [key, joint.components[key] - baseline.components[key]])),
    };
  });
}

function pearson(rows, keyA, keyB) {
  const a = rows.map(row => row[keyA]);
  const b = rows.map(row => row[keyB]);
  const meanA = a.reduce((sum, value) => sum + value, 0) / a.length;
  const meanB = b.reduce((sum, value) => sum + value, 0) / b.length;
  let numerator = 0;
  let sumA = 0;
  let sumB = 0;
  for (let index = 0; index < a.length; index += 1) {
    const da = a[index] - meanA;
    const db = b[index] - meanB;
    numerator += da * db;
    sumA += da * da;
    sumB += db * db;
  }
  return sumA && sumB ? numerator / Math.sqrt(sumA * sumB) : 0;
}

function scenarioGrid(mode) {
  const values = {
    wind: [2, 4, 7, 10, 15],
    wave: [0.1, 0.4, 0.8, 1.5, 2.8],
    current: [0.05, 0.2, 0.5, 0.8],
    currentDirection: [90, 145, 200, 270],
    trend: [-10, 0, 10],
    maxWind: [5, 10, 15],
    maxWave: [0.5, 2.5],
    eventAge: [1, 8, 72],
    coastFeatures: [false, true],
  };
  const rows = [];
  for (const wind of values.wind)
    for (const wave of values.wave)
      for (const current of values.current)
        for (const currentDirection of values.currentDirection)
          for (const trend of values.trend)
            for (const maxWind of values.maxWind)
              for (const maxWave of values.maxWave)
                for (const eventAge of values.eventAge)
                  for (const coastFeatures of values.coastFeatures) {
                    const context = baseContext(mode);
                    Object.assign(context.weather, { windSpeedMps: wind, waveHeightM: wave, currentSpeedMps: current, currentDirectionDeg: currentDirection, waterLevelTrendCm3h: trend });
                    Object.assign(context.history, { maxWind24hMps: maxWind, maxWave24hM: maxWave, hoursSinceHighEnergy: eventAge });
                    Object.assign(context.zone, { shallowWater: coastFeatures, reefs: coastFeatures, seagrass: coastFeatures, coastType: coastFeatures ? 'west' : 'east' });
                    const result = calculate(context);
                    rows.push({
                      score: result.score,
                      ...result.components,
                      candidateScores: result.candidateScores,
                      inputs: { wind, wave, current, currentDirection, trend, maxWind, maxWave, eventAge, coastFeatures },
                    });
                  }
  const scores = rows.map(row => row.score);
  const componentRange = component => {
    const componentValues = rows.map(row => row[component]);
    return { minimum: Math.min(...componentValues), maximum: Math.max(...componentValues) };
  };
  const levels = Object.fromEntries(['poor', 'weak', 'fair', 'good'].map(level => [level, 0]));
  for (const row of rows) {
    const level = row.score >= 75 ? 'good' : row.score >= 55 ? 'fair' : row.score >= 35 ? 'weak' : 'poor';
    levels[level] += 1;
  }
  const scoreLevel = score => score >= 75 ? 'good' : score >= 55 ? 'fair' : score >= 35 ? 'weak' : 'poor';
  const candidateIds = ['b0', 'phaseDAdditive', 'equalAdditive', 'phaseDChain'];
  const candidateComparisons = Object.fromEntries(candidateIds.map(id => {
    const candidateScores = rows.map(row => row.candidateScores[id]);
    const deltas = rows.map((row, index) => candidateScores[index] - row.score);
    return [id, {
      minimum: Math.min(...candidateScores),
      maximum: Math.max(...candidateScores),
      mean: round(candidateScores.reduce((sum, value) => sum + value, 0) / candidateScores.length),
      meanDeltaFromB0: round(deltas.reduce((sum, value) => sum + value, 0) / deltas.length),
      lowerThanB0: deltas.filter(value => value < 0).length,
      equalToB0: deltas.filter(value => value === 0).length,
      higherThanB0: deltas.filter(value => value > 0).length,
      changedLevel: rows.filter((row, index) => scoreLevel(candidateScores[index]) !== scoreLevel(row.score)).length,
      correlationToB0: round(pearson(rows.map((row, index) => ({ b0: row.score, candidate: candidateScores[index] })), 'b0', 'candidate')),
    }];
  }));
  const candidateSpread = rows.map(row => {
    const candidateScores = Object.values(row.candidateScores);
    return Math.max(...candidateScores) - Math.min(...candidateScores);
  });
  const archetypeDefinitions = {
    easySearchLowMobilisation: row => row.huntability >= 70 && row.release <= 30,
    mobilisedPoorTransport: row => row.release >= 70 && row.transport <= 30,
    physicalOpportunityHardSearch: row => row.release >= 60 && row.transport >= 60 && row.huntability <= 35,
    balancedHigh: row => row.release >= 60 && row.transport >= 60 && row.huntability >= 60,
    balancedLow: row => row.release <= 40 && row.transport <= 40 && row.huntability <= 40,
  };
  const archetypes = Object.fromEntries(Object.entries(archetypeDefinitions).map(([id, predicate]) => {
    const matches = rows.filter(predicate).map(row => ({
      ...row,
      candidateSpread: Math.max(...Object.values(row.candidateScores)) - Math.min(...Object.values(row.candidateScores)),
    }));
    const candidateMeans = Object.fromEntries(candidateIds.map(candidateId => [
      candidateId,
      matches.length ? round(matches.reduce((sum, row) => sum + row.candidateScores[candidateId], 0) / matches.length) : null,
    ]));
    const example = [...matches].sort((a, b) => b.candidateSpread - a.candidateSpread)[0];
    return [id, {
      scenarios: matches.length,
      candidateMeans,
      largestDisagreement: example ? {
        spread: example.candidateSpread,
        inputs: example.inputs,
        components: Object.fromEntries(['huntability', 'transport', 'release'].map(key => [key, example[key]])),
        candidateScores: example.candidateScores,
      } : null,
    }];
  }));
  return {
    mode,
    scenarios: rows.length,
    score: {
      minimum: Math.min(...scores),
      maximum: Math.max(...scores),
      mean: round(scores.reduce((sum, value) => sum + value, 0) / scores.length),
      atZero: scores.filter(value => value === 0).length,
      atHundred: scores.filter(value => value === 100).length,
      uniqueValues: new Set(scores).size,
    },
    components: Object.fromEntries(['huntability', 'transport', 'release'].map(component => [component, componentRange(component)])),
    syntheticCorrelations: {
      huntabilityTransport: round(pearson(rows, 'huntability', 'transport')),
      huntabilityRelease: round(pearson(rows, 'huntability', 'release')),
      transportRelease: round(pearson(rows, 'transport', 'release')),
      huntabilityFinal: round(pearson(rows, 'huntability', 'score')),
      transportFinal: round(pearson(rows, 'transport', 'score')),
      releaseFinal: round(pearson(rows, 'release', 'score')),
    },
    candidateComparisons,
    candidateDisagreement: {
      maximumSpread: Math.max(...candidateSpread),
      scenariosAtLeast10PointsApart: candidateSpread.filter(value => value >= 10).length,
      scenariosAtLeast20PointsApart: candidateSpread.filter(value => value >= 20).length,
    },
    archetypes,
    levels,
  };
}

function buildAudit() {
  const modes = ['waders', 'beach'];
  const thresholds = modes.flatMap(thresholdAudit);
  const largestJumps = [...thresholds]
    .sort((a, b) => Math.max(Math.abs(b.scoreJumpIntoThreshold), Math.abs(b.scoreJumpOutOfThreshold)) - Math.max(Math.abs(a.scoreJumpIntoThreshold), Math.abs(a.scoreJumpOutOfThreshold)))
    .slice(0, 15);
  return {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    scoreImpact: 'none',
    method: 'synthetic deterministic sensitivity audit; not observational calibration',
    activeWeights: SCORE_WEIGHTS,
    candidateDefinitions: {
      ...SCORE_CANDIDATE_WEIGHTS,
      phaseDChain: {
        huntabilityShare: 25,
        physicalShare: 75,
        physicalMethod: 'weighted-harmonic-transport-40-mobilisation-35',
      },
    },
    baseline: Object.fromEntries(modes.map(mode => [mode, calculate(baseContext(mode))])),
    thresholdSummary: {
      rows: thresholds.length,
      rowsWithFinalScoreJump: thresholds.filter(row => row.scoreJumpIntoThreshold || row.scoreJumpOutOfThreshold).length,
      largestJumps,
    },
    missingInputs: modes.flatMap(missingAudit),
    overlaps: modes.flatMap(overlapAudit),
    grids: modes.map(scenarioGrid),
    routeInventory: {
      wind: ['huntability-current-speed', 'transport-current-direction', 'release-historical-maximum'],
      wave: ['huntability-current-height', 'release-current-height', 'release-historical-maximum'],
      current: ['transport-speed-and-direction', 'release-speed-and-direction'],
      waterLevelTrend: ['transport', 'release-remobilisation'],
      coastFeatures: ['transport-on-inbound-current', 'release-retention'],
    },
    interpretationRules: [
      'Synthetic correlations describe the score formula, not nature or amber finds.',
      'A threshold jump identifies a discontinuity that needs validation; it is not evidence that the threshold is wrong.',
      'Non-additivity can come from clamping, rounding, caps, maximum-path selection or explicit synergy.',
      'Candidate comparisons reuse B0 components and therefore test score structure, not revised physical rules.',
      'The harmonic chain is a diagnostic soft-gate candidate, not an approved production formula.',
      'No result authorises production score changes.',
    ],
  };
}

const audit = buildAudit();
if (selfTest) {
  assert.equal(audit.thresholdSummary.rows, 54);
  assert.equal(audit.missingInputs.length, 18);
  assert.equal(audit.overlaps.length, 8);
  assert.equal(audit.grids.length, 2);
  assert.ok(audit.grids.every(grid => grid.scenarios === 43200));
  assert.ok(audit.grids.every(grid => Object.keys(grid.candidateComparisons).length === 4));
  assert.ok(audit.grids.every(grid => Object.values(grid.archetypes).some(value => value.scenarios > 0)));
  assert.equal(audit.baseline.waders.available, true);
  assert.equal(audit.baseline.beach.available, true);
  assert.equal(audit.missingInputs.find(row => row.mode === 'waders' && row.input === 'wind').available, false);
  assert.ok(audit.thresholdSummary.rowsWithFinalScoreJump > 0);
  const missingMobilisation = compareScoreCandidates({
    available: true,
    score: 65,
    components: { huntability: 100, transport: 100, release: 0 },
  });
  assert.equal(missingMobilisation.scores.phaseDAdditive, 65);
  assert.equal(missingMobilisation.scores.phaseDChain, 25);
  assert.equal(missingMobilisation.physicalChainScore, 0);
  console.log('OK: RavScore sensitivity audit is deterministic, score-neutral and complete.');
} else {
  console.log(JSON.stringify(audit, null, 2));
}
