import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { readProductionWorkflowSources } from './lib/production-workflow-sources.mjs';

const [bulk, nativeProvenance, updater, workflows, hydrator, preflight, packageJson] = await Promise.all([
  fs.readFile('scripts/update-dmi-bulk.py', 'utf8'),
  fs.readFile('scripts/lib/dmi_native_provenance.py', 'utf8'),
  fs.readFile('scripts/update-weather.mjs', 'utf8'),
  readProductionWorkflowSources(),
  fs.readFile('scripts/hydrate-deployed-weather.py', 'utf8'),
  fs.readFile('scripts/check-weather-update.py', 'utf8'),
  fs.readFile('package.json', 'utf8')
]);
const { orchestrator, build } = workflows;
const { version: appVersion } = JSON.parse(packageJson);

for (const collection of ['dkss_idw', 'dkss_nsbs', 'dkss_lf', 'harmonie_dini_sf', 'wam_dw', 'wam_nsb']) {
  assert.match(bulk, new RegExp(collection));
  assert.match(preflight, new RegExp(collection));
}
assert.match(bulk, /codes_grib_find_nearest/);
assert.match(bulk, /multi-candidate nearest valid grid point/);
assert.match(bulk, /DMI_BULK_FORCE_REFRESH/);
assert.match(bulk, /for container_name in \("assets", "asset"\)/);
assert.match(bulk, /DOWNLOAD_SESSION/);
assert.match(bulk, /refreshStatus/);
assert.doesNotMatch(bulk, /asset\["parameterHint"\]/);
assert.match(bulk, /forecast-step GRIB inventory/);
assert.match(bulk, /recognizedParameters/);
assert.match(bulk, /TIME_STRIDE_HOURS/);
assert.match(bulk,
  /minimum_valid_epoch\s*=\s*\(\s*epoch\(minimum_valid_time\)\s*if minimum_valid_time is not None\s*else time\.time\(\) - 3600\s*\)/,
  'run selection must honor an explicit private replay boundary and retain the one-hour fallback');
assert.match(bulk, /expiredForecastStepsSkipped/);
assert.match(bulk, /select_forecast_run/);
assert.match(bulk, /preferredProgressiveRunRetained/);
assert.match(bulk, /incompleteLatestRunDeferred/);
assert.match(bulk, /collection_schedule/);
assert.match(bulk, /processedValidTimes/);
assert.match(bulk, /processingSignature/);
assert.match(bulk, /REQUIRED_TARGETS/);
assert.match(bulk, /zeroProgressCollections/);
assert.match(bulk, /write_checkpoint/);
assert.match(bulk, /codes_get_elements/);
assert.match(bulk, /nearest_valid_batch/);
assert.match(bulk, /collection not in MARINE_COLLECTIONS/);
assert.match(bulk, /Atmosfæriske grids/);
assert.match(bulk, /batchedGridReads/);
assert.match(bulk, /write_step_summary/);
assert.doesNotMatch(bulk, /join\(selected\)/);
assert.doesNotMatch(bulk, /codes_get_element\b/);
assert.match(bulk, /DMI_BULK_FINALIZE_RESERVE_SECONDS/);
assert.match(bulk, /should_stop_work/);
assert.match(bulk, /dmi-ocean-diagnostics\.json/);
assert.match(bulk, /dmi-ocean-summary\.txt/);
assert.match(bulk, /build_ocean_diagnostics/);
assert.match(bulk, /select_common_vector_candidate/);
assert.match(bulk, /water_source_parameter_allowed/);
assert.match(bulk, /invalidatedMismatchedVectors/);
assert.match(bulk, /PARSER_VERSION = 19/);
assert.match(nativeProvenance, /SPATIAL_PROVENANCE_VERSION = 1/);
assert.match(bulk, /PRIVATE_REPLAY_RETENTION_HOURS = max\(\s*54,/);
assert.match(bulk, /previous\.get\("spatialProvenanceVersion"\) == SPATIAL_PROVENANCE_VERSION/,
  'legacy bulkcache uden eksakt spatial proveniens må ikke ramme fresh-cache genvejen');
assert.match(bulk, /int\(previous\.get\("privateReplayRetentionHours"\) or 0\) >= 54/,
  'fresh-cache genbrug skal bevare hele den private replaybro');
assert.match(bulk, /select_common_grid_tuple/);
assert.match(bulk, /nearest-shared-wave-height-period-grid-cell-no-spatial-interpolation/);
assert.match(bulk, /observed_run_cadence_hours/);
assert.match(bulk, /catalogScheduleFresh/);
assert.match(bulk, /rejectedStaleRun/);
assert.match(bulk, /assetIdentitySha256/);
assert.match(bulk, /Registration\/last-use time is not acquisition time/);
assert.match(bulk, /invalidatedIncompleteComponentProvenance/);
assert.match(nativeProvenance, /CURRENT_VECTOR_SEMANTICS_VERSION = 3/);
assert.match(nativeProvenance, /nearest-shared-uv-column-across-dmi-collections-then-deepest-valid-layer/);
assert.match(bulk, /prefer_current_hour_candidate/);
assert.match(bulk, /CLOSER_CURRENT_COLUMN_SELECTED_FOR_NATIVE_TIME/);
assert.match(nativeProvenance, /CURRENT_MAX_DISTANCE_KM = 5\.0/);
assert.match(bulk, /prefer_vector_choice/);
assert.match(bulk, /currentFieldShadow/);
assert.match(bulk, /prune_previous_sampling_mismatches/);
assert.match(bulk, /removedSamplingPointMismatches/);
assert.match(bulk, /sanitize_water_temperature_surface_integrity/);
assert.match(bulk, /surfaceTemperatureRecoveryActive/);
assert.match(bulk, /native_component_source/);
assert.match(bulk, /water_temperature_surface_layer/);
assert.match(bulk, /rejectedNonSurfaceWaterTemperatureMessages/);
assert.match(bulk, /"modelRun": model_run/);
assert.match(bulk, /"nativeValidTime": valid_iso/);
assert.match(bulk, /PARAMETER_MAP_VERSION = 4/);
assert.match(bulk, /return canonical/);
assert.match(bulk, /"water-temperature": \(/);
assert.match(bulk, /HINT_ALIASES\.get\(canonical, \(\)\)/);
assert.match(bulk, /parser-exception/);
assert.match(bulk, /marine_cache_healthy/);
assert.match(updater, /DMI_OCEAN_REQUEST_TIMEOUT_MS/);
assert.match(updater, /lastObservationSuccessMs/);
assert.match(updater, /repairWaterLevelContinuity/);
assert.match(updater, /open-meteo-adjusted|fallbackPolicy/);
assert.match(bulk, /write_ocean_diagnostics/);
assert.match(build, new RegExp(`RavRadar/${appVersion.replaceAll('.', '\\.')}`));
assert.match(build, /current-field-shadow\.json/);
assert.match(build, /DMI_BULK_FINALIZE_RESERVE_SECONDS/);
assert.match(
  build,
  /- name: Update DMI bulk model cache[\s\S]*?timeout-minutes: 55[\s\S]*?DMI_BULK_MAX_RUNTIME_SECONDS: \$\{\{ steps\.legacy-bootstrap\.outputs\.required == 'true' && '3000' \|\| '900' \}\}/,
);
assert.doesNotMatch(bulk, /unique = \{row\["valid"\]/);
assert.match(updater, /\[1, 2\]\.includes\(parsed\?\.schemaVersion\)/);
assert.match(updater, /bulk-stac-grib-first-with-sequential-edr-repair/);
assert.match(updater, /spatialInterpolation: false/);
assert.match(orchestrator, /workflow_dispatch/);
assert.match(orchestrator, /^\s+schedule:/m);
assert.match(orchestrator, /cron: ["']14,29,44,59 \* \* \* \*["']/);
assert.match(orchestrator, /current-hour-readiness/);
assert.match(orchestrator, /github\.event_name == 'workflow_dispatch' && inputs\.force != true && inputs\.geometry_v2_pilot != true && inputs\.geometry_v2_national != true/);
for (const source of Object.values(workflows)) assert.doesNotMatch(source, /candidate_g_gap_reconstruction_mode/);
assert.match(orchestrator, /CHECK_CURRENT_HOUR/);
assert.match(orchestrator, /target_hour: \$\{\{ steps\.cache-state\.outputs\.target_hour \}\}/);
assert.match(build, /RAVRADAR_PRODUCTION_TARGET_HOUR: \$\{\{ inputs\.production_target_hour \}\}/);
assert.match(updater, /resolveProductionReferenceTime\(process\.env\.RAVRADAR_PRODUCTION_TARGET_HOUR, new Date\(buildGeneratedAt\)\)/);
assert.doesNotMatch(orchestrator, /cron-job\.org/);
assert.match(build, /python scripts\/hydrate-deployed-weather\.py/);
assert.match(build, /python scripts\/check-weather-update\.py/);
assert.match(build, /python -u scripts\/update-dmi-bulk\.py/);
assert.match(build, /node scripts\/build-public-coastal-parts-v2\.mjs/);
assert.ok(build.indexOf('node scripts/build-public-coastal-parts-v2.mjs') < build.indexOf('python -u scripts/update-dmi-bulk.py'), 'Centralt reviewede kystdelspunkter skal bygges før DMI-sampling.');
assert.match(build, /eccodes/);
assert.match(build, /smoke-test-eccodes\.py/);
assert.match(build, /DMI bulk error/);
assert.match(build, /DMI_BULK_FORCE_REFRESH/);
assert.match(build, /actions\/cache\/restore@v6/);
assert.match(build, /actions\/cache\/save@v6/);
assert.match(build, /\.cache\/dmi-grib/);
for (const source of Object.values(workflows)) assert.doesNotMatch(source, /schedule-test\.yml/);
assert.match(build, /DMI_API_KEY/);
assert.match(build, /Report DMI bulk result/);
assert.match(hydrator, /data\/live\/dmi-bulk-cache\.json/);
assert.match(hydrator, /ravradar-runtime-diagnostics\.json/);
assert.match(hydrator, /data\/diagnostics\/dmi-ocean-diagnostics\.json/);
assert.match(hydrator, /data\/diagnostics\/dmi-ocean-summary\.txt/);
assert.match(preflight, /new-dmi-model/);
assert.match(preflight, /RAVRADAR_MAX_STALE_MINUTES/);

const provenanceParity = spawnSync(
  process.env.PYTHON || 'python',
  ['scripts/test-dmi-native-provenance.py'],
  { encoding: 'utf8' },
);
assert.equal(
  provenanceParity.status,
  0,
  `DMI native producer/verifier parity failed:\n${provenanceParity.stdout}\n${provenanceParity.stderr}`,
);
assert.match(preflight, /missing-ocean-diagnostics/);
assert.match(preflight, /dmi-cache-incomplete/);
assert.match(preflight, /marine-warmup-pending/);
assert.match(bulk, /diagnosticsRegenerated/);
assert.match(bulk, /if marine_foundation_missing:/);
assert.match(bulk, /scheduleCoverageBeforeRun/);
assert.match(bulk, /marineRecoveryActive/);
assert.match(bulk, /HARMONIE_RUN_RETENTION_HOURS/);
assert.match(bulk, /runRetentionHorizonHours/);
assert.match(updater, /version: APP_VERSION/);
console.log('DMI bulk model download and GitHub-owned scheduler preflight test passed.');
