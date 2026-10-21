// PRIVATE UNISSUED P0 proposal: one metadata-only successor of actual585.
// Controller-only; full transition/prewrite/installed-only delivery remains OPEN.
// Reconfirm the complete normal post-wiring C/I/T graph before issuing inline metadata.
// No source/tuple overrides, installer, runtime/origin issuer or provider I/O.
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {computeCandidateGRollbackBundle,renderCandidateGRollbackGeneratedModule} from './build-candidate-g-rollback-bundle.mjs';
import {computeRavScoreModelBundle,renderGeneratedBundleModule} from './build-ravscore-model-bundle.mjs';
import {ravScoreContinuationImplementationSha256} from './lib/ravscore-continuation-implementation-contract.mjs';
import {statisticsPreferenceRevisionCatalogQuery} from './verify-account-assistant-schema.mjs';
import {checkpointCasContractFromCanonicalSource,tripBindingPolicyFromCanonicalSource} from './integrated-cutover-readiness.mjs';
import {ACCOUNT_STATISTICS_ASSISTANT_BEFORE as ANCIENT,ACCOUNT_STATISTICS_ASSISTANT_PROJECTION}
  from './lib/account-statistics-assistant-successor-source.mjs';
import {NATIVE_ORIGINAL_CONTINUITY_BEFORE as OLD,NATIVE_ORIGINAL_CONTINUITY_PROPOSED_RELEASE,NATIVE_ORIGINAL_CONTINUITY_ALIASES,
  NATIVE_ORIGINAL_CONTINUITY_PROJECTION,NATIVE_ORIGINAL_CONTINUITY_REPLACEMENTS,NATIVE_ORIGINAL_CONTINUITY_CONTRACT_LABELS,
  requireNativeOriginalContinuityBinding,requireNativeOriginalContinuityOutput,nativeOriginalContinuityMigration,
  readNativeOriginalContinuityPredecessorCanonicalSource,nativeOriginalContinuityDefinition as definition,
  nativeOriginalContinuityCheckpointContractFromBase} from './lib/native-original-continuity-successor-source.mjs';
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
  for(const row of NATIVE_ORIGINAL_CONTINUITY_ALIASES){assert(Buffer.byteLength(row.name)<=63);assert(!before.includes('function public.'+row.name+'('));}
  const [FROZEN_STATE,FROZEN_PAYLOAD,PROJECTION]=NATIVE_ORIGINAL_CONTINUITY_ALIASES.map(row=>row.name);
  const stateBefore=definition(before,CP+'integrated_state_valid'),payloadBefore=definition(before,CP+'payload_valid');
  const state=once(stateBefore,'function public.'+CP+'integrated_state_valid(','function public.'+FROZEN_STATE+'(');
  const payload=once(once(payloadBefore,'function public.'+CP+'payload_valid(','function public.'+FROZEN_PAYLOAD+'('),
    'public.'+CP+'integrated_state_valid(','public.'+FROZEN_STATE+'(');
  assert.equal(once(state,'function public.'+FROZEN_STATE+'(','function public.'+CP+'integrated_state_valid('),stateBefore);
  assert.equal(once(once(payload,'function public.'+FROZEN_PAYLOAD+'(','function public.'+CP+'payload_valid('),
    'public.'+FROZEN_STATE+'(','public.'+CP+'integrated_state_valid('),payloadBefore);
  const aliases=[{...NATIVE_ORIGINAL_CONTINUITY_ALIASES[0],definition:state},{...NATIVE_ORIGINAL_CONTINUITY_ALIASES[1],definition:payload}];
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
  aliases.push({...NATIVE_ORIGINAL_CONTINUITY_ALIASES[2],definition:projection});
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
    '  v_asa_same_h0_predecessor_payload jsonb;\n  v_noc_same_h0_predecessor_payload jsonb;');
  const dispatch="    if p_payload ->> 'continuationStateContractSha256' = '"+OLD.T+"'\n";
  cas=once(cas,dispatch,"    if p_payload ->> 'continuationStateContractSha256' = '"+next.T+"'\n"
    +"      and v_payload #>> '{modelBinding,modelBundleSha256}' = '"+OLD.I+"'\n    then\n"
    +'      v_noc_same_h0_predecessor_payload := public.'+PROJECTION+'(v_payload,v_central_reference);\n    end if;\n'+dispatch);
  cas=once(cas,'    if v_asa_same_h0_predecessor_payload is not null',
    '    if v_noc_same_h0_predecessor_payload is not null\n      or v_asa_same_h0_predecessor_payload is not null');
  const comparison='    if v_central_is_compatible_predecessor and v_asa_same_h0_predecessor_payload is not null then';
  cas=once(cas,comparison,'    if v_central_is_compatible_predecessor and v_noc_same_h0_predecessor_payload is not null then\n'
    +'      v_exact_predecessor_same_target_transition := v_central_reference = p_target_reference\n'
    +"        and (v_noc_same_h0_predecessor_payload #- '{generationSha256}' #- '{stateSha256}'\n"
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
    '  v_asa_same_h0_projection_definition text;\n  v_noc585_state_definition text;\n  v_noc585_payload_definition text;\n  v_noc_same_h0_projection_definition text;');
  const oid=/  v_validator_oids oid\[\] := array\[([\s\S]*?)\n  \];/.exec(contractBefore);assert(oid);
  const oldOids=[...oid[1].matchAll(/pg_catalog\.to_regprocedure\(\s*'([^']+)'\s*\)/g)].map(m=>m[1]);
  assert.equal(oldOids.length,28);assert.equal(new Set(oldOids).size,28);
  assert.equal(oldOids.at(-1),'public.'+ACCOUNT_STATISTICS_ASSISTANT_PROJECTION+'(jsonb,timestamptz)');
  const newOids=aliases.map(row=>"    pg_catalog.to_regprocedure('public."+row.name+row.signature+"')").join(',\n');
  contract=once(contract,oid[0],oid[0].slice(0,-5)+',\n'+newOids+'\n  ];');
  const variables=['v_noc585_state_definition','v_noc585_payload_definition','v_noc_same_h0_projection_definition'];
  const bodies=variables.map((variable,index)=>"  select pg_catalog.btrim(p.prosrc, E' \\n\\r\\t') into "+variable+'\n'
    +'  from pg_catalog.pg_proc p where p.oid = v_validator_oids['+(oldOids.length+index+1)+'];\n').join('\n');
  contract=once(contract,'  v_checkpoint_definition := v_canonical_time_definition',bodies+'\n  v_checkpoint_definition := v_canonical_time_definition');
  const oldTail="    || E'\\n-- account-statistics-assistant-same-h0-projection --\\n' || v_asa_same_h0_projection_definition;";
  contract=once(contract,oldTail,oldTail.slice(0,-1)+NATIVE_ORIGINAL_CONTINUITY_CONTRACT_LABELS.map((label,index)=>
    "\n    || E'\\n-- "+label+" --\\n' || "+variables[index]).join('')+';');
  contract=once(contract,"where m.version::text = '"+OLD.version+"'","where m.version::text = '"+next.version+"'");
  const afterOid=/  v_validator_oids oid\[\] := array\[([\s\S]*?)\n  \];/.exec(contract);assert(afterOid);
  assert.equal((afterOid[1].match(/pg_catalog\.to_regprocedure\(/g)??[]).length,31);
  assert.equal((contract.match(/\|\| v_[a-z0-9_]+_definition/g)??[]).length+1,34);add(CP+'contract',contract);
  assert.deepEqual(changes.map(row=>row.name),NATIVE_ORIGINAL_CONTINUITY_REPLACEMENTS);
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
// Exact guard helper bodies retained from actual585's builder. They are local
// only because those functions are not exported on the actual P0 predecessor.
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
  const ddl=commands.map((command,index)=>{const tag='$native_original_continuity_ddl_'+index+'$';assert(!command.includes(tag));return '  execute '+tag+'\n'+command+'\n'+tag+';';});
  const absent=core.aliases.map(row=>"  if exists(select 1 from pg_catalog.pg_proc where pronamespace='public'::regnamespace and proname='"+row.name+"') then raise exception 'NATIVE_ORIGINAL_CONTINUITY_DESTINATION_EXISTS'; end if;");
  const snapshot=preservationQuery(signatures);
  const prefix=['do $native_original_continuity_successor$',
    'declare original_catalog jsonb; after_catalog jsonb; account_observed jsonb; function_name text;','begin',
    "  if (select max(version::text) from supabase_migrations.schema_migrations) is distinct from '"+OLD.version+"' then raise exception 'NATIVE_ORIGINAL_CONTINUITY_EXACT_INSTALLED585_REQUIRED'; end if;",
    "  if exists(select 1 from supabase_migrations.schema_migrations where version::text=any(array['20261014140000','20261015030000','20261016030000'])) then raise exception 'NATIVE_ORIGINAL_CONTINUITY_ARCHIVED_PHASE_MUST_BE_ABSENT'; end if;",
    "  if not exists(select 1 from supabase_migrations.schema_migrations where version::text='20261013230000') then raise exception 'NATIVE_ORIGINAL_CONTINUITY_INSTALLED230_REQUIRED'; end if;",
    '  lock table public.account_activity_journal,public.account_statistics_preferences in access share mode;'].join('\n');
  const migration=['-- Original-preserving post585 native-original-continuity metadata successor; SOURCE ONLY.',
    '-- Existing585 and older originals/projections and ALL numerical SQL guards preserved.',
    'begin;',"set local statement_timeout = '55s';","set local lock_timeout = '5s';",prefix,...absent,
    ...definitions.map(definitionGuard),schema2Guard(prior.statisticsExpected),'  '+snapshot+' into original_catalog;',...ddl,
    ...names.map(name=>definitionGuard(definition(core.canonicalSource,name))),...core.aliases.map(row=>definitionGuard(row.definition)),
    schema2Guard(prior.statisticsExpected),'  '+snapshot+' into after_catalog;',
    "  if after_catalog is distinct from original_catalog then raise exception 'NATIVE_ORIGINAL_CONTINUITY_ORIGINAL_PROPERTIES_OR_ACCOUNT_CHANGED'; end if;",
    'end;\n$native_original_continuity_successor$;',"notify pgrst, 'reload schema';",'commit;',''].join('\n\n').replace(/\n+$/,'\n');
  assert.deepEqual([...migration.matchAll(/^create or replace function public\.([a-z0-9_]+)\(/gm)].map(m=>m[1]),
    [...core.aliases.map(row=>row.name),...NATIVE_ORIGINAL_CONTINUITY_REPLACEMENTS]);
  return Object.freeze({...core,migration,migrationSha256:sha(migration),afterCanonicalSha256:sha(core.canonicalSource),
    transactionalWrapperPrepared:true,statisticsSchema2Source:prior.statisticsSchema2Source,postgresRun:false,migrationIssued:false,productionAuthority:false});
}
async function regularSource(relative){const file=path.join(ROOT,relative),stat=await fs.lstat(file);assert(stat.isFile()&&!stat.isSymbolicLink());
  return (await fs.readFile(file,'utf8')).replace(/^\uFEFF/,'').replace(/\r\n?/g,'\n');}
export async function prepareNativeOriginalContinuitySuccessorStructure(){
  assert.equal(arguments.length,0);const issued=requireNativeOriginalContinuityBinding(); // BEFORE I/O/builders.
  assert.equal(JSON.parse(await regularSource('package.json')).version,NATIVE_ORIGINAL_CONTINUITY_PROPOSED_RELEASE);
  const candidate=await computeCandidateGRollbackBundle();
  assert.equal(await regularSource('scripts/rollback-assets/ravscore-model-bundle.generated.js'),renderCandidateGRollbackGeneratedModule(candidate));
  const integrated=await computeRavScoreModelBundle();
  assert.equal(await regularSource('js/core/ravscore-model-bundle.generated.js'),renderGeneratedBundleModule(integrated));
  const next={version:issued.version,C:candidate.modelBundleSha256,I:integrated.modelBundleSha256,T:await ravScoreContinuationImplementationSha256()};
  assert.deepEqual(next,{version:issued.version,C:issued.C,I:issued.I,T:issued.T},'Only actual physical issued C/I/T');
  assert.equal(candidate.modelBundleSha256,issued.candidateManifestSha256);
  const canonical=value=>Array.isArray(value)?value:value&&typeof value==='object'?Object.fromEntries(Object.keys(value).sort().map(key=>[key,value[key]])):value;
  assert.equal(sha(JSON.stringify(integrated.manifest,(_key,value)=>canonical(value))),issued.integratedManifestSha256);
  const prior=await readNativeOriginalContinuityPredecessorCanonicalSource();return compile(prior.canonicalSource,next);
}
export async function buildNativeOriginalContinuityBindingSuccessor(){
  assert.equal(arguments.length,0);requireNativeOriginalContinuityBinding();
  const core=await prepareNativeOriginalContinuitySuccessorStructure(),prior=await readNativeOriginalContinuityPredecessorCanonicalSource(),result=wrap(core,prior);
  const contract=nativeOriginalContinuityCheckpointContractFromBase(result.canonicalSource,
    checkpointCasContractFromCanonicalSource(result.canonicalSource,{sourcePhase:'account-statistics-assistant'}));
  return Object.freeze({...result,checkpointContractSha256:contract.sha256,
    tripBindingPolicySha256:tripBindingPolicyFromCanonicalSource(result.canonicalSource).sha256});
}
async function main(){
  assert(process.argv.length===2||(process.argv.length===3&&['--check','--write'].includes(process.argv[2])));
  const pins=requireNativeOriginalContinuityOutput(); // No render or SQL materialization while unissued.
  const result=await buildNativeOriginalContinuityBindingSuccessor();
  assert.deepEqual({migrationSha256:result.migrationSha256,canonicalSha256:result.afterCanonicalSha256,
    checkpointContractSha256:result.checkpointContractSha256,tripBindingPolicySha256:result.tripBindingPolicySha256},pins);
  const file=path.join(ROOT,'supabase/migrations',nativeOriginalContinuityMigration().filename);
  if(process.argv[2]==='--write')await fs.writeFile(file,result.migration,{flag:'wx'});
  else assert.deepEqual(await fs.readFile(file),Buffer.from(result.migration));
  console.log('Exact post585 native-original-continuity metadata source checked; no installation or state admission.');
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))await main();
