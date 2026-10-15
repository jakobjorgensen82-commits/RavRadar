import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { assertSavedDmiOriginalRestoreScope, savedDmiOriginalHistoryDemand, savedDmiOriginalPreparationFailureCode,
  collectSavedDmiOriginalCaptures, buildSavedDmiOriginalRestorePlan,
  writeSavedDmiOriginalRestorePlan, savedOriginalCanonicalJson, SAVED_DMI_ORIGINAL_TARGET as target,
  SAVED_DMI_ORIGINAL_PROGRESS as progressSource, SAVED_DMI_ORIGINAL_PROGRESS_KEY as progressCacheKey,
  SAVED_DMI_ORIGINAL_PLAN_PATH } from './prepare-saved-dmi-original-restore.mjs';
import { prepareAuthenticatedSavedDmiOriginalRestore } from './audit-saved-weather-inputs.mjs';
import { buildIntegratedPartScoreSeries } from './lib/ravscore-integrated-runtime.mjs';
import { dmiExpectedIdentityForPart } from './lib/ravscore-production-adapters.mjs';
import { ravScoreModelBinding } from '../js/core/ravscore-model-contract.js';

const sha = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const at = offset => new Date(Date.parse(target) + offset * 3_600_000).toISOString();
const executionHead = 'e'.repeat(40);
const scope = { progressSource, progressCacheKey, progressBaselineTargetHour: target, executionHead };

test('prepare CLI retains only enumerated original, audit and GCM codes; unknown errors stay generic', () => {
  const select = savedDmiOriginalPreparationFailureCode;
  assert.equal(select({ originalPlanCode: 'SAVED_DMI_ORIGINAL_CAPTURE_INCOMPLETE' }), 'SAVED_DMI_ORIGINAL_CAPTURE_INCOMPLETE');
  assert.equal(select({ auditCode: 'CURRENT_GENERATION_CHANGED', message: 'secret-error-canary' }), 'CURRENT_GENERATION_CHANGED');
  assert.equal(select({ progressCode: 'SNAPSHOT_AUTHENTICATION_FAILED', message: 'secret-error-canary' }), 'SNAPSHOT_AUTHENTICATION_FAILED');
  assert.equal(select(new Error('WEATHER_PACK_ENTRY_HASH_INVALID')), 'WEATHER_PACK_ENTRY_HASH_INVALID');
  for (const error of [null, undefined, new Error('secret-error-canary'), new Error('CURRENT_GENERATION_CHANGED'),
    { auditCode: 'secret-error-canary' }, { progressCode: 'secret-error-canary' },
    { originalPlanCode: 'SAVED_DMI_ORIGINAL_SECRET_ERROR_CANARY' },
    new Error('WEATHER_PACK_ENTRY_HASH_INVALID: secret-error-canary'),
    { get originalPlanCode() { throw new Error('secret-error-canary'); } },
    { get auditCode() { throw new Error('secret-error-canary'); } }]) {
    assert.equal(select(error), 'SAVED_DMI_ORIGINAL_PREPARATION_REFUSED');
  }
});
// Same small native-source schema as test-audit-saved-weather-inputs.mjs;
// real native/context verifiers and the normal state selector are not mocked.
function fixture() {
  const part = { partId: 'SYNTHETIC-RESTORE-PART', zoneId: 'DK-B01-01', waterPoint: [8, 55], onshoreDirectionDeg: 90 };
  const identity = dmiExpectedIdentityForPart(part), vectorSelection = 'nearest-shared-uv-column-across-dmi-collections-then-deepest-valid-layer';
  const row = offset => ({ time: at(offset), 'current-u': 0.1, 'current-v': 0.2, sources: { current: {
    provider: 'dmi', fallback: false, collection: 'dkss_nsbs', collectionFamily: 'marine', component: 'current',
    componentKind: 'ocean-current-vector', fieldSet: ['current-u', 'current-v'], optionalFieldSet: [],
    spatialSelection: 'nearest-shared-grid-cell-no-spatial-interpolation', vectorSemanticsVersion: 3,
    vectorSelection, verticalLayer: 'depth:1', verticalLayerRankM: 1, ...identity,
    modelRun: at(-100), nativeValidTime: at(offset), leadTimeHours: 100 + offset,
    itemId: 'synthetic-private-item-' + offset, assetIdentitySha256: sha('asset-' + offset),
    assetSizeBytes: 1234, acquiredAt: at(-1), contentLengthBytes: 1234, contentSha256: sha('bytes-' + offset),
    itemCreatedAt: at(-100), itemUpdatedAt: at(-99), gridPoint: [8, 55],
    gridDefinitionSha256: 'b'.repeat(64), distanceKm: 0, spatialSemanticsVersion: 1,
  } } });
  const state = buildIntegratedPartScoreSeries({ part, zone: { id: part.zoneId, onshoreDirectionDeg: 90 },
    hourly: [{ time: at(-2) }] }).ravScoreState.continuationState;
  const conditions = { coastalParts: { modelBinding: ravScoreModelBinding(), parts: {
    [part.partId]: { ...part, ravScoreModel: { currentState: state } } } } };
  const parts = new Map([[part.partId, part]]);
  const demands = savedDmiOriginalHistoryDemand({ conditions, parts });
  const native = [-54, -53, -50, -2, 0, 1].map(row);
  const document = { generatedAt: target, currentVectorSemanticsVersion: 3, currentVectorSelection: vectorSelection,
    currentMaxDistanceKm: 5, timeStrideHours: 3, zones: { [identity.entityId]: {
      ...identity, hourly: Object.fromEntries(native.map(value => [value.time, value])) } } };
  const source = { sourceHead: 'a'.repeat(40), bundleContentSha256: 'b'.repeat(64), datasetId: 'rr-synthetic-originals',
    productionReferenceAt: at(-26), generatedAt: at(-26), modelBinding: ravScoreModelBinding() };
  return { part, parts, identity, conditions, demands, native, document, source };
}

test('exact source/target/execution scope rejects before credentials, filesystem or network', async () => {
  assert.doesNotThrow(() => assertSavedDmiOriginalRestoreScope(scope));
  for (const delta of [{ progressSource: 'other-1' }, { progressCacheKey: progressCacheKey + '-prefix' },
    { progressBaselineTargetHour: at(1) }, { executionHead: '' }]) {
    await assert.rejects(prepareAuthenticatedSavedDmiOriginalRestore({ ...scope, ...delta,
      fetchImpl: () => assert.fail('transport must not be called') }), /SCOPE_INVALID/);
  }
});

test('history is actual selected state plus 51h support; unavailable state never becomes cold/week fallback', () => {
  const f = fixture(), before = JSON.stringify(f.conditions);
  assert.equal(f.demands[0].initialStateAt, at(-2));
  assert.equal(f.demands[0].startAt, at(-53));
  assert.equal(f.demands[0].endAt, target);
  assert.equal(JSON.stringify(f.conditions), before);
  const missing = structuredClone(f.conditions);
  delete missing.coastalParts.parts[f.part.partId].ravScoreModel.currentState;
  assert.throws(() => savedDmiOriginalHistoryDemand({ conditions: missing, parts: f.parts }), /HISTORY_DEMAND_UNAVAILABLE/);
});

test('only bounded unknown native originals and allowed collections enter a byte-neutral metadata inventory', () => {
  const f = fixture(), before = JSON.stringify(f.document);
  const captures = collectSavedDmiOriginalCaptures(f);
  assert.equal(captures.length, 4, 'outside-support and after-target rows are excluded');
  assert.equal(Object.keys(captures[0]).length, 11);
  assert.doesNotMatch(JSON.stringify(captures), /current-u|current-v|gridPoint|samplingPoint|https:/);
  assert.equal(JSON.stringify(f.document), before);
  const excluded = structuredClone(f.document);
  Object.values(excluded.zones[f.identity.entityId].hourly).forEach(row => { row.sources.current.collection = 'dkss_lf'; });
  assert.deepEqual(collectSavedDmiOriginalCaptures({ ...f, document: excluded }), []);
  const receipts = structuredClone(f.document);
  Object.values(receipts.zones[f.identity.entityId].hourly).forEach(row => { row.sources.current.nativeGridSampling = { contractId: 'future-opaque' }; });
  assert.deepEqual(collectSavedDmiOriginalCaptures({ ...f, document: receipts }), []);
  const incomplete = structuredClone(f.document);
  delete incomplete.zones[f.identity.entityId].hourly[at(-2)].sources.current.contentSha256;
  assert.throws(() => collectSavedDmiOriginalCaptures({ ...f, document: incomplete }), /CAPTURE_INCOMPLETE/);
  const changedPoint = structuredClone(f.document);
  changedPoint.zones[f.identity.entityId].hourly[at(-2)].sources.current.samplingPoint = [8.1, 55];
  assert.throws(() => collectSavedDmiOriginalCaptures({ ...f, document: changedPoint }), /ORIGINAL_SOURCE_INVALID/);
});

test('plan deduplicates complete captures, binds old producer separately from execution, and hashes exact metadata', () => {
  const f = fixture(), captures = collectSavedDmiOriginalCaptures(f);
  const plan = buildSavedDmiOriginalRestorePlan({ ...f, captures: [...captures, ...captures], executionHead, nonce: '1'.repeat(32) });
  assert.equal(plan.originals.length, captures.length);
  assert.equal(plan.binding.sourceHead, f.source.sourceHead);
  assert.equal(plan.binding.executionHead, executionHead);
  assert.equal(plan.binding.originalsSha256, sha(savedOriginalCanonicalJson(plan.originals)));
  assert.equal(plan.binding.historyDemandSha256, sha(savedOriginalCanonicalJson(f.demands)));
  assert.doesNotMatch(JSON.stringify(plan), /current-u|current-v|currentUMps|currentVMps|gridPoint|samplingPoint|https:/);
  const changed = structuredClone(captures); changed[0].acquiredAt = at(-2).replace('.000Z', 'Z');
  const distinct = buildSavedDmiOriginalRestorePlan({ ...f, captures: [...captures, ...changed], executionHead });
  assert.equal(distinct.originals.length, captures.length + 1, 'separate acquisition captures are not relabelled/coalesced');
  for (const item of [{ ...captures[0], currentUMps: 1 }, { ...captures[0], contentLengthBytes: null }]) {
    assert.throws(() => buildSavedDmiOriginalRestorePlan({ ...f, captures: [item], executionHead }), /CAPTURE_INVALID/);
  }
});

test('fixed private wx plan is exclusive, reports byte SHA only, and refuses symlinked parent', async t => {
  const folder = await fs.mkdtemp(path.join(os.tmpdir(), 'rr-original-plan-test-'));
  t.after(() => fs.rm(folder, { recursive: true, force: true }));
  const root = path.join(folder, 'repository');
  await fs.mkdir(path.join(root, '.cache/dmi-grib'), { recursive: true });
  const f = fixture(), captures = collectSavedDmiOriginalCaptures(f);
  const plan = buildSavedDmiOriginalRestorePlan({ ...f, captures, executionHead });
  const report = await writeSavedDmiOriginalRestorePlan({ repositoryRoot: root, plan });
  const bytes = await fs.readFile(path.join(root, SAVED_DMI_ORIGINAL_PLAN_PATH));
  assert.equal(report.planSha256, sha(bytes));
  assert.equal(report.planBytes, bytes.length);
  assert.equal(report.originalCount, 4);
  assert.doesNotMatch(JSON.stringify(report), /synthetic-private-item|protectedBundle|samplingPoint|current-u/);
  await assert.rejects(writeSavedDmiOriginalRestorePlan({ repositoryRoot: root, plan }), /EEXIST/);
  assert.deepEqual(await fs.readFile(path.join(root, SAVED_DMI_ORIGINAL_PLAN_PATH)), bytes);
  const linked = path.join(folder, 'linked');
  await fs.mkdir(path.join(linked, '.cache'), { recursive: true });
  await fs.symlink(path.join(root, '.cache/dmi-grib'), path.join(linked, '.cache/dmi-grib'), process.platform === 'win32' ? 'junction' : 'dir');
  await assert.rejects(writeSavedDmiOriginalRestorePlan({ repositoryRoot: linked, plan }), /PLAN_PATH_INVALID/);
});

test('auth orchestration retains exact archived reader, normal baseline, GCM, final readback and closed-reader boundary', async () => {
  const source = await fs.readFile(new URL('./audit-saved-weather-inputs.mjs', import.meta.url), 'utf8');
  const body = source.split('export async function prepareAuthenticatedSavedDmiOriginalRestore(')[1].split('\nif (process.argv[1]')[0];
  for (const call of ['createReadOnlySavedWeatherClients(credentials)', 'prepareSavedAuditProgressBaseline(',
    'withAuthenticatedWeatherProgress(', 'privateWeatherPackJsonReadsClosed(componentInvocation)',
    'prepare.savedDmiOriginalHistoryDemand(', 'prepare.collectSavedDmiOriginalCaptures(']) assert.ok(body.includes(call), call);
  assert.equal((body.match(/oldProtected.describeCurrentProtectedPrivateProductionRuntime\(clients\)/g) ?? []).length, 3);
  assert.ok(body.lastIndexOf('describeCurrentProtectedPrivateProductionRuntime(clients)') < body.indexOf('prepare.writeSavedDmiOriginalRestorePlan('));
  assert.ok(body.indexOf('await fs.rm(work,') < body.indexOf('prepare.writeSavedDmiOriginalRestorePlan('));
  assert.doesNotMatch(body, /buildRavScoreRecoveryReplay|buildRavScoreProductionPartSeries|uploadImmutable|removeExact|update-weather|fetch\(/);
});
