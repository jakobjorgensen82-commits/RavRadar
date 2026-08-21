import { openTripEvidenceDialog } from '../ui/trip-evidence-dialog.js?v=4.0.246';
import {
  beginTripEvidence,
  finishTripEvidence,
  loadActiveTripEvidence,
  markTripEvidenceStopped
} from './trip-evidence-store.js?v=4.0.246';
import { uploadPendingTripEvidence } from './trip-evidence-upload.js?v=4.0.246';

export function createTripEvidenceController({ storage = null, openDialog = openTripEvidenceDialog, persist = null } = {}) {
  if (typeof openDialog !== 'function') throw new Error('Turformularen mangler.');

  const showCompletion = async ({ zones, coastalParts } = {}) => {
    const active = loadActiveTripEvidence(storage);
    if (!active?.stoppedAt) throw new Error('Turen skal stoppes, før den kan besvares.');
    const searchMinutes = Math.max(1, Math.round((Date.parse(active.stoppedAt) - Date.parse(active.startedAt)) / 60000));
    const answer = await openDialog({
      searchMinutes,
      mode: active.mode,
      forecastZoneId: active.forecastZoneId,
      forecastCoastalPartId: active.forecastCoastalPartId,
      zones,
      coastalParts
    });
    if (!answer) return { status: 'deferred', tripId: active.tripId };

    const evidence = finishTripEvidence(answer, storage);
    if (typeof persist !== 'function') {
      return { status: 'queued', tripId: evidence.tripId, calibrationEligible: evidence.calibrationEligible, answer: { found: evidence.found, grams: evidence.grams, zoneId: evidence.zoneId, observedDate: evidence.observedAt.slice(0, 10) } };
    }
    const upload = await uploadPendingTripEvidence({ persist, storage });
    return {
      status: upload.failed ? 'queued' : 'submitted',
      tripId: evidence.tripId,
      calibrationEligible: evidence.calibrationEligible,
      answer: { found: evidence.found, grams: evidence.grams, zoneId: evidence.zoneId, observedDate: evidence.observedAt.slice(0, 10) },
      submitted: upload.submitted,
      failed: upload.failed
    };
  };

  return Object.freeze({
    start(input) {
      return beginTripEvidence(input, storage);
    },
    async stop({ endedAt, zones, coastalParts } = {}) {
      markTripEvidenceStopped(endedAt, storage);
      return showCompletion({ zones, coastalParts });
    },
    resume(options = {}) {
      return showCompletion(options);
    },
    flush() {
      if (typeof persist !== 'function') throw new Error('Databasefunktionen mangler.');
      return uploadPendingTripEvidence({ persist, storage });
    },
    active() {
      return loadActiveTripEvidence(storage);
    }
  });
}
