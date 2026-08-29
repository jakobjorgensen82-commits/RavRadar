import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import {
  assertAllowedOrigin,
  enforceRateLimits,
  GatewayError,
  jsonResponse,
  readJsonObject,
  requireAuthenticatedUserId,
  safeGatewayError,
} from "../_shared/public-gateway.ts";
import { listOwnTripObservations } from "../_shared/trip-store.ts";
import { tripStorageReadinessHeaders } from "../_shared/trip-storage-readiness.ts";

Deno.serve(async (request) => {
  try {
    assertAllowedOrigin(request);
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: tripStorageReadinessHeaders(request) });
    }
    const payload = await readJsonObject(request, 4 * 1024);
    const unknown = Object.keys(payload).filter(key => key !== "limit");
    if (unknown.length) throw new GatewayError(400, "UNKNOWN_FIELDS");
    const limit = Math.max(1, Math.min(200, Math.round(Number(payload.limit) || 100)));
    await enforceRateLimits(request, "trip-log", { minute: 12, hour: 120, globalDay: 5000 });
    const userId = await requireAuthenticatedUserId(request);
    const rows = await listOwnTripObservations(userId, limit);
    return jsonResponse(request, { rows });
  } catch (error) {
    return safeGatewayError(request, error);
  }
});
