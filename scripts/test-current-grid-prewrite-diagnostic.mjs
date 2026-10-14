import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { currentGridPrewriteGuard, withCurrentGridPrewriteStage,
  currentGridPrewriteRefusalDiagnostic, emitCurrentGridPrewriteRefusal }
  from './lib/current-grid-prewrite-diagnostic.mjs';

test('first actual guard and Error identity survive outer stages without private property reads', async () => {
  const error = new Error('PRIVATE_DIAGNOSTIC_CANARY');
  Object.defineProperty(error, 'code', { value: 'ERR_ASSERTION' });
  let privateReads = 0, calls = 0;
  for (const key of ['message', 'stack', 'actual', 'expected', 'cause']) {
    Object.defineProperty(error, key, { get() { privateReads += 1; throw new Error('PRIVATE_GETTER'); } });
  }
  await assert.rejects(withCurrentGridPrewriteStage('OLD_ISSUED_SOURCE', 'FIXED_SOURCE_CALLBACK',
    () => withCurrentGridPrewriteStage('OLD_RECOMPUTE', 'EXACT_ORIGINAL_S', () => {
      calls += 1; currentGridPrewriteGuard('ORIGINAL_S_ROW', 'EXACT_ROW', () => { throw error; });
    })), observed => observed === error);
  assert.equal(calls, 1, 'diagnosis never repeats the operation');
  assert.deepEqual(currentGridPrewriteRefusalDiagnostic(error), {
    kind: 'CURRENT_GRID_ORIGINAL_PREWRITE_DIAGNOSTIC', phase: 'ORIGINAL_S_ROW',
    criterion: 'EXACT_ROW', category: 'ASSERTION',
  });
  assert.equal(Object.isFrozen(currentGridPrewriteRefusalDiagnostic(error)), true);
  assert.throws(() => currentGridPrewriteGuard('FINAL_POINTER', 'CURRENT_B_MATCH', () => { throw error; }),
    observed => observed === error);
  assert.equal(currentGridPrewriteRefusalDiagnostic(error).phase, 'ORIGINAL_S_ROW');
  assert.equal(privateReads, 0);
});

test('success results and fixed finite error categories stay independent of private text', async () => {
  const value = Object.freeze({ synthetic: true });
  assert.equal(currentGridPrewriteGuard('CLI', 'FIXED_OPERATION', () => value), value);
  assert.equal(await withCurrentGridPrewriteStage('CURRENT_POINTER', 'AUTHENTICATED_B_READ', () => value), value);
  for (const [code, expected] of [['ENOENT', 'FILE_NOT_FOUND'], ['EEXIST', 'EXISTING_DESTINATION'],
    ['SUPABASE_RESPONSE_BODY_TRANSPORT', 'BODY_TRANSPORT'],
    ['ERR_CHILD_PROCESS_STDIO_MAXBUFFER', 'PROCESS_OUTPUT_BOUND'], [1, 'PROCESS_EXIT'],
    ['PRIVATE_UNKNOWN_CODE', 'UNCLASSIFIED_ERROR']]) {
    const error = Object.assign(new Error('PRIVATE_DIAGNOSTIC_CANARY'), { code });
    await assert.rejects(withCurrentGridPrewriteStage('AUTHENTICATED_B_RESTORE', 'NORMAL_RESTORE',
      () => { throw error; }), observed => observed === error);
    assert.equal(currentGridPrewriteRefusalDiagnostic(error).category, expected);
  }
  const syntax = new SyntaxError('PRIVATE_DIAGNOSTIC_CANARY');
  assert.throws(() => currentGridPrewriteGuard('WHOLE_ORIGINAL_ARCHIVE', 'CONDITIONS', () => { throw syntax; }),
    observed => observed === syntax);
  assert.equal(currentGridPrewriteRefusalDiagnostic(syntax).category, 'PARSE_SYNTAX');
});

test('unknown sites and hostile code getters cannot become invented cause or admission', () => {
  let calls = 0, reads = 0;
  assert.throws(() => currentGridPrewriteGuard('PRIVATE_PHASE', 'PRIVATE_GUARD', () => { calls += 1; }), TypeError);
  assert.equal(calls, 0);
  const error = new Error('PRIVATE_DIAGNOSTIC_CANARY');
  Object.defineProperty(error, 'code', { get() { reads += 1; throw new Error('PRIVATE_CODE'); } });
  assert.throws(() => currentGridPrewriteGuard('AUTHENTICATED_S_READ', 'WHOLE_ROW', () => { throw error; }),
    observed => observed === error);
  assert.equal(reads, 0);
  assert.equal(currentGridPrewriteRefusalDiagnostic(error).category, 'UNCLASSIFIED_ERROR');
  for (const missing of [null, undefined, 'PRIVATE_DIAGNOSTIC_CANARY']) {
    assert.deepEqual(currentGridPrewriteRefusalDiagnostic(missing), {
      kind: 'CURRENT_GRID_ORIGINAL_PREWRITE_DIAGNOSTIC', phase: 'UNKNOWN',
      criterion: 'UNRECORDED', category: 'UNCLASSIFIED_ERROR',
    });
  }
});

test('normal refusal projection preserves the old marker and emits only finite private annotation', async () => {
  const error = Object.assign(new Error('PRIVATE_DIAGNOSTIC_CANARY'), { code: 'ENOENT' });
  await assert.rejects(withCurrentGridPrewriteStage('OLD_ISSUED_LOADER', 'MODULE', () => { throw error; }),
    observed => observed === error);
  const lines = [];
  emitCurrentGridPrewriteRefusal(error, line => lines.push(line));
  assert.equal(lines.length, 3);
  assert.equal(lines[0], 'CURRENT_GRID_ORIGINAL_PREWRITE_REFUSED');
  assert.deepEqual(JSON.parse(lines[1]), currentGridPrewriteRefusalDiagnostic(error));
  assert.equal(lines[2], '::error title=Current-grid original prewrite::phase=OLD_ISSUED_LOADER;criterion=MODULE;category=FILE_NOT_FOUND');
  assert.doesNotMatch(lines.join('\n'), /PRIVATE_|message|actual|expected|cause|stack|path|token|credential/);
  assert.deepEqual(Object.keys(JSON.parse(lines[1])).sort(), ['category', 'criterion', 'kind', 'phase']);
});

test('fixed diagnose-only route keeps every post-prepare mutation unavailable', async t => {
  const workflow = readFileSync('.github/workflows/apply-weather-model-binding-only.yml', 'utf8').replaceAll('\r\n', '\n');
  const marker = '      - name: ';
  function step(name) {
    const anchor = marker + name + '\n';
    assert.equal(workflow.split(anchor).length, 2, 'one exact normal step ' + name);
    const start = workflow.indexOf(anchor) + anchor.length;
    const end = workflow.indexOf(marker, start);
    return workflow.slice(start, end < 0 ? undefined : end);
  }
  assert.match(workflow, /      diagnose_current_grid_original:\n        description: "Skrivefri originaldiagnose; ingen SQL, Edge eller offentlig levering"\n        required: false\n        default: false\n        type: boolean\n/);
  assert.equal(workflow.split('RAVRADAR_CURRENT_GRID_DIAGNOSE_ONLY: ${{ inputs.diagnose_current_grid_original }}').length, 2);
  const authority = step('Require explicit main authority and exact head');
  const runStart = authority.indexOf('        run: |\n');
  const fetchStart = authority.indexOf('          git fetch --no-tags origin ');
  assert.ok(runStart >= 0 && fetchStart > runStart);
  const authorityGuard = authority.slice(runStart + '        run: |\n'.length, fetchStart)
    .split('\n').map(line => line.startsWith('          ') ? line.slice(10) : line).join('\n');
  assert.match(authorityGuard, /test "\$GITHUB_EVENT_NAME" = workflow_dispatch/);
  assert.match(authorityGuard, /test "\$GITHUB_REF" = refs\/heads\/main/);
  assert.match(authorityGuard, /if test "\$RAVRADAR_CURRENT_GRID_DIAGNOSE_ONLY" = true; then\n  test "\$RAVRADAR_CURRENT_GRID_UPGRADE_OPT_IN" = true\n  test "\$GITHUB_RUN_ATTEMPT" = 1\n  test "\$CONFIRMATION" = CHECK-CURRENT-GRID-ORIGINALS\nelse\n  test "\$CONFIRMATION" = APPLY-WEATHER-MODEL-BINDING\nfi/);
  assert.match(step('Reuse exact successful pull-request source proof'), /node scripts\/weather-source-gate\.mjs check/);
  assert.match(step('Require existing source proof without a duplicate gate'), /outputs\.required }}" = false/);
  const prepare = step('Preserve authenticated unchanged originals for the named current-grid successor');
  assert.match(prepare, /^        if: inputs\.upgrade_current_grid_original == true\n/);
  assert.match(prepare, /run: node scripts\/current-grid-binding-prewrite\.mjs prepare\n/);
  assert.doesNotMatch(prepare, /continue-on-error|verify-plan|db push|functions deploy|publish/);
  const postPrepare = [
    'Dry-run and allow only the latest exact binding migration',
    'Reconfirm main immediately before the one database write',
    'Apply only the dry-run-verified binding migration',
    'Read back applied migration and live database binding',
    'Reconfirm exact main before assistant Edge deployment',
    'Deploy only the exact RavRadar assistant Edge function',
    'Verify exact backend and assistant readback without weather or Pages',
  ];
  for (const name of postPrepare) {
    const body = step(name);
    assert.match(body, /^        if: inputs\.diagnose_current_grid_original != true(?: && steps\.integrated-implementation\.outputs\.defer_edges != 'true')?\n/,
      'diagnose true must skip the exact post-prepare caller ' + name);
    if (name.includes('assistant')) assert.match(body, /&& steps\.integrated-implementation\.outputs\.defer_edges != 'true'/,
      'old current-grid Edge floor remains independent');
    assert.ok(workflow.indexOf(marker + name) > workflow.indexOf(marker + 'Preserve authenticated unchanged originals'));
  }
  const acknowledgement = step('Acknowledge successful read-only original check without installation');
  assert.match(acknowledgement, /^        if: inputs\.diagnose_current_grid_original == true\n/);
  assert.match(acknowledgement, /CURRENT_GRID_ORIGINAL_READONLY_CHECK_COMPLETE/);
  assert.match(acknowledgement, /phase=PREPARE;criterion=ORIGINALS_PRESERVED;category=SUCCESS/);
  assert.doesNotMatch(acknowledgement, /always\(|continue-on-error|node |supabase |curl |fetch|publish|VERIFIED=/);
  assert.doesNotMatch(workflow, /continue-on-error/);
  await t.test('actual existing Bash authority guard has no retries or external operation', {
    skip: process.platform !== 'linux' ? 'GNU Bash normal guard is unavailable here; real Linux CI remains required' : false,
  }, () => {
    for (const [diagnose, upgrade, confirmation, attempt, expected] of [
      ['false', 'false', 'APPLY-WEATHER-MODEL-BINDING', '1', 0],
      ['false', 'false', 'APPLY-WEATHER-MODEL-BINDING', '2', 0],
      ['false', 'true', 'CHECK-CURRENT-GRID-ORIGINALS', '1', 1],
      ['true', 'true', 'CHECK-CURRENT-GRID-ORIGINALS', '1', 0],
      ['true', 'false', 'CHECK-CURRENT-GRID-ORIGINALS', '1', 1],
      ['true', 'true', 'APPLY-WEATHER-MODEL-BINDING', '1', 1],
      ['true', 'true', 'CHECK-CURRENT-GRID-ORIGINALS', '2', 1],
    ]) {
      const result = spawnSync('/bin/bash', ['-c', authorityGuard], { encoding: 'utf8', timeout: 5_000,
        env: { GITHUB_EVENT_NAME: 'workflow_dispatch', GITHUB_REF: 'refs/heads/main',
          RAVRADAR_CURRENT_GRID_DIAGNOSE_ONLY: diagnose,
          RAVRADAR_CURRENT_GRID_UPGRADE_OPT_IN: upgrade,
          CONFIRMATION: confirmation, GITHUB_RUN_ATTEMPT: attempt } });
      assert.equal(result.error, undefined);
      assert.equal(result.status, expected);
      assert.equal(result.stdout, '');
      assert.equal(result.stderr, '');
    }
  });
});
