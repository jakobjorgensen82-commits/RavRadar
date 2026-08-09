import assert from 'node:assert/strict';import fs from 'node:fs/promises';
const source=await fs.readFile('scripts/build-national-coastal-parts.py','utf8');const validator=await fs.readFile('scripts/validate-national-coastal-parts.py','utf8');const workflow=await fs.readFile('.github/workflows/update-and-deploy.yml','utf8');
for(const x of ['inventedConnectionCount":0','official-place-name-required','landPointProposed":False','weatherSamplingEnabled":False','blocked-planned-conflict','blocked-locality-review','maximumReviewPartLengthKm','maximumFragmentsPerReviewPart'])assert.ok(source.includes(x),`Mangler ${x}`);
for(const x of ['proposedName") is not None','inventedConnectionCount','zoneCount")!=208'])assert.ok(validator.includes(x),`Validator mangler ${x}`);
for(const x of ['build-national-coastal-parts.py','validate-national-coastal-parts.py','national-coastal-parts.json','national-coastal-parts.geojson'])assert.ok(workflow.includes(x),`Workflow mangler ${x}`);
console.log('National coastal parts kontrakt: bestået.');
