import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequiredFileReader } from './lib/release-gate-required-files.mjs';

const tempBase = path.resolve(os.tmpdir());
const tempRoot = await fs.mkdtemp(path.join(tempBase, 'ravradar-release-gate-reader-'));
const resolvedTempRoot = path.resolve(tempRoot);
assert.ok(resolvedTempRoot.startsWith(`${tempBase}${path.sep}`), 'temporary test root escaped the system temp directory');

try {
  await fs.writeFile(path.join(resolvedTempRoot, 'valid.json'), '{"version":"4.0.317"}\n', 'utf8');
  await fs.writeFile(path.join(resolvedTempRoot, 'invalid.json'), '{not-json}\n', 'utf8');

  const errors = [];
  const { readText, readJson } = createRequiredFileReader(resolvedTempRoot, errors);
  assert.deepEqual(await readJson('valid.json'), { version: '4.0.317' });
  assert.equal(await readText('missing-changelog.md'), '');
  assert.deepEqual(await readJson('invalid.json', { invalid: true }), { invalid: true });
  assert.equal(errors.length, 2, 'missing and malformed files must be aggregated without an early throw');
  assert.match(errors[0], /^missing-changelog\.md: kunne ikke læses \([A-Z0-9_]+\)$/);
  assert.match(errors[1], /^invalid\.json: ugyldig JSON \([A-Z0-9_]+\)$/);
} finally {
  await fs.rm(resolvedTempRoot, { recursive: true, force: true });
}

console.log('Release-gate required-file diagnostics aggregate missing and malformed files.');

// Exercise the gate's actual protected handbook block without running its
// unrelated data and model checks. The reader still loads the real checkout.
const sourceRoot=fileURLToPath(new URL('../',import.meta.url));
const gate=await fs.readFile(path.join(sourceRoot,'scripts/release-gate.mjs'),'utf8');
const callerPath='scripts/sync-protected-admin-assets.mjs';
const helperPath='scripts/lib/merge-protected-handbook.mjs';
const start=gate.indexOf(`const sync=await read('${callerPath}');`);
const end=gate.indexOf('ok(supabaseAdminRest.includes(',start);
assert.ok(start>=0&&end>start,'The actual release-gate sync block must be present');
const AsyncFunction=(async()=>{}).constructor;
const checkProtectedHandbook=new AsyncFunction('read','ok',gate.slice(start,end));

async function checkHandbook(rewritePath,from,to){
  const errors=[];
  const {readText}=createRequiredFileReader(sourceRoot,errors);
  const read=async relative=>{
    const code=await readText(relative);
    if(relative!==rewritePath)return code;
    const changed=code.replace(from,to);
    assert.notEqual(changed,code,'The negative fixture must change the real source');
    return changed;
  };
  await checkProtectedHandbook(read,(condition,message)=>{if(!condition)errors.push(message);});
  return errors;
}

assert.deepEqual(await checkHandbook(),[]);
const expectedFailure=['Beskyttet håndbog mangler tabsfri trevejsfletning ved deploy'];
assert.deepEqual(await checkHandbook(callerPath,'await syncProtectedHandbook(','await disconnectedHandbook('),expectedFailure);
assert.deepEqual(await checkHandbook(helperPath,'const merged=mergeProtectedHandbook','const merged=uncheckedMerge'),expectedFailure);
assert.deepEqual(await checkHandbook(helperPath,"const baselineKey='handbook-source-baseline'","const baselineKey='other'"),expectedFailure);
console.log('Release gate checks the ordinary protected handbook caller, three-way merge and baseline.');
