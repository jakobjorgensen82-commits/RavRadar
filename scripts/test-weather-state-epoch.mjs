import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { spawnSync } from 'node:child_process';
import { weatherStateEpochEnvironment, WEATHER_STATE_EPOCH_STAGES,
  loadInstalledWeatherStateEpochInputView, weatherStateEpochStartFreshness,
  weatherStateEpochRefusal, writeWeatherStateEpochOutputs } from './weather-state-epoch.mjs';
import { assertVerifiedWeatherStateEpochArchive } from './lib/weather-state-epoch-archive.mjs';

const valid = { RAVRADAR_WEATHER_STATE_EPOCH_BOOTSTRAP: 'true', GITHUB_EVENT_NAME: 'workflow_dispatch',
  GITHUB_REF: 'refs/heads/main', GITHUB_RUN_ID: '1234', GITHUB_RUN_ATTEMPT: '1',
  GITHUB_SHA: 'a'.repeat(40), RAVRADAR_PRODUCTION_TARGET_HOUR: '2026-10-16T12:00:00Z',
  QUICK_CONFIRMATION: 'false', QUICK_PROGRESS_SOURCE: '', CHECKPOINT_TARGET_HOUR: '', CHECKPOINT_ONLY: 'false' };

test('epoch is an explicit fresh normal target, never a fixed checkpoint/recovery alias', () => {
  assert.deepEqual(weatherStateEpochEnvironment(valid), { runId: '1234', attempt: '1',
    sourceHead: 'a'.repeat(40), targetReferenceAt: '2026-10-16T12:00:00.000Z' });
  for (const [key, value] of [['RAVRADAR_WEATHER_STATE_EPOCH_BOOTSTRAP', 'false'],
    ['GITHUB_EVENT_NAME', 'schedule'], ['GITHUB_REF', 'refs/heads/other'], ['GITHUB_SHA', 'unknown'],
    ['GITHUB_RUN_ID', '0'], ['GITHUB_RUN_ATTEMPT', '-1'], ['QUICK_CONFIRMATION', 'true'],
    ['QUICK_PROGRESS_SOURCE', '38768040429-1'], ['CHECKPOINT_TARGET_HOUR', '2026-10-15T16:00:00Z'],
    ['CHECKPOINT_ONLY', 'true'], ['RAVRADAR_NATIVE_IDENTITY_RECOVERY_OPT_IN', 'true'],
    ['RAVRADAR_PRODUCTION_TARGET_HOUR', '2026-10-16T12:01:00Z'],
    ['RAVRADAR_PRODUCTION_TARGET_HOUR', '2026-10-16T14:00:00+02:00']]) {
    assert.throws(() => weatherStateEpochEnvironment({ ...valid, [key]: value }), key);
  }
});

test('real locked hour survives rollover only within the explicit ninety-minute start window', () => {
  const initial = '2026-10-16T12:00:00.000Z';
  assert.equal(weatherStateEpochStartFreshness(initial, Date.parse('2026-10-16T13:30:00.000Z')).ageMinutes, 90);
  assert.throws(() => weatherStateEpochStartFreshness(initial, Date.parse('2026-10-16T13:30:00.001Z')),
    error => error.code === 'WEATHER_STATE_EPOCH_TARGET_START_TOO_OLD');
  assert.throws(() => weatherStateEpochStartFreshness(initial, Date.parse('2026-10-16T11:59:59.999Z')),
    error => error.code === 'WEATHER_STATE_EPOCH_TARGET_FROM_FUTURE');
});

test('privacy report emits only fixed codes and never raw upstream details', () => {
  const privateError = new Error('private payload and credentials must not escape');
  privateError.code = 'RAW_UNKNOWN_PRIVATE_CODE';
  assert.deepEqual(weatherStateEpochRefusal(privateError), {
    kind: 'WEATHER_STATE_EPOCH_REFUSAL', phase: 'SOURCE', cause: 'SOURCE_CONTRACT_REJECTED' });
  const archiveError = Object.assign(new Error('do not print this'), {
    code: 'WEATHER_STATE_EPOCH_ARCHIVE_PUBLIC_PACK_SOURCE_MISMATCH' });
  assert.equal(weatherStateEpochRefusal(archiveError).cause, archiveError.code);
  let actual;
  try { assertVerifiedWeatherStateEpochArchive({}); } catch (error) { actual = error; }
  assert(actual); assert.equal(actual.code, undefined);
  assert.equal(weatherStateEpochRefusal(actual).cause, 'WEATHER_STATE_EPOCH_ARCHIVE_HANDLE_INVALID');
  const prefixedPrivate = new Error('WEATHER_STATE_EPOCH_ARCHIVE_HANDLE_INVALID private payload');
  assert.equal(weatherStateEpochRefusal(prefixedPrivate).cause, 'SOURCE_CONTRACT_REJECTED');
  assert(!JSON.stringify(weatherStateEpochRefusal(privateError)).includes(privateError.message));
});

test('actual output file accepts exactly the four named protocol keys including SHA256 digits', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'rr-epoch-output-'));
  const filename = path.join(root, 'github-output'); await fs.writeFile(filename, '');
  const previous = process.env.GITHUB_OUTPUT; process.env.GITHUB_OUTPUT = filename;
  try {
    await writeWeatherStateEpochOutputs({ archive_key: 'a'.repeat(64), archive_catalog_sha256: 'b'.repeat(64),
      database_phase: 'before-230', context_sha256: 'c'.repeat(64) });
    assert.equal(await fs.readFile(filename, 'utf8'), 'archive_key=' + 'a'.repeat(64) + '\n'
      + 'archive_catalog_sha256=' + 'b'.repeat(64) + '\ndatabase_phase=before-230\n'
      + 'context_sha256=' + 'c'.repeat(64) + '\n');
    const before = await fs.readFile(filename);
    await assert.rejects(writeWeatherStateEpochOutputs({ arbitrary_key: 'value' }));
    await assert.rejects(writeWeatherStateEpochOutputs({ archive_key: 'a'.repeat(64) + '\nother=value' }));
    assert.deepEqual(await fs.readFile(filename), before);
  } finally {
    if (previous === undefined) delete process.env.GITHUB_OUTPUT; else process.env.GITHUB_OUTPUT = previous;
    await fs.rm(root, { recursive: true, force: true });
  }
});

test('normal CLI rejects unknown phases and caller paths without remote or install work', () => {
  assert.deepEqual(WEATHER_STATE_EPOCH_STAGES, ['prepare', 'verify-230-plan', 'verify-230-installed',
    'verify-binding-plan', 'verify-binding-installed', 'install', 'verify']);
  for (const args of [['unknown'], ['prepare', '--root', 'untrusted']]) {
    const result = spawnSync(process.execPath, ['scripts/weather-state-epoch.mjs', ...args], {
      cwd: process.cwd(), encoding: 'utf8', windowsHide: true, timeout: 15_000,
      env: { ...process.env, SUPABASE_URL: '', SUPABASE_SERVICE_ROLE_KEY: '', SUPABASE_ACCESS_TOKEN: '' },
    });
    assert.equal(result.status, 1); assert.equal(result.signal, null);
    const refusal = JSON.parse(result.stderr.trim());
    assert.equal(refusal.kind, 'WEATHER_STATE_EPOCH_REFUSAL'); assert.equal(refusal.phase, 'SOURCE');
    assert.equal(result.stdout, '');
  }
});

test('serialized context or caller-supplied originals cannot replace installed archive authority', async () => {
  await assert.rejects(loadInstalledWeatherStateEpochInputView());
  await assert.rejects(loadInstalledWeatherStateEpochInputView({ targetReferenceAt: valid.RAVRADAR_PRODUCTION_TARGET_HOUR,
    registry: {}, status: 'INSTALLED', archive: { status: 'SAVED' } }));
});

test('fixed normal source callers keep archive before SQL and fresh-only installation', async () => {
  const fullText = (await fs.readFile('scripts/weather-state-epoch.mjs', 'utf8')).replace(/\r\n/g, '\n');
  const marker = 'export async function restoreInstalledWeatherStateEpochCheckpoint() {';
  const nextMarker = '\nexport async function loadInstalledWeatherStateEpochInputView(options) {';
  function projectFreshOnly(source) {
    // Remove exactly the separately reviewed reentry caller, not a generic
    // restore pattern. Keep every old fresh-only assertion below unchanged.
    assert.equal(source.split(marker).length, 2, 'EXACT_ONE_REENTRY_CALLER_REQUIRED');
    const start = source.indexOf(marker), end = source.indexOf(nextMarker, start);
    assert(end > start, 'EXACT_REENTRY_END_REQUIRED');
    const route = source.slice(start, end);
    assert.equal(crypto.createHash('sha256').update(route).digest('hex'),
      '3d8e52fd4bbe256400a91806a288987d9d0c36f996f709d0c20af86724724d70',
      'REVIEWED_OPAQUE_VIEW_REENTRY_CALLER_CHANGED');
    assert(route.includes('  assertWeatherStateEpochCheckpointRequest();\n'
      + '  const context = await installedContext();'));
    assert(route.includes('  const view = await loadInstalledWeatherStateEpochInputView({ registry, targetReferenceAt: context.targetReferenceAt });\n'
      + "  const report = await weatherComponentProgressCache({ mode: 'restore', repositoryRoot: ROOT,"));
    assert(route.includes('productionReferenceAt: context.targetReferenceAt, resumeOriginalTarget: true,\n'
      + '    stateEpochInputView: view, epochOriginalRoot: context.restoredRoot });'));
    assert(route.includes("requireCode(report.status === 'RESTORED' && report.restored === true\n"
      + "    && report.restoredProductionReferenceAt === context.targetReferenceAt, 'CHECKPOINT_RESTORE_REQUIRED');\n"
      + '  await loadInstalledWeatherStateEpochInputView({ registry, targetReferenceAt: context.targetReferenceAt });'));
    const fresh = source.slice(0, start) + source.slice(end);
    assert(!fresh.includes('resumeOriginalTarget: true'), 'REENTRY_MUST_NOT_LEAK_TO_FRESH_CALLERS');
    assert(!fresh.includes("mode: 'restore'"), 'RESTORE_MUST_NOT_LEAK_TO_FRESH_CALLERS');
    return fresh;
  }
  const routeStart = fullText.indexOf(marker), routeEnd = fullText.indexOf(nextMarker, routeStart);
  const reviewedRoute = fullText.slice(routeStart, routeEnd);
  for (const [before, after] of [
    ['  assertWeatherStateEpochCheckpointRequest();\n', ''],
    ['const context = await installedContext();', 'const context = callerContext;'],
    ['const view = await loadInstalledWeatherStateEpochInputView({ registry, targetReferenceAt: context.targetReferenceAt });', 'const view = {};'],
    ['resumeOriginalTarget: true', 'resumeOriginalTarget: false'],
    ['stateEpochInputView: view', 'stateEpochInputView: null'],
    ['epochOriginalRoot: context.restoredRoot', 'epochOriginalRoot: ROOT'],
    ['report.restoredProductionReferenceAt === context.targetReferenceAt', 'true'],
  ]) {
    assert(reviewedRoute.includes(before));
    const mutatedRoute = reviewedRoute.replace(before, after);
    assert.notEqual(mutatedRoute, reviewedRoute);
    assert.throws(() => projectFreshOnly(fullText.replace(reviewedRoute, mutatedRoute)));
  }
  assert.throws(() => projectFreshOnly(fullText + '\n' + reviewedRoute), 'DUPLICATE_REENTRY_REFUSED');
  assert.throws(() => projectFreshOnly(fullText + '\nweatherComponentProgressCache({ resumeOriginalTarget: true });\n'));
  assert.throws(() => projectFreshOnly(fullText + "\nweatherComponentProgressCache({ mode: 'restore' });\n"));
  const text = projectFreshOnly(fullText);
  assert(text.includes('old.prewrite.verifyCurrentGridPrewriteOriginals'));
  assert(text.includes('old.runtime.restoreProtectedPrivateProductionRuntime'));
  assert(text.includes('No fallback from exact archive B copies to remote B'));
  assert(text.includes('old.audit.prepareSavedAuditProgressBaseline'));
  assert(text.includes('migrateOwnedI71NativeIdentityWorkingRuntime'));
  assert(text.includes('verifyNativeSamplingIdentitySuccessorPlan'));
  assert(text.includes('verifyNativeSamplingIdentityInstalledMigrationMetadata'));
  assert(text.includes('materializeWeatherStateEpochArchive'));
  assert(text.includes('rehydrateLocalWeatherStateEpochArchive'));
  assert(text.includes('installRestoredPrivateRuntime'));
  assert(!text.includes('restoreStagedPrivateProductionRuntime'));
  assert(!text.includes('resumeOriginalTarget: true'));
  assert(!text.includes("mode: 'restore'"));
  assert(!text.includes('DMI_BULK_LEGACY_CURRENT_ORIGINAL_REQUEST_PATH'));
  assert(!text.includes('db push'));
});
