import { PUBLIC_CONFIG } from "../../config.js?v=4.0.555";

const STORAGE_KEY = "ravradar-auth-session";
const REFRESH_MARGIN_SECONDS = 300;
const DEFAULT_TIMEOUT_MS = 12000;
const enabled = Boolean(PUBLIC_CONFIG.supabaseUrl && PUBLIC_CONFIG.supabasePublishableKey);
let session = readStoredSession();
let listeners = new Set();
let refreshState = null;
let hydrationState = null;
// Explicit login/callback identity transitions are distinct from renewal of
// the same login. A late logout must not clear a subsequently chosen session.
let identityEpoch = 0;

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
  const timer=setTimeout(()=>controller.abort(new DOMException(`Loginforbindelsen svarede ikke inden ${Math.round(timeoutMs/1000)} sekunder.`, 'TimeoutError')),timeoutMs);
  if(externalSignal){
    if(externalSignal.aborted)controller.abort(externalSignal.reason);
    else externalSignal.addEventListener('abort',()=>controller.abort(externalSignal.reason),{once:true});
  }
  return {signal:controller.signal,done:()=>clearTimeout(timer)};
}
function friendlyNetworkError(error){
  if(error?.name==='AbortError'||error?.name==='TimeoutError')return new Error('Loginforbindelsen svarede ikke i tide. Kontrollér forbindelsen og prøv igen.');
  if(error instanceof TypeError)return new Error('RavRadar kunne ikke kontakte loginforbindelsen. Prøv igen, eller kontrollér netværket.');
  return error;
}
function friendlyAuthResponse(body,status){
  const raw=String(body?.msg||body?.error_description||body?.message||'').toLowerCase();
  const problem=message=>Object.assign(new Error(message),{status,body});
  if(/invalid login|invalid credentials/.test(raw))return problem('E-mail eller adgangskode er forkert.');
  if(/email not confirmed/.test(raw))return problem('Åbn først bekræftelsesmailen, og prøv derefter igen.');
  if(/already registered|already exists/.test(raw))return problem('Der findes allerede en konto med denne e-mail. Prøv at logge ind.');
  if(/rate limit|too many/.test(raw))return problem('Der er sendt for mange forsøg på kort tid. Vent lidt, og prøv igen.');
  return problem('Login kunne ikke gennemføres. Prøv igen.');
}
async function authRequest(path, options = {}, { useAuthorization = true, timeoutMs=DEFAULT_TIMEOUT_MS } = {}) {
  if (!enabled) throw new Error("Login er ikke tilgængeligt lige nu.");
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
  if (!response.ok) throw friendlyAuthResponse(body,response.status);
  return body;
}
function tokenNeedsRefresh() {
  if (!session?.access_token) return true;
  if (!session.expires_at) return false;
  return Number(session.expires_at) <= Math.floor(Date.now() / 1000) + REFRESH_MARGIN_SECONDS;
}
async function hydrateSessionUser() {
  const active = session;
  if (!active?.access_token || active?.user?.id) return active;
  if (hydrationState?.session === active) return hydrationState.promise;
  const pending = authRequest("/user").then(user => {
    if (session !== active) throw new Error("Kontoen blev ændret. Prøv igen fra den rigtige konto.");
    saveSession({ ...active, user });
    return session;
  }).finally(() => {
    if (hydrationState?.promise === pending) hydrationState = null;
  });
  hydrationState = { session: active, promise: pending };
  return pending;
}
export async function refreshSession({ force = false } = {}) {
  if (!enabled) throw new Error("Loginforbindelsen er ikke klar lige nu.");
  const active = session;
  if (!active?.refresh_token) {
    if (active?.access_token && !force) return active;
    throw new Error("Din login-session kunne ikke fornyes. Log ind igen.");
  }
  if (!force && !tokenNeedsRefresh()) return active;
  if (refreshState?.session === active) return refreshState.promise;
  const pending = authRequest("/token?grant_type=refresh_token", {
    method: "POST",
    body: JSON.stringify({ refresh_token: active.refresh_token })
  }, { useAuthorization: false }).then(next => {
    if (session !== active) throw new Error("Kontoen blev ændret. Prøv igen fra den rigtige konto.");
    if (!next.refresh_token) next.refresh_token = active.refresh_token;
    saveSession(next);
    return session;
  }).catch(error => {
    if (session === active && (error.status === 400 || error.status === 401)) saveSession(null);
    throw error;
  }).finally(() => {
    if (refreshState?.promise === pending) refreshState = null;
  });
  refreshState = { session: active, promise: pending };
  return pending;
}
export async function requireFreshSession() {
  const startingEpoch = identityEpoch;
  const ownerId = session?.user?.id;
  const assertIdentity = () => {
    if (identityEpoch !== startingEpoch || !session?.access_token
      || (ownerId && session?.user?.id && session.user.id !== ownerId)) {
      throw new Error("Kontoen blev ændret. Prøv igen fra den rigtige konto.");
    }
  };
  if (!session?.access_token) throw new Error("Du er ikke logget ind.");
  if (tokenNeedsRefresh()) await refreshSession();
  assertIdentity();
  if (!session?.user?.id) await hydrateSessionUser();
  assertIdentity();
  return session;
}
export async function authorizedFetch(url, options = {}, { retry401 = true, timeoutMs=DEFAULT_TIMEOUT_MS } = {}) {
  const startingEpoch = identityEpoch;
  const active = await requireFreshSession();
  const ownerId = active?.user?.id;
  const assertOwner = candidate => {
    if (identityEpoch !== startingEpoch || !ownerId || candidate?.user?.id !== ownerId || session?.user?.id !== ownerId) {
      throw new Error("Kontoen blev ændret. Prøv igen fra den rigtige konto.");
    }
  };
  async function requestOnce(current, mayRetry) {
    assertOwner(current);
    const guard=timeoutSignal(timeoutMs,options.signal);
    let response;
    try { response = await fetch(url, {
      ...options,
      headers: {
        apikey: PUBLIC_CONFIG.supabasePublishableKey,
        Authorization: `Bearer ${current.access_token}`,
        ...(options.headers || {})
      },
      signal:guard.signal
    }); } catch(error) { throw friendlyNetworkError(error); } finally { guard.done(); }
    assertOwner(current);
    if (response.status === 401 && mayRetry && session?.refresh_token) {
      await refreshSession({ force: true });
      const renewed = await requireFreshSession();
      assertOwner(renewed);
      return requestOnce(renewed, false);
    }
    return response;
  }
  return requestOnce(active, retry401);
}

export function authEnabled() { return enabled; }
export function currentSession() { return session; }
// Same-login renewal leaves this unchanged; explicit auth choices do not.
// This is only in-process caller protection, not a cross-tab owner receipt.
export function authIdentityEpoch() { return identityEpoch; }
export function onAuthChange(listener) { listeners.add(listener); return () => listeners.delete(listener); }
export async function sendMagicLink(email) {
  const redirectTo = typeof location === 'undefined' ? null : `${location.origin}${location.pathname}`;
  const path = redirectTo ? `/otp?redirect_to=${encodeURIComponent(redirectTo)}` : '/otp';
  await authRequest(path, { method: "POST", body: JSON.stringify({ email, create_user: true }) }, { useAuthorization: false });
}
export async function signInWithPassword(email, password) {
  const startingEpoch = ++identityEpoch;
  const next = await authRequest("/token?grant_type=password", { method: "POST", body: JSON.stringify({ email, password }) }, { useAuthorization: false });
  if (identityEpoch !== startingEpoch) throw new Error("Kontoen blev ændret. Prøv igen fra den rigtige konto.");
  saveSession(next); return session;
}
export async function signUpWithPassword(email, password) {
  const startingEpoch = ++identityEpoch;
  const next = await authRequest("/signup", { method: "POST", body: JSON.stringify({ email, password }) }, { useAuthorization: false });
  if (identityEpoch !== startingEpoch) throw new Error("Kontoen blev ændret. Prøv igen fra den rigtige konto.");
  if (next.access_token) saveSession(next); return next;
}
export async function signOut() {
  const active = session;
  const startingEpoch = ++identityEpoch;
  if (enabled && active?.access_token) await authRequest("/logout", { method: "POST" }).catch(() => {});
  if (identityEpoch !== startingEpoch) throw new Error("Kontoen blev ændret. Prøv igen fra den rigtige konto.");
  saveSession(null);
}
export async function consumeAuthCallback() {
  const values = new URLSearchParams(location.hash.replace(/^#/, ""));
  const accessToken = values.get("access_token");
  if (!accessToken) return session;
  identityEpoch += 1;
  saveSession({ access_token: accessToken, refresh_token: values.get("refresh_token"), expires_in: Number(values.get("expires_in") || 0), token_type: values.get("token_type") || "bearer", user: { email: values.get("email") || null } });
  history.replaceState(null, "", location.pathname + location.search);
  await hydrateSessionUser().catch(() => {});
  return session;
}
export async function getCurrentProfile() {
  const s = await requireFreshSession();
  const userId = s.user?.id;
  if (!userId) throw new Error("Din login-session kunne ikke knyttes til din konto. Log ind igen.");
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
  if(!enabled) return {ok:false,status:0,authenticated:false,message:'Loginforbindelsen er ikke sat op'};
  try {
    const s = await requireFreshSession();
    const response=await authorizedFetch(`${PUBLIC_CONFIG.supabaseUrl}/rest/v1/profiles?select=id&limit=1`);
    return {ok:response.ok,status:response.status,authenticated:Boolean(s?.access_token),refreshed:true};
  } catch (error) {
    return {ok:false,status:error.status||0,authenticated:false,message:error.message};
  }
}
