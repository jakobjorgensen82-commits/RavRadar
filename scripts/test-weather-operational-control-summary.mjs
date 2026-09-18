#!/usr/bin/env node
import assert from 'node:assert/strict';
import { buildWeatherOperationalControlSummary }
  from './weather-operational-control-summary.mjs';

const input = {
  sourceHead: 'a'.repeat(40),
  runId: '35320738621',
  runAttempt: '1',
};

const degraded = buildWeatherOperationalControlSummary({
  ...input,
  checks: [
    'runtime-audit|diagnostic|failure',
    'full-validation|diagnostic|failure',
    'release-gate|diagnostic|success',
    'protected-admin-sync|operation|failure',
    'pages-privacy|safety|success',
  ],
});
assert.equal(degraded.status, 'DEGRADED');
assert.equal(degraded.deploymentDisposition, 'CONTINUE_WITH_VALID_WEATHER');
assert.equal(degraded.diagnosticFailureCount, 2);
assert.equal(degraded.operationFailureCount, 1);
assert.equal(degraded.safetyFailureCount, 0);
assert.deepEqual(degraded.failureIds, [
  'runtime-audit',
  'full-validation',
  'protected-admin-sync',
]);
assert.equal(degraded.privatePayloadIncluded, false);

const unsafe = buildWeatherOperationalControlSummary({
  ...input,
  checks: [
    'runtime-audit|diagnostic|success',
    'pages-privacy|safety|failure',
  ],
});
assert.equal(unsafe.deploymentDisposition, 'BLOCK_UNSAFE_ARTIFACT');
assert.equal(unsafe.safetyFailureCount, 1);

assert.throws(() => buildWeatherOperationalControlSummary({
  ...input,
  checks: [
    'runtime-audit|diagnostic|success',
    'runtime-audit|diagnostic|failure',
  ],
}), /duplicate/);
assert.throws(() => buildWeatherOperationalControlSummary({
  ...input,
  checks: ['bad|unknown|failure'],
}), /id\|kind\|outcome/);

console.log('Weather operational control summary tests: passed');
