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
  OWNER_ASSISTANT_KNOWLEDGE_SUCCESSOR,
} from './lib/bounded-conditions-predecessor-transition.mjs';
import {
  prepareHistoricalWavePredecessorRestore,
} from './prepare-historical-wave-predecessor-restore.mjs';
import { secondRestoreExpectation } from './private-runtime-second-restore-expectation.mjs';
import {
  ASSISTANT_BINDING_PREDECESSOR_PATH,
  ASSISTANT_BINDING_MIGRATION_PATH,
  buildAssistantKnowledgeBindingSuccessor,
  assertAssistantKnowledgeBindingTargets,
  buildAssistantKnowledgeRefreshBindingSuccessor,
  assertAssistantKnowledgeRefreshBindingTargets,
} from './build-assistant-knowledge-binding-successor.mjs';

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
// Actual normal 543 producer, not the footer code-only consumer of the same B.
// Source contracts were measured from exact 5d8c, not this dirty working tree.
const assistantSource = {
  ...structuredClone(waterOriginal),
  sourceHead: '5d8c597e0e110df6b51e93fc7a8a629ad45afedc',
  datasetId: 'rr-20261005135618-210',
  productionReferenceAt: '2026-10-05T12:00:00.000Z',
  generatedAt: '2026-10-05T13:56:18.487Z',
  bundleContentSha256: '86f6b6e08d7d75db8e23436dee9f59408467e4c5698ffc44af1efb77094ad480',
  modelBinding: { ...waterOriginal.modelBinding,
    modelBundleSha256: OWNER_WATER_LEVEL_ONLY_SUCCESSOR.integratedBundleSha256 },
  contractHashes: { ...waterOriginal.contractHashes,
    continuationStateContractSha256: OWNER_WATER_LEVEL_ONLY_SUCCESSOR.continuationStateContractSha256 },
  schemaVersion: '1.0.0', kind: 'RAVRADAR_PRIVATE_PRODUCTION_RUNTIME_CURRENT_SOURCE',
  expectedZoneCount: 210, expectedPartCount: 673, privatePayloadIncluded: false,
};
const assistantFixture = () => ({
  sourceDescription: structuredClone(assistantSource),
  targetReferenceAt: assistantSource.productionReferenceAt,
  currentBinding: { ...assistantSource.modelBinding,
    modelBundleSha256: OWNER_ASSISTANT_KNOWLEDGE_SUCCESSOR.integratedBundleSha256 },
  currentContractHashes: { ...assistantSource.contractHashes,
    continuationStateContractSha256: OWNER_ASSISTANT_KNOWLEDGE_SUCCESSOR.continuationStateContractSha256 },
  now: '2026-10-05T16:00:00.000Z',
});
const assistantExpected = buildOwnerCurrentOriginalRestoreExpectation(assistantFixture());
assert.ok(assistantExpected, 'The exact authenticated 543 original needs its own normal restore path.');
const assistantRefreshHashes = Object.freeze({
  integratedBundleSha256: '6f9cd52c141c21d0684aa2acc1c11948c93e32d092e14f784ad5b402cd93932d',
  candidateBundleSha256: '68aa6115c793808fab0f12d6da18d92697dbb7606120fa05ac91a7f40fe66db7',
  continuationStateContractSha256: '46e63e73afbb26588d2a90bf6e384b5fcc676fdade69f53f28ffcaa4bf08c272',
});
const assistantRefreshFixture = () => ({
  ...assistantFixture(),
  currentBinding: { ...assistantSource.modelBinding,
    modelBundleSha256: assistantRefreshHashes.integratedBundleSha256 },
  currentContractHashes: { ...assistantSource.contractHashes,
    continuationStateContractSha256: assistantRefreshHashes.continuationStateContractSha256 },
});
const assistantRefreshExpected = buildOwnerCurrentOriginalRestoreExpectation(assistantRefreshFixture());
assert.ok(assistantRefreshExpected,
  'The reviewed 456 metadata must preserve the exact original 543 restore without replacing the 455 route.');
// Read-only protected-pointer metadata measured in Supabase on 7 October.
// This identifies the current ORIGINAL; it is not archive/GCM authentication.
// The ordinary protected restore must still authenticate its real B/S bytes.
const assistantCurrentSource = {
  ...structuredClone(assistantSource),
  sourceHead: '0361e446136fdb066fdfd62c45366449c55fee56',
  datasetId: 'rr-20261006220504-210',
  productionReferenceAt: '2026-10-06T20:00:00.000Z',
  generatedAt: '2026-10-06T22:05:04.878Z',
  bundleContentSha256: '9f0081dcac83ee5372999b669aef6e2fb46c03938413e93f1260cc540c0eb92e',
};
const assistantCurrentFixture = () => ({
  ...assistantRefreshFixture(),
  sourceDescription: structuredClone(assistantCurrentSource),
  targetReferenceAt: assistantCurrentSource.productionReferenceAt,
  now: '2026-10-07T11:05:00.000Z',
});
const assistantCurrentExpected = buildOwnerCurrentOriginalRestoreExpectation(assistantCurrentFixture());
assert.ok(assistantCurrentExpected,
  'The exact measured current 548 original needs a separate closed route, not relabelling as 543.');
assert.equal(assistantCurrentExpected.ownerCurrentDomainTransition,
  'EXACT_ASSISTANT_CURRENT_ORIGINAL_RESTORE_V1');
for (const key of ['sourceHead', 'datasetId', 'productionReferenceAt', 'generatedAt',
  'bundleContentSha256', 'modelBinding', 'contractHashes']) {
  assert.deepEqual(assistantCurrentExpected[key], assistantCurrentSource[key]);
}
assert.equal(secondRestoreExpectation({ expected: assistantCurrentExpected,
  source: assistantCurrentSource, manifest: assistantCurrentSource }), assistantCurrentExpected);
assert.throws(() => secondRestoreExpectation({ expected: assistantCurrentExpected,
  source: assistantSource, manifest: assistantSource }), /exact owner-current original/);
assert.throws(() => assertOwnerCurrentOriginalExpectation({ ...assistantCurrentExpected,
  ownerCurrentDomainTransition: 'EXACT_ASSISTANT_KNOWLEDGE_RESTORE_V1' }));
assert.throws(() => buildOwnerCurrentOriginalRestoreExpectation({ ...assistantCurrentFixture(),
  targetReferenceAt: assistantSource.productionReferenceAt }));
for (const mutate of [
  f => { f.sourceDescription.sourceHead = assistantSource.sourceHead; },
  f => { f.sourceDescription.datasetId = assistantSource.datasetId; },
  f => { f.sourceDescription.generatedAt = assistantSource.generatedAt; },
  f => { f.sourceDescription.bundleContentSha256 = assistantSource.bundleContentSha256; },
  f => { f.sourceDescription.productionReferenceAt = '2026-10-07T00:00:00.000Z'; },
  f => { f.sourceDescription.expectedPartCount = 672; },
  f => { f.sourceDescription.privatePayloadIncluded = true; },
  f => { f.currentBinding.modelBundleSha256 = OWNER_ASSISTANT_KNOWLEDGE_SUCCESSOR.integratedBundleSha256; },
  f => { f.currentContractHashes.continuationStateContractSha256 =
    OWNER_ASSISTANT_KNOWLEDGE_SUCCESSOR.continuationStateContractSha256; },
]) {
  const wrong = assistantCurrentFixture(); mutate(wrong);
  assert.equal(buildOwnerCurrentOriginalRestoreExpectation(wrong), null,
    'Measured current identity cannot create a moving-pointer or mixed-generation exception.');
}
assert.deepEqual(assistantRefreshExpected, assistantExpected,
  'A newer local implementation never relabels the authenticated original generation.');
assert.equal(secondRestoreExpectation({ expected: assistantRefreshExpected,
  source: assistantSource, manifest: assistantSource }), assistantRefreshExpected);
for (const mutate of [
  f => { f.currentBinding.modelBundleSha256 = '0'.repeat(64); },
  f => { f.currentContractHashes.continuationStateContractSha256 =
    OWNER_ASSISTANT_KNOWLEDGE_SUCCESSOR.continuationStateContractSha256; },
  f => { f.currentContractHashes.fullRuntimeContractSha256 = '0'.repeat(64); },
  f => { f.sourceDescription.sourceHead = 'wrong'; },
]) {
  const wrong = assistantRefreshFixture(); mutate(wrong);
  assert.equal(buildOwnerCurrentOriginalRestoreExpectation(wrong), null,
    'The additive local route must not admit mixed generations or a loose hash.');
}
assert.equal(assistantExpected.ownerCurrentDomainTransition, 'EXACT_ASSISTANT_KNOWLEDGE_RESTORE_V1');
assert.deepEqual(assistantExpected.modelBinding, assistantSource.modelBinding);
assert.deepEqual(assistantExpected.contractHashes, assistantSource.contractHashes);
assert.equal(assistantExpected.sourceHead, assistantSource.sourceHead);
assert.equal(assistantExpected.bundleContentSha256, assistantSource.bundleContentSha256);
assert.equal(secondRestoreExpectation({ expected: assistantExpected,
  source: assistantSource, manifest: assistantSource }), assistantExpected);
assert.equal(assertOwnerCurrentOriginalExpectation(assistantExpected).datasetId, assistantSource.datasetId);
for (const field of ['sourceHead', 'datasetId', 'productionReferenceAt', 'generatedAt', 'bundleContentSha256']) {
  const wrong = assistantFixture(); wrong.sourceDescription[field] = 'wrong';
  assert.equal(buildOwnerCurrentOriginalRestoreExpectation(wrong), null);
  assert.throws(() => assertOwnerCurrentOriginalExpectation({ ...assistantExpected, [field]: 'wrong' }));
}
const deduplicatingFooter = assistantFixture();
deduplicatingFooter.sourceDescription.sourceHead = 'd9d6b6683f7950478b5bee3f8c9a9858356f0310';
assert.equal(buildOwnerCurrentOriginalRestoreExpectation(deduplicatingFooter), null,
  'A same-content code-only consumer must not relabel the original weather producer.');
const localOldGenerated = assistantFixture();
localOldGenerated.sourceDescription.contractHashes.continuationStateContractSha256 =
  '029cf4f9d4422908f8a862d443db8d06d0b2bc6b8763f1098424f569ab59e94f';
assert.equal(buildOwnerCurrentOriginalRestoreExpectation(localOldGenerated), null,
  'Dirty local code with old generated metadata is not the original production contract.');
for (const mutate of [
  value => { value.sourceDescription.expectedPartCount = 672; },
  value => { value.sourceDescription.privatePayloadIncluded = true; },
  value => { value.currentBinding.modelBundleSha256 = 'e'.repeat(64); },
  value => { value.currentBinding.modelContractSha256 = 'a'.repeat(64); },
  value => { value.currentContractHashes.continuationStateContractSha256 = 'f'.repeat(64); },
  value => { value.currentContractHashes.fullRuntimeContractSha256 = 'f'.repeat(64); },
]) {
  const wrong = assistantFixture(); mutate(wrong);
  assert.equal(buildOwnerCurrentOriginalRestoreExpectation(wrong), null);
}
for (const transition of ['EXACT_ORIGINAL_RESTORE_V1', 'EXACT_WATER_LEVEL_ONLY_RESTORE_V1', 'wrong']) {
  assert.throws(() => assertOwnerCurrentOriginalExpectation({ ...assistantExpected,
    ownerCurrentDomainTransition: transition }));
}
assert.throws(() => buildOwnerCurrentOriginalRestoreExpectation({ ...assistantFixture(),
  targetReferenceAt: '2026-10-05T08:00:00.000Z' }));
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
const ownerRestorePreparation = await fs.readFile('scripts/prepare-historical-wave-predecessor-restore.mjs', 'utf8');
assert.ok(ownerRestorePreparation.includes('OWNER_WATER_LEVEL_ONLY_SUCCESSOR.integratedBundleSha256]'),
  'Unknown 543 original must fail closed before falling into an archived-reader path');
assert.ok(ownerRestorePreparation.includes('sourceDescription.modelBinding?.modelBundleSha256 !== ravScoreModelBinding().modelBundleSha256'),
  'Same current binding is not a technical original transition');
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

  // Exercise the actual normal workflow preparation, not only a policy object.
  // Its output still demands ORIGINAL protected/bundle authentication later.
  await fs.writeFile(sourceDescriptionPath, `${JSON.stringify(assistantCurrentSource)}\n`);
  await fs.writeFile(githubOutputPath, '');
  const currentPrepared = await prepareHistoricalWavePredecessorRestore({
    sourceDescriptionPath,
    targetReferenceAt: assistantCurrentSource.productionReferenceAt,
    outputPath,
    githubOutputPath,
    now: assistantCurrentFixture().now,
  });
  assert.equal(currentPrepared.required, true);
  assert.equal(currentPrepared.transitionKind, 'owner-current-domain-original');
  assert.deepEqual(JSON.parse(await fs.readFile(outputPath, 'utf8')), assistantCurrentExpected);
  const currentOutputs = await fs.readFile(githubOutputPath, 'utf8');
  assert.match(currentOutputs, /required=true\n/);
  assert.ok(currentOutputs.includes(`source_head=${assistantCurrentSource.sourceHead}\n`));
  assert.match(currentOutputs, /transition_kind=owner-current-domain-original\n/);
  const expectedBytes = await fs.readFile(outputPath);
  const unknownCurrent = structuredClone(assistantCurrentSource);
  unknownCurrent.sourceHead = 'e'.repeat(40);
  await fs.writeFile(sourceDescriptionPath, `${JSON.stringify(unknownCurrent)}\n`);
  await fs.writeFile(githubOutputPath, '');
  await assert.rejects(prepareHistoricalWavePredecessorRestore({
    sourceDescriptionPath,
    targetReferenceAt: unknownCurrent.productionReferenceAt,
    outputPath,
    githubOutputPath,
    now: assistantCurrentFixture().now,
  }), /exact approved binding bridge/);
  assert.deepEqual(await fs.readFile(outputPath), expectedBytes,
    'Unknown current identity must not overwrite the already prepared original expectation.');
  assert.equal(await fs.readFile(githubOutputPath, 'utf8'), '',
    'Refusal must not emit a success or archived-reader fallback.');
} finally {
  await fs.rm(temporary, { recursive: true, force: true });
}

// The new append's renderer is exercised here, beside the ACTUAL restore and
// migration callers above. Synthetic hashes are NOT an authenticated source
// generation and cannot authorize a restore or release.
const assistantBase = await fs.readFile(ASSISTANT_BINDING_PREDECESSOR_PATH, 'utf8');
assertAssistantKnowledgeBindingTargets(structuredClone(OWNER_ASSISTANT_KNOWLEDGE_SUCCESSOR));
for (const key of Object.keys(OWNER_ASSISTANT_KNOWLEDGE_SUCCESSOR)) {
  assert.throws(() => assertAssistantKnowledgeBindingTargets({
    ...OWNER_ASSISTANT_KNOWLEDGE_SUCCESSOR, [key]: '0'.repeat(64),
  }), /metadata and the exact original restore policy must agree/,
  'Changing excluded generated metadata must still fail its independent normal gate.');
}
const syntheticAssistantHashes = {
  integratedBundleSha256: 'a'.repeat(64),
  candidateBundleSha256: 'b'.repeat(64),
  continuationStateContractSha256: 'c'.repeat(64),
};
const assistantAppend = buildAssistantKnowledgeBindingSuccessor({
  baseSql: assistantBase, targetHashes: syntheticAssistantHashes,
});
const assistantHelper = 'ravradar_ravscore_checkpoint_assistant_predecessor_projection';
const assistantDefinitionStart = assistantAppend.indexOf('create or replace function public.' + assistantHelper + '(');
const assistantDefinitionEnd = assistantAppend.indexOf('\n$$;', assistantDefinitionStart);
assert.ok(assistantDefinitionStart >= 0 && assistantDefinitionEnd > assistantDefinitionStart);
const assistantProjection = assistantAppend.slice(assistantDefinitionStart, assistantDefinitionEnd);
assert.ok(assistantProjection.includes(OWNER_WATER_LEVEL_ONLY_SUCCESSOR.integratedBundleSha256));
assert.ok(assistantProjection.includes(OWNER_WATER_LEVEL_ONLY_SUCCESSOR.candidateBundleSha256));
assert.ok(assistantProjection.includes(OWNER_WATER_LEVEL_ONLY_SUCCESSOR.continuationStateContractSha256));
for (const marker of [
  'pg_catalog.jsonb_object_agg', 'pg_catalog.jsonb_set', "'{modelBundleSha256}'",
  "'{modelBinding,modelBundleSha256}'", "'{continuationStateContractSha256}'",
  "'{candidateGRollbackCompanion,modelBinding,modelBundleSha256}'",
  'public.ravradar_ravscore_checkpoint_payload_valid(v_projected, p_target_reference)',
]) assert.ok(assistantProjection.includes(marker), 'Full exact metadata projection lacks ' + marker);
assert.ok(assistantAppend.includes('revoke all on function public.' + assistantHelper
  + '(jsonb,timestamptz) from public, anon, authenticated;'));
assert.ok(assistantAppend.includes("pg_catalog.to_regprocedure('public." + assistantHelper + "(jsonb,timestamptz)')"));
assert.ok(assistantAppend.includes('p.oid = v_validator_oids[10]'));
assert.ok(assistantAppend.includes("-- assistant-predecessor-projection --\\n' || v_assistant_projection_definition"));
assert.ok(assistantAppend.includes("and (v_assistant_predecessor_payload #- '{generationSha256}' #- '{stateSha256}'\n"
  + "          #- '{candidateGRollbackCompanion,generationSha256}')\n"
  + "        = (p_payload #- '{generationSha256}' #- '{stateSha256}'\n"
  + "          #- '{candidateGRollbackCompanion,generationSha256}');"));
for (const field of ['transportEvidence', 'wavePotential', 'lastMileState', 'historyBounds', 'samplingContextKey', 'lineage']) {
  assert.ok(!new RegExp("jsonb_set\\([\\s\\S]{0,100}'\\{[^}]*" + field).test(assistantProjection),
    'Assistant technical projection must never mutate ' + field);
}
for (const targetHashes of [null, [], { ...syntheticAssistantHashes, extra: 'd'.repeat(64) },
  { ...syntheticAssistantHashes, candidateBundleSha256: 'A'.repeat(64) },
  { ...syntheticAssistantHashes, integratedBundleSha256: OWNER_WATER_LEVEL_ONLY_SUCCESSOR.integratedBundleSha256 },
  { ...syntheticAssistantHashes, candidateBundleSha256: syntheticAssistantHashes.integratedBundleSha256 },
  structuredClone(OWNER_WATER_LEVEL_ONLY_SUCCESSOR)]) {
  assert.throws(() => buildAssistantKnowledgeBindingSuccessor({ baseSql: assistantBase, targetHashes }));
}
assert.throws(() => buildAssistantKnowledgeBindingSuccessor({
  baseSql: assistantBase + '\n-- unreviewed alteration', targetHashes: syntheticAssistantHashes,
}), /remain immutable/);
assert.equal(await fs.readFile(ASSISTANT_BINDING_PREDECESSOR_PATH, 'utf8'), assistantBase,
  'Pure rendering must not modify the applied anchor');

const assistantPriorSql = await fs.readFile(ASSISTANT_BINDING_MIGRATION_PATH, 'utf8');
assert.equal(assistantPriorSql.replace(/\r\n?/g, '\n'), buildAssistantKnowledgeBindingSuccessor({
  baseSql: assistantBase, targetHashes: structuredClone(OWNER_ASSISTANT_KNOWLEDGE_SUCCESSOR),
}), 'The already-written 455 migration still reproduces from its immutable predecessor');
assertAssistantKnowledgeRefreshBindingTargets(assistantRefreshHashes);
for (const key of Object.keys(assistantRefreshHashes)) {
  assert.throws(() => assertAssistantKnowledgeRefreshBindingTargets({
    ...assistantRefreshHashes, [key]: '0'.repeat(64),
  }));
}
const assistantRefreshAppend = buildAssistantKnowledgeRefreshBindingSuccessor({
  baseSql: assistantPriorSql, targetHashes: assistantRefreshHashes,
});
const refreshHelper = 'ravradar_ravscore_checkpoint_assistant_refresh_predecessor_projection';
const sqlDefinition = (text, name) => {
  const start = text.indexOf('create or replace function public.' + name + '(');
  const end = text.indexOf('\n$$;', start);
  assert.ok(start >= 0 && end > start);
  return text.slice(start, end + 4);
};
const refreshProjection = sqlDefinition(assistantRefreshAppend, refreshHelper);
for (const key of Object.keys(assistantRefreshHashes)) {
  assert.ok(refreshProjection.includes(OWNER_ASSISTANT_KNOWLEDGE_SUCCESSOR[key]));
  assert.ok(refreshProjection.includes(assistantRefreshHashes[key]));
}
for (const marker of ['pg_catalog.octet_length(p_payload::text) > 16777216',
  "pg_catalog.jsonb_typeof(p_payload -> 'states') is distinct from 'object'",
  "pg_catalog.count(*) from pg_catalog.jsonb_each(p_payload -> 'states')) <> 673",
  'public.ravradar_ravscore_checkpoint_payload_valid(v_projected, p_target_reference)',
  'exception when others then return null;']) assert.ok(refreshProjection.includes(marker));
for (const field of ['datasetId', 'productionReferenceAt', 'generatedAt', 'current',
  'geometry', 'source', 'score', 'memory', 'lastHistoryAt']) {
  assert.ok(!new RegExp("jsonb_set\\([\\s\\S]{0,100}'\\{[^}]*" + field).test(refreshProjection));
}
assert.ok(assistantRefreshAppend.includes('revoke all on function public.' + refreshHelper
  + '(jsonb,timestamptz) from public, anon, authenticated;'));
const refreshContract = sqlDefinition(assistantRefreshAppend, 'ravradar_ravscore_checkpoint_contract');
assert.ok(refreshContract.includes("pg_catalog.to_regprocedure('public." + refreshHelper + "(jsonb,timestamptz)')"));
assert.ok(refreshContract.includes('p.oid = v_validator_oids[11]'));
assert.ok(refreshContract.includes("-- assistant-refresh-predecessor-projection --\\n' || v_assistant_refresh_projection_definition"));
assert.ok(refreshContract.includes("m.version::text = '20261007123000'"));
assert.ok(assistantRefreshAppend.includes("and (v_assistant_refresh_predecessor_payload #- '{generationSha256}' #- '{stateSha256}'\n"
  + "          #- '{candidateGRollbackCompanion,generationSha256}')\n"
  + "        = (p_payload #- '{generationSha256}' #- '{stateSha256}'\n"
  + "          #- '{candidateGRollbackCompanion,generationSha256}');"));
for (const name of ['ravradar_ravscore_checkpoint_candidate_state_valid',
  'ravradar_ravscore_checkpoint_water_level_predecessor_projection',
  'ravradar_ravscore_checkpoint_owner_current_predecessor_projection',
  'ravradar_ravscore_checkpoint_cp_close_predecessor_projection',
  'ravradar_ravscore_checkpoint_top20_predecessor_projection']) {
  assert.equal(sqlDefinition(assistantRefreshAppend, name), sqlDefinition(assistantPriorSql, name));
}
for (const targetHashes of [null, [], { ...assistantRefreshHashes, extra: 'd'.repeat(64) },
  { ...assistantRefreshHashes, candidateBundleSha256: 'A'.repeat(64) },
  { ...assistantRefreshHashes, integratedBundleSha256: OWNER_ASSISTANT_KNOWLEDGE_SUCCESSOR.integratedBundleSha256 },
  { ...assistantRefreshHashes, candidateBundleSha256: assistantRefreshHashes.integratedBundleSha256 }]) {
  assert.throws(() => buildAssistantKnowledgeRefreshBindingSuccessor({ baseSql: assistantPriorSql, targetHashes }));
}
assert.throws(() => buildAssistantKnowledgeRefreshBindingSuccessor({
  baseSql: assistantPriorSql + '\n-- unreviewed alteration', targetHashes: assistantRefreshHashes,
}));
assert.equal(await fs.readFile(ASSISTANT_BINDING_MIGRATION_PATH, 'utf8'), assistantPriorSql);
assert.equal(await fs.readFile(ASSISTANT_BINDING_PREDECESSOR_PATH, 'utf8'), assistantBase);

console.log('Bounded predecessor transition: exact originals, normal caller/retirement guards and synthetic assistant append inverse/restriction/CAS controls passed.');
