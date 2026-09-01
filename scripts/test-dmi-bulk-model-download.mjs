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
assert.match(bulk, /PARSER_VERSION = 20/);
assert.match(bulk, /GRID_LOOKUP_VERSION = 8/);
assert.match(nativeProvenance, /SPATIAL_PROVENANCE_VERSION = 1/);
assert.match(nativeProvenance, /CURRENT_OPERATIONAL_LEDGER_SCHEMA_VERSION = 4/);
assert.match(nativeProvenance, /dmi-official-dkss-operational-current-ledger-v4/);
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
const regionalProxyBuilder = bulk.indexOf('regional_proxy_targets: list[dict[str, Any]] = []');
const regionalProxyConsumer = bulk.indexOf('research_targets = rotating_research_targets + regional_proxy_targets');
assert.ok(regionalProxyBuilder >= 0 && regionalProxyConsumer > regionalProxyBuilder,
  'Den private regionale proxy skal bygges i et afgrænset fail-closed blok');
const regionalProxyBlock = bulk.slice(regionalProxyBuilder, regionalProxyConsumer);
assert.match(regionalProxyBlock, /try:/);
assert.match(regionalProxyBlock, /except \(OSError, ValueError, TypeError, KeyError\):/);
assert.match(regionalProxyBlock, /regional_proxy_configuration_status = "FAILED_CLOSED"/);
assert.match(regionalProxyBlock, /operationel DMI-produktion fortsætter/);
assert.doesNotMatch(regionalProxyBlock, /raise\b|safe_error_message/,
  'En privat proxyfejl må hverken abortere DMI-producenten eller logge policypayload');
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
assert.match(bulk, /and coastal_part_current_cache_healthy/);
assert.match(bulk, /current_operational_cache_ready/);
assert.match(bulk, /build_current_operational_ledger/);
assert.match(bulk, /LOCALLY_SKIPPED_DKSS_ASSET/);
assert.match(bulk, /SYSTEMIC_CURRENT_TIME_COLLAPSE/);
assert.match(bulk, /def backfill_compatible_cache_data\(/);
assert.match(bulk, /strict_donors = \[/);
assert.match(bulk, /coastal_part_targets=coastal_part_targets/);
assert.match(bulk, /production_reference=locked_production_reference/);
assert.match(bulk, /atomic_write_bulk_cache\(previous\)/);
assert.match(bulk, /not strict_current_anchor_available/);
assert.match(bulk, /def producer_terminal_code\(/);
for (const code of [
  'DMI_READY',
  'DMI_CATALOG_SCHEDULE_STALE',
  'DMI_CURRENT_LEDGER_INCOMPLETE',
  'DMI_WAVE_BOOTSTRAP_INCOMPLETE',
  'DMI_PRODUCER_EXCEPTION',
]) {
  assert.match(bulk, new RegExp(code));
}
assert.match(bulk, /terminal_code=\{bounded_code\}/);
assert.match(bulk, /collection_failure_codes=\{bounded_failure_csv\}/);
assert.match(bulk, /strict_current_anchor_ready=/);
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
  /- name: Update DMI bulk model cache[\s\S]*?timeout-minutes: 55[\s\S]*?DMI_BULK_MAX_RUNTIME_SECONDS: \$\{\{ steps\.operational-action\.outputs\.action == 'integrated-cutover' && steps\.legacy-bootstrap\.outputs\.required == 'true' && '3000' \|\| '900' \}\}/,
);
assert.match(
  build,
  /DMI_BULK_MAX_DOWNLOAD_MB: \$\{\{ steps\.operational-action\.outputs\.action == 'integrated-cutover' && steps\.legacy-bootstrap\.outputs\.required == 'true' && '4096' \|\| '2048' \}\}/,
  'Første integrerede cutover skal kunne hente den målte fulde bootstrapmængde; normale vejrkørsler beholder 2048 MB-grænsen.',
);
assert.match(
  build,
  /DMI_BULK_COLLECTIONS_PER_RUN: \$\{\{ steps\.operational-action\.outputs\.action == 'integrated-cutover' && steps\.legacy-bootstrap\.outputs\.required == 'true' && '6' \|\| '2' \}\}/,
  'Første integrerede cutover skal have plads til både WAM-bootstrap og alle officielle DKSS-familier; normale vejrkørsler forbliver afgrænset til to collections.',
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
const dmiProducer = build.indexOf('name: Update DMI bulk model cache');
const dmiGribSave = build.indexOf('name: Save progressed DMI GRIB download cache');
const dmiZoneSave = build.indexOf('name: Save progressive private DMI zone cache');
const dmiShadowSave = build.indexOf('name: Save private seven-day current-field research cache');
const dmiTerminalGate = build.indexOf('name: Require successful DMI producer before current supplement');
const copernicusSelector = build.indexOf('name: Select exact-hour DMI gaps for targeted Copernicus supplement');
assert.ok(
  dmiProducer < dmiGribSave
    && dmiGribSave < dmiZoneSave
    && dmiZoneSave < dmiShadowSave
    && dmiShadowSave < dmiTerminalGate
    && dmiTerminalGate < copernicusSelector,
  'DMI-progression skal gemmes før den hårde terminalgate og gapselector',
);
const terminalGateBlock = build.slice(dmiTerminalGate, copernicusSelector);
for (const marker of [
  'id: dmi-terminal-gate',
  'steps.dmi-bulk.outputs.terminal_code',
  'steps.dmi-bulk.outputs.strict_current_anchor_ready',
  'test "$code" = "DMI_READY"',
  'echo "ready=$ready" >> "$GITHUB_OUTPUT"',
]) {
  assert.ok(terminalGateBlock.includes(marker), `DMI-terminalgaten mangler ${marker}`);
}
assert.doesNotMatch(terminalGateBlock, /continue-on-error/);
const selectorBlock = build.slice(
  copernicusSelector,
  build.indexOf('name: Bind production to resolved DMI current hour'),
);
assert.match(selectorBlock, /steps\.dmi-terminal-gate\.outputs\.ready == 'true'/);
assert.doesNotMatch(selectorBlock, /--nearest-dmi-hour|--full-coast/);
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
