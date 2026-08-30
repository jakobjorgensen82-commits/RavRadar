import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { assertAllowedOrigin, corsHeaders, enforceRateLimits, GatewayError, jsonResponse, readJsonObject, resolveAuthenticatedUserId, safeGatewayError } from "../_shared/public-gateway.ts";
import { storeObservation } from "../_shared/trip-store.ts";
import { TRIP_INPUT_FIELD_NAMES } from "../_shared/trip-storage.js";
import { ravScoreModelBinding } from "../../../js/core/ravscore-model-contract.js";
import { ravScoreModelBinding as candidateGRollbackModelBinding } from "../../../scripts/rollback-assets/ravscore-model-contract.js";
import {
  CURRENT_TRIP_EVIDENCE_SCHEMA_VERSION,
  assertTripObservationNestedPrivacy,
  submittedCalibrationEligibilityMatches,
  tripEvidenceIntegrityIssues,
} from "../../../js/services/calibration-eligibility.js";

const ALLOWED_FIELDS = new Set(TRIP_INPUT_FIELD_NAMES);

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const SEARCH_COVERAGE = new Set(["partial", "normal", "thorough"]);
const ACCOUNT_REPORT_FLAG = "account-manual";

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function assertSafeStructure(value: unknown, depth = 0) {
  if (depth > 6) throw new GatewayError(400, "NESTED_DATA_TOO_DEEP");
  if (typeof value === "string" && value.length > 2_000) throw new GatewayError(400, "NESTED_TEXT_TOO_LONG");
  if (Array.isArray(value)) {
    if (value.length > 100) throw new GatewayError(400, "NESTED_LIST_TOO_LONG");
    value.forEach((entry) => assertSafeStructure(entry, depth + 1));
    return;
  }
  if (!isRecord(value)) return;
  const entries = Object.entries(value);
  if (entries.length > 80) throw new GatewayError(400, "NESTED_OBJECT_TOO_LARGE");
  for (const [key, nested] of entries) {
    if (key.length > 80 || ["__proto__", "constructor", "prototype"].includes(key.toLowerCase())) {
      throw new GatewayError(400, "INVALID_NESTED_KEY");
    }
    assertSafeStructure(nested, depth + 1);
  }
}

function requireText(value: unknown, field: string, max: number) {
  if (typeof value !== "string" || !value.trim() || value.length > max) throw new GatewayError(400, `INVALID_${field.toUpperCase()}`);
}

function requireUuid(value: unknown, field: string, nullable = false) {
  if (nullable && (value === null || value === undefined)) return;
  if (typeof value !== "string" || !UUID_PATTERN.test(value)) throw new GatewayError(400, `INVALID_${field.toUpperCase()}`);
}

function requireTimestamp(value: unknown, field: string) {
  if (typeof value !== "string" || !Number.isFinite(Date.parse(value))) throw new GatewayError(400, `INVALID_${field.toUpperCase()}`);
}

function requireNumber(value: unknown, field: string, minimum: number, maximum: number, integer = false) {
  const number = typeof value === "number" ? value : Number.NaN;
  if (!Number.isFinite(number) || number < minimum || number > maximum || (integer && !Number.isInteger(number))) {
    throw new GatewayError(400, `INVALID_${field.toUpperCase()}`);
  }
  return number;
}

function validateResult(payload: Record<string, unknown>) {
  if (payload.found === undefined) return;
  if (typeof payload.found !== "boolean") throw new GatewayError(400, "INVALID_FOUND");
  if (payload.found === false && (payload.result !== "none" || payload.grams != null)) throw new GatewayError(400, "INCONSISTENT_RESULT");
  if (payload.found === true && payload.result === "none") throw new GatewayError(400, "INCONSISTENT_RESULT");
}

function validateTripContract(payload: Record<string, unknown>, schemaVersion: number) {
  const flags = Array.isArray(payload.data_quality_flags) ? payload.data_quality_flags : [];
  const accountReport = schemaVersion === 1 && flags.includes(ACCOUNT_REPORT_FLAG);
  if (![2, CURRENT_TRIP_EVIDENCE_SCHEMA_VERSION].includes(schemaVersion) && !accountReport) return;

  requireUuid(payload.trip_id, "trip_id");
  requireTimestamp(payload.trip_started_at, "trip_started_at");
  requireTimestamp(payload.trip_ended_at, "trip_ended_at");
  const startedAt = Date.parse(String(payload.trip_started_at));
  const endedAt = Date.parse(String(payload.trip_ended_at));
  if (endedAt <= startedAt || endedAt - startedAt > 24 * 60 * 60_000) throw new GatewayError(400, "INVALID_TRIP_PERIOD");
  const searchMinutes = requireNumber(payload.search_minutes, "search_minutes", 1, 24 * 60, true);
  if (Math.abs(searchMinutes - Math.round((endedAt - startedAt) / 60_000)) > 1) throw new GatewayError(400, "INCONSISTENT_SEARCH_TIME");
  if (!SEARCH_COVERAGE.has(String(payload.search_coverage))) throw new GatewayError(400, "INVALID_SEARCH_COVERAGE");
  requireText(payload.actual_zone_id, "actual_zone_id", 160);
  requireText(payload.actual_coastal_part_id, "actual_coastal_part_id", 160);
  if (typeof payload.found !== "boolean") throw new GatewayError(400, "INVALID_FOUND");

  if (accountReport) {
    if (payload.calibration_eligible !== false) throw new GatewayError(400, "INVALID_CALIBRATION_ELIGIBILITY");
    if (payload.forecast_zone_id != null || payload.forecast_coastal_part_id != null || payload.forecast_snapshot_id != null || payload.calibration_features != null) {
      throw new GatewayError(400, "HISTORICAL_FORECAST_NOT_ALLOWED");
    }
    return;
  }

  requireText(payload.forecast_zone_id, "forecast_zone_id", 160);
  requireText(payload.forecast_coastal_part_id, "forecast_coastal_part_id", 160);
  requireText(payload.forecast_snapshot_id, "forecast_snapshot_id", 160);
  requireTimestamp(payload.forecast_issued_at, "forecast_issued_at");
  requireTimestamp(payload.forecast_valid_at, "forecast_valid_at");
  requireTimestamp(payload.forecast_captured_at, "forecast_captured_at");
  if (!isRecord(payload.calibration_features)) throw new GatewayError(400, "INVALID_CALIBRATION_FEATURES");
  for (const score of ["totalScore", "huntabilityScore", "transportScore", "mobilisationScore"]) {
    requireNumber(payload.calibration_features[score], score, 0, 100);
  }
  if (schemaVersion === CURRENT_TRIP_EVIDENCE_SCHEMA_VERSION && tripEvidenceIntegrityIssues(payload).length) {
    throw new GatewayError(400, "INVALID_TRIP_EVIDENCE_INTEGRITY");
  }
  if (schemaVersion === CURRENT_TRIP_EVIDENCE_SCHEMA_VERSION
    && !submittedCalibrationEligibilityMatches(payload, ravScoreModelBinding(), {
      ineligibleBindings: [candidateGRollbackModelBinding()],
    })) {
    throw new GatewayError(400, "INVALID_CALIBRATION_ELIGIBILITY");
  }
}

function validatePayload(payload: Record<string, unknown>) {
  const unknown = Object.keys(payload).filter((key) => !ALLOWED_FIELDS.has(key));
  if (unknown.length) throw new GatewayError(400, "UNKNOWN_FIELDS");
  if (payload.gps !== null && payload.gps !== undefined) throw new GatewayError(400, "PRECISE_LOCATION_NOT_ALLOWED");
  assertSafeStructure(payload.weather_snapshot);
  assertSafeStructure(payload.calibration_features);
  try {
    assertTripObservationNestedPrivacy(payload);
  } catch (error) {
    const code = error instanceof Error ? error.message : "INVALID_NESTED_DATA";
    throw new GatewayError(400, code);
  }

  if (payload.zone_id !== null && payload.zone_id !== undefined && !Number.isSafeInteger(payload.zone_id)) throw new GatewayError(400, "INVALID_ZONE_ID");
  requireText(payload.actual_zone_id ?? payload.zone_name, "zone", 160);
  requireText(payload.hunt_mode, "hunt_mode", 20);
  if (!new Set(["waders", "beach"]).has(String(payload.hunt_mode))) throw new GatewayError(400, "INVALID_HUNT_MODE");
  requireText(payload.result, "result", 20);
  if (!new Set(["none", "small", "medium", "good"]).has(String(payload.result))) throw new GatewayError(400, "INVALID_RESULT");
  requireTimestamp(payload.observed_at, "observed_at");
  requireTimestamp(payload.submitted_at, "submitted_at");
  requireUuid(payload.anonymous_id, "anonymous_id");
  requireUuid(payload.client_observation_id, "client_observation_id");
  requireUuid(payload.user_id, "user_id", true);
  requireUuid(payload.trip_id, "trip_id", true);

  const grams = payload.grams == null ? null : payload.grams;
  if (grams !== null && (typeof grams !== "number" || !Number.isFinite(grams) || grams < 0 || grams > 10000)) throw new GatewayError(400, "INVALID_GRAMS");
  const schemaVersion = payload.schema_version == null ? 1 : payload.schema_version;
  if (!Number.isInteger(schemaVersion) || ![1, 2, CURRENT_TRIP_EVIDENCE_SCHEMA_VERSION].includes(schemaVersion as number)) throw new GatewayError(400, "INVALID_SCHEMA_VERSION");
  const numericSchemaVersion = schemaVersion as number;
  if (payload.data_quality_flags != null && (!Array.isArray(payload.data_quality_flags) || payload.data_quality_flags.length > 20 || payload.data_quality_flags.some((item) => typeof item !== "string" || item.length > 80))) {
    throw new GatewayError(400, "INVALID_DATA_QUALITY_FLAGS");
  }
  validateResult(payload);
  validateTripContract(payload, numericSchemaVersion);
  return payload;
}

Deno.serve(async (request) => {
  try {
    assertAllowedOrigin(request);
    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders(request) });
    const payload = await readJsonObject(request, 64 * 1024);
    const validatedPayload = validatePayload(payload);
    await enforceRateLimits(request, "submit-observation", { minute: 4, hour: 50, globalDay: 2000 });

    const userId = await resolveAuthenticatedUserId(request);
    if (validatedPayload.user_id && validatedPayload.user_id !== userId) throw new GatewayError(403, "USER_MISMATCH");
    const boundUserId = userId && validatedPayload.user_id === userId ? userId : null;
    const observedAt = Date.parse(String(validatedPayload.observed_at));
    if (!userId && (observedAt < Date.now() - 7 * 86400_000 || observedAt > Date.now() + 10 * 60_000)) {
      throw new GatewayError(403, "LOGIN_REQUIRED_FOR_HISTORICAL_REPORT");
    }
    if (!userId && Array.isArray(validatedPayload.data_quality_flags) && validatedPayload.data_quality_flags.includes("account-manual")) {
      throw new GatewayError(403, "LOGIN_REQUIRED_FOR_ACCOUNT_REPORT");
    }

    await storeObservation({
      ...validatedPayload,
      submitted_at: new Date().toISOString(),
      user_id: boundUserId,
      gps: null,
    }, boundUserId);
    return jsonResponse(request, { stored: true });
  } catch (error) {
    return safeGatewayError(request, error);
  }
});
