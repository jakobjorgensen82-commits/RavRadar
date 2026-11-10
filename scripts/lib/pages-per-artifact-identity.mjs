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
const CREATE_FIELDS = ['id', 'page_url', 'status_url'];
const STATUS_FIELDS = ['status', 'id', 'deployment_id', 'pages_build_version', 'artifact_id'];
const FAILURE = new Set([
  'deployment_failed', 'deployment_content_failed', 'deployment_cancelled', 'deployment_lost',
]);
const PENDING = new Set([
  'deployment_queued', 'deployment_in_progress', 'deployment_working', 'syncing_files',
]);
const requests = new WeakMap();
const receipts = new WeakMap();

const fail = code => { throw new Error(code); };
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
  for (const base of [PROJECT_PAGES, CUSTOM_PAGES])
    if (value === base || value === base + '/') return base + '/';
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

    // Closed ordered tuple: distinguish source, run/attempt and physical
    // package without changing GITHUB_SHA or borrowing the old SHA route.
    const identity = [DOMAIN, CREATE_URL, REF, runId, runAttempt, deliveryOrdinal, head, seal.attemptId,
      seal.artifactId, seal.artifactName, seal.artifactDigestSha256, seal.artifactSizeBytes,
      seal.targetPublicManifestSha256, seal.targetImplementationClosureSha256];
    const buildVersion = createHash('sha256').update(JSON.stringify(identity)).digest('hex').slice(0, 40);
    need(buildVersion !== head, 'VERSION_COLLISION');
    const request = Object.freeze({
      method: 'POST', url: CREATE_URL, buildVersion,
      statusUrl: CREATE_URL + '/' + buildVersion, artifactId: seal.artifactId, deliveryOrdinal,
    });
    requests.set(request, { oidc, bodyTaken: false, admitted: false });
    return request;
  } catch {
    // Never echo raw inputs, parser errors, getters, credentials or responses.
    fail('PAGES_CREATE_REQUEST_REFUSED');
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
export function admitPagesCreateResponse(response, request) {
  try {
    const state = requests.get(request), data = own(response, 'data');
    need(state?.bodyTaken && !state.admitted && own(response, 'status') === 200
      && own(response, 'url') === request.url
      && closedRecord(data, CREATE_FIELDS, ['id', 'page_url'])
      && data.id === request.buildVersion, 'CREATE_ID');
    const pageUrl = canonicalPagesUrl(data.page_url);
    need(pageUrl !== null, 'CREATE_PAGE_URL');
    // The REST docs' create example uses /status in this optional field.
    // Validate it, but poll only the documented GET route below.
    need(!Object.hasOwn(data, 'status_url') || data.status_url === request.statusUrl
      || data.status_url === request.statusUrl + '/status', 'CREATE_STATUS_URL');
    const receipt = Object.freeze({
      deploymentId: request.buildVersion, pageUrl, statusUrl: request.statusUrl,
    });
    receipts.set(receipt, request.artifactId);
    state.admitted = true;
    return receipt;
  } catch {
    fail('PAGES_CREATE_RESPONSE_UNPROVED');
  }
}

/** Pure classification only. The caller owns a bounded deadline and GETs. */
export function classifyPagesStatus(response, receipt) {
  const decision = (outcome, code) => Object.freeze({ outcome, code });
  try {
    if (!receipts.has(receipt) || own(response, 'url') !== receipt.statusUrl)
      return decision('UNKNOWN', 'STATUS_ROUTE_UNPROVED');
    if (own(response, 'status') !== 200) return decision('UNKNOWN', 'STATUS_HTTP_UNPROVED');
    const data = own(response, 'data');
    if (!closedRecord(data, STATUS_FIELDS, ['status'])) return decision('UNKNOWN', 'STATUS_BODY_UNPROVED');
    for (const key of ['id', 'deployment_id', 'pages_build_version'])
      if (Object.hasOwn(data, key) && data[key] !== receipt.deploymentId)
        return decision('UNKNOWN', 'STATUS_ID_UNPROVED');
    if (Object.hasOwn(data, 'artifact_id') && data.artifact_id !== receipts.get(receipt))
      return decision('UNKNOWN', 'STATUS_ARTIFACT_UNPROVED');
    if (data.status === 'succeed') return decision('SUCCEEDED', 'succeed');
    if (FAILURE.has(data.status)) return decision('FAILED', data.status);
    if (PENDING.has(data.status)) return decision('PENDING', data.status);
    return decision('UNKNOWN', 'STATUS_VALUE_UNPROVED');
  } catch {
    return decision('UNKNOWN', 'STATUS_RESPONSE_UNPROVED');
  }
}
