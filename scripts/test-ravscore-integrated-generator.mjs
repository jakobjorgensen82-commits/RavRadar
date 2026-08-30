import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {
  CANDIDATE_G_STATE_MODEL_ID,
  CANDIDATE_G_STATE_PROFILE_ID,
  CANDIDATE_G_STATE_SCHEMA_VERSION,
  CANDIDATE_G_STATE_VARIANT_ID,
} from '../js/core/ravscore-candidate-g-state-pipeline.js';
import {
  RAVSCORE_MODEL_ID,
  RAVSCORE_STATE_SCHEMA_VERSION,
} from '../js/core/ravscore-model-contract.js';
import {
  integratedRavScoreReferenceReadiness,
  resolvePublicRavScoreProfile,
  selectPublicRavScoreResult,
} from '../js/core/ravscore-public-model.js';
import {
  buildBoundedCurrentTransportMemory,
  CURRENT_TRANSPORT_POTENTIAL_RECOMMENDED_RESEARCH_PROFILE,
} from '../js/core/ravscore-regime-memory.js';
import { candidateGStateKey } from './lib/coastal-point-staging-contract.mjs';
import {
  buildIntegratedPartScoreSeries,
  compactIntegratedRavScoreMode,
} from './lib/ravscore-integrated-runtime.mjs';

const HOUR_MS = 3_600_000;
const baseMs = Date.parse('2026-08-29T12:00:00.000Z');
const time = offset => new Date(baseMs + offset * HOUR_MS).toISOString();
const part = {
  partId: 'SYNTHETIC-PART-1',
  waterPoint: [8, 55],
  onshoreDirectionDeg: 90,
};
const zone = { id: 'SYNTHETIC-ZONE-1', onshoreDirectionDeg: 90 };
assert.throws(
  () => compactIntegratedRavScoreMode({ available: false, score: null }),
  /model binding is missing/,
  'the integrated adapter must never re-stamp an unbound evaluator result',
);
const legacyEvidence = Array.from({ length: 49 }, (_, index) => ({
  time: time(index - 48),
  strength: index >= 36 ? 0.5 : 0,
}));
const legacyOracle = buildBoundedCurrentTransportMemory(legacyEvidence, {
  ...CURRENT_TRANSPORT_POTENTIAL_RECOMMENDED_RESEARCH_PROFILE,
  referenceTime: time(0),
  restartAfterVerifiedTimeGap: true,
});
assert.equal(legacyOracle.memoryReady, true);
const legacyState = {
  schemaVersion: CANDIDATE_G_STATE_SCHEMA_VERSION,
  modelId: CANDIDATE_G_STATE_MODEL_ID,
  variantId: CANDIDATE_G_STATE_VARIANT_ID,
  profileId: CANDIDATE_G_STATE_PROFILE_ID,
  stateKey: candidateGStateKey(part),
  time: time(0),
  transportReferenceAt: time(0),
  transportPotential: legacyOracle.result.transportPotential,
  outboundEpisodeEffectiveHours: legacyOracle.result.outboundEpisodeEffectiveHours,
  transportMemoryReady: legacyOracle.memoryReady,
  transportMemoryStatus: legacyOracle.status,
  transportMemoryWindowHours: legacyOracle.windowHours,
  transportMemoryCoverageHours: legacyOracle.coverageHours,
  transportEvidence: legacyOracle.evidence,
  mobilisationPotential: 64,
};
const weather = {
  time: time(0),
  windSpeedMps: 5,
  windDirectionDeg: 270,
  waveHeightM: 1,
  wavePeriodS: 6,
  waveDirectionDeg: 270,
  waterLevelCm: 12,
  waterLevelTrendCm3h: -2,
  waterTemperatureC: 15,
  currentSpeedMps: 0.09,
  currentDirectionDeg: 90,
  currentUMps: 987.123,
  currentVMps: -654.321,
  currentProvenance: {
    status: 'verified',
    provider: 'synthetic-grid',
    uMps: 987.123,
    vMps: -654.321,
    gridPoint: [8.01, 55.01],
    samplingPoint: [8, 55],
  },
};

const migrated = buildIntegratedPartScoreSeries({
  part,
  zone,
  hourly: [weather],
  initialState: legacyState,
});
assert.equal(migrated.ravScoreState.schemaVersion, RAVSCORE_STATE_SCHEMA_VERSION);
assert.equal(migrated.ravScoreState.modelId, RAVSCORE_MODEL_ID);
assert.equal(migrated.ravScoreState.migrationApplied, true);
assert.equal(migrated.ravScoreState.initialStateSource, 'CANDIDATE_G_SCHEMA2_MIGRATION');
assert.equal(migrated.scores.length, 1);
assert.deepEqual(Object.keys(migrated.scores[0].ravScoreModel.modes).sort(), ['beach', 'waders']);
assert.ok(migrated.scores[0].ravScoreModel.modes.beach.available);
assert.ok(migrated.scores[0].ravScoreModel.modes.waders.available);
assert.equal(Object.hasOwn(migrated.scores[0], 'candidateG'), false,
  'the production row must not contain a Candidate G shadow result');

const missingWind = buildIntegratedPartScoreSeries({
  part,
  zone,
  hourly: [{ ...weather, windSpeedMps: null }],
  initialState: legacyState,
});
for (const mode of ['beach', 'waders']) {
  const unavailable = missingWind.scores[0].ravScoreModel.modes[mode];
  assert.equal(unavailable.available, false,
    `${mode}: production adapter must fail closed when wind is missing`);
  assert.equal(unavailable.score, null);
  assert.equal(unavailable.reason, `${mode.toUpperCase()}_WIND_INPUT_MISSING`);
  assert.equal(Object.hasOwn(unavailable, 'confidence'), false,
    `${mode}: compact unavailable result must not claim confidence`);
  assert.equal(Object.hasOwn(unavailable, 'components'), false,
    `${mode}: compact unavailable result must not retain score components`);
}

const forbiddenRawVectorKeys = [];
const visit = (value, path = '$') => {
  if (!value || typeof value !== 'object') return;
  for (const [key, child] of Object.entries(value)) {
    if (/^(current)?[uv](mps)?$/i.test(key) || /raw.*[uv]|[uv].*raw/i.test(key)) {
      forbiddenRawVectorKeys.push(`${path}.${key}`);
    }
    visit(child, `${path}.${key}`);
  }
};
visit(migrated);
assert.deepEqual(forbiddenRawVectorKeys, [],
  'raw U/V values must not enter model state or public-destined score rows');
assert.equal(JSON.stringify(migrated).includes('987.123'), false);
assert.equal(JSON.stringify(migrated).includes('-654.321'), false);
assert.equal(Object.hasOwn(migrated.scores[0].weather.currentProvenance, 'gridPoint'), false);
assert.equal(Object.hasOwn(migrated.scores[0].weather.currentProvenance, 'samplingPoint'), false);

const readiness = integratedRavScoreReferenceReadiness([{
  zoneId: zone.id,
  ravScoreState: migrated.ravScoreState,
  scores: migrated.scores,
}], time(0));
assert.deepEqual({
  coverage: readiness.modelCoverageReady,
  memory: readiness.modelMemoryReady,
  migration: readiness.modelMigrationReady,
}, { coverage: true, memory: true, migration: true });
const profile = resolvePublicRavScoreProfile({
  modelCoverageReady: true,
  modelMemoryReady: true,
  modelMigrationReady: true,
});
for (const mode of ['beach', 'waders']) {
  const selected = selectPublicRavScoreResult({
    profile,
    modelResult: migrated.scores[0].ravScoreModel.modes[mode],
    modelState: migrated.scores[0].ravScoreModel,
    mode,
    context: migrated.scores[0].ravScoreModel.publicContext,
  });
  assert.equal(selected.available, true);
  assert.ok(Number.isFinite(selected.score));
  assert.equal(selected.modelBinding.modelId, RAVSCORE_MODEL_ID);
}

const continued = buildIntegratedPartScoreSeries({
  part,
  zone,
  hourly: [{ ...weather, time: time(1), currentUMps: -1, currentVMps: 1 }],
  initialState: migrated.ravScoreState.continuationState,
});
assert.equal(continued.ravScoreState.initialStateAccepted, true);
assert.equal(continued.ravScoreState.migrationApplied, false);
assert.equal(continued.ravScoreState.initialStateSource, 'INTEGRATED_CONTINUATION');
const sameTimeContinuation = buildIntegratedPartScoreSeries({
  part,
  zone,
  hourly: [weather],
  initialState: migrated.ravScoreState.continuationState,
});
assert.equal(sameTimeContinuation.ravScoreState.initialStateAccepted, true);
assert.deepEqual(
  sameTimeContinuation.ravScoreState.continuationState.currentEvidence,
  migrated.ravScoreState.continuationState.currentEvidence,
  'a repeated production hour must preserve the exact schema-4 current evidence',
);
assert.equal(
  sameTimeContinuation.ravScoreState.continuationState.supplyPotential,
  migrated.ravScoreState.continuationState.supplyPotential,
  'a repeated production hour must not double-credit current supply',
);
assert.throws(() => buildIntegratedPartScoreSeries({
  part,
  zone,
  hourly: [{ ...weather, time: time(1) }],
  initialState: {
    ...migrated.ravScoreState.continuationState,
    modelBundleSha256: 'incompatible-schema-4-bundle',
  },
}), /incompatible model metadata/,
'an existing but incompatible schema-4 state must fail closed instead of remigrating');
assert.throws(() => buildIntegratedPartScoreSeries({
  part,
  zone,
  hourly: [{ ...weather, time: time(1) }],
  initialState: {
    ...migrated.ravScoreState.continuationState,
    modelContractSha256: 'incompatible-schema-4-contract',
  },
}), /incompatible model metadata/,
'an incompatible parameter-contract state must fail closed instead of remigrating');

const updater = await fs.readFile(new URL('./update-weather.mjs', import.meta.url), 'utf8');
const bulkUpdater = await fs.readFile(new URL('./update-dmi-bulk.py', import.meta.url), 'utf8');
const productionPartPipeline = await fs.readFile(
  new URL('./lib/ravscore-production-part-pipeline.mjs', import.meta.url),
  'utf8',
);
assert.match(updater, /buildRavScoreProductionPartSeries/);
assert.match(updater, /from '\.\/lib\/ravscore-production-adapters\.mjs'/,
  'verified current and public projection semantics must come from the model-bundled production adapter');
assert.match(updater, /buildIntegratedZoneHourlyProjection\(\{/,
  'zone winner and margin semantics must use the model-bundled production adapter');
assert.match(updater, /buildIntegratedPartPublicProjection\(\{/,
  'public part projection must use the model-bundled production adapter');
assert.doesNotMatch(updater, /function verifiedIntegratedPartHourly|function verifiedBulkCurrent/,
  'current verification semantics must not remain mutable inline outside the model bundle');
assert.match(updater, /loadRavScoreContinuationCheckpointForTarget/,
  'a fresh private build must be able to continue schema-4 memory without hydrating full public conditions');
assert.match(updater, /ravScoreCheckpoint\.loaded \? ravScoreCheckpoint\.states : \{\}/,
  'the compact checkpoint must be injected only after complete validation');
assert.match(updater, /selectRavScoreProductionInitialState\(\{/,
  'the generator must use the shared exact-point > existing > checkpoint > legacy priority contract');
assert.match(updater, /buildRavScoreProductionPartSeries\(\{/,
  'the generator must replay already fetched verified bridge rows before the target');
assert.match(productionPartPipeline, /scoreStartAt:\s*recovery\.scoreStartAt/,
  'replayed historical state rows must never become public score rows');
assert.match(productionPartPipeline, /buildRavScoreRecoveryReplay\(\{/,
  'the model-bundled part pipeline must own verified recovery replay');
assert.match(productionPartPipeline, /buildIntegratedPartScoreSeries\(\{/,
  'the model-bundled part pipeline must own integrated evaluation');
assert.match(productionPartPipeline, /buildCandidateGRollbackPartScoreSeries\(\{/,
  'the model-bundled part pipeline must keep the rollback oracle on identical times');
assert.match(updater, /deployed-private-runtime/,
  'the private deployed or bundle lineage must participate in recovery replay');
assert.match(updater, /progressive-private-dmi/,
  'the progressive DMI lineage must participate in recovery replay');
assert.match(updater, /const DMI_BULK_CACHE_PATH = 'data\/live\/dmi-bulk-cache\.json'/,
  'the progressive DMI cache must remain the normal private build input');
assert.match(updater, /const DEPLOYED_DMI_BULK_CACHE_PATH = '\.cache\/deployed-dmi-bulk-cache\.json'/,
  'the immutable deployed DMI lineage must use its own private path');
assert.match(updater, /readDmiBulkCache\(DEPLOYED_DMI_BULK_CACHE_PATH\)/,
  'the immutable deployed cache must be read separately from progressive output');
assert.match(bulkUpdater, /OUTPUT_PATH = ROOT \/ "data\/live\/dmi-bulk-cache\.json"/,
  'the DMI producer must continue writing only the progressive cache');
assert.match(bulkUpdater, /DMI_BULK_DEPLOYED_FALLBACK_PATH/,
  'the DMI producer must consume the immutable deployed cache through its explicit fallback path');
assert.doesNotMatch(updater, /evaluateRavScoreCandidateG|buildCandidateGDerivedStateSeries|calculateRavScore/,
  'the production generator must not calculate a second public or shadow score model');
assert.doesNotMatch(updater, /currentUMps:\s*weather\.currentUMps|currentVMps:\s*weather\.currentVMps/,
  'public-destined part score rows must not copy raw current vectors');
assert.match(updater, /policy:\s*'integrated-model-local-fail-closed'/);

console.log('Integreret RavScore-produktionsadapter, schema-2 migration og U\/V-minimering: bestået.');
