import assert from 'node:assert/strict';
import { classifyLocalWeatherSnapshot, formatCoverageFailure } from './local-weather-snapshot-status.mjs';

const nowMs = Date.parse('2026-08-15T12:00:00Z');
const activeZoneIds = ['DK-B04-12', 'DK-B04-13', 'DK-B04-14'];

const stale = classifyLocalWeatherSnapshot({
  activeZoneIds,
  nowMs,
  conditions: {
    datasetId: 'old-209',
    generatedAt: '2026-07-31T15:52:17.621Z',
    zones: { 'DK-B04-12': {} }
  },
  manifest: {
    datasetId: 'old-209',
    validUntil: '2026-08-05T12:00:00Z'
  }
});
assert.equal(stale.status, 'stale-coverage-mismatch');
assert.deepEqual(stale.missingZoneIds, ['DK-B04-13', 'DK-B04-14']);
assert.match(formatCoverageFailure(stale), /FORÆLDET LOKALT VEJRSNAPSHOT/);
assert.match(formatCoverageFailure(stale), /ikke i sig selv dokumentation for defekte zoner/);
assert.match(formatCoverageFailure(stale), /npm run audit:deployed-zone-weather/);

const currentMissing = classifyLocalWeatherSnapshot({
  activeZoneIds,
  nowMs,
  conditions: {
    datasetId: 'fresh-210',
    generatedAt: '2026-08-15T11:00:00Z',
    zones: { 'DK-B04-12': {}, 'DK-B04-13': {} }
  },
  manifest: {
    datasetId: 'fresh-210',
    validUntil: '2026-08-20T12:00:00Z'
  }
});
assert.equal(currentMissing.status, 'current-coverage-mismatch');
assert.doesNotMatch(formatCoverageFailure(currentMissing), /FORÆLDET/);
assert.match(formatCoverageFailure(currentMissing), /1 mangler/);

const mismatch = classifyLocalWeatherSnapshot({
  activeZoneIds,
  nowMs,
  conditions: { datasetId: 'conditions-a', generatedAt: '2026-08-15T11:00:00Z', zones: {} },
  manifest: { datasetId: 'manifest-b', validUntil: '2026-08-20T12:00:00Z' }
});
assert.equal(mismatch.status, 'dataset-mismatch');
assert.match(formatCoverageFailure(mismatch), /ikke samme dataset/);

console.log('OK: lokal stale vejrsnapshot-diagnose skelner forældet udviklerdata fra aktuelle zonefejl.');
