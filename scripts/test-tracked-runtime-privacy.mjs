import assert from 'node:assert/strict';
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
