import { fetchWithTimeout, GatewayError } from "./public-gateway.ts";
import { externalOwnerSubject, listCloudflareTrips, storeCloudflareTrip } from "./trip-storage.js";

const OWN_TRIP_FIELDS = [
  "id", "client_observation_id", "trip_id", "observed_at", "trip_started_at", "trip_ended_at", "zone_id",
  "search_minutes", "hunt_mode", "found", "result", "grams", "actual_zone_id",
  "actual_coastal_part_id", "zone_name", "schema_version", "data_quality_flags",
].join(",");

export type TripStorageMode = "d1" | "supabase";

function requiredEnvironment(name: string) {
  const value = Deno.env.get(name)?.trim();
  if (!value) throw new GatewayError(503, "TRIP_STORE_NOT_CONFIGURED");
  return value;
}

export function tripStorageMode(): TripStorageMode {
  const value = (Deno.env.get("TRIP_STORAGE_MODE") || "supabase").trim().toLowerCase();
  if (value !== "d1" && value !== "supabase") throw new GatewayError(503, "TRIP_STORAGE_MODE_INVALID");
  return value;
}

function cloudflareConfiguration() {
  return {
    gatewayUrl: requiredEnvironment("CLOUDFLARE_TRIP_GATEWAY_URL"),
    sharedSecret: requiredEnvironment("TRIP_GATEWAY_SHARED_SECRET"),
    secret: requiredEnvironment("TRIP_PSEUDONYM_SECRET_V1"),
    fetchImpl: (input: RequestInfo | URL, init: RequestInit = {}) => fetchWithTimeout(input, init, 8_000),
  };
}

async function storeInSupabase(payload: Record<string, unknown>) {
  const url = requiredEnvironment("SUPABASE_URL");
  const serviceKey = requiredEnvironment("SUPABASE_SERVICE_ROLE_KEY");
  const response = await fetchWithTimeout(`${url}/rest/v1/observations?on_conflict=client_observation_id`, {
    method: "POST",
    headers: {
      apikey: serviceKey,
      authorization: `Bearer ${serviceKey}`,
      "Content-Type": "application/json",
      Prefer: "resolution=ignore-duplicates,return=minimal",
    },
    body: JSON.stringify(payload),
  }, 8_000);
  if (!response.ok) throw new GatewayError(503, "OBSERVATION_STORE_UNAVAILABLE");
}

async function listFromSupabase(userId: string, limit: number) {
  const url = requiredEnvironment("SUPABASE_URL");
  const serviceKey = requiredEnvironment("SUPABASE_SERVICE_ROLE_KEY");
  const query = `${url}/rest/v1/observations?select=${OWN_TRIP_FIELDS}&user_id=eq.${encodeURIComponent(userId)}&order=observed_at.desc&limit=${limit}`;
  const response = await fetchWithTimeout(query, {
    headers: { apikey: serviceKey, authorization: `Bearer ${serviceKey}` },
  }, 8_000);
  if (!response.ok) throw new GatewayError(503, "TRIP_LOG_UNAVAILABLE");
  const rows = await response.json();
  if (!Array.isArray(rows)) throw new GatewayError(503, "TRIP_LOG_INVALID");
  return rows;
}

export async function storeObservation(payload: Record<string, unknown>, authenticatedUserId: string | null) {
  if (tripStorageMode() === "supabase") {
    await storeInSupabase(payload);
    return;
  }
  try {
    const configuration = cloudflareConfiguration();
    const owner = await externalOwnerSubject({
      userId: authenticatedUserId,
      anonymousId: authenticatedUserId ? null : String(payload.anonymous_id || ""),
      secret: configuration.secret,
    });
    await storeCloudflareTrip({ ...configuration, owner, payload, source: "live" });
  } catch (error) {
    if (error instanceof GatewayError) throw error;
    throw new GatewayError(503, "OBSERVATION_STORE_UNAVAILABLE");
  }
}

export async function listOwnTripObservations(userId: string, limit = 100) {
  const safeLimit = Math.max(1, Math.min(200, Math.round(Number(limit) || 100)));
  if (tripStorageMode() === "supabase") return listFromSupabase(userId, safeLimit);
  try {
    const configuration = cloudflareConfiguration();
    const owner = await externalOwnerSubject({ userId, secret: configuration.secret });
    return await listCloudflareTrips({ ...configuration, ownerSubject: owner.subject, limit: safeLimit });
  } catch (error) {
    if (error instanceof GatewayError) throw error;
    throw new GatewayError(503, "TRIP_LOG_UNAVAILABLE");
  }
}
