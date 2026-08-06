import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {spawnSync} from 'node:child_process';
const run=spawnSync(process.execPath,['scripts/generate-state-reference-report-4.0.112.mjs'],{encoding:'utf8'});
assert.equal(run.status,0,run.stderr||run.stdout);
const r=JSON.parse(await fs.readFile('data/diagnostics/state-reference-zones.json','utf8'));
assert.equal(r.scoreImpact,'none');
assert.deepEqual(r.referenceZones.map(x=>x.id),['DK-B01-01','DK-B02-07','DK-B02-13','DK-B03-13']);
const als=r.referenceZones.find(x=>x.id==='DK-B02-13');
assert.equal(als.classification,'open-coast-near-estuary');
assert.match(als.referenceRole,/ikke fjordzone/i);
for(const z of r.referenceZones){assert.ok(z.geometry.onshoreDirectionDeg!==null);assert.equal(z.validation.numericScoreChangedByReport,false);}
console.log('Referencezonerapportens kontrakt består.');
