import fs from 'node:fs/promises';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';

const SDK = '/usr/local/lib/android/sdk';
const CHILD_ENV = Object.freeze({ PATH: '/usr/bin:/bin', LANG: 'C', LC_ALL: 'C' });
const COMMANDS = Object.freeze({
  measure: Object.freeze(['/usr/bin/du', '-s', '-x', '--block-size=1', '--', SDK]),
  remove: Object.freeze(['/usr/bin/sudo', '-n', '--', '/usr/bin/rm',
    '--one-file-system', '--preserve-root=all', '-rf', '--', SDK]),
});
const refused = code => Object.assign(new Error(code), { code });

function assertHost(environment, platform) {
  if (platform !== 'linux' || environment.GITHUB_ACTIONS !== 'true'
      || environment.RUNNER_ENVIRONMENT !== 'github-hosted'
      || environment.RUNNER_OS !== 'Linux'
      || typeof environment.GITHUB_WORKSPACE !== 'string'
      || !path.posix.isAbsolute(environment.GITHUB_WORKSPACE)
      || environment.GITHUB_WORKSPACE.includes('\0')) {
    throw refused('RUNNER_SDK_HOST_REFUSED');
  }
}

// The same close + process-group observation used by the normal deploy callers.
// Commands and environment are fixed. Any unproved stop refuses further work.
export async function runFixedSdkCommand(operation, {
  spawnImpl = spawn, processImpl = process, now = () => performance.now(), delayImpl = delay,
  report = () => {},
} = {}) {
  if (processImpl.platform !== 'linux' || !Object.hasOwn(COMMANDS, operation)
      || (process.platform !== 'linux' && spawnImpl === spawn) || typeof report !== 'function') {
    throw refused('RUNNER_SDK_COMMAND_REFUSED');
  }
  const [command, ...args] = COMMANDS[operation];
  const started = now();
  report({ kind: 'RUNNER_SDK_COMMAND', operation, phase: 'START', timeoutMs: 60000 });
  let child;
  try {
    child = spawnImpl(command, args, {
      env: CHILD_ENV, detached: true, stdio: ['ignore', 'pipe', 'pipe'],
    });
  } catch {
    const diagnostic = {
      kind: 'RUNNER_SDK_COMMAND', operation, phase: 'FAILED', failureReason: 'SPAWN_THROW',
      elapsedMs: Math.max(0, Math.round(now() - started)), timeoutMs: 60000, timedOut: false,
      exitObserved: false, exitCode: null, exitSignal: null, childClosed: false,
      stdoutClosed: false, stderrClosed: false, stdoutBytes: 0, stderrBytes: 0,
      beforeStop: null, terminationConfirmed: true,
    };
    report(diagnostic);
    throw Object.assign(refused('RUNNER_SDK_COMMAND_FAILED'), { terminationConfirmed: true, diagnostic });
  }
  let closed = false, failed = false, exitCode, exitSignal, stdoutBytes = 0, stderrBytes = 0;
  let exitObserved = false, stdoutClosed = false, stderrClosed = false, failureReason = null;
  const chunks = [];
  const markFailed = reason => { failed = true; failureReason ??= reason; };
  const interrupted = () => { markFailed('PARENT_INTERRUPTED'); };
  child.on('error', () => { markFailed('SPAWN_ERROR'); });
  child.on('exit', (code, signal) => { exitObserved = true; exitCode = code; exitSignal = signal; });
  child.on('close', () => { closed = true; });
  child.stdout.on('close', () => { stdoutClosed = true; });
  child.stderr.on('close', () => { stderrClosed = true; });
  child.stdout.on('data', chunk => {
    stdoutBytes += chunk.length;
    if (stdoutBytes > 4096) markFailed('STDOUT_LIMIT');
    else chunks.push(Buffer.from(chunk));
  });
  child.stderr.on('data', chunk => { stderrBytes += chunk.length; if (stderrBytes > 4096) markFailed('STDERR_LIMIT'); });
  child.stdout.on('error', () => { markFailed('STDOUT_ERROR'); });
  child.stderr.on('error', () => { markFailed('STDERR_ERROR'); });
  processImpl.on('SIGINT', interrupted);
  processImpl.on('SIGTERM', interrupted);
  const groupGone = () => {
    if (!Number.isSafeInteger(child.pid) || child.pid <= 0) return closed;
    try { processImpl.kill(-child.pid, 0); return false; }
    catch (error) { return error.code === 'ESRCH'; }
  };
  const signalGroup = signal => {
    if (!Number.isSafeInteger(child.pid) || child.pid <= 0) return;
    try { processImpl.kill(-child.pid, signal); }
    catch { /* A requested signal is not a closure receipt. */ }
  };
  let stopped = false;
  try {
    const deadline = now() + 60000;
    while (!closed && !failed && now() < deadline) await delayImpl(20);
    const timedOut = !closed && !failed && now() >= deadline;
    failureReason ??= timedOut ? 'TIMEOUT' : !closed ? 'NOT_CLOSED'
      : exitSignal !== null ? 'SIGNAL_EXIT' : exitCode !== 0 ? 'EXIT_NONZERO' : null;
    failed ||= !closed || exitCode !== 0 || exitSignal !== null;
    const beforeStop = {
      exitObserved, exitCode: Number.isInteger(exitCode) ? exitCode : null,
      exitSignal: typeof exitSignal === 'string' && /^SIG[A-Z0-9]{1,12}$/.test(exitSignal) ? exitSignal : null,
      childClosed: closed, stdoutClosed, stderrClosed,
    };
    stopped = closed && groupGone();
    if (!stopped) {
      failed = true;
      for (const signal of ['SIGTERM', 'SIGKILL']) {
        signalGroup(signal);
        const end = now() + 2000;
        while (!(stopped = closed && groupGone()) && now() < end) await delayImpl(20);
        if (stopped) break;
      }
    }
    if (!stopped) failureReason = 'STOP_UNPROVED';
    const diagnostic = {
      kind: 'RUNNER_SDK_COMMAND', operation, phase: failed ? 'FAILED' : 'CLOSED', failureReason,
      elapsedMs: Math.max(0, Math.round(now() - started)), timeoutMs: 60000, timedOut,
      exitObserved, exitCode: Number.isInteger(exitCode) ? exitCode : null,
      exitSignal: typeof exitSignal === 'string' && /^SIG[A-Z0-9]{1,12}$/.test(exitSignal) ? exitSignal : null,
      childClosed: closed, stdoutClosed, stderrClosed, stdoutBytes, stderrBytes,
      beforeStop, terminationConfirmed: stopped,
    };
    report(diagnostic);
    if (failed) throw Object.assign(refused('RUNNER_SDK_COMMAND_FAILED'), { terminationConfirmed: stopped, diagnostic });
    return { stdout: Buffer.concat(chunks).toString('utf8'), terminationConfirmed: true };
  } finally {
    processImpl.removeListener('SIGINT', interrupted);
    processImpl.removeListener('SIGTERM', interrupted);
    if (!stopped) {
      child.stdout.destroy(); child.stderr.destroy(); child.unref();
    }
  }
}

function availableBytes(stat) {
  const value = stat.bavail * stat.bsize;
  if (typeof value !== 'bigint' || value < 0n || value > BigInt(Number.MAX_SAFE_INTEGER)) {
    throw refused('RUNNER_SDK_STORAGE_REFUSED');
  }
  return Number(value);
}

async function absent(fileSystem) {
  try { return await fileSystem.lstat(SDK, { bigint: true }); }
  catch (error) { if (error.code === 'ENOENT') return null; throw error; }
}

export async function reclaimRunnerAndroidSdk({
  environment = process.env, platform = process.platform, fileSystem = fs,
  command = runFixedSdkCommand, observeOnly = false, report = () => {},
} = {}) {
  assertHost(environment, platform); // Before any filesystem/child access.
  // Test seams cannot turn native Windows operations into a Linux delete.
  if (platform !== process.platform && (fileSystem === fs || command === runFixedSdkCommand)) {
    throw refused('RUNNER_SDK_HOST_REFUSED');
  }
  if (typeof observeOnly !== 'boolean' || typeof report !== 'function') throw refused('RUNNER_SDK_ARGUMENT_REFUSED');
  // Inspect the running OS, rather than pinning an image date or ImageOS alias.
  const operatingSystem = await fileSystem.readFile('/etc/os-release', 'utf8');
  if (typeof operatingSystem !== 'string' || operatingSystem.length > 16384
      || (operatingSystem.match(/^ID=.*$/gm) ?? []).length !== 1
      || (operatingSystem.match(/^VERSION_ID=.*$/gm) ?? []).length !== 1
      || !/^ID=(?:ubuntu|"ubuntu")$/m.test(operatingSystem)
      || !/^VERSION_ID=(?:24\.04|"24\.04")$/m.test(operatingSystem)) {
    throw refused('RUNNER_SDK_HOST_REFUSED');
  }
  const workspace = environment.GITHUB_WORKSPACE;
  const location = await fileSystem.lstat(workspace, { bigint: true });
  if (!location.isDirectory() || location.isSymbolicLink()
      || await fileSystem.realpath(workspace) !== workspace) {
    throw refused('RUNNER_SDK_WORKSPACE_REFUSED');
  }
  const before = availableBytes(await fileSystem.statfs(workspace, { bigint: true }));
  if (observeOnly) return { kind: 'RUNNER_RAW_RESTORE_STORAGE', availableBytes: before };
  const sdk = await absent(fileSystem);
  if (sdk === null) return {
    kind: 'RUNNER_UNUSED_ANDROID_SDK', status: 'ABSENT', allocatedBytes: 0,
    availableBeforeBytes: before, availableAfterBytes: before, measuredChangeBytes: 0,
  };
  if (!sdk.isDirectory() || sdk.isSymbolicLink() || sdk.dev !== location.dev
      || await fileSystem.realpath(SDK) !== SDK) {
    throw refused('RUNNER_SDK_PATH_REFUSED');
  }
  const measurement = await command('measure', { report });
  if (measurement.terminationConfirmed !== true) throw refused('RUNNER_SDK_STOP_UNPROVED');
  const match = /^(\d+)\s+\/usr\/local\/lib\/android\/sdk\n?$/.exec(measurement.stdout);
  const allocatedBytes = match && Number(match[1]);
  if (!Number.isSafeInteger(allocatedBytes) || allocatedBytes < 0) throw refused('RUNNER_SDK_MEASUREMENT_REFUSED');
  const current = await absent(fileSystem);
  if (!current || current.dev !== sdk.dev || current.ino !== sdk.ino
      || !current.isDirectory() || current.isSymbolicLink()
      || await fileSystem.realpath(SDK) !== SDK) {
    throw refused('RUNNER_SDK_PATH_REFUSED');
  }
  const removed = await command('remove', { report });
  if (removed.terminationConfirmed !== true) throw refused('RUNNER_SDK_STOP_UNPROVED');
  if (await absent(fileSystem) !== null) throw refused('RUNNER_SDK_REMOVE_UNPROVED');
  const after = availableBytes(await fileSystem.statfs(workspace, { bigint: true }));
  return {
    kind: 'RUNNER_UNUSED_ANDROID_SDK', status: 'REMOVED', allocatedBytes,
    availableBeforeBytes: before, availableAfterBytes: after, measuredChangeBytes: after - before,
  };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    if (process.argv.length > 3 || (process.argv.length === 3 && process.argv[2] !== '--observe-raw')) {
      throw refused('RUNNER_SDK_ARGUMENT_REFUSED');
    }
    console.log(JSON.stringify(await reclaimRunnerAndroidSdk({
      observeOnly: process.argv[2] === '--observe-raw', report: event => console.log(JSON.stringify(event)),
    })));
  } catch (error) {
    console.error(error.code?.startsWith('RUNNER_SDK_') ? error.code : 'RUNNER_SDK_OPERATION_FAILED');
    process.exitCode = 1;
  }
}
