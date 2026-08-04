import fs from 'node:fs/promises';
import assert from 'node:assert/strict';

const admin = await fs.readFile('js/ui/admin-dashboard.js', 'utf8');
const weather = await fs.readFile('scripts/update-weather.mjs', 'utf8');

assert.match(admin, /Ingen stationsbaseret cache/);
assert.match(admin, /DMI's zonebaserede modelprognosecache/);
assert.match(admin, /Ingen brugbar stationsværdi nu/);
assert.match(admin, /stationOverrideStatusWarning/);
assert.match(admin, /Valget gemmes, men bruges kun i en vejrkørsel, hvor stationen faktisk har en brugbar værdi/);
assert.match(admin, /Administratorens valg erstatter automatikken, når de valgte leveringskrav er opfyldt/);
assert.match(weather, /if \(!route\?\.enabled \|\| !requested\.length\) return null/);
assert.match(weather, /if \(route\.requireAll !== false && selected\.length !== requested\.length\) return null/);
assert.match(weather, /const explicit = manualStationInterpolation/);
assert.match(weather, /if \(explicit\) return \{ \.\.\.explicit, routingMode: 'admin-override' \}/);
assert.ok(!/Ingen prognosecache/.test(admin), 'Admin må ikke forveksle stationscache med zonebaseret DMI-modelcache.');
console.log('OK: admin skelner stationsbaseret override-cache fra zonebaseret DMI-modelcache og forklarer fallback sandfærdigt.');
