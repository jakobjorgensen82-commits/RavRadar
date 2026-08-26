import fs from 'node:fs';
import path from 'node:path';
import { D1_TRIP_SCHEMA_STATEMENTS } from '../supabase/functions/_shared/trip-storage.js';

const SHARD_COUNT = 10;
const accountId = process.env.CLOUDFLARE_ACCOUNT_ID?.trim();
const apiToken = process.env.CLOUDFLARE_API_TOKEN?.trim();
const configPath = process.env.TRIP_WRANGLER_CONFIG_PATH?.trim();
const apiOrigin = 'https://api.cloudflare.com/client/v4';

function required(value, name) {
  if (!value) throw new Error(`${name} mangler.`);
  return value;
}

async function cloudflare(pathname, init = {}) {
  const response = await fetch(`${apiOrigin}/accounts/${required(accountId, 'CLOUDFLARE_ACCOUNT_ID')}${pathname}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${required(apiToken, 'CLOUDFLARE_API_TOKEN')}`,
      'Content-Type': 'application/json',
      ...(init.headers || {}),
    },
  });
  const body = await response.json();
  if (!response.ok || body?.success !== true) {
    const codes = Array.isArray(body?.errors) ? body.errors.map(error => error.code).filter(Boolean).join(',') : 'ukendt';
    throw new Error(`Cloudflare API fejlede (${response.status}, kode ${codes}).`);
  }
  return body;
}

async function listDatabases() {
  const rows = [];
  for (let page = 1; ; page += 1) {
    const body = await cloudflare(`/d1/database?page=${page}&per_page=100`);
    if (!Array.isArray(body.result)) throw new Error('Cloudflare returnerede en ugyldig databaseliste.');
    rows.push(...body.result);
    const totalPages = Number(body.result_info?.total_pages || 1);
    if (page >= totalPages) return rows;
  }
}

async function ensureDatabases() {
  let databases = await listDatabases();
  const requiredNames = Array.from({ length: SHARD_COUNT }, (_, index) => `ravradar-trips-${index}`);
  const missingNames = requiredNames.filter(name => !databases.some(candidate => candidate.name === name));
  if (databases.length + missingNames.length > SHARD_COUNT) {
    throw new Error('Gratisarkitekturen kræver en dedikeret Cloudflare-konto med plads til præcis ti RavRadar D1-databaser.');
  }
  const selected = [];
  for (let index = 0; index < SHARD_COUNT; index += 1) {
    const name = `ravradar-trips-${index}`;
    let database = databases.find(candidate => candidate.name === name);
    if (!database) {
      const created = await cloudflare('/d1/database', {
        method: 'POST',
        body: JSON.stringify({ name, jurisdiction: 'eu' }),
      });
      database = created.result;
      databases.push(database);
    }
    if (!database?.uuid || database.jurisdiction !== 'eu') {
      throw new Error(`${name} skal være oprettet med uforanderlig EU-jurisdiktion.`);
    }
    selected.push(database);
  }
  return selected;
}

async function applySchema(databases) {
  for (const database of databases) {
    for (const sql of D1_TRIP_SCHEMA_STATEMENTS) {
      const body = await cloudflare(`/d1/database/${database.uuid}/query`, {
        method: 'POST',
        body: JSON.stringify({ sql }),
      });
      if (!Array.isArray(body.result) || body.result.some(result => result?.success !== true)) {
        throw new Error(`Skemaet kunne ikke verificeres for ${database.name}.`);
      }
    }
  }
}

function writeWranglerConfiguration(databases) {
  const outputPath = path.resolve(required(configPath, 'TRIP_WRANGLER_CONFIG_PATH'));
  const configuration = {
    name: 'ravradar-trip-gateway',
    main: path.resolve('cloudflare/trip-gateway/worker.js').replaceAll('\\', '/'),
    compatibility_date: '2026-08-26',
    workers_dev: true,
    preview_urls: false,
    observability: { enabled: true },
    d1_databases: databases.map((database, index) => ({
      binding: `TRIP_DB_${index}`,
      database_name: database.name,
      database_id: database.uuid,
    })),
  };
  fs.writeFileSync(outputPath, `${JSON.stringify(configuration, null, 2)}\n`, { encoding: 'utf8', mode: 0o600 });
}

required(accountId, 'CLOUDFLARE_ACCOUNT_ID');
required(apiToken, 'CLOUDFLARE_API_TOKEN');
const databases = await ensureDatabases();
await applySchema(databases);
writeWranglerConfiguration(databases);
console.log(`Cloudflare D1 er klargjort med ${databases.length} EU-låste shards og skema v1.`);
