import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import test from 'node:test';
import {fileURLToPath} from 'node:url';
import {analyzeSourceDomainInputs} from './source-impact-domain-inputs.mjs';
import {ACCOUNT_AUTOMATIC_OFF_MIGRATIONS} from './lib/account-automatic-off-source.mjs';

test('current automatic account OFF inventory binds both SQL files and the source helper', () => {
  const cwd = fileURLToPath(new URL('../', import.meta.url));
  const head = execFileSync('git', ['rev-parse', 'HEAD'], {
    cwd, encoding:'utf8', timeout:10_000,
  }).trim();
  const result = analyzeSourceDomainInputs({baselineCommit:head,candidateCommit:head,expectedHead:head});
  assert.equal(result.status, 'DOMAIN_ANALYSIS_NOT_GATE_AUTHORITY');
  for (const key of ['baselineQualified','skipAuthorized','postgresExecuted','sqliteExecuted',
    'historicalNationalExecuted','productionAuthority']) assert.equal(result[key], false);
  assert.equal(result.analysis, 'COMPLETE', result.failureCode);
  const {before, after, unchanged} = result.actualPostgresInput;
  assert.equal(after.sqlFiles, 85);
  assert.equal(unchanged, true);
  assert.deepEqual(after, before);
  for (const {filename,sha256} of ACCOUNT_AUTOMATIC_OFF_MIGRATIONS) {
    assert.equal(after.files.find(row => row.file === 'supabase/migrations/' + filename)?.sha256, sha256);
  }
  assert.match(after.files.find(row => row.file === 'scripts/lib/account-automatic-off-source.mjs')?.sha256,
    /^[a-f0-9]{64}$/);
});
