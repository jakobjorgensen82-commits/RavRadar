import fs from 'node:fs/promises';
import assert from 'node:assert/strict';

const weather = await fs.readFile('scripts/update-weather.mjs','utf8');
const forecast = await fs.readFile('scripts/lib/dmi-forecast-store.mjs','utf8');
const admin = await fs.readFile('js/ui/admin-dashboard.js','utf8');
const panel = await fs.readFile('js/ui/info-panel.js','utf8');
const app = await fs.readFile('app.js','utf8');
const publicProjection = await fs.readFile('scripts/public-conditions-lib.mjs','utf8');

assert.match(weather, /return automaticStationInterpolation\(feature, point, stations, levels\)/, 'Produktion skal bruge samme automatiske topologiske stationsvalg som admin.');
assert.match(weather, /routingMode: 'admin-override'/, 'Administratoroverride skal være eksplicit i produktionsdata.');
assert.match(weather, /waterLevelSource: 'dmi-model-station-routed-bias'/, 'Forecasttimer skal dokumentere stationsroutingen.');
assert.match(weather, /waterLevelStationIds/, 'Forecasttimer skal indeholde de faktisk anvendte stationer.');
assert.match(weather, /applyEffectiveRoutingCacheAlerts/, 'Valgte aktive stationer skal overvåges for cacheudløb.');
assert.match(weather, /selected-station-cache-warning/);
assert.match(weather, /selected-station-cache-exhausted/);
assert.match(weather, /cacheWarningHours/);
assert.match(forecast, /sea \* 100 \+ waterLevelBiasCm/, 'Den timevise vandstandstabel skal bruge stationskorrigeret modelvandstand.');
assert.match(admin, /stationCacheWarningHours/, 'Alarmgrænsen skal kunne ændres i admin.');
assert.match(admin, /Alarmer for valgte stationer/);
assert.match(panel, /Administratorvalg/);
assert.match(panel, /Automatisk stationsvalg/);
assert.match(panel, /DMI-modelprognosen er korrigeret med disse stationer/);
assert.match(app, /waterLevel:condition\.waterLevel\|\|null/);
assert.match(publicProjection, /waterLevel:zone\?\.waterLevel\?\.routing/);
assert.match(publicProjection, /stationIds:\(zone\.waterLevel\.routing\.stationIds/);
console.log('OK: effektiv stationsrouting styrer prognose, vandstandstabel, proveniens og cachealarmer.');
