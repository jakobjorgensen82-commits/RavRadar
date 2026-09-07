import assert from 'node:assert/strict';
import { classifyProductionTargetFreshness } from './check-production-target-freshness.mjs';

assert.deepEqual(classifyProductionTargetFreshness({
  target: '2026-09-05T01:00:00Z',
  now: '2026-09-05T02:30:00Z',
  maximumAgeMinutes: 90,
}), {
  status: 'FRESH',
  target: '2026-09-05T01:00:00Z',
  checkedAt: '2026-09-05T02:30:00.000Z',
  ageMinutes: 90,
  maximumAgeMinutes: 90,
});

assert.deepEqual(classifyProductionTargetFreshness({
  target: '2026-09-05T01:00:00Z',
  now: '2026-09-05T02:31:00Z',
  maximumAgeMinutes: 90,
}), {
  status: 'STALE_TARGET_VALID',
  target: '2026-09-05T01:00:00Z',
  checkedAt: '2026-09-05T02:31:00.000Z',
  ageMinutes: 91,
  maximumAgeMinutes: 90,
});
assert.throws(() => classifyProductionTargetFreshness({
  target: '2026-09-05T02:00:00Z',
  now: '2026-09-05T01:54:00Z',
  maximumAgeMinutes: 90,
}), /PRODUCTION_TARGET_FROM_FUTURE/);
assert.throws(() => classifyProductionTargetFreshness({
  target: '2026-09-05T01:30:00Z',
  now: '2026-09-05T02:00:00Z',
  maximumAgeMinutes: 90,
}), /PRODUCTION_TARGET_TIME_INVALID/);
assert.throws(() => classifyProductionTargetFreshness({
  target: '2026-09-05T01:00:00Z',
  now: '2026-09-05T02:00:00Z',
  maximumAgeMinutes: 361,
}), /PRODUCTION_TARGET_FRESHNESS_POLICY_INVALID/);

assert.equal(classifyProductionTargetFreshness({
  target: '2026-09-05T01:00:00Z',
  operationalRangeEnd: '2026-09-09T22:00:00Z',
  now: '2026-09-09T22:00:00.000Z',
  maximumAgeMinutes: 90,
}).status, 'STALE_TARGET_VALID', 'the exact final forecast instant remains usable');
assert.throws(() => classifyProductionTargetFreshness({
  target: '2026-09-05T01:00:00Z',
  operationalRangeEnd: '2026-09-09T22:00:00Z',
  now: '2026-09-09T22:00:00.001Z',
  maximumAgeMinutes: 240,
}), /PRODUCTION_TARGET_EXPIRED/, 'one millisecond beyond the horizon is unavailable');
assert.throws(() => classifyProductionTargetFreshness({
  target: '2026-09-05T01:00:00Z',
  operationalRangeEnd: '2026-09-09T21:00:00Z',
  now: '2026-09-05T02:00:00Z',
  maximumAgeMinutes: 90,
}), /PRODUCTION_TARGET_HORIZON_INVALID/, 'an explicit end must bind exact target plus 117 hours');

console.log('OK: production target age warns while exact 118-hour horizon expiry fails closed.');
