import assert from 'node:assert/strict';
import fs from 'node:fs';
import { readProductionWorkflowSources } from './lib/production-workflow-sources.mjs';

const bulk = fs.readFileSync('scripts/update-dmi-bulk.py', 'utf8');
const { orchestrator, build } = await readProductionWorkflowSources();

assert.match(bulk, /marine_recovery_active = missing96\["marine"\] > 0/);
assert.match(bulk, /if marine_foundation_missing:/);
assert.match(bulk, /atmosphereDeferredDuringMarineRecovery/);
assert.doesNotMatch(bulk, /reserved_wind_rank = 0 if collection == "harmonie_dini_sf"/);
assert.match(build, /timeout-minutes: 55/);
assert.match(build, /DMI_BULK_MAX_RUNTIME_SECONDS:.*3000.*900/);
assert.match(build, /DMI_BULK_FINALIZE_RESERVE_SECONDS:.*180.*120/);
assert.equal((orchestrator.match(/cancel-in-progress:/g) || []).length, 1);
assert.ok(orchestrator.includes('cancel-in-progress: false'));
assert.doesNotMatch(orchestrator, /cancel-in-progress: true/);
console.log('OK: DKSS marine u\/v prioriteres før HARMONIE, når marinehorisonten mangler.');
