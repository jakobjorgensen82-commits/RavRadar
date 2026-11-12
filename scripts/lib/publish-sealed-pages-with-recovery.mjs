import { setTimeout as sleep } from 'node:timers/promises';
import { sealedPagesFailureCode, sealedPagesDeliveryDiagnostic } from './run-sealed-pages-deployment.mjs';
import { selectSealedPagesRecovery, MINIMUM_RECOVERY_WINDOW_MS } from './pages-sealed-retry-decision.mjs';

const digest = /^[a-f0-9]{64}$/;
const horizon = 121;
const intervalMs = 5_000;
const outcome = (kind, extra) => Object.freeze({ kind, ...extra });

/**
 * Operates on one immutable, previously qualified artifact in the existing
 * exclusive Pages job. The normal public verifier is required after return.
 */
export async function publishSealedPagesWithRecovery({
  seal, predecessorSha256, submit, readPublic, revalidateWriter, timeRemainingMs,
  pause = sleep, maximumObservations = horizon,
} = {}) {
  if (!digest.test(seal?.targetPublicManifestSha256 ?? '') || !digest.test(predecessorSha256 ?? '')
    || predecessorSha256 === seal.targetPublicManifestSha256
    || !Number.isSafeInteger(maximumObservations) || maximumObservations < 2 || maximumObservations > horizon) {
    return outcome('HOLD', { reason: 'SCOPE_UNPROVED' });
  }
  let first;
  try {
    first = await submit(seal, 1);
  } catch (error) {
    return outcome('HOLD', { reason: 'FIRST_SUBMISSION_UNPROVED', stage: 'FIRST_SUBMISSION', diagnostic: sealedPagesFailureCode(error) });
  }
  if (first?.outcome === 'SUCCEEDED')
    return outcome('VERIFY_PUBLIC', { delivery: first, attempts: 1 });
  if (first?.outcome !== 'FAILED') {
    // An inconclusive write never permits a second POST. An independently
    // visible exact target may still be handed to the full verifier.
    try {
      if (first?.receipt && await readPublic() === seal.targetPublicManifestSha256)
        return outcome('VERIFY_PUBLIC', { delivery: first, attempts: 1 });
    } catch { /* The owner must get an honest unknown outcome. */ }
    return outcome('HOLD', { reason: 'FIRST_OUTCOME_UNPROVED', stage: 'FIRST_DEPLOYMENT', diagnostic: sealedPagesDeliveryDiagnostic(first) });
  }

  const observations = [];
  const limit = 2;
  try {
    for (let index = 0; index < limit; index++) {
      if (index > 0) await pause(intervalMs);
      const visible = await readPublic();
      if (visible === seal.targetPublicManifestSha256)
        return outcome('VERIFY_PUBLIC', { delivery: first, attempts: 1 });
      if (visible !== predecessorSha256)
        return outcome('HOLD', { reason: 'PUBLIC_TARGET_CHANGED_OR_UNPROVED' });
      observations.push(visible);
      if (observations.length >= 2 && timeRemainingMs() <= MINIMUM_RECOVERY_WINDOW_MS + intervalMs) break;
    }

    // A fresh existing main/writer/slot fence is mandatory before retry.
    const eligible = selectSealedPagesRecovery({
      seal, firstDelivery: first, firstRequest: first.request, firstReceipt: first.receipt, firstStatus: first.response,
      predecessorSha256, publicObservations: observations, remainingMs: timeRemainingMs(),
    });
    if (eligible !== 'RETRY_SAME_SEALED_PACKAGE_ONCE')
      return outcome('HOLD', { reason: 'RECOVERY_NOT_ELIGIBLE', stage: 'RECOVERY_DECISION', diagnostic: sealedPagesDeliveryDiagnostic(first) });
    if (await revalidateWriter(seal) !== true)
      return outcome('HOLD', { reason: 'WRITER_FENCE_UNPROVED' });

    // A late publication is handled by the full existing verifier.
    const final = await readPublic();
    if (final === seal.targetPublicManifestSha256)
      return outcome('VERIFY_PUBLIC', { delivery: first, attempts: 1 });
    if (final !== predecessorSha256 || timeRemainingMs() < MINIMUM_RECOVERY_WINDOW_MS)
      return outcome('HOLD', { reason: 'PUBLIC_OR_BUDGET_CHANGED' });

    const second = await submit(seal, 2);
    if (second?.outcome !== 'SUCCEEDED'
      && !(second?.receipt && await readPublic() === seal.targetPublicManifestSha256))
      return outcome('HOLD', { reason: 'SECOND_OUTCOME_UNPROVED', attempts: 2, stage: 'SECOND_DEPLOYMENT', diagnostic: sealedPagesDeliveryDiagnostic(second) });
    return outcome('VERIFY_PUBLIC', { delivery: second, attempts: 2 });
  } catch (error) {
    return outcome('HOLD', { reason: 'RECOVERY_CHECK_OR_SUBMISSION_UNPROVED', stage: 'RECOVERY_CHECK_OR_SUBMISSION', diagnostic: sealedPagesFailureCode(error) });
  }
}
