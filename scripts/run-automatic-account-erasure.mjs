import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {buildSupabaseAdminHeaders} from './lib/supabase-admin-rest.mjs';

function refuse(code) {
  throw new Error(code);
}

export async function runAutomaticAccountErasureSchedule(env, fetchImpl = fetch, kind = 'schedule-v1') {
  if (!['schedule-v1','notice-v1'].includes(kind)) refuse('ACCOUNT_ERASURE_OPERATION_INVALID');
  if (env.GITHUB_REPOSITORY !== 'jakobjorgensen82-commits/RavRadar' || env.GITHUB_REF !== 'refs/heads/main'
    || env.GITHUB_EVENT_NAME !== 'schedule' || env.GITHUB_RUN_ATTEMPT !== '1') {
    refuse('ACCOUNT_ERASURE_SCHEDULE_REQUIRED');
  }
  let url;
  try { url = new URL(env.SUPABASE_URL); }
  catch { refuse('ACCOUNT_ERASURE_TARGET_INVALID'); }
  if (url.protocol !== 'https:' || !url.hostname.endsWith('.supabase.co') || url.pathname !== '/'
    || url.username || url.password || url.port || url.search || url.hash) refuse('ACCOUNT_ERASURE_TARGET_INVALID');
  const key = env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!key || key.length < 32) refuse('ACCOUNT_ERASURE_CREDENTIAL_UNAVAILABLE');
  const headers = {...buildSupabaseAdminHeaders(key), 'X-RavRadar-Automatic-Account-Erasure':kind};
  let response;
  try {
    response = await fetchImpl(url.origin + '/functions/v1/trip-log', {
      method:'POST', headers, redirect:'error', signal:AbortSignal.timeout(135_000),
    });
  } catch {
    refuse('ACCOUNT_ERASURE_OUTCOME_UNKNOWN');
  }
  if (!response.body || ![200,503].includes(response.status)) refuse('ACCOUNT_ERASURE_OUTCOME_UNKNOWN');
  const reader = response.body.getReader();
  const buffer = Buffer.alloc(512);
  let length = 0;
  try {
    for (;;) {
      const part = await reader.read();
      if (part.done) break;
      if (length + part.value.length > buffer.length) refuse('ACCOUNT_ERASURE_RESPONSE_INVALID');
      buffer.set(part.value, length);
      length += part.value.length;
    }
  } finally { await reader.cancel().catch(() => {}); reader.releaseLock(); }
  let result;
  try { result = JSON.parse(new TextDecoder('utf8',{fatal:true}).decode(buffer.subarray(0,length))); }
  catch { refuse('ACCOUNT_ERASURE_RESPONSE_INVALID'); }
  const keys = ['completed','failed','pending','selected'];
  if (!result || typeof result !== 'object' || Object.keys(result).sort().join(',') !== keys.join(',')
    || keys.some(keyName => !Number.isInteger(result[keyName]) || result[keyName] < 0 || result[keyName] > 2)
    || result.completed + result.failed + result.pending !== result.selected
    || (response.status === 200) !== (result.failed === 0)) {
    refuse('ACCOUNT_ERASURE_RESPONSE_INVALID');
  }
  return result;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const args = process.argv.slice(2);
    if (args.length > 1 || args.length === 1 && args[0] !== '--notice') refuse('ACCOUNT_ERASURE_OPERATION_INVALID');
    const result = await runAutomaticAccountErasureSchedule(process.env, fetch, args.length ? 'notice-v1' : 'schedule-v1');
    console.log(JSON.stringify(result));
    if (result.failed > 0) process.exitCode = 1;
  } catch (error) {
    const code = /^ACCOUNT_ERASURE_[A-Z_]+$/.test(error?.message) ? error.message : 'ACCOUNT_ERASURE_OUTCOME_UNKNOWN';
    console.error(code);
    process.exitCode = 1;
  }
}
