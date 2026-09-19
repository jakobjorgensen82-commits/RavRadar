import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { readProductionWorkflowSource } from './lib/production-workflow-sources.mjs';

const [workflow, retiredOneoff, builder] = await Promise.all([
  readProductionWorkflowSource('build'),
  fs.readFile('.github/workflows/validate-copernicus-current-pilot.yml', 'utf8'),
  fs.readFile('scripts/update-dmi-bulk.py', 'utf8'),
]);
function stepIndex(name) {
  const index = workflow.indexOf(`- name: ${name}`);
  assert.ok(index >= 0, `Workflowet mangler trinnet: ${name}`);
  return index;
}
function stepBlock(name) {
  const start = stepIndex(name);
  const next = workflow.indexOf('\n      - name:', start + 1);
  return workflow.slice(start, next < 0 ? undefined : next);
}

assert.match(workflow, /permissions:\r?\n  contents: read\r?\n  actions: read/);
const encryptedRestore = stepIndex('Restore encrypted private weather progress only');
const bindBaseline = stepIndex('Bind optional progress to the exact protected baseline');
const selectActive = stepIndex('Select encrypted active DMI generation when available');
const materialize = stepIndex('Prepare strict active DMI donor or resumable candidate');
const update = stepIndex('Update DMI bulk model cache');
const gribSave = stepIndex('Save progressed DMI GRIB download cache');
const terminal = stepIndex('Classify DMI readiness before current supplement');
const snapshot = stepIndex('Strictly snapshot the maintained READY active DMI generation');
const encryptedSave = stepIndex('Encrypt newly saved private weather progress before later production steps');
const validate = stepIndex('Validate critical production artifact after fresh weather and current provenance');
assert.ok(encryptedRestore < bindBaseline && bindBaseline < selectActive && selectActive < materialize
  && materialize < update && update < gribSave && gribSave < terminal && terminal < snapshot
  && snapshot < encryptedSave && encryptedSave < validate);

const select = stepBlock('Select encrypted active DMI generation when available');
assert.match(select, /test -s \.cache\/dmi-active-complete\.json/);
assert.match(select, /available=true/);
assert.doesNotMatch(select, /actions\/cache|dmi-zone-active-v1-/);
const materializeBlock = stepBlock('Prepare strict active DMI donor or resumable candidate');
assert.match(materializeBlock, /steps\.dmi-active-restore\.outputs\.available/);
assert.match(materializeBlock, /source_path=\.cache\/dmi-active-complete\.json/);
assert.match(materializeBlock, /source_path=\.cache\/dmi-candidate-progress\.json/);
assert.match(materializeBlock, /source_path=data\/live\/dmi-bulk-cache\.json/);
assert.match(materializeBlock, /materialize-dmi-bulk-storage\.py/);
assert.match(materializeBlock, /check-dmi-bulk-operational-ready\.py/);
assert.match(materializeBlock, /build-copernicus-target-registry\.py/);
assert.match(materializeBlock, /cp \.cache\/dmi-active-complete\.json data\/live\/dmi-bulk-cache\.json/);
assert.match(materializeBlock, /cp "\$materialized_path" \.cache\/dmi-candidate-progress\.json\.tmp/);
assert.match(materializeBlock, /if test "\$source_kind" = "active"; then[\s\S]*reference="\$\(python scripts\/check-dmi-bulk-operational-ready\.py --cache "\$materialized_path"\)"/);
assert.match(materializeBlock, /elif test "\$source_kind" = "deployed"; then[\s\S]*2>\/dev\/null/);
assert.match(materializeBlock, /strict_active_ready=false/);
assert.match(materializeBlock, /candidate_seeded=true/);
assert.doesNotMatch(materializeBlock, /continue-on-error/);

const updateBlock = stepBlock('Update DMI bulk model cache');
assert.match(updateBlock, /DMI_BULK_OUTPUT_PATH: \.cache\/dmi-candidate-progress\.json/);
assert.match(updateBlock, /DMI_BULK_PROMOTION_PATH: data\/live\/dmi-bulk-cache\.json/);
assert.match(updateBlock, /DMI_BULK_PREFER_OUTPUT_CACHE: true/);
assert.match(updateBlock, /DMI_BULK_RETAIN_PREFERRED_NATIVE_RUN: false/);
assert.match(updateBlock, /DMI_BULK_DEPLOYED_FALLBACK_PATH: \.cache\/dmi-active-complete\.json/);
assert.doesNotMatch(updateBlock, /dmi-candidate-state\.outputs\.retain_preferred/);

const officialGrib = stepBlock('Save progressed DMI GRIB download cache');
assert.match(officialGrib, /if: always\(\)/);
assert.match(officialGrib, /path: \.cache\/dmi-grib/);
assert.match(officialGrib, /key: dmi-grib-v4-/);
const snapshotBlock = stepBlock('Strictly snapshot the maintained READY active DMI generation');
assert.match(snapshotBlock, /steps\.dmi-terminal-gate\.outputs\.ready == 'true'/);
assert.match(snapshotBlock, /steps\.dmi-bulk\.outputs\.candidate_promoted == 'true'/);
assert.match(snapshotBlock, /check-dmi-bulk-operational-ready\.py[\s\S]*--cache data\/live\/dmi-bulk-cache\.json/);
assert.match(snapshotBlock, /cp data\/live\/dmi-bulk-cache\.json \.cache\/dmi-active-complete\.json\.tmp/);

const seal = stepBlock('Encrypt newly saved private weather progress before later production steps');
assert.match(seal, /if: always\(\)/);
assert.match(seal, /steps\.component-progress-restore\.outputs\.captured == 'true'/);
assert.match(seal, /weather-component-progress-cache\.mjs save/);
for (const legacyKey of ['dmi-zone-active-v1-', 'dmi-zone-candidate-v1-', 'current-field-shadow-v1-']) {
  assert.doesNotMatch(workflow, new RegExp(legacyKey), `Normal workflow still exposes ${legacyKey}`);
}
assert.doesNotMatch(workflow.slice(update, terminal), /path: \.cache\/dmi-candidate-progress\.json\s+key:/,
  'Partial candidates must be sealed only through the authenticated encrypted snapshot');

for (const job of ['validate', 'operational-118-preflight', 'resume-private-capacity-and-seal-handoff', 'current-input-diagnostic']) {
  const start = retiredOneoff.indexOf(`\n  ${job}:`);
  assert.ok(start >= 0);
  assert.match(retiredOneoff.slice(start, start + 1200), /if: .*&& false/);
}
assert.doesNotMatch(workflow, /DMI_BULK_PRIVATE_REPLAY_RETENTION_HOURS/);
assert.doesNotMatch(workflow.slice(encryptedRestore, validate), /upload-pages-artifact|deploy-pages/);

assert.match(builder, /def cache_quality\(/);
assert.match(builder, /def cache_progress_time\(/);
assert.match(builder, /def sampling_registry_signature\(/);
assert.match(builder, /def load_previous\([\s\S]*?expected_signature: str,/);
assert.match(builder, /document\.get\("zoneRegistrySignature"\) == expected_signature/);
assert.match(builder, /document\.get\("checkpointedAt"\)/);
assert.match(builder, /if PREFER_OUTPUT_CACHE and output_document in compatible/);
assert.match(builder, /else max\([\s\S]*?cache_progress_time\(document\), cache_quality\(document\)/);
assert.match(builder, /"sourceKey": source\.get\("sourceKey"\)/);
assert.match(builder, /"point": source\.get\("point"\)/);
assert.doesNotMatch(builder, /WATER_SOURCES_PATH\.read_bytes/);
assert.doesNotMatch(builder, /ZONES_PATH\.read_bytes/);

const fullValidation = workflow.slice(validate);
assert.match(fullValidation, /run-validation-collection\.mjs/);
assert.match(fullValidation, /--script validate:production-artifact/);
assert.match(fullValidation, /npm run release:gate:production/);
console.log('OK: protected DMI baseline, isolated candidate, READY promotion and encrypted private progress.');
