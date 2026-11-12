import { setTimeout as wait } from 'node:timers/promises';
import { request as httpsRequest } from 'node:https';
import {
  createPagesDeploymentRequest, takePagesDeploymentRequestBody,
  admitPagesCreateResponse, classifyPagesStatus, classifyPagesPriorStatus, pagesIdentityFailureCode, projectPagesStatusData,
} from './pages-per-artifact-identity.mjs';

const api = 'https://api.github.com';
const repo = 'jakobjorgensen82-commits/RavRadar';
const intervalMs = 5_000;
const maxWaitMs = 600_000;
const hex40 = /^[a-f0-9]{40}$/;
const secret = /^\S{1,8192}$/;
const positive = /^[1-9]\d{0,15}$/;
const maxAttempts = 121;
const requestTimeoutMs = 12_000;
const cancellationChecks = 7;

const transportFailures = new WeakMap();
const retryEvidence = new WeakSet();
const terminalEvidence = new WeakSet();
const noPostEvidence = new WeakSet();
const deliveryCodes = new WeakMap();
const deliveryResult = data => { const value = Object.freeze(data); deliveryCodes.set(value, data.code); return value; };
export const sealedPagesDeliveryDiagnostic = delivery => deliveryCodes.get(delivery) ?? 'PAGES_DELIVERY_UNPROVED';
const transportError = code => { const error = new Error(code); transportFailures.set(error, code); return error; };
export const hasSealedPagesRetryEvidence = delivery => retryEvidence.has(delivery);
export const hasSealedPagesTerminalEvidence = delivery => terminalEvidence.has(delivery);
export const hasSealedPagesNoPostEvidence = delivery => noPostEvidence.has(delivery);
export const sealedPagesFailureCode = error => pagesIdentityFailureCode(error)
  ?? transportFailures.get(error) ?? 'PAGES_TRANSPORT_UNPROVED';
function require(value, reason) { if (!value) throw transportError(reason); }

async function requestJson(fetchImpl, url, options, limit, phase) {
  let response;
  try { response = await fetchImpl(url, {
    ...options, redirect: 'error', signal: AbortSignal.timeout(12_000),
  }); } catch { throw transportError('PAGES_TRANSPORT_' + phase + '_READ_UNPROVED'); }
  require(response.url === url && response.redirected === false, 'PAGES_TRANSPORT_' + phase + '_RESPONSE_ROUTE');
  if (response.status !== 200) {
    await response.body?.cancel();
    return { status: response.status, url: response.url, data: null };
  }
  const stream = response.body?.getReader();
  require(stream, 'PAGES_TRANSPORT_' + phase + '_BODY_MISSING');
  const chunks = [];
  let bytes = 0;
  try {
    for (;;) {
      const { value, done } = await stream.read();
      if (done) break;
      bytes += value.byteLength;
      if (bytes > limit) {
        await stream.cancel();
        throw transportError('PAGES_TRANSPORT_' + phase + '_BODY_LIMIT');
      }
      chunks.push(value);
    }
  } finally {
    stream.releaseLock();
  }
  const text = new TextDecoder('utf-8', { fatal: true }).decode(Buffer.concat(chunks, bytes));
  try { return { status: response.status, url: response.url, data: JSON.parse(text) }; }
  catch { throw transportError('PAGES_TRANSPORT_' + phase + '_JSON'); }
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
      throw transportError('PAGES_TRANSPORT_CREATE_BODY_LIMIT');
    }
    chunks.push(chunk);
  }
  require(response.complete, 'PAGES_TRANSPORT_CREATE_INCOMPLETE');
  const text = new TextDecoder('utf-8', { fatal: true }).decode(Buffer.concat(chunks, bytes));
  try { return { status: response.statusCode, url, data: JSON.parse(text) }; }
  catch { throw transportError('PAGES_TRANSPORT_CREATE_JSON'); }
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

/** Use GitHub's signed runner identity and its returned deployment ID; never claim a per-artifact server key. */
export async function runSealedPagesDeployment(options = {}) {
  let postAttempted = false;
  try {
    const result = await executeSealedPagesDeployment(options, () => { postAttempted = true; });
    // A prior positive remote state still needs reconciliation. No POST in
    // this invocation must not turn that separate uncertainty into closure.
    if (!postAttempted && !['PRIOR_DEPLOYMENT_PENDING', 'PRIOR_UNIQUE_VERSION_ALREADY_USED'].includes(result.code))
      noPostEvidence.add(result);
    return result;
  } catch (error) {
    if (error !== null && ['object', 'function'].includes(typeof error)) {
      noPostEvidence.delete(error);
      if (!postAttempted) noPostEvidence.add(error);
    }
    throw error;
  }
}

async function executeSealedPagesDeployment({
  env, seal, expectedBaseUrl, deliveryOrdinal = 1,
  beforeCreate, fetchImpl = fetch, postImpl = postJsonOnce, cancelImpl = cancelPagesOnce, pause = wait, clock = Date.now,
  waitMs = maxWaitMs, cancelAtDeadline = false, absoluteDeadlineMs, completionReserveMs,
} = {}, markPostAttempted) {
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
    && typeof cancelAtDeadline === 'boolean' && Number.isSafeInteger(absoluteDeadlineMs)
    && Number.isSafeInteger(completionReserveMs) && completionReserveMs >= 0, 'PAGES_TRANSPORT_TIME_BUDGET');

  const oidcUrl = new URL(env.ACTIONS_ID_TOKEN_REQUEST_URL);
  require(oidcUrl.protocol === 'https:' && oidcUrl.hostname.endsWith('.actions.githubusercontent.com')
    && !oidcUrl.username && !oidcUrl.password && !oidcUrl.hash && !oidcUrl.port,
  'PAGES_TRANSPORT_OIDC_SCOPE');

  const github = { Authorization: 'Bearer ' + env.GH_TOKEN, Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28', 'Cache-Control': 'no-cache',
    'User-Agent': 'RavRadar-Pages-deploy' };
  const listUrl = api + '/repos/' + repo + '/actions/runs/' + env.GITHUB_RUN_ID + '/artifacts?per_page=100';
  const listing = await requestJson(fetchImpl, listUrl, { headers: github }, 1024 * 1024, 'ARTIFACT_LIST');
  require(listing.status === 200, 'PAGES_TRANSPORT_ARTIFACT_LIST_HTTP_' + listing.status);
  const rows = listing.data?.artifacts;
  require(Array.isArray(rows) && rows.length <= 100
    && listing.data.total_count === rows.length, 'PAGES_TRANSPORT_ARTIFACT_LIST');
  const matches = rows.filter(row => row.name === seal.artifactName);
  require(matches.length === 1 && matches[0].id === seal.artifactId, 'PAGES_TRANSPORT_ARTIFACT_UNIQUE');
  require(Date.parse(matches[0].expires_at) > clock(), 'PAGES_TRANSPORT_ARTIFACT_EXPIRED');

  const oidc = await requestJson(fetchImpl, oidcUrl.href, {
    headers: { Authorization: 'Bearer ' + env.ACTIONS_ID_TOKEN_REQUEST_TOKEN, Accept: 'application/json' },
  }, 64 * 1024, 'OIDC');
  require(oidc.status === 200, 'PAGES_TRANSPORT_OIDC_HTTP_' + oidc.status);
  require(typeof oidc.data?.value === 'string', 'PAGES_TRANSPORT_OIDC_SCHEMA');
  const request = createPagesDeploymentRequest({
    env, seal, artifact: matches[0], oidcToken: oidc.data.value, expectedBaseUrl, deliveryOrdinal,
  });

  let prior;
  try {
    const response = await requestJson(fetchImpl, request.statusUrl, { headers: github }, 64 * 1024, 'PRIOR_STATUS');
    prior = classifyPagesPriorStatus(response, request);
    if (prior.outcome === 'PENDING')
      return deliveryResult({ outcome: 'UNKNOWN', code: 'PRIOR_DEPLOYMENT_PENDING', request });
    if (prior.outcome === 'CLOSED')
      return deliveryResult({ outcome: 'UNKNOWN', code: 'PRIOR_UNIQUE_VERSION_ALREADY_USED', request });
    if (prior.outcome === 'UNKNOWN'
      && !['PRIOR_STATUS_EMPTY_UNQUALIFIED', 'PRIOR_STATUS_ABSENCE_UNQUALIFIED'].includes(prior.code))
      return deliveryResult({ outcome: 'UNKNOWN', code: prior.code, request });
  } catch {
    return deliveryResult({ outcome: 'UNKNOWN', code: 'PRIOR_STATUS_READ_UNPROVED', request });
  }
  // Empty/404 never proves absence or grants authority. The unique intent
  // still requires normal admission and one create-only caller reservation.
  const operationDeadline = absoluteDeadlineMs - completionReserveMs;
  // Latest GET + one CANCEL + seven terminal GETs, including all six pauses.
  const cleanupReserveMs = cancelAtDeadline
    ? (2 + cancellationChecks) * requestTimeoutMs + (cancellationChecks - 1) * intervalMs : 0;
  const hasWriteBudget = () => clock() + requestTimeoutMs
    + waitMs + cleanupReserveMs <= operationDeadline;
  if (!hasWriteBudget()) return deliveryResult({ outcome: 'UNKNOWN', code: 'CREATE_BUDGET_UNAVAILABLE', request });

  const intent = Object.freeze({
    repository: seal.repository, headSha: seal.headSha, runId: seal.runId,
    runAttempt: seal.runAttempt, deliveryOrdinal: request.deliveryOrdinal,
    buildVersion: request.buildVersion, clientIntentSha256: request.clientIntentSha256, artifactId: request.artifactId,
    artifactDigestSha256: seal.artifactDigestSha256,
    targetPublicManifestSha256: seal.targetPublicManifestSha256,
  });
  // After the artifact and runner reads, require fresh exclusivity and a
  // durable create-only reservation from the production caller before POST.
  require(await beforeCreate(intent) === true, 'PAGES_TRANSPORT_CREATE_NOT_RESERVED');
  // The immutable request was built here from the exact authenticated seal.
  const uniqueIntentReserved = request.buildVersion !== seal.headSha
    && request.buildVersion === request.clientIntentSha256.slice(0, 40);
  require(uniqueIntentReserved, 'PAGES_TRANSPORT_UNIQUE_INTENT_UNPROVED');
  if (!hasWriteBudget()) return deliveryResult({ outcome: 'UNKNOWN', code: 'CREATE_BUDGET_EXPIRED', request });

  // This is the only POST call in this invocation. Unknown writes are returned
  // as HOLD and never fall back to the source SHA or to another deployment ID.
  let receipt;
  markPostAttempted();
  try {
    const response = await postImpl(request.url, { ...github, 'Content-Type': 'application/json' },
      takePagesDeploymentRequestBody(request), 64 * 1024);
    receipt = admitPagesCreateResponse(response, request);
  } catch (error) {
    const cause = sealedPagesFailureCode(error);
    return deliveryResult({ outcome: 'UNKNOWN', code: cause === 'PAGES_TRANSPORT_UNPROVED'
      ? 'PAGES_CREATE_TRANSPORT_UNPROVED' : cause, request });
  }

  let pendingObserved = false;
  const terminal = (decision, response) => {
    const delivery = deliveryResult({
      ...decision, request, receipt, pendingObserved, priorStatus: prior.code,
      response: Object.freeze({ status: 200, url: receipt.statusUrl, data: projectPagesStatusData(response, receipt) }),
    });
    // The positive CREATE binds this actual ID to our one reserved unique intent.
    // A known terminal GET is sufficient even when the provider fails immediately.
    if (uniqueIntentReserved && decision.outcome === 'FAILED'
      && ['deployment_failed', 'deployment_cancelled', 'deployment_content_failed'].includes(decision.code)) terminalEvidence.add(delivery);
    if (uniqueIntentReserved && decision.outcome === 'FAILED'
      && ['deployment_failed', 'deployment_cancelled'].includes(decision.code)) retryEvidence.add(delivery);
    return delivery;
  };
  const unknown = code => deliveryResult({ outcome: 'UNKNOWN', code, request, receipt });
  const observe = async () => {
    require(clock() + requestTimeoutMs <= operationDeadline, 'PAGES_TRANSPORT_STATUS_OPERATION_DEADLINE');
    const response = await requestJson(fetchImpl, receipt.statusUrl, { headers: github }, 64 * 1024, 'STATUS');
    const decision = classifyPagesStatus(response, receipt);
    if (decision.outcome === 'PENDING') pendingObserved = true;
    return { response, decision };
  };
  const deadline = Math.min(clock() + waitMs, operationDeadline - cleanupReserveMs);
  try {
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      if (clock() + requestTimeoutMs > deadline) break;
      const { response, decision } = await observe();
      if (decision.outcome === 'UNKNOWN') return unknown(decision.code);
      if (decision.outcome !== 'PENDING') return terminal(decision, response);
      if (clock() + intervalMs + requestTimeoutMs > deadline || attempt + 1 >= maxAttempts) break;
      await pause(intervalMs);
    }
  } catch {
    return unknown('STATUS_READ_UNPROVED');
  }
  if (!cancelAtDeadline) return unknown('STATUS_DEADLINE');

  // A 204 only acknowledges the cancellation request. A new write must wait
  // for the first deployment's exact terminal status or a verified target.
  try {
    // One finite wait, then an observed clock proof. A frozen/early injected
    // clock never loops and never authorizes cancellation before the deadline.
    const beforeWait = clock();
    if (!Number.isSafeInteger(beforeWait)) return unknown('CANCELLATION_POLL_CLOCK_UNPROVED');
    const remainingPollMs = Math.max(0, deadline - beforeWait);
    if (beforeWait + remainingPollMs + cleanupReserveMs > operationDeadline)
      return unknown('CANCELLATION_OPERATION_BUDGET_EXHAUSTED');
    if (remainingPollMs > 0) await pause(remainingPollMs);
    const afterWait = clock();
    if (!Number.isSafeInteger(afterWait) || afterWait < deadline)
      return unknown('CANCELLATION_POLL_DEADLINE_UNPROVED');
    if (afterWait + cleanupReserveMs > operationDeadline)
      return unknown('CANCELLATION_OPERATION_BUDGET_EXHAUSTED');
    const latest = await observe();
    if (latest.decision.outcome === 'UNKNOWN') return unknown(latest.decision.code);
    if (latest.decision.outcome !== 'PENDING') return terminal(latest.decision, latest.response);
    if (clock() + cleanupReserveMs - requestTimeoutMs > operationDeadline)
      return unknown('CANCELLATION_OPERATION_BUDGET_EXHAUSTED');
    require(clock() + requestTimeoutMs <= operationDeadline, 'PAGES_TRANSPORT_CANCEL_OPERATION_DEADLINE');
    let cancellationAcknowledged = false;
    try { cancellationAcknowledged = await cancelImpl(receipt.statusUrl + '/cancel', github) === true; }
    catch { /* One uncertain cancellation may only be followed by status reads. */ }
    for (let check = 0; check < cancellationChecks; check++) {
      const { response, decision } = await observe();
      if (decision.outcome === 'UNKNOWN') return unknown(decision.code);
      if (decision.outcome !== 'PENDING') return terminal(decision, response);
      if (check + 1 < cancellationChecks) {
        if (clock() + intervalMs + requestTimeoutMs > operationDeadline)
          return unknown('CANCELLATION_OPERATION_BUDGET_EXHAUSTED');
        await pause(intervalMs);
      }
    }
    return unknown(cancellationAcknowledged ? 'CANCELLATION_STILL_PENDING' : 'CANCELLATION_UNPROVED');
  } catch {
    return unknown('CANCELLATION_UNPROVED');
  }
}
