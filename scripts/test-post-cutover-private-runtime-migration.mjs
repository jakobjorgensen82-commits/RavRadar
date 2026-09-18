import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  POST_CUTOVER_PREDECESSOR,
  allowedChange,
  assertBindingUpgrade,
  migrateExactModelBindingMetadata,
  migratePostCutoverPrivateRuntime,
  reconcileIntegratedContinuation,
  summarizeIndependentErrors,
  validatePredecessorIdentity,
  validatePredecessorManifest,
} from './migrate-post-cutover-private-runtime.mjs';
import { PRIVATE_RUNTIME_FILES } from './private-production-runtime-workflow.mjs';
import { ravScoreModelBinding } from '../js/core/ravscore-model-contract.js';
import { resolvePublicRavScoreProfile } from '../js/core/ravscore-public-model.js';
import {
  ravScoreModelBinding as candidateModelBinding,
} from './rollback-assets/ravscore-model-contract.js';
import {
  candidateGRollbackScoreProfile,
} from './lib/ravscore-candidate-g-rollback-runtime.mjs';

assert.equal(POST_CUTOVER_PREDECESSOR.sourceHead, 'fa418f43bbd070c446ed19b6587541b93af89599');
assert.equal(POST_CUTOVER_PREDECESSOR.datasetId, 'rr-20260914180039-210');
assert.equal(POST_CUTOVER_PREDECESSOR.expectedZoneCount, 210);
assert.equal(POST_CUTOVER_PREDECESSOR.expectedPartCount, 673);
assert.equal(PRIVATE_RUNTIME_FILES.length, 9);

const previous = POST_CUTOVER_PREDECESSOR.modelBinding;
const current = ravScoreModelBinding();
assert.deepEqual(previous, {
  ...current,
  modelBundleSha256: '327b989b731e6e84bf05bdb6bd54707d47c04d5bdf80038d437332e84a4c8e01',
}, 'The sealed predecessor must equal the real current 11-field contract except its old bundle hash');
assert.doesNotThrow(() => assertBindingUpgrade(previous, current, 'fixture'));
assert.throws(() => assertBindingUpgrade(previous, { ...current, modelId: 'changed' }, 'fixture'),
  /more than the implementation bundle hash/);
assert.throws(() => assertBindingUpgrade(previous, previous, 'fixture'), /does not require migration/);
const unchangedBindingCarrier = { modelBinding: { ...current } };
const unchangedBindingCarrierBefore = structuredClone(unchangedBindingCarrier);
assert.deepEqual(
  migrateExactModelBindingMetadata(
    unchangedBindingCarrier,
    current,
    current,
    { label: 'Unchanged current binding fixture' },
  ),
  [],
  'An unchanged model binding must be a valid contract-only rebind with no metadata edits',
);
assert.deepEqual(unchangedBindingCarrier, unchangedBindingCarrierBefore);

const protectedManifest = {
  datasetId: POST_CUTOVER_PREDECESSOR.datasetId,
  bundleContentSha256: POST_CUTOVER_PREDECESSOR.bundleContentSha256,
  zoneCount: POST_CUTOVER_PREDECESSOR.expectedZoneCount,
  partCount: POST_CUTOVER_PREDECESSOR.expectedPartCount,
  modelBinding: POST_CUTOVER_PREDECESSOR.modelBinding,
  contractHashes: POST_CUTOVER_PREDECESSOR.contractHashes,
};
assert.doesNotThrow(() => validatePredecessorManifest(protectedManifest, previous));
assert.throws(
  () => validatePredecessorManifest({
    ...protectedManifest,
    contractHashes: {
      ...protectedManifest.contractHashes,
      fullRuntimeContractSha256: '0'.repeat(64),
    },
  }, previous),
  /Protected bundle contract hashes mismatch/,
);

const dynamicPredecessorIdentity = {
  schemaVersion: '1.0.0',
  kind: 'RAVRADAR_PRIVATE_PRODUCTION_RUNTIME_CURRENT_SOURCE',
  sourceHead: POST_CUTOVER_PREDECESSOR.sourceHead,
  datasetId: POST_CUTOVER_PREDECESSOR.datasetId,
  bundleContentSha256: POST_CUTOVER_PREDECESSOR.bundleContentSha256,
  productionReferenceAt: '2026-09-14T18:00:00.000Z',
  generatedAt: '2026-09-14T18:10:00.000Z',
  modelBinding: POST_CUTOVER_PREDECESSOR.modelBinding,
  contractHashes: POST_CUTOVER_PREDECESSOR.contractHashes,
  expectedZoneCount: 210,
  expectedPartCount: 673,
  privatePayloadIncluded: false,
};
assert.deepEqual(
  validatePredecessorIdentity(
    dynamicPredecessorIdentity,
    POST_CUTOVER_PREDECESSOR.sourceHead,
  ),
  dynamicPredecessorIdentity,
);
assert.throws(() => validatePredecessorIdentity({
  ...dynamicPredecessorIdentity,
  privatePayloadIncluded: true,
}, POST_CUTOVER_PREDECESSOR.sourceHead), /source identity is invalid/);
assert.throws(() => validatePredecessorIdentity(
  dynamicPredecessorIdentity,
  '1'.repeat(40),
), /source identity is invalid/);
assert.doesNotThrow(() => validatePredecessorManifest({
  ...protectedManifest,
  productionReferenceAt: dynamicPredecessorIdentity.productionReferenceAt,
  generatedAt: dynamicPredecessorIdentity.generatedAt,
}, previous, dynamicPredecessorIdentity));

const exactAllowedPaths = new Set([
  'coastalParts.modelBinding.modelBundleSha256',
  'coastalParts.parts.part-1.ravScoreModel.modelBundleSha256',
  'coastalParts.parts.part-1.ravScoreModel.currentState.modelBundleSha256',
  'ravScoreCandidateGRollback.sourceModelBinding.modelBundleSha256',
  'ravScoreCandidateGWarmup.runtime.modelBinding.modelBundleSha256',
]);
for (const pathValue of exactAllowedPaths) {
  assert.equal(allowedChange(pathValue, exactAllowedPaths), true,
    `Tilladt modelbinding blev afvist: ${pathValue}`);
}
for (const pathValue of [
  'zones.zone-1.weather.currentSpeedMps',
  'coastalParts.parts.part-1.ravScoreModel.currentState.transportEvidence',
  'ravScoreCandidateGRollback.runtime.parts.part-1',
  'datasetId',
]) assert.equal(allowedChange(pathValue, exactAllowedPaths), false,
  `Privat måle-/statefelt blev tilladt: ${pathValue}`);

const continuationBeforeRepair = {
  modelBundleSha256: 'a'.repeat(64),
  historyBounds: {
    lastMile: {
      minimumFactorTrack: { waveNormalMoment: 2, waveTangentMoment: 4 },
      maximumFactorTrack: { waveNormalMoment: 6, waveTangentMoment: 8 },
      lastUnknownAt: '2026-09-18T09:00:00.000Z',
    },
  },
};
const continuationAfterRepair = structuredClone(continuationBeforeRepair);
continuationAfterRepair.historyBounds.lastMile.minimumFactorTrack.waveNormalMoment = 1;
continuationAfterRepair.historyBounds.lastMile.maximumFactorTrack.waveTangentMoment = 9;
const exactRepair = reconcileIntegratedContinuation({
  originalState: continuationBeforeRepair,
  migratedState: continuationBeforeRepair,
  assertPredecessor: () => { throw new Error('old last-mile envelope rejected'); },
  canonicalizeCurrent: () => continuationAfterRepair,
});
assert.equal(exactRepair.predecessorValidationRecovered, true);
assert.deepEqual(exactRepair.repairPaths, [
  'historyBounds.lastMile.maximumFactorTrack.waveTangentMoment',
  'historyBounds.lastMile.minimumFactorTrack.waveNormalMoment',
]);
assert.equal(
  exactRepair.canonicalState.historyBounds.lastMile.maximumFactorTrack.waveTangentMoment,
  9,
);
assert.throws(() => reconcileIntegratedContinuation({
  originalState: continuationBeforeRepair,
  migratedState: continuationBeforeRepair,
  assertPredecessor: () => { throw new Error('unknown old rejection'); },
  canonicalizeCurrent: () => continuationBeforeRepair,
}), /without the exact last-mile repair/);
assert.throws(() => reconcileIntegratedContinuation({
  originalState: continuationBeforeRepair,
  migratedState: continuationBeforeRepair,
  assertPredecessor: () => {},
  canonicalizeCurrent: () => ({
    ...continuationBeforeRepair,
    modelBundleSha256: 'b'.repeat(64),
  }),
}), /changed forbidden paths: modelBundleSha256/);
const groupedErrors = summarizeIndependentErrors(Array.from({ length: 673 }, (_, index) => ({
  scope: `DK-PART-${index + 1}`,
  message: `Part DK-PART-${index + 1} predecessor continuation is outside last-mile bounds`,
})));
assert.match(groupedErrors, /^673x Part <item> predecessor continuation is outside last-mile bounds/);
assert.ok(groupedErrors.length < 500,
  'Hundreds of identical private migration errors must remain readable in GitHub logs');

const integratedProfile = resolvePublicRavScoreProfile({
  modelCoverageReady: false,
  modelMemoryReady: false,
  modelMigrationReady: true,
});
const candidateCurrent = candidateModelBinding();
const candidatePrevious = {
  ...candidateCurrent,
  modelBundleSha256: POST_CUTOVER_PREDECESSOR.candidateBundleSha256,
};
const candidateProfile = candidateGRollbackScoreProfile({
  modelCoverageReady: true,
  modelMemoryReady: true,
  modelMigrationReady: true,
});
const compactResult = (binding, score) => ({
  available: true,
  score,
  modelId: binding.modelId,
  modelVersion: binding.modelId,
  modelContractSha256: binding.modelContractSha256,
  modelBundleSha256: binding.modelBundleSha256,
  modelBinding: { ...binding },
  explanation: { ...binding, rawScore: score },
});
const metadataFixture = {
  coastalParts: {
    modelBinding: { ...previous },
    scoreProfile: { ...integratedProfile, modelBundleSha256: previous.modelBundleSha256 },
    parts: [{
      current: { waders: compactResult(previous, 41) },
      ravScoreModel: {
        ...previous,
        currentState: {
          modelId: previous.modelId,
          modelBundleSha256: previous.modelBundleSha256,
          preservedEvidence: [1, 2, 3],
        },
      },
    }],
    zones: {
      zone1: {
        hourly: [{ beach: { modelBinding: { ...previous }, score: 37 } }],
      },
    },
  },
  ravScoreCandidateGRollback: {
    rollbackModelBinding: { ...candidatePrevious },
    runtime: {
      modelBinding: { ...candidatePrevious },
      scoreProfile: {
        ...candidateProfile,
        modelBundleSha256: candidatePrevious.modelBundleSha256,
      },
      parts: [{ current: { beach: compactResult(candidatePrevious, 52) } }],
    },
  },
  unrelatedWeatherMetadata: {
    modelId: 'WEATHER-SOURCE-1',
    modelBundleSha256: 'f'.repeat(64),
  },
};
const integratedMetadataPaths = migrateExactModelBindingMetadata(
  metadataFixture,
  previous,
  current,
  { label: 'Integrated fixture metadata' },
);
assert.ok(integratedMetadataPaths.includes('coastalParts.scoreProfile.modelBundleSha256'));
assert.ok(integratedMetadataPaths.includes(
  'coastalParts.parts.0.current.waders.modelBundleSha256',
));
assert.ok(integratedMetadataPaths.includes(
  'coastalParts.parts.0.current.waders.modelBinding.modelBundleSha256',
));
assert.ok(integratedMetadataPaths.includes(
  'coastalParts.parts.0.current.waders.explanation.modelBundleSha256',
));
assert.ok(integratedMetadataPaths.includes(
  'coastalParts.zones.zone1.hourly.0.beach.modelBinding.modelBundleSha256',
));
assert.equal(
  metadataFixture.coastalParts.parts[0].ravScoreModel.currentState.modelBundleSha256,
  previous.modelBundleSha256,
  'The generic metadata pass must not mutate preserved continuation state',
);
assert.deepEqual(
  metadataFixture.coastalParts.parts[0].ravScoreModel.currentState.preservedEvidence,
  [1, 2, 3],
);
assert.equal(metadataFixture.coastalParts.parts[0].current.waders.score, 41);

const candidateMetadataPaths = migrateExactModelBindingMetadata(
  metadataFixture,
  candidatePrevious,
  candidateCurrent,
  { label: 'Candidate G fixture metadata' },
);
assert.ok(candidateMetadataPaths.includes(
  'ravScoreCandidateGRollback.runtime.scoreProfile.modelBundleSha256',
));
assert.ok(candidateMetadataPaths.includes(
  'ravScoreCandidateGRollback.runtime.parts.0.current.beach.modelBinding.modelBundleSha256',
));
assert.equal(metadataFixture.ravScoreCandidateGRollback.runtime.parts[0].current.beach.score, 52);
assert.equal(
  metadataFixture.unrelatedWeatherMetadata.modelBundleSha256,
  'f'.repeat(64),
  'Unrelated weather metadata must remain byte-equivalent',
);

assert.throws(() => migrateExactModelBindingMetadata({
  result: { ...previous, profileId: 'conflicting-profile' },
}, previous, current, { label: 'Tampered fixture metadata' }), /unrecognized or conflicting/);

await assert.rejects(
  migratePostCutoverPrivateRuntime({ expectedSourceHead: 'not-a-source-head' }),
  /requires an exact predecessor source head/,
);

const source = fs.readFileSync('scripts/migrate-post-cutover-private-runtime.mjs', 'utf8');
for (const marker of [
  'measurementsChanged: false',
  'candidateStatesChanged: false',
  'privatePayloadIncluded: false',
  "transitionKind: result.transitionKind",
  "'CONTRACT_ONLY_REBIND'",
  'migratedConditionsBytes:',
  'migratedConditionsSha256:',
  'Private runtime inventory is not the exact nine-file allowlist',
  'Private runtime migration changed forbidden paths',
  'Current continuation repair changed forbidden paths',
  'reconcileIntegratedCurrentPartProjection',
  'availability or history classification changed during repair',
  'buildIntegratedZoneHourlyProjection',
  'recomputedModeCount',
  'recomputedZoneCount',
  'summarizeIndependentErrors(errors)',
  'raw Git archive is therefore not a byte-identical reconstruction',
]) assert.match(source, new RegExp(marker.replace(/[.*+?^$()|[\]\\]/g, '\\$&')));

assert.doesNotMatch(source, /Archived-source contract hashes mismatch/);

console.log('Post-cutover private runtime rebind: exact current predecessor, model migration or byte-exact contract-only reuse, nine-file allowlist and payload-free report.');
