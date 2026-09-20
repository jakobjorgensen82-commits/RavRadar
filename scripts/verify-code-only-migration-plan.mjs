#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  LATEST_REQUIRED_CUTOVER_MIGRATION,
  REQUIRED_CUTOVER_MIGRATIONS,
  assertSupabaseMigrationPlan,
} from './integrated-cutover-readiness.mjs';

function argument(name) {
  const index = process.argv.indexOf(name);
  if (index < 0 || !process.argv[index + 1]) throw new Error('Missing ' + name);
  return process.argv[index + 1];
}

const latest = LATEST_REQUIRED_CUTOVER_MIGRATION;
assert.equal(latest.version, '20260920220000');
assert.equal(latest.filename, '20260920220000_public_hour_pack_capacity_binding.sql');
const plan = await assertSupabaseMigrationPlan({
  migrationListText: await fs.readFile(argument('--migration-list'), 'utf8'),
  dryRunText: await fs.readFile(argument('--dry-run'), 'utf8'),
  migrationsDirectory: path.resolve(argument('--migrations-directory')),
});
assert.ok(
  plan.pendingVersions.length === 0
    || (plan.pendingVersions.length === 1 && plan.pendingVersions[0] === latest.version),
  'Code-only deployment may apply only the approved public-hour delivery binding successor',
);
console.log(
  plan.pendingVersions.length === 0
    ? 'Code-only migration is already applied; retry is safe.'
    : 'Code-only migration dry-run contains exactly the one expected public-hour delivery binding successor.',
);
