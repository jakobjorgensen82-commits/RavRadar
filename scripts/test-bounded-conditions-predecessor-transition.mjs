#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import {
  BOUNDED_CONDITIONS_PREDECESSOR_POLICY,
  buildBoundedConditionsPredecessorRestoreExpectation,
} from './lib/bounded-conditions-predecessor-transition.mjs';
import {
  prepareHistoricalWavePredecessorRestore,
} from './prepare-historical-wave-predecessor-restore.mjs';

function fixture() {
  return {
    sourceDescription: {
      schemaVersion:
        BOUNDED_CONDITIONS_PREDECESSOR_POLICY.sourceDescriptionSchemaVersion,
      kind: BOUNDED_CONDITIONS_PREDECESSOR_POLICY.sourceDescriptionKind,
      sourceHead: BOUNDED_CONDITIONS_PREDECESSOR_POLICY.sourceHead,
      datasetId: 'rr-bounded-conditions-predecessor-test',
      bundleContentSha256:
        BOUNDED_CONDITIONS_PREDECESSOR_POLICY.sourceBundleContentSha256,
      productionReferenceAt: '2026-09-19T17:00:00.000Z',
      generatedAt: '2026-09-19T17:10:00.000Z',
      modelBinding: structuredClone(
        BOUNDED_CONDITIONS_PREDECESSOR_POLICY.sourceModelBinding,
      ),
      contractHashes: structuredClone(
        BOUNDED_CONDITIONS_PREDECESSOR_POLICY.sourceContractHashes,
      ),
      expectedZoneCount: 210,
      expectedPartCount: 673,
      privatePayloadIncluded: false,
    },
    // Production workflow output intentionally uses the canonical no-millis form.
    targetReferenceAt: '2026-09-19T18:00:00Z',
    // This test exercises the one-time predecessor transition itself.  Its
    // target is the exact sealed predecessor successor binding, not whichever
    // active model bundle happens to be current in a later release.
    currentBinding: structuredClone(
      BOUNDED_CONDITIONS_PREDECESSOR_POLICY.targetModelBinding,
    ),
    now: '2026-09-19T18:05:00.000Z',
  };
}

// The transition test models the exact one-time handoff contract.  It must
// not silently change meaning when the active release later gets a new
// continuation or public-projection hash; those are separate releases, while
// this fixture needs the predecessor's continuation and the successor's
// changed full-runtime hash.
const currentContractHashes = {
  ...structuredClone(BOUNDED_CONDITIONS_PREDECESSOR_POLICY.sourceContractHashes),
  fullRuntimeContractSha256: 'f'.repeat(64),
  publicProjectionContractSha256:
    BOUNDED_CONDITIONS_PREDECESSOR_POLICY.targetPublicProjectionContractSha256,
};
const valid = fixture();
const expectation = buildBoundedConditionsPredecessorRestoreExpectation({
  ...valid,
  currentContractHashes,
});
assert.equal(expectation.datasetId, valid.sourceDescription.datasetId);
assert.deepEqual(expectation.contractHashes,
  BOUNDED_CONDITIONS_PREDECESSOR_POLICY.sourceContractHashes);
assert.equal(expectation.productionReferenceAt,
  valid.sourceDescription.productionReferenceAt);
assert.equal(expectation.targetReferenceAt, '2026-09-19T18:00:00.000Z');

for (const mutate of [
  value => { value.sourceDescription.sourceHead = 'a'.repeat(40); },
  value => { value.sourceDescription.bundleContentSha256 = 'b'.repeat(64); },
  value => { value.sourceDescription.contractHashes.fullRuntimeContractSha256 = 'c'.repeat(64); },
  value => { value.sourceDescription.expectedPartCount = 672; },
  value => { value.sourceDescription.privatePayloadIncluded = true; },
  value => { value.sourceDescription.modelBinding.modelBundleSha256 = 'e'.repeat(64); },
  value => { value.currentBinding.modelBundleSha256 = 'd'.repeat(64); },
]) {
  const changed = fixture();
  mutate(changed);
  assert.equal(buildBoundedConditionsPredecessorRestoreExpectation({
    ...changed,
    currentContractHashes,
  }), null);
}

assert.throws(() => buildBoundedConditionsPredecessorRestoreExpectation({
  ...fixture(),
  targetReferenceAt: '2026-09-19T17:00:00.000Z',
  currentContractHashes,
}), /genuinely newer/);
for (const targetReferenceAt of [
  '2026-02-30T18:00:00Z',
  '2026-09-19T18:00:00.001Z',
]) assert.throws(() => buildBoundedConditionsPredecessorRestoreExpectation({
  ...fixture(),
  targetReferenceAt,
  currentContractHashes,
}), /canonical exact UTC hour/);

const unchangedContracts = structuredClone(
  BOUNDED_CONDITIONS_PREDECESSOR_POLICY.sourceContractHashes,
);
assert.equal(buildBoundedConditionsPredecessorRestoreExpectation({
  ...fixture(),
  currentContractHashes: unchangedContracts,
}), null);

const wrongTargetProjection = structuredClone(currentContractHashes);
wrongTargetProjection.publicProjectionContractSha256 = 'f'.repeat(64);
assert.equal(buildBoundedConditionsPredecessorRestoreExpectation({
  ...fixture(),
  currentContractHashes: wrongTargetProjection,
}), null);

assert.equal(JSON.stringify(expectation).includes('weatherComponentInputs'), false);

const [workflowSource, privateWorkflowSource] = await Promise.all([
  fs.readFile('.github/workflows/reusable-weather-build.yml', 'utf8'),
  fs.readFile('scripts/private-production-runtime-workflow.mjs', 'utf8'),
]);
const readerStart = workflowSource.indexOf(
  'Materialize the exact audited predecessor reader before old-reader secret use',
);
const readerEnd = workflowSource.indexOf(
  'Restore newest compatible private runtime from protected storage',
  readerStart,
);
const readerBlock = workflowSource.slice(readerStart, readerEnd);
assert.ok(readerBlock.includes(BOUNDED_CONDITIONS_PREDECESSOR_POLICY.sourceHead));
assert.match(readerBlock, /Unapproved private-runtime predecessor source/);
assert.ok(privateWorkflowSource.includes(
  "'scripts/lib/bounded-conditions-predecessor-transition.mjs'",
));
const restoreAt = workflowSource.indexOf(
  'Verify and restore the private production runtime bundle',
);
const rebindAt = workflowSource.indexOf(
  'Rebind the exact bounded-conditions predecessor before installation',
);
const installAt = workflowSource.indexOf(
  'Install only the allowlisted restored private runtime files',
);
const historicalClassifierAt = workflowSource.indexOf(
  'Classify the measured one-time historical wave-input transition',
);
assert.ok(restoreAt >= 0 && rebindAt > restoreAt && installAt > rebindAt
  && historicalClassifierAt > installAt,
'The bounded predecessor must be restored, rebound and only then installed.');
const rebindBlock = workflowSource.slice(rebindAt, installAt);
for (const marker of [
  "steps.historical-wave-predecessor.outputs.transition_kind == 'bounded-conditions-writer'",
  'NODE_OPTIONS: --max-old-space-size=6144',
  'node scripts/migrate-post-cutover-private-runtime.mjs',
  '--source "$RAVRADAR_PRIVATE_RUNTIME_RESTORE"',
  '--bundle-manifest "$RAVRADAR_PRIVATE_RUNTIME_BUNDLE/manifest.json"',
  '--predecessor-descriptor "$RUNNER_TEMP/private-runtime-current-source.json"',
  '--predecessor-root "$RAVRADAR_HISTORICAL_WAVE_SOURCE_ROOT"',
  '--expected-source-head "$EXPECTED_SOURCE_HEAD"',
  'echo "restored_path=$migrated_root" >> "$GITHUB_OUTPUT"',
]) assert.ok(rebindBlock.includes(marker),
  `The bounded predecessor rebind is missing ${marker}.`);
const installBlock = workflowSource.slice(installAt, historicalClassifierAt);
for (const marker of [
  'PREDECESSOR_TRANSITION_KIND:',
  'MIGRATED_RUNTIME_ROOT:',
  'test "$PREDECESSOR_TRANSITION_KIND" = "bounded-conditions-writer"',
  'test -n "$MIGRATED_RUNTIME_ROOT"',
  'restored_root="$MIGRATED_RUNTIME_ROOT"',
  '--restored "$restored_root"',
]) assert.ok(installBlock.includes(marker),
  `The bounded predecessor install is missing ${marker}.`);
const historicalClassifierBlock = workflowSource.slice(
  historicalClassifierAt,
  workflowSource.indexOf('\n      - name:', historicalClassifierAt + 1),
);
assert.ok(historicalClassifierBlock.includes(
  "steps.historical-wave-predecessor.outputs.transition_kind == 'historical-wave-input'",
));

const temporary = await fs.mkdtemp(path.join(os.tmpdir(), 'rr-bounded-predecessor-'));
try {
  const sourceDescriptionPath = path.join(temporary, 'source.json');
  const outputPath = path.join(temporary, 'expected.json');
  const githubOutputPath = path.join(temporary, 'github-output.txt');
  await fs.writeFile(sourceDescriptionPath,
    `${JSON.stringify(valid.sourceDescription)}\n`);
  await fs.writeFile(githubOutputPath, '');
  const prepared = await prepareHistoricalWavePredecessorRestore({
    sourceDescriptionPath,
    targetReferenceAt: valid.targetReferenceAt,
    outputPath,
    githubOutputPath,
    now: valid.now,
  });
  const githubOutput = await fs.readFile(githubOutputPath, 'utf8');
  // The synthetic builder above still proves the historical handoff contract.
  // The real preparation helper must now retire it because the active release
  // has a newer model/continuation binding; it must not resurrect the old
  // predecessor during ordinary operation.
  assert.equal(prepared.required, false);
  assert.equal(prepared.transitionKind, null);
  await assert.rejects(fs.access(outputPath), { code: 'ENOENT' });
  assert.match(githubOutput, /required=false/);
  assert.match(githubOutput, /source_head=\n/);
  assert.match(githubOutput, /transition_kind=\n/);

  // The bridge retires from source identity, not from a calendar/version tick:
  // once the protected pointer no longer names the exact sealed predecessor,
  // the same current code must refuse to create a restore expectation.
  const supersededSource = structuredClone(valid.sourceDescription);
  supersededSource.sourceHead = 'a'.repeat(40);
  await fs.writeFile(sourceDescriptionPath,
    `${JSON.stringify(supersededSource)}\n`);
  await fs.writeFile(githubOutputPath, '');
  await fs.rm(outputPath, { force: true });
  const retired = await prepareHistoricalWavePredecessorRestore({
    sourceDescriptionPath,
    targetReferenceAt: valid.targetReferenceAt,
    outputPath,
    githubOutputPath,
    now: valid.now,
  });
  const retiredOutput = await fs.readFile(githubOutputPath, 'utf8');
  assert.equal(retired.required, false);
  assert.equal(retired.transitionKind, null);
  await assert.rejects(fs.access(outputPath), { code: 'ENOENT' });
  assert.match(retiredOutput, /required=false/);
  assert.match(retiredOutput, /source_head=\n/);
  assert.match(retiredOutput, /transition_kind=\n/);
} finally {
  await fs.rm(temporary, { recursive: true, force: true });
}

console.log('Bounded conditions predecessor transition: 38 focused cases and source-identity retirement passed.');
