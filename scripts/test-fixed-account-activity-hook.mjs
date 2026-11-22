import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  isFixedActivityHookReadOwner,
  readFixedAccountActivityHook,
  readFixedAccountActivityHookProjection,
} from './read-fixed-account-activity-hook.mjs';

const expectedUri = 'pg-functions://postgres/public/account_native_activity_token_hook';
const syntheticSecret = 'SYNTHETIC_PRIVATE_CONFIG_VALUE';

test('projects only the exact expected Auth target and sends only the fixed GET', async () => {
  let calls = 0;
  const status = await readFixedAccountActivityHook({
    accessToken: 'synthetic-access-token',
    fetchImpl: async (url, request) => {
      calls++;
      assert.equal(url, 'https://api.supabase.com/v1/projects/afqhhdrkjfjtpadntdzo/config/auth');
      assert.equal(request.method, 'GET');
      assert.deepEqual(request.headers, {
        Authorization: 'Bearer synthetic-access-token',
        Accept: 'application/json',
      });
      assert.equal(request.redirect, 'error');
      assert.equal(request.credentials, 'omit');
      assert.equal(request.cache, 'no-store');
      assert.equal(request.signal.aborted, false);
      return Response.json({
        hook_custom_access_token_enabled: true,
        hook_custom_access_token_uri: expectedUri,
        smtp_pass: syntheticSecret,
      });
    },
  });
  assert.equal(calls, 1);
  assert.equal(status, 'HOOK_ENABLED_EXPECTED');
});

test('reports disabled, different, or unknown configuration without revealing a target or secret', async () => {
  for (const [enabled, uri, expected] of [
    [false, expectedUri, 'HOOK_DISABLED'],
    [true, syntheticSecret, 'HOOK_ENABLED_DIFFERENT'],
    [true, null, 'CONFIG_UNAVAILABLE'],
    [true, ' ', 'CONFIG_UNAVAILABLE'],
    [null, expectedUri, 'CONFIG_UNAVAILABLE'],
    ['true', expectedUri, 'CONFIG_UNAVAILABLE'],
  ]) {
    const fetchImpl = async () => Response.json({
      hook_custom_access_token_enabled: enabled,
      hook_custom_access_token_uri: uri,
      smtp_pass: syntheticSecret,
    });
    assert.equal(await readFixedAccountActivityHook({ accessToken: 'test', fetchImpl }), expected);
  }
});

test('classifies the disabled target using only the four fixed values', async () => {
  for (const [uri, disabledHookUri] of [
    [null, 'EMPTY'],
    ['', 'EMPTY'],
    [expectedUri, 'EXPECTED'],
    [syntheticSecret, 'DIFFERENT'],
    [expectedUri + ' ', 'DIFFERENT'],
    [undefined, 'UNPROVED'],
    [' ', 'UNPROVED'],
    [{ secret: syntheticSecret }, 'UNPROVED'],
  ]) {
    let calls = 0;
    const fetchImpl = async (url, request) => {
      calls++;
      assert.equal(request.method, 'GET');
      return Response.json({
        hook_custom_access_token_enabled: false,
        hook_custom_access_token_uri: uri,
        smtp_pass: syntheticSecret,
      });
    };
    assert.deepEqual(await readFixedAccountActivityHookProjection({ accessToken: 'test', fetchImpl }), {
      status: 'HOOK_DISABLED', disabledHookUri,
    });
    assert.equal(calls, 1);
  }
});

test('leaves rejected HTTP bodies unread and hides malformed, oversized and transport results', async () => {
  for (const [status, expected] of [[401, 'PERMISSION_REFUSED'], [403, 'PERMISSION_REFUSED'], [500, 'CONFIG_UNAVAILABLE']]) {
    let bodyReads = 0;
    const fetchImpl = async () => ({
      status,
      get body() {
        bodyReads++;
        throw new Error(syntheticSecret);
      },
    });
    assert.equal(await readFixedAccountActivityHook({ accessToken: 'test', fetchImpl }), expected);
    assert.equal(bodyReads, 0);
  }
  for (const fetchImpl of [
    async () => new Response(syntheticSecret.repeat(4096)),
    async () => new Response('{}', { headers: { 'Content-Length': '65537' } }),
    async () => new Response(syntheticSecret),
    async () => { throw new Error(syntheticSecret); },
    async () => ({ status: 200, redirected: true }),
  ]) {
    assert.equal(await readFixedAccountActivityHook({ accessToken: 'test', fetchImpl }), 'CONFIG_UNAVAILABLE');
  }
  let calls = 0;
  const fetchImpl = async () => { calls++; };
  assert.equal(await readFixedAccountActivityHook({ accessToken: '', fetchImpl }), 'CREDENTIAL_UNAVAILABLE');
  assert.equal(calls, 0);
});

test('only the first hosted main attempt of the existing owner qualifies', () => {
  const hosted = {
    GITHUB_ACTIONS: 'true',
    RUNNER_ENVIRONMENT: 'github-hosted',
    GITHUB_REPOSITORY: 'jakobjorgensen82-commits/RavRadar',
    GITHUB_EVENT_NAME: 'workflow_dispatch',
    GITHUB_REF: 'refs/heads/main',
    GITHUB_RUN_ATTEMPT: '1',
    GITHUB_WORKFLOW_REF: 'jakobjorgensen82-commits/RavRadar/.github/workflows/deploy-trip-storage.yml@refs/heads/main',
  };
  assert.equal(isFixedActivityHookReadOwner(hosted), true);
  for (const field of Object.keys(hosted)) {
    assert.equal(isFixedActivityHookReadOwner({ ...hosted, [field]: 'unexpected' }), false);
  }
});
