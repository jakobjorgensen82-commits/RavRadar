import { PUBLIC_CONFIG } from "../../config.js?v=4.0.573";
import { authorizedFetch } from "./auth-service.js?v=4.0.573";

export async function loadVisitorReport(fromDay, toDay) {
  const { response, body: parsed, errorText } = await authorizedFetch(`${PUBLIC_CONFIG.supabaseUrl}/rest/v1/rpc/get_ravradar_visitor_report`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ p_from_day: fromDay, p_to_day: toDay })
  }, { consumeJson: true, consumeErrorText: true });
  let body = parsed === undefined ? {} : parsed;
  if (!response.ok) {
    try { body = JSON.parse(errorText); } catch { body = {}; }
    throw new Error(body?.message || `Besøgsrapporten kunne ikke hentes (${response.status}).`);
  }
  return body;
}
