import fs from 'node:fs';
import path from 'node:path';
import { boundedFetch } from './lib/bounded-fetch.mjs';

const accountId = process.env.CLOUDFLARE_ACCOUNT_ID?.trim();
const apiToken = process.env.CLOUDFLARE_API_TOKEN?.trim();
const configPath = process.env.TRIP_WRANGLER_CONFIG_PATH?.trim();
const apiOrigin = 'https://api.cloudflare.com/client/v4';

function required(value, name) {
  if (!value) throw new Error(`${name} mangler.`);
  return value;
}

async function query(databaseId, sql) {
  const response = await boundedFetch(
    `${apiOrigin}/accounts/${required(accountId, 'CLOUDFLARE_ACCOUNT_ID')}/d1/database/${databaseId}/query`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${required(apiToken, 'CLOUDFLARE_API_TOKEN')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ sql }),
    },
  );
  const body = await response.json();
  const result = body?.result?.[0];
  if (!response.ok || body?.success !== true || result?.success !== true) {
    const codes = Array.isArray(body?.errors)
      ? body.errors.map(error => error.code).filter(Boolean).join(',')
      : 'ukendt';
    throw new Error(`Cloudflare D1-kontrolskrivningen fejlede (${response.status}, kode ${codes}).`);
  }
  return result;
}

function controlDatabaseId() {
  const configuration = JSON.parse(fs.readFileSync(
    path.resolve(required(configPath, 'TRIP_WRANGLER_CONFIG_PATH')),
    'utf8',
  ));
  const databaseId = configuration?.d1_databases
    ?.find(binding => binding?.binding === 'TRIP_DB_0')
    ?.database_id;
  if (typeof databaseId !== 'string' || !/^[0-9a-f-]{32,40}$/i.test(databaseId)) {
    throw new Error('TRIP_DB_0 mangler i den verificerede Wrangler-konfiguration.');
  }
  return databaseId;
}

const databaseId = controlDatabaseId();
await query(
  databaseId,
  `insert into trip_storage_control (control_key, control_value, updated_at)
    values ('d1_activation_attempted', 'true', strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
    on conflict(control_key) do update set
      control_value = excluded.control_value,
      updated_at = excluded.updated_at`,
);
const verification = await query(
  databaseId,
  `select control_value from trip_storage_control
    where control_key = 'd1_activation_attempted'
    limit 1`,
);
if (!Array.isArray(verification.results)
  || verification.results.length !== 1
  || verification.results[0]?.control_value !== 'true') {
  throw new Error('Den varige D1-aktiveringsgrænse kunne ikke genlæses.');
}
const outputPath = process.env.GITHUB_OUTPUT?.trim();
if (outputPath) fs.appendFileSync(outputPath, 'd1_activation_attempted=true\n', 'utf8');
console.log('Den varige, envejs D1-aktiveringsgrænse er skrevet og genlæst.');
