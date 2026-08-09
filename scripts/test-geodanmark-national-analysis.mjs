import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
const source=await fs.readFile('scripts/analyze-geodanmark-national.py','utf8');
for(const marker of ['STRtree','zoneCount\"]==208','conflictClass','planned-conflict','automaticActivationAllowed']) assert.ok(source.includes(marker),`Mangler ${marker}`);
assert.doesNotMatch(source,/productionGeometryChanged\":True/);
console.log('National GeoDanmark-analysekontrakt: bestået.');
