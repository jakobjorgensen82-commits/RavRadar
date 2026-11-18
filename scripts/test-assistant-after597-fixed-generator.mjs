// Kun lokal kildeforberedelse. Der oprettes ingen ny binding, version eller SQL.
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
import {test} from 'node:test';
// Explicit normal current entry. No project constructor/runtime import
// precedes the fixed after598 issuance guard. Old PRE bodies stay unchanged.
const currentArguments=process.argv.slice(2);
assert(currentArguments.length===0||(currentArguments.length===1&&['--after598-current','--after599-current'].includes(currentArguments[0])),'Unknown or mixed assistant test mode');
const AFTER598_CURRENT_MODE=currentArguments[0]==='--after598-current';
const AFTER599_CURRENT_MODE=currentArguments[0]==='--after599-current';
const currentSource=await import('./lib/assistant-later-h0-successor-source.mjs');
if(AFTER598_CURRENT_MODE){
  currentSource.requireAssistantAfter598Output();currentSource.requireAssistantAfter598Release();
  assert.equal(currentSource.ACTIVE_ASSISTANT_SUCCESSOR,currentSource.INACTIVE_ASSISTANT_AFTER598_SUCCESSOR);
}
if(AFTER599_CURRENT_MODE){
  currentSource.requireAssistantAfter599Output();currentSource.requireAssistantAfter599Release();
  assert.equal(currentSource.ACTIVE_ASSISTANT_SUCCESSOR,currentSource.INACTIVE_ASSISTANT_AFTER599_SUCCESSOR);
}
const {prepareAssistantAfter597PredecessorAliases,prepareAssistantAfter597SuccessorStructure,
  buildAssistantAfter597BindingSuccessor}=await import('./build-assistant-later-h0-successor.mjs');
const {ACTIVE_ASSISTANT_SUCCESSOR,INACTIVE_SCALAR597_LATER_H0_SUCCESSOR,
  UNISSUED_ASSISTANT_AFTER597_SUCCESSOR:next,ASSISTANT_AFTER597_ALIASES,
  ASSISTANT_AFTER597_RELEASE,readScalar597LaterH0CanonicalSource,
  assistantLaterH0Definition:definition,assistantAfter597CheckpointContractFromBase}=await import('./lib/assistant-later-h0-successor-source.mjs');
const {checkpointCasContractFromCanonicalSource}=await import('./integrated-cutover-readiness.mjs');
const {assertAssistantBindingPrewriteCaller}=await import('./assistant-later-h0-binding-prewrite.mjs');

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const sha=value=>crypto.createHash('sha256').update(value).digest('hex');
const CP='ravradar_ravscore_checkpoint_';

// Current source checks run only after the fixed issuance/ACTIVE admission above.
if(AFTER598_CURRENT_MODE){
  const {verifyAssistantAfter598SourceTarget}=await import('./national584-source-evidence.mjs');
  await verifyAssistantAfter598SourceTarget();
}
if(AFTER599_CURRENT_MODE){
  const {verifyAssistantAfter599SourceTarget}=await import('./national584-source-evidence.mjs');
  await verifyAssistantAfter599SourceTarget();
}
if(!AFTER598_CURRENT_MODE&&!AFTER599_CURRENT_MODE){

test('normal aliaskonstruktion bruger hele den ægte597-forælder uden at udstede en efterfølger',async()=>{
  const original=await readScalar597LaterH0CanonicalSource();
  const prepared=await prepareAssistantAfter597PredecessorAliases();
  assert.equal(prepared.originalCanonicalSha256,sha(original.canonicalSource));
  assert.equal(prepared.originalCanonicalSha256,next.before.canonicalSha256);
  assert.equal(prepared.kind,'ASSISTANT_AFTER597_PREDECESSOR_ALIASES_ONLY');
  assert.equal(prepared.admission,'NO_ADMISSION');assert.equal(prepared.nextBinding,null);assert.equal(prepared.migration,null);
  assert.equal(prepared.migrationIssued,false);assert.equal(prepared.installationPerformed,false);
  assert.equal(prepared.sameH0Capability,false);assert.equal(prepared.validatorCount,43);
  assert.deepEqual(prepared.aliases.map(({name,signature})=>({name,signature})),ASSISTANT_AFTER597_ALIASES);
  assert.deepEqual(prepared.aliases.map(row=>row.name),[CP+'ask597_state_valid',CP+'ask597_payload_valid']);
  const[state,payload]=prepared.aliases;
  assert.equal(state.definition.replace('function public.'+state.name+'(','function public.'+CP+'integrated_state_valid('),
    definition(original.canonicalSource,CP+'integrated_state_valid'));
  assert.equal(payload.definition.replace('function public.'+payload.name+'(','function public.'+CP+'payload_valid(')
    .replace('public.'+state.name+'(','public.'+CP+'integrated_state_valid('),
    definition(original.canonicalSource,CP+'payload_valid'));
  for(const row of prepared.aliases)assert(!original.canonicalSource.includes('function public.'+row.name+'('));
  const addition=prepared.aliases.map(row=>row.definition).join('\n');
  const sourceWithAliasData=original.canonicalSource+'\n'+addition;
  assert.equal(sourceWithAliasData.slice(0,-addition.length-1),original.canonicalSource);
  for(const name of [...original.canonicalSource.matchAll(/^create or replace function public\.([a-z0-9_]+)\(/gm)].map(m=>m[1]))
    assert.equal(definition(sourceWithAliasData,name),definition(original.canonicalSource,name));
  const base=checkpointCasContractFromCanonicalSource(sourceWithAliasData,{sourcePhase:'native-original-continuity'});
  const contract=assistantAfter597CheckpointContractFromBase(sourceWithAliasData,base);
  assert.equal(contract.sha256,sha(contract.definition));
  for(const family of ['594','597'])for(const kind of ['state','payload'])
    assert.equal(contract.definition.split('-- assistant-later-h0-original'+family+'-'+kind+'-validator --').length,2);
  assert.equal(ACTIVE_ASSISTANT_SUCCESSOR,INACTIVE_SCALAR597_LATER_H0_SUCCESSOR);
  assert.equal(ASSISTANT_AFTER597_RELEASE,null);
});

test('uudstedte normale indgange og ugyldige konstruktørinput afvises før fil- eller netadgang',async()=>{
  const methods=['readFile','writeFile','lstat','mkdir','readdir'],saved=new Map(methods.map(key=>[key,fs[key]]));
  const previousFetch=globalThis.fetch;let io=0;
  for(const key of methods)fs[key]=async()=>{io++;throw new Error('UVENTET_FILADGANG');};
  globalThis.fetch=async()=>{io++;throw new Error('UVENTET_NETADGANG');};
  try{
    assert.throws(()=>next.requireBinding(),/ASSISTANT_AFTER597_UNISSUED/);
    assert.throws(()=>next.requireOutput(),/ASSISTANT_AFTER597_UNISSUED/);
    assert.throws(()=>next.requireRelease(),/ASSISTANT_AFTER597_UNISSUED/);
    assert.throws(()=>next.migration(),/ASSISTANT_AFTER597_UNISSUED/);
    await assert.rejects(next.readCanonicalSource(),/ASSISTANT_AFTER597_UNISSUED/);
    await assert.rejects(prepareAssistantAfter597SuccessorStructure({version:null}));
    await assert.rejects(buildAssistantAfter597BindingSuccessor({version:next.before.version}));
    await assert.rejects(prepareAssistantAfter597SuccessorStructure({version:next.before.version,profile:'594'}));
    await assert.rejects(prepareAssistantAfter597PredecessorAliases({profile:'594'}));
    assert.equal(io,0);
  }finally{for(const[key,value]of saved)fs[key]=value;globalThis.fetch=previousFetch;}
});

test('den normale CLI for den nye gren afviser både kontrol og skrivning uden udstedelse',async()=>{
  const folder=path.join(ROOT,'supabase/migrations');
  const before=await fs.readdir(folder);
  const env=Object.fromEntries(['PATH','Path','SystemRoot','WINDIR','TEMP','TMP'].filter(k=>process.env[k]!==undefined).map(k=>[k,process.env[k]]));
  for(const option of ['--check','--write']){
    const result=spawnSync(process.execPath,[path.join(ROOT,'scripts/build-assistant-later-h0-successor.mjs'),
      '--assistant-after597',option],{cwd:ROOT,env,encoding:'utf8',timeout:30000,maxBuffer:1024*1024});
    assert.equal(result.error,undefined);assert.equal(result.status,1);
    assert.match(result.stderr,/ASSISTANT_AFTER597_UNISSUED/);assert.equal(result.stdout,'');
  }
  assert.deepEqual(await fs.readdir(folder),before);
});

test('normal førskrivningskalder beholder597 og kan ikke vælge den uudstedte gren gennem miljøet',()=>{
  const changes={GITHUB_WORKFLOW:'Apply RavRadar backend bindings without weather',GITHUB_EVENT_NAME:'workflow_dispatch',
    GITHUB_REF:'refs/heads/main',GITHUB_SHA:'803f2c7c61237cef5c5f6b39ce0eaac5e090fb84',GITHUB_RUN_ID:'123',GITHUB_RUN_ATTEMPT:'1',
    RAVRADAR_ASSISTANT_LATER_H0_ORIGINAL_OPT_IN:'true',RAVRADAR_ASSISTANT_LATER_H0_BINDING_CONFIRMATION:'APPLY-WEATHER-MODEL-BINDING',
    RAVRADAR_ASSISTANT_AFTER597_PROFILE:'assistant-mixed-after597-successor'};
  const old=Object.fromEntries(Object.keys(changes).map(key=>[key,process.env[key]]));
  try{Object.assign(process.env,changes);assert.deepEqual(assertAssistantBindingPrewriteCaller(),INACTIVE_SCALAR597_LATER_H0_SUCCESSOR.binding);}
  finally{for(const[key,value]of Object.entries(old))if(value===undefined)delete process.env[key];else process.env[key]=value;}
});

}else if(AFTER598_CURRENT_MODE){

  const currentBuilder=await import('./build-assistant-later-h0-successor.mjs');
  test('after598 current normal constructor matches actual issued C/I/T and whole SQL without issuing',async()=>{
    const old=await currentSource.readAssistantAfter597CanonicalSource();
    const aliases=await currentBuilder.prepareAssistantAfter598PredecessorAliases();
    assert.equal(aliases.originalCanonicalSha256,currentSource.ASSISTANT_AFTER598_BEFORE.canonicalSha256);
    assert.equal(sha(old.canonicalSource),aliases.originalCanonicalSha256);
    assert.deepEqual(aliases.aliases.map(({name,signature})=>({name,signature})),currentSource.ASSISTANT_AFTER598_ALIASES);
    const made=await currentBuilder.buildAssistantAfter598BindingSuccessor({version:currentSource.requireAssistantAfter598Binding().version});
    assert.deepEqual(made.nextBinding,currentSource.requireAssistantAfter598Binding());
    assert.deepEqual({migrationSha256:made.migrationSha256,canonicalSha256:made.afterCanonicalSha256,
      checkpointContractSha256:made.checkpointContractSha256,tripBindingPolicySha256:made.tripBindingPolicySha256},currentSource.requireAssistantAfter598Output());
    assert.deepEqual(await fs.readFile(path.join(ROOT,'supabase/migrations',currentSource.assistantAfter598Migration().filename)),Buffer.from(made.migration));
    for(const original of old.originalDefinitions)assert.equal(definition(made.canonicalSource,original.name),original.definition);
    assert.equal(made.migrationIssued,false);assert.equal(made.productionAuthority,false);assert.equal(made.postgresRun,false);
  });
  test('after598 current malformed versions and caller tuple/source overrides refuse before IO',async t=>{
    let io=0;for(const key of ['readFile','writeFile','lstat','mkdir','readdir'])t.mock.method(fs,key,async()=>{io++;throw Error('UNEXPECTED_IO');});
    t.mock.method(globalThis,'fetch',async()=>{io++;throw Error('UNEXPECTED_NETWORK');});
    for(const version of [null,currentSource.ASSISTANT_AFTER598_BEFORE.version,'x','20260230000000']){
      if(version==='20260230000000'&&version>currentSource.ASSISTANT_AFTER598_BEFORE.version)continue;
      await assert.rejects(currentBuilder.prepareAssistantAfter598SuccessorStructure({version}));
    }
    for(const key of ['profile','family','tuple','root','head','source'])
      await assert.rejects(currentBuilder.prepareAssistantAfter598SuccessorStructure({version:currentSource.requireAssistantAfter598Binding().version,[key]:'caller-selected'}));
    await assert.rejects(currentBuilder.prepareAssistantAfter598PredecessorAliases({family:'597'}));
    assert.throws(()=>currentSource.requireAssistantAfter598Binding({C:'a'.repeat(64)}));
    assert.throws(()=>next.requireBinding({family:'598'}));assert.equal(io,0);
  });
  test('after598 current exact CLI checks actual SQL and create-only write collision preserves it',async()=>{
    const file=path.join(ROOT,'supabase/migrations',currentSource.assistantAfter598Migration().filename),before=await fs.readFile(file);
    const env=Object.fromEntries(['PATH','Path','SystemRoot','WINDIR','TEMP','TMP'].filter(k=>process.env[k]!==undefined).map(k=>[k,process.env[k]]));
    for(const args of [['--assistant-after598','--check'],['--assistant-after598','--write'],['--assistant-after598','--unknown'],['--assistant-after598','--check','--profile=597']]){
      const result=spawnSync(process.execPath,[path.join(ROOT,'scripts/build-assistant-later-h0-successor.mjs'),...args],{cwd:ROOT,env,encoding:'utf8',timeout:30000,maxBuffer:1024*1024});
      assert.equal(result.error,undefined);assert.equal(result.status,args[1]==='--check'&&args.length===2?0:1);
      if(args[1]==='--write')assert.match(result.stderr,/EEXIST/);
      assert.deepEqual(await fs.readFile(file),before);
    }
  });
  test('after598 current prewrite caller cannot choose a family by environment',()=>{
    const env={GITHUB_WORKFLOW:'Apply RavRadar backend bindings without weather',GITHUB_EVENT_NAME:'workflow_dispatch',GITHUB_REF:'refs/heads/main',
      GITHUB_SHA:'82200280c42b9060f14be2721ba7b766e0ede5a6',GITHUB_RUN_ID:'123',GITHUB_RUN_ATTEMPT:'1',
      RAVRADAR_ASSISTANT_LATER_H0_ORIGINAL_OPT_IN:'true',RAVRADAR_ASSISTANT_LATER_H0_BINDING_CONFIRMATION:'APPLY-WEATHER-MODEL-BINDING',
      RAVRADAR_ASSISTANT_AFTER597_PROFILE:'scalar597-later-h0-original594-successor'};
    const previous=Object.fromEntries(Object.keys(env).map(key=>[key,process.env[key]]));
    try{Object.assign(process.env,env);assert.deepEqual(assertAssistantBindingPrewriteCaller(),currentSource.requireAssistantAfter598Binding());
      assert.throws(()=>assertAssistantBindingPrewriteCaller({family:'597'}));
    }finally{for(const[key,value]of Object.entries(previous))if(value===undefined)delete process.env[key];else process.env[key]=value;}
  });

}else{

  const currentBuilder=await import('./build-assistant-later-h0-successor.mjs');
  test('after599 current normal constructor matches actual issued C/I/T and whole SQL without issuing',async()=>{
    const old=await currentSource.readAssistantAfter598CanonicalSource();
    const aliases=await currentBuilder.prepareAssistantAfter599PredecessorAliases();
    assert.equal(aliases.originalCanonicalSha256,currentSource.ASSISTANT_AFTER599_BEFORE.canonicalSha256);
    assert.equal(sha(old.canonicalSource),aliases.originalCanonicalSha256);
    assert.deepEqual(aliases.aliases.map(({name,signature})=>({name,signature})),currentSource.ASSISTANT_AFTER599_ALIASES);
    const made=await currentBuilder.buildAssistantAfter599BindingSuccessor({version:currentSource.requireAssistantAfter599Binding().version});
    assert.deepEqual(made.nextBinding,currentSource.requireAssistantAfter599Binding());
    assert.deepEqual({migrationSha256:made.migrationSha256,canonicalSha256:made.afterCanonicalSha256,
      checkpointContractSha256:made.checkpointContractSha256,tripBindingPolicySha256:made.tripBindingPolicySha256},currentSource.requireAssistantAfter599Output());
    assert.deepEqual(await fs.readFile(path.join(ROOT,'supabase/migrations',currentSource.assistantAfter599Migration().filename)),Buffer.from(made.migration));
    for(const original of old.originalDefinitions)assert.equal(definition(made.canonicalSource,original.name),original.definition);
    assert.equal(made.migrationIssued,false);assert.equal(made.productionAuthority,false);assert.equal(made.postgresRun,false);
  });
  test('after599 current malformed versions and caller tuple/source overrides refuse before IO',async t=>{
    let io=0;for(const key of ['readFile','writeFile','lstat','mkdir','readdir'])t.mock.method(fs,key,async()=>{io++;throw Error('UNEXPECTED_IO');});
    t.mock.method(globalThis,'fetch',async()=>{io++;throw Error('UNEXPECTED_NETWORK');});
    for(const version of [null,currentSource.ASSISTANT_AFTER599_BEFORE.version,'x','20260230000000']){
      if(version==='20260230000000'&&version>currentSource.ASSISTANT_AFTER599_BEFORE.version)continue;
      await assert.rejects(currentBuilder.prepareAssistantAfter599SuccessorStructure({version}));
    }
    for(const key of ['profile','family','tuple','root','head','source'])
      await assert.rejects(currentBuilder.prepareAssistantAfter599SuccessorStructure({version:currentSource.requireAssistantAfter599Binding().version,[key]:'caller-selected'}));
    await assert.rejects(currentBuilder.prepareAssistantAfter599PredecessorAliases({family:'597'}));
    assert.throws(()=>currentSource.requireAssistantAfter599Binding({C:'a'.repeat(64)}));
    assert.throws(()=>next.requireBinding({family:'599'}));assert.equal(io,0);
  });
  test('after599 current exact CLI checks actual SQL and create-only write collision preserves it',async()=>{
    const file=path.join(ROOT,'supabase/migrations',currentSource.assistantAfter599Migration().filename),before=await fs.readFile(file);
    const env=Object.fromEntries(['PATH','Path','SystemRoot','WINDIR','TEMP','TMP'].filter(k=>process.env[k]!==undefined).map(k=>[k,process.env[k]]));
    for(const args of [['--assistant-after599','--check'],['--assistant-after599','--write'],['--assistant-after599','--unknown'],['--assistant-after599','--check','--profile=597']]){
      const result=spawnSync(process.execPath,[path.join(ROOT,'scripts/build-assistant-later-h0-successor.mjs'),...args],{cwd:ROOT,env,encoding:'utf8',timeout:30000,maxBuffer:1024*1024});
      assert.equal(result.error,undefined);assert.equal(result.status,args[1]==='--check'&&args.length===2?0:1);
      if(args[1]==='--write')assert.match(result.stderr,/EEXIST/);
      assert.deepEqual(await fs.readFile(file),before);
    }
  });
  test('after599 current prewrite caller cannot choose a family by environment',()=>{
    const env={GITHUB_WORKFLOW:'Apply RavRadar backend bindings without weather',GITHUB_EVENT_NAME:'workflow_dispatch',GITHUB_REF:'refs/heads/main',
      GITHUB_SHA:'82200280c42b9060f14be2721ba7b766e0ede5a6',GITHUB_RUN_ID:'123',GITHUB_RUN_ATTEMPT:'1',
      RAVRADAR_ASSISTANT_LATER_H0_ORIGINAL_OPT_IN:'true',RAVRADAR_ASSISTANT_LATER_H0_BINDING_CONFIRMATION:'APPLY-WEATHER-MODEL-BINDING',
      RAVRADAR_ASSISTANT_AFTER597_PROFILE:'scalar597-later-h0-original594-successor'};
    const previous=Object.fromEntries(Object.keys(env).map(key=>[key,process.env[key]]));
    try{Object.assign(process.env,env);assert.deepEqual(assertAssistantBindingPrewriteCaller(),currentSource.requireAssistantAfter599Binding());
      assert.throws(()=>assertAssistantBindingPrewriteCaller({family:'597'}));
    }finally{for(const[key,value]of Object.entries(previous))if(value===undefined)delete process.env[key];else process.env[key]=value;}
  });

}
