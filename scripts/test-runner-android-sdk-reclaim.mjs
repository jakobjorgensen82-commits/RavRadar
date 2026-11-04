import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import test from 'node:test';
import { spawnSync } from 'node:child_process';
import { EventEmitter } from 'node:events';
import { reclaimRunnerAndroidSdk, runFixedSdkCommand } from './reclaim-runner-android-sdk.mjs';

const SDK = '/usr/local/lib/android/sdk';
const WORKSPACE = '/home/runner/work/RavRadar/RavRadar';
const environment = {
  GITHUB_ACTIONS: 'true', RUNNER_ENVIRONMENT: 'github-hosted',
  RUNNER_OS: 'Linux', GITHUB_WORKSPACE: WORKSPACE,
};
function fixture(changes = {}) {
  const calls = [];
  let removed = false, measurements = 0;
  const directory = (dev = 7n, ino = 12n, link = false) => ({
    dev, ino, isDirectory: () => true, isSymbolicLink: () => link,
  });
  const io = {
    async readFile(target) {
      calls.push(['readFile', target]); assert.equal(target, '/etc/os-release');
      return changes.operatingSystem ?? 'ID=ubuntu\nVERSION_ID="24.04"\n';
    },
    async lstat(target) {
      calls.push(['lstat', target]);
      if (target === WORKSPACE) return directory();
      assert.equal(target, SDK);
      if (changes.absent || removed) throw Object.assign(new Error(), { code: 'ENOENT' });
      return directory(changes.otherDevice ? 8n : 7n,
        changes.changedIdentity && measurements ? 13n : 12n, Boolean(changes.link));
    },
    async realpath(target) { calls.push(['realpath', target]); return changes.redirect && target === SDK ? '/other/sdk' : target; },
    async statfs(target) {
      assert.equal(target, WORKSPACE); calls.push(['statfs', target]);
      return { bavail: removed ? 9000n : 1000n, bsize: 1024n };
    },
  };
  const command = async operation => {
    calls.push(['command', operation]);
    if (operation === 'measure') {
      measurements++;
      return { stdout: '8192000\t'+SDK+'\n', terminationConfirmed: true };
    }
    assert.equal(operation, 'remove');
    if (changes.failedRemoval) throw new Error('synthetic fixed command failure');
    if (!changes.unconfirmed) removed = true;
    return { stdout: '', terminationConfirmed: !changes.unconfirmed };
  };
  return { calls, options: { environment, platform: 'linux', fileSystem: io, command } };
}

test('native CLI refuses an unknown host before SDK operations', () => {
  const child = spawnSync(process.execPath, ['scripts/reclaim-runner-android-sdk.mjs'], {
    env: { PATH: process.env.PATH, SystemRoot: process.env.SystemRoot ?? '' },
    encoding: 'utf8', timeout: 10000,
  });
  assert.equal(child.status, 1);
  assert.equal(child.stdout, '');
  assert.equal(child.stderr.trim(), 'RUNNER_SDK_HOST_REFUSED');
});

test('Windows and each unknown host identity refuse before filesystem or child calls', async () => {
  for (const change of [
    { platform: 'win32' },
    ...Object.keys(environment).filter(key => key !== 'GITHUB_WORKSPACE').map(key => ({
      environment: { ...environment, [key]: 'unknown' },
    })),
    { environment: { ...environment, GITHUB_WORKSPACE: 'relative/path' } },
  ]) {
    const f = fixture();
    await assert.rejects(reclaimRunnerAndroidSdk({ ...f.options, ...change }), { code: 'RUNNER_SDK_HOST_REFUSED' });
    assert.deepEqual(f.calls, []);
  }
});

test('a linked, redirected, different-device or replaced SDK never reaches removal', async () => {
  for (const changes of [{ link: true }, { redirect: true }, { otherDevice: true }, { changedIdentity: true }]) {
    const f = fixture(changes);
    await assert.rejects(reclaimRunnerAndroidSdk(f.options), { code: 'RUNNER_SDK_PATH_REFUSED' });
    assert.equal(f.calls.some(([kind, value]) => kind === 'command' && value === 'remove'), false);
  }
});

test('actual OS must be Ubuntu24.04 without a guessed image alias or date', async () => {
  for (const operatingSystem of ['ID=debian\nVERSION_ID="24.04"\n', 'ID=ubuntu\nVERSION_ID="26.04"\n']) {
    const f = fixture({ operatingSystem });
    await assert.rejects(reclaimRunnerAndroidSdk(f.options), { code: 'RUNNER_SDK_HOST_REFUSED' });
    assert.deepEqual(f.calls, [['readFile', '/etc/os-release']]);
  }
});

test('successful fixed SDK removal reports allocated bytes and actual free-space change', async () => {
  const f = fixture(), result = await reclaimRunnerAndroidSdk(f.options);
  assert.deepEqual(result, {
    kind: 'RUNNER_UNUSED_ANDROID_SDK', status: 'REMOVED', allocatedBytes: 8192000,
    availableBeforeBytes: 1024000, availableAfterBytes: 9216000, measuredChangeBytes: 8192000,
  });
  assert.deepEqual(f.calls.filter(([kind]) => kind === 'command'), [['command', 'measure'], ['command', 'remove']]);
  assert.equal(f.calls.filter(([kind]) => kind === 'statfs').length, 2);
});

test('absent SDK reports zero measured gain without running a command', async () => {
  const f = fixture({ absent: true }), result = await reclaimRunnerAndroidSdk(f.options);
  assert.equal(result.status, 'ABSENT');
  assert.equal(result.measuredChangeBytes, 0);
  assert.equal(f.calls.some(([kind]) => kind === 'command'), false);
});

test('failed or unconfirmed removal cannot produce a success or after-space receipt', async () => {
  for (const changes of [{ failedRemoval: true }, { unconfirmed: true }]) {
    const f = fixture(changes);
    await assert.rejects(reclaimRunnerAndroidSdk(f.options));
    assert.equal(f.calls.filter(([kind]) => kind === 'statfs').length, 1);
  }
});

test('RAW observation reads current free bytes without visiting or removing the SDK', async () => {
  const f = fixture(), result = await reclaimRunnerAndroidSdk({ ...f.options, observeOnly: true });
  assert.deepEqual(result, { kind: 'RUNNER_RAW_RESTORE_STORAGE', availableBytes: 1024000 });
  assert.equal(f.calls.some(([, target]) => target === SDK), false);
  assert.equal(f.calls.some(([kind]) => kind === 'command'), false);
});

test('normal workflow reclaims after trip preflight and observes before RAW restore', async () => {
  const source = await fs.readFile(new URL('../.github/workflows/reusable-weather-build.yml', import.meta.url), 'utf8');
  const preflight = source.indexOf('- name: Preflight exact integrated trip binding before provider work');
  const reclaim = source.indexOf('- name: Reclaim only the unused hosted Android SDK before private restoration');
  const restore = source.indexOf('- name: Restore newest compatible private runtime from protected storage');
  const observation = source.indexOf('- name: Measure runner storage immediately before RAW cache restoration');
  const raw = source.indexOf('- name: Restore bounded DMI GRIB download cache');
  assert(preflight < reclaim && reclaim < restore && observation < raw);
  assert.equal(source.split('run: node scripts/reclaim-runner-android-sdk.mjs\n').length, 2);
  assert.equal(source.split('run: node scripts/reclaim-runner-android-sdk.mjs --observe-raw\n').length, 2);
  const reclaimStep = source.slice(reclaim, source.indexOf('\n      - ', reclaim + 1));
  assert.match(reclaimStep, /if: steps\.preflight\.outputs\.should_run == 'true'/);
  const observationStep = source.slice(observation, raw);
  assert.match(observationStep, /inputs\.completed_private_runtime != true/);
  assert.match(observationStep, /steps\.weather-source-handoff\.outputs\.reused != 'true'/);
});


function processFixture(timeout = false, remains = false) {
  const child = new EventEmitter(), host = new EventEmitter(), invocations = [], signals = [];
  child.pid = 1234; child.stdout = new EventEmitter(); child.stderr = new EventEmitter();
  child.stdout.destroy = child.stderr.destroy = child.unref = () => {};
  let gone = false, clock = 0;
  host.platform = 'linux';
  host.kill = (pid, signal) => {
    assert.equal(pid, -1234);
    if (signal === 0) {
      if (gone) throw Object.assign(new Error(), { code: 'ESRCH' });
      return;
    }
    signals.push(signal);
    if (!remains) {
      gone = true;
      child.emit('exit', null, signal); child.emit('close');
    }
  };
  return { invocations, signals, options: {
    processImpl: host, now: () => clock, delayImpl: async () => { clock += 1000; },
    spawnImpl(command, args, options) {
      invocations.push({ command, args, options });
      if (!timeout) queueMicrotask(() => {
        gone = true; child.emit('exit', 0, null); child.emit('close');
      });
      return child;
    },
  } };
}

test('fixed removal command carries only the literal SDK path and a positive child environment', async () => {
  const f = processFixture();
  assert.deepEqual(await runFixedSdkCommand('remove', f.options), { stdout: '', terminationConfirmed: true });
  assert.deepEqual(f.invocations, [{
    command: '/usr/bin/sudo',
    args: ['-n', '--', '/usr/bin/rm', '--one-file-system', '--preserve-root=all', '-rf', '--', SDK],
    options: { env: { PATH: '/usr/bin:/bin', LANG: 'C', LC_ALL: 'C' }, detached: true, stdio: ['ignore', 'pipe', 'pipe'] },
  }]);
});

test('fixed command timeout confirms a stopped group or explicitly refuses unproved cessation', async () => {
  for (const remains of [false, true]) {
    const f = processFixture(true, remains);
    await assert.rejects(runFixedSdkCommand('remove', f.options), error => (
      error.code === 'RUNNER_SDK_COMMAND_FAILED' && error.terminationConfirmed === !remains
    ));
    assert.deepEqual(f.signals, remains ? ['SIGTERM', 'SIGKILL'] : ['SIGTERM']);
  }
});
