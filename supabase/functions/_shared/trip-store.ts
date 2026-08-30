import { fetchWithTimeout, GatewayError } from "./public-gateway.ts";
import { canonicalJson, externalOwnerSubject, externalTripPayload, listCloudflareTrips, projectLegacyExternalTripPayload, storeCloudflareTrip } from "./trip-storage.js";
import {
  SUPABASE_IDEMPOTENCY_SELECT,
  assertIdempotencySourceRow,
  projectSupabaseObservationRow,
} from "./trip-source-projection.js";

const OWN_TRIP_FIELDS = [
  "id", "client_observation_id", "trip_id", "observed_at", "trip_started_at", "trip_ended_at", "zone_id",
  "search_minutes", "hunt_mode", "found", "result", "grams", "actual_zone_id",
  "actual_coastal_part_id", "zone_name", "schema_version", "data_quality_flags",
].join(",");
const SUPABASE_IDEMPOTENCY_TIMESTAMPS = [
  "observed_at", "trip_started_at", "trip_ended_at", "forecast_issued_at",
  "forecast_valid_at", "forecast_captured_at", "forecast_target_at",
];
const SUPABASE_IDEMPOTENCY_UUIDS = ["client_observation_id", "trip_id"];

export type TripStorageMode = "d1" | "supabase" | "maintenance";
export const TRIP_STORAGE_MAINTENANCE_MAX_LEASE_MS = 30 * 60_000;

function requiredEnvironment(name: string) {
  const value = Deno.env.get(name)?.trim();
  if (!value) throw new GatewayError(503, "TRIP_STORE_NOT_CONFIGURED");
  return value;
}

export function tripStorageMode(now = Date.now()): TripStorageMode {
  const rawValue = Deno.env.get("TRIP_STORAGE_MODE")?.trim() || "";
  const value = rawValue.toLowerCase();
  if (value === "d1" || value === "supabase") return value;
  if (value.startsWith("maintenance:")) {
    const rawDeadline = rawValue.slice("maintenance:".length);
    const deadline = Date.parse(rawDeadline);
    if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/.test(rawDeadline)
      || !Number.isFinite(deadline)
      || deadline - now > TRIP_STORAGE_MAINTENANCE_MAX_LEASE_MS) {
      throw new GatewayError(503, "TRIP_STORAGE_MAINTENANCE_LEASE_INVALID");
    }
    if (now >= deadline) return "d1";
    return "maintenance";
  }
  throw new GatewayError(503, "TRIP_STORAGE_MODE_INVALID");
}

function activeTripStorageMode(): Exclude<TripStorageMode, "maintenance"> {
  const mode = tripStorageMode();
  if (mode === "maintenance") throw new GatewayError(503, "TRIP_STORAGE_MAINTENANCE");
  return mode;
}

function cloudflareConfiguration() {
  return {
    gatewayUrl: requiredEnvironment("CLOUDFLARE_TRIP_GATEWAY_URL"),
    sharedSecret: requiredEnvironment("TRIP_GATEWAY_SHARED_SECRET"),
    secret: requiredEnvironment("TRIP_PSEUDONYM_SECRET_V1"),
    fetchImpl: (input: RequestInfo | URL, init: RequestInit = {}) => fetchWithTimeout(input, init, 8_000),
  };
}

function idempotencyPayload(payload: Record<string, unknown>) {
  const projected = { ...externalTripPayload(payload) };
  delete projected.submitted_at;
  if (Number(projected.schema_version ?? 1) === 1) {
    if (Array.isArray(projected.data_quality_flags) && projected.data_quality_flags.length === 0) {
      delete projected.data_quality_flags;
    }
    if (projected.weather_snapshot && typeof projected.weather_snapshot === "object"
      && !Array.isArray(projected.weather_snapshot)
      && Object.keys(projected.weather_snapshot).length === 0) {
      delete projected.weather_snapshot;
    }
  }
  for (const field of SUPABASE_IDEMPOTENCY_TIMESTAMPS) {
    const value = projected[field];
    if (typeof value === "string" && Number.isFinite(Date.parse(value))) {
      projected[field] = new Date(value).toISOString();
    }
  }
  for (const field of SUPABASE_IDEMPOTENCY_UUIDS) {
    if (typeof projected[field] === "string") projected[field] = projected[field].toLowerCase();
  }
  return projected;
}

function sameOwnerBinding(stored: Record<string, unknown>, expected: Record<string, unknown>) {
  const expectedUserId = typeof expected.user_id === "string" && expected.user_id ? expected.user_id : null;
  if (expectedUserId) return String(stored.user_id || "").toLowerCase() === expectedUserId.toLowerCase();
  return (stored.user_id === null || stored.user_id === undefined)
    && String(stored.anonymous_id || "").toLowerCase() === String(expected.anonymous_id || "").toLowerCase();
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
  if (!response.ok) {
    if (response.status === 409) throw new GatewayError(409, "TRIP_IDEMPOTENCY_CONFLICT");
    throw new GatewayError(503, "OBSERVATION_STORE_UNAVAILABLE");
  }
  const clientObservationId = String(payload.client_observation_id || "");
  if (!clientObservationId) throw new GatewayError(400, "TRIP_CLIENT_ID_REQUIRED");
  const readbackUrl = new URL("/rest/v1/observations", `${url}/`);
  readbackUrl.searchParams.set("select", SUPABASE_IDEMPOTENCY_SELECT);
  readbackUrl.searchParams.set("client_observation_id", `eq.${clientObservationId}`);
  readbackUrl.searchParams.set("limit", "2");
  const readback = await fetchWithTimeout(
    readbackUrl,
    { headers: { apikey: serviceKey, authorization: `Bearer ${serviceKey}` } },
    8_000,
  );
  if (!readback.ok) throw new GatewayError(503, "OBSERVATION_STORE_UNAVAILABLE");
  let rows: unknown;
  try {
    rows = await readback.json();
  } catch {
    throw new GatewayError(503, "OBSERVATION_STORE_INTEGRITY_INVALID");
  }
  if (!Array.isArray(rows) || rows.length !== 1) {
    throw new GatewayError(503, "OBSERVATION_STORE_INTEGRITY_INVALID");
  }
  let equivalent = false;
  try {
    assertIdempotencySourceRow(rows[0]);
    const projectedStoredPayload = projectSupabaseObservationRow(rows[0]);
    equivalent = sameOwnerBinding(rows[0], payload)
      && canonicalJson(idempotencyPayload(projectedStoredPayload)) === canonicalJson(idempotencyPayload(payload));
  } catch {
    throw new GatewayError(503, "OBSERVATION_STORE_INTEGRITY_INVALID");
  }
  if (!equivalent) {
    throw new GatewayError(409, "TRIP_IDEMPOTENCY_CONFLICT");
  }
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
  const safePayload = projectLegacyExternalTripPayload(payload);
  if (activeTripStorageMode() === "supabase") {
    await storeInSupabase(safePayload);
    return;
  }
  try {
    const configuration = cloudflareConfiguration();
    const owner = await externalOwnerSubject({
      userId: authenticatedUserId,
      anonymousId: authenticatedUserId ? null : String(safePayload.anonymous_id || ""),
      secret: configuration.secret,
    });
    await storeCloudflareTrip({ ...configuration, owner, payload: safePayload, source: "live" });
  } catch (error) {
    if (error instanceof GatewayError) throw error;
    throw new GatewayError(503, "OBSERVATION_STORE_UNAVAILABLE");
  }
}

export async function listOwnTripObservations(userId: string, limit = 100) {
  const safeLimit = Math.max(1, Math.min(200, Math.round(Number(limit) || 100)));
  if (activeTripStorageMode() === "supabase") return listFromSupabase(userId, safeLimit);
  try {
    const configuration = cloudflareConfiguration();
    const owner = await externalOwnerSubject({ userId, secret: configuration.secret });
    return await listCloudflareTrips({ ...configuration, ownerSubject: owner.subject, limit: safeLimit });
  } catch (error) {
    if (error instanceof GatewayError) throw error;
    throw new GatewayError(503, "TRIP_LOG_UNAVAILABLE");
  }
}
