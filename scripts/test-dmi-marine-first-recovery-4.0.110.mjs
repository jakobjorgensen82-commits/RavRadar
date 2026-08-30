import assert from 'node:assert/strict';
import fs from 'node:fs';

const bulk = fs.readFileSync('scripts/update-dmi-bulk.py', 'utf8');
const workflow = fs.readFileSync('.github/workflows/update-and-deploy.yml', 'utf8');

assert.match(bulk, /marine_recovery_active = missing96\["marine"\] > 0/);
assert.match(bulk, /if marine_foundation_missing:/);
assert.match(bulk, /atmosphereDeferredDuringMarineRecovery/);
assert.doesNotMatch(bulk, /reserved_wind_rank = 0 if collection == "harmonie_dini_sf"/);
assert.match(workflow, /timeout-minutes: 55/);
assert.match(workflow, /DMI_BULK_MAX_RUNTIME_SECONDS:.*3000.*900/);
assert.match(workflow, /DMI_BULK_FINALIZE_RESERVE_SECONDS:.*180.*120/);
assert.equal((workflow.match(/cancel-in-progress:/g) || []).length, 1);
assert.ok(workflow.includes('cancel-in-progress: false'));
assert.doesNotMatch(workflow, /cancel-in-progress: true/);
console.log('OK: DKSS marine u\/v prioriteres før HARMONIE, når marinehorisonten mangler.');
