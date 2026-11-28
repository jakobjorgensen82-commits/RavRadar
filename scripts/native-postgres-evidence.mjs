// Source-CI only: reuse one independently verified native phase, never a failed
// source gate. Unknown evidence or input/environment drift executes native PG.
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import {execFileSync, spawnSync, spawn} from 'node:child_process';
import {nativePrograms,nativePostgresProgramIdentity} from './lib/checkpoint-cas-native-postgres.mjs';
import {TRIP_ERASURE_RECOVERY_MIGRATION} from './lib/trip-erasure-recovery-native-fixture.mjs';
import {fileURLToPath} from 'node:url';
import {isDeepStrictEqual} from 'node:util';
import {requireAssistantLaterH0Release,requireAssistantPublic587SuccessorRelease,
  requireAssistantPublic588SuccessorRelease,requireAssistantPublic590SuccessorRelease,requireAssistantPublic591SuccessorRelease,
  requireInstalled593Original591Release,requireInstalled593Original591Binding,requireInstalled593Original591Output,
  INSTALLED593_ORIGINAL591_DATABASE_BEFORE,ACTIVE_ASSISTANT_SUCCESSOR as ACTIVE,
  UNISSUED_ASSISTANT_AFTER597_SUCCESSOR,ASSISTANT_AFTER597_BEFORE,ASSISTANT_AFTER597_ALIASES,
  requireAssistantAfter597Output,requireAssistantAfter597Release,requireAssistantAfter597Binding,
  readScalar597LaterH0CanonicalSource,readAssistantAfter597CanonicalSource,assistantLaterH0Definition,
  INACTIVE_ASSISTANT_AFTER598_SUCCESSOR,ASSISTANT_AFTER598_BEFORE,ASSISTANT_AFTER598_ALIASES,
  requireAssistantAfter598Output,requireAssistantAfter598Release,requireAssistantAfter598Binding,readAssistantAfter598CanonicalSource,INACTIVE_ASSISTANT_AFTER599_SUCCESSOR,ASSISTANT_AFTER599_BEFORE,ASSISTANT_AFTER599_ALIASES,requireAssistantAfter599Output,requireAssistantAfter599Release,requireAssistantAfter599Binding,readAssistantAfter599CanonicalSource,
  INACTIVE_ASSISTANT_AFTER601_SUCCESSOR} from './lib/assistant-later-h0-successor-source.mjs';
import {SOURCE601_ORIGINAL_DATA_PROFILE} from './check-assistant-later-h0-predecessor-source.mjs';

import {assistantAfter597RequiredMigrations,assistantAfter598RequiredMigrations,assistantAfter599RequiredMigrations,
  CHECKPOINT_SCALAR_WALK_MIGRATION} from './integrated-cutover-readiness.mjs';
import * as accountErasureSchema from './verify-account-assistant-schema.mjs';
import {ASSISTANT_AFTER599_DATABASE_LEDGER} from './lib/assistant-later-h0-successor-source.mjs';
import {FROZEN597_NATIVE_SOURCE,FROZEN598_NATIVE_SOURCE,FROZEN599_NATIVE_SOURCE} from './run-frozen586-assistant-later-h0-postgres-source.mjs';
import {scanAllSourceDependencies} from './lib/source-impact-control-imports.mjs';
import {inverseOwnedCacheNativeWorkflow,OWNED_CACHE_NATIVE_EARLY_STEP_NAMES,
  projectSourceImpactWorkflowFull,SOURCE_IMPACT_FULL_WORKFLOW_SHA256,
  hasDependencyOnlySourceSetup,verifyCurrentSourceWorkflow,verifyTargetedSourceStepShape}
  from './lib/source-impact-workflow-review.mjs';

export const ORIGIN = Object.freeze({
  repository: 'jakobjorgensen82-commits/RavRadar', pullRequest: 671,
  run: 39203570076, attempt: 1, job: 117901472855,
  head: '8b855f63a9cd14f5d197c3b50437a4f8eb85b51e',
  completedAt: '2026-10-19T05:39:40Z',
  logSha256: '0b8db2b3f7d98c5fea621386f8d5a0cfa1428e5a76cc03d09020a6205a7e549d',
});
export const WORKFLOW = '.github/workflows/validate-pull-request.yml';
export const JOB = 'Source validation and release gate';
export const STEP = 'Validate native PostgreSQL checkpoint CAS on artificial data only';
export const COMMANDS = Object.freeze([
  'node scripts/run-frozen-native0600-source-targets.mjs policy',
  'node scripts/test-protected-ravscore-continuation-checkpoint.mjs --native-statistics-revision --native-sampling-identity --current-memory-warmup --established-native-current-origin --last-mile-enclosure',
]);
// COMMANDS remains the exact immutable historical receipt inventory.
// The new production command cannot reuse that old SQL proof.
export const ACCOUNT_STATISTICS_ASSISTANT_COMMANDS = Object.freeze([COMMANDS[0],COMMANDS[1]+' --account-statistics-assistant']);
export const CURRENT586_COMMANDS = Object.freeze([ACCOUNT_STATISTICS_ASSISTANT_COMMANDS[0],
  ACCOUNT_STATISTICS_ASSISTANT_COMMANDS[1]+' --native-original-continuity']);
export const CURRENT_COMMANDS = Object.freeze([CURRENT586_COMMANDS[0],CURRENT586_COMMANDS[1]+' --assistant-later-h0']);
export const NATIVE_SCRIPT = 'set -euo pipefail\n' + CURRENT_COMMANDS.join('\n') + '\n';
// Whole587 command/receipt identities above remain immutable historical contracts.
export const ASSISTANT_PUBLIC587_SUCCESSOR_COMMANDS=Object.freeze([CURRENT_COMMANDS[0],
  CURRENT_COMMANDS[1]+' --assistant-public587-successor']);
export const ASSISTANT_PUBLIC587_SUCCESSOR_SCRIPT='set -euo pipefail\n'+ASSISTANT_PUBLIC587_SUCCESSOR_COMMANDS.join('\n')+'\n';
// Additiv kalender588→NEXT-fase. De gamle kommando-/receiptidentiteter ændres ikke.
export const ASSISTANT_PUBLIC588_SUCCESSOR_COMMANDS=Object.freeze([ASSISTANT_PUBLIC587_SUCCESSOR_COMMANDS[0],
  ASSISTANT_PUBLIC587_SUCCESSOR_COMMANDS[1]+' --assistant-public588-successor']);
export const ASSISTANT_PUBLIC588_SUCCESSOR_SCRIPT='set -euo pipefail\n'+ASSISTANT_PUBLIC588_SUCCESSOR_COMMANDS.join('\n')+'\n';
export const ASSISTANT_PUBLIC590_SUCCESSOR_COMMANDS=Object.freeze([ASSISTANT_PUBLIC588_SUCCESSOR_COMMANDS[0],
  ASSISTANT_PUBLIC588_SUCCESSOR_COMMANDS[1]+' --assistant-public590-successor']);
export const ASSISTANT_PUBLIC590_SUCCESSOR_SCRIPT='set -euo pipefail\n'+ASSISTANT_PUBLIC590_SUCCESSOR_COMMANDS.join('\n')+'\n';
export const ASSISTANT_PUBLIC591_SUCCESSOR_COMMANDS=Object.freeze([ASSISTANT_PUBLIC590_SUCCESSOR_COMMANDS[0],
  ASSISTANT_PUBLIC590_SUCCESSOR_COMMANDS[1]+' --assistant-public591-successor']);
export const ASSISTANT_PUBLIC591_SUCCESSOR_SCRIPT='set -euo pipefail\n'+ASSISTANT_PUBLIC591_SUCCESSOR_COMMANDS.join('\n')+'\n';
// Installed593/original591 has its own issued commands; only its new V2 may reuse them.
export const INSTALLED593_ORIGINAL591_COMMANDS=Object.freeze([ASSISTANT_PUBLIC591_SUCCESSOR_COMMANDS[0],
  ASSISTANT_PUBLIC591_SUCCESSOR_COMMANDS[1]+' --assistant-installed593-origin591-successor']);
export const INSTALLED593_ORIGINAL591_SCRIPT='set -euo pipefail\n'+INSTALLED593_ORIGINAL591_COMMANDS.join('\n')+'\n';
export const SCALAR597_LATER_H0_PHASE='scalar597-later-h0-original594-successor';
export const SCALAR597_LATER_H0_PHASE_KIND='RAVRADAR_SCALAR597_LATER_H0_POSTGRES_PHASE_V1';
export const SCALAR597_LATER_H0_COMMANDS=Object.freeze(['node scripts/test-protected-ravscore-continuation-checkpoint.mjs --scalar597-later-h0']);
export const SCALAR597_LATER_H0_SCRIPT='set -euo pipefail\n'+SCALAR597_LATER_H0_COMMANDS.join('\n')+'\n';
export const ASSISTANT_AFTER597_PHASE=UNISSUED_ASSISTANT_AFTER597_SUCCESSOR.sourcePhase;
export const ASSISTANT_AFTER597_PHASE_KIND='RAVRADAR_ASSISTANT_AFTER597_POSTGRES_PHASE_V1';
export const ASSISTANT_AFTER597_COMMANDS=Object.freeze(['node scripts/test-protected-ravscore-continuation-checkpoint.mjs --assistant-after597-successor']);
export const ASSISTANT_AFTER597_SCRIPT='set -euo pipefail\n'+ASSISTANT_AFTER597_COMMANDS.join('\n')+'\n';
export const ASSISTANT_AFTER598_PHASE=INACTIVE_ASSISTANT_AFTER598_SUCCESSOR.sourcePhase;
export const ASSISTANT_AFTER598_PHASE_KIND='RAVRADAR_ASSISTANT_AFTER598_POSTGRES_PHASE_V1';
export const ASSISTANT_AFTER598_COMMANDS=Object.freeze(['node scripts/test-protected-ravscore-continuation-checkpoint.mjs --assistant-after598-successor']);
export const ASSISTANT_AFTER598_SCRIPT='set -euo pipefail\n'+ASSISTANT_AFTER598_COMMANDS.join('\n')+'\n';
export const ASSISTANT_AFTER599_PHASE=INACTIVE_ASSISTANT_AFTER599_SUCCESSOR.sourcePhase;
export const ASSISTANT_AFTER599_PHASE_KIND='RAVRADAR_ASSISTANT_AFTER599_POSTGRES_PHASE_V1';
export const ASSISTANT_AFTER599_REUSE_KIND='RAVRADAR_ASSISTANT_AFTER599_POSTGRES_REUSE_V2';
export const ASSISTANT_AFTER599_COMMANDS=Object.freeze(['node scripts/test-protected-ravscore-continuation-checkpoint.mjs --assistant-after599-successor']);
export const ASSISTANT_AFTER599_SCRIPT='set -euo pipefail\n'+ASSISTANT_AFTER599_COMMANDS.join('\n')+'\n';
export const ASSISTANT_AFTER601_PHASE_KIND='RAVRADAR_ASSISTANT_AFTER601_POSTGRES_PHASE_V1';
export const ASSISTANT_AFTER601_EXECUTED_V2_KIND='RAVRADAR_ASSISTANT_AFTER601_POSTGRES_EXECUTED_V2';
export const ASSISTANT_AFTER601_REUSE_V2_KIND='RAVRADAR_ASSISTANT_AFTER601_POSTGRES_REUSE_V2';
export const ASSISTANT_AFTER601_PHASE=INACTIVE_ASSISTANT_AFTER601_SUCCESSOR.sourcePhase;
const AFTER601_RESULT='ASSISTANT_AFTER601_SUCCESSOR';
export const ASSISTANT_AFTER601_COMMANDS=Object.freeze(['node scripts/test-protected-ravscore-continuation-checkpoint.mjs --assistant-after601-successor']);
export const ASSISTANT_AFTER601_SCRIPT='set -euo pipefail\n'+ASSISTANT_AFTER601_COMMANDS.join('\n')+'\n';
export const ACTIVE_COMMANDS=ACTIVE.sourcePhase===ASSISTANT_AFTER601_PHASE?ASSISTANT_AFTER601_COMMANDS:ACTIVE.sourcePhase===ASSISTANT_AFTER599_PHASE?ASSISTANT_AFTER599_COMMANDS:ACTIVE.sourcePhase===ASSISTANT_AFTER598_PHASE?ASSISTANT_AFTER598_COMMANDS:ACTIVE.sourcePhase===ASSISTANT_AFTER597_PHASE?ASSISTANT_AFTER597_COMMANDS
  :ACTIVE.sourcePhase===SCALAR597_LATER_H0_PHASE
  ?SCALAR597_LATER_H0_COMMANDS:ACTIVE.sourcePhase==='assistant-installed593-origin591-successor'
  ?INSTALLED593_ORIGINAL591_COMMANDS:ACTIVE.sourcePhase==='assistant-public591-successor'
  ?ASSISTANT_PUBLIC591_SUCCESSOR_COMMANDS:ACTIVE.sourcePhase==='assistant-public590-successor'
  ?ASSISTANT_PUBLIC590_SUCCESSOR_COMMANDS:ACTIVE.sourcePhase==='assistant-public588-successor'
  ?ASSISTANT_PUBLIC588_SUCCESSOR_COMMANDS:ASSISTANT_PUBLIC587_SUCCESSOR_COMMANDS;
export const ACTIVE_NATIVE_SCRIPT=ACTIVE.sourcePhase===ASSISTANT_AFTER601_PHASE?ASSISTANT_AFTER601_SCRIPT:ACTIVE.sourcePhase===ASSISTANT_AFTER599_PHASE?ASSISTANT_AFTER599_SCRIPT:ACTIVE.sourcePhase===ASSISTANT_AFTER598_PHASE?ASSISTANT_AFTER598_SCRIPT:ACTIVE.sourcePhase===ASSISTANT_AFTER597_PHASE?ASSISTANT_AFTER597_SCRIPT
  :ACTIVE.sourcePhase===SCALAR597_LATER_H0_PHASE
  ?SCALAR597_LATER_H0_SCRIPT:ACTIVE.sourcePhase==='assistant-installed593-origin591-successor'
  ?INSTALLED593_ORIGINAL591_SCRIPT:ACTIVE.sourcePhase==='assistant-public591-successor'
  ?ASSISTANT_PUBLIC591_SUCCESSOR_SCRIPT:ACTIVE.sourcePhase==='assistant-public590-successor'
  ?ASSISTANT_PUBLIC590_SUCCESSOR_SCRIPT:ACTIVE.sourcePhase==='assistant-public588-successor'
  ?ASSISTANT_PUBLIC588_SUCCESSOR_SCRIPT:ASSISTANT_PUBLIC587_SUCCESSOR_SCRIPT;

// Explicit CURRENT non-native test consumers only. Historical copies of these
// files are NOT excluded: unchanged frozen loaders read exact old Git blobs.
// Never broaden to test-*.mjs, scripts/lib, docs, versions or migrations.
export const NON_NATIVE_TEST_INPUTS = Object.freeze([
  'scripts/lib/archived-weather-restart-updater-test-input.mjs',
  'scripts/lib/archived-weather-restart-updater-test-input.json',
  'scripts/lib/alternative-c-caller-test-input.mjs',
  'scripts/test-ravscore-initial-current-window-audit.mjs',
  'scripts/test-weather-state-epoch-input-view.mjs',
  'scripts/test-ravscore-recovery-replay.mjs',
  'scripts/test-protected-dmi-native-current-proofs.mjs',
  'scripts/test-dmi-protected-tuple-continuity.mjs',
  'scripts/test-weather-component-normal-wireup.mjs',
  'scripts/test-reusable-production-workflows.mjs',
  'scripts/test-weather-update-entrypoint.mjs',
  // These two CURRENT UI/VM artifact callers never enter either PG command.
  // Their immutable historical Git copies remain bound by the frozen trees.
  'scripts/test-mobile-start-and-live-cache-4.0.74.mjs',
  'scripts/test-current-arrow-land-mask.mjs',
  // This CURRENT PR-workflow contract test is a source/release collector leaf,
  // not a command/input of either native PG target. Frozen Git copies stay exact.
  'scripts/test-workflow-validation-order-4.0.108.mjs',
]);
// These five prose records are not read by the reviewed native command or its
// historical materializers. No whole documentation directory is excluded.
export const NON_NATIVE_PROSE = Object.freeze([
  'AGENTS.md', 'CHANGELOG.md', 'docs/rdks/01_AI_OPERATING_RULES.md',
  'docs/rdks/90_INDEX/CURRENT_TRUTH.md', 'docs/rdks/90_INDEX/IMPLEMENTATION_STATUS.md',
]);
const REUSE_FILES = ['scripts/native-postgres-evidence.mjs', 'scripts/test-native-postgres-evidence.mjs'];
const FROZEN = [
  ['044d3045fecc2e70d6f35f60010921c6bd597ecc','4c56c3b73633bf3a5e1540e4f53e75be49f0b9da'],
  ['60d999a68136c43acb4d3664bbd66eed47283bb2','ead5743dd9098035b0de5f748de2009460506971'],
  ['d7b31aa3c706e2f657fe5de99c56434f3cff260d','9d05b060dba9015233a368c63438a3dfd9b9b45d'],
  ['d8a52e3e4cbaed1557cc56fe01f5f0a2b0d657d7','0ddede3f4b4fb4faa43b0d43f17c7cdbadcc9bc0'],
];
export const NEW_NATIVE_BLOCK = [
  '      - name: ' + STEP,
  '        shell: bash',
  '        env:',
  '          GITHUB_TOKEN: ${{ github.token }}',
  '          SOURCE_GATE_HEAD_SHA: ${{ github.event.pull_request.head.sha }}',
  '          PULL_REQUEST_NUMBER: ${{ github.event.pull_request.number }}',
  '        run: |',
  '          set -euo pipefail',
  '          node --test scripts/test-native-postgres-evidence.mjs',
  '          node scripts/native-postgres-evidence.mjs',
  '',
].join('\n') + '\n';
const sha = value => crypto.createHash('sha256').update(value).digest('hex');
const lf = value => String(value).replace(/\r\n/g, '\n');
const complete = (value, key) => Number.isSafeInteger(value?.total_count)
  && value.total_count >= 0 && value.total_count <= 100
  && Array.isArray(value[key]) && value.total_count === value[key].length;
const successful = value => value?.status === 'completed' && value.conclusion === 'success';
const one = values => { assert.equal(values.length, 1); return values[0]; };

export function nativeBlock(source) {
  const text = lf(source), start = text.indexOf('      - name: ' + STEP + '\n');
  assert(start >= 0 && text.indexOf('      - name: ' + STEP + '\n', start + 1) === -1);
  const end = text.indexOf('      - name:', start + 1); assert(end > start);
  return text.slice(start, end);
}
export function verifyWorkflow(before, after) {
  before = lf(before); after = lf(after);
  assert.equal(nativeBlock(after), NEW_NATIVE_BLOCK);
  assert.equal(after.split('  actions: read\n').length, 2);
  const restored = after.replace(NEW_NATIVE_BLOCK, nativeBlock(before)).replace('  actions: read\n', '');
  assert.equal(restored, before, 'Only the exact evidence wrapper and read permission may differ');
  for (const command of COMMANDS) assert.equal(nativeBlock(before).split('          ' + command + '\n').length, 2);
  assert.match(nativeBlock(before), /shell: bash\n        run: \|\n          set -euo pipefail\n/);
}
export function parseTree(text) {
  return String(text).split('\0').filter(Boolean).map(row => {
    const match = /^(\d{6}) (blob|commit) ([a-f0-9]{40})\t([^\0]+)$/.exec(row);
    assert(match); return [match[4], match[1], match[2], match[3]];
  }).sort((a, b) => a[0].localeCompare(b[0], 'en'));
}
export const FOLLOWUP_INPUTS=Object.freeze([
  {
    "path": ".github/workflows/deploy-code-only-repair.yml",
    "role": "EXACT_DEPLOY_GATE_AND_TIMEOUT_INVERSE",
    "before": {
      "sha256": "b87ef14d831e6e825607a22deef3ab10f85bab654d2101731a473b393cb619cf",
      "gitBlob": "42840b788860fddb5e20e7cba7d6857b9302f434"
    },
    "after": {
      "sha256": "b10eac363d4c067bf7f7c81159881b57a70923851ae8e78d1dde2357a770a477",
      "gitBlob": "41e5375a2c90bd06d7fcd6e6d444aa027e320826"
    }
  },
  {
    "path": "scripts/lib/archived-production-gate-review.mjs",
    "role": "EXACT_NON_NATIVE_TEST_ADAPTER",
    "before": null,
    "after": {
      "sha256": "d2e9f9b88b2b52e8ed3b31bccccfbc91d0032f2f520162ea7324f7c333696bf4",
      "gitBlob": "0945181849688930b5a23f27b80b2dbcf7fca47f"
    }
  },
  {
    "path": "scripts/lib/archived-production-gate-review.json",
    "role": "EXACT_NON_NATIVE_TEST_ADAPTER",
    "before": null,
    "after": {
      "sha256": "11d7f402b18871a4bd46717de27158fd4db8eba710f2db6c4fb8e9ece78247f7",
      "gitBlob": "56dcd51eeba776abbd98085ab47513ff966097a1"
    }
  },
  {
    "path": "scripts/lib/archived-weather-restart-workflow-review.mjs",
    "role": "EXACT_NON_NATIVE_TEST_ADAPTER",
    "before": {
      "sha256": "fbc8ab6201d18e4d2c8b6f1f07b14d234463819d0a2776a72931ad8cf952587a",
      "gitBlob": "8b96f4f0ccdffe006a53cf2309a7213900939425"
    },
    "after": {
      "sha256": "fcdbf0cf41fdde6cfd918b2f0b63f9685c7923e0bbdb70e3e7cd72078a73bf74",
      "gitBlob": "c65c09f1f632df26184eb6eb36e24c14184fadbe"
    }
  },
  {
    "path": "scripts/test-archived-weather-restart-workflow.mjs",
    "role": "EXACT_NON_NATIVE_TEST_ADAPTER",
    "before": {
      "sha256": "abc9e350a947990855d5f9ee4401420023d7bc9a40d693fea35d69d182004614",
      "gitBlob": "0e8e5be9dbc67a1814f6f4a3160cf5e61f864fa3"
    },
    "after": {
      "sha256": "d0b603ed6432ba7f639a5a5db96b98f0ab0243bf6c2d10c268c8a5d0f878a7e4",
      "gitBlob": "5003ab455df2cdd0f3a66dd95a7bcedbdcac086e"
    }
  },
  {
    "path": "docs/ai/CODEX_START_HERE.md",
    "role": "EXACT_NON_NATIVE_PROSE_RECORD",
    "before": {
      "sha256": "84bb1954e1088eae171f39aacf8220f90ab28f48e81eca28bb3a80ab36116875",
      "gitBlob": "92f204fc2e413a1c1c4aa0e9574ca9a016e12b7b"
    },
    "after": {
      "sha256": "3d3c6bb0c6b44788b79be49df228049159fccd9c945337442e3afad2910bb85c",
      "gitBlob": "142f461429bc223f67c18b81647c70fab8b96d45"
    }
  },
  {
    "path": "docs/rdks/10_DECISIONS/DEC-0184-CRITICAL-PRODUCTION-ARTIFACT-GATE.md",
    "role": "EXACT_NON_NATIVE_PROSE_RECORD",
    "before": {
      "sha256": "b218eaf0cf9aa41f8339128287609a407c1c837cc8effd6e2e845926a36a8822",
      "gitBlob": "d0471f5eb2ee72e713f77c466ceb477e81bc6d78"
    },
    "after": {
      "sha256": "90985721fe68d16e1d1632e28058dfd8c96a450f3a2d61242fd797b908a00396",
      "gitBlob": "e4aae721de79ae4a53e522038e10ca14c5643d2c"
    }
  }
]);

// Exact, reviewed current-only source adapters. Never exclude a workflow tree.
// Existing entries are mapped back only after authentic whole before/after
// source and Git object identity plus the two-hunk workflow inverse qualify.
export function verifyFollowupInputs(before, after, readSource) {
  const old = new Map(before.map(row => [row[0], row]));
  const next = new Map(after.map(row => [row[0], row]));
  assert(before.length>0&&after.length>0&&old.size===before.length&&next.size===after.length);
  const changed = FOLLOWUP_INPUTS.filter(row => JSON.stringify(old.get(row.path)) !== JSON.stringify(next.get(row.path)));
  if (!changed.length) return {before,after,paths:[]};
  assert.equal(typeof readSource,'function','Exact follow-up source operands are required');
  const sources = new Map();
  for (const pin of FOLLOWUP_INPUTS) {
    const a=old.get(pin.path), b=next.get(pin.path);
    assert.deepEqual(a,pin.before===null?undefined:[pin.path,'100644','blob',pin.before.gitBlob]);
    assert.deepEqual(b,[pin.path,'100644','blob',pin.after.gitBlob]);
    const current=readSource(pin.path,'after'); assert.equal(sha(current),pin.after.sha256);
    assert.equal(crypto.createHash('sha1').update('blob '+Buffer.byteLength(current)+'\0').update(current).digest('hex'),pin.after.gitBlob);
    let prior=null;
    if(pin.before!==null){prior=readSource(pin.path,'before');assert.equal(sha(prior),pin.before.sha256);
      assert.equal(crypto.createHash('sha1').update('blob '+Buffer.byteLength(prior)+'\0').update(prior).digest('hex'),pin.before.gitBlob);}
    sources.set(pin.path,{current,prior});
  }
  const workflow=sources.get('.github/workflows/deploy-code-only-repair.yml');
  const descriptor=JSON.parse(sources.get('scripts/lib/archived-production-gate-review.json').current);
  assert.equal(descriptor.schemaVersion,1);assert.equal(descriptor.kind,'TEST_ONLY_EXACT_ARCHIVED_PRODUCTION_GATE_INVERSE');
  assert.equal(descriptor.edits.length,2);assert.equal(sha(workflow.current),descriptor.actualSha256);
  let restored=workflow.current,last=Infinity;
  for(const[offset,current,prior]of descriptor.edits){assert(Number.isSafeInteger(offset)&&offset>=0&&offset<last);last=offset;
    assert.equal(restored.slice(offset,offset+current.length),current);restored=restored.slice(0,offset)+prior+restored.slice(offset+current.length);}
  assert.equal(restored,workflow.prior,'Only the exact gate and restart timeout may differ');
  assert.equal(sha(restored),descriptor.predecessorSha256);
  const regular=new Map(next);
  for(const pin of FOLLOWUP_INPUTS){if(pin.before===null)regular.delete(pin.path);else regular.set(pin.path,old.get(pin.path));}
  return {before,after:[...regular.values()].sort((a,b)=>a[0].localeCompare(b[0],'en')),paths:changed.map(row=>row.path),workflowWholeInverse:true};
}

export function verifyCurrentPullRequest(pr,current,number) {
  assert(Number.isSafeInteger(number)&&number>0);
  assert.equal(pr.number,number);assert.equal(pr.state,'open');
  assert.equal(pr.base?.repo?.full_name,ORIGIN.repository);assert.equal(pr.base?.ref,'main');
  assert.equal(pr.head?.repo?.full_name,ORIGIN.repository);
  assert.equal(pr.head?.sha,current.head_sha);assert.equal(pr.head?.ref,current.head_branch);
  assert.equal(typeof current.head_branch,'string');assert(current.head_branch.length>0&&current.head_branch.length<=255);
  assert(current.pull_requests?.some(value=>value.number===number));
  return {number,branch:current.head_branch,head:current.head_sha};
}


export function verifyInputTrees(before, after, readSource) {
  const followup=verifyFollowupInputs(before,after,readSource); before=followup.before; after=followup.after;
  const excluded = new Set([...NON_NATIVE_TEST_INPUTS, ...NON_NATIVE_PROSE, ...REUSE_FILES, WORKFLOW]);
  const old = new Map(before.map(row => [row[0], row]));
  const next = new Map(after.map(row => [row[0], row]));
  assert(before.length > 0 && after.length > 0 && old.size === before.length && next.size === after.length);
  for (const file of excluded) {
    const a = old.get(file), b = next.get(file);
    if (a) assert(b, 'A reviewed test may not disappear');
    for (const row of [a,b].filter(Boolean)) assert(row[1] === '100644' && row[2] === 'blob');
  }
  const retained = rows => rows.filter(row => !excluded.has(row[0]));
  assert.deepEqual(retained(after), retained(before), 'Every other tracked file, mode and Git blob must be identical');
  return {inputGitManifestSha256: sha(JSON.stringify(retained(before))),
    retainedEntries: retained(before).length,
    changedNonNativePaths: [...excluded].filter(file => JSON.stringify(old.get(file)) !== JSON.stringify(next.get(file))).sort(),
    frozenGitTrees: FROZEN.map(([head,tree]) => ({head,tree})),
    exactFollowupInputs:followup.paths,followupWorkflowWholeInverse:followup.workflowWholeInverse===true};
}
export function verifyOriginMetadata(run, jobs) {
  assert.equal(run.id, ORIGIN.run); assert.equal(run.run_attempt, ORIGIN.attempt);
  assert.equal(run.head_sha, ORIGIN.head); assert.equal(run.path, WORKFLOW);
  assert.equal(run.event, 'pull_request'); assert.equal(run.repository?.full_name, ORIGIN.repository);
  assert.equal(run.status, 'completed'); assert.equal(run.conclusion, 'failure');
  assert(Number.isFinite(Date.parse(run.created_at)) && Date.parse(run.created_at) < Date.parse(ORIGIN.completedAt));
  assert(run.pull_requests?.some(pr => pr.number === ORIGIN.pullRequest));
  assert(complete(jobs, 'jobs'));
  const job = one(jobs.jobs.filter(value => value.id === ORIGIN.job && value.name === JOB));
  assert.equal(job.run_id, ORIGIN.run); assert.equal(job.run_attempt, ORIGIN.attempt);
  assert.equal(job.head_sha, ORIGIN.head); assert.equal(job.status, 'completed'); assert.equal(job.conclusion, 'failure');
  const pg = one(job.steps.filter(value => value.name === STEP));
  assert(successful(pg)); assert.equal(pg.number, 15); assert.equal(pg.completed_at, ORIGIN.completedAt);
  const source = one(job.steps.filter(value => value.name === 'Validate source contracts and release governance'));
  assert.equal(source.number, 16); assert.equal(source.status, 'completed'); assert.equal(source.conclusion, 'failure');
  const national = one(job.steps.filter(value => value.name === 'Validate isolated restart and two ordinary national followers'));
  assert.equal(national.number, 17); assert.equal(national.conclusion, 'skipped');
  return {nativeCompletedAt: pg.completed_at, sourceConclusion: source.conclusion};
}
export function verifyOrigin(run, jobs, log) {
  const metadata = verifyOriginMetadata(run, jobs);
  assert.equal(sha(log), ORIGIN.logSha256, 'Actual original job log must match the retained immutable receipt');
  // Authenticate RAW bytes above; only then remove the runner's observed SGR
  // colour framing from the logged command display. No argv rewriting.
  const lines = String(log).split(/\r?\n/).map(line => line.replace(/^\d{4}-\d\d-\d\dT\S+Z /, '')
    .replace(/\u001b\[[0-9;]*m/g, ''));
  for (const command of COMMANDS) assert.equal(lines.filter(line => line === command).length, 1);
  const report = JSON.parse(one(lines.filter(line => line.startsWith('{"kind":"NATIVE_POSTGRES_CHECKPOINT_CAS_COMPARISON"'))));
  assert.equal(report.sqlExecuted, true); assert.equal(report.migrationExecuted, true);
  assert.equal(report.postgresMajorVersion, 16); assert.equal(report.tcpEnabled, false);
  assert.equal(report.lastMileEnclosure?.sqlExecuted, true);
  assert.equal(report.lastMileEnclosure?.wholeMigrationExecuted, true);
  assert.equal(report.lastMileEnclosure?.migrationVersion, '20261019060000');
  assert.equal(report.lastMileEnclosure?.trueOld140000Fixtures, true);
  assert.equal(report.lastMileEnclosure?.currentNormalFixtures, true);
  return metadata;
}
export function verifyEnvironment(value) {
  // The old log records image+runtime identity and PG major, NOT a binary SHA.
  // The unchanged setup never installs/changes PG; a different image reruns it.
  assert.equal(value.platform, 'linux'); assert.equal(value.arch, 'x64');
  assert.equal(value.imageOS, 'ubuntu24'); assert.equal(value.imageVersion, '20261012.334.1');
  assert.equal(value.node, 'v22.23.3'); assert.equal(value.python, 'Python 3.12.15');
  assert.equal(value.pythonLocation, '/opt/hostedtoolcache/Python/3.12.15/x64');
  assert.equal(value.ldLibraryPath, value.pythonLocation + '/lib');
  assert.equal(value.pgBindir, '/usr/lib/postgresql/16/bin');
  assert.deepEqual(value.pgMajors, [16,16,16,16]);
  assert.equal(value.git, 'git version 2.55.0');
  assert.deepEqual(value.overrides, []);
  return value;
}
export function verifyLaterRuns(list, jobsByRun, originRun, currentRunId, branch=originRun.head_branch) {
  assert(complete(list, 'workflow_runs'));
  assert.equal(new Set(list.workflow_runs.map(run=>run.id)).size,list.workflow_runs.length);
  for (const run of list.workflow_runs) {
    assert.equal(run.path, WORKFLOW); assert.equal(run.event, 'pull_request');
    assert.equal(run.repository?.full_name, ORIGIN.repository);
    assert.equal(run.head_branch, branch);
    if ([ORIGIN.run,currentRunId].includes(run.id)) continue;
    assert.equal(run.status, 'completed'); assert.equal(run.run_attempt, 1);
    const jobs = jobsByRun.get(run.id); assert(complete(jobs, 'jobs'));
    const job = one(jobs.jobs.filter(value => value.name === JOB));
    assert.equal(job.run_id, run.id); assert.equal(job.run_attempt, run.run_attempt); assert.equal(job.head_sha, run.head_sha);
    const step = one(job.steps.filter(value => value.name === STEP));
    assert(step.conclusion === 'skipped' || successful(step), 'Later failed, cancelled or unknown PG forbids reuse');
  }
}
const git = args => execFileSync('git', args, {encoding:'utf8', maxBuffer:64*1024*1024, timeout:30000});
function environment() {
  const command = (file,args) => execFileSync(file,args,{encoding:'utf8',timeout:10000}).trim();
  const pgBindir = command('pg_config',['--bindir']);
  return {platform:process.platform,arch:process.arch,imageOS:process.env.ImageOS,imageVersion:process.env.ImageVersion,
    node:process.version, python:command('python',['--version']),pythonLocation:process.env.pythonLocation,
    ldLibraryPath:process.env.LD_LIBRARY_PATH,git:command('git',['--version']),pgBindir,
    pgMajors:['initdb','pg_ctl','psql','postgres'].map(name => Number(command(path.join(pgBindir,name),['--version']).match(/\b(\d+)\.\d+/)?.[1])),
    overrides:Object.keys(process.env).filter(key => /^(?:PG|NODE_OPTIONS$|NODE_PATH$|LD_PRELOAD$|GIT_(?:OBJECT|ALTERNATE|REPLACE|CONFIG))/.test(key)).sort()};
}
async function github(route, {raw=false}={}) {
  const response = await fetch('https://api.github.com' + route, {headers:{
    Authorization:'Bearer ' + process.env.GITHUB_TOKEN,Accept:'application/vnd.github+json','X-GitHub-Api-Version':'2022-11-28',
  },redirect:'manual',signal:AbortSignal.timeout(15000)});
  if (raw && response.status === 302) {
    const url = new URL(response.headers.get('location'));
    assert(url.protocol === 'https:' && !url.username && !url.password);
    // GitHub's signed log URL receives NO repository token.
    const log = await fetch(url,{redirect:'error',signal:AbortSignal.timeout(15000)});
    assert(log.ok); const bytes = Buffer.from(await log.arrayBuffer()); assert(bytes.length <= 2*1024*1024); return bytes;
  }
  assert(response.ok); assert(!raw, 'Expected immutable GitHub job-log download'); return response.json();
}
export async function decideReuse({env=process.env,get=github,readGit=git,getEnvironment=environment}={}) {
  try {
    assert.equal(env.GITHUB_EVENT_NAME,'pull_request'); assert.equal(env.GITHUB_REPOSITORY,ORIGIN.repository);
    const currentPrNumber=Number(env.PULL_REQUEST_NUMBER);
    assert(/^[1-9][0-9]*$/.test(env.PULL_REQUEST_NUMBER||'')&&Number.isSafeInteger(currentPrNumber));
    assert.equal(env.GITHUB_RUN_ATTEMPT,'1');assert(/^[a-f0-9]{40}$/.test(env.SOURCE_GATE_HEAD_SHA));
    assert.equal(readGit(['rev-parse','HEAD^{commit}']).trim(),env.SOURCE_GATE_HEAD_SHA);
    assert.equal(readGit(['status','--porcelain','--untracked-files=no']).trim(),'');
    assert.equal(readGit(['for-each-ref','refs/replace']).trim(),'');
    assert.equal(readGit(['rev-parse','--is-shallow-repository']).trim(),'false');
    readGit(['merge-base','--is-ancestor',ORIGIN.head,'HEAD']);
    for (const [head,tree] of FROZEN) assert.equal(readGit(['rev-parse',head+'^{tree}']).trim(),tree);
    verifyWorkflow(readGit(['show',ORIGIN.head+':'+WORKFLOW]),readGit(['show','HEAD:'+WORKFLOW]));
    const inputs=verifyInputTrees(parseTree(readGit(['ls-tree','-rz','--full-tree',ORIGIN.head])),parseTree(readGit(['ls-tree','-rz','--full-tree','HEAD'])),
      (file,side)=>readGit(['show',(side==='before'?ORIGIN.head:'HEAD')+':'+file]));
    const runtime=verifyEnvironment(getEnvironment());
    const repo='/repos/'+ORIGIN.repository,base=repo+'/actions',originRun=await get(base+'/runs/'+ORIGIN.run);
    const jobs=await get(base+'/runs/'+ORIGIN.run+'/attempts/1/jobs?per_page=100');
    const log=await get(base+'/jobs/'+ORIGIN.job+'/logs',{raw:true});verifyOrigin(originRun,jobs,log);
    const currentRunId=Number(env.GITHUB_RUN_ID);assert(Number.isSafeInteger(currentRunId)&&currentRunId>ORIGIN.run);
    const current=await get(base+'/runs/'+currentRunId);
    assert.equal(current.id,currentRunId);assert.equal(current.run_attempt,1);assert.equal(current.path,WORKFLOW);
    assert.equal(current.head_sha,env.SOURCE_GATE_HEAD_SHA);assert.equal(current.event,'pull_request');
    assert.equal(current.repository?.full_name,ORIGIN.repository);
    const pullRequest=verifyCurrentPullRequest(await get(repo+'/pulls/'+currentPrNumber),current,currentPrNumber);
    const branches=[...new Set([originRun.head_branch,current.head_branch])];
    assert(branches.every(branch=>typeof branch==='string'&&branch.length>0&&branch.length<=255));
    const branchAudits=[];
    for(const branch of branches){
      const query=new URLSearchParams({event:'pull_request',branch,created:'>='+originRun.created_at,per_page:'100'});
      const later=await get(base+'/workflows/validate-pull-request.yml/runs?'+query);
      assert(complete(later,'workflow_runs'));
      if(branch===originRun.head_branch)assert(later.workflow_runs.some(run=>run.id===ORIGIN.run));
      if(branch===current.head_branch)assert(later.workflow_runs.some(run=>run.id===currentRunId));
      const laterJobs=new Map();
      for(const run of later.workflow_runs)if(![ORIGIN.run,currentRunId].includes(run.id))
        laterJobs.set(run.id,await get(base+'/runs/'+run.id+'/attempts/'+run.run_attempt+'/jobs?per_page=100'));
      verifyLaterRuns(later,laterJobs,originRun,currentRunId,branch);
      branchAudits.push({branch,totalRuns:later.total_count,complete:true});
    }
    // Fresh metadata after both branch audits: no moved PR, old rerun or lost
    // original-phase evidence may grant reuse on another current PR.
    verifyOriginMetadata(await get(base+'/runs/'+ORIGIN.run),jobs);
    verifyCurrentPullRequest(await get(repo+'/pulls/'+currentPrNumber),current,currentPrNumber);
    return {status:'REUSED',executedInThisRun:false,origin:ORIGIN,current:{run:currentRunId,attempt:1,head:env.SOURCE_GATE_HEAD_SHA,pullRequest},commands:COMMANDS,...inputs,
      branchAudits,runtime,environmentEvidence:'same-hosted-image-and-observed-runtime-prerequisites-not-an-unobserved-binary-sha'};
  } catch { return {status:'EXECUTE',reason:'native-input-or-evidence-unavailable-or-different'}; }
}


// CURRENT586-only phase receipt. It never certifies the whole source gate.
export const CURRENT586_PHASE_KIND='RAVRADAR_NATIVE586_POSTGRES_PHASE_V1';
export const CURRENT586_PHASE_FILE='.cache/native-postgres-phase-proof.json';
export const CURRENT586_PHASE_UPLOAD='Upload independently completed native586 PostgreSQL phase';
export const CURRENT586_WORKFLOW_BASE_SHA256='7202708b50eb1a5d44c516f807258f8c7c6e823ee52242ba42670b45fc5ea705';
export const CURRENT586_PHASE_UPLOAD_BLOCK=[
  '      - name: '+CURRENT586_PHASE_UPLOAD,'        uses: actions/upload-artifact@v7','        with:',
  '          name: native586-phase-$'+'{{ github.run_id }}-$'+'{{ github.run_attempt }}-$'+'{{ github.event.pull_request.head.sha }}',
  '          path: '+CURRENT586_PHASE_FILE,'          if-no-files-found: error','          retention-days: 30','',
].join('\n')+'\n';
export function inverseCurrent586PhaseUpload(source){
  source=lf(source);assert.equal(source.split(CURRENT586_PHASE_UPLOAD_BLOCK).length,2);
  return source.replace(CURRENT586_PHASE_UPLOAD_BLOCK,'');
}
export function verifyCurrent586Workflow(before,after){
  assert.equal(lf(before),lf(after),'The whole native586 workflow must remain identical');
  assert.equal(sha(inverseCurrent586PhaseUpload(before)),CURRENT586_WORKFLOW_BASE_SHA256);
  assert.equal(nativeBlock(before),NEW_NATIVE_BLOCK);
}
export function verifyCurrent586Runtime(current,prior){
  assert.deepEqual(current,prior,'Every observed native runtime prerequisite must remain identical');
  assert.equal(current.platform,'linux');assert.equal(current.arch,'x64');assert.equal(current.imageOS,'ubuntu24');
  assert.match(current.imageVersion,/^[0-9.]+$/);assert.match(current.node,/^v22\./);
  assert.match(current.python,/^Python 3\.12\./);assert.equal(current.pgBindir,'/usr/lib/postgresql/16/bin');
  assert.deepEqual(current.pgMajors,[16,16,16,16]);assert.deepEqual(current.overrides,[]);
  for(const key of ['pythonLocation','ldLibraryPath','git'])assert(typeof current[key]==='string'&&current[key].length>0);
  assert.equal(current.ldLibraryPath,current.pythonLocation+'/lib');return current;
}
export function verifyCurrent586PhaseReceipt(native,current){
  assert.equal(native?.phase,'NATIVE_ORIGINAL_CONTINUITY');assert.deepEqual(native.commands,CURRENT586_COMMANDS);
  assert.deepEqual(native.current,current);
  assert(['EXECUTED','REUSED'].includes(native.status));assert.equal(typeof native.eligibleForReuse,'boolean');
  assert.equal(native.executedInThisRun,native.status==='EXECUTED');
  if(native.status==='EXECUTED')assert.equal(native.origin,null);
  else{
    assert.equal(native.eligibleForReuse,true);const origin=native.origin;
    assert(Number.isSafeInteger(origin?.run)&&origin.run>ORIGIN.run&&origin.run<current.run);
    assert.equal(origin.attempt,1);assert(Number.isSafeInteger(origin.job)&&origin.job>0);
    assert.match(origin.head,/^[a-f0-9]{40}$/);assert(Number.isSafeInteger(origin.artifactId)&&origin.artifactId>0);
    assert.match(origin.artifactDigest,/^sha256:[a-f0-9]{64}$/);
  }
  if(native.eligibleForReuse){
    assert.match(native.nativeInput?.inputGitManifestSha256,/^[a-f0-9]{64}$/);
    assert(Number.isSafeInteger(native.nativeInput.retainedEntries)&&native.nativeInput.retainedEntries>0);
    assert.deepEqual(native.nativeInput.frozenGitTrees,FROZEN.map(([head,tree])=>({head,tree})));
    verifyCurrent586Runtime(native.runtime,native.runtime);
  }
  return {status:native.status,executedInThisRun:native.executedInThisRun,origin:native.origin};
}
export function verifyCurrent586Metadata(run,jobs,current){
  assert.equal(run.id,current.run);assert.equal(run.run_attempt,1);assert.equal(run.head_sha,current.head);
  assert.equal(run.head_branch,current.branch);assert.equal(run.path,WORKFLOW);assert.equal(run.event,'pull_request');
  assert.equal(run.repository?.full_name,ORIGIN.repository);assert.equal(run.head_repository?.full_name,ORIGIN.repository);
  assert(run.pull_requests?.some(pr=>pr.number===current.pullRequest));
  assert.equal(run.status,'completed');assert(['success','failure'].includes(run.conclusion));
  assert(complete(jobs,'jobs'));const job=one(jobs.jobs.filter(row=>row.name===JOB));
  assert.equal(job.run_id,run.id);assert.equal(job.run_attempt,1);assert.equal(job.head_sha,run.head_sha);
  assert.equal(job.status,'completed');assert(['success','failure'].includes(job.conclusion));
  assert(Number.isSafeInteger(job.id)&&job.id>0);
  assert.deepEqual(job.steps.filter(row=>row.number<15).map(row=>row.number),Array.from({length:14},(_,i)=>i+1));
  const pg=one(job.steps.filter(row=>row.name===STEP)),upload=one(job.steps.filter(row=>row.name===CURRENT586_PHASE_UPLOAD));
  const source=one(job.steps.filter(row=>row.name==='Validate source contracts and release governance'));
  assert.equal(pg.number,15);assert(successful(pg));assert(job.steps.filter(row=>row.number<15).every(successful));
  assert.equal(upload.number,16);assert(successful(upload));assert.equal(source.number,17);
  assert.equal(source.status,'completed');assert(['success','failure'].includes(source.conclusion));
  assert(Date.parse(pg.started_at)<=Date.parse(pg.completed_at)&&Date.parse(pg.completed_at)<=Date.parse(upload.completed_at));
  return {job:job.id,pgStartedAt:pg.started_at,uploadedAt:upload.completed_at,sourceConclusion:source.conclusion};
}
export function verifyCurrent586Artifact(metadata,zip,proofRaw,run,phase){
  assert.equal(metadata.expired,false);assert.equal(metadata.workflow_run?.id,run.id);
  assert.equal(metadata.workflow_run?.head_sha,run.head_sha);
  assert.equal(metadata.name,'native586-phase-'+run.id+'-1-'+run.head_sha);
  assert(Number.isSafeInteger(metadata.id)&&metadata.id>0);
  assert(Number.isSafeInteger(metadata.size_in_bytes)&&metadata.size_in_bytes>0&&metadata.size_in_bytes<=65536);
  assert.equal(zip.length,metadata.size_in_bytes);assert.match(metadata.digest,/^sha256:[a-f0-9]{64}$/);
  assert.equal('sha256:'+sha(zip),metadata.digest);
  assert(Date.parse(metadata.created_at)>=Date.parse(phase.pgStartedAt)&&Date.parse(metadata.created_at)<=Date.parse(phase.uploadedAt));
  assert(proofRaw.length>0&&proofRaw.length<=32768);const proof=JSON.parse(proofRaw);
  assert.equal(proof.schemaVersion,1);assert.equal(proof.kind,CURRENT586_PHASE_KIND);
  assert.equal(proof.repository,ORIGIN.repository);assert.equal(proof.headSha,run.head_sha);
  assert.equal(proof.privatePayloadIncluded,false);assert.match(proof.sourceTreeSha256,/^sha256:[a-f0-9]{64}$/);
  verifyCurrent586PhaseReceipt(proof.nativePostgres,{run:run.id,attempt:1,head:run.head_sha,
    pullRequest:one(run.pull_requests).number,branch:run.head_branch});return proof;
}
function decodeCurrent586Artifact(zip){
  return execFileSync('python',['-c',
    'import io,sys,zipfile; z=zipfile.ZipFile(io.BytesIO(sys.stdin.buffer.read())); assert z.namelist()==["native-postgres-phase-proof.json"]; i=z.infolist()[0]; assert not i.is_dir() and 0<i.file_size<=32768; sys.stdout.buffer.write(z.read(i))',
  ],{input:zip,maxBuffer:32768,timeout:10000});
}
function current586Environment(){
  const value=environment();
  value.overrides=Object.keys(process.env).filter(key=>/^(?:PG|RAVRADAR_|PYTHONPATH$|PYTHONHOME$|NODE_OPTIONS$|NODE_PATH$|LD_PRELOAD$|GIT_(?:OBJECT|ALTERNATE|REPLACE|CONFIG|DIR$|WORK_TREE$|COMMON_DIR$|INDEX_FILE$|SHALLOW_FILE$|GRAFT_FILE$))/.test(key)).sort();
  return value;
}
function current586LocalProof(env,readGit,getEnvironment){
  assert.equal(env.GITHUB_EVENT_NAME,'pull_request');assert.equal(env.GITHUB_REPOSITORY,ORIGIN.repository);
  assert.equal(env.GITHUB_RUN_ATTEMPT,'1');assert.match(env.SOURCE_GATE_HEAD_SHA,/^[a-f0-9]{40}$/);
  assert(/^[1-9][0-9]*$/.test(env.PULL_REQUEST_NUMBER||''));
  const run=Number(env.GITHUB_RUN_ID),pullRequest=Number(env.PULL_REQUEST_NUMBER);
  assert(Number.isSafeInteger(run)&&run>ORIGIN.run&&Number.isSafeInteger(pullRequest));
  assert(typeof env.GITHUB_HEAD_REF==='string'&&env.GITHUB_HEAD_REF.length>0&&env.GITHUB_HEAD_REF.length<=255);
  assert.equal(readGit(['rev-parse','HEAD^{commit}']).trim(),env.SOURCE_GATE_HEAD_SHA);
  assert.equal(readGit(['status','--porcelain','--untracked-files=no']).trim(),'');
  assert.equal(readGit(['for-each-ref','refs/replace']).trim(),'');
  assert.equal(readGit(['rev-parse','--is-shallow-repository']).trim(),'false');
  for(const [head,tree]of FROZEN)assert.equal(readGit(['rev-parse',head+'^{tree}']).trim(),tree);
  assert.equal(JSON.parse(readGit(['show','HEAD:package.json'])).version,'4.0.586');
  const workflow=readGit(['show','HEAD:'+WORKFLOW]);verifyCurrent586Workflow(workflow,workflow);
  const tree=parseTree(readGit(['ls-tree','-rz','--full-tree','HEAD']));
  const nativeInput=verifyInputTrees(tree,tree),runtime=getEnvironment();verifyCurrent586Runtime(runtime,runtime);
  return {eligibleForReuse:true,phase:'NATIVE_ORIGINAL_CONTINUITY',nativeInput,runtime,
    current:{run,attempt:1,head:env.SOURCE_GATE_HEAD_SHA,pullRequest,branch:env.GITHUB_HEAD_REF}};
}
async function current586Reader(){
  const directory=await fs.mkdtemp('.cache/native586-evidence-');let calls=0;const deadline=performance.now()+60000;
  return async(route,{zip=false}={})=>{
    assert(++calls<=24);const sequence=String(calls).padStart(2,'0');
    const read=async(response,suffix)=>{
      await fs.writeFile(path.join(directory,sequence+suffix+'.response.json'),JSON.stringify({status:response.status,
        headers:Object.fromEntries(response.headers)})+'\n',{flag:'wx'});
      const bytes=Buffer.from(await response.arrayBuffer());
      await fs.writeFile(path.join(directory,sequence+suffix+'.body'),bytes,{flag:'wx'});return bytes;
    };
    const remaining=()=>{const ms=Math.floor(deadline-performance.now());assert(ms>0);return Math.min(15000,ms);};
    const response=await fetch('https://api.github.com'+route,{headers:{Authorization:'Bearer '+process.env.GITHUB_TOKEN,
      Accept:'application/vnd.github+json','X-GitHub-Api-Version':'2022-11-28'},redirect:'manual',signal:AbortSignal.timeout(remaining())});
    let bytes=await read(response,'.api');
    if(zip){
      assert.equal(response.status,302);const target=new URL(response.headers.get('location'));
      assert.equal(target.protocol,'https:');assert(!target.username&&!target.password);
      const signed=await fetch(target,{redirect:'error',signal:AbortSignal.timeout(remaining())});
      bytes=await read(signed,'.zip');assert(signed.ok);assert(bytes.length<=65536);return bytes;
    }
    assert(response.ok);assert(bytes.length<=2*1024*1024);return JSON.parse(bytes);
  };
}
export async function decideCurrent586Reuse({env=process.env,get,readGit=git,getEnvironment=current586Environment}={}){
  try{
    const local=current586LocalProof(env,readGit,getEnvironment),repo='/repos/'+ORIGIN.repository,base=repo+'/actions';
    get??=await current586Reader();
    const current=await get(base+'/runs/'+local.current.run);
    assert.equal(current.id,local.current.run);assert.equal(current.run_attempt,1);assert.equal(current.path,WORKFLOW);
    assert.equal(current.head_sha,local.current.head);assert.equal(current.event,'pull_request');
    assert.equal(current.repository?.full_name,ORIGIN.repository);assert.equal(current.head_branch,local.current.branch);
    verifyCurrentPullRequest(await get(repo+'/pulls/'+local.current.pullRequest),current,local.current.pullRequest);
    const query=new URLSearchParams({event:'pull_request',branch:local.current.branch,per_page:'100'});
    const listing=await get(base+'/workflows/validate-pull-request.yml/runs?'+query);
    assert(complete(listing,'workflow_runs'));assert.equal(new Set(listing.workflow_runs.map(row=>row.id)).size,listing.total_count);
    assert(listing.workflow_runs.some(row=>row.id===current.id));
    const prior=listing.workflow_runs.filter(row=>row.id<current.id).sort((a,b)=>b.id-a.id);assert(prior.length>0);
    const load=async(row)=>{
      assert.equal(row.run_attempt,1);
      const run=await get(base+'/runs/'+row.id),jobs=await get(base+'/runs/'+row.id+'/attempts/1/jobs?per_page=100');
      for(const key of ['id','run_attempt','head_sha','head_branch','path','event'])assert.equal(run[key],row[key]);
      const ctx={run:run.id,attempt:1,head:run.head_sha,pullRequest:local.current.pullRequest,branch:local.current.branch};
      const phase=verifyCurrent586Metadata(run,jobs,ctx);
      const artifacts=await get(base+'/runs/'+run.id+'/artifacts?per_page=100');assert(complete(artifacts,'artifacts'));
      const artifact=one(artifacts.artifacts.filter(value=>value.name==='native586-phase-'+run.id+'-1-'+run.head_sha));
      assert(Number.isSafeInteger(artifact.size_in_bytes)&&artifact.size_in_bytes>0&&artifact.size_in_bytes<=65536);
      assert.equal(artifact.expired,false);assert.match(artifact.digest,/^sha256:[a-f0-9]{64}$/);
      const zip=await get(base+'/artifacts/'+artifact.id+'/zip',{zip:true});
      const proof=verifyCurrent586Artifact(artifact,zip,decodeCurrent586Artifact(zip),run,phase);
      assert.equal(proof.nativePostgres.eligibleForReuse,true);return {run,jobs,phase,artifact,proof};
    };
    let origin=await load(prior[0]);
    if(origin.proof.nativePostgres.status==='REUSED'){
      const locator=origin.proof.nativePostgres.origin;
      const row=one(prior.filter(value=>value.id===locator.run));origin=await load(row);
      assert.equal(origin.run.head_sha,locator.head);assert.equal(origin.phase.job,locator.job);
      assert.equal(origin.artifact.id,locator.artifactId);assert.equal(origin.artifact.digest,locator.artifactDigest);
    }
    assert.equal(origin.proof.nativePostgres.status,'EXECUTED','A REUSED receipt is never a new SQL origin');
    readGit(['merge-base','--is-ancestor',origin.run.head_sha,'HEAD']);
    verifyCurrent586Workflow(readGit(['show',origin.run.head_sha+':'+WORKFLOW]),readGit(['show','HEAD:'+WORKFLOW]));
    for(const file of REUSE_FILES)assert.equal(readGit(['show',origin.run.head_sha+':'+file]),readGit(['show','HEAD:'+file]),
      'The native verifier and its complete existing test must be byte-identical');
    const inputs=verifyInputTrees(parseTree(readGit(['ls-tree','-rz','--full-tree',origin.run.head_sha])),
      parseTree(readGit(['ls-tree','-rz','--full-tree','HEAD'])),(file,side)=>readGit(['show',(side==='before'?origin.run.head_sha:'HEAD')+':'+file]));
    for(const key of ['inputGitManifestSha256','retainedEntries','frozenGitTrees'])
      assert.deepEqual(origin.proof.nativePostgres.nativeInput[key],inputs[key]);
    verifyCurrent586Runtime(local.runtime,origin.proof.nativePostgres.runtime);
    const later=listing.workflow_runs.filter(row=>row.id>origin.run.id),jobsByRun=new Map();
    for(const row of later)if(row.id!==current.id)jobsByRun.set(row.id,
      await get(base+'/runs/'+row.id+'/attempts/'+row.run_attempt+'/jobs?per_page=100'));
    verifyLaterRuns({total_count:later.length,workflow_runs:later},jobsByRun,origin.run,current.id,local.current.branch);
    verifyCurrent586Metadata(await get(base+'/runs/'+origin.run.id),
      await get(base+'/runs/'+origin.run.id+'/attempts/1/jobs?per_page=100'),
      {run:origin.run.id,attempt:1,head:origin.run.head_sha,pullRequest:local.current.pullRequest,branch:local.current.branch});
    verifyCurrentPullRequest(await get(repo+'/pulls/'+local.current.pullRequest),current,local.current.pullRequest);
    return {...local,status:'REUSED',executedInThisRun:false,commands:CURRENT586_COMMANDS,
      origin:{run:origin.run.id,attempt:1,job:origin.phase.job,head:origin.run.head_sha,
        artifactId:origin.artifact.id,artifactDigest:origin.artifact.digest},
      environmentEvidence:'same-hosted-image-and-observed-runtime-prerequisites-not-an-unobserved-binary-sha'};
  }catch{return {status:'EXECUTE',reason:'native586-input-or-phase-evidence-unavailable-or-different'};}
}

// The uploaded filename is retained for workflow compatibility, not as a 586 identity.
// NEXT is a distinct actual execution and can never seed the CURRENT586 reuse reader.
export const ASSISTANT_LATER_H0_PHASE_KIND='RAVRADAR_ASSISTANT_LATER_H0_POSTGRES_PHASE_V1';
export function verifyAssistantLaterH0PhaseReceipt(native,current){
  assert.equal(native?.phase,'ASSISTANT_LATER_H0');assert.deepEqual(native.commands,CURRENT_COMMANDS);
  assert.deepEqual(native.current,current);assert.equal(native.status,'EXECUTED');
  assert.equal(native.executedInThisRun,true);assert.equal(native.origin,null);
  assert.equal(native.eligibleForReuse,false);
  return {status:native.status,executedInThisRun:native.executedInThisRun,origin:native.origin};
}

export const ASSISTANT_PUBLIC587_SUCCESSOR_PHASE_KIND='RAVRADAR_ASSISTANT_PUBLIC587_SUCCESSOR_POSTGRES_PHASE_V1';
export function verifyAssistantPublic587SuccessorPhaseReceipt(native,current){
  assert.equal(native?.phase,'ASSISTANT_PUBLIC587_SUCCESSOR');
  assert.deepEqual(native.commands,ASSISTANT_PUBLIC587_SUCCESSOR_COMMANDS);
  assert.deepEqual(native.current,current);assert.equal(native.status,'EXECUTED');
  assert.equal(native.executedInThisRun,true);assert.equal(native.origin,null);
  assert.equal(native.eligibleForReuse,false);
  return {status:native.status,executedInThisRun:native.executedInThisRun,origin:native.origin};
}

export const ASSISTANT_PUBLIC588_SUCCESSOR_PHASE_KIND='RAVRADAR_ASSISTANT_PUBLIC588_SUCCESSOR_POSTGRES_PHASE_V1';
export function verifyAssistantPublic588SuccessorPhaseReceipt(native,current){
  assert.equal(native?.phase,'ASSISTANT_PUBLIC588_SUCCESSOR');
  assert.deepEqual(native.commands,ASSISTANT_PUBLIC588_SUCCESSOR_COMMANDS);
  assert.deepEqual(native.current,current);assert.equal(native.status,'EXECUTED');
  assert.equal(native.executedInThisRun,true);assert.equal(native.origin,null);
  assert.equal(native.eligibleForReuse,false);
  return {status:native.status,executedInThisRun:native.executedInThisRun,origin:native.origin};
}

export const ASSISTANT_PUBLIC590_SUCCESSOR_PHASE_KIND='RAVRADAR_ASSISTANT_PUBLIC590_SUCCESSOR_POSTGRES_PHASE_V1';
export function verifyAssistantPublic590SuccessorPhaseReceipt(native,current){
  assert.equal(native?.phase,'ASSISTANT_PUBLIC590_SUCCESSOR');
  assert.deepEqual(native.commands,ASSISTANT_PUBLIC590_SUCCESSOR_COMMANDS);
  assert.deepEqual(native.current,current);assert.equal(native.status,'EXECUTED');
  assert.equal(native.executedInThisRun,true);assert.equal(native.origin,null);
  assert.equal(native.eligibleForReuse,false);
  return {status:native.status,executedInThisRun:native.executedInThisRun,origin:native.origin};
}

export const ASSISTANT_PUBLIC591_SUCCESSOR_PHASE_KIND='RAVRADAR_ASSISTANT_PUBLIC591_SUCCESSOR_POSTGRES_PHASE_V1';
export function verifyAssistantPublic591SuccessorPhaseReceipt(native,current){
  assert.equal(native?.phase,'ASSISTANT_PUBLIC591_SUCCESSOR');
  assert.deepEqual(native.commands,ASSISTANT_PUBLIC591_SUCCESSOR_COMMANDS);
  assert.deepEqual(native.current,current);assert.equal(native.status,'EXECUTED');
  assert.equal(native.executedInThisRun,true);assert.equal(native.origin,null);
  assert.equal(native.eligibleForReuse,false);
  return {status:native.status,executedInThisRun:native.executedInThisRun,origin:native.origin};
}

export const INSTALLED593_ORIGINAL591_PHASE_KIND='RAVRADAR_INSTALLED593_ORIGINAL591_SUCCESSOR_POSTGRES_PHASE_V1';
export function verifyInstalled593Original591PhaseReceipt(native,current){
  assert.equal(native?.schemaVersion,1);assert.equal(native.phase,'INSTALLED593_ORIGINAL591_SUCCESSOR');
  assert.equal(native.kind,INSTALLED593_ORIGINAL591_PHASE_KIND);
  assert.equal(native.sourcePhase,'assistant-installed593-origin591-successor');
  assert.equal(native.releaseVersion,requireInstalled593Original591Release());
  assert.deepEqual(native.binding,requireInstalled593Original591Binding());
  assert.deepEqual(native.output,requireInstalled593Original591Output());
  assert.deepEqual(native.databaseBefore,INSTALLED593_ORIGINAL591_DATABASE_BEFORE);
  assert.deepEqual(native.commands,INSTALLED593_ORIGINAL591_COMMANDS);assert.deepEqual(native.current,current);
  assert.equal(native.status,'EXECUTED');assert.equal(native.executedInThisRun,true);
  assert.equal(native.origin,null);assert.equal(native.eligibleForReuse,false);
  return {status:native.status,executedInThisRun:native.executedInThisRun,origin:native.origin};
}

// Separate593 V2. Historical V1 receipts and their refusals remain unchanged.
export const ASSISTANT_PUBLIC591_V2_KIND='RAVRADAR_ASSISTANT_PUBLIC591_SUCCESSOR_POSTGRES_PHASE_V2';
export const ASSISTANT_PUBLIC591_V2_PROFILE='assistant-public591-successor/4.0.593/native-v2';
export const ASSISTANT_PUBLIC591_INPUT_MODULES=Object.freeze([
  "config.js",
  "js/core/phase-d-process-candidate.js",
  "js/core/phase-d-wave-process-candidate.js",
  "js/core/ravscore-candidate-g-state-pipeline.js",
  "js/core/ravscore-candidate-g.js",
  "js/core/ravscore-current-supply-memory.js",
  "js/core/ravscore-integrated-state-pipeline.js",
  "js/core/ravscore-mobilisation-memory.js",
  "js/core/ravscore-model-bundle.generated.js",
  "js/core/ravscore-model-contract.js",
  "js/core/ravscore-profile-switch.js",
  "js/core/ravscore-public-model.js",
  "js/core/ravscore-regime-memory.js",
  "js/core/ravscore-time.js",
  "js/core/ravscore-wave-approach-state.js",
  "js/core/ravscore-wave-mobilisation-state.js",
  "js/core/score-presentation.js",
  "js/core/wave-approach.js",
  "scripts/build-statistics-preference-revision.mjs",
  "scripts/check-account-statistics-assistant-predecessor-source.mjs",
  "scripts/check-assistant-later-h0-predecessor-source.mjs",
  "scripts/check-current-memory-warmup-predecessor-source.mjs",
  "scripts/check-last-mile-enclosure-predecessor-source.mjs",
  "scripts/check-native-current-reanalysis-predecessor-source.mjs",
  "scripts/check-native-identity-frozen-i71-source.mjs",
  "scripts/check-native-original-continuity-predecessor-source.mjs",
  "scripts/integrated-cutover-readiness.mjs",
  "scripts/lib/account-assistant-successor-source.mjs",
  "scripts/lib/account-statistics-assistant-successor-source.mjs",
  "scripts/lib/assistant-later-h0-postgres.mjs",
  "scripts/lib/assistant-later-h0-successor-source.mjs",
  "scripts/lib/checkpoint-cas-native-postgres.mjs",
  "scripts/lib/coastal-point-staging-contract.mjs",
  "scripts/lib/copernicus-offline-environment.mjs",
  "scripts/lib/current-grid-successor-source.mjs",
  "scripts/lib/current-memory-warmup-postgres.mjs",
  "scripts/lib/current-memory-warmup-successor-source.mjs",
  "scripts/lib/current-transport-history.mjs",
  "scripts/lib/dmi-marine-zone-exclusions.mjs",
  "scripts/lib/established-native-current-origin-successor-source.mjs",
  "scripts/lib/last-mile-enclosure-successor-source.mjs",
  "scripts/lib/live-current-pilot.mjs",
  "scripts/lib/native-identity-checkpoint-postgres.mjs",
  "scripts/lib/native-original-continuity-successor-source.mjs",
  "scripts/lib/native-sampling-identity-successor-source.mjs",
  "scripts/lib/native0600-original-successor-source.mjs",
  "scripts/lib/ravscore-candidate-g-rollback-runtime.mjs",
  "scripts/lib/ravscore-continuation-implementation-contract.mjs",
  "scripts/lib/ravscore-profile-transition.mjs",
  "scripts/lib/ravscore-sampling-context.mjs",
  "scripts/lib/statistics-preference-revision-native-postgres.mjs",
  "scripts/lib/supabase-admin-rest.mjs",
  "scripts/native-sampling-identity-successor-readiness.mjs",
  "scripts/protected-ravscore-continuation-checkpoint.mjs",
  "scripts/ravscore-continuation-checkpoint.mjs",
  "scripts/rollback-assets/ravscore-model-bundle.generated.js",
  "scripts/rollback-assets/ravscore-model-contract.js",
  "scripts/run-frozen-current-memory-warmup-source-targets.mjs",
  "scripts/run-frozen-established-native-current-origin-source-targets.mjs",
  "scripts/run-frozen-native0600-source-targets.mjs",
  "scripts/run-frozen584-checkpoint-postgres-source.mjs",
  "scripts/run-frozen585-native-continuity-postgres-source.mjs",
  "scripts/run-frozen586-assistant-later-h0-postgres-source.mjs",
  "scripts/test-protected-ravscore-continuation-checkpoint.mjs",
  "scripts/verify-account-assistant-schema.mjs"
]);
export const ASSISTANT_PUBLIC591_FROZEN=Object.freeze([
  [
    "044d3045fecc2e70d6f35f60010921c6bd597ecc",
    "4c56c3b73633bf3a5e1540e4f53e75be49f0b9da"
  ],
  [
    "60d999a68136c43acb4d3664bbd66eed47283bb2",
    "ead5743dd9098035b0de5f748de2009460506971"
  ],
  [
    "d7b31aa3c706e2f657fe5de99c56434f3cff260d",
    "9d05b060dba9015233a368c63438a3dfd9b9b45d"
  ],
  [
    "d8a52e3e4cbaed1557cc56fe01f5f0a2b0d657d7",
    "0ddede3f4b4fb4faa43b0d43f17c7cdbadcc9bc0"
  ],
  [
    "ee029982538c67dea39880bc7b33f3508c10cf9c",
    "400babda9377e43ea7ee1444008f7accd1aded32"
  ],
  [
    "e8f9f7197d9e262720b7627b4970d3da82baa9d9",
    "24dbf944916031ea256537b125966e946efeead8"
  ],
  [
    "7df56f36f705db641b3f9476ee8ca1b4c4cfed0c",
    "57192d6d5cfbd8709f3558ad8afaaf10dd6cafe0"
  ],
  [
    "aab72babd27175a4276c2a2f1965c74bb021b4af",
    "959f63d40c3980e804caa750da227cbd96e34a49"
  ],
  [
    "b57480082fb16f31ed4e4aa2bc308fff9abfe2d0",
    "fe3b9bf6270c2a506aac003d57e1e4d2a7d491de"
  ],
  [
    "2712b6556acd33d3d06ff1a9b5f55b5b620f1ee9",
    "e3fa7dd3eb7ec873deefb73148ad6bae0f0df725"
  ],
  [
    "a157c265949da661827d375db61f9e1e8c4fd6a0",
    "54b020c90661caa31b4e5e1eceedbe827336e4b9"
  ],
  [
    "37e657867ff0f8c31f8e8489e5c9a1cf235192f9",
    "aabcdfd4f81aeba8db448c7b60d87e5212e94cd3"
  ]
].map(([head,tree])=>Object.freeze({head,tree})));
// This digest qualifies the CLOSED65-module implementation, not the whole tree.
// A changed native implementation must review/requalify its closure before a grant.
export const ASSISTANT_PUBLIC591_REVIEWED_MODULE_SHA256='ad6cb55499dbbc261cb143ff76fe0a6f4344dd7fbd6797b4167fa3d9c4a205da';
const ASSISTANT_PUBLIC591_DATA=Object.freeze([
  'scripts/fixtures/statistics-preference-revision-input.json','scripts/lib/dmi-marine-zone-exclusions.json',
  'scripts/lib/established-native-current-origin-source-target-inventory.json',
  'scripts/lib/last-mile-enclosure-predecessor-source-inventory.json',
]);
const ASSISTANT_PUBLIC591_CONTROLS=Object.freeze([WORKFLOW,...REUSE_FILES,
  'requirements-dmi.txt','requirements-geometry.txt','requirements-copernicus.txt']);
const PROGRAM_MARKER='RAVRADAR_NATIVE_PROGRAM_IDENTITY_V2';
const hashPattern=/^[a-f0-9]{64}$/;

export function verifyAssistantPublic591Programs(value){
  assert.equal(value?.schemaVersion,1);assert(Number.isSafeInteger(value.majorVersion)&&value.majorVersion>=16);
  assert.deepEqual(value.files.map(row=>row.name),['initdb','pg_ctl','psql','postgres']);
  for(const row of value.files){
    assert.equal(typeof row.path,'string');assert(path.posix.isAbsolute(row.path));
    assert.equal(typeof row.realpath,'string');assert(path.posix.isAbsolute(row.realpath));
    assert(Number.isSafeInteger(row.mode)&&row.mode>0&&row.mode<=0o777&&(row.mode&0o111)!==0);
    assert(Number.isSafeInteger(row.bytes)&&row.bytes>0);assert.match(row.sha256,hashPattern);
    assert.equal(typeof row.version,'string');assert(row.version.length<=256&&!/[\r\n]/.test(row.version));
    assert.equal(Number(row.version.match(/\b(\d+)\.\d+\b/)?.[1]),value.majorVersion);
  }
  return value;
}
export function verifyAssistantPublic591Runtime(current,prior=current){
  assert.deepEqual(current,prior,'All normally observed native runtime prerequisites must match');
  assert.equal(current.platform,'linux');assert.equal(current.arch,'x64');assert.equal(current.imageOS,'ubuntu24');
  assert.match(current.imageVersion,/^[0-9.]+$/);assert.match(current.node,/^v22\./);
  assert.match(current.python,/^Python 3\.12\./);assert.match(current.git,/^git version /);
  assert.equal(typeof current.pythonLocation,'string');assert(current.pythonLocation.length>0);
  assert.equal(current.ldLibraryPath,current.pythonLocation+'/lib');assert.deepEqual(current.overrides,[]);
  assert.equal(typeof current.pgBindir,'string');assert(path.posix.isAbsolute(current.pgBindir));
  verifyAssistantPublic591Programs(current.selectedPrograms);return current;
}
export async function assistantPublic591Runtime(){
  const run=(file,args)=>execFileSync(file,args,{encoding:'utf8',timeout:10000}).trim();
  const value={platform:process.platform,arch:process.arch,imageOS:process.env.ImageOS,imageVersion:process.env.ImageVersion,
    node:process.version,python:run('python',['--version']),pythonLocation:process.env.pythonLocation,
    ldLibraryPath:process.env.LD_LIBRARY_PATH,git:run('git',['--version']),pgBindir:run('pg_config',['--bindir']),
    overrides:Object.keys(process.env).filter(key=>/^(?:PG|RAVRADAR_|PYTHONPATH$|PYTHONHOME$|NODE_OPTIONS$|NODE_PATH$|LD_PRELOAD$|GIT_(?:OBJECT|ALTERNATE|REPLACE|CONFIG|DIR$|WORK_TREE$|COMMON_DIR$|INDEX_FILE$|SHALLOW_FILE$|GRAFT_FILE$))/.test(key)).sort(),
    selectedPrograms:await nativePostgresProgramIdentity(await nativePrograms())};
  return verifyAssistantPublic591Runtime(value);
}
export function assistantPublic591PackageScopePaths(){
  const files=new Set(['package.json']);
  for(const module of ASSISTANT_PUBLIC591_INPUT_MODULES)
    for(let directory=path.posix.dirname(module);directory!=='.';directory=path.posix.dirname(directory))
      files.add(directory+'/package.json');
  return [...files].sort();
}
function nearestAssistantPublic591Scopes(scopes){
  const present=new Set(scopes.filter(row=>row.present).map(row=>row.file));
  return sha(JSON.stringify(ASSISTANT_PUBLIC591_INPUT_MODULES.map(module=>{
    let directory=path.posix.dirname(module);
    while(directory!=='.'){
      const file=directory+'/package.json';if(present.has(file))return [module,file];
      directory=path.posix.dirname(directory);
    }
    assert(present.has('package.json'));return [module,'package.json'];
  })));
}
export function assistantPublic591RootPackageScopes(){
  const scopes=assistantPublic591PackageScopePaths().map(file=>file==='package.json'
    ?{file,present:true,mode:'100644',type:'module',version:'4.0.593'}:{file,present:false});
  return {scopes,nearestSha256:nearestAssistantPublic591Scopes(scopes)};
}
export async function captureAssistantPublic591Input({ref='HEAD',readGit=git,root=process.cwd(),physical=true}={}){
  const tree=parseTree(readGit(['ls-tree','-rz','--full-tree',ref])),index=new Map(tree.map(row=>[row[0],row]));
  const sql=tree.filter(row=>row[0].startsWith('supabase/migrations/')&&row[0].endsWith('.sql')).map(row=>row[0]).sort();
  assert.equal(sql.length,71);assert.equal(ASSISTANT_PUBLIC591_INPUT_MODULES.length,65);
  if(physical)assert.deepEqual((await fs.readdir(path.join(root,'supabase/migrations'))).filter(name=>name.endsWith('.sql')).sort(),
    sql.map(file=>path.posix.basename(file)),'Every physical SQL archive entry is an input');
  const rows=new Map(),read=async file=>{
    if(rows.has(file))return rows.get(file);
    const row=index.get(file);assert(row&&['100644','100755'].includes(row[1])&&row[2]==='blob','Regular tracked native input required');
    const bytes=Buffer.from(readGit(['cat-file','blob',ref+':'+file]));
    if(physical){
      const absolute=path.resolve(root,file),stat=await fs.lstat(absolute);
      assert(stat.isFile()&&!stat.isSymbolicLink());assert.equal(await fs.realpath(absolute),absolute);
      assert.deepEqual(await fs.readFile(absolute),bytes,'Physical native input differs from its Git blob');
    }
    const value={file,mode:row[1],blob:row[3],bytes:bytes.length,sha256:sha(bytes)};rows.set(file,value);return value;
  };
  const moduleRows=[];
  for(const file of ASSISTANT_PUBLIC591_INPUT_MODULES)moduleRows.push(await read(file));
  const moduleSha256=sha(JSON.stringify(moduleRows.map(({file,bytes,sha256})=>({file,bytes,sha256}))));
  assert.equal(moduleSha256,ASSISTANT_PUBLIC591_REVIEWED_MODULE_SHA256,'Native closure changed; no automatic new qualification');
  for(const file of [...ASSISTANT_PUBLIC591_DATA,...sql])await read(file);
  const inputRows=[...rows.values()].sort((a,b)=>a.file.localeCompare(b.file,'en'));
  const controls=[];for(const file of ASSISTANT_PUBLIC591_CONTROLS)controls.push(await read(file));
  const packageGit=JSON.parse(String(readGit(['cat-file','blob',ref+':package.json'])));
  const packageMode={type:packageGit.type,version:packageGit.version};
  assert.deepEqual(packageMode,{type:'module',version:'4.0.593'});
  const scopes=[];
  for(const file of assistantPublic591PackageScopePaths()){
    if(!index.has(file)){
      if(physical){
        let actual=null;try{actual=await fs.lstat(path.resolve(root,file));}catch(error){if(error.code!=='ENOENT')throw error;}
        assert.equal(actual,null,'Untracked package scope changes native module resolution');
      }
      scopes.push({file,present:false});continue;
    }
    const row=await read(file);
    if(file==='package.json')scopes.push({file,present:true,mode:row.mode,...packageMode});
    else{
      const parsed=JSON.parse(String(readGit(['cat-file','blob',ref+':'+file])));
      scopes.push({...row,present:true,type:parsed?.type??null});
    }
  }
  const packageScopes={scopes,nearestSha256:nearestAssistantPublic591Scopes(scopes)};
  for(const {head,tree}of ASSISTANT_PUBLIC591_FROZEN)
    assert.equal(readGit(['rev-parse',head+'^{tree}']).trim(),tree);
  return {schemaVersion:1,files:140,modules:65,sqlFiles:71,moduleSha256,
    inputSha256:sha(JSON.stringify(inputRows)),controlsSha256:sha(JSON.stringify(controls)),
    packageMode,packageScopes,frozenGitTrees:ASSISTANT_PUBLIC591_FROZEN};
}
export function verifyAssistantPublic591Input(value,prior=value){
  assert.deepEqual(value,prior,'Every selected native input must match');
  assert.equal(value?.schemaVersion,1);assert.equal(value.files,140);assert.equal(value.modules,65);assert.equal(value.sqlFiles,71);
  assert.equal(value.moduleSha256,ASSISTANT_PUBLIC591_REVIEWED_MODULE_SHA256);
  for(const field of ['inputSha256','controlsSha256'])assert.match(value[field],hashPattern);
  assert.deepEqual(value.packageMode,{type:'module',version:'4.0.593'});
  assert.deepEqual(value.packageScopes?.scopes.map(row=>row.file),assistantPublic591PackageScopePaths());
  for(const row of value.packageScopes.scopes){
    assert.equal(typeof row.present,'boolean');
    if(!row.present)assert.deepEqual(row,{file:row.file,present:false});
    else{
      assert(['100644','100755'].includes(row.mode));
      if(row.file==='package.json')assert.deepEqual(row,{file:'package.json',present:true,mode:row.mode,...value.packageMode});
      else{assert.match(row.blob,/^[a-f0-9]{40}$/);assert.match(row.sha256,hashPattern);assert(Number.isSafeInteger(row.bytes)&&row.bytes>0);}
    }
  }
  assert.equal(value.packageScopes.nearestSha256,nearestAssistantPublic591Scopes(value.packageScopes.scopes));
  assert.deepEqual(value.frozenGitTrees,ASSISTANT_PUBLIC591_FROZEN);return value;
}
export function verifyAssistantPublic591V2PhaseReceipt(native,current){
  assert.equal(native?.schemaVersion,2);assert.equal(native.kind,ASSISTANT_PUBLIC591_V2_KIND);
  assert.equal(native.profile,ASSISTANT_PUBLIC591_V2_PROFILE);assert.equal(native.phase,'ASSISTANT_PUBLIC591_SUCCESSOR');
  assert.deepEqual(native.commands,ASSISTANT_PUBLIC591_SUCCESSOR_COMMANDS);assert.deepEqual(native.current,current);
  assert(Number.isSafeInteger(current.run)&&current.run>ORIGIN.run);assert.equal(current.attempt,1);
  assert.match(current.head,/^[a-f0-9]{40}$/);assert(Number.isSafeInteger(current.pullRequest)&&current.pullRequest>0);
  assert(typeof current.branch==='string'&&current.branch.length>0&&current.branch.length<=255);
  assert.equal(native.eligibleForReuse,true);assert(['EXECUTED','REUSED'].includes(native.status));
  assert.equal(native.executedInThisRun,native.status==='EXECUTED');
  verifyAssistantPublic591Input(native.nativeInput);verifyAssistantPublic591Runtime(native.runtime);
  if(native.status==='EXECUTED')assert.equal(native.origin,null);
  else{
    const origin=native.origin;assert(Number.isSafeInteger(origin?.run)&&origin.run>ORIGIN.run&&origin.run<current.run);
    assert.equal(origin.attempt,1);assert(Number.isSafeInteger(origin.job)&&origin.job>0);
    assert.match(origin.head,/^[a-f0-9]{40}$/);assert(Number.isSafeInteger(origin.artifactId)&&origin.artifactId>0);
    assert.match(origin.artifactDigest,/^sha256:[a-f0-9]{64}$/);assert.match(origin.sourceTreeSha256,/^sha256:[a-f0-9]{64}$/);
  }
  return {status:native.status,executedInThisRun:native.executedInThisRun,origin:native.origin};
}
async function assistantPublic591LocalProof({env=process.env,readGit=git,getRuntime=assistantPublic591Runtime}={}){
  assert.equal(env.GITHUB_EVENT_NAME,'pull_request');assert.equal(env.GITHUB_REPOSITORY,ORIGIN.repository);
  assert.equal(env.GITHUB_RUN_ATTEMPT,'1');assert.match(env.SOURCE_GATE_HEAD_SHA,/^[a-f0-9]{40}$/);
  assert.equal(readGit(['rev-parse','HEAD^{commit}']).trim(),env.SOURCE_GATE_HEAD_SHA);
  assert.equal(readGit(['status','--porcelain','--untracked-files=no']).trim(),'');
  assert.equal(readGit(['for-each-ref','refs/replace']).trim(),'');
  assert.equal(readGit(['rev-parse','--is-shallow-repository']).trim(),'false');
  const current={run:Number(env.GITHUB_RUN_ID),attempt:1,head:env.SOURCE_GATE_HEAD_SHA,
    pullRequest:Number(env.PULL_REQUEST_NUMBER),branch:env.GITHUB_HEAD_REF};
  assert(Number.isSafeInteger(current.run)&&current.run>ORIGIN.run);assert(Number.isSafeInteger(current.pullRequest)&&current.pullRequest>0);
  assert(typeof current.branch==='string'&&current.branch.length>0&&current.branch.length<=255);
  const nativeInput=await captureAssistantPublic591Input({readGit}),runtime=await getRuntime();
  verifyAssistantPublic591Input(nativeInput);verifyAssistantPublic591Runtime(runtime);
  return {schemaVersion:2,kind:ASSISTANT_PUBLIC591_V2_KIND,profile:ASSISTANT_PUBLIC591_V2_PROFILE,
    phase:'ASSISTANT_PUBLIC591_SUCCESSOR',commands:ASSISTANT_PUBLIC591_SUCCESSOR_COMMANDS,
    eligibleForReuse:true,current,nativeInput,runtime};
}
export function verifyAssistantPublic591Metadata(run,jobs,readGit=git){
  return verifyAssistantPublic591PhaseMetadata(run,jobs,readGit);
}
function verifyAssistantPublic591PhaseMetadata(run,jobs,readGit,activeTail=false){
  assert.equal(run.run_attempt,1);assert.equal(run.path,WORKFLOW);assert.equal(run.event,'pull_request');
  assert.equal(run.repository?.full_name,ORIGIN.repository);assert.equal(run.head_repository?.full_name,ORIGIN.repository);
  const expectedStatus=activeTail?'in_progress':'completed';
  const conclusions=activeTail?[null]:['success','failure'];
  assert.equal(run.status,expectedStatus);assert(conclusions.includes(run.conclusion));
  assert.match(run.head_sha,/^[a-f0-9]{40}$/);assert(typeof run.head_branch==='string'&&run.head_branch.length>0);
  assert(complete(jobs,'jobs'));const job=one(jobs.jobs.filter(row=>row.name===JOB));
  assert.equal(job.run_id,run.id);assert.equal(job.run_attempt,1);assert.equal(job.head_sha,run.head_sha);
  assert.equal(job.status,expectedStatus);assert(conclusions.includes(job.conclusion));
  assert(Number.isSafeInteger(job.id)&&job.id>0);
  const source=one(job.steps.filter(row=>row.name==='Validate source contracts and release governance'));
  const pg=one(job.steps.filter(row=>row.name===STEP)),upload=one(job.steps.filter(row=>row.name===CURRENT586_PHASE_UPLOAD));
  const earlyDmi = job.steps.filter(row=>row.name==='Install declared DMI dependencies before source planning');
  assert(earlyDmi.length<=1);
  const earlyNode24=job.steps.filter(row=>OWNED_CACHE_NATIVE_EARLY_STEP_NAMES.includes(row.name));
  let node24Offset=0,historicalNationalOmitted=false;
  let reviewedWorkflow,actionNames;
  if(earlyNode24.length){
    // Only this exact whole workflow permits two extra environment steps. Raw
    // job metadata and old receipt/command meanings remain unchanged.
    assert.equal(earlyDmi.length,1);assert.equal(earlyNode24.length,2);
    assert.equal(typeof readGit,'function');
    const raw=readGit(['cat-file','blob',run.head_sha+':'+WORKFLOW]);
    assert(Buffer.isBuffer(raw)||typeof raw==='string');assert(Buffer.byteLength(raw)<=65536);
    const workflow=(Buffer.isBuffer(raw)?raw.toString('utf8'):raw).replace(/\r\n/g,'\n');
    if(hasDependencyOnlySourceSetup(workflow)){
      reviewedWorkflow=verifyCurrentSourceWorkflow(workflow);
      historicalNationalOmitted=!reviewedWorkflow.historicalNational;
      if(activeTail)actionNames=new Set(workflow.split(/(?=^      - (?:name|uses):)/m).slice(1)
        .filter(block=>/^      - uses: |^        uses: /m.test(block))
        .map(block=>block.split('\n',1)[0].replace(/^      - uses: /,'Run ').replace(/^      - name: /,'').trim()));
    }
    else{
      assert.notEqual(inverseOwnedCacheNativeWorkflow(workflow),workflow,'EXACT_OWNED_CACHE_NATIVE_WORKFLOW_REQUIRED');
      assert.equal(sha(projectSourceImpactWorkflowFull(workflow)),SOURCE_IMPACT_FULL_WORKFLOW_SHA256);
    }
    for(let index=0;index<OWNED_CACHE_NATIVE_EARLY_STEP_NAMES.length;index++){
      const step=one(earlyNode24.filter(row=>row.name===OWNED_CACHE_NATIVE_EARLY_STEP_NAMES[index]));
      assert.equal(step.number,4+index);assert(successful(step));
    }
    node24Offset=2;
  }
  const offset=earlyDmi.length+node24Offset;
  if(earlyDmi.length===1){
    assert.equal(earlyDmi[0].number,6+node24Offset);assert(successful(earlyDmi[0]));
    assert.equal(one(job.steps.filter(row=>row.name==='Build deterministic source-tree content identity')).number,7+node24Offset);
  }
  assert.equal(source.number,15+offset);assert.equal(pg.number,16+offset);assert.equal(upload.number,17+offset);
  const prefix=job.steps.filter(row=>row.number<=upload.number);
  assert.deepEqual(prefix.map(row=>row.number),Array.from({length:upload.number},(_,i)=>i+1));
  assert(prefix.every(successful));
  if(activeTail){
    assert(reviewedWorkflow,'Active native completion requires the normal source workflow');
    const {stepNames,nativeUploadNumber}=reviewedWorkflow;
    assert.equal(upload.number,nativeUploadNumber);
    const normalSteps=job.steps.slice(0,stepNames.length);
    assert.deepEqual(normalSteps.map(step=>[step.name,step.number]),stepNames.map((name,index)=>[name,index+1]));
    const cleanupNames=new Set(['Complete job',...normalSteps.filter(step=>successful(step)&&actionNames.has(step.name))
      .map(step=>'Post '+step.name)]);
    let lastNumber=stepNames.length;
    for(const step of job.steps.slice(stepNames.length)){
      assert(Number.isSafeInteger(step.number)&&step.number>lastNumber&&cleanupNames.delete(step.name));
      const started=Date.parse(step.started_at),ended=Date.parse(step.completed_at);
      const pending=step.status==='pending'&&step.conclusion===null&&step.started_at===null&&step.completed_at===null;
      const running=step.status==='in_progress'&&step.conclusion===null&&step.completed_at===null;
      const completed=step.status==='completed'&&['success','skipped'].includes(step.conclusion)&&started<=ended;
      assert(pending||(started>=Date.parse(upload.completed_at)&&(running||completed)));
      lastNumber=step.number;
    }
  }
  assert(Date.parse(source.completed_at)<=Date.parse(pg.started_at)&&Date.parse(pg.started_at)<=Date.parse(pg.completed_at)
    &&Date.parse(pg.completed_at)<=Date.parse(upload.completed_at));
  return {job:job.id,pgStartedAt:pg.started_at,uploadedAt:upload.completed_at,
    ...(historicalNationalOmitted?{historicalNationalOmitted:true}:{})};
}
export function verifyAssistantPublic591ArtifactMetadata(metadata,run,phase){
  assert.equal(metadata.expired,false);assert.equal(metadata.workflow_run?.id,run.id);
  assert.equal(metadata.workflow_run?.head_sha,run.head_sha);assert.equal(metadata.name,'native586-phase-'+run.id+'-1-'+run.head_sha);
  assert(Number.isSafeInteger(metadata.id)&&metadata.id>0);
  assert(Number.isSafeInteger(metadata.size_in_bytes)&&metadata.size_in_bytes>0&&metadata.size_in_bytes<=65536);
  assert.match(metadata.digest,/^sha256:[a-f0-9]{64}$/);
  assert(Date.parse(metadata.created_at)>=Date.parse(phase.pgStartedAt)&&Date.parse(metadata.created_at)<=Date.parse(phase.uploadedAt));
  return metadata;
}
function assistantPublic591ArtifactProof(metadata,zip,raw,run,phase){
  verifyAssistantPublic591ArtifactMetadata(metadata,run,phase);
  assert.equal(zip.length,metadata.size_in_bytes);assert.equal('sha256:'+sha(zip),metadata.digest);
  assert(raw.length>0&&raw.length<=32768);const proof=JSON.parse(raw);
  assert.equal(proof.schemaVersion,2);assert.equal(proof.kind,ASSISTANT_PUBLIC591_V2_KIND);
  assert.equal(proof.repository,ORIGIN.repository);assert.equal(proof.headSha,run.head_sha);
  assert.equal(proof.privatePayloadIncluded,false);assert.match(proof.sourceTreeSha256,/^sha256:[a-f0-9]{64}$/);
  verifyAssistantPublic591V2PhaseReceipt(proof.nativePostgres,{run:run.id,attempt:1,head:run.head_sha,
    pullRequest:proof.nativePostgres?.current?.pullRequest,branch:run.head_branch});return proof;
}
function verifyAssistantPublic591OriginPullRequest(pr,run,number){
  assert(Number.isSafeInteger(number)&&number>0);assert.equal(pr.number,number);
  assert(['open','closed'].includes(pr.state));assert.equal(pr.base?.repo?.full_name,ORIGIN.repository);
  assert.equal(pr.base?.ref,'main');assert.equal(pr.head?.repo?.full_name,ORIGIN.repository);
  assert.equal(pr.head?.sha,run.head_sha);assert.equal(pr.head?.ref,run.head_branch);
  assert(typeof run.head_branch==='string'&&run.head_branch.length>0&&run.head_branch.length<=255);
  // GitHub may omit the run's PR projection after merge. Its bound artifact
  // supplies the number, while the independent PR API still proves identity.
  assert(Array.isArray(run.pull_requests));
  if(run.pull_requests.length)assert.equal(one(run.pull_requests).number,number);
}
export function verifyAssistantPublic591Artifact(metadata,zip,raw,run,phase,originPullRequest){
  const proof=assistantPublic591ArtifactProof(metadata,zip,raw,run,phase);
  verifyAssistantPublic591OriginPullRequest(originPullRequest,run,proof.nativePostgres.current.pullRequest);
  return proof;
}

// V2-only bounded transport. No response headers, bodies or signed URLs are
// persisted. Historical V1 transport/defaults above remain byte-identical.
async function readAssistantPublic591Body(response,limit,signal){
  const reader=response.body?.getReader();assert(reader,'Streaming response body required');
  const chunks=[];let bytes=0,done=false,onAbort;
  const aborted=new Promise((resolve,reject)=>{
    onAbort=()=>reject(new Error('NATIVE591_V2_BODY_TIMEOUT'));
    signal.addEventListener('abort',onAbort,{once:true});if(signal.aborted)onAbort();
  });
  try{
    while(true){
      const item=await Promise.race([reader.read(),aborted]);
      if(item.done){done=true;break;}
      assert(item.value instanceof Uint8Array);bytes+=item.value.byteLength;
      assert(bytes<=limit,'NATIVE591_V2_BODY_BYTE_LIMIT');
      chunks.push(Buffer.from(item.value));
    }
    return Buffer.concat(chunks,bytes);
  }finally{
    signal.removeEventListener('abort',onAbort);
    if(!done)reader.cancel().catch(()=>{});
    try{reader.releaseLock();}catch{ /* Cancellation owns an outstanding read. */ }
  }
}
function assistantPublic591Transport({env=process.env,fetchImpl=globalThis.fetch,now=()=>performance.now()}={},physicalLimit){
  let calls=0;const deadline=now()+60000;
  const remainingBudget=()=>{const value=deadline-now();assert(value>0,'NATIVE591_V2_TOTAL_TIME_LIMIT');return value;};
  const request=async(url,options)=>{
    assert(++calls<=physicalLimit,'NATIVE591_V2_CALL_LIMIT');
    const remaining=Math.floor(deadline-now());assert(remaining>0,'NATIVE591_V2_TOTAL_TIME_LIMIT');
    const signal=AbortSignal.timeout(Math.min(15000,remaining));
    return {response:await fetchImpl(url,{...options,signal}),signal};
  };
  const cancelUnused=response=>{
    if(response?.body&&!response.bodyUsed)response.body.cancel().catch(()=>{});
  };
  const read=async(route,{zip=false}={})=>{
    let api=null,signed=null;
    try{
      assert(typeof route==='string'&&route.startsWith('/repos/'+ORIGIN.repository+'/'));
      assert(typeof env.GITHUB_TOKEN==='string'&&env.GITHUB_TOKEN.length>0);
      api=await request('https://api.github.com'+route,{headers:{Authorization:'Bearer '+env.GITHUB_TOKEN,
        Accept:'application/vnd.github+json','X-GitHub-Api-Version':'2022-11-28'},redirect:'manual'});
      if(!zip){
        assert(api.response.ok);const raw=await readAssistantPublic591Body(api.response,2*1024*1024,api.signal);
        assert(now()<deadline,'NATIVE591_V2_TOTAL_TIME_LIMIT');
        return JSON.parse(raw.toString('utf8'));
      }
      assert.equal(api.response.status,302);
      const target=new URL(api.response.headers.get('location'));
      assert.equal(target.protocol,'https:');assert(!target.username&&!target.password);
      cancelUnused(api.response);
      // Never spread the repository request headers onto the signed request.
      signed=await request(target.href,{redirect:'error'});assert(signed.response.ok);
      const raw=await readAssistantPublic591Body(signed.response,65536,signed.signal);
      assert(now()<deadline,'NATIVE591_V2_TOTAL_TIME_LIMIT');return raw;
    }catch{
      // Errors from fetch/URL/JSON may contain a signed URL or body. Do not
      // retain their text, cause, headers or values in diagnostics.
      throw new Error('NATIVE591_V2_EVIDENCE_UNAVAILABLE');
    }finally{cancelUnused(api?.response);cancelUnused(signed?.response);}
  };
  return {read,remainingBudget};
}
export function assistantPublic591Reader(options={}){
  return assistantPublic591Transport(options,24).read;
}
// A valid594 REUSED locator with two later runs needs25 physical HTTP hops,
// including signed ZIP reads. Only this new reader uses the existing64/60
// source evidence envelope;593 keeps24/60 and all other limits stay shared.
export function installed593Original591Reader(options={}){
  return assistantPublic591Transport(options,64).read;
}

// One closed source-consumer phase, shared through discovery, TARGETED and
// historical FULL qualification. No public request/time/byte-limit override.
const sourceImpactEvidencePhases=new WeakMap();
export function sourceImpactEvidenceAccess(options={}){
  assert(arguments.length<=1);assert(options&&Object.getPrototypeOf(options)===Object.prototype);
  assert(Object.keys(options).every(key=>['env','fetchImpl','now'].includes(key)));
  const transport=assistantPublic591Transport(options,64);
  const getJson=route=>transport.read(route),getArtifactZip=route=>transport.read(route,{zip:true});
  const budget=Object.freeze({remaining:transport.remainingBudget});
  sourceImpactEvidencePhases.set(getJson,{getArtifactZip,budget});
  return Object.freeze({getJson,getArtifactZip});
}
export function sourceImpactEvidenceBudget(getJson,getArtifactZip){
  const phase=sourceImpactEvidencePhases.get(getJson);
  return phase?.getArtifactZip===getArtifactZip?phase.budget:null;
}

export async function decideAssistantPublic591Reuse({env=process.env,local,get,readGit=git,
  getRuntime=assistantPublic591Runtime,getInput=captureAssistantPublic591Input,decode=decodeCurrent586Artifact}={}){
  try{
    local??=await assistantPublic591LocalProof({env,readGit,getRuntime});
    verifyAssistantPublic591Input(local.nativeInput);verifyAssistantPublic591Runtime(local.runtime);
    const repo='/repos/'+ORIGIN.repository,base=repo+'/actions';get??=assistantPublic591Reader({env});
    const current=await get(base+'/runs/'+local.current.run);
    assert.equal(current.id,local.current.run);assert.equal(current.run_attempt,1);assert.equal(current.head_sha,local.current.head);
    assert.equal(current.head_branch,local.current.branch);assert.equal(current.path,WORKFLOW);assert.equal(current.event,'pull_request');
    verifyCurrentPullRequest(await get(repo+'/pulls/'+local.current.pullRequest),current,local.current.pullRequest);
    const since=new Date(Date.parse(current.created_at)-30*86400000).toISOString();
    const query=new URLSearchParams({event:'pull_request',per_page:'100',created:'>='+since});
    const listing=await get(base+'/workflows/validate-pull-request.yml/runs?'+query);
    assert(Number.isSafeInteger(listing.total_count)&&listing.total_count>0);
    assert.equal(listing.workflow_runs.length,Math.min(listing.total_count,100));
    assert.equal(new Set(listing.workflow_runs.map(row=>row.id)).size,listing.workflow_runs.length);
    const prior=listing.workflow_runs.filter(row=>row.id<current.id).sort((a,b)=>b.id-a.id);
    // Search only the bounded latest page. Missing candidates execute normally.
    let row=null;
    for(const candidate of prior){
      try{
        if(candidate.run_attempt!==1)continue;
        for(const file of ASSISTANT_PUBLIC591_CONTROLS)
          assert.equal(readGit(['cat-file','blob',candidate.head_sha+':'+file]),readGit(['cat-file','blob','HEAD:'+file]));
        row=candidate;break;
      }catch{ /* An old V1 producer or unavailable Git source is no origin. */ }
    }
    assert(row);const load=async expected=>{
      const run=await get(base+'/runs/'+expected.id);
      for(const key of ['id','head_sha','head_branch','run_attempt'])assert.equal(run[key],expected[key]);
      const jobs=await get(base+'/runs/'+run.id+'/attempts/1/jobs?per_page=100'),phase=verifyAssistantPublic591Metadata(run,jobs,readGit);
      const artifacts=await get(base+'/runs/'+run.id+'/artifacts?per_page=100');assert(complete(artifacts,'artifacts'));
      const artifact=one(artifacts.artifacts.filter(value=>value.name==='native586-phase-'+run.id+'-1-'+run.head_sha));
      verifyAssistantPublic591ArtifactMetadata(artifact,run,phase);
      const zip=await get(base+'/artifacts/'+artifact.id+'/zip',{zip:true});
      const raw=decode(zip),bound=assistantPublic591ArtifactProof(artifact,zip,raw,run,phase);
      const originPullRequest=await get(repo+'/pulls/'+bound.nativePostgres.current.pullRequest);
      const proof=verifyAssistantPublic591Artifact(artifact,zip,raw,run,phase,originPullRequest);
      return {run,phase,artifact,proof};
    };
    let origin=await load(row);
    if(origin.proof.nativePostgres.status==='REUSED'){
      const locator=origin.proof.nativePostgres.origin;
      origin=await load({id:locator.run,run_attempt:1,head_sha:locator.head,
        head_branch:(await get(base+'/runs/'+locator.run)).head_branch});
      assert.equal(origin.phase.job,locator.job);assert.equal(origin.artifact.id,locator.artifactId);
      assert.equal(origin.artifact.digest,locator.artifactDigest);assert.equal(origin.proof.sourceTreeSha256,locator.sourceTreeSha256);
    }
    assert.equal(origin.proof.nativePostgres.status,'EXECUTED','REUSED never becomes a SQL origin');
    const originalInputs=await getInput({ref:origin.run.head_sha,readGit,physical:false});
    verifyAssistantPublic591Input(local.nativeInput,originalInputs);
    verifyAssistantPublic591Input(originalInputs,origin.proof.nativePostgres.nativeInput);
    verifyAssistantPublic591Runtime(local.runtime,origin.proof.nativePostgres.runtime);
    const historyQuery=new URLSearchParams({event:'pull_request',per_page:'100',created:'>='+origin.run.created_at});
    const later=await get(base+'/workflows/validate-pull-request.yml/runs?'+historyQuery);
    assert(complete(later,'workflow_runs'));assert.equal(new Set(later.workflow_runs.map(value=>value.id)).size,later.total_count);
    assert(later.workflow_runs.some(value=>value.id===origin.run.id)&&later.workflow_runs.some(value=>value.id===current.id));
    for(const next of later.workflow_runs.filter(value=>value.id>origin.run.id&&value.id!==current.id)){
      assert.equal(next.path,WORKFLOW);assert.equal(next.event,'pull_request');assert.equal(next.repository?.full_name,ORIGIN.repository);
      assert.equal(next.run_attempt,1);assert.equal(next.status,'completed');
      const jobs=await get(base+'/runs/'+next.id+'/attempts/1/jobs?per_page=100');assert(complete(jobs,'jobs'));
      const job=one(jobs.jobs.filter(value=>value.name===JOB));assert.equal(job.run_id,next.id);
      assert.equal(job.run_attempt,1);assert.equal(job.head_sha,next.head_sha);assert.equal(job.status,'completed');
      const pg=one(job.steps.filter(value=>value.name===STEP));assert(pg.conclusion==='skipped'||successful(pg));
    }
    verifyAssistantPublic591Input(local.nativeInput,await getInput({readGit}));
    verifyAssistantPublic591Runtime(local.runtime,await getRuntime());
    const originFinal=await get(base+'/runs/'+origin.run.id);
    for(const key of ['id','head_sha','head_branch','run_attempt'])assert.equal(originFinal[key],origin.run[key]);
    assert.deepEqual(verifyAssistantPublic591Metadata(originFinal,
      await get(base+'/runs/'+origin.run.id+'/attempts/1/jobs?per_page=100'),readGit),origin.phase);
    verifyAssistantPublic591OriginPullRequest(await get(repo+'/pulls/'+origin.proof.nativePostgres.current.pullRequest),
      originFinal,origin.proof.nativePostgres.current.pullRequest);
    const refreshed=await get(base+'/artifacts/'+origin.artifact.id);
    for(const key of ['id','name','digest','size_in_bytes','expired','created_at'])assert.deepEqual(refreshed[key],origin.artifact[key]);
    assert.equal(refreshed.expired,false);
    const currentFinal=await get(base+'/runs/'+current.id);
    assert.equal(currentFinal.id,current.id);assert.equal(currentFinal.run_attempt,1);assert.equal(currentFinal.head_sha,local.current.head);
    verifyCurrentPullRequest(await get(repo+'/pulls/'+local.current.pullRequest),currentFinal,local.current.pullRequest);
    assert.equal(readGit(['rev-parse','HEAD^{commit}']).trim(),local.current.head);
    return {...local,status:'REUSED',executedInThisRun:false,origin:{run:origin.run.id,attempt:1,job:origin.phase.job,
      head:origin.run.head_sha,artifactId:origin.artifact.id,artifactDigest:origin.artifact.digest,
      sourceTreeSha256:origin.proof.sourceTreeSha256}};
  }catch{return {status:'EXECUTE',reason:'assistant-public591-v2-input-runtime-or-live-origin-unavailable-or-different'};}
}

// Separate forward-only594 V2: an older V1 receipt is never an origin.
export const INSTALLED593_ORIGINAL591_V2_KIND='RAVRADAR_INSTALLED593_ORIGINAL591_SUCCESSOR_POSTGRES_PHASE_V2';
export const INSTALLED593_ORIGINAL591_V2_PROFILE='assistant-installed593-origin591-successor/4.0.594/native-v2';
export const INSTALLED593_ORIGINAL591_INPUT_MODULES=Object.freeze([
  "config.js",
  "js/core/phase-d-process-candidate.js",
  "js/core/phase-d-wave-process-candidate.js",
  "js/core/ravscore-candidate-g-state-pipeline.js",
  "js/core/ravscore-candidate-g.js",
  "js/core/ravscore-current-supply-memory.js",
  "js/core/ravscore-integrated-state-pipeline.js",
  "js/core/ravscore-mobilisation-memory.js",
  "js/core/ravscore-model-bundle.generated.js",
  "js/core/ravscore-model-contract.js",
  "js/core/ravscore-profile-switch.js",
  "js/core/ravscore-public-model.js",
  "js/core/ravscore-regime-memory.js",
  "js/core/ravscore-time.js",
  "js/core/ravscore-wave-approach-state.js",
  "js/core/ravscore-wave-mobilisation-state.js",
  "js/core/score-presentation.js",
  "js/core/wave-approach.js",
  "scripts/build-statistics-preference-revision.mjs",
  "scripts/check-account-statistics-assistant-predecessor-source.mjs",
  "scripts/check-assistant-later-h0-predecessor-source.mjs",
  "scripts/check-current-memory-warmup-predecessor-source.mjs",
  "scripts/check-installed593-code-predecessor-source.mjs",
  "scripts/check-last-mile-enclosure-predecessor-source.mjs",
  "scripts/check-native-current-reanalysis-predecessor-source.mjs",
  "scripts/check-native-identity-frozen-i71-source.mjs",
  "scripts/check-native-original-continuity-predecessor-source.mjs",
  "scripts/integrated-cutover-readiness.mjs",
  "scripts/lib/account-assistant-successor-source.mjs",
  "scripts/lib/account-statistics-assistant-successor-source.mjs",
  "scripts/lib/assistant-later-h0-postgres.mjs",
  "scripts/lib/assistant-later-h0-successor-source.mjs",
  "scripts/lib/checkpoint-cas-native-postgres.mjs",
  "scripts/lib/coastal-point-staging-contract.mjs",
  "scripts/lib/copernicus-offline-environment.mjs",
  "scripts/lib/current-grid-successor-source.mjs",
  "scripts/lib/current-memory-warmup-postgres.mjs",
  "scripts/lib/current-memory-warmup-successor-source.mjs",
  "scripts/lib/current-transport-history.mjs",
  "scripts/lib/dmi-marine-zone-exclusions.mjs",
  "scripts/lib/established-native-current-origin-successor-source.mjs",
  "scripts/lib/last-mile-enclosure-successor-source.mjs",
  "scripts/lib/live-current-pilot.mjs",
  "scripts/lib/native-identity-checkpoint-postgres.mjs",
  "scripts/lib/native-original-continuity-successor-source.mjs",
  "scripts/lib/native-sampling-identity-successor-source.mjs",
  "scripts/lib/native0600-original-successor-source.mjs",
  "scripts/lib/ravscore-candidate-g-rollback-runtime.mjs",
  "scripts/lib/ravscore-continuation-implementation-contract.mjs",
  "scripts/lib/ravscore-profile-transition.mjs",
  "scripts/lib/ravscore-sampling-context.mjs",
  "scripts/lib/statistics-preference-revision-native-postgres.mjs",
  "scripts/lib/supabase-admin-rest.mjs",
  "scripts/native-sampling-identity-successor-readiness.mjs",
  "scripts/protected-ravscore-continuation-checkpoint.mjs",
  "scripts/ravscore-continuation-checkpoint.mjs",
  "scripts/rollback-assets/ravscore-model-bundle.generated.js",
  "scripts/rollback-assets/ravscore-model-contract.js",
  "scripts/run-frozen-current-memory-warmup-source-targets.mjs",
  "scripts/run-frozen-established-native-current-origin-source-targets.mjs",
  "scripts/run-frozen-native0600-source-targets.mjs",
  "scripts/run-frozen584-checkpoint-postgres-source.mjs",
  "scripts/run-frozen585-native-continuity-postgres-source.mjs",
  "scripts/run-frozen586-assistant-later-h0-postgres-source.mjs",
  "scripts/test-protected-ravscore-continuation-checkpoint.mjs",
  "scripts/verify-account-assistant-schema.mjs"
]);
export const INSTALLED593_ORIGINAL591_REVIEWED_MODULE_SHA256='6c0579de5a0b29b3ab551d718e0cfadc9450e570828355fbae716df694de09bd';
export const INSTALLED593_ORIGINAL591_FROZEN=Object.freeze([...ASSISTANT_PUBLIC591_FROZEN,
  Object.freeze({head:'34cf42ff81cb8be7b3d8bb79029ae648e419a143',tree:'575dfca61399dd29309c4620aab96053f1d930b6'})]);
const INSTALLED593_ORIGINAL591_DATA=Object.freeze([...ASSISTANT_PUBLIC591_DATA,
  'scripts/fixtures/installed593-code-predecessor.json']);
const INSTALLED593_ORIGINAL591_CONTROLS=Object.freeze([...ASSISTANT_PUBLIC591_CONTROLS,
  'scripts/national584-source-evidence.mjs','scripts/source-impact-full-baseline.mjs',
  'scripts/test-source-impact-full-baseline.mjs',
  // Finite current verifier helpers/data; frozen sources retain their own pins.
  'scripts/lib/source-tree-content.mjs','scripts/lib/weather-source-gate.mjs',
  'scripts/lib/source-impact-workflow-review.mjs','scripts/lib/account-statistics-assistant-package-review.mjs',
  'scripts/lib/account-statistics-assistant-package-review.json','scripts/validate-source-once.mjs',
  'scripts/run-frozen584-source-targets.mjs','scripts/lib/frozen584-normal-source-target-inventory.json']);
export function installed593Original591PackageScopePaths(){
  const files=new Set(['package.json']);
  for(const module of INSTALLED593_ORIGINAL591_INPUT_MODULES)
    for(let directory=path.posix.dirname(module);directory!=='.';directory=path.posix.dirname(directory))
      files.add(directory+'/package.json');
  return [...files].sort();
}
function nearestInstalled593Original591Scopes(scopes){
  const present=new Set(scopes.filter(row=>row.present).map(row=>row.file));
  return sha(JSON.stringify(INSTALLED593_ORIGINAL591_INPUT_MODULES.map(module=>{
    let directory=path.posix.dirname(module);
    while(directory!=='.'){
      const file=directory+'/package.json';if(present.has(file))return [module,file];
      directory=path.posix.dirname(directory);
    }
    assert(present.has('package.json'));return [module,'package.json'];
  })));
}
export function installed593Original591RootPackageScopes(){
  const scopes=installed593Original591PackageScopePaths().map(file=>file==='package.json'
    ?{file,present:true,mode:'100644',type:'module',version:'4.0.594'}:{file,present:false});
  return {scopes,nearestSha256:nearestInstalled593Original591Scopes(scopes)};
}
export async function captureInstalled593Original591Input({ref='HEAD',readGit=git,root=process.cwd(),physical=true}={}){
  const tree=parseTree(readGit(['ls-tree','-rz','--full-tree',ref])),index=new Map(tree.map(row=>[row[0],row]));
  const sql=tree.filter(row=>row[0].startsWith('supabase/migrations/')&&row[0].endsWith('.sql')).map(row=>row[0]).sort();
  assert.equal(sql.length,72);assert.equal(INSTALLED593_ORIGINAL591_INPUT_MODULES.length,66);
  if(physical)assert.deepEqual((await fs.readdir(path.join(root,'supabase/migrations'))).filter(name=>name.endsWith('.sql')).sort(),
    sql.map(file=>path.posix.basename(file)),'Every physical SQL archive entry is an input');
  const rows=new Map(),read=async file=>{
    if(rows.has(file))return rows.get(file);
    const row=index.get(file);assert(row&&['100644','100755'].includes(row[1])&&row[2]==='blob','Regular tracked native input required');
    const bytes=Buffer.from(readGit(['cat-file','blob',ref+':'+file]));
    if(physical){
      const absolute=path.resolve(root,file),stat=await fs.lstat(absolute);
      assert(stat.isFile()&&!stat.isSymbolicLink());assert.equal(await fs.realpath(absolute),absolute);
      assert.deepEqual(await fs.readFile(absolute),bytes,'Physical native input differs from its Git blob');
    }
    const value={file,mode:row[1],blob:row[3],bytes:bytes.length,sha256:sha(bytes)};rows.set(file,value);return value;
  };
  const moduleRows=[];
  for(const file of INSTALLED593_ORIGINAL591_INPUT_MODULES)moduleRows.push(await read(file));
  const moduleSha256=sha(JSON.stringify(moduleRows.map(({file,bytes,sha256})=>({file,bytes,sha256}))));
  assert.equal(moduleSha256,INSTALLED593_ORIGINAL591_REVIEWED_MODULE_SHA256,'Native closure changed; no automatic new qualification');
  for(const file of [...INSTALLED593_ORIGINAL591_DATA,...sql])await read(file);
  const inputRows=[...rows.values()].sort((a,b)=>a.file.localeCompare(b.file,'en'));
  const controls=[];for(const file of INSTALLED593_ORIGINAL591_CONTROLS)controls.push(await read(file));
  const packageGit=JSON.parse(String(readGit(['cat-file','blob',ref+':package.json'])));
  const packageMode={type:packageGit.type,version:packageGit.version};
  assert.deepEqual(packageMode,{type:'module',version:'4.0.594'});
  const scopes=[];
  for(const file of installed593Original591PackageScopePaths()){
    if(!index.has(file)){
      if(physical){
        let actual=null;try{actual=await fs.lstat(path.resolve(root,file));}catch(error){if(error.code!=='ENOENT')throw error;}
        assert.equal(actual,null,'Untracked package scope changes native module resolution');
      }
      scopes.push({file,present:false});continue;
    }
    const row=await read(file);
    if(file==='package.json')scopes.push({file,present:true,mode:row.mode,...packageMode});
    else{
      const parsed=JSON.parse(String(readGit(['cat-file','blob',ref+':'+file])));
      scopes.push({...row,present:true,type:parsed?.type??null});
    }
  }
  const packageScopes={scopes,nearestSha256:nearestInstalled593Original591Scopes(scopes)};
  for(const {head,tree}of INSTALLED593_ORIGINAL591_FROZEN)
    assert.equal(readGit(['rev-parse',head+'^{tree}']).trim(),tree);
  return {schemaVersion:1,files:143,modules:66,sqlFiles:72,moduleSha256,
    inputSha256:sha(JSON.stringify(inputRows)),controlsSha256:sha(JSON.stringify(controls)),
    packageMode,packageScopes,frozenGitTrees:INSTALLED593_ORIGINAL591_FROZEN};
}
export function verifyInstalled593Original591Input(value,prior=value){
  assert.deepEqual(value,prior,'Every selected native input must match');
  assert.equal(value?.schemaVersion,1);assert.equal(value.files,143);assert.equal(value.modules,66);assert.equal(value.sqlFiles,72);
  assert.equal(value.moduleSha256,INSTALLED593_ORIGINAL591_REVIEWED_MODULE_SHA256);
  for(const field of ['inputSha256','controlsSha256'])assert.match(value[field],hashPattern);
  assert.deepEqual(value.packageMode,{type:'module',version:'4.0.594'});
  assert.deepEqual(value.packageScopes?.scopes.map(row=>row.file),installed593Original591PackageScopePaths());
  for(const row of value.packageScopes.scopes){
    assert.equal(typeof row.present,'boolean');
    if(!row.present)assert.deepEqual(row,{file:row.file,present:false});
    else{
      assert(['100644','100755'].includes(row.mode));
      if(row.file==='package.json')assert.deepEqual(row,{file:'package.json',present:true,mode:row.mode,...value.packageMode});
      else{assert.match(row.blob,/^[a-f0-9]{40}$/);assert.match(row.sha256,hashPattern);assert(Number.isSafeInteger(row.bytes)&&row.bytes>0);}
    }
  }
  assert.equal(value.packageScopes.nearestSha256,nearestInstalled593Original591Scopes(value.packageScopes.scopes));
  assert.deepEqual(value.frozenGitTrees,INSTALLED593_ORIGINAL591_FROZEN);return value;
}
export function verifyInstalled593Original591V2PhaseReceipt(native,current){
  assert.equal(native?.schemaVersion,2);assert.equal(native.kind,INSTALLED593_ORIGINAL591_V2_KIND);
  assert.equal(native.profile,INSTALLED593_ORIGINAL591_V2_PROFILE);assert.equal(native.phase,'INSTALLED593_ORIGINAL591_SUCCESSOR');
  assert.equal(native.sourcePhase,'assistant-installed593-origin591-successor');
  assert.equal(native.releaseVersion,requireInstalled593Original591Release());
  assert.deepEqual(native.binding,requireInstalled593Original591Binding());
  assert.deepEqual(native.output,requireInstalled593Original591Output());
  assert.deepEqual(native.databaseBefore,INSTALLED593_ORIGINAL591_DATABASE_BEFORE);
  assert.deepEqual(native.commands,INSTALLED593_ORIGINAL591_COMMANDS);assert.deepEqual(native.current,current);
  assert(Number.isSafeInteger(current.run)&&current.run>ORIGIN.run);assert.equal(current.attempt,1);
  assert.match(current.head,/^[a-f0-9]{40}$/);assert(Number.isSafeInteger(current.pullRequest)&&current.pullRequest>0);
  assert(typeof current.branch==='string'&&current.branch.length>0&&current.branch.length<=255);
  assert.equal(native.eligibleForReuse,true);assert(['EXECUTED','REUSED'].includes(native.status));
  assert.equal(native.executedInThisRun,native.status==='EXECUTED');
  verifyInstalled593Original591Input(native.nativeInput);verifyAssistantPublic591Runtime(native.runtime);
  if(native.status==='EXECUTED')assert.equal(native.origin,null);
  else{
    const origin=native.origin;assert(Number.isSafeInteger(origin?.run)&&origin.run>ORIGIN.run&&origin.run<current.run);
    assert.equal(origin.attempt,1);assert(Number.isSafeInteger(origin.job)&&origin.job>0);
    assert.match(origin.head,/^[a-f0-9]{40}$/);assert(Number.isSafeInteger(origin.artifactId)&&origin.artifactId>0);
    assert.match(origin.artifactDigest,/^sha256:[a-f0-9]{64}$/);assert.match(origin.sourceTreeSha256,/^sha256:[a-f0-9]{64}$/);
  }
  return {status:native.status,executedInThisRun:native.executedInThisRun,origin:native.origin};
}
async function installed593Original591LocalProof({env=process.env,readGit=git,getRuntime=assistantPublic591Runtime}={}){
  assert.equal(env.GITHUB_EVENT_NAME,'pull_request');assert.equal(env.GITHUB_REPOSITORY,ORIGIN.repository);
  assert.equal(env.GITHUB_RUN_ATTEMPT,'1');assert.match(env.SOURCE_GATE_HEAD_SHA,/^[a-f0-9]{40}$/);
  assert.equal(readGit(['rev-parse','HEAD^{commit}']).trim(),env.SOURCE_GATE_HEAD_SHA);
  assert.equal(readGit(['status','--porcelain','--untracked-files=no']).trim(),'');
  assert.equal(readGit(['for-each-ref','refs/replace']).trim(),'');
  assert.equal(readGit(['rev-parse','--is-shallow-repository']).trim(),'false');
  const current={run:Number(env.GITHUB_RUN_ID),attempt:1,head:env.SOURCE_GATE_HEAD_SHA,
    pullRequest:Number(env.PULL_REQUEST_NUMBER),branch:env.GITHUB_HEAD_REF};
  assert(Number.isSafeInteger(current.run)&&current.run>ORIGIN.run);assert(Number.isSafeInteger(current.pullRequest)&&current.pullRequest>0);
  assert(typeof current.branch==='string'&&current.branch.length>0&&current.branch.length<=255);
  const nativeInput=await captureInstalled593Original591Input({readGit}),runtime=await getRuntime();
  verifyInstalled593Original591Input(nativeInput);verifyAssistantPublic591Runtime(runtime);
  return {schemaVersion:2,kind:INSTALLED593_ORIGINAL591_V2_KIND,profile:INSTALLED593_ORIGINAL591_V2_PROFILE,
    phase:'INSTALLED593_ORIGINAL591_SUCCESSOR',sourcePhase:'assistant-installed593-origin591-successor',
    releaseVersion:requireInstalled593Original591Release(),binding:requireInstalled593Original591Binding(),
    output:requireInstalled593Original591Output(),databaseBefore:INSTALLED593_ORIGINAL591_DATABASE_BEFORE,
    commands:INSTALLED593_ORIGINAL591_COMMANDS,
    eligibleForReuse:true,current,nativeInput,runtime};
}
function installed593Original591ArtifactProof(metadata,zip,raw,run,phase){
  verifyAssistantPublic591ArtifactMetadata(metadata,run,phase);
  assert.equal(zip.length,metadata.size_in_bytes);assert.equal('sha256:'+sha(zip),metadata.digest);
  assert(raw.length>0&&raw.length<=32768);const proof=JSON.parse(raw);
  assert.equal(proof.schemaVersion,2);assert.equal(proof.kind,INSTALLED593_ORIGINAL591_V2_KIND);
  assert.equal(proof.repository,ORIGIN.repository);assert.equal(proof.headSha,run.head_sha);
  assert.equal(proof.privatePayloadIncluded,false);assert.match(proof.sourceTreeSha256,/^sha256:[a-f0-9]{64}$/);
  verifyInstalled593Original591V2PhaseReceipt(proof.nativePostgres,{run:run.id,attempt:1,head:run.head_sha,
    pullRequest:proof.nativePostgres?.current?.pullRequest,branch:run.head_branch});return proof;
}
export function verifyInstalled593Original591Artifact(metadata,zip,raw,run,phase,originPullRequest){
  const proof=installed593Original591ArtifactProof(metadata,zip,raw,run,phase);
  verifyAssistantPublic591OriginPullRequest(originPullRequest,run,proof.nativePostgres.current.pullRequest);
  return proof;
}

export async function decideInstalled593Original591Reuse({env=process.env,local,get,readGit=git,
  getRuntime=assistantPublic591Runtime,getInput=captureInstalled593Original591Input,decode=decodeCurrent586Artifact}={}){
  try{
    local??=await installed593Original591LocalProof({env,readGit,getRuntime});
    // Shape check only: this temporary value is never an execution receipt.
    verifyInstalled593Original591V2PhaseReceipt({...local,status:'EXECUTED',executedInThisRun:true,origin:null},local.current);
    verifyInstalled593Original591Input(local.nativeInput);verifyAssistantPublic591Runtime(local.runtime);
    const repo='/repos/'+ORIGIN.repository,base=repo+'/actions';get??=installed593Original591Reader({env});
    const current=await get(base+'/runs/'+local.current.run);
    assert.equal(current.id,local.current.run);assert.equal(current.run_attempt,1);assert.equal(current.head_sha,local.current.head);
    assert.equal(current.head_branch,local.current.branch);assert.equal(current.path,WORKFLOW);assert.equal(current.event,'pull_request');
    verifyCurrentPullRequest(await get(repo+'/pulls/'+local.current.pullRequest),current,local.current.pullRequest);
    const since=new Date(Date.parse(current.created_at)-30*86400000).toISOString();
    const query=new URLSearchParams({event:'pull_request',per_page:'100',created:'>='+since});
    const listing=await get(base+'/workflows/validate-pull-request.yml/runs?'+query);
    assert(Number.isSafeInteger(listing.total_count)&&listing.total_count>0);
    assert.equal(listing.workflow_runs.length,Math.min(listing.total_count,100));
    assert.equal(new Set(listing.workflow_runs.map(row=>row.id)).size,listing.workflow_runs.length);
    const prior=listing.workflow_runs.filter(row=>row.id<current.id).sort((a,b)=>b.id-a.id);
    // Search only the bounded latest page. Missing candidates execute normally.
    let row=null,rowJobs=null;
    for(const candidate of prior){
      try{
        if(candidate.run_attempt!==1)continue;
        for(const file of INSTALLED593_ORIGINAL591_CONTROLS)
          assert.equal(readGit(['cat-file','blob',candidate.head_sha+':'+file]),readGit(['cat-file','blob','HEAD:'+file]));
      }catch{ /* An old V1 producer or unavailable Git source is no origin. */ continue; }
      // The normal TARGETED run skips full source15, PG16 and upload17. It is not a
      // native origin; only this exact skipped phase can pass to an older row.
      // Metadata/PG/artifact refusals stay outside the source-lookup catch.
      const jobs=await get(base+'/runs/'+candidate.id+'/attempts/1/jobs?per_page=100');assert(complete(jobs,'jobs'));
      const job=one(jobs.jobs.filter(value=>value.name===JOB));assert.equal(job.run_id,candidate.id);
      assert.equal(job.run_attempt,1);assert.equal(job.head_sha,candidate.head_sha);assert.equal(job.status,'completed');
      const pg=one(job.steps.filter(value=>value.name===STEP));
      if(pg.conclusion==='skipped'){
        const skippedRun=await get(base+'/runs/'+candidate.id);
        for(const key of ['id','head_sha','head_branch','run_attempt'])assert.equal(skippedRun[key],candidate[key]);
        assert.equal(skippedRun.path,WORKFLOW);assert.equal(skippedRun.event,'pull_request');
        assert.equal(skippedRun.repository?.full_name,ORIGIN.repository);assert.equal(skippedRun.head_repository?.full_name,ORIGIN.repository);
        assert.equal(skippedRun.status,'completed');assert.equal(skippedRun.conclusion,'success');
        assert.match(skippedRun.head_sha,/^[a-f0-9]{40}$/);assert(typeof skippedRun.head_branch==='string'&&skippedRun.head_branch.length>0);
        assert(Number.isSafeInteger(job.id)&&job.id>0);assert.equal(job.conclusion,'success');
        const source=one(job.steps.filter(value=>value.name==='Validate source contracts and release governance'));
        const upload=one(job.steps.filter(value=>value.name===CURRENT586_PHASE_UPLOAD));
        assert.equal(source.number,15);assert.equal(pg.number,16);assert.equal(upload.number,17);
        assert.deepEqual(job.steps.filter(value=>value.number<=17).map(value=>value.number),Array.from({length:17},(_,i)=>i+1));
        assert(job.steps.filter(value=>value.number<15).every(successful));
        assert.equal(source.status,'completed');assert.equal(source.conclusion,'skipped');
        assert.equal(pg.status,'completed');assert.equal(upload.status,'completed');assert.equal(upload.conclusion,'skipped');
        continue;
      }
      row=candidate;rowJobs=jobs;break;
    }
    assert(row);const load=async expected=>{
      const run=await get(base+'/runs/'+expected.id);
      for(const key of ['id','head_sha','head_branch','run_attempt'])assert.equal(run[key],expected[key]);
      const jobs=expected.id===row.id?rowJobs:await get(base+'/runs/'+run.id+'/attempts/1/jobs?per_page=100');
      const phase=verifyAssistantPublic591Metadata(run,jobs,readGit);
      const artifacts=await get(base+'/runs/'+run.id+'/artifacts?per_page=100');assert(complete(artifacts,'artifacts'));
      const artifact=one(artifacts.artifacts.filter(value=>value.name==='native586-phase-'+run.id+'-1-'+run.head_sha));
      verifyAssistantPublic591ArtifactMetadata(artifact,run,phase);
      const zip=await get(base+'/artifacts/'+artifact.id+'/zip',{zip:true});
      const raw=decode(zip),bound=installed593Original591ArtifactProof(artifact,zip,raw,run,phase);
      const originPullRequest=await get(repo+'/pulls/'+bound.nativePostgres.current.pullRequest);
      const proof=verifyInstalled593Original591Artifact(artifact,zip,raw,run,phase,originPullRequest);
      return {run,phase,artifact,proof};
    };
    let origin=await load(row);
    if(origin.proof.nativePostgres.status==='REUSED'){
      const locator=origin.proof.nativePostgres.origin;
      origin=await load({id:locator.run,run_attempt:1,head_sha:locator.head,
        head_branch:(await get(base+'/runs/'+locator.run)).head_branch});
      assert.equal(origin.phase.job,locator.job);assert.equal(origin.artifact.id,locator.artifactId);
      assert.equal(origin.artifact.digest,locator.artifactDigest);assert.equal(origin.proof.sourceTreeSha256,locator.sourceTreeSha256);
    }
    assert.equal(origin.proof.nativePostgres.status,'EXECUTED','REUSED never becomes a SQL origin');
    const originalInputs=await getInput({ref:origin.run.head_sha,readGit,physical:false});
    verifyInstalled593Original591Input(local.nativeInput,originalInputs);
    verifyInstalled593Original591Input(originalInputs,origin.proof.nativePostgres.nativeInput);
    verifyAssistantPublic591Runtime(local.runtime,origin.proof.nativePostgres.runtime);
    const historyQuery=new URLSearchParams({event:'pull_request',per_page:'100',created:'>='+origin.run.created_at});
    const later=await get(base+'/workflows/validate-pull-request.yml/runs?'+historyQuery);
    assert(complete(later,'workflow_runs'));assert.equal(new Set(later.workflow_runs.map(value=>value.id)).size,later.total_count);
    assert(later.workflow_runs.some(value=>value.id===origin.run.id)&&later.workflow_runs.some(value=>value.id===current.id));
    for(const next of later.workflow_runs.filter(value=>value.id>origin.run.id&&value.id!==current.id)){
      assert.equal(next.path,WORKFLOW);assert.equal(next.event,'pull_request');assert.equal(next.repository?.full_name,ORIGIN.repository);
      assert.equal(next.run_attempt,1);assert.equal(next.status,'completed');
      const jobs=await get(base+'/runs/'+next.id+'/attempts/1/jobs?per_page=100');assert(complete(jobs,'jobs'));
      const job=one(jobs.jobs.filter(value=>value.name===JOB));assert.equal(job.run_id,next.id);
      assert.equal(job.run_attempt,1);assert.equal(job.head_sha,next.head_sha);assert.equal(job.status,'completed');
      const pg=one(job.steps.filter(value=>value.name===STEP));assert.equal(pg.status,'completed');
      assert(pg.conclusion==='skipped'||successful(pg));
    }
    verifyInstalled593Original591Input(local.nativeInput,await getInput({readGit}));
    verifyAssistantPublic591Runtime(local.runtime,await getRuntime());
    const originFinal=await get(base+'/runs/'+origin.run.id);
    for(const key of ['id','head_sha','head_branch','run_attempt'])assert.equal(originFinal[key],origin.run[key]);
    assert.deepEqual(verifyAssistantPublic591Metadata(originFinal,
      await get(base+'/runs/'+origin.run.id+'/attempts/1/jobs?per_page=100'),readGit),origin.phase);
    verifyAssistantPublic591OriginPullRequest(await get(repo+'/pulls/'+origin.proof.nativePostgres.current.pullRequest),
      originFinal,origin.proof.nativePostgres.current.pullRequest);
    const refreshed=await get(base+'/artifacts/'+origin.artifact.id);
    for(const key of ['id','name','digest','size_in_bytes','expired','created_at'])assert.deepEqual(refreshed[key],origin.artifact[key]);
    assert.equal(refreshed.expired,false);
    const currentFinal=await get(base+'/runs/'+current.id);
    assert.equal(currentFinal.id,current.id);assert.equal(currentFinal.run_attempt,1);assert.equal(currentFinal.head_sha,local.current.head);
    verifyCurrentPullRequest(await get(repo+'/pulls/'+local.current.pullRequest),currentFinal,local.current.pullRequest);
    assert.equal(readGit(['rev-parse','HEAD^{commit}']).trim(),local.current.head);
    return {...local,status:'REUSED',executedInThisRun:false,origin:{run:origin.run.id,attempt:1,job:origin.phase.job,
      head:origin.run.head_sha,artifactId:origin.artifact.id,artifactDigest:origin.artifact.digest,
      sourceTreeSha256:origin.proof.sourceTreeSha256}};
  }catch{return {status:'EXECUTE',reason:'installed593-original591-v2-input-runtime-or-live-origin-unavailable-or-different'};}
}

export async function completeInstalled593Original591Execution(local,selectedPrograms,
  {readGit=git,getInput=captureInstalled593Original591Input,getRuntime=assistantPublic591Runtime}={}){
  verifyInstalled593Original591Input(local.nativeInput,await getInput({readGit}));
  verifyAssistantPublic591Runtime(local.runtime,await getRuntime());
  assert.deepEqual(selectedPrograms,local.runtime.selectedPrograms,'Completed native quartet must match its before/after observation');
  const receipt={...local,status:'EXECUTED',executedInThisRun:true,origin:null};
  verifyInstalled593Original591V2PhaseReceipt(receipt,local.current);return receipt;
}

// Each native completion marker is a single complete bounded stdout line.
function nativeMarkerCollector(kind,limit){
  let prefix='',body='',matching=null,marker,invalid=false;
  const start='{"kind":"'+kind+'",';
  return {write(chunk){
    for(const character of String(chunk)){
      if(character==='\n'){
        if(matching===true){
          try{assert(body.length<=limit&&marker===undefined);marker=JSON.parse(body);}
          catch{invalid=true;}
        }
        prefix='';body='';matching=null;continue;
      }
      if(matching===false)continue;
      if(matching===true){if(body.length<limit+1)body+=character;else invalid=true;continue;}
      prefix+=character;
      if(!start.startsWith(prefix)){matching=false;prefix='';}
      else if(prefix===start){matching=true;body=prefix;prefix='';}
    }
  },finish(){
    assert(!invalid&&matching!==true&&marker!==undefined,'Unique complete bounded native program marker required');
    assert.equal(marker.kind,kind);return marker;
  }};
}
export function nativeProgramMarkerCollector(phase='ASSISTANT_PUBLIC591_SUCCESSOR'){
  assert(['ASSISTANT_PUBLIC591_SUCCESSOR','INSTALLED593_ORIGINAL591_SUCCESSOR'].includes(phase));
  const collector=nativeMarkerCollector(PROGRAM_MARKER,8192);
  return {write:collector.write,finish(){
    const marker=collector.finish();assert.equal(marker.phase,phase);
    return verifyAssistantPublic591Programs(marker.programs);
  }};
}
async function executeMarkedNative(env,script,collector){
  const result=await new Promise(resolve=>{
    const child=spawn('/usr/bin/bash',['--noprofile','--norc','-e','-o','pipefail','-c',script],
      {env,stdio:['inherit','pipe','inherit']});let error=null;
    child.stdout.setEncoding('utf8');child.stdout.on('data',chunk=>{process.stdout.write(chunk);collector.write(chunk);});
    child.on('error',value=>{error=value;});child.on('close',(status,signal)=>resolve({status,signal,error}));
  });
  if(result.error||result.signal||result.status!==0){process.exitCode=result.status||1;return null;}
  return collector.finish();
}
async function executeAssistantPublic591Native(env,phase='ASSISTANT_PUBLIC591_SUCCESSOR'){
  try{return await executeMarkedNative(env,ACTIVE_NATIVE_SCRIPT,nativeProgramMarkerCollector(phase));}
  catch{return null;}
}

const SCALAR597_RESULT='SCALAR597_LATER_H0_SUCCESSOR';
const SCALAR597_REPORT_MARKER='NATIVE_POSTGRES_CHECKPOINT_CAS_COMPARISON';
const scalar597ReportTruths=['sqlExecuted','wholeMigrationExecuted','oldFunctionsAndOidsPreserved',
  'allOriginalDefinitionsPreserved','exactCheckpointContract','exactTripContract','schema2Catalog',
  'normalProtectedJsonbRoundtrip','originalDigestsPreserved','trueOld594Fixtures','currentNormalFixtures',
  'old594ModelNotRetagged','wholeMetadataInverse','strictlyLater594ToNextOnly','sqlIsNotOriginAuthentication'];
const scalar597IntermediateTruths=['oldActiveAfterSql','nextRefusedBeforeActivation','pendingBothRefused',
  'nextActiveAfterCompletion','oldRefusedAfterCompletion','activeDocumentsUnchangedBySql',
  'quotaFunctionAndAdmissionUnchanged','quotaServiceRoleWorking'];
export function scalar597NativeReportProjection(report,{migrationVersion,databaseBeforeVersion,selectedPrograms}){
  assert.equal(report?.kind,SCALAR597_REPORT_MARKER);
  assert.equal(report?.sqlExecuted,true);assert.equal(report?.migrationExecuted,true);
  assert.equal(report?.tcpEnabled,false);assert.equal(report?.normalModelPartCount,673);
  const {majorVersion:postgresMajorVersion}=verifyAssistantPublic591Programs(selectedPrograms);
  assert.deepEqual(report.nativeProgramIdentity,selectedPrograms,'Exact executed native PostgreSQL quartet');
  assert.match(migrationVersion,/^\d{14}$/);assert.match(databaseBeforeVersion,/^\d{14}$/);
  assert(migrationVersion>databaseBeforeVersion);
  assert.equal(report.postgresMajorVersion,postgresMajorVersion);
  for(const arm of ['nativeOriginalContinuity','assistantLaterH0','assistantPublic587Successor',
    'assistantPublic588Successor','assistantPublic590Successor','assistantPublic591Successor',
    'installed593Original591Successor'])assert(!Object.hasOwn(report,arm),'Scalar native proof must use the single current arm');
  const proof=report.scalar597LaterH0Successor;
  const observed={kind:SCALAR597_RESULT,sourceMigrationInventory:62,databaseBeforeVersion,
    originalStateRelease:594,migrationVersion,partCount:673,checkpointOidSlots:43,contractBodies:46,
    productionSeedAuthenticated:false};
  for(const key of scalar597ReportTruths)observed[key]=true;
  observed.intermediateRuntime=Object.fromEntries(scalar597IntermediateTruths.map(key=>[key,true]));
  for(const [key,value]of Object.entries(observed))assert.deepEqual(proof?.[key],value,'Scalar native report: '+key);
  return {kind:SCALAR597_REPORT_MARKER,sqlExecuted:true,migrationExecuted:true,tcpEnabled:false,
    normalModelPartCount:673,postgresMajorVersion,nativeProgramIdentity:selectedPrograms,scalar597LaterH0Successor:observed};
}
export function scalar597NativeReportCollector(expected){
  const collector=nativeMarkerCollector(SCALAR597_REPORT_MARKER,65536);
  return {write:collector.write,finish(){return scalar597NativeReportProjection(collector.finish(),expected);}};
}

function scalar597PhaseIdentity(){
  assert.equal(ACTIVE.sourcePhase,SCALAR597_LATER_H0_PHASE);
  return {releaseVersion:ACTIVE.requireRelease(),binding:ACTIVE.requireBinding(),output:ACTIVE.requireOutput(),
    databaseBefore:ACTIVE.databaseBefore};
}
export function verifyScalar597LaterH0PhaseReceipt(native,current){
  const identity=scalar597PhaseIdentity();
  assert.match(current.head,/^[a-f0-9]{40}$/);
  assert(Number.isSafeInteger(current.run)&&current.run>ORIGIN.run);
  assert(Number.isSafeInteger(current.attempt)&&current.attempt>0);
  assert(Number.isSafeInteger(current.pullRequest)&&current.pullRequest>0);
  assert(typeof current.branch==='string'&&current.branch.length>0&&current.branch.length<=255);
  const runtime=verifyAssistantPublic591Runtime(native?.runtime);
  const report=scalar597NativeReportProjection(native.report,{migrationVersion:identity.binding.version,
    databaseBeforeVersion:identity.databaseBefore.version,selectedPrograms:runtime.selectedPrograms});
  assert.deepEqual(native,{schemaVersion:1,kind:SCALAR597_LATER_H0_PHASE_KIND,phase:SCALAR597_RESULT,
    sourcePhase:SCALAR597_LATER_H0_PHASE,...identity,current,commands:SCALAR597_LATER_H0_COMMANDS,
    status:'EXECUTED',executedInThisRun:true,origin:null,eligibleForReuse:false,runtime,report});
  return native;
}

async function executeScalar597LaterH0(){
  const identity=scalar597PhaseIdentity();
  const env={...process.env},head=env.SOURCE_GATE_HEAD_SHA;
  assert.equal(env.GITHUB_EVENT_NAME,'pull_request');assert.equal(env.GITHUB_REPOSITORY,ORIGIN.repository);
  const verifyCheckout=()=>{
    assert.match(head,/^[a-f0-9]{40}$/);
    assert.equal(git(['rev-parse','HEAD^{commit}']).trim(),head);
    assert.equal(git(['status','--porcelain','--untracked-files=no']).trim(),'');
    assert.equal(git(['for-each-ref','refs/replace']).trim(),'');
    assert.equal(git(['rev-parse','--is-shallow-repository']).trim(),'false');
  };
  verifyCheckout();
  const current={run:Number(env.GITHUB_RUN_ID),attempt:Number(env.GITHUB_RUN_ATTEMPT),head,
    pullRequest:Number(env.PULL_REQUEST_NUMBER),branch:env.GITHUB_HEAD_REF};
  const runtime=await assistantPublic591Runtime();
  for(const key of ['GITHUB_TOKEN','SOURCE_GATE_HEAD_SHA','PULL_REQUEST_NUMBER'])delete env[key];
  const report=await executeMarkedNative(env,SCALAR597_LATER_H0_SCRIPT,scalar597NativeReportCollector({
    migrationVersion:identity.binding.version,databaseBeforeVersion:identity.databaseBefore.version,
    selectedPrograms:runtime.selectedPrograms}));
  if(!report)return;
  verifyCheckout();
  verifyAssistantPublic591Runtime(runtime,await assistantPublic591Runtime());
  await record({schemaVersion:1,kind:SCALAR597_LATER_H0_PHASE_KIND,phase:SCALAR597_RESULT,
    sourcePhase:SCALAR597_LATER_H0_PHASE,...identity,current,commands:SCALAR597_LATER_H0_COMMANDS,
    status:'EXECUTED',executedInThisRun:true,origin:null,eligibleForReuse:false,runtime,report});
}


const AFTER597_RESULT='ASSISTANT_AFTER597_SUCCESSOR';
const after597ReportTruths=['sqlExecuted','wholeMigrationExecuted','oldFunctionsAndOidsPreserved',
  'allOriginalDefinitionsPreserved','exactCheckpointContract','exactTripContract','schema2Catalog',
  'normalProtectedJsonbRoundtrip','originalDigestsPreserved','trueOld597Fixtures','currentNormalFixtures',
  'old597ModelNotRetagged','wholeMetadataInverse','strictlyLater597ToNextOnly','sqlIsNotOriginAuthentication',
  'predecessorExecutedInSameHost'];
const after597IntermediateTruths=['old597ActiveAfterSql','nextRefusedBeforeActivation','pendingBothRefused',
  'nextActiveAfterCompletion','old597RefusedAfterCompletion','wholeHistoryAndDocumentsPreserved',
  'quotaFunctionAndAdmissionUnchanged','quotaServiceRoleWorking'];
async function assistantAfter597PhaseIdentity(){
  const output=requireAssistantAfter597Output(); // FIRST: unissued never reads SQL/files/environment.
  const binding=requireAssistantAfter597Binding(),releaseVersion=requireAssistantAfter597Release();
  const before=await readScalar597LaterH0CanonicalSource(),after=await readAssistantAfter597CanonicalSource();
  assert.equal(sha(before.canonicalSource),ASSISTANT_AFTER597_BEFORE.canonicalSha256);
  assert.equal(sha(after.canonicalSource),output.canonicalSha256);
  const shape=source=>{
    const contract=assistantLaterH0Definition(source,'ravradar_ravscore_checkpoint_contract');
    const array=/v_validator_oids oid\[\] := array\[([\s\S]+?)\n  \];/.exec(contract);assert(array);
    return {oidSlots:(array[1].match(/pg_catalog\.to_regprocedure\(/g)??[]).length,
      contractBodies:(contract.match(/\|\| v_[a-z0-9_]+_definition/g)??[]).length+1};
  };
  const old=shape(before.canonicalSource),next=shape(after.canonicalSource);
  assert.equal(next.oidSlots,old.oidSlots+ASSISTANT_AFTER597_ALIASES.length);
  assert.equal(next.contractBodies,old.contractBodies+ASSISTANT_AFTER597_ALIASES.length);
  const migrations=assistantAfter597RequiredMigrations();
  assert.equal(migrations.at(-2).version,ASSISTANT_AFTER597_BEFORE.version);
  assert.equal(migrations.at(-1).version,binding.version);
  return {releaseVersion,binding,output,databaseBefore:ASSISTANT_AFTER597_BEFORE,
    shape:next,migrationInventory:migrations.length};
}
export async function assistantAfter597NativeReportProjection(report,options){
  const identity=await assistantAfter597PhaseIdentity();
  const {selectedPrograms}=options;
  assert.equal(report?.kind,SCALAR597_REPORT_MARKER);
  assert.equal(report.sqlExecuted,true);assert.equal(report.migrationExecuted,true);
  assert.equal(report.tcpEnabled,false);assert.equal(report.normalModelPartCount,673);
  const {majorVersion:postgresMajorVersion}=verifyAssistantPublic591Programs(selectedPrograms);
  assert.deepEqual(report.nativeProgramIdentity,selectedPrograms);
  assert.equal(report.postgresMajorVersion,postgresMajorVersion);
  for(const arm of ['nativeOriginalContinuity','assistantLaterH0','assistantPublic587Successor',
    'assistantPublic588Successor','assistantPublic590Successor','assistantPublic591Successor',
    'installed593Original591Successor','scalar597LaterH0Successor'])assert(!Object.hasOwn(report,arm));
  const observed={kind:AFTER597_RESULT,sourceMigrationInventory:identity.migrationInventory,
    databaseBeforeVersion:identity.databaseBefore.version,originalStateRelease:597,
    migrationVersion:identity.binding.version,partCount:673,checkpointOidSlots:identity.shape.oidSlots,
    contractBodies:identity.shape.contractBodies,productionSeedAuthenticated:false,
    parentCodeHead:FROZEN597_NATIVE_SOURCE.codeHead,parentNativeHead:FROZEN597_NATIVE_SOURCE.nativeHead};
  for(const key of after597ReportTruths)observed[key]=true;
  observed.intermediateRuntime=Object.fromEntries(after597IntermediateTruths.map(key=>[key,true]));
  for(const[key,value]of Object.entries(observed))assert.deepEqual(report.assistantAfter597Successor?.[key],value,'After597 native report: '+key);
  return {kind:SCALAR597_REPORT_MARKER,sqlExecuted:true,migrationExecuted:true,tcpEnabled:false,
    normalModelPartCount:673,postgresMajorVersion,nativeProgramIdentity:selectedPrograms,assistantAfter597Successor:observed};
}
export function assistantAfter597NativeReportCollector(options){
  requireAssistantAfter597Output(); // FIRST before options or evidence ingestion.
  const collector=nativeMarkerCollector(SCALAR597_REPORT_MARKER,65536);
  return {write:collector.write,async finish(){return assistantAfter597NativeReportProjection(collector.finish(),options);}};
}
export async function verifyAssistantAfter597PhaseReceipt(native,current){
  const identity=await assistantAfter597PhaseIdentity();
  assert.match(current.head,/^[a-f0-9]{40}$/);
  assert(Number.isSafeInteger(current.run)&&current.run>ORIGIN.run);
  assert(Number.isSafeInteger(current.attempt)&&current.attempt>0);
  assert(Number.isSafeInteger(current.pullRequest)&&current.pullRequest>0);
  assert(typeof current.branch==='string'&&current.branch.length>0&&current.branch.length<=255);
  const runtime=verifyAssistantPublic591Runtime(native?.runtime);
  const report=await assistantAfter597NativeReportProjection(native.report,{selectedPrograms:runtime.selectedPrograms});
  const {shape,migrationInventory,...issued}=identity;
  assert.deepEqual(native,{schemaVersion:1,kind:ASSISTANT_AFTER597_PHASE_KIND,phase:AFTER597_RESULT,
    sourcePhase:ASSISTANT_AFTER597_PHASE,...issued,current,commands:ASSISTANT_AFTER597_COMMANDS,
    status:'EXECUTED',executedInThisRun:true,origin:null,eligibleForReuse:false,runtime,report});
  return native;
}
export async function executeAssistantAfter597Native(){
  assert.equal(ACTIVE.sourcePhase,ASSISTANT_AFTER597_PHASE);
  const identity=await assistantAfter597PhaseIdentity(); // Before environment/Git/native launch.
  const env={...process.env},head=env.SOURCE_GATE_HEAD_SHA;
  assert.equal(env.GITHUB_EVENT_NAME,'pull_request');assert.equal(env.GITHUB_REPOSITORY,ORIGIN.repository);
  const verifyCheckout=()=>{
    assert.match(head,/^[a-f0-9]{40}$/);
    assert.equal(git(['rev-parse','HEAD^{commit}']).trim(),head);
    assert.equal(git(['status','--porcelain','--untracked-files=no']).trim(),'');
    assert.equal(git(['for-each-ref','refs/replace']).trim(),'');
    assert.equal(git(['rev-parse','--is-shallow-repository']).trim(),'false');
  };
  verifyCheckout();
  const current={run:Number(env.GITHUB_RUN_ID),attempt:Number(env.GITHUB_RUN_ATTEMPT),head,
    pullRequest:Number(env.PULL_REQUEST_NUMBER),branch:env.GITHUB_HEAD_REF};
  const runtime=await assistantPublic591Runtime();
  for(const key of ['GITHUB_TOKEN','SOURCE_GATE_HEAD_SHA','PULL_REQUEST_NUMBER'])delete env[key];
  const report=await executeMarkedNative(env,ASSISTANT_AFTER597_SCRIPT,
    assistantAfter597NativeReportCollector({selectedPrograms:runtime.selectedPrograms}));
  if(!report)return;
  verifyCheckout();verifyAssistantPublic591Runtime(runtime,await assistantPublic591Runtime());
  const {shape,migrationInventory,...issued}=identity;
  await record({schemaVersion:1,kind:ASSISTANT_AFTER597_PHASE_KIND,phase:AFTER597_RESULT,
    sourcePhase:ASSISTANT_AFTER597_PHASE,...issued,current,commands:ASSISTANT_AFTER597_COMMANDS,
    status:'EXECUTED',executedInThisRun:true,origin:null,eligibleForReuse:false,runtime,report});
}

const AFTER598_RESULT='ASSISTANT_AFTER598_SUCCESSOR';
const after598ReportTruths=['sqlExecuted','wholeMigrationExecuted','oldFunctionsAndOidsPreserved',
  'allOriginalDefinitionsPreserved','exactCheckpointContract','exactTripContract','schema2Catalog',
  'normalProtectedJsonbRoundtrip','originalDigestsPreserved','trueOld598Fixtures','currentNormalFixtures',
  'old598ModelNotRetagged','wholeMetadataInverse','strictlyLater598ToNextOnly','sqlIsNotOriginAuthentication',
  'predecessorExecutedInSameHost'];
const after598IntermediateTruths=['old598ActiveAfterSql','nextRefusedBeforeActivation','pendingBothRefused',
  'nextActiveAfterCompletion','old598RefusedAfterCompletion','wholeHistoryAndDocumentsPreserved',
  'quotaFunctionAndAdmissionUnchanged','quotaServiceRoleWorking'];
async function assistantAfter598PhaseIdentity(){
  const output=requireAssistantAfter598Output(); // FIRST: unissued never reads SQL/files/environment.
  assert.equal(ACTIVE.sourcePhase,ASSISTANT_AFTER598_PHASE);
  const binding=requireAssistantAfter598Binding(),releaseVersion=requireAssistantAfter598Release();
  const before=await readAssistantAfter597CanonicalSource(),after=await readAssistantAfter598CanonicalSource();
  assert.equal(sha(before.canonicalSource),ASSISTANT_AFTER598_BEFORE.canonicalSha256);
  assert.equal(sha(after.canonicalSource),output.canonicalSha256);
  const shape=source=>{
    const contract=assistantLaterH0Definition(source,'ravradar_ravscore_checkpoint_contract');
    const array=/v_validator_oids oid\[\] := array\[([\s\S]+?)\n  \];/.exec(contract);assert(array);
    return {oidSlots:(array[1].match(/pg_catalog\.to_regprocedure\(/g)??[]).length,
      contractBodies:(contract.match(/\|\| v_[a-z0-9_]+_definition/g)??[]).length+1};
  };
  const old=shape(before.canonicalSource),next=shape(after.canonicalSource);
  assert.equal(next.oidSlots,old.oidSlots+ASSISTANT_AFTER598_ALIASES.length);
  assert.equal(next.contractBodies,old.contractBodies+ASSISTANT_AFTER598_ALIASES.length);
  const migrations=assistantAfter598RequiredMigrations();
  assert.equal(migrations.at(-2).version,ASSISTANT_AFTER598_BEFORE.version);
  assert.equal(migrations.at(-1).version,binding.version);
  return {releaseVersion,binding,output,databaseBefore:ASSISTANT_AFTER598_BEFORE,
    shape:next,migrationInventory:migrations.length};
}
const AFTER599_RESULT='ASSISTANT_AFTER599_SUCCESSOR';
const after599ReportTruths=['sqlExecuted','wholeMigrationExecuted','oldFunctionsAndOidsPreserved',
  'allOriginalDefinitionsPreserved','exactCheckpointContract','exactTripContract','schema2Catalog',
  'normalProtectedJsonbRoundtrip','originalDigestsPreserved','trueOld599Fixtures','currentNormalFixtures',
  'old599ModelNotRetagged','wholeMetadataInverse','strictlyLater599ToNextOnly','sqlIsNotOriginAuthentication',
  'predecessorExecutedInSameHost'];
const after599IntermediateTruths=['old599ActiveAfterSql','nextRefusedBeforeActivation','pendingBothRefused',
  'nextActiveAfterCompletion','old599RefusedAfterCompletion','wholeHistoryAndDocumentsPreserved',
  'quotaFunctionAndAdmissionUnchanged','quotaServiceRoleWorking'];
async function assistantAfter599PhaseIdentity(){
  const output=requireAssistantAfter599Output(); // FIRST: unissued never reads SQL/files/environment.
  assert.equal(ACTIVE.sourcePhase,ASSISTANT_AFTER599_PHASE);
  const binding=requireAssistantAfter599Binding(),releaseVersion=requireAssistantAfter599Release();
  const before=await readAssistantAfter598CanonicalSource(),after=await readAssistantAfter599CanonicalSource();
  assert.equal(sha(before.canonicalSource),ASSISTANT_AFTER599_BEFORE.canonicalSha256);
  assert.equal(sha(after.canonicalSource),output.canonicalSha256);
  const shape=source=>{
    const contract=assistantLaterH0Definition(source,'ravradar_ravscore_checkpoint_contract');
    const array=/v_validator_oids oid\[\] := array\[([\s\S]+?)\n  \];/.exec(contract);assert(array);
    return {oidSlots:(array[1].match(/pg_catalog\.to_regprocedure\(/g)??[]).length,
      contractBodies:(contract.match(/\|\| v_[a-z0-9_]+_definition/g)??[]).length+1};
  };
  const old=shape(before.canonicalSource),next=shape(after.canonicalSource);
  assert.equal(next.oidSlots,old.oidSlots+ASSISTANT_AFTER599_ALIASES.length);
  assert.equal(next.contractBodies,old.contractBodies+ASSISTANT_AFTER599_ALIASES.length);
  const migrations=assistantAfter599RequiredMigrations();
  assert.equal(migrations.at(-3).version,ASSISTANT_AFTER599_BEFORE.version);
  assert.equal(migrations.at(-2).version,'20261116181500');
  assert.equal(migrations.at(-1).version,binding.version);
  const nativeStart=migrations.findIndex(row=>row.version==='20261010130000');assert.equal(nativeStart,44);
  const sourceInventory=await Promise.all(migrations.map(async row=>({version:row.version,filename:row.filename,
    sha256:sha(await fs.readFile(new URL('../supabase/migrations/'+row.filename,import.meta.url)))})));
  const ledgerFixture={kind:'SYNTHETIC_PRIOR_LEDGER_AND_EXECUTED_SUFFIX_V1',
    priorFixtureVersions:migrations.slice(0,nativeStart+1).map(row=>row.version),
    wholeExecutedMigrationVersions:migrations.slice(nativeStart+1).map(row=>row.version),
    sourceInventorySha256:sha(JSON.stringify(sourceInventory))};
  assert.equal(ledgerFixture.priorFixtureVersions.length,45);assert.equal(ledgerFixture.wholeExecutedMigrationVersions.length,21);
  return {releaseVersion,binding,output,ledgerFixture,databaseBefore:{...ASSISTANT_AFTER599_BEFORE,version:ASSISTANT_AFTER599_DATABASE_LEDGER.maximumVersion},
    shape:next,migrationInventory:migrations.length};
}

// App evidence is separate from the unchanged64-row numerical cutover report.
// No caller option can turn a current76-row source into historical75-row evidence.
async function accountNativeReceiptSourceIdentity(){
  const files=(await fs.readdir(new URL('../supabase/migrations/',import.meta.url))).filter(file=>file.endsWith('.sql'));
  if(!files.includes('20261122200000_account_native_activity_receipt_off.sql'))return null;
  assert.equal(ACTIVE.sourcePhase,ASSISTANT_AFTER599_PHASE,'Receipt source is current80 only');
  const {currentNativeActivityReceiptSourceContext}=await import('./lib/account-native-activity-receipt-source.mjs');
  const identity=currentNativeActivityReceiptSourceContext();assert(identity);return identity;
}
function projectAccountNativeReceiptNative(value,identity){
  if(identity===null){assert.equal(value,undefined,'Original79 cannot claim current80 receipt SQL');return null;}
  const expected={kind:'ACCOUNT_NATIVE_ACTIVITY_RECEIPT_NATIVE_SQL_CASES',sqlExecuted:true,...identity,
    cases:9,appendSha256:identity.migrationSQLSha256,actualPostgres:true,syntheticSqlHost:true,realGoTrue:false,realAuthResponse:false,
    exclusiveHookOnly:true,browserRpcCannotWitness:true,outerTransactionRollback:true,oneReceipt:true,
    policyActivated:false,notices:false,deletion:false,userDataReported:false};
  assert.deepEqual(value,expected,'Current80 requires its actually executed nine-case append, never original79 evidence');
  return Object.freeze(expected);
}
export async function assertCurrentAccountNativeReceiptNativeReport(report){
  return projectAccountNativeReceiptNative(report.accountNativeReceipt,await accountNativeReceiptSourceIdentity());
}

async function accountErasureSourceIdentity(){
  const directory=new URL('../supabase/migrations/',import.meta.url);
  const filename='20261116181500_account_erasure_outbox_off.sql';
  const files=(await fs.readdir(directory)).filter(file=>file.endsWith('.sql'));
  const descriptor=accountErasureSchema.ACCOUNT_ERASURE_APP_MIGRATION;
  if(descriptor===undefined){
    assert.equal(files.length,75,'Only the genuine historical599 source has no OFF descriptor');
    assert(!files.includes(filename),'OFF source without its fixed descriptor is unknown');
    return null;
  }
  assert.deepEqual(descriptor,{version:'20261116181500',id:'20261116181500_account_erasure_outbox_off',filename});
  const notice=accountErasureSchema.ACCOUNT_INACTIVITY_OFF_APP_MIGRATIONS;
  if(notice!==undefined)assert.equal(ACTIVE.sourcePhase,ASSISTANT_AFTER599_PHASE,'Current notice source cannot impersonate a historical family');
  const expectedCount=ACTIVE.sourcePhase===ASSISTANT_AFTER599_PHASE?(notice===undefined?77:79):76;
  const receipt=await accountNativeReceiptSourceIdentity();
  assert.equal(files.length,expectedCount+Number(receipt!==null),'Every original SQL and the active append must physically exist');
  assert(files.includes(filename),'The current OFF source must physically exist');
  const file=new URL(filename,directory),stat=await fs.lstat(file);
  assert(stat.isFile()&&!stat.isSymbolicLink()&&stat.size>0&&stat.size<=65536,'OFF source must be bounded regular SQL');
  const source=await fs.readFile(file);assert.equal(source.length,stat.size);
  return {migrationVersion:descriptor.version,migrationSQLSha256:sha(source),sourceSqlFileCount:expectedCount};
}

async function accountInactivitySourceIdentity(){
  if(accountErasureSchema.ACCOUNT_INACTIVITY_OFF_APP_MIGRATIONS===undefined)return null;
  assert.equal(ACTIVE.sourcePhase,ASSISTANT_AFTER599_PHASE);
  const source=accountErasureSchema.readAccountInactivitySource();
  const files=(await fs.readdir(new URL('../supabase/migrations/',import.meta.url))).filter(file=>file.endsWith('.sql'));
  const receipt=await accountNativeReceiptSourceIdentity();
  assert.equal(files.length,79+Number(receipt!==null),'Original OFF scope79 plus only the current receipt append');
  assert(!files.includes('20261116230000_account_inactivity_notice_off.sql')&&!files.includes('20261117030000_account_native_activity_capture_off.sql'),
    'Private donor names must not become historical-prefix migrations');
  return {sourceSqlFileCount:79,migrations:source.migrations.map(({sql,id,...row})=>row)};
}
function projectAccountInactivityNative(value,identity,postgresMajor){
  if(identity===null){assert.equal(value,undefined,'Historical source cannot claim the new OFF pair');return null;}
  const checkReference=accountErasureSchema.verifyAccountInactivityCheckReference(value?.checkReference,{postgresMajor});
  const expected={kind:'ACCOUNT_INACTIVITY_OFF_NATIVE_SQL_CASES',sqlExecuted:true,...identity,cases:17,
    checkReference,catalogVerified:true,captureSqlExecuted:true,hookConfigured:false,syntheticSqlHost:true,
    actualPostgres:true,coverageSynthetic:true,providerDeliverySynthetic:true,positiveRpcCancellation:true,
    defaultOff:true,automaticDeletion:false,realAuth:false,realMail:false};
  assert.deepEqual(value,expected,'The actual OFF pair needs its separate exact SQL/CHECK result, never the old77 result');
  return Object.freeze(expected);
}
export async function assertCurrentAccountInactivityNativeReport(report){
  return projectAccountInactivityNative(report.accountInactivity,await accountInactivitySourceIdentity(),report.postgresMajorVersion);
}

function projectAccountErasureNative(value,identity,postgresMajor){
  assert(identity,'Historical75-row evidence cannot claim an OFF installation');
  const checkReference=accountErasureSchema.verifyAccountErasureCheckReference(value?.checkReference,{postgresMajor});
  const expected={kind:'ACCOUNT_ERASURE_APP_NATIVE_SQL_CASES',sqlExecuted:true,...identity,
    passed:true,cases:49,actualPostgres:true,syntheticSqlHost:true,realGoTrue:false,checkReference,checkExpressionDriftRefused:true,
    serviceEvidenceSynthetic:true,failedTransactionRolledBack:true,aclMutationRefused:true,ownerPendingDiscoveryAndPagination:true,
    authAttemptReplayAndGeneration:true,initialAbsenceWithoutDeleteClaim:true,
    authUuidFenceSqlOnly:true,storageDefaultDenyAndOwnership:true,postPgStorageClaimHeld:true,
    observationsAndBootstrapFence:true,readCommittedFreshness:true,repeatableReadNoLateCommit:true,
    serializableNoLateCommit:true,actorNonKeyPrivilegeLock:true,authDeletion:false,d1Ack:false,completionAuthority:false};
  assert.deepEqual(value,expected,'Whole typed OFF native result must match actual current SQL and every fixed truth');
  return Object.freeze(expected);
}
export async function assertCurrentAccountErasureNativeReport(report){
  const identity=await accountErasureSourceIdentity();
  if(identity===null){assert(!Object.hasOwn(report,'accountErasure'),'Historical source cannot claim current OFF');return null;}
  return projectAccountErasureNative(report.accountErasure,identity,report.postgresMajorVersion);
}
export async function assistantAfter598NativeReportProjection(report,options){
  const identity=await assistantAfter598PhaseIdentity();
  const {selectedPrograms}=options;
  assert.equal(report?.kind,SCALAR597_REPORT_MARKER);
  assert.equal(report.sqlExecuted,true);assert.equal(report.migrationExecuted,true);
  assert.equal(report.tcpEnabled,false);assert.equal(report.normalModelPartCount,673);
  const {majorVersion:postgresMajorVersion}=verifyAssistantPublic591Programs(selectedPrograms);
  assert.deepEqual(report.nativeProgramIdentity,selectedPrograms);
  assert.equal(report.postgresMajorVersion,postgresMajorVersion);
  for(const arm of ['nativeOriginalContinuity','assistantLaterH0','assistantPublic587Successor',
    'assistantPublic588Successor','assistantPublic590Successor','assistantPublic591Successor',
    'installed593Original591Successor','scalar597LaterH0Successor','assistantAfter597Successor'])assert(!Object.hasOwn(report,arm));
  const observed={kind:AFTER598_RESULT,sourceMigrationInventory:identity.migrationInventory,
    databaseBeforeVersion:identity.databaseBefore.version,originalStateRelease:598,
    migrationVersion:identity.binding.version,partCount:673,checkpointOidSlots:identity.shape.oidSlots,
    contractBodies:identity.shape.contractBodies,productionSeedAuthenticated:false,
    parentCodeHead:FROZEN598_NATIVE_SOURCE.codeHead,predecessorSetupMigrationCount:9};
  for(const key of after598ReportTruths)observed[key]=true;
  observed.intermediateRuntime=Object.fromEntries(after598IntermediateTruths.map(key=>[key,true]));
  for(const[key,value]of Object.entries(observed))assert.deepEqual(report.assistantAfter598Successor?.[key],value,'After598 native report: '+key);
  const app=Object.hasOwn(report,'accountErasure')
    ?projectAccountErasureNative(report.accountErasure,await accountErasureSourceIdentity(),postgresMajorVersion):null;
  return {kind:SCALAR597_REPORT_MARKER,sqlExecuted:true,migrationExecuted:true,tcpEnabled:false,
    normalModelPartCount:673,postgresMajorVersion,nativeProgramIdentity:selectedPrograms,assistantAfter598Successor:observed,
    ...(app===null?{}:{accountErasure:app})};
}
export async function assistantAfter599NativeReportProjection(report,options){
  const identity=await assistantAfter599PhaseIdentity();
  const {selectedPrograms}=options;
  assert.equal(report?.kind,SCALAR597_REPORT_MARKER);
  assert.equal(report.sqlExecuted,true);assert.equal(report.migrationExecuted,true);
  assert.equal(report.tcpEnabled,false);assert.equal(report.normalModelPartCount,673);
  const {majorVersion:postgresMajorVersion}=verifyAssistantPublic591Programs(selectedPrograms);
  assert.deepEqual(report.nativeProgramIdentity,selectedPrograms);
  assert.equal(report.postgresMajorVersion,postgresMajorVersion);
  for(const arm of ['nativeOriginalContinuity','assistantLaterH0','assistantPublic587Successor',
    'assistantPublic588Successor','assistantPublic590Successor','assistantPublic591Successor',
    'installed593Original591Successor','scalar597LaterH0Successor','assistantAfter597Successor','assistantAfter598Successor'])assert(!Object.hasOwn(report,arm));
  const observed={kind:AFTER599_RESULT,sourceMigrationInventory:identity.migrationInventory,
    databaseBeforeVersion:identity.databaseBefore.version,originalStateRelease:599,
    migrationVersion:identity.binding.version,partCount:673,checkpointOidSlots:identity.shape.oidSlots,
    contractBodies:identity.shape.contractBodies,productionSeedAuthenticated:false,
    parentCodeHead:FROZEN599_NATIVE_SOURCE.codeHead,predecessorSetupMigrationCount:11,
    app600InstalledInCheckpointDatabase:true,app600CatalogPreserved:true,beforeGuardCases:14,
    allHistoricalMigrationsExecuted:false,productionInstalledHistoryEvidence:false,ledgerFixture:identity.ledgerFixture};
  for(const key of after599ReportTruths)observed[key]=true;
  observed.intermediateRuntime=Object.fromEntries(after599IntermediateTruths.map(key=>[key,true]));
  for(const[key,value]of Object.entries(observed))assert.deepEqual(report.assistantAfter599Successor?.[key],value,'After599 native report: '+key);
  assert(Object.hasOwn(report,'accountErasure'),'After599 requires actual current77-file app evidence');
  const app=projectAccountErasureNative(report.accountErasure,await accountErasureSourceIdentity(),postgresMajorVersion);
  const inactivity=projectAccountInactivityNative(report.accountInactivity,await accountInactivitySourceIdentity(),postgresMajorVersion);
  const receipt=projectAccountNativeReceiptNative(report.accountNativeReceipt,await accountNativeReceiptSourceIdentity());
  return {kind:SCALAR597_REPORT_MARKER,sqlExecuted:true,migrationExecuted:true,tcpEnabled:false,
    normalModelPartCount:673,postgresMajorVersion,nativeProgramIdentity:selectedPrograms,assistantAfter599Successor:observed,
    accountErasure:app,...(inactivity===null?{}:{accountInactivity:inactivity}),...(receipt===null?{}:{accountNativeReceipt:receipt})};
}
export function assistantAfter598NativeReportCollector(options){
  requireAssistantAfter598Output(); // FIRST before options or evidence ingestion.
  const collector=nativeMarkerCollector(SCALAR597_REPORT_MARKER,65536);
  return {write:collector.write,async finish(){return assistantAfter598NativeReportProjection(collector.finish(),options);}};
}
export function assistantAfter599NativeReportCollector(options){
  requireAssistantAfter599Output(); // FIRST before options or evidence ingestion.
  const collector=nativeMarkerCollector(SCALAR597_REPORT_MARKER,65536);
  return {write:collector.write,async finish(){return assistantAfter599NativeReportProjection(collector.finish(),options);}};
}
export async function verifyAssistantAfter598PhaseReceipt(native,current){
  const identity=await assistantAfter598PhaseIdentity();
  assert.match(current.head,/^[a-f0-9]{40}$/);
  assert(Number.isSafeInteger(current.run)&&current.run>ORIGIN.run);
  assert(Number.isSafeInteger(current.attempt)&&current.attempt>0);
  assert(Number.isSafeInteger(current.pullRequest)&&current.pullRequest>0);
  assert(typeof current.branch==='string'&&current.branch.length>0&&current.branch.length<=255);
  const runtime=verifyAssistantPublic591Runtime(native?.runtime);
  const report=await assistantAfter598NativeReportProjection(native.report,{selectedPrograms:runtime.selectedPrograms});
  const {shape,migrationInventory,...issued}=identity;
  assert.deepEqual(native,{schemaVersion:1,kind:ASSISTANT_AFTER598_PHASE_KIND,phase:AFTER598_RESULT,
    sourcePhase:ASSISTANT_AFTER598_PHASE,...issued,current,commands:ASSISTANT_AFTER598_COMMANDS,
    status:'EXECUTED',executedInThisRun:true,origin:null,eligibleForReuse:false,runtime,report});
  return native;
}
// The normal old EXECUTED-V1 receipt stays unchanged. This separately typed
// decision qualifies an authentic original phase; it never claims new SQL.
const after599GitBatch = Symbol('after599GitBatch');
const after599MaxBlobBytes = 4 * 1024 * 1024;
const after599MaxInputBytes = 64 * 1024 * 1024;
function after599BoundedGit(readGit, deadline) {
  const remaining = () => {
    const value = Math.floor(deadline - performance.now());
    assert(value > 0, 'AFTER599_PG_REUSE_TIME_BOUND');
    return value;
  };
  const env = {...process.env, GIT_NO_LAZY_FETCH:'1', GIT_NO_REPLACE_OBJECTS:'1', GIT_TERMINAL_PROMPT:'0'};
  const read = (args, input) => {
    const time = remaining();
    const value = readGit === git ? execFileSync('git', args, {encoding:'utf8', input, maxBuffer:after599MaxInputBytes,
      stdio:['pipe','pipe','pipe'], timeout:Math.min(10000, time), env}) : readGit(args,input);
    remaining();
    return value;
  };
  if (readGit === git || readGit[after599GitBatch]) {
    read[after599GitBatch] = (args, input, callerBudget = 10000) => {
      const timeout = Math.min(callerBudget, remaining());
      const output = readGit === git ? execFileSync('git', args, {input, timeout, env,
        maxBuffer:after599MaxInputBytes + 65536}) : readGit[after599GitBatch](args, input, timeout);
      remaining();
      return output;
    };
  }
  return read;
}

function loadAfter599GitBlobs(readBatch, oids, objects) {
  const missing = [...new Set(oids)].filter(oid => !objects.has(oid));
  if (!missing.length) return;
  assert(missing.length + objects.size <= 512 && missing.every(oid => /^[a-f0-9]{40}$/.test(oid)));
  const request = Buffer.from(missing.join('\n') + '\n', 'ascii');
  const inventory = readBatch(['cat-file', '--batch-check'], request).toString('ascii').trimEnd().split('\n');
  assert.equal(inventory.length, missing.length);
  let selectedBytes = 0;
  const sizes = inventory.map((line, index) => {
    const match = /^([a-f0-9]{40}) blob ([0-9]+)$/.exec(line);
    assert(match && match[1] === missing[index]);
    const size = Number(match[2]);
    assert(Number.isSafeInteger(size) && size >= 0 && size <= after599MaxBlobBytes);
    selectedBytes += size;
    return size;
  });
  for (const raw of objects.values()) selectedBytes += raw.length;
  assert(selectedBytes <= after599MaxInputBytes);
  const output = readBatch(['cat-file', '--batch'], request);
  let offset = 0;
  for (const [index, oid] of missing.entries()) {
    const headerEnd = output.indexOf(10, offset);
    assert(headerEnd > offset);
    const size = sizes[index];
    assert.equal(output.toString('ascii', offset, headerEnd), oid + ' blob ' + size);
    const start = headerEnd + 1;
    const end = start + size;
    assert(end < output.length && output[end] === 10);
    const raw = output.subarray(start, end);
    assert.equal(crypto.createHash('sha1').update('blob ' + size + '\0').update(raw).digest('hex'), oid);
    objects.set(oid, raw);
    offset = end + 1;
  }
  assert.equal(offset, output.length);
}
export async function captureAssistantAfter599PgInput(options){
  requireAssistantAfter599Output(); // FIRST, including before option getters.
  assert(arguments.length<=1);
  return captureAssistantNativePgInput(options,false);
}

// This measures the current source inputs. It grants no phase or reuse authority.
export async function captureAssistantAfter601PgInput(options){
  assert.equal(ACTIVE,INACTIVE_ASSISTANT_AFTER601_SUCCESSOR);
  ACTIVE.requireOutput();
  assert(arguments.length<=1);
  return captureAssistantNativePgInput(options,true);
}

const checkpointScalarWalkPath='supabase/migrations/'+CHECKPOINT_SCALAR_WALK_MIGRATION.filename;
const tripErasureMigrationPath='supabase/migrations/'+TRIP_ERASURE_RECOVERY_MIGRATION;
const tripErasureFixturePath='scripts/lib/trip-erasure-recovery-native-fixture.mjs';
function hasNativeMigration(readGit,head,file){
  assert.match(head,/^[a-f0-9]{40}$/);
  const output=readGit(['ls-tree',head,'--',file]);
  assert(typeof output==='string'||Buffer.isBuffer(output));
  return output.toString('utf8').trim()!=='';
}
const hasCheckpointScalarWalk=(readGit,head)=>hasNativeMigration(readGit,head,checkpointScalarWalkPath);

async function captureAssistantNativePgInput(options,after601){
  options??={};assert(options&&Object.getPrototypeOf(options)===Object.prototype);
  assert(Object.keys(options).every(key=>['ref','readGit','root','physical'].includes(key)));
  const {ref='HEAD',root=process.cwd(),physical=true}=options;
  const readGit=after599BoundedGit(options.readGit??git,performance.now()+60000);
  const tree=parseTree(readGit(['ls-tree','-rz','--full-tree',ref])),index=new Map(tree.map(row=>[row[0],row]));
  const sql=tree.filter(row=>row[0].startsWith('supabase/migrations/')&&row[0].endsWith('.sql')).map(row=>row[0]).sort();
  assert(sql.length>0&&sql.length<=512);
  if(physical)assert.deepEqual((await fs.readdir(path.join(root,'supabase/migrations'))).filter(file=>file.endsWith('.sql')).sort(),
    sql.map(file=>path.posix.basename(file)));
  const rows=new Map(), objects=new Map();let bytes=0;
  const batch=readGit[after599GitBatch];
  const load=files=>{
    if (!batch) return;
    const selected=files.map(file=>index.get(file)).filter(Boolean);
    assert(selected.every(row=>['100644','100755'].includes(row[1])&&row[2]==='blob'));
    loadAfter599GitBlobs(batch,selected.map(row=>row[3]),objects);
  };
  const content=(file,row)=>{
    if (!batch) return Buffer.from(readGit(['cat-file','blob',ref+':'+file]));
    const raw=objects.get(row[3]);
    assert(raw,'Missing selected native input blob');
    return raw;
  };
  const read=async file=>{
    assert(typeof file==='string'&&file.length<=512&&!file.startsWith('/')&&!file.split('/').includes('..'));
    if(rows.has(file))return rows.get(file);
    const row=index.get(file);
    if(!row){assert(!physical,'Required current native input is absent: '+file);const absent={file,present:false};rows.set(file,absent);return absent;}
    assert(['100644','100755'].includes(row[1])&&row[2]==='blob');
    const raw=content(file,row);bytes+=raw.length;
    assert(raw.length<=after599MaxBlobBytes&&bytes<=after599MaxInputBytes&&rows.size<512);
    if(physical){const absolute=path.resolve(root,file),stat=await fs.lstat(absolute);
      assert(stat.isFile()&&!stat.isSymbolicLink());assert.equal(stat.size,raw.length);assert.equal(await fs.realpath(absolute),absolute);
      assert.deepEqual(await fs.readFile(absolute),raw,'Physical native input differs from Git');}
    const value={file,mode:row[1],bytes:raw.length,sha256:sha(raw)};rows.set(file,value);return value;
  };
  const profileFile='scripts/lib/source-impact-domain-inputs-598.json';
  load([profileFile]);await read(profileFile);
  const profile=JSON.parse(content(profileFile,index.get(profileFile)).toString('utf8'));
  assert.equal(profile.id,'REVIEWED_598_DOMAIN_INPUTS_C101_I100_T12');assert.equal(profile.postgresModules.length,69);
  const receiptSql='supabase/migrations/20261122200000_account_native_activity_receipt_off.sql';
  const receiptSource='scripts/lib/account-native-activity-receipt-source.mjs';
  const receiptPresent=index.has(receiptSql);
  assert.equal(index.has(receiptSource),receiptPresent,'Incomplete current80 source dependency');
  const tripErasureRecovery=after601&&index.has(tripErasureMigrationPath);
  const tripErasureFixture=after601&&index.has(tripErasureFixturePath);
  if(after601){
    const scalarWalk=sql.includes(checkpointScalarWalkPath);
    assert(!tripErasureRecovery||(scalarWalk&&tripErasureFixture),'Trip erasure recovery requires its fixture and current82 predecessor');
    const expectedSqlFiles=(scalarWalk?82:81)+Number(tripErasureRecovery);
    assert(receiptPresent&&sql.length===expectedSqlFiles,'After601 requires the complete current'+expectedSqlFiles+' source');
    assert(sql.includes('supabase/migrations/'+INACTIVE_ASSISTANT_AFTER601_SUCCESSOR.migration().filename),
      'After601 migration is missing');
    if(scalarWalk){
      load([checkpointScalarWalkPath]);
      await read(checkpointScalarWalkPath);
      const bytes=content(checkpointScalarWalkPath,index.get(checkpointScalarWalkPath));
      const source=new TextDecoder('utf8',{fatal:true}).decode(bytes).replaceAll('\r\n','\n');
      assert.equal(sha(source),CHECKPOINT_SCALAR_WALK_MIGRATION.sha256,'Checkpoint scalar-walk SQL input changed');
    }
  }else if(receiptPresent)assert.equal(sql.length,80,'Receipt input requires the complete current80 source');
  const modules=new Set([...profile.postgresModules,'scripts/verify-account-erasure-schema.mjs','scripts/lib/account-erasure-outbox-native-fixture.mjs',
    ...(receiptPresent?[receiptSource]:[]),...(tripErasureFixture?[tripErasureFixturePath]:[])]);
  const setup=profile.setupInputs.filter(file=>file!==WORKFLOW&&file!=='package.json');
  const selected=new Set([...modules,...profile.postgresData,...setup,...profile.continuation.files,profile.continuation.file,...sql]);
  if(tripErasureRecovery)selected.add('supabase/schema.sql');
  load(Object.values(profile.models).map(definition=>definition.file));
  for(const definition of Object.values(profile.models)){
    await read(definition.file);selected.add(definition.file);
    const source=content(definition.file,index.get(definition.file)).toString('utf8');
    const escaped=definition.manifestName.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
    const match=new RegExp('export const '+escaped+' = Object\\.freeze\\(([\\s\\S]*)\\);\\n$').exec(source);assert(match);
    const manifest=JSON.parse(match[1]);assert.equal(manifest.schemaVersion,definition.schemaVersion);
    assert.equal(manifest.normalizationId,definition.normalizationId);assert(Array.isArray(manifest.files)&&manifest.files.length<=512);
    for(const row of manifest.files){assert(typeof row[definition.rowKey]==='string');selected.add(row[definition.rowKey]);}
  }
  load([...selected]);
  if(after601){
    // Fixed native modules and both model manifests already own the current
    // imports. A new literal dependency must be admitted before reuse.
    for(const file of modules){
      assert(index.has(file),'Missing after601 native module: '+file);
      const raw=content(file,index.get(file));
      const {imports}=scanAllSourceDependencies(new TextDecoder('utf8',{fatal:true}).decode(raw));
      for(const {specifier} of imports){
        if(specifier===null||specifier.startsWith('node:'))continue;
        assert(specifier.startsWith('./')||specifier.startsWith('../'),'Unqualified after601 native package import');
        const dependency=path.posix.join(path.posix.dirname(file),specifier.split(/[?#]/,1)[0]);
        assert(selected.has(dependency)&&index.has(dependency),'Unqualified after601 native import: '+dependency);
      }
    }
  }
  for(const file of [...selected].sort())await read(file);
  const scopePaths=new Set(['package.json']);
  const scopedModules=after601?[...selected].filter(file=>/\.[cm]?js$/.test(file)):modules;
  for(const file of scopedModules)for(let directory=path.posix.dirname(file);directory!=='.';directory=path.posix.dirname(directory))scopePaths.add(directory+'/package.json');
  const scopes=[];
  for(const file of [...scopePaths].sort()){
    if(!index.has(file)){
      if(physical){let stat=null;try{stat=await fs.lstat(path.resolve(root,file));}catch(error){if(error.code!=='ENOENT')throw error;}assert.equal(stat,null,'Untracked package scope changes native resolution');}
      scopes.push({file,present:false});continue;
    }
    const row=index.get(file);assert(['100644','100755'].includes(row[1])&&row[2]==='blob');
    const raw=Buffer.from(readGit(['cat-file','blob',ref+':'+file]));
    if(physical){const absolute=path.resolve(root,file),stat=await fs.lstat(absolute);
      assert(stat.isFile()&&!stat.isSymbolicLink());assert.equal(await fs.realpath(absolute),absolute);
      assert.deepEqual(await fs.readFile(absolute),raw);}
    const value=JSON.parse(raw);assert(value&&typeof value==='object'&&!Array.isArray(value));
    // Preserve name/main and all explicit resolver maps; release/script metadata
    // alone is not an execution input and is still reviewed by fresh source CI.
    scopes.push({file,present:true,mode:row[1],type:value.type??null,name:value.name??null,main:value.main??null,imports:value.imports??null,exports:value.exports??null});
  }
  const anchors=[...profile.frozenGitAnchors,{head:FROZEN599_NATIVE_SOURCE.codeHead,tree:FROZEN599_NATIVE_SOURCE.codeTree}];
  if(after601)anchors.push({head:SOURCE601_ORIGINAL_DATA_PROFILE.head,tree:SOURCE601_ORIGINAL_DATA_PROFILE.tree});
  const frozenGitTrees=[...new Map(anchors.map(row=>[row.head,row])).values()].sort((a,b)=>a.head.localeCompare(b.head));
  for(const row of frozenGitTrees)assert.equal(String(readGit(['rev-parse',row.head+'^{tree}'])).trim(),row.tree);
  const files=[...rows.values()].sort((a,b)=>a.file.localeCompare(b.file,'en'));
  return {schemaVersion:1,kind:after601?'AFTER601_ACTUAL_PG_INPUT_V1':'AFTER599_ACTUAL_PG_INPUT_V1',
    files:files.length,sqlFiles:sql.length,
    complete:files.every(row=>row.present!==false),inputSha256:sha(JSON.stringify(files)),packageScopes:scopes,frozenGitTrees,
    ...(tripErasureRecovery?{tripErasureRecoveryMigrationSha256:rows.get(tripErasureMigrationPath).sha256}:{})};
}
export function verifyAssistantAfter599PgInput(value,prior=value){
  requireAssistantAfter599Output();
  assert.deepEqual(value,prior,'Actual SQL/native/model/frozen inputs changed');
  assert.deepEqual(Object.keys(value).sort(),['schemaVersion','kind','files','sqlFiles','complete','inputSha256','packageScopes','frozenGitTrees'].sort());
  assert.equal(value.schemaVersion,1);assert.equal(value.kind,'AFTER599_ACTUAL_PG_INPUT_V1');assert.equal(value.complete,true);
  assert(Number.isSafeInteger(value.files)&&value.files>0&&value.files<=512);
  assert(Number.isSafeInteger(value.sqlFiles)&&value.sqlFiles>0&&value.sqlFiles<=512);assert.match(value.inputSha256,hashPattern);
  assert(Array.isArray(value.packageScopes)&&value.packageScopes.length>0&&value.packageScopes.length<=128);
  assert(Array.isArray(value.frozenGitTrees)&&value.frozenGitTrees.length>0&&value.frozenGitTrees.length<=64);
  return value;
}
export async function verifyAssistantAfter599ReusePhaseReceipt(native,current,options){
  const identity=await assistantAfter599PhaseIdentity(); // FIRST before receipt/options.
  options??={};assert(options&&Object.getPrototypeOf(options)===Object.prototype);
  assert(Object.keys(options).every(key=>key==='readGit'));const readGit=options.readGit??git;
  assert.equal(native?.kind,ASSISTANT_AFTER599_REUSE_KIND);assert.equal(native.schemaVersion,2);
  assert.match(current.head,/^[a-f0-9]{40}$/);assert(Number.isSafeInteger(current.run)&&current.run>ORIGIN.run);
  assert.equal(current.attempt,1);assert(Number.isSafeInteger(current.pullRequest)&&current.pullRequest>0);
  assert(typeof current.branch==='string'&&current.branch.length>0&&current.branch.length<=255);
  const runtime=verifyAssistantPublic591Runtime(native?.runtime);
  const report=await assistantAfter599NativeReportProjection(native.report,{selectedPrograms:runtime.selectedPrograms});
  const input=verifyAssistantAfter599PgInput(native.nativeInput);
  verifyAssistantAfter599PgInput(input,await captureAssistantAfter599PgInput({ref:current.head,readGit,physical:current.head===String(readGit(['rev-parse','HEAD'])).trim()}));
  const origin=native.origin;assert(Number.isSafeInteger(origin?.run)&&origin.run>ORIGIN.run&&origin.run<current.run);
  assert.equal(origin.attempt,1);assert(Number.isSafeInteger(origin.job)&&origin.job>0);assert.match(origin.head,/^[a-f0-9]{40}$/);
  assert(Number.isSafeInteger(origin.artifactId)&&origin.artifactId>0);assert.match(origin.artifactDigest,/^sha256:[a-f0-9]{64}$/);
  assert.match(origin.sourceTreeSha256,/^sha256:[a-f0-9]{64}$/);
  const {shape,migrationInventory,ledgerFixture,...issued}=identity;
  assert.deepEqual(native,{schemaVersion:2,kind:ASSISTANT_AFTER599_REUSE_KIND,phase:AFTER599_RESULT,sourcePhase:ASSISTANT_AFTER599_PHASE,
    ...issued,current,commands:ASSISTANT_AFTER599_COMMANDS,status:'REUSED',executedInThisRun:false,
    origin,eligibleForReuse:false,nativeInput:input,runtime,report});return native;
}

export async function verifyAssistantAfter599PhaseReceipt(native,current,options){
  requireAssistantAfter599Output();
  if(native?.kind===ASSISTANT_AFTER599_REUSE_KIND)return verifyAssistantAfter599ReusePhaseReceipt(native,current,options);
  const identity=await assistantAfter599PhaseIdentity();
  assert.match(current.head,/^[a-f0-9]{40}$/);
  assert(Number.isSafeInteger(current.run)&&current.run>ORIGIN.run);
  assert(Number.isSafeInteger(current.attempt)&&current.attempt>0);
  assert(Number.isSafeInteger(current.pullRequest)&&current.pullRequest>0);
  assert(typeof current.branch==='string'&&current.branch.length>0&&current.branch.length<=255);
  const runtime=verifyAssistantPublic591Runtime(native?.runtime);
  const report=await assistantAfter599NativeReportProjection(native.report,{selectedPrograms:runtime.selectedPrograms});
  const {shape,migrationInventory,ledgerFixture,...issued}=identity;
  assert.deepEqual(native,{schemaVersion:1,kind:ASSISTANT_AFTER599_PHASE_KIND,phase:AFTER599_RESULT,
    sourcePhase:ASSISTANT_AFTER599_PHASE,...issued,current,commands:ASSISTANT_AFTER599_COMMANDS,
    status:'EXECUTED',executedInThisRun:true,origin:null,eligibleForReuse:false,runtime,report});
  return native;
}
export async function executeAssistantAfter598Native(){
  const identity=await assistantAfter598PhaseIdentity(); // Before environment/Git/native launch.
  const appSourceBefore=await accountErasureSourceIdentity();
  const env={...process.env},head=env.SOURCE_GATE_HEAD_SHA;
  assert.equal(env.GITHUB_EVENT_NAME,'pull_request');assert.equal(env.GITHUB_REPOSITORY,ORIGIN.repository);
  const verifyCheckout=()=>{
    assert.match(head,/^[a-f0-9]{40}$/);
    assert.equal(git(['rev-parse','HEAD^{commit}']).trim(),head);
    assert.equal(git(['status','--porcelain','--untracked-files=no']).trim(),'');
    assert.equal(git(['for-each-ref','refs/replace']).trim(),'');
    assert.equal(git(['rev-parse','--is-shallow-repository']).trim(),'false');
  };
  verifyCheckout();
  const current={run:Number(env.GITHUB_RUN_ID),attempt:Number(env.GITHUB_RUN_ATTEMPT),head,
    pullRequest:Number(env.PULL_REQUEST_NUMBER),branch:env.GITHUB_HEAD_REF};
  const runtime=await assistantPublic591Runtime();
  for(const key of ['GITHUB_TOKEN','SOURCE_GATE_HEAD_SHA','PULL_REQUEST_NUMBER'])delete env[key];
  const report=await executeMarkedNative(env,ASSISTANT_AFTER598_SCRIPT,
    assistantAfter598NativeReportCollector({selectedPrograms:runtime.selectedPrograms}));
  if(!report)return;
  assert.deepEqual(await accountErasureSourceIdentity(),appSourceBefore,'OFF source changed during native execution');
  await assertCurrentAccountErasureNativeReport(report);
  verifyCheckout();verifyAssistantPublic591Runtime(runtime,await assistantPublic591Runtime());
  const {shape,migrationInventory,...issued}=identity;
  await record({schemaVersion:1,kind:ASSISTANT_AFTER598_PHASE_KIND,phase:AFTER598_RESULT,
    sourcePhase:ASSISTANT_AFTER598_PHASE,...issued,current,commands:ASSISTANT_AFTER598_COMMANDS,
    status:'EXECUTED',executedInThisRun:true,origin:null,eligibleForReuse:false,runtime,report});
}
// Uses the existing bounded GitHub/artifact transport. A prior successful PG
// upload survives a later national-only failure; a newer relevant negative does not.
export async function decideAssistantAfter599Reuse(options){
  requireAssistantAfter599Output(); // FIRST: an unissued family never reads options.
  if(arguments.length>1)return null;
  return decideAssistantNativeReuse(options,false);
}
export async function decideAssistantAfter601Reuse(options){
  assert.equal(ACTIVE,INACTIVE_ASSISTANT_AFTER601_SUCCESSOR);
  ACTIVE.requireOutput(); // FIRST: no origin access for an unissued family.
  assert(arguments.length<=1);
  return decideAssistantNativeReuse(options,true);
}
// Two existing issued families share the same bounded live-origin/history walk.
// The fixed adapter never accepts caller-supplied phase, command or validator.
async function decideAssistantNativeReuse(options,after601){
  let refusalStage='CURRENT_INPUT', onRefusal;
  try{
    options??={};assert(options&&Object.getPrototypeOf(options)===Object.prototype);
    assert(Object.keys(options).every(key=>['env','get','readGit','getRuntime','getInput','decode','onRefusal'].includes(key)));
    assert(options.onRefusal===undefined||typeof options.onRefusal==='function');
    onRefusal=options.onRefusal;
    let {env=process.env,get,getRuntime=assistantPublic591Runtime,
      getInput=after601?captureAssistantAfter601PgInput:captureAssistantAfter599PgInput,decode=decodeCurrent586Artifact}=options;
    const verifyInput=after601?verifyAssistantAfter601PgInput:verifyAssistantAfter599PgInput;
    const originalKind=after601?ASSISTANT_AFTER601_EXECUTED_V2_KIND:ASSISTANT_AFTER599_PHASE_KIND;
    const reuseKind=after601?ASSISTANT_AFTER601_REUSE_V2_KIND:ASSISTANT_AFTER599_REUSE_KIND;
    const receiptGit=(args,options)=>{
      const input=options?.input;
      const raw=input&&readGit[after599GitBatch]?readGit[after599GitBatch](args,input,options.timeout):readGit(args,input);
      return Buffer.isBuffer(raw)?raw:Buffer.from(raw);
    };
    const deadline=performance.now()+60000,readGit=after599BoundedGit(options.readGit??git,deadline);
    get??=installed593Original591Reader({env});
    const transport=get;get=async(...args)=>{assert(performance.now()<deadline,'AFTER599_PG_REUSE_TIME_BOUND');const value=await transport(...args);assert(performance.now()<deadline,'AFTER599_PG_REUSE_TIME_BOUND');return value;};
    assert.equal(env.GITHUB_EVENT_NAME,'pull_request');assert.equal(env.GITHUB_REPOSITORY,ORIGIN.repository);
    assert.equal(env.GITHUB_RUN_ATTEMPT,'1');assert.match(env.SOURCE_GATE_HEAD_SHA,/^[a-f0-9]{40}$/);
    const head=env.SOURCE_GATE_HEAD_SHA;
    const checkout=()=>{
      assert.equal(readGit(['rev-parse','HEAD^{commit}']).trim(),head);
      assert.equal(readGit(['status','--porcelain','--untracked-files=no']).trim(),'');
      assert.equal(readGit(['for-each-ref','refs/replace']).trim(),'');
      assert.equal(readGit(['rev-parse','--is-shallow-repository']).trim(),'false');
    };checkout();
    const current={run:Number(env.GITHUB_RUN_ID),attempt:1,head,pullRequest:Number(env.PULL_REQUEST_NUMBER),branch:env.GITHUB_HEAD_REF};
    assert(Number.isSafeInteger(current.run)&&current.run>ORIGIN.run);
    assert(Number.isSafeInteger(current.pullRequest)&&current.pullRequest>0);
    assert(typeof current.branch==='string'&&current.branch.length>0);
    const nativeInput=verifyInput(await getInput({readGit}));
    refusalStage='CURRENT_RUNTIME';
    const runtime=verifyAssistantPublic591Runtime(await getRuntime());
    refusalStage='CURRENT_RUN';
    const repo='/repos/'+ORIGIN.repository,base=repo+'/actions';
    const running=await get(base+'/runs/'+current.run);
    assert.equal(running.id,current.run);assert.equal(running.run_attempt,1);assert.equal(running.head_sha,head);
    assert.equal(running.head_branch,current.branch);assert.equal(running.path,WORKFLOW);assert.equal(running.event,'pull_request');
    verifyCurrentPullRequest(await get(repo+'/pulls/'+current.pullRequest),running,current.pullRequest);
    const currentJobs=await get(base+'/runs/'+current.run+'/attempts/1/jobs?per_page=100');assert(complete(currentJobs,'jobs'));
    const currentJob=one(currentJobs.jobs.filter(row=>row.name===JOB));
    assert.equal(currentJob.head_sha,head);assert.equal(currentJob.run_attempt,1);assert.equal(currentJob.run_id,current.run);
    assert(successful(one(currentJob.steps.filter(row=>row.name==='Validate source contracts and release governance'))));
    refusalStage='ORIGIN_HISTORY';
    const query=new URLSearchParams({event:'pull_request',per_page:'100',created:'>='+new Date(Date.parse(running.created_at)-30*86400000).toISOString()});
    const listing=await get(base+'/workflows/validate-pull-request.yml/runs?'+query);
    assert(Number.isSafeInteger(listing.total_count)&&listing.total_count>=0);
    assert.equal(listing.workflow_runs.length,Math.min(listing.total_count,100));
    assert.equal(new Set(listing.workflow_runs.map(row=>row.id)).size,listing.workflow_runs.length);
    const inputs=new Map([[head,nativeInput]]);
    const inputFor=async row=>{
      const ref=row.head_sha;
      assert.match(ref,/^[a-f0-9]{40}$/);
      if(inputs.has(ref))return inputs.get(ref);
      const capture=()=>getInput({ref,readGit,physical:false});
      let input;
      try {
        input=await capture();
      } catch(error) {
        // Another authenticated Actions run can appear after checkout. Only a
        // missing exact commit can be recovered, never a broken input inventory.
        const probe=['cat-file','--batch-check=%(objectname) %(objecttype)'];
        const request=Buffer.from(ref+'\n','ascii');
        if(String(readGit(probe,request))!==ref+' missing\n')throw error;
        assert(Number.isSafeInteger(row.id)&&row.id>0);
        const live=await get(base+'/runs/'+row.id);
        for(const key of ['id','head_sha','head_branch','run_attempt','status','conclusion'])assert.equal(live[key],row[key]);
        assert.equal(live.run_attempt,1);assert.equal(live.event,'pull_request');assert.equal(live.path,WORKFLOW);
        assert.equal(live.repository?.full_name,ORIGIN.repository);assert.equal(live.head_repository?.full_name,ORIGIN.repository);
        assert(typeof live.head_branch==='string'&&live.head_branch.length>0);
        const remote='https://github.com/'+ORIGIN.repository+'.git';
        assert.equal(readGit(['ls-remote','--get-url',remote]).trim(),remote);
        readGit(['-c','http.followRedirects=false','fetch','--no-tags','--no-prune','--no-prune-tags',
          '--no-recurse-submodules','--no-write-fetch-head','--refmap=','--no-auto-maintenance',
          '--no-write-commit-graph','--',remote,ref]);
        assert.equal(String(readGit(probe,request)),ref+' commit\n');
        input=await capture();
      }
      inputs.set(ref,input);
      return input;
    };
    const sameInput=async row=>JSON.stringify(await inputFor(row))===JSON.stringify(nativeInput);
    const jobFor=(row,jobs)=>{
      assert(complete(jobs,'jobs'));const job=one(jobs.jobs.filter(value=>value.name===JOB));
      assert.equal(job.run_id,row.id);assert.equal(job.head_sha,row.head_sha);
      assert.equal(job.run_attempt,1);assert.equal(job.status,'completed');return job;
    };
    const provedCurrentSkip=async(row,job)=>{
      const pg=one(job.steps.filter(value=>value.name===STEP));
      if(pg.conclusion!=='skipped')return false;
      // En normal inaktiv PG-fase er ingen ny SQL-origin eller kildekvalifikation.
      const terminalSourceFailure=row.conclusion==='failure'&&job.conclusion==='failure';
      const terminalCancellation=row.conclusion==='cancelled'&&job.conclusion==='cancelled';
      const terminalSourceStop=terminalSourceFailure||terminalCancellation;
      assert.equal(row.status,'completed');assert.equal(row.run_attempt,1);
      assert(terminalSourceStop||(successful(row)&&successful(job)));
      const run=await get(base+'/runs/'+row.id);
      for(const key of ['id','head_sha','head_branch','run_attempt','status','conclusion'])assert.equal(run[key],row[key]);
      assert.equal(run.path,WORKFLOW);assert.equal(run.event,'pull_request');
      assert.equal(run.repository?.full_name,ORIGIN.repository);assert.equal(run.head_repository?.full_name,ORIGIN.repository);
      assert(Number.isSafeInteger(job.id)&&job.id>0);assert.match(run.head_sha,/^[a-f0-9]{40}$/);
      assert(typeof run.head_branch==='string'&&run.head_branch.length>0);
      const raw=readGit(['cat-file','blob',run.head_sha+':'+WORKFLOW]);
      assert(Buffer.isBuffer(raw)||typeof raw==='string');assert(Buffer.byteLength(raw)<=65536);
      const workflow=(Buffer.isBuffer(raw)?raw.toString('utf8'):raw).replace(/\r\n/g,'\n');
      assert(hasDependencyOnlySourceSetup(workflow),'CURRENT_SOURCE_WORKFLOW_REQUIRED');
      if(terminalCancellation){
        const currentWorkflow=readGit(['cat-file','blob',head+':'+WORKFLOW]);
        assert(Buffer.from(raw).equals(Buffer.from(currentWorkflow)),'CANCELLED_SETUP_WORKFLOW_CHANGED');
      }
      if(!terminalSourceStop){verifyTargetedSourceStepShape(job,workflow);return true;}
      const {stepNames,nativeUploadNumber}=verifyCurrentSourceWorkflow(workflow);
      const steps=job.steps.slice(0,stepNames.length);
      assert.deepEqual(steps.map(step=>[step.name,step.number]),stepNames.map((name,index)=>[name,index+1]));
      const sourceIndex=steps.findIndex(step=>step.conclusion===row.conclusion);
      const source=steps[sourceIndex];
      if(terminalCancellation){
        // The exact same workflow first binds the Git input, then runs
        // preparation and isolated fixtures before source/SQL validation.
        const identityIndex=stepNames.indexOf('Build deterministic source-tree content identity');
        const sourceGateIndex=stepNames.indexOf('Validate source contracts and release governance');
        assert(identityIndex>=0&&sourceIndex>identityIndex&&sourceIndex<sourceGateIndex);
      }else{
        assert(source?.name==='Build deterministic source-tree content identity'
          ||source?.name==='Validate source contracts and release governance');
      }
      assert(sourceIndex<nativeUploadNumber-2);
      assert.equal(steps[nativeUploadNumber-2],pg);
      assert.equal(steps[nativeUploadNumber-1].name,CURRENT586_PHASE_UPLOAD);
      assert.equal(source.status,'completed');
      const stoppedAt=Date.parse(source.completed_at);
      assert(Date.parse(source.started_at)<=stoppedAt);
      const prefix=steps.slice(0,sourceIndex);
      assert(prefix.every(successful));
      assert(steps.slice(sourceIndex+1).every(step=>step.status==='completed'&&step.conclusion==='skipped'
        &&step.started_at===step.completed_at&&Date.parse(step.started_at)>=stoppedAt));
      const cleanupNames=new Set(['Complete job',...prefix.map(step=>'Post '+step.name)]);
      assert(job.steps.slice(stepNames.length).every(step=>step.number>stepNames.length&&cleanupNames.delete(step.name)
        &&(successful(step)||(step.status==='completed'&&step.conclusion==='skipped'))));
      return true;
    };
    const originPr=async(run,number)=>{
      const pr=await get(repo+'/pulls/'+number);
      assert.equal(pr.number,number);assert(['open','closed'].includes(pr.state));assert.equal(pr.base?.ref,'main');
      assert.equal(pr.base?.repo?.full_name,ORIGIN.repository);assert.equal(pr.head?.repo?.full_name,ORIGIN.repository);
      assert.equal(pr.head.ref,run.head_branch);assert.match(pr.head.sha,/^[a-f0-9]{40}$/);
      assert(Array.isArray(run.pull_requests));if(run.pull_requests.length)assert.equal(one(run.pull_requests).number,number);
      if(pr.head.sha!==run.head_sha)readGit(['merge-base','--is-ancestor',run.head_sha,pr.head.sha]);
      return pr;
    };
    const load=async(expected,knownJobs,activeTail=false)=>{
      const run=await get(base+'/runs/'+expected.id);
      assert.equal(run.id,expected.id);assert.equal(run.head_sha,expected.head_sha);assert.equal(run.run_attempt,1);
      if(activeTail)assert.equal(run.head_branch,expected.head_branch);
      const jobs=knownJobs??await get(base+'/runs/'+run.id+'/attempts/1/jobs?per_page=100');
      const phase=verifyAssistantPublic591PhaseMetadata(run,jobs,readGit,activeTail);
      const artifacts=await get(base+'/runs/'+run.id+'/artifacts?per_page=100');assert(complete(artifacts,'artifacts'));
      const metadata=one(artifacts.artifacts.filter(row=>row.name==='native586-phase-'+run.id+'-1-'+run.head_sha));
      verifyAssistantPublic591ArtifactMetadata(metadata,run,phase);
      const zip=await get(base+'/artifacts/'+metadata.id+'/zip',{zip:true});assert.equal(zip.length,metadata.size_in_bytes);
      assert.equal('sha256:'+sha(zip),metadata.digest);const raw=decode(zip);assert(raw.length>0&&raw.length<=32768);
      const proof=JSON.parse(raw);assert([1,2].includes(proof.schemaVersion));
      assert.equal(proof.repository,ORIGIN.repository);assert.equal(proof.headSha,run.head_sha);
      assert.equal(proof.privatePayloadIncluded,false);assert.match(proof.sourceTreeSha256,/^sha256:[a-f0-9]{64}$/);
      const receipt=proof.nativePostgres;
      assert.equal(proof.kind,receipt.kind);assert.equal(proof.schemaVersion,receipt.schemaVersion);
      assert.equal(receipt.current.head,run.head_sha);assert.equal(receipt.current.run,run.id);assert.equal(receipt.current.attempt,1);
      assert.equal(receipt.current.branch,run.head_branch);await originPr(run,receipt.current.pullRequest);
      if(after601){
        if(receipt.kind===reuseKind)await verifyAssistantAfter601ReuseV2Receipt(receipt,receipt.current,receiptGit);
        else await verifyAssistantAfter601ExecutedV2Receipt(receipt,receipt.current,receiptGit);
        sameAfter601Producer(readGit,run.head_sha,head);
      }else await verifyAssistantAfter599PhaseReceipt(receipt,receipt.current,{readGit});
      return {run,phase,metadata,proof};
    };
    let original=null;
    const otherRunners=new Map();
    const activeHistory=new Map();
    for (const row of [...listing.workflow_runs].filter(row=>row.id<current.run).sort((a,b)=>b.id-a.id)) {
      refusalStage='ORIGIN_HISTORY';
      if (!await sameInput(row)) continue;
      // Only the later observation can clear an ongoing run. It cannot be an origin.
      if(row.status==='in_progress'){activeHistory.set(row.id,row);continue;}
      const jobs=await get(base+'/runs/'+row.id+'/attempts/1/jobs?per_page=100');
      if (await provedCurrentSkip(row,jobFor(row,jobs))) continue;
      refusalStage='ORIGIN_RECEIPT';
      let candidate=await load(row,jobs);
      const locator=candidate.proof.nativePostgres.kind===reuseKind
        ?candidate.proof.nativePostgres.origin:null;
      if (locator) {
        candidate=await load({id:locator.run,head_sha:locator.head});
        assert.equal(candidate.phase.job,locator.job);assert.equal(candidate.metadata.id,locator.artifactId);
        assert.equal(candidate.metadata.digest,locator.artifactDigest);assert.equal(candidate.proof.sourceTreeSha256,locator.sourceTreeSha256);
      }
      const prior=candidate.proof.nativePostgres;
      assert.equal(prior.kind,originalKind);assert.equal(prior.schemaVersion,after601?2:1);
      assert.equal(prior.status,'EXECUTED');assert.equal(prior.executedInThisRun,true);assert.equal(prior.origin,null);
      assert.equal(prior.eligibleForReuse,false,'The historical V1 flags remain unchanged');
      verifyInput(nativeInput,await inputFor(candidate.run));
      if (!isDeepStrictEqual(runtime,prior.runtime)) {
        // A verified actual success on another runner does not provide this run's evidence.
        // Search the same bounded history for an exactly matching original.
        refusalStage='ORIGIN_RUNTIME_MISMATCH';
        assert(!locator,'A reused receipt must point to the current runtime');
        otherRunners.set(row.id,candidate.run);
        continue;
      }
      original=candidate;
      break;
    }
    refusalStage='MATCHING_ORIGIN_MISSING';
    assert(original,'No authentic phase for this exact runtime');
    const prior=original.proof.nativePostgres;
    refusalStage='LATER_HISTORY';
    const laterQuery=new URLSearchParams({event:'pull_request',per_page:'100',created:'>='+original.run.created_at});
    const later=await get(base+'/workflows/validate-pull-request.yml/runs?'+laterQuery);assert(complete(later,'workflow_runs'));
    assert.equal(new Set(later.workflow_runs.map(row=>row.id)).size,later.total_count);
    assert(later.workflow_runs.some(row=>row.id===original.run.id)&&later.workflow_runs.some(row=>row.id===current.run));
    for(const [id,previous] of activeHistory){
      const fresh=one(later.workflow_runs.filter(row=>row.id===id));
      for(const key of ['head_sha','head_branch','run_attempt'])assert.equal(fresh[key],previous[key]);
    }
    for (const [id,previous] of otherRunners) {
      const fresh=one(later.workflow_runs.filter(row=>row.id===id));
      for (const key of ['head_sha','head_branch','run_attempt','status','conclusion']) assert.equal(fresh[key],previous[key]);
    }
    for(const row of later.workflow_runs.filter(row=>row.id>original.run.id&&row.id!==current.run)){
      if(!await sameInput(row))continue;
      assert.equal(row.run_attempt,1);assert.equal(row.path,WORKFLOW);assert.equal(row.event,'pull_request');
      assert.equal(row.repository?.full_name,ORIGIN.repository);
      const jobs=await get(base+'/runs/'+row.id+'/attempts/1/jobs?per_page=100');
      if(row.status==='in_progress'){
        const workflowBlob=ref=>String(readGit(['rev-parse',ref+':'+WORKFLOW])).trim();
        assert.equal(workflowBlob(row.head_sha),workflowBlob(head),'Same actual workflow required for an active tail');
        const overlap=await load(row,jobs,true);
        assert.equal(overlap.proof.nativePostgres.kind,originalKind);
        assert.deepEqual(overlap.proof.nativePostgres.runtime,runtime);
        const fresh=await get(base+'/runs/'+row.id);
        for(const key of ['id','head_sha','head_branch','run_attempt','status','conclusion'])assert.equal(fresh[key],overlap.run[key]);
        continue;
      }
      assert.equal(row.status,'completed');
      const job=jobFor(row,jobs);
      if(await provedCurrentSkip(row,job))continue;
      assert(['success','failure'].includes(row.conclusion)&&['success','failure'].includes(job.conclusion));
      assert(successful(one(job.steps.filter(value=>value.name==='Validate source contracts and release governance'))));
      const pg=one(job.steps.filter(value=>value.name===STEP));assert(successful(pg));
      // A newly terminal row is not proved by two green steps. Requalify the
      // same native upload, artifact and typed receipt as in the first walk.
      const completed=await load(row,jobs);
      for(const key of ['status','conclusion','head_branch'])assert.equal(completed.run[key],row[key]);
    }
    // Fresh identity and independent origin metadata after the history walk.
    refusalStage='FINAL_REOBSERVATION';
    verifyInput(nativeInput,await getInput({readGit}));
    verifyAssistantPublic591Runtime(runtime,await getRuntime());checkout();
    const finalRun=await get(base+'/runs/'+original.run.id);assert.deepEqual(finalRun,original.run);
    const finalJobs=await get(base+'/runs/'+original.run.id+'/attempts/1/jobs?per_page=100');
    assert.deepEqual(verifyAssistantPublic591Metadata(finalRun,finalJobs,readGit),original.phase);
    assert.deepEqual(await get(base+'/artifacts/'+original.metadata.id),original.metadata);
    await originPr(finalRun,prior.current.pullRequest);
    verifyCurrentPullRequest(await get(repo+'/pulls/'+current.pullRequest),running,current.pullRequest);
    const origin={run:original.run.id,attempt:1,head:original.run.head_sha,job:original.phase.job,artifactId:original.metadata.id,
      artifactDigest:original.metadata.digest,sourceTreeSha256:original.proof.sourceTreeSha256};
    if(after601){
      sameAfter601Producer(readGit,origin.head,head);
      return after601ReuseV2Receipt(current,runtime,prior.report,nativeInput,origin);
    }
    const identity=await assistantAfter599PhaseIdentity(),{shape,migrationInventory,ledgerFixture,...issued}=identity;
    return {schemaVersion:2,kind:ASSISTANT_AFTER599_REUSE_KIND,phase:AFTER599_RESULT,sourcePhase:ASSISTANT_AFTER599_PHASE,
      ...issued,current,commands:ASSISTANT_AFTER599_COMMANDS,status:'REUSED',executedInThisRun:false,
      origin:{run:original.run.id,attempt:1,head:original.run.head_sha,job:original.phase.job,artifactId:original.metadata.id,
        artifactDigest:original.metadata.digest,sourceTreeSha256:original.proof.sourceTreeSha256},
      eligibleForReuse:false,nativeInput,runtime,report:prior.report};
  }catch(error){
    const reason=error?.message==='AFTER599_PG_REUSE_TIME_BOUND'?'READ_DEADLINE':refusalStage;
    try{onRefusal?.(reason);}catch{} // Diagnostics never grant reuse or prevent the existing fallback.
    return null;
  }
}

export async function executeAssistantAfter599Native(){
  const reused=await decideAssistantAfter599Reuse({
    onRefusal:reason=>console.log('AFTER599_PG_REUSE_NOT_ESTABLISHED '+reason),
  });
  if(reused){await record(reused);return;}
  const identity=await assistantAfter599PhaseIdentity(); // Before environment/Git/native launch.
  const appSourceBefore=await accountErasureSourceIdentity();
  const receiptSourceBefore=await accountNativeReceiptSourceIdentity();
  const env={...process.env},head=env.SOURCE_GATE_HEAD_SHA;
  assert.equal(env.GITHUB_EVENT_NAME,'pull_request');assert.equal(env.GITHUB_REPOSITORY,ORIGIN.repository);
  const verifyCheckout=()=>{
    assert.match(head,/^[a-f0-9]{40}$/);
    assert.equal(git(['rev-parse','HEAD^{commit}']).trim(),head);
    assert.equal(git(['status','--porcelain','--untracked-files=no']).trim(),'');
    assert.equal(git(['for-each-ref','refs/replace']).trim(),'');
    assert.equal(git(['rev-parse','--is-shallow-repository']).trim(),'false');
  };
  verifyCheckout();
  const current={run:Number(env.GITHUB_RUN_ID),attempt:Number(env.GITHUB_RUN_ATTEMPT),head,
    pullRequest:Number(env.PULL_REQUEST_NUMBER),branch:env.GITHUB_HEAD_REF};
  const runtime=await assistantPublic591Runtime();
  for(const key of ['GITHUB_TOKEN','SOURCE_GATE_HEAD_SHA','PULL_REQUEST_NUMBER'])delete env[key];
  const report=await executeMarkedNative(env,ASSISTANT_AFTER599_SCRIPT,
    assistantAfter599NativeReportCollector({selectedPrograms:runtime.selectedPrograms}));
  if(!report)return;
  assert.deepEqual(await accountErasureSourceIdentity(),appSourceBefore,'OFF source changed during native execution');
  assert.deepEqual(await accountNativeReceiptSourceIdentity(),receiptSourceBefore,'Receipt source changed during native execution');
  await assertCurrentAccountNativeReceiptNativeReport(report);
  await assertCurrentAccountErasureNativeReport(report);
  verifyCheckout();verifyAssistantPublic591Runtime(runtime,await assistantPublic591Runtime());
  const {shape,migrationInventory,ledgerFixture,...issued}=identity;
  await record({schemaVersion:1,kind:ASSISTANT_AFTER599_PHASE_KIND,phase:AFTER599_RESULT,
    sourcePhase:ASSISTANT_AFTER599_PHASE,...issued,current,commands:ASSISTANT_AFTER599_COMMANDS,
    status:'EXECUTED',executedInThisRun:true,origin:null,eligibleForReuse:false,runtime,report});
}

const after601ReportFields=Object.freeze([
  'sqlExecuted','wholeMigrationExecuted','exactCheckpointContract','exactTripContract',
  'oldFunctionsAndOidsPreserved','allOriginalDefinitionsPreserved','originalDigestsPreserved',
  'trueOld601Fixtures','old601ModelNotRetagged','currentNormalFixtures','wholeMetadataInverse',
  'strictlyLater601ToNextOnly','accountOffCatalogPreserved','normalProtectedJsonbRoundtrip',
  'schema2Catalog','predecessorExecutedInSameHost',
]);
const after601IntermediateTruths=Object.freeze([
  'old601ActiveAfterSql','old601RefusedAfterCompletion','nextRefusedBeforeActivation',
  'pendingBothRefused','nextActiveAfterCompletion','wholeHistoryAndDocumentsPreserved',
  'quotaFunctionAndAdmissionUnchanged','quotaServiceRoleWorking',
]);
function after601ReportProjection(report){
  const profile=INACTIVE_ASSISTANT_AFTER601_SUCCESSOR;
  profile.requireOutput();
  const expectations={
    kind:AFTER601_RESULT,
    sourceMigrationInventory:70,
    databaseBeforeVersion:profile.databaseBefore.version,
    originalStateRelease:601,
    migrationVersion:profile.migration().version,
    partCount:673,
    installedLedgerBeforeRows:69,
    installedLedgerAfterRows:70,
    beforeGuardCases:17,
    parentCodeHead:SOURCE601_ORIGINAL_DATA_PROFILE.head,
    allHistoricalMigrationsExecuted:false,
    productionInstalledHistoryEvidence:false,
    productionSeedAuthenticated:false,
    sqlIsNotOriginAuthentication:true,
  };
  for(const [key,value] of Object.entries(expectations))assert.equal(report?.[key],value);
  for(const key of after601ReportFields)assert.equal(report[key],true,'Missing measured 601 property '+key);
  const intermediate=report.intermediateRuntime;
  for(const key of after601IntermediateTruths)
    assert.equal(intermediate?.[key],true,'Missing measured 601 runtime property '+key);
  return {...expectations,...Object.fromEntries(after601ReportFields.map(key=>[key,true])),
    intermediateRuntime:Object.fromEntries(after601IntermediateTruths.map(key=>[key,true]))};
}

function after601PhaseReceipt(current,runtime,report){
  const profile=INACTIVE_ASSISTANT_AFTER601_SUCCESSOR;
  assert.match(current.head,/^[a-f0-9]{40}$/);
  assert(Number.isSafeInteger(current.run)&&current.run>ORIGIN.run);
  assert(Number.isSafeInteger(current.attempt)&&current.attempt>0);
  assert(Number.isSafeInteger(current.pullRequest)&&current.pullRequest>0);
  assert(typeof current.branch==='string'&&current.branch.length>0&&current.branch.length<=255);
  verifyAssistantPublic591Runtime(runtime);
  return {
    schemaVersion:1,kind:ASSISTANT_AFTER601_PHASE_KIND,phase:AFTER601_RESULT,sourcePhase:ASSISTANT_AFTER601_PHASE,
    current,commands:ASSISTANT_AFTER601_COMMANDS,status:'EXECUTED',executedInThisRun:true,origin:null,
    eligibleForReuse:false,binding:profile.requireBinding(),output:profile.requireOutput(),runtime,
    report:after601ReportProjection(report),
  };
}
export function verifyAssistantAfter601PhaseReceipt(native,current,readGit){
  if(readGit)assert(!hasCheckpointScalarWalk(readGit,current.head)&&!hasNativeMigration(readGit,current.head,tripErasureMigrationPath),
    'Checkpoint scalar-walk or trip erasure recovery requires exact native V2 execution');
  assert.deepEqual(native,after601PhaseReceipt(current,native.runtime,native.report));
  return native;
}

function after601ExecutedV2Receipt(current,runtime,report,nativeInput){
  verifyAssistantAfter601PgInput(nativeInput);
  const receipt=after601PhaseReceipt(current,runtime,report);
  if(nativeInput.sqlFiles>=82){
    const append=CHECKPOINT_SCALAR_WALK_MIGRATION;
    const scalarWalk={migrationVersion:append.version,migrationSha256:append.sha256,
      installedLedgerBeforeRows:70,installedLedgerAfterRows:71,
      sqlExecuted:true,checkpointContractExact:true,helperOnlyCatalogChange:true,
      priorDataPreserved:true,forbiddenKeysUnchanged:true,normalCasUnchanged:true};
    assert.deepEqual(report.checkpointScalarWalk,scalarWalk,'Missing exact checkpoint scalar-walk execution proof');
    receipt.report.checkpointScalarWalk=scalarWalk;
  }else assert.equal(report.checkpointScalarWalk,undefined);
  if(nativeInput.sqlFiles===83){
    const tripErasureRecovery={migration:TRIP_ERASURE_RECOVERY_MIGRATION,
      migrationSha256:nativeInput.tripErasureRecoveryMigrationSha256,
      actualPostgres:true,syntheticSqlHost:true,realGoTrue:false,
      accountClaimCommitRefusesHold:true,priorTripIntentInHeldJournal:true,
      heldTripAndAccountWritesRefused:true,supabaseObservationWritesRefused:true,
      sameHoldIdRequired:true,productionReleaseVerified:false};
    assert.deepEqual(report.tripErasureRecovery,tripErasureRecovery,'Missing exact trip erasure recovery execution proof');
    receipt.report.tripErasureRecovery=tripErasureRecovery;
  }else assert.equal(report.tripErasureRecovery,undefined);
  return {...receipt,schemaVersion:2,kind:ASSISTANT_AFTER601_EXECUTED_V2_KIND,nativeInput};
}

export async function verifyAssistantAfter601ExecutedV2Receipt(native,current,readGit=git){
  // Verify an existing receipt at its original commit, independently of what
  // active phase the consumer currently selects for a fresh native command.
  INACTIVE_ASSISTANT_AFTER601_SUCCESSOR.requireOutput();
  assert.equal(native?.kind,ASSISTANT_AFTER601_EXECUTED_V2_KIND);
  assert.equal(native.status,'EXECUTED');
  assert.equal(native.origin,null);
  let read=git;
  if(readGit!==git){
    // The FULL consumer already bounds each Git call. Preserve that budget
    // while using the same batched object verification as the normal producer.
    read=args=>readGit(args);
    read[after599GitBatch]=(args,input,timeout)=>readGit(args,{input,timeout});
  }
  const expectedInput=await captureAssistantNativePgInput({ref:current.head,readGit:read,physical:false},true);
  assert.deepEqual(native,after601ExecutedV2Receipt(current,native.runtime,native.report,expectedInput));
  return native;
}

// Input identity is complete, not a boolean permission or a source-head key.
export function verifyAssistantAfter601PgInput(value,prior=value){
  INACTIVE_ASSISTANT_AFTER601_SUCCESSOR.requireOutput();
  assert.deepEqual(value,prior,'Actual SQL/native/model/frozen inputs changed');
  const keys=['schemaVersion','kind','files','sqlFiles','complete','inputSha256','packageScopes','frozenGitTrees'];
  if(value.sqlFiles===83){
    keys.push('tripErasureRecoveryMigrationSha256');
    assert.match(value.tripErasureRecoveryMigrationSha256,hashPattern);
  }
  assert.deepEqual(Object.keys(value).sort(),keys.sort());
  assert.equal(value.schemaVersion,1);assert.equal(value.kind,'AFTER601_ACTUAL_PG_INPUT_V1');
  assert.equal(value.complete,true);assert([81,82,83].includes(value.sqlFiles));
  assert(Number.isSafeInteger(value.files)&&value.files>0&&value.files<=512);assert.match(value.inputSha256,hashPattern);
  assert(Array.isArray(value.packageScopes)&&value.packageScopes.length>0&&value.packageScopes.length<=128);
  assert(Array.isArray(value.frozenGitTrees)&&value.frozenGitTrees.length>0&&value.frozenGitTrees.length<=64);
  return value;
}
function sameAfter601Producer(readGit,originHead,currentHead){
  const file='scripts/native-postgres-evidence.mjs';
  const read=ref=>{
    const row=String(readGit(['ls-tree','-z',ref,'--',file]));
    assert.match(row,/^100(?:644|755) blob [a-f0-9]{40}\tscripts\/native-postgres-evidence\.mjs\0$/);
    return row;
  };
  assert.equal(read(currentHead),read(originHead),'AFTER601_PG_PRODUCER_CHANGED');
}
function after601ReuseV2Receipt(current,runtime,report,nativeInput,origin){
  return {...after601ExecutedV2Receipt(current,runtime,report,nativeInput),kind:ASSISTANT_AFTER601_REUSE_V2_KIND,
    status:'REUSED',executedInThisRun:false,origin};
}
export async function verifyAssistantAfter601ReuseV2Receipt(native,current,readGit=git){
  INACTIVE_ASSISTANT_AFTER601_SUCCESSOR.requireOutput();
  assert.equal(current.attempt,1);assert.equal(native?.kind,ASSISTANT_AFTER601_REUSE_V2_KIND);
  const origin=native.origin;
  assert.deepEqual(Object.keys(origin??{}).sort(),['run','attempt','head','job','artifactId','artifactDigest','sourceTreeSha256'].sort());
  assert(Number.isSafeInteger(origin?.run)&&origin.run>ORIGIN.run&&origin.run<current.run);
  assert.equal(origin.attempt,1);assert(Number.isSafeInteger(origin.job)&&origin.job>0);assert.match(origin.head,/^[a-f0-9]{40}$/);
  assert(Number.isSafeInteger(origin.artifactId)&&origin.artifactId>0);assert.match(origin.artifactDigest,/^sha256:[a-f0-9]{64}$/);
  assert.match(origin.sourceTreeSha256,/^sha256:[a-f0-9]{64}$/);
  let read=git;
  if(readGit!==git){read=args=>readGit(args);read[after599GitBatch]=(args,input,timeout)=>readGit(args,{input,timeout});}
  sameAfter601Producer(read,origin.head,current.head);
  const expectedInput=await captureAssistantNativePgInput({ref:current.head,readGit:read,physical:false},true);
  const originalInput=await captureAssistantNativePgInput({ref:origin.head,readGit:read,physical:false},true);
  verifyAssistantAfter601PgInput(expectedInput,originalInput);
  assert.deepEqual(native,after601ReuseV2Receipt(current,native.runtime,native.report,expectedInput,origin));
  return native;
}

async function executeAssistantAfter601Native(){
  const reused=await decideAssistantAfter601Reuse({
    onRefusal:reason=>console.log('AFTER601_PG_REUSE_NOT_ESTABLISHED '+reason),
  });
  if(reused){await record(reused);return;}
  assert.equal(ACTIVE,INACTIVE_ASSISTANT_AFTER601_SUCCESSOR);
  ACTIVE.requireOutput();
  const env={...process.env},head=env.SOURCE_GATE_HEAD_SHA;
  assert.equal(env.GITHUB_EVENT_NAME,'pull_request');assert.equal(env.GITHUB_REPOSITORY,ORIGIN.repository);
  const verifyCheckout=()=>{
    assert.match(head,/^[a-f0-9]{40}$/);
    assert.equal(git(['rev-parse','HEAD^{commit}']).trim(),head);
    assert.equal(git(['status','--porcelain','--untracked-files=no']).trim(),'');
    assert.equal(git(['for-each-ref','refs/replace']).trim(),'');
    assert.equal(git(['rev-parse','--is-shallow-repository']).trim(),'false');
  };
  verifyCheckout();
  const current={run:Number(env.GITHUB_RUN_ID),attempt:Number(env.GITHUB_RUN_ATTEMPT),head,
    pullRequest:Number(env.PULL_REQUEST_NUMBER),branch:env.GITHUB_HEAD_REF};
  const runtime=await assistantPublic591Runtime();
  const scalarWalk=hasCheckpointScalarWalk(git,head);
  const tripErasureRecovery=hasNativeMigration(git,head,tripErasureMigrationPath);
  let nativeInput;
  try{
    nativeInput=await captureAssistantAfter601PgInput({ref:head});
    assert.equal(nativeInput.complete,true);
    assert.equal(nativeInput.sqlFiles,(scalarWalk?82:81)+Number(tripErasureRecovery));
  }catch(error){
    if(scalarWalk||tripErasureRecovery)throw error;
    // Unknown historical source projection still requires the original SQL test.
    nativeInput=null;
    console.log('AFTER601_PG_INPUT_ATTESTATION_UNAVAILABLE');
  }
  for(const key of ['GITHUB_TOKEN','SOURCE_GATE_HEAD_SHA','PULL_REQUEST_NUMBER'])delete env[key];
  const report=await executeMarkedNative(env,ASSISTANT_AFTER601_SCRIPT,nativeMarkerCollector(SCALAR597_REPORT_MARKER,65536));
  if(!report)return;
  assert.equal(report.kind,SCALAR597_REPORT_MARKER);
  assert.equal(report.sqlExecuted,true);assert.equal(report.migrationExecuted,true);
  assert.equal(report.tcpEnabled,false);assert.equal(report.normalModelPartCount,673);
  assert.equal(report.postgresMajorVersion,runtime.selectedPrograms.majorVersion);
  assert.deepEqual(report.nativeProgramIdentity,runtime.selectedPrograms);
  for(const key of ['assistantAfter597Successor','assistantAfter598Successor','assistantAfter599Successor',
    'accountErasure','accountInactivity','accountNativeReceipt'])assert(!Object.hasOwn(report,key));
  verifyCheckout();verifyAssistantPublic591Runtime(runtime,await assistantPublic591Runtime());
  const nativeReport=report.assistantAfter601Successor;
  if(nativeInput===null){
    assert.equal(nativeReport.checkpointScalarWalk,undefined);
    await record(after601PhaseReceipt(current,runtime,nativeReport));
    return;
  }
  assert.deepEqual(await captureAssistantAfter601PgInput({ref:head}),nativeInput,
    'After601 PostgreSQL inputs changed during SQL execution');
  await record(after601ExecutedV2Receipt(current,runtime,nativeReport,nativeInput));
}

async function record(receipt) {
  const file='.cache/source-tree-content-proof.json', proof=JSON.parse(await fs.readFile(file,'utf8'));
  assert.equal(proof.headSha,git(['rev-parse','HEAD^{commit}']).trim()); assert.equal(proof.repository,ORIGIN.repository);
  assert.equal(proof.contractId,'weather-source-gate-content-v2'); assert.equal(proof.privatePayloadIncluded,false);
  const current={run:Number(process.env.GITHUB_RUN_ID),attempt:Number(process.env.GITHUB_RUN_ATTEMPT),
    head:proof.headSha,pullRequest:Number(process.env.PULL_REQUEST_NUMBER),branch:process.env.GITHUB_HEAD_REF};
  if(ACTIVE.sourcePhase===ASSISTANT_AFTER601_PHASE){
    if(receipt.kind===ASSISTANT_AFTER601_REUSE_V2_KIND)await verifyAssistantAfter601ReuseV2Receipt(receipt,current);
    else if(receipt.kind===ASSISTANT_AFTER601_EXECUTED_V2_KIND)await verifyAssistantAfter601ExecutedV2Receipt(receipt,current);
    else verifyAssistantAfter601PhaseReceipt(receipt,current,git);
  }
  else if(ACTIVE.sourcePhase===ASSISTANT_AFTER599_PHASE){
    await assertCurrentAccountErasureNativeReport(receipt.report);
    await assertCurrentAccountInactivityNativeReport(receipt.report);
    await assertCurrentAccountNativeReceiptNativeReport(receipt.report);
    await verifyAssistantAfter599PhaseReceipt(receipt,current);
  }
  else if(ACTIVE.sourcePhase===ASSISTANT_AFTER598_PHASE){
    // Actual current source decides; old/omitted RAW metadata cannot authorize a current76-row record.
    await assertCurrentAccountErasureNativeReport(receipt.report);
    await verifyAssistantAfter598PhaseReceipt(receipt,current);
  }
  else if(ACTIVE.sourcePhase===ASSISTANT_AFTER597_PHASE)await verifyAssistantAfter597PhaseReceipt(receipt,current);
  else if(ACTIVE.sourcePhase===SCALAR597_LATER_H0_PHASE)verifyScalar597LaterH0PhaseReceipt(receipt,current);
  else if(receipt.kind===INSTALLED593_ORIGINAL591_V2_KIND)verifyInstalled593Original591V2PhaseReceipt(receipt,current);
  else if(receipt.phase==='INSTALLED593_ORIGINAL591_SUCCESSOR')verifyInstalled593Original591PhaseReceipt(receipt,current);
  else if(receipt.schemaVersion===2)verifyAssistantPublic591V2PhaseReceipt(receipt,current);
  else if(receipt.phase==='NATIVE_ORIGINAL_CONTINUITY')verifyCurrent586PhaseReceipt(receipt,current);
  else if(receipt.phase==='ASSISTANT_PUBLIC591_SUCCESSOR')verifyAssistantPublic591SuccessorPhaseReceipt(receipt,current);
  else if(receipt.phase==='ASSISTANT_PUBLIC590_SUCCESSOR')verifyAssistantPublic590SuccessorPhaseReceipt(receipt,current);
  else if(receipt.phase==='ASSISTANT_PUBLIC588_SUCCESSOR')verifyAssistantPublic588SuccessorPhaseReceipt(receipt,current);
  else if(receipt.phase==='ASSISTANT_PUBLIC587_SUCCESSOR')verifyAssistantPublic587SuccessorPhaseReceipt(receipt,current);
  else verifyAssistantLaterH0PhaseReceipt(receipt,current);
  proof.nativePostgres=receipt; await fs.writeFile(file,JSON.stringify(proof)+'\n');
  const phaseProof={
    schemaVersion:receipt.schemaVersion===2?2:1,
    kind:receipt.schemaVersion===2||receipt.kind===SCALAR597_LATER_H0_PHASE_KIND||receipt.kind===ASSISTANT_AFTER597_PHASE_KIND||receipt.kind===ASSISTANT_AFTER598_PHASE_KIND||receipt.kind===ASSISTANT_AFTER599_PHASE_KIND||receipt.kind===ASSISTANT_AFTER601_PHASE_KIND?receipt.kind:
      receipt.phase==='INSTALLED593_ORIGINAL591_SUCCESSOR'?INSTALLED593_ORIGINAL591_PHASE_KIND:
      receipt.phase==='NATIVE_ORIGINAL_CONTINUITY'?CURRENT586_PHASE_KIND:
      receipt.phase==='ASSISTANT_PUBLIC591_SUCCESSOR'?ASSISTANT_PUBLIC591_SUCCESSOR_PHASE_KIND:
      receipt.phase==='ASSISTANT_PUBLIC590_SUCCESSOR'?ASSISTANT_PUBLIC590_SUCCESSOR_PHASE_KIND:
      receipt.phase==='ASSISTANT_PUBLIC588_SUCCESSOR'?ASSISTANT_PUBLIC588_SUCCESSOR_PHASE_KIND:
      receipt.phase==='ASSISTANT_PUBLIC587_SUCCESSOR'?ASSISTANT_PUBLIC587_SUCCESSOR_PHASE_KIND:ASSISTANT_LATER_H0_PHASE_KIND,
    repository:proof.repository,headSha:proof.headSha,sourceTreeSha256:proof.sourceTreeSha256,
    privatePayloadIncluded:false,nativePostgres:receipt,
  };
  const raw=JSON.stringify(phaseProof)+'\n';if(receipt.schemaVersion===2||receipt.kind===SCALAR597_LATER_H0_PHASE_KIND||receipt.kind===ASSISTANT_AFTER597_PHASE_KIND||receipt.kind===ASSISTANT_AFTER598_PHASE_KIND||receipt.kind===ASSISTANT_AFTER599_PHASE_KIND||receipt.kind===ASSISTANT_AFTER601_PHASE_KIND)assert(Buffer.byteLength(raw)<=32768);
  await fs.writeFile(CURRENT586_PHASE_FILE,raw,{flag:'wx'});
}
async function main() {
  if(ACTIVE.sourcePhase===ASSISTANT_AFTER601_PHASE)return executeAssistantAfter601Native();
  if(ACTIVE.sourcePhase===ASSISTANT_AFTER599_PHASE)return executeAssistantAfter599Native();
  if(ACTIVE.sourcePhase===ASSISTANT_AFTER598_PHASE)return executeAssistantAfter598Native();
  if(ACTIVE.sourcePhase===ASSISTANT_AFTER597_PHASE)return executeAssistantAfter597Native();
  if(ACTIVE.sourcePhase===SCALAR597_LATER_H0_PHASE)return executeScalar597LaterH0();
  assert(['assistant-public587-successor','assistant-public588-successor','assistant-public590-successor','assistant-public591-successor','assistant-installed593-origin591-successor'].includes(ACTIVE.sourcePhase));
  if(ACTIVE.sourcePhase==='assistant-installed593-origin591-successor')requireInstalled593Original591Release();
  if(ACTIVE.sourcePhase==='assistant-public591-successor')requireAssistantPublic591SuccessorRelease();
  if(ACTIVE.sourcePhase==='assistant-public590-successor')requireAssistantPublic590SuccessorRelease();
  if(ACTIVE.sourcePhase==='assistant-public588-successor')requireAssistantPublic588SuccessorRelease();
  requireAssistantPublic587SuccessorRelease(); // UNISSUED before evidence I/O or native launch; no fallback to a whole587 receipt.
  requireAssistantLaterH0Release(); // The preceding genuine587 phase remains issued and required.
  let receipt={status:'EXECUTE',reason:ACTIVE.sourcePhase==='assistant-installed593-origin591-successor'
    ?'new-installed593-original591-phase-requires-actual-execution':ACTIVE.sourcePhase==='assistant-public591-successor'
    ?'new-assistant-public591-successor-phase-requires-actual-execution':ACTIVE.sourcePhase==='assistant-public590-successor'
    ?'new-assistant-public590-successor-phase-requires-actual-execution':ACTIVE.sourcePhase==='assistant-public588-successor'
    ?'new-assistant-public588-successor-phase-requires-actual-execution':'new-assistant-public587-successor-phase-requires-actual-execution'};
  let v2Local=null;
  const installed594=ACTIVE.sourcePhase==='assistant-installed593-origin591-successor';
  const captureInput=installed594?captureInstalled593Original591Input:captureAssistantPublic591Input;
  const verifyInput=installed594?verifyInstalled593Original591Input:verifyAssistantPublic591Input;
  const verifyV2=installed594?verifyInstalled593Original591V2PhaseReceipt:verifyAssistantPublic591V2PhaseReceipt;
  if(installed594){
    try{v2Local=await installed593Original591LocalProof();receipt=await decideInstalled593Original591Reuse({local:v2Local});}
    catch{ /* No594 origin: normal actual execution remains required. */ }
  }else if(ACTIVE.sourcePhase==='assistant-public591-successor'){
    try{v2Local=await assistantPublic591LocalProof();receipt=await decideAssistantPublic591Reuse({local:v2Local});}
    catch{ /* Unknown inputs/runtime still require both normal native commands. */ }
  }
  if(receipt.status!=='REUSED') {
    console.log('Native PostgreSQL: original commands required; reuse evidence absent or different.');
    const env={...process.env}; for(const key of ['GITHUB_TOKEN','SOURCE_GATE_HEAD_SHA','PULL_REQUEST_NUMBER'])delete env[key];
    let selectedPrograms=null;
    if(v2Local){selectedPrograms=await executeAssistantPublic591Native(env,v2Local.phase);if(process.exitCode)return;}
    else{
      const result=spawnSync('/usr/bin/bash',['--noprofile','--norc','-e','-o','pipefail','-c',ACTIVE_NATIVE_SCRIPT],{env,stdio:'inherit'});
      if(result.error||result.status!==0){process.exitCode=result.status||1;return;}
    }
    receipt={...receipt,status:'EXECUTED',executedInThisRun:true,origin:null,
      ...(ACTIVE.sourcePhase==='assistant-installed593-origin591-successor'
        ?{schemaVersion:1,kind:INSTALLED593_ORIGINAL591_PHASE_KIND,phase:'INSTALLED593_ORIGINAL591_SUCCESSOR',sourcePhase:ACTIVE.sourcePhase,
          releaseVersion:requireInstalled593Original591Release(),binding:requireInstalled593Original591Binding(),
          output:requireInstalled593Original591Output(),databaseBefore:INSTALLED593_ORIGINAL591_DATABASE_BEFORE,
          eligibleForReuse:false}:ACTIVE.sourcePhase==='assistant-public591-successor'
        ?{phase:'ASSISTANT_PUBLIC591_SUCCESSOR',eligibleForReuse:false}:ACTIVE.sourcePhase==='assistant-public590-successor'
        ?{phase:'ASSISTANT_PUBLIC590_SUCCESSOR',eligibleForReuse:false}:ACTIVE.sourcePhase==='assistant-public588-successor'
        ?{phase:'ASSISTANT_PUBLIC588_SUCCESSOR',eligibleForReuse:false}
        :{phase:'ASSISTANT_PUBLIC587_SUCCESSOR',eligibleForReuse:false}),
      current:{run:Number(process.env.GITHUB_RUN_ID),attempt:Number(process.env.GITHUB_RUN_ATTEMPT),
        head:git(['rev-parse','HEAD^{commit}']).trim(),pullRequest:Number(process.env.PULL_REQUEST_NUMBER),
        branch:process.env.GITHUB_HEAD_REF},commands:ACTIVE_COMMANDS};
    if(v2Local&&selectedPrograms){
      try{
        if(installed594)receipt=await completeInstalled593Original591Execution(v2Local,selectedPrograms);
        else{
          verifyInput(v2Local.nativeInput,await captureInput());
          verifyAssistantPublic591Runtime(v2Local.runtime,await assistantPublic591Runtime());
          assert.deepEqual(selectedPrograms,v2Local.runtime.selectedPrograms);
          receipt={...v2Local,status:'EXECUTED',executedInThisRun:true,origin:null};
          verifyV2(receipt,v2Local.current);
        }
      }catch{ /* Real successful SQL remains V1/ineligible when attestation is incomplete. */ }
    }
  } else if(receipt.schemaVersion===2)console.log('Native PostgreSQL: REUSED from run '+receipt.origin.run+'/1, job '+receipt.origin.job+', head '+receipt.origin.head+'; no new SQL execution claimed.');
  else console.log('Native PostgreSQL: REUSED from run '+ORIGIN.run+'/1, job '+ORIGIN.job+', head '+ORIGIN.head+'; no new SQL execution claimed.');
  await record(receipt);
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  // Earlier selected SDK contracts alone use this Node24 executable hint.
  // Isolated native/national evidence keeps its normal Node22 and empty override guards.
  delete process.env.RAVRADAR_SOURCE_NODE24;
  await main();
}
