import { PUBLIC_CONFIG } from "../../config.js?v=4.0.303";

const SESSION_KEY = "ravradar-visit-day-v1";

export function localDay(now = new Date()) {
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function firstVisitToday(storage = sessionStorage, now = new Date()) {
  const today = localDay(now);
  try {
    if (storage.getItem(SESSION_KEY) === today) return false;
    storage.setItem(SESSION_KEY, today);
    return true;
  } catch {
    return false;
  }
}

export async function recordPublicPageView({ fetchImpl = fetch, storage = sessionStorage, now = new Date() } = {}) {
  if (!PUBLIC_CONFIG.supabaseUrl || !PUBLIC_CONFIG.supabasePublishableKey) return false;
  const response = await fetchImpl(`${PUBLIC_CONFIG.supabaseUrl}/rest/v1/rpc/record_ravradar_page_view`, {
    method: "POST",
    keepalive: true,
    headers: {
      apikey: PUBLIC_CONFIG.supabasePublishableKey,
      Authorization: `Bearer ${PUBLIC_CONFIG.supabasePublishableKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ p_new_visit: firstVisitToday(storage, now) })
  });
  return response.ok;
}

export function schedulePublicPageView(options = {}) {
  const run = () => recordPublicPageView(options).catch(() => false);
  if (typeof requestIdleCallback === "function") requestIdleCallback(run, { timeout: 4000 });
  else setTimeout(run, 0);
}
