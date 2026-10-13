import assert from 'node:assert/strict';
// Actual normal fixed reader with controlled transport; never a live repeat.
assert.equal(Object.hasOwn(process.env,'SUPABASE_ACCESS_TOKEN'),false,
  'Do not read or replace an ambient Management credential in an offline target');
const savedFetch=globalThis.fetch;
process.env.SUPABASE_ACCESS_TOKEN='synthetic-fixed-storage-NOT-A-CREDENTIAL';
const valid=result=>new Response(JSON.stringify({result,error:null}),{status:200});
const sample={status:413,source:'storage',provider_code:'EntityTooLarge'};
const fixtures=[
  ['bare-categories',()=>new Response(JSON.stringify({result:[sample]}),{status:200}),'RECORDED_CATEGORIES',1],
  ['bare-empty',()=>new Response(JSON.stringify({result:[]}),{status:200}),'NO_MATCHING_RECORDED_EVENTS',0],
  ['bare-extra-key',()=>new Response(JSON.stringify({result:[],PRIVATE_RAW_KEY:'PRIVATE_RAW_BODY'}),{status:200}),'LOG_ENVELOPE_SHAPE',null],
  ['categories',()=>valid([sample,{status:200,source:'gateway',provider_code:'MISSING'},
    {status:503,source:'storage',provider_code:'DatabaseTimeout'}]),'RECORDED_CATEGORIES',3],
  ['empty',()=>valid([]),'NO_MATCHING_RECORDED_EVENTS',0],
  ['unknown-recorded',()=>valid([{status:403,source:'gateway',provider_code:'UNKNOWN'},
    {status:400,source:'storage',provider_code:'MISSING'}]),'RECORDED_CATEGORIES',2],
  ['utf8',()=>new Response(Uint8Array.from([0xff]),{status:200}),'LOG_UTF8_INVALID',null],
  ['json',()=>new Response('{PRIVATE_RAW_INVALID',{status:200}),'LOG_JSON_INVALID',null],
  ['envelope',()=>new Response(JSON.stringify({data:[],error:null,PRIVATE_RAW_KEY:'PRIVATE_RAW_BODY'}),{status:200}),'LOG_ENVELOPE_SHAPE',null],
  ['error-type',()=>new Response(JSON.stringify({result:[],error:{PRIVATE_RAW_KEY:'PRIVATE_RAW_BODY'}}),{status:200}),'LOG_ERROR_FIELD_TYPE',null],
  ['query-error',()=>new Response(JSON.stringify({result:[],error:'PRIVATE_RAW_QUERY_ERROR'}),{status:200}),'LOG_QUERY_ERROR',null],
  ['result-type',()=>new Response(JSON.stringify({result:{PRIVATE_RAW_KEY:1},error:null}),{status:200}),'LOG_RESULT_TYPE',null],
  ['row-shape',()=>valid([{...sample,PRIVATE_RAW_KEY:'PRIVATE_RAW_BODY'}]),'LOG_ROW_SHAPE',null],
  ['status-type',()=>valid([{...sample,status:'PRIVATE_RAW_STATUS'}]),'LOG_STATUS_TYPE',null],
  ['status-missing',()=>valid([{...sample,status:null}]),'LOG_STATUS_TYPE',null],
  ['status-zero',()=>valid([{...sample,status:0}]),'LOG_STATUS_RANGE',null],
  ['status-range',()=>valid([{...sample,status:600}]),'LOG_STATUS_RANGE',null],
  ['code-type',()=>valid([{...sample,provider_code:{PRIVATE_RAW_KEY:1}}]),'LOG_CODE_TYPE',null],
  ['code-unknown',()=>valid([{...sample,provider_code:'PRIVATE_RAW_ERROR'}]),'LOG_CODE_NOT_ALLOWED',null],
  ['source-unknown',()=>valid([{...sample,source:'PRIVATE_RAW_SOURCE'}]),'LOG_SOURCE_NOT_ALLOWED',null],
  ['source-postgres',()=>valid([{...sample,source:'postgres_logs'}]),'LOG_SOURCE_NOT_ALLOWED',null],
  ['duplicate',()=>valid([sample,sample]),'LOG_CATEGORY_DUPLICATE',null],
  ['row-cap',()=>valid(Array(8).fill(sample)),'LOG_ROW_CAP_REACHED',null],
  ['http',()=>new Response('PRIVATE_RAW_HTTP_BODY',{status:503}),'LOG_HTTP_REJECTED',null],
  ['length-shape',()=>new Response('PRIVATE_RAW_BODY',{status:200,headers:{'content-length':'invalid'}}),'LOG_CONTENT_LENGTH_SHAPE',null],
  ['declared-oversize',()=>new Response('',{status:200,headers:{'content-length':'32769'}}),'LOG_BODY_TOO_LARGE',null],
  ['oversize',()=>new Response(new Uint8Array(32769),{status:200}),'LOG_BODY_TOO_LARGE',null],
  ['transport',()=>{throw Error('PRIVATE_RAW_TRANSPORT');},'LOG_TRANSPORT_ERROR',null],
  ['held-body',()=>new Response(new ReadableStream({start(){}}),{status:200}),'LOG_DEADLINE_EXCEEDED',null],
];
let totalRequests=0;
try {
  for(const[label,response,expected,rowCount]of fixtures) {
    const module=await import('./read-fixed-storage-upload-log-20261013.mjs?offline_fixed_case='+label);
    let requests=0;
    globalThis.fetch=async(url,init)=>{
      requests++;totalRequests++;
      assert.equal(url.origin,'https://api.supabase.com');
      assert.equal(url.pathname,'/v1/projects/afqhhdrkjfjtpadntdzo/analytics/endpoints/logs');
      assert.deepEqual([...url.searchParams.keys()].sort(),['iso_timestamp_end','iso_timestamp_start','sql']);
      assert.equal(url.searchParams.get('iso_timestamp_start'),'2026-10-13T19:27:08Z');
      assert.equal(url.searchParams.get('iso_timestamp_end'),'2026-10-13T19:27:19Z');
      const sql=url.searchParams.get('sql');
      assert.match(sql,/timestamp >= '2026-10-13 19:27:08'/);
      assert.match(sql,/timestamp < '2026-10-13 19:27:19'/);
      assert.match(sql,/SELECT DISTINCT status, source_kind AS source, provider_code/);
      assert.match(sql,/source = 'storage_logs' AND log_attributes\['req.method'\] = 'POST'/);
      assert.match(sql,/source = 'edge_logs' AND log_attributes\['request.method'\] = 'POST'/);
      assert.ok(sql.includes("'^/object/ravradar-private-production-runtime/operational-evidence/sha256/[0-9a-f]{64}[.]json[.]gz$'"));
      assert.ok(sql.includes("'^/storage/v1/object/ravradar-private-production-runtime/operational-evidence/sha256/[0-9a-f]{64}[.]json[.]gz$'"));
      assert.match(sql,/toInt32OrZero\(log_attributes\['res.statusCode'\]\)/);
      assert.match(sql,/toInt32OrZero\(log_attributes\['response.status_code'\]\)/);
      assert.equal(sql.split("CASE WHEN mapContains(log_attributes, 'error.errorCode')\n          AND log_attributes['error.errorCode'] != '' THEN\n        CASE WHEN log_attributes['error.errorCode'] IN ('EntityTooLarge', 'ResourceAlreadyExists', 'KeyAlreadyExists', 'InvalidMimeType', 'AccessDenied', 'InternalError', 'DatabaseTimeout', 'DatabaseError', 'SlowDown', 'InvalidJWT', 'UNAUTHORIZED_MISSING_API_KEY')\n          THEN log_attributes['error.errorCode'] ELSE 'UNKNOWN' END\n      ELSE\n      CASE WHEN NOT mapContains(log_attributes, 'error.code')\n          OR log_attributes['error.code'] = '' THEN 'MISSING'\n        WHEN log_attributes['error.code'] IN ('EntityTooLarge', 'ResourceAlreadyExists', 'KeyAlreadyExists', 'InvalidMimeType', 'AccessDenied', 'InternalError', 'DatabaseTimeout', 'DatabaseError', 'SlowDown', 'InvalidJWT', 'UNAUTHORIZED_MISSING_API_KEY')\n          THEN log_attributes['error.code'] ELSE 'UNKNOWN' END\n      END").length,2,
        'One normalized-code branch, then the exact finite legacy fallback; unknown normalized codes remain UNKNOWN');
      assert.equal((sql.match(/error\.errorCode/g)||[]).length,4);
      assert.equal((sql.match(/error\.code/g)||[]).length,4,'Legacy field and finite mapping remain exact');
      assert.match(sql,/NOT mapContains\(log_attributes, 'error.code'\)/);
      assert.match(sql,/THEN 'MISSING'/);
      assert.match(sql,/ELSE 'UNKNOWN'/);
      assert.match(sql,/LIMIT 8$/);
      assert.doesNotMatch(sql,/SELECT\s+\*|error\.message|event_message|req\.path|parsed\.query|consume_public_request_limit|postgres_logs|2026-10-12/);
      assert.equal(init.method,'GET');assert.equal(init.body,undefined);
      assert.equal(init.redirect,'error');assert.equal(init.cache,'no-store');assert.equal(init.credentials,'omit');
      return response();
    };
    const report=await module.readFixedStorageUploadLog20261013();
    assert.equal(report.requestStatus,expected,label);assert.equal(report.rowCount,rowCount,label);
    assert.equal(report.privatePayloadLogged,false);
    assert.deepEqual(Object.keys(report).sort(),['httpStatus','kind','pairs','privatePayloadLogged','requestStatus','rowCount','schemaVersion']);
    if(rowCount===null)assert.equal(report.pairs,null,'No partially approved rows in a format refusal');
    assert.doesNotMatch(JSON.stringify(report),/PRIVATE_RAW|synthetic-fixed-storage|Bearer|subject_hash|query_text|2026-10-13|sha256|afqhhdr|timestamp|objectPath|error\.message/);
    assert.equal(requests,1,'Exactly one controlled GET, no retry');
    assert.equal((await module.readFixedStorageUploadLog20261013()).requestStatus,'LOG_READ_ALREADY_CONSUMED');
    assert.equal(requests,1);
  }
  const module=await import('./read-fixed-storage-upload-log-20261013.mjs?offline_fixed_case=arguments');
  let calls=0;globalThis.fetch=async()=>{calls++;throw Error('MUST_NOT_RUN');};
  assert.equal((await module.readFixedStorageUploadLog20261013({sql:'arbitrary'})).requestStatus,'LOG_ARGUMENTS_FORBIDDEN');
  assert.equal(calls,0);
  delete process.env.SUPABASE_ACCESS_TOKEN;
  assert.equal((await module.readFixedStorageUploadLog20261013()).requestStatus,'LOG_CREDENTIAL_UNAVAILABLE');
  assert.equal(calls,0);
  assert.equal((await module.readFixedStorageUploadLog20261013()).requestStatus,'LOG_READ_ALREADY_CONSUMED');
} finally {globalThis.fetch=savedFetch;delete process.env.SUPABASE_ACCESS_TOKEN;}
console.log(JSON.stringify({status:'PASS',normalReaderFixtures:fixtures.length,controlledGETs:totalRequests,
  realNetwork:0,retry:0,rawPayloadOutput:false,actualBodyDeadlineMs:10000,hostedSchemaProved:false}));
