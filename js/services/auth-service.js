import { PUBLIC_CONFIG } from "../../config.js";

const STORAGE_KEY = "ravradar-auth-session";
const enabled = Boolean(PUBLIC_CONFIG.supabaseUrl && PUBLIC_CONFIG.supabasePublishableKey);
let session = readStoredSession();
let listeners = new Set();

function readStoredSession() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "null"); } catch { return null; }
}
function saveSession(next) {
  session = next;
  if (next) localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  else localStorage.removeItem(STORAGE_KEY);
  listeners.forEach(listener => listener(session));
}
async function request(path, options = {}) {
  if (!enabled) throw new Error("Login er ikke aktiveret i config.js endnu.");
  const response = await fetch(`${PUBLIC_CONFIG.supabaseUrl}/auth/v1${path}`, {
    ...options,
    headers: {
      apikey: PUBLIC_CONFIG.supabasePublishableKey,
      "Content-Type": "application/json",
      ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
      ...(options.headers || {})
    }
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.msg || body.error_description || body.message || `Loginfejl (${response.status})`);
  return body;
}

export function authEnabled() { return enabled; }
export function currentSession() { return session; }
export function onAuthChange(listener) { listeners.add(listener); return () => listeners.delete(listener); }
export async function sendMagicLink(email) {
  await request("/otp", { method: "POST", body: JSON.stringify({ email, create_user: true }) });
}
export async function signInWithPassword(email, password) {
  const next = await request("/token?grant_type=password", { method: "POST", body: JSON.stringify({ email, password }) });
  saveSession(next);
  return next;
}
export async function signUpWithPassword(email, password) {
  const next = await request("/signup", { method: "POST", body: JSON.stringify({ email, password }) });
  if (next.access_token) saveSession(next);
  return next;
}
export async function signOut() {
  if (enabled && session?.access_token) await request("/logout", { method: "POST" }).catch(() => {});
  saveSession(null);
}
export async function consumeAuthCallback() {
  const values = new URLSearchParams(location.hash.replace(/^#/, ""));
  const accessToken = values.get("access_token");
  if (!accessToken) return session;
  const next = {
    access_token: accessToken,
    refresh_token: values.get("refresh_token"),
    expires_in: Number(values.get("expires_in") || 0),
    token_type: values.get("token_type") || "bearer",
    user: { email: values.get("email") || null }
  };
  saveSession(next);
  history.replaceState(null, "", location.pathname + location.search);
  return next;
}
