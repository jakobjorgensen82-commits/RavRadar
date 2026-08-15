import assert from 'node:assert/strict';
import { buildEffectiveRoutingCacheAlerts } from './lib/water-station-routing-alerts.mjs';

const generatedAt = '2026-08-15T12:00:00Z';
const features = [{ properties: { id: 'Z' } }];
const audit = { zones: { Z: { stations: [{ stationId: 'A' }] } } };
const station = overrides => ({ stationId: 'A', name: 'A', registryStatus: 'active-forecast-point', deliveryStatus: 'not-delivering', ...overrides });
const run = (source, warning = 12) => buildEffectiveRoutingCacheAlerts({
  document: { stations: [source], notifications: [], summary: {} }, features,
  routing: { alertSettings: { cacheWarningHours: warning }, zones: {} }, audit, generatedAt
});

assert.equal(run(station({ sourceForecastValidUntil: '2026-08-20T12:00:00Z', routingCacheAlertLevel: 'critical' })).document.stations[0].routingCacheAlertLevel, null, 'gyldig forecast skal rydde stale critical');
assert.equal(run(station({ forecastCacheValidUntil: '2026-08-15T18:00:00Z' })).document.stations[0].routingCacheAlertLevel, 'warning');
assert.equal(run(station({ forecastCacheValidUntil: '2026-08-15T11:00:00Z' })).document.stations[0].routingCacheAlertLevel, 'critical');
assert.equal(run(station({ deliveryStatus: 'delivering' })).document.stations[0].routingCacheAlertLevel, null, 'leverende observation må ikke cachealarmeres');
assert.equal(run(station({ registryStatus: 'historical' })).document.stations[0].routingCacheAlertLevel, null, 'historisk kilde må ikke alarmere');
assert.equal(run(station({ forecastCacheValidUntil: '2026-08-15T18:00:00Z' }), 4).document.stations[0].routingCacheAlertLevel, null, 'admin-tærsklen skal anvendes');
console.log('OK: Effektiv vandstandsrouting alarmerer kun ved reel prognose-/cacheudløbsrisiko.');
