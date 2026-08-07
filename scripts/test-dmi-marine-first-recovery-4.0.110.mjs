import assert from 'node:assert/strict';
import fs from 'node:fs';

const bulk = fs.readFileSync('scripts/update-dmi-bulk.py', 'utf8');
const workflow = fs.readFileSync('.github/workflows/update-and-deploy.yml', 'utf8');

assert.match(bulk, /marine_recovery_active = missing96\["marine"\] > 0/);
assert.match(bulk, /if marine_foundation_missing:/);
assert.match(bulk, /atmosphereDeferredDuringMarineRecovery/);
assert.doesNotMatch(bulk, /reserved_wind_rank = 0 if collection == "harmonie_dini_sf"/);
assert.match(workflow, /timeout-minutes: 18/);
assert.ok(workflow.includes("cancel-in-progress: ${{ github.event_name == 'push'"));
assert.doesNotMatch(workflow, /cancel-in-progress: true/);
console.log('OK: DKSS marine u\/v prioriteres før HARMONIE, når marinehorisonten mangler.');
