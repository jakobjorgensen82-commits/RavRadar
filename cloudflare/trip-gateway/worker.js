import {
  assertNoDirectIdentity,
  canonicalJson,
  externalTripRecord,
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

async function storeTrip(env, body) {
  const record = await validatedRecord(body);
  const database = databases(env)[await shardIndex(record)];
  const insert = await database.prepare(
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
  const verification = await database.prepare(
    `select owner_subject, payload_sha256 from trip_observations
      where client_observation_id = ? or (? is not null and trip_id = ?)
      limit 2`
  ).bind(record.client_observation_id, record.trip_id, record.trip_id).all();
  const rows = verification?.results || [];
  if (rows.length !== 1 || rows[0].owner_subject !== record.owner_subject || rows[0].payload_sha256 !== record.payload_sha256) {
    throw new Error('TRIP_IDEMPOTENCY_CONFLICT');
  }
  return { duplicate: Number(insert?.meta?.changes || 0) === 0 };
}

async function listTrips(env, body) {
  const ownerSubject = body.owner_subject;
  const limit = Math.max(1, Math.min(200, Math.round(Number(body.limit) || 100)));
  if (typeof ownerSubject !== 'string' || !/^(?:usr|anon)_v1_[A-Za-z0-9_-]{43}$/.test(ownerSubject)) {
    throw new Error('TRIP_OWNER_INVALID');
  }
  const collected = [];
  for (const database of databases(env)) {
    const query = await database.prepare(
      `select payload_json, observed_at from trip_observations
        where owner_subject = ?
        order by observed_at desc
        limit ?`
    ).bind(ownerSubject, limit).all();
    for (const row of query?.results || []) {
      const payload = JSON.parse(String(row.payload_json || ''));
      assertNoDirectIdentity(payload);
      collected.push(payload);
    }
  }
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
  let deleted = 0;
  for (const database of databases(env)) {
    const result = await database.prepare('delete from trip_observations where owner_subject = ?').bind(ownerSubject).run();
    deleted += Number(result?.meta?.changes || 0);
  }
  if (!Number.isSafeInteger(deleted) || deleted < 0) throw new Error('TRIP_DELETE_INVALID');
  return deleted;
}

export async function handleRequest(request, env) {
  const url = new URL(request.url);
  if (request.method === 'GET' && url.pathname === '/health') {
    return json(200, { ok: true, service: 'ravradar-trip-gateway', storage_schema_version: 1, shards: 10 });
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
