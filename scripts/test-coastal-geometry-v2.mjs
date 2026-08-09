import assert from 'node:assert/strict';
import fs from 'node:fs/promises';

const schema = JSON.parse(await fs.readFile('data/geometry-v2/coastal-geometry-v2.schema.json', 'utf8'));
const manifest = JSON.parse(await fs.readFile('data/geometry-v2/pilot-manifest.json', 'utf8'));
const pilotAreas = JSON.parse(await fs.readFile('data/geometry-v2/pilot-areas.json', 'utf8'));
const liveComparison = JSON.parse(await fs.readFile('data/diagnostics/coastal-geometry-v2-live-comparison.json', 'utf8'));
const decision = await fs.readFile('docs/rdks/10_DECISIONS/DEC-0032-COASTAL-GEOMETRY-V2.md', 'utf8');
const audit = await fs.readFile('scripts/audit-coastal-geometry-v2.py', 'utf8');

assert.equal(schema.properties.schemaVersion.const, '1.0.0-pilot');
assert.equal(manifest.schemaVersion, '1.0.0-pilot');
assert.equal(manifest.status, 'pilot');
assert.equal(manifest.sourceManifest.costClass, 'free-data-only');
assert.equal(manifest.sourceManifest.retrieval, 'not-fetched');
assert.equal(manifest.sourceManifest.sourceCrs, 'EPSG:25832');
assert.equal(manifest.sourceManifest.outputCrs, 'EPSG:4326');
assert.deepEqual(manifest.zones, []);
assert.deepEqual(manifest.migrationLog, []);
assert.equal(pilotAreas.areas.length, 3);
assert.equal(pilotAreas.acceptance.unintendedOverlapAreaM2, 0);
assert.equal(pilotAreas.acceptance.centralOverridesSilentlyLost, 0);
assert.equal(pilotAreas.acceptance.scoreChangeAllowed, false);
assert.equal(liveComparison.repositoryActiveZoneCount, 209);
assert.equal(liveComparison.publicActiveZoneCount, 208);
assert.deepEqual(liveComparison.centrallyDeletedZoneIds, ['DK-B02-14']);
assert.equal(liveComparison.publicMultiAnchorZoneCount, 18);

const selectedZoneIds = new Set(pilotAreas.areas.flatMap(area => area.zoneIds));
for (const requiredZoneId of ['DK-B03-13', 'DK-B04-08', 'DK-B05-17', 'DK-B10-05', 'DK-B10-10'])
  assert.ok(selectedZoneIds.has(requiredZoneId), `Pilot mangler referencezonen ${requiredZoneId}`);

for (const required of [
  'independent-pilot',
  'independent-verified',
  'conflict-review-required',
  'semantic-relocation',
  'none-pilot',
  'free-data-only'
]) {
  assert.ok(JSON.stringify(schema).includes(required), `V2-schema mangler ${required}`);
}

for (const required of [
  'Produktionsfilen `data/zones.geojson`',
  'må aldrig overskrive dem tavst',
  'Landsdækkende omskrivning må ikke begynde automatisk',
  'Høfder',
  'score-neutral'
]) {
  assert.ok(decision.includes(required), `DEC-0032 mangler ${required}`);
}

for (const forbidden of ['write_text(json.dumps(zones', "zones_path.write_text"])
  assert.ok(!audit.includes(forbidden), `Read-only audit indeholder forbudt zonemutation: ${forbidden}`);

console.log('Kystgeometri v2-kontrakt: bestået.');
