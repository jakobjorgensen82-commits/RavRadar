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
import { savedCurrentReplayChildEnvironment, readSavedCurrentReplayProcessReport,
  SAVED_CURRENT_REPLAY_SCOPE } from './saved-current-window-scratch.mjs';
import { summarizeSavedCurrentReplayGridFailure, fixedSavedCurrentReplayGridReport }
  from './lib/saved-current-replay-grid-audit.mjs';
import { buildDmiForecastHourly, assertDmiForecastGridSamplingApplicable } from './lib/dmi-forecast-store.mjs';
import { dmiExpectedIdentityForPart, verifiedIntegratedPartHourly } from './lib/ravscore-production-adapters.mjs';
import { buildRavScoreRecoveryReplay } from './lib/ravscore-recovery-replay.mjs';
import { buildIntegratedPartScoreSeries } from './lib/ravscore-integrated-runtime.mjs';
import { buildNewestValidRavScoreRecoverySources, originalCurrentDecoderHistory } from './lib/ravscore-recovery-source-priority.mjs';
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

test('390663 replay scope rejects mixed targets/options before transport and keeps its Node-only read credentials out of Python', async () => {
  let requests = 0;
  const base = { mode: 'audit', includeCurrentWindowDiagnostic: true, progressSource: SAVED_CURRENT_REPLAY_SCOPE.source,
    progressCacheKey: SAVED_CURRENT_REPLAY_SCOPE.cacheKey, progressBaselineTargetHour: SAVED_CURRENT_REPLAY_SCOPE.target,
    fetchImpl: async () => { requests++; throw new Error('MUST_NOT_CALL'); } };
  for (const change of [{ progressCacheKey: SAVED_CURRENT_REPLAY_SCOPE.cacheKey + '-other' },
    { progressBaselineTargetHour: SAVED_CURRENT_WINDOW_SCOPE.target }, { includeSelectedCurrentPreflight: true },
    { includeRawManifest: true }, { includeRawFilePresence: true }, { rawCacheKey: 'anything' }]) {
    const report = await auditSavedWeatherInputs({ ...base, ...change });
    assert.equal(report.status, 'AUDIT_FAILED_CLOSED'); assert.equal(report.code, 'MODE_INVALID');
  }
  assert.equal(requests, 0);
  const privateRoot = path.resolve(os.tmpdir(), 'read-only-fixture'), bundlePath = path.join(privateRoot, 'bundle');
  const input = { PATH: process.env.PATH, GITHUB_SHA: 'a'.repeat(40), GITHUB_REPOSITORY: 'fixture/repository',
    SUPABASE_URL: 'https://afqhhdrkjfjtpadntdzo.supabase.co', SUPABASE_SERVICE_ROLE_KEY: 'sb_secret_TEST',
    GH_TOKEN: 'DO_NOT_INHERIT', WEATHER_PROGRESS_MASTER_SECRET: 'DO_NOT_INHERIT',
    RAVRADAR_R2_SECRET_ACCESS_KEY: 'DO_NOT_INHERIT', DMI_API_KEY: 'DO_NOT_INHERIT',
    NODE_OPTIONS: '--import DO_NOT_INHERIT', RAVRADAR_WEATHER_STATE_EPOCH_BOOTSTRAP: 'true' };
  const env = savedCurrentReplayChildEnvironment(input, { privateRoot, bundlePath });
  assert.equal(env.SUPABASE_SERVICE_ROLE_KEY, 'sb_secret_TEST'); assert.equal(env.GITHUB_SHA, input.GITHUB_SHA);
  assert.equal(env.RAVRADAR_PRIVATE_RUNTIME_BUNDLE, bundlePath);
  assert.equal(env.RAVRADAR_PRODUCTION_TARGET_HOUR, SAVED_CURRENT_REPLAY_SCOPE.target);
  assert.equal(env.RAVRADAR_WEATHER_STATE_EPOCH_BOOTSTRAP, 'false');
  assert.doesNotMatch(JSON.stringify(env), /DO_NOT_INHERIT/);
  for (const source of [{ ...input, GITHUB_SHA: 'not-a-head' }, { ...input, SUPABASE_SERVICE_ROLE_KEY: '' }])
    assert.throws(() => savedCurrentReplayChildEnvironment(source, { privateRoot, bundlePath }), /ORIGIN_INPUTS_REQUIRED/);
  assert.throws(() => savedCurrentReplayChildEnvironment(input, { privateRoot, bundlePath: path.join(privateRoot, 'other', 'bundle') }), /ORIGIN_INPUTS_REQUIRED/);
  const runner = await fs.readFile(new URL('./saved-current-window-scratch.mjs', import.meta.url), 'utf8');
  const newRun = runner.slice(runner.indexOf('export async function runSavedCurrentReplayScratch('),
    runner.indexOf('export async function runSavedCurrentWindowScratch('));
  assert.match(newRun, /environment: copernicusOfflineEnvironment\(environment\)/);
  assert.match(newRun, /normalOriginLoadsCheckpointCompanion: true/);
  assert.match(newRun, /checkpointCompanionUsedForInitialSelection: false/);
  const workflow = await fs.readFile(path.join(repo, '.github/workflows/audit-saved-weather-inputs.yml'), 'utf8');
  assert.match(workflow, /git clone --shared --no-checkout "\$GITHUB_WORKSPACE" "\$root\/current-window-source"/);
  assert.match(workflow, /-c core\.autocrlf=false checkout --detach "\$GITHUB_SHA"/);
  assert.match(workflow, /git archive "\$GITHUB_SHA"/); // unchanged old route remains reachable
});

test('390663 exact read guard confines async transport capability and refuses all non-B/S requests without network', () => {
  const guard = pathToFileURL(path.join(repo, 'scripts/lib/saved-current-replay-readonly-network.mjs')).href;
  const code = `import assert from 'node:assert/strict'; import net from 'node:net'; import tls from 'node:tls';
    import http from 'node:http'; import https from 'node:https'; import dgram from 'node:dgram';
    // TRANSPORT-ONLY boundary fixture: empty204 is not a B/S snapshot and can
    // authenticate nothing. Captured connector spies never open a real socket.
    let connectors=0, calls=0, release;
    net.Socket.prototype.connect=function(){connectors++;return this;};
    net.connect=net.createConnection=function(){connectors++;return {};};
    tls.connect=function(){connectors++;return {};};
    globalThis.fetch=async()=>{calls++; net.createConnection({host:'afqhhdrkjfjtpadntdzo.supabase.co',port:443});
      tls.connect({host:'afqhhdrkjfjtpadntdzo.supabase.co',port:443});
      if(calls===1)await new Promise(resolve=>release=resolve);
      return new Response(null,{status:calls===3?302:204,headers:calls===3?{location:'https://example.invalid'}:{}});};
    await import(${JSON.stringify(guard)});
    const headers={apikey:'sb_secret_TEST','Content-Type':'application/json'};
    const base='https://afqhhdrkjfjtpadntdzo.supabase.co/rest/v1/admin_documents?document_key=eq.';
    const end='&select=document_key,payload,version&limit=2';
    const pointer=base+'ravscore-private-production-runtime-pointer'+end;
    const checkpoint=base+'ravscore-continuation-checkpoint'+end;
    const blocked=fn=>assert.throws(fn,error=>error.code==='SAVED_CURRENT_REPLAY_NETWORK_DISABLED');
    const pending=fetch(pointer,{headers});
    for(const run of [()=>net.createConnection({host:'example.invalid',port:443}),()=>tls.connect({host:'example.invalid'}),
      ()=>new net.Socket().connect({host:'example.invalid',port:9}),()=>http.request('http://example.invalid'),
      ()=>https.get(pointer),()=>dgram.createSocket('udp4')])blocked(run);
    for(const [url,options] of [[pointer,{method:'POST',headers}],[checkpoint,{headers,body:'x'}],
      [pointer,{headers,dispatcher:{}}],[pointer,{headers,redirect:'follow'}],[pointer,{headers:{apikey:'wrong'}}],
      [pointer+'&other=1',{headers}],[base+'other'+end,{headers}],['https://example.invalid',{headers}],
      [pointer.replace('afqhhdrkjfjtpadntdzo','otherproject'),{headers}],[new Request(pointer),{headers}]])
      blocked(()=>fetch(url,options));
    assert.equal(calls,1);release();assert.equal((await pending).status,204);
    assert.equal((await fetch(checkpoint,{headers})).status,204);
    await assert.rejects(fetch(pointer,{headers}),error=>error.code==='SAVED_CURRENT_REPLAY_NETWORK_DISABLED');
    for(let i=0;i<3;i++)assert.equal((await fetch(pointer,{headers})).status,204);
    blocked(()=>fetch(checkpoint,{headers}));assert.equal(calls,6);assert.equal(connectors,12);
    console.log('EXACT_READ_TRANSPORT_BOUNDARY_ONLY');`;
  const privateRoot = path.resolve(os.tmpdir(), 'read-only-fixture');
  const env = savedCurrentReplayChildEnvironment({ PATH: process.env.PATH, SystemRoot: process.env.SystemRoot,
    GITHUB_SHA: 'a'.repeat(40), GITHUB_REPOSITORY: 'fixture/repository',
    SUPABASE_URL: 'https://afqhhdrkjfjtpadntdzo.supabase.co', SUPABASE_SERVICE_ROLE_KEY: 'sb_secret_TEST' },
    { privateRoot, bundlePath: path.join(privateRoot, 'bundle') });
  const run = (environment, input=code) => spawnSync(process.execPath, ['--input-type=module', '-e', input],
    { encoding: 'utf8', env: environment, timeout: 10_000 });
  const result = run(env);
  assert.equal(result.status, 0, result.stderr); assert.equal(result.stdout.trim(), 'EXACT_READ_TRANSPORT_BOUNDARY_ONLY');
  for (const change of [{ SUPABASE_URL: 'https://otherproject.supabase.co' },
    { RAVRADAR_WEATHER_CACHE_ONLY: 'false' }, { RAVRADAR_WEATHER_STATE_EPOCH_BOOTSTRAP: 'true' }]) {
    const rejected = run({ ...env, ...change }, `await import(${JSON.stringify(guard)});`);
    assert.notEqual(rejected.status, 0); assert.match(rejected.stderr, /SAVED_CURRENT_REPLAY_NETWORK_DISABLED/);
  }
});

async function replayObserverFixture(options = {}) {
  const source = (await fs.readFile(new URL('./test-protected-dmi-native-current-proofs.mjs', import.meta.url), 'utf8')).replace(/\r\n/g, '\n');
  const start = source.indexOf("const epoch = Date.parse('2026-09-01T00:00:00.000Z');");
  const end = source.indexOf('\nconst bankFor = fixture =>', start);
  assert.ok(start > 0 && end > start);
  const whole = source.slice(start, end);
  const oldEpoch = "const epoch = Date.parse('2026-09-01T00:00:00.000Z');";
  const newEpoch = "const epoch = Date.parse('2026-10-17T18:00:00.000Z');";
  const fixtureInput = whole.replace(oldEpoch, newEpoch);
  assert.equal(fixtureInput.replace(newEpoch, oldEpoch), whole, 'only fixed synthetic test reference changes; whole factory inverse');
  const create = new Function('dmiExpectedIdentityForPart', 'buildDmiForecastHourly',
    'const HOUR=3600000;\n'+fixtureInput+'\nreturn fixture;')(dmiExpectedIdentityForPart, buildDmiForecastHourly);
  return create(options);
}

test('actual updater observation control preserves first genuine grid-error identity and never reaches output/finalize/publish', async () => {
  const source = (await fs.readFile(new URL('./update-weather.mjs', import.meta.url), 'utf8')).replace(/\r\n/g, '\n');
  const from = (left, right) => { assert.equal(source.split(left).length, 2); const at=source.indexOf(left), until=source.indexOf(right,at);
    assert.ok(until>at); return source.slice(at,until); };
  const declaration = from('  const savedCurrentReplayDiagnostic =', '  const partRows = [];');
  const observation = from("        if (process.env.RAVRADAR_SAVED_CURRENT_REPLAY_DIAGNOSTIC === '39066350748-1'",
    "        if (error?.code === 'RAVSCORE_INITIAL_CURRENT_NEW_USE_NOT_READY') {");
  const failure = from('  if (savedCurrentReplayDiagnostic?.firstError) throw savedCurrentReplayDiagnostic.firstError;',
    '  // Aggregate fixed component labels only;');
  const close = from('  } catch (error) {\n    if (savedCurrentReplayDiagnostic?.firstError) {', '\n}\n\n// Shared recovery record: collections');
  const f = await replayObserverFixture(), expected=dmiExpectedIdentityForPart(f.part);
  const makeError = () => { try { assertDmiForecastGridSamplingApplicable(f.row.sources.current,'current',f.row.time,expected); }
    catch (error) { assert.equal(error.code,'DMI_GRID_SAMPLING_APPLICABILITY_REQUIRED'); assert.equal(error.samplingStatus,'unknown'); return error; }
    assert.fail('normal UNKNOWN constructor must still fail'); };
  const first=makeError(),second=makeError(),logs=[];
  const counters={calls:0,output:0,finalize:0,publish:0};
  const build = (observe=observation, end=failure) => new Function('calls','counters','process','console',
    'summarizeSavedCurrentReplayGridFailure','part','zoneId','initialSelection','generatedAt','recoverySources','establishedNativeCurrentOrigin','contract',
    'deployedRecoverySource','progressiveRecoverySource','persistedDmiPartRows','buildRavScoreRecoveryReplay',
    'hourly','targetMs','RAVSCORE_PUBLIC_FORECAST_HOURS','nativeCadenceHoldHours','liveCurrentPilot',
    declaration+`for(const call of calls){try{savedCurrentReplayDiagnostic && savedCurrentReplayDiagnostic.observedParts++;counters.calls++;call();}
      catch(error){${observe}throw error;}}\n`+end+'counters.output++;counters.finalize++;counters.publish++;\n'+close);
  const invoke = (calls, enabled=true, observe=observation, end=failure) => build(observe,end)(calls,counters,
    {env:{RAVRADAR_SAVED_CURRENT_REPLAY_DIAGNOSTIC:enabled?'39066350748-1':''}}, {error:value=>logs.push(value)},
    summarizeSavedCurrentReplayGridFailure,f.part,f.part.zoneId,{source:'EXISTING_INTEGRATED',state:{time:'2026-10-17T18:00:00.000Z'}},
    SAVED_CURRENT_REPLAY_SCOPE.target,[{record:{hourly:[f.row]}}],null,{partCount:673},
    null,null,new Map(),buildRavScoreRecoveryReplay,[],Date.parse(SAVED_CURRENT_REPLAY_SCOPE.target),118,0,null);
  // The normal guard constructs these errors. No origin handle is invented:
  // null means safe observation UNAVAILABLE, not a native/authentication grant.
  assert.throws(()=>invoke([()=>{throw first;},()=>{throw second;}]),error=>error===first);
  assert.deepEqual(counters,{calls:2,output:0,finalize:0,publish:0});
  let collection=JSON.parse(logs.find(line=>line.startsWith('RAVSCORE_SAVED_CURRENT_REPLAY_COLLECTION ')).split(' ').slice(1).join(' '));
  assert.equal(collection.observedParts,2);assert.equal(collection.gridUnknownParts,2);assert.equal(collection.anotherGuardStoppedCollection,false);
  logs.length=0;counters.calls=0;
  assert.throws(()=>invoke([()=>{throw first;},()=>{throw new Error('OTHER_NORMAL_GUARD');}]),error=>error===first);
  collection=JSON.parse(logs.find(line=>line.startsWith('RAVSCORE_SAVED_CURRENT_REPLAY_COLLECTION ')).split(' ').slice(1).join(' '));
  assert.equal(collection.anotherGuardStoppedCollection,true);assert.equal(collection.observedParts,2);
  logs.length=0;counters.calls=0;
  assert.throws(()=>invoke([()=>{throw first;},()=>{throw second;}],false),error=>error===first);
  assert.equal(counters.calls,1);assert.equal(logs.length,0);
  counters.calls=0;
  assert.throws(()=>invoke([()=>{throw first;},()=>{throw second;}],true,observation.replace('          continue;','')),
    error=>error===first);assert.equal(counters.calls,1,'missing diagnostic continue is detected');
  counters.calls=0;
  invoke([()=>{throw first;}],true,observation,'');
  assert.equal(counters.finalize,1,'missing final refusal is detected by actual output/finalize boundary');
});

async function forwardGateFixture() {
  const f = await replayObserverFixture({ nativeHours: [0, 1, 2], target: 1 });
  const part = { ...f.part, onshoreDirectionDeg: 90 };
  const raw = buildDmiForecastHourly({ ocean: Object.values(f.bulk.zones[dmiExpectedIdentityForPart(part).entityId].hourly)
    .map(row => ({ step: row.time, 'current-u': row['current-u'], 'current-v': row['current-v'], provenance: row.sources })),
    generatedAt: '2026-10-17T18:00:00.000Z', startAt: '2026-10-17T18:00:00.000Z', hours: 3 }).hourly;
  const hourly = verifiedIntegratedPartHourly({ point: part.waterPoint, hourly: raw }, f.bulk,
    dmiExpectedIdentityForPart(part).entityId, part, { requireNativeGridSampling: false });
  const state = buildIntegratedPartScoreSeries({ part, zone: { onshoreDirectionDeg: 90 }, hourly: [hourly[0]] })
    .ravScoreState.continuationState;
  const fallbackSource = { source: 'deployed-private-runtime', nativeCurrentContexts: [f.bulk],
    record: { point: part.waterPoint, hourly } };
  const recoverySources = buildNewestValidRavScoreRecoverySources({ fallbackSource, part });
  const publicHourly = [hourly[2]];
  const replayCandidate = (sourceRecords, publicRows = publicHourly) => buildRavScoreRecoveryReplay({ part, initialState: state,
    targetReferenceAt: SAVED_CURRENT_REPLAY_SCOPE.target, sourceRecords, publicHourly: publicRows,
    requireNativeGridSampling: true });
  let error; try { replayCandidate(recoverySources); } catch (value) { error = value; }
  assert.equal(error?.code, 'DMI_GRID_SAMPLING_APPLICABILITY_REQUIRED');
  assert.match(error.stack, /at buildRavScoreRecoveryReplay \([^\n]*ravscore-recovery-replay\.mjs:1084:/);
  return { f, raw, hourly, input: { error, part, initialSelection: { source: 'EXISTING_INTEGRATED', state },
    targetReferenceAt: SAVED_CURRENT_REPLAY_SCOPE.target, recoverySources, fallbackSource, preferredSource: null,
    persistedHourly: raw, replayCandidate, publicHourly,
    // Data-only diagnostic fixture; no native/origin authority is issued.
    establishedNativeCurrentOrigin: {} } };
}

test('normal forward gate prefix identifies the checked input and exact persisted original without claiming a union winner', async () => {
  const { input } = await forwardGateFixture(), before = JSON.stringify(input.recoverySources);
  const value = summarizeSavedCurrentReplayGridFailure(input);
  assert.equal(value.counters.forwardGateLocalized, 1);
  assert.equal(value.counters.forwardGateInterior, 1);
  assert.equal(value.counters.forwardGatePriorityOld, 1);
  assert.equal(value.counters.forwardGatePersistedExactMatch, 1);
  assert.equal(value.counters.forwardGatePersistedMatchedUnknown, 1);
  assert.equal(value.counters.forwardGateOldOriginalComplete, 1);
  assert.equal(value.counters.forwardGateOldUnknown, 1);
  assert.equal(value.counters.forwardGateNewAbsent, 1);
  assert.equal(value.actualOffendingRowIdentified, false, 'a checked gate input is not a completed replay-union winner');
  assert.equal(JSON.stringify(input.recoverySources), before);
  const safe = fixedSavedCurrentReplayGridReport(value);
  assert.equal(safe.counters.forwardGateLocalized, 1);
  assert.doesNotMatch(JSON.stringify(safe), /SYNTHETIC|2026-|currentUMps|itemId|sourceSha/);
  const differentDerived = structuredClone(input.persistedHourly);
  differentDerived[1].currentSpeedMps += 1;
  const notExact = summarizeSavedCurrentReplayGridFailure({ ...input, persistedHourly: differentDerived });
  assert.equal(notExact.counters.forwardGatePersistedExactMatch, 0, 'derived fields are part of exact current-input equality');
  assert.equal(notExact.counters.forwardGatePersistedNoExactMatch, 1);
  const provenanceOnly = input.recoverySources.map(source => ({ ...source, record: { ...source.record,
    hourly: source.record.hourly.map(row => row.time === input.persistedHourly[1].time ? { ...row, sources: undefined } : row) } }));
  const noRawSource = summarizeSavedCurrentReplayGridFailure({ ...input, recoverySources: provenanceOnly });
  assert.equal(noRawSource.counters.forwardGateLocalized, 1);
  assert.equal(noRawSource.counters.forwardGatePersistedUnavailable, 1, 'currentProvenance alone cannot claim exact raw continuity equality');
  assert.equal(noRawSource.counters.forwardGatePersistedExactMatch, 0);
});

test('normal forward gate refuses other prefix stops, non-forward errors and a non-reproduced original error', async () => {
  const { input } = await forwardGateFixture();
  let calls = 0;
  const other = summarizeSavedCurrentReplayGridFailure({ ...input, replayCandidate: sources => {
    if (++calls > 1) throw new Error('OTHER_PREFIX_STOP_PRIVATE_CANARY');
    return input.replayCandidate(sources);
  } });
  assert.equal(other.counters.forwardGateLocalized, 0);
  assert.equal(other.counters.forwardGateOtherStop, 1);
  assert.doesNotMatch(JSON.stringify(other), /PRIVATE_CANARY/);
  const absent = summarizeSavedCurrentReplayGridFailure({ ...input, replayCandidate: () => ({}) });
  assert.equal(absent.counters.forwardGateNotReproduced, 1);
  assert.equal(absent.counters.forwardGateLocalized, 0);
  let direct; try { assertDmiForecastGridSamplingApplicable(input.recoverySources[0].record.hourly[1].sources.current,
    'current', input.recoverySources[0].record.hourly[1].time, dmiExpectedIdentityForPart(input.part)); } catch (value) { direct = value; }
  const wrongSite = summarizeSavedCurrentReplayGridFailure({ ...input, error: direct });
  assert.equal(wrongSite.counters.forwardGateNotForwardStack, 1);
  assert.equal(wrongSite.counters.forwardGateProbeCount, 0);
  // Real replay, not an invented psql/provenance response: whole input stops
  // on its first UNKNOWN, but an incomplete prefix reaches another source's
  // existing point guard. The diagnostic must decline localization.
  const mixed = summarizeSavedCurrentReplayGridFailure({ ...input,
    recoverySources: [...input.recoverySources, { record: { point: [9, 55], hourly: [] } }] });
  assert.equal(mixed.counters.forwardGateOtherStop, 1);
  assert.equal(mixed.counters.forwardGateLocalized, 0);
  for (const field of ['state', 'public']) {
    const f = await forwardGateFixture();
    assert.throws(() => summarizeSavedCurrentReplayGridFailure({ ...f.input, replayCandidate: (sources, publicRows) => {
      try { return f.input.replayCandidate(sources, publicRows); }
      finally { if (field === 'state') f.input.initialSelection.state.currentEvidence.length = 0;
        else publicRows.push(publicRows[0]); }
    } }), /UNAVAILABLE/, 'a mutating probe must not emit the fixed false mutation claim');
  }
});

test('normal forward gate keeps donor proof, coherent alternate and exact continuity match distinct', async () => {
  const { f, input } = await forwardGateFixture(), identity = dmiExpectedIdentityForPart(input.part);
  const fresh = structuredClone(f.bulk);
  for (const row of Object.values(fresh.zones[identity.entityId].hourly)) {
    const source = row.sources.current;
    source.contentSha256 = 'd'.repeat(64); // explicitly DIFFERENT synthetic original bytes, not a receipt repair
    source.nativeGridSampling = { contractId: 'dmi-native-grid-sampling-v1', elementIndex: 71,
      gridIndexIdentitySha256: 'e'.repeat(64), coordinateInterpretation: 'dmi-dkss-grib1-header-endpoints-v1',
      gridDefinitionSha256: source.gridDefinitionSha256, gridPoint: [...source.gridPoint],
      fieldSet: [...source.fieldSet], optionalFieldSet: [...source.optionalFieldSet] };
  }
  const raw = buildDmiForecastHourly({ ocean: Object.values(fresh.zones[identity.entityId].hourly)
    .map(row => ({ step: row.time, 'current-u': row['current-u'], 'current-v': row['current-v'], provenance: row.sources })),
    generatedAt: input.initialSelection.state.time, startAt: input.initialSelection.state.time, hours: 3 }).hourly;
  const preferredSource = { source: 'progressive-private-dmi', nativeCurrentContexts: [fresh], record: {
    point: input.part.waterPoint, hourly: verifiedIntegratedPartHourly({ point: input.part.waterPoint, hourly: raw },
      fresh, identity.entityId, input.part, { requireNativeGridSampling: false }) } };
  const recoverySources = buildNewestValidRavScoreRecoverySources({ fallbackSource: input.fallbackSource,
    preferredSource, protectedPreviousSource: input.fallbackSource, productionReferenceAt: input.targetReferenceAt, part: input.part });
  const full = { ...input, preferredSource, recoverySources, persistedHourly: [] };
  const value = summarizeSavedCurrentReplayGridFailure(full);
  assert.equal(value.counters.forwardGateLocalized, 1);
  assert.equal(value.counters.forwardGatePriorityOld, 1);
  assert.equal(value.counters.forwardGateNewCoherent, 1);
  assert.equal(value.counters.forwardGateNewOriginalComplete, 1);
  assert.equal(value.counters.forwardGateNoDecoderAssociation, 1, 'coherence alone is not a same-original decoder association');
  assert.equal(value.counters.forwardGatePersistedNoExactMatch, 1);
  const rejected = summarizeSavedCurrentReplayGridFailure({ ...full,
    preferredSource: { ...preferredSource, nativeCurrentContexts: [f.bulk] } });
  assert.equal(rejected.counters.forwardGateNewOriginalRejected, 1);
  assert.equal(rejected.counters.forwardGateNewCoherent, 1, 'embedded coherence does not authenticate a donor');
  assert.equal(rejected.counters.forwardGateDecoderAssociationInconsistent, 0);
  const missing = summarizeSavedCurrentReplayGridFailure({ ...input,
    fallbackSource: { ...input.fallbackSource, nativeCurrentContexts: [] }, persistedHourly: null });
  assert.equal(missing.counters.forwardGateOldNoContext, 1);
  assert.equal(missing.counters.forwardGatePersistedUnavailable, 1);
  assert.equal(missing.counters.forwardGateOldOriginalComplete, 0);
});

test('normal forward gate same-original coherent successor has a real association and cannot reproduce the OLD unknown stop', async () => {
  const { f, input } = await forwardGateFixture(), part = input.part, identity = dmiExpectedIdentityForPart(part);
  const old = structuredClone(f.bulk);
  for (const row of Object.values(old.zones[identity.entityId].hourly)) {
    Object.assign(row.sources.current, { contentLengthBytes: 16, assetSizeBytes: 16 });
  }
  const fresh = structuredClone(old);
  for (const row of Object.values(fresh.zones[identity.entityId].hourly)) {
    const source = row.sources.current;
    source.nativeGridSampling = { contractId: 'dmi-native-grid-sampling-v1', elementIndex: 71,
      gridIndexIdentitySha256: 'e'.repeat(64), coordinateInterpretation: 'dmi-dkss-grib1-header-endpoints-v1',
      gridDefinitionSha256: source.gridDefinitionSha256, gridPoint: [...source.gridPoint],
      fieldSet: [...source.fieldSet], optionalFieldSet: [...source.optionalFieldSet] };
  }
  const project = bulk => {
    const hourly = buildDmiForecastHourly({ ocean: Object.values(bulk.zones[identity.entityId].hourly)
      .map(row => ({ step: row.time, 'current-u': row['current-u'], 'current-v': row['current-v'], provenance: row.sources })),
      generatedAt: input.initialSelection.state.time, startAt: input.initialSelection.state.time, hours: 3 }).hourly;
    return { point: part.waterPoint, hourly: verifiedIntegratedPartHourly({ point: part.waterPoint, hourly }, bulk,
      identity.entityId, part, { requireNativeGridSampling: false }) };
  };
  const fallbackSource = { source: 'deployed-private-runtime', nativeCurrentContexts: [old], record: project(old) };
  const preferredSource = { source: 'progressive-private-dmi', nativeCurrentContexts: [fresh], record: project(fresh) };
  const recoverySources = buildNewestValidRavScoreRecoverySources({ fallbackSource, preferredSource,
    protectedPreviousSource: fallbackSource, productionReferenceAt: input.targetReferenceAt, part });
  const publicHourly = [preferredSource.record.hourly[2]];
  const forward = input.replayCandidate(recoverySources, publicHourly);
  assert.ok(originalCurrentDecoderHistory(recoverySources,
    forward.hourly.filter(row => Date.parse(row.time) < Date.parse(input.targetReferenceAt)), part),
  'normal strict selected replay history, not rich PUBLIC target rows, has the actual decoder association');
  // This is the SAME normal single-row projection used by the diagnostic,
  // not a replacement comparator or manufactured origin/native handle.
  const projected = buildRavScoreRecoveryReplay({ part, initialState: null, targetReferenceAt: input.targetReferenceAt,
    sourceRecords: [{ record: { point: part.waterPoint, hourly: [preferredSource.record.hourly[1]] } }],
    publicHourly: [{ time: input.targetReferenceAt }] });
  assert.ok(originalCurrentDecoderHistory(recoverySources,
    projected.hourly.filter(row => row.time === preferredSource.record.hourly[1].time), part));
  const report = summarizeSavedCurrentReplayGridFailure({ ...input, fallbackSource, preferredSource, recoverySources, publicHourly });
  assert.equal(report.counters.forwardGateNotReproduced, 1);
  assert.equal(report.counters.forwardGateLocalized, 0);
  assert.equal(report.counters.forwardGateDecoderAssociationInconsistent, 0);
});

test('fixed replay observer reports candidate counts only and projects multi-part logs without IDs, payload or origin claims', async t => {
  const f=await replayObserverFixture();
  let error;try{assertDmiForecastGridSamplingApplicable(f.row.sources.current,'current',f.row.time,dmiExpectedIdentityForPart(f.part));}catch(e){error=e;}
  const input={error,part:f.part,initialSelection:{source:'EXISTING_INTEGRATED',state:{time:'2026-10-17T18:00:00.000Z'}},
    targetReferenceAt:SAVED_CURRENT_REPLAY_SCOPE.target,recoverySources:[{record:{hourly:[f.row]}}],
    // Data-only projection fixture. This object is NEVER a ForPart token and
    // the projection expressly cannot prove or issue origin/native admission.
    establishedNativeCurrentOrigin:{}};
  const before=JSON.stringify(input.recoverySources),value=summarizeSavedCurrentReplayGridFailure(input);
  assert.equal(JSON.stringify(input.recoverySources),before);
  assert.equal(value.counters.interiorUnknownCandidates,1);assert.equal(value.counters.interiorRows,1);
  assert.equal(value.originQualification,'NOT_REPROVED_BY_DIAGNOSTIC');assert.equal(value.productionAuthority,false);
  assert.equal(value.actualOffendingRowIdentified,false);assert.equal(value.replayStackObserved,false);
  value.canary='PRIVATE_PAYLOAD';value.counters.canary='PRIVATE_PAYLOAD';
  assert.equal(fixedSavedCurrentReplayGridReport(value),null);
  delete value.counters.canary;
  const safe=fixedSavedCurrentReplayGridReport(value);assert.doesNotMatch(JSON.stringify(safe),/PRIVATE_PAYLOAD|SYNTHETIC|currentUMps|2026-/);
  for(const change of [{establishedNativeCurrentOrigin:null},{initialSelection:{source:'COLD_START'}},
    {targetReferenceAt:SAVED_CURRENT_WINDOW_SCOPE.target}])assert.throws(()=>summarizeSavedCurrentReplayGridFailure({...input,...change}),/UNAVAILABLE/);
  const collection={schemaVersion:1,kind:'SAVED_CURRENT_REPLAY_COLLECTION',observedParts:3,gridUnknownParts:2,
    anotherGuardStoppedCollection:true,scope:'NORMAL_CALLS_REACHED_BEFORE_FIRST_OTHER_STOP',allPartsReached:false,
    allRowsActuallyConsumed:false,minimalNecessaryOriginalsProved:false,continuationIssued:false,publicationInvoked:false,productionAuthority:false};
  const raw='PRIVATE_PAYLOAD\n'+[safe,safe].map(report=>'RAVSCORE_SAVED_CURRENT_REPLAY_AUDIT '+JSON.stringify(report)).join('\n')
    +'\nRAVSCORE_SAVED_CURRENT_REPLAY_COLLECTION '+JSON.stringify(collection)+'\nError: PRIVATE_PAYLOAD\n';
  const root=await temporary(t),result=await captureSavedCurrentWindowProcess({executable:process.execPath,
    args:['-e',`process.stderr.write(${JSON.stringify(raw)});process.exitCode=1;`],root,logRoot:root,
    name:'candidate-count-projection-only',environment:savedCurrentWindowChildEnvironment(),maximumMilliseconds:10_000});
  const report=await readSavedCurrentReplayProcessReport(result);
  assert.equal(await fs.readFile(result.stderrPath,'utf8'),raw);assert.equal(report.status,'NORMAL_PIPELINE_FIRST_STOP_OBSERVED');
  assert.equal(report.collection.observedParts,3);assert.equal(report.collection.counters.interiorUnknownCandidates,2);
  assert.equal(report.collection.allRowsActuallyConsumed,false);assert.equal(report.collection.anotherGuardStoppedCollection,true);
  assert.doesNotMatch(JSON.stringify(report),/PRIVATE_PAYLOAD|SYNTHETIC|2026-/);
  assert.equal((await readSavedCurrentReplayProcessReport({...result,exitCode:0})).status,'UNAVAILABLE');
  await fs.appendFile(result.stderrPath,'RAVSCORE_SAVED_CURRENT_REPLAY_COLLECTION {}\n');
  assert.equal((await readSavedCurrentReplayProcessReport(result)).status,'UNAVAILABLE');
});
