import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { validateActiveZoneIds } from './zone-registry-integrity.mjs';

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'ravradar-admin-zone-contract-'));
const zonesPath = path.join(tmp, 'zones.geojson');
const reviewsPath = path.join(tmp, 'direction-reviews.json');
const coastlinesPath = path.join(tmp, 'coastline-overrides.json');
const baselinePath = path.join(tmp, 'baseline.geojson');

const baseFeatures = [
  { type:'Feature', properties:{ id:'FLIP', name:'Oprindeligt navn', region:'Test', zoneStatus:'active', coastType:'east', dataPoint:[10,56.1], pinPoint:[10,56], onshoreDirectionDeg:180, coastLine:[[10,56],[10.1,56]] }, geometry:{type:'Polygon',coordinates:[]} },
  { type:'Feature', properties:{ id:'RENAME', name:'Gammelt navn', region:'Test', zoneStatus:'active', coastType:'west', dataPoint:[11,56], pinPoint:[10.9,56], onshoreDirectionDeg:270, coastLine:[[11,56],[11.1,56]] }, geometry:{type:'Polygon',coordinates:[]} },
  { type:'Feature', properties:{ id:'DELETE', name:'Slet mig', region:'Test', zoneStatus:'active', coastType:'east', dataPoint:[12,56], pinPoint:[12.1,56], onshoreDirectionDeg:90, coastLine:[[12,56],[12.1,56]] }, geometry:{type:'Polygon',coordinates:[]} },
  { type:'Feature', properties:{ id:'DRAFT', name:'Kladde', region:'Test', zoneStatus:'active', coastType:'east', dataPoint:[13,56], pinPoint:[13.1,56], onshoreDirectionDeg:90, coastLine:[[13,56],[13.1,56]] }, geometry:{type:'Polygon',coordinates:[]} }
];
const collection = { type:'FeatureCollection', features:baseFeatures };
fs.writeFileSync(zonesPath, JSON.stringify(collection));
fs.writeFileSync(baselinePath, JSON.stringify(collection));
fs.writeFileSync(reviewsPath, JSON.stringify({ zones:{
  // En fuld 180° korrektion er lovlig, når land-/havpunkter og retning er konsistente.
  FLIP:{ status:'verified', anchors:[{ id:'primary', dataPoint:[10,56], pinPoint:[10,56.1], onshoreDirectionDeg:0, weight:1 }] },
  DELETE:{ status:'deleted', deleted:true },
  DRAFT:{ status:'reviewing', anchors:[{ id:'primary', dataPoint:[13.1,56], pinPoint:[13,56], onshoreDirectionDeg:270, weight:1 }] }
} }));
fs.writeFileSync(coastlinesPath, JSON.stringify({ overrides:{
  RENAME:{ published:true, zoneName:'Nyt administratornavn', coastLine:[[11,56.2],[11.1,56.3]], updatedAt:'2026-08-03T16:00:00Z' }
} }));

const result = spawnSync('python', ['scripts/apply-central-zone-reviews.py', '--zones', zonesPath, '--reviews', reviewsPath, '--coastlines', coastlinesPath], { encoding:'utf8' });
assert.equal(result.status, 0, result.stderr || result.stdout);
const output = JSON.parse(fs.readFileSync(zonesPath, 'utf8'));
const byId = new Map(output.features.map(feature => [feature.properties.id, feature.properties]));
assert.deepEqual([...byId.keys()], ['FLIP','RENAME','DRAFT']);
assert.equal(byId.get('FLIP').onshoreDirectionDeg, 0, '180° korrektion skal accepteres');
assert.deepEqual(byId.get('FLIP').dataPoint, [10,56]);
assert.deepEqual(byId.get('FLIP').pinPoint, [10,56.1]);
assert.equal(byId.get('RENAME').name, 'Nyt administratornavn');
assert.deepEqual(byId.get('RENAME').coastLine, [[11,56.2],[11.1,56.3]]);
assert.equal(byId.get('DRAFT').onshoreDirectionDeg, 90, 'Ikke-godkendte ankre må ikke påvirke produktionen');

validateActiveZoneIds(new Set(output.features.map(feature => feature.properties.id)), {
  baselinePath,
  permanentlyRetired: [],
  reviewsPath
});

const admin = fs.readFileSync('js/ui/admin-dashboard.js', 'utf8');
assert.ok(admin.includes("status:'verified'"), 'Admin skal kunne godkende retningsankre');
assert.ok(!/afvig(?:er|else)[^\n]{0,120}(?:90|180)[^\n]{0,120}(?:stop|afvis|blok)/i.test(admin), 'Admin må ikke blokere store eller 180° retningsrettelser');
console.log('Admin-kontrakt bestået: omdøbning, kystlinje, 180° vending, zonesletning og kladdebeskyttelse går korrekt gennem produktionskæden.');
