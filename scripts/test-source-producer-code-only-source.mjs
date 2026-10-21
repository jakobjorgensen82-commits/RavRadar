// Actual SOURCE phase boundaries and pure code-only caller checks only.
// No fabricated SOURCE tuple, B/S/SQL proof, producer activation or provider I/O.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import test from 'node:test';
import {SOURCE_PRODUCER_BINDING,SOURCE_PRODUCER_OUTPUT,requireSourceProducerBinding,requireSourceProducerOutput}
  from './lib/source-producer-successor-source.mjs';
import {assertSourceProducerCodeOnlyCaller,selectSourceProducerCodeOnlySource}
  from './select-source-producer-code-only-source.mjs';

const root=fileURLToPath(new URL('../',import.meta.url));
const sourceIssued=SOURCE_PRODUCER_BINDING!==null;
if(sourceIssued){requireSourceProducerBinding();requireSourceProducerOutput();}
else assert.equal(SOURCE_PRODUCER_OUTPUT,null,'No partial SOURCE issuance');
function caller(opted='true'){
  return {
    GITHUB_EVENT_NAME:'workflow_dispatch',GITHUB_REF:'refs/heads/main',GITHUB_RUN_ATTEMPT:'1',
    GITHUB_RUN_ID:'123',GITHUB_SHA:'a'.repeat(40),GITHUB_WORKFLOW:'Deploy RavRadar code-only repair',
    RAVRADAR_SOURCE_PRODUCER_UPGRADE_OPT_IN:opted,
    RAVRADAR_SOURCE_PRODUCER_PHASE:opted==='true'?'before':'installed',
    RAVRADAR_SOURCE_PRODUCER_CONFIRMATION:'DEPLOY-CODE-ONLY-REPAIR',
    RAVRADAR_SOURCE_PRODUCER_WRITER_ACTIVE:'false',
    RAVRADAR_SOURCE_PRODUCER_RECOVERY_GATE_RESULT:'success',
    RAVRADAR_SOURCE_PRODUCER_SAVED_WEATHER:'false',RAVRADAR_SOURCE_PRODUCER_RECOVERY_RUN_ID:'',
    RAVRADAR_SOURCE_NORMAL_PRODUCER:'false',
    RAVRADAR_ACCOUNT_STATISTICS_ASSISTANT_UPGRADE_OPT_IN:'false',
  };
}

test('SOURCE pure caller accepts only its explicit before/installed pairs without mutation',()=>{
  for(const opted of ['true','false']){
    const environment=Object.freeze(caller(opted)),before={...environment};
    assert.equal(assertSourceProducerCodeOnlyCaller(environment),undefined);
    assert.deepEqual(environment,before);
  }
  assert.throws(()=>assertSourceProducerCodeOnlyCaller(caller(),{issued:true}));
});

test('SOURCE pure caller rejects missing/changed required authority and mixed historical modes',()=>{
  const changed={
    GITHUB_EVENT_NAME:'push',GITHUB_REF:'refs/heads/other',GITHUB_RUN_ATTEMPT:'2',
    GITHUB_RUN_ID:'0',GITHUB_SHA:'A'.repeat(40),GITHUB_WORKFLOW:'Build RavRadar',
    RAVRADAR_SOURCE_PRODUCER_UPGRADE_OPT_IN:'TRUE',RAVRADAR_SOURCE_PRODUCER_PHASE:'installed',
    RAVRADAR_SOURCE_PRODUCER_CONFIRMATION:'DEPLOY-SAVED-WEATHER-REPAIR',
    RAVRADAR_SOURCE_PRODUCER_WRITER_ACTIVE:'true',
    RAVRADAR_SOURCE_PRODUCER_RECOVERY_GATE_RESULT:'skipped',
    RAVRADAR_SOURCE_PRODUCER_SAVED_WEATHER:'true',RAVRADAR_SOURCE_PRODUCER_RECOVERY_RUN_ID:'456',
    RAVRADAR_SOURCE_NORMAL_PRODUCER:'true',
    RAVRADAR_ACCOUNT_STATISTICS_ASSISTANT_UPGRADE_OPT_IN:'true',
  };
  for(const [key,value] of Object.entries(changed)){
    assert.throws(()=>assertSourceProducerCodeOnlyCaller({...caller(),[key]:value}),key);
    const missing=caller();delete missing[key];
    assert.throws(()=>assertSourceProducerCodeOnlyCaller(missing),'missing '+key);
  }
  assert.throws(()=>assertSourceProducerCodeOnlyCaller({
    ...caller('false'),RAVRADAR_SOURCE_PRODUCER_PHASE:'before'}));
  for(const key of [
    'RAVRADAR_USERDATA_UPGRADE_OPT_IN','RAVRADAR_ACCOUNT_ASSISTANT_UPGRADE_OPT_IN',
    'RAVRADAR_CURRENT_MEMORY_WARMUP_UPGRADE_OPT_IN','RAVRADAR_ESTABLISHED_NATIVE_CURRENT_ORIGIN_UPGRADE_OPT_IN',
    'RAVRADAR_STATISTICS_REVISION_UPGRADE_OPT_IN','RAVRADAR_CURRENT_GRID_UPGRADE_OPT_IN',
    'RAVRADAR_KNOWLEDGE_UPGRADE_OPT_IN','RAVRADAR_LAST_MILE_ENCLOSURE_UPGRADE_OPT_IN',
    'RAVRADAR_ASSISTANT_SAME_H0_UPGRADE_OPT_IN','RAVRADAR_CURRENT_FAMILY_EPOCH_UPGRADE_OPT_IN',
    'RAVRADAR_UNKNOWN_UPGRADE_OPT_IN',
    'RESTART_ARCHIVED_WEATHER','PUBLISH_NEWEST_SAVED_WEATHER','COMPLETED_PRIVATE_RUNTIME',
    'CHECKPOINT_ONLY','QUICK_CONFIRMATION','RAVRADAR_WEATHER_STATE_EPOCH_BOOTSTRAP',
    'RAVRADAR_WEATHER_STATE_EPOCH_CHECKPOINT_REENTRY','NATIVE_IDENTITY_RECOVERY',
  ])assert.throws(()=>assertSourceProducerCodeOnlyCaller({...caller(),[key]:'true'}),key);
});

test(sourceIssued?'SOURCE actual issued selector verifies both real request phases without remote admission':'SOURCE actual unissued/false is neutral without old caller reads or branch I/O',async t=>{
  if(sourceIssued){
    requireSourceProducerBinding();requireSourceProducerOutput();
    let remote=0,writes=0;
    t.mock.method(globalThis,'fetch',()=>{remote++;throw new Error('UNEXPECTED_SOURCE_REMOTE_IO');});
    t.mock.method(fs,'appendFile',()=>{writes++;throw new Error('UNEXPECTED_SOURCE_WRITE');});
    try{
      for(const opted of ['true','false'])
        assert.equal(await selectSourceProducerCodeOnlySource(Object.freeze(caller(opted))),true);
      assert.equal(remote,0);assert.equal(writes,0);
    }finally{t.mock.restoreAll();}
    return;
  }
  assert.equal(SOURCE_PRODUCER_BINDING,null);assert.equal(SOURCE_PRODUCER_OUTPUT,null);
  const reads=[];
  const environment=new Proxy({}, {get(_target,key){
    reads.push(key);assert.equal(key,'RAVRADAR_SOURCE_PRODUCER_UPGRADE_OPT_IN');return 'false';
  }});
  let io=0;
  t.mock.method(fs,'readFile',()=>{io++;throw new Error('UNEXPECTED_SOURCE_READ');});
  t.mock.method(fs,'appendFile',()=>{io++;throw new Error('UNEXPECTED_SOURCE_WRITE');});
  try{
    assert.equal(await selectSourceProducerCodeOnlySource(environment),false);
    assert.deepEqual(reads,['RAVRADAR_SOURCE_PRODUCER_UPGRADE_OPT_IN']);assert.equal(io,0);
    await assert.rejects(selectSourceProducerCodeOnlySource(environment,{issued:true}));
  }finally{t.mock.restoreAll();}
});

test(sourceIssued?'SOURCE actual issued selector rejects malformed request phases before branch IO':'SOURCE actual unissued active/missing/typed opt-in refuses before authority and branch I/O',async t=>{
  if(sourceIssued){
    let io=0;
    for(const name of ['readFile','appendFile'])
      t.mock.method(fs,name,()=>{io++;throw new Error('UNEXPECTED_SOURCE_IO');});
    t.mock.method(globalThis,'fetch',()=>{io++;throw new Error('UNEXPECTED_SOURCE_FETCH');});
    try{
      for(const opted of [undefined,false,'FALSE','']){
        await assert.rejects(selectSourceProducerCodeOnlySource({
          ...caller('false'),RAVRADAR_SOURCE_PRODUCER_UPGRADE_OPT_IN:opted}),{code:'ERR_ASSERTION'});
      }
      await assert.rejects(selectSourceProducerCodeOnlySource({
        ...caller('true'),RAVRADAR_SOURCE_PRODUCER_PHASE:'installed'}),{code:'ERR_ASSERTION'});
      await assert.rejects(selectSourceProducerCodeOnlySource({
        ...caller('false'),RAVRADAR_SOURCE_PRODUCER_PHASE:'before'}),{code:'ERR_ASSERTION'});
      assert.equal(io,0);
    }finally{t.mock.restoreAll();}
    return;
  }
  assert.equal(SOURCE_PRODUCER_BINDING,null);assert.equal(SOURCE_PRODUCER_OUTPUT,null);
  let io=0;
  t.mock.method(fs,'readFile',()=>{io++;throw new Error('UNEXPECTED_SOURCE_READ');});
  t.mock.method(fs,'appendFile',()=>{io++;throw new Error('UNEXPECTED_SOURCE_WRITE');});
  try{
    for(const opted of ['true',undefined,false,'FALSE','']){
      const reads=[];
      const environment=new Proxy({}, {get(_target,key){
        reads.push(key);assert.equal(key,'RAVRADAR_SOURCE_PRODUCER_UPGRADE_OPT_IN');return opted;
      }});
      await assert.rejects(selectSourceProducerCodeOnlySource(environment),/SOURCE_PRODUCER_UNISSUED/);
      assert.deepEqual(reads,['RAVRADAR_SOURCE_PRODUCER_UPGRADE_OPT_IN']);
    }
    assert.equal(io,0);
  }finally{t.mock.restoreAll();}
});

test(sourceIssued?'SOURCE actual issued CLI emits only a locally verified routing flag and rejects malformed requests':'SOURCE actual CLI emits only its neutral false flag and no flag after an unissued refusal',async()=>{
  const directory=await fs.mkdtemp(path.join(os.tmpdir(),'rr-source-selector-'));
  const output=path.join(directory,'github-env.txt');
  const base=Object.fromEntries(['PATH','Path','SystemRoot','WINDIR','TEMP','TMP']
    .filter(key=>typeof process.env[key]==='string').map(key=>[key,process.env[key]]));
  const run=opted=>spawnSync(process.execPath,['scripts/select-source-producer-code-only-source.mjs'],{
    cwd:root,encoding:'utf8',timeout:10000,
    env:{...base,...(sourceIssued?caller(opted):{}),GITHUB_ENV:output,RAVRADAR_SOURCE_PRODUCER_UPGRADE_OPT_IN:opted},
  });
  try{
    const neutral=run('false');assert.equal(neutral.error,undefined);
    assert.equal(neutral.status,0,neutral.stderr);assert.equal(neutral.stdout,'');assert.equal(neutral.stderr,'');
    const expected='RAVRADAR_SOURCE_PRODUCER_SOURCE_ACTIVE='+sourceIssued+'\n';
    assert.equal(await fs.readFile(output,'utf8'),expected);
    const refused=run(sourceIssued?'FALSE':'true');assert.equal(refused.error,undefined);assert.equal(refused.status,1);
    assert.equal(refused.stdout,'');assert.equal(refused.stderr,'SOURCE_PRODUCER_SOURCE_PHASE_REFUSED\n');
    assert.equal(await fs.readFile(output,'utf8'),expected,'Refusal cannot write an active flag');
  }finally{
    // Exactly the one output created by this test, inside its own mkdtemp directory.
    await fs.unlink(output).catch(error=>{if(error.code!=='ENOENT')throw error;});
    await fs.rmdir(directory);
  }
});
