const RESEND_EMAILS = "https://api.resend.com/emails";
const LIVE_FROM = "RavRadar <varsling@besked.ravradar.dk>";
const REPLY_TO = "ravradar@outlook.dk";
const UUID = /^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i;
const MAILBOX = /^[^\s@<>,;]+@[^\s@<>,;]+\.[^\s@<>,;]+$/;
const MAX_RETRY_AGE_MS = 23 * 60 * 60 * 1000;

const MAX_PROVIDER_RECEIPT_BYTES = 1_024;
const MAX_PROVIDER_DELIVERY_BYTES = 8_192;

async function readProviderJson(response, maxBytes) {
  const mediaType = response.headers.get("content-type")?.split(";")[0].trim().toLowerCase();
  if (mediaType !== "application/json" || !response.body) {
    void response.body?.cancel().catch(() => {});
    return null;
  }

  const reader = response.body.getReader();
  const buffer = new Uint8Array(maxBytes);
  let size = 0;
  try {
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      if (size + value.byteLength > buffer.byteLength) return null;
      buffer.set(value, size);
      size += value.byteLength;
    }
    const decoded = new TextDecoder("utf-8", { fatal: true }).decode(buffer.subarray(0, size));
    return JSON.parse(decoded);
  } finally {
    void reader.cancel().catch(() => {});
    reader.releaseLock();
  }
}

export function inactivityNoticeBody(recipient, probe = false) {
  const message = probe
    ? {
      subject: "Prøvemail fra RavRadar",
      text: "Dette er en teknisk prøve af RavRadars mailafsender. Du behøver ikke gøre noget.",
    }
    : {
      subject: "Log ind, hvis du vil beholde din RavRadar-konto",
      text: [
        "Din RavRadar-konto har været inaktiv i mindst to år.",
        "Hvis du vil beholde den, skal du logge ind på https://ravradar.dk/ inden for 30 dage.",
        "Hvis du ikke logger ind, kan din konto og dens gemte ture blive slettet efter varslingsperioden.",
        "Du kan svare på denne mail, hvis du har spørgsmål.",
      ].join("\n\n"),
    };
  return { from: LIVE_FROM, to: [recipient], reply_to: REPLY_TO, ...message };
}

export async function sendInactivityNotice({
  key, recipient, noticeId, reservedAt, probe = false, fetchImpl = fetch, now = Date.now(),
}) {
  if (typeof key !== "string" || !/^re_[A-Za-z0-9_-]+$/.test(key)
      || typeof recipient !== "string" || recipient.length > 254 || !MAILBOX.test(recipient)
      || typeof noticeId !== "string" || !UUID.test(noticeId)
      || !Number.isFinite(now) || !Number.isFinite(reservedAt) || reservedAt > now
      || now - reservedAt >= MAX_RETRY_AGE_MS || typeof probe !== "boolean") {
    return { state: "not_attempted" };
  }



  try {
    const response = await fetchImpl(RESEND_EMAILS, {
      method: "POST",
      redirect: "error",
      signal: AbortSignal.timeout(10_000),
      headers: {
        Authorization: "Bearer " + key,
        "Content-Type": "application/json",
        "Idempotency-Key": (probe ? "rr-inactivity-probe/" : "rr-inactivity/") + noticeId.toLowerCase(),
      },
      body: JSON.stringify(inactivityNoticeBody(recipient, probe)),
    });

    // Provider acceptance and delivery are separate. A failure must not
    // start a notice period, and an ambiguous outcome is never retried here.
    if (!response.ok) {
      void response.body?.cancel().catch(() => {});
      if (response.status === 429) return { state: "limited" };
      if ([400, 401, 403, 422].includes(response.status)) {
        return { state: "rejected", status: response.status };
      }
      return { state: "unknown" };
    }
    const id = (await readProviderJson(response, MAX_PROVIDER_RECEIPT_BYTES))?.id;
    return typeof id === "string" && UUID.test(id)
      ? { state: "accepted", providerId: id.toLowerCase() } : { state: "unknown" };
  } catch {
    return { state: "unknown" };
  }
}

export async function readInactivityNoticeDelivery({
  key, providerId, recipient, probe = false, fetchImpl = fetch, signal = AbortSignal.timeout(8_000),
}) {
  if (typeof key !== "string" || !/^re_[A-Za-z0-9_-]+$/.test(key)
      || typeof providerId !== "string" || !UUID.test(providerId)
      || typeof recipient !== "string" || recipient.length > 254 || !MAILBOX.test(recipient)
      || typeof probe !== "boolean") return "unavailable";
  const body = inactivityNoticeBody(recipient, probe);
  try {
    const response = await fetchImpl(RESEND_EMAILS + "/" + providerId, {
      method: "GET", redirect: "error", cache: "no-store", signal,
      headers: { Authorization: "Bearer " + key },
    });
    if (response.status !== 200) {
      void response.body?.cancel().catch(() => {});
      return [401, 403].includes(response.status) ? "permission-denied" : "unavailable";
    }
    const data = await readProviderJson(response, MAX_PROVIDER_DELIVERY_BYTES);
    if (data?.id !== providerId || data.from !== body.from
        || JSON.stringify(data.to) !== JSON.stringify(body.to) || data.subject !== body.subject
        || data.text !== body.text || JSON.stringify(data.reply_to) !== JSON.stringify([body.reply_to])) {
      return "unmatched";
    }
    return data.last_event === "delivered" ? "delivered" : "pending";
  } catch {
    return "unavailable";
  }
}
