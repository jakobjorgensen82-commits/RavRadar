#!/usr/bin/env node
// Plan verification only. No db push, fallback grant, arbitrary path or install.
import assert from 'node:assert/strict';
import {
  NATIVE_IDENTITY_PREDECESSOR, assertNativeIdentityOutputFrozen,
  nativeIdentityMigration,
} from './lib/native-sampling-identity-successor-source.mjs';

export const NATIVE_IDENTITY_PLAN_PHASES = Object.freeze([
  'before-230', 'after-230', 'before-binding', 'after-binding',
]);
function selectRows({ rows, requiredVersions, successor }) {
  const local = rows.map(row => row.local).filter(Boolean), remote = rows.map(row => row.remote).filter(Boolean);
  assert.equal(new Set(local).size, local.length); assert.equal(new Set(remote).size, remote.length);
  for (const version of requiredVersions) assert(local.includes(version) && remote.includes(version),
    'Every historical required migration must really be installed');
  for (const row of rows) {
    const version = row.local ?? row.remote;
    if (version <= NATIVE_IDENTITY_PREDECESSOR.currentGridVersion) assert.equal(row.local, row.remote);
    else assert([NATIVE_IDENTITY_PREDECESSOR.statisticsVersion, successor.version].includes(version),
      'Unknown later migration; never infer a successful write');
  }
  assert(local.includes(NATIVE_IDENTITY_PREDECESSOR.statisticsVersion) && local.includes(successor.version),
    'Phase selection requires the complete fixed read-only local source view');
  const latest = [...remote].sort().at(-1);
  let phase;
  if (latest === NATIVE_IDENTITY_PREDECESSOR.currentGridVersion) phase = 'before-230';
  else if (latest === NATIVE_IDENTITY_PREDECESSOR.statisticsVersion) phase = 'before-binding';
  else {
    assert.equal(latest, successor.version, 'Unknown installed recovery phase');
    assert(remote.includes(NATIVE_IDENTITY_PREDECESSOR.statisticsVersion), 'No binding before actual230');
    phase = 'after-binding';
  }
  assert(remote.every(version => local.includes(version)), 'No missing local historical source');
  return Object.freeze({ phase, sqlWriteRequired: phase !== 'after-binding', installationPerformed: false });
}
function checkRows({ phase, rows, dryRunFilenames, requiredVersions, successor }) {
  assert(NATIVE_IDENTITY_PLAN_PHASES.includes(phase));
  const binding = phase === 'before-binding' || phase === 'after-binding';
  const installed = phase === 'after-230' || phase === 'after-binding';
  const statistics = NATIVE_IDENTITY_PREDECESSOR.statisticsVersion;
  const destination = binding ? successor.version : statistics;
  const predecessor = binding ? statistics : NATIVE_IDENTITY_PREDECESSOR.currentGridVersion;
  const local = rows.map(row => row.local).filter(Boolean).sort();
  const remote = rows.map(row => row.remote).filter(Boolean).sort();
  assert.equal(new Set(local).size, local.length); assert.equal(new Set(remote).size, remote.length);
  for (const version of requiredVersions) {
    assert(local.includes(version) && remote.includes(version), 'Every old migration must already be installed: ' + version);
  }
  for (const row of rows) {
    const version = row.local ?? row.remote;
    if (version <= NATIVE_IDENTITY_PREDECESSOR.currentGridVersion) assert.equal(row.local, row.remote,
      'No historical migration can be installed, removed or relabelled in recovery');
    else assert([statistics, ...(binding ? [successor.version] : [])].includes(version),
      'Unknown or out-of-phase later migration');
  }
  if (binding) assert(local.includes(statistics) && remote.includes(statistics), 'Binding follows actual installed230');
  assert(local.includes(destination), 'The sole fixed destination must be present locally');
  assert.equal(remote.at(-1), installed ? destination : predecessor, 'Exact installed phase predecessor required');
  const pending = local.filter(version => !remote.includes(version));
  assert.deepEqual(pending, installed ? [] : [destination], 'Exactly one named migration; no replay or combined grant');
  assert(remote.every(version => local.includes(version)), 'No missing local historical migration');
  assert.deepEqual(dryRunFilenames, installed ? [] : [binding ? successor.filename
    : '20261013230000_account_statistics_revision.sql']);
  return Object.freeze({ phase, pendingVersions: Object.freeze(pending), predecessor, destination,
    installationPerformed: false });
}
export async function verifyNativeSamplingIdentitySuccessorPlan(options) {
  assertNativeIdentityOutputFrozen(); // FIRST, before parsing input or loading normal readers.
  assert.equal(arguments.length, 1);
  assert(options && Object.getPrototypeOf(options) === Object.prototype);
  assert.deepEqual(Object.keys(options).sort(), ['dryRunText', 'migrationListText', 'phase']);
  const normal = await import('./integrated-cutover-readiness.mjs');
  const requiredVersions = normal.REQUIRED_CUTOVER_MIGRATIONS
    .map(row => row.version).filter(version => version <= NATIVE_IDENTITY_PREDECESSOR.currentGridVersion);
  assert.equal(requiredVersions.at(-1), NATIVE_IDENTITY_PREDECESSOR.currentGridVersion);
  return checkRows({ phase: options.phase,
    rows: normal.parseSupabaseMigrationList(options.migrationListText),
    dryRunFilenames: normal.parseSupabaseDryRunMigrationFilenames(options.dryRunText),
    requiredVersions, successor: nativeIdentityMigration() });
}
export async function selectNativeSamplingIdentityRecoveryPhase(options) {
  assertNativeIdentityOutputFrozen();
  assert.equal(arguments.length, 1);
  assert(options && Object.getPrototypeOf(options) === Object.prototype);
  assert.deepEqual(Object.keys(options), ['migrationListText']);
  const normal = await import('./integrated-cutover-readiness.mjs');
  const requiredVersions = normal.REQUIRED_CUTOVER_MIGRATIONS.map(row => row.version)
    .filter(version => version <= NATIVE_IDENTITY_PREDECESSOR.currentGridVersion);
  assert.equal(requiredVersions.at(-1), NATIVE_IDENTITY_PREDECESSOR.currentGridVersion);
  return selectRows({ rows: normal.parseSupabaseMigrationList(options.migrationListText),
    requiredVersions, successor: nativeIdentityMigration() });
}
