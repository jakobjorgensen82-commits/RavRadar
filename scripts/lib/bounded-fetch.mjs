export const TRIP_STORAGE_NETWORK_TIMEOUT_MS = 15_000;
export const TRIP_STORAGE_NETWORK_TIMEOUT_CODE = 'TRIP_STORAGE_NETWORK_TIMEOUT';

function timeoutSignal(milliseconds) {
  if (!Number.isInteger(milliseconds) || milliseconds < 1) {
    throw new Error('TRIP_STORAGE_NETWORK_TIMEOUT_INVALID');
  }
  return AbortSignal.timeout(milliseconds);
}

function timeoutFailure(milliseconds, cause) {
  const error = new Error(`Trip-storage network request exceeded ${milliseconds} ms.`);
  error.code = TRIP_STORAGE_NETWORK_TIMEOUT_CODE;
  error.cause = cause;
  return error;
}

export async function boundedFetch(input, init = {}, {
  fetchImpl = globalThis.fetch,
  timeoutMs = TRIP_STORAGE_NETWORK_TIMEOUT_MS,
  timeoutSignalFactory = timeoutSignal,
} = {}) {
  if (typeof fetchImpl !== 'function') throw new Error('TRIP_STORAGE_FETCH_IMPLEMENTATION_INVALID');
  if (!Number.isInteger(timeoutMs) || timeoutMs < 1) {
    throw new Error('TRIP_STORAGE_NETWORK_TIMEOUT_INVALID');
  }
  const deadlineSignal = timeoutSignalFactory(timeoutMs);
  if (!deadlineSignal || typeof deadlineSignal.aborted !== 'boolean') {
    throw new Error('TRIP_STORAGE_NETWORK_TIMEOUT_SIGNAL_INVALID');
  }
  const callerSignal = init?.signal;
  const signal = callerSignal
    ? AbortSignal.any([callerSignal, deadlineSignal])
    : deadlineSignal;
  try {
    return await fetchImpl(input, { ...init, signal });
  } catch (error) {
    if (deadlineSignal.aborted && signal.reason === deadlineSignal.reason) {
      throw timeoutFailure(timeoutMs, error);
    }
    throw error;
  }
}

export function createBoundedFetch(options = {}) {
  return (input, init = {}) => boundedFetch(input, init, options);
}
