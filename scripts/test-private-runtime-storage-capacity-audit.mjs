import assert from 'node:assert/strict';
import test from 'node:test';
import { auditPrivateRuntimeStorageCapacity } from './audit-private-runtime-storage-capacity.mjs';
import { PROTECTED_PRIVATE_RUNTIME_POLICY as policy } from './protected-private-production-runtime.mjs';
import { PRIVATE_PRODUCTION_RUNTIME_BUNDLE_POLICY } from './private-production-runtime-bundle.mjs';
import { ravScoreModelBinding } from '../js/core/ravscore-model-contract.js';

const clone = value => structuredClone(value);
function descriptor(letter, bytes, hour) {
  return {
    schemaVersion: policy.legacySchemaVersion, kind: policy.legacyDescriptorKind,
    privacyClass: policy.privacyClass, bucketId: policy.bucketId,
    objectPath: `bundles/sha256/${letter.repeat(64)}.json.gz`,
    objectSha256: letter.repeat(64), objectBytes: bytes,
    bundleContentSha256: letter.repeat(64), datasetId: `rr-fixture-${letter}`,
    productionReferenceAt: `2026-09-19T${hour}:00:00.000Z`,
    generatedAt: `2026-09-19T${hour}:05:00.000Z`, sourceHead: letter.repeat(40),
    modelBinding: ravScoreModelBinding(),
    contractHashes: Object.fromEntries(PRIVATE_PRODUCTION_RUNTIME_BUNDLE_POLICY.requiredContractHashKeys.map(key => [key, letter.repeat(64)])),
  };
}
function fixture({ mutateRows, mutatePointer, secondPointer, mutateBucket, listOverride } = {}) {
  const pointer = {
    document_key: policy.documentKey, version: 3,
    payload: {
      schemaVersion: policy.legacySchemaVersion, kind: policy.pointerKind,
      current: descriptor('a', 23_000_000, '12'), previous: descriptor('b', 19_000_000, '11'),
    },
  };
  mutatePointer?.(pointer);
  const rows = {
    '': [{ name: 'bundles', id: null, metadata: null }, { name: 'other-private-prefix', id: null, metadata: null }],
    bundles: [{ name: 'sha256', id: null, metadata: null }],
    'bundles/sha256': [
      { name: `${'a'.repeat(64)}.json.gz`, id: 'current', metadata: { size: 23_000_000 } },
      { name: `${'b'.repeat(64)}.json.gz`, id: 'previous', metadata: { size: 19_000_000 } },
    ],
    'other-private-prefix': [{ name: 'sensitive-original.json.gz', id: 'unknown', metadata: { size: 5_000_000 } }],
  };
  mutateRows?.(rows);
  const calls = [];
  let pointerReads = 0;
  const options = {
    supabaseUrl: 'https://storage.example.test', serviceRoleKey: 'sb_secret_private-fixture',
    limits: { pageSize: 1 },
    fetchImpl: async (url, request) => {
      const target = new URL(url);
      assert.equal(target.origin, 'https://storage.example.test');
      assert.equal(request.redirect, 'error');
      calls.push({ pathname: target.pathname, method: request.method, body: request.body });
      if (target.pathname === '/rest/v1/admin_documents') {
        assert.equal(request.method, 'GET');
        assert.equal(target.searchParams.get('document_key'), `eq.${policy.documentKey}`);
        const value = clone(pointer);
        if (++pointerReads > 1) secondPointer?.(value);
        return Response.json([value]);
      }
      if (target.pathname === `/storage/v1/bucket/${policy.bucketId}`) {
        assert.equal(request.method, 'GET');
        const value = { id: policy.bucketId, name: policy.bucketId, public: false,
          file_size_limit: policy.maximumArchiveBytes, allowed_mime_types: [policy.mimeType] };
        mutateBucket?.(value);
        return Response.json(value);
      }
      assert.equal(target.pathname, `/storage/v1/object/list/${policy.bucketId}`);
      assert.equal(request.method, 'POST');
      const body = JSON.parse(request.body);
      assert.deepEqual(body.sortBy, { column: 'name', order: 'asc' });
      if (listOverride) return listOverride(body);
      assert.ok(Object.hasOwn(rows, body.prefix), 'only discovered bounded prefixes are read');
      return Response.json(rows[body.prefix].slice(body.offset, body.offset + body.limit));
    },
  };
  return { options, calls };
}

test('reads exact endpoints recursively and paginates; reports physical bytes without private metadata', async () => {
  const { options, calls } = fixture();
  const report = await auditPrivateRuntimeStorageCapacity(options);
  assert.equal(report.status, 'COMPLETE');
  assert.equal(report.currentBytes, 23_000_000);
  assert.equal(report.previousBytes, 19_000_000);
  assert.equal(report.physicalBytes, 47_000_000);
  assert.equal(report.referencedUniqueBytes, 42_000_000);
  assert.equal(report.unreferencedBytes, 5_000_000);
  assert.equal(report.unreferencedObjectCount, 1);
  assert.equal(report.predictedPeakPhysicalBytes, 70_000_000);
  assert.equal(report.predictedThreeRetainedGenerationsBytes, 65_000_000);
  assert.equal(report.headroomBytes, 653_000_000);
  assert.equal(report.progressFitsEstimatedPublishPeak, true);
  assert.equal(report.contentHashesVerified, false);
  assert.ok(calls.some(call => JSON.parse(call.body ?? '{}').offset === 2));
  const encoded = JSON.stringify(report);
  for (const prohibited of ['sb_secret', 'sensitive-original', 'other-private-prefix', 'bundles/', 'rr-fixture', 'modelBinding']) {
    assert.equal(encoded.includes(prohibited), false, prohibited);
  }
});

test('measured mismatch/missing references do not produce a current-size estimate', async () => {
  for (const [action, code] of [
    [rows => { rows['bundles/sha256'][0].metadata.size = 22_000_000; }, 'REFERENCED_OBJECT_SIZE_MISMATCH'],
    [rows => { rows['bundles/sha256'].shift(); }, 'REFERENCED_OBJECT_MISSING'],
  ]) {
    const { options } = fixture({ mutateRows: action });
    const report = await auditPrivateRuntimeStorageCapacity(options);
    assert.equal(report.status, 'INCOMPLETE');
    assert.equal(report.inventoryComplete, true);
    assert.ok(report.errors.includes(code));
    assert.equal(report.currentBytes, null);
    assert.equal(report.candidateEstimateBytes, null);
  }
});

test('current sharded schema and a historical single-object previous are measured together', async () => {
  const archive = 'a'.repeat(64);
  const parts = ['c', 'd'].map((letter, index) => ({
    index, objectPath: `bundles/sha256/${archive}/part-${String(index).padStart(3, '0')}-${letter.repeat(64)}.json.gz.part`,
    objectSha256: letter.repeat(64), objectBytes: index === 0 ? 13_000_000 : 10_000_000,
  }));
  const { options } = fixture({
    mutatePointer: row => {
      row.payload.schemaVersion = policy.schemaVersion;
      const current = row.payload.current;
      delete current.objectPath;
      Object.assign(current, { schemaVersion: policy.schemaVersion, kind: policy.descriptorKind, objectCount: 2, objects: parts });
    },
    mutateRows: rows => {
      rows['bundles/sha256'][0] = { name: archive, id: null, metadata: null };
      rows[`bundles/sha256/${archive}`] = parts.map(part => ({
        name: part.objectPath.split('/').at(-1), id: `part-${part.index}`, metadata: { size: part.objectBytes },
      }));
    },
  });
  const report = await auditPrivateRuntimeStorageCapacity(options);
  assert.equal(report.status, 'COMPLETE');
  assert.equal(report.objectCount, 4);
  assert.equal(report.currentBytes, 23_000_000);
  assert.equal(report.previousBytes, 19_000_000);
  assert.equal(report.physicalBytes, 47_000_000);
});

test('unknown file metadata never means zero storage use', async () => {
  for (const size of [null, undefined, '5000000', -1, 1.5]) {
    const { options } = fixture({ mutateRows: rows => { rows['other-private-prefix'][0].metadata.size = size; } });
    const report = await auditPrivateRuntimeStorageCapacity(options);
    assert.equal(report.inventoryComplete, false);
    assert.equal(report.physicalBytes, null);
    assert.ok(report.errors.includes('OBJECT_SIZE_UNKNOWN'));
  }
});

test('a bad pointer still permits physical inventory but not fabricated generation classification', async () => {
  const { options } = fixture({ mutatePointer: row => { row.payload.current.objectBytes += 1; row.payload.current.schemaVersion = 'unknown'; } });
  const report = await auditPrivateRuntimeStorageCapacity(options);
  assert.equal(report.physicalBytes, 47_000_000);
  assert.equal(report.currentBytes, null);
  assert.equal(report.unreferencedBytes, null);
  assert.ok(report.errors.includes('POINTER_SCHEMA_INVALID'));
});

test('changed pointer and incompatible bucket policy are explicit, payload-free failures', async () => {
  const { options } = fixture({ secondPointer: row => { row.version += 1; }, mutateBucket: bucket => { bucket.public = true; } });
  const report = await auditPrivateRuntimeStorageCapacity(options);
  assert.equal(report.physicalBytes, 47_000_000);
  assert.equal(report.pointerVerified, false);
  assert.deepEqual(report.errors, ['BUCKET_POLICY_INVALID', 'POINTER_CHANGED_DURING_AUDIT']);
});

test('path escapes and repeated pagination entries cannot trigger other endpoints or loops', async () => {
  for (const name of ['../foreign', '..', '/other-bucket', 'nested/file', 'bad\\file']) {
    const { options, calls } = fixture({ mutateRows: rows => { rows[''][0].name = name; } });
    const report = await auditPrivateRuntimeStorageCapacity(options);
    assert.ok(report.errors.includes('LIST_NAME_INVALID'));
    assert.equal(calls.length, 3);
  }
  const { options } = fixture({ listOverride: () => Response.json([{ name: 'same', id: 'file', metadata: { size: 5 } }]) });
  const report = await auditPrivateRuntimeStorageCapacity(options);
  assert.ok(report.errors.includes('LIST_ENTRY_DUPLICATED'));
  assert.equal(report.physicalBytes, null);
});

test('request, entry, depth, prefix and response bounds stop without claiming complete inventory', async () => {
  for (const [limits, code] of [
    [{ maximumRequests: 3 }, 'REQUEST_LIMIT'],
    [{ maximumEntries: 1 }, 'ENTRY_LIMIT'],
    [{ maximumDepth: 1 }, 'DEPTH_LIMIT'],
    [{ maximumPrefixes: 1 }, 'PREFIX_LIMIT'],
    [{ maximumResponseBytes: 10 }, 'RESPONSE_TOO_LARGE'],
  ]) {
    const { options } = fixture();
    options.limits = { ...options.limits, ...limits };
    const report = await auditPrivateRuntimeStorageCapacity(options);
    assert.equal(report.status, 'INCOMPLETE');
    assert.equal(report.physicalBytes, null);
    assert.ok(report.errors.includes(code), JSON.stringify(report.errors));
  }
});

test('credentials/remote failures never leak secrets, response errors or request URLs', async () => {
  const { options, calls } = fixture();
  const absent = await auditPrivateRuntimeStorageCapacity({ ...options, serviceRoleKey: '' });
  assert.equal(calls.length, 0);
  assert.deepEqual(absent.errors, ['CREDENTIAL_CONFIGURATION_REQUIRED']);
  options.fetchImpl = async () => { throw new Error('secret response private-location credentials'); };
  const failed = await auditPrivateRuntimeStorageCapacity(options);
  assert.deepEqual(failed.errors, ['REMOTE_READ_FAILED']);
  assert.equal(JSON.stringify(failed).includes('private-location'), false);
});
