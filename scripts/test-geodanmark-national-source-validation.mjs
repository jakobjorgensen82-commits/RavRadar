import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
const source=await fs.readFile('scripts/validate-geodanmark-national-source.py','utf8');
for(const marker of ['sourceZoneCount','Ufuldstændigt lag','duplicateTileFeaturesRemoved','productionGeometryChanged','DATAFORDELER_API_KEY']) assert.ok(source.includes(marker),`Mangler ${marker}`);
assert.match(source,/len\(covered\)!=expected/);
console.log('National GeoDanmark-sourcevalideringskontrakt: bestået.');
