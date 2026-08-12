import assert from 'node:assert/strict';
import fs from 'node:fs/promises';

const workflow = await fs.readFile('.github/workflows/update-and-deploy.yml', 'utf8');
const restore = workflow.indexOf('- name: Restore progressive private DMI zone cache');
const update = workflow.indexOf('- name: Update DMI bulk model cache');
const save = workflow.indexOf('- name: Save progressive private DMI zone cache');
const validate = workflow.indexOf('- name: Validate full project after fresh weather and current provenance');

assert.ok(restore > 0 && restore < update, 'Den progressive zonecache skal gendannes før DMI-opbygningen.');
assert.ok(save > update && save < validate, 'DMI-fremdriften skal gemmes før en eventuel releasegate stopper jobbet.');

const block = workflow.slice(restore, validate);
assert.match(block, /path: data\/live\/dmi-bulk-cache\.json/);
assert.match(block, /dmi-zone-cache-v1-/);
assert.match(block, /steps\.dmi-bulk\.outcome == 'success'/);
assert.doesNotMatch(block, /upload-pages-artifact|deploy-pages/);
assert.match(workflow, /Preserve deployed DMI zone cache as safe fallback/);
assert.match(workflow, /DMI_BULK_DEPLOYED_FALLBACK_PATH: \.cache\/deployed-dmi-bulk-cache\.json/);

const builder = await fs.readFile('scripts/update-dmi-bulk.py', 'utf8');
assert.match(builder, /def cache_quality\(/);
assert.match(builder, /def cache_progress_time\(/);
assert.match(builder, /def load_previous\(expected_signature: str\)/);
assert.match(builder, /document\.get\("zoneRegistrySignature"\) == expected_signature/);
assert.match(builder, /document\.get\("checkpointedAt"\)/);
assert.match(builder, /return max\(compatible, key=lambda document: \(cache_progress_time\(document\), cache_quality\(document\)\)\)/);

const fullValidation = workflow.slice(validate);
assert.match(fullValidation, /npm run validate/);
assert.match(fullValidation, /npm run release:gate/);

console.log('OK: DMI-zonecache fortsætter privat mellem runs, mens offentlig deploy stadig kræver fulde gates.');
