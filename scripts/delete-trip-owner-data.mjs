import {
  deleteCloudflareTrips,
  externalOwnerSubject,
  listCloudflareTrips,
} from '../supabase/functions/_shared/trip-storage.js';

const confirmed = process.argv.includes('--confirm-delete-owner-data');
const userId = process.env.TARGET_SUPABASE_USER_ID?.trim();
const pseudonymSecret = process.env.TRIP_PSEUDONYM_SECRET_V1?.trim();
const gatewayUrl = process.env.CLOUDFLARE_TRIP_GATEWAY_URL?.trim();
const sharedSecret = process.env.TRIP_GATEWAY_SHARED_SECRET?.trim();
const supabaseUrl = process.env.SUPABASE_URL?.trim().replace(/\/$/, '');
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

function required(value, name) {
  if (!value) throw new Error(`${name} mangler.`);
  return value;
}

if (!confirmed) throw new Error('Sletning kræver det eksplicitte flag --confirm-delete-owner-data.');
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
};
const deletedFromD1 = await deleteCloudflareTrips({ ...cloudflareConfiguration, ownerSubject: owner.subject });
const supabaseDelete = await fetch(`${supabaseUrl}/rest/v1/observations?user_id=eq.${encodeURIComponent(userId)}`, {
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
const supabaseVerify = await fetch(`${supabaseUrl}/rest/v1/observations?select=id&user_id=eq.${encodeURIComponent(userId)}&limit=1`, {
  headers: { apikey: serviceKey, authorization: `Bearer ${serviceKey}` },
});
if (!supabaseVerify.ok || (await supabaseVerify.json()).length) throw new Error('Supabase-verifikationen fandt fortsat en turpost.');
console.log(`Ejerens turdata er slettet og verificeret uden payloadudskrift. D1 slettede ${deletedFromD1} poster; Supabase er tom for ejeren.`);
