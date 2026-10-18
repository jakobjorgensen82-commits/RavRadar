import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  TRACKED_PUBLIC_LIVE_ALLOWLIST,
  auditTrackedRuntimePaths,
} from './audit-tracked-runtime-privacy.mjs';

assert.deepEqual(auditTrackedRuntimePaths([...TRACKED_PUBLIC_LIVE_ALLOWLIST]), {
  passed: true,
  trackedLiveFileCount: 4,
  maximumAllowedLiveFileCount: 4,
  privateRuntimeTracked: false,
});
assert.equal(auditTrackedRuntimePaths([
  'data/live/manifest.json',
  'app.js',
]).passed, true);

for (const privatePath of [
  'data/live/conditions.json',
  'data/live/dmi-bulk-cache.json',
  'data/live/dmi-forecast-cache.json',
  'data/live/dmi-water-stations.json',
  'data/live/weather-health.json',
  'data/live/ravradar-runtime-diagnostics.json',
  'data/live/coastal-point-staging-status.json',
  'data/live/new-private-file.json',
]) {
  assert.throws(
    () => auditTrackedRuntimePaths([...TRACKED_PUBLIC_LIVE_ALLOWLIST, privatePath]),
    /Private runtime files are tracked/,
    privatePath,
  );
}
assert.throws(
  () => auditTrackedRuntimePaths(['data\\live\\manifest.json']),
  /unsafe path/,
);
assert.throws(
  () => auditTrackedRuntimePaths(['data/live/manifest.json', 'data/live/manifest.json']),
  /duplicates/,
);

console.log('Tracked data/live privacy allowlist passes.');

// Keep the bounded source group while checking the actual public-facing
// private-data queue and assistant guards in isolated, network-free processes.
for (const script of [
  'scripts/test-observation-production-mapping.mjs',
  'scripts/test-rav-assistant-edge-cloudflare-4.0.290.mjs',
  'scripts/test-public-page-resume-4.0.292.mjs',
  'scripts/test-rav-assistant-main-edge-roundtrip.mjs',
  'scripts/test-auth-bootstrap-4.0.66.mjs',
  'scripts/test-user-account-trip-log-4.0.264.mjs',
  'scripts/test-profile-permission-owner-epoch.mjs',
  'scripts/test-delete-trip-owner-data-readback.mjs',
  'scripts/test-trip-evidence-controller-active-intent.mjs',
  'scripts/test-assistant-ui-error-boundary.mjs',
  'scripts/test-trip-evidence-upload-receipt.mjs',
  'scripts/test-trip-evidence-storage-interruption.mjs',
  'scripts/test-trip-storage-edge-transient-retry.mjs',
]) {
  const result = spawnSync(process.execPath, [script], { cwd: process.cwd(), encoding: 'utf8', timeout: 30_000, maxBuffer: 1024 * 1024 });
  const processReceipt = { kind: 'SOURCE_PRIVACY_CHILD_PROCESS', status: result.status,
    signal: result.signal ?? null, errorCode: result.error?.code ?? null,
    stdoutBytes: Buffer.byteLength(result.stdout ?? ''), stderrBytes: Buffer.byteLength(result.stderr ?? '') };
  if (result.status !== 0 || result.error || result.signal) {
    // Preserve the complete PRIVATE result before the bounded public receipt
    // and original assertion. Do not print raw diagnostics or a local path.
    const privateRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'rr-source-privacy-child-'));
    fs.chmodSync(privateRoot, 0o700);
    for (const channel of ['stdout', 'stderr']) fs.writeFileSync(path.join(privateRoot, channel),
      result[channel] ?? '', { flag: 'wx', mode: 0o600 });
    const error = result.error ? Object.fromEntries(Object.getOwnPropertyNames(result.error)
      .map(key => [key, result.error[key]])) : null;
    fs.writeFileSync(path.join(privateRoot, 'result.json'), JSON.stringify({ script, ...result, error }, null, 2) + '\n',
      { flag: 'wx', mode: 0o600 });
  }
  console.log(JSON.stringify(processReceipt));
  assert.equal(result.status, 0, `${script} failed:\n${result.stdout}\n${result.stderr}`);
  process.stdout.write(result.stdout);
}
