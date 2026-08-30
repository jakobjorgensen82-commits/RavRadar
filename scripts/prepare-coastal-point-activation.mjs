#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  activatedRecoveryEntries,
  candidateGStateKey,
  POINT_STAGE_READY,
  promotedDirectionDocument,
  stagedEntries,
} from './lib/coastal-point-staging-contract.mjs';

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const REVIEWS = path.join(ROOT, 'data/admin/direction-reviews.json');
const ACTIVE_PARTS = path.join(ROOT, 'data/live/coastal-parts-v2.json');
const PUBLIC_DMI = path.join(ROOT, 'data/live/dmi-bulk-cache.json');
const PRIVATE_DMI = path.join(ROOT, '.cache/coastal-point-staging/dmi.json');
const PRIVATE_STATE = path.join(ROOT, '.cache/coastal-point-staging/state.json');
const PRIVATE_STATUS = path.join(ROOT, '.cache/coastal-point-staging/status.json');
const SYNC_META = path.join(ROOT, '.cache/admin-config-sync.json');
const INJECTION = path.join(ROOT, '.cache/coastal-point-staging/activation-state-injection.json');
const PENDING = path.join(ROOT, '.cache/coastal-point-staging/pending-promotion.json');

const read = async file => JSON.parse(await fs.readFile(file, 'utf8'));
const readOptional = async (file, fallback = {}) => { try { return await read(file); } catch { return fallback; } };
const atomicWrite = async (file, value) => {
  await fs.mkdir(path.dirname(file), { recursive: true });
  const temporary = `${file}.${process.pid}.tmp`;
  await fs.writeFile(temporary, `${JSON.stringify(value, null, 2)}\n`);
  await fs.rename(temporary, file);
};
const samePoint = (left, right, tolerance = 1e-7) => Array.isArray(left) && Array.isArray(right)
  && left.length >= 2 && right.length >= 2
  && left.slice(0, 2).every((value, index) => Number.isFinite(Number(value))
    && Math.abs(Number(value) - Number(right[index])) <= tolerance);

function normalizePromotedDmiZone(zone) {
  const normalized = structuredClone(zone);
  for (const hour of Object.values(normalized?.hourly ?? {})) {
    for (const [uKey, vKey, speedKey, directionKey] of [
      ['wind-u-10m', 'wind-v-10m', 'wind-speed-10m', 'wind-dir-10m'],
      ['wind-tail-u-10m', 'wind-tail-v-10m', 'wind-tail-speed-10m', 'wind-tail-dir-10m'],
    ]) {
      const u = Number(hour?.[uKey]);
      const v = Number(hour?.[vKey]);
      if (!Number.isFinite(u) || !Number.isFinite(v)) continue;
      hour[speedKey] = Math.hypot(u, v);
      hour[directionKey] = (Math.atan2(-u, -v) * 180 / Math.PI + 360) % 360;
    }
  }
  return normalized;
}

async function clearTransientActivationFiles(injectionPath, pendingPath) {
  await Promise.all([injectionPath, pendingPath].map(file => fs.rm(file, { force: true })));
}

export async function prepareActivation({
  now = new Date().toISOString(),
  reviewsPath = REVIEWS,
  activePartsPath = ACTIVE_PARTS,
  publicDmiPath = PUBLIC_DMI,
  privateDmiPath = PRIVATE_DMI,
  privateStatePath = PRIVATE_STATE,
  privateStatusPath = PRIVATE_STATUS,
  syncMetaPath = SYNC_META,
  injectionPath = INJECTION,
  pendingPath = PENDING,
} = {}) {
  const [directionDocument, activeParts, privateDmi, privateState, privateStatus, syncMeta] = await Promise.all([
    read(reviewsPath), read(activePartsPath), readOptional(privateDmiPath), readOptional(privateStatePath),
    readOptional(privateStatusPath), readOptional(syncMetaPath),
  ]);
  const requestedCandidates = stagedEntries(directionDocument, activeParts).filter(entry => entry.activationRequested);
  const recoveryCandidates = requestedCandidates.length ? [] : activatedRecoveryEntries(directionDocument, activeParts);
  const candidates = requestedCandidates.length ? requestedCandidates : recoveryCandidates;
  const recoveryOnly = requestedCandidates.length === 0 && recoveryCandidates.length > 0;
  if (!candidates.length) {
    await clearTransientActivationFiles(injectionPath, pendingPath);
    return { prepared: false, reason: 'no-activation-request' };
  }
  const statuses = new Map((privateStatus.entries ?? []).map(entry => [entry.stageId, entry]));
  const stateRows = privateState.stages ?? {};
  const maximumStatusAgeMs = 2 * 60 * 60 * 1000;
  for (const candidate of candidates) {
    const status = statuses.get(candidate.stageId);
    const state = stateRows[candidate.stageId];
    const dmiZone = privateDmi?.zones?.[candidate.stageId];
    const expectedStateKey = candidateGStateKey(candidate.part);
    if (!status || status.revision !== candidate.revision || status.status !== POINT_STAGE_READY) {
      await clearTransientActivationFiles(injectionPath, pendingPath);
      return { prepared: false, reason: recoveryOnly ? 'activation-recovery-cache-unavailable' : 'candidate-not-ready', partId: candidate.partId };
    }
    if (!recoveryOnly && (!Number.isFinite(Date.parse(status.checkedAt)) || Date.parse(now) - Date.parse(status.checkedAt) > maximumStatusAgeMs)) {
      await clearTransientActivationFiles(injectionPath, pendingPath);
      return { prepared: false, reason: 'readiness-status-stale', partId: candidate.partId };
    }
    if (!state?.continuationState || state.stateKey !== expectedStateKey || state.continuationState.stateKey !== expectedStateKey) {
      throw new Error(`${candidate.partId}: READY-status mangler eksakt Candidate G-tilstand`);
    }
    if (!dmiZone || !samePoint(dmiZone.samplingPoint, candidate.part.waterPoint)) {
      throw new Error(`${candidate.partId}: READY-status mangler eksakt privat DMI-serie`);
    }
  }
  const activatedAt = now;
  const expectedVersion = recoveryOnly ? null : Number(syncMeta?.documents?.['direction-reviews']?.version);
  if (!recoveryOnly && (!Number.isInteger(expectedVersion) || expectedVersion < 1)) {
    throw new Error('Central direction-reviews-version mangler; aktivering stoppet før lokal ændring');
  }
  const promoted = recoveryOnly
    ? directionDocument
    : promotedDirectionDocument(directionDocument, candidates, activatedAt);
  const publicDmi = await read(publicDmiPath);
  const states = {};
  for (const candidate of candidates) {
    publicDmi.zones ??= {};
    publicDmi.zones[`PART::${candidate.partId}`] = normalizePromotedDmiZone(privateDmi.zones[candidate.stageId]);
    states[candidate.partId] = structuredClone(stateRows[candidate.stageId].continuationState);
  }
  const pending = recoveryOnly ? null : {
    schemaVersion: 1,
    preparedAt: now,
    documentKey: 'direction-reviews',
    expectedVersion,
    revisions: [...new Set(candidates.map(candidate => candidate.revision))].sort(),
    partIds: candidates.map(candidate => candidate.partId).sort(),
    payload: promoted,
  };
  await Promise.all([
    ...(recoveryOnly ? [] : [atomicWrite(reviewsPath, promoted)]),
    atomicWrite(publicDmiPath, publicDmi),
    atomicWrite(injectionPath, { schemaVersion: 1, preparedAt: now, states }),
    ...(recoveryOnly ? [fs.rm(pendingPath, { force: true })] : [atomicWrite(pendingPath, pending)]),
  ]);
  return { prepared: true, recoveryOnly, partIds: candidates.map(candidate => candidate.partId).sort(), expectedVersion };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  prepareActivation().then(result => console.log(JSON.stringify(result))).catch(error => {
    console.error(error instanceof Error ? error.stack : String(error));
    process.exitCode = 1;
  });
}
