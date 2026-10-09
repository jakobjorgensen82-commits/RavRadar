import { assertTripEvidencePrivacy, toObservationTripColumns } from './trip-evidence-contract.js?v=4.0.556';
import { listPendingTripEvidence, markTripEvidenceSubmitted } from './trip-evidence-store.js?v=4.0.556';

export async function uploadPendingTripEvidence({ persist, storage = null } = {}) {
  if (typeof persist !== 'function') throw new Error('Databasefunktionen mangler.');
  const pending = listPendingTripEvidence(storage);
  const result = { attempted: pending.length, submitted: 0, failed: 0, failures: [] };

  for (const evidence of pending) {
    const tripId = String(evidence?.tripId || 'unknown');
    try {
      const payload = toObservationTripColumns(evidence);
      assertTripEvidencePrivacy(payload);
      const receipt = await persist(payload, { conflictTarget: 'trip_id' });
      if (receipt?.stored === 'pending' || receipt?.stored === 'local') {
        throw new Error('Turen er gemt på enheden og afventer afsendelse.');
      }
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
