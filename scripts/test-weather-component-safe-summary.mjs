import assert from 'node:assert/strict';
import test from 'node:test';
import { safeWeatherComponentSummary } from './lib/weather-component-safe-summary.mjs';

test('component logging keeps known counts, both CP passes and numeric OM transport', () => {
  const family = { required: 100, valid: 70, missing: 30, trendMissing: 0,
    dmi: 50, reserve: 20, agedDmiChallenges: 3 };
  const before = Object.fromEntries(['wind', 'wave', 'waterLevel', 'waterTemperature']
    .map(key => [key, { ...family }]));
  const pass = { requestedNeeds: 80, budgetMs: 90_000, status: 'IN_PROGRESS',
    outcome: 'COMPLETED', attempts: 5, retryableAttempts: 2, remainingNeeds: 40,
    retryableReasons: { CP_COMPONENT_SUBSET_TIMEOUT: 2 }, transportFailure: null,
    attemptCountsComplete: true };
  const input = { before, afterCopernicus: before, after: before, failures: [],
    pendingCopernicusUpgrades: 10,
    copernicus: { status: 'IN_PROGRESS', attempts: 10, retryableAttempts: 4,
      admittedCandidates: 60, privateSupportCandidates: 0, remainingNeeds: 20,
      recordFailures: 1, remainingUpgradeNeeds: 10, invalidOriginalRecordsReleasedForRetry: 3,
      retryableReasons: { CP_COMPONENT_SUBSET_TIMEOUT: 4 }, transportFailure: null,
      attemptCountsComplete: true, passes: { critical: pass, upgrade: pass } },
    openMeteo: { requests: 12, deferred: 6, records: 120, componentsNotAdmitted: 0,
      failures: [{ code: 'not copied' }], transport: { httpAttempts: 14, retries: 2, timeouts: 1, responseBytes: 900 } } };
  const snapshot = structuredClone(input);
  const result = safeWeatherComponentSummary(input);
  assert.deepEqual(result.before, before);
  assert.deepEqual(result.afterCopernicus, before);
  assert.deepEqual(result.after, before);
  assert.equal(result.failureCount, 0);
  assert.equal(result.pendingCopernicusUpgrades, 10);
  assert.equal(result.copernicus.status, 'IN_PROGRESS');
  assert.equal(result.copernicus.attempts, 10);
  assert.equal(result.copernicus.retryableReasons.CP_COMPONENT_SUBSET_TIMEOUT, 4);
  for (const name of ['critical', 'upgrade']) {
    assert.equal(result.copernicus.passes[name].budgetMs, 90_000);
    assert.equal(result.copernicus.passes[name].attempts, 5);
    assert.equal(result.copernicus.passes[name].deferred, null);
    assert.equal(result.copernicus.passes[name].attemptCountsComplete, true);
  }
  assert.deepEqual(result.openMeteo, { requests: 12, deferred: 6, records: 120,
    componentsNotAdmitted: 0, failureCount: 1,
    transport: { httpAttempts: 14, retries: 2, timeouts: 1, responseBytes: 900 } });
  assert.deepEqual(input, snapshot, 'Logging must never alter runtime acquisition state');
});

test('unknown counts remain unknown and numeric strings never masquerade as evidence', () => {
  for (const input of [null, undefined, {}, [], 'private secret']) {
    const result = safeWeatherComponentSummary(input);
    assert.equal(result.before.wind.required, null);
    assert.equal(result.copernicus.attempts, null);
    assert.equal(result.copernicus.passes.critical, null);
    assert.equal(result.openMeteo.failureCount, null);
  }
  for (const value of [null, undefined, '12', -1, 1.25, Infinity, NaN, Number.MAX_SAFE_INTEGER + 1, {}, []]) {
    const result = safeWeatherComponentSummary({ before: { wind: { valid: value } },
      copernicus: { attempts: value }, openMeteo: { requests: value, transport: { timeouts: value } } });
    assert.equal(result.before.wind.valid, null);
    assert.equal(result.copernicus.attempts, null);
    assert.equal(result.openMeteo.requests, null);
    assert.equal(result.openMeteo.transport.timeouts, null);
  }
});

test('private strings and arbitrary uppercase codes cannot pass the fixed allowlists', () => {
  const secret = 'PRIVATE_TOKEN_ABCDEF';
  const code = 'CP_COMPONENT_PRIVATE_TOKEN_ABCDEF';
  const poisoned = { [secret]: 41, status: code, outcome: code, budgetMs: secret,
    transportFailure: code, attemptCountsComplete: secret,
    retryableReasons: { [code]: 99, CP_COMPONENT_SUBSET_TIMEOUT: secret },
    toJSON: () => { throw new Error('must not call input toJSON'); } };
  const result = safeWeatherComponentSummary({ ...poisoned,
    before: { ...poisoned, wind: { ...poisoned, valid: 3, privatePayload: secret } },
    after: poisoned, afterCopernicus: poisoned, failures: [secret],
    copernicus: { ...poisoned, passes: { critical: poisoned, upgrade: poisoned, [secret]: poisoned } },
    openMeteo: { ...poisoned, failures: [secret], lastAttemptedPartId: secret,
      transport: { ...poisoned, httpAttempts: secret } } });
  const serialized = JSON.stringify(result);
  assert.ok(!serialized.includes(secret));
  assert.ok(!serialized.includes(code));
  assert.ok(!serialized.includes('toJSON'));
  assert.ok(!serialized.includes('privatePayload'));
  assert.ok(!serialized.includes('lastAttemptedPartId'));
  assert.equal(result.copernicus.status, null);
  assert.equal(result.copernicus.transportFailure, null);
  assert.equal(result.copernicus.retryableReasons.CP_COMPONENT_SUBSET_TIMEOUT, null);
  assert.equal(result.copernicus.passes.critical.outcome, null);
  assert.equal(result.before.wind.valid, 3);
  assert.equal(result.failureCount, 1);
  assert.equal(result.openMeteo.failureCount, 1);
});

test('logging ignores inherited evidence and never runs accessors', () => {
  const input = Object.create({ failures: ['private'], before: { wind: { valid: 1 } } });
  Object.defineProperty(input, 'copernicus', { get() { throw new Error('accessor invoked'); } });
  const result = safeWeatherComponentSummary(input);
  assert.equal(result.failureCount, null);
  assert.equal(result.before.wind.valid, null);
  assert.equal(result.copernicus.status, null);
});
