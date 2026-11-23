import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { checkFixedSupabaseAccountReadIdle } from './check-fixed-supabase-account-read-idle.mjs';
import { readAccountInactivitySource, accountInactivityCatalogQuery } from './verify-account-erasure-schema.mjs';
import { test } from 'node:test';
import { exerciseAccountNativeReceipt } from './lib/account-erasure-outbox-native-fixture.mjs';
import {
  createFixedAccountActivityHookController,
  readFixedAccountActivityCoverage,
  readFixedNativeActivityReceipt,
  readFixedNativeActivityReceiptSource,
  fixedNativeActivityReceiptArmQuery,
  fixedAccountActivityCoverageQuery,
  isFixedActivityHookWriteOwner,
  isFixedActivityHookCatalogReadOwner,
  readFixedAccountActivityHookCatalog,
  runFixedAccountActivityHookOperation,
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


const configResponse = (enabled, uri) => Response.json({
  hook_custom_access_token_enabled: enabled,
  hook_custom_access_token_uri: uri,
  smtp_pass: syntheticSecret,
});

function scriptedController(steps) {
  const requests = [];
  const controller = createFixedAccountActivityHookController({
    accessToken: 'synthetic-access-token',
    fetchImpl: async (url, request) => {
      assert.equal(url, 'https://api.supabase.com/v1/projects/afqhhdrkjfjtpadntdzo/config/auth');
      assert.equal(request.redirect, 'error');
      assert.equal(request.credentials, 'omit');
      assert.equal(request.cache, 'no-store');
      assert.equal(request.signal.aborted, false);
      const index = requests.length;
      requests.push(request);
      assert.ok(index < steps.length, 'no unexpected request or automatic retry');
      assert.deepEqual(request.headers, {
        Authorization: 'Bearer synthetic-access-token', Accept: 'application/json',
        ...(request.method === 'PATCH' ? { 'Content-Type': 'application/json' } : {}),
      });
      if (request.method === 'PATCH') {
        assert.deepEqual(Object.keys(JSON.parse(request.body)), ['hook_custom_access_token_enabled', 'hook_custom_access_token_uri']);
      } else {
        assert.equal(request.method, 'GET');
        assert.equal(request.body, undefined);
      }
      return steps[index](request);
    },
  });
  return { controller, requests };
}

const expectPatch = (enabled, uri) => request => {
  assert.equal(request.method, 'PATCH');
  assert.deepEqual(JSON.parse(request.body), {
    hook_custom_access_token_enabled: enabled, hook_custom_access_token_uri: uri,
  });
  // The bounded management response is not the independent GET readback.
  return configResponse(enabled, uri);
};

test('enables once from disabled empty and restores the exact empty-string preimage only after a fresh own-state read', async () => {
  const { controller, requests } = scriptedController([
    () => configResponse(false, ''), expectPatch(true, expectedUri), () => configResponse(true, expectedUri),
    () => configResponse(true, expectedUri), expectPatch(false, ''), () => configResponse(false, ''),
  ]);
  assert.deepEqual(await controller.rollback(), { status: 'ROLLBACK_NOT_AVAILABLE' });
  assert.equal(requests.length, 0);
  assert.deepEqual(await controller.enable(), { status: 'HOOK_ENABLED_VERIFIED' });
  assert.deepEqual(await controller.enable(), { status: 'OPERATION_ALREADY_ATTEMPTED' });
  assert.equal(requests.length, 3);
  const result = await controller.rollback();
  assert.deepEqual(result, { status: 'HOOK_ROLLBACK_VERIFIED' });
  assert.equal(JSON.stringify(result).includes(syntheticSecret), false);
  assert.deepEqual(requests.map(request => request.method), ['GET', 'PATCH', 'GET', 'GET', 'PATCH', 'GET']);
  assert.deepEqual(await controller.rollback(), { status: 'ROLLBACK_NOT_AVAILABLE' });
});

test('preserves a null preimage without inventing nullable PATCH support; explicit own-hook disable remains available', async () => {
  const { controller, requests } = scriptedController([
    () => configResponse(false, null), expectPatch(true, expectedUri), () => configResponse(true, expectedUri),
    () => configResponse(true, expectedUri), expectPatch(false, expectedUri), () => configResponse(false, expectedUri),
  ]);
  assert.deepEqual(await controller.enable(), { status: 'HOOK_ENABLED_VERIFIED' });
  assert.deepEqual(await controller.rollback(), { status: 'ROLLBACK_URI_UNPROVED' });
  assert.equal(requests.length, 3);
  assert.deepEqual(await controller.disable(), { status: 'HOOK_DISABLED_VERIFIED' });
  assert.equal(requests.length, 6);
});

test('explicit disable accepts only the exact existing own hook and never changes the URI or other settings', async () => {
  const { controller, requests } = scriptedController([
    () => configResponse(true, expectedUri), expectPatch(false, expectedUri), () => configResponse(false, expectedUri),
  ]);
  assert.deepEqual(await controller.disable(), { status: 'HOOK_DISABLED_VERIFIED' });
  assert.deepEqual(await controller.disable(), { status: 'OPERATION_ALREADY_ATTEMPTED' });
  assert.deepEqual(await controller.rollback(), { status: 'ROLLBACK_NOT_AVAILABLE' });
  assert.equal(requests.length, 3);
});

test('refuses stale, foreign, malformed or missing enable/disable preconditions without a PATCH', async () => {
  for (const [operation, enabled, uri] of [
    ['enable', true, expectedUri], ['enable', false, expectedUri],
    ['enable', false, syntheticSecret], ['enable', false, undefined],
    ['enable', false, ' '], ['enable', null, ''], ['enable', 'false', ''],
    ['disable', true, syntheticSecret], ['disable', false, expectedUri],
    ['disable', false, ''], ['disable', true, expectedUri + ' '],
  ]) {
    const { controller, requests } = scriptedController([() => configResponse(enabled, uri)]);
    const result = await controller[operation]();
    assert.deepEqual(result, { status: 'PRECONDITION_REFUSED' });
    assert.equal(requests.length, 1);
    assert.equal(JSON.stringify(result).includes(syntheticSecret), false);
  }
});

test('keeps missing credentials, failed authority and unavailable GETs write-free', async () => {
  let calls = 0;
  const empty = createFixedAccountActivityHookController({ accessToken: '', fetchImpl: async () => { calls++; } });
  assert.deepEqual(await empty.enable(), { status: 'CREDENTIAL_UNAVAILABLE' });
  assert.equal(calls, 0);
  for (const [response, status] of [
    [() => new Response(null, { status: 401 }), 'PERMISSION_REFUSED'],
    [() => new Response(null, { status: 403 }), 'PERMISSION_REFUSED'],
    [() => new Response(null, { status: 500 }), 'CONFIG_UNAVAILABLE'],
    [() => new Response('{}', { headers: { 'Content-Length': '65537' } }), 'CONFIG_UNAVAILABLE'],
    [() => new Response(syntheticSecret), 'CONFIG_UNAVAILABLE'],
    [() => { throw new DOMException('synthetic', 'AbortError'); }, 'CONFIG_UNAVAILABLE'],
  ]) {
    const { controller, requests } = scriptedController([response]);
    assert.deepEqual(await controller.enable(), { status });
    assert.equal(requests.length, 1);
  }
});

test('PATCH authority refusal cannot become rollback authority and its body remains unread', async () => {
  for (const code of [401, 403]) {
    let bodyReads = 0;
    const { controller, requests } = scriptedController([
      () => configResponse(false, ''), () => ({ status: code, get body() { bodyReads++; throw new Error(syntheticSecret); } }),
    ]);
    assert.deepEqual(await controller.enable(), { status: 'PERMISSION_REFUSED' });
    assert.deepEqual(await controller.rollback(), { status: 'ROLLBACK_NOT_AVAILABLE' });
    assert.equal(requests.length, 2);
    assert.equal(bodyReads, 0);
  }
});

test('unknown or aborted PATCH is read back once but never grants retry/rollback authority, even on a matching observation', async () => {
  for (const patchResponse of [
    () => { throw new DOMException('synthetic', 'AbortError'); },
    () => { throw new Error(syntheticSecret); },
    () => new Response(null, { status: 503 }),
    () => ({ status: 200, redirected: true }),
    () => new Response(syntheticSecret),
    () => new Response('{}', { headers: { 'Content-Length': '65537' } }),
  ]) {
    const { controller, requests } = scriptedController([
      () => configResponse(false, ''), patchResponse, () => configResponse(true, expectedUri),
    ]);
    const result = await controller.enable();
    assert.deepEqual(result, { status: 'WRITE_UNRESOLVED', patchOutcome: 'UNKNOWN', readback: { status: 'HOOK_ENABLED_EXPECTED' } });
    assert.equal(JSON.stringify(result).includes(syntheticSecret), false);
    for (const operation of ['enable', 'disable', 'rollback']) {
      assert.deepEqual(await controller[operation](), { status: 'WRITE_UNRESOLVED' });
    }
    assert.equal(requests.length, 3);
    assert.equal(requests.filter(request => request.method === 'PATCH').length, 1);
  }
});

test('unknown write plus unchanged readback stays unresolved; a later durable PATCH is never automatically counterwritten', async () => {
  let originalPatch;
  const { controller, requests } = scriptedController([
    () => configResponse(false, ''), request => { originalPatch = JSON.parse(request.body); throw new Error('synthetic timeout'); },
    () => configResponse(false, ''),
  ]);
  assert.deepEqual(await controller.enable(), {
    status: 'WRITE_UNRESOLVED', patchOutcome: 'UNKNOWN', readback: { status: 'HOOK_DISABLED', disabledHookUri: 'EMPTY' },
  });
  // The first write may materialize after that GET. No new operation is sent.
  assert.deepEqual(originalPatch, { hook_custom_access_token_enabled: true, hook_custom_access_token_uri: expectedUri });
  assert.deepEqual(await controller.disable(), { status: 'WRITE_UNRESOLVED' });
  assert.equal(requests.length, 3);
});

test('an acknowledged PATCH alone cannot prove success when independent readback is foreign, stale, unavailable or unauthorized', async () => {
  for (const [readback, expected] of [
    [() => configResponse(true, syntheticSecret), { status: 'HOOK_ENABLED_DIFFERENT' }],
    [() => configResponse(false, ''), { status: 'HOOK_DISABLED', disabledHookUri: 'EMPTY' }],
    [() => new Response(syntheticSecret), { status: 'CONFIG_UNAVAILABLE' }],
    [() => new Response(null, { status: 403 }), { status: 'PERMISSION_REFUSED' }],
  ]) {
    const { controller, requests } = scriptedController([
      () => configResponse(false, ''), expectPatch(true, expectedUri), readback,
    ]);
    assert.deepEqual(await controller.enable(), { status: 'WRITE_UNRESOLVED', patchOutcome: 'ACKNOWLEDGED', readback: expected });
    assert.deepEqual(await controller.rollback(), { status: 'WRITE_UNRESOLVED' });
    assert.equal(requests.length, 3);
  }
});

test('rollback refuses a configuration changed since the acknowledged activation', async () => {
  const { controller, requests } = scriptedController([
    () => configResponse(false, ''), expectPatch(true, expectedUri), () => configResponse(true, expectedUri),
    () => configResponse(true, syntheticSecret),
  ]);
  assert.deepEqual(await controller.enable(), { status: 'HOOK_ENABLED_VERIFIED' });
  assert.deepEqual(await controller.rollback(), { status: 'PRECONDITION_REFUSED' });
  assert.equal(requests.length, 4);
  assert.equal(requests.filter(request => request.method === 'PATCH').length, 1);
});

test('one controller never overlaps its fixed transport operations', async () => {
  let release;
  const first = new Promise(resolve => { release = resolve; });
  const { controller, requests } = scriptedController([
    () => first, expectPatch(true, expectedUri), () => configResponse(true, expectedUri),
  ]);
  const enabling = controller.enable();
  assert.deepEqual(await controller.disable(), { status: 'OPERATION_IN_PROGRESS' });
  assert.equal(requests.length, 1);
  release(configResponse(false, ''));
  assert.deepEqual(await enabling, { status: 'HOOK_ENABLED_VERIFIED' });
  assert.equal(requests.length, 3);
});


// Reuse the normal current79 synthetic catalog shape; no native or hosted proof.
function hookCatalogRows(){
 const src=readAccountInactivitySource(),exposed=new Set(['record_account_lifecycle_activity','prepare_account_inactivity_notice','get_account_inactivity_notice_status','list_account_inactivity_notices']),
  server=new Set(['get_account_inactivity_notice_service_status','claim_account_inactivity_notice','hold_account_inactivity_notice','acknowledge_account_inactivity_notice']);
 const timed=new Set(['record_account_lifecycle_activity','prepare_account_inactivity_notice','claim_account_inactivity_notice','hold_account_inactivity_notice','acknowledge_account_inactivity_notice','account_native_activity_capture','account_native_activity_token_hook']);
 const functions=Object.fromEntries(Object.keys(src.bodies).map(name=>[name,{present:true,sameNameCount:1,definer:true,owner:'rr_native_test',ownerBypassesRls:true,
  kind:'f',language:'plpgsql',volatility:'v',returnsSet:false,argumentNames:src.argumentNames[name],argumentDefaults:src.argumentDefaults[name],
  result:name==='account_inactivity_notice_hold'?'text':'jsonb',configuration:['search_path=""',...(timed.has(name)?['lock_timeout='+(['record_account_lifecycle_activity','account_native_activity_capture','account_native_activity_token_hook'].includes(name)?'250ms':'5s')]:[])],
  bodySha256:src.bodies[name],publicExecute:false,anonExecute:false,authenticatedExecute:exposed.has(name),serviceExecute:server.has(name),authAdminExecute:name==='account_native_activity_token_hook',unexpectedAcl:false}]));
 const columns={
  account_inactivity_policy:[['singleton','bool',true,true,0],['notices_enabled','bool',true,true,0],['coverage_status','text',true,true,0],['coverage_epoch','uuid',true,true,0],['coverage_started_at','timestamptz',false,false,0],['delivery_qualified','bool',true,true,0]],
  account_lifecycle_activity:[['user_id','uuid',true,false,0],['revision','int8',true,false,0],['first_observed_at','timestamptz',true,false,0],['last_activity_at','timestamptz',true,false,0],['coverage_epoch','uuid',false,false,0]],
  account_inactivity_notices:[['notice_id','uuid',true,false,0],['target_user_id','uuid',true,false,0],['requested_by','uuid',true,false,0],['state','text',true,false,0],['hold_reason','text',false,false,0],['revision','int8',true,true,0],['activity_revision','int8',false,false,0],['activity_at','timestamptz',false,false,0],['coverage_epoch','uuid',false,false,0],['created_at','timestamptz',true,true,0],['attempt_id','uuid',false,false,0],['attempt_ids','_uuid',true,true,1],['recipient_digest','text',false,false,0],['auth_user_created_at','text',false,false,0],['claimed_at','timestamptz',false,false,0],['provider_id','uuid',false,false,0],['accepted_at','timestamptz',false,false,0],['delivered_at','timestamptz',false,false,0],['delete_not_before','timestamptz',false,false,0]],
 };
 const counts={account_inactivity_policy:4,account_lifecycle_activity:2,account_inactivity_notices:11};
 const tables=Object.fromEntries(Object.entries(columns).map(([name,fields])=>[name,{present:true,regular:true,rls:true,forceRls:true,owner:'rr_native_test',ownerBypassesRls:true,columns:fields,
  foreignKeys:name==='account_lifecycle_activity'?['FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE']:null,checks:counts[name],constraintCount:counts[name]+1+Number(name==='account_lifecycle_activity'),primaryKey:1,
  policies:0,userTriggers:0,unexpectedAcl:false,unexpectedColumnAcl:false,directAccess:false}]));
 const definitions=Object.entries(counts).flatMap(([name,count])=>Array.from({length:count},(_,i)=>[name+'.'+name+'_check'+String(i).padStart(2,'0'),'CHECK (SYNTHETIC_CURRENT79)'])).sort((a,b)=>a[0].localeCompare(b[0]));
 return [{metadata:{tables,functions,checks:{format:'PG_CONSTRAINTDEF_V1',postgresMajor:17,definitions},activeIndex:{unique:true,valid:true,ready:true,keys:'2',predicate:"(state <> 'CANCELLED'::text)"},
  policy:{rows:1,noticesEnabled:false,coverageStatus:'UNKNOWN',coverageStartedNull:true,deliveryQualified:false}}}];
}
function goodHookCatalog() {
  const rows = hookCatalogRows();
  rows[0].authAdminPublicUsage = true;
  for (const group of ['functions', 'tables']) for (const item of Object.values(rows[0].metadata[group])) item.owner = 'postgres';
  return rows;
}
function hostedHookOwner(operation) {
  return {
    GITHUB_ACTIONS: 'true', RUNNER_ENVIRONMENT: 'github-hosted',
    GITHUB_REPOSITORY: 'jakobjorgensen82-commits/RavRadar',
    GITHUB_EVENT_NAME: 'workflow_dispatch', GITHUB_REF: 'refs/heads/main',
    GITHUB_RUN_ATTEMPT: '1', GITHUB_SHA: 'a'.repeat(40),
    GITHUB_WORKFLOW_REF: 'jakobjorgensen82-commits/RavRadar/.github/workflows/deploy-trip-storage.yml@refs/heads/main',
    GITHUB_JOB: 'configure-fixed-account-activity-hook',
    RAVRADAR_FIXED_ACTIVITY_HOOK_OPERATION: operation,
    RAVRADAR_FIXED_ACTIVITY_HOOK_CONFIRMATION: operation === 'enable'
      ? 'ENABLE-FIXED-ACCOUNT-ACTIVITY-HOOK' : 'DISABLE-FIXED-ACCOUNT-ACTIVITY-HOOK',
  };
}
test('catalog uses the normal read-only endpoint and adds only fixed schema USAGE to the existing query', async () => {
  let calls = 0;
  const result = await readFixedAccountActivityHookCatalog({
    accessToken: 'synthetic-access-token', fetchImpl: async (url, request) => {
      calls++;
      assert.equal(url, 'https://api.supabase.com/v1/projects/afqhhdrkjfjtpadntdzo/database/query');
      assert.equal(request.method, 'POST');
      assert.equal(request.redirect, 'error');
      assert.equal(request.credentials, 'omit');
      assert.equal(request.cache, 'no-store');
      assert.equal(request.signal.aborted, false);
      assert.deepEqual(request.headers, {
        Authorization: 'Bearer synthetic-access-token', Accept: 'application/json', 'Content-Type': 'application/json',
      });
      assert.deepEqual(JSON.parse(request.body), {
        query: "select saved.metadata, pg_catalog.has_schema_privilege('supabase_auth_admin','public','USAGE') as \"authAdminPublicUsage\" from ("
          + accountInactivityCatalogQuery.trim().replace(/;$/, '') + ') as saved;',
        read_only: true,
      });
      return Response.json(goodHookCatalog(), { status: 201 });
    },
  });
  assert.equal(calls, 1);
  assert.deepEqual(result, { status: 'HOOK_CATALOG_VERIFIED', publicSchemaUsage: true,
    sourceBodyAndAclVerified: true, checkExpressionSemanticsVerified: false });
});
test('catalog refuses absent USAGE, changed body/ACL/policy and unexpected fields', async () => {
  for (const change of [
    rows => rows[0].authAdminPublicUsage = false,
    rows => delete rows[0].authAdminPublicUsage,
    rows => rows[0].authAdminPublicUsage = 'true',
    rows => rows[0].metadata.functions.account_native_activity_token_hook.bodySha256 = '0'.repeat(64),
    rows => rows[0].metadata.functions.account_native_activity_token_hook.authAdminExecute = false,
    rows => rows[0].metadata.functions.account_native_activity_token_hook.authenticatedExecute = true,
    rows => rows[0].metadata.functions.account_native_activity_capture.serviceExecute = true,
    rows => rows[0].metadata.policy.coverageStatus = 'CAPTURING',
    rows => rows[0].metadata.policy.noticesEnabled = true,
    rows => { for (const group of ['functions', 'tables']) for (const item of Object.values(rows[0].metadata[group])) item.owner = 'rr_native_test'; },
    rows => rows[0].extra = syntheticSecret,
    rows => rows[0].metadata.extra = syntheticSecret,
  ]) {
    const rows = goodHookCatalog(); change(rows);
    const result = await readFixedAccountActivityHookCatalog({
      accessToken: 'test', fetchImpl: async () => Response.json(rows, { status: 201 }),
    });
    assert.deepEqual(result, { status: 'HOOK_CATALOG_REFUSED' });
    assert.equal(JSON.stringify(result).includes(syntheticSecret), false);
  }
});
test('catalog transport is bounded and failure never reaches Auth configuration', async () => {
  for (const [response, expected, expectedReceipt] of [
    [() => new Response(null, { status: 403 }), 'HOOK_CATALOG_PERMISSION_REFUSED', 'NATIVE_RECEIPT_PERMISSION_REFUSED'],
    [() => new Response(null, { status: 200 }), 'HOOK_CATALOG_UNAVAILABLE', 'NATIVE_RECEIPT_UNAVAILABLE'],
    [() => new Response('{}', { status: 201, headers: { 'Content-Length': '65537' } }), 'HOOK_CATALOG_REFUSED', 'NATIVE_RECEIPT_UNAVAILABLE'],
    [() => new Response(syntheticSecret, { status: 201 }), 'HOOK_CATALOG_UNAVAILABLE', 'NATIVE_RECEIPT_UNAVAILABLE'],
    [() => { throw new DOMException('synthetic', 'AbortError'); }, 'HOOK_CATALOG_UNAVAILABLE', 'NATIVE_RECEIPT_UNAVAILABLE'],
    [() => Response.json({ result: goodHookCatalog(), extra: syntheticSecret }, { status: 201 }), 'HOOK_CATALOG_REFUSED', 'NATIVE_RECEIPT_REFUSED'],
  ]) {
    let catalogCalls = 0;
    const catalog = await readFixedAccountActivityHookCatalog({ accessToken: 'test', fetchImpl: async url => {
      catalogCalls++; assert.ok(url.endsWith('/database/query')); return response();
    }});
    assert.deepEqual(catalog, { status: expected });
    assert.equal(catalogCalls, 1);
    let calls = 0;
    const result = await runFixedAccountActivityHookOperation({
      operation: 'enable', env: hostedHookOwner('enable'), accessToken: 'test',
      fetchImpl: async url => { calls++; assert.ok(url.endsWith('/database/query')); return response(); },
    });
    assert.deepEqual(result, { status: expectedReceipt });
    assert.equal(calls, 1);
  }
});
test('write owner requires exact purpose, hosted first main attempt and the actual one job', async () => {
  const owner = hostedHookOwner('enable');
  assert.equal(isFixedActivityHookWriteOwner(owner, 'enable'), true);
  assert.equal(isFixedActivityHookWriteOwner(hostedHookOwner('disable'), 'disable'), true);
  for (const candidate of [null, {}, ...Object.keys(owner).map(key => ({ ...owner, [key]: 'unexpected' }))]) {
    let calls = 0;
    assert.equal(isFixedActivityHookWriteOwner(candidate, 'enable'), false);
    assert.deepEqual(await runFixedAccountActivityHookOperation({
      operation: 'enable', env: candidate, accessToken: 'test', fetchImpl: async () => { calls++; },
    }), { status: 'OWNER_REQUIRED' });
    assert.equal(calls, 0);
  }
  for (const operation of ['rollback', 'unknown', undefined]) assert.equal(isFixedActivityHookWriteOwner(owner, operation), false);
});
test('normal enable orders catalog, fresh state, one exact PATCH, independent readback', async () => {
  for (const state of ['UNARMED', 'ARMED', 'CAPTURED']) {
    const calls = [];
    const result = await runFixedAccountActivityHookOperation({
      operation: 'enable', env: hostedHookOwner('enable'), accessToken: 'test',
      fetchImpl: async (url, request) => {
        calls.push(request.method);
        if (calls.length === 1) {
          assert.ok(url.endsWith('/database/query'));
          assert.equal(request.method, 'POST');
          assert.equal(JSON.parse(request.body).read_only, true);
          return Response.json({ result: nativeReceiptRows(state) }, { status: 201 });
        }
        assert.ok(url.endsWith('/config/auth'));
        if (calls.length === 2) return configResponse(false, null);
        if (calls.length === 3) return expectPatch(true, expectedUri)(request);
        assert.equal(calls.length, 4); assert.equal(request.method, 'GET');
        return configResponse(true, expectedUri);
      },
    });
    assert.deepEqual(result, { status: 'HOOK_ENABLED_VERIFIED' });
    assert.deepEqual(calls, ['POST', 'GET', 'PATCH', 'GET']);
  }
});
test('explicit disable remains possible if the database or coverage is invalid', async () => {
  const calls = [];
  const result = await runFixedAccountActivityHookOperation({
    operation: 'disable', env: hostedHookOwner('disable'), accessToken: 'test',
    fetchImpl: async (url, request) => {
      assert.ok(url.endsWith('/config/auth'), 'a DB read cannot block emergency disable');
      calls.push(request.method);
      if (calls.length === 1) return configResponse(true, expectedUri);
      if (calls.length === 2) return expectPatch(false, expectedUri)(request);
      return configResponse(false, expectedUri);
    },
  });
  assert.deepEqual(result, { status: 'HOOK_DISABLED_VERIFIED' });
  assert.deepEqual(calls, ['GET', 'PATCH', 'GET']);
});
test('actual workflow preserves old operations and gates the fixed job with weather then trip', async () => {
  const workflow = (await fs.readFile(new URL('../.github/workflows/deploy-trip-storage.yml', import.meta.url), 'utf8')).replaceAll('\r\n', '\n');
  const header = workflow.slice(0, workflow.indexOf('\njobs:\n'));
  assert.match(header, /default: full-install/);
  for (const option of ['full-install', 'existing-worker-repair', 'existing-owner-export-upgrade', 'existing-owner-erasure-guard',
    'typed-trip-catalog-read', 'fixed-account-activity-hook-read', 'fixed-account-activity-hook-catalog-read', 'fixed-account-activity-hook-enable', 'fixed-account-activity-hook-disable']) {
    assert.ok(header.includes('          - ' + option + '\n'));
  }
  assert.ok(header.includes("  group: ${{ (inputs.operation == 'fixed-account-activity-hook-enable' || inputs.operation == 'fixed-account-activity-hook-disable') && 'ravradar-weather-production-v2' || 'ravradar-trip-storage-production' }}"));
  assert.match(header, /concurrency:\n  group: [^\n]+\n  queue: max\n  cancel-in-progress: false/);
  assert.match(header, /permissions:\n  contents: read\n  actions: read\n  pull-requests: read\n/);
  const start = workflow.indexOf('\n  configure-fixed-account-activity-hook:\n');
  assert.ok(start > 0 && workflow.indexOf('\n  configure-fixed-account-activity-hook:\n', start + 1) < 0);
  const next = workflow.slice(start + 1).search(/\n  [a-zA-Z0-9_-]+:\n/);
  const job = next < 0 ? workflow.slice(start) : workflow.slice(start, start + next + 1);
  assert.ok(job.includes("    if: ${{ inputs.operation == 'fixed-account-activity-hook-enable' || inputs.operation == 'fixed-account-activity-hook-disable' }}\n"));
  assert.match(job, /concurrency:\n      group: ravradar-trip-storage-production\n      queue: max\n      cancel-in-progress: false/);
  const positions = [
    'Require the exact hook purpose before any credential', 'actions/checkout@v7',
    'node scripts/weather-source-gate.mjs check', 'Reject unavailable source authority before Auth configuration',
    'node --test scripts/test-fixed-account-activity-hook.mjs', 'node scripts/check-fixed-supabase-account-read-idle.mjs',
    'test "$(git rev-parse origin/main^{commit})" = "$EXPECTED_HEAD_SHA"',
    'SUPABASE_ACCESS_TOKEN:', 'run: node scripts/read-fixed-account-activity-hook.mjs --',
  ].map(text => {
    const at = job.indexOf(text); assert.ok(at >= 0, text);
    assert.equal(job.indexOf(text, at + text.length), -1, text + ' must be unique'); return at;
  });
  assert.deepEqual(positions, [...positions].sort((a, b) => a - b));
  assert.ok(job.includes('test "${{ steps.fixed_hook_source.outputs.required }}" = false'));
  assert.ok(job.includes('test "$GITHUB_RUN_ATTEMPT" = 1'));
  assert.ok(job.includes('ENABLE-FIXED-ACCOUNT-ACTIVITY-HOOK') && job.includes('DISABLE-FIXED-ACCOUNT-ACTIVITY-HOOK'));
  assert.equal((job.match(/secrets\./g) ?? []).length, 1);
  assert.equal(/db push|functions deploy|wrangler|curl|notices_enabled|coverage_status\s*=|auth\.users/.test(job), false);
});


test('catalog-only read has its own exact read-job purpose and never qualifies as a writer', async () => {
  const readOwner = { ...hostedHookOwner('enable'), GITHUB_JOB: 'read-fixed-supabase-metadata', RAVRADAR_FIXED_ACTIVITY_HOOK_OPERATION: 'catalog-read' };
  delete readOwner.RAVRADAR_FIXED_ACTIVITY_HOOK_CONFIRMATION;
  assert.equal(isFixedActivityHookCatalogReadOwner(readOwner), true);
  assert.equal(isFixedActivityHookWriteOwner(readOwner, 'enable'), false);
  for (const key of Object.keys(readOwner)) assert.equal(isFixedActivityHookCatalogReadOwner({ ...readOwner, [key]: 'unexpected' }), false);
  const workflow = (await fs.readFile(new URL('../.github/workflows/deploy-trip-storage.yml', import.meta.url), 'utf8')).replaceAll('\r\n', '\n');
  const begin = workflow.indexOf('\n  read-fixed-supabase-metadata:\n');
  const after = workflow.slice(begin + 1);
  const next = after.search(/\n  [a-zA-Z0-9_-]+:\n/);
  const job = next < 0 ? after : after.slice(0, next);
  assert.ok(begin > 0 && job.includes("inputs.operation == 'fixed-account-activity-hook-catalog-read'"));
  const source = job.indexOf('node scripts/weather-source-gate.mjs check');
  const idle = job.indexOf('node scripts/check-fixed-supabase-account-read-idle.mjs');
  const catalog = job.indexOf('node scripts/read-fixed-account-activity-hook.mjs --catalog');
  assert.ok(source >= 0 && idle > source && catalog > idle);
  assert.ok(job.includes('RAVRADAR_FIXED_ACTIVITY_HOOK_OPERATION: catalog-read'));
  assert.ok(job.includes("if: inputs.operation == 'fixed-account-activity-hook-read'\n"));
});


test('a queued ordinary weather request or another real writer still refuses Auth admission before its credential step', async () => {
  for (const blocked of ['queued', 'in_progress']) {
    let calls = 0;
    await assert.rejects(checkFixedSupabaseAccountReadIdle({
      repository: 'jakobjorgensen82-commits/RavRadar', runId: 100, githubToken: 'SYNTHETIC',
      fetchImpl: async (url, request) => {
        calls++;
        assert.equal(request.method, 'GET');
        assert.ok(url.startsWith('https://api.github.com/repos/jakobjorgensen82-commits/RavRadar/actions/runs?'));
        if (url.includes('status=in_progress')) return Response.json({ total_count: 1, workflow_runs: [
          { id: blocked === 'in_progress' ? 101 : 100, status: 'in_progress', head_branch: 'main' },
        ] });
        assert.ok(url.includes('status=queued'));
        return Response.json({ total_count: 1, workflow_runs: [{
          id: 102, status: 'queued', head_branch: 'main', path: '.github/workflows/update-and-deploy.yml',
        }] });
      },
    }), /FIXED_READ_MAIN_NOT_IDLE/);
    assert.equal(calls, blocked === 'queued' ? 2 : 1);
  }
});


function coverageRows(state = 'UNKNOWN', startedAt = null) {
  return [{ observedAt: '2026-11-22T12:00:00.123456Z', policy: [{
    coverageStatus: state, coverageEpoch: '60000000-0000-4000-8000-000000000001',
    coverageStartedAt: startedAt, noticesEnabled: false, deliveryQualified: false,
  }] }];
}

test('coverage readback uses one fixed metadata-only read and cannot start coverage', async () => {
  let calls = 0;
  const rows = coverageRows();
  const result = await readFixedAccountActivityCoverage({
    accessToken: 'SYNTHETIC', fetchImpl: async (url, request) => {
      calls++;
      assert.equal(url, 'https://api.supabase.com/v1/projects/afqhhdrkjfjtpadntdzo/database/query');
      assert.equal(request.method, 'POST');
      assert.equal(request.redirect, 'error');
      assert.equal(request.credentials, 'omit');
      assert.equal(request.cache, 'no-store');
      assert.equal(request.signal.aborted, false);
      assert.deepEqual(JSON.parse(request.body), { query: fixedAccountActivityCoverageQuery, read_only: true });
      assert(!/\b(?:insert|update|delete|call|do|alter|create)\b/i.test(fixedAccountActivityCoverageQuery));
      assert(!/\bfrom\s+(?:public\.(?:profiles|account_activity_journal|account_lifecycle_activity|account_inactivity_notices)|auth\.)/i.test(fixedAccountActivityCoverageQuery));
      return Response.json(rows, { status: 201 });
    },
  });
  assert.equal(calls, 1);
  assert.equal(result.status, 'COVERAGE_UNKNOWN_OBSERVED');
  assert.equal(result.observedAt, rows[0].observedAt);
  assert.equal(result.coverageStartedAt, null);
  assert.match(result.coverageEpochSha256, /^[a-f0-9]{64}$/);
  assert.equal(JSON.stringify(result).includes(rows[0].policy[0].coverageEpoch), false);
  assert.equal(result.activityEligibility, 'HOLD');
  for (const key of ['noticesEnabled', 'deliveryQualified', 'automaticDeletionEnabled', 'authAcceptanceProved', 'activationAuthority'])
    assert.equal(result[key], false);
});

test('coverage readback preserves the closed epoch/start and keeps unknown or invalid activity on HOLD', async () => {
  const started = '2026-11-22T11:59:59.999999Z';
  let first;
  for (const wrapper of [rows => rows, rows => ({ result: rows }), rows => ({ data: rows })]) {
    const result = await readFixedAccountActivityCoverage({ accessToken: 'SYNTHETIC',
      fetchImpl: async () => Response.json(wrapper(coverageRows('CAPTURING', started)), { status: 201 }) });
    assert.equal(result.status, 'COVERAGE_CAPTURING_OBSERVED');
    assert.equal(result.coverageStartedAt, started);
    assert.equal(result.activityEligibility, 'HOLD');
    assert.equal(result.authAcceptanceProved, false);
    if (first) assert.deepEqual(result, first);
    first = result;
  }
  for (const startedAt of [null, started]) {
    const invalid = await readFixedAccountActivityCoverage({ accessToken: 'SYNTHETIC',
      fetchImpl: async () => Response.json(coverageRows('INVALID', startedAt), { status: 201 }) });
    assert.equal(invalid.status, 'COVERAGE_INVALID_OBSERVED');
    assert.equal(invalid.activityEligibility, 'HOLD');
    assert.equal(invalid.automaticDeletionEnabled, false);
  }
});

test('coverage readback refuses ambiguous, future, incomplete or wider policy metadata', async () => {
  const base = coverageRows('CAPTURING', '2026-11-22T11:00:00.000000Z');
  for (const mutate of [
    rows => rows.length = 0,
    rows => rows.push(structuredClone(rows[0])),
    rows => rows[0].extra = syntheticSecret,
    rows => rows[0].policy = null,
    rows => rows[0].policy.length = 0,
    rows => rows[0].policy.push(structuredClone(rows[0].policy[0])),
    rows => rows[0].policy[0].extra = syntheticSecret,
    rows => rows[0].policy[0].coverageEpoch = null,
    rows => rows[0].policy[0].coverageEpoch = '00000000-0000-0000-0000-000000000000',
    rows => rows[0].policy[0].noticesEnabled = true,
    rows => rows[0].policy[0].deliveryQualified = true,
    rows => rows[0].policy[0].coverageStatus = 'UNKNOWN',
    rows => rows[0].policy[0].coverageStatus = 'OTHER',
    rows => rows[0].policy[0].coverageStartedAt = null,
    rows => rows[0].policy[0].coverageStartedAt = '2026-11-22T12:00:00.123457Z',
    rows => rows[0].policy[0].coverageStartedAt = '2026-02-31T00:00:00.000000Z',
    rows => rows[0].observedAt = 'infinity',
    rows => rows[0].observedAt = '2026-11-22T12:00:00Z',
  ]) {
    const rows = structuredClone(base); mutate(rows);
    assert.deepEqual(await readFixedAccountActivityCoverage({ accessToken: 'SYNTHETIC',
      fetchImpl: async () => Response.json(rows, { status: 201 }) }), { status: 'COVERAGE_STATE_REFUSED' });
  }
});

test('coverage transport keeps permission, abort, size and malformed outcomes private and write-free', async () => {
  let calls = 0;
  assert.deepEqual(await readFixedAccountActivityCoverage({ accessToken: '', fetchImpl: async () => { calls++; } }),
    { status: 'CREDENTIAL_UNAVAILABLE' });
  assert.equal(calls, 0);
  for (const status of [401, 403, 500, 200]) {
    let read = false;
    const result = await readFixedAccountActivityCoverage({ accessToken: 'SYNTHETIC', fetchImpl: async () => ({
      status, get body() { read = true; throw new Error(syntheticSecret); },
    }) });
    assert.equal(read, false);
    assert.deepEqual(result, { status: [401, 403].includes(status) ? 'COVERAGE_PERMISSION_REFUSED' : 'COVERAGE_UNAVAILABLE' });
  }
  for (const fetchImpl of [
    async () => { throw new DOMException(syntheticSecret, 'AbortError'); },
    async () => new Response(syntheticSecret, { status: 201 }),
    async () => new Response('{}', { status: 201, headers: { 'content-length': '65537' } }),
    async () => new Response(new Uint8Array([0xff]), { status: 201 }),
    async () => ({ status: 201, redirected: true }),
  ]) assert.deepEqual(await readFixedAccountActivityCoverage({ accessToken: 'SYNTHETIC', fetchImpl }), { status: 'COVERAGE_UNAVAILABLE' });
});

test('existing owner cannot manufacture coverage-start authority from a caller date or acceptance flag', async () => {
  let calls = 0;
  const env = { ...hostedHookOwner('enable'), RAVRADAR_FIXED_ACTIVITY_HOOK_OPERATION: 'coverage-start',
    RAVRADAR_FIXED_ACTIVITY_HOOK_CONFIRMATION: 'START-ACCOUNT-ACTIVITY-COVERAGE',
    RAVRADAR_AUTH_ACCEPTED: 'true', RAVRADAR_AUTH_ACCEPTED_AT: '2020-01-01T00:00:00Z' };
  assert.equal(isFixedActivityHookWriteOwner(env, 'coverage-start'), false);
  const result = await runFixedAccountActivityHookOperation({ operation: 'coverage-start', env, accessToken: 'SYNTHETIC',
    fetchImpl: async () => { calls++; throw new Error('No transport is authorized'); } });
  assert.deepEqual(result, { status: 'OWNER_REQUIRED' });
  assert.equal(calls, 0);
});


function nativeReceiptRows(state = 'UNARMED') {
  const rows = goodHookCatalog(), row = rows[0];
  row.metadata.functions.account_native_activity_token_hook.bodySha256 = readFixedNativeActivityReceiptSource().hookBodySha256;
  row.metadata.tables.account_native_activity_receipt = { ...structuredClone(row.metadata.tables.account_inactivity_policy),
    columns:[['singleton','bool',true,true,0],['arm_epoch','uuid',true,true,0],['coverage_epoch','uuid',false,false,0],
      ['armed_at','timestamptz',false,false,0],['native_started_at','timestamptz',false,false,0],['native_captured_at','timestamptz',false,false,0]],
    checks:7,constraintCount:8 };
  row.policyEpoch = '60000000-0000-4000-8000-000000000002';
  row.observedAt = '2026-11-22T12:00:03.000000Z';
  row.receipt = [{armEpoch:'60000000-0000-4000-8000-000000000003',
    coverageEpoch:state === 'UNARMED' ? null : row.policyEpoch,
    armedAt:state === 'UNARMED' ? null : '2026-11-22T12:00:00.000000Z',
    nativeStartedAt:state === 'CAPTURED' ? '2026-11-22T12:00:01.000000Z' : null,
    nativeCapturedAt:state === 'CAPTURED' ? '2026-11-22T12:00:02.000000Z' : null}];
  return rows;
}

test('current enable requires the exact installed SQL80 receipt and never falls back to the old catalog', async () => {
  const invalid = [
    goodHookCatalog(),
    ...[
      rows => rows[0].metadata.functions.account_native_activity_token_hook.bodySha256 = readAccountInactivitySource().bodies.account_native_activity_token_hook,
      rows => rows[0].metadata.functions.account_native_activity_token_hook.authAdminExecute = false,
      rows => rows[0].metadata.tables.account_native_activity_receipt.directAccess = true,
      rows => rows[0].authAdminPublicUsage = false,
      rows => rows[0].receipt[0].coverageEpoch = '60000000-0000-4000-8000-000000000009',
      rows => rows[0].metadata.policy.noticesEnabled = true,
    ].map(change => { const rows = nativeReceiptRows('ARMED'); change(rows); return rows; }),
  ];
  for (const rows of invalid) {
    let calls = 0;
    const result = await runFixedAccountActivityHookOperation({
      operation: 'enable', env: hostedHookOwner('enable'), accessToken: 'test',
      fetchImpl: async (url, request) => {
        calls++;
        assert.equal(url, 'https://api.supabase.com/v1/projects/afqhhdrkjfjtpadntdzo/database/query');
        assert.equal(request.method, 'POST');
        const body = JSON.parse(request.body);
        assert.equal(body.read_only, true);
        assert.match(body.query, /from public\.account_native_activity_receipt/);
        assert(!body.query.includes(fixedNativeActivityReceiptArmQuery));
        return Response.json(rows, { status: 201 });
      },
    });
    assert.deepEqual(result, { status: 'NATIVE_RECEIPT_REFUSED' });
    assert.equal(calls, 1, 'no fallback, Auth GET or PATCH after refused receipt');
    assert(!JSON.stringify(result).includes(syntheticSecret));
  }
});

test('native receipt append preserves the whole original hook except the explicit optional observer', () => {
  const old = readAccountInactivitySource().migrations[1].sql.match(/as \$token_hook\$\n([\s\S]*?)\n\$token_hook\$;/)[1];
  const append = readFixedNativeActivityReceiptSource();
  const body = append.sql.match(/as \$token_hook\$\n([\s\S]*?)\n\$token_hook\$;/)[1];
  const start = body.indexOf('  capture_result := public.account_native_activity_capture(target);');
  const end = body.indexOf("  return jsonb_build_object('claims',event->'claims');");
  assert(start > 0 && end > start);
  const inverse = (body.slice(0,start) + '  perform public.account_native_activity_capture(target);\n' + body.slice(end))
    .replace('declare target uuid; native_started timestamptz := pg_catalog.clock_timestamp(); capture_result jsonb;', 'declare target uuid;');
  assert.equal(inverse,old);
  assert.equal((append.sql.match(/create or replace function/g)||[]).length,1);
  assert.match(body,/if capture_result->'recorded' = 'true'::jsonb then/);
  assert.match(body,/native_started >= r\.armed_at/);
  assert.match(body,/for update nowait/);
  assert(!/update public\.account_inactivity_policy|raise notice|raise log/i.test(append.sql));
  const ddl = append.sql.slice(append.sql.indexOf('create table'),append.sql.indexOf('alter table'));
  assert(!/user_id|token|claims|email/i.test(ddl));
  assert(!/\$[0-9]|coverage_status\s*=\s*'CAPTURING'|gen_random_uuid|account_activity_journal/.test(fixedNativeActivityReceiptArmQuery));
  assert.match(fixedNativeActivityReceiptArmQuery,/r\.armed_at is null/);
  assert.match(fixedNativeActivityReceiptArmQuery,/armed_at = pg_catalog\.clock_timestamp\(\)/);
});

test('native receipt reader sends only the fixed read-only metadata query and never arms', async () => {
  let calls = 0, actualQuery;
  const result = await readFixedNativeActivityReceipt({ accessToken:'SYNTHETIC',fetchImpl:async(url,request)=>{
    calls++;assert.equal(url,'https://api.supabase.com/v1/projects/afqhhdrkjfjtpadntdzo/database/query');
    assert.equal(request.method,'POST');assert.equal(request.redirect,'error');assert.equal(request.credentials,'omit');
    assert.equal(request.cache,'no-store');assert.equal(request.signal.aborted,false);
    const payload=JSON.parse(request.body);actualQuery=payload.query;assert.equal(payload.read_only,true);
    assert.match(payload.query,/\('account_native_activity_receipt'\)/);
    assert.match(payload.query,/from public\.account_native_activity_receipt/);
    // Privilege-name literals in the reused catalog are not SQL writes. The
    // fixed endpoint's read_only flag also enforces this independently.
    assert(!/\b(?:update|insert into|delete from)\s+public\./i.test(payload.query));
    assert(!payload.query.includes(fixedNativeActivityReceiptArmQuery));
    return Response.json(nativeReceiptRows(),{status:201});
  }});
  const tableSource = " from targets w left join pg_catalog.pg_class c on c.oid=pg_catalog.to_regclass('public.'||w.name)),";
  const receiptTableSource = " from (select name from targets union all values ('account_native_activity_receipt')) w left join pg_catalog.pg_class c on c.oid=pg_catalog.to_regclass('public.'||w.name)),";
  const split = actualQuery.split('\n    from (');
  assert.equal(split.length, 2);
  assert.ok(split[1].endsWith(') as saved;'));
  const inner = split[1].slice(0, -') as saved;'.length);
  assert.equal(inner.split(receiptTableSource).length, 2, 'only tables gains the receipt target');
  assert.equal(inner.replace(receiptTableSource, tableSource), accountInactivityCatalogQuery.trim().replace(/;$/, ''),
    'all legacy targets, CHECK definitions and other metadata remain the exact original query');
  assert.equal(calls,1);assert.equal(result.status,'NATIVE_RECEIPT_UNARMED');
  assert.equal(result.nativeCaptureObserved,false);assert.equal(result.authResponseObserved,false);
  assert.equal(result.coverageStartAuthority,false);assert.equal(result.activityEligibility,'HOLD');
  assert.equal(result.noticesEnabled,false);assert.equal(result.automaticDeletionEnabled,false);
});

test('native-only receipt retains exact times and epoch hashes without claiming login response or policy authority', async () => {
  for(const state of ['ARMED','CAPTURED']) {
    const rows=nativeReceiptRows(state);
    const result=await readFixedNativeActivityReceipt({accessToken:'SYNTHETIC',fetchImpl:async()=>Response.json(rows,{status:201})});
    assert.equal(result.status,state==='CAPTURED'?'NATIVE_CAPTURE_OBSERVED':'NATIVE_RECEIPT_ARMED');
    assert.equal(result.armedAt,rows[0].receipt[0].armedAt);assert.equal(result.nativeStartedAt,rows[0].receipt[0].nativeStartedAt);
    assert.equal(result.nativeCapturedAt,rows[0].receipt[0].nativeCapturedAt);
    assert.equal(result.sourceBodyAndAclVerified,true);assert.equal(result.nativeCaptureObserved,state==='CAPTURED');
    assert.equal(result.checkExpressionSemanticsVerified,false);assert.equal(result.authResponseObserved,false);
    assert.equal(result.coverageStartAuthority,false);assert.equal(result.automaticDeletionEnabled,false);
    for(const uuid of [rows[0].receipt[0].armEpoch,rows[0].receipt[0].coverageEpoch])assert(!JSON.stringify(result).includes(uuid));
    assert.match(result.armEpochSha256,/^[a-f0-9]{64}$/);assert.match(result.coverageEpochSha256,/^[a-f0-9]{64}$/);
  }
});

test('native receipt refuses old or changed source, rights, epoch, chronology and wider metadata', async () => {
  const base=nativeReceiptRows('CAPTURED');
  for(const mutate of [
    r=>r[0].metadata.functions.account_native_activity_token_hook.bodySha256=readAccountInactivitySource().bodies.account_native_activity_token_hook,
    r=>r[0].metadata.functions.account_native_activity_token_hook.authAdminExecute=false,
    r=>r[0].metadata.functions.account_native_activity_token_hook.serviceExecute=true,
    r=>r[0].metadata.tables.account_native_activity_receipt.directAccess=true,
    r=>r[0].metadata.tables.account_native_activity_receipt.unexpectedColumnAcl=true,
    r=>r[0].metadata.tables.account_native_activity_receipt.forceRls=false,
    r=>r[0].metadata.tables.account_native_activity_receipt.owner='rr_native_test',
    r=>r[0].metadata.policy.coverageStatus='INVALID',
    r=>r[0].authAdminPublicUsage=false,
    r=>r[0].policyEpoch='60000000-0000-4000-8000-000000000009',
    r=>r[0].receipt.push(structuredClone(r[0].receipt[0])),
    r=>r[0].receipt[0].userId=syntheticSecret,
    r=>r[0].receipt[0].armEpoch=null,
    r=>r[0].receipt[0].coverageEpoch=null,
    r=>r[0].receipt[0].nativeStartedAt='2026-11-22T11:59:59.999999Z',
    r=>r[0].receipt[0].nativeCapturedAt='2026-11-22T12:00:00.500000Z',
    r=>r[0].receipt[0].nativeCapturedAt=null,
    r=>r[0].observedAt='2026-11-22T12:00:01.500000Z',
  ]) {
    const rows=structuredClone(base);mutate(rows);
    assert.deepEqual(await readFixedNativeActivityReceipt({accessToken:'SYNTHETIC',fetchImpl:async()=>Response.json(rows,{status:201})}),{status:'NATIVE_RECEIPT_REFUSED'});
  }
});

test('native receipt cannot turn missing credentials, denied access, abort or incomplete JSON into positive evidence', async () => {
  let calls=0;
  assert.deepEqual(await readFixedNativeActivityReceipt({accessToken:'',fetchImpl:async()=>{calls++;}}),{status:'CREDENTIAL_UNAVAILABLE'});
  assert.equal(calls,0);
  for(const status of [401,403,500]) {
    let bodyRead=false;
    const result=await readFixedNativeActivityReceipt({accessToken:'SYNTHETIC',fetchImpl:async()=>({status,get body(){bodyRead=true;throw Error(syntheticSecret);}})});
    assert.equal(bodyRead,false);assert.deepEqual(result,{status:[401,403].includes(status)?'NATIVE_RECEIPT_PERMISSION_REFUSED':'NATIVE_RECEIPT_UNAVAILABLE'});
  }
  for(const fetchImpl of [
    async()=>{throw new DOMException(syntheticSecret,'AbortError');},
    async()=>new Response(syntheticSecret,{status:201}),
    async()=>new Response('{}',{status:201,headers:{'content-length':'65537'}}),
    async()=>({status:201,redirected:true}),
  ])assert.deepEqual(await readFixedNativeActivityReceipt({accessToken:'SYNTHETIC',fetchImpl}),{status:'NATIVE_RECEIPT_UNAVAILABLE'});
});

test('proposed native receipt fixture refuses any non-owned server before creation or SQL changes', async () => {
  let sqlCalls=0;
  await assert.rejects(exerciseAccountNativeReceipt({repositoryRoot:new URL('..',import.meta.url),
    psql:async()=>'*',runSql:async()=>{sqlCalls++;}}),/Existing owned native host only/);
  assert.equal(sqlCalls,0);
});
