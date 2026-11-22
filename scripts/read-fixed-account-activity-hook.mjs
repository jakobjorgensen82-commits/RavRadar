import { pathToFileURL } from 'node:url';

const AUTH_CONFIG_URL = 'https://api.supabase.com/v1/projects/afqhhdrkjfjtpadntdzo/config/auth';
const ACTIVITY_HOOK_URI = 'pg-functions://postgres/public/account_native_activity_token_hook';
const REPOSITORY = 'jakobjorgensen82-commits/RavRadar';
const MAX_RESPONSE_BYTES = 64 * 1024;
const REQUEST_TIMEOUT_MS = 12000;

export function isFixedActivityHookReadOwner(env) {
  return env.GITHUB_ACTIONS === 'true'
    && env.RUNNER_ENVIRONMENT === 'github-hosted'
    && env.GITHUB_REPOSITORY === REPOSITORY
    && env.GITHUB_EVENT_NAME === 'workflow_dispatch'
    && env.GITHUB_REF === 'refs/heads/main'
    && env.GITHUB_RUN_ATTEMPT === '1'
    && env.GITHUB_WORKFLOW_REF === REPOSITORY + '/.github/workflows/deploy-trip-storage.yml@refs/heads/main';
}

async function readConfig(response) {
  const declaredLength = response.headers.get('content-length');
  if (declaredLength !== null && (!/^[0-9]+$/.test(declaredLength) || Number(declaredLength) > MAX_RESPONSE_BYTES)) {
    return null;
  }
  if (!response.body) return null;

  // The management response may contain secrets. Keep it transient and return no fields from it.
  const bytes = new Uint8Array(MAX_RESPONSE_BYTES);
  let length = 0;
  for await (const chunk of response.body) {
    if (!(chunk instanceof Uint8Array) || chunk.byteLength > bytes.length - length) return null;
    bytes.set(chunk, length);
    length += chunk.byteLength;
  }
  const config = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes.subarray(0, length)));
  if (!config || typeof config !== 'object' || Array.isArray(config)) return null;
  return config;
}

function classifyDisabledHookUri(uri) {
  if (uri === null || uri === '') return 'EMPTY';
  if (typeof uri !== 'string' || !uri.trim()) return 'UNPROVED';
  return uri === ACTIVITY_HOOK_URI ? 'EXPECTED' : 'DIFFERENT';
}

export async function readFixedAccountActivityHookProjection({ accessToken, fetchImpl = globalThis.fetch }) {
  if (typeof accessToken !== 'string' || !accessToken.trim()) return { status: 'CREDENTIAL_UNAVAILABLE' };
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const response = await fetchImpl(AUTH_CONFIG_URL, {
      method: 'GET',
      headers: { Authorization: 'Bearer ' + accessToken, Accept: 'application/json' },
      redirect: 'error',
      credentials: 'omit',
      cache: 'no-store',
      signal: controller.signal,
    });
    if (response.redirected) return { status: 'CONFIG_UNAVAILABLE' };
    if (response.status === 401 || response.status === 403) return { status: 'PERMISSION_REFUSED' };
    if (response.status !== 200) return { status: 'CONFIG_UNAVAILABLE' };

    const config = await readConfig(response);
    const enabled = config?.hook_custom_access_token_enabled;
    const uri = config?.hook_custom_access_token_uri;
    if (enabled === false) return { status: 'HOOK_DISABLED', disabledHookUri: classifyDisabledHookUri(uri) };
    if (enabled !== true || typeof uri !== 'string' || !uri.trim()) return { status: 'CONFIG_UNAVAILABLE' };
    return { status: uri === ACTIVITY_HOOK_URI ? 'HOOK_ENABLED_EXPECTED' : 'HOOK_ENABLED_DIFFERENT' };
  } catch {
    // Do not expose provider messages, the response, or the exception cause.
    return { status: 'CONFIG_UNAVAILABLE' };
  } finally {
    clearTimeout(timeout);
    controller.abort();
  }
}

export async function readFixedAccountActivityHook(options) {
  return (await readFixedAccountActivityHookProjection(options)).status;
}

if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) {
  const permitted = process.argv.length === 2 && isFixedActivityHookReadOwner(process.env);
  const { status, disabledHookUri } = permitted
    ? await readFixedAccountActivityHookProjection({ accessToken: process.env.SUPABASE_ACCESS_TOKEN })
    : { status: 'OWNER_REQUIRED' };
  console.log(JSON.stringify({ status }));
  if (status === 'HOOK_DISABLED') console.log(JSON.stringify({ disabledHookUri }));
  if (!['HOOK_DISABLED', 'HOOK_ENABLED_EXPECTED', 'HOOK_ENABLED_DIFFERENT'].includes(status)) process.exitCode = 1;
}
