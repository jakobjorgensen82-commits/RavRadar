import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import {
  LATEST_REQUIRED_CUTOVER_MIGRATION,
  REQUIRED_CUTOVER_MIGRATIONS,
  TRIP_BINDING_POLICY_SOURCE_MIGRATION,
} from './integrated-cutover-readiness.mjs';

const repositoryRoot = fileURLToPath(new URL('../', import.meta.url));
const workflow = await fs.readFile(path.join(repositoryRoot,
  '.github/workflows/deploy-code-only-repair.yml'), 'utf8');
const heading = '      - name: Require originals before the pending assistant binding';
const start = workflow.indexOf(heading);
assert.ok(start >= 0, 'the normal original-preservation caller must exist');
assert.equal(workflow.indexOf(heading, start + heading.length), -1,
  'the normal original-preservation caller must be unique');
const next = workflow.indexOf('\n      - name:', start + heading.length);
assert.ok(next > start, 'the normal caller must have a bounded step');
const step = workflow.slice(start, next);
const block = step.match(/          node --input-type=module <<'NODE'\r?\n([\s\S]*?)\r?\n          NODE(?:\r?\n|$)/);
assert.ok(block, 'the normal caller must retain its real Node entry');
const source = block[1].split(/\r?\n/).map(line => {
  assert.ok(line.startsWith('          '), 'the real caller indentation must be exact');
  return line.slice(10);
}).join('\n');
const migrationHeading = '      - name: Rebind saved private runtime to current source without changing measurements';
const migrationStart = workflow.indexOf(migrationHeading);
assert.ok(migrationStart >= 0);
assert.equal(workflow.indexOf(migrationHeading, migrationStart + migrationHeading.length), -1);
const migrationEnd = workflow.indexOf('\n      - name:', migrationStart + migrationHeading.length);
assert.ok(migrationEnd > migrationStart);
const migrationStep = workflow.slice(migrationStart, migrationEnd);
assert.match(migrationStep,
  /if test "\$\{RAVRADAR_CHECKPOINT_CAS_METADATA_ONLY:-false\}" = "true"; then\r?\n\s+test "\$\{\{ steps\.owner-current-original\.outputs\.transition_kind \}\}" != "owner-current-domain-original"\r?\n\s+migration_args\+=\(--metadata-only\)\r?\n\s+fi/,
  'the actual normal migration entry must require its existing metadata-only validator');
assert.match(migrationStep, /node scripts\/migrate-post-cutover-private-runtime\.mjs[\s\S]*"\$\{migration_args\[@\]\}"/);

assert.equal(TRIP_BINDING_POLICY_SOURCE_MIGRATION.version, '20261010130000');
assert.equal(LATEST_REQUIRED_CUTOVER_MIGRATION.version, '20261012200000',
  'exercise the actual checkpoint-only successor, not a simulated latest flag');
const userdataIndex = REQUIRED_CUTOVER_MIGRATIONS.findIndex(item =>
  item.version === TRIP_BINDING_POLICY_SOURCE_MIGRATION.version);
assert.ok(userdataIndex > 0);
assert.equal(REQUIRED_CUTOVER_MIGRATIONS[userdataIndex - 1].version, '20261005000000');

const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'ravradar-userdata-routing-'));
try {
  const output = path.join(directory, 'github-env.txt');
  const migrationList = path.join(directory, 'code-only-migrations-before.txt');
  async function runCase(appliedCount, optedIn) {
    await fs.writeFile(migrationList,
      `Local | Remote | Time (UTC)\n${REQUIRED_CUTOVER_MIGRATIONS.map((item, index) =>
        `${item.version} | ${index < appliedCount ? item.version : ''} | fixture`).join('\n')}\n`);
    await fs.writeFile(output, '');
    const result = spawnSync(process.execPath, ['--input-type=module', '-e', source], {
      cwd: repositoryRoot,
      encoding: 'utf8',
      timeout: 10_000,
      env: {
        ...(process.env.PATH ? { PATH: process.env.PATH } : {}),
        ...(process.env.SystemRoot ? { SystemRoot: process.env.SystemRoot } : {}),
        RUNNER_TEMP: directory,
        GITHUB_ENV: output,
        RAVRADAR_USERDATA_UPGRADE_OPT_IN: optedIn ? 'true' : 'false',
      },
    });
    assert.equal(result.error, undefined, 'the actual normal Node caller must execute');
    return { ...result, environment: await fs.readFile(output, 'utf8') };
  }

  for (const appliedCount of [userdataIndex + 1, REQUIRED_CUTOVER_MIGRATIONS.length]) {
    const result = await runCase(appliedCount, false);
    assert.equal(result.status, 0, result.stderr || result.stdout);
    assert.match(result.environment, /^RAVRADAR_ASSISTANT_PREWRITE_REQUIRED=false$/m);
    assert.match(result.environment, /^RAVRADAR_USERDATA_PREWRITE_REQUIRED=false$/m,
      'the checkpoint repair must not replay the existing userdata installation');
    assert.match(result.environment, /^RAVRADAR_USERDATA_FINAL_REQUIRED=true$/m,
      'the later checkpoint migration must retain installed userdata storage readback');
    assert.match(result.environment, /^RAVRADAR_CHECKPOINT_CAS_METADATA_ONLY=true$/m,
      'the actual successor must require metadata-only reuse, not state recomputation');
  }

  const missing = await runCase(userdataIndex, false);
  assert.equal(missing.status, 1);
  assert.match(missing.stderr, /Pending userdata binding requires explicit existing-owner-export opt-in/);
  assert.doesNotMatch(missing.environment, /RAVRADAR_USERDATA_FINAL_REQUIRED/);
  assert.doesNotMatch(missing.environment, /RAVRADAR_CHECKPOINT_CAS_METADATA_ONLY/);

  for (const appliedCount of [userdataIndex, userdataIndex + 1,
    REQUIRED_CUTOVER_MIGRATIONS.length]) {
    const replay = await runCase(appliedCount, true);
    assert.equal(replay.status, 1);
    assert.match(replay.stderr,
      /Userdata upgrade requires installed current050000 and sole pending130000; no intermediary or automatic replay/);
    assert.doesNotMatch(replay.environment, /RAVRADAR_USERDATA_FINAL_REQUIRED/);
    assert.doesNotMatch(replay.environment, /RAVRADAR_CHECKPOINT_CAS_METADATA_ONLY/);
  }
  console.log('Normal code-only userdata policy routing passed: 6 actual caller cases, no SQL or provider calls.');
} finally {
  // Only files created by this target in its own mkdtemp directory exist here.
  await fs.rm(directory, { recursive: true, force: true });
}
