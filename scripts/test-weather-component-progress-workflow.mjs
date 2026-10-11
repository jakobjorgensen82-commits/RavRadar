import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { PRIVATE_RUNTIME_PRODUCER_SOURCE_FILES } from './private-production-runtime-workflow.mjs';

for (const file of ['scripts/lib/verified-protected-progress-components.mjs',
  'scripts/lib/verified-dmi-progress-inputs.mjs', 'scripts/lib/private-weather-progress-files.mjs',
  'scripts/lib/dmi_adaptive_recovery.py',
  'scripts/lib/verified-open-meteo-generation-union.mjs', 'scripts/lib/open-meteo-usable-part-bank.mjs']) {
  assert.ok(PRIVATE_RUNTIME_PRODUCER_SOURCE_FILES.includes(file),
    'The operational recovery helpers must remain in the producer inventory');
}

const workflow = (await fs.readFile('.github/workflows/reusable-weather-build.yml', 'utf8'))
  .replace(/\r\n/g, '\n');
const step = name => {
  const start = workflow.indexOf(`      - name: ${name}\n`);
  assert.ok(start >= 0, `missing ${name}`);
  const end = workflow.indexOf('\n      - ', start + 1);
  return workflow.slice(start, end < 0 ? workflow.length : end);
};
const install = workflow.indexOf('id: private-runtime-install');
const capture = workflow.indexOf('id: component-progress-restore');
const weather = workflow.indexOf('id: weather\n');
const seal = workflow.indexOf('id: component-progress-seal');
const gates = workflow.indexOf('- name: Validate critical production artifact after fresh weather and current provenance');
const union = await fs.readFile('scripts/lib/verified-protected-progress-components.mjs', 'utf8');
assert.match(union, /import.*mergeVerifiedOpenMeteoGenerations.*verified-open-meteo-generation-union/);
assert.doesNotMatch(union, /backfillVerifiedOpenMeteoPartBank/,
  'Recovery must not replay unselected hours from overlapping response originals');
assert.ok(install < capture && capture < weather && weather < seal && seal < gates);
const restore = step('Restore encrypted private weather progress only');
const bind = step('Bind optional progress to the exact protected baseline');
for (const value of [restore, bind]) {
  assert.match(value, /github.ref == 'refs\/heads\/main'/);
  assert.match(value, /github.event_name != 'pull_request_target'/);
  assert.match(value, /steps.private-runtime-install.outcome == 'success'/);
  assert.match(value, /steps.weather-source-handoff.outputs.reused != 'true'/);
  assert.doesNotMatch(value, /steps.exact-weather-recovery.outputs.required != 'true'/,
    'Exact protected 11Z recovery must be allowed to restore its own authenticated progress');
}
assert.match(restore, /path: \.cache\/weather-private-progress.encrypted\s+key: weather-private-progress-encrypted-v2-/);
assert.doesNotMatch(restore, /path:.*(?:\*|bank|components\/)/);
assert.match(restore, /key: .*inputs\.quick_confirmation && inputs\.quick_progress_source/,
  'Short confirmation retrieves the requested run/attempt, not whichever prefix hit is newest');
assert.match(restore, /restore-keys: \$\{\{ !inputs\.quick_confirmation && format\([\s\S]*?\|\| '' \}\}/,
  'A short confirmation must not silently use another run');
const validateSource = step('Validate requested short-confirmation progress source');
assert.match(validateSource, /QUICK_PROGRESS_SOURCE.*inputs\.quick_progress_source/);
assert.match(validateSource, /\^\[0-9\]\+-\[1-9\]\[0-9\]\*\$/);
assert.ok(workflow.indexOf(validateSource) < workflow.indexOf(restore));
assert.doesNotMatch(bind, /continue-on-error|\|\| true/);
assert.match(bind, /capture-base[\s\S]*restore \\/);
assert.match(bind, /privateRuntimeBundleContentSha256\(manifest\)/);
assert.match(bind, /process\.env\.RAVRADAR_PRIVATE_RUNTIME_BUNDLE/);
assert.match(bind, /--protected-bundle-sha256 "\$protected_bundle_sha256"/);
assert.match(bind, /WEATHER_PROGRESS_MASTER_SECRET: \$\{\{ secrets\.SUPABASE_SERVICE_ROLE_KEY \}\}/);
assert.doesNotMatch(bind, /EXACT_WEATHER_RECOVERY_REQUIRED/,
  'The exact 11Z recovery may only be excluded by the snapshot binder, not by a workflow shortcut');
assert.match(bind, /report\.status === 'RESTORED' && report\.restored === true/);
assert.match(bind, /assertUsableDmiProgressRecovery\(report\.dmiProgress, \{ allowAbsent: true \}\)/,
  'Normal full runs must also reject a restored snapshot whose DMI forecast was rejected');
assert.ok(bind.indexOf('weather-component-progress-cache.mjs restore')
  < bind.indexOf('assertUsableDmiProgressRecovery(report.dmiProgress'));
const donor = step('Classify one-time DMI PART continuity donor');
assert.match(donor, /import \{ inspectDmiForecastFile \} from '\.\/scripts\/lib\/dmi-forecast-file\.mjs'/);
assert.match(donor, /await inspectDmiForecastFile\('data\/live\/dmi-forecast-cache\.json'\)/);
assert.match(donor, /if \(store\.hasPartContinuity\)/);
assert.doesNotMatch(donor, /readFile(?:Sync)?\('data\/live\/dmi-forecast-cache\.json'/,
  'The continuity donor classifier must validate the large forecast incrementally');
const confirmation = step('Require recovered progress before short confirmation');
assert.match(confirmation, /test "\$PROGRESS_CACHE_MATCHED_KEY" = "\$expected"/);
assert.match(confirmation, /\.status == "RESTORED" and \.restored == true and \.fileCount > 0/);
assert.match(confirmation,
  /import \{ assertUsableDmiProgressRecovery \} from '\.\/scripts\/lib\/verified-dmi-progress-inputs\.mjs'/);
assert.match(confirmation, /assertUsableDmiProgressRecovery\(report\.dmiProgress, \{ allowAbsent: true \}\)/,
  'A short confirmation permits an omitted legacy forecast or valid no-change, but rejects failed forecast admission');
assert.ok(confirmation.indexOf('assertUsableDmiProgressRecovery(report.dmiProgress')
  < confirmation.indexOf('test -s .cache/dmi-candidate-progress.json'));
assert.doesNotMatch(confirmation, /continue-on-error|\|\| true/,
  'A known forecast restore rejection must not be swallowed');
const assertionBlock = confirmation.match(/node --input-type=module <<'NODE'\n([\s\S]*?)\n          NODE/);
assert.ok(assertionBlock, 'The actual quick-confirmation assertion must remain executable');
const assertionScript = assertionBlock[1].replace(/^ {10}/gm, '');
const normalAssertionBlock = bind.match(/node --input-type=module <<'NODE'\n([\s\S]*?)\n          NODE/);
assert.ok(normalAssertionBlock, 'The actual normal restore assertion must remain executable');
const normalAssertionScript = normalAssertionBlock[1].replace(/^ {10}/gm, '');
const temporary = await fs.mkdtemp(path.join(os.tmpdir(), 'rr-quick-confirmation-contract-'));
try {
  for (const [status, succeeds] of [['MERGED', true], ['ACCEPTED_NO_CHANGE', true],
    ['NOT_PRESENT', true], ['REJECTED', false], ['RETAINED', false], ['UNKNOWN', false], [null, false]]) {
    const report = { status: 'RESTORED', restored: true, fileCount: 3,
      ...(status === null ? {} : { dmiProgress: { forecast: { status,
        recoveredComponents: 0, rejectedRecords: 2, runtimeRecovered: false } } }) };
    await fs.writeFile(path.join(temporary, 'weather-progress-restore-report.json'), JSON.stringify(report));
    const result = spawnSync(process.execPath, ['--input-type=module'], {
      input: assertionScript, encoding: 'utf8', cwd: process.cwd(),
      env: { ...process.env, RUNNER_TEMP: temporary },
    });
    assert.equal(result.error, undefined);
    assert.equal(result.status === 0, succeeds, `actual workflow assertion: ${status}`);
    if (!succeeds) assert.match(result.stderr, /DMI_FORECAST_PROGRESS_RECOVERY_REQUIRED/);
  }
  for (const [status, forecastStatus, succeeds] of [
    ['MISS', null, true], ['BASELINE_MISMATCH', null, true],
    ['RESTORED', 'MERGED', true], ['RESTORED', 'ACCEPTED_NO_CHANGE', true],
    ['RESTORED', 'NOT_PRESENT', true], ['RESTORED', 'REJECTED', false],
    ['RESTORED', 'RETAINED', false], ['RESTORED', null, false],
  ]) {
    const report = { status, restored: status === 'RESTORED', fileCount: status === 'RESTORED' ? 3 : 0,
      ...(forecastStatus === null ? {} : { dmiProgress: { forecast: { status: forecastStatus,
        recoveredComponents: 0, rejectedRecords: 0, runtimeRecovered: false } } }) };
    await fs.writeFile(path.join(temporary, 'weather-progress-restore-report.json'), JSON.stringify(report));
    const result = spawnSync(process.execPath, ['--input-type=module'], {
      input: normalAssertionScript, encoding: 'utf8', cwd: process.cwd(),
      env: { ...process.env, RUNNER_TEMP: temporary },
    });
    assert.equal(result.error, undefined);
    assert.equal(result.status === 0, succeeds, `normal workflow assertion: ${status}/${forecastStatus}`);
    assert.equal(result.stdout, '');
    assert.equal(result.stderr.trim(), succeeds ? '' : 'DMI_FORECAST_PROGRESS_RECOVERY_REQUIRED');
  }
  await fs.writeFile(path.join(temporary, 'weather-progress-restore-report.json'), '{"PRIVATE_TOKEN_ABCDEF":');
  const malformed = spawnSync(process.execPath, ['--input-type=module'], {
    input: normalAssertionScript, encoding: 'utf8', cwd: process.cwd(),
    env: { ...process.env, RUNNER_TEMP: temporary },
  });
  assert.equal(malformed.status, 1);
  assert.equal(malformed.stdout, '');
  assert.equal(malformed.stderr.trim(), 'DMI_FORECAST_PROGRESS_RECOVERY_REQUIRED');
} finally {
  assert.equal(path.dirname(temporary), path.resolve(os.tmpdir()));
  assert.ok(path.basename(temporary).startsWith('rr-quick-confirmation-contract-'));
  await fs.rm(temporary, { recursive: true, force: true });
}
const distributionNode = step('Select Node24 for fixed raw-cache distribution preparation');
const distributionPrepare = step('Prepare locked raw-cache API under its actual owned cohort');
const distributionRestore = step('Restore Node22 for normal weather producers');
const rawSave = step('Save progressed DMI GRIB download cache');
assert.match(distributionNode, /uses: actions\/setup-node@v7[\s\S]*node-version: 24/);
assert.match(distributionPrepare, /node "\$GITHUB_WORKSPACE\/\.github\/actions\/save-owned-dmi-grib\/index\.cjs" --prepare-distribution/);
assert.doesNotMatch(distributionPrepare, /continue-on-error|\|\| true/);
assert.match(distributionRestore, /always\(\).*steps\.dmi-cache-api-node24\.outcome == 'success'/);
assert.match(distributionRestore, /node-version: 22/);
assert.ok(workflow.indexOf(distributionNode) < workflow.indexOf(distributionPrepare));
assert.ok(workflow.indexOf(distributionPrepare) < workflow.indexOf(distributionRestore));
assert.ok(workflow.indexOf(distributionRestore)
  < workflow.indexOf(step('Materialize bounded deployed DMI storage before conditional point activation')));
assert.ok(workflow.indexOf(distributionRestore) < workflow.indexOf(step('Restore bounded DMI GRIB download cache')));
assert.ok(workflow.indexOf(distributionRestore) < workflow.indexOf(step('Update DMI bulk model cache')));
assert.match(rawSave, /steps\.dmi-progress-write-authority\.outcome == 'success'/);
assert.match(rawSave, /steps\.dmi-cache-api-prepare\.outcome == 'success'/);
assert.match(rawSave, /steps\.dmi-cache-api-prepare\.outputs\.distribution_ready == 'true'/);
assert.match(rawSave, /uses: \.\/\.github\/actions\/save-owned-dmi-grib/);
assert.match(rawSave, /path: \.cache\/dmi-grib\s+key: dmi-grib-v4-/);
const save = step('Encrypt newly saved private weather progress before later production steps');
assert.match(save, /always\(\)/);
assert.match(save, /steps.preflight.outputs.should_run == 'true'/);
assert.match(save, /steps.component-progress-restore.outcome == 'success'/);
assert.match(save, /steps.component-progress-restore.outputs.captured == 'true'/);
assert.doesNotMatch(save, /steps.weather.outcome/,
  'Provider progress must survive even when an earlier terminal gate skips the weather builder');
assert.match(save, /saved == true/);
assert.match(save, /WEATHER_PROGRESS_MASTER_SECRET: \$\{\{ secrets\.SUPABASE_SERVICE_ROLE_KEY \}\}/);
const upload = step('Save only the authenticated encrypted private weather snapshot');
assert.match(upload, /always\(\).*steps.component-progress-seal.outputs.saved == 'true'/);
assert.match(upload, /steps\.component-progress-seal\.outcome == 'success'/);
assert.match(upload, /uses: \.\/\.github\/actions\/save-owned-dmi-grib/);
assert.match(upload, /operation: upload-encrypted-progress\s+key: weather-private-progress-encrypted-v2-/);
assert.doesNotMatch(upload, /\bpath:/, 'Cipher upload must derive its one fixed path, not accept caller paths');
const cipherAction = await fs.readFile('.github/actions/save-owned-dmi-grib/index.cjs', 'utf8');
assert.match(cipherAction, /const CIPHER_PATH = '\.cache\/weather-private-progress\.encrypted'/);
const cipherProducer = await fs.readFile('scripts/weather-component-progress-cache.mjs', 'utf8');
assert.match(cipherProducer, /WEATHER_PROGRESS_MAX_CIPHER_BYTES = 384 \* 1024 \* 1024/);
assert.match(cipherAction, /MAX_CIPHER_BYTES = 384 \* 1024 \* 1024/);
assert.match(cipherProducer, /boundedStream\(maximumEncryptedBytes - prefix\.length - 16\)/);
assert.match(cipherProducer, /appendFile\(cipherTemporary, cipher\.getAuthTag\(\)\)[\s\S]*encryptedBytes > maximumEncryptedBytes/);
assert.match(cipherAction, /env\.INPUT_KEY !== `weather-private-progress-encrypted-v2-Linux-main-\$\{env\.GITHUB_RUN_ID\}-\$\{env\.GITHUB_RUN_ATTEMPT\}`/);
assert.match(cipherAction, /cache\.saveCache\(\[CIPHER_PATH\], input\.key, undefined, false\)/);
assert.ok(cipherAction.indexOf('if (firstFailure !== null) throw firstFailure.value;')
  < cipherAction.indexOf("'uploaded=true\\n'"), 'Upload output follows closure and actual claim release');
for (const file of ['update-and-deploy', 'run-current-weather-once']) {
  const caller = await fs.readFile(`.github/workflows/${file}.yml`, 'utf8');
  assert.doesNotMatch(caller, /WEATHER_PROGRESS_ENCRYPTION_KEY/);
}
console.log('Encrypted private weather progress: shared normal caller order, trusted restore, ciphertext-only save and failure recovery passed.');

// Additive fixed-action protocol fixture. The official API, process/cohort and
// claim are explicitly synthetic here: these tests do NOT prove Linux shutdown,
// a real dependency distribution, provider finalization or shared exclusion.
const { default: testOwnedRawCache } = await import('node:test');
const vmOwnedRawCache = await import('node:vm');
const { createRequire: createOwnedRawRequire, registerHooks: registerOwnedRawHooks } = await import('node:module');
const { EventEmitter: OwnedRawEmitter, once: ownedRawOnce } = await import('node:events');
const { PassThrough: OwnedRawPipe } = await import('node:stream');
const { fileURLToPath: ownedRawFilePath } = await import('node:url');
const ownedRawRequire = createOwnedRawRequire(import.meta.url);
const ownedRawAction = ownedRawFilePath(new URL('../.github/actions/save-owned-dmi-grib/index.cjs', import.meta.url));
const ownedRawSource = await fs.readFile(ownedRawAction, 'utf8');
const ownedRawPackage = await fs.readFile(path.join(path.dirname(ownedRawAction), 'package.json'), 'utf8');
const ownedRawLock = await fs.readFile(path.join(path.dirname(ownedRawAction), 'package-lock.json'), 'utf8');

testOwnedRawCache('owned raw cache: fixed API and physically separate owner receipt', async t => {
  const apiSlot = Symbol.for('RavRadar.synthetic.ownedRawCacheApi');
  const loader = registerOwnedRawHooks({
    resolve(specifier, context, nextResolve) {
      if (specifier !== '@actions/cache') return nextResolve(specifier, context);
      return { shortCircuit: true, url: 'data:text/javascript,' + encodeURIComponent(
        'const slot=Symbol.for("RavRadar.synthetic.ownedRawCacheApi");'
        + 'export const isFeatureAvailable=()=>globalThis[slot].available;'
        + 'export const saveCache=(...args)=>globalThis[slot].save(...args);') };
    },
  });
  function fixture(options = {}) {
    const events = [];
    const ipc = [];
    const outputs = [];
    const ownerValue = Object.freeze({});
    const env = { INPUT_PATH: '.cache/dmi-grib', INPUT_KEY: 'dmi-grib-v4-Linux-2026-W41-42-1',
      RUNNER_OS: 'Linux', GITHUB_RUN_ID: '42', GITHUB_RUN_ATTEMPT: '1',
      GITHUB_REF: 'refs/heads/main', GITHUB_SERVER_URL: 'https://github.com',
      ACTIONS_CACHE_SERVICE_V2: '1', GITHUB_OUTPUT: '/synthetic/outputs', ...options.env };
    const processFixture = Object.assign(new OwnedRawEmitter(), {
      env, platform: 'linux', versions: { node: '24.19.0' }, argv: ['node', ownedRawAction],
      ppid: 12345,
      chdir(value) { events.push(['cwd', value]); },
    });
    const owner = {
      async acquireWeatherAcquisitionWriter() { events.push('acquire'); return ownerValue; },
      async assertWeatherAcquisitionWriter(value) {
        assert.equal(value, ownerValue); events.push('assert');
        if (Object.hasOwn(options, 'assertError')) throw options.assertError;
      },
      retainWeatherAcquisitionWriter(value) {
        assert.equal(value, ownerValue); events.push('retain');
        if (Object.hasOwn(options, 'retainError')) throw options.retainError;
      },
      async releaseWeatherAcquisitionWriter(value) {
        assert.equal(value, ownerValue); events.push('release');
        if (Object.hasOwn(options, 'releaseError')) throw options.releaseError;
      },
    };
    let child;
    let signalStarted;
    const started = new Promise(resolve => { signalStarted = resolve; });
    const spawn = (command, args, settings) => {
      events.push('spawn');
      assert.equal(command, 'python3');
      assert.deepEqual(Array.from(args), ['-B', path.join(path.dirname(ownedRawAction), '../../../scripts/run-owned-dmi-grib-save.py'),
        ...(options.distribution ? ['--prepare-distribution'] : [])]);
      assert.equal(settings.env, env);
      assert.equal(settings.shell, false);
      assert.deepEqual(Array.from(settings.stdio), ['ignore', 'pipe', 'pipe', 'pipe']);
      child = Object.assign(new OwnedRawEmitter(), {
        stdout: new OwnedRawPipe(), stderr: new OwnedRawPipe(),
        kill(signal) { events.push(['stop-request', signal]); },
      });
      child.stdio = [null, child.stdout, child.stderr, new OwnedRawPipe()];
      if (Object.hasOwn(options, 'receiptSetupError')) {
        const on = child.stdout.on.bind(child.stdout);
        child.stdout.on = (name, ...args) => {
          if (name === 'data') throw options.receiptSetupError;
          return on(name, ...args);
        };
      }
      signalStarted();
      return child;
    };
    const module = { exports: {} };
    const require = specifier => {
      if (specifier === 'node:child_process') return { spawn };
      if (specifier === 'node:module') return { findPackageJSON: () => '/synthetic/cache-package.json' };
      if (specifier === 'node:fs') return {
        fstatSync(fd) { assert.equal(fd, 3); return { isFIFO: () => !options.wrongParent, isSocket: () => false }; },
        readFileSync(file) {
          if (file === '/proc/12345/cmdline') return Buffer.from('python3\0-B\0'
            + path.join(path.dirname(ownedRawAction), '../../../scripts/run-owned-dmi-grib-save.py') + '\0');
          if (file === path.join(path.dirname(ownedRawAction), 'package.json')) return ownedRawPackage;
          if (file === path.join(path.dirname(ownedRawAction), 'package-lock.json')) {
            return ownedRawLock + (options.changedLock ? ' ' : '');
          }
          assert.equal(file, '/synthetic/cache-package.json');
          return JSON.stringify({ version: '6.1.0' });
        },
        writeSync(fd, value) { assert.equal(fd, 3); ipc.push(JSON.parse(value)); },
        appendFileSync(file, value) { assert.equal(file, env.GITHUB_OUTPUT); outputs.push(value); },
      };
      if (specifier === '../../../scripts/lib/weather-acquisition-writer.mjs') return owner;
      return ownedRawRequire(specifier);
    };
    const context = vmOwnedRawCache.createContext({ require, module, exports: module.exports,
      __dirname: path.dirname(ownedRawAction), __filename: ownedRawAction, process: processFixture,
      Buffer, URL, console });
    new vmOwnedRawCache.Script(ownedRawSource, { filename: ownedRawAction,
      importModuleDynamically: vmOwnedRawCache.constants.USE_MAIN_CONTEXT_DEFAULT_LOADER }).runInContext(context);
    const receipt = { schemaVersion: 1, kind: 'DMI_RAW_SAVE_V2_FINALIZED', apiVersion: '6.1.0',
      path: env.INPUT_PATH, key: env.INPUT_KEY, cacheId: 17 };
    async function finish({ api = receipt, closure = { schemaVersion: 1,
      kind: 'DMI_RAW_SAVE_COHORT_CLOSED', workerExitCode: 0, interrupted: false }, code = 0 } = {}) {
      const ends = [child.stdout, child.stderr, child.stdio[3]].map(pipe => ownedRawOnce(pipe, 'end'));
      child.stdout.end(closure === null ? '' : JSON.stringify(closure));
      child.stderr.end();
      child.stdio[3].end(api === null ? '' : JSON.stringify(api));
      await Promise.all(ends);
      child.emit('close', code, null);
    }
    function dispose() {
      for (const stream of child?.stdio || []) stream?.destroy();
    }
    return { ...module.exports, events, ipc, outputs, env, started, finish, receipt, processFixture, dispose };
  }
  try {
    await t.test('distribution receipt is separate and waits for actual fixture closure and release', async () => {
      const value = fixture({ distribution: true });
      const operation = value.runOwnedDistribution();
      await value.started;
      assert.deepEqual(value.outputs, []);
      assert.equal(value.events.includes('release'), false);
      await value.finish({ api: { schemaVersion: 1, kind: 'DMI_RAW_DISTRIBUTION_READY',
        apiVersion: '6.1.0', lockSha256: '9bd935a0c94f605ab28b4cc1ea543173bb06e213ba779e6e9855e31a4dd6a9a5' } });
      const result = await operation;
      assert.equal(result.distributionReady, true);
      assert.equal(Object.hasOwn(result, 'saved'), false);
      assert.deepEqual(value.outputs, ['distribution_ready=true\n']);
      assert.equal(value.events.includes('release'), true);
      assert.equal(value.events.includes('retain'), false);
      value.dispose();
    });
    await t.test('closed failed installer produces neither distribution nor SAVE output', async () => {
      const value = fixture({ distribution: true });
      const operation = value.runOwnedDistribution();
      const rejected = assert.rejects(operation, /DMI_RAW_SAVE_API_FAILED/);
      await value.started;
      await value.finish({ api: null, closure: { schemaVersion: 1,
        kind: 'DMI_RAW_SAVE_COHORT_CLOSED', workerExitCode: 1, interrupted: false } });
      await rejected;
      assert.deepEqual(value.outputs, []);
      assert.equal(value.events.includes('release'), true);
      assert.equal(value.events.includes('retain'), false);
      value.dispose();
    });
    await t.test('distribution ready without physical closure retains the same fixture owner', async () => {
      const value = fixture({ distribution: true });
      const operation = value.runOwnedDistribution();
      const rejected = assert.rejects(operation, /DMI_RAW_SAVE_RECEIPT_INVALID/);
      await value.started;
      await value.finish({ closure: null, api: { schemaVersion: 1,
        kind: 'DMI_RAW_DISTRIBUTION_READY', apiVersion: '6.1.0',
        lockSha256: '9bd935a0c94f605ab28b4cc1ea543173bb06e213ba779e6e9855e31a4dd6a9a5' } });
      await rejected;
      assert.deepEqual(value.outputs, []);
      assert.equal(value.events.includes('release'), false);
      assert.equal(value.events.includes('retain'), true);
      value.dispose();
    });
    await t.test('SAVE checks its actual lock before invoking the API', async () => {
      const value = fixture({ changedLock: true });
      globalThis[apiSlot] = { available: true, save: () => { throw new Error('API_MUST_NOT_RUN'); } };
      await assert.rejects(value.runApiWorker(), /DMI_RAW_DISTRIBUTION_LOCK_REFUSED/);
      assert.deepEqual(value.ipc, []);
      assert.deepEqual(value.outputs, []);
    });
    await t.test('API awaits v2 finalization; private IPC is not workflow success', async () => {
      const value = fixture();
      let finishApi;
      const pending = new Promise(resolve => { finishApi = resolve; });
      globalThis[apiSlot] = { available: true, save(...args) {
        assert.equal(args.length, 4);
        assert.deepEqual(Array.from(args[0]), ['.cache/dmi-grib']);
        assert.equal(args[1], value.env.INPUT_KEY);
        assert.equal(args[2], undefined);
        assert.equal(args[3], false);
        return pending;
      } };
      const operation = value.runApiWorker();
      await new Promise(resolve => setImmediate(resolve));
      assert.equal(value.ipc.length, 0);
      finishApi(17);
      await operation;
      assert.deepEqual(value.ipc, [value.receipt]);
      assert.deepEqual(value.outputs, []);
    });
    await t.test('failed/no-op/opaque IDs never produce a private success receipt', async () => {
      for (const id of [-1, 0, undefined, '17', Number.MAX_SAFE_INTEGER + 1]) {
        const value = fixture();
        globalThis[apiSlot] = { available: true, save: async () => id };
        await assert.rejects(value.runApiWorker(), /DMI_RAW_SAVE_NOT_FINALIZED/);
        assert.deepEqual(value.ipc, []);
      }
    });
    await t.test('worker mode without the fixed cohort refuses; cleanup keeps first failure', async () => {
      const wrong = fixture({ wrongParent: true });
      globalThis[apiSlot] = { available: true, save: () => { throw new Error('API_MUST_NOT_RUN'); } };
      await assert.rejects(wrong.runApiWorker(), /DMI_RAW_SAVE_WORKER_PARENT_UNPROVED/);
      assert.deepEqual(wrong.ipc, []);
      const value = fixture({ releaseError: new Error('SYNTHETIC_RELEASE_FAILURE') });
      const operation = value.runOwnedSave();
      const rejected = assert.rejects(operation, /DMI_RAW_SAVE_NOT_FINALIZED/);
      await value.started;
      await value.finish({ api: { ...value.receipt, key: 'wrong-key' } });
      await rejected;
      assert.equal(value.events.at(-1), 'release');
      assert.deepEqual(value.outputs, []);
    });
    await t.test('wrong host/v1/other path refuse before any API or owner use', async () => {
      for (const env of [{ ACTIONS_CACHE_SERVICE_V2: '' }, { GITHUB_SERVER_URL: 'https://enterprise.invalid' },
        { INPUT_PATH: '.cache/another-cache' }, { GITHUB_RUN_ATTEMPT: '2' }]) {
        const value = fixture({ env });
        globalThis[apiSlot] = { available: true, save: () => { throw new Error('API_MUST_NOT_RUN'); } };
        await assert.rejects(value.runApiWorker(), /DMI_RAW_SAVE_(?:V2_REQUIRED|INPUT_REFUSED)/);
        await assert.rejects(value.runOwnedSave(), /DMI_RAW_SAVE_(?:V2_REQUIRED|INPUT_REFUSED)/);
        assert.deepEqual(value.events, []);
      }
    });
    await t.test('official truthy false string is not rewritten to a different service mode', async () => {
      const value = fixture({ env: { ACTIONS_CACHE_SERVICE_V2: 'false' } });
      globalThis[apiSlot] = { available: true, save: async () => 17 };
      await value.runApiWorker();
      assert.equal(value.env.ACTIONS_CACHE_SERVICE_V2, 'false');
      assert.equal(value.ipc[0].cacheId, 17);
    });
    await t.test('same owner spans pending child; typed API plus closure precedes own release', async () => {
      const value = fixture();
      const operation = value.runOwnedSave();
      await value.started;
      assert.deepEqual(value.events, ['acquire', 'assert', 'spawn']);
      assert.deepEqual(value.outputs, []);
      await value.finish();
      assert.equal((await operation).saved, true);
      assert.deepEqual(value.events, ['acquire', 'assert', 'spawn', 'assert', 'release']);
      assert.deepEqual(value.outputs, ['saved=true\n']);
    });
    await t.test('exit0 plus API finalization without physical receipt retains own claim', async () => {
      const value = fixture();
      const operation = value.runOwnedSave();
      const rejected = assert.rejects(operation, /DMI_RAW_SAVE_RECEIPT_INVALID/);
      await value.started;
      await value.finish({ closure: null });
      await rejected;
      assert.deepEqual(value.events, ['acquire', 'assert', 'spawn', 'retain']);
      assert.deepEqual(value.outputs, []);
    });
    await t.test('closed failure and wrong-key receipt release safely but never report saved', async () => {
      for (const failedWorker of [false, true]) {
        const value = fixture();
        const operation = value.runOwnedSave();
        const rejected = assert.rejects(operation, /DMI_RAW_SAVE_(?:API_FAILED|NOT_FINALIZED)/);
        await value.started;
        await value.finish({ api: { ...value.receipt, key: 'another-key' }, closure: {
          schemaVersion: 1, kind: 'DMI_RAW_SAVE_COHORT_CLOSED', workerExitCode: failedWorker ? 1 : 0, interrupted: false } });
        await rejected;
        assert.deepEqual(value.events, ['acquire', 'assert', 'spawn', 'release']);
        assert.deepEqual(value.outputs, []);
      }
    });
    await t.test('interruption requests stop but awaits physical closure before own release', async () => {
      const value = fixture();
      const operation = value.runOwnedSave();
      const rejected = assert.rejects(operation, /DMI_RAW_SAVE_INTERRUPTED/);
      await value.started;
      value.processFixture.emit('SIGTERM');
      assert.deepEqual(value.events, ['acquire', 'assert', 'spawn', ['stop-request', 'SIGTERM']]);
      await value.finish();
      await rejected;
      assert.equal(value.events.at(-1), 'release');
      assert.deepEqual(value.outputs, []);
    });
    for (const raw of [0, null]) {
      await t.test(`raw ${String(raw)} assertion failure before launch cannot report saved`, async () => {
        const value = fixture({ assertError: raw });
        await assert.rejects(value.runOwnedSave(), error => Object.is(error, raw));
        assert.deepEqual(value.events, ['acquire', 'assert', 'release']);
        assert.deepEqual(value.ipc, []);
        assert.deepEqual(value.outputs, []);
      });
      await t.test(`raw ${String(raw)} release failure after closure cannot report saved`, async () => {
        const value = fixture({ releaseError: raw });
        const operation = value.runOwnedSave();
        const rejected = assert.rejects(operation, error => Object.is(error, raw));
        await value.started;
        await value.finish();
        await rejected;
        assert.deepEqual(value.events, ['acquire', 'assert', 'spawn', 'assert', 'release']);
        assert.deepEqual(value.outputs, []);
      });
      await t.test(`raw ${String(raw)} primary failure survives retain failure with unknown closure`, async () => {
        const value = fixture({ receiptSetupError: raw, retainError: new Error('SYNTHETIC_RETAIN_FAILURE') });
        try {
          await assert.rejects(value.runOwnedSave(), error => Object.is(error, raw));
          assert.deepEqual(value.events, ['acquire', 'assert', 'spawn', 'retain']);
          assert.deepEqual(value.outputs, []);
        } finally { value.dispose(); }
      });
    }
  } finally {
    loader.deregister();
    delete globalThis[apiSlot];
  }
});


// Real owned-file I/O with the unchanged full action body. Process/npm boundaries
// are controlled here; this is NOT an npm install, SDK or native cohort proof.
testOwnedRawCache('owned distribution npm configuration: distinct empty sources and close boundary', async t => {
  const rawFs = ownedRawRequire('node:fs');
  async function fixture(options = {}) {
    const parent = await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(), 'rr-owned-npm-config-')));
    const action = path.join(parent, 'checkout/.github/actions/save-owned-dmi-grib');
    const cache = path.join(action, '.npm-cache');
    const runtime = path.join(parent, 'runtime');
    await fs.mkdir(action, { recursive: true });
    await fs.mkdir(runtime);
    await fs.writeFile(path.join(action, 'package.json'), ownedRawPackage);
    await fs.writeFile(path.join(action, 'package-lock.json'), ownedRawLock);
    const file = path.join(action, 'index.cjs');
    const execPath = path.join(runtime, 'bin/node');
    const npmLink = path.join(runtime, 'bin/npm');
    const npmCli = path.join(runtime, 'lib/node_modules/npm/bin/npm-cli.js');
    const configs = ['.ravradar-user.npmrc', '.ravradar-global.npmrc'].map(name => path.join(cache, name));
    const processFixture = { platform: 'linux', versions: { node: '24.19.0' }, execPath,
      ppid: 12345, env: { GITHUB_REF: 'refs/heads/main', RUNNER_OS: 'Linux',
        GITHUB_SERVER_URL: 'https://github.com', GITHUB_EVENT_NAME: 'workflow_dispatch',
        NPM_CONFIG_USERCONFIG: '/SYNTHETIC_INHERITED_CONFIG',
        npm_config_globalconfig: '/SYNTHETIC_INHERITED_CONFIG', npm_config_offline: 'true' } };
    const opened = new Set();
    const installer = new OwnedRawEmitter();
    let settings, command, args, parentAdmission = false, failUnlink = false;
    const controlledFs = new Proxy(rawFs, { get(target, name) {
      if (name === 'readFileSync') return (p, ...rest) => {
        if (p === '/proc/12345/cmdline') return Buffer.from('python3\0-B\0'
          + path.resolve(action, '../../../scripts/run-owned-dmi-grib-save.py') + '\0');
        if (p === path.join(path.dirname(npmCli), '../package.json')) return '{"name":"npm"}';
        return target.readFileSync(p, ...rest);
      };
      if (name === 'realpathSync') return p => p === npmLink ? npmCli : target.realpathSync(p);
      if (name === 'openSync') return (...args) => {
        const fd = target.openSync(...args); opened.add(fd); return fd;
      };
      if (name === 'fstatSync') return (fd, ...rest) => {
        if (parentAdmission && fd === 3 && !opened.has(fd)) {
          parentAdmission = false; return { isFIFO: () => true, isSocket: () => false };
        }
        if (opened.has(fd) && Object.hasOwn(options, 'statFailure')) throw options.statFailure;
        return target.fstatSync(fd, ...rest);
      };
      if (name === 'closeSync') return fd => {
        if (options.noopClose) return;
        target.closeSync(fd); opened.delete(fd);
      };
      if (name === 'unlinkSync') return p => {
        if (failUnlink) throw new Error('SYNTHETIC_SECONDARY_UNLINK');
        if (options.noopUnlink) return;
        return target.unlinkSync(p);
      };
      return target[name];
    } });
    const module = { exports: {} };
    const require = name => name === 'node:fs' ? controlledFs
      : name === 'node:child_process' ? { spawn(c, a, s) {
        command = c; args = a; settings = s; return installer;
      } } : ownedRawRequire(name);
    const context = vmOwnedRawCache.createContext({ require, module, exports: module.exports,
      __dirname: action, __filename: file, process: processFixture, Buffer, URL, console });
    new vmOwnedRawCache.Script(ownedRawSource, { filename: file }).runInContext(context);
    const api = vmOwnedRawCache.runInContext('({ createDistributionConfigFiles, runDistributionWorker })', context);
    return { ...api, action, cache, configs, installer, options, opened,
      runDistributionWorker() { parentAdmission = true; return api.runDistributionWorker(); },
      get settings() { return settings; }, get command() { return command; }, get args() { return args; },
      secondaryUnlinkFailure() { failUnlink = true; },
      async dispose() {
        for (const fd of opened) rawFs.closeSync(fd);
        await fs.rm(parent, { recursive: true, force: true });
      },
    };
  }
  await t.test('normal worker uses distinct own empty configs, no inherited source, and waits for close', async () => {
    const f = await fixture();
    try {
      let settled = false;
      const operation = f.runDistributionWorker();
      operation.then(() => { settled = true; }, () => { settled = true; });
      assert.equal(f.settings.env.npm_config_userconfig, f.configs[0]);
      assert.equal(f.settings.env.npm_config_globalconfig, f.configs[1]);
      assert.equal(f.settings.env.NPM_CONFIG_USERCONFIG, undefined);
      assert.equal(f.settings.env.npm_config_offline, 'true');
      assert.equal(f.settings.env.npm_config_cache, f.cache);
      assert.equal(f.settings.shell, false);
      assert.equal(f.settings.stdio, 'ignore');
      assert.deepEqual(Array.from(f.args).slice(1), ['ci', '--ignore-scripts', '--no-audit', '--no-fund']);
      const identities = f.configs.map(p => rawFs.lstatSync(p, { bigint: true }));
      for (const entry of identities) { assert.equal(entry.isFile(), true); assert.equal(entry.size, 0n); assert.equal(entry.nlink, 1n); }
      assert.notEqual(identities[0].ino, identities[1].ino);
      assert.equal(f.opened.size, 0, 'Own creation descriptors physically closed before npm');
      f.installer.emit('error', new Error('SYNTHETIC_SPAWN_ERROR'));
      await Promise.resolve();
      assert.equal(settled, false);
      for (const p of f.configs) assert.equal(rawFs.existsSync(p), true);
      const rejected = assert.rejects(operation, /SYNTHETIC_SPAWN_ERROR/);
      f.installer.emit('close', 17, null);
      await rejected;
      for (const p of f.configs) assert.equal(rawFs.existsSync(p), false);
    } finally { await f.dispose(); }
  });
  await t.test('pre-existing config is not adopted or overwritten', async () => {
    const f = await fixture();
    try {
      await fs.mkdir(f.cache); await fs.writeFile(f.configs[0], 'OWN_SYNTHETIC_EXISTING');
      assert.throws(() => f.createDistributionConfigFiles(f.action, f.cache), e => e.code === 'EEXIST');
      assert.equal(await fs.readFile(f.configs[0], 'utf8'), 'OWN_SYNTHETIC_EXISTING');
      assert.equal(f.settings, undefined);
    } finally { await f.dispose(); }
  });
  await t.test('content and file-identity tampering refuse cleanup of unknown files', async () => {
    for (const replace of [false, true]) {
      const f = await fixture();
      try {
        const configs = f.createDistributionConfigFiles(f.action, f.cache);
        if (replace) { await fs.rename(f.configs[0], f.configs[0] + '.old'); await fs.writeFile(f.configs[0], ''); }
        else { await fs.chmod(f.configs[0], 0o600); await fs.writeFile(f.configs[0], 'OWN_TAMPER'); }
        assert.throws(() => configs.assertFiles(), /CONFIG_CHANGED/);
        assert.throws(() => configs.removeAfterInstallerClose(), /CONFIG_CHANGED/);
        assert.equal(rawFs.existsSync(f.configs[0]), true);
      } finally { await f.dispose(); }
    }
  });
  await t.test('cache replacement and a directory-link config cannot qualify', async () => {
    const f = await fixture();
    try {
      const configs = f.createDistributionConfigFiles(f.action, f.cache);
      await fs.rename(f.cache, f.cache + '.old'); await fs.mkdir(f.cache);
      assert.throws(() => configs.assertFiles(), /CONFIG_ROOT_CHANGED/);
      await fs.symlink(f.cache + '.old', f.configs[0], process.platform === 'win32' ? 'junction' : 'dir');
      assert.throws(() => f.createDistributionConfigFiles(f.action, f.cache), e => ['EEXIST', 'ELOOP'].includes(e.code));
      assert.equal(rawFs.lstatSync(f.configs[0]).isSymbolicLink(), true);
    } finally { await f.dispose(); }
  });
  await t.test('no-op physical close cannot start installer', async () => {
    const f = await fixture({ noopClose: true });
    try {
      assert.throws(() => f.createDistributionConfigFiles(f.action, f.cache), /CONFIG_CLOSE_UNPROVED/);
      assert.equal(f.opened.size, 1); assert.equal(f.settings, undefined);
    } finally { await f.dispose(); }
  });
  for (const raw of [null, 0]) await t.test('raw ' + raw + ' first failure survives secondary cleanup failure', async () => {
    const f = await fixture();
    try {
      const operation = f.runDistributionWorker();
      f.installer.emit('error', raw); f.secondaryUnlinkFailure();
      const rejected = assert.rejects(operation, error => Object.is(error, raw));
      f.installer.emit('close', 17, null); await rejected;
      for (const p of f.configs) assert.equal(rawFs.existsSync(p), true);
    } finally { await f.dispose(); }
  });
  await t.test('no-op unlink cannot become successful distribution cleanup', async () => {
    const f = await fixture({ noopUnlink: true });
    try {
      const configs = f.createDistributionConfigFiles(f.action, f.cache);
      assert.throws(() => configs.removeAfterInstallerClose(), /CONFIG_CLEANUP_UNPROVED/);
      for (const p of f.configs) assert.equal(rawFs.existsSync(p), true);
    } finally { await f.dispose(); }
  });
});
