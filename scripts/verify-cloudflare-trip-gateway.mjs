import { pathToFileURL } from 'node:url';
import { normalizeCloudflareGatewayUrl, tripGatewaySignature } from '../supabase/functions/_shared/trip-storage.js';
import {
  boundedFetch,
  TRIP_STORAGE_NETWORK_TIMEOUT_CODE,
  TRIP_STORAGE_NETWORK_TIMEOUT_MS,
} from './lib/bounded-fetch.mjs';

export const WORKER_HEALTH_RETRY_DELAYS_MS = Object.freeze([0, 1_000, 2_000, 3_000, 5_000, 8_000, 13_000, 21_000]);
export const WORKER_COUNT_RETRY_DELAYS_MS = Object.freeze([0, 250, 750]);
export const WORKER_COUNT_TRANSIENT_HTTP_STATUSES = Object.freeze([429, 502, 503, 504]);
export const WORKER_COUNT_UNSIGNED_PROBE_KIND = 'worker-count-unsigned-boundary';
export const WORKER_COUNT_SIGNED_PROBE_KIND = 'worker-count-signed-read';

const WORKER_COUNT_METHOD = 'POST';
const WORKER_COUNT_PATH = '/v1/trips/count';
const WORKER_COUNT_BODY = '{}';

function sleep(milliseconds) {
  return new Promise(resolve => setTimeout(resolve, milliseconds));
}

function validHealth(response, body) {
  return response?.ok === true
    && body?.ok === true
    && body?.contract_version === '4.0.311'
    && body?.shards === 10
    && body?.storage_schema_version === 1
    && body?.idempotency_registry_schema_version === 2
    && body?.owner_erasure_tombstone_schema_version === 1;
}

export async function waitForWorkerHealth({
  gatewayUrl,
  fetchImpl = fetch,
  retryDelaysMs = WORKER_HEALTH_RETRY_DELAYS_MS,
  fetchTimeoutMs = TRIP_STORAGE_NETWORK_TIMEOUT_MS,
}) {
  let lastResponse = null;
  let lastBody = {};
  for (const delay of retryDelaysMs) {
    if (delay > 0) await sleep(delay);
    try {
      lastResponse = await boundedFetch(`${gatewayUrl}/health`, {
        headers: { accept: 'application/json' },
      }, { fetchImpl, timeoutMs: fetchTimeoutMs });
      lastBody = await lastResponse.json().catch(() => ({}));
      if (validHealth(lastResponse, lastBody)) return { response: lastResponse, body: lastBody };
    } catch {
      lastResponse = null;
      lastBody = {};
    }
  }
  return { response: lastResponse, body: lastBody };
}

function workerCountFailure(code, { attempts = 1, status = null, probeKind = null } = {}) {
  const error = new Error(`Cloudflare Worker count verification failed (${code}).`);
  error.code = code;
  error.attempts = attempts;
  if (Number.isInteger(status)) error.status = status;
  if (probeKind) error.probeKind = probeKind;
  return error;
}

function assertWorkerCountProbeKind(probeKind) {
  if (![WORKER_COUNT_UNSIGNED_PROBE_KIND, WORKER_COUNT_SIGNED_PROBE_KIND].includes(probeKind)) {
    throw workerCountFailure('TRIP_STORAGE_WORKER_COUNT_PROBE_KIND_INVALID', { probeKind });
  }
}

function isTransientWorkerCountTransport(error) {
  return error?.code === TRIP_STORAGE_NETWORK_TIMEOUT_CODE || error instanceof TypeError;
}

async function discardWorkerCountResponse(response) {
  try {
    await response?.body?.cancel();
  } catch {
    // A transient or rejected response body is deliberately never parsed or logged.
  }
}

function nextWorkerCountTimestamp(nowFactory, previousTimestamp) {
  const candidate = Number(nowFactory());
  if (!Number.isSafeInteger(candidate) || candidate < 0) {
    throw workerCountFailure('TRIP_STORAGE_WORKER_COUNT_DESCRIPTOR_FAILURE');
  }
  return Math.max(candidate, previousTimestamp + 1);
}

async function fixedWorkerCountRequestDescriptor({
  gatewayUrl,
  sharedSecret,
  probeKind,
  timestamp,
}) {
  assertWorkerCountProbeKind(probeKind);
  const headers = {
    accept: 'application/json',
    'Content-Type': 'application/json',
    'cache-control': 'no-cache, no-store',
    pragma: 'no-cache',
  };
  if (probeKind === WORKER_COUNT_SIGNED_PROBE_KIND) {
    if (typeof sharedSecret !== 'string' || sharedSecret.length < 32 || !Number.isSafeInteger(timestamp)) {
      throw workerCountFailure('TRIP_STORAGE_WORKER_COUNT_DESCRIPTOR_FAILURE', { probeKind });
    }
    const timestampText = String(timestamp);
    headers['X-RavRadar-Signature'] = await tripGatewaySignature({
      secret: sharedSecret,
      timestamp: timestampText,
      method: WORKER_COUNT_METHOD,
      pathname: WORKER_COUNT_PATH,
      bodyText: WORKER_COUNT_BODY,
    });
    headers['X-RavRadar-Timestamp'] = timestampText;
  }
  return {
    url: `${gatewayUrl}${WORKER_COUNT_PATH}`,
    init: {
      method: WORKER_COUNT_METHOD,
      headers,
      body: WORKER_COUNT_BODY,
      cache: 'no-store',
    },
  };
}

function validSignedWorkerCountBody(body) {
  const bodyKeys = body !== null && typeof body === 'object' && !Array.isArray(body)
    ? Object.keys(body).sort()
    : [];
  return body !== null
    && typeof body === 'object'
    && !Array.isArray(body)
    && bodyKeys.length === 2
    && bodyKeys[0] === 'ok'
    && bodyKeys[1] === 'trip_count'
    && body.ok === true
    && Number.isSafeInteger(body.trip_count)
    && body.trip_count >= 0;
}

export async function runWorkerCountReadProbe({
  gatewayUrl,
  sharedSecret = '',
  probeKind,
  fetchImpl = globalThis.fetch,
  fetchTimeoutMs = TRIP_STORAGE_NETWORK_TIMEOUT_MS,
  sleepImpl = sleep,
  nowFactory = () => Date.now(),
}) {
  assertWorkerCountProbeKind(probeKind);
  let normalizedGatewayUrl;
  try {
    normalizedGatewayUrl = normalizeCloudflareGatewayUrl(gatewayUrl);
  } catch {
    throw workerCountFailure('TRIP_STORAGE_WORKER_COUNT_DESCRIPTOR_FAILURE', { probeKind });
  }
  if (probeKind === WORKER_COUNT_SIGNED_PROBE_KIND
    && (typeof sharedSecret !== 'string' || sharedSecret.length < 32)) {
    throw workerCountFailure('TRIP_STORAGE_WORKER_COUNT_DESCRIPTOR_FAILURE', { probeKind });
  }

  let previousTimestamp = -1;
  for (let attempt = 1; attempt <= WORKER_COUNT_RETRY_DELAYS_MS.length; attempt += 1) {
    const delay = WORKER_COUNT_RETRY_DELAYS_MS[attempt - 1];
    if (delay > 0) {
      try {
        await sleepImpl(delay);
      } catch {
        throw workerCountFailure('TRIP_STORAGE_WORKER_COUNT_DESCRIPTOR_FAILURE', { attempts: attempt, probeKind });
      }
    }

    let timestamp = null;
    let descriptor;
    try {
      if (probeKind === WORKER_COUNT_SIGNED_PROBE_KIND) {
        timestamp = nextWorkerCountTimestamp(nowFactory, previousTimestamp);
        previousTimestamp = timestamp;
      }
      descriptor = await fixedWorkerCountRequestDescriptor({
        gatewayUrl: normalizedGatewayUrl,
        sharedSecret,
        probeKind,
        timestamp,
      });
    } catch {
      throw workerCountFailure('TRIP_STORAGE_WORKER_COUNT_DESCRIPTOR_FAILURE', { attempts: attempt, probeKind });
    }

    let response;
    try {
      response = await boundedFetch(descriptor.url, descriptor.init, { fetchImpl, timeoutMs: fetchTimeoutMs });
    } catch (error) {
      if (isTransientWorkerCountTransport(error)) {
        if (attempt < WORKER_COUNT_RETRY_DELAYS_MS.length) continue;
        throw workerCountFailure('TRIP_STORAGE_WORKER_COUNT_TRANSIENT_EXHAUSTED', { attempts: attempt, probeKind });
      }
      throw workerCountFailure('TRIP_STORAGE_WORKER_COUNT_TRANSPORT_FAILURE', { attempts: attempt, probeKind });
    }

    if (WORKER_COUNT_TRANSIENT_HTTP_STATUSES.includes(response.status)) {
      const status = response.status;
      await discardWorkerCountResponse(response);
      if (attempt < WORKER_COUNT_RETRY_DELAYS_MS.length) continue;
      throw workerCountFailure('TRIP_STORAGE_WORKER_COUNT_TRANSIENT_EXHAUSTED', {
        attempts: attempt,
        status,
        probeKind,
      });
    }

    if (probeKind === WORKER_COUNT_UNSIGNED_PROBE_KIND) {
      const status = response.status;
      await discardWorkerCountResponse(response);
      if (status !== 401) {
        throw workerCountFailure('TRIP_STORAGE_WORKER_COUNT_CONTRACT_MISMATCH', {
          attempts: attempt,
          status,
          probeKind,
        });
      }
      return { ok: true, attempts: attempt, status };
    }

    if (response.status !== 200) {
      const status = response.status;
      await discardWorkerCountResponse(response);
      throw workerCountFailure('TRIP_STORAGE_WORKER_COUNT_CONTRACT_MISMATCH', {
        attempts: attempt,
        status,
        probeKind,
      });
    }
    const body = await response.json().catch(() => null);
    if (!validSignedWorkerCountBody(body)) {
      throw workerCountFailure('TRIP_STORAGE_WORKER_COUNT_CONTRACT_MISMATCH', {
        attempts: attempt,
        status: response.status,
        probeKind,
      });
    }
    return { ok: true, attempts: attempt, status: response.status, tripCount: body.trip_count };
  }
  throw workerCountFailure('TRIP_STORAGE_WORKER_COUNT_TRANSIENT_EXHAUSTED', { probeKind });
}

async function main() {
  const gatewayUrl = normalizeCloudflareGatewayUrl(process.env.CLOUDFLARE_TRIP_GATEWAY_URL || '');
  const sharedSecret = process.env.TRIP_GATEWAY_SHARED_SECRET || '';
  if (sharedSecret.length < 32) throw new Error('Worker-verifikationens delte hemmelighed mangler.');

  const health = await waitForWorkerHealth({ gatewayUrl });
  if (!validHealth(health.response, health.body)) {
    throw new Error('Workerens offentlige, datasikre health-kontrakt fejlede efter afgrænset udbredelsesventetid.');
  }

  await runWorkerCountReadProbe({
    gatewayUrl,
    probeKind: WORKER_COUNT_UNSIGNED_PROBE_KIND,
  });
  const count = await runWorkerCountReadProbe({
    gatewayUrl,
    sharedSecret,
    probeKind: WORKER_COUNT_SIGNED_PROBE_KIND,
  });
  console.log(`Cloudflare-gatewayen er grøn: privat HMAC-grænse, 10 shards og ${count.tripCount} samlede poster.`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await main();
}
