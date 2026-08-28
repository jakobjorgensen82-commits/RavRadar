import {
  TRIP_EVIDENCE_SCHEMA_VERSION,
  completeTripEvidence,
  createTripStartRecord
} from './trip-evidence-contract.js?v=4.0.300';

const ACTIVE_KEY = 'ravradar-trip-evidence-v2-active';
const PENDING_KEY = 'ravradar-trip-evidence-v2-pending';

function resolveStorage(storage) {
  const resolved = storage || globalThis.localStorage;
  if (!resolved?.getItem || !resolved?.setItem || !resolved?.removeItem) {
    throw new Error('Lokal lagring er ikke tilgængelig.');
  }
  return resolved;
}

function readJson(storage, key, fallback) {
  const raw = storage.getItem(key);
  if (raw == null || raw === '') return fallback;
  try {
    return JSON.parse(raw);
  } catch {
    throw new Error(`Lokale turdata i ${key} kan ikke læses sikkert.`);
  }
}

export function loadActiveTripEvidence(storage = null) {
  const active = readJson(resolveStorage(storage), ACTIVE_KEY, null);
  if (active == null) return null;
  if (active.schemaVersion !== TRIP_EVIDENCE_SCHEMA_VERSION) {
    throw new Error('Den aktive tur bruger en ukendt dataversion.');
  }
  return active;
}

export function listPendingTripEvidence(storage = null) {
  const pending = readJson(resolveStorage(storage), PENDING_KEY, []);
  if (!Array.isArray(pending)) throw new Error('Den lokale turkø har ugyldigt format.');
  return pending;
}

export function beginTripEvidence(input, storage = null) {
  const target = resolveStorage(storage);
  if (loadActiveTripEvidence(target)) throw new Error('Der er allerede en aktiv ravtur.');
  const record = createTripStartRecord(input);
  target.setItem(ACTIVE_KEY, JSON.stringify(record));
  return record;
}

export function markTripEvidenceStopped(endedAt, storage = null) {
  const target = resolveStorage(storage);
  const active = loadActiveTripEvidence(target);
  if (!active) throw new Error('Der er ingen aktiv ravtur at stoppe.');
  const startedTime = Date.parse(active.startedAt);
  const endedTime = Date.parse(String(endedAt || ''));
  if (!Number.isFinite(endedTime) || endedTime <= startedTime) throw new Error('Sluttid skal ligge efter starttid.');
  if (endedTime - startedTime > 24 * 60 * 60000) throw new Error('En søgetur kan højst vare 24 timer.');
  const stopped = { ...active, stoppedAt: new Date(endedTime).toISOString() };
  target.setItem(ACTIVE_KEY, JSON.stringify(stopped));
  return stopped;
}

export function finishTripEvidence(completion, storage = null) {
  const target = resolveStorage(storage);
  const active = loadActiveTripEvidence(target);
  if (!active) throw new Error('Der er ingen aktiv ravtur at afslutte.');
  const evidence = completeTripEvidence(active, {
    ...completion,
    endedAt: active.stoppedAt || completion?.endedAt
  });
  const pending = listPendingTripEvidence(target);
  const next = [...pending.filter(item => item?.tripId !== evidence.tripId), evidence];

  // Skriv først den komplette tur. Hvis browserens lager er fuldt, bevares
  // den aktive tur, så brugerens data ikke forsvinder ved en halv operation.
  target.setItem(PENDING_KEY, JSON.stringify(next));
  target.removeItem(ACTIVE_KEY);
  return evidence;
}

export function discardActiveTripEvidence(storage = null) {
  const target = resolveStorage(storage);
  const active = loadActiveTripEvidence(target);
  if (!active) throw new Error('Der er ingen aktiv ravtur at afslutte.');
  target.removeItem(ACTIVE_KEY);
  return { tripId: active.tripId };
}

export function markTripEvidenceSubmitted(tripId, storage = null) {
  const target = resolveStorage(storage);
  const normalized = String(tripId || '').trim();
  if (!normalized) throw new Error('Tur-id mangler.');
  const pending = listPendingTripEvidence(target);
  const next = pending.filter(item => item?.tripId !== normalized);
  if (next.length === pending.length) return false;
  target.setItem(PENDING_KEY, JSON.stringify(next));
  return true;
}

export const tripEvidenceStorageKeys = Object.freeze({ active: ACTIVE_KEY, pending: PENDING_KEY });
