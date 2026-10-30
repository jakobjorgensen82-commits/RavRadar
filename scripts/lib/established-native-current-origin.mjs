// PRIVATE CANDIDATE. The new semantic contract is UNISSUED until normal
// physical C -> I -> T includes these exact sources. A stored JSON marker,
// caller receipt, model hash or callback can never mint a handle.
import fs from 'node:fs/promises';
import crypto from 'node:crypto';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { execFile as callbackExec } from 'node:child_process';
import { promisify, isDeepStrictEqual } from 'node:util';
import { createProtectedPrivateRuntimeClients, validateProtectedPrivateRuntimePointer,
  PROTECTED_PRIVATE_RUNTIME_POLICY } from '../protected-private-production-runtime.mjs';
import { createProtectedRavScoreCheckpointRequester } from '../protected-ravscore-continuation-checkpoint.mjs';
import { verifyPrivateProductionRuntimeBundle, privateRuntimeBundleContentSha256, PRIVATE_PRODUCTION_RUNTIME_BUNDLE_POLICY } from '../private-production-runtime-bundle.mjs';
import { assertVerifiedUnpairedWeatherRestartArchive } from './weather-state-epoch-archive.mjs';
import { saveRavScoreContinuationCheckpoint } from '../ravscore-continuation-checkpoint.mjs';
import { privateRuntimeContractHashes } from '../private-production-runtime-workflow.mjs';
import { restoreProtectedRavScoreContinuationCheckpoint } from '../protected-ravscore-continuation-checkpoint.mjs';
import { ravScoreModelBinding } from '../../js/core/ravscore-model-contract.js';
import { ravScoreModelBinding as candidateBinding } from '../rollback-assets/ravscore-model-contract.js';
import { GENERATED_RAVSCORE_MODEL_BUNDLE_MANIFEST as I_MANIFEST } from '../../js/core/ravscore-model-bundle.generated.js';
import { ravScoreSamplingContextKey } from './ravscore-sampling-context.mjs';
import { assertIntegratedCoastalPointContinuation } from './coastal-point-staging-contract.mjs';
import { assertCandidateGRollbackContinuation } from './ravscore-candidate-g-rollback-runtime.mjs';
import { ownFileDescriptorIdentity, ownedFileDescriptorClosed } from './private-weather-component-pack.mjs';
import { PRIVATE_CONDITIONS_MAX_BYTES } from './bounded-json-writer.mjs';
import { withNativeCurrentReanalysisPredecessorSource } from '../check-native-current-reanalysis-predecessor-source.mjs';
import { assertAuthenticatedFrozen584Snapshot } from './authenticated-frozen584-predecessor.mjs';
import { withAuthenticated584PredecessorSource } from '../check-account-statistics-assistant-predecessor-source.mjs';
import { assertAuthenticatedFrozen585Snapshot } from './authenticated-frozen585-predecessor.mjs';
import { withAuthenticated585PredecessorSource } from '../check-native-original-continuity-predecessor-source.mjs';

import {readAuthenticatedFrozen586Predecessor,assertAuthenticatedFrozen586Snapshot,
  readAuthenticatedFrozen587Predecessor,assertAuthenticatedFrozen587Snapshot,
  readAuthenticatedFrozen588Predecessor,assertAuthenticatedFrozen588Snapshot,
  readAuthenticatedFrozen590Predecessor,assertAuthenticatedFrozen590Snapshot,
  readAuthenticatedFrozen591Predecessor,assertAuthenticatedFrozen591Snapshot}
  from './authenticated-frozen586-predecessor.mjs';

export const ESTABLISHED_NATIVE_CURRENT_SEMANTIC_CONTRACT = 'established-native-current-continuation-v1';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const ATTEST = 'privateEstablishedNativeCurrentOrigin';
const KIND = 'PRIVATE_ESTABLISHED_NATIVE_CURRENT_ORIGIN';
const SHA = /^[a-f0-9]{64}$/, HEAD = /^[a-f0-9]{40}$/;
const MB = 1024 * 1024, MAX_ATTEST = 16 * 1024, MAX_CONDITIONS = 256 * MB;
const contexts = new WeakMap(), failedCloses = new Map();
const exec = promisify(callbackExec);
const canonical = value => JSON.stringify(value, (_key, nested) => nested && typeof nested === 'object'
  && !Array.isArray(nested) ? Object.fromEntries(Object.keys(nested).sort().map(key => [key, nested[key]])) : nested);
const sha = raw => crypto.createHash('sha256').update(raw).digest('hex');
const digest = value => sha(canonical(value));
const same = (left, right) => isDeepStrictEqual(left, right);
const exact = (value, keys) => value !== null && typeof value === 'object' && !Array.isArray(value)
  && Object.getPrototypeOf(value) === Object.prototype && same(Object.keys(value).sort(), [...keys].sort());
const fail = (code = 'UNQUALIFIED') => { throw Object.assign(new Error('ESTABLISHED_CURRENT_ORIGIN_' + code),
  { code: 'ESTABLISHED_CURRENT_ORIGIN_' + code }); };
const need = (condition, code) => { if (!condition) fail(code); };
const hour = value => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:00:00\.000Z$/.test(value)
  && Number.isFinite(Date.parse(value)) && new Date(value).toISOString() === value;
const freeze = value => { if (value && typeof value === 'object') {
  for (const nested of Object.values(value)) freeze(nested); Object.freeze(value); } return value; };
// Reviewed immutable output anchor, not a general native-family permission.
// 389483 produced these states with 673 cold / 0 migrated / 0 continued;
// 389829 authenticated/revalidated the identical B/S. 390045's genuine normal
// 0200 whole metadata inverse preserved every numeric state/history value.
const SEED = Object.freeze({
  datasetId: 'rr-20261016191945-210', referenceAt: '2026-10-16T10:00:00.000Z',
  nativeProducer: '89aec730d17348a95d753f3e2de73aaf5fb0d0f1',
  producer: 'd897f3eb88239db85389fb798ff5d960a02ed6d4',
  originalB: '1b67b9511d9f6fdd7ff799f85e9d8cc5512c19fa6c9f7d07b4629fa7d64f0efa',
  originalS: '4acbd69b1556ea08c456af78dca902c98354da2ae9cea65d22c9d48ecb67f8b0',
  B: 'f23e9cd98b23fb9613c2d415ac8fb0d3bef583031dfec352546cdbefc47c7ba8',
  S: 'd337d7fd8d111af723e26d9252bb8f56e679cb4dd66a226612e62971f4d661bb',
  G: '61297a258de3bd7131c0268d62966cb6eed8463fc886641a07b4e23d071fe503',
  I: '84217430a712fec3e78c5c3115d86520a4011a388998af030d231a8433d52bb3',
  C: '76a86277db106621e7f0952d0789f9038a4bf9cfe7993b88de5c9a49bf25b4b8',
  T: 'a519a34e91e552623892e28f3c1fa9ee67b65d1fa08869a96e34fa24bd6d832f',
  ownerPolicyGitBlob: 'a4f65f8eb0396dbe3c3da442ebcb9a06d99d3287',
});


// A separate archive-authorized MEASURED-COLD start. The old pairs are NEVER
// admitted, rebound or claimed to descend numerically from the historic SEED.
const RESTART_KIND = 'PRIVATE_ARCHIVE_ISOLATED_NATIVE_CURRENT_ORIGIN';
const RESTART_TRANSITION = 'ARCHIVE_ISOLATED_MEASURED_COLD';
const RESTART_PREDECESSOR = Object.freeze({
  version: '20261017140000',
  integrated: '038d9b0cdc50d36dd10f207c6f33e909ddedbdacb28c89adbca12121cb2c7f5f',
  candidate: '5cc38c658bf14513a029a62de8f5f9e98259630755bdd84bccbc5fb2c1797858',
  continuation: '047db5f9c91b555eb47b886d200061456c9cbec450732743265f0f1739114447',
});
const restartCapabilitiesConsumed = new WeakSet();
function archivedRestartParent(value) {
  return { archiveId: value.archiveId, archiveCatalogSha256: value.archiveCatalogSha256,
    bundleContentSha256: value.B.description.bundleContentSha256,
    centralCheckpointPayloadSha256: value.S.payloadSha256,
    centralCheckpointVersion: value.S.version,
    publicManifestSha256: value.public.manifestSha256 };
}
function archivedRestartScope(value) {
  return { predecessor: { ...RESTART_PREDECESSOR },
    originalBundleSourceHead: value.B.description.sourceHead,
    originalBundleDatasetId: value.B.description.datasetId,
    originalBundleReferenceAt: value.B.description.productionReferenceAt,
    centralCheckpointDatasetId: value.S.datasetId,
    centralCheckpointReferenceAt: value.S.productionReferenceAt,
    publicDatasetId: value.public.datasetId, publicReferenceAt: value.public.productionReferenceAt,
    registryRawSha256: value.registry.rawSha256, registryCanonicalSha256: value.registry.canonicalSha256,
    originalBundleInventorySha256: digest(value.B.fileDigests) };
}
function validateArchivedRestartAttestation(attest, { descriptor, conditions, central, pairs, currentSource }) {
  need(exact(attest, ['schemaVersion','kind','semanticContract','restart','parent','producer','datasetId',
    'referenceAt','registrySha256','contextRegistrySha256','pairsSha256','transition','attestationSha256'])
    && attest.schemaVersion === 1 && attest.kind === RESTART_KIND
    && attest.semanticContract === ESTABLISHED_NATIVE_CURRENT_SEMANTIC_CONTRACT
    && attest.transition === RESTART_TRANSITION && SHA.test(attest.attestationSha256), 'RESTART_ATTESTATION');
  const { attestationSha256, ...content } = attest;
  need(digest(content) === attestationSha256 && Buffer.byteLength(canonical(attest)) <= MAX_ATTEST, 'RESTART_ATTESTATION_HASH');
  need(exact(attest.parent, ['archiveId','archiveCatalogSha256','bundleContentSha256',
    'centralCheckpointPayloadSha256','centralCheckpointVersion','publicManifestSha256'])
    && ['archiveId','archiveCatalogSha256','bundleContentSha256','centralCheckpointPayloadSha256','publicManifestSha256']
      .every(key => SHA.test(attest.parent[key]))
    && Number.isSafeInteger(attest.parent.centralCheckpointVersion) && attest.parent.centralCheckpointVersion > 0,
  'RESTART_ARCHIVE_PARENT');
  const restart = attest.restart;
  need(exact(restart, ['predecessor','originalBundleSourceHead','originalBundleDatasetId','originalBundleReferenceAt',
    'centralCheckpointDatasetId','centralCheckpointReferenceAt','publicDatasetId','publicReferenceAt',
    'registryRawSha256','registryCanonicalSha256','originalBundleInventorySha256'])
    && same(restart.predecessor, RESTART_PREDECESSOR) && HEAD.test(restart.originalBundleSourceHead)
    && ['registryRawSha256','registryCanonicalSha256','originalBundleInventorySha256'].every(key => SHA.test(restart[key]))
    && ['originalBundleDatasetId','centralCheckpointDatasetId','publicDatasetId']
      .every(key => typeof restart[key] === 'string' && /^rr-[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/.test(restart[key]))
    && ['originalBundleReferenceAt','centralCheckpointReferenceAt','publicReferenceAt'].every(key => hour(restart[key]))
    && Date.parse(restart.centralCheckpointReferenceAt) < Date.parse(restart.originalBundleReferenceAt)
    && Date.parse(attest.referenceAt) > Date.parse(restart.originalBundleReferenceAt)
    && Date.parse(attest.referenceAt) > Date.parse(restart.publicReferenceAt), 'RESTART_SCOPE');
  need(attest.datasetId === descriptor.datasetId && attest.datasetId === conditions.datasetId
    && attest.referenceAt === descriptor.productionReferenceAt && attest.referenceAt === conditions.productionReferenceAt
    && attest.registrySha256 === digest(central) && restart.registryCanonicalSha256 === digest(central)
    && attest.contextRegistrySha256 === contextDigest(pairs) && attest.pairsSha256 === pairsDigest(pairs)
    && exact(attest.producer, Object.keys(currentSource))
    && same({ ...attest.producer, sourceHead: currentSource.sourceHead }, currentSource)
    && attest.producer.sourceHead === descriptor.sourceHead
    && ['integrated','candidate','continuation'].every(key => currentSource[key] !== RESTART_PREDECESSOR[key]),
  'RESTART_ATTESTED_SOURCE');
}
async function assertArchivedRestartCurrentBoundary(value) {
  const clients = createProtectedPrivateRuntimeClients({ storageBackend: 'supabase' });
  const checkpointRequest = createProtectedRavScoreCheckpointRequester();
  const before = await readPointer(clients.documentRequest);
  need(before.version === value.B.pointerRow.version && same(before.pointer, value.B.pointerRow.payload), 'RESTART_POINTER_CHANGED');
  const key = 'ravscore-continuation-checkpoint';
  const rows = await checkpointRequest('?document_key=eq.' + encodeURIComponent(key)
    + '&select=document_key,payload,version&limit=2', {}, 'read');
  need(Array.isArray(rows) && rows.length === 1 && rows[0].document_key === key
    && Number(rows[0].version) === value.S.version && same(rows[0].payload, value.S.payload)
    && digest(rows[0].payload) === value.S.payloadSha256, 'RESTART_CENTRAL_CHECKPOINT_CHANGED');
  need(same(await readPointer(clients.documentRequest), before), 'RESTART_POINTER_CHANGED');
}
async function assertArchivedRestartPhysicalOriginal(value) {
  // Archive callbacks are NOT the origin issuer's authority. Bind their facts
  // again to the actual remote pointer and owned local normal manifest/bytes.
  const privateRoot = process.env.RAVRADAR_PRIVATE_RUNTIME_ROOT;
  const bundlePath = process.env.RAVRADAR_PRIVATE_RUNTIME_BUNDLE;
  need(path.isAbsolute(privateRoot ?? '') && path.isAbsolute(bundlePath ?? '')
    && path.dirname(bundlePath) === privateRoot, 'RESTART_FIXED_B_PATHS');
  const manifest = await json(path.join(bundlePath, 'manifest.json'), 2 * MB);
  need(manifest.schemaVersion === PRIVATE_PRODUCTION_RUNTIME_BUNDLE_POLICY.schemaVersion
    && manifest.kind === PRIVATE_PRODUCTION_RUNTIME_BUNDLE_POLICY.kind
    && manifest.privacyClass === PRIVATE_PRODUCTION_RUNTIME_BUNDLE_POLICY.privacyClass
    && manifest.zoneCount === 210 && manifest.partCount === 673
    && manifest.bundleContentSha256 === value.B.description.bundleContentSha256
    && privateRuntimeBundleContentSha256(manifest) === value.B.description.bundleContentSha256, 'RESTART_ORIGINAL_MANIFEST');
  for (const key of ['datasetId','productionReferenceAt','generatedAt','modelBinding','contractHashes'])
    need(same(manifest[key], value.B.description[key]), 'RESTART_ORIGINAL_METADATA');
  need(Array.isArray(manifest.files) && manifest.fileCount === manifest.files.length
    && manifest.files.length > 0 && manifest.files.length <= 32, 'RESTART_ORIGINAL_INVENTORY');
  const inventory = manifest.files.map(({ relativePath, bytes, sha256 }) => ({ relativePath, bytes, sha256 }))
    .sort((a,b) => a.relativePath.localeCompare(b.relativePath, 'en'));
  need(same(inventory, value.B.fileDigests), 'RESTART_ORIGINAL_INVENTORY');
  const item = inventory.find(row => row.relativePath === 'data/live/conditions.json');
  need(item && SHA.test(item.sha256) && Number.isSafeInteger(item.bytes), 'RESTART_ORIGINAL_CONDITIONS');
  const bytes = await ownedBytes(path.join(bundlePath, 'payload/data/live/conditions.json'), MAX_CONDITIONS);
  need(bytes.length === item.bytes && sha(bytes) === item.sha256
    && same(JSON.parse(bytes.toString('utf8')), value.B.conditions), 'RESTART_ORIGINAL_CONDITIONS');
  need(HEAD.test(value.B.description.sourceHead), 'RESTART_ORIGINAL_SOURCE');
  await git(['merge-base', '--is-ancestor', value.B.description.sourceHead, 'HEAD']);
  for (const [file,key] of [['js/core/ravscore-model-bundle.generated.js','integrated'],
    ['scripts/rollback-assets/ravscore-model-bundle.generated.js','candidate']]) {
    const source = await git(['show', value.B.description.sourceHead + ':' + file]);
    const match = /^export const GENERATED_RAVSCORE_MODEL_BUNDLE_SHA256 = '([a-f0-9]{64})';$/m.exec(source);
    need(match && match[1] === RESTART_PREDECESSOR[key], 'RESTART_ORIGINAL_SOURCE');
  }
}
export async function prepareArchivedCurrentOriginRestart(archiveCapability, { centralContract, targetReferenceAt } = {}) {
  need(arguments.length === 2 && !restartCapabilitiesConsumed.has(archiveCapability), 'RESTART_ARGUMENTS');
  const value = assertVerifiedUnpairedWeatherRestartArchive(archiveCapability);
  need(value.kind === 'RAVRADAR_UNPAIRED_WEATHER_RESTART_ARCHIVE' && value.admission === 'NO_ADMISSION'
    && value.paired === false && hour(targetReferenceAt) && targetReferenceAt === value.targetReferenceAt
    && Date.parse(targetReferenceAt) > Date.parse(value.B.description.productionReferenceAt)
    && Date.parse(targetReferenceAt) > Date.parse(value.public.productionReferenceAt)
    && value.B.description.modelBinding.modelBundleSha256 === RESTART_PREDECESSOR.integrated
    && value.B.description.contractHashes.continuationStateContractSha256 === RESTART_PREDECESSOR.continuation,
  'RESTART_ARCHIVE_SCOPE');
  const currentSource = await sourceIdentity(); // Genuine rendered model, physical source and clean Git guards.
  need(['integrated','candidate','continuation'].every(key => currentSource[key] !== RESTART_PREDECESSOR[key]), 'RESTART_UNISSUED');
  const registryBytes = await ownedBytes(path.join(ROOT, 'data/live/coastal-parts-v2.json'), 16 * MB);
  const registry = JSON.parse(registryBytes.toString('utf8'));
  need(sha(registryBytes) === value.registry.rawSha256 && digest(registry) === value.registry.canonicalSha256
    && same(registry, value.registry.value) && same(registry, centralContract), 'RESTART_REGISTRY_CHANGED');
  const parts = registryParts(registry);
  await assertArchivedRestartCurrentBoundary(value);
  await assertArchivedRestartPhysicalOriginal(value);
  need(same(await sourceIdentity(), currentSource), 'RESTART_SOURCE_CHANGED');
  await assertArchivedRestartCurrentBoundary(value);
  const handle = Object.freeze({});
  contexts.set(handle, { seed: false, restart: value, restartTargetReferenceAt: targetReferenceAt,
    descriptor: structuredClone(value.B.description), currentSource, central: structuredClone(registry),
    parts, pairs: new Map(), consumedParts: new Set(), finalized: false });
  restartCapabilitiesConsumed.add(archiveCapability);
  return handle;
}
async function buildArchivedCurrentOriginRestartAttestation(context, handle, { centralContract, conditions, partResults }) {
  need(!context.finalized && conditions.productionReferenceAt === context.restartTargetReferenceAt
    && same(centralContract, context.central) && partResults instanceof Map
    && same([...partResults.keys()].sort(), [...context.parts.keys()].sort()), 'RESTART_PRODUCED_TARGET');
  const currentSource = await sourceIdentity(); need(same(currentSource, context.currentSource), 'RESTART_SOURCE_CHANGED');
  const pairs = pairsFromConditions(conditions, context.parts);
  const { assertEstablishedNativeCurrentProductionResult } = await import('./ravscore-production-part-pipeline.mjs');
  for (const [id,part] of context.parts) {
    const actual = assertEstablishedNativeCurrentProductionResult(partResults.get(id),
      { originHandle: handle, part, targetReferenceAt: context.restartTargetReferenceAt, requireMeasuredColdStart: true });
    need(same(actual.integrated, pairs.get(id).integrated) && same(actual.candidate, pairs.get(id).candidate), 'RESTART_PRODUCED_PAIR_DIFFER');
  }
  await assertArchivedRestartCurrentBoundary(context.restart);
  const bytes = await ownedBytes(path.join(ROOT, 'data/live/coastal-parts-v2.json'), 16 * MB);
  need(sha(bytes) === context.restart.registry.rawSha256 && same(JSON.parse(bytes), context.central), 'RESTART_REGISTRY_CHANGED');
  const content = { schemaVersion: 1, kind: RESTART_KIND, semanticContract: ESTABLISHED_NATIVE_CURRENT_SEMANTIC_CONTRACT,
    restart: archivedRestartScope(context.restart), parent: archivedRestartParent(context.restart),
    producer: { ...currentSource }, datasetId: conditions.datasetId, referenceAt: conditions.productionReferenceAt,
    registrySha256: digest(context.central), contextRegistrySha256: contextDigest(pairs), pairsSha256: pairsDigest(pairs),
    transition: RESTART_TRANSITION };
  const attest = { ...content, attestationSha256: digest(content) };
  validateArchivedRestartAttestation(attest, { descriptor: { ...context.descriptor, datasetId: conditions.datasetId,
    productionReferenceAt: conditions.productionReferenceAt, sourceHead: currentSource.sourceHead },
    conditions, central: context.central, pairs, currentSource });
  context.finalized = true; return freeze(attest);
}

async function noLinks(file) {
  let at = path.parse(file).root;
  const parents = [];
  for (const piece of path.relative(at, file).split(path.sep).filter(Boolean)) {
    at = path.join(at, piece); const stat = await fs.lstat(at, { bigint: true });
    need(!stat.isSymbolicLink(), 'SYMLINK');
    if (at !== file) { need(stat.isDirectory(), 'PARENT'); parents.push({ file: at, dev: stat.dev, ino: stat.ino }); }
  }
  return parents;
}
async function sameParents(parents) {
  for (const before of parents) { const after = await fs.lstat(before.file, { bigint: true });
    need(after.isDirectory() && !after.isSymbolicLink() && after.dev === before.dev
      && after.ino === before.ino, 'PARENT_CHANGED'); }
}
async function ownedBytes(file, maximum) {
  const absolute = path.resolve(file); need(!failedCloses.has(absolute), 'PREVIOUS_CLOSE_UNPROVED');
  const parents = await noLinks(absolute), before = await fs.lstat(absolute, { bigint: true });
  need(before.isFile() && before.size >= 2n && before.size <= BigInt(maximum), 'INPUT_SIZE');
  let handle, fd, identity, raw, first;
  try {
    handle = await fs.open(absolute, 'r'); fd = handle.fd; identity = ownFileDescriptorIdentity(fd);
    const opened = await handle.stat({ bigint: true });
    need(opened.dev === before.dev && opened.ino === before.ino && opened.size === before.size, 'INPUT_CHANGED');
    const chunks = []; let size = 0; const buffer = Buffer.allocUnsafe(64 * 1024);
    for (;;) { const row = await handle.read(buffer, 0, Math.min(buffer.length, maximum + 1 - size), null);
      need(Number.isSafeInteger(row.bytesRead) && row.bytesRead >= 0 && row.bytesRead <= buffer.length, 'READ');
      if (!row.bytesRead) break; size += row.bytesRead; need(size <= maximum, 'INPUT_SIZE');
      chunks.push(Buffer.from(buffer.subarray(0, row.bytesRead))); }
    raw = Buffer.concat(chunks, size);
    for (const after of [await handle.stat({ bigint: true }), await fs.lstat(absolute, { bigint: true })]) {
      need(after.dev === before.dev && after.ino === before.ino && after.size === before.size
        && after.mtimeNs === before.mtimeNs && after.ctimeNs === before.ctimeNs, 'INPUT_CHANGED');
    }
    need(BigInt(raw.length) === before.size, 'INPUT_CHANGED');
    await sameParents(parents);
  } catch (error) { first = error; }
  if (handle) {
    try { await handle.close(); } catch (error) { first ??= error; }
    if (!await ownedFileDescriptorClosed(fd, identity)) { failedCloses.set(absolute, handle);
      first ??= Object.assign(new Error('ESTABLISHED_CURRENT_ORIGIN_CLOSE_UNPROVED'), { code: 'ESTABLISHED_CURRENT_ORIGIN_CLOSE_UNPROVED' }); }
  }
  if (first) throw first; return raw;
}
async function json(file, maximum) { return JSON.parse((await ownedBytes(file, maximum)).toString('utf8')); }
const sourceEnv = () => Object.fromEntries(['PATH', 'Path', 'SystemRoot', 'WINDIR', 'TEMP', 'TMP', 'LANG', 'LC_ALL']
  .filter(key => typeof process.env[key] === 'string').map(key => [key, process.env[key]]));
async function git(args) { return (await exec('git', ['-C', ROOT, ...args],
  { env: sourceEnv(), encoding: 'utf8', maxBuffer: 16 * MB, timeout: 30000 })).stdout.trim(); }
async function sourceIdentity(producer = null) {
  const I = ravScoreModelBinding().modelBundleSha256, C = candidateBinding().modelBundleSha256;
  const contracts = await privateRuntimeContractHashes();
  need(I !== SEED.I && C !== SEED.C && contracts.continuationStateContractSha256 !== SEED.T, 'UNISSUED');
  const required = ['scripts/lib/established-native-current-origin.mjs', 'scripts/lib/ravscore-production-part-pipeline.mjs'];
  for (const file of required) {
    const row = I_MANIFEST.files.find(entry => (entry.path ?? entry.file) === file);
    need(row && SHA.test(row.sha256), 'UNISSUED');
    const physical = (await ownedBytes(path.join(ROOT, file), 2 * MB)).toString('utf8').replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n');
    need(sha(physical) === row.sha256, 'SOURCE_CHANGED');
  }
  const head = await git(['rev-parse', 'HEAD']); need(HEAD.test(head), 'SOURCE_HEAD');
  if (process.env.GITHUB_SHA !== undefined) need(process.env.GITHUB_SHA === head, 'SOURCE_HEAD');
  const leaves = [...new Set(I_MANIFEST.files.map(row => row.path ?? row.file))];
  await git(['diff', '--exit-code', 'HEAD', '--', ...leaves]);
  need((await git(['rev-parse', 'HEAD:scripts/lib/dmi-marine-zone-exclusions.json'])) === SEED.ownerPolicyGitBlob, 'SOURCE_POLICY_CHANGED');
  if (producer !== null) {
    need(HEAD.test(producer), 'PRODUCER'); await git(['merge-base', '--is-ancestor', producer, head]);
    for (const file of required) need(await git(['rev-parse', producer + ':' + file])
      === await git(['rev-parse', head + ':' + file]), 'PRODUCER_SEMANTICS_CHANGED');
  }
  return Object.freeze({ sourceHead: head, semanticContract: ESTABLISHED_NATIVE_CURRENT_SEMANTIC_CONTRACT,
    integrated: I, candidate: C, continuation: contracts.continuationStateContractSha256,
    ownerPolicyGitBlob: SEED.ownerPolicyGitBlob });
}
function registryParts(central) {
  need(central?.zoneCount === 210 && central?.partCount === 673 && central?.zones, 'REGISTRY');
  const parts = Object.entries(central.zones).flatMap(([zoneId, values]) => values.map(part => ({ ...part, zoneId })));
  need(parts.length === 673 && new Set(parts.map(part => part.partId)).size === 673, 'REGISTRY');
  return new Map(parts.map(part => [part.partId, part]));
}
function pairsFromConditions(conditions, parts, { requireCurrentContext = true } = {}) {
  const roots = [conditions.ravScoreCandidateGRollback, conditions.ravScoreCandidateGWarmup].filter(value => value != null);
  need(roots.length === 1 && roots[0].runtime?.parts, 'CANDIDATE_ROOT');
  const integrated = conditions.coastalParts?.parts, candidate = roots[0].runtime.parts;
  need(integrated && same(Object.keys(integrated).sort(), [...parts.keys()].sort())
    && same(Object.keys(candidate).sort(), [...parts.keys()].sort()), 'PARTS');
  const pairs = new Map();
  for (const [id, part] of parts) {
    const I = integrated[id]?.ravScoreModel?.currentState, G = candidate[id]?.ravScoreModel?.currentState;
    need(I && G && hour(I.time) && I.time === G.time && I.time === conditions.productionReferenceAt
      && typeof I.samplingContextKey === 'string', 'PAIR_CONTEXT');
    if (requireCurrentContext) { assertIntegratedCoastalPointContinuation(I, { samplingContextKey: ravScoreSamplingContextKey(part) });
      assertCandidateGRollbackContinuation(G, part); }
    pairs.set(id, { integrated: structuredClone(I), candidate: structuredClone(G), context: I.samplingContextKey });
  }
  return pairs;
}
function pairsDigest(pairs) {
  const hash = crypto.createHash('sha256');
  for (const id of [...pairs.keys()].sort()) hash.update(canonical([id, pairs.get(id)]));
  return hash.digest('hex');
}
function contextDigest(pairs) {
  return digest([...pairs].map(([id, pair]) => [id, pair.context]).sort(([a], [b]) => a.localeCompare(b)));
}
function validateAttestation(attest, { descriptor, conditions, central, pairs, currentSource }) {
  if (attest?.kind === RESTART_KIND) return validateArchivedRestartAttestation(attest, { descriptor, conditions, central, pairs, currentSource });
  need(exact(attest, ['schemaVersion', 'kind', 'semanticContract', 'seed', 'parent', 'producer',
    'datasetId', 'referenceAt', 'registrySha256', 'contextRegistrySha256', 'pairsSha256', 'transition', 'attestationSha256'])
    && attest.schemaVersion === 1 && attest.kind === KIND
    && attest.semanticContract === ESTABLISHED_NATIVE_CURRENT_SEMANTIC_CONTRACT
    && same(attest.seed, SEED) && SHA.test(attest.attestationSha256), 'ATTESTATION');
  const { attestationSha256, ...content } = attest;
  need(digest(content) === attestationSha256 && Buffer.byteLength(canonical(attest)) <= MAX_ATTEST, 'ATTESTATION_HASH');
  need(exact(attest.parent, ['bundleContentSha256', 'generationSha256', 'attestationSha256'])
    && SHA.test(attest.parent.bundleContentSha256) && SHA.test(attest.parent.generationSha256)
    && (attest.parent.attestationSha256 === null || SHA.test(attest.parent.attestationSha256)), 'PARENT');
  need(attest.datasetId === descriptor.datasetId && attest.datasetId === conditions.datasetId
    && attest.referenceAt === descriptor.productionReferenceAt && attest.referenceAt === conditions.productionReferenceAt
    && SHA.test(attest.registrySha256) && attest.contextRegistrySha256 === contextDigest(pairs)
    && attest.pairsSha256 === pairsDigest(pairs)
    && exact(attest.producer, Object.keys(currentSource))
    && same({ ...attest.producer, sourceHead: currentSource.sourceHead }, currentSource)
    && attest.producer.sourceHead === descriptor.sourceHead, 'ATTESTED_SOURCE');
  need(['SEED_METADATA_ONLY', 'NORMAL_STRICT_CONTINUATION'].includes(attest.transition), 'TRANSITION');
  if (attest.transition === 'SEED_METADATA_ONLY') need(attest.parent.bundleContentSha256 === SEED.B
    && attest.parent.generationSha256 === SEED.S && attest.parent.attestationSha256 === null
    && attest.referenceAt === SEED.referenceAt && attest.datasetId === SEED.datasetId, 'SEED_PARENT');
  else need(SHA.test(attest.parent.attestationSha256), 'FOLLOWER_PARENT');
}
async function readPointer(request) {
  const key = PROTECTED_PRIVATE_RUNTIME_POLICY.documentKey;
  const rows = await request(`?document_key=eq.${encodeURIComponent(key)}&select=document_key,payload,version&limit=2`, {}, 'read');
  need(Array.isArray(rows) && rows.length === 1 && rows[0].document_key === key
    && Number.isSafeInteger(Number(rows[0].version)) && Number(rows[0].version) > 0, 'POINTER');
  return { version: Number(rows[0].version), pointer: validateProtectedPrivateRuntimePointer(rows[0].payload,
    { allowHistoricalCurrentModelBinding: true }) };
}

// Neither public reader accepts paths, requesters, receipts, source/validator
// choices or flags. This selector is lexical, never caller-provided authority.
// Fixed genuine586 -> actual normal successor, never a SAME_H0 event.
// The old data assertions and normal protected loader authenticate WHOLE old
// attestation/B/S. Only current metadata-normalized H0 pairs enter the existing
// ForPart kernel; its normal finalizer still requires real later partResults.
async function readFrozen586LaterOrigin({descriptor,before,request,conditions,central,parts,currentSource}){
  const oldI='6d8f7cca203b5f7ee5155f3c0cdb39403a02fd0eb30fecaca5070ef9f814a805';
  need(descriptor.modelBinding.modelBundleSha256===oldI&&currentSource.integrated!==oldI,'586_FAMILY');
  const target=Date.parse(process.env.RAVRADAR_PRODUCTION_TARGET_HOUR??'');
  need(Number.isFinite(target)&&target%3600000===0&&target>Date.parse(descriptor.productionReferenceAt),'586_LATER_TARGET');
  const snapshot=assertAuthenticatedFrozen586Snapshot(await readAuthenticatedFrozen586Predecessor());
  need(same(snapshot.descriptor,descriptor)&&same(snapshot.centralContract,central),'586_ORIGINAL_CHANGED');
  const contracts=await privateRuntimeContractHashes(),I=ravScoreModelBinding(),C=candidateBinding();
  need(same({...snapshot.checkpoint.modelBinding,modelBundleSha256:I.modelBundleSha256},I)
    &&same({...snapshot.checkpoint.candidateGRollbackCompanion.modelBinding,modelBundleSha256:C.modelBundleSha256},C)
    &&same({...descriptor.contractHashes,continuationStateContractSha256:contracts.continuationStateContractSha256},contracts),
    '586_METADATA_ONLY');
  need(conditions.datasetId===descriptor.datasetId&&conditions.productionReferenceAt===descriptor.productionReferenceAt
    &&same(conditions[ATTEST],snapshot.attestation),'586_WHOLE_PARENT_CHANGED');
  const pairs=pairsFromConditions(conditions,parts);
  need(same([...pairs.keys()].sort(),Object.keys(snapshot.checkpoint.states).sort())
    &&same([...pairs.keys()].sort(),Object.keys(snapshot.checkpoint.candidateGRollbackCompanion.states).sort()),'586_PARTS');
  for(const[id,pair]of pairs){
    const originalI=snapshot.checkpoint.states[id],originalG=snapshot.checkpoint.candidateGRollbackCompanion.states[id];
    const inverseI=structuredClone(pair.integrated),inverseG=structuredClone(pair.candidate);
    need(inverseI.modelBundleSha256===I.modelBundleSha256,'586_CURRENT_PAIR_BINDING');
    inverseI.modelBundleSha256=originalI.modelBundleSha256;
    if(Object.hasOwn(inverseG,'modelBundleSha256')){
      need(inverseG.modelBundleSha256===C.modelBundleSha256,'586_CURRENT_CANDIDATE_BINDING');
      inverseG.modelBundleSha256=originalG.modelBundleSha256;
    }
    need(same(inverseI,originalI)&&same(inverseG,originalG),'586_WHOLE_PAIR_INVERSE');
  }
  need(same(await readPointer(request),before),'SOURCE_CHANGED');
  need(same(await json(path.join(ROOT,'data/live/coastal-parts-v2.json'),16*MB),central),'REGISTRY_CHANGED');
  const handle=Object.freeze({});
  contexts.set(handle,{seed:false,descriptor:structuredClone(descriptor),generationSha256:snapshot.checkpoint.generationSha256,
    parentAttestationSha256:snapshot.attestation.attestationSha256,central,parts,pairs,currentSource,
    consumedParts:new Set(),finalized:false});
  return handle;
}

// Én fast ægte587-forgænger. Aktuel kilde bindes af sourceIdentity/hele I-manifestet;
// controllerens outputpins importeres ikke i modelkernen (ingen selvhashcyklus).
async function readFrozen587LaterOrigin({descriptor,before,request,conditions,central,parts,currentSource}){
  const oldI='5584d8e59f8d21785fd08b32f9beb22cf879cdb4892a11ede24eb862d9a0dca2';
  need(descriptor.modelBinding.modelBundleSha256===oldI&&currentSource.integrated!==oldI,'587_FAMILY');
  const target=Date.parse(process.env.RAVRADAR_PRODUCTION_TARGET_HOUR??'');
  need(Number.isFinite(target)&&target%3600000===0&&target>Date.parse(descriptor.productionReferenceAt),'587_LATER_TARGET');
  const snapshot=assertAuthenticatedFrozen587Snapshot(await readAuthenticatedFrozen587Predecessor());
  need(same(snapshot.descriptor,descriptor)&&same(snapshot.centralContract,central),'587_ORIGINAL_CHANGED');
  const contracts=await privateRuntimeContractHashes(),I=ravScoreModelBinding(),C=candidateBinding();
  need(descriptor.contractHashes.continuationStateContractSha256==='cd3a3648ad5093662871559aa39d77671eda27edf1f9edc82a104c5430a43a21'
    &&snapshot.checkpoint.candidateGRollbackCompanion.modelBinding.modelBundleSha256==='5c0b6a2c6ceb4ba9c5f224cb5d3fda693f300a8902da3f7561167f72cbab78b4',
    '587_FIXED_ORIGINAL_BINDING');
  need(I.modelBundleSha256===currentSource.integrated&&C.modelBundleSha256===currentSource.candidate
    &&contracts.continuationStateContractSha256===currentSource.continuation
    &&C.modelBundleSha256!==snapshot.checkpoint.candidateGRollbackCompanion.modelBinding.modelBundleSha256
    &&contracts.continuationStateContractSha256!==descriptor.contractHashes.continuationStateContractSha256,
    '587_ISSUED_CURRENT_SOURCE');
  need(same({...snapshot.checkpoint.modelBinding,modelBundleSha256:I.modelBundleSha256},I)
    &&same({...snapshot.checkpoint.candidateGRollbackCompanion.modelBinding,modelBundleSha256:C.modelBundleSha256},C)
    &&same({...descriptor.contractHashes,continuationStateContractSha256:contracts.continuationStateContractSha256},contracts),
    '587_METADATA_ONLY');
  need(conditions.datasetId===descriptor.datasetId&&conditions.productionReferenceAt===descriptor.productionReferenceAt
    &&same(conditions[ATTEST],snapshot.attestation),'587_WHOLE_PARENT_CHANGED');
  const pairs=pairsFromConditions(conditions,parts);
  need(same([...pairs.keys()].sort(),Object.keys(snapshot.checkpoint.states).sort())
    &&same([...pairs.keys()].sort(),Object.keys(snapshot.checkpoint.candidateGRollbackCompanion.states).sort()),'587_PARTS');
  for(const[id,pair]of pairs){
    const originalI=snapshot.checkpoint.states[id],originalG=snapshot.checkpoint.candidateGRollbackCompanion.states[id];
    const inverseI=structuredClone(pair.integrated),inverseG=structuredClone(pair.candidate);
    need(inverseI.modelBundleSha256===I.modelBundleSha256,'587_CURRENT_PAIR_BINDING');
    inverseI.modelBundleSha256=originalI.modelBundleSha256;
    if(Object.hasOwn(inverseG,'modelBundleSha256')){
      need(inverseG.modelBundleSha256===C.modelBundleSha256,'587_CURRENT_CANDIDATE_BINDING');
      inverseG.modelBundleSha256=originalG.modelBundleSha256;
    }
    need(same(inverseI,originalI)&&same(inverseG,originalG),'587_WHOLE_PAIR_INVERSE');
  }
  need(same(await readPointer(request),before),'SOURCE_CHANGED');
  need(same(await json(path.join(ROOT,'data/live/coastal-parts-v2.json'),16*MB),central),'REGISTRY_CHANGED');
  const handle=Object.freeze({});
  contexts.set(handle,{seed:false,descriptor:structuredClone(descriptor),generationSha256:snapshot.checkpoint.generationSha256,
    parentAttestationSha256:snapshot.attestation.attestationSha256,central,parts,pairs,currentSource,
    consumedParts:new Set(),finalized:false});
  return handle;
}

// Én fast ægte588-forgænger. Aktuel kilde bindes af sourceIdentity/hele I-manifestet;
// controllerens outputpins importeres ikke i modelkernen (ingen selvhashcyklus).
async function readFrozen588LaterOrigin({descriptor,before,request,conditions,central,parts,currentSource}){
  const oldI='5348f3ae7401d3a09dd180d45690f56b3cfec4a30af5a4928bdd9581f9d8ebac';
  need(descriptor.modelBinding.modelBundleSha256===oldI&&currentSource.integrated!==oldI,'588_FAMILY');
  const target=Date.parse(process.env.RAVRADAR_PRODUCTION_TARGET_HOUR??'');
  need(Number.isFinite(target)&&target%3600000===0&&target>Date.parse(descriptor.productionReferenceAt),'588_LATER_TARGET');
  const snapshot=assertAuthenticatedFrozen588Snapshot(await readAuthenticatedFrozen588Predecessor());
  need(same(snapshot.descriptor,descriptor)&&same(snapshot.centralContract,central),'588_ORIGINAL_CHANGED');
  const contracts=await privateRuntimeContractHashes(),I=ravScoreModelBinding(),C=candidateBinding();
  need(descriptor.contractHashes.continuationStateContractSha256==='d98559d56d7bfe9b141cf1ddab73cddffb688a3b6766f5f9f3779b226f573701'
    &&snapshot.checkpoint.candidateGRollbackCompanion.modelBinding.modelBundleSha256==='00905533cd243ffce8e507beedbc39c8dba26e635b59fa154e6f9ab20575780c',
    '588_FIXED_ORIGINAL_BINDING');
  need(I.modelBundleSha256===currentSource.integrated&&C.modelBundleSha256===currentSource.candidate
    &&contracts.continuationStateContractSha256===currentSource.continuation
    &&C.modelBundleSha256!==snapshot.checkpoint.candidateGRollbackCompanion.modelBinding.modelBundleSha256
    &&contracts.continuationStateContractSha256!==descriptor.contractHashes.continuationStateContractSha256,
    '588_ISSUED_CURRENT_SOURCE');
  need(same({...snapshot.checkpoint.modelBinding,modelBundleSha256:I.modelBundleSha256},I)
    &&same({...snapshot.checkpoint.candidateGRollbackCompanion.modelBinding,modelBundleSha256:C.modelBundleSha256},C)
    &&same({...descriptor.contractHashes,continuationStateContractSha256:contracts.continuationStateContractSha256},contracts),
    '588_METADATA_ONLY');
  need(conditions.datasetId===descriptor.datasetId&&conditions.productionReferenceAt===descriptor.productionReferenceAt
    &&same(conditions[ATTEST],snapshot.attestation),'588_WHOLE_PARENT_CHANGED');
  const pairs=pairsFromConditions(conditions,parts);
  need(same([...pairs.keys()].sort(),Object.keys(snapshot.checkpoint.states).sort())
    &&same([...pairs.keys()].sort(),Object.keys(snapshot.checkpoint.candidateGRollbackCompanion.states).sort()),'588_PARTS');
  for(const[id,pair]of pairs){
    const originalI=snapshot.checkpoint.states[id],originalG=snapshot.checkpoint.candidateGRollbackCompanion.states[id];
    const inverseI=structuredClone(pair.integrated),inverseG=structuredClone(pair.candidate);
    need(inverseI.modelBundleSha256===I.modelBundleSha256,'588_CURRENT_PAIR_BINDING');
    inverseI.modelBundleSha256=originalI.modelBundleSha256;
    if(Object.hasOwn(inverseG,'modelBundleSha256')){
      need(inverseG.modelBundleSha256===C.modelBundleSha256,'588_CURRENT_CANDIDATE_BINDING');
      inverseG.modelBundleSha256=originalG.modelBundleSha256;
    }
    need(same(inverseI,originalI)&&same(inverseG,originalG),'588_WHOLE_PAIR_INVERSE');
  }
  need(same(await readPointer(request),before),'SOURCE_CHANGED');
  need(same(await json(path.join(ROOT,'data/live/coastal-parts-v2.json'),16*MB),central),'REGISTRY_CHANGED');
  const handle=Object.freeze({});
  contexts.set(handle,{seed:false,descriptor:structuredClone(descriptor),generationSha256:snapshot.checkpoint.generationSha256,
    parentAttestationSha256:snapshot.attestation.attestationSha256,central,parts,pairs,currentSource,
    consumedParts:new Set(),finalized:false});
  return handle;
}

// Én fast ægte590-forgænger. Aktuel kilde bindes af sourceIdentity/hele I-manifestet;
// controllerens outputpins importeres ikke i modelkernen (ingen selvhashcyklus).
async function readFrozen590LaterOrigin({descriptor,before,request,conditions,central,parts,currentSource}){
  const oldI='4c94c24e7d14d66c20cc3c2c3d0389cadb0c3e9e76fcfe692943c6087df56819';
  need(descriptor.modelBinding.modelBundleSha256===oldI&&currentSource.integrated!==oldI,'590_FAMILY');
  const target=Date.parse(process.env.RAVRADAR_PRODUCTION_TARGET_HOUR??'');
  need(Number.isFinite(target)&&target%3600000===0&&target>Date.parse(descriptor.productionReferenceAt),'590_LATER_TARGET');
  const snapshot=assertAuthenticatedFrozen590Snapshot(await readAuthenticatedFrozen590Predecessor());
  need(same(snapshot.descriptor,descriptor)&&same(snapshot.centralContract,central),'590_ORIGINAL_CHANGED');
  const contracts=await privateRuntimeContractHashes(),I=ravScoreModelBinding(),C=candidateBinding();
  need(descriptor.contractHashes.continuationStateContractSha256==='d444e6141038f56dd04b97a55eefe07bbd98f122fb3b76a43bdddacff2d88c8a'
    &&snapshot.checkpoint.candidateGRollbackCompanion.modelBinding.modelBundleSha256==='bca59cb435cb3f35041c665d2954f0ef04b189b572219771fc5628e4f7ccb551',
    '590_FIXED_ORIGINAL_BINDING');
  need(I.modelBundleSha256===currentSource.integrated&&C.modelBundleSha256===currentSource.candidate
    &&contracts.continuationStateContractSha256===currentSource.continuation
    &&C.modelBundleSha256!==snapshot.checkpoint.candidateGRollbackCompanion.modelBinding.modelBundleSha256
    &&contracts.continuationStateContractSha256!==descriptor.contractHashes.continuationStateContractSha256,
    '590_ISSUED_CURRENT_SOURCE');
  need(same({...snapshot.checkpoint.modelBinding,modelBundleSha256:I.modelBundleSha256},I)
    &&same({...snapshot.checkpoint.candidateGRollbackCompanion.modelBinding,modelBundleSha256:C.modelBundleSha256},C)
    &&same({...descriptor.contractHashes,continuationStateContractSha256:contracts.continuationStateContractSha256},contracts),
    '590_METADATA_ONLY');
  need(conditions.datasetId===descriptor.datasetId&&conditions.productionReferenceAt===descriptor.productionReferenceAt
    &&same(conditions[ATTEST],snapshot.attestation),'590_WHOLE_PARENT_CHANGED');
  const pairs=pairsFromConditions(conditions,parts);
  need(same([...pairs.keys()].sort(),Object.keys(snapshot.checkpoint.states).sort())
    &&same([...pairs.keys()].sort(),Object.keys(snapshot.checkpoint.candidateGRollbackCompanion.states).sort()),'590_PARTS');
  for(const[id,pair]of pairs){
    const originalI=snapshot.checkpoint.states[id],originalG=snapshot.checkpoint.candidateGRollbackCompanion.states[id];
    const inverseI=structuredClone(pair.integrated),inverseG=structuredClone(pair.candidate);
    need(inverseI.modelBundleSha256===I.modelBundleSha256,'590_CURRENT_PAIR_BINDING');
    inverseI.modelBundleSha256=originalI.modelBundleSha256;
    if(Object.hasOwn(inverseG,'modelBundleSha256')){
      need(inverseG.modelBundleSha256===C.modelBundleSha256,'590_CURRENT_CANDIDATE_BINDING');
      inverseG.modelBundleSha256=originalG.modelBundleSha256;
    }
    need(same(inverseI,originalI)&&same(inverseG,originalG),'590_WHOLE_PAIR_INVERSE');
  }
  need(same(await readPointer(request),before),'SOURCE_CHANGED');
  need(same(await json(path.join(ROOT,'data/live/coastal-parts-v2.json'),16*MB),central),'REGISTRY_CHANGED');
  const handle=Object.freeze({});
  contexts.set(handle,{seed:false,descriptor:structuredClone(descriptor),generationSha256:snapshot.checkpoint.generationSha256,
    parentAttestationSha256:snapshot.attestation.attestationSha256,central,parts,pairs,currentSource,
    consumedParts:new Set(),finalized:false});
  return handle;
}

// Separate genuine591 later-H0 origin. The old590 implementation remains byte-whole above.
async function readFrozen591LaterOrigin({descriptor,before,request,conditions,central,parts,currentSource}){
  const oldI='ebd5ac3dac09b7afb51e46d18920f6932b478b7ef15bdd31190c128273cb6a54';
  need(descriptor.modelBinding.modelBundleSha256===oldI&&currentSource.integrated!==oldI,'591_FAMILY');
  const target=Date.parse(process.env.RAVRADAR_PRODUCTION_TARGET_HOUR??'');
  need(Number.isFinite(target)&&target%3600000===0&&target>Date.parse(descriptor.productionReferenceAt),'591_LATER_TARGET');
  const snapshot=assertAuthenticatedFrozen591Snapshot(await readAuthenticatedFrozen591Predecessor());
  need(same(snapshot.descriptor,descriptor)&&same(snapshot.centralContract,central),'591_ORIGINAL_CHANGED');
  const contracts=await privateRuntimeContractHashes(),I=ravScoreModelBinding(),C=candidateBinding();
  need(descriptor.contractHashes.continuationStateContractSha256==='b490f11d14cfe607839d7848bbcdb8e9df7abdfe62c82983e5247fb4ca3dcc0d'
    &&snapshot.checkpoint.candidateGRollbackCompanion.modelBinding.modelBundleSha256==='38738b7d7d3bfd74958ab2453422f2416338e99dac53d12f7098ad8c3539ec64',
    '591_FIXED_ORIGINAL_BINDING');
  need(I.modelBundleSha256===currentSource.integrated&&C.modelBundleSha256===currentSource.candidate
    &&contracts.continuationStateContractSha256===currentSource.continuation
    &&C.modelBundleSha256!==snapshot.checkpoint.candidateGRollbackCompanion.modelBinding.modelBundleSha256
    &&contracts.continuationStateContractSha256!==descriptor.contractHashes.continuationStateContractSha256,
    '591_ISSUED_CURRENT_SOURCE');
  need(same({...snapshot.checkpoint.modelBinding,modelBundleSha256:I.modelBundleSha256},I)
    &&same({...snapshot.checkpoint.candidateGRollbackCompanion.modelBinding,modelBundleSha256:C.modelBundleSha256},C)
    &&same({...descriptor.contractHashes,continuationStateContractSha256:contracts.continuationStateContractSha256},contracts),
    '591_METADATA_ONLY');
  need(conditions.datasetId===descriptor.datasetId&&conditions.productionReferenceAt===descriptor.productionReferenceAt
    &&same(conditions[ATTEST],snapshot.attestation),'591_WHOLE_PARENT_CHANGED');
  const pairs=pairsFromConditions(conditions,parts);
  need(same([...pairs.keys()].sort(),Object.keys(snapshot.checkpoint.states).sort())
    &&same([...pairs.keys()].sort(),Object.keys(snapshot.checkpoint.candidateGRollbackCompanion.states).sort()),'591_PARTS');
  for(const[id,pair]of pairs){
    const originalI=snapshot.checkpoint.states[id],originalG=snapshot.checkpoint.candidateGRollbackCompanion.states[id];
    const inverseI=structuredClone(pair.integrated),inverseG=structuredClone(pair.candidate);
    need(inverseI.modelBundleSha256===I.modelBundleSha256,'591_CURRENT_PAIR_BINDING');
    inverseI.modelBundleSha256=originalI.modelBundleSha256;
    if(Object.hasOwn(inverseG,'modelBundleSha256')){
      need(inverseG.modelBundleSha256===C.modelBundleSha256,'591_CURRENT_CANDIDATE_BINDING');
      inverseG.modelBundleSha256=originalG.modelBundleSha256;
    }
    need(same(inverseI,originalI)&&same(inverseG,originalG),'591_WHOLE_PAIR_INVERSE');
  }
  need(same(await readPointer(request),before),'SOURCE_CHANGED');
  need(same(await json(path.join(ROOT,'data/live/coastal-parts-v2.json'),16*MB),central),'REGISTRY_CHANGED');
  const handle=Object.freeze({});
  contexts.set(handle,{seed:false,descriptor:structuredClone(descriptor),generationSha256:snapshot.checkpoint.generationSha256,
    parentAttestationSha256:snapshot.attestation.attestationSha256,central,parts,pairs,currentSource,
    consumedParts:new Set(),finalized:false});
  return handle;
}
async function readOrigin(centralContract, seedOnly) {
  const currentSource = await sourceIdentity();
  const registry = await json(path.join(ROOT, 'data/live/coastal-parts-v2.json'), 16 * MB);
  const central = seedOnly ? registry : structuredClone(centralContract), parts = registryParts(central);
  if (!seedOnly) need(same(registry, central), 'REGISTRY_CHANGED');
  const privateRoot = process.env[seedOnly ? 'RAVRADAR_PREDECESSOR_PRIVATE_ROOT' : 'RAVRADAR_PRIVATE_RUNTIME_ROOT'];
  const bundlePath = process.env[seedOnly ? 'RAVRADAR_PREDECESSOR_PRIVATE_BUNDLE' : 'RAVRADAR_PRIVATE_RUNTIME_BUNDLE'];
  need(typeof privateRoot === 'string' && path.isAbsolute(privateRoot) && typeof bundlePath === 'string'
    && path.isAbsolute(bundlePath) && path.dirname(bundlePath) === privateRoot, 'FIXED_WORKFLOW_PATHS');
  const request = createProtectedPrivateRuntimeClients({ storageBackend: 'supabase' }).documentRequest;
  const checkpointRequest = createProtectedRavScoreCheckpointRequester();
  const before = await readPointer(request), descriptor = before.pointer.current;
  const seed = descriptor.bundleContentSha256 === SEED.B;
  if (seedOnly) need(seed, 'SEED_CONTENT_CHANGED');
  const conditionsMaximum = !seed && (descriptor.modelBinding.modelBundleSha256 === currentSource.integrated
    || descriptor.modelBinding.modelBundleSha256 === 'ebd5ac3dac09b7afb51e46d18920f6932b478b7ef15bdd31190c128273cb6a54')
    ? PRIVATE_CONDITIONS_MAX_BYTES : MAX_CONDITIONS;
  let conditions = seedOnly ? null : await json(path.join(ROOT, 'data/live/conditions.json'), conditionsMaximum);
  // Unknown/legacy input retains its OLD normal transitions; a claimed clean
  // origin cannot silently downgrade to that route after a failed check.
  if (!seed && descriptor.modelBinding.modelBundleSha256 !== currentSource.integrated) {
    if(descriptor.modelBinding.modelBundleSha256==='6d8f7cca203b5f7ee5155f3c0cdb39403a02fd0eb30fecaca5070ef9f814a805')
      return readFrozen586LaterOrigin({descriptor,before,request,conditions,central,parts,currentSource});
    if(descriptor.modelBinding.modelBundleSha256==='5584d8e59f8d21785fd08b32f9beb22cf879cdb4892a11ede24eb862d9a0dca2')
      return readFrozen587LaterOrigin({descriptor,before,request,conditions,central,parts,currentSource});
    if(descriptor.modelBinding.modelBundleSha256==='5348f3ae7401d3a09dd180d45690f56b3cfec4a30af5a4928bdd9581f9d8ebac')
      return readFrozen588LaterOrigin({descriptor,before,request,conditions,central,parts,currentSource});
    if(descriptor.modelBinding.modelBundleSha256==='4c94c24e7d14d66c20cc3c2c3d0389cadb0c3e9e76fcfe692943c6087df56819')
      return readFrozen590LaterOrigin({descriptor,before,request,conditions,central,parts,currentSource});
    if(descriptor.modelBinding.modelBundleSha256==='ebd5ac3dac09b7afb51e46d18920f6932b478b7ef15bdd31190c128273cb6a54')
      return readFrozen591LaterOrigin({descriptor,before,request,conditions,central,parts,currentSource});
    need(conditions[ATTEST] === undefined, 'UNSUPPORTED_ATTESTED_FAMILY');
    need(!(descriptor.datasetId === SEED.datasetId && descriptor.productionReferenceAt === SEED.referenceAt
      && descriptor.modelBinding.modelBundleSha256 === SEED.I), 'SEED_CONTENT_CHANGED');
    return null;
  }
  if (seed) need(descriptor.sourceHead === SEED.producer && descriptor.datasetId === SEED.datasetId
    && descriptor.productionReferenceAt === SEED.referenceAt, 'SEED_IDENTITY');
  const temporaryRoot = await fs.realpath(os.tmpdir());
  const work = await fs.mkdtemp(path.join(temporaryRoot, 'rr-established-current-origin-'));
  const workIdentity = await fs.lstat(work, { bigint: true }), workParents = await noLinks(work);
  let derived, saved, originalConditions, first;
  try {
    const qualify = async sourceRoot => {
      const load = file => import(pathToFileURL(path.join(sourceRoot, file)).href);
      const bundle = seed ? await load('scripts/private-production-runtime-bundle.mjs') : { verifyPrivateProductionRuntimeBundle };
      const normalS = seed ? await load('scripts/ravscore-continuation-checkpoint.mjs') : { saveRavScoreContinuationCheckpoint };
      const protectedS = seed ? await load('scripts/protected-ravscore-continuation-checkpoint.mjs') : { restoreProtectedRavScoreContinuationCheckpoint };
      const verified = await bundle.verifyPrivateProductionRuntimeBundle({ privateRoot, bundlePath, repositoryRoot: sourceRoot,
        expected: { modelBinding: descriptor.modelBinding, contractHashes: descriptor.contractHashes,
          datasetId: descriptor.datasetId, productionReferenceAt: descriptor.productionReferenceAt,
          generatedAt: descriptor.generatedAt, bundleContentSha256: descriptor.bundleContentSha256 } });
      const originalBytes = await ownedBytes(path.join(bundlePath, 'payload/data/live/conditions.json'),
        seed ? MAX_CONDITIONS : PRIVATE_CONDITIONS_MAX_BYTES);
      const file = verified.files.find(row => row.relativePath === 'data/live/conditions.json');
      need(file && file.bytes === originalBytes.length && file.sha256 === sha(originalBytes), 'B_CONDITIONS_CHANGED');
      originalConditions = JSON.parse(originalBytes);
      if (seedOnly) {
        // Registry is the fixed normally hydrated central snapshot, NOT an
        // invented extra B inventory member. Seed metadata cannot also stage
        // new points: every authenticated OLD pair must match this registry.
        const oldI = await load('scripts/lib/coastal-point-staging-contract.mjs');
        const oldG = await load('scripts/lib/ravscore-candidate-g-rollback-runtime.mjs');
        for (const [id, pair] of pairsFromConditions(originalConditions, parts, { requireCurrentContext: false })) {
          const part = parts.get(id), samplingContextKey = ravScoreSamplingContextKey(part);
          need(pair.context === samplingContextKey, 'SEED_POINT_CHANGED');
          oldI.assertIntegratedCoastalPointContinuation(pair.integrated, { samplingContextKey });
          oldG.assertCandidateGRollbackContinuation(pair.candidate, part);
        }
        conditions = originalConditions;
      }
      const normalPath = path.join(work, 'b-derived.json'), protectedPath = path.join(work, '.cache/ravscore-continuation-checkpoint/checkpoint.json');
      await normalS.saveRavScoreContinuationCheckpoint({ sourcePath: path.join(bundlePath, 'payload/data/live/conditions.json'),
        checkpointPath: normalPath, repositoryRoot: sourceRoot });
      await protectedS.restoreProtectedRavScoreContinuationCheckpoint({ checkpointPath: protectedPath,
        targetReference: descriptor.productionReferenceAt, request: checkpointRequest });
      derived = await json(normalPath, 16 * MB); saved = await json(protectedPath, 16 * MB);
      need(same(derived, saved), 'B_S_DIFFER');
    };
    if (seed) await withNativeCurrentReanalysisPredecessorSource(qualify); else await qualify(ROOT);
  } catch (error) { first = error; }
  try {
    await sameParents(workParents); const after = await fs.lstat(work, { bigint: true });
    need(path.dirname(work) === temporaryRoot && after.isDirectory() && !after.isSymbolicLink()
      && after.dev === workIdentity.dev && after.ino === workIdentity.ino, 'WORK_CHANGED');
    await fs.rm(work, { recursive: true, force: false });
  } catch (error) { first ??= error; }
  if (first) throw first;
  if (seed) need(saved.generationSha256 === SEED.S && saved.candidateGRollbackCompanion?.stateSha256 === SEED.G, 'SEED_S');
  // Providers may update unrelated working weather. They may NEVER replace
  // the authenticated H0 pair. Compare WHOLE states, not whole mutable files.
  need(conditions.datasetId === descriptor.datasetId
    && conditions.productionReferenceAt === descriptor.productionReferenceAt, 'WORKING_IDENTITY_CHANGED');
  const pairs = pairsFromConditions(conditions, parts, { requireCurrentContext: false });
  for (const [id, pair] of pairs) need(same(pair.integrated, saved.states[id])
    && same(pair.candidate, saved.candidateGRollbackCompanion.states[id]), 'WORKING_H0_CHANGED');
  // H0 parity alone does not authenticate an arbitrary working root marker.
  // The attestation MUST itself be in the exact hashed immutable B payload.
  need(same(conditions[ATTEST], originalConditions[ATTEST]), 'WORKING_ATTESTATION_CHANGED');
  if (seed) need(originalConditions[ATTEST] === undefined, 'UNEXPECTED_SEED_ATTESTATION');
  else if (originalConditions[ATTEST] !== undefined) {
    await sourceIdentity(originalConditions[ATTEST]?.producer?.sourceHead);
    if (originalConditions[ATTEST]?.kind === METADATA585_KIND
      && originalConditions[ATTEST]?.predecessor?.sourceFamilyHead === METADATA585_SOURCE)
      await validateMetadata585Attestation(originalConditions[ATTEST], { descriptor, conditions: originalConditions, central, pairs, currentSource });
    else if (originalConditions[ATTEST]?.kind === METADATA584_KIND)
      await validateMetadata584Attestation(originalConditions[ATTEST], { descriptor, conditions: originalConditions, central, pairs, currentSource });
    else validateAttestation(originalConditions[ATTEST], { descriptor, conditions: originalConditions, central, pairs, currentSource });
  } else return null;
  need(same(await readPointer(request), before), 'SOURCE_CHANGED');
  if (!seedOnly) need(same(centralContract, central), 'SOURCE_CHANGED');
  need(same(await json(path.join(ROOT, 'data/live/coastal-parts-v2.json'), 16 * MB), central), 'REGISTRY_CHANGED');
  const handle = Object.freeze({});
  contexts.set(handle, { seed, descriptor: structuredClone(descriptor), generationSha256: saved.generationSha256,
    parentAttestationSha256: originalConditions[ATTEST]?.attestationSha256 ?? null, central, parts, pairs, currentSource,
    consumedParts: new Set(), finalized: false });
  return handle;
}

export async function readEstablishedNativeCurrentOrigin(centralContract) {
  need(arguments.length === 1, 'ARGUMENTS'); return readOrigin(centralContract, false);
}

// First metadata-only preparation precedes installing OLD B into main.
// Authenticate the fixed predecessor B/S directly, never synthesize working
// H0 or borrow a consumed older migration grant. Environment checks can only
// reject the wrong workflow; the exact immutable B/S remain the authority.
export async function readEstablishedNativeCurrentSeedOrigin() {
  need(arguments.length === 0, 'ARGUMENTS');
  for (const [key, value] of Object.entries({ GITHUB_WORKFLOW: 'Deploy RavRadar code-only repair',
    GITHUB_EVENT_NAME: 'workflow_dispatch', GITHUB_REF: 'refs/heads/main', GITHUB_RUN_ATTEMPT: '1',
    RAVRADAR_ESTABLISHED_NATIVE_CURRENT_ORIGIN_WRITER_ACTIVE: 'false',
    RAVRADAR_ESTABLISHED_NATIVE_CURRENT_ORIGIN_CONFIRMATION: 'DEPLOY-CODE-ONLY-REPAIR' })) need(process.env[key] === value, 'SEED_WORKFLOW');
  const optIn=process.env.RAVRADAR_ESTABLISHED_NATIVE_CURRENT_ORIGIN_UPGRADE_OPT_IN;
  const phase=process.env.RAVRADAR_ESTABLISHED_NATIVE_CURRENT_ORIGIN_PHASE;
  // Installed reentry never reinstalls SQL. The normal workflow first reads
  // the actual installed contracts; exact immutable seed B/S remain authority.
  need((optIn==='true'&&phase==='before')||(optIn==='false'&&phase==='installed'),'SEED_WORKFLOW');
  return readOrigin(null, true);
}

// A historical seed handle authorizes only numerical-identical metadata
// preparation. New-model origin handles qualify exactly their admitted pairs.
export function assertEstablishedNativeCurrentOriginForPart(handle, { part, integrated, candidate }) {
  need(arguments.length === 2, 'ARGUMENTS'); const context = contexts.get(handle);
  need(context && !context.seed && !context.restart && !context.finalized, 'HANDLE'); const admitted = context.pairs.get(part?.partId);
  need(admitted && same(part, context.parts.get(part.partId))
    && admitted.context === ravScoreSamplingContextKey(part)
    && same(integrated, admitted.integrated) && same(candidate, admitted.candidate), 'SELECTED_PAIR_DIFFER');
  need(!context.consumedParts.has(part.partId), 'PAIR_ALREADY_CONSUMED');
  assertIntegratedCoastalPointContinuation(integrated, { samplingContextKey: ravScoreSamplingContextKey(part) });
  assertCandidateGRollbackContinuation(candidate, part);
  context.consumedParts.add(part.partId);
  return true;
}

export async function buildEstablishedNativeCurrentOriginAttestation(handle, { centralContract, conditions, partResults }) {
  need(arguments.length === 2, 'ARGUMENTS'); const context = contexts.get(handle); need(context && !context.finalized, 'HANDLE');
  if (context.restart) return buildArchivedCurrentOriginRestartAttestation(context, handle, { centralContract, conditions, partResults });
  const currentSource = await sourceIdentity(); need(same(currentSource, context.currentSource)
    && same(centralContract, context.central), 'SOURCE_CHANGED');
  const pairs = pairsFromConditions(conditions, context.parts);
  let transition;
  if (context.seed) {
    need(partResults === null && conditions.datasetId === SEED.datasetId && conditions.productionReferenceAt === SEED.referenceAt, 'SEED_TARGET');
    for (const [id, pair] of pairs) {
      const old = context.pairs.get(id), inverseI = structuredClone(pair.integrated), inverseG = structuredClone(pair.candidate);
      inverseI.modelBundleSha256 = old.integrated.modelBundleSha256;
      if (Object.hasOwn(inverseG, 'modelBundleSha256')) inverseG.modelBundleSha256 = old.candidate.modelBundleSha256;
      need(same(inverseI, old.integrated) && same(inverseG, old.candidate), 'SEED_NUMERICAL_CHANGE');
    }
    transition = 'SEED_METADATA_ONLY';
  } else {
    need(partResults instanceof Map && same([...partResults.keys()].sort(), [...context.parts.keys()].sort())
      && hour(conditions.productionReferenceAt) && Date.parse(conditions.productionReferenceAt) > Date.parse(context.descriptor.productionReferenceAt), 'FOLLOWER_TARGET');
    const { assertEstablishedNativeCurrentProductionResult } = await import('./ravscore-production-part-pipeline.mjs');
    for (const [id, part] of context.parts) {
      const actual = assertEstablishedNativeCurrentProductionResult(partResults.get(id),
        { originHandle: handle, part, targetReferenceAt: conditions.productionReferenceAt });
      need(same(actual.integrated, pairs.get(id).integrated) && same(actual.candidate, pairs.get(id).candidate), 'PRODUCED_PAIR_DIFFER');
    }
    transition = 'NORMAL_STRICT_CONTINUATION';
  }
  const content = { schemaVersion: 1, kind: KIND, semanticContract: ESTABLISHED_NATIVE_CURRENT_SEMANTIC_CONTRACT,
    seed: { ...SEED }, parent: { bundleContentSha256: context.descriptor.bundleContentSha256,
      generationSha256: context.generationSha256, attestationSha256: context.parentAttestationSha256 },
    producer: { ...currentSource }, datasetId: conditions.datasetId, referenceAt: conditions.productionReferenceAt,
    registrySha256: digest(context.central), contextRegistrySha256: contextDigest(pairs), pairsSha256: pairsDigest(pairs), transition };
  const attest = { ...content, attestationSha256: digest(content) };
  need(Buffer.byteLength(canonical(attest)) <= MAX_ATTEST, 'ATTESTATION_SIZE');
  context.finalized = true;
  return freeze(attest);
}

// One explicit metadata event after a genuine 584 snapshot. The predecessor's
// WHOLE attestation remains an immutable nested value, including its actual
// kind, complete archive/normal parent, restart scope and original hash.
// This is neither a seed event nor new numerical/ForPart authority.
const METADATA584_KIND = 'PRIVATE_ORIGINAL_BOUND_SAME_H0_METADATA';
const metadata584Consumed = new WeakSet();
const METADATA584_SOURCE = 'ee029982538c67dea39880bc7b33f3508c10cf9c';
function metadata584InversePair(pair) {
  const integrated = structuredClone(pair.integrated), candidate = structuredClone(pair.candidate);
  need(integrated.modelBundleSha256 === ravScoreModelBinding().modelBundleSha256, 'METADATA_BINDING');
  integrated.modelBundleSha256 = 'bb0da11642d1aff76fc4f821114d923aa9897c41abd543df0fa6166290075947';
  if (Object.hasOwn(candidate, 'modelBundleSha256')) {
    need(candidate.modelBundleSha256 === candidateBinding().modelBundleSha256, 'METADATA_BINDING');
    candidate.modelBundleSha256 = '47a27aec034d8d7cbab7755a19025d796b6fe51c2b276676c7309c912a85f501';
  }
  return { integrated, candidate };
}
async function validateMetadata584Attestation(attest, { descriptor, conditions, central, pairs, currentSource }) {
  need(exact(attest, ['schemaVersion','kind','semanticContract','predecessor','parent','producer','datasetId',
    'referenceAt','registrySha256','contextRegistrySha256','pairsSha256','transition','attestationSha256'])
    && attest.schemaVersion === 1 && attest.kind === METADATA584_KIND
    && attest.semanticContract === ESTABLISHED_NATIVE_CURRENT_SEMANTIC_CONTRACT
    && attest.transition === 'SAME_H0_MODEL_METADATA' && SHA.test(attest.attestationSha256), 'METADATA_ATTESTATION');
  const { attestationSha256, ...content } = attest;
  need(digest(content) === attestationSha256 && Buffer.byteLength(canonical(attest)) <= MAX_ATTEST, 'METADATA_ATTESTATION_HASH');
  need(exact(attest.predecessor, ['sourceFamilyHead','descriptor','attestation'])
    && attest.predecessor.sourceFamilyHead === METADATA584_SOURCE
    && exact(attest.parent, ['bundleContentSha256','generationSha256','attestationSha256'])
    && Object.values(attest.parent).every(value => SHA.test(value)), 'METADATA_PARENT');
  const old = attest.predecessor;
  need(old.descriptor?.bundleContentSha256 === attest.parent.bundleContentSha256
    && old.attestation?.attestationSha256 === attest.parent.attestationSha256
    && old.descriptor?.datasetId === conditions.datasetId
    && old.descriptor?.productionReferenceAt === conditions.productionReferenceAt
    && attest.datasetId === descriptor.datasetId && attest.datasetId === conditions.datasetId
    && attest.referenceAt === descriptor.productionReferenceAt && attest.referenceAt === conditions.productionReferenceAt
    && attest.registrySha256 === digest(central) && attest.contextRegistrySha256 === contextDigest(pairs)
    && attest.pairsSha256 === pairsDigest(pairs)
    && exact(attest.producer, Object.keys(currentSource))
    && same({ ...attest.producer, sourceHead: currentSource.sourceHead }, currentSource)
    && attest.producer.sourceHead === descriptor.sourceHead, 'METADATA_ATTESTED_SOURCE');
  // The producer is compared with the genuine OLD Git family, never with
  // future changed origin bytes. This is an assert-only source check.
  need(HEAD.test(old.descriptor.sourceHead), 'METADATA_OLD_PRODUCER');
  await git(['merge-base','--is-ancestor',old.descriptor.sourceHead,currentSource.sourceHead]);
  for (const file of ['scripts/lib/established-native-current-origin.mjs','scripts/lib/ravscore-production-part-pipeline.mjs'])
    need(await git(['rev-parse',old.descriptor.sourceHead + ':' + file])
      === await git(['rev-parse',METADATA584_SOURCE + ':' + file]), 'METADATA_OLD_PRODUCER');
  need(await git(['rev-parse',old.descriptor.sourceHead + ':scripts/lib/dmi-marine-zone-exclusions.json'])
    === SEED.ownerPolicyGitBlob, 'METADATA_OLD_POLICY');
  // A small derived ASSERTION VIEW, not an original B or a snapshot handle.
  // Restore only the two model metadata fields; every unknown state field and
  // all 673 actual numeric/history/context values remain exact copies.
  const inverse = new Map([...pairs].map(([id,pair]) => [id,metadata584InversePair(pair)]));
  const oldPairView = { datasetId: conditions.datasetId, productionReferenceAt: conditions.productionReferenceAt,
    coastalParts: { parts: Object.fromEntries([...inverse].map(([id,pair]) => [id,{ravScoreModel:{currentState:pair.integrated}}])) },
    ravScoreCandidateGWarmup: { runtime: { parts: Object.fromEntries([...inverse]
      .map(([id,pair]) => [id,{ravScoreModel:{currentState:pair.candidate}}])) } },
    [ATTEST]: structuredClone(old.attestation) };
  await withAuthenticated584PredecessorSource(async frozenRoot => {
    const module = await import(pathToFileURL(path.join(frozenRoot,
      'scripts/lib/established-native-current-origin-584-assertion.mjs')).href);
    await module.assertFrozen584MetadataOriginData({ descriptor: old.descriptor, conditions: oldPairView,
      centralContract: central });
  });
}
export async function buildEstablishedNativeCurrent584MetadataAttestation(handle, options) {
  need(arguments.length === 2 && exact(options, ['centralContract','conditions']), 'ARGUMENTS');
  const old = assertAuthenticatedFrozen584Snapshot(handle);
  need(!metadata584Consumed.has(handle), 'METADATA_ALREADY_CONSUMED');
  // Admission requires BOTH complete normal generated-model checks, not a
  // caller tuple/flag or hash inequality. No static builder/NEXT import may
  // make this bound source depend on its own generated checksum.
  const builders = ['scripts/build-candidate-g-rollback-bundle.mjs', 'scripts/build-ravscore-model-bundle.mjs'];
  await git(['diff', '--exit-code', 'HEAD', '--', ...builders,
    'scripts/lib/model-source-imports.mjs', 'scripts/lib/static-module-closure.mjs']);
  for (const builder of builders) await exec(process.execPath, [path.join(ROOT, builder), '--check'],
    { cwd: ROOT, env: sourceEnv(), encoding: 'utf8', maxBuffer: 2 * MB, timeout: 60000 });
  const currentSource = await sourceIdentity(), contracts = await privateRuntimeContractHashes();
  const oldI = old.checkpoint.modelBinding, oldC = old.checkpoint.candidateGRollbackCompanion.modelBinding;
  need(currentSource.integrated !== oldI.modelBundleSha256
    && currentSource.candidate !== oldC.modelBundleSha256
    && currentSource.continuation !== old.checkpoint.continuationStateContractSha256, 'METADATA_UNISSUED');
  need(same({ ...oldI, modelBundleSha256: currentSource.integrated }, ravScoreModelBinding())
    && same({ ...oldC, modelBundleSha256: currentSource.candidate }, candidateBinding())
    && same({ ...old.descriptor.contractHashes, continuationStateContractSha256: currentSource.continuation }, contracts),
  'METADATA_CONTRACT_CHANGED');
  const {centralContract,conditions} = options;
  need(same(centralContract,old.centralContract), 'METADATA_REGISTRY_CHANGED');
  const parts = registryParts(centralContract), pairs = pairsFromConditions(conditions,parts);
  need(conditions.datasetId === old.descriptor.datasetId
    && conditions.productionReferenceAt === old.descriptor.productionReferenceAt
    && same(conditions[ATTEST],old.attestation), 'METADATA_TARGET_CHANGED');
  for (const [id,pair] of pairs) {
    const inverse = metadata584InversePair(pair);
    need(same(inverse.integrated,old.checkpoint.states[id])
      && same(inverse.candidate,old.checkpoint.candidateGRollbackCompanion.states[id]), 'METADATA_NUMERICAL_CHANGE');
  }
  need(same(await sourceIdentity(),currentSource), 'SOURCE_CHANGED');
  const content = { schemaVersion:1,kind:METADATA584_KIND,semanticContract:ESTABLISHED_NATIVE_CURRENT_SEMANTIC_CONTRACT,
    predecessor:{sourceFamilyHead:METADATA584_SOURCE,descriptor:structuredClone(old.descriptor),attestation:structuredClone(old.attestation)},
    parent:{bundleContentSha256:old.descriptor.bundleContentSha256,generationSha256:old.checkpoint.generationSha256,
      attestationSha256:old.attestation.attestationSha256},
    producer:{...currentSource},datasetId:conditions.datasetId,referenceAt:conditions.productionReferenceAt,
    registrySha256:digest(centralContract),contextRegistrySha256:contextDigest(pairs),pairsSha256:pairsDigest(pairs),
    transition:'SAME_H0_MODEL_METADATA' };
  const attestation = {...content,attestationSha256:digest(content)};
  await validateMetadata584Attestation(attestation,{descriptor:{...old.descriptor,sourceHead:currentSource.sourceHead},
    conditions,central:centralContract,pairs,currentSource});
  need(same(await sourceIdentity(),currentSource), 'SOURCE_CHANGED');
  metadata584Consumed.add(handle);
  return freeze(attestation);
}

// Assert-only B-before-S reentry seam. Callers must first authenticate the
// immutable CURRENT B and restore old584 S with its genuine normal reader.
// This creates no handle and permits no arbitrary same-time numerical write.
export async function assertEstablishedNativeCurrent584MetadataCheckpoint(options) {
  need(arguments.length === 1 && exact(options,['descriptor','conditions','centralContract','previousCheckpoint','incomingCheckpoint']), 'ARGUMENTS');
  const {descriptor,conditions,centralContract,previousCheckpoint:old,incomingCheckpoint:incoming} = options;
  const currentSource = await sourceIdentity(descriptor?.sourceHead);
  const parts = registryParts(centralContract), pairs = pairsFromConditions(conditions,parts);
  await validateMetadata584Attestation(conditions[ATTEST],{descriptor,conditions,central:centralContract,pairs,currentSource});
  need(old?.modelBinding?.modelBundleSha256 === 'bb0da11642d1aff76fc4f821114d923aa9897c41abd543df0fa6166290075947'
    && old?.candidateGRollbackCompanion?.modelBinding?.modelBundleSha256 === '47a27aec034d8d7cbab7755a19025d796b6fe51c2b276676c7309c912a85f501'
    && old.continuationStateContractSha256 === '7532755a43f8bb2ccc125efa3aa747ed03365b720d13addfcdb91ce4b74d908c'
    && old.datasetId === descriptor.datasetId && incoming?.datasetId === descriptor.datasetId
    && old.productionReferenceAt === descriptor.productionReferenceAt && incoming.productionReferenceAt === descriptor.productionReferenceAt
    && conditions[ATTEST].parent.generationSha256 === old.generationSha256
    && incoming.modelBinding.modelBundleSha256 === currentSource.integrated
    && incoming.candidateGRollbackCompanion?.modelBinding?.modelBundleSha256 === currentSource.candidate
    && incoming.continuationStateContractSha256 === currentSource.continuation, 'METADATA_CHECKPOINT_SCOPE');
  need(same(Object.keys(incoming.states ?? {}).sort(),[...parts.keys()].sort())
    && same(Object.keys(incoming.candidateGRollbackCompanion.states ?? {}).sort(),[...parts.keys()].sort()), 'PARTS');
  for(const[id,pair]of pairs) need(same(pair.integrated,incoming.states[id])
    && same(pair.candidate,incoming.candidateGRollbackCompanion.states[id]), 'METADATA_INCOMING_B_S_DIFFER');
  const inverse = structuredClone(incoming);
  inverse.modelBinding.modelBundleSha256 = old.modelBinding.modelBundleSha256;
  inverse.candidateGRollbackCompanion.modelBinding.modelBundleSha256 = old.candidateGRollbackCompanion.modelBinding.modelBundleSha256;
  inverse.continuationStateContractSha256 = old.continuationStateContractSha256;
  for(const[id,state]of Object.entries(inverse.states)){
    need(state.modelBundleSha256 === currentSource.integrated && old.states?.[id], 'METADATA_BINDING');
    state.modelBundleSha256 = old.states[id].modelBundleSha256;
  }
  inverse.generationSha256 = old.generationSha256;
  inverse.stateSha256 = old.stateSha256;
  inverse.candidateGRollbackCompanion.generationSha256 = old.candidateGRollbackCompanion.generationSha256;
  need(same(inverse,old), 'METADATA_CHECKPOINT_NUMERICAL_CHANGE');
  need(same(await sourceIdentity(descriptor.sourceHead),currentSource), 'SOURCE_CHANGED');
  return true;
}


// One explicit metadata event after a genuine585 snapshot. The predecessor's
// WHOLE attestation remains an immutable nested value, including its actual
// kind, complete archive/normal parent, restart scope and original hash.
// This is neither a seed event nor new numerical/ForPart authority.
const METADATA585_KIND = 'PRIVATE_ORIGINAL_BOUND_SAME_H0_METADATA';
const metadata585Consumed = new WeakSet();
const METADATA585_SOURCE = 'e8f9f7197d9e262720b7627b4970d3da82baa9d9';
function metadata585InversePair(pair) {
  const integrated = structuredClone(pair.integrated), candidate = structuredClone(pair.candidate);
  need(integrated.modelBundleSha256 === ravScoreModelBinding().modelBundleSha256, 'METADATA_BINDING');
  integrated.modelBundleSha256 = '31bbb9a98f4df93804a9d4bcdff50fe5e9b1c880e04492d2c596079488a6bfa2';
  if (Object.hasOwn(candidate, 'modelBundleSha256')) {
    need(candidate.modelBundleSha256 === candidateBinding().modelBundleSha256, 'METADATA_BINDING');
    candidate.modelBundleSha256 = '2f5f28044ae88fccbcad4a9d21943b986aabcdd8be1ae607d5e79d0a8947925f';
  }
  return { integrated, candidate };
}
async function validateMetadata585Attestation(attest, { descriptor, conditions, central, pairs, currentSource }) {
  need(exact(attest, ['schemaVersion','kind','semanticContract','predecessor','parent','producer','datasetId',
    'referenceAt','registrySha256','contextRegistrySha256','pairsSha256','transition','attestationSha256'])
    && attest.schemaVersion === 1 && attest.kind === METADATA585_KIND
    && attest.semanticContract === ESTABLISHED_NATIVE_CURRENT_SEMANTIC_CONTRACT
    && attest.transition === 'SAME_H0_MODEL_METADATA' && SHA.test(attest.attestationSha256), 'METADATA_ATTESTATION');
  const { attestationSha256, ...content } = attest;
  need(digest(content) === attestationSha256 && Buffer.byteLength(canonical(attest)) <= MAX_ATTEST, 'METADATA_ATTESTATION_HASH');
  need(exact(attest.predecessor, ['sourceFamilyHead','descriptor','attestation'])
    && attest.predecessor.sourceFamilyHead === METADATA585_SOURCE
    && exact(attest.parent, ['bundleContentSha256','generationSha256','attestationSha256'])
    && Object.values(attest.parent).every(value => SHA.test(value)), 'METADATA_PARENT');
  const old = attest.predecessor;
  need(old.descriptor?.bundleContentSha256 === attest.parent.bundleContentSha256
    && old.attestation?.attestationSha256 === attest.parent.attestationSha256
    && old.descriptor?.datasetId === conditions.datasetId
    && old.descriptor?.productionReferenceAt === conditions.productionReferenceAt
    && attest.datasetId === descriptor.datasetId && attest.datasetId === conditions.datasetId
    && attest.referenceAt === descriptor.productionReferenceAt && attest.referenceAt === conditions.productionReferenceAt
    && attest.registrySha256 === digest(central) && attest.contextRegistrySha256 === contextDigest(pairs)
    && attest.pairsSha256 === pairsDigest(pairs)
    && exact(attest.producer, Object.keys(currentSource))
    && same({ ...attest.producer, sourceHead: currentSource.sourceHead }, currentSource)
    && attest.producer.sourceHead === descriptor.sourceHead, 'METADATA_ATTESTED_SOURCE');
  // The producer is compared with the genuine OLD Git family, never with
  // future changed origin bytes. This is an assert-only source check.
  need(HEAD.test(old.descriptor.sourceHead), 'METADATA_OLD_PRODUCER');
  await git(['merge-base','--is-ancestor',old.descriptor.sourceHead,currentSource.sourceHead]);
  for (const file of ['scripts/lib/established-native-current-origin.mjs','scripts/lib/ravscore-production-part-pipeline.mjs'])
    need(await git(['rev-parse',old.descriptor.sourceHead + ':' + file])
      === await git(['rev-parse',METADATA585_SOURCE + ':' + file]), 'METADATA_OLD_PRODUCER');
  need(await git(['rev-parse',old.descriptor.sourceHead + ':scripts/lib/dmi-marine-zone-exclusions.json'])
    === SEED.ownerPolicyGitBlob, 'METADATA_OLD_POLICY');
  // A small derived ASSERTION VIEW, not an original B or a snapshot handle.
  // Restore only the two model metadata fields; every unknown state field and
  // all 673 actual numeric/history/context values remain exact copies.
  const inverse = new Map([...pairs].map(([id,pair]) => [id,metadata585InversePair(pair)]));
  const oldPairView = { datasetId: conditions.datasetId, productionReferenceAt: conditions.productionReferenceAt,
    coastalParts: { parts: Object.fromEntries([...inverse].map(([id,pair]) => [id,{ravScoreModel:{currentState:pair.integrated}}])) },
    ravScoreCandidateGWarmup: { runtime: { parts: Object.fromEntries([...inverse]
      .map(([id,pair]) => [id,{ravScoreModel:{currentState:pair.candidate}}])) } },
    [ATTEST]: structuredClone(old.attestation) };
  await withAuthenticated585PredecessorSource(async frozenRoot => {
    const module = await import(pathToFileURL(path.join(frozenRoot,
      'scripts/lib/established-native-current-origin-585-assertion.mjs')).href);
    await module.assertFrozen585MetadataOriginData({ descriptor: old.descriptor, conditions: oldPairView,
      centralContract: central });
  });
}
export async function buildEstablishedNativeCurrent585MetadataAttestation(handle, options) {
  need(arguments.length === 2 && exact(options, ['centralContract','conditions']), 'ARGUMENTS');
  const old = assertAuthenticatedFrozen585Snapshot(handle);
  need(!metadata585Consumed.has(handle), 'METADATA_ALREADY_CONSUMED');
  // Admission requires BOTH complete normal generated-model checks, not a
  // caller tuple/flag or hash inequality. No static builder/NEXT import may
  // make this bound source depend on its own generated checksum.
  const builders = ['scripts/build-candidate-g-rollback-bundle.mjs', 'scripts/build-ravscore-model-bundle.mjs'];
  await git(['diff', '--exit-code', 'HEAD', '--', ...builders,
    'scripts/lib/model-source-imports.mjs', 'scripts/lib/static-module-closure.mjs']);
  for (const builder of builders) await exec(process.execPath, [path.join(ROOT, builder), '--check'],
    { cwd: ROOT, env: sourceEnv(), encoding: 'utf8', maxBuffer: 2 * MB, timeout: 60000 });
  const currentSource = await sourceIdentity(), contracts = await privateRuntimeContractHashes();
  const oldI = old.checkpoint.modelBinding, oldC = old.checkpoint.candidateGRollbackCompanion.modelBinding;
  need(currentSource.integrated !== oldI.modelBundleSha256
    && currentSource.candidate !== oldC.modelBundleSha256
    && currentSource.continuation !== old.checkpoint.continuationStateContractSha256, 'METADATA_UNISSUED');
  need(same({ ...oldI, modelBundleSha256: currentSource.integrated }, ravScoreModelBinding())
    && same({ ...oldC, modelBundleSha256: currentSource.candidate }, candidateBinding())
    && same({ ...old.descriptor.contractHashes, continuationStateContractSha256: currentSource.continuation }, contracts),
  'METADATA_CONTRACT_CHANGED');
  const {centralContract,conditions} = options;
  need(same(centralContract,old.centralContract), 'METADATA_REGISTRY_CHANGED');
  const parts = registryParts(centralContract), pairs = pairsFromConditions(conditions,parts);
  need(conditions.datasetId === old.descriptor.datasetId
    && conditions.productionReferenceAt === old.descriptor.productionReferenceAt
    && same(conditions[ATTEST],old.attestation), 'METADATA_TARGET_CHANGED');
  for (const [id,pair] of pairs) {
    const inverse = metadata585InversePair(pair);
    need(same(inverse.integrated,old.checkpoint.states[id])
      && same(inverse.candidate,old.checkpoint.candidateGRollbackCompanion.states[id]), 'METADATA_NUMERICAL_CHANGE');
  }
  need(same(await sourceIdentity(),currentSource), 'SOURCE_CHANGED');
  const content = { schemaVersion:1,kind:METADATA585_KIND,semanticContract:ESTABLISHED_NATIVE_CURRENT_SEMANTIC_CONTRACT,
    predecessor:{sourceFamilyHead:METADATA585_SOURCE,descriptor:structuredClone(old.descriptor),attestation:structuredClone(old.attestation)},
    parent:{bundleContentSha256:old.descriptor.bundleContentSha256,generationSha256:old.checkpoint.generationSha256,
      attestationSha256:old.attestation.attestationSha256},
    producer:{...currentSource},datasetId:conditions.datasetId,referenceAt:conditions.productionReferenceAt,
    registrySha256:digest(centralContract),contextRegistrySha256:contextDigest(pairs),pairsSha256:pairsDigest(pairs),
    transition:'SAME_H0_MODEL_METADATA' };
  const attestation = {...content,attestationSha256:digest(content)};
  await validateMetadata585Attestation(attestation,{descriptor:{...old.descriptor,sourceHead:currentSource.sourceHead},
    conditions,central:centralContract,pairs,currentSource});
  need(same(await sourceIdentity(),currentSource), 'SOURCE_CHANGED');
  metadata585Consumed.add(handle);
  return freeze(attestation);
}

// Assert-only B-before-S reentry seam. Callers must first authenticate the
// immutable CURRENT B and restore old585 S with its genuine normal reader.
// This creates no handle and permits no arbitrary same-time numerical write.
export async function assertEstablishedNativeCurrent585MetadataCheckpoint(options) {
  need(arguments.length === 1 && exact(options,['descriptor','conditions','centralContract','previousCheckpoint','incomingCheckpoint']), 'ARGUMENTS');
  const {descriptor,conditions,centralContract,previousCheckpoint:old,incomingCheckpoint:incoming} = options;
  const currentSource = await sourceIdentity(descriptor?.sourceHead);
  const parts = registryParts(centralContract), pairs = pairsFromConditions(conditions,parts);
  await validateMetadata585Attestation(conditions[ATTEST],{descriptor,conditions,central:centralContract,pairs,currentSource});
  need(old?.modelBinding?.modelBundleSha256 === '31bbb9a98f4df93804a9d4bcdff50fe5e9b1c880e04492d2c596079488a6bfa2'
    && old?.candidateGRollbackCompanion?.modelBinding?.modelBundleSha256 === '2f5f28044ae88fccbcad4a9d21943b986aabcdd8be1ae607d5e79d0a8947925f'
    && old.continuationStateContractSha256 === 'a0a5fa40385afb221dcb66e61b815453c11ee8c91f3e2d6581be0670cadc9299'
    && old.datasetId === descriptor.datasetId && incoming?.datasetId === descriptor.datasetId
    && old.productionReferenceAt === descriptor.productionReferenceAt && incoming.productionReferenceAt === descriptor.productionReferenceAt
    && conditions[ATTEST].parent.generationSha256 === old.generationSha256
    && incoming.modelBinding.modelBundleSha256 === currentSource.integrated
    && incoming.candidateGRollbackCompanion?.modelBinding?.modelBundleSha256 === currentSource.candidate
    && incoming.continuationStateContractSha256 === currentSource.continuation, 'METADATA_CHECKPOINT_SCOPE');
  need(same(Object.keys(incoming.states ?? {}).sort(),[...parts.keys()].sort())
    && same(Object.keys(incoming.candidateGRollbackCompanion.states ?? {}).sort(),[...parts.keys()].sort()), 'PARTS');
  for(const[id,pair]of pairs) need(same(pair.integrated,incoming.states[id])
    && same(pair.candidate,incoming.candidateGRollbackCompanion.states[id]), 'METADATA_INCOMING_B_S_DIFFER');
  const inverse = structuredClone(incoming);
  inverse.modelBinding.modelBundleSha256 = old.modelBinding.modelBundleSha256;
  inverse.candidateGRollbackCompanion.modelBinding.modelBundleSha256 = old.candidateGRollbackCompanion.modelBinding.modelBundleSha256;
  inverse.continuationStateContractSha256 = old.continuationStateContractSha256;
  for(const[id,state]of Object.entries(inverse.states)){
    need(state.modelBundleSha256 === currentSource.integrated && old.states?.[id], 'METADATA_BINDING');
    state.modelBundleSha256 = old.states[id].modelBundleSha256;
  }
  inverse.generationSha256 = old.generationSha256;
  inverse.stateSha256 = old.stateSha256;
  inverse.candidateGRollbackCompanion.generationSha256 = old.candidateGRollbackCompanion.generationSha256;
  need(same(inverse,old), 'METADATA_CHECKPOINT_NUMERICAL_CHANGE');
  need(same(await sourceIdentity(descriptor.sourceHead),currentSource), 'SOURCE_CHANGED');
  return true;
}
