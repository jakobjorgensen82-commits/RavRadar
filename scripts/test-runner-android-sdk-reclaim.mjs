import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import test from 'node:test';
import { spawnSync } from 'node:child_process';
import { EventEmitter } from 'node:events';
import crypto from 'node:crypto';
import { reclaimRunnerAndroidSdk, runFixedSdkCommand } from './reclaim-runner-android-sdk.mjs';
import {
  SOURCE_IMPACT_SDK_EARLY_LINUX_REVIEW, SOURCE_IMPACT_FULL_WORKFLOW_SHA256,
  inverseSourceImpactSdkEarlyLinux, projectSourceImpactWorkflowFull, inverseSourceImpactHourEarlyLinux, inverseSourceImpactDmiPython, reviewedSourcePrWorkflowOrdinaryView,
} from './lib/source-impact-workflow-review.mjs';

const SDK = '/usr/local/lib/android/sdk';
const WORKSPACE = '/home/runner/work/RavRadar/RavRadar';
const environment = {
  GITHUB_ACTIONS: 'true', RUNNER_ENVIRONMENT: 'github-hosted',
  RUNNER_OS: 'Linux', GITHUB_WORKSPACE: WORKSPACE,
};
function fixture(changes = {}) {
  const calls = [];
  let removed = false, sdkVisits = 0;
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
      sdkVisits++;
      if (changes.absent || removed) throw Object.assign(new Error(), { code: 'ENOENT' });
      return directory(changes.otherDevice ? 8n : 7n,
        changes.changedIdentity && sdkVisits > 1 ? 13n : 12n, Boolean(changes.link));
    },
    async realpath(target) { calls.push(['realpath', target]); return changes.redirect && target === SDK ? '/other/sdk' : target; },
    async statfs(target) {
      assert.equal(target, WORKSPACE); calls.push(['statfs', target]);
      return { bavail: removed ? 9000n : 1000n, bsize: 1024n, ...changes.statfsCounts };
    },
  };
  const command = async operation => {
    calls.push(['command', operation]);
    if (operation === 'measure') {
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

test('successful one-pass SDK removal reports unknown allocation and actual free-space change', async () => {
  const f = fixture(), result = await reclaimRunnerAndroidSdk(f.options);
  assert.deepEqual(result, {
    kind: 'RUNNER_UNUSED_ANDROID_SDK', status: 'REMOVED', allocatedBytes: null,
    availableBeforeBytes: 1024000, availableAfterBytes: 9216000, measuredChangeBytes: 8192000,
  });
  assert.deepEqual(f.calls.filter(([kind]) => kind === 'command'), [['command', 'remove']]);
  assert.equal(f.calls.filter(([kind]) => kind === 'statfs').length, 2);
  assert.equal(f.calls.filter(([kind, value]) => kind === 'lstat' && value === SDK).length, 3);
  assert.equal(f.calls.filter(([kind, value]) => kind === 'realpath' && value === SDK).length, 2);
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


function processFixture(timeout = false, remains = false, completion = {}) {
  const child = new EventEmitter(), host = new EventEmitter(), invocations = [], signals = [], reports = [];
  child.pid = 1234; child.stdout = new EventEmitter(); child.stderr = new EventEmitter();
  child.stdout.destroy = child.stderr.destroy = child.unref = () => {};
  let gone = false, clock = 0;
  const finish = () => {
    gone = true;
    if (completion.stdout) child.stdout.emit('data', Buffer.from(completion.stdout));
    if (completion.stderr) child.stderr.emit('data', Buffer.from(completion.stderr));
    child.stdout.emit('close'); child.stderr.emit('close');
    child.emit('exit', completion.exitCode ?? 0, null); child.emit('close');
  };
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
      child.stdout.emit('close'); child.stderr.emit('close');
      if (!completion.exitBeforeClose) child.emit('exit', null, signal);
      child.emit('close');
    }
  };
  return { invocations, signals, reports, options: {
    report: event => reports.push(event),
    processImpl: host, now: () => clock, delayImpl: async () => {
      clock += 1000;
      if (!gone && Number.isSafeInteger(completion.completeAtMs) && clock >= completion.completeAtMs) finish();
    },
    spawnImpl(command, args, options) {
      invocations.push({ command, args, options });
      if (timeout && completion.exitBeforeClose) queueMicrotask(() => child.emit('exit', 0, null));
      if (!timeout) queueMicrotask(finish);
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
      && error.diagnostic === f.reports[1]
    ));
    assert.deepEqual(f.signals, remains ? ['SIGTERM', 'SIGKILL'] : ['SIGTERM']);
    assert.equal(f.reports[0].phase, 'START');
    assert.equal(f.reports[1].operation, 'remove');
    assert.equal(f.reports[1].timedOut, true);
    assert.equal(f.reports[1].timeoutMs, 120000);
    assert.equal(f.reports[0].timeoutMs, 120000);
    assert.equal(f.reports[1].elapsedMs, remains ? 124000 : 120000);
    assert.equal(f.reports[1].terminationConfirmed, !remains);
    assert.equal(f.reports[1].childClosed, !remains);
    assert.equal(f.reports[1].failureReason, remains ? 'STOP_UNPROVED' : 'TIMEOUT');
  }
});

test('one fixed removal pass can close after sixty seconds within its unchanged total reclaim envelope', async () => {
  const f = processFixture(true, false, { completeAtMs: 90000 });
  assert.deepEqual(await runFixedSdkCommand('remove', f.options), { stdout: '', terminationConfirmed: true });
  assert.equal(f.invocations.length, 1);
  assert.equal(f.reports[1].operation, 'remove');
  assert.equal(f.reports[1].elapsedMs, 90000);
  assert.equal(f.reports[1].timeoutMs, 120000);
  assert.equal(f.reports[1].timedOut, false);
  assert.equal(f.reports[1].childClosed, true);
  assert.equal(f.reports[1].terminationConfirmed, true);
  assert.deepEqual(f.signals, []);
  assert(120000 + 2 * 2000 < 2 * (60000 + 2 * 2000));
});

test('normal fixed measurement reports exact operation and physical closure without child output', async () => {
  const secret = 'unprinted synthetic child detail';
  const f = processFixture(false, false, { stdout: '8192000\t'+SDK+'\n', stderr: secret });
  assert.equal((await runFixedSdkCommand('measure', f.options)).terminationConfirmed, true);
  assert.deepEqual(f.invocations[0].args, ['-s', '-x', '--block-size=1', '--', SDK]);
  assert.deepEqual(f.reports.map(({ operation, phase }) => ({ operation, phase })), [
    { operation: 'measure', phase: 'START' }, { operation: 'measure', phase: 'CLOSED' },
  ]);
  assert.equal(f.reports[1].elapsedMs, 1000);
  assert.equal(f.reports[0].timeoutMs, 60000);
  assert.equal(f.reports[1].timeoutMs, 60000);
  assert.equal(f.reports[1].exitObserved, true);
  assert.equal(f.reports[1].exitCode, 0);
  assert.equal(f.reports[1].exitSignal, null);
  assert.equal(f.reports[1].stdoutClosed, true);
  assert.equal(f.reports[1].stderrClosed, true);
  assert.equal(f.reports[1].timedOut, false);
  assert.equal(f.reports[1].terminationConfirmed, true);
  assert.equal(f.reports[1].failureReason, null);
  assert.equal(f.reports[1].stderrBytes, Buffer.byteLength(secret));
  assert.equal(JSON.stringify(f.reports).includes(secret), false);
  assert.equal(JSON.stringify(f.reports).includes(SDK), false);
});

test('normal fixed child distinguishes a closed nonzero exit from timeout without leaking error text', async () => {
  const secret = 'unprinted synthetic error detail';
  const f = processFixture(false, false, { exitCode: 1, stderr: secret });
  await assert.rejects(runFixedSdkCommand('measure', f.options), error => (
    error.code === 'RUNNER_SDK_COMMAND_FAILED' && error.terminationConfirmed === true
    && error.diagnostic.failureReason === 'EXIT_NONZERO'
    && error.diagnostic.exitCode === 1 && error.diagnostic.timedOut === false
  ));
  assert.equal(f.reports[1].phase, 'FAILED');
  assert.deepEqual(f.signals, []);
  assert.equal(JSON.stringify(f.reports).includes(secret), false);
});

test('normal fixed timeout preserves pre-stop exit and pipe state before a proved group stop', async () => {
  const f = processFixture(true, false, { exitBeforeClose: true });
  await assert.rejects(runFixedSdkCommand('measure', f.options), error => (
    error.code === 'RUNNER_SDK_COMMAND_FAILED' && error.terminationConfirmed === true
    && error.diagnostic.timedOut === true
  ));
  assert.deepEqual(f.reports[1].beforeStop, {
    exitObserved: true, exitCode: 0, exitSignal: null,
    childClosed: false, stdoutClosed: false, stderrClosed: false,
  });
  assert.equal(f.reports[1].childClosed, true);
  assert.equal(f.reports[1].stdoutClosed, true);
  assert.equal(f.reports[1].stderrClosed, true);
  assert.equal(f.reports[1].elapsedMs, 60000);
  assert.equal(f.reports[1].timeoutMs, 60000);
  assert.deepEqual(f.signals, ['SIGTERM']);
});

test('fixed spawn failure reports no child and never claims an SDK success', async () => {
  const f = processFixture();
  f.options.spawnImpl = () => { throw new Error('unprinted synthetic spawn detail'); };
  await assert.rejects(runFixedSdkCommand('measure', f.options), error => (
    error.code === 'RUNNER_SDK_COMMAND_FAILED' && error.terminationConfirmed === true
    && error.diagnostic.failureReason === 'SPAWN_THROW' && error.diagnostic.beforeStop === null
  ));
  assert.deepEqual(f.signals, []);
  assert.equal(f.reports[1].childClosed, false);
  assert.equal(JSON.stringify(f.reports).includes('unprinted synthetic spawn detail'), false);
});

test('early Linux source step runs the actual fixed SDK caller before its unchanged short matrix', async () => {
  const source = inverseSourceImpactDmiPython(reviewedSourcePrWorkflowOrdinaryView(await fs.readFile(new URL('../.github/workflows/validate-pull-request.yml', import.meta.url), 'utf8')));
  const begin = source.indexOf('      - name: Diagnose normal pack-reader closure on artificial data only\n');
  assert(begin > 0);
  const step = source.slice(begin, source.indexOf('\n      - ', begin + 1));
  assert.match(step, /timeout-minutes: 3\n/);
  assert.match(step, /run: >-\n          node scripts\/test-production-hour-lock-4\.0\.236\.mjs &&\n          node scripts\/reclaim-runner-android-sdk\.mjs &&\n          node scripts\/test-post-cutover-migration-routing\.mjs &&/);
  assert.equal(source.split('node scripts/reclaim-runner-android-sdk.mjs &&\n').length, 2);
  assert.equal((source.match(/^      - (?:name|uses):/gm) ?? []).length, 21);
  assert.match(step, /steps\.source-content\.outputs\.selection != 'TARGETED'/);
});

test('early SDK workflow has an exact whole inverse and rejects missing changed or duplicate reviewed hunks', async () => {
  const rawSource = inverseSourceImpactDmiPython(reviewedSourcePrWorkflowOrdinaryView(await fs.readFile(new URL('../.github/workflows/validate-pull-request.yml', import.meta.url), 'utf8')));
  const source = inverseSourceImpactHourEarlyLinux(rawSource);
  assert.equal(projectSourceImpactWorkflowFull(rawSource), projectSourceImpactWorkflowFull(source));
  const review = SOURCE_IMPACT_SDK_EARLY_LINUX_REVIEW;
  const sha = value => crypto.createHash('sha256').update(value).digest('hex');
  const before = inverseSourceImpactSdkEarlyLinux(source);
  assert.equal(sha(source), review.afterSha256);
  assert.equal(sha(before), review.beforeSha256);
  assert.equal(before.replace(review.before, review.after), source);
  assert.equal(sha(projectSourceImpactWorkflowFull(source)), SOURCE_IMPACT_FULL_WORKFLOW_SHA256);
  assert.equal(projectSourceImpactWorkflowFull(source), projectSourceImpactWorkflowFull(before));
  for (const changed of [
    source.replace('          node scripts/reclaim-runner-android-sdk.mjs &&\n', ''),
    source.replace('          node scripts/reclaim-runner-android-sdk.mjs &&\n', '          node scripts/reclaim-runner-android-sdk.mjs --observe-raw &&\n'),
    source.replace(review.after, review.after + review.after),
  ]) assert.throws(() => projectSourceImpactWorkflowFull(changed));
});

test('existing statfs reports safe byte and inode counts before any SDK command and during RAW observation without changing returns', async () => {
  for (const [statfsCounts, freeInodes, totalInodes] of [
    [{ ffree: 8n, files: 20n }, 8, 20],
    [undefined, null, null],
    [{ ffree: -1n, files: 1n << 64n }, null, null],
    [{ ffree: 0, files: 0 }, 0, 0],
  ]) {
    const f = fixture({ statfsCounts }), events = [];
    const report = event => { events.push(event); f.calls.push(['report', event.phase]); };
    const failure = Object.assign(new Error('fixed synthetic timeout'), { code: 'RUNNER_SDK_COMMAND_FAILED' });
    await assert.rejects(reclaimRunnerAndroidSdk({ ...f.options, report,
      command: async operation => {
        assert.equal(operation, 'remove');
        assert.equal(events.length, 1);
        throw failure;
      },
    }), error => error === failure);
    assert.deepEqual(events, [{
      kind: 'RUNNER_STORAGE_OBSERVATION', phase: 'BEFORE_SDK',
      availableBytes: 1024000, freeInodes, totalInodes,
    }]);
    assert.equal(f.calls.filter(([kind]) => kind === 'statfs').length, 1);
    const raw = fixture({ statfsCounts }), rawEvents = [];
    assert.deepEqual(await reclaimRunnerAndroidSdk({ ...raw.options, observeOnly: true,
      report: event => rawEvents.push(event),
    }), { kind: 'RUNNER_RAW_RESTORE_STORAGE', availableBytes: 1024000 });
    assert.deepEqual(rawEvents, [{
      kind: 'RUNNER_STORAGE_OBSERVATION', phase: 'BEFORE_RAW_RESTORE',
      availableBytes: 1024000, freeInodes, totalInodes,
    }]);
    assert.equal(raw.calls.filter(([kind]) => kind === 'statfs').length, 1);
    assert.equal(raw.calls.some(([, target]) => target === SDK), false);
    assert.equal(raw.calls.some(([kind]) => kind === 'command'), false);
    assert.equal(JSON.stringify(events.concat(rawEvents)).includes(SDK), false);
    assert.equal(JSON.stringify(events.concat(rawEvents)).includes(WORKSPACE), false);
  }
});


test('capacity-first housekeeping keeps a verified SDK when measured headroom is ample', async () => {
  const f = fixture({ statfsCounts: { bavail: 91089567744n, bsize: 1n, ffree: 18422396n } });
  const result = await reclaimRunnerAndroidSdk(f.options);
  assert.deepEqual(result, {
    kind: 'RUNNER_UNUSED_ANDROID_SDK', status: 'RETAINED_SUFFICIENT_CAPACITY',
    allocatedBytes: null, availableBeforeBytes: 91089567744,
    availableAfterBytes: 91089567744, measuredChangeBytes: 0,
    minimumRetainedFreeBytes: 68719476736, minimumRetainedFreeInodes: 1000000,
    observedFreeInodes: 18422396,
  });
  assert.equal(f.calls.filter(([kind]) => kind === 'command').length, 0);
  assert.equal(f.calls.filter(([kind]) => kind === 'statfs').length, 1);
  assert.equal(f.calls.filter(([kind, target]) => kind === 'lstat' && target === SDK).length, 2);
  assert.equal(f.calls.filter(([kind, target]) => kind === 'realpath' && target === SDK).length, 2);
});

test('capacity-first housekeeping uses fixed exact boundaries and preserves removal for low or unknown capacity', async () => {
  const enough = fixture({ statfsCounts: { bavail: 68719476736n, bsize: 1n, ffree: 1000000n } });
  assert.equal((await reclaimRunnerAndroidSdk(enough.options)).status, 'RETAINED_SUFFICIENT_CAPACITY');
  assert.equal(enough.calls.some(([kind]) => kind === 'command'), false);
  for (const statfsCounts of [
    { bavail: 68719476735n, bsize: 1n, ffree: 1000000n },
    { bavail: 68719476736n, bsize: 1n, ffree: 999999n },
    { bavail: 68719476736n, bsize: 1n },
    { bavail: 68719476736n, bsize: 1n, ffree: -1n },
    { bavail: 68719476736n, bsize: 1n, ffree: 1n << 64n },
  ]) {
    const f = fixture({ statfsCounts });
    assert.equal((await reclaimRunnerAndroidSdk(f.options)).status, 'REMOVED');
    assert.deepEqual(f.calls.filter(([kind]) => kind === 'command'), [['command', 'remove']]);
  }
});

test('capacity-first housekeeping cannot hide invalid SDK identity, failed removal or a RAW observation', async () => {
  const ample = { bavail: 91089567744n, bsize: 1n, ffree: 18422396n };
  for (const change of [{ link: true }, { redirect: true }, { otherDevice: true }, { changedIdentity: true }]) {
    const f = fixture({ ...change, statfsCounts: ample });
    await assert.rejects(reclaimRunnerAndroidSdk(f.options), { code: 'RUNNER_SDK_PATH_REFUSED' });
    assert.equal(f.calls.some(([kind]) => kind === 'command'), false);
  }
  const low = fixture({ failedRemoval: true });
  await assert.rejects(reclaimRunnerAndroidSdk(low.options));
  const raw = fixture({ statfsCounts: ample });
  assert.deepEqual(await reclaimRunnerAndroidSdk({ ...raw.options, observeOnly: true }),
    { kind: 'RUNNER_RAW_RESTORE_STORAGE', availableBytes: 91089567744 });
  assert.equal(raw.calls.some(([, target]) => target === SDK), false);
  assert.equal(raw.calls.some(([kind]) => kind === 'command'), false);
});


// Raw caller regression: historical workflow projections must never erase this
// publication assertion. No real build command or weather/provider work runs.
test('ordinary Pages publication executes required gate outcomes before any build', async t => {
  const {default:path}=await import('node:path');
  const {default:os}=await import('node:os');
  let shell='/bin/bash';
  if(process.platform==='win32'){
    const git=spawnSync('git',['--exec-path'],{encoding:'utf8',windowsHide:true,timeout:5000});
    assert.equal(git.status,0,'Existing native Git is required to locate Windows Bash');
    shell=path.resolve(git.stdout.trim(),'../../../usr/bin/sh.exe');
  }
  const version=spawnSync(shell,['--version'],{encoding:'utf8',windowsHide:true,timeout:5000});
  assert.equal(version.status,0,'Actual Bash is required; missing runtime is no positive proof');
  assert.match(version.stdout,/^GNU bash,/);
  const raw=await fs.readFile(new URL('../.github/workflows/reusable-weather-build.yml',import.meta.url),'utf8');
  const name='      - name: Build lean GitHub Pages artifact\n';
  const begin=raw.indexOf(name);assert(begin>=0&&raw.indexOf(name,begin+1)===-1);
  const end=raw.indexOf('\n      - ',begin+1),step=raw.slice(begin,end<0?raw.length:end);
  assert(step.includes("        if: steps.preflight.outputs.should_run == 'true'\n"));
  const run=step.split('        run: |\n');assert.equal(run.length,2);
  const body=run[1].split('\n').map(line=>{assert(!line||line.startsWith('          '));return line.slice(10);}).join('\n')+'\n';
  const stubs='rm(){ printf "rm\n" >> "$TRACE"; }\nmkdir(){ printf "mkdir\n" >> "$TRACE"; }\nrsync(){ printf "rsync:%s:%s\n" "$2" "$3" >> "$TRACE"; }\ninstall(){ printf "install\n" >> "$TRACE"; }\nnode(){ printf "node:%s\n" "$1" >> "$TRACE"; }\n';
  const scenarios=[
  [
    "ordinary-pass",
    "integrated",
    "success",
    "success",
    true
  ],
  [
    "ordinary-full-failed-even-continued",
    "integrated",
    "failure",
    "success",
    false
  ],
  [
    "ordinary-release-failed-even-continued",
    "integrated",
    "success",
    "failure",
    false
  ],
  [
    "ordinary-both-failed",
    "integrated",
    "failure",
    "failure",
    false
  ],
  [
    "ordinary-full-skipped",
    "integrated",
    "skipped",
    "success",
    false
  ],
  [
    "ordinary-release-skipped",
    "integrated",
    "success",
    "skipped",
    false
  ],
  [
    "ordinary-full-cancelled",
    "integrated",
    "cancelled",
    "success",
    false
  ],
  [
    "ordinary-release-cancelled",
    "integrated",
    "success",
    "cancelled",
    false
  ],
  [
    "ordinary-full-unknown",
    "integrated",
    "",
    "success",
    false
  ],
  [
    "ordinary-release-unknown",
    "integrated",
    "success",
    "",
    false
  ],
  [
    "candidate-pass",
    "candidate-shadow",
    "success",
    "success",
    true
  ],
  [
    "candidate-full-failed",
    "candidate-shadow",
    "failure",
    "success",
    false
  ],
  [
    "candidate-release-failed",
    "candidate-shadow",
    "success",
    "failure",
    false
  ],
  [
    "unknown-action-does-not-exempt",
    "unknown",
    "failure",
    "success",
    false
  ],
  [
    "permitted-public-audit-diagnostic-independent",
    "integrated",
    "success",
    "success",
    true
  ],
  [
    "integrated-cutover-outer-gates-intentionally-skipped",
    "integrated-cutover",
    "skipped",
    "skipped",
    true
  ]
];
  const root=await fs.mkdtemp(path.join(os.tmpdir(),'rr-required-publication-'));
  try{
    for(const [name,action,full,release,allowed] of scenarios){
      const directory=path.join(root,name);await fs.mkdir(directory);
      const script=path.join(directory,'caller.sh'),trace=path.join(directory,'trace'),output=path.join(directory,'output');
      let selected=body;
      for(const [expression,value] of [['${{ steps.operational-action.outputs.action }}',action],['${{ steps.full-validation.outcome }}',full],['${{ steps.release-gate.outcome }}',release]])selected=selected.split(expression).join(value);
      assert(!selected.includes('${{'));
      await fs.writeFile(script,stubs+selected);await fs.writeFile(trace,'');await fs.writeFile(output,'');
      const result=spawnSync(shell,['--noprofile','--norc','-e','-o','pipefail',script.split(path.sep).join('/')],{cwd:directory,encoding:'utf8',windowsHide:true,timeout:5000,
        env:{...process.env,TRACE:trace.split(path.sep).join('/'),GITHUB_OUTPUT:output.split(path.sep).join('/'),GITHUB_WORKSPACE:'/workspace',RAVRADAR_CANDIDATE_STAGE:'/candidate'}});
      assert.equal(result.status===0,allowed,'Required publication gate scenario: '+name);
      const observed=await fs.readFile(trace,'utf8'),marker=await fs.readFile(output,'utf8');
      if(allowed){
        assert.equal(marker,'built=true\n');
        assert(observed.includes('node:scripts/copy-pages-public-delivery.mjs\n'));
        assert(observed.includes('rsync:'+(action.startsWith('candidate-')?'/candidate/':'/workspace/')+':_site/\n'));
      }else{
        assert.equal(observed,'');assert.equal(marker,'');
        assert.equal(result.stdout.trim(),'::error::PRODUCTION_PUBLICATION_REQUIRED_GATES_NOT_PASSED');
      }
    }
    t.diagnostic('16 actual emitted publication-gate scenarios passed; no provider or build commands executed.');
  }finally{
    assert.equal(path.dirname(root),path.resolve(os.tmpdir()));assert(path.basename(root).startsWith('rr-required-publication-'));
    await fs.rm(root,{recursive:true});
  }
});
