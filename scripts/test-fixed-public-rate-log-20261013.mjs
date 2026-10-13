import assert from 'node:assert/strict';
// Existing fixed historical-reader fixture style, one new bounded interval.
// Every fresh import below is an offline case, never a grant for a live repeat.
assert.equal(Object.hasOwn(process.env,'SUPABASE_ACCESS_TOKEN'),false,
  'Do not read or replace an ambient Management credential in an offline target');
const savedFetch=globalThis.fetch;
process.env.SUPABASE_ACCESS_TOKEN='synthetic-fixed-reader-NOT-A-CREDENTIAL';
const valid=result=>new Response(JSON.stringify({result,error:null}),{status:200});
const sample={status:403,error_code:'42501'};
const fixtures=[
  ['categories',()=>valid([sample,{status:null,error_code:'57014'},{status:401,error_code:'PGRST301'}]),'RECORDED_CATEGORIES',3],
  ['empty',()=>valid([]),'NO_MATCHING_RECORDED_EVENTS',0],
  ['unknown-recorded',()=>valid([{status:null,error_code:'NOT_RECORDED'},{status:503,error_code:'UNRECOGNIZED_CODE'}]),'RECORDED_CATEGORIES',2],
  ['utf8',()=>new Response(Uint8Array.from([0xff]),{status:200}),'LOG_UTF8_INVALID',null],
  ['json',()=>new Response('{PRIVATE_RAW_INVALID',{status:200}),'LOG_JSON_INVALID',null],

  ['array-envelope',()=>new Response('[]',{status:200}),'LOG_ENVELOPE_SHAPE',null,
    {topType:'ARRAY',keyProfile:'NOT_OBJECT',resultType:'ABSENT',errorType:'ABSENT'}],
  ['null-envelope',()=>new Response('null',{status:200}),'LOG_ENVELOPE_SHAPE',null,
    {topType:'NULL',keyProfile:'NOT_OBJECT',resultType:'ABSENT',errorType:'ABSENT'}],
  ['string-envelope',()=>new Response(JSON.stringify('PRIVATE_RAW_BODY'),{status:200}),'LOG_ENVELOPE_SHAPE',null,
    {topType:'STRING',keyProfile:'NOT_OBJECT',resultType:'ABSENT',errorType:'ABSENT'}],
  ['result-absent',()=>new Response(JSON.stringify({error:null}),{status:200}),'LOG_ENVELOPE_SHAPE',null,
    {topType:'OBJECT',keyProfile:'ERROR_ONLY',resultType:'ABSENT',errorType:'NULL'}],
  ['error-absent',()=>new Response(JSON.stringify({result:[]}),{status:200}),'LOG_ENVELOPE_SHAPE',null,
    {topType:'OBJECT',keyProfile:'RESULT_ONLY',resultType:'ARRAY',errorType:'ABSENT'}],
  ['pair-plus-extra',()=>new Response(JSON.stringify({result:[],error:null,PRIVATE_RAW_KEY:'PRIVATE_RAW_BODY'}),{status:200}),'LOG_ENVELOPE_SHAPE',null,
    {topType:'OBJECT',keyProfile:'PAIR_WITH_EXTRAS',resultType:'ARRAY',errorType:'NULL'}],
  ['other-fields',()=>new Response(JSON.stringify({data:[],PRIVATE_RAW_KEY:'PRIVATE_RAW_BODY'}),{status:200}),'LOG_ENVELOPE_SHAPE',null,
    {topType:'OBJECT',keyProfile:'OTHER_FIELDS_ONLY',resultType:'ABSENT',errorType:'ABSENT'}],
  ['empty-object',()=>new Response('{}',{status:200}),'LOG_ENVELOPE_SHAPE',null,
    {topType:'OBJECT',keyProfile:'EMPTY_OBJECT',resultType:'ABSENT',errorType:'ABSENT'}],
  ['envelope',()=>new Response(JSON.stringify({data:[],error:null,PRIVATE_RAW_KEY:'PRIVATE_RAW_BODY'}),{status:200}),'LOG_ENVELOPE_SHAPE',null],
  ['error-type',()=>new Response(JSON.stringify({result:[],error:{PRIVATE_RAW_KEY:'PRIVATE_RAW_BODY'}}),{status:200}),'LOG_ERROR_FIELD_TYPE',null],
  ['query-error',()=>new Response(JSON.stringify({result:[],error:'PRIVATE_RAW_QUERY_ERROR'}),{status:200}),'LOG_QUERY_ERROR',null],
  ['result-type',()=>new Response(JSON.stringify({result:{PRIVATE_RAW_KEY:1},error:null}),{status:200}),'LOG_RESULT_TYPE',null],
  ['row-shape',()=>valid([{status:403,error_code:'42501',PRIVATE_RAW_KEY:'PRIVATE_RAW_BODY'}]),'LOG_ROW_SHAPE',null],
  ['status-type',()=>valid([{status:'PRIVATE_RAW_STATUS',error_code:'NOT_RECORDED'}]),'LOG_STATUS_TYPE',null],
  ['status-range',()=>valid([{status:600,error_code:'NOT_RECORDED'}]),'LOG_STATUS_RANGE',null],
  ['code-type',()=>valid([{status:null,error_code:{PRIVATE_RAW_KEY:1}}]),'LOG_CODE_TYPE',null],
  ['code-unknown',()=>valid([{status:403,error_code:'PRIVATE_RAW_ERROR'}]),'LOG_CODE_NOT_ALLOWED',null],
  ['pg-gateway-code',()=>valid([{status:null,error_code:'UNAUTHORIZED_MISSING_API_KEY'}]),'LOG_CODE_NOT_ALLOWED',null],
  ['missing-fields',()=>valid([{status:null,error_code:'LOG_FIELDS_UNAVAILABLE'}]),'LOG_FIELDS_UNAVAILABLE',null],
  ['duplicate',()=>valid([sample,sample]),'LOG_CATEGORY_DUPLICATE',null],
  ['row-cap',()=>valid(Array(8).fill(sample)),'LOG_ROW_CAP_REACHED',null],
  ['http',()=>new Response('PRIVATE_RAW_HTTP_BODY',{status:503}),'LOG_HTTP_REJECTED',null],
  ['length-shape',()=>new Response('PRIVATE_RAW_BODY',{status:200,headers:{'content-length':'invalid'}}),'LOG_CONTENT_LENGTH_SHAPE',null],
  ['oversize',()=>new Response(new Uint8Array(32769),{status:200}),'LOG_BODY_TOO_LARGE',null],
  ['transport',()=>{throw Error('PRIVATE_RAW_TRANSPORT');},'LOG_TRANSPORT_ERROR',null],
  ['held-body',()=>new Response(new ReadableStream({start(){}}),{status:200}),'LOG_DEADLINE_EXCEEDED',null],
];
let totalRequests=0;
try {
  for(const[label,response,expected,rowCount,diagnostic]of fixtures) {
    const module=await import('./read-fixed-public-rate-log-20261013.mjs?offline_fixed_case='+label);
    let requests=0;
    globalThis.fetch=async(url,init)=>{
      requests++;totalRequests++;
      assert.equal(url.origin,'https://api.supabase.com');
      assert.equal(url.pathname,'/v1/projects/afqhhdrkjfjtpadntdzo/analytics/endpoints/logs');
      assert.deepEqual([...url.searchParams.keys()].sort(),['iso_timestamp_end','iso_timestamp_start','sql']);
      assert.equal(url.searchParams.get('iso_timestamp_start'),'2026-10-13T08:41:00Z');
      assert.equal(url.searchParams.get('iso_timestamp_end'),'2026-10-13T08:43:00Z');
      const sql=url.searchParams.get('sql');
      assert.match(sql,/timestamp >= '2026-10-13 08:41:58'/);
      assert.match(sql,/timestamp < '2026-10-13 08:42:09'/);
      assert.match(sql,/SELECT DISTINCT status, error_code/);
      assert.match(sql,/= '\/rest\/v1\/rpc\/consume_public_request_limit'/);
      assert.match(sql,/LIMIT 8$/);
      assert.doesNotMatch(sql,/SELECT\s+\*|2026-10-12|functions\/v1\/ravradar-assistant/);
      assert.equal(init.method,'GET');assert.equal(init.body,undefined);
      assert.equal(init.redirect,'error');assert.equal(init.cache,'no-store');assert.equal(init.credentials,'omit');
      return response();
    };
    const report=await module.readFixedPublicRateLog20261013();
    assert.equal(report.requestStatus,expected,label);assert.equal(report.rowCount,rowCount,label);
    if (diagnostic) {
      assert.equal(typeof module.fixedLogEnvelopeDiagnostic20261013,'function',
        'Shape rejection must retain only a safe structural diagnosis, never guess acceptance');
      const actual=module.fixedLogEnvelopeDiagnostic20261013();
      assert.deepEqual(actual,diagnostic,label);assert.equal(Object.isFrozen(actual),true);
      assert.doesNotMatch(JSON.stringify(actual),/PRIVATE_RAW|synthetic-fixed-reader|Bearer|subject_hash|query_text/);
      const annotation=module.fixedLogEnvelopeAnnotation20261013();
      assert.equal(annotation,'::error title=Fixed Supabase log envelope::code=LOG_ENVELOPE_SHAPE'
        + ' top='+diagnostic.topType+' keys='+diagnostic.keyProfile
        + ' result='+diagnostic.resultType+' error='+diagnostic.errorType);
      assert.doesNotMatch(annotation,/PRIVATE_RAW|synthetic-fixed-reader|Bearer|subject_hash|query_text/);
    }
    assert.equal(report.scope.sqlStart,'2026-10-13T08:41:58Z');
    assert.equal(report.scope.sqlEndExclusive,'2026-10-13T08:42:09Z');
    assert.equal(report.privatePayloadLogged,false);
    assert.deepEqual(Object.keys(report).sort(),['httpStatus','kind','pairs','privatePayloadLogged','projectRef','requestStatus','rowCount','schemaVersion','scope']);
    if(rowCount===null)assert.equal(report.pairs,null,'No partially approved rows in a format refusal');
    assert.doesNotMatch(JSON.stringify(report),/PRIVATE_RAW|synthetic-fixed-reader|Bearer|subject_hash|user|query_text/);
    assert.equal(requests,1,'Exactly one controlled GET, no retry');
    assert.equal((await module.readFixedPublicRateLog20261013()).requestStatus,'LOG_READ_ALREADY_CONSUMED');
    assert.equal(requests,1);
  }
  const module=await import('./read-fixed-public-rate-log-20261013.mjs?offline_fixed_case=arguments');
  let calls=0;globalThis.fetch=async()=>{calls++;throw Error('MUST_NOT_RUN');};
  assert.equal((await module.readFixedPublicRateLog20261013({sql:'arbitrary'})).requestStatus,'LOG_ARGUMENTS_FORBIDDEN');
  assert.equal(calls,0);
  delete process.env.SUPABASE_ACCESS_TOKEN;
  assert.equal((await module.readFixedPublicRateLog20261013()).requestStatus,'LOG_CREDENTIAL_UNAVAILABLE');
  assert.equal(calls,0);
  assert.equal((await module.readFixedPublicRateLog20261013()).requestStatus,'LOG_READ_ALREADY_CONSUMED');
} finally {globalThis.fetch=savedFetch;delete process.env.SUPABASE_ACCESS_TOKEN;}
console.log(JSON.stringify({status:'PASS',normalReaderFixtures:fixtures.length,controlledGETs:totalRequests,
  realNetwork:0,retry:0,rawPayloadOutput:false,actualBodyDeadlineMs:10000,hostedSchemaProved:false}));
