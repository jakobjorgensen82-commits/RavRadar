import {createHash} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import {isInertLegacyQueue} from '../check-weather-cadence-watchdog.mjs';
import {requirePublishedRawRotationRetention} from '../plan-ravscore-current-history.mjs';
import {WEATHER_STATE_EPOCH_ORIGINAL_DATASET} from '../weather-state-epoch-budget.mjs';
import {isMainRawCache} from './github-actions-cache-stock.mjs';
import {canonicalSavedDmiOriginalCapture} from './saved-dmi-original-capture.mjs';

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
  const boundary = current?.boundary;
  const captures = current?.requiredCaptures;
  if (!validRawBoundary(boundary) || !Number.isInteger(captures) || captures < 1 || captures > 4096) return false;
  const { id, key, version } = cache;
  return observation?.kind === 'DMI_RESTORED_RAW_OBSERVATION_V2'
    && typeof current.runId === 'string' && /^[1-9][0-9]{0,19}$/.test(current.runId)
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


function matchesRawSave(saved, current, cache) {
  const receipt = saved?.receipt;
  const bytes = saved?.membershipBytes;
  const predecessor = saved?.predecessorBoundary;
  let retention;
  try {
    retention = requirePublishedRawRotationRetention(current?.successorPlan, {
      targetReferenceAt: current?.targetReferenceAt, boundary: current?.boundary,
    });
  } catch {
    return false;
  }
  const runId = current?.runId;
  const runAttempt = current?.runAttempt;
  const { id, key } = cache;
  if (receipt?.schemaVersion !== 2 || receipt.kind !== 'DMI_RAW_SAVE_COMMITTED_MEMBERSHIP'
      || receipt.cacheId !== id || receipt.key !== key
      || typeof runId !== 'string' || !/^[1-9][0-9]{0,19}$/.test(runId)
      || typeof runAttempt !== 'string' || !/^[1-9][0-9]{0,19}$/.test(runAttempt)
      || !key.endsWith('-' + runId + '-' + runAttempt)
      || typeof current.sourceHead !== 'string' || !/^[0-9a-f]{40}$/.test(current.sourceHead)
      || !validRawBoundary(predecessor) || !validRawBoundary(retention?.boundary)
      || Date.parse(predecessor.productionReferenceAt) >= Date.parse(retention.boundary.productionReferenceAt)
      || receipt.boundarySha256 !== flatDigest(predecessor)
      || retention.captures.length === 0 || retention.captures.length !== current.requiredCaptures
      || !Buffer.isBuffer(bytes) || bytes.length === 0 || bytes.length > 1024 * 1024
      || ![receipt.captureSetSha256, receipt.manifestSha256].every(value => typeof value === 'string' && SHA256.test(value))
      || createHash('sha256').update(bytes).digest('hex') !== receipt.observationSha256) return false;
  let membership;
  try { membership = JSON.parse(bytes.toString('utf8')); }
  catch { return false; }
  if (membership?.schemaVersion !== 2 || membership.execution?.RUN_ID !== runId
      || membership.execution?.RUN_ATTEMPT !== runAttempt || membership.execution?.SHA !== current.sourceHead
      || !['boundarySha256', 'captureSetSha256', 'manifestSha256'].every(name => membership[name] === receipt[name])
      || !Array.isArray(membership.files) || membership.files.length < 1 || membership.files.length > 4096
      || membership.files.some(row => !Array.isArray(row) || row.length !== 3
        || typeof row[0] !== 'string' || !/^[a-f0-9]{24}\.[a-z0-9]{1,20}$/i.test(row[0])
        || typeof row[2] !== 'string' || !SHA256.test(row[2]))) return false;
  if (new Set(membership.files.map(row => row[0])).size !== membership.files.length) return false;
  const savedDigests = [...new Set(membership.files.map(row => row[2]))].sort();
  if (savedDigests.length !== receipt.verifiedCaptureCount
      || createHash('sha256').update(JSON.stringify(savedDigests)).digest('hex') !== receipt.captureSetSha256) return false;
  const savedSet = new Set(savedDigests);
  return retention.captures.every(raw => {
    const capture = canonicalSavedDmiOriginalCapture(raw);
    if (!capture) return false;
    // The producer hashes canonical UTF-8 without the acquisition timestamp.
    const { acquiredAt, ...identity } = capture;
    return savedSet.has(flatDigest(identity));
  });
}

function isoHour(value) {
  const time = finiteTime(value);
  return time !== null && new Date(time).toISOString() === value.replace(/Z$/, '.000Z');
}

// A pure decision. The normal caller must authenticate both unfiltered repo
// inventories under the production lock, the current B/S and capture plan, and
// the exact next target's capture demand calculated from the authentic
// published B/S. Retirement requires a finalized SAVE receipt with SHA-bound
// membership covering that demand. A current restore can confirm the two
// existing copies without authorizing a retirement. The caller must
// also independently verify both finalized keep identities in order, and every
// RAW dependency of any still-admissible checkpoint, including exact/parked
// requests. A complete protection snapshot promises that entire scope.
// Reacquire fresh state before any mutation if the lock or evidence may change.
export function planRawDmiCacheRotation({ before, after, retained, current, observation, saved } = {}) {
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
  if (saved === undefined) {
    if (!matchesRawRestore(observation, current, raw[0])) return hold('current-raw-restore-coverage-unverified');
  } else if (!matchesRawSave(saved, current, raw[0])) return hold('successor-raw-save-coverage-unverified');

  for (const pin of latestProtection) {
    const row = raw.find(candidate => matchesCache(candidate, pin));
    if (!row) return hold('protected-raw-cache-unavailable');
    if (!matchesCache(row, retained[0]) && !matchesCache(row, retained[1])) return hold('protected-raw-cache-outside-newest-two');
  }
  if (raw.length > 2 && saved === undefined) return hold('retirement-requires-successor-save');
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
const FIXED_RAW_CACHE_WORKFLOWS = [
  'audit-saved-weather-inputs.yml',
  'recover-saved-dmi-originals.yml',
];

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
  const owner = runs.get(ownerRunId);
  if (owner?.path !== ORDINARY_WEATHER || owner.head_sha !== sourceHead || owner.head_branch !== 'main'
      || owner.status !== 'in_progress' || owner.run_attempt !== 1 || owner.event !== 'workflow_dispatch'
      || owner.actor?.login !== 'github-actions[bot]' || owner.triggering_actor?.login !== 'github-actions[bot]') {
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
export async function readRawCacheProtection({inventory, boundary, repository, sourceHead, ownerRunId, getJson}) {
  const hold = reason => ({complete: false, reason, caches: []});
  const rows = completeCacheInventory(inventory);
  if (!rows || !validRawBoundary(boundary)) return hold('protected-baseline-unconfirmed');
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

// Call from the separate production-lock owner with freshly authenticated
// B/S and archive evidence for the actual next hour. readSnapshot must
// recompute stock and pins, and verifyOwner must fail on loss of the lock
// or movement of that versioned B/S. The read-only builder cannot call this.
export async function retireVerifiedRawCache({
  repository, githubToken, readSnapshot, verifyOwner, current, saved, retained, request = fetch,
}) {
  const hold = reason => ({status: 'HOLD', reason, retire: []});
  if (repository !== 'jakobjorgensen82-commits/RavRadar' || typeof githubToken !== 'string' || !githubToken
      || typeof readSnapshot !== 'function' || typeof verifyOwner !== 'function' || typeof request !== 'function') {
    throw new Error('RAW_CACHE_RETIREMENT_SCOPE');
  }
  if (!saved) return hold('retirement-requires-successor-save');
  await verifyOwner();
  const before = await readSnapshot();
  const after = await readSnapshot();
  const plan = planRawDmiCacheRotation({before, after, current, saved, retained});
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
    if (acknowledged && same) return {status: 'RETIRED', cacheId: oldest.id};
  } catch {
    // Preserve uncertainty and never move on to a second deletion.
  }
  return hold('cache-retirement-not-confirmed');
}
