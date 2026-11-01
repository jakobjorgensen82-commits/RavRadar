import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { spawn, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import { validateExactDmiOriginalRestorePlan, validateExactDmiOriginalRestorePreparation }
  from './run-exact-dmi-original-restore.mjs';

import {canonicalSavedDmiOriginalCapture} from './lib/saved-dmi-original-capture.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const sha = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const canonical = value => JSON.stringify(value, (_key, item) =>
  item && typeof item === 'object' && !Array.isArray(item)
    ? Object.fromEntries(Object.keys(item).sort().map(key => [key, item[key]])) : item);
const currentHead = 'b'.repeat(40);
function fixturePlan() {
  const originals = [{ acquiredAt: '2026-10-10T02:01:00.000Z', assetIdentitySha256: 'a'.repeat(64),
    assetSizeBytes: 8, collection: 'dkss_nsbs', contentLengthBytes: 8, contentSha256: 'c'.repeat(64),
    itemCreatedAt: '2026-10-10T02:00:00.000Z', itemId: 'synthetic-old-original',
    itemUpdatedAt: '2026-10-10T02:00:00.000Z', modelRun: '2026-10-10T00:00:00.000Z',
    validTime: '2026-10-10T01:00:00.000Z' }];
  return { schemaVersion: 1, contractId: 'dmi-exact-original-restore-v1', binding: {
    progressSource: '38692413809-1',
    progressCacheKey: 'weather-private-progress-encrypted-v2-Linux-main-38692413809-1',
    targetReferenceAt: '2026-10-14T18:00:00.000Z', sourceHead: 'a'.repeat(40), executionHead: currentHead,
    protectedBundleSha256: '1'.repeat(64), protectedDatasetId: 'rr-synthetic-original',
    protectedProductionReferenceAt: '2026-10-10T02:00:00.000Z', protectedGeneratedAt: '2026-10-10T02:01:00.000Z',
    modelBindingSha256: '2'.repeat(64), historyDemandSha256: '3'.repeat(64),
    originalsSha256: sha(canonical(originals)), nonce: '4'.repeat(32),
  }, originals };
}
function fixtureCurrent586Plan(){
  const old=fixturePlan(),href='https://opendataapi.dmi.dk/v1/forecastdata/assets/synthetic-cached-original.grib';
  const originals=[canonicalSavedDmiOriginalCapture({...old.originals[0],assetIdentitySha256:sha(href),
    contentSha256:sha(Buffer.from('rawbytes'))})];
  assert.ok(originals[0]);
  return {schemaVersion:1,contractId:'dmi-current586-exact-original-restore-v1',originals,binding:{
    scope:'CURRENT586_EXACT_ORIGINAL_RESTORE_39666991481_1',failedRun:'39666991481',failedAttempt:1,
    targetReferenceAt:'2026-10-21T20:00:00.000Z',sourceHead:'94b2b6173747b9d1f7d261c5110042a657af0cac',
    executionHead:currentHead,protectedBundleSha256:'e9e7b9327df875133b7c2c00ef6440bc411ef2178a9edf9d6cb1ba1a3e7555c3',
    protectedDatasetId:'rr-synthetic-current586-closure',protectedProductionReferenceAt:'2026-10-21T02:00:00.000Z',
    protectedGeneratedAt:'2026-10-21T02:01:00.000Z',sourceDescriptorSha256:'1'.repeat(64),
    modelBindingSha256:'2'.repeat(64),modelBundleSha256:'6d8f7cca203b5f7ee5155f3c0cdb39403a02fd0eb30fecaca5070ef9f814a805',
    conditionsSha256:'3'.repeat(64),checkpointGenerationSha256:'4'.repeat(64),remoteCheckpointSha256:'5'.repeat(64),
    remoteCheckpointVersion:7,discoverySha256:'6'.repeat(64),originalsSha256:sha(canonical(originals)),
    partCount:673,nonce:'a'.repeat(32)}};
}
function bytesOf(plan) { return Buffer.from(canonical(plan) + '\n'); }
function environment(bytes) {
  return { GITHUB_SHA: currentHead, DMI_EXACT_ORIGINAL_PLAN_SHA256: sha(bytes) };
}

test('exact restore process: old source head remains separate from new execution head', () => {
  const bytes = bytesOf(fixturePlan());
  assert.deepEqual(validateExactDmiOriginalRestorePlan(bytes, environment(bytes)), {
    originalCount: 1, planSha256: sha(bytes),
  });
});

test('exact restore process accepts only the two paired known checkpoint scopes', () => {
  const latest = fixturePlan();
  Object.assign(latest.binding, { progressSource: '38768040429-1',
    progressCacheKey: 'weather-private-progress-encrypted-v2-Linux-main-38768040429-1',
    targetReferenceAt: '2026-10-15T16:00:00.000Z' });
  for (const plan of [fixturePlan(), latest]) {
    const bytes = bytesOf(plan);
    assert.equal(validateExactDmiOriginalRestorePlan(bytes, environment(bytes)).originalCount, 1);
  }
  for (const [key, value] of [['progressSource', '38692413809-1'],
    ['progressCacheKey', 'weather-private-progress-encrypted-v2-Linux-main-38692413809-1'],
    ['targetReferenceAt', '2026-10-14T18:00:00.000Z'],
    ['progressSource', '38768040429-2'], ['targetReferenceAt', '2026-10-15T17:00:00.000Z']]) {
    const plan = structuredClone(latest); plan.binding[key] = value;
    const bytes = bytesOf(plan);
    assert.throws(() => validateExactDmiOriginalRestorePlan(bytes, environment(bytes)),
      { code: 'DMI_EXACT_ORIGINAL_PLAN_REJECTED' });
  }
});

test('forward-only 390663 restore process accepts its exact tuple and rejects mixed scopes', () => {
  const plan = fixturePlan();
  Object.assign(plan.binding, { progressSource: '39066350748-1',
    progressCacheKey: 'weather-private-progress-encrypted-v2-Linux-main-39066350748-1',
    targetReferenceAt: '2026-10-17T20:00:00.000Z' });
  const before = structuredClone(plan), bytes = bytesOf(plan);
  assert.deepEqual(validateExactDmiOriginalRestorePlan(bytes, environment(bytes)), {
    originalCount: 1, planSha256: sha(bytes),
  });
  assert.deepEqual(plan, before, 'scope validation leaves original captures unchanged');
  for (const [key, value] of [['progressSource', '38692413809-1'],
    ['progressCacheKey', 'weather-private-progress-encrypted-v2-Linux-main-38692413809-1'],
    ['targetReferenceAt', '2026-10-14T18:00:00.000Z'],
    ['progressSource', '39066350748-2'], ['targetReferenceAt', '2026-10-17T21:00:00.000Z']]) {
    const changed = structuredClone(plan); changed.binding[key] = value;
    const changedBytes = bytesOf(changed);
    assert.throws(() => validateExactDmiOriginalRestorePlan(changedBytes, environment(changedBytes)),
      { code: 'DMI_EXACT_ORIGINAL_PLAN_REJECTED' });
  }
});

const noOriginals = { DMI_EXACT_ORIGINAL_PREPARATION_STATUS: 'NO_ORIGINAL_RESTORE_REQUIRED',
  DMI_EXACT_ORIGINAL_COUNT: '0', DMI_EXACT_ORIGINAL_PLAN_BYTES: '0', DMI_EXACT_ORIGINAL_PLAN_SHA256: '' };
test('exact restore no-op is a complete strict tuple, never an empty plan or restore receipt', () => {
  assert.equal(validateExactDmiOriginalRestorePreparation(noOriginals), 'NO_ORIGINAL_RESTORE_REQUIRED');
  assert.equal(validateExactDmiOriginalRestorePreparation({}), 'ORIGINAL_PLAN_PREPARED');
  for (const changed of [{ DMI_EXACT_ORIGINAL_COUNT: '1' }, { DMI_EXACT_ORIGINAL_PLAN_BYTES: '1' },
    { DMI_EXACT_ORIGINAL_PLAN_SHA256: 'a'.repeat(64) }, { DMI_EXACT_ORIGINAL_PREPARATION_STATUS: 'RESTORED' },
    { DMI_EXACT_ORIGINAL_COUNT: undefined }]) {
    assert.throws(() => validateExactDmiOriginalRestorePreparation({ ...noOriginals, ...changed }),
      { code: 'DMI_EXACT_ORIGINAL_PREPARATION_REJECTED' });
  }
  assert.equal(validateExactDmiOriginalRestorePreparation({
    DMI_EXACT_ORIGINAL_PREPARATION_STATUS: 'ORIGINAL_PLAN_PREPARED', DMI_EXACT_ORIGINAL_COUNT: '1',
    DMI_EXACT_ORIGINAL_PLAN_BYTES: '2048', DMI_EXACT_ORIGINAL_PLAN_SHA256: 'a'.repeat(64),
  }), 'ORIGINAL_PLAN_PREPARED');
  const env = { ...process.env, ...noOriginals };
  delete env.GITHUB_OUTPUT;
  const result = spawnSync(process.execPath, [path.join(ROOT, 'scripts/run-exact-dmi-original-restore.mjs')],
    { encoding: 'utf8', timeout: 10_000, env });
  assert.equal(result.error, undefined); assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stderr, '');
  assert.deepEqual(JSON.parse(result.stdout), { schemaVersion: 1,
    contractId: 'dmi-exact-original-restore-result-v1', status: 'NO_ORIGINAL_RESTORE_REQUIRED',
    originalCount: 0, restorePerformed: false, writerClaimAcquired: false, remoteWrites: false, cacheSaved: false });
  assert.equal(result.stdout.includes('RESTORED'), false);
});

for (const [name, mutate] of [
  ['wrong progress', p => { p.binding.progressSource = '38692413809-2'; }],
  ['wrong cache identity', p => { p.binding.progressCacheKey += '-other'; }],
  ['new target hour', p => { p.binding.targetReferenceAt = '2026-10-15T18:00:00.000Z'; }],
  ['old head substituted as execution', p => { p.binding.executionHead = p.binding.sourceHead; }],
  ['changed originals', p => { p.originals[0].contentLengthBytes++; }],
  ['extra root fields', p => { p.output = '/arbitrary'; }],
  ['empty originals', p => { p.originals = []; p.binding.originalsSha256 = sha('[]'); }],
]) test(`exact restore process rejects ${name} before a child`, () => {
  const plan = fixturePlan(); mutate(plan); const bytes = bytesOf(plan);
  assert.throws(() => validateExactDmiOriginalRestorePlan(bytes, environment(bytes)),
    { code: 'DMI_EXACT_ORIGINAL_PLAN_REJECTED' });
});

test('exact restore process rejects changed bytes and alternate/duplicate JSON', () => {
  const bytes = bytesOf(fixturePlan());
  assert.throws(() => validateExactDmiOriginalRestorePlan(Buffer.concat([bytes, Buffer.from(' ')]), environment(bytes)));
  for (const changed of [Buffer.from(JSON.stringify(fixturePlan(), null, 2)),
    Buffer.from(bytes.toString().replace('"schemaVersion":1', '"schemaVersion":1,"schemaVersion":1'))]) {
    assert.throws(() => validateExactDmiOriginalRestorePlan(changed, environment(changed)),
      { code: 'DMI_EXACT_ORIGINAL_PLAN_REJECTED' });
  }
});

test('exact restore CLI refuses any caller command/path arguments', () => {
  const result = spawnSync(process.execPath, [path.join(ROOT, 'scripts/run-exact-dmi-original-restore.mjs'),
    '--command', 'MUST_NOT_RUN'], { encoding: 'utf8', timeout: 10_000 });
  assert.equal(result.error, undefined);
  assert.equal(result.status, 1);
  assert.equal(result.stdout, '');
  assert.equal(result.stderr.trim(), 'DMI_EXACT_ORIGINAL_RESTORE_ARGUMENTS_INVALID');
});

const native = process.platform === 'linux' ? test : test.skip;
async function privateFixture(mode) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'rr-exact-restore-process-'));
  await fs.mkdir(path.join(root, 'scripts/lib'), { recursive: true });
  await fs.mkdir(path.join(root, '.cache/dmi-grib'), { recursive: true });
  for (const file of ['scripts/run-exact-dmi-original-restore.mjs', 'scripts/run-dmi-bulk-supervised.py',
    'scripts/lib/weather-acquisition-writer.mjs','scripts/lib/current586-exact-original-plan.mjs',
    'scripts/lib/saved-dmi-original-capture.mjs']) await fs.copyFile(path.join(ROOT, file), path.join(root, file));
  const current586=mode.startsWith('current586-'),plan=current586?fixtureCurrent586Plan():fixturePlan();
  const bytes = bytesOf(plan);
  let manifestBytes=null;
  if(current586){
    // Only this owned synthetic fixture issues the known scope. Removing this
    // exact replacement restores the whole unissued product helper unchanged.
    const helperPath=path.join(root,'scripts/lib/current586-exact-original-plan.mjs');
    const original=await fs.readFile(helperPath,'utf8');
    const unissued='export const CURRENT586_EXACT_ORIGINAL_EXECUTION=null;';
    if(original.includes(unissued)){
      assert.equal(original.split(unissued).length,2);
      const issued="export const CURRENT586_EXACT_ORIGINAL_EXECUTION=Object.freeze({scope:'CURRENT586_EXACT_ORIGINAL_RESTORE_39666991481_1'});";
      const fixtureSource=original.replace(unissued,issued);
      assert.equal(fixtureSource.replace(issued,unissued),original);
      await fs.writeFile(helperPath,fixtureSource);
    }else{
      const api=await import('./lib/current586-exact-original-plan.mjs');
      assert.deepEqual(api.CURRENT586_EXACT_ORIGINAL_EXECUTION,{scope:'CURRENT586_EXACT_ORIGINAL_RESTORE_39666991481_1'});
      api.requireCurrent586ExactOriginalExecution();
      assert.deepEqual(await fs.readFile(helperPath,'utf8'),original);
    }
    manifestBytes=Buffer.from(canonical({schemaVersion:2,assets:{'synthetic-cached-original.grib':{
      ...plan.originals[0],canonicalHref:'https://opendataapi.dmi.dk/v1/forecastdata/assets/synthetic-cached-original.grib'}}})+'\n');
    await fs.writeFile(path.join(root,'.cache/dmi-grib/asset-manifest.json'),manifestBytes,{flag:'wx'});
    await fs.writeFile(path.join(root,'.cache/dmi-grib/synthetic-cached-original.grib'),Buffer.from('rawbytes'),{flag:'wx'});
  }
  await fs.writeFile(path.join(root, '.cache/dmi-grib/.original-recovery-plan.json'), bytes, { flag: 'wx' });
  await fs.writeFile(path.join(root, '.cache/original-BS'), 'unchanged synthetic original\n', { flag: 'wx' });
  await fs.writeFile(path.join(root, '.cache/github-output'), '', { flag: 'wx' });
  const rejected = mode.startsWith('rejected') || mode==='current586-rejected';
  const report = { schemaVersion: 1, contractId: 'dmi-exact-original-restore-result-v1',
    status: rejected ? 'REJECTED' : 'RESTORED',
    code: mode === 'rejected-unknown' ? 'UNKNOWN_MUST_NOT_LEAK' : mode === 'rejected-unclassified'
      ? 'UNCLASSIFIED' : mode === 'rejected-metadata' ? 'DMI_EXACT_ORIGINAL_METADATA_UNAVAILABLE'
        : mode === 'rejected-asset' ? 'DMI_EXACT_ORIGINAL_ASSET_UNAVAILABLE'
          : rejected ? 'DMI_EXACT_ORIGINAL_UNAVAILABLE' : 'EXACT_ORIGINALS_RESTORED',
    originalCount: 1, uniqueAssetCount: 1, downloadedAssetCount: 1, reusedAssetCount: 0,
    downloadedBytes: 8, pruningPerformed: false, replayPerformed: false, scorePerformed: false };
  if(current586)Object.assign(report,{downloadedAssetCount:0,reusedAssetCount:1,downloadedBytes:0});
  const source = `import json,os,pathlib,signal,sys,time\n`
    + `assert sys.argv[1:]==['--restore-exact-originals']\n`
    + `assert all(k not in os.environ for k in ['SUPABASE_ACCESS_TOKEN','R2_SECRET_ACCESS_KEY','GITHUB_TOKEN','GITHUB_OUTPUT','DMI_BULK_RAW_DIR','DMI_STAC_ROOT','DMI_BULK_FINALIZE_ONLY'])\n`
    + `assert os.environ.get('DMI_API_KEY')=='synthetic-dmi-key'\n`
    + `pathlib.Path('.cache/producer-ready').write_text('ready')\n`
    + `time.sleep(0.2)\n`
    + (mode === 'unproved' || mode === 'current586-unproved' ? `os.kill(os.getppid(),signal.SIGKILL)\n` : '')
    + (mode === 'raw-output' ? `print('PRIVATE_MUST_NOT_LEAK')\n` : '')
    + `print(${JSON.stringify(JSON.stringify(report))},flush=True)\n`
    + `raise SystemExit(${rejected ? 2 : 0})\n`;
  await fs.writeFile(path.join(root, 'scripts/update-dmi-bulk.py'), source, { flag: 'wx' });
  return { root, planBytes:bytes, manifestBytes, env: { ...process.env, ...environment(bytes),
    GITHUB_OUTPUT: path.join(root, '.cache/github-output'), DMI_API_KEY: 'synthetic-dmi-key',
    SUPABASE_ACCESS_TOKEN: 'PRIVATE_MUST_NOT_LEAK', R2_SECRET_ACCESS_KEY: 'PRIVATE_MUST_NOT_LEAK',
    GITHUB_TOKEN: 'PRIVATE_MUST_NOT_LEAK', DMI_BULK_RAW_DIR: '/MUST_NOT_USE',
    DMI_STAC_ROOT: 'https://invalid.example', DMI_BULK_FINALIZE_ONLY: 'true' } };
}
async function runFixture(f, during) {
  const child = spawn(process.execPath, [path.join(f.root, 'scripts/run-exact-dmi-original-restore.mjs')],
    { cwd: f.root, env: f.env, shell: false, stdio: ['ignore', 'pipe', 'pipe'] });
  const out = [], err = []; child.stdout.on('data', data => out.push(data)); child.stderr.on('data', data => err.push(data));
  const completed = new Promise((resolve, reject) => {
    child.once('error', reject); child.once('close', (code, signal) => resolve({ code, signal,
      stdout: Buffer.concat(out).toString(), stderr: Buffer.concat(err).toString() }));
  });
  const timeout = setTimeout(() => child.kill('SIGKILL'), 10_000);
  try { if (during) await during(); return await completed; }
  finally { clearTimeout(timeout); }
}
async function exists(file) { try { await fs.lstat(file); return true; } catch (e) { if (e.code === 'ENOENT') return false; throw e; } }
async function removeFixture(f) {
  assert.equal(path.dirname(f.root), path.resolve(os.tmpdir()));
  assert.ok(path.basename(f.root).startsWith('rr-exact-restore-process-'));
  await fs.rm(f.root, { recursive: true, force: true });
}

native('exact restore native: actual fixed supervisor/producer closes before plan and claim removal', async () => {
  const f = await privateFixture('restored');
  try {
    const result = await runFixture(f, async () => {
      const deadline = Date.now() + 5000;
      while (!await exists(path.join(f.root, '.cache/producer-ready'))) {
        assert.ok(Date.now() < deadline); await new Promise(resolve => setTimeout(resolve, 10));
      }
      assert.equal(await exists(path.join(f.root, '.cache/weather-acquisition-writer.claim')), true);
      assert.equal(await exists(path.join(f.root, '.cache/dmi-grib/.original-recovery-plan.json')), true);
    });
    assert.equal(result.signal, null); assert.equal(result.code, 0, result.stderr);
    const receipt = JSON.parse(result.stdout);
    assert.equal(receipt.status, 'RESTORED'); assert.equal(receipt.physicalGroupClosed, true);
    assert.equal(receipt.writerClaimReleased, true); assert.equal(receipt.planRemoved, true);
    assert.equal(receipt.cacheSaved, false);
    assert.equal(await fs.readFile(path.join(f.root, '.cache/github-output'), 'utf8'), 'originals_restored=true\n');
    assert.equal(await exists(path.join(f.root, '.cache/weather-acquisition-writer.claim')), false);
    assert.equal(await exists(path.join(f.root, '.cache/dmi-grib/.original-recovery-plan.json')), false);
    assert.equal(await fs.readFile(path.join(f.root, '.cache/original-BS'), 'utf8'), 'unchanged synthetic original\n');
  } finally { await removeFixture(f); }
});

for (const mode of ['rejected', 'rejected-metadata', 'rejected-asset', 'rejected-unclassified', 'rejected-unknown', 'unproved', 'raw-output']) native(`exact restore native: ${mode} is not a SAVE receipt`, async () => {
  const f = await privateFixture(mode);
  try {
    const result = await runFixture(f);
    assert.equal(result.signal, null); assert.equal(result.code, 1);
    assert.equal(result.stdout, ''); assert.equal(result.stderr.includes('PRIVATE_MUST_NOT_LEAK'), false);
    if (mode === 'rejected') assert.equal(result.stderr.trim(), 'DMI_EXACT_ORIGINAL_UNAVAILABLE');
    if (mode === 'rejected-metadata') assert.equal(result.stderr.trim(), 'DMI_EXACT_ORIGINAL_METADATA_UNAVAILABLE');
    if (mode === 'rejected-asset') assert.equal(result.stderr.trim(), 'DMI_EXACT_ORIGINAL_ASSET_UNAVAILABLE');
    if (mode === 'rejected-unclassified') assert.equal(result.stderr.trim(), 'UNCLASSIFIED');
    if (mode === 'rejected-unknown') {
      assert.equal(result.stderr.trim(), 'DMI_EXACT_ORIGINAL_RESTORE_OUTPUT_INVALID');
      assert.equal(result.stderr.includes('UNKNOWN_MUST_NOT_LEAK'), false);
    }
    assert.equal(await fs.readFile(path.join(f.root, '.cache/github-output'), 'utf8'), '');
    assert.equal(await exists(path.join(f.root, '.cache/weather-acquisition-writer.claim')),
      !['rejected', 'rejected-metadata', 'rejected-asset', 'rejected-unclassified'].includes(mode));
    assert.equal(await exists(path.join(f.root, '.cache/dmi-grib/.original-recovery-plan.json')), true);
    assert.equal(await fs.readFile(path.join(f.root, '.cache/original-BS'), 'utf8'), 'unchanged synthetic original\n');
  } finally { await removeFixture(f); }
});

test('CURRENT586 exact restoration: coordinator distinguishes UNISSUED from the one exact issued scope before writer or child',async()=>{
  const {CURRENT586_EXACT_ORIGINAL_EXECUTION,requireCurrent586ExactOriginalExecution}=await import('./lib/current586-exact-original-plan.mjs');
  if(CURRENT586_EXACT_ORIGINAL_EXECUTION===null){
    assert.throws(()=>requireCurrent586ExactOriginalExecution(),{code:'DMI_CURRENT586_ORIGINAL_UNISSUED'});
    const plan=fixturePlan();plan.contractId='dmi-current586-exact-original-restore-v1';
    const bytes=bytesOf(plan);
    assert.throws(()=>validateExactDmiOriginalRestorePlan(bytes,environment(bytes)),
      {code:'DMI_CURRENT586_ORIGINAL_UNISSUED'});
  }else{
    assert.deepEqual(CURRENT586_EXACT_ORIGINAL_EXECUTION,{scope:'CURRENT586_EXACT_ORIGINAL_RESTORE_39666991481_1'});
    assert.doesNotThrow(()=>requireCurrent586ExactOriginalExecution());
    const bytes=bytesOf(fixtureCurrent586Plan());
    assert.deepEqual(validateExactDmiOriginalRestorePlan(bytes,environment(bytes)),
      {planSha256:sha(bytes),originalCount:1,current586:true});
    const wrong=fixtureCurrent586Plan();wrong.binding.scope='CURRENT586_WRONG';
    const invalid=bytesOf(wrong);
    assert.throws(()=>validateExactDmiOriginalRestorePlan(invalid,environment(invalid)),
      {code:'DMI_CURRENT586_ORIGINAL_PLAN_REJECTED'});
  }
});

native('CURRENT586 restoration coordinator: actual cohort closure archives exact consumed plan and bounded RAW receipt',async()=>{
  const f=await privateFixture('current586-restored');
  try{
    const result=await runFixture(f,async()=>{
      const deadline=Date.now()+5000;
      while(!await exists(path.join(f.root,'.cache/producer-ready'))){
        assert.ok(Date.now()<deadline);await new Promise(resolve=>setTimeout(resolve,10));
      }
      assert.equal(await exists(path.join(f.root,'.cache/weather-acquisition-writer.claim')),true);
      assert.equal(await exists(path.join(f.root,'.cache/dmi-grib/.original-recovery-plan.json')),true);
    });
    assert.equal(result.code,0,result.stderr);assert.equal(result.signal,null);assert.equal(result.stderr,'');
    const returned=JSON.parse(result.stdout);
    assert.equal(returned.status,'RESTORED');assert.equal(returned.physicalGroupClosed,true);
    assert.equal(returned.writerClaimReleased,true);assert.equal(returned.planRemoved,true);assert.equal(returned.cacheSaved,false);
    const folder=path.join(f.root,'.cache/current586-exact-original-restore');
    assert.deepEqual(await fs.readFile(path.join(folder,'plan.json')),f.planBytes);
    const receiptBytes=await fs.readFile(path.join(folder,'receipt.json')),receipt=JSON.parse(receiptBytes);
    assert.equal(receipt.kind,'CURRENT586_EXACT_ORIGINAL_TRANSPORT_CLOSED');
    assert.equal(receipt.planSha256,sha(f.planBytes));assert.deepEqual(receipt.binding,JSON.parse(f.planBytes).binding);
    assert.equal(receipt.rawManifestSha256,sha(f.manifestBytes));assert.equal(receipt.rawManifestBytes,f.manifestBytes.length);
    assert.equal(receipt.result.physicalGroupClosed,true);assert.equal(receipt.result.writerClaimReleased,true);
    assert.equal(receipt.result.planRemoved,true);assert.equal(receipt.result.reusedAssetCount,1);
    assert.equal(receipt.result.downloadedAssetCount,0);assert.equal(receipt.result.downloadedBytes,0);
    assert.equal(receipt.nativeEvidenceProduced,false);assert.equal(receipt.sourceValuesChanged,false);
    assert.equal(receipt.remoteSourceFreshnessVerifiedAfterTransport,false);
    assert.ok(Date.parse(receipt.startedAt)<=Date.parse(receipt.completedAt));
    assert.deepEqual(returned.current586Transport,{receiptPath:'.cache/current586-exact-original-restore/receipt.json',
      receiptSha256:sha(receiptBytes),receiptBytes:receiptBytes.length});
    assert.equal(await exists(path.join(f.root,'.cache/weather-acquisition-writer.claim')),false);
    assert.equal(await exists(path.join(f.root,'.cache/dmi-grib/.original-recovery-plan.json')),false);
    assert.deepEqual(await fs.readFile(path.join(f.root,'.cache/dmi-grib/asset-manifest.json')),f.manifestBytes);
    assert.equal(await fs.readFile(path.join(f.root,'.cache/dmi-grib/synthetic-cached-original.grib'),'utf8'),'rawbytes');
    assert.equal(await fs.readFile(path.join(f.root,'.cache/original-BS'),'utf8'),'unchanged synthetic original\n');
    assert.equal(await fs.readFile(path.join(f.root,'.cache/github-output'),'utf8'),'originals_restored=true\n');
    for(const forbidden of ['PRIVATE_MUST_NOT_LEAK','synthetic-dmi-key','contentSha256','acquiredAt','remoteCheckpointSha256'])
      assert.equal(result.stdout.includes(forbidden),false);
  }finally{await removeFixture(f);}
});
for(const mode of ['current586-rejected','current586-unproved'])native('CURRENT586 restoration coordinator: '+mode+' retains first failure and emits no closed receipt',async()=>{
  const f=await privateFixture(mode);
  try{
    const result=await runFixture(f);
    assert.equal(result.code,1);assert.equal(result.signal,null);assert.equal(result.stdout,'');
    assert.equal(result.stderr.includes('PRIVATE_MUST_NOT_LEAK'),false);
    assert.equal(result.stderr.trim(),mode==='current586-rejected'?'DMI_EXACT_ORIGINAL_UNAVAILABLE':'DMI_EXACT_ORIGINAL_RESTORE_COHORT_UNPROVED');
    assert.equal(await exists(path.join(f.root,'.cache/current586-exact-original-restore')),false);
    assert.equal(await exists(path.join(f.root,'.cache/dmi-grib/.original-recovery-plan.json')),true);
    assert.equal(await exists(path.join(f.root,'.cache/weather-acquisition-writer.claim')),mode==='current586-unproved');
    assert.deepEqual(await fs.readFile(path.join(f.root,'.cache/dmi-grib/asset-manifest.json')),f.manifestBytes);
    assert.equal(await fs.readFile(path.join(f.root,'.cache/original-BS'),'utf8'),'unchanged synthetic original\n');
    assert.equal(await fs.readFile(path.join(f.root,'.cache/github-output'),'utf8'),'');
  }finally{await removeFixture(f);}
});
