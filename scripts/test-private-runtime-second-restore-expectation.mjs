#!/usr/bin/env node
import assert from 'node:assert/strict';
import { ravScoreModelBinding } from '../js/core/ravscore-model-contract.js';
import { COMPLETE_WEATHER_PREDECESSOR, EXACT_WEATHER_PAIR_MODEL_BUNDLE_SHA256, LATEST_WEATHER_PREDECESSOR, MARINE_COMPONENT_PREDECESSOR, WEATHER_ROTATION_PREDECESSOR } from './protected-private-production-runtime.mjs';
import { privateRuntimeContractHashes } from './private-production-runtime-workflow.mjs';
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

const marineOldHashes = {
  continuationStateContractSha256: MARINE_COMPONENT_PREDECESSOR.continuationStateContractSha256,
  fullRuntimeContractSha256: MARINE_COMPONENT_PREDECESSOR.fullRuntimeContractSha256,
  publicProjectionContractSha256: MARINE_COMPONENT_PREDECESSOR.publicProjectionContractSha256,
};
const marineSource = {
  ...MARINE_COMPONENT_PREDECESSOR,
  generatedAt: '2026-09-24T08:48:21.314Z',
  bundleContentSha256: 'b'.repeat(64),
  modelBinding: binding,
  contractHashes: marineOldHashes,
};
const marineManifest = {
  datasetId: marineSource.datasetId,
  productionReferenceAt: marineSource.productionReferenceAt,
  generatedAt: marineSource.generatedAt,
  bundleContentSha256: marineSource.bundleContentSha256,
  modelBinding: binding,
  contractHashes: marineOldHashes,
};
const marineExpected = {
  ...expected,
  contractHashes: { ...await privateRuntimeContractHashes(),
    continuationStateContractSha256: marineOldHashes.continuationStateContractSha256 },
  targetReferenceAt: '2026-09-24T10:00:00.000Z',
};
assert.notEqual(marineExpected.contractHashes.fullRuntimeContractSha256,
  marineOldHashes.fullRuntimeContractSha256);
assert.deepEqual(secondRestoreExpectation({
  expected: marineExpected, source: marineSource, manifest: marineManifest,
}).contractHashes, marineOldHashes);
assert.throws(() => secondRestoreExpectation({
  expected: marineExpected,
  source: { ...marineSource, datasetId: 'rr-other-generation' },
  manifest: marineManifest,
}));

const completeHashes = {
  continuationStateContractSha256: COMPLETE_WEATHER_PREDECESSOR.continuationStateContractSha256,
  fullRuntimeContractSha256: COMPLETE_WEATHER_PREDECESSOR.fullRuntimeContractSha256,
  publicProjectionContractSha256: COMPLETE_WEATHER_PREDECESSOR.publicProjectionContractSha256,
};
const completeSource = {
  ...COMPLETE_WEATHER_PREDECESSOR,
  generatedAt: '2026-09-24T12:24:09.000Z',
  bundleContentSha256: 'd'.repeat(64),
  modelBinding: binding,
  contractHashes: completeHashes,
};
const completeManifest = {
  datasetId: completeSource.datasetId,
  productionReferenceAt: completeSource.productionReferenceAt,
  generatedAt: completeSource.generatedAt,
  bundleContentSha256: completeSource.bundleContentSha256,
  modelBinding: binding,
  contractHashes: completeHashes,
};
assert.deepEqual(secondRestoreExpectation({
  expected: { ...marineExpected, targetReferenceAt: '2026-09-24T17:00:00.000Z' },
  source: completeSource,
  manifest: completeManifest,
}).contractHashes, completeHashes);
assert.throws(() => secondRestoreExpectation({
  expected: marineExpected,
  source: { ...completeSource, datasetId: 'rr-thinner-successor' },
  manifest: completeManifest,
}));

const latestHashes = {
  continuationStateContractSha256: LATEST_WEATHER_PREDECESSOR.continuationStateContractSha256,
  fullRuntimeContractSha256: LATEST_WEATHER_PREDECESSOR.fullRuntimeContractSha256,
  publicProjectionContractSha256: LATEST_WEATHER_PREDECESSOR.publicProjectionContractSha256,
};
const latestSource = {
  ...LATEST_WEATHER_PREDECESSOR,
  generatedAt: '2026-09-24T16:30:02.000Z',
  bundleContentSha256: 'e'.repeat(64),
  modelBinding: binding,
  contractHashes: latestHashes,
};
const latestManifest = {
  datasetId: latestSource.datasetId,
  productionReferenceAt: latestSource.productionReferenceAt,
  generatedAt: latestSource.generatedAt,
  bundleContentSha256: latestSource.bundleContentSha256,
  modelBinding: binding,
  contractHashes: latestHashes,
};
const pairedExpected = { ...marineExpected,
  targetReferenceAt: '2026-09-25T12:00:00.000Z' };
assert.deepEqual(secondRestoreExpectation({
  expected: pairedExpected, source: latestSource, manifest: latestManifest,
  pairedLatestAnchor: true,
}).contractHashes, latestHashes);
assert.throws(() => secondRestoreExpectation({
  expected: pairedExpected, source: latestSource, manifest: latestManifest,
}), /approved exact predecessor/);
for (const changed of [
  { sourceHead: 'c'.repeat(40) },
  { datasetId: 'rr-other-generation' },
  { contractHashes: { ...latestHashes,
    continuationStateContractSha256: 'c'.repeat(64) } },
]) {
  const changedSource = { ...latestSource, ...changed };
  assert.throws(() => secondRestoreExpectation({
    expected: pairedExpected, source: changedSource,
    manifest: { ...latestManifest, ...changed }, pairedLatestAnchor: true,
  }));
}

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
const currentExpected = { ...pairedExpected,
  contractHashes: await privateRuntimeContractHashes() };
const historicalBinding = { ...binding,
  modelBundleSha256: EXACT_WEATHER_PAIR_MODEL_BUNDLE_SHA256 };
for (const [historicalSource, historicalManifest, pairedLatestAnchor] of [
  [completeSource, completeManifest, false],
  [latestSource, latestManifest, true],
]) {
  const oldSource = { ...historicalSource, modelBinding: historicalBinding };
  const oldManifest = { ...historicalManifest, modelBinding: historicalBinding };
  const selectedHistorical = secondRestoreExpectation({
    expected: currentExpected, source: oldSource, manifest: oldManifest,
    historicalWeatherPair: true, pairedLatestAnchor,
  });
  assert.deepEqual(selectedHistorical.modelBinding, historicalBinding);
  assert.deepEqual(selectedHistorical.contractHashes, oldSource.contractHashes);
  assert.throws(() => secondRestoreExpectation({
    expected: currentExpected,
    source: { ...oldSource, sourceHead: 'c'.repeat(40) },
    manifest: oldManifest,
    historicalWeatherPair: true, pairedLatestAnchor,
  }));
  assert.throws(() => secondRestoreExpectation({
    expected: currentExpected, source: oldSource,
    manifest: { ...oldManifest, modelBinding: binding },
    historicalWeatherPair: true, pairedLatestAnchor,
  }));
}
console.log('Private runtime second-restore expectation: exact predecessor only.');
