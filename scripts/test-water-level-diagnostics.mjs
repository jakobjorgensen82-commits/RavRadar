import assert from 'node:assert/strict';
import fs from 'node:fs/promises';

const updater = await fs.readFile('scripts/update-weather.mjs', 'utf8');
const admin = await fs.readFile('js/ui/admin-dashboard.js', 'utf8');
assert.match(updater, /DMI_LIVE_ZONE_BUDGET/, 'Natlig DMI-hentekvote mangler');
assert.match(updater, /cache-first/, 'Gyldig DMI-cache skal bruges før nye live-kald');
assert.match(updater, /targetFeatures/, 'Manglende og udløbende zoner skal prioriteres');
assert.match(updater, /waterLevelDiagnostic/, 'Vandstandsdiagnostik pr. zone mangler');
assert.match(admin, /publicWaterLevelOverview/, 'Diagnoseeksport skal bevare det dataminimerede offentlige vandstandsoverblik');
assert.match(admin, /protectedRuntimeSummary/, 'Beskyttet driftsstatus skal holdes adskilt fra den offentlige startpakke');
assert.doesNotMatch(admin, /getJson\('\.\/data\/live\/conditions\.json/, 'Admin må ikke hente den fulde private runtime fra Pages');
assert.match(admin, /Stationsestimat/, 'Administratorvisningen skal sammenligne model og stationer');
console.log('Udvidet DMI- og vandstandsdiagnostik bestået.');
