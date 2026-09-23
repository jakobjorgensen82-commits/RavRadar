import assert from 'node:assert/strict';
import fs from 'node:fs/promises';

const workflow = (await fs.readFile('.github/workflows/reusable-weather-build.yml', 'utf8'))
  .replace(/\r\n/g, '\n');
const step = name => {
  const start = workflow.indexOf(`      - name: ${name}\n`);
  assert.ok(start >= 0, `missing ${name}`);
  const end = workflow.indexOf('\n      - ', start + 1);
  return workflow.slice(start, end < 0 ? workflow.length : end);
};
const install = workflow.indexOf('id: private-runtime-install');
const capture = workflow.indexOf('id: component-progress-restore');
const weather = workflow.indexOf('id: weather\n');
const seal = workflow.indexOf('id: component-progress-seal');
const gates = workflow.indexOf('- name: Validate critical production artifact after fresh weather and current provenance');
assert.ok(install < capture && capture < weather && weather < seal && seal < gates);
const restore = step('Restore encrypted private weather progress only');
const bind = step('Bind optional progress to the exact protected baseline');
for (const value of [restore, bind]) {
  assert.match(value, /github.ref == 'refs\/heads\/main'/);
  assert.match(value, /github.event_name != 'pull_request_target'/);
  assert.match(value, /steps.private-runtime-install.outcome == 'success'/);
  assert.match(value, /steps.weather-source-handoff.outputs.reused != 'true'/);
}
assert.match(restore, /path: \.cache\/weather-private-progress.encrypted\s+key: weather-private-progress-encrypted-v2-/);
assert.doesNotMatch(restore, /path:.*(?:\*|bank|components\/)/);
assert.doesNotMatch(bind, /continue-on-error|\|\| true/);
assert.match(bind, /capture-base[\s\S]*restore \\/);
assert.match(bind, /privateRuntimeBundleContentSha256\(manifest\)/);
assert.match(bind, /process\.env\.RAVRADAR_PRIVATE_RUNTIME_BUNDLE/);
assert.match(bind, /--protected-bundle-sha256 "\$protected_bundle_sha256"/);
assert.match(bind, /WEATHER_PROGRESS_MASTER_SECRET: \$\{\{ secrets\.SUPABASE_SERVICE_ROLE_KEY \}\}/);
const save = step('Encrypt newly saved private weather progress before later production steps');
assert.match(save, /always\(\)/);
assert.match(save, /steps.preflight.outputs.should_run == 'true'/);
assert.match(save, /steps.component-progress-restore.outcome == 'success'/);
assert.match(save, /steps.component-progress-restore.outputs.captured == 'true'/);
assert.doesNotMatch(save, /steps.weather.outcome/,
  'Provider progress must survive even when an earlier terminal gate skips the weather builder');
assert.match(save, /saved == true/);
assert.match(save, /WEATHER_PROGRESS_MASTER_SECRET: \$\{\{ secrets\.SUPABASE_SERVICE_ROLE_KEY \}\}/);
const upload = step('Save only the authenticated encrypted private weather snapshot');
assert.match(upload, /always\(\).*steps.component-progress-seal.outputs.saved == 'true'/);
assert.match(upload, /path: \.cache\/weather-private-progress.encrypted\s+key: weather-private-progress-encrypted-v2-/);
for (const file of ['update-and-deploy', 'run-current-weather-once']) {
  const caller = await fs.readFile(`.github/workflows/${file}.yml`, 'utf8');
  assert.doesNotMatch(caller, /WEATHER_PROGRESS_ENCRYPTION_KEY/);
}
console.log('Encrypted private weather progress: shared normal caller order, trusted restore, ciphertext-only save and failure recovery passed.');
