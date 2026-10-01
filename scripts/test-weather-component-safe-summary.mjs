import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import test from 'node:test';
import { safeWeatherComponentSummary } from './lib/weather-component-safe-summary.mjs';
import { copernicusRetryableReasonCounts } from './lib/copernicus-component-runtime.mjs';

const accounting = (known, unaccounted, consistent) => ({
  knownReasonReportedAttempts: known,
  unaccountedReasonReportedAttempts: unaccounted,
  reportedCountsConsistent: consistent,
});
const cpWithPasses = value => ({ copernicus: { ...value,
  passes: { critical: value, upgrade: value } } });
const allScopes = result => [result.copernicus, result.copernicus.passes.critical,
  result.copernicus.passes.upgrade];
const expectAllAccounting = (input, expected) => {
  for (const scope of allScopes(safeWeatherComponentSummary(cpWithPasses(input)))) {
    assert.deepEqual(scope.retryableReasonAccounting, expected);
  }
};

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

test('real pure CP reason counting exposes the 26/24 remainder in top-level and both pass projections', () => {
  const privateCode = 'CP_SYNTHETIC_PRIVATE_DIAGNOSTIC_TOKEN';
  const attempts = [
    ...Array.from({ length: 20 }, () => ({ status: 'RETRYABLE_ERROR', reason: 'CP_COMPONENT_SUBSET_TIMEOUT' })),
    ...Array.from({ length: 4 }, () => ({ status: 'RETRYABLE_ERROR', reason: 'CP_COMPONENT_DATASET_UPDATING' })),
    ...Array.from({ length: 2 }, () => ({ status: 'RETRYABLE_ERROR', reason: privateCode })),
    ...Array.from({ length: 4 }, () => ({ status: 'PARSED', reason: privateCode })),
  ];
  const value = { attempts: attempts.length,
    retryableAttempts: attempts.filter(attempt => attempt.status === 'RETRYABLE_ERROR').length,
    retryableReasons: copernicusRetryableReasonCounts(attempts), attemptCountsComplete: true };
  const input = cpWithPasses(value), before = structuredClone(input);
  const result = safeWeatherComponentSummary(input);
  for (const scope of allScopes(result)) {
    assert.deepEqual(scope.retryableReasonAccounting, accounting(24, 2, true));
    assert.equal(scope.attempts, 30);
    assert.equal(scope.retryableAttempts, 26);
    assert.equal(scope.attemptCountsComplete, true);
    assert.equal(scope.retryableReasons.CP_COMPONENT_SUBSET_TIMEOUT, 20);
    assert.equal(scope.retryableReasons.CP_COMPONENT_DATASET_UPDATING, 4);
  }
  assert.ok(!JSON.stringify(result).includes(privateCode));
  assert.deepEqual(input, before, 'accounting cannot alter supplier acquisition history');
});

test('each pass accounts its own reported totals without borrowing aggregate or sibling evidence', () => {
  const result = safeWeatherComponentSummary({ copernicus: {
    attempts: 30, retryableAttempts: 26, retryableReasons: { CP_COMPONENT_SUBSET_TIMEOUT: 24 },
    passes: {
      critical: { attempts: 10, retryableAttempts: 8, retryableReasons: { CP_COMPONENT_SUBSET_FAILED: 7 } },
      upgrade: { attempts: 20, retryableAttempts: 18, retryableReasons: { CP_COMPONENT_SUBSET_TIMEOUT: 17 } },
    },
  } });
  assert.deepEqual(result.copernicus.retryableReasonAccounting, accounting(24, 2, true));
  assert.deepEqual(result.copernicus.passes.critical.retryableReasonAccounting, accounting(7, 1, true));
  assert.deepEqual(result.copernicus.passes.upgrade.retryableReasonAccounting, accounting(17, 1, true));
});

test('missing, null and malformed reason maps remain unknown while an explicit empty map means zero known reasons', () => {
  for (const map of [null, undefined, [], 'private', 0, false]) {
    expectAllAccounting({ attempts: 3, retryableAttempts: 2, retryableReasons: map }, accounting(null, null, null));
  }
  expectAllAccounting({ attempts: 3, retryableAttempts: 2 }, accounting(null, null, null));
  expectAllAccounting({ attempts: 3, retryableAttempts: 2, retryableReasons: {} }, accounting(0, 2, true));
  expectAllAccounting({ attempts: 3, retryableAttempts: 2,
    retryableReasons: { CP_COMPONENT_SUBSET_TIMEOUT: 1 } }, accounting(1, 1, true));
});

test('known own invalid reason counts and accessors never become sparse zero evidence', () => {
  for (const value of [undefined, null, '2', -1, 1.5, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1, {}, [], true]) {
    expectAllAccounting({ attempts: 3, retryableAttempts: 2,
      retryableReasons: { CP_COMPONENT_SUBSET_TIMEOUT: value } }, accounting(null, null, null));
  }
  let invoked = 0;
  const reasons = { get CP_COMPONENT_SUBSET_TIMEOUT() { invoked++; throw Error('PRIVATE'); } };
  expectAllAccounting({ attempts: 3, retryableAttempts: 2, retryableReasons: reasons }, accounting(null, null, null));
  assert.equal(invoked, 0);
});

test('safe integer sums accept the maximum exactly and report overflow as unknown without approximation', () => {
  const maximum = Number.MAX_SAFE_INTEGER;
  expectAllAccounting({ attempts: maximum, retryableAttempts: maximum,
    retryableReasons: { CP_COMPONENT_SUBSET_TIMEOUT: maximum - 1, CP_COMPONENT_SUBSET_FAILED: 1 } }, accounting(maximum, 0, true));
  expectAllAccounting({ attempts: maximum, retryableAttempts: maximum,
    retryableReasons: { CP_COMPONENT_SUBSET_TIMEOUT: maximum, CP_COMPONENT_SUBSET_FAILED: 1 } }, accounting(null, null, null));
  expectAllAccounting({ attempts: maximum, retryableAttempts: maximum,
    retryableReasons: { CP_COMPONENT_SUBSET_TIMEOUT: 0 } }, accounting(0, maximum, true));
});

test('invalid or absent attempt totals do not turn missing information into a consistent total', () => {
  for (const value of [undefined, null, '2', -1, 1.5, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1, {}, [], true]) {
    expectAllAccounting({ attempts: value, retryableAttempts: 2,
      retryableReasons: { CP_COMPONENT_SUBSET_TIMEOUT: 1 } }, accounting(1, null, null));
    expectAllAccounting({ attempts: 3, retryableAttempts: value,
      retryableReasons: { CP_COMPONENT_SUBSET_TIMEOUT: 1 } }, accounting(1, null, null));
  }
  expectAllAccounting({ retryableReasons: {} }, accounting(0, null, null));
});

test('provable contradictions keep the independently known sum but never publish a negative remainder', () => {
  for (const [value, expected] of [
    [{ attempts: 30, retryableAttempts: 23, retryableReasons: { CP_COMPONENT_SUBSET_TIMEOUT: 24 } }, accounting(24, null, false)],
    [{ attempts: 25, retryableAttempts: 26, retryableReasons: { CP_COMPONENT_SUBSET_TIMEOUT: 24 } }, accounting(24, null, false)],
    [{ retryableAttempts: 23, retryableReasons: { CP_COMPONENT_SUBSET_TIMEOUT: 24 } }, accounting(24, null, false)],
    [{ attempts: 23, retryableReasons: { CP_COMPONENT_SUBSET_TIMEOUT: 24 } }, accounting(24, null, false)],
    [{ attempts: 23, retryableAttempts: 'invalid', retryableReasons: { CP_COMPONENT_SUBSET_TIMEOUT: 24 } }, accounting(24, null, false)],
    [{ attempts: 25, retryableAttempts: 26 }, accounting(null, null, false)],
    [{ attempts: 25, retryableAttempts: 26, retryableReasons: { CP_COMPONENT_SUBSET_TIMEOUT: null } }, accounting(null, null, false)],
  ]) expectAllAccounting(value, expected);
});

test('complete arithmetic on recovered zero counters does not claim the interrupted attempt history is complete', () => {
  for (const complete of [false, null, undefined, true]) {
    const result = safeWeatherComponentSummary(cpWithPasses({ attempts: 0, retryableAttempts: 0,
      retryableReasons: {}, attemptCountsComplete: complete }));
    for (const scope of allScopes(result)) {
      assert.deepEqual(scope.retryableReasonAccounting, accounting(0, 0, true));
      assert.equal(scope.attemptCountsComplete, complete ?? null);
    }
  }
});

test('inherited reason maps and totals are not evidence; inherited known keys do not execute', () => {
  let invoked = 0;
  const inheritedReasons = Object.create({ get CP_COMPONENT_SUBSET_TIMEOUT() { invoked++; return 99; } });
  expectAllAccounting({ attempts: 2, retryableAttempts: 1, retryableReasons: inheritedReasons }, accounting(0, 1, true));
  const inheritedCp = Object.create({ attempts: 2, retryableAttempts: 1,
    retryableReasons: { CP_COMPONENT_SUBSET_TIMEOUT: 1 } });
  // cpWithPasses deliberately copies own fields only. Exercise each original
  // record directly too, so inheritance isn't removed just by test setup.
  const result = safeWeatherComponentSummary({ copernicus: inheritedCp });
  assert.deepEqual(result.copernicus.retryableReasonAccounting, accounting(null, null, null));
  expectAllAccounting(inheritedCp, accounting(null, null, null));
  assert.equal(invoked, 0);
});

test('known total/map accessors are unknown and never invoked while independent contradiction is retained', () => {
  let invoked = 0;
  const value = { attempts: 1, retryableAttempts: 2,
    get retryableReasons() { invoked++; throw Error('PRIVATE'); } };
  const result = safeWeatherComponentSummary({ copernicus: value });
  assert.deepEqual(result.copernicus.retryableReasonAccounting, accounting(null, null, false));
  for (const key of ['attempts', 'retryableAttempts']) {
    const cp = { attempts: 3, retryableAttempts: 2, retryableReasons: { CP_COMPONENT_SUBSET_TIMEOUT: 1 } };
    Object.defineProperty(cp, key, { enumerable: true, get() { invoked++; throw Error('PRIVATE'); } });
    const projected = safeWeatherComponentSummary({ copernicus: cp });
    assert.deepEqual(projected.copernicus.retryableReasonAccounting, accounting(1, null, null));
  }
  assert.equal(invoked, 0);
});

test('accounting never enumerates unknown reason keys or reads private values and uses fixed descriptors once', () => {
  const secret = 'PRIVATE_DO_NOT_READ_OR_SERIALIZE';
  const known = new Set(Object.keys(safeWeatherComponentSummary({}).copernicus.retryableReasons));
  let unknownRead = 0, enumerations = 0;
  const descriptorCalls = new Map();
  const reasons = new Proxy({ CP_COMPONENT_SUBSET_TIMEOUT: 24,
    get [secret]() { unknownRead++; throw Error('PRIVATE'); } }, {
    ownKeys() { enumerations++; throw Error('Do not enumerate private reasons'); },
    get() { unknownRead++; throw Error('Use descriptors, never property getters'); },
    getOwnPropertyDescriptor(target, key) {
      assert.ok(known.has(key), 'only pre-existing fixed reason codes may be inspected');
      descriptorCalls.set(key, (descriptorCalls.get(key) ?? 0) + 1);
      return Object.getOwnPropertyDescriptor(target, key);
    },
  });
  const result = safeWeatherComponentSummary({ copernicus: {
    attempts: 30, retryableAttempts: 26, retryableReasons: reasons } });
  assert.deepEqual(result.copernicus.retryableReasonAccounting, accounting(24, 2, true));
  assert.equal(unknownRead, 0);
  assert.equal(enumerations, 0);
  assert.equal(descriptorCalls.size, known.size);
  assert.ok([...descriptorCalls.values()].every(count => count === 1), 'reason projection and accounting share the same observed descriptors');
  assert.ok(!JSON.stringify(result).includes(secret));
});

test('the real workflow logs only the shared projection and redacts malformed-input errors', async () => {
  const workflow = (await fs.readFile('.github/workflows/reusable-weather-build.yml', 'utf8'))
    .replace(/\r\n/g, '\n');
  const begin = workflow.indexOf('      - name: Report counts for each weather component after central cache\n');
  assert.ok(begin >= 0);
  const end = workflow.indexOf('\n      - ', begin + 1);
  const step = workflow.slice(begin, end);
  assert.match(step, /WEATHER_COMPONENT_SUMMARY_PATH="\$RUNNER_TEMP\/weather-component-summary-for-safe-log\.json"/);
  assert.match(step, /data\/live\/conditions\.json > "\$WEATHER_COMPONENT_SUMMARY_PATH"/);
  const block = step.match(/node --input-type=module <<'NODE'\n([\s\S]*?)\n          NODE/);
  assert.ok(block);
  const script = block[1].replace(/^ {10}/gm, '');
  assert.match(script, /safeWeatherComponentSummary\(summary\)/);
  assert.match(script, /stat\.size > 16 \* 1024 \* 1024/);
  assert.doesNotMatch(script, /readFile\([^\n]*conditions/);
  const temporary = await fs.mkdtemp(path.join(os.tmpdir(), 'rr-safe-component-summary-'));
  const file = path.join(temporary, 'summary.json');
  try {
    const secret = 'PRIVATE_TOKEN_ABCDEF';
    for (const [text, expectedStatus] of [[JSON.stringify({ before: { wind: { valid: 2 } },
      copernicus: { status: secret, attempts: 30, retryableAttempts: 26,
        retryableReasons: { CP_COMPONENT_SUBSET_TIMEOUT: 24, [secret]: 2 },
        passes: { critical: { attempts: 30, retryableAttempts: 26, retryableReasons: { CP_COMPONENT_SUBSET_TIMEOUT: 24 } },
          upgrade: { attempts: 30, retryableAttempts: 26, retryableReasons: { CP_COMPONENT_SUBSET_TIMEOUT: 24 } } } },
      failures: [secret], privatePayload: secret }), 0],
    [`{"privatePayload":"${secret}",`, 1]]) {
      await fs.writeFile(file, text);
      const result = spawnSync(process.execPath, ['--input-type=module'], {
        input: script, encoding: 'utf8', cwd: process.cwd(),
        env: { ...process.env, WEATHER_COMPONENT_SUMMARY_PATH: file },
      });
      assert.equal(result.error, undefined);
      assert.equal(result.status, expectedStatus);
      assert.ok(!`${result.stdout}${result.stderr}`.includes(secret));
      if (expectedStatus === 0) {
        assert.equal(JSON.parse(result.stdout).before.wind.valid, 2);
        for (const scope of allScopes(JSON.parse(result.stdout))) {
          assert.deepEqual(scope.retryableReasonAccounting, accounting(24, 2, true));
        }
        assert.equal(result.stderr, '');
      } else {
        assert.equal(result.stdout, '');
        assert.equal(result.stderr.trim(), 'WEATHER_COMPONENT_SAFE_SUMMARY_FAILED');
      }
    }
  } finally {
    assert.equal(path.dirname(temporary), path.resolve(os.tmpdir()));
    assert.ok(path.basename(temporary).startsWith('rr-safe-component-summary-'));
    await fs.rm(temporary, { recursive: true, force: true });
  }
});
