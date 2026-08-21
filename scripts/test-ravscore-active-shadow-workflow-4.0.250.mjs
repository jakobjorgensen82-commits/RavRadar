import assert from 'node:assert/strict';
import fs from 'node:fs';

const workflow=fs.readFileSync('.github/workflows/update-and-deploy.yml','utf8');
const builder=fs.readFileSync('scripts/build-active-runtime-shadow-input.py','utf8');
for(const marker of ['ravscore_active_shadow:','ravscore-active-shadow:','Build read-only shadow input from active 210/673 runtime','Validate active points on native DMI grids','Validate active-point private RavScore candidate shadow','ravradar-active-ravscore-shadow'])assert.ok(workflow.includes(marker),`Workflow mangler ${marker}`);
const section=workflow.slice(workflow.indexOf('ravscore-active-shadow:'),workflow.indexOf('geometry-v2-pilot:'));
assert.match(section,/permissions:\s*\n\s*contents: read/);
assert.doesNotMatch(section,/pages: write|id-token: write|deploy-pages|admin/);
for(const marker of ['active-public-runtime-read-only','private-national-read-only-local-part-point-pairs','productionGeometryChanged','publicRuntimeChanged','automaticActivationAllowed'])assert.ok(builder.includes(marker),`Inputbygger mangler ${marker}`);
assert.match(workflow,/build-and-prepare:[\s\S]{0,220}inputs\.ravscore_active_shadow != true/);
console.log('Aktive produktionspunkter til privat RavScore-shadow workflow: bestået.');
