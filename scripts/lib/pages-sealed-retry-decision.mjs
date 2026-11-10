import { classifyPagesStatus } from './pages-per-artifact-identity.mjs';

const sha = /^[a-f0-9]{64}$/;
const commit = /^[a-f0-9]{40}$/;
export const MINIMUM_RECOVERY_WINDOW_MS = 19 * 60 * 1000;
const MINIMUM_OBSERVATIONS = 2;
const MAXIMUM_OBSERVATIONS = 121;
const known = Object.freeze({
  verify: 'VERIFY_EXACT_PUBLIC_TARGET',
  retry: 'RETRY_SAME_SEALED_PACKAGE_ONCE',
  hold: 'HOLD_PUBLICATION',
});

// A read-only decision. The caller still owns the normal main/runner/writer
// fences, the exact package, and the existing full public verification.
export function selectSealedPagesRecovery({
  seal, firstRequest, firstReceipt, firstStatus, predecessorSha256,
  publicObservations, remainingMs,
} = {}) {
  if (!commit.test(seal?.headSha ?? '') || !sha.test(seal?.targetPublicManifestSha256 ?? '')
    || !sha.test(predecessorSha256 ?? '') || predecessorSha256 === seal.targetPublicManifestSha256
    || !Number.isSafeInteger(seal?.artifactId) || seal.artifactId <= 0
    || firstRequest?.deliveryOrdinal !== 1 || firstRequest.artifactId !== seal.artifactId
    || !commit.test(firstRequest.buildVersion ?? '') || firstRequest.buildVersion === seal.headSha
    || firstReceipt?.deploymentId !== firstRequest.buildVersion
    || firstReceipt.statusUrl !== firstRequest.statusUrl
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
