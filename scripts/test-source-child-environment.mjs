// Normal source-driver regression: actual CLI, synthetic children, no providers.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {sourceCommandArguments} from './validate-source-once.mjs';

const sourceBody = "import {withSource598CodeParent} from './scripts/check-assistant-later-h0-predecessor-source.mjs'; await withSource598CodeParent(()=>{});";
const sourceCommand = 'node --input-type=module -e "' + sourceBody + '"';
assert.deepEqual(sourceCommandArguments(sourceCommand), ['node','--input-type=module','-e',sourceBody]);
for (const rejected of [sourceCommand+' --extra', sourceCommand+'; node evil.mjs',
  sourceCommand.replace('()=>{}','()=>{process.exit(0)}'), 'node -e "console.log(1)"',
  'node scripts/test.mjs | python other.py']) {
  assert.throws(()=>sourceCommandArguments(rejected), /Unsupported source command/);
}

const actual = (await fs.readFile(new URL('./validate-source-once.mjs', import.meta.url), 'utf8')).replace(/\r\n?/g, '\n');
const environmentLine = '    env: sourceChildEnvironment(command),\n';
assert.equal(actual.split(environmentLine).length, 2, 'One actual source-child environment seam');
const inherited = actual.replace(environmentLine, '');
const owned = await fs.mkdtemp(path.join(os.tmpdir(), 'rr-source-child-env-'));
const commands = ['scripts/build-ravscore-model-bundle.mjs', 'scripts/sync-ravscore-model-binding.mjs',
  'scripts/test-source-child.mjs', 'scripts/source-critical-gate.mjs'];
const hostKeys = ['PATH', 'Path', 'PATHEXT', 'SystemRoot', 'SYSTEMROOT', 'WINDIR', 'windir',
  'COMSPEC', 'ComSpec', 'SystemDrive', 'SYSTEMDRIVE', 'HOME', 'USERPROFILE', 'TEMP', 'TMP', 'TMPDIR'];
const host = Object.fromEntries(hostKeys.filter(key => typeof process.env[key] === 'string')
  .map(key => [key, process.env[key]]));
const ci = {CI:'true', GITHUB_EVENT_NAME:'pull_request', GITHUB_REPOSITORY:'synthetic/source',
  GITHUB_SHA:'a'.repeat(40), GITHUB_TOKEN:'synthetic-source-proof-token',
  RUNNER_OS:process.platform, SOURCE_GATE_HEAD_SHA:'a'.repeat(40), PULL_REQUEST_NUMBER:'17',
  GIT_NO_LAZY_FETCH:'1'};
const production = {
  RAVRADAR_PRIVATE_RUNTIME_STORAGE_BACKEND:'r2', RAVRADAR_PRIVATE_RUNTIME_ROOT:'synthetic-private-root',
  RAVRADAR_PRIVATE_RUNTIME_BUNDLE:'synthetic-private-bundle', RAVRADAR_PRODUCTION_TARGET_HOUR:'synthetic-hour',
  RAVRADAR_WEATHER_STATE_EPOCH_BOOTSTRAP:'false', RAVRADAR_OPERATIONAL_WORK:'synthetic-operation',
  RAVRADAR_LEGACY_SOURCE_ROOT:'synthetic-legacy', RAVRADAR_HISTORICAL_WAVE_SOURCE_ROOT:'synthetic-wave',
  SUPABASE_URL:'https://synthetic.invalid', SUPABASE_SERVICE_ROLE_KEY:'synthetic-supabase-key',
  SUPABASE_ACCESS_TOKEN:'synthetic-management-token', RAVRADAR_R2_ACCOUNT_ID:'synthetic-r2-account',
  RAVRADAR_R2_ACCESS_KEY_ID:'synthetic-r2-access', RAVRADAR_R2_SECRET_ACCESS_KEY:'synthetic-r2-secret',
  DMI_API_KEY:'synthetic-dmi-key', COPERNICUSMARINE_SERVICE_USERNAME:'synthetic-copernicus-user',
  COPERNICUSMARINE_SERVICE_PASSWORD:'synthetic-copernicus-password', OPEN_METEO_API_KEY:'synthetic-om-key',
  CLOUDFLARE_API_TOKEN:'synthetic-cloudflare-token', CHECKPOINT_ONLY:'true',
  COMPLETED_PRIVATE_RUNTIME:'true', UNRELATED_PRODUCTION_SECRET:'synthetic-unknown-secret',
  NODE_OPTIONS:'--no-warnings', NODE_PATH:'synthetic-node-modules', PYTHONPATH:'synthetic-python-modules',
  PYTHONHOME:'synthetic-python-home', GIT_DIR:'synthetic-git-dir', GIT_WORK_TREE:'synthetic-git-worktree',
  GIT_CONFIG_COUNT:'1', GIT_CONFIG_KEY_0:'protocol.allow', GIT_CONFIG_VALUE_0:'never',
};
const flags = {RAVRADAR_PYTHON:'synthetic-python', RAVRADAR_TEST_BASH:'synthetic-bash',
  RAVRADAR_TEST_LARGE_FORECAST:'1', RAVRADAR_TEST_DENSE_COHERENT_WORK_INPUT:'synthetic-dense-fixture',
  RAVRADAR_NATIVE_PROOF_BENCHMARK:'1', RAVRADAR_RECOVERY_PRIORITY_BENCHMARK:'1'};
const dirty = {...host, ...ci, ...production, ...flags};
const parentBefore = {...dirty};
const child = ["import assert from 'node:assert/strict';", "import path from 'node:path';",
  'const ci = ' + JSON.stringify(ci) + ';',
  'const removed = ' + JSON.stringify(Object.keys(production)) + ';',
  'const flags = ' + JSON.stringify(flags) + ';',
  "for (const key of removed) assert(!Object.hasOwn(process.env, key), 'Production setting reached synthetic source child: ' + key);",
  "for (const [key, value] of Object.entries(ci)) assert(process.env[key] === value, 'Required source/CI setting missing: ' + key);",
  "const test = path.basename(process.argv[1]).startsWith('test-');",
  "for (const [key, value] of Object.entries(flags)) assert(test ? process.env[key] === value : !Object.hasOwn(process.env, key), 'Test option crossed wrong command boundary: ' + key);",
  "console.log('SYNTHETIC_SOURCE_CHILD_CLEAN:' + path.basename(process.argv[1]));", '',
].join('\n');
const run = env => spawnSync(process.execPath, ['scripts/validate-source-once.mjs'],
  {cwd:owned, env, encoding:'utf8', timeout:15000, maxBuffer:1024*1024});
try {
  await fs.mkdir(path.join(owned,'scripts'));
  await fs.writeFile(path.join(owned,'package.json'), JSON.stringify({scripts:{
    'validate:source':'node scripts/validate-source-once.mjs',
    'source:critical-gate':'node scripts/source-critical-gate.mjs',
    'validate:source:checks':'node scripts/build-ravscore-model-bundle.mjs --check && node scripts/sync-ravscore-model-binding.mjs --check && node scripts/test-source-child.mjs && node scripts/source-critical-gate.mjs',
  }}));
  for (const command of commands) await fs.writeFile(path.join(owned,command), child);
  await fs.writeFile(path.join(owned,'scripts/validate-source-once.mjs'), inherited);
  const before = run(dirty);
  assert.equal(before.error, undefined, 'The previous normal CLI must actually start');
  assert.equal(before.signal, null);
  assert.equal(before.status, 1, 'Ambient production inheritance must reproduce the red preflight');
  assert.match(before.stdout,/Source binding preflight failed; dependent checks were not started\./);
  assert.doesNotMatch(before.stdout,/SYNTHETIC_SOURCE_CHILD_CLEAN/);
  await fs.writeFile(path.join(owned,'scripts/validate-source-once.mjs'), actual);
  const after = run(dirty);
  assert.equal(after.error, undefined, 'The corrected normal CLI must actually start');
  assert.equal(after.signal, null);
  assert.equal(after.status, 0, 'The same polluted parent must produce clean successful synthetic children');
  assert.equal(after.stderr, '');
  assert.equal((after.stdout.match(/SYNTHETIC_SOURCE_CHILD_CLEAN:/g) ?? []).length,4,
    'Both binding preflights, the selected test and the terminal source gate must all execute');
  assert.match(after.stdout,/Critical source validation passed/);
  assert.deepEqual(dirty,parentBefore,'The source-child boundary must not change its parent environment');
  await fs.writeFile(path.join(owned,'scripts/test-source-child.mjs'),child+"process.exitCode = 19;\n");
  const rejected = run(dirty);
  assert.equal(rejected.error, undefined);
  assert.equal(rejected.signal, null);
  assert.equal(rejected.status,1,'A real selected source failure must stay red');
  assert.equal((rejected.stdout.match(/SYNTHETIC_SOURCE_CHILD_CLEAN:/g) ?? []).length,4,
    'A selected test failure must retain normal aggregate reporting and terminal gate execution');
  assert.match(rejected.stdout,/Critical source validation found 1 failing check\(s\): node scripts\/test-source-child\.mjs/);
  // Execute the exact reviewed inline CODE-parent command as one -e argument.
  // This synthetic module grants no real Source/runtime/original capability.
  const inlineScripts = JSON.parse(await fs.readFile(path.join(owned,'package.json'),'utf8'));
  inlineScripts.scripts['validate:source:checks'] = inlineScripts.scripts['validate:source:checks']
    .replace(' && node scripts/source-critical-gate.mjs',' && '+sourceCommand+' && node scripts/source-critical-gate.mjs');
  inlineScripts.type = 'module';
  await fs.writeFile(path.join(owned,'package.json'),JSON.stringify(inlineScripts));
  await fs.writeFile(path.join(owned,'scripts/test-source-child.mjs'),child);
  await fs.writeFile(path.join(owned,'scripts/check-assistant-later-h0-predecessor-source.mjs'),[
    "import assert from 'node:assert/strict';",
    'export async function withSource598CodeParent(callback) {',
    '  for (const key of '+JSON.stringify([...Object.keys(production),...Object.keys(flags)])+") assert(!Object.hasOwn(process.env,key),'Sensitive parent setting reached fixed CODE command');",
    "  assert.equal(typeof callback,'function'); await callback();",
    "  console.log('SYNTHETIC_FIXED_CODE_ARGUMENT_VECTOR');",
    '}',
  ].join('\n'));
  const inline = run(dirty);
  assert.equal(inline.error,undefined); assert.equal(inline.signal,null);
  assert.equal(inline.status,0,inline.stderr); assert.equal(inline.stderr,'');
  assert.equal((inline.stdout.match(/SYNTHETIC_FIXED_CODE_ARGUMENT_VECTOR/g)??[]).length,1);
  assert.equal((inline.stdout.match(/SYNTHETIC_SOURCE_CHILD_CLEAN:/g)??[]).length,4);
  assert.match(inline.stdout,/Critical source validation passed/);
  assert.deepEqual(dirty,parentBefore);
  console.log('Source-child environment: actual normal CLI inherited-red -> isolated-green; host/CI/test options preserved, production settings absent, parent unchanged, real source failure remains red.');
} finally {
  await fs.rm(owned,{recursive:true,force:true});
}
