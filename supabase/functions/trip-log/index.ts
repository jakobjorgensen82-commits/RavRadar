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
import {
  classifyTripStorageContractProbe,
  TRIP_STORAGE_CONTRACT_PROBE_HEADER,
  TRIP_STORAGE_SIGNED_LOGIN_METHOD,
  TRIP_STORAGE_SIGNED_LOGIN_PROBE_KIND,
  TRIP_STORAGE_SIGNED_LOGIN_SIGNATURE_PATH,
} from "../_shared/trip-storage-contract-probe.js";
import { verifyTripGatewaySignature } from "../_shared/trip-storage.js";
import { exportOwnTripPage, listOwnTripObservations } from "../_shared/trip-store.ts";
import { tripStorageReadinessHeaders } from "../_shared/trip-storage-readiness.ts";

Deno.serve(async (request) => {
  try {
    assertAllowedOrigin(request);
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: tripStorageReadinessHeaders(request, true) });
    }
    const contractProbeHeader = request.headers.get(TRIP_STORAGE_CONTRACT_PROBE_HEADER);
    if (contractProbeHeader !== null) {
      const contractProbe = classifyTripStorageContractProbe({
        method: request.method,
        headerValue: contractProbeHeader,
        hasBody: request.body !== null,
      });
      const contractProbeSecret = Deno.env.get("TRIP_GATEWAY_SHARED_SECRET") || "";
      const contractProbeValid = contractProbe.kind === TRIP_STORAGE_SIGNED_LOGIN_PROBE_KIND
        && contractProbeSecret.length >= 32
        && await verifyTripGatewaySignature({
          secret: contractProbeSecret,
          timestamp: request.headers.get("x-ravradar-timestamp"),
          signature: request.headers.get("x-ravradar-signature"),
          method: TRIP_STORAGE_SIGNED_LOGIN_METHOD,
          pathname: TRIP_STORAGE_SIGNED_LOGIN_SIGNATURE_PATH,
          bodyText: "",
        });
      if (!contractProbeValid) throw new GatewayError(401, "CONTRACT_PROBE_UNAUTHORIZED");
      return new Response(JSON.stringify(contractProbe.body), {
        status: contractProbe.status,
        headers: {
          "Content-Type": "application/json; charset=utf-8",
          ...tripStorageReadinessHeaders(request, true),
        },
      });
    }
    const payload = await readJsonObject(request, 4 * 1024);
    const exportRequested = payload.operation === "export-page";
    const allowedFields = exportRequested ? ["operation", "cursor"] : ["limit"];
    const unknown = Object.keys(payload).filter(key => !allowedFields.includes(key));
    if (unknown.length) throw new GatewayError(400, "UNKNOWN_FIELDS");
    if (exportRequested && !(payload.cursor === null || (typeof payload.cursor === "string" && payload.cursor.length <= 512))) {
      throw new GatewayError(400, "INVALID_EXPORT_CURSOR");
    }
    const limit = Math.max(1, Math.min(200, Math.round(Number(payload.limit) || 100)));
    await enforceRateLimits(request, "trip-log", { minute: 12, hour: 120, globalDay: 5000 });
    const userId = await requireAuthenticatedUserId(request);
    if (exportRequested) return jsonResponse(request, await exportOwnTripPage(userId, payload.cursor as string | null));
    const rows = await listOwnTripObservations(userId, limit);
    return jsonResponse(request, { rows });
  } catch (error) {
    return safeGatewayError(request, error);
  }
});
