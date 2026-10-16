// Owned metadata-only working copies, never an original/state admission grant.
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import { constants, fstatSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { isDeepStrictEqual as equal } from 'node:util';
import { withFrozenI71Source } from '../check-native-identity-frozen-i71-source.mjs';
import * as current from './coastal-point-staging-contract.mjs';
import * as currentAdapter from './coastal-point-stage-dmi-adapter.mjs';
import * as currentProof from './ravscore-production-adapters.mjs';
import { ravScoreModelBinding } from '../../js/core/ravscore-model-contract.js';
import { ravScoreModelBinding as candidateModelBinding } from '../rollback-assets/ravscore-model-contract.js';
import { PRIVATE_WEATHER_COMPONENT_FILES as FILES } from './private-weather-component-inventory.mjs';
import { NATIVE_IDENTITY_PREDECESSOR, NATIVE_IDENTITY_BINDING_REVIEW }
  from './native-sampling-identity-successor-source.mjs';

export const NATIVE_IDENTITY_STAGING_PATHS = Object.freeze(['coastalPointDmi', 'coastalPointState',
  'coastalPointStatus', 'coastalPointActivationState', 'coastalPointPendingPromotion'].map(key => FILES[key]));
const ADMIN = ['data/admin/direction-reviews.json', 'data/live/coastal-parts-v2.json'];
const MAX_FILE = 256 * 1024 * 1024, MAX_TOTAL = 768 * 1024 * 1024;
const REPOSITORY = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const retainedHandles = new Set();
const sha = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const fail = code => { throw new Error('NATIVE_IDENTITY_STAGING_' + code); };
const same = (a, b, code) => { if (!equal(a, b)) fail(code); };
const plain = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const inside = (parent, child) => { const relative = path.relative(parent, child);
  return relative && relative !== '..' && !relative.startsWith('..' + path.sep) && !path.isAbsolute(relative); };
async function noLinks(absolute) {
  let at = path.parse(absolute).root;
  for (const segment of path.relative(at, absolute).split(path.sep).filter(Boolean)) {
    at = path.join(at, segment); if ((await fs.lstat(at)).isSymbolicLink()) fail('PATH_INVALID');
  }
}
const identity = stat => ['dev', 'ino', 'mode', 'size', 'mtimeNs', 'ctimeNs'].map(key => stat[key]);
async function closeOwned(handle, first) {
  const fd = handle.fd;
  try { await handle.close(); } catch (error) { first ??= error; }
  let closed = false;
  try { fstatSync(fd); } catch (error) { closed = error.code === 'EBADF'; first ??= closed ? null : error; }
  if (closed) retainedHandles.delete(handle);
  else first ??= new Error('NATIVE_IDENTITY_STAGING_CLOSE_UNPROVED');
  if (first) throw first;
}
async function readOriginal(root, relative, optional = false) {
  const filename = path.join(root, relative);
  let before;
  try { await noLinks(filename); before = await fs.lstat(filename, { bigint: true }); }
  catch (error) { if (optional && error.code === 'ENOENT') return null; throw error; }
  if (!before.isFile() || before.size < 1n || before.size > BigInt(MAX_FILE)) fail('FILE_INVALID');
  const handle = await fs.open(filename, constants.O_RDONLY | (constants.O_NOFOLLOW ?? 0));
  retainedHandles.add(handle); let first, bytes;
  try {
    const opened = await handle.stat({ bigint: true });
    // Windows path/descriptor ctime use different clocks. Each full identity
    // remains independently fixed; all other ownership fields must cross-match.
    same(identity(before).slice(0, -1), identity(opened).slice(0, -1), 'INPUT_CHANGED');
    if (process.platform !== 'win32') same(identity(before), identity(opened), 'INPUT_CHANGED');
    bytes = await handle.readFile();
    if (BigInt(bytes.length) !== before.size) fail('INPUT_CHANGED');
    same(identity(await handle.stat({ bigint: true })), identity(opened), 'INPUT_CHANGED');
    same(identity(await fs.lstat(filename, { bigint: true })), identity(before), 'INPUT_CHANGED');
  } catch (error) { first = error; }
  await closeOwned(handle, first);
  return { relativePath: relative, bytes, sha256: sha(bytes) };
}
async function writeOwned(filename, bytes) {
  await fs.mkdir(path.dirname(filename), { recursive: true, mode: 0o700 });
  await noLinks(path.dirname(filename));
  const handle = await fs.open(filename, constants.O_WRONLY | constants.O_CREAT | constants.O_EXCL
    | (constants.O_NOFOLLOW ?? 0), 0o600);
  retainedHandles.add(handle); let first;
  try { await handle.writeFile(bytes); await handle.sync(); } catch (error) { first = error; }
  await closeOwned(handle, first);
}
const parsed = record => JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(record.bytes));
function upgradeBinding(before, after) {
  same(Object.keys(before).sort(), Object.keys(after).sort(), 'BINDING_INVALID');
  same({ ...before, modelBundleSha256: after.modelBundleSha256 }, after, 'BINDING_INVALID');
  if (before.modelBundleSha256 === after.modelBundleSha256) fail('BINDING_INVALID');
}

export async function rebindNativeIdentityStagingWorkingCopy(options) {
  if (!plain(options) || Object.keys(options).sort().join(',') !== 'adminRoot,outputRoot,privateRoot,sourceRoot') fail('ARGUMENTS_INVALID');
  const roots = {};
  for (const key of ['privateRoot', 'sourceRoot', 'adminRoot']) {
    if (typeof options[key] !== 'string') fail('PATH_INVALID');
    await noLinks(path.resolve(options[key])); roots[key] = await fs.realpath(options[key]);
    if (!(await fs.lstat(roots[key])).isDirectory()) fail('PATH_INVALID');
  }
  const output = path.resolve(options.outputRoot), repository = await fs.realpath(REPOSITORY);
  if (!inside(roots.privateRoot, roots.sourceRoot) || !inside(roots.privateRoot, output)
    || inside(repository, roots.privateRoot) || roots.privateRoot === repository
    || inside(roots.sourceRoot, output) || inside(roots.adminRoot, output)) fail('PATH_INVALID');
  await noLinks(path.dirname(output));
  if (await fs.lstat(output).catch(error => { if (error.code === 'ENOENT') return null; throw error; })) fail('OUTPUT_EXISTS');
  const originals = new Map(), admin = new Map(); let total = 0;
  for (const relative of NATIVE_IDENTITY_STAGING_PATHS) {
    const record = await readOriginal(roots.sourceRoot, relative, true);
    if (record) { total += record.bytes.length; if (total > MAX_TOTAL) fail('FILE_BOUND'); originals.set(relative, record); }
  }
  for (const relative of ADMIN) admin.set(relative, await readOriginal(roots.adminRoot, relative));
  const direction = parsed(admin.get(ADMIN[0])), registry = parsed(admin.get(ADMIN[1]));
  if (!plain(direction.zones) || !plain(registry.zones)) fail('ADMIN_INVALID');
  const changedPaths = [], outputs = new Map([...originals].map(([relative, record]) => [relative, record.bytes]));
  await withFrozenI71Source(async oldRoot => {
    const load = relative => import(pathToFileURL(path.join(oldRoot, relative)).href);
    const [old, oldModel, oldCandidate, oldAdapter, oldProof] = await Promise.all([
      load('scripts/lib/coastal-point-staging-contract.mjs'), load('js/core/ravscore-model-contract.js'),
      load('scripts/rollback-assets/ravscore-model-contract.js'), load('scripts/lib/coastal-point-stage-dmi-adapter.mjs'),
      load('scripts/lib/ravscore-production-adapters.mjs'),
    ]);
    const beforeI = oldModel.ravScoreModelBinding(), afterI = ravScoreModelBinding();
    const beforeC = oldCandidate.ravScoreModelBinding(), afterC = candidateModelBinding();
    same(beforeI.modelBundleSha256, NATIVE_IDENTITY_PREDECESSOR.integrated, 'BINDING_INVALID');
    same(beforeC.modelBundleSha256, NATIVE_IDENTITY_PREDECESSOR.candidate, 'BINDING_INVALID');
    same(afterI.modelBundleSha256, NATIVE_IDENTITY_BINDING_REVIEW.integrated, 'BINDING_INVALID');
    same(afterC.modelBundleSha256, NATIVE_IDENTITY_BINDING_REVIEW.candidate, 'BINDING_INVALID');
    upgradeBinding(beforeI, afterI); upgradeBinding(beforeC, afterC);
    const entries = [...old.stagedEntries(direction, registry), ...old.activatedRecoveryEntries(direction, registry)];
    const nextEntries = [...current.stagedEntries(direction, registry), ...current.activatedRecoveryEntries(direction, registry)];
    same(entries, nextEntries, 'ADMIN_IDENTITY_CHANGED');
    const byStage = new Map(entries.map(entry => [entry.stageId, entry]));
    if (byStage.size !== entries.length) fail('ADMIN_IDENTITY_CONFLICT');
    const own = (stageId, row) => {
      const entry = byStage.get(stageId); if (!entry) fail('ADMIN_IDENTITY_UNAVAILABLE');
      for (const [key, value] of [['partId', entry.partId], ['zoneId', entry.zoneId], ['revision', entry.revision]]) {
        if (Object.hasOwn(row, key)) same(row[key], value, 'ADMIN_IDENTITY_CHANGED');
      }
      return entry;
    };
    const binding = (row, where, required = true) => {
      if (!Object.hasOwn(row, 'ravScoreModelBinding') && !required) return;
      old.assertCoastalPointStageModelBinding(row.ravScoreModelBinding);
      row.ravScoreModelBinding = structuredClone(afterI); current.assertCoastalPointStageModelBinding(row.ravScoreModelBinding);
      changedPaths.push(where + '.ravScoreModelBinding.modelBundleSha256');
    };
    const integrated = (state, entry, where, ready = false) => {
      const identity = old.coastalPointStageIdentity(entry.part);
      old.assertIntegratedCoastalPointContinuation(state, { samplingContextKey: identity.samplingContextKey, requireReady: ready });
      const result = { ...state, modelBundleSha256: afterI.modelBundleSha256 };
      current.assertIntegratedCoastalPointContinuation(result, { samplingContextKey: identity.samplingContextKey, requireReady: ready });
      same({ ...result, modelBundleSha256: beforeI.modelBundleSha256 }, state, 'NUMERIC_CHANGED');
      changedPaths.push(where + '.modelBundleSha256'); return result;
    };
    const candidate = (state, entry, ready = false) => {
      const oldIdentity = old.coastalPointStageIdentity(entry.part), identity = current.coastalPointStageIdentity(entry.part);
      same(oldIdentity.expectedCandidateGStateKey, identity.expectedCandidateGStateKey, 'ADMIN_IDENTITY_CHANGED');
      old.assertCandidateGCoastalPointRollbackContinuation(state, oldIdentity.expectedCandidateGStateKey, { requireReady: ready });
      current.assertCandidateGCoastalPointRollbackContinuation(state, identity.expectedCandidateGStateKey, { requireReady: ready });
      // Actual Candidate G continuation has no implementation-bundle field.
      // Its metadata/oracle is unchanged; never invent a C receipt on it.
    };
    const emit = (relative, before, after) => {
      const bytes = Buffer.from(JSON.stringify(after) + '\n');
      same(JSON.parse(bytes), after, 'NUMERIC_CHANGED');
      if (equal(before, after)) return;
      outputs.set(relative, bytes);
    };
    for (const relative of [FILES.coastalPointState, FILES.coastalPointStatus]) {
      if (!originals.has(relative)) continue;
      const before = parsed(originals.get(relative)), after = structuredClone(before);
      if (![1, 2, old.POINT_STAGE_SCHEMA_VERSION].includes(after.schemaVersion)) fail('SCHEMA_INVALID');
      binding(after, relative, after.schemaVersion !== 1);
      if (relative === FILES.coastalPointState) {
        if (!plain(after.stages)) fail('SCHEMA_INVALID');
        for (const [stageId, row] of Object.entries(after.stages)) {
          const entry = own(stageId, row), where = relative + '.stages.' + stageId;
          if (after.schemaVersion === 1) {
            same(row.stateKey, old.candidateGStateKey(entry.part), 'CONTEXT_INVALID');
            if (row.continuationState) candidate(row.continuationState, entry);
          } else {
            binding(row, where); same(row.samplingContextKey, old.coastalPointStageIdentity(entry.part).samplingContextKey, 'CONTEXT_INVALID');
            if (row.continuationState) row.continuationState = integrated(row.continuationState, entry, where + '.continuationState');
            for (const key of ['candidateGRollbackContinuationState', 'pendingCandidateGMigrationState']) if (row[key]) candidate(row[key], entry);
            if (row.continuationState) {
              const companion = row.candidateGRollbackContinuationState ?? row.pendingCandidateGMigrationState;
              if (!companion) fail('COMPANION_MISSING'); same(row.continuationState.time, companion.time, 'TARGET_MISMATCH');
            }
          }
        }
      } else {
        if (!Array.isArray(after.entries)) fail('SCHEMA_INVALID');
        for (const row of after.entries) {
          const entry = own(row.stageId, row); binding(row, relative + '.entries.' + row.stageId, after.schemaVersion !== 1);
          if (Object.hasOwn(row, 'samplingContextKey')) same(row.samplingContextKey, old.coastalPointStageIdentity(entry.part).samplingContextKey, 'CONTEXT_INVALID');
        }
      }
      emit(relative, before, after);
    }
    if (originals.has(FILES.coastalPointActivationState)) {
      const relative = FILES.coastalPointActivationState, before = parsed(originals.get(relative)), after = structuredClone(before);
      old.assertCoastalPointActivationStateInjection(before); binding(after, relative);
      for (const [partId, pair] of Object.entries(after.statePairs)) {
        const matching = entries.filter(entry => entry.partId === partId
          && old.coastalPointStageIdentity(entry.part).samplingContextKey === pair.integratedState.samplingContextKey
          && old.candidateGStateKey(entry.part) === pair.candidateGState.stateKey);
        if (matching.length !== 1) fail('ADMIN_IDENTITY_UNAVAILABLE');
        const entry = matching[0]; candidate(pair.candidateGState, entry, true);
        const state = integrated(pair.integratedState, entry, relative + '.statePairs.' + partId + '.integratedState', true);
        after.statePairs[partId] = current.buildCoastalPointActivationStatePair({ partId,
          ...{ samplingContextKey: state.samplingContextKey, expectedCandidateGStateKey: pair.candidateGState.stateKey },
          integratedState: state, candidateGState: pair.candidateGState });
        changedPaths.push(...['integratedStateSha256', 'pairSha256'].map(key => relative + '.statePairs.' + partId + '.' + key));
      }
      current.assertCoastalPointActivationStateInjection(after); emit(relative, before, after);
    }
    if (originals.has(FILES.coastalPointDmi)) {
      const dmi = parsed(originals.get(FILES.coastalPointDmi));
      if (!plain(dmi.candidates) || !plain(dmi.zones)
        || dmi.currentVectorSemanticsVersion !== oldProof.RAVSCORE_CURRENT_VECTOR_SEMANTICS_VERSION) fail('DMI_HEADER_INVALID');
      for (const [stageId, row] of Object.entries(dmi.candidates)) {
        const entry = own(stageId, row);
        for (const key of ['waterPoint', 'landPoint', 'onshoreDirectionDeg']) same(row[key], entry.part[key], 'ADMIN_IDENTITY_CHANGED');
        const descriptor = { stageId, zoneId: entry.zoneId, part: entry.part };
        const oldZone = oldAdapter.projectVerifiedPrivateStageDmiZoneToPart(dmi.zones[stageId], descriptor);
        const newZone = currentAdapter.projectVerifiedPrivateStageDmiZoneToPart(dmi.zones[stageId], descriptor);
        same(oldZone, newZone, 'NUMERIC_CHANGED');
        for (const raw of Object.values(oldZone.hourly)) if (raw.sources?.current) {
          for (const proof of [oldProof, currentProof]) if (!proof.verifiedBulkCurrent(dmi, oldZone,
            entry.part.waterPoint, raw.sources.current, raw.time, proof.dmiExpectedIdentityForPart(entry.part))) fail('DMI_HEADER_INVALID');
        }
      }
    }
    if (originals.has(FILES.coastalPointPendingPromotion)) {
      const pending = parsed(originals.get(FILES.coastalPointPendingPromotion));
      if (pending.schemaVersion !== 1 || pending.documentKey !== 'direction-reviews'
        || !Number.isSafeInteger(pending.expectedVersion) || pending.expectedVersion < 1
        || !Number.isFinite(Date.parse(pending.preparedAt)) || !plain(pending.payload)
        || !Array.isArray(pending.partIds) || !pending.partIds.length || !Array.isArray(pending.revisions) || !pending.revisions.length
        || pending.partIds.some(partId => !entries.some(entry => entry.partId === partId && pending.revisions.includes(entry.revision)))) fail('PENDING_INVALID');
      // Admin CAS intent is preserved byte-for-byte. This module never promotes.
    }
  });
  const verifyOriginals = async () => {
    for (const relative of NATIVE_IDENTITY_STAGING_PATHS) {
      const actual = await readOriginal(roots.sourceRoot, relative, true), before = originals.get(relative);
      if (Boolean(actual) !== Boolean(before) || actual && (actual.sha256 !== before.sha256 || actual.bytes.length !== before.bytes.length)) fail('INPUT_CHANGED');
    }
    for (const [relative, before] of admin) {
      const actual = await readOriginal(roots.adminRoot, relative);
      if (actual.sha256 !== before.sha256 || actual.bytes.length !== before.bytes.length) fail('ADMIN_CHANGED');
    }
  };
  await verifyOriginals();
  await fs.mkdir(output, { mode: 0o700 }); await noLinks(output);
  const files = [];
  for (const [relativePath, bytes] of outputs) {
    await writeOwned(path.join(output, relativePath), bytes);
    const actual = await readOriginal(output, relativePath), before = originals.get(relativePath);
    if (actual.sha256 !== sha(bytes) || actual.bytes.length !== bytes.length) fail('OUTPUT_CHANGED');
    files.push({ relativePath, sourcePath: path.join(output, relativePath), bytes: bytes.length, sha256: actual.sha256,
      originalBytes: before.bytes.length, originalSha256: before.sha256 });
  }
  await verifyOriginals();
  return Object.freeze({ kind: 'NATIVE_IDENTITY_STAGING_WORKING_COPY', admission: 'NO_ADMISSION', files,
    absentPaths: NATIVE_IDENTITY_STAGING_PATHS.filter(relative => !originals.has(relative)),
    adminInputs: [...admin.values()].map(record => ({ relativePath: record.relativePath, bytes: record.bytes.length, sha256: record.sha256 })),
    changedPaths, originalsUnchanged: true, installationPerformed: false });
}
