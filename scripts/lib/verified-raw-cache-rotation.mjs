import {createHash} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import {isInertLegacyQueue} from '../check-weather-cadence-watchdog.mjs';
import {isDeepStrictEqual} from 'node:util';
import {WEATHER_STATE_EPOCH_ORIGINAL_DATASET} from '../weather-state-epoch-budget.mjs';
import {isMainRawCache, rawCacheStockRows, readGithubActionsCacheStock} from './github-actions-cache-stock.mjs';
import {authenticateRawRotationHandoff, isAuthenticatedRawRotationHandoff} from './raw-rotation-handoff.mjs';
import {DMI_PRODUCER_JOB, DMI_PRODUCER_STEP, successfulStep} from './terminal-dmi-cache.mjs';

const SHA256 = /^[0-9a-f]{64}$/;
const EXACT_HOUR = /^\d{4}-\d{2}-\d{2}T\d{2}:00:00Z$/;

function finiteTime(value) {
  const time = Date.parse(value);
  return Number.isFinite(time) ? time : null;
}

function cacheIdentity({ id, key, ref, version } = {}) {
  return Number.isSafeInteger(id) && id > 0 && typeof key === 'string' && key.length > 0
    && typeof ref === 'string' && ref.length > 0 && typeof version === 'string' && SHA256.test(version)
    ? { id, key, ref, version } : null;
}

function completeCacheInventory(inventory) {
  const rows = inventory?.actions_caches;
  if (!Array.isArray(rows) || inventory.total_count !== rows.length) return null;
  const byId = new Map();
  for (const row of rows) {
    const identity = row && cacheIdentity(row);
    const createdAt = typeof row?.created_at === 'string' ? finiteTime(row.created_at) : null;
    const bytes = row?.size_in_bytes;
    if (!identity || byId.has(identity.id) || createdAt === null || !Number.isSafeInteger(bytes) || bytes < 0) return null;
    // Restores may update last_accessed_at between these reads.
    byId.set(identity.id, { ...identity, createdAt, bytes });
  }
  return [...byId.values()].sort((left, right) => left.id - right.id);
}

function completeProtectedCaches(protection) {
  if (protection?.complete !== true || !Array.isArray(protection.caches)) return null;
  const byIdentity = new Map();
  for (const row of protection.caches) {
    const identity = row && cacheIdentity(row);
    if (!identity || !identity.key.startsWith('dmi-grib-')) return null;
    byIdentity.set(JSON.stringify(identity), identity);
  }
  return [...byIdentity.keys()].sort().map(key => byIdentity.get(key));
}

function matchesCache(row, expected) {
  return row && expected && row.id === expected.id && row.key === expected.key
    && row.ref === expected.ref && row.version === expected.version;
}

function flatDigest(record) {
  return createHash('sha256').update(JSON.stringify(record, Object.keys(record).sort())).digest('hex');
}

function validRawBoundary(boundary) {
  return boundary && Object.keys(boundary).length === 5 && typeof boundary.datasetId === 'string'
    && boundary.datasetId.startsWith('rr-') && typeof boundary.productionReferenceAt === 'string'
    && finiteTime(boundary.productionReferenceAt) !== null
    && ['bundleContentSha256', 'checkpointGenerationSha256', 'conditionsSha256']
      .every(name => typeof boundary[name] === 'string' && SHA256.test(boundary[name]));
}

function matchesRawRestore(observation, current, cache) {
  return observation?.kind === 'DMI_RESTORED_RAW_OBSERVATION_V2'
    && matchesRawCoverageReport(observation, current, cache);
}

function matchesRawCoverageReport(observation, current, cache) {
  const boundary = current?.boundary;
  const captures = current?.requiredCaptures;
  if (!validRawBoundary(boundary) || !Number.isInteger(captures) || captures < 1 || captures > 4096) return false;
  const { id, key, version } = cache;
  return typeof current.runId === 'string' && /^[1-9][0-9]{0,19}$/.test(current.runId)
    && typeof current.runAttempt === 'string' && /^[1-9][0-9]{0,19}$/.test(current.runAttempt)
    && typeof current.sourceHead === 'string' && /^[0-9a-f]{40}$/.test(current.sourceHead)
    && typeof current.targetReferenceAt === 'string' && EXACT_HOUR.test(current.targetReferenceAt)
    && isoHour(current.targetReferenceAt)
    && observation.runId === current.runId && observation.runAttempt === current.runAttempt
    && observation.sourceHead === current.sourceHead && observation.targetReferenceAt === current.targetReferenceAt
    && observation.baselineBoundarySha256 === flatDigest(boundary)
    && observation.cacheIdentitySha256 === flatDigest({ id, key, version })
    && observation.allRequiredVerified === true && observation.requiredCaptures === captures
    && observation.protectedFiles === captures && observation.unavailableCaptures === 0;
}


function requirePublishedRawRotationRetention(plan, {targetReferenceAt, boundary}) {
  const statedTarget = targetReferenceAt?.replace(/\.000Z$/, 'Z');
  const target = EXACT_HOUR.test(statedTarget ?? '') && isoHour(statedTarget) && new Date(statedTarget).toISOString();
  if (!target || plan?.schemaVersion !== 1 || plan.kind !== 'PUBLISHED_RAW_ROTATION_SUCCESSOR_PLAN'
      || plan.targetReferenceAt !== target) throw new Error('RETENTION_SUCCESSOR_TARGET');
  const {retention} = plan;
  if (!validRawBoundary(boundary) || !isDeepStrictEqual(boundary, retention?.boundary)
      || retention.schemaVersion !== 1 || retention.kind !== 'COMMITTED_POST_H0_UNKNOWN_RAW_RETENTION'
      || !Array.isArray(retention.captures) || retention.captures.length > 4096) {
    throw new Error('RETENTION_SUCCESSOR_BOUNDARY');
  }
  const hours = (Date.parse(target) - Date.parse(boundary.productionReferenceAt)) / 3_600_000;
  if (!Number.isInteger(hours) || hours < 1 || hours > 72) throw new Error('RETENTION_SUCCESSOR_TARGET');
  return retention;
}

// The normal pre-DMI planner already derived this demand from the installed
// protected B/S at the actual next lock. Reuse it; do not restore B/S again.
export function buildRawSuccessorPlanBytes({demand, targetReferenceAt, boundary}) {
  if (demand?.schemaVersion !== 2 || demand.kind !== 'RAVSCORE_CURRENT_HISTORY_ACQUISITION_DEMAND'
      || !Array.isArray(demand.demands) || demand.demands.length !== 673
      || demand.demands.some(row => typeof row?.partId !== 'string' || !row.partId)
      || new Set(demand.demands.map(row => row.partId)).size !== 673) {
    throw new Error('RAW_ROTATION_NORMAL_DEMAND_UNCONFIRMED');
  }
  const plan = {
    schemaVersion: 1, kind: 'PUBLISHED_RAW_ROTATION_SUCCESSOR_PLAN',
    targetReferenceAt: demand.productionReferenceAt, retention: demand.rawRetention,
  };
  const retention = requirePublishedRawRotationRetention(plan, {targetReferenceAt, boundary});
  const bytes = Buffer.from(JSON.stringify(plan) + '\n', 'utf8');
  if (retention.captures.length === 0 || bytes.length > 1024 * 1024) {
    throw new Error('RAW_ROTATION_NORMAL_DEMAND_UNCONFIRMED');
  }
  return bytes;
}

function matchesRestoredSuccessor(restoredSuccessor, current, cache) {
  const receipt = restoredSuccessor?.receipt;
  if (isAuthenticatedRawRotationHandoff(restoredSuccessor)) {
    const {id, key, version} = cache;
    return current?.boundary === restoredSuccessor.boundary
      && receipt.targetReferenceAt === current.targetReferenceAt
      && receipt.runId === current.runId && receipt.runAttempt === current.runAttempt
      && receipt.sourceHead === current.sourceHead && receipt.verifiedCaptureCount === current.requiredCaptures
      && receipt.cacheIdentitySha256 === flatDigest({id, key, version});
  }
  const bytes = restoredSuccessor?.planBytes;
  if (receipt?.schemaVersion !== 1 || receipt.kind !== 'DMI_RESTORED_RAW_SUCCESSOR_COVERAGE_V1'
      || !Buffer.isBuffer(bytes) || bytes.length < 1 || bytes.length > 1024 * 1024
      || createHash('sha256').update(bytes).digest('hex') !== receipt.planSha256) return false;
  let retention;
  try {
    const plan = JSON.parse(new TextDecoder('utf-8', {fatal: true}).decode(bytes));
    retention = requirePublishedRawRotationRetention(plan, {
      targetReferenceAt: current?.targetReferenceAt, boundary: current?.boundary,
    });
  } catch {
    return false;
  }
  if (retention.captures.length !== current.requiredCaptures) return false;
  return matchesRawCoverageReport(receipt, {
    ...current, targetReferenceAt: current.targetReferenceAt.replace(/\.000Z$/, 'Z'),
  }, cache);
}

function isoHour(value) {
  const time = finiteTime(value);
  return time !== null && new Date(time).toISOString() === value.replace(/Z$/, '.000Z');
}

// A pure decision. The normal caller must authenticate both unfiltered repo
// inventories under the production lock, the current B/S and capture plan, and
// the exact next target's capture demand calculated from the authentic
// published B/S. Retirement requires a finalized SAVE receipt with SHA-bound
// membership covering that demand, or a separately authenticated physical
// check of the restored archive against that same exact successor demand. A
// current-hour restore alone cannot authorize retirement. The caller must
// also independently verify both finalized keep identities in order, and every
// RAW dependency of any still-admissible checkpoint, including exact/parked
// requests. A complete protection snapshot promises that entire scope.
// Reacquire fresh state before any mutation if the lock or evidence may change.
export function planRawDmiCacheRotation({
  before, after, retained, current, observation, restoredSuccessor,
} = {}) {
  const hold = reason => ({ status: 'HOLD', reason, retire: [] });
  const original = completeCacheInventory(before?.inventory);
  const latest = completeCacheInventory(after?.inventory);
  if (!original || !latest) return hold('incomplete-cache-inventory');
  if (JSON.stringify(original) !== JSON.stringify(latest)) return hold('cache-inventory-changed');
  const originalProtection = completeProtectedCaches(before?.protection);
  const latestProtection = completeProtectedCaches(after?.protection);
  if (!originalProtection || !latestProtection) return hold('incomplete-raw-cache-protection');
  if (JSON.stringify(originalProtection) !== JSON.stringify(latestProtection)) return hold('raw-cache-protection-changed');

  const raw = latest.filter(row => row.key.startsWith('dmi-grib-'));
  if (raw.some(row => !isMainRawCache(row))) {
    return hold('other-raw-cache-conflicts-with-newest-two');
  }
  if (raw.some(row => row.bytes === 0)) return hold('raw-cache-upload-not-finalized');
  if (raw.some(row => row.version !== raw[0].version)) return hold('raw-cache-version-conflict');
  if (new Set(raw.map(row => row.key)).size !== raw.length) return hold('ambiguous-raw-cache-key');
  if (raw.length < 2 || !Array.isArray(retained) || retained.length !== 2) return hold('two-finalized-raw-caches-required');
  raw.sort((left, right) => right.createdAt - left.createdAt || right.id - left.id);
  if (raw[0].createdAt === raw[1].createdAt || raw[1].createdAt === raw[2]?.createdAt
      || !matchesCache(raw[0], retained[0]) || !matchesCache(raw[1], retained[1])) {
    return hold('raw-cache-order-or-identity-mismatch');
  }
  if (restoredSuccessor !== undefined) {
    if (!matchesRestoredSuccessor(restoredSuccessor, current, raw[0])) {
      return hold('restored-successor-coverage-unverified');
    }
  } else if (!matchesRawRestore(observation, current, raw[0])) {
    return hold('current-raw-restore-coverage-unverified');
  }

  for (const pin of latestProtection) {
    const row = raw.find(candidate => matchesCache(candidate, pin));
    if (!row) return hold('protected-raw-cache-unavailable');
    if (!matchesCache(row, retained[0]) && !matchesCache(row, retained[1])) return hold('protected-raw-cache-outside-newest-two');
  }
  if (raw.length > 2 && restoredSuccessor === undefined) {
    return hold('retirement-requires-successor-coverage');
  }
  return {
    status: 'READY',
    reason: raw.length === 2 ? 'already-two-raw-caches' : 'newest-two-raw-caches-verified',
    retain: raw.slice(0, 2).map(cacheIdentity),
    retire: raw.length > 2 ? [cacheIdentity(raw.at(-1))] : [],
  };
}

const ACTIVE_ACTIONS_STATES = ['queued', 'in_progress', 'waiting', 'requested', 'pending'];
const LEGACY_WEATHER = '.github/workflows/update-and-deploy.yml';
const ORDINARY_WEATHER = '.github/workflows/run-current-weather-once.yml';
const PRODUCTION_REPOSITORY = 'jakobjorgensen82-commits/RavRadar';
const FIXED_RAW_CACHE_WORKFLOWS = [
  'audit-saved-weather-inputs.yml',
  'recover-saved-dmi-originals.yml',
];

function activeOrdinaryOwner(run, repository, sourceHead, ownerRunId) {
  return run?.id === ownerRunId && run.repository?.full_name === repository
    && run.path === ORDINARY_WEATHER && run.head_sha === sourceHead && run.head_branch === 'main'
    && run.status === 'in_progress' && run.conclusion === null && run.run_attempt === 1
    && run.event === 'workflow_dispatch' && run.actor?.login === 'github-actions[bot]'
    && run.triggering_actor?.login === 'github-actions[bot]';
}

// The caller holds the production queue and supplies the exact running owner.
// This is a read-only census. It cannot reserve a queued request or replace the
// protected B/S and exact cache pin inventory. An uninspected input holds.
export async function readRawCacheReaderActivity({repository, sourceHead, ownerRunId, getJson}) {
  if (!/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(repository ?? '')
      || !/^[a-f0-9]{40}$/.test(sourceHead ?? '')
      || !Number.isSafeInteger(ownerRunId) || ownerRunId < 1 || typeof getJson !== 'function') {
    throw new Error('RAW_CACHE_READER_ACTIVITY_INVALID');
  }
  const hold = reason => ({status: 'HOLD', reason});
  const actions = '/repos/' + repository + '/actions';
  const requests = await Promise.all(ACTIVE_ACTIONS_STATES.map(async status => ({
    status, data: await getJson(actions + '/runs?status=' + status + '&per_page=100'),
  })));
  const runs = new Map();
  for (const {status, data} of requests) {
    if (!Array.isArray(data?.workflow_runs) || data.total_count !== data.workflow_runs.length
        || data.total_count > 100) return hold('incomplete-reader-inventory');
    for (const run of data.workflow_runs) {
      if (!Number.isSafeInteger(run?.id) || run.id < 1 || runs.has(run.id) || run.status !== status
          || run.conclusion !== null || run.repository?.full_name !== repository
          || typeof run.path !== 'string' || !/^\.github\/workflows\/[a-zA-Z0-9_.-]+\.ya?ml$/.test(run.path)
          || typeof run.head_branch !== 'string' || !/^[a-f0-9]{40}$/.test(run.head_sha ?? '')
          || !Number.isSafeInteger(run.run_attempt) || run.run_attempt < 1) {
        return hold('incomplete-reader-inventory');
      }
      runs.set(run.id, run);
    }
  }
  if (!activeOrdinaryOwner(runs.get(ownerRunId), repository, sourceHead, ownerRunId)) {
    return hold('rotation-owner-unconfirmed');
  }
  const potentialLegacy = [];
  for (const run of runs.values()) {
    if (run.id === ownerRunId) continue;
    if (run.path === LEGACY_WEATHER && run.head_branch === 'main' && isInertLegacyQueue(run)) {
      potentialLegacy.push(run);
      continue;
    }
    // Until a caller is positively known to be independent of this stock,
    // new workflows on main are also a reason to keep the existing copies.
    return hold('possible-raw-reader-active-or-queued');
  }
  const legacyJobs = await Promise.all(potentialLegacy.map(run =>
    getJson(actions + '/runs/' + run.id + '/attempts/1/jobs?per_page=1')));
  if (legacyJobs.some(jobs => jobs?.total_count !== 0 || !Array.isArray(jobs.jobs) || jobs.jobs.length !== 0)) {
    return hold('legacy-reader-not-proved-inert');
  }
  return {status: 'CLEAR', checkedRuns: runs.size, inertLegacy: potentialLegacy.length};
}

// The caller supplies the locked, authenticated protected B/S and the full
// stock on exact main. The shared production lock is required for admission;
// this metadata census does not reserve cache entries or give write authority.
export async function readRawCacheProtection({inventory, boundary, repository, sourceHead, ownerRunId, getJson,
  restoredSuccessor}) {
  const hold = reason => ({complete: false, reason, caches: []});
  const rows = completeCacheInventory(inventory);
  const boundHandoff = isAuthenticatedRawRotationHandoff(restoredSuccessor)
    && boundary === restoredSuccessor.boundary && sourceHead === restoredSuccessor.receipt.sourceHead
    && String(ownerRunId) === restoredSuccessor.receipt.runId;
  if (!rows || (!validRawBoundary(boundary) && !boundHandoff)) return hold('protected-baseline-unconfirmed');
  if (boundary.datasetId === WEATHER_STATE_EPOCH_ORIGINAL_DATASET) {
    return hold('legacy-exact-raw-request-admissible');
  }
  const activity = await readRawCacheReaderActivity({repository, sourceHead, ownerRunId, getJson});
  if (activity.status !== 'CLEAR') return hold(activity.reason);

  // The fixed exact keys are already declared in these checked-out workflows.
  // Retain every literal key that is still present, irrespective of its age.
  const sources = await Promise.all(FIXED_RAW_CACHE_WORKFLOWS.map(file =>
    readFile(new URL('../../.github/workflows/' + file, import.meta.url), 'utf8')));
  const fixedKeys = new Set(sources.flatMap(text => text.match(/dmi-grib-v4-Linux-\d{4}-W\d{2}-\d+-\d+\b/g) ?? []));
  if (fixedKeys.size === 0) return hold('fixed-raw-pin-catalogue-unavailable');
  return {complete: true, caches: rows.filter(row => fixedKeys.has(row.key)).map(cacheIdentity)};
}

// Authenticated source identity initially comes from the normal B/S producer.
// Rechecking the exact numbered documents avoids restoring either payload at
// each cache mutation boundary. Owner head and B source may differ on bootstrap.
export async function verifyRawCacheRotationOwner({sourceHead, ownerRunId, publishedSourceHead,
  boundary, bVersion, sVersion, getJson, readProtectedB, readProtectedSVersion, restoredSuccessor}) {
  const boundHandoff = isAuthenticatedRawRotationHandoff(restoredSuccessor) && boundary === restoredSuccessor.boundary
    && bVersion === restoredSuccessor.published.bVersion && sVersion === restoredSuccessor.published.sVersion
    && publishedSourceHead === restoredSuccessor.published.bSourceHead
    && sourceHead === restoredSuccessor.receipt.sourceHead && String(ownerRunId) === restoredSuccessor.receipt.runId;
  if (![sourceHead, publishedSourceHead].every(sha => /^[a-f0-9]{40}$/.test(sha ?? ''))
      || ![ownerRunId, bVersion, sVersion].every(value => Number.isSafeInteger(value) && value > 0)
      || (!validRawBoundary(boundary) && !boundHandoff)) throw new Error('RAW_ROTATION_OWNER_SCOPE');
  const repo = '/repos/' + PRODUCTION_REPOSITORY;
  const [ref, run, currentB, currentSVersion] = await Promise.all([
    getJson(repo + '/git/ref/heads/main'), getJson(repo + '/actions/runs/' + ownerRunId + '/attempts/1'),
    readProtectedB(), readProtectedSVersion(),
  ]);
  if (!activeOrdinaryOwner(run, PRODUCTION_REPOSITORY, sourceHead, ownerRunId)
      || run.head_repository?.full_name !== PRODUCTION_REPOSITORY
      || ref?.ref !== 'refs/heads/main' || ref.object?.type !== 'commit' || ref.object.sha !== sourceHead) {
    throw new Error('RAW_ROTATION_OWNER_MOVED');
  }
  if (currentB?.centralVersion !== bVersion || currentSVersion !== sVersion
      || currentB.sourceHead !== publishedSourceHead || currentB.datasetId !== boundary.datasetId
      || currentB.productionReferenceAt !== boundary.productionReferenceAt
      || currentB.bundleContentSha256 !== boundary.bundleContentSha256
      || currentB.expectedZoneCount !== 210 || currentB.expectedPartCount !== 673) {
    throw new Error('RAW_ROTATION_PROTECTED_PAIR_MOVED');
  }
}

// Call from the separate production-lock owner with freshly authenticated
// B/S and archive evidence for the actual next hour. readSnapshot must
// recompute stock and pins, and verifyOwner must fail on loss of the lock
// or movement of that versioned B/S. The read-only builder cannot call this.
export async function retireVerifiedRawCache({
  repository, githubToken, readSnapshot, verifyOwner, current, restoredSuccessor, retained, request = fetch,
}) {
  const hold = reason => ({status: 'HOLD', reason, retire: []});
  if (repository !== PRODUCTION_REPOSITORY || typeof githubToken !== 'string' || !githubToken
      || typeof readSnapshot !== 'function' || typeof verifyOwner !== 'function' || typeof request !== 'function') {
    throw new Error('RAW_CACHE_RETIREMENT_SCOPE');
  }
  if (!restoredSuccessor) return hold('retirement-requires-successor-coverage');
  await verifyOwner();
  const before = await readSnapshot();
  const after = await readSnapshot();
  const plan = planRawDmiCacheRotation({before, after, current, restoredSuccessor, retained});
  if (plan.status !== 'READY' || plan.retire.length !== 1) return plan;

  const [oldest] = plan.retire;
  const expected = completeCacheInventory(after.inventory).filter(row => row.id !== oldest.id);
  const protectedRows = completeProtectedCaches(after.protection);
  await verifyOwner();
  let acknowledged = false;
  try {
    const response = await request('https://api.github.com/repos/' + repository + '/actions/caches/' + oldest.id, {
      method: 'DELETE', redirect: 'error', cache: 'no-store', signal: AbortSignal.timeout(10_000),
      headers: {Authorization: 'Bearer ' + githubToken, Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2026-03-10'},
    });
    acknowledged = response?.status === 204 && response.redirected === false;
  } catch {
    // An ambiguous write must never be repeated. Check the inventory once.
  }
  try {
    await verifyOwner();
    const observed = await readSnapshot();
    const same = JSON.stringify(completeCacheInventory(observed?.inventory)) === JSON.stringify(expected)
      && JSON.stringify(completeProtectedCaches(observed?.protection)) === JSON.stringify(protectedRows);
    if (acknowledged && same) {
      await verifyOwner();
      const remainingRawCopies = expected.filter(row => isMainRawCache(row)).length;
      return {status: 'RETIRED', cacheId: oldest.id, remainingRawCopies};
    }
  } catch {
    // Preserve uncertainty and never move on to a second deletion.
  }
  return hold('cache-retirement-not-confirmed');
}

// Resolve the initial four-copy overlap without treating one DELETE as a
// batch. The second decision must rebuild its own inventory and protection.
export async function closeRawCacheOverlap(options) {
  const first = await retireVerifiedRawCache(options);
  if (first.status !== 'RETIRED') return {retired: [], lastDecision: first};
  if (first.remainingRawCopies !== 3) return {retired: [first.cacheId], lastDecision: first};
  const second = await retireVerifiedRawCache(options);
  return {retired: second.status === 'RETIRED' ? [first.cacheId, second.cacheId] : [first.cacheId],
    lastDecision: second};
}

// Called only by the cache-write job of the same ordinary workflow. Recheck
// that its reader is still waiting and that main and the exact B/S have not
// advanced before doing anything irreversible.
export async function closeRawCacheOverlapFromHandoff({bytes, scope, githubToken, getJson,
  verifyArtifactProducer, readProtectedB, readProtectedSVersion, request = fetch}) {
  const restoredSuccessor = await authenticateRawRotationHandoff({bytes, scope, verifyArtifactProducer,
    readProtectedB, readProtectedSVersion});
  const {receipt, boundary, published} = restoredSuccessor;
  const ownerRunId = Number(receipt.runId);
  if (!Number.isSafeInteger(ownerRunId)) throw new Error('RAW_ROTATION_OWNER_SCOPE');
  const repository = PRODUCTION_REPOSITORY;
  const sourceHead = receipt.sourceHead;
  const current = {runId: receipt.runId, runAttempt: receipt.runAttempt, sourceHead,
    targetReferenceAt: receipt.targetReferenceAt, boundary, requiredCaptures: receipt.verifiedCaptureCount};
  const verifyOwner = async () => {
    await verifyArtifactProducer();
    await verifyRawCacheRotationOwner({sourceHead, ownerRunId, publishedSourceHead: published.bSourceHead,
      boundary, bVersion: published.bVersion, sVersion: published.sVersion, restoredSuccessor,
      getJson, readProtectedB, readProtectedSVersion});
  };
  const readStock = () => readGithubActionsCacheStock(repository, getJson);
  const stock = await readStock();
  const raw = rawCacheStockRows(stock);
  if (raw.length < 2 || raw.length > 4 || raw.some(row => !isMainRawCache(row))) {
    return {status: 'HOLD', reason: 'raw-cache-count-or-identity-unconfirmed', retiredCount: 0};
  }
  raw.sort((left, right) => Date.parse(right.created_at) - Date.parse(left.created_at) || right.id - left.id);
  const retained = await Promise.all(raw.slice(0, 2).map(cache => readFinalizedRawCache({cache, repository, getJson})));
  if (retained.some(identity => identity === null)) {
    return {status: 'HOLD', reason: 'the-newest-two-raw-saves-are-unconfirmed', retiredCount: 0};
  }
  const readSnapshot = async () => {
    const {inventory} = await readStock();
    return {inventory, protection: await readRawCacheProtection({inventory, boundary, repository,
      sourceHead, ownerRunId, getJson, restoredSuccessor})};
  };
  const {retired, lastDecision} = await closeRawCacheOverlap({repository, githubToken, readSnapshot,
    verifyOwner, current, restoredSuccessor, retained, request});
  if ((lastDecision.status === 'RETIRED' && lastDecision.remainingRawCopies === 2)
      || (lastDecision.status === 'READY' && lastDecision.reason === 'already-two-raw-caches')) {
    return {status: 'READY', reason: 'two-verified-raw-caches', retiredCount: retired.length};
  }
  return {status: 'HOLD', reason: lastDecision.reason ?? 'raw-cache-count-unconfirmed', retiredCount: retired.length};
}

// This verifies a completed upload, not the set of originals inside it.
export async function readFinalizedRawCache({cache, repository, getJson}) {
  const identity = cache && cacheIdentity(cache);
  if (!identity || !isMainRawCache(identity)
      || !Number.isSafeInteger(cache.size_in_bytes) || cache.size_in_bytes < 1
      || typeof cache.created_at !== 'string' || finiteTime(cache.created_at) === null
      || !/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(repository ?? '') || typeof getJson !== 'function') {
    return null;
  }
  const [runId, runAttempt] = cache.key.split('-').slice(-2).map(Number);
  if (![runId, runAttempt].every(value => Number.isSafeInteger(value) && value >= 1)) return null;
  const attempt = '/repos/' + repository + '/actions/runs/' + runId + '/attempts/' + runAttempt;
  const run = await getJson(attempt);
  if (run?.id !== runId || run.run_attempt !== runAttempt || run.head_branch !== 'main'
      || run.repository?.full_name !== repository || run.path !== ORDINARY_WEATHER
      || !/^[a-f0-9]{40}$/.test(run.head_sha ?? '')) return null;

  const reply = await getJson(attempt + '/jobs?per_page=100');
  if (!Array.isArray(reply?.jobs) || reply.total_count !== reply.jobs.length || reply.total_count > 100) return null;
  const workers = reply.jobs.filter(job => job?.name === DMI_PRODUCER_JOB);
  if (workers.length !== 1) return null;
  const [job] = workers;
  if (job.run_id !== runId || job.run_attempt !== runAttempt || job.head_branch !== 'main'
      || job.head_sha !== run.head_sha || !Array.isArray(job.steps)) return null;
  const dmi = successfulStep(job, DMI_PRODUCER_STEP);
  const save = successfulStep(job, 'Save progressed DMI GRIB download cache');
  const created = finiteTime(cache.created_at);
  if (!dmi || !save || dmi.number >= save.number || dmi.completedAt > save.startedAt
      || created < save.startedAt - 1_000 || created > save.completedAt + 2_000) return null;
  return identity;
}
