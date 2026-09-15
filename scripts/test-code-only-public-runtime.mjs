#!/usr/bin/env node
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import {
  assertCodeOnlyModelBinding,
  assertZoneRegistryVersionOnly,
  CODE_ONLY_MAXIMUM_PRIVATE_CONDITIONS_BYTES,
  CODE_ONLY_MAXIMUM_PUBLIC_DETAILS_BYTES,
  CODE_ONLY_SNAPSHOT_FILES,
  manifestBoundedPublicDetailsBytes,
  normalizeCodeOnlyProjection,
} from './prepare-code-only-public-runtime.mjs';
import { ravScoreModelBinding } from '../js/core/ravscore-model-contract.js';
import { PROTECTED_PRIVATE_RUNTIME_POLICY } from './protected-private-production-runtime.mjs';
import { resolveCodeOnlyPublicSource } from './resolve-code-only-public-source.mjs';

assert.equal(
  CODE_ONLY_MAXIMUM_PRIVATE_CONDITIONS_BYTES,
  PROTECTED_PRIVATE_RUNTIME_POLICY.maximumFilePayloadBytes,
  'Code-only-genopbygningen skal bruge cachetransportens allerede validerede filgrænse',
);
assert.ok(CODE_ONLY_MAXIMUM_PRIVATE_CONDITIONS_BYTES > 256 * 1024 * 1024,
  'Den forældede 256 MiB-grænse må ikke afvise den komplette private runtime');

const current = ravScoreModelBinding();
assertCodeOnlyModelBinding(current, current);
assertCodeOnlyModelBinding({ ...current, modelBundleSha256: 'a'.repeat(64) }, current);
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

const observedProductionDetailsBytes = 117_820_378;
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
  'steps.public-source.outputs.deployment_id',
  'steps.public-source.outputs.implementation_closure_sha256',
  'sourceRepairId:',
  'if has($field) then .[$field] else "" end',
  'Prove the current-compatible runtime is no longer client-readable',
  'Describe exact current private runtime source for bounded migration',
  '--describe-current',
  'current-private-runtime-source.json',
  'compare/$predecessor...$GITHUB_SHA',
  'Add payload-free rejection codes to the exact predecessor restore',
  'Prove the saved predecessor runtime is no longer client-readable',
  'for attempt in 1 2 3; do',
  'Protected current restore attempt $attempt of 3 failed.',
  'if node "$RAVRADAR_PREDECESSOR_SOURCE_ROOT/scripts/protected-private-production-runtime.mjs" --restore',
  'Protected predecessor restore attempt $attempt of 3 failed.',
  '--predecessor-descriptor "$RAVRADAR_OPERATIONAL_WORK/current-private-runtime-source.json"',
  '--expected-source-head "$(jq -er \'\.sourceHead\' "$RAVRADAR_OPERATIONAL_WORK/current-private-runtime-source.json")"',
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
  'code_only_repair: true',
]) assert.ok(workflow.includes(marker), `Code-only-workflow mangler ${marker}`);
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
  < workflow.indexOf('Add payload-free rejection codes to the exact predecessor restore'),
  'Predecessorforventningen skal forsegles mod den urørte historiske kilde før diagnostic wrapper-copy');
const predecessorPreparationStart = workflow.indexOf(
  '- name: Prepare exact predecessor source for bounded binding migration',
);
const predecessorPreparationEnd = workflow.indexOf('\n      - name:', predecessorPreparationStart + 1);
const predecessorPreparation = workflow.slice(predecessorPreparationStart, predecessorPreparationEnd);
assert.ok(predecessorPreparation.includes('current-private-runtime-source.json'));
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

const pagesWorkflow = fs.readFileSync('.github/workflows/reusable-pages-deploy.yml', 'utf8');
for (const marker of [
  'code_only_repair:',
  'if: inputs.code_only_repair != true',
  '.providerRequestsPerformed == false',
  '.weatherValuesChanged == false',
  '.scoresChanged == false',
  '.geometryChanged == false',
  'id: integrated-historical-maintenance-complete',
  'id: failure-reconciliation',
  'if: always() && !cancelled()',
  'steps.integrated-historical-maintenance-complete.outcome',
  'steps.failure-reconciliation.outcome',
  'Begin code-only integrated maintenance after verified Pages deployment',
  "inputs.code_only_repair == true && inputs.operational_action == 'integrated-historical-maintenance' && steps.deployment.outcome == 'success' && steps.public-verification.outcome == 'success'",
  'source_repair_id:',
  '--known-source-repair-id',
  'Known public source repair artifact seal is not exact',
  '--source-deployment-id "$(cat "$RAVRADAR_OPERATIONAL_HANDOFF/source-deployment-id.txt")"',
]) assert.ok(pagesWorkflow.includes(marker), `Pages code-only-kontrakt mangler ${marker}`);
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
  '- name: Begin code-only integrated maintenance after verified Pages deployment',
);
assert.ok(preDeployHistoricalBegin >= 0 && preDeployHistoricalBegin < pagesDeploy);
assert.ok(codeOnlyHistoricalBegin > pagesDeploy,
  'Code-only central bookkeeping must start only after the safe Pages attempt');
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
  current: centralSource,
  publicManifest: Object.freeze({ ...sourceManifest, datasetId: 'unknown-drift' }),
}), /ahead of central state without an exact repair policy/);
assert.throws(() => resolveCodeOnlyPublicSource({
  current: { ...centralSource, status: 'INTEGRATED_PENDING' },
  publicManifest: sourceManifest,
}), /not an exact active integrated deployment/);

console.log('Code-only public runtime reuse contract passed.');
