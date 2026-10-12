import assert from 'node:assert/strict';
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {
  atomicWriteJson,
  POST_CUTOVER_PREDECESSOR,
  allowedChange,
  assertBindingUpgrade,
  migrateExactModelBindingMetadata,
  migratePostCutoverPrivateRuntime,
  reconcileIntegratedContinuation,
  registerChangedBindingMetadata,
  sameStructuredValue,
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

assert.equal(POST_CUTOVER_PREDECESSOR.sourceHead, 'a6d89798c76a5218c5d699961474f4259835dfb9');
assert.equal(POST_CUTOVER_PREDECESSOR.datasetId, 'rr-20260921170645-210');
assert.equal(POST_CUTOVER_PREDECESSOR.productionReferenceAt, '2026-09-21T16:00:00.000Z');
assert.equal(POST_CUTOVER_PREDECESSOR.generatedAt, '2026-09-21T17:06:45.191Z');
assert.equal(POST_CUTOVER_PREDECESSOR.expectedZoneCount, 210);
assert.equal(POST_CUTOVER_PREDECESSOR.expectedPartCount, 673);
assert.equal(PRIVATE_RUNTIME_FILES.length, 9);

// The real private runtime contains 673 Candidate G part states.  Keep a
// representative large shape in the regression suite so the migration guard
// remains streaming/structural and cannot regress to one giant JSON string.
const largeContinuation = {
  parts: Object.fromEntries(Array.from({ length: 673 }, (_, partIndex) => [
    `part-${partIndex + 1}`,
    {
      currentState: {
        hours: Array.from({ length: 118 }, (_, hourIndex) => ({
          time: `2026-09-${String((hourIndex % 28) + 1).padStart(2, '0')}T00:00:00.000Z`,
          state: hourIndex % 4,
          modelBundleSha256: 'a'.repeat(64),
        })),
      },
    },
  ])),
};
assert.equal(
  sameStructuredValue(largeContinuation, structuredClone(largeContinuation)),
  true,
  'Large private continuation state must compare without a giant serialization string',
);

// The same large shape must also be writable by the migration path without
// first becoming one giant V8 string.  Do not build an expected JSON string
// here: that would hide the regression this test is meant to catch.
const migrationWriterRoot = await fsp.mkdtemp(path.join(os.tmpdir(), 'rr-migration-json-'));
try {
  const migrationWriterPath = path.join(migrationWriterRoot, 'conditions.json');
  const migrationWriterResult = await atomicWriteJson(migrationWriterPath, largeContinuation);
  assert.ok(migrationWriterResult.bytes > 0);
  assert.match(migrationWriterResult.sha256, /^[0-9a-f]{64}$/);
  const migrationWriterReadback = JSON.parse(await fsp.readFile(migrationWriterPath, 'utf8'));
  assert.equal(Object.keys(migrationWriterReadback.parts).length, 673);
  assert.equal(migrationWriterReadback.parts['part-673'].currentState.hours.length, 118);
} finally {
  await fsp.rm(migrationWriterRoot, { recursive: true, force: true });
}
const changedLargeContinuation = structuredClone(largeContinuation);
changedLargeContinuation.parts['part-673'].currentState.hours[117].state = 99;
assert.equal(
  sameStructuredValue(largeContinuation, changedLargeContinuation),
  false,
  'Large private continuation comparison must still detect a changed measurement/state',
);

const previous = POST_CUTOVER_PREDECESSOR.modelBinding;
const current = ravScoreModelBinding();
assert.deepEqual(previous, {
  ...current,
  modelBundleSha256: '14f3f0c9b1d91df0d23f94e1d56852a34f8d6a232e23da74590921be8f058904',
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
  productionReferenceAt: POST_CUTOVER_PREDECESSOR.productionReferenceAt,
  generatedAt: POST_CUTOVER_PREDECESSOR.generatedAt,
  zoneCount: POST_CUTOVER_PREDECESSOR.expectedZoneCount,
  partCount: POST_CUTOVER_PREDECESSOR.expectedPartCount,
  modelBinding: POST_CUTOVER_PREDECESSOR.modelBinding,
  contractHashes: POST_CUTOVER_PREDECESSOR.contractHashes,
};
assert.doesNotThrow(() => validatePredecessorManifest(protectedManifest, previous));
assert.throws(
  () => validatePredecessorManifest({
    ...protectedManifest,
    productionReferenceAt: '2026-09-21T15:00:00.000Z',
  }, previous),
  /productionReferenceAt/,
  'A flat predecessor-identity mismatch must name the exact field',
);
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
  kind: 'RAVRADAR_PRIVATE_PRODUCTION_RUNTIME_TARGET_SOURCE',
  sourceHead: POST_CUTOVER_PREDECESSOR.sourceHead,
  datasetId: POST_CUTOVER_PREDECESSOR.datasetId,
  bundleContentSha256: POST_CUTOVER_PREDECESSOR.bundleContentSha256,
  productionReferenceAt: '2026-09-21T16:00:00.000Z',
  generatedAt: '2026-09-21T17:06:45.191Z',
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

const publicHourExactPaths = new Set();
const publicHourBindingPaths = new Set();
const publicHourMetadataChanges = registerChangedBindingMetadata({
  exactAllowedPaths: publicHourExactPaths,
  bindingMetadataPaths: publicHourBindingPaths,
  before: {
    sourceDetailsSha256: 'a'.repeat(64),
    startupNationalForecastSha256: 'b'.repeat(64),
    rawBytes: 1234,
    packBytes: 567,
    packSha256: 'c'.repeat(64),
  },
  after: {
    sourceDetailsSha256: 'd'.repeat(64),
    startupNationalForecastSha256: 'e'.repeat(64),
    rawBytes: 1234,
    packBytes: 568,
    packSha256: 'f'.repeat(64),
  },
  prefix: 'publicHourDelivery',
  fields: [
    'sourceDetailsSha256',
    'startupNationalForecastSha256',
    'rawBytes',
    'packBytes',
    'packSha256',
  ],
});
assert.deepEqual(publicHourMetadataChanges, [
  'publicHourDelivery.sourceDetailsSha256',
  'publicHourDelivery.startupNationalForecastSha256',
  'publicHourDelivery.packBytes',
  'publicHourDelivery.packSha256',
]);
assert.equal(publicHourExactPaths.has('publicHourDelivery.rawBytes'), false,
  'An unchanged byte count is identity metadata, but not an actual changed path');
assert.deepEqual(publicHourBindingPaths, publicHourExactPaths,
  'Changed public-hour metadata must have one shared binding/change inventory');

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
  'transitionKind: migrationResult.transitionKind',
  "'CONTRACT_ONLY_REBIND'",
  'migratedConditionsBytes:',
  'migratedConditionsSha256:',
  'const allowed = [...PRIVATE_RUNTIME_FILES, PRIVATE_WEATHER_COMPONENT_PACK_FILE,',
  'PRIVATE_PUBLIC_HOUR_DELIVERY_PACK_FILE]',
  'assertPrivateRuntimeInventory(actual)',
  'Private runtime component marker requires its preserved input pack',
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

console.log('Post-cutover private runtime rebind: exact current predecessor, model migration or byte-exact contract-only reuse, fixed base files plus independently sealed extension packs and payload-free report.');

// One additive controlled normal migrant case. Old states are generated by the
// actual fixed Git7791 generators, never by retagging a new state's bundle.
// This is not authentic production B/S, permanent preservation or native DMI.
{
  const assert = (await import('node:assert/strict')).default;
  const fs = await import('node:fs/promises');
  const path = (await import('node:path')).default;
  const os = (await import('node:os')).default;
  const { pathToFileURL, fileURLToPath } = await import('node:url');
  const { registerHooks } = await import('node:module');
  const { execFileSync } = await import('node:child_process');
  const { createHash } = await import('node:crypto');
  const repositoryRoot = await fs.realpath(process.cwd());
  const base = '7791d92e3368a715e3b68d9e76d460447a60f795';
  const oldQuery = 'old_git';
  const isOldUrl = value => typeof value === 'string' && value.startsWith('file:')
    && new URL(value).searchParams.get(oldQuery) === base;
  const oldBodies = new Map();
  const oldLoaded = new Set();
  const sha = value => createHash('sha256').update(value).digest('hex');
  const currentImport = relative => import(pathToFileURL(path.resolve(repositoryRoot, relative)).href);
  const oldImport = relative => {
    const url = pathToFileURL(path.resolve(repositoryRoot, relative));
    url.searchParams.set(oldQuery, base);
    return import(url.href);
  };
  const jsonFile = 'scripts/lib/dmi-marine-zone-exclusions.json';
  const oldJsonRaw = execFileSync('git', ['show', `${base}:${jsonFile}`], { cwd: repositoryRoot });
  const actualJsonRaw = await fs.readFile(path.join(repositoryRoot, jsonFile));
  assert.equal(sha(oldJsonRaw), 'b959dee7b87cfebe9fdc7311ffd62b835c96d5c4a263bbcff5c0485f6660ef16');
  assert.equal(actualJsonRaw.toString('utf8').replace(/\r\n/g, '\n'), oldJsonRaw.toString('utf8'));
  assert.deepEqual(JSON.parse(actualJsonRaw), JSON.parse(oldJsonRaw));
  // Only the old generator graph uses exact Git blobs in this read-only RAM
  // namespace. Current normal migrant/registry/prepare/restore imports remain
  // actual disk imports on the legitimately generated successor source branch.
  const oldHook = registerHooks({
    resolve(specifier, context, next) {
      if (isOldUrl(specifier) || isOldUrl(context.parentURL) && /^\.{1,2}\//.test(specifier)) {
        const url = new URL(specifier, context.parentURL);
        url.searchParams.set(oldQuery, base);
        return { url: url.href, shortCircuit: true };
      }
      return next(specifier, context);
    },
    load(url, context, next) {
      if (!isOldUrl(url)) return next(url, context);
      const relative = path.relative(repositoryRoot, fileURLToPath(url)).replace(/\\/g, '/');
      assert.match(relative, /^(?:js\/core\/|scripts\/)[A-Za-z0-9_./-]+\.(?:mjs|js)$/);
      assert.equal(relative.split('/').includes('..'), false);
      if (!oldBodies.has(relative)) oldBodies.set(relative,
        execFileSync('git', ['show', `${base}:${relative}`], { cwd: repositoryRoot, encoding: 'utf8' }));
      oldLoaded.add(relative);
      return { format: 'module', source: oldBodies.get(relative), shortCircuit: true };
    },
  });
  const temporary = await fs.mkdtemp(path.join(os.tmpdir(), 'rr-current-grid-migrant-case-'));
  try {
    const [normalMigrant, gridHelper, bundle, protectedRuntime, prepare, secondRestore,
      workflow, pack, hourly, currentI, currentC,
      oldPipeline, oldCandidatePipeline, oldStage, oldI, oldC, oldProfile,
      oldCandidateProfile, oldEvidence, oldPublic, oldBundle] = await Promise.all([
      currentImport('scripts/migrate-post-cutover-private-runtime.mjs'),
      currentImport('scripts/lib/bounded-conditions-predecessor-transition.mjs'),
      currentImport('scripts/private-production-runtime-bundle.mjs'),
      currentImport('scripts/protected-private-production-runtime.mjs'),
      currentImport('scripts/prepare-historical-wave-predecessor-restore.mjs'),
      currentImport('scripts/private-runtime-second-restore-expectation.mjs'),
      currentImport('scripts/private-production-runtime-workflow.mjs'),
      currentImport('scripts/lib/public-hour-delivery-pack.mjs'),
      currentImport('scripts/lib/private-conditions-hourly.mjs'),
      currentImport('js/core/ravscore-model-contract.js'),
      currentImport('scripts/rollback-assets/ravscore-model-contract.js'),
      oldImport('js/core/ravscore-integrated-state-pipeline.js'),
      oldImport('js/core/ravscore-candidate-g-state-pipeline.js'),
      oldImport('scripts/lib/coastal-point-staging-contract.mjs'),
      oldImport('js/core/ravscore-model-contract.js'),
      oldImport('scripts/rollback-assets/ravscore-model-contract.js'),
      oldImport('js/core/ravscore-public-model.js'),
      oldImport('scripts/lib/ravscore-candidate-g-rollback-runtime.mjs'),
      oldImport('js/core/ravscore-evidence-trust-contract.js'),
      oldImport('scripts/public-conditions-lib.mjs'),
      oldImport('scripts/private-production-runtime-bundle.mjs'),
    ]);
    const policy = gridHelper.CURRENT_GRID_SAMPLING_PREDECESSOR_POLICY;
    const ib = oldI.ravScoreModelBinding();
    const cb = oldC.ravScoreModelBinding();
    assert.deepEqual(ib, policy.sourceModelBinding);
    assert.deepEqual(cb, policy.sourceCandidateModelBinding);
    assert.equal(currentI.ravScoreModelBinding().modelBundleSha256,
      '5c3673a2fe7f4ddf4785ad993350107c048c7e5b051440baff5fef3ffb461ef4');
    assert.equal(currentC.ravScoreModelBinding().modelBundleSha256,
      'b166f4d27ce07d5b513c8beb6c5a0881878938d06a083a40e3c95240584a692b');
    assert.equal((await workflow.privateRuntimeContractHashes()).continuationStateContractSha256,
      'dea864bfdbd02705e2029cbe9075b6aa12dec05ebe3eb8621f100205e8856546');
    const reference = '2026-10-11T16:00:00.000Z';
    const generatedAt = '2026-10-11T16:05:00.000Z';
    const targetReferenceAt = '2026-10-11T17:00:00.000Z';
    const now = '2026-10-11T17:10:00.000Z';
    const datasetId = 'rr-current-grid-national-migrant-controlled';
    const excluded = ['DK-B01-01', 'DK-B01-02', 'DK-B02-08', 'DK-B02-09',
      'DK-B02-11', 'DK-B03-01', 'DK-B03-02'];
    const zoneIds = [...excluded, ...Array.from({ length: 203 }, (_, i) => `CONTROLLED-ZONE-${i + 1}`)];
    const samplesAt = (at, count = 49, speed = 0.054) => Array.from({ length: count }, (_, i) => ({
      time: new Date(Date.parse(at) - (count - 1 - i) * 3_600_000).toISOString(),
      currentSpeedMps: speed, currentAlignment: 1, currentVerified: true,
      waveHeightM: 1, wavePeriodS: 6, waveDirectionDeg: 270,
    }));
    const generatedPair = (part, at = reference, count = 49, speed = 0.054) => {
      const identity = oldStage.coastalPointStageIdentity(part);
      const samples = samplesAt(at, count, speed);
      const integrated = oldPipeline.buildIntegratedRavScoreStateSeries(samples, {
        samplingContextKey: identity.samplingContextKey, onshoreDirectionDeg: part.onshoreDirectionDeg,
      }).continuationState;
      const candidate = oldCandidatePipeline.buildCandidateGDerivedStateSeries(samples, {
        stateKey: identity.expectedCandidateGStateKey,
      }).continuationState;
      assert.equal(integrated.modelBundleSha256, ib.modelBundleSha256);
      assert.equal(integrated.time, at);
      assert.equal(candidate.time, at);
      oldStage.assertIntegratedCoastalPointContinuation(integrated, {
        samplingContextKey: identity.samplingContextKey,
      });
      oldStage.assertCandidateGCoastalPointRollbackContinuation(candidate,
        identity.expectedCandidateGStateKey);
      return { integrated, candidate };
    };
    const parts = {};
    const candidateParts = {};
    const zones = {};
    const scoreZones = {};
    const firstRecords = {};
    let number = 0;
    for (let zoneIndex = 0; zoneIndex < zoneIds.length; zoneIndex += 1) {
      const zoneId = zoneIds[zoneIndex];
      const count = zoneIndex < 43 ? 4 : 3;
      zones[zoneId] = { forecast: { provider: 'CONTROLLED_TEST_ONLY', generatedAt,
        hourly: [{ time: reference, windSpeedMps: 5 + zoneIndex / 100, waveHeightM: 1 }] } };
      scoreZones[zoneId] = { expectedPartCount: count, scoredPartCount: count,
        currentReferenceAt: reference, hourly: [] };
      for (let index = 0; index < count; index += 1) {
        number += 1;
        const partId = `${zoneId}::CONTROLLED-PART-${index + 1}`;
        const part = { partId, zoneId, name: `Controlled part ${number}`,
          waterPoint: [8, 55], landPoint: [8.01, 55], onshoreDirectionDeg: 90,
          onshoreDirectionSource: 'landPoint', marineCoverage: 'controlled',
          current: null, hourly: [] };
        const pair = generatedPair(part);
        parts[partId] = { ...part, ravScoreModel: { ...ib, currentState: pair.integrated, modes: {} } };
        candidateParts[partId] = { ...part,
          ravScoreModel: { ...cb, currentState: pair.candidate, modes: {} } };
        if (index === 0 && zoneIndex < 8) {
          const olderReference = '2026-10-11T15:00:00.000Z';
          const older = generatedPair(part, olderReference, 49, 0.09);
          const record = { schemaVersion: 1, parentZoneId: zoneId, partId,
            referenceAt: olderReference, originalIntegratedState: older.integrated,
            originalCandidateGState: older.candidate };
          firstRecords[partId] = zoneIndex < 7
            ? { ...record, kind: 'PRIVATE_OWNER_CURRENT_SOURCE_TRANSITION',
              excludedCollection: 'dkss_lf', provedCurrentHours: 0, unknownCurrentHours: 49 }
            : { ...record, kind: 'PRIVATE_CURRENT_DECODER_TRANSITION',
              coordinateInterpretation: 'dmi-dkss-grib1-header-endpoints-v1' };
        }
      }
    }
    assert.equal(number, 673);
    const allPartIds = Object.keys(parts).sort();
    const baseline = { datasetId, generatedAt, productionReferenceAt: reference, zones,
      coastalParts: { schemaVersion: 1, enabled: true, generatedAt,
        expectedPartCount: 673, scoredPartCount: 673, marginPoints: 7,
        modelBinding: ib, evidenceTrust: oldEvidence.ravScoreVerifiedEvidenceTrust(),
        scoreProfile: oldProfile.resolvePublicRavScoreProfile({
          modelCoverageReady: true, modelMemoryReady: true, modelMigrationReady: true }),
        parts, zones: scoreZones },
      ravScoreCandidateGRollback: {
        schemaVersion: '1.0.0', kind: 'PRIVATE_CANDIDATE_G_OPERATIONAL_ROLLBACK_RUNTIME',
        privacyClass: 'PRIVATE_PRODUCTION_RUNTIME', sourceModelBinding: ib, rollbackModelBinding: cb,
        rollbackId: oldCandidateProfile.CANDIDATE_G_OPERATIONAL_ROLLBACK_ID, automaticActivationAllowed: false,
        publicDuringNormalOperation: false,
        runtime: { schemaVersion: 1, enabled: true, generatedAt: reference,
          expectedPartCount: 673, scoredPartCount: 673, modelBinding: cb,
          scoreProfile: oldCandidateProfile.candidateGRollbackScoreProfile({
            modelCoverageReady: true, modelMemoryReady: true, modelMigrationReady: true }),
          parts: candidateParts, zones: {} },
      },
      ravScoreCurrentSourceDomainTransitions: { schemaVersion: 1,
        kind: 'PRIVATE_OWNER_CURRENT_SOURCE_TRANSITION_ARCHIVE',
        privacyClass: 'PRIVATE_PRODUCTION_RUNTIME', parts: firstRecords },
    };
    const warmup = structuredClone(baseline);
    const warmupPartId = allPartIds[0];
    const partialPair = generatedPair(warmup.coastalParts.parts[warmupPartId], reference, 2);
    warmup.coastalParts.parts[warmupPartId].ravScoreModel.currentState = partialPair.integrated;
    warmup.coastalParts.scoreProfile = oldProfile.resolvePublicRavScoreProfile({
      modelCoverageReady: true, modelMemoryReady: false, modelMigrationReady: true });
    const minimalParts = Object.fromEntries(allPartIds.map(partId => [partId, {
      ravScoreModel: { currentState: partId === warmupPartId ? partialPair.candidate
        : structuredClone(candidateParts[partId].ravScoreModel.currentState) },
    }]));
    assert.equal(partialPair.candidate.transportMemoryReady, false);
    delete warmup.ravScoreCandidateGRollback;
    warmup.ravScoreCandidateGWarmup = {
      schemaVersion: '1.0.0', kind: 'PRIVATE_CANDIDATE_G_MEASURED_WARMUP_RUNTIME',
      privacyClass: 'PRIVATE_PRODUCTION_RUNTIME', status: 'BUILDING_MEASURED_ONLY',
      evidencePolicy: 'MEASURED_ONLY', syntheticHistoryAllowed: false,
      sourceModelBinding: ib, candidateModelBinding: cb,
      automaticActivationAllowed: false, publicDuringNormalOperation: false,
      runtime: { schemaVersion: 1, enabled: true, status: 'BUILDING_MEASURED_ONLY',
        generatedAt: reference, modelBinding: cb, expectedPartCount: 673,
        measuredPartCount: 673, parts: minimalParts },
    };
    const packFile = '.cache/public-hour-delivery.pack';
    const inventory = [...workflow.PRIVATE_RUNTIME_FILES,
      { id: 'public-hour-delivery', relativePath: packFile }];
    const originalHours = new Map();
    async function withPublicPack(conditions, label) {
      const owned = path.join(temporary, `${label}-pack-input`);
      const live = path.join(owned, 'data', 'live');
      await fs.mkdir(path.join(live, 'forecast'), { recursive: true });
      const detailsSha = oldPublic.sha256Text(oldPublic.compactJson(oldPublic.buildPublicConditionDetails(conditions)));
      const hours = {};
      for (let i = 0; i < oldI.RAVSCORE_PUBLIC_FORECAST_HOURS; i += 1) {
        const time = new Date(Date.parse(reference) + i * 3_600_000).toISOString();
        const document = { delivery: { schemaVersion: 1, kind: 'hour', key: time,
          sourceDetailsSha256: detailsSha, modelBinding: ib },
          coastalParts: { modelBinding: ib, current: { modelId: ib.modelId,
            modelVersion: ib.modelId, modelContractSha256: ib.modelContractSha256,
            modelBundleSha256: ib.modelBundleSha256, modelBinding: ib,
            score: 50 + i / 10 } },
          weather: { time, windSpeedMps: 5 + i / 10, waterLevelM: i / 100 },
        };
        const raw = Buffer.from(`${JSON.stringify(document)}\n`);
        const digest = sha(raw);
        await fs.writeFile(path.join(live, 'forecast', `${digest}.json`), raw, { flag: 'wx' });
        hours[time] = { path: `./forecast/${digest}.json`, sha256: digest, bytes: raw.length };
        originalHours.set(label + ':' + time, document);
      }
      const startupNationalForecast = { schemaVersion: 2, modelBinding: ib,
        dates: ['2026-10-11'], modes: { waders: [{ date: '2026-10-11', rows:
          Array.from({ length: 20 }, (_, i) => ({ zoneId: zoneIds[i], name: `Controlled ${i}`,
            score: 70 - i, bestTime: reference })) }], beach: [] } };
      const packPath = path.join(owned, packFile);
      const built = await pack.buildPrivatePublicHourDeliveryPack({
        liveDirectory: live,
        publicManifest: { datasetId, productionReferenceAt: reference,
          publicConditionDetailsSha256: detailsSha, ravScoreModelBinding: ib,
          detailDelivery: { schemaVersion: 1, sourceDetailsSha256: detailsSha, hours } },
        startupNationalForecast, outputPath: packPath,
      });
      conditions.publicHourDelivery = built.marker;
      return { conditions, packPath, label };
    }
    const rollbackFixture = await withPublicPack(baseline, 'rollback');
    const warmupFixture = await withPublicPack(warmup, 'warmup');
    async function sealedScenario(fixture, label) {
      const root = path.join(temporary, label);
      const input = path.join(root, 'input');
      await fs.mkdir(input, { recursive: true });
      for (const item of workflow.PRIVATE_RUNTIME_FILES) {
        const file = path.join(input, item.relativePath);
        await fs.mkdir(path.dirname(file), { recursive: true });
        if (item.id === 'full-conditions') {
          await normalMigrant.atomicWriteJson(file, hourly.packPrivateConditionsHourly(fixture.conditions));
        } else await fs.writeFile(file, `${JSON.stringify({ controlledOnly: true, id: item.id })}\n`, { flag: 'wx' });
      }
      await fs.mkdir(path.join(input, '.cache'), { recursive: true });
      await fs.copyFile(fixture.packPath, path.join(input, packFile));
      const bundlePath = path.join(root, 'bundle');
      const built = await oldBundle.createPrivateProductionRuntimeBundle({
        privateRoot: temporary, bundlePath, repositoryRoot,
        metadata: { datasetId, productionReferenceAt: reference, generatedAt,
          generationId: label, zoneCount: 210, partCount: 673, modelBinding: ib,
          contractHashes: policy.sourceContractHashes, privacyClass: 'PRIVATE_PRODUCTION_RUNTIME' },
        files: inventory.map(item => ({ ...item, sourcePath: path.join(input, item.relativePath),
          privacyClass: 'PRIVATE_PRODUCTION_RUNTIME' })),
      });
      assert.equal(built.fileCount, 10);
      const manifestPath = path.join(bundlePath, 'manifest.json');
      const manifestRaw = await fs.readFile(manifestPath);
      const manifest = JSON.parse(manifestRaw);
      const pointerPolicy = protectedRuntime.PROTECTED_PRIVATE_RUNTIME_POLICY;
      const objectSha256 = sha(manifestRaw);
      // Controlled GET-only pointer transport from the existing descriptor
      // tests. No protected storage object/GCM or cloud authenticity is claimed.
      const descriptor = { schemaVersion: pointerPolicy.schemaVersion,
        kind: pointerPolicy.descriptorKind, privacyClass: pointerPolicy.privacyClass,
        bucketId: pointerPolicy.bucketId, objectSha256, objectBytes: manifestRaw.length,
        objectCount: 1, objects: [{ index: 0, objectSha256, objectBytes: manifestRaw.length,
          objectPath: `bundles/sha256/${objectSha256}/part-000-${objectSha256}.json.gz.part` }],
        bundleContentSha256: built.bundleContentSha256, datasetId,
        productionReferenceAt: reference, generatedAt, sourceHead: base,
        modelBinding: ib, contractHashes: policy.sourceContractHashes };
      const pointer = { document_key: pointerPolicy.documentKey, version: 1,
        payload: { schemaVersion: pointerPolicy.schemaVersion, kind: pointerPolicy.pointerKind,
          current: descriptor, previous: null } };
      const pointerBefore = JSON.stringify(pointer);
      const request = async (_suffix, options = {}) => {
        assert.equal(options.method ?? 'GET', 'GET');
        return [structuredClone(pointer)];
      };
      const current = await protectedRuntime.describeCurrentProtectedPrivateProductionRuntime({ request });
      const sourceDescriptionPath = path.join(root, 'current-description.json');
      const expectedPath = path.join(root, 'expected.json');
      const githubOutputPath = path.join(root, 'github-output.txt');
      await fs.writeFile(sourceDescriptionPath, `${JSON.stringify(current)}\n`, { flag: 'wx' });
      await fs.writeFile(githubOutputPath, '', { flag: 'wx' });
      const prepared = await prepare.prepareHistoricalWavePredecessorRestore({
        sourceDescriptionPath, outputPath: expectedPath, githubOutputPath, targetReferenceAt, now });
      assert.equal(prepared.transitionKind, 'current-grid-sampling-original');
      const expected = JSON.parse(await fs.readFile(expectedPath, 'utf8'));
      const restoredDescription = await protectedRuntime.describeTargetProtectedPrivateProductionRuntime({
        request, targetReferenceAt: reference, datasetId, bundleContentSha256: built.bundleContentSha256 });
      assert.equal(restoredDescription.kind, policy.restoredSourceDescriptionKind);
      assert.strictEqual(secondRestore.secondRestoreExpectation({ expected,
        source: restoredDescription, manifest }), expected);
      const verified = await bundle.verifyPrivateProductionRuntimeBundle({
        privateRoot: temporary, bundlePath, repositoryRoot, expected, now });
      assert.equal(verified.fileCount, 10);
      const restored = path.join(root, 'restored');
      await bundle.restorePrivateProductionRuntimeBundle({
        privateRoot: temporary, bundlePath, repositoryRoot, expected,
        outputPath: restored, targetReferenceAt, minimumReferenceAt: reference,
        minimumGeneratedAt: generatedAt, now });
      const descriptorPath = path.join(root, 'target-description.json');
      await fs.writeFile(descriptorPath, `${JSON.stringify(restoredDescription)}\n`, { flag: 'wx' });
      assert.equal(JSON.stringify(pointer), pointerBefore);
      const baselineDigests = new Map();
      for (const item of manifest.files) {
        const raw = await fs.readFile(path.join(restored, item.relativePath));
        assert.equal(raw.length, item.bytes);
        assert.equal(sha(raw), item.sha256);
        baselineDigests.set(item.relativePath, sha(raw));
      }
      return { root, input, bundlePath, manifestPath, manifest, expected, expectedPath,
        descriptorPath, restored, baselineDigests, fixture };
    }
    const migrate = (scenario, label, extras = {}) => normalMigrant.migratePostCutoverPrivateRuntime({
      sourceRoot: scenario.restored, outputRoot: path.join(scenario.root, label),
      bundleManifestPath: scenario.manifestPath, predecessorDescriptorPath: scenario.descriptorPath,
      predecessorRoot: null, repositoryRoot, expectedSourceHead: base,
      reportPath: path.join(scenario.root, `${label}-report.json`),
      currentGridOriginalOnly: true, currentGridOriginalExpectation: scenario.expected, ...extras,
    });
    const withoutTechnicalHashes = value => Array.isArray(value)
      ? value.map(withoutTechnicalHashes) : value && typeof value === 'object'
        ? Object.fromEntries(Object.entries(value).filter(([key]) => ![
          'modelBundleSha256', 'sourceDetailsSha256'].includes(key))
          .map(([key, child]) => [key, withoutTechnicalHashes(child)])) : value;
    const positive = [];
    for (const fixture of [rollbackFixture, warmupFixture]) {
      const scenario = await sealedScenario(fixture, `${fixture.label}-positive`);
      const report = await migrate(scenario, 'migrated');
      assert.equal(report.transitionKind, 'CURRENT_GRID_ORIGINAL_ARCHIVE_BRIDGE');
      assert.equal(report.migratedPartCount, 673);
      assert.equal(report.copiedPrivateFileCount, 10);
      assert.equal(report.repairedContinuationCount, 0);
      assert.equal(report.recomputedModeCount, 0);
      assert.equal(report.recomputedZoneCount, 0);
      assert.equal(report.publicHourDeliveryRebound, true);
      assert.equal(report.measurementsChanged, false);
      assert.equal(report.candidateStatesChanged, false);
      const persisted = JSON.parse(await fs.readFile(path.join(scenario.root, 'migrated/data/live/conditions.json'), 'utf8'));
      assert.equal(Object.hasOwn(persisted, 'privateZoneHourly'), true);
      const after = hourly.hydratePrivateConditionsHourly(persisted);
      const before = fixture.conditions;
      assert.equal(Object.keys(after.zones).length, 210);
      assert.equal(Object.keys(after.ravScoreCurrentSourceDomainTransitions.parts).length, 673);
      assert.deepEqual(after.zones, before.zones);
      assert.deepEqual(after.coastalParts.zones, before.coastalParts.zones);
      const rootName = fixture.label === 'rollback' ? 'ravScoreCandidateGRollback' : 'ravScoreCandidateGWarmup';
      for (const partId of allPartIds) {
        const { modelBundleSha256: oldHash, ...oldValues } = before.coastalParts.parts[partId].ravScoreModel.currentState;
        const { modelBundleSha256: newHash, ...newValues } = after.coastalParts.parts[partId].ravScoreModel.currentState;
        assert.equal(oldHash, ib.modelBundleSha256);
        assert.equal(newHash, currentI.ravScoreModelBinding().modelBundleSha256);
        assert.deepEqual(newValues, oldValues);
        assert.deepEqual(after[rootName].runtime.parts[partId].ravScoreModel.currentState,
          before[rootName].runtime.parts[partId].ravScoreModel.currentState);
        const record = after.ravScoreCurrentSourceDomainTransitions.parts[partId];
        const previous = firstRecords[partId];
        if (previous) assert.deepEqual(record, previous);
        else {
          assert.deepEqual(record.originalIntegratedState, before.coastalParts.parts[partId].ravScoreModel.currentState);
          assert.deepEqual(record.originalCandidateGState, before[rootName].runtime.parts[partId].ravScoreModel.currentState);
        }
        if (excluded.includes(before.coastalParts.parts[partId].zoneId)) {
          assert.equal(record.kind, 'PRIVATE_OWNER_CURRENT_SOURCE_TRANSITION');
          assert.equal(record.excludedCollection, 'dkss_lf');
        } else assert.equal(record.kind, 'PRIVATE_CURRENT_DECODER_TRANSITION');
      }
      if (fixture.label === 'warmup') {
        assert.deepEqual(Object.keys(after[rootName].runtime.parts[warmupPartId]), ['ravScoreModel']);
        assert.deepEqual(Object.keys(after[rootName].runtime.parts[warmupPartId].ravScoreModel), ['currentState']);
      }
      assert.deepEqual(after.publicHourDelivery.startupNationalForecast.modes,
        before.publicHourDelivery.startupNationalForecast.modes);
      const readback = path.join(scenario.root, 'migrated-public-hour-readback');
      const materialized = await pack.materializePrivatePublicHourDeliveryPack({
        packPath: path.join(scenario.root, 'migrated', packFile), conditions: after, liveDirectory: readback });
      for (const [time, entry] of Object.entries(materialized.hours)) {
        const document = JSON.parse(await fs.readFile(path.join(readback, entry.path.replace(/^\.\//, '')), 'utf8'));
        assert.deepEqual(withoutTechnicalHashes(document),
          withoutTechnicalHashes(originalHours.get(fixture.label + ':' + time)));
        assert.deepEqual(document.delivery.modelBinding, currentI.ravScoreModelBinding());
      }
      for (const item of inventory) {
        const originalRaw = await fs.readFile(path.join(scenario.restored, item.relativePath));
        assert.equal(sha(originalRaw), scenario.baselineDigests.get(item.relativePath));
        const archivedRaw = await fs.readFile(path.join(scenario.bundlePath, 'payload', item.relativePath));
        assert.equal(sha(archivedRaw), scenario.baselineDigests.get(item.relativePath));
        if (!['full-conditions', 'public-hour-delivery'].includes(item.id)) {
          assert.equal(sha(await fs.readFile(path.join(scenario.root, 'migrated', item.relativePath))), sha(originalRaw));
        }
      }
      positive.push({ label: fixture.label, parts: report.migratedPartCount,
        publicHours: Object.keys(materialized.hours).length, firstRecords: Object.keys(firstRecords).length });
    }
    const negatives = [];
    const failures = [];
    async function mustReject(label, scenario, expectedPattern, extras = {}) {
      try {
        await migrate(scenario, `rejected-${label}`, extras);
        failures.push(`${label}: unexpectedly accepted`);
      } catch (error) {
        if (!expectedPattern.test(error.message)) failures.push(`${label}: wrong rejection: ${error.message}`);
        else negatives.push(label);
      }
    }
    for (const [label, mutate, pattern] of [
      ['missing-part', value => { delete value.coastalParts.parts[allPartIds[0]]; }, /exact canonical national generation/],
      ['corrupt-original', value => {
        value.coastalParts.parts[allPartIds[0]].ravScoreModel.currentState.currentEvidence.at(-1).strength += 0.05;
      }, /originals rejected|contradicts its signed current evidence/],
      ['repairable-original', value => {
        const state = value.coastalParts.parts[allPartIds[0]].ravScoreModel.currentState;
        state.historyBounds.lastMile.lastUnknownAt = state.time;
        state.historyBounds.lastMile.conservativeResetAt = null;
        state.historyBounds.lastMile.minimumFactorTrack = { activityMoment: 1, normalMoment: -1 };
        state.historyBounds.lastMile.maximumFactorTrack = { activityMoment: 1, normalMoment: -1 };
        const identity = oldStage.coastalPointStageIdentity(value.coastalParts.parts[allPartIds[0]]);
        const oldRepair = oldPipeline.buildIntegratedRavScoreStateSeries([], {
          samplingContextKey: identity.samplingContextKey, initialState: state });
        assert.equal(oldRepair.initialStateAccepted, true);
        assert.notDeepEqual(oldRepair.continuationState, state);
      }, /originals rejected|canonical unrepaired predecessor/],
      ['stale-outside-archive', value => {
        value.unrelatedPreserved = { currentState: { modelBundleSha256: ib.modelBundleSha256 } };
      }, /left old bundle hashes/],
      ['corrupt-first-original', value => {
        // Independently illegal range; no saturation-dependent causal oracle.
        value.ravScoreCurrentSourceDomainTransitions.parts[Object.keys(firstRecords)[0]]
          .originalIntegratedState.currentEvidence.at(-1).strength = 2;
      }, /invalid original pair|signed current evidence/],
    ]) {
      const conditions = structuredClone(rollbackFixture.conditions);
      mutate(conditions);
      const scenario = await sealedScenario({ ...rollbackFixture, conditions }, `negative-${label}`);
      await mustReject(label, scenario, pattern);
    }
    const identityScenario = await sealedScenario(rollbackFixture, 'negative-identity');
    await mustReject('missing-expectation', identityScenario, /exact original expectation/,
      { currentGridOriginalExpectation: null });
    await mustReject('mixed-original-policy', identityScenario, /policies|policy.*incompatible/,
      { ownerCurrentOriginalOnly: true });
    // Concrete integrity oracle: files changed AFTER a valid normal restore
    // must not be silently accepted as the originals in the sealed manifest.
    const altered = hourly.hydratePrivateConditionsHourly(JSON.parse(await fs.readFile(
      path.join(identityScenario.restored, 'data/live/conditions.json'), 'utf8')));
    altered.zones[zoneIds[0]].forecast.hourly[0].windSpeedMps += 0.01;
    await normalMigrant.atomicWriteJson(path.join(identityScenario.restored, 'data/live/conditions.json'),
      hourly.packPrivateConditionsHourly(altered));
    await mustReject('input-changed-after-restore', identityScenario,
      /manifest|digest|hash|authenticated|changed.*restore|sealed original bytes/i);
    // Changed descriptor rows cannot retain the old sealed bundle content hash.
    const tamperScenario = await sealedScenario(rollbackFixture, 'negative-sealed-row');
    const tamperedManifest = structuredClone(tamperScenario.manifest);
    tamperedManifest.files.find(item => item.id === 'full-conditions').sha256 = sha('controlled-wrong-sealed-row');
    const tamperedManifestPath = path.join(tamperScenario.root, 'tampered-manifest.json');
    await fs.writeFile(tamperedManifestPath, `${JSON.stringify(tamperedManifest)}\n`, { flag: 'wx' });
    await mustReject('sealed-descriptor-row-changed', tamperScenario, /sealed manifest is invalid/,
      { bundleManifestPath: tamperedManifestPath });
    // Even unchanged parsed JSON must retain the original full-conditions bytes.
    const bytesScenario = await sealedScenario(rollbackFixture, 'negative-conditions-bytes');
    const bytesPath = path.join(bytesScenario.restored, 'data/live/conditions.json');
    const originalBytes = await fs.readFile(bytesPath);
    await fs.appendFile(bytesPath, '\n');
    assert.deepEqual(JSON.parse(await fs.readFile(bytesPath, 'utf8')), JSON.parse(originalBytes));
    assert.equal((await fs.stat(bytesPath)).size, originalBytes.length + 1);
    await mustReject('conditions-original-byte-count', bytesScenario, /sealed original bytes/);
    // Same byte count is not enough: independently exercise the same-read SHA.
    const sameSizeScenario = await sealedScenario(rollbackFixture, 'negative-same-size-digest');
    const sameSizePath = path.join(sameSizeScenario.restored, 'data/live/conditions.json');
    const sameSizeBefore = await fs.readFile(sameSizePath);
    const sameSizeAfter = Buffer.from(sameSizeBefore.toString('utf8')
      .replace('CONTROLLED_TEST_ONLY', 'CONTROLLED_TEST_ONLX'));
    assert.equal(sameSizeAfter.length, sameSizeBefore.length);
    assert.notEqual(sha(sameSizeAfter), sha(sameSizeBefore));
    assert.doesNotThrow(() => JSON.parse(sameSizeAfter));
    await fs.writeFile(sameSizePath, sameSizeAfter);
    await mustReject('conditions-original-same-size-digest', sameSizeScenario, /sealed original bytes/);
    // Non-conditions base files must also bind to their actual sealed row.
    const copyScenario = await sealedScenario(rollbackFixture, 'negative-other-file-bytes');
    const copyPath = path.join(copyScenario.restored, 'data/live/weather-health.json');
    const copyBefore = await fs.readFile(copyPath);
    await fs.appendFile(copyPath, '\n');
    assert.deepEqual(JSON.parse(await fs.readFile(copyPath, 'utf8')), JSON.parse(copyBefore));
    await mustReject('other-original-file-byte-count', copyScenario, /weather-health sealed original input/);
    const oldGraph = [...oldLoaded].sort().map(relative => [relative, sha(oldBodies.get(relative))]);
    console.log(JSON.stringify({ scope: 'CONTROLLED_NORMAL_MIGRANT_CASE_NOT_PRODUCTION_BS',
      positive, rejected: negatives, failures, oldSourceCommit: base,
      oldSourceModuleCount: oldGraph.length, oldSourceGraphSha256: sha(JSON.stringify(oldGraph)),
      sourceJson: { oldRawBytes: oldJsonRaw.length, oldRawSha256: sha(oldJsonRaw),
        actualRawBytes: actualJsonRaw.length, actualRawSha256: sha(actualJsonRaw),
        normalizedEqual: true, rawEqual: oldJsonRaw.equals(actualJsonRaw) },
      tests: 1, skipped: 0, productionOrCloudWrite: false }));
    assert.deepEqual(failures, [], 'Controlled normal migrant contract failures');
  } finally {
    oldHook.deregister();
    await fs.rm(temporary, { recursive: true, force: true });
  }
}
