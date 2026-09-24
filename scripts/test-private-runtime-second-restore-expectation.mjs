#!/usr/bin/env node
import assert from 'node:assert/strict';
import { ravScoreModelBinding } from '../js/core/ravscore-model-contract.js';
import { WEATHER_ROTATION_PREDECESSOR } from './protected-private-production-runtime.mjs';
import { secondRestoreExpectation } from './private-runtime-second-restore-expectation.mjs';

const binding = ravScoreModelBinding();
const oldHashes = {
  continuationStateContractSha256: WEATHER_ROTATION_PREDECESSOR.continuationStateContractSha256,
  fullRuntimeContractSha256: WEATHER_ROTATION_PREDECESSOR.fullRuntimeContractSha256,
  publicProjectionContractSha256: WEATHER_ROTATION_PREDECESSOR.publicProjectionContractSha256,
};
const expected = {
  modelBinding: binding,
  contractHashes: { ...oldHashes, fullRuntimeContractSha256: 'a'.repeat(64) },
  targetReferenceAt: '2026-09-24T03:00:00.000Z',
  minimumReferenceAt: '2026-09-21T03:00:00.000Z',
  minimumGeneratedAt: '2026-09-21T03:00:00.000Z',
};
const source = {
  ...WEATHER_ROTATION_PREDECESSOR,
  generatedAt: '2026-09-24T01:26:18.000Z',
  bundleContentSha256: 'b'.repeat(64),
  modelBinding: binding,
  contractHashes: oldHashes,
};
const manifest = {
  datasetId: source.datasetId,
  productionReferenceAt: source.productionReferenceAt,
  generatedAt: source.generatedAt,
  bundleContentSha256: source.bundleContentSha256,
  modelBinding: binding,
  contractHashes: oldHashes,
};
const selected = secondRestoreExpectation({ expected, source, manifest });
assert.deepEqual(selected.contractHashes, oldHashes);
assert.equal(selected.targetReferenceAt, expected.targetReferenceAt);
assert.equal(selected.minimumReferenceAt, expected.minimumReferenceAt);
assert.equal(selected.minimumGeneratedAt, expected.minimumGeneratedAt);
assert.equal(secondRestoreExpectation({
  expected: { ...expected, contractHashes: oldHashes }, source, manifest,
}).contractHashes, oldHashes);

for (const changed of [
  { source: { ...source, sourceHead: 'c'.repeat(40) } },
  { source: { ...source, datasetId: 'rr-unapproved' } },
  { source: { ...source, productionReferenceAt: '2026-09-24T01:00:00.000Z' } },
  { source: { ...source, contractHashes: { ...oldHashes, fullRuntimeContractSha256: 'c'.repeat(64) } } },
  { manifest: { ...manifest, bundleContentSha256: 'c'.repeat(64) } },
  { manifest: { ...manifest, modelBinding: { ...binding, modelBundleSha256: 'c'.repeat(64) } } },
  { expected: { ...expected, contractHashes: { ...expected.contractHashes, continuationStateContractSha256: 'c'.repeat(64) } } },
]) {
  assert.throws(() => secondRestoreExpectation({
    expected: changed.expected || expected,
    source: changed.source || source,
    manifest: changed.manifest || manifest,
  }));
}
console.log('Private runtime second-restore expectation: exact predecessor only.');
