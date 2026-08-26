const DEFAULT_ORIGINS = [
  "https://jakobjorgensen82-commits.github.io",
  "https://ravradar.dk",
  "https://www.ravradar.dk",
];

export class GatewayError extends Error {
  status: number;
  code: string;
  constructor(status: number, code: string) {
    super(code);
    this.status = status;
    this.code = code;
  }
}

function configuredOrigins() {
  const extra = (Deno.env.get("RAVRADAR_ALLOWED_ORIGINS") || "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
  return new Set([...DEFAULT_ORIGINS, ...extra]);
}

function isAllowedOrigin(origin: string) {
  if (configuredOrigins().has(origin)) return true;
  try {
    const url = new URL(origin);
    return (url.hostname === "127.0.0.1" || url.hostname === "localhost") &&
      (url.protocol === "http:" || url.protocol === "https:");
  } catch {
    return false;
  }
}

export function corsHeaders(request: Request) {
  const origin = request.headers.get("origin");
  const headers: Record<string, string> = {
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Vary": "Origin",
  };
  if (origin && isAllowedOrigin(origin)) headers["Access-Control-Allow-Origin"] = origin;
  return headers;
}

export function assertAllowedOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (origin && !isAllowedOrigin(origin)) throw new GatewayError(403, "ORIGIN_NOT_ALLOWED");
}

export function jsonResponse(request: Request, body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", ...corsHeaders(request) },
  });
}

export async function fetchWithTimeout(input: RequestInfo | URL, init: RequestInit = {}, timeoutMs = 8_000) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } catch (error) {
    if (controller.signal.aborted) throw new GatewayError(504, "UPSTREAM_TIMEOUT");
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

export async function readJsonObject(request: Request, maxBytes: number) {
  if (request.method !== "POST") throw new GatewayError(405, "METHOD_NOT_ALLOWED");
  assertAllowedOrigin(request);
  const declared = Number(request.headers.get("content-length") || 0);
  if (declared > maxBytes) throw new GatewayError(413, "PAYLOAD_TOO_LARGE");
  const text = await request.text();
  if (new TextEncoder().encode(text).byteLength > maxBytes) throw new GatewayError(413, "PAYLOAD_TOO_LARGE");
  let value: unknown;
  try {
    value = JSON.parse(text);
  } catch {
    throw new GatewayError(400, "INVALID_JSON");
  }
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new GatewayError(400, "JSON_OBJECT_REQUIRED");
  return value as Record<string, unknown>;
}

export async function resolveAuthenticatedUserId(request: Request) {
  const authorization = request.headers.get("authorization");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const url = Deno.env.get("SUPABASE_URL");
  if (!authorization || !anonKey || !url) return null;
  const response = await fetchWithTimeout(`${url}/auth/v1/user`, {
    headers: { apikey: anonKey, authorization },
  }, 5_000);
  if (!response.ok) return null;
  const user = await response.json();
  return typeof user?.id === "string" ? user.id : null;
}

export async function requireAuthenticatedUserId(request: Request) {
  const userId = await resolveAuthenticatedUserId(request);
  if (!userId) throw new GatewayError(401, "LOGIN_REQUIRED");
  return userId;
}

async function hmac(value: string) {
  const secret = Deno.env.get("PUBLIC_RATE_LIMIT_SECRET") || Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!secret) throw new GatewayError(503, "RATE_LIMIT_NOT_CONFIGURED");
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const digest = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function consume(scope: string, subjectHash: string, limit: number, windowSeconds: number) {
  const url = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !serviceKey) throw new GatewayError(503, "RATE_LIMIT_NOT_CONFIGURED");
  const response = await fetchWithTimeout(`${url}/rest/v1/rpc/consume_public_request_limit`, {
    method: "POST",
    headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ p_scope: scope, p_subject_hash: subjectHash, p_limit: limit, p_window_seconds: windowSeconds }),
  }, 5_000);
  if (!response.ok) throw new GatewayError(503, "RATE_LIMIT_UNAVAILABLE");
  return (await response.json()) === true;
}

export async function enforceRateLimits(request: Request, route: string, limits: { minute: number; hour: number; globalDay: number }) {
  const forwarded = request.headers.get("x-real-ip") || request.headers.get("cf-connecting-ip") || request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const agent = request.headers.get("user-agent") || "unknown";
  const subject = await hmac(`${route}|${forwarded}|${agent}`);
  const checks = await Promise.all([
    consume(`${route}:minute`, subject, limits.minute, 60),
    consume(`${route}:hour`, subject, limits.hour, 3600),
    consume(`${route}:global-day`, "global", limits.globalDay, 86400),
  ]);
  if (checks.some((allowed) => !allowed)) throw new GatewayError(429, "RATE_LIMITED");
}

export function safeGatewayError(request: Request, error: unknown) {
  if (error instanceof GatewayError) return jsonResponse(request, { error: error.code }, error.status);
  return jsonResponse(request, { error: "REQUEST_FAILED" }, 500);
}
