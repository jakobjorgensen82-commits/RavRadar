import { assertTripEvidencePrivacy, toObservationTripColumns } from './trip-evidence-contract.js?v=4.0.264';
import { listPendingTripEvidence, markTripEvidenceSubmitted } from './trip-evidence-store.js?v=4.0.264';

export async function uploadPendingTripEvidence({ persist, storage = null } = {}) {
  if (typeof persist !== 'function') throw new Error('Databasefunktionen mangler.');
  const pending = listPendingTripEvidence(storage);
  const result = { attempted: pending.length, submitted: 0, failed: 0, failures: [] };

  for (const evidence of pending) {
    const tripId = String(evidence?.tripId || 'unknown');
    try {
      const payload = toObservationTripColumns(evidence);
      assertTripEvidencePrivacy(payload);
      await persist(payload, { conflictTarget: 'trip_id' });
      if (!markTripEvidenceSubmitted(tripId, storage)) {
        throw new Error('Den bekræftede tur fandtes ikke længere i den lokale kø.');
      }
      result.submitted += 1;
    } catch (error) {
      result.failed += 1;
      result.failures.push({ tripId, message: String(error?.message || error) });
    }
  }

  return result;
}
