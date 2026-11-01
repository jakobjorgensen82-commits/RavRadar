import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
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
const parts = [{ partId: 'A', zoneId: 'SYNTHETIC-ZONE', waterPoint: [10, 56] },
  { partId: 'B', zoneId: 'SYNTHETIC-ZONE', waterPoint: [11, 57] }];
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

// Exercise the actual updater's completed pack/retirement block, not a second
// implementation or a fake codec. This proves reference/byte behaviour only;
// the deliberately retained fixture observations cannot prove a heap peak.
const updater = (await fs.readFile(new URL('./update-weather.mjs', import.meta.url), 'utf8'))
  .replace(/\r\n/g, '\n');
const packStart = 'if (coastalPartScoreBuild) {\n  nextDmiForecastStore.partContinuity = await packDmiPartContinuity(';
const packEnd = "reportWeatherBuildStage('coastal-score-runtime-ready', {";
assert.equal(updater.split(packStart).length, 2, 'Actual updater pack block must be unique');
assert.equal(updater.split(packEnd).length, 2, 'Actual updater pack boundary must be unique');
const packStartAt = updater.indexOf(packStart);
const packEndAt = updater.indexOf(packEnd, packStartAt);
assert.ok(packEndAt > packStartAt, 'Actual updater pack must precede score-ready reporting');
const packBlock = updater.slice(packStartAt, packEndAt);
const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;
const runActualPackBlock = new AsyncFunction(
  'coastalPartScoreBuild', 'persistedDmiPartRows', 'nextDmiForecastStore',
  'activeParts', 'generatedAt', 'packDmiPartContinuity',
  `let failurePresent = false, firstFailure;\ntry {\n${packBlock}\n}
   catch (error) { failurePresent = true; firstFailure = error; }
   return { failurePresent, firstFailure,
     selectedReference: coastalPartScoreBuild?.selectedDmiPartRecords,
     nativeProofReference: coastalPartScoreBuild?.selectedDmiPartNativeProofs,
     persistedReference: persistedDmiPartRows,
     partContinuity: nextDmiForecastStore.partContinuity };`,
);
const persistedRows = new Map([...records].map(([id, record]) =>
  [id, { point: record.point, hourly: record.hourly }]));
const originalRecords = structuredClone(records);
const originalPersistedRows = structuredClone(persistedRows);
const originalRecordA = records.get('A');
const originalHoursA = records.get('A').hourly;
const originalPackBytes = Buffer.from(JSON.stringify(pack));
// Keep the old three-argument/schema1 byte oracle distinct from the current
// updater's real fourth argument. This fixture has no numeric current, so its
// normal proof map truthfully contains null, never fabricated original proof.
assert.equal(pack.schemaVersion, 1);
assert.deepEqual(Buffer.from(JSON.stringify(await packDmiPartContinuity(records, parts, start))), originalPackBytes,
  'The old three-argument schema1 whole-byte contract remains separate');
const nullNativeProofs = new Map(parts.map(part => [part.partId, null]));
const expectedNewPack = await packDmiPartContinuity(records, parts, start,
  { nativeCurrentProofsByPart: nullNativeProofs });
assert.equal(expectedNewPack.schemaVersion, 2);
const expectedNewPackBytes = Buffer.from(JSON.stringify(expectedNewPack));

// Real normal-codec refusal must occur before either reference is retired and
// must preserve the previous bound pack. No replacement codec or error stub.
const invalidRecords = new Map(records);
invalidRecords.set('A', { ...records.get('A'),
  hourly: records.get('A').hourly.map((row, index) => index === 0
    ? { ...row, time: 'not-an-exact-hour' } : row) });
const invalidSnapshot = structuredClone(invalidRecords);
const refused = await runActualPackBlock(
  { selectedDmiPartRecords: invalidRecords, selectedDmiPartNativeProofs: nullNativeProofs }, persistedRows, { partContinuity: pack },
  parts, start, packDmiPartContinuity,
);
assert.equal(refused.failurePresent, true);
assert.match(refused.firstFailure?.message ?? '', /^DMI_PART_CONTINUITY_RECORD_INVALID$/);
assert.equal(refused.selectedReference, invalidRecords);
assert.equal(refused.nativeProofReference, nullNativeProofs);
assert.equal(refused.persistedReference, persistedRows);
assert.equal(refused.partContinuity, pack);
assert.deepEqual(invalidRecords, invalidSnapshot);

const completed = await runActualPackBlock(
  { selectedDmiPartRecords: records, selectedDmiPartNativeProofs: nullNativeProofs }, persistedRows, { partContinuity: null },
  parts, start, packDmiPartContinuity,
);
assert.equal(completed.failurePresent, false);
assert.deepEqual(Buffer.from(JSON.stringify(completed.partContinuity)), expectedNewPackBytes,
  'Retirement must preserve the entire hash-bound pack byte-for-byte');
const completedRows = await unpackDmiPartContinuity(completed.partContinuity, parts,
  '2026-09-27T11:00:00.000Z');
for (const part of parts) assert.deepEqual(completedRows.get(part.partId).hourly, hours);
assert.deepEqual(records, originalRecords);
assert.deepEqual(persistedRows, originalPersistedRows);
assert.equal(records.get('A'), originalRecordA);
assert.equal(records.get('A').hourly, originalHoursA);
assert.equal(completed.selectedReference === null, true,
  'DMI_CONTINUITY_SELECTED_REFERENCE_NOT_RETIRED');
assert.equal(completed.persistedReference === null, true,
  'DMI_CONTINUITY_PERSISTED_REFERENCE_NOT_RETIRED');
assert.equal(completed.nativeProofReference === null, true,
  'DMI_CONTINUITY_NATIVE_PROOF_REFERENCE_NOT_RETIRED');
assert.match(updater, /^let persistedDmiPartRows =/m,
  'The actual updater binding must permit reference retirement');
console.log('DMI PART continuity codec: roundtrip, tamper, time and size limits passed');
