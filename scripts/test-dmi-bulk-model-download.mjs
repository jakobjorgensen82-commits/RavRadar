import assert from 'node:assert/strict';
import fs from 'node:fs/promises';

const [bulk, updater, workflow, hydrator, preflight] = await Promise.all([
  fs.readFile('scripts/update-dmi-bulk.py', 'utf8'),
  fs.readFile('scripts/update-weather.mjs', 'utf8'),
  fs.readFile('.github/workflows/update-and-deploy.yml', 'utf8'),
  fs.readFile('scripts/hydrate-deployed-weather.py', 'utf8'),
  fs.readFile('scripts/check-weather-update.py', 'utf8')
]);

for (const collection of ['dkss_idw', 'dkss_nsbs', 'dkss_lf', 'harmonie_dini_sf', 'wam_dw', 'wam_nsb']) {
  assert.match(bulk, new RegExp(collection));
  assert.match(preflight, new RegExp(collection));
}
assert.match(bulk, /codes_grib_find_nearest/);
assert.match(bulk, /nearest valid original model grid point/);
assert.match(bulk, /DMI_BULK_FORCE_REFRESH/);
assert.match(updater, /bulk-stac-grib-first-with-sequential-edr-repair/);
assert.match(updater, /spatialInterpolation: false/);
assert.match(workflow, /workflow_dispatch/);
assert.doesNotMatch(workflow, /^\s+schedule:/m);
assert.match(workflow, /python scripts\/hydrate-deployed-weather\.py/);
assert.match(workflow, /python scripts\/check-weather-update\.py/);
assert.match(workflow, /python scripts\/update-dmi-bulk\.py/);
assert.match(workflow, /eccodes/);
assert.match(workflow, /DMI_BULK_FORCE_REFRESH/);
assert.doesNotMatch(workflow, /actions\/cache/);
assert.match(hydrator, /data\/live\/dmi-bulk-cache\.json/);
assert.match(preflight, /new-dmi-model/);
assert.match(preflight, /RAVRADAR_MAX_STALE_MINUTES/);
console.log('DMI bulk model download and external scheduler preflight test passed.');
