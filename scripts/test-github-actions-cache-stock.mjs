import assert from 'node:assert/strict';
import test from 'node:test';
import {calculateRawCacheUploadBudget, planRawCacheUpload, readGithubActionsCacheStock} from './lib/github-actions-cache-stock.mjs';

import {projectRawCacheStock} from './observe-github-raw-cache-stock.mjs';

const repo = 'example/RavRadar';
const cache = (id, size, ref = 'refs/heads/main') => ({
  id, key: `family-cache-${id}`, ref, size_in_bytes: size, version: 'a'.repeat(64),
  created_at: '2026-11-19T01:35:35.900598Z',
  last_accessed_at: '2026-11-19T01:35:35.900598Z',
});
function reader(snapshots, reportedBytes, reportedCount = snapshots[0].length) {
  let snapshot = 0;
  return async path => {
    if (path === `/repos/${repo}/actions/cache/usage`) {
      snapshot += 1;
      return {active_caches_size_in_bytes: reportedBytes, active_caches_count: reportedCount};
    }
    const uri = new URL(path, 'https://example.invalid');
    assert.equal(uri.pathname, `/repos/${repo}/actions/caches`);
    assert.equal(uri.searchParams.has('ref'), false);
    const begin = (Number(uri.searchParams.get('page')) - 1) * 100;
    const all = snapshots[snapshot];
    return {total_count: all.length, actions_caches: all.slice(begin, begin + 100)};
  };
}

test('all refs and pages count even when the usage meter is delayed by an upload', async () => {
  const rows = Array.from({length: 101}, (_, index) => cache(index + 1, 1, 'refs/pull/961/merge'));
  rows.push(cache(102, 11_476_126_497));
  const after = rows.map(row => ({...row, last_accessed_at: '2026-11-19T01:49:59Z'}));
  const stock = await readGithubActionsCacheStock(repo, reader([rows, after], 8_493_005_728));
  assert.equal(stock.inventory.total_count, 102);
  assert.equal(stock.inventoryBytes, 11_476_126_598);
  assert.equal(calculateRawCacheUploadBudget(stock, 500_000_000).rawUploadBudgetBytes, 0);
});

test('two measured snapshots leave room for the last measured RAW size and a reserved overlap', async () => {
  const rows = [cache(1, 2_599_638_595), cache(2, 2_983_120_870), cache(3, 336_800_176, 'refs/heads/testing')];
  const id = reader([rows, rows], 5_919_559_641);
  const stock = await readGithubActionsCacheStock(repo, id);
  const budget = calculateRawCacheUploadBudget(stock, 500_000_000);
  assert.deepEqual(budget, {accountedBytes: 5_919_559_641, concurrentSaveReserveBytes: 500_000_000, rawUploadBudgetBytes: 3_580_440_359});
  const delayedDeletion = await readGithubActionsCacheStock(repo, reader([rows, rows], 11_476_126_598));
  assert.equal(calculateRawCacheUploadBudget(delayedDeletion, 500_000_000).rawUploadBudgetBytes, 0);
});

test('creation, removal, or recompression between reads stops admission even when the count is unchanged', async () => {
  const rows = [cache(1, 100), cache(2, 200)];
  for (const next of [[cache(1, 100), cache(3, 200)], [cache(1, 99), cache(2, 201)], [cache(1, 100)]]) {
    await assert.rejects(() => readGithubActionsCacheStock(repo, reader([rows, next], 300)), /INVENTORY_CHANGED/);
  }
});

test('partial lists, duplicate IDs and zero-byte in-flight entries give no budget', async () => {
  for (const [value, error] of [
    [{total_count: 2, actions_caches: [cache(1, 1)]}, /INVENTORY_INCOMPLETE/],
    [{total_count: 2, actions_caches: [cache(1, 1), cache(1, 1)]}, /INVENTORY_ROW_UNPROVED/],
    [{total_count: 1, actions_caches: [cache(1, 0)]}, /INVENTORY_ROW_UNPROVED/],
  ]) {
    await assert.rejects(() => readGithubActionsCacheStock(repo, async () => value), error);
  }
});

test('the job reports a size only after its exact normal archive is present', async () => {
  const expectedKey = 'dmi-grib-v4-Linux-2026-W47-44428287050-1';
  const before = cache(11, 3_000_000_000, 'refs/heads/main');
  const rows = [{ ...before, key: 'dmi-grib-v3-Linux-old' },
    { ...cache(12, 3_000_000_000), key: expectedKey },
    cache(13, 500_000_000, 'refs/pull/961/merge')];
  const stock = await readGithubActionsCacheStock(repo, reader([rows, rows], 3_500_000_000));
  assert.deepEqual(projectRawCacheStock(stock, expectedKey), {
    schemaVersion: 1, kind: 'RAW_CACHE_STOCK_OBSERVATION',
    rawCopies: 2, canonicalMainRawCopies: 1, totalCacheEntries: 3,
    listedBytes: 6_500_000_000, usageMeterBytes: 3_500_000_000,
    accountedBytes: 6_500_000_000, unreservedFreeBytes: 3_500_000_000, savedBytes: 3_000_000_000,
  });
  assert.throws(() => projectRawCacheStock(stock, expectedKey.replace(/-1$/, '-2')), /SAVE_UNAVAILABLE/);
  const duplicate = [...rows, { ...rows[1], id: 14, version: 'c'.repeat(64) }];
  const unavailable = await readGithubActionsCacheStock(repo, reader([duplicate, duplicate], 3_500_000_000));
  assert.throws(() => projectRawCacheStock(unavailable, expectedKey), /SAVE_UNAVAILABLE/);
});

const rawKey = run => 'dmi-grib-v4-Linux-2026-W47-' + run + '-1';
const rawCache = (id, size) => ({...cache(id, size), key: rawKey(id)});
const stockForPlan = async (rows, reportedBytes = rows.reduce((sum, row) => sum + row.size_in_bytes, 0),
    reportedCount = rows.length) => readGithubActionsCacheStock(repo, reader([rows, rows], reportedBytes, reportedCount));

test('a new copy gets only the budget remaining after two RAW copies, all other refs, and the reserve', async () => {
  const rows = [rawCache(1, 2_599_638_595), rawCache(2, 2_983_120_870), cache(3, 336_806_586, 'refs/heads/testing')];
  const stock = await stockForPlan(rows);
  assert.deepEqual(planRawCacheUpload(stock, rawKey(4), 500_000_000), {
    status: 'ADMIT', rawCopies: 2, accountedBytes: 5_919_566_051,
    concurrentSaveReserveBytes: 500_000_000, rawUploadBudgetBytes: 3_580_433_949,
  });
});

test('a fourth RAW cache is refused despite measured storage headroom', async () => {
  const stock = await stockForPlan([rawCache(1, 1_000), rawCache(2, 2_000), rawCache(3, 3_000)]);
  const plan = planRawCacheUpload(stock, rawKey(4), 500_000_000);
  assert.equal(plan.status, 'HOLD');
  assert.equal(plan.reason, 'previous-raw-rotation-incomplete');
  assert.equal(Object.hasOwn(plan, 'rawUploadBudgetBytes'), false);
});

test('no allowance is emitted with mixed RAW, unknown counts, reused identity or inadequate byte room', async () => {
  const first = rawCache(1, 1_000);
  const cases = [
    [[first, {...rawCache(2, 2_000), ref: 'refs/heads/testing'}], 3_000, 2, rawKey(4), 'raw-identity-unconfirmed'],
    [[first, {...rawCache(2, 2_000), version: 'b'.repeat(64)}], 3_000, 2, rawKey(4), 'raw-identity-unconfirmed'],
    [[first, {...rawCache(2, 2_000), key: first.key}], 3_000, 2, rawKey(4), 'raw-identity-unconfirmed'],
    [[first], 1_000, 2, rawKey(4), 'stock-count-unconfirmed'],
    [[first], 1_000, 1, first.key, 'requested-raw-copy-already-present'],
    [[first], 9_499_999_000, 1, rawKey(4), 'insufficient-cache-capacity'],
  ];
  for (const [rows, reportedBytes, reportedCount, key, reason] of cases) {
    const plan = planRawCacheUpload(await stockForPlan(rows, reportedBytes, reportedCount), key, 500_000_000);
    assert.equal(plan.status, 'HOLD');
    assert.equal(plan.reason, reason);
    assert.equal(Object.hasOwn(plan, 'rawUploadBudgetBytes'), false);
  }
});
