#!/usr/bin/env node

import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import {
  PRODUCTION_OUTCOME_SCHEMA_VERSION,
  PRODUCTION_OUTCOME_TERMINALS,
  RELEASE_CONTRACT_SCHEMA_VERSION,
  assertReleaseContractMetadata,
  buildReleaseContractMetadata,
} from './lib/release-contract-metadata.mjs';
import { PRODUCTION_WORKFLOW_SOURCES } from './lib/production-workflow-sources.mjs';
import {
  RAVSCORE_CONTINUATION_IMPLEMENTATION_FILES,
  ravScoreContinuationImplementationSha256,
} from './lib/ravscore-continuation-implementation-contract.mjs';
import { synchronizeRavScoreModelBinding } from './sync-ravscore-model-binding.mjs';
import { synchronizeReleaseContractMetadata } from './sync-release-contract-metadata.mjs';

const REPOSITORY_ROOT = path.resolve('.');
const CHECKPOINT_MIGRATION_PATH =
  'supabase/migrations/20260903010000_ravscore_checkpoint_metadata_cas.sql';
const HISTORICAL_TRIP_MIGRATION_PATH =
  'supabase/migrations/20260901010000_integrated_trip_measured_warmup_admission.sql';
const CHECKPOINT_OUTER_BEGIN = '-- RAVSCORE_CHECKPOINT_METADATA_CAS_GENERATED_BEGIN';
const CHECKPOINT_OUTER_END = '-- RAVSCORE_CHECKPOINT_METADATA_CAS_GENERATED_END';
const CHECKPOINT_CONTINUATION_HASH =
  await ravScoreContinuationImplementationSha256();
const SYNC_WRITABLE_PATHS = Object.freeze([
  'knowledge/rav-assistant-public-v1.json',
  'scripts/fixtures/rav-assistant-evals-v1.json',
  'version.json',
  'data/admin/ravscore-profile-selection.json',
  'supabase/functions/_shared/rav-assistant-contract.ts',
  'supabase/schema.sql',
  'supabase/INSTALL-RAVRADAR-4.0.56-SECURITY.sql',
]);
const SYNC_MIGRATION_PATHS = Object.freeze([
  HISTORICAL_TRIP_MIGRATION_PATH,
  CHECKPOINT_MIGRATION_PATH,
]);

function checkpointOuterBlock(source, label) {
  const normalized = source.replace(/\r\n?/g, '\n');
  const start = normalized.indexOf(CHECKPOINT_OUTER_BEGIN);
  const end = normalized.indexOf(CHECKPOINT_OUTER_END);
  assert.notEqual(start, -1, `${label} must contain the checkpoint outer BEGIN marker`);
  assert.notEqual(end, -1, `${label} must contain the checkpoint outer END marker`);
  assert.equal(normalized.indexOf(CHECKPOINT_OUTER_BEGIN, start + 1), -1);
  assert.equal(normalized.indexOf(CHECKPOINT_OUTER_END, end + 1), -1);
  assert.ok(end > start, `${label} checkpoint outer markers must be ordered`);
  return normalized.slice(start, end + CHECKPOINT_OUTER_END.length);
}

async function copyFixtureFile(root, relative) {
  const destination = path.join(root, relative);
  await fs.mkdir(path.dirname(destination), { recursive: true });
  await fs.copyFile(path.join(REPOSITORY_ROOT, relative), destination);
}

async function createModelBindingSyncFixture({ migrationTransform = value => value } = {}) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'ravradar-model-binding-sync-'));
  try {
    const fixturePaths = new Set([
      ...SYNC_WRITABLE_PATHS,
      ...SYNC_MIGRATION_PATHS,
      ...RAVSCORE_CONTINUATION_IMPLEMENTATION_FILES,
    ]);
    for (const relative of fixturePaths) await copyFixtureFile(root, relative);

    const canonicalMigration = await fs.readFile(
      path.join(root, CHECKPOINT_MIGRATION_PATH),
      'utf8',
    );
    const canonicalBlock = checkpointOuterBlock(canonicalMigration, CHECKPOINT_MIGRATION_PATH);
    for (const relative of [
      'supabase/schema.sql',
      'supabase/INSTALL-RAVRADAR-4.0.56-SECURITY.sql',
    ]) {
      const destination = path.join(root, relative);
      const sql = await fs.readFile(destination, 'utf8');
      const hasBegin = sql.includes(CHECKPOINT_OUTER_BEGIN);
      const hasEnd = sql.includes(CHECKPOINT_OUTER_END);
      assert.equal(hasBegin, hasEnd, `${relative} has a partial checkpoint outer block`);
      if (!hasBegin) {
        await fs.writeFile(destination, `${sql.trimEnd()}\n\n${canonicalBlock}\n`, 'utf8');
      }
    }

    const driftPath = path.join(root, 'knowledge/rav-assistant-public-v1.json');
    const driftDocument = JSON.parse(await fs.readFile(driftPath, 'utf8'));
    driftDocument.ravScoreModelBinding.modelBundleSha256 = '0'.repeat(64);
    await fs.writeFile(driftPath, `${JSON.stringify(driftDocument, null, 2)}\n`, 'utf8');

    await fs.writeFile(
      path.join(root, CHECKPOINT_MIGRATION_PATH),
      migrationTransform(canonicalMigration),
      'utf8',
    );
    return root;
  } catch (error) {
    await fs.rm(root, { recursive: true, force: true });
    throw error;
  }
}

async function snapshotFixturePaths(root, relativePaths) {
  return new Map(await Promise.all(relativePaths.map(async relative => [
    relative,
    await fs.readFile(path.join(root, relative)),
  ])));
}

async function assertFixturePathsUnchanged(root, snapshot) {
  for (const [relative, expectedBytes] of snapshot) {
    const actualBytes = await fs.readFile(path.join(root, relative));
    assert.deepEqual(actualBytes, expectedBytes, `${relative} changed despite failed prevalidation`);
  }
}

async function removeModelBindingSyncFixture(root) {
  assert.equal(
    path.dirname(path.resolve(root)),
    path.resolve(os.tmpdir()),
    'model-binding test cleanup must stay directly inside the system temp directory',
  );
  await fs.rm(root, { recursive: true, force: true });
}

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
  '7c7f2b4950b4ce7a04d560dde15dd93e408e045ca5e9ed4f9be33eac0255e89d',
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

{
  const root = await createModelBindingSyncFixture();
  try {
    const migrationBefore = await snapshotFixturePaths(root, SYNC_MIGRATION_PATHS);
    const synchronization = await synchronizeRavScoreModelBinding({ write: true, root });
    assert.equal(
      synchronization.changed.some(relative => relative.startsWith('supabase/migrations/')),
      false,
      'historical migrations must never enter the model-binding changed set',
    );
    assert.deepEqual(
      synchronization.changed.filter(relative => relative.startsWith('supabase/')),
      [
        'supabase/functions/_shared/rav-assistant-contract.ts',
        'supabase/schema.sql',
        'supabase/INSTALL-RAVRADAR-4.0.56-SECURITY.sql',
      ],
    );
    await assertFixturePathsUnchanged(root, migrationBefore);

    const canonicalBlock = checkpointOuterBlock(
      await fs.readFile(path.join(root, CHECKPOINT_MIGRATION_PATH), 'utf8'),
      CHECKPOINT_MIGRATION_PATH,
    );
    for (const relative of [
      'supabase/schema.sql',
      'supabase/INSTALL-RAVRADAR-4.0.56-SECURITY.sql',
    ]) {
      assert.equal(
        checkpointOuterBlock(await fs.readFile(path.join(root, relative), 'utf8'), relative),
        canonicalBlock,
        `${relative} must receive the exact canonical migration outer block`,
      );
    }
    const postWriteVerification = await synchronizeRavScoreModelBinding({ root });
    assert.deepEqual(postWriteVerification.changed, []);
  } finally {
    await removeModelBindingSyncFixture(root);
  }
}

const migrationFailureCases = [
  {
    label: 'missing inner marker',
    transform: source => source.replace(
      '-- RAVSCORE_CHECKPOINT_INTEGRATED_STATE_BINDING_GENERATED_BEGIN',
      '-- RAVSCORE_CHECKPOINT_INTEGRATED_STATE_BINDING_GENERATED_MISSING',
    ),
    error: /exact generated binding markers are missing or duplicated/,
  },
  {
    label: 'duplicate inner marker',
    transform: source => source.replace(
      '-- RAVSCORE_CHECKPOINT_CANDIDATE_STATE_BINDING_GENERATED_BEGIN',
      '-- RAVSCORE_CHECKPOINT_CANDIDATE_STATE_BINDING_GENERATED_BEGIN\n'
        + '    -- RAVSCORE_CHECKPOINT_CANDIDATE_STATE_BINDING_GENERATED_BEGIN',
    ),
    error: /exact generated binding markers are missing or duplicated/,
  },
  {
    label: 'drifted Candidate G state binding',
    transform: source => source.replace(
      /(\-\- RAVSCORE_CHECKPOINT_CANDIDATE_STATE_BINDING_GENERATED_BEGIN[\s\S]*?is distinct from ')RRS-CANDIDATE-G-CURRENT-LED-WAVE-MOBILISATION-RESEARCH-3(?='[\s\S]*?\-\- RAVSCORE_CHECKPOINT_CANDIDATE_STATE_BINDING_GENERATED_END)/,
      '$1RRS-CANDIDATE-G-CURRENT-LED-WAVE-MOBILISATION-FORGED',
    ),
    error: /Candidate G state binding: exact state binding fields or values drifted/,
  },
  {
    label: 'drifted continuation implementation hash',
    transform: source => source.replace(CHECKPOINT_CONTINUATION_HASH, 'f'.repeat(64)),
    error: /continuation-state contract hash drifted/,
  },
];

for (const failureCase of migrationFailureCases) {
  const root = await createModelBindingSyncFixture({ migrationTransform: failureCase.transform });
  try {
    const before = await snapshotFixturePaths(root, [
      ...SYNC_WRITABLE_PATHS,
      ...SYNC_MIGRATION_PATHS,
    ]);
    await assert.rejects(
      synchronizeRavScoreModelBinding({ write: true, root }),
      failureCase.error,
      `${failureCase.label} must fail closed before --write changes any file`,
    );
    await assertFixturePathsUnchanged(root, before);
  } finally {
    await removeModelBindingSyncFixture(root);
  }
}

{
  const root = await createModelBindingSyncFixture();
  try {
    const schemaPath = path.join(root, 'supabase/schema.sql');
    const schema = (await fs.readFile(schemaPath, 'utf8')).replace(/\r\n?/g, '\n');
    const outerBlock = checkpointOuterBlock(schema, 'supabase/schema.sql');
    await fs.writeFile(schemaPath, schema.replace(outerBlock, ''), 'utf8');
    const before = await snapshotFixturePaths(root, [
      ...SYNC_WRITABLE_PATHS,
      ...SYNC_MIGRATION_PATHS,
    ]);
    await assert.rejects(
      synchronizeRavScoreModelBinding({ write: true, root }),
      /supabase\/schema\.sql checkpoint metadata CAS: exact generated binding markers are missing or duplicated/,
      'a missing schema outer block must fail closed before --write changes any file',
    );
    await assertFixturePathsUnchanged(root, before);
  } finally {
    await removeModelBindingSyncFixture(root);
  }
}

console.log('OK: deterministic releaseContract v1 and immutable-migration model-binding sync remain fail-closed without runtime or private state.');
