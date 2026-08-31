import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs/promises';
import {
  CANDIDATE_G_STATE_MODEL_ID,
  CANDIDATE_G_STATE_PROFILE_ID,
  CANDIDATE_G_STATE_SCHEMA_VERSION,
  CANDIDATE_G_STATE_VARIANT_ID,
} from '../js/core/ravscore-candidate-g-state-pipeline.js';
import {
  RAVSCORE_MIGRATION_ID,
  RAVSCORE_MODEL_ID,
  RAVSCORE_RECOVERY_POLICY,
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
import { ravScoreSamplingContextKey } from './lib/ravscore-sampling-context.mjs';
import {
  legacyCandidateGStateKey,
  resolveCandidateGWaveBootstrapTarget,
} from './resolve-candidate-g-wave-bootstrap-target.mjs';
import {
  buildIntegratedPartScoreSeries,
  compactIntegratedRavScoreMode,
} from './lib/ravscore-integrated-runtime.mjs';
import { readProductionWorkflowSources } from './lib/production-workflow-sources.mjs';

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
const migrationSamplingContextKey = ravScoreSamplingContextKey(part);
const exactCurrentEvidence =
  legacyState.transportEvidence.map(item => ({ ...item }));
const candidateGCurrentBootstrap = {
  migrationId: RAVSCORE_MIGRATION_ID,
  source: RAVSCORE_RECOVERY_POLICY.candidateMigrationCurrentEvidenceSource,
  samplingContextKey: migrationSamplingContextKey,
  sourceStateTime: time(0),
  currentReferenceAt: time(0),
  currentEvidence: exactCurrentEvidence,
  currentNativeHoldAuthorization: null,
};
const candidateGWaveApproachBootstrap = {
  migrationId: RAVSCORE_MIGRATION_ID,
  source: 'VERIFIED_PRIVATE_DMI_WAVE_DIRECTION_REPLAY',
  samplingContextKey: migrationSamplingContextKey,
  sourceStateTime: time(0),
  targetReferenceAt: time(0),
  rows: Array.from(
    {
      length:
        RAVSCORE_RECOVERY_POLICY.candidateMigrationWaveApproachReplayHours,
    },
    (_, index) => ({
      time: time(
        index
          - RAVSCORE_RECOVERY_POLICY.candidateMigrationWaveApproachReplayHours,
      ),
      waveHeightM: weather.waveHeightM,
      wavePeriodS: weather.wavePeriodS,
      waveDirectionDeg: weather.waveDirectionDeg,
    }),
  ),
};

const migrated = buildIntegratedPartScoreSeries({
  part,
  zone,
  hourly: [weather],
  initialState: legacyState,
  candidateGCurrentBootstrap,
  candidateGWaveApproachBootstrap,
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
  candidateGCurrentBootstrap,
  candidateGWaveApproachBootstrap,
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
    if (/^(?:(?:current|raw)?[uv](?:mps)?)$/i.test(key)) {
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
assert.deepEqual(
  Object.keys(migrated.scores[0].ravScoreModel.publicContext.currentReferenceProvenance).sort(),
  ['provider', 'status'],
  'direct current provenance must be the same explicit allowlist projection in publicContext',
);

const rawRegionalReferenceProvenance = {
  status: 'verified',
  sourceClass: 'owner-approved-regional-proxy',
  source: 'dmi-dkss-lf-regional-proxy',
  collection: 'dkss_lf',
  distanceKm: 5,
  uMps: 111.222,
  vMps: -333.444,
  gridPoint: [8.02, 55.02],
  samplingPoint: [8, 55],
  rawPayload: 'must-not-cross-runtime-boundary',
};
const regionalSeed = buildIntegratedPartScoreSeries({
  part,
  zone,
  hourly: Array.from({ length: 49 }, (_, index) => ({
    ...weather,
    time: time(index - 48),
    currentProvenance: { ...rawRegionalReferenceProvenance },
  })),
  initialState: null,
});
const regionalHold = buildIntegratedPartScoreSeries({
  part,
  zone,
  hourly: [{
    ...weather,
    time: time(1),
    currentSpeedMps: null,
    currentDirectionDeg: null,
    currentUMps: null,
    currentVMps: null,
    currentProvenance: null,
  }],
  initialState: regionalSeed.ravScoreState.continuationState,
  nativeCadenceHoldHours: 3,
  nativeCadenceReferenceSample: {
    time: time(0),
    currentSpeedMps: weather.currentSpeedMps,
    currentCoastNormalSpeedMps: weather.currentSpeedMps,
    currentVerified: true,
    currentProvenance: { ...rawRegionalReferenceProvenance },
  },
});
assert.equal(regionalHold.ravScoreState.rows[0].currentTransition, 'NATIVE_CADENCE_HOLD');
const expectedRegionalReferenceKeys = [
  'collection',
  'distanceKm',
  'source',
  'sourceClass',
  'status',
];
assert.deepEqual(
  Object.keys(
    regionalHold.scores[0].ravScoreModel.publicContext.currentReferenceProvenance,
  ).sort(),
  expectedRegionalReferenceKeys,
  'native-hold reference provenance must expose only the compact authorization allowlist',
);
assert.deepEqual(
  Object.keys(regionalHold.scores[0].weather.currentProvenance).sort(),
  expectedRegionalReferenceKeys,
  'native-hold weather projection must use the same compact reference provenance',
);
for (const forbiddenField of [
  'uMps',
  'vMps',
  'gridPoint',
  'samplingPoint',
  'rawPayload',
]) {
  assert.equal(
    Object.hasOwn(
      regionalHold.scores[0].ravScoreModel.publicContext.currentReferenceProvenance,
      forbiddenField,
    ),
    false,
    `native-hold publicContext must not expose ${forbiddenField}`,
  );
}

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
const productionWorkflows = await readProductionWorkflowSources();
const productionPartPipeline = await fs.readFile(
  new URL('./lib/ravscore-production-part-pipeline.mjs', import.meta.url),
  'utf8',
);
const operationalActivationSource = await fs.readFile(
  new URL('./ravscore-operational-activation.mjs', import.meta.url),
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
assert.match(
  updater,
  /ravScoreCheckpoint\.loaded && ravScoreCheckpoint\.continuationAvailable\s*\? ravScoreCheckpoint\.states\s*:\s*\{\}/,
  'only a complete, unexpired schema-6 continuation may be injected as model state',
);
assert.match(updater, /selectRavScoreProductionInitialState\(\{/,
  'the generator must use the shared exact-point > existing > checkpoint > legacy priority contract');
assert.match(
  updater,
  /selectRavScoreProductionInitialState\(\{[\s\S]{0,240}targetReferenceAt:\s*generatedAt/,
  'initial-state priority must distinguish expired same-model state against the exact production target',
);
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

function workflowStep(name, role = 'build') {
  const productionWorkflow = productionWorkflows[role];
  assert.equal(typeof productionWorkflow, 'string', `unknown production workflow role: ${role}`);
  const marker = `      - name: ${name}`;
  const occurrences = productionWorkflow.split(marker).length - 1;
  assert.equal(occurrences, 1, `${role} workflow step ${name} must occur exactly once`);
  const start = productionWorkflow.indexOf(marker);
  const next = productionWorkflow.indexOf('\n      - name: ', start + marker.length);
  return {
    start,
    block: productionWorkflow.slice(start, next === -1 ? undefined : next),
  };
}

const operationalActionStep = workflowStep(
  'Resolve one fail-closed operational model action',
);
const candidateCaseStart = operationalActionStep.block.indexOf('            candidate-g)');
const legacyCaseStart = operationalActionStep.block.indexOf('            legacy-candidate-g)');
assert.ok(candidateCaseStart >= 0 && legacyCaseStart > candidateCaseStart);
const pendingCandidateCase = operationalActionStep.block.slice(
  candidateCaseStart,
  legacyCaseStart,
);
assert.match(
  pendingCandidateCase,
  /if \[ "\$INITIAL_CUTOVER_REQUIRED" = "true" \]; then[\s\S]*test "\$ROLLBACK_MODE" = "none"[\s\S]*test "\$RETURN_REQUESTED" != "true"[\s\S]*if \[ "\$GITHUB_EVENT_NAME" = "push" \]; then[\s\S]*action="integrated-cutover"[\s\S]*else[\s\S]*\[\[ "\$CENTRAL_VERSION" =~ \^\[1-9\]\[0-9\]\*\$ \]\][\s\S]*\[\[ "\$ACTIVE_DEPLOYMENT_ID" =~ \^pages\(-recovery\)\?-\[0-9\]\+-\[0-9\]\+\$ \]\][\s\S]*\[\[ "\$ACTIVE_IMPLEMENTATION_CLOSURE_SHA256" =~ \^\[a-f0-9\]\{64\}\$ \]\][\s\S]*if \[ "\$BINDING_CURRENT" = "true" \]; then[\s\S]*action="candidate-maintenance"[\s\S]*else[\s\S]*test "\$BINDING_CURRENT" = "false"[\s\S]*action="candidate-historical-maintenance"/,
  'Et afventende første cutover skal kun ske på push; bot/schedule skal fortsat kunne vedligeholde den aktive Candidate G uden at aktivere modellen.',
);
assert.doesNotMatch(
  pendingCandidateCase,
  /test "\$GITHUB_EVENT_NAME" = "push"/,
  'Afventende cutover må ikke blokere normal Candidate G-vedligeholdelse efter et sikkert cutoverstop.',
);
const legacyCaseEnd = operationalActionStep.block.indexOf(
  '            *) echo "Unknown operational RavScore model; refusing production."',
  legacyCaseStart,
);
assert.ok(legacyCaseEnd > legacyCaseStart);
const legacyCandidateCase = operationalActionStep.block.slice(
  legacyCaseStart,
  legacyCaseEnd,
);
assert.match(
  legacyCandidateCase,
  /test "\$INITIAL_CUTOVER_REQUIRED" = "true"[\s\S]*test "\$LEGACY_SOURCE_REQUIRED" = "true"[\s\S]*test "\$ROLLBACK_MODE" = "none"[\s\S]*test "\$RETURN_REQUESTED" != "true"[\s\S]*if \[ "\$GITHUB_EVENT_NAME" = "push" \]; then[\s\S]*action="integrated-cutover"[\s\S]*else[\s\S]*action="candidate-legacy-maintenance"/,
  'rowless legacy Candidate G must cut over only on push and use the distinct Candidate maintenance bridge on schedule/manual weather',
);
assert.match(
  operationalActionStep.block,
  /CENTRAL_VERSION: \$\{\{ steps\.operational-model\.outputs\.central_version \}\}[\s\S]*ACTIVE_DEPLOYMENT_ID: \$\{\{ steps\.operational-model\.outputs\.active_deployment_id \}\}[\s\S]*ACTIVE_IMPLEMENTATION_CLOSURE_SHA256: \$\{\{ steps\.operational-model\.outputs\.active_implementation_closure_sha256 \}\}/,
  'profile-only Candidate G version 0 must fail before maintenance unless a sealed operational row, deployment and implementation closure exist',
);

const legacySourceImportStep = workflowStep(
  'Import exact legacy Candidate G into an isolated first-cutover source root',
);
assert.match(
  legacySourceImportStep.block,
  /legacy_source_required == 'true'[\s\S]*action == 'integrated-cutover'[\s\S]*action == 'candidate-legacy-maintenance'/,
  'schema-2 source hydration must run only for a sealed legacy source in first cutover or the distinct Candidate maintenance bridge',
);
const legacyDeployFetchStep = workflowStep(
  'Fetch exact public Candidate G source commit for first cutover verification',
  'deploy',
);
assert.match(
  legacyDeployFetchStep.block,
  /legacy_source_required == 'true'[\s\S]*operational_action == 'integrated-cutover'[\s\S]*operational_action == 'candidate-legacy-maintenance'/,
  'deploy-side source verification must fetch the pinned legacy implementation for both first cutover and the bridge',
);
const candidatePlanStep = workflowStep(
  'Seal Candidate G rollback or maintenance plan from the fresh private runtime',
);
assert.match(
  candidatePlanStep.block,
  /candidate-legacy-maintenance[\s\S]*source_model="legacy-candidate-g"[\s\S]*legacy-source\.outputs\.implementation_closure_sha256/,
  'legacy Candidate maintenance must seal its exact legacy source model and implementation closure into the Candidate plan',
);
const cutoverPlanStep = workflowStep(
  'Seal integrated return, initial cutover or historical maintenance plan after backend and public gates',
);
assert.match(
  cutoverPlanStep.block,
  /if \[ "\$\{\{ steps\.operational-model\.outputs\.legacy_source_required \}\}" = "true" \]; then[\s\S]*legacy-source\.outputs\.implementation_closure_sha256/,
  'the return plan must use legacy implementation closure only for a legacy-attested source',
);
const operationalHandoffStep = workflowStep('Seal privacy-safe operational deploy handoff');
assert.match(
  operationalHandoffStep.block,
  /ravscore-operational-deploy-handoff-v2[\s\S]*legacySourceRequired:\(\$legacySourceRequired == "true"\)/,
  'the privacy-safe handoff must bind the exact source verification mode',
);
assert.match(
  operationalHandoffStep.block,
  /jq -r '\.legacySourceRequired'[\s\S]*operational-model\.outputs\.legacy_source_required/,
  'the plan and deploy handoff must agree on legacy source verification before upload',
);
const sourceRestoreStep = workflowStep('Restore the exact sealed active source implementation', 'deploy');
assert.match(
  sourceRestoreStep.block,
  /inputs\.operational_action == 'integrated-cutover' && inputs\.legacy_source_required != 'true'/,
  'a modern schema-4 first-cutover source must restore its exact active deployment seal',
);
const sourceObserveStep = workflowStep('Observe and seal the currently public source manifest', 'deploy');
assert.match(
  sourceObserveStep.block,
  /operational_action == 'candidate-legacy-maintenance'/,
  'the bridge must observe and seal its actually public schema-2 source manifest before begin CAS',
);
assert.match(
  sourceObserveStep.block,
  /legacy_source_required \}\}" = "true"[\s\S]*expected_schema="2"/,
  'source manifest schema must be selected from the sealed source mode, not the generic cutover action',
);
const sourceVerifyStep = workflowStep(
  'Verify the complete currently public source model before begin CAS',
  'deploy',
);
assert.match(
  sourceVerifyStep.block,
  /integrated-cutover\)[\s\S]*legacy_source_required \}\}" = "true"[\s\S]*verify-legacy-candidate-g-source\.mjs verify[\s\S]*source_model="candidate-g"/,
  'first cutover must route legacy schema 2 to fixed attestation and modern schema 4 to exact Candidate deployment verification',
);
assert.match(
  sourceVerifyStep.block,
  /candidate-legacy-maintenance\)[\s\S]*verify-legacy-candidate-g-source\.mjs verify[\s\S]*--attestation[\s\S]*exit 0/,
  'the legacy Candidate maintenance bridge must verify schema 2 through the fixed source attestation before central CAS',
);
assert.doesNotMatch(
  sourceRestoreStep.block,
  /candidate-legacy-maintenance/,
  'rowless legacy maintenance must never pretend that a modern recoverable Pages source seal already exists',
);
const legacyRefreshBeginStep = workflowStep(
  'Begin legacy-to-current Candidate G refresh with exact central CAS',
  'deploy',
);
const legacyRefreshCompleteStep = workflowStep(
  'Complete legacy-to-current Candidate G refresh only after public verification',
  'deploy',
);
const pagesDeployStep = workflowStep('Deploy to GitHub Pages', 'deploy');
assert.ok(
  legacyRefreshBeginStep.start < pagesDeployStep.start
    && pagesDeployStep.start < legacyRefreshCompleteStep.start,
  'legacy Candidate maintenance must remain a two-phase begin → verified Pages → complete transition',
);
assert.match(
  legacyRefreshBeginStep.block,
  /legacy-refresh-begin[\s\S]*--source-attestation[\s\S]*--source-verification[\s\S]*--deployment-id/,
  'legacy refresh begin must bind source attestation, source verification and exact Pages attempt',
);
assert.match(
  legacyRefreshCompleteStep.block,
  /legacy-refresh-complete[\s\S]*--verification[\s\S]*--deployment-id/,
  'legacy refresh complete must be unreachable until the public target verification exists',
);
const failureReconcileStep = workflowStep(
  'Reconcile an ambiguous failed transition from observed public identity',
  'deploy',
);
assert.match(
  failureReconcileStep.block,
  /candidate-legacy-refresh-begin\.outcome == 'success'/,
  'an ambiguous legacy Candidate deployment must enter the same public-identity reconciliation gate',
);
const sourceEvidenceUploadStep = workflowStep(
  'Upload privacy-safe source evidence before any activation CAS',
  'deploy',
);
assert.match(
  sourceEvidenceUploadStep.block,
  /operational_action == 'candidate-legacy-maintenance'/,
  'the bridge must persist privacy-safe legacy source evidence for cross-run reconciliation',
);
const deploymentDecisionStep = workflowStep(
  'Decide whether this sealed artifact may deploy',
);
assert.match(
  deploymentDecisionStep.block,
  /candidate-legacy-maintenance[\s\S]*deployment_model="candidate-g"/,
  'the bridge may deploy only the sealed current Candidate G target, never integrated RavScore',
);
const integratedBeginStep = workflowStep(
  'Begin integrated return or first cutover with exact central CAS',
  'deploy',
);
assert.match(
  integratedBeginStep.block,
  /legacy_source_required \}\}" = "true"[\s\S]*--source-attestation/,
  'legacy attestation may only be passed when the sealed source mode requires it',
);
assert.match(
  operationalActivationSource,
  /if \(plan\.legacySourceRequired\) \{[\s\S]*readJsonOption\(options, 'source-attestation',[\s\S]*Legacy Candidate G source attestation/,
  'the activation CLI must not require a legacy attestation for a modern schema-4 initial-cutover retry',
);

const centralApplyStep = workflowStep(
  'Apply centrally approved zone geometry and deletions',
);
const activeRegistryStep = workflowStep(
  'Materialize the authoritative active coastal-part registry',
);
const legacyHydrateStep = workflowStep(
  'Import exact public Candidate G runtime only for first integrated bootstrap',
);
const aggregateResolverStep = workflowStep(
  'Resolve one aggregate Candidate G wave-bootstrap target',
);
const dmiBulkStep = workflowStep('Update DMI bulk model cache');
assert.ok(
  dmiBulkStep.block.includes('continue-on-error: true'),
  'the DMI producer must yield control after a real failure so its progressive cache can be saved before the cutover gate fails closed',
);
assert.ok(
  centralApplyStep.start < activeRegistryStep.start
    && activeRegistryStep.start < legacyHydrateStep.start
    && legacyHydrateStep.start < aggregateResolverStep.start
    && aggregateResolverStep.start < dmiBulkStep.start,
  'first cutover must apply central truth, materialize its active registry, hydrate and resolve the exact legacy source, then start DMI',
);
assert.ok(
  aggregateResolverStep.block.includes(
    '--source-registry .cache/ravscore-legacy-candidate-g-source/coastal-parts-v2.json',
  ),
  'the aggregate resolver must bind Candidate G states to the atomically hydrated source registry',
);
assert.ok(
  aggregateResolverStep.block.includes('--registry data/live/coastal-parts-v2.json'),
  'the aggregate resolver must separately bind the active central registry',
);

const updateWeatherStep = workflowStep('Update central weather cache');
assert.ok(
  updateWeatherStep.block.includes(
    "RAVSCORE_FIRST_CUTOVER_BOOTSTRAP_MODE: ${{ steps.legacy-bootstrap.outputs.required == 'true' && steps.ravscore-wave-bootstrap-target.outputs.mode || 'auto' }}",
  ),
  'the resolver mode must enter update-weather unchanged during the first cutover',
);
assert.ok(
  updateWeatherStep.block.includes(
    "RAVSCORE_FIRST_CUTOVER_SOURCE_VALIDATED: ${{ steps.legacy-bootstrap.outputs.required == 'true' && steps.ravscore-wave-bootstrap-target.outputs.source_validated || 'false' }}",
  ),
  'the resolver source-validation attestation must enter update-weather unchanged during the first cutover',
);
assert.match(
  updater,
  /candidateGBootstrapMode:\s*RAVSCORE_FIRST_CUTOVER_BOOTSTRAP_MODE/,
  'update-weather must pass the exact workflow mode into initial-state selection',
);
assert.match(
  updater,
  /candidateGSourceValidated:\s*RAVSCORE_FIRST_CUTOVER_SOURCE_VALIDATED/,
  'update-weather must pass the exact workflow source attestation into initial-state selection',
);

assert.ok(
  dmiBulkStep.block.includes(
    "DMI_BULK_PRIVATE_WAVE_BOOTSTRAP_MODE: ${{ steps.legacy-bootstrap.outputs.required == 'true' && steps.ravscore-wave-bootstrap-target.outputs.mode || 'none' }}",
  ),
  'the WAM producer must receive the aggregate resolver mode without remapping it',
);
assert.ok(
  dmiBulkStep.block.includes(
    'DMI_BULK_PRIVATE_WAVE_BOOTSTRAP_TARGET_HOUR: ${{ steps.ravscore-wave-bootstrap-target.outputs.target_hour || env.RAVRADAR_PRODUCTION_TARGET_HOUR }}',
  ),
  'the WAM producer must receive the aggregate resolver target hour',
);
const wamGateStep = workflowStep(
  'Require complete private WAM history before first integrated cutover',
);
assert.ok(
  wamGateStep.block.includes('id: wam-bootstrap-readiness')
    && wamGateStep.block.includes('producer_outcome="${{ steps.dmi-bulk.outcome }}"')
    && wamGateStep.block.includes('validator_status=$?')
    && wamGateStep.block.includes('wam_code="DMI_BULK_FAILED"')
    && wamGateStep.block.includes('validator_status=1')
    && wamGateStep.block.includes('echo "code=$wam_code" >> "$GITHUB_OUTPUT"')
    && wamGateStep.block.includes('exit "$validator_status"'),
  'the hard WAM gate must expose only a bounded safe code while preserving its exit status',
);
assert.ok(
  wamGateStep.block.includes(
    '--mode "${{ steps.ravscore-wave-bootstrap-target.outputs.mode }}"',
  ),
  'the WAM completion gate must validate the same resolver mode as the producer',
);
assert.ok(
  wamGateStep.block.includes(
    '--target-hour "${{ steps.ravscore-wave-bootstrap-target.outputs.target_hour }}"',
  ),
  'the WAM completion gate must validate the same resolver target as the producer',
);

const progressiveDmiSaveStep = workflowStep(
  'Save progressive private DMI zone cache',
);
assert.ok(
  dmiBulkStep.start < progressiveDmiSaveStep.start
    && progressiveDmiSaveStep.start < wamGateStep.start,
  'the progressive cache must be saved after DMI work and before the fail-closed WAM completion gate',
);
assert.ok(
  progressiveDmiSaveStep.block.includes(
    "if: always() && steps.preflight.outputs.should_run == 'true' && steps.dmi-bulk.outcome != 'cancelled' && hashFiles('data/live/dmi-bulk-cache.json') != ''",
  ),
  'a real partial DMI cache must be saved after a failed producer so the next run can continue',
);
assert.doesNotMatch(
  progressiveDmiSaveStep.block,
  /success\(\)|dmi-bulk\.outcome\s*(?:==|!=)\s*'failure'|dmi-bulk\.outcome\s*==\s*'success'/,
  'progressive DMI cache persistence must not be restricted to a fully successful producer',
);

const pointCandidateStep = workflowStep(
  'Advance private point-candidate readiness without public score impact',
);
assert.ok(
  pointCandidateStep.block.includes('continue-on-error: true')
    && pointCandidateStep.block.includes("steps.dmi-bulk.outcome == 'success'"),
  'an inactive private point candidate must not consume a failed DMI cache or block production progress',
);

const parserRegistryParts = Array.from({ length: 673 }, (_, index) => ({
  partId: `PARSER-PART-${String(index).padStart(3, '0')}`,
  waterPoint: [8, 55],
  onshoreDirectionDeg: index % 360,
}));
const parserRegistryZones = Object.fromEntries(
  Array.from({ length: 210 }, (_, index) => [
    `PARSER-ZONE-${String(index).padStart(3, '0')}`,
    [],
  ]),
);
const parserRegistryZoneIds = Object.keys(parserRegistryZones);
parserRegistryParts.forEach((part, index) => {
  parserRegistryZones[parserRegistryZoneIds[index % parserRegistryZoneIds.length]].push(part);
});
const parserRegistry = {
  schemaVersion: 2,
  enabled: true,
  partCount: 673,
  zoneCount: 210,
  zones: parserRegistryZones,
};
const parserConditions = {
  coastalParts: {
    parts: Object.fromEntries(parserRegistryParts.map(parserPart => [
      parserPart.partId,
      {
        candidateG: {
          currentState: {
            ...structuredClone(legacyState),
            stateKey: legacyCandidateGStateKey(parserPart),
          },
        },
      },
    ])),
  },
};
const parserResolverResult = resolveCandidateGWaveBootstrapTarget({
  conditions: parserConditions,
  sourceRegistry: parserRegistry,
  registry: parserRegistry,
  productionTargetAt: time(0),
});
const python = process.env.RAVRADAR_PYTHON || process.env.PYTHON || 'python';
const parserProbe = spawnSync(python, [
  '-c',
  [
    'import sys',
    "sys.path.insert(0, 'scripts')",
    'from lib.dmi_wave_history_bootstrap import format_utc_hour, parse_utc_hour',
    'print(format_utc_hour(parse_utc_hour(sys.argv[1])))',
  ].join('; '),
  parserResolverResult.target_hour,
], {
  cwd: process.cwd(),
  encoding: 'utf8',
});
assert.equal(
  parserProbe.status,
  0,
  parserProbe.stderr || parserProbe.error?.message || 'Python UTC-hour parser failed',
);
assert.equal(
  parserProbe.stdout.trim(),
  parserResolverResult.target_hour,
  'the exact Node resolver target_hour must round-trip through the production Python parse_utc_hour contract',
);

console.log('Integreret RavScore-produktionsadapter, schema-2 migration og U\/V-minimering: bestået.');
