import assert from 'node:assert/strict';
import fs from 'node:fs';

const admin=fs.readFileSync('js/ui/admin-dashboard.js','utf8');
const weather=fs.readFileSync('scripts/update-weather.mjs','utf8');
const css=fs.readFileSync('admin.css','utf8');

assert.match(admin,/Observationsstatus ikke dokumenteret/);
assert.match(admin,/Cachestatus ikke dokumenteret/);
assert.match(admin,/Anvendelighed ikke dokumenteret/);
assert.match(admin,/station\?\.hasEverDelivered===false/);
assert.match(admin,/stationRegistryState/);
assert.match(admin,/retired-station/);
assert.match(admin,/inverseDistancePreview/);
assert.match(admin,/afstandsvægt \$\{\(row\.weight\*100\)\.toFixed\(1\)\} %/);
assert.match(admin,/normalizedSelectedStations/);
assert.match(css,/\.dot\.retired-station/);

// Produktionskæden er bevidst uændret: aktiv override bruger de valgte stationer,
// og inverse afstandsvægte beregnes af runtime ud fra zonens datapunkt.
assert.match(weather,/function manualStationInterpolation/);
assert.match(weather,/if \(!route\?\.enabled \|\| !requested\.length\) return null/);
assert.match(weather,/const inverse = selected\.map\(item => 1 \/ Math\.max\(0\.25, item\.distanceKm\)\)/);
assert.match(weather,/method: selected\.length === 1 \? 'admin-selected-station' : 'admin-selected-interpolation'/);
assert.match(weather,/const explicit = manualStationInterpolation/);
assert.match(weather,/if \(explicit\) return explicit/);
console.log('OK: adminoverride er sandfærdigt vist, afstandsvægtet og koblet til den eksisterende produktionskæde.');
