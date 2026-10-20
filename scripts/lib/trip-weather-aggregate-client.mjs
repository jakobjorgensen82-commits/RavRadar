import { canonicalJson, externalOwnerSubject, normalizeCloudflareGatewayUrl, tripGatewaySignature }
  from '../../supabase/functions/_shared/trip-storage.js';
import { ravScoreModelBinding } from '../../js/core/ravscore-model-contract.js';
import { assertPrivateNoisyProposal } from '../../cloudflare/trip-gateway/trip-aggregate-dp.js';
import { buildSupabaseAdminHeaders } from './supabase-admin-rest.mjs';
import { AGGREGATE_PATH, AGGREGATE_VERIFY_PATH, AGGREGATE_LIMITS, aggregateExact, aggregateFail,
  previousClosedAggregateMonth, assertAggregateRequest, assertAggregateWithheldReport }
  from '../../supabase/functions/_shared/trip-aggregate-contract.js';

const UUID = /^[a-f0-9]{8}-[a-f0-9]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[a-f0-9]{12}$/i;
const REVISION = /^(0|[1-9][0-9]{0,18})$/;
async function boundedJson(input, init, fetchImpl, callerSignal, completeInventory = false) {
  const controller = new AbortController();
  const abort = () => controller.abort();
  callerSignal.addEventListener('abort', abort, { once: true });
  let timer, reader;
  const deadline = new Promise((_, reject) => {
    timer = setTimeout(() => { controller.abort(); reject(new Error('AGGREGATE_READ_TIMEOUT')); }, AGGREGATE_LIMITS.requestMs);
  });
  try {
    if (callerSignal.aborted) aggregateFail('AGGREGATE_READ_TIMEOUT');
    return await Promise.race([deadline, (async () => {
      const reply = await fetchImpl(input, { ...init, signal: controller.signal,
        redirect: 'error', cache: 'no-store', credentials: 'omit' });
      if (reply.status !== 200 || reply.redirected) aggregateFail('AGGREGATE_READ_REJECTED');
      const declared = reply.headers.get('content-length');
      if (declared !== null && (!/^\d+$/.test(declared) || Number(declared) > AGGREGATE_LIMITS.metadataBytes)) aggregateFail('AGGREGATE_RESPONSE_TOO_LARGE');
      reader = reply.body?.getReader(); if (!reader) aggregateFail('AGGREGATE_RESPONSE_INVALID');
      const chunks = []; let total = 0;
      while (true) {
        const chunk = await reader.read();
        if (chunk.done) break;
        if (!(chunk.value instanceof Uint8Array) || (total += chunk.value.length) > AGGREGATE_LIMITS.metadataBytes) aggregateFail('AGGREGATE_RESPONSE_TOO_LARGE');
        chunks.push(chunk.value);
      }
      const bytes = new Uint8Array(total); let offset = 0;
      for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
      let parsed;
      try { parsed = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes)); }
      catch { aggregateFail('AGGREGATE_RESPONSE_INVALID'); }
      if (completeInventory) {
        // A requested limit alone does not prove completeness: PostgREST may
        // impose a smaller server cap. Require an exact total and full range.
        const range = reply.headers.get('content-range');
        if (!Array.isArray(parsed) || typeof range !== 'string' || range.length > 64) aggregateFail('AGGREGATE_ACCOUNT_INVENTORY_INCOMPLETE');
        const full = /^(?:items )?0-([0-9]+)\/([0-9]+)$/.exec(range);
        const completeEmpty = /^(?:items )?\*\/0$/.test(range) && parsed.length === 0;
        if (!completeEmpty && (!full || !Number.isSafeInteger(Number(full[1]))
            || !Number.isSafeInteger(Number(full[2])) || Number(full[1]) + 1 !== parsed.length
            || Number(full[2]) !== parsed.length)) aggregateFail('AGGREGATE_ACCOUNT_INVENTORY_INCOMPLETE');
      }
      return parsed;
    })()]);
  } finally {
    clearTimeout(timer); callerSignal.removeEventListener('abort', abort); controller.abort();
    if (reader) { try { void reader.cancel().catch(() => {}); } catch {} }
  }
}

// Private curator study seam. Account metadata/diagnostics stay out of the returned blob and stdout.
// No token, owner, SQL, time range, binding override or arbitrary URL from UI.
export async function readTripWeatherAggregate({ supabaseUrl, serviceRoleKey,
  gatewayUrl, sharedSecret, pseudonymSecret, fetchImpl = fetch, now = Date.now() } = {}) {
  const base = new URL(supabaseUrl);
  if (base.protocol !== 'https:' || !/^[a-z0-9]+\.supabase\.co$/.test(base.hostname)
      || base.pathname !== '/' || base.search || base.hash || base.username || base.password
      || ![serviceRoleKey, sharedSecret, pseudonymSecret].every(value => typeof value === 'string' && value.length >= 32)
      || typeof fetchImpl !== 'function') aggregateFail('AGGREGATE_CONFIGURATION_INVALID');
  const gateway = normalizeCloudflareGatewayUrl(gatewayUrl), controller = new AbortController();
  let callerTimer;
  const callerDeadline = new Promise((_, reject) => {
    callerTimer = setTimeout(() => { controller.abort(); reject(new Error('AGGREGATE_CALLER_TIMEOUT')); }, AGGREGATE_LIMITS.callerMs);
  });
  const execute = async () => {
    const headers = { ...buildSupabaseAdminHeaders(serviceRoleKey), Accept: 'application/json', Prefer: 'count=exact' };
    const snapshot = async () => {
      const profilesUrl = new URL('/rest/v1/profiles', base);
      profilesUrl.search = 'select=id&is_active=eq.true&order=id&limit=1001';
      const preferencesUrl = new URL('/rest/v1/account_statistics_preferences', base);
      preferencesUrl.search = 'select=user_id,enabled,revision&order=user_id&limit=1001';
      const profiles = await boundedJson(profilesUrl, { method: 'GET', headers }, fetchImpl, controller.signal, true);
      const preferences = await boundedJson(preferencesUrl, { method: 'GET', headers }, fetchImpl, controller.signal, true);
      if (!Array.isArray(profiles) || !Array.isArray(preferences)
          || profiles.length > AGGREGATE_LIMITS.accounts || preferences.length > AGGREGATE_LIMITS.accounts) aggregateFail('AGGREGATE_ACCOUNT_CAP_REACHED');
      const ids = new Set(), prefs = new Map();
      for (const row of profiles) {
        aggregateExact(row, ['id'], 'AGGREGATE_ACCOUNT_METADATA_INVALID');
        if (typeof row.id !== 'string' || !UUID.test(row.id) || ids.has(row.id.toLowerCase())) aggregateFail('AGGREGATE_ACCOUNT_METADATA_INVALID');
        ids.add(row.id.toLowerCase());
      }
      for (const row of preferences) {
        aggregateExact(row, ['user_id', 'enabled', 'revision'], 'AGGREGATE_PREFERENCE_METADATA_INVALID');
        // PostgREST bigint numbers lose precision. Refuse unsafe numbers; no
        // inferred/canonicalized rounded revision may become a stable snapshot.
        const revision = typeof row.revision === 'number' && Number.isSafeInteger(row.revision)
          ? String(row.revision) : row.revision;
        if (typeof row.user_id !== 'string' || !UUID.test(row.user_id) || typeof row.enabled !== 'boolean' || typeof revision !== 'string' || !REVISION.test(revision)
            || BigInt(revision) > 9223372036854775807n || prefs.has(row.user_id.toLowerCase())) aggregateFail('AGGREGATE_PREFERENCE_METADATA_INVALID');
        prefs.set(row.user_id.toLowerCase(), { enabled: row.enabled, revision, source: 'stored' });
      }
      const accounts = [];
      for (const userId of ids) {
        const owner = await externalOwnerSubject({ userId, secret: pseudonymSecret });
        accounts.push({ ownerSubject: owner.subject,
          ...(prefs.get(userId) ?? { enabled: true, revision: '0', source: 'default' }) });
      }
      accounts.sort((a, b) => a.ownerSubject < b.ownerSubject ? -1 : a.ownerSubject > b.ownerSubject ? 1 : 0);
      return accounts;
    };
    const before = await snapshot();
    const request = { schemaVersion: 1, period: previousClosedAggregateMonth(now),
      modelBinding: ravScoreModelBinding(), preferenceSnapshot: { schemaVersion: 2,
        snapshotAt: new Date(now).toISOString(), accounts: before } };
    assertAggregateRequest(request, ravScoreModelBinding(), now);
    const send=async(pathname,bodyRequest)=>{
      assertAggregateRequest(bodyRequest,ravScoreModelBinding());
      const body=JSON.stringify(bodyRequest),timestamp=String(Date.now());
      const signature=await tripGatewaySignature({secret:sharedSecret,timestamp,method:'POST',pathname,bodyText:body});
      const answer=await boundedJson(gateway+pathname,{method:'POST',
        headers:{'Content-Type':'application/json','X-RavRadar-Timestamp':timestamp,'X-RavRadar-Signature':signature},body},fetchImpl,controller.signal);
      aggregateExact(answer,['ok','report'],'AGGREGATE_RESPONSE_INVALID');
      if(answer.ok!==true)aggregateFail('AGGREGATE_RESPONSE_INVALID');
      if(pathname===AGGREGATE_PATH)assertAggregateWithheldReport(answer.report,bodyRequest);
      else{
        await assertPrivateNoisyProposal(answer.report);
        if(answer.report.period.start!==bodyRequest.period.start||answer.report.period.end!==bodyRequest.period.end)
          aggregateFail('AGGREGATE_RESPONSE_INVALID');
      }
      return answer;
    };
    await send(AGGREGATE_PATH,request);
    const after=await snapshot();
    if(canonicalJson(before)!==canonicalJson(after))aggregateFail('AGGREGATE_PREFERENCES_CHANGED');
    // A delayed/lost preparation response cannot authorize an obsolete frozen
    // report. Fresh signed acknowledgement reads only an EXISTING proposal and
    // the normal control-shard erasure barrier; it never creates/resamples.
    const verified=await send(AGGREGATE_VERIFY_PATH,{...request,preferenceSnapshot:{schemaVersion:2,snapshotAt:new Date(Date.now()).toISOString(),accounts:after}});
    if(canonicalJson(after)!==canonicalJson(await snapshot()))aggregateFail('AGGREGATE_PREFERENCES_CHANGED');
    return verified.report;
  };
  try { return await Promise.race([execute(), callerDeadline]); }
  finally { clearTimeout(callerTimer); controller.abort(); }
}
