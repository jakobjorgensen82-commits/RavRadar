#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  LATEST_REQUIRED_CUTOVER_MIGRATION,
  REQUIRED_CUTOVER_MIGRATIONS,
  ACCOUNT_ASSISTANT_SOURCE_MIGRATION,
  assertSupabaseMigrationPlan,
} from './integrated-cutover-readiness.mjs';

function argument(name) {
  const index = process.argv.indexOf(name);
  if (index < 0 || !process.argv[index + 1]) throw new Error('Missing ' + name);
  return process.argv[index + 1];
}

const latest = LATEST_REQUIRED_CUTOVER_MIGRATION;
assert.equal(latest, REQUIRED_CUTOVER_MIGRATIONS.at(-1));
const plan = await assertSupabaseMigrationPlan({
  migrationListText: await fs.readFile(argument('--migration-list'), 'utf8'),
  dryRunText: await fs.readFile(argument('--dry-run'), 'utf8'),
  migrationsDirectory: path.resolve(argument('--migrations-directory')),
  allowAccountAssistantPrewritePlan: process.argv.includes('--account-assistant-prewrite-plan'),
});
if (process.argv.includes('--require-prewrite-gate')
    && plan.pendingVersions.includes('20261010120000')) {
  assert.equal(process.env.RAVRADAR_ASSISTANT_PREWRITE_REQUIRED, 'true',
    'The pending assistant binding requires the completed normal original-preservation path');
}
if (plan.pendingVersions.includes('20261010130000')) {
  assert.equal(process.env.RAVRADAR_USERDATA_UPGRADE_OPT_IN, 'true',
    'The pending userdata binding requires explicit existing-owner-export opt-in');
  assert.ok(process.argv.includes('--require-prewrite-gate')
    && process.env.RAVRADAR_USERDATA_PREWRITE_REQUIRED === 'true'
    && process.env.RAVRADAR_USERDATA_PREWRITE_VERIFIED === 'true',
    'The pending userdata binding requires the completed normal original-preservation path');
}
if (plan.pendingVersions.includes(ACCOUNT_ASSISTANT_SOURCE_MIGRATION.version)) {
  assert.equal(process.env.RAVRADAR_ACCOUNT_ASSISTANT_UPGRADE_OPT_IN, 'true',
    'Pending account/assistant binding requires its named opt-in');
  assert.ok(process.argv.includes('--account-assistant-prewrite-plan')
    && process.argv.includes('--require-prewrite-gate')
    && process.env.RAVRADAR_ACCOUNT_ASSISTANT_PREWRITE_REQUIRED === 'true'
    && process.env.RAVRADAR_ACCOUNT_ASSISTANT_PREWRITE_VERIFIED === 'true',
    'Pending account/assistant binding requires actual same-original prewrite proof');
}
if (process.argv.includes('--expected-pending-version')) {
  const expected = argument('--expected-pending-version');
  assert.equal(expected, ACCOUNT_ASSISTANT_SOURCE_MIGRATION.version,
    'Only the fixed account/assistant pending version can be pinned');
  assert.deepEqual(plan.pendingVersions, [expected],
    'Pending plan changed or is already applied; do not reuse a one-install grant');
}
assert.ok(
  plan.pendingVersions.length === 0
    || (plan.pendingVersions.length === 1 && plan.pendingVersions[0] === latest.version),
  'Code-only deployment may apply only the exact latest required integrated migration',
);
console.log(
  plan.pendingVersions.length === 0
    ? 'Code-only migration is already applied; retry is safe.'
    : `Code-only migration dry-run contains exactly ${latest.filename}.`,
);
