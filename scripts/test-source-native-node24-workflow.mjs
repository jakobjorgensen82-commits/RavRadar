// Structural CI/runtime wiring only, not native SQL or positive SOURCE proof.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import crypto from 'node:crypto';
import test from 'node:test';
import {SOURCE_NODE24_CAPTURE,SOURCE_NODE24_ENV,inverseSourceNode24Workflow,
  verifyWorkflow} from './national584-source-evidence.mjs';

test('SOURCE legacy native child retains actual Node24 without changing Node22 or national environment',async()=>{
  const source=(await fs.readFile(new URL('../.github/workflows/validate-pull-request.yml',import.meta.url),'utf8'))
    .replace(/\r\n/g,'\n');
  verifyWorkflow(source); // Includes the whole historical workflow inverse/hash.
  const prior=inverseSourceNode24Workflow(source);
  verifyWorkflow(prior);
  assert(!prior.includes('RAVRADAR_SOURCE_NATIVE_NODE24_PATH'));
  assert.deepEqual([...source.matchAll(/node-version: (\d+)/g)].map(match=>Number(match[1])),[22,24,22]);
  const caller=await fs.readFile(new URL('./lib/checkpoint-cas-native-postgres.mjs',import.meta.url),'utf8');
  assert(caller.includes("'--source-legacy-compatibility','--node24-path',node24"));
  assert(!caller.includes("'--source-legacy-compatibility','--node24-path',process.execPath"));
  assert(caller.includes("assert.equal(await fs.realpath(node24),node24"));
  assert(caller.includes("assert.match(runtime.stdout.trim(),/^v24\\.\\d+\\.\\d+$/"));
  for(const changed of [
    source.replace(SOURCE_NODE24_CAPTURE,''),
    source.replace(SOURCE_NODE24_ENV,''),
    source.replace(SOURCE_NODE24_CAPTURE,SOURCE_NODE24_CAPTURE+SOURCE_NODE24_CAPTURE),
    source.replace(SOURCE_NODE24_CAPTURE,SOURCE_NODE24_CAPTURE.replace('$GITHUB_OUTPUT','$GITHUB_ENV')),
    source.replace(SOURCE_NODE24_ENV,SOURCE_NODE24_ENV.replace('outputs.node24_path','outputs.unverified_path')),
    source.replace(SOURCE_NODE24_CAPTURE,'').replace('      - name: Restore Node22',SOURCE_NODE24_CAPTURE+'      - name: Restore Node22'),
  ])assert.throws(()=>verifyWorkflow(changed));
});

test('CURRENT opt-in qualification requires prior exact main proof and cannot deploy or mint its own gate',async()=>{
  const source=(await fs.readFile(new URL('../.github/workflows/validate-current-source-native-profile.yml',import.meta.url),'utf8'))
    .replace(/\r\n/g,'\n');
  function check(value){
    assert.equal(value.split('on:\n  workflow_dispatch:\n').length,2);
    assert.doesNotMatch(value,/^  (?:push|pull_request|schedule|workflow_run|workflow_call):/m);
    assert(value.includes('        type: boolean\n        default: false\n'));
    assert(value.includes('    if: inputs.run_current_native_profile == true\n'));
    assert(value.includes('permissions:\n  contents: read\n  actions: read\n  pull-requests: read\n'));
    assert.doesNotMatch(value,/secrets\.|: write\b|continue-on-error:|supabase |wrangler |workflow run|weather-source-gate\.mjs (?:record|write)/);
    assert(value.includes('  group: ravradar-current-source-native-profile\n  cancel-in-progress: false\n'));
    assert(value.includes('          fetch-depth: 0\n          ref: $'+'{{ github.sha }}\n          persist-credentials: false\n'));
    const steps=[...value.matchAll(/^      - (?:name|uses): ([^\n]+)$/gm)].map(row=>row[1]);
    assert.deepEqual(steps,[
      'actions/checkout@v7','Require the exact current merged main','actions/setup-node@v7',
      'Require the normally issued SOURCE before native preparation',
      'Verify prior live exact-content source validation',
      'Stop unless the exact source already has live green proof','actions/setup-python@v7',
      'Install the existing native acquisition dependencies','Install the same locked local SDK without scripts',
      'Reconfirm main and run only the explicit normal CURRENT profile','Require tracked source to remain unchanged',
    ]);
    assert.equal([...value.matchAll(/^      - /gm)].length,steps.length,'No unregistered unnamed executable step');
    for(const literal of [
      'test "$GITHUB_EVENT_NAME" = workflow_dispatch','test "$GITHUB_REF" = refs/heads/main',
      'test "$GITHUB_SHA" = "$EXPECTED_MAIN_HEAD"','node-version: 24',
      'run: node scripts/weather-source-gate.mjs check','run: test "$SOURCE_REQUIRED" = false',
      'requireSourceProducerOutput();','run: npm ci --ignore-scripts --no-audit --no-fund',
    ])assert(value.includes(literal),literal);
    assert.equal(value.split('test "$(gh api "repos/$GITHUB_REPOSITORY/git/ref/heads/main" --jq \'.object.sha\')" = "$GITHUB_SHA"').length,3,
      'Actual main is checked both initially and immediately before native execution');
    const command='          node scripts/test-protected-ravscore-continuation-checkpoint.mjs --current-source-native-profile\n';
    assert.equal(value.split(command).length,2);
    assert(value.includes('          test -z "$(git status --short --untracked-files=no)"\n'+command));
    assert.equal(crypto.createHash('sha256').update(value).digest('hex'),
      '6ece41eaed6d57c54f063acda8d0598ff1eb1d0541aed32920f70e45c475dbda',
      'Whole reviewed manual source-only workflow, not selected guard snippets');
  }
  check(source);
  for(const [before,after]of [
    ['  workflow_dispatch:\n','  push:\n'],['        default: false\n','        default: true\n'],
    ['  contents: read\n','  contents: write\n'],['          persist-credentials: false\n','          persist-credentials: true\n'],
    ['run: test "$SOURCE_REQUIRED" = false','run: test "$SOURCE_REQUIRED" = true'],
    ['test "$GITHUB_SHA" = "$EXPECTED_MAIN_HEAD"','true # omitted exact main'],
    ['          node-version: 24\n','          node-version: 22\n'],
    ['--current-source-native-profile\n','--source-producer\n'],
  ]){assert(source.includes(before));assert.throws(()=>check(source.replace(before,after)));}
  assert.throws(()=>check(source+'\n# unknown source change\n'));
});
