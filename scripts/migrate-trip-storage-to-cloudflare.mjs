import {
  countCloudflareTrips,
  externalOwnerSubject,
  sha256Hex,
  storeCloudflareTrip,
} from '../supabase/functions/_shared/trip-storage.js';

const PAGE_SIZE = 200;
const verifyOnly = process.argv.includes('--verify-only');
const gatewayUrl = process.env.CLOUDFLARE_TRIP_GATEWAY_URL?.trim();
const sharedSecret = process.env.TRIP_GATEWAY_SHARED_SECRET?.trim();
const pseudonymSecret = process.env.TRIP_PSEUDONYM_SECRET_V1?.trim();

function required(value, name) {
  if (!value) throw new Error(`${name} mangler.`);
  return value;
}

function supabaseConfiguration() {
  const url = required(process.env.SUPABASE_URL?.trim().replace(/\/$/, ''), 'SUPABASE_URL');
  const serviceKey = required(process.env.SUPABASE_SERVICE_ROLE_KEY?.trim(), 'SUPABASE_SERVICE_ROLE_KEY');
  const parsed = new URL(url);
  if (parsed.protocol !== 'https:' || !parsed.hostname.endsWith('.supabase.co') || parsed.pathname !== '/') {
    throw new Error('SUPABASE_URL er ugyldig.');
  }
  return { url, serviceKey };
}

async function fetchSupabaseObservations() {
  const { url, serviceKey } = supabaseConfiguration();
  const rows = [];
  for (let offset = 0; ; offset += PAGE_SIZE) {
    const response = await fetch(`${url}/rest/v1/observations?select=*&order=id.asc`, {
      headers: {
        apikey: serviceKey,
        authorization: `Bearer ${serviceKey}`,
        Range: `${offset}-${offset + PAGE_SIZE - 1}`,
        'Range-Unit': 'items',
      },
    });
    if (!response.ok) throw new Error(`Supabase-migrationslæsning fejlede (${response.status}).`);
    const page = await response.json();
    if (!Array.isArray(page)) throw new Error('Supabase returnerede et ugyldigt migrationssvar.');
    rows.push(...page);
    if (page.length < PAGE_SIZE) return rows;
  }
}

async function migrationClientId(row) {
  if (typeof row.client_observation_id === 'string' && row.client_observation_id) return row.client_observation_id;
  if (typeof row.trip_id === 'string' && row.trip_id) return row.trip_id;
  const digest = await sha256Hex(JSON.stringify({ id: row.id ?? null, observed_at: row.observed_at ?? null }));
  return `legacy_${digest}`;
}

async function migrateRow(row, configuration) {
  const clientId = await migrationClientId(row);
  const userId = typeof row.user_id === 'string' && row.user_id ? row.user_id : null;
  const anonymousId = typeof row.anonymous_id === 'string' && row.anonymous_id
    ? row.anonymous_id
    : `legacy:${clientId}`;
  const owner = await externalOwnerSubject({ userId, anonymousId, secret: pseudonymSecret });
  const payload = {
    ...row,
    client_observation_id: clientId,
    observed_at: row.observed_at || row.trip_started_at || new Date(0).toISOString(),
    submitted_at: row.submitted_at || row.created_at || row.observed_at || new Date(0).toISOString(),
  };
  return storeCloudflareTrip({ ...configuration, owner, payload, source: 'supabase-migration' });
}

required(gatewayUrl, 'CLOUDFLARE_TRIP_GATEWAY_URL');
required(sharedSecret, 'TRIP_GATEWAY_SHARED_SECRET');
required(pseudonymSecret, 'TRIP_PSEUDONYM_SECRET_V1');
const configuration = { gatewayUrl, sharedSecret };

if (verifyOnly) {
  const tripCount = await countCloudflareTrips(configuration);
  console.log(`Cloudflare-kontrollen er grøn. Samlet antal turposter: ${tripCount}.`);
  process.exit(0);
}

const sourceRows = await fetchSupabaseObservations();
let inserted = 0;
let duplicates = 0;
for (const row of sourceRows) {
  const result = await migrateRow(row, configuration);
  if (result.duplicate) duplicates += 1;
  else inserted += 1;
}
const tripCount = await countCloudflareTrips(configuration);
if (tripCount < sourceRows.length) throw new Error('Cloudflare D1 indeholder færre rækker end Supabase-kilden efter migrationen.');
console.log(`D1-migrationen er grøn: ${sourceRows.length} kilderækker, ${inserted} nye, ${duplicates} idempotente dubletter, ${tripCount} i mållageret.`);
