#!/usr/bin/env node
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { ravScoreModelBinding } from '../js/core/ravscore-model-contract.js';
import {
  PRIVATE_PRODUCTION_RUNTIME_BUNDLE_POLICY,
  privateRuntimeBundleContentSha256,
} from './private-production-runtime-bundle.mjs';
import {
  HISTORICAL_WAVE_INPUT_TRANSITION_POLICY,
  assertHistoricalWaveInputTransition,
  buildHistoricalWavePredecessorRestoreExpectation,
  buildHistoricalWaveInputTransition,
  historicalWaveMeasuredColdPipelineInitialization,
  historicalWavePartIdentitySha256,
  loadHistoricalWaveInputTransition,
} from './lib/historical-wave-input-transition.mjs';

const sha256 = value => crypto.createHash('sha256').update(value).digest('hex');

function fixture() {
  const currentBinding = {
    ...ravScoreModelBinding(),
    modelBundleSha256: 'f'.repeat(64),
  };
  const sourceBinding = {
    ...currentBinding,
    modelBundleSha256:
      HISTORICAL_WAVE_INPUT_TRANSITION_POLICY.sourceModelBundleSha256,
  };
  const zones = {};
  const protectedParts = {};
  for (let index = 0; index < 673; index += 1) {
    const zoneId = `DK-T${String(index % 210).padStart(3, '0')}`;
    const partId = `part-${String(index).padStart(3, '0')}`;
    const part = {
      partId,
      waterPoint: [8 + index / 10000, 55 + index / 10000],
      onshoreDirectionDeg: index % 360,
    };
    (zones[zoneId] ??= []).push(part);
    protectedParts[partId] = {
      zoneId,
      waterPoint: [...part.waterPoint],
      onshoreDirectionDeg: part.onshoreDirectionDeg,
    };
  }
  const currentContract = {
    schemaVersion: 2,
    enabled: true,
    zoneCount: 210,
    partCount: 673,
    zones,
  };
  const protectedConditions = {
    datasetId: 'rr-test-historical-wave-transition',
    productionReferenceAt:
      HISTORICAL_WAVE_INPUT_TRANSITION_POLICY.sourceProductionReferenceAt,
    generatedAt: '2026-09-19T02:10:00.000Z',
    coastalParts: { modelBinding: sourceBinding, parts: protectedParts },
  };
  const protectedConditionsBytes = Buffer.from(
    `${JSON.stringify(protectedConditions)}\n`,
    'utf8',
  );
  const manifest = {
    schemaVersion: PRIVATE_PRODUCTION_RUNTIME_BUNDLE_POLICY.schemaVersion,
    kind: PRIVATE_PRODUCTION_RUNTIME_BUNDLE_POLICY.kind,
    privacyClass: PRIVATE_PRODUCTION_RUNTIME_BUNDLE_POLICY.privacyClass,
    datasetId: protectedConditions.datasetId,
    productionReferenceAt: protectedConditions.productionReferenceAt,
    generatedAt: protectedConditions.generatedAt,
    generationId: 'test-historical-wave-transition',
    zoneCount: 210,
    partCount: 673,
    modelBinding: sourceBinding,
    contractHashes: {
      continuationStateContractSha256: '1'.repeat(64),
      fullRuntimeContractSha256: '2'.repeat(64),
      publicProjectionContractSha256: '3'.repeat(64),
    },
    fileCount: 1,
    files: [{
      id: 'full-conditions',
      relativePath: 'data/live/conditions.json',
      bytes: protectedConditionsBytes.length,
      sha256: sha256(protectedConditionsBytes),
      privacyClass: PRIVATE_PRODUCTION_RUNTIME_BUNDLE_POLICY.privacyClass,
    }],
    bundleContentSha256: null,
  };
  manifest.bundleContentSha256 = privateRuntimeBundleContentSha256(manifest);
  const sourceDescription = {
    schemaVersion:
      HISTORICAL_WAVE_INPUT_TRANSITION_POLICY.sourceDescriptionSchemaVersion,
    kind: HISTORICAL_WAVE_INPUT_TRANSITION_POLICY.sourceDescriptionKind,
    sourceHead: HISTORICAL_WAVE_INPUT_TRANSITION_POLICY.sourceHead,
    datasetId: protectedConditions.datasetId,
    bundleContentSha256: manifest.bundleContentSha256,
    productionReferenceAt: protectedConditions.productionReferenceAt,
    generatedAt: protectedConditions.generatedAt,
    modelBinding: sourceBinding,
    contractHashes: manifest.contractHashes,
    expectedZoneCount: 210,
    expectedPartCount: 673,
    privatePayloadIncluded: false,
  };
  return {
    currentBinding,
    currentContract,
    protectedConditions,
    protectedConditionsBytes,
    manifest,
    sourceDescription,
    // Production workflow output intentionally uses the canonical no-millis form.
    targetReferenceAt: '2026-09-19T03:00:00Z',
  };
}

function build(values = fixture()) {
  return buildHistoricalWaveInputTransition(values);
}

const valid = fixture();
const transition = build(valid);
assert.equal(transition.disposition, 'HISTORICAL_WAVE_INPUT_EXPOSURE_UNRESOLVED');
assert.equal(transition.scope.affectedPartCount, 673);
assert.equal(transition.scope.historicalStateImpactProved, false);
assert.equal(transition.replay.mode, 'genuine-cold-start');
assert.equal(transition.replay.historyHours, 48);
assert.equal(transition.replay.readinessMayBeClaimedFromTransition, false);
const initialization = historicalWaveMeasuredColdPipelineInitialization(transition);
assert.equal(initialization.initialSelection.state, null);
assert.equal(initialization.initialSelection.source, 'COLD_START');
assert.equal(initialization.previousCandidateGContinuation, null);
assert.equal(initialization.legacyCandidateGMigrationState, null);
assert.equal(initialization.candidateGRollbackMeasuredColdStart, true);
assert.equal(initialization.candidateGRollbackMeasuredWarmupContinuation, false);
assert.equal(
  transition.scope.partIdentitySha256,
  historicalWavePartIdentitySha256(valid.currentContract),
);
assertHistoricalWaveInputTransition(transition, {
  currentContract: valid.currentContract,
  previousConditions: valid.protectedConditions,
  targetReferenceAt: valid.targetReferenceAt,
  currentBinding: valid.currentBinding,
});
const restoreExpectation = buildHistoricalWavePredecessorRestoreExpectation({
  sourceDescription: valid.sourceDescription,
  targetReferenceAt: valid.targetReferenceAt,
  currentBinding: valid.currentBinding,
  now: '2026-09-19T03:05:00.000Z',
});
assert.equal(restoreExpectation.productionReferenceAt,
  HISTORICAL_WAVE_INPUT_TRANSITION_POLICY.sourceProductionReferenceAt);
assert.equal(restoreExpectation.minimumReferenceAt,
  HISTORICAL_WAVE_INPUT_TRANSITION_POLICY.sourceProductionReferenceAt);
assert.equal(restoreExpectation.minimumGeneratedAt,
  valid.sourceDescription.generatedAt);
assert.equal(restoreExpectation.targetReferenceAt, '2026-09-19T03:00:00.000Z');
assert.throws(() => buildHistoricalWavePredecessorRestoreExpectation({
  sourceDescription: valid.sourceDescription,
  targetReferenceAt: '2026-02-30T03:00:00Z',
  currentBinding: valid.currentBinding,
}), /canonical exact UTC hour/);

for (const mutate of [
  value => { value.sourceDescription.sourceHead = 'a'.repeat(40); },
  value => { value.sourceDescription.productionReferenceAt = '2026-09-19T01:00:00.000Z'; },
  value => { value.sourceDescription.modelBinding.modelBundleSha256 = 'a'.repeat(64); },
]) {
  const value = fixture();
  mutate(value);
  assert.equal(build(value), null);
}

{
  const value = fixture();
  value.protectedConditionsBytes = Buffer.concat([
    value.protectedConditionsBytes,
    Buffer.from(' '),
  ]);
  assert.throws(() => build(value), /conditions bytes contradict/);
}

{
  const value = fixture();
  value.protectedConditions.coastalParts.parts['part-000'].waterPoint = [9, 56];
  value.protectedConditionsBytes = Buffer.from(
    `${JSON.stringify(value.protectedConditions)}\n`,
    'utf8',
  );
  value.manifest.files[0].bytes = value.protectedConditionsBytes.length;
  value.manifest.files[0].sha256 = sha256(value.protectedConditionsBytes);
  value.manifest.bundleContentSha256 = privateRuntimeBundleContentSha256(value.manifest);
  value.sourceDescription.bundleContentSha256 = value.manifest.bundleContentSha256;
  assert.throws(() => build(value), /part identities changed/);
}

{
  const value = fixture();
  value.targetReferenceAt = value.protectedConditions.productionReferenceAt;
  assert.throws(() => build(value), /genuinely newer/);
}

{
  const value = fixture();
  value.currentBinding.modelBundleSha256 =
    HISTORICAL_WAVE_INPUT_TRANSITION_POLICY.sourceModelBundleSha256;
  assert.equal(build(value), null);
  assert.equal(buildHistoricalWavePredecessorRestoreExpectation({
    sourceDescription: value.sourceDescription,
    targetReferenceAt: value.targetReferenceAt,
    currentBinding: value.currentBinding,
  }), null);
}

{
  const changed = structuredClone(transition);
  changed.scope.affectedPartCount = 672;
  assert.throws(() => assertHistoricalWaveInputTransition(changed, {
    currentContract: valid.currentContract,
    previousConditions: valid.protectedConditions,
    targetReferenceAt: valid.targetReferenceAt,
    currentBinding: valid.currentBinding,
  }), /contract is incompatible/);
}

const serialized = JSON.stringify(transition);
for (const forbidden of [
  'waveHeightM', 'wavePeriodS', 'waveDirectionDeg', 'currentUMps', 'currentVMps',
  'rawPayload', 'coordinates',
]) assert.equal(serialized.includes(forbidden), false);

const temporary = await fs.mkdtemp(path.join(os.tmpdir(), 'ravradar-wave-transition-'));
try {
  const transitionPath = path.join(temporary, 'transition.json');
  await fs.writeFile(transitionPath, `${serialized}\n`);
  const loaded = await loadHistoricalWaveInputTransition({
    transitionPath,
    currentContract: valid.currentContract,
    previousConditions: valid.protectedConditions,
    targetReferenceAt: valid.targetReferenceAt,
    currentBinding: valid.currentBinding,
  });
  assert.equal(loaded.scope.affectedPartCount, 673);
  assert.equal(await loadHistoricalWaveInputTransition({ transitionPath: null }), null);
} finally {
  await fs.rm(temporary, { recursive: true, force: true });
}

console.log('Historical wave input transition: 12 focused cases passed.');
