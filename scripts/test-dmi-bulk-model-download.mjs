import assert from 'node:assert/strict';
import fs from 'node:fs/promises';

const [bulk, updater, workflow] = await Promise.all([
  fs.readFile('scripts/update-dmi-bulk.py', 'utf8'),
  fs.readFile('scripts/update-weather.mjs', 'utf8'),
  fs.readFile('.github/workflows/update-and-deploy.yml', 'utf8')
]);

for (const collection of ['dkss_idw', 'dkss_nsbs', 'dkss_lf', 'harmonie_dini_sf', 'wam_dw', 'wam_nsb']) {
  assert.match(bulk, new RegExp(collection));
}
assert.match(bulk, /codes_grib_find_nearest/);
assert.match(bulk, /nearest valid original model grid point/);
assert.match(updater, /bulk-stac-grib-first-with-sequential-edr-repair/);
assert.match(updater, /spatialInterpolation: false/);
assert.match(workflow, /python scripts\/update-dmi-bulk\.py/);
assert.match(workflow, /eccodes/);
assert.match(workflow, /data\/live\/dmi-bulk-cache\.json/);
console.log('DMI bulk model download test passed.');
