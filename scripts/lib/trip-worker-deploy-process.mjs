import { spawn } from 'node:child_process';
import { setTimeout as sleep } from 'node:timers/promises';

// Ubuntu repair only. The fixed normal npm/shell/Wrangler chain stays in this
// newly owned process group; do not treat direct-parent exit as tree completion.
export async function deployTripWorker({ configPath, env = process.env,
  timeoutMs = 180000, termGraceMs = 2000, killGraceMs = 3000,
  spawnImpl = spawn, killImpl = process.kill.bind(process),
  processImpl = process, now = () => performance.now(), delay = sleep,
} = {}) {
  const failure = reason => Object.assign(new Error('TRIP_REPAIR_WORKER_DEPLOY'), { reason, terminationConfirmed: false });
  if (processImpl.platform !== 'linux' || typeof configPath !== 'string' || !configPath
    || configPath.length > 4096 || configPath.includes('\0')
    || !Number.isInteger(timeoutMs) || timeoutMs < 1 || timeoutMs > 180000
    || !Number.isInteger(termGraceMs) || termGraceMs < 1 || termGraceMs > 2000
    || !Number.isInteger(killGraceMs) || killGraceMs < 1 || killGraceMs > 3000) {
    throw Object.assign(failure('invalid-options'), { terminationConfirmed: true });
  }
  let child, firstError, closed = false, spawnFailed = false, stopped = false;
  let exitCode, exitSignal, stdoutBytes = 0, stderrBytes = 0;
  const stdout = [], maxBytes = 1024 * 1024;
  const fail = reason => { firstError ??= failure(reason); };
  const interrupted = () => fail('interrupted');
  const started = now();
  try {
    try {
      child = spawnImpl('npx', ['--yes', 'wrangler@4.28.1', 'deploy', '--config', configPath], {
        env, detached: true, stdio: ['ignore', 'pipe', 'pipe'],
      });
    } catch {
      throw Object.assign(failure('spawn'), { terminationConfirmed: true });
    }
    child.on('error', () => { spawnFailed = true; fail('spawn'); });
    child.on('exit', (code, signal) => {
      exitCode = code; exitSignal = signal;
      if (code !== 0 || signal !== null) fail('exit');
    });
    child.on('close', () => { closed = true; });
    child.stdout.on('data', chunk => {
      stdoutBytes += chunk.length;
      if (stdoutBytes > maxBytes) fail('stdout-limit'); else stdout.push(Buffer.from(chunk));
    });
    child.stderr.on('data', chunk => {
      stderrBytes += chunk.length;
      if (stderrBytes > maxBytes) fail('stderr-limit');
    });
    child.stdout.on('error', () => fail('stdout'));
    child.stderr.on('error', () => fail('stderr'));
    processImpl.on('SIGINT', interrupted);
    processImpl.on('SIGTERM', interrupted);
    const pidValid = Number.isSafeInteger(child.pid) && child.pid > 0;
    const groupGone = () => {
      if (!pidValid) return spawnFailed;
      try { killImpl(-child.pid, 0); return false; }
      catch (error) { return error?.code === 'ESRCH'; }
    };
    const confirmed = () => closed && groupGone();
    const signalGroup = signal => {
      if (!pidValid) return;
      try { killImpl(-child.pid, signal); }
      catch { /* Requested signal is not a termination receipt. */ }
    };
    while (!closed && !firstError) {
      if (now() - started >= timeoutMs) { fail('timeout'); break; }
      await delay(Math.min(20, Math.max(1, timeoutMs - (now() - started))));
    }
    if (!firstError && (exitCode !== 0 || exitSignal !== null)) fail('exit');
    stopped = confirmed();
    if (!stopped) {
      fail(closed ? 'descendants' : 'termination');
      if (!groupGone()) signalGroup('SIGTERM');
      const termDeadline = now() + termGraceMs;
      while (!(stopped = confirmed()) && now() < termDeadline) await delay(Math.min(20, termDeadline - now()));
      if (!stopped) {
        if (!groupGone()) signalGroup('SIGKILL');
        const killDeadline = now() + killGraceMs;
        while (!(stopped = confirmed()) && now() < killDeadline) await delay(Math.min(20, killDeadline - now()));
      }
    }
    if (firstError) {
      firstError.terminationConfirmed = stopped;
      throw firstError;
    }
    return { stdout: Buffer.concat(stdout).toString('utf8'), terminationConfirmed: true };
  } finally {
    processImpl.removeListener('SIGINT', interrupted);
    processImpl.removeListener('SIGTERM', interrupted);
    if (child && !stopped) {
      // Bound this caller even if the OS cannot confirm termination. The error
      // remains unconfirmed, so the workflow may not recover or restore D1.
      child.stdout?.destroy(); child.stderr?.destroy(); child.unref();
    }
  }
}
