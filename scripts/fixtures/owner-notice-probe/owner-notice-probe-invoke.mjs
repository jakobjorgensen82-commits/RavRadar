import { makeOwnerNoticeProbeRequest } from "./owner-notice-probe.mjs";

const UUID = /^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/;
const MAX_RECEIPT_BYTES = 1_024;

async function readAcceptance(response) {
  if (!response.headers.get("content-type")?.toLowerCase().startsWith("application/json")
      || !response.body) return null;
  const reader = response.body.getReader();
  const buffer = new Uint8Array(MAX_RECEIPT_BYTES);
  let size = 0;
  try {
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      if (size + value.byteLength > buffer.byteLength) return null;
      buffer.set(value, size);
      size += value.byteLength;
    }
    const value = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(buffer.subarray(0, size)));
    if (value?.state !== "accepted" || !UUID.test(value?.providerId ?? "")
        || Object.keys(value).sort().join(",") !== "providerId,state") return null;
    return { state: "accepted", providerId: value.providerId };
  } finally {
    void reader.cancel().catch(() => {});
    reader.releaseLock();
  }
}

export async function invokeOwnerNoticeProbe(options, fetchImpl = fetch) {
  const request = await makeOwnerNoticeProbeRequest(options);
  try {
    const response = await fetchImpl(request);
    if (response.status !== 200) {
      void response.body?.cancel().catch(() => {});
      return { state: "unconfirmed", status: response.status };
    }
    return await readAcceptance(response) ?? { state: "unknown" };
  } catch {
    return { state: "unknown" };
  }
}

