import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { withIssuedAccountAssistantSource } from './check-account-assistant-issued-source.mjs';
import { withFrozenI71Source } from './check-native-identity-frozen-i71-source.mjs';
import {
  ACCOUNT_ASSISTANT_SOURCE_MIGRATION,
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

// All eleven original213 cases execute real issued exports and the real
// child import, never synthetic latest flags or rewritten import declarations.
// Extraction omits the delimiter's preceding LF; the issued whole-caller
// hash includes precisely that terminal LF, without trimming any body bytes.
assert.equal(crypto.createHash('sha256').update(source + '\n').digest('hex'),
  'c5549937ace91def8128702dac30a68a9068f5483d1dffb0c540975b3f1da5c1');
await withIssuedAccountAssistantSource(async issuedRoot => {
  const issuedWorkflow = await fs.readFile(path.join(issuedRoot,
    '.github/workflows/deploy-code-only-repair.yml'), 'utf8');
  assert.equal(crypto.createHash('sha256').update(issuedWorkflow).digest('hex'),
    '6c289d39f3ddbcd07e9036e7e377444ada59c277711954d1e5b59efab68d79be');
  const issuedStart = issuedWorkflow.indexOf(heading);
  assert.ok(issuedStart >= 0);
  assert.equal(issuedWorkflow.indexOf(heading, issuedStart + heading.length), -1);
  const issuedNext = issuedWorkflow.indexOf('\n      - name:', issuedStart + heading.length);
  assert.ok(issuedNext > issuedStart);
  const issuedBlock = issuedWorkflow.slice(issuedStart, issuedNext).match(
    /          node --input-type=module <<'NODE'\r?\n([\s\S]*?)\r?\n          NODE(?:\r?\n|$)/);
  assert.ok(issuedBlock);
  const issuedSource = issuedBlock[1].split(/\r?\n/).map(line => {
    assert.ok(line.startsWith('          '));
    return line.slice(10);
  }).join('\n');
  assert.equal(source, issuedSource, 'the whole current selector must remain the genuine issued213 caller');
  const { LATEST_REQUIRED_CUTOVER_MIGRATION, REQUIRED_CUTOVER_MIGRATIONS,
    TRIP_BINDING_POLICY_SOURCE_MIGRATION } = await import(pathToFileURL(
      path.join(issuedRoot, 'scripts/integrated-cutover-readiness.mjs')).href);
  const repositoryRoot = issuedRoot;
assert.equal(TRIP_BINDING_POLICY_SOURCE_MIGRATION.version, '20261010130000');
assert.equal(LATEST_REQUIRED_CUTOVER_MIGRATION.version, '20261013210000',
  'exercise the actual account/assistant successor, not a simulated latest flag');
const userdataIndex = REQUIRED_CUTOVER_MIGRATIONS.findIndex(item =>
  item.version === TRIP_BINDING_POLICY_SOURCE_MIGRATION.version);
assert.ok(userdataIndex > 0);
assert.equal(REQUIRED_CUTOVER_MIGRATIONS[userdataIndex - 1].version, '20261005000000');
const checkpointIndex = REQUIRED_CUTOVER_MIGRATIONS.findIndex(item =>
  item.version === '20261012200000');
assert.ok(checkpointIndex > userdataIndex);
assert.equal(checkpointIndex + 1, REQUIRED_CUTOVER_MIGRATIONS.length - 1,
  'the genuine 200000 predecessor must leave only the named 21310000 successor pending');

const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'ravradar-userdata-routing-'));
try {
  const output = path.join(directory, 'github-env.txt');
  const migrationList = path.join(directory, 'code-only-migrations-before.txt');
  async function runCase(appliedCount, optedIn, accountOptedIn = false) {
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
        RAVRADAR_ACCOUNT_ASSISTANT_UPGRADE_OPT_IN: accountOptedIn ? 'true' : 'false',
      },
    });
    assert.equal(result.error, undefined, 'the actual normal Node caller must execute');
    return { ...result, environment: await fs.readFile(output, 'utf8') };
  }

  for (const [appliedCount, accountOptedIn] of [
    [checkpointIndex + 1, true], [REQUIRED_CUTOVER_MIGRATIONS.length, false],
  ]) {
    const result = await runCase(appliedCount, false, accountOptedIn);
    assert.equal(result.status, 0, result.stderr || result.stdout);
    assert.match(result.environment, /^RAVRADAR_ASSISTANT_PREWRITE_REQUIRED=false$/m);
    assert.match(result.environment, /^RAVRADAR_USERDATA_PREWRITE_REQUIRED=false$/m,
      'the checkpoint repair must not replay the existing userdata installation');
    assert.match(result.environment, /^RAVRADAR_USERDATA_FINAL_REQUIRED=true$/m,
      'the later checkpoint migration must retain installed userdata storage readback');
    assert.match(result.environment, /^RAVRADAR_CHECKPOINT_CAS_METADATA_ONLY=false$/m,
      'the account successor must not impersonate the older checkpoint-only transition');
    assert.match(result.environment,
      new RegExp(`^RAVRADAR_ACCOUNT_ASSISTANT_PREWRITE_REQUIRED=${accountOptedIn}$`, 'm'));
    assert.match(result.environment, /^RAVRADAR_ACCOUNT_ASSISTANT_METADATA_ONLY=true$/m,
      'the actual account successor must require metadata-only reuse, not state recomputation');
    assert.match(result.environment, /^RAVRADAR_ACCOUNT_ASSISTANT_FINAL_REQUIRED=true$/m);
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
  for (const appliedCount of [userdataIndex + 1, checkpointIndex + 1]) {
    const missingAccountOptIn = await runCase(appliedCount, false);
    assert.equal(missingAccountOptIn.status, 1);
    assert.match(missingAccountOptIn.stderr, /Pending account\/assistant successor requires its named opt-in/);
    assert.doesNotMatch(missingAccountOptIn.environment, /RAVRADAR_ACCOUNT_ASSISTANT_PREWRITE_REQUIRED/);
    assert.doesNotMatch(missingAccountOptIn.environment, /RAVRADAR_ACCOUNT_ASSISTANT_METADATA_ONLY/);
  }
  for (const appliedCount of [userdataIndex + 1, REQUIRED_CUTOVER_MIGRATIONS.length]) {
    const unsupportedAccountUpgrade = await runCase(appliedCount, false, true);
    assert.equal(unsupportedAccountUpgrade.status, 1);
    assert.match(unsupportedAccountUpgrade.stderr,
      /Account\/assistant upgrade requires installed200000 and sole pending20261013210000; no replay/);
    assert.doesNotMatch(unsupportedAccountUpgrade.environment, /RAVRADAR_ACCOUNT_ASSISTANT_PREWRITE_REQUIRED/);
  }
  const combinedOptIns = await runCase(checkpointIndex + 1, true, true);
  assert.equal(combinedOptIns.status, 1);
  assert.match(combinedOptIns.stderr,
    /Userdata upgrade requires installed current050000 and sole pending130000; no intermediary or automatic replay/);
  assert.doesNotMatch(combinedOptIns.environment, /RAVRADAR_ACCOUNT_ASSISTANT_PREWRITE_REQUIRED/);
  console.log('Normal code-only userdata policy routing passed: 11 actual caller cases, no SQL or provider calls.');
} finally {
  // Only files created by this target in its own mkdtemp directory exist here.
  await fs.rm(directory, { recursive: true, force: true });
}
});


// Preserve the complete current220 partition against genuine fixed37 exports
// and child cwd. No old latest/model export is redefined in the current source.
let historicalRequiredVersions;
await withFrozenI71Source(async repositoryRoot => {
  const { ACCOUNT_ASSISTANT_SOURCE_MIGRATION, LATEST_REQUIRED_CUTOVER_MIGRATION,
    REQUIRED_CUTOVER_MIGRATIONS, TRIP_BINDING_POLICY_SOURCE_MIGRATION } = await import(
      pathToFileURL(path.join(repositoryRoot, 'scripts/integrated-cutover-readiness.mjs')).href);
  historicalRequiredVersions = REQUIRED_CUTOVER_MIGRATIONS.map(item => item.version);
assert.equal(LATEST_REQUIRED_CUTOVER_MIGRATION.version, '20261013220000');
assert.equal(ACCOUNT_ASSISTANT_SOURCE_MIGRATION.version, '20261013210000');
const currentAccountIndex = REQUIRED_CUTOVER_MIGRATIONS.findIndex(item =>
  item.version === ACCOUNT_ASSISTANT_SOURCE_MIGRATION.version);
const currentGridIndex = REQUIRED_CUTOVER_MIGRATIONS.findIndex(item =>
  item.version === LATEST_REQUIRED_CUTOVER_MIGRATION.version);
const currentUserdataIndex = REQUIRED_CUTOVER_MIGRATIONS.findIndex(item =>
  item.version === TRIP_BINDING_POLICY_SOURCE_MIGRATION.version);
assert.equal(currentAccountIndex + 1, currentGridIndex);
assert.equal(currentGridIndex + 1, REQUIRED_CUTOVER_MIGRATIONS.length);
assert.equal(REQUIRED_CUTOVER_MIGRATIONS[currentAccountIndex - 1].version, '20261012200000');
assert.ok(currentUserdataIndex > 0);
const currentDirectory = await fs.mkdtemp(path.join(os.tmpdir(), 'ravradar-current220-routing-'));
try {
  const output = path.join(currentDirectory, 'github-env.txt');
  const migrationList = path.join(currentDirectory, 'code-only-migrations-before.txt');
  async function runCurrentCase(appliedCount, optedIn, accountOptedIn = false) {
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
        RUNNER_TEMP: currentDirectory,
        GITHUB_ENV: output,
        RAVRADAR_USERDATA_UPGRADE_OPT_IN: optedIn ? 'true' : 'false',
        RAVRADAR_ACCOUNT_ASSISTANT_UPGRADE_OPT_IN: accountOptedIn ? 'true' : 'false',
      },
    });
    assert.equal(result.error, undefined, 'the actual current220 Node caller must execute');
    return { ...result, environment: await fs.readFile(output, 'utf8') };
  }
  for (const appliedCount of [currentGridIndex, REQUIRED_CUTOVER_MIGRATIONS.length]) {
    const neutral = await runCurrentCase(appliedCount, false);
    assert.equal(neutral.status, 0, neutral.stderr || neutral.stdout);
    for (const name of ['ASSISTANT_PREWRITE_REQUIRED', 'USERDATA_PREWRITE_REQUIRED',
      'CHECKPOINT_CAS_METADATA_ONLY', 'ACCOUNT_ASSISTANT_PREWRITE_REQUIRED',
      'ACCOUNT_ASSISTANT_METADATA_ONLY', 'ACCOUNT_ASSISTANT_FINAL_REQUIRED']) {
      assert.match(neutral.environment, new RegExp(`^RAVRADAR_${name}=false$`, 'm'));
    }
    assert.match(neutral.environment, /^RAVRADAR_USERDATA_FINAL_REQUIRED=true$/m);
    assert.doesNotMatch(neutral.environment, /CURRENT_GRID.*(?:VERIFIED|APPROVED)=true/,
      'neutral selector flags must not claim the separate current220 original/SQL prewrite proof');
  }
  const currentMissing = await runCurrentCase(currentUserdataIndex, false);
  assert.equal(currentMissing.status, 1);
  assert.match(currentMissing.stderr, /Pending userdata binding requires explicit existing-owner-export opt-in/);
  assert.doesNotMatch(currentMissing.environment, /RAVRADAR_USERDATA_FINAL_REQUIRED/);
  for (const appliedCount of [currentUserdataIndex, currentUserdataIndex + 1,
    REQUIRED_CUTOVER_MIGRATIONS.length]) {
    const replay = await runCurrentCase(appliedCount, true);
    assert.equal(replay.status, 1);
    assert.match(replay.stderr,
      /Userdata upgrade requires installed current050000 and sole pending130000; no intermediary or automatic replay/);
    assert.doesNotMatch(replay.environment, /RAVRADAR_USERDATA_FINAL_REQUIRED/);
    assert.doesNotMatch(replay.environment, /RAVRADAR_CHECKPOINT_CAS_METADATA_ONLY/);
  }
  for (const appliedCount of [currentGridIndex, REQUIRED_CUTOVER_MIGRATIONS.length]) {
    const accountReplay = await runCurrentCase(appliedCount, false, true);
    assert.equal(accountReplay.status, 1);
    assert.match(accountReplay.stderr,
      /Account\/assistant upgrade requires installed200000 and sole pending20261013210000; no replay/);
    assert.doesNotMatch(accountReplay.environment, /RAVRADAR_ACCOUNT_ASSISTANT_PREWRITE_REQUIRED/);
  }
  const combined = await runCurrentCase(currentGridIndex, true, true);
  assert.equal(combined.status, 1);
  assert.match(combined.stderr,
    /Userdata upgrade requires installed current050000 and sole pending130000; no intermediary or automatic replay/);
  assert.doesNotMatch(combined.environment, /RAVRADAR_ACCOUNT_ASSISTANT_PREWRITE_REQUIRED/);
  console.log('Current220 normal routing passed: 9 actual physical-source caller cases; no SQL admission, installs or provider calls.');
} finally {
  // Only this normal target's own mkdtemp files are removed.
  await fs.rm(currentDirectory, { recursive: true, force: true });
}

});

// The same unchanged selector runs on the actual NEW physical source. Its
// neutral flags neither install SQL nor authenticate an original/checkpoint.
assert.equal(LATEST_REQUIRED_CUTOVER_MIGRATION.version, '20261016060000');
assert.deepEqual(REQUIRED_CUTOVER_MIGRATIONS.map(item => item.version), [
  ...historicalRequiredVersions, '20261013230000', '20261016060000',
]);
assert.deepEqual(REQUIRED_CUTOVER_MIGRATIONS.slice(-5).map(item => item.version),
  ['20261012200000', '20261013210000', '20261013220000', '20261013230000', '20261016060000']);
const newDirectory = await fs.mkdtemp(path.join(os.tmpdir(), 'ravradar-native-identity-routing-'));
try {
  const output = path.join(newDirectory, 'github-env.txt');
  const migrationList = path.join(newDirectory, 'code-only-migrations-before.txt');
  async function runNewCase(lastInstalled, optedIn = false, accountOptedIn = false) {
    assert.ok(REQUIRED_CUTOVER_MIGRATIONS.some(item => item.version === lastInstalled));
    await fs.writeFile(migrationList,
      'Local | Remote | Time (UTC)\n' + REQUIRED_CUTOVER_MIGRATIONS.map(item =>
        item.version + ' | ' + (item.version <= lastInstalled ? item.version : '') + ' | fixture',
      ).join('\n') + '\n');
    await fs.writeFile(output, '');
    const result = spawnSync(process.execPath, ['--input-type=module', '-e', source], {
      cwd: repositoryRoot, encoding: 'utf8', timeout: 10_000,
      env: {
        ...(process.env.PATH ? { PATH: process.env.PATH } : {}),
        ...(process.env.SystemRoot ? { SystemRoot: process.env.SystemRoot } : {}),
        RUNNER_TEMP: newDirectory, GITHUB_ENV: output,
        RAVRADAR_USERDATA_UPGRADE_OPT_IN: optedIn ? 'true' : 'false',
        RAVRADAR_ACCOUNT_ASSISTANT_UPGRADE_OPT_IN: accountOptedIn ? 'true' : 'false',
      },
    });
    assert.equal(result.error, undefined, 'the actual NEW-source Node caller must execute');
    return { ...result, environment: await fs.readFile(output, 'utf8') };
  }
  for (const installed of ['20261013220000', '20261013230000', '20261016060000']) {
    const neutral = await runNewCase(installed);
    assert.equal(neutral.status, 0, neutral.stderr || neutral.stdout);
    for (const name of ['ASSISTANT_PREWRITE_REQUIRED', 'USERDATA_PREWRITE_REQUIRED',
      'CHECKPOINT_CAS_METADATA_ONLY', 'ACCOUNT_ASSISTANT_PREWRITE_REQUIRED',
      'ACCOUNT_ASSISTANT_METADATA_ONLY', 'ACCOUNT_ASSISTANT_FINAL_REQUIRED']) {
      assert.match(neutral.environment, new RegExp('^RAVRADAR_' + name + '=false$', 'm'));
    }
    assert.match(neutral.environment, /^RAVRADAR_USERDATA_FINAL_REQUIRED=true$/m);
    assert.doesNotMatch(neutral.environment, /CURRENT_GRID|STATISTICS_REVISION|NATIVE_IDENTITY|EPOCH|VERIFIED|APPROVED/,
      'this neutral selector cannot emit any later phase installation/original-admission receipt');
  }
  for (const [userdata, account, message] of [
    [true, false, /Userdata upgrade requires installed current050000 and sole pending130000; no intermediary or automatic replay/],
    [false, true, /Account\/assistant upgrade requires installed200000 and sole pending20261013210000; no replay/],
    [true, true, /Userdata upgrade requires installed current050000 and sole pending130000; no intermediary or automatic replay/],
  ]) {
    const refused = await runNewCase('20261013230000', userdata, account);
    assert.equal(refused.status, 1);
    assert.match(refused.stderr, message);
    assert.doesNotMatch(refused.environment, /^RAVRADAR_.*(?:PREWRITE_REQUIRED|METADATA_ONLY)=true$/m);
    assert.doesNotMatch(refused.environment, /CURRENT_GRID|STATISTICS_REVISION|NATIVE_IDENTITY|EPOCH|VERIFIED|APPROVED/);
  }
  console.log('Native-identity normal routing passed: 6 actual current-source caller cases; no SQL/original admission or provider calls.');
} finally {
  // Only this target's own migration-list and environment files exist here.
  await fs.rm(newDirectory, { recursive: true, force: true });
}
