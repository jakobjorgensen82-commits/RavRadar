// PRIVATE TEST transport, not an origin issuer or a remote SAVE claim.
// Normal B/S producers, CAS, bundle validation and read-back remain real APIs.
import assert from 'node:assert/strict';

const B_KEY = 'ravscore-private-production-runtime-pointer';
const S_KEY = 'ravscore-continuation-checkpoint';
const clone = structuredClone;
export function normalBAndSTransports() {
  const documents = new Map(), objects = new Map(), events = [];
  const address = 'https://ravradar-origin-test.invalid';
  const key = 'SYNTHETIC_TEST_ONLY_NO_SERVICE_PRIVILEGE';
  function selectedKey(suffix) {
    const url = new URL(suffix, address + '/rest/v1/admin_documents');
    const filter = url.searchParams.get('document_key');
    assert([B_KEY, S_KEY].some(name => filter === 'eq.' + name));
    return filter.slice(3);
  }
  const documentRequest = async (suffix, options = {}) => {
    const method = options.method ?? 'GET';
    const name = method === 'POST' ? B_KEY : selectedKey(suffix);
    const row = documents.get(name);
    if (method === 'GET') {
      events.push(name === B_KEY ? 'B_READ' : 'S_READ');
      if (!row) return [];
      const select = new URL(suffix, address + '/rest/v1/admin_documents').searchParams.get('select');
      assert(['document_key,payload,version', 'document_key,version'].includes(select));
      return [select === 'document_key,version'
        ? { document_key: name, version: row.version } : clone(row)];
    }
    assert.equal(name, B_KEY, 'S writes must use the normal S CAS API.');
    assert(['POST', 'PATCH'].includes(method));
    const body = JSON.parse(options.body);
    if (method === 'POST') {
      assert.equal(row, undefined); assert.equal(body.document_key, name);
      documents.set(name, { document_key: name, payload: clone(body.payload), version: 1 });
    } else {
      assert(row); const expected = new URL(suffix, address + '/rest/v1/admin_documents').searchParams.get('version');
      assert.equal(expected, 'eq.' + row.version);
      documents.set(name, { document_key: name, payload: clone(body.payload), version: row.version + 1 });
    }
    events.push('B_CAS'); return [clone(documents.get(name))];
  };
  const checkpointRpc = async body => {
    assert.deepEqual(Object.keys(body).sort(), ['p_expected_version', 'p_payload', 'p_target_reference']);
    const current = documents.get(S_KEY), expected = current?.version ?? 0;
    assert.equal(body.p_expected_version, expected);
    assert.equal(body.p_payload.productionReferenceAt, body.p_target_reference);
    const payload = clone(body.p_payload), version = expected + 1;
    documents.set(S_KEY, { document_key: S_KEY, payload, version }); events.push('S_CAS');
    return { schemaVersion: '1.0.0', documentKey: S_KEY,
      disposition: expected === 0 ? 'inserted' : 'updated', centralVersion: version,
      productionReferenceAt: payload.productionReferenceAt, partCount: payload.partCount,
      candidatePartCount: payload.candidateGRollbackCompanion.partCount,
      modelId: payload.modelBinding.modelId, stateSchemaVersion: payload.modelBinding.stateSchemaVersion,
      modelContractSha256: payload.modelBinding.modelContractSha256,
      modelBundleSha256: payload.modelBinding.modelBundleSha256, generationSha256: payload.generationSha256 };
  };
  const storage = {
    ensurePrivateBucket: async () => true,
    uploadImmutable: async (name, bytes) => {
      assert(Buffer.isBuffer(bytes));
      if (objects.has(name)) {
        assert.deepEqual(objects.get(name), bytes);
        return { created: false, alreadyExists: true };
      }
      objects.set(name, Buffer.from(bytes)); events.push('OBJECT_SAVE'); return { created: true };
    },
    download: async name => {
      assert(objects.has(name)); events.push('OBJECT_READBACK'); return Buffer.from(objects.get(name));
    },
    removeExact: async name => {
      assert(objects.has(name)); objects.delete(name); events.push('RETIRED_OWN_PREVIOUS_OBJECT'); return true;
    },
    anonymousStatus: async () => 403,
  };
  function installFixedReaderTransport() {
    const beforeFetch = globalThis.fetch;
    const names = ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY'];
    const previous = Object.fromEntries(names.map(name => [name, process.env[name]]));
    process.env.SUPABASE_URL = address; process.env.SUPABASE_SERVICE_ROLE_KEY = key;
    const ownedFetch = async (input, options = {}) => {
      const url = new URL(typeof input === 'string' || input instanceof URL ? input : input.url);
      assert.equal(url.origin, address, 'No request may leave this test-owned .invalid transport.');
      assert.equal(url.pathname, '/rest/v1/admin_documents');
      assert.equal(options.method ?? 'GET', 'GET', 'The fixed origin reader is read-only.');
      const headers = new Headers(options.headers);
      assert.equal(headers.get('apikey'), key); assert.equal(headers.get('authorization'), 'Bearer ' + key);
      const rows = await documentRequest(url.search, options);
      return new Response(JSON.stringify(rows), { status: 200, headers: { 'content-type': 'application/json' } });
    };
    globalThis.fetch = ownedFetch;
    return () => {
      assert.equal(globalThis.fetch, ownedFetch, 'Restore only the test-owned forwarding transport.');
      globalThis.fetch = beforeFetch;
      for (const name of names) {
        if (previous[name] === undefined) delete process.env[name]; else process.env[name] = previous[name];
      }
    };
  }
  return { documentRequest, checkpointRpc, storage, events, documents, objects, installFixedReaderTransport };
}
