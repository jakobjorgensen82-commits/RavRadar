import { createOwnerNoticeProbe } from "../owner-notice-probe.mjs";
import { invokeOwnerNoticeProbe } from "../owner-notice-probe-invoke.mjs";

const PROJECT_ORIGIN = "https://afqhhdrkjfjtpadntdzo.supabase.co";
const FUNCTION_PATH = "/inactivity-notice-owner-probe";
const PUBLIC_PATH = "/functions/v1" + FUNCTION_PATH;
const UUID = /^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/;
const JWT = /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/;

export function makeHostedOwnerNoticeRequest({ ownerAccessToken, publishableKey }) {
  if (typeof ownerAccessToken !== "string" || !JWT.test(ownerAccessToken)
      || typeof publishableKey !== "string" || !publishableKey) {
    throw new Error("OWNER_NOTICE_SESSION_REQUIRED");
  }
  return new Request(PROJECT_ORIGIN + PUBLIC_PATH, {
    method: "POST", redirect: "error", cache: "no-store", signal: AbortSignal.timeout(25_000),
    headers: { apikey: publishableKey, authorization: "Bearer " + ownerAccessToken },
  });
}

function json(status, state) {
  return Response.json({ state }, { status, headers: { "Cache-Control": "no-store" } });
}

export function createHostedOwnerNoticeProbe({
  projectUrl, ownerId, recipient, noticeId, reservedAt, expiresAt, anonKey,
  requireAuthenticatedUserId, sign, verifySignature, readSecret, fetchImpl, clock = Date.now,
}) {
  if (projectUrl !== PROJECT_ORIGIN || typeof ownerId !== "string" || !UUID.test(ownerId)
      || typeof anonKey !== "string" || !anonKey || typeof fetchImpl !== "function") {
    throw new Error("OWNER_NOTICE_HOST_BINDING_INVALID");
  }
  const signedProbe = createOwnerNoticeProbe({
    noticeId, reservedAt, expiresAt, recipient, verifySignature, readSecret, clock, fetchImpl,
  });
  const profileUrl = new URL(PROJECT_ORIGIN + "/rest/v1/profiles");
  profileUrl.search = new URLSearchParams({ select: "id,role,is_active", id: "eq." + ownerId, limit: "1" });
  const isReserved = () => {
    const now = clock();
    return now >= reservedAt && now < expiresAt;
  };

  return async request => {
    const url = new URL(request.url);
    if (request.method !== "POST" || request.body !== null || url.search
        || (url.pathname !== PUBLIC_PATH && url.pathname !== FUNCTION_PATH) || !isReserved()) {
      return json(404, "not_found");
    }
    const authorization = request.headers.get("authorization");
    if (!authorization?.startsWith("Bearer ") || !JWT.test(authorization.slice(7))) {
      return json(401, "unauthorized");
    }

    try {
      const authenticatedId = await requireAuthenticatedUserId(request);
      if (authenticatedId !== ownerId) return json(403, "forbidden");
      const response = await fetchImpl(profileUrl, {
        headers: { apikey: anonKey, authorization },
        redirect: "error", cache: "no-store", signal: AbortSignal.timeout(5_000),
      });
      if (!response.ok) return json(503, "unavailable");
      const profiles = await response.json();
      const profile = profiles?.[0];
      if (!Array.isArray(profiles) || profiles.length !== 1 || profile?.id !== ownerId
          || profile.role !== "owner" || profile.is_active !== true) {
        return json(403, "forbidden");
      }
      if (!isReserved()) return json(404, "not_found");

      // Keep signing, verification and receipt parsing inside this isolate.
      const receipt = await invokeOwnerNoticeProbe({
        noticeId, reservedAt, expiresAt, now: clock(), sign, publishableKey: anonKey,
        sharedSecret: readSecret("TRIP_GATEWAY_SHARED_SECRET"),
      }, signedProbe);
      if (receipt.state !== "accepted") return json(502, "unconfirmed");
      return Response.json(receipt, { headers: { "Cache-Control": "no-store" } });
    } catch (error) {
      return error?.status === 401 ? json(401, "unauthorized") : json(503, "unavailable");
    }
  };
}
