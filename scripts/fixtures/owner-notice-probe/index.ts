import { requireAuthenticatedUserId } from "../_shared/public-gateway.ts";
import { tripGatewaySignature, verifyTripGatewaySignature } from "../_shared/trip-storage.js";
import { createHostedOwnerNoticeProbe } from "./hosted-owner-adapter-v1/hosted-owner-notice-probe.mjs";
import reservation from "./reservation.mjs";

const ADMIN_ORIGIN = "https://ravradar.dk";
const PATH = "/inactivity-notice-owner-probe";
const CORS = {
  "Access-Control-Allow-Origin": ADMIN_ORIGIN,
  "Access-Control-Allow-Methods": "POST",
  "Access-Control-Allow-Headers": "apikey, authorization",
  "Cache-Control": "no-store",
  "Vary": "Origin",
};

type Reservation = {
  ownerId: string;
  recipient: string;
  noticeId: string;
  reservedAt: number;
  expiresAt: number;
};

function notFound() {
  return new Response(null, { status: 404, headers: { "Cache-Control": "no-store" } });
}

function reportGatewayGuard(request: Request, bindingPresent: boolean, category: string, window = "UNOBSERVED") {
  if (request.method !== "OPTIONS") return;
  try {
    const url = new URL(request.url);
    console.info("OWNER_NOTICE_PROBE_GATEWAY_GUARD", {
      bindingPresent,
      pathClass: url.pathname === PATH ? "FUNCTION" : url.pathname === "/functions/v1" + PATH ? "PUBLIC" : "OTHER",
      queryPresent: url.search !== "",
      originMatches: request.headers.get("origin") === ADMIN_ORIGIN,
      requestedMethodMatches: request.headers.get("access-control-request-method") === "POST",
      bodyPointerPresent: request.body !== null,
      window,
      category,
    });
  } catch {
    // Private diagnostics cannot alter the existing response or authorize mail.
  }
}

export function createOwnerNoticeEdgeHandler(binding: Reservation | null) {
  if (!binding) return (request: Request) => {
    reportGatewayGuard(request, false, "BINDING_MISSING", "UNBOUND");
    return notFound();
  };

  const { ownerId, recipient, noticeId, reservedAt, expiresAt } = binding;
  const handleProbe = createHostedOwnerNoticeProbe({
    ownerId, recipient, noticeId, reservedAt, expiresAt,
    projectUrl: Deno.env.get("SUPABASE_URL"),
    anonKey: Deno.env.get("SUPABASE_ANON_KEY"),
    requireAuthenticatedUserId,
    sign: tripGatewaySignature,
    verifySignature: verifyTripGatewaySignature,
    readSecret: (name: string) => Deno.env.get(name),
    fetchImpl: fetch,
  });

  return async (request: Request) => {
    const url = new URL(request.url);
    const reject = (category: string, window = "UNOBSERVED") => {
      reportGatewayGuard(request, true, category, window);
      return notFound();
    };
    if (url.pathname !== PATH && url.pathname !== "/functions/v1" + PATH) return reject("PATH_REJECTED");
    if (url.search) return reject("QUERY_REJECTED");
    if (request.headers.get("origin") !== ADMIN_ORIGIN) return reject("ORIGIN_REJECTED");
    if (request.method === "OPTIONS") {
      if (request.headers.get("access-control-request-method") !== "POST") return reject("REQUESTED_METHOD_REJECTED");
      if (request.body !== null) return reject("BODY_POINTER_REJECTED");
      if (Date.now() < reservedAt) return reject("WINDOW_REJECTED", "BEFORE");
      if (Date.now() >= expiresAt) return reject("WINDOW_REJECTED", "AFTER");
      reportGatewayGuard(request, true, "OPTIONS_ACCEPTED", "IN");
      return new Response(null, { status: 204, headers: CORS });
    }
    const response = await handleProbe(request);
    for (const [header, value] of Object.entries(CORS)) response.headers.set(header, value);
    return response;
  };
}

Deno.serve(createOwnerNoticeEdgeHandler(reservation));
