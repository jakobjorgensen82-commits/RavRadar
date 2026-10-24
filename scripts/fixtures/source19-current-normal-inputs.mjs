// Private native profile preparation. No production data, phase callbacks,
// owner/session issuer, handwritten conditions, origin or public projection.
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {fileURLToPath, pathToFileURL} from 'node:url';
import {isDeepStrictEqual} from 'node:util';
import {requireSourceProducerOutput, requireSourceProducerBinding,
  SOURCE_PRODUCER_BEFORE} from '../lib/source-producer-successor-source.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const OLD_HEAD = 'd8a52e3e4cbaed1557cc56fe01f5f0a2b0d657d7';
const OLD_TREE = '0ddede3f4b4fb4faa43b0d43f17c7cdbadcc9bc0';
const HEAD585 = 'e8f9f7197d9e262720b7627b4970d3da82baa9d9';
const TREE585 = '24dbf944916031ea256537b125966e946efeead8';
// New operative source, NOT the frozen585 factory or a qualified source proof.
const OPERATIVE_INITIAL_HEAD='e7c2e14a6403870e8a1df6c91862980640684733';
const OPERATIVE_INITIAL_TREE='10799761addcd1976055d9051bc5062f02eaf9f6';
const HEAD586='7df56f36f705db641b3f9476ee8ca1b4c4cfed0c',TREE586='57192d6d5cfbd8709f3558ad8afaaf10dd6cafe0';
const OPERATIVE587_HEAD='c03a4f8dc106e535db61d6248cb395a1a96b9b88',OPERATIVE587_TREE='42b345259142d5451386d56184374ce380c5ddd5';
const OLD_RECIPE = 'scripts/test-last-mile-enclosure-restart-archive-origin.mjs';
const OLD_RECIPE_SHA = '06416defda5802bf4c98c8c265dd784263c93f50b2de9b9c39360ce95b582101';
const REGISTRY = 'data/live/coastal-parts-v2.json';
const CHECKPOINT = '.cache/ravscore-continuation-checkpoint/checkpoint.json';
const sha = raw => crypto.createHash('sha256').update(raw).digest('hex');
const same = (a, b, reason) => assert(isDeepStrictEqual(a, b), reason);
const load = (root, relative) => import(pathToFileURL(path.join(root, relative)).href);
const json = async file => JSON.parse(await fs.readFile(file, 'utf8'));
const inside = (root, file) => { const rel = path.relative(root, file);
  return rel !== '' && rel !== '..' && !rel.startsWith('..' + path.sep) && !path.isAbsolute(rel); };
const exact = (value, keys) => {
  assert(value && Object.getPrototypeOf(value) === Object.prototype);
  same(Object.keys(value).sort(), [...keys].sort(), 'Exact private native input options');
};
function hour(value) {
  assert.equal(typeof value, 'string'); assert.match(value, /^\d{4}-\d{2}-\d{2}T\d{2}:00:00\.000Z$/);
  assert.equal(new Date(value).toISOString(), value); return value;
}
function git(root, ...args) {
  return execFileSync('git', ['-c', 'core.autocrlf=false', '-C', root, ...args], {
    encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], maxBuffer: 4 * 1024 * 1024, timeout: 30000,
    env: {...process.env, GIT_NO_REPLACE_OBJECTS: '1', GIT_NO_LAZY_FETCH: '1', GIT_TERMINAL_PROMPT: '0'},
  }).trim();
}
async function noLinks(file) {
  assert(path.isAbsolute(file)); let at = path.parse(file).root;
  for (const segment of path.relative(at, file).split(path.sep).filter(Boolean)) {
    at = path.join(at, segment); assert(!(await fs.lstat(at)).isSymbolicLink(), 'Private native path contains a link');
  }
}
async function read(file, maximum = 256 * 1024 * 1024) {
  await noLinks(file); const before = await fs.lstat(file, {bigint: true});
  assert(before.isFile() && before.nlink === 1n && before.size > 0n && before.size <= BigInt(maximum));
  const raw = await fs.readFile(file), after = await fs.lstat(file, {bigint: true});
  same([before.dev, before.ino, before.size, before.mtimeNs, before.ctimeNs],
    [after.dev, after.ino, after.size, after.mtimeNs, after.ctimeNs], 'Input changed while reading');
  assert.equal(BigInt(raw.length), before.size); return raw;
}
async function writeNew(file, raw) {
  await fs.mkdir(path.dirname(file), {recursive: true}); await noLinks(path.dirname(file));
  const handle = await fs.open(file, 'wx', 0o600); let first;
  try { await handle.writeFile(raw); await handle.sync(); } catch (error) { first = error; }
  try { await handle.close(); } catch (error) { first ??= error; }
  if (first) throw first; same(await read(file, Math.max(raw.length, 1024)), raw, 'Private output read-back');
}
function refuseFixtureOnly(value) {
  if (Array.isArray(value)) for (const item of value) refuseFixtureOnly(item);
  else if (value && typeof value === 'object') for (const [key, item] of Object.entries(value)) {
    assert(!['fixtureOnly', 'syntheticDetails', 'syntheticPublicProjection'].includes(key), 'Not a normal full-runtime input');
    refuseFixtureOnly(item);
  }
}

// Exact normal acquisition/admin INPUTS only. In particular no conditions,
// checkpoint, authored origin, output registry, public pack or public projection.
const ADMIN = Object.freeze(['data/zones.geojson', 'data/admin/coastline-overrides.json',
  'data/admin/direction-reviews.json', 'data/geometry-v2/active-national-coastal-parts/manifest.json',
  ...['coastal-parts.geojson', 'part-names.json', 'point-pairs.json', 'dmi-grid-proof.json']
    .map(name => 'data/geometry-v2/active-national-coastal-parts/' + name)]);
const PROVIDERS = Object.freeze(['data/live/dmi-bulk-cache.json', 'data/live/dmi-forecast-cache.json',
  '.cache/dmi-active-complete.json', '.cache/dmi-candidate-progress.json',
  '.cache/copernicus-current-shadow.json', '.cache/copernicus-current-source-stage.json',
  '.cache/copernicus-current-donor-bank.json', '.cache/copernicus-current-segment-journal.json',
  '.cache/copernicus-component-bank.json', '.cache/copernicus-component-bank.json.progress.json',
  '.cache/open-meteo-current-fallback.json', '.cache/open-meteo-current-donor-bank.json',
  '.cache/open-meteo-part-component-bank.json', '.cache/current-field-shadow.json',
  '.cache/weather-component-fallback-cursor.json', '.cache/weather-component-selection-history.json',
  'data/live/current-pilot-history.json', 'data/live/dmi-water-stations.json']);

async function copyInputs(inputRoot, outputRoot, rows, allowed) {
  assert(Array.isArray(rows) && rows.length > 0); const seen = new Set();
  for (const row of rows) {
    exact(row, ['relativePath', 'bytes', 'sha256']); const name = row.relativePath;
    assert(allowed.includes(name) && !seen.has(name), 'Only exact normal input leaves'); seen.add(name);
    assert(Number.isSafeInteger(row.bytes) && row.bytes > 0); assert.match(row.sha256, /^[a-f0-9]{64}$/);
    const source = path.join(inputRoot, name), target = path.join(outputRoot, name);
    assert(inside(inputRoot, source) && inside(outputRoot, target)); const raw = await read(source);
    same({bytes: raw.length, sha256: sha(raw)}, {bytes: row.bytes, sha256: row.sha256}, 'Actual prepared provider/admin input');
    // These are runtime input leaves in a fresh, owned Git work copy, not old
    // model code or originals. The later source-clean comparison excludes no code.
    refuseFixtureOnly(JSON.parse(raw)); await fs.mkdir(path.dirname(target), {recursive: true});
    await noLinks(path.dirname(target)); await fs.writeFile(target, raw);
    same(await read(target), raw, 'Actual copied provider/admin input');
  }
  return seen;
}

function cloneSource(head, tree, destination) {
  execFileSync('git', ['-c', 'core.autocrlf=false', 'clone', '--shared', '--no-hardlinks', '--no-checkout', ROOT, destination],
    {stdio: ['ignore', 'pipe', 'pipe'], timeout: 30000,
      env: {...process.env, GIT_NO_LAZY_FETCH: '1', GIT_NO_REPLACE_OBJECTS: '1', GIT_TERMINAL_PROMPT: '0'}});
  git(destination, '-c', 'advice.detachedHead=false', 'checkout', '--detach', head);
  assert.equal(git(destination, 'rev-parse', 'HEAD'), head);
  assert.equal(git(destination, 'rev-parse', 'HEAD^{tree}'), tree);
  assert.equal(git(destination, 'status', '--porcelain', '-uno'), '');
}
function frozenFragment(source, start, end) {
  assert.equal(source.split(start).length, 2); assert.equal(source.split(end).length, 2);
  const first = source.indexOf(start), last = source.indexOf(end, first + start.length);
  assert(last > first); const fragment = source.slice(first, last);
  assert.equal(source.slice(0, first) + fragment + source.slice(last), source, 'WHOLE unchanged frozen recipe inverse');
  return fragment;
}
// This is deliberately the OLD archival-only seed, NOT a full585 runtime.
// Reuse the preserved national test's actual OLD closures unchanged. Only
// their input registry/time axis is this host's real normal admin transport.
// No old numeric pair is admitted after the normal archive input view.
async function createArchivedOnlyOldSeed({work, inputRoot, adminInputs, registry, target, backend}) {
  const old = path.join(work, 'normal-old140000'); cloneSource(OLD_HEAD, OLD_TREE, old);
  await copyInputs(inputRoot, old, adminInputs, ADMIN);
  same(await (await load(old, 'scripts/build-public-coastal-parts-v2.mjs')).build(), registry,
    'ONE normal admin registry for old archive,585 updater and CURRENT');
  const workflow = await load(old, 'scripts/private-production-runtime-workflow.mjs');
  const bundle = await load(old, 'scripts/private-production-runtime-bundle.mjs');
  const normalS = await load(old, 'scripts/ravscore-continuation-checkpoint.mjs');
  const protectedS = await load(old, 'scripts/protected-ravscore-continuation-checkpoint.mjs');
  const protectedB = await load(old, 'scripts/protected-private-production-runtime.mjs');
  const oldI = (await load(old, 'js/core/ravscore-model-contract.js')).ravScoreModelBinding();
  const oldC = (await load(old, 'scripts/rollback-assets/ravscore-model-contract.js')).ravScoreModelBinding();
  // Authenticate actual OLD data contracts through its existing frozen factory;
  // no retagged585 tuple, altered source or historical fixture repin.
  await (await load(ROOT, 'scripts/check-last-mile-enclosure-predecessor-source.mjs'))
    .withFrozenLastMileEnclosurePredecessorSource(async frozen => {
      same(oldI, (await load(frozen, 'js/core/ravscore-model-contract.js')).ravScoreModelBinding(), 'Actual genuine OLD I');
      same(oldC, (await load(frozen, 'scripts/rollback-assets/ravscore-model-contract.js')).ravScoreModelBinding(), 'Actual genuine OLD C');
      same(await workflow.privateRuntimeContractHashes({repositoryRoot: old}),
        await (await load(frozen, 'scripts/private-production-runtime-workflow.mjs'))
          .privateRuntimeContractHashes({repositoryRoot: frozen}), 'Actual whole OLD persisted ABI');
    });
  const recipeBytes = execFileSync('git', ['-C', ROOT, 'show', HEAD585 + ':' + OLD_RECIPE],
    {stdio: ['ignore', 'pipe', 'pipe'], timeout: 30000, maxBuffer: 1024 * 1024,
      env: {...process.env, GIT_NO_LAZY_FETCH: '1', GIT_NO_REPLACE_OBJECTS: '1', GIT_TERMINAL_PROMPT: '0'}});
  assert.equal(recipeBytes.length, 64375); assert.equal(sha(recipeBytes), OLD_RECIPE_SHA);
  const recipe = recipeBytes.toString('utf8');
  const time = value => new Date(Date.parse(target) + (value - 9) * 3600000).toISOString();
  const zoneIds = Object.keys(registry.zones), parts = Object.entries(registry.zones)
    .flatMap(([zoneId, rows]) => rows.map(part => ({...part, zoneId, parentZoneId: zoneId})));
  assert.equal(zoneIds.length, 210); assert.equal(parts.length, 673);
  const conditionsBody = frozenFragment(recipe, '    function conditionsAt(hour,label){',
    "    phase='GENUINE_OLD_SEPARATE_S_AND_B';");
  const conditionsAt = Function('parts', 'integrated', 'context', 'candidate', 'point', 'oldI', 'oldC', 'zoneIds', 'time',
    conditionsBody + '\nreturn conditionsAt;')(parts,
    await load(old, 'js/core/ravscore-integrated-state-pipeline.js'), await load(old, 'scripts/lib/ravscore-sampling-context.mjs'),
    await load(old, 'js/core/ravscore-candidate-g-state-pipeline.js'), await load(old, 'scripts/lib/coastal-point-staging-contract.mjs'),
    oldI, oldC, zoneIds, time);
  const centralSource = path.join(work, 'old-central-source.json');
  const checkpointPath = path.join(work, 'old-central', CHECKPOINT);
  await writeNew(centralSource, Buffer.from(JSON.stringify(conditionsAt(7, 'central')) + '\n'));
  await normalS.saveRavScoreContinuationCheckpoint({sourcePath: centralSource, checkpointPath, repositoryRoot: old});
  const S = await protectedS.publishProtectedRavScoreContinuationCheckpoint({checkpointPath, targetReference: time(7),
    request: backend.documentRequest, rpcRequest: backend.checkpointRpc}); assert.equal(S.published, true);
  const oldConditions = conditionsAt(8, 'bundle');
  // Exactly the old recipe's nine archival inputs, including explicit OLD-only
  // fixture labels. These are never claimed as newly generated585 fullRuntime.
  for (const descriptor of workflow.PRIVATE_RUNTIME_FILES) {
    const output = path.join(old, descriptor.relativePath); await fs.mkdir(path.dirname(output), {recursive: true});
    await fs.writeFile(output, JSON.stringify(descriptor.id === 'full-conditions' ? oldConditions : {fixtureOnly: descriptor.id}) + '\n');
  }
  const privateRoot = path.join(work, 'old-private'); await fs.mkdir(privateRoot);
  const bundlePath = path.join(privateRoot, 'bundle'), spec = await workflow.buildPrivateRuntimeCreateSpec({repositoryRoot: old});
  await bundle.createPrivateProductionRuntimeBundle({repositoryRoot: old, privateRoot, bundlePath, ...spec});
  const expected = await workflow.buildPrivateRuntimeExpectation({repositoryRoot: old, targetReferenceAt: time(8), now: time(9)});
  const B = await protectedB.publishProtectedPrivateProductionRuntime({repositoryRoot: old, privateRoot, bundlePath, expected,
    now: time(9), sourceHead: OLD_HEAD, request: backend.documentRequest, storage: backend.storage}); assert.equal(B.published, true);
  const originals = path.join(work, 'old-archive-public'); await fs.mkdir(originals);
  const publicBody = frozenFragment(recipe, '    const publicDocs=new Map(', '    const originalFiles=');
  const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;
  await AsyncFunction('archiveModule', 'oldI', 'originals', 'write', 'sha', 'time', publicBody)(
    await load(ROOT, 'scripts/lib/weather-state-epoch-archive.mjs'), oldI, originals,
    async (file, value) => writeNew(file, Buffer.isBuffer(value) ? value : Buffer.from(JSON.stringify(value) + '\n')), sha, time);
  assert(Date.parse(time(7)) < Date.parse(time(8)) && Date.parse(time(8)) < Date.parse(target));
  return {privateRoot, bundlePath, checkpointPath, publicRoot: originals};
}

// Only normal HTTP transport is replaced here. The actual normal B/S/archive
// validators/producers remain the callers. No request can fall through to net.
function installOfflineTransport(backend, policy, publicManifestBytes) {
  const original = globalThis.fetch, previous = Object.fromEntries([
    'SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'RAVRADAR_PRIVATE_RUNTIME_STORAGE_BACKEND',
  ].map(key => [key, process.env[key]]));
  const address = 'https://ravradar-origin-test.invalid', key = 'SYNTHETIC_TEST_ONLY_NO_SERVICE_PRIVILEGE';
  process.env.SUPABASE_URL = address; process.env.SUPABASE_SERVICE_ROLE_KEY = key;
  process.env.RAVRADAR_PRIVATE_RUNTIME_STORAGE_BACKEND = 'supabase';
  const answer = (value, status = 200, type = 'application/json') => new Response(
    Buffer.isBuffer(value) ? value : JSON.stringify(value), {status, headers: {'content-type': type}});
  const owned = async (input, options = {}) => {
    const url = new URL(typeof input === 'string' || input instanceof URL ? input : input.url);
    const method = options.method ?? 'GET';
    if (url.href === 'https://ravradar.dk/data/live/manifest.json') {
      assert.equal(method, 'GET'); return answer(typeof publicManifestBytes==='function'?await publicManifestBytes():publicManifestBytes);
    }
    assert.equal(url.origin, address, 'No external acquisition or service request in native input production');
    const headers = new Headers(options.headers), authenticated = headers.get('apikey') === key
      && headers.get('authorization') === 'Bearer ' + key;
    if (url.pathname === '/rest/v1/admin_documents') {
      assert(authenticated); assert.equal(method, 'GET'); return answer(await backend.documentRequest(url.search));
    }
    if (url.pathname === '/storage/v1/bucket/' + encodeURIComponent(policy.bucketId)) {
      assert(authenticated); assert.equal(method, 'GET'); return answer({id: policy.bucketId, name: policy.bucketId,
        public: false, file_size_limit: policy.maximumArchiveBytes, allowed_mime_types: [policy.mimeType]});
    }
    const prefix = '/storage/v1/object/' + encodeURIComponent(policy.bucketId) + '/';
    const downloadPrefix = '/storage/v1/object/authenticated/' + encodeURIComponent(policy.bucketId) + '/';
    assert(url.pathname.startsWith(prefix) || url.pathname.startsWith(downloadPrefix), 'Unknown private fixture HTTP route');
    if (!authenticated) { assert.equal(method, 'GET'); assert(url.pathname.startsWith(downloadPrefix)); return answer({}, 403); }
    const selectedPrefix = url.pathname.startsWith(downloadPrefix) ? downloadPrefix : prefix;
    const objectPath = url.pathname.slice(selectedPrefix.length).split('/').map(decodeURIComponent).join('/');
    assert(objectPath && !objectPath.split('/').some(segment => ['.', '..', ''].includes(segment)));
    if (method === 'GET') { assert.equal(selectedPrefix, downloadPrefix);
      return answer(await backend.storage.download(objectPath), 200, policy.mimeType); }
    if (method === 'POST') {
      assert.equal(selectedPrefix, prefix);
      assert.equal(headers.get('x-upsert'), 'false'); assert(Buffer.isBuffer(options.body));
      const saved = await backend.storage.uploadImmutable(objectPath, options.body);
      return saved.created ? answer({Key: objectPath}) : answer({code: 'KeyAlreadyExists'}, 409);
    }
    assert.fail('Unknown private fixture storage method');
  };
  globalThis.fetch = owned;
  return () => {
    assert.equal(globalThis.fetch, owned); globalThis.fetch = original;
    for (const [name, value] of Object.entries(previous)) {
      if (value === undefined) delete process.env[name]; else process.env[name] = value;
    }
  };
}

async function saveNormal(root, privateRoot, backend, sourceHead, sameReferenceSuccessorEvidence) {
  const workflow = await load(root, 'scripts/private-production-runtime-workflow.mjs');
  const bundle = await load(root, 'scripts/private-production-runtime-bundle.mjs');
  const protectedB = await load(root, 'scripts/protected-private-production-runtime.mjs');
  const normalS = await load(root, 'scripts/ravscore-continuation-checkpoint.mjs');
  const protectedS = await load(root, 'scripts/protected-ravscore-continuation-checkpoint.mjs');
  const conditions = await json(path.join(root, 'data/live/conditions.json')); refuseFixtureOnly(conditions);
  assert(conditions.privateEstablishedNativeCurrentOrigin, 'Normal updater must have finalized the actual opaque origin');
  const checkpointPath = path.join(privateRoot, CHECKPOINT);
  await normalS.saveRavScoreContinuationCheckpoint({repositoryRoot: root,
    sourcePath: path.join(root, 'data/live/conditions.json'), checkpointPath});
  const spec = await workflow.buildPrivateRuntimeCreateSpec({repositoryRoot: root});
  assert(spec.files.some(row => row.relativePath === '.cache/public-hour-delivery.pack'), 'Actual normal public-hour pack is required');
  for (const row of spec.files) if (row.relativePath.endsWith('.json'))
    refuseFixtureOnly(JSON.parse(await read(path.join(root, row.relativePath))));
  const bundlePath = path.join(privateRoot, 'created'), now = conditions.generatedAt;
  const expected = await workflow.buildPrivateRuntimeExpectation({repositoryRoot: root,
    targetReferenceAt: conditions.productionReferenceAt, now});
  await bundle.createPrivateProductionRuntimeBundle({repositoryRoot: root, privateRoot, bundlePath, ...spec});
  const B = await protectedB.publishProtectedPrivateProductionRuntime({repositoryRoot: root, privateRoot,
    bundlePath, expected, now, sourceHead, request: backend.documentRequest, storage: backend.storage,
    ...(sameReferenceSuccessorEvidence ? {sameReferenceSuccessorEvidence} : {})});
  assert.equal(B.published, true);
  const S = await protectedS.publishProtectedRavScoreContinuationCheckpoint({checkpointPath,
    targetReference: conditions.productionReferenceAt, request: backend.documentRequest, rpcRequest: backend.checkpointRpc});
  assert.equal(S.published, true);
  const restored = path.join(privateRoot, 'restored');
  const result = await protectedB.restoreProtectedPrivateProductionRuntime({repositoryRoot: root, privateRoot,
    bundlePath: restored, expected, now, request: backend.documentRequest, storage: backend.storage});
  assert.equal(result.restored, true); assert.equal(result.rollbackSelected, false);
  for (const row of spec.files) same(await read(path.join(bundlePath, 'payload', row.relativePath)),
    await read(path.join(restored, 'payload', row.relativePath)), 'WHOLE actual B restore: ' + row.relativePath);
  const protectedPath = path.join(privateRoot, 'protected-S', CHECKPOINT);
  const readback = await protectedS.restoreProtectedRavScoreContinuationCheckpoint({checkpointPath: protectedPath,
    targetReference: conditions.productionReferenceAt, request: backend.documentRequest});
  assert.equal(readback.restored, true); same(await json(protectedPath), await json(checkpointPath), 'Normal S whole read-back');
  return {privateRoot, bundlePath: restored, checkpointPath, manifest: await json(path.join(restored, 'manifest.json')),
    referenceAt: conditions.productionReferenceAt, sourceHead,
    retentionCleanup:{complete:B.retentionCleanupComplete,failureCount:B.retentionCleanupFailureCount}};
}


// The existing 585 factory stays a real, immutable producer. Advance it through
// the issued native586 SAME_H0 transition, then through the issued c03 ordinary
// STRICTLY_LATER_H0 587 caller. No tuple, checkpoint, origin or ACTIVE row is
// authored here. B is always published/read back before S; original stores stay.
async function advanceGenuine585Through587({work,host585,saved585,inputRoot,adminInputs,
  successorProviderInputs,targetReferenceAt,backend,registry,initial,publicReader}) {
  const native=path.join(work,'normal586');cloneSource(HEAD586,TREE586,native);
  await copyInputs(inputRoot,native,adminInputs,ADMIN);
  same(await(await load(native,'scripts/build-public-coastal-parts-v2.mjs')).build(),registry,
    'Same normal admin registry through genuine586');
  process.chdir(native);process.env.PRIVATE_RUNTIME_REPOSITORY_ROOT=native;process.env.GITHUB_SHA=HEAD586;
  process.env.RAVRADAR_PREDECESSOR_PRIVATE_ROOT=saved585.privateRoot;
  process.env.RAVRADAR_PREDECESSOR_PRIVATE_BUNDLE=saved585.bundlePath;
  const transition=await load(native,'scripts/native-original-continuity-runtime-transition.mjs');
  const prepared=await transition.restoreAndPrepareNativeOriginalContinuityRuntimeTransition({
    request:backend.documentRequest,checkpointRequest:backend.documentRequest,storage:backend.storage,
    targetReferenceAt:saved585.referenceAt,workdir:path.join(work,'native586-metadata')});
  await transition.assertNativeOriginalContinuityRuntimeTransitionPrepared(prepared);
  await(await load(native,'scripts/private-production-runtime-workflow.mjs')).installRestoredPrivateRuntime({
    restoredRoot:prepared.outputRoot,repositoryRoot:native});
  await load(native,'scripts/generate-public-conditions.mjs');publicReader.root=native;
  const private586=path.join(work,'saved586');await fs.mkdir(private586,{recursive:false,mode:0o700});
  const saved586=await saveNormal(native,private586,backend,HEAD586,{
    predecessorManifest:saved585.manifest,migrationReport:await json(prepared.normalBReportPath)});
  assert.equal(saved586.referenceAt,saved585.referenceAt);
  assert.equal(saved586.manifest.modelBinding.modelBundleSha256,'6d8f7cca203b5f7ee5155f3c0cdb39403a02fd0eb30fecaca5070ef9f814a805');
  assert.equal(saved586.manifest.contractHashes.continuationStateContractSha256,'d2d93920aacc4be877da22c7b9e31e21426e647227a2c5018ee14b3a267500c7');
  const host587=path.join(work,initial?'normal-initial-operative587':'normal-operative587');
  cloneSource(OPERATIVE587_HEAD,OPERATIVE587_TREE,host587);
  await copyInputs(inputRoot,host587,adminInputs,ADMIN);
  same(await(await load(host587,'scripts/build-public-coastal-parts-v2.mjs')).build(),registry,
    'Same normal admin registry through genuine587');
  for(const [relative,expected]of [['js/core/ravscore-model-contract.js',SOURCE_PRODUCER_BEFORE.I],
    ['scripts/rollback-assets/ravscore-model-contract.js',SOURCE_PRODUCER_BEFORE.C]])
    assert.equal((await load(host587,relative)).ravScoreModelBinding().modelBundleSha256,expected);
  assert.equal((await(await load(host587,'scripts/private-production-runtime-workflow.mjs'))
    .privateRuntimeContractHashes({repositoryRoot:host587})).continuationStateContractSha256,SOURCE_PRODUCER_BEFORE.T);
  assert.equal(Date.parse(targetReferenceAt)-Date.parse(saved586.referenceAt),3600000,
    'The issued587 arm is STRICTLY later H0, never a same-H0 retag');
  const originalPrivate=path.join(work,'assistant586-original-private');await fs.mkdir(originalPrivate,{recursive:false,mode:0o700});
  process.chdir(host587);process.env.PRIVATE_RUNTIME_REPOSITORY_ROOT=host587;process.env.GITHUB_SHA=OPERATIVE587_HEAD;
  process.env.RAVRADAR_PRIVATE_RUNTIME_ROOT=originalPrivate;
  process.env.RAVRADAR_PRIVATE_RUNTIME_BUNDLE=path.join(originalPrivate,'bundle');
  process.env.RAVRADAR_PRODUCTION_TARGET_HOUR=targetReferenceAt;
  // A fixed synthetic ordinary request to the actual normal no-argument
  // controller; it grants no GitHub qualification/installed-production proof.
  process.env.GITHUB_WORKFLOW='Update weather and deploy RavRadar';
  process.env.GITHUB_REF='refs/heads/main';process.env.GITHUB_EVENT_NAME='workflow_dispatch';
  process.env.GITHUB_RUN_ATTEMPT='1';process.env.OPERATIONAL_ACTION='integrated';
  const assistant=await load(host587,'scripts/assistant-later-h0-runtime-transition.mjs');
  await assistant.prepareAssistantLaterH0Runtime();await assistant.installAssistantLaterH0Runtime();
  await writeNew(path.join(host587,'.cache/deployed-dmi-bulk-cache.json'),
    await read(path.join(host587,'data/live/dmi-bulk-cache.json')));
  // New provider INPUTS only, after the authenticated working view is installed.
  await copyInputs(path.join(path.dirname(ROOT),'fixture'),host587,successorProviderInputs,PROVIDERS);
  await load(host587,'scripts/update-weather.mjs');
  await load(host587,'scripts/generate-public-conditions.mjs');publicReader.root=host587;
  same(await json(path.join(host587,REGISTRY)),registry,'Actual587 normal registry unchanged');
  const private587=path.join(work,'saved587');await fs.mkdir(private587,{recursive:false,mode:0o700});
  const saved587=await saveNormal(host587,private587,backend,OPERATIVE587_HEAD);
  assert.equal(saved587.referenceAt,targetReferenceAt);
  assert.equal(saved587.manifest.modelBinding.modelBundleSha256,SOURCE_PRODUCER_BEFORE.I);
  assert.equal(saved587.manifest.contractHashes.continuationStateContractSha256,SOURCE_PRODUCER_BEFORE.T);
  return {host587,saved586,saved587};
}

/**
 * NEW native preparation, not the no-arg action and not its owner/session.
 * It CREATES the archival-only OLD140000 B/older S on the actual normal admin
 * registry, then its own full585 generation through the ACTUAL updater/public
 * producers. No external/full585 parent or handwritten NEW output is accepted.
 */
export async function produceCurrentSourceNativeInputs(options) {
  requireSourceProducerOutput(); requireSourceProducerBinding();
  assert.equal(arguments.length,1);return produceNativeInputs(options,false);
}
// Fixed synthetic OLD initialization before the CURRENT H0. This is not a
// production restart, arbitrary parent import or phase callback. Both actual
// normal585 generations and all original B/S outputs remain in their owned host.
export async function produceFrozen585NativeInitialInputs(options) {
  requireSourceProducerOutput(); requireSourceProducerBinding();
  assert.equal(arguments.length,1);return produceNativeInputs(options,true);
}
async function produceNativeInputs(options,initial) {
  requireSourceProducerOutput(); const next = requireSourceProducerBinding(); // BEFORE getters, filesystem, Git, transport or updater.
  assert.equal(arguments.length, 2); assert.equal(typeof initial,'boolean');
  exact(options, ['profile','workRoot','inputRoot','adminInputs','providerInputs','targetReferenceAt',
    'forwardProviderInputs','successorProviderInputs','successorTargetReferenceAt']);
  assert.equal(options.profile,initial?'current-source-native-initial':'current-source-native'); assert.equal(process.platform, 'linux');
  assert.equal(Number(process.versions.node.split('.')[0]), 24);
  for (const name of ['RAVRADAR_ARCHIVED_WEATHER_RESTART_CONTEXT_PATH', 'RAVRADAR_ARCHIVED_WEATHER_RESTART_CONTEXT_SHA256',
    'RAVRADAR_CURRENT_FAMILY_COLD_START_CONTEXT_PATH', 'RAVRADAR_CURRENT_FAMILY_COLD_START_CONTEXT_SHA256',
    'RAVRADAR_WEATHER_STATE_EPOCH_CONTEXT_PATH', 'RAVRADAR_WEATHER_STATE_EPOCH_CONTEXT_SHA256',
    'RAVRADAR_DMI_LEGACY_CURRENT_EXPECTATION', 'DMI_PART_CONTINUITY_DONOR_PATH',
    'RAVRADAR_SAVED_CURRENT_REPLAY_DIAGNOSTIC', 'RAVRADAR_SAVED_CURRENT_FORWARD_ORIGINAL_PLAN',
    'RAVSCORE_HISTORICAL_WAVE_TRANSITION_PATH']) assert(process.env[name] === undefined, 'No ambient exceptional mode: ' + name);
  const finalTarget=hour(options.targetReferenceAt),successorTarget=hour(options.successorTargetReferenceAt);
  assert.equal(Date.parse(successorTarget)-Date.parse(finalTarget),3600000,'Genuine587 follows real585/586 H1 by one hour');
  const target=new Date(Date.parse(finalTarget)-48*3600000).toISOString();
  const work=path.resolve(options.workRoot),inputRoot=path.resolve(options.inputRoot);
  assert(path.isAbsolute(options.workRoot) && path.isAbsolute(options.inputRoot));
  assert(!inside(ROOT, work) && work !== ROOT && !inside(inputRoot, work) && !inside(work, inputRoot));
  assert(path.isAbsolute(process.env.RUNNER_TEMP ?? ''), 'Existing native host must own RUNNER_TEMP');
  const runner = await fs.realpath(process.env.RUNNER_TEMP), own = path.dirname(ROOT);
  assert.equal(path.basename(ROOT), 'current-source-native', 'Explicit new case in the existing actual_case seam');
  assert(path.basename(own).startsWith('rr-source19-union-native-'), 'Existing normal native test owns this host');
  await noLinks(own); assert.equal(await fs.realpath(ROOT), ROOT);
  // Preserve the SDK proposal's exact working_root/runner-temp transport path.
  // The normal metadata migrator separately REQUIRES workdir outside code ROOT;
  // its inputs/work therefore live beside, not below, this action checkout.
  assert.equal(runner, path.join(ROOT, 'runner-temp'), 'Same physical action/tail/SDK RUNNER_TEMP');
  assert.equal(work,path.join(own,initial?'current-source-native-initial-inputs':'current-source-native-inputs'),
    'One fixed new sibling under existing native ownership');
  assert.equal(inputRoot,path.join(own,'fixture-initial-h0'),'Exact genuine585 H0 provider fixture directory');
  for(const name of ['fixture-initial-h1','fixture']){const forwardRoot=path.join(own,name);await noLinks(forwardRoot);
    assert.equal(await fs.realpath(forwardRoot),forwardRoot);}
  await noLinks(path.dirname(work)); await noLinks(inputRoot); await fs.mkdir(work, {recursive: false, mode: 0o700});
  const workStat = await fs.lstat(work, {bigint: true}), currentHead = git(ROOT, 'rev-parse', 'HEAD');
  assert.match(currentHead, /^[a-f0-9]{40}$/); assert.equal(git(ROOT, 'diff', '--name-only', 'HEAD'), '', 'Committed CURRENT source only');
  const beforeEnv = {...process.env}, beforeCwd = process.cwd(), beforeFetch = globalThis.fetch; let restoreTransport, first;
  const closedFetch = async () => { throw new Error('CURRENT_NATIVE_INPUT_EXTERNAL_REQUEST_REFUSED'); };
  globalThis.fetch = closedFetch;
  try {
    const backend = (await load(ROOT, 'scripts/lib/established-native-current-origin-test-transports.mjs')).normalBAndSTransports();
    const policy = (await load(ROOT, 'scripts/protected-private-production-runtime.mjs')).PROTECTED_PRIVATE_RUNTIME_POLICY;
    // The genuine frozen DATA factory proves the unchanged585 source contracts.
    // Its limited assertion-only module closure is NOT passed off as a full
    // updater host. The latter is a separate complete clone of the SAME commit.
    await (await load(ROOT, 'scripts/check-source-producer-predecessor-source.mjs'))
      .withAuthenticated585PredecessorSource(async frozen => {
        const binding = (await load(frozen, 'scripts/lib/account-statistics-assistant-successor-source.mjs'))
          .requireAccountStatisticsAssistantBinding();
        const nativeBefore=(await load(ROOT,'scripts/lib/native-original-continuity-successor-source.mjs')).NATIVE_ORIGINAL_CONTINUITY_BEFORE;
        for (const key of ['C','I','T']) assert.equal(binding[key],nativeBefore[key],'Actual585 family, never retagged587');
      });
    const producerHead=OPERATIVE_INITIAL_HEAD,producerTree=OPERATIVE_INITIAL_TREE;
    const host585=path.join(work,'normal-initial-operative585');
    const before585=(await load(ROOT,'scripts/lib/native-original-continuity-successor-source.mjs')).NATIVE_ORIGINAL_CONTINUITY_BEFORE;
    cloneSource(producerHead,producerTree,host585);
    {
      git(ROOT,'merge-base','--is-ancestor',producerHead,currentHead);
      const I=(await load(host585,'js/core/ravscore-model-contract.js')).ravScoreModelBinding();
      const C=(await load(host585,'scripts/rollback-assets/ravscore-model-contract.js')).ravScoreModelBinding();
      assert.equal(I.modelBundleSha256,before585.I);
      assert.equal(C.modelBundleSha256,before585.C);
      const contracts=await(await load(host585,'scripts/private-production-runtime-workflow.mjs'))
        .privateRuntimeContractHashes({repositoryRoot:host585});
      assert.equal(contracts.continuationStateContractSha256,before585.T);
    }
    await copyInputs(inputRoot, host585, options.adminInputs, ADMIN);
    const registry585 = await (await load(host585, 'scripts/build-public-coastal-parts-v2.mjs')).build();
    assert.equal(registry585.zoneCount, 210); assert.equal(registry585.partCount, 673);
    same(JSON.parse(await read(path.join(ROOT, REGISTRY))), registry585, 'Same actual normal admin registry in CURRENT and585');
    const archiveSeed = await createArchivedOnlyOldSeed({work, inputRoot, adminInputs: options.adminInputs,
      registry: registry585, target, backend});
    const publicReader={root:archiveSeed.publicRoot};
    restoreTransport = installOfflineTransport(backend,policy,()=>read(path.join(publicReader.root,'manifest.json'),1024*1024));
    const oldRoot = path.join(work, 'archive-original-private'); await fs.mkdir(oldRoot);
    process.env.RAVRADAR_PRIVATE_RUNTIME_ROOT = oldRoot; process.env.RAVRADAR_PRIVATE_RUNTIME_BUNDLE = path.join(oldRoot, 'bundle');
    process.env.GITHUB_SHA = producerHead; process.env.PRIVATE_RUNTIME_REPOSITORY_ROOT = host585;
    const archive = await (await load(host585, 'scripts/archived-weather-restart.mjs')).prepareArchivedWeatherRestart({
      workRoot: path.join(work, 'restart'), publicRoot: archiveSeed.publicRoot, targetReferenceAt: target});
    // The normal archive installer may restore provider inputs. Only AFTER it
    // has preserved originals do we stage this generation's actual new inputs.
    const providers = await copyInputs(inputRoot, host585, options.providerInputs, PROVIDERS);
    for (const name of ['data/live/dmi-bulk-cache.json', 'data/live/dmi-forecast-cache.json',
      '.cache/copernicus-current-shadow.json', '.cache/open-meteo-current-fallback.json',
      'data/live/current-pilot-history.json', 'data/live/dmi-water-stations.json'])
      assert(providers.has(name), 'Real normal provider input must replace OLD archival placeholder: ' + name);
    process.env.RAVRADAR_WEATHER_CACHE_ONLY = 'true'; process.env.RAVRADAR_REQUIRE_PRIVATE_WEATHER_BASELINE = 'true';
    process.env.RAVRADAR_PRODUCTION_TARGET_HOUR = target;
    process.env.RAVRADAR_ARCHIVED_WEATHER_RESTART_CONTEXT_PATH = archive.contextPath;
    process.env.RAVRADAR_ARCHIVED_WEATHER_RESTART_CONTEXT_SHA256 = archive.contextSha256;
    // Any ambient exceptional mode must be absent, never silently reset to
    // make this case pass. These are the actual normal updater's own gates.
    for (const name of ['CHECKPOINT_ONLY', 'RAVRADAR_WEATHER_STATE_EPOCH_BOOTSTRAP',
      'RAVSCORE_STATELESS_INTEGRATED_COLD_START_ALLOWED', 'RAVSCORE_FIRST_CUTOVER_SOURCE_VALIDATED'])
      assert([undefined, 'false'].includes(process.env[name]), 'No ambient exceptional mode: ' + name);
    assert(process.env.RAVSCORE_FIRST_CUTOVER_BOOTSTRAP_MODE === undefined);
    process.chdir(host585);
    await load(host585, 'scripts/update-weather.mjs');
    await load(host585, 'scripts/generate-public-conditions.mjs');
    same(await json(path.join(host585, REGISTRY)), registry585, 'Registry unchanged through normal updater/public');
    const private585 = path.join(work, 'saved585'); await fs.mkdir(private585);
    let saved585 = await saveNormal(host585, private585, backend, producerHead);
    const first585=saved585;
    assert.equal(saved585.manifest.modelBinding.modelBundleSha256, before585.I);
    assert.equal(saved585.manifest.contractHashes.continuationStateContractSha256, before585.T);
    {
      // Same normal restore/install/readback callers as the ordinary follower;
      // no state field, previous hour, score or READY bit is authored here.
      const workflow585=await load(host585,'scripts/private-production-runtime-workflow.mjs');
      // The protected B result contains manifest.json+payload. Authenticate
      // that original B, then pass only its normal flat payload inventory to
      // the installer, as the ordinary archive consumer already does.
      const bundle585=await load(host585,'scripts/private-production-runtime-bundle.mjs');
      const parentManifest=saved585.manifest;
      const verifiedParent=await bundle585.verifyPrivateProductionRuntimeBundle({
        privateRoot:saved585.privateRoot,bundlePath:saved585.bundlePath,repositoryRoot:host585,
        expected:{modelBinding:parentManifest.modelBinding,contractHashes:parentManifest.contractHashes,
          datasetId:parentManifest.datasetId,productionReferenceAt:parentManifest.productionReferenceAt,
          bundleContentSha256:parentManifest.bundleContentSha256}});
      assert.equal(verifiedParent.verified,true);
      same(verifiedParent.manifest,parentManifest,'Whole actual saved585 B manifest');
      await workflow585.installRestoredPrivateRuntime({restoredRoot:path.join(verifiedParent.bundlePath,'payload'),repositoryRoot:host585});
      const protectedS585=await load(host585,'scripts/protected-ravscore-continuation-checkpoint.mjs');
      const restoredS=await protectedS585.restoreProtectedRavScoreContinuationCheckpoint({
        checkpointPath:path.join(host585,CHECKPOINT),targetReference:finalTarget,request:backend.documentRequest});
      assert.equal(restoredS.restored,true);
      // The real workflow preserves exactly these existing bytes before new
      // provider inputs. No reconstructed numeric donor is invented.
      const oldBulk=await read(path.join(host585,'data/live/dmi-bulk-cache.json'));
      await writeNew(path.join(host585,'.cache/deployed-dmi-bulk-cache.json'),oldBulk);
      publicReader.root=host585;
      assert.equal(process.env.RAVRADAR_ARCHIVED_WEATHER_RESTART_CONTEXT_PATH,archive.contextPath);
      assert.equal(process.env.RAVRADAR_ARCHIVED_WEATHER_RESTART_CONTEXT_SHA256,archive.contextSha256);
      delete process.env.RAVRADAR_ARCHIVED_WEATHER_RESTART_CONTEXT_PATH;
      delete process.env.RAVRADAR_ARCHIVED_WEATHER_RESTART_CONTEXT_SHA256;
      await copyInputs(path.join(own,'fixture-initial-h1'),host585,options.forwardProviderInputs,PROVIDERS);
      process.env.RAVRADAR_PRODUCTION_TARGET_HOUR=finalTarget;
      // Native test-only fixed second invocation. Ordinary module source and
      // all model/state contracts stay identical; query avoids ESM run caching.
      await import(pathToFileURL(path.join(host585,'scripts/update-weather.mjs')).href+'?source-native-initial-forward');
      await import(pathToFileURL(path.join(host585,'scripts/generate-public-conditions.mjs')).href+'?source-native-initial-forward');
      same(await json(path.join(host585,REGISTRY)),registry585,'Same normal registry through both585 generations');
      const forwardPrivate=path.join(work,'saved585-forward');await fs.mkdir(forwardPrivate);
      saved585=await saveNormal(host585,forwardPrivate,backend,producerHead);
      assert.equal(saved585.referenceAt,finalTarget);
      assert.equal(saved585.manifest.modelBinding.modelBundleSha256,before585.I);
    }
    const {host587,saved586,saved587}=await advanceGenuine585Through587({work,host585,saved585,inputRoot,
      adminInputs:options.adminInputs,successorProviderInputs:options.successorProviderInputs,
      targetReferenceAt:successorTarget,backend,registry:registry585,initial,publicReader});
    if(initial)return Object.freeze({profile:'current-source-native-initial',workRoot:work,sourceRoot:host587,
      first585,saved585,saved586,saved587,referenceAt:successorTarget,initialReferenceAt:target,
      frozen585ForwardReferenceAt:finalTarget,
      archiveContextPath:archive.contextPath,archiveContextSha256:archive.contextSha256,
      registry:structuredClone(registry585),documents:backend.documents,objects:backend.objects,
      events:[...backend.events],normalNationalRollbackQualified:false,initialCentralActivation:'UNRUN',
      actionInvoked:false,sdkInvoked:false,sourceOwnerIssued:false,wholeSourceIntegrationProved:false,productionProof:false});
    process.chdir(ROOT); process.env.PRIVATE_RUNTIME_REPOSITORY_ROOT = ROOT; process.env.GITHUB_SHA = currentHead;
    process.env.RAVRADAR_PREDECESSOR_PRIVATE_ROOT = saved587.privateRoot;
    process.env.RAVRADAR_PREDECESSOR_PRIVATE_BUNDLE = saved587.bundlePath;
    const transition = await load(ROOT, 'scripts/source-producer-runtime-transition.mjs');
    const prepared = await transition.restoreAndPrepareSourceProducerRuntimeTransition({
      request: backend.documentRequest, checkpointRequest: backend.documentRequest, storage: backend.storage,
      targetReferenceAt: successorTarget, workdir: path.join(work, 'source-metadata')});
    await transition.assertSourceProducerRuntimeTransitionPrepared(prepared);
    const workflow = await load(ROOT, 'scripts/private-production-runtime-workflow.mjs');
    await workflow.installRestoredPrivateRuntime({restoredRoot: prepared.outputRoot, repositoryRoot: ROOT});
    const privateCurrent = path.join(work, 'saved-current'); await fs.mkdir(privateCurrent);
    const current = await saveNormal(ROOT, privateCurrent, backend, currentHead, {
      predecessorManifest: saved587.manifest, migrationReport: await json(prepared.normalBReportPath),
    });
    assert.equal(current.manifest.modelBinding.modelBundleSha256, next.I);
    assert.equal(current.manifest.contractHashes.continuationStateContractSha256, next.T);
    same(await json(path.join(ROOT, REGISTRY)), registry585, 'Same registry retained through actual CURRENT B/S');
    same([workStat.dev, workStat.ino], await fs.lstat(work, {bigint: true}).then(s => [s.dev, s.ino]), 'Owned host directory unchanged');
    // This is normal producer input data for the SAME native host, not an owner
    // token, phase completion or positive whole-SOURCE/SDK/PG/production result.
    return Object.freeze({profile: 'current-source-native', workRoot: work, current, first585, saved585, saved586, saved587,
      archiveContextPath: archive.contextPath, archiveContextSha256: archive.contextSha256,
      registry: structuredClone(registry585), documents: backend.documents, objects: backend.objects,
      events: [...backend.events], actionInvoked: false, sdkInvoked: false, sourceOwnerIssued: false,
      wholeSourceIntegrationProved: false, productionProof: false});
  } catch (error) { first = error; throw error; }
  finally {
    let cleanupFailure;
    const clean = operation => { try { operation(); } catch (error) { cleanupFailure ??= error; } };
    clean(() => process.chdir(beforeCwd)); clean(() => restoreTransport?.());
    clean(() => { assert.equal(globalThis.fetch, closedFetch, 'Restore only this native preparation fetch owner'); globalThis.fetch = beforeFetch; });
    clean(() => {
      for (const name of Object.keys(process.env)) if (!Object.hasOwn(beforeEnv, name)) delete process.env[name];
      for (const [name, value] of Object.entries(beforeEnv)) process.env[name] = value;
    });
    // Keep the actual owned archive, originals and first failure for the native
    // caller's existing archival/cleanup lifecycle; never delete inputs here.
    if (cleanupFailure && first) Object.defineProperty(first, 'nativeInputCleanupFailure', {value: cleanupFailure});
    else if (cleanupFailure) throw cleanupFailure;
  }
}

// Explicit new native fixture preparer, not a SOURCE controller. The existing
// Python actual_case can invoke this one CLI after creating its owned checkout
// and provider fixture. Its old cases/operand056 need no changed input format.
export async function prepareCurrentSourceNativeProfile() {
  requireSourceProducerOutput(); requireSourceProducerBinding(); // BEFORE argv or any input I/O.
  assert.equal(arguments.length, 0); assert.equal(process.platform, 'linux');
  assert.equal(Number(process.versions.node.split('.')[0]), 24);
  const own = path.dirname(ROOT); assert.equal(path.basename(ROOT), 'current-source-native');
  assert(path.basename(own).startsWith('rr-source19-union-native-')); await noLinks(own);
  const h0=await json(path.join(own,'fixture-initial-h0/current-source-native-options.json'));
  const h1=await json(path.join(own,'fixture-initial-h1/current-source-native-options.json'));
  const next=await json(path.join(own,'fixture/current-source-native-options.json'));
  same(h0.adminInputs,h1.adminInputs,'Same genuine585 H0/H1 registry');same(h0.adminInputs,next.adminInputs,'Same actual587 registry');
  assert.equal(h0.targetReferenceAt,h1.targetReferenceAt);
  assert.equal(Date.parse(next.targetReferenceAt)-Date.parse(h1.targetReferenceAt),3600000);
  const options={...h0,profile:'current-source-native',workRoot:path.join(own,'current-source-native-inputs'),
    forwardProviderInputs:h1.providerInputs,successorProviderInputs:next.providerInputs,
    successorTargetReferenceAt:next.targetReferenceAt};
  const produced = await produceCurrentSourceNativeInputs(options), outputRoot = path.join(produced.workRoot, 'transport');
  await fs.mkdir(outputRoot, {recursive: false, mode: 0o700});
  const objectRows = [];
  for (const [objectPath, raw] of produced.objects) {
    assert(Buffer.isBuffer(raw)); const relativePath = 'objects/' + sha(Buffer.from(objectPath)) + '.bin';
    await writeNew(path.join(outputRoot, relativePath), raw);
    objectRows.push({objectPath, relativePath, bytes: raw.length, sha256: sha(raw)});
  }
  // Values are the ACTUAL normal producer outputs, not caller-authored pointer,
  // state, origin, publicPack, SQL read-back, action result or success receipt.
  const inputs = {schemaVersion: 1, profile: produced.profile, sourceHead: produced.current.sourceHead,
    target: produced.current.referenceAt, registry: produced.registry,
    documents: Object.fromEntries(produced.documents), objectRows,
    current: {privateRoot: produced.current.privateRoot, bundlePath: produced.current.bundlePath,
      checkpointPath: produced.current.checkpointPath},
    actionInvoked: false, sdkInvoked: false, sourceOwnerIssued: false,
    wholeSourceIntegrationProved: false, productionProof: false};
  const raw = Buffer.from(JSON.stringify(inputs) + '\n'), file = path.join(outputRoot, 'current-normal-inputs.json');
  await writeNew(file, raw);
  return Object.freeze({file, bytes: raw.length, sha256: sha(raw), actionInvoked: false, productionProof: false});
}
// Appended to the existing normal-input producer, not a second producer or
// an origin/owner issuer. Both CLI paths remain behind the same own-family gate.
async function serializeNativeInputs(produced, initial) {
  const selected=initial?produced.saved587:produced.current;
  const outputRoot=path.join(produced.workRoot,'transport');
  await fs.mkdir(outputRoot,{recursive:false,mode:0o700});
  const objectRows=[];
  for(const [objectPath,raw] of produced.objects){
    assert(Buffer.isBuffer(raw));const relativePath='objects/'+sha(Buffer.from(objectPath))+'.bin';
    await writeNew(path.join(outputRoot,relativePath),raw);
    objectRows.push({objectPath,relativePath,bytes:raw.length,sha256:sha(raw)});
  }
  const saved=row=>({privateRoot:row.privateRoot,bundlePath:row.bundlePath,
    checkpointPath:row.checkpointPath,sourceHead:row.sourceHead,referenceAt:row.referenceAt});
  const inputs={schemaVersion:1,profile:produced.profile,sourceHead:selected.sourceHead,
    target:selected.referenceAt,registry:produced.registry,
    documents:Object.fromEntries(produced.documents),objectRows,
    ...(initial?{sourceRoot:produced.sourceRoot,first585:saved(produced.first585),
      saved585:saved(produced.saved585),saved586:saved(produced.saved586),saved587:saved(produced.saved587),
      initialReferenceAt:produced.initialReferenceAt,frozen585ForwardReferenceAt:produced.frozen585ForwardReferenceAt,
      archiveContextPath:produced.archiveContextPath,archiveContextSha256:produced.archiveContextSha256}
      :{current:{...saved(produced.current),retentionCleanup:produced.current.retentionCleanup}}),
    actionInvoked:false,sdkInvoked:false,sourceOwnerIssued:false,
    wholeSourceIntegrationProved:false,productionProof:false};
  const raw=Buffer.from(JSON.stringify(inputs)+'\n');
  const file=path.join(outputRoot,initial?'initial-normal-inputs.json':'current-normal-inputs.json');
  await writeNew(file,raw);
  return Object.freeze({file,bytes:raw.length,sha256:sha(raw),actionInvoked:false,productionProof:false});
}

export async function prepareCurrentSourceNativeInitialProfile(){
  requireSourceProducerOutput();requireSourceProducerBinding();
  assert.equal(arguments.length,0);assert.equal(process.platform,'linux');
  assert.equal(Number(process.versions.node.split('.')[0]),24);
  const own=path.dirname(ROOT);assert.equal(path.basename(ROOT),'current-source-native');
  assert(path.basename(own).startsWith('rr-source19-union-native-'));await noLinks(own);
  const h0=JSON.parse(await read(path.join(own,'fixture-initial-h0/current-source-native-options.json'),1024*1024));
  const h1=JSON.parse(await read(path.join(own,'fixture-initial-h1/current-source-native-options.json'),1024*1024));
  same(h0.adminInputs,h1.adminInputs,'One exact normal admin input registry through H0/H1');
  assert.equal(h0.profile,'current-source-native-initial');assert.equal(h1.profile,h0.profile);
  assert.equal(h0.targetReferenceAt,h1.targetReferenceAt);
  assert.equal(path.resolve(h0.inputRoot),path.join(own,'fixture-initial-h0'));
  assert.equal(path.resolve(h1.inputRoot),path.join(own,'fixture-initial-h1'));
  assert.equal(h0.workRoot,h1.workRoot);
  const successor=await json(path.join(own,'fixture/current-source-native-options.json'));
  same(h0.adminInputs,successor.adminInputs,'One exact admin registry for the real587 ordinary update');
  assert.equal(Date.parse(successor.targetReferenceAt)-Date.parse(h1.targetReferenceAt),3600000);
  const produced=await produceFrozen585NativeInitialInputs({...h0,forwardProviderInputs:h1.providerInputs,
    successorProviderInputs:successor.providerInputs,successorTargetReferenceAt:successor.targetReferenceAt});
  assert.equal(Date.parse(produced.saved585.referenceAt)-Date.parse(produced.initialReferenceAt),48*3600000);
  assert.equal(Date.parse(produced.referenceAt)-Date.parse(produced.saved586.referenceAt),3600000);
  assert.equal(produced.saved585.sourceHead,OPERATIVE_INITIAL_HEAD);
  assert.equal(produced.saved586.sourceHead,HEAD586);assert.equal(produced.saved587.sourceHead,OPERATIVE587_HEAD);
  return serializeNativeInputs(produced,true);
}

// Normal metadata successor of the EXACT already initialized H1 B/S. Do NOT
// rebuild H1 from a fresh archive or rerun the updater: that loses the prefix.
export async function prepareCurrentSourceNativeFromInitialProfile(){
  requireSourceProducerOutput();const next=requireSourceProducerBinding();
  assert.equal(arguments.length,0);assert.equal(process.platform,'linux');
  assert.equal(Number(process.versions.node.split('.')[0]),24);
  const own=path.dirname(ROOT);assert.equal(path.basename(ROOT),'current-source-native');
  assert(path.basename(own).startsWith('rr-source19-union-native-'));await noLinks(own);await noLinks(ROOT);
  assert.equal(await fs.realpath(ROOT),ROOT);
  assert.equal(await fs.realpath(process.env.RUNNER_TEMP??''),path.join(ROOT,'runner-temp'));
  assert.match(process.env.HTTPS_PROXY??'',/^http:\/\/127\.0\.0\.1:[1-9][0-9]{0,4}$/);
  assert.equal(process.env.NODE_USE_ENV_PROXY,'1');
  assert.equal(process.env.SUPABASE_URL,'https://fixture.invalid');
  assert.equal(process.env.SUPABASE_SERVICE_ROLE_KEY,'sb_secret_source19_synthetic');
  const initialRoot=path.join(own,'current-source-native-initial-inputs');await noLinks(initialRoot);
  const initialFile=path.join(initialRoot,'transport/initial-normal-inputs.json');
  const initialBytes=await read(initialFile,32*1024*1024),initial=JSON.parse(initialBytes);
  assert.equal(initial.profile,'current-source-native-initial');assert.equal(initial.sourceHead,OPERATIVE587_HEAD);
  const target=hour(initial.target);assert.equal(Date.parse(target)-Date.parse(initial.initialReferenceAt),49*3600000);
  assert.equal(Date.parse(initial.frozen585ForwardReferenceAt)-Date.parse(initial.initialReferenceAt),48*3600000);
  assert.equal(initial.sourceRoot,path.join(initialRoot,'normal-initial-operative587'));
  const savedRoot=path.join(initialRoot,'saved587');
  same(initial.saved587,{privateRoot:savedRoot,bundlePath:path.join(savedRoot,'restored'),
    checkpointPath:path.join(savedRoot,CHECKPOINT),sourceHead:OPERATIVE587_HEAD,referenceAt:target},
    'Only actual saved prefix H1 output, never a caller-selected parent');
  for(const file of [initial.sourceRoot,savedRoot,initial.saved587.bundlePath,initial.saved587.checkpointPath])await noLinks(file);
  assert.equal(git(initial.sourceRoot,'rev-parse','HEAD'),OPERATIVE587_HEAD);
  assert.equal(git(initial.sourceRoot,'rev-parse','HEAD^{tree}'),OPERATIVE587_TREE);
  const currentHead=git(ROOT,'rev-parse','HEAD');assert.match(currentHead,/^[a-f0-9]{40}$/);
  assert.equal(git(ROOT,'diff','--name-only','HEAD'),'');
  git(ROOT,'merge-base','--is-ancestor',OPERATIVE587_HEAD,currentHead);
  const work=path.join(own,'current-source-native-inputs');
  await fs.mkdir(work,{recursive:false,mode:0o700});const identity=await fs.lstat(work,{bigint:true});
  const beforeEnv={...process.env},beforeCwd=process.cwd();let first;
  try{
    const B=await load(ROOT,'scripts/protected-private-production-runtime.mjs');
    const S=await load(ROOT,'scripts/protected-ravscore-continuation-checkpoint.mjs');
    const clients=B.createProtectedPrivateRuntimeClients({storageBackend:'supabase'});
    const checkpointRequest=S.createProtectedRavScoreCheckpointRequester();
    const backend={...clients,checkpointRpc:S.createProtectedRavScoreCheckpointRpcRequester()};
    for(const [name,row] of Object.entries(initial.documents)){
      assert(['ravscore-private-production-runtime-pointer','ravscore-continuation-checkpoint'].includes(name));
      const rows=await clients.documentRequest('?document_key=eq.'+encodeURIComponent(name)+'&select=document_key,payload,version&limit=2');
      same(rows,[row],'Genuine prefix B/S still selected after normal initial activation');
    }
    same(await json(path.join(ROOT,REGISTRY)),initial.registry,'Same normal CURRENT registry before metadata transition');
    const sourceManifest=await json(path.join(initial.saved587.bundlePath,'manifest.json'));
    assert.equal(sourceManifest.modelBinding.modelBundleSha256,SOURCE_PRODUCER_BEFORE.I);
    process.chdir(ROOT);process.env.PRIVATE_RUNTIME_REPOSITORY_ROOT=ROOT;process.env.GITHUB_SHA=currentHead;
    process.env.RAVRADAR_PREDECESSOR_PRIVATE_ROOT=savedRoot;
    process.env.RAVRADAR_PREDECESSOR_PRIVATE_BUNDLE=initial.saved587.bundlePath;
    const transition=await load(ROOT,'scripts/source-producer-runtime-transition.mjs');
    const prepared=await transition.restoreAndPrepareSourceProducerRuntimeTransition({
      request:clients.documentRequest,checkpointRequest,storage:clients.storage,
      targetReferenceAt:target,workdir:path.join(work,'source-metadata')});
    await transition.assertSourceProducerRuntimeTransitionPrepared(prepared);
    const workflow=await load(ROOT,'scripts/private-production-runtime-workflow.mjs');
    await workflow.installRestoredPrivateRuntime({restoredRoot:prepared.outputRoot,repositoryRoot:ROOT});
    const privateCurrent=path.join(work,'saved-current');await fs.mkdir(privateCurrent,{recursive:false,mode:0o700});
    const current=await saveNormal(ROOT,privateCurrent,backend,currentHead,{
      predecessorManifest:sourceManifest,migrationReport:await json(prepared.normalBReportPath)});
    assert.equal(current.referenceAt,target);assert.equal(current.manifest.modelBinding.modelBundleSha256,next.I);
    assert.equal(current.manifest.contractHashes.continuationStateContractSha256,next.T);
    const documents=new Map();
    for(const name of ['ravscore-private-production-runtime-pointer','ravscore-continuation-checkpoint']){
      const rows=await clients.documentRequest('?document_key=eq.'+encodeURIComponent(name)+'&select=document_key,payload,version&limit=2');
      assert.equal(rows.length,1);assert.equal(rows[0].document_key,name);documents.set(name,rows[0]);
    }
    const pointer=B.validateProtectedPrivateRuntimePointer(documents.get('ravscore-private-production-runtime-pointer').payload);
    assert.equal(pointer.current.sourceHead,currentHead);assert.equal(pointer.current.productionReferenceAt,target);
    assert.equal(pointer.current.bundleContentSha256,current.manifest.bundleContentSha256);
    const objects=new Map();
    for(const descriptor of [pointer.current,pointer.previous].filter(Boolean)){
      const rows=descriptor.objects??[{objectPath:descriptor.objectPath,objectBytes:descriptor.objectBytes,
        objectSha256:descriptor.objectSha256}];
      for(const row of rows){
        const raw=await clients.storage.download(row.objectPath);
        same({bytes:raw.length,sha256:sha(raw)},{bytes:row.objectBytes,sha256:row.objectSha256},'Normal TLS stored object readback');
        if(objects.has(row.objectPath))same(objects.get(row.objectPath),raw);else objects.set(row.objectPath,raw);
      }
    }
    same(await json(path.join(ROOT,REGISTRY)),initial.registry,'Same normal registry after CURRENT B/S');
    same(await read(initialFile,32*1024*1024),initialBytes,'Retained original initial transport metadata');
    same([identity.dev,identity.ino],await fs.lstat(work,{bigint:true}).then(s=>[s.dev,s.ino]),'Same exclusive CURRENT output');
    return serializeNativeInputs({profile:'current-source-native',workRoot:work,current,registry:initial.registry,
      documents,objects},false);
  }catch(error){first=error;throw error;}
  finally{
    let failure;try{process.chdir(beforeCwd);
      for(const name of Object.keys(process.env))if(!Object.hasOwn(beforeEnv,name))delete process.env[name];
      for(const [name,value]of Object.entries(beforeEnv))process.env[name]=value;
    }catch(error){failure=error;}
    if(failure&&first)Object.defineProperty(first,'nativeInputCleanupFailure',{value:failure});else if(failure)throw failure;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  requireSourceProducerOutput(); requireSourceProducerBinding();
  assert.equal(process.argv.length,3);
  const mode=process.argv[2];assert(['--prepare-current-profile','--prepare-initial-profile','--prepare-current-from-initial-profile'].includes(mode));
  console.log(JSON.stringify(await(mode==='--prepare-initial-profile'?prepareCurrentSourceNativeInitialProfile():
    mode==='--prepare-current-from-initial-profile'?prepareCurrentSourceNativeFromInitialProfile():prepareCurrentSourceNativeProfile())));
}
