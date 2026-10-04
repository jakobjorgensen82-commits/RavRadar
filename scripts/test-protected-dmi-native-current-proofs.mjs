import test from 'node:test';
import assert from 'node:assert/strict';
import { buildDmiForecastHourly } from './lib/dmi-forecast-store.mjs';
import { buildRavScoreProductionPartSeries, ravScoreOwnerCurrentHistoryStartAt,
  retainOwnerCurrentTransitionOriginal } from './lib/ravscore-production-part-pipeline.mjs';
import * as productionPipeline from './lib/ravscore-production-part-pipeline.mjs';
import { buildIntegratedPartScoreSeries } from './lib/ravscore-integrated-runtime.mjs';
import { buildCandidateGRollbackPartScoreSeries } from './lib/ravscore-candidate-g-rollback-runtime.mjs';
import { buildRavScorePermittedCurrentHistory } from './lib/ravscore-recovery-replay.mjs';
import { buildCoastalPointActivationStatePair, candidateGStateKey,
  selectCoastalPointCandidateGRollbackContinuation } from './lib/coastal-point-staging-contract.mjs';
import { ravScoreSamplingContextKey } from './lib/ravscore-sampling-context.mjs';
import { RAVSCORE_MEASURED_COLD_ROLLBACK_DISPOSITION } from './lib/ravscore-recovery-replay.mjs';
import { dmiExpectedIdentityForPart, verifiedBulkCurrent, eligibleBulkCurrent,
  eligibleDmiForecastComponentSource, eligibleDmiNativeComponentSource,
  verifiedIntegratedPartHourly } from './lib/ravscore-production-adapters.mjs';
import { PROTECTED_DMI_NATIVE_PROOF_LIMITS, buildProtectedDmiNativeCurrentProofs,
  createProtectedDmiNativeCurrentInspector, validateProtectedDmiNativeCurrentProofs,
  verifyProtectedDmiNativeCurrentProof } from './lib/protected-dmi-native-current-proofs.mjs';

const HOUR = 3_600_000;
test('owner current source policy is inventoried without changing the private storage ABI', async () => {
  const { PRIVATE_RUNTIME_PRODUCER_SOURCE_FILES, PRIVATE_RUNTIME_CONTRACT_FILES } =
    await import('./private-production-runtime-workflow.mjs');
  for (const source of ['scripts/lib/dmi-marine-zone-exclusions.mjs',
    'scripts/lib/dmi-marine-zone-exclusions.json']) {
    assert.ok(PRIVATE_RUNTIME_PRODUCER_SOURCE_FILES.includes(source),
      'the actual owner policy must be part of producer review');
  }
  assert.deepEqual(PRIVATE_RUNTIME_CONTRACT_FILES.fullRuntimeContractSha256,
    ['scripts/lib/private-weather-storage-abi.json'],
    'producer policy must not disguise itself as a changed persisted storage format');
});
const epoch = Date.parse('2026-09-01T00:00:00.000Z');
const at = offset => new Date(epoch + offset * HOUR).toISOString();
const copy = value => JSON.parse(JSON.stringify(value));
const vectorSelection = 'nearest-shared-uv-column-across-dmi-collections-then-deepest-valid-layer';
function fixture({ partId = 'SYNTHETIC-PART', nativeHours = [0, 3], target = 1, run = -12,
  pythonTime = false, zoneId = 'SYNTHETIC-ZONE', collection = 'dkss_idw' } = {}) {
  const part = { partId, zoneId, waterPoint: [8, 55] };
  const expected = dmiExpectedIdentityForPart(part);
  const hourly = {};
  const nativeAt = hour => pythonTime === 'offset' ? at(hour).replace('.000Z', '+00:00')
    : pythonTime ? at(hour).replace('.000Z', 'Z') : at(hour);
  for (const hour of nativeHours) {
    const time = nativeAt(hour);
    const source = { provider: 'dmi', fallback: false, collection, collectionFamily: 'marine',
      component: 'current', componentKind: 'ocean-current-vector', fieldSet: ['current-u', 'current-v'],
      optionalFieldSet: [], modelRun: nativeAt(run), nativeValidTime: time, leadTimeHours: hour - run,
      ...expected, gridPoint: [8, 55], gridDefinitionSha256: 'b'.repeat(64), distanceKm: 0,
      spatialSelection: 'nearest-shared-grid-cell-no-spatial-interpolation', spatialSemanticsVersion: 1,
      vectorSelection, vectorSemanticsVersion: 3, verticalLayer: 'depth:1', verticalLayerRankM: 1,
      itemId: `synthetic-${partId}-${hour}`, assetIdentitySha256: 'a'.repeat(64),
      contentSha256: 'c'.repeat(64), acquiredAt: nativeAt(-1), itemUpdatedAt: nativeAt(run + 1) };
    hourly[time] = { time, 'current-u': 0.123456 + hour / 1000,
      'current-v': 0.234567 + hour / 1000, sources: { current: source } };
  }
  const bulk = { generatedAt: nativeAt(0), currentVectorSemanticsVersion: 3,
    currentVectorSelection: vectorSelection, currentMaxDistanceKm: 5, timeStrideHours: 3,
    zones: { [expected.entityId]: { ...expected, hourly } } };
  const ocean = Object.values(hourly).map(row => ({ step: row.time,
    'current-u': row['current-u'], 'current-v': row['current-v'], provenance: row.sources }));
  const row = buildDmiForecastHourly({ ocean, generatedAt: at(0), startAt: at(target), hours: 1 }).hourly[0];
  return { part, row, bulk };
}
const bankFor = fixture => buildProtectedDmiNativeCurrentProofs({ selections: [fixture], contexts: [fixture.bulk] });
const inspect = (fixture, contexts = [fixture.bulk]) => createProtectedDmiNativeCurrentInspector({ contexts }).inspect(fixture);

test('owner-excluded LF stays authentic but cannot enter new or retained score input', () => {
  for (const [zoneId, collection, allowed] of [
    ['DK-B01-01', 'dkss_lf', false], ['DK-B01-02', 'dkss_lf', false],
    ['DK-B02-08', 'dkss_lf', false], ['DK-B02-09', 'dkss_lf', false],
    ['DK-B02-11', 'dkss_lf', false], ['DK-B03-01', 'dkss_lf', false],
    ['DK-B03-02', 'dkss_lf', false],
    ['DK-B01-02', 'dkss_nsbs', true], ['DK-B05-17', 'dkss_lf', true],
    ['DK-B02-10', 'dkss_lf', true], ['DK-B05-25', 'dkss_lf', true],
    ['DK-B01-03', 'dkss_lf', true],
  ]) {
    const f = fixture({ zoneId, collection });
    f.part.onshoreDirectionDeg = 90;
    const before = JSON.stringify(f);
    const identity = dmiExpectedIdentityForPart(f.part);
    const native = Object.values(f.bulk.zones[identity.entityId].hourly)[0];
    // Immutable original authentication is deliberately NOT changed by policy.
    assert.equal(verifyProtectedDmiNativeCurrentProof(bankFor(f), f).ok, true);
    assert.equal(Boolean(eligibleDmiNativeComponentSource(native.sources.current,
      native.time, 'current', identity)), allowed);
    assert.equal(Boolean(eligibleDmiForecastComponentSource(f.row.sources.current,
      f.row.time, 'current', identity)), allowed);
    assert.equal(Boolean(eligibleBulkCurrent(f.bulk, f.bulk.zones[identity.entityId],
      f.part.waterPoint, f.row.sources.current, f.row.time, identity)), allowed);
    const sanitized = verifiedIntegratedPartHourly({ hourly: [f.row] },
      f.bulk, identity.entityId, f.part)[0];
    assert.equal(Number.isFinite(sanitized.currentUMps), allowed, `${zoneId}/${collection}`);
    assert.equal(JSON.stringify(f), before, 'original input must remain byte-neutral');
  }
});

test('normal two-model caller enforces the owner source domain on selected public input', async t => {
  for (const [zoneId, collection, allowed] of [
    ['DK-B01-01', 'dkss_lf', false], ['DK-B01-02', 'dkss_lf', false],
    ['DK-B02-08', 'dkss_lf', false], ['DK-B02-09', 'dkss_lf', false],
    ['DK-B02-11', 'dkss_lf', false], ['DK-B03-01', 'dkss_lf', false],
    ['DK-B03-02', 'dkss_lf', false],
    ['DK-B01-01', 'dkss_nsbs', true], ['DK-B01-02', 'dkss_nsbs', true],
    ['DK-B05-17', 'dkss_lf', true], ['DK-B01-03', 'dkss_lf', true],
  ]) await t.test(`${zoneId}/${collection}`, () => {
    const f = fixture({ zoneId, collection, nativeHours: [0], target: 0 });
    f.part.onshoreDirectionDeg = 90;
    f.row.currentProvenance = { ...f.row.sources.current, status: 'verified' };
    const before = JSON.stringify(f);
    assert.equal(verifyProtectedDmiNativeCurrentProof(bankFor(f), f).ok, true);
    const build = () => buildRavScoreProductionPartSeries({
      part: f.part,
      zone: { id: zoneId, onshoreDirectionDeg: 90 },
      initialSelection: { state: null, source: 'COLD_START',
        candidateGSourceDisposition: RAVSCORE_MEASURED_COLD_ROLLBACK_DISPOSITION },
      candidateGRollbackMeasuredColdStart: true,
      targetReferenceAt: at(0), recoverySources: [], publicHourly: [f.row],
    });
    if (!allowed) assert.throws(build,
      error => error?.code === 'RAVSCORE_CURRENT_SOURCE_DOMAIN_EXCLUDED');
    else {
      const result = build();
      assert.deepEqual(result.scores.map(row => row.time), [at(0)]);
      assert.deepEqual(result.candidateGRollbackScores.map(row => row.time), [at(0)]);
    }
    assert.equal(JSON.stringify(f), before, 'original native input and proof are not rewritten');
  });
});

test('normal two-model continuation rebuilds only permitted current and preserves its original pair', async t => {
  for (const zoneId of ['DK-B01-01', 'DK-B01-02']) for (const [label, nativeHours, ready] of [
    ['partial', [48, 49], false],
    ['complete', Array.from({ length: 50 }, (_, i) => i), true],
    ['no-old-source-proof', [49], false],
  ]) await t.test(`${zoneId}/${label}`, () => {
    const old = fixture({ zoneId, collection: 'dkss_lf', target: 48,
      nativeHours: Array.from({ length: 49 }, (_, i) => i), run: -60 });
    old.part.onshoreDirectionDeg = 90;
    const zone = { id: zoneId, onshoreDirectionDeg: 90 };
    const oldHourly = Array.from({ length: 49 }, (_, hour) => {
      const f = fixture({ zoneId, collection: 'dkss_lf', target: hour,
        nativeHours: [hour], run: -60 });
      return { ...f.row, currentProvenance: { ...f.row.sources.current, status: 'verified' },
        currentCoastNormalSpeedMps: f.row.currentUMps,
        windSpeedMps: 8, windDirectionDeg: 270, waveHeightM: 1.2,
        wavePeriodS: 6, waveDirectionDeg: 90, waveProvenance: { status: 'verified' },
        waterLevelCm: 0, waterLevelTrendCm3h: 0 };
    });
    // Existing physical builders construct a genuine old synthetic state;
    // neither its source nor its sampling/model binding is relabelled.
    const integrated = buildIntegratedPartScoreSeries({ part: old.part, zone,
      hourly: oldHourly }).ravScoreState.continuationState;
    const candidate = buildCandidateGRollbackPartScoreSeries({ part: old.part, zone,
      hourly: oldHourly, measuredColdStart: true }).candidateGState.continuationState;
    assert.equal(integrated.currentMemoryReady, true);
    assert.equal(candidate.transportMemoryReady, true);
    const snapshot = JSON.stringify({ integrated, candidate });
    const permitted = fixture({ zoneId, collection: 'dkss_nsbs', nativeHours,
      target: nativeHours[0], run: -60 });
    permitted.part.onshoreDirectionDeg = 90;
    const identity = dmiExpectedIdentityForPart(permitted.part);
    const allowedHourly = verifiedIntegratedPartHourly({ point: permitted.part.waterPoint,
      hourly: buildDmiForecastHourly({ generatedAt: at(0), startAt: at(nativeHours[0]),
        hours: 50 - nativeHours[0],
        ocean: Object.values(permitted.bulk.zones[identity.entityId].hourly)
          .map(row => ({ step: row.time, 'current-u': row['current-u'],
            'current-v': row['current-v'], provenance: row.sources })) }).hourly },
      permitted.bulk, identity.entityId, permitted.part);
    const result = buildRavScoreProductionPartSeries({ part: old.part, zone,
      initialSelection: { state: integrated, source: 'INTEGRATED_CONTINUATION' },
      previousCandidateGContinuation: candidate, targetReferenceAt: at(49),
      recoverySources: [{ source: 'progressive-private-dmi', record: {
        point: permitted.part.waterPoint, hourly: allowedHourly } }],
      publicHourly: [{ ...allowedHourly.at(-1), windSpeedMps: 8, windDirectionDeg: 270,
        waveHeightM: 1.2, wavePeriodS: 6, waveDirectionDeg: 90,
        waveProvenance: { status: 'verified' }, waterLevelCm: 0, waterLevelTrendCm3h: 0 }],
    });
    assert.ok(result.currentSourceDomainTransition, 'actual producer must transition both old states');
    assert.deepEqual(result.currentSourceDomainTransition.originalIntegratedState, integrated);
    assert.deepEqual(result.currentSourceDomainTransition.originalCandidateGState, candidate);
    assert.equal(result.ravScoreState.continuationState.currentMemoryReady, ready);
    assert.equal(result.candidateGState.continuationState.transportMemoryReady, ready);
    for (const mode of ['waders', 'beach']) {
      const oracle = result.candidateGRollbackScores[0].candidateG;
      assert.equal(oracle.modes[mode].available, true,
        'availability control needs otherwise-usable weather, not a missing-wave shortcut');
      assert.equal(oracle.publicModes[mode].available, ready,
        'the old finite private estimate must not escape as a safe rollback score');
      if (!ready) assert.notEqual(result.scores[0].ravScoreModel.modes[mode].scoreQuality,
        'FULL_HISTORY', 'unproved current cannot become full public score history');
    }
    if (!ready) assert.equal(result.ravScoreState.continuationState.supplyPotential, null,
      'unknown input is not a safe zero supply');
    const evidence = result.ravScoreState.continuationState.currentEvidence;
    if (!ready) assert.ok(evidence.filter(row => Date.parse(row.time) < Date.parse(at(48)))
      .every(row => row.strength === null), 'unknown old contributions must not survive as proved current');
    else assert.ok(evidence.every(row => Number.isFinite(row.strength)),
      'full proved NSBS history must not be discarded');
    assert.equal(JSON.stringify({ integrated, candidate }), snapshot, 'original pair stays immutable');
    assert.equal(ravScoreOwnerCurrentHistoryStartAt(old.part, integrated, at(49)), at(0));
    assert.equal(ravScoreOwnerCurrentHistoryStartAt({ ...old.part, zoneId: 'DK-B05-17' },
      integrated, at(49)), at(49), 'Fur history boundary is unchanged');
    const retained = retainOwnerCurrentTransitionOriginal({ ...result.currentSourceDomainTransition,
      referenceAt: result.ravScoreState.continuationState.time,
      originalIntegratedState: result.ravScoreState.continuationState,
      originalCandidateGState: result.candidateGState.continuationState },
    result.currentSourceDomainTransition, old.part);
    assert.deepEqual(retained.originalIntegratedState, integrated);
    assert.deepEqual(retained.originalCandidateGState, candidate);
    assert.throws(() => retainOwnerCurrentTransitionOriginal(result.currentSourceDomainTransition,
      { ...result.currentSourceDomainTransition, partId: 'WRONG' }, old.part), /incompatible target/);
    const sources = [{ record: { point: permitted.part.waterPoint, hourly: allowedHourly } }];
    const oldRows = { record: { point: old.part.waterPoint,
      hourly: oldHourly.map(row => ({ ...row })) } };
    const proved = buildRavScorePermittedCurrentHistory({ part: old.part,
      referenceAt: at(48), sourceRecords: sources });
    assert.deepEqual(buildRavScorePermittedCurrentHistory({ part: old.part,
      referenceAt: at(48), sourceRecords: [...sources, oldRows] }), proved,
    'authentic LF stays excluded without poisoning permitted input');
    if (ready) {
      const changed = copy(sources[0]);
      changed.record.hourly[0].currentUMps += 0.03;
      assert.throws(() => buildRavScorePermittedCurrentHistory({ part: old.part,
        referenceAt: at(48), sourceRecords: [changed] }),
      error => error?.code === 'RAVSCORE_RECOVERY_REPLAY_CURRENT_UNVERIFIED');
      const duplicate = copy(sources[0]);
      duplicate.record.hourly.push(copy(duplicate.record.hourly[0]));
      assert.throws(() => buildRavScorePermittedCurrentHistory({ part: old.part,
        referenceAt: at(48), sourceRecords: [duplicate] }),
      error => error?.code === 'RAVSCORE_RECOVERY_REPLAY_CONFLICT');
    }
  });
});

test('owner transition follows actual normal integrated, checkpoint and exact activation selectors', async t => {
  for (const zoneId of ['DK-B01-01', 'DK-B01-02', 'DK-B02-08', 'DK-B02-09',
    'DK-B02-11', 'DK-B03-01', 'DK-B03-02']) {
    const f = fixture({ zoneId, collection: 'dkss_nsbs', nativeHours: [48, 49], target: 48, run: -12 });
    f.part.onshoreDirectionDeg = 90;
    const zone = { id: zoneId, onshoreDirectionDeg: 90 };
    const oldHourly = Array.from({ length: 49 }, (_, hour) => {
      const old = fixture({ zoneId, collection: 'dkss_lf', nativeHours: [hour], target: hour });
      const wave = { ...old.row.sources.current, collection: 'wam_dw', collectionFamily: 'wave',
        component: 'wave', componentKind: 'wave-mobilisation-tuple',
        fieldSet: ['significant-wave-height', 'dominant-wave-period'], optionalFieldSet: ['mean-wave-dir'],
        spatialSelection: 'nearest-shared-wave-height-period-grid-cell-no-spatial-interpolation',
        wavePeriodSemantics: 'peak',
        wavePeriodField: { shortName: 'pp1d', paramId: 231, indicatorOfParameter: null },
        nativeSteps: old.row.sources.current.nativeSteps.map(step => ({ ...step,
          optionalFieldSet: ['mean-wave-dir'], wavePeriodSemantics: 'peak',
          wavePeriodField: { shortName: 'pp1d', paramId: 231, indicatorOfParameter: null } })) };
      assert.ok(eligibleDmiForecastComponentSource(wave, old.row.time, 'wave',
        dmiExpectedIdentityForPart(f.part)), 'activation control requires the original admitted wave');
      return { ...old.row, currentProvenance: { ...old.row.sources.current, status: 'verified' },
        sources: { ...old.row.sources, wave },
        currentCoastNormalSpeedMps: old.row.currentUMps,
        waveHeightM: 1.2, wavePeriodS: 6, waveDirectionDeg: 90, waveProvenance: { status: 'verified' } };
    });
    const integrated = buildIntegratedPartScoreSeries({ part: f.part, zone, hourly: oldHourly })
      .ravScoreState.continuationState;
    const candidate = buildCandidateGRollbackPartScoreSeries({ part: f.part, zone,
      hourly: oldHourly, measuredColdStart: true }).candidateGState.continuationState;
    const pair = buildCoastalPointActivationStatePair({ partId: f.part.partId,
      samplingContextKey: ravScoreSamplingContextKey(f.part),
      expectedCandidateGStateKey: candidateGStateKey(f.part), integratedState: integrated,
      candidateGState: candidate });
    const identity = dmiExpectedIdentityForPart(f.part);
    const allowedHourly = verifiedIntegratedPartHourly({ point: f.part.waterPoint,
      hourly: buildDmiForecastHourly({ generatedAt: at(0), startAt: at(48), hours: 2,
        ocean: Object.values(f.bulk.zones[identity.entityId].hourly).map(row => ({ step: row.time,
          'current-u': row['current-u'], 'current-v': row['current-v'], provenance: row.sources })) }).hourly },
    f.bulk, identity.entityId, f.part);
    const legacySelection = productionPipeline.selectRavScoreProductionInitialState({ part: f.part,
      existingPart: { candidateG: { currentState: candidate } }, targetReferenceAt: at(49) });
    assert.equal(legacySelection.source, 'CANDIDATE_G_MIGRATION');
    assert.throws(() => buildRavScoreProductionPartSeries({ part: f.part, zone,
      initialSelection: legacySelection, legacyCandidateGMigrationState: candidate,
      targetReferenceAt: at(49), recoverySources: [], publicHourly: [allowedHourly.at(-1)] }),
    error => error?.code === 'RAVSCORE_CURRENT_SOURCE_DOMAIN_LEGACY_UNSUPPORTED',
    'a legacy-only state must not be disguised as the unchanged two-model continuation contract');
    for (const source of ['EXISTING_INTEGRATED', 'INTEGRATED_CHECKPOINT', 'POINT_ACTIVATION']) {
      await t.test(`${zoneId}/${source}`, () => {
        const activation = source === 'POINT_ACTIVATION';
        const target = activation ? at(48) : at(49);
        const pairs = activation ? { [f.part.partId]: pair } : {};
        const initialSelection = productionPipeline.selectRavScoreProductionInitialState({ part: f.part,
          existingPart: source === 'EXISTING_INTEGRATED' ? { ravScoreModel: { currentState: integrated } } : null,
          checkpointStates: source === 'INTEGRATED_CHECKPOINT' ? { [f.part.partId]: integrated } : {},
          pointStateInjections: activation ? { [f.part.partId]: pair.integratedState } : {},
          targetReferenceAt: target });
        assert.equal(initialSelection.source, source);
        const companion = selectCoastalPointCandidateGRollbackContinuation({ partId: f.part.partId,
          part: f.part, initialSelection, pointActivationStatePairs: pairs,
          privateCandidateGContinuation: source === 'EXISTING_INTEGRATED' ? candidate : null,
          checkpointCandidateGContinuation: source === 'INTEGRATED_CHECKPOINT' ? candidate : null,
          targetReferenceAt: target });
        const selected = { ...allowedHourly.find(row => row.time === target),
          waveHeightM: oldHourly.at(-1).waveHeightM, wavePeriodS: oldHourly.at(-1).wavePeriodS,
          waveDirectionDeg: oldHourly.at(-1).waveDirectionDeg,
          waveProvenance: oldHourly.at(-1).waveProvenance };
        selected.sources = { ...oldHourly.at(-1).sources, ...selected.sources };
        const result = buildRavScoreProductionPartSeries({ part: f.part, zone, initialSelection,
          previousCandidateGContinuation: companion.state, targetReferenceAt: target,
          recoverySources: [{ record: { point: f.part.waterPoint, hourly: allowedHourly } }],
          publicHourly: [selected] });
        assert.deepEqual(result.currentSourceDomainTransition.originalIntegratedState, integrated);
        assert.deepEqual(result.currentSourceDomainTransition.originalCandidateGState, candidate);
        assert.equal(result.ravScoreState.continuationState.currentMemoryReady, false);
        assert.equal(result.candidateGState.continuationState.transportMemoryReady, false);
        assert.deepEqual(result.scores.map(row => row.time), [target]);
      });
    }
  }
});

test('private current source transition archive survives cold recovery and rejects malformed envelopes', async t => {
  const f = fixture({ zoneId: 'DK-B01-02', collection: 'dkss_lf', nativeHours: [0], target: 0 });
  f.part.onshoreDirectionDeg = 90;
  const zone = { id: f.part.zoneId, onshoreDirectionDeg: 90 };
  const hourly = [{ ...f.row, currentProvenance: { ...f.row.sources.current, status: 'verified' },
    currentCoastNormalSpeedMps: f.row.currentUMps }];
  const integrated = buildIntegratedPartScoreSeries({ part: f.part, zone, hourly })
    .ravScoreState.continuationState;
  const candidate = buildCandidateGRollbackPartScoreSeries({ part: f.part, zone,
    hourly, measuredColdStart: true }).candidateGState.continuationState;
  const record = { schemaVersion: 1, kind: 'PRIVATE_OWNER_CURRENT_SOURCE_TRANSITION',
    parentZoneId: f.part.zoneId, partId: f.part.partId, excludedCollection: 'dkss_lf',
    referenceAt: at(0), provedCurrentHours: 1, unknownCurrentHours: 48,
    originalIntegratedState: integrated, originalCandidateGState: candidate };
  const archive = { schemaVersion: 1, kind: 'PRIVATE_OWNER_CURRENT_SOURCE_TRANSITION_ARCHIVE',
    privacyClass: 'PRIVATE_PRODUCTION_RUNTIME', parts: { [f.part.partId]: record } };
  const snapshot = JSON.stringify(archive);
  await t.test('technical bridge archives the true pair without declaring its current input proved', async () => {
    const { preserveOwnerCurrentOriginalPairs, classifyOwnerCurrentArchiveBridge } =
      await import('./migrate-post-cutover-private-runtime.mjs');
    const { ravScoreModelBinding } = await import('../js/core/ravscore-model-contract.js');
    const previousBinding = { ...ravScoreModelBinding(),
      modelBundleSha256: '29ea9a19647bf7d5edad0eee159267086d546f0d90a9f2778a77077351aad948' };
    const predecessorState = { ...copy(integrated), modelBundleSha256: previousBinding.modelBundleSha256 };
    // Only the existing ONE canonical pair is evaluated. Opaque untargeted
    // identities exercise the inventory boundary, not a national model run.
    const parts = Object.fromEntries(Array.from({ length: 672 }, (_, index) => [
      'OPAQUE-' + index, { partId: 'OPAQUE-' + index, zoneId: 'DK-B05-17' } ]));
    const islandIds = ['DK-B11-SAM-01', 'DK-B11-SAM-02', 'DK-B11-SAM-03',
      'DK-B11-LAE-01', 'DK-B11-LAE-02', 'DK-B11-LAE-03'];
    islandIds.forEach((zoneId, index) => { parts['OPAQUE-' + index].zoneId = zoneId; });
    const zoneIds = [f.part.zoneId, 'DK-B05-17', ...islandIds,
      ...Array.from({ length: 202 }, (_, index) => 'FIXTURE-ZONE-' + index)];
    const zones = Object.fromEntries(zoneIds.map(zoneId => [zoneId, {}]));
    parts[f.part.partId] = { ...copy(f.part), ravScoreModel: { currentState: predecessorState } };
    const source = { productionReferenceAt: at(0), zones: copy(zones),
      coastalParts: { modelBinding: previousBinding, parts, zones: copy(zones) },
      ravScoreCandidateGWarmup: { runtime: { parts: {
        [f.part.partId]: { ravScoreModel: { currentState: copy(candidate) } } } } } };
    const before = JSON.stringify(source);
    const migrated = copy(source);
    migrated.coastalParts.modelBinding.modelBundleSha256 = 'e'.repeat(64);
    preserveOwnerCurrentOriginalPairs(source, migrated);
    const saved = migrated.ravScoreCurrentSourceDomainTransitions.parts[f.part.partId];
    assert.deepEqual(saved.originalIntegratedState, predecessorState);
    assert.deepEqual(saved.originalCandidateGState, candidate);
    assert.equal(saved.provedCurrentHours, 0);
    assert.equal(saved.unknownCurrentHours, 49);
    assert.equal(saved.originalIntegratedState.modelBundleSha256, previousBinding.modelBundleSha256);
    const changes = ['coastalParts.modelBinding.modelBundleSha256', 'ravScoreCurrentSourceDomainTransitions'];
    const options = { source, migrated, bindingMetadataPaths: [changes[0]], verifiedChangedPaths: changes };
    assert.equal(classifyOwnerCurrentArchiveBridge(options), 'OWNER_CURRENT_ORIGINAL_ARCHIVE_BRIDGE');
    const wrong = copy(migrated);
    wrong.ravScoreCurrentSourceDomainTransitions.parts[f.part.partId].provedCurrentHours = 1;
    wrong.ravScoreCurrentSourceDomainTransitions.parts[f.part.partId].unknownCurrentHours = 48;
    assert.throws(() => classifyOwnerCurrentArchiveBridge({ ...options, migrated: wrong }), /True original-pair archive/);
    const changedState = copy(migrated);
    changedState.coastalParts.parts[f.part.partId].ravScoreModel.currentState.supplyPotential += 1;
    assert.throws(() => classifyOwnerCurrentArchiveBridge({ ...options, migrated: changedState }), /unverified changes/);
    const wrongTime = copy(source);
    wrongTime.ravScoreCandidateGWarmup.runtime.parts[f.part.partId].ravScoreModel.currentState.time = at(1);
    assert.throws(() => preserveOwnerCurrentOriginalPairs(wrongTime, {}), /original pair|original time/);
    const unknownParent = copy(source);
    unknownParent.coastalParts.parts['OPAQUE-0'].zoneId = 'DK-B05-99';
    assert.throws(() => preserveOwnerCurrentOriginalPairs(unknownParent, {}), /parent-zone and part identities/);
    const wrongPart = copy(source);
    wrongPart.coastalParts.parts['OPAQUE-0'].partId = 'OTHER';
    assert.throws(() => preserveOwnerCurrentOriginalPairs(wrongPart, {}), /parent-zone and part identities/);
    const mismatchedZones = copy(source);
    delete mismatchedZones.zones['DK-B11-SAM-01'];
    mismatchedZones.zones.UNKNOWN = {};
    assert.throws(() => preserveOwnerCurrentOriginalPairs(mismatchedZones, {}), /parent-zone and part identities/);
    assert.equal(JSON.stringify(source), before);
  });
  await t.test('normal metadata migration preserves validated private originals under their original binding', async () => {
    const { migrateExactModelBindingMetadata, classifyVerifiedRuntimeMigration,
      collectBundleHashPaths } =
      await import('./migrate-post-cutover-private-runtime.mjs');
    const { ravScoreModelBinding } = await import('../js/core/ravscore-model-contract.js');
    const previousBinding = ravScoreModelBinding();
    // Synthetic successor metadata exercises this pass only; it is NOT a
    // generated/new-binding, original private runtime or full migration proof.
    const successorBinding = { ...previousBinding, modelBundleSha256: 'e'.repeat(64) };
    const source = {
      productionReferenceAt: at(0),
      coastalParts: { modelBinding: copy(previousBinding), parts: {
        [f.part.partId]: { ...copy(f.part), ravScoreModel: {
          ...copy(previousBinding), currentState: copy(integrated),
        } },
      } },
      ravScoreCurrentSourceDomainTransitions: copy(archive),
    };
    const migrated = copy(source);
    const changed = migrateExactModelBindingMetadata(migrated, previousBinding, successorBinding);
    assert.deepEqual(migrated.ravScoreCurrentSourceDomainTransitions,
      source.ravScoreCurrentSourceDomainTransitions, 'historical originals must not be relabelled');
    assert.deepEqual(migrated.coastalParts.parts[f.part.partId].ravScoreModel.currentState,
      source.coastalParts.parts[f.part.partId].ravScoreModel.currentState,
      'the metadata pass must leave normal continuation handling to its strict owner');
    assert.deepEqual(changed.sort(), [
      'coastalParts.modelBinding.modelBundleSha256',
      'coastalParts.parts.SYNTHETIC-PART.ravScoreModel.modelBundleSha256',
    ]);
    assert.equal(classifyVerifiedRuntimeMigration({ source, migrated,
      bindingMetadataPaths: changed, verifiedChangedPaths: changed }), 'MODEL_BINDING_METADATA_ONLY');
    assert.deepEqual(collectBundleHashPaths(migrated,
      new Set([previousBinding.modelBundleSha256])), [
      'coastalParts.parts.SYNTHETIC-PART.ravScoreModel.currentState.modelBundleSha256',
    ], 'the normal stale-hash check must distinguish archived originals from live continuation');
    const nested = { other: { ravScoreCurrentSourceDomainTransitions: copy(archive) } };
    assert.deepEqual(collectBundleHashPaths(nested,
      new Set([previousBinding.modelBundleSha256])), [
      'other.ravScoreCurrentSourceDomainTransitions.parts.SYNTHETIC-PART.originalIntegratedState.modelBundleSha256',
    ], 'a same-named nested object is not a validated ROOT archive');
    for (const mutate of [
      value => { value.productionReferenceAt = at(-1); },
      value => { delete value.productionReferenceAt; },
      value => { value.ravScoreCurrentSourceDomainTransitions = null; },
      value => { value.ravScoreCurrentSourceDomainTransitions.extra = true; },
      value => { value.ravScoreCurrentSourceDomainTransitions.parts[f.part.partId]
        .originalIntegratedState.modelBundleSha256 = 'a'.repeat(64); },
      value => { value.coastalParts.parts[f.part.partId].zoneId = 'DK-B05-17'; },
      value => { delete value.coastalParts.parts[f.part.partId]; },
    ]) {
      const invalid = copy(source); mutate(invalid);
      const before = JSON.stringify(invalid);
      assert.throws(() => migrateExactModelBindingMetadata(invalid, previousBinding, successorBinding),
        /Private current source transition archive/);
      assert.equal(JSON.stringify(invalid), before, 'invalid archive must fail before metadata mutation');
    }
    assert.equal(JSON.stringify(source.ravScoreCurrentSourceDomainTransitions), snapshot);
  });
  await t.test('original predecessor is checked under its fixed binding without relabelling', async () => {
    const contract = await import('./lib/coastal-point-staging-contract.mjs');
    const validateOriginal = contract.assertArchivedOwnerCurrentIntegratedOriginal;
    assert.equal(typeof validateOriginal, 'function', 'preserved originals need their own strict binding check');
    const predecessor = copy(integrated);
    predecessor.modelBundleSha256 = '29ea9a19647bf7d5edad0eee159267086d546f0d90a9f2778a77077351aad948';
    const before = JSON.stringify(predecessor);
    const options = { samplingContextKey: ravScoreSamplingContextKey(f.part) };
    assert.equal(validateOriginal(predecessor, options), predecessor,
      'validation must return the unchanged original, not a successor projection');
    const core = await import('../js/core/ravscore-integrated-state-pipeline.js');
    const wrongBinding = { ...predecessor, modelBundleSha256: 'e'.repeat(64) };
    assert.throws(() => core.buildIntegratedRavScoreStateSeries([], {
      ...options, initialState: wrongBinding, expectedBundleSha256: wrongBinding.modelBundleSha256,
    }), 'normal initialization must not expose the internal original-binding validation parameter');
    for (const mutate of [
      state => { state.modelBundleSha256 = 'e'.repeat(64); },
      state => { state.modelContractSha256 = 'e'.repeat(64); },
      state => { state.currentMemoryReady = !state.currentMemoryReady; },
      state => { state.currentEvidence.push(copy(state.currentEvidence[0])); },
      state => { state.mobilisationPotential += 1; },
      state => { state.historyBounds.current.lowerPotential = 999; },
      state => { state.currentEvidence[0].currentUMps = 1; },
      state => { state.lineage = { unknown: true }; },
    ]) {
      const changed = copy(predecessor); mutate(changed);
      assert.throws(() => validateOriginal(changed, options));
      const changedRecord = { ...record, originalIntegratedState: changed };
      assert.throws(() => retainOwnerCurrentTransitionOriginal(null, changedRecord, f.part),
        /Private current source transition archive/);
    }
    assert.throws(() => validateOriginal(predecessor, { samplingContextKey: 'WRONG' }));
    assert.throws(() => validateOriginal(null, options));
    assert.equal(JSON.stringify(predecessor), before, 'predecessor checks must not mutate original history or binding');
  });
  await t.test('keep the first original pair even when this generation has no transition', () => {
    const retained = retainOwnerCurrentTransitionOriginal(null, record, f.part);
    assert.deepEqual(retained, record, 'cold recovery must not delete the private originals');
    assert.notEqual(retained, record, 'retained archive must not share a mutable record');
  });
  await t.test('validate the complete archive before passing its parts to the actual caller', () => {
    const readArchive = productionPipeline.readOwnerCurrentTransitionArchive;
    assert.equal(typeof readArchive, 'function', 'the caller needs an explicit archive-envelope check');
    assert.deepEqual(readArchive(archive, [f.part]), archive.parts);
    assert.deepEqual(readArchive(null, [f.part]), {});
    const lockedReference = { targetReferenceAt: at(0) };
    assert.deepEqual(readArchive(archive, [f.part], lockedReference), archive.parts);
    const futureRecord = copy(archive);
    futureRecord.parts[f.part.partId].referenceAt = at(1);
    assert.throws(() => readArchive(futureRecord, [f.part], lockedReference),
      /Private current source transition archive/,
      'a canonical original pair cannot attest an archive transition after the locked generation');
    assert.throws(() => readArchive(archive, [f.part], { targetReferenceAt: at(-1) }),
      /Private current source transition archive/);
    assert.throws(() => readArchive(archive, [f.part], { targetReferenceAt: 'invalid' }),
      /Private current source transition archive/);
    for (const changed of [
      { ...archive, schemaVersion: 2 }, { ...archive, privacyClass: 'PUBLIC' },
      { ...archive, parts: [] }, { ...archive, parts: null }, { ...archive, extra: true },
      { ...archive, parts: { WRONG: record } },
      { ...archive, parts: { [f.part.partId]: { ...record, unknownCurrentHours: 47 } } },
      { ...archive, parts: { [f.part.partId]: { ...record, referenceAt: at(-1) } } },
      { ...archive, parts: { [f.part.partId]: { ...record, extra: true } } },
    ]) assert.throws(() => readArchive(changed, [f.part]), /Private current source transition archive/);
    assert.throws(() => readArchive(archive, [{ ...f.part, zoneId: 'DK-B05-17' }]),
      /Private current source transition archive/);
  });
  assert.equal(JSON.stringify(archive), snapshot, 'archive validation and retention are byte-neutral');
});

test('native, interpolated and nearest-edge reproduce unchanged original forecast/source', () => {
  for (const options of [{ target: 0 }, { target: 1 }, { nativeHours: [0], target: 1 }, { pythonTime: 'offset' }]) {
    const f = fixture(options), before = JSON.stringify(f);
    const bank = bankFor(f), proof = verifyProtectedDmiNativeCurrentProof(bank, f);
    assert.equal(proof.ok, true);
    assert.deepEqual(proof.source, f.row.sources.current);
    assert.equal(proof.currentUMps, f.row.currentUMps);
    assert.equal(proof.currentVMps, f.row.currentVMps);
    assert.equal(bank.scope, 'PUBLIC_PART_FORECAST_121');
    assert.equal(bank.nativeRows.length, f.row.sources.current.nativeSteps.length);
    assert.equal(JSON.stringify(f), before, 'inputs and original source remain immutable');
    assert.equal(inspect(f).ok, true);
  }
});

test('real Python native timestamp spelling survives exact forecast proof unchanged', () => {
  const f = fixture({ pythonTime: true }), bank = bankFor(f);
  assert.equal(inspect(f).ok, true);
  assert.equal(bank.contexts[0].value.header.generatedAt, '2026-09-01T00:00:00Z');
  assert.deepEqual(verifyProtectedDmiNativeCurrentProof(bank, f).source, f.row.sources.current);
  assert.ok(bank.nativeRows.every(record => !record.value.time.includes('.000')));
});

test('explicit offsets and microsecond producer generation are accepted without rewriting proof', () => {
  for (const generatedAt of ['2026-09-01T00:00:00.116728Z', '2026-09-01T00:00:00.116728+00:00']) {
    const f = fixture({ pythonTime: true });
    f.bulk.generatedAt = generatedAt;
    // The raw row's spelling can differ from the provenance's same instant.
    for (const native of Object.values(Object.values(f.bulk.zones)[0].hourly)) {
      native.time = native.time.replace('Z', '+00:00');
    }
    const bank = bankFor(f);
    assert.equal(inspect(f).ok, true);
    assert.equal(bank.contexts[0].value.header.generatedAt, generatedAt);
    assert.ok(bank.nativeRows.every(record => record.value.time.endsWith('+00:00')));
    assert.deepEqual(verifyProtectedDmiNativeCurrentProof(bank, f).source, f.row.sources.current);
  }
  const noTimezone = fixture(); noTimezone.bulk.generatedAt = '2026-09-01T00:00:00';
  assert.equal(inspect(noTimezone).code, 'DMI_NATIVE_PROOF_CONTEXT_INVALID');
});

test('valid metadata alone is not actual native U/V proof', () => {
  const f = fixture();
  const expected = dmiExpectedIdentityForPart(f.part);
  assert.ok(verifiedBulkCurrent(f.bulk, f.bulk.zones[expected.entityId], f.part.waterPoint,
    f.row.sources.current, f.row.time, expected));
  f.bulk.zones[expected.entityId].hourly = {};
  assert.deepEqual(inspect(f), { ok: false, code: 'DMI_NATIVE_PROOF_NATIVE_ENDPOINT_MISSING' });
  assert.throws(() => bankFor(f), /DMI_NATIVE_PROOF_NATIVE_ENDPOINT_MISSING/);
});

test('derived forecast row cannot masquerade as an actual native endpoint', () => {
  const f = fixture({ target: 0 });
  const native = f.bulk.zones[dmiExpectedIdentityForPart(f.part).entityId].hourly[at(0)];
  native.sources.current = copy(f.row.sources.current);
  assert.equal(inspect(f).code, 'DMI_NATIVE_PROOF_NATIVE_ENDPOINT_MISSING');
});

test('wrong native tuple, point, asset, layer and source-only additions fail closed', () => {
  const changes = [
    f => { f.row.currentUMps += 0.01; },
    f => { f.part.waterPoint[0] += 0.01; },
    f => { f.row.sources.current.assetIdentitySha256 = 'd'.repeat(64); },
    f => { f.row.sources.current.verticalLayer = 'depth:2'; },
    f => { f.row.sources.current.unknownField = 'not present on native'; },
  ];
  for (const mutate of changes) {
    const f = fixture(); mutate(f);
    assert.equal(inspect(f).ok, false);
    assert.throws(() => bankFor(f), /DMI_NATIVE_PROOF_/);
  }
});

test('bank hashes bind native payload, source, selected tuple and diagnostic age', () => {
  const f = fixture(), bank = bankFor(f);
  for (const mutate of [
    b => { b.nativeRows[0].value.uMps += 0.01; },
    b => { b.contexts[0].value.zone.samplingPoint[0] += 0.01; },
    b => { b.selections[0].forecastAgeHours += 1; },
    b => { b.selections[0].tupleSha256 = 'd'.repeat(64); },
    b => { b.nativeRows.reverse(); },
  ]) {
    const changed = copy(bank); mutate(changed);
    assert.equal(verifyProtectedDmiNativeCurrentProof(changed, f).ok, false);
    assert.throws(() => validateProtectedDmiNativeCurrentProofs(changed), /DMI_NATIVE_PROOF_/);
  }
});

test('age is diagnostic only; cannot select run, endpoint, tuple or silently mutate proof', () => {
  const f = fixture(), original = copy(f.row.sources.current), originalBank = bankFor(f);
  f.row.sources.current.forecastAgeHours = 999;
  const bank = bankFor(f), proof = verifyProtectedDmiNativeCurrentProof(bank, f);
  assert.equal(proof.ok, true, 'native identity is independent of the age diagnostic');
  assert.equal(proof.source.forecastAgeHours, 999, 'the exact authenticated diagnostic is preserved');
  assert.equal(proof.source.modelRun, original.modelRun);
  assert.deepEqual(proof.source.nativeSteps, original.nativeSteps);
  assert.equal(verifyProtectedDmiNativeCurrentProof(originalBank, f).ok, false,
    'an old bank does not authenticate a changed age value');
  f.row.sources.current.nativeSteps[0].nativeValidTime = at(-1);
  assert.equal(inspect(f).ok, false, 'age cannot manufacture a native endpoint');
});

test('identical donors dedupe; same immutable native identity with conflicting U/V rejects', () => {
  const f = fixture();
  const once = bankFor(f);
  const twice = buildProtectedDmiNativeCurrentProofs({ selections: [f], contexts: [f.bulk, copy(f.bulk)] });
  assert.deepEqual(twice, once);
  const conflicting = copy(f.bulk);
  Object.values(conflicting.zones)[0].hourly[at(0)]['current-u'] += 0.01;
  assert.equal(inspect(f, [f.bulk, conflicting]).code, 'DMI_NATIVE_PROOF_NATIVE_CONFLICT');
});

test('single-donor availability does not claim split endpoint completeness', () => {
  const f = fixture(), before = copy(f.bulk), after = copy(f.bulk);
  delete Object.values(before.zones)[0].hourly[at(3)];
  delete Object.values(after.zones)[0].hourly[at(0)];
  assert.equal(inspect(f, [before]).ok, false);
  assert.equal(inspect(f, [after]).ok, false);
  assert.equal(inspect(f, [before, after]).ok, true,
    'only an explicitly combined authenticated donor set proves both endpoints');
});

test('ten subsequent selected-only generations retain proof without accumulating donors', () => {
  const f = fixture();
  let bank = bankFor(f);
  const original = copy(bank);
  for (let generation = 0; generation < 10; generation++) {
    bank = buildProtectedDmiNativeCurrentProofs({ selections: [f], contexts: [], previousBank: bank });
    assert.deepEqual(bank, original);
    assert.equal(verifyProtectedDmiNativeCurrentProof(bank, f).ok, true);
  }
  const empty = buildProtectedDmiNativeCurrentProofs({ selections: [], previousBank: bank });
  assert.equal(empty.nativeRows.length, 0);
  assert.equal(empty.contexts.length, 0);
});

test('does not select an older donor instead of an already selected newer forecast', () => {
  const older = fixture(), newer = fixture({ run: -6 });
  assert.equal(inspect(newer, [older.bulk]).ok, false);
  const bank = buildProtectedDmiNativeCurrentProofs({ selections: [newer], contexts: [older.bulk, newer.bulk] });
  const proof = verifyProtectedDmiNativeCurrentProof(bank, newer);
  assert.equal(proof.ok, true);
  assert.equal(proof.source.modelRun, newer.row.sources.current.modelRun);
});

test('strict domain, per-record and donor-count bounds apply before persistence', () => {
  const f = fixture();
  assert.throws(() => buildProtectedDmiNativeCurrentProofs({ selections: [f, f], contexts: [f.bulk] }),
    /DMI_NATIVE_PROOF_SELECTION_DUPLICATE/);
  assert.throws(() => createProtectedDmiNativeCurrentInspector({ contexts: Array(17).fill(f.bulk) }),
    /DMI_NATIVE_PROOF_INPUT_BOUND/);
  f.row.sources.current.padding = 'x'.repeat(PROTECTED_DMI_NATIVE_PROOF_LIMITS.recordBytes + 1);
  assert.equal(inspect(f).code, 'DMI_NATIVE_PROOF_RECORD_BOUND');
  assert.throws(() => buildProtectedDmiNativeCurrentProofs({ selections: Array(PROTECTED_DMI_NATIVE_PROOF_LIMITS.selections + 1) }),
    /DMI_NATIVE_PROOF_INPUT_BOUND/);
  const huge = fixture();
  huge.row.sources.current.nativeSteps = Array(100_000).fill(huge.row.sources.current.nativeSteps[0]);
  assert.equal(inspect(huge).code, 'DMI_NATIVE_PROOF_RECORD_BOUND', 'bound before temporal verifier traverses input');
  const oversizedDonor = fixture();
  const zone = Object.values(oversizedDonor.bulk.zones)[0], one = Object.values(zone.hourly)[0];
  zone.hourly = Object.fromEntries(Array.from({ length: 10_001 }, (_, i) => [String(i), one]));
  assert.equal(inspect(oversizedDonor).code, 'DMI_NATIVE_PROOF_DONOR_BOUND');
});

test('per-PART bank scope rejects the 122nd selected hour without partial output', () => {
  const nativeHours = Array.from({ length: 123 }, (_, index) => index);
  const f = fixture({ nativeHours, target: 0 });
  const rows = buildDmiForecastHourly({ generatedAt: at(0), startAt: at(0), hours: 122,
    ocean: Object.values(Object.values(f.bulk.zones)[0].hourly).map(row => ({
      step: row.time, 'current-u': row['current-u'], 'current-v': row['current-v'], provenance: row.sources,
    })) }).hourly;
  const selections = rows.map(row => ({ part: f.part, row }));
  assert.equal(buildProtectedDmiNativeCurrentProofs({ selections: selections.slice(0, 121), contexts: [f.bulk] }).selections.length, 121);
  assert.throws(() => buildProtectedDmiNativeCurrentProofs({ selections, contexts: [f.bulk] }), /DMI_NATIVE_PROOF_DOMAIN_BOUND/);
});

test('inspector caches one PART and safely handles sequential parts', () => {
  const first = fixture(), second = fixture({ partId: 'SECOND-SYNTHETIC-PART' });
  const bulk = { ...first.bulk, zones: { ...first.bulk.zones, ...second.bulk.zones } };
  const inspector = createProtectedDmiNativeCurrentInspector({ contexts: [bulk] });
  for (const input of [first, first, second, second, first]) assert.equal(inspector.inspect(input).ok, true);
});

if (process.env.RAVRADAR_NATIVE_PROOF_BENCHMARK === '1') test('opt-in dense 673 x 121 inspector CPU measurement', () => {
  const f = fixture({ nativeHours: Array.from({ length: 43 }, (_, i) => i * 3), target: 0, pythonTime: true });
  const rows = buildDmiForecastHourly({ generatedAt: at(0), startAt: at(0), hours: 121,
    ocean: Object.values(Object.values(f.bulk.zones)[0].hourly).map(row => ({
      step: row.time, 'current-u': row['current-u'], 'current-v': row['current-v'], provenance: row.sources,
    })) }).hourly;
  let complete = 0;
  const started = performance.now();
  for (let part = 0; part < 673; part++) {
    // Recreate the index for each part, as a real sequential-PART scan does.
    // Geometry/file decoding/transport are not included in this CPU floor.
    const inspector = createProtectedDmiNativeCurrentInspector({ contexts: [f.bulk] });
    for (const row of rows) {
      assert.equal(inspector.inspect({ part: f.part, row }).ok, true);
      complete++;
    }
  }
  assert.equal(complete, 673 * 121);
  console.log(JSON.stringify({ syntheticNativeInspector: { selections: complete,
    elapsedMs: Math.round(performance.now() - started), maximumRssBytes: process.resourceUsage().maxRSS * 1024,
    includesFileDecodeOrRemote: false } }));
});
