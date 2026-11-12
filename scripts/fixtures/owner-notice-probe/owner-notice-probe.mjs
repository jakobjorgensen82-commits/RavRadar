import { sendInactivityNotice } from "./inactivity-notice-mail.mjs";

const FUNCTION_NAME = "inactivity-notice-owner-probe";
const ENDPOINT = "/functions/v1/" + FUNCTION_NAME;
const BASE = "https://afqhhdrkjfjtpadntdzo.supabase.co";
const UUID = /^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/;
const MAILBOX = /^[^\s@<>,;]+@[^\s@<>,;]+\.[^\s@<>,;]+$/;
const KEY = /^re_[A-Za-z0-9_-]+$/;
const PROBE_WINDOW_MS = 15 * 60 * 1000;

function validateReservation({ noticeId, reservedAt, expiresAt }) {
  if (typeof noticeId !== "string" || !UUID.test(noticeId)
      || !Number.isSafeInteger(reservedAt) || reservedAt < 1_000_000_000_000
      || !Number.isSafeInteger(expiresAt) || expiresAt <= reservedAt
      || expiresAt - reservedAt > PROBE_WINDOW_MS) {
    throw new Error("OWNER_NOTICE_PROBE_INVALID_RESERVATION");
  }
}

function signatureFields(noticeId, timestamp) {
  return {
    timestamp, method: "POST",
    pathname: ENDPOINT + ":signed-owner-mail-probe-v1/" + noticeId,
    bodyText: "",
  };
}

function json(status, body) {
  return Response.json(body, { status, headers: { "Cache-Control": "no-store" } });
}

// The private deployment adapter must bind exactly one reviewed reservation and
// recipient. Nothing from the request can replace those values or the message.
export function createOwnerNoticeProbe({
  noticeId, reservedAt, expiresAt, recipient, verifySignature, readSecret,
  clock = Date.now, fetchImpl = fetch,
}) {
  validateReservation({ noticeId, reservedAt, expiresAt });
  if (typeof recipient !== "string" || recipient.length > 254 || !MAILBOX.test(recipient)
      || typeof verifySignature !== "function" || typeof readSecret !== "function") {
    throw new Error("OWNER_NOTICE_PROBE_INVALID_CONFIGURATION");
  }
  let result;
  return async request => {
    const url = new URL(request.url);
    if (request.method !== "POST" || request.body !== null || url.search
        || (url.pathname !== ENDPOINT && url.pathname !== "/" + FUNCTION_NAME)) {
      return json(404, { state: "not_found" });
    }
    const now = clock();
    if (now < reservedAt || now >= expiresAt) return json(404, { state: "not_found" });
    const timestamp = request.headers.get("x-ravradar-timestamp");
    const signature = request.headers.get("x-ravradar-signature");
    if (!/^\d{13}$/.test(timestamp ?? "") || Number(timestamp) < reservedAt
        || Number(timestamp) >= expiresAt || !/^[a-f0-9]{64}$/.test(signature ?? "")) {
      return json(401, { state: "unauthorized" });
    }

    let authenticated = false;
    try {
      const secret = readSecret("TRIP_GATEWAY_SHARED_SECRET");
      authenticated = typeof secret === "string" && secret.length >= 32
        && await verifySignature({ ...signatureFields(noticeId, timestamp), secret, signature, now });
    } catch {
      return json(503, { state: "unavailable" });
    }
    if (!authenticated) return json(401, { state: "unauthorized" });

    const authorizedAt = clock();
    if (authorizedAt < reservedAt || authorizedAt >= expiresAt) return json(404, { state: "not_found" });
    if (!result) {
      const key = readSecret("RAVRADAR_RESEND_NOTICE_SEND_KEY");
      if (typeof key !== "string" || !KEY.test(key)) return json(503, { state: "unavailable" });
      // The same immutable noticeId also deduplicates across Edge isolates.
      result = sendInactivityNotice({ key, recipient, noticeId, reservedAt, now: authorizedAt, probe: true, fetchImpl });
    }
    const receipt = await result;
    if (receipt.state === "accepted") return json(200, receipt);
    if (receipt.state === "limited") return json(429, { state: "limited" });
    if (receipt.state === "rejected") return json(502, { state: "rejected" });
    return json(502, { state: "unknown" });
  };
}

export async function makeOwnerNoticeProbeRequest({
  noticeId, reservedAt, expiresAt, sharedSecret, publishableKey, sign, now = Date.now(),
}) {
  validateReservation({ noticeId, reservedAt, expiresAt });
  if (!Number.isSafeInteger(now) || now < reservedAt || now >= expiresAt
      || typeof sharedSecret !== "string" || sharedSecret.length < 32
      || typeof publishableKey !== "string" || !publishableKey
      || typeof sign !== "function") throw new Error("OWNER_NOTICE_PROBE_REQUEST_REFUSED");
  const timestamp = String(now);
  const signature = await sign({ ...signatureFields(noticeId, timestamp), secret: sharedSecret });
  if (typeof signature !== "string" || !/^[a-f0-9]{64}$/.test(signature)) {
    throw new Error("OWNER_NOTICE_PROBE_REQUEST_REFUSED");
  }
  return new Request(BASE + ENDPOINT, {
    method: "POST", redirect: "error", cache: "no-store",
    signal: AbortSignal.timeout(15_000),
    headers: {
      apikey: publishableKey,
      "x-ravradar-timestamp": timestamp,
      "x-ravradar-signature": signature,
    },
  });
}

