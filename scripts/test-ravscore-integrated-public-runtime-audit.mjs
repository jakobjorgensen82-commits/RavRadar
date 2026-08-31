import assert from 'node:assert/strict';
import {
  buildCandidateGDerivedStateSeries,
  CANDIDATE_G_STATE_MODEL_ID,
  CANDIDATE_G_STATE_SCHEMA_VERSION,
} from '../js/core/ravscore-candidate-g-state-pipeline.js';
import { evaluateRavScoreIntegrated } from '../js/core/ravscore-integrated.js';
import { buildCurrentSupplyMemory } from '../js/core/ravscore-current-supply-memory.js';
import { buildIntegratedRavScoreStateSeries } from '../js/core/ravscore-integrated-state-pipeline.js';
import { ravScoreVerifiedEvidenceTrust } from '../js/core/ravscore-evidence-trust-contract.js';
import { waveApproachDeliveryContext } from '../js/core/ravscore-wave-approach-state.js';
import {
  RAVSCORE_COLD_REPLAY_ID,
  RAVSCORE_MIGRATION_ID,
  RAVSCORE_MODEL_ID,
  RAVSCORE_PUBLIC_FORECAST_HOURS,
  RAVSCORE_RECOVERY_POLICY,
  RAVSCORE_WEIGHTS,
  ravScoreModelBinding,
} from '../js/core/ravscore-model-contract.js';
import {
  resolvePublicRavScoreProfile,
  selectPublicRavScoreResult,
} from '../js/core/ravscore-public-model.js';
import { auditIntegratedRavScorePublicRuntime } from './audit-ravscore-integrated-public-runtime.mjs';
import { compactIntegratedRavScoreMode } from './lib/ravscore-integrated-runtime.mjs';
import { ravScoreSamplingContextKey } from './lib/ravscore-sampling-context.mjs';
import { candidateGStateKey } from './lib/coastal-point-staging-contract.mjs';
import {
  CANDIDATE_G_OPERATIONAL_ROLLBACK_ID,
} from './lib/ravscore-candidate-g-rollback-runtime.mjs';
import {
  ravScoreModelBinding as candidateGRollbackModelBinding,
} from './rollback-assets/ravscore-model-contract.js';
import {
  buildPublicConditionDetails,
  buildPublicConditions,
  buildPublicManifest,
  compactJson,
  sha256Text,
} from './public-conditions-lib.mjs';

const HOUR_MS = 3_600_000;
const REFERENCE_AT = '2026-08-29T12:00:00.000Z';
const referenceMs = Date.parse(REFERENCE_AT);
const time = offsetHours => new Date(referenceMs + offsetHours * HOUR_MS).toISOString();
const binding = ravScoreModelBinding();
const publicForecastOffsets = Array.from(
  { length: RAVSCORE_PUBLIC_FORECAST_HOURS },
  (_, index) => index,
);
const profile = resolvePublicRavScoreProfile({
  modelCoverageReady: true,
  modelMemoryReady: true,
  modelMigrationReady: true,
});
const weather = Object.freeze({
  time: REFERENCE_AT,
  windSpeedMps: 5,
  windDirectionDeg: 270,
  waveHeightM: 1,
  wavePeriodS: 6,
  waveDirectionDeg: 270,
  waterLevelCm: 8,
  waterLevelTrendCm3h: -2,
  waterTemperatureC: 15,
  currentSpeedMps: 0.09,
  currentDirectionDeg: 90,
  currentProvenance: {
    status: 'verified',
    provider: 'synthetic-dmi',
    collection: 'synthetic-current-grid',
  },
});

const baseSamples = Array.from({ length: 290 }, (_, index) => ({
    time: time(index - 289),
    currentSpeedMps: weather.currentSpeedMps,
    currentAlignment: 1,
    currentVerified: true,
    waveHeightM: weather.waveHeightM,
    wavePeriodS: weather.wavePeriodS,
    waveDirectionDeg: weather.waveDirectionDeg,
  }));
const baseSeries = buildIntegratedRavScoreStateSeries(
  baseSamples,
  {
    samplingContextKey: `sha256:${'0'.repeat(64)}`,
    onshoreDirectionDeg: 90,
  },
);
const baseRow = baseSeries.rows.at(-1);
assert.equal(baseRow.currentMemoryReady, true);
assert.equal(baseRow.waveMemoryReady, true);
const exactColdReplayProof = Object.freeze({
  recoveryId: RAVSCORE_COLD_REPLAY_ID,
  expectedCausalPositionCount: RAVSCORE_RECOVERY_POLICY.coldReplayHours,
  completeCausalPositionCount: RAVSCORE_RECOVERY_POLICY.coldReplayHours,
  boundedUnknownPositionCount: 0,
  historyTransition: RAVSCORE_RECOVERY_POLICY.completeHistoryTransition,
  targetReferenceAt: REFERENCE_AT,
});
const coldBaseSeries = buildIntegratedRavScoreStateSeries(
  baseSamples.slice(-49),
  {
    samplingContextKey: `sha256:${'0'.repeat(64)}`,
    onshoreDirectionDeg: 90,
    coldReplayBootstrap: exactColdReplayProof,
  },
);
const coldBaseRow = coldBaseSeries.rows.at(-1);
assert.equal(coldBaseRow.historyScoreView.quality, 'HISTORY_INCOMPLETE',
  'exact 48-hour cold replay must remain bounded until the wave tail closes');
const candidateStateTemplate = buildCandidateGDerivedStateSeries(
  baseSamples.slice(-49),
  { stateKey: `sha256:${'1'.repeat(64)}` },
).continuationState;
assert.equal(candidateStateTemplate.transportMemoryReady, true);
const historyIncompleteBaseSeries = buildIntegratedRavScoreStateSeries(
  baseSamples.map(sample => sample.time === time(-1)
    ? { ...sample, waveDirectionDeg:null }
    : sample),
  {
    samplingContextKey: `sha256:${'0'.repeat(64)}`,
    onshoreDirectionDeg: 90,
  },
);
const historyIncompleteBaseRow = historyIncompleteBaseSeries.rows.at(-1);
assert.equal(historyIncompleteBaseRow.currentDirectInputAvailable, true);
assert.equal(historyIncompleteBaseRow.historyScoreView.quality, 'HISTORY_INCOMPLETE');
assert.ok(historyIncompleteBaseRow.historyScoreView.reasonCodes
  .includes('LAST_MILE_HISTORY_INCOMPLETE'));

function readyState(part, transition, series = baseSeries) {
  const state = {
    ...structuredClone(series.continuationState),
    samplingContextKey: ravScoreSamplingContextKey(part),
  };
  if (transition !== 'cold') state.lineage = {
      currentEvidenceSource:
        RAVSCORE_RECOVERY_POLICY.candidateMigrationCurrentEvidenceSource,
      migrationId: RAVSCORE_MIGRATION_ID,
      sourceModelId: CANDIDATE_G_STATE_MODEL_ID,
      sourceStateSchemaVersion: CANDIDATE_G_STATE_SCHEMA_VERSION,
      migratedAt: time(-48),
      waveApproachBootstrapHours:
        RAVSCORE_RECOVERY_POLICY.candidateMigrationWaveApproachReplayHours,
      waveApproachMaximumOmittedMomentShare:
        RAVSCORE_RECOVERY_POLICY
          .candidateMigrationWaveApproachMaximumOmittedMomentShare,
      waveApproachMaximumScoreErrorBeforeRounding:
        RAVSCORE_RECOVERY_POLICY
          .candidateMigrationWaveApproachMaximumScoreErrorBeforeRounding,
    };
  return state;
}

function candidateStateFor(part) {
  return {
    ...structuredClone(candidateStateTemplate),
    stateKey: candidateGStateKey(part),
  };
}

function scoreState(state, row = baseRow) {
  const lastMile = waveApproachDeliveryContext(state.waveApproachState);
  return {
    ...state,
    historyScoreView: structuredClone(row.historyScoreView),
    currentVerified: true,
    currentTransition: row.currentTransition,
    currentCoastNormalSpeedMps: row.currentCoastNormalSpeedMps,
    lastMileWaveReferenceAt: state.waveApproachState.waveReferenceAt,
    lastMileMemoryReady: state.waveApproachState.readiness,
    lastMileMemoryStatus: state.waveApproachState.status,
    lastMileEvidenceStatus: lastMile.available
      ? 'DIRECTIONAL_WAVE_EVIDENCE_READY'
      : 'WAVE_APPROACH_STATE_NOT_READY',
    lastMileWaveActivity: lastMile.activity,
    lastMileNormalAlignment: lastMile.normalAlignment,
    lastMileTangentAlignment: lastMile.tangentAlignment,
    lastMileCoherence: lastMile.coherence,
    lastMileApproach: lastMile.approach,
    lastMileFactor: lastMile.factor,
  };
}

function partRuntime(part, transition, {
  series = baseSeries,
  row = baseRow,
  scoreProfile = profile,
} = {}) {
  const state = readyState(part, transition, series);
  const evaluationState = scoreState(state, row);
  const publicContext = {
    windSpeedMps: weather.windSpeedMps,
    waveHeightM: weather.waveHeightM,
    currentSpeedMps: weather.currentSpeedMps,
    currentAlignment: 1,
    currentVerified: true,
    currentTransition: row.currentTransition,
    currentReferenceAt: state.currentReferenceAt,
    currentMemoryReady: state.currentMemoryReady,
    currentMemoryStatus: state.currentMemoryStatus,
    currentMemoryCoverageHours: state.currentMemoryCoverageHours,
    currentMemoryWindowHours: state.currentMemoryWindowHours,
    waveLastVerifiedAt: state.waveLastVerifiedAt,
    waveMemoryReady: state.waveMemoryReady,
    waveMemoryStatus: state.waveMemoryStatus,
    waveTransition: row.waveTransition,
    lastMileWaveReferenceAt: evaluationState.lastMileWaveReferenceAt,
    lastMileMemoryReady: evaluationState.lastMileMemoryReady,
    lastMileMemoryStatus: evaluationState.lastMileMemoryStatus,
    lastMileTransition: row.lastMileTransition,
  };
  const modes = Object.fromEntries(['waders', 'beach'].map(mode => [
    mode,
    compactIntegratedRavScoreMode(evaluateRavScoreIntegrated({
      mode,
      weather,
      zone: { onshoreDirectionDeg: part.onshoreDirectionDeg },
    }, { state: evaluationState })),
  ]));
  const publicModes = Object.fromEntries(['waders', 'beach'].map(mode => [
    mode,
    selectPublicRavScoreResult({
      profile: scoreProfile,
      modelResult: modes[mode],
      modelState: {
        currentMemoryReady: state.currentMemoryReady,
        currentMemoryStatus: state.currentMemoryStatus,
        waveMemoryReady: state.waveMemoryReady,
        waveMemoryStatus: state.waveMemoryStatus,
        lastMileMemoryReady: evaluationState.lastMileMemoryReady,
        lastMileMemoryStatus: evaluationState.lastMileMemoryStatus,
      },
      mode,
      context: publicContext,
    }),
  ]));
  return {
    state,
    modes,
    publicModes,
    model: {
      ...binding,
      weights: RAVSCORE_WEIGHTS,
      scoreImpact: 'active-public',
      automaticActivationAllowed: false,
      publicScoreChanged: true,
      referenceAt: REFERENCE_AT,
      currentReferenceAt: state.currentReferenceAt,
      currentTransition: row.currentTransition,
      currentMemoryReady: state.currentMemoryReady,
      currentMemoryStatus: state.currentMemoryStatus,
      currentMemoryCoverageHours: state.currentMemoryCoverageHours,
      currentMemoryWindowHours: state.currentMemoryWindowHours,
      waveLastVerifiedAt: state.waveLastVerifiedAt,
      waveMemoryReady: state.waveMemoryReady,
      waveMemoryStatus: state.waveMemoryStatus,
      lastMileWaveReferenceAt: evaluationState.lastMileWaveReferenceAt,
      lastMileMemoryReady: evaluationState.lastMileMemoryReady,
      lastMileMemoryStatus: evaluationState.lastMileMemoryStatus,
      migrationApplied: false,
      migrationId: null,
      initialStateAccepted: transition === 'continuation',
      initialStateSource: transition === 'cold'
        ? state.lineage.boundedUnknownPositionCount === 0
          ? 'VERIFIED_PRIVATE_48H_COLD_REPLAY'
          : 'BOUNDED_PRIVATE_PARTIAL_HISTORY_COLD_REPLAY'
        : 'INTEGRATED_CONTINUATION',
      currentState: state,
      modes,
    },
  };
}

function zoneMode(runtime, mode, partIds, partMap) {
  const selected = runtime.publicModes[mode];
  const sortedPartIds = [...partIds].sort();
  const winningPartId = sortedPartIds[0];
  const possibleWinningParts = sortedPartIds.map(partId => ({
    partId,
    name: partMap[partId].name,
    score: selected.score,
    scoreBounds: structuredClone(selected.scoreBounds),
  }));
  return {
    available: true,
    status: 'whole-zone',
    score: selected.score,
    scoreQuality: selected.scoreQuality,
    calibrationEligible: selected.calibrationEligible,
    scoreSemantics: selected.scoreSemantics,
    conservativeTailResetApplied: selected.conservativeTailResetApplied,
    scoreBounds: structuredClone(selected.scoreBounds),
    historyCoverageHours: selected.historyCoverageHours,
    historyReasonCodes: structuredClone(selected.historyReasonCodes),
    winningPartId,
    winningPartName: partMap[winningPartId].name,
    winningPartUncertain: selected.scoreQuality === 'HISTORY_INCOMPLETE'
      && possibleWinningParts.length > 1,
    possibleWinningPartCount: possibleWinningParts.length,
    possibleWinningParts,
    scoreSpread: 0,
    comparisonPartCount: partIds.length,
    components: structuredClone(selected.components),
    componentReasons: structuredClone(selected.componentReasons),
    explanation: structuredClone(selected.explanation),
    weather: structuredClone(weather),
    parts: [],
  };
}

function syntheticFull({
  zoneCount,
  partCounts,
  transition = 'continuation',
  historyIncomplete = false,
}) {
  assert.equal(partCounts.length, zoneCount);
  const runtimeSeries = historyIncomplete ? historyIncompleteBaseSeries : baseSeries;
  const selectedSeries = transition === 'cold' ? coldBaseSeries : runtimeSeries;
  const runtimeRow = transition === 'cold' ? coldBaseRow
    : historyIncomplete ? historyIncompleteBaseRow : baseRow;
  const scoreProfile = resolvePublicRavScoreProfile({
    modelCoverageReady: true,
    modelMemoryReady: !historyIncomplete && transition !== 'cold',
    modelMigrationReady: true,
  });
  const zones = {};
  const coastalZones = {};
  const parts = {};
  let partNumber = 0;
  for (let zoneNumber = 0; zoneNumber < zoneCount; zoneNumber += 1) {
    const zoneId = `synthetic-zone-${zoneNumber + 1}`;
    const partIds = [];
    let firstRuntime = null;
    for (let localPart = 0; localPart < partCounts[zoneNumber]; localPart += 1) {
      partNumber += 1;
      const partId = `synthetic-part-${partNumber}`;
      const part = {
        partId,
        zoneId,
        name: `Synthetic part ${partNumber}`,
        marineCoverage: 'full',
        waterPoint: [8 + partNumber / 10_000, 55 + partNumber / 10_000],
        landPoint: [8.01 + partNumber / 10_000, 55.01 + partNumber / 10_000],
        onshoreDirectionDeg: 90,
        onshoreDirectionSource: 'synthetic-approved',
        flowPoints: {
          current: [8, 55],
          wind: [8.01, 55.01],
          wave: [8.02, 55.02],
          sources: {
            current: 'synthetic-current-grid',
            wind: 'synthetic-wind-grid',
            wave: 'synthetic-wave-grid',
          },
        },
      };
      const runtime = partRuntime(part, transition, {
        series:selectedSeries,
        row:runtimeRow,
        scoreProfile,
      });
      firstRuntime ??= runtime;
      partIds.push(partId);
      parts[partId] = {
        zoneId,
        name: part.name,
        marineCoverage: part.marineCoverage,
        waterPoint: part.waterPoint,
        landPoint: part.landPoint,
        onshoreDirectionDeg: part.onshoreDirectionDeg,
        onshoreDirectionSource: part.onshoreDirectionSource,
        flowPoints: part.flowPoints,
        current: {
          time: REFERENCE_AT,
          weather: structuredClone(weather),
          waders: runtime.publicModes.waders,
          beach: runtime.publicModes.beach,
        },
        ravScoreModel: runtime.model,
      };
    }
    const hourly = publicForecastOffsets.map(offsetHours => ({
      time: time(offsetHours),
      waders: zoneMode(firstRuntime, 'waders', partIds, parts),
      beach: zoneMode(firstRuntime, 'beach', partIds, parts),
    }));
    coastalZones[zoneId] = {
      expectedPartCount: partIds.length,
      scoredPartCount: partIds.length,
      currentReferenceAt: REFERENCE_AT,
      hourly,
    };
    zones[zoneId] = {
      provider: 'synthetic-dmi',
      providerLabel: 'Synthetic DMI',
      flowPoints: {
        current: [8, 55],
        wind: [8.01, 55.01],
        wave: [8.02, 55.02],
        sources: {
          current: 'synthetic-current-grid',
          wind: 'synthetic-wind-grid',
          wave: 'synthetic-wave-grid',
        },
      },
      sources: { current: { provider: 'synthetic-dmi' } },
      current: {
        windSpeedMps: weather.windSpeedMps,
        waveHeightM: weather.waveHeightM,
        wavePeriodS: weather.wavePeriodS,
        currentSpeedMps: weather.currentSpeedMps,
        currentDirectionDeg: weather.currentDirectionDeg,
      },
      history: {},
      forecast: {
        provider: 'synthetic-dmi',
        providerLabel: 'Synthetic DMI',
        generatedAt: REFERENCE_AT,
        validUntil: time(RAVSCORE_PUBLIC_FORECAST_HOURS - 1),
        hourly: publicForecastOffsets.map(offsetHours => ({
          ...weather,
          time: time(offsetHours),
          currentProvenance: undefined,
        })),
      },
    };
  }
  const historyIncompleteZones = Object.entries(coastalZones).flatMap(([zoneId, zone]) => {
    const current = zone.hourly[0];
    const modes = ['waders', 'beach'].filter(mode =>
      current[mode].scoreQuality === 'HISTORY_INCOMPLETE');
    if (!modes.length) return [];
    return [{
      zoneId,
      zoneName: `Synthetic zone ${zoneId.split('-').at(-1)}`,
      modes,
      historyCoverageHours: Math.min(...modes.map(mode =>
        current[mode].historyCoverageHours)),
      historyReasonCodes: [...new Set(modes.flatMap(mode =>
        current[mode].historyReasonCodes))].sort(),
    }];
  });
  const historyIncompleteModeCount = historyIncompleteZones
    .reduce((sum, zone) => sum + zone.modes.length, 0);
  const rollbackBinding = candidateGRollbackModelBinding();
  const candidateRollbackParts = Object.fromEntries(Object.entries(parts)
    .map(([partId, part]) => [partId, {
      ravScoreModel: {
        currentState: candidateStateFor({ ...part, partId }),
      },
    }]));
  return {
    datasetId: `synthetic-integrated-${zoneCount}-${partNumber}`,
    generatedAt: REFERENCE_AT,
    productionReferenceAt: REFERENCE_AT,
    zones,
    ravScoreCandidateGRollback: {
      schemaVersion: '1.0.0',
      kind: 'PRIVATE_CANDIDATE_G_OPERATIONAL_ROLLBACK_RUNTIME',
      privacyClass: 'PRIVATE_PRODUCTION_RUNTIME',
      sourceModelBinding: binding,
      rollbackModelBinding: rollbackBinding,
      rollbackId: CANDIDATE_G_OPERATIONAL_ROLLBACK_ID,
      automaticActivationAllowed: false,
      publicDuringNormalOperation: false,
      runtime: {
        schemaVersion: 1,
        enabled: true,
        generatedAt: REFERENCE_AT,
        modelBinding: rollbackBinding,
        expectedPartCount: partNumber,
        scoredPartCount: partNumber,
        scoreProfile: {
          modelCoverageReady: true,
          modelMemoryReady: true,
          modelMigrationReady: true,
        },
        parts: candidateRollbackParts,
      },
    },
    coastalParts: {
      schemaVersion: 1,
      enabled: true,
      datasetVersion: 'synthetic',
      sourceRunId: 'synthetic',
      generatedAt: REFERENCE_AT,
      modelBinding: binding,
      evidenceTrust: ravScoreVerifiedEvidenceTrust(),
      scoreProfile,
      scoreAvailability: {
        schemaVersion: 2,
        policy: 'integrated-model-local-fail-closed',
        allZonesActive: true,
        allCurrentScoresFullHistory: historyIncompleteModeCount === 0,
        activeZoneCount: zoneCount,
        unavailableZoneCount: 0,
        totalZoneCount: zoneCount,
        fullHistoryModeCount: zoneCount * 2 - historyIncompleteModeCount,
        historyIncompleteModeCount,
        historyIncompleteZoneCount: historyIncompleteZones.length,
        evaluatedAt: REFERENCE_AT,
        unavailableZones: [],
        historyIncompleteZones,
      },
      expectedPartCount: partNumber,
      scoredPartCount: partNumber,
      parts,
      zones: coastalZones,
    },
  };
}

function unitAuditManifest(full, startup, startupText, details, detailsText) {
  const startupSha256 = sha256Text(startupText);
  const detailsSha256 = sha256Text(detailsText);
  return {
    schemaVersion: 4,
    datasetId: full.datasetId,
    generatedAt: full.generatedAt,
    productionReferenceAt: full.productionReferenceAt,
    zoneCount: Object.keys(full.zones).length,
    coastalPartCount: Object.keys(full.coastalParts.parts).length,
    ravScoreEvidenceTrust: structuredClone(full.coastalParts.evidenceTrust),
    ravScoreProfile: structuredClone(full.coastalParts.scoreProfile),
    publicConditionsSha256: startupSha256,
    publicConditionsBytes: Buffer.byteLength(startupText),
    publicConditionDetailsSha256: detailsSha256,
    publicConditionDetailsBytes: Buffer.byteLength(detailsText),
    ravScoreRuntime: {
      schemaVersion: startup.ravScoreRuntime.schemaVersion,
      modelBinding: structuredClone(startup.ravScoreRuntime.modelBinding),
      startup: {
        kind: startup.ravScoreRuntime.kind,
        payloadBodySha256: startup.ravScoreRuntime.payloadBodySha256,
        fileSha256: startupSha256,
        bytes: Buffer.byteLength(startupText),
      },
      details: {
        kind: details.ravScoreRuntime.kind,
        payloadBodySha256: details.ravScoreRuntime.payloadBodySha256,
        fileSha256: detailsSha256,
        bytes: Buffer.byteLength(detailsText),
      },
    },
    complete: true,
  };
}

function publicPackage(full) {
  const startup = buildPublicConditions(full);
  const details = buildPublicConditionDetails(full);
  const startupText = compactJson(startup);
  const detailsText = compactJson(details);
  const coastalPartsText = '{}\n';
  const zoneRegistryText = compactJson({
    type: 'FeatureCollection',
    features: Object.keys(full.zones).map(id => ({
      type: 'Feature', properties: { id, zoneStatus: 'active' }, geometry: null,
    })),
  });
  const productionCoverage = Object.keys(full.zones).length === 210
    && Object.keys(full.coastalParts.parts).length === 673;
  return {
    startup,
    startupText,
    details,
    detailsText,
    coastalPartsText,
    zoneRegistryText,
    manifest: productionCoverage
      ? buildPublicManifest(full, startupText, detailsText, coastalPartsText, zoneRegistryText)
      : unitAuditManifest(full, startup, startupText, details, detailsText),
  };
}

function audit(full, package_, expectedZoneCount, expectedPartCount) {
  return auditIntegratedRavScorePublicRuntime(full, {
    ...package_,
    expectedZoneCount,
    expectedPartCount,
  });
}

const national = syntheticFull({
  zoneCount: 210,
  partCounts: Array.from({ length: 210 }, (_, index) => index < 43 ? 4 : 3),
});
assert.equal(Object.keys(national.coastalParts.parts).length, 673);
const nationalPackage = publicPackage(national);
const nationalReport = audit(national, nationalPackage, 210, 673);
assert.deepEqual(nationalReport.errors, []);
assert.equal(nationalReport.status, 'passed');
assert.equal(nationalReport.coverage.zoneCount, 210);
assert.equal(nationalReport.coverage.partCount, 673);
assert.equal(nationalReport.coverage.publicForecastHours, RAVSCORE_PUBLIC_FORECAST_HOURS);
assert.equal(nationalReport.coverage.expectedZoneModeCount,
  210 * RAVSCORE_PUBLIC_FORECAST_HOURS * 2);
assert.equal(nationalReport.coverage.stateReplayCount, 673);
assert.equal(nationalReport.coverage.reconstructedModeCount, 1_346);
assert.equal(nationalReport.coverage.zoneModeCount,
  210 * RAVSCORE_PUBLIC_FORECAST_HOURS * 2);
assert.equal(nationalReport.continuation.continuedStateCount, 673);
assert.equal(nationalReport.continuation.uniqueSamplingContextCount, 673);
assert.equal(nationalReport.rollback.readyPartCount, 673);
assert.equal(nationalReport.rollback.evidenceLimitExceededPartCount, 0);
assert.equal(nationalReport.rollback.reconstructionFailurePartCount, 0);
assert.equal(nationalReport.rollback.stateContractMismatchPartCount, 0);
assert.equal(nationalReport.rollback.oracleMismatchPartCount, 0);
assert.ok(nationalReport.payload.startupBytes < nationalReport.payload.detailsBytes);

const small = syntheticFull({ zoneCount: 1, partCounts: [1] });
assert.throws(
  () => buildPublicManifest(
    small,
    compactJson(buildPublicConditions(small)),
    compactJson(buildPublicConditionDetails(small)),
    '{}\n',
    compactJson({
      type: 'FeatureCollection',
      features: [{
        type: 'Feature',
        properties: { id: 'synthetic-zone-1', zoneStatus: 'active' },
        geometry: null,
      }],
    }),
  ),
  /complete 210\/673 package/,
  'the production manifest builder must reject a partial unit fixture',
);
small.zones['synthetic-zone-1'].history = {
  maxWave24hM: 1.4,
  hoursSinceHighEnergy: 7,
  mobilisationPotential: 88,
  nearshorePotential: 77,
  eventPhase: 'legacy-shadow-phase',
  inboundCurrentMomentum: 66,
};
for (const result of [
  small.coastalParts.parts['synthetic-part-1'].current.waders,
  small.coastalParts.parts['synthetic-part-1'].current.beach,
  small.coastalParts.zones['synthetic-zone-1'].hourly[0].waders,
  small.coastalParts.zones['synthetic-zone-1'].hourly[0].beach,
]) {
  result.explanation.transportEvent = {
    stateExplanation:'legacy Candidate G state explanation',
  };
  result.explanation.transportDiagnostics.coastTransportExplanation = {
    summary:'legacy Candidate G coast explanation',
    items:[{ id:'legacy', name:'legacy', text:'legacy', selected:true }],
  };
}
const smallPackage = publicPackage(small);
assert.equal(audit(small, smallPackage, 1, 1).status, 'passed');

const historyIncompleteSmall = syntheticFull({
  zoneCount: 1,
  partCounts: [1],
  historyIncomplete: true,
});
const historyIncompleteCurrent = historyIncompleteSmall.coastalParts
  .zones['synthetic-zone-1'].hourly[0];
for (const mode of ['waders', 'beach']) {
  assert.equal(historyIncompleteCurrent[mode].available, true);
  assert.equal(historyIncompleteCurrent[mode].scoreQuality, 'HISTORY_INCOMPLETE');
  assert.equal(historyIncompleteCurrent[mode].calibrationEligible, false);
  assert.equal(historyIncompleteCurrent[mode].historyCoverageHours, 48,
    'wave/last-mile history can be incomplete even with a complete current window');
  assert.ok(historyIncompleteCurrent[mode].historyReasonCodes
    .includes('LAST_MILE_HISTORY_INCOMPLETE'));
}
assert.equal(historyIncompleteSmall.coastalParts.scoreProfile.modelMemoryReady, false);
assert.equal(historyIncompleteSmall.coastalParts.scoreAvailability.historyIncompleteModeCount, 2);
const historyIncompletePackage = publicPackage(historyIncompleteSmall);
const historyIncompleteReport = audit(
  historyIncompleteSmall,
  historyIncompletePackage,
  1,
  1,
);
assert.deepEqual(historyIncompleteReport.errors, [],
  'canonical wave/last-mile HISTORY_INCOMPLETE must pass without weakening rollback');
assert.equal(historyIncompleteReport.rollback.readyPartCount, 1);

const mismatchedHistorySummary = structuredClone(historyIncompleteSmall);
mismatchedHistorySummary.coastalParts.scoreAvailability.historyIncompleteModeCount = 1;
assert.ok(audit(
  mismatchedHistorySummary,
  historyIncompletePackage,
  1,
  1,
).errors.includes('PUBLIC_CURRENT_HISTORY_QUALITY_INVALID'),
'a declared history summary must match every reconstructed current mode');

const falseFullHistoryProfile = structuredClone(historyIncompleteSmall);
falseFullHistoryProfile.coastalParts.scoreProfile.modelMemoryReady = true;
falseFullHistoryProfile.coastalParts.scoreProfile.advisories = [];
assert.ok(audit(
  falseFullHistoryProfile,
  historyIncompletePackage,
  1,
  1,
).errors.includes('PUBLIC_PROFILE_NOT_READY'),
'modelMemoryReady=true must not hide a non-empty HISTORY_INCOMPLETE summary');

for (const [label, mutate] of [
  ['numeric-string score', full => { full.coastalParts.zones['synthetic-zone-1'].hourly[0].waders.score = '68'; }],
  ['numeric-string spread', full => { full.coastalParts.zones['synthetic-zone-1'].hourly[0].waders.scoreSpread = '0'; }],
  ['boolean comparison count', full => { full.coastalParts.zones['synthetic-zone-1'].hourly[0].waders.comparisonPartCount = true; }],
  ['array valid count', full => { full.coastalParts.zones['synthetic-zone-1'].hourly[0].waders.validPartCount = [1]; }],
  ['object expected count', full => { full.coastalParts.zones['synthetic-zone-1'].hourly[0].waders.expectedPartCount = { value:1 }; }],
  ['string huntability component', full => { full.coastalParts.zones['synthetic-zone-1'].hourly[0].waders.components.huntability = '70'; }],
  ['boolean transport component', full => { full.coastalParts.zones['synthetic-zone-1'].hourly[0].waders.components.transport = true; }],
  ['array mobilisation component', full => { full.coastalParts.zones['synthetic-zone-1'].hourly[0].waders.components.release = [60]; }],
  ['string weather', full => { full.coastalParts.zones['synthetic-zone-1'].hourly[0].waders.weather.windSpeedMps = '7.2'; }],
  ['boolean weather', full => { full.coastalParts.zones['synthetic-zone-1'].hourly[0].waders.weather.waveHeightM = false; }],
  ['array weather', full => { full.coastalParts.zones['synthetic-zone-1'].hourly[0].waders.weather.wavePeriodS = [8]; }],
  ['object weather', full => { full.coastalParts.zones['synthetic-zone-1'].hourly[0].waders.weather.currentSpeedMps = { value:0.1 }; }],
  ['short full-history coverage', full => { full.coastalParts.zones['synthetic-zone-1'].hourly[0].waders.historyCoverageHours = 47; }],
]) {
  const poisonedProducerInput = structuredClone(small);
  mutate(poisonedProducerInput);
  assert.throws(
    () => publicPackage(poisonedProducerInput),
    /strict|finite number|safe integer|in range|complete history window/,
    `public producer must reject ${label} before artifact creation`);
}
for (const malformed of ['1', true, [1]]) {
  const poisonedRootCount = structuredClone(small);
  poisonedRootCount.coastalParts.expectedPartCount = malformed;
  assert.throws(() => publicPackage(poisonedRootCount), /strict non-negative safe integer/,
    `public manifest must reject expectedPartCount=${JSON.stringify(malformed)}`);
}
for (const malformed of ['true', 1, [true]]) {
  const poisonedAvailability = structuredClone(small);
  poisonedAvailability.coastalParts.scoreAvailability.allZonesActive = malformed;
  assert.throws(() => publicPackage(poisonedAvailability), /exact boolean/,
    `public producer must reject allZonesActive=${JSON.stringify(malformed)}`);
}
for (const [label, mutate] of [
  ['rawScore string', explanation => { explanation.rawScore = '68'; }],
  ['roundedScore boolean', explanation => { explanation.roundedScore = true; }],
  ['finalScore array', explanation => { explanation.finalScore = [68]; }],
  ['weight string', explanation => { explanation.weights.huntability = '0.2'; }],
  ['contribution boolean', explanation => { explanation.contributions.transport = true; }],
  ['contribution array', explanation => { explanation.contributions.release = [20]; }],
  ['alignment string', explanation => { explanation.transportDiagnostics.currentAlignment = '0.5'; }],
  ['supply boolean', explanation => { explanation.transportDiagnostics.supplyPotential = true; }],
  ['transport array', explanation => { explanation.transportDiagnostics.transportPotential = [70]; }],
  ['coverage string', explanation => { explanation.transportDiagnostics.currentMemoryCoverageHours = '48'; }],
  ['mobilisation string', explanation => { explanation.mobilisationDiagnostics.mobilisationPotential = '60'; }],
  ['water score string', explanation => { explanation.waterLevelContext.scoreEffectPoints = '0'; }],
]) {
  const poisonedExplanation = structuredClone(small);
  mutate(poisonedExplanation.coastalParts.zones['synthetic-zone-1'].hourly[0]
    .waders.explanation);
  assert.throws(() => publicPackage(poisonedExplanation), /strict|finite number|safe integer|in range|exact boolean/,
    `public producer must reject explanation ${label}`);
}

for (const [label, malformed] of [
  ['numeric string', '1'],
  ['boolean', true],
  ['single-item array', [1]],
]) {
  for (const [fieldLabel, expectedError, mutate] of [
    ['root expected part count', 'EXPECTED_PART_COUNT_MISMATCH', full => {
      full.coastalParts.expectedPartCount = structuredClone(malformed);
    }],
    ['root scored part count', 'SCORED_PART_COUNT_MISMATCH', full => {
      full.coastalParts.scoredPartCount = structuredClone(malformed);
    }],
    ['active zone count', 'PUBLIC_CURRENT_AVAILABILITY_INCOMPLETE', full => {
      full.coastalParts.scoreAvailability.activeZoneCount = structuredClone(malformed);
    }],
    ['unavailable zone count', 'PUBLIC_CURRENT_AVAILABILITY_INCOMPLETE', full => {
      full.coastalParts.scoreAvailability.unavailableZoneCount = structuredClone(malformed);
    }],
    ['total zone count', 'PUBLIC_CURRENT_AVAILABILITY_INCOMPLETE', full => {
      full.coastalParts.scoreAvailability.totalZoneCount = structuredClone(malformed);
    }],
    ['zone expected part count', 'ZONE_PART_COVERAGE_MISMATCH', full => {
      full.coastalParts.zones['synthetic-zone-1'].expectedPartCount = structuredClone(malformed);
    }],
    ['zone scored part count', 'ZONE_PART_COVERAGE_MISMATCH', full => {
      full.coastalParts.zones['synthetic-zone-1'].scoredPartCount = structuredClone(malformed);
    }],
    ['winner comparison part count', 'ZONE_CURRENT_WINNER_RECONSTRUCTION_MISMATCH', full => {
      full.coastalParts.zones['synthetic-zone-1'].hourly[0]
        .waders.comparisonPartCount = structuredClone(malformed);
    }],
    ['waders maximum', 'PUBLIC_PART_MODE_CONTRACT_INVALID', full => {
      full.coastalParts.parts['synthetic-part-1'].current
        .waders.explanation.wadersHuntabilityMaximum = structuredClone(malformed);
    }],
  ]) {
    const invalidNumericType = structuredClone(small);
    mutate(invalidNumericType);
    assert.ok(audit(invalidNumericType, smallPackage, 1, 1).errors.includes(expectedError),
      `${fieldLabel} must reject ${label} instead of coercing it`);
  }
}
assert.deepEqual(
  smallPackage.startup.zones['synthetic-zone-1'].history,
  { maxWave24hM: 1.4, hoursSinceHighEnergy: 7 },
  'startup må kun bevare de to modeluafhængige trip-covariater fra legacy-history',
);
const projectedDiagnostics = smallPackage.details.coastalParts
  .zones['synthetic-zone-1'].hourly[0].waders.explanation.transportDiagnostics;
assert.equal(projectedDiagnostics.currentMemoryCoverageHours, baseRow.currentMemoryCoverageHours,
  'detaljefilens endelige projektion skal bevare memory coverage');
assert.equal(projectedDiagnostics.currentMemoryWindowHours, baseRow.currentMemoryWindowHours,
  'detaljefilens endelige projektion skal bevare memory window');
const projectedCurrentDiagnostics = smallPackage.details.coastalParts
  .parts['synthetic-part-1'].current.waders.explanation.transportDiagnostics;
assert.equal(projectedCurrentDiagnostics.currentMemoryCoverageHours, baseRow.currentMemoryCoverageHours,
  'den aktuelle kystdelsprojektion skal bevare memory coverage');
assert.equal(projectedCurrentDiagnostics.currentMemoryWindowHours, baseRow.currentMemoryWindowHours,
  'den aktuelle kystdelsprojektion skal bevare memory window');
assert.doesNotMatch(JSON.stringify(smallPackage),
  /transportEvent|stateExplanation|coastTransportExplanation|legacy Candidate G|legacy-shadow-phase|nearshorePotential|inboundCurrentMomentum/,
  'offentlige slutartifacts må hverken bære gamle forklaringer eller legacy/shadow-history');

const coldReplay = syntheticFull({
  zoneCount: 1,
  partCounts: [1],
  transition: 'cold',
});
const coldReplayPackage = publicPackage(coldReplay);
const coldReplayReport = audit(coldReplay, coldReplayPackage, 1, 1);
assert.deepEqual(coldReplayReport.errors, []);
assert.equal(coldReplayReport.status, 'passed');
assert.equal(coldReplayReport.continuation.coldReplayStateCount, 1);
assert.equal(coldReplayReport.continuation.continuedStateCount, 0);

const incompleteColdReplay = structuredClone(coldReplay);
incompleteColdReplay.coastalParts.parts['synthetic-part-1']
  .ravScoreModel.currentState.lineage.completeCausalPositionCount = 47;
const incompleteColdReplayReport = audit(
  incompleteColdReplay,
  coldReplayPackage,
  1,
  1,
);
assert.ok(incompleteColdReplayReport.errors
  .includes('STATE_LINEAGE_MISSING_OR_AMBIGUOUS'));
assert.ok(incompleteColdReplayReport.errors
  .includes('STATE_COLD_REPLAY_LINEAGE_MISSING'));

const fiveIsolatedReadyHours = structuredClone(small);
const readyIndexes = new Set([0, 24, 48, 72, 96]);
for (const [index, row] of fiveIsolatedReadyHours.coastalParts
  .zones['synthetic-zone-1'].hourly.entries()) {
  if (readyIndexes.has(index)) continue;
  for (const mode of ['waders', 'beach']) {
    row[mode] = {
      modelBinding: binding,
      status: 'unavailable',
      available: false,
      score: null,
      scoreBounds: null,
      scoreQuality: 'UNAVAILABLE',
      calibrationEligible: false,
      scoreSemantics: null,
      conservativeTailResetApplied: false,
      historyCoverageHours: null,
      historyReasonCodes: [],
      reasons: ['Syntetisk manglende sammenhængende strømbevis.'],
      unavailability: {
        available: false,
        code: 'INTEGRATED_RAVSCORE_LOCAL_DATA_INCOMPLETE',
        messageDa: 'Syntetisk manglende sammenhængende strømbevis.',
      },
    };
  }
}
const fiveIsolatedReadyPackage = publicPackage(fiveIsolatedReadyHours);
const fiveIsolatedReadyReport = audit(
  fiveIsolatedReadyHours,
  fiveIsolatedReadyPackage,
  1,
  1,
);
assert.ok(fiveIsolatedReadyReport.errors
  .includes('ZONE_PUBLIC_FORECAST_MODE_UNAVAILABLE'));
assert.ok(fiveIsolatedReadyReport.errors
  .includes('PUBLIC_FORECAST_CONTAINS_UNAVAILABLE_ZONE_MODES'));
assert.ok(!fiveIsolatedReadyReport.errors
  .includes('ZONE_FIVE_DAY_MODE_COVERAGE_INCOMPLETE'),
'Den negative fixture skal bevise, at fem isolerede dage ikke længere kan snyde den fulde timegate.');

const missingForecastHour = structuredClone(small);
missingForecastHour.coastalParts.zones['synthetic-zone-1'].hourly.splice(57, 1);
const missingForecastHourPackage = publicPackage(missingForecastHour);
assert.ok(audit(missingForecastHour, missingForecastHourPackage, 1, 1).errors
  .includes('ZONE_PUBLIC_FORECAST_AXIS_INCOMPLETE'));

const wrongActiveModel = structuredClone(small);
wrongActiveModel.coastalParts.scoreProfile.activeProfileId = CANDIDATE_G_STATE_MODEL_ID;
assert.ok(audit(wrongActiveModel, smallPackage, 1, 1).errors
  .includes('PUBLIC_PROFILE_NOT_INTEGRATED'));

for (const [label, mutate] of [
  ['partial private profile', profile => { delete profile.rankingPolicyId; }],
  ['extra private profile', profile => { profile.unexpectedShadowBinding = 'forbidden'; }],
  ['forged private profile', profile => { profile.bestTimePolicyId = 'forged-best-time'; }],
]) {
  const invalid = structuredClone(small);
  mutate(invalid.coastalParts.scoreProfile);
  assert.ok(audit(invalid, smallPackage, 1, 1).errors
    .includes('PUBLIC_PROFILE_NOT_INTEGRATED'), label);
}
for (const [label, mutate] of [
  ['partial startup profile', package_ => {
    delete package_.startup.coastalParts.scoreProfile.rankingPolicyId;
  }],
  ['extra details profile', package_ => {
    package_.details.coastalParts.scoreProfile.unexpectedShadowBinding = 'forbidden';
  }],
  ['forged manifest profile', package_ => {
    package_.manifest.ravScoreProfile.bestTimePolicyId = 'forged-best-time';
  }],
]) {
  const invalidPackage = structuredClone(smallPackage);
  mutate(invalidPackage);
  assert.ok(audit(small, invalidPackage, 1, 1).errors
    .includes('PUBLIC_PROFILE_BINDING_INVALID'), label);
}
const extraStartupEnvelope = structuredClone(smallPackage);
extraStartupEnvelope.startup.ravScoreRuntime.hiddenFallback = true;
assert.ok(audit(small, extraStartupEnvelope, 1, 1).errors
  .includes('PUBLIC_STARTUP_ENVELOPE_INVALID'));
const extraManifestRuntime = structuredClone(smallPackage);
extraManifestRuntime.manifest.ravScoreRuntime.hiddenFallback = true;
assert.ok(audit(small, extraManifestRuntime, 1, 1).errors
  .includes('PUBLIC_MANIFEST_RUNTIME_INVALID'));
const partialManifestDescriptor = structuredClone(smallPackage);
delete partialManifestDescriptor.manifest.ravScoreRuntime.details.fileSha256;
assert.ok(audit(small, partialManifestDescriptor, 1, 1).errors
  .includes('PUBLIC_MANIFEST_RUNTIME_INVALID'));

const publicShadow = structuredClone(small);
publicShadow.coastalParts.parts['synthetic-part-1'].candidateG = { modes: {} };
assert.ok(audit(publicShadow, smallPackage, 1, 1).errors
  .includes('PUBLIC_SHADOW_FIELD_PRESENT'));

const incompatibleState = structuredClone(small);
incompatibleState.coastalParts.parts['synthetic-part-1']
  .ravScoreModel.currentState.schemaVersion = CANDIDATE_G_STATE_SCHEMA_VERSION;
assert.ok(audit(incompatibleState, smallPackage, 1, 1).errors
  .includes('STATE_MODEL_BINDING_MISMATCH'));
assert.ok(audit(incompatibleState, smallPackage, 1, 1).errors
  .includes('STATE_REPLAY_FAILED'));

const incompatibleStatePolicy = structuredClone(small);
incompatibleStatePolicy.coastalParts.parts['synthetic-part-1']
  .ravScoreModel.currentState.componentSchemaId = 'forged-component-schema';
assert.ok(audit(incompatibleStatePolicy, smallPackage, 1, 1).errors
  .includes('STATE_MODEL_BINDING_MISMATCH'));
assert.ok(audit(incompatibleStatePolicy, smallPackage, 1, 1).errors
  .includes('STATE_REPLAY_FAILED'));

for (const [label, mutate] of [
  ['missing current-evidence source', lineage => { delete lineage.currentEvidenceSource; }],
  ['forged wave bootstrap length', lineage => { lineage.waveApproachBootstrapHours += 1; }],
  ['forged omitted-tail bound', lineage => {
    lineage.waveApproachMaximumOmittedMomentShare *= 2;
  }],
  ['forged last-mile score-error bound', lineage => {
    lineage.waveApproachMaximumScoreErrorBeforeRounding *= 2;
  }],
]) {
  const invalidLineage = structuredClone(small);
  mutate(invalidLineage.coastalParts.parts['synthetic-part-1']
    .ravScoreModel.currentState.lineage);
  const invalidLineageReport = audit(invalidLineage, smallPackage, 1, 1);
  assert.ok(invalidLineageReport.errors.includes('STATE_LINEAGE_MISSING_OR_AMBIGUOUS'),
    `${label} must fail the explicit schema-5 lineage gate`);
  assert.ok(invalidLineageReport.errors.includes('STATE_REPLAY_FAILED'),
    `${label} must fail state replay`);
  assert.equal(invalidLineageReport.rollback.readyPartCount, 1,
    `${label} must not damage the independent Candidate G companion`);
  assert.ok(!invalidLineageReport.errors.includes('ROLLBACK_STATE_CONTRACT_MISMATCH'),
    `${label} must not relabel an independent Candidate G companion`);
}

const wrongContext = structuredClone(small);
wrongContext.coastalParts.parts['synthetic-part-1']
  .ravScoreModel.currentState.samplingContextKey = `sha256:${'f'.repeat(64)}`;
assert.ok(audit(wrongContext, smallPackage, 1, 1).errors
  .includes('STATE_SAMPLING_CONTEXT_MISMATCH'));

const rawStateLeak = structuredClone(small);
rawStateLeak.coastalParts.parts['synthetic-part-1']
  .ravScoreModel.currentState.currentUMps = 0.123;
assert.ok(audit(rawStateLeak, smallPackage, 1, 1).errors
  .includes('STATE_CONTAINS_RAW_OR_COORDINATE_DATA'));

const fiftyPointEvidence = [
  ...Array.from({ length: 49 }, (_, index) => ({
    time: time(-48.5 + index),
    strength: 0.5,
  })),
  { time: REFERENCE_AT, strength: 0.5 },
];
const fiftyPointMemory = buildCurrentSupplyMemory(fiftyPointEvidence, {
  referenceTime: REFERENCE_AT,
  maximumRetainedEvidencePoints: 50,
});
assert.equal(fiftyPointMemory.memoryReady, true);
assert.equal(fiftyPointMemory.evidence.length, 50,
  'The regression fixture must preserve the historical 50-point edge exactly.');
const rollbackLimit = structuredClone(small);
const rollbackLimitState = {
  ...rollbackLimit.coastalParts.parts['synthetic-part-1'].ravScoreModel.currentState,
  currentReferenceAt: fiftyPointMemory.referenceTime,
  currentMemoryReady: fiftyPointMemory.memoryReady,
  currentMemoryStatus: fiftyPointMemory.status,
  currentMemoryWindowHours: fiftyPointMemory.windowHours,
  currentMemoryCoverageHours: fiftyPointMemory.coverageHours,
  currentEvidence: fiftyPointMemory.evidence,
  supplyPotential: fiftyPointMemory.supplyPotential,
};
const rollbackLimitModel = rollbackLimit.coastalParts.parts['synthetic-part-1'].ravScoreModel;
rollbackLimitModel.currentState = rollbackLimitState;
rollbackLimitModel.currentReferenceAt = rollbackLimitState.currentReferenceAt;
rollbackLimitModel.currentMemoryReady = rollbackLimitState.currentMemoryReady;
rollbackLimitModel.currentMemoryStatus = rollbackLimitState.currentMemoryStatus;
rollbackLimitModel.currentMemoryCoverageHours = rollbackLimitState.currentMemoryCoverageHours;
rollbackLimitModel.currentMemoryWindowHours = rollbackLimitState.currentMemoryWindowHours;
rollbackLimitModel.waveLastVerifiedAt = rollbackLimitState.waveLastVerifiedAt;
rollbackLimitModel.waveMemoryReady = rollbackLimitState.waveMemoryReady;
rollbackLimitModel.waveMemoryStatus = rollbackLimitState.waveMemoryStatus;
const rollbackLimitReport = audit(rollbackLimit, smallPackage, 1, 1);
assert.ok(rollbackLimitReport.errors.includes('STATE_REPLAY_FAILED'),
  'A stale or forged 50-point continuation must now fail the schema-5 replay gate too.');
assert.ok(!rollbackLimitReport.errors.includes('ROLLBACK_EVIDENCE_LIMIT_EXCEEDED'),
  'Schema-6 evidence must not be reused as Candidate G rollback evidence.');
assert.equal(rollbackLimitReport.rollback.readyPartCount, 1);
assert.equal(rollbackLimitReport.rollback.evidenceLimitExceededPartCount, 0);

const companionRollbackLimit = structuredClone(small);
companionRollbackLimit.ravScoreCandidateGRollback.runtime.parts['synthetic-part-1']
  .ravScoreModel.currentState.transportEvidence = fiftyPointEvidence;
const companionRollbackLimitReport = audit(
  companionRollbackLimit,
  smallPackage,
  1,
  1,
);
assert.ok(companionRollbackLimitReport.errors.includes('ROLLBACK_EVIDENCE_LIMIT_EXCEEDED'));
assert.ok(companionRollbackLimitReport.errors.includes('ROLLBACK_STATE_CONTRACT_MISMATCH'));
assert.equal(companionRollbackLimitReport.rollback.readyPartCount, 0);
assert.equal(companionRollbackLimitReport.rollback.evidenceLimitExceededPartCount, 1);

const missingCompanion = structuredClone(small);
delete missingCompanion.ravScoreCandidateGRollback;
const missingCompanionReport = audit(missingCompanion, smallPackage, 1, 1);
assert.ok(missingCompanionReport.errors.includes('ROLLBACK_COMPANION_DESCRIPTOR_INVALID'));
assert.ok(missingCompanionReport.errors.includes('ROLLBACK_COMPANION_PART_COVERAGE_MISMATCH'));

const incompleteCompanion = structuredClone(small);
delete incompleteCompanion.ravScoreCandidateGRollback.runtime.parts['synthetic-part-1'];
incompleteCompanion.ravScoreCandidateGRollback.runtime.scoredPartCount = 0;
const incompleteCompanionReport = audit(incompleteCompanion, smallPackage, 1, 1);
assert.ok(incompleteCompanionReport.errors.includes('ROLLBACK_COMPANION_RUNTIME_NOT_READY'));
assert.ok(incompleteCompanionReport.errors.includes('ROLLBACK_COMPANION_PART_COVERAGE_MISMATCH'));

const tamperedCompanion = structuredClone(small);
tamperedCompanion.ravScoreCandidateGRollback.runtime.parts['synthetic-part-1']
  .ravScoreModel.currentState.transportPotential += 1;
const tamperedCompanionReport = audit(tamperedCompanion, smallPackage, 1, 1);
assert.ok(tamperedCompanionReport.errors.includes('ROLLBACK_ORACLE_MISMATCH'));
assert.equal(tamperedCompanionReport.rollback.readyPartCount, 0);

const crossBindingCompanion = structuredClone(small);
crossBindingCompanion.ravScoreCandidateGRollback.rollbackModelBinding.modelId = binding.modelId;
assert.ok(audit(crossBindingCompanion, smallPackage, 1, 1).errors
  .includes('ROLLBACK_COMPANION_BINDING_MISMATCH'));

const scoreMismatch = structuredClone(small);
scoreMismatch.coastalParts.parts['synthetic-part-1']
  .ravScoreModel.modes.waders.score += 1;
assert.ok(audit(scoreMismatch, smallPackage, 1, 1).errors
  .includes('MODE_RECONSTRUCTION_MISMATCH'));

for (const [field, value] of [
  ['currentUMps', 0.123],
  ['gridPoint', [8, 55]],
  ['currentEvidence', [{ time: REFERENCE_AT, strength: 1 }]],
]) {
  const leakedPackage = structuredClone(smallPackage);
  leakedPackage.details.coastalParts.parts['synthetic-part-1'].current[field] = value;
  leakedPackage.detailsText = compactJson(leakedPackage.details);
  const leaked = audit(small, leakedPackage, 1, 1);
  assert.ok(leaked.errors.includes('PUBLIC_PRIVACY_CONTRACT_FAILED'),
    `${field} must be rejected from the public details payload`);
  assert.ok(leaked.errors.includes('PUBLIC_DETAILS_NOT_CANONICAL'));
}

const staleManifest = structuredClone(smallPackage);
staleManifest.manifest.publicConditionsSha256 = '0'.repeat(64);
assert.ok(audit(small, staleManifest, 1, 1).errors
  .includes('PUBLIC_STARTUP_FILE_HASH_MISMATCH'));

const nonCompactStartup = { ...smallPackage, startupText: JSON.stringify(smallPackage.startup, null, 2) };
assert.ok(audit(small, nonCompactStartup, 1, 1).errors
  .includes('PUBLIC_STARTUP_NOT_COMPACT'));

console.log('Integreret RavScore public runtimeaudit: 210/673 og datasikre negative fixtures bestået.');
