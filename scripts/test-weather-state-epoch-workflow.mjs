import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { fstatSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import vm from 'node:vm';
import test from 'node:test';

const wrapper = (await fs.readFile('.github/workflows/run-current-weather-once.yml', 'utf8')).replaceAll('\r\n', '\n');
const build = (await fs.readFile('.github/workflows/reusable-weather-build.yml', 'utf8')).replaceAll('\r\n', '\n');
function block(text, header) {
  const at = text.indexOf(header + '\n'); assert(at >= 0, header);
  const indent = header.match(/^ */)[0].length;
  const lines = text.slice(at + header.length + 1).split('\n'), result = [];
  for (const line of lines) { if (line.trim() && line.match(/^ */)[0].length <= indent) break; result.push(line); }
  return result.join('\n');
}
const step = (text, name) => block(text, '      - name: ' + name);
const job = name => block(wrapper, '  ' + name + ':');
function expression(value, context) {
  return vm.runInNewContext(value.replace(/^\$\{\{\s*|\s*\}\}$/g, '')
    .replace(/\b(needs|steps)\.([a-z][a-z0-9-]*)/g, (_, key, name) => `${key}[${JSON.stringify(name)}]`),
  { ...context, cancelled: () => false, format: (format, ...args) => format.replace(/\{([0-9]+)\}/g, (_, n) => args[Number(n)]) });
}
const defaults = { weather_state_epoch_bootstrap: false, native_sampling_identity_original_recovery: false,
  extended_provider_bootstrap: false, quick_confirmation: false, checkpoint_only: false, quick_progress_source: '' };

test('default/manual/epoch dependency outcomes are evaluated, not accepted from a skipped prewrite', () => {
  assert.match(wrapper, /weather_state_epoch_bootstrap:[\s\S]*?type: boolean\n        default: false/);
  assert.match(wrapper, /group: ravradar-weather-production-v2\n  queue: max\n  cancel-in-progress: false/);
  const caller = job('build-and-prepare');
  const condition = caller.split('    if: >-\n')[1].split('    permissions:')[0].trim().replaceAll('\n', ' ');
  const needs = { 'current-main-target': { result: 'success' }, 'native-identity-prewrite': { result: 'skipped' },
    'state-epoch-prewrite': { result: 'skipped' } };
  assert.equal(expression(condition, { inputs: defaults, needs }), true);
  assert.equal(expression(condition, { inputs: { ...defaults, weather_state_epoch_bootstrap: true }, needs }), false);
  needs['state-epoch-prewrite'].result = 'success';
  assert.equal(expression(condition, { inputs: { ...defaults, weather_state_epoch_bootstrap: true }, needs }), true);
  assert.equal(expression(condition, { inputs: defaults, needs }), false);
  needs['state-epoch-prewrite'].result = 'failure';
  assert.equal(expression(condition, { inputs: { ...defaults, weather_state_epoch_bootstrap: true }, needs }), false);
  assert.match(caller, /extended_provider_bootstrap: \$\{\{ inputs.weather_state_epoch_bootstrap == true \}\}/);
  for (const field of ['archive_key', 'archive_catalog_sha256']) assert(caller.includes('needs.state-epoch-prewrite.outputs.' + field));
  assert(!caller.includes('SUPABASE_DB_PASSWORD')); assert(!build.includes('SUPABASE_DB_PASSWORD'));
});

test('epoch archives real six-file public snapshot before sole230 and sole new binding writes', () => {
  const prewrite = job('state-epoch-prewrite');
  assert.match(prewrite, /timeout-minutes: 120/);
  assert(prewrite.includes('node scripts/weather-source-gate.mjs check'));
  assert(prewrite.includes('node scripts/check-fixed-supabase-account-read-idle.mjs'));
  assert(prewrite.includes('normal.prepareTemporarySupabaseCutoverWorkdir({ workdir, includeStatisticsPreferenceRevisionSource: true })'));
  assert(prewrite.includes('normal.hydrateTemporaryRemoteMigrationHistory({ workdir, migrationListText })'));
  assert(prewrite.includes('constants.COPYFILE_EXCL'));
  assert(!prewrite.includes('RECOVER_PUBLIC_RUN_ID')); assert(!prewrite.includes('actions/cache/restore'));
  for (const file of ['manifest.json', 'public-conditions.json', 'public-condition-details.json',
    'coastal-parts-v2.json', 'zones.geojson', 'water-level-station-routing.json']) assert(prewrite.includes("'" + file + "'"));
  assert(prewrite.includes("fetch('https://ravradar.dk/' + remote"));
  assert(prewrite.indexOf('phase="$(stage prepare)"') < prewrite.indexOf('stage verify-230-plan'));
  assert(prewrite.indexOf('stage verify-230-plan') < prewrite.indexOf('(cd "$view230" && db db push --linked --skip-vault)'));
  assert(prewrite.indexOf('stage verify-230-installed') < prewrite.indexOf('stage verify-binding-plan'));
  assert(prewrite.indexOf('stage verify-binding-plan') < prewrite.indexOf('(cd "$viewbinding" && db db push --linked --skip-vault)'));
  assert(prewrite.includes('env -u SUPABASE_DB_PASSWORD node scripts/weather-state-epoch.mjs "$1"'));
  assert(prewrite.includes('stage verify-binding-installed'));
  assert(!prewrite.includes('continue-on-error'));
});

test('epoch budget is a one-off 360-minute build with a measured first step and unchanged provider caps', () => {
  const timeout = /^    timeout-minutes: (.+)$/m.exec(build)[1];
  assert.equal(expression(timeout, { inputs: defaults }), 230);
  assert.equal(expression(timeout, { inputs: { ...defaults, extended_provider_bootstrap: true } }), 240);
  assert.equal(expression(timeout, { inputs: { ...defaults, weather_state_epoch_bootstrap: true, extended_provider_bootstrap: true } }), 360);
  assert(build.indexOf('date +%s%3N') < build.indexOf('uses: actions/checkout'));
  assert(step(build, 'Record the actual epoch build start before checkout').includes('set -o noclobber'));
  for (const [phase, next] of [['dmi', 'Update DMI bulk model cache'], ['copernicus', 'Fill only exact-hour DMI gaps from Copernicus'],
    ['open-meteo', 'Fill only the exact remaining current gaps from Open-Meteo'], ['weather', 'Update central weather cache']]) {
    const fence = 'Preserve the fixed epoch post-processing reserve before ' + phase;
    assert(build.indexOf('      - name: ' + fence) < build.indexOf('      - name: ' + next));
    assert.match(step(build, fence), /if: inputs.weather_state_epoch_bootstrap == true && steps.preflight.outputs.should_run == 'true'/);
    assert(!step(build, fence).includes('continue-on-error'));
  }
  assert(step(build, 'Update DMI bulk model cache').includes("&& '3600'"));
  assert(step(build, 'Fill only exact-hour DMI gaps from Copernicus').includes("&& '3300'"));
  assert(step(build, 'Fill only the exact remaining current gaps from Open-Meteo').includes("'900'"));
  assert(step(build, 'Update central weather cache').includes('timeout-minutes: 80'));
  assert(step(build, 'Require the one-off epoch interface without changing its already locked target').includes('build-request'));
});

test('fresh acquisition cannot take OLD candidate/fallback or mutate original point staging', () => {
  const prepare = step(build, 'Prepare strict active DMI donor or resumable candidate');
  assert(prepare.indexOf('inputs.weather_state_epoch_bootstrap') < prepare.indexOf('steps.dmi-active-restore.outputs.available'));
  assert(prepare.includes("printf '%s\\n' '{\"zones\":{}}'"));
  assert(prepare.includes('python scripts/materialize-dmi-bulk-storage.py --input "$source_path"'));
  const dmi = step(build, 'Update DMI bulk model cache');
  assert.match(dmi, /DMI_BULK_DEPLOYED_FALLBACK_PATH: .*inputs.weather_state_epoch_bootstrap.*empty-dmi-candidate.json/);
  assert.match(dmi, /COASTAL_POINT_STAGE_PATH: .*inputs.weather_state_epoch_bootstrap.*acquisition-point-stage.json/);
  assert(dmi.includes('DMI_BULK_OUTPUT_PATH: .cache/dmi-candidate-progress.json'));
  assert(step(build, 'Preserve deployed DMI zone cache as safe fallback').includes('cp data/live/dmi-bulk-cache.json .cache/deployed-dmi-bulk-cache.json'));
  for (const name of ['Prepare only an explicitly requested READY point activation',
    'Advance private point-candidate readiness without public score impact', 'Atomically promote the validated point candidate in central admin storage'])
    assert(step(build, name).includes('inputs.weather_state_epoch_bootstrap != true'));
  assert(step(build, 'Restore encrypted private weather progress only').includes('inputs.weather_state_epoch_bootstrap != true'));
  for (const name of ['Inspect private production runtime availability', 'Install only the allowlisted restored private runtime files',
    'Bind optional progress to the exact protected baseline']) {
    assert(step(build, name).includes('node scripts/weather-state-epoch.mjs verify'));
    assert(step(build, name).includes('SUPABASE_SERVICE_ROLE_KEY:'));
  }
  for (const name of ['Plan bounded current history from the actual selected continuation', 'Update central weather cache']) {
    const body = step(build, name); assert(body.includes('SUPABASE_SERVICE_ROLE_KEY:')); assert(!body.includes('SUPABASE_ACCESS_TOKEN'));
  }
  const final = step(build, 'Preserve the exact current-grid Pages target before remote upload');
  for (const proof of ['steps.weather.outcome', 'steps.full-validation.outcome', 'steps.release-gate.outcome',
    'steps.checkpoint-publish.outcome', 'steps.private-runtime-publish.outcome', 'steps.state-epoch-runtime-install.outcome']) assert(final.includes(proof));
  assert(!final.includes('weather-state-epoch.mjs verify'), 'OLD input authority must not be rechecked after a genuine NEW B/S publish');
});

test('actual inline public writer preserves first error and refuses a physically open descriptor', async () => {
  const text = step(wrapper, 'Capture the six actual public files for the immutable epoch archive');
  const body = text.slice(text.indexOf('const read = async'), text.indexOf("          await read('data/live/manifest.json'"));
  assert(body.endsWith('          };\n'), 'Extract the complete inline writer, excluding all network callsites');
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'rr-epoch-public-writer-'));
  const owned = [];
  try {
    for (const mode of ['success', 'write-failure', 'close-noop']) {
      const retainedHandles = new Set(), handles = [];
      const first = new Error('SYNTHETIC_WRITE_FAILURE');
      const wrappedFs = { async open(...args) {
        const handle = await fs.open(...args); handles.push(handle); owned.push(args[0]);
        return { fd: handle.fd, writeFile: mode === 'write-failure' ? async () => { throw first; } : (...a) => handle.writeFile(...a),
          sync: () => handle.sync(), close: mode === 'close-noop' ? async () => {} : () => handle.close() };
      } };
      const factory = vm.runInNewContext('(async () => { ' + body + '; return read; })()', {
        assert, fs: wrappedFs, path, root, retainedHandles, fstatSync, Error, signal: new AbortController().signal,
        fetch: async () => new Response('genuine local bytes'),
      });
      const read = await factory;
      if (mode === 'success') { await read('fixed', mode, 64); assert.equal(retainedHandles.size, 0); }
      else if (mode === 'write-failure') {
        await assert.rejects(read('fixed', mode, 64), error => error === first);
        assert.equal(retainedHandles.size, 0);
      } else {
        await assert.rejects(read('fixed', mode, 64), /PUBLIC_CLOSE_UNPROVED/);
        assert.equal(retainedHandles.size, 1);
        assert.doesNotThrow(() => fstatSync(handles[0].fd));
      }
      for (const handle of handles) if (handle.fd !== -1) await handle.close();
    }
  } finally { for (const file of owned) await fs.unlink(file); await fs.rmdir(root); }
});
