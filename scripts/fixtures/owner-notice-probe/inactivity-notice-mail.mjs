const RESEND_EMAILS = "https://api.resend.com/emails";
const LIVE_FROM = "RavRadar <varsling@besked.ravradar.dk>";
const REPLY_TO = "ravradar@outlook.dk";
const UUID = /^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i;
const MAILBOX = /^[^\s@<>,;]+@[^\s@<>,;]+\.[^\s@<>,;]+$/;
const MAX_RETRY_AGE_MS = 23 * 60 * 60 * 1000;

const MAX_PROVIDER_RECEIPT_BYTES = 1_024;

async function readProviderId(response) {
  const mediaType = response.headers.get("content-type")?.split(";")[0].trim().toLowerCase();
  if (mediaType !== "application/json" || !response.body) {
    void response.body?.cancel().catch(() => {});
    return null;
  }

  const reader = response.body.getReader();
  const buffer = new Uint8Array(MAX_PROVIDER_RECEIPT_BYTES);
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
    const id = JSON.parse(decoded)?.id;
    return typeof id === "string" && UUID.test(id) ? id.toLowerCase() : null;
  } finally {
    void reader.cancel().catch(() => {});
    reader.releaseLock();
  }
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
      body: JSON.stringify({
        from: LIVE_FROM,
        to: [recipient],
        reply_to: REPLY_TO,
        ...message,
      }),
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
    const providerId = await readProviderId(response);
    return providerId ? { state: "accepted", providerId } : { state: "unknown" };
  } catch {
    return { state: "unknown" };
  }
}
