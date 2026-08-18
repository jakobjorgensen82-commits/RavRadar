import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import os from 'node:os';
import path from 'node:path';
import { build } from './build-public-coastal-parts-v2.mjs';
import { buildPublicConditions } from './public-conditions-lib.mjs';

const root='data/geometry-v2/active-national-coastal-parts';
const manifest=JSON.parse(fs.readFileSync(`${root}/manifest.json`,'utf8'));
assert.equal(manifest.publicActivation,true);
assert.equal(manifest.partCount,673);
assert.equal(manifest.zoneCount,210);
assert.equal(manifest.overlapPairCount,0);
assert.equal(manifest.pointPairCount,673);
for(const [name,digest] of Object.entries(manifest.files))assert.equal(crypto.createHash('sha256').update(fs.readFileSync(`${root}/${name}`,'utf8').replace(/\r\n/g,'\n')).digest('hex'),digest,`${name} er ændret efter ejergodkendelsen`);

const scratch=fs.mkdtempSync(path.join(os.tmpdir(),'ravradar-coastal-contract-'));
let contract;
try{
  contract=await build({output:path.join(scratch,'coastal-parts-v2.json')});
}finally{
  fs.rmSync(scratch,{recursive:true,force:true});
}
assert.equal(contract.partCount,673);
assert.equal(Object.values(contract.zones).flat().length,673);
assert.equal(Object.values(contract.zones).flat().filter(part=>part.landPoint&&part.waterPoint).length,673);
assert.equal(contract.zones['DK-B10-16'],undefined,'Fejø/Femø må ikke genopstå i den aktive kystruntime.');
const registry=JSON.parse(fs.readFileSync('data/zones.geojson','utf8'));
assert.equal(registry.features.some(feature=>feature.properties?.id==='DK-B10-16'),false,'Fejø/Femø må ikke findes i zoneregisteret.');

const bulk=fs.readFileSync('scripts/update-dmi-bulk.py','utf8');
assert.match(bulk,/PART::\{part_id\}/);
assert.match(bulk,/active_zones_config = \[[\s\S]{0,180}if not zone\.get\("waterSource"\) and not zone\.get\("researchCurrent"\)/);
assert.match(bulk,/COASTAL_PART_POINTS_PATH = ROOT \/ "data\/live\/coastal-parts-v2\.json"/);
assert.match(bulk,/part_doc\.get\("zones"\)/);
assert.match(bulk,/codes_get_array\(gid, "latitudes"\)/);
assert.match(bulk,/buckets\.setdefault\(key, \[\]\)\.append/);
assert.match(bulk,/\[:ATMOSPHERIC_GRID_CANDIDATE_TARGET\]/);
assert.match(bulk,/ATMOSPHERIC_GRID_CANDIDATE_TARGET = max\(32/);
assert.match(bulk,/warm_atmospheric_grid_cache\(gid, collection, zones\)/);
assert.match(bulk,/collection != "harmonie_dini_sf"/);
assert.match(bulk,/GRID_INDEX_CACHE\[cache_key\] = \[/);
const weather=fs.readFileSync('scripts/update-weather.mjs','utf8');
assert.match(weather,/scoreCoastalPartsRuntime/);
assert.match(weather,/status: 'uncertain'/);
assert.match(weather,/high - row\.score <= 7/);
const app=fs.readFileSync('app.js','utf8');
assert.match(app,/state\.conditions\.coastalParts\?\.enabled/);
assert.match(app,/local\?\.available\?local:scoreFor/,'Hovedzonescoren skal være sikker fallback uden lokal geografisk påstand.');
assert.match(app,/renderZones\(map,zones,/);
assert.doesNotMatch(app,/_mapId|_partName|mapZoneCollection/,'Lokale beregningsdele må ikke blive til synlige kortzoner.');

const projected=buildPublicConditions({datasetId:'test',generatedAt:'2026-08-11T00:00:00Z',zones:{},coastalParts:{schemaVersion:1,enabled:true,expectedPartCount:673,scoredPartCount:673,parts:{p:{}},zones:{z:{}}}});
assert.equal(projected.schemaVersion,2);
assert.equal(projected.coastalParts.enabled,true);
assert.equal(projected.coastalParts.expectedPartCount,673);
console.log('OK: 673 nationale kystdele i 210 zoner er aktiveret; Fejø/Femø er slettet, bugtede zoner kan sammenlignes lokalt, og sikker hovedzonefallback er bevaret.');
