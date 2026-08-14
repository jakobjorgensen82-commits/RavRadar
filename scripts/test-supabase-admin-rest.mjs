#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {buildSupabaseAdminHeaders,createSupabaseAdminRequester,isRetryableTranslatedSecretAuthError} from './lib/supabase-admin-rest.mjs';

const secret='sb_secret_test-value';
const secretHeaders=buildSupabaseAdminHeaders(secret);
assert.equal(secretHeaders.apikey,secret);
assert.equal('Authorization' in secretHeaders,false,'sb_secret_ må ikke sendes som Bearer-token');
assert.equal(buildSupabaseAdminHeaders('legacy.jwt').Authorization,'Bearer legacy.jwt');
assert.equal(isRetryableTranslatedSecretAuthError({key:secret,status:401,body:JSON.stringify({code:'PGRST303'})}),true);
assert.equal(isRetryableTranslatedSecretAuthError({key:secret,status:401,body:JSON.stringify({code:'PGRST301'})}),false);

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

const [retryWorkflow,protectedSync,versionSetter]=await Promise.all([
  fs.readFile('.github/workflows/retry-national-admin-roundtrip.yml','utf8'),
  fs.readFile('scripts/sync-protected-admin-assets.mjs','utf8'),
  fs.readFile('scripts/set-version.mjs','utf8')
]);
assert.match(retryWorkflow,/source_run_id:/,'målrettet workflow skal kræve et eksisterende privat run');
assert.match(retryWorkflow,/actions\/download-artifact@v4/,'målrettet workflow skal genbruge det private artifact');
assert.match(retryWorkflow,/validate-national-admin-roundtrip\.mjs/,'målrettet workflow skal køre den centrale roundtrip');
assert.doesNotMatch(retryWorkflow,/deploy-pages|pages:\s*write/,'målrettet roundtrip må aldrig kunne deploye');
assert.match(protectedSync,/const previousManifest=await existingDocument\(manifestKey\);/,'manifestet skal læses fail-closed');
assert.doesNotMatch(protectedSync,/existingDocument\(manifestKey\)\.catch\(\(\)=>null\)/,'en læsefejl må ikke ligne et manglende manifest og udløse ekstra skrivninger');
assert.match(versionSetter,/!\/\^KYSTZONER-\//,'private reviewkort må ikke omskrives af en app-versionering');

console.log('Supabase admin REST: målrettet PGRST303-genprøvning og fail-closed fejlrapportering bestået');
