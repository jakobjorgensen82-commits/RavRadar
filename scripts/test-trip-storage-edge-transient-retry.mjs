import assert from 'node:assert/strict';
import fs from 'node:fs';
import { TRIP_STORAGE_NETWORK_TIMEOUT_CODE } from './lib/bounded-fetch.mjs';
import {
  TRIP_STORAGE_EDGE_SIGNED_LOGIN_PROBE_KIND,
  TRIP_STORAGE_EDGE_NO_WRITE_RETRY_DELAYS_MS,
  TRIP_STORAGE_EDGE_PREFLIGHT_PROBE_KIND,
  runTripStorageNoWriteContractProbe,
} from './lib/trip-storage-edge-readiness.mjs';
import {
  WORKER_COUNT_RETRY_DELAYS_MS,
  WORKER_COUNT_SIGNED_PROBE_KIND,
  WORKER_COUNT_TRANSIENT_HTTP_STATUSES,
  WORKER_COUNT_UNSIGNED_PROBE_KIND,
  runWorkerCountReadProbe,
} from './verify-cloudflare-trip-gateway.mjs';
import {
  classifyTripStorageContractProbe,
  TRIP_STORAGE_CONTRACT_PROBE_HEADER,
  TRIP_STORAGE_SIGNED_LOGIN_METHOD,
  TRIP_STORAGE_SIGNED_LOGIN_PROBE_KIND,
  TRIP_STORAGE_SIGNED_LOGIN_PROBE_VALUE,
  TRIP_STORAGE_SIGNED_LOGIN_SIGNATURE_PATH,
} from '../supabase/functions/_shared/trip-storage-contract-probe.js';
import { verifyTripGatewaySignature } from '../supabase/functions/_shared/trip-storage.js';

const baseUrl = 'https://trip-edge-test.example';
const publishableKey = 'synthetic-public-test-key';
const sharedSecret = 'synthetic-private-probe-secret-at-least-32-characters';
const origin = 'https://ravradar.dk';
const fixedNow = 1_788_123_456_789;
const zeroDelays = [0, 0, 0];
const noSleep = async () => {};

const tripLogSource = fs.readFileSync('supabase/functions/trip-log/index.ts', 'utf8');
const publicGatewaySource = fs.readFileSync('supabase/functions/_shared/public-gateway.ts', 'utf8');
const probeBranchIndex = tripLogSource.indexOf('const contractProbeHeader');
const normalJsonIndex = tripLogSource.indexOf('const payload = await readJsonObject');
const rateLimitIndex = tripLogSource.indexOf('await enforceRateLimits');
const authIndex = tripLogSource.indexOf('await requireAuthenticatedUserId');
const storageIndex = tripLogSource.indexOf('await listOwnTripObservations');
assert.ok(probeBranchIndex >= 0
  && probeBranchIndex < normalJsonIndex
  && normalJsonIndex < rateLimitIndex
  && rateLimitIndex < authIndex
  && authIndex < storageIndex);
const signedProbeBranch = tripLogSource.slice(probeBranchIndex, rateLimitIndex);
assert.match(signedProbeBranch, /verifyTripGatewaySignature/);
assert.match(signedProbeBranch, /tripStorageReadinessHeaders/);
assert.doesNotMatch(
  signedProbeBranch,
  /enforceRateLimits|requireAuthenticatedUserId|listOwnTripObservations|consume_public_request_limit/,
);
assert.match(publicGatewaySource, /consume_public_request_limit/);
assert.match(publicGatewaySource, /throw new GatewayError\(401, TRIP_STORAGE_LOGIN_REQUIRED_CODE\)/);
assert.match(publicGatewaySource, /request\.method !== "POST"[\s\S]*GatewayError\(405, "METHOD_NOT_ALLOWED"\)/);

function response(status, body = null, headers = {}) {
  return new Response(body, { status, headers });
}

function signedLoginResponse(body = { error: 'LOGIN_REQUIRED' }, headers = {}) {
  return response(401, JSON.stringify(body), {
    'content-type': 'application/json',
    'x-ravradar-trip-contract-version': '4.0.311',
    'x-ravradar-trip-storage-mode': 'd1',
    ...headers,
  });
}

function sequenceFetch(sequence) {
  const calls = [];
  return {
    calls,
    fetchImpl: async (input, init = {}) => {
      calls.push({ input: String(input), init });
      const item = sequence[Math.min(calls.length - 1, sequence.length - 1)];
      if (item instanceof Error) throw item;
      return item;
    },
  };
}

async function signedLoginResponseContract(value) {
  if (value.status !== 401
    || value.headers.get('x-ravradar-trip-contract-version') !== '4.0.311'
    || value.headers.get('x-ravradar-trip-storage-mode') !== 'd1') return false;
  const body = await value.json().catch(() => null);
  return body?.error === 'LOGIN_REQUIRED' && Object.keys(body).length === 1;
}

async function runSignedLoginResponseProbe(fetchImpl, overrides = {}) {
  return runTripStorageNoWriteContractProbe({
    baseUrl,
    publishableKey,
    sharedSecret,
    functionName: 'trip-log',
    origin,
    probeKind: TRIP_STORAGE_EDGE_SIGNED_LOGIN_PROBE_KIND,
    probeName: 'test-trip-log-signed-login-response',
    assertContract: signedLoginResponseContract,
    fetchImpl,
    nonceFactory: () => 'fixed-signed-nonce',
    nowFactory: () => fixedNow,
    retryDelaysMs: zeroDelays,
    sleepImpl: noSleep,
    ...overrides,
  });
}

async function runPreflightProbe(fetchImpl, overrides = {}) {
  return runTripStorageNoWriteContractProbe({
    baseUrl,
    publishableKey,
    functionName: 'submit-observation',
    origin,
    probeKind: TRIP_STORAGE_EDGE_PREFLIGHT_PROBE_KIND,
    probeName: 'test-submit-preflight',
    assertContract: value => value.status === 204,
    fetchImpl,
    nonceFactory: () => 'fixed-nonce',
    retryDelaysMs: zeroDelays,
    sleepImpl: noSleep,
    ...overrides,
  });
}

assert.equal(TRIP_STORAGE_EDGE_SIGNED_LOGIN_PROBE_KIND, TRIP_STORAGE_SIGNED_LOGIN_PROBE_KIND);
assert.deepEqual(TRIP_STORAGE_EDGE_NO_WRITE_RETRY_DELAYS_MS, [0, 250, 750]);
assert.deepEqual(classifyTripStorageContractProbe({
  method: TRIP_STORAGE_SIGNED_LOGIN_METHOD,
  headerValue: TRIP_STORAGE_SIGNED_LOGIN_PROBE_VALUE,
}), { kind: TRIP_STORAGE_SIGNED_LOGIN_PROBE_KIND, status: 401, body: { error: 'LOGIN_REQUIRED' } });
assert.deepEqual(classifyTripStorageContractProbe({ method: 'GET', headerValue: null }), { kind: 'none' });
for (const invalidDescriptor of [
  { method: 'POST', headerValue: TRIP_STORAGE_SIGNED_LOGIN_PROBE_VALUE },
  { method: 'GET', headerValue: 'wrong-probe' },
  { method: 'GET', headerValue: TRIP_STORAGE_SIGNED_LOGIN_PROBE_VALUE, hasBody: true },
]) assert.deepEqual(classifyTripStorageContractProbe(invalidDescriptor), { kind: 'invalid' });

const unusedFetch = sequenceFetch([signedLoginResponse()]);
for (const invalidDelays of [[0, 0, 0, 0], [0, 1_001], [0, 2, 1]]) {
  await assert.rejects(
    runSignedLoginResponseProbe(unusedFetch.fetchImpl, { retryDelaysMs: invalidDelays }),
    /TRIP_STORAGE_EDGE_NO_WRITE_RETRY_DELAYS_INVALID/,
  );
}
assert.equal(unusedFetch.calls.length, 0);

await assert.rejects(
  runSignedLoginResponseProbe(unusedFetch.fetchImpl, { baseUrl: 'not-a-valid-url' }),
  error => error?.code === 'TRIP_STORAGE_EDGE_NO_WRITE_DESCRIPTOR_FAILURE'
    && error?.attempts === 1
    && !String(error?.stack).includes('not-a-valid-url'),
);
assert.equal(unusedFetch.calls.length, 0);

const recovers = sequenceFetch([
  response(503, 'discard-me'),
  signedLoginResponse(),
]);
assert.deepEqual(await runSignedLoginResponseProbe(recovers.fetchImpl), { ok: true, attempts: 2, status: 401 });
assert.equal(recovers.calls.length, 2);
for (const [index, call] of recovers.calls.entries()) {
  const headers = new Headers(call.init.headers);
  const parsedUrl = new URL(call.input);
  assert.equal(parsedUrl.pathname, '/functions/v1/trip-log');
  assert.equal(parsedUrl.searchParams.get('_rr_trip_attestation'), `fixed-signed-nonce-${index + 1}`);
  assert.equal(call.init.method, TRIP_STORAGE_SIGNED_LOGIN_METHOD);
  assert.equal('body' in call.init, false);
  assert.equal(call.init.cache, 'no-store');
  assert.equal(headers.get(TRIP_STORAGE_CONTRACT_PROBE_HEADER), TRIP_STORAGE_SIGNED_LOGIN_PROBE_VALUE);
  assert.equal(headers.get('x-ravradar-timestamp'), String(fixedNow));
  assert.equal(headers.get('cache-control'), 'no-cache, no-store');
  assert.equal(headers.get('pragma'), 'no-cache');
  assert.equal(await verifyTripGatewaySignature({
    secret: sharedSecret,
    timestamp: headers.get('x-ravradar-timestamp'),
    signature: headers.get('x-ravradar-signature'),
    method: call.init.method,
    pathname: TRIP_STORAGE_SIGNED_LOGIN_SIGNATURE_PATH,
    bodyText: '',
    now: fixedNow,
  }), true);
}

const exhausted = sequenceFetch([response(503, 'never-log-this-private-body')]);
await assert.rejects(
  runSignedLoginResponseProbe(exhausted.fetchImpl),
  error => error?.code === 'TRIP_STORAGE_EDGE_NO_WRITE_TRANSIENT_EXHAUSTED'
    && error?.attempts === 3
    && error?.status === 503
    && !String(error?.stack).includes('never-log-this-private-body'),
);
assert.equal(exhausted.calls.length, 3);

const observedDelays = [];
const defaultDelayExhaustion = sequenceFetch([response(503, 'discarded')]);
await assert.rejects(runSignedLoginResponseProbe(defaultDelayExhaustion.fetchImpl, {
  retryDelaysMs: TRIP_STORAGE_EDGE_NO_WRITE_RETRY_DELAYS_MS,
  sleepImpl: async delay => observedDelays.push(delay),
}));
assert.deepEqual(observedDelays, [250, 750]);
assert.equal(defaultDelayExhaustion.calls.length, 3);

for (const transientStatus of [429, 502, 504]) {
  const transientThenGood = sequenceFetch([response(transientStatus, 'discarded-gateway-body'), response(204)]);
  const result = await runPreflightProbe(transientThenGood.fetchImpl);
  assert.deepEqual(result, { ok: true, attempts: 2, status: 204 });
  assert.equal(transientThenGood.calls.length, 2);
  for (const [index, call] of transientThenGood.calls.entries()) {
    assert.equal(call.init.method, 'OPTIONS');
    assert.equal('body' in call.init, false);
    assert.equal(new URL(call.input).searchParams.get('_rr_trip_attestation'), `fixed-nonce-${index + 1}`);
  }
}

for (const wrongResponse of [
  response(405, 'old-edge-method-gate'),
  response(500, 'nontransient-status'),
  signedLoginResponse({ error: 'WRONG_PRIVATE_BODY' }),
  signedLoginResponse({ error: 'LOGIN_REQUIRED', extra: 'PRIVATE_EXTRA' }),
  signedLoginResponse({ error: 'LOGIN_REQUIRED' }, { 'x-ravradar-trip-storage-mode': 'wrong' }),
]) {
  const wrong = sequenceFetch([wrongResponse, signedLoginResponse()]);
  await assert.rejects(
    runSignedLoginResponseProbe(wrong.fetchImpl),
    error => error?.code === 'TRIP_STORAGE_EDGE_NO_WRITE_CONTRACT_MISMATCH'
      && error?.attempts === 1
      && !String(error?.stack).includes('WRONG_PRIVATE_BODY')
      && !String(error?.stack).includes('PRIVATE_EXTRA'),
  );
  assert.equal(wrong.calls.length, 1);
}

const wrongHeader = sequenceFetch([
  response(204, null, { 'x-ravradar-trip-contract-version': 'wrong' }),
  response(204, null, { 'x-ravradar-trip-contract-version': '4.0.311' }),
]);
await assert.rejects(
  runPreflightProbe(wrongHeader.fetchImpl, {
    functionName: 'trip-log',
    probeName: 'test-preflight-header',
    assertContract: value => value.status === 204
      && value.headers.get('x-ravradar-trip-contract-version') === '4.0.311',
  }),
  error => error?.code === 'TRIP_STORAGE_EDGE_NO_WRITE_CONTRACT_MISMATCH' && error?.attempts === 1,
);
assert.equal(wrongHeader.calls.length, 1);

for (const transientTransport of [
  Object.assign(new Error('PRIVATE_TIMEOUT_DETAIL'), { code: TRIP_STORAGE_NETWORK_TIMEOUT_CODE }),
  new TypeError('PRIVATE_DNS_DETAIL'),
]) {
  const transportThenGood = sequenceFetch([transientTransport, signedLoginResponse()]);
  const result = await runSignedLoginResponseProbe(transportThenGood.fetchImpl);
  assert.equal(result.attempts, 2);
  assert.equal(transportThenGood.calls.length, 2);
}

const persistentTransport = sequenceFetch([new TypeError('PRIVATE_CONNECTION_DETAIL')]);
await assert.rejects(
  runSignedLoginResponseProbe(persistentTransport.fetchImpl),
  error => error?.code === 'TRIP_STORAGE_EDGE_NO_WRITE_TRANSIENT_EXHAUSTED'
    && error?.attempts === 3
    && !String(error?.stack).includes('PRIVATE_CONNECTION_DETAIL'),
);
assert.equal(persistentTransport.calls.length, 3);

const nontransientTransport = sequenceFetch([new Error('PRIVATE_PROGRAMMING_DETAIL')]);
await assert.rejects(
  runSignedLoginResponseProbe(nontransientTransport.fetchImpl),
  error => error?.code === 'TRIP_STORAGE_EDGE_NO_WRITE_TRANSPORT_FAILURE'
    && error?.attempts === 1
    && !String(error?.stack).includes('PRIVATE_PROGRAMMING_DETAIL'),
);
assert.equal(nontransientTransport.calls.length, 1);

const forbiddenFetch = sequenceFetch([response(400)]);
await assert.rejects(
  runSignedLoginResponseProbe(forbiddenFetch.fetchImpl, { functionName: 'submit-observation' }),
  error => error?.code === 'TRIP_STORAGE_EDGE_WRITE_CAPABLE_RETRY_FORBIDDEN',
);
await assert.rejects(
  runSignedLoginResponseProbe(forbiddenFetch.fetchImpl, { probeKind: 'unknown-probe-kind' }),
  error => error?.code === 'TRIP_STORAGE_EDGE_WRITE_CAPABLE_RETRY_FORBIDDEN',
);
await assert.rejects(
  runSignedLoginResponseProbe(forbiddenFetch.fetchImpl, { sharedSecret: '' }),
  /TRIP_STORAGE_EDGE_NO_WRITE_PROBE_IMPLEMENTATION_INVALID/,
);
assert.equal(forbiddenFetch.calls.length, 0);

const capturedConsole = [];
const originalConsole = { log: console.log, warn: console.warn, error: console.error };
try {
  for (const level of Object.keys(originalConsole)) console[level] = (...args) => capturedConsole.push([level, ...args]);
  const privateBody = sequenceFetch([response(503, 'PRIVATE_RESPONSE_MARKER')]);
  await assert.rejects(runSignedLoginResponseProbe(privateBody.fetchImpl));
} finally {
  Object.assign(console, originalConsole);
}
assert.deepEqual(capturedConsole, []);

const workerGatewayUrl = 'https://trip-count-contract-test.workers.dev';
const workerVerifierSource = fs.readFileSync('scripts/verify-cloudflare-trip-gateway.mjs', 'utf8');
const workerProbeParameters = workerVerifierSource.match(
  /export async function runWorkerCountReadProbe\(\{([\s\S]*?)\}\) \{/,
)?.[1] || '';
assert.match(workerVerifierSource, /const WORKER_COUNT_METHOD = 'POST'/);
assert.match(workerVerifierSource, /const WORKER_COUNT_PATH = '\/v1\/trips\/count'/);
assert.match(workerVerifierSource, /const WORKER_COUNT_BODY = '\{\}'/);
assert.doesNotMatch(workerProbeParameters, /\b(?:route|path|body|request|descriptorFactory|requestFactory)\b/);
assert.deepEqual(WORKER_COUNT_RETRY_DELAYS_MS, [0, 250, 750]);
assert.deepEqual(WORKER_COUNT_TRANSIENT_HTTP_STATUSES, [429, 502, 503, 504]);

function workerCountSuccess(tripCount = 7) {
  return response(200, JSON.stringify({ ok: true, trip_count: tripCount }), { 'content-type': 'application/json' });
}

async function runUnsignedWorkerCount(fetchImpl, overrides = {}) {
  return runWorkerCountReadProbe({
    gatewayUrl: workerGatewayUrl,
    probeKind: WORKER_COUNT_UNSIGNED_PROBE_KIND,
    fetchImpl,
    sleepImpl: noSleep,
    ...overrides,
  });
}

async function runSignedWorkerCount(fetchImpl, overrides = {}) {
  return runWorkerCountReadProbe({
    gatewayUrl: workerGatewayUrl,
    sharedSecret,
    probeKind: WORKER_COUNT_SIGNED_PROBE_KIND,
    fetchImpl,
    sleepImpl: noSleep,
    nowFactory: () => fixedNow,
    ...overrides,
  });
}

const invalidWorkerDescriptorFetch = sequenceFetch([response(401)]);
for (const invocation of [
  () => runWorkerCountReadProbe({
    gatewayUrl: 'not-a-worker-url',
    probeKind: WORKER_COUNT_UNSIGNED_PROBE_KIND,
    fetchImpl: invalidWorkerDescriptorFetch.fetchImpl,
  }),
  () => runWorkerCountReadProbe({
    gatewayUrl: workerGatewayUrl,
    probeKind: 'arbitrary-route-probe',
    fetchImpl: invalidWorkerDescriptorFetch.fetchImpl,
  }),
  () => runWorkerCountReadProbe({
    gatewayUrl: workerGatewayUrl,
    probeKind: WORKER_COUNT_SIGNED_PROBE_KIND,
    sharedSecret: '',
    fetchImpl: invalidWorkerDescriptorFetch.fetchImpl,
  }),
  () => runSignedWorkerCount(invalidWorkerDescriptorFetch.fetchImpl, { nowFactory: () => Number.NaN }),
]) {
  await assert.rejects(
    invocation(),
    error => String(error?.code || '').startsWith('TRIP_STORAGE_WORKER_COUNT_')
      && error?.attempts === 1
      && !String(error?.stack).includes('not-a-worker-url')
      && !String(error?.stack).includes('arbitrary-route-probe'),
  );
}
assert.equal(invalidWorkerDescriptorFetch.calls.length, 0);

const unsignedRecovers = sequenceFetch([
  response(503, 'PRIVATE_UNSIGNED_TRANSIENT_BODY'),
  response(401, 'PRIVATE_UNSIGNED_AUTH_BODY'),
]);
const unsignedDelays = [];
assert.deepEqual(await runUnsignedWorkerCount(unsignedRecovers.fetchImpl, {
  sleepImpl: async delay => unsignedDelays.push(delay),
}), { ok: true, attempts: 2, status: 401 });
assert.deepEqual(unsignedDelays, [250]);
assert.equal(unsignedRecovers.calls.length, 2);
for (const call of unsignedRecovers.calls) {
  const url = new URL(call.input);
  const headers = new Headers(call.init.headers);
  assert.equal(url.origin, workerGatewayUrl);
  assert.equal(url.pathname, '/v1/trips/count');
  assert.equal(url.search, '');
  assert.equal(call.init.method, 'POST');
  assert.equal(call.init.body, '{}');
  assert.equal(call.init.cache, 'no-store');
  assert.equal(headers.get('content-type'), 'application/json');
  assert.equal(headers.get('cache-control'), 'no-cache, no-store');
  assert.equal(headers.get('pragma'), 'no-cache');
  assert.equal(headers.has('x-ravradar-signature'), false);
  assert.equal(headers.has('x-ravradar-timestamp'), false);
}

for (const transientStatus of [429, 502, 504]) {
  const transientThenUnauthorized = sequenceFetch([
    response(transientStatus, 'PRIVATE_TRANSIENT_BODY'),
    response(401),
  ]);
  assert.deepEqual(await runUnsignedWorkerCount(transientThenUnauthorized.fetchImpl), {
    ok: true,
    attempts: 2,
    status: 401,
  });
  assert.equal(transientThenUnauthorized.calls.length, 2);
}

const signedRecovers = sequenceFetch([
  response(503, 'PRIVATE_SIGNED_TRANSIENT_BODY'),
  workerCountSuccess(9),
]);
const signedDelays = [];
assert.deepEqual(await runSignedWorkerCount(signedRecovers.fetchImpl, {
  sleepImpl: async delay => signedDelays.push(delay),
}), { ok: true, attempts: 2, status: 200, tripCount: 9 });
assert.deepEqual(signedDelays, [250]);
const signedTimestamps = signedRecovers.calls.map(call => new Headers(call.init.headers).get('x-ravradar-timestamp'));
const signedSignatures = signedRecovers.calls.map(call => new Headers(call.init.headers).get('x-ravradar-signature'));
assert.deepEqual(signedTimestamps, [String(fixedNow), String(fixedNow + 1)]);
assert.notEqual(signedSignatures[0], signedSignatures[1]);
for (const [index, call] of signedRecovers.calls.entries()) {
  const headers = new Headers(call.init.headers);
  assert.equal(call.init.method, 'POST');
  assert.equal(call.init.body, '{}');
  assert.equal(new URL(call.input).pathname, '/v1/trips/count');
  assert.equal(await verifyTripGatewaySignature({
    secret: sharedSecret,
    timestamp: headers.get('x-ravradar-timestamp'),
    signature: headers.get('x-ravradar-signature'),
    method: 'POST',
    pathname: '/v1/trips/count',
    bodyText: '{}',
    now: Number(signedTimestamps[index]),
  }), true);
}

const persistentWorker503 = sequenceFetch([response(503, 'PRIVATE_PERSISTENT_WORKER_BODY')]);
const persistentWorkerDelays = [];
await assert.rejects(
  runSignedWorkerCount(persistentWorker503.fetchImpl, {
    sleepImpl: async delay => persistentWorkerDelays.push(delay),
  }),
  error => error?.code === 'TRIP_STORAGE_WORKER_COUNT_TRANSIENT_EXHAUSTED'
    && error?.attempts === 3
    && error?.status === 503
    && !String(error?.stack).includes('PRIVATE_PERSISTENT_WORKER_BODY'),
);
assert.equal(persistentWorker503.calls.length, 3);
assert.deepEqual(persistentWorkerDelays, [250, 750]);

for (const [probe, wrongResponse] of [
  ['unsigned', response(403, 'PRIVATE_UNSIGNED_WRONG_STATUS')],
  ['signed', response(401, 'PRIVATE_SIGNED_WRONG_STATUS')],
  ['signed', response(500, 'PRIVATE_NONTRANSIENT_500')],
  ['signed', response(200, JSON.stringify({ ok: false, trip_count: 1 }))],
  ['signed', workerCountSuccess(-1)],
  ['signed', workerCountSuccess(1.5)],
  ['signed', response(200, JSON.stringify({ ok: true, trip_count: 1, private_extra: 'PRIVATE_SUCCESS_EXTRA' }))],
  ['signed', response(200, 'PRIVATE_MALFORMED_SUCCESS_BODY')],
]) {
  const wrong = sequenceFetch([wrongResponse, probe === 'unsigned' ? response(401) : workerCountSuccess()]);
  await assert.rejects(
    probe === 'unsigned' ? runUnsignedWorkerCount(wrong.fetchImpl) : runSignedWorkerCount(wrong.fetchImpl),
    error => error?.code === 'TRIP_STORAGE_WORKER_COUNT_CONTRACT_MISMATCH'
      && error?.attempts === 1
      && !String(error?.stack).includes('PRIVATE_'),
  );
  assert.equal(wrong.calls.length, 1);
}

for (const transientTransport of [
  Object.assign(new Error('PRIVATE_WORKER_TIMEOUT_CAUSE'), { code: TRIP_STORAGE_NETWORK_TIMEOUT_CODE }),
  new TypeError('PRIVATE_WORKER_TYPEERROR_CAUSE'),
]) {
  const transportThenGood = sequenceFetch([transientTransport, response(401)]);
  assert.deepEqual(await runUnsignedWorkerCount(transportThenGood.fetchImpl), {
    ok: true,
    attempts: 2,
    status: 401,
  });
  assert.equal(transportThenGood.calls.length, 2);
}

const persistentWorkerTransport = sequenceFetch([new TypeError('PRIVATE_PERSISTENT_WORKER_TRANSPORT')]);
await assert.rejects(
  runSignedWorkerCount(persistentWorkerTransport.fetchImpl),
  error => error?.code === 'TRIP_STORAGE_WORKER_COUNT_TRANSIENT_EXHAUSTED'
    && error?.attempts === 3
    && !String(error?.stack).includes('PRIVATE_PERSISTENT_WORKER_TRANSPORT'),
);
assert.equal(persistentWorkerTransport.calls.length, 3);

const nontransientWorkerTransport = sequenceFetch([new Error('PRIVATE_WORKER_PROGRAMMING_CAUSE')]);
await assert.rejects(
  runSignedWorkerCount(nontransientWorkerTransport.fetchImpl),
  error => error?.code === 'TRIP_STORAGE_WORKER_COUNT_TRANSPORT_FAILURE'
    && error?.attempts === 1
    && !String(error?.stack).includes('PRIVATE_WORKER_PROGRAMMING_CAUSE'),
);
assert.equal(nontransientWorkerTransport.calls.length, 1);

const workerCapturedConsole = [];
try {
  for (const level of Object.keys(originalConsole)) console[level] = (...args) => workerCapturedConsole.push([level, ...args]);
  const privateWorkerFailure = sequenceFetch([response(503, 'PRIVATE_WORKER_RESPONSE_MARKER')]);
  await assert.rejects(runSignedWorkerCount(privateWorkerFailure.fetchImpl));
} finally {
  Object.assign(console, originalConsole);
}
assert.deepEqual(workerCapturedConsole, []);

console.log('Trip-storage Edge/Worker: kun faste statefri prober genkører korte gatewayfejl; signerede D1-count-reads forbliver SELECT-only og fail-closed.');
