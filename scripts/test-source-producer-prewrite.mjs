// Actual SOURCE phase refusals and local policy only, not positive B/S,
// original-preservation, PostgreSQL, legacy-follower or production proof.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import crypto from 'node:crypto';
import test from 'node:test';
import './test-source-producer-sync-binding.mjs';
import './test-source-producer-workflow.mjs';
import {SOURCE_PRODUCER_BINDING,SOURCE_PRODUCER_OUTPUT,SOURCE_PRODUCER_BEFORE,
  SOURCE_PRODUCER_PREDECESSOR_RELEASE,SOURCE_PRODUCER_CODE_PARENT,sourceProducerMigration,
  requireSourceProducerBinding,requireSourceProducerOutput} from './lib/source-producer-successor-source.mjs';
import {stageSourceProducerOriginals} from './stage-source-producer-originals.mjs';
import {runSourceProducerPrewrite,verifySourceProducerPrewritePreservation} from './source-producer-prewrite.mjs';
import {verifySourceProducerPlan,sourceProducerSqlWriteRequired} from './verify-source-producer-plan.mjs';
import {reconcileSourceCodeOnlyPrivateRuntimeCheckpoint} from './reconcile-private-runtime-checkpoint.mjs';
import {reconcileSourceProducerCodeOnly} from './reconcile-source-producer-code-only.mjs';
import {runSourceProducerLegacyCompatibility} from './test-source-producer-legacy-compatibility.mjs';
import {modelSourceRelativeModuleSpecifiers} from './lib/model-source-imports.mjs';
import {sourceProducerRequiredMigrations,installed593Original591RequiredMigrations,
  accountStatisticsAssistantRequiredMigrations,assertSourceProducerMigrationsApplied,
  assertAccountStatisticsAssistantMigrationsApplied} from './integrated-cutover-readiness.mjs';

const sourceIssued=SOURCE_PRODUCER_BINDING!==null;
if(sourceIssued){requireSourceProducerBinding();requireSourceProducerOutput();}
else assert.equal(SOURCE_PRODUCER_OUTPUT,null,'No partial SOURCE issuance');

test('SOURCE preserves the never-installed first proposal without staging it as an intermediate', {skip:!sourceIssued}, async()=>{
  const old='20261021020000_source_producer_original_bound_successor.sql';
  const bytes=await fs.readFile(new URL('../supabase/migrations/'+old,import.meta.url));
  assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'),
    'd8986e0721129a0d0ad996a3a8c6f71c5b0e9dd487883e9d2417843a68599517',
    'Whole never-installed original SQL is retained, not rewritten');
  const required=sourceProducerRequiredMigrations();
  // The former55 CURRENT assertion belonged to SOURCE's then-selected585 parent.
  // Current SOURCE explicitly follows genuine594; the585 family's own scope stays separate.
  const genuine594=installed593Original591RequiredMigrations();
  assert.equal(SOURCE_PRODUCER_PREDECESSOR_RELEASE,'4.0.594');
  assert.equal(SOURCE_PRODUCER_CODE_PARENT.head,'37a34703d9ae8bfb2c28056f21a7ea73944033ae');
  assert.equal(genuine594.length,61);assert.equal(genuine594.at(-1).version,'20261031070755');
  assert.equal(genuine594.at(-1).version,SOURCE_PRODUCER_BEFORE.version);
  assert.deepEqual(required.slice(0,-1),genuine594,'Whole genuine594 original prefix, not a count-only replacement');
  assert.equal(required.length,genuine594.length+1);assert.deepEqual(required.at(-1),sourceProducerMigration());
  assert.equal(required.at(-1).version,SOURCE_PRODUCER_BINDING.version);
  assert.notEqual(required.at(-1).version,'20261021020000');
  assert(!required.some(row=>row.filename===old),'Old source-only proposal is not an installation step');
});

test(sourceIssued?'SOURCE issued staging and prewrite reject invalid call forms before operands or IO':'SOURCE original staging and prewrite refuse unissued before operands, clients or IO',async t=>{
  if(sourceIssued){
    let operands=0,io=0;
    const untouched=new Proxy({},{
      get(){operands++;throw new Error('UNEXPECTED_OPERAND_ACCESS');},
      ownKeys(){operands++;throw new Error('UNEXPECTED_OPERAND_ACCESS');},
      getPrototypeOf(){operands++;throw new Error('UNEXPECTED_OPERAND_ACCESS');},
    });
    for(const name of ['readFile','appendFile','writeFile','mkdir','realpath','lstat'])
      t.mock.method(fs,name,()=>{io++;throw new Error('UNEXPECTED_IO');});
    t.mock.method(globalThis,'fetch',()=>{io++;throw new Error('UNEXPECTED_FETCH');});
    try{
      for(const call of [
        ()=>stageSourceProducerOriginals(untouched),()=>runSourceProducerPrewrite(untouched),
        ()=>verifySourceProducerPrewritePreservation(untouched,untouched),
        ()=>verifySourceProducerPrewritePreservation({}),
        ()=>verifySourceProducerPlan(untouched,untouched),()=>verifySourceProducerPlan({}),
        ()=>reconcileSourceCodeOnlyPrivateRuntimeCheckpoint(untouched,untouched),
        ()=>reconcileSourceCodeOnlyPrivateRuntimeCheckpoint({}),
        ()=>reconcileSourceProducerCodeOnly(untouched),()=>runSourceProducerLegacyCompatibility(untouched),
      ])await assert.rejects(call,{code:'ERR_ASSERTION'});
      const previousEvent=process.env.GITHUB_EVENT_NAME;
      process.env.GITHUB_EVENT_NAME='push';
      try{
        for(const call of [()=>stageSourceProducerOriginals(),()=>runSourceProducerPrewrite(),
          ()=>verifySourceProducerPlan({phase:'before',migrationListText:'',dryRunText:'',migrationsDirectory:'unused-relative'}),
          ()=>reconcileSourceCodeOnlyPrivateRuntimeCheckpoint({privateRoot:'unused',bundlePath:'unused'})])
          await assert.rejects(call,{code:'ERR_ASSERTION'});
      }finally{
        if(previousEvent===undefined)delete process.env.GITHUB_EVENT_NAME;else process.env.GITHUB_EVENT_NAME=previousEvent;
      }
      assert.equal(operands,0);assert.equal(io,0);
    }finally{t.mock.restoreAll();}
    return;
  }
  assert.equal(SOURCE_PRODUCER_BINDING,null);assert.equal(SOURCE_PRODUCER_OUTPUT,null);
  let inputAccesses=0,ioCalls=0;
  const untouched=new Proxy({}, {
    get(){inputAccesses++;throw new Error('UNEXPECTED_INPUT_ACCESS');},
    ownKeys(){inputAccesses++;throw new Error('UNEXPECTED_INPUT_ACCESS');},
    getPrototypeOf(){inputAccesses++;throw new Error('UNEXPECTED_INPUT_ACCESS');},
  });
  for(const name of ['readFile','appendFile','writeFile','mkdir','realpath','lstat'])
    t.mock.method(fs,name,()=>{ioCalls++;throw new Error('UNEXPECTED_IO');});
  t.mock.method(globalThis,'fetch',()=>{ioCalls++;throw new Error('UNEXPECTED_FETCH');});
  try{
    for(const call of [()=>stageSourceProducerOriginals(),()=>stageSourceProducerOriginals(untouched),
      ()=>runSourceProducerPrewrite(),()=>runSourceProducerPrewrite(untouched),
      ()=>verifySourceProducerPrewritePreservation(untouched),
      ()=>verifySourceProducerPrewritePreservation(untouched,untouched),
      ()=>verifySourceProducerPlan(untouched),()=>verifySourceProducerPlan(untouched,untouched),
      ()=>reconcileSourceCodeOnlyPrivateRuntimeCheckpoint(untouched),
      ()=>reconcileSourceCodeOnlyPrivateRuntimeCheckpoint(untouched,untouched),
      ()=>reconcileSourceProducerCodeOnly(),()=>reconcileSourceProducerCodeOnly(untouched),
      ()=>runSourceProducerLegacyCompatibility(),()=>runSourceProducerLegacyCompatibility(untouched)])
      await assert.rejects(call,/SOURCE_PRODUCER_UNISSUED/);
    assert.equal(inputAccesses,0);assert.equal(ioCalls,0);
  }finally{t.mock.restoreAll();}
});

test('SOURCE code-only reconciliation admits only reviewed bytes and preserves the complete older source',async()=>{
  const file='scripts/reconcile-private-runtime-checkpoint.mjs';
  const source=(await fs.readFile(new URL('./reconcile-private-runtime-checkpoint.mjs',import.meta.url),'utf8'))
    .replace(/^\uFEFF/,'').replace(/\r\n?/g,'\n');
  const hash=value=>crypto.createHash('sha256').update(value).digest('hex');
  const once=(value,before,after)=>{assert.equal(value.split(before).length,2);return value.replace(before,()=>after);};
  assert.equal(hash(source),'0d39bb342673321abf6481a4a3527bb3717dc4b2604688550d23e5d928b467f4');
  let inverse=once(source,'import {SOURCE_PRODUCER_BINDING as SOURCE_FAMILY,requireSourceProducerOutput}',
    'import {SOURCE_PRODUCER_BINDING as SOURCE_FAMILY}');
  inverse=once(inverse,"import {assertSourceProducerCodeOnlyCaller} from './select-source-producer-code-only-source.mjs';\n",'');
  const start=inverse.indexOf('// A separate exact code-only caller.');
  const end=inverse.indexOf('async function reconcileAuthenticatedPrivateRuntimeCheckpoint(',start);
  assert(start>0&&end>start);assert.equal(inverse.split('// A separate exact code-only caller.').length,2);
  inverse=inverse.slice(0,start)+inverse.slice(end);
  inverse=once(inverse,'  expected, expectedCurrentIdentity, now =','  expected, now =');
  inverse=once(inverse,"  if(expectedCurrentIdentity!==undefined)for(const key of identityKeys)\n    need(same(current[key],expectedCurrentIdentity[key]),'SOURCE_CODE_ONLY_CURRENT_CHANGED');\n",'');
  assert.equal(hash(inverse),'c646e24b5e7ee4a1b1a71917819eb49e9b38c9e123d5b631211207e033f6a052',
    'Whole genuine prior SOURCE inverse, not selected unchanged snippets');
  const oldImports=modelSourceRelativeModuleSpecifiers(inverse,file),currentImports=modelSourceRelativeModuleSpecifiers(source,file);
  assert.equal(oldImports.length,16);assert.equal(currentImports.length,17);
  assert.deepEqual(currentImports.filter(value=>value!=='./select-source-producer-code-only-source.mjs'),oldImports);
  for(const changed of [source+'\n',source.replace("'SOURCE_CODE_ONLY_CURRENT_CHANGED'","'RELAXED_IDENTITY'"),
    source.replace("import {assertSourceProducerCodeOnlyCaller} from './select-source-producer-code-only-source.mjs';",'')])
    assert.throws(()=>modelSourceRelativeModuleSpecifiers(changed,file),/Whole reviewed model import source changed/);
});

test('SOURCE verified pending-write policy never replays an already installed SQL transition',()=>{
  const version='20261021010000';
  assert.equal(sourceProducerSqlWriteRequired('before',[version],version),true);
  assert.equal(sourceProducerSqlWriteRequired('before',[],version),false);
  assert.equal(sourceProducerSqlWriteRequired('installed',[],version),false);
  for(const args of [
    ['installed',[version],version],['before',['20261021020000'],version],
    ['before',[version,version],version],['before',[version,'20261021020000'],version],
    ['unknown',[],version],['before',null,version],['before',[],'not-issued-version'],
  ])assert.throws(()=>sourceProducerSqlWriteRequired(...args));
  assert.throws(()=>sourceProducerSqlWriteRequired('before',[],version,{}));
});

// Nye normale PR-consumere har samme ufravigelige NULL-grænse, ingen positiv PG-påstand.
test('SOURCE PR consumers refuse NULL before package, context, native result or upload operands',async()=>{
  const {verifySourcePrNativeResult,verifySourcePrNativePhaseReceipt,readSourcePrNativeUploadedPhase}
    =await import('./native-postgres-evidence.mjs');
  const {verifySourcePrPackage,verifySourcePrWorkflow}=await import('./national584-source-evidence.mjs');
  if(sourceIssued){
    assert.throws(()=>verifySourcePrNativeResult({}, {}, {}),{code:'ERR_ASSERTION'});
    assert.throws(()=>verifySourcePrPackage({}),{code:'ERR_ASSERTION'});return;
  }
  let accesses=0;const poison=new Proxy({}, {get(){accesses++;throw Error('UNEXPECTED_SOURCE_PR_OPERAND');},
    ownKeys(){accesses++;throw Error('UNEXPECTED_SOURCE_PR_KEYS');}});
  for(const call of [()=>verifySourcePrNativeResult(poison,poison,poison),
    ()=>verifySourcePrNativePhaseReceipt(poison,poison,poison,poison),
    ()=>verifySourcePrPackage(poison),()=>verifySourcePrWorkflow(poison)])assert.throws(call,/SOURCE_PRODUCER_UNISSUED/);
  await assert.rejects(readSourcePrNativeUploadedPhase(poison,poison),/SOURCE_PRODUCER_UNISSUED/);
  assert.equal(accesses,0);
});

// Pure normal migration-list parsing only: no SQL execution, B/S or runtime authority.
test('SOURCE current61-to62 plan accepts its whole genuine594 prefix and rejects the former55 CURRENT shape',()=>{
  if(!sourceIssued){
    assert.throws(()=>sourceProducerRequiredMigrations(),/SOURCE_PRODUCER_UNISSUED/);
    assert.throws(()=>assertSourceProducerMigrationsApplied(''),/SOURCE_PRODUCER_UNISSUED/);return;
  }
  const required=sourceProducerRequiredMigrations(),genuine594=installed593Original591RequiredMigrations();
  assert.equal(genuine594.length,61);assert.deepEqual(required.slice(0,-1),genuine594);
  assert.deepEqual(required.at(-1),sourceProducerMigration());assert.equal(required.length,62);
  const currentHistory='Local | Remote | Time (UTC)\n'
    +required.map(row=>row.version+' | '+row.version+' | state').join('\n');
  assert.deepEqual(assertSourceProducerMigrationsApplied(currentHistory).appliedVersions,
    required.map(row=>row.version),'Positive current schema/list contract, not physical PG execution');

  const genuine585=accountStatisticsAssistantRequiredMigrations();
  assert.equal(genuine585.length,54);assert.equal(genuine585.at(-1).version,'20261019100000');
  const oldFamilyHistory='Local | Remote | Time (UTC)\n'
    +genuine585.map(row=>row.version+' | '+row.version+' | state').join('\n');
  assert.deepEqual(assertAccountStatisticsAssistantMigrationsApplied(oldFamilyHistory).appliedVersions,
    genuine585.map(row=>row.version),'The old585 family still validates in its own unchanged scope');
  const formerCurrentShape=[...genuine585,sourceProducerMigration()];assert.equal(formerCurrentShape.length,55);
  const formerCurrentHistory='Local | Remote | Time (UTC)\n'
    +formerCurrentShape.map(row=>row.version+' | '+row.version+' | state').join('\n');
  for(const text of [oldFamilyHistory,formerCurrentHistory])
    assert.throws(()=>assertSourceProducerMigrationsApplied(text),
      {code:'ERR_ASSERTION',message:'Missing exact SOURCE source'},
      'A585 prefix cannot stand in for the complete current594 predecessor, even with the current child');
});
