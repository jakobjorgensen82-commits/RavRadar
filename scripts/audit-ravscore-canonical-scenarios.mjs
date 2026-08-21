import assert from 'node:assert/strict';
import fs from 'node:fs';
import { calculateRavScore, scoreRating } from '../js/core/score-engine.js';
import { evaluatePhaseDWaveProcessCandidate } from '../js/core/phase-d-wave-process-candidate.js';

const selfTest = process.argv.includes('--self-test');
const pointsPath = 'data/geometry-v2/active-national-coastal-parts/point-pairs.json';
const zonesPath = 'data/zones.geojson';
const points = JSON.parse(fs.readFileSync(pointsPath, 'utf8'));
const zones = JSON.parse(fs.readFileSync(zonesPath, 'utf8'));
const parts = points.parts || [];
const zoneById = new Map((zones.features || []).map(feature => [feature.properties?.id, feature.properties || {}]));

const normaliseDirection = value => ((Number(value) % 360) + 360) % 360;
const mean = values => values.reduce((sum, value) => sum + value, 0) / values.length;
const rounded = value => Number(value.toFixed(3));
const scoreBand = score => scoreRating(score).level;

// Directions use the conventions already used by the active wave audit:
// currents describe movement, while wind and wave direction describe origin.
const scenarios = [
  { id: 'quiet-neutral', phase: 'quiet', wind: 3, wave: 0.2, period: 4, current: 0.05, currentOffset: 90, waveOffset: 90, maxWind: 4, maxWave: 0.3, duration: 0, age: 120, trend: 0 },
  { id: 'building-onshore-event', phase: 'building', wind: 10, wave: 1.2, period: 6, current: 0.25, currentOffset: 0, waveOffset: 0, maxWind: 10, maxWave: 1.2, duration: 3, age: 0, trend: 8 },
  { id: 'peak-onshore-storm', phase: 'peak', wind: 16, wave: 3, period: 8, current: 0.45, currentOffset: 0, waveOffset: 0, maxWind: 16, maxWave: 3, duration: 8, age: 0, trend: 4 },
  { id: 'early-recession-onshore', phase: 'early-recession', wind: 7, wave: 0.9, period: 7, current: 0.3, currentOffset: 0, waveOffset: 0, maxWind: 17, maxWave: 3, duration: 9, age: 4, trend: -8 },
  { id: 'post-storm-onshore-delivery', phase: 'post-storm', wind: 4, wave: 0.4, period: 6, current: 0.25, currentOffset: 0, waveOffset: 0, maxWind: 17, maxWave: 3, duration: 9, age: 10, trend: -6 },
  { id: 'post-storm-alongshore-left', phase: 'post-storm', wind: 4, wave: 0.4, period: 6, current: 0.25, currentOffset: -90, waveOffset: -60, maxWind: 17, maxWave: 3, duration: 9, age: 10, trend: -6 },
  { id: 'post-storm-alongshore-right', phase: 'post-storm', wind: 4, wave: 0.4, period: 6, current: 0.25, currentOffset: 90, waveOffset: 60, maxWind: 17, maxWave: 3, duration: 9, age: 10, trend: -6 },
  { id: 'post-storm-offshore-removal', phase: 'post-storm', wind: 4, wave: 0.4, period: 6, current: 0.25, currentOffset: 180, waveOffset: 180, maxWind: 17, maxWave: 3, duration: 9, age: 10, trend: -6 },
  { id: 'current-onshore-wave-offshore', phase: 'conflict', wind: 5, wave: 0.8, period: 7, current: 0.3, currentOffset: 0, waveOffset: 180, maxWind: 14, maxWave: 2.4, duration: 6, age: 8, trend: -4 },
  { id: 'wave-onshore-current-offshore', phase: 'conflict', wind: 5, wave: 0.8, period: 7, current: 0.3, currentOffset: 180, waveOffset: 0, maxWind: 14, maxWave: 2.4, duration: 6, age: 8, trend: -4 },
  { id: 'stale-event-onshore', phase: 'stale', wind: 3, wave: 0.25, period: 5, current: 0.15, currentOffset: 0, waveOffset: 0, maxWind: 17, maxWave: 3, duration: 9, age: 120, trend: 0 },
  { id: 'weak-mobilisation-onshore', phase: 'weak-event', wind: 3, wave: 0.2, period: 4, current: 0.3, currentOffset: 0, waveOffset: 0, maxWind: 4, maxWave: 0.3, duration: 0, age: 72, trend: 0 },
  { id: 'nearshore-remobilisation', phase: 'remobilisation', wind: 5, wave: 0.6, period: 5, current: 0.35, currentOffset: 0, waveOffset: 0, maxWind: 6, maxWave: 0.7, duration: 2, age: 2, trend: 0 },
  { id: 'post-storm-rising-water', phase: 'water-level-pair', wind: 4, wave: 0.4, period: 6, current: 0.25, currentOffset: 0, waveOffset: 0, maxWind: 17, maxWave: 3, duration: 9, age: 10, trend: 10 },
  { id: 'post-storm-falling-water', phase: 'water-level-pair', wind: 4, wave: 0.4, period: 6, current: 0.25, currentOffset: 0, waveOffset: 0, maxWind: 17, maxWave: 3, duration: 9, age: 10, trend: -10 },
];

function transportHistory(scenario) {
  const offset = normaliseDirection(scenario.currentOffset);
  const inbound = offset <= 45 || offset >= 315;
  const outbound = offset >= 135 && offset <= 225;
  return {
    stateModelMode: 'canonical-synthetic',
    verifiedCurrentCoverageHours: 24,
    inboundCurrentMomentum: inbound ? 40 : outbound ? 0 : 10,
    outboundCurrentPressure: outbound ? 40 : inbound ? 0 : 10,
    activeCurrentRegime: inbound ? 'inbound' : outbound ? 'outbound' : 'neutral',
    activeCurrentRegimeDurationHours: 6,
    activeCurrentRegimeStability: 0.8,
  };
}

function context(part, scenario, mode) {
  const sourceZone = zoneById.get(part.zoneId) || {};
  const onshore = Number(part.onshoreDirectionDeg);
  return {
    mode,
    zone: {
      id: part.finalPartId,
      coastType: part.coastType || sourceZone.coastType,
      onshoreDirectionDeg: onshore,
      shallowWater: sourceZone.shallowWater === true,
      reefs: sourceZone.reefs === true,
      seagrass: sourceZone.seagrass === true,
    },
    weather: {
      windSpeedMps: scenario.wind,
      windDirectionDeg: normaliseDirection(onshore + 180),
      waveHeightM: scenario.wave,
      wavePeriodS: scenario.period,
      waveDirectionDeg: normaliseDirection(onshore + 180 + scenario.waveOffset),
      currentSpeedMps: scenario.current,
      currentDirectionDeg: normaliseDirection(onshore + scenario.currentOffset),
      waterLevelTrendCm3h: scenario.trend,
    },
    history: {
      maxWind24hMps: scenario.maxWind,
      maxWave24hM: scenario.maxWave,
      strongEventDurationHours: scenario.duration,
      hoursSinceStrongEventEnd: scenario.age,
      hoursSinceHighEnergy: scenario.age,
      ...transportHistory(scenario),
    },
  };
}

function modelScores(result, candidate) {
  return {
    active: result.score,
    candidateA: candidate.candidateScores.candidateA,
    candidateB: candidate.candidateScores.candidateB,
    candidateC: candidate.candidateScores.candidateC,
    candidateD: candidate.candidateScores.candidateD,
    candidateE: candidate.candidateScores.candidateE,
  };
}

const rows = [];
for (const scenario of scenarios) {
  for (const mode of ['waders', 'beach']) {
    for (const part of parts) {
      const input = context(part, scenario, mode);
      const active = calculateRavScore(input);
      const candidate = evaluatePhaseDWaveProcessCandidate(input);
      rows.push({
        scenarioId: scenario.id,
        phase: scenario.phase,
        mode,
        activeAvailable: active.available,
        candidateAvailable: candidate.available,
        scores: active.available && candidate.available ? modelScores(active, candidate) : null,
      });
    }
  }
}

const modelIds = ['active', 'candidateA', 'candidateB', 'candidateC', 'candidateD', 'candidateE'];
function summarize(selected) {
  const available = selected.filter(row => row.activeAvailable && row.candidateAvailable && row.scores);
  const models = Object.fromEntries(modelIds.map(model => {
    const values = available.map(row => row.scores[model]);
    const activeValues = available.map(row => row.scores.active);
    return [model, {
      mean: rounded(mean(values)),
      minimum: Math.min(...values),
      maximum: Math.max(...values),
      meanDeltaFromActive: rounded(mean(values.map((value, index) => value - activeValues[index]))),
      changedBandFromActive: values.filter((value, index) => scoreBand(value) !== scoreBand(activeValues[index])).length,
    }];
  }));
  const gateDeltas = available.map(row => row.scores.candidateC - row.scores.candidateB);
  const physicalGateDeltas = available.map(row => row.scores.candidateE - row.scores.candidateD);
  return {
    records: selected.length,
    available: available.length,
    models,
    weakestLinkGate: {
      meanDeltaBtoC: rounded(mean(gateDeltas)),
      minimumDeltaBtoC: Math.min(...gateDeltas),
      maximumDeltaBtoC: Math.max(...gateDeltas),
      lowered: gateDeltas.filter(value => value < 0).length,
      unchanged: gateDeltas.filter(value => value === 0).length,
    },
    physicalBottleneckGate: {
      meanDeltaDtoE: rounded(mean(physicalGateDeltas)),
      minimumDeltaDtoE: Math.min(...physicalGateDeltas),
      maximumDeltaDtoE: Math.max(...physicalGateDeltas),
      lowered: physicalGateDeltas.filter(value => value < 0).length,
      unchanged: physicalGateDeltas.filter(value => value === 0).length,
    },
  };
}

const summaries = scenarios.flatMap(scenario => ['waders', 'beach'].map(mode => ({
  scenarioId: scenario.id,
  phase: scenario.phase,
  mode,
  ...summarize(rows.filter(row => row.scenarioId === scenario.id && row.mode === mode)),
})));

const summaryFor = (scenarioId, mode) => summaries.find(row => row.scenarioId === scenarioId && row.mode === mode);
const compare = (left, right, mode, model) => rounded(
  summaryFor(left, mode).models[model].mean - summaryFor(right, mode).models[model].mean,
);

const report = {
  schemaVersion: '1.0.0',
  status: 'passed-private-ravscore-canonical-scenario-audit',
  generatedAt: new Date().toISOString(),
  method: 'deterministic science-informed scenarios rotated to every active local onshore direction',
  limitations: [
    'SCENARIOS_ARE_RESEARCH_PRIORS_NOT_OBSERVATIONAL_CALIBRATION',
    'LOCAL_BATHYMETRY_AND_AMBER_INVENTORY_ARE_NOT_MODELLED',
    'STATIC_RETENTION_TAGS_ARE_COARSE_ZONE_LEVEL_PRIORS',
  ],
  partCount: parts.length,
  zoneCount: new Set(parts.map(part => part.zoneId)).size,
  scenarioCount: scenarios.length,
  evaluationCount: rows.length,
  scenarioDefinitions: scenarios.map(({ id, phase }) => ({ id, phase })),
  summaries,
  pairChecks: {
    candidateBOnshoreVsOffshoreBeach: compare('post-storm-onshore-delivery', 'post-storm-offshore-removal', 'beach', 'candidateB'),
    candidateBOnshoreVsOffshoreWaders: compare('post-storm-onshore-delivery', 'post-storm-offshore-removal', 'waders', 'candidateB'),
    candidateBRecentVsStaleBeach: compare('post-storm-onshore-delivery', 'stale-event-onshore', 'beach', 'candidateB'),
    candidateBRecentVsStaleWaders: compare('post-storm-onshore-delivery', 'stale-event-onshore', 'waders', 'candidateB'),
    candidateBAlongshoreLeftVsRightBeach: compare('post-storm-alongshore-left', 'post-storm-alongshore-right', 'beach', 'candidateB'),
    candidateBAlongshoreLeftVsRightWaders: compare('post-storm-alongshore-left', 'post-storm-alongshore-right', 'waders', 'candidateB'),
    activeRisingVsFallingWaterBeach: compare('post-storm-rising-water', 'post-storm-falling-water', 'beach', 'active'),
    candidateBRisingVsFallingWaterBeach: compare('post-storm-rising-water', 'post-storm-falling-water', 'beach', 'candidateB'),
    candidateDOnshoreVsOffshoreBeach: compare('post-storm-onshore-delivery', 'post-storm-offshore-removal', 'beach', 'candidateD'),
    candidateDOnshoreVsOffshoreWaders: compare('post-storm-onshore-delivery', 'post-storm-offshore-removal', 'waders', 'candidateD'),
    candidateDRecentVsStaleBeach: compare('post-storm-onshore-delivery', 'stale-event-onshore', 'beach', 'candidateD'),
    candidateDRecentVsStaleWaders: compare('post-storm-onshore-delivery', 'stale-event-onshore', 'waders', 'candidateD'),
    candidateDAlongshoreLeftVsRightBeach: compare('post-storm-alongshore-left', 'post-storm-alongshore-right', 'beach', 'candidateD'),
    candidateDAlongshoreLeftVsRightWaders: compare('post-storm-alongshore-left', 'post-storm-alongshore-right', 'waders', 'candidateD'),
  },
  rawWeatherValuesStored: false,
  coordinateValuesStored: false,
  productionGeometryChanged: false,
  adminDataChanged: false,
  weatherSamplingChanged: false,
  stateChanged: false,
  publicRuntimeChanged: false,
  scoreChanged: false,
  automaticActivationAllowed: false,
};

assert.equal(report.partCount, 673, 'Auditten skal bruge alle 673 aktive kystdele');
assert.equal(report.zoneCount, 210, 'Auditten skal dække alle 210 zoner');
assert.equal(report.evaluationCount, 673 * scenarios.length * 2);
assert.ok(summaries.every(row => row.available === 673), 'Alle scenarier skal kunne beregnes for alle kystdele');
assert.ok(summaries.every(row => modelIds.every(model => row.models[model].minimum >= 0 && row.models[model].maximum <= 100)));
assert.ok(summaries.every(row => row.weakestLinkGate.maximumDeltaBtoC <= 0), 'Kandidat C maa aldrig loefte kandidat B');
assert.ok(summaries.every(row => row.physicalBottleneckGate.maximumDeltaDtoE <= 0), 'Kandidat E maa aldrig loefte kandidat D');
assert.ok(report.pairChecks.candidateBOnshoreVsOffshoreBeach > 0 && report.pairChecks.candidateBOnshoreVsOffshoreWaders > 0,
  'Levering mod kysten skal vaere bedre end transport vaek fra kysten');
assert.ok(report.pairChecks.candidateBRecentVsStaleBeach > 0 && report.pairChecks.candidateBRecentVsStaleWaders > 0,
  'En frisk leveringshaendelse skal vaere bedre end en gammel haendelse');
assert.ok(Math.abs(report.pairChecks.candidateBAlongshoreLeftVsRightBeach) <= 0.01
  && Math.abs(report.pairChecks.candidateBAlongshoreLeftVsRightWaders) <= 0.01,
  'Venstre og hoejre langs kysten skal vaere symmetriske uden lokal retningsprior');
assert.ok(report.pairChecks.candidateDOnshoreVsOffshoreBeach > 20 && report.pairChecks.candidateDOnshoreVsOffshoreWaders > 20,
  'Den nye leveringsvej skal skelne tydeligt mellem transport mod og vaek fra kysten');
assert.ok(report.pairChecks.candidateDRecentVsStaleBeach > 0 && report.pairChecks.candidateDRecentVsStaleWaders > 0,
  'Den nye leveringsvej skal bevare haendelseshukommelsen');
assert.ok(Math.abs(report.pairChecks.candidateDAlongshoreLeftVsRightBeach) <= 0.01
  && Math.abs(report.pairChecks.candidateDAlongshoreLeftVsRightWaders) <= 0.01,
  'Den nye leveringsvej skal vaere symmetrisk langs kysten uden lokal prior');

if (selfTest) {
  console.log('OK: 15 canonical scenarios x 673 parts x 2 modes are deterministic and score-neutral.');
} else {
  console.log(JSON.stringify(report, null, 2));
}
