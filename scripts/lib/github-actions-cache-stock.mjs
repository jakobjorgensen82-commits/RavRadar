const CACHE_PAGE_SIZE = 100;
const MAX_CACHE_PAGES = 10;
const REPOSITORY_NAME = /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/;
const CACHE_VERSION = /^[a-f0-9]{64}$/;
const MAX_CACHE_BYTES = 10_000_000_000;
const MIN_RAW_ARCHIVE_BYTES = 1024;
const RAW_ENTRY_LIMIT = 2;
const RAW_PREFIX = 'dmi-grib-';
const RAW_MAIN_REF = 'refs/heads/main';
const RAW_KEY = /^dmi-grib-v4-Linux-[0-9]{4}-W(?:0[1-9]|[1-4][0-9]|5[0-3])-[1-9][0-9]*-[1-9][0-9]*$/;

export function isRawCacheKey(key) {
  return typeof key === 'string' && RAW_KEY.test(key);
}

export function rawCacheStockRows(stock) {
  return stock.inventory.actions_caches.filter(row => row.key.startsWith(RAW_PREFIX));
}

export function isMainRawCache(row) {
  return row.ref === RAW_MAIN_REF && isRawCacheKey(row.key);
}


function isByteCount(value) {
  return Number.isSafeInteger(value) && value >= 0;
}

async function readInventory(path, getJson) {
  const caches = new Map();
  let expectedCount;
  for (let page = 1; page <= MAX_CACHE_PAGES; page += 1) {
    const data = await getJson(`${path}/caches?per_page=${CACHE_PAGE_SIZE}&page=${page}&sort=created_at&direction=asc`);
    const {total_count: total, actions_caches: rows} = data ?? {};
    expectedCount ??= total;
    if (!isByteCount(total) || total !== expectedCount || total > MAX_CACHE_PAGES * CACHE_PAGE_SIZE
        || !Array.isArray(rows) || rows.length !== Math.min(CACHE_PAGE_SIZE, total - caches.size)) {
      throw new Error('GITHUB_CACHE_INVENTORY_INCOMPLETE');
    }
    for (const row of rows) {
      if (!isByteCount(row?.id) || row.id === 0 || caches.has(row.id)
          || !isByteCount(row.size_in_bytes) || row.size_in_bytes === 0
          || typeof row.key !== 'string' || row.key.length === 0
          || typeof row.ref !== 'string' || !row.ref.startsWith('refs/')
          || !CACHE_VERSION.test(row.version)
          || typeof row.created_at !== 'string' || !Number.isFinite(Date.parse(row.created_at))) {
        throw new Error('GITHUB_CACHE_INVENTORY_ROW_UNPROVED');
      }
      caches.set(row.id, row);
    }
    if (caches.size === total) return [...caches.values()].sort((left, right) => left.id - right.id);
  }
  throw new Error('GITHUB_CACHE_INVENTORY_INCOMPLETE');
}

function storageIdentity(rows) {
  return JSON.stringify(rows.map(row => [row.id, row.ref, row.key, row.version, row.size_in_bytes, row.created_at]));
}

export async function readGithubActionsCacheStock(repository, getJson) {
  if (typeof repository !== 'string' || !REPOSITORY_NAME.test(repository) || typeof getJson !== 'function') {
    throw new Error('GITHUB_CACHE_INVENTORY_INPUT');
  }
  const path = `/repos/${repository}/actions`;
  const before = await readInventory(path, getJson);
  const usage = await getJson(`${path}/cache/usage`);
  const after = await readInventory(path, getJson);
  if (!isByteCount(usage?.active_caches_size_in_bytes) || !isByteCount(usage?.active_caches_count)) {
    throw new Error('GITHUB_CACHE_USAGE_UNPROVED');
  }
  if (storageIdentity(before) !== storageIdentity(after)) {
    throw new Error('GITHUB_CACHE_INVENTORY_CHANGED');
  }
  const inventoryBytes = after.reduce((total, row) => total + row.size_in_bytes, 0);
  if (!isByteCount(inventoryBytes)) throw new Error('GITHUB_CACHE_INVENTORY_SIZE_UNPROVED');

  return {
    inventory: {total_count: after.length, actions_caches: after},
    inventoryBytes,
    reportedUsageBytes: usage.active_caches_size_in_bytes,
    reportedUsageCount: usage.active_caches_count,
  };
}

// The caller supplies a proven upper bound for other saves that can overlap.
// The repository usage meter can lag both an upload and a deletion.
export function calculateRawCacheUploadBudget(stock, concurrentSaveReserveBytes) {
  if (!isByteCount(stock?.inventoryBytes) || !isByteCount(stock?.reportedUsageBytes)
      || !isByteCount(concurrentSaveReserveBytes)) {
    throw new Error('GITHUB_CACHE_BUDGET_INPUT');
  }
  const accountedBytes = Math.max(stock.inventoryBytes, stock.reportedUsageBytes);
  return {
    accountedBytes,
    concurrentSaveReserveBytes,
    rawUploadBudgetBytes: Math.max(0, MAX_CACHE_BYTES - accountedBytes - concurrentSaveReserveBytes),
  };
}

// Run after present-day retirement is independently proved, before the new
// archive's first cache write. The reserve has to cover all other writes
// until the next confirmed measurement. This plan never retires an entry.
export function planRawCacheUpload(stock, key, concurrentSaveReserveBytes) {
  if (!isRawCacheKey(key)) throw new Error('RAW_CACHE_UPLOAD_KEY');
  const {rawUploadBudgetBytes, ...usage} = calculateRawCacheUploadBudget(stock, concurrentSaveReserveBytes);
  const raw = rawCacheStockRows(stock);
  const hold = reason => ({status: 'HOLD', reason, rawCopies: raw.length, ...usage});

  // The stable full listing can be ahead of the usage meter. It is
  // only incomplete evidence when the meter reports additional entries.
  if (stock.reportedUsageCount > stock.inventory.total_count) return hold('stock-count-unconfirmed');
  if (raw.some(row => !isMainRawCache(row)) || new Set(raw.map(row => row.key)).size !== raw.length
      || new Set(raw.map(row => row.version)).size > 1) return hold('raw-identity-unconfirmed');
  if (raw.some(row => row.key === key)) return hold('requested-raw-copy-already-present');
  if (raw.length > RAW_ENTRY_LIMIT) return hold('previous-raw-rotation-incomplete');
  if (rawUploadBudgetBytes < MIN_RAW_ARCHIVE_BYTES) return hold('insufficient-cache-capacity');

  return {status: 'ADMIT', rawCopies: raw.length, ...usage, rawUploadBudgetBytes};
}
