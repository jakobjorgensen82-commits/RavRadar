import fs from 'node:fs';
import path from 'node:path';
import { D1_TRIP_SCHEMA_STATEMENTS } from '../supabase/functions/_shared/trip-storage.js';
import { boundedFetch } from './lib/bounded-fetch.mjs';
import {
  TRIP_STORAGE_REQUIRED_SHARD_NAMES,
  TRIP_STORAGE_SHARD_COUNT as SHARD_COUNT,
  classifyExistingTripStorageDatabases,
  verifyLegacyActivationEvidence,
} from './lib/trip-storage-legacy-classification.mjs';

const arguments_ = process.argv.slice(2);
const repairOnly = arguments_.length === 1 && arguments_[0] === '--existing-worker-repair';
if (arguments_.length && !repairOnly) throw new Error('TRIP_PREPARATION_ARGUMENTS_INVALID');

const accountId = process.env.CLOUDFLARE_ACCOUNT_ID?.trim();
const apiToken = process.env.CLOUDFLARE_API_TOKEN?.trim();
const configPath = process.env.TRIP_WRANGLER_CONFIG_PATH?.trim();
const apiOrigin = 'https://api.cloudflare.com/client/v4';

function required(value, name) {
  if (!value) throw new Error(`${name} mangler.`);
  return value;
}

async function cloudflare(pathname, init = {}) {
  const response = await boundedFetch(`${apiOrigin}/accounts/${required(accountId, 'CLOUDFLARE_ACCOUNT_ID')}${pathname}`, {
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

async function listDatabases(readOnlyRepair = false) {
  const rows = [];
  for (let page = 1; ; page += 1) {
    const body = await cloudflare(`/d1/database?page=${page}&per_page=100`);
    if (!Array.isArray(body.result)) throw new Error('Cloudflare returnerede en ugyldig databaseliste.');
    if (readOnlyRepair) {
      const info = body.result_info;
      if ((page === 1 && body.result.length !== SHARD_COUNT) || (page === 2 && body.result.length !== 0)
        || (info?.page !== undefined && info.page !== page)
        || (info?.per_page !== undefined && info.per_page !== 100)
        || (info?.count !== undefined && info.count !== body.result.length)
        || (info?.total_count !== undefined && info.total_count !== SHARD_COUNT)) {
        throw new Error('TRIP_REPAIR_DATABASE_LIST_INVALID');
      }
      // An explicit empty second page also bounds providers omitting optional totals.
      if (page === 2) return rows;
      rows.push(...body.result);
      continue;
    }
    rows.push(...body.result);
    const totalPages = Number(body.result_info?.total_pages || 1);
    if (page >= totalPages) return rows;
  }
}

async function ensureDatabases(existingDatabases) {
  const databases = [...existingDatabases];
  const requiredNames = TRIP_STORAGE_REQUIRED_SHARD_NAMES;
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

async function d1ActivationAttempted(database) {
  const body = await cloudflare(`/d1/database/${database.uuid}/query`, {
    method: 'POST',
    body: JSON.stringify({
      sql: `select control_value from trip_storage_control
        where control_key = 'd1_activation_attempted'
        limit 1`,
    }),
  });
  const result = body.result?.[0];
  if (result?.success !== true || !Array.isArray(result.results)) {
    throw new Error('D1-aktiveringsgrænsen kunne ikke læses sikkert.');
  }
  if (result.results.length === 0) return false;
  return result.results.length === 1 && result.results[0]?.control_value === 'true';
}

function publishActivationState(attempted, legacyD1Detected) {
  const outputPath = process.env.GITHUB_OUTPUT?.trim();
  if (!outputPath) return;
  fs.appendFileSync(outputPath, `d1_activation_attempted=${attempted ? 'true' : 'false'}\n`, 'utf8');
  fs.appendFileSync(outputPath, `legacy_d1_detected=${legacyD1Detected ? 'true' : 'false'}\n`, 'utf8');
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

function schemaTokens(sql) {
  if (typeof sql !== 'string') throw new Error('TRIP_REPAIR_SCHEMA_INVALID');
  // Preserve quoted literals exactly, normalize only SQL words/spacing.
  const tokens = sql.match(/'(?:''|[^'])*'|"(?:""|[^"])*"|[A-Za-z_][A-Za-z_0-9]*|\d+|[^\s]/g) || [];
  const normalized = tokens.map(token => /^[A-Za-z_]/.test(token) ? token.toLowerCase() : token);
  const exists = normalized.indexOf('if');
  if (exists >= 0 && normalized.slice(exists, exists + 3).join(' ') === 'if not exists') normalized.splice(exists, 3);
  if (normalized.at(-1) === ';') normalized.pop();
  return JSON.stringify(normalized);
}

async function repairQuery(database, sql, params = []) {
  const body = await cloudflare(`/d1/database/${database.uuid}/query`, {
    method: 'POST', body: JSON.stringify({ sql, params }),
  });
  if (!Array.isArray(body.result) || body.result.length !== 1
    || body.result[0]?.success !== true || !Array.isArray(body.result[0].results)) {
    throw new Error('TRIP_REPAIR_READBACK_INVALID');
  }
  return body.result[0].results;
}

async function prepareExistingRepair() {
  const databases = await listDatabases(true);
  if (classifyExistingTripStorageDatabases(databases) !== 'legacy') {
    throw new Error('TRIP_REPAIR_EXISTING_D1_REQUIRED');
  }
  if (databases.some(database => typeof database?.uuid !== 'string'
    || !/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(database.uuid))
    || new Set(databases.map(database => database.uuid.toLowerCase())).size !== SHARD_COUNT) {
    throw new Error('TRIP_REPAIR_DATABASE_ID_INVALID');
  }
  const ordered = TRIP_STORAGE_REQUIRED_SHARD_NAMES.map(name => databases.find(database => database.name === name));
  const definitions = D1_TRIP_SCHEMA_STATEMENTS.map(sql => {
    const match = /^create\s+(?:unique\s+)?(table|index)\s+if\s+not\s+exists\s+([a-z_]+)/i.exec(sql.trim());
    if (!match) throw new Error('TRIP_REPAIR_SOURCE_SCHEMA_INVALID');
    return { type: match[1], name: match[2], tokens: schemaTokens(sql) };
  });
  for (const database of ordered) {
    const rows = await repairQuery(database,
      `select type, name, sql from sqlite_master where name in (${definitions.map(() => '?').join(',')})`,
      definitions.map(definition => definition.name));
    if (rows.length !== definitions.length || definitions.some(definition => {
      const matches = rows.filter(row => row?.name === definition.name);
      return matches.length !== 1 || matches[0].type !== definition.type
        || schemaTokens(matches[0].sql) !== definition.tokens;
    })) throw new Error('TRIP_REPAIR_SCHEMA_MISMATCH');
  }
  const activation = await repairQuery(ordered[0],
    "select control_value from trip_storage_control where control_key = ?",
    ['d1_activation_attempted']);
  if (activation.length !== 1 || activation[0]?.control_value !== 'true') {
    throw new Error('TRIP_REPAIR_ACTIVATION_REQUIRED');
  }
  writeWranglerConfiguration(ordered);
  // No marker, legacy evidence adoption, schema operation or output receipt.
  console.log('Existing ten EU D1 bindings and ordinary schema read-only verified for Worker repair.');
}

if (repairOnly) {
  try { await prepareExistingRepair(); }
  catch { throw new Error('TRIP_REPAIR_PREPARATION_FAILED'); }
} else {
required(accountId, 'CLOUDFLARE_ACCOUNT_ID');
required(apiToken, 'CLOUDFLARE_API_TOKEN');
const existingDatabases = await listDatabases();
const installationClass = classifyExistingTripStorageDatabases(existingDatabases);
const legacyD1Detected = installationClass === 'legacy';
if (legacyD1Detected) {
  await verifyLegacyActivationEvidence({
    fetchImpl: boundedFetch,
    githubToken: process.env.GITHUB_TOKEN,
    repository: process.env.GITHUB_REPOSITORY,
  });
}
const databases = await ensureDatabases(existingDatabases);
await applySchema(databases);
const activationAttempted = await d1ActivationAttempted(databases[0]);
writeWranglerConfiguration(databases);
publishActivationState(activationAttempted, legacyD1Detected);
console.log(`Cloudflare D1 er klargjort med ${databases.length} EU-låste shards, skema v1 og en verificeret cutoverfase.`);
}
