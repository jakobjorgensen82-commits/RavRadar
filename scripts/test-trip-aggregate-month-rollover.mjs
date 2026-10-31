import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { advanceTripWeatherAggregateJob as advance }
  from '../cloudflare/trip-gateway/trip-aggregate-job.js';
import { handleRequest } from '../cloudflare/trip-gateway/worker.js';
import { canonicalJson, externalOwnerSubject, externalTripRecord, tripGatewaySignature }
  from '../supabase/functions/_shared/trip-storage.js';
import { ravScoreModelBinding } from '../js/core/ravscore-model-contract.js';
import { previousClosedAggregateMonth }
  from '../supabase/functions/_shared/trip-aggregate-contract.js';

// Only artificial rows, normal constructors/qualifier/origin guards, actual
// SQLite constraints and transaction-backed D1 batch semantics are used.
// No Worker CPU/heap, installed schema, report or anonymity claim follows.
const now = Date.now();
const binding = ravScoreModelBinding();
const period = previousClosedAggregateMonth(now);
const uuid = n => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const owner = await externalOwnerSubject({ userId: uuid(9000),
  secret: 'synthetic-input-scan-pseudonym-secret-only-00000000' });
const columns = ['storage_schema_version','owner_subject','owner_kind','trip_id','client_observation_id',
  'observed_at','submitted_at','payload_json','payload_sha256','source','created_at'];
const insert = `insert into trip_observations (${columns.join(',')}) values (${columns.map(() => '?').join(',')})`;
async function record(n, { created = now - 60000, trip = n + 10000 } = {}) {
  const observed = new Date(Date.parse(period.start) + n * 60000).toISOString();
  const payload = { schema_version: 1, client_observation_id: uuid(n), trip_id: uuid(trip),
    observed_at: observed, submitted_at: observed, zone_name: 'Synthetic coast', result: 'none', hunt_mode: 'beach' };
  return { ...await externalTripRecord({ owner, payload, source: 'supabase-migration' }),
    created_at: new Date(created).toISOString() };
}
const plain = rows => rows.map(row => ({ ...row }));
function fixture(placements = [], { bindingProposal = true } = {}) {
  const dbs = Array.from({ length: 10 }, () => new DatabaseSync(':memory:'));
  const trace = []; const hooks = { beforeBatch: null, afterBatch: null, beforeRead: null, afterRun: null };
  const schema = name => fs.readFileSync(new URL(`../cloudflare/trip-gateway/migrations/${name}`, import.meta.url), 'utf8');
  for (const db of dbs) { db.exec('PRAGMA foreign_keys=ON'); db.exec(schema('001_trip_observations.sql')); }
  dbs[0].exec(schema('004_trip_weather_aggregate_releases.sql'));
  dbs[0].exec(schema('005_trip_weather_aggregate_jobs.sql'));
  if(bindingProposal)dbs[0].exec(schema('006_trip_weather_aggregate_job_binding.sql'));
  for (const [shard, row] of placements) dbs[shard].prepare(insert).run(...columns.map(key => row[key]));
  const execute = statement => {
    const result = dbs[statement.shard].prepare(statement.sql).run(...statement.args);
    return { success: true, meta: { changes: Number(result.changes) } };
  };
  const d1 = dbs.map((db, shard) => ({ prepare(sql) {
    assert(new TextEncoder().encode(sql).length <= 100000, 'actual D1 SQL length cap');
    return { bind(...args) {
    assert(args.length <= 100, 'actual D1 bound parameter cap');
    const statement = { shard, sql, args };
    return { ...statement, async all() {
      trace.push({ method: 'all', shard, sql, args });
      if (hooks.beforeRead) await hooks.beforeRead(statement);
      return { success: true, results: plain(db.prepare(sql).all(...args)) };
    }, async run() {
      trace.push({ method: 'run', shard, sql, args });
      const answer = execute(statement); if (hooks.afterRun) await hooks.afterRun(statement); return answer;
    } };
  } }; }, async batch(statements) {
    trace.push({ method: 'batch', shard, count: statements.length });
    if (hooks.beforeBatch) await hooks.beforeBatch(statements);
    db.exec('BEGIN IMMEDIATE');
    let result;
    try { result = statements.map(execute); db.exec('COMMIT'); }
    catch (error) { db.exec('ROLLBACK'); throw error; }
    if (hooks.afterBatch) await hooks.afterBatch(statements);
    return result;
  } }));
  const header = () => ({ ...dbs[0].prepare('select * from trip_weather_aggregate_jobs').get() });
  const seen = () => plain(dbs[0].prepare('select * from trip_weather_aggregate_job_seen order by client_observation_id').all());
  const originals = () => dbs.map(db => plain(db.prepare(`select ${columns.join(',')} from trip_observations order by client_observation_id`).all()));
  const accounting = () => ['trip_weather_aggregate_releases','trip_weather_aggregate_account_charges']
    .map(name => dbs[0].prepare(`select count(*) as n from ${name}`).get().n);
  const close = () => dbs.forEach(db => db.close());
  return { dbs, d1, trace, hooks, header, seen, originals, accounting, close };
}


const queryCount = trace => trace.reduce((sum, row) => sum + (row.method === 'batch' ? row.count : 1), 0);

test('normal month rollover resumes only actual persisted job with fresh basis',async()=>{
  const {readTripWeatherAggregate}=await import('./lib/trip-weather-aggregate-client.mjs');
  const {sha256Hex}=await import('../supabase/functions/_shared/trip-storage.js');
  const oldClock=Date.now,oldFetch=globalThis.fetch;
  const boundary=Date.UTC(new Date(now).getUTCFullYear(),new Date(now).getUTCMonth()+1,1);
  let clock=boundary-2000;
  Date.now=()=>clock;
  globalThis.fetch=async()=>{throw new Error('NETWORK_FORBIDDEN');};
  const sharedSecret='synthetic-rollover-shared-secret-only-000000000000000';
  const pseudonymSecret='synthetic-input-scan-pseudonym-secret-only-00000000';
  const mk=(p=previousClosedAggregateMonth(clock),enabled=true,revision='0')=>({schemaVersion:1,period:p,modelBinding:binding,
    preferenceSnapshot:{schemaVersion:2,snapshotAt:new Date(clock).toISOString(),accounts:[{
      ownerSubject:owner.subject,enabled,revision,source:revision==='0'?'default':'stored'}]}});
  const json=(value,headers={})=>new Response(JSON.stringify(value),{status:200,headers:{'content-type':'application/json',...headers}});
  const setups=[];
  const setup=async()=>{
    const f=fixture([[0,await record(181)]]);setups.push(f);
    const env={TRIP_GATEWAY_SHARED_SECRET:sharedSecret,TRIP_AGGREGATE_ENABLED:'true',...Object.fromEntries(f.d1.map((db,i)=>['TRIP_DB_'+i,db]))};
    const calls=[];
    const post=async(pathname,value)=>{
      const body=JSON.stringify(value),timestamp=String(clock);
      const signature=await tripGatewaySignature({secret:sharedSecret,timestamp,method:'POST',pathname,bodyText:body});
      const offset=f.trace.length;
      const response=await handleRequest(new Request('https://synthetic-rollover.workers.dev'+pathname,{method:'POST',
        headers:{'Content-Type':'application/json','X-RavRadar-Timestamp':timestamp,'X-RavRadar-Signature':signature},body}),env);
      assert(queryCount(f.trace.slice(offset))<=45,'all selection/scan/finalization statements share unchanged45');
      return response;
    };
    const fetchImpl=async(input,init={})=>{
      const url=new URL(input);
      if(url.hostname==='synthetic.supabase.co'){
        assert.equal(init.method,'GET');
        if(url.pathname==='/rest/v1/profiles')return json([{id:uuid(9000)}],{'content-range':'0-0/1'});
        assert.equal(url.pathname,'/rest/v1/account_statistics_preferences');return json([],{'content-range':'*/0'});
      }
      const offset=f.trace.length,response=await handleRequest(new Request(url,init),env);
      assert.equal(response.status,200);
      assert(queryCount(f.trace.slice(offset))<=45);
      calls.push({path:url.pathname,request:JSON.parse(init.body),reply:await response.clone().json()});
      return response;
    };
    const invoke=()=>readTripWeatherAggregate({supabaseUrl:'https://synthetic.supabase.co',serviceRoleKey:'synthetic-service-secret-only-0000000000000000000',
      gatewayUrl:'https://synthetic-rollover.workers.dev',sharedSecret,pseudonymSecret,fetchImpl});
    return{f,post,invoke,calls};
  };
  const path='/v1/trips/aggregate-weather',verify='/v1/trips/aggregate-weather-verify';
  try{
    const normal=await setup(),oldPeriod=previousClosedAggregateMonth(clock),original=normal.f.originals();
    const first=await normal.post(path,mk());assert.equal(first.status,200);
    assert.equal((await first.json()).report.status,'PENDING_INPUT_SCAN');
    const saved=normal.f.header();assert.equal(saved.rows_read,1);assert.equal(saved.scan_steps,1);
    assert.deepEqual(normal.f.accounting(),[0,0]);
    clock=boundary+1000;
    const resumed=await normal.post(path,mk());assert.equal(resumed.status,200);
    const acknowledged=await resumed.json();
    assert.deepEqual(acknowledged.report.period,oldPeriod,'rollover MUST resume actual old PENDING, not create new month');
    assert.equal(normal.f.dbs[0].prepare('select count(*) n from trip_weather_aggregate_jobs').get().n,1);
    const active=normal.f.header();assert.equal(active.job_key,saved.job_key);
    for(const field of ['source_cutoff','execution_id','binding_sha256','policy_sha256','accounting_sha256','preference_sha256','initial_erasure_sha256','erasure_revision'])assert.equal(active[field],saved[field]);
    assert(active.revision>saved.revision);assert(active.lease_claims>saved.lease_claims);assert.equal(active.rows_read,1);
    // Plain old-period JSON is still not allowed to start/advance a scan.
    const oldPlain=mk(oldPeriod);
    assert.equal((await normal.post(path,oldPlain)).status,400);
    await assert.rejects(advance(normal.f.d1,oldPlain),{message:'AGGREGATE_PERIOD_INVALID'});
    const report=await normal.invoke();assert.deepEqual(report.period,oldPeriod);
    await verifyPrivateOwnerReportDelivery(report);
    assert.equal(normal.f.header().phase,'READY_INPUT');assert.deepEqual(normal.f.accounting(),[1,0]);
    assert.equal(report.publicReleaseIssued,false);assert.deepEqual(normal.f.originals(),original);
    const ledger=plain(normal.f.dbs[0].prepare('select * from trip_weather_aggregate_releases').all());
    const check=await normal.post(verify,mk(oldPeriod));assert.equal(check.status,200);
    assert.deepEqual((await check.json()).report,report);
    assert.deepEqual(plain(normal.f.dbs[0].prepare('select * from trip_weather_aggregate_releases').all()),ledger);
    assert.deepEqual(normal.f.accounting(),[1,0]);
    const older=previousClosedAggregateMonth(Date.parse(oldPeriod.start));
    assert.equal((await normal.post(verify,mk(older))).status,400,'no old job/report means no readonly authority');
    const next=await normal.post(path,mk());assert.equal(next.status,200);
    assert.deepEqual((await next.json()).report.period,previousClosedAggregateMonth(clock));
    assert.equal(normal.f.dbs[0].prepare('select count(*) n from trip_weather_aggregate_jobs').get().n,2);
    assert.deepEqual(normal.f.accounting(),[1,0],'new PENDING cannot reset/recharge ledger');

    // Fresh complete consent and original erasure revision are rechecked before resume.
    for(const mode of ['off','erased','stale','absent-policy-anchor','binding','active-lease']){
      clock=boundary-2000;const probe=await setup();assert.equal((await probe.post(path,mk())).status,200);
      const header=probe.f.header(),before=probe.f.originals();
      const ledgerBefore=plain(probe.f.dbs[0].prepare('select * from trip_weather_aggregate_releases').all());clock=boundary+1000;
      let input=mk();
      if(mode==='off')input=mk(undefined,false,'1');
      if(mode==='erased')probe.f.dbs[0].prepare('insert into trip_owner_erasure_tombstones (owner_subject) values (?) on conflict do nothing').run(owner.subject);
      if(mode==='stale')input.preferenceSnapshot.snapshotAt=new Date(clock-120001).toISOString();
      if(mode==='binding')input.modelBinding={...binding,bundleHash:'0'.repeat(64)};
      if(mode==='absent-policy-anchor'){
        // Keep the actual 004 CHECK refusal, then remove only this fixture's one anchor row.
        const triggers=plain(probe.f.dbs[0].prepare("select name from sqlite_master where type='trigger' and tbl_name='trip_weather_aggregate_policy_anchor'").all());
        for(const {name}of triggers)probe.f.dbs[0].exec('drop trigger "'+name.replaceAll('"','""')+'"');
        assert.throws(()=>probe.f.dbs[0].exec("update trip_weather_aggregate_policy_anchor set policy_sha256='"+'0'.repeat(64)+"'"),{code:'ERR_SQLITE_ERROR',message:/CHECK constraint failed: policy_sha256=/});
        assert.equal(probe.f.dbs[0].prepare('delete from trip_weather_aggregate_policy_anchor').run().changes,1);
      }
      if(mode==='active-lease')probe.f.dbs[0].prepare('update trip_weather_aggregate_jobs set revision=revision+1,lease_claims=lease_claims+1,step_claims=step_claims+1,reserved_chunk_queries=reserved_chunk_queries+45,lease_token=?,lease_until_ms=?').run(uuid(999),clock+23000);
      const response=await probe.post(path,input);
      const expectedOld={...header};
      if(mode==='off')Object.assign(expectedOld,{phase:'INVALIDATED',terminal_code:'CONSENT_CHANGED',revision:header.revision+1,lease_token:null,lease_until_ms:null});
      if(mode==='erased')Object.assign(expectedOld,{phase:'INVALIDATED',terminal_code:'OWNER_ERASURE_CHANGED',revision:header.revision+1,lease_token:null,lease_until_ms:null});
      if(mode==='active-lease')Object.assign(expectedOld,{revision:header.revision+1,lease_claims:header.lease_claims+1,step_claims:header.step_claims+1,reserved_chunk_queries:header.reserved_chunk_queries+45,lease_token:uuid(999),lease_until_ms:clock+23000});
      const actualOld={...probe.f.dbs[0].prepare('select * from trip_weather_aggregate_jobs where job_key=?').get(header.job_key)};
      assert.deepEqual(actualOld,expectedOld,mode+' preserves the old row except genuine normal invalidation/lease fields');
      if(mode==='erased'){
        // 005 already invalidated the old job before this request. A new latest
        // month is allowed; that is not authority to revive the old job.
        assert.equal(response.status,200,mode);
        const acknowledgement=await response.json(),latest=previousClosedAggregateMonth(clock);
        assert.equal(acknowledgement.report.status,'PENDING_INPUT_SCAN');assert.deepEqual(acknowledgement.report.period,latest);
        const freshRows=plain(probe.f.dbs[0].prepare('select * from trip_weather_aggregate_jobs where period_start=?').all(latest.start));
        assert.equal(freshRows.length,1);const fresh=freshRows[0];assert.notEqual(fresh.job_key,header.job_key);
        assert.equal(fresh.period_end,latest.end);assert.equal(fresh.source_cutoff,input.preferenceSnapshot.snapshotAt);
        const erasureRevision=probe.f.dbs[0].prepare('select erasure_revision from trip_weather_aggregate_job_control where singleton=1').get().erasure_revision;
        assert.equal(erasureRevision,header.erasure_revision+1);assert.equal(fresh.erasure_revision,erasureRevision);
        const tombstones=plain(probe.f.dbs[0].prepare('select owner_subject from trip_owner_erasure_tombstones order by owner_subject').all());
        assert.deepEqual(tombstones,[{owner_subject:owner.subject}]);
        assert.equal(fresh.initial_erasure_sha256,await sha256Hex(canonicalJson(tombstones.map(row=>row.owner_subject))));
        for(const field of ['execution_id','binding_sha256','policy_sha256','accounting_sha256'])assert.equal(fresh[field],header[field]);
        assert.equal(fresh.phase,'SCANNING');assert.equal(fresh.rows_read,0);assert.equal(fresh.winner_count,0);
        for(const table of ['trip_weather_aggregate_job_seen','trip_weather_aggregate_job_winners'])assert.equal(probe.f.dbs[0].prepare('select count(*) n from '+table+' where job_key=? and owner_subject=?').get(fresh.job_key,owner.subject).n,0);
        assert.equal(probe.f.dbs[0].prepare('select count(*) n from trip_weather_aggregate_jobs').get().n,2);
      }else{
        assert.equal(response.status,400,mode);
        assert.equal(probe.f.dbs[0].prepare('select count(*) n from trip_weather_aggregate_jobs').get().n,1);
      }
      assert.deepEqual(plain(probe.f.dbs[0].prepare('select * from trip_weather_aggregate_releases').all()),ledgerBefore);
      assert.deepEqual(probe.f.accounting(),[0,0]);assert.deepEqual(probe.f.originals(),before);
    }
    console.log(JSON.stringify({kind:'PRIVATE_MONTH_ROLLOVER_NORMAL_CALLER',nativeSQLite:true,signedWorker:true,
      oldPendingResumed:true,newJobsOnlyPreviousClosedMonth:true,originalCutoffCountersAndCapsPreserved:true,
      freshConsentErasureAndPolicyRequired:true,jsonIsNotResumeAuthority:true,readonlyExistingLedgerReplay:true,
      parentPositiveSelfReportedEvidenceReused:true,newPrivacyBudget:false,hosted:false,publicAnonymity:false,retention:false}));
  }finally{setups.forEach(f=>f.close());Date.now=oldClock;globalThis.fetch=oldFetch;}
});


test('normal persisted model binding survives later releases without retagging or new budget',async()=>{
  const {readTripWeatherAggregate}=await import('./lib/trip-weather-aggregate-client.mjs');
  const {sha256Hex}=await import('../supabase/functions/_shared/trip-storage.js');
  const {createSyntheticTripPayload}=await import('./aggregate-private-fixture.mjs');
  const {POLICY_ANCHOR}=await import('../cloudflare/trip-gateway/trip-aggregate-policy-gate.js');
  const {LEGACY_JOB_BINDING_SOURCE:source,readAggregateJobOriginalBinding:resolve}=await import('../cloudflare/trip-gateway/trip-aggregate-job-binding.js');
  // Originale SQL-tupler læses fra én hel, præcist pinnet case; ingen blanding
  // af nutidige felter med et ældre bundlenavn. Dette udfører ikke SQL.
  const originalSql=fs.readFileSync(new URL('../'+source.file,import.meta.url),'utf8');
  assert.equal(new TextEncoder().encode(originalSql).length,source.bytes);
  assert.equal(await sha256Hex(originalSql),source.sha256);
  assert.equal(originalSql.split('-- RAVSCORE_INTEGRATED_BINDING_BEGIN').length,2);
  const block=originalSql.split('-- RAVSCORE_INTEGRATED_BINDING_BEGIN')[1].split('-- RAVSCORE_INTEGRATED_BINDING_END')[0];
  const take=pattern=>{const match=block.match(pattern);assert(match);return match[1];};
  const fields={modelId:take(/when p_model_version = '([^']+)'/)};
  const mapping={stateSchemaVersion:'modelStateVersion',variantId:'modelVariantId',profileId:'modelProfileId',
    componentSchemaId:'modelComponentSchemaId',explanationSchemaId:'modelExplanationSchemaId',
    rankingPolicyId:'modelRankingPolicyId',bestTimePolicyId:'modelBestTimePolicyId',
    presentationPolicyId:'modelPresentationPolicyId',modelContractSha256:'modelContractSha256'};
  for(const [field,key]of Object.entries(mapping))fields[field]=take(new RegExp("p_calibration_features ->> '"+key+"' = '([^']+)'"));
  const bundles=Array.from(take(/modelBundleSha256' in \(([\s\S]+?)\)/).matchAll(/'([a-f0-9]{64})'/g),m=>m[1]);
  assert.equal(bundles.length,20);assert.equal(new Set(bundles).size,20);
  const tuples=bundles.map(modelBundleSha256=>({...fields,modelBundleSha256}));
  for(const tuple of tuples)assert.deepEqual(await resolve(null,await sha256Hex(canonicalJson(tuple))),tuple);
  await assert.rejects(resolve(null,'0'.repeat(64)),{message:'AGGREGATE_JOB_ORIGINAL_BINDING_INVALID'});
  const prior=tuples.find(tuple=>tuple.modelBundleSha256==='6d8f7cca203b5f7ee5155f3c0cdb39403a02fd0eb30fecaca5070ef9f814a805');
  assert(prior);assert.notDeepEqual(prior,binding);
  // En tydeligt kunstig fremtidsmarkør er IKKE udstedt 589/590. Den afprøver
  // alene, at en faktisk gemt hel tuple ikke afhænger af dette endelige katalog.
  const future={...binding,modelBundleSha256:await sha256Hex('ONLY_SYNTHETIC_PERSISTED_FUTURE_BINDING')};
  assert(!bundles.includes(future.modelBundleSha256));
  const oldClock=Date.now,oldFetch=globalThis.fetch,fixtures=[];
  const sharedSecret='synthetic-binding-shared-secret-only-000000000000000';
  const pseudonymSecret='synthetic-input-scan-pseudonym-secret-only-00000000';
  const path='/v1/trips/aggregate-weather',verify='/v1/trips/aggregate-weather-verify';
  let clock=now;
  Date.now=()=>clock;globalThis.fetch=async()=>{throw new Error('NETWORK_FORBIDDEN');};
  const proposal=fs.readFileSync(new URL('../cloudflare/trip-gateway/migrations/006_trip_weather_aggregate_job_binding.sql',import.meta.url),'utf8');
  const request=(enabled=true,revision='0')=>({schemaVersion:1,period:previousClosedAggregateMonth(clock),modelBinding:binding,
    preferenceSnapshot:{schemaVersion:2,snapshotAt:new Date(clock).toISOString(),accounts:[{ownerSubject:owner.subject,
      enabled,revision,source:revision==='0'?'default':'stored'}]}});
  const setup=async(tuple,{legacy=false,badDigest=false,badJson=false}={})=>{
    const rows=[];
    for(const [n,origin]of [[188,'self-reported'],[189,'synthetic-test']]){
      const payload=createSyntheticTripPayload(n,{observation_origin:origin,featureInput:{modelBinding:tuple}});
      rows.push([0,{...await externalTripRecord({owner,payload,source:'supabase-migration'}),
        created_at:new Date(now-60000).toISOString()}]);
    }
    const f=fixture(rows,{bindingProposal:!legacy});fixtures.push(f);
    const req=request(),digest=await sha256Hex(canonicalJson(tuple));
    const key=await sha256Hex(canonicalJson({ledgerId:POLICY_ANCHOR.ledger_id,period:req.period}));
    // Præcis vedvarende SQLite-jobfixture, ikke en påstået gammel hosted
    // producent. Ingen UPDATE/retag af et eksisterende job eller triggeromgåelse.
    const names=['job_key','period_start','period_end','source_cutoff','execution_id','binding_sha256','policy_sha256',
      'accounting_sha256','preference_sha256','initial_erasure_sha256','erasure_revision','input_accounts'];
    const values=[key,req.period.start,req.period.end,req.preferenceSnapshot.snapshotAt,'rr-private-input-scan-v1-UNISSUED',
      badDigest?'0'.repeat(64):digest,POLICY_ANCHOR.policy_sha256,POLICY_ANCHOR.accounting_sha256,
      await sha256Hex(canonicalJson(req.preferenceSnapshot.accounts)),await sha256Hex(canonicalJson([])),0,1];
    if(!legacy){names.push('model_binding_json');values.push(badJson?canonicalJson(binding):canonicalJson(tuple));}
    f.dbs[0].prepare('insert into trip_weather_aggregate_jobs ('+names.join(',')+') values ('+names.map(()=>'?').join(',')+')').run(...values);
    if(legacy)f.dbs[0].exec(proposal);
    const original=f.originals(),header=f.header();
    const env={TRIP_GATEWAY_SHARED_SECRET:sharedSecret,TRIP_AGGREGATE_ENABLED:'true',
      ...Object.fromEntries(f.d1.map((db,i)=>['TRIP_DB_'+i,db]))};
    const calls=[],preferences={enabled:true,revision:'0'},replyMutation={apply:null};
    const post=async(pathname,value)=>{
      const body=JSON.stringify(value),timestamp=String(clock);
      const signature=await tripGatewaySignature({secret:sharedSecret,timestamp,method:'POST',pathname,bodyText:body});
      const offset=f.trace.length;
      const response=await handleRequest(new Request('https://synthetic-binding.workers.dev'+pathname,{method:'POST',
        headers:{'Content-Type':'application/json','X-RavRadar-Timestamp':timestamp,'X-RavRadar-Signature':signature},body}),env);
      assert(queryCount(f.trace.slice(offset))<=45);
      return response;
    };
    const fetchImpl=async(input,init={})=>{
      const url=new URL(input);
      if(url.hostname==='synthetic.supabase.co'){
        if(url.pathname==='/rest/v1/profiles')return new Response(JSON.stringify([{id:uuid(9000)}]),{headers:{'content-range':'0-0/1'}});
        assert.equal(url.pathname,'/rest/v1/account_statistics_preferences');
        const prefs=preferences.revision==='0'?[]:[{user_id:uuid(9000),enabled:preferences.enabled,revision:preferences.revision}];
        return new Response(JSON.stringify(prefs),{headers:{'content-range':prefs.length?'0-0/1':'*/0'}});
      }
      // Hele normale signerede HTTP-kald passerer den faktiske Worker.
      const offset=f.trace.length,response=await handleRequest(new Request(url,init),env);
      assert(queryCount(f.trace.slice(offset))<=45);
      const answer=await response.clone().json();calls.push({path:url.pathname,request:JSON.parse(init.body),answer});
      if(replyMutation.apply&&response.status===200){
        const changed=replyMutation.apply(structuredClone(answer),url.pathname,calls.length);
        return new Response(JSON.stringify(changed),{status:200});
      }
      return response;
    };
    const invoke=()=>readTripWeatherAggregate({supabaseUrl:'https://synthetic.supabase.co',
      serviceRoleKey:'synthetic-service-secret-only-0000000000000000000',
      gatewayUrl:'https://synthetic-binding.workers.dev',sharedSecret,pseudonymSecret,fetchImpl});
    return{f,key,header,original,post,invoke,calls,preferences,replyMutation};
  };
  try{
    for(const [tuple,legacy]of [[prior,true],[prior,false],[future,false]]){
      clock=now;const x=await setup(tuple,{legacy});
      clock=Date.UTC(new Date(now).getUTCFullYear(),new Date(now).getUTCMonth()+1,1)+1000;
      const report=await x.invoke();
      assert.deepEqual(report.modelBinding,tuple);assert.deepEqual(report.period,period);
      assert.equal(report.publicReleaseIssued,false);assert.equal(x.f.header().phase,'READY_INPUT');
      assert.equal(x.f.header().synthetic_count,1);assert.equal(x.f.header().winner_count,1);
      assert.deepEqual(x.f.accounting(),[1,1]);assert.deepEqual(x.f.originals(),x.original);
      for(const key of ['job_key','source_cutoff','binding_sha256','model_binding_json','policy_sha256','accounting_sha256',
        'preference_sha256','initial_erasure_sha256'])assert.equal(x.f.header()[key],x.header[key]);
      for(const call of x.calls){assert.deepEqual(call.request.modelBinding,binding);assert.deepEqual(call.answer.report.modelBinding,tuple);}
      const ledger=plain(x.f.dbs[0].prepare('select * from trip_weather_aggregate_releases').all());
      const replay=await x.post(verify,{...request(),period});assert.equal(replay.status,200);
      assert.deepEqual((await replay.json()).report,report);
      assert.deepEqual(plain(x.f.dbs[0].prepare('select * from trip_weather_aggregate_releases').all()),ledger);
      assert.deepEqual(x.f.accounting(),[1,1]);
      assert.equal((await x.post(path,{...request(),modelBinding:tuple})).status,400);
      await assert.rejects(advance(x.f.d1,{...request(),period,modelBinding:tuple}));
      assert.throws(()=>x.f.dbs[0].prepare('update trip_weather_aggregate_jobs set revision=revision+1,model_binding_json=? where job_key=?')
        .run(canonicalJson(binding),x.key),/AGGREGATE_JOB_ORIGINAL_BINDING_IMMUTABLE/);
      const next=await x.post(path,request());assert.equal(next.status,200);
      const created=x.f.dbs[0].prepare('select model_binding_json,binding_sha256 from trip_weather_aggregate_jobs where job_key<>?').get(x.key);
      assert.equal(created.model_binding_json,canonicalJson(binding));
      assert.equal(created.binding_sha256,await sha256Hex(canonicalJson(binding)));
      assert.deepEqual(x.f.accounting(),[1,1],'ny PENDING må ikke resample eller nulstille kvoten');
    }
    for(const mode of ['off','newer-on','erased','unknown-legacy','bad-digest','bad-json','stale','changed-ack','changed-verify']){
      clock=now;const x=await setup(mode==='unknown-legacy'?future:prior,{legacy:mode==='unknown-legacy',
        badDigest:mode==='bad-digest',badJson:mode==='bad-json'});
      clock=Date.UTC(new Date(now).getUTCFullYear(),new Date(now).getUTCMonth()+1,1)+1000;
      let req=request();
      if(mode==='off')req=request(false,'1');
      if(mode==='newer-on')req=request(true,'2');
      if(mode==='stale')req.preferenceSnapshot.snapshotAt=new Date(clock-120001).toISOString();
      if(mode==='erased')x.f.dbs[0].prepare('insert into trip_owner_erasure_tombstones (owner_subject) values (?)').run(owner.subject);
      if(mode==='changed-ack'||mode==='changed-verify'){
        x.replyMutation.apply=(answer,pathname,count)=>{
          if(mode==='changed-ack'&&count===1||mode==='changed-verify'&&pathname===verify)answer.report.modelBinding=binding;
          return answer;
        };
        await assert.rejects(x.invoke(),new RegExp(mode==='changed-ack'?'AGGREGATE_JOB_SELECTION_CHANGED':'AGGREGATE_RESPONSE_INVALID'));
      }else{
        const result=await x.post(mode==='erased'?verify:path,mode==='erased'?{...req,period}:req);
        assert.equal(result.status,400,mode);
        assert.deepEqual(x.f.accounting(),[0,0]);
      }
      if(mode==='off'||mode==='newer-on'||mode==='erased')assert.equal(x.f.header().phase,'INVALIDATED');
      if(mode==='unknown-legacy'){
        assert.deepEqual(x.f.header(),x.header,'ukendt gammel tuple må ikke ommærkes eller slettes');
        assert.equal((await x.post(path,request(false,'1'))).status,400);
        assert.equal(x.f.header().terminal_code,'CONSENT_CHANGED','nyere OFF gælder også før en ukendt tuple');
      }
      assert.deepEqual(x.f.originals(),x.original);
    }
  }finally{fixtures.forEach(f=>f.close());Date.now=oldClock;globalThis.fetch=oldFetch;}
});

// Samme normale SQLite/Worker/klientrapport ovenfor; kun admintransport og DOM er syntetiske.
async function verifyPrivateOwnerReportDelivery(report){
  const {publishPrivateTripStudyAdmin,PRIVATE_STUDY_ADMIN_ACCESS_SQL,PRIVATE_STUDY_ADMIN_FUNCTIONS}
    =await import('./lib/private-trip-study-admin-transport.mjs');
  const {isExactCalibrationModelBinding}=await import('../js/services/calibration-eligibility.js');
  const vm=await import('node:vm');
  const key='trip-weather-study-'+report.period.start.slice(0,7);
  assert.notDeepEqual(report.period,previousClosedAggregateMonth(),'positiv prøve er faktisk det afsluttede gamle job');
  const service='sb_secret_synthetic_private_transport_existing_key_only_00000',access='synthetic-existing-management-key-000000000';
  const catalogue=()=>[{metadata:{rls:true,ownerRestricted:true,anonSelect:false,authenticatedSelect:true,publicSelect:false,unsafeRoles:false,
    policies:[{name:'ravradar_admin_documents_read',permissive:'PERMISSIVE',roles:['authenticated'],command:'SELECT',
      qual:"public.is_ravradar_owner() or public.has_ravradar_permission('full_admin') or public.has_ravradar_permission(public.ravradar_document_permission(document_key))"},
    {name:'ravradar_ravscore_checkpoint_no_direct_read',permissive:'RESTRICTIVE',roles:['authenticated'],command:'SELECT',
      qual:"document_key <> 'ravscore-continuation-checkpoint'"}],functions:structuredClone(PRIVATE_STUDY_ADMIN_FUNCTIONS)}}];
  const transport=(mode='normal')=>{
    let row=null,writes=0,reads=0;
    return{state:()=>({row,writes,reads}),fetchImpl:async(input,init)=>{
      const url=new URL(input);assert.equal(init.redirect,'error');assert.equal(init.cache,'no-store');
      if(url.origin==='https://api.supabase.com'){
        assert.equal(url.pathname,'/v1/projects/afqhhdrkjfjtpadntdzo/database/query');assert.equal(init.method,'POST');
        assert.equal(JSON.parse(init.body).query,PRIVATE_STUDY_ADMIN_ACCESS_SQL);
        const result=catalogue();if(mode==='broad')result[0].metadata.policies[0].qual='true';
        return new Response(JSON.stringify(result));
      }
      assert.equal(url.origin,'https://afqhhdrkjfjtpadntdzo.supabase.co');assert.equal(url.pathname,'/rest/v1/admin_documents');
      assert.equal(init.headers.apikey,service);assert.equal(init.headers.Authorization,undefined);
      if(init.method==='GET'){reads++;assert.equal(url.searchParams.get('document_key'),'eq.'+key);
        return new Response(JSON.stringify(row?[row]:[]));}
      assert.equal(init.method,'POST');assert.equal(row,null);assert.equal(url.search,'');assert.equal(init.headers.Prefer,'return=minimal');
      const body=JSON.parse(init.body);assert.equal(body.document_key,key);assert.equal(body.updated_by,null);
      writes++;row={document_key:key,payload:body.payload,version:1};
      if(mode==='lost')throw Error('SYNTHETIC_WRITE_REPLY_LOST');
      return new Response(null,{status:201});
    }};
  };
  const publish=backend=>publishPrivateTripStudyAdmin(report,{serviceRoleKey:service,accessToken:access,fetchImpl:backend.fetchImpl});
  const backend=transport(),first=await publish(backend),again=await publish(backend);
  assert.equal(first.documentKey,key);assert.equal(first.replay,false);assert.equal(again.replay,true);
  assert.equal(backend.state().writes,1);assert.deepEqual(backend.state().row.payload,report);
  assert.doesNotMatch(JSON.stringify(first),/usr_v1_|trip_id|noisyCount|payload|ledger/);
  const lost=transport('lost');await assert.rejects(()=>publish(lost),/WRITE_OUTCOME_UNKNOWN/);
  assert.equal(lost.state().writes,1);assert.equal((await publish(lost)).replay,true);assert.equal(lost.state().writes,1);
  const denied=transport('broad');await assert.rejects(()=>publish(denied),/ACCESS_UNVERIFIED/);
  assert.equal(denied.state().reads,0);assert.equal(denied.state().writes,0);
  backend.state().row.payload=structuredClone(report);backend.state().row.payload.cells[0].noisyCount=(report.cells[0].noisyCount+1)%1001;
  await assert.rejects(()=>publish(backend),/DOCUMENT_CONFLICT/);assert.equal(backend.state().writes,1);
  const source=fs.readFileSync(new URL('../js/services/private-trip-study.js',import.meta.url),'utf8').replace(/\r\n/g,'\n');
  const moduleVersion=JSON.parse(fs.readFileSync(new URL('../package.json',import.meta.url),'utf8')).version;
  const serviceImports=[
    `import {PUBLIC_CONFIG} from '../../config.js?v=${moduleVersion}';`,
    `import {readAdminDocumentNow} from './admin-document-store.js?v=${moduleVersion}';`,
    `import {myAccess,hasPermission} from './permissions-service.js?v=${moduleVersion}';`,
    `import {requireFreshSession,authIdentityEpoch,currentSession,authorizedFetch} from './auth-service.js?v=${moduleVersion}';`,
    `import {isExactCalibrationModelBinding} from './calibration-eligibility.js?v=${moduleVersion}';`,
  ];
  let serviceBody=source;for(const line of serviceImports){assert.equal(serviceBody.split(line).length,2);serviceBody=serviceBody.replace(line,'');}
  serviceBody=serviceBody.replace('export function assertPrivateTripStudyDisplayReport','function assertPrivateTripStudyDisplayReport')
    .replace('export async function readPrivateTripStudyForOwner','async function readPrivateTripStudyForOwner');
  const viewer=(mode='normal')=>{
    const state={owner:'synthetic-owner',epoch:1,active:true,permission:true,reads:0,metadata:0,access:0};
    const metadata={document_key:key,version:1};
    const environment={Date,structuredClone,isExactCalibrationModelBinding,PUBLIC_CONFIG:{supabaseUrl:'https://synthetic.supabase.co'},
      currentSession:()=>({user:{id:state.owner}}),authIdentityEpoch:()=>state.epoch,requireFreshSession:async()=>{},
      hasPermission:a=>a.permissions.has('full_admin'),myAccess:async()=>{state.access++;return{profile:{id:state.owner,is_active:state.active},permissions:new Set(state.permission?['full_admin']:[])};},
      authorizedFetch:async(input,init,options)=>{
        const url=new URL(input);assert.equal(url.pathname,'/rest/v1/admin_documents');assert.equal(url.searchParams.get('select'),'document_key,version');
        assert.equal(url.searchParams.get('document_key'),'like.trip-weather-study-*');assert.equal(url.searchParams.get('order'),'document_key.desc');
        assert.equal(url.searchParams.get('limit'),'1');assert.equal(init.cache,'no-store');assert.equal(options.expectedUserId,'synthetic-owner');
        state.metadata++;const item={...metadata};
        if(mode==='invalid-key')item.document_key='trip-weather-study-unknown';
        if(mode==='race'&&state.metadata===2)item.version++;
        if(mode==='identity'){state.owner='other';state.epoch++;}
        return{response:{ok:true},body:mode==='absent'?[]:[item]};
      },
      readAdminDocumentNow:async selected=>{state.reads++;assert.equal(selected,metadata.document_key);
        if(mode==='permission')state.permission=false;if(mode==='logout'){state.owner=null;state.epoch++;}
        const payload=structuredClone(report);if(mode==='payload')payload.extra='SYNTHETIC_FORBIDDEN';
        if(mode==='period')payload.period=previousClosedAggregateMonth();
        return mode==='missing'?null:{version:mode==='version'?2:metadata.version,payload};},
    };
    const api=vm.runInNewContext(serviceBody+'\n({readPrivateTripStudyForOwner,assertPrivateTripStudyDisplayReport});',environment);
    return{api,state,metadata,environment};
  };
  const v=viewer();assert.deepEqual(await v.api.readPrivateTripStudyForOwner(),report);assert.equal(v.state.metadata,2);assert.equal(v.state.reads,1);
  // En senere indsat ældre rapport må ikke vælges over den allerede sete nyere måned.
  const older=previousClosedAggregateMonth(Date.parse(report.period.start));v.metadata.document_key='trip-weather-study-'+older.start.slice(0,7);
  await assert.rejects(()=>v.api.readPrivateTripStudyForOwner(),/UNAVAILABLE/);assert.equal(v.state.reads,1);
  for(const mode of ['absent','invalid-key','race','identity','permission','logout','payload','period','version','missing']){
    const bad=viewer(mode);await assert.rejects(()=>bad.api.readPrivateTripStudyForOwner(),/UNAVAILABLE/);
    assert(bad.state.reads<=1,'ingen fallback til en anden rapport');
  }
  for(const mode of ['inactive','ordinary']){const bad=viewer();if(mode==='inactive')bad.state.active=false;else bad.state.permission=false;
    await assert.rejects(()=>bad.api.readPrivateTripStudyForOwner(),/UNAVAILABLE/);assert.equal(bad.state.metadata,0);}
  const uiSource=fs.readFileSync(new URL('../js/ui/admin-private-trip-study.js',import.meta.url),'utf8').replace(/\r\n/g,'\n');
  let uiBody=uiSource;
  for(const line of [
    `import {readPrivateTripStudyForOwner,assertPrivateTripStudyDisplayReport} from '../services/private-trip-study.js?v=${moduleVersion}';`,
    `import {myAccess,hasPermission} from '../services/permissions-service.js?v=${moduleVersion}';`,
    `import {requireFreshSession,authIdentityEpoch,currentSession,onAuthChange} from '../services/auth-service.js?v=${moduleVersion}';`,
  ]){assert.equal(uiBody.split(line).length,2);uiBody=uiBody.replace(line,'');}
  uiBody=uiBody.replace('export function mountPrivateTripStudyCard','function mountPrivateTripStudyCard');
  const ui=(mode='normal')=>{
    const state={owner:'synthetic-owner',epoch:1,permission:true,reads:0,access:0,downloads:[],listeners:new Set()};
    let document;
    class Element{
      constructor(tag){this.tagName=tag;this.children=[];this.parentNode=null;this.dataset={};this.attributes={};this.textContent='';}
      append(...nodes){for(const node of nodes){node.remove();node.parentNode=this;this.children.push(node);}}
      remove(){if(this.parentNode)this.parentNode.children=this.parentNode.children.filter(x=>x!==this);this.parentNode=null;}
      replaceChildren(...nodes){for(const child of [...this.children])child.remove();this.append(...nodes);}
      get isConnected(){return this===document.body||Boolean(this.parentNode?.isConnected);}
      setAttribute(k,value){this.attributes[k]=value;}
      querySelector(selector){return this.children.find(x=>selector==='[data-private-trip-study]'?'privateTripStudy'in x.dataset:x.tagName===selector)
        ??this.children.map(x=>x.querySelector(selector)).find(Boolean)??null;}
      click(){if(this.tagName==='a')state.downloads.push(this.download);else return this.onclick?.();}
    }
    document={body:new Element('body'),createElement:tag=>new Element(tag)};
    const host=new Element('section');document.body.append(host);
    const access=()=>({profile:{id:state.owner,is_active:true},permissions:new Set(state.permission?['full_admin']:[])});
    const context={Date,Intl,Map,WeakMap,Blob,document,setTimeout:fn=>fn(),URL:{createObjectURL:()=> 'blob:synthetic',revokeObjectURL(){}},
      requireFreshSession:async()=>{},authIdentityEpoch:()=>state.epoch,currentSession:()=>({user:{id:state.owner}}),
      onAuthChange:fn=>{state.listeners.add(fn);return()=>state.listeners.delete(fn);},
      myAccess:async()=>{state.access++;if(mode==='final-permission'&&state.access===2)state.permission=false;return access();},
      hasPermission:a=>a.permissions.has('full_admin'),assertPrivateTripStudyDisplayReport:viewer().api.assertPrivateTripStudyDisplayReport,
      readPrivateTripStudyForOwner:async()=>{state.reads++;
        if(mode==='identity'){state.owner='other';state.epoch++;}if(mode==='detach')host.replaceChildren();
        if(mode==='failure')throw Error('SYNTHETIC_INTERNAL');return structuredClone(report);},
    };
    const mount=vm.runInNewContext(uiBody+'\nmountPrivateTripStudyCard;',context),card=mount(host,access());
    return{state,host,card,mount,access};
  };
  const displayed=ui();await displayed.card.querySelector('button').click();
  const table=displayed.card.querySelector('table');assert(table);const rows=table.querySelector('tbody').children;
  const categorical=report.schemaVersion===3;
  assert.equal(rows.length,categorical?40:20);
  assert.equal(rows.reduce((n,row)=>n+row.children.length-(categorical?3:2),0),categorical?160:40);
  assert.equal(rows[0].children[0].textContent,'Vind (m/s)');
  if(categorical){
    assert.equal(rows[0].children[1].textContent,'På stranden');assert.equal(rows[0].children[2].textContent,'0–under 4');
    assert.equal(rows[5].children[1].textContent,'I waders');assert.equal(rows[30].children[2].textContent,'Under −0,1');
    for(const [metric,offset]of[['windSpeedMs',0],['waveHeightM',10],['currentSpeedMs',20],['waterLevelTrendM3h',30]])
      for(const [mode,shift]of[['beach',0],['waders',5]])for(let i=0;i<5;i++)
        for(const [outcome,column]of[['none',3],['small',4],['medium',5],['good',6]])
          assert.equal(rows[offset+shift+i].children[column].textContent,String(report.cells.find(c=>c.cell===metric+':'+i+':'+mode+':'+outcome).noisyCount));
    assert.match(displayed.card.children[1].textContent,/Søgetid og grundighed er bevaret/);
  }else{
    assert.equal(rows[0].children[1].textContent,'0–under 4');assert.equal(rows[15].children[1].textContent,'Under −0,1');
    for(const [metric,offset] of [['windSpeedMs',0],['waveHeightM',5],['currentSpeedMs',10],['waterLevelTrendM3h',15]])
      for(let i=0;i<5;i++)for(const [outcome,column] of [['find',2],['no-find',3]])
        assert.equal(rows[offset+i].children[column].textContent,String(report.cells.find(c=>c.cell===metric+':'+i+':'+outcome).noisyCount));
  }
  assert.match(displayed.card.children[2].textContent,new RegExp(String(new Date(report.period.start).getUTCFullYear())));
  assert.equal(displayed.state.downloads.length,0);
  await displayed.card.children.filter(x=>x.tagName==='button')[1].click();
  assert.deepEqual(displayed.state.downloads,['ravradar-tur-vejrstatistik-'+report.period.start.slice(0,7)+'.json']);
  assert.equal(displayed.state.reads,2,'JSON-eksport genlæser rapport og adgang, ikke tidligere UI-data');
  displayed.state.owner=null;displayed.state.epoch++;for(const fn of [...displayed.state.listeners])fn();
  assert.equal(displayed.card.isConnected,false);assert.equal(displayed.card.querySelector('table'),null);
  for(const mode of ['identity','detach','final-permission','failure']){
    const bad=ui(mode);await bad.card.querySelector('button').click();assert.equal(bad.state.downloads.length,0);
    assert.equal(bad.card.querySelector('table'),null);
  }
  const remounted=ui();remounted.mount(remounted.host,remounted.access());assert.equal(remounted.state.listeners.size,1);
}

test('validated reported outcomes and effort survive direct and READY_INPUT originals',async()=>{
  const {createSyntheticTripPayload}=await import('./aggregate-private-fixture.mjs');
  const {qualifyTripWeatherAggregateRow}=await import('../cloudflare/trip-gateway/trip-aggregate-row.js');
  const {prepareTripWeatherAggregate,prepareReadyTripWeatherAggregate}=await import('../cloudflare/trip-gateway/trip-aggregate.js');
  const {startTripWeatherAggregateJob:start,selectPendingTripWeatherAggregateRequest:selectPending,
    collectReadyTripWeatherAggregateJob:collectReady}=await import('../cloudflare/trip-gateway/trip-aggregate-job.js');
  const {readAggregateJobOriginalBinding}=await import('../cloudflare/trip-gateway/trip-aggregate-job-binding.js');
  const {POLICY_ANCHOR}=await import('../cloudflare/trip-gateway/trip-aggregate-policy-gate.js');
  const {sha256Hex}=await import('../supabase/functions/_shared/trip-storage.js');
  // Resolve one whole original tuple through the existing pinned legacy source.
  const predecessor=await readAggregateJobOriginalBinding(null,'e6d83dcb3832dddd1134aadcc9be8fbac780cc2f082734e4780f07a7bab21baa');
  assert.notDeepEqual(predecessor,binding);
  const specifications=[
    {result:'none',huntMode:'beach',searchMinutes:30,searchCoverage:'partial'},
    {result:'small',huntMode:'waders',searchMinutes:60,searchCoverage:'normal'},
    {result:'medium',huntMode:'beach',searchMinutes:90,searchCoverage:'thorough'},
    {result:'good',huntMode:'waders',searchMinutes:120,searchCoverage:'normal'},
  ];
  const fixtures=[],oldFetch=globalThis.fetch;let binaryCells=null;
  globalThis.fetch=async()=>{throw new Error('NETWORK_FORBIDDEN');};
  try{
    for(const tuple of [binding,predecessor]){
      const placements=[],expected=new Map();
      for(let index=0;index<specifications.length;index++){
        const input=specifications[index],n=500+index;
        const identity=await externalOwnerSubject({userId:uuid(20000+index),secret:'synthetic-input-scan-pseudonym-secret-only-00000000'});
        const startAt=dayForPeriod(period,15)+'T11:00:00.000Z';
        const endAt=new Date(Date.parse(startAt)+input.searchMinutes*60000).toISOString();
        const observedAt=new Date(Date.parse(startAt)+input.searchMinutes*30000).toISOString();
        const payload=createSyntheticTripPayload(n,{observation_origin:'self-reported',featureInput:{modelBinding:tuple},
          result:input.result,found:input.result!=='none',grams:null,hunt_mode:input.huntMode,
          search_minutes:input.searchMinutes,search_coverage:input.searchCoverage,
          trip_started_at:startAt,trip_ended_at:endAt,observed_at:observedAt});
        placements.push([[0,2,5,9][index],{...await externalTripRecord({owner:identity,payload,source:'supabase-migration'}),
          created_at:new Date(now-60000).toISOString()}]);
        expected.set(identity.subject,input);
      }
      const f=fixture(placements);fixtures.push(f);const originals=f.originals();
      const schemaBefore=plain(f.dbs[0].prepare('select type,name,tbl_name,sql from sqlite_master order by type,name').all());
      const accounts=[...expected.keys()].sort().map(ownerSubject=>({ownerSubject,enabled:true,revision:'0',source:'default'}));
      const request={schemaVersion:1,period,modelBinding:binding,
        preferenceSnapshot:{schemaVersion:2,snapshotAt:new Date(now).toISOString(),accounts}};
      const direct=await prepareTripWeatherAggregate(f.d1,request);
      if(tuple===binding){
        assert.equal(direct.compatibleReportedContributors,4);assert.equal(direct.cells.length,8);
        assert(direct.cells.every(cell=>cell.count===(cell.cell.endsWith(':no-find')?1:3)));
        binaryCells=direct.cells;
      }else assert.equal(direct.compatibleReportedContributors,0,'direct current binding must not retag an older original');
      for(const key of ['reportedTrip','result','huntMode','searchMinutes','searchCoverage'])
        assert(!JSON.stringify(direct).includes('"'+key+'"'),'the existing binary candidate does not serialize '+key);
      if(tuple!==binding){
        // An actual old job fixture, never UPDATE/retag of a newer immutable job.
        const names=['job_key','period_start','period_end','source_cutoff','execution_id','binding_sha256','model_binding_json',
          'policy_sha256','accounting_sha256','preference_sha256','initial_erasure_sha256','erasure_revision','input_accounts'];
        const key=await sha256Hex(canonicalJson({ledgerId:POLICY_ANCHOR.ledger_id,period}));
        const values=[key,period.start,period.end,request.preferenceSnapshot.snapshotAt,'rr-private-input-scan-v1-UNISSUED',
          await sha256Hex(canonicalJson(tuple)),canonicalJson(tuple),POLICY_ANCHOR.policy_sha256,
          POLICY_ANCHOR.accounting_sha256,await sha256Hex(canonicalJson(accounts)),await sha256Hex(canonicalJson([])),0,4];
        f.dbs[0].prepare('insert into trip_weather_aggregate_jobs ('+names.join(',')+') values ('+names.map(()=>'?').join(',')+')').run(...values);
      }
      const selectedRequest=await selectPending(f.d1,request);
      assert.deepEqual(selectedRequest.modelBinding,tuple);
      let progress=await start(f.d1,selectedRequest);
      for(let steps=0;progress.phase!=='READY_INPUT'&&steps<20;steps++){
        const offset=f.trace.length;progress=await advance(f.d1,selectedRequest);
        assert(queryCount(f.trace.slice(offset))<=45);
        for(const key of ['reportedTrip','result','huntMode','searchMinutes','searchCoverage'])
          assert(!JSON.stringify(progress).includes('"'+key+'"'),'job progress remains closed: '+key);
      }
      assert.equal(progress.phase,'READY_INPUT');
      const ready=await collectReady(f.d1,selectedRequest);
      assert.equal(ready.selected.size,4);
      for(const [subject,value]of ready.selected){
        assert.deepEqual(value.reportedTrip,expected.get(subject),'normal READY_INPUT must preserve the original reported category and effort');
        assert(Object.isFrozen(value.reportedTrip));
        assert.equal(value.found,value.reportedTrip.result!=='none');
      }
      const readyCandidate=await prepareReadyTripWeatherAggregate(f.d1,selectedRequest);
      assert.deepEqual(readyCandidate.cells,binaryCells,'the existing binary report preparation remains unchanged');
      assert.equal(readyCandidate.compatibleReportedContributors,4);
      for(const key of ['reportedTrip','result','huntMode','searchMinutes','searchCoverage'])
        assert(!JSON.stringify(readyCandidate).includes('"'+key+'"'),'READY candidate does not serialize '+key);
      assert.deepEqual(plain(f.dbs[0].prepare('select type,name,tbl_name,sql from sqlite_master order by type,name').all()),schemaBefore);
      const winnerColumns=plain(f.dbs[0].prepare('pragma table_info(trip_weather_aggregate_job_winners)').all()).map(row=>row.name);
      assert.deepEqual(winnerColumns,['job_key','owner_subject','client_observation_id','rank','found','wind_speed','wave_height',
        'current_speed','water_trend','calibration_eligible']);
      assert.deepEqual(f.accounting(),[0,0],'no report or privacy charge is issued');
      assert.deepEqual(f.originals(),originals,'hash-bound originals are unchanged');
      if(tuple===binding){
        const qualify=async row=>{
          const exclusions={preference:0,erased:0,synthetic:0,ineligible:0,repeatContributor:0};
          const value=await qualifyTripWeatherAggregateRow(row,{request,binding,state:{rowsRead:0,payloadBytes:0,after:''},
            seen:new Set(),tripIds:new Set(),erased:new Set(),allowed:new Set(expected.keys()),exclusions});
          return{value,exclusions};
        };
        for(const [,row]of placements){
          const qualified=await qualify(row);
          assert.deepEqual(qualified.value.reportedTrip,expected.get(row.owner_subject));
        }
        for(const edit of [p=>{p.result='unknown';},p=>{delete p.result;},p=>{p.search_minutes=0;},
          p=>{p.search_minutes='60';},p=>{p.search_coverage='unknown';},p=>{p.hunt_mode='boat';}]){
          const row={...placements[0][1]},payload=JSON.parse(row.payload_json);edit(payload);
          const digest={...payload};delete digest.submitted_at;row.payload_json=canonicalJson(payload);row.payload_sha256=await sha256Hex(canonicalJson(digest));
          const answer=await qualify(row);assert.equal(answer.value,null);assert.equal(answer.exclusions.ineligible,1);
        }
        await assert.rejects(qualify({...placements[0][1],payload_sha256:'0'.repeat(64)}),{message:'AGGREGATE_STORED_INTEGRITY_INVALID'});
        const shared='synthetic-outcome-off-shared-secret-only-000000000000';
        const pathname='/v1/trips/aggregate-weather',body=JSON.stringify(request),timestamp=String(now),offset=f.trace.length;
        const signature=await tripGatewaySignature({secret:shared,timestamp,method:'POST',pathname,bodyText:body});
        const response=await handleRequest(new Request('https://synthetic-outcome-off.workers.dev'+pathname,{method:'POST',
          headers:{'Content-Type':'application/json','X-RavRadar-Timestamp':timestamp,'X-RavRadar-Signature':signature},body}),
          {TRIP_GATEWAY_SHARED_SECRET:shared,TRIP_AGGREGATE_ENABLED:'false',...Object.fromEntries(f.d1.map((db,index)=>['TRIP_DB_'+index,db]))});
        assert.equal(response.status,404);assert.equal(f.trace.length,offset,'OFF must stop before storage');
        assert.deepEqual(await response.json(),{ok:false,error:'NOT_FOUND'});
        assert.deepEqual(f.accounting(),[0,0]);
      }
    }
  }finally{fixtures.forEach(f=>f.close());globalThis.fetch=oldFetch;}
});
function dayForPeriod(period,day){return period.start.slice(0,8)+String(day).padStart(2,'0');}

test('categorical report preserves global ledger and owner delivery without legacy retagging',async()=>{
  const {createSyntheticTripPayload}=await import('./aggregate-private-fixture.mjs');
  const {readTripWeatherAggregate}=await import('./lib/trip-weather-aggregate-client.mjs');
  const {canonicalJson,sha256Hex}=await import('../supabase/functions/_shared/trip-storage.js');
  const categoricalModule=await import('../cloudflare/trip-gateway/trip-aggregate-categorical.js');
  const {CATEGORICAL_POLICY,CATEGORICAL_CELL_KEYS,denseCountsFromCategoricalCandidate,
    assertPrivateTripStudyReport}=categoricalModule;
  const oldClock=Date.now,oldFetch=globalThis.fetch;let clock=now;const fixtures=[];
  Date.now=()=>clock;globalThis.fetch=async()=>{throw Error('NETWORK_FORBIDDEN');};
  const shared='synthetic-categorical-shared-secret-only-000000000000000';
  const pseudonym='synthetic-input-scan-pseudonym-secret-only-00000000';
  const previous=previousClosedAggregateMonth(clock),boundary=Date.UTC(new Date(clock).getUTCFullYear(),new Date(clock).getUTCMonth()+1,1);
  const following=previousClosedAggregateMonth(boundary),identities=[],placements=[];
  const specifications=['beach','waders'].flatMap(huntMode=>['none','small','medium','good'].map(result=>({huntMode,result})));
  specifications.push({huntMode:'beach',result:'small'},{huntMode:'waders',result:'good'});
  try{
    for(let index=0;index<10;index++)identities.push(await externalOwnerSubject({userId:uuid(30000+index),secret:pseudonym}));
    for(const [monthIndex,month]of[previous,following].entries())for(let index=0;index<10;index++){
      const input=specifications[index],minutes=[30,60,90,120][index%4],start=dayForPeriod(month,15)+'T11:00:00.000Z';
      const end=new Date(Date.parse(start)+minutes*60000).toISOString(),valid=dayForPeriod(month,15)+'T12:00:00.000Z';
      const issued=dayForPeriod(month,15)+'T10:00:00.000Z';
      const payload=createSyntheticTripPayload(6000+monthIndex*100+index,{observation_origin:'self-reported',
        result:input.result,found:input.result!=='none',grams:null,hunt_mode:input.huntMode,
        search_minutes:minutes,search_coverage:['partial','normal','thorough'][index%3],
        trip_started_at:start,trip_ended_at:end,observed_at:new Date(Date.parse(start)+minutes*30000).toISOString(),
        submitted_at:end,forecast_issued_at:issued,forecast_valid_at:valid,forecast_captured_at:start});
      payload.weather_snapshot={...payload.weather_snapshot,capturedAt:start,forecastIssuedAt:issued,forecastValidAt:valid};
      placements.push([index,{...await externalTripRecord({owner:identities[index],payload,source:'supabase-migration'}),
        created_at:new Date(now-60000).toISOString()}]);
    }
    const f=fixture(placements);fixtures.push(f);const originals=f.originals(),calls=[];
    const env={TRIP_GATEWAY_SHARED_SECRET:shared,TRIP_AGGREGATE_ENABLED:'true',...Object.fromEntries(f.d1.map((db,i)=>['TRIP_DB_'+i,db]))};
    const fetchImpl=async(input,init={})=>{
      const url=new URL(input);
      if(url.hostname==='synthetic.supabase.co'){
        if(url.pathname==='/rest/v1/profiles')return new Response(JSON.stringify(identities.map((_,i)=>({id:uuid(30000+i)}))),{headers:{'content-range':'0-9/10'}});
        assert.equal(url.pathname,'/rest/v1/account_statistics_preferences');return new Response('[]',{headers:{'content-range':'*/0'}});
      }
      assert.equal(url.hostname,'synthetic-categorical.workers.dev');
      const at=f.trace.length,response=await handleRequest(new Request(url,init),env),count=queryCount(f.trace.slice(at));
      assert(count<=45);assert.equal(response.status,200,JSON.stringify({path:url.pathname,count,phase:f.header().phase}));
      calls.push({count,path:url.pathname});return response;
    };
    const invoke=()=>readTripWeatherAggregate({supabaseUrl:'https://synthetic.supabase.co',serviceRoleKey:'synthetic-service-secret-only-0000000000000000',
      gatewayUrl:'https://synthetic-categorical.workers.dev',sharedSecret:shared,pseudonymSecret:pseudonym,fetchImpl});
    const legacy=await invoke();assert.equal(legacy.schemaVersion,2);assert.equal(legacy.cells.length,40);
    const oldRows=plain(f.dbs[0].prepare('select * from trip_weather_aggregate_releases').all());
    const oldCharges=plain(f.dbs[0].prepare('select * from trip_weather_aggregate_account_charges order by owner_subject').all());
    const anchor=plain(f.dbs[0].prepare('select * from trip_weather_aggregate_policy_anchor').all());
    const draft=fs.readFileSync(new URL('./fixtures/trip-categorical-policy-007-proposal.sql.txt',import.meta.url),'utf8');
    f.dbs[0].exec(draft);
    assert.deepEqual(plain(f.dbs[0].prepare('select * from trip_weather_aggregate_policy_anchor').all()),anchor);
    assert.deepEqual(plain(f.dbs[0].prepare('select * from trip_weather_aggregate_releases').all()),oldRows);
    assert.deepEqual(plain(f.dbs[0].prepare('select * from trip_weather_aggregate_account_charges order by owner_subject').all()),oldCharges);
    assert.deepEqual(await invoke(),legacy,'a frozen binary month is not resampled into a160-cell report');
    assert.deepEqual(f.accounting(),[1,10]);
    clock=boundary+1000;
    const report=await invoke();
    assert.equal(report.schemaVersion,3,'normal anchored producer must issue the distinct categorical format');
    assert.equal(report.cells.length,160);assert.equal(new Set(report.cells.map(c=>c.cell)).size,160);
    assert.equal(report.policyId,CATEGORICAL_POLICY.id);assert.notEqual(report.policySha256,legacy.policySha256);
    assert.equal(report.effortStatus,'ALL_VALIDATED_REPORTED_EFFORT_UNADJUSTED');await assertPrivateTripStudyReport(report);
    assert(Buffer.byteLength(canonicalJson(report))<32768,'normal private transport keeps its existing byte bound');
    assert.deepEqual(await invoke(),report,'replay of a categorical month must not resample/recharge');
    assert.deepEqual(f.accounting(),[2,20]);
    const totals=plain(f.dbs[0].prepare('select owner_subject,sum(budget_units) units from trip_weather_aggregate_account_charges group by owner_subject').all());
    assert.equal(totals.length,10);assert(totals.every(row=>row.units===8));
    assert.deepEqual(plain(f.dbs[0].prepare('select * from trip_weather_aggregate_releases where period_start=?').all(previous.start)),oldRows);
    assert.deepEqual(f.originals(),originals);
    const stored={...f.dbs[0].prepare('select * from trip_weather_aggregate_releases where period_start=?').get(following.start)};
    const attempt=row=>f.dbs[0].prepare('insert into trip_weather_aggregate_releases ('+Object.keys(row).join(',')+') values ('+Object.keys(row).map(()=>'?').join(',')+')').run(...Object.values(row));
    assert.throws(()=>attempt({...stored,release_key:'f'.repeat(64)}),/DP_PERIOD_IMMUTABLE/);
    const nextPeriod=previousClosedAggregateMonth(Date.UTC(new Date(boundary).getUTCFullYear(),new Date(boundary).getUTCMonth()+1,1));
    for(const prior of[stored,oldRows[0]]){
      const payload={...JSON.parse(prior.report_json),period:nextPeriod},body=canonicalJson(payload);
      const row={...prior,release_key:await sha256Hex(canonicalJson({ledgerId:CATEGORICAL_POLICY.namespace,period:nextPeriod})),
        period_start:nextPeriod.start,period_end:nextPeriod.end,report_json:body,report_sha256:await sha256Hex(body)};
      assert.throws(()=>attempt(row),/DP_ACCOUNT_LIFETIME_BUDGET_EXHAUSTED/);
    }
    assert.deepEqual(f.accounting(),[2,20]);
    assert.throws(()=>f.dbs[0].exec('delete from trip_weather_aggregate_categorical_policy_anchor'),/DP_CATEGORICAL_POLICY_IMMUTABLE/);
    assert.throws(()=>f.dbs[0].exec('delete from trip_weather_aggregate_policy_anchor'),/DP_POLICY_IMMUTABLE/);
    const schema=plain(f.dbs[0].prepare("select type,name from sqlite_master where name like 'trip_weather_aggregate_%' order by type,name").all());
    assert(schema.some(row=>row.name==='trip_weather_aggregate_categorical_policy_anchor'));
    // The raw projection still admits every qualified effort; no effort cohort.
    const {prepareCategoricalTripWeatherAggregate}=await import('../cloudflare/trip-gateway/trip-aggregate.js');
    const fresh=fixture(placements.filter((_,i)=>i>=10));fixtures.push(fresh);
    const accounts=identities.map(identity=>({ownerSubject:identity.subject,enabled:true,revision:'0',source:'default'})).sort((a,b)=>a.ownerSubject<b.ownerSubject?-1:a.ownerSubject>b.ownerSubject?1:0);
    const request={schemaVersion:1,period:following,modelBinding:binding,preferenceSnapshot:{schemaVersion:2,snapshotAt:new Date(clock).toISOString(),accounts}};
    const projected=await prepareCategoricalTripWeatherAggregate(fresh.d1,request);
    const counts=denseCountsFromCategoricalCandidate(projected);assert.equal(counts.length,160);assert.equal(counts.reduce((a,b)=>a+b,0),40);
    assert.equal(projected.compatibleReportedContributors,10);
    const removed=await prepareCategoricalTripWeatherAggregate(fresh.d1,{...request,preferenceSnapshot:{...request.preferenceSnapshot,accounts:accounts.map((a,i)=>i? a:{...a,enabled:false,revision:'1',source:'stored'})}});
    const less=denseCountsFromCategoricalCandidate(removed);
    assert.equal(counts.reduce((sum,value,i)=>sum+Math.abs(value-less[i]),0),4,'one account changes four coordinates, not160');
    const originalInput=JSON.parse(placements[10][1].payload_json);
    const replacementPayload=createSyntheticTripPayload(6100,{observation_origin:'self-reported',result:'good',found:true,
      grams:null,hunt_mode:'waders',search_minutes:originalInput.search_minutes,search_coverage:originalInput.search_coverage,
      trip_started_at:originalInput.trip_started_at,trip_ended_at:originalInput.trip_ended_at,observed_at:originalInput.observed_at,
      submitted_at:originalInput.submitted_at,forecast_issued_at:originalInput.forecast_issued_at,
      forecast_valid_at:originalInput.forecast_valid_at,forecast_captured_at:originalInput.forecast_captured_at});
    replacementPayload.weather_snapshot={...replacementPayload.weather_snapshot,capturedAt:originalInput.forecast_captured_at,
      forecastIssuedAt:originalInput.forecast_issued_at,forecastValidAt:originalInput.forecast_valid_at};
    const replacementRow={...await externalTripRecord({owner:identities[0],payload:replacementPayload,source:'supabase-migration'}),created_at:placements[10][1].created_at};
    const replacement=fixture(placements.slice(10).map(([shard,row],index)=>[shard,index?row:replacementRow]));fixtures.push(replacement);
    const replacementCounts=denseCountsFromCategoricalCandidate(await prepareCategoricalTripWeatherAggregate(replacement.d1,request));
    assert.equal(counts.reduce((sum,value,i)=>sum+Math.abs(value-replacementCounts[i]),0),8,'replacement changes at most eight coordinates');
    const {preparePolicyBoundReview}=await import('../cloudflare/trip-gateway/trip-aggregate-policy-gate.js');
    for(const mode of['unknown','partial']){
      const stopped=fixture(placements.slice(10));fixtures.push(stopped);
      if(mode==='unknown')stopped.dbs[0].exec('create table trip_weather_aggregate_categorical_policy_anchor (schema_version integer)');
      else stopped.dbs[0].exec(draft.split('DROP TRIGGER trip_weather_aggregate_insert_guard;')[0]);
      await assert.rejects(preparePolicyBoundReview(stopped.d1,request,{randomFill:buffer=>buffer.fill(0)}));
      assert.deepEqual(stopped.accounting(),[0,0],'unknown or partial007 is not permission for a binary fallback or a charge');
    }
    const bad=structuredClone(report);bad.cells[0].cell=CATEGORICAL_CELL_KEYS[1];await assert.rejects(assertPrivateTripStudyReport(bad));
    const relabel=structuredClone(legacy);relabel.schemaVersion=3;await assert.rejects(assertPrivateTripStudyReport(relabel));
    assert.equal(await sha256Hex(fs.readFileSync(new URL('../cloudflare/trip-gateway/trip-aggregate-dp.js',import.meta.url),'utf8')),'ffd3389017064fce904ec2f8f850b4e60248db0e29185f9a0ed83021be73117b');
    clock=Date.UTC(new Date(boundary).getUTCFullYear(),new Date(boundary).getUTCMonth()+1,1)+1000;
    await verifyPrivateOwnerReportDelivery(legacy);await verifyPrivateOwnerReportDelivery(report);
    assert.deepEqual(f.accounting(),[2,20]);assert.deepEqual(f.originals(),originals);
    assert(calls.every(call=>call.count<=45));
    console.log(JSON.stringify({kind:'PRIVATE_CATEGORICAL_REPORT_NORMAL_CALLER',syntheticNativeSQLite:true,
      populatedShards:10,legacyCells:40,currentCells:160,maximumInvocationStatements:Math.max(...calls.map(call=>call.count)),
      categoricalReportBytes:Buffer.byteLength(canonicalJson(report)),sharedGlobalMonthAndLifetimeBudget:true,
      originalLegacyReportUnchanged:true,ownerTransportAndTable:true,installed:false,activated:false,hostedFreeQualified:false}));
  }finally{fixtures.forEach(f=>f.close());Date.now=oldClock;globalThis.fetch=oldFetch;}
});
