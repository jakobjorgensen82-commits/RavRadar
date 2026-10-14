#!/usr/bin/env node
import assert from 'node:assert/strict';
import './test-post-cutover-migration-routing.mjs';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { REQUIRED_CUTOVER_MIGRATIONS, LATEST_REQUIRED_CUTOVER_MIGRATION,
  TRIP_BINDING_POLICY_SOURCE_MIGRATION, ACCOUNT_ASSISTANT_SOURCE_MIGRATION }
  from './integrated-cutover-readiness.mjs';
import {
  assertPostCutoverRepairProjection,
  assertCodeOnlyModelBinding,
  assertContractOnlyModelBinding,
  assertZoneRegistryVersionOnly,
  CODE_ONLY_MAXIMUM_PRIVATE_CONDITIONS_BYTES,
  CODE_ONLY_MAXIMUM_PUBLIC_DETAILS_BYTES,
  CODE_ONLY_SNAPSHOT_FILES,
  manifestBoundedPublicDetailsBytes,
  normalizeCodeOnlyProjection,
  normalizeRuntimeReuseMode,
  RUNTIME_REUSE_MODES,
  runtimeReuseSemantics,
} from './prepare-code-only-public-runtime.mjs';
import { ravScoreModelBinding } from '../js/core/ravscore-model-contract.js';
import { PROTECTED_PRIVATE_RUNTIME_POLICY, isLatestUnpairedWeatherGeneration }
  from './protected-private-production-runtime.mjs';
import { buildCurrentGridSamplingOriginalRestoreExpectation,
  CURRENT_GRID_SAMPLING_SELECTED_PREDECESSOR_POLICY }
  from './lib/bounded-conditions-predecessor-transition.mjs';
import {
  resolveCodeOnlyPublicSource,
  resolveFailedIntegratedMaintenancePublicSource,
} from './resolve-code-only-public-source.mjs';
import { RAVSCORE_KNOWN_PUBLIC_SOURCE_REPAIR_POLICY as SOURCE_REPAIR } from
  './lib/ravscore-known-public-source-repair.mjs';

assert.equal(SOURCE_REPAIR.id, 'public-ahead-weather-4.0.420-v1');
assert.equal(SOURCE_REPAIR.centralVersion, 27);
assert.equal(SOURCE_REPAIR.sourceRunId, 35374238410);
assert.equal(SOURCE_REPAIR.sourceHead, '779fd7a9a022f64a496a27323cdb7216d809d0e4');
assert.equal(SOURCE_REPAIR.sourceArtifactId, 10560987527);
assert.equal(SOURCE_REPAIR.sourcePublicAuditSha256,
  '82d4d18de4c41977bf589ca4de72387ec3e4aaaac51dd0a90bb012cb1403d3fa');
assert.equal(SOURCE_REPAIR.expectedPublicFileCount, 79);
assert.equal(SOURCE_REPAIR.knownMissingPublicFile, null);

assert.equal(
  CODE_ONLY_MAXIMUM_PRIVATE_CONDITIONS_BYTES,
  PROTECTED_PRIVATE_RUNTIME_POLICY.maximumFilePayloadBytes,
  'Code-only-genopbygningen skal bruge cachetransportens allerede validerede filgrænse',
);
assert.ok(CODE_ONLY_MAXIMUM_PRIVATE_CONDITIONS_BYTES > 256 * 1024 * 1024,
  'Den forældede 256 MiB-grænse må ikke afvise den komplette private runtime');
assert.equal(normalizeRuntimeReuseMode(), RUNTIME_REUSE_MODES.CODE_ONLY);
assert.equal(
  normalizeRuntimeReuseMode('saved-weather-continuation'),
  RUNTIME_REUSE_MODES.SAVED_WEATHER,
);
assert.equal(
  normalizeRuntimeReuseMode('post-cutover-last-mile-repair'),
  RUNTIME_REUSE_MODES.POST_CUTOVER_REPAIR,
);
assert.equal(
  normalizeRuntimeReuseMode('post-cutover-contract-rebind'),
  RUNTIME_REUSE_MODES.CONTRACT_REBIND,
);
assert.deepEqual(runtimeReuseSemantics('post-cutover-contract-rebind'), {
  mode: RUNTIME_REUSE_MODES.CONTRACT_REBIND,
  savedWeatherContinuation: false,
  postCutoverRepair: false,
  contractOnlyRebind: true,
  reportKind: 'RAVRADAR_POST_CUTOVER_CONTRACT_REBIND',
  savedProtectedRuntimeReused: true,
  publicRuntimeAdvanced: false,
  weatherValuesChanged: false,
  scoresChanged: false,
});
assert.throws(
  () => normalizeRuntimeReuseMode('provider-refresh'),
  /Unknown protected runtime reuse mode/,
);

const current = ravScoreModelBinding();
assertCodeOnlyModelBinding(current, current);
assertCodeOnlyModelBinding({ ...current, modelBundleSha256: 'a'.repeat(64) }, current);
assertContractOnlyModelBinding(current, current);
assert.throws(
  () => assertContractOnlyModelBinding(
    { ...current, modelBundleSha256: 'a'.repeat(64) },
    current,
  ),
  /Contract-only model binding mismatch/,
);
assert.throws(
  () => assertCodeOnlyModelBinding({ ...current, profileId: 'wrong-profile' }, current),
  /changes more than the implementation bundle hash/,
);

const liveZones = {
  type: 'FeatureCollection',
  version: '4.0.366',
  features: [{ type: 'Feature', properties: { id: 'z-1' }, geometry: null }],
};
const nextZones = { ...structuredClone(liveZones), version: '4.0.367' };
assertZoneRegistryVersionOnly(liveZones, nextZones, '4.0.367');
assert.throws(
  () => assertZoneRegistryVersionOnly(liveZones, {
    ...nextZones,
    features: [{ type: 'Feature', properties: { id: 'z-2' }, geometry: null }],
  }, '4.0.367'),
  /changes more than its top-level version/,
);

const before = {
  datasetId: 'rr-test',
  ravScoreRuntime: {
    modelBinding: { ...current, modelBundleSha256: 'a'.repeat(64) },
    payloadBodySha256: 'b'.repeat(64),
    startup: { fileSha256: 'c'.repeat(64) },
  },
  zones: { z1: { forecast: [{ waveHeightM: 0.7 }] } },
};
const after = structuredClone(before);
after.ravScoreRuntime.modelBinding.modelBundleSha256 = current.modelBundleSha256;
after.ravScoreRuntime.payloadBodySha256 = 'd'.repeat(64);
after.ravScoreRuntime.startup.fileSha256 = 'e'.repeat(64);
assert.deepEqual(normalizeCodeOnlyProjection(before), normalizeCodeOnlyProjection(after));
after.zones.z1.forecast[0].waveHeightM = 0.8;
assert.notDeepEqual(normalizeCodeOnlyProjection(before), normalizeCodeOnlyProjection(after));

const repairStartup = {
  schemaVersion: 3,
  datasetId: 'rr-repair',
  generatedAt: '2026-09-18T10:00:00.000Z',
  productionReferenceAt: '2026-09-18T10:00:00.000Z',
  weatherSourceAge: { status: 'FRESH' },
  ravScoreRuntime: { modelBinding: { old: true } },
  nationalForecast: { modes: { waders: [{ rows: [{ score: 20 }] }] } },
  zones: { z1: { current: { waveHeightM: 0.7 }, forecast: { hourly: [] } } },
  coastalParts: { parts: { p1: { id: 'p1' } }, zones: {} },
};
const repairDetails = {
  schemaVersion: 2,
  datasetId: 'rr-repair',
  generatedAt: '2026-09-18T10:00:00.000Z',
  productionReferenceAt: '2026-09-18T10:00:00.000Z',
  weatherSourceAge: { status: 'FRESH' },
  ravScoreRuntime: { modelBinding: { old: true } },
  zones: { z1: { forecast: { hourly: [{ time: '2026-09-18T10:00:00.000Z', waveHeightM: 0.7 }] } } },
  coastalParts: {
    schemaVersion: 2,
    expectedPartCount: 1,
    scoredPartCount: 1,
    scoreAvailability: { activeZoneCount: 1 },
    modelBinding: { old: true },
    scoreProfile: { old: true },
    parts: {
      p1: {
        id: 'p1',
        zoneId: 'z1',
        name: 'Part 1',
        landPoint: [1, 2],
        waterPoint: [3, 4],
        flowPoints: { current: [3, 4] },
        current: {
          time: '2026-09-18T10:00:00.000Z',
          weather: { waveHeightM: 0.7 },
          waders: { score: 20 },
          beach: { score: 30 },
        },
      },
    },
    zones: {
      z1: {
        expectedPartCount: 1,
        scoredPartCount: 1,
        currentReferenceAt: '2026-09-18T10:00:00.000Z',
        hourly: [{
          time: '2026-09-18T10:00:00.000Z',
          waders: { score: 20 },
          beach: { score: 30 },
        }],
      },
    },
  },
};
const generatedRepairStartup = structuredClone(repairStartup);
generatedRepairStartup.ravScoreRuntime = { modelBinding: { current: true } };
generatedRepairStartup.nationalForecast.modes.waders[0].rows[0].score = 24;
generatedRepairStartup.coastalParts = { parts: { p1: { id: 'p1', score: 24 } } };
const generatedRepairDetails = structuredClone(repairDetails);
generatedRepairDetails.ravScoreRuntime = { modelBinding: { current: true } };
generatedRepairDetails.coastalParts.modelBinding = { current: true };
generatedRepairDetails.coastalParts.scoreProfile = { current: true };
generatedRepairDetails.coastalParts.parts.p1.current.waders.score = 24;
generatedRepairDetails.coastalParts.zones.z1.hourly[0].waders.score = 24;
assert.doesNotThrow(() => assertPostCutoverRepairProjection(
  repairStartup,
  repairDetails,
  generatedRepairStartup,
  generatedRepairDetails,
));
const changedRepairWeather = structuredClone(generatedRepairDetails);
changedRepairWeather.coastalParts.parts.p1.current.weather.waveHeightM = 0.8;
assert.throws(() => assertPostCutoverRepairProjection(
  repairStartup,
  repairDetails,
  generatedRepairStartup,
  changedRepairWeather,
), /coastal-part weather and geometry/);
const changedRepairGeometry = structuredClone(generatedRepairDetails);
changedRepairGeometry.coastalParts.parts.p1.waterPoint = [3.1, 4];
assert.throws(() => assertPostCutoverRepairProjection(
  repairStartup,
  repairDetails,
  generatedRepairStartup,
  changedRepairGeometry,
), /coastal-part weather and geometry/);
const changedRepairTime = structuredClone(generatedRepairDetails);
changedRepairTime.coastalParts.zones.z1.hourly[0].time = '2026-09-18T11:00:00.000Z';
assert.throws(() => assertPostCutoverRepairProjection(
  repairStartup,
  repairDetails,
  generatedRepairStartup,
  changedRepairTime,
), /score-zone time axes/);

const observedProductionDetailsBytes = 297_468_317;
assert.equal(
  manifestBoundedPublicDetailsBytes(observedProductionDetailsBytes),
  observedProductionDetailsBytes,
  'Den observerede komplette 210/673-detailruntime skal være inden for code-only-loftet',
);
assert.equal(
  manifestBoundedPublicDetailsBytes(CODE_ONLY_MAXIMUM_PUBLIC_DETAILS_BYTES),
  CODE_ONLY_MAXIMUM_PUBLIC_DETAILS_BYTES,
);
for (const invalidSize of [0, 1, 1.5, CODE_ONLY_MAXIMUM_PUBLIC_DETAILS_BYTES + 1]) {
  assert.throws(
    () => manifestBoundedPublicDetailsBytes(invalidSize),
    /manifest size is outside its safe bound/,
  );
}

assert.deepEqual(Object.values(CODE_ONLY_SNAPSHOT_FILES).sort(), [
  'coastal-parts-v2.json',
  'manifest.json',
  'public-condition-details.json',
  'public-conditions.json',
  'water-level-station-routing.json',
  'zones.geojson',
]);

const decision = fs.readFileSync(
  'docs/rdks/10_DECISIONS/DEC-0148-SEPARATE-CODE-DEPLOY-FROM-WEATHER-ACQUISITION.md',
  'utf8',
);
for (const marker of [
  'uden DMI-, Copernicus-, Open-Meteo-',
  'senest publicerede, gyldige offentlige datasæt',
  'normal vejrkørsel',
  'kan ikke ugyldiggøre',
]) assert.ok(decision.includes(marker), `DEC-0148 mangler ${marker}`);

const workflow = fs.readFileSync('.github/workflows/deploy-code-only-repair.yml', 'utf8');
const prewriteOrder = [
  'Rebind saved private runtime to current source without changing measurements',
  'Require exact code-only reuse invariants',
  'Reverify the same assistant originals before binding installation',
  'Dry-run and require only the latest exact integrated migration',
  'Reconfirm current main before the database binding write',
  'Apply exact dry-run-verified post-cutover binding',
  'Read back migration and database binding',
].map(name => workflow.indexOf(`- name: ${name}`));
assert.ok(prewriteOrder.every((offset, index) => offset >= 0
  && (index === 0 || offset > prewriteOrder[index - 1])),
'The actual ordinary original/no-loss path must finish before the same database write');
assert.equal((workflow.match(/supabase db push --linked --skip-vault/g) ?? []).length, 1);
assert.ok(workflow.includes('Assistant successor cannot recover a historical cutover'));
assert.ok(workflow.includes('migration_args+=(--metadata-only)'));
assert.ok(workflow.includes('--verify-assistant-prewrite'));
assert.ok(workflow.includes('--require-prewrite-gate'));
const originalGateRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'rr-code-only-original-gate-'));
try {
  const listPath = path.join(originalGateRoot, 'list.txt');
  const dryPath = path.join(originalGateRoot, 'dry.txt');
  for (const [pending, required, status] of [[true, 'false', 1], [true, 'true', 1], [false, 'false', 0]]) {
    // A missing userdata predecessor also leaves every later successor pending.
    // Completed original preservation cannot authorize an old130000 replay.
    const pendingMigrations = pending ? REQUIRED_CUTOVER_MIGRATIONS.filter(item =>
      item.version >= TRIP_BINDING_POLICY_SOURCE_MIGRATION.version) : [];
    fs.writeFileSync(listPath, `Local | Remote | Time (UTC)\n${REQUIRED_CUTOVER_MIGRATIONS.map(item =>
      `${item.version} | ${pendingMigrations.includes(item) ? '' : item.version} | state`).join('\n')}`);
    fs.writeFileSync(dryPath, pending
      ? `DRY RUN: migrations will *not* be pushed to the database.\nWould push these migrations:\n${pendingMigrations.map(item => ` • ${item.filename}`).join('\n')}\nFinished supabase db push.`
      : 'DRY RUN: migrations will *not* be pushed to the database.\nRemote database is up to date.');
    const result = spawnSync(process.execPath, ['scripts/verify-code-only-migration-plan.mjs',
      '--require-prewrite-gate', '--account-assistant-prewrite-plan',
      '--migration-list', listPath, '--dry-run', dryPath,
      '--migrations-directory', path.resolve('supabase/migrations')], { encoding: 'utf8', windowsHide: true,
      timeout: 30000, env: { SystemRoot: process.env.SystemRoot, PATH: process.env.PATH,
        TEMP: os.tmpdir(), TMP: os.tmpdir(), RAVRADAR_ASSISTANT_PREWRITE_REQUIRED: required,
        RAVRADAR_USERDATA_UPGRADE_OPT_IN: 'true', RAVRADAR_USERDATA_PREWRITE_REQUIRED: required,
        RAVRADAR_USERDATA_PREWRITE_VERIFIED: required,
        // Isolated negative CLI-plan boundary: admit the newer technical
        // guard to reach the old userdata/latest refusal, NOT a legal workflow
        // issuer. The actual selector rejects both opt-ins (tested below).
        RAVRADAR_ACCOUNT_ASSISTANT_UPGRADE_OPT_IN: 'true',
        RAVRADAR_ACCOUNT_ASSISTANT_PREWRITE_REQUIRED: 'true',
        RAVRADAR_ACCOUNT_ASSISTANT_PREWRITE_VERIFIED: 'true' } });
    assert.equal(result.status, status, result.stderr || result.error?.message);
    if (status !== 0) assert.match(result.stderr, required === 'true'
      ? /only the exact latest required integrated migration/
      : /requires the completed normal original-preservation path/);
  }
} finally {
  assert.equal(path.dirname(originalGateRoot), path.resolve(os.tmpdir()));
  assert.ok(path.basename(originalGateRoot).startsWith('rr-code-only-original-gate-'));
  fs.rmSync(originalGateRoot, { recursive: true, force: true });
}
for (const marker of [
  'workflow_dispatch:',
  'DEPLOY-CODE-ONLY-REPAIR',
  'DEPLOY-SAVED-WEATHER-REPAIR',
  'publish_newest_saved_weather:',
  'recover_public_run_id:',
  'recover_public_run_attempt:',
  'Download exact public maintenance handoff',
  '--handoff',
  'git merge-base --is-ancestor',
  'targetPublicManifestSha256',
  'privatePayloadIncluded:false',
  'test -z "${{ steps.public-source.outputs.repair_id }}"',
  'Describe newest protected runtime for saved-weather continuation',
  'Bind saved-weather continuation to exact newer runtime',
  'Saved protected runtime does not strictly advance the public production hour',
  '--allow-equal-saved-weather-reference',
  'T[0-9]{2}:00:00[.]000Z$',
  "grep -Eq '^status=(FRESH|STALE_TARGET_VALID)$' \"$freshness_output\"",
  '--mode "$mode"',
  'mode=post-cutover-last-mile-repair',
  'mode=post-cutover-contract-rebind',
  '.mode == "post-cutover-last-mile-repair"',
  '.mode == "post-cutover-contract-rebind"',
  'savedProtectedRuntimeReused == true',
  'publicRuntimeAdvanced == true',
  'code_only_repair: ${{ inputs.publish_newest_saved_weather != true }}',
  'test "${{ steps.source-proof.outputs.required }}" = "false"',
  'prepare-code-only-public-runtime.mjs',
  'migrate-post-cutover-private-runtime.mjs',
  'Rebind saved private runtime to current source without changing measurements',
  'recover-missed-initial-cutover',
  'ravscore-operational-recovery-34877443841-1',
  'Freshly verify the exact historical integrated artifact is still public',
  'Atomically record the exact already-public historical cutover',
  'Resolve the actual currently public source',
  'resolve-code-only-public-source.mjs',
  'Download exact known public source audit evidence',
  'runtime_audit_outcome=failure',
  'SAVED_WEATHER_CONTINUATION: ${{ inputs.publish_newest_saved_weather }}',
  'OPERATIONAL_ACTION: ${{ steps.operational-action.outputs.action }}',
  'MIGRATED_PRIVATE_INSTALL_OUTCOME: ${{ steps.migrated-private-install.outcome }}',
  'Saved-weather RavScore diagnostic retained',
  'Known historical RavScore diagnostic retained',
  "migration.transitionKind !== 'MODEL_BINDING_METADATA_ONLY'",
  "audit.history?.currentUnavailableModeCount === 420",
  "audit.payload?.privacyContractPassed === true",
  "Object.keys(audit.continuation.stateReplayFailureCounts ?? {}).length === 0",
  "throw new Error('Historical integrated maintenance has unknown or unsafe runtime diagnostics')",
  'Code-only runtime audit differs from the exact known public source audit',
  'Exact known RavScore diagnostic retained',
  'steps.public-source.outputs.deployment_id',
  'steps.public-source.outputs.implementation_closure_sha256',
  'sourceRepairId:',
  'if has($field) then .[$field] else "" end',
  'Prove the current-compatible runtime is no longer client-readable',
  'Describe exact target private runtime source for bounded migration',
  '--describe-target',
  '--target-reference "$RAVRADAR_PRODUCTION_TARGET_HOUR"',
  'target-private-runtime-source.json',
  'compare/$predecessor...$GITHUB_SHA',
  'Install and import-check the exact predecessor restore compatibility closure',
  'Prove the saved predecessor runtime is no longer client-readable',
  'for attempt in 1 2 3; do',
  'Protected current restore attempt $attempt of 3 failed.',
  'if node "$RAVRADAR_PREDECESSOR_SOURCE_ROOT/scripts/protected-private-production-runtime.mjs" --restore',
  'Protected predecessor restore attempt $attempt of 3 failed.',
  '--predecessor-descriptor "$RAVRADAR_OPERATIONAL_WORK/target-private-runtime-source.json"',
  '--expected-source-head "$(jq -er \'\.sourceHead\' "$RAVRADAR_OPERATIONAL_WORK/target-private-runtime-source.json")"',
  'Prebuild lean GitHub Pages artifact before production writes',
  'Decide all independent prewrite checks together',
  'supabase functions deploy ravradar-assistant --project-ref "$SUPABASE_PROJECT_ID"',
  'RavRadar assistant deployment attempt $attempt of 3 failed; retrying.',
  "--exclude 'data/kystdata.json'",
  "--exclude 'data/zone-plan.json'",
  "--exclude 'js/services/runtime-diagnostics-archive.js'",
  '--root _site',
  'pages-public-closure.json',
  'cmp -s',
]) assert.ok(workflow.includes(marker), `Code-only-workflow mangler ${marker}`);
const runtimeAuditStart = workflow.indexOf('- name: Audit regenerated integrated public runtime');
const runtimeAuditEnd = workflow.indexOf('\n      - name:', runtimeAuditStart + 1);
const runtimeAudit = workflow.slice(runtimeAuditStart, runtimeAuditEnd);
for (const marker of [
  "test \"$OPERATIONAL_ACTION\" = \"integrated-historical-maintenance\"",
  "test \"$MIGRATED_PRIVATE_INSTALL_OUTCOME\" = \"success\"",
  "test -z \"$SOURCE_REPAIR_ID\"",
  "'MIXED_STATE_LINEAGE_COHORT'",
  "'MIXED_STATE_TRANSITION_COHORT'",
  "'PUBLIC_MANIFEST_NOT_CANONICAL'",
  "'PUBLIC_PROFILE_ADVISORIES_MISMATCH'",
  "'PUBLIC_PROFILE_MIGRATION_MISMATCH'",
  "'PUBLIC_PROFILE_MIGRATION_NOT_READY'",
  'sha256CanonicalJson(sourceAudit) !== expected',
  'sha256CanonicalJson(sourceCheckpointAudit) !== expected',
  'sha256CanonicalJson(targetAudit) !== expected',
  'process.env.SOURCE_REPAIR_ID !== policy.id',
]) assert.ok(runtimeAudit.includes(marker),
  `Code-only-auditens sn\u00e6vre undtagelse mangler ${marker}`);
assert.match(workflow, /build-code-only:[\s\S]*?timeout-minutes: 60/,
  'Code-only deploy skal have tid til den observerede cirka 20 minutters runtimegenbygning og efterfølgende gates.');
assert.match(
  workflow,
  /build-code-only:[\s\S]*?env:[\s\S]*?NODE_OPTIONS:\s*--max-old-space-size=8192/,
  'Code-only-jobbet skal give hele runtimegenbygningens Node-led samme heap som normal produktion',
);
assert.ok(runtimeAudit.includes('throw new Error('),
  'Code-only-auditen skal fortsat stoppe p\u00e5 ukendt eller \u00e6ndret diagnostik');
const checkpointDispositionStart = workflow.indexOf(
  '- name: Create one hash-bound checkpoint disposition',
);
const checkpointDispositionEnd = workflow.indexOf('\n      - name:', checkpointDispositionStart + 1);
const checkpointDisposition = workflow.slice(
  checkpointDispositionStart,
  checkpointDispositionEnd,
);
for (const marker of [
  'READY:true) disposition=READY_PUBLISHED; checkpoint_required=true',
  'BUILDING_MEASURED_ONLY:false) disposition=MEASURED_WARMUP_PUBLISHED; checkpoint_required=true',
]) assert.ok(checkpointDisposition.includes(marker),
  `Code-only checkpointdisposition mangler ${marker}`);
for (const step of ['checkpoint-build', 'checkpoint-save', 'checkpoint-publish']) {
  const start = workflow.indexOf(`id: ${step}`);
  const end = workflow.indexOf('\n      - name:', start + 1);
  const block = workflow.slice(start, end);
  assert.ok(block.includes("steps.checkpoint-disposition.outputs.disposition == 'READY_PUBLISHED'"),
    `${step} skal fortsat kunne gemme en READY fortsættelse`);
  assert.ok(block.includes("steps.checkpoint-disposition.outputs.disposition == 'MEASURED_WARMUP_PUBLISHED'"),
    `${step} skal gemme målt fortsættelse uden at aktivere rollback`);
}
const savedWeatherBindingStart = workflow.indexOf(
  '- name: Bind saved-weather continuation to exact newer runtime',
);
const savedWeatherBindingEnd = workflow.indexOf('\n      - name:', savedWeatherBindingStart + 1);
const savedWeatherBinding = workflow.slice(savedWeatherBindingStart, savedWeatherBindingEnd);
for (const marker of [
  'case "${{ steps.operational-action.outputs.action }}" in',
  'integrated|integrated-historical-maintenance) ;;',
  'Saved-weather continuation requires active integrated maintenance.',
  "grep -Eq '^status=(FRESH|STALE_TARGET_VALID)$' \"$freshness_output\"",
]) assert.ok(savedWeatherBinding.includes(marker),
  `Saved-weather-fortsættelsen mangler integreret vedligeholdelsesgrænse: ${marker}`);
assert.ok(!savedWeatherBinding.includes("grep -Fxq 'status=FRESH'"),
  'Saved-weather må ikke gøre targetalder til en hård gate, når horisonten stadig er gyldig');
assert.ok(!savedWeatherBinding.includes('target_reference_raw'),
  'Saved-weather må ikke omskrive den centrale protected-runtime-identitet');
assert.ok(!savedWeatherBinding.includes('${target_reference_raw%.000Z}Z'),
  'Saved-weather må ikke forkorte canonical UTC fra .000Z til Z');
assert.ok(savedWeatherBinding.includes('T[0-9]{2}:00:00[.]000Z$'),
  'Saved-weather skal kræve descriptorens canonical UTC-format uændret');
for (const forbiddenAction of [
  'candidate-execute',
  'candidate-maintenance',
  'candidate-historical-maintenance',
  'candidate-legacy-maintenance',
  'integrated-return',
  'integrated-cutover',
]) assert.ok(!savedWeatherBinding.includes(forbiddenAction),
  `Saved-weather-fortsættelsen må ikke åbne for en modeltransition: ${forbiddenAction}`);
assert.ok(!savedWeatherBinding.includes(
  'test "${{ steps.operational-action.outputs.action }}" = "integrated"',
), 'Saved-weather må ikke afvise den sikre historiske integrerede vedligeholdelse');
const independentPrewriteDecision = workflow.indexOf(
  '- name: Decide all independent prewrite checks together',
);
const privateWrite = workflow.indexOf('- name: Publish current bounded private runtime');
const assistantWrite = workflow.indexOf('- name: Deploy only the exact RavRadar assistant Edge function');
assert.ok(independentPrewriteDecision >= 0
  && independentPrewriteDecision < privateWrite
  && privateWrite < assistantWrite,
'Uafhængige artifact/privacyfejl skal samles før private og Edge writes');
assert.equal(
  (workflow.match(/supabase functions deploy ravradar-assistant/g) || []).length,
  1,
  'Code-only må kun have ét afgrænset assistentdeploy med interne retries',
);
assert.doesNotMatch(workflow, /supabase functions deploy --project-ref/,
  'Code-only må ikke geninstallere alle Edge-funktioner');
const privateRuntimeSpecStart = workflow.indexOf(
  '- name: Build current private production runtime specification',
);
const privateRuntimeSpecEnd = workflow.indexOf('\n      - name:', privateRuntimeSpecStart + 1);
const privateRuntimeSpec = workflow.slice(privateRuntimeSpecStart, privateRuntimeSpecEnd);
assert.ok(privateRuntimeSpec.includes('--dmi-bulk data/live/dmi-bulk-cache.json'),
  'Code-only skal genpakke den installerede kanoniske DMI-cache');
assert.ok(!privateRuntimeSpec.includes('.cache/dmi-candidate-progress.json'),
  'Code-only må ikke kræve en midlertidig DMI-kandidat fra en vejrhentning');
const privateRuntimePublishStart = workflow.indexOf('- name: Publish current bounded private runtime');
const privateRuntimePublishEnd = workflow.indexOf('\n      - name:', privateRuntimePublishStart + 1);
const privateRuntimePublish = workflow.slice(privateRuntimePublishStart, privateRuntimePublishEnd);
for (const marker of [
  'steps.current-private-install.outcome',
  'steps.migrated-private-install.outcome',
  '--same-reference-migration-report .geometry-v2-work/post-cutover-private-runtime-migration.json',
  '--same-reference-predecessor-manifest "$RAVRADAR_PREDECESSOR_PRIVATE_BUNDLE/manifest.json"',
]) assert.ok(privateRuntimePublish.includes(marker),
  `Code-only-private-runtimepublicering mangler ${marker}`);

const preparationSource = fs.readFileSync(
  'scripts/prepare-code-only-public-runtime.mjs',
  'utf8',
);
for (const marker of [
  "[RUNTIME_REUSE_MODES.CONTRACT_REBIND]: 'post-cutover-contract-rebound'",
  "assertPublicRuntimePrivacy(generated.publicDocument, 'startup')",
  "assertPublicRuntimePrivacy(generated.detailsDocument, 'details')",
  "assertPublicRuntimePrivacy(generated.manifest, 'manifest')",
  'sourcePublicManifestCanonicalSha256: sha256CanonicalJson(manifestSource.value)',
]) assert.ok(preparationSource.includes(marker),
  `Code-only privacykontrollen mangler sin kanoniske rodsti: ${marker}`);
assert.ok(!preparationSource.includes("assertPublicRuntimePrivacy(generated.publicDocument, 'Code-only"),
  'En menneskelig label må ikke bruges som teknisk privacy-rodsti');
assert.match(workflow,
  /Prove the current-compatible runtime is no longer client-readable[\s\S]{0,180}if: steps\.current-private-install\.outcome == 'success'[\s\S]{0,220}--audit-anon/,
  'Den direkte current-runtimevej skal bevise privacy før den må fortsætte');
assert.ok(workflow.indexOf('Build exact predecessor private-runtime expectation')
  < workflow.indexOf('Install and import-check the exact predecessor restore compatibility closure'),
  'Predecessorforventningen skal forsegles mod den urørte historiske kilde før diagnostic wrapper-copy');
const predecessorCompatibilityStart = workflow.indexOf(
  '- name: Install and import-check the exact predecessor restore compatibility closure',
);
const predecessorCompatibilityEnd = workflow.indexOf(
  '\n      - name:',
  predecessorCompatibilityStart + 1,
);
const predecessorCompatibility = workflow.slice(
  predecessorCompatibilityStart,
  predecessorCompatibilityEnd,
);
for (const marker of [
  'scripts/protected-private-production-runtime.mjs',
  'scripts/lib/r2-private-runtime-storage.mjs',
  'scripts/lib/supabase-admin-rest.mjs',
  'scripts/lib/private-weather-component-inventory.mjs',
  'scripts/lib/bounded-conditions-predecessor-transition.mjs',
  'await import(`${pathToFileURL(target).href}?compatibility-closure=1`)',
]) assert.ok(predecessorCompatibility.includes(marker),
  `Predecessor-restorelukningen mangler ${marker}`);
for (const forbidden of [
  'install -m 0644 scripts/private-production-runtime-bundle.mjs',
  'install -m 0644 js/core/ravscore-model-contract.js',
]) assert.ok(!predecessorCompatibility.includes(forbidden),
  `Predecessorens forseglede model-/bundlekode må ikke overskrives: ${forbidden}`);
const protectedRuntimeSource = fs.readFileSync(
  'scripts/protected-private-production-runtime.mjs',
  'utf8',
);
function relativeModuleSpecifiers(source) {
  return [
    ...[...source.matchAll(/\bfrom\s+['"](\.\.?\/[^'"]+)['"]/g)].map(match => match[1]),
    ...[...source.matchAll(/\bimport\s+['"](\.\.?\/[^'"]+)['"]/g)].map(match => match[1]),
    ...[...source.matchAll(/\bimport\s*\(\s*['"](\.\.?\/[^'"]+)['"]\s*\)/g)].map(match => match[1]),
  ].sort();
}
const protectedRuntimeRelativeImports = relativeModuleSpecifiers(protectedRuntimeSource);
assert.deepEqual(protectedRuntimeRelativeImports, [
  '../js/core/ravscore-model-contract.js',
  './lib/bounded-conditions-predecessor-transition.mjs',
  './lib/private-weather-component-inventory.mjs',
  './lib/r2-private-runtime-storage.mjs',
  './lib/supabase-admin-rest.mjs',
  './private-production-runtime-bundle.mjs',
].sort(), 'Alle relative restore-wrapperimports skal klassificeres i kompatibilitetslukningen');
for (const helperPath of [
  'scripts/lib/private-weather-component-inventory.mjs',
  'scripts/lib/r2-private-runtime-storage.mjs',
  'scripts/lib/supabase-admin-rest.mjs',
]) assert.deepEqual(relativeModuleSpecifiers(fs.readFileSync(helperPath, 'utf8')), [],
  `Den kopierede kompatibilitetshjælper har fået en uklassificeret relativ import: ${helperPath}`);
const boundedCompatibilitySource = fs.readFileSync(
  'scripts/lib/bounded-conditions-predecessor-transition.mjs', 'utf8').replace(/\r\n/g, '\n');
// Classify the exact current-grid SOURCE reads, not a count of permitted
// imports. The copied helper must still use the historical source tree's
// contract/generated modules; no verifier/model module is copied or replaced.
const currentGridReadOnlyImports = [
  ['../../js/core/ravscore-model-contract.js',
    "import { ravScoreModelBinding as currentGridSamplingModelBinding }\n  from '../../js/core/ravscore-model-contract.js';\n"],
  ['../rollback-assets/ravscore-model-contract.js',
    "import { ravScoreModelBinding as currentGridSamplingCandidateBinding }\n  from '../rollback-assets/ravscore-model-contract.js';\n"],
  ['../../js/core/ravscore-model-bundle.generated.js',
    "import { GENERATED_RAVSCORE_MODEL_BUNDLE_MANIFEST as currentGridSamplingIntegratedManifest }\n  from '../../js/core/ravscore-model-bundle.generated.js';\n"],
  ['../rollback-assets/ravscore-model-bundle.generated.js',
    "import { GENERATED_RAVSCORE_MODEL_BUNDLE_MANIFEST as currentGridSamplingCandidateManifest }\n  from '../rollback-assets/ravscore-model-bundle.generated.js';\n"],
  ['../private-production-runtime-workflow.mjs',
    "  const { privateRuntimeContractHashes } = await import('../private-production-runtime-workflow.mjs');\n"],
];
assert.deepEqual(relativeModuleSpecifiers(boundedCompatibilitySource), [
  '../private-production-runtime-bundle.mjs',
  ...currentGridReadOnlyImports.map(([specifier]) => specifier),
].sort(), 'Every bounded-helper relative import must have its precise historical-canonicalizer or current-grid SOURCE role');
let boundedLegacyImportSource = boundedCompatibilitySource;
for (const [specifier, exactImport] of currentGridReadOnlyImports) {
  assert.equal(boundedLegacyImportSource.split(exactImport).length, 2,
    `The classified read-only SOURCE import must be exact and unique: ${specifier}`);
  boundedLegacyImportSource = boundedLegacyImportSource.replace(exactImport, '');
}
// Retain the original canonicalizer-only oracle after removing ONLY those
// five exact reviewed reads in RAM. This is not executable source or a model
// override; any sixth new/unclassified import still fails the full list above.
assert.deepEqual(relativeModuleSpecifiers(boundedLegacyImportSource),
['../private-production-runtime-bundle.mjs'],
'the bounded helper may use only the preserved predecessor bundle canonicalizer, never replace its verifier or model');
const predecessorPreparationStart = workflow.indexOf(
  '- name: Prepare exact predecessor source for bounded binding migration',
);
const predecessorPreparationEnd = workflow.indexOf('\n      - name:', predecessorPreparationStart + 1);
const predecessorPreparation = workflow.slice(predecessorPreparationStart, predecessorPreparationEnd);
assert.ok(predecessorPreparation.includes('target-private-runtime-source.json'));
for (const marker of [
  'case "${{ steps.operational-action.outputs.action }}" in',
  'integrated|integrated-historical-maintenance) ;;',
  'Private runtime contract rebind requires active integrated maintenance.',
]) assert.ok(predecessorPreparation.includes(marker),
  `Predecessor-rebind mangler same-binding integrated-ruten: ${marker}`);
assert.ok(!predecessorPreparation.includes(
  'test "${{ steps.operational-action.outputs.action }}" = "integrated-historical-maintenance"',
), 'Same-binding integrated kodeændringer må ikke afvises før contract-only rebind');
for (const forbiddenAction of ['candidate-execute', 'candidate-maintenance', 'integrated-return', 'integrated-cutover']) {
  assert.ok(!predecessorPreparation.includes(forbiddenAction),
    `Predecessor-rebind må ikke åbne for en modeltransition: ${forbiddenAction}`);
}
assert.ok(!predecessorPreparation.includes('predecessor=fa418f43'),
  'Efterfølgende kode-only-rettelser må ikke falde tilbage til den oprindelige forgænger');
assert.ok(!workflow.includes('.[$field] // ""'),
  'Code-only-workflowet må ikke gøre en ægte false-værdi til tom tekst');
for (const forbidden of [
  'DMI_API_KEY',
  'COPERNICUSMARINE_SERVICE_USERNAME',
  'COPERNICUSMARINE_SERVICE_PASSWORD',
  'update-weather.mjs',
  'update-dmi-bulk.py',
]) assert.ok(!workflow.includes(forbidden), `Code-only-workflow indeholder providervej: ${forbidden}`);
assert.ok(workflow.includes('mkdir -p "$RAVRADAR_PRIVATE_RUNTIME_ROOT"'),
  'Code-only skal oprette private-runtime-roden før protected restore');
assert.match(workflow,
  /prepare-integrated-historical-maintenance[\s\S]{0,500}--source-implementation-closure-sha256 "\$\{\{ steps\.operational-model\.outputs\.active_implementation_closure_sha256 \}\}"/,
  'Historisk maintenance skal bruge centrals aktive closure, ikke den offentlige forgængers');

const centralRecoveryWorkflow = fs.readFileSync(
  '.github/workflows/recover-live-ravscore-central.yml',
  'utf8',
);
for (const marker of [
  'RECOVER-LIVE-RAVSCORE-CENTRAL',
  'recover-missed-integrated-historical-maintenance',
  'ravscore-operational-handoff-35331109332-1',
  'ravscore-operational-handoff-35331664087-1',
  'Freshly verify the exact 4.0.410 target is still public',
  'Atomically record the exact already-live maintenance target',
  'Require exact final active central identity',
  '6391ab91144cd9f00ac5f554d1d5be1c59973acb0806fb2c670f4e9f81be4db4',
  'pages-35331664087-1',
]) assert.ok(centralRecoveryWorkflow.includes(marker),
  `Central recovery-workflow mangler ${marker}`);
for (const forbidden of [
  'weather-source-gate.mjs',
  'validate-source',
  'update-weather.mjs',
  'update-dmi-bulk.py',
  'upload-pages-artifact',
  'deploy-pages',
  'supabase functions deploy',
]) assert.ok(!centralRecoveryWorkflow.includes(forbidden),
  `Central recovery må ikke genkøre kilde, vejr eller deploy: ${forbidden}`);

const pagesWorkflow = fs.readFileSync('.github/workflows/reusable-pages-deploy.yml', 'utf8');
for (const marker of [
  'code_only_repair:',
  'if: inputs.code_only_repair != true',
  '.providerRequestsPerformed == false',
  '.weatherValuesChanged == false',
  '.mode == "post-cutover-last-mile-repair"',
  '.mode == "post-cutover-contract-rebind"',
  '.scoresChanged == true',
  '.scoresChanged == false',
  '.geometryChanged == false',
  'id: integrated-historical-maintenance-complete',
  'id: failure-reconciliation',
  'if: always() && !cancelled()',
  'steps.integrated-historical-maintenance-complete.outcome',
  'steps.failure-reconciliation.outcome',
  'Begin code-only integrated maintenance with durable intent before Pages deployment',
  "inputs.code_only_repair == true && inputs.operational_action == 'integrated-historical-maintenance'",
  'source_repair_id:',
  '--known-source-repair-id',
  'Known public source repair artifact seal is not exact',
  '--source-deployment-id "$(cat "$RAVRADAR_OPERATIONAL_HANDOFF/source-deployment-id.txt")"',
]) assert.ok(pagesWorkflow.includes(marker), `Pages code-only-kontrakt mangler ${marker}`);
const handoffIdentityStart = pagesWorkflow.indexOf('- name: Verify exact privacy-safe handoff identity');
const handoffIdentityEnd = pagesWorkflow.indexOf('\n      - name:', handoffIdentityStart + 1);
const handoffIdentity = pagesWorkflow.slice(handoffIdentityStart, handoffIdentityEnd);
assert.ok(handoffIdentity.includes('integrated|integrated-historical-maintenance) ;;'),
  'Eksakt public-source-repair skal tillade både allerede aktiv integrated og historisk maintenance');
const integratedSourceRepairCondition =
  "(inputs.operational_action == 'integrated' && inputs.source_repair_id != '')";
assert.equal(pagesWorkflow.split(integratedSourceRepairCondition).length - 1, 2,
  'Integrated source repair skal være eksplicit afgrænset ved kildeverifikation og artifactbevis');
for (const marker of [
  "inputs.operational_action == 'integrated' || inputs.operational_action == 'integrated-return'",
  '- name: Restore the exact sealed active source implementation',
  '- name: Backfill the exact active source into durable protected evidence',
]) assert.ok(pagesWorkflow.includes(marker),
  `Integrated source repair mangler fælles observe/restore/persist-led: ${marker}`);
assert.ok(pagesWorkflow.includes('integrated) source_model="integrated" ;;'),
  'Allerede aktiv integrated repair skal verificere kilden som integrated');
const targetVerificationStart = pagesWorkflow.indexOf(
  '- name: Verify deployed exact model, implementation and 210/673 artifact',
);
const targetVerificationEnd = pagesWorkflow.indexOf('\n      - name:', targetVerificationStart + 1);
const targetVerification = pagesWorkflow.slice(targetVerificationStart, targetVerificationEnd);
assert.doesNotMatch(targetVerification, /known-source-repair-id/,
  'Den nye målpakke må aldrig bruge den gamle kildes reparationsundtagelse');
const preDeployHistoricalBegin = pagesWorkflow.indexOf(
  '- name: Begin historical-to-current integrated maintenance with exact central CAS',
);
const pagesDeploy = pagesWorkflow.indexOf('- name: Deploy to GitHub Pages');
const codeOnlyHistoricalBegin = pagesWorkflow.indexOf(
  '- name: Begin code-only integrated maintenance with durable intent before Pages deployment',
);
assert.ok(preDeployHistoricalBegin >= 0 && preDeployHistoricalBegin < pagesDeploy);
assert.ok(codeOnlyHistoricalBegin >= 0 && codeOnlyHistoricalBegin < pagesDeploy,
  'Code-only maintenance must persist durable intent before the Pages attempt');
const codeOnlyHistoricalBeginEnd = pagesWorkflow.indexOf('\n      - name:', codeOnlyHistoricalBegin + 1);
const codeOnlyHistoricalBeginStep = pagesWorkflow.slice(
  codeOnlyHistoricalBegin,
  codeOnlyHistoricalBeginEnd,
);
assert.ok(codeOnlyHistoricalBeginStep.includes(
  '--source-deployment-id "$(cat "$RAVRADAR_OPERATIONAL_HANDOFF/source-deployment-id.txt")"',
), 'Code-only durable intent must bind the exact verified source deployment');
const deploymentTerminalStart = pagesWorkflow.indexOf(
  '- name: Seal exact verified deployment terminal',
);
assert.ok(deploymentTerminalStart >= 0, 'Pages-workflowet mangler terminalgaten');
const deploymentTerminal = pagesWorkflow.slice(deploymentTerminalStart);
assert.doesNotMatch(deploymentTerminal, /continue-on-error/,
  'Pages-terminalgaten må aldrig skjule en ufuldstændig central aktivering');
for (const marker of [
  'test "${{ steps.deployment.outcome }}" = "success"',
  'test "${{ steps.public-verification.outcome }}" = "success"',
  'test "${{ steps.checkpoint-disposition-complete.outcome }}" = "success"',
  'Unsupported operational action cannot be marked deployed.',
]) assert.ok(deploymentTerminal.includes(marker),
  `Pages-terminalgaten mangler ${marker}`);

const canonical = value => Array.isArray(value)
  ? value.map(canonical)
  : value && typeof value === 'object'
    ? Object.fromEntries(Object.keys(value).sort().map(key => [key, canonical(value[key])]))
    : value;
const canonicalSha256 = value => crypto.createHash('sha256')
  .update(JSON.stringify(canonical(value))).digest('hex');
const sourceBinding = Object.freeze({
  modelId: 'integrated-test',
  modelBundleSha256: 'a'.repeat(64),
});
const sourceManifest = Object.freeze({
  schemaVersion: 4,
  complete: true,
  zoneCount: 210,
  coastalPartCount: 673,
  datasetId: 'rr-test-210',
  productionReferenceAt: '2026-09-16T00:00:00.000Z',
  ravScoreModelBinding: sourceBinding,
});
const centralSource = Object.freeze({
  model: 'integrated',
  status: 'INTEGRATED_ACTIVE',
  pending: false,
  centralVersion: 7,
  sourceHead: 'b'.repeat(40),
  modelBinding: sourceBinding,
  publicManifestSha256: canonicalSha256(sourceManifest),
  activeImplementationClosureSha256: 'c'.repeat(64),
  deploymentId: 'pages-123-1',
});
const matchedSource = resolveCodeOnlyPublicSource({
  current: centralSource,
  publicManifest: sourceManifest,
});
assert.equal(matchedSource.status, 'CENTRAL_AND_PUBLIC_MATCH');
assert.equal(matchedSource.deploymentId, centralSource.deploymentId);
assert.equal(matchedSource.implementationClosureSha256,
  centralSource.activeImplementationClosureSha256);
assert.equal(matchedSource.repairId, null);
assert.throws(() => resolveCodeOnlyPublicSource({
  current: {
    ...centralSource,
    modelBinding: { ...sourceBinding, modelBundleSha256: 'd'.repeat(64) },
  },
  publicManifest: sourceManifest,
}), /conflicting model binding/);
assert.throws(() => resolveCodeOnlyPublicSource({
  current: centralSource,
  publicManifest: Object.freeze({ ...sourceManifest, datasetId: 'unknown-drift' }),
}), /ahead of central state without an exact repair policy/);
assert.throws(() => resolveCodeOnlyPublicSource({
  current: { ...centralSource, status: 'INTEGRATED_PENDING' },
  publicManifest: sourceManifest,
}), /not an exact active integrated deployment/);
const failedMaintenanceSeal = {
  schemaVersion: 'ravscore-operational-pages-artifact-seal-v1',
  repository: 'test/repo',
  runId: 123,
  runAttempt: 1,
  headSha: 'a'.repeat(40),
  ref: 'refs/heads/main',
  attemptId: 'pages-123-1',
  artifactName: 'github-pages',
  targetPublicManifestSha256: canonicalSha256(sourceManifest),
  targetImplementationClosureSha256: 'e'.repeat(64),
  targetModelBinding: sourceBinding,
  privatePayloadIncluded: false,
};
const failedMaintenanceSource = resolveFailedIntegratedMaintenancePublicSource({
  current: { ...centralSource, publicManifestSha256: 'd'.repeat(64) },
  publicManifest: sourceManifest,
  handoff: {
    schemaVersion: 'ravscore-operational-deploy-handoff-v2',
    action: 'integrated',
    sourceHead: failedMaintenanceSeal.headSha,
    centralVersion: 7,
    legacySourceRequired: false,
    checkpointDatasetId: sourceManifest.datasetId,
    checkpointBuildOutcome: 'skipped',
    checkpointSaveOutcome: 'skipped',
    checkpointPublishOutcome: 'skipped',
    privatePayloadIncluded: false,
  },
  seal: failedMaintenanceSeal,
  targetBinding: sourceBinding,
  expectedRunId: '123',
  expectedRunAttempt: '1',
  expectedRepository: 'test/repo',
});
assert.equal(failedMaintenanceSource.status, 'FAILED_INTEGRATED_MAINTENANCE_PUBLIC_SOURCE');
assert.equal(failedMaintenanceSource.repairId, null);
assert.throws(() => resolveFailedIntegratedMaintenancePublicSource({
  current: { ...centralSource, publicManifestSha256: 'd'.repeat(64) },
  publicManifest: sourceManifest,
  handoff: { action: 'integrated' },
  seal: failedMaintenanceSeal,
  targetBinding: sourceBinding,
  expectedRunId: '123',
  expectedRunAttempt: '1',
  expectedRepository: 'test/repo',
}), /exact public-only source proof/);

console.log('Code-only public runtime reuse contract passed.');
// Explicit owner-export delivery runs through the existing workflow/CLI seams.
const { default: userdataTest } = await import('node:test');
const userdataWorkflow = workflow.replaceAll('\r\n', '\n');
const userdataSteps = [...userdataWorkflow.matchAll(/      - name: ([^\n]+)\n([\s\S]*?)(?=      - (?:name:|uses:)|$)/g)]
  .map(match => ({ name: match[1], text: match[2], id: /^        id: (.+)$/m.exec(match[2])?.[1] || match[1],
    code: /          node --input-type=module <<'(?:REPAIR_NODE|USERDATA_EDGE_NODE|USERDATA_FINAL_NODE|NODE)'\n([\s\S]*?)          (?:REPAIR_NODE|USERDATA_EDGE_NODE|USERDATA_FINAL_NODE|NODE)/.exec(match[2])?.[1]?.replace(/^          /gm, '') }));
const userdataStep = name => { const value = userdataSteps.find(step => step.name === name); assert.ok(value, name); return value; };
const userdataEvaluate = (code, scope) => new (Object.getPrototypeOf(async function(){}).constructor)(...Object.keys(scope),
  code.replace(/^import[\s\S]*?;\r?\n/gm, ''))(...Object.values(scope));

function userdataSelection({ optIn = false, predecessorApplied = true, assistantApplied = false, userdataApplied = false,
  checkpointApplied = false, accountApplied = false, accountOptIn = false, latestVersion = '20261010130000' } = {}) {
  const outputs = {};
  const rows = [{ remote: predecessorApplied ? '20261005000000' : '' },
    { remote: assistantApplied ? '20261010120000' : '' }, { remote: userdataApplied ? '20261010130000' : '' },
    { remote: checkpointApplied ? '20261012200000' : '' }, { remote: accountApplied ? '20261013210000' : '' }];
  return userdataEvaluate(userdataStep('Require originals before the pending assistant binding').code, {
    fs: { readFileSync: () => '', appendFileSync: (_file, text) => { const [key, value] = text.trim().split('='); outputs[key] = value; } },
    latest: { version: latestVersion }, userdataPolicy: TRIP_BINDING_POLICY_SOURCE_MIGRATION,
    parseSupabaseMigrationList: () => rows,
    process: { env: { RAVRADAR_USERDATA_UPGRADE_OPT_IN: String(optIn),
      RAVRADAR_ACCOUNT_ASSISTANT_UPGRADE_OPT_IN: String(accountOptIn),
      RUNNER_TEMP: '/synthetic', GITHUB_ENV: '/synthetic/env' } },
  }).then(() => outputs);
}
userdataTest('account successor selection: simultaneous upgrade opt-ins are refused by the actual workflow', async () => {
  // This is the genuine issued213 selector contract, not today's latest220
  // installation. Its complete normal code remains fixed044d-identical.
  assert.equal(ACCOUNT_ASSISTANT_SOURCE_MIGRATION.version, '20261013210000');
  assert.equal(crypto.createHash('sha256').update(
    userdataStep('Require originals before the pending assistant binding').code).digest('hex'),
    'c5549937ace91def8128702dac30a68a9068f5483d1dffb0c540975b3f1da5c1');
  assert.equal(crypto.createHash('sha256').update(fs.readFileSync(
    'supabase/migrations/20261013210000_account_assistant_original_bound_successor.sql')).digest('hex'),
    '80ad179bc896e9fcd62b8af103d70a2d086d3626395dd97f03e4184e52bcae5d');
  const installed = { assistantApplied: true, userdataApplied: true, checkpointApplied: true,
    latestVersion: ACCOUNT_ASSISTANT_SOURCE_MIGRATION.version };
  await assert.rejects(userdataSelection({ ...installed, optIn: true, accountOptIn: true }),
    /Userdata upgrade requires installed current050000 and sole pending130000/);
  const accountOnly = await userdataSelection({ ...installed, accountOptIn: true });
  assert.equal(accountOnly.RAVRADAR_USERDATA_PREWRITE_REQUIRED, 'false');
  assert.equal(accountOnly.RAVRADAR_ACCOUNT_ASSISTANT_PREWRITE_REQUIRED, 'true');
  assert.equal(accountOnly.RAVRADAR_ACCOUNT_ASSISTANT_METADATA_ONLY, 'true');
});
userdataTest('userdata delivery: opt-in is explicit and sole130000 requires installed050000', async () => {
  await assert.rejects(userdataSelection(), /explicit.*opt-in/);
  await assert.rejects(userdataSelection({ optIn: true, predecessorApplied: false }), /installed current050000/);
  await assert.rejects(userdataSelection({ optIn: true, assistantApplied: true }), /no intermediary/);
  await assert.rejects(userdataSelection({ optIn: true, latestVersion: '20261010120000' }), /installed current050000/);
  await assert.rejects(userdataSelection({ optIn: true, userdataApplied: true }), /automatic replay/);
  const ok = await userdataSelection({ optIn: true });
  assert.equal(ok.RAVRADAR_USERDATA_PREWRITE_REQUIRED, 'true');
  assert.equal(ok.RAVRADAR_ASSISTANT_PREWRITE_REQUIRED, 'false');
});
userdataTest('userdata delivery: unfinished historical assistant is refused and no-write current remains distinct', async () => {
  // The old120000 positive is superseded: its absent current130000 binding
  // cannot be made legitimate with a fake policy or an unordered installed row.
  await assert.rejects(userdataSelection({ latestVersion: '20261010120000', assistantApplied: false }),
    /explicit.*opt-in/);
  const current = await userdataSelection({ userdataApplied: true });
  assert.equal(current.RAVRADAR_USERDATA_PREWRITE_REQUIRED, 'false');
  assert.match(userdataWorkflow, /upgrade_existing_owner_export:[\s\S]*?default: false/);
  assert.match(userdataWorkflow, /group: ravradar-weather-production-v2/);
  assert.match(userdataWorkflow,
    /concurrency:\s+(?:#[^\n]*\n\s*)?group: ravradar-trip-storage-production\s+cancel-in-progress: false/,
    'Current rebound trip-Edge deployment must always share the existing exclusive storage lock without cancellation');
});
userdataTest('userdata delivery: immutable direct predecessor is checked before its normal DB readback', async () => {
  const step = userdataStep('Verify installed current050000 predecessor before userdata preparation');
  const original = fs.readFileSync('supabase/migrations/20261005000000_owner_water_level_only_binding.sql');
  const verify = (version, bytes) => userdataEvaluate(step.code, {
    assert, createHash: crypto.createHash, fs: { readFileSync: () => bytes }, latest: { version },
  });
  await verify('20261005000000', original);
  await assert.rejects(verify('20261010120000', original), /source must end at current050000/);
  await assert.rejects(verify('20261010130000', original), /source must end at current050000/);
  await assert.rejects(verify('20261005000000', Buffer.concat([original, Buffer.from('\n')])), /remain immutable/);
  assert.match(step.text, /cd "\$RAVRADAR_PREDECESSOR_SOURCE_ROOT"/);
  assert.ok(step.text.indexOf('must remain immutable') < step.text.indexOf('node scripts/integrated-cutover-readiness.mjs verify-db'));
});
userdataTest('userdata delivery: normal migration CLI rejects absent opt-in, unproved originals and combined pending', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'rr-userdata-plan-'));
  try {
    const list = path.join(root, 'list.txt'), dry = path.join(root, 'dry.txt');
    for (const [optIn, verified, combined, expected] of [['false','true',false,1],['true','false',false,1],['true','true',true,1],['true','true',false,1]]) {
      const pending = new Set(REQUIRED_CUTOVER_MIGRATIONS.filter(item =>
        item.version >= TRIP_BINDING_POLICY_SOURCE_MIGRATION.version).map(item => item.version));
      if (combined) pending.add('20261010120000');
      const fixtureMigrations = [...REQUIRED_CUTOVER_MIGRATIONS, ...(combined ? [{ version: '20261010120000',
        filename: '20261010120000_assistant_knowledge_bound_successor.sql' }] : [])]
        .sort((a, b) => a.version.localeCompare(b.version));
      fs.writeFileSync(list, `Local | Remote | Time (UTC)\n${fixtureMigrations.map(item => `${item.version} | ${pending.has(item.version) ? '' : item.version} | state`).join('\n')}`);
      fs.writeFileSync(dry, `DRY RUN: migrations will *not* be pushed to the database.\nWould push these migrations:\n${fixtureMigrations.filter(item => pending.has(item.version)).map(item => ` • ${item.filename}`).join('\n')}\nFinished supabase db push.`);
      const result = spawnSync(process.execPath, ['scripts/verify-code-only-migration-plan.mjs', '--require-prewrite-gate',
        '--account-assistant-prewrite-plan',
        '--migration-list', list, '--dry-run', dry, '--migrations-directory', path.resolve('supabase/migrations')], {
        encoding: 'utf8', timeout: 30000, windowsHide: true, env: { SystemRoot: process.env.SystemRoot, PATH: process.env.PATH,
          TEMP: os.tmpdir(), TMP: os.tmpdir(), RAVRADAR_USERDATA_UPGRADE_OPT_IN: optIn,
          RAVRADAR_USERDATA_PREWRITE_REQUIRED: 'true', RAVRADAR_USERDATA_PREWRITE_VERIFIED: verified,
          RAVRADAR_ACCOUNT_ASSISTANT_UPGRADE_OPT_IN: 'true',
          RAVRADAR_ACCOUNT_ASSISTANT_PREWRITE_REQUIRED: 'true',
          RAVRADAR_ACCOUNT_ASSISTANT_PREWRITE_VERIFIED: 'true' } });
      assert.equal(result.status, expected, result.stderr || result.error?.message);
      assert.match(result.stderr, combined ? /unexpected pending migrations/
        : optIn === 'false' ? /explicit existing-owner-export opt-in/
        : verified === 'false' ? /completed normal original-preservation path/
        : /only the exact latest required integrated migration/);
    }
  } finally { assert.equal(path.dirname(root), path.resolve(os.tmpdir())); fs.rmSync(root, { recursive: true, force: true }); }
});

// Execute the actual workflow's inline programs; only child processes and clocks
// are synthetic. DDL/process/provider implementations retain their prior receipts.
async function userdataOperationFixture({ fail = '', unknownStop = false, falseStop = false, expireAt = '', driftAt = '' } = {}) {
  const first = userdataSteps.findIndex(step => step.name === 'Read-only existing D1 repair preparation and live preflight');
  const last = userdataSteps.findIndex(step => step.name === 'Restore and attest normal D1 after replacement');
  assert.ok(first >= 0 && last > first);
  const calls = [], states = {}; let error = null, clock = 1800000000000;
  for (const step of userdataSteps.slice(first, last + 1)) {
    if (error) { states[step.id] = { outcome: 'skipped' }; continue; }
    assert.match(step.text, /if: env.RAVRADAR_USERDATA_PREWRITE_REQUIRED == 'true'/);
    const env = { GITHUB_REF: 'refs/heads/main', GITHUB_SHA: 'a'.repeat(40), GITHUB_OUTPUT: '/synthetic/output',
      SUPABASE_PROJECT_ID: 'synthetic', TRIP_STORAGE_OWNER_EXPORT_UPGRADE: '1',
      TRIP_STORAGE_UPGRADE_PREFLIGHT: /TRIP_STORAGE_UPGRADE_PREFLIGHT: '0'/.test(step.text) ? '0' : '1',
      TRIP_WRANGLER_CONFIG_PATH: '/synthetic/config', REPAIR_LEASE_DEADLINE: states.repair_quiesce?.outputs?.deadline,
      REPAIR_EXPECTED_WORKER_VERSION: states.repair_replace?.outputs?.version,
      EXPECTED_TRIP_STORAGE_MODE: step.id === 'userdata_trip_edges' ? 'maintenance' : 'd1' };
    const outputs = {};
    const execFileSync = (command, args, options = {}) => {
      const action = command === 'git' ? (args[0] === 'fetch' ? 'fetch' : 'head')
        : command === 'sleep' ? 'drain' : command === 'npx' ? 'worker-deploy'
        : command === 'supabase' ? (args[0] === 'functions' ? args[2] : args.at(-1) === 'TRIP_STORAGE_MODE=d1' ? 'restore' : 'maintenance')
        : args[0].includes('prepare-cloudflare') ? (args[1]?.endsWith('-apply') ? '002' : 'schema')
        : args[0].includes('verify-trip-storage-edge') ? 'edge-readback' : 'worker-readback';
      calls.push({ step: step.id, action, args, env: options.env || env });
      if (action === fail) throw new Error('private synthetic cause must not be logged');
      if (step.id + ':' + action === expireAt) clock += 21 * 60000;
      if (action === 'head') return step.id === driftAt ? 'b'.repeat(40) : env.GITHUB_SHA;
      if (action === 'drain') clock += 20000;
      if (action === 'worker-deploy') return 'Current Version ID: 11111111-1111-4111-8111-111111111111\n';
      return '';
    };
    try {
      if (!step.code) {
        // These remain direct normal CLI calls, with no parallel SQL implementation.
        if (step.id === 'owner_upgrade_apply') execFileSync('node', ['scripts/prepare-cloudflare-trip-storage.mjs','--existing-owner-export-upgrade-apply']);
        else {
          assert.match(step.text, /--existing-owner-export-upgrade-plan/);
          execFileSync('node',['scripts/prepare-cloudflare-trip-storage.mjs','--existing-owner-export-upgrade-plan']);
          execFileSync('node',['scripts/verify-trip-storage-edge.mjs']);
          execFileSync('node',['scripts/verify-cloudflare-trip-gateway.mjs']);
        }
      } else await userdataEvaluate(step.code, { execFileSync, process: { env }, console: { log(){} },
        fs: { appendFileSync: (_file,text) => { const [key,...value] = text.trim().split('='); outputs[key] = value.join('='); } },
        Date: class extends Date { static now() { return clock; } },
        deployTripWorker: async () => {
          const stdout = execFileSync('npx',['--yes','wrangler@4.28.1','deploy']);
          if (unknownStop) throw new Error('unknown child termination');
          return { stdout, terminationConfirmed: !falseStop };
        },
      });
      states[step.id] = { outcome: 'success', outputs };
    } catch (cause) { error ??= cause; states[step.id] = { outcome: 'failure', outputs }; }
  }
  return { calls, states, error };
}
userdataTest('userdata delivery: same-run SQL/readback then exact002, one Worker, two Edges and bound restore before publication', async () => {
  const positions = ['Reverify the same userdata originals before binding installation', 'Apply exact dry-run-verified post-cutover binding',
    'Read back migration and database binding', 'Read-only existing D1 repair preparation and live preflight',
    'Apply only missing exact owner-export indexes on existing shards', 'Replace and attest the same-SQL Worker',
    'Deploy and attest exact userdata trip Edges once', 'Restore and attest normal D1 after replacement',
    'Audit regenerated integrated public runtime'].map(name => userdataWorkflow.indexOf('- name: ' + name));
  assert.ok(positions.every((at,i) => at >= 0 && (!i || at > positions[i-1])));
  const result = await userdataOperationFixture(); assert.equal(result.error, null, result.error?.stack);
  assert.deepEqual(result.calls.filter(call => ['maintenance','drain','002','worker-deploy','trip-log','submit-observation','restore'].includes(call.action)).map(call => call.action),
    ['maintenance','drain','002','worker-deploy','trip-log','submit-observation','restore']);
  const final = result.calls.filter(call => ['userdata_trip_edges','repair_restore'].includes(call.step));
  assert.ok(final.every(call => call.env.TRIP_STORAGE_UPGRADE_PREFLIGHT === '0'));
  assert.ok(final.filter(call => call.action === 'worker-readback').every(call => call.env.EXPECTED_TRIP_WORKER_VERSION === result.states.repair_replace.outputs.version));
});
for (const fail of ['schema','maintenance','002','worker-deploy','trip-log','submit-observation','restore'])
  userdataTest('userdata delivery: first failure at ' + fail + ' cannot start another mutation or recovery', async () => {
    const result = await userdataOperationFixture({ fail }); assert.ok(result.error);
    const at = result.calls.findIndex(call => call.action === fail); assert.equal(at, result.calls.length-1);
    assert.ok(result.calls.filter(call => call.action === 'worker-deploy').length <= 1);
    assert.equal(result.calls.some(call => call.step.startsWith('repair_recovery')), false);
  });
for (const options of [{unknownStop:true},{falseStop:true}, {expireAt:'repair_replace:worker-readback'},
  {expireAt:'userdata_trip_edges:worker-readback'}, {expireAt:'repair_restore:worker-readback'},
  {driftAt:'repair_replace'}, {driftAt:'userdata_trip_edges'}, {driftAt:'repair_restore'}])
  userdataTest('userdata delivery: unknown outcome/expired lease/main drift stops ' + JSON.stringify(options), async () => {
    const result = await userdataOperationFixture(options); assert.ok(result.error);
    assert.equal(result.calls.some(call => call.action === 'restore'), false);
    if (options.unknownStop || options.falseStop) assert.equal(result.calls.some(call => ['trip-log','submit-observation'].includes(call.action)),false);
    assert.ok(result.calls.filter(call => call.action === 'worker-deploy').length <= 1);
  });

async function userdataFinalFixture({ missing = [], fail = '', versionId = '11111111-1111-4111-8111-111111111111' } = {}) {
  const step = userdataStep('Require installed owner-export storage before userdata publication');
  const calls = [], env = { GITHUB_SHA:'a'.repeat(40),TRIP_OWNER_EXPORT_PLAN_PATH:'/synthetic/final',
    TRIP_STORAGE_OWNER_EXPORT_UPGRADE:'1',TRIP_STORAGE_UPGRADE_PREFLIGHT:'0',EXPECTED_TRIP_STORAGE_MODE:'d1' };
  let error = null;
  try { await userdataEvaluate(step.code, { process:{env}, fs:{readFileSync:()=>Buffer.from(JSON.stringify({sourceSha:env.GITHUB_SHA,missing,versionId}))},
    execFileSync:(command,args,options)=>{calls.push({command,args,options});if(args[0].includes(fail) && fail)throw new Error('synthetic private provider failure');return '';},
  }); } catch(cause) { error=cause; }
  return {calls,error};
}
userdataTest('userdata final: already-applied130000 is read-only, exact002 and version/capability verified before publication',async()=>{
  // Historical issued213 no-write scope requires installed200000 and213.
  // It must not derive this old contract from today's current-grid latest220.
  await assert.rejects(userdataSelection({userdataApplied:true,
    latestVersion:ACCOUNT_ASSISTANT_SOURCE_MIGRATION.version}), /named opt-in/);
  const selected=await userdataSelection({assistantApplied:true,userdataApplied:true,checkpointApplied:true,accountApplied:true,
    latestVersion:ACCOUNT_ASSISTANT_SOURCE_MIGRATION.version});
  assert.equal(selected.RAVRADAR_ACCOUNT_ASSISTANT_PREWRITE_REQUIRED,'false');
  assert.equal(selected.RAVRADAR_ACCOUNT_ASSISTANT_FINAL_REQUIRED,'true');
  assert.equal(selected.RAVRADAR_USERDATA_PREWRITE_REQUIRED,'false');
  assert.equal(selected.RAVRADAR_USERDATA_FINAL_REQUIRED,'true');
  // Superseded old120000 scope cannot omit the actual userdata predecessor.
  await assert.rejects(userdataSelection({latestVersion:'20261010120000'}),/explicit.*opt-in/);
  const result=await userdataFinalFixture();assert.equal(result.error,null,result.error?.stack);
  assert.equal(result.calls.length,3);assert.ok(result.calls.every(call=>call.command==='node'));
  assert.deepEqual(result.calls[0].args,['scripts/prepare-cloudflare-trip-storage.mjs','--existing-owner-export-upgrade-plan']);
  assert.equal(result.calls[1].options.env.EXPECTED_TRIP_WORKER_VERSION,'11111111-1111-4111-8111-111111111111');
  assert.ok(result.calls.every(call=>call.options.env.TRIP_STORAGE_UPGRADE_PREFLIGHT==='0'));
  assert.ok(userdataWorkflow.indexOf('Require installed owner-export storage before userdata publication')<userdataWorkflow.indexOf('id: checkpoint-publish'));
});
for(const options of [{missing:['synthetic-shard']},{missing:null},{versionId:[]},
  {fail:'prepare-cloudflare'},{fail:'verify-cloudflare'},{fail:'verify-trip-storage-edge'}])
  userdataTest('userdata final: failed/missing physical index or final receipt stops '+JSON.stringify(options),async()=>{
    const result=await userdataFinalFixture(options);assert.ok(result.error);
    assert.equal(result.error.message,'USERDATA_FINAL_STORAGE_UNVERIFIED');
    assert.ok(result.calls.every(call=>call.command==='node'&&!call.args.some(arg=>/apply$|deploy|secrets|push/.test(arg))));
    if(options.missing!==undefined||Array.isArray(options.versionId))assert.equal(result.calls.length,1);
  });


// Preserve bounded transfer and first-error STOP while making its exact file visible.
userdataTest('current220 remains a separate NEW-hour route, never an issued213 selection or code-only original bridge', async () => {
  assert.equal(LATEST_REQUIRED_CUTOVER_MIGRATION.version, '20261013220000');
  const installed213 = { assistantApplied: true, userdataApplied: true,
    checkpointApplied: true, accountApplied: true,
    latestVersion: LATEST_REQUIRED_CUTOVER_MIGRATION.version };
  await assert.rejects(userdataSelection({ ...installed213, accountOptIn: true }),
    /Account\/assistant upgrade requires installed200000 and sole pending20261013210000; no replay/);
  await assert.rejects(userdataSelection({ ...installed213, optIn: true }),
    /Userdata upgrade requires installed current050000 and sole pending130000/);
  const neutral = await userdataSelection(installed213);
  assert.equal(neutral.RAVRADAR_USERDATA_PREWRITE_REQUIRED, 'false');
  assert.equal(neutral.RAVRADAR_USERDATA_FINAL_REQUIRED, 'true');
  assert.equal(neutral.RAVRADAR_ACCOUNT_ASSISTANT_PREWRITE_REQUIRED, 'false');
  assert.equal(neutral.RAVRADAR_ACCOUNT_ASSISTANT_METADATA_ONLY, 'false');
  assert.equal(neutral.RAVRADAR_ACCOUNT_ASSISTANT_FINAL_REQUIRED, 'false');
  // A selector result is not install permission. Execute the actual earlier
  // normal model route with REAL current SOURCE helpers and no model globals
  // override. The metadata is controlled input, not authenticated private B/S.
  const policy = CURRENT_GRID_SAMPLING_SELECTED_PREDECESSOR_POLICY;
  const controlledOriginal = { schemaVersion: policy.sourceDescriptionSchemaVersion,
    kind: policy.sourceDescriptionKind, sourceHead: '044d3045fecc2e70d6f35f60010921c6bd597ecc',
    datasetId: 'rr-controlled-current220-route-210', productionReferenceAt: '2026-10-13T12:00:00.000Z',
    generatedAt: '2026-10-13T12:05:00.000Z', bundleContentSha256: 'a'.repeat(64),
    modelBinding: structuredClone(policy.sourceModelBinding),
    contractHashes: structuredClone(policy.sourceContractHashes),
    expectedZoneCount: 210, expectedPartCount: 673, privatePayloadIncluded: false };
  const modelRoute = userdataStep('Preserve the protected 11Z and 15Z pair for the next normal weather run');
  assert.ok(modelRoute.code);
  // KB is not an issued220 runtime: its source-only transition must stay absent.
  assert.equal(await buildCurrentGridSamplingOriginalRestoreExpectation({
    sourceDescription:controlledOriginal,targetReferenceAt:controlledOriginal.productionReferenceAt,
    now:'2026-10-13T12:10:00.000Z'}),null);
  const {createIssuedCurrentGridReceiverFixture}=await import('./lib/current-grid-issued-receiver-test-fixture.mjs');
  const issued=await createIssuedCurrentGridReceiverFixture();
  try {
  const historicalSteps=[...issued.workflowSource.matchAll(/      - name: ([^\n]+)\n([\s\S]*?)(?=      - (?:name:|uses:)|$)/g)];
  const historicalStep=historicalSteps.find(match=>match[1]===modelRoute.name);assert.ok(historicalStep);
  const historicalCode=/          node --input-type=module <<'NODE'\n([\s\S]*?)          NODE/.exec(historicalStep[2])?.[1]?.replace(/^          /gm,'');
  assert.equal(modelRoute.code,historicalCode,'The actual normal NEW-hour guard stays whole issued220-identical');
  const {buildCurrentGridSamplingOriginalRestoreExpectation}=issued.grid;
  const {isLatestUnpairedWeatherGeneration}=issued.archive;
  await assert.rejects(userdataEvaluate(modelRoute.code, {
    fs: { readFileSync: () => JSON.stringify(controlledOriginal) },
    process: { env: { RUNNER_TEMP: '/synthetic' } },
    isLatestUnpairedWeatherGeneration, buildCurrentGridSamplingOriginalRestoreExpectation,
  }), /Current-grid source succession requires the next normal NEW-hour weather run/);
  } finally {await issued.close();}
  assert.ok(userdataWorkflow.indexOf('- name: ' + modelRoute.name)
    < userdataWorkflow.indexOf('- name: Require originals before the pending assistant binding'));
});

const publicSnapshotStart = workflow.indexOf('- name: Download exact currently public code-only source');
const publicSnapshotEnd = workflow.indexOf('\n      - name:', publicSnapshotStart + 1);
const publicSnapshot = workflow.slice(publicSnapshotStart, publicSnapshotEnd);
const publicAcquisition = fs.readFileSync('scripts/acquire-code-only-public-snapshot.mjs', 'utf8');
assert.ok(publicSnapshot.includes('curl --version'), 'Snapshot must identify the actual curl runtime');
assert.ok(publicSnapshot.includes('node scripts/acquire-code-only-public-snapshot.mjs acquire'),
  'The initial snapshot must use the normal bounded acquisition helper');
assert.ok(publicSnapshot.indexOf('node scripts/acquire-code-only-public-snapshot.mjs acquire')
  < publicSnapshot.indexOf('target_reference='),
  'The production reference must be read only after acquisition succeeds');
assert.doesNotMatch(publicSnapshot, /fetch_public\s*\(/,
  'The initial snapshot must not bypass the normal acquisition helper');
assert.ok(publicAcquisition.includes("'--write-out', '%{http_code}\\t%header{content-length}\\t%{size_download}\\n'"),
  'Snapshot failures must measure HTTP status, declared Content-Length and actual received byte count');
for (const field of ['Public snapshot file=${name}', 'bound=${cap}', 'http=${http}',
  'declared=${declared}', 'received=${received}']) {
  assert.ok(publicAcquisition.includes(field),
    'Snapshot failures must identify their exact file, bound and measured transfer fields');
}
assert.ok(publicAcquisition.includes("'--max-filesize', String(cap)"),
  'Diagnostic must not loosen the byte bound');
assert.ok(publicAcquisition.includes("'--connect-timeout', '10'")
  && publicAcquisition.includes("'--max-time', String(Math.min(60, seconds))"),
  'Diagnostic must preserve request deadlines');
for (const fileBound of [
  "['data/live/manifest.json', 'manifest.json', MiB]",
  "['data/live/public-conditions.json', 'public-conditions.json', 32 * MiB]",
  "['data/live/public-condition-details.json', 'public-condition-details.json', null]",
  "['data/live/coastal-parts-v2.json', 'coastal-parts-v2.json', 16 * MiB]",
  "['data/zones.geojson', 'zones.geojson', 32 * MiB]",
  "['data/water-level-station-routing.json', 'water-level-station-routing.json', 4 * MiB]",
  'manifestBoundedPublicDetailsBytes(manifest.publicConditionDetailsBytes)',
]) assert.ok(publicAcquisition.includes(fileBound), 'Acquisition must retain each original file byte bound');
assert.ok(publicSnapshot.includes('set -euo pipefail'), 'Snapshot must retain first-error STOP');
assert.doesNotMatch(publicSnapshot, /continue-on-error|\|\|\s*true|--ignore-content-length|--compressed/,
  'Diagnostic must neither suppress a failure nor change the transferred representation');
assert.doesNotMatch(publicAcquisition, /--ignore-content-length|--compressed/,
  'The acquisition helper must not change the transferred representation or ignore its byte bound');
const acquisitionCurrentStart = workflow.indexOf('- name: Read exact centrally active operational RavScore');
const acquisitionCurrentEnd = workflow.indexOf('\n      - name:', acquisitionCurrentStart + 1);
assert.ok(acquisitionCurrentStart >= 0 && acquisitionCurrentEnd > acquisitionCurrentStart,
  'The later normal central-state read must remain present');
const acquisitionCurrent = workflow.slice(acquisitionCurrentStart, acquisitionCurrentEnd);
const currentRead = acquisitionCurrent.indexOf('node scripts/ravscore-operational-activation.mjs read');
const currentAssertion = acquisitionCurrent.indexOf('node scripts/acquire-code-only-public-snapshot.mjs assert-current');
const currentOutputs = acquisitionCurrent.indexOf('for field in model status');
assert.ok(currentRead >= 0 && currentRead < currentAssertion && currentAssertion < currentOutputs,
  'Acquisition identity must be rechecked after the normal fresh central read and before its outputs');

import { selectPublicAcquisition, githubAuthorizationStdin } from './acquire-code-only-public-snapshot.mjs';
import { spawnSync } from 'node:child_process';

// Execute the same ordinary Bash deploy block, not a parallel retry implementation.
// The existing subprocess seam substitutes only the CLI and delay, with no provider.
userdataTest('userdata delivery: assistant opt-in is single-attempt and legacy keeps three attempts',
  { skip: process.platform !== 'linux' }, () => {
    const step = userdataStep('Deploy only the exact RavRadar assistant Edge function');
    const runMatch = /        run: \|\n([\s\S]*?)(?=\n        env:|$)/.exec(step.text);
    assert.ok(runMatch, 'The normal assistant Bash caller must be present');
    const run = runMatch[1].replace(/^          /gm, '');
    for (const fixture of [
      { optIn: 'true', failures: 3, attempts: 1, status: 1, delays: [] },
      { optIn: 'true', failures: 0, attempts: 1, status: 0, delays: [] },
      { optIn: 'false', failures: 3, attempts: 3, status: 1, delays: [5, 10] },
      { optIn: 'false', failures: 1, attempts: 2, status: 0, delays: [5] },
      { optIn: 'false', failures: 2, attempts: 3, status: 0, delays: [5, 10] },
      { optIn: 'false', failures: 0, attempts: 1, status: 0, delays: [] },
      { failures: 3, attempts: 3, status: 1, delays: [5, 10] },
    ]) {
      const env = { PATH: process.env.PATH, SUPABASE_PROJECT_ID: 'synthetic-project',
        RR_TEST_FAILURE_COUNT: String(fixture.failures) };
      if (Object.hasOwn(fixture, 'optIn')) env.RAVRADAR_USERDATA_UPGRADE_OPT_IN = fixture.optIn;
      const result = spawnSync('bash', ['--noprofile', '--norc', '-c', [
        'synthetic_attempt=0',
        'supabase() {',
        '  test "$*" = "functions deploy ravradar-assistant --project-ref synthetic-project" || return 91',
        '  synthetic_attempt=$((synthetic_attempt + 1))',
        '  printf "DEPLOY:%s\\n" "$synthetic_attempt"',
        '  test "$synthetic_attempt" -gt "$RR_TEST_FAILURE_COUNT"',
        '}',
        'sleep() { printf "SLEEP:%s\\n" "$1"; }',
        run,
        'printf "UNEXPECTED_FALLTHROUGH\\n"',
      ].join('\n')], { env, encoding: 'utf8', timeout: 5000, maxBuffer: 16_384 });
      const label = JSON.stringify(fixture);
      assert.equal(result.error, undefined, label);
      assert.equal(result.signal, null, label);
      assert.equal(result.status, fixture.status, `${label}\n${result.stderr}`);
      const calls = result.stdout.split(/\r?\n/).filter(line => line.startsWith('DEPLOY:'));
      assert.deepEqual(calls, Array.from({ length: fixture.attempts }, (_, index) => `DEPLOY:${index + 1}`), label);
      const delays = result.stdout.split(/\r?\n/).filter(line => line.startsWith('SLEEP:'));
      assert.deepEqual(delays, fixture.delays.map(delay => `SLEEP:${delay}`), label);
      assert.equal((result.stderr.match(/failed; retrying\./g) ?? []).length, fixture.delays.length, label);
      assert.doesNotMatch(result.stdout, /UNEXPECTED_FALLTHROUGH/, label);
    }
  });

// Synthetic tokens only: GitHub format may change; the bearer/config safety contract must not.
const syntheticLongGithubToken = `ghs_12345_${'a'.repeat(220)}.${'b'.repeat(220)}.${'c_-'.repeat(40)}`;
assert.ok(syntheticLongGithubToken.length > 520);
for (const token of ['ghp_SYNTHETIC123', 'github_pat_SYNTHETIC_123',
  'ghs_12345_header.payload-signature', 'A~B+C/D==', syntheticLongGithubToken]) {
  assert.equal(githubAuthorizationStdin(token), `header = "Authorization: Bearer ${token}"\n`);
}
for (const token of [undefined, null, 123, {}, '', ' ', 'a b', 'a"b', "a'b", 'a\\b',
  'a=b', '=abc', 'abc\n', 'abc\r\n', 'a\nb', 'a\rb', 'a\u007fb', 'a\u0080b',
  ...Array.from({ length: 32 }, (_, code) => `a${String.fromCharCode(code)}b`)]) {
  assert.throws(() => githubAuthorizationStdin(token),
    error => error?.message === 'PUBLIC_ACQUISITION_GITHUB_AUTH_REQUIRED');
}
assert.ok(publicAcquisition.includes('input = githubAuthorizationStdin(process.env.GH_TOKEN);'),
  'The actual authenticated downloader must use the tested bearer-token encoder');
assert.ok(publicAcquisition.includes("'X-GitHub-Api-Version: 2022-11-28', '--config', '-');"),
  'GitHub authorization must remain in curl config stdin, not argv');
assert.ok(publicAcquisition.includes("await child('curl', args, { deadline, env: neutralEnvironment(), input });"),
  'The actual curl caller must retain neutral environment and separate stdin');
assert.doesNotMatch(publicAcquisition.slice(publicAcquisition.indexOf('function neutralEnvironment'),
  publicAcquisition.indexOf('function remaining')), /GH_TOKEN|GITHUB_TOKEN|Authorization/,
  'The curl child environment must not inherit the GitHub credential');

assert.deepEqual(selectPublicAcquisition(centralSource, sourceManifest, ''), {
  mode: 'sealed-active-artifact',
  selected: matchedSource,
}, 'The actual selector must bind the exact central/public match to the sealed artifact');
assert.deepEqual(selectPublicAcquisition({
  ...centralSource, model: 'legacy-candidate-g', status: 'CANDIDATE_G_ACTIVE',
}, sourceManifest, ''), { mode: 'existing-public-route' },
'The actual selector must preserve the legacy/missed-cutover public route');
assert.deepEqual(selectPublicAcquisition(centralSource, sourceManifest, '123'),
  { mode: 'existing-public-route' },
  'Explicit recovery must keep the existing maintenance source-resolution route');
assert.throws(() => selectPublicAcquisition(centralSource,
  { ...sourceManifest, datasetId: 'unknown-drift' }, ''),
/ahead of central state without an exact repair policy/,
'An unrecognized public/central mismatch must not select or silently fall back');

// Run the complete normal extractor suite once, pinned to the actual product bytes.
if (process.platform === 'linux') {
  const extractorPath = 'scripts/extract-code-only-public-source.py';
  const extractorSha256 = crypto.createHash('sha256')
    .update(fs.readFileSync(extractorPath)).digest('hex');
  const extractorContracts = spawnSync('python3', [
    '-I', '-B', 'scripts/test-code-only-public-extractor.py',
    '--extractor', extractorPath, '--extractor-sha256', extractorSha256,
  ], { encoding: 'utf8', timeout: 60_000, maxBuffer: 65_536 });
  assert.equal(extractorContracts.error, undefined,
    'The normal extractor contract suite must actually start and finish within its test bound');
  assert.equal(extractorContracts.signal, null,
    'The normal extractor contract suite must not terminate by signal');
  assert.equal(extractorContracts.status, 0,
    extractorContracts.stderr || extractorContracts.stdout || 'Extractor contracts failed');
  process.stdout.write(extractorContracts.stdout);
  process.stderr.write(extractorContracts.stderr);
} else {
  console.log('Linux extractor CLI contracts not executed on this platform');
}
