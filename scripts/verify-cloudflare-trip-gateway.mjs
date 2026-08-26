import { pathToFileURL } from 'node:url';
import { normalizeCloudflareGatewayUrl, tripGatewaySignature } from '../supabase/functions/_shared/trip-storage.js';

export const WORKER_HEALTH_RETRY_DELAYS_MS = Object.freeze([0, 1_000, 2_000, 3_000, 5_000, 8_000, 13_000, 21_000]);

function sleep(milliseconds) {
  return new Promise(resolve => setTimeout(resolve, milliseconds));
}

function validHealth(response, body) {
  return response?.ok === true && body?.ok === true && body?.shards === 10 && body?.storage_schema_version === 1;
}

export async function waitForWorkerHealth({
  gatewayUrl,
  fetchImpl = fetch,
  retryDelaysMs = WORKER_HEALTH_RETRY_DELAYS_MS,
}) {
  let lastResponse = null;
  let lastBody = {};
  for (const delay of retryDelaysMs) {
    if (delay > 0) await sleep(delay);
    try {
      lastResponse = await fetchImpl(`${gatewayUrl}/health`, { headers: { accept: 'application/json' } });
      lastBody = await lastResponse.json().catch(() => ({}));
      if (validHealth(lastResponse, lastBody)) return { response: lastResponse, body: lastBody };
    } catch {
      lastResponse = null;
      lastBody = {};
    }
  }
  return { response: lastResponse, body: lastBody };
}

async function main() {
  const gatewayUrl = normalizeCloudflareGatewayUrl(process.env.CLOUDFLARE_TRIP_GATEWAY_URL || '');
  const sharedSecret = process.env.TRIP_GATEWAY_SHARED_SECRET || '';
  if (sharedSecret.length < 32) throw new Error('Worker-verifikationens delte hemmelighed mangler.');

  const health = await waitForWorkerHealth({ gatewayUrl });
  if (!validHealth(health.response, health.body)) {
    throw new Error('Workerens offentlige, datasikre health-kontrakt fejlede efter afgrænset udbredelsesventetid.');
  }

  const unsigned = await fetch(`${gatewayUrl}/v1/trips/count`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: '{}',
  });
  if (unsigned.status !== 401) throw new Error(`Workerens private API accepterede et usigneret kald (${unsigned.status}).`);

  const bodyText = '{}';
  const timestamp = String(Date.now());
  const signature = await tripGatewaySignature({
    secret: sharedSecret,
    timestamp,
    method: 'POST',
    pathname: '/v1/trips/count',
    bodyText,
  });
  const count = await fetch(`${gatewayUrl}/v1/trips/count`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-RavRadar-Signature': signature,
      'X-RavRadar-Timestamp': timestamp,
    },
    body: bodyText,
  });
  const countBody = await count.json().catch(() => ({}));
  if (!count.ok || countBody?.ok !== true || !Number.isSafeInteger(countBody?.trip_count)) {
    throw new Error('Workerens signerede kontrolkald fejlede.');
  }
  console.log(`Cloudflare-gatewayen er grøn: privat HMAC-grænse, 10 shards og ${countBody.trip_count} samlede poster.`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await main();
}
