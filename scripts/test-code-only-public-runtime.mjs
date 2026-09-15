#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  assertCodeOnlyModelBinding,
  assertZoneRegistryVersionOnly,
  CODE_ONLY_MAXIMUM_PUBLIC_DETAILS_BYTES,
  CODE_ONLY_SNAPSHOT_FILES,
  manifestBoundedPublicDetailsBytes,
  normalizeCodeOnlyProjection,
} from './prepare-code-only-public-runtime.mjs';
import { ravScoreModelBinding } from '../js/core/ravscore-model-contract.js';

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
  'recover-missed-initial-cutover',
  'ravscore-operational-recovery-34877443841-1',
  'Freshly verify the exact historical integrated artifact is still public',
  'Atomically record the exact already-public historical cutover',
  'if has($field) then .[$field] else "" end',
  'Prove the current-compatible runtime is no longer client-readable',
  'Add payload-free rejection codes to the exact predecessor restore',
  'Prove the saved predecessor runtime is no longer client-readable',
  'for attempt in 1 2 3; do',
  'if node "$RAVRADAR_PREDECESSOR_SOURCE_ROOT/scripts/protected-private-production-runtime.mjs" --restore',
  'Protected predecessor restore attempt $attempt of 3 failed.',
  'code_only_repair: true',
]) assert.ok(workflow.includes(marker), `Code-only-workflow mangler ${marker}`);
assert.match(workflow,
  /Prove the current-compatible runtime is no longer client-readable[\s\S]{0,180}if: steps\.current-private-install\.outcome == 'success'[\s\S]{0,220}--audit-anon/,
  'Den direkte current-runtimevej skal bevise privacy før den må fortsætte');
assert.ok(workflow.indexOf('Build exact predecessor private-runtime expectation')
  < workflow.indexOf('Add payload-free rejection codes to the exact predecessor restore'),
  'Predecessorforventningen skal forsegles mod den urørte historiske kilde før diagnostic wrapper-copy');
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
]) assert.ok(pagesWorkflow.includes(marker), `Pages code-only-kontrakt mangler ${marker}`);
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

console.log('Code-only public runtime reuse contract passed.');
