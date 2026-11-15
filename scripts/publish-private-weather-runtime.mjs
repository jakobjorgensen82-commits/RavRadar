#!/usr/bin/env node
// Normal weather delivery only. The frozen archive/model readers and publisher
// remain the authority for payload, exact readback, parent CAS and retirement.
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createR2PrivateRuntimeStorage } from './lib/r2-private-runtime-storage.mjs';
import { createProtectedPrivateRuntimeClients, publishProtectedPrivateProductionRuntime,
  PROTECTED_PRIVATE_RUNTIME_POLICY } from './protected-private-production-runtime.mjs';

// DEC-0255: internal, weather-only transport budget. No environment/CLI override.
export const PRIVATE_WEATHER_PUBLICATION_POLICY = Object.freeze({
  bucketCeilingBytes: 2_500_000_000,
  reserveBytes: 100_000_000,
});
const fail = code => { throw Object.assign(new Error(code), { code }); };
export function assertPrivateWeatherPublicationPolicy(value = PRIVATE_WEATHER_PUBLICATION_POLICY) {
  if (!value || Object.getPrototypeOf(value) !== Object.prototype
    || Object.keys(value).sort().join(',') !== 'bucketCeilingBytes,reserveBytes'
    || !Number.isSafeInteger(value.bucketCeilingBytes)
    || !Number.isSafeInteger(value.reserveBytes) || value.reserveBytes < 0
    || value.bucketCeilingBytes !== PRIVATE_WEATHER_PUBLICATION_POLICY.bucketCeilingBytes
    || value.reserveBytes !== PRIVATE_WEATHER_PUBLICATION_POLICY.reserveBytes
    || value.bucketCeilingBytes - value.reserveBytes < PROTECTED_PRIVATE_RUNTIME_POLICY.maximumArchiveAggregateBytes) {
    fail('PRIVATE_WEATHER_PUBLICATION_POLICY_INVALID');
  }
  return Object.freeze({ ...value });
}

export function assertPrivateWeatherPublicationBackend(value = process.env.RAVRADAR_PRIVATE_RUNTIME_STORAGE_BACKEND ?? 'supabase') {
  if (value !== 'r2') fail('PRIVATE_WEATHER_PUBLICATION_BACKEND_MISMATCH');
}

export function createPrivateWeatherPublicationStorage(options = {}) {
  const policy = assertPrivateWeatherPublicationPolicy();
  const allowed = new Set(['storageBackend', 'accountId', 'accessKeyId', 'secretAccessKey', 'fetchImpl', 'now', 'delayImpl']);
  if (!options || Object.getPrototypeOf(options) !== Object.prototype
    || Object.keys(options).some(key => !allowed.has(key))) fail('PRIVATE_WEATHER_PUBLICATION_OPTION_INVALID');
  assertPrivateWeatherPublicationBackend(options.storageBackend);
  const fetchImpl = options.fetchImpl ?? globalThis.fetch;
  if (typeof fetchImpl !== 'function') fail('PRIVATE_WEATHER_PUBLICATION_OPTION_INVALID');
  let storage;
  let beforeFirstPut;
  const guardedFetch = async (url, request) => {
    if (request?.method === 'PUT') {
      // This is the frozen adapter's actual first new-object PUT boundary.
      // HEAD reuse never reaches it. A rejected admission is latched too, so
      // the existing adapter retry cannot cause another scan or any PUT.
      beforeFirstPut ??= (async () => {
        const { usedBytes } = await storage.bucketUsage();
        if (usedBytes > policy.bucketCeilingBytes - policy.reserveBytes
          - PROTECTED_PRIVATE_RUNTIME_POLICY.maximumArchiveAggregateBytes) {
          fail('PRIVATE_WEATHER_PUBLICATION_GENERATION_CAPACITY');
        }
      })();
      await beforeFirstPut;
    }
    // Preserve the URL and the whole request object, including auth, body,
    // redirect policy and any abort signal. No new retry or response handling.
    return fetchImpl(url, request);
  };
  storage = createR2PrivateRuntimeStorage({
    ...options,
    bucketId: PROTECTED_PRIVATE_RUNTIME_POLICY.bucketId,
    maximumObjectBytes: PROTECTED_PRIVATE_RUNTIME_POLICY.maximumArchiveBytes,
    bucketCeilingBytes: policy.bucketCeilingBytes,
    fetchImpl: guardedFetch,
  });
  return storage;
}

export async function publishPrivateWeatherRuntime(options, storageOptions) {
  if (!options || Object.hasOwn(options, 'storage') || Object.hasOwn(options, 'policy')) {
    fail('PRIVATE_WEATHER_PUBLICATION_OPTION_INVALID');
  }
  const storage = createPrivateWeatherPublicationStorage(storageOptions);
  return publishProtectedPrivateProductionRuntime({ ...options, storage });
}

export function privateWeatherPublicationArguments(argv) {
  if (argv[0] !== '--publish') fail('PRIVATE_WEATHER_PUBLICATION_ARGUMENT_INVALID');
  const names = new Map([
    ['--private-root', 'privateRoot'], ['--bundle', 'bundlePath'],
    ['--repository-root', 'repositoryRoot'], ['--expected', 'expectedPath'],
    ['--source-head', 'sourceHead'],
    ['--same-reference-migration-report', 'migrationReportPath'],
    ['--same-reference-predecessor-manifest', 'predecessorManifestPath'],
  ]);
  const parsed = {};
  for (let index = 1; index < argv.length; index += 2) {
    const key = names.get(argv[index]), value = argv[index + 1];
    if (!key || Object.hasOwn(parsed, key) || typeof value !== 'string' || !value || value.startsWith('--')) {
      fail('PRIVATE_WEATHER_PUBLICATION_ARGUMENT_INVALID');
    }
    parsed[key] = value;
  }
  if (['privateRoot', 'bundlePath', 'repositoryRoot', 'expectedPath', 'sourceHead'].some(key => !parsed[key])
    || Boolean(parsed.migrationReportPath) !== Boolean(parsed.predecessorManifestPath)) {
    fail('PRIVATE_WEATHER_PUBLICATION_ARGUMENT_INVALID');
  }
  return parsed;
}
async function readJson(file, role) {
  try { return JSON.parse(await fs.readFile(file, 'utf8')); }
  catch { fail(`PRIVATE_WEATHER_PUBLICATION_${role}_INVALID`); }
}
async function main() {
  assertPrivateWeatherPublicationPolicy();
  assertPrivateWeatherPublicationBackend();
  const parsed = privateWeatherPublicationArguments(process.argv.slice(2));
  const { expectedPath, migrationReportPath, predecessorManifestPath, ...options } = parsed;
  const expected = await readJson(expectedPath, 'EXPECTED');
  const sameReferenceSuccessorEvidence = migrationReportPath ? {
    migrationReport: await readJson(migrationReportPath, 'MIGRATION_REPORT'),
    predecessorManifest: await readJson(predecessorManifestPath, 'PREDECESSOR_MANIFEST'),
  } : undefined;
  // The existing document requester retains its own authenticated protocol.
  // Its default storage is deliberately not used for this publication.
  const clients = createProtectedPrivateRuntimeClients();
  const result = await publishPrivateWeatherRuntime({
    ...options,
    expected,
    request: clients.documentRequest,
    ...(sameReferenceSuccessorEvidence ? { sameReferenceSuccessorEvidence } : {}),
  });
  console.log(JSON.stringify({ status: result.reason, published: result.published,
    rollbackAvailable: result.rollbackAvailable, objectCount: result.objectCount,
    retentionCleanupComplete: result.retentionCleanupComplete,
    retentionCleanupFailureCount: result.retentionCleanupFailureCount, privatePayloadLogged: false }));
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch(error => {
    let fixed;
    for (let current = error, depth = 0; current && depth < 5; current = current.cause, depth += 1) {
      if (/^PRIVATE_WEATHER_PUBLICATION_[A-Z_]+$/.test(current.code ?? '')) { fixed = current.code; break; }
    }
    console.error(`Protected private production runtime failed closed: ${fixed ?? error.message}`);
    process.exitCode = 1;
  });
}
