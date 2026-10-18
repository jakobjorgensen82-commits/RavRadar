import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { spawnSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { buildPrivateDmiRecoveryRecord } from './lib/private-dmi-recovery-record.mjs';
import { buildIntegratedPartScoreSeries } from './lib/ravscore-integrated-runtime.mjs';
import { dmiExpectedIdentityForPart, verifiedIntegratedPartHourly } from './lib/ravscore-production-adapters.mjs';
import { buildNewestValidRavScoreRecoverySources } from './lib/ravscore-recovery-source-priority.mjs';
import { buildRavScoreRecoveryReplay } from './lib/ravscore-recovery-replay.mjs';
import { collectPostH0DmiOriginalDependencies } from './lib/post-h0-dmi-original-dependencies.mjs';
import { validateSavedCurrentForwardOriginalDocument, SAVED_CURRENT_FORWARD_PLAN_SOURCE,
  SAVED_CURRENT_FORWARD_PLAN_TARGET, SAVED_CURRENT_FORWARD_PLAN_PATH } from './lib/saved-current-forward-original-plan.mjs';
import { readSavedCurrentForwardPreparationReport, captureSavedCurrentWindowProcess,
  savedCurrentWindowChildEnvironment } from './saved-current-window-scratch.mjs';

const sha = value => crypto.createHash('sha256').update(value).digest('hex');
const canonical = value => JSON.stringify(value, (_key, item) => item && typeof item === 'object' && !Array.isArray(item)
  ? Object.fromEntries(Object.keys(item).sort().map(key => [key, item[key]])) : item);
const encoded = value => Buffer.from(canonical(value) + '\n');
const collectorPath = new URL('./lib/saved-current-forward-original-plan.mjs', import.meta.url);
const repositoryRoot = fileURLToPath(new URL('../', import.meta.url));
const refusal = { code: 'SAVED_CURRENT_FORWARD_ORIGINAL_PLAN_REFUSED' };
// Only the collector's non-null orchestration precondition is under test here.
// This sentinel is NEVER passed to ForPart or represented as an origin handle.
const NON_AUTHORITY_SENTINEL = Object.freeze({ unitOnly: 'NOT_AN_ORIGIN_HANDLE' });
const environment = Object.freeze({ RAVRADAR_SAVED_CURRENT_FORWARD_ORIGINAL_PLAN: SAVED_CURRENT_FORWARD_PLAN_SOURCE,
  RAVRADAR_SAVED_CURRENT_REPLAY_DIAGNOSTIC: SAVED_CURRENT_FORWARD_PLAN_SOURCE, RAVRADAR_WEATHER_CACHE_ONLY: 'true',
  RAVRADAR_WEATHER_STATE_EPOCH_BOOTSTRAP: 'false', RAVRADAR_WEATHER_STATE_EPOCH_CHECKPOINT_REENTRY: 'false' });
const createOptions = { environment, establishedNativeCurrentOrigin: NON_AUTHORITY_SENTINEL,
  targetReferenceAt: SAVED_CURRENT_FORWARD_PLAN_TARGET, expectedPartCount: 673 };
let instance = 0;
const freshCollectorModule = () => import(collectorPath.href + '?normalCollectorTest=' + ++instance);

test('source-bound forward preparation closes its real native ESM cycle without awaiting its own evaluation', async t => {
  const audit = (await fs.readFile(new URL('./audit-saved-weather-inputs.mjs', import.meta.url), 'utf8')).replace(/\r\n?/g, '\n');
  const preparation = (await fs.readFile(new URL('./prepare-saved-dmi-original-restore.mjs', import.meta.url), 'utf8')).replace(/\r\n?/g, '\n');
  const auditImport = audit.match(/import \{ SAVED_DMI_ORIGINAL_SCOPES,[\s\S]*?from '\.\/prepare-saved-dmi-original-restore\.mjs';/);
  const reverseImport = preparation.match(/import \{ prepareAuthenticatedSavedDmiOriginalRestore,[\s\S]*?from '\.\/audit-saved-weather-inputs\.mjs';/);
  assert.ok(auditImport && reverseImport, 'use the actual two-way static module edge');
  const start = audit.indexOf("      const prepare = await import('./prepare-saved-dmi-original-restore.mjs');", audit.indexOf("phase = 'FORWARD_ORIGINAL_PREPARATION'"));
  const staticStart = audit.indexOf('      const plan = buildSavedDmiOriginalRestorePlan(', audit.indexOf("phase = 'FORWARD_ORIGINAL_PREPARATION'"));
  const end = audit.indexOf('\n    }\n    const report =', Math.max(start, staticStart));
  assert.ok(end > Math.max(start, staticStart) && Math.max(start, staticStart) > 0);
  const body = audit.slice(start >= 0 ? start : staticStart, end)
    .replaceAll("'./prepare-saved-dmi-original-restore.mjs'", "'./preparation.mjs'");
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'rr-forward-native-esm-cycle-'));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const entry = path.join(root, 'audit.mjs');
  // Only the two existing import edges and exact normal forward call body are
  // projected here. The pure fixtures provide no archive/authentication grant,
  // provider, score, filesystem publication or production data.
  await fs.writeFile(entry, auditImport[0].replace('./prepare-saved-dmi-original-restore.mjs', './preparation.mjs') + `
    export function prepareAuthenticatedSavedDmiOriginalRestore() { throw Error('NOT_IN_SCOPE'); }
    export function savedAuditOriginalPreparationFailureCode() { throw Error('NOT_IN_SCOPE'); }
    async function forward() {
      const document = { captures: [], demands: [] }, source = {}, progressSource = 'synthetic',
        progressCacheKey = 'synthetic', progressBaselineTargetHour = '2026-10-17T20:00:00.000Z',
        ctx = { repository: 'synthetic' };
      let originalRestorePreparation;
      ${body}
      return originalRestorePreparation;
    }
    const result = await forward();
    if (result.status !== 'PURE_CALLS_COMPLETED') throw Error('FORWARD_CALLS_NOT_COMPLETED');
    console.log('FORWARD_MODULE_EVALUATION_COMPLETED');
  `);
  await fs.writeFile(path.join(root, 'preparation.mjs'), reverseImport[0].replace('./audit-saved-weather-inputs.mjs', './audit.mjs') + `
    export const SAVED_DMI_ORIGINAL_SCOPES = Object.freeze([]);
    export function savedDmiOriginalHistoryDemand() { throw Error('NOT_IN_SCOPE'); }
    export function inspectSelectedSavedDmiOriginalCaptures() { throw Error('NOT_IN_SCOPE'); }
    export function createSavedDmiOriginalDependencyDiscovery() { throw Error('NOT_IN_SCOPE'); }
    export function buildSavedDmiOriginalRestorePlan(value) {
      if (!Array.isArray(value.captures) || value.progressSource !== 'synthetic') throw Error('WRONG_CALL');
      return { synthetic: true };
    }
    export async function writeSavedDmiOriginalRestorePlan(value) {
      if (value.plan.synthetic !== true || value.repositoryRoot !== 'synthetic') throw Error('WRONG_CALL');
      return { status: 'PURE_CALLS_COMPLETED' };
    }
  `);
  const allowed = new Set(['PATH', 'SYSTEMROOT', 'WINDIR', 'TEMP', 'TMP', 'TMPDIR', 'COMSPEC', 'PATHEXT']);
  const env = Object.fromEntries(Object.entries(process.env).filter(([key]) => allowed.has(key.toUpperCase())));
  env.GITHUB_SHA = 'a'.repeat(40);
  const run = () => spawnSync(process.execPath, [entry], { cwd: root, env, encoding: 'utf8',
    timeout: 10_000, killSignal: 'SIGKILL', maxBuffer: 64 * 1024, windowsHide: true });
  const result = run();
  assert.equal(result.error, undefined); assert.equal(result.signal, null);
  assert.equal(result.status, 0, 'native cycle must settle, not Node exit13: ' + result.stderr);
  assert.equal(result.stdout.trim(), 'FORWARD_MODULE_EVALUATION_COMPLETED'); assert.equal(result.stderr, '');
  // Restore just the former dynamic edge. The same native loader must again
  // exhibit exit13; no test-only import shortcut may hide the actual hazard.
  if (start < 0) {
    const text = await fs.readFile(entry, 'utf8');
    await fs.writeFile(entry, text.replace('      const plan = buildSavedDmiOriginalRestorePlan(',
      "      const prepare = await import('./preparation.mjs');\n      const plan = prepare.buildSavedDmiOriginalRestorePlan(")
      .replace('await writeSavedDmiOriginalRestorePlan(', 'await prepare.writeSavedDmiOriginalRestorePlan('));
    const former = run();
    assert.equal(former.error, undefined); assert.equal(former.signal, null); assert.equal(former.status, 13);
    assert.match(former.stderr, /unsettled top-level await/i); assert.equal(former.stdout, '');
  }
});

async function normalFixtureFactory() {
  const text = (await fs.readFile(new URL('./test-post-h0-dmi-original-dependencies.mjs', import.meta.url), 'utf8')).replace(/\r\n?/g, '\n');
  const before = text.slice(text.indexOf('const sha ='), text.indexOf('const rowAt ='));
  assert.equal(sha(before), 'ce887df6095f47f80708c0694c36831ef2bbee58dd8c8b29773c2be7b1b8b294');
  const changes = [
    ["'2026-10-18T00:00:00.000Z'", "'2026-10-17T14:00:00.000Z'"],
    ["'SYNTHETIC-POST-H0-PART'", 'testPartId'],
  ];
  let after = before;
  for (const [old, next] of changes) { assert.equal(after.split(old).length, 2); after = after.replace(old, next); }
  let inverse = after;
  for (const [old, next] of [...changes].reverse()) inverse = inverse.replace(next, old);
  assert.equal(inverse, before, 'whole factory inverse: only synthetic date and explicit per-part test identity');
  const construct = new Function('crypto', 'assert', 'buildPrivateDmiRecoveryRecord', 'buildIntegratedPartScoreSeries',
    'dmiExpectedIdentityForPart', 'verifiedIntegratedPartHourly', 'buildNewestValidRavScoreRecoverySources', 'testPartId',
    after + '\nreturn fixture;');
  return (partId, options) => construct(crypto, assert, buildPrivateDmiRecoveryRecord, buildIntegratedPartScoreSeries,
    dmiExpectedIdentityForPart, verifiedIntegratedPartHourly, buildNewestValidRavScoreRecoverySources, partId)(options);
}
function normalReplay(f) {
  return buildRavScoreRecoveryReplay({ part: f.part, initialState: f.options.initialSelection.state,
    targetReferenceAt: SAVED_CURRENT_FORWARD_PLAN_TARGET, sourceRecords: f.options.recoverySources,
    publicHourly: [{ time: SAVED_CURRENT_FORWARD_PLAN_TARGET }], requireNativeGridSampling: true });
}

test('fixed collector is default-OFF, rejects mixed flags/null authority/duplicate outcomes and cannot persist an unsealed plan', async () => {
  const module = await freshCollectorModule();
  assert.equal(module.createSavedCurrentForwardOriginalPlan({ environment: {} }), null);
  for (const delta of [{ expectedPartCount: 672 }, { targetReferenceAt: '2026-10-17T21:00:00.000Z' },
    { establishedNativeCurrentOrigin: null }, ...Object.keys(environment).map(key => ({ environment: { ...environment, [key]: 'wrong' } }))]) {
    assert.throws(() => module.createSavedCurrentForwardOriginalPlan({ ...createOptions, ...delta }), refusal);
  }
  const factory = await normalFixtureFactory(), f = factory('COLLECTOR-BOUNDARY');
  const collector = module.createSavedCurrentForwardOriginalPlan(createOptions);
  assert.throws(() => collector.passed(f.part.partId), refusal);
  collector.observe(f.options);
  assert.throws(() => collector.observe(f.options), refusal);
  assert.throws(() => collector.refused(f.part.partId, new Error('PRIVATE-CANARY-OTHER-GUARD')), refusal);
  collector.passed(f.part.partId);
  assert.throws(() => collector.passed(f.part.partId), refusal);
  let error;
  try { normalReplay(f); } catch (value) { error = value; }
  assert.equal(error?.code, 'DMI_GRID_SAMPLING_APPLICABILITY_REQUIRED');
  assert.throws(() => collector.seal(error, { observedParts: 1, gridUnknownParts: 1 }), refusal);
  await assert.rejects(module.persistSavedCurrentForwardOriginalPlan(error), refusal);
});

test('673 normal synthetic states/candidates traverse collector pass/refuse boundaries, preserve first error and validate canonical metadata', async () => {
  const module = await freshCollectorModule(), factory = await normalFixtureFactory();
  const collector = module.createSavedCurrentForwardOriginalPlan(createOptions);
  const parts = new Map(), conditions = { coastalParts: { parts: {} } }, demands = [], captures = new Map();
  let firstError = null, unknown = 0, passed = 0;
  for (let index = 0; index < 673; index++) {
    const f = factory(`SYNTHETIC-COLLECTOR-${index}`, { coherent: index < 33 ? [] : [-3, 0, 3, 6, 9] });
    assert.equal(f.options.targetReferenceAt, SAVED_CURRENT_FORWARD_PLAN_TARGET);
    const snapshot = JSON.stringify(f.options);
    collector.observe(f.options);
    const plan = collectPostH0DmiOriginalDependencies(f.options);
    for (const capture of plan.captures) captures.set(canonical(capture), capture);
    try { assert.equal(normalReplay(f).replayedHourCount, 5); collector.passed(f.part.partId); passed++; }
    catch (error) {
      assert.equal(error.code, 'DMI_GRID_SAMPLING_APPLICABILITY_REQUIRED');
      assert.equal(error.samplingStatus, 'unknown');
      firstError ??= error; unknown++;
      collector.refused(f.part.partId, error);
      assert.throws(() => collector.passed(f.part.partId), refusal);
    }
    assert.equal(JSON.stringify(f.options), snapshot, 'whole normal source/state is immutable through collection and replay');
    parts.set(f.part.partId, f.part);
    conditions.coastalParts.parts[f.part.partId] = { ...f.part, ravScoreModel: { currentState: f.options.initialSelection.state } };
    demands.push({ partId: f.part.partId, initialStateAt: plan.initialStateAt,
      initialStateSha256: sha(canonical(f.options.initialSelection.state)), endAt: SAVED_CURRENT_FORWARD_PLAN_TARGET });
  }
  assert.equal(unknown, 33); assert.equal(passed, 640); assert.equal(captures.size, 3);
  const document = { schemaVersion: 1, kind: 'SAVED_CURRENT_FORWARD_ORIGINAL_DEPENDENCIES',
    progressSource: SAVED_CURRENT_FORWARD_PLAN_SOURCE, targetReferenceAt: SAVED_CURRENT_FORWARD_PLAN_TARGET,
    observedParts: 673, gridUnknownParts: unknown, demands: demands.sort((a, b) => a.partId.localeCompare(b.partId)),
    captures: [...captures].sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0).map(([, value]) => value),
    sourceAdmissionPerformed: false, continuationIssued: false, publicationInvoked: false };
  const bytes = encoded(document), validation = { parts, conditions };
  assert.deepEqual(validateSavedCurrentForwardOriginalDocument(bytes, validation), document);
  const corruptions = [value => value.demands.pop(), value => value.demands[1] = value.demands[0],
    value => delete value.gridUnknownParts, value => value.gridUnknownParts = 0, value => value.gridUnknownParts = 674,
    value => value.demands[0].initialStateSha256 = 'a'.repeat(64), value => value.demands[0].endAt = '2026-10-17T21:00:00.000Z',
    value => value.captures.push(value.captures[0]), value => value.captures[0].privateCanary = 'PRIVATE-CANARY',
    ...['sourceAdmissionPerformed', 'continuationIssued', 'publicationInvoked'].map(key => value => value[key] = true)];
  for (const corrupt of corruptions) {
    const value = structuredClone(document); corrupt(value);
    assert.throws(() => validateSavedCurrentForwardOriginalDocument(encoded(value), validation), refusal);
  }
  assert.throws(() => validateSavedCurrentForwardOriginalDocument(Buffer.from(JSON.stringify(document, null, 2)), validation), refusal);
  assert.throws(() => validateSavedCurrentForwardOriginalDocument(Buffer.from(bytes.toString().replace('"schemaVersion":1', '"schemaVersion":1,"schemaVersion":1')), validation), refusal);
  const missing = { coastalParts: { parts: { ...conditions.coastalParts.parts } } };
  delete missing.coastalParts.parts[demands[0].partId];
  assert.throws(() => validateSavedCurrentForwardOriginalDocument(bytes, { parts, conditions: missing }), refusal);
  assert.throws(() => collector.seal(Object.assign(new Error(firstError.message), firstError), { observedParts: 673, gridUnknownParts: 33 }), refusal);
  assert.throws(() => collector.seal(firstError, { observedParts: 672, gridUnknownParts: 33 }), refusal);
  assert.throws(() => collector.seal(firstError, { observedParts: 673, gridUnknownParts: 32 }), refusal);
  collector.seal(firstError, { observedParts: 673, gridUnknownParts: 33 });
  assert.throws(() => collector.seal(firstError, { observedParts: 673, gridUnknownParts: 33 }), refusal);
  assert.throws(() => module.createSavedCurrentForwardOriginalPlan(createOptions), refusal);
  // No fixed repository output is created/read. Wrong object refuses BEFORE IO.
  await assert.rejects(module.persistSavedCurrentForwardOriginalPlan(new Error('PRIVATE-CANARY')), refusal);
  const source = await fs.readFile(collectorPath, 'utf8');
  assert.match(source, /if \(!sealed \|\| sealed\.error !== error\) fail\(\);/);
  assert.match(source, /O_EXCL/); assert.match(source, /await handle\.sync\(\)/);
  assert.match(source, /ownedFileDescriptorClosed\(fd, identity\)/);
  assert.equal(SAVED_CURRENT_FORWARD_PLAN_PATH, '.cache/saved-current-forward-originals.json');
});

test('normal fixed child report requires complete collection/failed exit and never projects private log canaries', async t => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'rr-forward-plan-parser-'));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const collection = { schemaVersion: 1, kind: 'SAVED_CURRENT_REPLAY_COLLECTION', observedParts: 673, gridUnknownParts: 33,
    anotherGuardStoppedCollection: false, scope: 'NORMAL_CALLS_REACHED_BEFORE_FIRST_OTHER_STOP', allPartsReached: true,
    allRowsActuallyConsumed: false, minimalNecessaryOriginalsProved: false, continuationIssued: false,
    publicationInvoked: false, productionAuthority: false, ignoredPrivateCanary: 'PRIVATE-CANARY' };
  const line = value => 'RAVSCORE_SAVED_CURRENT_REPLAY_COLLECTION ' + JSON.stringify(value) + '\n';
  const raw = 'PRIVATE-CANARY\n' + line(collection) + 'Error: PRIVATE-CANARY\n';
  const result = await captureSavedCurrentWindowProcess({ executable: process.execPath,
    args: ['-e', `process.stderr.write(${JSON.stringify(raw)}); process.exitCode=1;`], root, logRoot: root,
    name: 'forward-plan-parser', environment: savedCurrentWindowChildEnvironment(), maximumMilliseconds: 10_000 });
  assert.equal(await fs.readFile(result.stderrPath, 'utf8'), raw);
  const report = await readSavedCurrentForwardPreparationReport(result);
  assert.equal(report.status, 'FORWARD_ORIGINAL_DEPENDENCIES_PREPARED');
  assert.equal(report.collection.gridUnknownParts, 33);
  assert.equal(report.prefixProbesRepeated, false); assert.equal(report.privatePayloadIncluded, false);
  assert.doesNotMatch(JSON.stringify(report), /PRIVATE-CANARY|currentUMps|2026-|SYNTHETIC/);
  for (const delta of [{ exitCode: 0 }, { exitCode: 2 }, { signal: 'SIGTERM' }, { code: 'SAVED_CURRENT_WINDOW_LOG_BOUND' }]) {
    assert.equal((await readSavedCurrentForwardPreparationReport({ ...result, ...delta })).status, 'UNAVAILABLE');
  }
  for (const alter of [value => delete value.gridUnknownParts, value => value.gridUnknownParts = 0,
    value => value.gridUnknownParts = 674, value => value.observedParts = 672,
    value => value.anotherGuardStoppedCollection = true, value => value.allPartsReached = false,
    ...['allRowsActuallyConsumed', 'minimalNecessaryOriginalsProved', 'continuationIssued', 'publicationInvoked', 'productionAuthority']
      .map(key => value => value[key] = true)]) {
    const value = structuredClone(collection); alter(value);
    await fs.writeFile(result.stderrPath, line(value));
    assert.equal((await readSavedCurrentForwardPreparationReport(result)).status, 'UNAVAILABLE');
  }
  for (const text of [line(collection) + line(collection), 'RAVSCORE_SAVED_CURRENT_REPLAY_COLLECTION {bad}\n',
    line(collection) + 'SAVED_CURRENT_FORWARD_ORIGINAL_PLAN_UNAVAILABLE PRIVATE-CANARY\n']) {
    await fs.writeFile(result.stderrPath, text);
    const rejected = await readSavedCurrentForwardPreparationReport(result);
    assert.equal(rejected.status, 'UNAVAILABLE'); assert.doesNotMatch(JSON.stringify(rejected), /PRIVATE-CANARY/);
  }
  assert.ok(!root.startsWith(repositoryRoot), 'only exclusive OS temp logs, never fixed private ROOT outputs');
});
