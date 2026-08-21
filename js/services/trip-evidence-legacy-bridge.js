import { activeTrip, answerTrip, onTripChange } from './trip-service.js?v=4.0.247';

function markLegacyAnswered(tripId, answer = null) {
  if (!tripId) return;
  answerTrip(tripId, {
    response: answer ? (answer.found ? 'yes' : 'no') : 'v2-deferred',
    grams: answer?.grams ?? null,
    date: answer?.observedDate || new Date().toISOString().slice(0, 10),
    zoneId: answer?.zoneId || null
  });
}

export function installTripEvidenceLegacyBridge({ runtime, onError = error => console.warn('Turdata kunne ikke færdiggøres', error) } = {}) {
  if (!runtime?.startWithPrompt || !runtime?.stop || !runtime?.resume || !runtime?.active) {
    throw new Error('Turdata-runtime mangler.');
  }
  let legacy = activeTrip();
  let queue = Promise.resolve();

  const finish = async (operation, tripId) => {
    const result = await operation();
    if (result?.status === 'deferred') markLegacyAnswered(tripId);
    else if (result?.answer) markLegacyAnswered(tripId, result.answer);
    return result;
  };

  const handle = trip => {
    queue = queue.then(async () => {
      if (trip) {
        legacy = trip;
        if (!runtime.active()) {
          await runtime.startWithPrompt({ tripId: trip.id, startedAt: trip.startedAt });
        }
        return;
      }
      const stoppedTrip = legacy;
      legacy = null;
      if (stoppedTrip && runtime.active() && !runtime.active().stoppedAt) {
        await finish(() => runtime.stop(), stoppedTrip.id);
      }
    }).catch(onError);
  };

  const unsubscribe = onTripChange(handle);
  const activeEvidence = runtime.active();
  if (activeEvidence?.stoppedAt) {
    queue = queue.then(() => finish(() => runtime.resume(), activeEvidence.tripId)).catch(onError);
  } else if (legacy && !activeEvidence) {
    handle(legacy);
  }

  return () => { if (typeof unsubscribe === 'function') unsubscribe(); };
}
