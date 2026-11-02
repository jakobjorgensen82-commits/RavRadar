import test from 'node:test';
import assert from 'node:assert/strict';
import {provisionAdminDocumentHistoryBucket as run,ADMIN_HISTORY_BUCKET_PROVISION as P} from './provision-admin-document-history-bucket.mjs';
const env={RAVRADAR_R2_ACCOUNT_ID:'b'.repeat(32),CLOUDFLARE_API_TOKEN:'synthetic-existing-token-never-real'};
const confirmation='CREATE-PRIVATE-EU-ADMIN-HISTORY-BUCKET';
function fixture(fault={}){
  const calls=[];let exists=fault.exists!==false;
  const properties=()=>({name:P.bucket,jurisdiction:fault.jurisdiction||'eu',storage_class:fault.storageClass||'Standard'});
  const response=(result,status=200)=>new Response(JSON.stringify({success:status===200,errors:status===200?[]:[{code:1000,message:'raw-error-never-disclose'}],result}),{status});
  const fetchImpl=async(url,init)=>{
    const u=new URL(url),method=init.method;calls.push({url:u.href,method,headers:init.headers,body:init.body});
    assert.equal(u.origin,'https://api.cloudflare.com');assert.equal(init.redirect,'manual');assert(init.signal);
    assert.equal(init.headers['cf-r2-jurisdiction'],'eu');assert.equal(init.headers.Authorization,'Bearer '+env.CLOUDFLARE_API_TOKEN);
    assert(u.pathname.startsWith('/client/v4/accounts/'+env.RAVRADAR_R2_ACCOUNT_ID+'/r2/buckets'));
    if((fault.denied&&calls.length===1)||(fault.postDenied&&method==='POST'))return response(null,403);
    if(method==='POST'){
      assert.equal(u.pathname.split('/').at(-1),'buckets');assert.deepEqual(JSON.parse(init.body),{name:P.bucket,storageClass:'Standard'});
      exists=true;if(fault.postUnknown)throw Error('raw transport error never disclose');
      if(fault.postMalformed)return new Response('not-json',{status:200});
      return response(properties());
    }
    assert.equal(method,'GET');assert.equal(init.body,undefined);
    if(u.searchParams.has('name_contains'))return response({buckets:exists?[properties()]:[]},200);
    if(u.pathname.endsWith('/domains/managed'))return response({bucketId:'a'.repeat(32),domain:'synthetic.r2.dev',enabled:!!fault.public});
    if(u.pathname.endsWith('/domains/custom'))return response({domains:fault.custom?[{domain:'synthetic.invalid',enabled:false}]:[]});
    return exists?response(properties()):response(null,404);
  };
  // Keep the API's filtered total metadata independent of result length.
  const transport=async(url,init)=>{
    const r=await fetchImpl(url,init);
    if(new URL(url).searchParams.has('name_contains')&&r.status===200){const b=await r.json();b.result_info={total_count:7,...(fault.cursor?{cursor:'repeat'}:{})};return new Response(JSON.stringify(b),{status:200});}
    return r;
  };
  return{calls,fetchImpl:transport};
}
test('archive bucket: readonly private metadata, exact EU/Standard and no settings writes',async()=>{
  const f=fixture();const r=await run({}, {env,fetchImpl:f.fetchImpl});assert.equal(r.status,'PRIVATE_EU_BUCKET_VERIFIED');
  assert.equal(r.postCount,0);assert.equal(r.managedPublicEnabled,false);assert.equal(r.customDomainCount,0);
  assert.deepEqual(f.calls.map(x=>x.method),['GET','GET','GET','GET']);
});
test('archive bucket: authenticated complete inventory plus404 proves only fixed EU absence',async()=>{
  const f=fixture({exists:false});const r=await run({}, {env,fetchImpl:f.fetchImpl});assert.equal(r.status,'PRIVATE_EU_BUCKET_ABSENT');assert.equal(f.calls.length,2);
});
test('archive bucket: explicit create once only after absence, then fresh private readback',async()=>{
  const f=fixture({exists:false});const r=await run({mode:'create',confirmation},{env,fetchImpl:f.fetchImpl});
  assert.equal(r.status,'PRIVATE_EU_BUCKET_CREATED_VERIFIED');assert.equal(r.writeOutcome,'CREATED');assert.equal(r.postCount,1);
  assert.equal(f.calls.filter(x=>x.method==='POST').length,1);assert.equal(f.calls[0].method,'GET');assert.equal(f.calls[1].method,'GET');
  assert.equal(f.calls.at(-1).url.endsWith('/domains/custom'),true);
});
test('archive bucket: existing bucket is never recreated or changed',async()=>{
  const f=fixture();const r=await run({mode:'create',confirmation},{env,fetchImpl:f.fetchImpl});assert.equal(r.status,'PRIVATE_EU_BUCKET_VERIFIED');assert(f.calls.every(x=>x.method==='GET'));
});
test('archive bucket: invalid authority, retargeting and confirmation refuse before IO',async()=>{
  for(const [options,changed] of [[{mode:'create'},env],[{mode:'create',confirmation:'wrong'},env],
    [{mode:'read-only',confirmation},env],[{bucket:'foreign'},env],[{mode:'toggle'},env],
    [{},{...env,CLOUDFLARE_API_TOKEN:''}],[{},{...env,RAVRADAR_R2_ACCOUNT_ID:'foreign'}],
    [{},{...env,CLOUDFLARE_ACCOUNT_ID:'c'.repeat(32)}]]){
    let calls=0;await assert.rejects(()=>run(options,{env:changed,fetchImpl:()=>{calls++;}}));assert.equal(calls,0);
  }
});
test('archive bucket:403 preserves exact status and stops without any privilege fallback',async()=>{
  for(const fault of [{denied:true},{exists:false,postDenied:true}]){
    const f=fixture(fault);await assert.rejects(()=>run({mode:'create',confirmation},{env,fetchImpl:f.fetchImpl}),e=>e.code==='R2_BUCKET_API_DENIED'&&e.httpStatus===403);
    assert.equal(f.calls.length,fault.postDenied?3:1);assert(!JSON.stringify(f.calls).includes('raw-error'));
  }
});
test('archive bucket: public managed, any custom domain, wrong jurisdiction/class all fail without mutations',async()=>{
  for(const fault of [{public:true},{custom:true},{jurisdiction:'default'},{storageClass:'InfrequentAccess'}]){
    const f=fixture(fault);await assert.rejects(()=>run({mode:'create',confirmation},{env,fetchImpl:f.fetchImpl}));assert(f.calls.every(x=>x.method==='GET'));
  }
});
test('archive bucket: unknown/malformed POST stops and later readonly reconciliation never repeats it',async()=>{
  for(const fault of [{postUnknown:true},{postMalformed:true}]){
    const f=fixture({exists:false,...fault});await assert.rejects(()=>run({mode:'create',confirmation},{env,fetchImpl:f.fetchImpl}),e=>e.code==='R2_BUCKET_CREATE_OUTCOME_UNKNOWN'&&e.writeOutcome==='UNKNOWN_NO_RETRY');
    assert.equal(f.calls.filter(x=>x.method==='POST').length,1);assert.equal(f.calls.length,3);
    const r=await run({}, {env,fetchImpl:f.fetchImpl});assert.equal(r.status,'PRIVATE_EU_BUCKET_VERIFIED');assert.equal(f.calls.filter(x=>x.method==='POST').length,1);
  }
});
test('archive bucket: incomplete/repeating inventory never grants create',async()=>{
  const f=fixture({exists:false,cursor:true});await assert.rejects(()=>run({mode:'create',confirmation},{env,fetchImpl:f.fetchImpl}),/R2_BUCKET_INVENTORY_CURSOR/);assert(f.calls.every(x=>x.method==='GET'));
});
