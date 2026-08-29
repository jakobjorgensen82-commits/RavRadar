import { boundedFetch } from './bounded-fetch.mjs';

export const TRIP_STORAGE_EDGE_CONTRACT_VERSION = '4.0.311';
export const TRIP_STORAGE_EDGE_FETCH_TIMEOUT_MS = 5_000;
export const TRIP_STORAGE_EDGE_FUNCTIONS = Object.freeze(['submit-observation', 'trip-log']);
export const TRIP_STORAGE_EDGE_RETRY_DELAYS_MS = Object.freeze([0, 1_000, 2_000, 3_000, 5_000, 8_000, 13_000, 21_000]);

function sleep(milliseconds) {
  return new Promise(resolve => setTimeout(resolve, milliseconds));
}

async function attestFunction({
  baseUrl,
  publishableKey,
  expectedStorageMode,
  functionName,
  fetchImpl,
  nonce,
  fetchTimeoutMs,
}) {
  const url = new URL(`${baseUrl}/functions/v1/${functionName}`);
  url.searchParams.set('_rr_trip_attestation', nonce);
  const response = await boundedFetch(url, {
    method: 'OPTIONS',
    headers: {
      apikey: publishableKey,
      authorization: `Bearer ${publishableKey}`,
      origin: 'https://ravradar.dk',
      'cache-control': 'no-cache, no-store',
      pragma: 'no-cache',
    },
    cache: 'no-store',
  }, { fetchImpl, timeoutMs: fetchTimeoutMs });
  return response.status === 204
    && response.headers.get('access-control-allow-origin') === 'https://ravradar.dk'
    && response.headers.get('x-ravradar-trip-contract-version') === TRIP_STORAGE_EDGE_CONTRACT_VERSION
    && response.headers.get('x-ravradar-trip-storage-mode') === expectedStorageMode;
}

export async function waitForTripStorageEdgeReadiness({
  baseUrl,
  publishableKey,
  expectedStorageMode,
  fetchImpl = globalThis.fetch,
  retryDelaysMs = TRIP_STORAGE_EDGE_RETRY_DELAYS_MS,
  nonceFactory = () => crypto.randomUUID(),
  requiredConsecutiveSuccesses = 2,
  fetchTimeoutMs = TRIP_STORAGE_EDGE_FETCH_TIMEOUT_MS,
}) {
  if (!['d1', 'supabase', 'maintenance'].includes(expectedStorageMode)) throw new Error('TRIP_STORAGE_EDGE_MODE_INVALID');
  if (!Number.isInteger(requiredConsecutiveSuccesses) || requiredConsecutiveSuccesses < 1) {
    throw new Error('TRIP_STORAGE_EDGE_CONSECUTIVE_SUCCESSES_INVALID');
  }
  let attempts = 0;
  let consecutiveSuccesses = 0;
  let functionStatus = Object.fromEntries(TRIP_STORAGE_EDGE_FUNCTIONS.map(name => [name, false]));
  for (const delay of retryDelaysMs) {
    if (delay > 0) await sleep(delay);
    attempts += 1;
    const nonce = `${nonceFactory()}-${attempts}`;
    try {
      const results = await Promise.all(TRIP_STORAGE_EDGE_FUNCTIONS.map(async functionName => [
        functionName,
        await attestFunction({
          baseUrl,
          publishableKey,
          expectedStorageMode,
          functionName,
          fetchImpl,
          nonce,
          fetchTimeoutMs,
        }),
      ]));
      functionStatus = Object.fromEntries(results);
      if (Object.values(functionStatus).every(Boolean)) {
        consecutiveSuccesses += 1;
        if (consecutiveSuccesses >= requiredConsecutiveSuccesses) {
          return { ok: true, attempts, consecutiveSuccesses, functionStatus };
        }
      } else {
        consecutiveSuccesses = 0;
      }
    } catch {
      consecutiveSuccesses = 0;
      functionStatus = Object.fromEntries(TRIP_STORAGE_EDGE_FUNCTIONS.map(name => [name, false]));
    }
  }
  return { ok: false, attempts, consecutiveSuccesses, functionStatus };
}
