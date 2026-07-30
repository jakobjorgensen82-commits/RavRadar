import assert from 'node:assert/strict';
import fs from 'node:fs/promises';

const [bulk, workflow] = await Promise.all([
  fs.readFile('scripts/update-dmi-bulk.py', 'utf8'),
  fs.readFile('.github/workflows/update-and-deploy.yml', 'utf8')
]);
assert.match(bulk, /GRID_CANDIDATE_TARGET/);
assert.match(bulk, /for radius in \(0\.025, 0\.05, 0\.09, 0\.14\)/);
assert.match(bulk, /if collection in MARINE_COLLECTIONS:\s*return zones/);
assert.match(bulk, /marine_model_score/);
assert.match(bulk, /VALID_POINT_TOO_FAR/);
assert.match(bulk, /freshMarineZones/);
assert.match(bulk, /preservedMarineZones/);
assert.match(bulk, /missingZones/);
assert.match(workflow, /DMI_BULK_COLLECTIONS_PER_RUN: 2/);
assert.match(workflow, /DMI_BULK_MAX_RUNTIME_SECONDS: 900/);
console.log('Marine overlap, grid candidate and coverage diagnostics test passed.');
