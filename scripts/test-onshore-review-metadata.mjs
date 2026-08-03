import fs from 'node:fs/promises';
import assert from 'node:assert/strict';

const zones = JSON.parse(await fs.readFile('data/zones.geojson', 'utf8'));
const active = (zones.features || []).filter(f => f.properties?.zoneStatus === 'active' && /^DK-B/.test(f.properties?.id || ''));
assert.ok(active.length >= 150, `For få aktive zoner efter godkendte sletninger: ${active.length}`);

// Reviewmetadata er et ekstra auditlag og findes ikke nødvendigvis på alle historiske zoner.
// Når felterne findes, skal de være komplette og gyldige. Ingen produktionszone låses
// til en historisk gradværdi, fordi ejerens godkendte adminankre må ændre retningen.
const reviewed = active.filter(({ properties: p }) =>
  p.onshoreDirectionConfidence != null ||
  p.onshoreDirectionCoastBearingDeg != null ||
  p.onshoreDirectionGeometryDifferenceDeg != null
);
for (const { properties: p } of reviewed) {
  assert.ok(['high', 'medium', 'review'].includes(p.onshoreDirectionConfidence), `${p.id}: ugyldig retningssikkerhed`);
  assert.ok(Number.isFinite(Number(p.onshoreDirectionCoastBearingDeg)), `${p.id}: mangler uafhængig kystretning`);
  assert.ok(Number.isFinite(Number(p.onshoreDirectionGeometryDifferenceDeg)), `${p.id}: mangler geometriforskel`);
}
console.log(`Onshore-reviewmetadata: ${active.length} aktive zoner; ${reviewed.length} zoner med ekstra reviewmetadata kontrolleret.`);
