import {
  deleteCloudflareTrips,
  externalOwnerSubject,
  listCloudflareTrips,
} from './trip-storage.js';

function required(value, name) {
  if (!value) throw new Error(`${name} mangler.`);
  return value;
}

// Server-only trip-source stage of permanent owner erasure, not an HTTP route.
// The caller must authorize the owner before calling; browser-supplied identity
// is not authority. This does not delete Auth/profiles or implement retention.
export async function eraseTripOwnerSources({
  userId, pseudonymSecret, gatewayUrl, sharedSecret, supabaseUrl, serviceKey,
  fetchImpl = fetch,
}) {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(required(userId, 'TARGET_SUPABASE_USER_ID'))) {
    throw new Error('TARGET_SUPABASE_USER_ID er ugyldigt.');
  }
  const parsedSupabaseUrl = new URL(required(supabaseUrl, 'SUPABASE_URL'));
  if (parsedSupabaseUrl.protocol !== 'https:' || !parsedSupabaseUrl.hostname.endsWith('.supabase.co') || parsedSupabaseUrl.pathname !== '/') {
    throw new Error('SUPABASE_URL er ugyldig.');
  }
  required(serviceKey, 'SUPABASE_SERVICE_ROLE_KEY');
  const owner = await externalOwnerSubject({ userId, secret: required(pseudonymSecret, 'TRIP_PSEUDONYM_SECRET_V1') });
  const cloudflareConfiguration = {
    gatewayUrl: required(gatewayUrl, 'CLOUDFLARE_TRIP_GATEWAY_URL'),
    sharedSecret: required(sharedSecret, 'TRIP_GATEWAY_SHARED_SECRET'),
    fetchImpl,
  };
  const deletedFromD1 = await deleteCloudflareTrips({ ...cloudflareConfiguration, ownerSubject: owner.subject });
  const supabaseDelete = await fetchImpl(`${supabaseUrl}/rest/v1/observations?user_id=eq.${encodeURIComponent(userId)}`, {
    method: 'DELETE',
    headers: {
      apikey: serviceKey,
      authorization: `Bearer ${serviceKey}`,
      Prefer: 'return=minimal',
    },
  });
  if (!supabaseDelete.ok) throw new Error(`Supabase-sletningen fejlede (${supabaseDelete.status}). Kør den idempotente kommando igen.`);
  const remainingD1 = await listCloudflareTrips({ ...cloudflareConfiguration, ownerSubject: owner.subject, limit: 1 });
  if (remainingD1.length) throw new Error('D1-verifikationen fandt fortsat en turpost.');
  const supabaseVerify = await fetchImpl(`${supabaseUrl}/rest/v1/observations?select=id&user_id=eq.${encodeURIComponent(userId)}&limit=1`, {
    headers: { apikey: serviceKey, authorization: `Bearer ${serviceKey}` },
  });
  const remainingSupabase = supabaseVerify.ok ? await supabaseVerify.json() : null;
  if (!Array.isArray(remainingSupabase) || remainingSupabase.length) throw new Error('Supabase-verifikationen kunne ikke bekræfte, at ejerens ture er slettet.');
  // The guarded D1 list is empty for a tombstoned owner. It is not an
  // independent physical row-absence check or a backup/Auth deletion receipt.
  return Object.freeze({
    deletedFromD1,
    d1DeleteAcknowledged: true,
    d1GuardedListEmpty: true,
    supabaseListEmpty: true,
  });
}
