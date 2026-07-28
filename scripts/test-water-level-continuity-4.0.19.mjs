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
console.log('OK: DMI-authoritative continuity and bias-adjusted fallback blocks.');

// Large hourly changes can be physically correct in tidal waters. Valid DMI
// values must therefore remain untouched solely because a generic threshold is exceeded.
const tidalTimes = Array.from({length: 8}, (_, i) => `2026-07-29T${String(i).padStart(2,'0')}:00:00.000Z`);
const tidalValues = [0, 2, 4, 53, 102, 151, 102, 53];
const tidalRows = tidalTimes.map(time => ({ time, sources: {}, waterLevelFallbackRawCm: 999, waterLevelFallbackOffsetCm: 999 }));
const tidalDmi = new Map(tidalTimes.map((time, i) => [time, {waterLevelCm: tidalValues[i]}]));
const fallbackShape = new Map(tidalTimes.map((time, i) => [time, {waterLevelCm: i * 2}]));
const tidalDiagnostics = repairWaterLevelContinuity(tidalRows, tidalDmi, fallbackShape, { jumpWarningCm: 35 });
assert.deepEqual(tidalRows.map(row => row.waterLevelCm), tidalValues, 'authoritative DMI tide must not be flattened or replaced');
assert.ok(tidalRows.every(row => row.waterLevelSource === 'dmi'));
assert.equal(tidalDiagnostics.dmiSlopeRepairs, 0);
assert.ok(tidalDiagnostics.authoritativeDmiJumpsAccepted > 0);
assert.ok(tidalDiagnostics.warnings.every(item => item.action === 'accepted-without-modification'));
assert.equal(tidalRows[0].waterLevelFallbackRawCm, undefined, 'stale continuity metadata must be removed');
console.log('OK: large authoritative DMI tidal changes are retained and only diagnosed.');

// Sequential large changes are valid when they form coherent rising/falling
// branches with approximately two highs and two lows per day.
const coherentTimes = Array.from({length: 25}, (_, i) => `2026-07-30T${String(i).padStart(2,'0')}:00:00.000Z`);
const coherentValues = [
  0, 35, 70, 105, 135, 150, 140, 110, 70, 30, -10, -40, -55,
  -40, -5, 35, 75, 110, 130, 115, 80, 40, 0, -35, -50
];
const coherentRows = coherentTimes.map(time => ({ time, sources: {} }));
const coherentDmi = new Map(coherentTimes.map((time, i) => [time, { waterLevelCm: coherentValues[i] }]));
const coherentDiagnostics = repairWaterLevelContinuity(coherentRows, coherentDmi, new Map(), {
  directionDeadbandCm: 5,
  maxTurningPointsPerWindow: 6
});
assert.deepEqual(coherentRows.map(row => row.waterLevelCm), coherentValues, 'coherent semidiurnal tide must be preserved');
assert.equal(coherentDiagnostics.tidalPattern.suspiciousWindows, 0, 'two coherent tides per day must not be flagged');
assert.equal(coherentDiagnostics.tidalPattern.alternatingRuns.length, 0);
console.log('OK: large sequential semidiurnal changes are accepted.');

// Significant hour-by-hour + - + - oscillation is not a plausible tidal branch.
const zigzagTimes = Array.from({length: 12}, (_, i) => `2026-07-31T${String(i).padStart(2,'0')}:00:00.000Z`);
const zigzagValues = [0, 30, 0, 32, 1, 34, 2, 36, 4, 38, 6, 40];
const zigzagRows = zigzagTimes.map(time => ({ time, sources: {} }));
const zigzagDmi = new Map(zigzagTimes.map((time, i) => [time, { waterLevelCm: zigzagValues[i] }]));
const zigzagDiagnostics = repairWaterLevelContinuity(zigzagRows, zigzagDmi, new Map(), {
  directionDeadbandCm: 5,
  minRapidReversals: 3,
  maxTurningPointsPerWindow: 6
});
assert.deepEqual(zigzagRows.map(row => row.waterLevelCm), zigzagValues, 'diagnostics must not silently rewrite authoritative DMI');
assert.ok(zigzagDiagnostics.tidalPattern.alternatingRuns.length > 0, 'hourly zigzag must be detected');
assert.ok(zigzagDiagnostics.warnings.some(item => item.classification === 'rapid-hourly-water-level-zigzag'));
console.log('OK: significant hourly +-+-+- zigzag is diagnosed without modifying DMI.');

// Tiny plateau noise around high/low water must be ignored by the deadband.
const plateauTimes = Array.from({length: 10}, (_, i) => `2026-08-01T${String(i).padStart(2,'0')}:00:00.000Z`);
const plateauValues = [40, 70, 95, 101, 99, 102, 100, 90, 65, 35];
const plateauRows = plateauTimes.map(time => ({ time, sources: {} }));
const plateauDmi = new Map(plateauTimes.map((time, i) => [time, { waterLevelCm: plateauValues[i] }]));
const plateauDiagnostics = repairWaterLevelContinuity(plateauRows, plateauDmi, new Map(), { directionDeadbandCm: 5 });
assert.equal(plateauDiagnostics.tidalPattern.alternatingRuns.length, 0, 'minor slack-water noise must not count as zigzag');
console.log('OK: small high/low-water plateau noise is ignored.');
