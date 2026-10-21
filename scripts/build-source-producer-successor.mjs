// PRIVATE UNISSUED proposal: one normal metadata-only successor of actual585.
// No source/tuple overrides, installer, runtime/origin issuer or provider I/O.
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {computeCandidateGRollbackBundle,renderCandidateGRollbackGeneratedModule} from './build-candidate-g-rollback-bundle.mjs';
import {computeRavScoreModelBundle,renderGeneratedBundleModule} from './build-ravscore-model-bundle.mjs';
import {ravScoreContinuationImplementationSha256} from './lib/ravscore-continuation-implementation-contract.mjs';
import {checkpointCasContractFromCanonicalSource,tripBindingPolicyFromCanonicalSource} from './integrated-cutover-readiness.mjs';
import {signature,definitionGuard,schema2Guard,preservationQuery} from './build-account-statistics-assistant-successor.mjs';
import {ACCOUNT_STATISTICS_ASSISTANT_BEFORE as ANCIENT,ACCOUNT_STATISTICS_ASSISTANT_PROJECTION}
  from './lib/account-statistics-assistant-successor-source.mjs';
import {SOURCE_PRODUCER_BEFORE as OLD,SOURCE_PRODUCER_PROPOSED_RELEASE,SOURCE_PRODUCER_ALIASES,
  SOURCE_PRODUCER_PROJECTION,SOURCE_PRODUCER_REPLACEMENTS,SOURCE_PRODUCER_CONTRACT_LABELS,
  requireSourceProducerBinding,requireSourceProducerOutput,sourceProducerMigration,
  readSourceProducerPredecessorCanonicalSource,sourceProducerDefinition as definition,
  sourceProducerCheckpointContractFromBase} from './lib/source-producer-successor-source.mjs';
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),CP='ravradar_ravscore_checkpoint_';
const sha=value=>crypto.createHash('sha256').update(value).digest('hex');
const count=(source,value)=>source.split(value).length-1;
const once=(source,before,after)=>{assert.equal(count(source,before),1,'One exact whole-source edit');return source.replace(before,()=>after);};
const replaceHashes=(source,map)=>source.replace(/[a-f0-9]{64}/g,value=>map.get(value)??value);
function currentMetadata(source,next,expected){
  for(const key of ['C','I','T'])assert.equal(count(source,OLD[key]),expected[key]??0,'Exact585 metadata inventory '+key);
  const map=new Map(['C','I','T'].map(key=>[OLD[key],next[key]])),after=replaceHashes(source,map);
  assert.equal(replaceHashes(after,new Map([...map].map(([a,b])=>[b,a]))),source,'Whole metadata inverse');return after;
}
function compile(before,next){
  assert.equal(sha(before),OLD.canonicalSha256);
  for(const key of ['C','I','T'])assert.match(next[key],/^[a-f0-9]{64}$/);
  assert.equal(new Set(['C','I','T'].flatMap(k=>[OLD[k],next[k]])).size,6);
  for(const row of SOURCE_PRODUCER_ALIASES){assert(Buffer.byteLength(row.name)<=63);assert(!before.includes('function public.'+row.name+'('));}
  const [FROZEN_STATE,FROZEN_PAYLOAD,PROJECTION]=SOURCE_PRODUCER_ALIASES.map(row=>row.name);
  const stateBefore=definition(before,CP+'integrated_state_valid'),payloadBefore=definition(before,CP+'payload_valid');
  const state=once(stateBefore,'function public.'+CP+'integrated_state_valid(','function public.'+FROZEN_STATE+'(');
  const payload=once(once(payloadBefore,'function public.'+CP+'payload_valid(','function public.'+FROZEN_PAYLOAD+'('),
    'public.'+CP+'integrated_state_valid(','public.'+FROZEN_STATE+'(');
  assert.equal(once(state,'function public.'+FROZEN_STATE+'(','function public.'+CP+'integrated_state_valid('),stateBefore);
  assert.equal(once(once(payload,'function public.'+FROZEN_PAYLOAD+'(','function public.'+CP+'payload_valid('),
    'public.'+FROZEN_STATE+'(','public.'+CP+'integrated_state_valid('),payloadBefore);
  const aliases=[{...SOURCE_PRODUCER_ALIASES[0],definition:state},{...SOURCE_PRODUCER_ALIASES[1],definition:payload}];
  const changes=[],add=(name,after)=>changes.push({name,before:definition(before,name),after});
  for(const[suffix,inventory]of[['integrated_state_valid',{I:1}],['payload_valid',{I:1,C:1,T:1}],
    ['integrated_state_reason',{I:1}],['payload_reason',{I:1,C:1,T:1}]])add(CP+suffix,currentMetadata(definition(before,CP+suffix),next,inventory));
  // Reuse585's already separate SAME_H0 projection, NOT its native seed arm.
  // Its original584 input moves to frozen585; its585 output moves to NEXT.
  const oldProjection=definition(before,ACCOUNT_STATISTICS_ASSISTANT_PROJECTION),map=new Map(),inverseMap=new Map();
  for(const key of ['C','I','T']){assert.equal(count(oldProjection,ANCIENT[key]),key==='I'?2:1);assert.equal(count(oldProjection,OLD[key]),key==='I'?2:1);
    map.set(ANCIENT[key],OLD[key]);map.set(OLD[key],next[key]);inverseMap.set(OLD[key],ANCIENT[key]);inverseMap.set(next[key],OLD[key]);}
  let projection=once(oldProjection,'function public.'+ACCOUNT_STATISTICS_ASSISTANT_PROJECTION+'(','function public.'+PROJECTION+'(');
  projection=once(projection,'public.'+CP+'asa584_payload_valid(','public.'+FROZEN_PAYLOAD+'(');
  projection=replaceHashes(projection,map);
  let projectionInverse=replaceHashes(projection,inverseMap);
  projectionInverse=once(projectionInverse,'public.'+FROZEN_PAYLOAD+'(','public.'+CP+'asa584_payload_valid(');
  projectionInverse=once(projectionInverse,'function public.'+PROJECTION+'(','function public.'+ACCOUNT_STATISTICS_ASSISTANT_PROJECTION+'(');
  assert.equal(projectionInverse,oldProjection,'Whole issued585 projection inverse');
  aliases.push({...SOURCE_PRODUCER_ALIASES[2],definition:projection});
  const predecessor=definition(before,CP+'predecessor_payload_valid');
  add(CP+'predecessor_payload_valid',once(predecessor,'begin\n',
    'begin\n  if p_current_implementation_sha256 = '+"'"+next.T+"'\n"
    +"    and p_payload #>> '{modelBinding,modelBundleSha256}' = '"+OLD.I+"'\n"
    +'    and public.'+PROJECTION+'(p_payload,p_target_reference) is not null\n  then return true; end if;\n'));
  let trip=definition(before,'ravradar_trip_v3_binding_allowed');
  for(const key of ['I','C'])trip=once(trip,"        '"+OLD[key]+"'\n      )","        '"+OLD[key]+"',\n        '"+next[key]+"'\n      )");
  add('ravradar_trip_v3_binding_allowed',trip);
  const casBefore=definition(before,CP+'cas');
  let cas=once(casBefore,'  v_asa_same_h0_predecessor_payload jsonb;',
    '  v_asa_same_h0_predecessor_payload jsonb;\n  v_source_same_h0_predecessor_payload jsonb;');
  const dispatch="    if p_payload ->> 'continuationStateContractSha256' = '"+OLD.T+"'\n";
  cas=once(cas,dispatch,"    if p_payload ->> 'continuationStateContractSha256' = '"+next.T+"'\n"
    +"      and v_payload #>> '{modelBinding,modelBundleSha256}' = '"+OLD.I+"'\n    then\n"
    +'      v_source_same_h0_predecessor_payload := public.'+PROJECTION+'(v_payload,v_central_reference);\n    end if;\n'+dispatch);
  cas=once(cas,'    if v_asa_same_h0_predecessor_payload is not null',
    '    if v_source_same_h0_predecessor_payload is not null\n      or v_asa_same_h0_predecessor_payload is not null');
  const comparison='    if v_central_is_compatible_predecessor and v_asa_same_h0_predecessor_payload is not null then';
  cas=once(cas,comparison,'    if v_central_is_compatible_predecessor and v_source_same_h0_predecessor_payload is not null then\n'
    +'      v_exact_predecessor_same_target_transition := v_central_reference = p_target_reference\n'
    +"        and (v_source_same_h0_predecessor_payload #- '{generationSha256}' #- '{stateSha256}'\n"
    +"          #- '{candidateGRollbackCompanion,generationSha256}')\n"
    +"        = (p_payload #- '{generationSha256}' #- '{stateSha256}'\n"
    +"          #- '{candidateGRollbackCompanion,generationSha256}');\n"+comparison.replace('    if ','    elsif '));
  const numericPrefix='    elsif p_target_reference > v_central_reference\n',at=cas.indexOf(numericPrefix);assert(at>=0);
  const newer=numericPrefix+"      and p_payload ->> 'continuationStateContractSha256' = '"+next.T+"'\n"
    +'      and public.'+FROZEN_PAYLOAD+'(v_payload,v_central_reference)\n    then\n'
    +'      -- Genuine preserved585 only; normal newer-reference comparison remains below.\n'
    +'      v_central_is_compatible_predecessor := false;\n';
  cas=cas.slice(0,at)+newer+cas.slice(at);
  assert.equal(count(cas,numericPrefix),count(casBefore,numericPrefix)+1);
  const tail=casBefore.indexOf('    -- Equality is checked before the expected version.');
  assert(tail>=0&&cas.endsWith(casBefore.slice(tail)),'Whole retry/version/write/refusal tail unchanged');add(CP+'cas',cas);
  const contractBefore=definition(before,CP+'contract');
  let contract=once(contractBefore,'  v_asa_same_h0_projection_definition text;',
    '  v_asa_same_h0_projection_definition text;\n  v_source585_state_definition text;\n  v_source585_payload_definition text;\n  v_source_same_h0_projection_definition text;');
  const oid=/  v_validator_oids oid\[\] := array\[([\s\S]*?)\n  \];/.exec(contractBefore);assert(oid);
  const oldOids=[...oid[1].matchAll(/pg_catalog\.to_regprocedure\(\s*'([^']+)'\s*\)/g)].map(m=>m[1]);
  assert.equal(oldOids.length,28);assert.equal(new Set(oldOids).size,28);
  assert.equal(oldOids.at(-1),'public.'+ACCOUNT_STATISTICS_ASSISTANT_PROJECTION+'(jsonb,timestamptz)');
  const newOids=aliases.map(row=>"    pg_catalog.to_regprocedure('public."+row.name+row.signature+"')").join(',\n');
  contract=once(contract,oid[0],oid[0].slice(0,-5)+',\n'+newOids+'\n  ];');
  const variables=['v_source585_state_definition','v_source585_payload_definition','v_source_same_h0_projection_definition'];
  const bodies=variables.map((variable,index)=>"  select pg_catalog.btrim(p.prosrc, E' \\n\\r\\t') into "+variable+'\n'
    +'  from pg_catalog.pg_proc p where p.oid = v_validator_oids['+(oldOids.length+index+1)+'];\n').join('\n');
  contract=once(contract,'  v_checkpoint_definition := v_canonical_time_definition',bodies+'\n  v_checkpoint_definition := v_canonical_time_definition');
  const oldTail="    || E'\\n-- account-statistics-assistant-same-h0-projection --\\n' || v_asa_same_h0_projection_definition;";
  contract=once(contract,oldTail,oldTail.slice(0,-1)+SOURCE_PRODUCER_CONTRACT_LABELS.map((label,index)=>
    "\n    || E'\\n-- "+label+" --\\n' || "+variables[index]).join('')+';');
  contract=once(contract,"where m.version::text = '"+OLD.version+"'","where m.version::text = '"+next.version+"'");
  const afterOid=/  v_validator_oids oid\[\] := array\[([\s\S]*?)\n  \];/.exec(contract);assert(afterOid);
  assert.equal((afterOid[1].match(/pg_catalog\.to_regprocedure\(/g)??[]).length,31);
  assert.equal((contract.match(/\|\| v_[a-z0-9_]+_definition/g)??[]).length+1,34);add(CP+'contract',contract);
  assert.deepEqual(changes.map(row=>row.name),SOURCE_PRODUCER_REPLACEMENTS);
  const insertion=aliases.map(row=>row.definition+'\nrevoke all on function public.'+row.name+row.signature+' from public, anon, authenticated;\n\n').join('');
  let canonicalSource=before;for(const row of changes)canonicalSource=once(canonicalSource,row.before,row.after);
  canonicalSource=once(canonicalSource,changes[0].after,insertion+changes[0].after);
  let inverse=once(canonicalSource,insertion,'');for(const row of [...changes].reverse())inverse=once(inverse,row.after,row.before);
  assert.equal(inverse,before,'Whole issued585 canonical inverse');
  for(const name of [CP+'native_origin_projection',ACCOUNT_STATISTICS_ASSISTANT_PROJECTION])
    assert.equal(definition(canonicalSource,name),definition(before,name),'All existing projections unchanged');
  return Object.freeze({aliases,changes,canonicalSource,nextBinding:next,wholeCanonicalInverse:true,
    originalCanonicalSha256:sha(before),sameH0MetadataOnly:true,numericalSqlRulesChanged:false,installationPerformed:false,sqlExecuted:false});
}
function wrap(core,prior){
  assert(core.wholeCanonicalInverse&&core.sameH0MetadataOnly&&!core.numericalSqlRulesChanged);
  assert.equal(sha(prior.canonicalSource),OLD.canonicalSha256);assert.equal(prior.statisticsSchemaVersion,2);
  const names=[...prior.canonicalSource.matchAll(/^create or replace function public\.((?:ravradar_ravscore_checkpoint_[a-z0-9_]+)|version_admin_document|ravradar_trip_v3_binding_allowed)\(/gm)].map(m=>m[1]);
  assert.equal(names.length,new Set(names).size);const definitions=names.map(name=>definition(prior.canonicalSource,name));
  const signatures=definitions.map(signature),all=[...signatures,...core.aliases.map(row=>'public.'+row.name+row.signature)];
  assert.equal(new Set(all.map(value=>value.replace(/^public\.([a-z0-9_]+)\(/,(_all,name)=>'public.'+name.slice(0,63)+'('))).size,all.length);
  const commands=core.aliases.flatMap(row=>[row.definition,'revoke all on function public.'+row.name+row.signature+' from public, anon, authenticated;'])
    .concat(core.changes.map(row=>row.after),['alter function public.'+CP+"cas(bigint,timestamptz,jsonb) set statement_timeout = '55s';"]);
  assert(commands.every(value=>value.startsWith('create or replace function ')||value.startsWith('revoke all on function ')||value.startsWith('alter function public.'+CP+'cas(')));
  const ddl=commands.map((command,index)=>{const tag='$source_producer_ddl_'+index+'$';assert(!command.includes(tag));return '  execute '+tag+'\n'+command+'\n'+tag+';';});
  const absent=core.aliases.map(row=>"  if exists(select 1 from pg_catalog.pg_proc where pronamespace='public'::regnamespace and proname='"+row.name+"') then raise exception 'SOURCE_PRODUCER_DESTINATION_EXISTS'; end if;");
  const snapshot=preservationQuery(signatures);
  const prefix=['do $source_producer_successor$',
    'declare original_catalog jsonb; after_catalog jsonb; account_observed jsonb; function_name text;','begin',
    "  if (select max(version::text) from supabase_migrations.schema_migrations) is distinct from '"+OLD.version+"' then raise exception 'SOURCE_PRODUCER_EXACT_INSTALLED585_REQUIRED'; end if;",
    "  if exists(select 1 from supabase_migrations.schema_migrations where version::text=any(array['20261014140000','20261015030000','20261016030000'])) then raise exception 'SOURCE_PRODUCER_ARCHIVED_PHASE_MUST_BE_ABSENT'; end if;",
    "  if not exists(select 1 from supabase_migrations.schema_migrations where version::text='20261013230000') then raise exception 'SOURCE_PRODUCER_INSTALLED230_REQUIRED'; end if;",
    '  lock table public.account_activity_journal,public.account_statistics_preferences in access share mode;'].join('\n');
  const migration=['-- Original-preserving post585 SOURCE metadata successor; SOURCE ONLY.',
    '-- Existing585 and older originals/projections and ALL numerical SQL guards preserved.',
    'begin;',"set local statement_timeout = '55s';","set local lock_timeout = '5s';",prefix,...absent,
    ...definitions.map(definitionGuard),schema2Guard(prior.statisticsExpected),'  '+snapshot+' into original_catalog;',...ddl,
    ...names.map(name=>definitionGuard(definition(core.canonicalSource,name))),...core.aliases.map(row=>definitionGuard(row.definition)),
    schema2Guard(prior.statisticsExpected),'  '+snapshot+' into after_catalog;',
    "  if after_catalog is distinct from original_catalog then raise exception 'SOURCE_PRODUCER_ORIGINAL_PROPERTIES_OR_ACCOUNT_CHANGED'; end if;",
    'end;\n$source_producer_successor$;',"notify pgrst, 'reload schema';",'commit;',''].join('\n\n').replace(/\n+$/,'\n');
  assert.deepEqual([...migration.matchAll(/^create or replace function public\.([a-z0-9_]+)\(/gm)].map(m=>m[1]),
    [...core.aliases.map(row=>row.name),...SOURCE_PRODUCER_REPLACEMENTS]);
  return Object.freeze({...core,migration,migrationSha256:sha(migration),afterCanonicalSha256:sha(core.canonicalSource),
    transactionalWrapperPrepared:true,statisticsSchema2Source:prior.statisticsSchema2Source,postgresRun:false,migrationIssued:false,productionAuthority:false});
}
async function regularSource(relative){const file=path.join(ROOT,relative),stat=await fs.lstat(file);assert(stat.isFile()&&!stat.isSymbolicLink());
  return (await fs.readFile(file,'utf8')).replace(/^\uFEFF/,'').replace(/\r\n?/g,'\n');}
export async function prepareSourceProducerSuccessorStructure(){
  assert.equal(arguments.length,0);const issued=requireSourceProducerBinding(); // BEFORE I/O/builders.
  assert.equal(JSON.parse(await regularSource('package.json')).version,SOURCE_PRODUCER_PROPOSED_RELEASE);
  const candidate=await computeCandidateGRollbackBundle();
  assert.equal(await regularSource('scripts/rollback-assets/ravscore-model-bundle.generated.js'),renderCandidateGRollbackGeneratedModule(candidate));
  const integrated=await computeRavScoreModelBundle();
  assert.equal(await regularSource('js/core/ravscore-model-bundle.generated.js'),renderGeneratedBundleModule(integrated));
  const next={version:issued.version,C:candidate.modelBundleSha256,I:integrated.modelBundleSha256,T:await ravScoreContinuationImplementationSha256()};
  assert.deepEqual(next,{version:issued.version,C:issued.C,I:issued.I,T:issued.T},'Only actual physical issued C/I/T');
  assert.equal(candidate.modelBundleSha256,issued.candidateManifestSha256);
  const canonical=value=>Array.isArray(value)?value:value&&typeof value==='object'?Object.fromEntries(Object.keys(value).sort().map(key=>[key,value[key]])):value;
  assert.equal(sha(JSON.stringify(integrated.manifest,(_key,value)=>canonical(value))),issued.integratedManifestSha256);
  const prior=await readSourceProducerPredecessorCanonicalSource();return compile(prior.canonicalSource,next);
}
export async function buildSourceProducerBindingSuccessor(){
  assert.equal(arguments.length,0);requireSourceProducerBinding();
  const core=await prepareSourceProducerSuccessorStructure(),prior=await readSourceProducerPredecessorCanonicalSource(),result=wrap(core,prior);
  const contract=sourceProducerCheckpointContractFromBase(result.canonicalSource,
    checkpointCasContractFromCanonicalSource(result.canonicalSource,{sourcePhase:'account-statistics-assistant'}));
  return Object.freeze({...result,checkpointContractSha256:contract.sha256,
    tripBindingPolicySha256:tripBindingPolicyFromCanonicalSource(result.canonicalSource).sha256});
}
async function main(){
  assert(process.argv.length===2||(process.argv.length===3&&['--check','--write'].includes(process.argv[2])));
  const pins=requireSourceProducerOutput(); // No render or SQL materialization while unissued.
  const result=await buildSourceProducerBindingSuccessor();
  assert.deepEqual({migrationSha256:result.migrationSha256,canonicalSha256:result.afterCanonicalSha256,
    checkpointContractSha256:result.checkpointContractSha256,tripBindingPolicySha256:result.tripBindingPolicySha256},pins);
  const file=path.join(ROOT,'supabase/migrations',sourceProducerMigration().filename);
  if(process.argv[2]==='--write')await fs.writeFile(file,result.migration,{flag:'wx'});
  else assert.deepEqual(await fs.readFile(file),Buffer.from(result.migration));
  console.log('Exact post585 SOURCE metadata source checked; no installation or state admission.');
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))await main();
