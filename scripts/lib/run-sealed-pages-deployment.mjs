import { setTimeout as wait } from 'node:timers/promises';
import { request as httpsRequest } from 'node:https';
import {
  createPagesDeploymentRequest, takePagesDeploymentRequestBody,
  admitPagesCreateResponse, classifyPagesStatus,
} from './pages-per-artifact-identity.mjs';

const api = 'https://api.github.com';
const repo = 'jakobjorgensen82-commits/RavRadar';
const intervalMs = 5_000;
const maxWaitMs = 600_000;
const hex40 = /^[a-f0-9]{40}$/;
const secret = /^\S{1,8192}$/;
const positive = /^[1-9]\d{0,15}$/;
const maxAttempts = 121;

function require(value, reason) {
  if (!value) throw new Error(reason);
}

async function requestJson(fetchImpl, url, options, limit) {
  const response = await fetchImpl(url, {
    ...options, redirect: 'error', signal: AbortSignal.timeout(12_000),
  });
  require(response.url === url && response.redirected === false, 'PAGES_TRANSPORT_RESPONSE_ROUTE');
  if (response.status !== 200) {
    await response.body?.cancel();
    return { status: response.status, url: response.url, data: null };
  }
  const stream = response.body?.getReader();
  require(stream, 'PAGES_TRANSPORT_BODY_MISSING');
  const chunks = [];
  let bytes = 0;
  try {
    for (;;) {
      const { value, done } = await stream.read();
      if (done) break;
      bytes += value.byteLength;
      if (bytes > limit) {
        await stream.cancel();
        throw new Error('PAGES_TRANSPORT_BODY_LIMIT');
      }
      chunks.push(value);
    }
  } finally {
    stream.releaseLock();
  }
  const text = new TextDecoder('utf-8', { fatal: true }).decode(Buffer.concat(chunks, bytes));
  return { status: response.status, url: response.url, data: JSON.parse(text) };
}


export async function postJsonOnce(url, headers, body, limit, requestImpl = httpsRequest) {
  const deadline = AbortSignal.timeout(12_000);
  const response = await new Promise((resolve, reject) => {
    const request = requestImpl(url, {
      method: 'POST', headers: { ...headers, 'Content-Length': Buffer.byteLength(body) },
      signal: deadline,
    }, resolve);
    request.once('error', reject);
    request.end(body);
  });
  if (response.statusCode !== 200) {
    response.destroy();
    return { status: response.statusCode, url, data: null };
  }
  const chunks = [];
  let bytes = 0;
  for await (const chunk of response) {
    bytes += chunk.byteLength;
    if (bytes > limit) {
      response.destroy();
      throw new Error('PAGES_TRANSPORT_CREATE_BODY_LIMIT');
    }
    chunks.push(chunk);
  }
  require(response.complete, 'PAGES_TRANSPORT_CREATE_INCOMPLETE');
  const text = new TextDecoder('utf-8', { fatal: true }).decode(Buffer.concat(chunks, bytes));
  return { status: response.statusCode, url, data: JSON.parse(text) };
}

export async function cancelPagesOnce(url, headers, requestImpl = httpsRequest) {
  const response = await new Promise((resolve, reject) => {
    const request = requestImpl(url, { method: 'POST', headers, signal: AbortSignal.timeout(12_000) }, resolve);
    request.once('error', reject);
    request.end();
  });
  response.resume();
  return response.statusCode === 204;
}

/** Use GitHub's signed runner identity and bind all status reads to the returned package ID. */
export async function runSealedPagesDeployment({
  env, seal, expectedBaseUrl, deliveryOrdinal = 1,
  beforeCreate, fetchImpl = fetch, postImpl = postJsonOnce, cancelImpl = cancelPagesOnce, pause = wait, clock = Date.now,
  waitMs = maxWaitMs, cancelAtDeadline = false,
} = {}) {
  require(env?.GITHUB_REPOSITORY === repo && env.GITHUB_API_URL === api
    && env.GITHUB_REF === 'refs/heads/main' && hex40.test(env.GITHUB_SHA ?? '')
    && positive.test(env.GITHUB_RUN_ID ?? '') && positive.test(env.GITHUB_RUN_ATTEMPT ?? '')
    && secret.test(env.GH_TOKEN ?? '') && secret.test(env.ACTIONS_ID_TOKEN_REQUEST_TOKEN ?? ''),
  'PAGES_TRANSPORT_WRITER_SCOPE');
  require(seal?.repository === repo && seal.headSha === env.GITHUB_SHA
    && seal.ref === env.GITHUB_REF && String(seal.runId) === env.GITHUB_RUN_ID
    && String(seal.runAttempt) === env.GITHUB_RUN_ATTEMPT
    && typeof seal.artifactName === 'string' && /^github-pages(?:-preactivation-\d+-\d+)?$/.test(seal.artifactName),
  'PAGES_TRANSPORT_SEAL_SCOPE');

  require(typeof beforeCreate === 'function', 'PAGES_TRANSPORT_CREATE_ADMISSION_REQUIRED');
  require(Number.isSafeInteger(waitMs) && waitMs >= intervalMs && waitMs <= maxWaitMs
    && typeof cancelAtDeadline === 'boolean', 'PAGES_TRANSPORT_TIME_BUDGET');

  const oidcUrl = new URL(env.ACTIONS_ID_TOKEN_REQUEST_URL);
  require(oidcUrl.protocol === 'https:' && oidcUrl.hostname.endsWith('.actions.githubusercontent.com')
    && !oidcUrl.username && !oidcUrl.password && !oidcUrl.hash && !oidcUrl.port,
  'PAGES_TRANSPORT_OIDC_SCOPE');

  const github = { Authorization: 'Bearer ' + env.GH_TOKEN, Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28', 'Cache-Control': 'no-cache',
    'User-Agent': 'RavRadar-Pages-deploy' };
  const listUrl = api + '/repos/' + repo + '/actions/runs/' + env.GITHUB_RUN_ID + '/artifacts?per_page=100';
  const listing = await requestJson(fetchImpl, listUrl, { headers: github }, 1024 * 1024);
  const rows = listing.data?.artifacts;
  require(listing.status === 200 && Array.isArray(rows) && rows.length <= 100
    && listing.data.total_count === rows.length, 'PAGES_TRANSPORT_ARTIFACT_LIST');
  const matches = rows.filter(row => row.name === seal.artifactName);
  require(matches.length === 1 && matches[0].id === seal.artifactId, 'PAGES_TRANSPORT_ARTIFACT_UNIQUE');
  require(Date.parse(matches[0].expires_at) > clock(), 'PAGES_TRANSPORT_ARTIFACT_EXPIRED');

  const oidc = await requestJson(fetchImpl, oidcUrl.href, {
    headers: { Authorization: 'Bearer ' + env.ACTIONS_ID_TOKEN_REQUEST_TOKEN, Accept: 'application/json' },
  }, 64 * 1024);
  require(oidc.status === 200 && typeof oidc.data?.value === 'string', 'PAGES_TRANSPORT_OIDC_UNAVAILABLE');
  const request = createPagesDeploymentRequest({
    env, seal, artifact: matches[0], oidcToken: oidc.data.value, expectedBaseUrl, deliveryOrdinal,
  });

  const intent = Object.freeze({
    repository: seal.repository, headSha: seal.headSha, runId: seal.runId,
    runAttempt: seal.runAttempt, deliveryOrdinal: request.deliveryOrdinal,
    buildVersion: request.buildVersion, artifactId: request.artifactId,
    artifactDigestSha256: seal.artifactDigestSha256,
    targetPublicManifestSha256: seal.targetPublicManifestSha256,
  });
  // After the artifact and runner reads, require fresh exclusivity and a
  // durable create-only reservation from the production caller before POST.
  require(await beforeCreate(intent) === true, 'PAGES_TRANSPORT_CREATE_NOT_RESERVED');

  // This is the only POST call in this invocation. Unknown writes are returned
  // as HOLD and never fall back to the source SHA or to another deployment ID.
  let receipt;
  try {
    const response = await postImpl(request.url, { ...github, 'Content-Type': 'application/json' },
      takePagesDeploymentRequestBody(request), 64 * 1024);
    receipt = admitPagesCreateResponse(response, request);
  } catch {
    return Object.freeze({ outcome: 'UNKNOWN', code: 'CREATE_RESPONSE_UNPROVED', request });
  }

  const terminal = (decision, response) => Object.freeze({
    ...decision, request, receipt, response: Object.freeze({
      status: 200, url: receipt.statusUrl, data: Object.freeze({ ...response.data }),
    }),
  });
  const unknown = code => Object.freeze({ outcome: 'UNKNOWN', code, request, receipt });
  const observe = async () => {
    const response = await requestJson(fetchImpl, receipt.statusUrl, { headers: github }, 64 * 1024);
    return { response, decision: classifyPagesStatus(response, receipt) };
  };
  const deadline = clock() + waitMs;
  try {
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const { response, decision } = await observe();
      if (decision.outcome === 'UNKNOWN') return unknown(decision.code);
      if (decision.outcome !== 'PENDING') return terminal(decision, response);
      if (clock() + intervalMs > deadline || attempt + 1 >= maxAttempts) break;
      await pause(intervalMs);
    }
  } catch {
    return unknown('STATUS_READ_UNPROVED');
  }
  if (!cancelAtDeadline) return unknown('STATUS_DEADLINE');

  // A 204 only acknowledges the cancellation request. A new write must wait
  // for the first deployment's exact terminal status or a verified target.
  try {
    const latest = await observe();
    if (latest.decision.outcome === 'UNKNOWN') return unknown(latest.decision.code);
    if (latest.decision.outcome !== 'PENDING') return terminal(latest.decision, latest.response);
    if (!await cancelImpl(receipt.statusUrl + '/cancel', github))
      return unknown('CANCELLATION_UNPROVED');
    for (let check = 0; check < 7; check++) {
      const { response, decision } = await observe();
      if (decision.outcome === 'UNKNOWN') return unknown(decision.code);
      if (decision.outcome !== 'PENDING') return terminal(decision, response);
      if (check < 6) await pause(intervalMs);
    }
    return unknown('CANCELLATION_STILL_PENDING');
  } catch {
    return unknown('CANCELLATION_UNPROVED');
  }
}
