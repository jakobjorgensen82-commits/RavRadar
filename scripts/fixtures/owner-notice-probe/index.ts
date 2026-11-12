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

export function createOwnerNoticeEdgeHandler(binding: Reservation | null) {
  if (!binding) return notFound;

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
    if ((url.pathname !== PATH && url.pathname !== "/functions/v1" + PATH) || url.search
        || request.headers.get("origin") !== ADMIN_ORIGIN) return notFound();
    if (request.method === "OPTIONS") {
      if (request.headers.get("access-control-request-method") !== "POST"
          || request.body !== null || Date.now() < reservedAt || Date.now() >= expiresAt) return notFound();
      return new Response(null, { status: 204, headers: CORS });
    }
    const response = await handleProbe(request);
    for (const [header, value] of Object.entries(CORS)) response.headers.set(header, value);
    return response;
  };
}

Deno.serve(createOwnerNoticeEdgeHandler(reservation));
