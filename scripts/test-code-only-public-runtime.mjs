#!/usr/bin/env node
import assert from 'node:assert/strict';
import './test-post-cutover-migration-routing.mjs';
import crypto from 'node:crypto';
import fs from 'node:fs';
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
import { PROTECTED_PRIVATE_RUNTIME_POLICY } from './protected-private-production-runtime.mjs';
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
  'target_reference="${target_reference_raw%.000Z}Z"',
  "grep -Fxq 'status=FRESH' \"$freshness_output\"",
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
  'BUILDING_MEASURED_ONLY:false) disposition=NOT_APPLICABLE_DURING_MEASURED_WARMUP; checkpoint_required=false',
]) assert.ok(checkpointDisposition.includes(marker),
  `Code-only checkpointdisposition mangler ${marker}`);
for (const step of ['checkpoint-build', 'checkpoint-save', 'checkpoint-publish']) {
  const start = workflow.indexOf(`id: ${step}`);
  const end = workflow.indexOf('\n      - name:', start + 1);
  const block = workflow.slice(start, end);
  assert.ok(block.includes("if: steps.runtime-audit.outputs.rollback_status == 'READY'"),
    `${step} må kun køre for en faktisk READY rollbackkilde`);
  assert.ok(!block.includes('BUILDING_MEASURED_ONLY'),
    `${step} må ikke kræve det pensionerede Candidate G-checkpoint under measured warmup`);
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
]) assert.ok(savedWeatherBinding.includes(marker),
  `Saved-weather-fortsættelsen mangler integreret vedligeholdelsesgrænse: ${marker}`);
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
  'scripts/lib/supabase-admin-rest.mjs',
  'scripts/lib/private-weather-component-inventory.mjs',
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
  './lib/private-weather-component-inventory.mjs',
  './lib/supabase-admin-rest.mjs',
  './private-production-runtime-bundle.mjs',
].sort(), 'Alle relative restore-wrapperimports skal klassificeres i kompatibilitetslukningen');
for (const helperPath of [
  'scripts/lib/private-weather-component-inventory.mjs',
  'scripts/lib/supabase-admin-rest.mjs',
]) assert.deepEqual(relativeModuleSpecifiers(fs.readFileSync(helperPath, 'utf8')), [],
  `Den kopierede kompatibilitetshjælper har fået en uklassificeret relativ import: ${helperPath}`);
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
