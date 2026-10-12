import {
  boundedFetch,
  TRIP_STORAGE_NETWORK_TIMEOUT_CODE,
} from './bounded-fetch.mjs';
import {
  TRIP_STORAGE_CONTRACT_PROBE_HEADER,
  TRIP_STORAGE_SIGNED_LOGIN_METHOD,
  TRIP_STORAGE_SIGNED_LOGIN_PROBE_KIND,
  TRIP_STORAGE_SIGNED_LOGIN_PROBE_VALUE,
  TRIP_STORAGE_SIGNED_LOGIN_SIGNATURE_PATH,
} from '../../supabase/functions/_shared/trip-storage-contract-probe.js';
import { tripGatewaySignature } from '../../supabase/functions/_shared/trip-storage.js';

export const TRIP_STORAGE_EDGE_CONTRACT_VERSION = '4.0.311';
export const TRIP_STORAGE_EDGE_FETCH_TIMEOUT_MS = 5_000;
export const TRIP_STORAGE_EDGE_FUNCTIONS = Object.freeze(['submit-observation', 'trip-log']);
export const TRIP_STORAGE_EDGE_RETRY_DELAYS_MS = Object.freeze([0, 1_000, 2_000, 3_000, 5_000, 8_000, 13_000, 21_000]);
export const TRIP_STORAGE_EDGE_NO_WRITE_RETRY_DELAYS_MS = Object.freeze([0, 250, 750]);
export const TRIP_STORAGE_EDGE_TRANSIENT_HTTP_STATUSES = Object.freeze([429, 502, 503, 504]);
export const TRIP_STORAGE_EDGE_PREFLIGHT_PROBE_KIND = 'edge-preflight';
export const TRIP_STORAGE_EDGE_SIGNED_LOGIN_PROBE_KIND = TRIP_STORAGE_SIGNED_LOGIN_PROBE_KIND;

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

function validateNoWriteRetryDelays(retryDelaysMs) {
  if (!Array.isArray(retryDelaysMs)
    || retryDelaysMs.length < 1
    || retryDelaysMs.length > TRIP_STORAGE_EDGE_NO_WRITE_RETRY_DELAYS_MS.length
    || retryDelaysMs[0] !== 0) {
    throw new Error('TRIP_STORAGE_EDGE_NO_WRITE_RETRY_DELAYS_INVALID');
  }
  let previousDelay = -1;
  for (const delay of retryDelaysMs) {
    if (!Number.isInteger(delay) || delay < 0 || delay > 1_000 || delay < previousDelay) {
      throw new Error('TRIP_STORAGE_EDGE_NO_WRITE_RETRY_DELAYS_INVALID');
    }
    previousDelay = delay;
  }
}

function assertRetrySafeDescriptor(functionName, probeKind) {
  const retrySafe = probeKind === TRIP_STORAGE_EDGE_PREFLIGHT_PROBE_KIND
    ? TRIP_STORAGE_EDGE_FUNCTIONS.includes(functionName)
    : probeKind === TRIP_STORAGE_EDGE_SIGNED_LOGIN_PROBE_KIND && functionName === 'trip-log';
  if (!retrySafe) {
    const error = new Error('TRIP_STORAGE_EDGE_WRITE_CAPABLE_RETRY_FORBIDDEN');
    error.code = 'TRIP_STORAGE_EDGE_WRITE_CAPABLE_RETRY_FORBIDDEN';
    throw error;
  }
}

async function noWriteRequestDescriptor({
  baseUrl,
  publishableKey,
  sharedSecret,
  functionName,
  origin,
  probeKind,
  nonceFactory,
  nowFactory,
  attempt,
}) {
  const url = new URL(`${String(baseUrl || '').replace(/\/$/, '')}/functions/v1/${functionName}`);
  const headers = {
    apikey: publishableKey,
    authorization: `Bearer ${publishableKey}`,
    origin,
  };
  if (probeKind === TRIP_STORAGE_EDGE_PREFLIGHT_PROBE_KIND) {
    url.searchParams.set('_rr_trip_attestation', `${nonceFactory()}-${attempt}`);
    return {
      input: url,
      init: {
        method: 'OPTIONS',
        headers: { ...headers, 'cache-control': 'no-cache, no-store', pragma: 'no-cache' },
        cache: 'no-store',
      },
    };
  }
  url.searchParams.set('_rr_trip_attestation', `${nonceFactory()}-${attempt}`);
  const timestamp = String(nowFactory());
  const signature = await tripGatewaySignature({
    secret: sharedSecret,
    timestamp,
    method: TRIP_STORAGE_SIGNED_LOGIN_METHOD,
    pathname: TRIP_STORAGE_SIGNED_LOGIN_SIGNATURE_PATH,
    bodyText: '',
  });
  return {
    input: url,
    init: {
      method: TRIP_STORAGE_SIGNED_LOGIN_METHOD,
      headers: {
        ...headers,
        [TRIP_STORAGE_CONTRACT_PROBE_HEADER]: TRIP_STORAGE_SIGNED_LOGIN_PROBE_VALUE,
        'X-RavRadar-Signature': signature,
        'X-RavRadar-Timestamp': timestamp,
        'cache-control': 'no-cache, no-store',
        pragma: 'no-cache',
      },
      cache: 'no-store',
    },
  };
}

function isTransientTransportFailure(error) {
  return error?.code === TRIP_STORAGE_NETWORK_TIMEOUT_CODE || error instanceof TypeError;
}

async function discardResponseBody(response) {
  try {
    await response?.body?.cancel();
  } catch {
    // A discarded transient gateway body must never influence or leak into verification output.
  }
}

function noWriteProbeFailure(code, { probeName, attempts, status = null }) {
  const statusSuffix = Number.isInteger(status) ? `, status=${status}` : '';
  const error = new Error(`${code}: ${probeName}, attempts=${attempts}${statusSuffix}`);
  error.code = code;
  error.attempts = attempts;
  if (Number.isInteger(status)) error.status = status;
  return error;
}

export async function runTripStorageNoWriteContractProbe({
  baseUrl,
  publishableKey,
  sharedSecret = '',
  functionName,
  origin,
  probeKind,
  probeName,
  assertContract,
  fetchImpl = globalThis.fetch,
  fetchTimeoutMs = TRIP_STORAGE_EDGE_FETCH_TIMEOUT_MS,
  retryDelaysMs = TRIP_STORAGE_EDGE_NO_WRITE_RETRY_DELAYS_MS,
  sleepImpl = sleep,
  nonceFactory = () => crypto.randomUUID(),
  nowFactory = () => Date.now(),
}) {
  assertRetrySafeDescriptor(functionName, probeKind);
  if (typeof probeName !== 'string' || !/^[a-z0-9-]{1,80}$/.test(probeName)) {
    throw new Error('TRIP_STORAGE_EDGE_NO_WRITE_PROBE_NAME_INVALID');
  }
  const secretValid = probeKind !== TRIP_STORAGE_EDGE_SIGNED_LOGIN_PROBE_KIND
    || (typeof sharedSecret === 'string' && sharedSecret.length >= 32);
  if (typeof baseUrl !== 'string' || !baseUrl || typeof publishableKey !== 'string' || !publishableKey
    || !secretValid || typeof origin !== 'string' || !origin || typeof assertContract !== 'function'
    || typeof fetchImpl !== 'function' || typeof sleepImpl !== 'function'
    || typeof nonceFactory !== 'function' || typeof nowFactory !== 'function') {
    throw new Error('TRIP_STORAGE_EDGE_NO_WRITE_PROBE_IMPLEMENTATION_INVALID');
  }
  validateNoWriteRetryDelays(retryDelaysMs);

  let attempts = 0;
  for (const delay of retryDelaysMs) {
    if (delay > 0) await sleepImpl(delay);
    attempts += 1;
    let descriptor;
    try {
      descriptor = await noWriteRequestDescriptor({
        baseUrl,
        publishableKey,
        sharedSecret,
        functionName,
        origin,
        probeKind,
        nonceFactory,
        nowFactory,
        attempt: attempts,
      });
    } catch {
      throw noWriteProbeFailure('TRIP_STORAGE_EDGE_NO_WRITE_DESCRIPTOR_FAILURE', { probeName, attempts });
    }
    let response;
    try {
      response = await boundedFetch(descriptor.input, descriptor.init, {
        fetchImpl,
        timeoutMs: fetchTimeoutMs,
      });
    } catch (error) {
      if (!isTransientTransportFailure(error)) {
        throw noWriteProbeFailure('TRIP_STORAGE_EDGE_NO_WRITE_TRANSPORT_FAILURE', { probeName, attempts });
      }
      if (attempts === retryDelaysMs.length) {
        throw noWriteProbeFailure('TRIP_STORAGE_EDGE_NO_WRITE_TRANSIENT_EXHAUSTED', { probeName, attempts });
      }
      continue;
    }

    const status = Number(response?.status);
    if (TRIP_STORAGE_EDGE_TRANSIENT_HTTP_STATUSES.includes(status)) {
      await discardResponseBody(response);
      if (attempts === retryDelaysMs.length) {
        throw noWriteProbeFailure('TRIP_STORAGE_EDGE_NO_WRITE_TRANSIENT_EXHAUSTED', {
          probeName,
          attempts,
          status,
        });
      }
      continue;
    }

    try {
      if (await assertContract(response) !== true) throw new Error('CONTRACT_FALSE');
    } catch {
      throw noWriteProbeFailure('TRIP_STORAGE_EDGE_NO_WRITE_CONTRACT_MISMATCH', {
        probeName,
        attempts,
        status,
      });
    }
    return { ok: true, attempts, status };
  }
  throw noWriteProbeFailure('TRIP_STORAGE_EDGE_NO_WRITE_TRANSIENT_EXHAUSTED', { probeName, attempts });
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
