import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { classifyVerifiedRuntimeMigration } from './migrate-post-cutover-private-runtime.mjs';
import {
  assertPostCutoverRepairProjection,
  assertProjectionEquivalent,
} from './prepare-code-only-public-runtime.mjs';
import { validateSameReferencePrivateRuntimeSuccessor } from './protected-private-production-runtime.mjs';
import { PRIVATE_RUNTIME_FILES } from './private-production-runtime-workflow.mjs';
import { PRIVATE_WEATHER_COMPONENT_PACK_FILE } from './lib/private-weather-component-inventory.mjs';
import { PRIVATE_PRODUCTION_RUNTIME_BUNDLE_POLICY, privateRuntimeBundleContentSha256 } from './private-production-runtime-bundle.mjs';
import { ravScoreModelBinding } from '../js/core/ravscore-model-contract.js';

const source = { coastalParts: { parts: { p1: {
  current: { weather: { wavePeriodS: 5 }, waders: { score: 20 } },
  ravScoreModel: { currentState: {
    modelBundleSha256: 'a'.repeat(64),
    historyBounds: { lastMile: { minimumFactorTrack: { waveNormalMoment: 2 } } },
  } },
} } } };
const bindingPath = 'coastalParts.parts.p1.ravScoreModel.currentState.modelBundleSha256';
const repairPath = 'coastalParts.parts.p1.ravScoreModel.currentState.historyBounds.lastMile.minimumFactorTrack.waveNormalMoment';
const scorePath = 'coastalParts.parts.p1.current.waders.score';
const classify = (migrated, verifiedChangedPaths) => classifyVerifiedRuntimeMigration({
  source, migrated, bindingMetadataPaths: [bindingPath], verifiedChangedPaths,
});
const bindingOnly = structuredClone(source);
bindingOnly.coastalParts.parts.p1.ravScoreModel.currentState.modelBundleSha256 = 'b'.repeat(64);
assert.equal(classify(bindingOnly, [bindingPath]), 'MODEL_BINDING_METADATA_ONLY');
assert.equal(classify(structuredClone(source), []), 'CONTRACT_ONLY_REBIND');
assertProjectionEquivalent(source, bindingOnly, 'Strict metadata-only projection');

const repaired = structuredClone(bindingOnly);
repaired.coastalParts.parts.p1.ravScoreModel.currentState.historyBounds.lastMile.minimumFactorTrack.waveNormalMoment = 1;
repaired.coastalParts.parts.p1.current.waders.score = 21;
assert.equal(classify(repaired, [bindingPath, repairPath, scorePath]), 'MODEL_BINDING_MIGRATION');
assert.throws(() => classify(repaired, [bindingPath]), /exact verified changes/);
assert.throws(() => assertProjectionEquivalent(source, repaired, 'Strict metadata-only projection'), /mismatch/);

const changedWeather = structuredClone(bindingOnly);
changedWeather.coastalParts.parts.p1.current.weather.wavePeriodS = 8;
assert.throws(() => classify(changedWeather, [bindingPath]), /exact verified changes/);
assert.throws(() => assertProjectionEquivalent(source, changedWeather, 'Strict code-only weather'), /mismatch/);
const changedScoreOnly = structuredClone(bindingOnly);
changedScoreOnly.coastalParts.parts.p1.current.waders.score = 21;
assert.throws(() => classify(changedScoreOnly, [bindingPath, scorePath]), /narrow last-mile repair/);
assert.throws(() => classifyVerifiedRuntimeMigration({
  source, migrated: changedWeather,
  bindingMetadataPaths: ['coastalParts.parts.p1.current.weather.wavePeriodS'],
  verifiedChangedPaths: [bindingPath, 'coastalParts.parts.p1.current.weather.wavePeriodS'],
}), /non-binding path/);

const startup = { datasetId: 'synthetic', zones: { z1: { waveHeightM: 1 } } };
const details = { datasetId: 'synthetic', zones: startup.zones, coastalParts: {
  parts: { p1: { current: { time: '2026-09-19T12:00:00Z', weather: { wavePeriodS: 5 },
    waders: { score: 20 }, beach: { score: 30 } } } },
  zones: { z1: { currentReferenceAt: '2026-09-19T12:00:00Z', expectedPartCount: 1,
    scoredPartCount: 1, hourly: [{ time: '2026-09-19T12:00:00Z', waders: { score: 20 }, beach: { score: 30 } }] } },
} };
const repairedDetails = structuredClone(details);
repairedDetails.coastalParts.parts.p1.current.waders.score = 21;
repairedDetails.coastalParts.zones.z1.hourly[0].waders.score = 21;
assertPostCutoverRepairProjection(startup, details, structuredClone(startup), repairedDetails);
assert.throws(() => assertPostCutoverRepairProjection(startup, details, startup, details), /did not change any derived score/);
repairedDetails.coastalParts.parts.p1.current.weather.wavePeriodS = 8;
assert.throws(() => assertPostCutoverRepairProjection(startup, details, startup, repairedDetails), /weather and geometry/);

// Only nine tiny manifest descriptors: no national weather or state fixture.
const policy = PRIVATE_PRODUCTION_RUNTIME_BUNDLE_POLICY;
const makeManifest = (binding, digest) => {
  const result = { schemaVersion: policy.schemaVersion, kind: policy.kind,
    privacyClass: policy.privacyClass, fileCount: 9, zoneCount: 210, partCount: 673,
    datasetId: 'synthetic-routing', productionReferenceAt: '2026-09-19T12:00:00.000Z',
    generatedAt: '2026-09-19T12:10:00.000Z', generationId: 'synthetic-generation',
    modelBinding: binding, contractHashes: { inputSha256: 'c'.repeat(64) },
    files: PRIVATE_RUNTIME_FILES.map(item => ({ ...item, bytes: 2,
      sha256: item.id === 'full-conditions' ? digest : 'd'.repeat(64), privacyClass: policy.privacyClass })),
  };
  result.bundleContentSha256 = privateRuntimeBundleContentSha256(result);
  return result;
};
const nextManifest = makeManifest(ravScoreModelBinding(), 'f'.repeat(64));
const oldManifest = makeManifest({ ...ravScoreModelBinding(), modelBundleSha256: 'e'.repeat(64) }, '9'.repeat(64));
const descriptor = manifest => ({ sourceHead: '1'.repeat(40), datasetId: manifest.datasetId,
  productionReferenceAt: manifest.productionReferenceAt, modelBinding: manifest.modelBinding,
  contractHashes: manifest.contractHashes, bundleContentSha256: manifest.bundleContentSha256 });
const report = { schemaVersion: 1, kind: 'RAVRADAR_POST_CUTOVER_PRIVATE_RUNTIME_REBIND',
  transitionKind: 'MODEL_BINDING_METADATA_ONLY', predecessorSourceHead: '1'.repeat(40),
  datasetId: oldManifest.datasetId, sourceBundleContentSha256: oldManifest.bundleContentSha256,
  previousIntegratedBundleSha256: oldManifest.modelBinding.modelBundleSha256,
  currentIntegratedBundleSha256: nextManifest.modelBinding.modelBundleSha256,
  previousCandidateBundleSha256: '7'.repeat(64), currentCandidateBundleSha256: '7'.repeat(64),
  previousContractHashes: oldManifest.contractHashes, currentContractHashes: nextManifest.contractHashes,
  candidateRuntimeKind: 'ravScoreCandidateGWarmup', migratedPartCount: 673,
  changedBindingFieldCount: 673, copiedPrivateFileCount: 9, migratedConditionsBytes: 2,
  migratedConditionsSha256: 'f'.repeat(64), measurementsChanged: false,
  candidateStatesChanged: false, privatePayloadIncluded: false };
const successor = { existingDescriptor: descriptor(oldManifest), successorDescriptor: descriptor(nextManifest),
  predecessorManifest: oldManifest, successorManifest: nextManifest, migrationReport: report };
assert.equal(validateSameReferencePrivateRuntimeSuccessor(successor), true,
  'a verified integrated binding-only migration does not require a fictitious Candidate G bundle change');
for (const mutation of [{ measurementsChanged: true }, { candidateStatesChanged: true },
  { transitionKind: 'CONTRACT_ONLY_REBIND' }]) {
  assert.throws(() => validateSameReferencePrivateRuntimeSuccessor({ ...successor,
    migrationReport: { ...report, ...mutation } }));
}
const changedCache = structuredClone(nextManifest);
changedCache.files[1].sha256 = '8'.repeat(64);
changedCache.bundleContentSha256 = privateRuntimeBundleContentSha256(changedCache);
assert.throws(() => validateSameReferencePrivateRuntimeSuccessor({ ...successor,
  successorManifest: changedCache, successorDescriptor: descriptor(changedCache) }), /non-conditions private file/);

// New generations retain the tenth packed input unchanged; migration cannot add,
// remove or silently refresh it while only rebinding the same weather generation.
const extend = manifest => {
  const result = structuredClone(manifest);
  result.files.push({ ...PRIVATE_WEATHER_COMPONENT_PACK_FILE, bytes: 123, sha256: '6'.repeat(64), privacyClass: policy.privacyClass });
  result.fileCount = result.files.length;
  result.bundleContentSha256 = privateRuntimeBundleContentSha256(result);
  return result;
};
const extendedOld = extend(oldManifest);
const extendedNext = extend(nextManifest);
const extendedReport = { ...report, copiedPrivateFileCount: 10, sourceBundleContentSha256: extendedOld.bundleContentSha256 };
const extendedSuccessor = { existingDescriptor: descriptor(extendedOld), successorDescriptor: descriptor(extendedNext),
  predecessorManifest: extendedOld, successorManifest: extendedNext, migrationReport: extendedReport };
assert.equal(validateSameReferencePrivateRuntimeSuccessor(extendedSuccessor), true);
const changedPack = structuredClone(extendedNext);
changedPack.files.at(-1).sha256 = '5'.repeat(64);
changedPack.bundleContentSha256 = privateRuntimeBundleContentSha256(changedPack);
assert.throws(() => validateSameReferencePrivateRuntimeSuccessor({ ...extendedSuccessor,
  successorManifest: changedPack, successorDescriptor: descriptor(changedPack) }), /non-conditions private file/);
assert.throws(() => validateSameReferencePrivateRuntimeSuccessor({ ...extendedSuccessor,
  successorManifest: nextManifest, successorDescriptor: descriptor(nextManifest) }));

const migration = await fs.readFile('scripts/migrate-post-cutover-private-runtime.mjs', 'utf8');
assert.match(migration, /transitionKind: classifyVerifiedRuntimeMigration\(/);
assert.match(migration, /if \(result\.transitionKind !== 'CONTRACT_ONLY_REBIND'\)/,
  'metadata-only migration must actually write its changed bindings');
const workflow = await fs.readFile('.github/workflows/deploy-code-only-repair.yml', 'utf8');
assert.match(workflow, /MODEL_BINDING_METADATA_ONLY\) mode=code-only-reuse/);
assert.match(workflow, /MODEL_BINDING_MIGRATION\) mode=post-cutover-last-mile-repair/);
assert.match(workflow, /CONTRACT_ONLY_REBIND\) mode=post-cutover-contract-rebind/);
console.log('Post-cutover routing: exact binding-only reuse, narrow last-mile repair and rejected input change passed.');
