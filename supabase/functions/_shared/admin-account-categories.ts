import { fetchWithTimeout, GatewayError } from "./public-gateway.ts";
import { boundedJson, requireAdminTripAccess } from "./admin-trip-count.ts";

// Closed server-side designation from the owner's explicit decision. Never
// imported by a browser, used for authorization, or written into profile roles.
const DESIGNATED_EXPERT = "expert@ravradar.dk";
const UUID = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/;
export function validateAdminCategoryIds(ids: unknown): string[] {
  if (!Array.isArray(ids) || ids.length < 1 || ids.length > 64
    || ids.some(id => typeof id !== "string" || !UUID.test(id)) || new Set(ids).size !== ids.length) {
    throw new GatewayError(400, "ADMIN_ACCOUNT_CATEGORY_IDS_INVALID");
  }
  return ids;
}
export async function readAdminAccountCategories(request: Request, userId: string, suppliedIds: unknown) {
  const ids = validateAdminCategoryIds(suppliedIds);
  await requireAdminTripAccess(request, userId);
  const base = Deno.env.get("SUPABASE_URL"), key = Deno.env.get("SUPABASE_ANON_KEY");
  if (!base || !key) throw new GatewayError(503, "ADMIN_ACCOUNT_CATEGORIES_UNAVAILABLE");
  const profiles = await boundedJson(await fetchWithTimeout(base + "/rest/v1/profiles"
    + "?select=id,email,role,is_active,user_permissions(permission_key,enabled)&id=in.(" + ids.join(",") + ")", {
    headers: { apikey: key, authorization: request.headers.get("authorization")! }, cache: "no-store",
  }, 5_000), 65_536);
  if (!Array.isArray(profiles) || profiles.length > ids.length) throw new GatewayError(503, "ADMIN_ACCOUNT_CATEGORIES_UNAVAILABLE");
  const byId = new Map();
  for (const profile of profiles) {
    if (!profile || !ids.includes(profile.id) || byId.has(profile.id)) throw new GatewayError(503, "ADMIN_ACCOUNT_CATEGORIES_UNAVAILABLE");
    byId.set(profile.id, profile);
  }
  const rows = ids.map(id => {
    const profile = byId.get(id), issues: string[] = [];
    if (!profile || !["owner", "expert"].includes(profile.role) || typeof profile.email !== "string"
      || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(profile.email.trim()) || typeof profile.is_active !== "boolean" || !Array.isArray(profile.user_permissions)
      || profile.user_permissions.some((p: Record<string, unknown>) => !p || typeof p.permission_key !== "string" || typeof p.enabled !== "boolean")) {
      return { id, category: "unknown", issues: ["profile-unavailable"] };
    }
    const designated = profile.email.trim().toLowerCase() === DESIGNATED_EXPERT;
    const category = profile.role === "owner" ? "owner" : designated ? "expert" : "ordinary";
    if (profile.role === "owner" && designated) issues.push("owner-expert-conflict");
    if (category === "ordinary" && profile.user_permissions.some((p: Record<string, unknown>) => p.enabled === true)) issues.push("ordinary-has-permissions");
    return { id, category, issues };
  });
  if (rows.filter(row => row.category === "owner").length > 1) {
    for (const row of rows) if (row.category === "owner") row.issues.push("multiple-owners-in-batch");
  }
  // This is only a bounded RLS-visible batch; it cannot establish a global
  // single owner, complete account inventory, or absence of other conflicts.
  await requireAdminTripAccess(request, userId);
  return { scope: "requested-rls-visible-profiles-only", rows, checkedAt: new Date().toISOString() };
}
