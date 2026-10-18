import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { assertSavedDmiOriginalRestoreScope, savedDmiOriginalHistoryDemand, savedDmiOriginalPreparationFailureCode,
  collectSavedDmiOriginalCaptures, collectSelectedSavedDmiOriginalCaptures, buildSavedDmiOriginalRestorePlan,
  writeSavedDmiOriginalRestorePlan, savedOriginalCanonicalJson, SAVED_DMI_ORIGINAL_TARGET as target,
  SAVED_DMI_ORIGINAL_PROGRESS as progressSource, SAVED_DMI_ORIGINAL_PROGRESS_KEY as progressCacheKey,
  SAVED_DMI_ORIGINAL_PLAN_PATH, SAVED_DMI_ORIGINAL_SCOPES } from './prepare-saved-dmi-original-restore.mjs';
import { prepareAuthenticatedSavedDmiOriginalRestore } from './audit-saved-weather-inputs.mjs';
import { buildIntegratedPartScoreSeries } from './lib/ravscore-integrated-runtime.mjs';
import { dmiExpectedIdentityForPart } from './lib/ravscore-production-adapters.mjs';
import { ravScoreModelBinding } from '../js/core/ravscore-model-contract.js';

const sha = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const at = offset => new Date(Date.parse(target) + offset * 3_600_000).toISOString();
const executionHead = 'e'.repeat(40);
const scope = { progressSource, progressCacheKey, progressBaselineTargetHour: target, executionHead };

// Exercise the actual entrypoint, not an already-evaluated function import:
// CLI top-level await previously deadlocked its audit -> self-import cycle.
const cliPath = fileURLToPath(new URL('./prepare-saved-dmi-original-restore.mjs', import.meta.url));
const cliNetworkGuard = 'data:text/javascript,' + encodeURIComponent(`
  import http from 'node:http';
  import https from 'node:https';
  import { syncBuiltinESMExports } from 'node:module';
  const forbidden = () => { process.stderr.write('PREPARE_CLI_FORBIDDEN_NETWORK\\n'); process.exit(97); };
  globalThis.fetch = forbidden;
  http.request = http.get = https.request = https.get = forbidden;
  syncBuiltinESMExports();
`);
const cliScopeArguments = [
  ['--progress-source', progressSource, 'other-1'],
  ['--progress-cache-key', progressCacheKey, progressCacheKey + '-prefix'],
  ['--progress-baseline-target-hour', target, at(1)],
];
function assertActualCliRejection(args, expectedCode, { head = executionHead, label = expectedCode } = {}) {
  // Do not inherit provider/storage credentials, NODE_OPTIONS or GitHub output
  // paths. Windows needs its OS/temp/path variables for Node's native runtime.
  const allowed = new Set(['PATH', 'SYSTEMROOT', 'WINDIR', 'TEMP', 'TMP', 'TMPDIR', 'COMSPEC', 'PATHEXT']);
  const env = Object.fromEntries(Object.entries(process.env).filter(([key]) => allowed.has(key.toUpperCase())));
  if (head !== null) env.GITHUB_SHA = head;
  const child = spawnSync(process.execPath, ['--import', cliNetworkGuard, cliPath, ...args], {
    cwd: path.dirname(path.dirname(cliPath)), env, encoding: 'utf8',
    timeout: 10_000, killSignal: 'SIGKILL', maxBuffer: 64 * 1024, windowsHide: true,
  });
  assert.equal(child.error, undefined, `${label}: child failed or exceeded its 10s deadline`);
  assert.equal(child.signal, null, `${label}: child must terminate normally`);
  assert.notEqual(child.status, 13, `${label}: no unsettled top-level await`);
  assert.equal(child.status, 1, `${label}: fail closed`);
  assert.equal(child.stdout, '', `${label}: no report or private payload`);
  assert.equal(child.stderr.trim(), expectedCode, `${label}: only the fixed safe rejection code`);
}

test('actual prepare CLI rejects every missing/invalid scope without exit 13, hanging or HTTP', () => {
  const code = 'SAVED_DMI_ORIGINAL_SCOPE_INVALID';
  assertActualCliRejection(['prepare'], code, { label: 'missing scope' });
  for (let index = 0; index < cliScopeArguments.length; index++) {
    const flag = cliScopeArguments[index][0];
    assertActualCliRejection(['prepare', ...cliScopeArguments.filter((_, i) => i !== index)
      .flatMap(([name, value]) => [name, value])], code, { label: `missing ${flag}` });
    assertActualCliRejection(['prepare', ...cliScopeArguments
      .flatMap(([name, value, invalid], i) => [name, i === index ? invalid : value])], code,
    { label: `invalid ${flag}` });
  }
  const args = ['prepare', ...cliScopeArguments.flatMap(([name, value]) => [name, value])];
  assertActualCliRejection(args, code, { head: null, label: 'missing execution head' });
  assertActualCliRejection(args, code, { head: 'not-a-head', label: 'invalid execution head' });
});

test('actual prepare CLI with valid scope reaches filesystem rejection before credentials or HTTP', async () => {
  const missingRoot = path.join(os.tmpdir(), `rr-original-cli-absent-${process.pid}-${crypto.randomUUID()}`);
  await assert.rejects(fs.lstat(missingRoot), { code: 'ENOENT' });
  const args = ['prepare', ...cliScopeArguments.flatMap(([name, value]) => [name, value])];
  assertActualCliRejection([...args, '--private-root', missingRoot],
    'SAVED_DMI_ORIGINAL_PREPARATION_REFUSED', { label: 'absent private root keeps ENOENT private' });
  assertActualCliRejection([...args, '--private-root', fileURLToPath(import.meta.url)],
    'PRIVATE_ROOT_INVALID', { label: 'existing non-directory private root' });
  await assert.rejects(fs.lstat(missingRoot), { code: 'ENOENT' });
});

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

test('only the two exact checkpoint-target pairs are accepted and bound without mixed scopes', () => {
  const f = fixture();
  for (const allowed of SAVED_DMI_ORIGINAL_SCOPES) {
    assert.doesNotThrow(() => assertSavedDmiOriginalRestoreScope({ ...allowed, executionHead }));
    const demands = savedDmiOriginalHistoryDemand({ ...f, targetReferenceAt: allowed.progressBaselineTargetHour });
    const plan = buildSavedDmiOriginalRestorePlan({ ...f, captures: [], demands, executionHead,
      progressSource: allowed.progressSource, progressCacheKey: allowed.progressCacheKey,
      targetReferenceAt: allowed.progressBaselineTargetHour });
    assert.equal(plan.binding.progressSource, allowed.progressSource);
    assert.equal(plan.binding.progressCacheKey, allowed.progressCacheKey);
    assert.equal(plan.binding.targetReferenceAt, allowed.progressBaselineTargetHour);
  }
  assert.throws(() => assertSavedDmiOriginalRestoreScope({ ...SAVED_DMI_ORIGINAL_SCOPES[0], executionHead,
    progressBaselineTargetHour: SAVED_DMI_ORIGINAL_SCOPES[1].progressBaselineTargetHour }), /SCOPE_INVALID/);
  assert.throws(() => savedDmiOriginalHistoryDemand({ ...f, targetReferenceAt: at(1) }), /SCOPE_INVALID/);
});

test('forward-only 390663 restore-plan tuple does not widen the old H0-51 collectors', () => {
  const f = fixture(), captures = collectSavedDmiOriginalCaptures(f);
  const forward = { progressSource: '39066350748-1',
    progressCacheKey: 'weather-private-progress-encrypted-v2-Linux-main-39066350748-1',
    targetReferenceAt: '2026-10-17T20:00:00.000Z' };
  // Synthetic metadata binding only: these expectations confer no native,
  // authenticated-checkpoint, forward-selection or download authority.
  const demands = [{ partId: f.part.partId, initialStateAt: '2026-10-16T10:00:00.000Z',
    initialStateSha256: sha(savedOriginalCanonicalJson(f.conditions.coastalParts.parts[f.part.partId].ravScoreModel.currentState)),
    endAt: forward.targetReferenceAt }];
  const input = { ...f, ...forward, demands, captures, executionHead, nonce: '1'.repeat(32) };
  const before = savedOriginalCanonicalJson(input), plan = buildSavedDmiOriginalRestorePlan(input);
  for (const key of ['progressSource', 'progressCacheKey', 'targetReferenceAt']) {
    assert.equal(plan.binding[key], forward[key]);
  }
  assert.deepEqual(plan.originals, captures);
  assert.equal(plan.binding.historyDemandSha256, sha(savedOriginalCanonicalJson(demands)));
  assert.equal(savedOriginalCanonicalJson(input), before, 'metadata planning never retags its inputs');
  for (const delta of [{ progressSource }, { progressCacheKey }, { targetReferenceAt: target },
    { progressSource: '39066350748-2' }, { executionHead: '' }]) {
    assert.throws(() => buildSavedDmiOriginalRestorePlan({ ...input, ...delta }), /SCOPE_INVALID/);
  }
  assert.throws(() => assertSavedDmiOriginalRestoreScope({ ...forward,
    progressBaselineTargetHour: forward.targetReferenceAt, executionHead }), /SCOPE_INVALID/);
  assert.throws(() => savedDmiOriginalHistoryDemand({ ...f,
    targetReferenceAt: forward.targetReferenceAt }), /SCOPE_INVALID/);
  assert.throws(() => collectSelectedSavedDmiOriginalCaptures({ ...f, protectedBulk: f.document,
    targetReferenceAt: forward.targetReferenceAt }), /SCOPE_INVALID/);
  assert.throws(() => collectSavedDmiOriginalCaptures({ ...f, demands }), /DEMAND_INVALID/);
});

test('zero selected original demand reports a no-op without any plan or cache directory', async t => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'rr-original-noop-test-'));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const f = fixture(), plan = buildSavedDmiOriginalRestorePlan({ ...f, captures: [], executionHead });
  const report = await writeSavedDmiOriginalRestorePlan({ repositoryRoot: root, plan });
  assert.equal(report.status, 'NO_ORIGINAL_RESTORE_REQUIRED');
  assert.equal(report.originalCount, 0); assert.equal(report.planBytes, 0); assert.equal(report.planSha256, '');
  assert.deepEqual(await fs.readdir(root), []);
  assert.equal(report.providerRequestsPerformed, false);
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

test('normal-selected planner rejects an array hourly donor before it can become zero demand', () => {
  const f = fixture(), bad = structuredClone(f.document);
  bad.zones[f.identity.entityId].hourly = [];
  assert.throws(() => collectSelectedSavedDmiOriginalCaptures({ ...f, protectedBulk: bad,
    progressCandidate: f.document }), /SAVED_DMI_ORIGINAL_DONOR_INVALID/);
});

test('normal-selected planner retains the 10000-row donor bound before no-op classification', () => {
  const f = fixture(), bad = structuredClone(f.document);
  bad.zones[f.identity.entityId].hourly = Object.fromEntries(Array.from({ length: 10_001 }, (_, i) => [String(i), {}]));
  assert.throws(() => collectSelectedSavedDmiOriginalCaptures({ ...f, protectedBulk: f.document,
    progressCandidate: bad }), /SAVED_DMI_ORIGINAL_DONOR_INVALID/);
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
    'prepare.savedDmiOriginalHistoryDemand(', 'prepare.collectSelectedSavedDmiOriginalCaptures(']) assert.ok(body.includes(call), call);
  assert.equal((body.match(/oldProtected.describeCurrentProtectedPrivateProductionRuntime\(clients\)/g) ?? []).length, 3);
  assert.ok(body.lastIndexOf('describeCurrentProtectedPrivateProductionRuntime(clients)') < body.indexOf('prepare.writeSavedDmiOriginalRestorePlan('));
  assert.ok(body.indexOf('await fs.rm(work,') < body.indexOf('prepare.writeSavedDmiOriginalRestorePlan('));
  assert.ok(body.includes('forecastIndex(await noSymlinks(ctx.root,'));
  assert.ok(body.includes('visitSavedPartCurrents(savedForecastIndex, parts, () => {}, collectPart)'));
  assert.ok(body.indexOf('prepare.createSavedDmiOriginalDependencyDiscovery({ protectedBulk, progressCandidate })')
    < body.indexOf('const collectPart ='), 'one document-bound metadata index precedes the national PART visitor');
  assert.ok(body.includes('targetReferenceAt: progressBaselineTargetHour, dependencyDiscovery'));
  assert.doesNotMatch(body, /const donors =|originals\.push\(\.\.\.prepare\.collectSavedDmiOriginalCaptures/);
  assert.doesNotMatch(body, /buildRavScoreRecoveryReplay|buildRavScoreProductionPartSeries|uploadImmutable|removeExact|update-weather|fetch\(/);
});

test('normal selected qualified same-original successor is not a missing-original restore dependency', async t => {
  // Import the exact shared normal producer, never its acquisition entrypoint.
  const normal = await import('./lib/private-dmi-recovery-record.mjs');
  const store = await import('./lib/dmi-forecast-store.mjs');
  const adapters = await import('./lib/ravscore-production-adapters.mjs');
  const recovery = await import('./lib/ravscore-recovery-replay.mjs');
  const priority = await import('./lib/ravscore-recovery-source-priority.mjs');
  const { createProtectedDmiNativeCurrentInspector } = await import('./lib/protected-dmi-native-current-proofs.mjs');

  // Complete synthetic native captures, not GRIB/decoder/provider proof. The
  // NORMAL original inspector and strict sampling admission must accept the
  // supplied native contexts; an opaque marker is not used as admission.
  const f = fixture(), old = structuredClone(f.document);
  old.zones[f.identity.entityId].hourly = {};
  const sample = f.native.find(row => row.time === at(-2));
  const sampling = value => ({ contractId: 'dmi-native-grid-sampling-v1', elementIndex: 71,
    gridIndexIdentitySha256: sha('selected-plan-synthetic-grid-index-order'),
    coordinateInterpretation: 'dmi-dkss-grib1-header-endpoints-v1',
    gridDefinitionSha256: value.gridDefinitionSha256, gridPoint: [...value.gridPoint],
    fieldSet: [...value.fieldSet], optionalFieldSet: [...value.optionalFieldSet] });
  for (let offset = -54; offset <= 3; offset += 3) {
    const row = structuredClone(sample), native = row.sources.current;
    row.time = native.nativeValidTime = at(offset);
    native.leadTimeHours = 100 + offset;
    native.itemId = `synthetic-selected-original-${offset}`;
    native.assetIdentitySha256 = sha(`selected-asset-${offset}`);
    native.contentSha256 = sha(`selected-content-${offset}`);
    old.zones[f.identity.entityId].hourly[row.time] = row;
  }
  const fresh = structuredClone(old);
  for (const row of Object.values(fresh.zones[f.identity.entityId].hourly)) {
    row.sources.current.nativeGridSampling = sampling(row.sources.current);
  }
  const replaced = fresh.zones[f.identity.entityId].hourly[at(-27)];
  replaced['current-u'] += 0.3;
  replaced['current-v'] += 0.1;
  replaced.sources.current.nativeGridSampling = sampling(replaced.sources.current);
  const snapshots = JSON.stringify({ old, fresh });
  const feature = { properties: { id: f.identity.entityId, dataPoint: f.part.waterPoint } };
  const project = (document, protectPreviousDmi) => {
    const record = normal.buildPrivateDmiRecoveryRecord(feature, document, target,
      { startAt: f.demands[0].startAt, expectedIdentity: f.identity, protectPreviousDmi });
    assert.ok(record, 'the actual normal private record exists');
    return { ...record, hourly: adapters.verifiedIntegratedPartHourly(record, document, f.identity.entityId, f.part,
      { requireNativeGridSampling: false }) };
  };
  const previous = { source: 'deployed-private-runtime', nativeCurrentContexts: [old], record: project(old, true) };
  const progressive = { source: 'progressive-private-dmi', nativeCurrentContexts: [fresh], record: project(fresh, false) };
  const oldHour = previous.record.hourly.find(row => row.time === at(-26));
  const freshHour = progressive.record.hourly.find(row => row.time === at(-26));
  assert.equal(store.inspectDmiForecastGridSampling(oldHour.currentProvenance, 'current', oldHour.time, f.identity).status, 'unknown');
  assert.equal(store.inspectDmiForecastGridSampling(freshHour.currentProvenance, 'current', freshHour.time, f.identity).status, 'coherent');
  for (const [document, row] of [[old, oldHour], [fresh, freshHour]]) {
    const proof = createProtectedDmiNativeCurrentInspector({ contexts: [document] }).inspectOriginals({ part: f.part, row });
    assert.equal(proof.ok, true, 'each selected endpoint has its actual full native original');
    assert.equal(proof.nativeRows.length, 2, 'the non-native OWNER hour requires both actual native brackets');
  }
  const selected = priority.buildNewestValidRavScoreRecoverySources({ fallbackSource: previous,
    preferredSource: progressive, protectedPreviousSource: previous, productionReferenceAt: target, part: f.part });
  const permitted = recovery.buildRavScorePermittedCurrentHistory({ part: f.part, referenceAt: at(-2),
    sourceRecords: selected, requireNativeGridSampling: true });
  assert.equal(permitted.length, 49, 'the actual OWNER window is fully supplied');
  assert.equal(permitted[24].time, at(-26));
  assert.equal(permitted[24].currentSpeedMps, freshHour.currentSpeedMps, 'normal same-original decoder priority selected the successor');
  assert.notEqual(permitted[24].currentSpeedMps, oldHour.currentSpeedMps);
  const associatedOld = priority.originalCurrentDecoderHistory(selected, permitted, f.part);
  assert.ok(associatedOld, 'normal invocation-local original association, not a persisted proof flag');
  assert.equal(associatedOld[24].currentSpeedMps, oldHour.currentSpeedMps);
  assert.equal(JSON.stringify({ old, fresh }), snapshots, 'normal selection preserved both whole original documents');

  // A coherent marker alone is insufficient: an unrelated capture at the
  // same hour/run must not remove the protected old dependency. Let the real
  // priority retain its previous winner and the strict OWNER reader reject it.
  const alternate = structuredClone(fresh);
  alternate.zones[f.identity.entityId].hourly[at(-27)].sources.current.contentSha256 = sha('unrelated-original-bytes');
  const alternateSource = { source: 'progressive-private-dmi', nativeCurrentContexts: [alternate], record: project(alternate, false) };
  const alternateHour = alternateSource.record.hourly.find(row => row.time === at(-26));
  assert.equal(store.inspectDmiForecastGridSampling(alternateHour.currentProvenance,
    'current', alternateHour.time, f.identity).status, 'coherent');
  assert.equal(createProtectedDmiNativeCurrentInspector({ contexts: [alternate] })
    .inspectOriginals({ part: f.part, row: alternateHour }).ok, true);
  const notSuperseded = priority.buildNewestValidRavScoreRecoverySources({ fallbackSource: previous,
    preferredSource: alternateSource, protectedPreviousSource: previous, productionReferenceAt: target, part: f.part });
  assert.throws(() => recovery.buildRavScorePermittedCurrentHistory({ part: f.part, referenceAt: at(-2),
    sourceRecords: notSuperseded, requireNativeGridSampling: true }), error => {
    assert.equal(error.code, 'DMI_GRID_SAMPLING_APPLICABILITY_REQUIRED');
    assert.equal(error.samplingStatus, 'unknown');
    return true;
  });

  const captures = collectSelectedSavedDmiOriginalCaptures({ ...f, protectedBulk: old, progressCandidate: fresh });
  const plan = buildSavedDmiOriginalRestorePlan({ ...f, captures, executionHead });
  assert.equal(plan.originals.some(value => value.assetIdentitySha256 === replaced.sources.current.assetIdentitySha256), false,
    'restore must not depend on an obsolete capture already superseded by its selected, fully qualified same-original successor');
  const requiredOld = collectSelectedSavedDmiOriginalCaptures({ ...f, protectedBulk: old, progressCandidate: alternate });
  assert.ok(requiredOld.some(value => value.assetIdentitySha256 === replaced.sources.current.assetIdentitySha256),
    'an unrelated coherent successor does not remove the protected dependency');
  const missing = structuredClone(old);
  delete missing.zones[f.identity.entityId].hourly[at(-27)];
  const missingRecord = structuredClone(previous.record);
  missingRecord.hourly = missingRecord.hourly.filter(row => row.time !== at(-27));
  const otherPart = { ...f.part, partId: 'SYNTHETIC-METADATA-ONLY', waterPoint: [8.01, 55] };
  const otherIdentity = adapters.dmiExpectedIdentityForPart(otherPart);
  const otherRow = structuredClone(old.zones[f.identity.entityId].hourly[at(-27)]);
  Object.assign(otherRow.sources.current, otherIdentity, { gridPoint: [...otherPart.waterPoint], distanceKm: 0 });
  otherRow['current-u'] = 91; otherRow['current-v'] = -73;
  const metadataOnly = structuredClone(missing);
  metadataOnly.zones[otherIdentity.entityId] = { ...otherIdentity, hourly: { [otherRow.time]: otherRow } };
  const unselectedMetadata = structuredClone(otherRow);
  unselectedMetadata.time = unselectedMetadata.sources.current.nativeValidTime = at(2);
  Object.assign(unselectedMetadata.sources.current, { leadTimeHours: 102, itemId: 'synthetic-unselected-metadata',
    assetIdentitySha256: sha('unselected-metadata-asset'), contentSha256: sha('unselected-metadata-content') });
  metadataOnly.zones[otherIdentity.entityId].hourly[at(2)] = unselectedMetadata;
  const metadataInput = document => ({ ...f, protectedBulk: document,
    persistedHourlyByPart: new Map([[f.part.partId, missingRecord]]) });
  const metadataSnapshot = JSON.stringify(metadataOnly);
  const discovered = collectSelectedSavedDmiOriginalCaptures(metadataInput(metadataOnly));
  const { canonicalSavedDmiOriginalCapture } = await import('./audit-saved-weather-inputs.mjs');
  const wanted = canonicalSavedDmiOriginalCapture(old.zones[f.identity.entityId].hourly[at(-27)].sources.current);
  assert.ok(discovered.some(value => savedOriginalCanonicalJson(value) === savedOriginalCanonicalJson(wanted)),
    'the actual selected missing endpoint has one complete authentic same-document metadata capture');
  assert.equal(discovered.some(value => value.assetIdentitySha256 === unselectedMetadata.sources.current.assetIdentitySha256), false,
    'an unselected foreign metadata capture is not an independent donor-union dependency');
  assert.doesNotMatch(JSON.stringify(discovered), /current-u|current-v|currentUMps|currentVMps|gridPoint|samplingPoint/);
  assert.equal(JSON.stringify(metadataOnly), metadataSnapshot, 'foreign numeric values and every original remain untouched');
  assert.equal(createProtectedDmiNativeCurrentInspector({ contexts: [metadataOnly] })
    .inspectOriginals({ part: f.part, row: oldHour }).code, 'DMI_NATIVE_PROOF_NATIVE_ENDPOINT_MISSING',
  'dependency discovery cannot supply the missing own numeric original or qualify the foreign PART');
  const ownMetadata = collectSelectedSavedDmiOriginalCaptures({ ...f, protectedBulk: missing,
    persistedHourlyByPart: new Map([[f.part.partId, previous.record]]) });
  assert.ok(ownMetadata.some(value => savedOriginalCanonicalJson(value) === savedOriginalCanonicalJson(wanted)),
  'an own exact-native-time forecast preserves legitimate capture metadata, not raw numeric precision');
  assert.deepEqual(discovered, ownMetadata, 'different discovery paths resolve the same exact selected original dependencies');
  const { createSavedDmiOriginalDependencyDiscovery } = await import('./prepare-saved-dmi-original-restore.mjs');
  const dependencyDiscovery = createSavedDmiOriginalDependencyDiscovery({ protectedBulk: metadataOnly });
  assert.ok(Object.isFrozen(dependencyDiscovery));
  assert.deepEqual(collectSelectedSavedDmiOriginalCaptures({ ...metadataInput(metadataOnly), dependencyDiscovery }), discovered);
  assert.deepEqual(collectSelectedSavedDmiOriginalCaptures({ ...metadataInput(metadataOnly), dependencyDiscovery }), discovered,
    'one invocation-local handle safely reuses its own unchanged document index');
  assert.throws(() => collectSelectedSavedDmiOriginalCaptures({ ...metadataInput(metadataOnly),
    dependencyDiscovery: { kind: dependencyDiscovery.kind, resolve: () => [wanted] } }), /INPUTS_UNAVAILABLE/,
  'a label/function cannot inject capture authority');
  assert.throws(() => collectSelectedSavedDmiOriginalCaptures({ ...metadataInput(structuredClone(metadataOnly)),
    dependencyDiscovery }), /INPUTS_UNAVAILABLE/, 'a genuine handle cannot be transferred to different document objects');
  const dependencyRecord = normal.buildPrivateDmiRecoveryRecord(feature, metadataOnly, target,
    { startAt: f.demands[0].startAt, expectedIdentity: f.identity, protectPreviousDmi: true,
      persistedHourly: missingRecord.hourly });
  const dependencySource = { source: 'deployed-private-runtime', nativeCurrentContexts: [metadataOnly],
    record: { ...dependencyRecord, hourly: adapters.verifiedIntegratedPartHourly(dependencyRecord,
      metadataOnly, f.identity.entityId, f.part, { requireNativeGridSampling: false }) } };
  const dependencySelected = priority.buildNewestValidRavScoreRecoverySources({ fallbackSource: dependencySource,
    protectedPreviousSource: dependencySource, productionReferenceAt: target, part: f.part });
  assert.throws(() => recovery.buildRavScorePermittedCurrentHistory({ part: f.part, referenceAt: at(-2),
    sourceRecords: dependencySelected, requireNativeGridSampling: true }), error => {
    assert.equal(error.code, 'DMI_GRID_SAMPLING_APPLICABILITY_REQUIRED'); return true;
  }, 'a successful original dependency plan does not bypass the unchanged strict OWNER reader');
  const equivalentClock = structuredClone(metadataOnly);
  equivalentClock.zones[otherIdentity.entityId].hourly[at(-27)].sources.current.acquiredAt = at(-1).replace('.000Z', 'Z');
  assert.deepEqual(collectSelectedSavedDmiOriginalCaptures(metadataInput(equivalentClock)), discovered,
    'the normal canonical capture helper accepts equivalent wire spelling, not a different microsecond');
  const conflict = structuredClone(metadataOnly);
  const conflictPart = { ...otherPart, partId: 'SYNTHETIC-METADATA-CONFLICT' };
  const conflictIdentity = adapters.dmiExpectedIdentityForPart(conflictPart);
  const conflictingRow = structuredClone(otherRow);
  Object.assign(conflictingRow.sources.current, conflictIdentity, { contentSha256: sha('conflicting-metadata-bytes') });
  conflict.zones[conflictIdentity.entityId] = { ...conflictIdentity, hourly: { [conflictingRow.time]: conflictingRow } };
  assert.throws(() => collectSelectedSavedDmiOriginalCaptures(metadataInput(conflict)), /SELECTED_ENDPOINT_UNAVAILABLE/,
    'a matching endpoint identity with conflicting complete captures is not resolved by donor order');
  for (const change of [{ contentSha256: undefined }, { contentLengthBytes: undefined },
    { acquiredAt: at(-1).replace('.000Z', '.000001Z') }, { itemCreatedAt: undefined },
    { itemUpdatedAt: at(-98) }, { itemId: 'another-item' }, { assetIdentitySha256: sha('another-asset') }]) {
    const invalid = structuredClone(metadataOnly);
    Object.assign(invalid.zones[otherIdentity.entityId].hourly[at(-27)].sources.current, change);
    assert.throws(() => collectSelectedSavedDmiOriginalCaptures(metadataInput(invalid)), /SELECTED_ENDPOINT_UNAVAILABLE/,
      'capture completeness, exact microseconds and every stored endpoint identity field remain mandatory');
  }
  assert.throws(() => collectSelectedSavedDmiOriginalCaptures({ ...metadataInput(missing),
    progressCandidate: metadataOnly }), /SELECTED_ENDPOINT_UNAVAILABLE/,
  'another authenticated document cannot donate metadata to the selected protected source');
  const conflictingNative = structuredClone(old);
  const duplicateNative = structuredClone(conflictingNative.zones[f.identity.entityId].hourly[at(-27)]);
  duplicateNative['current-u'] += 0.1;
  conflictingNative.zones[f.identity.entityId].hourly['duplicate-original-time'] = duplicateNative;
  assert.throws(() => collectSelectedSavedDmiOriginalCaptures({ ...f, protectedBulk: conflictingNative,
    persistedHourlyByPart: new Map([[f.part.partId, previous.record]]) }), /SELECTED_ENDPOINT_UNAVAILABLE/,
  'an actual native numeric conflict cannot fall through to metadata discovery');
  const mismatchedProjection = structuredClone(previous.record);
  mismatchedProjection.hourly.find(row => row.time === at(-26)).currentUMps += 0.02;
  assert.throws(() => collectSelectedSavedDmiOriginalCaptures({ ...f, protectedBulk: old,
    persistedHourlyByPart: new Map([[f.part.partId, mismatchedProjection]]) }), /SELECTED_ENDPOINT_UNAVAILABLE/,
  'an actual projection mismatch cannot fall through to metadata discovery');
  assert.throws(() => collectSelectedSavedDmiOriginalCaptures({ ...f, protectedBulk: missing,
    progressCandidate: alternate, persistedHourlyByPart: new Map([[f.part.partId, missingRecord]]) }),
  /SELECTED_ENDPOINT_UNAVAILABLE/, 'missing original bracket without full metadata is not reconstructed from a neighbouring interpolated top source');
  const held = structuredClone(previous.record);
  held.hourly.find(row => row.time === at(-2)).currentStateOnlyHold = { sourceValidTime: at(-3) };
  assert.throws(() => collectSelectedSavedDmiOriginalCaptures({ ...f, protectedBulk: old, progressCandidate: fresh,
    persistedHourlyByPart: new Map([[f.part.partId, held]]) }), /HOLD_SUPPORT_UNAVAILABLE/);

  // The ordinary adapter can discard a historical top-level context while
  // preserving its persisted finite rows until normal source selection. Do
  // not demand the rejected donor when the actual selected successor supplies
  // every same-hour current with its own complete, qualified native context.
  const rejectedContext = structuredClone(old);
  rejectedContext.currentVectorSelection = 'historical-context-not-admitted';
  const rawRejected = normal.buildPrivateDmiRecoveryRecord(feature, rejectedContext, target,
    { startAt: f.demands[0].startAt, expectedIdentity: f.identity,
      persistedHourly: previous.record.hourly, protectPreviousDmi: true });
  const finiteCurrentCount = rows => rows.filter(row => Number.isFinite(row.currentUMps)
    && Number.isFinite(row.currentVMps)).length;
  assert.equal(finiteCurrentCount(rawRejected.hourly), 58);
  const { verifiedProtectedDmiPartHourly } = await import('./lib/protected-dmi-current-context.mjs');
  const sanitizedRejected = { source: previous.source, nativeCurrentContexts: [rejectedContext],
    record: { ...rawRejected, hourly: verifiedProtectedDmiPartHourly(rawRejected, [rejectedContext],
      f.identity.entityId, f.part, { requireNativeGridSampling: false }) } };
  assert.equal(finiteCurrentCount(sanitizedRejected.record.hourly), 0);
  const selectedReplacement = priority.buildNewestValidRavScoreRecoverySources({ fallbackSource: sanitizedRejected,
    preferredSource: progressive, protectedPreviousSource: sanitizedRejected, productionReferenceAt: target, part: f.part });
  assert.equal(recovery.buildRavScorePermittedCurrentHistory({ part: f.part, referenceAt: at(-2),
    sourceRecords: selectedReplacement, requireNativeGridSampling: true }).length, 49);
  assert.deepEqual(collectSelectedSavedDmiOriginalCaptures({ ...f, protectedBulk: rejectedContext, progressCandidate: fresh,
    persistedHourlyByPart: new Map([[f.part.partId, previous.record]]) }), [],
  'normal qualified selected replacements cover sanitizer losses without demanding the rejected donor');
  assert.throws(() => collectSelectedSavedDmiOriginalCaptures({ ...f, protectedBulk: rejectedContext,
    persistedHourlyByPart: new Map([[f.part.partId, previous.record]]) }), /SELECTED_ENDPOINT_UNAVAILABLE/,
  'sanitizer losses without a selected, native-verifiable same-hour replacement cannot become a no-op');

  const preflight = (await import('./prepare-saved-dmi-original-restore.mjs')).inspectSelectedSavedDmiOriginalCaptures;
  assert.equal(typeof preflight, 'function', 'selected preflight uses the same normal collector');
  const originalInput = { ...f, protectedBulk: missing, progressCandidate: alternate,
    persistedHourlyByPart: new Map([[f.part.partId, missingRecord]]) };
  const rejected = preflight(originalInput);
  assert.equal(rejected.status, 'PARTIAL');
  assert.equal(rejected.inspectionScope, 'FIRST_FAILURE_PER_PART');
  assert.equal(rejected.firstFailure.branch, 'INSPECT_ORIGINALS_REJECTED');
  assert.equal(rejected.firstFailure.reasonCode, 'DMI_NATIVE_PROOF_NATIVE_ENDPOINT_MISSING');
  assert.equal(rejected.firstFailure.code, 'SAVED_DMI_ORIGINAL_SELECTED_ENDPOINT_UNAVAILABLE');
  const loss = preflight({ ...f, protectedBulk: rejectedContext,
    persistedHourlyByPart: new Map([[f.part.partId, previous.record]]) });
  assert.equal(loss.firstFailure.branch, 'SANITIZER_LOSS_UNCOVERED');
  assert.equal(loss.firstFailure.reasonCode, 'SANITIZER_CURRENT_LOSS_UNCOVERED');
  assert.equal(loss.firstFailure.target48hRelation, 'BEFORE_TARGET_48H');
  const hold = preflight({ ...f, protectedBulk: old, progressCandidate: fresh,
    persistedHourlyByPart: new Map([[f.part.partId, held]]) });
  assert.equal(hold.firstFailure.branch, 'HOLD_SUPPORT_UNAVAILABLE');
  assert.equal(hold.firstFailure.target48hRelation, 'UNAVAILABLE');
  assert.deepEqual(preflight({ ...f, protectedBulk: old, progressCandidate: fresh }), {
    status: 'MEASURED', inspectionScope: 'FIRST_FAILURE_PER_PART', firstFailure: null });
  assert.throws(() => preflight({ ...f, protectedBulk: { zones: { [f.identity.entityId]: { hourly: [] } } } }), /DONOR_INVALID/);
  // The diagnostic never weakens the real preparation failures above.
  assert.throws(() => collectSelectedSavedDmiOriginalCaptures(originalInput), /SELECTED_ENDPOINT_UNAVAILABLE/);
  assert.equal(JSON.stringify({ old, fresh }), snapshots, 'inspection does not rewrite either original');

  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'rr-selected-preflight-'));
  t.after(() => fs.rm(directory, { recursive: true, force: true }));
  const { packDmiPartContinuity } = await import('./lib/dmi-part-continuity.mjs');
  const { inspectDmiForecastFile } = await import('./lib/dmi-forecast-file.mjs');
  const { measureSelectedSavedDmiOriginalPreflight } = await import('./audit-saved-weather-inputs.mjs');
  const file = path.join(directory, 'forecast.json');
  const byTime = new Map(missingRecord.hourly.map(row => [row.time, row]));
  const continuity = { zoneId: `PART::${f.part.partId}`, point: f.part.waterPoint,
    hourly: Array.from({ length: 121 }, (_, i) => byTime.get(at(-57 + i)) ?? { time: at(-57 + i), sources: {} }) };
  await fs.writeFile(file, JSON.stringify({ zones: {}, partContinuity: await packDmiPartContinuity(
    new Map([[f.part.partId, continuity]]), [f.part], at(-57)) }));
  const index = await inspectDmiForecastFile(file);
  const measured = await measureSelectedSavedDmiOriginalPreflight({ ...originalInput,
    baselineIndex: index, targetReferenceAt: target });
  assert.equal(measured.status, 'PARTIAL');
  assert.equal(measured.partsVisited, 1); assert.equal(measured.partsExpected, 1);
  assert.equal(measured.firstFailureCounts.INSPECT_ORIGINALS_REJECTED, 1);
  assert.equal(measured.reasonCounts.DMI_NATIVE_PROOF_NATIVE_ENDPOINT_MISSING, 1);
  assert.equal(measured.timeRelationKind, 'TARGET_48H_DIAGNOSTIC_RELATION');
  assert.equal(measured.fullSelectedCoverageProved, false);
  assert.equal(measured.originalFilesAvailableProved, false);
  assert.equal(measured.artifactGatePassed, false);
  assert.equal(measured.rawFilesOpened, false);
  assert.doesNotMatch(JSON.stringify(measured), /SYNTHETIC|partId|currentUMps|currentVMps|itemId|Sha256|samplingPoint|nativeRows/);
});
