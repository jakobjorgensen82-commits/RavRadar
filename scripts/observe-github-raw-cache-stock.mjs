
import {appendFile} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
import {
  calculateRawCacheUploadBudget, isMainRawCache, isRawCacheKey, planRawCacheUpload, rawCacheStockRows,
  readGithubActionsCacheStock,
} from './lib/github-actions-cache-stock.mjs';

const REPOSITORY = 'jakobjorgensen82-commits/RavRadar';
const WORKFLOW = REPOSITORY + '/.github/workflows/run-current-weather-once.yml@refs/heads/main';
const OWNED_SAVE_WORKFLOWS = new Set([
  WORKFLOW,
  REPOSITORY + '/.github/workflows/update-and-deploy.yml@refs/heads/main',
]);
// Reserve room for the bounded encrypted follow-up (420 MB), normal state and
// checkpoint saves, and open control jobs elsewhere in this repository.
const CONCURRENT_SAVE_RESERVE_BYTES = 1_000_000_000;

export function projectRawCacheStock(stock, expectedKey) {
  if (!isRawCacheKey(expectedKey)) throw new Error('RAW_CACHE_OBSERVATION_KEY');
  const raw = rawCacheStockRows(stock);
  const saved = raw.filter(row => row.key === expectedKey && row.ref === 'refs/heads/main');
  if (saved.length !== 1) throw new Error('RAW_CACHE_OBSERVATION_SAVE_UNAVAILABLE');
  const {accountedBytes, rawUploadBudgetBytes} = calculateRawCacheUploadBudget(stock, 0);
  return {
    schemaVersion: 1, kind: 'RAW_CACHE_STOCK_OBSERVATION',
    rawCopies: raw.length, canonicalMainRawCopies: raw.filter(isMainRawCache).length,
    totalCacheEntries: stock.inventory.total_count,
    listedBytes: stock.inventoryBytes, usageMeterBytes: stock.reportedUsageBytes,
    accountedBytes, unreservedFreeBytes: rawUploadBudgetBytes, savedBytes: saved[0].size_in_bytes,
  };
}

async function main(env, admitUpload) {
  const {GITHUB_RUN_ID: runId, GITHUB_RUN_ATTEMPT: attempt, GITHUB_TOKEN: token,
    RAVRADAR_EXPECTED_RAW_SAVE_KEY: key} = env;
  if (env.GITHUB_ACTIONS !== 'true' || env.RUNNER_ENVIRONMENT !== 'github-hosted'
      || env.GITHUB_REPOSITORY !== REPOSITORY || env.GITHUB_EVENT_NAME !== 'workflow_dispatch'
      || env.GITHUB_REF !== 'refs/heads/main' || !/^[a-f0-9]{40}$/.test(env.GITHUB_SHA ?? '')
      || env.GITHUB_API_URL !== 'https://api.github.com' || !/^[1-9][0-9]*$/.test(runId ?? '')
      || !/^[1-9][0-9]*$/.test(attempt ?? '')
      || (admitUpload ? !OWNED_SAVE_WORKFLOWS.has(env.GITHUB_WORKFLOW_REF) || !env.GITHUB_OUTPUT
        : env.GITHUB_WORKFLOW_REF !== WORKFLOW || env.GITHUB_ACTOR !== 'github-actions[bot]'
          || env.GITHUB_TRIGGERING_ACTOR !== 'github-actions[bot]' || attempt !== '1')
      || !token || !isRawCacheKey(key) || !key.endsWith('-' + runId + '-' + attempt)) {
    throw new Error('RAW_CACHE_OBSERVATION_WORKFLOW');
  }
  const stock = await readGithubActionsCacheStock(REPOSITORY, async route => {
    const response = await fetch('https://api.github.com' + route, {
      method: 'GET', redirect: 'error', signal: AbortSignal.timeout(8_000),
      headers: {Authorization: 'Bearer ' + token, Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2026-03-10'},
    });
    if (!response.ok) throw new Error('RAW_CACHE_OBSERVATION_INVENTORY_HTTP_' + response.status);
    return response.json();
  });
  if (admitUpload) {
    const plan = planRawCacheUpload(stock, key, CONCURRENT_SAVE_RESERVE_BYTES);
    if (plan.status === 'ADMIT') {
      await appendFile(env.GITHUB_OUTPUT, 'raw_upload_budget_bytes=' + plan.rawUploadBudgetBytes + '\n');
    }
    console.log(JSON.stringify({kind: 'RAW_CACHE_UPLOAD_ADMISSION', ...plan}));
  } else {
    console.log(JSON.stringify({...projectRawCacheStock(stock, key), runId, attempt, head: env.GITHUB_SHA}));
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const admitUpload = process.argv.length === 3 && process.argv[2] === '--admit-upload';
  try {
    if (process.argv.length !== 2 && !admitUpload) throw new Error('RAW_CACHE_OBSERVATION_ARGUMENT');
    await main(process.env, admitUpload);
  }
  catch (error) {
    const message = typeof error?.message === 'string' && /^[A-Z0-9_]{1,100}$/.test(error.message)
      ? error.message : 'RAW_CACHE_OBSERVATION_UNAVAILABLE';
    console.error(message);
    process.exitCode = 1;
  }
}
