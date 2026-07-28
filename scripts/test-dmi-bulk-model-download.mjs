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
assert.match(bulk, /nearest original grid point/);
assert.match(bulk, /DMI_BULK_FORCE_REFRESH/);
assert.match(bulk, /for container_name in \("assets", "asset"\)/);
assert.match(bulk, /DOWNLOAD_SESSION/);
assert.match(bulk, /refreshStatus/);
assert.doesNotMatch(bulk, /asset\["parameterHint"\]/);
assert.match(bulk, /forecast-step GRIB inventory/);
assert.match(bulk, /recognizedParameters/);
assert.match(bulk, /TIME_STRIDE_HOURS/);
assert.match(bulk, /collection_schedule/);
assert.match(bulk, /processedValidTimes/);
assert.match(bulk, /write_checkpoint/);
assert.match(bulk, /codes_get_elements/);
assert.doesNotMatch(bulk, /codes_get_element\b/);
assert.match(bulk, /DMI_BULK_FINALIZE_RESERVE_SECONDS/);
assert.match(bulk, /should_stop_work/);
assert.match(bulk, /dmi-ocean-diagnostics\.json/);
assert.match(bulk, /dmi-ocean-summary\.txt/);
assert.match(bulk, /build_ocean_diagnostics/);
assert.match(bulk, /write_ocean_diagnostics/);
assert.match(workflow, /RavRadar\/4\.0\.8/);
assert.match(workflow, /DMI_BULK_FINALIZE_RESERVE_SECONDS/);
assert.match(workflow, /timeout-minutes: 10/);
assert.doesNotMatch(bulk, /unique = \{row\["valid"\]/);
assert.match(updater, /\[1, 2\]\.includes\(parsed\?\.schemaVersion\)/);
assert.match(updater, /bulk-stac-grib-first-with-sequential-edr-repair/);
assert.match(updater, /spatialInterpolation: false/);
assert.match(workflow, /workflow_dispatch/);
assert.doesNotMatch(workflow, /^\s+schedule:/m);
assert.match(workflow, /python scripts\/hydrate-deployed-weather\.py/);
assert.match(workflow, /python scripts\/check-weather-update\.py/);
assert.match(workflow, /python -u scripts\/update-dmi-bulk\.py/);
assert.match(workflow, /eccodes/);
assert.match(workflow, /smoke-test-eccodes\.py/);
assert.match(workflow, /DMI bulk error/);
assert.match(workflow, /DMI_BULK_FORCE_REFRESH/);
assert.match(workflow, /actions\/cache@v4/);
assert.match(workflow, /\.cache\/dmi-grib/);
assert.doesNotMatch(workflow, /schedule-test\.yml/);
assert.match(workflow, /DMI_API_KEY/);
assert.match(workflow, /Report DMI bulk result/);
assert.match(hydrator, /data\/live\/dmi-bulk-cache\.json/);
assert.match(hydrator, /ravradar-runtime-diagnostics\.json/);
assert.match(hydrator, /data\/diagnostics\/dmi-ocean-diagnostics\.json/);
assert.match(hydrator, /data\/diagnostics\/dmi-ocean-summary\.txt/);
assert.match(preflight, /new-dmi-model/);
assert.match(preflight, /RAVRADAR_MAX_STALE_MINUTES/);
assert.match(preflight, /missing-ocean-diagnostics/);
assert.match(preflight, /dmi-cache-incomplete/);
assert.match(preflight, /marine-warmup-pending/);
assert.match(bulk, /diagnosticsRegenerated/);
console.log('DMI bulk model download and external scheduler preflight test passed.');
