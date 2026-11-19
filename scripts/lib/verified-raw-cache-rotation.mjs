import {createHash} from 'node:crypto';
import {requirePublishedRawRotationRetention} from '../plan-ravscore-current-history.mjs';
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
      || Date.parse(retention.boundary.productionReferenceAt) >= Date.parse(current.targetReferenceAt)
      || receipt.boundarySha256 !== flatDigest(predecessor)
      || flatDigest(retention.boundary) !== flatDigest(current.boundary ?? {})
      || retention.schemaVersion !== 1 || retention.kind !== 'COMMITTED_POST_H0_UNKNOWN_RAW_RETENTION'
      || !Array.isArray(retention.captures) || retention.captures.length > 4096
      || retention.captures.length !== current.requiredCaptures
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
// the actual V2 report from that run's verified pre-mutation restore, or the
// finalized SAVE receipt plus SHA-bound membership and the authentic successor
// plan for the exact next target. It must
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
  return {
    status: 'READY',
    reason: raw.length === 2 ? 'already-two-raw-caches' : 'newest-two-raw-caches-verified',
    retain: raw.slice(0, 2).map(cacheIdentity),
    retire: raw.length > 2 ? [cacheIdentity(raw.at(-1))] : [],
  };
}
