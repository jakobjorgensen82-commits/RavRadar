import assert from 'node:assert/strict';
import fs from 'node:fs';

// Static workflow contract only. Never reads private data or calls a provider.
const read = file => fs.readFileSync(file, 'utf8').replaceAll('\r\n', '\n');
const normal = read('.github/workflows/reusable-weather-build.yml');
const orchestrator = read('.github/workflows/update-and-deploy.yml');
const manual = read('.github/workflows/run-current-weather-once.yml');
const watchdog = read('.github/workflows/preserve-copernicus-current-shadow.yml');
const retiredOneoff = read('.github/workflows/validate-copernicus-current-pilot.yml');
assert.match(normal, /quick_confirmation:\s+required: false\s+type: boolean\s+default: false/);
assert.match(manual, /quick_confirmation:\s+description: '[^']+'\s+required: false\s+type: boolean\s+default: false/);
assert.match(normal, /quick_progress_source:\s+required: false\s+type: string\s+default: ''/);
assert.match(manual, /quick_progress_source:\s+description: '[^']+'\s+required: false\s+type: string\s+default: ''/);
const blocks = source => source.split(/(?=^      - (?:name:|uses:))/m);
function step(source, name) {
  const found = blocks(source).filter(block => block.startsWith(`      - name: ${name}\n`));
  assert.equal(found.length, 1, `Exactly one step: ${name}`);
  return found[0];
}

const privatePlaintextPrefixes = [
  'coastal-point-staging-v1-',
  'copernicus-current-progress-v3-',
  'copernicus-current-donor-bank-v1-',
  'open-meteo-current-fallback-v2-',
  'open-meteo-current-donor-bank-v1-',
  'dmi-zone-active-v1-',
  'dmi-zone-candidate-v1-',
  'current-field-shadow-v1-',
  'copernicus-current-post-build-input-v1-',
];
for (const prefix of privatePlaintextPrefixes) {
  assert.doesNotMatch(normal, new RegExp(prefix), `Active reusable build still exposes ${prefix}`);
  assert.doesNotMatch(manual, new RegExp(prefix), `Manual normal caller still exposes ${prefix}`);
}
assert.doesNotMatch(orchestrator.slice(0, orchestrator.indexOf('\n  copernicus-post-build-refresh:')),
  /copernicus-current-progress-v3-|copernicus-current-shadow-v1-/,
  'Active orchestrator entrance must not restore a plaintext provider cache');

const restore = step(normal, 'Restore encrypted private weather progress only');
assert.match(restore, /actions\/cache\/restore@v6/);
assert.match(restore, /path: \.cache\/weather-private-progress\.encrypted/);
assert.match(restore, /weather-private-progress-encrypted-v2-/);
const shortRecoveryGate = step(normal, 'Require recovered progress before short confirmation');
assert.ok(shortRecoveryGate.includes("        if: inputs.quick_confirmation == true || inputs.quick_progress_source != ''\n"),
  'Every quick confirmation and explicit full-run source requires exact authenticated progress');
assert.match(shortRecoveryGate, /\.status == "RESTORED" and \.restored == true and \.fileCount > 0/);
assert.match(shortRecoveryGate, /test -s \.cache\/dmi-candidate-progress\.json/);
assert.match(shortRecoveryGate, /test "\$PROGRESS_CACHE_MATCHED_KEY" = "\$expected"/);
assert.ok(normal.indexOf(restore) < normal.indexOf(shortRecoveryGate));
const seal = step(normal, 'Encrypt newly saved private weather progress before later production steps');
assert.match(seal, /if: always\(\)/);
assert.match(seal, /steps\.preflight\.outputs\.should_run == 'true'/);
assert.match(seal, /steps\.component-progress-restore\.outputs\.captured == 'true'/);
assert.match(seal, /steps\.dmi-bulk\.outcome == 'success' \|\| steps\.dmi-bulk\.outcome == 'failure'/,
  'An early restore gate failure must not create a misleading new progress checkpoint');
const save = step(normal, 'Save only the authenticated encrypted private weather snapshot');
assert.match(save, /uses: \.\/\.github\/actions\/save-owned-dmi-grib/);
assert.match(save, /operation: upload-encrypted-progress\s+key: weather-private-progress-encrypted-v2-/);
assert.match(save,
  /always\(\).*steps\.component-progress-seal\.outcome == 'success'.*steps\.component-progress-seal\.outputs\.saved == 'true'/);
assert.match(save, /continue-on-error: true/);
assert.doesNotMatch(save, /\bpath:|actions\/cache\/save@/,
  'Cipher upload must not accept a caller path or bypass the owned operation');
const encryptedProgressUploadAction = read('.github/actions/save-owned-dmi-grib/index.cjs');
assert.match(encryptedProgressUploadAction, /const CIPHER_PATH = '\.cache\/weather-private-progress\.encrypted'/);
const coverage = step(normal, 'Report counts for each weather component after central cache');
const weather = step(normal, 'Update central weather cache');
assert.match(weather, /timeout-minutes: 80/);
assert.match(weather, /RAVRADAR_COMPONENT_COPERNICUS_BUDGET_MS: \$\{\{ inputs\.quick_confirmation && '45000' \|\| '90000' \}\}/);
assert.match(weather, /RAVRADAR_COMPONENT_OPEN_METEO_BUDGET_MS: \$\{\{ inputs\.quick_confirmation && '60000' \|\| '90000' \}\}/);
assert.match(coverage, /if: steps\.weather\.outcome == 'success'/);
assert.match(coverage, /continue-on-error: true/);
assert.match(coverage, /\.weatherEngine\.componentFallback/);
assert.match(coverage, /data\/live\/conditions\.json > "\$WEATHER_COMPONENT_SUMMARY_PATH"/);
assert.match(coverage, /import \{ safeWeatherComponentSummary \} from '\.\/scripts\/lib\/weather-component-safe-summary\.mjs'/);
assert.match(coverage, /console\.log\(JSON\.stringify\(safeWeatherComponentSummary\(summary\)\)\)/);
const safeProjection = read('scripts/lib/weather-component-safe-summary.mjs');
for (const field of ['before', 'afterCopernicus', 'after',
  'admittedCandidates', 'remainingNeeds', 'retryableAttempts', 'retryableReasons', 'transportFailure',
  'attemptCountsComplete', 'remainingUpgradeNeeds', 'passes', 'requestedNeeds', 'budgetMs',
  'deferred', 'failureCount', 'componentsNotAdmitted']) {
  assert.match(safeProjection, new RegExp(field));
}
assert.doesNotMatch(coverage, /lastAttemptedPartId|\$coverage\.openMeteo\.failures(?!\s*\|\s*length)/,
  'The safe component report must not print per-part cursor or raw failure rows');
assert.ok(normal.indexOf(coverage) < normal.indexOf(seal));
const cpQuality = step(normal, 'Reclaim a bounded Copernicus quality slice for the next normal run');
const cpQualityCheck = step(normal, 'Recheck reusable Copernicus evidence after optional quality work');
assert.match(cpQuality, /--refresh-only/);
assert.match(cpQuality, /--timeout-seconds 360/);
assert.match(cpQuality, /continue-on-error: true/);
assert.match(cpQualityCheck, /--require-source-stage-reusable/);
assert.ok(normal.indexOf(coverage) < normal.indexOf(cpQuality));
assert.ok(normal.indexOf(cpQuality) < normal.indexOf(cpQualityCheck));
assert.ok(normal.indexOf(cpQualityCheck) < normal.indexOf(seal));
assert.doesNotMatch(cpQuality, /actions\/cache\/(?:save|restore)/,
  'Copernicus quality work must use only the encrypted private progress path');

const dmiGribRestore = step(normal, 'Restore bounded DMI GRIB download cache');
const dmiGribSave = step(normal, 'Save progressed DMI GRIB download cache');
for (const official of [dmiGribRestore, dmiGribSave]) {
  assert.match(official, /\.cache\/dmi-grib/);
  assert.match(official, /dmi-grib-v4-/);
}

const dmi = step(normal, 'Update DMI bulk model cache');
const beforeDmi = step(normal, 'Plan global current acquisition before DMI');
const beforeCp = step(normal, 'Plan global current acquisition before Copernicus');
const cp = step(normal, 'Fill only exact-hour DMI gaps from Copernicus');
const om = step(normal, 'Fill only the exact remaining current gaps from Open-Meteo');
const terminal = step(normal, 'Require verified Open-Meteo residual checkpoint before closure');
assert.match(dmi, /inputs\.quick_confirmation && '900'/);
assert.match(dmi, /DMI_BULK_ADAPTIVE_RECOVERY: \$\{\{ inputs\.quick_confirmation != true &&/,
  'Short confirmation must not consume a one-hour adaptive recovery cooldown');
assert.ok(normal.indexOf(shortRecoveryGate) < normal.indexOf(dmi));
assert.match(cp, /inputs\.quick_confirmation && '120'/);
assert.match(om, /--runtime-seconds \$\{\{ inputs\.quick_confirmation && '120' \|\| '900' \}\}/);
assert.match(manual, /quick_confirmation: \$\{\{ inputs\.quick_confirmation \}\}/);
assert.match(manual, /quick_progress_source: \$\{\{ inputs\.quick_progress_source \}\}/);
assert.match(manual, /Progress source: exact encrypted-progress run-attempt for a full or short run; protected-current is short-only/);
const currentOriginalHour = step(normal, 'Require a strictly new normal hour for current-grid source succession');
assert.match(currentOriginalHour, /test "\$QUICK_CONFIRMATION" != 'true'/);
assert.match(currentOriginalHour, /target <= Date\.parse\(expected\.productionReferenceAt\)/);
assert.match(manual, /force: true\n      extended_provider_bootstrap: false\n      quick_confirmation: \$\{\{ inputs\.quick_confirmation \}\}/);
assert.ok(normal.indexOf(beforeDmi) < normal.indexOf(dmi));
assert.ok(normal.indexOf(dmi) < normal.indexOf(beforeCp));
assert.ok(normal.indexOf(beforeCp) < normal.indexOf(cp));
assert.ok(normal.indexOf(cp) < normal.indexOf(om));
assert.ok(normal.indexOf(om) < normal.indexOf(terminal));
assert.ok(normal.indexOf(terminal) < normal.indexOf(seal));
assert.match(dmi, /DMI_BULK_CURRENT_ACQUISITION_PLAN_PATH: \.cache\/weather-current-acquisition-plan\.json/);
assert.match(beforeCp, /--dmi \.cache\/dmi-candidate-progress\.json/);
for (const plan of [beforeDmi, beforeCp]) {
  assert.match(plan, /if ! python scripts\/build-weather-acquisition-plan\.py/);
  assert.match(plan, /rm -f \.cache\/weather-current-acquisition-plan\.json/);
  assert.match(plan, /continue-on-error: true/);
}
assert.match(terminal, /missing_pair_count/);
assert.match(terminal, /checkpoint_written/);

const safe = step(normal, 'Preserve safe weather acquisition diagnostics before terminal gates');
assert.match(safe, /actions\/upload-artifact@v7/);
assert.match(safe, /retention-days: 7/);
assert.doesNotMatch(safe, /currentUMps|currentVMps|donor-bank|shadow\.json/);

const retiredPostBuild = orchestrator.slice(
  orchestrator.indexOf('\n  copernicus-post-build-refresh:'),
  orchestrator.indexOf('\n  deploy-pages:'),
);
assert.match(retiredPostBuild, /&& false \}\}/);
const retiredKeepalive = watchdog.slice(
  watchdog.indexOf('\n  preserve:'),
  watchdog.indexOf('\n  retry-failed-production:'),
);
assert.match(retiredKeepalive, /&& false/);
for (const job of ['validate', 'operational-118-preflight', 'resume-private-capacity-and-seal-handoff', 'current-input-diagnostic']) {
  const start = retiredOneoff.indexOf(`\n  ${job}:`);
  assert.ok(start >= 0, `Retired one-off job missing: ${job}`);
  const header = retiredOneoff.slice(start, start + 1200);
  assert.match(header, /if: .*&& false/);
}

const weatherRuntime = read('scripts/update-weather.mjs');
function assertCacheOnlyBeforeFetch(runtime) {
  assert.equal((runtime.match(/\bfetch\(/g) || []).length, 1,
    'All update:weather network access must remain behind fetchJson');
  assert.equal((runtime.match(/^async function fetchJson\(/gm) || []).length, 1,
    'Exactly one actual fetchJson declaration');
  const start = runtime.indexOf('async function fetchJson(');
  const end = runtime.indexOf('\nasync function fetchAllFeatures(', start);
  assert.ok(start >= 0 && end > start, 'Actual fetchJson extraction must be bounded');
  const fetchJson = runtime.slice(start, end);
  const guard = fetchJson.match(/^  if \(WEATHER_CACHE_ONLY\) \{\n    const error = new Error\([^\n]+\);\n    error\.code = 'WEATHER_CACHE_ONLY_NETWORK_DISABLED';\n    throw error;\n  \}\n/m)?.[0];
  assert.ok(guard, 'Cache-only mode must throw its existing error');
  assert.match(fetchJson, /^async function fetchJson\([^\n]+\) \{\n  assertWeatherTransportSettlement\(\);\n  if \(WEATHER_CACHE_ONLY\) \{/,
    'Cache-only rejection stays at the actual function entry');
  const cacheOnlyGuard = fetchJson.indexOf(guard);
  const networkFetch = fetchJson.indexOf('response = await fetch(url');
  assert.equal((fetchJson.match(/\bfetch\(/g) || []).length, 1,
    'The sole network fetch must be inside actual fetchJson');
  assert.ok(cacheOnlyGuard >= 0 && networkFetch > cacheOnlyGuard + guard.length,
    'Cache-only guard must fail before the sole network fetch');
  assert.match(fetchJson, /error\.code = 'WEATHER_CACHE_ONLY_NETWORK_DISABLED'/);
  return guard;
}
const cacheOnlyGuard = assertCacheOnlyBeforeFetch(weatherRuntime);
assert.throws(() => assertCacheOnlyBeforeFetch(weatherRuntime.replace(cacheOnlyGuard, '')),
  'A removed cache-only rejection must fail the static contract');
assert.throws(() => assertCacheOnlyBeforeFetch(weatherRuntime.replace(cacheOnlyGuard, '')
  .replace('  throw lastError ??', `${cacheOnlyGuard}  throw lastError ??`)),
  'A rejection moved after the network fetch must fail the static contract');
assert.throws(() => assertCacheOnlyBeforeFetch(`${weatherRuntime}\nfetch('synthetic-only');\n`),
  'An additional fetch must fail the static contract');
assert.throws(() => assertCacheOnlyBeforeFetch(weatherRuntime
  .replace('response = await fetch(url', 'response = await syntheticTransport(url')
  + '\nasync function syntheticOutside() { const response = await fetch(url); }\n'),
  'A sole fetch outside fetchJson must fail the static contract');

// Explicit checkpoint continuation is a real normal build, not a fabricated
// provider handoff. Its untrusted hour hint is confirmed by authenticated input.
assert.match(manual, /checkpoint_target_hour:\s+description: '[^']+'\s+required: false\s+type: string\s+default: ''/);
assert.match(normal, /checkpoint_only:\s+required: false\s+type: boolean\s+default: false/);
assert.match(orchestrator, /^      checkpoint_only: false$/m,
  'Automated production must keep ordinary acquisition by default');
assert.ok(manual.includes("      checkpoint_only: ${{ inputs.checkpoint_target_hour != '' }}"));
const originalHour = step(manual, 'Lock the requested original checkpoint hour without provider work');
assert.ok(originalHour.includes("if: inputs.checkpoint_target_hour != ''"));
assert.match(originalHour, /test "\$QUICK_CONFIRMATION" = false/);
assert.match(originalHour, /\[\[ "\$QUICK_PROGRESS_SOURCE" =~ \^\[1-9\]\[0-9\]\*-\[1-9\]\[0-9\]\*\$ \]\]/);
assert.match(originalHour, /check-production-target-freshness\.mjs/);
assert.doesNotMatch(originalHour, /DMI_API_KEY|fetch\(|curl |requests\./);
const offlineRequest = step(normal, 'Validate provider-free checkpoint continuation request');
const offlineHour = step(normal, 'Require the authenticated original hour before provider-free continuation');
assert.match(offlineRequest, /if: inputs\.checkpoint_only == true/);
assert.match(offlineRequest, /test "\$QUICK_CONFIRMATION" = false/);
assert.match(offlineRequest, /steps\.private-runtime-install\.outcome.*success/);
assert.match(offlineRequest, /steps\.private-runtime-state\.outputs\.available.*true/);
assert.match(offlineRequest, /integrated\|integrated-historical-maintenance/);
assert.match(offlineHour, /report\.status !== 'RESTORED' \|\| report\.restored !== true/);
assert.match(offlineHour, /report\.restoredProductionReferenceAt/);
assert.match(offlineHour, /process\.env\.RAVRADAR_PRODUCTION_TARGET_HOUR/);
assert.ok(normal.indexOf(offlineRequest) < normal.indexOf(restore));
assert.ok(normal.indexOf(shortRecoveryGate) < normal.indexOf(offlineHour));
assert.ok(normal.indexOf(offlineHour) < normal.indexOf(dmi));
const progressBind = step(normal, 'Bind optional progress to the exact protected baseline');
assert.match(progressBind, /restore_arguments=\(\)/);
assert.match(progressBind, /restore_arguments=\(--resume-original-target true\)/);
assert.match(progressBind, /--report "\$RUNNER_TEMP\/weather-progress-restore-report\.json" "\$\{restore_arguments\[@\]\}"/);
const generationPrepare = step(normal, 'Prepare strict active DMI donor or resumable candidate');
assert.ok(generationPrepare.indexOf('inputs.checkpoint_only')
  < generationPrepare.indexOf('steps.dmi-active-restore.outputs.available'),
  'Explicit continuation may not replace its authenticated candidate with an older active donor');
assert.match(dmi, /DMI_BULK_CACHE_ONLY: \$\{\{ inputs\.checkpoint_only \}\}/);
assert.match(dmi, /continue-on-error: \$\{\{ inputs\.checkpoint_only != true \}\}/);
for (const providerStep of [cp, cpQuality,
  step(normal, 'Refresh DMI water-source registry'),
  step(normal, 'Install targeted Copernicus dependencies'),
  step(normal, 'Verify targeted Copernicus credentials')]) {
  assert.match(providerStep, /inputs\.checkpoint_only != true/);
}
assert.ok(om.includes("${{ inputs.checkpoint_only && '--reuse-only' || '' }}"));
assert.match(weather, /RAVRADAR_WEATHER_CACHE_ONLY: \$\{\{ inputs\.checkpoint_only \}\}/);
assert.doesNotMatch(offlineRequest + offlineHour, /DMI_HANDOFF_VERIFIED|strict_active_ready=true|reused=true/,
  'A checkpoint request must not invent a successful producer or handoff');

console.log('OK: DMI-first acquisition, one encrypted private progress path, safe diagnostics and retired plaintext entrances.');
