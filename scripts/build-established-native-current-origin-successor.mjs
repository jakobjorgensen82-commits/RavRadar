// Fixed append-only SOURCE issuer. This never installs SQL or admits state.
// Computes NEW bindings from actual normal rendered sources; caller hashes,
// roots, SQL and provider data are not accepted by the public entry point.
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {computeCandidateGRollbackBundle,renderCandidateGRollbackGeneratedModule}
  from './build-candidate-g-rollback-bundle.mjs';
import {computeRavScoreModelBundle,renderGeneratedBundleModule}
  from './build-ravscore-model-bundle.mjs';
import {ravScoreContinuationImplementationSha256}
  from './lib/ravscore-continuation-implementation-contract.mjs';
import {CURRENT_MEMORY_WARMUP_BINDING as OLD,CURRENT_MEMORY_WARMUP_OUTPUT as PINS,
  CURRENT_MEMORY_WARMUP_BEFORE as OLD_NATIVE, CURRENT_MEMORY_WARMUP_PROJECTION,
  readCurrentMemoryWarmupCanonicalSource,currentMemoryWarmupDefinition as definition}
  from './lib/current-memory-warmup-successor-source.mjs';
import {statisticsPreferenceRevisionCatalogQuery} from './verify-account-assistant-schema.mjs';
import {requireEstablishedNativeCurrentOriginBinding,requireEstablishedNativeCurrentOriginOutput,
  establishedNativeCurrentOriginMigration} from './lib/established-native-current-origin-successor-source.mjs';
import {checkpointCasContractFromCanonicalSource,tripBindingPolicyFromCanonicalSource}
  from './integrated-cutover-readiness.mjs';

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const CP='ravradar_ravscore_checkpoint_';
const PROJECTION=CP+'native_origin_projection';
const SEED=Object.freeze({datasetId:'rr-20261016191945-210',
  referenceAt:'2026-10-16T10:00:00.000Z',
  generationSha256:'d337d7fd8d111af723e26d9252bb8f56e679cb4dd66a226612e62971f4d661bb',
  candidateStateSha256:'61297a258de3bd7131c0268d62966cb6eed8463fc886641a07b4e23d071fe503'});
const FROZEN_STATE=CP+'cmw0200_state_valid',FROZEN_PAYLOAD=CP+'cmw0200_payload_valid';
const sha=value=>crypto.createHash('sha256').update(value).digest('hex');
const count=(value,needle)=>value.split(needle).length-1;
function once(value,before,after){assert.equal(count(value,before),1,'One whole exact source edit');return value.replace(before,()=>after);}
function replaceHashes(source,map){
  for(const [a,b]of map){assert.match(a,/^[a-f0-9]{64}$/);assert.match(b,/^[a-f0-9]{64}$/);}
  return source.replace(/[a-f0-9]{64}/g,value=>map.get(value)??value);
}
function currentMetadata(source,next,expected){
  const map=new Map(['C','I','T'].map(key=>[OLD[key],next[key]]));
  for(const key of ['C','I','T'])assert.equal(count(source,OLD[key]),expected[key]??0,'Exact metadata count '+key);
  const result=replaceHashes(source,map);
  assert.equal(replaceHashes(result,new Map([...map].map(([a,b])=>[b,a]))),source,'Whole metadata inverse');
  return result;
}
async function regularSource(relative){
  const file=path.join(ROOT,relative),stat=await fs.lstat(file);
  assert(stat.isFile()&&!stat.isSymbolicLink());
  return (await fs.readFile(file,'utf8')).replace(/\r\n?/g,'\n');
}

// Internal pure compiler, not a source-authority API. A private synthetic
// structure test may expose this lexical function in its owned test host only.
function compileEstablishedNativeOriginStructure(before,next){
  assert.equal(sha(before),PINS.canonicalSha256);
  assert.match(next.version,/^\d{14}$/);assert(next.version>OLD.version);
  assert.equal(new Set(['C','I','T'].flatMap(key=>[OLD[key],next[key]])).size,6);
  for(const key of ['C','I','T'])assert.match(next[key],/^[a-f0-9]{64}$/);
  for(const name of [PROJECTION,FROZEN_STATE,FROZEN_PAYLOAD]){
    assert(Buffer.byteLength(name)<=63);assert(!before.includes('function public.'+name+'('));
  }
  const originalState=definition(before,CP+'integrated_state_valid');
  const originalPayload=definition(before,CP+'payload_valid');
  const stateAlias=once(originalState,'function public.'+CP+'integrated_state_valid(',
    'function public.'+FROZEN_STATE+'(');
  const payloadAlias=once(once(originalPayload,'function public.'+CP+'payload_valid(',
    'function public.'+FROZEN_PAYLOAD+'('),'public.'+CP+'integrated_state_valid(',
    'public.'+FROZEN_STATE+'(');
  assert.equal(once(stateAlias,'function public.'+FROZEN_STATE+'(',
    'function public.'+CP+'integrated_state_valid('),originalState);
  assert.equal(once(once(payloadAlias,'function public.'+FROZEN_PAYLOAD+'(',
    'function public.'+CP+'payload_valid('),'public.'+FROZEN_STATE+'(',
    'public.'+CP+'integrated_state_valid('),originalPayload);
  const aliases=[{name:FROZEN_STATE,signature:'(jsonb,text)',definition:stateAlias},
    {name:FROZEN_PAYLOAD,signature:'(jsonb,timestamptz)',definition:payloadAlias}];

  const changes=[];
  const add=(name,after)=>changes.push({name,before:definition(before,name),after});
  for(const [suffix,expected]of [['integrated_state_valid',{I:1}],['payload_valid',{C:1,I:1,T:1}],
    ['integrated_state_reason',{I:1}],['payload_reason',{C:1,I:1,T:1}]])
    add(CP+suffix,currentMetadata(definition(before,CP+suffix),next,expected));
  // The already-issued 0200 projection MUST keep its original output validator
  // transitively, not silently call the newly mutable current validator.
  const oldProjection=definition(before,CURRENT_MEMORY_WARMUP_PROJECTION);
  add(CURRENT_MEMORY_WARMUP_PROJECTION,once(oldProjection,'public.'+CP+'payload_valid(',
    'public.'+FROZEN_PAYLOAD+'('));

  const map=new Map(),inverse=new Map();
  for(const key of ['C','I','T']){
    const previous=key==='C'?OLD_NATIVE.candidate:key==='I'?OLD_NATIVE.integrated:OLD_NATIVE.continuation;
    map.set(previous,OLD[key]);map.set(OLD[key],next[key]);
    inverse.set(OLD[key],previous);inverse.set(next[key],OLD[key]);
  }
  let projection=replaceHashes(once(oldProjection,'function public.'+CURRENT_MEMORY_WARMUP_PROJECTION+'(',
    'function public.'+PROJECTION+'('),map);
  assert.equal(once(replaceHashes(projection,inverse),'function public.'+PROJECTION+'(',
    'function public.'+CURRENT_MEMORY_WARMUP_PROJECTION+'('),oldProjection,'Whole 673/size/exception projection inverse');
  // Additional seed selector, NOT authentication by a declared digest alone.
  // The fixed genuine B/S-origin prewrite must qualify this exact whole seed
  // before any metadata bridge; the CAS still compares the actual whole row.
  const unseededProjection=projection;
  const seedGuard="  if not public."+FROZEN_PAYLOAD+"(p_payload,p_target_reference)\n"
    +"    or p_payload ->> 'datasetId' is distinct from '"+SEED.datasetId+"'\n"
    +"    or p_payload ->> 'productionReferenceAt' is distinct from '"+SEED.referenceAt+"'\n"
    +"    or p_payload ->> 'generationSha256' is distinct from '"+SEED.generationSha256+"'\n"
    +"    or p_payload #>> '{candidateGRollbackCompanion,stateSha256}' is distinct from '"+SEED.candidateStateSha256+"'\n"
    +"  then return null; end if;\n";
  projection=once(projection,'begin\n','begin\n'+seedGuard);
  assert.equal(once(projection,seedGuard,''),unseededProjection,'Whole seed-gate inverse');
  const predecessorBefore=definition(before,CP+'predecessor_payload_valid');
  add(CP+'predecessor_payload_valid',once(predecessorBefore,'begin\n',
    `begin\n  if p_current_implementation_sha256 = '${next.T}'\n`
    +`    and p_payload #>> '{modelBinding,modelBundleSha256}' = '${OLD.I}'\n`
    +`    and public.${PROJECTION}(p_payload,p_target_reference) is not null\n`
    +'  then return true; end if;\n'));
  let trip=definition(before,'ravradar_trip_v3_binding_allowed');
  for(const key of ['I','C'])trip=once(trip,"        '"+OLD[key]+"'\n      )",
    "        '"+OLD[key]+"',\n        '"+next[key]+"'\n      )");
  add('ravradar_trip_v3_binding_allowed',trip);

  const casBefore=definition(before,CP+'cas');
  let cas=once(casBefore,'  v_cmw_predecessor_payload jsonb;',
    '  v_cmw_predecessor_payload jsonb;\n  v_causal_predecessor_payload jsonb;');
  const dispatch=`    if p_payload ->> 'continuationStateContractSha256' = '${OLD.T}'\n`;
  cas=once(cas,dispatch,`    if p_payload ->> 'continuationStateContractSha256' = '${next.T}'\n`
    +`      and v_payload #>> '{modelBinding,modelBundleSha256}' = '${OLD.I}'\n`
    +'    then\n'
    +`      v_causal_predecessor_payload := public.${PROJECTION}(v_payload,v_central_reference);\n`
    +'    end if;\n'+dispatch);
  cas=once(cas,'    if v_cmw_predecessor_payload is not null',
    '    if v_causal_predecessor_payload is not null\n      or v_cmw_predecessor_payload is not null');
  const comparison='    if v_central_is_compatible_predecessor and v_cmw_predecessor_payload is not null then';
  cas=once(cas,comparison,
    '    if v_central_is_compatible_predecessor and v_causal_predecessor_payload is not null then\n'
    +'      v_exact_predecessor_same_target_transition := v_central_reference = p_target_reference\n'
    +"        and (v_causal_predecessor_payload #- '{generationSha256}' #- '{stateSha256}'\n"
    +"          #- '{candidateGRollbackCompanion,generationSha256}')\n"
    +"        = (p_payload #- '{generationSha256}' #- '{stateSha256}'\n"
    +"          #- '{candidateGRollbackCompanion,generationSha256}');\n"
    +comparison.replace('    if ','    elsif '));
  // Keep every old numerical branch whole. Add ONLY the new implementation's
  // identical newer-time branch. No same-time numerical reanalysis is allowed.
  const numericPrefix='    elsif p_target_reference > v_central_reference\n';
  const numericStart=casBefore.indexOf(numericPrefix);
  const nextNumeric=casBefore.indexOf(numericPrefix,numericStart+numericPrefix.length);
  const nextPayload=casBefore.indexOf('    elsif public.'+CP+'payload_valid(',numericStart+numericPrefix.length);
  const numericEnd=Math.min(...[nextNumeric,nextPayload].filter(index=>index>numericStart));
  assert(numericStart>=0&&Number.isFinite(numericEnd));
  const numerical=casBefore.slice(numericStart+numericPrefix.length,numericEnd);
  assert(numerical&&count(numerical,OLD.T)===1);
  cas=once(cas,numericPrefix+numerical,
    numericPrefix+once(numerical,OLD.T,next.T)+numericPrefix+numerical);
  assert.equal(count(cas,numericPrefix),count(casBefore,numericPrefix)+1,'One new numerical branch only');
  const tail=casBefore.indexOf('    -- Equality is checked before the expected version.');
  assert(tail>=0&&cas.endsWith(casBefore.slice(tail)),'Whole CAS retry/refusal/update tail');
  add(CP+'cas',cas);

  const contractBefore=definition(before,CP+'contract');
  let contract=once(contractBefore,'  v_cmw_projection_definition text;',
    '  v_cmw_projection_definition text;\n  v_cmw0200_state_definition text;\n  v_cmw0200_payload_definition text;\n  v_native_origin_projection_definition text;');
  const oidTail="    pg_catalog.to_regprocedure('public."+CURRENT_MEMORY_WARMUP_PROJECTION+"(jsonb,timestamptz)')\n  ];";
  const extraOids=[
    "    pg_catalog.to_regprocedure('public."+FROZEN_STATE+"(jsonb,text)')",
    "    pg_catalog.to_regprocedure('public."+FROZEN_PAYLOAD+"(jsonb,timestamptz)')",
    "    pg_catalog.to_regprocedure('public."+PROJECTION+"(jsonb,timestamptz)')"];
  contract=once(contract,oidTail,oidTail.slice(0,-5)+",\n"+extraOids.join(',\n')+"\n  ];");
  const extraBodies=[
    ['v_cmw0200_state_definition',21],['v_cmw0200_payload_definition',22],
    ['v_native_origin_projection_definition',23]].map(([variable,index])=>
      "  select pg_catalog.btrim(p.prosrc, E' \\n\\r\\t') into "+variable+"\n"
      +"  from pg_catalog.pg_proc p where p.oid = v_validator_oids["+index+"];\n").join('\n');
  contract=once(contract,'  v_checkpoint_definition := v_canonical_time_definition',
    extraBodies+'\n  v_checkpoint_definition := v_canonical_time_definition');
  const bodyTail="    || E'\\n-- current-memory-warmup-predecessor-projection --\\n' || v_cmw_projection_definition;";
  const bodyAppend="\n    || E'\\n-- cmw0200-original-state-validator --\\n' || v_cmw0200_state_definition"
    +"\n    || E'\\n-- cmw0200-original-payload-validator --\\n' || v_cmw0200_payload_definition"
    +"\n    || E'\\n-- established-native-current-origin-projection --\\n' || v_native_origin_projection_definition;";
  contract=once(contract,bodyTail,bodyTail.slice(0,-1)+bodyAppend);
  contract=once(contract,"where m.version::text = '"+OLD.version+"'",
    "where m.version::text = '"+next.version+"'");
  add(CP+'contract',contract);
  const oldSlots=[...contractBefore.matchAll(/pg_catalog\.to_regprocedure\(/g)].length;
  assert.equal([...contract.matchAll(/pg_catalog\.to_regprocedure\(/g)].length,oldSlots+3);

  // Transactional migration wrapper, original catalog/ACL guards and native
  // PostgreSQL issuance are still separate required gates. SOURCE ONLY.
  let canonical=before;
  for(const row of changes)canonical=once(canonical,row.before,row.after);
  const insertions=[...aliases,{name:PROJECTION,signature:'(jsonb,timestamptz)',definition:projection}]
    .map(row=>row.definition+'\nrevoke all on function public.'+row.name+row.signature+' from public, anon, authenticated;\n\n').join('');
  canonical=once(canonical,changes[0].after,insertions+changes[0].after);
  let undone=once(canonical,insertions,'');
  for(const row of [...changes].reverse())undone=once(undone,row.after,row.before);
  assert.equal(undone,before,'Whole original canonical inverse');
  return Object.freeze({aliases,projection,changes,canonicalSource:canonical,
    originalCanonicalSha256:sha(before),nextBinding:next,wholeCanonicalInverse:true,
    contractCatalogExtended:true,migrationIssued:false,postgresRun:false,
    seedSelectorIsNotAuthentication:true,seedGuard,
    originalContractDefinition:contractBefore,
    installationPerformed:false,productionAuthority:false});
}

export async function prepareEstablishedNativeCurrentOriginSuccessorStructure(){
  assert.equal(arguments.length,0,'No caller metadata/root/source override');
  const issued=requireEstablishedNativeCurrentOriginBinding();
  const candidate=await computeCandidateGRollbackBundle();
  assert.equal(await regularSource('scripts/rollback-assets/ravscore-model-bundle.generated.js'),
    renderCandidateGRollbackGeneratedModule(candidate));
  const integrated=await computeRavScoreModelBundle();
  assert.equal(await regularSource('js/core/ravscore-model-bundle.generated.js'),renderGeneratedBundleModule(integrated));
  const next=Object.freeze({version:issued.version,C:candidate.modelBundleSha256,I:integrated.modelBundleSha256,
    T:await ravScoreContinuationImplementationSha256()});
  assert(['C','I','T'].every(key=>next[key]!==OLD[key]),'NATIVE_CURRENT_ORIGIN_BINDING_NOT_YET_RENDERED');
  assert.deepEqual(next,{version:issued.version,C:issued.C,I:issued.I,T:issued.T},'Actual issued physical C/I/T');
  assert.equal(candidate.modelBundleSha256,issued.candidateManifestSha256);
  const canonical=value=>Array.isArray(value)?value:value&&typeof value==='object'
    ?Object.fromEntries(Object.keys(value).sort().map(key=>[key,value[key]])):value;
  assert.equal(sha(JSON.stringify(integrated.manifest,(_key,value)=>canonical(value))),issued.integratedManifestSha256);
  const {canonicalSource}=await readCurrentMemoryWarmupCanonicalSource();
  return compileEstablishedNativeOriginStructure(canonicalSource,next);
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


function wrapEstablishedNativeOriginSource(core,prior){
  const next=core.nextBinding;
  assert.equal(core.originalCanonicalSha256,PINS.canonicalSha256);
  assert.equal(prior.canonicalSource&&sha(prior.canonicalSource),PINS.canonicalSha256);
  assert(core.wholeCanonicalInverse&&core.contractCatalogExtended);
  assert.equal(core.changes.length,9);
  assert.equal(prior.statisticsSchemaVersion,2);
  const before=prior.canonicalSource;
  const names=[...before.matchAll(/^create or replace function public\.((?:ravradar_ravscore_checkpoint_[a-z0-9_]+)|version_admin_document|ravradar_trip_v3_binding_allowed)\(/gm)].map(m=>m[1]);
  assert.equal(names.length,new Set(names).size);
  const oldDefinitions=names.map(name=>definition(before,name));
  const signatures=oldDefinitions.map(signature);
  const newDefinitions=[...core.aliases.map(row=>row.definition),core.projection];
  const allSignatures=[...signatures,...newDefinitions.map(signature)];
  const physical=sig=>sig.replace(/^public\.([a-z0-9_]+)\(/,(_all,name)=>'public.'+name.slice(0,63)+'(');
  assert.equal(new Set(allSignatures.map(physical)).size,allSignatures.length,'No truncated identifier collision');
  const snapshot=preservationQuery(signatures);
  const commands=newDefinitions.flatMap(source=>[
    source,'revoke all on function '+signature(source)+' from public, anon, authenticated;'
  ]).concat(core.changes.map(row=>row.after),[
    'alter function public.'+CP+"cas(bigint,timestamptz,jsonb) set statement_timeout = '55s';"
  ]);
  assert.equal(commands.filter(command=>!command.startsWith('create or replace function ')
    && !command.startsWith('revoke all on function ')
    && !command.startsWith('alter function public.'+CP+'cas(')).length,0,
    'Only fixed function DDL is executed');
  const ddl=commands.map((command,index)=>{
    const tag='$native_origin_ddl_'+index+'$';assert(!command.includes(tag));
    return '  execute '+tag+'\n'+command+'\n'+tag+';';
  });
  const afterDefinitions=names.map(name=>definition(core.canonicalSource,name));
  const absent=newDefinitions.map(source=>{
    const name=/^create or replace function public\.([a-z0-9_]+)\(/.exec(source)?.[1];assert(name);
    return "  if exists(select 1 from pg_catalog.pg_proc where pronamespace='public'::regnamespace\n"
      +"    and proname='"+name+"') then raise exception 'NATIVE_ORIGIN_DESTINATION_EXISTS'; end if;";
  });
  const prefix=[
    'do $native_origin_successor$',
    'declare original_catalog jsonb; after_catalog jsonb; account_observed jsonb; function_name text;',
    'begin',
    "  if (select max(version::text) from supabase_migrations.schema_migrations) is distinct from '"+OLD.version+"'",
    "    then raise exception 'NATIVE_ORIGIN_EXACT_INSTALLED0200_REQUIRED'; end if;",
    "  if exists(select 1 from supabase_migrations.schema_migrations",
    "    where version::text=any(array['20261014140000','20261015030000','20261016030000']))",
    "    then raise exception 'NATIVE_ORIGIN_ARCHIVED_PHASE_MUST_BE_ABSENT'; end if;",
    "  if not exists(select 1 from supabase_migrations.schema_migrations where version::text='20261013230000')",
    "    then raise exception 'NATIVE_ORIGIN_INSTALLED230_REQUIRED'; end if;",
    '  lock table public.account_activity_journal,public.account_statistics_preferences in access share mode;'
  ].join('\n');
  const migration=[
    '-- New established native-current continuation semantics after exact installed0200.',
    '-- Seed selectors alone are NOT authentication. Fixed original B/S-origin qualification is required BEFORE SQL.',
    '-- Original numerical state, published history, prior SQL and account schema remain unchanged.',
    'begin;',"set local statement_timeout = '55s';","set local lock_timeout = '5s';",
    prefix,...absent,...oldDefinitions.map(definitionGuard),schema2Guard(prior.statisticsExpected),
    '  '+snapshot+' into original_catalog;',...ddl,
    ...afterDefinitions.map(definitionGuard),...newDefinitions.map(definitionGuard),
    schema2Guard(prior.statisticsExpected),'  '+snapshot+' into after_catalog;',
    "  if after_catalog is distinct from original_catalog\n"
      +"    then raise exception 'NATIVE_ORIGIN_ORIGINAL_PROPERTIES_OR_ACCOUNT_CHANGED'; end if;\n"
      +'end;\n$native_origin_successor$;',
    "notify pgrst, 'reload schema';",'commit;',''].join('\n\n').replace(/\n+$/,'\n');
  assert.deepEqual([...migration.matchAll(/^create or replace function public\.([a-z0-9_]+)\(/gm)].map(m=>m[1]),
    [...newDefinitions.map(source=>/^create or replace function public\.([a-z0-9_]+)\(/.exec(source)[1]),
      ...core.changes.map(row=>row.name)]);
  return Object.freeze({...core,migration,migrationSha256:sha(migration),
    afterCanonicalSha256:sha(core.canonicalSource),statisticsSchema2Source:prior.statisticsSchema2Source,
    schema2InitializerSha256:sha(prior.statisticsSchema2Source),
    transactionalWrapperPrepared:true,migrationIssued:false,postgresRun:false,
    installationPerformed:false,productionAuthority:false});
}
export async function buildEstablishedNativeCurrentOriginBindingSuccessor(){
  assert.equal(arguments.length,0,'No caller root, source, tuple or schema override');
  const core=await prepareEstablishedNativeCurrentOriginSuccessorStructure();
  const prior=await readCurrentMemoryWarmupCanonicalSource();
  const result=wrapEstablishedNativeOriginSource(core,prior);
  return Object.freeze({...result,
    checkpointContractSha256:checkpointCasContractFromCanonicalSource(result.canonicalSource).sha256,
    tripBindingPolicySha256:tripBindingPolicyFromCanonicalSource(result.canonicalSource).sha256});
}

async function main(){
  assert.equal(process.argv.length,3);assert(['--describe','--check','--write'].includes(process.argv[2]));
  const result=await buildEstablishedNativeCurrentOriginBindingSuccessor(),migration=establishedNativeCurrentOriginMigration();
  const observed={migrationSha256:result.migrationSha256,canonicalSha256:result.afterCanonicalSha256,
    checkpointContractSha256:result.checkpointContractSha256,tripBindingPolicySha256:result.tripBindingPolicySha256};
  if(process.argv[2]==='--describe'){
    console.log(JSON.stringify({kind:'EXACT_ESTABLISHED_ORIGIN_SOURCE_METADATA',version:migration.version,...observed,
      migrationBytes:Buffer.byteLength(result.migration),wholeCanonicalInverse:true,productionAuthority:false}));return;
  }
  assert.deepEqual(observed,requireEstablishedNativeCurrentOriginOutput(),'Exact issued source outputs');
  const file=path.join(ROOT,'supabase/migrations',migration.filename);
  if(process.argv[2]==='--write')await fs.writeFile(file,result.migration,{flag:'wx',mode:0o600});
  assert.deepEqual(await fs.readFile(file),Buffer.from(result.migration),'Whole exact append-only SQL');
  console.log('Exact append-only established native-current origin SOURCE verified; no installation performed.');
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))
  main().catch(()=>{console.error('ESTABLISHED_NATIVE_CURRENT_ORIGIN_SOURCE_FAILED');process.exitCode=1;});
