import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { deployTripWorker } from './lib/trip-worker-deploy-process.mjs';
import { ravScoreModelBinding, assertRavScoreModelBinding } from '../js/core/ravscore-model-contract.js';
import { selectPublicRuntimeAvailability } from '../js/core/ravscore-public-runtime-contract.js';
import { FORECAST_SHARE_BASE_URL } from '../js/services/forecast-share-contract.js';

export const FORECAST_SHARE_WORKER = 'ravradar-prognosedeling';
export const FORECAST_SHARE_CONFIG = 'scripts/forecast-share/wrangler.jsonc';
const REPOSITORY = 'jakobjorgensen82-commits/RavRadar';
const PUBLIC_MANIFEST = 'https://ravradar.dk/data/live/manifest.json';
const UUID = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/;
const SHA = /^[a-f0-9]{40}$/;
export const FORECAST_SHARE_READ_KINDS = Object.freeze([
  'GH_MAIN', 'CF_SCRIPTS', 'CF_DEPLOYMENTS', 'CF_VERSION', 'CF_ROUTES',
  'CF_DOMAINS', 'CF_CRON', 'CF_SCRIPT_SUBDOMAIN', 'CF_ACCOUNT_SUBDOMAIN', 'PUBLIC_MANIFEST',
]);
const fail = code => Object.assign(new Error(code), { code });
const empty = (value, code) => { if (!Array.isArray(value) || value.length !== 0) throw fail(code); };

export function assertForecastShareConfiguration(config) {
  assert.deepEqual(config, {
    name: FORECAST_SHARE_WORKER,
    main: 'worker.mjs',
    compatibility_date: '2026-10-24',
    workers_dev: true,
    preview_urls: false,
  }, 'Only the fixed binding-free, asset-free share Worker configuration');
  assert.equal(FORECAST_SHARE_BASE_URL,
    'https://ravradar-prognosedeling.jakob-jorgensen82.workers.dev/');
  return config;
}

export function assertForecastShareAuthority(env) {
  if (env.GITHUB_REPOSITORY !== REPOSITORY || env.GITHUB_EVENT_NAME !== 'workflow_dispatch'
    || env.GITHUB_REF !== 'refs/heads/main' || env.GITHUB_RUN_ATTEMPT !== '1'
    || !/^[1-9][0-9]*$/.test(env.GITHUB_RUN_ID ?? '')
    || !SHA.test(env.EXPECTED_MAIN ?? '') || env.GITHUB_SHA !== env.EXPECTED_MAIN
    || env.SHARE_CONFIRMATION !== 'DEPLOY-FORECAST-SHARE'
    || env.SOURCE_REQUIRED !== 'false'
    || !/^[a-f0-9]{32}$/.test(env.CLOUDFLARE_ACCOUNT_ID ?? '')
    || !env.CLOUDFLARE_API_TOKEN || !env.GITHUB_TOKEN) throw fail('SHARE_AUTHORITY');
}

export function activeForecastShareDeployment(result, expectedVersion = null) {
  const deployments = result?.deployments;
  if (!Array.isArray(deployments) || deployments.length < 1) throw fail('SHARE_DEPLOYMENT_UNKNOWN');
  const latest = deployments[0]; // The documented API order is newest first.
  if (!UUID.test(latest?.id ?? '') || latest.strategy !== 'percentage'
    || !Array.isArray(latest.versions) || latest.versions.length !== 1
    || latest.versions[0].percentage !== 100
    || !UUID.test(latest.versions[0].version_id ?? '')
    || (expectedVersion !== null && latest.versions[0].version_id !== expectedVersion)) {
    throw fail('SHARE_DEPLOYMENT_UNKNOWN');
  }
  return { deploymentId: latest.id, versionId: latest.versions[0].version_id };
}

export function forecastShareVersionFromDeploy(output) {
  const versions = [...String(output).matchAll(/^Current Version ID:\s*([a-f0-9-]+)\s*$/gim)];
  if (versions.length !== 1 || !UUID.test(versions[0][1])) throw fail('SHARE_DEPLOY_VERSION_UNKNOWN');
  return versions[0][1];
}

export function assertForecastShareRemoteShape({ script, version, routes, domains, schedules, subdomain }, versionId) {
  if (script?.id !== FORECAST_SHARE_WORKER) throw fail('SHARE_REMOTE_SCRIPT');
  if (script.has_assets !== false) throw fail('SHARE_REMOTE_ASSETS');
  if (script.has_modules !== true) throw fail('SHARE_REMOTE_MODULES');
  if (version?.id !== versionId) throw fail('SHARE_REMOTE_VERSION');
  empty(version.resources?.bindings, 'SHARE_REMOTE_BINDINGS');
  empty(routes, 'SHARE_REMOTE_ROUTES');
  empty(domains, 'SHARE_REMOTE_DOMAINS');
  empty(schedules?.schedules, 'SHARE_REMOTE_CRON');
  if (subdomain?.enabled !== true || subdomain.previews_enabled !== false) throw fail('SHARE_REMOTE_SUBDOMAIN');
}

// Every request is a bounded read, with no retry and no URL/body/message in errors.
export async function readForecastShareJson(url, headers, fetchImpl, readKind) {
  if (!FORECAST_SHARE_READ_KINDS.includes(readKind)) throw fail('SHARE_READ_KIND');
  let httpStatus = null;
  try {
    const response = await fetchImpl(url, {
      method: 'GET', headers, redirect: 'error', cache: 'no-store',
      signal: AbortSignal.timeout(30_000),
    });
    httpStatus = Number.isInteger(response.status) && response.status >= 100 && response.status <= 599
      ? response.status : null;
    if (!response.ok || !response.body) throw fail('SHARE_READ_FAILED');
    const limit = 2 * 1024 * 1024;
    const length = response.headers.get('content-length');
    if (length !== null && (!/^[0-9]+$/.test(length) || Number(length) > limit)) {
      await response.body.cancel(); throw fail('SHARE_READ_BOUND');
    }
    const reader = response.body.getReader(); const chunks = []; let size = 0;
    try {
      while (true) {
        const item = await reader.read(); if (item.done) break;
        size += item.value.byteLength;
        if (size > limit) { await reader.cancel(); throw fail('SHARE_READ_BOUND'); }
        chunks.push(Buffer.from(item.value));
      }
    } finally { reader.releaseLock(); }
    try { return { value: JSON.parse(Buffer.concat(chunks).toString('utf8')), readKind, httpStatus }; }
    catch { throw fail('SHARE_READ_JSON'); }
  } catch (error) {
    const code = ['SHARE_READ_FAILED', 'SHARE_READ_BOUND', 'SHARE_READ_JSON'].includes(error?.code)
      ? error.code : 'SHARE_READ_FAILED';
    throw Object.assign(fail(code), { readKind, httpStatus });
  }
}

function assertCompleteList(envelope) {
  if (!Array.isArray(envelope.result)) throw fail('SHARE_LIST_UNKNOWN');
  const info = envelope.result_info;
  if (info && ((info.total_count !== undefined && info.total_count !== envelope.result.length)
    || (info.total_pages !== undefined && info.total_pages > 1)
    || (info.page !== undefined && info.page !== 1))) throw fail('SHARE_LIST_INCOMPLETE');
  return envelope.result;
}

// The documented unfiltered endpoint returns the account's complete SinglePage.
// Classify every row before ignoring a different service. Any domain attached to
// this exact Worker, including another environment, remains forbidden.
export function forecastShareDomainsForWorker(envelope) {
  // Målt kompatibilitet på dette ene endpoint; ikke et dokumenteret null-schema.
  // Resten af den fulde liste-/række-/servicekontrol nedenfor er uændret.
  if (!envelope || typeof envelope !== 'object' || Array.isArray(envelope)
    || envelope.success !== true || !Object.hasOwn(envelope, 'errors')
    || !(envelope.errors === null || Array.isArray(envelope.errors) && envelope.errors.length === 0)) {
    throw fail('SHARE_CF_READ');
  }
  const domains = assertCompleteList(envelope);
  const info = envelope.result_info;
  if (info !== undefined) {
    const fields = ['count', 'page', 'per_page', 'total_count', 'total_pages'];
    if (!info || typeof info !== 'object' || Array.isArray(info)
      || Object.entries(info).some(([key, value]) => !fields.includes(key)
        || !Number.isSafeInteger(value) || value < 0)
      || (info.count !== undefined && info.count !== domains.length)
      || (info.per_page !== undefined && info.per_page < domains.length)
      || (info.total_pages === 0 && domains.length !== 0)) throw fail('SHARE_LIST_INCOMPLETE');
  }
  const ids = new Set();
  for (const domain of domains) {
    if (!domain || typeof domain !== 'object' || Array.isArray(domain)
      || typeof domain.id !== 'string' || !domain.id.trim() || ids.has(domain.id)
      || typeof domain.service !== 'string' || !domain.service.trim()
      || domain.service !== domain.service.trim() || /[\u0000-\u0020\u007f]/.test(domain.service)
      || typeof domain.environment !== 'string'
      || typeof domain.hostname !== 'string' || !domain.hostname.trim()) {
      throw fail('SHARE_DOMAIN_UNKNOWN');
    }
    ids.add(domain.id);
  }
  return domains.filter(domain => domain.service === FORECAST_SHARE_WORKER);
}

// Only fixed categories and at most eight seven-digit numeric provider codes.
// The caller receives a new closed object; no message, source, result or account
// field is copied, and no unknown value is coerced to a string or number.
export function forecastShareCfEnvelopeDiagnostic(value) {
  const object = value !== null && typeof value === 'object' && !Array.isArray(value);
  const fieldType = key => {
    if (!object) return 'UNKNOWN';
    if (!Object.hasOwn(value, key)) return 'ABSENT';
    const field = value[key];
    if (field === null) return 'NULL';
    if (Array.isArray(field)) return 'ARRAY';
    switch (typeof field) {
      case 'object': return 'OBJECT';
      case 'string': return 'STRING';
      case 'number': return 'NUMBER';
      case 'boolean': return 'BOOLEAN';
      default: return 'UNKNOWN';
    }
  };
  const errors = object && Array.isArray(value.errors) ? value.errors : null;
  const errorCodes = [];
  let errorCodesStatus = errors === null ? 'UNKNOWN' : errors.length > 8 ? 'LIMITED' : 'COMPLETE';
  for (let index = 0; errors !== null && index < Math.min(errors.length, 8); index++) {
    const entry = errors[index];
    const code = entry !== null && typeof entry === 'object' && !Array.isArray(entry) ? entry.code : null;
    if (Number.isSafeInteger(code) && code >= 1000 && code <= 9_999_999) errorCodes.push(code);
    else errorCodesStatus = 'UNKNOWN';
  }
  return {
    kind: 'FORECAST_SHARE_CF_ENVELOPE_V1',
    envelope: object ? 'OBJECT' : 'UNKNOWN',
    success: object && value.success === true ? 'TRUE'
      : object && value.success === false ? 'FALSE' : 'UNKNOWN',
    errors: errors === null ? 'UNKNOWN' : errors.length ? 'NONEMPTY' : 'EMPTY',
    errorsType: fieldType('errors'), resultType: fieldType('result'),
    errorCodes, errorCodesStatus,
  };
}

export async function deployForecastShare({ env = process.env, fetchImpl = globalThis.fetch,
  deployImpl = deployTripWorker, git = args => execFileSync('git', args, { encoding: 'utf8' }).trim(),
  now = () => Date.now(), report = () => {} } = {}) {
  let stage = 'AUTHORITY', writeIssued = false, terminationConfirmed = null;
  let expectedMain, active = null, cfEnvelopeDiagnostic = null;
  try {
    assertForecastShareAuthority(env);
    expectedMain = env.EXPECTED_MAIN;
    const configPath = path.resolve(FORECAST_SHARE_CONFIG);
    const configuration = assertForecastShareConfiguration(JSON.parse(fs.readFileSync(configPath, 'utf8')));
    if (fs.lstatSync(configPath).isSymbolicLink()
      || fs.lstatSync(path.resolve('scripts/forecast-share/worker.mjs')).isSymbolicLink()) {
      throw fail('SHARE_LOCAL_PATH');
    }
    const localMain = () => {
      if (git(['rev-parse', 'HEAD^{commit}']) !== expectedMain
        || git(['status', '--porcelain', '--untracked-files=no']) !== '') throw fail('SHARE_LOCAL_MAIN');
    };
    const github = { Authorization: 'Bearer ' + env.GITHUB_TOKEN,
      Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28' };
    const freshMain = async () => {
      localMain();
      const { value: main } = await readForecastShareJson(
        'https://api.github.com/repos/' + REPOSITORY + '/git/ref/heads/main', github, fetchImpl, 'GH_MAIN');
      if (main.ref !== 'refs/heads/main' || main.object?.type !== 'commit'
        || main.object.sha !== expectedMain) throw fail('SHARE_MAIN_MOVED');
    };
    const cfBase = 'https://api.cloudflare.com/client/v4/accounts/' + env.CLOUDFLARE_ACCOUNT_ID;
    const cfHeaders = { Authorization: 'Bearer ' + env.CLOUDFLARE_API_TOKEN, Accept: 'application/json' };
    const readStatuses = new Map();
    const cf = async (suffix, readKind) => {
      const observed = await readForecastShareJson(cfBase + suffix, cfHeaders, fetchImpl, readKind);
      const data = observed.value;
      readStatuses.set(readKind, observed.httpStatus);
      const measuredNullDomains = suffix === '/workers/domains' && readKind === 'CF_DOMAINS'
        && data !== null && typeof data === 'object' && !Array.isArray(data)
        && data.success === true && Object.hasOwn(data, 'errors') && data.errors === null;
      if (measuredNullDomains) {
        // Ingen null→[]-normalisering: den oprindelige envelope bevares.
        // Ukendt/ufuldstændig liste, ukendt domænerække eller eget Worker-domæne
        // afvises her før den generelle CF-læser kan give svaret videre.
        try { empty(forecastShareDomainsForWorker(data), 'SHARE_REMOTE_DOMAINS'); }
        catch (error) {
          throw Object.assign(error, { readKind, httpStatus: observed.httpStatus });
        }
      } else if (data?.success !== true || !Array.isArray(data.errors) || data.errors.length) {
        cfEnvelopeDiagnostic = forecastShareCfEnvelopeDiagnostic(data);
        throw Object.assign(fail('SHARE_CF_READ'), { readKind, httpStatus: observed.httpStatus });
      }
      return data;
    };
    const readDomains = async () => {
      const envelope = await cf('/workers/domains', 'CF_DOMAINS');
      try { return forecastShareDomainsForWorker(envelope); }
      catch (error) {
        throw Object.assign(error, { readKind: 'CF_DOMAINS',
          httpStatus: readStatuses.get('CF_DOMAINS') ?? null });
      }
    };
    const scriptBase = '/workers/scripts/' + FORECAST_SHARE_WORKER;
    const remote = async (expectedVersion = null, allowAbsent = false) => {
      const scripts = assertCompleteList(await cf('/workers/scripts', 'CF_SCRIPTS'));
      const selected = scripts.filter(item => item?.id === FORECAST_SHARE_WORKER);
      if (!selected.length && allowAbsent) {
        // Do not query a service that has not been created; classify the account list.
        empty(await readDomains(), 'SHARE_REMOTE_DOMAINS');
        return null;
      }
      if (selected.length !== 1) throw fail('SHARE_REMOTE_SCRIPT');
      const deployment = activeForecastShareDeployment((await cf(scriptBase + '/deployments', 'CF_DEPLOYMENTS')).result, expectedVersion);
      const version = (await cf(scriptBase + '/versions/' + deployment.versionId, 'CF_VERSION')).result;
      // This exact service route endpoint is also used by pinned Wrangler 4.28.1 getWorkerConfig.
      const routes = assertCompleteList(await cf('/workers/services/' + FORECAST_SHARE_WORKER
        + '/environments/production/routes?show_zonename=true', 'CF_ROUTES'));
      const domains = await readDomains();
      const schedules = (await cf(scriptBase + '/schedules', 'CF_CRON')).result;
      const subdomain = (await cf(scriptBase + '/subdomain', 'CF_SCRIPT_SUBDOMAIN')).result;
      try {
        assertForecastShareRemoteShape({ script: selected[0], version, routes, domains, schedules, subdomain },
          deployment.versionId);
      } catch (error) {
        const readKind = {
          SHARE_REMOTE_SCRIPT: 'CF_SCRIPTS', SHARE_REMOTE_ASSETS: 'CF_SCRIPTS',
          SHARE_REMOTE_MODULES: 'CF_SCRIPTS', SHARE_REMOTE_VERSION: 'CF_VERSION',
          SHARE_REMOTE_BINDINGS: 'CF_VERSION', SHARE_REMOTE_ROUTES: 'CF_ROUTES',
          SHARE_REMOTE_DOMAINS: 'CF_DOMAINS', SHARE_REMOTE_CRON: 'CF_CRON',
          SHARE_REMOTE_SUBDOMAIN: 'CF_SCRIPT_SUBDOMAIN',
        }[error?.code];
        if (readKind) Object.assign(error, { readKind, httpStatus: readStatuses.get(readKind) ?? null });
        throw error;
      }
      const again = activeForecastShareDeployment((await cf(scriptBase + '/deployments', 'CF_DEPLOYMENTS')).result, deployment.versionId);
      if (again.deploymentId !== deployment.deploymentId) throw fail('SHARE_REMOTE_CHANGED');
      return deployment;
    };
    stage = 'PREWRITE_READS';
    await freshMain();
    const accountSubdomain = (await cf('/workers/subdomain', 'CF_ACCOUNT_SUBDOMAIN')).result;
    if (accountSubdomain?.subdomain !== 'jakob-jorgensen82') throw fail('SHARE_ACCOUNT_SUBDOMAIN');
    await remote(null, true); // Existing resources are never silently removed or repurposed.
    const { value: manifest } = await readForecastShareJson(
      PUBLIC_MANIFEST, { Accept: 'application/json' }, fetchImpl, 'PUBLIC_MANIFEST');
    if (manifest.schemaVersion !== 4) throw fail('SHARE_PUBLIC_SCHEMA');
    assertRavScoreModelBinding(manifest.ravScoreModelBinding);
    selectPublicRuntimeAvailability(manifest, { modelBinding: ravScoreModelBinding(), now: now() });
    await freshMain(); // Immediately before the only write; production queue remains held.
    assertForecastShareConfiguration(JSON.parse(fs.readFileSync(configPath, 'utf8')));
    stage = 'DEPLOY'; writeIssued = true; terminationConfirmed = false;
    report({ stage, writeIssued, terminationConfirmed, sourceSha: expectedMain });
    let deployed;
    try {
      deployed = await deployImpl({ configPath, env: { ...env, CI: 'true', WRANGLER_SEND_METRICS: 'false' } });
      terminationConfirmed = deployed?.terminationConfirmed === true;
    } catch (error) { terminationConfirmed = error?.terminationConfirmed === true; throw fail('SHARE_DEPLOY_FAILED'); }
    if (!terminationConfirmed) throw fail('SHARE_DEPLOY_STOP_UNKNOWN');
    const versionId = forecastShareVersionFromDeploy(deployed.stdout);
    stage = 'DEPLOY_RECEIPT';
    report({ kind: 'FORECAST_SHARE_DEPLOY_RECEIPT_V1', stage, versionId,
      sourceSha: expectedMain, terminationConfirmed });
    stage = 'POSTWRITE_READBACK';
    active = await remote(versionId);
    await freshMain();
    stage = 'COMPLETE';
    const receipt = { kind: 'FORECAST_SHARE_RELEASE_READBACK_V1', stage, sourceSha: expectedMain,
      workerName: configuration.name, publicDatasetId: manifest.datasetId,
      publicModelBinding: ravScoreModelBinding(), ...active, writeIssued, terminationConfirmed,
      bindings: 0, assets: false, routes: 0, customDomains: 0, cron: 0,
      hostedPreviewProved: false, freeCapacityProved: false };
    report(receipt); return receipt;
  } catch (error) {
    const receipt = { kind: 'FORECAST_SHARE_RELEASE_STOP_V1', stage, sourceSha: expectedMain ?? null,
      code: /^SHARE_[A-Z_]+$/.test(error?.code ?? '') ? error.code : 'SHARE_VALIDATION_OR_TRANSPORT',
      readKind: FORECAST_SHARE_READ_KINDS.includes(error?.readKind) ? error.readKind : null,
      httpStatus: Number.isInteger(error?.httpStatus) && error.httpStatus >= 100 && error.httpStatus <= 599
        ? error.httpStatus : null,
      ...(error?.code === 'SHARE_CF_READ' ? { cfEnvelope: cfEnvelopeDiagnostic
        ?? forecastShareCfEnvelopeDiagnostic(null) } : {}),
      writeIssued, terminationConfirmed, outcome: writeIssued ? 'UNKNOWN_NO_RETRY' : 'REFUSED_BEFORE_WRITE' };
    report(receipt); throw Object.assign(fail(receipt.outcome), { receipt });
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  // One run-owned receipt. A pre-existing file is a refusal, not permission to repeat a write.
  let descriptor;
  try {
    if (process.argv.length !== 2) throw fail('SHARE_ARGUMENTS');
    fs.mkdirSync('.cache', { recursive: true });
    descriptor = fs.openSync('.cache/forecast-share-release.jsonl', 'wx', 0o600);
    const report = value => { fs.writeSync(descriptor, JSON.stringify(value) + '\n'); fs.fsyncSync(descriptor); };
    await deployForecastShare({ report });
    console.log('Prognosedeling: præcis Worker/version genlæst; hosted preview og Free-kapacitet er særskilt åbne.');
  } catch (error) {
    console.error('Prognosedeling stoppet; ingen automatisk gentagelse. Udfald: '
      + (error?.receipt?.outcome ?? 'REFUSED_BEFORE_WRITE'));
    process.exitCode = 1;
  } finally { if (descriptor !== undefined) fs.closeSync(descriptor); }
}
