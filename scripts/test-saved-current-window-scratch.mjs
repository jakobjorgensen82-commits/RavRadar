import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { savedCurrentWindowChildEnvironment, fixedCurrentWindowReport, readSavedCurrentWindowProcessReport,
  captureSavedCurrentWindowProcess, SAVED_CURRENT_WINDOW_SCOPE } from './saved-current-window-scratch.mjs';
import { auditSavedWeatherInputs } from './audit-saved-weather-inputs.mjs';
const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const fixtureReport = () => {
  const model = { metadata: { ReferenceAt: 'SAME', MemoryReady: 'FALSE_TO_TRUE', MemoryStatus: 'CHANGED',
    MemoryWindowHours: 'SAME', MemoryCoverageHours: 'INCREASED' }, evidence: {
    savedRowCount: 49, reconstructedRowCount: 49, commonTimeCount: 49, savedOnlyTimeCount: 0,
    reconstructedOnlyTimeCount: 0, orderedTimeMismatchCount: 0, unknownToKnownCount: 1,
    knownToUnknownCount: 0, nullMaskMismatchAtSameTimeCount: 1 }, metadataMatches: false,
    timeNullMaskMatches: false, sameWindow: false, category: 'NEW_VALID_EVIDENCE_FILLS_SAVED_UNKNOWN' };
  return { schemaVersion: 1, kind: 'RAVSCORE_INITIAL_CURRENT_WINDOW_DIAGNOSTIC', status: 'COMPARED',
    initialSelectionSource: 'EXISTING_INTEGRATED', savedPairNativeGridOrigin: 'NOT_ESTABLISHED_BY_COMPACT_STATE',
    savedPairValidatedByCurrentContracts: true, sameWindowGuardMatches: false,
    selectedHistory: { rowCount: 49, verifiedVectorCount: 49, stateOnlyHoldCount: 0, missingCount: 0,
      sourceFamilyNotPreservedByCompactProjection: true }, inputCandidateFamilies: {
      scope: 'INPUT_CANDIDATES_NOT_SELECTED_SOURCE_COUNTS', rowCount: 49, dmi: { dkss_idw: 0, dkss_nsbs: 49, dkss_lf: 0 },
      copernicusCount: 0, openMeteoCount: 0, otherOrUnclassifiedCount: 0,
      dmiNewCoordinateMetadataCount: 49, dmiWithoutNewCoordinateMetadataCount: 0 },
    integrated: model, candidateG: structuredClone(model), privatePayloadIncluded: false, valuesIncluded: false,
    sourceIdentifiersIncluded: false, coordinatesIncluded: false, timesIncluded: false,
    stateMutationPerformed: false, continuationIssued: false, productionAuthority: false };
};
async function temporary(t) { const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'rr-window-route-test-'));
  t.after(() => fs.rm(dir, { recursive: true, force: true })); return dir; }

test('normal audit rejects undeclared/mixed current-window scopes before any transport', async () => {
  let requests = 0;
  const base = { mode: 'audit', includeCurrentWindowDiagnostic: true, progressSource: SAVED_CURRENT_WINDOW_SCOPE.source,
    progressCacheKey: SAVED_CURRENT_WINDOW_SCOPE.cacheKey, progressBaselineTargetHour: SAVED_CURRENT_WINDOW_SCOPE.target,
    fetchImpl: async () => { requests++; throw new Error('MUST_NOT_CALL'); } };
  for (const change of [{ includeCurrentWindowDiagnostic: 'true' }, { progressSource: '39005745098-1' },
    { progressCacheKey: SAVED_CURRENT_WINDOW_SCOPE.cacheKey + '-other' }, { progressBaselineTargetHour: '2026-10-17T06:00:00.000Z' },
    { includeRawManifest: true }, { includeRawFilePresence: true }, { includeSelectedCurrentPreflight: true },
    { rawCacheKey: 'anything' }, { rawManifestSource: '38577766010-1' }, { mode: 'describe' }]) {
    const report = await auditSavedWeatherInputs({ ...base, ...change });
    assert.equal(report.status, 'AUDIT_FAILED_CLOSED'); assert.equal(report.code, 'MODE_INVALID');
  }
  assert.equal(requests, 0);
});

test('child environment is exact cache-only and carries no provider/backend/GitHub credentials or inherited flags', () => {
  const env = savedCurrentWindowChildEnvironment({ PATH: 'runtime', SUPABASE_SERVICE_ROLE_KEY: 'CANARY',
    GH_TOKEN: 'CANARY', WEATHER_PROGRESS_MASTER_SECRET: 'CANARY', DMI_API_KEY: 'CANARY', HTTPS_PROXY: 'CANARY',
    NODE_OPTIONS: '--import SECRET', RAVRADAR_WEATHER_STATE_EPOCH_BOOTSTRAP: 'true',
    RAVRADAR_DMI_LEGACY_CURRENT_EXPECTATION: 'CANARY' });
  assert.equal(env.RAVRADAR_PRODUCTION_TARGET_HOUR, SAVED_CURRENT_WINDOW_SCOPE.target);
  assert.equal(env.RAVRADAR_WEATHER_CACHE_ONLY, 'true');
  assert.equal(env.RAVRADAR_REQUIRE_PRIVATE_WEATHER_BASELINE, 'true');
  assert.equal(env.RAVRADAR_COMPONENT_COPERNICUS_BUDGET_MS, '0');
  assert.equal(env.RAVRADAR_COMPONENT_OPEN_METEO_BUDGET_MS, '0');
  assert.equal(env.RAVRADAR_WEATHER_STATE_EPOCH_BOOTSTRAP, 'false');
  assert.doesNotMatch(JSON.stringify(env), /CANARY|SECRET|--import/);
});

test('actual Node socket guard rejects fetch, HTTP and native socket connections before transport', () => {
  const guard = pathToFileURL(path.join(repo, 'scripts/lib/saved-current-window-network-stop.mjs')).href;
  const code = `import http from 'node:http'; import net from 'node:net';
    for (const run of [() => fetch('https://example.invalid'), () => http.request('http://example.invalid'),
      () => net.createConnection({host:'127.0.0.1',port:9})]) {
      try { run(); throw new Error('GUARD_NOT_ACTIVE'); } catch(error) {
        if (error.code !== 'SAVED_CURRENT_WINDOW_NETWORK_DISABLED') throw error;
      }
    } console.log('NETWORK_BLOCKED');`;
  const result = spawnSync(process.execPath, ['--import', guard, '--input-type=module', '-e', code],
    { encoding: 'utf8', env: savedCurrentWindowChildEnvironment() });
  assert.equal(result.status, 0, result.stderr); assert.equal(result.stdout.trim(), 'NETWORK_BLOCKED');
});

test('report projection keeps only fixed counts/categories and refuses invalid/overlarge or private payload declarations', () => {
  const report = fixtureReport(); report.password = 'CANARY'; report.integrated.secret = 'CANARY';
  const safe = fixedCurrentWindowReport(report);
  assert.equal(safe.integrated.evidence.unknownToKnownCount, 1); assert.doesNotMatch(JSON.stringify(safe), /CANARY|password|secret/);
  for (const corrupt of [value => value.privatePayloadIncluded = true, value => value.integrated.evidence.commonTimeCount = 8193,
    value => value.candidateG.metadata.MemoryStatus = 'CANARY', value => value.initialSelectionSource = 'COLD_START']) {
    const value = fixtureReport(); corrupt(value); assert.equal(fixedCurrentWindowReport(value), null);
  }
});

test('real bounded child capture preserves whole private bytes before fixed report extraction; no success/admission is invented', async t => {
  const root = await temporary(t), report = fixtureReport();
  const raw = `private-canary-before\nRAVSCORE_INITIAL_CURRENT_WINDOW_AUDIT ${JSON.stringify(report)}\nError: RAVSCORE_INITIAL_CURRENT_NEW_USE_NOT_READY\nprivate-canary-after\n`;
  // This tests only the process/log seam. Actual unchanged updater/guard
  // behavior has its separate existing six-case normal caller target.
  const processResult = await captureSavedCurrentWindowProcess({ executable: process.execPath,
    args: ['-e', `process.stderr.write(${JSON.stringify(raw)});process.exitCode=1;`], root, logRoot: root,
    name: 'synthetic-process-log-only', environment: savedCurrentWindowChildEnvironment(), maximumMilliseconds: 10_000 });
  assert.equal(await fs.readFile(processResult.stderrPath, 'utf8'), raw);
  const safe = await readSavedCurrentWindowProcessReport(processResult);
  assert.equal(safe.status, 'GUARD_DIAGNOSED'); assert.equal(safe.originalGuardRejected, true);
  assert.doesNotMatch(JSON.stringify(safe), /private-canary/);
  assert.equal((await readSavedCurrentWindowProcessReport({ ...processResult, exitCode: 0 })).status, 'UNAVAILABLE');
  await fs.appendFile(processResult.stderrPath, 'RAVSCORE_INITIAL_CURRENT_WINDOW_AUDIT {}\n');
  assert.equal((await readSavedCurrentWindowProcessReport(processResult)).status, 'UNAVAILABLE');
});

test('route source retains full normal GCM/registry/union and fixed child without delivery planner/publication authority', async () => {
  const runner = await fs.readFile(new URL('./saved-current-window-scratch.mjs', import.meta.url), 'utf8');
  const audit = await fs.readFile(new URL('./audit-saved-weather-inputs.mjs', import.meta.url), 'utf8');
  const workflow = await fs.readFile(path.join(repo, '.github/workflows/audit-saved-weather-inputs.yml'), 'utf8');
  assert.match(runner, /installRestoredPrivateRuntime\(\{ restoredRoot: payloadRoot/);
  assert.match(runner, /mode: 'restore'[\s\S]*?resumeOriginalTarget: true/);
  assert.match(runner, /'scripts\/update-weather\.mjs'/);
  assert.match(runner, /initial\.source !== 'EXISTING_INTEGRATED'/);
  assert.match(runner, /assertCandidateGRollbackContinuation\(other, part\)/);
  assert.match(audit, /includeCurrentWindowDiagnostic[\s\S]*?withAuthenticatedWeatherProgress/);
  assert.match(audit, /phase = 'FINAL_READBACK'[\s\S]*?CURRENT_GENERATION_CHANGED/);
  assert.match(workflow, /include_current_window_diagnostic:[\s\S]*?default: false/);
  assert.match(workflow, /git archive "\$GITHUB_SHA"/);
  assert.match(workflow, /python scripts\/sync-admin-config\.py/);
  assert.doesNotMatch(runner, /plan-dmi-legacy-current-originals|uploadImmutable|--publish|release:gate|deploy-code-only/);
});


test('normal scratch B install precedes the one baseline/cipher/authentication/restore sequence; delayed preparation is rejected', async () => {
  const audit = await fs.readFile(new URL('./audit-saved-weather-inputs.mjs', import.meta.url), 'utf8');
  const runner = await fs.readFile(new URL('./saved-current-window-scratch.mjs', import.meta.url), 'utf8');
  const assertOrder = value => {
    const calls = [
      'return prepareSavedCurrentWindowScratch({',
      "weatherComponentProgressCache({ mode: 'capture-base'",
      'await fs.copyFile(cipher, path.join(progressBaselineRoot, WEATHER_PROGRESS_CIPHER_PATH)',
      'withAuthenticatedWeatherProgress({ repositoryRoot: progressBaselineRoot',
      'runSavedCurrentWindowScratch({',
    ].map(token => { const position = value.indexOf(token); assert.ok(position >= 0, token); return position; });
    for (let i = 1; i < calls.length; i++) assert.ok(calls[i - 1] < calls[i], 'prepare → before-union base → cipher → GCM → normal restore/updater');
  };
  assertOrder(audit);
  const start = audit.indexOf('    const progressBaseline = includeCurrentWindowDiagnostic');
  const end = audit.indexOf('    normalProgressBaselineUsed =', start);
  assert.ok(start > 0 && end > start);
  const prepare = audit.slice(start, end);
  const delayed = audit.replace(prepare, '').replace("    phase = 'PROGRESS_AUTHENTICATION';", prepare + "    phase = 'PROGRESS_AUTHENTICATION';");
  assert.throws(() => assertOrder(delayed), /prepare/);
  const runOnly = runner.split('export async function runSavedCurrentWindowScratch(')[1];
  assert.ok(runOnly);
  assert.doesNotMatch(runOnly, /capture-base|copyFile|installRestoredPrivateRuntime/);
  assert.match(runOnly, /basePath, repository,[\s\S]*?resumeOriginalTarget: true/);
  assert.match(audit, /semanticUnionPerformed: currentWindowScratch\?\.semanticUnionPerformedInPrivateScratch === true \? true : null/);
  assert.match(audit, /replayPerformed: null, cacheBuilt: null/);
});
