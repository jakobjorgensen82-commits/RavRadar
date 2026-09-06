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
  ['5c523675393981cea770b8bec62e8287130206f5c4560afddbff5eb39f0582a1', 'b7ac1e2b180ede66c25fcc764b344390969a772dcfbc846194166290b2430147', 3],
  ['dd3845b10dafefa70c664c3c1c8f3cb3e5576b4f24d16bc0505b048f28faa195', '7f5f6c93649b93f6a61892b31811c57603ff6c3a0a47cc218deae39c87960484', 2],
  ['80cb9d926a5096fe29139c2c7599692b5d97bd011de417fb4e42f4d648353926', '08f0a635a0460c2afe196200e7b786245608f006624b17d984cac1ae603fd48f', 1],
  ['20260904140000', '20260905090000', 2],
]) {
  assert.equal(expected.split(before).length - 1, count);
  expected = expected.replaceAll(before, after);
}
assert.equal(body(await read('20260905090000_open_meteo_current_fallback_binding')), expected,
  'Open-Meteo migration must change only exact seals/readback version, never SQL behaviour or row data');

let perPairExpected = body(await read('20260905090000_open_meteo_current_fallback_binding'));
for (const [before, after, count] of [
  ['b7ac1e2b180ede66c25fcc764b344390969a772dcfbc846194166290b2430147', ravScoreModelBinding().modelBundleSha256, 3],
  ['7f5f6c93649b93f6a61892b31811c57603ff6c3a0a47cc218deae39c87960484', rollbackBinding().modelBundleSha256, 2],
  ['08f0a635a0460c2afe196200e7b786245608f006624b17d984cac1ae603fd48f', await ravScoreContinuationImplementationSha256(), 1],
  ['20260905090000', '20260906162332', 2],
]) {
  assert.equal(perPairExpected.split(before).length - 1, count);
  perPairExpected = perPairExpected.replaceAll(before, after);
}
assert.equal(body(await read('20260906162332_per_pair_weather_fallback_binding')), perPairExpected,
  'Per-pair migration must change only exact seals/readback version, never SQL behaviour or row data');
console.log('Open-Meteo and per-pair append-only migrations: exact binding-only forward copies verified.');
