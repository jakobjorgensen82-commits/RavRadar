// Pure diagnostic candidate. No transport, OIDC acquisition, persistence,
// retries, cancellation, public verification or workflow authority.
import { createHash } from 'node:crypto';

const API = 'https://api.github.com';
const REPOSITORY = 'jakobjorgensen82-commits/RavRadar';
const REF = 'refs/heads/main';
const CREATE_URL = API + '/repos/' + REPOSITORY + '/pages/deployments';
const PROJECT_PAGES = 'https://jakobjorgensen82-commits.github.io/RavRadar';
const CUSTOM_PAGES = 'https://ravradar.dk';
const DOMAIN = 'ravradar:github-pages:sealed-artifact-deployment:v1';
const SHA1 = /^[0-9a-f]{40}$/;
const SHA256 = /^[0-9a-f]{64}$/;
const SAFE_ID = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,255}$/;
const TOKEN_FORMAT = /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/;
const SEAL_FIELDS = [
  'schemaVersion', 'repository', 'ref', 'runId', 'runAttempt', 'headSha',
  'attemptId', 'artifactId', 'artifactName', 'artifactDigestSha256',
  'artifactSizeBytes', 'targetPublicManifestSha256',
  'targetImplementationClosureSha256', 'targetModelBinding', 'createdAt',
  'privatePayloadIncluded',
];
const BINDING_FIELDS = [
  'modelId', 'stateSchemaVersion', 'variantId', 'profileId', 'componentSchemaId',
  'explanationSchemaId', 'rankingPolicyId', 'bestTimePolicyId',
  'presentationPolicyId', 'modelContractSha256', 'modelBundleSha256',
];
const CREATE_FIELDS = ['id', 'page_url', 'status_url', 'preview_url'];
const STATUS_FIELDS = ['status', 'id', 'deployment_id', 'pages_build_version', 'artifact_id'];
const REMOTE_FIELDS = [...new Set([...CREATE_FIELDS, ...STATUS_FIELDS])];
const FAILURE = new Set([
  'deployment_failed', 'deployment_content_failed', 'deployment_cancelled', 'deployment_lost',
]);
const PENDING = new Set([
  'deployment_queued', 'deployment_in_progress', 'deployment_working', 'syncing_files',
]);
const requests = new WeakMap();
const receipts = new WeakMap();

const identityFailures = new WeakMap();
const fail = code => { const error = new Error(code); identityFailures.set(error, code); throw error; };
export const pagesIdentityFailureCode = error => identityFailures.get(error) ?? null;
const requestReasons = new Set(['DELIVERY_ORDINAL', 'CONTEXT', 'PAGE_BASE', 'SEAL', 'ATTEMPT', 'ARTIFACT', 'OIDC_FORMAT']);
const need = (ok, code) => { if (!ok) fail(code); };
const matches = (value, pattern) => typeof value === 'string' && pattern.test(value);
const positive = value => Number.isSafeInteger(value) && value > 0;
function own(value, key) {
  if (!value || typeof value !== 'object') return undefined;
  const prop = Object.getOwnPropertyDescriptor(value, key);
  return prop && Object.hasOwn(prop, 'value') ? prop.value : undefined;
}
function closedRecord(value, allowed, required = allowed) {
  if (!value || Object.getPrototypeOf(value) !== Object.prototype) return false;
  const keys = Reflect.ownKeys(value);
  return keys.every(key => allowed.includes(key) && own(value, key) !== undefined)
    && required.every(key => keys.includes(key));
}
// GitHub permits additive response metadata. Only own data fields may enter;
// unknown fields are ignored, never authority or part of retained evidence.
function remoteRecord(value, required) {
  if (!value || Object.getPrototypeOf(value) !== Object.prototype) return false;
  const keys = Reflect.ownKeys(value);
  return keys.every(key => typeof key === 'string'
    && Object.hasOwn(Object.getOwnPropertyDescriptor(value, key), 'value')
    && (!REMOTE_FIELDS.includes(key) || own(value, key) !== undefined))
    && required.every(key => keys.includes(key));
}
function remoteMetadataConflict(data, { deploymentId, buildVersion, artifactId, pageUrl } = {}) {
  const ids = ['id', 'deployment_id'].filter(key => Object.hasOwn(data, key))
    .map(key => actualDeploymentId(own(data, key)));
  if (ids.some(id => id === null || deploymentId !== undefined && id !== deploymentId)
    || new Set(ids).size > 1) return 'ID';
  if (Object.hasOwn(data, 'pages_build_version') && data.pages_build_version !== buildVersion)
    return 'BUILD_VERSION';
  if (Object.hasOwn(data, 'artifact_id') && (!positive(data.artifact_id)
    || artifactId !== undefined && data.artifact_id !== artifactId)) return 'ARTIFACT';
  if (Object.hasOwn(data, 'page_url') && (!canonicalPagesUrl(data.page_url)
    || pageUrl !== undefined && canonicalPagesUrl(data.page_url) !== pageUrl)) return 'PAGE_URL';
  if (Object.hasOwn(data, 'preview_url') && !(data.preview_url === ''
    || typeof data.preview_url === 'string' && data.preview_url.length <= 2048
      && /^https:\/\/[^\s]+$/.test(data.preview_url))) return 'PREVIEW_URL';
  const id = deploymentId ?? ids[0] ?? buildVersion;
  const statusUrl = CREATE_URL + '/' + encodeURIComponent(id);
  const legacy = API + '/repos/' + REPOSITORY + '/pages/deployment/status/' + encodeURIComponent(id);
  if (Object.hasOwn(data, 'status_url') && ![statusUrl, statusUrl + '/status', legacy].includes(data.status_url))
    return 'STATUS_URL';
  return null;
}
function idFromEnvironment(value) {
  if (!matches(value, /^[1-9][0-9]{0,15}$/)) return null;
  const id = Number(value);
  return positive(id) && String(id) === value ? id : null;
}
function canonicalDate(value) {
  if (typeof value !== 'string' || value.length > 40) return null;
  const time = Date.parse(value);
  return Number.isFinite(time) ? new Date(time).toISOString() : null;
}
function canonicalPagesUrl(value) {
  for (const base of [PROJECT_PAGES, CUSTOM_PAGES]) {
    const bare = base.slice('https://'.length);
    if ([base, base + '/', bare, bare + '/'].includes(value)) return base + '/';
  }
  return null;
}
function validBinding(value) {
  return closedRecord(value, BINDING_FIELDS) && BINDING_FIELDS.every(field =>
    matches(own(value, field), field.endsWith('Sha256') ? SHA256 : SAFE_ID));
}

/**
 * Call only after the normal sealed-upload and writer/main gates. `artifact`
 * is the authenticated exact-ID Actions artifact GET's parsed metadata, not
 * a name lookup or a caller-built projection. The adapter owns those proofs.
 * The supplied GitHub OIDC credential is sent only in the one extracted body;
 * this module checks format, not cryptographic authenticity (GitHub does that).
 */
export function createPagesDeploymentRequest(options) {
  try {
    const env = own(options, 'env'), seal = own(options, 'seal'), artifact = own(options, 'artifact');
    const oidc = own(options, 'oidcToken');
    const suppliedOrdinal = own(options, 'deliveryOrdinal');
    const deliveryOrdinal = suppliedOrdinal === undefined ? 1 : suppliedOrdinal;
    need(deliveryOrdinal === 1 || deliveryOrdinal === 2, 'DELIVERY_ORDINAL');
    const runId = idFromEnvironment(own(env, 'GITHUB_RUN_ID'));
    const runAttempt = idFromEnvironment(own(env, 'GITHUB_RUN_ATTEMPT'));
    const head = own(env, 'GITHUB_SHA');
    need(own(env, 'GITHUB_API_URL') === API && own(env, 'GITHUB_REPOSITORY') === REPOSITORY
      && own(env, 'GITHUB_REF') === REF && runId !== null && runAttempt !== null
      && matches(head, SHA1), 'CONTEXT');
    need(canonicalPagesUrl(own(options, 'expectedBaseUrl')) !== null, 'PAGE_BASE');
    need(closedRecord(seal, SEAL_FIELDS)
      && seal.schemaVersion === 'ravscore-operational-pages-artifact-seal-v1'
      && seal.repository === REPOSITORY && seal.ref === REF && seal.runId === runId
      && seal.runAttempt === runAttempt && seal.headSha === head && seal.privatePayloadIncluded === false
      && positive(seal.artifactId) && positive(seal.artifactSizeBytes)
      && matches(seal.artifactDigestSha256, SHA256)
      && matches(seal.targetPublicManifestSha256, SHA256)
      && matches(seal.targetImplementationClosureSha256, SHA256)
      && validBinding(seal.targetModelBinding)
      && typeof seal.createdAt === 'string' && canonicalDate(seal.createdAt) === seal.createdAt, 'SEAL');
    const ordinary = seal.artifactName === 'github-pages' && seal.attemptId === `pages-${runId}-${runAttempt}`;
    const recovery = seal.artifactName === `github-pages-preactivation-${runId}-${runAttempt}`
      && seal.attemptId === `pages-recovery-${runId}-${runAttempt}`;
    need(ordinary || recovery, 'ATTEMPT');
    const workflowRun = own(artifact, 'workflow_run');
    const repositoryIdRaw = own(env, 'GITHUB_REPOSITORY_ID');
    const repositoryId = idFromEnvironment(repositoryIdRaw);
    need(own(artifact, 'id') === seal.artifactId && own(artifact, 'name') === seal.artifactName
      && own(artifact, 'digest') === 'sha256:' + seal.artifactDigestSha256
      && own(artifact, 'size_in_bytes') === seal.artifactSizeBytes && own(artifact, 'expired') === false
      && own(workflowRun, 'id') === runId && own(workflowRun, 'head_sha') === head
      && own(workflowRun, 'head_branch') === 'main'
      && (repositoryIdRaw === undefined || (repositoryId !== null
        && own(workflowRun, 'repository_id') === repositoryId
        && own(workflowRun, 'head_repository_id') === repositoryId))
      && (own(artifact, 'created_at') === undefined || canonicalDate(own(artifact, 'created_at')) === seal.createdAt),
    'ARTIFACT');
    need(typeof oidc === 'string' && oidc.length <= 32768 && TOKEN_FORMAT.test(oidc), 'OIDC_FORMAT');

    // Closed local intent distinguishes run/attempt/artifact/ordinal.
    // GitHub receives the actual source commit, as in actions/deploy-pages.
    // The full client intent remains local; a shared SHA alias is not artifact identity.
    const identity = [DOMAIN, CREATE_URL, REF, runId, runAttempt, deliveryOrdinal, head, seal.attemptId,
      seal.artifactId, seal.artifactName, seal.artifactDigestSha256, seal.artifactSizeBytes,
      seal.targetPublicManifestSha256, seal.targetImplementationClosureSha256];
    const clientIntentSha256 = createHash('sha256').update(JSON.stringify(identity)).digest('hex');
    const buildVersion = head;
    const request = Object.freeze({
      method: 'POST', url: CREATE_URL, buildVersion, clientIntentSha256,
      statusUrl: CREATE_URL + '/' + buildVersion, artifactId: seal.artifactId, deliveryOrdinal,
    });
    requests.set(request, { oidc, bodyTaken: false, admitted: false });
    return request;
  } catch (error) {
    const reason = identityFailures.get(error);
    fail('PAGES_CREATE_REQUEST_' + (requestReasons.has(reason) ? reason : 'UNPROVED'));
  }
}

/** Extract once into the transport's in-memory request body. Never log it. */
export function takePagesDeploymentRequestBody(request) {
  const state = requests.get(request);
  need(state && !state.bodyTaken, 'PAGES_CREATE_BODY_UNAVAILABLE');
  const oidc = state.oidc;
  state.oidc = undefined;
  state.bodyTaken = true;
  return JSON.stringify({
    artifact_id: request.artifactId, pages_build_version: request.buildVersion, oidc_token: oidc,
  });
}

/**
 * `url` is the actual, unredirected HTTP response URL, not a reconstructed URL
 * for an unknown response. A good create receipt is not Pages/public success.
 */
function actualDeploymentId(value) {
  if (typeof value === 'number') return positive(value) ? String(value) : null;
  return matches(value, SAFE_ID) ? value : null;
}

export function admitPagesCreateResponse(response, request) {
  try {
    const state = requests.get(request), data = own(response, 'data');
    need(state?.bodyTaken && !state.admitted, 'CREATE_STATE');
    const status = own(response, 'status');
    if (status !== 200) fail('PAGES_CREATE_HTTP_' + (Number.isInteger(status) && status >= 100 && status <= 599 ? status : 'UNKNOWN'));
    need(own(response, 'url') === request.url, 'CREATE_ROUTE');
    need(remoteRecord(data, ['id', 'page_url']), 'CREATE_SCHEMA');
    const id = actualDeploymentId(data.id);
    need(id !== null, 'CREATE_ID');
    const pageUrl = canonicalPagesUrl(data.page_url);
    need(pageUrl !== null, 'CREATE_PAGE_URL');
    const conflict = remoteMetadataConflict(data, { deploymentId: id, buildVersion: request.buildVersion,
      artifactId: request.artifactId, pageUrl });
    need(conflict === null, 'CREATE_' + conflict);
    need(!Object.hasOwn(data, 'status') || data.status === 'succeed'
      || PENDING.has(data.status) || FAILURE.has(data.status), 'CREATE_STATUS_VALUE');
    // Preview metadata never grants another network destination.
    need(!Object.hasOwn(data, 'preview_url') || data.preview_url === ''
      || (typeof data.preview_url === 'string' && data.preview_url.length <= 2048
        && /^https:\/\/[^\s]+$/.test(data.preview_url)), 'CREATE_PREVIEW_URL');
    const statusUrl = CREATE_URL + '/' + encodeURIComponent(id);
    const legacy = API + '/repos/' + REPOSITORY + '/pages/deployment/status/' + encodeURIComponent(id);
    need(!Object.hasOwn(data, 'status_url') || data.status_url === statusUrl
      || data.status_url === statusUrl + '/status' || data.status_url === legacy, 'CREATE_STATUS_URL');
    const receipt = Object.freeze({ deploymentId: id, pageUrl, statusUrl });
    receipts.set(receipt, { artifactId: request.artifactId, buildVersion: request.buildVersion });
    state.admitted = true;
    return receipt;
  } catch (error) {
    const reason = identityFailures.get(error);
    fail(typeof reason === 'string' && reason.startsWith('PAGES_CREATE_')
      ? reason : 'PAGES_CREATE_RESPONSE_' + (reason ?? 'UNPROVED'));
  }
}

// The SHA route is an API lookup alias, never a physical-artifact identity.
// Empty/404 replies supply no qualified absence or retry authority.
export function classifyPagesPriorStatus(response, request) {
  const unknown = code => Object.freeze({ outcome: 'UNKNOWN', code });
  if (!requests.has(request) || own(response, 'url') !== request.statusUrl)
    return unknown('PRIOR_STATUS_ROUTE_UNPROVED');
  if (own(response, 'status') === 404) return unknown('PRIOR_STATUS_ABSENCE_UNQUALIFIED');
  if (own(response, 'status') !== 200) {
    const status = own(response, 'status');
    return unknown('PRIOR_STATUS_HTTP_' + (Number.isInteger(status) && status >= 100 && status <= 599 ? status : 'UNKNOWN'));
  }
  const data = own(response, 'data');
  if (data && Object.getPrototypeOf(data) === Object.prototype && Reflect.ownKeys(data).length === 0)
    return unknown('PRIOR_STATUS_EMPTY_UNQUALIFIED');
  if (!remoteRecord(data, ['status'])) return unknown('PRIOR_STATUS_BODY_UNPROVED');
  // A prior SHA alias can belong to another artifact. Validate consistency,
  // never invent a match to the new physical artifact or a CREATE receipt.
  const conflict = remoteMetadataConflict(data, { buildVersion: request.buildVersion });
  if (conflict) return unknown('PRIOR_STATUS_' + conflict + '_UNPROVED');
  if (Object.hasOwn(data, 'pages_build_version') && data.pages_build_version !== request.buildVersion)
    return unknown('PRIOR_STATUS_ID_UNPROVED');
  // GitHub's status lookup also returns this exact empty singleton for an
  // empty build alias. It proves neither absence nor ownership: admission
  // still requires the unique intent, protected reservation and CREATE ACK.
  if (data.status === '' && Reflect.ownKeys(data).length === 1)
    return unknown('PRIOR_STATUS_EMPTY_UNQUALIFIED');
  if (PENDING.has(data.status)) return Object.freeze({ outcome: 'PENDING', code: data.status });
  if (['succeed', 'deployment_failed', 'deployment_content_failed', 'deployment_cancelled'].includes(data.status))
    return Object.freeze({ outcome: 'CLOSED', code: data.status });
  return unknown('PRIOR_STATUS_VALUE_UNPROVED');
}

/** Pure classification only. The caller owns a bounded deadline and GETs. */
export function classifyPagesStatus(response, receipt) {
  const decision = (outcome, code) => Object.freeze({ outcome, code });
  try {
    if (!receipts.has(receipt) || own(response, 'url') !== receipt.statusUrl)
      return decision('UNKNOWN', 'STATUS_ROUTE_UNPROVED');
    if (own(response, 'status') !== 200) {
      const status = own(response, 'status');
      return decision('UNKNOWN', 'STATUS_HTTP_' + (Number.isInteger(status) && status >= 100 && status <= 599 ? status : 'UNKNOWN'));
    }
    const data = own(response, 'data');
    if (!remoteRecord(data, ['status'])) return decision('UNKNOWN', 'STATUS_BODY_UNPROVED');
    const conflict = remoteMetadataConflict(data, { deploymentId: receipt.deploymentId,
      buildVersion: receipts.get(receipt).buildVersion, artifactId: receipts.get(receipt).artifactId, pageUrl: receipt.pageUrl });
    if (conflict) return decision('UNKNOWN', 'STATUS_' + conflict + '_UNPROVED');
    for (const key of ['id', 'deployment_id'])
      if (Object.hasOwn(data, key) && actualDeploymentId(data[key]) !== receipt.deploymentId)
        return decision('UNKNOWN', 'STATUS_ID_UNPROVED');
    if (Object.hasOwn(data, 'pages_build_version') && data.pages_build_version !== receipts.get(receipt).buildVersion)
      return decision('UNKNOWN', 'STATUS_BUILD_VERSION_UNPROVED');
    if (Object.hasOwn(data, 'artifact_id') && data.artifact_id !== receipts.get(receipt).artifactId)
      return decision('UNKNOWN', 'STATUS_ARTIFACT_UNPROVED');
    if (data.status === 'succeed') return decision('SUCCEEDED', 'succeed');
    if (FAILURE.has(data.status)) return decision('FAILED', data.status);
    if (PENDING.has(data.status)) return decision('PENDING', data.status);
    return decision('UNKNOWN', 'STATUS_VALUE_UNPROVED');
  } catch {
    return decision('UNKNOWN', 'STATUS_RESPONSE_UNPROVED');
  }
}

// Retain only already validated status/identity evidence, never additive metadata.
export function projectPagesStatusData(response, receipt) {
  need(classifyPagesStatus(response, receipt).outcome !== 'UNKNOWN', 'PAGES_STATUS_EVIDENCE_UNPROVED');
  const data = own(response, 'data');
  return Object.freeze(Object.fromEntries(STATUS_FIELDS.filter(key => Object.hasOwn(data, key))
    .map(key => [key, own(data, key)])));
}
