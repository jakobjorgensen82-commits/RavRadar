import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import nativeFs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import {
  NATIVE_IDENTITY_PREDECESSOR, NATIVE_IDENTITY_BINDING_REVIEW,
  NATIVE_IDENTITY_OUTPUT_REVIEW, NATIVE_IDENTITY_RECOVERY_REVIEW,
  NATIVE_IDENTITY_ORIGINAL_NAMES, nativeIdentitySqlDefinition,
  assertNativeIdentityBindingsFrozen, assertNativeIdentityOutputFrozen,
  assertNativeIdentityRecoveryFrozen, nativeIdentityMigration,
  readNativeIdentityPredecessorSource, readNativeIdentityCanonicalSource,
} from './lib/native-sampling-identity-successor-source.mjs';
import { buildNativeSamplingIdentityOriginalBindingSuccessor }
  from './build-native-sampling-identity-original-binding-successor.mjs';
import { verifyNativeSamplingIdentitySuccessorPlan, selectNativeSamplingIdentityRecoveryPhase, NATIVE_IDENTITY_PLAN_PHASES }
  from './verify-native-sampling-identity-successor-plan.mjs';
import { nativeSamplingIdentityExpectedDatabaseContracts, verifyNativeSamplingIdentitySuccessorReadiness }
  from './native-sampling-identity-successor-readiness.mjs';
import { runNativeSamplingIdentityRecoveryPrewrite }
  from './native-sampling-identity-recovery-prewrite.mjs';
import { readCurrentGridCanonicalSource } from './lib/current-grid-successor-source.mjs';

test('issued native identity source matches actual C/I/T and SQL while every unfrozen review fails closed', async () => {
  for (const review of [NATIVE_IDENTITY_BINDING_REVIEW, NATIVE_IDENTITY_OUTPUT_REVIEW, NATIVE_IDENTITY_RECOVERY_REVIEW])
    assert(Object.isFrozen(review));
  const source = await fs.readFile(new URL('./lib/native-sampling-identity-successor-source.mjs', import.meta.url), 'utf8');
  const start = source.indexOf('export function assertNativeIdentityBindingsFrozen('),
    end = source.indexOf('export function nativeIdentityMigration(', start);
  assert(start >= 0 && end > start);
  // Mutation of the actual pure guard bodies in the test only. No product
  // injection seam, substituted source reader, or admission callback exists.
  const guards = (binding, output, recovery) => Function('NATIVE_IDENTITY_BINDING_REVIEW',
    'NATIVE_IDENTITY_OUTPUT_REVIEW', 'NATIVE_IDENTITY_RECOVERY_REVIEW', 'NATIVE_IDENTITY_PREDECESSOR', 'SHA',
    source.slice(start, end).replaceAll('export ', '')
      + ';return [assertNativeIdentityBindingsFrozen,assertNativeIdentityOutputFrozen,assertNativeIdentityRecoveryFrozen];')(
    binding, output, recovery, NATIVE_IDENTITY_PREDECESSOR, /^[a-f0-9]{64}$/);
  const empty = value => Object.fromEntries(Object.keys(value).map(key => [key, null]));
  const blankBinding = guards(empty(NATIVE_IDENTITY_BINDING_REVIEW), NATIVE_IDENTITY_OUTPUT_REVIEW, NATIVE_IDENTITY_RECOVERY_REVIEW);
  for (const guard of blankBinding) assert.throws(guard, /NATIVE_SAMPLING_IDENTITY_BINDING_UNFROZEN/);
  const blankOutput = guards(NATIVE_IDENTITY_BINDING_REVIEW, empty(NATIVE_IDENTITY_OUTPUT_REVIEW), NATIVE_IDENTITY_RECOVERY_REVIEW);
  for (const guard of blankOutput.slice(1)) assert.throws(guard, /NATIVE_SAMPLING_IDENTITY_SQL_UNFROZEN/);
  const blankRecovery = guards(NATIVE_IDENTITY_BINDING_REVIEW, NATIVE_IDENTITY_OUTPUT_REVIEW, empty(NATIVE_IDENTITY_RECOVERY_REVIEW));
  assert.throws(blankRecovery[2], /NATIVE_SAMPLING_IDENTITY_RECOVERY_UNFROZEN/);
  const rendered = await buildNativeSamplingIdentityOriginalBindingSuccessor();
  const canonical = await readNativeIdentityCanonicalSource();
  assert.equal(canonical.canonicalSource, rendered.canonicalSource);
  assert.equal(rendered.migrationSha256, NATIVE_IDENTITY_OUTPUT_REVIEW.migrationSha256);
  assert.equal(rendered.canonicalSha256, NATIVE_IDENTITY_OUTPUT_REVIEW.canonicalSha256);
  assert.deepEqual(await fs.readFile(new URL('../supabase/migrations/' + nativeIdentityMigration().filename, import.meta.url)),
    Buffer.from(rendered.migration));
  const contracts = await nativeSamplingIdentityExpectedDatabaseContracts();
  assert.equal(contracts.checkpoint.sha256, NATIVE_IDENTITY_OUTPUT_REVIEW.checkpointContractSha256);
  assert.equal(contracts.trip.sha256, NATIVE_IDENTITY_OUTPUT_REVIEW.tripBindingPolicySha256);
  await assert.rejects(readNativeIdentityCanonicalSource({ sourceRoot: 'not-a-source-selector' }), /fixture seam/);
  await assert.rejects(buildNativeSamplingIdentityOriginalBindingSuccessor({ binding: rendered.binding }), /No caller/);
});

test('actual pure plan kernel enforces installed220 then sole230 then sole successor without historical grant replay', async () => {
  const source = await fs.readFile(new URL('./verify-native-sampling-identity-successor-plan.mjs', import.meta.url), 'utf8');
  const start = source.indexOf('function checkRows('), end = source.indexOf('export async function verifyNativeSamplingIdentitySuccessorPlan', start);
  assert(start >= 0 && end > start);
  const check = Function('assert', 'NATIVE_IDENTITY_PLAN_PHASES', 'NATIVE_IDENTITY_PREDECESSOR',
    source.slice(start, end) + '; return checkRows;')(assert, NATIVE_IDENTITY_PLAN_PHASES, NATIVE_IDENTITY_PREDECESSOR);
  // Synthetic version ONLY exercises plan ordering; not a frozen real target.
  const successor = { version: '20261016010000', filename: '20261016010000_native_sampling_identity_original_bound_successor.sql' };
  const old = NATIVE_IDENTITY_PREDECESSOR.currentGridVersion, statistics = NATIVE_IDENTITY_PREDECESSOR.statisticsVersion;
  const row = (local, remote = local) => ({ local, remote });
  const cases = [
    ['before-230', [row(old), row(statistics, null)], ['20261013230000_account_statistics_revision.sql']],
    ['after-230', [row(old), row(statistics)], []],
    ['before-binding', [row(old), row(statistics), row(successor.version, null)], [successor.filename]],
    ['after-binding', [row(old), row(statistics), row(successor.version)], []],
  ];
  for (const [phase, rows, dryRunFilenames] of cases) {
    const options = { phase, rows, dryRunFilenames, requiredVersions: [old], successor };
    assert.equal(check(options).installationPerformed, false);
    assert.throws(() => check({ ...options, rows: [...rows, row('20261017010000', null)] }));
    assert.throws(() => check({ ...options, rows: rows.filter(item => item.local !== old) }));
    assert.throws(() => check({ ...options, dryRunFilenames: [...dryRunFilenames, 'other.sql'] }));
  }
  assert.throws(() => check({ phase: 'before-binding', rows: [row(old), row(statistics, null), row(successor.version, null)],
    dryRunFilenames: ['20261013230000_account_statistics_revision.sql', successor.filename], requiredVersions: [old], successor }));
  assert.throws(() => check({ phase: 'before-230', rows: [row(old), row(statistics)],
    dryRunFilenames: [], requiredVersions: [old], successor }), /Exact installed phase predecessor/);
  assert.throws(() => check({ phase: 'before-230', rows: [row(old), row(statistics, null), row(successor.version)],
    dryRunFilenames: ['20261013230000_account_statistics_revision.sql'], requiredVersions: [old], successor }));
});

test('fresh exact readback recognizes crash-after230 and crash-afterbinding without replaying either SQL write', async () => {
  const source = await fs.readFile(new URL('./verify-native-sampling-identity-successor-plan.mjs', import.meta.url), 'utf8');
  const start = source.indexOf('function selectRows('), end = source.indexOf('function checkRows(', start);
  assert(start >= 0 && end > start);
  const select = Function('assert', 'NATIVE_IDENTITY_PREDECESSOR', source.slice(start, end)
    + '; return selectRows;')(assert, NATIVE_IDENTITY_PREDECESSOR);
  const old = NATIVE_IDENTITY_PREDECESSOR.currentGridVersion, statistics = NATIVE_IDENTITY_PREDECESSOR.statisticsVersion;
  const successor = { version: '20261016010000' }; // Synthetic plan identity, never production binding evidence.
  const base = [old, statistics, successor.version];
  for (const [installed, phase, sqlWriteRequired] of [
    [[old], 'before-230', true], [[old, statistics], 'before-binding', true],
    [[old, statistics, successor.version], 'after-binding', false],
  ]) {
    const rows = base.map(local => ({ local, remote: installed.includes(local) ? local : null }));
    assert.deepEqual(select({ rows, requiredVersions: [old], successor }),
      { phase, sqlWriteRequired, installationPerformed: false });
    assert.throws(() => select({ rows: [...rows, { local: '20261017010000', remote: '20261017010000' }], requiredVersions: [old], successor }));
  }
  assert.throws(() => select({ rows: [{ local: old, remote: old }, { local: statistics, remote: null },
    { local: successor.version, remote: successor.version }], requiredVersions: [old], successor }), /No binding before actual230/);
  assert.throws(() => select({ rows: [{ local: old, remote: old }, { local: statistics, remote: null }],
    requiredVersions: [old], successor }), /complete fixed read-only local source view/);
});

test('new I71 original-validator copies retain every real immutable220 byte outside names/calls/marker namespace', async () => {
  const source = await fs.readFile(new URL('./build-native-sampling-identity-original-binding-successor.mjs', import.meta.url), 'utf8');
  const start = source.indexOf("const CP = 'ravradar_ravscore_checkpoint_';"),
    end = source.indexOf('export async function buildNativeSamplingIdentityOriginalBindingSuccessor', start);
  assert(start >= 0 && end > start);
  const clone = Function('assert', 'definition', 'NATIVE_IDENTITY_ORIGINAL_NAMES',
    source.slice(start, end) + '; return cloneI71Original;')(assert, nativeIdentitySqlDefinition, NATIVE_IDENTITY_ORIGINAL_NAMES);
  const { canonicalSource } = await readCurrentGridCanonicalSource();
  for (const index of [0, 1]) {
    const result = clone(canonicalSource, index);
    assert.equal(result.name, NATIVE_IDENTITY_ORIGINAL_NAMES[index]);
    assert(result.before.includes(NATIVE_IDENTITY_PREDECESSOR.integrated));
    assert(result.definition.includes(NATIVE_IDENTITY_PREDECESSOR.integrated));
    if (index === 1) {
      assert(result.definition.includes(NATIVE_IDENTITY_PREDECESSOR.candidate));
      assert(result.definition.includes(NATIVE_IDENTITY_PREDECESSOR.continuation));
    }
    assert(!result.definition.includes('RAVSCORE_CHECKPOINT_'));
    assert.throws(() => clone(canonicalSource + '\n' + result.before, index));
  }
});

test('all six preserved and both new original validators keep strict properties and private ACL guards', async () => {
  const source = await fs.readFile(new URL('./build-native-sampling-identity-original-binding-successor.mjs', import.meta.url), 'utf8');
  const start = source.indexOf('function originalValidatorGuard('), end = source.indexOf('function cloneI71Original(', start);
  assert(start >= 0 && end > start);
  const guard = Function(source.slice(start, end) + ';return originalValidatorGuard;')();
  const oldNames = ['ffc', '249', 'c1ac'].flatMap(family => ['state', 'payload'].map(kind =>
    ['ravradar_ravscore_checkpoint_grid_' + family + '_' + kind + '_valid', kind]));
  const names = [...oldNames, ...NATIVE_IDENTITY_ORIGINAL_NAMES.map((name, index) => [name, index === 0 ? 'state' : 'payload'])];
  for (const [name, kind] of names) {
    const sig = 'public.' + name + '(jsonb,' + (kind === 'state' ? 'text' : 'timestamptz') + ')';
    const actual = guard(sig);
    for (const text of ['not p.prosecdef', "p.provolatile='s'", "'search_path=pg_catalog, public'=any(p.proconfig)",
      "not pg_catalog.has_function_privilege('anon',p.oid,'EXECUTE')",
      "not pg_catalog.has_function_privilege('authenticated',p.oid,'EXECUTE')", "pg_catalog.to_regprocedure('" + sig + "')"])
      assert(actual.includes(text), text);
  }
  assert.equal(source.match(/\.\.\.oldOriginals\.map\(source => originalValidatorGuard\(signature\(source\)\)\)/g)?.length, 2,
    'Existing original ACL checks run both before and after the transaction');
  assert(source.includes('...originals.map(row => originalValidatorGuard(row.signature))'));
});

test('recovery close witness uses actual owned fd EBADF, rejects no-op close and preserves the first Error object', async () => {
  const source = await fs.readFile(new URL('./native-sampling-identity-recovery-prewrite.mjs', import.meta.url), 'utf8');
  const start = source.indexOf('async function closed('), end = source.indexOf('async function digest(', start);
  assert(start >= 0 && end > start);
  const closed = Function('nativeFs', source.slice(start, end) + '; return closed;')(nativeFs);
  const parent = await fs.realpath(os.tmpdir());
  const root = await fs.mkdtemp(path.join(parent, 'rr-native-identity-close-'));
  try {
    const first = await fs.open(path.join(root, 'actual'), 'wx'); const fd = first.fd;
    await closed(first);
    assert.throws(() => nativeFs.fstatSync(fd), { code: 'EBADF' });
    const noop = await fs.open(path.join(root, 'noop'), 'wx');
    try { await assert.rejects(closed({ fd: noop.fd, async close() {} }), /PHYSICAL_CLOSE_UNPROVED/); }
    finally { await noop.close(); }
    const cause = new Error('first-owned-failure'), later = new Error('later-close-failure');
    const failing = await fs.open(path.join(root, 'first'), 'wx');
    await assert.rejects(closed({ fd: failing.fd, async close() { await failing.close(); throw later; } }, cause),
      error => error === cause);
  } finally {
    assert.equal(path.dirname(root), parent);
    assert(path.basename(root).startsWith('rr-native-identity-close-'));
    await fs.rm(root, { recursive: true });
  }
});
