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
import { readAdminTripCount } from "../_shared/admin-trip-count.ts";
import { readAdminAccountCategories, validateAdminCategoryIds } from "../_shared/admin-account-categories.ts";
import { AUTOMATIC_ACCOUNT_ERASURE_HEADER, runScheduledAccountErasure, isManualAccountErasureOperation,
  runManualAccountErasure, validateManualAccountErasurePayload } from "../_shared/account-lifecycle.js";
import { runAccountInactivityNotice, runScheduledAccountNotices, validateAccountInactivityNoticePayload } from "../_shared/account-inactivity-notice.js";

Deno.serve(async (request) => {
  try {
    if (request.headers.has(AUTOMATIC_ACCOUNT_ERASURE_HEADER)) {
      const outcome = request.headers.get(AUTOMATIC_ACCOUNT_ERASURE_HEADER) === "notice-v1"
        ? await runScheduledAccountNotices(request)
        : await runScheduledAccountErasure(request);
      return new Response(JSON.stringify(outcome), {
        status: outcome.failed ? 503 : 200,
        headers: { "Content-Type": "application/json", "Cache-Control": "private, no-store" },
      });
    }
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
    const adminCountRequested = payload.operation === "admin-count";
    const adminCategoriesRequested = payload.operation === "admin-account-categories";
    const exportRequested = payload.operation === "export-page";
    const noticeRequested = ["account-inactivity-list", "account-inactivity-prepare", "account-inactivity-status", "account-inactivity-resume"].includes(payload.operation);
    const accountErasureRequested = isManualAccountErasureOperation(payload.operation);
    const allowedFields = noticeRequested ? (payload.operation === "account-inactivity-list"
      ? ["operation", "afterNoticeId"] : payload.operation === "account-inactivity-prepare" ? ["operation", "noticeId", "targetUserId"]
      : payload.operation === "account-inactivity-status" ? ["operation", "noticeId"] : ["operation", "noticeId", "attemptId", "confirmation"])
      : accountErasureRequested ? (payload.operation === "account-erasure-list"
      ? ["operation", "afterOperationId"] : payload.operation === "account-erasure-prepare"
      ? ["operation", "operationId", "targetUserId"] : payload.operation === "account-erasure-status"
      ? ["operation", "operationId"] : ["operation", "operationId", "attemptId", "confirmation"])
      : adminCountRequested ? ["operation"] : adminCategoriesRequested ? ["operation", "ids"] : exportRequested ? ["operation", "cursor"] : ["limit"];
    const unknown = Object.keys(payload).filter(key => !allowedFields.includes(key));
    if (unknown.length) throw new GatewayError(400, "UNKNOWN_FIELDS");
    if (accountErasureRequested) validateManualAccountErasurePayload(payload);
    if (noticeRequested) validateAccountInactivityNoticePayload(payload);
    if (adminCategoriesRequested) validateAdminCategoryIds(payload.ids);
    if (exportRequested && !(payload.cursor === null || (typeof payload.cursor === "string" && payload.cursor.length <= 512))) {
      throw new GatewayError(400, "INVALID_EXPORT_CURSOR");
    }
    const limit = Math.max(1, Math.min(200, Math.round(Number(payload.limit) || 100)));
    await enforceRateLimits(request, "trip-log", { minute: 12, hour: 120, globalDay: 5000 });
    const userId = await requireAuthenticatedUserId(request);
    if (noticeRequested) {
      const response = jsonResponse(request, await runAccountInactivityNotice(request, userId, payload));
      response.headers.set("Cache-Control", "no-store");
      return response;
    }
    if (accountErasureRequested) {
      const response = jsonResponse(request, await runManualAccountErasure(request, userId, payload));
      response.headers.set("Cache-Control", "no-store");
      return response;
    }
    if (adminCountRequested) {
      const response = jsonResponse(request, await readAdminTripCount(request, userId));
      response.headers.set("Cache-Control", "no-store");
      return response;
    }
    if (adminCategoriesRequested) {
      const response = jsonResponse(request, await readAdminAccountCategories(request, userId, payload.ids));
      response.headers.set("Cache-Control", "no-store");
      return response;
    }
    if (exportRequested) return jsonResponse(request, await exportOwnTripPage(userId, payload.cursor as string | null));
    const rows = await listOwnTripObservations(userId, limit);
    return jsonResponse(request, { rows });
  } catch (error) {
    return safeGatewayError(request, error);
  }
});
