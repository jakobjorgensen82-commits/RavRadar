// PRIVATE UNISSUED proposal: one normal metadata-only successor of genuine593.
// No source/tuple overrides, installer, runtime/origin issuer or provider I/O.
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';
import {computeCandidateGRollbackBundle,renderCandidateGRollbackGeneratedModule} from './build-candidate-g-rollback-bundle.mjs';
import {computeRavScoreModelBundle,renderGeneratedBundleModule} from './build-ravscore-model-bundle.mjs';
import {ravScoreContinuationImplementationSha256} from './lib/ravscore-continuation-implementation-contract.mjs';
import {checkpointCasContractFromCanonicalSource,tripBindingPolicyFromCanonicalSource} from './integrated-cutover-readiness.mjs';
import {statisticsPreferenceRevisionCatalogQuery} from './verify-account-assistant-schema.mjs';
import {NATIVE_ORIGINAL_CONTINUITY_BEFORE as ANCIENT,NATIVE_ORIGINAL_CONTINUITY_BINDING as PROJECTION_OUTPUT,NATIVE_ORIGINAL_CONTINUITY_PROJECTION}
  from './lib/native-original-continuity-successor-source.mjs';
import {ACCOUNT_STATISTICS_ASSISTANT_PROJECTION}
  from './lib/account-statistics-assistant-successor-source.mjs';
import {SOURCE_PRODUCER_BEFORE as OLD,SOURCE_PRODUCER_PROPOSED_RELEASE,SOURCE_PRODUCER_ALIASES,
  SOURCE_PRODUCER_PROJECTION,SOURCE_PRODUCER_REPLACEMENTS,SOURCE_PRODUCER_CONTRACT_LABELS,
  SOURCE_PRODUCER_BINDING,SOURCE_PRODUCER_OUTPUT,requireSourceProducerCodeParent,
  requireSourceProducerBinding,requireSourceProducerOutput,sourceProducerMigration,
  readSourceProducerPredecessorCanonicalSource,sourceProducerDefinition as definition,
  sourceProducerPredecessorContractInventory,SOURCE_PRODUCER_PREDECESSOR_RELEASE,
  sourceProducerCheckpointContractFromBase} from './lib/source-producer-successor-source.mjs';
import {SOURCE_PRODUCER_DERIVED_METADATA_PATH,sourceProducerDerivedMetadataFromText,assertSourceProducerDerivedMetadata}
  from './lib/source-producer-derived-metadata.mjs';
// SOURCE_AFTER597_COMPILER_IMPORT_BEGIN
import {SOURCE_PRODUCER_AFTER597_PARENT,requireSourceProducerAfter597CodeParent,
  requireSourceProducerAfter597Binding,requireSourceProducerAfter597Output,sourceProducerAfter597PredecessorCompilationLayout,
  readSourceProducerAfter597PredecessorCanonicalSource} from './lib/source-producer-after597-parent.mjs';
import {SOURCE_PRODUCER_AFTER597_DERIVED_METADATA_PATH,sourceProducerAfter597DerivedMetadataFromText,
  assertSourceProducerAfter597DerivedMetadata,assertSourceProducerAfter597Release}
  from './lib/source-producer-after597-derived-metadata.mjs';
// SOURCE_AFTER597_COMPILER_IMPORT_END
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),CP='ravradar_ravscore_checkpoint_';
const sha=value=>crypto.createHash('sha256').update(value).digest('hex');
const count=(source,value)=>source.split(value).length-1;
const once=(source,before,after)=>{assert.equal(count(source,before),1,'One exact whole-source edit');return source.replace(before,()=>after);};
const replaceHashes=(source,map)=>source.replace(/[a-f0-9]{64}/g,value=>map.get(value)??value);
const literal=value=>{assert(typeof value==='string'&&!value.includes("'"));return "'"+value+"'";};

function body(source){
  const start=source.indexOf('as $$');assert(start>0);
  return source.slice(start+5,source.lastIndexOf('$$;')).trim();
}

function signature(source){
  const m=/^create or replace function public\.([a-z0-9_]+)\(([\s\S]*?)\)\s*returns/.exec(source);assert(m);
  const types=m[2].trim()?m[2].split(',').map(arg=>{const words=arg.trim().split(/\s+/);assert.equal(words.length,2);return words[1];}):[];
  return 'public.'+m[1]+'('+types.join(',')+')';
}

function headerProperties(source){
  const header=source.slice(0,source.indexOf('as $$'));
  const language=/\blanguage (sql|plpgsql)\b/.exec(header);assert(language);
  const result=/\breturns ([a-z]+)\b/.exec(header);assert(result);
  const configs=[...header.matchAll(/^set ([a-z_]+) = (.+)$/gm)].map(m=>m[1]+'='+m[2]);
  assert.deepEqual(configs,['search_path=pg_catalog, public'],'Exact normal header config');
  if(signature(source)==='public.'+CP+'cas(bigint,timestamptz,jsonb)')configs.push('statement_timeout=55s');
  return {language:language[1],result:result[1],definer:/\bsecurity definer\b/.test(header),
    volatility:/\bimmutable\b/.test(header)?'i':/\bstable\b/.test(header)?'s':'v',configs:configs.sort()};
}

function definitionGuard(source){
  const sig=signature(source),p=headerProperties(source);
  const config='array['+p.configs.map(literal).join(',')+']::text[]';
  const noPublic=sig!=='public.version_admin_document()';
  return `  if not coalesce((select p.prokind='f' and l.lanname=${literal(p.language)}
    and p.prorettype=${literal(p.result)}::regtype and not p.proretset
    and p.prosecdef=${p.definer} and p.provolatile=${literal(p.volatility)}
    and not p.proisstrict and not p.proleakproof and p.provariadic=0 and p.pronargdefaults=0
    and array(select unnest(p.proconfig) order by 1)=${config}
    and pg_catalog.encode(extensions.digest(pg_catalog.convert_to(pg_catalog.btrim(p.prosrc,E' \\n\\r\\t'),'UTF8'),'sha256'),'hex')=${literal(sha(body(source)))}
    ${noPublic?`and not pg_catalog.has_function_privilege('anon',p.oid,'EXECUTE')
    and not pg_catalog.has_function_privilege('authenticated',p.oid,'EXECUTE')
    and not exists(select 1 from pg_catalog.aclexplode(coalesce(p.proacl,pg_catalog.acldefault('f',p.proowner))) a
      where a.grantee<>p.proowner and (a.grantee<>('service_role'::regrole)::oid or a.is_grantable))`:''}
    ${sig==='public.'+CP+'cas(bigint,timestamptz,jsonb)'?"and pg_catalog.has_function_privilege('service_role',p.oid,'EXECUTE')":''}
    from pg_catalog.pg_proc p join pg_catalog.pg_language l on l.oid=p.prolang
    where p.oid=pg_catalog.to_regprocedure(${literal(sig)})),false)
    then raise exception 'CMW_SQL_FUNCTION_BODY_OR_PROPERTIES_MISMATCH: ${sig}'; end if;`.replace(/^ +$/gm,'');
}

function schema2Guard(expected){
  assert.equal(sha(statisticsPreferenceRevisionCatalogQuery),'721ac0938241c1b3d7349e154e78a29e0d94647d67e5885253def69517bb98d1');
  assert.equal(expected.schemaVersion,2);assert.equal(Object.keys(expected.functions).length,5);
  const json=JSON.stringify(expected);assert(!json.includes('$cmw_expected$'));
  return `  select q.metadata into account_observed from (${statisticsPreferenceRevisionCatalogQuery.trim().slice(0,-1)}) q;
  foreach function_name in array array[${Object.keys(expected.functions).map(literal).join(',')}] loop
    if pg_catalog.jsonb_typeof(account_observed #> array['functions',function_name,'serviceExecute']) is distinct from 'boolean'
      then raise exception 'CMW_SQL_SCHEMA2_SERVICE_SHAPE'; end if;
    -- Exact existing230 normalization only. ACL itself is preserved separately.
    account_observed:=pg_catalog.jsonb_set(account_observed,array['functions',function_name,'serviceExecute'],'false'::jsonb,false);
    if account_observed #> array['functions',function_name,'configuration']='["search_path="]'::jsonb then
      account_observed:=pg_catalog.jsonb_set(account_observed,array['functions',function_name,'configuration'],pg_catalog.jsonb_build_array('search_path=""'),false);
    end if;
  end loop;
  if account_observed is distinct from $cmw_expected$${json}$cmw_expected$::jsonb
    then raise exception 'CMW_SQL_EXACT_SCHEMA2_REQUIRED'; end if;`;
}

function preservationQuery(signatures){
  // No row/payload values. Includes actual old OIDs, ownership, ACL, defaults,
  // properties and account definitions. Body changes are checked separately.
  return `select pg_catalog.jsonb_build_object(
    'functions',(select pg_catalog.jsonb_object_agg(p.oid::text,
      pg_catalog.to_jsonb(p)-array['prosrc','prosqlbody']) from pg_catalog.pg_proc p
      where p.oid=any(array[${signatures.map(sig=>literal(sig)+'::regprocedure').join(',')}])),
    'accountFunctions',(select pg_catalog.jsonb_object_agg(p.proname,pg_catalog.to_jsonb(p))
      from pg_catalog.pg_proc p where p.pronamespace='public'::regnamespace and p.proname=any(array[
        'record_account_activity','get_own_statistics_preference','enable_own_statistics_preference',
        'disable_own_statistics_preference','set_own_statistics_preference'])),
    'tables',(select pg_catalog.jsonb_object_agg(r.relname,pg_catalog.jsonb_build_object(
      'relation',pg_catalog.jsonb_build_object('oid',r.oid,'owner',r.relowner,'acl',r.relacl,
        'kind',r.relkind,'rls',r.relrowsecurity,'forceRls',r.relforcerowsecurity,'options',r.reloptions),
      'columns',(select pg_catalog.jsonb_agg(pg_catalog.to_jsonb(a) order by a.attnum) from pg_catalog.pg_attribute a where a.attrelid=r.oid),
      'constraints',(select pg_catalog.jsonb_agg(pg_catalog.to_jsonb(c) order by c.oid) from pg_catalog.pg_constraint c where c.conrelid=r.oid),
      'policies',(select pg_catalog.jsonb_agg(pg_catalog.to_jsonb(p) order by p.oid) from pg_catalog.pg_policy p where p.polrelid=r.oid)))
      from pg_catalog.pg_class r where r.oid=any(array['public.account_activity_journal'::regclass,'public.account_statistics_preferences'::regclass])))`;
}




function currentMetadata(source,next,expected){
  for(const key of ['C','I','T'])assert.equal(count(source,OLD[key]),expected[key]??0,'Exact593 metadata inventory '+key);
  const map=new Map(['C','I','T'].map(key=>[OLD[key],next[key]])),after=replaceHashes(source,map);
  assert.equal(replaceHashes(after,new Map([...map].map(([a,b])=>[b,a]))),source,'Whole metadata inverse');return after;
}
// Pure layout of the one genuine593 predecessor, not a SOURCE binding or SQL issuer.
// The normal compiler consumes this exact result; no caller-selected family or tuple.
export function sourceProducerPredecessorCompilationLayout(before){
  assert.equal(arguments.length,1);
  const prefix=sourceProducerPredecessorContractInventory(before);
  assert.equal(prefix.validatorCount,41);assert.equal(prefix.definitionCount,44);
  const oldTail="    || E'\\n-- assistant-later-h0-original591-payload-validator --\\n' || v_ask591_payload_definition;";
  assert.equal(count(prefix.checkpoint,oldTail),1,'Exact genuine593 checkpoint tail');
  assert(prefix.checkpoint.endsWith(oldTail),'Whole genuine593 checkpoint definition ends at ask591');
  assert.equal(SOURCE_PRODUCER_ALIASES.length,3);assert.equal(SOURCE_PRODUCER_CONTRACT_LABELS.length,3);
  return Object.freeze({prefix,oldTail,successorValidatorCount:prefix.validatorCount+SOURCE_PRODUCER_ALIASES.length,
    successorDefinitionCount:prefix.definitionCount+SOURCE_PRODUCER_ALIASES.length});
}
function compile(before,next){
  assert.equal(sha(before),OLD.canonicalSha256);
  const layout=sourceProducerPredecessorCompilationLayout(before);
  assert.match(next.version,/^[0-9]{14}$/);assert(next.version>OLD.version);
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
  // Preserve the entire genuine NOC585->586 projection as an exact template.
  // Its585 INPUT moves to genuine593; its586 OUTPUT moves to new SOURCE-unissued.
  // These are separate maps; every original projection remains byte-identical.
  const oldProjection=definition(before,NATIVE_ORIGINAL_CONTINUITY_PROJECTION),map=new Map(),inverseMap=new Map();
  for(const key of ['C','I','T']){assert.equal(count(oldProjection,ANCIENT[key]),key==='I'?2:1);assert.equal(count(oldProjection,PROJECTION_OUTPUT[key]),key==='I'?2:1);
    assert.equal(count(oldProjection,OLD[key]),0,'The frozen template is not the current593 input');
    map.set(ANCIENT[key],OLD[key]);map.set(PROJECTION_OUTPUT[key],next[key]);inverseMap.set(OLD[key],ANCIENT[key]);inverseMap.set(next[key],PROJECTION_OUTPUT[key]);}
  let projection=once(oldProjection,'function public.'+NATIVE_ORIGINAL_CONTINUITY_PROJECTION+'(','function public.'+PROJECTION+'(');
  projection=once(projection,'public.'+CP+'noc585_payload_valid(','public.'+FROZEN_PAYLOAD+'(');
  projection=replaceHashes(projection,map);
  let projectionInverse=replaceHashes(projection,inverseMap);
  projectionInverse=once(projectionInverse,'public.'+FROZEN_PAYLOAD+'(','public.'+CP+'noc585_payload_valid(');
  projectionInverse=once(projectionInverse,'function public.'+PROJECTION+'(','function public.'+NATIVE_ORIGINAL_CONTINUITY_PROJECTION+'(');
  assert.equal(projectionInverse,oldProjection,'Whole issued586 projection inverse');
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
  let cas=once(casBefore,'  v_noc_same_h0_predecessor_payload jsonb;',
    '  v_noc_same_h0_predecessor_payload jsonb;\n  v_source_same_h0_predecessor_payload jsonb;');
  const dispatch="    if p_payload ->> 'continuationStateContractSha256' = '"+PROJECTION_OUTPUT.T+"'\n";
  cas=once(cas,dispatch,"    if p_payload ->> 'continuationStateContractSha256' = '"+next.T+"'\n"
    +"      and v_payload #>> '{modelBinding,modelBundleSha256}' = '"+OLD.I+"'\n    then\n"
    +'      v_source_same_h0_predecessor_payload := public.'+PROJECTION+'(v_payload,v_central_reference);\n    end if;\n'+dispatch);
  cas=once(cas,'    if v_noc_same_h0_predecessor_payload is not null',
    '    if v_source_same_h0_predecessor_payload is not null\n      or v_noc_same_h0_predecessor_payload is not null');
  const comparison='    if v_central_is_compatible_predecessor and v_noc_same_h0_predecessor_payload is not null then';
  cas=once(cas,comparison,'    if v_central_is_compatible_predecessor and v_source_same_h0_predecessor_payload is not null then\n'
    +'      v_exact_predecessor_same_target_transition := v_central_reference = p_target_reference\n'
    +"        and (v_source_same_h0_predecessor_payload #- '{generationSha256}' #- '{stateSha256}'\n"
    +"          #- '{candidateGRollbackCompanion,generationSha256}')\n"
    +"        = (p_payload #- '{generationSha256}' #- '{stateSha256}'\n"
    +"          #- '{candidateGRollbackCompanion,generationSha256}');\n"+comparison.replace('    if ','    elsif '));
  const numericPrefix='    elsif p_target_reference > v_central_reference\n',at=cas.indexOf(numericPrefix);assert(at>=0);
  const newer=numericPrefix+"      and p_payload ->> 'continuationStateContractSha256' = '"+next.T+"'\n"
    +'      and public.'+FROZEN_PAYLOAD+'(v_payload,v_central_reference)\n    then\n'
    +'      -- Genuine preserved593 only; normal newer-reference comparison remains below.\n'
    +'      v_central_is_compatible_predecessor := false;\n';
  cas=cas.slice(0,at)+newer+cas.slice(at);
  assert.equal(count(cas,numericPrefix),count(casBefore,numericPrefix)+1);
  const tail=casBefore.indexOf('    -- Equality is checked before the expected version.');
  assert(tail>=0&&cas.endsWith(casBefore.slice(tail)),'Whole retry/version/write/refusal tail unchanged');add(CP+'cas',cas);
  const contractBefore=definition(before,CP+'contract');
  let contract=once(contractBefore,'  v_noc_same_h0_projection_definition text;',
    '  v_noc_same_h0_projection_definition text;\n  v_source590_state_definition text;\n  v_source590_payload_definition text;\n  v_source_same_h0_projection_definition text;');
  const prefix=layout.prefix;
  const oldOids=prefix.validators,oid=[prefix.oid],oldDefinition=[prefix.checkpoint];
  const newOids=aliases.map(row=>"    pg_catalog.to_regprocedure('public."+row.name+row.signature+"')").join(',\n');
  contract=once(contract,oid[0],oid[0].slice(0,-5)+',\n'+newOids+'\n  ];');
  const variables=['v_source590_state_definition','v_source590_payload_definition','v_source_same_h0_projection_definition'];
  const bodies=variables.map((variable,index)=>"  select pg_catalog.btrim(p.prosrc, E' \\n\\r\\t') into "+variable+'\n'
    +'  from pg_catalog.pg_proc p where p.oid = v_validator_oids['+(oldOids.length+index+1)+'];\n').join('\n');
  contract=once(contract,'  v_checkpoint_definition := v_canonical_time_definition',bodies+'\n  v_checkpoint_definition := v_canonical_time_definition');
  const oldTail=layout.oldTail;
  contract=once(contract,oldTail,oldTail.slice(0,-1)+SOURCE_PRODUCER_CONTRACT_LABELS.map((label,index)=>
    "\n    || E'\\n-- "+label+" --\\n' || "+variables[index]).join('')+';');
  contract=once(contract,"where m.version::text = '"+OLD.version+"'","where m.version::text = '"+next.version+"'");
  const afterOid=/  v_validator_oids oid\[\] := array\[([\s\S]*?)\n  \];/.exec(contract);assert(afterOid);
  const afterOids=[...afterOid[1].matchAll(/pg_catalog\.to_regprocedure\(\s*'([^']+)'\s*\)/g)].map(m=>m[1]);
  assert.deepEqual(afterOids,[...oldOids,...aliases.map(row=>'public.'+row.name+row.signature)],
    'Entire genuine593 validator prefix followed only by the three SOURCE aliases');
  assert.equal(afterOids.length,layout.successorValidatorCount);
  const afterDefinition=/  v_checkpoint_definition := v_canonical_time_definition[\s\S]*?;/.exec(contract);assert(afterDefinition);
  assert(afterDefinition[0].startsWith(oldDefinition[0].slice(0,-1)),
    'Entire genuine593 checkpoint definition prefix is preserved');
  assert.equal((contract.match(/\|\| v_[a-z0-9_]+_definition/g)??[]).length+1,layout.successorDefinitionCount);add(CP+'contract',contract);
  assert.deepEqual(changes.map(row=>row.name),SOURCE_PRODUCER_REPLACEMENTS);
  const insertion=aliases.map(row=>row.definition+'\nrevoke all on function public.'+row.name+row.signature+' from public, anon, authenticated;\n\n').join('');
  let canonicalSource=before;for(const row of changes)canonicalSource=once(canonicalSource,row.before,row.after);
  canonicalSource=once(canonicalSource,changes[0].after,insertion+changes[0].after);
  let inverse=once(canonicalSource,insertion,'');for(const row of [...changes].reverse())inverse=once(inverse,row.after,row.before);
  assert.equal(inverse,before,'Whole issued593 canonical inverse');
  const replaced=new Set(changes.map(row=>row.name));
  for(const match of before.matchAll(/^create or replace function public\.([a-z0-9_]+)\(/gm))
    if(!replaced.has(match[1]))assert.equal(definition(canonicalSource,match[1]),definition(before,match[1]),
      'Every untouched genuine593/historical function remains whole');
  for(const name of [CP+'native_origin_projection',ACCOUNT_STATISTICS_ASSISTANT_PROJECTION,NATIVE_ORIGINAL_CONTINUITY_PROJECTION])
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
    "  if (select max(version::text) from supabase_migrations.schema_migrations) is distinct from '"+OLD.version+"' then raise exception 'SOURCE_PRODUCER_EXACT_INSTALLED594_REQUIRED'; end if;",
    "  if exists(select 1 from supabase_migrations.schema_migrations where version::text=any(array['20261014140000','20261015030000','20261016030000'])) then raise exception 'SOURCE_PRODUCER_ARCHIVED_PHASE_MUST_BE_ABSENT'; end if;",
    "  if not exists(select 1 from supabase_migrations.schema_migrations where version::text='20261013230000') then raise exception 'SOURCE_PRODUCER_INSTALLED230_REQUIRED'; end if;",
    '  lock table public.account_activity_journal,public.account_statistics_preferences in access share mode;'].join('\n');
  const migration=['-- Original-preserving post594 SOURCE metadata successor; SOURCE ONLY.',
    '-- Existing594,593,592,591,590,588,587,586,585 and older originals/projections and ALL numerical SQL guards preserved.',
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
  const release=JSON.parse(await regularSource('package.json')).version;
  assert.match(release,/^4\.0\.[1-9][0-9]*$/);
  assert(Number(release.split('.').at(-1))>Number(SOURCE_PRODUCER_PREDECESSOR_RELEASE.split('.').at(-1)),
    'SOURCE requires its actual later whole-source release');
  if(SOURCE_PRODUCER_PROPOSED_RELEASE!==null)assert.equal(release,SOURCE_PRODUCER_PROPOSED_RELEASE);
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
  for(const original of prior.originalDefinitions)
    assert.equal(definition(result.canonicalSource,original.name),original.definition,'Every inherited original definition whole');
  const contract=sourceProducerCheckpointContractFromBase(result.canonicalSource,
    checkpointCasContractFromCanonicalSource(result.canonicalSource,{sourcePhase:'assistant-installed593-origin591-successor'}));
  return Object.freeze({...result,checkpointContractSha256:contract.sha256,
    tripBindingPolicySha256:tripBindingPolicyFromCanonicalSource(result.canonicalSource).sha256});
}
// First derivation uses the SAME normal physical generators and compiler.
// It returns generated DATA only: no metadata/SQL file write, origin handle,
// runtime admission or installation. Fresh processes separate the NULL,
// binding-only and fully-derived stages; --check/--write stay issued-only.
async function readFirstIssuanceMetadata(){
  requireSourceProducerCodeParent(); // Fixed reviewed CODE profile; never caller-selected.
  // The historical593 constructor above is retained whole. Its CODE-only
  // profile must not stand in for the future actual594 original generation.
  assert.equal(SOURCE_PRODUCER_PREDECESSOR_RELEASE,'4.0.594',
    'SOURCE_FIRST_ISSUANCE_GENUINE594_PROFILE_REQUIRED');
  const raw=await regularSource(SOURCE_PRODUCER_DERIVED_METADATA_PATH);
  const value=sourceProducerDerivedMetadataFromText(raw);
  assert.deepEqual(value.binding,SOURCE_PRODUCER_BINDING,'Fresh process matches physical binding stage');
  assert.deepEqual(value.output,SOURCE_PRODUCER_OUTPUT,'Fresh process matches physical output stage');
  return {raw,value};
}
export async function deriveSourceProducerFirstBinding(options){
  assert.equal(arguments.length,1);
  const {raw,value}=await readFirstIssuanceMetadata();
  assert.equal(value.version,null);assert.equal(value.binding,null);assert.equal(value.output,null);
  assert(options&&Object.getPrototypeOf(options)===Object.prototype);
  assert.deepEqual(Object.keys(options),['version'],'Only the normal timestamp; no source, tuple or root override');
  const {version}=options;assert.match(version,/^[0-9]{14}$/);assert(version>OLD.version);
  const release=JSON.parse(await regularSource('package.json')).version;
  assert.match(release,/^4\.0\.[1-9][0-9]*$/);
  assert(Number(release.split('.').at(-1))>Number(SOURCE_PRODUCER_PREDECESSOR_RELEASE.split('.').at(-1)),
    'First SOURCE derivation requires the actual later whole-source release');
  if(SOURCE_PRODUCER_PROPOSED_RELEASE!==null)assert.equal(release,SOURCE_PRODUCER_PROPOSED_RELEASE);
  const prior=await readSourceProducerPredecessorCanonicalSource();
  assert.equal(sha(prior.canonicalSource),OLD.canonicalSha256);
  const candidate=await computeCandidateGRollbackBundle();
  assert.equal(await regularSource('scripts/rollback-assets/ravscore-model-bundle.generated.js'),renderCandidateGRollbackGeneratedModule(candidate));
  const integrated=await computeRavScoreModelBundle();
  assert.equal(await regularSource('js/core/ravscore-model-bundle.generated.js'),renderGeneratedBundleModule(integrated));
  const canonical=value=>Array.isArray(value)?value:value&&typeof value==='object'?Object.fromEntries(Object.keys(value).sort().map(key=>[key,value[key]])):value;
  const binding={version,C:candidate.modelBundleSha256,I:integrated.modelBundleSha256,T:await ravScoreContinuationImplementationSha256(),
    candidateManifestSha256:sha(JSON.stringify(candidate.manifest)),
    integratedManifestSha256:sha(JSON.stringify(integrated.manifest,(_key,value)=>canonical(value)))};
  assert.equal(binding.C,binding.candidateManifestSha256);assert.equal(binding.I,binding.integratedManifestSha256);
  assert.equal(new Set(['C','I','T'].flatMap(key=>[OLD[key],binding[key]])).size,6);
  assert.deepEqual(await readSourceProducerPredecessorCanonicalSource(),prior,'Whole fixed predecessor unchanged during derivation');
  assert.equal(await regularSource(SOURCE_PRODUCER_DERIVED_METADATA_PATH),raw,'NULL metadata unchanged');
  return assertSourceProducerDerivedMetadata({schemaVersion:value.schemaVersion,version,binding,output:null});
}
// A second, still-uninstalled candidate is an explicit DATA-only branch, not
// a reset of the first595 issuance or a successor of an installed SOURCE SQL.
const FIRST_SOURCE_ISSUANCE=Object.freeze({
  head:'28182da8aab7ca76acbdeea93b9a7d7d1d9e9190',tree:'716268e54f71832a61961033e6caf90588b97c65',
  metadataSha256:'73b8acb210c2a66e067170f2b59faafcaa0980e571f97671ee4a02676766153c',
  packageSha256:'3a457162bbbc5211076a275f9509766dff076b84dd7393a316b81372652cd9dc',
  sql:'supabase/migrations/20261102153958_source_producer_original_bound_successor.sql',
  sqlSha256:'c74f6e5e970a84fa36fc48df153562ce11ad19716d91937a14102a46b436ab0d',version:'20261102153958',
});
async function readPreservedFirstSourceIssuance(){
  requireSourceProducerCodeParent(); // The SAME genuine594 predecessor, before Git/file reads.
  for(const key of ['GIT_DIR','GIT_COMMON_DIR','GIT_WORK_TREE','GIT_INDEX_FILE','GIT_OBJECT_DIRECTORY','GIT_ALTERNATE_OBJECT_DIRECTORIES'])
    assert(!process.env[key],'SOURCE_ALTERNATIVE_GIT_SOURCE_OVERRIDE');
  const git=args=>execFileSync('git',['-c','protocol.allow=never',...args],{cwd:ROOT,env:{...process.env,
    GIT_NO_LAZY_FETCH:'1',GIT_NO_REPLACE_OBJECTS:'1',GIT_OPTIONAL_LOCKS:'0',GIT_TERMINAL_PROMPT:'0'},timeout:30000,maxBuffer:512*1024});
  const first=FIRST_SOURCE_ISSUANCE;
  assert.equal(git(['rev-parse',first.head+'^{tree}']).toString().trim(),first.tree,'SOURCE_ALTERNATIVE_FIRST_GIT_TREE');
  git(['merge-base','--is-ancestor',first.head,'HEAD']);
  const head=git(['rev-parse','HEAD']).toString().trim();
  const pinned=(file,digest)=>{const bytes=git(['cat-file','blob',first.head+':'+file]);
    assert.equal(sha(bytes),digest,'SOURCE_ALTERNATIVE_FIRST_GIT_BYTES');return bytes;};
  const metadata=pinned(SOURCE_PRODUCER_DERIVED_METADATA_PATH,first.metadataSha256);
  const sql=pinned(first.sql,first.sqlSha256),release=JSON.parse(pinned('package.json',first.packageSha256).toString('utf8')).version;
  const physical=async file=>{const target=path.join(ROOT,file),stat=await fs.lstat(target);
    assert(stat.isFile()&&!stat.isSymbolicLink(),'SOURCE_ALTERNATIVE_PRESERVED_REGULAR_FILE');return fs.readFile(target);};
  assert.deepEqual(await physical(SOURCE_PRODUCER_DERIVED_METADATA_PATH),metadata,'SOURCE_ALTERNATIVE_PRESERVED_METADATA_BYTES');
  assert.deepEqual(await physical(first.sql),sql,'SOURCE_ALTERNATIVE_PRESERVED_SQL_BYTES');
  const state=await readFirstIssuanceMetadata();
  assert.equal(state.raw,metadata.toString('utf8'));assert.equal(state.value.version,first.version);
  assert(state.value.binding!==null&&state.value.output!==null,'SOURCE_ALTERNATIVE_FIRST_ISSUANCE_REQUIRED');
  assert.equal(state.value.output.migrationSha256,first.sqlSha256);
  return {head,release,raw:state.raw,value:state.value,sql};
}
export async function deriveSourceProducerAlternativeBinding(options){
  assert.equal(arguments.length,1);
  assert(options&&Object.getPrototypeOf(options)===Object.prototype);
  assert.deepEqual(Reflect.ownKeys(options),['version'],'Only the normal timestamp; no source, tuple or root override');
  const {version}=options;assert.match(version,/^[0-9]{14}$/);
  assert(version>FIRST_SOURCE_ISSUANCE.version,'SOURCE_ALTERNATIVE_LATER_TIMESTAMP_REQUIRED');
  const previous=await readPreservedFirstSourceIssuance();
  const release=JSON.parse(await regularSource('package.json')).version;
  assert.match(release,/^4\.0\.[1-9][0-9]*$/);
  assert(Number(release.split('.').at(-1))>Number(previous.release.split('.').at(-1)),
    'SOURCE_ALTERNATIVE_LATER_RELEASE_REQUIRED');
  if(SOURCE_PRODUCER_PROPOSED_RELEASE!==null)assert.equal(release,SOURCE_PRODUCER_PROPOSED_RELEASE);
  const prior=await readSourceProducerPredecessorCanonicalSource();
  assert.equal(sha(prior.canonicalSource),OLD.canonicalSha256);
  const candidate=await computeCandidateGRollbackBundle();
  assert.equal(await regularSource('scripts/rollback-assets/ravscore-model-bundle.generated.js'),renderCandidateGRollbackGeneratedModule(candidate));
  const integrated=await computeRavScoreModelBundle();
  assert.equal(await regularSource('js/core/ravscore-model-bundle.generated.js'),renderGeneratedBundleModule(integrated));
  const canonical=value=>Array.isArray(value)?value:value&&typeof value==='object'?Object.fromEntries(Object.keys(value).sort().map(key=>[key,value[key]])):value;
  const binding={version,C:candidate.modelBundleSha256,I:integrated.modelBundleSha256,T:await ravScoreContinuationImplementationSha256(),
    candidateManifestSha256:sha(JSON.stringify(candidate.manifest)),
    integratedManifestSha256:sha(JSON.stringify(integrated.manifest,(_key,value)=>canonical(value)))};
  assert.equal(binding.C,binding.candidateManifestSha256);assert.equal(binding.I,binding.integratedManifestSha256);
  assert.equal(new Set(['C','I','T'].flatMap(key=>[OLD[key],binding[key]])).size,6);
  for(const key of ['C','I'])assert.notEqual(binding[key],previous.value.binding[key],'SOURCE_ALTERNATIVE_ACTUAL_CHANGED_CI_REQUIRED');
  assert.deepEqual(await readSourceProducerPredecessorCanonicalSource(),prior,'Whole fixed594 predecessor unchanged during alternative derivation');
  assert.deepEqual(await readPreservedFirstSourceIssuance(),previous,'First595 Git/metadata/SQL preserved throughout alternative derivation');
  return assertSourceProducerDerivedMetadata({schemaVersion:previous.value.schemaVersion,version,binding,output:null});
}
// One later, still-uninstalled597 candidate from the whole preserved596 issuance.
// This is an alternative to installed594, never an installed596 predecessor.
const PRESERVED_SOURCE596_ISSUANCE=Object.freeze({
  head:'6d4cebca1e956a6256a8d352c65916e7e7cf478f',tree:'b7596d8e3e22c6709c704c32a6a78137103de5fd',
  release:'4.0.596',version:'20261103012633',
  metadataBytes:973,metadataSha256:'c6ae958bae9eed7e3011d3e8b3bfb078a4b9da772ab6282280f4ec54c6af13a6',
  packageBytes:51206,packageSha256:'3395b3c09e58a7c617f3c63d219f387d0f22dd6c598199325762d60d17b9213c',
  sql:'supabase/migrations/20261103012633_source_producer_original_bound_successor.sql',
  sqlBytes:372466,sqlSha256:'f49bc3023c8e7063c3a0c2fba3a7be7e5db190383dcd8671bc309d69f5b51c19',
});
async function readPreservedSource596Issuance(){
  requireSourceProducerCodeParent(); // Same genuine594 CODE/DATA before any Git/file read.
  for(const key of ['GIT_DIR','GIT_COMMON_DIR','GIT_WORK_TREE','GIT_INDEX_FILE','GIT_OBJECT_DIRECTORY','GIT_ALTERNATE_OBJECT_DIRECTORIES'])
    assert(!process.env[key],'SOURCE_POST596_GIT_SOURCE_OVERRIDE');
  const git=args=>execFileSync('git',['-c','protocol.allow=never',...args],{cwd:ROOT,env:{...process.env,
    GIT_NO_LAZY_FETCH:'1',GIT_NO_REPLACE_OBJECTS:'1',GIT_OPTIONAL_LOCKS:'0',GIT_TERMINAL_PROMPT:'0'},timeout:30000,maxBuffer:512*1024});
  const previous=PRESERVED_SOURCE596_ISSUANCE;
  assert.equal(git(['rev-parse',previous.head+'^{tree}']).toString().trim(),previous.tree,'SOURCE_POST596_PRESERVED_GIT_TREE');
  git(['merge-base','--is-ancestor',previous.head,'HEAD']);
  const head=git(['rev-parse','HEAD']).toString().trim();
  const pinned=(file,bytes,digest)=>{const raw=git(['cat-file','blob',previous.head+':'+file]);
    assert.equal(raw.length,bytes,'SOURCE_POST596_PRESERVED_GIT_LENGTH');
    assert.equal(sha(raw),digest,'SOURCE_POST596_PRESERVED_GIT_BYTES');return raw;};
  const metadata=pinned(SOURCE_PRODUCER_DERIVED_METADATA_PATH,previous.metadataBytes,previous.metadataSha256);
  const sql=pinned(previous.sql,previous.sqlBytes,previous.sqlSha256);
  const release=JSON.parse(pinned('package.json',previous.packageBytes,previous.packageSha256).toString('utf8')).version;
  assert.equal(release,previous.release);
  const physical=async file=>{const target=path.join(ROOT,file),stat=await fs.lstat(target);
    assert(stat.isFile()&&!stat.isSymbolicLink(),'SOURCE_POST596_PRESERVED_REGULAR_FILE');return fs.readFile(target);};
  assert.deepEqual(await physical(SOURCE_PRODUCER_DERIVED_METADATA_PATH),metadata,'SOURCE_POST596_PRESERVED_METADATA_BYTES');
  assert.deepEqual(await physical(previous.sql),sql,'SOURCE_POST596_PRESERVED_SQL_BYTES');
  const state=await readFirstIssuanceMetadata();
  assert.equal(state.raw,metadata.toString('utf8'));assert.equal(state.value.version,previous.version);
  assert(state.value.binding!==null&&state.value.output!==null,'SOURCE_POST596_ISSUED_OUTPUT_REQUIRED');
  assert.equal(state.value.output.migrationSha256,previous.sqlSha256);
  return {head,release,raw:state.raw,value:state.value,sql};
}
export async function deriveSourceProducerPost596Binding(options){
  assert.equal(arguments.length,1);
  assert(options&&Object.getPrototypeOf(options)===Object.prototype);
  assert.deepEqual(Reflect.ownKeys(options),['version'],'Only the normal timestamp; no source, tuple or root override');
  const {version}=options;assert.match(version,/^[0-9]{14}$/);
  assert(version>PRESERVED_SOURCE596_ISSUANCE.version,'SOURCE_POST596_LATER_TIMESTAMP_REQUIRED');
  const previous=await readPreservedSource596Issuance();
  const packageRaw=await regularSource('package.json'),release=JSON.parse(packageRaw).version;
  assert.equal(release,'4.0.597','SOURCE_POST596_EXACT_LATER_RELEASE_REQUIRED');
  assert(Number(release.split('.').at(-1))>Number(previous.release.split('.').at(-1)),
    'SOURCE_POST596_LATER_RELEASE_REQUIRED');
  if(SOURCE_PRODUCER_PROPOSED_RELEASE!==null)assert.equal(release,SOURCE_PRODUCER_PROPOSED_RELEASE);
  const prior=await readSourceProducerPredecessorCanonicalSource();
  assert.equal(sha(prior.canonicalSource),OLD.canonicalSha256);
  const candidate=await computeCandidateGRollbackBundle();
  assert.equal(await regularSource('scripts/rollback-assets/ravscore-model-bundle.generated.js'),renderCandidateGRollbackGeneratedModule(candidate));
  const integrated=await computeRavScoreModelBundle();
  assert.equal(await regularSource('js/core/ravscore-model-bundle.generated.js'),renderGeneratedBundleModule(integrated));
  const canonical=value=>Array.isArray(value)?value:value&&typeof value==='object'?Object.fromEntries(Object.keys(value).sort().map(key=>[key,value[key]])):value;
  const binding={version,C:candidate.modelBundleSha256,I:integrated.modelBundleSha256,T:await ravScoreContinuationImplementationSha256(),
    candidateManifestSha256:sha(JSON.stringify(candidate.manifest)),
    integratedManifestSha256:sha(JSON.stringify(integrated.manifest,(_key,value)=>canonical(value)))};
  assert.equal(binding.C,binding.candidateManifestSha256);assert.equal(binding.I,binding.integratedManifestSha256);
  assert.equal(new Set(['C','I','T'].flatMap(key=>[OLD[key],binding[key]])).size,6);
  for(const key of ['C','I'])assert.notEqual(binding[key],previous.value.binding[key],'SOURCE_POST596_ACTUAL_CHANGED_CI_REQUIRED');
  assert.deepEqual(await readSourceProducerPredecessorCanonicalSource(),prior,'Whole fixed594 predecessor unchanged during post596 derivation');
  assert.equal(await regularSource('package.json'),packageRaw,'Post596 release bytes unchanged during derivation');
  assert.deepEqual(await readPreservedSource596Issuance(),previous,'Whole596 Git/metadata/SQL preserved throughout derivation');
  return assertSourceProducerDerivedMetadata({schemaVersion:previous.value.schemaVersion,version,binding,output:null});
}
export async function deriveSourceProducerFirstOutput(){
  assert.equal(arguments.length,0);
  const {raw,value}=await readFirstIssuanceMetadata();
  assert(value.binding!==null&&value.version!==null);assert.equal(value.output,null);
  // Reuse the complete existing normal producer, including actual C/I/T,
  // canonical inverse, inherited definitions, SQL wrapper and contract hashes.
  const result=await buildSourceProducerBindingSuccessor();
  assert.deepEqual(result.nextBinding,{version:value.version,C:value.binding.C,I:value.binding.I,T:value.binding.T});
  const output={migrationSha256:result.migrationSha256,canonicalSha256:result.afterCanonicalSha256,
    checkpointContractSha256:result.checkpointContractSha256,tripBindingPolicySha256:result.tripBindingPolicySha256};
  assert.equal(await regularSource(SOURCE_PRODUCER_DERIVED_METADATA_PATH),raw,'Binding-only metadata unchanged');
  return assertSourceProducerDerivedMetadata({schemaVersion:value.schemaVersion,version:value.version,binding:{...value.binding},output});
}

// SOURCE_AFTER597_COMPILER_BEGIN
// Separate inactive597 arm. Old594/595/596 compiler/issuance functions above
// remain whole. The template markers are deliberately invalid identities.
const SOURCE_AFTER597_COMPILER_ALIASES=Object.freeze([
  Object.freeze({name:CP+'source597_state_valid',signature:'(jsonb,text)'}),
  Object.freeze({name:CP+'source597_payload_valid',signature:'(jsonb,timestamptz)'}),
  Object.freeze({name:CP+'source597_same_h0_projection',signature:'(jsonb,timestamptz)'}),
]);
const SOURCE_AFTER597_COMPILER_REPLACEMENTS=Object.freeze([
  CP+'integrated_state_valid',CP+'payload_valid',CP+'integrated_state_reason',CP+'payload_reason',
  CP+'predecessor_payload_valid','ravradar_trip_v3_binding_allowed',CP+'cas',CP+'contract']);
const SOURCE_AFTER597_COMPILER_LABELS=Object.freeze([
  'source-original597-state-validator','source-original597-payload-validator','source597-same-h0-projection']);
const SOURCE_AFTER597_UNISSUED_MARKERS=Object.freeze({
  version:'UNISSUED_SOURCE_AFTER597_VERSION',
  C:'UNISSUED_SOURCE_AFTER597_C'.padEnd(64,'_'),
  I:'UNISSUED_SOURCE_AFTER597_I'.padEnd(64,'_'),
  T:'UNISSUED_SOURCE_AFTER597_T'.padEnd(64,'_'),
});
function sourceAfter597ReplaceMetadata(source,map){
  assert(map instanceof Map&&map.size>0);
  for(const key of map.keys())assert(/^[a-f0-9]{64}$/.test(key)
    ||Object.values(SOURCE_AFTER597_UNISSUED_MARKERS).includes(key),'Exact source metadata token');
  return source.replace(new RegExp([...map.keys()].join('|'),'g'),value=>map.get(value));
}
function sourceAfter597CurrentMetadata(source,next,expected){
  const OLD=requireSourceProducerAfter597CodeParent();
  for(const key of ['C','I','T'])assert.equal(count(source,OLD[key]),expected[key]??0,'Exact597 metadata inventory '+key);
  const map=new Map(['C','I','T'].map(key=>[OLD[key],next[key]]));
  const after=sourceAfter597ReplaceMetadata(source,map);
  assert.equal(sourceAfter597ReplaceMetadata(after,new Map([...map].map(([a,b])=>[b,a]))),source,'Whole597 metadata inverse');
  return after;
}
function compileSourceProducerAfter597(before,next,symbolic){
  const OLD=requireSourceProducerAfter597CodeParent();
  const SOURCE_PRODUCER_ALIASES=SOURCE_AFTER597_COMPILER_ALIASES;
  const SOURCE_PRODUCER_REPLACEMENTS=SOURCE_AFTER597_COMPILER_REPLACEMENTS;
  const SOURCE_PRODUCER_CONTRACT_LABELS=SOURCE_AFTER597_COMPILER_LABELS;
  assert.equal(sha(before),OLD.canonicalSha256);
  const prefix597=sourceProducerAfter597PredecessorCompilationLayout(before);
  const layout={prefix:prefix597,oldTail:prefix597.oldTail,
    successorValidatorCount:prefix597.validatorCount+SOURCE_PRODUCER_ALIASES.length,
    successorDefinitionCount:prefix597.definitionCount+SOURCE_PRODUCER_ALIASES.length};
  if(symbolic){assert.equal(next,SOURCE_AFTER597_UNISSUED_MARKERS);}
  else{
    assert.match(next.version,/^[0-9]{14}$/);assert(next.version>OLD.version);
    for(const key of ['C','I','T'])assert.match(next[key],/^[a-f0-9]{64}$/);
    assert.equal(new Set(['C','I','T'].flatMap(k=>[OLD[k],next[k]])).size,6);
  }
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
    ['integrated_state_reason',{I:1}],['payload_reason',{I:1,C:1,T:1}]])add(CP+suffix,sourceAfter597CurrentMetadata(definition(before,CP+suffix),next,inventory));
  // Preserve the entire genuine NOC585->586 projection as an exact template.
  // Its585 INPUT moves to genuine597; its586 OUTPUT moves to new SOURCE-unissued.
  // These are separate maps; every original projection remains byte-identical.
  const oldProjection=definition(before,NATIVE_ORIGINAL_CONTINUITY_PROJECTION),map=new Map(),inverseMap=new Map();
  for(const key of ['C','I','T']){assert.equal(count(oldProjection,ANCIENT[key]),key==='I'?2:1);assert.equal(count(oldProjection,PROJECTION_OUTPUT[key]),key==='I'?2:1);
    assert.equal(count(oldProjection,OLD[key]),0,'The frozen template is not the current597 input');
    map.set(ANCIENT[key],OLD[key]);map.set(PROJECTION_OUTPUT[key],next[key]);inverseMap.set(OLD[key],ANCIENT[key]);inverseMap.set(next[key],PROJECTION_OUTPUT[key]);}
  let projection=once(oldProjection,'function public.'+NATIVE_ORIGINAL_CONTINUITY_PROJECTION+'(','function public.'+PROJECTION+'(');
  projection=once(projection,'public.'+CP+'noc585_payload_valid(','public.'+FROZEN_PAYLOAD+'(');
  projection=sourceAfter597ReplaceMetadata(projection,map);
  let projectionInverse=sourceAfter597ReplaceMetadata(projection,inverseMap);
  projectionInverse=once(projectionInverse,'public.'+FROZEN_PAYLOAD+'(','public.'+CP+'noc585_payload_valid(');
  projectionInverse=once(projectionInverse,'function public.'+PROJECTION+'(','function public.'+NATIVE_ORIGINAL_CONTINUITY_PROJECTION+'(');
  assert.equal(projectionInverse,oldProjection,'Whole issued586 projection inverse');
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
  let cas=once(casBefore,'  v_noc_same_h0_predecessor_payload jsonb;',
    '  v_noc_same_h0_predecessor_payload jsonb;\n  v_source597_same_h0_predecessor_payload jsonb;');
  const dispatch="    if p_payload ->> 'continuationStateContractSha256' = '"+PROJECTION_OUTPUT.T+"'\n";
  cas=once(cas,dispatch,"    if p_payload ->> 'continuationStateContractSha256' = '"+next.T+"'\n"
    +"      and v_payload #>> '{modelBinding,modelBundleSha256}' = '"+OLD.I+"'\n    then\n"
    +'      v_source597_same_h0_predecessor_payload := public.'+PROJECTION+'(v_payload,v_central_reference);\n    end if;\n'+dispatch);
  cas=once(cas,'    if v_noc_same_h0_predecessor_payload is not null',
    '    if v_source597_same_h0_predecessor_payload is not null\n      or v_noc_same_h0_predecessor_payload is not null');
  const comparison='    if v_central_is_compatible_predecessor and v_noc_same_h0_predecessor_payload is not null then';
  cas=once(cas,comparison,'    if v_central_is_compatible_predecessor and v_source597_same_h0_predecessor_payload is not null then\n'
    +'      v_exact_predecessor_same_target_transition := v_central_reference = p_target_reference\n'
    +"        and (v_source597_same_h0_predecessor_payload #- '{generationSha256}' #- '{stateSha256}'\n"
    +"          #- '{candidateGRollbackCompanion,generationSha256}')\n"
    +"        = (p_payload #- '{generationSha256}' #- '{stateSha256}'\n"
    +"          #- '{candidateGRollbackCompanion,generationSha256}');\n"+comparison.replace('    if ','    elsif '));
  const numericPrefix='    elsif p_target_reference > v_central_reference\n',at=cas.indexOf(numericPrefix);assert(at>=0);
  const newer=numericPrefix+"      and p_payload ->> 'continuationStateContractSha256' = '"+next.T+"'\n"
    +'      and public.'+FROZEN_PAYLOAD+'(v_payload,v_central_reference)\n    then\n'
    +'      -- Genuine preserved597 only; normal newer-reference comparison remains below.\n'
    +'      v_central_is_compatible_predecessor := false;\n';
  cas=cas.slice(0,at)+newer+cas.slice(at);
  assert.equal(count(cas,numericPrefix),count(casBefore,numericPrefix)+1);
  const tail=casBefore.indexOf('    -- Equality is checked before the expected version.');
  assert(tail>=0&&cas.endsWith(casBefore.slice(tail)),'Whole retry/version/write/refusal tail unchanged');add(CP+'cas',cas);
  const contractBefore=definition(before,CP+'contract');
  let contract=once(contractBefore,'  v_noc_same_h0_projection_definition text;',
    '  v_noc_same_h0_projection_definition text;\n  v_source597_state_definition text;\n  v_source597_payload_definition text;\n  v_source597_same_h0_projection_definition text;');
  const prefix=layout.prefix;
  const oldOids=prefix.validators,oid=[prefix.oid],oldDefinition=[prefix.checkpoint];
  const newOids=aliases.map(row=>"    pg_catalog.to_regprocedure('public."+row.name+row.signature+"')").join(',\n');
  contract=once(contract,oid[0],oid[0].slice(0,-5)+',\n'+newOids+'\n  ];');
  const variables=['v_source597_state_definition','v_source597_payload_definition','v_source597_same_h0_projection_definition'];
  const bodies=variables.map((variable,index)=>"  select pg_catalog.btrim(p.prosrc, E' \\n\\r\\t') into "+variable+'\n'
    +'  from pg_catalog.pg_proc p where p.oid = v_validator_oids['+(oldOids.length+index+1)+'];\n').join('\n');
  contract=once(contract,'  v_checkpoint_definition := v_canonical_time_definition',bodies+'\n  v_checkpoint_definition := v_canonical_time_definition');
  const oldTail=layout.oldTail;
  contract=once(contract,oldTail,oldTail.slice(0,-1)+SOURCE_PRODUCER_CONTRACT_LABELS.map((label,index)=>
    "\n    || E'\\n-- "+label+" --\\n' || "+variables[index]).join('')+';');
  contract=once(contract,"where m.version::text = '"+OLD.version+"'","where m.version::text = '"+next.version+"'");
  const afterOid=/  v_validator_oids oid\[\] := array\[([\s\S]*?)\n  \];/.exec(contract);assert(afterOid);
  const afterOids=[...afterOid[1].matchAll(/pg_catalog\.to_regprocedure\(\s*'([^']+)'\s*\)/g)].map(m=>m[1]);
  assert.deepEqual(afterOids,[...oldOids,...aliases.map(row=>'public.'+row.name+row.signature)],
    'Entire genuine597 validator prefix followed only by the three SOURCE aliases');
  assert.equal(afterOids.length,layout.successorValidatorCount);
  const afterDefinition=/  v_checkpoint_definition := v_canonical_time_definition[\s\S]*?;/.exec(contract);assert(afterDefinition);
  assert(afterDefinition[0].startsWith(oldDefinition[0].slice(0,-1)),
    'Entire genuine597 checkpoint definition prefix is preserved');
  assert.equal((contract.match(/\|\| v_[a-z0-9_]+_definition/g)??[]).length+1,layout.successorDefinitionCount);add(CP+'contract',contract);
  assert.deepEqual(changes.map(row=>row.name),SOURCE_PRODUCER_REPLACEMENTS);
  const insertion=aliases.map(row=>row.definition+'\nrevoke all on function public.'+row.name+row.signature+' from public, anon, authenticated;\n\n').join('');
  let canonicalSource=before;for(const row of changes)canonicalSource=once(canonicalSource,row.before,row.after);
  canonicalSource=once(canonicalSource,changes[0].after,insertion+changes[0].after);
  let inverse=once(canonicalSource,insertion,'');for(const row of [...changes].reverse())inverse=once(inverse,row.after,row.before);
  assert.equal(inverse,before,'Whole issued597 canonical inverse');
  const replaced=new Set(changes.map(row=>row.name));
  for(const match of before.matchAll(/^create or replace function public\.([a-z0-9_]+)\(/gm))
    if(!replaced.has(match[1]))assert.equal(definition(canonicalSource,match[1]),definition(before,match[1]),
      'Every untouched genuine597/historical function remains whole');
  for(const name of [CP+'native_origin_projection',ACCOUNT_STATISTICS_ASSISTANT_PROJECTION,NATIVE_ORIGINAL_CONTINUITY_PROJECTION])
    assert.equal(definition(canonicalSource,name),definition(before,name),'All existing projections unchanged');
  return Object.freeze({aliases,changes,canonicalSource,nextBinding:next,wholeCanonicalInverse:true,
    originalCanonicalSha256:sha(before),sameH0MetadataOnly:true,numericalSqlRulesChanged:false,installationPerformed:false,sqlExecuted:false});
}


// Pure CODE transformer, not binding derivation or a SQL emitter. The only
// accepted input is the exact genuine597 canonical source. No caller tuple.
export function compileSourceProducerAfter597Template(before){
  assert.equal(arguments.length,1,'No caller-selected SOURCE597 template tuple');
  const core=compileSourceProducerAfter597(before,SOURCE_AFTER597_UNISSUED_MARKERS,true);
  const {canonicalSource,nextBinding,...proof}=core;
  assert.equal(nextBinding,SOURCE_AFTER597_UNISSUED_MARKERS);
  for(const key of ['C','I','T'])assert(!/^[a-f0-9]{64}$/.test(nextBinding[key]));
  assert(!/^[0-9]{14}$/.test(nextBinding.version));
  return Object.freeze({...proof,canonicalTemplate:canonicalSource,unissuedMarkers:nextBinding,
    binding:null,output:null,migration:null,productionAuthority:false});
}

// The same actual compiler arm is used by the future normal physical build.
// Until a separately reviewed real issuance exists this stops BEFORE I/O.
export async function prepareSourceProducerAfter597SuccessorStructure(){
  requireSourceProducerAfter597Binding();
  assert.equal(arguments.length,0,'No caller-selected SOURCE597 build input');
  const issued=SOURCE_PRODUCER_AFTER597_PARENT.binding;
  const release=await sourceAfter597ReadRelease();
  assert.equal(release,SOURCE_PRODUCER_AFTER597_PARENT.nextRelease);
  const candidate=await computeCandidateGRollbackBundle();
  assert.deepEqual(await sourceAfter597RegularSourceBytes('scripts/rollback-assets/ravscore-model-bundle.generated.js'),Buffer.from(renderCandidateGRollbackGeneratedModule(candidate)));
  const integrated=await computeRavScoreModelBundle();
  assert.deepEqual(await sourceAfter597RegularSourceBytes('js/core/ravscore-model-bundle.generated.js'),Buffer.from(renderGeneratedBundleModule(integrated)));
  const next={version:issued.version,C:candidate.modelBundleSha256,I:integrated.modelBundleSha256,
    T:await ravScoreContinuationImplementationSha256()};
  assert.deepEqual(next,{version:issued.version,C:issued.C,I:issued.I,T:issued.T},'Only actual physical issued SOURCE597 C/I/T');
  const canonical=value=>Array.isArray(value)?value:value&&typeof value==='object'
    ?Object.fromEntries(Object.keys(value).sort().map(key=>[key,value[key]])):value;
  assert.equal(sha(JSON.stringify(candidate.manifest)),issued.candidateManifestSha256);
  assert.equal(sha(JSON.stringify(integrated.manifest,(_key,value)=>canonical(value))),issued.integratedManifestSha256);
  const prior=await readSourceProducerAfter597PredecessorCanonicalSource();
  return compileSourceProducerAfter597(prior.canonicalSource,next,false);
}
function sourceAfter597Wrap(core,prior){
  const OLD=requireSourceProducerAfter597CodeParent();
  const SOURCE_PRODUCER_REPLACEMENTS=SOURCE_AFTER597_COMPILER_REPLACEMENTS;
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
    "  if (select max(version::text) from supabase_migrations.schema_migrations) is distinct from '"+OLD.version+"' then raise exception 'SOURCE_PRODUCER_EXACT_INSTALLED597_REQUIRED'; end if;",
    "  if exists(select 1 from supabase_migrations.schema_migrations where version::text=any(array['20261014140000','20261015030000','20261016030000'])) then raise exception 'SOURCE_PRODUCER_ARCHIVED_PHASE_MUST_BE_ABSENT'; end if;",
    "  if not exists(select 1 from supabase_migrations.schema_migrations where version::text='20261013230000') then raise exception 'SOURCE_PRODUCER_INSTALLED230_REQUIRED'; end if;",
    '  lock table public.account_activity_journal,public.account_statistics_preferences in access share mode;'].join('\n');
  const migration=['-- Original-preserving post597 SOURCE metadata successor; SOURCE ONLY.',
    '-- Existing597,594,593,592,591,590,588,587,586,585 and older originals/projections and ALL numerical SQL guards preserved.',
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

function sourceAfter597CheckpointContractFromBase(source,base){
  assert.equal(arguments.length,2);assert(base&&sha(base.definition)===base.sha256);let value=base.definition;
  for(let index=0;index<SOURCE_AFTER597_COMPILER_ALIASES.length;index++){
    const whole=definition(source,SOURCE_AFTER597_COMPILER_ALIASES[index].name),at=whole.indexOf('as $$');assert(at>0);
    value+='\n-- '+SOURCE_AFTER597_COMPILER_LABELS[index]+' --\n'+whole.slice(at+5,whole.lastIndexOf('$$;')).replace(/\r\n?/g,'\n').trim();
  }return Object.freeze({id:base.id,definition:value,sha256:sha(value)});
}

// Symbolic migration CODE for review, never generated output or executable
// production SQL. Every new identity is deliberately an invalid hash/version.
export async function prepareSourceProducerAfter597CompilerTemplate(){
  assert.equal(arguments.length,0,'No caller-selected SOURCE597 wrapper input');
  const prior=await readSourceProducerAfter597PredecessorCanonicalSource();
  const core=compileSourceProducerAfter597(prior.canonicalSource,SOURCE_AFTER597_UNISSUED_MARKERS,true);
  const wrapped=sourceAfter597Wrap(core,prior);
  return Object.freeze({...compileSourceProducerAfter597Template(prior.canonicalSource),
    migrationTemplate:wrapped.migration,transactionalWrapperPrepared:true,postgresRun:false,migrationIssued:false});
}

// Actual future binding-only output construction uses the same normal guards
// and exact wrapper. No flag/tuple can bypass the currently NULL binding.
export async function buildSourceProducerAfter597BindingSuccessor(){
  requireSourceProducerAfter597Binding();assert.equal(arguments.length,0);
  const core=await prepareSourceProducerAfter597SuccessorStructure();
  const prior=await readSourceProducerAfter597PredecessorCanonicalSource();
  const result=sourceAfter597Wrap(core,prior);
  for(const original of prior.originalDefinitions)
    assert.equal(definition(result.canonicalSource,original.name),original.definition,'Every inherited original definition whole');
  const contract=sourceAfter597CheckpointContractFromBase(result.canonicalSource,
    checkpointCasContractFromCanonicalSource(result.canonicalSource,{sourcePhase:'scalar597-later-h0-original594-successor'}));
  return Object.freeze({...result,checkpointContractSha256:contract.sha256,
    tripBindingPolicySha256:tripBindingPolicyFromCanonicalSource(result.canonicalSource).sha256});
}

// SOURCE_AFTER597_FIRST_ISSUANCE_BEGIN
async function sourceAfter597RegularSourceBytes(relative){
  const file=path.join(ROOT,relative),stat=await fs.lstat(file);
  assert(stat.isFile()&&!stat.isSymbolicLink(),'SOURCE_AFTER597_REGULAR_SOURCE_REQUIRED');
  return fs.readFile(file);
}
async function readSourceProducerAfter597FirstIssuanceMetadata(){
  requireSourceProducerAfter597CodeParent(); // Fixed genuine CODE, before files.
  const bytes=await sourceAfter597RegularSourceBytes(SOURCE_PRODUCER_AFTER597_DERIVED_METADATA_PATH);
  const raw=bytes.toString('utf8');assert.deepEqual(Buffer.from(raw,'utf8'),bytes,'SOURCE_AFTER597_METADATA_UTF8');
  const value=sourceProducerAfter597DerivedMetadataFromText(raw);
  assert.deepEqual(value.binding,SOURCE_PRODUCER_AFTER597_PARENT.binding,'SOURCE_AFTER597_FRESH_BINDING_PHASE');
  assert.deepEqual(value.output,SOURCE_PRODUCER_AFTER597_PARENT.output,'SOURCE_AFTER597_FRESH_OUTPUT_PHASE');
  assert.equal(value.release,SOURCE_PRODUCER_AFTER597_PARENT.nextRelease,'SOURCE_AFTER597_FRESH_RELEASE_PHASE');
  assert.equal(value.version,SOURCE_PRODUCER_AFTER597_PARENT.binding?.version??null,'SOURCE_AFTER597_FRESH_VERSION_PHASE');
  return {raw,value};
}
async function sourceAfter597ReadRelease(){
  const pkg=JSON.parse((await sourceAfter597RegularSourceBytes('package.json')).toString('utf8'));
  return assertSourceProducerAfter597Release(pkg.version);
}
export async function deriveSourceProducerAfter597FirstBinding(version){
  assert.equal(arguments.length,1,'SOURCE_AFTER597_TIMESTAMP_ONLY');
  assert.equal(typeof version,'string','SOURCE_AFTER597_TIMESTAMP_ONLY');
  assert.match(version,/^[0-9]{14}$/,'SOURCE_AFTER597_TIMESTAMP_ONLY');
  const before=requireSourceProducerAfter597CodeParent();
  assert(version>before.version,'SOURCE_AFTER597_LATER_VERSION_REQUIRED');
  const {raw,value}=await readSourceProducerAfter597FirstIssuanceMetadata();
  assert.equal(value.version,null,'SOURCE_AFTER597_FIRST_BINDING_REQUIRES_NULL');
  assert.equal(value.release,null);assert.equal(value.binding,null);assert.equal(value.output,null);
  const release=await sourceAfter597ReadRelease(); // Real later package, before builders.
  const prior=await readSourceProducerAfter597PredecessorCanonicalSource();
  assert.equal(sha(prior.canonicalSource),before.canonicalSha256);
  const candidate=await computeCandidateGRollbackBundle();
  assert.deepEqual(await sourceAfter597RegularSourceBytes('scripts/rollback-assets/ravscore-model-bundle.generated.js'),
    Buffer.from(renderCandidateGRollbackGeneratedModule(candidate)),'SOURCE_AFTER597_PHYSICAL_C_MODULE');
  const integrated=await computeRavScoreModelBundle();
  assert.deepEqual(await sourceAfter597RegularSourceBytes('js/core/ravscore-model-bundle.generated.js'),
    Buffer.from(renderGeneratedBundleModule(integrated)),'SOURCE_AFTER597_PHYSICAL_I_MODULE');
  const canonical=value=>Array.isArray(value)?value:value&&typeof value==='object'
    ?Object.fromEntries(Object.keys(value).sort().map(key=>[key,value[key]])):value;
  const binding={version,C:candidate.modelBundleSha256,I:integrated.modelBundleSha256,
    T:await ravScoreContinuationImplementationSha256(),
    candidateManifestSha256:sha(JSON.stringify(candidate.manifest)),
    integratedManifestSha256:sha(JSON.stringify(integrated.manifest,(_key,value)=>canonical(value)))};
  assert.equal(binding.C,binding.candidateManifestSha256);assert.equal(binding.I,binding.integratedManifestSha256);
  assert.equal(new Set(['C','I','T'].flatMap(key=>[before[key],binding[key]])).size,6);
  assert.deepEqual(await readSourceProducerAfter597PredecessorCanonicalSource(),prior,'Whole fixed597 prior unchanged during first derivation');
  assert.deepEqual(await sourceAfter597RegularSourceBytes(SOURCE_PRODUCER_AFTER597_DERIVED_METADATA_PATH),
    Buffer.from(raw,'utf8'),'SOURCE_AFTER597_NULL_METADATA_UNCHANGED');
  return assertSourceProducerAfter597DerivedMetadata({schemaVersion:value.schemaVersion,release,version,binding,output:null});
}
export async function deriveSourceProducerAfter597FirstOutput(){
  assert.equal(arguments.length,0,'SOURCE_AFTER597_NO_OUTPUT_OPTIONS');
  requireSourceProducerAfter597Binding(); // NULL refuses before files/operands.
  const {raw,value}=await readSourceProducerAfter597FirstIssuanceMetadata();
  assert(value.binding!==null&&value.version!==null&&value.release!==null,'SOURCE_AFTER597_BINDING_ONLY_REQUIRED');
  assert.equal(value.output,null,'SOURCE_AFTER597_BINDING_ONLY_REQUIRED');
  const result=await buildSourceProducerAfter597BindingSuccessor(); // SAME normal compiler/wrapper.
  assert.deepEqual(result.nextBinding,{version:value.version,C:value.binding.C,I:value.binding.I,T:value.binding.T});
  const output={migrationSha256:result.migrationSha256,canonicalSha256:result.afterCanonicalSha256,
    checkpointContractSha256:result.checkpointContractSha256,tripBindingPolicySha256:result.tripBindingPolicySha256};
  assert.deepEqual(await sourceAfter597RegularSourceBytes(SOURCE_PRODUCER_AFTER597_DERIVED_METADATA_PATH),
    Buffer.from(raw,'utf8'),'SOURCE_AFTER597_BINDING_ONLY_METADATA_UNCHANGED');
  return assertSourceProducerAfter597DerivedMetadata({schemaVersion:value.schemaVersion,release:value.release,
    version:value.version,binding:{...value.binding},output});
}
// SOURCE_AFTER597_FIRST_ISSUANCE_END

// Existing CLI flags, closed until the real separately issued family exists.
export async function runSourceProducerAfter597Compiler(){
  requireSourceProducerAfter597Output(); // FIRST, before argv/files.
  const pins=SOURCE_PRODUCER_AFTER597_PARENT.output;
  assert.equal(arguments.length,0);
  assert(process.argv.length===2||(process.argv.length===3&&['--check','--write'].includes(process.argv[2])));
  const binding=SOURCE_PRODUCER_AFTER597_PARENT.binding;
  const {raw,value}=await readSourceProducerAfter597FirstIssuanceMetadata();assert(value.output!==null);
  const result=await buildSourceProducerAfter597BindingSuccessor();
  assert.deepEqual({migrationSha256:result.migrationSha256,canonicalSha256:result.afterCanonicalSha256,
    checkpointContractSha256:result.checkpointContractSha256,tripBindingPolicySha256:result.tripBindingPolicySha256},pins);
  assert.deepEqual(await sourceAfter597RegularSourceBytes(SOURCE_PRODUCER_AFTER597_DERIVED_METADATA_PATH),Buffer.from(raw,'utf8'),'SOURCE_AFTER597_OUTPUT_METADATA_UNCHANGED');
  const file=path.join(ROOT,'supabase/migrations',binding.version+'_source_producer_original_bound_successor.sql');
  if(process.argv[2]==='--write')await fs.writeFile(file,result.migration,{flag:'wx'});
  else assert.deepEqual(await fs.readFile(file),Buffer.from(result.migration));
  console.log('Exact post597 SOURCE metadata source checked; no installation or state admission.');
}
// SOURCE_AFTER597_COMPILER_END

async function main(){
  // SOURCE_AFTER597_FIRST_ISSUANCE_CLI_BEGIN
  if(process.argv[2]==='--derive-after597-first-binding'){
    assert.equal(process.argv.length,4);
    console.log(JSON.stringify(await deriveSourceProducerAfter597FirstBinding(process.argv[3]),null,2));return;
  }
  if(process.argv[2]==='--derive-after597-first-output'){
    assert.equal(process.argv.length,3);
    console.log(JSON.stringify(await deriveSourceProducerAfter597FirstOutput(),null,2));return;
  }
  // SOURCE_AFTER597_FIRST_ISSUANCE_CLI_END
  // SOURCE_AFTER597_COMPILER_DISPATCH_BEGIN
  if(SOURCE_PRODUCER_AFTER597_PARENT.binding!==null||process.argv[2]===undefined
    ||['--check','--write'].includes(process.argv[2])){
    await runSourceProducerAfter597Compiler();return;
  }
  // SOURCE_AFTER597_COMPILER_DISPATCH_END

  if(process.argv[2]==='--derive-post596-binding'){
    assert.equal(process.argv.length,4);
    console.log(JSON.stringify(await deriveSourceProducerPost596Binding({version:process.argv[3]}),null,2));return;
  }
  if(process.argv[2]==='--derive-alternative-binding'){
    assert.equal(process.argv.length,4);
    console.log(JSON.stringify(await deriveSourceProducerAlternativeBinding({version:process.argv[3]}),null,2));return;
  }
  if(process.argv[2]==='--derive-binding'){
    assert.equal(process.argv.length,4);
    const value=await deriveSourceProducerFirstBinding({version:process.argv[3]});
    console.log(JSON.stringify(value,null,2));return;
  }
  if(process.argv[2]==='--derive-output'){
    assert.equal(process.argv.length,3);
    console.log(JSON.stringify(await deriveSourceProducerFirstOutput(),null,2));return;
  }
  assert(process.argv.length===2||(process.argv.length===3&&['--check','--write'].includes(process.argv[2])));
  const pins=requireSourceProducerOutput(); // No render or SQL materialization while unissued.
  const result=await buildSourceProducerBindingSuccessor();
  assert.deepEqual({migrationSha256:result.migrationSha256,canonicalSha256:result.afterCanonicalSha256,
    checkpointContractSha256:result.checkpointContractSha256,tripBindingPolicySha256:result.tripBindingPolicySha256},pins);
  const file=path.join(ROOT,'supabase/migrations',sourceProducerMigration().filename);
  if(process.argv[2]==='--write')await fs.writeFile(file,result.migration,{flag:'wx'});
  else assert.deepEqual(await fs.readFile(file),Buffer.from(result.migration));
  console.log('Exact post593 SOURCE metadata source checked; no installation or state admission.');
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))await main();
