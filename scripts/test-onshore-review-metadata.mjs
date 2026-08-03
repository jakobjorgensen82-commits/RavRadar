import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
const zones = JSON.parse(await fs.readFile('data/zones.geojson','utf8'));
const active = (zones.features||[]).filter(f => f.properties?.zoneStatus === 'active' && /^DK-B/.test(f.properties?.id||''));
assert.ok(active.length>=150, `For få aktive zoner efter godkendte sletninger: ${active.length}`);
for (const f of active) {
  const p=f.properties;
  assert.ok(['high','medium','review'].includes(p.onshoreDirectionConfidence), `${p.id}: mangler retningssikkerhed`);
  assert.ok(Number.isFinite(Number(p.onshoreDirectionCoastBearingDeg)), `${p.id}: mangler uafhængig kystretning`);
  assert.ok(Number.isFinite(Number(p.onshoreDirectionGeometryDifferenceDeg)), `${p.id}: mangler geometriforskel`);
}
const b02=active.find(f=>f.properties.id==='DK-B02-12').properties;
assert.equal(b02.onshoreDirectionDeg,268);
assert.equal(b02.onshoreDirectionConfidence,'high');
console.log(`Onshore-reviewmetadata: ${active.length} zoner kontrolleret.`);
