import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import { ravScoreModelBinding } from '../js/core/ravscore-model-contract.js';
import { ravScoreModelBinding as rollbackBinding } from './rollback-assets/ravscore-model-contract.js';
import { ravScoreContinuationImplementationSha256 } from './lib/ravscore-continuation-implementation-contract.mjs';

const canonicalLf = source => {
  const canonical = source.replaceAll('\r\n', '\n');
  assert.equal(canonical.includes('\r'), false, 'Migration sources must not contain lone carriage returns');
  return canonical;
};
const read = async name => canonicalLf(await fs.readFile(`supabase/migrations/${name}.sql`, 'utf8'));
const PER_PAIR_MIGRATION = '20260906162332_per_pair_weather_fallback_binding';
const HORIZON_VALID_MIGRATION = '20260907084343_horizon_valid_weather_binding';
const WAM_MIGRATION = '20260909194000_wam_same_run_resolution_binding';
const MEASURED_WARMUP_MIGRATION = '20260912122607_measured_rollback_warmup_binding';
const STATE_ONLY_HOLD_V2_MIGRATION = '20260912141641_state_only_hold_closure_v2_binding';
const HORIZON_VALID_SHA256 = 'f22ce2b3ee2e45c4fc86ce6a71b7a48543aef47dbbe014ecf41bd95558421c0d';
const HORIZON_INTEGRATED_SHA256 = '155fd8f4f9ea59f0dfed01ebe25c5e923e16228db4c9f2cf9cf71415d4047cd9';
const HORIZON_ROLLBACK_SHA256 = '4da64d0c8d09a0a32c8b10526f39f58a4acef131a359d31edc2fbca1e3eb20c8';
const HORIZON_CONTINUATION_SHA256 = '260efa3b94759ff7d5816d3c93889b8e27c8fdd2ef09b166e952d387a0d5a5cb';
const WAM_MIGRATION_SHA256 = 'a76ae8bd0de79cbbbc79edcff0af92e37c2dfb3d5798e9c35e4337cbfea6606d';
const WAM_INTEGRATED_SHA256 = '8a94a4ef1f33c7e9714ac5b634037ae3a4b5d9b7c2861230f32e766696d02c80';
const WAM_ROLLBACK_SHA256 = '1e6d4e747dc89be971dc01f3cc51a0710fadda4bb49920b597b359d6ca520ad5';
const WAM_CONTINUATION_SHA256 = 'ff1d884f32825f44fd5c1cafa6b3e211e44900dc0663261b86b890e0cbbb85f3';
const MEASURED_WARMUP_MIGRATION_SHA256 = '704439882eb6e77a7c038e14b8ecfd49ef9b6bb9074f9ea5778f6843f6c48137';
const MEASURED_WARMUP_INTEGRATED_SHA256 = 'e545cb547923aeabc503b9d0178a996ca2ce2427200121cef6228ece29748b5a';
const MEASURED_WARMUP_ROLLBACK_SHA256 = '157698f07f017516e52cf8f47680a2ac7c37008d8b3f9a4ee665eba2ad03e1bd';
const MEASURED_WARMUP_CONTINUATION_SHA256 = 'b7555f6312519ed4e4f5fb1cd545dccd2745ce2437ce0bbd466926ecb90ecee2';
// 4.0.339 recovery: this migration was still pending after migration 4 rolled back.
// Pin the corrected bytes AND prove below that only the two CASE parentheses changed.
const PER_PAIR_MIGRATION_SHA256 = '8767e45cc001b50d00ae32c0f3e1aaaba27411c04390956a47b1f23f86e9abf2';
const PER_PAIR_BEFORE_PENDING_RECOVERY_SHA256 = '6a0653f96096b02d5552117eea1b44b3d27b35aedde582e4cc87876608ef6233';
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

const immutablePerPairCanonicalSource = canonicalLf(
  await fs.readFile(`supabase/migrations/${PER_PAIR_MIGRATION}.sql`, 'utf8'),
);
assert.equal(
  crypto.createHash('sha256').update(immutablePerPairCanonicalSource, 'utf8').digest('hex'),
  PER_PAIR_MIGRATION_SHA256,
  'Per-pair migration canonical LF bytes must remain immutable after the bounded pending-migration recovery',
);

const pendingRecoveryExpression = /is distinct from \(case(\n\s*when \(v_lineage ->> 'boundedUnknownPositionCount'\)::numeric > 0\n\s*then 'UNKNOWN_HISTORY_INTERVAL'\n\s*else 'VERIFIED_CAUSAL_HISTORY_WINDOW'\n\s*)end\)/gu;
assert.equal([...immutablePerPairCanonicalSource.matchAll(pendingRecoveryExpression)].length, 1,
  'Pending recovery must parenthesize exactly the affected history-transition CASE expression');
const beforePendingRecovery = immutablePerPairCanonicalSource.replace(
  pendingRecoveryExpression, 'is distinct from case$1end',
);
assert.equal(
  crypto.createHash('sha256').update(beforePendingRecovery, 'utf8').digest('hex'),
  PER_PAIR_BEFORE_PENDING_RECOVERY_SHA256,
  'Removing only the two recovery parentheses must reproduce the exact original migration bytes',
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
  [PER_PAIR_INTEGRATED_BUNDLE_SHA256, HORIZON_INTEGRATED_SHA256, 3],
  [PER_PAIR_ROLLBACK_BUNDLE_SHA256, HORIZON_ROLLBACK_SHA256, 2],
  [PER_PAIR_CONTINUATION_SHA256, HORIZON_CONTINUATION_SHA256, 1],
  ['20260906162332', '20260907084343', 2],
]) {
  assert.equal(horizonValidExpected.split(before).length - 1, count);
  horizonValidExpected = horizonValidExpected.replaceAll(before, after);
}
assert.equal(body(await read(HORIZON_VALID_MIGRATION)), horizonValidExpected,
  'Horizon-valid migration must change only exact seals/readback version, never SQL behaviour or row data');
const immutableHorizon = await read(HORIZON_VALID_MIGRATION);
assert.equal(crypto.createHash('sha256').update(immutableHorizon).digest('hex'), HORIZON_VALID_SHA256,
  'Applied horizon-valid migration must remain byte-identical after LF normalization');
let wamExpected = body(immutableHorizon);
for (const [before, after, count] of [
  [HORIZON_INTEGRATED_SHA256, WAM_INTEGRATED_SHA256, 3],
  [HORIZON_ROLLBACK_SHA256, WAM_ROLLBACK_SHA256, 2],
  [HORIZON_CONTINUATION_SHA256, WAM_CONTINUATION_SHA256, 1],
  ['20260907084343', '20260909194000', 2],
]) {
  assert.equal(wamExpected.split(before).length - 1, count);
  wamExpected = wamExpected.replaceAll(before, after);
}
assert.equal(body(await read(WAM_MIGRATION)), wamExpected,
  'WAM migration must change only exact seals/readback version, never SQL behaviour or row data');
const immutableWam = await read(WAM_MIGRATION);
assert.equal(crypto.createHash('sha256').update(immutableWam).digest('hex'), WAM_MIGRATION_SHA256,
  'Applied WAM migration must remain byte-identical after LF normalization');
let measuredWarmupExpected = body(immutableWam);
for (const [before, after, count] of [
  [WAM_INTEGRATED_SHA256, MEASURED_WARMUP_INTEGRATED_SHA256, 3],
  [WAM_ROLLBACK_SHA256, MEASURED_WARMUP_ROLLBACK_SHA256, 2],
  [WAM_CONTINUATION_SHA256, MEASURED_WARMUP_CONTINUATION_SHA256, 1],
  ['20260909194000', '20260912122607', 2],
]) {
  assert.equal(measuredWarmupExpected.split(before).length - 1, count);
  measuredWarmupExpected = measuredWarmupExpected.replaceAll(before, after);
}
assert.equal(body(await read(MEASURED_WARMUP_MIGRATION)), measuredWarmupExpected,
  'Measured warmup migration must change only exact seals/readback version, never SQL behaviour or row data');
const immutableMeasuredWarmup = await read(MEASURED_WARMUP_MIGRATION);
assert.equal(
  crypto.createHash('sha256').update(immutableMeasuredWarmup).digest('hex'),
  MEASURED_WARMUP_MIGRATION_SHA256,
  'Applied measured-warmup migration must remain byte-identical after LF normalization',
);
let stateOnlyHoldV2Expected = body(immutableMeasuredWarmup);
for (const [before, after, count] of [
  [MEASURED_WARMUP_INTEGRATED_SHA256, ravScoreModelBinding().modelBundleSha256, 3],
  [MEASURED_WARMUP_ROLLBACK_SHA256, rollbackBinding().modelBundleSha256, 2],
  [MEASURED_WARMUP_CONTINUATION_SHA256, await ravScoreContinuationImplementationSha256(), 1],
  ['20260912122607', '20260912141641', 2],
]) {
  assert.equal(stateOnlyHoldV2Expected.split(before).length - 1, count);
  stateOnlyHoldV2Expected = stateOnlyHoldV2Expected.replaceAll(before, after);
}
assert.equal(body(await read(STATE_ONLY_HOLD_V2_MIGRATION)), stateOnlyHoldV2Expected,
  'State-only hold closure-v2 migration must change only exact seals/readback version, never SQL behaviour or row data');
console.log('Open-Meteo through state-only hold closure-v2 append-only migrations: immutable history and exact binding-only forward copies verified.');
