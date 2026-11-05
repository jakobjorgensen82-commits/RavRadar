// Kun lokal kildeforberedelse. Der oprettes ingen ny binding, version eller SQL.
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
import {test} from 'node:test';
import {prepareAssistantAfter597PredecessorAliases,prepareAssistantAfter597SuccessorStructure,
  buildAssistantAfter597BindingSuccessor} from './build-assistant-later-h0-successor.mjs';
import {ACTIVE_ASSISTANT_SUCCESSOR,INACTIVE_SCALAR597_LATER_H0_SUCCESSOR,
  UNISSUED_ASSISTANT_AFTER597_SUCCESSOR as next,ASSISTANT_AFTER597_ALIASES,
  ASSISTANT_AFTER597_RELEASE,readScalar597LaterH0CanonicalSource,
  assistantLaterH0Definition as definition,assistantAfter597CheckpointContractFromBase}
  from './lib/assistant-later-h0-successor-source.mjs';
import {checkpointCasContractFromCanonicalSource} from './integrated-cutover-readiness.mjs';
import {assertAssistantBindingPrewriteCaller} from './assistant-later-h0-binding-prewrite.mjs';

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const sha=value=>crypto.createHash('sha256').update(value).digest('hex');
const CP='ravradar_ravscore_checkpoint_';

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
