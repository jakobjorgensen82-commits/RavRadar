import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import { build } from './build-public-coastal-parts-v2.mjs';
import { buildPublicConditions } from './public-conditions-lib.mjs';

const root='data/geometry-v2/active-national-coastal-parts';
const manifest=JSON.parse(fs.readFileSync(`${root}/manifest.json`,'utf8'));
assert.equal(manifest.publicActivation,true);
assert.equal(manifest.partCount,643);
assert.equal(manifest.zoneCount,206);
assert.equal(manifest.overlapPairCount,0);
assert.equal(manifest.pointPairCount,643);
for(const [name,digest] of Object.entries(manifest.files))assert.equal(crypto.createHash('sha256').update(fs.readFileSync(`${root}/${name}`,'utf8').replace(/\r\n/g,'\n')).digest('hex'),digest,`${name} er ændret efter ejergodkendelsen`);

const contract=await build();
assert.equal(contract.partCount,643);
assert.equal(Object.values(contract.zones).flat().length,643);
assert.equal(Object.values(contract.zones).flat().filter(part=>part.landPoint&&part.waterPoint).length,643);

const bulk=fs.readFileSync('scripts/update-dmi-bulk.py','utf8');
assert.match(bulk,/PART::\{part_id\}/);
assert.match(bulk,/not zone\.get\("coastalPart"\)/);
assert.match(bulk,/COASTAL_PART_POINTS_PATH\.read_bytes/);
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
assert.match(app,/unavailableLocalScore/);
assert.match(app,/renderZones\(map,zones,/);
assert.doesNotMatch(app,/_mapId|_partName|mapZoneCollection/,'Lokale beregningsdele må ikke blive til synlige kortzoner.');

const projected=buildPublicConditions({datasetId:'test',generatedAt:'2026-08-11T00:00:00Z',zones:{},coastalParts:{schemaVersion:1,enabled:true,expectedPartCount:643,scoredPartCount:643,parts:{p:{}},zones:{z:{}}}});
assert.equal(projected.schemaVersion,2);
assert.equal(projected.coastalParts.enabled,true);
assert.equal(projected.coastalParts.expectedPartCount,643);
console.log('OK: 643 nationale kystdele er aktiveret med lokale scores, 7-punktsdækning og fail-closed fallback.');
