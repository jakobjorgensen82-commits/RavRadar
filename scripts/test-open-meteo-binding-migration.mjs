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
let expected = body(await read('20260904140000_harmonie_wind_reference_binding'));
for (const [before, after, count] of [
  ['5c523675393981cea770b8bec62e8287130206f5c4560afddbff5eb39f0582a1', ravScoreModelBinding().modelBundleSha256, 3],
  ['dd3845b10dafefa70c664c3c1c8f3cb3e5576b4f24d16bc0505b048f28faa195', rollbackBinding().modelBundleSha256, 2],
  ['80cb9d926a5096fe29139c2c7599692b5d97bd011de417fb4e42f4d648353926', await ravScoreContinuationImplementationSha256(), 1],
  ['20260904140000', '20260905090000', 2],
]) {
  assert.equal(expected.split(before).length - 1, count);
  expected = expected.replaceAll(before, after);
}
assert.equal(body(await read('20260905090000_open_meteo_current_fallback_binding')), expected,
  'Open-Meteo migration must change only exact seals/readback version, never SQL behaviour or row data');
console.log('Open-Meteo append-only migration: exact binding-only forward copy verified.');
