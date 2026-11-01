// Import-safe controller for the fixed authenticated ORIGINAL B companions.
// No model/kernel/pack imports this controller; no provider or remote I/O.
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import { isDeepStrictEqual } from 'node:util';
import { readDmiBulkDocument } from './lib/dmi-bulk-storage.mjs';
import { PRIVATE_CONDITIONS_MAX_BYTES } from './lib/bounded-json-writer.mjs';
import { verifyPrivateProductionRuntimeBundle } from './private-production-runtime-bundle.mjs';
import { unpackPrivateWeatherComponentCompanions, privateWeatherPackJsonReadsClosed }
  from './lib/private-weather-component-pack.mjs';
import { PRIVATE_WEATHER_COMPONENT_FILES, PRIVATE_WEATHER_COMPONENT_PACK_FILE }
  from './lib/private-weather-component-inventory.mjs';
import {readAuthenticatedFrozen587Predecessor,assertAuthenticatedFrozen587Snapshot}
  from './lib/authenticated-frozen586-predecessor.mjs';
import {readAuthenticatedFrozen588Predecessor,assertAuthenticatedFrozen588Snapshot}
  from './lib/authenticated-frozen586-predecessor.mjs';
import {readAuthenticatedFrozen590Predecessor,assertAuthenticatedFrozen590Snapshot}
  from './lib/authenticated-frozen586-predecessor.mjs';
import {readAuthenticatedFrozen591Predecessor,assertAuthenticatedFrozen591Snapshot}
  from './lib/authenticated-frozen586-predecessor.mjs';
import {ACTIVE_ASSISTANT_SUCCESSOR as ACTIVE} from './lib/assistant-later-h0-successor-source.mjs';
import {ravScoreModelBinding} from '../js/core/ravscore-model-contract.js';
import {readAssistantLaterH0RetentionInput} from './assistant-later-h0-runtime-transition.mjs';
const ACTIVE_PREDECESSOR=['assistant-public591-successor','assistant-installed593-origin591-successor'].includes(ACTIVE.sourcePhase)?Object.freeze({
  read:readAuthenticatedFrozen591Predecessor,snapshot:assertAuthenticatedFrozen591Snapshot,
}):ACTIVE.sourcePhase==='assistant-public590-successor'?Object.freeze({
  read:readAuthenticatedFrozen590Predecessor,snapshot:assertAuthenticatedFrozen590Snapshot,
}):ACTIVE.sourcePhase==='assistant-public588-successor'?Object.freeze({
  read:readAuthenticatedFrozen588Predecessor,snapshot:assertAuthenticatedFrozen588Snapshot,
}):Object.freeze({
  read:readAuthenticatedFrozen587Predecessor,snapshot:assertAuthenticatedFrozen587Snapshot,
});
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function refuse(reason) {
  const error = new Error(`RAVSCORE_CURRENT_HISTORY_DEMAND_${reason}`);
  error.code = `RAVSCORE_CURRENT_HISTORY_DEMAND_${reason}`;
  throw error;
}
// Only authenticated ORIGINAL B companions; never mutable working donors.
async function readAuthenticatedCurrentCompanions(verified, conditions) {
  const expectedPackDescriptor = verified.files.find(row => row.id === PRIVATE_WEATHER_COMPONENT_PACK_FILE.id);
  if (expectedPackDescriptor === undefined) return []; // Legacy B without a pack remains context-only.
  const inputRoot = await fs.realpath(path.join(verified.bundlePath, 'payload'));
  const tempRoot = await fs.realpath(os.tmpdir()); // Resolve Windows 8.3 aliases before the strict API.
  const parent = await fs.mkdtemp(path.join(tempRoot, 'rr-raw-retention-companions-'));
  const parentIdentity = await fs.lstat(parent, { bigint: true });
  const stageRoot = path.join(parent, 'companions'), cacheRoot = path.join(stageRoot, '.cache');
  const allowed = new Set([PRIVATE_WEATHER_COMPONENT_FILES.dmiActive, PRIVATE_WEATHER_COMPONENT_FILES.dmiCandidate]);
  let invocation, owned = null, failed = false;
  const sameObject = (before, after, regular = false) => !after.isSymbolicLink()
    && (regular ? after.isFile() && after.nlink === 1n : after.isDirectory())
    && ['dev', 'ino', 'mode', ...(regular ? ['nlink', 'size', 'mtimeNs', 'ctimeNs'] : [])]
      .every(key => before[key] === after[key]);
  const requireObject = async (file, identity, regular = false) => {
    if (await fs.realpath(file) !== file
      || !sameObject(identity, await fs.lstat(file, { bigint: true }), regular)) refuse('RETENTION_COMPANION_STAGE_CHANGED');
  };
  const requireNames = async (directory, names) => {
    if (!isDeepStrictEqual((await fs.readdir(directory)).sort(), [...names].sort())) refuse('RETENTION_COMPANION_STAGE_CHANGED');
  };
  try {
    if (await fs.realpath(parent) !== parent || !parentIdentity.isDirectory()
      || parentIdentity.isSymbolicLink()) refuse('RETENTION_COMPANION_STAGE_CHANGED');
    invocation = unpackPrivateWeatherComponentCompanions({ restoredRoot: inputRoot,
      outputRoot: stageRoot, conditions, expectedPackDescriptor });
    const stage = await invocation;
    if (!privateWeatherPackJsonReadsClosed(invocation)) refuse('RETENTION_COMPANION_CLOSE_UNPROVED');
    if (stage?.kind !== 'PRIVATE_WEATHER_COMPONENT_COMPANION_STAGE' || !Array.isArray(stage.files)
      || stage.files.length > 2 || new Set(stage.files.map(row => row.relativePath)).size !== stage.files.length) {
      refuse('RETENTION_COMPANION_STAGE_CHANGED');
    }
    await requireObject(parent, parentIdentity);
    const stageIdentity = await fs.lstat(stageRoot, { bigint: true });
    await requireObject(stageRoot, stageIdentity);
    await requireNames(parent, ['companions']);
    await requireNames(stageRoot, stage.files.length ? ['.cache'] : []);
    const cacheIdentity = stage.files.length ? await fs.lstat(cacheRoot, { bigint: true }) : null;
    const files = [];
    if (cacheIdentity) {
      await requireObject(cacheRoot, cacheIdentity);
      await requireNames(cacheRoot, stage.files.map(row => path.basename(row.relativePath)));
    }
    for (const descriptor of stage.files) {
      if (!allowed.has(descriptor.relativePath) || descriptor.sourcePath !== path.join(stageRoot, descriptor.relativePath)) {
        refuse('RETENTION_COMPANION_STAGE_CHANGED');
      }
      const identity = await fs.lstat(descriptor.sourcePath, { bigint: true });
      if (identity.size !== BigInt(descriptor.bytes)) refuse('RETENTION_COMPANION_STAGE_CHANGED');
      await requireObject(descriptor.sourcePath, identity, true);
      files.push({ descriptor, identity });
    }
    // Only after complete ownership qualification may finally remove anything.
    owned = { stageIdentity, cacheIdentity, files };
    const contexts = [];
    for (const { descriptor, identity } of files) {
      await requireObject(descriptor.sourcePath, identity, true);
      contexts.push(await readDmiBulkDocument(descriptor.sourcePath));
      await requireObject(descriptor.sourcePath, identity, true);
    }
    return contexts;
  } catch (error) { failed = true; throw error; }
  finally {
    // A failed/partial unpack or unknown close retains this private stage. No
    // recursive deletion, inferred inventory, replacement or original-B write.
    const closed = invocation !== undefined && privateWeatherPackJsonReadsClosed(invocation);
    try {
      if (!closed) {
        if (!failed) refuse('RETENTION_COMPANION_CLOSE_UNPROVED');
      } else if (owned !== null) {
        const { stageIdentity, cacheIdentity, files } = owned;
        await requireObject(parent, parentIdentity); await requireNames(parent, ['companions']);
        await requireObject(stageRoot, stageIdentity); await requireNames(stageRoot, cacheIdentity ? ['.cache'] : []);
        if (cacheIdentity) {
          await requireObject(cacheRoot, cacheIdentity);
          await requireNames(cacheRoot, files.map(row => path.basename(row.descriptor.relativePath)));
        }
        for (const { descriptor, identity } of files) await requireObject(descriptor.sourcePath, identity, true);
        for (const { descriptor, identity } of files) {
          await requireObject(parent, parentIdentity); await requireObject(stageRoot, stageIdentity);
          await requireObject(cacheRoot, cacheIdentity); await requireObject(descriptor.sourcePath, identity, true);
          await fs.unlink(descriptor.sourcePath);
        }
        if (cacheIdentity) {
          await requireObject(cacheRoot, cacheIdentity); await requireNames(cacheRoot, []); await fs.rmdir(cacheRoot);
        }
        await requireObject(stageRoot, stageIdentity); await requireNames(stageRoot, []); await fs.rmdir(stageRoot);
        await requireObject(parent, parentIdentity); await requireNames(parent, []); await fs.rmdir(parent);
      }
    } catch (error) { if (!failed) throw error; }
  }
}

// Fixed ordinary CURRENT only. This is local verification of the descriptor
// already obtained by the normal protected restore; it never fetches a pointer,
// chooses a fallback generation, creates an attestation or rewrites B/S.
export async function readCurrentPrivateRuntimeCompanionInput(targetReferenceAt) {
  const targetMs = Date.parse(targetReferenceAt ?? '');
  if (!Number.isFinite(targetMs) || new Date(targetMs).toISOString() !== targetReferenceAt
    || targetMs % 3_600_000 !== 0) refuse('NONCANONICAL_TIME');
  const privateRoot = process.env.RAVRADAR_PRIVATE_RUNTIME_ROOT;
  const bundlePath = process.env.RAVRADAR_PRIVATE_RUNTIME_BUNDLE;
  if (!path.isAbsolute(privateRoot ?? '') || !path.isAbsolute(bundlePath ?? '')
    || path.dirname(bundlePath) !== privateRoot
    || !path.isAbsolute(process.env.RUNNER_TEMP ?? '')) refuse('RETENTION_B_PATH');
  const descriptorPath = path.join(process.env.RUNNER_TEMP, 'private-runtime-current-source.json');
  const descriptorInfo = await fs.lstat(descriptorPath);
  if (!descriptorInfo.isFile() || descriptorInfo.isSymbolicLink()
    || descriptorInfo.size > 2 * 1024 * 1024) refuse('RETENTION_B_CHANGED');
  const descriptorBytes = await fs.readFile(descriptorPath);
  const descriptor = JSON.parse(descriptorBytes.toString('utf8'));
  if(descriptor?.modelBinding?.modelBundleSha256===ACTIVE.before.I
    &&ravScoreModelBinding().modelBundleSha256===ACTIVE.requireBinding().I){
    const view=await readAssistantLaterH0RetentionInput(targetReferenceAt);
    if(view.verified.bundleContentSha256!==descriptor.bundleContentSha256
      ||!descriptorBytes.equals(await fs.readFile(descriptorPath)))refuse('RETENTION_B_CHANGED');
    return view;
  }
  let before = null;
  const verify = async () => {
    const verified = await verifyPrivateProductionRuntimeBundle({ privateRoot, bundlePath,
      repositoryRoot: ROOT, expected: descriptor });
    if (verified.bundleContentSha256 !== descriptor.bundleContentSha256
      || Date.parse(verified.productionReferenceAt) > targetMs
      || !descriptorBytes.equals(await fs.readFile(descriptorPath))
      || (before !== null && !isDeepStrictEqual(verified, before))) refuse('RETENTION_B_CHANGED');
    before ??= verified;
    return verified;
  };
  const verified = await verify();
  const conditionsPath = path.join(verified.bundlePath, 'payload/data/live/conditions.json');
  const fileInfo = await fs.lstat(conditionsPath);
  if (!fileInfo.isFile() || fileInfo.isSymbolicLink()
    || fileInfo.size > PRIVATE_CONDITIONS_MAX_BYTES) refuse('RETENTION_B_CHANGED');
  const bytes = await fs.readFile(conditionsPath);
  const conditionsSha256 = crypto.createHash('sha256').update(bytes).digest('hex');
  const listed = verified.files.find(row => row.relativePath === 'data/live/conditions.json');
  if (!listed || listed.bytes !== bytes.length || listed.sha256 !== conditionsSha256) refuse('RETENTION_B_CHANGED');
  const conditions = JSON.parse(bytes.toString('utf8'));
  if (conditions?.datasetId !== verified.datasetId
    || conditions?.productionReferenceAt !== verified.productionReferenceAt) refuse('RETENTION_B_CHANGED');
  return { verified, conditions, conditionsPath, conditionsSha256, verify };
}

// The updater invokes this only AFTER its existing genuine B/S-origin check
// and only outside all isolated first-active numeric-history views. Missing B
// throws; an authenticated legacy B with no pack honestly returns no contexts.
export async function readCurrentPrivateRuntimeCompanions(targetReferenceAt) {
  // Called after the updater's genuine H0 origin check. Providers may already
  // have changed unrelated WORKING weather; unpack only immutable original B.
  if(ravScoreModelBinding().modelBundleSha256===ACTIVE.requireBinding().I){
    const descriptor=JSON.parse(await fs.readFile(path.join(process.env.RUNNER_TEMP,'private-runtime-current-source.json'),'utf8'));
    if(descriptor?.modelBinding?.modelBundleSha256===ACTIVE.before.I){
      const snapshot=ACTIVE_PREDECESSOR.snapshot(await ACTIVE_PREDECESSOR.read());
      if(snapshot.descriptor.bundleContentSha256!==descriptor.bundleContentSha256)refuse('RETENTION_B_CHANGED');
      const original=JSON.parse(await fs.readFile(snapshot.conditionsPath,'utf8'));
      const contexts=await readAuthenticatedCurrentCompanions(snapshot.verified,original);
      const fresh=ACTIVE_PREDECESSOR.snapshot(await ACTIVE_PREDECESSOR.read());
      if(!isDeepStrictEqual(snapshot,fresh))refuse('RETENTION_B_CHANGED');return contexts;
    }
  }
  const input = await readCurrentPrivateRuntimeCompanionInput(targetReferenceAt);
  const contexts = await readAuthenticatedCurrentCompanions(input.verified, input.originalConditions ?? input.conditions);
  await input.verify();
  return contexts;
}

export { readAuthenticatedCurrentCompanions };
