import assert from 'node:assert/strict';
import fs from 'node:fs';

// Static workflow contract only. Never reads private data or calls a provider.
const read = file => fs.readFileSync(file, 'utf8').replaceAll('\r\n', '\n');
const normal = read('.github/workflows/reusable-weather-build.yml');
const orchestrator = read('.github/workflows/update-and-deploy.yml');
const manual = read('.github/workflows/run-current-weather-once.yml');
const watchdog = read('.github/workflows/preserve-copernicus-current-shadow.yml');
const retiredOneoff = read('.github/workflows/validate-copernicus-current-pilot.yml');
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
const seal = step(normal, 'Encrypt newly saved private weather progress before later production steps');
assert.match(seal, /if: always\(\)/);
assert.match(seal, /steps\.preflight\.outputs\.should_run == 'true'/);
assert.match(seal, /steps\.component-progress-restore\.outputs\.captured == 'true'/);
const save = step(normal, 'Save only the authenticated encrypted private weather snapshot');
assert.match(save, /path: \.cache\/weather-private-progress\.encrypted/);
assert.match(save, /weather-private-progress-encrypted-v2-/);

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
assert.equal((weatherRuntime.match(/\bfetch\(/g) || []).length, 1,
  'All update:weather network access must remain behind fetchJson');
const cacheOnlyGuard = weatherRuntime.indexOf('if (WEATHER_CACHE_ONLY) {');
const networkFetch = weatherRuntime.indexOf('const response = await fetch(url');
assert.ok(cacheOnlyGuard >= 0 && networkFetch > cacheOnlyGuard,
  'Cache-only guard must fail before the sole network fetch');
assert.match(weatherRuntime, /error\.code = 'WEATHER_CACHE_ONLY_NETWORK_DISABLED'/);

console.log('OK: DMI-first acquisition, one encrypted private progress path, safe diagnostics and retired plaintext entrances.');
