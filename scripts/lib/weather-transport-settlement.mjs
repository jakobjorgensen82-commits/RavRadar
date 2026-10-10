// A failed transport teardown is not a provider miss. Keep the actual resource
// reachable for this process and brand its stop error by object identity only.
// This is a refusal, never a receipt that a request or writer has stopped.
const unresolved = new Set();
const stopErrors = new WeakSet();

export function isWeatherTransportStopUnproved(error) {
  return stopErrors.has(error);
}

export function assertWeatherTransportSettlement() {
  const first = unresolved.values().next();
  if (!first.done) throw first.value.error;
}

export function throwWeatherTransportStopUnproved(resource, firstFailure) {
  const error = firstFailure instanceof Error ? firstFailure
    : new Error('WEATHER_TRANSPORT_STOP_UNPROVED', { cause: firstFailure });
  // Retain response/reader/controller/cancellation objects themselves; no
  // serialized token, result code or caller-supplied closure flag can clear it.
  unresolved.add({ resource, error });
  stopErrors.add(error);
  throw error;
}
