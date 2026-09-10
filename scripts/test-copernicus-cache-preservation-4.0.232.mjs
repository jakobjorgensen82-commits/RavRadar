import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { readProductionWorkflowSource } from './lib/production-workflow-sources.mjs';

const buildWorkflow = await readProductionWorkflowSource('build');
const packageDoc = JSON.parse(await fs.readFile('package.json', 'utf8'));
const copernicusRunner = await fs.readFile('scripts/run-copernicus-current-pilot.py', 'utf8');
const copernicusBank = await fs.readFile('scripts/lib/copernicus_current_donor_bank.py', 'utf8');

function pythonFunctionBlock(source, name) {
  const marker = `def ${name}(`;
  const start = source.indexOf(marker);
  assert.ok(start >= 0, `Missing Python contract function: ${name}`);
  const next = source.indexOf('\ndef ', start + marker.length);
  return source.slice(start, next < 0 ? undefined : next);
}

const refreshStart = buildWorkflow.indexOf('- name: Refresh private Copernicus cache before DMI cache churn');
const dmiRestoreStart = buildWorkflow.indexOf('- name: Restore bounded DMI GRIB download cache');
const dmiUpdateStart = buildWorkflow.indexOf('- name: Update DMI bulk model cache');
const dmiSaveStart = buildWorkflow.indexOf('- name: Save progressed DMI GRIB download cache');
const postDmiRefreshStart = buildWorkflow.indexOf('- name: Refresh private Copernicus cache after DMI cache churn');
const targetSelectStart = buildWorkflow.indexOf('- name: Select exact-hour DMI gaps for targeted Copernicus supplement');
const targetInspectStart = buildWorkflow.indexOf('- name: Inspect target-bound Copernicus source stage after fresh DMI');
const targetNormalizeStart = buildWorkflow.indexOf('- name: Preserve original Copernicus admission evidence before production rebase');
const targetRunStart = buildWorkflow.indexOf('- name: Fill only exact-hour DMI gaps from Copernicus');
const targetProgressSaveStart = buildWorkflow.indexOf('- name: Save non-cancelled private Copernicus source-stage progress');
const sourceStageGateStart = buildWorkflow.indexOf('- name: Require reusable Copernicus source stage before combined current closure');
const targetSaveStart = buildWorkflow.indexOf('- name: Save validated private Copernicus progress before downstream closure');
const openMeteoStart = buildWorkflow.indexOf('- name: Fill only the exact remaining current gaps from Open-Meteo');
const freshnessStart = buildWorkflow.indexOf('- name: Classify target freshness after the bounded supplier chain');
const closureStart = buildWorkflow.indexOf('- name: Build exact DMI-first current operational closure');
const historyBuildStart = buildWorkflow.indexOf('- name: Build public seven-day current history and controlled live selection');

assert.ok(refreshStart >= 0, 'Production workflow must refresh the private Copernicus cache');
assert.ok(refreshStart < dmiRestoreStart && refreshStart < dmiSaveStart,
  'Private Copernicus cache must be touched before large DMI cache restore/save churn');
assert.ok(dmiUpdateStart < postDmiRefreshStart &&
  postDmiRefreshStart < targetSelectStart &&
  targetSelectStart < targetInspectStart &&
  targetInspectStart < targetNormalizeStart &&
  targetNormalizeStart < targetRunStart &&
  targetRunStart < targetProgressSaveStart &&
  targetProgressSaveStart < sourceStageGateStart &&
  sourceStageGateStart < targetSaveStart &&
  targetSaveStart < openMeteoStart &&
  openMeteoStart < freshnessStart &&
  freshnessStart < closureStart &&
  closureStart < historyBuildStart,
  'Production must derive, reuse/fill and save the target-bound source stage before current closure and live history');

const refreshBlock = buildWorkflow.slice(refreshStart, dmiRestoreStart);
assert.match(refreshBlock, /uses: actions\/cache\/restore@v6/);
assert.match(refreshBlock, /\.cache\/copernicus-current-shadow\.json/);
assert.match(refreshBlock, /\.cache\/copernicus-current-source-stage\.json/);
assert.match(refreshBlock, /copernicus-current-progress-v3-/);
assert.match(refreshBlock, /copernicus-current-shadow-v1-/);
assert.match(refreshBlock, /cache-matched-key/);
assert.doesNotMatch(refreshBlock, /actions\/cache\/save|actions\/upload-artifact/);
assert.doesNotMatch(refreshBlock, /COPERNICUSMARINE_|uMps|vMps/);

const postDmiRefreshBlock = buildWorkflow.slice(postDmiRefreshStart, historyBuildStart);
assert.match(postDmiRefreshBlock, /uses: actions\/cache\/restore@v6/);
assert.match(postDmiRefreshBlock, /\.cache\/copernicus-current-shadow\.json/);
assert.match(postDmiRefreshBlock, /\.cache\/copernicus-current-source-stage\.json/);
assert.match(postDmiRefreshBlock, /key: copernicus-current-progress-v3-post-dmi-/);
assert.match(postDmiRefreshBlock, /build-copernicus-target-registry\.py/);
assert.match(postDmiRefreshBlock, /check-copernicus-current-range\.py/);
assert.match(postDmiRefreshBlock, /--allow-nonmatching-seal/);
assert.match(postDmiRefreshBlock, /--allow-invalid-shadow-as-absent/);
assert.match(postDmiRefreshBlock, /--dmi \.cache\/dmi-candidate-progress\.json/);
assert.match(postDmiRefreshBlock, /source_stage_reusable != 'true'/);
assert.match(postDmiRefreshBlock, /Preserve original source-stage evidence for validated donor migration before rebase/);
assert.doesNotMatch(postDmiRefreshBlock, /rm -f \.cache\/copernicus-current-source-stage\.json/);
assert.doesNotMatch(postDmiRefreshBlock, /rm -f \.cache\/copernicus-current-shadow\.json/);
assert.match(postDmiRefreshBlock, /--require-source-stage-reusable/);
assert.match(postDmiRefreshBlock, /fill-open-meteo-current-fallback\.py/);
assert.match(postDmiRefreshBlock, /--runtime-seconds 240/);
assert.match(postDmiRefreshBlock, /--at "\$RAVRADAR_PRODUCTION_TARGET_HOUR"/);
assert.match(postDmiRefreshBlock, /--targets \.cache\/copernicus-current-targets\.json/);
assert.match(postDmiRefreshBlock, /--authoritative-targets data\/live\/coastal-parts-v2\.json/);
assert.match(postDmiRefreshBlock, /uses: actions\/cache\/save@v6/);
assert.doesNotMatch(postDmiRefreshBlock, /current_hour_present|--require-complete/);
assert.doesNotMatch(postDmiRefreshBlock, /uMps|vMps/);
for (const block of postDmiRefreshBlock.split('\n      - name:').filter(block => block.includes('upload-artifact'))) {
  assert.doesNotMatch(block, /\.cache\//, 'Only explicit safe aggregate diagnostics may be artifacts.');
  assert.match(block, /weather-acquisition-plan-before-dmi\.json/);
  assert.match(block, /retention-days: 7/);
}
const quarantineBlock = pythonFunctionBlock(copernicusRunner, 'quarantine_invalid_private_file');
assert.match(quarantineBlock, /preserve_source: bool = False/);
assert.match(quarantineBlock, /os\.link\(path, quarantine\)/,
  'Quarantine must create a no-clobber original-byte archive, not replace another generation.');
assert.doesNotMatch(quarantineBlock, /os\.replace\(|shutil\.copy(?:2|file)?\(/);
assert.match(quarantineBlock, /quarantine\.stat\(\)\.st_size != path\.stat\(\)\.st_size or file_sha256\(quarantine\) != "sha256:" \+ digest/,
  'An existing quarantine name must prove exact original size and checksum before reuse.');
const guardedUnlinks = quarantineBlock.match(/if not preserve_source:\s*path\.unlink\(\)/g) || [];
const allUnlinks = quarantineBlock.match(/path\.unlink\(\)/g) || [];
assert.ok(allUnlinks.length > 0 && guardedUnlinks.length === allUnlinks.length,
  'Archiving with preserve_source must leave the authoritative bank pathname intact.');
assert.match(quarantineBlock, /len\(retained\) >= QUARANTINE_MAX_FILES_PER_PATH/);
assert.match(quarantineBlock, /retained_bytes \+ path\.stat\(\)\.st_size > QUARANTINE_MAX_BYTES_PER_PATH/);

const bankCommitBlock = pythonFunctionBlock(copernicusRunner, 'commit_donor_bank');
const archiveIndex = bankCommitBlock.indexOf('quarantine_invalid_private_file(');
const commitIndex = bankCommitBlock.indexOf('atomic_write_copernicus_donor_bank(');
const outputIndex = bankCommitBlock.indexOf('mark_donor_bank_written()');
assert.match(bankCommitBlock, /file_sha256\(path\) != original_sha/);
assert.match(bankCommitBlock, /quarantine_invalid_private_file\(path, "recoverable donor bank", preserve_source=True\)/);
assert.ok(archiveIndex >= 0 && archiveIndex < commitIndex && commitIndex < outputIndex,
  'Recovered bytes must be archived without removing the bank before atomic promotion and its success flag.');
assert.match(copernicusRunner,
  /quarantine_invalid_private_file\(args\.donor_bank, "donor bank", preserve_source=True\)/,
  'Whole-invalid startup must also keep the rejected bank authoritative until atomic replacement.');
assert.match(
  copernicusRunner,
  /existing, shadow_salvage = load_shadow_with_salvage\(args\.shadow, reference, target_identities\)/,
  'Legacy projection recovery must keep the granular salvage reader.',
);
assert.match(
  copernicusRunner,
  /if donor_state is None:[\s\S]{0,100}original_bank = legacy_donor_bank\(/,
  'Original legacy admissions may migrate only before an authoritative donor bank exists.',
);
assert.match(
  copernicusRunner,
  /merged_shadow = \{\*\*donor_state\["shadow"\], "updatedAt": utc_iso\(acquisition_at\)\}/,
  'Startup rebase must start from the authoritative full bank, not an independently restored projection.',
);
assert.match(copernicusRunner,
  /donor_state = build_copernicus_donor_bank\(\s*merged_shadow,[\s\S]*?previous_bank=donor_state, production_reference_at=reference/);
const bankBuildBlock = pythonFunctionBlock(copernicusBank, 'build_copernicus_donor_bank');
assert.match(bankBuildBlock, /previous = validate_copernicus_donor_bank\(previous_bank, targets=targets\)/);
assert.match(bankBuildBlock, /merge_cache_evidence\(previous\["shadow"\], shadow\["acquisitions"\]/);
assert.match(bankBuildBlock, /masks\.extend\(previous\["sourceMasks"\]\)/,
  'Bank rebuild must retain source masks alongside the full prior donor reserve.');
for (const name of ['persist_source_stage_progress', 'donor_candidate_projection']) {
  const block = pythonFunctionBlock(copernicusRunner, name);
  assert.match(block, /previous_bank=donor_state/,
    `${name} must merge the full previous bank, not only its disposable projection.`);
  assert.match(block, /projected_donor_shadow\(bank, targets=targets\)/,
    `${name} must produce operational rows through the same mask-aware projection.`);
}
assert.match(
  copernicusRunner,
  /Persist a target\/DMI\/shadow-bound zero-attempt stage before credentials,[\s\S]{0,300}persist_source_stage_progress\(/,
  'The recovered clean shadow must be bound to reusable zero-attempt evidence before provider access.',
);

const supportStart = buildWorkflow.indexOf('- name: Build RavRadar support package');
const supportEnd = buildWorkflow.indexOf('- name: Sync protected admin data to Supabase');
const supportBlock = buildWorkflow.slice(supportStart, supportEnd);
assert.ok(supportStart > dmiSaveStart && supportEnd > supportStart);
assert.match(supportBlock, /--exclude '\.cache\/'/,
  'Support artifact must exclude the restored private Copernicus cache');

const pagesStart = buildWorkflow.indexOf('- name: Build lean GitHub Pages artifact');
const pagesEnd = buildWorkflow.indexOf('- name: Configure GitHub Pages', pagesStart);
assert.ok(pagesStart >= 0 && pagesEnd > pagesStart,
  'Pages artifact block must precede its GitHub Pages configuration step');
assert.match(buildWorkflow.slice(pagesStart, pagesEnd), /--exclude '\.cache\/'/,
  'Pages artifact must exclude the restored private Copernicus cache');

assert.equal(
  packageDoc.scripts['test:copernicus-cache-preservation'],
  'node scripts/test-copernicus-cache-preservation-4.0.232.mjs',
);
assert.ok(
  packageDoc.scripts.validate.indexOf('test:copernicus-cache-preservation') <
    packageDoc.scripts.validate.indexOf('test:current-spatial-audit'),
  'Cache-preservation regression must run before the release-critical current audit',
);

console.log('OK: production refreshes the private Copernicus cache around DMI churn without exporting it.');
