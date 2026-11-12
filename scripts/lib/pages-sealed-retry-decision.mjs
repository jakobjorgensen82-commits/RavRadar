import { classifyPagesStatus } from './pages-per-artifact-identity.mjs';
import { hasSealedPagesRetryEvidence } from './run-sealed-pages-deployment.mjs';

const sha = /^[a-f0-9]{64}$/;
const commit = /^[a-f0-9]{40}$/;
const minute = 60_000;
export const MINIMUM_RECOVERY_WINDOW_MS = 19 * minute;
export const ORDINARY_PAGES_RETRY_POLL_MS = 6 * minute;
// Existing planning reserve, not a proved maximum public/CAS execution time.
export const NORMAL_PAGES_COMPLETION_RESERVE_MS = MINIMUM_RECOVERY_WINDOW_MS - ORDINARY_PAGES_RETRY_POLL_MS;
// Latest GET + one CANCEL + seven terminal GETs and six pauses.
export const ORDINARY_PAGES_CLEANUP_RESERVE_MS = (2 + 7) * 12_000 + (7 - 1) * 5_000;
export function hasOrdinaryPagesWriteBudget(remainingMs, pollMs) {
  return Number.isSafeInteger(remainingMs) && Number.isSafeInteger(pollMs) && pollMs >= 5_000
    && remainingMs >= 12_000 + pollMs + ORDINARY_PAGES_CLEANUP_RESERVE_MS + NORMAL_PAGES_COMPLETION_RESERVE_MS;
}
const MINIMUM_OBSERVATIONS = 2;
const MAXIMUM_OBSERVATIONS = 121;
const known = Object.freeze({
  verify: 'VERIFY_EXACT_PUBLIC_TARGET',
  retry: 'RETRY_SAME_SEALED_PACKAGE_ONCE',
  hold: 'HOLD_PUBLICATION',
});

export function getOrdinaryPagesRetryDeadline({ createdAt, startedAt, jobStartedMs, nowMs }) {
  const created = Date.parse(createdAt);
  const started = Date.parse(startedAt);
  if (!Number.isFinite(created) || !Number.isFinite(started) || created > started
    || !Number.isSafeInteger(jobStartedMs) || started > jobStartedMs || jobStartedMs > nowMs
    || !Number.isSafeInteger(nowMs)) throw new Error('PAGES_RETRY_JOB_CLOCK');

  // A queued run belongs to its original dispatch slot. Runner startup must
  // never buy it more retry time after a new weather slot has already arrived.
  const cadence = 4 * 60 * minute;
  const offset = 19 * minute;
  const nextSlot = (Math.floor((created - offset) / cadence) + 1) * cadence + offset;
  return Math.min(jobStartedMs + 35 * minute, nextSlot);
}

// A read-only decision. The caller still owns the normal main/runner/writer
// fences, the exact package, and the existing full public verification.
export function selectSealedPagesRecovery({
  seal, firstDelivery, firstRequest, firstReceipt, firstStatus, predecessorSha256,
  publicObservations, remainingMs,
} = {}) {
  if (!commit.test(seal?.headSha ?? '') || !sha.test(seal?.targetPublicManifestSha256 ?? '')
    || !sha.test(predecessorSha256 ?? '') || predecessorSha256 === seal.targetPublicManifestSha256
    || !Number.isSafeInteger(seal?.artifactId) || seal.artifactId <= 0
    || firstRequest?.deliveryOrdinal !== 1 || firstRequest.artifactId !== seal.artifactId
    || !commit.test(firstRequest.buildVersion ?? '') || firstRequest.buildVersion === seal.headSha
    || !sha.test(firstRequest.clientIntentSha256 ?? '')
    || firstRequest.buildVersion !== firstRequest.clientIntentSha256.slice(0, 40)
    || !hasSealedPagesRetryEvidence(firstDelivery) || firstDelivery.request !== firstRequest
    || firstDelivery.receipt !== firstReceipt || firstDelivery.response !== firstStatus
    || !Array.isArray(publicObservations)
    || publicObservations.length < MINIMUM_OBSERVATIONS || publicObservations.length > MAXIMUM_OBSERVATIONS) {
    return known.hold;
  }

  if (publicObservations.at(-1) === seal.targetPublicManifestSha256) return known.verify;
  if (publicObservations.some(observed => observed !== predecessorSha256)
    || !Number.isSafeInteger(remainingMs) || remainingMs < MINIMUM_RECOVERY_WINDOW_MS) {
    return known.hold;
  }

  const status = classifyPagesStatus(firstStatus, firstReceipt);
  return status.outcome === 'FAILED' && ['deployment_failed', 'deployment_cancelled'].includes(status.code)
    ? known.retry : known.hold;
}
