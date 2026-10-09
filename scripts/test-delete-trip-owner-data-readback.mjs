import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';
import { deleteCloudflareTrips, externalOwnerSubject, listCloudflareTrips, verifyTripGatewaySignature }
  from '../supabase/functions/_shared/trip-storage.js';

// Execute the actual CLI body and actual signed gateway clients. Only the
// existing import seam, argv/env, log sink and fetch transport are supplied.
// No real process credentials, external HTTP, Worker or database is involved.
const cli = fs.readFileSync(new URL('../scripts/delete-trip-owner-data.mjs', import.meta.url), 'utf8')
  .replace(/^import[\s\S]*?;\r?\n/gm, '');
const ownerId = '11111111-1111-4111-8111-111111111111';
const gateway = 'https://synthetic-trip-storage.example.workers.dev';
const supabase = 'https://synthetic-trip-storage.supabase.co';
const secret = 'synthetic-shared-secret-for-local-test-only';
const routeOrder = ['d1-delete', 'supabase-delete', 'd1-readback', 'supabase-readback'];

async function run({ body = [], status = 200, jsonError, firstError, failAt, confirmed = true } = {}) {
  const calls = [], logs = [];
  let bodyReads = 0;
  const fetchImpl = async (input, options) => {
    const url = new URL(input);
    assert.ok([gateway, supabase].includes(url.origin), 'Never use an external transport');
    if (url.origin === gateway) {
      assert.equal(options.method, 'POST');
      const payload = JSON.parse(options.body);
      assert.match(payload.owner_subject, /^usr_v1_/);
      assert.equal(options.body.includes(ownerId), false, 'The normal HMAC boundary excludes raw owner identity');
      assert.equal(await verifyTripGatewaySignature({ secret,
        timestamp: options.headers['X-RavRadar-Timestamp'], signature: options.headers['X-RavRadar-Signature'],
        method: options.method, pathname: url.pathname, bodyText: options.body }), true);
      if (url.pathname === '/v1/trips/delete-owner') {
        calls.push('d1-delete');
        if (failAt === 'd1-delete') throw firstError;
        return Response.json({ ok: true, deleted: 2 });
      }
      assert.equal(url.pathname, '/v1/trips/list');
      assert.equal(payload.limit, 1);
      calls.push('d1-readback');
      return Response.json({ ok: true, rows: failAt === 'd1-readback' ? [{}] : [] });
    }
    assert.equal(url.pathname, '/rest/v1/observations');
    assert.equal(url.searchParams.get('user_id'), `eq.${ownerId}`);
    assert.equal(options.headers.apikey, 'synthetic-service-key');
    if (options.method === 'DELETE') {
      calls.push('supabase-delete');
      assert.equal(options.headers.Prefer, 'return=minimal');
      return { ok: failAt !== 'supabase-delete', status: failAt === 'supabase-delete' ? 503 : 204 };
    }
    calls.push('supabase-readback');
    assert.equal(url.searchParams.get('select'), 'id');
    assert.equal(url.searchParams.get('limit'), '1');
    if (failAt === 'supabase-readback') throw firstError;
    return { ok: status >= 200 && status < 300, status, async json() {
      bodyReads += 1;
      if (jsonError) throw jsonError;
      return body;
    } };
  };
  const scope = {
    URL, console: { log: value => logs.push(value) }, fetch: fetchImpl, externalOwnerSubject,
    deleteCloudflareTrips: options => deleteCloudflareTrips({ ...options, fetchImpl }),
    listCloudflareTrips: options => listCloudflareTrips({ ...options, fetchImpl }),
    process: {
      argv: ['node', 'synthetic-cli', ...(confirmed ? ['--confirm-delete-owner-data'] : [])],
      env: { TARGET_SUPABASE_USER_ID: ownerId, TRIP_PSEUDONYM_SECRET_V1: secret,
        CLOUDFLARE_TRIP_GATEWAY_URL: gateway, TRIP_GATEWAY_SHARED_SECRET: secret,
        SUPABASE_URL: supabase, SUPABASE_SERVICE_ROLE_KEY: 'synthetic-service-key' },
    },
  };
  const result = await vm.runInNewContext(`(async () => { ${cli}\n})()`, scope,
    { filename: 'actual-delete-owner-cli-with-synthetic-transport.js' })
    .then(() => ({ ok: true }), error => ({ ok: false, error }));
  assert.deepEqual(calls, routeOrder.slice(0, calls.length), 'Preserve actual deletion/readback order; never retry');
  if (!result.ok) assert.deepEqual(logs, [], 'Failure cannot declare verified deletion');
  return { ...result, calls, logs, bodyReads };
}

test('actual CLI declares verified deletion only after an empty array readback', async () => {
  const result = await run();
  assert.equal(result.ok, true, result.error?.message);
  assert.deepEqual(result.calls, routeOrder);
  assert.equal(result.bodyReads, 1);
  assert.equal(result.logs.length, 1);
  assert.match(result.logs[0], /slettet og verificeret/);
  assert.equal(result.logs[0].includes(ownerId), false);
  assert.equal(result.logs[0].includes(secret), false);
});

for (const [name, body] of [
  ['empty object', {}], ['error object', { error: 'synthetic-readback-failure' }],
  ['array-like object', { length: 0 }], ['empty string', ''], ['number', 0], ['boolean', false],
  ['null', null], ['nonempty array', [{ id: 'synthetic-remaining' }]],
]) {
  test(`actual CLI refuses ${name} as proof of empty owner storage`, async () => {
    const result = await run({ body });
    assert.equal(result.ok, false, `${name} must not produce verified-deletion success`);
    assert.equal(result.logs.length, 0);
    assert.deepEqual(result.calls, routeOrder);
  });
}

test('HTTP failure stops before parsing even an apparently empty readback', async () => {
  const result = await run({ status: 503 });
  assert.equal(result.ok, false);
  assert.equal(result.bodyReads, 0);
  assert.match(result.error.message, /Supabase-verifikationen/);
});

test('malformed JSON preserves its first error and never reports success', async () => {
  const error = new SyntaxError('synthetic-malformed-json');
  const result = await run({ jsonError: error });
  assert.equal(result.ok, false);
  assert.equal(result.error, error);
  assert.equal(result.bodyReads, 1);
});

for (const failAt of ['d1-delete', 'supabase-delete', 'd1-readback', 'supabase-readback']) {
  test(`failure at ${failAt} stops all later operations`, async () => {
    const error = new Error('synthetic-first-transport-error');
    const result = await run({ failAt, firstError: error });
    assert.equal(result.ok, false);
    assert.equal(result.calls.length, routeOrder.indexOf(failAt) + 1);
    if (failAt === 'd1-delete' || failAt === 'supabase-readback') assert.equal(result.error, error);
  });
}

test('missing explicit CLI confirmation reaches no transport', async () => {
  const result = await run({ confirmed: false });
  assert.equal(result.ok, false);
  assert.match(result.error.message, /eksplicitte flag/);
  assert.equal(result.calls.length, 0);
});
