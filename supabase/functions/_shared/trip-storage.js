const CLOUDFLARE_WORKER_SUFFIX = '.workers.dev';
const OWNER_PREFIX = Object.freeze({ user: 'usr_v1_', anonymous: 'anon_v1_' });
const DIRECT_IDENTITY_KEYS = new Set([
  'anonymousid', 'displayname', 'email', 'fullname', 'phonenumber', 'profile', 'userid'
]);

export const TRIP_INPUT_FIELD_NAMES = Object.freeze([
  'zone_id', 'zone_name', 'coast_type', 'observed_at', 'submitted_at', 'hunt_mode', 'result', 'grams',
  'anonymous_id', 'user_id', 'trip_id', 'gps', 'rav_score', 'score_level', 'ai_probability', 'ai_confidence',
  'model_version', 'weather_snapshot', 'wind_speed_mps', 'wind_direction_deg', 'wave_height_m', 'wave_period_s',
  'water_level_cm', 'current_speed_mps', 'current_direction_deg', 'water_temperature_c', 'client_observation_id',
  'schema_version', 'trip_started_at', 'trip_ended_at', 'search_minutes', 'search_coverage', 'actual_zone_id',
  'actual_coastal_part_id', 'forecast_zone_id', 'forecast_coastal_part_id', 'calibration_eligible', 'found',
  'forecast_snapshot_id', 'forecast_issued_at', 'forecast_valid_at', 'forecast_captured_at', 'calibration_features',
  'data_quality_flags', 'forecast_target_at', 'report_accuracy',
]);

export const D1_TRIP_SCHEMA_STATEMENTS = Object.freeze([
  `create table if not exists trip_observations (
    storage_schema_version integer not null default 1 check (storage_schema_version = 1),
    owner_subject text not null check (length(owner_subject) between 20 and 96),
    owner_kind text not null check (owner_kind in ('user', 'anonymous')),
    trip_id text,
    client_observation_id text not null,
    observed_at text not null,
    submitted_at text not null,
    payload_json text not null check (json_valid(payload_json)),
    payload_sha256 text not null check (length(payload_sha256) = 64),
    source text not null check (source in ('live', 'supabase-migration')),
    created_at text not null default (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    primary key (client_observation_id)
  )`,
  `create unique index if not exists trip_observations_trip_id_unique
    on trip_observations(trip_id) where trip_id is not null`,
  `create index if not exists trip_observations_owner_time
    on trip_observations(owner_subject, observed_at desc)`,
]);

function isRecord(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function utf8(value) {
  return new TextEncoder().encode(String(value));
}

function bytesToHex(bytes) {
  return [...bytes].map(byte => byte.toString(16).padStart(2, '0')).join('');
}

function bytesToBase64Url(bytes) {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  const encoded = typeof btoa === 'function'
    ? btoa(binary)
    : globalThis.Buffer.from(bytes).toString('base64');
  return encoded.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

async function hmacHex(secret, value) {
  if (typeof secret !== 'string' || secret.length < 32) throw new Error('TRIP_GATEWAY_SECRET_INVALID');
  const key = await crypto.subtle.importKey('raw', utf8(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const signature = await crypto.subtle.sign('HMAC', key, utf8(value));
  return bytesToHex(new Uint8Array(signature));
}

export async function sha256Hex(value) {
  return bytesToHex(new Uint8Array(await crypto.subtle.digest('SHA-256', utf8(value))));
}

export async function externalOwnerSubject({ userId = null, anonymousId = null, secret }) {
  const kind = userId ? 'user' : 'anonymous';
  const rawId = userId || anonymousId;
  if (typeof rawId !== 'string' || !rawId.trim()) throw new Error('TRIP_OWNER_REQUIRED');
  if (typeof secret !== 'string' || secret.length < 32) throw new Error('TRIP_PSEUDONYM_SECRET_INVALID');
  const key = await crypto.subtle.importKey('raw', utf8(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const signature = await crypto.subtle.sign('HMAC', key, utf8(`ravradar-trip-owner:v1:${kind}:${rawId}`));
  return { kind, subject: `${OWNER_PREFIX[kind]}${bytesToBase64Url(new Uint8Array(signature))}` };
}

function normalizedKey(key) {
  return String(key).toLowerCase().replace(/[^a-z0-9]/g, '');
}

export function assertNoDirectIdentity(value, depth = 0) {
  if (depth > 8) throw new Error('TRIP_PAYLOAD_TOO_DEEP');
  if (Array.isArray(value)) {
    value.forEach(entry => assertNoDirectIdentity(entry, depth + 1));
    return;
  }
  if (!isRecord(value)) return;
  for (const [key, nested] of Object.entries(value)) {
    if (DIRECT_IDENTITY_KEYS.has(normalizedKey(key))) throw new Error('DIRECT_IDENTITY_NOT_ALLOWED');
    assertNoDirectIdentity(nested, depth + 1);
  }
}

export function externalTripPayload(payload) {
  if (!isRecord(payload)) throw new Error('TRIP_PAYLOAD_REQUIRED');
  const clone = typeof structuredClone === 'function'
    ? structuredClone(payload)
    : JSON.parse(JSON.stringify(payload));
  const external = {};
  for (const key of TRIP_INPUT_FIELD_NAMES) {
    if (key === 'user_id' || key === 'anonymous_id' || key === 'gps') continue;
    const value = clone[key];
    if (value === null || value === undefined) continue;
    if (key === 'data_quality_flags' && Array.isArray(value) && value.length === 0) continue;
    external[key] = value;
  }
  external.schema_version = Number(clone.schema_version ?? 1);
  if (![1, 2].includes(external.schema_version)) throw new Error('TRIP_SCHEMA_VERSION_INVALID');
  assertNoDirectIdentity(external);
  return external;
}

function canonicalValue(value) {
  if (Array.isArray(value)) return value.map(canonicalValue);
  if (!isRecord(value)) return value;
  return Object.fromEntries(Object.keys(value).sort().map(key => [key, canonicalValue(value[key])]));
}

export function canonicalJson(value) {
  return JSON.stringify(canonicalValue(value));
}

export async function externalTripRecord({ owner, payload, source = 'live' }) {
  if (!owner || !['user', 'anonymous'].includes(owner.kind) || typeof owner.subject !== 'string') {
    throw new Error('TRIP_OWNER_INVALID');
  }
  if (!['live', 'supabase-migration'].includes(source)) throw new Error('TRIP_SOURCE_INVALID');
  const externalPayload = externalTripPayload(payload);
  const clientObservationId = externalPayload.client_observation_id;
  if (typeof clientObservationId !== 'string' || !clientObservationId) throw new Error('TRIP_CLIENT_ID_REQUIRED');
  if (typeof externalPayload.observed_at !== 'string' || typeof externalPayload.submitted_at !== 'string') {
    throw new Error('TRIP_TIMESTAMPS_REQUIRED');
  }
  const digestPayload = { ...externalPayload };
  delete digestPayload.submitted_at;
  return {
    storage_schema_version: 1,
    owner_subject: owner.subject,
    owner_kind: owner.kind,
    trip_id: externalPayload.trip_id ?? null,
    client_observation_id: clientObservationId,
    observed_at: externalPayload.observed_at,
    submitted_at: externalPayload.submitted_at,
    payload_json: canonicalJson(externalPayload),
    payload_sha256: await sha256Hex(canonicalJson(digestPayload)),
    source,
  };
}

export function normalizeCloudflareGatewayUrl(gatewayUrl) {
  if (typeof gatewayUrl !== 'string' || !gatewayUrl.trim()) throw new Error('TRIP_GATEWAY_URL_REQUIRED');
  const url = new URL(gatewayUrl.trim());
  if (
    url.protocol !== 'https:' || !url.hostname.endsWith(CLOUDFLARE_WORKER_SUFFIX) ||
    url.username || url.password || url.search || url.hash || (url.pathname !== '/' && url.pathname !== '')
  ) {
    throw new Error('TRIP_GATEWAY_URL_INVALID');
  }
  return url.origin;
}

function timingSafeEqual(left, right) {
  if (typeof left !== 'string' || typeof right !== 'string' || left.length !== right.length) return false;
  let difference = 0;
  for (let index = 0; index < left.length; index += 1) difference |= left.charCodeAt(index) ^ right.charCodeAt(index);
  return difference === 0;
}

export async function tripGatewaySignature({ secret, timestamp, method, pathname, bodyText = '' }) {
  const bodyDigest = await sha256Hex(bodyText);
  const canonical = `ravradar-trip-gateway:v1:${timestamp}:${String(method).toUpperCase()}:${pathname}:${bodyDigest}`;
  return hmacHex(secret, canonical);
}

export async function verifyTripGatewaySignature({ secret, timestamp, signature, method, pathname, bodyText = '', now = Date.now() }) {
  if (!/^\d{13}$/.test(String(timestamp || '')) || !/^[a-f0-9]{64}$/.test(String(signature || ''))) return false;
  if (Math.abs(Number(timestamp) - now) > 300_000) return false;
  const expected = await tripGatewaySignature({ secret, timestamp, method, pathname, bodyText });
  return timingSafeEqual(expected, signature);
}

async function callTripGateway({ gatewayUrl, sharedSecret, pathname, body, fetchImpl = fetch, now = Date.now() }) {
  const origin = normalizeCloudflareGatewayUrl(gatewayUrl);
  const bodyText = JSON.stringify(body);
  const timestamp = String(now);
  const signature = await tripGatewaySignature({
    secret: sharedSecret,
    timestamp,
    method: 'POST',
    pathname,
    bodyText,
  });
  const response = await fetchImpl(`${origin}${pathname}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-RavRadar-Signature': signature,
      'X-RavRadar-Timestamp': timestamp,
    },
    body: bodyText,
  });
  if (!response?.ok) throw new Error('TRIP_GATEWAY_UNAVAILABLE');
  const result = await response.json();
  if (!isRecord(result) || result.ok !== true) throw new Error('TRIP_GATEWAY_INVALID_RESPONSE');
  return result;
}

export async function storeCloudflareTrip({ gatewayUrl, sharedSecret, owner, payload, source = 'live', fetchImpl = fetch, now }) {
  const record = await externalTripRecord({ owner, payload, source });
  const result = await callTripGateway({
    gatewayUrl,
    sharedSecret,
    pathname: '/v1/trips/store',
    body: { record },
    fetchImpl,
    now,
  });
  if (typeof result.duplicate !== 'boolean') throw new Error('TRIP_GATEWAY_INVALID_RESPONSE');
  return { stored: true, duplicate: result.duplicate };
}

export async function listCloudflareTrips({ gatewayUrl, sharedSecret, ownerSubject, limit = 100, fetchImpl = fetch, now }) {
  if (typeof ownerSubject !== 'string' || !ownerSubject) throw new Error('TRIP_OWNER_INVALID');
  const safeLimit = Math.max(1, Math.min(200, Math.round(Number(limit) || 100)));
  const result = await callTripGateway({
    gatewayUrl,
    sharedSecret,
    pathname: '/v1/trips/list',
    body: { owner_subject: ownerSubject, limit: safeLimit },
    fetchImpl,
    now,
  });
  if (!Array.isArray(result.rows)) throw new Error('TRIP_GATEWAY_INVALID_RESPONSE');
  return result.rows.map(row => {
    assertNoDirectIdentity(row);
    return row;
  });
}

export async function countCloudflareTrips({ gatewayUrl, sharedSecret, fetchImpl = fetch, now }) {
  const result = await callTripGateway({
    gatewayUrl,
    sharedSecret,
    pathname: '/v1/trips/count',
    body: {},
    fetchImpl,
    now,
  });
  if (!Number.isSafeInteger(result.trip_count) || result.trip_count < 0) throw new Error('TRIP_GATEWAY_INVALID_RESPONSE');
  return result.trip_count;
}

export async function deleteCloudflareTrips({ gatewayUrl, sharedSecret, ownerSubject, fetchImpl = fetch, now }) {
  if (typeof ownerSubject !== 'string' || !ownerSubject) throw new Error('TRIP_OWNER_INVALID');
  const result = await callTripGateway({
    gatewayUrl,
    sharedSecret,
    pathname: '/v1/trips/delete-owner',
    body: { owner_subject: ownerSubject },
    fetchImpl,
    now,
  });
  if (!Number.isSafeInteger(result.deleted) || result.deleted < 0) throw new Error('TRIP_GATEWAY_INVALID_RESPONSE');
  return result.deleted;
}
