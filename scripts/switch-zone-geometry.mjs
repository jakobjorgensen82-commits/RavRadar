#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const root = path.resolve(new URL('..', import.meta.url).pathname);
const target = process.argv[2];
const allowed = new Map([
  ['4.0.44', 'data/geometry-snapshots/zones-4.0.44.geojson'],
  ['4.0.45', 'data/geometry-snapshots/zones-4.0.45.geojson'],
]);
if (!allowed.has(target)) {
  console.error('Brug: node scripts/switch-zone-geometry.mjs 4.0.44|4.0.45');
  process.exit(1);
}
const source = path.join(root, allowed.get(target));
const destination = path.join(root, 'data/zones.geojson');
const snapshot = JSON.parse(fs.readFileSync(source, 'utf8'));
const current = JSON.parse(fs.readFileSync(destination, 'utf8'));
if (snapshot?.type !== 'FeatureCollection' || !Array.isArray(snapshot.features) || snapshot.features.length < 1) throw new Error('Ugyldigt geometri-snapshot');
if (current?.type !== 'FeatureCollection' || !Array.isArray(current.features) || current.features.length < 1) throw new Error('Ugyldigt aktivt zoneregister');

const snapshotById = new Map(snapshot.features.map(feature => [feature.properties?.id, feature]));
for (const feature of current.features) {
  const id = feature.properties?.id;
  const historical = snapshotById.get(id);
  if (!historical) throw new Error(`Rollback-snapshot mangler aktiv zone ${id}`);
  // Rollbackværktøjet må kun skifte zonegeometrien. Administratorens aktuelle
  // navn, kystlinje, land-/havpunkter, ankre og retning bevares.
  feature.geometry = structuredClone(historical.geometry);
  feature.properties.geometryRollbackSource = target;
}
fs.writeFileSync(destination, JSON.stringify(current, null, 2) + '\n');
console.log(`Aktiv polygongeometri er nu baseret på snapshot ${target}; adminredigerede felter og zonesletninger er bevaret.`);
