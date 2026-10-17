// Diagnostic-only390663 child: ONLY the normal exact B/S document GETs.
// No exported capability, snapshot response, origin handle or network bypass.
import net from 'node:net';
import tls from 'node:tls';
import http from 'node:http';
import https from 'node:https';
import dgram from 'node:dgram';
import { AsyncLocalStorage } from 'node:async_hooks';
import { syncBuiltinESMExports } from 'node:module';
import { buildSupabaseAdminHeaders } from './supabase-admin-rest.mjs';

const stop = () => { throw Object.assign(new Error('SAVED_CURRENT_REPLAY_NETWORK_DISABLED'),
  { code: 'SAVED_CURRENT_REPLAY_NETWORK_DISABLED' }); };
if (process.env.RAVRADAR_SAVED_CURRENT_REPLAY_DIAGNOSTIC !== '39066350748-1'
  || process.env.RAVRADAR_PRODUCTION_TARGET_HOUR !== '2026-10-17T20:00:00.000Z'
  || process.env.RAVRADAR_WEATHER_CACHE_ONLY !== 'true'
  || process.env.RAVRADAR_WEATHER_STATE_EPOCH_BOOTSTRAP !== 'false'
  || process.env.RAVRADAR_WEATHER_STATE_EPOCH_CHECKPOINT_REENTRY !== 'false') stop();
let base;
try { base = new URL(process.env.SUPABASE_URL); } catch { stop(); }
if (base.protocol !== 'https:' || base.hostname !== 'afqhhdrkjfjtpadntdzo.supabase.co'
  || base.port || base.username || base.password || base.pathname !== '/' || base.search || base.hash
  || typeof process.env.SUPABASE_SERVICE_ROLE_KEY !== 'string' || !process.env.SUPABASE_SERVICE_ROLE_KEY.trim()) stop();
const allowed = new Set(['ravscore-private-production-runtime-pointer', 'ravscore-continuation-checkpoint']
  .map(key => base.origin + '/rest/v1/admin_documents?document_key=eq.' + key + '&select=document_key,payload,version&limit=2'));
const expectedHeaders = new Headers(buildSupabaseAdminHeaders(process.env.SUPABASE_SERVICE_ROLE_KEY));
const nativeFetch = globalThis.fetch;
const access = new AsyncLocalStorage(), permit = Object.freeze({});
const guardedConnect = original => function (...args) {
  if (access.getStore() !== permit) stop();
  return Reflect.apply(original, this, args);
};
// Async-local transport authority belongs only to the captured native fetch
// call after exact request validation. It is never exposed to its caller or
// enabled globally while another promise is pending.
net.connect = guardedConnect(net.connect);
net.createConnection = guardedConnect(net.createConnection);
net.Socket.prototype.connect = guardedConnect(net.Socket.prototype.connect);
tls.connect = guardedConnect(tls.connect);
http.request = http.get = https.request = https.get = dgram.createSocket = stop;
if ('WebSocket' in globalThis) globalThis.WebSocket = class { constructor() { stop(); } };
let requests = 0;
globalThis.fetch = (input, options = {}) => {
  if (!(typeof input === 'string' || input instanceof URL) || options === null
    || Object.getPrototypeOf(options) !== Object.prototype
    || Object.keys(options).some(key => !['method', 'headers', 'signal', 'redirect'].includes(key))
    || (options.method !== undefined && options.method !== 'GET')
    || (options.redirect !== undefined && options.redirect !== 'error' && options.redirect !== 'manual')) stop();
  let url; try { url = new URL(input); } catch { stop(); }
  if (!allowed.has(url.href) || requests >= 6) stop();
  const headers = new Headers(options.headers);
  if ([...headers].length !== [...expectedHeaders].length
    || [...expectedHeaders].some(([key, value]) => headers.get(key) !== value)) stop();
  requests++;
  const controller = new AbortController();
  const signal = options.signal ? AbortSignal.any([options.signal, controller.signal]) : controller.signal;
  const timer = setTimeout(() => controller.abort(), 60_000);
  timer.unref?.();
  return access.run(permit, async () => {
    let delivered = false;
    try {
      const response = await nativeFetch(url.href, { method: 'GET', headers, signal, redirect: 'manual' });
      if (response.status >= 300 && response.status < 400) {
        await response.body?.cancel(); stop();
      }
      delivered = true;
      return response;
    } finally {
      // Keep the deadline on the original signal while the normal requester
      // consumes its body, not merely until headers arrive. At most six
      // unreferenced timers exist; completed bodies need no transport work.
      if (!delivered) clearTimeout(timer);
    }
  });
};
syncBuiltinESMExports();
