import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import test from 'node:test';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { createR2PrivateRuntimeStorage } from './lib/r2-private-runtime-storage.mjs';
import { createR2PrivateReadDenialStorage } from './lib/r2-private-read-denial-storage.mjs';
import { assertNormalStagePublication } from './test-ordinary-completed-stage-admission.mjs';
import { createPrivateWeatherPublicationStorage, assertPrivateWeatherPublicationPolicy,
  PRIVATE_WEATHER_PUBLICATION_POLICY, assertPrivateWeatherPublicationBackend,
  privateWeatherPublicationArguments } from './publish-private-weather-runtime.mjs';

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

test('weather publication has one internal weather-only budget and no override route', () => {
  assert.deepEqual(PRIVATE_WEATHER_PUBLICATION_POLICY, { bucketCeilingBytes: 2_500_000_000, reserveBytes: 100_000_000 });
  assert(Object.isFrozen(PRIVATE_WEATHER_PUBLICATION_POLICY));
  for (const policy of [null, {}, { bucketCeilingBytes: null, reserveBytes: 100_000_000 },
    { bucketCeilingBytes: 2_500_000_000.5, reserveBytes: 100_000_000 },
    { bucketCeilingBytes: 3_000_000_001, reserveBytes: 100_000_000 },
    { bucketCeilingBytes: 400_000_000, reserveBytes: 100_000_000 },
    { bucketCeilingBytes: 2_500_000_000, reserveBytes: -1 },
    { ...PRIVATE_WEATHER_PUBLICATION_POLICY, extra: true }]) {
    assert.throws(() => assertPrivateWeatherPublicationPolicy(policy), { code: 'PRIVATE_WEATHER_PUBLICATION_POLICY_INVALID' });
  }
  for (const key of ['bucketCeilingBytes', 'bucketId', 'maximumObjectBytes', 'policy']) {
    assert.throws(() => createPrivateWeatherPublicationStorage({ [key]: 'override' }),
      { code: 'PRIVATE_WEATHER_PUBLICATION_OPTION_INVALID' });
  }
  for (const backend of ['supabase', '', 'other', null]) assert.throws(() => assertPrivateWeatherPublicationBackend(backend),
    { code: 'PRIVATE_WEATHER_PUBLICATION_BACKEND_MISMATCH' });
  assertPrivateWeatherPublicationBackend('r2');
  const argv = ['--publish', '--private-root', '/private', '--bundle', '/private/bundle',
    '--repository-root', '/repository', '--expected', '/expected.json', '--source-head', 'a'.repeat(40)];
  const parsed = privateWeatherPublicationArguments(argv);
  assert.deepEqual(parsed, { privateRoot: '/private', bundlePath: '/private/bundle',
    repositoryRoot: '/repository', expectedPath: '/expected.json', sourceHead: 'a'.repeat(40) });
  assert.deepEqual(privateWeatherPublicationArguments([...argv, '--same-reference-migration-report', '/migration.json',
    '--same-reference-predecessor-manifest', '/predecessor.json']),
  { ...parsed, migrationReportPath: '/migration.json', predecessorManifestPath: '/predecessor.json' });
  for (const values of [[], argv.slice(0, -2), [...argv, '--source-head', 'b'.repeat(40)],
    [...argv, '--bucket-ceiling-bytes', '9000000000'], [...argv, '--same-reference-migration-report', '/migration.json']])
    assert.throws(() => privateWeatherPublicationArguments(values), { code: 'PRIVATE_WEATHER_PUBLICATION_ARGUMENT_INVALID' });
});

test('weather publication admits the whole generation before first PUT and keeps idempotent HEAD/readback', async () => {
  const make = ({ used, existing = false, loseFirstPut = false }) => {
    const store = new Map(existing ? [[objectPath, object]] : []), observed = [];
    let puts = 0;
    const fetchImpl = async (url, request) => {
      const u = new URL(url), headers = new Headers(request.headers);
      assert.equal(u.host, `${accountId}.eu.r2.cloudflarestorage.com`);
      assert.equal(request.redirect, 'manual');
      observed.push({ url, request });
      if (request.method === 'GET' && u.searchParams.get('list-type') === '2') {
        const bytes = used + [...store.values()].reduce((n, value) => n + value.length, 0);
        return new Response(`<ListBucketResult><Contents><Key>preserved</Key><Size>${bytes}</Size></Contents><KeyCount>1</KeyCount><IsTruncated>false</IsTruncated></ListBucketResult>`);
      }
      const key = decodeURIComponent(u.pathname.slice(`/${bucketId}/`.length));
      if (request.method === 'HEAD') return new Response(null, { status: store.has(key) ? 200 : 404 });
      if (request.method === 'PUT') {
        puts++;
        assert.equal(key, objectPath);
        assert.equal(request.body, object, 'The same caller Buffer reaches the unchanged immutable transport.');
        assert.equal(headers.get('if-none-match'), '*');
        assert.equal(headers.get('x-amz-content-sha256'), digest);
        if (store.has(key)) return new Response(null, { status: 412 });
        store.set(key, Buffer.from(request.body));
        if (loseFirstPut) throw new Error('synthetic lost PUT response after immutable commit');
        return new Response(null, { status: 200 });
      }
      if (request.method === 'GET' && store.has(key)) return new Response(store.get(key));
      throw new Error('unexpected synthetic R2 operation');
    };
    const storage = createPrivateWeatherPublicationStorage({ storageBackend: 'r2', accountId, accessKeyId: 'synthetic-id',
      secretAccessKey: 'synthetic-secret', fetchImpl, now: () => new Date('2026-11-14T00:00:00Z'), delayImpl: async () => {} });
    return { storage, observed, puts: () => puts };
  };
  for (const used of [1_734_856_529, 2_050_000_000]) {
    const probe = make({ used });
    assert.deepEqual(await probe.storage.uploadImmutable(objectPath, object), { created: true });
    assert.equal(probe.puts(), 1);
    assert.deepEqual(await probe.storage.download(objectPath), object);
    const firstPut = probe.observed.findIndex(row => row.request.method === 'PUT');
    assert.equal(probe.observed.slice(0, firstPut).filter(row => new URL(row.url).searchParams.has('list-type')).length, 2,
      'The frozen per-part check and the one whole-generation admission both precede PUT.');
    const lists = probe.observed.filter(row => new URL(row.url).searchParams.has('list-type')).length;
    assert.deepEqual(await probe.storage.uploadImmutable(objectPath, object), { created: false, alreadyExists: true });
    assert.equal(probe.observed.filter(row => new URL(row.url).searchParams.has('list-type')).length, lists);
  }
  const held = make({ used: 2_050_000_001 });
  await assert.rejects(held.storage.uploadImmutable(objectPath, object), error =>
    error.cause?.code === 'PRIVATE_WEATHER_PUBLICATION_GENERATION_CAPACITY');
  assert.equal(held.puts(), 0);
  assert.equal(held.observed.filter(row => new URL(row.url).searchParams.has('list-type')).length, 2,
    'Rejected admission is latched across the frozen adapter retry; no extra scan or PUT.');
  const reused = make({ used: 2_490_000_000, existing: true });
  assert.deepEqual(await reused.storage.uploadImmutable(objectPath, object), { created: false, alreadyExists: true });
  assert.deepEqual(await reused.storage.download(objectPath), object);
  assert.equal(reused.puts(), 0);
  assert.equal(reused.observed.some(row => new URL(row.url).searchParams.has('list-type')), false);
  const unknown = make({ used: 1_734_856_529, loseFirstPut: true });
  assert.deepEqual(await unknown.storage.uploadImmutable(objectPath, object), { created: false, alreadyExists: true });
  assert.deepEqual(await unknown.storage.download(objectPath), object);
  assert.equal(unknown.puts(), 2, 'Only the frozen adapter\'s existing immutable retry is retained; no outer retry.');
  assert.equal(unknown.observed.filter(row => new URL(row.url).searchParams.has('list-type')).length, 2);
});

test('weather publication CLI rejects backend mismatch and metadata failures without raw error text', async t => {
  const parent = await fs.realpath(os.tmpdir());
  const root = await fs.mkdtemp(path.join(parent, 'rr-weather-publication-metadata-'));
  t.after(async () => {
    assert.equal(path.dirname(root), parent);
    assert(path.basename(root).startsWith('rr-weather-publication-metadata-'));
    assert((await fs.lstat(root)).isDirectory());
    await fs.rm(root, { recursive: true, force: false });
  });
  const expected = path.join(root, 'expected.json'), migration = path.join(root, 'migration.json'), predecessor = path.join(root, 'predecessor.json');
  const args = [fileURLToPath(new URL('./publish-private-weather-runtime.mjs', import.meta.url)), '--publish',
    '--private-root', root, '--bundle', path.join(root, 'bundle'), '--repository-root', root,
    '--expected', expected, '--source-head', 'a'.repeat(40)];
  const env = Object.fromEntries(['PATH', 'Path', 'SystemRoot', 'WINDIR', 'HOME', 'USERPROFILE', 'TEMP', 'TMP']
    .filter(key => typeof process.env[key] === 'string').map(key => [key, process.env[key]]));
  const run = (backend, extra = []) => spawnSync(process.execPath, [...args, ...extra],
    { env: { ...env, RAVRADAR_PRIVATE_RUNTIME_STORAGE_BACKEND: backend }, encoding: 'utf8', windowsHide: true });
  let result = run('supabase');
  assert.equal(result.status, 1);
  assert.equal(result.stderr.trim(), 'Protected private production runtime failed closed: PRIVATE_WEATHER_PUBLICATION_BACKEND_MISMATCH');
  const malformed = '{"SYNTHETIC_PRIVATE_MARKER":';
  for (const [file, role] of [[expected, 'EXPECTED'], [migration, 'MIGRATION_REPORT'], [predecessor, 'PREDECESSOR_MANIFEST']]) {
    for (const target of [expected, migration, predecessor]) await fs.writeFile(target, '{}');
    await fs.writeFile(file, malformed);
    result = run('r2', file === expected ? [] : ['--same-reference-migration-report', migration,
      '--same-reference-predecessor-manifest', predecessor]);
    assert.equal(result.status, 1);
    assert.equal(result.stdout, '');
    assert.equal(result.stderr.trim(), `Protected private production runtime failed closed: PRIVATE_WEATHER_PUBLICATION_${role}_INVALID`);
    assert.equal(await fs.readFile(file, 'utf8'), malformed);
  }
});

test('weather publication normal GCM/B/atomic install/recreated B and parent CAS', assertNormalStagePublication);
