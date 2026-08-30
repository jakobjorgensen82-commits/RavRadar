#!/usr/bin/env node

import assert from 'node:assert/strict';
import crypto from 'node:crypto';

import {
  RAVSCORE_CURRENT_SUPPLY_POLICY,
  RAVSCORE_LAST_MILE_POLICY,
  RAVSCORE_MIGRATION_ID,
  RAVSCORE_MODEL_BUNDLE_SHA256,
  RAVSCORE_MODEL_CONTRACT_SHA256,
  RAVSCORE_MODEL_CONTRACT,
  RAVSCORE_MODEL_ID,
  RAVSCORE_PROFILE_ID,
  RAVSCORE_RECOVERY_POLICY,
  RAVSCORE_STATE_SCHEMA_VERSION,
  RAVSCORE_WAVE_MOBILISATION_POLICY,
  RAVSCORE_WEIGHTS,
  ravScoreModelBinding,
} from '../js/core/ravscore-model-contract.js';
import {
  canonicalBundleJson,
  computeRavScoreModelBundle,
} from './build-ravscore-model-bundle.mjs';
import {
  buildCurrentSupplyMemory,
  currentSupplyAgePrimitive,
  currentSupplyStrength,
  replayCurrentSupplyEvidence,
} from '../js/core/ravscore-current-supply-memory.js';
import {
  classifyWaterLevelContext,
  evaluateIntegratedLastMile,
  evaluateRavScoreIntegrated,
} from '../js/core/ravscore-integrated.js';
import { evaluateIntegratedHuntability } from '../js/core/ravscore-huntability.js';
import {
  buildRavScoreWaveMobilisationStateSeries,
  RAVSCORE_WAVE_MOBILISATION_STATUS,
} from '../js/core/ravscore-wave-mobilisation-state.js';
import { evaluateRavScoreCandidateG } from '../js/core/ravscore-candidate-g.js';
import {
  buildCandidateGDerivedStateSeries,
} from '../js/core/ravscore-candidate-g-state-pipeline.js';
import {
  buildIntegratedRavScoreStateSeries,
} from '../js/core/ravscore-integrated-state-pipeline.js';
import {
  buildWaveMobilisationPotential,
  waveMobilisationEnergy,
} from '../js/core/ravscore-mobilisation-memory.js';
import {
  PHASE_D_HUNTABILITY_PROFILES,
  evaluatePhaseDHuntability,
} from '../js/core/phase-d-process-candidate.js';

const HOUR_MS = 3_600_000;
const BASE_TIME_MS = Date.UTC(2026, 0, 3, 0, 0, 0);
const CANDIDATE_G_VARIANT_ID =
  'G-CURRENT-LED-WAVE-MOBILISATION-WADERS-WIND-LED';
const round = (value, digits = 3) => Number(Number(value).toFixed(digits));
const clamp = (value, minimum = 0, maximum = 100) =>
  Math.max(minimum, Math.min(maximum, Number(value)));
const mean = values => values.reduce((sum, value) => sum + value, 0) / values.length;
const isoAtHour = hour => new Date(BASE_TIME_MS + hour * HOUR_MS).toISOString();

const WEIGHT_ABLATIONS = Object.freeze([
  Object.freeze({ id: 'INTEGRATED-20-50-30', huntability: 0.20, transport: 0.50, mobilisation: 0.30 }),
  Object.freeze({ id: 'LEGACY-25-40-35', huntability: 0.25, transport: 0.40, mobilisation: 0.35 }),
  Object.freeze({ id: 'SENSITIVITY-20-45-35', huntability: 0.20, transport: 0.45, mobilisation: 0.35 }),
  Object.freeze({ id: 'SENSITIVITY-15-50-35', huntability: 0.15, transport: 0.50, mobilisation: 0.35 }),
]);

const CURRENT_KERNELS = Object.freeze([
  Object.freeze({ id: 'FULL24-COS48', primitive: age => currentSupplyAgePrimitive(age) }),
  Object.freeze({ id: 'UNIFORM48', primitive: age => Math.min(Math.max(age, 0), 48) }),
  Object.freeze({
    id: 'LINEAR48',
    primitive: age => {
      const bounded = Math.min(Math.max(age, 0), 48);
      return bounded - bounded ** 2 / 96;
    },
  }),
  Object.freeze({
    id: 'EXPONENTIAL-HALF24',
    primitive: age => {
      const bounded = Math.max(age, 0);
      const rate = Math.log(2) / 24;
      return (1 - Math.exp(-rate * bounded)) / rate;
    },
  }),
]);

const CURRENT_THRESHOLD_ABLATIONS = Object.freeze([
  Object.freeze({ id: 'SENSITIVE-002-012', deadbandNormalSpeedMps: 0.02, fullStrengthNormalSpeedMps: 0.12 }),
  Object.freeze({
    id: 'CONTRACT-003-015',
    deadbandNormalSpeedMps: RAVSCORE_CURRENT_SUPPLY_POLICY.deadbandNormalSpeedMps,
    fullStrengthNormalSpeedMps: RAVSCORE_CURRENT_SUPPLY_POLICY.fullStrengthNormalSpeedMps,
  }),
  Object.freeze({ id: 'CONSERVATIVE-005-020', deadbandNormalSpeedMps: 0.05, fullStrengthNormalSpeedMps: 0.20 }),
]);

const CURRENT_RATE_ABLATIONS = Object.freeze([
  Object.freeze({ id: 'SYMMETRIC-8-8', inboundPointsPerEffectiveHour: 8, outboundPointsPerEffectiveHour: 8 }),
  Object.freeze({
    id: 'CONTRACT-10-8',
    inboundPointsPerEffectiveHour: RAVSCORE_CURRENT_SUPPLY_POLICY.inboundPointsPerEffectiveHour,
    outboundPointsPerEffectiveHour: RAVSCORE_CURRENT_SUPPLY_POLICY.outboundPointsPerEffectiveHour,
  }),
  Object.freeze({ id: 'SYMMETRIC-10-10', inboundPointsPerEffectiveHour: 10, outboundPointsPerEffectiveHour: 10 }),
  Object.freeze({ id: 'INBOUND-HEAVY-12-8', inboundPointsPerEffectiveHour: 12, outboundPointsPerEffectiveHour: 8 }),
]);

const SCENARIOS = Object.freeze([
  Object.freeze({ id: 'canonical-balanced-onshore', supply: 70, mobilisation: 65, wind: 4, wave: 1, period: 7, waveFrom: 270, outboundHours: 0 }),
  Object.freeze({ id: 'conflict-supply-positive-waves-offshore', supply: 70, mobilisation: 75, wind: 5, wave: 2, period: 8, waveFrom: 90, outboundHours: 0 }),
  Object.freeze({ id: 'conflict-supply-low-waves-onshore', supply: 20, mobilisation: 75, wind: 5, wave: 2, period: 8, waveFrom: 270, outboundHours: 10 }),
  Object.freeze({ id: 'outbound-12h', supply: 4, mobilisation: 75, wind: 4, wave: 0.7, period: 6, waveFrom: 90, outboundHours: 12 }),
  Object.freeze({ id: 'outbound-13h', supply: 0, mobilisation: 75, wind: 4, wave: 0.7, period: 6, waveFrom: 90, outboundHours: 13 }),
  Object.freeze({ id: 'outbound-14h', supply: 0, mobilisation: 75, wind: 4, wave: 0.7, period: 6, waveFrom: 90, outboundHours: 14 }),
  Object.freeze({ id: 'p0-high-waves-onshore', supply: 0, mobilisation: 90, wind: 6, wave: 3, period: 8, waveFrom: 270, outboundHours: 0 }),
  Object.freeze({ id: 'p0-high-waves-offshore', supply: 0, mobilisation: 90, wind: 6, wave: 3, period: 8, waveFrom: 90, outboundHours: 0 }),
  Object.freeze({ id: 'p100-high-waves-onshore', supply: 100, mobilisation: 90, wind: 6, wave: 3, period: 8, waveFrom: 270, outboundHours: 0 }),
  Object.freeze({ id: 'p100-high-waves-offshore', supply: 100, mobilisation: 90, wind: 6, wave: 3, period: 8, waveFrom: 90, outboundHours: 0 }),
  Object.freeze({ id: 'post-event-calm', supply: 55, mobilisation: 80, wind: 3, wave: 0.25, period: 4, waveFrom: 270, outboundHours: 0 }),
  Object.freeze({ id: 'extreme-low-huntability', supply: 100, mobilisation: 100, wind: 15, wave: 4, period: 10, waveFrom: 270, outboundHours: 0 }),
]);

function boundedLastMileState({
  waveActivity = 1,
  normalAlignment = 1,
  tangentAlignment = 0,
} = {}) {
  const activity = clamp(waveActivity, 0, 1);
  const approach = activity === 0 ? 1 : clamp(
    (normalAlignment - RAVSCORE_LAST_MILE_POLICY.approachNeutralNormalAlignment)
      / (1 - RAVSCORE_LAST_MILE_POLICY.approachNeutralNormalAlignment),
    0,
    1,
  );
  const factor = clamp(
    1 - RAVSCORE_LAST_MILE_POLICY.maximumAttenuationShare
      * activity * (1 - approach),
    RAVSCORE_LAST_MILE_POLICY.minimumDeliveryFactor,
    RAVSCORE_LAST_MILE_POLICY.maximumDeliveryFactor,
  );
  return {
    lastMileMemoryReady: true,
    lastMileMemoryStatus: 'READY',
    lastMileEvidenceStatus: activity === 0
      ? 'EXACT_CALM_DIRECTION_NEUTRAL'
      : 'DIRECTIONAL_WAVE_EVIDENCE_READY',
    lastMileWaveActivity: activity,
    lastMileNormalAlignment: activity === 0 ? null : normalAlignment,
    lastMileTangentAlignment: activity === 0 ? null : tangentAlignment,
    lastMileCoherence: activity === 0 ? null : 1,
    lastMileApproach: approach,
    lastMileFactor: factor,
  };
}

function lastMileStateForWaveDirection(waveDirectionDeg, { waveActivity = 1 } = {}) {
  if (!Number.isFinite(waveDirectionDeg)) {
    return {
      lastMileMemoryReady: false,
      lastMileMemoryStatus: 'MISSING_INPUT',
      lastMileEvidenceStatus: 'ACTIVE_WAVE_DIRECTION_MISSING',
    };
  }
  const towardDirectionDeg = (waveDirectionDeg + 180) % 360;
  const signedDifferenceRadians = (towardDirectionDeg - 90) * Math.PI / 180;
  return boundedLastMileState({
    waveActivity,
    normalAlignment: Math.cos(signedDifferenceRadians),
    tangentAlignment: Math.sin(signedDifferenceRadians),
  });
}

function readyState(supplyPotential, mobilisationPotential, {
  waveDirectionDeg = 270,
  waveActivity = 1,
  lastMileState = null,
} = {}) {
  return {
    currentMemoryReady: true,
    currentMemoryStatus: 'READY',
    currentReferenceAt: isoAtHour(0),
    supplyPotential,
    waveMemoryReady: true,
    waveMemoryStatus: 'READY',
    waveLastVerifiedAt: isoAtHour(0),
    mobilisationPotential,
    ...(lastMileState ?? lastMileStateForWaveDirection(waveDirectionDeg, { waveActivity })),
  };
}

function weatherFor(scenario, waterLevel = {}) {
  return {
    windSpeedMps: scenario.wind,
    waveHeightM: scenario.wave,
    wavePeriodS: scenario.period,
    waveDirectionDeg: scenario.waveFrom,
    currentSpeedMps: 0.10,
    currentDirectionDeg: 90,
    currentAlignment: 0,
    ...waterLevel,
  };
}

function candidateGFor(scenario, mode) {
  return evaluateRavScoreCandidateG({
    mode,
    zone: { id: 'synthetic-no-geometry', onshoreDirectionDeg: 90 },
    weather: weatherFor(scenario),
    history: {
      maxWave24hM: Math.max(scenario.wave, 2),
      maxWind24hMps: Math.max(scenario.wind, 12),
      strongEventDurationHours: 10,
      hoursSinceStrongEventEnd: 8,
      hoursSinceHighEnergy: 8,
    },
  }, {
    variantId: CANDIDATE_G_VARIANT_ID,
    memory: {
      transportPotential: scenario.supply,
      outboundEpisodeEffectiveHours: scenario.outboundHours,
      outboundEpisodeLossPoints: scenario.outboundHours >= 13
        ? 100
        : Math.min(96, scenario.outboundHours * 8),
      actualOutboundTransport: scenario.outboundHours >= 13,
      mobilisationPotential: scenario.mobilisation,
      waveEnergyProxy: scenario.wave ** 2 * scenario.period,
      waveEnergyScore: waveMobilisationEnergy({
        waveHeightM: scenario.wave,
        wavePeriodS: scenario.period,
      }).energyScore,
      waveMobilisationTransition: 'synthetic-audit-hold',
      waveMobilisationBuildHalfLifeHours: 4,
      waveMobilisationDecayHalfLifeHours: 48,
    },
  });
}

function integratedFor(scenario, mode, waterLevel = {}) {
  const waveEnergy = waveMobilisationEnergy({
    waveHeightM: scenario.wave,
    wavePeriodS: scenario.period,
  });
  return evaluateRavScoreIntegrated({
    mode,
    zone: { onshoreDirectionDeg: 90 },
    weather: weatherFor(scenario, waterLevel),
  }, {
    state: readyState(scenario.supply, scenario.mobilisation, {
      waveDirectionDeg: scenario.waveFrom,
      waveActivity: waveEnergy.available ? waveEnergy.energyScore / 100 : 0,
    }),
  });
}

function scoreComponents(components, weights, mode) {
  const raw = components.huntability * weights.huntability
    + components.transport * weights.transport
    + components.mobilisation * weights.mobilisation;
  const rounded = Math.round(clamp(raw));
  return mode === 'waders'
    ? Math.min(rounded, Math.round(clamp(components.huntability)))
    : rounded;
}

function scenarioComparisonAudit() {
  const rows = [];
  for (const scenario of SCENARIOS) {
    for (const mode of ['beach', 'waders']) {
      const candidateG = candidateGFor(scenario, mode);
      const integrated = integratedFor(scenario, mode);
      assert.equal(candidateG.available, true, `Candidate G scenario ${scenario.id}/${mode}`);
      assert.equal(integrated.available, true, `Integrated scenario ${scenario.id}/${mode}`);
      assert.equal(integrated.modelVersion, RAVSCORE_MODEL_ID);
      assert.equal(integrated.modelBinding.modelContractSha256, RAVSCORE_MODEL_CONTRACT_SHA256);
      assert.equal(integrated.modelBinding.modelBundleSha256, RAVSCORE_MODEL_BUNDLE_SHA256);
      rows.push({
        scenarioId: scenario.id,
        mode,
        candidateGScore: candidateG.score,
        integratedScore: integrated.score,
        delta: integrated.score - candidateG.score,
        supplyPotential: scenario.supply,
        candidateGTransport: round(candidateG.components.transportAndDelivery),
        integratedTransport: round(integrated.components.transport),
        mobilisation: round(integrated.components.mobilisation),
        huntability: round(integrated.components.huntability),
        candidateGHardOutflowGate: candidateG.scoreCalculation.outflowExhaustionGateApplied,
        integratedLastMileStatus: integrated.diagnostics.lastMile.status,
      });
    }
  }

  const row = (id, mode = 'beach') => rows.find(item =>
    item.scenarioId === id && item.mode === mode);
  for (const mode of ['beach', 'waders']) {
    assert.equal(row('outbound-13h', mode).candidateGScore, 0);
    assert.equal(row('outbound-14h', mode).candidateGScore, 0);
    assert.ok(row('outbound-13h', mode).integratedScore > 0,
      'The new model must not infer that all local amber vanished at thirteen hours');
    assert.equal(row('p0-high-waves-onshore', mode).integratedTransport, 0);
    assert.equal(row('p0-high-waves-offshore', mode).integratedTransport, 0);
    assert.equal(
      row('p0-high-waves-onshore', mode).integratedScore,
      row('p0-high-waves-offshore', mode).integratedScore,
      'Wave direction must not create transport when supply potential is zero',
    );
    assert.ok(
      row('p100-high-waves-offshore', mode).integratedTransport
        < row('p100-high-waves-onshore', mode).integratedTransport,
      'Offshore approach may only attenuate existing supply',
    );
    assert.ok(
      row('p100-high-waves-onshore', mode).integratedTransport
        - row('p100-high-waves-offshore', mode).integratedTransport <= 15,
      'Directional last-mile attenuation may never exceed fifteen transport points',
    );
  }
  assert.equal(row('extreme-low-huntability', 'waders').integratedScore, 0);
  assert.ok(row('extreme-low-huntability', 'beach').integratedScore > 0);

  const weightRows = rows.flatMap(item => WEIGHT_ABLATIONS.map(weights => ({
    scenarioId: item.scenarioId,
    mode: item.mode,
    weightsId: weights.id,
    score: scoreComponents({
      huntability: item.huntability,
      transport: item.integratedTransport,
      mobilisation: item.mobilisation,
    }, weights, item.mode),
  })));
  for (const item of rows) {
    const baseline = weightRows.find(weight => weight.scenarioId === item.scenarioId
      && weight.mode === item.mode && weight.weightsId === 'INTEGRATED-20-50-30');
    assert.equal(baseline.score, item.integratedScore,
      `20/50/30 ablation must reproduce ${item.scenarioId}/${item.mode}`);
  }
  const weightSummaries = WEIGHT_ABLATIONS.map(weights => {
    const selected = weightRows.filter(item => item.weightsId === weights.id);
    const baseline = weightRows.filter(item => item.weightsId === 'INTEGRATED-20-50-30');
    const deltas = selected.map((item, index) => item.score - baseline[index].score);
    return {
      id: weights.id,
      weights: {
        huntability: weights.huntability,
        transport: weights.transport,
        mobilisation: weights.mobilisation,
      },
      syntheticMeanScore: round(mean(selected.map(item => item.score))),
      meanDeltaFromContract: round(mean(deltas)),
      maximumAbsoluteDeltaFromContract: Math.max(...deltas.map(Math.abs)),
      outbound12MinusBalancedBeach: selected.find(item =>
        item.scenarioId === 'outbound-12h' && item.mode === 'beach').score
        - selected.find(item =>
          item.scenarioId === 'canonical-balanced-onshore' && item.mode === 'beach').score,
    };
  });

  return {
    scenarioCount: SCENARIOS.length,
    modeCount: 2,
    comparisonKind: 'FROZEN_COMPONENT_COUNTERFACTUAL_NOT_CHRONOLOGICAL_STATE_REPLAY',
    statePipelinesExercised: false,
    componentInputsInjectedAsFrozenSyntheticStates: true,
    pairedComparisonCount: rows.length,
    individualModelEvaluationCount: rows.length * 2,
    rows,
    weightSummaries,
    scoreDeltaSummary: {
      syntheticMean: round(mean(rows.map(item => item.delta))),
      minimum: Math.min(...rows.map(item => item.delta)),
      maximum: Math.max(...rows.map(item => item.delta)),
      oldThirteenHourZerosRemoved: rows.filter(item =>
        ['outbound-13h', 'outbound-14h'].includes(item.scenarioId)
        && item.candidateGScore === 0 && item.integratedScore > 0).length,
    },
  };
}

function inventoryCouplingAblationAudit(scenarioComparison) {
  const variants = Object.freeze([
    Object.freeze({
      id: 'ACTIVE-INDEPENDENT-EVIDENCE-DIMENSIONS',
      mobilisation: ({ mobilisation }) => mobilisation,
      interpretation: 'MOBILISATION_IS_A_CONDITIONAL_OPPORTUNITY_DIMENSION_NOT_AN_ESTIMATED_AMBER_MASS',
      inventoryAssumption:
        'NO_CURRENT_TO_INVENTORY_MAPPING_BUT_INDEX_LEVEL_SEPARABILITY_AND_COMPENSATION_REMAIN_PRIORS',
    }),
    Object.freeze({
      id: 'FULL-CURRENT-SUPPLY-COUPLING',
      mobilisation: ({ mobilisation, transport }) => mobilisation * transport / 100,
      interpretation: 'IMPLICITLY_ASSUMES_NO_LOCAL_OR_SECONDARY_INVENTORY_AT_ZERO_CURRENT_SUPPLY',
      inventoryAssumption:
        'CURRENT_SUPPLY_IS_A_LINEAR_PROXY_FOR_ALL_MOBILISABLE_LOCAL_AND_SECONDARY_INVENTORY',
    }),
    Object.freeze({
      id: 'SQRT-CURRENT-SUPPLY-COUPLING',
      mobilisation: ({ mobilisation, transport }) => mobilisation * Math.sqrt(transport / 100),
      interpretation: 'IMPLICITLY_ASSUMES_CURRENT_SUPPLY_CONTROLS_ALL_MOBILISABLE_INVENTORY',
      inventoryAssumption:
        'CURRENT_SUPPLY_IS_A_NONLINEAR_PROXY_FOR_ALL_MOBILISABLE_LOCAL_AND_SECONDARY_INVENTORY',
    }),
    Object.freeze({
      id: 'HALF-UNOBSERVED-INVENTORY-PRIOR',
      mobilisation: ({ mobilisation, transport }) => mobilisation * (0.5 + 0.5 * transport / 100),
      interpretation: 'REQUIRES_AN_UNSUPPORTED_FIFTY_PERCENT_LOCAL_INVENTORY_PRIOR',
      inventoryAssumption:
        'HALF_OF_MOBILISABLE_INVENTORY_IS_INDEPENDENT_OF_CURRENT_SUPPLY_WITHOUT_OBSERVATION',
    }),
    Object.freeze({
      id: 'MINIMUM-TRANSPORT-MOBILISATION-BOTTLENECK',
      mobilisation: ({ mobilisation, transport }) => Math.min(mobilisation, transport),
      interpretation: 'TREATS_RECENT_GRID_CURRENT_EVIDENCE_AS_A_HARD_LOCAL_INVENTORY_BOUND',
      inventoryAssumption:
        'CURRENT_SUPPLY_IS_A_HARD_UPPER_BOUND_FOR_ALL_MOBILISABLE_LOCAL_AND_SECONDARY_INVENTORY',
    }),
  ]);
  const rows = scenarioComparison.rows.flatMap(source => variants.map(variant => {
    const effectiveMobilisation = variant.mobilisation({
      mobilisation: source.mobilisation,
      transport: source.integratedTransport,
    });
    return {
      scenarioId: source.scenarioId,
      mode: source.mode,
      variantId: variant.id,
      interpretation: variant.interpretation,
      inventoryAssumption: variant.inventoryAssumption,
      transport: source.integratedTransport,
      modelledMobilisationOpportunity: source.mobilisation,
      effectiveMobilisation: round(effectiveMobilisation),
      score: scoreComponents({
        huntability: source.huntability,
        transport: source.integratedTransport,
        mobilisation: effectiveMobilisation,
      }, RAVSCORE_WEIGHTS, source.mode),
    };
  }));
  const activeRows = rows.filter(item =>
    item.variantId === 'ACTIVE-INDEPENDENT-EVIDENCE-DIMENSIONS');
  for (const active of activeRows) {
    const expected = scenarioComparison.rows.find(item =>
      item.scenarioId === active.scenarioId && item.mode === active.mode);
    assert.equal(active.score, expected.integratedScore,
      `Active inventory ablation must reproduce ${active.scenarioId}/${active.mode}`);
  }
  const zeroTransportActive = activeRows.filter(item => item.transport === 0);
  assert.ok(zeroTransportActive.length > 0);
  const weakMinimum = RAVSCORE_MODEL_CONTRACT.presentation.levels
    .find(item => item.level === 'weak')?.minimum;
  const fairMinimum = RAVSCORE_MODEL_CONTRACT.presentation.levels
    .find(item => item.level === 'fair')?.minimum;
  assert.equal(weakMinimum, 35);
  assert.equal(fairMinimum, 55);
  const activeZeroTransportTheoreticalMaximumScore = Math.round(100 * (
    RAVSCORE_WEIGHTS.huntability + RAVSCORE_WEIGHTS.mobilisation
  ));
  assert.equal(activeZeroTransportTheoreticalMaximumScore, 50);
  assert.ok(activeZeroTransportTheoreticalMaximumScore < fairMinimum,
    'A ready zero current-supply component may never reach the fair/good bands');
  assert.equal(
    Math.max(...zeroTransportActive.map(item => item.score))
      <= activeZeroTransportTheoreticalMaximumScore,
    true,
    'Frozen ready-zero-current scenarios must respect the theoretical non-transport ceiling',
  );
  for (const scenarioId of ['outbound-13h', 'outbound-14h',
    'p0-high-waves-onshore', 'p0-high-waves-offshore']) {
    for (const mode of ['beach', 'waders']) {
      const row = zeroTransportActive.find(item =>
        item.scenarioId === scenarioId && item.mode === mode);
      assert.ok(row && row.score >= weakMinimum && row.score < fairMinimum,
        `${scenarioId}/${mode} must remain weak, not fair/good or hard-zero`);
    }
  }
  const activeByKey = new Map(activeRows.map(item => [`${item.scenarioId}:${item.mode}`, item.score]));
  const summaries = variants.map(variant => {
    const selected = rows.filter(item => item.variantId === variant.id);
    const deltas = selected.map(item =>
      item.score - activeByKey.get(`${item.scenarioId}:${item.mode}`));
    const find = (scenarioId, mode = 'beach') => selected.find(item =>
      item.scenarioId === scenarioId && item.mode === mode)?.score ?? null;
    return {
      variantId: variant.id,
      interpretation: variant.interpretation,
      inventoryAssumption: variant.inventoryAssumption,
      syntheticMeanScore: round(mean(selected.map(item => item.score))),
      meanDeltaFromActive: round(mean(deltas)),
      maximumAbsoluteDeltaFromActive: Math.max(...deltas.map(Math.abs)),
      zeroTransportMinimumScore: Math.min(...selected
        .filter(item => item.transport === 0).map(item => item.score)),
      zeroTransportMaximumScore: Math.max(...selected
        .filter(item => item.transport === 0).map(item => item.score)),
      balancedBeachScore: find('canonical-balanced-onshore'),
      outbound13BeachScore: find('outbound-13h'),
      zeroSupplyHighWaveBeachScore: find('p0-high-waves-onshore'),
    };
  });
  assert.deepEqual(summaries.map(item => ({
    variantId: item.variantId,
    syntheticMeanScore: item.syntheticMeanScore,
    meanDeltaFromActive: item.meanDeltaFromActive,
    maximumAbsoluteDeltaFromActive: item.maximumAbsoluteDeltaFromActive,
    zeroTransportMinimumScore: item.zeroTransportMinimumScore,
    zeroTransportMaximumScore: item.zeroTransportMaximumScore,
    balancedBeachScore: item.balancedBeachScore,
    outbound13BeachScore: item.outbound13BeachScore,
    zeroSupplyHighWaveBeachScore: item.zeroSupplyHighWaveBeachScore,
  })), [
    {
      variantId: 'ACTIVE-INDEPENDENT-EVIDENCE-DIMENSIONS',
      syntheticMeanScore: 55.708,
      meanDeltaFromActive: 0,
      maximumAbsoluteDeltaFromActive: 0,
      zeroTransportMinimumScore: 37,
      zeroTransportMaximumScore: 43,
      balancedBeachScore: 72,
      outbound13BeachScore: 41,
      zeroSupplyHighWaveBeachScore: 37,
    },
    {
      variantId: 'FULL-CURRENT-SUPPLY-COUPLING',
      syntheticMeanScore: 41.833,
      meanDeltaFromActive: -13.875,
      maximumAbsoluteDeltaFromActive: 27,
      zeroTransportMinimumScore: 10,
      zeroTransportMaximumScore: 19,
      balancedBeachScore: 66,
      outbound13BeachScore: 18,
      zeroSupplyHighWaveBeachScore: 10,
    },
    {
      variantId: 'SQRT-CURRENT-SUPPLY-COUPLING',
      syntheticMeanScore: 43.5,
      meanDeltaFromActive: -12.208,
      maximumAbsoluteDeltaFromActive: 27,
      zeroTransportMinimumScore: 10,
      zeroTransportMaximumScore: 19,
      balancedBeachScore: 68,
      outbound13BeachScore: 18,
      zeroSupplyHighWaveBeachScore: 10,
    },
    {
      variantId: 'HALF-UNOBSERVED-INVENTORY-PRIOR',
      syntheticMeanScore: 48.792,
      meanDeltaFromActive: -6.917,
      maximumAbsoluteDeltaFromActive: 14,
      zeroTransportMinimumScore: 23,
      zeroTransportMaximumScore: 30,
      balancedBeachScore: 69,
      outbound13BeachScore: 30,
      zeroSupplyHighWaveBeachScore: 23,
    },
    {
      variantId: 'MINIMUM-TRANSPORT-MOBILISATION-BOTTLENECK',
      syntheticMeanScore: 43.208,
      meanDeltaFromActive: -12.5,
      maximumAbsoluteDeltaFromActive: 27,
      zeroTransportMinimumScore: 10,
      zeroTransportMaximumScore: 19,
      balancedBeachScore: 72,
      outbound13BeachScore: 18,
      zeroSupplyHighWaveBeachScore: 10,
    },
  ], 'Frozen inventory-coupling evidence must stay synchronized with the documented table');
  const activeObservedScores = zeroTransportActive.map(item => item.score);
  return {
    comparisonKind: 'SYNTHETIC_UNOBSERVED_INVENTORY_COUPLING_ABLATION',
    activeSemantics: 'ADDITIVE_EVIDENCE_INDEX_NOT_AMBER_MASS_BALANCE',
    inventoryObserved: false,
    currentSupplyStateRequired: true,
    readyZeroCurrentSupplyIsNotMissingCurrent: true,
    activeSelectionBasis:
      'LEAST_ADDITIONAL_INVENTORY_STRUCTURE_AMONG_TESTED_SCALAR_CONTRACTS_NOT_EMPIRICAL_OPTIMUM',
    activeResidualAssumption:
      'INDEX_LEVEL_SEPARABILITY_AND_COMPENSATION_REMAIN_UNCALIBRATED_PRIORS',
    activeZeroTransportTheoreticalMaximumScore,
    activeZeroTransportObservedRange: {
      minimum: Math.min(...activeObservedScores),
      maximum: Math.max(...activeObservedScores),
    },
    activeZeroTransportPossibleBands: ['POOR', 'WEAK'],
    activeZeroTransportMaximumBand: 'WEAK',
    whyNoCouplingWasSelected: [
      'RAVRADAR_DOES_NOT_OBSERVE_LOCAL_OR_SECONDARY_AMBER_INVENTORY',
      'CURRENT_SUPPLY_IS_NOT_AN_INVENTORY_MEASUREMENT_OR_HARD_STOCK_BOUND',
      'FULL_SQRT_AND_MINIMUM_COUPLING_CHOOSE_UNSUPPORTED_ZERO_OR_BOUND_BEHAVIOUR',
      'PARTIAL_COUPLING_REQUIRES_AN_UNSUPPORTED_FIFTY_PERCENT_INVENTORY_PRIOR',
      'NO_REPRESENTATIVE_FIND_AND_ZERO_FIND_DATA_SELECTS_A_COUPLING_FUNCTION',
    ],
    summaries,
    rows,
  };
}

function evidenceForStrengths(strengths) {
  assert.equal(strengths.length, 49);
  return strengths.map((strength, index) => ({
    time: isoAtHour(index - 48),
    strength,
  }));
}

function saturatedThenOutbound(outboundHours, inboundStrength = 1, outboundStrength = -1) {
  return Array.from({ length: 49 }, (_, index) =>
    index > 48 - outboundHours ? outboundStrength : inboundStrength);
}

function replayWithKernel(strengths, kernel, rates = RAVSCORE_CURRENT_SUPPLY_POLICY) {
  let potential = 0;
  for (let index = 1; index < strengths.length; index += 1) {
    const olderAge = 49 - index;
    const newerAge = 48 - index;
    const weightedHours = kernel.primitive(olderAge) - kernel.primitive(newerAge);
    const strength = strengths[index];
    const rate = rates.inboundPointsPerEffectiveHour * Math.max(strength, 0)
      - rates.outboundPointsPerEffectiveHour * Math.max(-strength, 0);
    potential = clamp(potential + weightedHours * rate);
  }
  return potential;
}

function currentSensitivityAudit() {
  const outboundRows = [12, 13, 14].map(outboundHours => {
    const strengths = saturatedThenOutbound(outboundHours);
    const actual = replayCurrentSupplyEvidence(evidenceForStrengths(strengths), {
      referenceTime: isoAtHour(0),
    }).supplyPotential;
    const mathematicalBaseline = replayWithKernel(strengths, CURRENT_KERNELS[0]);
    assert.ok(Math.abs(actual - mathematicalBaseline) < 1e-9);
    return {
      outboundEffectiveHours: outboundHours,
      supplyPotential: round(actual),
      candidateGWholeScoreGateWouldApply: outboundHours >= 13,
      integratedWholeScoreGateApplies: false,
    };
  });
  assert.deepEqual(outboundRows.map(item => item.supplyPotential), [4, 0, 0]);

  const sequences = Object.freeze([
    Object.freeze({ id: 'SUSTAINED-INBOUND', values: Array(49).fill(1) }),
    Object.freeze({ id: 'SIX-HOUR-OUTBOUND-REVERSAL', values: saturatedThenOutbound(6) }),
    Object.freeze({ id: 'TWELVE-HOUR-OUTBOUND-REVERSAL', values: saturatedThenOutbound(12) }),
    Object.freeze({
      id: 'OLD-INBOUND-RECENT-NEUTRAL',
      values: Array.from({ length: 49 }, (_, index) => index <= 24 ? 1 : 0),
    }),
  ]);
  const kernelRows = sequences.flatMap(sequence => CURRENT_KERNELS.map(kernel => ({
    scenarioId: sequence.id,
    kernelId: kernel.id,
    supplyPotential: round(replayWithKernel(sequence.values, kernel)),
  })));
  assert.ok(kernelRows.every(item => item.supplyPotential >= 0 && item.supplyPotential <= 100));

  const syntheticNormalSpeedMps = Object.freeze({
    weakInbound: 0.04,
    moderateInbound: 0.09,
    strongInbound: 0.18,
    weakOutbound: -0.04,
    moderateOutbound: -0.09,
    strongOutbound: -0.18,
  });
  const thresholdRows = CURRENT_THRESHOLD_ABLATIONS.map(policy => {
    const strengths = Object.fromEntries(Object.entries(syntheticNormalSpeedMps).map(
      ([id, speed]) => [id, round(currentSupplyStrength(speed, policy), 6)],
    ));
    const sequence = Array.from({ length: 49 }, (_, index) => index > 36
      ? strengths.moderateOutbound
      : strengths.moderateInbound);
    return {
      id: policy.id,
      deadbandNormalSpeedMps: policy.deadbandNormalSpeedMps,
      fullStrengthNormalSpeedMps: policy.fullStrengthNormalSpeedMps,
      derivedStrengths: strengths,
      mixedSequenceSupplyPotential: round(replayWithKernel(sequence, CURRENT_KERNELS[0])),
    };
  });
  assert.equal(
    thresholdRows.find(item => item.id === 'CONTRACT-003-015').deadbandNormalSpeedMps,
    RAVSCORE_CURRENT_SUPPLY_POLICY.deadbandNormalSpeedMps,
  );

  const rateSequence = saturatedThenOutbound(12);
  const sixModerateInboundHours = Array.from({ length: 49 }, (_, index) =>
    index > 42 ? 0.5 : 0);
  const rateRows = CURRENT_RATE_ABLATIONS.map(rates => ({
    id: rates.id,
    inboundPointsPerEffectiveHour: rates.inboundPointsPerEffectiveHour,
    outboundPointsPerEffectiveHour: rates.outboundPointsPerEffectiveHour,
    supplyPotentialAfterSixModerateInboundHours: round(
      replayWithKernel(sixModerateInboundHours, CURRENT_KERNELS[0], rates),
    ),
    supplyPotentialAfterTwelveHourFullReversal: round(
      replayWithKernel(rateSequence, CURRENT_KERNELS[0], rates),
    ),
  }));
  assert.equal(
    rateRows.find(item => item.id === 'CONTRACT-10-8')
      .supplyPotentialAfterTwelveHourFullReversal,
    4,
  );
  assert.equal(
    rateRows.find(item => item.id === 'CONTRACT-10-8')
      .supplyPotentialAfterSixModerateInboundHours,
    30,
  );

  return { outboundRows, kernelRows, thresholdRows, rateRows };
}

function waveSensitivityAudit() {
  const waveSamples = [
    ...Array.from({ length: 12 }, (_, index) => ({
      time: isoAtHour(index + 1),
      waveHeightM: 1,
      wavePeriodS: 7,
    })),
    ...Array.from({ length: 72 }, (_, index) => ({
      time: isoAtHour(index + 13),
      waveHeightM: 0,
      wavePeriodS: 0,
    })),
  ];
  const sensitivityRows = [];
  for (const buildHalfLifeHours of [3, 4, 6]) {
    for (const decayHalfLifeHours of [24, 48, 72]) {
      const rows = buildWaveMobilisationPotential(waveSamples, {
        buildHalfLifeHours,
        decayHalfLifeHours,
      });
      sensitivityRows.push({
        buildHalfLifeHours,
        decayHalfLifeHours,
        peakAfterTwelveHighEnergyHours: round(rows[11].mobilisationPotential),
        afterTwentyFourCalmHours: round(rows[35].mobilisationPotential),
        afterFortyEightCalmHours: round(rows[59].mobilisationPotential),
        afterSeventyTwoCalmHours: round(rows[83].mobilisationPotential),
      });
    }
  }
  const contract = sensitivityRows.find(item => item.buildHalfLifeHours
    === RAVSCORE_WAVE_MOBILISATION_POLICY.buildHalfLifeHours
    && item.decayHalfLifeHours === RAVSCORE_WAVE_MOBILISATION_POLICY.decayHalfLifeHours);
  assert.ok(contract);
  assert.ok(contract.peakAfterTwelveHighEnergyHours > 60);
  assert.ok(contract.afterTwentyFourCalmHours > contract.afterFortyEightCalmHours);
  assert.ok(contract.afterFortyEightCalmHours > contract.afterSeventyTwoCalmHours);
  return { sensitivityRows, contract };
}

function lastMileSensitivityAudit() {
  const activeMaximumReductionShare = RAVSCORE_LAST_MILE_POLICY.maximumAttenuationShare;
  const testedMaximumReductionShares = [0, 0.075, activeMaximumReductionShare, 0.225];
  const counterfactualRows = [];
  for (const maximumReductionShare of testedMaximumReductionShares) {
    for (const supplyPotential of [0, 50, 100]) {
      for (const waveActivity of [0, 1]) {
        for (const alignment of [1, 0, -1]) {
          const approach = clamp(
            (alignment - RAVSCORE_LAST_MILE_POLICY.approachNeutralNormalAlignment)
              / (1 - RAVSCORE_LAST_MILE_POLICY.approachNeutralNormalAlignment),
            0,
            1,
          );
          const factor = clamp(
            1 - maximumReductionShare * waveActivity * (1 - approach),
            1 - maximumReductionShare,
            1,
          );
          counterfactualRows.push({
            maximumReductionPercent: maximumReductionShare * 100,
            supplyPotential,
            waveEnergy: waveActivity === 0 ? 'EXACT_CALM' : 'HIGH_ACTIVE',
            waveApproach: alignment === 1 ? 'ONSHORE'
              : alignment === 0 ? 'CROSS'
                : 'OFFSHORE',
            approach: round(approach, 6),
            factor: round(factor, 6),
            transport: round(supplyPotential * factor),
            transportWeightedContribution: round(
              supplyPotential * factor * RAVSCORE_WEIGHTS.transport,
            ),
            maximumWholeScoreEffectPoints: round(
              supplyPotential * maximumReductionShare * RAVSCORE_WEIGHTS.transport,
            ),
          });
        }
      }
    }
  }
  assert.ok(counterfactualRows.filter(item => item.supplyPotential === 0)
    .every(item => item.transport === 0));
  assert.ok(counterfactualRows.filter(item => item.waveApproach === 'ONSHORE')
    .every(item => item.transport === item.supplyPotential));
  assert.ok(counterfactualRows.filter(item => item.waveEnergy === 'EXACT_CALM')
    .every(item => item.transport === item.supplyPotential));

  const actualOnshore = evaluateIntegratedLastMile({
    supplyPotential: 100,
    lastMileState: boundedLastMileState({
      waveActivity: 1,
      normalAlignment: 1,
      tangentAlignment: 0,
    }),
  });
  const actualCross = evaluateIntegratedLastMile({
    supplyPotential: 100,
    lastMileState: boundedLastMileState({
      waveActivity: 1,
      normalAlignment: 0,
      tangentAlignment: 1,
    }),
  });
  const actualOffshore = evaluateIntegratedLastMile({
    supplyPotential: 100,
    lastMileState: boundedLastMileState({
      waveActivity: 1,
      normalAlignment: -1,
      tangentAlignment: 0,
    }),
  });
  assert.equal(actualOnshore.transport, 100);
  assert.ok(Math.abs(actualCross.factor - 0.88) < 1e-9);
  assert.ok(Math.abs(actualCross.transport - 88) < 1e-9);
  assert.equal(actualOffshore.factor, RAVSCORE_LAST_MILE_POLICY.minimumDeliveryFactor);
  assert.equal(actualOffshore.transport, 85);
  for (const actual of [actualOnshore, actualCross, actualOffshore]) {
    assert.equal(actual.scoreEffect, 'BOUNDED_SUPPLY_ATTENUATION_ONLY');
    assert.equal(actual.structuralUncertainty, true);
    assert.equal(actual.physicalDeliveryResolved, false);
    assert.equal(actual.plausibleTransportRange, null);
  }
  assert.equal(
    (actualOnshore.transport - actualOffshore.transport) * RAVSCORE_WEIGHTS.transport,
    7.5,
    'The bounded last-mile mechanism may change the raw 20/50/30 score by at most 7.5 points before integer rounding',
  );

  const actualLowEnergyOffshore = evaluateIntegratedLastMile({
    supplyPotential: 100,
    lastMileState: boundedLastMileState({
      waveActivity: 0.05,
      normalAlignment: -1,
      tangentAlignment: 0,
    }),
  });
  assert.ok(actualLowEnergyOffshore.transport > 99);
  assert.ok(actualLowEnergyOffshore.transport < 100);
  const exactCalmUnknownDirection = evaluateIntegratedLastMile({
    supplyPotential: 100,
    lastMileState: boundedLastMileState({ waveActivity: 0 }),
  });
  assert.equal(exactCalmUnknownDirection.transport, 100);
  assert.equal(exactCalmUnknownDirection.factor, 1);

  for (const waveDirectionDeg of [270, 180, 90]) {
    const zeroSupply = evaluateIntegratedLastMile({
      supplyPotential: 0,
      lastMileState: lastMileStateForWaveDirection(waveDirectionDeg),
    });
    assert.equal(zeroSupply.transport, 0, 'Wave direction may not create transport at zero supply');
  }
  const unknownDirection = evaluateIntegratedLastMile({
    supplyPotential: 80,
    lastMileState: lastMileStateForWaveDirection(null),
  });
  assert.equal(unknownDirection.available, false);
  assert.equal(unknownDirection.status, 'LAST_MILE_ACTIVE_WAVE_DIRECTION_MISSING');
  assert.equal(unknownDirection.transport, null);
  assert.equal(unknownDirection.plausibleTransportRange, null);
  const unknownEnergy = evaluateIntegratedLastMile({
    supplyPotential: 80,
    lastMileState: {
      lastMileMemoryReady: false,
      lastMileMemoryStatus: 'MISSING_INPUT',
      lastMileEvidenceStatus: 'WAVE_PHYSICS_MISSING',
    },
  });
  assert.equal(unknownEnergy.available, false);
  assert.equal(unknownEnergy.status, 'LAST_MILE_WAVE_APPROACH_STATE_NOT_READY');
  assert.equal(unknownEnergy.transport, null);
  assert.equal(unknownEnergy.plausibleTransportRange, null);

  const fixedHighEnergyWeather = {
    windSpeedMps: 4,
    waveHeightM: 2,
    wavePeriodS: 8,
  };
  const approachCases = [
    { id: 'KNOWN_ONSHORE', waveDirectionDeg: 270 },
    { id: 'KNOWN_CROSS', waveDirectionDeg: 180 },
    { id: 'KNOWN_OFFSHORE', waveDirectionDeg: 90 },
    { id: 'MISSING_DIRECTION', waveDirectionDeg: null },
    {
      id: 'MISSING_ENERGY_OFFSHORE_DIRECTION_KNOWN',
      waveDirectionDeg: 90,
      wavePeriodS: null,
    },
    {
      id: 'INVALID_POSITIVE_HEIGHT_ZERO_PERIOD',
      waveDirectionDeg: null,
      wavePeriodS: 0,
    },
  ];
  const scoreRows = [];
  for (const mode of ['beach', 'waders']) {
    for (const item of approachCases) {
      const missingEnergy = item.id === 'MISSING_ENERGY_OFFSHORE_DIRECTION_KNOWN';
      const invalidEnergy = item.id === 'INVALID_POSITIVE_HEIGHT_ZERO_PERIOD';
      const result = evaluateRavScoreIntegrated({
        mode,
        zone: { onshoreDirectionDeg: 90 },
        weather: {
          ...fixedHighEnergyWeather,
          waveDirectionDeg: item.waveDirectionDeg,
          ...(Object.hasOwn(item, 'wavePeriodS') ? { wavePeriodS: item.wavePeriodS } : {}),
        },
      }, {
        state: readyState(100, 75, {
          lastMileState: missingEnergy || invalidEnergy
            ? {
              lastMileMemoryReady: false,
              lastMileMemoryStatus: 'MISSING_INPUT',
              lastMileEvidenceStatus: invalidEnergy
                ? 'WAVE_PHYSICS_INVALID'
                : 'WAVE_PHYSICS_MISSING',
            }
            : lastMileStateForWaveDirection(item.waveDirectionDeg),
        }),
      });
      const expectedAvailable = ['KNOWN_ONSHORE', 'KNOWN_CROSS', 'KNOWN_OFFSHORE']
        .includes(item.id);
      assert.equal(result.available, expectedAvailable);
      scoreRows.push({
        mode,
        approachCase: item.id,
        available: result.available,
        transport: result.available ? round(result.components.transport) : null,
        transportWeightedContribution: result.available
          ? result.scoreCalculation.weightedContributions.transport
          : null,
        finalScore: result.score,
        lastMileStatus: result.available ? result.diagnostics.lastMile.status : null,
        unavailableReason: result.available ? null : result.reason,
      });
    }
  }
  const scoreRow = (id, mode = 'beach') => scoreRows.find(item =>
    item.approachCase === id && item.mode === mode);
  const activePolicyMaximumRawWholeScoreEffectAtP100 =
    activeMaximumReductionShare * 100 * RAVSCORE_WEIGHTS.transport;
  const activePolicyMaximumDisplayedWholeScoreEffectPoints =
    Math.ceil(activePolicyMaximumRawWholeScoreEffectAtP100);
  for (const mode of ['beach', 'waders']) {
    assert.ok(scoreRow('KNOWN_ONSHORE', mode).transport
      > scoreRow('KNOWN_CROSS', mode).transport);
    assert.ok(scoreRow('KNOWN_CROSS', mode).transport
      > scoreRow('KNOWN_OFFSHORE', mode).transport);
    assert.ok(scoreRow('KNOWN_ONSHORE', mode).transportWeightedContribution
      - scoreRow('KNOWN_OFFSHORE', mode).transportWeightedContribution
      <= activePolicyMaximumRawWholeScoreEffectAtP100);
    assert.ok(scoreRow('KNOWN_ONSHORE', mode).finalScore
      - scoreRow('KNOWN_OFFSHORE', mode).finalScore
      <= activePolicyMaximumDisplayedWholeScoreEffectPoints);
  }
  assert.equal(
    scoreRow('KNOWN_ONSHORE', 'beach').finalScore
      - scoreRow('KNOWN_OFFSHORE', 'beach').finalScore,
    8,
    'Integer rounding can make the displayed score differ by 8 although the raw effect is bounded to 7.5 points',
  );
  const directionScoreSensitivity = Object.fromEntries([
    'KNOWN_ONSHORE',
    'KNOWN_CROSS',
    'KNOWN_OFFSHORE',
  ].map(id => [id, {
    transport: scoreRow(id).transport,
    transportWeightedContribution: scoreRow(id).transportWeightedContribution,
    finalScore: scoreRow(id).finalScore,
  }]));
  assert.equal(
    scoreRow('MISSING_DIRECTION').unavailableReason,
    'LAST_MILE_ACTIVE_WAVE_DIRECTION_MISSING',
    'Active waves without direction must fail closed',
  );
  assert.equal(
    scoreRow('MISSING_ENERGY_OFFSHORE_DIRECTION_KNOWN').unavailableReason,
    'WAVE_PHYSICAL_INPUT_NOT_READY',
    'Missing wave energy must fail closed instead of receiving a favourable point estimate',
  );
  assert.equal(
    scoreRow('INVALID_POSITIVE_HEIGHT_ZERO_PERIOD').unavailableReason,
    'WAVE_PHYSICAL_INPUT_NOT_READY',
    'Positive height with zero period must fail closed instead of becoming exact calm',
  );

  return {
    counterfactualRows,
    scoreRows,
    contractChecks: {
      onshoreTransportAtP100: actualOnshore.transport,
      crossTransportAtP100: actualCross.transport,
      offshoreTransportAtP100: actualOffshore.transport,
      lowEnergyOffshoreTransportAtP100: actualLowEnergyOffshore.transport,
      exactCalmUnknownDirectionTransportAtP100: exactCalmUnknownDirection.transport,
      unknownDirectionPointEstimateAtP80: unknownDirection.transport,
      unknownDirectionRangeAtP80: unknownDirection.plausibleTransportRange,
      unknownEnergyPointEstimateAtP80: unknownEnergy.transport,
      unknownEnergyRangeAtP80: unknownEnergy.plausibleTransportRange,
    },
    directionScoreSensitivity,
    counterfactualPolicySensitivity: {
      testedMaximumReductionPercents: testedMaximumReductionShares.map(value => value * 100),
      maximumRawWholeScoreEffectsAtP100: testedMaximumReductionShares
        .map(value => value * 100 * RAVSCORE_WEIGHTS.transport),
      activePolicyMaximumReductionPercent: activeMaximumReductionShare * 100,
      activePolicyMaximumWholeScoreEffectAtP100:
        activePolicyMaximumRawWholeScoreEffectAtP100,
      activePolicyMaximumRawWholeScoreEffectAtP100,
      activePolicyMaximumDisplayedWholeScoreEffectPoints,
      displayedEffectRoundingSemantics:
        'RAW_EFFECT_MAXIMUM_7_5_POINTS_BEFORE_INTEGER_ROUNDING_DISPLAYED_DIFFERENCE_CAN_BE_8',
      activePolicyIsTransparentUncalibratedPrior: true,
    },
    missingPointEstimateReview: {
      currentDirectionPolicy: 'ACTIVE_WAVE_DIRECTION_MISSING_FAILS_CLOSED',
      exactCalmDirectionPolicy: 'DIRECTION_NEUTRAL_FACTOR_ONE',
      currentMissingEnergyPolicy: 'FAIL_CLOSED',
      numericLastMileEffectEmpiricallySupported: false,
      localBathymetryOrResolvedSurfZoneAvailable: false,
      outerGridDirectionUsedAsBoundedSupplyAttenuationOnly: true,
      disposition: 'DELIVERY_EQUALS_TRANSPORT_POTENTIAL_TIMES_BOUNDED_FACTOR',
    },
  };
}

const CHRONOLOGICAL_CANDIDATE_G_STATE_KEY =
  'sha256:synthetic-offline-candidate-g-state-context';
const CHRONOLOGICAL_INTEGRATED_SAMPLING_CONTEXT_KEY =
  'sha256:synthetic-offline-integrated-sampling-context';

function chronologicalSample(hour, {
  normalCurrentMps = 0.15,
  currentVerified = true,
  waveHeightM = 1,
  wavePeriodS = 7,
  windSpeedMps = 4,
  waveDirectionDeg = 270,
} = {}) {
  return {
    time: isoAtHour(hour),
    currentSpeedMps: normalCurrentMps === null ? null : Math.abs(normalCurrentMps),
    currentAlignment: normalCurrentMps === null || normalCurrentMps === 0
      ? normalCurrentMps === null ? null : 0
      : Math.sign(normalCurrentMps),
    currentVerified,
    waveHeightM,
    wavePeriodS,
    windSpeedMps,
    waveDirectionDeg,
  };
}

function chronologicalContext(sample, mode) {
  return {
    mode,
    zone: { id: 'synthetic-no-geometry', onshoreDirectionDeg: 90 },
    weather: {
      windSpeedMps: sample.windSpeedMps,
      waveHeightM: sample.waveHeightM,
      wavePeriodS: sample.wavePeriodS,
      waveDirectionDeg: sample.waveDirectionDeg,
      currentSpeedMps: sample.currentSpeedMps,
      currentDirectionDeg: sample.currentAlignment === null
        ? null
        : sample.currentAlignment >= 0 ? 90 : 270,
      currentAlignment: sample.currentAlignment,
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

function evaluateChronologicalPair({
  trackId,
  checkpointId,
  sample,
  candidateRow,
  integratedRow,
  mode,
}) {
  assert.equal(candidateRow.time, sample.time);
  assert.equal(integratedRow.time, sample.time);
  const context = chronologicalContext(sample, mode);
  const candidate = evaluateRavScoreCandidateG(context, {
    variantId: CANDIDATE_G_VARIANT_ID,
    memory: candidateRow,
  });
  const integrated = evaluateRavScoreIntegrated(context, { state: integratedRow });
  const rollbackMobilisationPotential = integratedRow.continuationState
    .rollbackCandidateGMobilisationPotential;
  assert.equal(candidateRow.mobilisationPotential, rollbackMobilisationPotential,
    `${trackId}/${checkpointId} rollback mobilisation oracle`);
  const candidatePipelineReady = candidateRow.transportMemoryReady === true
    && candidateRow.transportMemoryStatus === 'READY';
  const integratedPipelineReady = integratedRow.currentMemoryReady === true
    && integratedRow.waveMemoryReady === true;
  if (candidatePipelineReady && integratedPipelineReady) {
    assert.equal(candidate.available, true, `${trackId}/${checkpointId} Candidate G`);
    assert.equal(integrated.available, true, `${trackId}/${checkpointId} integrated`);
  }
  return {
    trackId,
    checkpointId,
    hour: (Date.parse(sample.time) - BASE_TIME_MS) / HOUR_MS,
    mode,
    identicalInputTimestamp: candidateRow.time === integratedRow.time,
    candidateG: {
      pipelineReady: candidatePipelineReady,
      currentStatus: candidateRow.transportMemoryStatus,
      transportPotential: round(candidateRow.transportPotential),
      mobilisationPotential: round(candidateRow.mobilisationPotential),
      evaluatorAvailable: candidate.available === true,
      pipelineBoundScoreAvailable: candidatePipelineReady && candidate.available === true,
      score: candidate.available === true ? candidate.score : null,
      reason: candidate.available === true ? null : candidate.reason,
      wholeScoreOutflowGateApplied:
        candidate.available === true
          ? candidate.scoreCalculation.outflowExhaustionGateApplied
          : null,
    },
    integrated: {
      pipelineReady: integratedPipelineReady,
      currentStatus: integratedRow.currentMemoryStatus,
      waveStatus: integratedRow.waveMemoryStatus,
      supplyPotential: integratedRow.supplyPotential === null
        ? null
        : round(integratedRow.supplyPotential),
      mobilisationPotential: round(integratedRow.mobilisationPotential),
      rollbackCandidateGMobilisationPotential: round(rollbackMobilisationPotential),
      evaluatorAvailable: integrated.available === true,
      pipelineBoundScoreAvailable: integratedPipelineReady && integrated.available === true,
      score: integrated.available === true ? integrated.score : null,
      reason: integrated.available === true ? null : integrated.reason,
    },
    rollbackMobilisationExactParity:
      candidateRow.mobilisationPotential === rollbackMobilisationPotential,
    scoreDelta: candidatePipelineReady && integratedPipelineReady
      && candidate.available === true && integrated.available === true
      ? integrated.score - candidate.score
      : null,
  };
}

function stateRowsByTime(result) {
  return new Map(result.rows.map(row => [row.time, row]));
}

function assertRollbackMobilisationParity(candidateRows, integratedRows, label) {
  if (candidateRows.length !== integratedRows.length) {
    throw new Error(`Rollback mobilisation parity failed for ${label}: row count differs`);
  }
  for (let index = 0; index < candidateRows.length; index += 1) {
    const candidate = candidateRows[index];
    const integrated = integratedRows[index];
    const rollback = integrated?.continuationState
      ?.rollbackCandidateGMobilisationPotential;
    if (candidate?.time !== integrated?.time
      || !Number.isFinite(candidate?.mobilisationPotential)
      || !Number.isFinite(rollback)
      || candidate.mobilisationPotential !== rollback) {
      throw new Error(
        `Rollback mobilisation parity failed for ${label} at row ${index}`,
      );
    }
  }
}

function runPairedContinuation(samples, {
  candidateInitialState,
  integratedInitialState = candidateInitialState,
  candidateMigrationWaveRows = null,
  label = 'chronological-track',
} = {}) {
  const candidate = buildCandidateGDerivedStateSeries(samples, {
    stateKey: CHRONOLOGICAL_CANDIDATE_G_STATE_KEY,
    initialState: candidateInitialState,
  });
  const candidateMigration = integratedInitialState?.transportEvidence
    ? {
        candidateGCurrentBootstrap: {
          migrationId: RAVSCORE_MIGRATION_ID,
          source: RAVSCORE_RECOVERY_POLICY.candidateMigrationCurrentEvidenceSource,
          samplingContextKey: CHRONOLOGICAL_INTEGRATED_SAMPLING_CONTEXT_KEY,
          sourceStateTime: integratedInitialState.time,
          currentReferenceAt: integratedInitialState.transportReferenceAt,
          currentEvidence: integratedInitialState.transportEvidence
            .map(item => ({ ...item })),
          currentNativeHoldAuthorization: null,
        },
        candidateGWaveApproachBootstrap: {
          migrationId: RAVSCORE_MIGRATION_ID,
          source: 'VERIFIED_PRIVATE_DMI_WAVE_DIRECTION_REPLAY',
          samplingContextKey: CHRONOLOGICAL_INTEGRATED_SAMPLING_CONTEXT_KEY,
          sourceStateTime: integratedInitialState.time,
          targetReferenceAt: samples[0]?.time,
          rows: Array.isArray(candidateMigrationWaveRows)
            ? candidateMigrationWaveRows.map(item => ({ ...item }))
            : [],
        },
      }
    : {};
  const integrated = buildIntegratedRavScoreStateSeries(samples, {
    samplingContextKey: CHRONOLOGICAL_INTEGRATED_SAMPLING_CONTEXT_KEY,
    onshoreDirectionDeg: 90,
    initialState: integratedInitialState,
    expectedCandidateGStateKey: CHRONOLOGICAL_CANDIDATE_G_STATE_KEY,
    ...candidateMigration,
  });
  assert.deepEqual(
    candidate.rows.map(row => row.time),
    integrated.rows.map(row => row.time),
    'Candidate G and integrated replay must consume identical ordered timestamps',
  );
  assertRollbackMobilisationParity(candidate.rows, integrated.rows, label);
  return {
    candidate,
    integrated,
    rollbackMobilisationParityRowCount: candidate.rows.length,
  };
}

function chronologicalPairedReplayAudit() {
  const history = Array.from({ length: 49 }, (_, index) => chronologicalSample(index - 48, {
    normalCurrentMps: 0.15,
    waveHeightM: index < 25 ? 1.4 : 0.7,
    wavePeriodS: index < 25 ? 8 : 6,
  }));
  const cold = runPairedContinuation(history, { label: 'cold-48h-kernel-boundary' });
  assert.equal(cold.candidate.rows.at(-1).transportMemoryReady, true);
  assert.equal(cold.integrated.rows.at(-1).currentMemoryReady, true);
  assert.equal(cold.integrated.rows.at(-1).waveMemoryReady, true);
  assert.equal(cold.candidate.rows.at(-2).transportMemoryCoverageHours, 47);
  assert.equal(cold.integrated.rows.at(-2).currentMemoryStatus, 'WINDOW_INCOMPLETE');
  assert.equal(cold.candidate.rows.at(-1).transportMemoryCoverageHours, 48);
  assert.equal(cold.integrated.rows.at(-1).currentMemoryCoverageHours, 48);
  const coldCandidateRows = stateRowsByTime(cold.candidate);
  const coldIntegratedRows = stateRowsByTime(cold.integrated);

  const pairs = [];
  for (const { hour, id } of [
    { hour: -1, id: 'kernel-47h-not-ready' },
    { hour: 0, id: 'kernel-48h-ready' },
  ]) {
    const sample = history.find(item => item.time === isoAtHour(hour));
    pairs.push(evaluateChronologicalPair({
      trackId: '48h-kernel-boundary',
      checkpointId: id,
      sample,
      candidateRow: coldCandidateRows.get(sample.time),
      integratedRow: coldIntegratedRows.get(sample.time),
      mode: 'beach',
    }));
  }

  const reversalSamples = [
    ...Array.from({ length: 14 }, (_, index) => chronologicalSample(index + 1, {
      normalCurrentMps: -0.15,
      waveHeightM: 1.2,
      wavePeriodS: 7,
      waveDirectionDeg: 90,
    })),
    ...Array.from({ length: 4 }, (_, index) => chronologicalSample(index + 15, {
      normalCurrentMps: 0.15,
      waveHeightM: 0.6,
      wavePeriodS: 6,
    })),
  ];
  const candidateMigrationWaveRows = history.slice(
    -RAVSCORE_RECOVERY_POLICY.candidateMigrationWaveApproachReplayHours,
  ).map(sample => ({
    time: sample.time,
    waveHeightM: sample.waveHeightM,
    wavePeriodS: sample.wavePeriodS,
    waveDirectionDeg: sample.waveDirectionDeg,
  }));
  const reversal = runPairedContinuation(reversalSamples, {
    candidateInitialState: cold.candidate.continuationState,
    candidateMigrationWaveRows,
    label: 'candidate-g-migration-and-reversal',
  });
  assert.equal(reversal.integrated.migrationApplied, true);
  assert.equal(reversal.integrated.initialStateSource, 'CANDIDATE_G_SCHEMA2_MIGRATION');
  const mutatedRollbackRows = reversal.integrated.rows.map(row => ({
    ...row,
    continuationState: { ...row.continuationState },
  }));
  mutatedRollbackRows[0].continuationState.rollbackCandidateGMobilisationPotential += 0.001;
  assert.throws(
    () => assertRollbackMobilisationParity(
      reversal.candidate.rows,
      mutatedRollbackRows,
      'negative-mutated-migration-oracle',
    ),
    /Rollback mobilisation parity failed/,
    'a mutated schema-4 rollback mobilisation value must fail the offline rollback gate',
  );
  const reversalCandidateRows = stateRowsByTime(reversal.candidate);
  const reversalIntegratedRows = stateRowsByTime(reversal.integrated);
  for (const sample of reversalSamples) {
    assert.ok(Math.abs(
      reversalCandidateRows.get(sample.time).transportPotential
        - reversalIntegratedRows.get(sample.time).supplyPotential,
    ) <= 1e-9, `migrated current replay diverged at ${sample.time}`);
  }
  for (const hour of [1, 4, 8, 11, 12, 13, 14, 15, 16, 18]) {
    const sample = reversalSamples.find(item => item.time === isoAtHour(hour));
    pairs.push(evaluateChronologicalPair({
      trackId: 'outbound-then-inbound-reversal',
      checkpointId: hour <= 14 ? `outbound-${hour}h` : `inbound-reversal-${hour - 14}h`,
      sample,
      candidateRow: reversalCandidateRows.get(sample.time),
      integratedRow: reversalIntegratedRows.get(sample.time),
      mode: hour % 2 === 0 ? 'waders' : 'beach',
    }));
  }
  const outbound12 = pairs.find(item => item.checkpointId === 'outbound-12h');
  const outbound13 = pairs.find(item => item.checkpointId === 'outbound-13h');
  const outbound14 = pairs.find(item => item.checkpointId === 'outbound-14h');
  assert.deepEqual([
    outbound12.candidateG.transportPotential,
    outbound13.candidateG.transportPotential,
    outbound14.candidateG.transportPotential,
  ], [4, 0, 0]);
  assert.deepEqual([
    outbound12.integrated.supplyPotential,
    outbound13.integrated.supplyPotential,
    outbound14.integrated.supplyPotential,
  ], [4, 0, 0]);
  assert.equal(outbound12.candidateG.wholeScoreOutflowGateApplied, false);
  assert.equal(outbound13.candidateG.wholeScoreOutflowGateApplied, true);
  assert.equal(outbound14.candidateG.wholeScoreOutflowGateApplied, true);
  assert.ok(outbound13.integrated.score > 0);
  assert.ok(outbound14.integrated.score > 0);

  const splitAt = 8;
  const reversalFirst = runPairedContinuation(reversalSamples.slice(0, splitAt), {
    candidateInitialState: cold.candidate.continuationState,
    candidateMigrationWaveRows,
    label: 'split-run-first-segment',
  });
  const reversalSecond = runPairedContinuation(reversalSamples.slice(splitAt), {
    candidateInitialState: reversalFirst.candidate.continuationState,
    integratedInitialState: reversalFirst.integrated.continuationState,
    label: 'split-run-second-segment',
  });
  assert.equal(
    JSON.stringify(reversalSecond.candidate.continuationState),
    JSON.stringify(reversal.candidate.continuationState),
    'Candidate G split-run continuation must reproduce chronological one-shot replay');
  assert.equal(
    JSON.stringify(reversalSecond.integrated.continuationState),
    JSON.stringify(reversal.integrated.continuationState),
    'Integrated split-run continuation must reproduce chronological one-shot replay');
  assert.equal(
    reversalSecond.candidate.continuationState.mobilisationPotential,
    reversalSecond.integrated.continuationState.rollbackCandidateGMobilisationPotential,
    'split-run final rollback mobilisation must equal the Candidate G oracle exactly',
  );

  for (const gapHours of [1, 3, 4]) {
    const sample = chronologicalSample(gapHours, {
      normalCurrentMps: 0.09,
      waveHeightM: 2,
      wavePeriodS: 8,
    });
    const replay = runPairedContinuation([sample], {
      candidateInitialState: cold.candidate.continuationState,
      integratedInitialState: cold.integrated.continuationState,
      label: `verified-gap-${gapHours}h`,
    });
    pairs.push(evaluateChronologicalPair({
      trackId: 'verified-time-gap',
      checkpointId: `gap-${gapHours}h`,
      sample,
      candidateRow: replay.candidate.rows[0],
      integratedRow: replay.integrated.rows[0],
      mode: 'beach',
    }));
  }
  const gap1 = pairs.find(item => item.checkpointId === 'gap-1h');
  const gap3 = pairs.find(item => item.checkpointId === 'gap-3h');
  const gap4 = pairs.find(item => item.checkpointId === 'gap-4h');
  assert.equal(gap1.integrated.pipelineReady, true);
  assert.equal(gap3.integrated.pipelineReady, true);
  assert.equal(gap4.integrated.pipelineReady, false);
  assert.equal(gap4.integrated.currentStatus, 'WINDOW_HAS_TIME_GAP');
  assert.equal(gap4.integrated.waveStatus, 'COLD_START');

  const missingSamples = [
    chronologicalSample(1, {
      normalCurrentMps: null,
      currentVerified: false,
      waveHeightM: null,
      wavePeriodS: null,
    }),
    chronologicalSample(2, {
      normalCurrentMps: 0.09,
      waveHeightM: 1,
      wavePeriodS: 7,
    }),
  ];
  const missing = runPairedContinuation(missingSamples, {
    candidateInitialState: cold.candidate.continuationState,
    integratedInitialState: cold.integrated.continuationState,
    label: 'placeholder-missing-and-recovery',
  });
  for (const [index, checkpointId] of ['missing-input', 'one-hour-recovery'].entries()) {
    pairs.push(evaluateChronologicalPair({
      trackId: 'explicit-missing-and-recovery',
      checkpointId,
      sample: missingSamples[index],
      candidateRow: missing.candidate.rows[index],
      integratedRow: missing.integrated.rows[index],
      mode: 'waders',
    }));
  }
  assert.equal(pairs.find(item => item.checkpointId === 'missing-input')
    .integrated.pipelineReady, false);
  assert.equal(pairs.find(item => item.checkpointId === 'missing-input')
    .integrated.waveStatus, 'MISSING_INPUT');
  assert.equal(pairs.find(item => item.checkpointId === 'one-hour-recovery')
    .integrated.waveStatus, 'RECOVERED_SHORT_GAP');

  const boundarySamples = [
    chronologicalSample(1, { normalCurrentMps: 0.03 }),
    chronologicalSample(2, { normalCurrentMps: 0.031 }),
    chronologicalSample(3, { normalCurrentMps: 0.15 }),
    chronologicalSample(4, { normalCurrentMps: -0.03 }),
    chronologicalSample(5, { normalCurrentMps: -0.031 }),
    chronologicalSample(6, { normalCurrentMps: -0.15 }),
  ];
  const boundary = runPairedContinuation(boundarySamples, {
    candidateInitialState: cold.candidate.continuationState,
    integratedInitialState: cold.integrated.continuationState,
    label: 'current-strength-boundaries',
  });
  for (let index = 0; index < boundarySamples.length; index += 1) {
    assert.ok(Math.abs(
      boundary.candidate.rows[index].transportPotential
        - boundary.integrated.rows[index].supplyPotential,
    ) <= 1e-9, `current-strength boundary ${index} must replay identically`);
    pairs.push(evaluateChronologicalPair({
      trackId: 'current-strength-boundaries',
      checkpointId: [
        'inbound-deadband-0.030',
        'inbound-above-deadband-0.031',
        'inbound-full-strength-0.150',
        'outbound-deadband-0.030',
        'outbound-above-deadband-0.031',
        'outbound-full-strength-0.150',
      ][index],
      sample: boundarySamples[index],
      candidateRow: boundary.candidate.rows[index],
      integratedRow: boundary.integrated.rows[index],
      mode: index % 2 === 0 ? 'beach' : 'waders',
    }));
  }

  assert.equal(pairs.length, 23);
  const migrationCheckpoint = evaluateChronologicalPair({
    trackId: 'migration-and-split-run',
    checkpointId: 'first-migrated-hour',
    sample: reversalSamples[0],
    candidateRow: reversal.candidate.rows[0],
    integratedRow: reversal.integrated.rows[0],
    mode: 'waders',
  });
  assert.equal(reversal.integrated.rows[0].migrationApplied, true);
  pairs.push(migrationCheckpoint);
  assert.equal(pairs.length, 24);
  assert.equal(pairs.every(item => item.identicalInputTimestamp), true);

  const comparable = pairs.filter(item => item.candidateG.pipelineBoundScoreAvailable
    && item.integrated.pipelineBoundScoreAvailable);
  return {
    comparisonKind: 'PAIRED_CHRONOLOGICAL_STATE_PIPELINE_REPLAY',
    pairedComparisonCount: pairs.length,
    individualModelEvaluationCount: pairs.length * 2,
    identicalSyntheticInputTimelineForBothModels: true,
    candidateGSchema2ToIntegratedSchema4MigrationExercised: true,
    splitRunByteEquivalentToOneShot: true,
    rollbackCandidateGMobilisationExactParity: true,
    rollbackMobilisationParityRowCheckCount: [
      cold,
      reversal,
      reversalFirst,
      reversalSecond,
      missing,
      boundary,
    ].reduce((sum, run) => sum + run.rollbackMobilisationParityRowCount, 0) + 3,
    rollbackParityIncludes: [
      'COLD_FIRST_HOUR',
      'PLACEHOLDER_MISSING',
      'LONG_GAP_WITHOUT_PLACEHOLDER',
      'CANDIDATE_G_SCHEMA2_MIGRATION',
      'SPLIT_RUN_BOTH_SEGMENTS',
    ],
    negativeRollbackMutationRejected: true,
    testedCurrentKernelHours: RAVSCORE_CURRENT_SUPPLY_POLICY.windowHours,
    testedCurrentStrengthBoundariesMps: [0.03, 0.031, 0.15, -0.03, -0.031, -0.15],
    testedOutboundDurationsHours: [12, 13, 14],
    testedVerifiedGapHours: [1, 3, 4],
    explicitMissingAndRecoveryExercised: true,
    comparableScorePairCount: comparable.length,
    unavailablePairCount: pairs.length - comparable.length,
    comparableScoreDeltaSummary: {
      syntheticMean: round(mean(comparable.map(item => item.scoreDelta))),
      minimum: Math.min(...comparable.map(item => item.scoreDelta)),
      maximum: Math.max(...comparable.map(item => item.scoreDelta)),
    },
    rows: pairs,
  };
}

function waterLevelAudit() {
  const scenario = SCENARIOS.find(item => item.id === 'canonical-balanced-onshore');
  const contexts = [
    { id: 'FALLING', waterLevelCm: -40, waterLevelTrendCm3h: -8 },
    { id: 'STABLE', waterLevelCm: 0, waterLevelTrendCm3h: 0 },
    { id: 'RISING', waterLevelCm: 40, waterLevelTrendCm3h: 8 },
  ];
  const rows = [];
  for (const mode of ['beach', 'waders']) {
    for (const item of contexts) {
      const result = integratedFor(scenario, mode, item);
      const context = classifyWaterLevelContext(item);
      rows.push({
        mode,
        waterContext: item.id,
        score: result.score,
        classifiedPhase: context.phase,
        scoreEffectPoints: context.scoreEffectPoints,
        interpretationCode: context.interpretationCode,
      });
      assert.equal(result.diagnostics.waterLevelContext.scoreEffectPoints, 0);
      assert.equal(context.transportEffect, 'NONE');
    }
    assert.equal(new Set(rows.filter(item => item.mode === mode).map(item => item.score)).size, 1,
      'Water level must remain explanatory context and must not change the score');
  }
  return { rows };
}

function availabilityAndCadenceAudit() {
  const completeEvidence = Array.from({ length: 49 }, (_, index) => ({
    time: isoAtHour(index - 48),
    strength: index % 9 === 0 ? -0.25 : 0.4,
  }));
  const ready = buildCurrentSupplyMemory(completeEvidence, { referenceTime: isoAtHour(0) });
  const nativeHold = buildCurrentSupplyMemory(completeEvidence, {
    referenceTime: isoAtHour(2),
    nativeHold: true,
  });
  const tooLongHold = buildCurrentSupplyMemory(completeEvidence, {
    referenceTime: isoAtHour(4),
    nativeHold: true,
  });
  const withMissing = completeEvidence.map((item, index) =>
    index === 24 ? { ...item, strength: null } : item);
  const missing = buildCurrentSupplyMemory(withMissing, { referenceTime: isoAtHour(0) });
  const withLargeGap = completeEvidence.filter((item, index) => index < 20 || index > 24);
  const gap = buildCurrentSupplyMemory(withLargeGap, { referenceTime: isoAtHour(0) });
  assert.equal(ready.status, 'READY');
  assert.equal(nativeHold.status, 'READY_NATIVE_HOLD');
  assert.equal(nativeHold.supplyPotential, ready.supplyPotential,
    'Native cadence hold must neither move nor age current memory');
  assert.equal(tooLongHold.status, 'LATEST_SAMPLE_GAP');
  assert.equal(missing.status, 'WINDOW_HAS_MISSING_EVIDENCE');
  assert.equal(gap.status, 'WINDOW_HAS_TIME_GAP');

  const wave = buildRavScoreWaveMobilisationStateSeries([
    { time: isoAtHour(0), waveHeightM: 1, wavePeriodS: 7 },
    { time: isoAtHour(1), waveHeightM: 1, wavePeriodS: 7 },
    { time: isoAtHour(2), waveHeightM: null, wavePeriodS: null },
    { time: isoAtHour(3), waveHeightM: 1, wavePeriodS: 7 },
    { time: isoAtHour(8), waveHeightM: 1, wavePeriodS: 7 },
  ]);
  assert.deepEqual(wave.rows.map(item => item.status), [
    RAVSCORE_WAVE_MOBILISATION_STATUS.COLD_START,
    RAVSCORE_WAVE_MOBILISATION_STATUS.READY,
    RAVSCORE_WAVE_MOBILISATION_STATUS.MISSING_INPUT,
    RAVSCORE_WAVE_MOBILISATION_STATUS.RECOVERED_SHORT_GAP,
    RAVSCORE_WAVE_MOBILISATION_STATUS.COLD_START,
  ]);
  assert.equal(wave.rows[4].transition, 'LONG_GAP_COLD_RESTART');
  assert.equal(wave.rows[2].readiness, false);
  assert.equal(wave.rows[2].mobilisationPotential, wave.rows[1].mobilisationPotential);
  assert.ok(wave.rows[3].creditedDurationHours
    <= RAVSCORE_WAVE_MOBILISATION_POLICY.maximumBuildCreditAfterMissingOrGapHours);
  assert.ok(wave.rows[4].creditedDurationHours
    <= RAVSCORE_WAVE_MOBILISATION_POLICY.maximumBuildCreditAfterMissingOrGapHours);

  const scenario = SCENARIOS[0];
  const missingCurrent = evaluateRavScoreIntegrated({
    mode: 'beach',
    zone: { onshoreDirectionDeg: 90 },
    weather: weatherFor(scenario),
  }, { state: { ...readyState(50, 50), currentMemoryReady: false, supplyPotential: null } });
  const missingWave = evaluateRavScoreIntegrated({
    mode: 'beach',
    zone: { onshoreDirectionDeg: 90 },
    weather: weatherFor(scenario),
  }, { state: { ...readyState(50, 50), waveMemoryReady: false } });
  const missingHuntability = evaluateRavScoreIntegrated({
    mode: 'beach',
    zone: { onshoreDirectionDeg: 90 },
    weather: { wavePeriodS: 7, waveDirectionDeg: 270 },
  }, { state: readyState(50, 50) });
  assert.equal(missingCurrent.reason, 'CURRENT_SUPPLY_STATE_NOT_READY');
  assert.equal(missingWave.reason, 'WAVE_MOBILISATION_STATE_NOT_READY');
  assert.equal(missingHuntability.reason, 'BEACH_WIND_INPUT_MISSING');

  return {
    current: {
      readyStatus: ready.status,
      nativeHoldStatus: nativeHold.status,
      nativeHoldChangesPotential: nativeHold.supplyPotential !== ready.supplyPotential,
      tooLongHoldStatus: tooLongHold.status,
      missingStatus: missing.status,
      largeGapStatus: gap.status,
    },
    wave: wave.rows.map(item => ({
      hour: (Date.parse(item.time) - BASE_TIME_MS) / HOUR_MS,
      status: item.status,
      readiness: item.readiness,
      creditedDurationHours: item.creditedDurationHours,
    })),
    evaluator: {
      missingCurrentReason: missingCurrent.reason,
      missingWaveReason: missingWave.reason,
      missingHuntabilityReason: missingHuntability.reason,
    },
  };
}

function huntabilityAudit() {
  const rows = [];
  for (const mode of ['beach', 'waders']) {
    for (const windSpeedMps of [0, 6, 7, 10, 15, 20]) {
      for (const waveHeightM of [0, 0.25, 0.7, 1.2, 2.5, 4]) {
        const integrated = evaluateIntegratedHuntability(mode, { windSpeedMps, waveHeightM });
        const candidateG = evaluatePhaseDHuntability(mode, { windSpeedMps, waveHeightM }, {
          profile: PHASE_D_HUNTABILITY_PROFILES.WADERS_WIND_LED_WAVE_20,
        });
        assert.equal(integrated.available, true);
        assert.ok(Math.abs(integrated.value - candidateG.value) < 1e-9);
        rows.push({ mode, windSpeedMps, waveHeightM, huntability: round(integrated.value) });
      }
    }
  }
  return {
    evaluationCount: rows.length,
    maximumAbsoluteDifferenceFromCandidateG: 0,
    wadersWind15Maximum: Math.max(...rows.filter(item =>
      item.mode === 'waders' && item.windSpeedMps === 15).map(item => item.huntability)),
    beachWind15Range: {
      minimum: Math.min(...rows.filter(item =>
        item.mode === 'beach' && item.windSpeedMps === 15).map(item => item.huntability)),
      maximum: Math.max(...rows.filter(item =>
        item.mode === 'beach' && item.windSpeedMps === 15).map(item => item.huntability)),
    },
  };
}

async function runAudit() {
  const calculatedContractHash = crypto.createHash('sha256')
    .update(canonicalBundleJson(RAVSCORE_MODEL_CONTRACT))
    .digest('hex');
  assert.equal(calculatedContractHash, RAVSCORE_MODEL_CONTRACT_SHA256);
  const calculatedBundle = await computeRavScoreModelBundle();
  assert.equal(calculatedBundle.modelBundleSha256, RAVSCORE_MODEL_BUNDLE_SHA256);
  assert.deepEqual(RAVSCORE_WEIGHTS, { huntability: 0.20, transport: 0.50, mobilisation: 0.30 });
  assert.equal(RAVSCORE_CURRENT_SUPPLY_POLICY.inboundPointsPerEffectiveHour, 10);
  assert.equal(RAVSCORE_CURRENT_SUPPLY_POLICY.outboundPointsPerEffectiveHour, 8);
  assert.equal(RAVSCORE_CURRENT_SUPPLY_POLICY.fullWeightHours, 24);
  assert.equal(RAVSCORE_CURRENT_SUPPLY_POLICY.windowHours, 48);
  assert.equal(RAVSCORE_WAVE_MOBILISATION_POLICY.buildHalfLifeHours, 4);
  assert.equal(RAVSCORE_WAVE_MOBILISATION_POLICY.decayHalfLifeHours, 48);
  assert.equal(RAVSCORE_LAST_MILE_POLICY.maximumAttenuationShare, 0.15);
  assert.equal(RAVSCORE_LAST_MILE_POLICY.minimumDeliveryFactor, 0.85);
  assert.equal(RAVSCORE_LAST_MILE_POLICY.maximumDeliveryFactor, 1);
  assert.equal(RAVSCORE_LAST_MILE_POLICY.deliveryEquation,
    'DELIVERY_EQUALS_SUPPLY_TIMES_ONE_MINUS_0_15_TIMES_W_TIMES_ONE_MINUS_APPROACH');
  assert.equal(RAVSCORE_LAST_MILE_POLICY.scoreEffect, 'BOUNDED_SUPPLY_ATTENUATION_ONLY');
  assert.equal(RAVSCORE_LAST_MILE_POLICY.waveCanCreateSupply, false);
  assert.equal(RAVSCORE_LAST_MILE_POLICY.waveCanIncreaseSupply, false);
  assert.equal(RAVSCORE_LAST_MILE_POLICY.physicalDeliveryResolved, false);
  assert.equal(RAVSCORE_LAST_MILE_POLICY.structuralUncertaintyAlways, true);
  assert.equal(RAVSCORE_LAST_MILE_POLICY.numericPhysicalUncertaintyIntervalProvided, false);
  assert.equal(RAVSCORE_MODEL_CONTRACT.uncertainty.localBathymetryIncluded, false);
  assert.equal(RAVSCORE_MODEL_CONTRACT.uncertainty.resolvedSurfZoneIncluded, false);

  const scenarioComparison = scenarioComparisonAudit();
  const inventoryCouplingAblation = inventoryCouplingAblationAudit(scenarioComparison);
  const chronologicalPairedReplay = chronologicalPairedReplayAudit();
  const currentSensitivity = currentSensitivityAudit();
  const waveSensitivity = waveSensitivityAudit();
  const lastMileSensitivity = lastMileSensitivityAudit();
  const waterLevel = waterLevelAudit();
  const availabilityAndCadence = availabilityAndCadenceAudit();
  const huntability = huntabilityAudit();

  const report = {
    schemaVersion: '1.0.0',
    status: 'PASSED_SYNTHETIC_OFFLINE_CONTRACT_AND_SENSITIVITY_AUDIT',
    modelBinding: ravScoreModelBinding(),
    dynamicContractCheck: {
      modelId: RAVSCORE_MODEL_ID,
      stateSchemaVersion: RAVSCORE_STATE_SCHEMA_VERSION,
      profileId: RAVSCORE_PROFILE_ID,
      calculatedModelContractSha256: calculatedContractHash,
      matchesExportedContractHash: calculatedContractHash === RAVSCORE_MODEL_CONTRACT_SHA256,
      calculatedModelBundleSha256: calculatedBundle.modelBundleSha256,
      matchesExportedBundleHash: calculatedBundle.modelBundleSha256 === RAVSCORE_MODEL_BUNDLE_SHA256,
    },
    scenarioComparison,
    inventoryCouplingAblation,
    chronologicalPairedReplay,
    currentSensitivity,
    waveSensitivity,
    lastMileSensitivity,
    waterLevel,
    availabilityAndCadence,
    huntability,
    conclusions: {
      improvementsSupportedByContractEvidence: [
        'THE_UNSUPPORTED_THIRTEEN_HOUR_WHOLE_SCORE_ZERO_GATE_IS_REMOVED',
        'GRID_CURRENT_SUPPLY_AND_BOUNDED_LAST_MILE_WAVE_ATTENUATION_ARE_SEPARATE',
        'WAVES_CANNOT_CREATE_TRANSPORT_WHEN_SUPPLY_POTENTIAL_IS_ZERO',
        'LAST_MILE_MULTIPLIES_EXISTING_SUPPLY_EXACTLY_ONCE_WITH_A_FACTOR_FROM_0_85_TO_1',
        'LAST_MILE_WHOLE_SCORE_EFFECT_IS_BOUNDED_TO_7_5_RAW_POINTS_BEFORE_INTEGER_ROUNDING_AND_8_DISPLAYED_POINTS',
        'READY_ZERO_CURRENT_SUPPLY_CANNOT_REACH_THE_FAIR_OR_GOOD_SCORE_BANDS',
        'READY_ZERO_CURRENT_SUPPLY_IS_DISTINCT_FROM_MISSING_CURRENT_EVIDENCE',
        'UNRESOLVED_LAST_MILE_HAS_NO_NUMERIC_PHYSICAL_INTERVAL',
        'ACTIVE_MISSING_DIRECTION_FAILS_CLOSED_WHILE_EXACT_CALM_IS_NEUTRAL',
        'MISSING_WAVE_ENERGY_FAILS_CLOSED',
        'FALLING_WATER_CAN_BE_EXPLAINED_WITHOUT DOUBLE_COUNTING_SCORE',
        'NATIVE_CADENCE_HOLD_ADDS_NO_MOVEMENT_OR_KERNEL_AGEING',
        'BEACH_AND_WADERS_HUNTABILITY_IS_PRESERVED',
      ],
      testedContractViolationsDetected: [],
      caughtAndResolvedRegressionFindings: [
        'THE_OLD_5_25_PERCENT_DELIVERY_PRIOR_WAS_REPLACED_BY_A_0_15_ATTENUATION_ONLY_PRIOR',
        'MISSING_OR_INVALID_WAVE_ENERGY_FAILS_CLOSED_INSTEAD_OF_BECOMING_CALM_EVIDENCE',
      ],
      behaviouralRisksAndUnresolvedQuestions: [
        'NONZERO_SCORE_AT_READY_ZERO_CURRENT_SUPPLY_IS_A_CONDITIONAL_OPPORTUNITY_INDEX_NOT_LOCAL_STOCK_EVIDENCE',
        'ACTIVE_ADDITIVITY_RETAINS_UNCALIBRATED_INDEX_SEPARABILITY_AND_COMPENSATION_PRIORS',
        'EACH_TESTED_COUPLING_CHOOSES_AN_UNSUPPORTED_MAPPING_FROM_CURRENT_SUPPLY_TO_UNOBSERVED_INVENTORY',
        'REMOVING_THE_OLD_PHYSICAL_BOTTLENECK_RAISES_SOME_LOW_SUPPLY_SCENARIOS',
        'CURRENT_KERNEL_THRESHOLD_AND_RATE_PRIORS_REMAIN_SENSITIVE_WITHOUT_FIND_CALIBRATION',
        'WAVE_BUILD_AND_DECAY_PRIORS_CHANGE_EVENT_TIMING_MATERIALLY',
        'THE_LAST_MILE_REMAINS_STRUCTURALLY_UNRESOLVED_AND_CANNOT_BE_INTERPRETED_AS_PHYSICAL_DELIVERY',
        'NO_LOCAL_BATHYMETRY_RESOLVED_SURF_ZONE_UNDERTOW_FEEDER_RIP_OR_RETENTION_MODEL_EXISTS',
      ],
    },
    evidenceLimits: [
      'SYNTHETIC_SCENARIOS_TEST_CAUSAL_AND_PRODUCT_CONTRACTS_NOT_FIND_ACCURACY',
      'NO_REPRESENTATIVE_FIND_AND_ZERO_FIND_DATA_WAS_USED',
      'NO_CLAIM_OF_EMPIRICALLY_IMPROVED_FIND_PRECISION_IS_SUPPORTED',
      'SENSITIVITY_RESULTS_COMPARE_PRIORS_AND_DO_NOT_SELECT_A_CALIBRATED_OPTIMUM',
    ],
    privacy: {
      privateDataRead: false,
      coordinatesReadOrStored: false,
      rawCurrentVectorsReadOrStored: false,
      geometryReadOrChanged: false,
      productionPayloadReadOrStored: false,
      syntheticOnly: true,
    },
  };

  const serialized = JSON.stringify(report);
  for (const forbidden of [
    '"currentUMps":',
    '"currentVMps":',
    '"latitude":',
    '"longitude":',
    '"coordinates":',
  ]) {
    assert.equal(serialized.includes(forbidden), false, `Offline report leaks forbidden field ${forbidden}`);
  }
  assert.equal(report.conclusions.testedContractViolationsDetected.length, 0);
  assert.ok(report.conclusions.caughtAndResolvedRegressionFindings.length > 0);
  return report;
}

const report = await runAudit();
if (process.argv.includes('--self-test')) {
  console.log(
    `OK: ${report.status}; ${report.chronologicalPairedReplay.pairedComparisonCount} paired chronological comparisons/${report.chronologicalPairedReplay.individualModelEvaluationCount} individual model evaluations; ${report.scenarioComparison.pairedComparisonCount} frozen-component pairs; model ${report.modelBinding.modelId}; bundle ${report.modelBinding.modelBundleSha256}.`,
  );
} else {
  console.log(JSON.stringify(report, null, 2));
}
