import assert from 'node:assert/strict';
import fs from 'node:fs/promises';

const source = await fs.readFile('scripts/update-dmi-bulk.py', 'utf8');

assert.match(source, /lastBudgetInterruptedAt/);
assert.match(source, /budget_rotation = \([\s\S]*family == "marine" and marine_recovery_active/);
assert.match(source, /epoch\(\(state\.get\(collection\) or \{\}\)\.get\("lastBudgetInterruptedAt"\)\)[\s\S]*-preferred_wind_tail_demand/);
assert.match(source, /if budget_stop:[\s\S]{0,160}state\["lastBudgetInterruptedAt"\] = generated/);
assert.match(source, /state\["lastBudgetInterruptedAt"\] = None/);

console.log('OK: En tidsafbrudt DKSS-model roterer bag ikke-forsøgte/eldre modeller uden at svække DMI-auditten.');

// Fixed normal budget regression only; never a caller-selected Python runner.
const {spawnSync}=await import('node:child_process');
const {fileURLToPath}=await import('node:url');
const environment=Object.fromEntries(['PATH','Path','SystemRoot','WINDIR','TEMP','TMP','LANG','LC_ALL',
  'PYTHONHOME','LD_LIBRARY_PATH','DYLD_LIBRARY_PATH'].filter(key=>typeof process.env[key]==='string')
  .map(key=>[key,process.env[key]]));
environment.PYTHONUTF8='1';
const budget=spawnSync(process.env.PYTHON||'python',
  ['-B',fileURLToPath(new URL('./test-plan-dmi-recovery.py',import.meta.url))],
  {cwd:fileURLToPath(new URL('../',import.meta.url)),env:environment,shell:false,
    timeout:60000,maxBuffer:1024*1024,encoding:'utf8',windowsHide:true});
assert.equal(budget.error,undefined,budget.error?.message);
assert.equal(budget.signal,null,'Normal DMI budget regression was interrupted');
assert.equal(budget.status,0,budget.stderr||budget.stdout);
process.stdout.write(budget.stdout);
