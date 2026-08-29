import {
  assertNoDirectIdentity,
  assertNoPrivateLocation,
  canonicalJson,
  externalTripPayload,
  externalTripRecord,
  isLegacyCompatibleTripReplay,
  sha256Hex,
  verifyTripGatewaySignature,
} from '../../supabase/functions/_shared/trip-storage.js';

const DATABASE_BINDINGS = Object.freeze(Array.from({ length: 10 }, (_, index) => `TRIP_DB_${index}`));
const JSON_HEADERS = Object.freeze({
  'Cache-Control': 'no-store',
  'Content-Type': 'application/json; charset=utf-8',
  'X-Content-Type-Options': 'nosniff',
});

function json(status, body) {
  return new Response(JSON.stringify(body), { status, headers: JSON_HEADERS });
}

function databases(env) {
  return DATABASE_BINDINGS.map(binding => {
    const database = env[binding];
    if (!database || typeof database.prepare !== 'function') throw new Error('D1_BINDING_MISSING');
    return database;
  });
}

async function requestBody(request) {
  const contentType = request.headers.get('content-type') || '';
  if (!contentType.toLowerCase().startsWith('application/json')) throw new Error('CONTENT_TYPE_INVALID');
  const contentLength = Number(request.headers.get('content-length') || 0);
  if (contentLength > 262_144) throw new Error('REQUEST_TOO_LARGE');
  const bodyText = await request.text();
  if (bodyText.length > 262_144) throw new Error('REQUEST_TOO_LARGE');
  return bodyText;
}

async function authorized(request, env, pathname, bodyText) {
  const secret = String(env.TRIP_GATEWAY_SHARED_SECRET || '');
  if (secret.length < 32) throw new Error('TRIP_GATEWAY_NOT_CONFIGURED');
  return verifyTripGatewaySignature({
    secret,
    timestamp: request.headers.get('x-ravradar-timestamp'),
    signature: request.headers.get('x-ravradar-signature'),
    method: request.method,
    pathname,
    bodyText,
  });
}

function parsedObject(bodyText) {
  const body = JSON.parse(bodyText);
  if (!body || typeof body !== 'object' || Array.isArray(body)) throw new Error('BODY_INVALID');
  return body;
}

async function validatedRecord(body) {
  const supplied = body.record;
  if (!supplied || typeof supplied !== 'object' || Array.isArray(supplied)) throw new Error('RECORD_INVALID');
  const payload = JSON.parse(String(supplied.payload_json || ''));
  const expected = await externalTripRecord({
    owner: { kind: supplied.owner_kind, subject: supplied.owner_subject },
    payload,
    source: supplied.source,
  });
  if (canonicalJson(supplied) !== canonicalJson(expected)) throw new Error('RECORD_INTEGRITY_INVALID');
  assertNoDirectIdentity(payload);
  return expected;
}

async function shardIndex(record) {
  const key = record.trip_id || record.client_observation_id;
  const digest = await sha256Hex(key);
  return Number.parseInt(digest.slice(0, 8), 16) % DATABASE_BINDINGS.length;
}

async function matchingTripRows(databaseList, record) {
  const rowsByDatabase = await Promise.all(databaseList.map(async (database, index) => {
    const verification = await databaseList[index].prepare(
      `select owner_subject, payload_sha256, payload_json, source from trip_observations
        where client_observation_id = ? or (? is not null and trip_id = ?)
        limit 2`
    ).bind(record.client_observation_id, record.trip_id, record.trip_id).all();
    return (verification?.results || []).map(row => ({ ...row, database_index: index }));
  }));
  return rowsByDatabase.flat();
}

async function compatibleStoredRow(row, record) {
  if (row.owner_subject !== record.owner_subject) return false;
  try {
    const storedPayload = JSON.parse(String(row.payload_json || ''));
    const storedDigestPayload = { ...storedPayload };
    delete storedDigestPayload.submitted_at;
    const storedHashValid = await sha256Hex(canonicalJson(storedDigestPayload)) === row.payload_sha256;
    if (!storedHashValid) return false;
    if (row.payload_sha256 === record.payload_sha256) return true;
    const incomingPayload = JSON.parse(record.payload_json);
    return isLegacyCompatibleTripReplay(storedPayload, incomingPayload, {
      allowMissingDerivedMatchedRuleIds:
        row.source === 'supabase-migration' && record.source === 'supabase-migration',
    });
  } catch {
    return false;
  }
}

async function ownerErased(controlDatabase, ownerSubject) {
  const query = await controlDatabase.prepare(
    `select owner_subject from trip_owner_erasure_tombstones
      where owner_subject = ?
      limit 1`
  ).bind(ownerSubject).all();
  return (query?.results || []).length === 1;
}

async function purgeOwnerTrips(databaseList, ownerSubject) {
  let deleted = 0;
  for (const database of databaseList) {
    const result = await database.prepare('delete from trip_observations where owner_subject = ?').bind(ownerSubject).run();
    deleted += Number(result?.meta?.changes || 0);
  }
  await databaseList[0].prepare('delete from trip_observation_registry where owner_subject = ?').bind(ownerSubject).run();
  if (!Number.isSafeInteger(deleted) || deleted < 0) throw new Error('TRIP_DELETE_INVALID');
  return deleted;
}

async function reserveTripIdentity(controlDatabase, record, targetDatabaseIndex) {
  await controlDatabase.prepare(
    `insert into trip_observation_registry (
      client_observation_id, trip_id, owner_subject, payload_sha256, target_database_index
    )
    select ?, ?, ?, ?, ?
    where not exists (
      select 1 from trip_owner_erasure_tombstones where owner_subject = ?
    )
    on conflict do nothing`
  ).bind(
    record.client_observation_id,
    record.trip_id,
    record.owner_subject,
    record.payload_sha256,
    targetDatabaseIndex,
    record.owner_subject,
  ).run();
  const verification = await controlDatabase.prepare(
    `select client_observation_id, trip_id, owner_subject, payload_sha256, target_database_index
      from trip_observation_registry
      where client_observation_id = ? or (? is not null and trip_id = ?)
      limit 2`
  ).bind(record.client_observation_id, record.trip_id, record.trip_id).all();
  const rows = verification?.results || [];
  if (await ownerErased(controlDatabase, record.owner_subject)) {
    throw new Error('TRIP_OWNER_ERASED');
  }
  if (rows.length !== 1
    || rows[0].client_observation_id !== record.client_observation_id
    || (rows[0].trip_id ?? null) !== (record.trip_id ?? null)
    || rows[0].owner_subject !== record.owner_subject
    || rows[0].payload_sha256 !== record.payload_sha256
    || Number(rows[0].target_database_index) !== targetDatabaseIndex) {
    throw new Error('TRIP_IDEMPOTENCY_CONFLICT');
  }
}

async function storeTrip(env, body) {
  const record = await validatedRecord(body);
  const databaseList = databases(env);
  if (await ownerErased(databaseList[0], record.owner_subject)) {
    throw new Error('TRIP_OWNER_ERASED');
  }
  const rowsBefore = await matchingTripRows(databaseList, record);
  if (rowsBefore.length > 1
    || (rowsBefore.length === 1 && !await compatibleStoredRow(rowsBefore[0], record))) {
    throw new Error('TRIP_IDEMPOTENCY_CONFLICT');
  }
  const targetDatabaseIndex = await shardIndex(record);
  await reserveTripIdentity(databaseList[0], record, targetDatabaseIndex);
  let insert = { meta: { changes: 0 } };
  if (rowsBefore.length === 0) {
    const database = databaseList[targetDatabaseIndex];
    insert = await database.prepare(
      `insert into trip_observations (
        storage_schema_version, owner_subject, owner_kind, trip_id, client_observation_id,
        observed_at, submitted_at, payload_json, payload_sha256, source
      ) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      on conflict do nothing`
    ).bind(
      record.storage_schema_version,
      record.owner_subject,
      record.owner_kind,
      record.trip_id,
      record.client_observation_id,
      record.observed_at,
      record.submitted_at,
      record.payload_json,
      record.payload_sha256,
      record.source,
    ).run();
  }
  if (await ownerErased(databaseList[0], record.owner_subject)) {
    await purgeOwnerTrips(databaseList, record.owner_subject);
    throw new Error('TRIP_OWNER_ERASED');
  }
  const rows = await matchingTripRows(databaseList, record);
  if (rows.length !== 1 || !await compatibleStoredRow(rows[0], record)) {
    throw new Error('TRIP_IDEMPOTENCY_CONFLICT');
  }
  return { duplicate: rowsBefore.length > 0 || Number(insert?.meta?.changes || 0) === 0 };
}

async function listTrips(env, body) {
  const ownerSubject = body.owner_subject;
  const limit = Math.max(1, Math.min(200, Math.round(Number(body.limit) || 100)));
  if (typeof ownerSubject !== 'string' || !/^(?:usr|anon)_v1_[A-Za-z0-9_-]{43}$/.test(ownerSubject)) {
    throw new Error('TRIP_OWNER_INVALID');
  }
  const databaseList = databases(env);
  if (await ownerErased(databaseList[0], ownerSubject)) return [];
  const collected = [];
  for (const database of databaseList) {
    const query = await database.prepare(
      `select payload_json, payload_sha256, observed_at from trip_observations
        where owner_subject = ?
        order by observed_at desc
        limit ?`
    ).bind(ownerSubject, limit).all();
    for (const row of query?.results || []) {
      const storedPayload = JSON.parse(String(row.payload_json || ''));
      const storedDigestPayload = { ...storedPayload };
      delete storedDigestPayload.submitted_at;
      if (await sha256Hex(canonicalJson(storedDigestPayload)) !== row.payload_sha256) {
        throw new Error('TRIP_STORED_RECORD_INTEGRITY_INVALID');
      }
      const schemaVersion = Number(storedPayload.schema_version ?? 1);
      if (schemaVersion === 2) {
        assertNoDirectIdentity(storedPayload);
        assertNoPrivateLocation(storedPayload);
      }
      const payload = externalTripPayload(storedPayload);
      assertNoDirectIdentity(payload);
      assertNoPrivateLocation(payload);
      collected.push(payload);
    }
  }
  if (await ownerErased(databaseList[0], ownerSubject)) return [];
  collected.sort((left, right) => String(right.observed_at || '').localeCompare(String(left.observed_at || '')));
  return collected.slice(0, limit);
}

async function countTrips(env) {
  let total = 0;
  for (const database of databases(env)) {
    const query = await database.prepare('select count(*) as trip_count from trip_observations').all();
    total += Number(query?.results?.[0]?.trip_count || 0);
  }
  if (!Number.isSafeInteger(total) || total < 0) throw new Error('TRIP_COUNT_INVALID');
  return total;
}

async function deleteOwnerTrips(env, body) {
  const ownerSubject = body.owner_subject;
  if (typeof ownerSubject !== 'string' || !/^(?:usr|anon)_v1_[A-Za-z0-9_-]{43}$/.test(ownerSubject)) {
    throw new Error('TRIP_OWNER_INVALID');
  }
  const databaseList = databases(env);
  await databaseList[0].prepare(
    `insert into trip_owner_erasure_tombstones (owner_subject)
      values (?)
      on conflict do nothing`
  ).bind(ownerSubject).run();
  return purgeOwnerTrips(databaseList, ownerSubject);
}

export async function handleRequest(request, env) {
  const url = new URL(request.url);
  if (request.method === 'GET' && url.pathname === '/health') {
    return json(200, {
      ok: true,
      service: 'ravradar-trip-gateway',
      contract_version: '4.0.311',
      storage_schema_version: 1,
      idempotency_registry_schema_version: 2,
      owner_erasure_tombstone_schema_version: 1,
      shards: 10,
    });
  }
  if (request.method !== 'POST' || !['/v1/trips/store', '/v1/trips/list', '/v1/trips/count', '/v1/trips/delete-owner'].includes(url.pathname)) {
    return json(404, { ok: false, error: 'NOT_FOUND' });
  }
  try {
    const bodyText = await requestBody(request);
    if (!await authorized(request, env, url.pathname, bodyText)) return json(401, { ok: false, error: 'UNAUTHORIZED' });
    const body = parsedObject(bodyText);
    if (url.pathname === '/v1/trips/store') return json(200, { ok: true, ...await storeTrip(env, body) });
    if (url.pathname === '/v1/trips/list') return json(200, { ok: true, rows: await listTrips(env, body) });
    if (url.pathname === '/v1/trips/delete-owner') return json(200, { ok: true, deleted: await deleteOwnerTrips(env, body) });
    return json(200, { ok: true, trip_count: await countTrips(env) });
  } catch (error) {
    const knownConflict = error?.message === 'TRIP_IDEMPOTENCY_CONFLICT';
    return json(knownConflict ? 409 : 400, { ok: false, error: knownConflict ? 'TRIP_IDEMPOTENCY_CONFLICT' : 'INVALID_REQUEST' });
  }
}

export default { fetch: handleRequest };
