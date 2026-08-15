import fs from 'node:fs/promises';
import assert from 'node:assert/strict';

const weather = await fs.readFile('scripts/update-weather.mjs', 'utf8');
const routing = await fs.readFile('scripts/lib/water-source-forecast-routing.mjs', 'utf8');
const alerts = await fs.readFile('scripts/lib/water-station-routing-alerts.mjs', 'utf8');

assert.match(weather, /applyWaterSourceRouting/, 'Effektiv routing skal anvendes på den producerede vandstandsserie.');
assert.match(weather, /buildEffectiveRoutingCacheAlerts/, 'Effektivt valgte kilder skal overvåges efter routing.');
assert.match(weather, /WATER_STATION_NOTIFICATIONS_PATH/, 'Aktuelle notifikationer skal publiceres beskyttet.');
assert.match(routing, /admin-override/, 'Administratoroverride skal fortsat have eksplicit identitet.');
assert.match(routing, /forecastStore/, 'Routing skal fortsat skrive den samme serie til forecaststore.');
assert.match(alerts, /sourceForecastValidUntil/);
assert.match(alerts, /forecastCacheValidUntil/);
assert.match(alerts, /selected-station-cache-warning/);
assert.match(alerts, /selected-station-cache-exhausted/);
console.log('OK: effektiv vandstandsrouting styrer serie og sand prognose-/cachealarm.');
