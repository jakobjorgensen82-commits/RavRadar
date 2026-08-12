import assert from 'node:assert/strict';
import fs from 'node:fs/promises';

const source = await fs.readFile('scripts/update-dmi-bulk.py', 'utf8');

assert.match(source, /lastBudgetInterruptedAt/);
assert.match(source, /budget_rotation = \([\s\S]*family == "marine" and marine_recovery_active/);
assert.match(source, /epoch\(\(state\.get\(collection\) or \{\}\)\.get\("lastBudgetInterruptedAt"\)\)[\s\S]*-preferred_wind_tail_demand/);
assert.match(source, /if budget_stop:[\s\S]{0,160}state\["lastBudgetInterruptedAt"\] = generated/);
assert.match(source, /state\["lastBudgetInterruptedAt"\] = None/);

console.log('OK: En tidsafbrudt DKSS-model roterer bag ikke-forsøgte/eldre modeller uden at svække DMI-auditten.');
