#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {buildSupabaseAdminHeaders,createSupabaseAdminRequester,isRetryableStatementTimeout,isRetryableTransientRead,isRetryableTranslatedSecretAuthError} from './lib/supabase-admin-rest.mjs';

const secret='sb_secret_test-value';
const secretHeaders=buildSupabaseAdminHeaders(secret);
assert.equal(secretHeaders.apikey,secret);
assert.equal('Authorization' in secretHeaders,false,'sb_secret_ må ikke sendes som Bearer-token');
assert.equal(buildSupabaseAdminHeaders('legacy.jwt').Authorization,'Bearer legacy.jwt');
assert.equal(isRetryableTranslatedSecretAuthError({key:secret,status:401,body:JSON.stringify({code:'PGRST303'})}),true);
assert.equal(isRetryableTranslatedSecretAuthError({key:secret,status:401,body:JSON.stringify({code:'PGRST301'})}),false);
assert.equal(isRetryableStatementTimeout({status:500,body:JSON.stringify({code:'57014'})}),true);
assert.equal(isRetryableStatementTimeout({status:500,body:JSON.stringify({code:'42P01'})}),false);
assert.equal(isRetryableStatementTimeout({status:503,body:JSON.stringify({code:'57014'})}),false);
assert.equal(isRetryableTransientRead({method:'GET',status:502}),true);
assert.equal(isRetryableTransientRead({method:'POST',status:502}),false);

let calls=0;
const recoveredRequest=createSupabaseAdminRequester({
  endpoint:'https://example.invalid/rest/v1/admin_documents',key:secret,retryDelayMs:0,delayImpl:async()=>{},logger:()=>{},
  fetchImpl:async()=>{
    calls+=1;
    if(calls===1)return new Response(JSON.stringify({code:'PGRST303',message:'JWT claims validation failed'}),{status:401});
    return new Response(JSON.stringify([{document_key:'direction-reviews'}]),{status:200});
  }
});
assert.deepEqual(await recoveredRequest('?document_key=eq.direction-reviews',{},'læs direction-reviews'),[{document_key:'direction-reviews'}]);
assert.equal(calls,2,'PGRST303 skal genprøves præcis én gang');

let timeoutCalls=0;
const timeoutLogs=[];
const recoveredTimeoutRequest=createSupabaseAdminRequester({
  endpoint:'https://example.invalid/rest/v1/admin_documents',key:secret,retryDelayMs:0,delayImpl:async()=>{},logger:message=>timeoutLogs.push(message),
  fetchImpl:async()=>{
    timeoutCalls+=1;
    if(timeoutCalls===1)return new Response(JSON.stringify({code:'57014',message:'canceling statement due to statement timeout'}),{status:500});
    return new Response(null,{status:204});
  }
});
assert.equal(await recoveredTimeoutRequest('?on_conflict=document_key',{method:'POST'},'skriv runtime-diagnostics'),null);
assert.equal(timeoutCalls,2,'57014 skal genprøves præcis én gang');
assert.match(timeoutLogs[0],/statement-timeout 57014.*genprøver én gang/);

let transientReadCalls=0;
const transientReadRequest=createSupabaseAdminRequester({
  endpoint:'https://example.invalid/rest/v1/admin_documents',key:secret,retryDelayMs:0,delayImpl:async()=>{},logger:()=>{},
  fetchImpl:async()=>{
    transientReadCalls+=1;
    if(transientReadCalls===1)return new Response('',{status:502});
    return new Response(JSON.stringify([{document_key:'ravscore-operational-activation'}]),{status:200});
  }
});
assert.equal((await transientReadRequest('',{},'læs operation')).length,1);
assert.equal(transientReadCalls,2,'midlertidig 502 på en læsning skal genprøves én gang');

let networkReadCalls=0;
const networkReadRequest=createSupabaseAdminRequester({
  endpoint:'https://example.invalid/rest/v1/admin_documents',key:secret,retryDelayMs:0,delayImpl:async()=>{},logger:()=>{},
  fetchImpl:async()=>{
    networkReadCalls+=1;
    if(networkReadCalls===1)throw new Error('temporary connection reset');
    return new Response('[]',{status:200});
  }
});
assert.deepEqual(await networkReadRequest('',{},'læs operation'),[]);
assert.equal(networkReadCalls,2,'midlertidig netværksfejl på en læsning skal genprøves én gang');

for(const method of ['GET','HEAD','POST']){
  let bodyCalls=0;
  const bodyRequest=createSupabaseAdminRequester({
    endpoint:'https://example.invalid/rest/v1/admin_documents',key:secret,
    retryDelayMs:0,delayImpl:async()=>{},logger:()=>{},
    fetchImpl:async()=>{
      bodyCalls+=1;
      return bodyCalls===1
        ? {ok:true,status:200,text:async()=>{throw new TypeError('synthetic body reset');}}
        : new Response('[]',{status:200});
    }
  });
  if(method==='POST'){
    await assert.rejects(()=>bodyRequest('',{method}),error=>error.code==='SUPABASE_RESPONSE_BODY_TRANSPORT');
    assert.equal(bodyCalls,1,'ordinary writes must use owner-specific read-back, not blind body retries');
  }else{
    assert.deepEqual(await bodyRequest('',{method}),[]);
    assert.equal(bodyCalls,2,'safe reads retry body transport interruptions as well as fetch failures');
  }
}

let invalidJsonCalls=0;
const invalidJsonRequest=createSupabaseAdminRequester({
  endpoint:'https://example.invalid',key:secret,delayImpl:async()=>{},logger:()=>{},
  fetchImpl:async()=>{invalidJsonCalls+=1;return new Response('{invalid',{status:200});}
});
await assert.rejects(()=>invalidJsonRequest(),/ugyldigt JSON/);
assert.equal(invalidJsonCalls,1,'invalid JSON is not a body transport interruption');

let rejectedCalls=0;
const rejectedRequest=createSupabaseAdminRequester({
  endpoint:'https://example.invalid/rest/v1/admin_documents',key:secret,retryDelayMs:0,delayImpl:async()=>{},logger:()=>{},
  fetchImpl:async()=>{rejectedCalls+=1;return new Response(JSON.stringify({code:'PGRST301',message:'invalid token'}),{status:401});}
});
await assert.rejects(()=>rejectedRequest('',{},'beskyttet læsning'),/beskyttet læsning \(GET\).*HTTP 401 PGRST301.*invalid token/);
assert.equal(rejectedCalls,1,'andre auth-fejl må ikke skjules med genprøvning');

let persistentCalls=0;
const persistentRequest=createSupabaseAdminRequester({
  endpoint:'https://example.invalid/rest/v1/admin_documents',key:secret,retryDelayMs:0,delayImpl:async()=>{},logger:()=>{},
  fetchImpl:async()=>{persistentCalls+=1;return new Response(JSON.stringify({code:'PGRST303',message:'JWT claims validation failed'}),{status:401});}
});
await assert.rejects(()=>persistentRequest('',{},'beskyttet læsning'),/HTTP 401 PGRST303.*JWT claims validation failed/);
assert.equal(persistentCalls,2,'vedvarende PGRST303 skal stoppe efter én genprøvning');

let persistentTimeoutCalls=0;
const persistentTimeoutRequest=createSupabaseAdminRequester({
  endpoint:'https://example.invalid/rest/v1/admin_documents',key:secret,retryDelayMs:0,delayImpl:async()=>{},logger:()=>{},
  fetchImpl:async()=>{persistentTimeoutCalls+=1;return new Response(JSON.stringify({code:'57014',message:'canceling statement due to statement timeout'}),{status:500});}
});
await assert.rejects(()=>persistentTimeoutRequest('?on_conflict=document_key',{method:'POST'},'skriv runtime-diagnostics'),/HTTP 500 57014.*statement timeout/);
assert.equal(persistentTimeoutCalls,2,'vedvarende 57014 skal stoppe efter én genprøvning');

const [retryWorkflow,protectedSync,versionSetter]=await Promise.all([
  fs.readFile('.github/workflows/retry-national-admin-roundtrip.yml','utf8'),
  fs.readFile('scripts/sync-protected-admin-assets.mjs','utf8'),
  fs.readFile('scripts/set-version.mjs','utf8')
]);
assert.match(retryWorkflow,/source_run_id:/,'målrettet workflow skal kræve et eksisterende privat run');
assert.match(retryWorkflow,/actions\/download-artifact@v8/,'målrettet workflow skal genbruge det private artifact');
assert.match(retryWorkflow,/validate-national-admin-roundtrip\.mjs/,'målrettet workflow skal køre den centrale roundtrip');
assert.doesNotMatch(retryWorkflow,/deploy-pages|pages:\s*write/,'målrettet roundtrip må aldrig kunne deploye');
assert.match(protectedSync,/const previousManifest=await existingDocument\(manifestKey\);/,'manifestet skal læses fail-closed');
assert.doesNotMatch(protectedSync,/existingDocument\(manifestKey\)\.catch\(\(\)=>null\)/,'en læsefejl må ikke ligne et manglende manifest og udløse ekstra skrivninger');
assert.match(versionSetter,/!\/\^KYSTZONER-\//,'private reviewkort må ikke omskrives af en app-versionering');

console.log('Supabase admin REST: målrettet PGRST303-/57014-genprøvning og fail-closed fejlrapportering bestået');
