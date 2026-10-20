import fs from 'node:fs';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { verifyExistingWorkerBindings } from './verify-cloudflare-trip-gateway.mjs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { D1_TRIP_SCHEMA_STATEMENTS } from '../supabase/functions/_shared/trip-storage.js';
import { boundedFetch } from './lib/bounded-fetch.mjs';
import {
  TRIP_STORAGE_REQUIRED_SHARD_NAMES,
  TRIP_STORAGE_SHARD_COUNT as SHARD_COUNT,
  classifyExistingTripStorageDatabases,
  verifyLegacyActivationEvidence,
} from './lib/trip-storage-legacy-classification.mjs';

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

export async function applySchema(databases, { query = cloudflare } = {}) {
  for (const database of databases) {
    for (const sql of D1_TRIP_SCHEMA_STATEMENTS) {
      const body = await query(`/d1/database/${database.uuid}/query`, {
        method: 'POST',
        body: JSON.stringify({ sql }),
      });
      if (!Array.isArray(body.result) || body.result.length !== 1 || body.result[0]?.success !== true) {
        throw new Error(`Skemaet kunne ikke verificeres for ${database.name}.`);
      }
    }
    await verifyOwnerExportIndex(database, query);
  }
}

async function verifyOwnerExportIndex(database, query) {
  const invalid = () => new Error('TRIP_EXPORT_INDEX_READBACK_INVALID');
  const readMetadata = async sql => {
    const body = await query(`/d1/database/${database.uuid}/query`, {
      method: 'POST', body: JSON.stringify({ sql }),
    });
    if (!Array.isArray(body?.result) || body.result.length !== 1
      || body.result[0]?.success !== true || !Array.isArray(body.result[0].results)) throw invalid();
    return body.result[0].results;
  };
  // Match migration 002's ordinary, full, ascending BINARY keyset index.
  // CREATE IF NOT EXISTS alone accepts a pre-existing same-name wrong index.
  const indexes = await readMetadata("pragma index_list('trip_observations')");
  const matches = indexes.filter(row => row?.name === 'trip_observations_owner_export');
  if (matches.length !== 1 || matches[0].unique !== 0
    || matches[0].origin !== 'c' || matches[0].partial !== 0) throw invalid();
  const columns = await readMetadata("pragma index_xinfo('trip_observations_owner_export')");
  if (columns.some(row => !row || ![0, 1].includes(row.key)
    || !Number.isSafeInteger(row.seqno) || row.seqno < 0)
    || new Set(columns.map(row => row.seqno)).size !== columns.length) throw invalid();
  // SQLite also reports auxiliary rowid metadata with key=0; it is not a
  // fourth indexed key and cannot conceal an unexpected key=1 column.
  const keys = columns.filter(row => row.key === 1);
  const expected = ['owner_subject', 'client_observation_id', 'created_at'];
  if (keys.length !== expected.length || keys.some((row, index) => row.seqno !== index
    || row.name !== expected[index] || row.desc !== 0 || row.coll !== 'BINARY'
    || !Number.isSafeInteger(row.cid) || row.cid < 0)) throw invalid();
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

export function schemaTokens(sql) {
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

function upgradeFailure() { return new Error('TRIP_OWNER_EXPORT_UPGRADE_UNVERIFIED'); }

function upgradeMainAndLease(requireLease) {
  const env = process.env;
  if (env.GITHUB_REF !== 'refs/heads/main' || !/^[a-f0-9]{40}$/.test(env.GITHUB_SHA || '')) throw upgradeFailure();
  const readGit = args => execFileSync('git', args, { encoding: 'utf8', stdio: 'pipe', timeout: 15000, maxBuffer: 4096 }).trim();
  if (readGit(['rev-parse', 'HEAD^{commit}']) !== env.GITHUB_SHA
    || readGit(['ls-remote', 'origin', 'refs/heads/main']) !== `${env.GITHUB_SHA}\trefs/heads/main`) throw upgradeFailure();
  if (requireLease) {
    const remaining = Number(env.REPAIR_LEASE_DEADLINE) - Date.now();
    if (!Number.isSafeInteger(Number(env.REPAIR_LEASE_DEADLINE)) || remaining < 600000 || remaining > 1200000) throw upgradeFailure();
  }
}

async function inspectOwnerExportShard(database, definitions) {
  const rows = await repairQuery(database,
    `select type, name, sql from sqlite_master where name in (${definitions.map(() => '?').join(',')})`,
    definitions.map(row => row.name));
  const absent = !rows.some(row => row?.name === 'trip_observations_owner_export');
  if (rows.length !== definitions.length - Number(absent) || definitions.some((definition, index) => {
    const matches = rows.filter(row => row?.name === definition.name);
    if (absent && index === 9) return false;
    return matches.length !== 1 || matches[0].type !== definition.type || schemaTokens(matches[0].sql) !== definition.tokens;
  })) throw upgradeFailure();
  if (!absent) await verifyOwnerExportIndex(database, cloudflare);
  return absent;
}

async function inspectOwnerExportShards() {
  const databases = await listDatabases(true);
  if (classifyExistingTripStorageDatabases(databases) !== 'legacy'
    || databases.some(row => typeof row.uuid !== 'string' || !/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(row.uuid))
    || new Set(databases.map(row => row.uuid.toLowerCase())).size !== SHARD_COUNT) throw upgradeFailure();
  const ordered = TRIP_STORAGE_REQUIRED_SHARD_NAMES.map(name => databases.find(row => row.name === name));
  const definitions = D1_TRIP_SCHEMA_STATEMENTS.map(sql => {
    const match = /^create\s+(?:unique\s+)?(table|index)\s+if\s+not\s+exists\s+([a-z_]+)/i.exec(sql.trim());
    if (!match) throw upgradeFailure();
    return { type: match[1], name: match[2], tokens: schemaTokens(sql) };
  });
  if (definitions.length !== 10 || definitions.at(-1).name !== 'trip_observations_owner_export') throw upgradeFailure();
  const missing = [];
  for (const database of ordered) {
    if (await inspectOwnerExportShard(database, definitions)) missing.push(database.uuid);
  }
  const activation = await repairQuery(ordered[0],
    'select control_value from trip_storage_control where control_key = ?', ['d1_activation_attempted']);
  if (activation.length !== 1 || activation[0]?.control_value !== 'true') throw upgradeFailure();
  return { ordered, missing, definitions, bindings: ordered.map((row, index) => ({ binding: `TRIP_DB_${index}`, database_name: row.name, database_id: row.uuid })) };
}

async function prepareOwnerExportUpgrade(phase) {
  try {
    if (!['plan', 'apply', 'check'].includes(phase) || process.env.TRIP_STORAGE_OWNER_EXPORT_UPGRADE !== '1') throw upgradeFailure();
    const planPath = required(process.env.TRIP_OWNER_EXPORT_PLAN_PATH?.trim(), 'TRIP_OWNER_EXPORT_PLAN_PATH');
    upgradeMainAndLease(phase !== 'plan');
    // The immutable ordinary migration text is the only permitted write payload.
    const migration = fs.readFileSync('cloudflare/trip-gateway/migrations/002_owner_export_keyset.sql');
    const migrationSha256 = createHash('sha256').update(migration).digest('hex');
    if (migrationSha256 !== 'a84490c7cd8a173447188cbec3c275714195f29688340cbbd35b33ff4248a4eb') throw upgradeFailure();
    const inspection = await inspectOwnerExportShards();
    const descriptor = { accountId, apiToken, workerName: 'ravradar-trip-gateway', expectedBindings: inspection.bindings };
    if (phase === 'plan') {
      const current = await verifyExistingWorkerBindings(descriptor);
      upgradeMainAndLease(false);
      writeWranglerConfiguration(inspection.ordered);
      fs.writeFileSync(planPath, JSON.stringify({ sourceSha: process.env.GITHUB_SHA, migrationSha256,
        versionId: current.versionId, bindings: inspection.bindings, missing: inspection.missing }) + '\n', { encoding: 'utf8', mode: 0o600, flag: 'wx' });
      return;
    }
    const planBytes = fs.readFileSync(planPath);
    if (planBytes.length > 8192) throw upgradeFailure();
    const plan = JSON.parse(planBytes.toString('utf8'));
    const configuration = JSON.parse(fs.readFileSync(required(configPath, 'TRIP_WRANGLER_CONFIG_PATH'), 'utf8'));
    if (plan?.sourceSha !== process.env.GITHUB_SHA || plan?.migrationSha256 !== migrationSha256
      || typeof plan.versionId !== 'string' || !/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(plan.versionId)
      || JSON.stringify(plan.bindings) !== JSON.stringify(inspection.bindings)
      || !Array.isArray(plan.missing) || plan.missing.length > 10 || new Set(plan.missing).size !== plan.missing.length
      || plan.missing.some(id => !inspection.ordered.some(row => row.uuid === id))
      || inspection.missing.some(id => !plan.missing.includes(id))
      || configuration.name !== descriptor.workerName || JSON.stringify(configuration.d1_databases) !== JSON.stringify(plan.bindings)
      || configuration.main !== path.resolve('cloudflare/trip-gateway/worker.js').replaceAll('\\', '/')
      || JSON.stringify(Object.keys(configuration).sort()) !== JSON.stringify(['compatibility_date','d1_databases','main','name','observability','preview_urls','workers_dev'])
      || configuration.compatibility_date !== '2026-08-26' || configuration.workers_dev !== true || configuration.preview_urls !== false
      || JSON.stringify(configuration.observability) !== '{"enabled":true}') throw upgradeFailure();
    descriptor.expectedVersion = plan.versionId;
    await verifyExistingWorkerBindings(descriptor);
    if (phase === 'check' && inspection.missing.length) throw upgradeFailure();
    if (phase === 'apply') {
      for (const database of inspection.ordered.filter(row => inspection.missing.includes(row.uuid))) {
        await verifyExistingWorkerBindings(descriptor);
        if (!await inspectOwnerExportShard(database, inspection.definitions)) continue;
        upgradeMainAndLease(true);
        const body = await cloudflare(`/d1/database/${database.uuid}/query`, {
          method: 'POST', body: JSON.stringify({ sql: migration.toString('utf8') }),
        });
        if (!Array.isArray(body.result) || body.result.length !== 1 || body.result[0]?.success !== true) throw upgradeFailure();
        await verifyOwnerExportIndex(database, cloudflare);
      }
      const final = await inspectOwnerExportShards();
      if (final.missing.length || JSON.stringify(final.bindings) !== JSON.stringify(plan.bindings)) throw upgradeFailure();
      await verifyExistingWorkerBindings(descriptor);
    }
    upgradeMainAndLease(true);
  } catch { throw upgradeFailure(); }
}


// Schema acknowledgments are not owner-deletion, Auth or backup receipts.
export function assertOwnerErasureSchemaAcknowledgment(value, expected) {
  const fail=()=>{throw new Error('TRIP_OWNER_ERASURE_SCHEMA_ACK_INVALID');};
  if (!expected || expected.kind !== 'TRIP_OWNER_ERASURE_INSERT_FENCE_SCHEMA_PLAN'
    || !Array.isArray(expected.shardIdentities) || expected.shardIdentities.length !== 10
    || expected.shardIdentities.some(value=>typeof value!=='string'||!/^[a-f0-9]{64}$/.test(value))
    || new Set(expected.shardIdentities).size !== 10) fail();
  if (!value || typeof value !== 'object' || Array.isArray(value)
    || JSON.stringify(Object.keys(value).sort()) !== JSON.stringify([
      'authDeleted','backupsDeleted','bindingMappingSha256','kind','migrationSha256',
      'ownerErased','physicalDrainClaimed','shards','sourceSha','workerVersionId'].sort())
    || value.kind !== 'TRIP_OWNER_ERASURE_INSERT_FENCE_SCHEMA_ACK'
    || value.migrationSha256 !== '40c4590dd2c10e4ce8384cb98ef4be5b399bf7ba5fe6bcc270430c1e6093d83e'
    || value.sourceSha !== expected.sourceSha || !/^[a-f0-9]{40}$/.test(value.sourceSha)
    || value.workerVersionId !== expected.workerVersionId
    || !/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(value.workerVersionId)
    || value.bindingMappingSha256 !== expected.bindingMappingSha256
    || !/^[a-f0-9]{64}$/.test(value.bindingMappingSha256)
    || value.ownerErased !== false || value.physicalDrainClaimed !== false
    || value.authDeleted !== false || value.backupsDeleted !== false
    || !Array.isArray(value.shards) || value.shards.length !== 10) fail();
  const identities=new Set();
  for (const [index,row] of value.shards.entries()) {
    if (!row || typeof row !== 'object' || Array.isArray(row)
      || Object.keys(row).sort().join(',') !== 'databaseIdentitySha256,index,triggerDefinitionSha256'
      || row.index !== index || !/^[a-f0-9]{64}$/.test(row.databaseIdentitySha256)
      || row.databaseIdentitySha256 !== expected.shardIdentities[index]
      || identities.has(row.databaseIdentitySha256)
      || row.triggerDefinitionSha256 !== expected.triggerDefinitionSha256) fail();
    identities.add(row.databaseIdentitySha256);
  }
  if (!/^[a-f0-9]{64}$/.test(expected.triggerDefinitionSha256)) fail();
  return value;
}

export async function prepareOwnerErasureGuard(phase) {
  const failure = () => new Error('TRIP_OWNER_ERASURE_GUARD_UNVERIFIED');
  if (!['plan', 'apply', 'check'].includes(phase) || process.env.TRIP_STORAGE_OWNER_ERASURE_GUARD !== '1') throw failure();
  upgradeMainAndLease(phase === 'apply');
  // Separate additive operation: never create/adopt shards or repair missing 002.
  const migrations = [
    ['001_trip_observations.sql', 'c076a6163f9dfeb869397f354ebe955efa03cd4fb5498d10c6dfc61715ae1368'],
    ['002_owner_export_keyset.sql', 'a84490c7cd8a173447188cbec3c275714195f29688340cbbd35b33ff4248a4eb'],
    ['003_owner_erasure_insert_guard.sql', '40c4590dd2c10e4ce8384cb98ef4be5b399bf7ba5fe6bcc270430c1e6093d83e'],
  ].map(([name, expected]) => {
    const bytes = fs.readFileSync(`cloudflare/trip-gateway/migrations/${name}`);
    const text=bytes.toString('utf8');
    if (/\r(?!\n)/.test(text)) throw failure();
    const canonical=text.replace(/\r\n/g,'\n');
    if (createHash('sha256').update(canonical).digest('hex') !== expected) throw failure();
    return canonical;
  });
  const migration = migrations[2];
  const expectedTrigger = schemaTokens(migration.slice(migration.indexOf('CREATE TRIGGER')));
  const triggerDefinitionSha256=createHash('sha256').update(expectedTrigger).digest('hex');
  const inspectTrigger = async database => {
    const rows = await repairQuery(database,
      'select type, name, tbl_name, sql from sqlite_master where name = ?',
      ['trip_observations_erased_owner_no_insert']);
    if (rows.length === 0) return null;
    if (rows.length !== 1 || !rows[0] || Object.keys(rows[0]).sort().join(',') !== 'name,sql,tbl_name,type'
      || rows[0]?.type !== 'trigger'
      || rows[0].name !== 'trip_observations_erased_owner_no_insert'
      || rows[0].tbl_name !== 'trip_observations'
      || schemaTokens(rows[0].sql) !== expectedTrigger) throw failure();
    return { databaseIdentitySha256:createHash('sha256').update(database.uuid.toLowerCase()).digest('hex'),
      triggerDefinitionSha256:createHash('sha256').update(schemaTokens(rows[0].sql)).digest('hex') };
  };
  const inspection = await inspectOwnerExportShards();
  if (inspection.missing.length) throw failure();
  const descriptor = { accountId, apiToken, workerName: 'ravradar-trip-gateway', expectedBindings: inspection.bindings };
  const current = await verifyExistingWorkerBindings(descriptor);
  descriptor.expectedVersion = current.versionId;
  const bindingMappingSha256=createHash('sha256').update(JSON.stringify(inspection.bindings)).digest('hex');
  if (phase !== 'plan' && (process.env.TRIP_OWNER_ERASURE_EXPECTED_WORKER_VERSION !== current.versionId
    || process.env.TRIP_OWNER_ERASURE_EXPECTED_BINDINGS_SHA256 !== bindingMappingSha256)) throw failure();
  const missing = [];
  // Inspect all ten definitions before the first possible DDL.
  for (const database of inspection.ordered) if (!await inspectTrigger(database)) missing.push(database);
  await verifyExistingWorkerBindings(descriptor);
  const plan={kind:'TRIP_OWNER_ERASURE_INSERT_FENCE_SCHEMA_PLAN',sourceSha:process.env.GITHUB_SHA,
    workerVersionId:current.versionId,bindingMappingSha256,triggerDefinitionSha256,
    migrationSha256:'40c4590dd2c10e4ce8384cb98ef4be5b399bf7ba5fe6bcc270430c1e6093d83e',
    shardIdentities:inspection.ordered.map(database=>createHash('sha256').update(database.uuid.toLowerCase()).digest('hex')),
    missingShards:missing.map(database=>inspection.ordered.indexOf(database))};
  if (phase === 'plan') return plan;
  if (phase === 'check' && missing.length) throw failure();
  if (phase === 'apply') {
    for (const database of missing) {
      await verifyExistingWorkerBindings(descriptor);
      if (await inspectOwnerExportShard(database, inspection.definitions)) throw failure();
      // An exact concurrent addition is not overwritten; any other definition refuses.
      if (await inspectTrigger(database)) continue;
      upgradeMainAndLease(true);
      const body = await cloudflare(`/d1/database/${database.uuid}/query`, {
        method: 'POST', body: JSON.stringify({ sql: migration }),
      });
      if (!Array.isArray(body.result) || body.result.length !== 1 || body.result[0]?.success !== true) throw failure();
      if (!await inspectTrigger(database)) throw failure();
    }
    const final = await inspectOwnerExportShards();
    if (final.missing.length || JSON.stringify(final.bindings) !== JSON.stringify(inspection.bindings)) throw failure();
    for (const database of final.ordered) if (!await inspectTrigger(database)) throw failure();
    await verifyExistingWorkerBindings(descriptor);
  }
  upgradeMainAndLease(phase === 'apply');
  // Actual ten final metadata acknowledgments, never an owner-ledger/Auth phase.
  const shards=[];
  for (const [index,database] of inspection.ordered.entries()) {
    const acknowledgment=await inspectTrigger(database); if (!acknowledgment) throw failure();
    shards.push({index,...acknowledgment});
  }
  await verifyExistingWorkerBindings(descriptor);
  upgradeMainAndLease(phase === 'apply');
  const receipt={kind:'TRIP_OWNER_ERASURE_INSERT_FENCE_SCHEMA_ACK',sourceSha:process.env.GITHUB_SHA,
    migrationSha256:plan.migrationSha256,workerVersionId:current.versionId,bindingMappingSha256,shards,
    ownerErased:false,physicalDrainClaimed:false,authDeleted:false,backupsDeleted:false};
  return assertOwnerErasureSchemaAcknowledgment(receipt,plan);
}

async function main() {
const arguments_ = process.argv.slice(2);
const repairOnly = arguments_.length === 1 && arguments_[0] === '--existing-worker-repair';
const upgradePhase = arguments_.length === 1 ? ({
  '--existing-owner-export-upgrade-plan': 'plan',
  '--existing-owner-export-upgrade-apply': 'apply',
  '--existing-owner-export-upgrade-check': 'check',
})[arguments_[0]] : undefined;
const erasurePhase = arguments_.length === 1 ? ({
  '--existing-owner-erasure-guard-plan': 'plan',
  '--existing-owner-erasure-guard-apply': 'apply',
  '--existing-owner-erasure-guard-check': 'check',
})[arguments_[0]] : undefined;
if (arguments_.length && !repairOnly && !upgradePhase && !erasurePhase) throw new Error('TRIP_PREPARATION_ARGUMENTS_INVALID');
if (erasurePhase) { const receipt=await prepareOwnerErasureGuard(erasurePhase); console.log(JSON.stringify(receipt)); return receipt; }
if (upgradePhase) { await prepareOwnerExportUpgrade(upgradePhase); return; }

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
console.log(`Cloudflare D1 er klargjort med ${databases.length} EU-låste shards, skema v1, verificeret eksportindeks og cutoverfase.`);
}
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await main();
}
