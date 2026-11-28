import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';
import { eraseTripOwnerSources } from '../supabase/functions/_shared/trip-owner-erasure.js';
import { deleteCloudflareTrips, externalOwnerSubject, listCloudflareTrips, sha256Hex, verifyTripGatewaySignature }
  from '../supabase/functions/_shared/trip-storage.js';
import { inactivityNoticeBody } from '../supabase/functions/_shared/inactivity-notice-mail.mjs';
import { runAutomaticAccountErasureBatch, runManualAccountErasure, MANUAL_ACCOUNT_ERASURE_CONFIRMATION, validateManualAccountErasurePayload }
  from '../supabase/functions/_shared/account-lifecycle.js';

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

async function run({ body = [], status = 200, jsonError, firstError, failAt, confirmed = true,
  direct = false, targetUserId = ownerId, heldReadback = null,
  serviceKey = 'synthetic-service-key' } = {}) {
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
    assert.equal(options.headers.apikey, serviceKey);
    assert.equal(new Headers(options.headers).get('authorization'),
      serviceKey.startsWith('sb_secret_') ? null : `Bearer ${serviceKey}`,
      'Both Supabase requests retain apikey and use Bearer only for legacy keys');
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
      if (heldReadback) { heldReadback.entered(); return await heldReadback.result; }
      if (jsonError) throw jsonError;
      return body;
    } };
  };
  const scope = {
    URL, console: { log: value => logs.push(value) }, fetch: fetchImpl, externalOwnerSubject,
    deleteCloudflareTrips: options => deleteCloudflareTrips({ ...options, fetchImpl }),
    listCloudflareTrips: options => listCloudflareTrips({ ...options, fetchImpl }),
    eraseTripOwnerSources: options => eraseTripOwnerSources({ ...options, fetchImpl }),
    process: {
      argv: ['node', 'synthetic-cli', ...(confirmed ? ['--confirm-delete-owner-data'] : [])],
      env: { TARGET_SUPABASE_USER_ID: targetUserId, TRIP_PSEUDONYM_SECRET_V1: secret,
        CLOUDFLARE_TRIP_GATEWAY_URL: gateway, TRIP_GATEWAY_SHARED_SECRET: secret,
        SUPABASE_URL: supabase, SUPABASE_SERVICE_ROLE_KEY: serviceKey },
    },
  };
  const result = await (direct
    ? scope.eraseTripOwnerSources({ userId: targetUserId, pseudonymSecret: secret,
      gatewayUrl: gateway, sharedSecret: secret, supabaseUrl: supabase, serviceKey })
    : vm.runInNewContext(`(async () => { ${cli}\n})()`, scope,
      { filename: 'actual-delete-owner-cli-with-synthetic-transport.js' }))
    .then(value => ({ ok: true, value }), error => ({ ok: false, error }));
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

for (const [name, serviceKey] of [
  ['opaque secret key', 'sb_secret_SYNTHETIC_ONLY_NOT_A_REAL_CREDENTIAL'],
  ['legacy service-role JWT', 'eyJhbGciOiJIUzI1NiJ9.eyJyb2xlIjoic2VydmljZV9yb2xlIn0.SYNTHETIC_ONLY'],
]) {
  test(`actual CLI preserves both Supabase request headers for ${name}`, async () => {
    const result = await run({ serviceKey });
    assert.equal(result.ok, true, result.error?.message);
    assert.deepEqual(result.calls, routeOrder);
    assert.equal(result.bodyReads, 1);
    assert.equal(result.logs.length, 1);
    assert.match(result.logs[0], /slettet og verificeret/);
    assert.equal(result.logs[0].includes(serviceKey), false);
  });
}

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

test('shared server erasure returns only the acknowledged trip-stage receipt', async () => {
  const result = await run({ direct: true });
  assert.equal(result.ok, true, result.error?.message);
  assert.deepEqual(result.calls, routeOrder);
  assert.deepEqual(result.logs, []);
  assert.deepEqual(result.value, { deletedFromD1: 2, d1DeleteAcknowledged: true,
    d1GuardedListEmpty: true, supabaseListEmpty: true });
  assert.equal(Object.isFrozen(result.value), true);
  assert.equal(JSON.stringify(result.value).includes(ownerId), false);
  assert.equal(JSON.stringify(result.value).includes(secret), false);
});

for (const failAt of ['d1-delete', 'supabase-readback']) {
  for (const firstError of [0, null]) {
    test(`shared server erasure preserves raw ${firstError} at ${failAt}`, async () => {
      const result = await run({ direct: true, failAt, firstError });
      assert.equal(result.ok, false);
      assert.equal(result.error, firstError);
      assert.equal(result.value, undefined);
      assert.equal(result.calls.length, routeOrder.indexOf(failAt) + 1);
    });
  }
}

test('shared server erasure rejects invalid owner before any transport', async () => {
  const result = await run({ direct: true, targetUserId: 'not-an-owner-uuid' });
  assert.equal(result.ok, false);
  assert.match(result.error.message, /TARGET_SUPABASE_USER_ID er ugyldigt/);
  assert.deepEqual(result.calls, []);
});

test('shared server erasure waits for actual Supabase body before any receipt', async () => {
  let entered, resolveReadback;
  const started = new Promise(resolve => { entered = resolve; });
  const readback = new Promise(resolve => { resolveReadback = resolve; });
  let settled = false;
  const pending = run({ direct: true, heldReadback: { entered, result: readback } })
    .finally(() => { settled = true; });
  try {
    await started;
    assert.equal(settled, false);
    resolveReadback([]);
    const result = await pending;
    assert.equal(result.ok, true);
    assert.equal(result.value.supabaseListEmpty, true);
    assert.deepEqual(result.calls, routeOrder);
  } finally {
    resolveReadback([]);
    await pending;
  }
});

// Actual thin controller and signed D1 client, with only their HTTP/env seam
// synthetic. These cases are not PG, GoTrue, Worker or production acceptance.
const lifecycleTarget='22222222-2222-4222-8222-222222222222', lifecycleOperation='33333333-3333-4333-8333-333333333333';
const lifecycleAttempt='44444444-4444-4444-8444-444444444444', lifecycleNext='55555555-5555-4555-8555-555555555555';
const nativeGeneration='2026-11-16T19:00:00.123456789Z';
async function lifecycleFixture(options={}) {
  const subject=(await externalOwnerSubject({userId:lifecycleTarget,secret})).subject;
  const testEmail = 'inactive@example.invalid';
  const workItem = { noticeId: lifecycleOperation, targetUserId: lifecycleTarget, actorId: ownerId, revision: '7',
    authUserCreatedAt: nativeGeneration, recipientDigest: await sha256Hex(JSON.stringify(inactivityNoticeBody(testEmail))),
    kind: options.resumeAuto ? 'RESUME' : 'STAGE' };
  const mode = options.automatic ? 'AUTOMATIC_INACTIVITY' : 'MANUAL_OWNER';
  const row={operationId:lifecycleOperation,targetUserId:lifecycleTarget,mode,state:'PREPARED',holdReason:null,
    pgStageCommitted:false,pgRowsRemoved:0,authAbsent:false,d1Acknowledged:false,d1DeletedCount:null,complete:false,
    authAttemptId:null,authUserCreatedAt:null,d1OwnerSubject:null,...options.row};
  const used=new Set(row.authAttemptId?[row.authAttemptId]:[]),calls=[];
  let present=options.initialAbsent!==true, deletes=0, claimLost=options.claimReplyLost, stageLost=options.stageReplyLost;
  const publicRow=()=>Object.fromEntries(Object.entries(row).filter(([key])=>!['authAttemptId','authUserCreatedAt','d1OwnerSubject'].includes(key)));
  const response=(data,status=200)=>Response.json(data,{status});
  const fetchImpl=async(input,init)=>{
    const url=new URL(input),body=init.body?JSON.parse(init.body):null;
    assert.ok([gateway,supabase].includes(url.origin),'No real transport');
    assert.equal(init.redirect,'error');assert.equal(init.cache,'no-store');
    if(url.origin===gateway){
      calls.push('d1');assert.equal(url.pathname,'/v1/trips/delete-owner');assert.equal(body.owner_subject,subject);
      assert.equal(JSON.stringify(body).includes(lifecycleTarget),false);
      assert.equal(await verifyTripGatewaySignature({secret,timestamp:init.headers['X-RavRadar-Timestamp'],
        signature:init.headers['X-RavRadar-Signature'],method:'POST',pathname:url.pathname,bodyText:init.body}),true);
      return response(options.d1Failure?{ok:false,deleted:2}:{ok:true,deleted:options.badCount??2});
    }
    if(url.pathname.startsWith('/rest/v1/rpc/')){
      const name=url.pathname.split('/').at(-1);calls.push(name);
      const isOwner=['prepare_account_erasure','get_account_erasure_status','stage_account_erasure_pg','list_account_erasure_operations'].includes(name);
      const headers=new Headers(init.headers);
      assert.equal(headers.get('apikey'),isOwner?'fixture-anon':'sb_secret_fixture_only');
      assert.equal(headers.get('authorization'),isOwner?'Bearer fixture-owner':null);
      if(name==='list_account_erasure_operations'){
        assert.deepEqual(body,{p_after:options.listCursor??null});
        if(options.ownerDenied)return response({message:'ACCOUNT_ERASURE_OWNER_REQUIRED'},403);
        return response(options.listResponse??{scope:'own-account-erasure-operations',rows:[publicRow()],truncated:false});
      }
      if(name==='list_account_automatic_erasure_work'){
        assert.deepEqual(body, {});
        return response({scope:'account-automatic-erasure-work',rows:options.noDueWork ? [] : options.duplicateDue ? [workItem,workItem] : [workItem]});
      }
      if(name==='stage_account_automatic_erasure'){
        assert.deepEqual(body,{p_notice:workItem.noticeId,p_revision:workItem.revision,
          p_auth_user_created_at:workItem.authUserCreatedAt,p_recipient_digest:workItem.recipientDigest});
        if(options.autoStageRefused)return response({message:'ACCOUNT_INACTIVITY_NOT_ELIGIBLE'},409);
        Object.assign(row,{state:'PG_STAGED_AUTH_PENDING',pgStageCommitted:true,pgRowsRemoved:3});
        if(stageLost){stageLost=false;throw new Error('unknown-auto-stage-reply');}
        return response({...row});
      }
      assert.equal(body.p_operation,lifecycleOperation);
      if(!isOwner)assert.equal(body.p_actor,ownerId);
      if(name==='get_account_erasure_service_status'){
        if(options.missingSchema)return response({code:'PGRST202'},404);
        if(options.ownerDenied)return response({message:'ACCOUNT_ERASURE_OWNER_REQUIRED'},403);
        if(options.oversizeStatus)return response({...row,unexpected:'x'.repeat(8193)});
        if(options.driftAfterStage&&row.pgStageCommitted)return response({...row,targetUserId:'66666666-6666-4666-8666-666666666666'});
        return response(options.badStatus?{...row,unexpected:'PRIVATE_SENTINEL'}:{...row});
      }
      if(name==='prepare_account_erasure'){assert.equal(body.p_target,lifecycleTarget);return response(publicRow());}
      if(name==='get_account_erasure_status')return response(publicRow());
      if(name==='stage_account_erasure_pg'){
        assert.equal(body.p_confirmation,'STAGE-MANUAL-ACCOUNT-PG-ERASURE');
        if(options.stageHold){Object.assign(row,{state:'HOLD_ACTIVITY_CHANGED',holdReason:'ACTIVITY_CHANGED'});return response(publicRow());}
        if(!options.stageNoCommit)Object.assign(row,{state:'PG_STAGED_AUTH_PENDING',pgStageCommitted:true,pgRowsRemoved:3});
        if(stageLost||options.stageNoCommit){stageLost=false;throw new Error('unknown-stage-reply');}
        return response(publicRow());
      }
      if(name==='claim_account_erasure_auth'){
        assert.equal(body.p_d1_subject,subject);assert.equal(body.p_auth_user_created_at,nativeGeneration);
        if(used.has(body.p_attempt))return response({...row,shouldIssueDelete:false});
        if(body.p_previous_attempt!==row.authAttemptId)return response({message:'ACCOUNT_ERASURE_ATTEMPT_CAS_CONFLICT'},409);
        used.add(body.p_attempt);Object.assign(row,{state:'AUTH_ATTEMPTED',authAttemptId:body.p_attempt,
          authUserCreatedAt:body.p_auth_user_created_at,d1OwnerSubject:subject,holdReason:null});
        if(claimLost){claimLost=false;throw new Error('unknown-claim-reply');}
        return response({...row,shouldIssueDelete:true});
      }
      if(name==='acknowledge_account_erasure_auth_absent'){
        assert.equal(present,false);assert.equal(body.p_previous_attempt,row.authAttemptId);assert.equal(body.p_d1_subject,subject);
        Object.assign(row,{state:'AUTH_ABSENT_D1_PENDING',authAbsent:true,authAttemptId:body.p_attempt,d1OwnerSubject:subject,holdReason:null});
        if(options.authAckLost)throw new Error('unknown-auth-ack-reply');
        return response({...row});
      }
      assert.equal(name,'acknowledge_account_erasure_d1');assert.equal(row.authAbsent,true);
      assert.equal(body.p_attempt,row.authAttemptId);assert.equal(body.p_d1_subject,subject);assert.equal(body.p_deleted_count,2);
      if(options.d1AckNoCommit)throw new Error('unknown-d1-ack-not-committed');
      Object.assign(row,{state:'COMPLETE',complete:true,d1Acknowledged:true,d1DeletedCount:2,holdReason:null});
      if(options.d1AckLost)throw new Error('unknown-d1-ack-reply');
      return response({...row});
    }
    assert.equal(url.pathname,'/auth/v1/admin/users/'+lifecycleTarget);
    if(init.method==='DELETE'){
      calls.push('auth-delete');deletes++;assert.deepEqual(body,{should_soft_delete:false});
      if(!options.deleteLeavesPresent)present=false;
      if(options.deleteReplyLost)throw new Error('unknown-native-delete-reply');
      return response({});
    }
    calls.push('auth-get');assert.equal(init.method,'GET');
    if(options.adminFailure)return response({code:options.adminFailure,error_code:'unavailable'},options.adminFailure);
    if(present)return response({id:options.wrongTarget?ownerId:lifecycleTarget,created_at:options.changedGeneration??nativeGeneration,
      email:options.changedContact || options.changeAfterStage && row.pgStageCommitted ? 'other@example.invalid' : testEmail});
    return response(options.false404?{error:'missing-route'}:{code:404,error_code:'user_not_found',msg:'User not found'},404);
  };
  const env={SUPABASE_URL:supabase,SUPABASE_ANON_KEY:'fixture-anon',SUPABASE_SERVICE_ROLE_KEY:'sb_secret_fixture_only',
    TRIP_STORAGE_MODE:options.mode??'d1',TRIP_PSEUDONYM_SECRET_V1:secret,CLOUDFLARE_TRIP_GATEWAY_URL:gateway,TRIP_GATEWAY_SHARED_SECRET:secret};
  if(options.listOnly)for(const key of Object.keys(env))if(!['SUPABASE_URL','SUPABASE_ANON_KEY'].includes(key))delete env[key];
  async function invoke(payload={operation:'account-erasure-resume',operationId:lifecycleOperation,attemptId:lifecycleAttempt,
    confirmation:MANUAL_ACCOUNT_ERASURE_CONFIRMATION}){
    const savedFetch=globalThis.fetch,savedDeno=globalThis.Deno;globalThis.fetch=fetchImpl;globalThis.Deno={env:{get:name=>env[name]}};
    try{
      if(options.automatic)return {ok:true,value:await runAutomaticAccountErasureBatch()};
      return {ok:true,value:await runManualAccountErasure(new Request(supabase+'/functions/v1/trip-log',{
        method:'POST',headers:{authorization:'Bearer fixture-owner'}}),ownerId,payload)};
    }
    catch(error){return {ok:false,error};}
    finally{globalThis.fetch=savedFetch;if(savedDeno===undefined)delete globalThis.Deno;else globalThis.Deno=savedDeno;}
  }
  return {row,calls,invoke,subject,deletes:()=>deletes};
}
test('actual account controller requires PG, qualified native absence and physical D1 ACK before durable COMPLETE',async()=>{
  const f=await lifecycleFixture({deleteReplyLost:true,d1AckLost:true,stageReplyLost:true}),r=await f.invoke();
  assert.equal(r.ok,true,r.error?.code);assert.equal(r.value.complete,true);assert.equal(f.deletes(),1);
  assert.deepEqual(f.calls.filter(x=>['auth-delete','d1','acknowledge_account_erasure_d1'].includes(x)),
    ['auth-delete','d1','acknowledge_account_erasure_d1']);
  assert.ok(f.calls.indexOf('stage_account_erasure_pg')<f.calls.indexOf('auth-delete'));
  for(const key of ['authAttemptId','authUserCreatedAt','d1OwnerSubject'])assert.equal(Object.hasOwn(r.value,key),false);
  assert.equal(JSON.stringify(r.value).includes(nativeGeneration),false);
});
test('automatic erasure stages a qualified notice before shared Auth and signed D1 deletion', async () => {
  const f = await lifecycleFixture({automatic:true,stageReplyLost:true,deleteReplyLost:true,d1AckLost:true});
  const outcome = await f.invoke();
  assert.deepEqual(outcome.value,{selected:1,completed:1,pending:0,failed:0});
  assert.equal(f.deletes(),1);
  assert.deepEqual(f.calls,[
    'list_account_automatic_erasure_work','auth-get','stage_account_automatic_erasure','get_account_erasure_service_status',
    'auth-get','claim_account_erasure_auth','auth-delete','auth-get','acknowledge_account_erasure_auth_absent',
    'd1','acknowledge_account_erasure_d1','get_account_erasure_service_status',
  ]);
});
test('automatic erasure resumes a committed operation without staging a second time', async () => {
  const f = await lifecycleFixture({automatic:true,resumeAuto:true,row:{state:'PG_STAGED_AUTH_PENDING',pgStageCommitted:true}});
  assert.equal((await f.invoke()).value.completed,1);
  assert.equal(f.calls.includes('stage_account_automatic_erasure'), false);
});
for (const options of [{changedContact:true},{changeAfterStage:true},{autoStageRefused:true}]) {
  test('automatic erasure stops on stale notice authority: '+JSON.stringify(options), async () => {
    const f = await lifecycleFixture({automatic:true,...options});
    assert.deepEqual((await f.invoke()).value,{selected:1,completed:0,pending:0,failed:1});
    assert.equal(f.deletes(),0);
    assert.equal(f.calls.includes('d1'),false);
    assert.equal(f.calls.includes('stage_account_automatic_erasure'), !options.changedContact);
  });
}
test('automatic dispatcher accepts an empty due list and rejects duplicate authority before mutation', async () => {
  const dry = await lifecycleFixture({automatic:true,noDueWork:true});
  assert.deepEqual((await dry.invoke()).value,{selected:0,completed:0,pending:0,failed:0});
  const duplicate = await lifecycleFixture({automatic:true,duplicateDue:true});
  assert.equal((await duplicate.invoke()).ok,false);
  assert.deepEqual(duplicate.calls,['list_account_automatic_erasure_work']);
});
test('manual continuation refuses an automatic operation', async () => {
  const f = await lifecycleFixture({row:{mode:'AUTOMATIC_INACTIVITY'}});
  assert.equal((await f.invoke()).ok,false);
  assert.deepEqual(f.calls,['get_account_erasure_service_status']);
});

test('unknown claim never issues DELETE; new explicit CAS attempt resumes while replay stays spent',async()=>{
  const f=await lifecycleFixture({claimReplyLost:true});
  assert.equal((await f.invoke()).value.complete,false);assert.equal(f.deletes(),0);
  assert.equal((await f.invoke()).value.complete,false);assert.equal(f.deletes(),0);
  const result=await f.invoke({operation:'account-erasure-resume',operationId:lifecycleOperation,attemptId:lifecycleNext,
    confirmation:MANUAL_ACCOUNT_ERASURE_CONFIRMATION});
  assert.equal(result.value.complete,true);assert.equal(f.deletes(),1);
});
test('initial qualified admin404 binds absence without inventing a DELETE claim or present generation',async()=>{
  const f=await lifecycleFixture({initialAbsent:true}),r=await f.invoke();assert.equal(r.value.complete,true);
  assert.equal(f.deletes(),0);assert.equal(f.calls.includes('claim_account_erasure_auth'),false);assert.equal(f.row.authUserCreatedAt,null);
});
test('a still-present native user remains pending after the single DELETE attempt',async()=>{
  const f=await lifecycleFixture({deleteLeavesPresent:true}),r=await f.invoke();
  assert.equal(r.value.complete,false);assert.equal(f.deletes(),1);assert.equal(f.calls.includes('d1'),false);
});
for(const options of [{missingSchema:true},{badStatus:true},{oversizeStatus:true},{ownerDenied:true},{stageNoCommit:true},
  {adminFailure:403},{adminFailure:503},{wrongTarget:true},{driftAfterStage:true},{initialAbsent:true,false404:true},{mode:'supabase'}]){
  test('actual account controller refuses missing/unknown authority before Auth mutation: '+JSON.stringify(options),async()=>{
    const f=await lifecycleFixture(options),r=await f.invoke();assert.equal(r.ok,false);assert.equal(f.deletes(),0);
    assert.equal(f.calls.includes('d1'),false);assert.equal(f.row.complete,false);
    if(options.missingSchema||options.badStatus||options.oversizeStatus||options.ownerDenied||options.mode)assert.equal(f.calls.includes('stage_account_erasure_pg'),false);
  });
}
test('full native created_at precision remains a hard generation boundary',async()=>{
  const f=await lifecycleFixture({row:{state:'AUTH_ATTEMPTED',pgStageCommitted:true,authAttemptId:lifecycleNext,
    authUserCreatedAt:'2026-11-16T19:00:00.123456788Z',d1OwnerSubject:(await externalOwnerSubject({userId:lifecycleTarget,secret})).subject}}),r=await f.invoke();
  assert.equal(r.ok,false);assert.equal(r.error.code,'ACCOUNT_ERASURE_AUTH_GENERATION_CHANGED');assert.equal(f.deletes(),0);
});
test('HOLD before PG stage and changed activity at stage never reach Auth or D1',async()=>{
  for(const options of [{row:{state:'HOLD_POLICY',holdReason:'PRIVILEGED_TARGET'}},{stageHold:true}]){
    const f=await lifecycleFixture(options),r=await f.invoke();assert.equal(r.ok,true);assert.equal(r.value.complete,false);
    assert.equal(f.deletes(),0);assert.equal(f.calls.includes('auth-get'),false);assert.equal(f.calls.includes('d1'),false);
  }
});
test('an explicitly resumed postPG Storage HOLD can be rechecked without a new operation',async()=>{
  const f=await lifecycleFixture({row:{state:'AUTH_ATTEMPTED',holdReason:'STORAGE_OWNERSHIP',pgStageCommitted:true,
    authAttemptId:lifecycleNext,authUserCreatedAt:nativeGeneration,
    d1OwnerSubject:(await externalOwnerSubject({userId:lifecycleTarget,secret})).subject}}),r=await f.invoke();
  assert.equal(r.value.complete,true);assert.equal(f.deletes(),1);assert.equal(f.calls.includes('stage_account_erasure_pg'),false);
});
test('a changed durable D1 subject refuses all native and D1 mutation',async()=>{
  const f=await lifecycleFixture({row:{state:'PG_STAGED_AUTH_PENDING',pgStageCommitted:true,d1OwnerSubject:'usr_v1_'+'a'.repeat(43)}}),r=await f.invoke();
  assert.equal(r.ok,false);assert.equal(r.error.code,'ACCOUNT_ERASURE_SUBJECT_CHANGED');
  assert.equal(f.deletes(),0);assert.equal(f.calls.includes('auth-get'),false);assert.equal(f.calls.includes('d1'),false);
});
test('lost Auth ACK is reconciled; an uncommitted D1 ACK remains pending',async()=>{
  const a=await lifecycleFixture({authAckLost:true});assert.equal((await a.invoke()).value.complete,true);
  const b=await lifecycleFixture({d1AckNoCommit:true}),r=await b.invoke();assert.equal(r.ok,true);
  assert.equal(r.value.authAbsent,true);assert.equal(r.value.d1Acknowledged,false);assert.equal(r.value.complete,false);
});
for(const options of [{d1Failure:true},{badCount:-1},{badCount:'2'}])test('D1 non-ACK cannot complete: '+JSON.stringify(options),async()=>{
  const f=await lifecycleFixture(options),r=await f.invoke();assert.equal(r.ok,false);assert.equal(f.row.authAbsent,true);
  assert.equal(f.row.complete,false);assert.equal(f.calls.includes('acknowledge_account_erasure_d1'),false);
});
test('public prepare/status retain owner JWT and manual payloads reject forged authority before transport',async()=>{
  const f=await lifecycleFixture();
  assert.equal((await f.invoke({operation:'account-erasure-prepare',operationId:lifecycleOperation,targetUserId:lifecycleTarget})).value.complete,false);
  assert.equal((await f.invoke({operation:'account-erasure-status',operationId:lifecycleOperation})).value.state,'PREPARED');
  for(const extra of [{actorId:ownerId},{d1OwnerSubject:'forged'},{complete:true},{authUserCreatedAt:nativeGeneration}])
    assert.throws(()=>validateManualAccountErasurePayload({operation:'account-erasure-resume',operationId:lifecycleOperation,
      attemptId:lifecycleAttempt,confirmation:MANUAL_ACCOUNT_ERASURE_CONFIRMATION,...extra}));
  assert.throws(()=>validateManualAccountErasurePayload({operation:'account-erasure-resume',operationId:lifecycleOperation,
    attemptId:lifecycleAttempt,confirmation:'STAGE-MANUAL-ACCOUNT-PG-ERASURE'}));
  assert.equal(f.deletes(),0);
});

test('pending discovery uses only owner JWT and keeps profile-gone/HOLD operations visible',async()=>{
  const f=await lifecycleFixture({listOnly:true,row:{state:'AUTH_ABSENT_D1_PENDING',holdReason:'STORAGE_OWNERSHIP',
    pgStageCommitted:true,authAbsent:true}}),r=await f.invoke({operation:'account-erasure-list'});
  assert.equal(r.ok,true,r.error?.code);assert.equal(r.value.rows[0].operationId,lifecycleOperation);
  assert.equal(r.value.rows[0].holdReason,'STORAGE_OWNERSHIP');assert.equal(r.value.rows[0].authAbsent,true);
  assert.deepEqual(f.calls,['list_account_erasure_operations']);assert.equal(f.deletes(),0);
});
test('the64-row list has a separate bounded read and explicit UUID keyset cursor',async()=>{
  const baseline=await lifecycleFixture(),{authAttemptId,authUserCreatedAt,d1OwnerSubject,...publicRow}=baseline.row;
  const rows=Array.from({length:64},(_,i)=>({...publicRow,state:'HOLD_POLICY',holdReason:'REFERENCE_POLICY',
    operationId:'70000000-0000-4000-8000-'+String(i+1).padStart(12,'0')}));
  assert(Buffer.byteLength(JSON.stringify(rows))>8192);
  const f=await lifecycleFixture({listOnly:true,listCursor:lifecycleOperation,
    listResponse:{scope:'own-account-erasure-operations',rows,truncated:true}}),r=await f.invoke({operation:'account-erasure-list',afterOperationId:lifecycleOperation});
  assert.equal(r.ok,true,r.error?.code);assert.equal(r.value.rows.length,64);assert.equal(r.value.truncated,true);
  assert.deepEqual(f.calls,['list_account_erasure_operations']);
});
test('pending discovery refuses owner denial and malformed or private list rows without partial success',async()=>{
  const denied=await lifecycleFixture({ownerDenied:true}),d=await denied.invoke({operation:'account-erasure-list'});
  assert.equal(d.ok,false);assert.equal(d.error.code,'ACCOUNT_ERASURE_OWNER_REQUIRED');
  const baseline=await lifecycleFixture(),{authAttemptId,authUserCreatedAt,d1OwnerSubject,...row}=baseline.row;
  for(const response of [
    {scope:'wrong',rows:[],truncated:false},{scope:'own-account-erasure-operations',rows:[],truncated:true},
    {scope:'own-account-erasure-operations',rows:[{...row,d1OwnerSubject:'PRIVATE_SENTINEL'}],truncated:false},
    {scope:'own-account-erasure-operations',rows:[row,row],truncated:false},
  ]){const f=await lifecycleFixture({listResponse:response}),r=await f.invoke({operation:'account-erasure-list'});
    assert.equal(r.ok,false);assert.equal(f.deletes(),0);assert.equal(f.calls.includes('d1'),false);}
});
test('pending discovery accepts only its optional cursor, never browser target, actor or ACK',()=>{
  assert.doesNotThrow(()=>validateManualAccountErasurePayload({operation:'account-erasure-list'}));
  for(const extra of [{operationId:lifecycleOperation},{targetUserId:lifecycleTarget},{actorId:ownerId},
    {complete:true},{afterOperationId:null},{afterOperationId:'unknown'}])
    assert.throws(()=>validateManualAccountErasurePayload({operation:'account-erasure-list',...extra}));
});

// The existing whole owner-erasure target also covers the additive app readback contract.
await import('./test-account-erasure-outbox.mjs');
