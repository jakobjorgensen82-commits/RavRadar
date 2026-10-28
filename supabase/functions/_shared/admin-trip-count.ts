import { fetchWithTimeout, GatewayError } from "./public-gateway.ts";
import { tripStorageMode } from "./trip-store.ts";
import { normalizeCloudflareGatewayUrl, tripGatewaySignature } from "./trip-storage.js";

const SCOPE = "active-d1-all-stored-rows-including-test-legacy-anonymous";
const unavailable = () => new GatewayError(503, "ADMIN_TRIP_COUNT_UNAVAILABLE");
function configured(name: string) {
  const value = Deno.env.get(name)?.trim();
  if (!value) throw unavailable();
  return value;
}
export async function boundedJson(response: Response, maximumBytes = 8_192) {
  if (maximumBytes !== 8_192 && maximumBytes !== 65_536) throw unavailable();
  if (!response.ok || !response.body) throw unavailable();
  const reader = response.body.getReader(), chunks: Uint8Array[] = [];
  let size = 0, timer: ReturnType<typeof setTimeout>;
  const timeout = new Promise<never>((_resolve, reject) => {
    timer = setTimeout(() => { void reader.cancel().catch(() => {}); reject(unavailable()); }, 5_000);
  });
  try {
    while (true) {
      const { value, done } = await Promise.race([reader.read(), timeout]);
      if (done) break;
      size += value.byteLength;
      if (size > maximumBytes) throw unavailable();
      chunks.push(value);
    }
    const bytes = new Uint8Array(size); let offset = 0;
    for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
    return JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes));
  } catch { throw unavailable(); }
  finally { clearTimeout(timer!); void reader.cancel().catch(() => {}); reader.releaseLock(); }
}

export async function requireAdminTripAccess(request: Request, userId: string) {
  if (!/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(userId)) throw unavailable();
  const authorization = request.headers.get("authorization");
  if (!authorization) throw new GatewayError(403, "ADMIN_TRIP_COUNT_FORBIDDEN");
  const url = configured("SUPABASE_URL") + "/rest/v1/profiles?select=id,role,is_active,user_permissions(permission_key,enabled)"
    + "&id=eq." + encodeURIComponent(userId) + "&limit=2";
  const profiles = await boundedJson(await fetchWithTimeout(url, {
    headers: { apikey: configured("SUPABASE_ANON_KEY"), authorization }, cache: "no-store",
  }, 5_000));
  if (!Array.isArray(profiles) || profiles.length !== 1) throw new GatewayError(403, "ADMIN_TRIP_COUNT_FORBIDDEN");
  const profile = profiles[0];
  if (profile?.id !== userId || profile.is_active !== true || !Array.isArray(profile.user_permissions)
    || !(profile.role === "owner" || profile.user_permissions.some((permission: Record<string, unknown>) =>
      permission?.permission_key === "full_admin" && permission.enabled === true))) {
    throw new GatewayError(403, "ADMIN_TRIP_COUNT_FORBIDDEN");
  }
}

export async function readAdminTripCount(request: Request, userId: string) {
  await requireAdminTripAccess(request, userId);
  if (tripStorageMode() !== "d1") throw unavailable();
  const startedAt = new Date().toISOString(), pathname = "/v1/trips/count";
  const bodyText = JSON.stringify({ operation: "admin-summary" }), timestamp = String(Date.now());
  const secret = configured("TRIP_GATEWAY_SHARED_SECRET");
  if (secret.length < 32) throw unavailable();
  const signature = await tripGatewaySignature({ secret, timestamp, method: "POST", pathname, bodyText });
  const origin = normalizeCloudflareGatewayUrl(configured("CLOUDFLARE_TRIP_GATEWAY_URL"));
  const result = await boundedJson(await fetchWithTimeout(origin + pathname, {
    method: "POST", headers: { "Content-Type": "application/json", "X-RavRadar-Signature": signature,
      "X-RavRadar-Timestamp": timestamp }, body: bodyText, redirect: "error", cache: "no-store",
  }, 8_000));
  if (!result || Object.keys(result).sort().join(",") !== "ok,scope,synthetic_test_count,trip_count"
    || result.ok !== true || result.scope !== SCOPE
    || !Number.isSafeInteger(result.trip_count) || result.trip_count < 0
    || !Number.isSafeInteger(result.synthetic_test_count) || result.synthetic_test_count < 0
    || result.synthetic_test_count > result.trip_count) throw unavailable();
  if (tripStorageMode() !== "d1") throw unavailable();
  await requireAdminTripAccess(request, userId);
  return { storedCount: result.trip_count, markedTestCount: result.synthetic_test_count,
    scope: SCOPE, startedAt, completedAt: new Date().toISOString() };
}
