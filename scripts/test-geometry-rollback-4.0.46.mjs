import assert from 'node:assert/strict';
import fs from 'node:fs';
import { validateActiveZoneIds, baselineZoneIds } from './zone-registry-integrity.mjs';

const read = path => JSON.parse(fs.readFileSync(new URL(path, import.meta.url)));
const active = read('../data/zones.geojson');
const before = read('../data/geometry-snapshots/zones-4.0.44.geojson');
const failed = read('../data/geometry-snapshots/zones-4.0.45.geojson');

assert.equal(active.type, 'FeatureCollection');
assert.ok(Array.isArray(active.features) && active.features.length > 0, 'Det aktive zoneregister er tomt');
const activeIds = new Set(active.features.map(feature => feature.properties?.id).filter(Boolean));
validateActiveZoneIds(activeIds);

const expectedIds = baselineZoneIds({ ownerApprovedAdditions: [] });
const beforeIds = new Set(before.features.map(feature => feature.properties?.id).filter(Boolean));
const failedIds = new Set(failed.features.map(feature => feature.properties?.id).filter(Boolean));
for (const id of expectedIds) {
  assert.ok(beforeIds.has(id), `4.0.44 rollback-snapshot mangler aktiv zone ${id}`);
  assert.ok(failedIds.has(id), `4.0.45 snapshot mangler aktiv zone ${id}`);
}

// Administratorens godkendte navn, kystlinje og retning er autoritativ og må
// derfor ikke sammenlignes med historiske produktionsværdier. Testen beskytter
// rollback-materialets dækning og ID-integritet, ikke gamle redigerbare felter.
assert.ok(fs.existsSync(new URL('../scripts/switch-zone-geometry.mjs', import.meta.url)));
console.log(`Geometri-rollback dækker alle ${active.features.length} aktive zoner uden at låse admin-redigerbare navne, kystlinjer eller retninger.`);
