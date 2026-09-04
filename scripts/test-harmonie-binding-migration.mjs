import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { ravScoreModelBinding } from '../js/core/ravscore-model-contract.js';
import { ravScoreModelBinding as rollbackBinding } from './rollback-assets/ravscore-model-contract.js';
import { ravScoreContinuationImplementationSha256 } from './lib/ravscore-continuation-implementation-contract.mjs';

const read = async name => (await fs.readFile(`supabase/migrations/${name}.sql`, 'utf8')).replaceAll('\r\n', '\n');
const body = source => {
  const start = "begin;\nset local lock_timeout = '5s';";
  const end = "notify pgrst, 'reload schema';\ncommit;";
  assert.equal(source.split(start).length, 2);
  assert.equal(source.split(end).length, 2);
  return source.slice(source.indexOf(start) + start.length, source.lastIndexOf(end)).trim();
};
let expected = body(await read('20260901010000_integrated_trip_measured_warmup_admission'))
  + '\n\n' + body(await read('20260903010000_ravscore_checkpoint_metadata_cas'));
for (const [before, after, count] of [
  ['d5796289f645f1bcab6b4fe822c5ed6b0e919321013687302feb2139e814a286', ravScoreModelBinding().modelBundleSha256, 3],
  ['7c7f2b4950b4ce7a04d560dde15dd93e408e045ca5e9ed4f9be33eac0255e89d', rollbackBinding().modelBundleSha256, 2],
  ['35c45f8f1f701695923b3195d60a6b8931aad4d2d08b05c93900b88401eca95c', await ravScoreContinuationImplementationSha256(), 1],
  ['20260903010000', '20260904140000', 2],
]) {
  assert.equal(expected.split(before).length - 1, count);
  expected = expected.replaceAll(before, after);
}
assert.equal(body(await read('20260904140000_harmonie_wind_reference_binding')), expected,
  'Wind migration must change only exact seals/readback version, never SQL behaviour or row data');
console.log('HARMONIE append-only migration: exact binding-only forward copy verified.');
