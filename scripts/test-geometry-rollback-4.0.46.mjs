import assert from 'node:assert/strict';
import fs from 'node:fs';
const read = p => JSON.parse(fs.readFileSync(new URL(p, import.meta.url)));
const active = read('../data/zones.geojson');
const before = read('../data/geometry-snapshots/zones-4.0.44.geojson');
const failed = read('../data/geometry-snapshots/zones-4.0.45.geojson');
assert.equal(active.features.length, before.features.length);
assert.equal(active.features.length, failed.features.length);
const b = new Map(before.features.map(f => [f.properties.id, f.properties.coastLine]));
let matched = 0;
for (const f of active.features) {
  if (!b.has(f.properties.id)) continue;
  assert.deepEqual(f.properties.coastLine, b.get(f.properties.id), `${f.properties.id}: rollbackgeometri matcher ikke 4.0.44`);
  assert.equal(f.properties.coastLineVersion, '4.0.46-safe-rollback');
  matched++;
}
assert.ok(matched >= 210, `Kun ${matched} zoner valideret`);
console.log(`Sikker geometri-rollback valideret for ${matched} zoner; begge snapshots er bevaret.`);
