import assert from 'node:assert/strict';
import test from 'node:test';
import { verifyNativeSamplingIdentityInstalledMigrationMetadata as verify } from './native-sampling-identity-successor-readiness.mjs';
import { REQUIRED_CUTOVER_MIGRATIONS } from './integrated-cutover-readiness.mjs';
import { nativeIdentityMigration } from './lib/native-sampling-identity-successor-source.mjs';

const endpoint = 'https://api.supabase.com/v1/projects/afqhhdrkjfjtpadntdzo/database/query';
const query = 'select version from supabase_migrations.schema_migrations order by version;';
const versions = REQUIRED_CUTOVER_MIGRATIONS.map(row => row.version);
const rows = versions.map(version => ({ version }));
const token = 'synthetic-metadata-fixture-token';
const rejected = /NATIVE_IDENTITY_INSTALLED_MIGRATION_METADATA_REJECTED/;
const response = value => new Response(JSON.stringify(value), { status: 201, headers: { 'content-type': 'application/json' } });

async function call(makeResponse, shouldReject = null) {
  let calls = 0, signal;
  const operation = verify({ accessToken: token, fetchImpl: async (url, options) => {
    calls++;
    assert.equal(url, endpoint);
    assert.equal(options.method, 'POST');
    assert.equal(options.redirect, 'error');
    assert.equal(options.credentials, 'omit');
    assert.equal(options.cache, 'no-store');
    assert.deepEqual(options.headers, { authorization: 'Bearer ' + token, 'content-type': 'application/json' });
    assert.deepEqual(JSON.parse(options.body), { query, read_only: true });
    assert.equal(options.signal.aborted, false);
    signal = options.signal;
    return makeResponse(options);
  } });
  let result;
  if (shouldReject) await assert.rejects(operation, shouldReject);
  else result = await operation;
  assert.equal(calls, 1, 'One fixed read, never retry');
  assert.equal(signal.aborted, true, 'Transport lifetime closed on either result');
  return result;
}

test('actual source list and all normal exact Management envelopes yield metadata only', async () => {
  assert.equal(versions.at(-1), nativeIdentityMigration().version);
  assert(versions.includes('20261013220000') && versions.includes('20261013230000'));
  for (const value of [rows, { result: rows }, { data: rows }]) {
    const report = await call(() => response(value));
    assert.deepEqual(report, { status: 'NATIVE_IDENTITY_INSTALLED_MIGRATION_METADATA_MATCH',
      scope: 'FIXED_REMOTE_VERSION_METADATA_ONLY', migrationCount: rows.length,
      admission: 'NO_ADMISSION', installationPerformed: false, privatePayloadIncluded: false });
    assert(Object.isFrozen(report));
  }
});

test('normal earlier remote history is preserved but never returned as row data', async () => {
  const report = await call(() => response([{ version: '20200101' }, ...rows]));
  assert.equal(report.migrationCount, rows.length + 1);
  assert.equal(Object.hasOwn(report, 'versions'), false);
});

for (const [name, absent] of [['historical required', versions[0]], ['220', '20261013220000'],
  ['230', '20261013230000'], ['NEW', nativeIdentityMigration().version]]) {
  test('missing ' + name + ' remote migration is refused', async () => {
    await call(() => response(rows.filter(row => row.version !== absent)), rejected);
  });
}

for (const [name, extra] of [['unknown later phase', '20261015030000'], ['unknown future', '20990101000000']]) {
  test(name + ' cannot be hidden by the expected installed version', async () => {
    await call(() => response([...rows, { version: extra }]), rejected);
  });
}

test('duplicate and noncanonical versions, extra fields and wrong envelopes fail closed', async () => {
  for (const value of [[...rows, rows[0]], [], null, {}, { result: rows, error: null },
    { data: rows, extra: true }, rows.map((row, i) => i ? row : { ...row, statement: 'NOT_ALLOWED' }),
    rows.map((row, i) => i ? row : { version: Number(row.version) }),
    rows.map((row, i) => i ? row : { version: row.version + '\n' })]) {
    await call(() => response(value), rejected);
  }
});

test('status, redirect, length headers and byte limits are strict', async () => {
  await call(() => new Response(JSON.stringify(rows), { status: 200 }), rejected);
  await call(() => ({ status: 201, redirected: true, headers: new Headers(), body: response(rows).body }), rejected);
  for (const length of ['32769', '-1', 'junk']) {
    await call(() => new Response(JSON.stringify(rows), { status: 201, headers: { 'content-length': length } }), rejected);
  }
  await call(() => new Response(' '.repeat(32769), { status: 201 }), rejected);
  const json = JSON.stringify(rows);
  await call(() => new Response(json + ' '.repeat(32768 - Buffer.byteLength(json)), { status: 201 }));
});

test('streamed byte cap, malformed UTF8 and malformed JSON are refused', async () => {
  await call(() => new Response(new ReadableStream({ start(controller) {
    controller.enqueue(new Uint8Array(16384)); controller.enqueue(new Uint8Array(16385)); controller.close();
  } }), { status: 201 }), rejected);
  await call(() => new Response(new Uint8Array([0xc3, 0x28]), { status: 201 }), { name: 'TypeError' });
  await call(() => new Response('{', { status: 201 }), { name: 'SyntaxError' });
});

test('no caller SQL, project, version, root or deadline override is accepted before fetch', async () => {
  let calls = 0;
  const fetchImpl = async () => { calls++; return response(rows); };
  for (const extra of [{ query: query }, { project: 'other' }, { version: nativeIdentityMigration().version },
    { repositoryRoot: '.' }, { timeoutMs: 1 }, { migrations: versions }]) {
    await assert.rejects(verify({ accessToken: token, fetchImpl, ...extra }), rejected);
  }
  for (const accessToken of ['', ' ', token + '\n']) {
    await assert.rejects(verify({ accessToken, fetchImpl }), rejected);
  }
  await assert.rejects(verify({ accessToken: token, fetchImpl }, {}), rejected);
  assert.equal(calls, 0);
});

test('transport failure remains a single read and never becomes installed proof', async () => {
  const failure = new Error('SYNTHETIC_TRANSPORT_FAILURE');
  await call(() => { throw failure; }, error => error === failure);
});

test('actual fixed 15-second deadline bounds an unresponsive fetch', { timeout: 25_000 }, async () => {
  const started = performance.now();
  await call(() => new Promise(() => {}), /NATIVE_IDENTITY_INSTALLED_MIGRATION_METADATA_DEADLINE/);
  assert(performance.now() - started >= 14_500);
  assert(performance.now() - started < 24_000);
});

test('actual fixed 15-second deadline also bounds an unresponsive response body', { timeout: 25_000 }, async () => {
  const started = performance.now();
  await call(() => new Response(new ReadableStream({ start() {} }), { status: 201 }),
    /NATIVE_IDENTITY_INSTALLED_MIGRATION_METADATA_DEADLINE/);
  assert(performance.now() - started >= 14_500);
  assert(performance.now() - started < 24_000);
});
