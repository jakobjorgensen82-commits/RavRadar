import { assertTripEvidencePrivacy, toObservationTripColumns } from './trip-evidence-contract.js?v=4.0.564';
import { listPendingTripEvidence, markTripEvidenceSubmitted } from './trip-evidence-store.js?v=4.0.564';

import { authIdentityEpoch, currentSession } from './auth-service.js?v=4.0.564';
import { reserveTripEvidenceUpload, submitTripEvidenceObservation } from './observation-service.js?v=4.0.564';

function sameUploadedTripValue(left, right) {
  if (left === right) return true;
  if (!left || !right || typeof left !== 'object' || typeof right !== 'object'
    || Array.isArray(left) !== Array.isArray(right)) return false;
  if (Array.isArray(left) && left.length !== right.length) return false;
  const keys = Object.keys(left);
  return keys.length === Object.keys(right).length
    && keys.every(key => Object.hasOwn(right, key) && sameUploadedTripValue(left[key], right[key]));
}

function exactRemoteTripReceipt(receipt, payload, ownerId) {
  const row = receipt?.row;
  return receipt?.stored === 'remote' && row && typeof row === 'object' && !Array.isArray(row)
    && typeof row.id === 'string' && row.id.length > 0
    && (row.user_id || null) === ownerId
    && Object.keys(payload).every(key => Object.hasOwn(row, key) && sameUploadedTripValue(row[key], payload[key]));
}

export async function uploadPendingTripEvidence({ persist, storage = null } = {}) {
  if (typeof persist !== 'function') throw new Error('Databasefunktionen mangler.');
  const pending = listPendingTripEvidence(storage);
  const result = { attempted: pending.length, submitted: 0, failed: 0, failures: [] };

  const release = reserveTripEvidenceUpload(pending);
  try {
  for (const evidence of pending) {
    const tripId = String(evidence?.tripId || 'unknown');
    try {
      const payload = toObservationTripColumns(evidence);
      assertTripEvidencePrivacy(payload);
      const identity = authIdentityEpoch();
      const active = currentSession();
      const ownerId = active?.user?.id || null;
      const mayHydrate = Boolean(active?.access_token && !ownerId);
      const receipt = await persist(payload, { conflictTarget: 'trip_id' });
      if (receipt?.stored === 'pending' || receipt?.stored === 'local') {
        throw new Error('Turen er gemt på enheden og afventer afsendelse.');
      }
      const currentOwnerId = currentSession()?.user?.id || null;
      if (authIdentityEpoch() !== identity || (!mayHydrate && currentOwnerId !== ownerId)) {
        throw new Error('Kontoen blev ændret. Prøv igen fra den rigtige konto.');
      }
      if (!markTripEvidenceSubmitted(tripId, storage, evidence)
        && !(persist === submitTripEvidenceObservation && exactRemoteTripReceipt(receipt, payload, currentOwnerId))) {
        throw new Error('Den bekræftede tur fandtes ikke længere i den lokale kø.');
      }
      result.submitted += 1;
    } catch (error) {
      result.failed += 1;
      result.failures.push({ tripId, message: String(error?.message || error) });
    }
  }

  return result;
  } finally { release(); }
}
