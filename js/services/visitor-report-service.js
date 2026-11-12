import { PUBLIC_CONFIG } from "../../config.js?v=4.0.614";
import { authorizedFetch } from "./auth-service.js?v=4.0.614";

export async function loadVisitorReport(fromDay, toDay) {
  const { response, body: parsed, errorText } = await authorizedFetch(`${PUBLIC_CONFIG.supabaseUrl}/rest/v1/rpc/get_ravradar_visitor_report`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ p_from_day: fromDay, p_to_day: toDay })
  }, { consumeJson: true, consumeErrorText: true });
  if (!response.ok) {
    let errorCode;
    try { errorCode = JSON.parse(errorText)?.code; } catch {}
    if (errorCode === "22023") throw new Error("Vælg en gyldig periode på højst 366 dages forskel.");
    if (errorCode === "42501" || response.status === 401 || response.status === 403) {
      throw new Error("Kontoen har ikke adgang til besøgsstatistikken.");
    }
    throw new Error(`Besøgsrapporten kunne ikke hentes (${response.status}).`);
  }
  if (parsed?.fromDay !== fromDay || parsed?.toDay !== toDay
      || !validCounts(parsed, ["pageViews", "browserVisits", "registeredAccounts", "activeAccounts"])
      || !Array.isArray(parsed.days)
      || !parsed.days.every(row => typeof row?.day === "string" && /^\d{4}-\d{2}-\d{2}$/.test(row.day)
        && row.day >= fromDay && row.day <= toDay && validCounts(row, ["pageViews", "browserVisits"]))) {
    throw new Error("Besøgsrapporten indeholder ikke gyldige tal for den valgte periode.");
  }
  return parsed;
}

function validCounts(record, fields) {
  return fields.every(field => Number.isSafeInteger(record[field]) && record[field] >= 0);
}
