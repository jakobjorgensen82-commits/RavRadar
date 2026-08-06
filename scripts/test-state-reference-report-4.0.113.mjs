import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {spawnSync} from 'node:child_process';
const run=spawnSync(process.execPath,['scripts/generate-state-reference-report-4.0.113.mjs'],{encoding:'utf8'});
assert.equal(run.status,0,run.stderr||run.stdout);
assert.match(run.stdout,/RAVRADAR_STATE_REFERENCE /);
const r=JSON.parse(await fs.readFile('data/diagnostics/state-reference-zones.json','utf8'));
assert.equal(r.schemaVersion,2);
assert.equal(r.scoreImpact,'none');
assert.ok('id' in r.dataset && 'generatedAt' in r.dataset);
assert.deepEqual(r.referenceZones.map(x=>x.id),['DK-B01-01','DK-B02-07','DK-B02-13','DK-B03-13']);
const als=r.referenceZones.find(x=>x.id==='DK-B02-13');
assert.equal(als.classification,'open-coast-near-estuary');
assert.match(als.referenceRole,/ikke fjordzone/i);
for(const z of r.referenceZones){assert.ok(z.geometry.onshoreDirectionDeg!==null);assert.equal(z.validation.numericScoreChangedByReport,false);}
assert.equal(r.validationSummary.expectedZones,4);
console.log('Referencezonerapportens kontrakt og logformat består.');
