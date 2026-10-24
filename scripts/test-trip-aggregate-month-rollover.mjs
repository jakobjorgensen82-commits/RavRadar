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
