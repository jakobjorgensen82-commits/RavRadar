import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { readProductionWorkflowSource } from './lib/production-workflow-sources.mjs';

const [hydrator, publicProjection, buildWorkflow] = await Promise.all([
  fs.readFile('scripts/hydrate-deployed-weather.py', 'utf8'),
  fs.readFile('scripts/public-conditions-lib.mjs', 'utf8'),
  readProductionWorkflowSource('build'),
]);

for (const marker of [
  '--legacy-candidate-g-bootstrap',
  'assert_legacy_candidate_g_cutover_source',
  'LEGACY_CANDIDATE_G_MODEL_ID',
  'exactly 210 zones',
  'exactly 673 coastal parts',
  'complete schema-2 continuation',
  'LEGACY_SOURCE_REGISTRY_RELATIVE',
  'assert_legacy_candidate_g_source_registry',
  'coastalPartsPath',
  'coastalPartsSha256',
  'coastalPartsBytes',
  '.cache/ravscore-legacy-candidate-g-source/coastal-parts-v2.json',
  'generic-public-private-runtime-hydration-retired',
]) assert.match(hydrator, new RegExp(marker.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));

assert.doesNotMatch(hydrator, /atomic_write_(?:json|bytes)\(active_registry_path/,
  'legacy source hydration must never overwrite data/live/coastal-parts-v2.json');

assert.doesNotMatch(publicProjection, /fullConditionsPath:\s*['"]\.\/conditions\.json/,
  'the new public manifest must never advertise the private runtime');
assert.doesNotMatch(publicProjection, /currentPilotHistoryPath/,
  'the new public manifest must never advertise private pilot history');
assert.match(buildWorkflow, /legacy-candidate-g-bootstrap/,
  'the workflow may import public full state only through the explicit one-time Candidate G gate');

console.log('Legacy Candidate G bootstrap is one-time, exact-model/count bound, and retired from the integrated public manifest.');
