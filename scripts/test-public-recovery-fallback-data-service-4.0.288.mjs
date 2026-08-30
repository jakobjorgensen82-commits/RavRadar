import assert from 'node:assert/strict';

const realNow = Date.now;
const realWarn = console.warn;
const nowMs = Date.parse('2026-08-27T10:00:00.000Z');
Date.now = () => nowMs;
const warnings = [];
console.warn = (...parts) => warnings.push(parts.map(String).join(' '));
const requests = [];
const documents = new Map();
globalThis.fetch = async (url, options = {}) => {
  const key = String(url);
  requests.push({ url:key, cache:options.cache || 'default' });
  if (!documents.has(key)) return { ok: false, status: 404, json: async () => ({}) };
  return { ok: true, status: 200, json: async () => structuredClone(documents.get(key)) };
};

const service = await import('../js/services/data-service.js?candidate-g-public-recovery-fallback-4.0.288');
const fallbackDatasetId = 'rr-last-ready-210';
const primaryDatasetId = 'rr-primary-warmup-210';
const fallbackConditionsSha = 'a'.repeat(64);
const fallbackDetailsSha = 'b'.repeat(64);
const primaryConditionsSha = 'c'.repeat(64);
const verifiedOnlyTrust = {
  schemaVersion: 1,
  status: 'VERIFIED_ONLY',
  incidentId: null,
  calibrationEligible: true,
  hardObservedOuttransportEligible: true,
  affectedPartCount: 0,
  syntheticSampleCount: 0,
  activeUntil: null,
};
const fallbackConditionsUrl = `./data/live/candidate-g-last-verified-public-conditions.json?dataset=${fallbackDatasetId}&sha=${fallbackConditionsSha}`;
const fallbackDetailsUrl = `./data/live/candidate-g-last-verified-public-condition-details.json?dataset=${fallbackDatasetId}&sha=${fallbackDetailsSha}`;
const primaryConditionsUrl = `./data/live/public-conditions.json?dataset=${primaryDatasetId}&sha=${primaryConditionsSha}`;
const manifest = {
  datasetId: primaryDatasetId,
  generatedAt: '2026-08-27T09:55:50.000Z',
  conditionsPath: './public-conditions.json',
  conditionDetailsPath: './public-condition-details.json',
  publicConditionsSha256: primaryConditionsSha,
  recoveryFallback: {
    status: 'active-last-verified',
    datasetId: fallbackDatasetId,
    generatedAt: '2026-08-27T01:34:48.669Z',
    validUntil: '2026-08-30T00:00:00.000Z',
    maximumAgeHours: 72,
    conditionsPath: './candidate-g-last-verified-public-conditions.json',
    conditionDetailsPath: './candidate-g-last-verified-public-condition-details.json',
    publicConditionsSha256: fallbackConditionsSha,
    publicConditionDetailsSha256: fallbackDetailsSha,
  },
};
documents.set(fallbackConditionsUrl, {
  datasetId: fallbackDatasetId,
  generatedAt: manifest.recoveryFallback.generatedAt,
  ravScoreEvidenceTrust: verifiedOnlyTrust,
  zones: { zone: { forecast: { hourly: [] } } },
});
documents.set(fallbackDetailsUrl, {
  datasetId: fallbackDatasetId,
  generatedAt: manifest.recoveryFallback.generatedAt,
  ravScoreEvidenceTrust: verifiedOnlyTrust,
  zones: { zone: { forecast: { hourly: [{ time: '2026-08-27T10:00:00.000Z' }] } } },
  coastalParts: { evidenceTrust: verifiedOnlyTrust, parts: {}, zones: {} },
});
documents.set(primaryConditionsUrl, {
  datasetId: primaryDatasetId,
  generatedAt: manifest.generatedAt,
  zones: { primary: {} },
});

const fallback = await service.loadConditions({ manifest });
assert.equal(fallback.available, true);
assert.equal(fallback.recoveryFallbackActive, true);
assert.equal(fallback.datasetId, fallbackDatasetId);
assert.equal(fallback.latestDatasetId, primaryDatasetId);
const details = await service.loadConditionDetails({ manifest, conditions: fallback });
const merged = service.mergeConditionDetails(fallback, details);
assert.equal(merged.datasetId, fallbackDatasetId);
assert.equal(merged.detailsAvailable, true);
assert.equal(merged.zones.zone.forecast.hourly.length, 1);
assert.deepEqual(requests.slice(0, 2), [
  {url:fallbackConditionsUrl,cache:'force-cache'},
  {url:fallbackDetailsUrl,cache:'force-cache'},
]);

service.clearDataMemoryCache();
documents.set(fallbackConditionsUrl, {
  datasetId: fallbackDatasetId,
  generatedAt: '2026-08-23T00:00:00.000Z',
  zones: { stale: {} },
});
manifest.recoveryFallback.generatedAt = '2026-08-23T00:00:00.000Z';
const primaryAfterExpiry = await service.loadConditions({ manifest });
assert.equal(primaryAfterExpiry.datasetId, primaryDatasetId);
assert.equal(primaryAfterExpiry.recoveryFallbackActive, undefined);
assert.equal(primaryAfterExpiry.available, true);
assert.equal(warnings.length, 1);
assert.match(warnings[0], /udløbet/);

service.clearDataMemoryCache();
documents.set(fallbackConditionsUrl, {
  datasetId: fallbackDatasetId,
  generatedAt: '2026-08-27T09:00:00.000Z',
  zones: { forecastExpired: {} },
});
manifest.recoveryFallback.generatedAt = '2026-08-27T09:00:00.000Z';
manifest.recoveryFallback.validUntil = '2026-08-27T09:59:59.000Z';
const primaryAfterForecastExpiry = await service.loadConditions({ manifest });
assert.equal(primaryAfterForecastExpiry.datasetId, primaryDatasetId);
assert.equal(primaryAfterForecastExpiry.recoveryFallbackActive, undefined);
assert.equal(warnings.length, 2);
assert.match(warnings[1], /prognosehorisont/);

Date.now = realNow;
console.warn = realWarn;
console.log('Public data-service Candidate G recovery fallback: OK');
