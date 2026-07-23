import { PUBLIC_CONFIG } from "../../config.js";
import { currentSession } from "./auth-service.js";

const enabled = Boolean(PUBLIC_CONFIG.supabaseUrl && PUBLIC_CONFIG.supabasePublishableKey);
const LOCAL_KEY = "ravradar-observations-v2";
function anonymousId() {
  const key = "ravradar-anonymous-id"; let value = localStorage.getItem(key);
  if (!value) { value = crypto.randomUUID(); localStorage.setItem(key, value); }
  return value;
}
function localObservations() { try { return JSON.parse(localStorage.getItem(LOCAL_KEY) || "[]"); } catch { return []; } }
function storeLocal(observation) { const rows = localObservations(); rows.push(observation); localStorage.setItem(LOCAL_KEY, JSON.stringify(rows)); }
export function observationsEnabled() { return enabled; }
export function getLocalObservations() { return localObservations(); }
export async function submitObservation({ zone, huntMode, result, grams = null, scoreResult, weather, gps = null, tripId = null }) {
  const session = currentSession();
  const row = {
    id: crypto.randomUUID(), zone_id: zone.id, zone_name: zone.name, observed_at: new Date().toISOString(), hunt_mode: huntMode,
    result, grams: grams === "" || grams == null ? null : Number(grams), anonymous_id: anonymousId(), user_id: session?.user?.id || null,
    trip_id: tripId, gps, rav_score: scoreResult?.score ?? null, score_level: scoreResult?.level ?? null,
    weather_snapshot: weather || {}, wind_speed_mps: weather?.windSpeedMps ?? null, wind_direction_deg: weather?.windDirectionDeg ?? null,
    wave_height_m: weather?.waveHeightM ?? null, wave_period_s: weather?.wavePeriodS ?? null, water_level_cm: weather?.waterLevelCm ?? null,
    current_speed_mps: weather?.currentSpeedMps ?? null, current_direction_deg: weather?.currentDirectionDeg ?? null,
    water_temperature_c: weather?.waterTemperatureC ?? null
  };
  storeLocal(row);
  if (!enabled) return { stored: "local", row };
  const response = await fetch(`${PUBLIC_CONFIG.supabaseUrl}/rest/v1/observations`, {
    method: "POST",
    headers: { apikey: PUBLIC_CONFIG.supabasePublishableKey, Authorization: `Bearer ${session?.access_token || PUBLIC_CONFIG.supabasePublishableKey}`, "Content-Type": "application/json", Prefer: "return=minimal" },
    body: JSON.stringify(row)
  });
  if (!response.ok) throw new Error(`Observationen blev gemt lokalt, men kunne ikke synkroniseres (${response.status}).`);
  return { stored: "supabase", row };
}
