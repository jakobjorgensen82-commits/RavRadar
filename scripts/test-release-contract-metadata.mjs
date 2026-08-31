#!/usr/bin/env node

import assert from 'node:assert/strict';
import fs from 'node:fs/promises';

import {
  PRODUCTION_OUTCOME_SCHEMA_VERSION,
  PRODUCTION_OUTCOME_TERMINALS,
  RELEASE_CONTRACT_SCHEMA_VERSION,
  assertReleaseContractMetadata,
  buildReleaseContractMetadata,
} from './lib/release-contract-metadata.mjs';
import { PRODUCTION_WORKFLOW_SOURCES } from './lib/production-workflow-sources.mjs';
import { synchronizeReleaseContractMetadata } from './sync-release-contract-metadata.mjs';

const versionDocument = JSON.parse(await fs.readFile('version.json', 'utf8'));
const expected = buildReleaseContractMetadata({ releaseVersion: versionDocument.version });

assert.equal(assertReleaseContractMetadata(versionDocument.releaseContract, {
  releaseVersion: versionDocument.version,
}), true);
assert.deepEqual(versionDocument.releaseContract, expected);
assert.deepEqual(Object.keys(expected).sort(), [
  'documentation',
  'modelBindings',
  'privatePayloadIncluded',
  'productionOutcome',
  'publicManifestAuthority',
  'releaseVersion',
  'schemaVersion',
  'workflowRoles',
]);
assert.deepEqual(Object.keys(expected.modelBindings).sort(), [
  'candidateGRollback',
  'integrated',
]);
assert.deepEqual(Object.keys(expected.publicManifestAuthority).sort(), [
  'modelBindingJsonPointer',
  'path',
]);
assert.equal(expected.schemaVersion, RELEASE_CONTRACT_SCHEMA_VERSION);
assert.equal(expected.releaseVersion, versionDocument.version);
assert.deepEqual(expected.workflowRoles, PRODUCTION_WORKFLOW_SOURCES);
assert.equal(expected.publicManifestAuthority.path, 'data/live/manifest.json');
assert.equal(expected.publicManifestAuthority.modelBindingJsonPointer, '/ravScoreModelBinding');
assert.equal(expected.productionOutcome.schemaVersion, PRODUCTION_OUTCOME_SCHEMA_VERSION);
assert.deepEqual(expected.productionOutcome.terminals, PRODUCTION_OUTCOME_TERMINALS);
assert.equal(expected.privatePayloadIncluded, false);

for (const [label, binding] of Object.entries(expected.modelBindings)) {
  assert.equal(Object.keys(binding).length, 11, `${label} must keep the exact eleven-field binding`);
  assert.match(binding.modelContractSha256, /^[a-f0-9]{64}$/);
  assert.match(binding.modelBundleSha256, /^[a-f0-9]{64}$/);
}
assert.equal(
  expected.modelBindings.candidateGRollback.modelBundleSha256,
  'dcbd8d72aa9794dc7dc24eae52f23d25914af61a49c5fcd73742818f4ca77bb4',
);

const documentationPaths = [
  ...Object.values(expected.documentation.handbooks),
  expected.documentation.producerConsumerMatrix,
  ...expected.documentation.decisionReferences.map(reference => reference.path),
];
for (const documentationPath of documentationPaths) {
  assert.equal(
    await fs.stat(documentationPath).then(stat => stat.isFile(), () => false),
    true,
    `Release contract documentation path is missing: ${documentationPath}`,
  );
}

const forbiddenDynamicOrPrivateKeys = new Set([
  'activeModel',
  'activeModelId',
  'adminState',
  'datasetId',
  'deployedAt',
  'deploymentId',
  'generatedAt',
  'runAttempt',
  'runId',
]);
const inspectKeys = value => {
  if (!value || typeof value !== 'object') return;
  for (const [key, child] of Object.entries(value)) {
    assert.equal(forbiddenDynamicOrPrivateKeys.has(key), false, `Forbidden release metadata key: ${key}`);
    inspectKeys(child);
  }
};
inspectKeys(expected);
assert.doesNotMatch(JSON.stringify(expected), /coordinates|credentials|raw[_ -]?[uv]|privatePayload\s*:\s*true/i);

const first = JSON.stringify(buildReleaseContractMetadata({ releaseVersion: versionDocument.version }));
const second = JSON.stringify(buildReleaseContractMetadata({ releaseVersion: versionDocument.version }));
assert.equal(first, second, 'Release contract generation must be deterministic');
assert.equal(Object.isFrozen(expected), true);
assert.equal(Object.isFrozen(expected.modelBindings.integrated), true);

const forged = structuredClone(expected);
forged.modelBindings.integrated.modelBundleSha256 = 'f'.repeat(64);
assert.throws(
  () => assertReleaseContractMetadata(forged, { releaseVersion: versionDocument.version }),
  /stale or structurally incompatible/,
);
assert.throws(
  () => buildReleaseContractMetadata({
    releaseVersion: versionDocument.version,
    workflowSources: { ...PRODUCTION_WORKFLOW_SOURCES, unexpected: 'forbidden.yml' },
  }),
  /incompatible exact key set/,
);

const verification = await synchronizeReleaseContractMetadata();
assert.deepEqual(verification.changed, []);
assert.deepEqual(verification.releaseContract, expected);

console.log('OK: deterministic releaseContract v1 centralizes static model, workflow, outcome and documentation bindings without runtime or private state.');
