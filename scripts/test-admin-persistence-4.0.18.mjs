import assert from 'node:assert/strict';
import fs from 'node:fs';

const admin = fs.readFileSync(new URL('../js/ui/admin-dashboard.js', import.meta.url), 'utf8');
const store = fs.readFileSync(new URL('../js/services/admin-document-store.js', import.meta.url), 'utf8');
const update = fs.readFileSync(new URL('./update-weather.mjs', import.meta.url), 'utf8');
const hydrate = fs.readFileSync(new URL('./hydrate-deployed-weather.py', import.meta.url), 'utf8');

assert.match(admin, /queueAdminDocumentSave\('water-level-station-routing'/);
assert.match(admin, /queueAdminDocumentSave\('direction-reviews'/);
assert.doesNotMatch(
  admin,
  /queueAdminDocumentSave\('rules'/,
  'Det pensionerede Regelværksted må ikke længere have en aktiv central gemmevej',
);
assert.match(store, /admin_documents/);
assert.match(store, /localStorage/);

// Stationsregisteret går nu gennem den persistente livscyklus, før det bruges.
assert.match(update, /const rawStationRegistry\s*=\s*await dmiWaterStations\(\)\.catch\(\(\)\s*=>\s*readCachedWaterStations\(\)\)/);
assert.match(update, /const forecastAwareRegistry\s*=\s*applyWaterSourceForecastStatus\(rawStationRegistry,/);
assert.match(update, /let stationLifecycle\s*=\s*await updateStationObservationLifecycle\(forecastAwareRegistry,/);
assert.match(update, /let stationRegistry\s*=\s*stationLifecycle\.stations/);
assert.match(update, /const routingAlerts\s*=\s*buildEffectiveRoutingCacheAlerts\(\{ document: stationLifecycle\.document, features, routing: activeWaterRouting, audit: stationRoutingAudit, output,/);
assert.match(update, /stationLifecycle\s*=\s*\{ \.\.\.stationLifecycle, document: routingAlerts\.document,/);
assert.match(update, /stationRegistry\s*=\s*stationLifecycle\.stations/);
assert.match(update, /output\.dataQuality\.stationLifecycle\s*=\s*stationLifecycle\.document\.summary/);
assert.match(update, /output\.dataQuality\.stationNotifications\s*=\s*stationLifecycle\.notifications/);

assert.match(hydrate, /dmi-water-stations\.json/);
assert.match(update, /const horizons=\[6,24,48,ACCEPTED_FORECAST_HOURS\]/);
console.log('OK: central adminlagring uden Regelværksted, stationslivscyklus, stationsregister-cache og udvidet diagnostik er koblet sammen.');
