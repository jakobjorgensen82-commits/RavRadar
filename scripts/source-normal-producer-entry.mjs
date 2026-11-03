// PRIVATE SOURCE ENTRY PREPARATION. No workflow/action selects this module yet.
// This ends at genuine, retained B/S + working-input admission. It does not
// acquire providers, issue a model/SQL family, publish a new B/public generation,
// or close an owner. Existing normal S reconciliation MAY repair central S.
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import { lstatSync, realpathSync, readFileSync } from 'node:fs';
import { requireSourceProducerOutput } from './lib/source-producer-successor-source.mjs';
import path from 'node:path';
import os from 'node:os';
import { performance } from 'node:perf_hooks';
import { execFileSync } from 'node:child_process';
import { isDeepStrictEqual as same } from 'node:util';
import { PRIVATE_RUNTIME_REPOSITORY_ROOT, restorePrivateProductionRuntimeBundle }
  from './private-production-runtime-bundle.mjs';
import { createProtectedPrivateRuntimeClients, describeCurrentProtectedPrivateProductionRuntime,
  describeTargetProtectedPrivateProductionRuntime, restoreProtectedPrivateProductionRuntime,
  protectedPrivateRuntimeRestoreVerification, validateProtectedPrivateRuntimePointer,
  PROTECTED_PRIVATE_RUNTIME_POLICY }
  from './protected-private-production-runtime.mjs';
import { buildPrivateRuntimeExpectation, installRestoredPrivateRuntime,
  privateRuntimeInstallationFiles, PRIVATE_RUNTIME_PRODUCER_SOURCE_FILES }
  from './private-production-runtime-workflow.mjs';
import { secondRestoreExpectation } from './private-runtime-second-restore-expectation.mjs';
import { assertSourcePrivateRuntimeCheckpointReconcileRequest,
  requiresPrivateRuntimeCheckpointReconcile, reconcileSourcePrivateRuntimeCheckpoint }
  from './reconcile-private-runtime-checkpoint.mjs';
import { readEstablishedNativeCurrentOrigin } from './lib/established-native-current-origin.mjs';
import { verifyIntegratedDatabaseReadback } from './integrated-cutover-readiness.mjs';
import { resolveOperationalRavScoreModel, operationalResolvedBindingCurrent,
  RAVSCORE_OPERATIONAL_ACTIVATION_DOCUMENT_KEY as OPERATION,
  RAVSCORE_PROFILE_SELECTION_DOCUMENT_KEY as PROFILE }
  from './ravscore-operational-activation.mjs';
import { decideSourceGate, SOURCE_GATE_CONTRACT, SOURCE_GATE_STEP } from './lib/weather-source-gate.mjs';
import { sourceTreeContentSha256 } from './lib/source-tree-content.mjs';
import { ownFileDescriptorIdentity }
  from './lib/private-weather-component-pack.mjs';

const ROOT = PRIVATE_RUNTIME_REPOSITORY_ROOT;
const SELF = 'scripts/source-normal-producer-entry.mjs';
const PRIVATE = '/tmp/ravradar-private-production-runtime';
const BUNDLE = path.join(PRIVATE, 'bundle'), RESTORED = path.join(PRIVATE, 'restored');
const CHECKPOINT = '.cache/ravscore-continuation-checkpoint/checkpoint.json';
const REGISTRY = 'data/live/coastal-parts-v2.json';
// The two existing normal main dispatch destinations share the exact reusable job.
// The actual GitHub run path is rechecked on every qualification.
const WORKFLOWS = Object.freeze(['.github/workflows/run-current-weather-once.yml',
  '.github/workflows/update-and-deploy.yml']);
const JOB = 'Build and prepare weather production through reusable workflow / build-and-prepare';
const sessions = new WeakMap(), tailSessions = new WeakMap(), retained = new Set();
let attempted = false;
const fail = code => { throw Object.assign(new Error('SOURCE_ENTRY_' + code), { code: 'SOURCE_ENTRY_' + code }); };
const need = (condition, code) => { if (!condition) fail(code); };
const hash = value => crypto.createHash('sha256').update(value).digest('hex');
const git = args => execFileSync('git', ['-C', ROOT, ...args],
  { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], maxBuffer: 16 * 1024 * 1024 }).trim();
const envKeys = ['GITHUB_ACTIONS', 'GITHUB_REPOSITORY', 'GITHUB_RUN_ID', 'GITHUB_RUN_ATTEMPT',
  'GITHUB_SHA', 'GITHUB_REF', 'GITHUB_EVENT_NAME', 'GITHUB_WORKSPACE', 'RUNNER_NAME', 'RUNNER_OS',
  'RUNNER_TRACKING_ID', 'INPUT_OPERATION', 'OPERATIONAL_ACTION', 'EXTENDED_PROVIDER_BOOTSTRAP',
  'RAVRADAR_PRODUCTION_TARGET_HOUR', 'RAVRADAR_PRIVATE_RUNTIME_ROOT',
  'RAVRADAR_PRIVATE_RUNTIME_BUNDLE', 'RAVRADAR_PRIVATE_RUNTIME_RESTORE',
  'COMPLETED_PRIVATE_RUNTIME', 'CHECKPOINT_ONLY', 'QUICK_CONFIRMATION',
  'RAVRADAR_WEATHER_STATE_EPOCH_BOOTSTRAP', 'RAVRADAR_WEATHER_STATE_EPOCH_CHECKPOINT_REENTRY',
  'NATIVE_IDENTITY_RECOVERY', 'CURRENT_FAMILY_COLD_START', 'PRODUCE_HANDOFF',
  'QUICK_PROGRESS_SOURCE', 'CHECKPOINT_TARGET_HOUR', 'INPUT_FORCE',
  'RAVRADAR_ARCHIVED_WEATHER_RESTART_CONTEXT_PATH', 'RAVRADAR_ARCHIVED_WEATHER_RESTART_CONTEXT_SHA256',
  'RAVRADAR_CURRENT_FAMILY_COLD_START_CONTEXT_PATH', 'RAVRADAR_CURRENT_FAMILY_COLD_START_CONTEXT_SHA256'];

// This branch can only select an entirely synthetic, owned native test world.
// It never issues a session/owner/SAVE/native receipt or production authority.
const sourcePrIdentities = new WeakMap(), sourcePrEnvironments = new WeakMap();
const prEnvironmentKeys = ['GITHUB_TOKEN','SUPABASE_URL','SUPABASE_SERVICE_ROLE_KEY','SUPABASE_PUBLISHABLE_KEY',
  'GH_TOKEN','SUPABASE_ACCESS_TOKEN','CLOUDFLARE_API_TOKEN','AWS_ACCESS_KEY_ID','DMI_STAC_ROOT','ACTIONS_RESULTS_URL',
  'ACTIONS_RUNTIME_TOKEN','RAVRADAR_PRIVATE_RUNTIME_STORAGE_BACKEND','NODE_USE_ENV_PROXY','HTTP_PROXY','HTTPS_PROXY',
  'NO_PROXY','NODE_EXTRA_CA_CERTS','SSL_CERT_FILE','REQUESTS_CA_BUNDLE','CURL_CA_BUNDLE','npm_config_offline',
  'WEATHER_PROGRESS_ENCRYPTION_KEY'];
const PR_CAPTURE = '.cache/source-pr-native-test-context.json';
const PR_WORKFLOW = '.github/workflows/validate-pull-request.yml';
const PR_JOB = 'Source validation and release gate';
const PR_SOURCE_STEP = 'Validate source contracts and release governance';
const PR_NATIVE_STEP = 'Validate native PostgreSQL checkpoint CAS on artificial data only';

function assertSyntheticPrDistributionWorld() {
  requireSourceProducerOutput(); // BEFORE paths, metadata, Git or a client.
  need(process.platform === 'linux' && process.versions.node.split('.')[0] === '24', 'PR_TEST_RUNTIME');
  const own = path.dirname(ROOT), temporaryParent = realpathSync(os.tmpdir());
  need(path.basename(ROOT) === 'current-source-native'
    && /^rr-source19-union-native-/.test(path.basename(own)) && path.dirname(own) === temporaryParent
    && process.cwd() === ROOT && process.env.GITHUB_WORKSPACE === ROOT, 'PR_TEST_OWNED_ROOT');
  need(process.getuid() === process.geteuid(), 'PR_TEST_OWNED_UID');
  const ownStat = lstatSync(own), rootStat = lstatSync(ROOT), uid = process.geteuid();
  need(ownStat.isDirectory() && !ownStat.isSymbolicLink() && ownStat.uid === uid
    && (ownStat.mode & 0o777) === 0o700 && realpathSync(own) === own
    && rootStat.isDirectory() && !rootStat.isSymbolicLink() && rootStat.uid === uid
    && (rootStat.mode & 0o700) === 0o700 && (rootStat.mode & 0o022) === 0, 'PR_TEST_OWNED_MODE');
  for (let at = ROOT;; at = path.dirname(at)) {
    const row = lstatSync(at);
    need(row.isDirectory() && !row.isSymbolicLink() && realpathSync(at) === at, 'PR_TEST_ROOT_CHANGED');
    if (at === path.dirname(at)) break;
  }
  const env = process.env;
  need(env.GITHUB_ACTIONS === 'true' && env.GITHUB_EVENT_NAME === 'pull_request'
    && /^refs\/pull\/[1-9][0-9]*\/merge$/.test(env.GITHUB_REF ?? '')
    && env.RUNNER_OS === 'Linux' && env.RUNNER_TRACKING_ID === 'source19-synthetic-kernel-fixture'
    && env.GITHUB_RUN_ATTEMPT === '1' && /^[1-9][0-9]*$/.test(env.GITHUB_RUN_ID ?? ''), 'PR_TEST_REQUEST');
  const fixed = { GITHUB_TOKEN: 'source19-synthetic-github', SUPABASE_URL: 'https://fixture.invalid',
    SUPABASE_SERVICE_ROLE_KEY: 'sb_secret_source19_synthetic', SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_source19_synthetic',
    DMI_STAC_ROOT: 'https://current-source-native.invalid/v1/forecastdata', ACTIONS_RESULTS_URL: 'https://cache.fixture.invalid',
    RAVRADAR_PRIVATE_RUNTIME_STORAGE_BACKEND: 'supabase', RAVRADAR_PRIVATE_RUNTIME_ROOT: PRIVATE,
    RAVRADAR_PRIVATE_RUNTIME_BUNDLE: BUNDLE, RAVRADAR_PRIVATE_RUNTIME_RESTORE: RESTORED,
    NODE_USE_ENV_PROXY: '1', NO_PROXY: '', npm_config_offline: 'true',
    WEATHER_PROGRESS_ENCRYPTION_KEY: 'bW1tbW1tbW1tbW1tbW1tbW1tbW1tbW1tbW1tbW1tbW0=' };
  need(Object.entries(fixed).every(([key,value]) => env[key] === value), 'PR_TEST_SYNTHETIC_ONLY');
  // A positive driver environment allowlist, not a secret-name blacklist.
  // RAW/cipher/cohort descendants inherit only this already isolated world.
  const allowed = new Set(['PATH','LD_LIBRARY_PATH','LIBRARY_PATH','LANG','LC_ALL','LC_CTYPE',
    'RUNNER_TEMP','PYTHON','PYTHONDONTWRITEBYTECODE','GITHUB_ACTIONS','GITHUB_REPOSITORY','GITHUB_RUN_ID',
    'GITHUB_RUN_ATTEMPT','GITHUB_SHA','GITHUB_REF','GITHUB_EVENT_NAME','GITHUB_SERVER_URL','RUNNER_OS','RUNNER_NAME',
    'RUNNER_TRACKING_ID','GITHUB_WORKSPACE','GITHUB_OUTPUT','GITHUB_TOKEN','SUPABASE_URL','SUPABASE_SERVICE_ROLE_KEY',
    'SUPABASE_PUBLISHABLE_KEY','RAVRADAR_PRIVATE_RUNTIME_STORAGE_BACKEND','RAVRADAR_PRIVATE_RUNTIME_ROOT',
    'RAVRADAR_PRIVATE_RUNTIME_BUNDLE','RAVRADAR_PRIVATE_RUNTIME_RESTORE','RAVRADAR_PRODUCTION_TARGET_HOUR',
    'INPUT_FORCE','INPUT_OPERATION','INPUT_PATH','INPUT_KEY','OPERATIONAL_ACTION','EXTENDED_PROVIDER_BOOTSTRAP',
    'QUICK_PROGRESS_SOURCE','CHECKPOINT_TARGET_HOUR','ACTIONS_CACHE_SERVICE_V2','ACTIONS_RESULTS_URL','ACTIONS_RUNTIME_TOKEN',
    'WEATHER_PROGRESS_ENCRYPTION_KEY','DMI_STAC_ROOT','npm_config_offline','NODE_USE_ENV_PROXY','HTTPS_PROXY','HTTP_PROXY',
    'NO_PROXY','NODE_EXTRA_CA_CERTS','SSL_CERT_FILE','REQUESTS_CA_BUNDLE','CURL_CA_BUNDLE',
    'COMPLETED_PRIVATE_RUNTIME','CHECKPOINT_ONLY','QUICK_CONFIRMATION','RAVRADAR_WEATHER_STATE_EPOCH_BOOTSTRAP',
    'RAVRADAR_WEATHER_STATE_EPOCH_CHECKPOINT_REENTRY','NATIVE_IDENTITY_RECOVERY','CURRENT_FAMILY_COLD_START','PRODUCE_HANDOFF']);
  need(Object.keys(env).every(key => allowed.has(key)), 'PR_TEST_ENVIRONMENT_NOT_ALLOWLISTED');
  need(/^http:\/\/127\.0\.0\.1:[1-9][0-9]{0,4}$/.test(env.HTTPS_PROXY ?? '')
    && env.HTTP_PROXY === env.HTTPS_PROXY, 'PR_TEST_LOOPBACK_ONLY');
  const certificate = path.join(path.dirname(ROOT), 'test-ca.pem');
  for (const key of ['NODE_EXTRA_CA_CERTS', 'SSL_CERT_FILE', 'REQUESTS_CA_BUNDLE', 'CURL_CA_BUNDLE'])
    need(env[key] === certificate, 'PR_TEST_OWNED_CA');
  const ca = lstatSync(certificate);
  need(ca.isFile() && !ca.isSymbolicLink() && ca.nlink === 1 && realpathSync(certificate) === certificate,
    'PR_TEST_OWNED_CA');
  const capturePath = path.join(ROOT, PR_CAPTURE), stat = lstatSync(capturePath);
  need(stat.isFile() && !stat.isSymbolicLink() && stat.nlink === 1 && stat.size > 0
    && stat.size <= 16 * 1024 * 1024 && realpathSync(capturePath) === capturePath, 'PR_TEST_CAPTURE');
  const capture = JSON.parse(readFileSync(capturePath, 'utf8')), c = capture.current;
  need(capture.kind === 'SOURCE_PR_NATIVE_TEST_CAPTURE_V1' && capture.scope === 'SOURCE_PR_NATIVE_TEST'
    && capture.sourceAdmission === false && capture.productionProof === false
    && c && c.head === env.GITHUB_SHA && capture.head === c.head
    && c.run === Number(env.GITHUB_RUN_ID) && c.attempt === 1
    && Number.isSafeInteger(c.jobId) && c.jobId > 0
    && env.GITHUB_REF === 'refs/pull/' + c.pullRequest + '/merge'
    && capture.repository === env.GITHUB_REPOSITORY && capture.runnerName === env.RUNNER_NAME
    && capture.workflowPath === PR_WORKFLOW && /^[a-f0-9]{40}$/.test(capture.mainHead ?? '')
    && capture.mainHead !== c.head && /^sha256:[a-f0-9]{64}$/.test(capture.sourceTreeSha256 ?? ''), 'PR_TEST_CAPTURE');
  need(git(['rev-parse', 'HEAD']) === c.head && git(['rev-parse', 'origin/main']) === capture.mainHead,
    'PR_TEST_H_AND_MAIN');
  git(['merge-base', '--is-ancestor', capture.mainHead, c.head]);
  const payload = Buffer.from(JSON.stringify({ scp: 'Actions.Results:' + c.run + ':' + c.jobId })).toString('base64url');
  need(env.ACTIONS_RUNTIME_TOKEN === 'eyJhbGciOiJub25lIn0.' + payload + '.', 'PR_TEST_SYNTHETIC_SDK_TOKEN');
  return capture;
}

// An in-process assertion closure for fixed action children. It carries no
// serialized authority and never substitutes for their existing guardian/FD,
// physical-close, API, hash, path, lease or SAVE checks.
export function sourcePrNativeTestDistributionAssertion() {
  const expected = assertSyntheticPrDistributionWorld();
  return () => need(same(assertSyntheticPrDistributionWorld(), expected), 'PR_TEST_WORLD_CHANGED');
}

function capturePrNativeRequest() {
  const capture = assertSyntheticPrDistributionWorld();
  need(path.resolve(process.argv[1] ?? '') === path.join(ROOT, '.github/actions/save-owned-dmi-grib/index.cjs')
    && process.argv.length === 2 && process.env.INPUT_OPERATION === 'source', 'FIXED_ACTION');
  const identity = Object.freeze(Object.fromEntries(envKeys.map(key => [key, process.env[key]])));
  assertSourcePrivateRuntimeCheckpointReconcileRequest(identity);
  for (const key of ['RAVRADAR_ARCHIVED_WEATHER_RESTART_CONTEXT_PATH', 'RAVRADAR_ARCHIVED_WEATHER_RESTART_CONTEXT_SHA256',
    'RAVRADAR_CURRENT_FAMILY_COLD_START_CONTEXT_PATH', 'RAVRADAR_CURRENT_FAMILY_COLD_START_CONTEXT_SHA256'])
    need(identity[key] === undefined || identity[key] === '', 'MIXED_MODE');
  need(['true','false'].includes(identity.INPUT_FORCE) && identity.EXTENDED_PROVIDER_BOOTSTRAP === 'false'
    && identity.CURRENT_FAMILY_COLD_START === 'false' && identity.PRODUCE_HANDOFF === 'false'
    && identity.QUICK_PROGRESS_SOURCE === '' && identity.CHECKPOINT_TARGET_HOUR === '', 'MIXED_MODE');
  const rawTarget = identity.RAVRADAR_PRODUCTION_TARGET_HOUR;
  need(typeof rawTarget === 'string' && /^\d{4}-\d\d-\d\dT\d\d:00:00\.000Z$/.test(rawTarget)
    && Number.isFinite(Date.parse(rawTarget)), 'TARGET');
  sourcePrIdentities.set(identity, capture);
  sourcePrEnvironments.set(identity, Object.freeze(Object.fromEntries(prEnvironmentKeys.map(key => [key,process.env[key]]))));
  assertCommittedPrNativeSource(identity);
  return { identity, target: new Date(rawTarget).toISOString() };
}

function assertCommittedPrNativeSource(identity) {
  const capture = sourcePrIdentities.get(identity);
  need(capture && same(capture, assertSyntheticPrDistributionWorld()), 'PR_TEST_OPAQUE_IDENTITY');
  const files = [...new Set([...PRIVATE_RUNTIME_PRODUCER_SOURCE_FILES, SELF])];
  git(['diff', '--exit-code', 'HEAD', '--', ...files]);
  const rows = git(['ls-tree', '-rz', 'HEAD', '--', ...files]).split('\0').filter(Boolean);
  const names = rows.map(row => /^100644 blob [a-f0-9]{40,64}\t([^\0]+)$/.exec(row)?.[1]);
  need(rows.length === files.length && names.every(name => files.includes(name))
    && new Set(names).size === files.length, 'SOURCE_FILE');
  need(sourceTreeContentSha256('HEAD') === capture.sourceTreeSha256, 'PR_TEST_SOURCE_TREE');
}

async function qualifyPrNativeJob(state, reconfirm = false) {
  const captured = sourcePrIdentities.get(state.identity), c = captured.current;
  assertCommittedPrNativeSource(state.identity);
  const base = '/repos/' + captured.repository, route = base + '/actions/runs/' + c.run + '/attempts/1';
  const {json:run,before} = await githubJson(state, route);
  need(run.id === c.run && run.run_attempt === 1 && run.head_sha === c.head && run.head_branch === c.branch
    && run.path === PR_WORKFLOW && run.event === 'pull_request' && run.status === 'in_progress'
    && run.conclusion === null && run.repository?.full_name === captured.repository
    && run.head_repository?.full_name === captured.repository, 'PR_TEST_RUN');
  const {json:jobs,response} = await githubJson(state, route + '/jobs?per_page=100');
  need(!response.headers.get('link')?.includes('rel="next"') && Array.isArray(jobs.jobs)
    && Number.isSafeInteger(jobs.total_count) && jobs.total_count >= 1 && jobs.total_count <= 100
    && jobs.jobs.length === jobs.total_count && jobs.jobs.every(job => Number.isSafeInteger(job.id) && job.id > 0)
    && new Set(jobs.jobs.map(job => job.id)).size === jobs.jobs.length, 'JOB_LIST');
  const matches = jobs.jobs.filter(job => job.name === PR_JOB);need(matches.length === 1, 'JOB');
  const job = matches[0], started = Date.parse(job.started_at ?? '');
  need(job.id === c.jobId && job.run_id === c.run && job.head_sha === c.head
    && (!Object.hasOwn(job,'run_attempt') || job.run_attempt === 1)
    && job.status === 'in_progress' && job.conclusion === null && job.completed_at === null
    && job.runner_name === state.identity.RUNNER_NAME && Number.isSafeInteger(job.runner_id) && job.runner_id > 0
    && job.started_at === captured.jobStartedAt && Number.isFinite(started) && started <= before.wall
    && Array.isArray(job.steps), 'PR_TEST_JOB');
  const source = job.steps.filter(v => v.name === PR_SOURCE_STEP), native = job.steps.filter(v => v.name === PR_NATIVE_STEP);
  need(source.length === 1 && native.length === 1 && source[0].number === captured.sourceStepNumber
    && native[0].number === captured.nativeStepNumber && native[0].number === source[0].number + 1
    && source[0].status === 'completed' && source[0].conclusion === 'success'
    && native[0].status === 'in_progress' && native[0].conclusion === null
    && Date.parse(source[0].completed_at) <= Date.parse(native[0].started_at)
    && Date.parse(native[0].started_at) <= before.wall, 'PR_TEST_SOURCE_THEN_NATIVE');
  const {json:pull} = await githubJson(state, base + '/pulls/' + c.pullRequest);
  need(pull.number === c.pullRequest && pull.state === 'open' && pull.merged === false
    && pull.head?.sha === c.head && pull.head?.ref === c.branch && pull.base?.ref === 'main'
    && pull.base.sha === captured.mainHead && pull.head.repo?.full_name === captured.repository
    && pull.base.repo?.full_name === captured.repository, 'PR_TEST_PULL');
  const {json:main} = await githubJson(state, base + '/git/ref/heads/main');
  need(main.ref === 'refs/heads/main' && main.object?.type === 'commit'
    && main.object.sha === captured.mainHead && main.object.sha !== c.head, 'PR_TEST_MAIN_CHANGED');
  const cutoff = started + 180 * 60000;
  if (reconfirm) need(state.endEpoch === cutoff && state.sourceTreeSha256 === captured.sourceTreeSha256, 'PR_TEST_CUTOFF_CHANGED');
  else { state.endEpoch = cutoff;state.sourceTreeSha256 = captured.sourceTreeSha256; }
  state.deadline = Math.min(state.deadline, cutoff - state.clockUpper);
  assertProcess(state);assertCommittedPrNativeSource(state.identity);
}

export function sourceNormalProducerPrNativeTestSession(session) {
  const actual = tailSessions.get(session);
  need(arguments.length === 1 && actual, 'TAIL_LEXICAL_SESSION_REQUIRED');
  assertSourceNormalProducerTailClock(session);
  return sourcePrIdentities.has(actual.state.identity);
}

function captureRequest() {
  need(process.platform === 'linux' && process.versions.node.split('.')[0] === '24', 'RUNTIME');
  need(path.resolve(process.argv[1] ?? '') === path.join(ROOT, '.github/actions/save-owned-dmi-grib/index.cjs')
    && process.argv.length === 2 && process.env.INPUT_OPERATION === 'source', 'FIXED_ACTION');
  const identity = Object.freeze(Object.fromEntries(envKeys.map(key => [key, process.env[key]])));
  const positive = value => typeof value === 'string' && /^[1-9][0-9]*$/.test(value)
    && Number.isSafeInteger(Number(value));
  need(identity.GITHUB_ACTIONS === 'true' && identity.RUNNER_OS === 'Linux'
    && identity.GITHUB_REF === 'refs/heads/main' && identity.GITHUB_WORKSPACE === ROOT && process.cwd() === ROOT
    && ['schedule', 'workflow_dispatch'].includes(identity.GITHUB_EVENT_NAME)
    && /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(identity.GITHUB_REPOSITORY ?? '')
    && positive(identity.GITHUB_RUN_ID) && positive(identity.GITHUB_RUN_ATTEMPT)
    && /^[a-f0-9]{40}$/.test(identity.GITHUB_SHA ?? '')
    && typeof identity.RUNNER_NAME === 'string' && identity.RUNNER_NAME.trim()
    && typeof identity.RUNNER_TRACKING_ID === 'string' && identity.RUNNER_TRACKING_ID.trim(), 'REQUEST');
  assertSourcePrivateRuntimeCheckpointReconcileRequest(identity);
  need(identity.INPUT_FORCE === undefined || ['true', 'false'].includes(identity.INPUT_FORCE), 'REQUEST');
  for (const key of ['RAVRADAR_ARCHIVED_WEATHER_RESTART_CONTEXT_PATH', 'RAVRADAR_ARCHIVED_WEATHER_RESTART_CONTEXT_SHA256',
    'RAVRADAR_CURRENT_FAMILY_COLD_START_CONTEXT_PATH', 'RAVRADAR_CURRENT_FAMILY_COLD_START_CONTEXT_SHA256']) {
    need(identity[key] === undefined || identity[key] === '', 'MIXED_MODE');
  }
  for (const key of ['CURRENT_FAMILY_COLD_START', 'PRODUCE_HANDOFF']) need(identity[key] === 'false', 'MIXED_MODE');
  need(identity.QUICK_PROGRESS_SOURCE === '' && identity.CHECKPOINT_TARGET_HOUR === ''
    && ['true', 'false'].includes(identity.EXTENDED_PROVIDER_BOOTSTRAP), 'MIXED_MODE');
  need(identity.RAVRADAR_PRIVATE_RUNTIME_ROOT === PRIVATE
    && identity.RAVRADAR_PRIVATE_RUNTIME_BUNDLE === BUNDLE
    && identity.RAVRADAR_PRIVATE_RUNTIME_RESTORE === RESTORED, 'PRIVATE_PATHS');
  const rawTarget = identity.RAVRADAR_PRODUCTION_TARGET_HOUR;
  need(typeof rawTarget === 'string' && /^\d{4}-\d\d-\d\dT\d\d:00:00(?:\.000)?Z$/.test(rawTarget)
    && Number.isFinite(Date.parse(rawTarget)), 'TARGET');
  const target = new Date(rawTarget).toISOString();
  need(git(['rev-parse', 'HEAD']) === identity.GITHUB_SHA
    && git(['rev-parse', 'origin/main']) === identity.GITHUB_SHA, 'MAIN');
  // No old tuple is relabelled. These are physical committed source bytes;
  // the normal model/origin reader below still requires genuine C/I/T.
  assertCommittedSource(identity);
  return { identity, target };
}

function assertCommittedSource(identity) {
  if (sourcePrIdentities.has(identity)) return assertCommittedPrNativeSource(identity);
  need(git(['rev-parse', 'HEAD']) === identity.GITHUB_SHA
    && git(['rev-parse', 'origin/main']) === identity.GITHUB_SHA, 'MAIN');
  const sourceFiles = [...new Set([...PRIVATE_RUNTIME_PRODUCER_SOURCE_FILES, SELF])];
  git(['diff', '--exit-code', 'HEAD', '--', ...sourceFiles]);
  // An untracked generated metadata leaf is invisible to git diff. Require
  // every inventoried producer leaf in the actual committed tree as well.
  const committed = git(['ls-tree', '-rz', 'HEAD', '--', ...sourceFiles]).split('\0').filter(Boolean);
  need(committed.length === sourceFiles.length, 'SOURCE_FILE');
  const committedFiles = committed.map(row => {
    const match = /^100644 blob [a-f0-9]{40,64}\t([^\0]+)$/.exec(row);
    need(match && sourceFiles.includes(match[1]), 'SOURCE_FILE');
    return match[1];
  });
  need(new Set(committedFiles).size === sourceFiles.length, 'SOURCE_FILE');
  // git show also refuses an uncommitted/unissued entry module. Git diff alone
  // cannot authenticate a newly untracked file as part of the source family.
  need(execFileSync('git', ['-C', ROOT, 'cat-file', '-t', 'HEAD:' + SELF],
    { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim() === 'blob', 'SOURCE_FILE');
}

function clockSample() {
  const monoBefore = performance.now(), wall = Date.now(), monoAfter = performance.now();
  return { monoBefore, wall, monoAfter };
}
function intersectClock(state, sample) {
  need(Number.isFinite(sample.monoBefore) && Number.isFinite(sample.monoAfter)
    && Number.isSafeInteger(sample.wall) && sample.monoBefore >= 0
    && sample.monoBefore <= sample.monoAfter && sample.monoBefore >= state.lastMono
    && sample.wall >= state.lastWall, 'CLOCK');
  state.clockLower = Math.max(state.clockLower, sample.wall - sample.monoAfter);
  state.clockUpper = Math.min(state.clockUpper, sample.wall + 1 - sample.monoBefore);
  need(state.clockLower < state.clockUpper, 'CLOCK_CHANGED');
  state.lastMono = sample.monoAfter; state.lastWall = sample.wall;
}
async function githubJson(state, route) {
  const before = clockSample();
  // The existing metadata ceiling can only shrink to the ORIGINAL job cutoff.
  const timeout = Math.min(15000, Math.floor(state.deadline - before.monoAfter));
  need(timeout > 0, 'DEADLINE');
  const response = await fetch('https://api.github.com' + route, { headers: {
    Authorization: 'Bearer ' + process.env.GITHUB_TOKEN, Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28' }, signal: AbortSignal.timeout(timeout) });
  need(response.ok, 'GITHUB_METADATA');
  const json = await response.json(), after = clockSample();
  need(after.monoBefore >= before.monoAfter && after.monoAfter - before.monoBefore <= 15000
    && Number.isSafeInteger(before.wall) && after.wall >= before.wall, 'CLOCK');
  const serverDate = response.headers.get('date'), server = Date.parse(serverDate ?? '');
  need(Number.isFinite(server) && new Date(server).toUTCString() === serverDate
    && server <= after.wall && server + 1000 > before.wall, 'HTTP_CLOCK');
  intersectClock(state, before); intersectClock(state, after);
  return { json, response, before, after };
}

// Direct execution in THIS main job, never reuse of a self-owned cache marker.
// Fresh run/job/runner evidence is established by qualifyNormalJob before this.
function assertSourceNormalCurrentSourceExecution({record,identity,run,job,sourceTreeSha256,workflowSource,observedAt}){
  need(record&&typeof record==='object'&&!Array.isArray(record)
    &&Object.keys(record).sort().join(',')===['contractId','repository','headSha','sourceTreeSha256','proofKind',
      'producerHeadSha','runHeadSha','runId','runAttempt','conclusion'].sort().join(','),'CURRENT_SOURCE_RECORD');
  need(record.contractId===SOURCE_GATE_CONTRACT&&record.repository===identity.GITHUB_REPOSITORY
    &&record.headSha===identity.GITHUB_SHA&&record.producerHeadSha===identity.GITHUB_SHA
    &&record.runHeadSha===identity.GITHUB_SHA&&record.sourceTreeSha256===sourceTreeSha256
    &&record.proofKind==='main'&&record.runId===identity.GITHUB_RUN_ID
    &&record.runAttempt===Number(identity.GITHUB_RUN_ATTEMPT)&&record.conclusion==='success'
    &&run.id===Number(record.runId)&&run.run_attempt===record.runAttempt,'CURRENT_SOURCE_RECORD');
  need(typeof workflowSource==='string'&&Buffer.byteLength(workflowSource)>0
    &&Buffer.byteLength(workflowSource)<=1024*1024,'CURRENT_SOURCE_COMMAND');
  const headings=[...workflowSource.matchAll(/^      - (?:name|uses): [^\n]+\n/gm)];
  const named=id=>{
    const rows=headings.map((row,index)=>workflowSource.slice(row.index,headings[index+1]?.index??workflowSource.length))
      .filter(body=>body.includes('        id: '+id+'\n'));
    need(rows.length===1,'CURRENT_SOURCE_COMMAND');return rows[0];
  };
  const gate=named('source-gate'),recordStep=named('source-record'),action=named('source-normal');
  need(gate.startsWith('      - name: '+SOURCE_GATE_STEP+'\n')
    &&/^        run: npm run validate:source\n/m.test(gate)
    &&!/^        (?:continue-on-error|working-directory):/m.test(gate)
    &&recordStep.startsWith('      - name: Record actual source validation outcome\n')
    &&/^        run: node scripts\/weather-source-gate\.mjs record\n/m.test(recordStep)
    &&recordStep.includes('          SOURCE_GATE_OUTCOME: ${{ steps.source-gate.outcome }}\n')
    &&!/^        (?:continue-on-error|working-directory):/m.test(recordStep)
    &&action.startsWith('      - name: Run the one explicit owned SOURCE ordinary route\n')
    &&/^        uses: \.\/\.github\/actions\/save-owned-dmi-grib\n/m.test(action)
    &&action.includes('          operation: source\n'),'CURRENT_SOURCE_COMMAND');
  need(Array.isArray(job.steps)&&job.steps.length>0&&job.steps.length<=512,'CURRENT_SOURCE_STEPS');
  const actual=name=>{
    const rows=job.steps.filter(step=>step?.name===name);need(rows.length===1,'CURRENT_SOURCE_STEPS');
    const step=rows[0];need(Number.isSafeInteger(step.number)&&step.number>0,'CURRENT_SOURCE_STEPS');return step;
  };
  const executed=actual(SOURCE_GATE_STEP),recorded=actual('Record actual source validation outcome'),
    active=actual('Run the one explicit owned SOURCE ordinary route');
  for(const step of [executed,recorded])need(step.status==='completed'&&step.conclusion==='success','CURRENT_SOURCE_STEPS');
  need(active.status==='in_progress'&&active.conclusion===null&&active.completed_at===null,'CURRENT_SOURCE_STEPS');
  const stamp=value=>{
    const time=Date.parse(value??'');need(typeof value==='string'&&Number.isFinite(time)
      &&new Date(time).toISOString()===value.replace(/(?<!\.\d{3})Z$/,'.000Z'),'CURRENT_SOURCE_ORDER');return time;
  };
  const times=[stamp(job.started_at),stamp(executed.started_at),stamp(executed.completed_at),
    stamp(recorded.started_at),stamp(recorded.completed_at),stamp(active.started_at)];
  need(executed.number<recorded.number&&recorded.number<active.number
    &&times.every((value,index)=>index===0||times[index-1]<=value)
    &&Number.isSafeInteger(observedAt)&&times.at(-1)<=observedAt,'CURRENT_SOURCE_ORDER');
}

async function qualifyNormalJob(state) {
  if (sourcePrIdentities.has(state.identity)) return qualifyPrNativeJob(state);
  const identity = state.identity, route = '/repos/' + identity.GITHUB_REPOSITORY
    + '/actions/runs/' + identity.GITHUB_RUN_ID + '/attempts/' + identity.GITHUB_RUN_ATTEMPT;
  const { json: run, before } = await githubJson(state, route);
  need(run.id === Number(identity.GITHUB_RUN_ID) && run.run_attempt === Number(identity.GITHUB_RUN_ATTEMPT)
    && run.head_sha === identity.GITHUB_SHA && run.head_branch === 'main' && WORKFLOWS.includes(run.path)
    && run.event === identity.GITHUB_EVENT_NAME && run.status === 'in_progress' && run.conclusion === null
    && run.repository?.full_name === identity.GITHUB_REPOSITORY
    && run.head_repository?.full_name === identity.GITHUB_REPOSITORY, 'RUN');
  need(state.workflowPath === undefined || state.workflowPath === run.path, 'RUN_PATH_CHANGED');
  state.workflowPath = run.path;
  const { json: jobs, response } = await githubJson(state, route + '/jobs?per_page=100');
  need(!response.headers.get('link')?.includes('rel="next"') && Array.isArray(jobs.jobs)
    && Number.isSafeInteger(jobs.total_count) && jobs.total_count >= 1 && jobs.total_count <= 100
    && jobs.jobs.length === jobs.total_count && jobs.jobs.every(job => Number.isSafeInteger(job.id) && job.id > 0)
    && new Set(jobs.jobs.map(job => job.id)).size === jobs.jobs.length, 'JOB_LIST');
  const matching = jobs.jobs.filter(job => job.name === JOB);
  need(matching.length === 1, 'JOB');
  const job = matching[0], started = Date.parse(job.started_at ?? '');
  need(job.run_id === run.id && job.head_sha === identity.GITHUB_SHA
    && (!Object.hasOwn(job, 'run_attempt') || job.run_attempt === run.run_attempt)
    && job.status === 'in_progress' && job.conclusion === null && job.completed_at === null
    && Number.isSafeInteger(job.runner_id) && job.runner_id > 0 && job.runner_name === identity.RUNNER_NAME
    && Number.isFinite(started) && started <= before.wall
    && new Date(started).toISOString() === job.started_at?.replace(/(?<!\.\d{3})Z$/, '.000Z'), 'JOB');
  // Exactly the current normal outer workflow limit. No provider/failure
  // allowance is enlarged; the later scheduler must share this cutoff.
  state.endEpoch = started + (identity.EXTENDED_PROVIDER_BOOTSTRAP === 'true' ? 240 : 230) * 60000;
  state.deadline = state.endEpoch - state.clockUpper;
  const record = JSON.parse(await fs.readFile(path.join(ROOT, '.cache/weather-source-validation.json'), 'utf8'));
  const sourceTreeSha256 = sourceTreeContentSha256('HEAD');
  if(String(record?.runId)===identity.GITHUB_RUN_ID){
    assertSourceNormalCurrentSourceExecution({record,identity,run,job,sourceTreeSha256,
      workflowSource:git(['show','HEAD:.github/workflows/reusable-weather-build.yml']),observedAt:before.wall});
  }else{
    const decision = await decideSourceGate(record, identity, async route => (await githubJson(state, route)).json,
      { sourceTreeSha256 });
    need(decision.required === false, 'EXACT_SOURCE_GATE');
  }
  state.sourceTreeSha256 = sourceTreeSha256;
  assertProcess(state);
}

function retainEntryFirstFailure(state, error) {
  state.firstFailureRecord ??= Object.freeze([error]);
  state.firstFailure = state.firstFailureRecord[0];
  return state.firstFailureRecord[0];
}
function assertEntryFirstFailureAbsent(state) {
  if (state.firstFailureRecord !== null) throw state.firstFailureRecord[0];
}
function assertProcess(state) {
  assertEntryFirstFailureAbsent(state);
  need( envKeys.every(key => process.env[key] === state.identity[key]), 'PROCESS_CHANGED');
  const prEnvironment = sourcePrEnvironments.get(state.identity);
  if (prEnvironment) need(prEnvironmentKeys.every(key => process.env[key] === prEnvironment[key]), 'PR_TEST_WORLD_CHANGED');
  intersectClock(state, clockSample());
  state.deadline = Math.min(state.deadline, state.endEpoch - state.clockUpper);
  need(Number.isFinite(state.deadline) && state.deadline > state.lastMono, 'DEADLINE');
}

async function checkedParents(file) {
  const absolute = path.resolve(file), rows = [];
  let current = path.parse(absolute).root;
  for (const component of ['', ...path.relative(current, path.dirname(absolute)).split(path.sep).filter(Boolean)]) {
    if (component) current = path.join(current, component);
    const stat = await fs.lstat(current, { bigint: true });
    need(stat.isDirectory() && !stat.isSymbolicLink(), 'DIRECTORY');
    rows.push({ path: current, dev: stat.dev, ino: stat.ino, mode: stat.mode });
  }
  return rows;
}
async function assertRow(state, row) {
  assertProcess(state);
  for (const before of row.parents) { const after = await fs.lstat(before.path, { bigint: true });
    need(after.isDirectory() && !after.isSymbolicLink() && after.dev === before.dev
      && after.ino === before.ino && after.mode === before.mode, 'DIRECTORY_CHANGED'); }
  for (const after of [await row.handle.stat({ bigint: true }), await fs.lstat(row.path, { bigint: true })])
    need(after.isFile() && !after.isSymbolicLink() && after.nlink === 1n
      && ['dev', 'ino', 'mode', 'size', 'mtimeNs', 'ctimeNs'].every(key => after[key] === row.stat[key]), 'FILE_CHANGED');
  // This SAME open FD was whole-hashed once against its authenticated source.
  // Reuse only its unchanged physical snapshot; never rehash/repin a mutation.
  // This is an INPUT boundary, not permission to accept later provider writes.
  const identity = ownFileDescriptorIdentity(row.fd);
  need(row.qualified === true && row.descriptorIdentity !== null && identity !== null
    && identity.dev === row.descriptorIdentity.dev && identity.ino === row.descriptorIdentity.ino,
  'DESCRIPTOR_CHANGED');
}
async function retainFile(state, file, expected = null, maximum = 768 * 1024 * 1024) {
  const parents = await checkedParents(file), stat = await fs.lstat(file, { bigint: true });
  need(stat.isFile() && !stat.isSymbolicLink() && stat.nlink === 1n && stat.size > 0n
    && stat.size <= BigInt(maximum), 'FILE');
  const handle = await fs.open(file, fs.constants.O_RDONLY | (fs.constants.O_NOFOLLOW ?? 0));
  const row = { path: file, parents, stat, handle, fd: handle.fd,
    descriptorIdentity: null, bytes: Number(stat.size), sha256: null, qualified: false };
  state.rows.push(row); // retain ownership before any further await or failure
  row.descriptorIdentity = ownFileDescriptorIdentity(row.fd);
  need(row.descriptorIdentity !== null, 'DESCRIPTOR');
  const opened = await handle.stat({ bigint: true });
  need(['dev', 'ino', 'mode', 'size', 'mtimeNs', 'ctimeNs'].every(key => opened[key] === stat[key]), 'FILE_CHANGED');
  const digest = crypto.createHash('sha256'), buffer = Buffer.alloc(64 * 1024); let offset = 0;
  for (;;) { assertProcess(state); const { bytesRead } = await handle.read(buffer, 0, buffer.length, offset);
    if (!bytesRead) break; offset += bytesRead; need(offset <= row.bytes, 'FILE_LENGTH'); digest.update(buffer.subarray(0, bytesRead)); }
  row.sha256 = digest.digest('hex');
  need(offset === row.bytes && (expected === null || row.bytes === expected.bytes && row.sha256 === expected.sha256), 'FILE_HASH');
  row.qualified = true;
  await assertRow(state, row); return row;
}
async function readPinnedJson(state, row) {
  await assertRow(state, row);
  const raw = Buffer.alloc(row.bytes); let offset = 0;
  while (offset < raw.length) { const { bytesRead } = await row.handle.read(raw, offset, raw.length - offset, offset);
    need(bytesRead > 0, 'FILE_LENGTH'); offset += bytesRead; }
  need(hash(raw) === row.sha256, 'FILE_HASH'); await assertRow(state, row);
  return JSON.parse(raw.toString('utf8'));
}
async function pointer(state) {
  const key = PROTECTED_PRIVATE_RUNTIME_POLICY.documentKey;
  const rows = await state.clients.documentRequest('?document_key=eq.' + encodeURIComponent(key)
    + '&select=document_key,payload,version&limit=2', {}, 'read');
  assertProcess(state);
  need(Array.isArray(rows) && rows.length === 1 && rows[0].document_key === key
    && Number.isSafeInteger(Number(rows[0].version)) && Number(rows[0].version) > 0, 'POINTER');
  return { version: Number(rows[0].version), pointer: validateProtectedPrivateRuntimePointer(rows[0].payload) };
}
async function activeModel(state) {
  const rows = await state.clients.documentRequest('?select=document_key,payload,version&document_key=in.('
    + OPERATION + ',' + PROFILE + ')', {}, 'atomisk RavScore operation/profil-læsning');
  assertProcess(state);
  need(Array.isArray(rows) && rows.length === 2 && new Set(rows.map(row => row?.document_key)).size === 2
    && rows.every(row => [OPERATION, PROFILE].includes(row?.document_key)
      && Number.isSafeInteger(Number(row.version)) && Number(row.version) > 0), 'ACTIVE_ROWS');
  const resolved = resolveOperationalRavScoreModel(rows.find(row => row.document_key === OPERATION),
    { profileRow: rows.find(row => row.document_key === PROFILE) });
  // This is the PUBLIC activation/profile metadata, not private B/S. The
  // normal resolver already validates a sealed historical binding. Accept
  // it only with its exact existing maintenance action; private CURRENT B,
  // 060000/S reconciliation and genuine origin admission below are unchanged.
  const bindingCurrent = operationalResolvedBindingCurrent(resolved);
  const expectedAction = bindingCurrent ? 'integrated' : 'integrated-historical-maintenance';
  need(resolved.model === 'integrated' && resolved.pending === false
    && state.identity.OPERATIONAL_ACTION === expectedAction
    && resolved.initialCutoverRequired === false && resolved.legacySourceRequired === false, 'ACTIVE_MODEL');
  return rows;
}

async function beginSourceNormalProducerSession(state) {
  need(state.phase === 'WORKING_INSTALLED' && state.origin !== null && state.reconcile?.paired === true
    && state.reconcile.nativeAdmissionIssued === false && state.install?.installed === true, 'SESSION_ORDER');
  for (const row of state.rows) await assertRow(state, row);
  need(same(await pointer(state), state.parent) && same(await activeModel(state), state.active), 'CENTRAL_CHANGED');
  assertCommittedSource(state.identity);
  assertProcess(state);
  const session = state.session;
  need(sessions.get(session) === state, 'SAME_PREPARING_SESSION_REQUIRED');
  state.phase = 'PRODUCER_INPUTS_ADMITTED';
  // A real opaque input session only. No provider, output, save ACK, artifact,
  // child-stop or owner-release statement follows from this result.
  return session;
}

export async function prepareSourceNormalProducerSession() {
  need(arguments.length === 0 && !attempted, 'ONE_FIXED_ENTRY'); attempted = true;
  const { identity, target } = process.env.GITHUB_EVENT_NAME === 'pull_request'
    ? capturePrNativeRequest() : captureRequest();
  const state = { identity, target, phase: 'PREPARING', firstFailure: null, firstFailureRecord: null, rows: [], origin: null,
    clockLower: -Infinity, clockUpper: Infinity, lastMono: -Infinity, lastWall: -Infinity,
    deadline: Infinity, endEpoch: Infinity };
  state.session = Object.freeze({});
  sessions.set(state.session, state); // same owner identity, NOT admission
  retained.add(state); // no cleanup/release on an unknown read/install outcome
  try {
    await qualifyNormalJob(state);
    need(await fs.realpath(ROOT) === ROOT && await fs.realpath(PRIVATE) === PRIVATE, 'ROOT');
    await checkedParents(path.join(PRIVATE, 'unused'));
    for (const file of [BUNDLE, RESTORED, path.join(ROOT, CHECKPOINT)]) {
      const stat = await fs.lstat(file).catch(error => { if (error?.code === 'ENOENT') return null; throw error; });
      need(stat === null, 'DESTINATION_EXISTS');
    }
    state.clients = createProtectedPrivateRuntimeClients();
    state.active = await activeModel(state);
    await verifyIntegratedDatabaseReadback({ url: process.env.SUPABASE_URL,
      serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY, sourcePhase: 'source-producer' });
    const registry = await retainFile(state, path.join(ROOT, REGISTRY), null, 16 * 1024 * 1024);
    state.central = await readPinnedJson(state, registry);
    state.parent = await pointer(state);
    const current = state.parent.pointer.current;
    // This is ONLY the already installed normal family. No old metadata,
    // historical seed, missing B or independent cache can issue a session.
    need(requiresPrivateRuntimeCheckpointReconcile(current), 'PAIRED_FAMILY_REQUIRED');
    state.expected = await buildPrivateRuntimeExpectation({ repositoryRoot: ROOT, targetReferenceAt: target });
    const described = await describeCurrentProtectedPrivateProductionRuntime({ request: state.clients.documentRequest });
    for (const key of ['sourceHead', 'datasetId', 'productionReferenceAt', 'generatedAt',
      'bundleContentSha256', 'modelBinding', 'contractHashes']) need(same(described[key], current[key]), 'CURRENT_CHANGED');
    // Preserve the exact normal describe result, never reconstruct it from a
    // report/pointer or fetch another generation later. The string is immutable.
    state.currentSourceDescription = JSON.stringify(described) + '\n';
    const restored = await restoreProtectedPrivateProductionRuntime({ privateRoot: PRIVATE, bundlePath: BUNDLE,
      repositoryRoot: ROOT, expected: state.expected, request: state.clients.documentRequest, storage: state.clients.storage });
    need(restored.restored === true && restored.rollbackSelected === false
      && restored.centralVersion === state.parent.version && same(await pointer(state), state.parent), 'CURRENT_REQUIRED');
    // Actual lexical result of normal archive verification, not copied JSON.
    state.restoreResult = restored;
    const verified = protectedPrivateRuntimeRestoreVerification(restored);
    need(verified.bundleContentSha256 === current.bundleContentSha256, 'B_IDENTITY');
    state.originalFileCount = verified.files.length;
    state.bundleVerification = verified;
    await retainFile(state, path.join(BUNDLE, 'manifest.json'), null, 16 * 1024 * 1024);
    for (const file of verified.files) await retainFile(state, path.join(BUNDLE, 'payload', file.relativePath), file);
    state.immutableRows = Object.freeze([...state.rows]);
    const targetSource = await describeTargetProtectedPrivateProductionRuntime({ request: state.clients.documentRequest,
      targetReferenceAt: current.productionReferenceAt, datasetId: current.datasetId,
      bundleContentSha256: current.bundleContentSha256 });
    const expected = secondRestoreExpectation({ expected: state.expected, source: targetSource, manifest: verified.manifest });
    await restorePrivateProductionRuntimeBundle({ privateRoot: PRIVATE, bundlePath: BUNDLE, outputPath: RESTORED,
      repositoryRoot: ROOT, expected, targetReferenceAt: expected.targetReferenceAt,
      minimumReferenceAt: expected.minimumReferenceAt, minimumGeneratedAt: expected.minimumGeneratedAt });
    state.phase = 'INSTALL_PENDING';
    const tail = await import('./source-normal-producer-tail.mjs');
    state.sourceInstallContext = await tail.createSourceNormalInstallationContext(state.session);
    state.install = await installRestoredPrivateRuntime({ restoredRoot: RESTORED, repositoryRoot: ROOT,
      sourceInventoryContext: state.sourceInstallContext });
    state.sourceInstall = await tail.finishSourceNormalInstallationContext(
      state.session, state.sourceInstallContext, state.install);
    state.phase = 'INSTALLED';
    const installed = privateRuntimeInstallationFiles(state.install);
    state.installedFiles = installed;
    state.workingRows = [];
    need(installed.length === state.install.fileCount, 'INSTALL_INVENTORY');
    for (const file of installed) {
      const expected = verified.files.find(original => original.relativePath === file.relativePath) ?? file;
      need(Number.isSafeInteger(expected.bytes) && expected.bytes > 0
        && /^[a-f0-9]{64}$/.test(expected.sha256 ?? ''), 'INSTALL_INVENTORY');
      state.workingRows.push(await retainFile(state, path.join(ROOT, file.relativePath), expected));
    }
    for (const row of state.rows) await assertRow(state, row);
    // Preserve the genuine ordinary ordering: installed authenticated CURRENT B
    // precedes exact S reconciliation/readback. Never restore an old S first.
    state.reconcile = await reconcileSourcePrivateRuntimeCheckpoint({ repositoryRoot: ROOT, privateRoot: PRIVATE,
      bundlePath: BUNDLE, expected: state.expected, request: state.clients.documentRequest,
      operationalAction: state.identity.OPERATIONAL_ACTION, targetReferenceAt: state.target });
    state.checkpointRow = await retainFile(state, path.join(ROOT, CHECKPOINT), null, 16 * 1024 * 1024);
    state.origin = await readEstablishedNativeCurrentOrigin(state.central);
    need(state.origin !== null, 'GENUINE_ORIGIN_REQUIRED');
    state.phase = 'WORKING_INSTALLED';
    return await beginSourceNormalProducerSession(state);
  } catch (error) {
    const first = retainEntryFirstFailure(state, error);
    state.phase = 'FAILED_RETAINED';
    if (state.sourceInstallContext) {
      try {
        const tail = await import('./source-normal-producer-tail.mjs');
        await tail.retainAndDrainSourceNormalInstallationFailure(state.sourceInstallContext, first);
      } catch (stopError) { state.installStopFailure ??= [stopError]; }
    }
    throw first; // A close failure must never replace the first raw value.
  }
}

export async function assertSourceNormalProducerSession(session) {
  need(arguments.length === 1 && sessions.has(session), 'LEXICAL_SESSION_REQUIRED');
  const state = sessions.get(session);
  try {
    need(state.phase === 'PRODUCER_INPUTS_ADMITTED', 'SESSION_PHASE');
    assertCommittedSource(state.identity);
    for (const row of state.rows) await assertRow(state, row);
    need(same(await pointer(state), state.parent) && same(await activeModel(state), state.active), 'CENTRAL_CHANGED');
    // ONLY before handing these inputs to the first provider. The later
    // scheduler must consume/replace this generation under its own ownership;
    // calling this on a mutated generation is correctly refused, not a shard
    // validation loop. There is no whole-file read in this assertion.
    return Object.freeze({ status: 'SOURCE_NORMAL_B_S_WORKING_INPUTS_ADMITTED',
      originalBundleContentSha256: state.parent.pointer.current.bundleContentSha256,
      referenceAt: state.parent.pointer.current.productionReferenceAt, targetReferenceAt: state.target,
      originalFileCount: state.originalFileCount, retainedFileCount: state.rows.length,
      productionAuthority: false, acquisitionPerformed: false, scoringPerformed: false,
      checkpointReconcileOutcome: state.reconcile.outcome,
      checkpointPublicationCalls: state.reconcile.checkpointPublishCalls,
      newBundlePublicationPerformed: false, publicPublicationPerformed: false,
      validOnlyBeforeFirstProviderMutation: true, ownerReleased: false });
  } catch (error) { state.phase = 'FAILED_RETAINED'; throw retainEntryFirstFailure(state, error); }
}


// This consumes the SAME actually prepared session, not a supplied context or
// JSON receipt. There is no new owner, source family or renewed cutoff here.
// The fixed no-argument tail entry is the only normal caller of this seam.
export async function consumeSourceNormalProducerSession(session) {
  need(arguments.length === 1 && sessions.has(session) && !tailSessions.has(session), 'TAIL_SESSION_REQUIRED');
  await assertSourceNormalProducerSession(session);
  const state = sessions.get(session);
  need(state.phase === 'PRODUCER_INPUTS_ADMITTED' && state.bundleVerification
    && state.install?.installed === true && state.reconcile?.paired === true
    && state.origin !== null && state.immutableRows?.length && state.workingRows?.length
    && state.checkpointRow && state.installedFiles?.length === state.install.fileCount, 'TAIL_INPUTS_REQUIRED');
  // This transition is synchronous after the last awaited old-input check.
  // Mutation of working names belongs only to the subsequent owned phases.
  state.phase = 'PRODUCER_TAIL_OWNED';
  const context = Object.freeze({ session, identity: state.identity, target: state.target,
    repositoryRoot: ROOT, privateRoot: PRIVATE, bundlePath: BUNDLE, restoredPath: RESTORED,
    originalPointer: state.parent, activeRows: state.active, origin: state.origin,
    currentSourceDescription: state.currentSourceDescription,
    bundleVerification: state.bundleVerification, restored: state.restoreResult, installed: state.install,
    sourceInstallation: state.sourceInstall,
    installedFiles: state.installedFiles, immutableRows: state.immutableRows,
    workingRows: Object.freeze([...state.workingRows]), checkpointRow: state.checkpointRow,
    allInitialRows: Object.freeze([...state.rows]) });
  tailSessions.set(session, { state, context, firstFailure: null });
  return session;
}

export function sourceNormalProducerTailContext(session) {
  const actual = tailSessions.get(session);
  need(arguments.length === 1 && actual, 'TAIL_LEXICAL_SESSION_REQUIRED');
  assertEntryFirstFailureAbsent(actual.state);
  need(actual.state.phase === 'PRODUCER_TAIL_OWNED', 'TAIL_LEXICAL_SESSION_REQUIRED');
  return actual.context;
}

export function assertSourceNormalProducerTailClock(session) {
  const actual = tailSessions.get(session);
  need(arguments.length === 1 && actual, 'TAIL_LEXICAL_SESSION_REQUIRED');
  assertEntryFirstFailureAbsent(actual.state);
  need(actual.state.phase === 'PRODUCER_TAIL_OWNED', 'TAIL_LEXICAL_SESSION_REQUIRED');
  assertProcess(actual.state);
  // This is the originally qualified absolute job cutoff. It is never now+D.
  return Object.freeze({ deadline: actual.state.deadline, endEpoch: actual.state.endEpoch,
    clockLower: actual.state.clockLower, clockUpper: actual.state.clockUpper });
}

export function retainSourceNormalProducerTailFailure(session, error) {
  const actual = tailSessions.get(session);
  need(arguments.length === 2 && actual && actual.state.phase !== 'RELEASED', 'TAIL_LEXICAL_SESSION_REQUIRED');
  const first = retainEntryFirstFailure(actual.state, error);
  actual.firstFailure ??= actual.state.firstFailureRecord;
  actual.state.phase = 'FAILED_RETAINED';
  // No cleanup/release authority follows. The tail retains its actual raw stop
  // failure separately; this is only the first same-process exception value.
  return first;
}


// I/O-only lookup during preparation. This cannot pass the later admission or
// consume guards, issue an origin, acquire providers, SAVE or release an owner.
export async function sourceNormalProducerInstallationInput(session) {
  need(arguments.length === 1 && sessions.has(session), 'INSTALL_SESSION_REQUIRED');
  const state = sessions.get(session);
  assertEntryFirstFailureAbsent(state);
  need(state.session === session && state.phase === 'INSTALL_PENDING'
    && state.firstFailureRecord === null && state.restoreResult?.restored === true
    && state.restoreResult.rollbackSelected === false && state.bundleVerification
    && state.immutableRows?.length && state.origin === null, 'INSTALL_SCOPE_REQUIRED');
  assertProcess(state);
  for (const row of state.immutableRows) await assertRow(state, row);
  state.installationInput ??= Object.freeze({ session, identity: state.identity,
    repositoryRoot: ROOT, privateRoot: PRIVATE, bundlePath: BUNDLE, restoredPath: RESTORED,
    target: state.target, originalPointer: state.parent, activeRows: state.active,
    restored: state.restoreResult, verification: state.bundleVerification,
    immutableRows: state.immutableRows });
  return state.installationInput;
}

export function sourceNormalProducerInstallationClock(session) {
  need(arguments.length === 1 && sessions.has(session), 'INSTALL_SESSION_REQUIRED');
  const state = sessions.get(session);
  assertEntryFirstFailureAbsent(state);
  need(state.session === session && state.phase === 'INSTALL_PENDING'
    && state.firstFailureRecord === null, 'INSTALL_SCOPE_REQUIRED');
  assertProcess(state);
  return Object.freeze({ deadline: state.deadline, endEpoch: state.endEpoch,
    clockLower: state.clockLower, clockUpper: state.clockUpper });
}

// Normal main-authority recheck for the SAME admitted session. This neither
// rereads/replaces B/S nor issues another owner/clock/route.
export async function reconfirmSourceNormalProducerMain(session) {
  const actual = tailSessions.get(session);
  need(arguments.length === 1 && actual, 'TAIL_LEXICAL_SESSION_REQUIRED');
  assertSourceNormalProducerTailClock(session);
  const state = actual.state;
  if (sourcePrIdentities.has(state.identity)) {
    await qualifyPrNativeJob(state, true);
    assertSourceNormalProducerTailClock(session);return actual.context;
  }
  assertCommittedSource(state.identity);
  const result = await githubJson(state, '/repos/' + state.identity.GITHUB_REPOSITORY + '/git/ref/heads/main');
  need(!result.response.headers.get('link')?.includes('rel="next"')
    && result.json?.ref === 'refs/heads/main' && result.json.object?.type === 'commit'
    && result.json.object.sha === state.identity.GITHUB_SHA, 'MAIN');
  assertCommittedSource(state.identity);
  assertSourceNormalProducerTailClock(session);
  return actual.context;
}
