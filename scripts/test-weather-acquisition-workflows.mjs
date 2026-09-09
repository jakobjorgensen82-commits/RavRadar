import assert from 'node:assert/strict';
import fs from 'node:fs';

// Static workflow contract only. Never reads a cache or calls a provider.
const read = path => fs.readFileSync(path, 'utf8').replaceAll('\r\n', '\n');
const normal = read('.github/workflows/reusable-weather-build.yml');
const pilotWorkflow = read('.github/workflows/validate-copernicus-current-pilot.yml');
const orchestrator = read('.github/workflows/update-and-deploy.yml');
const oneoffStart = pilotWorkflow.indexOf('\n  operational-118-preflight:');
assert.ok(oneoffStart > 0);
const pilot = pilotWorkflow.slice(0, oneoffStart);
const oneoff = pilotWorkflow.slice(oneoffStart);
const qualityStart = orchestrator.indexOf('\n  copernicus-post-build-refresh:');
const qualityEnd = orchestrator.indexOf('\n  deploy-pages:', qualityStart);
assert.ok(qualityStart > 0 && qualityEnd > qualityStart);
const quality = orchestrator.slice(qualityStart, qualityEnd);
const blocks = source => source.split(/(?=^      - (?:name:|uses:))/m);
function step(source, name) {
  const found = blocks(source).filter(block => block.startsWith(`      - name: ${name}\n`));
  assert.equal(found.length, 1, `Exactly one step: ${name}`);
  return found[0];
}
function paths(block) {
  const rows = block.split('\n');
  const index = rows.findIndex(row => row.startsWith('          path: '));
  assert.ok(index >= 0, 'Cache/artifact path must be explicit');
  const first = rows[index].slice('          path: '.length).trim();
  if (first !== '|') return [first];
  const result = [];
  for (let offset = index + 1; rows[offset]?.startsWith('            '); offset += 1) {
    result.push(rows[offset].trim());
  }
  return result;
}
const cpLegacy = ['.cache/copernicus-current-shadow.json', '.cache/copernicus-current-source-stage.json'];
const omLegacy = ['.cache/open-meteo-current-fallback.json'];
const cpBank = [
  '.cache/copernicus-current-donor-bank.json',
  '.cache/copernicus-current-donor-bank.json.invalid-*',
  '.cache/copernicus-current-shadow.json.invalid-*',
  '.cache/copernicus-current-source-stage.json.invalid-*',
];
const omBank = [
  '.cache/open-meteo-current-donor-bank.json',
  '.cache/open-meteo-current-donor-bank.json.rejected',
  '.cache/open-meteo-current-donor-bank.json.rejected.previous',
  '.cache/open-meteo-current-fallback.json.rejected',
  '.cache/open-meteo-current-fallback.json.rejected.previous',
];
const safeReports = [
  'data/diagnostics/weather-acquisition-plan-before-dmi.json',
  'data/diagnostics/weather-acquisition-plan-before-copernicus.json',
  'data/diagnostics/open-meteo-current-fetch.json',
];
for (const source of [normal, pilotWorkflow, quality]) {
  assert.doesNotMatch(source, /rm -f \.cache\/copernicus-current-source-stage\.json/,
    'Original admission evidence must survive until the validated donor migration');
  for (const block of blocks(source).filter(block => block.includes('uses: actions/cache/'))) {
    if (/key: copernicus-current-progress-v3-/.test(block)) assert.deepEqual(paths(block), cpLegacy);
    if (/key: open-meteo-current-fallback-v2-/.test(block)) assert.deepEqual(paths(block), omLegacy);
    if (/key: copernicus-current-donor-bank-v1-/.test(block)) assert.deepEqual(paths(block), cpBank);
    if (/key: open-meteo-current-donor-bank-v1-/.test(block)) assert.deepEqual(paths(block), omBank);
  }
}
for (const [source, dmiName, cpBankRestore] of [
  [normal, 'Update DMI bulk model cache', 'Restore shared private Copernicus donor bank'],
  [oneoff, 'Refresh all bounded official DMI collections for the proof', 'Restore shared private Copernicus donor bank before DMI'],
]) {
  const dmi = step(source, dmiName);
  const beforeDmi = step(source, 'Plan global current acquisition before DMI');
  const beforeCp = step(source, 'Plan global current acquisition before Copernicus');
  for (const name of [cpBankRestore, 'Restore shared private Open-Meteo current progress', 'Restore shared private Open-Meteo donor bank']) {
    const restore = step(source, name);
    assert.match(restore, /uses: actions\/cache\/restore@v6/);
    assert.ok(source.indexOf(restore) < source.indexOf(beforeDmi));
  }
  assert.ok(source.indexOf(beforeDmi) < source.indexOf(dmi));
  assert.match(dmi, /DMI_BULK_CURRENT_ACQUISITION_PLAN_PATH: \.cache\/weather-current-acquisition-plan\.json/);
  assert.doesNotMatch(beforeDmi, /--dmi(?:\s|$)/, 'DMI binds regional planning against its new official catalog');
  assert.match(beforeCp, /--dmi \.cache\/dmi-candidate-progress\.json/);
  assert.ok(source.indexOf(beforeCp) > source.indexOf(dmi));
  for (const plan of [beforeDmi, beforeCp]) {
    assert.match(plan, /if ! python scripts\/build-weather-acquisition-plan\.py/);
    assert.match(plan, /rm -f \.cache\/weather-current-acquisition-plan\.json/);
    assert.match(plan, /::warning::/);
    assert.match(plan, /continue-on-error: true/);
  }
  const omAuthority = step(source, 'Reconfirm exact main before shared Open-Meteo progress cache');
  assert.match(omAuthority, /checkpoint_written == 'true' \|\| steps\.open-meteo-fill\.outputs\.donor_bank_written == 'true'/);
  assert.match(omAuthority, /git rev-parse origin\/main\^\{commit\}/);
  assert.match(omAuthority, /git rev-parse HEAD\^\{commit\}/);
  assert.match(omAuthority, /test "\$GITHUB_REF" = "refs\/heads\/main"/);
  const omSave = step(source, 'Save shared private Open-Meteo donor bank before projection gates');
  assert.match(omSave, /if: always\(\)/);
  assert.match(omSave, /open-meteo-progress-write-authority\.outcome == 'success'/);
  assert.match(omSave, /donor_bank_written == 'true'/);
  assert.doesNotMatch(omSave, /checkpoint_written|missing_pair_count/);
  const legacySave = step(source, 'Save shared private Open-Meteo current progress');
  assert.match(legacySave, /checkpoint_written == 'true'/);
  assert.ok(source.indexOf(omSave) < source.indexOf(legacySave));
  const terminal = step(source, 'Require complete Open-Meteo residual before freshness and closure');
  assert.match(terminal, /missing_pair_count/);
  assert.match(terminal, /checkpoint_written/);
  const safe = step(source, 'Preserve safe weather acquisition diagnostics before terminal gates');
  assert.match(safe, /if: always\(\)/);
  assert.match(safe, /retention-days: 7/);
  assert.match(safe, /uses: actions\/upload-artifact@v7/);
  assert.deepEqual(paths(safe), safeReports);
  assert.ok(source.indexOf(safe) > source.indexOf(omSave));
  assert.ok(source.indexOf(safe) < source.indexOf(terminal));
}
assert.match(step(oneoff, 'Plan global current acquisition before DMI'), /--at "\$\{\{ steps\.operational-target\.outputs\.target_hour \}\}"/);
assert.match(step(normal, 'Plan global current acquisition before DMI'), /--at "\$RAVRADAR_PRODUCTION_TARGET_HOUR"/);
for (const [source, saveName, authority, legacyName, terminalName] of [
  [normal, 'Save shared private Copernicus donor bank before projection gates', 'copernicus-progress-write-authority', 'Save non-cancelled private Copernicus source-stage progress', 'Require reusable Copernicus source stage before combined current closure'],
  [oneoff, 'Save shared private Copernicus one-off donor bank before projection gates', 'oneoff-copernicus-progress-write-authority', 'Save non-cancelled private Copernicus source-stage progress', 'Require reusable Copernicus source stage'],
  [pilot, 'Save shared private Copernicus pilot donor bank before projection gates', 'pilot-copernicus-progress-write-authority', 'Save non-cancelled Copernicus source-stage progress', 'Prove the resulting exact Copernicus source stage'],
  [quality, 'Save post-build Copernicus donor bank before projection validation', 'copernicus-refresh-bank-write-authority', 'Save successful post-build Copernicus maintenance under shared progress prefix', 'Validate refreshed private Copernicus package without changing artifact outcome'],
]) {
  const save = step(source, saveName);
  assert.match(save, /if: always\(\)/);
  assert.ok(save.includes(`${authority}.outcome == 'success'`));
  assert.match(save, /donor_bank_written == 'true'/);
  assert.doesNotMatch(save, /maintenance_completed|source_stage_ready/);
  assert.ok(source.indexOf(save) < source.indexOf(step(source, legacyName)));
  assert.ok(source.indexOf(save) < source.indexOf(step(source, terminalName)));
  const proof = blocks(source).find(block => block.includes(`id: ${authority}\n`));
  assert.ok(proof);
  assert.match(proof, /git rev-parse origin\/main\^\{commit\}/);
  assert.match(proof, /git rev-parse HEAD\^\{commit\}/);
  assert.match(proof, /test "\$GITHUB_REF" = "refs\/heads\/main"/);
}
const exactInput = step(quality, 'Restore exact private Copernicus post-build refresh input');
assert.deepEqual(paths(exactInput), [...cpLegacy, '.cache/copernicus-current-targets.json',
  '.cache/copernicus-post-build-authoritative-targets.json', '.cache/copernicus-post-build-refresh-manifest.json',
  '.cache/weather-source-validation.json']);
assert.doesNotMatch(exactInput, /restore-keys:/);
assert.match(exactInput, /fail-on-cache-miss: true/);
const qualityRestore = step(quality, 'Restore shared private Copernicus donor bank for post-build maintenance');
assert.ok(quality.indexOf(qualityRestore) > quality.indexOf(step(quality, 'Verify exact private Copernicus post-build refresh input')));
assert.ok(quality.indexOf(qualityRestore) < quality.indexOf(step(quality, 'Refresh only the next-run private Copernicus cache')));
assert.match(step(pilot, 'Restore shared private Copernicus donor bank for pilot'), /target-registry\.outcome == 'success'/);
console.log('OK: exact legacy cache versions, private donor banks, advisory union planning and independent final gates.');
