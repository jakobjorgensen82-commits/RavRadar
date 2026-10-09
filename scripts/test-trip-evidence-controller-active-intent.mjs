import assert from 'node:assert/strict';
import test from 'node:test';
import { createTripEvidenceController } from '../js/services/trip-evidence-controller.js';
import { listPendingTripEvidence } from '../js/services/trip-evidence-store.js';
import { ravScoreModelBinding } from '../js/core/ravscore-model-contract.js';
import { t } from '../js/i18n.js';

// Actual normal controller/store/contract; only storage and the async dialog
// boundary are supplied. All records are in memory. No submission or network.
const binding = ravScoreModelBinding();
const start = (tripId, startedAt = '2026-08-23T06:00:00.000Z') => ({
  tripId, startedAt, mode: 'waders', zoneId: 'DK-B04-12', coastalPartId: 'DK-B04-12-P01',
  forecastSnapshot: { id: 'rr-test-210', issuedAt: '2026-08-23T05:00:00.000Z',
    validAt: startedAt, capturedAt: startedAt },
  forecastCalibrationEligible: true, dataQualityFlags: [],
  calibrationFeatures: {
    modelVersion: binding.modelId, appVersion: '4.0.317', modelStateVersion: binding.stateSchemaVersion,
    modelVariantId: binding.variantId, modelProfileId: binding.profileId,
    modelComponentSchemaId: binding.componentSchemaId, modelExplanationSchemaId: binding.explanationSchemaId,
    modelRankingPolicyId: binding.rankingPolicyId, modelBestTimePolicyId: binding.bestTimePolicyId,
    modelPresentationPolicyId: binding.presentationPolicyId,
    modelContractSha256: binding.modelContractSha256, modelBundleSha256: binding.modelBundleSha256,
    totalScore: 50, scoreBoundLower: 50, scoreBoundUpper: 50, scoreBoundModelUncertaintyPoints: 0,
    scoreBoundRawLower: 50, scoreBoundRawUpper: 50, historyCoverageHours: 48,
    scoreQuality: 'FULL_HISTORY', scoreSemantics: 'EXACT_POINT_SCORE', scoreCalibrationEligible: true,
    conservativeTailResetApplied: false, historyReasonCodes: [], huntabilityScore: 50,
    transportScore: 50, mobilisationScore: 50, reasonCodes: [],
  },
});
const tripA = '11111111-1111-4111-8111-111111111111';
const tripB = '22222222-2222-4222-8222-222222222222';
const stopA = { endedAt: '2026-08-23T07:00:00.000Z' };
const completion = { zoneId: 'DK-B04-12', coastalPartId: 'DK-B04-12-P01',
  searchCoverage: 'normal', found: false, grams: null };
function memoryStorage() {
  const values = new Map();
  return { values, getItem: key => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, String(value)), removeItem: key => values.delete(key) };
}
function deferred() {
  let resolve;
  const promise = new Promise(done => { resolve = done; });
  return { promise, resolve };
}

for (const action of ['discard', 'submit']) {
  for (const replacement of ['new-trip', 'changed-stop', 'changed-mode', 'missing']) {
    test(`a held ${action} answer cannot mutate ${replacement} after its original dialog opened`, async () => {
      const storage = memoryStorage(), dialog = deferred();
      let persistCalls = 0, dialogCalls = 0;
      const original = createTripEvidenceController({ storage, openDialog: () => ++dialogCalls === 1 ? dialog.promise : Promise.resolve(completion),
        persist: async () => { persistCalls += 1; } });
      let nextAnswer = { action: 'discard' };
      const other = createTripEvidenceController({ storage, openDialog: async () => nextAnswer });
      original.start(start(tripA));
      const pending = original.stop(stopA).then(value => ({ ok: true, value }), error => ({ ok: false, error }));
      let expected;
      try {
        if (replacement === 'new-trip') {
          assert.equal((await other.resume()).tripId, tripA);
          other.start(start(tripB, '2026-08-23T08:00:00.000Z'));
          nextAnswer = null;
          if (action === 'submit') await other.stop({ endedAt: '2026-08-23T09:00:00.000Z' });
        } else if (replacement === 'changed-stop') {
          nextAnswer = null;
          await other.stop({ endedAt: '2026-08-23T07:15:00.000Z' });
        } else {
          await other.resume();
          if (replacement === 'changed-mode') {
            other.start({ ...start(tripA), mode: 'beach' });
            nextAnswer = null;
            await other.stop(stopA);
          }
        }
        expected = JSON.stringify([...storage.values]);
        dialog.resolve(action === 'discard' ? { action } : completion);
        const result = await pending;
        assert.equal(JSON.stringify([...storage.values]) === expected, true, 'Preserve the exact current active and pending storage');
        assert.equal(result.ok, false, 'An old dialog must not consume or report success for a changed active trip');
        assert.equal(result.error.message, t('trip.status.failed'), 'Use the existing translated user message');
        assert.equal(persistCalls, 0, 'Never upload an answer attached to the wrong active snapshot');
        if (replacement === 'missing') assert.equal(other.active(), null);
        else {
          const active = other.active();
          assert.equal(active.tripId, replacement === 'new-trip' ? tripB : tripA);
          const retried = await (active.stoppedAt ? original.resume() : original.stop({ endedAt: '2026-08-23T09:00:00.000Z' }));
          assert.equal(retried.status, 'submitted', 'A fresh form can still complete the preserved current trip');
          assert.equal(retried.tripId, active.tripId);
          assert.equal(persistCalls, 1);
          assert.equal(listPendingTripEvidence(storage).length, 0);
          assert.equal(original.active(), null);
        }
      } finally {
        dialog.resolve(null);
        await pending;
      }
    });
  }
}

for (const action of ['defer', 'discard', 'submit']) {
  test(`unchanged normal ${action} still applies only to its own active trip`, async () => {
    const storage = memoryStorage();
    const controller = createTripEvidenceController({ storage,
      openDialog: async () => action === 'defer' ? null : action === 'discard' ? { action } : completion });
    controller.start(start(tripA));
    const result = await controller.stop(stopA);
    assert.equal(result.tripId, tripA);
    assert.equal(result.status, action === 'defer' ? 'deferred' : action === 'discard' ? 'discarded' : 'queued');
    assert.equal(controller.active()?.tripId ?? null, action === 'defer' ? tripA : null);
    const pending = listPendingTripEvidence(storage);
    assert.equal(pending.length, action === 'submit' ? 1 : 0);
    if (action === 'submit') {
      assert.equal(pending[0].tripId, tripA);
      assert.equal(pending[0].tripStartedAt, start(tripA).startedAt);
      assert.equal(pending[0].tripEndedAt, stopA.endedAt);
    }
  });
}
