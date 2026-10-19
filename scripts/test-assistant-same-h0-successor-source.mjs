// Normal source-only contract. No native PostgreSQL, actual B/S or origin grant.
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync,execFileSync} from 'node:child_process';
import {runInNewContext} from 'node:vm';
import test from 'node:test';
import {ASSISTANT_SAME_H0_BEFORE as OLD,ASSISTANT_SAME_H0_BINDING,ASSISTANT_SAME_H0_OUTPUT,
  ASSISTANT_SAME_H0_PROJECTION as PROJECTION,ASSISTANT_SAME_H0_ALIASES as ALIASES,
  ASSISTANT_SAME_H0_REPLACEMENTS as REPLACEMENTS,requireAssistantSameH0Binding,
  requireAssistantSameH0Output,assistantSameH0Migration,assistantSameH0Definition as definition,
  readAssistantSameH0PredecessorCanonicalSource,readAssistantSameH0CanonicalSource,
  assistantSameH0CheckpointContractFromBase} from './lib/assistant-same-h0-successor-source.mjs';
import {prepareAssistantSameH0SuccessorStructure,buildAssistantSameH0BindingSuccessor}
  from './build-assistant-same-h0-successor.mjs';
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const CP='ravradar_ravscore_checkpoint_',sha=x=>crypto.createHash('sha256').update(x).digest('hex');
// Synthetic compiler operands ONLY. No candidate C/I/T or release is issued.
const NEXT=Object.freeze({version:'20990101000000',
  C:sha('TESTONLY_ASSISTANT_CURRENT140000_C'),I:sha('TESTONLY_ASSISTANT_CURRENT140000_I'),
  T:sha('TESTONLY_ASSISTANT_CURRENT140000_T')});
let prior,built,core,lexical;
test('UNISSUED public API refuses before source I/O and rejects caller authority',async()=>{
  assert.equal(ASSISTANT_SAME_H0_BINDING,null);assert.equal(ASSISTANT_SAME_H0_OUTPUT,null);
  for(const use of [requireAssistantSameH0Binding,requireAssistantSameH0Output,assistantSameH0Migration])
    assert.throws(()=>use(),{code:'ASSISTANT_SAME_H0_UNISSUED'});
  for(const use of [prepareAssistantSameH0SuccessorStructure,buildAssistantSameH0BindingSuccessor]){
    await assert.rejects(use(),{code:'ASSISTANT_SAME_H0_UNISSUED'});
    await assert.rejects(use({tuple:NEXT}));
  }
  await assert.rejects(readAssistantSameH0CanonicalSource({migrationsDirectory:'/caller'}),{code:'ASSISTANT_SAME_H0_UNISSUED'});
  await assert.rejects(readAssistantSameH0PredecessorCanonicalSource({source:'/caller'}));
  const cli=spawnSync(process.execPath,[path.join(ROOT,'scripts/build-assistant-same-h0-successor.mjs'),'--describe'],
    {encoding:'utf8',timeout:10000,env:{...process.env,SUPABASE_URL:'',SUPABASE_SERVICE_ROLE_KEY:'',SUPABASE_DB_PASSWORD:''}});
  assert.equal(cli.status,1);assert.equal(cli.stdout,'');assert.equal(cli.stderr.trim(),'ASSISTANT_SAME_H0_UNISSUED');
});
test('normal frozen140000 source plus whole original/CAS/catalog inverse',async()=>{
  prior=await readAssistantSameH0PredecessorCanonicalSource();
  assert.equal(sha(prior.canonicalSource),OLD.canonicalSha256);assert.equal(prior.admission,'NO_ADMISSION');
  const source=await fs.readFile(path.join(ROOT,'scripts/build-assistant-same-h0-successor.mjs'),'utf8');
  const slice=(a,b)=>{assert.equal(source.split(a).length,2);assert.equal(source.split(b).length,2);return source.slice(source.indexOf(a),source.indexOf(b));};
  const constants=slice("const CP='ravradar_ravscore_checkpoint_'",'const sha=value=>');
  const compiler=slice('const sha=value=>','const literal=value=>');
  const wrapper=slice('const literal=value=>','export async function prepareAssistantSameH0SuccessorStructure');
  lexical=runInNewContext(constants+compiler+wrapper+'\n({compileAssistantSameH0Structure,wrapAssistantSameH0Source,body,signature,definitionGuard});',
    {assert,crypto,Buffer,OLD,PROJECTION,definition});
  core=lexical.compileAssistantSameH0Structure(prior.canonicalSource,NEXT);
  built=lexical.wrapAssistantSameH0Source(core,prior);
  assert.equal(core.wholeCanonicalInverse,true);assert.equal(core.changes.length,9);assert.equal(core.aliases.length,2);
  assert.equal(core.oldSeedProjectionPreserved,true);assert.equal(core.sameH0ProjectionIsNotAuthentication,true);
  assert.equal(built.migrationIssued,false);assert.equal(built.postgresRun,false);assert.equal(built.productionAuthority,false);
  for(const row of prior.originalDefinitions)assert.equal(definition(core.canonicalSource,row.name),row.definition);
  for(const name of ['cmw0200_state_valid','cmw0200_payload_valid','cmw_predecessor_projection'])
    assert.equal(definition(core.canonicalSource,CP+name),definition(prior.canonicalSource,CP+name));
  const oldState=definition(prior.canonicalSource,CP+'integrated_state_valid');
  assert.equal(definition(core.canonicalSource,CP+'origin140000_state_valid').replace('function public.'+CP+'origin140000_state_valid(',
    'function public.'+CP+'integrated_state_valid('),oldState);
  const oldPayload=definition(prior.canonicalSource,CP+'payload_valid');
  assert.equal(definition(core.canonicalSource,CP+'origin140000_payload_valid')
    .replace('function public.'+CP+'origin140000_payload_valid(','function public.'+CP+'payload_valid(')
    .replace('public.'+CP+'origin140000_state_valid(','public.'+CP+'integrated_state_valid('),oldPayload);
  let inverse=core.canonicalSource;
  const inserted=ALIASES.map(row=>definition(inverse,row.name)+'\nrevoke all on function public.'+row.name+row.signature+' from public, anon, authenticated;\n\n').join('');
  assert.equal(inverse.split(inserted).length,2);inverse=inverse.replace(inserted,'');
  for(const row of [...core.changes].reverse()){assert.equal(inverse.split(row.after).length,2);inverse=inverse.replace(row.after,()=>row.before);}
  assert.equal(inverse,prior.canonicalSource);
  for(const [label,invalid]of [['source',prior.canonicalSource+'\n-- changed'],['version',{...NEXT,version:OLD.version}],['binding',{...NEXT,I:OLD.I}]])
    assert.throws(()=>lexical.compileAssistantSameH0Structure(label==='source'?invalid:prior.canonicalSource,label==='source'?NEXT:invalid));
});
test('SAME_H0 projection preserves old seed guard and every same-time/CAS refusal',()=>{
  assert(core&&built);
  const oldProjection=definition(prior.canonicalSource,CP+'native_origin_projection');
  const preserved=definition(core.canonicalSource,CP+'native_origin_projection');
  assert.equal(preserved.replace('public.'+CP+'origin140000_payload_valid(','public.'+CP+'payload_valid('),oldProjection);
  const projection=definition(core.canonicalSource,PROJECTION);
  assert(projection.includes('if not public.'+CP+'origin140000_payload_valid(p_payload,p_target_reference)'));
  for(const value of ['rr-20261016191945-210','2026-10-16T10:00:00.000Z',
    'd337d7fd8d111af723e26d9252bb8f56e679cb4dd66a226612e62971f4d661bb'])assert(!projection.includes(value));
  for(const value of ['16777216','<> 673','exception when others then return null;',OLD.I,OLD.C,OLD.T,NEXT.I,NEXT.C,NEXT.T])assert(projection.includes(value));
  const oldCas=definition(prior.canonicalSource,CP+'cas'),cas=definition(core.canonicalSource,CP+'cas');
  assert(cas.includes('v_same_h0_predecessor_payload is not null'));
  assert(cas.includes('v_exact_predecessor_same_target_transition := v_central_reference = p_target_reference'));
  const tail='    -- Equality is checked before the expected version.';
  assert.equal(cas.slice(cas.indexOf(tail)),oldCas.slice(oldCas.indexOf(tail)));
  for(const code of ['42501','22023','40001'])assert(cas.includes("errcode = '"+code+"'"));
  const numeric='    elsif p_target_reference > v_central_reference\n';
  assert.equal(cas.split(numeric).length,oldCas.split(numeric).length+1);
  const originalArms=oldCas.slice(oldCas.indexOf(numeric),oldCas.indexOf('    elsif public.'+CP+'payload_valid(',oldCas.indexOf(numeric)));
  assert(cas.includes(originalArms),'All original numerical arms WHOLE');
  const oldTrip=definition(prior.canonicalSource,'ravradar_trip_v3_binding_allowed'),trip=definition(core.canonicalSource,'ravradar_trip_v3_binding_allowed');
  assert.equal(trip.replace("        '"+OLD.I+"',\n        '"+NEXT.I+"'","        '"+OLD.I+"'")
    .replace("        '"+OLD.C+"',\n        '"+NEXT.C+"'","        '"+OLD.C+"'"),oldTrip);
});
test('transaction/ACL/full-property contract includes all new bodies, no data grants',()=>{
  assert(built);const sql=built.migration;
  assert(sql.includes("is distinct from '20261017140000'"));
  assert(sql.includes('ASSISTANT_SAME_H0_EXACT_INSTALLED140000_REQUIRED'));
  assert(sql.includes('original_catalog')&&sql.includes('after_catalog is distinct from original_catalog'));
  assert(sql.includes('statement_timeout')&&sql.includes("'55s'"));
  assert.equal(sql.split('CMW_SQL_EXACT_SCHEMA2_REQUIRED').length,3);
  assert.deepEqual([...sql.matchAll(/^create or replace function public\.([a-z0-9_]+)\(/gm)].map(m=>m[1]),
    [...ALIASES.map(r=>r.name),...REPLACEMENTS]);
  for(const row of ALIASES){assert(Buffer.byteLength(row.name)<=63);assert(sql.includes('revoke all on function public.'+row.name+row.signature+' from public, anon, authenticated;'));}
  const contract=definition(core.canonicalSource,CP+'contract');
  for(const i of [24,25,26])assert(contract.includes('v_validator_oids['+i+']'));
  for(const label of ['origin140000-original-state-validator','origin140000-original-payload-validator','assistant-same-h0-metadata-projection'])assert(contract.includes(label));
  // Reuse the WHOLE genuine fixed140000 pure renderer, not a fake contract or
  // another parser. Only its export keyword is removed for lexical exposure.
  const fixed=execFileSync('git',['-C',ROOT,'cat-file','blob',
    'a5684a4eb156bcf61530b1aa5f1c7b9afa08c8ad:scripts/integrated-cutover-readiness.mjs'],{encoding:'utf8',maxBuffer:2*1024*1024});
  const fixedSlice=(a,b)=>{assert.equal(fixed.split(a).length,2);assert.equal(fixed.split(b).length,2);return fixed.slice(fixed.indexOf(a),fixed.indexOf(b));};
  const normalize=fixedSlice('function normaliseTripBindingPolicyDefinition(','\nexport async function expectedTripBindingPolicy');
  const extract=fixedSlice('function sqlFunctionBody(','\nexport async function expectedCheckpointCasContract');
  const exported=fixedSlice('export function checkpointCasContractFromCanonicalSource(','\nexport async function expectedTripActiveAdmissionPolicy');
  const local=exported.replace('export function ','function ');assert.equal('export '+local,exported);
  const id=/export const CHECKPOINT_CAS_CONTRACT_ID\s*=\s*'([^']+)'/.exec(fixed);assert(id);
  const render=runInNewContext(normalize+extract+local+'\ncheckpointCasContractFromCanonicalSource;',
    {assert,sha256:sha,CHECKPOINT_CAS_CONTRACT_ID:id[1],CURRENT_MEMORY_WARMUP_PROJECTION:CP+'cmw_predecessor_projection',
      ESTABLISHED_NATIVE_CURRENT_ORIGIN_PROJECTION:CP+'native_origin_projection'});
  const base=render(core.canonicalSource,{sourcePhase:'established-native-current-origin'});
  const actual=assistantSameH0CheckpointContractFromBase(core.canonicalSource,base);
  for(const row of ALIASES){const whole=definition(core.canonicalSource,row.name);
    const changed=core.canonicalSource.replace(whole,()=>whole.replace('as $$',()=> 'as $$\n-- changed'));
    assert.notEqual(assistantSameH0CheckpointContractFromBase(changed,base).sha256,actual.sha256);
    assert.throws(()=>assistantSameH0CheckpointContractFromBase(core.canonicalSource.replace(whole,''),base));}
  assert.throws(()=>assistantSameH0CheckpointContractFromBase(core.canonicalSource,{...base,sha256:'0'.repeat(64)}));
  assert(sql.startsWith('-- Later SAME_H0_MODEL_METADATA'));assert(sql.endsWith('commit;\n'));
});

test('new source routing is fail-closed and normal seven-consumer synchronizer preserves originals',async()=>{
  const {synchronizeRavScoreModelBinding,checkpointMetadataCasBlock}=await import('./sync-ravscore-model-binding.mjs');
  const {ravScoreModelBinding}=await import('../js/core/ravscore-model-contract.js');
  const {ravScoreModelBinding:candidateGRollbackModelBinding}=await import('./rollback-assets/ravscore-model-contract.js');
  await assert.rejects(synchronizeRavScoreModelBinding({write:false}),{code:'ASSISTANT_SAME_H0_UNISSUED'});
  await assert.rejects(synchronizeRavScoreModelBinding({write:true,root:'/must-not-be-read-or-written'}),{code:'ASSISTANT_SAME_H0_UNISSUED'});
  const binding={...ravScoreModelBinding(),modelBundleSha256:NEXT.I};
  const candidate={...candidateGRollbackModelBinding(),modelBundleSha256:NEXT.C};
  // The genuine unchanged generated model is still I038. A pure TESTONLY
  // compiler tuple must NOT pass its current normal admission assertion.
  assert.throws(()=>checkpointMetadataCasBlock(core.canonicalSource,binding,candidate,NEXT.T),/incompatible modelBundleSha256/u);
  assert.throws(()=>checkpointMetadataCasBlock(core.canonicalSource,{...binding,modelBundleSha256:OLD.I},candidate,NEXT.T));
  const alias=definition(core.canonicalSource,CP+'origin140000_state_valid');
  assert.throws(()=>checkpointMetadataCasBlock(core.canonicalSource.replace(alias,()=>alias.replace('as $$','as $$\n-- changed')),binding,candidate,NEXT.T));
  const source=await fs.readFile(path.join(ROOT,'scripts/sync-ravscore-model-binding.mjs'),'utf8');
  assert(source.includes('JSON_BINDING_FILES.length + SQL_BINDING_PATHS.length + 3'));
  assert(source.includes("Historical migration cannot be a RavScore binding write target"));
  const child=spawnSync(process.execPath,[path.join(ROOT,'scripts/sync-ravscore-model-binding.mjs'),'--write'],{encoding:'utf8',timeout:10000});
  assert.equal(child.status,1);assert.equal(child.stdout,'');assert.equal(child.stderr.trim(),'ASSISTANT_SAME_H0_UNISSUED');
  const candidatePath=process.env.ASSISTANT_PRIVATE_UNISSUED_CANDIDATE_PATH;
  if(candidatePath){
    assert(path.isAbsolute(candidatePath));assert.equal(path.basename(candidatePath),'migration-candidate.sql.in');
    assert(path.dirname(candidatePath).replaceAll('\\','/').endsWith('/.cache/assistant-a568-successor-unissued-v1'));
    let template=built.migration;
    for(const [needle,placeholder]of [[NEXT.version,'@NEXT_VERSION_UNISSUED@'],[NEXT.C,'@NEXT_C_UNISSUED@'],[NEXT.I,'@NEXT_I_UNISSUED@'],[NEXT.T,'@NEXT_T_UNISSUED@']]){
      assert(template.includes(needle));template=template.split(needle).join(placeholder);
    }
    for(const value of Object.values(NEXT))assert(!template.includes(value));
    template='-- PRIVATE UNISSUED NON-INSTALLABLE TEMPLATE; generated from pure TESTONLY operands.\n'+template;
    await fs.writeFile(candidatePath,template,{flag:'wx',mode:0o600});
  }
});
