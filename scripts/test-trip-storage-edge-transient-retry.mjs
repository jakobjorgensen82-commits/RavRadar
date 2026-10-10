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
