// SOURCE ONLY. Original-preserving SQL binding successor for the producer fix.
// No I29 mathematics change, numerical projection, installer or provider I/O.
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {computeCandidateGRollbackBundle,renderCandidateGRollbackGeneratedModule}
  from './build-candidate-g-rollback-bundle.mjs';
import {computeRavScoreModelBundle,renderGeneratedBundleModule} from './build-ravscore-model-bundle.mjs';
import {ravScoreContinuationImplementationSha256} from './lib/ravscore-continuation-implementation-contract.mjs';
import {statisticsPreferenceRevisionCatalogQuery} from './verify-account-assistant-schema.mjs';
import {checkpointCasContractFromCanonicalSource,tripBindingPolicyFromCanonicalSource}
  from './integrated-cutover-readiness.mjs';
import {ACCOUNT_STATISTICS_ASSISTANT_BEFORE as OLD,ACCOUNT_STATISTICS_ASSISTANT_VERSION,
  ACCOUNT_STATISTICS_ASSISTANT_ALIASES,ACCOUNT_STATISTICS_ASSISTANT_REPLACEMENTS,
  requireAccountStatisticsAssistantBinding,requireAccountStatisticsAssistantOutput,accountStatisticsAssistantMigration,
  readAccountStatisticsAssistantPredecessorCanonicalSource,accountStatisticsAssistantDefinition as definition}
  from './lib/account-statistics-assistant-successor-source.mjs';
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const CP='ravradar_ravscore_checkpoint_';
const sha=x=>crypto.createHash('sha256').update(x).digest('hex');
const count=(s,a)=>s.split(a).length-1;
function once(s,a,b){assert.equal(count(s,a),1,'One exact whole-source edit');return s.replace(a,()=>b);}
function replaceHashes(source,map){return source.replace(/[a-f0-9]{64}/g,value=>map.get(value)??value);}
function currentMetadata(source,next,expected){
  for(const key of ['C','I','T'])assert.equal(count(source,OLD[key]),expected[key]??0,'Exact current metadata inventory '+key);
  const map=new Map(['C','I','T'].map(key=>[OLD[key],next[key]]));
  const after=replaceHashes(source,map);
  assert.equal(replaceHashes(after,new Map([...map].map(([a,b])=>[b,a]))),source,'Whole metadata inverse');return after;
}
async function regularSource(relative){
  const file=path.join(ROOT,relative),stat=await fs.lstat(file);assert(stat.isFile()&&!stat.isSymbolicLink());
  return (await fs.readFile(file,'utf8')).replace(/^\uFEFF/,'').replace(/\r\n?/g,'\n');
}
function compileAccountStatisticsAssistantStructure(before,next){
  assert.equal(sha(before),OLD.canonicalSha256);assert.equal(next.version,ACCOUNT_STATISTICS_ASSISTANT_VERSION);
  for(const key of ['C','I','T'])assert.match(next[key],/^[a-f0-9]{64}$/);
  assert.equal(new Set(['C','I','T'].flatMap(k=>[OLD[k],next[k]])).size,6);
  for(const row of ACCOUNT_STATISTICS_ASSISTANT_ALIASES){
    assert(Buffer.byteLength(row.name)<=63);assert(!before.includes('function public.'+row.name+'('));
  }
  const [FROZEN_STATE,FROZEN_PAYLOAD,PROJECTION]=ACCOUNT_STATISTICS_ASSISTANT_ALIASES.map(row=>row.name);
  const stateBefore=definition(before,CP+'integrated_state_valid');
  const payloadBefore=definition(before,CP+'payload_valid');
  const state=once(stateBefore,'function public.'+CP+'integrated_state_valid(','function public.'+FROZEN_STATE+'(');
  const payload=once(once(payloadBefore,'function public.'+CP+'payload_valid(','function public.'+FROZEN_PAYLOAD+'('),
    'public.'+CP+'integrated_state_valid(','public.'+FROZEN_STATE+'(');
  assert.equal(once(state,'function public.'+FROZEN_STATE+'(','function public.'+CP+'integrated_state_valid('),stateBefore);
  assert.equal(once(once(payload,'function public.'+FROZEN_PAYLOAD+'(','function public.'+CP+'payload_valid('),
    'public.'+FROZEN_STATE+'(','public.'+CP+'integrated_state_valid('),payloadBefore);
  const aliases=[{...ACCOUNT_STATISTICS_ASSISTANT_ALIASES[0],definition:state},
    {...ACCOUNT_STATISTICS_ASSISTANT_ALIASES[1],definition:payload}];
  const changes=[],add=(name,after)=>changes.push({name,before:definition(before,name),after});
  for(const[suffix,inventory]of[['integrated_state_valid',{I:1}],['payload_valid',{I:1,C:1,T:1}],
    ['integrated_state_reason',{I:1}],['payload_reason',{I:1,C:1,T:1}]])
    add(CP+suffix,currentMetadata(definition(before,CP+suffix),next,inventory));

  // Derive ONE separate full584->585 metadata projection. The real issued
  // native seed projection already calls its immutable lme140000 validator;
  // it is kept byte-identical, including its genuine old seed guard.
  const nativeName=CP+'native_origin_projection',oldProjection=definition(before,nativeName);
  const seedStart=oldProjection.indexOf('begin\n')+'begin\n'.length;
  const seedEnd=oldProjection.indexOf('  if p_payload is null\n',seedStart);
  assert(seedStart>5&&seedEnd>seedStart);
  const seedGuard=oldProjection.slice(seedStart,seedEnd);
  assert(seedGuard.startsWith('  if not public.'+CP+'cmw0200_payload_valid(p_payload,p_target_reference)\n'));
  assert(seedGuard.endsWith('  then return null; end if;\n'));
  const originalNative={I:'84217430a712fec3e78c5c3115d86520a4011a388998af030d231a8433d52bb3',
    C:'76a86277db106621e7f0952d0789f9038a4bf9cfe7993b88de5c9a49bf25b4b8',
    T:'a519a34e91e552623892e28f3c1fa9ee67b65d1fa08869a96e34fa24bd6d832f'};
  const oldOutput={I:'038d9b0cdc50d36dd10f207c6f33e909ddedbdacb28c89adbca12121cb2c7f5f',
    C:'5cc38c658bf14513a029a62de8f5f9e98259630755bdd84bccbc5fb2c1797858',
    T:'047db5f9c91b555eb47b886d200061456c9cbec450732743265f0f1739114447'};
  const map=new Map(),inverseMap=new Map();for(const key of ['C','I','T']){
    map.set(originalNative[key],OLD[key]);map.set(oldOutput[key],next[key]);
    inverseMap.set(OLD[key],originalNative[key]);inverseMap.set(next[key],oldOutput[key]);
  }
  let projection=replaceHashes(once(once(oldProjection,seedGuard,''),
    'function public.'+nativeName+'(','function public.'+PROJECTION+'('),map);
  const oldOutputValidator='public.'+CP+'lme140000_payload_valid(';
  projection=once(projection,oldOutputValidator,'public.'+CP+'payload_valid(');
  const oldGuard='  if not public.'+FROZEN_PAYLOAD+'(p_payload,p_target_reference)\n  then return null; end if;\n';
  projection=once(projection,'begin\n','begin\n'+oldGuard);
  let projectionInverse=once(projection,oldGuard,'');
  projectionInverse=once(projectionInverse,'public.'+CP+'payload_valid(',oldOutputValidator);
  projectionInverse=replaceHashes(projectionInverse,inverseMap);
  projectionInverse=once(projectionInverse,'function public.'+PROJECTION+'(','function public.'+nativeName+'(');
  projectionInverse=once(projectionInverse,'begin\n','begin\n'+seedGuard);
  assert.equal(projectionInverse,oldProjection,'Whole actual584 native projection inverse; no invented seed');
  aliases.push({...ACCOUNT_STATISTICS_ASSISTANT_ALIASES[2],definition:projection});
  const predecessorBefore=definition(before,CP+'predecessor_payload_valid');
  add(CP+'predecessor_payload_valid',once(predecessorBefore,'begin\n',
    'begin\n  if p_current_implementation_sha256 = '+"'"+next.T+"'\n"
    +"    and p_payload #>> '{modelBinding,modelBundleSha256}' = '"+OLD.I+"'\n"
    +'    and public.'+PROJECTION+'(p_payload,p_target_reference) is not null\n  then return true; end if;\n'));
  let trip=definition(before,'ravradar_trip_v3_binding_allowed');
  for(const key of ['I','C'])trip=once(trip,"        '"+OLD[key]+"'\n      )",
    "        '"+OLD[key]+"',\n        '"+next[key]+"'\n      )");
  add('ravradar_trip_v3_binding_allowed',trip);

  const casBefore=definition(before,CP+'cas');
  let cas=once(casBefore,'  v_causal_predecessor_payload jsonb;',
    '  v_causal_predecessor_payload jsonb;\n  v_asa_same_h0_predecessor_payload jsonb;');
  // Actual584 retains the old140000 causal arm; no fictitious584 causal arm.
  const dispatch="    if p_payload ->> 'continuationStateContractSha256' = '"+oldOutput.T+"'\n";
  cas=once(cas,dispatch,"    if p_payload ->> 'continuationStateContractSha256' = '"+next.T+"'\n"
    +"      and v_payload #>> '{modelBinding,modelBundleSha256}' = '"+OLD.I+"'\n    then\n"
    +'      v_asa_same_h0_predecessor_payload := public.'+PROJECTION+'(v_payload,v_central_reference);\n    end if;\n'+dispatch);
  cas=once(cas,'    if v_causal_predecessor_payload is not null',
    '    if v_asa_same_h0_predecessor_payload is not null\n      or v_causal_predecessor_payload is not null');
  const comparison='    if v_central_is_compatible_predecessor and v_causal_predecessor_payload is not null then';
  cas=once(cas,comparison,
    '    if v_central_is_compatible_predecessor and v_asa_same_h0_predecessor_payload is not null then\n'
    +'      v_exact_predecessor_same_target_transition := v_central_reference = p_target_reference\n'
    +"        and (v_asa_same_h0_predecessor_payload #- '{generationSha256}' #- '{stateSha256}'\n"
    +"          #- '{candidateGRollbackCompanion,generationSha256}')\n"
    +"        = (p_payload #- '{generationSha256}' #- '{stateSha256}'\n"
    +"          #- '{candidateGRollbackCompanion,generationSha256}');\n"
    +comparison.replace('    if ','    elsif '));
  const numericPrefix='    elsif p_target_reference > v_central_reference\n';
  const numericAt=cas.indexOf(numericPrefix);assert(numericAt>=0);
  const newer=numericPrefix+"      and p_payload ->> 'continuationStateContractSha256' = '"+next.T+"'\n"
    +'      and public.'+FROZEN_PAYLOAD+'(v_payload,v_central_reference)\n    then\n'
    +'      -- New reference may continue only from the genuine preserved584 payload.\n'
    +'      v_central_is_compatible_predecessor := false;\n';
  cas=cas.slice(0,numericAt)+newer+cas.slice(numericAt);
  assert.equal(count(cas,numericPrefix),count(casBefore,numericPrefix)+1);
  const tail=casBefore.indexOf('    -- Equality is checked before the expected version.');
  assert(tail>=0&&cas.endsWith(casBefore.slice(tail)),'Whole existing retry/version/write/refusal tail');
  add(CP+'cas',cas);

  const contractBefore=definition(before,CP+'contract');
  let contract=once(contractBefore,'  v_lme140000_payload_definition text;',
    '  v_lme140000_payload_definition text;\n  v_asa584_state_definition text;\n  v_asa584_payload_definition text;\n  v_asa_same_h0_projection_definition text;');
  const oidDeclaration=/  v_validator_oids oid\[\] := array\[([\s\S]*?)\n  \];/.exec(contractBefore);assert(oidDeclaration);
  const oldOids=[...oidDeclaration[1].matchAll(/pg_catalog\.to_regprocedure\(\s*'([^']+)'\s*\)/g)].map(m=>m[1]);
  assert.equal(oldOids.length,25);assert.equal(new Set(oldOids).size,25);
  assert.equal(oldOids.at(-1),'public.'+CP+'lme140000_payload_valid(jsonb,timestamptz)');
  const newOids=aliases.map(row=>"    pg_catalog.to_regprocedure('public."+row.name+row.signature+"')").join(',\n');
  const newDeclaration=oidDeclaration[0].slice(0,-5)+',\n'+newOids+'\n  ];';
  contract=once(contract,oidDeclaration[0],newDeclaration);
  const bodies=['v_asa584_state_definition','v_asa584_payload_definition','v_asa_same_h0_projection_definition']
    .map((variable,index)=>"  select pg_catalog.btrim(p.prosrc, E' \\n\\r\\t') into "+variable+'\n'
      +'  from pg_catalog.pg_proc p where p.oid = v_validator_oids['+(oldOids.length+index+1)+'];\n').join('\n');
  contract=once(contract,'  v_checkpoint_definition := v_canonical_time_definition',bodies+'\n  v_checkpoint_definition := v_canonical_time_definition');
  const oldTail="    || E'\\n-- last-mile-original140000-payload-validator --\\n' || v_lme140000_payload_definition;";
  const labels=['account-statistics-original584-state-validator','account-statistics-original584-payload-validator','account-statistics-assistant-same-h0-projection'];
  const variables=['v_asa584_state_definition','v_asa584_payload_definition','v_asa_same_h0_projection_definition'];
  const bodyAppend=labels.map((label,index)=>"\n    || E'\\n-- "+label+" --\\n' || "+variables[index]).join('')+';';
  contract=once(contract,oldTail,oldTail.slice(0,-1)+bodyAppend);
  contract=once(contract,"where m.version::text = '"+OLD.version+"'","where m.version::text = '"+next.version+"'");
  const afterOid=/  v_validator_oids oid\[\] := array\[([\s\S]*?)\n  \];/.exec(contract);assert(afterOid);
  assert.equal((afterOid[1].match(/pg_catalog\.to_regprocedure\(/g)??[]).length,28);
  assert.equal((contract.match(/\|\| v_[a-z0-9_]+_definition/g)??[]).length+1,31);
  add(CP+'contract',contract);
  assert.deepEqual(changes.map(row=>row.name),ACCOUNT_STATISTICS_ASSISTANT_REPLACEMENTS);
  const insertion=aliases.map(row=>row.definition+'\nrevoke all on function public.'+row.name+row.signature+' from public, anon, authenticated;\n\n').join('');
  let canonicalSource=before;for(const row of changes)canonicalSource=once(canonicalSource,row.before,row.after);
  canonicalSource=once(canonicalSource,changes[0].after,insertion+changes[0].after);
  let inverse=once(canonicalSource,insertion,'');for(const row of [...changes].reverse())inverse=once(inverse,row.after,row.before);
  assert.equal(inverse,before,'Whole actual584 canonical inverse');
  assert.equal(definition(canonicalSource,nativeName),oldProjection,'Original seed projection and output alias stay unchanged');
  return Object.freeze({aliases,changes,canonicalSource,nextBinding:next,wholeCanonicalInverse:true,
    originalCanonicalSha256:sha(before),sameH0MetadataOnly:true,oldOriginProjectionPreserved:true,
    numericalSqlRulesChanged:false,installationPerformed:false,sqlExecuted:false});
}


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




function wrapAccountStatisticsAssistantSource(core,prior){
  assert(core.wholeCanonicalInverse&&core.sameH0MetadataOnly&&!core.numericalSqlRulesChanged);
  assert.equal(core.originalCanonicalSha256,OLD.canonicalSha256);assert.equal(sha(prior.canonicalSource),OLD.canonicalSha256);
  assert.equal(prior.statisticsSchemaVersion,2);
  const before=prior.canonicalSource,next=core.nextBinding;
  const names=[...before.matchAll(/^create or replace function public\.((?:ravradar_ravscore_checkpoint_[a-z0-9_]+)|version_admin_document|ravradar_trip_v3_binding_allowed)\(/gm)].map(m=>m[1]);
  assert.equal(names.length,new Set(names).size);
  const oldDefinitions=names.map(name=>definition(before,name)),signatures=oldDefinitions.map(signature);
  const allSignatures=[...signatures,...core.aliases.map(r=>'public.'+r.name+r.signature)];
  assert.equal(new Set(allSignatures.map(s=>s.replace(/^public\.([a-z0-9_]+)\(/,(_all,name)=>'public.'+name.slice(0,63)+'('))).size,allSignatures.length);
  const newDefinitions=core.aliases.map(r=>r.definition),snapshot=preservationQuery(signatures);
  const commands=core.aliases.flatMap(r=>[r.definition,'revoke all on function public.'+r.name+r.signature+' from public, anon, authenticated;'])
    .concat(core.changes.map(r=>r.after),['alter function public.'+CP+"cas(bigint,timestamptz,jsonb) set statement_timeout = '55s';"]);
  assert(commands.every(c=>c.startsWith('create or replace function ')||c.startsWith('revoke all on function ')||c.startsWith('alter function public.'+CP+'cas(')));
  const ddl=commands.map((command,index)=>{const tag='$account_statistics_assistant_ddl_'+index+'$';assert(!command.includes(tag));return '  execute '+tag+'\n'+command+'\n'+tag+';';});
  const absent=core.aliases.map(r=>"  if exists(select 1 from pg_catalog.pg_proc where pronamespace='public'::regnamespace and proname='"+r.name+"') then raise exception 'ACCOUNT_STATISTICS_ASSISTANT_DESTINATION_EXISTS'; end if;");
  const prefix=[
    'do $account_statistics_assistant_successor$',
    'declare original_catalog jsonb; after_catalog jsonb; account_observed jsonb; function_name text;',
    'begin',
    "  if (select max(version::text) from supabase_migrations.schema_migrations) is distinct from '"+OLD.version+"' then raise exception 'ACCOUNT_STATISTICS_ASSISTANT_EXACT_INSTALLED584_REQUIRED'; end if;",
    "  if exists(select 1 from supabase_migrations.schema_migrations where version::text=any(array['20261014140000','20261015030000','20261016030000'])) then raise exception 'ACCOUNT_STATISTICS_ASSISTANT_ARCHIVED_PHASE_MUST_BE_ABSENT'; end if;",
    "  if not exists(select 1 from supabase_migrations.schema_migrations where version::text='20261013230000') then raise exception 'ACCOUNT_STATISTICS_ASSISTANT_INSTALLED230_REQUIRED'; end if;",
    '  lock table public.account_activity_journal,public.account_statistics_preferences in access share mode;',
  ].join('\n');
  const migration=[
    '-- Original-preserving account/statistics/assistant metadata successor; SOURCE ONLY.',
    '-- Actual584/original aliases and ALL numerical SQL guards remain unchanged.',
    '-- Exact same-H0 metadata projection or genuinely newer reference from preserved584 only.',
    'begin;',"set local statement_timeout = '55s';","set local lock_timeout = '5s';",prefix,
    ...absent,...oldDefinitions.map(definitionGuard),schema2Guard(prior.statisticsExpected),
    '  '+snapshot+' into original_catalog;',...ddl,
    ...names.map(name=>definitionGuard(definition(core.canonicalSource,name))),...newDefinitions.map(definitionGuard),
    schema2Guard(prior.statisticsExpected),'  '+snapshot+' into after_catalog;',
    "  if after_catalog is distinct from original_catalog then raise exception 'ACCOUNT_STATISTICS_ASSISTANT_ORIGINAL_PROPERTIES_OR_ACCOUNT_CHANGED'; end if;",
    'end;\n$account_statistics_assistant_successor$;',"notify pgrst, 'reload schema';",'commit;','',
  ].join('\n\n').replace(/\n+$/,'\n');
  assert.deepEqual([...migration.matchAll(/^create or replace function public\.([a-z0-9_]+)\(/gm)].map(m=>m[1]),
    [...core.aliases.map(r=>r.name),...ACCOUNT_STATISTICS_ASSISTANT_REPLACEMENTS]);
  return Object.freeze({...core,migration,migrationSha256:sha(migration),afterCanonicalSha256:sha(core.canonicalSource),
    transactionalWrapperPrepared:true,statisticsSchema2Source:prior.statisticsSchema2Source,
    postgresRun:false,migrationIssued:false,productionAuthority:false});
}
export async function prepareAccountStatisticsAssistantSuccessorStructure(){
  assert.equal(arguments.length,0);const issued=requireAccountStatisticsAssistantBinding(); // BEFORE I/O or builders.
  const candidate=await computeCandidateGRollbackBundle();
  assert.equal(await regularSource('scripts/rollback-assets/ravscore-model-bundle.generated.js'),renderCandidateGRollbackGeneratedModule(candidate));
  const integrated=await computeRavScoreModelBundle();
  assert.equal(await regularSource('js/core/ravscore-model-bundle.generated.js'),renderGeneratedBundleModule(integrated));
  const next={version:issued.version,C:candidate.modelBundleSha256,I:integrated.modelBundleSha256,T:await ravScoreContinuationImplementationSha256()};
  assert.deepEqual(next,{version:issued.version,C:issued.C,I:issued.I,T:issued.T},'Only actual physical issued C/I/T');
  assert.equal(candidate.modelBundleSha256,issued.candidateManifestSha256);
  const canonical=value=>Array.isArray(value)?value:value&&typeof value==='object'?Object.fromEntries(Object.keys(value).sort().map(k=>[k,value[k]])):value;
  assert.equal(sha(JSON.stringify(integrated.manifest,(_key,value)=>canonical(value))),issued.integratedManifestSha256);
  const prior=await readAccountStatisticsAssistantPredecessorCanonicalSource();return compileAccountStatisticsAssistantStructure(prior.canonicalSource,next);
}
export async function buildAccountStatisticsAssistantBindingSuccessor(){
  assert.equal(arguments.length,0);requireAccountStatisticsAssistantBinding();
  const core=await prepareAccountStatisticsAssistantSuccessorStructure(),prior=await readAccountStatisticsAssistantPredecessorCanonicalSource();
  const result=wrapAccountStatisticsAssistantSource(core,prior);
  const contract=checkpointCasContractFromCanonicalSource(result.canonicalSource,{sourcePhase:'account-statistics-assistant'});
  return Object.freeze({...result,checkpointContractSha256:contract.sha256,
    tripBindingPolicySha256:tripBindingPolicyFromCanonicalSource(result.canonicalSource).sha256});
}
async function main(){
  assert(process.argv.length===2||(process.argv.length===3&&['--check','--write'].includes(process.argv[2])));
  const pins=requireAccountStatisticsAssistantOutput(); // Never materialize SQL before actual output issuance.
  const result=await buildAccountStatisticsAssistantBindingSuccessor();
  assert.deepEqual({migrationSha256:result.migrationSha256,canonicalSha256:result.afterCanonicalSha256,
    checkpointContractSha256:result.checkpointContractSha256,tripBindingPolicySha256:result.tripBindingPolicySha256},pins);
  const file=path.join(ROOT,'supabase/migrations',accountStatisticsAssistantMigration().filename);
  if(process.argv[2]==='--write')await fs.writeFile(file,result.migration,{flag:'wx'});
  else assert.deepEqual(await fs.readFile(file),Buffer.from(result.migration));
  console.log('Exact account/statistics/assistant successor source verified; no installation or state admission.');
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))await main();
