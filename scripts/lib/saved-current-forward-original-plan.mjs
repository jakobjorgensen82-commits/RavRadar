// Private metadata preparation at the actual ordinary updater callsite.
// This issues neither sampling evidence nor authority to continue or publish.
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { collectPostH0DmiOriginalDependencies } from './post-h0-dmi-original-dependencies.mjs';
import { ownFileDescriptorIdentity, ownedFileDescriptorClosed } from './private-weather-component-pack.mjs';
import { selectRavScoreProductionInitialState } from './ravscore-production-part-pipeline.mjs';
import { canonicalSavedDmiOriginalCapture } from './saved-dmi-original-capture.mjs';

export const SAVED_CURRENT_FORWARD_PLAN_PATH = '.cache/saved-current-forward-originals.json';
export const SAVED_CURRENT_FORWARD_PLAN_SOURCE = '39066350748-1';
export const SAVED_CURRENT_FORWARD_PLAN_TARGET = '2026-10-17T20:00:00.000Z';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const canonical = value => JSON.stringify(value, (_key, item) => item && typeof item === 'object' && !Array.isArray(item)
  ? Object.fromEntries(Object.keys(item).sort().map(key => [key, item[key]])) : item);
const sha = value => crypto.createHash('sha256').update(value).digest('hex');
const fail = () => { throw Object.assign(new Error('SAVED_CURRENT_FORWARD_ORIGINAL_PLAN_REFUSED'),
  { code: 'SAVED_CURRENT_FORWARD_ORIGINAL_PLAN_REFUSED' }); };
const forwardUnknown = error => error?.code === 'DMI_GRID_SAMPLING_APPLICABILITY_REQUIRED'
  && error.samplingStatus === 'unknown'
  && /at currentComponent \([^\n]*ravscore-recovery-replay\.mjs:280:\d+\)/.test(error.stack ?? '')
  && /at buildRavScoreRecoveryReplay \([^\n]*ravscore-recovery-replay\.mjs:1084:\d+\)/.test(error.stack ?? '');
let sealed = null;

export function validateSavedCurrentForwardOriginalDocument(bytes, { parts, conditions } = {}) {
  if (!Buffer.isBuffer(bytes) || bytes.length < 2 || bytes.length > 16 * 1024 * 1024
    || !(parts instanceof Map) || parts.size !== 673) fail();
  let document;
  try { document = JSON.parse(bytes.toString('utf8')); } catch { fail(); }
  const exact = (value, keys) => value && typeof value === 'object' && !Array.isArray(value)
    && canonical(Object.keys(value).sort()) === canonical([...keys].sort());
  if (canonical(document) + '\n' !== bytes.toString('utf8') || !exact(document,
    ['schemaVersion', 'kind', 'progressSource', 'targetReferenceAt', 'observedParts', 'gridUnknownParts',
      'demands', 'captures', 'sourceAdmissionPerformed', 'continuationIssued', 'publicationInvoked'])
    || document.schemaVersion !== 1 || document.kind !== 'SAVED_CURRENT_FORWARD_ORIGINAL_DEPENDENCIES'
    || document.progressSource !== SAVED_CURRENT_FORWARD_PLAN_SOURCE
    || document.targetReferenceAt !== SAVED_CURRENT_FORWARD_PLAN_TARGET || document.observedParts !== 673
    || !Number.isSafeInteger(document.gridUnknownParts) || document.gridUnknownParts < 1 || document.gridUnknownParts > 673
    || !Array.isArray(document.demands) || document.demands.length !== parts.size
    || !Array.isArray(document.captures) || document.captures.length > 4096
    || ['sourceAdmissionPerformed', 'continuationIssued', 'publicationInvoked'].some(key => document[key] !== false)) fail();
  const seen = new Set();
  for (const row of document.demands) {
    if (!exact(row, ['partId', 'initialStateAt', 'initialStateSha256', 'endAt']) || seen.has(row.partId)) fail();
    const part = parts.get(row.partId);
    if (!part || row.endAt !== document.targetReferenceAt) fail();
    const initial = selectRavScoreProductionInitialState({ part,
      existingPart: conditions?.coastalParts?.parts?.[row.partId], targetReferenceAt: document.targetReferenceAt });
    if (initial.source !== 'EXISTING_INTEGRATED' || initial.state?.time !== row.initialStateAt
      || sha(canonical(initial.state)) !== row.initialStateSha256) fail();
    seen.add(row.partId);
  }
  const captures = new Set();
  for (const row of document.captures) {
    const capture = canonicalSavedDmiOriginalCapture(row), key = canonical(row);
    if (!capture || canonical(capture) !== key || captures.has(key)) fail();
    captures.add(key);
  }
  return document;
}

export function createSavedCurrentForwardOriginalPlan({ environment = process.env,
  establishedNativeCurrentOrigin, targetReferenceAt, expectedPartCount } = {}) {
  const requested = environment.RAVRADAR_SAVED_CURRENT_FORWARD_ORIGINAL_PLAN;
  if (requested === undefined || requested === '') return null;
  if (requested !== SAVED_CURRENT_FORWARD_PLAN_SOURCE
    || environment.RAVRADAR_SAVED_CURRENT_REPLAY_DIAGNOSTIC !== requested
    || environment.RAVRADAR_WEATHER_CACHE_ONLY !== 'true'
    || environment.RAVRADAR_WEATHER_STATE_EPOCH_BOOTSTRAP !== 'false'
    || environment.RAVRADAR_WEATHER_STATE_EPOCH_CHECKPOINT_REENTRY !== 'false'
    || targetReferenceAt !== SAVED_CURRENT_FORWARD_PLAN_TARGET
    || establishedNativeCurrentOrigin == null || expectedPartCount !== 673 || sealed !== null) fail();
  const parts = new Map(), originals = new Map();
  let firstError = null, unknownParts = 0, finished = false;
  return Object.freeze({
    observe(input) {
      if (finished || !input?.part?.partId || parts.has(input.part.partId)
        || parts.size >= expectedPartCount || input.targetReferenceAt !== targetReferenceAt) fail();
      const result = collectPostH0DmiOriginalDependencies(input);
      const state = input.initialSelection?.state;
      const demand = { partId: input.part.partId, initialStateAt: result.initialStateAt,
        initialStateSha256: sha(canonical(state)), endAt: targetReferenceAt };
      parts.set(input.part.partId, { demand, outcome: null });
      for (const capture of result.captures) {
        originals.set(canonical(capture), capture);
        if (originals.size > 4096) fail();
      }
    },
    passed(partId) {
      const part = parts.get(partId);
      if (finished || !part || part.outcome !== null) fail();
      part.outcome = 'NORMAL_PART_RETURNED';
    },
    refused(partId, error) {
      const part = parts.get(partId);
      // The unchanged production pipeline must have reached its forward gate,
      // after genuine per-PART origin qualification, not an invented handle.
      if (finished || !part || part.outcome !== null || !forwardUnknown(error)) fail();
      firstError ??= error; unknownParts++;
      part.outcome = 'NORMAL_FORWARD_GRID_UNKNOWN';
    },
    seal(error, diagnostic) {
      if (finished || sealed || firstError !== error || !forwardUnknown(error)
        || parts.size !== expectedPartCount || diagnostic?.observedParts !== expectedPartCount
        || diagnostic.gridUnknownParts !== unknownParts || unknownParts < 1 || originals.size < 1
        || [...parts.values()].some(part => part.outcome === null)) fail();
      finished = true;
      sealed = { error, document: {
        schemaVersion: 1, kind: 'SAVED_CURRENT_FORWARD_ORIGINAL_DEPENDENCIES',
        progressSource: SAVED_CURRENT_FORWARD_PLAN_SOURCE, targetReferenceAt,
        observedParts: parts.size, gridUnknownParts: unknownParts,
        demands: [...parts.values()].map(value => value.demand).sort((a, b) => a.partId.localeCompare(b.partId)),
        captures: [...originals].sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0).map(([, value]) => value),
        sourceAdmissionPerformed: false, continuationIssued: false, publicationInvoked: false,
      } };
    },
  });
}

// Called only at the outer async boundary while rethrowing the SAME failure.
// The fixed private output is never attached to that exception or raw logs.
export async function persistSavedCurrentForwardOriginalPlan(error) {
  if (!sealed || sealed.error !== error) fail();
  const directory = path.join(ROOT, '.cache');
  for (const value of [ROOT, directory]) {
    const stat = await fs.lstat(value);
    if (!stat.isDirectory() || stat.isSymbolicLink() || await fs.realpath(value) !== value) fail();
  }
  const bytes = Buffer.from(canonical(sealed.document) + '\n');
  if (bytes.length > 16 * 1024 * 1024) fail();
  const handle = await fs.open(path.join(ROOT, SAVED_CURRENT_FORWARD_PLAN_PATH),
    fs.constants.O_WRONLY | fs.constants.O_CREAT | fs.constants.O_EXCL | (fs.constants.O_NOFOLLOW ?? 0), 0o600);
  const fd = handle.fd, identity = ownFileDescriptorIdentity(fd);
  let failure;
  try { await handle.writeFile(bytes); await handle.sync(); }
  catch (value) { failure = value; }
  try { await handle.close(); } catch (value) { failure ??= value; }
  if (!await ownedFileDescriptorClosed(fd, identity)) failure ??= new Error('SAVED_CURRENT_FORWARD_PLAN_CLOSE_UNPROVED');
  if (failure) throw failure;
  sealed = null;
  return { planBytes: bytes.length, planSha256: sha(bytes) };
}
