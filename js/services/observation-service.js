import { PUBLIC_CONFIG } from "../../config.js";

const enabled = Boolean(PUBLIC_CONFIG.supabaseUrl && PUBLIC_CONFIG.supabasePublishableKey);

function anonymousId() {
  const key = "ravradar-anonymous-id";
  let value = localStorage.getItem(key);
  if (!value) {
    value = crypto.randomUUID();
    localStorage.setItem(key, value);
  }
  return value;
}

export function observationsEnabled() { return enabled; }

export async function submitObservation({ zoneId, huntMode, result }) {
  if (!enabled) throw new Error("Observationer er ikke aktiveret endnu");
  const response = await fetch(`${PUBLIC_CONFIG.supabaseUrl}/rest/v1/observations`, {
    method: "POST",
    headers: {
      apikey: PUBLIC_CONFIG.supabasePublishableKey,
      Authorization: `Bearer ${PUBLIC_CONFIG.supabasePublishableKey}`,
      "Content-Type": "application/json",
      Prefer: "return=minimal"
    },
    body: JSON.stringify({
      zone_id: zoneId,
      hunt_mode: huntMode,
      result,
      anonymous_id: anonymousId(),
      observed_at: new Date().toISOString()
    })
  });
  if (!response.ok) throw new Error(`Observationen kunne ikke gemmes (${response.status})`);
}
