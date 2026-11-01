import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { TRIP_STORAGE_NETWORK_TIMEOUT_CODE } from './lib/bounded-fetch.mjs';
import {
  TRIP_STORAGE_EDGE_SIGNED_LOGIN_PROBE_KIND,
  TRIP_STORAGE_EDGE_NO_WRITE_RETRY_DELAYS_MS,
  TRIP_STORAGE_EDGE_PREFLIGHT_PROBE_KIND,
  matchesTripStorageReadiness,
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
    'x-ravradar-trip-export-version': '1',
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
    || !matchesTripStorageReadiness(value, 'trip-log', 'd1')) return false;
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

// The installed capability comes from the ACTUAL trip-log OPTIONS/signed-GET
// handler and readiness producer. Only host/CORS/mode boundaries are synthetic;
// any normal rate/auth/storage call here is a test failure, not a private probe.
let actualEdgeHandler;
const forbiddenEdgeCall = () => { throw new Error('Unexpected auth/rate/storage call'); };
const edgeScope = vm.createContext({
  Response,
  Deno: { serve: handler => { actualEdgeHandler = handler; }, env: { get: key => key === 'TRIP_GATEWAY_SHARED_SECRET' ? sharedSecret : '' } },
  assertAllowedOrigin: request => assert.equal(request.headers.get('origin'), origin),
  corsHeaders: () => ({ 'Access-Control-Allow-Origin': origin }),
  tripStorageMode: () => 'd1',
  classifyTripStorageContractProbe, TRIP_STORAGE_CONTRACT_PROBE_HEADER,
  TRIP_STORAGE_SIGNED_LOGIN_METHOD, TRIP_STORAGE_SIGNED_LOGIN_PROBE_KIND,
  TRIP_STORAGE_SIGNED_LOGIN_SIGNATURE_PATH, verifyTripGatewaySignature,
  readJsonObject: forbiddenEdgeCall, enforceRateLimits: forbiddenEdgeCall,
  requireAuthenticatedUserId: forbiddenEdgeCall, listOwnTripObservations: forbiddenEdgeCall,
  exportOwnTripPage: forbiddenEdgeCall,
  GatewayError: Error,
  safeGatewayError: () => Response.json({ error: 'UNEXPECTED_TEST_PATH' }, { status: 500 }),
});
const readinessProducer = fs.readFileSync('supabase/functions/_shared/trip-storage-readiness.ts', 'utf8');
vm.runInContext(readinessProducer.replace(/^import[^\n]+\r?\n/gm, '').replace(/^export\s+/gm, '').replace(/request: Request/g, 'request'), edgeScope);
vm.runInContext(tripLogSource.replace(/^import[\s\S]*?;\r?\n/gm, '').replace(/payload\.cursor as string \| null/g, 'payload.cursor'), edgeScope);
assert.equal(typeof actualEdgeHandler, 'function');
const actualEdgeFetch = (input, init) => actualEdgeHandler(new Request(input, init));
const actualInstalledProbe = await runSignedLoginResponseProbe(actualEdgeFetch, { nowFactory: () => Date.now() });
assert.deepEqual(actualInstalledProbe, { ok: true, attempts: 1, status: 401 });
const actualOptions = await actualEdgeFetch(`${baseUrl}/functions/v1/trip-log`, { method: 'OPTIONS', headers: { origin } });
assert.equal(actualOptions.status, 204);
assert.equal(matchesTripStorageReadiness(actualOptions, 'trip-log', 'd1'), true);
assert.equal(new Headers(edgeScope.tripStorageReadinessHeaders(new Request(baseUrl))).has('x-ravradar-trip-export-version'), false,
  'Other endpoints do not claim the trip-log export capability by default');
const normalVerifierSource = fs.readFileSync('scripts/verify-trip-storage-edge.mjs', 'utf8');
assert.match(normalVerifierSource, /matchesTripStorageReadiness\(response, functionName, expectedStorageMode, preUpgrade\)/);
assert.match(normalVerifierSource, /matchesTripStorageReadiness\(response, 'trip-log', expectedStorageMode, preUpgrade\)/);
for (const version of [null, '0', '2', '01']) {
  const old = signedLoginResponse();
  if (version === null) old.headers.delete('x-ravradar-trip-export-version');
  else old.headers.set('x-ravradar-trip-export-version', version);
  const oldThenNew = sequenceFetch([old, signedLoginResponse()]);
  await assert.rejects(runSignedLoginResponseProbe(oldThenNew.fetchImpl), error =>
    error?.code === 'TRIP_STORAGE_EDGE_NO_WRITE_CONTRACT_MISMATCH' && error?.attempts === 1);
  assert.equal(oldThenNew.calls.length, 1, 'Capability mismatch is not a transient retry');
}
const transientThenOld = sequenceFetch([
  response(503, 'PRIVATE_TRANSIENT_BODY'),
  signedLoginResponse({ error: 'LOGIN_REQUIRED' }, { 'x-ravradar-trip-export-version': '0' }),
  signedLoginResponse(),
]);
await assert.rejects(runSignedLoginResponseProbe(transientThenOld.fetchImpl), error =>
  error?.code === 'TRIP_STORAGE_EDGE_NO_WRITE_CONTRACT_MISMATCH' && error?.attempts === 2);
assert.equal(transientThenOld.calls.length, 2, 'A transient hop cannot bless a later old capability');

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


// Actual signed readiness -> Worker -> synthetic D1 count: reject absent or malformed shard receipts.
{
const { default: test } = await import('node:test');
const { handleRequest } = await import('../cloudflare/trip-gateway/worker.js');
const gatewayUrl = 'https://synthetic-count-readback.example.workers.dev';
const sharedSecret = 'synthetic-count-readback-secret-at-least-32-characters';
const countSql = 'select count(*) as trip_count from trip_observations';

async function probe({ faulty = undefined, fault = true, recover = false, throwing = false, counts = Array(10).fill(1), unsigned = false } = {}) {
  const requests = [], queries = [], statuses = [], delays = [], signatures = [], timestamps = [];
  let attempt = 0;
  const env = { TRIP_GATEWAY_SHARED_SECRET: sharedSecret };
  for (let shard = 0; shard < 10; shard += 1) env[`TRIP_DB_${shard}`] = {
    prepare(sql) {
      assert.equal(sql, countSql, 'Actual Worker count must remain SELECT-only');
      return { async all() {
        queries.push([attempt, shard]);
        if (shard === 3 && fault && (!recover || attempt === 1)) {
          if (throwing) throw new Error('SYNTHETIC_PRIVATE_D1_DETAIL');
          return structuredClone(faulty);
        }
        return { success: true, results: [{ trip_count: counts[shard] }], meta: { duration: 0 } };
      } };
    },
  };
  const result = await runWorkerCountReadProbe({ gatewayUrl, sharedSecret,
    probeKind: unsigned ? WORKER_COUNT_UNSIGNED_PROBE_KIND : WORKER_COUNT_SIGNED_PROBE_KIND,
    sleepImpl: async milliseconds => { delays.push(milliseconds); },
    fetchImpl: async (input, init) => {
      const request = new Request(input, init); attempt += 1;
      assert.equal(new URL(request.url).origin, gatewayUrl);
      assert.equal(new URL(request.url).pathname, '/v1/trips/count'); assert.equal(request.method, 'POST');
      assert.equal(await request.clone().text(), '{}'); requests.push(request.url);
      signatures.push(request.headers.get('x-ravradar-signature')); timestamps.push(request.headers.get('x-ravradar-timestamp'));
      const response = await handleRequest(request, env); statuses.push(response.status);
      if (response.status === 503) assert.deepEqual(await response.clone().json(), { ok: false, error: 'COUNT_UNAVAILABLE' });
      return response;
    },
  }).then(value => ({ ok: true, value }), error => ({ ok: false, error }));
  if (!unsigned) { assert.equal(new Set(signatures).size, requests.length); assert.equal(new Set(timestamps).size, requests.length); }
  if (!result.ok) assert.equal(String(result.error.stack).includes('SYNTHETIC_PRIVATE_D1_DETAIL'), false);
  return { ...result, requests, queries, statuses, delays };
}

for (const [label, faulty] of [
  ['missing response', undefined], ['null response', null], ['empty object', {}],
  ['driver failure with plausible zero', { success: false, results: [{ trip_count: 0 }], error: 'SYNTHETIC_PRIVATE_D1_DETAIL' }],
  ['missing result rows', { success: true }], ['empty result rows', { success: true, results: [] }],
  ['array-like result rows', { success: true, results: { 0: { trip_count: 0 }, length: 1 } }],
  ['multiple result rows', { success: true, results: [{ trip_count: 0 }, { trip_count: 1 }] }],
  ['missing count', { success: true, results: [{}] }], ['null count', { success: true, results: [{ trip_count: null }] }],
  ['false count', { success: true, results: [{ trip_count: false }] }], ['true count', { success: true, results: [{ trip_count: true }] }],
  ['empty string count', { success: true, results: [{ trip_count: '' }] }], ['string zero count', { success: true, results: [{ trip_count: '0' }] }],
  ['string positive count', { success: true, results: [{ trip_count: '17' }] }],
  ['negative count hidden by other shards', { success: true, results: [{ trip_count: -1 }] }],
]) test(`actual signed readiness must reject ${label} from one D1 shard`, async () => {
  const result = await probe({ faulty });
  assert.equal(result.ok, false, `${label} must not become a successful storage-readiness receipt`);
  assert.equal(result.error.code, 'TRIP_STORAGE_WORKER_COUNT_TRANSIENT_EXHAUSTED');
  assert.equal(result.error.attempts, 3); assert.deepEqual(result.statuses, [503, 503, 503]);
  assert.deepEqual(result.delays, [250, 750]);
});

for (const [label, counts, total] of [
  ['zero', Array(10).fill(0), 0], ['ten numeric shard counts', Array.from({ length: 10 }, (_, index) => index + 1), 55],
  ['largest safe total', [Number.MAX_SAFE_INTEGER, ...Array(9).fill(0)], Number.MAX_SAFE_INTEGER],
]) test(`control actual signed readiness accepts ${label}`, async () => {
  const result = await probe({ fault: false, counts });
  assert.equal(result.ok, true); assert.equal(result.value.tripCount, total);
  assert.equal(result.value.attempts, 1); assert.equal(result.queries.length, 10); assert.deepEqual(result.delays, []);
});

test('control unsigned normal count probe reaches no D1 query', async () => {
  const result = await probe({ unsigned: true });
  assert.equal(result.ok, true); assert.equal(result.value.status, 401); assert.equal(result.queries.length, 0);
});

test('control thrown D1 read preserves fixed unavailable response and bounded retry', async () => {
  const result = await probe({ throwing: true });
  assert.equal(result.ok, false); assert.equal(result.error.code, 'TRIP_STORAGE_WORKER_COUNT_TRANSIENT_EXHAUSTED');
  assert.equal(result.requests.length, 3); assert.deepEqual(result.delays, [250, 750]);
});

test('normal readiness retries malformed D1 read, then accepts ten real numeric shard results', async () => {
  const result = await probe({ faulty: {}, recover: true });
  assert.equal(result.ok, true); assert.equal(result.value.attempts, 2); assert.equal(result.value.tripCount, 10);
  assert.deepEqual(result.statuses, [503, 200]); assert.deepEqual(result.delays, [250]);
});


for (const [label, receipt] of [['missing', {}], ['null', {success:null}], ['nonboolean', {success:'true'}]])
test('ack: signed readiness rejects ' + label + ' success despite plausible zero', async () => {
  const result = await probe({ faulty: {...receipt, results:[{trip_count:0}]} });
  assert.equal(result.ok, false); assert.equal(result.error.code, 'TRIP_STORAGE_WORKER_COUNT_TRANSIENT_EXHAUSTED');
  assert.equal(result.error.attempts, 3); assert.deepEqual(result.statuses, [503,503,503]);
  assert.deepEqual(result.delays, [250,750]);
  assert.deepEqual(result.queries, [1,2,3].flatMap(attempt => [0,1,2,3].map(shard => [attempt,shard])));
});
test('ack: positive zero readiness remains valid while missing acknowledgment retries before recovery', async () => {
  const result = await probe({faulty:{results:[{trip_count:0}]},recover:true});
  assert.equal(result.ok,true);assert.equal(result.value.tripCount,10);assert.equal(result.value.attempts,2);
  assert.deepEqual(result.statuses,[503,200]);assert.deepEqual(result.delays,[250]);
});
test('ack: explicit positive empty-store readiness requires no additional driver metrics', async () => {
  const result = await probe({faulty:{success:true,results:[{trip_count:0}]},counts:Array(10).fill(0)});
  assert.equal(result.ok,true);assert.equal(result.value.tripCount,0);assert.equal(result.value.attempts,1);
  assert.equal(result.queries.length,10);assert.deepEqual(result.delays,[]);
});
test('control safe per-shard counts still reject unsafe aggregate overflow', async () => {
  const result = await probe({ fault: false, counts: [Number.MAX_SAFE_INTEGER, 1, ...Array(8).fill(0)] });
  assert.equal(result.ok, false); assert.equal(result.error.code, 'TRIP_STORAGE_WORKER_COUNT_TRANSIENT_EXHAUSTED');
  assert.deepEqual(result.statuses, [503, 503, 503]);
});
}

{
const { default: test } = await import('node:test');
const { handleRequest } = await import('../cloudflare/trip-gateway/worker.js');
const { externalOwnerSubject, externalTripRecord, storeCloudflareTrip, listCloudflareTrips, sha256Hex } = await import('../supabase/functions/_shared/trip-storage.js');
const sharedSecret = 'synthetic-normal-owner-readback-secret-at-least-32-characters';
const gatewayUrl = 'https://synthetic-normal-owner-readback.example.workers.dev';
const owner = await externalOwnerSubject({ userId: '11111111-1111-4111-8111-111111111111', secret: sharedSecret });
const foreign = await externalOwnerSubject({ userId: '22222222-2222-4222-8222-222222222222', secret: sharedSecret });
const payload = { client_observation_id: '33333333-3333-4333-8333-333333333333', trip_id: null,
  observed_at: '2000-01-01T10:00:00.000Z', submitted_at: '2000-01-01T11:00:00.000Z',
  actual_zone_id: 'DK-B01-01', actual_coastal_part_id: 'DK-B01-01-P01', hunt_mode: 'beach', found: false, result: 'none' };
const record = await externalTripRecord({ owner, payload });
const targetShard = Number.parseInt((await sha256Hex(record.client_observation_id)).slice(0, 8), 16) % 10;

async function call(mode, { faultAt = 0, invalid, erased = false } = {}) {
  const original = JSON.stringify(record), writes = [], nonTombstoneReads = [];
  let tombstoneReads = 0, requests = 0;
  const env = { TRIP_GATEWAY_SHARED_SECRET: sharedSecret };
  for (let shard = 0; shard < 10; shard += 1) env[`TRIP_DB_${shard}`] = { prepare(sql) {
    const normalized = sql.replace(/\s+/g, ' ').trim();
    return { bind(...args) { return {
      async all() {
        if (normalized === 'select owner_subject from trip_owner_erasure_tombstones where owner_subject = ? limit 1') {
          assert.equal(shard, 0); assert.deepEqual(args, [owner.subject]); tombstoneReads += 1;
          return tombstoneReads === faultAt ? structuredClone(invalid)
            : { success: true, results: erased ? [{ owner_subject: owner.subject }] : [] };
        }
        nonTombstoneReads.push(normalized);
        if (normalized === 'select owner_subject, payload_sha256, payload_json, source from trip_observations where client_observation_id = ? or (? is not null and trip_id = ?) limit 2') {
          assert.deepEqual(args, [record.client_observation_id, null, null]);
          return { success: true, results: shard === targetShard ? [{ ...record }] : [] };
        }
        if (normalized === 'select client_observation_id, trip_id, owner_subject, payload_sha256, target_database_index from trip_observation_registry where client_observation_id = ? or (? is not null and trip_id = ?) limit 2') {
          assert.equal(shard, 0); assert.deepEqual(args, [record.client_observation_id, null, null]);
          return { success: true, results: [{ client_observation_id: record.client_observation_id, trip_id: null,
            owner_subject: owner.subject, payload_sha256: record.payload_sha256, target_database_index: targetShard }] };
        }
        assert.equal(normalized, 'select payload_json, payload_sha256, observed_at from trip_observations where owner_subject = ? order by observed_at desc limit ?');
        assert.deepEqual(args, [owner.subject, 100]);
        return { success: true, results: shard === targetShard ? [{ ...record }] : [] };
      },
      async run() {
        assert.ok(normalized.startsWith('insert into trip_observation_registry (')
          || normalized === 'delete from trip_observations where owner_subject = ?'
          || normalized === 'delete from trip_observation_registry where owner_subject = ?');
        // Observe calls only. No fixture record, database or file is changed.
        writes.push(normalized); return { success: true, meta: { changes: 0 } };
      },
    }; } };
  } };
  const fetchImpl = async (input, init) => {
    const request = new Request(input, init); requests += 1;
    assert.equal(new URL(request.url).origin, gatewayUrl);
    assert.equal(new URL(request.url).pathname, `/v1/trips/${mode}`); assert.equal(request.method, 'POST');
    const response = await handleRequest(request, env);
    if (response.status !== 200) assert.deepEqual(await response.clone().json(), { ok: false, error: 'INVALID_REQUEST' });
    return response;
  };
  const operation = mode === 'store'
    ? storeCloudflareTrip({ gatewayUrl, sharedSecret, owner, payload, fetchImpl })
    : listCloudflareTrips({ gatewayUrl, sharedSecret, ownerSubject: owner.subject, fetchImpl });
  const result = await operation.then(value => ({ ok: true, value }), error => ({ ok: false, error }));
  assert.equal(JSON.stringify(record), original); assert.equal(requests, 1);
  return { ...result, writes, nonTombstoneReads, tombstoneReads };
}

for (const mode of ['store', 'list']) for (const [label, invalid] of [
  ['absent response', undefined], ['absent rows', { success: true }],
  ['failed empty response', { success: false, results: [] }], ['array-like empty rows', { results: { length: 0 } }],
]) test(`actual normal signed ${mode}: unknown initial ${label} cannot reach another read or write`, async () => {
  const result = await call(mode, { faultAt: 1, invalid });
  assert.deepEqual(result.writes, []); assert.deepEqual(result.nonTombstoneReads, []);
  assert.equal(result.ok, false); assert.match(result.error.message, /REQUEST_REJECTED/);
});

for (const faultAt of [1, 2]) test(`actual normal signed list: a different-owner tombstone row at ${faultAt} is invalid, not verified empty history`, async () => {
  const result = await call('list', { faultAt, invalid: { success: true, results: [{ owner_subject: foreign.subject }] } });
  assert.equal(result.ok, false); assert.match(result.error.message, /REQUEST_REJECTED/); assert.deepEqual(result.writes, []);
});

test('actual normal signed store: a different-owner final tombstone row cannot trigger purge', async () => {
  const result = await call('store', { faultAt: 3, invalid: { success: true, results: [{ owner_subject: foreign.subject }] } });
  assert.equal(result.ok, false); assert.match(result.error.message, /REQUEST_REJECTED/);
  assert.equal(result.writes.filter(sql => sql.startsWith('delete ')).length, 0);
  assert.equal(result.writes.filter(sql => sql.startsWith('insert into trip_observation_registry')).length, 1);
});


for (const mode of ['store','list']) test('ack: actual normal ' + mode + ' cannot access or write after unacknowledged initial empty tombstone', async () => {
  const result = await call(mode,{faultAt:1,invalid:{results:[]}});
  assert.equal(result.ok,false);assert.match(result.error.message,/REQUEST_REJECTED/);
  assert.deepEqual(result.writes,[]);assert.deepEqual(result.nonTombstoneReads,[]);
});
test('ack: actual normal history cannot convert an unacknowledged matching tombstone into verified empty history', async () => {
  const result = await call('list',{faultAt:2,invalid:{success:'true',results:[{owner_subject:owner.subject}]}});
  assert.equal(result.ok,false);assert.match(result.error.message,/REQUEST_REJECTED/);assert.deepEqual(result.writes,[]);
});
test('ack: actual normal final store guard cannot authorize purge from an unacknowledged matching tombstone', async () => {
  const result = await call('store',{faultAt:3,invalid:{success:'true',results:[{owner_subject:owner.subject}]}});
  assert.equal(result.ok,false);assert.match(result.error.message,/REQUEST_REJECTED/);
  assert.equal(result.writes.filter(sql=>sql.startsWith('delete ')).length,0);
  assert.equal(result.writes.filter(sql=>sql.startsWith('insert into trip_observation_registry')).length,1);
});
test('control actual normal confirmed initial tombstone rejects store without subsequent read/write', async () => {
  const result = await call('store', { erased: true }); assert.equal(result.ok, false);
  assert.deepEqual(result.writes, []); assert.deepEqual(result.nonTombstoneReads, []);
});
test('control actual normal confirmed tombstone gives existing empty history without write', async () => {
  const result = await call('list', { erased: true }); assert.equal(result.ok, true);
  assert.deepEqual(result.value, []); assert.deepEqual(result.writes, []); assert.deepEqual(result.nonTombstoneReads, []);
});
test('control actual normal verified empty tombstones preserve ordinary stored duplicate receipt', async () => {
  const result = await call('store'); assert.equal(result.ok, true); assert.equal(result.value.duplicate, true);
  assert.equal(result.writes.length, 1); assert.ok(result.writes[0].startsWith('insert into trip_observation_registry'));
  assert.equal(result.tombstoneReads, 3);
});
test('control actual normal verified empty tombstones preserve ordinary own history', async () => {
  const result = await call('list'); assert.equal(result.ok, true);
  assert.deepEqual(result.value, [JSON.parse(record.payload_json)]); assert.deepEqual(result.writes, []);
  assert.equal(result.tombstoneReads, 2);
});

for (const mode of ['store', 'list']) for (const [label, rows] of [
  ['multiple rows', [{ owner_subject: owner.subject }, { owner_subject: owner.subject }]], ['null row', [null]],
]) test('actual normal signed ' + mode + ': malformed initial ' + label + ' cannot reach another read or write', async () => {
  const result = await call(mode, { faultAt: 1, invalid: { success: true, results: rows } });
  assert.deepEqual(result.writes, []); assert.deepEqual(result.nonTombstoneReads, []);
  assert.equal(result.ok, false); assert.match(result.error.message, /REQUEST_REJECTED/);
});
for (const [label, rows] of [
  ['null row', [null]], ['multiple rows', [{ owner_subject: owner.subject }, { owner_subject: owner.subject }]],
]) test('actual normal signed store: malformed final ' + label + ' cannot trigger purge or a success receipt', async () => {
  const result = await call('store', { faultAt: 3, invalid: { success: true, results: rows } });
  assert.equal(result.ok, false); assert.match(result.error.message, /REQUEST_REJECTED/);
  assert.equal(result.writes.filter(sql => sql.startsWith('delete ')).length, 0);
  assert.equal(result.writes.filter(sql => sql.startsWith('insert into trip_observation_registry')).length, 1);
});
}

// Appended inside the existing bounded target; these are normal relative imports.
{
const { default: test } = await import('node:test');
const { handleRequest } = await import('../cloudflare/trip-gateway/worker.js');
const { externalOwnerSubject, externalTripRecord, sha256Hex, storeCloudflareTrip, listCloudflareTrips, deleteCloudflareTrips } = await import('../supabase/functions/_shared/trip-storage.js');
const sharedSecret = 'synthetic-root556-receipt-secret-at-least-32-characters';
const gatewayUrl = 'https://synthetic-root556-receipt.example.workers.dev';
const owner = await externalOwnerSubject({ userId:'11111111-1111-4111-8111-111111111111', secret:sharedSecret });
const payload = { client_observation_id:'33333333-3333-4333-8333-333333333333', trip_id:null,
  observed_at:'2000-01-01T10:00:00.000Z', submitted_at:'2000-01-01T11:00:00.000Z',
  actual_zone_id:'DK-B01-01', actual_coastal_part_id:'DK-B01-01-P01', hunt_mode:'beach', found:false, result:'none' };
const record = await externalTripRecord({ owner,payload });
const targetShard = Number.parseInt((await sha256Hex(record.client_observation_id)).slice(0,8),16)%10;
const erasureMarkers = Array.from({length:10},(_,i)=>['tombstone',i]);
const erasureOrder = [...erasureMarkers,...Array.from({length:10},(_,i)=>['purge',i]),['registry-delete',0],
  ...Array.from({length:10},(_,i)=>['physical-read',i]),['registry-empty-read',0]];

async function normal(mode,{ stage=null, success, absent=false, throwing=false, changes, counts=null, fresh=false, empty=false }={}) {
  const events=[], statuses=[], original=JSON.stringify(record);
  let requests=0, inserted=!fresh, matchingRound=0;
  const env={TRIP_GATEWAY_SHARED_SECRET:sharedSecret};
  function receipt(at,valid) {
    if(at!==stage)return valid;
    if(throwing)throw new Error('SYNTHETIC_PRIVATE_D1_CAUSE');
    if(absent)return undefined;
    if(at==='purge')return {success,meta:{changes}};
    return {...valid,success};
  }
  for(let shard=0;shard<10;shard++)env[`TRIP_DB_${shard}`]={prepare(sql){
    const query=sql.replace(/\s+/g,' ').trim();
    return {bind(...args){return {
      async all(){
        if(query==='select owner_subject from trip_observations where owner_subject = ? limit 1'
          ||query==='select owner_subject from trip_observation_registry where owner_subject = ? limit 1') {
          assert.equal(mode,'delete');assert.deepEqual(args,[owner.subject]);
          const at=query.includes('trip_observation_registry')?'registry-empty-read':'physical-read';
          if(at==='registry-empty-read')assert.equal(shard,0);
          events.push([at,shard]);return receipt(at,{success:true,results:[]});
        }
        if(query==='select owner_subject from trip_owner_erasure_tombstones where owner_subject = ? limit 1') {
          assert.equal(shard,0);assert.deepEqual(args,[owner.subject]);events.push(['owner',shard]);
          return {success:true,results:[]};
        }
        if(query==='select owner_subject, payload_sha256, payload_json, source from trip_observations where client_observation_id = ? or (? is not null and trip_id = ?) limit 2') {
          assert.deepEqual(args,[record.client_observation_id,null,null]);if(shard===0)matchingRound++;
          const at=matchingRound===1?'matching-before':'matching-after';events.push([at,shard]);
          const result={success:true,results:inserted&&shard===targetShard?[{...record}]:[]};
          return shard===targetShard?receipt(at,result):result;
        }
        if(query==='select client_observation_id, trip_id, owner_subject, payload_sha256, target_database_index from trip_observation_registry where client_observation_id = ? or (? is not null and trip_id = ?) limit 2') {
          assert.equal(shard,0);assert.deepEqual(args,[record.client_observation_id,null,null]);events.push(['registry-read',shard]);
          return receipt('registry-read',{success:true,results:[{client_observation_id:record.client_observation_id,trip_id:null,
            owner_subject:owner.subject,payload_sha256:record.payload_sha256,target_database_index:targetShard}]});
        }
        assert.equal(query,'select payload_json, payload_sha256, observed_at from trip_observations where owner_subject = ? order by observed_at desc limit ?');
        assert.deepEqual(args,[owner.subject,100]);events.push(['history',shard]);
        const result={success:true,results:shard===targetShard?[{...record}]:[]};
        return shard===targetShard?receipt('history',result):result;
      },
      async run(){
        const at=query.startsWith('insert into trip_owner_erasure_tombstones ')?'tombstone'
          :query.startsWith('insert into trip_observation_registry ')?'registry-write'
          :query.startsWith('insert into trip_observations ')?'trip-write'
          :query==='delete from trip_observations where owner_subject = ?'?'purge'
          :query==='delete from trip_observation_registry where owner_subject = ?'?'registry-delete':null;
        assert.ok(at);events.push([at,shard]);
        if(['tombstone','purge','registry-delete'].includes(at))assert.deepEqual(args,[owner.subject]);
        if(['registry-write','registry-delete'].includes(at))assert.equal(shard,0);
        // A concurrent matching row can exist even when this write has no positive receipt.
        // Only this own in-memory flag changes; record bytes, files and databases do not.
        if(at==='trip-write'){
          assert.equal(shard,targetShard);
          assert.deepEqual(args.slice(0,10),[record.storage_schema_version,record.owner_subject,record.owner_kind,
            record.trip_id,record.client_observation_id,record.observed_at,record.submitted_at,
            record.payload_json,record.payload_sha256,record.source]);
          assert.equal(args.length,11);assert.equal(args[10],record.owner_subject);
          assert.match(query,/where not exists \( select 1 from trip_owner_erasure_tombstones where owner_subject = \? \)/);
          inserted=true;
        }
        return receipt(at,{success:true,meta:{changes:at==='purge'?(counts?.[shard]??(!empty&&shard===3?1:0)):at==='trip-write'?1:0}});
      },
    };}};
  }};
  const fetchImpl=async(input,init)=>{
    const request=new Request(input,init);requests++;
    assert.equal(new URL(request.url).origin,gatewayUrl);assert.equal(request.method,'POST');
    assert.equal(new URL(request.url).pathname,'/v1/trips/'+(mode==='delete'?'delete-owner':mode));
    const response=await handleRequest(request,env);statuses.push(response.status);
    if(response.status!==200)assert.deepEqual(await response.clone().json(),{ok:false,error:'INVALID_REQUEST'});
    return response;
  };
  const args={gatewayUrl,sharedSecret,ownerSubject:owner.subject,fetchImpl};
  const operation=mode==='delete'?deleteCloudflareTrips(args):mode==='store'?storeCloudflareTrip({...args,owner,payload}):listCloudflareTrips(args);
  const result=await operation.then(value=>({ok:true,value}),error=>({ok:false,error}));
  assert.equal(requests,1);assert.equal(JSON.stringify(record),original);
  if(!result.ok)assert.equal(String(result.error.stack).includes('SYNTHETIC_PRIVATE_D1_CAUSE'),false);
  return {...result,events,statuses};
}

for(const stage of ['tombstone','purge','registry-delete'])for(const [label,success,absent] of [
  ['false',false,false],['missing',undefined,false],['null',null,false],['nonboolean','true',false],['absent response',undefined,true],
])test('556 delete refuses '+label+' receipt at '+stage,async()=>{
  const result=await normal('delete',{stage,success,absent});assert.equal(result.ok,false);assert.match(result.error.message,/REQUEST_REJECTED/);
  if(stage==='tombstone')assert.deepEqual(result.events,[['tombstone',0]]);
  if(stage==='purge')assert.deepEqual(result.events,[...erasureMarkers,['purge',0]]);
});
for(const [label,changes] of [['missing',undefined],['null',null],['string','0'],['negative',-1],['fraction',0.5],['unsafe',Number.MAX_SAFE_INTEGER+1]])
test('556 delete rejects '+label+' changes without later purge',async()=>{
  const result=await normal('delete',{stage:'purge',success:true,changes});assert.equal(result.ok,false);
  assert.deepEqual(result.events,[...erasureMarkers,['purge',0]]);
});
test('556 delete rejects first unsafe cumulative sum before later purge or registry',async()=>{
  const result=await normal('delete',{counts:[2**52,2**52]});assert.equal(result.ok,false);assert.deepEqual(result.statuses,[400]);
  assert.deepEqual(result.events,[...erasureMarkers,['purge',0],['purge',1]]);
});
for(const [label,options,total] of [['normal',{},1],['already empty',{empty:true},0],['maximum safe',{counts:[2**52-1,2**52,...Array(8).fill(0)]},Number.MAX_SAFE_INTEGER]])
test('556 control positive '+label+' deletion preserves exact order',async()=>{
  const result=await normal('delete',options);assert.equal(result.ok,true);assert.equal(result.value,total);
  assert.deepEqual(result.events,erasureOrder);assert.equal(result.events.length,32);
});
for(const stage of ['tombstone','purge','registry-delete'])test('556 control thrown first '+stage+' remains fixed and stops later work',async()=>{
  const result=await normal('delete',{stage,throwing:true});assert.equal(result.ok,false);assert.deepEqual(result.statuses,[400]);
  if(stage==='tombstone')assert.deepEqual(result.events,[['tombstone',0]]);
  if(stage==='purge')assert.deepEqual(result.events,[...erasureMarkers,['purge',0]]);
});

for(const stage of ['matching-before','registry-write','registry-read','trip-write','matching-after','history'])for(const [label,success] of [['false',false],['missing',undefined],['nonboolean','true']])
test('556 ordinary '+stage+' rejects '+label+' acknowledgment despite plausible row',async()=>{
  const result=await normal(stage==='history'?'list':'store',{stage,success,fresh:stage==='trip-write'});
  assert.equal(result.ok,false);assert.match(result.error.message,/REQUEST_REJECTED/);
  if(stage==='matching-before')assert.equal(result.events.some(([at])=>at==='registry-write'),false);
  if(stage==='registry-write')assert.equal(result.events.some(([at])=>at==='registry-read'||at==='trip-write'),false);
  if(stage==='registry-read')assert.equal(result.events.some(([at])=>at==='trip-write'),false);
  if(stage==='trip-write')assert.equal(result.events.some(([at])=>at==='matching-after'),false);
});
for(const [label,mode,options] of [['duplicate','store',{}],['new row','store',{fresh:true}],['history','list',{}]])
test('556 control positive normal '+label+' preserves original payload',async()=>{
  const result=await normal(mode,options);assert.equal(result.ok,true);
  if(mode==='list')assert.deepEqual(result.value,[JSON.parse(record.payload_json)]);
  else assert.equal(result.value.duplicate,!options.fresh);
});
}

let runOwnerUpgradeWorkflow;
// Additive existing-D1 repair contract. Old receipt assertions above are unchanged.
{
const { test: repairTest } = await import('node:test');
const { compileFunction } = await import('node:vm');
const { DatabaseSync } = await import('node:sqlite');
const path = await import('node:path');
const storage = await import('../supabase/functions/_shared/trip-storage.js');
const classification = await import('./lib/trip-storage-legacy-classification.mjs');
const preparation = fs.readFileSync('scripts/prepare-cloudflare-trip-storage.mjs','utf8');
const workflow = fs.readFileSync('.github/workflows/deploy-trip-storage.yml','utf8');
const schema = fs.readFileSync('cloudflare/trip-gateway/migrations/001_trip_observations.sql','utf8');
const exportIndex = fs.readFileSync('cloudflare/trip-gateway/migrations/002_owner_export_keyset.sql','utf8');
const evaluate = (source, scope) => compileFunction('return (async()=>{\n'+source+'\n})();',Object.keys(scope))(...Object.values(scope));
const withoutImports = source => source.replace(/^import[\s\S]*?;\r?\n/gm,'');
const names=classification.TRIP_STORAGE_REQUIRED_SHARD_NAMES;
const shardRows=()=>names.map((name,index)=>({name,uuid:`00000000-0000-4000-8000-${String(index).padStart(12,'0')}`,jurisdiction:'eu'}));

async function prepareFixture({args=['--existing-worker-repair'],list=shardRows(),mutate=()=>{},databaseMutation=()=>{},fetchFailure=false}={}) {
  const calls=[],writes=[],files=[],databases=names.map(()=>new DatabaseSync(':memory:'));
  let error=null;
  try {
    for(const database of databases){database.exec(schema);if(args.includes('--existing-worker-repair'))database.exec(exportIndex);database.prepare('insert into trip_storage_control(control_key,control_value) values(?,?)').run('d1_activation_attempted','true');}
    databaseMutation(databases);
    const boundedFetch=async(input,init={})=>{
      const url=new URL(String(input));calls.push({url:url.pathname,query:url.search,method:init.method||'GET'});
      if(fetchFailure)throw new TypeError('private synthetic cause');
      let body;
      if(url.hostname==='api.github.com') {
        const evidence=classification.LEGACY_D1_ACTIVATION_EVIDENCE;
        body=url.pathname.endsWith('/jobs')?{total_count:1,jobs:[{name:classification.LEGACY_D1_ACTIVATION_JOB_NAME,run_attempt:1,status:'completed',conclusion:'success',steps:[...classification.LEGACY_D1_ACTIVATION_D1_STEPS.map(name=>({name,status:'completed',conclusion:'success'})),{name:classification.LEGACY_D1_ACTIVATION_SUPABASE_ROLLBACK_STEP,status:'completed',conclusion:'skipped'}]}]}:{id:evidence.runId,head_sha:evidence.headSha,head_branch:evidence.headBranch,event:evidence.event,path:evidence.workflowPath,status:'completed',conclusion:'success'};
      } else if(url.pathname.endsWith('/database')) {
        const page=Number(url.searchParams.get('page'));const result=page===1?list:[];
        body={success:true,result,result_info:{page,per_page:100,count:result.length,total_count:list.length,total_pages:1}};
      } else if(url.pathname.endsWith('/query')) {
        const index=Number(url.pathname.split('/').at(-2).slice(-12));
        const {sql,params=[]}=JSON.parse(init.body);calls.at(-1).sql=sql;
        const write=!/^\s*(?:select|pragma)\b/i.test(sql);if(write)writes.push(sql);
        const statement=databases[index].prepare(sql);
        const results=write?(statement.run(...params),[]):statement.all(...params).map(row=>({...row}));
        body={success:true,result:[{success:true,results}]};
      } else throw new Error('Unexpected provider route');
      mutate(body,{url,init,calls});
      return {ok:true,status:200,headers:{get:()=>null},json:async()=>body};
    };
    await evaluate(withoutImports(preparation).replace(/^export /gm,'').split("\nif (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href)")[0]+"\nawait main();",{
      fs:{writeFileSync:(name,value,options)=>files.push({name,value,options}),appendFileSync:(...value)=>files.push({output:value})},path,
      D1_TRIP_SCHEMA_STATEMENTS:storage.D1_TRIP_SCHEMA_STATEMENTS,boundedFetch,
      TRIP_STORAGE_REQUIRED_SHARD_NAMES:names,SHARD_COUNT:10,
      classifyExistingTripStorageDatabases:classification.classifyExistingTripStorageDatabases,
      verifyLegacyActivationEvidence:classification.verifyLegacyActivationEvidence,
      process:{argv:['node','scripts/prepare-cloudflare-trip-storage.mjs',...args],env:{CLOUDFLARE_ACCOUNT_ID:'synthetic',CLOUDFLARE_API_TOKEN:'synthetic',TRIP_WRANGLER_CONFIG_PATH:'/synthetic/wrangler.json',GITHUB_TOKEN:'synthetic',GITHUB_REPOSITORY:classification.LEGACY_D1_ACTIVATION_EVIDENCE.repository}},
      console:{log:()=>{}},
    });
  }catch(caught){error=caught;}finally{for(const database of databases)database.close();}
  return {calls,writes,files,error};
}

repairTest('repair actual CLI selects read-only existing bindings with real ordinary SQLite metadata',async()=>{
  const result=await prepareFixture({list:shardRows().reverse()});
  assert.equal(result.error,null);assert.equal(result.writes.length,0);assert.equal(result.files.length,1);
  assert.equal(result.calls.some(call=>call.url.includes('/actions/')),false);
  const config=JSON.parse(result.files[0].value);
  assert.deepEqual(config.d1_databases.map(row=>row.database_name),names);
  assert.deepEqual(config.d1_databases.map(row=>row.binding),names.map((_,index)=>'TRIP_DB_'+index));
  assert.equal(result.files[0].options.mode,0o600);
  assert.equal(result.calls.length,13); // two bounded list pages, ten metadata reads, one control read.
});
repairTest('repair default CLI retains legacy evidence, ten DDL statements and physical index readback per shard and config',async()=>{
  const result=await prepareFixture({args:[]});assert.equal(result.error,null);
  assert.equal(result.writes.length,100);
  assert.equal(result.calls.filter(call=>/^pragma /.test(call.sql||'')).length,20);assert.equal(result.calls.filter(call=>call.url.includes('/actions/')).length,2);assert.equal(result.files.length,1);
});
for(const args of [['--unknown'],['--existing-worker-repair','--unknown'],['--existing-worker-repair','--existing-worker-repair']])
repairTest('repair rejects unknown arguments before I/O '+args.join(' '),async()=>{
  const result=await prepareFixture({args});assert.ok(result.error);assert.equal(result.calls.length,0);assert.deepEqual(result.files,[]);assert.deepEqual(result.writes,[]);
});
for(const [label,make] of [
  ['empty',()=>[]],['partial',()=>shardRows().slice(1)],['extra',()=>[...shardRows(),{name:'extra'}]],
  ['duplicate name',()=>shardRows().map((row,index)=>index===9?{...row,name:names[0]}:row)],
  ['duplicate ID',()=>shardRows().map((row,index)=>index===9?{...row,uuid:shardRows()[0].uuid}:row)],
  ['wrong jurisdiction',()=>shardRows().map((row,index)=>index===9?{...row,jurisdiction:'us'}:row)],
  ['missing ID',()=>shardRows().map((row,index)=>index===9?{...row,uuid:undefined}:row)],
]) repairTest('repair refuses '+label+' without creation/adoption',async()=>{
  const result=await prepareFixture({list:make()});assert.ok(result.error);assert.deepEqual(result.files,[]);assert.deepEqual(result.writes,[]);
});
for(const [label,mutation] of [
  ['absent activation',db=>db[0].exec('delete from trip_storage_control')],
  ['absent export002',db=>db[8].exec('drop index trip_observations_owner_export')],
  ['wrong export002 order',db=>db[8].exec('drop index trip_observations_owner_export;create index trip_observations_owner_export on trip_observations(owner_subject,created_at,client_observation_id)')],
  ['missing table',db=>db[8].exec('drop table trip_owner_erasure_tombstones')],
  ['wrong unique index',db=>db[8].exec('drop index trip_observation_registry_owner_client_unique; create index trip_observation_registry_owner_client_unique on trip_observation_registry(owner_subject,client_observation_id)')],
  ['wrong order',db=>db[8].exec('drop index trip_observations_owner_time; create index trip_observations_owner_time on trip_observations(observed_at desc,owner_subject)')],
  ['wrong collation',db=>db[8].exec('drop index trip_observations_owner_time; create index trip_observations_owner_time on trip_observations(owner_subject collate nocase,observed_at desc)')],
]) repairTest('repair actual SQLite '+label+' rejects without schema repair',async()=>{
  const result=await prepareFixture({databaseMutation:mutation});assert.ok(result.error);assert.deepEqual(result.files,[]);assert.deepEqual(result.writes,[]);
});
for(const [label,mutation] of [
  ['provider false',body=>body.success=false],['provider missing',body=>delete body.success],
  ['result false',body=>{if(body.result?.[0]?.results)body.result[0].success=false;}],
  ['result missing',body=>{if(body.result?.[0]?.results)delete body.result[0].success;}],
  ['result multiple',body=>{if(body.result?.[0]?.results)body.result.push(body.result[0]);}],
  ['invalid rows',body=>{if(body.result?.[0]?.results)body.result[0].results=null;}],
  ['pagination mismatch',body=>{if(body.result_info)body.result_info.page=2;}],
]) repairTest('repair '+label+' acknowledgment stops without output',async()=>{
  const result=await prepareFixture({mutate:mutation});assert.ok(result.error);assert.deepEqual(result.files,[]);assert.deepEqual(result.writes,[]);
});
repairTest('repair optional pagination totals and harmless SQLite auxiliary index remain compatible',async()=>{
  const result=await prepareFixture({mutate:body=>{if(body.result_info)delete body.result_info;},databaseMutation:db=>db[2].exec('create index harmless_extra_index on trip_observations(created_at)')});
  assert.equal(result.error,null);assert.equal(result.writes.length,0);
});
repairTest('repair transport failure stays sanitized and cannot create config',async()=>{
  const result=await prepareFixture({fetchFailure:true});assert.ok(result.error);assert.doesNotMatch(result.error.message,/private synthetic cause/);assert.deepEqual(result.files,[]);assert.deepEqual(result.writes,[]);
});
function noProviderMutation(result) {
  assert.equal(result.calls.some(call=>call.method!=='GET'&&!/^\s*select\b/i.test(call.sql||'')),false);
}
for(const list of [[],shardRows().slice(1),[...shardRows(),{name:'unexpected'}]])
repairTest('repair rejects installation/adoption with zero provider write at database count '+list.length,async()=>{
  const result=await prepareFixture({list});assert.ok(result.error);noProviderMutation(result);
});
for(const [label,results] of [['empty',[]],['false',[{control_value:'false'}]],['boolean',[{control_value:true}]],['null',[null]],['duplicate',[{control_value:'true'},{control_value:'true'}]]])
repairTest('repair activation '+label+' does not publish config',async()=>{
  const result=await prepareFixture({mutate:(body,{init})=>{if(init.body&&JSON.parse(init.body).sql.startsWith('select control_value'))body.result[0].results=results;}});
  assert.ok(result.error);assert.deepEqual(result.files,[]);noProviderMutation(result);
});
repairTest('repair SQL literal case change is not erased by schema normalization',async()=>{
  const result=await prepareFixture({databaseMutation:db=>{
    db[5].exec('drop table trip_observations');
    db[5].exec(storage.D1_TRIP_SCHEMA_STATEMENTS[0].replace("'live'","'LIVE'"));
    db[5].exec(storage.D1_TRIP_SCHEMA_STATEMENTS[1]);db[5].exec(storage.D1_TRIP_SCHEMA_STATEMENTS[2]);
  }});assert.ok(result.error);assert.deepEqual(result.files,[]);noProviderMutation(result);
});

const repairJob=workflow.replaceAll('\r\n','\n').split('  repair-existing-worker:\n')[1]||'';
const steps=[...repairJob.matchAll(/      - name: ([^\n]+)\n([\s\S]*?)(?=      - (?:name:|uses:)|$)/g)].map(match=>({
  name:match[1],text:match[2],id:/^        id: (.+)$/m.exec(match[2])?.[1],condition:/^        if: (.+)$/m.exec(match[2])?.[1],
  code:/          node --input-type=module <<'REPAIR_NODE'\n([\s\S]*?)          REPAIR_NODE/.exec(match[2])?.[1]?.replace(/^          /gm,''),
})).filter(step=>step.code);
const condition=(value,steps,failed,cancelled=false,operation='existing-worker-repair')=>{
  // GitHub applies success() unless a status-check function is explicit.
  // A plain operation guard must not restore after an earlier failed step.
  if(!value)return !failed&&!cancelled;
  if(!/\b(?:always|cancelled|failure|success)\s*\(/.test(value)&&(failed||cancelled))return false;
  return Function('steps','failure','cancelled','success','always','inputs','return '+value.replace(/^\$\{\{\s*|\s*\}\}$/g,''))(
    steps,()=>failed,()=>cancelled,()=>!failed&&!cancelled,()=>true,{operation});
};
async function workflowFixture({failCommand,driftCommand,preflightFailure=false,invalidLease=false,recoveryFailure=false,edgeUnavailable=false,badDeployVersion=false,lateDrift='',expireAfterWorkerPreflight=false,cancelRecovery=false,deployVersions={},unknownDeployStep='',falseReceiptStep='',operation='existing-worker-repair',applyUpgrade}={}) {
  const states={},calls=[],logs=[];let firstError=preflightFailure?new Error('PREFLIGHT_FAILED'):null,clock=1800000000000,failedOnce=false;
  for(const step of steps){
    if(step.id==='repair_replace'&&operation==='existing-owner-export-upgrade'&&!firstError&&applyUpgrade){
      const command=/id: owner_upgrade_apply[\s\S]*?run: node ([^\r\n]+)/.exec(repairJob)?.[1];
      try{await applyUpgrade(command);states.owner_upgrade_apply={outcome:'success',outputs:{}};}
      catch(error){firstError??=error;states.owner_upgrade_apply={outcome:'failure',outputs:{}};}
    }
    if(!condition(step.condition,states,!!firstError,cancelRecovery&&!!firstError,operation)) {states[step.id]={outcome:'skipped',outputs:{}};continue;}
    const outputs={},env={GITHUB_SHA:'a'.repeat(40),GITHUB_REF:'refs/heads/main',GITHUB_OUTPUT:'/synthetic/output',SUPABASE_PROJECT_ID:'synthetic',SUPABASE_URL:'https://synthetic.invalid',SUPABASE_PUBLISHABLE_KEY:'synthetic',TRIP_GATEWAY_SHARED_SECRET:'synthetic-existing-secret-at-least-32-characters',TRIP_WRANGLER_CONFIG_PATH:'/synthetic/config'};
    env.TRIP_STORAGE_OWNER_EXPORT_UPGRADE=operation==='existing-owner-export-upgrade'?'1':'0';
    const deadlineId=/REPAIR_LEASE_DEADLINE: \$\{\{ steps\.([a-z_]+)\.outputs\.deadline \}\}/.exec(step.text)?.[1];
    if(deadlineId)env.REPAIR_LEASE_DEADLINE=invalidLease?'0':states[deadlineId].outputs.deadline;
    const versionId=/REPAIR_EXPECTED_WORKER_VERSION: \$\{\{ steps\.([a-z_]+)\.outputs\.version \}\}/.exec(step.text)?.[1];
    if(versionId)env.REPAIR_EXPECTED_WORKER_VERSION=states[versionId]?.outputs.version||'';
    const execFileSync=(command,args,options)=>{
      const action=command==='git'?(args[0]==='fetch'?'fetch':'head'):command==='supabase'?(args.at(-1)==='TRIP_STORAGE_MODE=d1'?'restore':'maintenance'):command==='npx'?(args.includes('deploy')?'deploy':'secret'):command==='sleep'?'drain':args[0].includes('prepare-cloudflare-trip-storage')?'upgrade-check':args[0].includes('verify-trip-storage-edge')?'edge':'worker';
      const recordedAction=action==='worker'&&step.id.endsWith('replace')&&!calls.some(call=>call.step===step.id&&call.action==='deploy')?'worker-preflight':action;
      calls.push({step:step.id,action:recordedAction,args,options});
      if((!failedOnce&&recordedAction===failCommand)||(recoveryFailure&&step.id.startsWith('repair_recovery')&&action==='maintenance')){failedOnce=true;throw new Error('do not print synthetic secret cause');}
      if(action==='head')return action===driftCommand||(lateDrift===step.id)?'b'.repeat(40):env.GITHUB_SHA;
      if(action==='drain'){clock+=20000;return '';}
      if(recordedAction==='worker-preflight'&&expireAfterWorkerPreflight)clock+=21*60000;
      if(action==='deploy')return badDeployVersion?'unrecognized output':'Current Version ID: '+(deployVersions[step.id]||'11111111-1111-4111-8111-111111111111')+'\n';
      return '';
    };
    try {
      const deployTripWorker=async({configPath,env:deployEnv})=>{
        try {
          const stdout=execFileSync('npx',['--yes','wrangler@4.28.1','deploy','--config',configPath],{env:deployEnv});
          if(step.id===unknownDeployStep)throw new Error('unknown owned process state');
          return {stdout,terminationConfirmed:step.id!==falseReceiptStep};
        } catch {
          throw Object.assign(new Error('TRIP_REPAIR_WORKER_DEPLOY'),{terminationConfirmed:step.id!==unknownDeployStep});
        }
      };
      await evaluate(withoutImports(step.code),{execFileSync,deployTripWorker,fs:{appendFileSync:(_path,value)=>{for(const line of value.trim().split('\n')){const [key,...rest]=line.split('=');outputs[key]=rest.join('=');}}},process:{env},Date:class extends Date{static now(){return clock;}},console:{log:value=>logs.push(value)},waitForTripStorageEdgeReadiness:async()=>({ok:!edgeUnavailable})});
      states[step.id]={outcome:'success',outputs};
    }catch(error){firstError??=error;states[step.id]={outcome:'failure',outputs,error};}
  }
  return {states,calls,logs,firstError};
}
runOwnerUpgradeWorkflow=workflowFixture;
repairTest('deploy-process workflow unknown primary stop prevents every recovery mutation',async()=>{
  const result=await workflowFixture({failCommand:'deploy',unknownDeployStep:'repair_replace'});
  assert.equal(result.firstError.message,'TRIP_REPAIR_WORKER_DEPLOY');
  assert.equal(result.states.repair_replace.outputs.deploy_intent,'true');
  assert.equal(result.states.repair_replace.outputs.deploy_stopped,undefined);
  assert.deepEqual(result.calls.filter(call=>['maintenance','deploy','restore','drain'].includes(call.action)).map(call=>call.action),['maintenance','drain','deploy']);
  assert.equal(result.calls.some(call=>call.step.startsWith('repair_recovery')),false);
});
repairTest('deploy-process workflow confirmed failed stop permits exactly one normal recovery',async()=>{
  const result=await workflowFixture({failCommand:'deploy'});
  assert.equal(result.firstError.message,'TRIP_REPAIR_WORKER_DEPLOY');
  assert.equal(result.states.repair_replace.outputs.deploy_stopped,'true');
  assert.equal(result.states.repair_recovery_replace.outputs.deploy_stopped,'true');
  assert.equal(result.calls.filter(call=>call.action==='deploy').length,2);
  assert.equal(result.calls.filter(call=>call.action==='restore').length,1);
});
repairTest('deploy-process workflow false resolved receipt is not stop proof',async()=>{
  const result=await workflowFixture({falseReceiptStep:'repair_replace'});
  assert.equal(result.firstError.message,'TRIP_REPAIR_WORKER_DEPLOY');
  assert.equal(result.states.repair_replace.outputs.deploy_stopped,undefined);
  assert.equal(result.calls.filter(call=>call.action==='deploy').length,1);
  assert.equal(result.calls.some(call=>call.action==='restore'||call.step.startsWith('repair_recovery')),false);
});
repairTest('deploy-process workflow unknown recovery stop never restores or replaces again',async()=>{
  const result=await workflowFixture({failCommand:'worker',unknownDeployStep:'repair_recovery_replace'});
  assert.equal(result.firstError.message,'TRIP_REPAIR_WORKER_ATTESTATION');
  assert.equal(result.states.repair_recovery_replace.outputs.deploy_intent,'true');
  assert.equal(result.states.repair_recovery_replace.outputs.deploy_stopped,undefined);
  assert.equal(result.calls.filter(call=>call.action==='deploy').length,2);
  assert.equal(result.calls.filter(call=>call.action==='restore').length,0);
});
repairTest('repair workflow separates full default, repair and unknown selections',()=>{
  assert.match(workflow,/deploy-trip-storage:\r?\n    if: \$\{\{ inputs\.operation == '' \|\| inputs\.operation == 'full-install' \}\}/);
  const erasureOperation=" || inputs.operation == 'existing-owner-erasure-guard'";
  assert.equal(workflow.split(erasureOperation).length,2,'Exactly one new named repair-job route');
  assert.match(workflow,/repair-existing-worker:\r?\n    if: \$\{\{ inputs\.operation == 'existing-worker-repair' \|\| inputs\.operation == 'existing-owner-export-upgrade' \|\| inputs\.operation == 'existing-owner-erasure-guard' \}\}/);
  assert.match(workflow.replace(erasureOperation,''),/repair-existing-worker:\r?\n    if: \$\{\{ inputs\.operation == 'existing-worker-repair' \|\| inputs\.operation == 'existing-owner-export-upgrade' \}\}/);
  assert.match(workflow,/reject-unknown-operation:[\s\S]*?run: exit 1/);assert.equal(steps.length,6);
  assert.doesNotMatch(repairJob,/db push|functions deploy|migrate-trip-storage-to-cloudflare|mark-cloudflare-trip-storage|TRIP_STORAGE_MODE=supabase|TRIP_PSEUDONYM_SECRET_V1|readiness\.mjs publish/);
  assert.match(repairJob,/prepare-cloudflare-trip-storage\.mjs --existing-worker-repair/);
  assert.match(repairJob,/apply-candidate-g-trip-quality-migration\.mjs --verify-only/);
  for(const step of steps.filter(step=>step.id.endsWith('replace')))assert.match(step.text,/timeout-minutes: 7/);
});
repairTest('repair actual workflow node steps preserve exact-main/lease/drain and version receipt',async()=>{
  const result=await workflowFixture();assert.equal(result.firstError,null);
  assert.deepEqual(result.calls.filter(call=>['maintenance','secret','deploy','restore','drain'].includes(call.action)).map(call=>call.action),['maintenance','drain','deploy','restore']);
  assert.equal(result.calls.some(call=>call.action==='secret'),false);
  for(const call of result.calls.filter(call=>call.action==='deploy'))assert.equal(call.options.input,undefined);
  assert.equal(result.calls.some(call=>call.step.startsWith('repair_recovery')),false);assert.equal(result.logs.length,1);assert.match(result.logs[0],/source=a{40} version=11111111/);
  for(const action of ['maintenance','deploy','restore']){const at=result.calls.findIndex(call=>call.action===action);assert.deepEqual(result.calls.slice(at-3,at).map(call=>call.action),['fetch','head','head']);}
});
repairTest('repair failed preflight has no intent and zero recovery/mutation',async()=>{
  const result=await workflowFixture({preflightFailure:true});assert.equal(result.firstError.message,'PREFLIGHT_FAILED');assert.deepEqual(result.calls,[]);
});
for(const action of ['fetch','head','maintenance','edge','drain','worker-preflight','deploy','worker','restore'])
repairTest('repair failure at '+action+' keeps first failure and at most one D1-forward recovery',async()=>{
  const result=await workflowFixture({failCommand:action});assert.ok(result.firstError);assert.doesNotMatch(result.firstError.message,/synthetic secret/);
  const attempted=result.states.repair_quiesce.outputs.intent==='true';
  assert.equal(result.calls.some(call=>call.step==='repair_recovery_replace'),attempted);
  assert.ok(result.calls.filter(call=>call.step==='repair_recovery_replace'&&call.action==='deploy').length<=1);
  assert.ok(result.calls.filter(call=>call.action==='deploy').length<=2);
});
repairTest('repair main drift or insufficient lease cannot reach replacement',async()=>{
  for(const options of [{driftCommand:'head'},{invalidLease:true}]){const result=await workflowFixture(options);assert.ok(result.firstError);assert.equal(result.calls.some(call=>call.action==='secret'||call.action==='deploy'||call.action==='restore'),false);}
});
repairTest('repair secondary recovery failure never masks first failure or starts second replacement',async()=>{
  const result=await workflowFixture({failCommand:'deploy',recoveryFailure:true});assert.equal(result.firstError.message,'TRIP_REPAIR_WORKER_DEPLOY');assert.equal(result.calls.filter(call=>call.action==='deploy').length,1);
});
repairTest('repair unknown recovery Edge or missing deployed version never reports success',async()=>{
  const edge=await workflowFixture({failCommand:'deploy',edgeUnavailable:true});assert.equal(edge.firstError.message,'TRIP_REPAIR_WORKER_DEPLOY');assert.equal(edge.calls.filter(call=>call.action==='deploy').length,1);
  const version=await workflowFixture({badDeployVersion:true});assert.equal(version.firstError.message,'TRIP_REPAIR_DEPLOY_IDENTITY_MISSING');assert.equal(version.calls.filter(call=>call.action==='restore').length,0);
});
for(const stage of ['repair_replace','repair_restore','repair_recovery_quiesce','repair_recovery_replace','repair_recovery_restore'])
repairTest('repair exact-main drift at '+stage+' prevents its mutation',async()=>{
  const result=await workflowFixture({lateDrift:stage,...(stage.startsWith('repair_recovery')?{failCommand:'deploy'}:{})});
  assert.ok(result.firstError);assert.equal(result.calls.some(call=>call.step===stage&&['maintenance','secret','deploy','restore'].includes(call.action)),false);
});
repairTest('repair expiry during signed preflight cannot allow stale primary or recovery deploy',async()=>{
  const result=await workflowFixture({expireAfterWorkerPreflight:true});assert.equal(result.firstError.message,'TRIP_REPAIR_LEASE_INVALID');assert.equal(result.calls.some(call=>call.action==='deploy'||call.action==='restore'),false);
});
repairTest('repair cancellation never starts a failure-recovery mutation',async()=>{
  const result=await workflowFixture({failCommand:'deploy',cancelRecovery:true});assert.equal(result.firstError.message,'TRIP_REPAIR_WORKER_DEPLOY');assert.equal(result.calls.some(call=>call.step.startsWith('repair_recovery')),false);
});
repairTest('repair uses unchanged normal expiring-maintenance behavior, never claims a permanent lock',async()=>{
  const source=fs.readFileSync('supabase/functions/_shared/trip-store.ts','utf8');
  const start=source.indexOf('export function tripStorageMode('),end=source.indexOf('\nfunction activeTripStorageMode',start);
  assert.ok(start>=0&&end>start);
  const body=source.slice(start,end).replace('export function','function').replace(': TripStorageMode','');
  const now=1800000000000,deadline=now+20*60000;
  const result=await evaluate(body+'\nreturn [tripStorageMode(now),tripStorageMode(deadline)];',{
    now,deadline,Deno:{env:{get:()=>`maintenance:${new Date(deadline).toISOString()}`}},
    TRIP_STORAGE_MAINTENANCE_MAX_LEASE_MS:30*60000,GatewayError:class extends Error{},
  });assert.deepEqual(result,['maintenance','d1']);
});
repairTest('deployment workflow requires its own primary receipt after deploy and before/after restore',async()=>{
  const result=await workflowFixture();assert.equal(result.firstError,null);
  const calls=result.calls.filter(call=>Object.hasOwn(call.options?.env||{},'EXPECTED_TRIP_WORKER_VERSION'));
  assert.deepEqual(calls.map(call=>call.step),['repair_replace','repair_restore','repair_restore']);
  assert.ok(calls.every(call=>call.options.env.EXPECTED_TRIP_WORKER_VERSION===result.states.repair_replace.outputs.version));
  assert.match(result.states.repair_replace.outputs.version,/^11111111-/);
});
repairTest('deployment workflow recovery never reuses the failed primary version receipt',async()=>{
  const recovered='22222222-2222-4222-8222-222222222222';
  const result=await workflowFixture({failCommand:'worker',deployVersions:{repair_recovery_replace:recovered}});
  assert.equal(result.firstError.message,'TRIP_REPAIR_WORKER_ATTESTATION');
  assert.equal(result.states.repair_replace.outputs.version,undefined);
  assert.equal(result.states.repair_recovery_replace.outputs.version,recovered);
  const calls=result.calls.filter(call=>call.step==='repair_recovery_restore');
  assert.equal(calls.filter(call=>call.action==='worker').length,2);
  assert.ok(calls.filter(call=>call.action==='worker').every(call=>call.options.env.EXPECTED_TRIP_WORKER_VERSION===recovered));
});
repairTest('owner-upgrade workflow uses one normal deploy, exact predeploy check and no recovery',async()=>{
  const result=await workflowFixture({operation:'existing-owner-export-upgrade'});assert.equal(result.firstError,null);
  assert.equal(result.calls.filter(call=>call.action==='deploy').length,1);
  assert.equal(result.calls.filter(call=>call.action==='upgrade-check').length,1);
  const check=result.calls.findIndex(call=>call.action==='upgrade-check'),deploy=result.calls.findIndex(call=>call.action==='deploy');
  assert.ok(check>=0&&check<deploy);assert.equal(result.calls.some(call=>call.step.startsWith('repair_recovery')),false);
  assert.match(repairJob,/Apply only missing exact owner-export indexes[\s\S]*?if: inputs\.operation == 'existing-owner-export-upgrade'[\s\S]*?REPAIR_LEASE_DEADLINE: \$\{\{ steps\.repair_quiesce\.outputs\.deadline \}\}[\s\S]*?--existing-owner-export-upgrade-apply[\s\S]*?id: repair_replace/);
});
for(const failCommand of ['maintenance','drain','upgrade-check','deploy','worker','restore'])
repairTest('owner-upgrade workflow '+failCommand+' keeps first failure without second deploy/restore',async()=>{
  const result=await workflowFixture({operation:'existing-owner-export-upgrade',failCommand});assert.ok(result.firstError);
  assert.ok(result.calls.filter(call=>call.action==='deploy').length<=1);
  assert.equal(result.calls.some(call=>call.step.startsWith('repair_recovery')),false);
  if(failCommand!=='restore')assert.equal(result.calls.some(call=>call.action==='restore'),false);
});
}

// Active-deployment receipt: the normal verifier, never a historical UUID search.
{
const { test: deploymentTest } = await import('node:test');
const { verifyActiveWorkerDeployment } = await import('./verify-cloudflare-trip-gateway.mjs');
const { compileFunction } = await import('node:vm');
const { boundedFetch, TRIP_STORAGE_NETWORK_TIMEOUT_CODE, TRIP_STORAGE_NETWORK_TIMEOUT_MS } = await import('./lib/bounded-fetch.mjs');
const { normalizeCloudflareGatewayUrl, tripGatewaySignature } = await import('../supabase/functions/_shared/trip-storage.js');
const expected = '11111111-1111-4111-8111-111111111111', other = '22222222-2222-4222-8222-222222222222';
const accountId='a'.repeat(32), apiToken='synthetic-token', workerName='ravradar-trip-gateway';
const valid=()=>({success:true,result:{deployments:[{id:other,strategy:'percentage',versions:[{version_id:expected,percentage:100}],author_email:'do-not-retain@example.invalid',annotations:{private:'do-not-retain'}}]},result_info:{page:1,per_page:1,count:1,total_count:17}});
async function probe({body=valid(),response,fetchImpl,...overrides}={}) {
  const calls=[];
  const result=await verifyActiveWorkerDeployment({accountId,apiToken,workerName,expectedVersion:expected,...overrides,
    fetchImpl:async(input,init)=>{calls.push({input,init});return fetchImpl?fetchImpl(input,init):response||new Response(JSON.stringify(body),{status:200});}});
  return {result,calls};
}
deploymentTest('deployment receipt accepts only active exact100 UUID and emits no extra metadata',async()=>{
  const {result,calls}=await probe();assert.deepEqual(result,{deploymentId:other,versionId:expected});assert.equal(calls.length,1);
  assert.equal(calls[0].input,`https://api.cloudflare.com/client/v4/accounts/${accountId}/workers/scripts/${workerName}/deployments?page=1&per_page=1`);
  assert.equal(calls[0].init.method,'GET');assert.equal(calls[0].init.redirect,'error');assert.equal(calls[0].init.cache,'no-store');assert.equal(calls[0].init.body,undefined);
  assert.equal(calls[0].init.headers.Authorization,'Bearer '+apiToken);assert.equal(calls[0].init.signal.aborted,true);
  assert.doesNotMatch(JSON.stringify(result),/author|private|do-not-retain|token/);
});
deploymentTest('deployment receipt allows omitted optional pagination and unrelated harmless metadata',async()=>{
  const body=valid();delete body.result_info;body.other='ignored';assert.equal((await probe({body})).result.versionId,expected);
});
for(const [label,mutate]of [
  ['mismatch',b=>b.result.deployments[0].versions[0].version_id=other],
  ['historical-only',b=>{b.result.deployments.push(structuredClone(b.result.deployments[0]));b.result.deployments[0].versions[0].version_id=other;}],
  ['split',b=>b.result.deployments[0].versions=[{version_id:expected,percentage:99},{version_id:other,percentage:1}]],
  ['extra-zero',b=>b.result.deployments[0].versions.push({version_id:other,percentage:0})],
  ['string100',b=>b.result.deployments[0].versions[0].percentage='100'],
  ['success-false',b=>b.success=false],['success-absent',b=>delete b.success],['success-string',b=>b.success='true'],
  ['result-array',b=>b.result=[]],['result-null',b=>b.result=null],['rows-null',b=>b.result.deployments=null],['rows-empty',b=>b.result.deployments=[]],
  ['row-null',b=>b.result.deployments=[null]],['versions-null',b=>b.result.deployments[0].versions=null],['version-row-null',b=>b.result.deployments[0].versions=[null]],
  ['deployment-id',b=>b.result.deployments[0].id='not-a-uuid'],['version-id',b=>b.result.deployments[0].versions[0].version_id='not-a-uuid'],
  ['strategy',b=>b.result.deployments[0].strategy='unknown'],['page',b=>b.result_info.page=2],['per-page',b=>b.result_info.per_page=20],['count',b=>b.result_info.count=2],['page-null',b=>b.result_info=null],
])deploymentTest('deployment receipt rejects '+label,async()=>{
  const body=valid();mutate(body);await assert.rejects(probe({body}),{message:'TRIP_STORAGE_WORKER_DEPLOYMENT_UNVERIFIED'});
});
for(const status of [401,403,404,429,500,502,503,504])deploymentTest('deployment receipt HTTP'+status+' fails once without raw error or retry',async()=>{
  let calls=0,cancelled=0;
  const response=new Response(new ReadableStream({start(c){c.enqueue(new TextEncoder().encode('do-not-retain'));},cancel(){cancelled++;}}),{status});
  await assert.rejects(probe({fetchImpl:async()=>{calls++;return response;}}),{message:'TRIP_STORAGE_WORKER_DEPLOYMENT_UNVERIFIED'});
  assert.equal(calls,1);assert.equal(cancelled,1);
});
for(const raw of ['{malformed','null','[]','"provider error with synthetic token"'])deploymentTest('deployment receipt malformed body '+raw.slice(0,12),async()=>{
  await assert.rejects(probe({response:new Response(raw)}),{message:'TRIP_STORAGE_WORKER_DEPLOYMENT_UNVERIFIED'});
});
deploymentTest('deployment receipt bounds streamed bytes and cancels oversize without Content-Length',async()=>{
  let cancelled=0;const response=new Response(new ReadableStream({start(c){c.enqueue(new Uint8Array(65537));},cancel(){cancelled++;}}));
  await assert.rejects(probe({response}),{message:'TRIP_STORAGE_WORKER_DEPLOYMENT_UNVERIFIED'});assert.equal(cancelled,1);
});
deploymentTest('deployment receipt refuses oversized advertised body before reading and cancels',async()=>{
  let cancelled=0;const response=new Response(new ReadableStream({cancel(){cancelled++;}}),{headers:{'content-length':'65537'}});
  await assert.rejects(probe({response}),{message:'TRIP_STORAGE_WORKER_DEPLOYMENT_UNVERIFIED'});assert.equal(cancelled,1);
});
deploymentTest('deployment receipt sanitizes transport rejection',async()=>{
  await assert.rejects(probe({fetchImpl:async()=>{throw new Error('do-not-retain raw provider token');}}),{message:'TRIP_STORAGE_WORKER_DEPLOYMENT_UNVERIFIED'});
});
deploymentTest('deployment receipt bounds held transport and awaits its abort',async()=>{
  let aborted=false,transport;
  try {await assert.rejects(probe({timeoutMs:5,fetchImpl:(_input,{signal})=>transport=new Promise((_,reject)=>signal.addEventListener('abort',()=>{aborted=true;reject(new Error('private timeout cause'));},{once:true}))}),{message:'TRIP_STORAGE_WORKER_DEPLOYMENT_UNVERIFIED'});}
  finally {await transport?.catch(()=>{});}assert.equal(aborted,true);
});
deploymentTest('deployment receipt bounds held body and closes stream',async()=>{
  let cancelled=0;const response=new Response(new ReadableStream({cancel(){cancelled++;}}));
  await assert.rejects(probe({timeoutMs:5,response}),{message:'TRIP_STORAGE_WORKER_DEPLOYMENT_UNVERIFIED'});assert.equal(cancelled,1);
});
for(const overrides of [{expectedVersion:''},{expectedVersion:undefined},{expectedVersion:other.slice(1)},{workerName:'other-worker'},{accountId:'../different'},{apiToken:''}])deploymentTest('deployment receipt invalid intent makes zero HTTP '+JSON.stringify(overrides),async()=>{
  let calls=0;await assert.rejects(probe({...overrides,fetchImpl:async()=>{calls++;return new Response('{}');}}),{message:'TRIP_STORAGE_WORKER_DEPLOYMENT_UNVERIFIED'});assert.equal(calls,0);
});
async function verifierMain({claim,body=valid(),badConfig=false}={}) {
  let code=fs.readFileSync('scripts/verify-cloudflare-trip-gateway.mjs','utf8').replaceAll('\r\n','\n');
  code=code.slice(0,code.lastIndexOf('\nif (process.argv[1]')).replace(/^import[\s\S]*?from ['"][^'"]+['"];\n/gm,'').replace(/^export /gm,'');
  const calls=[],logs=[],configReads=[];
  const fetchImpl=async(input,init)=>{
    calls.push({input:String(input),init});
    if(String(input).includes('api.cloudflare.com'))return new Response(JSON.stringify(body));
    if(String(input).endsWith('/health'))return new Response(JSON.stringify({ok:true,contract_version:'4.0.311',shards:10,storage_schema_version:1,idempotency_registry_schema_version:2,owner_erasure_tombstone_schema_version:1,trip_export_version:1}));
    return init.headers['X-RavRadar-Signature']?new Response(JSON.stringify({ok:true,trip_count:0})):new Response('',{status:401});
  };
  const env={CLOUDFLARE_TRIP_GATEWAY_URL:'https://synthetic-gateway.example.workers.dev',TRIP_GATEWAY_SHARED_SECRET:'synthetic-existing-shared-secret-with-32-characters',CLOUDFLARE_ACCOUNT_ID:accountId,CLOUDFLARE_API_TOKEN:apiToken,TRIP_WRANGLER_CONFIG_PATH:'/synthetic/config'};
  if(claim!==undefined)env.EXPECTED_TRIP_WORKER_VERSION=claim;
  let error;try{await compileFunction('return(async()=>{'+code+'\nawait main();})();',['fs','process','fetch','globalThis','boundedFetch','TRIP_STORAGE_NETWORK_TIMEOUT_CODE','TRIP_STORAGE_NETWORK_TIMEOUT_MS','normalizeCloudflareGatewayUrl','tripGatewaySignature','console'])(
    {readFileSync:p=>{configReads.push(p);return JSON.stringify({name:badConfig?'wrong-worker':workerName});}},{env},fetchImpl,{fetch:fetchImpl},boundedFetch,TRIP_STORAGE_NETWORK_TIMEOUT_CODE,TRIP_STORAGE_NETWORK_TIMEOUT_MS,normalizeCloudflareGatewayUrl,tripGatewaySignature,{log:value=>logs.push(value)});
  }catch(caught){error=caught;}return{calls,logs,configReads,error};
}
deploymentTest('deployment normal CLI default retains exactly original three probes and no config/provider read',async()=>{
  const result=await verifierMain();assert.equal(result.error,undefined);assert.equal(result.calls.length,3);assert.deepEqual(result.configReads,[]);assert.equal(result.logs.length,1);
});
deploymentTest('deployment normal CLI optional healthy claim performs one bounded active metadata read',async()=>{
  const result=await verifierMain({claim:expected});assert.equal(result.error,undefined);assert.equal(result.calls.length,4);assert.deepEqual(result.configReads,['/synthetic/config']);assert.equal(result.logs.length,1);assert.doesNotMatch(JSON.stringify(result.logs),/author|do-not-retain|token/);
});
deploymentTest('deployment normal CLI optional mismatched claim cannot print normal success',async()=>{
  const body=valid();body.result.deployments[0].versions[0].version_id=other;const result=await verifierMain({claim:expected,body});assert.equal(result.error?.message,'TRIP_STORAGE_WORKER_DEPLOYMENT_UNVERIFIED');assert.deepEqual(result.logs,[]);
});
deploymentTest('deployment normal CLI empty required claim cannot silently fall back to default',async()=>{
  const result=await verifierMain({claim:''});assert.equal(result.error?.message,'TRIP_STORAGE_WORKER_DEPLOYMENT_UNVERIFIED');assert.deepEqual(result.logs,[]);assert.equal(result.calls.length,3);
});
deploymentTest('deployment normal CLI wrong config cannot query another Worker',async()=>{
  const result=await verifierMain({claim:expected,badConfig:true});assert.equal(result.error?.message,'TRIP_STORAGE_WORKER_DEPLOYMENT_UNVERIFIED');assert.deepEqual(result.logs,[]);assert.equal(result.calls.length,3);
});
}

// Active-deployment cleanup must not await an unbounded stream cancel promise.
{
const { test: deploymentCleanupTest } = await import('node:test');
const { verifyActiveWorkerDeployment } = await import('./verify-cloudflare-trip-gateway.mjs');
const accountId='a'.repeat(32), expectedVersion='11111111-1111-4111-8111-111111111111';
const deploymentId='22222222-2222-4222-8222-222222222222';
const receipt=()=>({success:true,result:{deployments:[{id:deploymentId,strategy:'percentage',versions:[{version_id:expectedVersion,percentage:100}]}]}});
const options={accountId,apiToken:'synthetic-token',workerName:'ravradar-trip-gateway',expectedVersion};
const failure='TRIP_STORAGE_WORKER_DEPLOYMENT_UNVERIFIED';
for(const kind of ['advertised-oversize','streamed-oversize','malformed-utf8','held-read'])deploymentCleanupTest('deployment cleanup pending cancel '+kind,async()=>{
  let finishCancel,cancelRequested=0,cancelCompleted=false,signal,observer;
  const cancellation=new Promise(resolve=>{finishCancel=()=>{cancelCompleted=true;resolve();};});
  const stream=new ReadableStream({start(controller){
    if(kind==='streamed-oversize')controller.enqueue(new Uint8Array(65_537));
    if(kind==='malformed-utf8')controller.enqueue(new Uint8Array([255]));
  },cancel(){cancelRequested++;return cancellation;}});
  const response=new Response(stream,kind==='advertised-oversize'?{headers:{'content-length':'65537'}}:{});
  const operation=verifyActiveWorkerDeployment({...options,timeoutMs:10,fetchImpl:async(_url,init)=>{signal=init.signal;return response;}})
    .then(value=>({value}),error=>({error}));
  const notSettled=Symbol('observer expired');
  try{
    const result=await Promise.race([operation,new Promise(resolve=>{observer=setTimeout(()=>resolve(notSettled),150);})]);
    assert.notEqual(result,notSettled,'verification must settle even while underlying cancel remains pending');
    assert.equal(result.error?.message,failure);assert.equal(result.value,undefined);
    assert.equal(cancelRequested,1);assert.equal(cancelCompleted,false);
    assert.equal(signal.aborted,true);assert.equal(stream.locked,false);
  }finally{clearTimeout(observer);finishCancel();await cancellation;await operation;}
});
for(const valid of [true,false])deploymentCleanupTest('deployment cleanup full EOF preserves '+(valid?'success':'malformed failure'),async()=>{
  let cancelled=0,signal;const stream=new ReadableStream({start(controller){controller.enqueue(new TextEncoder().encode(valid?JSON.stringify(receipt()):'{malformed'));controller.close();},cancel(){cancelled++;return new Promise(()=>{});}});
  let result,error;try{result=await verifyActiveWorkerDeployment({...options,fetchImpl:async(_url,init)=>{signal=init.signal;return new Response(stream);}});}catch(caught){error=caught;}
  if(valid){assert.equal(error,undefined);assert.deepEqual(result,{deploymentId,versionId:expectedVersion});}
  else{assert.equal(error?.message,failure);assert.equal(result,undefined);}
  assert.equal(cancelled,0);assert.equal(signal.aborted,true);assert.equal(stream.locked,false);
});
deploymentCleanupTest('deployment cleanup rejected cancellation preserves first sanitized failure',async()=>{
  let cancelled=0;const stream=new ReadableStream({cancel(){cancelled++;return Promise.reject(new Error('synthetic raw cancellation error'));}});
  await assert.rejects(verifyActiveWorkerDeployment({...options,fetchImpl:async()=>new Response(stream,{headers:{'content-length':'65537'}})}),{message:failure});
  await Promise.resolve();assert.equal(cancelled,1);assert.equal(stream.locked,false);
});
for(const id of [[deploymentId],null,{},42])deploymentCleanupTest('deployment receipt rejects nonstring deployment ID '+JSON.stringify(id),async()=>{
  const body=receipt();body.result.deployments[0].id=id;
  await assert.rejects(verifyActiveWorkerDeployment({...options,fetchImpl:async()=>new Response(JSON.stringify(body))}),{message:failure});
});
for(const descriptor of [[accountId],{toString:()=>accountId},null,42])deploymentCleanupTest('deployment receipt rejects nonstring account descriptor '+(Array.isArray(descriptor)?'array':typeof descriptor),async()=>{
  let calls=0;await assert.rejects(verifyActiveWorkerDeployment({...options,accountId:descriptor,fetchImpl:async()=>{calls++;return new Response(JSON.stringify(receipt()));}}),{message:failure});
  assert.equal(calls,0);
});
}

// Owned deploy lifecycle: additive to the same normal repair source target.
{
const { test: processTest } = await import('node:test');
const { EventEmitter } = await import('node:events');
const { spawn: realSpawn } = await import('node:child_process');
const { setTimeout: realDelay } = await import('node:timers/promises');
const { deployTripWorker } = await import('./lib/trip-worker-deploy-process.mjs');
async function processFixture(scenario, overrides = {}) {
  const host = Object.assign(new EventEmitter(), { platform: 'linux' });
  const child = Object.assign(new EventEmitter(), { pid: 24444, unref() { this.unreferenced = true; } });
  for (const key of ['stdout', 'stderr']) child[key] = Object.assign(new EventEmitter(), { destroy() { this.destroyed = true; } });
  let clock = 0, group = true, tick = 0, spawned = false;
  const signals = [], calls = [];
  const finish = code => { group = false; child.emit('exit', code, code === 0 ? null : 'SIGTERM'); child.emit('close'); };
  const options = { configPath: '/own/generated/config.json', env: { OWN_SYNTHETIC: 'true' }, timeoutMs: 40,
    termGraceMs: 20, killGraceMs: 20, processImpl: host, now: () => clock,
    spawnImpl(command, args, opts) {
      calls.push({ command, args, opts });
      if (scenario === 'spawn-throw') throw new Error('private provider text');
      spawned = true;
      if (scenario === 'spawn-error') delete child.pid;
      return child;
    },
    killImpl(pid, signal) {
      assert.equal(pid, -24444, 'only the newly owned process group');
      if (signal === 0) {
        if (scenario === 'probe-unknown') throw Object.assign(new Error('private'), { code: 'EPERM' });
        if (!group) throw Object.assign(new Error('gone'), { code: 'ESRCH' });
        return true;
      }
      signals.push(signal);
      if (scenario === 'termination-unknown' || scenario === 'probe-unknown') return true;
      if (scenario === 'needs-kill' && signal === 'SIGTERM') return true;
      if (scenario === 'close-missing') { group = false; return true; }
      finish(1); return true;
    },
    async delay(ms) {
      clock += ms;
      if (++tick !== 1) return;
      if (scenario === 'success') { child.stdout.emit('data', Buffer.from('Current Version ID: own-version\n')); finish(0); }
      if (scenario === 'nonzero') { group = false; child.emit('exit', 1, null); child.emit('close'); }
      if (scenario === 'lingering' || scenario === 'probe-unknown') { child.emit('exit', 0, null); child.emit('close'); }
      if (scenario === 'stdout-limit' || scenario === 'stderr-limit') child[scenario.split('-')[0]].emit('data', Buffer.alloc(1024 * 1024 + 1));
      if (scenario === 'stream-error') child.stdout.emit('error', new Error('private payload'));
      if (scenario === 'spawn-error') { group = false; child.emit('error', new Error('private spawn')); child.emit('close'); }
      if (scenario === 'interrupt') host.emit('SIGTERM');
      if (scenario === 'close-missing') { group = false; child.emit('exit', 0, null); }
    }, ...overrides,
  };
  let value, error;
  try { value = await deployTripWorker(options); } catch (caught) { error = caught; }
  assert.equal(host.listenerCount('SIGINT') + host.listenerCount('SIGTERM'), 0);
  assert.ok(clock <= 80, 'execution plus cleanup stays bounded');
  return { value, error, calls, signals, child, spawned };
}
processTest('deploy-process fixed pinned command, owned group and positive closed receipt', async () => {
  const result = await processFixture('success');
  assert.equal(result.error, undefined); assert.equal(result.value.terminationConfirmed, true);
  assert.equal(result.value.stdout, 'Current Version ID: own-version\n');
  assert.deepEqual(result.calls[0], { command: 'npx', args: ['--yes', 'wrangler@4.28.1', 'deploy', '--config', '/own/generated/config.json'],
    opts: { env: { OWN_SYNTHETIC: 'true' }, detached: true, stdio: ['ignore', 'pipe', 'pipe'] } });
  assert.deepEqual(result.signals, []);
});
for (const [scenario, reason, signals] of [
  ['timeout', 'timeout', ['SIGTERM']], ['needs-kill', 'timeout', ['SIGTERM', 'SIGKILL']],
  ['nonzero', 'exit', []], ['lingering', 'descendants', ['SIGTERM']],
  ['stdout-limit', 'stdout-limit', ['SIGTERM']], ['stderr-limit', 'stderr-limit', ['SIGTERM']],
  ['stream-error', 'stdout', ['SIGTERM']], ['interrupt', 'interrupted', ['SIGTERM']],
  ['spawn-throw', 'spawn', []], ['spawn-error', 'spawn', []],
]) processTest('deploy-process preserves first '+scenario+' error after observed stop', async () => {
  const result = await processFixture(scenario);
  assert.equal(result.value, undefined); assert.equal(result.error.message, 'TRIP_REPAIR_WORKER_DEPLOY');
  assert.equal(result.error.reason, reason); assert.equal(result.error.terminationConfirmed, true);
  assert.deepEqual(result.signals, signals); assert.doesNotMatch(JSON.stringify(result.error), /private/);
});
for (const [scenario, reason] of [['termination-unknown', 'timeout'], ['probe-unknown', 'descendants'], ['close-missing', 'timeout']])
processTest('deploy-process '+scenario+' is bounded but never claims stop', async () => {
  const result = await processFixture(scenario);
  assert.equal(result.value, undefined); assert.equal(result.error.reason, reason);
  assert.equal(result.error.terminationConfirmed, false); assert.equal(result.child.unreferenced, true);
  assert.equal(result.child.stdout.destroyed, true); assert.equal(result.child.stderr.destroyed, true);
});
processTest('deploy-process non-Linux and invalid bounds have zero process intent', async () => {
  for (const overrides of [{ processImpl: Object.assign(new EventEmitter(), { platform: 'win32' }) }, { timeoutMs: 180001 }, { configPath: '' }]) {
    const result = await processFixture('success', overrides);
    assert.equal(result.error.reason, 'invalid-options'); assert.equal(result.error.terminationConfirmed, true); assert.deepEqual(result.calls, []);
  }
});
processTest('deploy-process Linux real neutral descendant cannot act after timeout stop receipt', { skip: process.platform !== 'linux' }, async () => {
  let child, captured = '', receipt;
  const signals = [];
  // Fixed own neutral process only. No npm/Cloudflare/credentials/network.
  const leaf = `process.on('SIGTERM',()=>{}); console.log('LEAF '+process.pid); setTimeout(()=>console.log('LATE-NEUTRAL-ACTION'),1800); setTimeout(()=>process.exit(0),2200);`;
  const wrapper = `const{spawn}=require('node:child_process'); console.log('WRAPPER '+process.pid); const c=spawn(process.execPath,['-e',${JSON.stringify(leaf)}],{stdio:'inherit'}); process.on('SIGTERM',()=>{}); c.on('exit',()=>{}); setTimeout(()=>process.exit(0),2500).unref();`;
  const groupGone = () => { try { process.kill(-child.pid, 0); return false; } catch (error) { if (error.code === 'ESRCH') return true; throw error; } };
  try {
    await assert.rejects(deployTripWorker({ configPath: '/own/no-provider/config', env: {}, timeoutMs: 400, termGraceMs: 50, killGraceMs: 1000,
      spawnImpl(command, args, options) {
        assert.equal(command, 'npx'); assert.equal(args[1], 'wrangler@4.28.1'); assert.equal(options.detached, true);
        child = realSpawn(process.execPath, ['-e', wrapper], options);
        child.stdout.on('data', chunk => { captured += chunk; }); return child;
      },
      killImpl(pid, signal) { assert.equal(pid, -child.pid); if (signal) signals.push(signal); return process.kill(pid, signal); },
    }), error => { receipt = error; return error.message === 'TRIP_REPAIR_WORKER_DEPLOY'; });
    assert.match(captured, /LEAF \d+/); assert.match(captured, /WRAPPER \d+/);
    assert.equal(receipt.reason, 'timeout'); assert.equal(receipt.terminationConfirmed, true);
    assert.deepEqual(signals, ['SIGTERM', 'SIGKILL']); assert.equal(groupGone(), true);
    await realDelay(30); assert.doesNotMatch(captured, /LATE-NEUTRAL-ACTION/);
  } finally {
    if (child) {
      if (!groupGone()) { try { process.kill(-child.pid, 'SIGKILL'); } catch (error) { if (error.code !== 'ESRCH') throw error; } }
      for (let i = 0; i < 150 && !groupGone(); i++) await realDelay(20);
      assert.equal(groupGone(), true, 'all owned neutral group processes observed gone');
    }
  }
});
}

// Actual normal verifier CLI body; HTTP and time are synthetic, never hosted.
const { test: upgradeCliTest } = await import('node:test');
async function existingUpgradeCli({ preUpgrade, exportVersion = null, source = normalVerifierSource } = {}) {
  const calls = [];
  const fixtureFetch = async (url, init = {}) => {
    const functionName = String(url).includes('/trip-log') ? 'trip-log' : 'submit-observation';
    const headers = new Headers({ 'x-ravradar-trip-contract-version': '4.0.311', 'x-ravradar-trip-storage-mode': 'd1' });
    if (functionName === 'trip-log' && exportVersion !== null) headers.set('x-ravradar-trip-export-version', exportVersion);
    const allowed = new Headers(init.headers).get('origin') === 'https://ravradar.dk';
    if (allowed) headers.set('access-control-allow-origin','https://ravradar.dk');
    calls.push({ functionName, method: init.method, body: init.body, signed: new Headers(init.headers).has('x-ravradar-trip-signature') });
    if (!allowed) return new Response('', { status:403, headers });
    if (init.method === 'OPTIONS') return new Response(null,{status:204,headers});
    if (functionName === 'trip-log') return Response.json({error:'LOGIN_REQUIRED'},{status:401,headers});
    const body = JSON.parse(init.body || '{}');
    const error = body.calibration_eligible === true ? 'TRIP_CALIBRATION_ELIGIBILITY_INVALID'
      : body.schema_version === 2 ? 'TRIP_DATA_QUALITY_FLAGS_INVALID' : 'INVALID_OBSERVATION';
    return Response.json({error},{status:400,headers});
  };
  const readiness = await import('./lib/trip-storage-edge-readiness.mjs');
  const { boundedFetch } = await import('./lib/bounded-fetch.mjs');
  const env = { SUPABASE_URL:'https://synthetic.invalid',SUPABASE_PUBLISHABLE_KEY:'synthetic',EXPECTED_TRIP_STORAGE_MODE:'d1',
    TRIP_GATEWAY_SHARED_SECRET:'synthetic-existing-secret-at-least-32-characters',
    ...(preUpgrade === undefined ? {} : {TRIP_STORAGE_UPGRADE_PREFLIGHT:preUpgrade}) };
  let error = null;
  try {
    await new (Object.getPrototypeOf(async function(){}).constructor)('scope',
      'const { PUBLIC_CONFIG,process,crypto,console,createBoundedFetch,waitForTripStorageEdgeReadiness,runTripStorageNoWriteContractProbe,matchesTripStorageReadiness,TRIP_STORAGE_EDGE_FETCH_TIMEOUT_MS,TRIP_STORAGE_EDGE_SIGNED_LOGIN_PROBE_KIND,TRIP_STORAGE_EDGE_PREFLIGHT_PROBE_KIND } = scope;\n'
      + source.replace(/^import[\s\S]*?;\r?\n/gm,''))({
      ...readiness, PUBLIC_CONFIG:{}, process:{env}, crypto:globalThis.crypto, console:{log(){}},
      createBoundedFetch: options => (url, init) => boundedFetch(url,init,{...options,fetchImpl:fixtureFetch}),
      waitForTripStorageEdgeReadiness: options => readiness.waitForTripStorageEdgeReadiness({...options,fetchImpl:fixtureFetch,retryDelaysMs:[0,0]}),
      runTripStorageNoWriteContractProbe: options => readiness.runTripStorageNoWriteContractProbe({...options,fetchImpl:fixtureFetch,sleepImpl:async()=>{}}),
    });
  } catch (cause) { error = cause; }
  return { calls, error };
}
upgradeCliTest('owner-upgrade CLI: exact preflight1 admits an existing no-export Edge through all normal read-only probes',async()=>{
  const result=await existingUpgradeCli({preUpgrade:'1'});assert.equal(result.error,null,result.error?.stack);
  assert.ok(result.calls.some(call=>call.functionName==='trip-log'&&call.method!=='OPTIONS'));
  assert.ok(result.calls.every(call=>call.functionName!=='trip-log'||call.method!=='POST'));
});
for(const preUpgrade of [undefined,'0','true']) upgradeCliTest('owner-upgrade CLI: missing export stays rejected for final/default '+String(preUpgrade),async()=>{
  const result=await existingUpgradeCli({preUpgrade});assert.ok(result.error);
  assert.equal(result.calls.some(call=>call.functionName==='trip-log'&&call.method!=='OPTIONS'),false);
});
for(const exportVersion of ['0','2','01']) upgradeCliTest('owner-upgrade CLI: preflight never accepts unknown explicit capability '+exportVersion,async()=>{
  const result=await existingUpgradeCli({preUpgrade:'1',exportVersion});assert.ok(result.error);
});
upgradeCliTest('owner-upgrade CLI: final0 requires and accepts installed capability1',async()=>{
  const result=await existingUpgradeCli({preUpgrade:'0',exportVersion:'1'});assert.equal(result.error,null,result.error?.stack);
});

// Normal signed owner-erasure reads: unknown results cannot authorize access, storage or purge.
{
const { default: test } = await import('node:test');
const { handleRequest } = await import('../cloudflare/trip-gateway/worker.js');
const { externalOwnerSubject, externalTripRecord, exportCloudflareTripPage } = await import('../supabase/functions/_shared/trip-storage.js');
const sharedSecret = 'synthetic-owner-export-readback-secret-at-least-32-characters';
const gatewayUrl = 'https://synthetic-owner-export-readback.example.workers.dev';
const owner = await externalOwnerSubject({ userId: '11111111-1111-4111-8111-111111111111', secret: sharedSecret });
const payload = { client_observation_id: '33333333-3333-4333-8333-333333333333',
  trip_id: null, observed_at: '2000-01-01T10:00:00.000Z', submitted_at: '2000-01-01T11:00:00.000Z',
  actual_zone_id: 'DK-B01-01', actual_coastal_part_id: 'DK-B01-01-P01', hunt_mode: 'beach', found: false, result: 'none' };
const record = await externalTripRecord({ owner, payload });
const row = { client_observation_id: record.client_observation_id, owner_subject: owner.subject,
  created_at: '2000-01-01T12:00:00.000Z', payload_json: record.payload_json, payload_sha256: record.payload_sha256 };
const tombstoneSql = 'select owner_subject from trip_owner_erasure_tombstones where owner_subject = ? limit 1';
const exportSql = 'select client_observation_id, owner_subject, created_at, payload_json, payload_sha256 from trip_observations where owner_subject = ? and client_observation_id > ? and created_at <= ? order by client_observation_id asc limit ?';

async function read({ faultAt = 0, invalid, erased = false, throwing = false } = {}) {
  let tombstoneReads = 0, payloadReads = 0, requests = 0;
  const original = JSON.stringify(row);
  const env = { TRIP_GATEWAY_SHARED_SECRET: sharedSecret };
  for (let shard = 0; shard < 10; shard += 1) env[`TRIP_DB_${shard}`] = { prepare(sql) {
    const normalized = sql.replace(/\s+/g, ' ').trim();
    assert.ok([tombstoneSql, exportSql].includes(normalized), 'No new SQL, write or route in this read-only fixture');
    return { bind(...args) { return { async all() {
      assert.equal(args[0], owner.subject);
      if (normalized === tombstoneSql) {
        assert.equal(shard, 0); tombstoneReads += 1;
        if (tombstoneReads === faultAt) {
          if (throwing) throw new Error('SYNTHETIC_PRIVATE_D1_CAUSE');
          return structuredClone(invalid);
        }
        return { success: true, results: erased ? [{ owner_subject: owner.subject }] : [] };
      }
      payloadReads += 1; assert.equal(args[1], ''); assert.equal(args[3], 201);
      assert.ok(Date.parse(args[2]) > Date.parse(row.created_at));
      return { success: true, results: shard === 3 ? [structuredClone(row)] : [] };
    } }; } };
  } };
  const result = await exportCloudflareTripPage({ gatewayUrl, sharedSecret, ownerSubject: owner.subject,
    fetchImpl: async (input, init) => {
      const request = new Request(input, init); requests += 1;
      assert.equal(new URL(request.url).origin, gatewayUrl);
      assert.equal(new URL(request.url).pathname, '/v1/trips/export-page');
      assert.equal(request.method, 'POST');
      assert.deepEqual(await request.clone().json(), { owner_subject: owner.subject, cursor: null });
      const response = await handleRequest(request, env);
      if (response.status !== 200) assert.deepEqual(await response.clone().json(), { ok: false, error: 'INVALID_REQUEST' });
      return response;
    },
  }).then(value => ({ ok: true, value }), error => ({ ok: false, error }));
  assert.equal(JSON.stringify(row), original); assert.equal(requests, 1);
  if (!result.ok) assert.equal(String(result.error.stack).includes('SYNTHETIC_PRIVATE_D1_CAUSE'), false);
  return { ...result, tombstoneReads, payloadReads };
}

for (const faultAt of [1, 2]) for (const [label, invalid] of [
  ['absent response', undefined], ['absent rows', { success: true }],
  ['explicit failed read', { success: false, results: [], error: 'SYNTHETIC_PRIVATE_D1_CAUSE' }],
  ['non-array empty rows', { success: true, results: { length: 0 } }],
]) test(`actual signed export rejects ${label} at tombstone read ${faultAt}`, async () => {
  const result = await read({ faultAt, invalid });
  assert.equal(result.ok, false, 'Unknown erasure state must not yield a successful complete owner export');
  assert.match(result.error.message, /REQUEST_REJECTED/);
  assert.equal(result.payloadReads, faultAt === 1 ? 0 : 10);
});


for (const faultAt of [1,2]) for (const [label,receipt] of [['missing',{}],['null',{success:null}],['nonboolean',{success:'true'}]])
test('ack: actual signed export rejects ' + label + ' tombstone acknowledgment at ' + faultAt, async () => {
  const result = await read({faultAt,invalid:{...receipt,results:[]}});
  assert.equal(result.ok,false);assert.match(result.error.message,/REQUEST_REJECTED/);
  assert.equal(result.payloadReads,faultAt===1?0:10);assert.equal(result.tombstoneReads,faultAt);
});
test('ack: positively acknowledged no-erasure state preserves exact own export and original bytes', async () => {
  const result = await read();assert.equal(result.ok,true);
  assert.deepEqual(result.value.rows,[JSON.parse(record.payload_json)]);assert.equal(result.value.next_cursor,null);
  assert.equal(result.tombstoneReads,2);assert.equal(result.payloadReads,10);
});
test('control confirmed no tombstone exports the exact stored original once', async () => {
  const result = await read(); assert.equal(result.ok, true);
  assert.deepEqual(result.value.rows, [JSON.parse(record.payload_json)]);
  assert.equal(result.value.next_cursor, null); assert.equal(result.tombstoneReads, 2); assert.equal(result.payloadReads, 10);
});
test('control confirmed owner tombstone refuses before any payload read', async () => {
  const result = await read({ erased: true }); assert.equal(result.ok, false);
  assert.match(result.error.message, /REQUEST_REJECTED/); assert.equal(result.payloadReads, 0);
});
test('control thrown final tombstone read refuses without private cause', async () => {
  const result = await read({ faultAt: 2, throwing: true }); assert.equal(result.ok, false);
  assert.match(result.error.message, /REQUEST_REJECTED/); assert.equal(result.payloadReads, 10);
});

for (const faultAt of [1, 2]) for (const [label, rows] of [
  ['multiple rows', [{ owner_subject: owner.subject }, { owner_subject: owner.subject }]], ['null row', [null]],
]) test('actual signed export rejects malformed ' + label + ' at tombstone read ' + faultAt, async () => {
  const result = await read({ faultAt, invalid: { success: true, results: rows } });
  assert.equal(result.ok, false); assert.match(result.error.message, /REQUEST_REJECTED/);
  assert.equal(result.payloadReads, faultAt === 1 ? 0 : 10);
});
}


// D1 acknowledgment integrity through the actual normal signed owner routes.
{
const { default: test } = await import('node:test');
const { default: fs } = await import('node:fs');
const { handleRequest } = await import('../cloudflare/trip-gateway/worker.js');
const { externalOwnerSubject, externalTripRecord, exportCloudflareTripPage, deleteCloudflareTrips } = await import('../supabase/functions/_shared/trip-storage.js');
const workerUrl = new URL('../cloudflare/trip-gateway/worker.js', import.meta.url);
const workerBefore = fs.readFileSync(workerUrl);
const sharedSecret = 'synthetic-driver-status-only-secret-at-least-32-characters';
const gatewayUrl = 'https://synthetic-driver-status.example.workers.dev';
const owner = await externalOwnerSubject({ userId: '11111111-1111-4111-8111-111111111111', secret: sharedSecret });
const record = await externalTripRecord({ owner, payload: {
  client_observation_id: '33333333-3333-4333-8333-333333333333', trip_id: null,
  observed_at: '2000-01-01T10:00:00.000Z', submitted_at: '2000-01-01T11:00:00.000Z',
  actual_zone_id: 'DK-B01-01', actual_coastal_part_id: 'DK-B01-01-P01', hunt_mode: 'beach', found: false, result: 'none',
} });
const row = { client_observation_id: record.client_observation_id, owner_subject: owner.subject,
  created_at: '2000-01-01T12:00:00.000Z', payload_json: record.payload_json, payload_sha256: record.payload_sha256 };

const erasureMarkers = Array.from({length:10},(_,i)=>['tombstone',i]);
const erasureOrder = [...erasureMarkers,...Array.from({length:10},(_,i)=>['purge',i]),['registry',0],
  ...Array.from({length:10},(_,i)=>['physical-read',i]),['registry-empty-read',0]];
async function normal(mode, { fault = null, faulty, faultShard = 3, markerFaultShard = 0, eraseDuringRead = false, throwing = false, empty = false, purgeCounts = null } = {}) {
  const events = [], statuses = [], original = JSON.stringify(row);
  let tombstoned = false, requests = 0;
  const env = { TRIP_GATEWAY_SHARED_SECRET: sharedSecret };
  for (let shard = 0; shard < 10; shard++) env[`TRIP_DB_${shard}`] = { prepare(sql) {
    const query = sql.replace(/\s+/g, ' ').trim();
    return { bind(...args) { return {
      async all() {
        if (query === 'select owner_subject from trip_observations where owner_subject = ? limit 1'
          || query === 'select owner_subject from trip_observation_registry where owner_subject = ? limit 1') {
          assert.equal(mode, 'delete'); assert.deepEqual(args, [owner.subject]);
          const stage = query.includes('trip_observation_registry') ? 'registry-empty-read' : 'physical-read';
          if (stage === 'registry-empty-read') assert.equal(shard, 0);
          events.push([stage, shard]);
          if (fault === stage && (stage !== 'physical-read' || shard === faultShard)) {
            if (throwing) throw faulty;
            return structuredClone(faulty);
          }
          return { success: true, results: [] };
        }
        assert.equal(args[0], owner.subject); events.push(['read', shard, query]);
        if (query === 'select owner_subject from trip_owner_erasure_tombstones where owner_subject = ? limit 1') {
          assert.equal(shard, 0);
          return { success: true, results: tombstoned ? [{ owner_subject: owner.subject }] : [] };
        }
        assert.equal(mode, 'export');
        assert.equal(query, 'select client_observation_id, owner_subject, created_at, payload_json, payload_sha256 from trip_observations where owner_subject = ? and client_observation_id > ? and created_at <= ? order by client_observation_id asc limit ?');
        assert.equal(args[1], ''); assert.equal(args[3], 201);
        if (eraseDuringRead && shard === 5) { await Promise.resolve(); tombstoned = true; }
        if (fault === 'read' && shard === faultShard) { if (throwing) throw faulty; return structuredClone(faulty); }
        return { success: true, results: !empty && shard === 3 ? [structuredClone(row)] : [] };
      },
      async run() {
        assert.equal(mode, 'delete'); assert.deepEqual(args, [owner.subject]);
        const stage = query.startsWith('insert into trip_owner_erasure_tombstones ') ? 'tombstone'
          : query === 'delete from trip_observations where owner_subject = ?' ? 'purge'
            : query === 'delete from trip_observation_registry where owner_subject = ?' ? 'registry' : null;
        assert.ok(stage); events.push([stage, shard]);
        if (stage === 'registry') assert.equal(shard, 0);
        if (fault === stage && (stage !== 'purge' || shard === faultShard)
          && (stage !== 'tombstone' || shard === markerFaultShard)) { if (throwing) throw faulty; return structuredClone(faulty); }
        if (stage === 'tombstone') tombstoned = true;
        // Synthetic acknowledgment only: no file, database or record is deleted.
        return { success: true, meta: { changes: stage === 'purge' ? (purgeCounts?.[shard] ?? (!empty && shard === 3 ? 1 : 0)) : 0 } };
      },
    }; } };
  } };
  const fetchImpl = async (input, init) => {
    const request = new Request(input, init); requests++;
    assert.equal(new URL(request.url).origin, gatewayUrl);
    assert.equal(new URL(request.url).pathname, mode === 'export' ? '/v1/trips/export-page' : '/v1/trips/delete-owner');
    const response = await handleRequest(request, env); statuses.push(response.status);
    if (response.status !== 200) assert.deepEqual(await response.clone().json(), { ok: false, error: 'INVALID_REQUEST' });
    return response;
  };
  try {
    const args = { gatewayUrl, sharedSecret, ownerSubject: owner.subject, fetchImpl };
    const result = await (mode === 'export' ? exportCloudflareTripPage(args) : deleteCloudflareTrips(args))
      .then(value => ({ ok: true, value }), error => ({ ok: false, error }));
    assert.equal(requests, 1); assert.equal(JSON.stringify(row), original);
    if (!result.ok) assert.equal(String(result.error.stack).includes('SYNTHETIC_PRIVATE_D1_CAUSE'), false);
    return { ...result, events, statuses, tombstoned };
  } finally { assert.deepEqual(fs.readFileSync(workerUrl), workerBefore); }
}

for (const shard of [0, 3, 9]) for (const withRow of [false, true]) test(`driver: export rejects explicit failed shard ${shard}, plausible rows=${withRow}`, async () => {
  const result = await normal('export', { fault: 'read', faultShard: shard,
    faulty: { success: false, results: withRow ? [row] : [], error: 'SYNTHETIC_PRIVATE_D1_CAUSE' } });
  assert.equal(result.ok, false, 'Failed driver result cannot become a successful complete/partial export');
  assert.match(result.error.message, /REQUEST_REJECTED/); assert.deepEqual(result.statuses, [400]);
});

for (const stage of ['tombstone', 'purge', 'registry']) test(`driver: erasure rejects explicit failed ${stage} result`, async () => {
  const result = await normal('delete', { fault: stage, faulty: { success: false, meta: { changes: 0 }, error: 'SYNTHETIC_PRIVATE_D1_CAUSE' } });
  assert.equal(result.ok, false, 'Failed deletion stage must not produce a verified-looking success receipt');
  assert.match(result.error.message, /REQUEST_REJECTED/);
  if (stage === 'tombstone') assert.deepEqual(result.events, [['tombstone', 0]], 'No purge without an acknowledged permanent barrier');
});

test('driver: control normal signed export returns exact unchanged own original', async () => {
  const result = await normal('export'); assert.equal(result.ok, true);
  assert.deepEqual(result.value.rows, [JSON.parse(record.payload_json)]); assert.equal(result.value.next_cursor, null);
  assert.deepEqual(result.statuses, [200]); assert.equal(result.events.length, 12);
});
test('driver: control erasure appearing during actual awaited shard read refuses final export', async () => {
  const result = await normal('export', { eraseDuringRead: true }); assert.equal(result.ok, false);
  assert.match(result.error.message, /REQUEST_REJECTED/); assert.equal(result.events.length, 12);
});
test('driver: control normal signed erasure keeps tombstone-first then ten shards then registry order', async () => {
  const result = await normal('delete'); assert.equal(result.ok, true); assert.equal(result.value, 1);
  assert.equal(result.tombstoned, true);
  assert.deepEqual(result.events, erasureOrder); assert.equal(result.events.length, 32);
});

for (const stage of ['read', 'tombstone', 'purge', 'registry']) for (const [label, faulty] of [
  ['absent', undefined], ['null', null], ['missing success', { results: [], meta: { changes: 0 } }],
  ['truthy nonboolean success', { success: 'true', results: [], meta: { changes: 0 } }],
]) test('driver: rejects ' + label + ' acknowledgment at ' + stage, async () => {
  const result = await normal(stage === 'read' ? 'export' : 'delete', { fault: stage, faulty });
  assert.equal(result.ok, false); assert.match(result.error.message, /REQUEST_REJECTED/);
  if (stage === 'tombstone') assert.deepEqual(result.events, [['tombstone', 0]]);
  if (stage === 'purge') assert.deepEqual(result.events, [...erasureMarkers, ...Array.from({length: 4}, (_,i) => ['purge',i])]);
});
for (const [label, changes] of [['missing', undefined], ['null', null], ['string', '0'], ['negative', -1], ['fraction', 0.5], ['unsafe', Number.MAX_SAFE_INTEGER + 1]])
test('driver: invalid purge count ' + label + ' cannot be coerced or hidden by later success', async () => {
  const result = await normal('delete', { fault: 'purge', faulty: { success: true, meta: { changes } } });
  assert.equal(result.ok, false); assert.match(result.error.message, /REQUEST_REJECTED/);
  assert.deepEqual(result.events, [...erasureMarkers, ...Array.from({length: 4}, (_,i) => ['purge',i])]);
});
for (const stage of ['read', 'tombstone', 'purge', 'registry']) test('driver: thrown first ' + stage + ' cause stops later work without payload leakage', async () => {
  const result = await normal(stage === 'read' ? 'export' : 'delete', {
    fault: stage, throwing: true, faulty: new Error('SYNTHETIC_PRIVATE_D1_CAUSE'),
  });
  assert.equal(result.ok, false); assert.match(result.error.message, /REQUEST_REJECTED/);
  assert.deepEqual(result.statuses, [400]);
  if (stage === 'tombstone') assert.deepEqual(result.events, [['tombstone', 0]]);
  if (stage === 'purge') assert.deepEqual(result.events, [...erasureMarkers, ...Array.from({length: 4}, (_,i) => ['purge',i])]);
});
test('driver: acknowledged empty export remains a complete empty page', async () => {
  const result = await normal('export', { empty: true }); assert.equal(result.ok, true);
  assert.deepEqual(result.value.rows, []); assert.equal(result.value.next_cursor, null);
});
test('driver: acknowledged no-change erasure remains idempotently successful', async () => {
  const result = await normal('delete', { empty: true }); assert.equal(result.ok, true); assert.equal(result.value, 0);
  assert.equal(result.events.length, 32); assert.equal(result.tombstoned, true);
  assert.deepEqual(result.events, erasureOrder);
});
for (const stage of ['tombstone', 'registry']) test('driver: successful ' + stage + ' does not require unused driver metrics', async () => {
  const result = await normal('delete', { fault: stage, faulty: { success: true } });
  assert.equal(result.ok, true); assert.equal(result.value, 1); assert.equal(result.events.length, 32);
  assert.deepEqual(result.events, erasureOrder);
});

test('driver: cumulative safe counts overflow stops at first unsafe sum without successful HTTP receipt', async () => {
  const each = 2 ** 52;
  assert.equal(Number.isSafeInteger(each), true);
  const result = await normal('delete', { purgeCounts: [each, each] });
  assert.equal(result.ok, false);
  assert.deepEqual(result.statuses, [400], 'Worker must not send success and rely on a downstream numeric rejection');
  assert.match(result.error.message, /REQUEST_REJECTED/);
  assert.deepEqual(result.events, [...erasureMarkers, ['purge', 0], ['purge', 1]], 'No later shard or registry work after the first unsafe cumulative receipt');
  assert.equal(result.tombstoned, true);
});
test('driver: cumulative exact maximum safe total remains acknowledged without requiring tombstone metrics', async () => {
  const result = await normal('delete', { purgeCounts: [2 ** 52 - 1, 2 ** 52, 0, 0, 0, 0, 0, 0, 0, 0] });
  assert.equal(result.ok, true); assert.equal(result.value, Number.MAX_SAFE_INTEGER);
  assert.deepEqual(result.statuses, [200]); assert.equal(result.events.length, 32);
  assert.deepEqual(result.events, erasureOrder);
  assert.equal(result.tombstoned, true);
});

for (const stage of ['physical-read', 'registry-empty-read']) for (const [label, faulty, throwing = false] of [
  ['nonempty', { success: true, results: [{ owner_subject: owner.subject }] }],
  ['malformed array', { success: true, results: {} }],
  ['null results', { success: true, results: null }],
  ['unacknowledged empty', { results: [] }],
  ['failed empty', { success: false, results: [] }],
  ['nonboolean success', { success: 'true', results: [] }],
  ['thrown first cause', new Error('SYNTHETIC_PRIVATE_D1_CAUSE'), true],
]) test('erasure readback: ' + stage + ' refuses ' + label + ' before receipt', async () => {
  const result = await normal('delete', { fault: stage, faulty, throwing });
  assert.equal(result.ok, false); assert.match(result.error.message, /REQUEST_REJECTED/);
  assert.deepEqual(result.statuses, [400]);
  assert.deepEqual(result.events, erasureOrder.slice(0, stage === 'physical-read' ? 25 : 32));
  assert.equal(result.tombstoned, true);
});
for (const markerFaultShard of [3, 9]) for (const throwing of [false, true])
test('erasure readback: failed marker ' + markerFaultShard + ', thrown=' + throwing + ' stops before any purge', async () => {
  const result = await normal('delete', { fault: 'tombstone', markerFaultShard, throwing,
    faulty: throwing ? new Error('SYNTHETIC_PRIVATE_D1_CAUSE') : { success: false } });
  assert.equal(result.ok, false); assert.match(result.error.message, /REQUEST_REJECTED/);
  assert.deepEqual(result.statuses, [400]);
  assert.deepEqual(result.events, erasureMarkers.slice(0, markerFaultShard + 1));
  assert.equal(result.tombstoned, true, 'Accepted earlier permanent markers are not rolled back');
});

}

// Additive existing-only002 upgrade: normal verifier and actual preparer CLI.
// Synthetic transport/metadata only; no SQL execution or provider account access.
{
const { test: upgradeTest } = await import('node:test');
const { compileFunction } = await import('node:vm');
const { createHash } = await import('node:crypto');
const path = await import('node:path');
const { verifyExistingWorkerBindings, verifyActiveWorkerDeployment, waitForWorkerHealth } = await import('./verify-cloudflare-trip-gateway.mjs');
const { matchesTripStorageReadiness } = await import('./lib/trip-storage-edge-readiness.mjs');
const classification = await import('./lib/trip-storage-legacy-classification.mjs');
const { D1_TRIP_SCHEMA_STATEMENTS } = await import('../supabase/functions/_shared/trip-storage.js');
const version='11111111-1111-4111-8111-111111111111', other='22222222-2222-4222-8222-222222222222';
const rows=()=>classification.TRIP_STORAGE_REQUIRED_SHARD_NAMES.map((name,index)=>({name,uuid:`00000000-0000-4000-8000-${String(index).padStart(12,'0')}`,jurisdiction:'eu'}));
const bindings=()=>rows().map((row,index)=>({binding:'TRIP_DB_'+index,database_name:row.name,database_id:row.uuid}));
const descriptors={accountId:'a'.repeat(32),apiToken:'synthetic-token',workerName:'ravradar-trip-gateway'};
const deployment=()=>({success:true,result:{deployments:[{id:other,strategy:'percentage',versions:[{version_id:version,percentage:100}]}]}});
const versionBody=()=>({success:true,result:{id:version,resources:{bindings:[...bindings().map(row=>({type:'d1',name:row.binding,id:row.database_id})),{type:'secret_text',name:'EXISTING_SECRET',text:'must-not-retain'}]},metadata:{author_email:'must-not-retain'}}});
async function bindingProbe(mutate=()=>{}, options={}, verify=verifyExistingWorkerBindings) {
  const calls=[];let activeReads=0;
  const result=await verify({...descriptors,expectedBindings:bindings(),...options,fetchImpl:async(url,init)=>{
    calls.push({url,init});const body=url.includes('/versions/')?versionBody():deployment();
    if(!url.includes('/versions/'))activeReads++;
    mutate(body,{url,activeReads});return new Response(JSON.stringify(body));
  }});return{result,calls};
}
upgradeTest('owner-upgrade bindings exact pinned SDK array and current100 sandwich, no raw settings retained',async()=>{
  const {result,calls}=await bindingProbe();assert.equal(result.versionId,version);assert.deepEqual(result.bindings,bindings());
  assert.equal(calls.length,3);assert.ok(calls[1].url.endsWith('/versions/'+version));
  assert.ok(calls.every(call=>call.init.method==='GET'&&call.init.redirect==='error'&&call.init.body===undefined));
  assert.doesNotMatch(JSON.stringify(result),/must-not-retain|secret|author|token/i);
});
for(const [label,mutate]of [
  ['opaque binding container',b=>b.result.resources.bindings={}],
  ['missing binding container',b=>delete b.result.resources.bindings],
  ['wrong version',b=>b.result.id=other],['success missing',b=>delete b.success],['success string',b=>b.success='true'],
  ['missing shard',b=>b.result.resources.bindings.shift()],
  ['extra D1',b=>b.result.resources.bindings.push({type:'d1',name:'EXTRA',id:other})],
  ['duplicate name',b=>b.result.resources.bindings.push({type:'plain_text',name:'TRIP_DB_0'})],
  ['settings-only database_id',b=>{const r=b.result.resources.bindings[0];r.database_id=r.id;delete r.id;}],
  ['wrong mapping',b=>b.result.resources.bindings[9].id=other],
  ['wrong type',b=>b.result.resources.bindings[9].type='plain_text'],
])upgradeTest('owner-upgrade bindings rejects '+label,async()=>{
  await assert.rejects(bindingProbe((body,{url})=>{if(url.includes('/versions/'))mutate(body);}),{message:'TRIP_STORAGE_WORKER_BINDINGS_UNVERIFIED'});
});
upgradeTest('owner-upgrade bindings rejects a deployment changed during version read',async()=>{
  await assert.rejects(bindingProbe((body,{url,activeReads})=>{if(!url.includes('/versions/')&&activeReads===2)body.result.deployments[0].id=version;}));
});
upgradeTest('owner-upgrade metadata invalid planned descriptor produces zero transport',async()=>{
  let calls=0;await assert.rejects(verifyExistingWorkerBindings({...descriptors,expectedBindings:[],fetchImpl:async()=>{calls++;}}));assert.equal(calls,0);
});
upgradeTest('owner-upgrade bindings exact aggregate true and false use the real metadata sandwich',async()=>{
  for(const value of ['true','false']){
    const {result,calls}=await bindingProbe((body,{url})=>{
      if(url.includes('/versions/'))body.result.resources.bindings.push({type:'plain_text',name:'TRIP_AGGREGATE_ENABLED',text:value});
    },{expectedPlainTextBindings:{TRIP_AGGREGATE_ENABLED:value}});
    assert.equal(result.versionId,version);assert.deepEqual(result.bindings,bindings());assert.equal(calls.length,3);
    assert(calls.every(call=>call.init.method==='GET'&&call.init.redirect==='error'&&call.init.body===undefined));
    assert.doesNotMatch(JSON.stringify(result),/TRIP_AGGREGATE_ENABLED|secret|author|token/i);
  }
});
upgradeTest('owner-upgrade bindings aggregate accepts only one exact string field before transport',async()=>{
  for(const expected of [null,{},true,{TRIP_AGGREGATE_ENABLED:true},{TRIP_AGGREGATE_ENABLED:false},
    {TRIP_AGGREGATE_ENABLED:'TRUE'},{TRIP_AGGREGATE_ENABLED:' true'},{TRIP_AGGREGATE_ENABLED:'false '},
    {TRIP_AGGREGATE_ENABLED:'1'},{OTHER:'true'},{TRIP_AGGREGATE_ENABLED:'true',OTHER:'false'}]){
    let calls=0;
    await assert.rejects(verifyExistingWorkerBindings({...descriptors,expectedBindings:bindings(),expectedPlainTextBindings:expected,
      fetchImpl:async()=>{calls++;throw new Error('unexpected metadata transport');}}),{message:'TRIP_STORAGE_WORKER_BINDINGS_UNVERIFIED'});
    assert.equal(calls,0);
  }
});
upgradeTest('owner-upgrade bindings aggregate rejects missing opposite secret and duplicate actual settings',async()=>{
  for(const value of ['true','false'])for(const shape of ['missing','opposite','secret','duplicate']){
    const calls=[];
    await assert.rejects(bindingProbe((body,{url})=>{
      calls.push(url);if(!url.includes('/versions/'))return;
      if(shape!=='missing')body.result.resources.bindings.push({type:shape==='secret'?'secret_text':'plain_text',
        name:'TRIP_AGGREGATE_ENABLED',text:shape==='opposite'?(value==='true'?'false':'true'):value});
      if(shape==='duplicate')body.result.resources.bindings.push({type:'plain_text',name:'TRIP_AGGREGATE_ENABLED',text:value});
    },{expectedPlainTextBindings:{TRIP_AGGREGATE_ENABLED:value}}),{message:'TRIP_STORAGE_WORKER_BINDINGS_UNVERIFIED'});
    assert.equal(calls.length,2,'refusal must be from the actual version settings after discovery');
  }
});
// Execute the actual normal OFF heredoc and its actual imported verifier.
// Reuse the existing deployment/version fixture and real verifier; only local
// config I/O and Cloudflare transport are artificial. No product call is stubbed.
const offWorkflow=fs.readFileSync('.github/workflows/deploy-code-only-repair.yml','utf8').replaceAll('\r\n','\n');
const offHeading='      - name: Require the exact new Worker and explicit aggregate OFF binding\n';
const offStart=offWorkflow.indexOf(offHeading),offEnd=offWorkflow.indexOf('\n      - name:',offStart+offHeading.length);
assert(offStart>=0&&offEnd>offStart);assert.equal(offWorkflow.indexOf(offHeading,offStart+offHeading.length),-1);
const offMatch=/node --input-type=module <<'OFF_ATTEST_NODE'\n([\s\S]*?)\n          OFF_ATTEST_NODE/.exec(offWorkflow.slice(offStart,offEnd));
assert(offMatch);
const offProgram=offMatch[1].split('\n').map(line=>{assert(line.startsWith('          '));return line.slice(10);}).join('\n');
const offImport=/^import \{(verifyExistingWorkerBindings|verifyActiveWorkerDeployment)\} from '\.\/scripts\/verify-cloudflare-trip-gateway\.mjs';$/m.exec(offProgram);
assert(offImport);assert.equal(offProgram.split(offImport[0]).length,2);
const offVerifier={verifyExistingWorkerBindings,verifyActiveWorkerDeployment}[offImport[1]];
const invokeOff=compileFunction('return(async()=>{'+offProgram.replace("import fs from 'node:fs';\n",'').replace(offImport[0],'')+'})();',
  ['fs','process',offImport[1]]);
async function offCallerProbe(mutate=()=>{}) {
  return bindingProbe((body,info)=>{
    if(info.url.includes('/versions/'))body.result.resources.bindings.push({type:'plain_text',name:'TRIP_AGGREGATE_ENABLED',text:'false'});
    mutate(body,info);
  },{},options=>invokeOff({readFileSync:(file,encoding)=>{
    assert.equal(file,'/synthetic/metadata585-wrangler.json');assert.equal(encoding,'utf8');
    return JSON.stringify({name:descriptors.workerName,d1_databases:bindings(),vars:{TRIP_AGGREGATE_ENABLED:'false'}});
  }},{env:{CLOUDFLARE_ACCOUNT_ID:descriptors.accountId,CLOUDFLARE_API_TOKEN:descriptors.apiToken,
    TRIP_WRANGLER_CONFIG_PATH:'/synthetic/metadata585-wrangler.json',EXPECTED_TRIP_WORKER_VERSION:version}},
  value=>offVerifier({...value,fetchImpl:options.fetchImpl})));
}
for(const [label,mutate]of [
  ['live ON',(body,{url})=>{if(url.includes('/versions/'))body.result.resources.bindings.at(-1).text='true';}],
  ['missing live OFF',(body,{url})=>{if(url.includes('/versions/'))body.result.resources.bindings.pop();}],
  ['wrong D1 mapping',(body,{url})=>{if(url.includes('/versions/'))body.result.resources.bindings[9].id=other;}],
  ['changed deployment',(body,{url,activeReads})=>{if(!url.includes('/versions/')&&activeReads===2)body.result.deployments[0].id=version;}],
])upgradeTest('metadata585 actual normal OFF caller rejects '+label,async()=>{
  await assert.rejects(offCallerProbe(mutate),{message:'TRIP_STORAGE_WORKER_BINDINGS_UNVERIFIED'});
});
upgradeTest('metadata585 actual normal OFF caller verifies all bindings between exact deployment reads',async()=>{
  const {calls}=await offCallerProbe();assert.equal(calls.length,3);
  assert(calls[0].url.includes('/deployments?'));assert(calls[1].url.endsWith('/versions/'+version));assert(calls[2].url.includes('/deployments?'));
  assert(calls.every(call=>call.init.method==='GET'&&call.init.redirect==='error'&&call.init.body===undefined));
});
upgradeTest('owner-upgrade preflight compatibility is explicit and never final export success',async()=>{
  const health={ok:true,contract_version:'4.0.311',shards:10,storage_schema_version:1,idempotency_registry_schema_version:2,owner_erasure_tombstone_schema_version:1};
  const options={gatewayUrl:'https://synthetic.invalid',retryDelaysMs:[0],fetchImpl:async()=>new Response(JSON.stringify(health))};
  assert.equal((await waitForWorkerHealth(options)).verified,false);assert.equal((await waitForWorkerHealth({...options,preUpgrade:true})).verified,true);
  health.trip_export_version=0;assert.equal((await waitForWorkerHealth({...options,preUpgrade:true})).verified,false);
  health.trip_export_version=1;assert.equal((await waitForWorkerHealth(options)).verified,true);
  const response=new Response(null,{headers:{'x-ravradar-trip-contract-version':'4.0.311','x-ravradar-trip-storage-mode':'d1'}});
  assert.equal(matchesTripStorageReadiness(response,'trip-log','d1'),false);assert.equal(matchesTripStorageReadiness(response,'trip-log','d1',true),true);
  response.headers.set('x-ravradar-trip-export-version','0');assert.equal(matchesTripStorageReadiness(response,'trip-log','d1',true),false);
});

const source=fs.readFileSync('scripts/prepare-cloudflare-trip-storage.mjs','utf8').replaceAll('\r\n','\n');
const cliSource=source.slice(0,source.lastIndexOf('\nif (process.argv[1]')).replace(/^import[\s\S]*?;\n/gm,'').replace(/^export /gm,'')+'\nawait main();';
const migrationPath='cloudflare/trip-gateway/migrations/002_owner_export_keyset.sql';
const originalMigration=fs.readFileSync(migrationPath);
// The Linux CLI fixture consumes the exact committed LF payload, not Windows
// checkout CRLF. Normalize only this synthetic input; never rewrite the file
// or relax the normal preparer's immutable-byte guard.
const migration=Buffer.from(originalMigration.toString('utf8').replaceAll('\r\n','\n'));
assert.equal(createHash('sha256').update(migration).digest('hex'),
  'a84490c7cd8a173447188cbec3c275714195f29688340cbbd35b33ff4248a4eb');
const definitions=D1_TRIP_SCHEMA_STATEMENTS.map(sql=>{const match=/^create\s+(?:unique\s+)?(table|index)\s+if\s+not\s+exists\s+([a-z_]+)/i.exec(sql.trim());return{type:match[1],name:match[2],sql};});
function upgradeFixture({present=[],mutate=()=>{},list=rows(),plannedMain='a'.repeat(40)}={}) {
  const stored=new Map(),events=[],installed=new Set(present),clock=1800000000000;
  let mode='plan',ddl=0,versionReads=0;
  const env={...{CLOUDFLARE_ACCOUNT_ID:descriptors.accountId,CLOUDFLARE_API_TOKEN:descriptors.apiToken},
    TRIP_WRANGLER_CONFIG_PATH:'/synthetic/config',TRIP_OWNER_EXPORT_PLAN_PATH:'/synthetic/plan',TRIP_STORAGE_OWNER_EXPORT_UPGRADE:'1',
    GITHUB_REF:'refs/heads/main',GITHUB_SHA:plannedMain,REPAIR_LEASE_DEADLINE:String(clock+1200000)};
  const transport=async(input,init={})=>{
    const url=new URL(input);let body;events.push({kind:'HTTP',phase:mode,url:url.pathname,method:init.method||'GET'});
    if(url.pathname.endsWith('/deployments'))body=deployment();
    else if(url.pathname.includes('/versions/')){versionReads++;body=versionBody();}
    else if(url.pathname.endsWith('/database'))body={success:true,result:url.searchParams.get('page')==='1'?list:[]};
    else if(url.pathname.endsWith('/query')){
      const id=url.pathname.split('/').at(-2),index=Number(id.slice(-12));const request=JSON.parse(init.body),sql=request.sql;
      events.at(-1).sql=sql;let result;
      if(sql.startsWith('select type'))result=definitions.filter((_,i)=>i!==9||installed.has(index));
      else if(sql.startsWith('select control_value'))result=[{control_value:'true'}];
      else if(sql.startsWith('pragma index_list'))result=installed.has(index)?[{name:'trip_observations_owner_export',unique:0,origin:'c',partial:0}]:[];
      else if(sql.startsWith('pragma index_xinfo'))result=['owner_subject','client_observation_id','created_at'].map((name,seqno)=>({name,seqno,cid:seqno,desc:0,coll:'BINARY',key:1})).concat({name:null,seqno:3,cid:-1,desc:0,coll:'BINARY',key:0});
      else{assert.equal(sql,migration.toString());ddl++;events.at(-1).kind='DDL';installed.add(index);result=[];}
      body={success:true,result:[{success:true,results:structuredClone(result)}]};
    }else throw new Error('unexpected synthetic route');
    mutate({body,url,init,events,mode,ddl,versionReads,installed,env,stored});return new Response(JSON.stringify(body));
  };
  const scope={createHash,execFileSync:(_command,args)=>{events.push({kind:'git',args,phase:mode});return args[0]==='ls-remote'?(env.SYNTHETIC_REMOTE_SHA||env.GITHUB_SHA)+'\trefs/heads/main\n':env.GITHUB_SHA;},
    fs:{readFileSync:(file,encoding)=>{const value=file.endsWith('002_owner_export_keyset.sql')?migration:stored.get(file);if(value===undefined)throw new Error('missing fixture');return encoding?value.toString():Buffer.from(value);},writeFileSync:(file,text,options)=>{if(file===path.resolve('/synthetic/config'))file='/synthetic/config';if(options?.flag==='wx')assert.equal(stored.has(file),false);stored.set(file,Buffer.from(text));events.push({kind:'file',file});}},path,
    verifyExistingWorkerBindings:options=>verifyExistingWorkerBindings({...options,fetchImpl:transport}),D1_TRIP_SCHEMA_STATEMENTS,
    boundedFetch:transport,TRIP_STORAGE_REQUIRED_SHARD_NAMES:classification.TRIP_STORAGE_REQUIRED_SHARD_NAMES,SHARD_COUNT:10,
    classifyExistingTripStorageDatabases:classification.classifyExistingTripStorageDatabases,verifyLegacyActivationEvidence:()=>{throw new Error('no adoption');},
    process:{env,argv:[]},Date:class extends Date{static now(){return clock;}},console:{log:()=>{}}};
  const run=async phase=>{mode=phase;scope.process.argv=['node','prepare','--existing-owner-export-upgrade-'+phase];return compileFunction('return(async()=>{'+cliSource+'})();',Object.keys(scope))(...Object.values(scope));};
  return{run,events,installed,stored,env,get ddl(){return ddl;}};
}
for(const present of [[],[0,3,9],Array.from({length:10},(_,i)=>i)])upgradeTest('owner-upgrade actual CLI missing-only002 / initial exact '+present.length,async()=>{
  const f=upgradeFixture({present,list:rows().reverse()});await f.run('plan');assert.equal(f.ddl,0);await f.run('apply');assert.equal(f.ddl,10-present.length);await f.run('check');
  assert.equal(f.installed.size,10);assert.ok(f.events.filter(e=>e.kind==='DDL').every(e=>e.sql===migration.toString()));
  const plan=JSON.parse(f.stored.get('/synthetic/plan'));assert.deepEqual(plan.bindings,bindings());assert.doesNotMatch(JSON.stringify(plan),/secret|token|author|payload|owner_subject/);
  assert.equal(f.events.some(e=>e.url?.includes('/actions/')||(e.method==='POST'&& !e.url.endsWith('/query'))),false);
  assert.deepEqual(fs.readFileSync(migrationPath),originalMigration,'The fixture must preserve the original002 source bytes');
});
for(const [label,mutate]of [
  ['wrong tenth schema',({body,url})=>{if(url.pathname.endsWith('000000000009/query')&&body.result?.[0]?.results?.[0]?.sql)body.result[0].results[0].sql='create table wrong(x)';}],
  ['bad activation',({body})=>{if(body.result?.[0]?.results?.[0]?.control_value)body.result[0].results[0].control_value='false';}],
  ['wrong active D1',({body,url})=>{if(url.pathname.includes('/versions/'))body.result.resources.bindings[9].id=other;}],
  ['wrong tenth index',({body,url,init})=>{if(url.pathname.endsWith('000000000009/query')&&JSON.parse(init.body).sql.startsWith('pragma index_xinfo'))body.result[0].results[0].coll='NOCASE';}],
])upgradeTest('owner-upgrade entire preflight '+label+' has zero DDL/config',async()=>{
  const f=upgradeFixture({present:[9],mutate});await assert.rejects(f.run('plan'),{message:'TRIP_OWNER_EXPORT_UPGRADE_UNVERIFIED'});assert.equal(f.ddl,0);assert.equal(f.stored.size,0);
});
for(const receipt of ['outer-false','inner-absent','inner-string','extra-result'])upgradeTest('owner-upgrade DDL '+receipt+' stops after first unknown outcome and resumes exact index',async()=>{
  let fail=true;const f=upgradeFixture({mutate:({body,events})=>{if(fail&&events.at(-1).kind==='DDL'){
    if(receipt==='outer-false')body.success=false;else if(receipt==='inner-absent')delete body.result[0].success;else if(receipt==='inner-string')body.result[0].success='true';else body.result.push(body.result[0]);
  }}});await f.run('plan');await assert.rejects(f.run('apply'));assert.equal(f.ddl,1);assert.equal(f.installed.has(0),true);
  fail=false;await f.run('apply');assert.equal(f.ddl,10);await f.run('check');
});
upgradeTest('owner-upgrade check cannot deploy before all ten exact readbacks',async()=>{
  const f=upgradeFixture();await f.run('plan');await assert.rejects(f.run('check'));assert.equal(f.ddl,0);
});
upgradeTest('owner-upgrade changed version between plan/apply rejects without DDL',async()=>{
  const f=upgradeFixture({mutate:({body,url,mode})=>{if(mode==='apply'&&url.pathname.endsWith('/deployments'))body.result.deployments[0].versions[0].version_id=other;}});
  await f.run('plan');await assert.rejects(f.run('apply'));assert.equal(f.ddl,0);
});
upgradeTest('owner-upgrade insufficient lease or changed source rejects before002',async()=>{
  for(const change of ['lease','source']){const f=upgradeFixture();await f.run('plan');if(change==='lease')f.env.REPAIR_LEASE_DEADLINE='0';else f.env.GITHUB_SHA='b'.repeat(40);await assert.rejects(f.run('apply'));assert.equal(f.ddl,0);}
});
upgradeTest('owner-upgrade injected config account override is rejected before002',async()=>{
  const f=upgradeFixture();await f.run('plan');const config=JSON.parse(f.stored.get('/synthetic/config'));config.account_id='b'.repeat(32);f.stored.set('/synthetic/config',Buffer.from(JSON.stringify(config)));await assert.rejects(f.run('apply'));assert.equal(f.ddl,0);
});
upgradeTest('owner-upgrade fresh remote main and lease rechecked after metadata before each002',async()=>{
  for(const kind of ['main','lease']){const f=upgradeFixture({mutate:({events,mode,env})=>{if(mode==='apply'&&events.at(-1).sql?.startsWith('select type')&&events.filter(e=>e.phase==='apply'&&e.sql?.startsWith('select type')).length===11){
    if(kind==='main')env.SYNTHETIC_REMOTE_SHA='b'.repeat(40);else env.REPAIR_LEASE_DEADLINE='0';
  }}});await f.run('plan');await assert.rejects(f.run('apply'));assert.equal(f.ddl,0);}
});
upgradeTest('owner-upgrade index appearing exact during prewrite read is not rewritten',async()=>{
  const f=upgradeFixture({mutate:({mode,events,installed})=>{if(mode==='apply'&&events.at(-1).url.endsWith('/deployments')&&events.filter(e=>e.phase==='apply'&&e.url?.endsWith('/deployments')).length===3)installed.add(0);}});
  await f.run('plan');await f.run('apply');assert.equal(f.ddl,9);await f.run('check');
});
upgradeTest('owner-upgrade changed same-name index immediately before002 cannot be repaired',async()=>{
  const f=upgradeFixture({mutate:({body,mode,events})=>{if(mode==='apply'&&events.at(-1).sql?.startsWith('select type')&&events.filter(e=>e.phase==='apply'&&e.sql?.startsWith('select type')).length===11)
    body.result[0].results.push({type:'index',name:'trip_observations_owner_export',sql:'create index trip_observations_owner_export on trip_observations(created_at)'});
  }});await f.run('plan');await assert.rejects(f.run('apply'));assert.equal(f.ddl,0);
});
for(const fail of [false,true])upgradeTest('owner-upgrade actual apply CLI in workflow '+(fail?'first fault blocks deploy/recovery':'finishes before one replacement'),async()=>{
  const f=upgradeFixture({mutate:({body,events})=>{if(fail&&events.at(-1).kind==='DDL')body.result[0].success=false;}});await f.run('plan');
  const result=await runOwnerUpgradeWorkflow({operation:'existing-owner-export-upgrade',applyUpgrade:async command=>{
    assert.equal(command,'scripts/prepare-cloudflare-trip-storage.mjs --existing-owner-export-upgrade-apply');await f.run(command.split('-').at(-1));
  }});
  assert.equal(result.firstError?.message,fail?'TRIP_OWNER_EXPORT_UPGRADE_UNVERIFIED':undefined);
  assert.equal(f.ddl,fail?1:10);assert.equal(result.calls.filter(call=>call.action==='deploy').length,fail?0:1);
  assert.equal(result.calls.some(call=>call.step.startsWith('repair_recovery')),false);
});
upgradeTest('owner-upgrade first physical post-DDL mismatch stops later shards',async()=>{
  const f=upgradeFixture({mutate:({body,events,ddl})=>{if(ddl&&events.at(-1).sql?.startsWith('pragma index_xinfo'))body.result[0].results[0].desc=1;}});
  await f.run('plan');await assert.rejects(f.run('apply'));assert.equal(f.ddl,1);assert.equal(f.installed.size,1);
});
upgradeTest('owner-upgrade final strict claimed version cannot use discovery or historical version',async()=>{
  assert.equal((await bindingProbe(()=>{},{expectedVersion:version})).result.versionId,version);
  await assert.rejects(bindingProbe(()=>{},{expectedVersion:other}));
});
upgradeTest('owner-upgrade unknown/false process stop cannot restore or recover',async()=>{
  for(const extra of [{unknownDeployStep:'repair_replace'},{falseReceiptStep:'repair_replace'}]){
    const result=await runOwnerUpgradeWorkflow({operation:'existing-owner-export-upgrade',...extra});assert.ok(result.firstError);
    assert.equal(result.calls.filter(call=>call.action==='deploy').length,1);assert.equal(result.calls.some(call=>call.action==='restore'||call.step.startsWith('repair_recovery')),false);
  }
});
}

// A terminal physical-erasure claim needs more than a post-purge snapshot.
// Actual signed Worker routes and unchanged DDL; only own in-memory SQLite.
{
const { test } = await import('node:test');
const { DatabaseSync } = await import('node:sqlite');
const { handleRequest } = await import('../cloudflare/trip-gateway/worker.js');
const { externalOwnerSubject, storeCloudflareTrip, deleteCloudflareTrips, listCloudflareTrips }
  = await import('../supabase/functions/_shared/trip-storage.js');
test('erasure settlement: post-purge empty physical reads cannot precede a late owner insert', async () => {
  const secret = 'synthetic-erasure-race-secret-at-least-32-characters';
  const gatewayUrl = 'https://synthetic-erasure-race.example.workers.dev';
  const owner = await externalOwnerSubject({ userId: '11111111-1111-4111-8111-111111111111', secret });
  const payload = { client_observation_id: '33333333-3333-4333-8333-333333333333', trip_id: null,
    observed_at: '2000-01-01T10:00:00.000Z', submitted_at: '2000-01-01T11:00:00.000Z',
    actual_zone_id: 'DK-B01-01', actual_coastal_part_id: 'DK-B01-01-P01',
    hunt_mode: 'beach', found: false, result: 'none' };
  const databases = Array.from({ length: 10 }, () => new DatabaseSync(':memory:'));
  let enteredInsert, releaseInsert, committedInsert, releasePostInsert;
  const entered = new Promise(resolve => { enteredInsert = resolve; });
  const mayInsert = new Promise(resolve => { releaseInsert = resolve; });
  const inserted = new Promise(resolve => { committedInsert = resolve; });
  const mayReturnInsert = new Promise(resolve => { releasePostInsert = resolve; });
  let storing;
  try {
    const schema = fs.readFileSync('cloudflare/trip-gateway/migrations/001_trip_observations.sql', 'utf8');
    const index = fs.readFileSync('cloudflare/trip-gateway/migrations/002_owner_export_keyset.sql', 'utf8');
    const env = { TRIP_GATEWAY_SHARED_SECRET: secret };
    for (const [shard, database] of databases.entries()) {
      database.exec(schema); database.exec(index);
      env[`TRIP_DB_${shard}`] = { prepare(sql) {
        const statement = database.prepare(sql);
        return { bind(...args) { return {
          async all() { return { success: true, results: statement.all(...args) }; },
          async run() {
            const isTripInsert = /^\s*insert into trip_observations\s*\(/.test(sql);
            if (isTripInsert) { enteredInsert(); await mayInsert; }
            const result = statement.run(...args);
            if (isTripInsert) { committedInsert(); await mayReturnInsert; }
            return { success: true, meta: { changes: Number(result.changes) } };
          },
        }; } };
      } };
    }
    const fetchImpl = (input, init) => {
      const request = new Request(input, init), url = new URL(request.url);
      assert.equal(url.origin, gatewayUrl);
      assert.ok(['/v1/trips/store', '/v1/trips/delete-owner', '/v1/trips/list'].includes(url.pathname));
      return handleRequest(request, env);
    };
    const args = { gatewayUrl, sharedSecret: secret, fetchImpl };
    const physicalReadback = () => ({
      rows: databases.reduce((sum, db) => sum + db.prepare('select owner_subject from trip_observations where owner_subject = ? limit 1').all(owner.subject).length, 0),
      registry: databases[0].prepare('select owner_subject from trip_observation_registry where owner_subject = ? limit 1').all(owner.subject).length,
    });
    storing = storeCloudflareTrip({ ...args, owner, payload })
      .then(value => ({ ok: true, value }), error => ({ ok: false, error }));
    await Promise.race([entered, storing.then(() => { throw new Error('Store ended before the held normal insert'); })]);
    assert.equal(await deleteCloudflareTrips({ ...args, ownerSubject: owner.subject }), 0);
    const atDeleteReceipt = physicalReadback();
    assert.deepEqual(atDeleteReceipt, { rows: 0, registry: 0 });
    releaseInsert(); await inserted;
    const afterLateInsert = physicalReadback();
    assert.deepEqual(await listCloudflareTrips({ ...args, ownerSubject: owner.subject }), [],
      'The tombstone-guarded list is empty even while a late physical row exists');
    releasePostInsert();
    assert.equal((await storing).ok, false, 'Existing final guard must refuse the late store');
    assert.deepEqual(physicalReadback(), { rows: 0, registry: 0 }, 'Existing best-effort post-insert purge still runs');
    assert.deepEqual(afterLateInsert, { rows: 0, registry: 0 },
      'A terminal physical-erasure receipt must prevent an already admitted late INSERT, not merely hide it');
  } finally {
    releaseInsert(); releasePostInsert();
    if (storing) await storing;
    for (const database of databases) database.close();
  }
});
}

// Private causal legacy fixture: the complete pinned old Worker is copied
// byte-for-byte, without rewriting source or SQL, beside the candidate Worker.
{
const { test } = await import('node:test');
const { createHash } = await import('node:crypto');
const { DatabaseSync } = await import('node:sqlite');
const legacyUrl = new URL('../cloudflare/trip-gateway/worker-legacy-erasure.test-fixture.js', import.meta.url);
assert.equal(createHash('sha256').update(fs.readFileSync(legacyUrl)).digest('hex'),
  '477c35887b82f3afb4f59694434af0f804e81dcd6ebeecb629dabad58b786ff2');
const { handleRequest: oldHandleRequest } = await import(legacyUrl.href);
const { handleRequest } = await import('../cloudflare/trip-gateway/worker.js');
const { externalOwnerSubject, storeCloudflareTrip, deleteCloudflareTrips, listCloudflareTrips }
  = await import('../supabase/functions/_shared/trip-storage.js');
const applyLegacyGuard = databases => {
  const sql = fs.readFileSync('cloudflare/trip-gateway/migrations/003_owner_erasure_insert_guard.sql', 'utf8');
  for (const database of databases) {
    database.exec(sql);
    const triggers = database.prepare("select name, sql from sqlite_master where type = 'trigger'").all();
    assert.equal(triggers.length, 1);
    assert.equal(triggers[0].name, 'trip_observations_erased_owner_no_insert');
    assert.equal(triggers[0].sql, sql.slice(sql.indexOf('CREATE TRIGGER')).trim().replace(/;$/, ''));
  }
};
test('legacy erasure barrier: an already prepared old signed INSERT cannot cross the physical delete receipt', async () => {
  const secret = 'synthetic-legacy-erasure-secret-at-least-32-characters';
  const gatewayUrl = 'https://synthetic-legacy-erasure.example.workers.dev';
  const owner = await externalOwnerSubject({ userId: '11111111-1111-4111-8111-111111111111', secret });
  const foreign = await externalOwnerSubject({ userId: '22222222-2222-4222-8222-222222222222', secret });
  const payload = { client_observation_id: '33333333-3333-4333-8333-333333333333', trip_id: null,
    observed_at: '2000-01-01T10:00:00.000Z', submitted_at: '2000-01-01T11:00:00.000Z',
    actual_zone_id: 'DK-B01-01', actual_coastal_part_id: 'DK-B01-01-P01',
    hunt_mode: 'beach', found: false, result: 'none' };
  const databases = Array.from({ length: 10 }, () => new DatabaseSync(':memory:'));
  let enteredInsert, releaseInsert, attemptedInsert, releasePostInsert;
  const entered = new Promise(resolve => { enteredInsert = resolve; });
  const mayInsert = new Promise(resolve => { releaseInsert = resolve; });
  const attempted = new Promise(resolve => { attemptedInsert = resolve; });
  const mayReturnInsert = new Promise(resolve => { releasePostInsert = resolve; });
  let storing;
  try {
    const env = { TRIP_GATEWAY_SHARED_SECRET: secret };
    for (const [shard, database] of databases.entries()) {
      database.exec(fs.readFileSync('cloudflare/trip-gateway/migrations/001_trip_observations.sql', 'utf8'));
      database.exec(fs.readFileSync('cloudflare/trip-gateway/migrations/002_owner_export_keyset.sql', 'utf8'));
      env[`TRIP_DB_${shard}`] = { prepare(sql) {
        const statement = database.prepare(sql);
        return { bind(...args) { return {
          async all() { return { success: true, results: statement.all(...args) }; },
          async run() {
            const held = /^\s*insert into trip_observations\s*\(/.test(sql)
              && args[1] === owner.subject && args[4] === payload.client_observation_id;
            if (held) {
              assert.match(sql, /\) values \(\?, \?, \?, \?, \?, \?, \?, \?, \?, \?\)/);
              assert.equal(args.length, 10, 'This is the real OLD unguarded INSERT, not the new owner-bound SQL');
              enteredInsert(); await mayInsert;
            }
            try {
              const result = statement.run(...args);
              if (held) attemptedInsert({ changes: Number(result.changes), rejected: false });
              return { success: true, meta: { changes: Number(result.changes) } };
            } catch (error) {
              if (held) attemptedInsert({ rejected: true, message: error.message });
              throw error;
            } finally { if (held) await mayReturnInsert; }
          },
        }; } };
      } };
    }
    const fetchImpl = (input, init) => {
      const request = new Request(input, init), url = new URL(request.url);
      assert.equal(url.origin, gatewayUrl);
      assert.ok(['/v1/trips/store', '/v1/trips/delete-owner', '/v1/trips/list'].includes(url.pathname));
      return (url.pathname === '/v1/trips/store' ? oldHandleRequest : handleRequest)(request, env);
    };
    const args = { gatewayUrl, sharedSecret: secret, fetchImpl };
    const allStored = () => databases.map(db => ({
      rows: db.prepare('select * from trip_observations order by client_observation_id').all(),
      registry: db.prepare('select * from trip_observation_registry order by client_observation_id').all(),
    }));
    const ownedRows = subject => databases.flatMap(db => db.prepare('select * from trip_observations where owner_subject = ? order by client_observation_id').all(subject));
    await storeCloudflareTrip({ ...args, owner: foreign, payload: { ...payload, client_observation_id: '44444444-4444-4444-8444-444444444444' } });
    await storeCloudflareTrip({ ...args, owner, payload: { ...payload, client_observation_id: '55555555-5555-4555-8555-555555555555' } });
    const foreignOriginal = ownedRows(foreign.subject);
    assert.equal(foreignOriginal.length, 1);
    storing = storeCloudflareTrip({ ...args, owner, payload })
      .then(value => ({ ok: true, value }), error => ({ ok: false, error }));
    await Promise.race([entered, storing.then(() => { throw new Error('Old store ended before the held INSERT'); })]);
    const beforeGuard = allStored();
    applyLegacyGuard(databases);
    assert.deepEqual(allStored(), beforeGuard, 'Adding the guard cannot change existing owner/foreign rows or reservations');
    assert.equal(await deleteCloudflareTrips({ ...args, ownerSubject: owner.subject }), 1);
    assert.deepEqual(ownedRows(owner.subject), []);
    assert.deepEqual(ownedRows(foreign.subject), foreignOriginal);
    releaseInsert();
    const insertOutcome = await attempted;
    const afterLateInsert = ownedRows(owner.subject);
    assert.deepEqual(await listCloudflareTrips({ ...args, ownerSubject: owner.subject }), []);
    releasePostInsert();
    const oldResult = await storing;
    assert.equal(oldResult.ok, false);
    assert.match(oldResult.error.message, /REQUEST_REJECTED/);
    assert.deepEqual(ownedRows(foreign.subject), foreignOriginal);
    assert.deepEqual(ownedRows(owner.subject), [], 'Existing post-insert cleanup may not be mistaken for earlier physical exclusion');
    assert.deepEqual(afterLateInsert, [], 'Even the already prepared OLD INSERT must not recreate an owner row after the receipt');
    assert.equal(insertOutcome.rejected, true);
    assert.match(insertOutcome.message, /TRIP_OWNER_ERASED/);
  } finally {
    releaseInsert(); releasePostInsert();
    if (storing) await storing;
    for (const database of databases) database.close();
  }
});
}

// Separate default-OFF 003 preparation: actual CLI body and binding verifier,
// with ten own SQLite databases, not hosted D1 or a simulated schema readback.
{
const { test } = await import('node:test');
const { DatabaseSync } = await import('node:sqlite');
const { compileFunction } = await import('node:vm');
const { createHash } = await import('node:crypto');
const path = await import('node:path');
const { D1_TRIP_SCHEMA_STATEMENTS } = await import('../supabase/functions/_shared/trip-storage.js');
const classification = await import('./lib/trip-storage-legacy-classification.mjs');
const { verifyExistingWorkerBindings } = await import('./verify-cloudflare-trip-gateway.mjs');
const source = fs.readFileSync('scripts/prepare-cloudflare-trip-storage.mjs', 'utf8').replaceAll('\r\n', '\n');
const cli = source.slice(0, source.lastIndexOf('\nif (process.argv[1]'))
  .replace(/^import[\s\S]*?;\n/gm, '').replace(/^export /gm, '') + '\nreturn await main();';
const migrations = new Map(['001_trip_observations.sql', '002_owner_export_keyset.sql', '003_owner_erasure_insert_guard.sql']
  .map(name => [name, fs.readFileSync('cloudflare/trip-gateway/migrations/' + name)]));
const triggerName = 'trip_observations_erased_owner_no_insert';
const triggerSql = migrations.get('003_owner_erasure_insert_guard.sql').toString();
const version = '11111111-1111-4111-8111-111111111111';
function erasurePreparation({ present = [], setup = () => {}, mutate = () => {}, fileMutation = value => value } = {}) {
  const databases = Array.from({ length: 10 }, () => new DatabaseSync(':memory:'));
  const rows = databases.map((_, index) => ({ name: 'ravradar-trips-' + index,
    uuid: '00000000-0000-4000-8000-' + String(index).padStart(12, '0'), jurisdiction: 'eu' }));
  const events = [], messages = [], clock = 1800000000000;
  const env = { CLOUDFLARE_ACCOUNT_ID: 'a'.repeat(32), CLOUDFLARE_API_TOKEN: 'synthetic-token',
    GITHUB_REF: 'refs/heads/main', GITHUB_SHA: 'a'.repeat(40), REPAIR_LEASE_DEADLINE: String(clock + 1200000),
    TRIP_STORAGE_OWNER_ERASURE_GUARD: '1',TRIP_OWNER_ERASURE_EXPECTED_WORKER_VERSION:version,
    TRIP_OWNER_ERASURE_EXPECTED_BINDINGS_SHA256:createHash('sha256').update(JSON.stringify(rows.map((row,index)=>({binding:'TRIP_DB_'+index,database_name:row.name,database_id:row.uuid})))).digest('hex') };
  let ddl = 0;
  for (const [index, db] of databases.entries()) {
    db.exec(migrations.get('001_trip_observations.sql').toString());
    db.exec(migrations.get('002_owner_export_keyset.sql').toString());
    db.prepare("insert into trip_observations (owner_subject,owner_kind,client_observation_id,observed_at,submitted_at,payload_json,payload_sha256,source) values (?,'user',?,'2000-01-01','2000-01-02','{}',?,'live')")
      .run('synthetic-existing-owner-' + index, 'synthetic-trip-' + index, 'a'.repeat(64));
    db.prepare('insert into trip_owner_erasure_tombstones (owner_subject) values (?)').run('synthetic-erased-owner-' + index);
    if (present.includes(index)) db.exec(triggerSql);
  }
  databases[0].exec("insert into trip_storage_control (control_key,control_value) values ('d1_activation_attempted','true')");
  setup({ databases, rows, env });
  const data = () => databases.map(db => ['trip_observations', 'trip_observation_registry', 'trip_owner_erasure_tombstones', 'trip_storage_control']
    .map(table => db.prepare('select * from ' + table).all()));
  const original = data();
  const transport = async (input, init = {}) => {
    const url = new URL(input), event = { path: url.pathname, kind: 'metadata', method: init.method || 'GET' };
    events.push(event); let body;
    if (url.pathname.endsWith('/database')) {
      assert.equal(event.method, 'GET');
      body = { success: true, result: url.searchParams.get('page') === '1' ? rows : [] };
    } else if (url.pathname.endsWith('/deployments')) {
      assert.equal(event.method, 'GET');
      body = { success: true, result: { deployments: [{ id: '22222222-2222-4222-8222-222222222222',
        strategy: 'percentage', versions: [{ version_id: version, percentage: 100 }] }] } };
    } else if (url.pathname.includes('/versions/')) {
      assert.equal(event.method, 'GET');
      body = { success: true, result: { id: version, resources: { bindings: rows.map((row, index) => ({ type: 'd1', name: 'TRIP_DB_' + index, id: row.uuid })) } } };
    } else if (url.pathname.endsWith('/query')) {
      assert.equal(event.method, 'POST');
      const { sql, params = [] } = JSON.parse(init.body), index = rows.findIndex(row => url.pathname.endsWith('/' + row.uuid + '/query'));
      assert.ok(index >= 0); Object.assign(event, { sql, index, kind: 'read' });
      let results;
      if (sql === triggerSql) {
        event.kind = 'DDL'; ddl++; databases[index].exec(sql); results = [];
      } else {
        assert.match(sql, /^(select (?:type|control_value)|pragma index_)/);
        results = databases[index].prepare(sql).all(...params);
      }
      body = { success: true, result: [{ success: true, results }] };
    } else throw new Error('Unexpected synthetic API route');
    mutate({ body, event, events, databases, rows, env, ddl });
    return new Response(JSON.stringify(body));
  };
  const scope = { createHash, path, D1_TRIP_SCHEMA_STATEMENTS,
    fs: { readFileSync: file => { const bytes = migrations.get(path.basename(file)); assert.ok(bytes); return fileMutation(Buffer.from(bytes), path.basename(file)); },
      writeFileSync: () => assert.fail('003 must not write a configuration or plan'), appendFileSync: () => assert.fail('No activation publication') },
    execFileSync: (command, args) => { assert.equal(command, 'git'); events.push({ kind: 'git', args });
      return args[0] === 'ls-remote' ? (env.SYNTHETIC_REMOTE_SHA || env.GITHUB_SHA) + '\trefs/heads/main\n' : env.GITHUB_SHA; },
    boundedFetch: transport, verifyExistingWorkerBindings: options => verifyExistingWorkerBindings({ ...options, fetchImpl: transport }),
    TRIP_STORAGE_REQUIRED_SHARD_NAMES: classification.TRIP_STORAGE_REQUIRED_SHARD_NAMES, SHARD_COUNT: 10,
    classifyExistingTripStorageDatabases: classification.classifyExistingTripStorageDatabases,
    verifyLegacyActivationEvidence: () => assert.fail('003 must not adopt'),
    process: { env, argv: [] }, Date: class extends Date { static now() { return clock; } }, console: { log: value => messages.push(value) } };
  return { databases, events, messages, env, original, data,
    get ddl() { return ddl; },
    installed: () => databases.map((db, index) => db.prepare('select name from sqlite_master where name = ?').all(triggerName).length ? index : -1).filter(index => index >= 0),
    run: async phase => { scope.process.argv = ['node', 'prepare', '--existing-owner-erasure-guard-' + phase];
      return compileFunction('return(async()=>{' + cli + '})();', Object.keys(scope))(...Object.values(scope)); },
    close: () => { for (const db of databases) db.close(); } };
}
test('erasure upgrade: explicit route and exact opt-in required before any transport', async () => {
  for (const value of [undefined, '0', 'false', 'true', '01']) {
    const f = erasurePreparation(); f.env.TRIP_STORAGE_OWNER_ERASURE_GUARD = value;
    try { await assert.rejects(f.run('apply'), /TRIP_OWNER_ERASURE_GUARD_UNVERIFIED/); assert.equal(f.events.length, 0); assert.equal(f.ddl, 0); }
    finally { f.close(); }
  }
  const f = erasurePreparation();
  try { await assert.rejects(f.run('unknown'), /TRIP_PREPARATION_ARGUMENTS_INVALID/); assert.equal(f.events.length, 0); }
  finally { f.close(); }
});
test('erasure upgrade: actual SQLite missing-only003 and strict check preserve every existing row', async () => {
  for (const present of [[], [0, 3, 9], Array.from({ length: 10 }, (_, i) => i)]) {
    const f = erasurePreparation({ present });
    try {
      if (present.length < 10) { await assert.rejects(f.run('check')); assert.equal(f.ddl, 0); assert.equal(f.messages.length, 0); }
      await f.run('apply'); await f.run('check');
      assert.equal(f.ddl, 10 - present.length); assert.equal(f.installed().length, 10); assert.equal(f.messages.length, 2);
      assert.deepEqual(f.data(), f.original, 'No rewrite, owner purge, tombstone copy or backfill');
      const attempts = f.events.filter(event => event.kind === 'DDL');
      assert.equal(new Set(attempts.map(event => event.index)).size, attempts.length);
      assert.ok(attempts.every(event => event.sql === triggerSql));
    } finally { f.close(); }
  }
});
test('erasure upgrade: unknown tenth trigger, missing002 and wrong001 refuse before first DDL', async () => {
  for (const setup of [
    ({ databases }) => databases[9].exec(triggerSql.replace("'TRIP_OWNER_ERASED'", "'different'")),
    ({ databases }) => databases[9].exec('drop index trip_observations_owner_export'),
    ({ databases }) => databases[9].exec('alter table trip_observations add column unknown text'),
    ({ rows }) => { rows[9].uuid = rows[0].uuid; },
    ({ rows }) => { rows[9].jurisdiction = 'fedramp'; },
  ]) {
    const f = erasurePreparation({ setup });
    try { await assert.rejects(f.run('apply')); assert.equal(f.ddl, 0); assert.equal(f.messages.length, 0); assert.deepEqual(f.data(), f.original); }
    finally { f.close(); }
  }
  const f = erasurePreparation({ fileMutation: (bytes, name) => name.startsWith('003') ? Buffer.concat([bytes, Buffer.from('\n')]) : bytes });
  try { await assert.rejects(f.run('apply')); assert.equal(f.events.some(event => event.kind === 'metadata'), false); assert.equal(f.ddl, 0); }
  finally { f.close(); }
});
test('erasure upgrade: active version, binding, exact-main and lease drift stop before003', async () => {
  for (const fault of ['binding', 'version', 'main', 'lease']) {
    const f = erasurePreparation({ mutate: ({ body, event, events, env }) => {
      if (fault === 'binding' && event.path.includes('/versions/')) body.result.resources.bindings[9].id = version;
      if (fault === 'version' && event.path.endsWith('/deployments') && events.filter(e => e.path?.endsWith('/deployments')).length > 2)
        body.result.deployments[0].versions[0].version_id = '33333333-3333-4333-8333-333333333333';
      if (event.sql?.startsWith('select type, name, tbl_name') && events.filter(e => e.sql?.startsWith('select type, name, tbl_name')).length === 11) {
        if (fault === 'main') env.SYNTHETIC_REMOTE_SHA = 'b'.repeat(40);
        if (fault === 'lease') env.REPAIR_LEASE_DEADLINE = '0';
      }
    } });
    try { await assert.rejects(f.run('apply')); assert.equal(f.ddl, 0); assert.equal(f.messages.length, 0); }
    finally { f.close(); }
  }
});
test('erasure upgrade: false or unknown DDL acknowledgement retains accepted guard and stops later shards', async () => {
  for (const fault of ['outer', 'inner', 'missing', 'string', 'extra']) {
    const f = erasurePreparation({ mutate: ({ body, event }) => {
      if (event.kind !== 'DDL') return;
      if (fault === 'outer') body.success = false;
      if (fault === 'inner') body.result[0].success = false;
      if (fault === 'missing') delete body.result[0].success;
      if (fault === 'string') body.result[0].success = 'true';
      if (fault === 'extra') body.result.push(body.result[0]);
    } });
    try { await assert.rejects(f.run('apply')); assert.equal(f.ddl, 1); assert.deepEqual(f.installed(), [0]); assert.equal(f.messages.length, 0); assert.deepEqual(f.data(), f.original); }
    finally { f.close(); }
  }
});
test('erasure upgrade: first thrown error including raw zero/null is preserved with no retry or cleanup', async () => {
  for (const first of [new Error('synthetic-first'), 0, null]) {
    const f = erasurePreparation({ mutate: ({ event }) => { if (event.kind === 'DDL') throw first; } });
    try {
      let rejected = false, caught;
      try { await f.run('apply'); } catch (error) { rejected = true; caught = error; }
      assert.equal(rejected, true); assert.equal(caught, first); assert.equal(f.ddl, 1);
      assert.deepEqual(f.installed(), [0]); assert.equal(f.messages.length, 0); assert.deepEqual(f.data(), f.original);
    } finally { f.close(); }
  }
});
test('erasure upgrade: physical trigger readback missing, malformed or unacknowledged cannot finish', async () => {
  for (const fault of ['missing', 'malformed', 'unacknowledged']) {
    const f = erasurePreparation({ mutate: ({ body, event, ddl }) => {
      if (!ddl || !event.sql?.startsWith('select type, name, tbl_name')) return;
      if (fault === 'missing') body.result[0].results = [];
      if (fault === 'malformed') body.result[0].results = [null];
      if (fault === 'unacknowledged') delete body.result[0].success;
    } });
    try { await assert.rejects(f.run('apply')); assert.equal(f.ddl, 1); assert.deepEqual(f.installed(), [0]); assert.equal(f.messages.length, 0); }
    finally { f.close(); }
  }
});
test('erasure upgrade: exact concurrent trigger is not replaced; different definition stops before DDL', async () => {
  for (const different of [false, true]) {
    const f = erasurePreparation({ mutate: ({ event, events, databases }) => {
      if (event.path.endsWith('/deployments') && events.filter(e => e.path?.endsWith('/deployments')).length === 5)
        databases[0].exec(different ? triggerSql.replace("'TRIP_OWNER_ERASED'", "'different'") : triggerSql);
    } });
    try {
      if (different) { await assert.rejects(f.run('apply')); assert.equal(f.ddl, 0); assert.equal(f.messages.length, 0); }
      else { await f.run('apply'); assert.equal(f.ddl, 9); assert.equal(f.messages.length, 1); }
      assert.deepEqual(f.data(), f.original);
    } finally { f.close(); }
  }
});

test('erasure schema acknowledgment: ten actual SQLite readbacks stay schema-only, never an owner/Auth/backup ledger phase', async () => {
  const { assertOwnerErasureSchemaAcknowledgment }=await import('./prepare-cloudflare-trip-storage.mjs');
  const f=erasurePreparation();
  try {
    const plan=await f.run('plan'); assert.equal(f.ddl,0); assert.deepEqual(plan.missingShards,[0,1,2,3,4,5,6,7,8,9]);
    assert.deepEqual(f.data(),f.original);
    const receipt=await f.run('apply'); const checked=await f.run('check');
    assert.equal(f.ddl,10); assert.deepEqual(receipt,checked); assert.equal(receipt.shards.length,10);
    assert.strictEqual(assertOwnerErasureSchemaAcknowledgment(receipt,plan),receipt);
    assert.deepEqual(receipt.shards.map(row=>row.index),[0,1,2,3,4,5,6,7,8,9]);
    assert.equal(new Set(receipt.shards.map(row=>row.databaseIdentitySha256)).size,10);
    for(const flag of ['ownerErased','physicalDrainClaimed','authDeleted','backupsDeleted']) assert.equal(receipt[flag],false);
    for(const mutate of [value=>value.shards.pop(),value=>value.shards.reverse(),
      value=>{value.shards[9].databaseIdentitySha256=value.shards[0].databaseIdentitySha256;},
      value=>{value.shards[9].databaseIdentitySha256='b'.repeat(64);},
      value=>{value.shards[9].triggerDefinitionSha256='a'.repeat(64);},
      value=>{value.sourceSha='b'.repeat(40);},value=>{value.workerVersionId='33333333-3333-4333-8333-333333333333';},
      value=>{value.bindingMappingSha256='b'.repeat(64);},value=>{value.migrationSha256='b'.repeat(64);},
      value=>{value.ownerErased=true;},value=>{value.physicalDrainClaimed=true;},
      value=>{value.authDeleted=true;},value=>{value.backupsDeleted=true;},
      value=>{value.kind='TRIP_OWNER_ERASURE_TRIP_STAGE';},value=>{value.owner_subject='synthetic-owner';}]) {
      const wrong=structuredClone(receipt); mutate(wrong);
      assert.throws(()=>assertOwnerErasureSchemaAcknowledgment(wrong,plan),/TRIP_OWNER_ERASURE_SCHEMA_ACK_INVALID/);
    }
    assert.deepEqual(f.data(),f.original,'Schema receipt validation cannot purge or mutate any owner');
  } finally {f.close();}
});

test('erasure workflow: the actual named source program runs plan/apply/check once, never maintenance/drain/deploy/owner-delete', async () => {
  const { assertOwnerErasureSchemaAcknowledgment }=await import('./prepare-cloudflare-trip-storage.mjs');
  const workflow=fs.readFileSync('.github/workflows/deploy-trip-storage.yml','utf8').replaceAll('\r\n','\n');
  assert.match(workflow,/default: full-install/); assert.match(workflow,/group: ravradar-trip-storage-production\n  cancel-in-progress: false/);
  const title='      - name: Install and physically attest only the named owner-erasure INSERT guards\n';
  const at=workflow.indexOf(title),end=workflow.indexOf('\n      - name:',at+title.length);
  assert(at>0&&end>at); assert.equal(workflow.indexOf(title,at+title.length),-1);
  const step=workflow.slice(at,end); assert.match(step,/if: inputs.operation == 'existing-owner-erasure-guard'/);
  assert.doesNotMatch(step,/sleep|supabase|functions deploy|deployTripWorker|maintenance|eraseTripOwnerSources|restore/i);
  const match=/node --input-type=module <<'ERASURE_NODE'\n([\s\S]*?)          ERASURE_NODE/.exec(step); assert(match);
  const program=match[1].replace(/^          /gm,'').replace(/^import[\s\S]*?;\n/gm,'');
  for(const failure of ['', 'plan','apply','check','malformed-applied','changed-final']) {
    const f=erasurePreparation(),phases=[],outputs=[]; const first=new Error('actual-source-stage-stop');
    try {
      const prepareOwnerErasureGuard=async phase=>{
        phases.push(phase); if(phase===failure)throw first;
        const value=await f.run(phase);
        if(failure==='malformed-applied'&&phase==='apply')value.shards.pop();
        if(failure==='changed-final'&&phase==='check')value.shards[9].databaseIdentitySha256='b'.repeat(64);
        return value;
      };
      let caught;
      try {await compileFunction('return(async()=>{'+program+'})();',
        ['fs','prepareOwnerErasureGuard','assertOwnerErasureSchemaAcknowledgment','process','Date','console'])(
        {appendFileSync:(_file,text)=>outputs.push(text)},prepareOwnerErasureGuard,assertOwnerErasureSchemaAcknowledgment,
        {env:f.env},class extends Date{static now(){return 1800000000000;}},{log(){}});
      } catch(error){caught=error;}
      if(failure==='') {assert.equal(caught,undefined);assert.deepEqual(phases,['plan','apply','check']);
        assert.deepEqual(outputs,['schema_ready=true\nphysical_drain_claimed=false\nowner_erasure_verified=false\n']);assert.equal(f.ddl,10);}
      else {assert(caught);assert.equal(outputs.length,0);
        if(['plan','apply','check'].includes(failure))assert.strictEqual(caught,first);
        assert.deepEqual(phases,failure==='plan'?['plan']:failure==='apply'?['plan','apply']:
          failure==='malformed-applied'?['plan','apply']:['plan','apply','check']);}
      assert.deepEqual(f.data(),f.original);
    } finally {f.close();}
  }
  for(const title of ['Quiesce the existing D1 installation','Replace and attest the same-SQL Worker',
    'Restore and attest normal D1 after replacement']) {
    const start=workflow.indexOf('      - name: '+title+'\n'),next=workflow.indexOf('\n      - name:',start+1);
    assert(start>0);assert.match(workflow.slice(start,next),/if: inputs.operation != 'existing-owner-erasure-guard'/);
  }
  const recovery=workflow.slice(workflow.indexOf('      - name: Reattest and lease once for D1-only failure roll-forward'));
  for(const line of recovery.split('\n').filter(line=>line.startsWith('        if: ${{ ')))
    assert(line.startsWith("        if: ${{ inputs.operation != 'existing-owner-erasure-guard' && "));
  const idleHeading='      - name: Require fresh main-writer-idle metadata before owner-erasure INSERT guards\n';
  const idleAt=workflow.indexOf(idleHeading),idleEnd=workflow.indexOf('\n      - name:',idleAt+idleHeading.length);
  assert(idleAt>0&&idleEnd===at-1); assert.equal(workflow.indexOf(idleHeading,idleAt+idleHeading.length),-1);
  assert.equal(workflow.slice(idleAt,idleEnd).trimEnd(),[
    idleHeading.trimEnd(),
    "        if: inputs.operation == 'existing-owner-erasure-guard'",
    '        timeout-minutes: 2','        env:',
    '          GITHUB_TOKEN: ${{ github.token }}',
    '        run: node scripts/check-fixed-supabase-account-read-idle.mjs',
  ].join('\n'));
});
}
