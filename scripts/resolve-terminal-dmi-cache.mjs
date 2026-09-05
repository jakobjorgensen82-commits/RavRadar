import fs from 'node:fs/promises';
import { selectTerminalDmiCache } from './lib/terminal-dmi-cache.mjs';

const env = process.env;
const allowMissing = process.argv.includes('--allow-missing');
if (!env.GITHUB_TOKEN || !env.GITHUB_REPOSITORY || !env.GITHUB_OUTPUT) {
  throw new Error('Terminal DMI cache resolution requires GitHub token, repository and output path');
}
const apiRoot = String(env.GITHUB_API_URL || 'https://api.github.com').replace(/\/$/, '');
const getJson = async route => {
  const response = await fetch(`${apiRoot}${route}`, {
    headers: {
      Authorization: `Bearer ${env.GITHUB_TOKEN}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
    },
    signal: AbortSignal.timeout(15_000),
  });
  if (!response.ok) {
    const error = new Error(`GitHub terminal DMI cache evidence is unavailable (${response.status})`);
    error.status = response.status;
    throw error;
  }
  return response.json();
};

const caches = [];
let inventoryComplete = false;
for (let page = 1; page <= 10; page += 1) {
  const result = await getJson(
    `/repos/${env.GITHUB_REPOSITORY}/actions/caches?ref=refs%2Fheads%2Fmain&sort=created_at&direction=desc&per_page=100&page=${page}`,
  );
  if (!Array.isArray(result?.actions_caches) || !Number.isSafeInteger(result.total_count)) {
    throw new Error('GitHub returned invalid cache inventory');
  }
  caches.push(...result.actions_caches);
  if (caches.length >= result.total_count || result.actions_caches.length < 100) {
    inventoryComplete = true;
    break;
  }
}
if (!inventoryComplete) throw new Error('GitHub terminal DMI cache inventory exceeded the bounded audit window');

const selected = await selectTerminalDmiCache(caches, env.GITHUB_REPOSITORY, getJson);
if (!selected) {
  await fs.appendFile(env.GITHUB_OUTPUT, 'available=false\nkey=\n');
  if (!allowMissing) throw new Error('No terminal-proven exact-main legacy DMI cache is available');
  console.log('No terminal-proven exact-main legacy DMI cache is available.');
} else {
  await fs.appendFile(
    env.GITHUB_OUTPUT,
    `available=true\nkey=${selected.key}\ncache_id=${selected.cacheId}\ncache_version=${selected.cacheVersion}\nrun_id=${selected.runId}\nrun_attempt=${selected.runAttempt}\n`,
  );
  console.log(
    `Terminal-proven legacy DMI cache selected from run ${selected.runId} `
      + `attempt ${selected.runAttempt} (${selected.sizeInBytes} bytes).`,
  );
}
