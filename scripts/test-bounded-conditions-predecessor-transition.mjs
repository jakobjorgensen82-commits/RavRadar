#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import {
  BOUNDED_CONDITIONS_PREDECESSOR_POLICY,
  buildBoundedConditionsPredecessorRestoreExpectation,
  buildOwnerCurrentOriginalRestoreExpectation,
  assertOwnerCurrentOriginalExpectation,
  OWNER_CURRENT_DOMAIN_PREDECESSOR,
  OWNER_CURRENT_DOMAIN_SUCCESSOR,
  OWNER_WATER_LEVEL_ONLY_PREDECESSOR,
  OWNER_WATER_LEVEL_ONLY_SUCCESSOR,
} from './lib/bounded-conditions-predecessor-transition.mjs';
import {
  prepareHistoricalWavePredecessorRestore,
} from './prepare-historical-wave-predecessor-restore.mjs';
import { secondRestoreExpectation } from './private-runtime-second-restore-expectation.mjs';

const ownerOriginal = OWNER_CURRENT_DOMAIN_PREDECESSOR;
const ownerFixture = () => ({
  sourceDescription: { ...structuredClone(ownerOriginal), schemaVersion: '1.0.0',
    kind: 'RAVRADAR_PRIVATE_PRODUCTION_RUNTIME_CURRENT_SOURCE',
    expectedZoneCount: 210, expectedPartCount: 673, privatePayloadIncluded: false },
  targetReferenceAt: '2026-10-04T16:00:00Z',
  currentBinding: { ...ownerOriginal.modelBinding, modelBundleSha256: OWNER_CURRENT_DOMAIN_SUCCESSOR.integratedBundleSha256 },
  currentContractHashes: { ...ownerOriginal.contractHashes,
    continuationStateContractSha256: OWNER_CURRENT_DOMAIN_SUCCESSOR.continuationStateContractSha256 },
  now: '2026-10-04T18:00:00.000Z',
});
const ownerExpected = buildOwnerCurrentOriginalRestoreExpectation(ownerFixture());
assert.deepEqual(ownerExpected.modelBinding, ownerOriginal.modelBinding);
assert.equal(ownerExpected.bundleContentSha256, ownerOriginal.bundleContentSha256);
assert.equal(ownerExpected.targetReferenceAt, '2026-10-04T16:00:00.000Z');
assert.equal(assertOwnerCurrentOriginalExpectation(ownerExpected), ownerOriginal);
const ownerSource = ownerFixture().sourceDescription;
assert.equal(secondRestoreExpectation({ expected: ownerExpected,
  source: ownerSource, manifest: ownerOriginal }), ownerExpected);
// Separate released542 original: never reuse the 541 archive's identity.
const waterOriginal=OWNER_WATER_LEVEL_ONLY_PREDECESSOR;
// The real normal 542 generation completed before this technical release.
// Its exact original replaces the older same-binding code-only generation;
// the separate 541 original and its archived states must stay unchanged.
assert.equal(waterOriginal.datasetId,'rr-20261005020412-210');
assert.equal(waterOriginal.productionReferenceAt,'2026-10-05T00:00:00.000Z');
assert.equal(waterOriginal.generatedAt,'2026-10-05T02:04:12.334Z');
assert.equal(waterOriginal.bundleContentSha256,'9e17b4bc1c785ba0910e2b8b1b66bd55529c49d580b59303cae5f6a0260659da');
const waterFixture=()=>({ ...ownerFixture(),
  targetReferenceAt:waterOriginal.productionReferenceAt,
  now:'2026-10-05T03:23:00.000Z',
  sourceDescription:{ ...structuredClone(waterOriginal),schemaVersion:'1.0.0',
    kind:'RAVRADAR_PRIVATE_PRODUCTION_RUNTIME_CURRENT_SOURCE',
    expectedZoneCount:210,expectedPartCount:673,privatePayloadIncluded:false },
  currentBinding:{ ...waterOriginal.modelBinding,
    modelBundleSha256:OWNER_WATER_LEVEL_ONLY_SUCCESSOR.integratedBundleSha256 },
  currentContractHashes:{ ...waterOriginal.contractHashes,
    continuationStateContractSha256:OWNER_WATER_LEVEL_ONLY_SUCCESSOR.continuationStateContractSha256 },
});
const waterExpected=buildOwnerCurrentOriginalRestoreExpectation(waterFixture());
assert.equal(waterExpected.ownerCurrentDomainTransition,'EXACT_WATER_LEVEL_ONLY_RESTORE_V1');
assert.equal(assertOwnerCurrentOriginalExpectation(waterExpected),waterOriginal);
assert.deepEqual(waterExpected.modelBinding,waterOriginal.modelBinding);
assert.equal(secondRestoreExpectation({expected:waterExpected,
  source:waterFixture().sourceDescription,manifest:waterOriginal}),waterExpected);
const olderWaterFixture=waterFixture();
Object.assign(olderWaterFixture.sourceDescription,{
  datasetId:'rr-20261004172305-210',
  productionReferenceAt:'2026-10-04T16:00:00.000Z',
  generatedAt:'2026-10-04T17:23:05.647Z',
  bundleContentSha256:'2ad59b53ef09fdb8204565b8d7afa2e0a7800200d12f638269d6a93dbf948d0b',
});
assert.equal(buildOwnerCurrentOriginalRestoreExpectation(olderWaterFixture),null,
  'An older authentic 542 generation cannot be relabelled as the current original.');
assert.throws(()=>buildOwnerCurrentOriginalRestoreExpectation({...waterFixture(),
  targetReferenceAt:'2026-10-04T16:00:00.000Z'}),/exact original expectation/);
for(const field of ['sourceHead','datasetId','productionReferenceAt','generatedAt','bundleContentSha256']) {
  const wrong=waterFixture();wrong.sourceDescription[field]='wrong';
  assert.equal(buildOwnerCurrentOriginalRestoreExpectation(wrong),null);
  assert.throws(()=>assertOwnerCurrentOriginalExpectation({...waterExpected,[field]:'wrong'}));
}
assert.throws(()=>assertOwnerCurrentOriginalExpectation({...waterExpected,
  ownerCurrentDomainTransition:'EXACT_ORIGINAL_RESTORE_V1'}),'A542 original must not become a541 original by relabelling.');
for(const mutate of [value=>{value.currentBinding.modelBundleSha256='e'.repeat(64);},
  value=>{value.currentContractHashes.continuationStateContractSha256='f'.repeat(64);},
  value=>{value.currentBinding.modelContractSha256='a'.repeat(64);}]) {
  const wrong=waterFixture();mutate(wrong);
  assert.equal(buildOwnerCurrentOriginalRestoreExpectation(wrong),null);
}
for (const mutate of [
  value => { value.sourceDescription.sourceHead = 'c'.repeat(40); },
  value => { value.sourceDescription.bundleContentSha256 = 'd'.repeat(64); },
  value => { value.sourceDescription.datasetId += '-other'; },
  value => { value.sourceDescription.expectedPartCount = 672; },
  value => { value.sourceDescription.privatePayloadIncluded = true; },
  value => { value.sourceDescription.modelBinding.modelBundleSha256 = 'e'.repeat(64); },
  value => { value.currentBinding.profileId = 'other-profile'; },
  value => { value.currentContractHashes.fullRuntimeContractSha256 = 'f'.repeat(64); },
  value => { value.currentContractHashes.publicProjectionContractSha256 = 'f'.repeat(64); },
]) {
  const changed = ownerFixture(); mutate(changed);
  assert.equal(buildOwnerCurrentOriginalRestoreExpectation(changed), null);
}
for (const field of ['ownerCurrentDomainTransition', 'sourceHead', 'datasetId',
  'generatedAt', 'productionReferenceAt', 'bundleContentSha256']) {
  assert.throws(() => assertOwnerCurrentOriginalExpectation({ ...ownerExpected, [field]: 'wrong' }));
}
assert.throws(() => buildOwnerCurrentOriginalRestoreExpectation({ ...ownerFixture(),
  targetReferenceAt: '2026-10-04T11:00:00.000Z' }));
assert.throws(() => secondRestoreExpectation({ expected: ownerExpected,
  source: { ...ownerSource, sourceHead: 'f'.repeat(40) }, manifest: ownerOriginal }));

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
const ownerPrepareAt = workflowSource.indexOf('Prepare exact old-reader restore for the measured wave transition');
const checkpointAt = workflowSource.indexOf('Restore the latest atomic schema-6 and Candidate G rollback checkpoint');
const ownerBridgeAt = workflowSource.indexOf('Preserve original pairs and rebind metadata before new-hour source reconstruction');
assert.ok(ownerPrepareAt >= 0 && checkpointAt > ownerPrepareAt && ownerBridgeAt > restoreAt,
  'Owner original must be fully authenticated before the current metadata/archive bridge');
const ownerBridgeBlock = workflowSource.slice(ownerBridgeAt,
  workflowSource.indexOf('\n      - name:', ownerBridgeAt + 1));
for (const marker of ['--owner-current-original', '--bundle-manifest',
  '--predecessor-descriptor', '--expected-source-head']) {
  assert.ok(ownerBridgeBlock.includes(marker), 'Actual owner bridge lacks ' + marker);
}
assert.ok(!ownerBridgeBlock.includes('--predecessor-root'),
  'Owner transition cannot import or evaluate an archived model body');
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
const codeOnlyWorkflow = await fs.readFile('.github/workflows/deploy-code-only-repair.yml', 'utf8');
function codeOnlyStep(name) {
  const start = codeOnlyWorkflow.indexOf('- name: ' + name);
  assert.ok(start >= 0, 'Missing actual controlled-release step: ' + name);
  const end = codeOnlyWorkflow.indexOf('\n      - name:', start + 1);
  return codeOnlyWorkflow.slice(start, end < 0 ? undefined : end);
}
const ownerReleasePrepare = codeOnlyStep('Prepare exact original binding for owner current-domain release');
assert.ok(ownerReleasePrepare.includes('--source-description "$RAVRADAR_OPERATIONAL_WORK/current-private-runtime-source.json"'));
assert.ok(ownerReleasePrepare.includes('--target-reference "$RAVRADAR_PRODUCTION_TARGET_HOUR"'));
assert.ok(codeOnlyWorkflow.indexOf(ownerReleasePrepare)
  < codeOnlyWorkflow.indexOf(codeOnlyStep('Try newest current-compatible private runtime')));
const ownerReleaseRestore = codeOnlyStep('Try newest current-compatible private runtime');
assert.ok(ownerReleaseRestore.includes('owner-current-domain-original'));
assert.ok(ownerReleaseRestore.includes('restore_expected="$RAVRADAR_PREDECESSOR_PRIVATE_ROOT/expected.json"'));
assert.ok(ownerReleaseRestore.includes('node scripts/protected-private-production-runtime.mjs --restore'));
const ownerReleaseVerify = codeOnlyStep('Try verifying current-compatible private runtime');
assert.ok(ownerReleaseVerify.includes('restore_output="$RAVRADAR_PREDECESSOR_PRIVATE_RESTORE"'));
assert.ok(ownerReleaseVerify.includes('node scripts/private-production-runtime-bundle.mjs restore'));
const ownerReleaseRequired = codeOnlyStep('Require authenticated exact original before owner binding migration');
assert.ok(ownerReleaseRequired.includes('steps.current-private-protected-restore.outcome'));
assert.ok(ownerReleaseRequired.includes('steps.current-private-bundle-restore.outcome'));
assert.ok(!ownerReleaseRequired.includes('continue-on-error'));
for (const name of [
  'Prepare exact predecessor source for bounded binding migration',
  'Build exact predecessor private-runtime expectation',
  'Install and import-check the exact predecessor restore compatibility closure',
  'Prove the saved predecessor runtime is no longer client-readable',
  'Restore exact predecessor private runtime',
  'Verify and unpack exact predecessor private runtime',
]) assert.ok(codeOnlyStep(name).includes("steps.owner-current-original.outputs.transition_kind != 'owner-current-domain-original'"),
  'Owner release must not materialize or evaluate the predecessor body: ' + name);
const ownerReleaseMigration = codeOnlyStep('Rebind saved private runtime to current source without changing measurements');
assert.ok(ownerReleaseMigration.includes('migration_args=(--owner-current-original)'));
assert.ok(ownerReleaseMigration.includes('--bundle-manifest "$RAVRADAR_PREDECESSOR_PRIVATE_BUNDLE/manifest.json"'));
assert.ok(ownerReleaseMigration.includes('--source "$RAVRADAR_PREDECESSOR_PRIVATE_RESTORE"'));
assert.ok(codeOnlyWorkflow.indexOf(ownerReleaseRequired) < codeOnlyWorkflow.indexOf(ownerReleaseMigration));
assert.ok(codeOnlyWorkflow.includes('MODEL_BINDING_METADATA_ONLY|OWNER_CURRENT_ORIGINAL_ARCHIVE_BRIDGE'));
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

console.log('Bounded conditions predecessor transition: exact historical and water-only originals, rejection controls and source-identity retirement passed.');

// One normal descriptor-routing/controlled-IO case. No authenticated B/S,
// archive payload, native DMI or public/production effect is proved here.
{
  const { pathToFileURL } = await import('node:url');
  const { createHash } = await import('node:crypto');
  const normalScriptUrl = relative => pathToFileURL(path.resolve('scripts', relative)).href;
  const [gridHelper, protectedRuntime, currentModel, candidateModel, privateWorkflow] = await Promise.all([
    import(normalScriptUrl('lib/bounded-conditions-predecessor-transition.mjs')),
    import(normalScriptUrl('protected-private-production-runtime.mjs')),
    import(pathToFileURL(path.resolve('js/core/ravscore-model-contract.js')).href),
    import(normalScriptUrl('rollback-assets/ravscore-model-contract.js')),
    import(normalScriptUrl('private-production-runtime-workflow.mjs')),
  ]);
  const { CURRENT_GRID_SAMPLING_PREDECESSOR_POLICY: gridPolicy,
    assertCurrentGridSamplingOriginalExpectation } = gridHelper;
  const { PROTECTED_PRIVATE_RUNTIME_POLICY: pointerPolicy,
    describeCurrentProtectedPrivateProductionRuntime,
    describeTargetProtectedPrivateProductionRuntime } = protectedRuntime;
  const clone = value => JSON.parse(JSON.stringify(value));
  const sha = value => createHash('sha256').update(value).digest('hex');

  // Exact existing controlled pointer transport from the protected-runtime target.
  function fakeDocuments() {
    let row = null;
    let loseNextPatch = false;
    let commitThenLoseNextPatch = false;
    return {
      request: async (suffix, options = {}) => {
        const method = options.method ?? 'GET';
        if (method === 'GET') return row ? [clone(row)] : [];
        if (method === 'POST') {
          if (row) return [];
          const body = JSON.parse(options.body);
          row = { document_key: body.document_key, payload: body.payload, version: 1 };
          return [clone(row)];
        }
        if (method === 'PATCH') {
          if (loseNextPatch) {
            loseNextPatch = false;
            return [];
          }
          const expectedVersion = Number(/version=eq\.(\d+)/.exec(suffix)?.[1]);
          if (!row || row.version !== expectedVersion) return [];
          row = { ...row, payload: JSON.parse(options.body).payload, version: row.version + 1 };
          if (commitThenLoseNextPatch) {
            commitThenLoseNextPatch = false;
            throw new Error('synthetic response lost after committed patch');
          }
          return [clone(row)];
        }
        throw new Error(`unexpected document method ${method}`);
      },
      row: () => clone(row),
      setRow: value => { row = clone(value); },
      losePatch: () => { loseNextPatch = true; },
      commitThenLosePatch: () => { commitThenLoseNextPatch = true; },
    };
  }
  const documents = fakeDocuments();
  const requestMethods = [];
  const request = async (suffix, options = {}, operation) => {
    requestMethods.push(options.method ?? 'GET');
    assert.equal(options.method ?? 'GET', 'GET', 'Descriptor caller attempted a write');
    return documents.request(suffix, options, operation);
  };
  const objectSha256 = sha('controlled-pointer-only-no-stored-object');
  const descriptor = {
    schemaVersion: pointerPolicy.schemaVersion,
    kind: pointerPolicy.descriptorKind,
    privacyClass: pointerPolicy.privacyClass,
    bucketId: pointerPolicy.bucketId,
    objectSha256, objectBytes: 1, objectCount: 1,
    objects: [{
      index: 0,
      objectPath: 'bundles/sha256/' + objectSha256
        + '/part-000-' + objectSha256 + '.json.gz.part',
      objectSha256, objectBytes: 1,
    }],
    bundleContentSha256: sha('controlled-descriptor-only-no-authenticated-bundle'),
    datasetId: 'rr-current-grid-descriptor-routing-test',
    productionReferenceAt: '2026-10-11T16:00:00.000Z',
    generatedAt: '2026-10-11T16:05:00.000Z',
    sourceHead: '7791d92e3368a715e3b68d9e76d460447a60f795',
    modelBinding: clone(gridPolicy.sourceModelBinding),
    contractHashes: clone(gridPolicy.sourceContractHashes),
  };
  documents.setRow({
    document_key: pointerPolicy.documentKey, version: 1,
    payload: {
      schemaVersion: pointerPolicy.schemaVersion, kind: pointerPolicy.pointerKind,
      current: descriptor, previous: null,
    },
  });
  const pointerBefore = JSON.stringify(documents.row());
  const current = await describeCurrentProtectedPrivateProductionRuntime({ request });
  assert.equal(current.kind, gridPolicy.sourceDescriptionKind);
  assert.equal(current.privatePayloadIncluded, false);
  assert.deepEqual(current.modelBinding, gridPolicy.sourceModelBinding);
  assert.deepEqual(current.contractHashes, gridPolicy.sourceContractHashes);

  // Actual generated globals and actual normal default contracts, no overrides.
  const integratedBinding = currentModel.ravScoreModelBinding();
  const candidateBinding = candidateModel.ravScoreModelBinding();
  const actualContracts = await privateWorkflow.privateRuntimeContractHashes();
  assert.equal(integratedBinding.modelBundleSha256,
    '5c3673a2fe7f4ddf4785ad993350107c048c7e5b051440baff5fef3ffb461ef4');
  assert.equal(candidateBinding.modelBundleSha256,
    'b166f4d27ce07d5b513c8beb6c5a0881878938d06a083a40e3c95240584a692b');
  assert.equal(actualContracts.continuationStateContractSha256,
    'dea864bfdbd02705e2029cbe9075b6aa12dec05ebe3eb8621f100205e8856546');
  assert.equal(actualContracts.fullRuntimeContractSha256,
    gridPolicy.sourceContractHashes.fullRuntimeContractSha256);
  assert.equal(actualContracts.publicProjectionContractSha256,
    gridPolicy.sourceContractHashes.publicProjectionContractSha256);

  const gridTemporaryPrefix = 'rr-current-grid-descriptor-';
  const gridTemporary = await fs.mkdtemp(path.join(os.tmpdir(), gridTemporaryPrefix));
  try {
    const sourceDescriptionPath = path.join(gridTemporary, 'current-source.json');
    const outputPath = path.join(gridTemporary, 'expected.json');
    const githubOutputPath = path.join(gridTemporary, 'github-output.txt');
    const now = '2026-10-11T17:10:00.000Z';
    await fs.writeFile(sourceDescriptionPath, JSON.stringify(current) + '\n', { flag: 'wx' });
    await fs.writeFile(githubOutputPath, '', { flag: 'wx' });
    const prepared = await prepareHistoricalWavePredecessorRestore({
      sourceDescriptionPath, outputPath, githubOutputPath,
      targetReferenceAt: '2026-10-11T17:00:00.000Z', now,
    });
    assert.deepEqual(prepared, {
      required: true, transitionKind: 'current-grid-sampling-original',
      privatePayloadIncluded: false,
    });
    const expectedText = await fs.readFile(outputPath, 'utf8');
    const gridExpected = JSON.parse(expectedText);
    assert.strictEqual(assertCurrentGridSamplingOriginalExpectation(gridExpected), gridExpected);
    assert.equal(gridExpected.currentGridSamplingTransition,
      'EXACT_CURRENT_GRID_SAMPLING_ORIGINAL_RESTORE_V1');
    assert.equal(Object.hasOwn(gridExpected, 'ownerCurrentDomainTransition'), false);
    for (const field of ['sourceHead', 'datasetId', 'bundleContentSha256',
      'productionReferenceAt', 'generatedAt']) assert.equal(gridExpected[field], current[field]);
    assert.deepEqual(gridExpected.modelBinding, current.modelBinding);
    assert.deepEqual(gridExpected.contractHashes, current.contractHashes);
    assert.equal(gridExpected.minimumReferenceAt, current.productionReferenceAt);
    assert.equal(gridExpected.minimumGeneratedAt, current.generatedAt);
    assert.notEqual(gridExpected.modelBinding.modelBundleSha256, integratedBinding.modelBundleSha256);
    assert.notEqual(gridExpected.contractHashes.continuationStateContractSha256,
      actualContracts.continuationStateContractSha256);
    const githubOutput = await fs.readFile(githubOutputPath, 'utf8');
    assert.match(githubOutput, /required=true/);
    assert.match(githubOutput, /transition_kind=current-grid-sampling-original/);
    assert.ok(githubOutput.includes('source_head=' + current.sourceHead));

    // Actual normal --describe-target function, not a relabelled CURRENT fixture.
    const restored = await describeTargetProtectedPrivateProductionRuntime({
      request, targetReferenceAt: current.productionReferenceAt,
      datasetId: current.datasetId, bundleContentSha256: current.bundleContentSha256,
    });
    assert.equal(restored.kind, gridPolicy.restoredSourceDescriptionKind);
    assert.notEqual(restored.kind, current.kind);
    const controlledManifest = {
      bundleContentSha256: descriptor.bundleContentSha256,
      datasetId: descriptor.datasetId,
      productionReferenceAt: descriptor.productionReferenceAt,
      generatedAt: descriptor.generatedAt,
      modelBinding: clone(descriptor.modelBinding),
      contractHashes: clone(descriptor.contractHashes),
    };
    const expectedBefore = JSON.stringify(gridExpected);
    const restoredBefore = JSON.stringify(restored);
    const manifestBefore = JSON.stringify(controlledManifest);
    assert.strictEqual(secondRestoreExpectation({
      expected: gridExpected, source: restored, manifest: controlledManifest,
    }), gridExpected);
    const rejectionLabels = [];
    const reject = (label, options, pattern) => {
      assert.throws(() => secondRestoreExpectation(options), pattern, label);
      rejectionLabels.push(label);
    };
    reject('actual CURRENT source is wrong in second restore',
      { expected: gridExpected, source: current, manifest: controlledManifest },
      /not the exact current-grid sampling original/);
    reject('source-head mismatch against original',
      { expected: gridExpected, source: { ...restored, sourceHead: 'b'.repeat(40) },
        manifest: controlledManifest }, /not the exact current-grid sampling original/);
    reject('source/manifest generation mismatch',
      { expected: gridExpected, source: { ...restored, datasetId: restored.datasetId + '-wrong' },
        manifest: controlledManifest }, /contradicts the authenticated bundle/);
    reject('manifest contract mismatch',
      { expected: gridExpected, source: restored,
        manifest: { ...controlledManifest, contractHashes: {
          ...controlledManifest.contractHashes, continuationStateContractSha256: 'f'.repeat(64),
        } } }, /contradicts the authenticated bundle/);
    reject('mixed owner/current-grid expectation',
      { expected: { ...gridExpected, ownerCurrentDomainTransition: 'EXACT_ORIGINAL_RESTORE_V1' },
        source: restored, manifest: controlledManifest },
      /requires its exact original expectation/);
    for (const hint of ['pairedLatestAnchor', 'historicalWeatherPair']) {
      reject('no historical waiver: ' + hint,
        { expected: gridExpected, source: restored, manifest: controlledManifest, [hint]: true },
        /not the exact current-grid sampling original/);
    }
    await assert.rejects(() => describeTargetProtectedPrivateProductionRuntime({
      request, targetReferenceAt: current.productionReferenceAt,
      datasetId: current.datasetId + '-wrong', bundleContentSha256: current.bundleContentSha256,
    }), /exact target reference and dataset/);
    rejectionLabels.push('actual target description cannot select wrong dataset');
    await fs.writeFile(sourceDescriptionPath, JSON.stringify(restored) + '\n');
    await assert.rejects(() => prepareHistoricalWavePredecessorRestore({
      sourceDescriptionPath, outputPath, githubOutputPath,
      targetReferenceAt: '2026-10-11T17:00:00.000Z', now,
    }), /not the exact reviewed native-grid SOURCE bridge/);
    rejectionLabels.push('actual TARGET source is wrong in prepare');
    assert.equal(await fs.readFile(outputPath, 'utf8'), expectedText);
    assert.equal(JSON.stringify(gridExpected), expectedBefore);
    assert.equal(JSON.stringify(restored), restoredBefore);
    assert.equal(JSON.stringify(controlledManifest), manifestBefore);
    assert.equal(JSON.stringify(documents.row()), pointerBefore);
    assert.ok(requestMethods.length >= 3 && requestMethods.every(method => method === 'GET'));
    assert.equal(rejectionLabels.length, 9);
    console.log(JSON.stringify({
      status: 'PASS_ONE_NORMAL_CURRENT_GRID_DESCRIPTOR_ROUTING_CONTROLLED_IO_CASE',
      testsRun: 1, skipped: 0, actualCurrentBinding: integratedBinding.modelBundleSha256,
      actualCandidateBinding: candidateBinding.modelBundleSha256,
      actualContinuationContract: actualContracts.continuationStateContractSha256,
      descriptorCalls: requestMethods.length, pointerWrites: 0,
      originalIdentityPreserved: true, actualDescribeTargetKind: restored.kind,
      rejectionLabels, modelMocks: false, sourceOverrides: false,
      authenticatedBS: false, nativeGridProof: false, productionEffect: false,
    }));
  } finally {
    // Delete only this case's own explicitly checked synthetic temporary files.
    const resolvedTemporary = path.resolve(gridTemporary);
    assert.equal(path.dirname(resolvedTemporary), path.resolve(os.tmpdir()));
    assert.ok(path.basename(resolvedTemporary).startsWith(gridTemporaryPrefix));
    await fs.rm(resolvedTemporary, { recursive: true, force: true });
  }
}

// Narrow workflow SOURCE-routing assertions for the native-grid original.
// This proves caller wiring/order only, not B/S, provider, runner or public effect.
{
  const gridNormalWorkflow = workflowSource.replace(/\r\n/g, '\n');
  const gridCodeOnlyWorkflow = codeOnlyWorkflow.replace(/\r\n/g, '\n');
  const gridStep = (source, name) => {
    const marker = '      - name: ' + name + '\n';
    const start = source.indexOf(marker);
    assert.ok(start >= 0, 'Missing normal current-grid workflow step: ' + name);
    assert.equal(source.indexOf(marker, start + marker.length), -1);
    const end = source.slice(start + marker.length).search(/^      - (?:name:|uses:)/m);
    return end < 0 ? source.slice(start)
      : source.slice(start, start + marker.length + end);
  };
  const type = 'current-grid-sampling-original';
  const excludedType = "steps.historical-wave-predecessor.outputs.transition_kind != '" + type + "'";
  const hour = gridStep(gridNormalWorkflow,
    'Require a strictly new normal hour for current-grid source succession');
  assert.ok(hour.includes("transition_kind == '" + type + "'"));
  assert.ok(hour.includes('assertCurrentGridSamplingOriginalExpectation(expected)'));
  assert.ok(hour.includes('target <= Date.parse(expected.productionReferenceAt)'));
  assert.ok(hour.includes('target !== Date.parse(expected.targetReferenceAt)'));
  assert.ok(hour.includes('test "$QUICK_CONFIRMATION" != \'true\''));
  for (const name of [
    'Restore the latest atomic schema-6 and Candidate G rollback checkpoint',
    'Restore protected atomic RavScore checkpoint when cache is absent',
    'Materialize the exact audited predecessor reader before old-reader secret use',
  ]) {
    const guarded = gridStep(gridNormalWorkflow, name);
    assert.ok(guarded.includes(excludedType), 'Current-grid must not enter old reader/checkpoint: ' + name);
    assert.ok(guarded.includes("transition_kind != 'owner-current-domain-original'"),
      'Existing owner original exclusion changed: ' + name);
  }
  const protectedRestore = gridStep(gridNormalWorkflow,
    'Restore newest compatible private runtime from protected storage');
  const localRestore = gridStep(gridNormalWorkflow,
    'Verify and restore the private production runtime bundle');
  for (const restore of [protectedRestore, localRestore]) {
    assert.ok(restore.includes("CURRENT_GRID_ORIGINAL_REQUIRED: ${{ steps.historical-wave-predecessor.outputs.transition_kind == 'current-grid-sampling-original' }}"));
    assert.ok(restore.includes('CURRENT_GRID_ORIGINAL_EXPECTED: ${{ steps.historical-wave-predecessor.outputs.expected_path }}'));
    const branch = restore.slice(restore.indexOf('if test "$CURRENT_GRID_ORIGINAL_REQUIRED"'),
      restore.indexOf('elif test "$OWNER_CURRENT_ORIGINAL_REQUIRED"'));
    assert.ok(branch.includes('restore_expected="$CURRENT_GRID_ORIGINAL_EXPECTED"'));
    assert.ok(!branch.includes('RAVRADAR_HISTORICAL_WAVE_SOURCE_ROOT'));
  }
  assert.ok(protectedRestore.includes('no reader, checkpoint or stateless replacement is permitted.'));
  assert.ok(localRestore.includes('--source-description "$RUNNER_TEMP/private-runtime-restored-source.json"'));
  const migrant = gridStep(gridNormalWorkflow,
    'Preserve nationwide originals before new-hour current-grid reconstruction');
  for (const argument of ['--current-grid-original \\',
    '--current-grid-original-expectation "$CURRENT_GRID_ORIGINAL_EXPECTED"',
    '--source "$RAVRADAR_PRIVATE_RUNTIME_RESTORE"',
    '--bundle-manifest "$RAVRADAR_PRIVATE_RUNTIME_BUNDLE/manifest.json"',
    '--predecessor-descriptor "$RUNNER_TEMP/private-runtime-restored-source.json"',
    '--expected-source-head "$EXPECTED_SOURCE_HEAD"']) assert.ok(migrant.includes(argument));
  assert.ok(migrant.includes("test \"${{ steps.current-grid-original-hour.outcome }}\" = 'success'"));
  assert.ok(migrant.includes('test ! -e "$migrated_root"'));
  assert.ok(migrant.includes('original_has_public_pack="$(jq -er'));
  assert.ok(migrant.includes('true) test -s "$migrated_root/.cache/public-hour-delivery.pack" ;;'));
  assert.ok(migrant.includes('false) test ! -e "$migrated_root/.cache/public-hour-delivery.pack" ;;'));

  assert.ok(migrant.includes("'CURRENT_GRID_ORIGINAL_ARCHIVE_BRIDGE'"));
  assert.ok(!migrant.includes('--predecessor-root'));
  assert.ok(!migrant.includes('--owner-current-original'));
  const install = gridStep(gridNormalWorkflow,
    'Install only the allowlisted restored private runtime files');
  assert.ok(install.includes('CURRENT_GRID_MIGRATED_ROOT: ${{ steps.current-grid-original-migration.outputs.restored_path }}'));
  assert.ok(install.includes('restored_root="$CURRENT_GRID_MIGRATED_ROOT"'));
  assert.ok(install.includes("test \"${{ steps.current-grid-original-migration.outcome }}\" = 'success'"));
  assert.ok(gridNormalWorkflow.indexOf(hour) < gridNormalWorkflow.indexOf(protectedRestore));
  assert.ok(gridNormalWorkflow.indexOf(localRestore) < gridNormalWorkflow.indexOf(migrant));
  assert.ok(gridNormalWorkflow.indexOf(migrant) < gridNormalWorkflow.indexOf(install));
  const rejectCodeOnly = gridStep(gridCodeOnlyWorkflow,
    'Preserve the protected 11Z and 15Z pair for the next normal weather run');
  assert.ok(rejectCodeOnly.includes('await buildCurrentGridSamplingOriginalRestoreExpectation'));
  assert.ok(rejectCodeOnly.includes("'EXACT_CURRENT_GRID_SAMPLING_ORIGINAL_RESTORE_V1'"));
  assert.ok(rejectCodeOnly.includes('code-only deployment cannot install or publish'));
  for (const writeName of [
    'Atomically record the exact already-public historical cutover',
    'Apply exact dry-run-verified post-cutover binding',
    'Try newest current-compatible private runtime',
    'Install migrated saved private runtime atomically',
  ]) assert.ok(gridCodeOnlyWorkflow.indexOf(rejectCodeOnly)
    < gridCodeOnlyWorkflow.indexOf(gridStep(gridCodeOnlyWorkflow, writeName)),
  'Current-grid code-only refusal must precede this existing write: ' + writeName);
  assert.ok(gridCodeOnlyWorkflow.includes('MODEL_BINDING_METADATA_ONLY|OWNER_CURRENT_ORIGINAL_ARCHIVE_BRIDGE'));
  assert.ok(!gridCodeOnlyWorkflow.includes('|CURRENT_GRID_ORIGINAL_ARCHIVE_BRIDGE'));
  assert.ok(!gridCodeOnlyWorkflow.includes('--current-grid-original'));
}
