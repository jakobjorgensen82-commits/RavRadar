const SHARD_COUNT = 10;
const SHARD_LIMIT_BYTES = 500_000_000;
const ACCOUNT_LIMIT_BYTES = 5_000_000_000;
const WARNING_RATIO = 0.70;
const CRITICAL_RATIO = 0.85;
const accountId = process.env.CLOUDFLARE_ACCOUNT_ID?.trim();
const apiToken = (process.env.CLOUDFLARE_AUDIT_API_TOKEN || process.env.CLOUDFLARE_API_TOKEN)?.trim();

function required(value, name) {
  if (!value) throw new Error(`${name} mangler.`);
  return value;
}

async function cloudflareGet(pathname) {
  const response = await fetch(`https://api.cloudflare.com/client/v4/accounts/${required(accountId, 'CLOUDFLARE_ACCOUNT_ID')}${pathname}`, {
    headers: { Authorization: `Bearer ${required(apiToken, 'CLOUDFLARE_AUDIT_API_TOKEN')}` },
  });
  const body = await response.json();
  if (!response.ok || body?.success !== true) throw new Error(`Cloudflare D1-status kunne ikke læses (${response.status}).`);
  return body;
}

async function listDatabases() {
  const rows = [];
  for (let page = 1; ; page += 1) {
    const body = await cloudflareGet(`/d1/database?page=${page}&per_page=100`);
    if (!Array.isArray(body.result)) throw new Error('Cloudflare D1-listen er ugyldig.');
    rows.push(...body.result);
    if (page >= Number(body.result_info?.total_pages || 1)) return rows;
  }
}

const allDatabases = await listDatabases();
const shards = Array.from({ length: SHARD_COUNT }, (_, index) => {
  const name = `ravradar-trips-${index}`;
  const database = allDatabases.find(candidate => candidate.name === name);
  if (!database) throw new Error(`${name} mangler.`);
  if (database.jurisdiction !== 'eu') throw new Error(`${name} er ikke EU-låst.`);
  return database;
});
const details = [];
for (const shard of shards) details.push((await cloudflareGet(`/d1/database/${shard.uuid}`)).result);
const sizes = details.map(database => Number(database?.file_size || 0));
if (sizes.some(size => !Number.isFinite(size) || size < 0)) throw new Error('Cloudflare returnerede en ugyldig lagerstørrelse.');
const totalBytes = sizes.reduce((sum, size) => sum + size, 0);
const largestBytes = Math.max(...sizes);
const accountRatio = totalBytes / ACCOUNT_LIMIT_BYTES;
const shardRatio = largestBytes / SHARD_LIMIT_BYTES;
const status = Math.max(accountRatio, shardRatio) >= CRITICAL_RATIO
  ? 'critical'
  : Math.max(accountRatio, shardRatio) >= WARNING_RATIO ? 'warning' : 'ok';
const summary = {
  status,
  shards: SHARD_COUNT,
  total_megabytes: Math.round(totalBytes / 1_000_000),
  account_percent: Number((accountRatio * 100).toFixed(1)),
  largest_shard_megabytes: Math.round(largestBytes / 1_000_000),
  largest_shard_percent: Number((shardRatio * 100).toFixed(1)),
};
console.log(`D1-kapacitet: ${JSON.stringify(summary)}`);
if (status === 'warning') console.warn('D1-lageret har passeret 70 %. Planlæg kapacitetsudvidelse før 85 %.');
if (status === 'critical') throw new Error('D1-lageret har passeret 85 %. Nye writes må ikke risikeres uden kapacitetsplan.');
