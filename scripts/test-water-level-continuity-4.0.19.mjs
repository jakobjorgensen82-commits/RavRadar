import assert from 'node:assert/strict';
import { repairWaterLevelContinuity } from './lib/water-level-continuity.mjs';

const times = Array.from({length: 10}, (_, i) => `2026-07-28T${String(i).padStart(2,'0')}:00:00.000Z`);
const rows = times.map(time => ({ time, sources: {} }));
const dmi = new Map([
  [times[0], {waterLevelCm: 10}],
  [times[3], {waterLevelCm: 16}],
  [times[4], {waterLevelCm: 18}],
  [times[9], {waterLevelCm: 28}]
]);
const fallback = new Map(times.map((time, i) => [time, {waterLevelCm: -40 + i}]));
const diagnostics = repairWaterLevelContinuity(rows, dmi, fallback, { shortDmiGapHours: 3, jumpWarningCm: 35 });
assert.deepEqual(rows.slice(0,5).map(r=>r.waterLevelCm), [10,12,14,16,18]);
assert.equal(rows[1].waterLevelSource, 'dmi-interpolated');
assert.equal(rows[5].waterLevelSource, 'open-meteo-adjusted');
assert.ok(Math.abs(rows[5].waterLevelCm - rows[4].waterLevelCm) < 10, 'fallback block must join DMI continuously');
assert.ok(Math.abs(rows[9].waterLevelCm - rows[8].waterLevelCm) < 10, 'fallback block must return to DMI continuously');
assert.equal(diagnostics.interpolatedDmiGapHours, 2);
assert.ok(diagnostics.largestHourlyJumpCm < 35);
console.log('OK: DMI-authoritative water-level continuity and bias-adjusted fallback blocks.');
