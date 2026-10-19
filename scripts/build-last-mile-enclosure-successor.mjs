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
import {LAST_MILE_ENCLOSURE_BEFORE as OLD,LAST_MILE_ENCLOSURE_VERSION,
  LAST_MILE_ENCLOSURE_ALIASES,LAST_MILE_ENCLOSURE_REPLACEMENTS,
  requireLastMileEnclosureBinding,requireLastMileEnclosureOutput,lastMileEnclosureMigration,
  readLastMileEnclosurePredecessorCanonicalSource,lastMileEnclosureDefinition as definition}
  from './lib/last-mile-enclosure-successor-source.mjs';
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
function compileLastMileEnclosureStructure(before,next){
  assert.equal(sha(before),OLD.canonicalSha256);assert.equal(next.version,LAST_MILE_ENCLOSURE_VERSION);
  for(const key of ['C','I','T'])assert.match(next[key],/^[a-f0-9]{64}$/);
  assert.equal(new Set(['C','I','T'].flatMap(k=>[OLD[k],next[k]])).size,6);
  for(const row of LAST_MILE_ENCLOSURE_ALIASES){assert(Buffer.byteLength(row.name)<=63);assert(!before.includes('function public.'+row.name+'('));}
  const stateBefore=definition(before,CP+'integrated_state_valid');
  const payloadBefore=definition(before,CP+'payload_valid');
  const state=once(stateBefore,'function public.'+CP+'integrated_state_valid(',
    'function public.'+LAST_MILE_ENCLOSURE_ALIASES[0].name+'(');
  const payload=once(once(payloadBefore,'function public.'+CP+'payload_valid(',
    'function public.'+LAST_MILE_ENCLOSURE_ALIASES[1].name+'('),
    'public.'+CP+'integrated_state_valid(','public.'+LAST_MILE_ENCLOSURE_ALIASES[0].name+'(');
  assert.equal(once(state,'function public.'+LAST_MILE_ENCLOSURE_ALIASES[0].name+'(',
    'function public.'+CP+'integrated_state_valid('),stateBefore);
  assert.equal(once(once(payload,'function public.'+LAST_MILE_ENCLOSURE_ALIASES[1].name+'(',
    'function public.'+CP+'payload_valid('),'public.'+LAST_MILE_ENCLOSURE_ALIASES[0].name+'(',
    'public.'+CP+'integrated_state_valid('),payloadBefore);
  const aliases=[{...LAST_MILE_ENCLOSURE_ALIASES[0],definition:state},{...LAST_MILE_ENCLOSURE_ALIASES[1],definition:payload}];
  const changes=[],add=(name,after)=>changes.push({name,before:definition(before,name),after});
  for(const [suffix,inventory]of [['integrated_state_valid',{I:1}],['payload_valid',{I:1,C:1,T:1}],
    ['integrated_state_reason',{I:1}],['payload_reason',{I:1,C:1,T:1}]])
    add(CP+suffix,currentMetadata(definition(before,CP+suffix),next,inventory));
  // Preserve the true old seed projection's output family transitively.
  add(CP+'native_origin_projection',once(definition(before,CP+'native_origin_projection'),
    'public.'+CP+'payload_valid(','public.'+LAST_MILE_ENCLOSURE_ALIASES[1].name+'('));
  let trip=definition(before,'ravradar_trip_v3_binding_allowed');
  for(const key of ['I','C'])trip=once(trip,"        '"+OLD[key]+"'\n      )",
    "        '"+OLD[key]+"',\n        '"+next[key]+"'\n      )");
  add('ravradar_trip_v3_binding_allowed',trip);
  const casBefore=definition(before,CP+'cas');
  const numeric="    elsif p_target_reference > v_central_reference\n"
    +"      and p_payload ->> 'continuationStateContractSha256' = '"+OLD.T+"'\n";
  const newerOnly="    elsif p_target_reference > v_central_reference\n"
    +"      and p_payload ->> 'continuationStateContractSha256' = '"+next.T+"'\n"
    +'      and public.'+LAST_MILE_ENCLOSURE_ALIASES[1].name+'(v_payload,v_central_reference)\n'
    +'    then\n'
    +'      -- Genuine newer target only; no numerical SAME_H0 or reset authority.\n'
    +'      v_central_is_compatible_predecessor := false;\n';
  const cas=once(casBefore,numeric,newerOnly+numeric);
  assert.equal(once(cas,newerOnly,''),casBefore,'Every old CAS branch and equality/version/write/refusal tail unchanged');
  add(CP+'cas',cas);
  const contractBefore=definition(before,CP+'contract');
  let contract=once(contractBefore,'  v_native_origin_projection_definition text;',
    '  v_native_origin_projection_definition text;\n  v_lme140000_state_definition text;\n  v_lme140000_payload_definition text;');
  const oidTail="    pg_catalog.to_regprocedure('public."+CP+"native_origin_projection(jsonb,timestamptz)')\n  ];";
  contract=once(contract,oidTail,oidTail.slice(0,-5)+",\n"
    +"    pg_catalog.to_regprocedure('public."+aliases[0].name+"(jsonb,text)'),\n"
    +"    pg_catalog.to_regprocedure('public."+aliases[1].name+"(jsonb,timestamptz)')\n  ];");
  // Derive ordinals from the WHOLE pinned predecessor OID declaration.
  // The old renderer has26 combined definitions, but its validator ARRAY has23.
  const oidDeclaration=/  v_validator_oids oid\[\] := array\[([\s\S]*?)\n  \];/.exec(contractBefore);
  assert(oidDeclaration,'One genuine140000 validator OID declaration');
  const oldOids=[...oidDeclaration[1].matchAll(/pg_catalog\.to_regprocedure\(\s*'([^']+)'\s*\)/g)].map(match=>match[1]);
  assert.equal(oldOids.length,23,'Exact genuine140000 validator ordinal inventory');
  assert.equal(new Set(oldOids).size,oldOids.length);
  assert.equal(oldOids.at(-1),'public.'+CP+'native_origin_projection(jsonb,timestamptz)');
  const bodies=[['v_lme140000_state_definition',oldOids.length+1],['v_lme140000_payload_definition',oldOids.length+2]]
    .map(([variable,index])=>"  select pg_catalog.btrim(p.prosrc, E' \\n\\r\\t') into "+variable+"\n"
      +'  from pg_catalog.pg_proc p where p.oid = v_validator_oids['+index+'];\n').join('\n');
  contract=once(contract,'  v_checkpoint_definition := v_canonical_time_definition',
    bodies+'\n  v_checkpoint_definition := v_canonical_time_definition');
  const tail="    || E'\\n-- established-native-current-origin-projection --\\n' || v_native_origin_projection_definition;";
  contract=once(contract,tail,tail.slice(0,-1)
    +"\n    || E'\\n-- last-mile-original140000-state-validator --\\n' || v_lme140000_state_definition"
    +"\n    || E'\\n-- last-mile-original140000-payload-validator --\\n' || v_lme140000_payload_definition;");
  contract=once(contract,"where m.version::text = '"+OLD.version+"'","where m.version::text = '"+next.version+"'");
  add(CP+'contract',contract);
  assert.deepEqual(changes.map(r=>r.name),LAST_MILE_ENCLOSURE_REPLACEMENTS);
  const insertion=aliases.map(r=>r.definition+'\nrevoke all on function public.'+r.name+r.signature+' from public, anon, authenticated;\n\n').join('');
  let canonicalSource=before;
  for(const row of changes)canonicalSource=once(canonicalSource,row.before,row.after);
  canonicalSource=once(canonicalSource,changes[0].after,insertion+changes[0].after);
  let inverse=once(canonicalSource,insertion,'');
  for(const row of [...changes].reverse())inverse=once(inverse,row.after,row.before);
  assert.equal(inverse,before,'Whole exact140000 source inverse');
  return Object.freeze({aliases,changes,canonicalSource,nextBinding:next,wholeCanonicalInverse:true,
    originalCanonicalSha256:sha(before),strictlyNewerOldModelOnly:true,sameH0NumericalAdmission:false,
    numericalSqlRulesChanged:false,installationPerformed:false});
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




function wrapLastMileEnclosureSource(core,prior){
  assert(core.wholeCanonicalInverse&&core.strictlyNewerOldModelOnly&&!core.numericalSqlRulesChanged);
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
  const ddl=commands.map((command,index)=>{const tag='$last_mile_enclosure_ddl_'+index+'$';assert(!command.includes(tag));return '  execute '+tag+'\n'+command+'\n'+tag+';';});
  const absent=core.aliases.map(r=>"  if exists(select 1 from pg_catalog.pg_proc where pronamespace='public'::regnamespace and proname='"+r.name+"') then raise exception 'LAST_MILE_ENCLOSURE_DESTINATION_EXISTS'; end if;");
  const prefix=[
    'do $last_mile_enclosure_successor$',
    'declare original_catalog jsonb; after_catalog jsonb; account_observed jsonb; function_name text;',
    'begin',
    "  if (select max(version::text) from supabase_migrations.schema_migrations) is distinct from '"+OLD.version+"' then raise exception 'LAST_MILE_ENCLOSURE_EXACT_INSTALLED140000_REQUIRED'; end if;",
    "  if exists(select 1 from supabase_migrations.schema_migrations where version::text=any(array['20261014140000','20261015030000','20261016030000'])) then raise exception 'LAST_MILE_ENCLOSURE_ARCHIVED_PHASE_MUST_BE_ABSENT'; end if;",
    "  if not exists(select 1 from supabase_migrations.schema_migrations where version::text='20261013230000') then raise exception 'LAST_MILE_ENCLOSURE_INSTALLED230_REQUIRED'; end if;",
    '  lock table public.account_activity_journal,public.account_statistics_preferences in access share mode;',
  ].join('\n');
  const migration=[
    '-- Original-preserving last-mile enclosure producer-binding successor; SOURCE ONLY.',
    '-- Old140000/original aliases and ALL numerical SQL guards remain unchanged.',
    '-- Only a genuinely newer target may transition from the old140000 checkpoint family.',
    'begin;',"set local statement_timeout = '55s';","set local lock_timeout = '5s';",prefix,
    ...absent,...oldDefinitions.map(definitionGuard),schema2Guard(prior.statisticsExpected),
    '  '+snapshot+' into original_catalog;',...ddl,
    ...names.map(name=>definitionGuard(definition(core.canonicalSource,name))),...newDefinitions.map(definitionGuard),
    schema2Guard(prior.statisticsExpected),'  '+snapshot+' into after_catalog;',
    "  if after_catalog is distinct from original_catalog then raise exception 'LAST_MILE_ENCLOSURE_ORIGINAL_PROPERTIES_OR_ACCOUNT_CHANGED'; end if;",
    'end;\n$last_mile_enclosure_successor$;',"notify pgrst, 'reload schema';",'commit;','',
  ].join('\n\n').replace(/\n+$/,'\n');
  assert.deepEqual([...migration.matchAll(/^create or replace function public\.([a-z0-9_]+)\(/gm)].map(m=>m[1]),
    [...core.aliases.map(r=>r.name),...LAST_MILE_ENCLOSURE_REPLACEMENTS]);
  return Object.freeze({...core,migration,migrationSha256:sha(migration),afterCanonicalSha256:sha(core.canonicalSource),
    transactionalWrapperPrepared:true,statisticsSchema2Source:prior.statisticsSchema2Source,
    postgresRun:false,migrationIssued:false,productionAuthority:false});
}
export async function prepareLastMileEnclosureSuccessorStructure(){
  assert.equal(arguments.length,0);const issued=requireLastMileEnclosureBinding(); // BEFORE I/O or builders.
  const candidate=await computeCandidateGRollbackBundle();
  assert.equal(await regularSource('scripts/rollback-assets/ravscore-model-bundle.generated.js'),renderCandidateGRollbackGeneratedModule(candidate));
  const integrated=await computeRavScoreModelBundle();
  assert.equal(await regularSource('js/core/ravscore-model-bundle.generated.js'),renderGeneratedBundleModule(integrated));
  const next={version:issued.version,C:candidate.modelBundleSha256,I:integrated.modelBundleSha256,T:await ravScoreContinuationImplementationSha256()};
  assert.deepEqual(next,{version:issued.version,C:issued.C,I:issued.I,T:issued.T},'Only actual physical issued C/I/T');
  assert.equal(candidate.modelBundleSha256,issued.candidateManifestSha256);
  const canonical=value=>Array.isArray(value)?value:value&&typeof value==='object'?Object.fromEntries(Object.keys(value).sort().map(k=>[k,value[k]])):value;
  assert.equal(sha(JSON.stringify(integrated.manifest,(_key,value)=>canonical(value))),issued.integratedManifestSha256);
  const prior=await readLastMileEnclosurePredecessorCanonicalSource();return compileLastMileEnclosureStructure(prior.canonicalSource,next);
}
export async function buildLastMileEnclosureBindingSuccessor(){
  assert.equal(arguments.length,0);requireLastMileEnclosureBinding();
  const core=await prepareLastMileEnclosureSuccessorStructure(),prior=await readLastMileEnclosurePredecessorCanonicalSource();
  const result=wrapLastMileEnclosureSource(core,prior);
  const contract=checkpointCasContractFromCanonicalSource(result.canonicalSource,{sourcePhase:'last-mile-enclosure'});
  return Object.freeze({...result,checkpointContractSha256:contract.sha256,
    tripBindingPolicySha256:tripBindingPolicyFromCanonicalSource(result.canonicalSource).sha256});
}
async function main(){
  assert(process.argv.length===2||(process.argv.length===3&&['--check','--write'].includes(process.argv[2])));
  const pins=requireLastMileEnclosureOutput(); // Never materialize SQL before actual output issuance.
  const result=await buildLastMileEnclosureBindingSuccessor();
  assert.deepEqual({migrationSha256:result.migrationSha256,canonicalSha256:result.afterCanonicalSha256,
    checkpointContractSha256:result.checkpointContractSha256,tripBindingPolicySha256:result.tripBindingPolicySha256},pins);
  const file=path.join(ROOT,'supabase/migrations',lastMileEnclosureMigration().filename);
  if(process.argv[2]==='--write')await fs.writeFile(file,result.migration,{flag:'wx'});
  else assert.deepEqual(await fs.readFile(file),Buffer.from(result.migration));
  console.log('Exact last-mile producer successor source verified; no installation or state admission.');
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))await main();
