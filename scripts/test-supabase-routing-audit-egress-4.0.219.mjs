import assert from 'node:assert/strict';
import fs from 'node:fs';

const hydrate=fs.readFileSync('scripts/sync-admin-config.py','utf8');
const publish=fs.readFileSync('scripts/sync-protected-admin-assets.mjs','utf8');
const weather=fs.readFileSync('scripts/update-weather.mjs','utf8');
const admin=fs.readFileSync('js/ui/admin-dashboard.js','utf8');

assert.doesNotMatch(hydrate,/"water-station-routing-audit"\s*:/,'Routingaudit må ikke hydreres som runtimekonfiguration.');
assert.match(hydrate,/"dmi-water-stations"\s*:/,'Det centrale stationsregister skal fortsat hydreres.');
assert.match(publish,/'water-station-routing-audit'\s*:/,'Den friske routingaudit skal fortsat publiceres beskyttet.');
assert.match(weather,/WATER_STATION_ROUTING_AUDIT_PATH/,'Vejrbygningen skal fortsat generere routingauditten.');
assert.match(admin,/loadAdminDocument\('water-station-routing-audit'/,'Admin skal fortsat læse den centrale routingaudit.');

console.log('OK: routingaudit genbygges og vises centralt uden overflødig 15-minutters readback; stationsregisteret bevares.');
