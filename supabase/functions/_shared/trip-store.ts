import { fetchWithTimeout, GatewayError } from "./public-gateway.ts";
import { externalOwnerSubject, listCloudflareTrips, storeCloudflareTrip } from "./trip-storage.js";
import { projectTripLogDto } from "../../../js/services/calibration-eligibility.js";
import { ravScoreModelBinding } from "../../../js/core/ravscore-model-contract.js";

const ACTIVE_RAVSCORE_TRIP_RPC = "ravradar_trip_v3_active_binding_admitted";
const RAVSCORE_MODEL_NOT_ACTIVE = "RAVSCORE_MODEL_NOT_ACTIVE";

const OWN_TRIP_FIELDS = [
  "client_observation_id", "trip_id", "observed_at", "trip_started_at", "trip_ended_at",
  "search_minutes", "search_coverage", "hunt_mode", "found", "result", "grams",
  "actual_zone_id", "actual_coastal_part_id", "forecast_zone_id", "forecast_coastal_part_id",
  "zone_name", "schema_version", "data_quality_flags", "model_version", "rav_score",
  "calibration_eligible", "forecast_snapshot_id", "forecast_issued_at", "forecast_valid_at",
  "forecast_captured_at", "calibration_features", "weather_snapshot", "wind_speed_mps",
  "wind_direction_deg", "wave_height_m", "wave_period_s", "water_level_cm",
  "current_speed_mps", "current_direction_deg",
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
    body: JSON.stringify(
      Number(payload.schema_version ?? 1) < 3
        ? { ...payload, calibration_eligible: false }
        : payload,
    ),
  }, 8_000);
  if (!response.ok) {
    // The database trigger closes the read/write race between the Edge
    // admission probe and the final insert. Never relay the upstream body: it
    // may contain implementation details. Only the bounded trigger sentinel
    // is mapped to the retryable public transition response.
    const errorText = (await response.text()).slice(0, 2_000);
    if (errorText.includes(RAVSCORE_MODEL_NOT_ACTIVE)) {
      throw new GatewayError(409, RAVSCORE_MODEL_NOT_ACTIVE);
    }
    throw new GatewayError(503, "OBSERVATION_STORE_UNAVAILABLE");
  }
}

function requiredBindingFeature(features: Record<string, unknown>, name: string) {
  const value = features[name];
  if (typeof value !== "string" || !value) throw new GatewayError(400, "INVALID_TRIP_EVIDENCE_INTEGRITY");
  return value;
}

export function activeRavScoreTripAdmissionBody(payload: Record<string, unknown>) {
  const features = payload.calibration_features;
  if (!features || typeof features !== "object" || Array.isArray(features)) {
    throw new GatewayError(400, "INVALID_TRIP_EVIDENCE_INTEGRITY");
  }
  const binding = features as Record<string, unknown>;
  return Object.freeze({
    p_model_id: requiredBindingFeature(binding, "modelVersion"),
    p_state_schema_version: requiredBindingFeature(binding, "modelStateVersion"),
    p_variant_id: requiredBindingFeature(binding, "modelVariantId"),
    p_profile_id: requiredBindingFeature(binding, "modelProfileId"),
    p_component_schema_id: requiredBindingFeature(binding, "modelComponentSchemaId"),
    p_explanation_schema_id: requiredBindingFeature(binding, "modelExplanationSchemaId"),
    p_ranking_policy_id: requiredBindingFeature(binding, "modelRankingPolicyId"),
    p_best_time_policy_id: requiredBindingFeature(binding, "modelBestTimePolicyId"),
    p_presentation_policy_id: requiredBindingFeature(binding, "modelPresentationPolicyId"),
    p_model_contract_sha256: requiredBindingFeature(binding, "modelContractSha256"),
    p_model_bundle_sha256: requiredBindingFeature(binding, "modelBundleSha256"),
    p_reason_codes: Array.isArray(binding.reasonCodes)
      ? Object.freeze([...binding.reasonCodes])
      : null,
    p_calibration_eligible: payload.calibration_eligible === true,
    p_actual_zone_id: String(payload.actual_zone_id ?? ""),
    p_actual_coastal_part_id: String(payload.actual_coastal_part_id ?? ""),
    p_forecast_zone_id: String(payload.forecast_zone_id ?? ""),
    p_forecast_coastal_part_id: String(payload.forecast_coastal_part_id ?? ""),
  });
}

async function assertActiveRavScoreTripBinding(payload: Record<string, unknown>) {
  if (Number(payload.schema_version ?? 1) !== 3) return;
  const url = requiredEnvironment("SUPABASE_URL");
  const serviceKey = requiredEnvironment("SUPABASE_SERVICE_ROLE_KEY");
  const response = await fetchWithTimeout(`${url}/rest/v1/rpc/${ACTIVE_RAVSCORE_TRIP_RPC}`, {
    method: "POST",
    headers: {
      apikey: serviceKey,
      authorization: `Bearer ${serviceKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(activeRavScoreTripAdmissionBody(payload)),
  }, 5_000);
  if (!response.ok) throw new GatewayError(503, "RAVSCORE_ADMISSION_UNAVAILABLE");
  let admitted: unknown;
  try {
    admitted = await response.json();
  } catch {
    throw new GatewayError(503, "RAVSCORE_ADMISSION_UNAVAILABLE");
  }
  // False covers PENDING, missing central truth, profile drift and a binding
  // that is not the single ACTIVE model. The client retains the row in its
  // outbox and retries after the atomic activation completes.
  if (admitted !== true) throw new GatewayError(409, RAVSCORE_MODEL_NOT_ACTIVE);
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
  const binding = ravScoreModelBinding();
  return rows.map(row => projectTripLogDto(row, binding));
}

export async function storeObservation(payload: Record<string, unknown>, authenticatedUserId: string | null) {
  await assertActiveRavScoreTripBinding(payload);
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
    const rows = await listCloudflareTrips({ ...configuration, ownerSubject: owner.subject, limit: safeLimit });
    const binding = ravScoreModelBinding();
    return rows.map(row => projectTripLogDto(row, binding));
  } catch (error) {
    if (error instanceof GatewayError) throw error;
    throw new GatewayError(503, "TRIP_LOG_UNAVAILABLE");
  }
}
