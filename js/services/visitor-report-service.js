import { PUBLIC_CONFIG } from "../../config.js?v=4.0.272";
import { authorizedFetch } from "./auth-service.js?v=4.0.272";

export async function loadVisitorReport(fromDay, toDay) {
  const response = await authorizedFetch(`${PUBLIC_CONFIG.supabaseUrl}/rest/v1/rpc/get_ravradar_visitor_report`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ p_from_day: fromDay, p_to_day: toDay })
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.message || `Besøgsrapporten kunne ikke hentes (${response.status}).`);
  return body;
}
