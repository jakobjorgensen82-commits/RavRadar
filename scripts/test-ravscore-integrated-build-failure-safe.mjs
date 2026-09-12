import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { buildSafeIntegratedBuildFailureReport } from './report-ravscore-integrated-build-failure-safe.mjs';

const at = '2026-09-12T08:00:00.000Z';
const unavailable = (partId, code) => ({
  available: false,
  unavailableParts: [{
    partId,
    code,
    currentUMps: 123.456,
    reason: 'PRIVATE_SENTINEL',
  }],
  unavailability: { code: 'INTEGRATED_RAVSCORE_LOCAL_DATA_INCOMPLETE' },
});
const full = {
  productionReferenceAt: at,
  zones: {
    'DK-A': { coordinates: [10, 56], privateSentinel: 'PRIVATE_SENTINEL' },
    'DK-B': {},
  },
  coastalParts: {
    expectedPartCount: 3,
    scoredPartCount: 3,
    parts: {
      'DK-A-P1': {},
      'DK-B-P1': {
        ravScoreModel: {
          currentMemoryStatus: 'LATEST_SAMPLE_MISSING',
          currentTransition: 'UNVERIFIED_MISSING',
          privateSentinel: 'PRIVATE_SENTINEL',
        },
      },
      'DK-B-P2': {
        ravScoreModel: {
          currentMemoryStatus: 'WINDOW_INCOMPLETE',
          currentTransition: 'VERIFIED_REPLAY',
        },
      },
    },
    zones: {
      'DK-A': { hourly: [{ time: at, waders: { available: true }, beach: { available: true } }] },
      'DK-B': {
        hourly: [{
          time: at,
          waders: unavailable('DK-B-P1', 'CURRENT_DIRECT_INPUT_NOT_READY'),
          beach: unavailable('DK-B-P2', 'WAVE_PHYSICAL_INPUT_NOT_READY'),
        }],
      },
    },
    scoreAvailability: {
      allZonesActive: false,
      evaluatedAt: at,
      unavailableZones: [{ zoneId: 'DK-B', modes: ['waders', 'beach'] }],
    },
  },
};

const report = buildSafeIntegratedBuildFailureReport(full);
assert.equal(report.kind, 'RAVSCORE_INTEGRATED_BUILD_FAILURE_SAFE');
assert.equal(report.privacyClass, 'PUBLIC_IDENTIFIERS_AND_AGGREGATE_COUNTS_ONLY');
assert.deepEqual(report.coverage, {
  weatherZoneCount: 2,
  scoreZoneCount: 2,
  partCount: 3,
  expectedPartCount: 3,
  scoredPartCount: 3,
  allZonesActive: false,
  unavailableZoneCount: 1,
  missingWeatherZoneCount: 0,
  missingScoreZoneCount: 0,
  missingWeatherZoneIds: [],
  missingScoreZoneIds: [],
});
assert.deepEqual(report.failures.codeCounts, [
  { code: 'CURRENT_DIRECT_INPUT_NOT_READY', count: 1 },
  { code: 'WAVE_PHYSICAL_INPUT_NOT_READY', count: 1 },
]);
assert.deepEqual(report.failures.zones, [{
  zoneId: 'DK-B',
  modes: ['beach', 'waders'],
  partFailureCount: 2,
  partFailures: [
    {
      partId: 'DK-B-P1',
      codes: ['CURRENT_DIRECT_INPUT_NOT_READY'],
      currentMemoryStatus: 'LATEST_SAMPLE_MISSING',
      currentTransition: 'UNVERIFIED_MISSING',
    },
    {
      partId: 'DK-B-P2',
      codes: ['WAVE_PHYSICAL_INPUT_NOT_READY'],
      currentMemoryStatus: 'WINDOW_INCOMPLETE',
      currentTransition: 'VERIFIED_REPLAY',
    },
  ],
}]);
const serialized = JSON.stringify(report);
for (const forbidden of ['PRIVATE_SENTINEL', '123.456', 'coordinates', 'currentUMps']) {
  assert.doesNotMatch(serialized, new RegExp(forbidden));
}

const tooManyZones = {
  zones: Object.fromEntries(Array.from({ length: 211 }, (_, index) => [`Z${index}`, {}])),
  coastalParts: {},
};
assert.throws(
  () => buildSafeIntegratedBuildFailureReport(tooManyZones),
  /exceeds its public identifier bounds/,
);
const unknownPart = structuredClone(full);
unknownPart.coastalParts.zones['DK-B'].hourly[0].waders.unavailableParts[0].partId = 'UNKNOWN-PART';
assert.throws(
  () => buildSafeIntegratedBuildFailureReport(unknownPart),
  /absent from the score package/,
);
const malformed = structuredClone(full);
malformed.productionReferenceAt = 'PRIVATE_SENTINEL';
malformed.coastalParts.scoreAvailability.evaluatedAt = 'PRIVATE_SENTINEL';
const timeSanitized = buildSafeIntegratedBuildFailureReport(malformed);
assert.equal(timeSanitized.productionReferenceAt, null);
assert.equal(timeSanitized.evaluatedAt, null);
assert.doesNotMatch(JSON.stringify(timeSanitized), /PRIVATE_SENTINEL/);

const temporaryRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'ravradar-safe-build-failure-'));
try {
  const input = path.join(temporaryRoot, 'conditions.json');
  const output = path.join(temporaryRoot, 'safe.json');
  await fs.writeFile(input, JSON.stringify(full));
  const { spawnSync } = await import('node:child_process');
  const child = spawnSync(process.execPath, [
    'scripts/report-ravscore-integrated-build-failure-safe.mjs',
    '--input', input,
    '--output', output,
  ], { encoding: 'utf8' });
  assert.equal(child.status, 0, child.stderr);
  assert.deepEqual(JSON.parse(await fs.readFile(output, 'utf8')), report);
} finally {
  await fs.rm(temporaryRoot, { recursive: true, force: true });
}

console.log('OK: failed integrated builds emit only bounded public ids, counts and reason codes.');
