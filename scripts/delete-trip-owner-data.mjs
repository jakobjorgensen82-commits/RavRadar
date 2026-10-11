import { eraseTripOwnerSources } from '../supabase/functions/_shared/trip-owner-erasure.js';

const confirmed = process.argv.includes('--confirm-delete-owner-data');
const userId = process.env.TARGET_SUPABASE_USER_ID?.trim();
const pseudonymSecret = process.env.TRIP_PSEUDONYM_SECRET_V1?.trim();
const gatewayUrl = process.env.CLOUDFLARE_TRIP_GATEWAY_URL?.trim();
const sharedSecret = process.env.TRIP_GATEWAY_SHARED_SECRET?.trim();
const supabaseUrl = process.env.SUPABASE_URL?.trim().replace(/\/$/, '');
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

if (!confirmed) throw new Error('Sletning kræver det eksplicitte flag --confirm-delete-owner-data.');
const { deletedFromD1 } = await eraseTripOwnerSources({
  userId, pseudonymSecret, gatewayUrl, sharedSecret, supabaseUrl, serviceKey,
});
console.log(`Ejerens turdata er slettet og verificeret uden payloadudskrift. D1 slettede ${deletedFromD1} poster; Supabase er tom for ejeren.`);
