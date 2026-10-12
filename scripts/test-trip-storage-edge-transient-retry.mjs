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
        if(['tombstone','registry-write','registry-delete'].includes(at))assert.equal(shard,0);
        // A concurrent matching row can exist even when this write has no positive receipt.
        // Only this own in-memory flag changes; record bytes, files and databases do not.
        if(at==='trip-write'){assert.equal(shard,targetShard);inserted=true;}
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
  if(stage==='purge')assert.deepEqual(result.events,[['tombstone',0],['purge',0]]);
});
for(const [label,changes] of [['missing',undefined],['null',null],['string','0'],['negative',-1],['fraction',0.5],['unsafe',Number.MAX_SAFE_INTEGER+1]])
test('556 delete rejects '+label+' changes without later purge',async()=>{
  const result=await normal('delete',{stage:'purge',success:true,changes});assert.equal(result.ok,false);
  assert.deepEqual(result.events,[['tombstone',0],['purge',0]]);
});
test('556 delete rejects first unsafe cumulative sum before later purge or registry',async()=>{
  const result=await normal('delete',{counts:[2**52,2**52]});assert.equal(result.ok,false);assert.deepEqual(result.statuses,[400]);
  assert.deepEqual(result.events,[['tombstone',0],['purge',0],['purge',1]]);
});
for(const [label,options,total] of [['normal',{},1],['already empty',{empty:true},0],['maximum safe',{counts:[2**52-1,2**52,...Array(8).fill(0)]},Number.MAX_SAFE_INTEGER]])
test('556 control positive '+label+' deletion preserves exact order',async()=>{
  const result=await normal('delete',options);assert.equal(result.ok,true);assert.equal(result.value,total);
  assert.deepEqual(result.events,[['tombstone',0],...Array.from({length:10},(_,i)=>['purge',i]),['registry-delete',0]]);
});
for(const stage of ['tombstone','purge','registry-delete'])test('556 control thrown first '+stage+' remains fixed and stops later work',async()=>{
  const result=await normal('delete',{stage,throwing:true});assert.equal(result.ok,false);assert.deepEqual(result.statuses,[400]);
  if(stage==='tombstone')assert.deepEqual(result.events,[['tombstone',0]]);
  if(stage==='purge')assert.deepEqual(result.events,[['tombstone',0],['purge',0]]);
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
const evaluate = (source, scope) => compileFunction('return (async()=>{\n'+source+'\n})();',Object.keys(scope))(...Object.values(scope));
const withoutImports = source => source.replace(/^import[\s\S]*?;\r?\n/gm,'');
const names=classification.TRIP_STORAGE_REQUIRED_SHARD_NAMES;
const shardRows=()=>names.map((name,index)=>({name,uuid:`00000000-0000-4000-8000-${String(index).padStart(12,'0')}`,jurisdiction:'eu'}));

async function prepareFixture({args=['--existing-worker-repair'],list=shardRows(),mutate=()=>{},databaseMutation=()=>{},fetchFailure=false}={}) {
  const calls=[],writes=[],files=[],databases=names.map(()=>new DatabaseSync(':memory:'));
  let error=null;
  try {
    for(const database of databases){database.exec(schema);database.prepare('insert into trip_storage_control(control_key,control_value) values(?,?)').run('d1_activation_attempted','true');}
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
        const write=!/^\s*select\b/i.test(sql);if(write)writes.push(sql);
        const statement=databases[index].prepare(sql);
        const results=write?(statement.run(...params),[]):statement.all(...params).map(row=>({...row}));
        body={success:true,result:[{success:true,results}]};
      } else throw new Error('Unexpected provider route');
      mutate(body,{url,init,calls});
      return {ok:true,status:200,headers:{get:()=>null},json:async()=>body};
    };
    await evaluate(withoutImports(preparation),{
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
repairTest('repair default CLI retains legacy evidence, nine DDL statements per shard and config',async()=>{
  const result=await prepareFixture({args:[]});assert.equal(result.error,null);
  assert.equal(result.writes.length,90);assert.equal(result.calls.filter(call=>call.url.includes('/actions/')).length,2);assert.equal(result.files.length,1);
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
const condition=(value,steps,failed,cancelled=false)=>value?Function('steps','failure','cancelled','return '+value.replace(/^\$\{\{\s*|\s*\}\}$/g,''))(steps,()=>failed,()=>cancelled):!failed;
async function workflowFixture({failCommand,driftCommand,preflightFailure=false,invalidLease=false,recoveryFailure=false,edgeUnavailable=false,badDeployVersion=false,lateDrift='',expireAfterWorkerPreflight=false,cancelRecovery=false,deployVersions={},unknownDeployStep='',falseReceiptStep=''}={}) {
  const states={},calls=[],logs=[];let firstError=preflightFailure?new Error('PREFLIGHT_FAILED'):null,clock=1800000000000,failedOnce=false;
  for(const step of steps){
    if(!condition(step.condition,states,!!firstError,cancelRecovery)) {states[step.id]={outcome:'skipped',outputs:{}};continue;}
    const outputs={},env={GITHUB_SHA:'a'.repeat(40),GITHUB_REF:'refs/heads/main',GITHUB_OUTPUT:'/synthetic/output',SUPABASE_PROJECT_ID:'synthetic',SUPABASE_URL:'https://synthetic.invalid',SUPABASE_PUBLISHABLE_KEY:'synthetic',TRIP_GATEWAY_SHARED_SECRET:'synthetic-existing-secret-at-least-32-characters',TRIP_WRANGLER_CONFIG_PATH:'/synthetic/config'};
    const deadlineId=/REPAIR_LEASE_DEADLINE: \$\{\{ steps\.([a-z_]+)\.outputs\.deadline \}\}/.exec(step.text)?.[1];
    if(deadlineId)env.REPAIR_LEASE_DEADLINE=invalidLease?'0':states[deadlineId].outputs.deadline;
    const versionId=/REPAIR_EXPECTED_WORKER_VERSION: \$\{\{ steps\.([a-z_]+)\.outputs\.version \}\}/.exec(step.text)?.[1];
    if(versionId)env.REPAIR_EXPECTED_WORKER_VERSION=states[versionId]?.outputs.version||'';
    const execFileSync=(command,args,options)=>{
      const action=command==='git'?(args[0]==='fetch'?'fetch':'head'):command==='supabase'?(args.at(-1)==='TRIP_STORAGE_MODE=d1'?'restore':'maintenance'):command==='npx'?(args.includes('deploy')?'deploy':'secret'):command==='sleep'?'drain':args[0].includes('verify-trip-storage-edge')?'edge':'worker';
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
  assert.match(workflow,/repair-existing-worker:\r?\n    if: \$\{\{ inputs\.operation == 'existing-worker-repair' \}\}/);
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
    if(String(input).endsWith('/health'))return new Response(JSON.stringify({ok:true,contract_version:'4.0.311',shards:10,storage_schema_version:1,idempotency_registry_schema_version:2,owner_erasure_tombstone_schema_version:1}));
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
