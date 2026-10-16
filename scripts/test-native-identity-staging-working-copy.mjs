import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import test from 'node:test';
import { withFrozenI71Source } from './check-native-identity-frozen-i71-source.mjs';
import { ravScoreModelBinding } from '../js/core/ravscore-model-contract.js';
import * as current from './lib/coastal-point-staging-contract.mjs';
import { PRIVATE_WEATHER_COMPONENT_FILES as FILES } from './lib/private-weather-component-inventory.mjs';
import { NATIVE_IDENTITY_STAGING_PATHS, rebindNativeIdentityStagingWorkingCopy }
  from './lib/native-identity-staging-working-copy.mjs';

const sha = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const encode = value => Buffer.from(JSON.stringify(value, null, 2) + '\n');
const time = '2026-10-15T16:00:00.000Z';
async function fixture() {
  const registry = JSON.parse(await fs.readFile('data/live/coastal-parts-v2.json', 'utf8'));
  const [zoneId, original] = Object.entries(registry.zones).flatMap(([id, parts]) => parts.map(part => [id, part]))[0];
  const part = { ...original, waterPoint: [original.waterPoint[0] + 0.0001, original.waterPoint[1]] };
  part.onshoreDirectionDeg = current.bearing(part.waterPoint, part.landPoint);
  const revision = 'controlled-native-identity-staging', stageId = `STAGED::${revision}::${part.partId}`;
  const direction = { schemaVersion: 3, zones: { [zoneId]: { status: 'verified',
    partOverrides: { [part.partId]: original }, stagedChange: { revision, status: 'activation-requested',
      partOverrides: { [part.partId]: part } } } } };
  return withFrozenI71Source(async root => {
    const load = relative => import(pathToFileURL(path.join(root, relative)).href);
    const [old, model, integrated, candidate] = await Promise.all([
      load('scripts/lib/coastal-point-staging-contract.mjs'), load('js/core/ravscore-model-contract.js'),
      load('js/core/ravscore-integrated-state-pipeline.js'), load('js/core/ravscore-candidate-g-state-pipeline.js'),
    ]);
    const identity = old.coastalPointStageIdentity(part), ib = model.ravScoreModelBinding();
    const samples = Array.from({ length: 49 }, (_, index) => ({
      time: new Date(Date.parse(time) - (48 - index) * 3_600_000).toISOString(),
      currentSpeedMps: .054, currentAlignment: 1, currentVerified: true,
      waveHeightM: 1, wavePeriodS: 6, waveDirectionDeg: 270,
    }));
    const state = integrated.buildIntegratedRavScoreStateSeries(samples, {
      samplingContextKey: identity.samplingContextKey, onshoreDirectionDeg: part.onshoreDirectionDeg }).continuationState;
    const companion = candidate.buildCandidateGDerivedStateSeries(samples, { stateKey: identity.expectedCandidateGStateKey }).continuationState;
    old.assertIntegratedCoastalPointContinuation(state, { samplingContextKey: identity.samplingContextKey, requireReady: true });
    old.assertCandidateGCoastalPointRollbackContinuation(companion, identity.expectedCandidateGStateKey, { requireReady: true });
    // Actual current normal validator must reject this untouched old state.
    assert.throws(() => current.assertCoastalPointStageModelBinding(ib));
    assert.throws(() => current.assertIntegratedCoastalPointContinuation(state, { samplingContextKey: identity.samplingContextKey }));
    const injection = { schemaVersion: 3, ravScoreModelBinding: ib, preparedAt: time,
      statePairs: { [part.partId]: old.buildCoastalPointActivationStatePair({ partId: part.partId,
        samplingContextKey: identity.samplingContextKey, expectedCandidateGStateKey: identity.expectedCandidateGStateKey,
        integratedState: state, candidateGState: companion }) } };
    old.assertCoastalPointActivationStateInjection(injection);
    const source = { provider: 'dmi', fallback: false, collection: 'dkss_idw', collectionFamily: 'marine',
      component: 'current', componentKind: 'ocean-current-vector', fieldSet: ['current-u', 'current-v'], optionalFieldSet: [],
      modelRun: time, nativeValidTime: time, leadTimeHours: 0, entityId: stageId, parentZoneId: zoneId,
      entityType: 'private-stage', samplingContext: 'private-stage-water-point', samplingPoint: [...part.waterPoint],
      gridPoint: [...part.waterPoint], gridDefinitionSha256: 'b'.repeat(64), distanceKm: 0,
      spatialSelection: 'nearest-shared-grid-cell-no-spatial-interpolation', spatialSemanticsVersion: 1,
      vectorSelection: 'nearest-shared-uv-column-across-dmi-collections-then-deepest-valid-layer', vectorSemanticsVersion: 3,
      verticalLayer: 'depth:1', verticalLayerRankM: 1, itemId: 'controlled-own-staging-current',
      assetIdentitySha256: 'a'.repeat(64), acquiredAt: time };
    const documents = new Map([
      [FILES.coastalPointDmi, { schemaVersion: 1, generatedAt: time, timeStrideHours: 3,
        currentVectorSemanticsVersion: 3, currentVectorSelection: source.vectorSelection, currentMaxDistanceKm: 5,
        candidates: { [stageId]: { revision, zoneId, partId: part.partId, waterPoint: part.waterPoint,
          landPoint: part.landPoint, onshoreDirectionDeg: part.onshoreDirectionDeg, activationRequested: true } },
        zones: { [stageId]: { samplingPoint: part.waterPoint, hourly: { [time]: { time,
          'current-u': .123456789012345, 'current-v': -.876543210987654, sources: { current: source } } } } } }],
      [FILES.coastalPointState, { schemaVersion: 3, ravScoreModelBinding: ib, updatedAt: time,
        diagnosticUnknown: { retained: true, numeric: .123456789012345, reason: null },
        stages: { [stageId]: { revision, partId: part.partId, samplingContextKey: identity.samplingContextKey,
          ravScoreModelBinding: ib, continuationState: state, candidateGRollbackContinuationState: companion,
          initialStateSource: 'INTEGRATED_CONTINUATION', reasonCodes: ['CONTROLLED_PRESERVE_ME'], updatedAt: time } } }],
      [FILES.coastalPointStatus, { schemaVersion: 3, ravScoreModelBinding: ib, generatedAt: time,
        automaticActivationAllowed: false, entries: [{ stageId, zoneId, partId: part.partId, revision,
          samplingContextKey: identity.samplingContextKey, ravScoreModelBinding: ib, checkedAt: time,
          status: 'ready-for-activation', reasonCodes: [], currentMemoryReady: true, waveMemoryReady: true,
          lastMileMemoryReady: true, candidateGRollbackReady: true, dualStateTargetBound: true }] }],
      [FILES.coastalPointActivationState, injection],
      [FILES.coastalPointPendingPromotion, { schemaVersion: 1, preparedAt: time, documentKey: 'direction-reviews',
        expectedVersion: 42, revisions: [revision], partIds: [part.partId],
        payload: old.promotedDirectionDocument(direction, old.stagedEntries(direction, registry), time) }],
    ]);
    return { registry, direction, documents, part, stageId, ib };
  });
}

test('fixed old staging is preserved through real normal validators into a separate NO_ADMISSION working copy', async () => {
  const f = await fixture(), temp = await fs.mkdtemp(path.join(await fs.realpath(os.tmpdir()), 'rr-native-staging-'));
  const sourceRoot = path.join(temp, 'source'), adminRoot = path.join(temp, 'admin');
  const write = async (root, relative, bytes) => { const filename = path.join(root, relative);
    await fs.mkdir(path.dirname(filename), { recursive: true }); await fs.writeFile(filename, bytes); };
  const options = { sourceRoot, adminRoot, privateRoot: temp, outputRoot: path.join(temp, 'output') };
  try {
    await fs.mkdir(sourceRoot); await fs.mkdir(adminRoot);
    await write(adminRoot, 'data/admin/direction-reviews.json', encode(f.direction));
    await write(adminRoot, 'data/live/coastal-parts-v2.json', encode(f.registry));
    const empty = await rebindNativeIdentityStagingWorkingCopy({ ...options, outputRoot: path.join(temp, 'empty') });
    assert.equal(empty.admission, 'NO_ADMISSION'); assert.deepEqual(empty.files, []);
    assert.deepEqual(empty.absentPaths, NATIVE_IDENTITY_STAGING_PATHS);
    assert.deepEqual(await fs.readdir(path.join(temp, 'empty')), []);
    for (const [relative, document] of f.documents) await write(sourceRoot, relative, encode(document));
    const before = new Map(await Promise.all(NATIVE_IDENTITY_STAGING_PATHS.map(async relative =>
      [relative, await fs.readFile(path.join(sourceRoot, relative))])));
    const result = await rebindNativeIdentityStagingWorkingCopy(options);
    assert.equal(result.admission, 'NO_ADMISSION'); assert.equal(result.installationPerformed, false);
    assert.equal(result.originalsUnchanged, true); assert.deepEqual(result.absentPaths, []);
    assert.equal(result.files.length, 5); assert.equal(result.adminInputs.length, 2);
    for (const record of result.files) {
      const original = await fs.readFile(path.join(sourceRoot, record.relativePath)), output = await fs.readFile(record.sourcePath);
      assert.deepEqual(original, before.get(record.relativePath));
      assert.equal(record.originalBytes, original.length); assert.equal(record.originalSha256, sha(original));
      assert.equal(record.bytes, output.length); assert.equal(record.sha256, sha(output));
      if ([FILES.coastalPointDmi, FILES.coastalPointPendingPromotion].includes(record.relativePath)) assert.deepEqual(output, original);
    }
    const state = JSON.parse(await fs.readFile(path.join(options.outputRoot, FILES.coastalPointState), 'utf8'));
    const stage = state.stages[f.stageId], oldStage = f.documents.get(FILES.coastalPointState).stages[f.stageId];
    assert.equal(stage.continuationState.modelBundleSha256, ravScoreModelBinding().modelBundleSha256);
    current.assertIntegratedCoastalPointContinuation(stage.continuationState, { samplingContextKey: stage.samplingContextKey });
    assert.deepEqual(stage.candidateGRollbackContinuationState, oldStage.candidateGRollbackContinuationState);
    state.ravScoreModelBinding = f.ib; stage.ravScoreModelBinding = f.ib;
    stage.continuationState.modelBundleSha256 = f.ib.modelBundleSha256;
    assert.deepEqual(state, f.documents.get(FILES.coastalPointState), 'Whole inverse preserves numeric/times/context/unknown fields');
    const injection = JSON.parse(await fs.readFile(path.join(options.outputRoot, FILES.coastalPointActivationState), 'utf8'));
    current.assertCoastalPointActivationStateInjection(injection);
    const pair = injection.statePairs[f.part.partId], oldPair = f.documents.get(FILES.coastalPointActivationState).statePairs[f.part.partId];
    assert.notEqual(pair.integratedStateSha256, oldPair.integratedStateSha256);
    assert.notEqual(pair.pairSha256, oldPair.pairSha256);
    assert.equal(pair.candidateGStateSha256, oldPair.candidateGStateSha256);
    assert.equal(pair.targetReferenceAt, oldPair.targetReferenceAt);
    await assert.rejects(rebindNativeIdentityStagingWorkingCopy(options), /OUTPUT_EXISTS/);
    const mutations = [
      [FILES.coastalPointState, value => { value.ravScoreModelBinding.modelBundleSha256 = 'f'.repeat(64); }],
      [FILES.coastalPointState, value => { value.stages[f.stageId].samplingContextKey = 'sha256:' + 'f'.repeat(64); }],
      [FILES.coastalPointState, value => { value.stages[f.stageId].continuationState.currentEvidence[0].strength = Infinity; }],
      [FILES.coastalPointStatus, value => { value.entries[0].partId = 'FOREIGN'; }],
      [FILES.coastalPointActivationState, value => { value.statePairs[f.part.partId].pairSha256 = 'sha256:' + 'f'.repeat(64); }],
      [FILES.coastalPointDmi, value => { value.currentVectorSemanticsVersion = 999; }],
      [FILES.coastalPointDmi, value => { delete value.zones[f.stageId].hourly[time]['current-v']; }],
      [FILES.coastalPointPendingPromotion, value => { value.documentKey = 'other-admin-document'; }],
    ];
    for (const [index, [relative, mutate]] of mutations.entries()) {
      const wrong = structuredClone(f.documents.get(relative)); mutate(wrong); await write(sourceRoot, relative, encode(wrong));
      const outputRoot = path.join(temp, 'rejected-' + index);
      await assert.rejects(rebindNativeIdentityStagingWorkingCopy({ ...options, outputRoot }));
      await assert.rejects(fs.lstat(outputRoot), { code: 'ENOENT' });
      await write(sourceRoot, relative, before.get(relative));
    }
    for (const [relative, bytes] of before) assert.deepEqual(await fs.readFile(path.join(sourceRoot, relative)), bytes);
  } finally {
    assert.equal(path.dirname(temp), await fs.realpath(os.tmpdir()));
    assert(path.basename(temp).startsWith('rr-native-staging-'));
    await fs.rm(temp, { recursive: true });
  }
});
