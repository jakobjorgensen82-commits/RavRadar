import { PUBLIC_CONFIG } from "../../config.js?v=4.0.96";

const STORAGE_KEY = "ravradar-auth-session";
const REFRESH_MARGIN_SECONDS = 300;
const DEFAULT_TIMEOUT_MS = 12000;
const enabled = Boolean(PUBLIC_CONFIG.supabaseUrl && PUBLIC_CONFIG.supabasePublishableKey);
let session = readStoredSession();
let listeners = new Set();
let refreshPromise = null;

function readStoredSession() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "null"); } catch { return null; }
}
function normalizeSession(next) {
  if (!next) return null;
  if (next.expires_in && !next.expires_at) next.expires_at = Math.floor(Date.now() / 1000) + Number(next.expires_in);
  return next;
}
function saveSession(next) {
  session = normalizeSession(next);
  if (session) localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
  else localStorage.removeItem(STORAGE_KEY);
  listeners.forEach(listener => listener(session));
}
function timeoutSignal(timeoutMs=DEFAULT_TIMEOUT_MS, externalSignal=null) {
  const controller=new AbortController();
  const timer=setTimeout(()=>controller.abort(new DOMException(`Supabase svarede ikke inden ${Math.round(timeoutMs/1000)} sekunder.`, 'TimeoutError')),timeoutMs);
  if(externalSignal){
    if(externalSignal.aborted)controller.abort(externalSignal.reason);
    else externalSignal.addEventListener('abort',()=>controller.abort(externalSignal.reason),{once:true});
  }
  return {signal:controller.signal,done:()=>clearTimeout(timer)};
}
function friendlyNetworkError(error){
  if(error?.name==='AbortError'||error?.name==='TimeoutError')return new Error('Supabase svarede ikke i tide. Kontrollér forbindelsen og prøv igen.');
  if(error instanceof TypeError)return new Error('Kunne ikke kontakte Supabase. Din eksisterende opsætning er bevaret; prøv igen eller kontrollér netværket.');
  return error;
}
async function authRequest(path, options = {}, { useAuthorization = true, timeoutMs=DEFAULT_TIMEOUT_MS } = {}) {
  if (!enabled) throw new Error("Login er ikke aktiveret i config.js endnu.");
  const guard=timeoutSignal(timeoutMs,options.signal);
  let response;
  try { response = await fetch(`${PUBLIC_CONFIG.supabaseUrl}/auth/v1${path}`, {
    ...options,
    headers: {
      apikey: PUBLIC_CONFIG.supabasePublishableKey,
      "Content-Type": "application/json",
      ...(useAuthorization && session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
      ...(options.headers || {})
    },
    signal:guard.signal
  }); } catch(error) { throw friendlyNetworkError(error); } finally { guard.done(); }
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw Object.assign(new Error(body.msg || body.error_description || body.message || `Loginfejl (${response.status})`), { status: response.status, body });
  return body;
}
function tokenNeedsRefresh() {
  if (!session?.access_token) return true;
  if (!session.expires_at) return false;
  return Number(session.expires_at) <= Math.floor(Date.now() / 1000) + REFRESH_MARGIN_SECONDS;
}
export async function refreshSession({ force = false } = {}) {
  if (!enabled) throw new Error("Supabase er ikke konfigureret.");
  if (!session?.refresh_token) {
    if (session?.access_token && !force) return session;
    throw new Error("Din Supabase-session kan ikke fornyes. Log ind igen.");
  }
  if (!force && !tokenNeedsRefresh()) return session;
  if (refreshPromise) return refreshPromise;
  refreshPromise = authRequest("/token?grant_type=refresh_token", {
    method: "POST",
    body: JSON.stringify({ refresh_token: session.refresh_token })
  }, { useAuthorization: false }).then(next => {
    if (!next.refresh_token) next.refresh_token = session?.refresh_token;
    saveSession(next);
    return session;
  }).catch(error => {
    if (error.status === 400 || error.status === 401) saveSession(null);
    throw error;
  }).finally(() => { refreshPromise = null; });
  return refreshPromise;
}
export async function requireFreshSession() {
  if (!session?.access_token) throw new Error("Du er ikke logget ind på Supabase.");
  if (tokenNeedsRefresh()) await refreshSession();
  return session;
}
export async function authorizedFetch(url, options = {}, { retry401 = true, timeoutMs=DEFAULT_TIMEOUT_MS } = {}) {
  const active = await requireFreshSession();
  const guard=timeoutSignal(timeoutMs,options.signal);
  let response;
  try { response = await fetch(url, {
    ...options,
    headers: {
      apikey: PUBLIC_CONFIG.supabasePublishableKey,
      Authorization: `Bearer ${active.access_token}`,
      ...(options.headers || {})
    },
    signal:guard.signal
  }); } catch(error) { throw friendlyNetworkError(error); } finally { guard.done(); }
  if (response.status === 401 && retry401 && session?.refresh_token) {
    await refreshSession({ force: true });
    return authorizedFetch(url, options, { retry401: false, timeoutMs });
  }
  return response;
}

export function authEnabled() { return enabled; }
export function currentSession() { return session; }
export function onAuthChange(listener) { listeners.add(listener); return () => listeners.delete(listener); }
export async function sendMagicLink(email) { await authRequest("/otp", { method: "POST", body: JSON.stringify({ email, create_user: true }) }, { useAuthorization: false }); }
export async function signInWithPassword(email, password) {
  const next = await authRequest("/token?grant_type=password", { method: "POST", body: JSON.stringify({ email, password }) }, { useAuthorization: false });
  saveSession(next); return session;
}
export async function signUpWithPassword(email, password) {
  const next = await authRequest("/signup", { method: "POST", body: JSON.stringify({ email, password }) }, { useAuthorization: false });
  if (next.access_token) saveSession(next); return next;
}
export async function signOut() {
  if (enabled && session?.access_token) await authRequest("/logout", { method: "POST" }).catch(() => {});
  saveSession(null);
}
export async function consumeAuthCallback() {
  const values = new URLSearchParams(location.hash.replace(/^#/, ""));
  const accessToken = values.get("access_token");
  if (!accessToken) return session;
  saveSession({ access_token: accessToken, refresh_token: values.get("refresh_token"), expires_in: Number(values.get("expires_in") || 0), token_type: values.get("token_type") || "bearer", user: { email: values.get("email") || null } });
  history.replaceState(null, "", location.pathname + location.search); return session;
}
export async function getCurrentProfile() {
  const s = await requireFreshSession();
  const userId = s.user?.id;
  if (!userId) throw new Error("Supabase-sessionen mangler bruger-id. Log ind igen.");
  const response = await authorizedFetch(`${PUBLIC_CONFIG.supabaseUrl}/rest/v1/profiles?select=id,email,display_name,role,is_active&id=eq.${encodeURIComponent(userId)}&limit=1`);
  if (!response.ok) throw new Error(`Kunne ikke kontrollere brugerprofilen (${response.status})`);
  return (await response.json())[0] || null;
}
export async function getCurrentRole(){ return (await getCurrentProfile())?.role || null; }
export function expertLoginConfig(){ return { username: PUBLIC_CONFIG.expertLoginUsername || 'ekspert', email: PUBLIC_CONFIG.expertAuthEmail || 'ekspert@ravradar.dk' }; }
export async function signInAsExpert(username,password){
  const cfg=expertLoginConfig();
  if(String(username||'').trim().toLowerCase()!==cfg.username.toLowerCase()) throw new Error('Forkert brugernavn eller kode.');
  await signInWithPassword(cfg.email,password);
  const profile=await getCurrentProfile();
  if(profile?.role!=='expert' || !profile?.is_active){ await signOut(); throw new Error('Denne konto har ikke aktiv ekspertadgang.'); }
  return currentSession();
}
export async function testConnection(){
  if(!enabled) return {ok:false,status:0,authenticated:false,message:'Supabase er ikke konfigureret'};
  try {
    const s = await requireFreshSession();
    const response=await authorizedFetch(`${PUBLIC_CONFIG.supabaseUrl}/rest/v1/profiles?select=id&limit=1`);
    return {ok:response.ok,status:response.status,authenticated:Boolean(s?.access_token),refreshed:true};
  } catch (error) {
    return {ok:false,status:error.status||0,authenticated:false,message:error.message};
  }
}
