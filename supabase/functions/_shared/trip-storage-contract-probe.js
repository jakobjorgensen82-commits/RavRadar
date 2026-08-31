export const TRIP_STORAGE_CONTRACT_PROBE_HEADER = 'x-ravradar-trip-contract-probe';
export const TRIP_STORAGE_SIGNED_LOGIN_PROBE_VALUE = 'signed-login-response-v1';
export const TRIP_STORAGE_SIGNED_LOGIN_PROBE_KIND = 'trip-log-signed-login-response';
export const TRIP_STORAGE_SIGNED_LOGIN_SIGNATURE_PATH = '/functions/v1/trip-log:signed-login-response-v1';
export const TRIP_STORAGE_SIGNED_LOGIN_METHOD = 'GET';
export const TRIP_STORAGE_LOGIN_REQUIRED_CODE = 'LOGIN_REQUIRED';

const NO_PROBE = Object.freeze({ kind: 'none' });
const INVALID_PROBE = Object.freeze({ kind: 'invalid' });
const SIGNED_LOGIN_RESPONSE_BODY = Object.freeze({ error: TRIP_STORAGE_LOGIN_REQUIRED_CODE });
const SIGNED_LOGIN_PROBE = Object.freeze({
  kind: TRIP_STORAGE_SIGNED_LOGIN_PROBE_KIND,
  status: 401,
  body: SIGNED_LOGIN_RESPONSE_BODY,
});

export function classifyTripStorageContractProbe({ method, headerValue, hasBody = false }) {
  if (headerValue === null || headerValue === undefined) return NO_PROBE;
  if (headerValue !== TRIP_STORAGE_SIGNED_LOGIN_PROBE_VALUE
    || String(method || '').toUpperCase() !== TRIP_STORAGE_SIGNED_LOGIN_METHOD
    || hasBody !== false) {
    return INVALID_PROBE;
  }
  return SIGNED_LOGIN_PROBE;
}
