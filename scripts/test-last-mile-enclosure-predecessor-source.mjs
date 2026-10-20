import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {withFrozenLastMileEnclosurePredecessorSource} from './check-last-mile-enclosure-predecessor-source.mjs';

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const INVENTORY='scripts/lib/last-mile-enclosure-predecessor-source-inventory.json';
const INVENTORY_SHA='8a35db217041ddfb2f14fb2da76b09af427367989ec67bad7a4fef72d34c0e45';
const sha=value=>crypto.createHash('sha256').update(value).digest('hex');
async function absent(file){
  await assert.rejects(fs.lstat(file),error=>error?.code==='ENOENT','Owned fixed-source host must be physically removed');
}

test('fixed current140000 archive reader uses genuine source and cleans both normal callback outcomes',async()=>{
  const inventoryBytes=await fs.readFile(path.join(ROOT,INVENTORY));
  assert.equal(sha(inventoryBytes),INVENTORY_SHA);
  const inventory=JSON.parse(inventoryBytes);
  assert.equal(inventory.head,'d8a52e3e4cbaed1557cc56fe01f5f0a2b0d657d7');
  assert.equal(inventory.tree,'0ddede3f4b4fb4faa43b0d43f17c7cdbadcc9bc0');
  assert.equal(inventory.files.length,105);
  const parent=await fs.realpath(os.tmpdir());
  let callbackRoot=null,callbacks=0;
  const expectedReturn=Object.freeze({kind:'SOURCE_READER_CONTRACT_ONLY',files:105});
  const returned=await withFrozenLastMileEnclosurePredecessorSource(async sourceRoot=>{
    callbacks+=1;callbackRoot=sourceRoot;
    assert.equal(path.dirname(sourceRoot),parent);
    assert(path.basename(sourceRoot).startsWith('rr-last-mile-enclosure-source-'));
    assert.equal(await fs.realpath(sourceRoot),sourceRoot);
    let total=0;
    for(const row of inventory.files){
      const file=path.join(sourceRoot,row.file),stat=await fs.lstat(file,{bigint:true}),bytes=await fs.readFile(file);
      assert(stat.isFile()&&!stat.isSymbolicLink()&&stat.nlink===1n&&stat.ino>0n);
      assert.equal(bytes.length,row.bytes,row.file);assert.equal(sha(bytes),row.sha256,row.file);
      total+=bytes.length;
    }
    assert.equal(total,2319125);
    const load=relative=>import(pathToFileURL(path.join(sourceRoot,relative)).href);
    for(const manifest of inventory.manifests){
      const old=await load(manifest.file);
      assert.equal(old.GENERATED_RAVSCORE_MODEL_BUNDLE_SHA256,manifest.binding);
      assert.equal(old.GENERATED_RAVSCORE_MODEL_BUNDLE_MANIFEST.files.length,manifest.count);
    }
    const t=await load(inventory.t.module);
    assert.deepEqual(t.RAVSCORE_CONTINUATION_IMPLEMENTATION_FILES,inventory.t.files);
    assert.equal(await t.ravScoreContinuationImplementationSha256({repositoryRoot:sourceRoot}),inventory.t.sha256);
    const workflow=await load('scripts/private-production-runtime-workflow.mjs');
    assert.deepEqual(await workflow.privateRuntimeContractHashes({repositoryRoot:sourceRoot}),inventory.runtimeContracts);
    const bundle=await load('scripts/private-production-runtime-bundle.mjs');
    const protectedS=await load('scripts/protected-ravscore-continuation-checkpoint.mjs');
    const localS=await load('scripts/ravscore-continuation-checkpoint.mjs');
    for(const [name,value] of Object.entries({
      verifyPrivateProductionRuntimeBundle:bundle.verifyPrivateProductionRuntimeBundle,
      buildPrivateRuntimeExpectation:workflow.buildPrivateRuntimeExpectation,
      restoreProtectedRavScoreContinuationCheckpoint:protectedS.restoreProtectedRavScoreContinuationCheckpoint,
      loadRavScoreContinuationCheckpointForTarget:localS.loadRavScoreContinuationCheckpointForTarget,
    }))assert.equal(typeof value,'function',name);
    // No production B/S fixture is invented, no S is built from B, and no old origin is invoked.
    return expectedReturn;
  });
  assert.strictEqual(returned,expectedReturn);assert.equal(callbacks,1);await absent(callbackRoot);

  const firstError=new Error('SYNTHETIC_CALLBACK_SENTINEL_NOT_PRODUCTION_DATA');
  let failedRoot=null,failedCallbacks=0;
  await assert.rejects(withFrozenLastMileEnclosurePredecessorSource(sourceRoot=>{
    failedRoot=sourceRoot;failedCallbacks+=1;throw firstError;
  }),error=>error===firstError,'Original callback failure must survive successful owned cleanup');
  assert.equal(failedCallbacks,1);await absent(failedRoot);

  let refusedCallbacks=0;
  await assert.rejects(withFrozenLastMileEnclosurePredecessorSource(()=>{refusedCallbacks+=1;},'not-an-override'),
    error=>error?.code==='ERR_ASSERTION');
  for(const value of [undefined,null,{},'d8a52e3e4cbaed1557cc56fe01f5f0a2b0d657d7'])
    await assert.rejects(withFrozenLastMileEnclosurePredecessorSource(value),error=>error?.code==='ERR_ASSERTION');
  assert.equal(refusedCallbacks,0,'Forbidden override must fail before callback');
});


test('fixed584 source reader preserves first raw falsy failures through genuine source and cleanup', {timeout:180000}, async()=>{
  const {withAuthenticated584PredecessorSource}=await import('./check-account-statistics-assistant-predecessor-source.mjs');
  const parent=await fs.realpath(os.tmpdir());let callbacks=0;
  const checkRoot=async root=>{
    callbacks+=1;assert.equal(path.dirname(root),parent);
    assert(path.basename(root).startsWith('rr-authenticated584-predecessor-source-'));
    assert.equal(await fs.realpath(root),root);
  };
  let successRoot;
  const returned=Object.freeze({kind:'CALLBACK_RETURN_NOT_AUTHORITY'});
  assert.strictEqual(await withAuthenticated584PredecessorSource(async root=>{
    await checkRoot(root);successRoot=root;return returned;
  }),returned);await absent(successRoot);
  for(const raw of [undefined,null,false,0]){
    let sourceRoot,rejected=false;
    try{await withAuthenticated584PredecessorSource(async root=>{
      await checkRoot(root);sourceRoot=root;throw raw;
    });}catch(error){rejected=true;assert.strictEqual(error,raw,'The first thrown raw value is preserved verbatim');}
    assert.equal(rejected,true,'A falsy thrown value must never become a successful callback');
    await absent(sourceRoot);
  }
  // A real additional leaf makes exactTree reject cleanup. No fs/loader/callback
  // implementation is stubbed; the original first null must win over this error.
  let retainedFirstRoot,rejectedFirst=false;
  try{await withAuthenticated584PredecessorSource(async root=>{
    await checkRoot(root);retainedFirstRoot=root;
    await fs.writeFile(path.join(root,'test-only-cleanup-denial'),'fixture-owned',{flag:'wx'});throw null;
  });}catch(error){rejectedFirst=true;assert.strictEqual(error,null);}
  assert.equal(rejectedFirst,true);await fs.unlink(path.join(retainedFirstRoot,'test-only-cleanup-denial'));
  // With a successful callback, the actual cleanup assertion is the first failure.
  let retainedCleanupRoot,rejectedCleanup=false;
  try{await withAuthenticated584PredecessorSource(async root=>{
    await checkRoot(root);retainedCleanupRoot=root;
    await fs.writeFile(path.join(root,'test-only-cleanup-denial'),'fixture-owned',{flag:'wx'});return returned;
  });}catch(error){rejectedCleanup=true;assert.equal(error?.code,'ERR_ASSERTION');assert.match(error.message,/Unknown source leaf is retained/);}
  assert.equal(rejectedCleanup,true);await fs.unlink(path.join(retainedCleanupRoot,'test-only-cleanup-denial'));
  // Only this test's two marker files are removed. Genuine source factories whose
  // normal guarded cleanup failed remain retained; this test invents no cleanup grant.
  assert.equal(callbacks,7);
  console.log(JSON.stringify({kind:'GENUINE_FIXED584_FIRST_RAW_FAILURES',callbacks,rawFalsyFailures:4,
    callbackFailureBeforeCleanupFailure:true,cleanupOnlyFailure:true,retainedSourceRoots:2,
    old140000AssertionsUnchanged:true,current585Admission:false,postgresExecuted:false}));
});
