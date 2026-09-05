import assert from 'node:assert/strict';
import { assertFreshProductionTarget } from './check-production-target-freshness.mjs';

assert.deepEqual(assertFreshProductionTarget({
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

assert.throws(() => assertFreshProductionTarget({
  target: '2026-09-05T01:00:00Z',
  now: '2026-09-05T02:31:00Z',
  maximumAgeMinutes: 90,
}), /PRODUCTION_TARGET_STALE/);
assert.throws(() => assertFreshProductionTarget({
  target: '2026-09-05T02:00:00Z',
  now: '2026-09-05T01:54:00Z',
  maximumAgeMinutes: 90,
}), /PRODUCTION_TARGET_FROM_FUTURE/);
assert.throws(() => assertFreshProductionTarget({
  target: '2026-09-05T01:30:00Z',
  now: '2026-09-05T02:00:00Z',
  maximumAgeMinutes: 90,
}), /PRODUCTION_TARGET_TIME_INVALID/);
assert.throws(() => assertFreshProductionTarget({
  target: '2026-09-05T01:00:00Z',
  now: '2026-09-05T02:00:00Z',
  maximumAgeMinutes: 361,
}), /PRODUCTION_TARGET_FRESHNESS_POLICY_INVALID/);

console.log('OK: production target freshness is bounded at supplier and deploy gates.');
