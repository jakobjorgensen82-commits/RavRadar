import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { readProductionWorkflowSource } from './lib/production-workflow-sources.mjs';

const buildWorkflow = await readProductionWorkflowSource('build');
const restore = buildWorkflow.indexOf('- name: Restore progressive private DMI zone cache');
const update = buildWorkflow.indexOf('- name: Update DMI bulk model cache');
const save = buildWorkflow.indexOf('- name: Save progressive private DMI zone cache');
const validate = buildWorkflow.indexOf('- name: Validate full project after fresh weather and current provenance');

assert.ok(restore > 0 && restore < update, 'Den progressive zonecache skal gendannes før DMI-opbygningen.');
assert.ok(save > update && save < validate, 'DMI-fremdriften skal gemmes før en eventuel releasegate stopper jobbet.');

const block = buildWorkflow.slice(restore, validate);
assert.match(block, /path: data\/live\/dmi-bulk-cache\.json/);
assert.match(block, /dmi-zone-cache-v1-/);
const nextStep = buildWorkflow.indexOf('\n      - name:', save + 1);
const saveBlock = buildWorkflow.slice(save, nextStep);
assert.match(
  saveBlock,
  /steps\.dmi-bulk\.outcome != 'cancelled'.*hashFiles\('data\/live\/dmi-bulk-cache\.json'\) != ''/,
  'En eksisterende progressiv DMI-zonecache skal gemmes efter både success og en reel producerfejl.',
);
assert.doesNotMatch(
  saveBlock,
  /steps\.dmi-bulk\.outcome == 'success'/,
  'Cachefremdrift må ikke gå tabt, blot fordi den fulde WAM-gate endnu ikke er grøn.',
);
assert.doesNotMatch(block, /upload-pages-artifact|deploy-pages/);
assert.match(buildWorkflow, /Preserve deployed DMI zone cache as safe fallback/);
assert.match(buildWorkflow, /DMI_BULK_DEPLOYED_FALLBACK_PATH: \.cache\/deployed-dmi-bulk-cache\.json/);

const builder = await fs.readFile('scripts/update-dmi-bulk.py', 'utf8');
assert.match(builder, /def cache_quality\(/);
assert.match(builder, /def cache_progress_time\(/);
assert.match(builder, /def sampling_registry_signature\(/);
assert.match(builder, /def load_previous\(expected_signature: str\)/);
assert.match(builder, /document\.get\("zoneRegistrySignature"\) == expected_signature/);
assert.match(builder, /document\.get\("checkpointedAt"\)/);
assert.match(builder, /return max\(compatible, key=lambda document: \(cache_progress_time\(document\), cache_quality\(document\)\)\)/);
assert.match(builder, /"sourceKey": source\.get\("sourceKey"\)/);
assert.match(builder, /"point": source\.get\("point"\)/);
assert.doesNotMatch(builder, /WATER_SOURCES_PATH\.read_bytes/);
assert.doesNotMatch(builder, /ZONES_PATH\.read_bytes/);

const fullValidation = buildWorkflow.slice(validate);
assert.match(fullValidation, /npm run validate/);
assert.match(fullValidation, /npm run release:gate/);

console.log('OK: DMI-zonecache fortsætter privat mellem runs, mens offentlig deploy stadig kræver fulde gates.');
