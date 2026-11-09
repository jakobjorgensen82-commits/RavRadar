import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { createR2PrivateRuntimeStorage,withR2PrivateRuntimeCapacityDeadline } from './lib/r2-private-runtime-storage.mjs';
import {mock} from 'node:test';
import { createR2PrivateReadDenialStorage } from './lib/r2-private-read-denial-storage.mjs';

const sha256 = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const objects = new Map();
const calls = [];
const accountId = 'a'.repeat(32);
const bucketId = 'ravradar-private-production-runtime';
const object = Buffer.from('exact private runtime test bytes');
const digest = sha256(object);
const objectPath = `bundles/sha256/${digest}/part-000-${digest}.json.gz.part`;

function listing() {
  const entries = [...objects].map(([key, bytes]) =>
    `<Contents><Key>${key}</Key><Size>${bytes.length}</Size></Contents>`).join('');
  return `<?xml version="1.0"?><ListBucketResult><KeyCount>${objects.size}</KeyCount>`
    + `${entries}<IsTruncated>false</IsTruncated></ListBucketResult>`;
}

async function fakeFetch(url, options = {}) {
  const address = new URL(url);
  const method = options.method ?? 'GET';
  const headers = new Headers(options.headers);
  calls.push({ address, method, headers });
  assert.equal(address.host, `${accountId}.eu.r2.cloudflarestorage.com`);
  const signed = headers.has('authorization');
  if (signed) {
    assert.match(headers.get('authorization'),
      /^AWS4-HMAC-SHA256 Credential=synthetic-id\/[0-9]{8}\/auto\/s3\/aws4_request, SignedHeaders=.*?, Signature=[0-9a-f]{64}$/);
    assert.match(headers.get('x-amz-content-sha256'), /^[0-9a-f]{64}$/);
  }
  if (method === 'HEAD' && address.pathname === `/${bucketId}`) {
    return new Response(null, { status: 200 });
  }
  if (address.searchParams.get('list-type') === '2') {
    return new Response(listing(), { status: 200 });
  }
  const key = decodeURIComponent(address.pathname.slice(`/${bucketId}/`.length));
  if (!signed) return new Response('', { status: 403 });
  if (method === 'HEAD') {
    return new Response(null, { status: objects.has(key) ? 200 : 404 });
  }
  if (method === 'PUT') {
    assert.equal(headers.get('if-none-match'), '*');
    if (objects.has(key)) return new Response('', { status: 412 });
    objects.set(key, Buffer.from(options.body));
    return new Response('', { status: 200 });
  }
  if (method === 'DELETE') {
    objects.delete(key);
    return new Response(null, { status: 204 });
  }
  if (method === 'GET' && objects.has(key)) {
    const bytes = objects.get(key);
    return new Response(bytes, {
      status: 200, headers: { 'content-length': String(bytes.length) },
    });
  }
  return new Response('', { status: 404 });
}

const client = createR2PrivateRuntimeStorage({
  accountId,
  accessKeyId: 'synthetic-id',
  secretAccessKey: 'synthetic-secret',
  bucketId,
  maximumObjectBytes: 50,
  bucketCeilingBytes: 100,
  fetchImpl: fakeFetch,
  now: () => new Date('2026-09-26T00:00:00.000Z'),
  delayImpl: async () => {},
});
await client.ensurePrivateBucket();
assert.deepEqual(await client.bucketUsage(), { usedBytes: 0, objectCount: 0 });
assert.deepEqual(await client.uploadImmutable(objectPath, object), { created: true });
assert.equal((await client.download(objectPath)).equals(object), true);
assert.deepEqual(await client.uploadImmutable(objectPath, object),
  { created: false, alreadyExists: true });
assert.equal(await client.anonymousStatus(objectPath), 403);
assert.deepEqual(await client.bucketUsage(), {
  usedBytes: object.length, objectCount: 1,
});
assert.equal(calls.some(call => call.method === 'GET'
  && call.headers.get('range') === 'bytes=0-0'
  && !call.headers.has('authorization')), true);
await assert.rejects(client.uploadImmutable('../escape', object), /object path is invalid/);
await assert.rejects(client.uploadImmutable(objectPath, Buffer.alloc(51)), /object bound/);
await client.removeExact(objectPath);
assert.deepEqual(await client.bucketUsage(), { usedBytes: 0, objectCount: 0 });

const fullBucketClient = createR2PrivateRuntimeStorage({
  accountId,
  accessKeyId: 'synthetic-id',
  secretAccessKey: 'synthetic-secret',
  bucketId,
  maximumObjectBytes: 50,
  bucketCeilingBytes: 50,
  fetchImpl: async (url, options) => {
    if (options.method === 'HEAD') return new Response(null, { status: 404 });
    if (options.method === 'GET' && new URL(url).searchParams.has('list-type')) {
      return new Response('<?xml version="1.0"?><ListBucketResult>'
        + '<Contents><Key>existing</Key><Size>49</Size></Contents>'
        + '<KeyCount>1</KeyCount><IsTruncated>false</IsTruncated></ListBucketResult>');
    }
    throw new Error('a full bucket must not reach the upload');
  },
  now: () => new Date('2026-09-26T00:00:00.000Z'),
});
await assert.rejects(fullBucketClient.uploadImmutable(objectPath, object), /safety ceiling/);

let interruptedReadCount = 0;
const interruptedClient = createR2PrivateRuntimeStorage({
  accountId,
  accessKeyId: 'synthetic-id',
  secretAccessKey: 'synthetic-secret',
  bucketId,
  maximumObjectBytes: 50,
  bucketCeilingBytes: 100,
  fetchImpl: async () => {
    interruptedReadCount += 1;
    if (interruptedReadCount === 1) {
      return new Response(new ReadableStream({
        start(controller) {
          controller.enqueue(new Uint8Array([1]));
          controller.error(new Error('synthetic interrupted R2 body'));
        },
      }), { status: 200 });
    }
    return new Response(object, { status: 200 });
  },
  now: () => new Date('2026-09-26T00:00:00.000Z'),
  delayImpl: async () => {},
});
assert.equal((await interruptedClient.download(objectPath)).equals(object), true);
assert.equal(interruptedReadCount, 2);
// Actual bounded R2 error-envelope shape; contains no object bytes or account data.
const authorizationXml = '<?xml version="1.0" encoding="UTF-8"?><Error><Code>InvalidArgument</Code><Message>Authorization</Message></Error>';
async function probeDenial({status=400,body=Buffer.from(authorizationXml),headers={'content-type':'application/xml'},legacy=false}={}) {
  let requests=0,pulls=0,cancels=0,delays=0;
  const storage=createR2PrivateReadDenialStorage({accountId,accessKeyId:'synthetic-id',secretAccessKey:'synthetic-secret',bucketId,
    maximumObjectBytes:50,bucketCeilingBytes:100,delayImpl:async()=>{delays++;},fetchImpl:async(url,options)=>{
      requests++;assert.equal(options.method,'GET');assert.equal(options.redirect,'manual');
      assert.equal(new Headers(options.headers).get('range'),'bytes=0-0');assert.equal(new Headers(options.headers).has('authorization'),false);
      assert.equal(new URL(url).pathname,`/${bucketId}/${objectPath}`);
      let sent=false;const stream=new ReadableStream({pull(controller){pulls++;if(!sent){sent=true;controller.enqueue(body);}else controller.close();},cancel(){cancels++;}},{highWaterMark:0});
      return new Response(stream,{status,headers});
    }});
  const result=legacy?await storage.anonymousStatus(objectPath):await storage.anonymousReadDenial(objectPath);
  return{result,requests,pulls,cancels,delays};
}
assert.equal(Buffer.byteLength(authorizationXml),113);
const qualified=await probeDenial();assert.deepEqual(qualified.result,{kind:'R2_ANONYMOUS_READ_DENIAL_V1',httpStatus:400,denied:true,reason:'R2_S3_AUTHORIZATION_REQUIRED'});
const legacy400=await probeDenial({legacy:true});assert.equal(legacy400.result,400);assert.equal(legacy400.pulls,0);assert.equal(legacy400.cancels,1);
for(const status of [401,403,404]){const p=await probeDenial({status});assert.equal(p.result.denied,true);assert.equal(p.result.httpStatus,status);assert.equal(p.pulls,0);assert.equal(p.cancels,1);}
for(const status of [200,206,302,500,503]){const p=await probeDenial({status});assert.equal(p.result.denied,false);assert.equal(p.result.httpStatus,status);assert.equal(p.pulls,0);assert.equal(p.cancels,status===503?2:1);assert.equal(p.requests,status===503?2:1);assert.equal(p.delays,status===503?1:0);}
for(const body of [
  authorizationXml.replace('Authorization','Other'),authorizationXml.replace('</Error>','<Extra/></Error>'),
  authorizationXml.replace('<Message>','<Code>InvalidArgument</Code><Message>'),
  '<!DOCTYPE Error [<!ENTITY x "Authorization">]><Error><Code>InvalidArgument</Code><Message>&x;</Message></Error>',
  authorizationXml+'garbage',Buffer.from([0xff]),Buffer.alloc(4097,32),
  '\ufeff'+authorizationXml,authorizationXml.replace('<Code>','\u00a0<Code>'),
]){const p=await probeDenial({body:Buffer.isBuffer(body)?body:Buffer.from(body)});assert.equal(p.result.denied,false);assert.equal(p.result.httpStatus,400);}
for(const headers of [{'content-type':'text/plain'},{'content-type':'application/xml','content-length':'4097'}]){const p=await probeDenial({headers});assert.equal(p.result.denied,false);assert.equal(p.pulls,0);assert.equal(p.cancels,1);}
console.log('Private EU R2 object, immutability, typed bounded read denial, legacy status and quota ceiling: passed.');

// The normal read-only prewrite path never invokes an upload, removal or pointer.
const capacityDescriptor = {index:0, objectPath, objectSha256:digest, objectBytes:object.length};
const capacityClient = createR2PrivateRuntimeStorage({accountId,accessKeyId:'synthetic-id',
  secretAccessKey:'synthetic-secret',bucketId,maximumObjectBytes:50,
  fetchImpl:async(url,options)=>{
    const response=await fakeFetch(url,options);
    if(options.method==='HEAD'&&response.status===200){
      const key=decodeURIComponent(new URL(url).pathname.slice(('/'+bucketId+'/').length));
      return new Response(null,{status:200,headers:{'content-length':String(objects.get(key).length)}});
    }
    return response;
  },now:()=>new Date('2026-09-26T00:00:00.000Z'),delayImpl:async()=>{}});
const capacityCallsStart = calls.length;
const capacityBeforeObjects = [...objects].map(([key,value])=>[key,Buffer.from(value)]);
const emptyCapacity = await capacityClient.inspectImmutableCapacity([capacityDescriptor]);
assert.equal(emptyCapacity.usedBytes,0);assert.equal(emptyCapacity.missingObjectCount,1);
assert.equal(emptyCapacity.missingObjectBytes,object.length);
assert.equal(emptyCapacity.reservedMarginBytes,50_000_000);
assert.equal(emptyCapacity.ceilingBytes,2_000_000_000);
assert.equal(emptyCapacity.projectedPeakBytes,50_000_000+object.length);
assert(calls.slice(capacityCallsStart).every(call=>['GET','HEAD'].includes(call.method)));
assert.deepEqual([...objects],capacityBeforeObjects);
objects.set(objectPath,Buffer.from(object));
const reusedCapacity = await capacityClient.inspectImmutableCapacity([capacityDescriptor]);
assert.equal(reusedCapacity.usedBytes,object.length);
assert.equal(reusedCapacity.missingObjectBytes,0);assert.equal(reusedCapacity.missingObjectCount,0);
assert.equal(reusedCapacity.projectedPeakBytes,object.length+50_000_000);
const beforeInvalidCalls = calls.length;
let capacityAccessorReads=0;
const accessorDescriptor=Object.defineProperty({...capacityDescriptor},'objectBytes',
  {get(){capacityAccessorReads++;return object.length;}});
for (const invalid of [[],[capacityDescriptor,capacityDescriptor],
  [{...capacityDescriptor,index:1}],[{...capacityDescriptor,objectPath:'../escape'}],
  [{...capacityDescriptor,objectBytes:0}],[{...capacityDescriptor,objectBytes:51}],
  [{...capacityDescriptor,objectSha256:'f'.repeat(64)}],[{...capacityDescriptor,unknown:true}],
  [accessorDescriptor]]) {
  await assert.rejects(capacityClient.inspectImmutableCapacity(invalid));
}
assert.equal(calls.length,beforeInvalidCalls,'Invalid descriptor lists must stop before HTTP');
assert.equal(capacityAccessorReads,0,'Accessor input must be rejected before reading caller fields');
objects.delete(objectPath);
async function capacityReadFixture({usedBytes=0,status=404,declared=null}={}) {
  const methods=[];
  const storage=createR2PrivateRuntimeStorage({accountId,accessKeyId:'synthetic-id',
    secretAccessKey:'synthetic-secret',bucketId,maximumObjectBytes:50,delayImpl:async()=>{},
    fetchImpl:async(url,options)=>{
      methods.push(options.method);
      if(options.method==='HEAD')return new Response(null,{status,
        headers:declared===null?{}:{'content-length':declared}});
      assert.equal(options.method,'GET','A prewrite capacity read must never mutate storage');
      assert.equal(new URL(url).searchParams.get('list-type'),'2');
      return new Response('<ListBucketResult><KeyCount>1</KeyCount>'
        +'<Contents><Key>retained-original</Key><Size>'+usedBytes+'</Size></Contents>'
        +'<IsTruncated>false</IsTruncated></ListBucketResult>',{status:200});
    }});
  return {storage,methods};
}
const exactLimit=await capacityReadFixture({usedBytes:2_000_000_000-50_000_000-object.length});
assert.equal((await exactLimit.storage.inspectImmutableCapacity([capacityDescriptor])).remainingBytesAfterMargin,0);
const overLimit=await capacityReadFixture({usedBytes:2_000_000_000-50_000_000-object.length+1});
await assert.rejects(overLimit.storage.inspectImmutableCapacity([capacityDescriptor]),/prewrite capacity/);
assert(overLimit.methods.every(method=>['GET','HEAD'].includes(method)));
for(const [status,declared] of [[403,null],[500,null],[200,null],[200,'garbage'],
  [200,String(object.length+1)],[200,'0'],[206,String(object.length)]]) {
  const bad=await capacityReadFixture({status,declared});
  await assert.rejects(bad.storage.inspectImmutableCapacity([capacityDescriptor]));
  assert(!bad.methods.includes('GET'),'Unknown HEAD/mismatched immutable size cannot earn missing-byte credit');
}
console.log('Read-only normal R2 prewrite: complete U plus exact missing D and fixed50MB margin; no PUT/delete, dedup, cap boundary and unknown metadata: passed.');

// Exercise the actual fixed phase and actual R2 factory with controlled native
// clock/timer/fetch boundaries. No caller timeout override or Source capability.
async function phaseFixture(run) {
  let elapsed=0, fetchCalls=0;
  const timers=new Map();
  const clock=mock.method(performance,'now',()=>elapsed);
  const set=mock.method(globalThis,'setTimeout',(callback,ms)=>{
    const token={};timers.set(token,{callback,ms});return token;
  });
  const clear=mock.method(globalThis,'clearTimeout',token=>timers.delete(token));
  let transport=async(url,options)=>fakeFetch(url,options);
  const network=mock.method(globalThis,'fetch',async(url,options)=>{
    fetchCalls++;return transport(url,options);
  });
  const state={timers,setElapsed:value=>{elapsed=value;},setTransport:value=>{transport=value;},
    get fetchCalls(){return fetchCalls;},
    fireDeadline(){elapsed=60_000;const row=[...timers].find(([,value])=>value.ms===60_000);
      assert(row,'The actual fixed phase must own one60s timer');timers.delete(row[0]);row[1].callback();}};
  try {await run(state);assert.equal(timers.size,0,'All phase and retry timers must be released');}
  finally {network.mock.restore();clear.mock.restore();set.mock.restore();clock.mock.restore();}
}
const phaseStorage=phase=>createR2PrivateRuntimeStorage({accountId,accessKeyId:'synthetic-id',
  secretAccessKey:'synthetic-secret',bucketId,maximumObjectBytes:50,
  fetchImpl:phase.fetchImpl,delayImpl:phase.delayImpl,now:()=>new Date('2026-09-26T00:00:00.000Z')});
await phaseFixture(async state=>{
  const objectBefore=Buffer.from(object), descriptorBefore=JSON.stringify(capacityDescriptor);
  let phaseSignal;
  state.setTransport(async(url,options)=>{phaseSignal=options.signal;return fakeFetch(url,options);});
  const result=await withR2PrivateRuntimeCapacityDeadline(async phase=>
    phaseStorage(phase).inspectImmutableCapacity([capacityDescriptor]));
  assert.equal(result.missingObjectBytes,object.length);assert.equal(state.fetchCalls,2);
  assert(phaseSignal instanceof AbortSignal);assert.equal(phaseSignal.aborted,true,'Settled phase releases its signal');
  assert.deepEqual(object,objectBefore);assert.equal(JSON.stringify(capacityDescriptor),descriptorBefore);
});
await phaseFixture(async state=>{
  await assert.rejects(withR2PrivateRuntimeCapacityDeadline(async()=>{
    // A blocked local pack/event loop cannot silently move the deadline forward.
    state.setElapsed(60_001);return 'late local pack result';
  }),{code:'R2_PRIVATE_RUNTIME_CAPACITY_TIMEOUT'});
  assert.equal(state.fetchCalls,0,'Expired packing must not enter R2 reads');
});
await phaseFixture(async state=>{
  let active=0, phaseSignal;
  state.setTransport(async(_url,options)=>new Promise((_resolve,reject)=>{
    active++;phaseSignal=options.signal;
    options.signal.addEventListener('abort',()=>{active--;reject(options.signal.reason);},{once:true});
  }));
  const work=withR2PrivateRuntimeCapacityDeadline(async phase=>
    phaseStorage(phase).inspectImmutableCapacity([capacityDescriptor]));
  assert.equal(active,1);state.fireDeadline();
  await assert.rejects(work,{code:'R2_PRIVATE_RUNTIME_CAPACITY_TIMEOUT'});
  assert.equal(active,0);assert.equal(phaseSignal.aborted,true);assert.equal(state.fetchCalls,1);
});
await phaseFixture(async state=>{
  let activeBody=0, signal;let bodyReading;
  const reading=new Promise(resolve=>{bodyReading=resolve;});
  state.setTransport(async(_url,options)=>{
    signal=options.signal;
    if(options.method==='HEAD')return new Response(null,{status:404});
    assert.equal(options.method,'GET');activeBody++;
    return new Response(new ReadableStream({
      start(controller){signal.addEventListener('abort',()=>{
        activeBody--;controller.error(signal.reason);
      },{once:true});},
      pull(){bodyReading();},
    },{highWaterMark:0}),{status:200});
  });
  const work=withR2PrivateRuntimeCapacityDeadline(async phase=>
    phaseStorage(phase).inspectImmutableCapacity([capacityDescriptor]));
  await reading;assert.equal(activeBody,1);state.fireDeadline();
  await assert.rejects(work,{code:'R2_PRIVATE_RUNTIME_CAPACITY_TIMEOUT'});
  assert.equal(activeBody,0);assert.equal(signal.aborted,true);assert.equal(state.fetchCalls,2);
});
await phaseFixture(async state=>{
  state.setTransport(async()=>new Response(null,{status:503}));
  const work=withR2PrivateRuntimeCapacityDeadline(async phase=>
    phaseStorage(phase).inspectImmutableCapacity([capacityDescriptor]));
  for(let i=0;i<20&&![...state.timers.values()].some(value=>value.ms===1000);i++)await Promise.resolve();
  assert([...state.timers.values()].some(value=>value.ms===1000),'Actual retry must enter its abortable wait');
  state.fireDeadline();await assert.rejects(work,{code:'R2_PRIVATE_RUNTIME_CAPACITY_TIMEOUT'});
  assert.equal(state.fetchCalls,1,'An aborted retry wait must never start another HTTP request');
});
console.log('Fixed60s capacity phase: real factory HEAD/body/list abort, retry timer cleanup, late local pack refusal and unchanged immutable objects: passed.');
