import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import { ravScoreModelBinding } from '../js/core/ravscore-model-contract.js';
import { ravScoreModelBinding as rollbackBinding } from './rollback-assets/ravscore-model-contract.js';
import { ravScoreContinuationImplementationSha256 } from './lib/ravscore-continuation-implementation-contract.mjs';

const read = async name => (await fs.readFile(`supabase/migrations/${name}.sql`, 'utf8')).replaceAll('\r\n', '\n');
const PER_PAIR_MIGRATION = '20260906162332_per_pair_weather_fallback_binding';
const HORIZON_VALID_MIGRATION = '20260907084343_horizon_valid_weather_binding';
const PER_PAIR_MIGRATION_SHA256 = '9cc07a1108e8379e84025f4d93e2e5deaa21811ab1e67ac3bf461ce14624fff7';
const PER_PAIR_INTEGRATED_BUNDLE_SHA256 = '4346bf2de26a0dde25c3ef8dc72e741d6259f15282801e62a95a31a8f6594c0d';
const PER_PAIR_ROLLBACK_BUNDLE_SHA256 = '71a093a4b419891cb41f582de2ab926a2ea23e5abbe16015cc2b6f4b3ae8be0f';
const PER_PAIR_CONTINUATION_SHA256 = '5456d603a687e03b8983b5a97712b4acd305011a6029edb90df72d1d3e4f702f';
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

const immutablePerPairBytes = await fs.readFile(`supabase/migrations/${PER_PAIR_MIGRATION}.sql`);
assert.equal(
  crypto.createHash('sha256').update(immutablePerPairBytes).digest('hex'),
  PER_PAIR_MIGRATION_SHA256,
  'Historical per-pair migration bytes must remain immutable',
);

let perPairExpected = body(await read('20260905090000_open_meteo_current_fallback_binding'));
for (const [before, after, count] of [
  ['b7ac1e2b180ede66c25fcc764b344390969a772dcfbc846194166290b2430147', PER_PAIR_INTEGRATED_BUNDLE_SHA256, 3],
  ['7f5f6c93649b93f6a61892b31811c57603ff6c3a0a47cc218deae39c87960484', PER_PAIR_ROLLBACK_BUNDLE_SHA256, 2],
  ['08f0a635a0460c2afe196200e7b786245608f006624b17d984cac1ae603fd48f', PER_PAIR_CONTINUATION_SHA256, 1],
  ['20260905090000', '20260906162332', 2],
]) {
  assert.equal(perPairExpected.split(before).length - 1, count);
  perPairExpected = perPairExpected.replaceAll(before, after);
}
assert.equal(body(await read(PER_PAIR_MIGRATION)), perPairExpected,
  'Per-pair migration must change only exact seals/readback version, never SQL behaviour or row data');

let horizonValidExpected = body(await read(PER_PAIR_MIGRATION));
for (const [before, after, count] of [
  [PER_PAIR_INTEGRATED_BUNDLE_SHA256, ravScoreModelBinding().modelBundleSha256, 3],
  [PER_PAIR_ROLLBACK_BUNDLE_SHA256, rollbackBinding().modelBundleSha256, 2],
  [PER_PAIR_CONTINUATION_SHA256, await ravScoreContinuationImplementationSha256(), 1],
  ['20260906162332', '20260907084343', 2],
]) {
  assert.equal(horizonValidExpected.split(before).length - 1, count);
  horizonValidExpected = horizonValidExpected.replaceAll(before, after);
}
assert.equal(body(await read(HORIZON_VALID_MIGRATION)), horizonValidExpected,
  'Horizon-valid migration must change only exact seals/readback version, never SQL behaviour or row data');
console.log('Open-Meteo, per-pair and horizon-valid append-only migrations: exact binding-only forward copies verified.');
