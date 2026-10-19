import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import test from 'node:test';
import { assertOrdinaryCompletedStageSource, assertOrdinaryCompletedStageCommittedSource, ordinaryStageCalculationWorkflow }
  from './ordinary-completed-stage-source.mjs';

const sha = value => crypto.createHash('sha256').update(value).digest('hex');

test('committed source reuse compares all calculation objects and only exact storage relocation', async t => {
  const parent = await fs.realpath(os.tmpdir());
  const root = await fs.mkdtemp(path.join(parent, 'rr-ordinary-stage-source-'));
  t.after(async () => {
    assert.equal(path.dirname(root), parent);
    assert(path.basename(root).startsWith('rr-ordinary-stage-source-'));
    assert((await fs.lstat(root)).isDirectory());
    assert.equal((await fs.lstat(root)).isSymbolicLink(), false);
    await fs.rm(root, { recursive: true, force: true });
  });
  const git = (...args) => execFileSync('git', ['-C', root,
    '-c', 'user.name=RavRadar synthetic source test',
    '-c', 'user.email=synthetic@example.invalid', '-c', 'commit.gpgsign=false',
    '-c', 'core.autocrlf=false', '-c', 'core.hooksPath=NUL', ...args],
  { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true }).trim();
  const write = async (file, bytes) => {
    const destination = path.join(root, file);
    await fs.mkdir(path.dirname(destination), { recursive: true });
    await fs.writeFile(destination, bytes);
  };
  const commit = message => { git('add', '-A'); git('commit', '-m', message); return git('rev-parse', 'HEAD'); };
  const actual = Buffer.from((await fs.readFile(new URL('../.github/workflows/reusable-weather-build.yml', import.meta.url), 'utf8'))
    .replaceAll('\r\n', '\n'));
  const previous = ordinaryStageCalculationWorkflow(actual);
  const actualOnce = Buffer.from((await fs.readFile(new URL('../.github/workflows/run-current-weather-once.yml', import.meta.url), 'utf8'))
    .replaceAll('\r\n', '\n'));
  const previousOnce = ordinaryStageCalculationWorkflow(actualOnce);
  assert.equal(sha(previous), 'f0254a092c0baa188370c207b218e15ad7c9e616138d15234e6f323f101178c6');
  assert.equal(sha(previousOnce), '445964fbbc697ec86848744a9413897d3418b011c4218fb10336734b5e5055a2');
  assert.notDeepEqual(previous, actual, 'The current exact relocation is a real source delta.');
  git('init', '-b', 'main');
  await write('.github/workflows/reusable-weather-build.yml', previous);
  await write('.github/workflows/run-current-weather-once.yml', previousOnce);
  await write('scripts/update-weather.mjs', '// SYNTHETIC unchanged calculation input\n');
  await write('data/admin/coastal-fixture.json', '{"synthetic":true,"onshore":90}\n');
  await write('js/core/model-fixture.js', 'export const synthetic = 1;\n');
  const book = 'docs/handbook/content.json';
  const install = 'supabase/INSTALL-RAVRADAR-4.0.56-SECURITY.sql';
  const oldBook = { synthetic: "Original handbook's text" };
  const newBook = { synthetic: "Reviewed handbook's updated text" };
  const sql = value => "-- SYNTHETIC unchanged SQL\ninsert into public.admin_documents(document_key,payload,updated_by) "
    + `values('handbook','${JSON.stringify(value).replaceAll("'", "''")}'::jsonb,null)\n`
    + 'on conflict(document_key) do nothing;\n';
  await write(book, JSON.stringify(oldBook));
  await write(install, sql(oldBook));
  const producerHead = commit('synthetic committed producer');
  const same = assertOrdinaryCompletedStageSource({ root, producerHead, consumerHead: producerHead });
  assert.equal(same.publicationAuthorized, false);
  assert.equal(same.payloadAuthenticated, false);
  await write('.github/workflows/reusable-weather-build.yml', actual);
  await write('.github/workflows/run-current-weather-once.yml', actualOnce);
  await write('scripts/ordinary-completed-stage-artifact.mjs', '// SYNTHETIC new delivery-only helper\n');
  await write('docs/rdks/90_INDEX/CURRENT_TRUTH.md', 'SYNTHETIC source preparation, not production.\n');
  const consumerHead = commit('synthetic transport-only successor');
  const positive = assertOrdinaryCompletedStageSource({ root, producerHead, consumerHead });
  assert.equal(positive.invertedWorkflows, 2);
  assert.equal(positive.deliveryPaths, 2);
  assert.equal(positive.storedAbiAloneUsed, false);
  assert.equal(positive.publicationAuthorized, false);
  await write(book, JSON.stringify(newBook));
  await write(install, sql(newBook));
  const docsHead = commit('synthetic handbook and exact installer seed successor');
  assert.equal(assertOrdinaryCompletedStageSource({ root, producerHead, consumerHead: docsHead }).deliveryPaths, 4);
  let sqlRefused = 0;
  for (const [content, code] of [
    [sql(newBook) + '-- SYNTHETIC SQL outside handbook changed\n', 'ORDINARY_STAGE_SOURCE_CALCULATION_DRIFT'],
    [sql(oldBook), 'ORDINARY_STAGE_SOURCE_DOCUMENTATION_SQL'],
    [sql(newBook) + sql(newBook), 'ORDINARY_STAGE_SOURCE_DOCUMENTATION_SQL'],
  ]) {
    await write(install, content);
    const badHead = commit('synthetic invalid SQL or seed successor');
    assert.throws(() => assertOrdinaryCompletedStageSource({ root, producerHead, consumerHead: badHead }), { code });
    sqlRefused++;
    git('switch', '--detach', docsHead);
  }
  git('switch', '--detach', consumerHead);
  const changes = [
    ['scripts/update-weather.mjs', '// SYNTHETIC changed calculation\n'],
    ['js/core/model-fixture.js', 'export const synthetic = 2;\n'],
    ['data/admin/coastal-fixture.json', '{"synthetic":true,"onshore":180}\n'],
    ['scripts/new-unreviewed-input.mjs', '// SYNTHETIC unreviewed input\n'],
    ['.github/workflows/reusable-weather-build.yml', Buffer.concat([actual, Buffer.from('\n# SYNTHETIC unreviewed workflow edit\n')])],
    ['.github/workflows/run-current-weather-once.yml', Buffer.concat([actualOnce, Buffer.from('\n# SYNTHETIC unreviewed caller edit\n')])],
  ];
  let refused = 0;
  for (const [file, bytes] of changes) {
    await write(file, bytes);
    const changedHead = commit('synthetic deliberately incompatible successor');
    assert.throws(() => assertOrdinaryCompletedStageSource({ root, producerHead, consumerHead: changedHead }),
      { code: 'ORDINARY_STAGE_SOURCE_CALCULATION_DRIFT' });
    refused++;
    git('switch', '--detach', consumerHead);
  }
  await fs.unlink(path.join(root, 'scripts/update-weather.mjs'));
  let changedHead = commit('synthetic deliberately deleted calculation input');
  assert.throws(() => assertOrdinaryCompletedStageSource({ root, producerHead, consumerHead: changedHead }),
    { code: 'ORDINARY_STAGE_SOURCE_CALCULATION_DRIFT' });
  refused++;
  git('switch', '--detach', consumerHead);
  await write('data/admin/coastal-fixture.json', '{"synthetic":true,"hydrated":true}\n');
  assert.throws(() => assertOrdinaryCompletedStageSource({ root, producerHead, consumerHead }),
    { code: 'ORDINARY_STAGE_SOURCE_NOT_CLEAN_HEAD' });
  assert.deepEqual(assertOrdinaryCompletedStageCommittedSource({ root, producerHead, consumerHead }), positive,
    'After normal hydration re-read the real Git operands; JSON/source results grant no payload authority.');
  refused++;
  commit('synthetic owned hydration fixture cleanup');
  git('switch', '--detach', consumerHead);
  git('update-index', '--chmod=+x', 'scripts/ordinary-completed-stage-artifact.mjs');
  git('commit', '-m', 'synthetic executable delivery mode is refused');
  changedHead = git('rev-parse', 'HEAD');
  assert.throws(() => assertOrdinaryCompletedStageSource({ root, producerHead, consumerHead: changedHead }),
    { code: 'ORDINARY_STAGE_SOURCE_DELIVERY_MODE' });
  refused++;
  git('switch', '--detach', consumerHead);
  await write('scripts/update-weather.mjs', '// SYNTHETIC uncommitted drift\n');
  assert.throws(() => assertOrdinaryCompletedStageSource({ root, producerHead, consumerHead }),
    { code: 'ORDINARY_STAGE_SOURCE_NOT_CLEAN_HEAD' });
  refused++;
  // Commit this owned fixture change before switching; never reset user files.
  commit('synthetic owned dirty-state fixture cleanup');
  git('switch', '--detach', consumerHead);
  assert.throws(() => assertOrdinaryCompletedStageSource({ root, producerHead: consumerHead, consumerHead: producerHead }),
    { code: 'ORDINARY_STAGE_SOURCE_NOT_CLEAN_HEAD' });
  refused++;
  assert.throws(() => assertOrdinaryCompletedStageSource({ root, producerHead: '0'.repeat(40), consumerHead }),
    { code: 'ORDINARY_STAGE_SOURCE_GIT' });
  refused++;
  const unrelatedHead = git('commit-tree', git('rev-parse', `${consumerHead}^{tree}`), '-m',
    'synthetic identical tree without producer ancestry');
  git('switch', '--detach', unrelatedHead);
  assert.throws(() => assertOrdinaryCompletedStageSource({ root, producerHead, consumerHead: unrelatedHead }),
    { code: 'ORDINARY_STAGE_SOURCE_GIT' });
  refused++;
  git('switch', '--detach', consumerHead);
  assert.equal(assertOrdinaryCompletedStageSource({ root, producerHead, consumerHead }).consumerHead, consumerHead);
  console.log(JSON.stringify({ kind: 'ORDINARY_STAGE_SOURCE_CONTRACT', positive: 5, refused: refused + sqlRefused,
    realGitObjects: true, originalFullWorkflowRestored: true,
    networkPerformed: false, payloadAuthenticated: false, publicationAuthorized: false }));
});
