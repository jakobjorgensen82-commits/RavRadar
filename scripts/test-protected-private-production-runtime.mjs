import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { ravScoreModelBinding } from '../js/core/ravscore-model-contract.js';
import {
  createPrivateProductionRuntimeBundle,
  verifyPrivateProductionRuntimeBundle,
} from './private-production-runtime-bundle.mjs';
import {
  PRIVATE_RUNTIME_CONTRACT_FILES,
  PRIVATE_RUNTIME_FILES,
  buildPrivateRuntimeCreateSpec,
  buildPrivateRuntimeExpectation,
} from './private-production-runtime-workflow.mjs';
import {
  PROTECTED_PRIVATE_RUNTIME_POLICY,
  auditProtectedPrivateRuntimeAnonymousDenial,
  buildProtectedPrivateRuntimeArchive,
  createProtectedPrivateRuntimeClients,
  publishProtectedPrivateProductionRuntime,
  restoreProtectedPrivateProductionRuntime,
} from './protected-private-production-runtime.mjs';

const clone = value => JSON.parse(JSON.stringify(value));
const sourceRepository = path.resolve('.');
const temp = await fs.mkdtemp(path.join(os.tmpdir(), 'ravradar-protected-private-runtime-'));
const repository = path.join(temp, 'repository');
const privateRoot = path.join(temp, 'private');
const restoreRoot = path.join(temp, 'restore-private');
const SOURCE_HEADS = ['a', 'b', 'c', 'd'].map(letter => letter.repeat(40));

const contractFiles = [...new Set(Object.values(PRIVATE_RUNTIME_CONTRACT_FILES).flat())];

function syntheticConditions(index) {
  const hour = String(10 + index).padStart(2, '0');
  return {
    datasetId: `rr-synthetic-private-generation-${index}`,
    generatedAt: `2026-08-29T${hour}:05:00.000Z`,
    productionReferenceAt: `2026-08-29T${hour}:00:00.000Z`,
    zones: Object.fromEntries(Array.from({ length: 210 }, (_, row) => [`z-${row}`, {}])),
    coastalParts: {
      modelBinding: ravScoreModelBinding(),
      parts: Object.fromEntries(Array.from({ length: 673 }, (_, row) => [`p-${row}`, {}])),
    },
  };
}

async function createGeneration(index) {
  const conditions = syntheticConditions(index);
  for (const descriptor of PRIVATE_RUNTIME_FILES) {
    const destination = path.join(repository, descriptor.relativePath);
    await fs.mkdir(path.dirname(destination), { recursive: true });
    await fs.writeFile(
      destination,
      descriptor.id === 'full-conditions'
        ? `${JSON.stringify(conditions)}\n`
        : `synthetic-generation-${index}-${descriptor.id}\n`,
    );
  }
  const spec = await buildPrivateRuntimeCreateSpec({ repositoryRoot: repository });
  const bundlePath = path.join(privateRoot, `bundle-${index}`);
  await createPrivateProductionRuntimeBundle({
    privateRoot,
    bundlePath,
    repositoryRoot: repository,
    ...spec,
  });
  const expected = await buildPrivateRuntimeExpectation({
    repositoryRoot: repository,
    targetReferenceAt: `2026-08-29T${String(11 + index).padStart(2, '0')}:00:00.000Z`,
    now: `2026-08-29T${String(11 + index).padStart(2, '0')}:05:00.000Z`,
  });
  return { bundlePath, expected, conditions };
}

function fakeDocuments() {
  let row = null;
  let loseNextPatch = false;
  return {
    request: async (suffix, options = {}) => {
      const method = options.method ?? 'GET';
      if (method === 'GET') return row ? [clone(row)] : [];
      if (method === 'POST') {
        if (row) return [];
        const body = JSON.parse(options.body);
        row = { document_key: body.document_key, payload: body.payload, version: 1 };
        return [clone(row)];
      }
      if (method === 'PATCH') {
        if (loseNextPatch) {
          loseNextPatch = false;
          return [];
        }
        const expectedVersion = Number(/version=eq\.(\d+)/.exec(suffix)?.[1]);
        if (!row || row.version !== expectedVersion) return [];
        row = { ...row, payload: JSON.parse(options.body).payload, version: row.version + 1 };
        return [clone(row)];
      }
      throw new Error(`unexpected document method ${method}`);
    },
    row: () => clone(row),
    setRow: value => { row = clone(value); },
    losePatch: () => { loseNextPatch = true; },
  };
}

function fakeStorage() {
  const objects = new Map();
  const removed = [];
  let anonymousStatus = 403;
  let downloadCount = 0;
  return {
    client: {
      ensurePrivateBucket: async () => true,
      uploadImmutable: async (objectPath, bytes) => {
        if (objects.has(objectPath)) return { created: false, alreadyExists: true };
        objects.set(objectPath, Buffer.from(bytes));
        return { created: true };
      },
      download: async objectPath => {
        downloadCount += 1;
        if (!objects.has(objectPath)) throw new Error('synthetic object missing');
        return Buffer.from(objects.get(objectPath));
      },
      removeExact: async objectPath => {
        removed.push(objectPath);
        objects.delete(objectPath);
        return true;
      },
      anonymousStatus: async () => anonymousStatus,
    },
    objects,
    removed,
    downloads: () => downloadCount,
    setAnonymousStatus: status => { anonymousStatus = status; },
  };
}

try {
  await fs.mkdir(repository, { recursive: true });
  await fs.mkdir(privateRoot, { recursive: true });
  await fs.mkdir(restoreRoot, { recursive: true });
  for (const relative of contractFiles) {
    const source = path.join(sourceRepository, relative);
    if (!await fs.lstat(source).catch(() => null)) continue;
    const destination = path.join(repository, relative);
    await fs.mkdir(path.dirname(destination), { recursive: true });
    await fs.copyFile(source, destination);
  }

  const documents = fakeDocuments();
  const storage = fakeStorage();
  assert.equal(PROTECTED_PRIVATE_RUNTIME_POLICY.maximumArchiveBytes, 50 * 1024 * 1024);
  let bucketCreatedWith = null;
  let bucketLookupCount = 0;
  const clientContract = createProtectedPrivateRuntimeClients({
    supabaseUrl: 'https://synthetic-project.supabase.co',
    serviceRoleKey: 'synthetic-service-role-key',
    fetchImpl: async (url, options = {}) => {
      if (url.endsWith(`/storage/v1/bucket/${PROTECTED_PRIVATE_RUNTIME_POLICY.bucketId}`)) {
        bucketLookupCount += 1;
        if (bucketLookupCount === 1) return new Response('', { status: 404 });
        return new Response(JSON.stringify({
          id: PROTECTED_PRIVATE_RUNTIME_POLICY.bucketId,
          name: PROTECTED_PRIVATE_RUNTIME_POLICY.bucketId,
          public: false,
          file_size_limit: PROTECTED_PRIVATE_RUNTIME_POLICY.maximumArchiveBytes,
          allowed_mime_types: [PROTECTED_PRIVATE_RUNTIME_POLICY.mimeType],
        }), { status: 200 });
      }
      if (url.endsWith('/storage/v1/bucket') && options.method === 'POST') {
        bucketCreatedWith = JSON.parse(options.body);
        return new Response('', { status: 200 });
      }
      throw new Error(`unexpected synthetic Supabase request ${options.method ?? 'GET'} ${url}`);
    },
  });
  await clientContract.storage.ensurePrivateBucket();
  assert.equal(bucketCreatedWith.file_size_limit, 50 * 1024 * 1024,
    'new protected buckets must use the actual Free-plan object boundary');
  assert.equal(bucketCreatedWith.public, false);

  let oversizedBodyRead = false;
  const oversizedClient = createProtectedPrivateRuntimeClients({
    supabaseUrl: 'https://synthetic-project.supabase.co',
    serviceRoleKey: 'synthetic-service-role-key',
    fetchImpl: async () => ({
      ok: true,
      headers: { get: name => name === 'content-length'
        ? String(PROTECTED_PRIVATE_RUNTIME_POLICY.maximumArchiveBytes + 1)
        : null },
      arrayBuffer: async () => {
        oversizedBodyRead = true;
        return new ArrayBuffer(0);
      },
    }),
  });
  await assert.rejects(
    oversizedClient.storage.download('bundles/sha256/synthetic.json.gz'),
    /download failed closed/,
  );
  assert.equal(oversizedBodyRead, false,
    'declared oversized objects must be rejected before a full body read');
  const first = await createGeneration(0);
  const archiveOne = await buildProtectedPrivateRuntimeArchive({
    privateRoot,
    bundlePath: first.bundlePath,
    repositoryRoot: repository,
    expected: first.expected,
    now: '2026-08-29T11:05:00.000Z',
    sourceHead: SOURCE_HEADS[0],
  });
  const archiveTwo = await buildProtectedPrivateRuntimeArchive({
    privateRoot,
    bundlePath: first.bundlePath,
    repositoryRoot: repository,
    expected: first.expected,
    now: '2026-08-29T11:05:00.000Z',
    sourceHead: SOURCE_HEADS[0],
  });
  assert.equal(archiveOne.descriptor.objectSha256, archiveTwo.descriptor.objectSha256);
  assert.deepEqual(archiveOne.archive, archiveTwo.archive, 'protected archive bytes must be deterministic');

  const publishedFirst = await publishProtectedPrivateProductionRuntime({
    privateRoot,
    bundlePath: first.bundlePath,
    repositoryRoot: repository,
    expected: first.expected,
    now: '2026-08-29T11:05:00.000Z',
    sourceHead: SOURCE_HEADS[0],
    request: documents.request,
    storage: storage.client,
  });
  assert.equal(publishedFirst.published, true);
  assert.equal(publishedFirst.rollbackAvailable, false);
  assert.equal(documents.row().payload.previous, null);
  assert.equal(storage.objects.size, 1);
  assert.equal(storage.downloads(), 1, 'publication must make one byte-exact object readback');

  const equivalent = await publishProtectedPrivateProductionRuntime({
    privateRoot,
    bundlePath: first.bundlePath,
    repositoryRoot: repository,
    expected: first.expected,
    now: '2026-08-29T11:05:00.000Z',
    sourceHead: SOURCE_HEADS[0],
    request: documents.request,
    storage: storage.client,
  });
  assert.equal(equivalent.published, false);
  assert.equal(documents.row().version, 1);
  assert.equal(storage.downloads(), 2, 'idempotent publication verifies the one referenced object once');

  const restoreBundle = path.join(restoreRoot, 'bundle-first');
  const downloadsBeforeCurrentRestore = storage.downloads();
  const restoredFirst = await restoreProtectedPrivateProductionRuntime({
    privateRoot: restoreRoot,
    bundlePath: restoreBundle,
    repositoryRoot: repository,
    expected: first.expected,
    now: '2026-08-29T11:05:00.000Z',
    request: documents.request,
    storage: storage.client,
  });
  assert.equal(restoredFirst.restored, true);
  assert.equal(restoredFirst.rollbackSelected, false);
  assert.equal(restoredFirst.currentGenerationRejected, false);
  assert.equal(restoredFirst.rejectedGenerationCount, 0);
  assert.equal(
    storage.downloads() - downloadsBeforeCurrentRestore,
    1,
    'normal restore must not download the rollback generation',
  );
  await verifyPrivateProductionRuntimeBundle({
    privateRoot: restoreRoot,
    bundlePath: restoreBundle,
    repositoryRoot: repository,
    expected: first.expected,
    now: '2026-08-29T11:05:00.000Z',
  });

  const second = await createGeneration(1);
  await publishProtectedPrivateProductionRuntime({
    privateRoot,
    bundlePath: second.bundlePath,
    repositoryRoot: repository,
    expected: second.expected,
    now: '2026-08-29T12:05:00.000Z',
    sourceHead: SOURCE_HEADS[1],
    request: documents.request,
    storage: storage.client,
  });
  assert.equal(documents.row().version, 2);
  assert.equal(documents.row().payload.previous.objectSha256, archiveOne.descriptor.objectSha256);
  assert.equal(storage.objects.size, 2);

  const third = await createGeneration(2);
  await publishProtectedPrivateProductionRuntime({
    privateRoot,
    bundlePath: third.bundlePath,
    repositoryRoot: repository,
    expected: third.expected,
    now: '2026-08-29T13:05:00.000Z',
    sourceHead: SOURCE_HEADS[2],
    request: documents.request,
    storage: storage.client,
  });
  assert.equal(documents.row().version, 3);
  assert.equal(storage.objects.size, 2, 'only current and rollback objects remain');
  assert.deepEqual(storage.removed, [archiveOne.descriptor.objectPath]);

  const expiredBundle = path.join(restoreRoot, 'bundle-expired');
  const expired = await restoreProtectedPrivateProductionRuntime({
    privateRoot: restoreRoot,
    bundlePath: expiredBundle,
    repositoryRoot: repository,
    expected: {
      ...third.expected,
      targetReferenceAt: '2026-09-01T13:00:00.000Z',
      minimumReferenceAt: '2026-08-29T13:00:00.000Z',
      minimumGeneratedAt: '2026-08-29T13:00:00.000Z',
      now: '2026-09-01T13:05:00.000Z',
    },
    now: '2026-09-01T13:05:00.000Z',
    request: documents.request,
    storage: storage.client,
  });
  assert.deepEqual(expired, {
    restored: false,
    reason: 'protected-private-runtime-expired',
    targetUnchanged: true,
    privatePayloadLogged: false,
  });
  assert.equal(await fs.lstat(expiredBundle).catch(() => null), null,
    'an expired protected runtime must remain a validated no-op');

  const pointerBeforeRegression = documents.row();
  const downloadsBeforeRegression = storage.downloads();
  await assert.rejects(
    publishProtectedPrivateProductionRuntime({
      privateRoot,
      bundlePath: first.bundlePath,
      repositoryRoot: repository,
      expected: first.expected,
      now: '2026-08-29T13:05:00.000Z',
      sourceHead: SOURCE_HEADS[0],
      request: documents.request,
      storage: storage.client,
    }),
    /regress central production state/,
  );
  assert.deepEqual(documents.row(), pointerBeforeRegression);
  assert.equal(
    storage.downloads(),
    downloadsBeforeRegression,
    'a regressive publication must stop before upload/readback egress',
  );

  const currentPath = documents.row().payload.current.objectPath;
  const currentBytes = Buffer.from(storage.objects.get(currentPath));
  currentBytes[0] ^= 1;
  storage.objects.set(currentPath, currentBytes);
  const rollbackBundle = path.join(restoreRoot, 'bundle-rollback');
  const downloadsBeforeRollback = storage.downloads();
  const rollback = await restoreProtectedPrivateProductionRuntime({
    privateRoot: restoreRoot,
    bundlePath: rollbackBundle,
    repositoryRoot: repository,
    expected: third.expected,
    now: '2026-08-29T13:05:00.000Z',
    request: documents.request,
    storage: storage.client,
  });
  assert.equal(rollback.rollbackSelected, true);
  assert.equal(rollback.currentGenerationRejected, true);
  assert.equal(rollback.rejectedGenerationCount, 1);
  assert.equal(rollback.productionReferenceAt, second.conditions.productionReferenceAt);
  assert.equal(
    storage.downloads() - downloadsBeforeRollback,
    2,
    'rollback restore downloads previous only after current fails verification',
  );

  const previousPath = documents.row().payload.previous.objectPath;
  const previousBytes = Buffer.from(storage.objects.get(previousPath));
  previousBytes[0] ^= 1;
  storage.objects.set(previousPath, previousBytes);
  await assert.rejects(
    restoreProtectedPrivateProductionRuntime({
      privateRoot: restoreRoot,
      bundlePath: path.join(restoreRoot, 'bundle-none-compatible'),
      repositoryRoot: repository,
      expected: third.expected,
      now: '2026-08-29T13:05:00.000Z',
      request: documents.request,
      storage: storage.client,
    }),
    /No compatible protected private runtime generation/,
  );

  storage.setAnonymousStatus(403);
  assert.equal((await auditProtectedPrivateRuntimeAnonymousDenial({
    request: documents.request,
    storage: storage.client,
  })).anonymousReadDenied, true);
  storage.setAnonymousStatus(200);
  await assert.rejects(
    auditProtectedPrivateRuntimeAnonymousDenial({
      request: documents.request,
      storage: storage.client,
    }),
    /anonymously readable/,
  );

  await assert.rejects(
    buildProtectedPrivateRuntimeArchive({
      privateRoot,
      bundlePath: third.bundlePath,
      repositoryRoot: repository,
      expected: third.expected,
      now: '2026-08-29T13:05:00.000Z',
      sourceHead: SOURCE_HEADS[2],
      policy: { ...PROTECTED_PRIVATE_RUNTIME_POLICY, maximumRawPayloadBytes: 32 },
    }),
    /size limit|raw payload exceeds/,
  );
  await assert.rejects(
    buildProtectedPrivateRuntimeArchive({
      privateRoot,
      bundlePath: third.bundlePath,
      repositoryRoot: repository,
      expected: third.expected,
      now: '2026-08-29T13:05:00.000Z',
      sourceHead: SOURCE_HEADS[2],
      policy: { ...PROTECTED_PRIVATE_RUNTIME_POLICY, maximumArchiveBytes: 32 },
    }),
    /compressed archive exceeds/,
  );

  // A CAS loss must never be interpreted as publication success.
  const fourth = await createGeneration(3);
  const cleanStorage = fakeStorage();
  for (const [key, value] of storage.objects) cleanStorage.objects.set(key, Buffer.from(value));
  // Restore untampered generations required by the publication readback.
  const thirdArchive = await buildProtectedPrivateRuntimeArchive({
    privateRoot,
    bundlePath: third.bundlePath,
    repositoryRoot: repository,
    expected: third.expected,
    now: '2026-08-29T13:05:00.000Z',
    sourceHead: SOURCE_HEADS[2],
  });
  cleanStorage.objects.set(thirdArchive.descriptor.objectPath, thirdArchive.archive);
  documents.losePatch();
  await assert.rejects(
    publishProtectedPrivateProductionRuntime({
      privateRoot,
      bundlePath: fourth.bundlePath,
      repositoryRoot: repository,
      expected: fourth.expected,
      now: '2026-08-29T14:05:00.000Z',
      sourceHead: SOURCE_HEADS[3],
      request: documents.request,
      storage: cleanStorage.client,
    }),
    /compare-and-swap lost a concurrent write/,
  );
  assert.equal(documents.row().version, 3);

  const implementation = await fs.readFile(
    'scripts/protected-private-production-runtime.mjs',
    'utf8',
  );
  assert.equal(implementation.includes('admin_document_versions'), false,
    'private runtime publication must preserve all existing admin-document history');
  assert.equal(implementation.includes('version cleanup'), false,
    'private runtime publication must not retain a hidden history-deletion path');

  console.log('Protected private runtime storage, retention, rollback and anonymous-denial contract passes.');
} finally {
  await fs.rm(temp, { recursive: true, force: true });
}
