import assert from 'node:assert/strict';
import fs from 'node:fs';
const read = p => JSON.parse(fs.readFileSync(new URL(p, import.meta.url)));
const active = read('../data/zones.geojson');
const before = read('../data/geometry-snapshots/zones-4.0.44.geojson');
const failed = read('../data/geometry-snapshots/zones-4.0.45.geojson');
assert.equal(active.features.length, before.features.length);
assert.equal(active.features.length, failed.features.length);
const activeIds = new Set(active.features.map(f => f.properties.id));
const beforeIds = new Set(before.features.map(f => f.properties.id));
const failedIds = new Set(failed.features.map(f => f.properties.id));
assert.deepEqual(activeIds, beforeIds, '4.0.44 rollback-snapshot mangler zone-IDer');
assert.deepEqual(activeIds, failedIds, '4.0.45 snapshot mangler zone-IDer');
const production = active.features.some(f => f.properties.coastLineVersion === '4.0.47');
if (!production) {
  const baseline = new Map(before.features.map(f => [f.properties.id, f.properties.coastLine]));
  for (const f of active.features) {
    assert.deepEqual(f.properties.coastLine, baseline.get(f.properties.id), `${f.properties.id}: sikker baseline matcher ikke 4.0.44`);
    assert.equal(f.properties.coastLineVersion, '4.0.46-safe-rollback');
  }
}
assert.ok(fs.existsSync(new URL('../scripts/switch-zone-geometry.mjs', import.meta.url)));
console.log(`Geometri-rollback er bevaret for ${active.features.length} zoner${production ? ' ved siden af produktionsgeometrien' : ' som aktiv sikker baseline'}.`);
