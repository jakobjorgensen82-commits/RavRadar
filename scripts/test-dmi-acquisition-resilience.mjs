import assert from 'node:assert/strict';
import {
  countDmiBackedZones,
  createPersistentDmiStore,
  prioritizeDmiFeatures,
  summarizeAvailableCoverage
} from './lib/dmi-acquisition-state.mjs';

const existing = {
  generatedAt: '2026-07-26T10:00:00Z',
  runtime: { nextZoneCursor: 2, rateLimitedUntil: '2026-07-26T11:00:00Z' },
  zones: { A: { marker: 'keep' }, B: { marker: 'keep' }, REMOVED: { marker: 'drop' } }
};
const next = createPersistentDmiStore(existing, ['A', 'B', 'C'], 120);
assert.deepEqual(Object.keys(next.zones).sort(), ['A', 'B']);
assert.equal(next.zones.A.marker, 'keep', 'eksisterende DMI-cache skal overleve en ny kørsel');
assert.equal(next.runtime.nextZoneCursor, 2, 'zonerotationen skal overleve mellem kørsler');
assert.equal(next.runtime.rateLimitedUntil, '2026-07-26T11:00:00Z', '429-cooldown skal overleve mellem kørsler');

const features = ['A', 'B', 'C', 'D'].map(id => ({ properties: { id } }));
const coverage = record => record ?? { available: false, remainingHours: 0 };
const store = { zones: {
  A: { available: false, remainingHours: 0 },
  B: { available: false, remainingHours: 0 },
  C: { available: false, remainingHours: 0 },
  D: { available: false, remainingHours: 0 }
} };
const first = prioritizeDmiFeatures(features, store, 'now', coverage, 0).prioritized.map(f => f.properties.id);
const rotated = prioritizeDmiFeatures(features, store, 'now', coverage, 2).prioritized.map(f => f.properties.id);
assert.deepEqual(first, ['A', 'B', 'C', 'D']);
assert.deepEqual(rotated, ['C', 'D', 'A', 'B'], 'næste kørsel må ikke starte ved de samme zoner');

const counts = countDmiBackedZones({ A: { provider: 'dmi' }, B: { provider: 'dmi-cache' }, C: { provider: 'open-meteo' } });
assert.deepEqual(counts, { live: 1, cached: 1, total: 2 }, 'gyldig DMI-cache skal tælle som DMI-dækning');

const summary = summarizeAvailableCoverage({
  A: { available: true, remainingHours: 12 },
  B: { available: false, remainingHours: -5 },
  C: { available: true, remainingHours: 30 }
}, 'now', record => record, value => value);
assert.deepEqual(summary, { zones: 2, minimumRemainingHours: 12, maximumRemainingHours: 30 }, 'udløbet cache må ikke forurene dækningsminimum');


const workflow = await import('node:fs/promises').then(({ readFile }) => readFile('.github/workflows/update-and-deploy.yml', 'utf8'));
for (const expected of ['DMI_LIVE_ZONE_BUDGET: 4', 'DMI_REQUEST_BUDGET: 6', 'DMI_REQUEST_GAP_MS: 12000', 'DMI_SCHEDULE_INTERVAL_MINUTES: 10', 'DMI_OBSERVATION_INTERVAL_MINUTES: 60']) {
  assert.ok(workflow.includes(expected), `workflow mangler ${expected}`);
}
const updater = await import('node:fs/promises').then(({ readFile }) => readFile('scripts/update-weather.mjs', 'utf8'));
for (const expected of ['stoppedByHttp429', 'attemptedZoneIds', 'successfulZoneIds', 'observationAcquisition', 'optimisticMinutesToFullCache']) {
  assert.ok(updater.includes(expected), `DMI-diagnostikken mangler ${expected}`);
}
assert.ok(updater.includes("dmiObservationSkipReason = 'skipped-after-http-429'"), 'oceanObs skal springes over efter HTTP 429 i den aktuelle kørsel');
assert.ok(!updater.includes("skipped-during-persisted-cooldown"), 'forecast-cooldown må ikke automatisk blokere oceanObs i en senere kørsel');

console.log('DMI acquisition resilience bestået.');

assert.ok(updater.includes('bulk-stac-grib-first-with-sequential-edr-repair'), 'DMI skal bruge bulk-STAC først og sekventiel EDR-reparation bagefter');
assert.ok(updater.includes('mergeDmiWithFallback'), 'Open-Meteo skal udfylde manglende DMI-komponenter');
assert.ok(updater.includes('marineCacheCompleteAtStart'), 'vind og bølger må først beriges efter fuld marin cache');
