import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import {currentSourceTargets} from './source-current-contract-plan.mjs';

// Fail-fast binding checks make an invalid generated model obvious immediately.
// The remaining critical checks still run to completion and report together.
export const SOURCE_BINDING_PREFLIGHT = Object.freeze([
  'node scripts/build-ravscore-model-bundle.mjs --check',
  'node scripts/sync-ravscore-model-binding.mjs --check',
]);

export function expandSourceCommands(scripts, name, parents = []) {
  assert.ok(!parents.includes(name), `Cyclic source test script: ${name}`);
  assert.ok(typeof scripts[name] === 'string' && scripts[name].trim(), `Missing test script: ${name}`);
  return scripts[name].split(/\s*&&\s*/).flatMap(command => {
    const nested = command.match(/^npm run ([\w:-]+)$/);
    if (nested) return expandSourceCommands(scripts, nested[1], [...parents, name]);
    // Current source commands are literal node/python invocations. New shell
    // syntax needs explicit support, never silent dropping or shell execution.
    assert.match(command, /^(node|python)(?: [A-Za-z0-9_./:-]+)+$/, `Unsupported source command: ${command}`);
    return [command];
  });
}

export function buildSourceValidationPlan(scripts) {
  assert.equal(scripts['validate:source'], 'node scripts/validate-source-once.mjs');
  assert.equal(scripts['source:critical-gate'], 'node scripts/source-critical-gate.mjs');
  const commands = expandSourceCommands(scripts, 'validate:source:checks');
  const gate = scripts['source:critical-gate'];
  assert.equal(commands.filter(command => command === gate).length, 1, 'Exactly one critical source gate is required');
  assert.equal(commands.at(-1), gate, 'The critical source gate must remain the terminal source check');
  return {
    preflight: [...SOURCE_BINDING_PREFLIGHT],
    gate,
    remaining: commands.filter(command => command !== gate && !SOURCE_BINDING_PREFLIGHT.includes(command)),
  };
}

export function sourceCommandsForChangedPaths(paths){
  assert(Array.isArray(paths)&&paths.every(relative=>typeof relative==='string'));
  const commands=new Set();
  for(const relative of paths){
    const target=currentSourceTargets(relative);
    assert(target,'SOURCE_CHANGED_OWNER_REQUIRED: '+relative);
    for(const owner of target.owners)for(const command of owner.commands)commands.add(command);
  }
  return [...commands];
}

export function isOnlyReleaseVersionChange(before,after,oldVersion,newVersion){
  if(typeof before!=='string'||typeof after!=='string'
    ||before.includes('\0')||after.includes('\0')||before.includes('\uFFFD')||after.includes('\uFFFD')
    ||!/^4\.0\.(?:0|[1-9][0-9]*)$/.test(oldVersion??'')
    ||!/^4\.0\.(?:0|[1-9][0-9]*)$/.test(newVersion??'')
    ||oldVersion===newVersion||before===after)return false;
  // Only literal v= cache parameters in static imports and asset tags. A
  // version comparison, metadata value or other semver literal is real code.
  const version=oldVersion.replaceAll('.','\\.');
  const query=new RegExp('([?&]v=)'+version+'(?=&|#|$)','g');
  const cacheUrl=url=>url.replace(query,(_,prefix)=>prefix+newVersion);
  const imports=/^([ \t]*(?:(?:import|export)[ \t]+[A-Za-z0-9_$*{}, \t]*?\bfrom[ \t]+|import[ \t]+|}[ \t]+from[ \t]+))(['"])([^'"\r\n]+)\2([ \t]*;?[ \t]*(?:\/\/[^\r\n]*)?)(\r?)$/gm;
  const tags=/^[ \t]*<(?:script|link|img|source|video|audio|input)\b[^<>\r\n]*>/gm;
  const projected=before.replace(imports,(_,prefix,quote,url,suffix,cr)=>
    prefix+quote+cacheUrl(url)+quote+suffix+cr).replace(tags,tag=>
    tag.replace(/\b(src|href)([ \t]*=[ \t]*)(['"])([^'"\r\n]*)\3/g,
      (_,attribute,equal,quote,url)=>attribute+equal+quote+cacheUrl(url)+quote));
  return projected!==before&&projected===after;
}

function changedSourcePaths(){
  const git=args=>{
    const result=spawnSync('git',args,{cwd:process.cwd(),encoding:'utf8',shell:false,
      env:sourceChildEnvironment('git'),timeout:30000,maxBuffer:8*1024*1024});
    assert(result.status===0&&!result.error&&!result.signal,'SOURCE_DIFF_UNAVAILABLE');
    return result.stdout;
  };
  const head=git(['rev-parse','HEAD']).trim();
  let base='HEAD^1';
  if(process.env.GITHUB_EVENT_NAME==='pull_request'){
    const event=JSON.parse(fs.readFileSync(process.env.GITHUB_EVENT_PATH,'utf8'));
    assert.equal(event.pull_request?.head?.sha,head,'SOURCE_DIFF_HEAD_CHANGED');
    base=event.pull_request?.base?.sha;
    assert.match(base??'',/^[a-f0-9]{40}$/,'SOURCE_DIFF_BASE_UNAVAILABLE');
  }
  const raw=git(['diff','--raw','-z','--no-abbrev','--no-renames','--no-ext-diff',
    '--no-textconv',base,head,'--']).split('\0');
  assert.equal(raw.pop(),'','SOURCE_DIFF_NUL_REQUIRED');
  assert.equal(raw.length%2,0,'SOURCE_DIFF_RAW_REQUIRED');
  const paths=[];
  for(let i=0;i<raw.length;i+=2){
    const entry=/^:([0-7]{6}) ([0-7]{6}) [a-f0-9]{40} [a-f0-9]{40} ([AMD])$/.exec(raw[i]);
    assert(entry&&[entry[1],entry[2]].every(mode=>['000000','100644','100755'].includes(mode)),
      'SOURCE_DIFF_REGULAR_FILES_REQUIRED');
    paths.push(raw[i+1]);
  }
  let oldVersion=null;
  try{oldVersion=JSON.parse(git(['show',base+':package.json'])).version;}catch{/* No version-only exemption. */}
  const newVersion=JSON.parse(fs.readFileSync('package.json','utf8')).version;
  const versionOnly=[];
  const selected=paths.filter(relative=>{
    if(!/^[A-Za-z0-9_.\/-]+$/.test(relative))return true;
    try{
      const before=git(['show',base+':'+relative]),after=git(['show',head+':'+relative]);
      if(isOnlyReleaseVersionChange(before,after,oldVersion,newVersion)){versionOnly.push(relative);return false;}
    }catch{/* Added/deleted/non-text remains an actual changed owner. */}
    return true;
  });
  return {paths:selected,versionOnly};
}

// Source checks run synthetic fixtures, not the hydrated production runtime.
// Keep the host/CI contract explicitly; never pass ambient provider credentials,
// runtime roots, loader options or alternate Git configuration to a child.
const SOURCE_HOST_ENVIRONMENT = new Set([
  'PATH', 'Path', 'PATHEXT', 'SystemRoot', 'SYSTEMROOT', 'WINDIR', 'windir',
  'COMSPEC', 'ComSpec', 'SystemDrive', 'SYSTEMDRIVE', 'ProgramFiles',
  'ProgramFiles(x86)', 'ProgramW6432', 'HOME', 'USERPROFILE', 'HOMEDRIVE',
  'HOMEPATH', 'LOCALAPPDATA', 'APPDATA', 'PROGRAMDATA', 'ProgramData',
  'TEMP', 'TMP', 'TMPDIR', 'USER', 'USERNAME', 'LOGNAME', 'LANG', 'LANGUAGE',
  'LC_ALL', 'LC_CTYPE', 'TZ', 'TERM', 'CI', 'FORCE_COLOR', 'NO_COLOR',
  'PYTHON', 'PYTHON_EXECUTABLE', 'PULL_REQUEST_NUMBER',
  'GIT_NO_LAZY_FETCH', 'GIT_NO_REPLACE_OBJECTS', 'GIT_TERMINAL_PROMPT',
]);
// These are opt-in fixture sizes/measurements or local tool selectors. The
// historical source wrappers intentionally receive no RAVRADAR_* overrides.
const SOURCE_TEST_ENVIRONMENT = new Set([
  'RAVRADAR_PYTHON', 'RAVRADAR_TEST_BASH', 'RAVRADAR_POSIX_TEST_SHELL',
  'RAVRADAR_CHROME', 'RAVRADAR_TEST_LARGE_FORECAST',
  'RAVRADAR_TEST_DENSE_COHERENT_WORK_INPUT',
  'RAVRADAR_RECOVERY_PRIORITY_BENCHMARK', 'RAVRADAR_NATIVE_PROOF_BENCHMARK',
]);
function sourceChildEnvironment(command) {
  const testCommand = /(?:^| )scripts\/test-[^ ]+\.mjs(?: |$)/.test(command);
  const providerFixture = command.startsWith('node --test ')
    && command.split(' ').includes('scripts/test-current-operational-python-contracts.mjs');
  return Object.fromEntries(Object.entries(process.env).filter(([key, value]) =>
    SOURCE_HOST_ENVIRONMENT.has(key) || /^(?:GITHUB_|RUNNER_|SOURCE_GATE_)/.test(key)
      || (testCommand && SOURCE_TEST_ENVIRONMENT.has(key))
      || (providerFixture && key === 'ImageOS' && value === 'ubuntu24')));
}

function executeCommand(command) {
  const [program, ...args] = command.split(' ');
  const result = spawnSync(program === 'node' ? process.execPath : program, args, {
    cwd: process.cwd(), stdio: 'inherit', shell: false,
    env: sourceChildEnvironment(command),
  });
  return result.status === 0 && !result.error && !result.signal ? 0 : 1;
}

export function runSourceValidation(plan, { execute = executeCommand, log = console.log } = {}) {
  const failures = [];
  const executeTimed = (command, phase) => {
    const start = performance.now(), result = execute(command);
    log('SOURCE_TIME ' + JSON.stringify({ phase, command,
      elapsedMs: Math.max(0, Math.round(performance.now() - start)),
      outcome: result === 0 ? 'PASS' : 'FAIL' }));
    return result;
  };
  for (const command of plan.preflight) {
    log(`SOURCE binding preflight: ${command}`);
    if (executeTimed(command, 'binding') !== 0) failures.push(command);
  }
  if (failures.length) {
    log('Source binding preflight failed; dependent checks were not started.');
    return 1; // A red precondition is never a successful/reusable source proof.
  }
  for (const command of plan.remaining) {
    log(`SOURCE: ${command}`);
    if (executeTimed(command, 'check') !== 0) failures.push(command);
  }
  log(`SOURCE critical gate: ${plan.gate}`);
  if (executeTimed(plan.gate, 'critical') !== 0) failures.push(plan.gate);
  if (failures.length) {
    log(`Critical source validation found ${failures.length} failing check(s): ${failures.join(', ')}`);
    return 1;
  }
  log('Critical source validation passed; non-critical suites remain available for targeted or post-data validation.');
  return 0;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    assert.ok(process.argv.length === 2 || (process.argv.length === 3 && process.argv[2] === '--plan'), 'Unsupported source option');
    const scripts = JSON.parse(fs.readFileSync('package.json', 'utf8')).scripts;
    const plan = buildSourceValidationPlan(scripts);
    const diff=changedSourcePaths(),changed=sourceCommandsForChangedPaths(diff.paths);
    plan.remaining=[...new Set([...plan.remaining,...changed])]
      .filter(command=>command!==plan.gate&&!plan.preflight.includes(command));
    if (process.argv[2] === '--plan') {
      console.log(JSON.stringify({ criticalSourceGate: true, bindingPreflight: plan.preflight.length,
        criticalChecks: plan.remaining.length + 1, totalCommands: plan.preflight.length + plan.remaining.length + 1,
        changedOwnerPaths:diff.paths.length,versionOnlyPaths:diff.versionOnly.length,
        historicalBlanketExecuted:false,nativePostgresScope:'SEPARATE_WORKFLOW_PHASE' }));
    } else {
      console.log('SOURCE_SCOPE '+JSON.stringify({fixedCommands:SOURCE_BINDING_PREFLIGHT.length+6,
        changedOwnerPaths:diff.paths.length,versionOnlyPaths:diff.versionOnly.length,
        selectedCommands:plan.remaining.length+1,historicalBlanketExecuted:false,
        nativePostgresScope:'SEPARATE_WORKFLOW_PHASE'}));
      process.exitCode = runSourceValidation(plan);
    }
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
