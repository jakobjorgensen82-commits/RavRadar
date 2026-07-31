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
const parsed = JSON.parse(fs.readFileSync(source, 'utf8'));
if (!Array.isArray(parsed.features) || parsed.features.length < 200) throw new Error('Ugyldigt geometri-snapshot');
fs.copyFileSync(source, destination);
console.log(`Aktiv zonegeometri er nu snapshot ${target}.`);
