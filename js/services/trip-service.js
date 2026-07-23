const TRIPS_KEY = "ravradar-trips-v1";
const ACTIVE_KEY = "ravradar-active-trip-v1";
let watchId = null;
let active = read(ACTIVE_KEY, null);
let listeners = new Set();

function read(key, fallback) { try { return JSON.parse(localStorage.getItem(key) || "null") ?? fallback; } catch { return fallback; } }
function write(key, value) { localStorage.setItem(key, JSON.stringify(value)); }
function emit() { listeners.forEach(listener => listener(active)); }
function distanceMeters(a, b) {
  const r = 6371000, p1 = a.lat * Math.PI / 180, p2 = b.lat * Math.PI / 180;
  const dp = (b.lat - a.lat) * Math.PI / 180, dl = (b.lng - a.lng) * Math.PI / 180;
  const h = Math.sin(dp/2)**2 + Math.cos(p1)*Math.cos(p2)*Math.sin(dl/2)**2;
  return 2*r*Math.atan2(Math.sqrt(h), Math.sqrt(1-h));
}
function append(position) {
  if (!active) return;
  const point = { lat: position.coords.latitude, lng: position.coords.longitude, accuracy: position.coords.accuracy, at: new Date(position.timestamp).toISOString() };
  const previous = active.points.at(-1);
  if (previous && distanceMeters(previous, point) < 8 && Date.now() - new Date(previous.at).getTime() < 30000) return;
  active.points.push(point);
  active.updatedAt = new Date().toISOString();
  write(ACTIVE_KEY, active); emit();
}
function watch() {
  if (!active || watchId !== null || !navigator.geolocation) return;
  watchId = navigator.geolocation.watchPosition(append, () => {}, { enableHighAccuracy: true, maximumAge: 10000, timeout: 20000 });
}
export function onTripChange(listener) { listeners.add(listener); return () => listeners.delete(listener); }
export function activeTrip() { return active; }
export function listTrips() { return read(TRIPS_KEY, []); }
export function startTrip() {
  if (active) { watch(); return active; }
  active = { id: crypto.randomUUID(), startedAt: new Date().toISOString(), updatedAt: new Date().toISOString(), points: [] };
  write(ACTIVE_KEY, active); watch(); emit(); return active;
}
export function resumeTripTracking() { watch(); }
export function stopTrip() {
  if (!active) return null;
  if (watchId !== null) navigator.geolocation.clearWatch(watchId);
  watchId = null;
  const finished = { ...active, endedAt: new Date().toISOString(), response: null };
  const trips = listTrips(); trips.push(finished); write(TRIPS_KEY, trips);
  localStorage.removeItem(ACTIVE_KEY); active = null; emit(); return finished;
}
export function pendingTripPrompt() {
  const today = new Date(); today.setHours(0,0,0,0);
  return listTrips().find(trip => !trip.response && new Date(trip.endedAt || trip.startedAt) < today) || null;
}
export function answerTrip(id, response, grams = null) {
  const trips = listTrips(); const trip = trips.find(item => item.id === id);
  if (!trip) throw new Error("Turen blev ikke fundet.");
  trip.response = response; trip.grams = Number.isFinite(Number(grams)) && grams !== "" ? Number(grams) : null; trip.answeredAt = new Date().toISOString();
  write(TRIPS_KEY, trips); return trip;
}
export function clearTrips() { localStorage.removeItem(TRIPS_KEY); }
