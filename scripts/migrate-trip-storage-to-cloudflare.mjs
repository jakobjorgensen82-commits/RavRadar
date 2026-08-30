import { pathToFileURL } from 'node:url';

import { boundedFetch, createBoundedFetch, TRIP_STORAGE_NETWORK_TIMEOUT_MS } from './lib/bounded-fetch.mjs';

import {
  countCloudflareTrips,
  externalOwnerSubject,
  sha256Hex,
  storeCloudflareTrip,
} from '../supabase/functions/_shared/trip-storage.js';
import {
  SAFE_MIGRATION_PAYLOAD_COLUMNS,
  SUPABASE_OBSERVATION_LEAF_PROJECTIONS,
  SUPABASE_OBSERVATION_SELECT,
  assertProjectedSourceRow,
  projectSupabaseObservationRow,
} from '../supabase/functions/_shared/trip-source-projection.js';

export {
  SAFE_MIGRATION_PAYLOAD_COLUMNS,
  SUPABASE_OBSERVATION_LEAF_PROJECTIONS,
  SUPABASE_OBSERVATION_SELECT,
  projectSupabaseObservationRow,
} from '../supabase/functions/_shared/trip-source-projection.js';

const PAGE_SIZE = 200;

function required(value, name) {
  if (!value) throw new Error(`${name} mangler.`);
  return value;
}

export function supabaseConfiguration(environment = process.env) {
  const url = required(environment.SUPABASE_URL?.trim().replace(/\/$/, ''), 'SUPABASE_URL');
  const serviceKey = required(environment.SUPABASE_SERVICE_ROLE_KEY?.trim(), 'SUPABASE_SERVICE_ROLE_KEY');
  const parsed = new URL(url);
  if (parsed.protocol !== 'https:' || !parsed.hostname.endsWith('.supabase.co') || parsed.pathname !== '/') {
    throw new Error('SUPABASE_URL er ugyldig.');
  }
  return { url, serviceKey };
}

export async function fetchSupabaseObservations({
  url,
  serviceKey,
  fetchImpl = globalThis.fetch,
  fetchTimeoutMs = TRIP_STORAGE_NETWORK_TIMEOUT_MS,
}) {
  const rows = [];
  for (let offset = 0; ; offset += PAGE_SIZE) {
    const endpoint = new URL('/rest/v1/observations', `${url}/`);
    endpoint.searchParams.set('select', SUPABASE_OBSERVATION_SELECT);
    endpoint.searchParams.set('order', 'id.asc');
    const response = await boundedFetch(endpoint, {
      headers: {
        apikey: serviceKey,
        authorization: `Bearer ${serviceKey}`,
        Range: `${offset}-${offset + PAGE_SIZE - 1}`,
        'Range-Unit': 'items',
      },
    }, { fetchImpl, timeoutMs: fetchTimeoutMs });
    if (!response.ok) throw new Error(`Supabase-migrationslæsning fejlede (${response.status}).`);
    const page = await response.json();
    if (!Array.isArray(page)) throw new Error('Supabase returnerede et ugyldigt migrationssvar.');
    page.forEach(assertProjectedSourceRow);
    rows.push(...page);
    if (page.length < PAGE_SIZE) return rows;
  }
}

export async function migrationClientId(row) {
  if (typeof row.client_observation_id === 'string' && row.client_observation_id) return row.client_observation_id;
  if (typeof row.trip_id === 'string' && row.trip_id) return row.trip_id;
  const digest = await sha256Hex(JSON.stringify({ id: row.id ?? null, observed_at: row.observed_at ?? null }));
  return `legacy_${digest}`;
}

export async function migrateRow(row, configuration, {
  pseudonymSecret,
  ownerSubjectImpl = externalOwnerSubject,
  storeImpl = storeCloudflareTrip,
  fetchImpl = globalThis.fetch,
  fetchTimeoutMs = TRIP_STORAGE_NETWORK_TIMEOUT_MS,
} = {}) {
  const clientId = await migrationClientId(row);
  const userId = typeof row.user_id === 'string' && row.user_id ? row.user_id : null;
  const anonymousId = userId
    ? null
    : (typeof row.anonymous_id === 'string' && row.anonymous_id ? row.anonymous_id : `legacy:${clientId}`);
  const owner = await ownerSubjectImpl({
    userId,
    anonymousId,
    secret: required(pseudonymSecret, 'TRIP_PSEUDONYM_SECRET_V1'),
  });
  const payload = projectSupabaseObservationRow(row);
  payload.client_observation_id = clientId;
  payload.observed_at = row.observed_at || row.trip_started_at || new Date(0).toISOString();
  payload.submitted_at = row.submitted_at || row.created_at || row.observed_at || new Date(0).toISOString();
  return storeImpl({
    ...configuration,
    owner,
    payload,
    source: 'supabase-migration',
    fetchImpl: createBoundedFetch({ fetchImpl, timeoutMs: fetchTimeoutMs }),
  });
}

export async function runMigration({
  args = process.argv.slice(2),
  environment = process.env,
  fetchImpl = globalThis.fetch,
  countImpl = countCloudflareTrips,
  ownerSubjectImpl = externalOwnerSubject,
  storeImpl = storeCloudflareTrip,
  log = console.log,
  fetchTimeoutMs = TRIP_STORAGE_NETWORK_TIMEOUT_MS,
} = {}) {
  const verifyOnly = args.includes('--verify-only');
  const gatewayUrl = required(environment.CLOUDFLARE_TRIP_GATEWAY_URL?.trim(), 'CLOUDFLARE_TRIP_GATEWAY_URL');
  const sharedSecret = required(environment.TRIP_GATEWAY_SHARED_SECRET?.trim(), 'TRIP_GATEWAY_SHARED_SECRET');
  const pseudonymSecret = required(environment.TRIP_PSEUDONYM_SECRET_V1?.trim(), 'TRIP_PSEUDONYM_SECRET_V1');
  const configuration = { gatewayUrl, sharedSecret };
  const gatewayFetch = createBoundedFetch({ fetchImpl, timeoutMs: fetchTimeoutMs });

  if (verifyOnly) {
    const tripCount = await countImpl({ ...configuration, fetchImpl: gatewayFetch });
    log(`Cloudflare-kontrollen er grøn. Samlet antal turposter: ${tripCount}.`);
    return { sourceRows: 0, inserted: 0, duplicates: 0, tripCount };
  }

  const sourceRows = await fetchSupabaseObservations({
    ...supabaseConfiguration(environment),
    fetchImpl,
    fetchTimeoutMs,
  });
  let inserted = 0;
  let duplicates = 0;
  for (const row of sourceRows) {
    const result = await migrateRow(row, configuration, {
      pseudonymSecret,
      ownerSubjectImpl,
      storeImpl,
      fetchImpl,
      fetchTimeoutMs,
    });
    if (result.duplicate) duplicates += 1;
    else inserted += 1;
  }
  const tripCount = await countImpl({ ...configuration, fetchImpl: gatewayFetch });
  if (tripCount < sourceRows.length) throw new Error('Cloudflare D1 indeholder færre rækker end Supabase-kilden efter migrationen.');
  log(`D1-migrationen er grøn: ${sourceRows.length} kilderækker, ${inserted} nye, ${duplicates} idempotente dubletter, ${tripCount} i mållageret.`);
  return { sourceRows: sourceRows.length, inserted, duplicates, tripCount };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await runMigration();
}
