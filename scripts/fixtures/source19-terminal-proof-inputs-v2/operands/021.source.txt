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
import { verifyPrivateProductionRuntimeBundle } from '../private-production-runtime-bundle.mjs';
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
import { withNativeCurrentReanalysisPredecessorSource } from '../check-native-current-reanalysis-predecessor-source.mjs';
import { assertAuthenticatedFrozen140000Snapshot } from './authenticated-frozen140000-predecessor.mjs';

export const ESTABLISHED_NATIVE_CURRENT_SEMANTIC_CONTRACT = 'established-native-current-continuation-v2';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const ATTEST = 'privateEstablishedNativeCurrentOrigin';
const KIND = 'PRIVATE_ESTABLISHED_NATIVE_CURRENT_ORIGIN';
const SHA = /^[a-f0-9]{64}$/, HEAD = /^[a-f0-9]{40}$/;
const MB = 1024 * 1024, MAX_ATTEST = 16 * 1024, MAX_CONDITIONS = 256 * MB;
const contexts = new WeakMap(), failedCloses = new Map(), metadataConsumed = new WeakSet();
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
  need(['SEED_METADATA_ONLY', 'NORMAL_STRICT_CONTINUATION', 'SAME_H0_MODEL_METADATA'].includes(attest.transition), 'TRANSITION');
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
  if (seed) need(ESTABLISHED_NATIVE_CURRENT_SEMANTIC_CONTRACT === 'established-native-current-continuation-v1', 'SEED_ALREADY_ISSUED');
  if (seedOnly) need(seed, 'SEED_CONTENT_CHANGED');
  let conditions = seedOnly ? null : await json(path.join(ROOT, 'data/live/conditions.json'), MAX_CONDITIONS);
  // Unknown/legacy input retains its OLD normal transitions; a claimed clean
  // origin cannot silently downgrade to that route after a failed check.
  if (!seed && descriptor.modelBinding.modelBundleSha256 !== currentSource.integrated) {
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
      const originalBytes = await ownedBytes(path.join(bundlePath, 'payload/data/live/conditions.json'), MAX_CONDITIONS);
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
    validateAttestation(originalConditions[ATTEST], { descriptor, conditions: originalConditions, central, pairs, currentSource });
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
  need(ESTABLISHED_NATIVE_CURRENT_SEMANTIC_CONTRACT === 'established-native-current-continuation-v1', 'SEED_ALREADY_ISSUED');
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
  need(context && !context.seed && !context.finalized, 'HANDLE'); const admitted = context.pairs.get(part?.partId);
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

// Explicit later binding event. ONLY the separate fixed authenticated OLD140000
// snapshot can authorize it; ordinary/seed handles and serialized data cannot.
// This grants neither normal ForPart nor fabricated strict-production results.
export async function buildEstablishedNativeCurrentSameH0MetadataAttestation(handle, options) {
  need(arguments.length === 2 && exact(options, ['centralContract', 'conditions']), 'ARGUMENTS');
  const old = assertAuthenticatedFrozen140000Snapshot(handle);
  need(!metadataConsumed.has(handle), 'METADATA_ALREADY_CONSUMED');
  const currentSource = await sourceIdentity();
  const oldI = old.checkpoint.modelBinding, oldC = old.checkpoint.candidateGRollbackCompanion.modelBinding;
  const contracts = await privateRuntimeContractHashes();
  need(currentSource.integrated !== oldI.modelBundleSha256
    && currentSource.candidate !== oldC.modelBundleSha256
    && currentSource.continuation !== old.checkpoint.continuationStateContractSha256, 'METADATA_UNISSUED');
  need(same({ ...oldI, modelBundleSha256: currentSource.integrated }, ravScoreModelBinding())
    && same({ ...oldC, modelBundleSha256: currentSource.candidate }, candidateBinding())
    && same({ ...old.descriptor.contractHashes,
      continuationStateContractSha256: currentSource.continuation }, contracts), 'METADATA_CONTRACT_CHANGED');
  const { centralContract, conditions } = options;
  need(same(centralContract, old.centralContract), 'METADATA_REGISTRY_CHANGED');
  const parts = registryParts(centralContract), pairs = pairsFromConditions(conditions, parts);
  need(conditions.datasetId === old.descriptor.datasetId
    && conditions.productionReferenceAt === old.descriptor.productionReferenceAt
    && same(conditions[ATTEST], old.attestation), 'METADATA_TARGET_CHANGED');
  need(old.attestation.semanticContract === 'established-native-current-continuation-v1'
    && SHA.test(old.attestation.attestationSha256), 'METADATA_PARENT');
  for (const [id, pair] of pairs) {
    const oldIntegrated = old.checkpoint.states[id], oldCandidate = old.checkpoint.candidateGRollbackCompanion.states[id];
    const inverseI = structuredClone(pair.integrated), inverseG = structuredClone(pair.candidate);
    need(inverseI.modelBundleSha256 === currentSource.integrated, 'METADATA_BINDING');
    inverseI.modelBundleSha256 = oldIntegrated.modelBundleSha256;
    if (Object.hasOwn(inverseG, 'modelBundleSha256')) {
      need(inverseG.modelBundleSha256 === currentSource.candidate, 'METADATA_BINDING');
      inverseG.modelBundleSha256 = oldCandidate.modelBundleSha256;
    }
    need(same(inverseI, oldIntegrated) && same(inverseG, oldCandidate), 'METADATA_NUMERICAL_CHANGE');
  }
  // Source/HEAD and physical required blobs must still be the same actual new
  // normal source after validating every H0 pair. No caller tuple is accepted.
  need(same(await sourceIdentity(), currentSource), 'SOURCE_CHANGED');
  const content = { schemaVersion: 1, kind: KIND,
    semanticContract: ESTABLISHED_NATIVE_CURRENT_SEMANTIC_CONTRACT, seed: { ...SEED },
    parent: { bundleContentSha256: old.descriptor.bundleContentSha256,
      generationSha256: old.checkpoint.generationSha256,
      attestationSha256: old.attestation.attestationSha256 },
    producer: { ...currentSource }, datasetId: conditions.datasetId, referenceAt: conditions.productionReferenceAt,
    registrySha256: digest(centralContract), contextRegistrySha256: contextDigest(pairs),
    pairsSha256: pairsDigest(pairs), transition: 'SAME_H0_MODEL_METADATA' };
  const attestation = { ...content, attestationSha256: digest(content) };
  need(Buffer.byteLength(canonical(attestation)) <= MAX_ATTEST, 'ATTESTATION_SIZE');
  metadataConsumed.add(handle);
  return freeze(attestation);
}
