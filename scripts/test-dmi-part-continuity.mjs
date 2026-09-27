import assert from 'node:assert/strict';
import { DMI_FORECAST_HOURS } from './lib/dmi-forecast-store.mjs';
import { PROTECTED_PRIVATE_RUNTIME_POLICY } from './protected-private-production-runtime.mjs';
import { WEATHER_PROGRESS_MAX_CIPHER_BYTES } from './weather-component-progress-cache.mjs';
import { assertDmiPartContinuityTotalSize, MAX_TOTAL_RAW_BYTES,
  MAX_TOTAL_COMPRESSED_BYTES, packDmiPartContinuity,
  unpackDmiPartContinuity } from './lib/dmi-part-continuity.mjs';

// The former 512/96 MiB ceilings rejected a legitimate 673-PART build after
// providers had run. Exercise both independent bounds without allocating GiB.
assert.ok(MAX_TOTAL_RAW_BYTES >= 4 * 512 * 1024 * 1024);
assert.ok(MAX_TOTAL_COMPRESSED_BYTES >= 160 * 1024 * 1024);
assert.ok(MAX_TOTAL_COMPRESSED_BYTES < 256 * 1024 * 1024);
assert.ok(MAX_TOTAL_COMPRESSED_BYTES < WEATHER_PROGRESS_MAX_CIPHER_BYTES / 2);
assert.ok(MAX_TOTAL_COMPRESSED_BYTES
  < PROTECTED_PRIVATE_RUNTIME_POLICY.maximumArchiveAggregateBytes / 2);
assert.doesNotThrow(() => assertDmiPartContinuityTotalSize(
  512 * 1024 * 1024 + 1, 96 * 1024 * 1024 + 1));
assert.throws(() => assertDmiPartContinuityTotalSize(MAX_TOTAL_RAW_BYTES + 1, 1),
  /TOTAL_RAW_SIZE_LIMIT/);
assert.throws(() => assertDmiPartContinuityTotalSize(1, MAX_TOTAL_COMPRESSED_BYTES + 1),
  /TOTAL_COMPRESSED_SIZE_LIMIT/);

const start = '2026-09-27T10:00:00.000Z';
const parts = [{ partId: 'A', waterPoint: [10, 56] },
  { partId: 'B', waterPoint: [11, 57] }];
const hours = Array.from({ length: DMI_FORECAST_HOURS }, (_, index) => ({
  time: new Date(Date.parse(start) + index * 3_600_000).toISOString(),
  waterTemperatureC: index === 36 ? 12.3 : null,
  sources: { waterTemperature: index === 36
    ? { provider: 'dmi', modelRun: '2026-09-26T18:00:00.000Z' }
    : { provider: 'missing' } },
}));
const records = new Map(parts.map(part => [part.partId, {
  zoneId: `PART::${part.partId}`, point: part.waterPoint, hourly: hours,
}]));
const pack = await packDmiPartContinuity(records, parts, start);
const next = await unpackDmiPartContinuity(pack, parts, '2026-09-27T11:00:00.000Z');
assert.equal(next.size, 2);
assert.deepEqual(next.get('A').hourly, hours);
assert.equal((await unpackDmiPartContinuity(pack, [
  { ...parts[0], waterPoint: [10.1, 56] }, parts[1],
], '2026-09-27T11:00:00.000Z')).has('A'), false);
await assert.rejects(unpackDmiPartContinuity({
  ...pack, entries: [{ ...pack.entries[0], compressedSha256: '0'.repeat(64) },
    ...pack.entries.slice(1)],
}, parts, '2026-09-27T11:00:00.000Z'), /DIGEST/);
await assert.rejects(unpackDmiPartContinuity(pack, parts, '2026-09-27T09:00:00.000Z'),
  /MARKER/);
console.log('DMI PART continuity codec: roundtrip, tamper, time and size limits passed');
